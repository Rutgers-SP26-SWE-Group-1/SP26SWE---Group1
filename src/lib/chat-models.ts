export type ChatModelOption = {
  id: string;
  label: string;
  description: string;
  details: string;
  ollamaModel?: string;
  provider: 'ollama' | 'google' | 'groq';
};

export const CHAT_MODEL_OPTIONS: ChatModelOption[] = [
  // --- UNIVERSAL MODELS (Cloud - Works for everyone) ---
  {
    id: 'gemini-2.5-flash',
    label: 'Gemini 2.5 Flash',
    description: 'Universal (Cloud)',
    details: 'Fastest cloud model. Works for all online users.',
    provider: 'google',
  },
  {
    id: 'llama-3-groq',
    label: 'Llama 3.1',
    description: 'Universal (Cloud)',
    details: 'High-speed Llama hosted on Groq. Works for all users.',
    provider: 'groq',
  },

  // --- LOCAL MODELS (Requires Ollama installation) ---
  {
    id: 'mistral',
    label: 'Mistral',
    description: 'Local (Ollama)',
    details: 'Requires the "mistral" Ollama model installed locally.',
    ollamaModel: 'mistral:latest',
    provider: 'ollama',
  },
  {
    id: 'llama3.2',
    label: 'Llama 3.2',
    description: 'Local (Ollama)',
    details: 'Requires the "llama3.2" Ollama model installed locally.',
    ollamaModel: 'llama3.2:latest',
    provider: 'ollama',
  },
  {
    id: 'deepseek',
    label: 'DeepSeek R1',
    description: 'Local (Ollama)',
    details: 'Best for complex reasoning and step-by-step analysis.',
    ollamaModel: 'deepseek-r1:latest',
    provider: 'ollama',
  },
  {
    id: 'qwen-coder',
    label: 'Qwen Coder',
    description: 'Local (Ollama)',
    details: 'Strong code-focused local model for technical prompts.',
    ollamaModel: 'qwen2.5-coder:latest',
    provider: 'ollama',
  },
  {
    id: 'gemma',
    label: 'Gemma 3',
    description: 'Local (Ollama)',
    details: 'Google open model running locally through Ollama.',
    ollamaModel: 'gemma3:latest',
    provider: 'ollama',
  },
];

export const DEFAULT_CHAT_MODEL = CHAT_MODEL_OPTIONS[0];

export function getChatModelOption(modelId?: string | null): ChatModelOption {
  return CHAT_MODEL_OPTIONS.find((model) => model.id === modelId) ?? DEFAULT_CHAT_MODEL;
}
