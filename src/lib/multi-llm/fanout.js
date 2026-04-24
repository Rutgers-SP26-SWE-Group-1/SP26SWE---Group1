// Server-side fan-out. Given a list of selected model ids and a prepared
// chat-style message array, dispatch one parallel request per model and
// collect the per-model results without letting one slow/failing model
// abort the others.
//
// `requestModelResponse` is dependency-injected so Jasmine can drive this
// without a live Ollama daemon.

const { getLocalModel } = require('./localModels');
const { requestOllamaChat, OllamaUnavailableError, OllamaModelMissingError } = require('./ollamaClient');

const STATUS_FULFILLED = 'fulfilled';
const STATUS_REJECTED = 'rejected';

async function runFanout({ modelIds, promptMessages, requestModelResponse, baseUrl } = {}) {
  if (!Array.isArray(modelIds) || modelIds.length === 0) {
    throw new Error('runFanout: modelIds must be a non-empty array');
  }
  if (!Array.isArray(promptMessages) || promptMessages.length === 0) {
    throw new Error('runFanout: promptMessages must be a non-empty array');
  }

  const dispatcher = typeof requestModelResponse === 'function'
    ? requestModelResponse
    : ({ option, messages }) => requestOllamaChat({
        ollamaTag: option.ollamaTag,
        messages,
        baseUrl,
      });

  const tasks = modelIds.map((modelId) => {
    const option = getLocalModel(modelId);
    if (!option) {
      return Promise.resolve({
        modelId,
        modelLabel: modelId,
        status: STATUS_REJECTED,
        content: '',
        error: `Unknown local model id "${modelId}".`,
        durationMs: 0,
      });
    }

    const startedAt = Date.now();
    return Promise.resolve()
      .then(() => dispatcher({ option, messages: promptMessages }))
      .then((content) => ({
        modelId: option.id,
        modelLabel: option.label,
        ollamaTag: option.ollamaTag,
        status: STATUS_FULFILLED,
        content: typeof content === 'string' ? content : String(content || ''),
        durationMs: Date.now() - startedAt,
      }))
      .catch((err) => ({
        modelId: option.id,
        modelLabel: option.label,
        ollamaTag: option.ollamaTag,
        status: STATUS_REJECTED,
        content: '',
        error: describeError(err),
        durationMs: Date.now() - startedAt,
      }));
  });

  return Promise.all(tasks);
}

function describeError(err) {
  if (!err) return 'Unknown error';
  if (err instanceof OllamaModelMissingError) return err.message;
  if (err instanceof OllamaUnavailableError) return err.message;
  if (err && typeof err.message === 'string') return err.message;
  return String(err);
}

function summarizeFanout(responses) {
  const ok = responses.filter((r) => r.status === STATUS_FULFILLED).length;
  const failed = responses.length - ok;
  const totalMs = responses.reduce((acc, r) => acc + (r.durationMs || 0), 0);
  return {
    total: responses.length,
    succeeded: ok,
    failed,
    averageMs: responses.length === 0 ? 0 : Math.round(totalMs / responses.length),
  };
}

module.exports = {
  runFanout,
  summarizeFanout,
  STATUS_FULFILLED,
  STATUS_REJECTED,
};
