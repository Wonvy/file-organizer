import React from 'react';

function FilePreview({ files }) {
  return (
    <div className="file-preview">
      <h2>文件预览</h2>
      <ul>
        {files.map((file, index) => (
          <li key={index}>
            <span>{file.name}</span>
            <span>{file.currentPath}</span>
            <span>{file.newPath}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default FilePreview;