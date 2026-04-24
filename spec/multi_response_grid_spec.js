/* eslint-disable @typescript-eslint/no-require-imports */
// Feature 3 (Partha individual): the side-by-side grid's pure helper
// layer. Tests cover ordering, label resolution, error rendering, the
// fastest-section pick, and the column count ramp.

const {
  buildGridSections,
  pickFastestSection,
  gridColumnCount,
} = require('../src/lib/multi-llm/grid');
const { LOCAL_OLLAMA_MODELS } = require('../src/lib/multi-llm/localModels');

function makeFulfilled(modelId, content, durationMs) {
  return { modelId, status: 'fulfilled', content, durationMs };
}

function makeRejected(modelId, error, durationMs) {
  return { modelId, status: 'rejected', content: '', error, durationMs };
}

describe('Feature 3 - inline side-by-side grid helpers', function () {
  it('returns an empty array when there are no responses', function () {
    expect(buildGridSections([])).toEqual([]);
    expect(buildGridSections(null)).toEqual([]);
    expect(buildGridSections(undefined)).toEqual([]);
  });

  it('produces one section per response, in submission order', function () {
    const sections = buildGridSections([
      makeFulfilled(LOCAL_OLLAMA_MODELS[2].id, 'Qwen reply', 700),
      makeFulfilled(LOCAL_OLLAMA_MODELS[0].id, 'Llama reply', 1100),
      makeFulfilled(LOCAL_OLLAMA_MODELS[3].id, 'TinyLlama reply', 200),
    ]);

    expect(sections.length).toBe(3);
    expect(sections.map((s) => s.modelId)).toEqual([
      LOCAL_OLLAMA_MODELS[2].id,
      LOCAL_OLLAMA_MODELS[0].id,
      LOCAL_OLLAMA_MODELS[3].id,
    ]);
    expect(sections.map((s) => s.orderIndex)).toEqual([0, 1, 2]);
  });

  it('resolves human-friendly labels and family names from the registry', function () {
    const sections = buildGridSections([
      makeFulfilled(LOCAL_OLLAMA_MODELS[1].id, 'Phi reply', 500),
    ]);
    expect(sections[0].modelLabel).toBe(LOCAL_OLLAMA_MODELS[1].label);
    expect(sections[0].family).toBe(LOCAL_OLLAMA_MODELS[1].family);
    expect(sections[0].ollamaTag).toBe(LOCAL_OLLAMA_MODELS[1].ollamaTag);
  });

  it('falls back to the response label when the model id is unknown', function () {
    const sections = buildGridSections([
      { modelId: 'no-such', modelLabel: 'Mystery', status: 'fulfilled', content: 'x', durationMs: 1 },
    ]);
    expect(sections[0].modelLabel).toBe('Mystery');
    expect(sections[0].family).toBeNull();
  });

  it('marks rejected responses as errors and surfaces the message', function () {
    const sections = buildGridSections([
      makeRejected(LOCAL_OLLAMA_MODELS[3].id, 'Ollama unreachable', 12),
    ]);
    expect(sections[0].hasError).toBe(true);
    expect(sections[0].errorMessage).toBe('Ollama unreachable');
    expect(sections[0].content).toBe('');
  });

  it('pickFastestSection picks the lowest durationMs among successful responses', function () {
    const sections = buildGridSections([
      makeFulfilled(LOCAL_OLLAMA_MODELS[0].id, 'a', 950),
      makeFulfilled(LOCAL_OLLAMA_MODELS[1].id, 'b', 230),
      makeFulfilled(LOCAL_OLLAMA_MODELS[2].id, 'c', 410),
    ]);
    const fastest = pickFastestSection(sections);
    expect(fastest).not.toBeNull();
    expect(fastest.modelId).toBe(LOCAL_OLLAMA_MODELS[1].id);
  });

  it('pickFastestSection ignores rejected responses', function () {
    const sections = buildGridSections([
      makeRejected(LOCAL_OLLAMA_MODELS[0].id, 'oops', 5),
      makeFulfilled(LOCAL_OLLAMA_MODELS[1].id, 'b', 700),
    ]);
    const fastest = pickFastestSection(sections);
    expect(fastest.modelId).toBe(LOCAL_OLLAMA_MODELS[1].id);
  });

  it('pickFastestSection returns null when every response failed', function () {
    const sections = buildGridSections([
      makeRejected(LOCAL_OLLAMA_MODELS[0].id, 'x', 1),
      makeRejected(LOCAL_OLLAMA_MODELS[1].id, 'y', 2),
    ]);
    expect(pickFastestSection(sections)).toBeNull();
  });

  it('gridColumnCount ramps 1 -> 1, 2 -> 2, 3+ -> 3 columns', function () {
    expect(gridColumnCount(0)).toBe(1);
    expect(gridColumnCount(1)).toBe(1);
    expect(gridColumnCount(2)).toBe(2);
    expect(gridColumnCount(3)).toBe(3);
    expect(gridColumnCount(4)).toBe(3);
  });
});
