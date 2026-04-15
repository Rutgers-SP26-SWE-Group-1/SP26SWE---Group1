function normalizeModelIds(modelIds, fallbackModelId, maxSelections) {
  const uniqueModelIds = Array.from(new Set((modelIds || []).filter(Boolean)));
  const limitedModelIds = uniqueModelIds.slice(0, maxSelections);

  if (limitedModelIds.length > 0) {
    return limitedModelIds;
  }

  return [fallbackModelId];
}

// Supports the unit tests for preserving a valid selector state with 1 to 3 selected models.
function createModelSelectionState(initialModelIds, fallbackModelId = 'mistral', maxSelections = 3) {
  const committedModelIds = normalizeModelIds(initialModelIds, fallbackModelId, maxSelections);

  return {
    isOpen: false,
    committedModelIds,
    draftModelIds: [...committedModelIds],
    maxSelections,
  };
}

// Supports the unit test that verifies the selector opens as a modal/card with a draft copy.
function openModelSelection(state) {
  return {
    ...state,
    isOpen: true,
    draftModelIds: [...state.committedModelIds],
  };
}

// Supports the unit tests for selecting models, keeping at least one, and preventing more than three.
function toggleModelSelection(state, modelId) {
  const currentDraft = Array.isArray(state.draftModelIds) ? [...state.draftModelIds] : [];
  const selectedIndex = currentDraft.indexOf(modelId);

  if (selectedIndex >= 0) {
    if (currentDraft.length === 1) {
      return {
        ...state,
        draftModelIds: currentDraft,
      };
    }

    currentDraft.splice(selectedIndex, 1);

    return {
      ...state,
      draftModelIds: currentDraft,
    };
  }

  if (currentDraft.length >= state.maxSelections) {
    return {
      ...state,
      draftModelIds: currentDraft,
    };
  }

  return {
    ...state,
    draftModelIds: [...currentDraft, modelId],
  };
}

// Supports the unit test that verifies confirm saves the draft models and closes the selector.
function confirmModelSelection(state) {
  const committedModelIds = normalizeModelIds(
    state.draftModelIds,
    state.committedModelIds?.[0] ?? 'mistral',
    state.maxSelections
  );

  return {
    ...state,
    isOpen: false,
    committedModelIds,
    draftModelIds: [...committedModelIds],
  };
}

// Supports the unit test that verifies exiting closes the card without saving draft edits.
function closeModelSelection(state) {
  return {
    ...state,
    isOpen: false,
    draftModelIds: [...state.committedModelIds],
  };
}

module.exports = {
  closeModelSelection,
  confirmModelSelection,
  createModelSelectionState,
  openModelSelection,
  toggleModelSelection,
};
