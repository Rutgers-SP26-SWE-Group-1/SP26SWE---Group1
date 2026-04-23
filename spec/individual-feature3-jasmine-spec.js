/* eslint-disable @typescript-eslint/no-require-imports */
const {
  closeComparisonView,
  createComparisonViewState,
  getComparisonSections,
  getLatestComparisonSections,
  openComparisonView,
} = require('../src/lib/chat-ui-logic');

describe('Chat UI Logic', function () {
  const modelResponses = [
    {
      role: 'assistant',
      content: 'Mistral response text',
      modelId: 'mistral',
      modelLabel: 'Mistral',
    },
    {
      role: 'assistant',
      content: 'Llama response text',
      modelId: 'llama3.1',
      modelLabel: 'Llama 3.1',
    },
    {
      role: 'assistant',
      content: 'DeepSeek response text',
      modelId: 'deepseek',
      modelLabel: 'DeepSeek R1',
    },
  ];

  it('opens the integrated comparison view', function () {
    const state = createComparisonViewState();
    const nextState = openComparisonView(state, modelResponses);

    expect(nextState.isOpen).toBe(true);
  });

  it('places each model response in its own section', function () {
    const state = openComparisonView(createComparisonViewState(), modelResponses);
    const sections = getComparisonSections(state);

    expect(sections.length).toBe(3);
    expect(sections.map((section) => section.modelId)).toEqual([
      'mistral',
      'llama3.1',
      'deepseek',
    ]);
  });

  it('displays model names above each response', function () {
    const state = openComparisonView(createComparisonViewState(), modelResponses);
    const sections = getComparisonSections(state);

    expect(sections.map((section) => section.modelLabel)).toEqual([
      'Mistral',
      'Llama 3.1',
      'DeepSeek R1',
    ]);
  });

  it('closes the integrated comparison view', function () {
    const openState = openComparisonView(createComparisonViewState(), modelResponses);
    const nextState = closeComparisonView(openState);

    expect(nextState.isOpen).toBe(false);
  });

  it('keeps all responses visible in the comparison view', function () {
    const state = openComparisonView(createComparisonViewState(), modelResponses);
    const sections = getComparisonSections(state);

    expect(sections.map((section) => section.content)).toEqual([
      'Mistral response text',
      'Llama response text',
      'DeepSeek response text',
    ]);
  });

  it('uses only the latest group of model responses for comparison', function () {
    const sections = getLatestComparisonSections([
      {
        role: 'user',
        content: 'First question',
      },
      {
        role: 'assistant',
        content: 'Older response that should not be compared',
        modelId: 'mistral',
        modelLabel: 'Mistral',
      },
      {
        role: 'user',
        content: 'Latest question',
      },
      ...modelResponses,
    ]);

    expect(sections.map((section) => section.content)).toEqual([
      'Mistral response text',
      'Llama response text',
      'DeepSeek response text',
    ]);
  });
});
