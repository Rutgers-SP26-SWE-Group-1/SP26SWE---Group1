/* eslint-disable @typescript-eslint/no-require-imports */
const {
  buildModelErrorResponse,
  resolveRequestedModels,
  selectPrimaryResponse,
} = require('../src/lib/chat-api-logic');

const CHAT_MODEL_OPTIONS = [
  { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
  { id: 'llama-3-groq', label: 'Llama 3.1' },
  { id: 'mistral', label: 'Mistral' },
  { id: 'llama3.2', label: 'Llama 3.2' },
  { id: 'deepseek', label: 'DeepSeek R1' },
];

function getChatModelOption(modelId) {
  return CHAT_MODEL_OPTIONS.find((model) => model.id === modelId) ?? CHAT_MODEL_OPTIONS[0];
}

describe('Chat API model resolution', function () {
  it('returns up to three unique models from compare-mode selections', function () {
    const result = resolveRequestedModels(
      ['mistral', 'llama3.2', 'mistral', 'deepseek'],
      null,
      CHAT_MODEL_OPTIONS,
      getChatModelOption
    );

    expect(result.map((model) => model.id)).toEqual(['mistral', 'llama3.2', 'deepseek']);
  });

  it('uses the single selected model when modelId is provided', function () {
    const result = resolveRequestedModels(
      undefined,
      'deepseek',
      CHAT_MODEL_OPTIONS,
      getChatModelOption
    );

    expect(result.map((model) => model.id)).toEqual(['deepseek']);
  });

  it('ignores invalid compare model ids and falls back to the valid ones', function () {
    const result = resolveRequestedModels(
      ['not-real', 'mistral'],
      null,
      CHAT_MODEL_OPTIONS,
      getChatModelOption
    );

    expect(result.map((model) => model.id)).toEqual(['mistral']);
  });

  it('falls back to the first three configured models when nothing valid is requested', function () {
    const result = resolveRequestedModels(
      ['not-real'],
      null,
      CHAT_MODEL_OPTIONS,
      getChatModelOption
    );

    expect(result.map((model) => model.id)).toEqual([
      'gemini-2.5-flash',
      'llama-3-groq',
      'mistral',
    ]);
  });

  it('formats an error response for an unavailable model without breaking the response shape', function () {
    const result = buildModelErrorResponse(
      { id: 'mistral', label: 'Mistral', details: 'Local (Ollama)' },
      'This model is unavailable right now.'
    );

    expect(result).toEqual({
      content: 'Mistral could not respond right now.\n\nThis model is unavailable right now.',
      durationMs: 0,
      isError: true,
      modelDescription: 'Local (Ollama)',
      modelId: 'mistral',
      modelLabel: 'Mistral',
    });
  });

  it('prefers the first successful response when compare mode includes a failed model', function () {
    const result = selectPrimaryResponse([
      { modelId: 'mistral', isError: true, content: 'failed' },
      { modelId: 'llama3.2', isError: false, content: 'success' },
      { modelId: 'deepseek', isError: false, content: 'success 2' },
    ]);

    expect(result).toEqual({ modelId: 'llama3.2', isError: false, content: 'success' });
  });

  it('returns the first response when every compared model fails', function () {
    const result = selectPrimaryResponse([
      { modelId: 'mistral', isError: true, content: 'failed 1' },
      { modelId: 'llama3.2', isError: true, content: 'failed 2' },
    ]);

    expect(result).toEqual({ modelId: 'mistral', isError: true, content: 'failed 1' });
  });
});
