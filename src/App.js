import React, { useState, useCallback, useEffect } from 'react';
import ReactFlow, { addEdge, Background, Controls, MiniMap } from 'react-flow-renderer';
import { Layout, Menu, Button, message, Modal, Form, Select, Input } from 'antd';
import { FolderOutlined, FileOutlined } from '@ant-design/icons';
import styled from 'styled-components';
const { ipcRenderer } = window.require('electron');

const { Header, Sider, Content } = Layout;
const { Option } = Select;

const StyledContent = styled(Content)`
  padding: 24px;
  min-height: 280px;
`;

const initialNodes = [
  {
    id: '1',
    type: 'input',
    data: { label: '输入文件夹' },
    position: { x: 250, y: 25 },
  },
  {
    id: '2',
    data: { label: '创建时间' },
    position: { x: 100, y: 125 },
  },
  {
    id: '3',
    data: { label: '文件类型' },
    position: { x: 250, y: 125 },
  },
  {
    id: '4',
    data: { label: '文件大小' },
    position: { x: 400, y: 125 },
  },
  {
    id: '5',
    type: 'output',
    data: { label: '输出文件夹' },
    position: { x: 250, y: 250 },
  },
];

const initialEdges = [
  { id: 'e1-2', source: '1', target: '2' },
  { id: 'e1-3', source: '1', target: '3' },
  { id: 'e1-4', source: '1', target: '4' },
  { id: 'e2-5', source: '2', target: '5' },
  { id: 'e3-5', source: '3', target: '5' },
  { id: 'e4-5', source: '4', target: '5' },
];

function App() {
  const [nodes, setNodes] = useState(initialNodes);
  const [edges, setEdges] = useState(initialEdges);
  const [inputFolder, setInputFolder] = useState('');
  const [outputFolder, setOutputFolder] = useState('');
  const [files, setFiles] = useState([]);
  const [rules, setRules] = useState([]);
  const [isRuleModalVisible, setIsRuleModalVisible] = useState(false);
  const [previewResults, setPreviewResults] = useState([]);
  const [ruleType, setRuleType] = useState('extension');
  const [outputFolderHistory, setOutputFolderHistory] = useState([]);

  const onConnect = useCallback((params) => setEdges((eds) => addEdge(params, eds)), []);

  const onNodeDragStop = useCallback(
    (event, node) => {
      const updatedNodes = nodes.map((n) => {
        if (n.id === node.id) {
          return { ...n, position: node.position };
        }
        return n;
      });
      setNodes(updatedNodes);
    },
    [nodes]
  );

  const handleSelectInputFolder = async () => {
    try {
      const result = await ipcRenderer.invoke('select-folder');
      if (result.canceled) return;
      setInputFolder(result.filePaths[0]);
      const fileList = await ipcRenderer.invoke('read-folder', result.filePaths[0]);
      setFiles(fileList);
    } catch (error) {
      message.error('选择输入文件夹时出错：' + error.message);
    }
  };

  const handleSelectOutputFolder = async () => {
    try {
      const result = await ipcRenderer.invoke('select-folder');
      if (result.canceled) return;
      setOutputFolder(result.filePaths[0]);
      // 更新输出文件夹历史记录
      const updatedHistory = await ipcRenderer.invoke('add-output-folder', result.filePaths[0]);
      setOutputFolderHistory(updatedHistory);
    } catch (error) {
      message.error('选择输出文件夹时出错：' + error.message);
    }
  };

  const handleAddRule = (values) => {
    const newRule = { ...values };
    setRules([...rules, newRule]);
    setIsRuleModalVisible(false);

    // 更新节点
    const newNodes = [...nodes];
    const ruleNode = {
      id: `rule-${rules.length}`,
      data: { label: `${newRule.type}: ${newRule.condition}` },
      position: { x: 250, y: 125 + rules.length * 50 },
    };
    newNodes.push(ruleNode);
    setNodes(newNodes);

    // 添加边
    const newEdge = { id: `e1-${ruleNode.id}`, source: '1', target: ruleNode.id };
    const outputEdge = { id: `e${ruleNode.id}-5`, source: ruleNode.id, target: '5' };
    setEdges([...edges, newEdge, outputEdge]);
  };

  const handleRuleTypeChange = (value) => {
    setRuleType(value);
  };

  const getConditionOptions = () => {
    switch (ruleType) {
      case 'extension':
        return ['.txt', '.pdf', '.doc', '.jpg', '.png'].map(ext => (
          <Option key={ext} value={ext}>{ext}</Option>
        ));
      case 'size':
        return ['< 1', '< 10', '< 100', '> 1', '> 10', '> 100'].map(size => (
          <Option key={size} value={size}>{size} MB</Option>
        ));
      case 'date':
        return ['< 7', '< 30', '< 90', '> 7', '> 30', '> 90'].map(days => (
          <Option key={days} value={days}>{days} 天前</Option>
        ));
      default:
        return [];
    }
  };

  const getDestinationOptions = () => {
    return ['文档', '图片', '音乐', '视频', '压缩文件', '其他'].map(folder => (
      <Option key={folder} value={folder}>{folder}</Option>
    ));
  };

  const handlePreviewClassification = async () => {
    try {
      const results = await ipcRenderer.invoke('preview-classification', inputFolder, rules);
      setPreviewResults(results);
    } catch (error) {
      message.error('预览分类结果时出错：' + error.message);
    }
  };

  const handleExecuteOrganization = async () => {
    try {
      await ipcRenderer.invoke('execute-organization', inputFolder, outputFolder, rules);
      message.success('文件整理完成');
    } catch (error) {
      message.error('执行文件整理时出错：' + error.message);
    }
  };

  useEffect(() => {
    // 从主进程获取输出文件夹历史记录
    ipcRenderer.invoke('get-output-folder-history').then(setOutputFolderHistory);
  }, []);

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider width={200} className="site-layout-background">
        <Menu
          mode="inline"
          defaultSelectedKeys={['1']}
          defaultOpenKeys={['sub1']}
          style={{ height: '100%', borderRight: 0 }}
        >
          <Menu.Item key="1" icon={<FolderOutlined />}>
            文件夹
          </Menu.Item>
          <Menu.Item key="2" icon={<FileOutlined />}>
            文件
          </Menu.Item>
        </Menu>
      </Sider>
      <Layout>
        <Header className="header">
          <div className="logo" />
          <Menu theme="dark" mode="horizontal" defaultSelectedKeys={['2']}>
            <Menu.Item key="1">文件整理</Menu.Item>
            <Menu.Item key="2">节点编辑器</Menu.Item>
          </Menu>
        </Header>
        <StyledContent>
          <Button onClick={handleSelectInputFolder}>选择输入文件夹</Button>
          <Button onClick={handleSelectOutputFolder}>选择输出文件夹</Button>
          <Button onClick={() => setIsRuleModalVisible(true)}>添加分类规则</Button>
          <Button onClick={handlePreviewClassification}>预览分类结果</Button>
          <Button onClick={handleExecuteOrganization}>执行文件整理</Button>
          
          {inputFolder && <p>输入文件夹：{inputFolder}</p>}
          {outputFolder && <p>输出文件夹：{outputFolder}</p>}
          
          {rules.length > 0 && (
            <div>
              <h3>分类规则：</h3>
              <ul>
                {rules.map((rule, index) => (
                  <li key={index}>{`${rule.type} - ${rule.condition}`}</li>
                ))}
              </ul>
            </div>
          )}
          
          {previewResults.length > 0 && (
            <div>
              <h3>预览结果：</h3>
              <ul>
                {previewResults.map((result, index) => (
                  <li key={index}>{`${result.file} -> ${result.destination}`}</li>
                ))}
              </ul>
            </div>
          )}
          
          <div style={{ height: 'calc(100vh - 64px)' }}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onConnect={onConnect}
              onNodeDragStop={onNodeDragStop}
              fitView
            >
              <Controls />
              <MiniMap />
              <Background color="#aaa" gap={16} />
            </ReactFlow>
          </div>
        </StyledContent>
      </Layout>
      
      <Modal
        title="添加分类规则"
        visible={isRuleModalVisible}
        onCancel={() => setIsRuleModalVisible(false)}
        footer={null}
      >
        <Form onFinish={handleAddRule}>
          <Form.Item name="type" label="规则类型" rules={[{ required: true }]}>
            <Select onChange={handleRuleTypeChange}>
              <Option value="extension">文件扩展名</Option>
              <Option value="size">文件大小</Option>
              <Option value="date">创建日期</Option>
            </Select>
          </Form.Item>
          <Form.Item name="condition" label="条件" rules={[{ required: true }]}>
            <Select>
              {getConditionOptions()}
            </Select>
          </Form.Item>
          <Form.Item name="destination" label="目标文件夹" rules={[{ required: true }]}>
            <Select
              dropdownRender={menu => (
                <>
                  {menu}
                  <Button style={{ width: '100%' }} onClick={handleSelectOutputFolder}>
                    选择新文件夹
                  </Button>
                </>
              )}
            >
              {outputFolderHistory.map(folder => (
                <Option key={folder} value={folder}>{folder}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit">
              添加规则
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
  );
}

export default App;