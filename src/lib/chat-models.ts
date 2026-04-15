export type ChatModelOption = {
  id: string;
  label: string;
  description: string;
  details: string;
  ollamaModel?: string;
  provider: 'ollama';
};

export const CHAT_MODEL_OPTIONS: ChatModelOption[] = [
  {
    id: 'mistral',
    label: 'Mistral',
    description: 'General / Fast',
    details: 'Fast local-purpose model for quick responses and everyday prompts.',
    ollamaModel: 'mistral:latest',
    provider: 'ollama',
  },
  {
    id: 'llama3.1',
    label: 'Llama 3.1',
    description: 'Explanations',
    details: 'Strong at clear explanations and step-by-step breakdowns.',
    ollamaModel: 'llama3.1:8b',
    provider: 'ollama',
  },
  {
    id: 'deepseek',
    label: 'DeepSeek R1',
    description: 'Reasoning',
    details: 'Best fit for deeper reasoning and complex logic questions.',
    ollamaModel: 'deepseek-r1:8b',
    provider: 'ollama',
  },
  {
    id: 'qwen-coder',
    label: 'Qwen Coder',
    description: 'Coding',
    details: 'Specialized for programming help, debugging, and code generation.',
    ollamaModel: 'qwen2.5-coder:7b',
    provider: 'ollama',
  },
  {
    id: 'gemma',
    label: 'Gemma 3',
    description: 'Balanced',
    details: 'Balanced local model for a mix of speed, quality, and versatility.',
    ollamaModel: 'gemma3:latest',
    provider: 'ollama',
  },
];

export const DEFAULT_CHAT_MODEL = CHAT_MODEL_OPTIONS[0];

export function getChatModelOption(modelId?: string | null): ChatModelOption {
  return CHAT_MODEL_OPTIONS.find((model) => model.id === modelId) ?? DEFAULT_CHAT_MODEL;
}
