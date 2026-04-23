function getNextTheme(currentTheme) {
  return currentTheme === 'dark' ? 'light' : 'dark';
}

function buildSearchPreview(text, query, maxLength = 80) {
  const normalizedText = String(text).toLowerCase();
  const normalizedQuery = String(query).toLowerCase();
  const matchIndex = normalizedText.indexOf(normalizedQuery);

  if (matchIndex === -1) {
    return String(text).slice(0, maxLength).trim();
  }

  const previewStart = Math.max(0, matchIndex - 24);
  const previewEnd = Math.min(String(text).length, matchIndex + normalizedQuery.length + 40);
  const excerpt = String(text).slice(previewStart, previewEnd).trim();

  const prefix = previewStart > 0 ? '...' : '';
  const suffix = previewEnd < String(text).length ? '...' : '';

  return `${prefix}${excerpt}${suffix}`;
}

function searchConversations(conversations, searchQuery) {
  const normalizedSearchQuery = String(searchQuery ?? '').trim().toLowerCase();

  return conversations
    .map((conversation) => {
      if (!normalizedSearchQuery) {
        return {
          conversation,
          preview: new Date(conversation.updatedAt).toLocaleString([], {
            dateStyle: 'short',
            timeStyle: 'short',
          }),
          matchType: 'title',
          rank: 0,
        };
      }

      const normalizedTitle = conversation.title.toLowerCase();
      const titleIndex = normalizedTitle.indexOf(normalizedSearchQuery);

      if (titleIndex !== -1) {
        return {
          conversation,
          preview: `Title match: ${buildSearchPreview(conversation.title, normalizedSearchQuery, 60)}`,
          matchType: 'title',
          rank: titleIndex,
        };
      }

      const matchingMessage = conversation.messages.find((message) =>
        message.content.toLowerCase().includes(normalizedSearchQuery)
      );

      if (!matchingMessage) {
        return null;
      }

      const messageIndex = matchingMessage.content.toLowerCase().indexOf(normalizedSearchQuery);

      return {
        conversation,
        preview: buildSearchPreview(matchingMessage.content, normalizedSearchQuery),
        matchType: 'message',
        rank: messageIndex + 1000,
      };
    })
    .filter(Boolean)
    .sort((a, b) => {
      if (normalizedSearchQuery && a.matchType !== b.matchType) {
        return a.matchType === 'title' ? -1 : 1;
      }

      if (normalizedSearchQuery && a.rank !== b.rank) {
        return a.rank - b.rank;
      }

      return new Date(b.conversation.updatedAt).getTime() - new Date(a.conversation.updatedAt).getTime();
    });
}

function resolveModelSelection(modelId, options, defaultModel) {
  return options.find((model) => model.id === modelId) ?? defaultModel;
}

function normalizeComparisonSections(responses) {
  if (!Array.isArray(responses)) {
    return [];
  }

  return responses
    .filter(
      (response) =>
        response &&
        typeof response.content === 'string' &&
        (response.role === undefined || response.role === 'assistant')
    )
    .map((response, index) => ({
      id: response.modelId || `model-response-${index}`,
      modelId: response.modelId || `model-response-${index}`,
      modelLabel: response.modelLabel || 'Unknown Model',
      content: response.content,
      modelDescription: response.modelDescription || '',
      durationMs: response.durationMs,
    }))
    .filter((section) => section.content.trim().length > 0);
}

function createComparisonViewState(initialResponses = []) {
  return {
    isOpen: false,
    sections: normalizeComparisonSections(initialResponses),
  };
}

function openComparisonView(state, responses) {
  return {
    ...state,
    isOpen: true,
    sections: normalizeComparisonSections(responses),
  };
}

function closeComparisonView(state) {
  return {
    ...state,
    isOpen: false,
  };
}

function getComparisonSections(state) {
  return Array.isArray(state?.sections) ? state.sections : [];
}

function getLatestComparisonSections(messages) {
  if (!Array.isArray(messages)) {
    return [];
  }

  const latestResponses = [];

  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];

    if (!message || message.role !== 'assistant') {
      break;
    }

    latestResponses.unshift(message);
  }

  return normalizeComparisonSections(latestResponses);
}

module.exports = {
  buildSearchPreview,
  closeComparisonView,
  createComparisonViewState,
  getComparisonSections,
  getLatestComparisonSections,
  getNextTheme,
  openComparisonView,
  resolveModelSelection,
  searchConversations,
};
