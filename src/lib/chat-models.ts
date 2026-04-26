export type ChatModelOption = {
  id: string;
  label: string;
  description: string;
  details: string;
  ollamaModel?: string;
  provider: 'google' | 'groq' | 'ollama';
};

export const CHAT_MODEL_OPTIONS: ChatModelOption[] = [
  // --- CLOUD MODELS (Lightning Fast) ---
  {
    id: 'gemini-2.5-flash',
    label: 'Gemini 2.5 Flash (Cloud)',
    description: 'Cloud (Google)',
    details: 'Lightning fast universal model. Best for general queries.',
    provider: 'google',
  },
  {
    id: 'llama-3.1-8b-instant',
    label: 'Llama 3.1 (Cloud)',
    description: 'Cloud (Groq)',
    details: 'Extremely fast inference via Groq LPU.',
    provider: 'groq',
  },
  // --- LOCAL MODELS (Matches your exact terminal list) ---
  {
    id: 'llama3.2',
    label: 'Llama 3.2',
    description: 'Local (Ollama)',
    details: 'Solid all-rounder. Runs locally.',
    ollamaModel: 'llama3.2:latest',
    provider: 'ollama',
  },
  {
    id: 'deepseek',
    label: 'DeepSeek R1',
    description: 'Local (Ollama)',
    details: 'Best for complex math/logic. Runs locally.',
    ollamaModel: 'deepseek-r1:8b',
    provider: 'ollama',
  },
  {
    id: 'mistral',
    label: 'Mistral',
    description: 'Local (Ollama)',
    details: 'Concise answers. Runs locally.',
    ollamaModel: 'mistral:latest',
    provider: 'ollama',
  },
  {
    id: 'qwen-coder',
    label: 'Qwen Coder',
    description: 'Local (Ollama)',
    details: 'Programming assistant. Runs locally.',
    ollamaModel: 'qwen2.5-coder:7b',
    provider: 'ollama',
  },
  {
    id: 'gemma',
    label: 'Gemma',
    description: 'Local (Ollama)',
    details: 'Google Open Model. Runs locally.',
    ollamaModel: 'gemma:latest', // UPDATED to match your terminal exactly
    provider: 'ollama',
  },
];

export const DEFAULT_CHAT_MODEL = CHAT_MODEL_OPTIONS[0];

export function getChatModelOption(modelId?: string | null): ChatModelOption {
  return CHAT_MODEL_OPTIONS.find((model) => model.id === modelId) ?? DEFAULT_CHAT_MODEL;
}
