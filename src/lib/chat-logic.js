import { randomUUID } from 'crypto';

// Use 5000 for the logic check if your tests expect it,
// otherwise keep 2000 for your specific UI limit.
export const MAX_MESSAGE_LENGTH = 5000;

/**
 * validateMessage
 * Handles the specific validation error messages expected by chat_spec.js
 */
export function validateMessage(message) {
  const trimmed = typeof message === 'string' ? message.trim() : '';

  if (!trimmed) {
    return { isValid: false, error: 'Message cannot be empty.' };
  }

  if (trimmed.length > MAX_MESSAGE_LENGTH) {
    return { isValid: false, error: 'Message is too long.' };
  }

  return { isValid: true, error: null };
}

/**
 * formatChatPayload
 * Formats the message and ID for external API processing
 */
export function formatChatPayload(message, conversationId = null) {
  return {
    message: typeof message === 'string' ? message.trim() : '',
    conversationId,
  };
}

/**
 * sanitizeInput
 * Strips script tags to prevent XSS as required by sanitization tests
 */
export function sanitizeInput(input) {
  if (typeof input !== 'string') return '';
  return input.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gmi, '').trim();
}

function normalizeMessage(message) {
  return typeof message === 'string' ? message.trim() : '';
}

export function validateChatRequest(message) {
  const normalized = normalizeMessage(message);

  if (!normalized) {
    return { isValid: false, error: 'Message is required.' };
  }

  if (normalized.length > 2000) {
    return {
      isValid: false,
      error: 'Message must be 2000 characters or fewer.',
    };
  }

  return { isValid: true, error: null, normalizedMessage: normalized };
}

export function createConversationId(existingId) {
  return typeof existingId === 'string' && existingId.trim()
    ? existingId
    : randomUUID();
}

export function sanitizeMessages(messages) {
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
  if (
    normalized.includes('job') ||
    normalized.includes('career') ||
    normalized.includes('internship')
  ) {
    return 'career';
  }
  if (
    normalized.includes('study') ||
    normalized.includes('exam') ||
    normalized.includes('class')
  ) {
    return 'academics';
  }
  if (
    normalized.includes('hello') ||
    normalized.includes('hi') ||
    normalized.includes('hey')
  ) {
    return 'greeting';
  }

  return 'general';
}

export function buildFallbackReply(message, options = {}) {
  const topic = detectTopic(message);
  const firstName = options.userName
    ? String(options.userName).trim().split(/\s+/)[0]
    : null;
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