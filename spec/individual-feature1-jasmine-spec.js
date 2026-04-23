/* eslint-disable @typescript-eslint/no-require-imports */
let modelSelectorLogic;

try {
  modelSelectorLogic = require('../src/lib/chat-model-selector');
} catch {
  modelSelectorLogic = null;
}

function requireSelectorLogic() {
  if (!modelSelectorLogic) {
    fail(
      'Expected src/lib/chat-model-selector.js to exist with selector state helpers before these tests can pass.'
    );

    return null;
  }

  return modelSelectorLogic;
}

describe('Chat Model Selector Logic', function () {
  const initialState = {
    isOpen: false,
    committedModelIds: ['mistral'],
    draftModelIds: ['mistral'],
    maxSelections: 3,
  };

  // Tests that the selector opens into a modal/card state the UI can render.
  it('opens the model selection modal', function () {
    const selectorLogic = requireSelectorLogic();
    if (!selectorLogic) return;
    const { openModelSelection } = selectorLogic;

    const nextState = openModelSelection(initialState);

    expect(nextState.isOpen).toBe(true);
    expect(nextState.draftModelIds).toEqual(['mistral']);
  });

  // Tests that the user must always keep at least one model selected.
  it('does not allow the user to deselect the last remaining model', function () {
    const selectorLogic = requireSelectorLogic();
    if (!selectorLogic) return;
    const { toggleModelSelection } = selectorLogic;

    const nextState = toggleModelSelection(initialState, 'mistral');

    expect(nextState.draftModelIds).toEqual(['mistral']);
  });

  // Tests that the user can add models to the draft selection before confirming.
  it('allows the user to select additional models', function () {
    const selectorLogic = requireSelectorLogic();
    if (!selectorLogic) return;
    const { toggleModelSelection } = selectorLogic;

    const nextState = toggleModelSelection(initialState, 'llama3.1');

    expect(nextState.draftModelIds).toEqual(['mistral', 'llama3.1']);
  });

  // Tests that the selector enforces the three-model maximum.
  it('does not allow the user to select more than three models', function () {
    const selectorLogic = requireSelectorLogic();
    if (!selectorLogic) return;
    const { toggleModelSelection } = selectorLogic;

    const twoSelectedState = {
      ...initialState,
      draftModelIds: ['mistral', 'llama3.1', 'deepseek'],
    };

    const nextState = toggleModelSelection(twoSelectedState, 'qwen-coder');

    expect(nextState.draftModelIds).toEqual(['mistral', 'llama3.1', 'deepseek']);
  });

  // Tests that confirm saves the draft selection as the active saved selection.
  it('saves the selected models when the user confirms', function () {
    const selectorLogic = requireSelectorLogic();
    if (!selectorLogic) return;
    const { confirmModelSelection } = selectorLogic;

    const openState = {
      ...initialState,
      isOpen: true,
      draftModelIds: ['mistral', 'llama3.1', 'deepseek'],
    };

    const nextState = confirmModelSelection(openState);

    expect(nextState.isOpen).toBe(false);
    expect(nextState.committedModelIds).toEqual(['mistral', 'llama3.1', 'deepseek']);
  });

  // Tests that closing with the X exits the card without saving the current draft edits.
  it('closes the selector card without saving when the user exits', function () {
    const selectorLogic = requireSelectorLogic();
    if (!selectorLogic) return;
    const { closeModelSelection } = selectorLogic;

    const openState = {
      ...initialState,
      isOpen: true,
      draftModelIds: ['mistral', 'llama3.1'],
    };

    const nextState = closeModelSelection(openState);

    expect(nextState.isOpen).toBe(false);
    expect(nextState.committedModelIds).toEqual(['mistral']);
    expect(nextState.draftModelIds).toEqual(['mistral']);
  });
});
