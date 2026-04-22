/* eslint-disable @typescript-eslint/no-require-imports */
const {
  MAX_MESSAGE_LENGTH,
  buildFallbackReply,
  createConversationId,
  detectMathReasoningRequest,
  detectRutgersCourseWeatherRequest,
  resolveChatModelId,
  sanitizeMessages,
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

  it('detects math reasoning requests from common indicators', function () {
    expect(detectMathReasoningRequest('Solve 2x + 4 = 10')).toBe(true);
    expect(detectMathReasoningRequest('What clubs should I join at Rutgers?')).toBe(false);
  });

  it('routes step-by-step or math requests to DeepSeek', function () {
    expect(resolveChatModelId('mistral', { stepByStepMode: true, isMathRequest: false })).toBe('deepseek');
    expect(resolveChatModelId('mistral', { stepByStepMode: false, isMathRequest: true })).toBe('deepseek');
    expect(resolveChatModelId('mistral', { stepByStepMode: false, isMathRequest: false })).toBe('mistral');
  });

  it('detects Rutgers course and weather requests separately', function () {
    expect(detectRutgersCourseWeatherRequest('Find open Rutgers CS classes on Monday')).toEqual(
      jasmine.objectContaining({ needsCourse: true, needsWeather: false })
    );
    expect(detectRutgersCourseWeatherRequest('What is the weather in New Brunswick today?')).toEqual(
      jasmine.objectContaining({ needsCourse: false, needsWeather: true })
    );
    expect(detectRutgersCourseWeatherRequest('Find available Rutgers math courses and tell me the weather for tomorrow')).toEqual(
      jasmine.objectContaining({ needsCourse: true, needsWeather: true })
    );
  });
});
