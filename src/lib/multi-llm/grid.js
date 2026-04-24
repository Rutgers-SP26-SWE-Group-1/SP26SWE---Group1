// Pure helpers used by the inline MultiResponseGrid React component.
// Kept as plain JS so Jasmine can verify ordering, labelling, and the
// empty-state path without rendering anything.

const { getLocalModel } = require('./localModels');

function buildGridSections(responses) {
  if (!Array.isArray(responses) || responses.length === 0) {
    return [];
  }

  return responses.map((response, index) => {
    const option = getLocalModel(response.modelId);
    const fallbackLabel = response.modelLabel || response.modelId || `Model ${index + 1}`;
    return {
      key: `${response.modelId || 'unknown'}-${index}`,
      modelId: response.modelId,
      modelLabel: option ? option.label : fallbackLabel,
      family: option ? option.family : null,
      ollamaTag: option ? option.ollamaTag : response.ollamaTag || null,
      content: typeof response.content === 'string' ? response.content : '',
      durationMs: typeof response.durationMs === 'number' ? response.durationMs : null,
      hasError: response.status === 'rejected',
      errorMessage: response.status === 'rejected' ? (response.error || 'Unknown error') : null,
      orderIndex: index,
    };
  });
}

function pickFastestSection(sections) {
  const successful = sections.filter((s) => !s.hasError && typeof s.durationMs === 'number');
  if (successful.length === 0) return null;
  return successful.reduce((fastest, current) =>
    current.durationMs < fastest.durationMs ? current : fastest,
  );
}

function gridColumnCount(sectionCount) {
  if (sectionCount <= 1) return 1;
  if (sectionCount === 2) return 2;
  return 3;
}

module.exports = {
  buildGridSections,
  pickFastestSection,
  gridColumnCount,
};
