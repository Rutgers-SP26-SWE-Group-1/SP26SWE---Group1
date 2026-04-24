// Partha's local-only Ollama model registry.
//
// This file intentionally lives outside src/lib/chat-models.ts so the new
// multi-LLM dropdown / fan-out endpoint cannot accidentally route to a cloud
// provider (Gemini, Groq, Anthropic). Every entry here is something the user
// can run with `ollama serve` on their own machine.
//
// The five tags below were chosen to be visibly different from teammate
// submissions: small enough to demo on a laptop, but spanning four distinct
// model families (Llama, Phi, Qwen, Gemma, TinyLlama).

const LOCAL_OLLAMA_MODELS = [
  {
    id: 'llama3.2',
    label: 'Llama 3.2',
    ollamaTag: 'llama3.2:latest',
    family: 'Meta Llama',
    blurb: 'Meta Llama 3.2 (~2 GB). Good general-purpose answers.',
    sizeMb: 2000,
  },
  {
    id: 'phi3-mini',
    label: 'Phi-3 Mini',
    ollamaTag: 'phi3:mini',
    family: 'Microsoft Phi',
    blurb: 'Microsoft Phi-3 Mini (~2.3 GB). Strong reasoning per byte.',
    sizeMb: 2300,
  },
  {
    id: 'qwen2_5-3b',
    label: 'Qwen 2.5 3B',
    ollamaTag: 'qwen2.5:3b',
    family: 'Alibaba Qwen',
    blurb: 'Alibaba Qwen 2.5 3B (~1.9 GB). Multilingual generalist.',
    sizeMb: 1900,
  },
  {
    id: 'tinyllama',
    label: 'TinyLlama',
    ollamaTag: 'tinyllama:latest',
    family: 'TinyLlama',
    blurb: 'TinyLlama 1.1B (~640 MB). Near-instant answers, lower quality.',
    sizeMb: 640,
  },
  {
    id: 'gemma2-2b',
    label: 'Gemma 2 2B',
    ollamaTag: 'gemma2:2b',
    family: 'Google Gemma',
    blurb: 'Google Gemma 2 2B (~1.6 GB). Tight, structured replies.',
    sizeMb: 1600,
  },
];

const LOCAL_MODEL_INDEX = LOCAL_OLLAMA_MODELS.reduce((acc, model) => {
  acc[model.id] = model;
  return acc;
}, {});

function getLocalModel(modelId) {
  return LOCAL_MODEL_INDEX[modelId] || null;
}

function listLocalModelIds() {
  return LOCAL_OLLAMA_MODELS.map((model) => model.id);
}

function isLocalModelId(modelId) {
  return Object.prototype.hasOwnProperty.call(LOCAL_MODEL_INDEX, modelId);
}

module.exports = {
  LOCAL_OLLAMA_MODELS,
  getLocalModel,
  listLocalModelIds,
  isLocalModelId,
};
