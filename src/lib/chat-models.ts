export type ChatModelOption = {
  id: string;
  label: string;
  description: string;
  details: string;
  ollamaModel?: string;
  provider: 'ollama';
};

export const CHAT_MODEL_OPTIONS: ChatModelOption[] = [
  // --- LOCAL MODELS (Requires Ollama installation) ---
  {
    id: 'mistral',
    label: 'Mistral',
    description: 'Local (Ollama)',
    details: 'Requires "mistral" model installed on your MacBook. Thinking takes time.',
    ollamaModel: 'mistral:latest',
    provider: 'ollama',
  },
  {
    id: 'llama3.2',
    label: 'Llama 3.2',
    description: 'Local (Ollama)',
    details: 'Requires "llama3.2" installed locally. Slow thinker.',
    ollamaModel: 'llama3.2:latest',
    provider: 'ollama',
  },
  {
    id: 'deepseek',
    label: 'DeepSeek R1',
    description: 'Local (Ollama)',
    details: 'Best for complex logic. Requires local install.',
    ollamaModel: 'deepseek-r1:8b',
    provider: 'ollama',
  },
  {
    id: 'qwen-coder',
    label: 'Qwen Coder',
    description: 'Local (Ollama)',
    details: 'Programming assistant. Requires local install.',
    ollamaModel: 'qwen2.5-coder:7b',
    provider: 'ollama',
  },
  {
    id: 'gemma',
    label: 'Gemma 3',
    description: 'Local (Ollama)',
    details: 'Google Open Model. Requires local install.',
    ollamaModel: 'gemma3:latest',
    provider: 'ollama',
  },
];

export const DEFAULT_CHAT_MODEL = CHAT_MODEL_OPTIONS[0];

export function getChatModelOption(modelId?: string | null): ChatModelOption {
  return CHAT_MODEL_OPTIONS.find((model) => model.id === modelId) ?? DEFAULT_CHAT_MODEL;
}
