// Pure selection-state helpers for the multi-LLM dropdown.
//
// Caps are deliberately different from teammate Shiv's "exactly 3" rule:
// here the user picks anywhere between 1 and 4 models. The state is plain
// data (no React) so Jasmine can drive it directly.

const { isLocalModelId, listLocalModelIds } = require('./localModels');

const MAX_MODELS = 4;
const MIN_MODELS = 1;

function createSelectionState(initialModelIds) {
  const seed = Array.isArray(initialModelIds) && initialModelIds.length > 0
    ? initialModelIds.filter(isLocalModelId).slice(0, MAX_MODELS)
    : [listLocalModelIds()[0]];

  return {
    isOpen: false,
    selectedModelIds: dedupe(seed),
  };
}

function openDropdown(state) {
  return { ...state, isOpen: true };
}

function closeDropdown(state) {
  return { ...state, isOpen: false };
}

function toggleModel(state, modelId) {
  if (!isLocalModelId(modelId)) {
    return state;
  }

  const isCurrentlySelected = state.selectedModelIds.includes(modelId);

  if (isCurrentlySelected) {
    if (state.selectedModelIds.length <= MIN_MODELS) {
      return state;
    }
    return {
      ...state,
      selectedModelIds: state.selectedModelIds.filter((id) => id !== modelId),
    };
  }

  if (state.selectedModelIds.length >= MAX_MODELS) {
    return state;
  }

  return {
    ...state,
    selectedModelIds: [...state.selectedModelIds, modelId],
  };
}

function clearSelection(state) {
  const fallback = listLocalModelIds()[0];
  return { ...state, selectedModelIds: [fallback] };
}

function canSelectMore(state) {
  return state.selectedModelIds.length < MAX_MODELS;
}

function selectionCount(state) {
  return state.selectedModelIds.length;
}

function dedupe(arr) {
  const seen = new Set();
  const out = [];
  for (const item of arr) {
    if (!seen.has(item)) {
      seen.add(item);
      out.push(item);
    }
  }
  return out;
}

module.exports = {
  MAX_MODELS,
  MIN_MODELS,
  createSelectionState,
  openDropdown,
  closeDropdown,
  toggleModel,
  clearSelection,
  canSelectMore,
  selectionCount,
};
