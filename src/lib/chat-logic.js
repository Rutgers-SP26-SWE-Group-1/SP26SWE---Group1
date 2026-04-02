/* eslint-disable @typescript-eslint/no-require-imports */
const { randomUUID } = require('crypto');

const MAX_MESSAGE_LENGTH = 2000;

function normalizeMessage(message) {
  return typeof message === 'string' ? message.trim() : '';
}

function validateChatRequest(message) {
  const normalized = normalizeMessage(message);

  if (!normalized) {
    return { isValid: false, error: 'Message is required.' };
  }

  if (normalized.length > MAX_MESSAGE_LENGTH) {
    return {
      isValid: false,
      error: `Message must be ${MAX_MESSAGE_LENGTH} characters or fewer.`,
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
      content: message.content.trim().slice(0, MAX_MESSAGE_LENGTH),
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
    case 'career':
      return `${greeting}for internships and early-career growth, focus on one polished project, clear resume bullets, and repeated interview practice. If you share your target role, I can help you draft a sharper plan.`;
    case 'academics':
      return `${greeting}the fastest improvement loop is usually: break the task into smaller steps, write down assumptions, and test your understanding with one concrete example. If you want, I can help you work through the exact assignment question.`;
    case 'greeting':
      return `${greeting}hi! I’m ready to help with Rutgers questions, software engineering concepts, brainstorming, and quick study support.`;
    default:
      return `${greeting}I can help with Rutgers life, software engineering topics, study planning, and general questions. Ask a more specific follow-up and I’ll give a tighter answer.`;
  }
}

function buildProviderPayload(messages, message, options = {}) {
  const systemPrompt =
    'You are Scarlet AI, a concise and helpful assistant for the Rutgers community. Provide practical, safe, student-friendly answers.';

  const history = sanitizeMessages(messages);
  const promptMessages = [{ role: 'system', content: systemPrompt }, ...history];

  if (!history.length || history[history.length - 1]?.content !== message) {
    promptMessages.push({ role: 'user', content: message });
  }

  return {
    messages: promptMessages,
    userName: options.userName || null,
  };
}

module.exports = {
  MAX_MESSAGE_LENGTH,
  buildFallbackReply,
  buildProviderPayload,
  createConversationId,
  sanitizeMessages,
  validateChatRequest,
};
