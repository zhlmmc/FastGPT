import { describe, expect, it, vi } from 'vitest';
import {
  checkChatSupportSelectFileByChatModels,
  checkChatSupportSelectFileByModules,
  getAppQuestionGuidesByModules,
  getAppQuestionGuidesByUserGuideModule
} from '@/web/core/chat/utils';
import { FlowNodeTypeEnum } from '@fastgpt/global/core/workflow/node/constant';
import { StoreNodeItemType } from '@fastgpt/global/core/workflow/type/node';
import { NodeInputKeyEnum } from '@fastgpt/global/core/workflow/constants';

vi.mock('@/web/common/system/utils', () => ({
  getWebLLMModel: vi.fn((model: string) => {
    if (model === 'vision-model') {
      return { vision: true };
    }
    if (model === 'text-model') {
      return { vision: false };
    }
    return null;
  })
}));

describe('checkChatSupportSelectFileByChatModels', () => {
  it('should return true if any model supports vision', () => {
    expect(checkChatSupportSelectFileByChatModels(['vision-model', 'text-model'])).toBe(true);
  });

  it('should return false if no model supports vision', () => {
    expect(checkChatSupportSelectFileByChatModels(['text-model'])).toBe(false);
  });

  it('should return false for empty models array', () => {
    expect(checkChatSupportSelectFileByChatModels([])).toBe(false);
  });

  it('should return false for undefined models', () => {
    expect(checkChatSupportSelectFileByChatModels()).toBe(false);
  });

  it('should return false for invalid model', () => {
    expect(checkChatSupportSelectFileByChatModels(['invalid-model'])).toBe(false);
  });
});

describe('checkChatSupportSelectFileByModules', () => {
  const createModule = (type: FlowNodeTypeEnum, model: string): StoreNodeItemType =>
    ({
      flowNodeType: type,
      inputs: [{ key: 'model', value: model }]
    }) as StoreNodeItemType;

  it('should return true if chat module has vision model', () => {
    const modules = [
      createModule(FlowNodeTypeEnum.chatNode, 'vision-model'),
      createModule(FlowNodeTypeEnum.tools, 'text-model')
    ];
    expect(checkChatSupportSelectFileByModules(modules)).toBe(true);
  });

  it('should return false if no chat module has vision model', () => {
    const modules = [
      createModule(FlowNodeTypeEnum.chatNode, 'text-model'),
      createModule(FlowNodeTypeEnum.tools, 'text-model')
    ];
    expect(checkChatSupportSelectFileByModules(modules)).toBe(false);
  });

  it('should return false for empty modules array', () => {
    expect(checkChatSupportSelectFileByModules([])).toBe(false);
  });

  it('should return false for undefined modules', () => {
    expect(checkChatSupportSelectFileByModules()).toBe(false);
  });

  it('should ignore non-chat/tools modules', () => {
    const modules = [
      createModule(FlowNodeTypeEnum.systemConfig, 'vision-model'),
      createModule(FlowNodeTypeEnum.tools, 'text-model')
    ];
    expect(checkChatSupportSelectFileByModules(modules)).toBe(false);
  });
});

describe('getAppQuestionGuidesByModules', () => {
  it('should return empty array if no system module found', () => {
    const modules: StoreNodeItemType[] = [];
    expect(getAppQuestionGuidesByModules(modules)).toEqual([]);
  });

  it('should return guide text list if chatInputGuide is open', () => {
    const modules: StoreNodeItemType[] = [
      {
        flowNodeType: FlowNodeTypeEnum.systemConfig,
        inputs: [
          {
            key: NodeInputKeyEnum.chatInputGuide,
            value: {
              open: true,
              textList: ['guide1', 'guide2']
            }
          }
        ]
      }
    ] as StoreNodeItemType[];

    expect(getAppQuestionGuidesByModules(modules)).toEqual(['guide1', 'guide2']);
  });

  it('should return empty array if chatInputGuide is not open', () => {
    const modules: StoreNodeItemType[] = [
      {
        flowNodeType: FlowNodeTypeEnum.systemConfig,
        inputs: [
          {
            key: NodeInputKeyEnum.chatInputGuide,
            value: {
              open: false,
              textList: ['guide1', 'guide2']
            }
          }
        ]
      }
    ] as StoreNodeItemType[];

    expect(getAppQuestionGuidesByModules(modules)).toEqual([]);
  });
});

describe('getAppQuestionGuidesByUserGuideModule', () => {
  it('should return guide text if chatInputGuide is open', () => {
    const module: StoreNodeItemType = {
      inputs: [
        {
          key: NodeInputKeyEnum.chatInputGuide,
          value: {
            open: true
          }
        }
      ]
    } as StoreNodeItemType;

    expect(getAppQuestionGuidesByUserGuideModule(module, ['guide1', 'guide2'])).toEqual([
      'guide1',
      'guide2'
    ]);
  });

  it('should return empty array if chatInputGuide is not open', () => {
    const module: StoreNodeItemType = {
      inputs: [
        {
          key: NodeInputKeyEnum.chatInputGuide,
          value: {
            open: false
          }
        }
      ]
    } as StoreNodeItemType;

    expect(getAppQuestionGuidesByUserGuideModule(module, ['guide1', 'guide2'])).toEqual([]);
  });

  it('should return empty array for undefined module', () => {
    expect(getAppQuestionGuidesByUserGuideModule(undefined, ['guide1', 'guide2'])).toEqual([]);
  });
});
