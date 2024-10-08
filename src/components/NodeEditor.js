import React, { useState, useCallback } from 'react';
import ReactFlow, { addEdge, Background, Controls, MiniMap } from 'react-flow-renderer';

const initialElements = [
  {
    id: '1',
    type: 'input',
    data: { label: '选择输入文件夹' },
    position: { x: 250, y: 25 },
  },
  {
    id: '2',
    data: { label: '设置分类规则' },
    position: { x: 100, y: 125 },
  },
  {
    id: '3',
    type: 'output',
    data: { label: '选择输出文件夹' },
    position: { x: 250, y: 250 },
  },
];

function NodeEditor({ onInputFolderSelect, onOutputFolderSelect, onRuleChange }) {
  const [elements, setElements] = useState(initialElements);

  const onConnect = useCallback((params) => setElements((els) => addEdge(params, els)), []);

  const onElementClick = (event, element) => {
    if (element.id === '1') {
      onInputFolderSelect();
    } else if (element.id === '3') {
      onOutputFolderSelect();
    } else if (element.id === '2') {
      // 这里可以打开一个模态框来设置分类规则
      onRuleChange();
    }
  };

  return (
    <div style={{ height: 600 }}>
      <ReactFlow 
        elements={elements} 
        onConnect={onConnect}
        onElementClick={onElementClick}
      >
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>
    </div>
  );
}

export default NodeEditor;