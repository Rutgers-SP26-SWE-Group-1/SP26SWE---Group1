function resolveRequestedModels(
  modelIds,
  fallbackModelId,
  chatModelOptions,
  getChatModelOption,
  maxCompareModels = 3
) {
  const chatModelMap = new Map(chatModelOptions.map((model) => [model.id, model]));
  const requestedIds = Array.isArray(modelIds)
    ? modelIds
    : typeof fallbackModelId === 'string'
      ? [fallbackModelId]
      : [];

  const resolvedModels = requestedIds
    .filter((modelId) => typeof modelId === 'string')
    .map((modelId) => chatModelMap.get(modelId))
    .filter(Boolean)
    .filter(
      (model, index, models) => models.findIndex((candidate) => candidate.id === model.id) === index
    )
    .slice(0, maxCompareModels);

  if (resolvedModels.length > 0) {
    return resolvedModels;
  }

  if (typeof fallbackModelId === 'string' && chatModelMap.has(fallbackModelId)) {
    return [getChatModelOption(fallbackModelId)];
  }

  return chatModelOptions.slice(0, maxCompareModels);
}

function buildModelErrorResponse(selectedModel, message) {
  return {
    content: `${selectedModel.label} could not respond right now.\n\n${message}`,
    durationMs: 0,
    isError: true,
    modelDescription: selectedModel.details,
    modelId: selectedModel.id,
    modelLabel: selectedModel.label,
  };
}

function selectPrimaryResponse(responses) {
  if (!Array.isArray(responses) || responses.length === 0) {
    return null;
  }

  return responses.find((response) => !response.isError) ?? responses[0];
}

module.exports = {
  buildModelErrorResponse,
  resolveRequestedModels,
  selectPrimaryResponse,
};
