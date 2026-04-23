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
    id: 'gemini-2.5-flash', // Updated ID to match the label
    label: 'Gemini 2.5 Flash',
    provider: 'google',
    description: 'Universal (Cloud)',
    details: 'Runs via API. Fastest cloud model. Works for all online users.'
  },
  {
    id: 'llama-3.1',
    label: 'Llama 3.1',
    provider: 'groq',
    description: 'Universal (Cloud)',
    details: 'Runs via API. High-speed Llama hosted on Groq. Works for all users.'
  },
  
 /* { id: 'claude-3-sonnet', 
    label: 'Claude 3 Sonnet',
    description: 'Universal (Cloud)',
    details: 'AI with strong reasoning. Great for all users.', 
    provider: 'anthropic' },
  
  { id: 'gpt-4o', 
    label: 'GPT-4o', 
    description: 'Universal (Cloud)',
    details: 'Latest OpenAI model. Works for all users.',
    provider: 'openai' },
*/

  // --- LOCAL MODELS (Requires Ollama installation) ---
  {
    id: 'local-gemma',
    label: 'Gemma (Local)',
    provider: 'ollama',
    ollamaModel: 'gemma:latest', 
    description: 'Google open weights',
    details: 'Running locally'
  },
  {
    id: 'local-llama3.2',
    label: 'Llama 3.2',
    provider: 'ollama',
    ollamaModel: 'llama3.2:latest', 
    description: 'Meta lightweight model',
    details: 'Fast local performance'
  },
  {
    id: 'local-deepseek',
    label: 'DeepSeek R1',
    provider: 'ollama',
    ollamaModel: 'deepseek-r1:8b', 
    description: 'DeepSeek reasoning model',
    details: 'Great for logic tasks'
  },
  {
    id: 'local-mistral',
    label: 'Mistral',
    provider: 'ollama',
    ollamaModel: 'mistral:latest', 
    description: 'Mistral AI foundation model',
    details: 'Running locally'
  },
  {
    id: 'local-qwen',
    label: 'Qwen Coder',
    provider: 'ollama',
    ollamaModel: 'qwen2.5-coder:7b', 
    description: 'Alibaba coding model',
    details: 'Specialized for programming'
  }
];

export const DEFAULT_CHAT_MODEL = CHAT_MODEL_OPTIONS[0];

export function getChatModelOption(id: string) {
  return CHAT_MODEL_OPTIONS.find(model => model.id === id) || DEFAULT_CHAT_MODEL;
}