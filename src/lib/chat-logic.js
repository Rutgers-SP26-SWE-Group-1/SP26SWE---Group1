/* eslint-disable @typescript-eslint/no-require-imports */
const { randomUUID } = require('crypto');

// Use 5000 for the logic check if your tests expect it, 
// otherwise keep 2000 for your specific UI limit.
const MAX_MESSAGE_LENGTH = 5000; 

const CHAT_MODEL_OPTIONS = [
  {
    id: 'mistral',
    label: 'Mistral',
    description: 'General / Fast',
    details: 'Fast local-purpose model for quick responses and everyday prompts.',
    ollamaModel: 'mistral:latest',
  },
  {
    id: 'llama3.1',
    label: 'Llama 3.1',
    description: 'Explanations',
    details: 'Strong at clear explanations and step-by-step breakdowns.',
    ollamaModel: 'llama3.1:8b',
  },
  {
    id: 'deepseek',
    label: 'DeepSeek R1',
    description: 'Reasoning',
    details: 'Best fit for deeper reasoning and complex logic questions.',
    ollamaModel: 'deepseek-r1:8b',
  },
  {
    id: 'qwen-coder',
    label: 'Qwen Coder',
    description: 'Coding',
    details: 'Specialized for programming help, debugging, and code generation.',
    ollamaModel: 'qwen2.5-coder:7b',
  },
  {
    id: 'gemma',
    label: 'Gemma 3',
    description: 'Balanced',
    details: 'Balanced local model for a mix of speed, quality, and versatility.',
    ollamaModel: 'gemma3:latest',
  },
];

const DEFAULT_MODEL_ID = CHAT_MODEL_OPTIONS[0].id;
const MAX_SELECTED_MODELS = 3;

function getChatModelOption(modelId) {
  return CHAT_MODEL_OPTIONS.find((model) => model.id === modelId) ?? CHAT_MODEL_OPTIONS[0];
}

/**
 * MISSING FUNCTION 1: validateMessage
 * Handles the specific validation error messages expected by chat_spec.js
 */
function validateMessage(message) {
  const trimmed = typeof message === 'string' ? message.trim() : '';
  
  if (!trimmed) {
    return { isValid: false, error: "Message cannot be empty." };
  }

  if (trimmed.length > MAX_MESSAGE_LENGTH) {
    return { isValid: false, error: "Message is too long." };
  }

  return { isValid: true, error: null };
}

/**
 * MISSING FUNCTION 2: formatChatPayload
 * Formats the message and ID for external API processing
 */
function formatChatPayload(message, conversationId = null) {
  return {
    message: typeof message === 'string' ? message.trim() : '',
    conversationId: conversationId
  };
}

/**
 * MISSING FUNCTION 3: sanitizeInput
 * Strips script tags to prevent XSS as required by sanitization tests
 */
function sanitizeInput(input) {
  if (typeof input !== 'string') return '';
  // Strips <script> tags and their inner content
  return input.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gmi, "").trim();
}

function normalizeMessage(message) {
  return typeof message === 'string' ? message.trim() : '';
}

function validateChatRequest(message) {
  const normalized = normalizeMessage(message);

  if (!normalized) {
    return { isValid: false, error: 'Message is required.' };
  }

  if (normalized.length > 2000) { // Specific limit for the chat request
    return {
      isValid: false,
      error: `Message must be 2000 characters or fewer.`,
    };
  }

  return { isValid: true, error: null, normalizedMessage: normalized };
}

function createConversationId(existingId) {
  return typeof existingId === 'string' && existingId.trim() ? existingId : randomUUID();
}

function sanitizeMessages(messages) {
  if (!Array.isArray(messages)) {
    return [];
  }

  return messages
    .filter((message) => message && typeof message.content === 'string')
    .map((message) => ({
      role: message.role === 'assistant' ? 'assistant' : 'user',
      content: message.content.trim().slice(0, 2000),
    }))
    .filter((message) => message.content.length > 0)
    .slice(-10);
}

function detectTopic(message) {
  const normalized = message.toLowerCase();

  if (normalized.includes('software engineering')) return 'software-engineering';
  if (normalized.includes('rutgers') || normalized.includes('scarlet knight')) return 'rutgers';
  if (normalized.includes('job') || normalized.includes('career') || normalized.includes('internship')) return 'career';
  if (normalized.includes('study') || normalized.includes('exam') || normalized.includes('class')) return 'academics';
  if (normalized.includes('hello') || normalized.includes('hi') || normalized.includes('hey')) return 'greeting';

  return 'general';
}

function buildFallbackReply(message, options = {}) {
  const topic = detectTopic(message);
  const firstName = options.userName ? String(options.userName).trim().split(/\s+/)[0] : null;
  const greeting = firstName ? `${firstName}, ` : '';

  switch (topic) {
    case 'software-engineering':
      return `${greeting}software engineering is the practice of designing, building, testing, and maintaining reliable software systems. A strong answer usually covers requirements, architecture, implementation, testing, deployment, and iteration.`;
    case 'rutgers':
      return `${greeting}Rutgers questions usually land in one of three buckets: academics, campus resources, or student life. If you tell me which one you mean, I can give a more specific answer tailored to a Rutgers student.`;
    default:
      return `${greeting}I can help with Rutgers life, software engineering topics, study planning, and general questions.`;
  }
}

function normalizeSelectedModelIds(modelIds, fallbackModelId = DEFAULT_MODEL_ID) {
  const validModelIds = new Set(CHAT_MODEL_OPTIONS.map((model) => model.id));
  const uniqueModelIds = Array.from(new Set((Array.isArray(modelIds) ? modelIds : [modelIds]).filter(Boolean)));
  const normalizedModelIds = uniqueModelIds
    .filter((modelId) => validModelIds.has(modelId))
    .slice(0, MAX_SELECTED_MODELS);

  if (normalizedModelIds.length > 0) {
    return normalizedModelIds;
  }

  return [fallbackModelId];
}

async function buildMultiModelResponses({ modelIds, promptMessages, requestModelResponse }) {
  const selectedModelIds = normalizeSelectedModelIds(modelIds);

  return Promise.all(
    selectedModelIds.map(async (modelId) => {
      const option = getChatModelOption(modelId);
      const content = await requestModelResponse({ option, messages: promptMessages });

      return {
        content: String(content || '').trim(),
        modelId: option.id,
        modelLabel: option.label,
        modelDescription: option.details,
      };
    })
  );
}

// Ensure ALL functions are exported for Jasmine to find them
module.exports = {
  MAX_MESSAGE_LENGTH,
  CHAT_MODEL_OPTIONS,
  DEFAULT_MODEL_ID,
  MAX_SELECTED_MODELS,
  validateMessage,      // Fixed failures 5, 6, 7, 8
  formatChatPayload,    // Fixed failures 3, 4
  sanitizeInput,        // Fixed failures 1, 2
  buildMultiModelResponses,
  buildFallbackReply,
  createConversationId,
  getChatModelOption,
  normalizeSelectedModelIds,
  sanitizeMessages,
  validateChatRequest,
};
