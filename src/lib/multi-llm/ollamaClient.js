// Thin client for the local Ollama daemon. Single responsibility:
// take a prepared message list + a model tag, return the assistant text.
//
// Cloud providers are intentionally absent. If the daemon isn't reachable we
// surface a typed OllamaUnavailableError so the fan-out can mark just that
// one model as failed without aborting the rest.

class OllamaUnavailableError extends Error {
  constructor(message, cause) {
    super(message);
    this.name = 'OllamaUnavailableError';
    if (cause) this.cause = cause;
  }
}

class OllamaModelMissingError extends Error {
  constructor(message, ollamaTag) {
    super(message);
    this.name = 'OllamaModelMissingError';
    this.ollamaTag = ollamaTag;
  }
}

const DEFAULT_BASE_URL = 'http://127.0.0.1:11434';
const DEFAULT_TIMEOUT_MS = 120000;

function resolveBaseUrl(override) {
  if (override && typeof override === 'string') return stripTrailingSlash(override);
  if (typeof process !== 'undefined' && process.env && process.env.OLLAMA_BASE_URL) {
    return stripTrailingSlash(process.env.OLLAMA_BASE_URL);
  }
  return DEFAULT_BASE_URL;
}

function stripTrailingSlash(url) {
  return url.replace(/\/+$/, '');
}

async function requestOllamaChat({ ollamaTag, messages, baseUrl, timeoutMs, fetchImpl }) {
  if (!ollamaTag || typeof ollamaTag !== 'string') {
    throw new Error('requestOllamaChat: ollamaTag is required');
  }
  if (!Array.isArray(messages) || messages.length === 0) {
    throw new Error('requestOllamaChat: messages must be a non-empty array');
  }

  const url = `${resolveBaseUrl(baseUrl)}/api/chat`;
  const fetcher = fetchImpl || (typeof fetch !== 'undefined' ? fetch : null);
  if (!fetcher) {
    throw new OllamaUnavailableError('No fetch implementation available in this runtime.');
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs || DEFAULT_TIMEOUT_MS);

  let response;
  try {
    response = await fetcher(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: ollamaTag, messages, stream: false }),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    throw new OllamaUnavailableError(
      `Ollama daemon unreachable at ${url}. Is "ollama serve" running?`,
      err,
    );
  }
  clearTimeout(timer);

  if (response.status === 404) {
    throw new OllamaModelMissingError(
      `Ollama model "${ollamaTag}" is not pulled. Run: ollama pull ${ollamaTag}`,
      ollamaTag,
    );
  }

  if (!response.ok) {
    const text = await safeReadText(response);
    throw new OllamaUnavailableError(
      `Ollama responded ${response.status} for "${ollamaTag}": ${text || response.statusText}`,
    );
  }

  const data = await response.json();
  const content = data && data.message && typeof data.message.content === 'string'
    ? data.message.content
    : '';

  return content.trim();
}

async function safeReadText(response) {
  try {
    return await response.text();
  } catch (_err) {
    return '';
  }
}

module.exports = {
  requestOllamaChat,
  OllamaUnavailableError,
  OllamaModelMissingError,
  DEFAULT_BASE_URL,
};
