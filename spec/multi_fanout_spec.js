/* eslint-disable @typescript-eslint/no-require-imports */
// Feature 2 (Partha individual): server-side fan-out. We never call the
// real Ollama daemon here; the requestModelResponse dispatcher is injected.

const {
  runFanout,
  summarizeFanout,
  STATUS_FULFILLED,
  STATUS_REJECTED,
} = require('../src/lib/multi-llm/fanout');
const { LOCAL_OLLAMA_MODELS } = require('../src/lib/multi-llm/localModels');

const PROMPT_MESSAGES = [
  { role: 'system', content: 'test system' },
  { role: 'user', content: 'Explain Big-O notation in one sentence.' },
];

describe('Feature 2 - parallel fan-out to local models', function () {
  it('rejects an empty model list with a useful error', async function () {
    let caught = null;
    try {
      await runFanout({ modelIds: [], promptMessages: PROMPT_MESSAGES });
    } catch (err) {
      caught = err;
    }
    expect(caught).not.toBeNull();
    expect(caught.message).toContain('modelIds');
  });

  it('rejects an empty prompt message list', async function () {
    let caught = null;
    try {
      await runFanout({ modelIds: [LOCAL_OLLAMA_MODELS[0].id], promptMessages: [] });
    } catch (err) {
      caught = err;
    }
    expect(caught).not.toBeNull();
    expect(caught.message).toContain('promptMessages');
  });

  it('dispatches the same prompt to every selected model', async function () {
    const seen = [];
    await runFanout({
      modelIds: [
        LOCAL_OLLAMA_MODELS[0].id,
        LOCAL_OLLAMA_MODELS[1].id,
        LOCAL_OLLAMA_MODELS[3].id,
      ],
      promptMessages: PROMPT_MESSAGES,
      requestModelResponse: async ({ option, messages }) => {
        seen.push({ tag: option.ollamaTag, lastMsg: messages[messages.length - 1].content });
        return `${option.label} reply`;
      },
    });

    expect(seen.length).toBe(3);
    expect(seen.every((entry) => entry.lastMsg === PROMPT_MESSAGES[1].content)).toBe(true);
  });

  it('produces one response per selected model with model id and label', async function () {
    const responses = await runFanout({
      modelIds: [LOCAL_OLLAMA_MODELS[0].id, LOCAL_OLLAMA_MODELS[2].id],
      promptMessages: PROMPT_MESSAGES,
      requestModelResponse: async ({ option }) => `${option.label} content`,
    });

    expect(responses.length).toBe(2);
    expect(responses[0].modelId).toBe(LOCAL_OLLAMA_MODELS[0].id);
    expect(responses[0].modelLabel).toBe(LOCAL_OLLAMA_MODELS[0].label);
    expect(responses[1].modelId).toBe(LOCAL_OLLAMA_MODELS[2].id);
    expect(responses.every((r) => r.status === STATUS_FULFILLED)).toBe(true);
  });

  it('isolates per-model failures so siblings still resolve', async function () {
    const responses = await runFanout({
      modelIds: [
        LOCAL_OLLAMA_MODELS[0].id,
        LOCAL_OLLAMA_MODELS[3].id,
        LOCAL_OLLAMA_MODELS[4].id,
      ],
      promptMessages: PROMPT_MESSAGES,
      requestModelResponse: async ({ option }) => {
        if (option.id === LOCAL_OLLAMA_MODELS[3].id) {
          throw new Error('simulated TinyLlama outage');
        }
        return `${option.label} OK`;
      },
    });

    expect(responses.length).toBe(3);
    const tinyResult = responses.find((r) => r.modelId === LOCAL_OLLAMA_MODELS[3].id);
    expect(tinyResult.status).toBe(STATUS_REJECTED);
    expect(tinyResult.error).toContain('simulated TinyLlama outage');
    expect(tinyResult.content).toBe('');

    const others = responses.filter((r) => r.modelId !== LOCAL_OLLAMA_MODELS[3].id);
    expect(others.every((r) => r.status === STATUS_FULFILLED)).toBe(true);
  });

  it('runs requests concurrently rather than sequentially', async function () {
    const startedAt = Date.now();
    const PER_MODEL_DELAY_MS = 80;

    await runFanout({
      modelIds: [
        LOCAL_OLLAMA_MODELS[0].id,
        LOCAL_OLLAMA_MODELS[1].id,
        LOCAL_OLLAMA_MODELS[2].id,
        LOCAL_OLLAMA_MODELS[3].id,
      ],
      promptMessages: PROMPT_MESSAGES,
      requestModelResponse: ({ option }) =>
        new Promise((resolve) => {
          setTimeout(() => resolve(`${option.label} done`), PER_MODEL_DELAY_MS);
        }),
    });

    const elapsed = Date.now() - startedAt;
    // Sequential would be >= 4 * 80 = 320ms. Allow generous slack but stay
    // well under the sequential floor.
    expect(elapsed).toBeLessThan(PER_MODEL_DELAY_MS * 3);
  });

  it('records a non-negative durationMs for every response', async function () {
    const responses = await runFanout({
      modelIds: [LOCAL_OLLAMA_MODELS[0].id, LOCAL_OLLAMA_MODELS[1].id],
      promptMessages: PROMPT_MESSAGES,
      requestModelResponse: async ({ option }) => `${option.label} reply`,
    });
    for (const r of responses) {
      expect(typeof r.durationMs).toBe('number');
      expect(r.durationMs).toBeGreaterThanOrEqual(0);
    }
  });

  it('summarizeFanout reports correct succeeded/failed counts', async function () {
    const responses = await runFanout({
      modelIds: [LOCAL_OLLAMA_MODELS[0].id, LOCAL_OLLAMA_MODELS[1].id, LOCAL_OLLAMA_MODELS[2].id],
      promptMessages: PROMPT_MESSAGES,
      requestModelResponse: async ({ option }) => {
        if (option.id === LOCAL_OLLAMA_MODELS[1].id) {
          throw new Error('boom');
        }
        return 'ok';
      },
    });

    const summary = summarizeFanout(responses);
    expect(summary.total).toBe(3);
    expect(summary.succeeded).toBe(2);
    expect(summary.failed).toBe(1);
    expect(summary.averageMs).toBeGreaterThanOrEqual(0);
  });

  it('returns an error entry (not a throw) when an unknown model id sneaks in', async function () {
    const responses = await runFanout({
      modelIds: ['mystery-cloud-id', LOCAL_OLLAMA_MODELS[0].id],
      promptMessages: PROMPT_MESSAGES,
      requestModelResponse: async ({ option }) => `${option.label} reply`,
    });
    expect(responses.length).toBe(2);
    const unknown = responses.find((r) => r.modelId === 'mystery-cloud-id');
    expect(unknown.status).toBe(STATUS_REJECTED);
    expect(unknown.error).toContain('Unknown local model id');
  });
});
