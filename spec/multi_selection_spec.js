/* eslint-disable @typescript-eslint/no-require-imports */
// Feature 1 (Partha individual): selection-state contract for the
// multi-LLM dropdown. Pure-function tests, no DOM, no fetch.

const {
  MAX_MODELS,
  MIN_MODELS,
  createSelectionState,
  openDropdown,
  closeDropdown,
  toggleModel,
  clearSelection,
  canSelectMore,
  selectionCount,
} = require('../src/lib/multi-llm/selection');
const { LOCAL_OLLAMA_MODELS } = require('../src/lib/multi-llm/localModels');

describe('Feature 1 - multi-LLM dropdown selection state', function () {
  it('exposes a 1..4 selection cap that is different from teammates', function () {
    expect(MIN_MODELS).toBe(1);
    expect(MAX_MODELS).toBe(4);
  });

  it('seeds the first registered local model when no initial ids are supplied', function () {
    const state = createSelectionState();
    expect(state.isOpen).toBe(false);
    expect(state.selectedModelIds).toEqual([LOCAL_OLLAMA_MODELS[0].id]);
  });

  it('honors a caller-supplied seed but caps it at MAX_MODELS and ignores unknown ids', function () {
    const state = createSelectionState([
      LOCAL_OLLAMA_MODELS[0].id,
      'totally-not-a-model',
      LOCAL_OLLAMA_MODELS[1].id,
      LOCAL_OLLAMA_MODELS[2].id,
      LOCAL_OLLAMA_MODELS[3].id,
      LOCAL_OLLAMA_MODELS[4].id,
    ]);
    expect(state.selectedModelIds.length).toBe(MAX_MODELS);
    expect(state.selectedModelIds).not.toContain('totally-not-a-model');
  });

  it('opens and closes the dropdown via pure transitions', function () {
    const closed = createSelectionState();
    const opened = openDropdown(closed);
    expect(opened.isOpen).toBe(true);
    expect(opened).not.toBe(closed);

    const closedAgain = closeDropdown(opened);
    expect(closedAgain.isOpen).toBe(false);
  });

  it('lets the user add a second, third, and fourth distinct model', function () {
    let state = createSelectionState([LOCAL_OLLAMA_MODELS[0].id]);
    state = toggleModel(state, LOCAL_OLLAMA_MODELS[1].id);
    state = toggleModel(state, LOCAL_OLLAMA_MODELS[2].id);
    state = toggleModel(state, LOCAL_OLLAMA_MODELS[3].id);
    expect(state.selectedModelIds).toEqual([
      LOCAL_OLLAMA_MODELS[0].id,
      LOCAL_OLLAMA_MODELS[1].id,
      LOCAL_OLLAMA_MODELS[2].id,
      LOCAL_OLLAMA_MODELS[3].id,
    ]);
    expect(canSelectMore(state)).toBe(false);
  });

  it('refuses to add a fifth model once the cap is reached', function () {
    let state = createSelectionState(LOCAL_OLLAMA_MODELS.slice(0, 4).map((m) => m.id));
    const before = state.selectedModelIds.slice();
    state = toggleModel(state, LOCAL_OLLAMA_MODELS[4].id);
    expect(state.selectedModelIds).toEqual(before);
    expect(selectionCount(state)).toBe(MAX_MODELS);
  });

  it('lets the user deselect down to one model but no further', function () {
    let state = createSelectionState([
      LOCAL_OLLAMA_MODELS[0].id,
      LOCAL_OLLAMA_MODELS[1].id,
    ]);
    state = toggleModel(state, LOCAL_OLLAMA_MODELS[1].id);
    expect(state.selectedModelIds).toEqual([LOCAL_OLLAMA_MODELS[0].id]);

    const blocked = toggleModel(state, LOCAL_OLLAMA_MODELS[0].id);
    expect(blocked.selectedModelIds).toEqual([LOCAL_OLLAMA_MODELS[0].id]);
  });

  it('silently ignores toggling an unknown model id', function () {
    const state = createSelectionState();
    const next = toggleModel(state, 'cloud-model-from-shiv');
    expect(next).toBe(state);
  });

  it('clearSelection resets to a single default model', function () {
    let state = createSelectionState(LOCAL_OLLAMA_MODELS.slice(0, 3).map((m) => m.id));
    state = clearSelection(state);
    expect(state.selectedModelIds.length).toBe(1);
    expect(state.selectedModelIds[0]).toBe(LOCAL_OLLAMA_MODELS[0].id);
  });
});
