/* eslint-disable @typescript-eslint/no-require-imports */
const {
  buildDefaultModelSelection,
  sanitizeSelectedModelIds,
  updateSelectedModelSlot,
  sanitizeSingleModelId,
  sanitizeChatMode,
} = require('../src/lib/chat-selection-logic');

const CHAT_MODEL_OPTIONS = [
  { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
  { id: 'llama-3-groq', label: 'Llama 3.1' },
  { id: 'mistral', label: 'Mistral' },
  { id: 'llama3.2', label: 'Llama 3.2' },
  { id: 'deepseek', label: 'DeepSeek R1' },
];

describe('Chat selection logic', function () {
  it('builds the default three-model compare selection from the first available models', function () {
    expect(buildDefaultModelSelection(CHAT_MODEL_OPTIONS)).toEqual([
      'gemini-2.5-flash',
      'llama-3-groq',
      'mistral',
    ]);
  });

  it('sanitizes compare selections by removing duplicates and invalid model ids', function () {
    const result = sanitizeSelectedModelIds(
      ['mistral', 'mistral', 'not-a-real-model'],
      CHAT_MODEL_OPTIONS
    );

    expect(result).toEqual(['mistral', 'gemini-2.5-flash', 'llama-3-groq']);
  });

  it('keeps compare selections capped at three models', function () {
    const result = sanitizeSelectedModelIds(
      ['mistral', 'llama3.2', 'deepseek', 'gemini-2.5-flash'],
      CHAT_MODEL_OPTIONS
    );

    expect(result).toEqual(['mistral', 'llama3.2', 'deepseek']);
  });

  it('updates one compare slot and keeps all selected models distinct', function () {
    const result = updateSelectedModelSlot(
      ['mistral', 'llama3.2', 'deepseek'],
      1,
      'mistral',
      CHAT_MODEL_OPTIONS
    );

    expect(result).toEqual(['gemini-2.5-flash', 'mistral', 'deepseek']);
  });

  it('falls back to the first available model for invalid single-model selections', function () {
    expect(sanitizeSingleModelId('not-a-real-model', CHAT_MODEL_OPTIONS)).toBe('gemini-2.5-flash');
  });

  it('keeps a valid single-model selection', function () {
    expect(sanitizeSingleModelId('deepseek', CHAT_MODEL_OPTIONS)).toBe('deepseek');
  });

  it('normalizes chat mode values to either single or compare', function () {
    expect(sanitizeChatMode('compare')).toBe('compare');
    expect(sanitizeChatMode('anything-else')).toBe('single');
  });
});
