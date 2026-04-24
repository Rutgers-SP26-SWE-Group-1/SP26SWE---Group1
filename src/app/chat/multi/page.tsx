'use client';

// Partha's individual iteration feature page.
//
// Lives at /chat/multi so it does not collide with the shared /chat hub
// (which other teammates' tests rely on). Single prompt -> fan-out to all
// locally selected Ollama models -> inline side-by-side grid of answers.

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import MultiModelDropdown from '@/components/multi/MultiModelDropdown';
import MultiResponseGrid, { FanoutResponse } from '@/components/multi/MultiResponseGrid';
import { LOCAL_OLLAMA_MODELS, isLocalModelId } from '@/lib/multi-llm/localModels';

const STORAGE_KEY = 'scarlet-ai-multi-llm-selection';
const MAX_PROMPT_LENGTH = 2000;

type MultiTurn = {
  id: string;
  prompt: string;
  responses: FanoutResponse[];
  totalDurationMs: number;
  selectedModelIds: string[];
  createdAt: string;
};

function defaultSelection(): string[] {
  return [
    LOCAL_OLLAMA_MODELS[0].id,
    LOCAL_OLLAMA_MODELS[1].id,
    LOCAL_OLLAMA_MODELS[3].id,
  ];
}

function loadStoredSelection(): string[] | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    const cleaned = parsed.filter((id) => typeof id === 'string' && isLocalModelId(id));
    return cleaned.length > 0 ? cleaned : null;
  } catch (_err) {
    return null;
  }
}

function persistSelection(ids: string[]) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch (_err) {
    // localStorage may be disabled in private browsing; non-fatal.
  }
}

function newTurnId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `turn-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function MultiLlmChatPage() {
  const [selectedModelIds, setSelectedModelIds] = useState<string[]>(() => defaultSelection());
  const [prompt, setPrompt] = useState('');
  const [turns, setTurns] = useState<MultiTurn[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const stored = loadStoredSelection();
    if (stored) {
      setSelectedModelIds(stored);
    }
  }, []);

  useEffect(() => {
    persistSelection(selectedModelIds);
  }, [selectedModelIds]);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [turns.length]);

  const trimmedPrompt = prompt.trim();
  const canSubmit = !isSending
    && trimmedPrompt.length > 0
    && trimmedPrompt.length <= MAX_PROMPT_LENGTH
    && selectedModelIds.length > 0;

  const promptHistoryForApi = useMemo(() => {
    const history: Array<{ role: 'user' | 'assistant'; content: string }> = [];
    for (const turn of turns) {
      history.push({ role: 'user', content: turn.prompt });
      const firstSuccessful = turn.responses.find((r) => r.status === 'fulfilled' && r.content);
      if (firstSuccessful && firstSuccessful.content) {
        history.push({ role: 'assistant', content: firstSuccessful.content });
      }
    }
    return history;
  }, [turns]);

  async function handleSubmit(event?: React.FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    if (!canSubmit) return;

    const submittedPrompt = trimmedPrompt;
    setIsSending(true);
    setErrorMessage(null);

    try {
      const response = await fetch('/api/chat/fanout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: submittedPrompt,
          modelIds: selectedModelIds,
          messages: promptHistoryForApi,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || `Fan-out failed (${response.status})`);
      }

      const turn: MultiTurn = {
        id: newTurnId(),
        prompt: submittedPrompt,
        responses: Array.isArray(payload.responses) ? payload.responses : [],
        totalDurationMs: typeof payload.totalDurationMs === 'number' ? payload.totalDurationMs : 0,
        selectedModelIds: [...selectedModelIds],
        createdAt: typeof payload.timestamp === 'string' ? payload.timestamp : new Date().toISOString(),
      };

      setTurns((prev) => [...prev, turn]);
      setPrompt('');
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Unknown error during fan-out.');
    } finally {
      setIsSending(false);
    }
  }

  function handleClearTranscript() {
    if (isSending) return;
    setTurns([]);
    setErrorMessage(null);
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-4 px-4 py-6">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-200 pb-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#cc0033]">
            Individual iteration | parthaped
          </p>
          <h1 className="text-2xl font-bold text-gray-900">Multi-LLM compare (local Ollama only)</h1>
          <p className="mt-1 text-sm text-gray-600">
            Ask one question, fan it out to up to four local models, see every answer side by side.
          </p>
        </div>
        <nav className="flex items-center gap-2 text-sm">
          <Link
            href="/chat"
            className="rounded-full border border-gray-200 px-3 py-1.5 text-gray-700 hover:bg-gray-50"
          >
            Back to single-model chat
          </Link>
        </nav>
      </header>

      <section className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">Local models</span>
          <MultiModelDropdown
            selectedModelIds={selectedModelIds}
            onChange={setSelectedModelIds}
            disabled={isSending}
          />
        </div>
        <button
          type="button"
          onClick={handleClearTranscript}
          disabled={isSending || turns.length === 0}
          className="rounded-full border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Clear transcript
        </button>
      </section>

      <section
        data-testid="multi-transcript"
        className="flex min-h-[16rem] flex-1 flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-4"
      >
        {turns.length === 0 ? (
          <div className="flex flex-1 items-center justify-center text-sm text-gray-500">
            Pick at least one local model and ask a question to see the side-by-side comparison.
          </div>
        ) : (
          turns.map((turn) => (
            <article
              key={turn.id}
              data-testid={`multi-turn-${turn.id}`}
              className="flex flex-col gap-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="rounded-2xl bg-[#cc0033] px-3 py-2 text-sm font-medium text-white">
                  {turn.prompt}
                </p>
                <span className="text-[11px] text-gray-400">
                  {new Date(turn.createdAt).toLocaleTimeString()}
                </span>
              </div>
              <MultiResponseGrid
                responses={turn.responses}
                prompt={turn.prompt}
                totalDurationMs={turn.totalDurationMs}
              />
            </article>
          ))
        )}
        <div ref={transcriptEndRef} />
      </section>

      {errorMessage ? (
        <div
          data-testid="multi-error-banner"
          className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {errorMessage}
        </div>
      ) : null}

      <form
        data-testid="multi-composer"
        onSubmit={handleSubmit}
        className="flex flex-col gap-2 rounded-2xl border border-gray-200 bg-white p-3"
      >
        <textarea
          data-testid="multi-prompt-input"
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          rows={3}
          maxLength={MAX_PROMPT_LENGTH}
          placeholder="Ask one question; every selected local model will answer in parallel."
          disabled={isSending}
          className="w-full resize-none rounded-md border border-gray-200 p-2 text-sm focus:border-[#cc0033] focus:outline-none focus:ring-1 focus:ring-[#cc0033]"
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              void handleSubmit();
            }
          }}
        />
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] text-gray-400">
            {trimmedPrompt.length}/{MAX_PROMPT_LENGTH} | {selectedModelIds.length} model
            {selectedModelIds.length === 1 ? '' : 's'} selected
          </p>
          <button
            type="submit"
            data-testid="multi-send-button"
            disabled={!canSubmit}
            className="rounded-full bg-[#cc0033] px-4 py-1.5 text-sm font-semibold text-white hover:bg-[#a3002a] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSending ? 'Asking models...' : 'Ask all selected'}
          </button>
        </div>
      </form>
    </main>
  );
}
