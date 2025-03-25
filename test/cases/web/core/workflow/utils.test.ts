import { vi, describe, it, expect } from 'vitest';
import {
  nodeTemplate2FlowNode,
  storeNode2FlowNode,
  storeEdgesRenderEdge,
  computedNodeInputReference,
  getRefData,
  filterWorkflowNodeOutputsByType,
  checkWorkflowNodeAndConnection,
  getLatestNodeTemplate
} from '@/web/core/workflow/utils';
import {
  FlowNodeTypeEnum,
  FlowNodeInputTypeEnum,
  FlowNodeOutputTypeEnum
} from '@fastgpt/global/core/workflow/node/constant';
import { WorkflowIOValueTypeEnum } from '@fastgpt/global/core/workflow/constants';
import { VARIABLE_NODE_ID, NodeInputKeyEnum } from '@fastgpt/global/core/workflow/constants';
import { EmptyNode } from '@fastgpt/global/core/workflow/template/system/emptyNode';

describe('nodeTemplate2FlowNode', () => {
  it('should convert template to flow node', () => {
    const template = {
      name: 'Test Node',
      flowNodeType: FlowNodeTypeEnum.userInput,
      inputs: [],
      outputs: []
    };

    const position = { x: 100, y: 100 };
    const t = (str: string) => str;

    const result = nodeTemplate2FlowNode({
      template,
      position,
      t
    });

    expect(result.type).toBe(FlowNodeTypeEnum.userInput);
    expect(result.position).toEqual(position);
    expect(result.data.name).toBe('Test Node');
    expect(result.data.nodeId).toBeDefined();
  });
});

describe('storeNode2FlowNode', () => {
  it('should convert store node to flow node', () => {
    const storeNode = {
      nodeId: 'test-id',
      flowNodeType: FlowNodeTypeEnum.userInput,
      position: { x: 0, y: 0 },
      inputs: [],
      outputs: [],
      version: '1.0'
    };

    const t = (str: string) => str;

    const result = storeNode2FlowNode({
      item: storeNode,
      t
    });

    expect(result.id).toBe('test-id');
    expect(result.type).toBe(FlowNodeTypeEnum.userInput);
    expect(result.data.inputs).toBeDefined();
    expect(result.data.outputs).toBeDefined();
  });

  it('should handle dynamic inputs', () => {
    const storeNode = {
      nodeId: 'test-id',
      flowNodeType: FlowNodeTypeEnum.userInput,
      position: { x: 0, y: 0 },
      inputs: [
        {
          key: 'dynamicInput',
          renderTypeList: [FlowNodeInputTypeEnum.addInputParam]
        }
      ],
      outputs: [],
      version: '1.0'
    };

    const t = (str: string) => str;

    const result = storeNode2FlowNode({
      item: storeNode,
      t
    });

    expect(result.data.inputs[0].key).toBe('dynamicInput');
    expect(result.data.inputs[0].renderTypeList).toContain(FlowNodeInputTypeEnum.addInputParam);
  });
});

describe('filterWorkflowNodeOutputsByType', () => {
  const outputs = [
    { id: '1', valueType: WorkflowIOValueTypeEnum.string },
    { id: '2', valueType: WorkflowIOValueTypeEnum.number },
    { id: '3', valueType: WorkflowIOValueTypeEnum.boolean },
    { id: '4', valueType: WorkflowIOValueTypeEnum.arrayString }
  ];

  it('should filter string outputs', () => {
    const filtered = filterWorkflowNodeOutputsByType(outputs, WorkflowIOValueTypeEnum.string);
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe('1');
  });

  it('should filter array string outputs', () => {
    const filtered = filterWorkflowNodeOutputsByType(outputs, WorkflowIOValueTypeEnum.arrayString);
    expect(filtered).toHaveLength(2);
    expect(filtered.map((f) => f.id)).toContain('1');
    expect(filtered.map((f) => f.id)).toContain('4');
  });

  it('should return all outputs for any type', () => {
    const filtered = filterWorkflowNodeOutputsByType(outputs, WorkflowIOValueTypeEnum.any);
    expect(filtered).toHaveLength(4);
  });
});

describe('getRefData', () => {
  it('should return default values when no variable provided', () => {
    const result = getRefData({
      nodeList: [],
      chatConfig: { variables: [] }
    });

    expect(result).toEqual({
      valueType: WorkflowIOValueTypeEnum.any,
      required: false
    });
  });

  it('should get ref data from node output', () => {
    const nodeList = [
      {
        nodeId: 'test-node',
        outputs: [
          {
            id: 'output-1',
            valueType: WorkflowIOValueTypeEnum.string,
            required: true
          }
        ]
      }
    ];

    const result = getRefData({
      variable: ['test-node', 'output-1'],
      nodeList,
      chatConfig: { variables: [] }
    });

    expect(result).toEqual({
      valueType: WorkflowIOValueTypeEnum.string,
      required: true
    });
  });

  it('should handle global variables', () => {
    const result = getRefData({
      variable: [VARIABLE_NODE_ID, 'globalVar'],
      nodeList: [],
      chatConfig: {
        variables: [
          {
            key: 'globalVar',
            valueType: WorkflowIOValueTypeEnum.string,
            required: true
          }
        ]
      }
    });

    expect(result).toEqual({
      valueType: WorkflowIOValueTypeEnum.string,
      required: true
    });
  });
});

describe('getLatestNodeTemplate', () => {
  it('should update node to latest template version', () => {
    const node = {
      nodeId: 'test',
      flowNodeType: FlowNodeTypeEnum.userInput,
      inputs: [{ key: 'input1', value: 'test' }],
      outputs: [{ key: 'output1', value: 'test' }],
      name: 'Old Name',
      intro: 'Old Intro'
    };

    const template = {
      ...EmptyNode,
      inputs: [{ key: 'input1' }, { key: 'input2' }],
      outputs: [{ key: 'output1' }, { key: 'output2' }]
    };

    const result = getLatestNodeTemplate(node, template);

    expect(result.inputs).toHaveLength(2);
    expect(result.outputs).toHaveLength(2);
    expect(result.name).toBe('Old Name');
    expect(result.intro).toBe('Old Intro');
  });
});

describe('checkWorkflowNodeAndConnection', () => {
  it('should validate nodes and connections', () => {
    const nodes = [
      {
        id: 'node1',
        data: {
          nodeId: 'node1',
          flowNodeType: FlowNodeTypeEnum.userInput,
          inputs: [
            {
              key: NodeInputKeyEnum.userInputForms,
              value: ['form1'],
              required: true,
              renderTypeList: [FlowNodeInputTypeEnum.custom],
              selectedTypeIndex: 0
            }
          ],
          outputs: []
        }
      }
    ];

    const edges = [
      {
        source: 'node1',
        target: 'node2'
      }
    ];

    const result = checkWorkflowNodeAndConnection({ nodes, edges });
    expect(result).toBeUndefined();
  });

  it('should detect invalid nodes', () => {
    const nodes = [
      {
        id: 'node1',
        data: {
          nodeId: 'node1',
          flowNodeType: FlowNodeTypeEnum.userInput,
          inputs: [
            {
              key: NodeInputKeyEnum.userInputForms,
              value: [], // Empty forms - invalid
              required: true,
              renderTypeList: [FlowNodeInputTypeEnum.custom],
              selectedTypeIndex: 0
            }
          ],
          outputs: []
        }
      }
    ];

    const edges = [
      {
        source: 'node1',
        target: 'node2'
      }
    ];

    const result = checkWorkflowNodeAndConnection({ nodes, edges });
    expect(result).toEqual(['node1']);
  });
});
