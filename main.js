const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs').promises;

let store;

(async () => {
  const { default: Store } = await import('electron-store');
  store = new Store();
})();

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  mainWindow.loadFile('index.html');
  
  mainWindow.webContents.openDevTools();
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });
  return result;
});

ipcMain.handle('read-folder', async (event, folderPath) => {
  try {
    const files = await fs.readdir(folderPath);
    return files;
  } catch (error) {
    console.error('读取文件夹时出错：', error);
    throw error;
  }
});

ipcMain.handle('preview-classification', async (event, inputFolder, rules) => {
  try {
    const files = await fs.readdir(inputFolder);
    const results = [];
    for (const file of files) {
      const filePath = path.join(inputFolder, file);
      const stats = await fs.stat(filePath);
      for (const rule of rules) {
        if (matchesRule(file, stats, rule)) {
          results.push({ file, destination: rule.destination });
          break;
        }
      }
    }
    return results;
  } catch (error) {
    console.error('预览分类结果时出错：', error);
    throw error;
  }
});

ipcMain.handle('execute-organization', async (event, inputFolder, outputFolder, rules) => {
  try {
    const files = await fs.readdir(inputFolder);
    for (const file of files) {
      const filePath = path.join(inputFolder, file);
      const stats = await fs.stat(filePath);
      for (const rule of rules) {
        if (matchesRule(file, stats, rule)) {
          const destinationPath = path.join(outputFolder, rule.destination);
          await fs.mkdir(destinationPath, { recursive: true });
          await fs.rename(filePath, path.join(destinationPath, file));
          break;
        }
      }
    }
  } catch (error) {
    console.error('执行文件整理时出错：', error);
    throw error;
  }
});

ipcMain.handle('get-output-folder-history', () => {
  return store ? store.get('outputFolderHistory', []) : [];
});

ipcMain.handle('add-output-folder', (event, folder) => {
  if (!store) return [];
  let history = store.get('outputFolderHistory', []);
  if (!history.includes(folder)) {
    history.unshift(folder);
    history = history.slice(0, 5); // 只保留最近的5个文件夹
    store.set('outputFolderHistory', history);
  }
  return history;
});

function matchesRule(file, stats, rule) {
  switch (rule.type) {
    case 'extension':
      return path.extname(file).toLowerCase() === rule.condition.toLowerCase();
    case 'size':
      const [operator, size] = rule.condition.split(' ');
      const fileSize = stats.size / 1024 / 1024; // 转换为 MB
      return eval(`${fileSize} ${operator} ${parseFloat(size)}`);
    case 'date':
      const [dateOperator, days] = rule.condition.split(' ');
      const fileDate = stats.birthtime;
      const comparisonDate = new Date();
      comparisonDate.setDate(comparisonDate.getDate() - parseInt(days));
      return eval(`fileDate ${dateOperator === '<' ? '>' : '<'} comparisonDate`);
    default:
      return false;
  }
}