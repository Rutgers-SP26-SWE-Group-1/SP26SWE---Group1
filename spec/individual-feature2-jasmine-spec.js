/* eslint-disable @typescript-eslint/no-require-imports */
const {
  MAX_MESSAGE_LENGTH,
  buildFallbackReply,
  createConversationId,
  sanitizeMessages,
  buildMultiModelResponses,
  normalizeSelectedModelIds,
  validateChatRequest,
} = require('../src/lib/chat-logic');

describe('Chat Logic', function () {
  it('rejects empty messages', function () {
    const result = validateChatRequest('   ');
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Message is required.');
  });

  it('rejects messages above the max length', function () {
    const result = validateChatRequest('a'.repeat(MAX_MESSAGE_LENGTH + 1));
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('characters or fewer');
  });

  it('accepts a valid message and trims it', function () {
    const result = validateChatRequest('  Hello Rutgers  ');
    expect(result.isValid).toBe(true);
    expect(result.normalizedMessage).toBe('Hello Rutgers');
  });

  it('preserves an existing conversation id', function () {
    expect(createConversationId('conversation-123')).toBe('conversation-123');
  });

  it('creates a conversation id when one is missing', function () {
    const conversationId = createConversationId('');
    expect(typeof conversationId).toBe('string');
    expect(conversationId.length).toBeGreaterThan(10);
  });

  it('sanitizes malformed history messages', function () {
    const sanitized = sanitizeMessages([
      { role: 'system', content: 'ignored role becomes user' },
      { role: 'assistant', content: ' assistant response ' },
      { nope: true },
      { role: 'user', content: '   ' },
    ]);

    expect(sanitized).toEqual([
      { role: 'user', content: 'ignored role becomes user' },
      { role: 'assistant', content: 'assistant response' },
    ]);
  });

  it('builds a Rutgers-aware fallback response', function () {
    const response = buildFallbackReply('Tell me about Rutgers', { userName: 'Ava Patel' });
    expect(response).toContain('Ava,');
    expect(response.toLowerCase()).toContain('rutgers');
  });

  it('sends the user prompt to all selected models', async function () {
    const requestedModels = [];
    const promptMessages = [{ role: 'user', content: 'Explain recursion' }];

    await buildMultiModelResponses({
      modelIds: ['mistral', 'llama3.1', 'deepseek'],
      promptMessages,
      requestModelResponse: async ({ option, messages }) => {
        requestedModels.push({ modelId: option.id, messages });
        return `${option.label} response`;
      },
    });

    expect(requestedModels.map((request) => request.modelId)).toEqual([
      'mistral',
      'llama3.1',
      'deepseek',
    ]);
    requestedModels.forEach((request) => {
      expect(request.messages).toEqual(promptMessages);
    });
  });

  it('generates a response for each selected model', async function () {
    const responses = await buildMultiModelResponses({
      modelIds: ['mistral', 'qwen-coder', 'gemma'],
      promptMessages: [{ role: 'user', content: 'Write a loop' }],
      requestModelResponse: async ({ option }) => `${option.label} answer`,
    });

    expect(responses.map((response) => response.content)).toEqual([
      'Mistral answer',
      'Qwen Coder answer',
      'Gemma 3 answer',
    ]);
  });

  it('labels each response with the correct model name', async function () {
    const responses = await buildMultiModelResponses({
      modelIds: ['llama3.1', 'deepseek'],
      promptMessages: [{ role: 'user', content: 'Compare ideas' }],
      requestModelResponse: async ({ option }) => `${option.id} content`,
    });

    expect(responses.map((response) => response.modelLabel)).toEqual([
      'Llama 3.1',
      'DeepSeek R1',
    ]);
  });

  it('returns the same number of responses as selected models', async function () {
    const selectedModelIds = ['mistral', 'llama3.1', 'deepseek'];
    const responses = await buildMultiModelResponses({
      modelIds: selectedModelIds,
      promptMessages: [{ role: 'user', content: 'What is SWE?' }],
      requestModelResponse: async ({ option }) => `${option.label} answer`,
    });

    expect(responses.length).toBe(selectedModelIds.length);
  });

  it('falls back to Mistral when no models are selected', function () {
    expect(normalizeSelectedModelIds([])).toEqual(['mistral']);
  });
});
