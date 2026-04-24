function buildDefaultModelSelection(chatModelOptions, limit = 3) {
  return chatModelOptions.slice(0, limit).map((model) => model.id);
}

function sanitizeSelectedModelIds(value, chatModelOptions, limit = 3) {
  const defaultSelection = buildDefaultModelSelection(chatModelOptions, limit);
  const requestedIds = Array.isArray(value)
    ? value.filter((item) => typeof item === 'string')
    : [];
  const availableIds = new Set(chatModelOptions.map((model) => model.id));
  const uniqueIds = requestedIds.filter(
    (modelId, index) => availableIds.has(modelId) && requestedIds.indexOf(modelId) === index
  );

  for (const fallbackId of defaultSelection) {
    if (uniqueIds.length >= limit) {
      break;
    }

    if (!uniqueIds.includes(fallbackId)) {
      uniqueIds.push(fallbackId);
    }
  }

  return uniqueIds.slice(0, limit);
}

function updateSelectedModelSlot(currentModelIds, slotIndex, nextModelId, chatModelOptions, limit = 3) {
  const normalizedIds = sanitizeSelectedModelIds(currentModelIds, chatModelOptions, limit);
  const nextIds = [...normalizedIds];
  nextIds[slotIndex] = nextModelId;

  const usedIds = new Set([nextModelId]);
  const availableIds = chatModelOptions.map((model) => model.id);

  for (let index = 0; index < nextIds.length; index += 1) {
    if (index === slotIndex) {
      continue;
    }

    if (!usedIds.has(nextIds[index])) {
      usedIds.add(nextIds[index]);
      continue;
    }

    const replacementId = availableIds.find((candidateId) => !usedIds.has(candidateId));
    if (replacementId) {
      nextIds[index] = replacementId;
      usedIds.add(replacementId);
    }
  }

  return nextIds;
}

function sanitizeSingleModelId(value, chatModelOptions) {
  const requestedModelId = typeof value === 'string' ? value : '';
  return chatModelOptions.some((model) => model.id === requestedModelId)
    ? requestedModelId
    : chatModelOptions[0].id;
}

function sanitizeChatMode(value) {
  return value === 'compare' ? 'compare' : 'single';
}

module.exports = {
  buildDefaultModelSelection,
  sanitizeSelectedModelIds,
  updateSelectedModelSlot,
  sanitizeSingleModelId,
  sanitizeChatMode,
};
