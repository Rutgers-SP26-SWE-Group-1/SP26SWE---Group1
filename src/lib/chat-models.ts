export type ChatModelOption = {
  id: string;
  label: string;
  description: string;
  ollamaModel: string;
};

export const CHAT_MODEL_OPTIONS: ChatModelOption[] = [
  {
    id: 'mistral',
    label: 'Mistral',
    description: 'Fast',
    ollamaModel: 'mistral:latest',
  },
  {
    id: 'llama3.1',
    label: 'Llama3.1',
    description: 'Balanced',
    ollamaModel: 'llama3.1:8b',
  },
  {
    id: 'deepseek',
    label: 'DeepSeek',
    description: 'Thinker',
    ollamaModel: 'deepseek-r1:8b',
  },
  {
    id: 'qwen-coder',
    label: 'Qwen Coder',
    description: 'Programmer',
    ollamaModel: 'qwen2.5-coder:7b',
  },
  {
    id: 'gemma',
    label: 'Gemma',
    description: 'Vision',
    ollamaModel: 'gemma3:latest',
  },
];

export const DEFAULT_CHAT_MODEL = CHAT_MODEL_OPTIONS[0];

export function getChatModelOption(modelId?: string | null): ChatModelOption {
  return CHAT_MODEL_OPTIONS.find((model) => model.id === modelId) ?? DEFAULT_CHAT_MODEL;
}
