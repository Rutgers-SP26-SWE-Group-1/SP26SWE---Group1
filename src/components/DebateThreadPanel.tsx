'use client';

import { type FormEvent, useMemo, useState } from 'react';
import DebateMessageBubble, { type DebateMessageView } from '@/components/DebateMessageBubble';
import DebateVerdictCard, { type DebateVerdictView } from '@/components/DebateVerdictCard';
import { getChatModelOption } from '@/lib/chat-models';

export type DebateThreadView = {
  id: string;
  originalQuestion: string;
  selectedModels: string[];
  contextUsed: string;
  depth: 'quick' | 'standard' | 'deep';
  maxRounds: number;
  completedRounds: number;
  messages: DebateMessageView[];
  verdict: DebateVerdictView;
};

type DebateThreadPanelProps = {
  thread: DebateThreadView | null;
  open: boolean;
  isSending?: boolean;
  onClose: () => void;
  onFollowUp: (message: string) => Promise<void> | void;
};

export default function DebateThreadPanel({
  thread,
  open,
  isSending = false,
  onClose,
  onFollowUp,
}: DebateThreadPanelProps) {
  const [followUp, setFollowUp] = useState('');
  const modelLabels = useMemo(
    () => thread?.selectedModels.map((modelId) => getChatModelOption(modelId).label).join(' vs ') ?? '',
    [thread?.selectedModels]
  );
  const groupedMessages = useMemo(() => {
    const groups = new Map<number, DebateMessageView[]>();
    for (const message of thread?.messages ?? []) {
      const round = message.round || 1;
      groups.set(round, [...(groups.get(round) ?? []), message]);
    }
    return Array.from(groups.entries()).sort(([roundA], [roundB]) => roundA - roundB);
  }, [thread?.messages]);

  if (!open || !thread) {
    return null;
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = followUp.trim();
    if (!trimmed || isSending) return;
    setFollowUp('');
    await onFollowUp(trimmed);
  };

  const modelOrder = new Map(modelLabels.split(' vs ').map((model, index) => [model, index]));
  const roundLabels: Record<number, string> = {
    1: 'Opening Arguments',
    2: 'First Rebuttal',
    3: 'Response',
    4: 'Refinement',
    5: 'Final Position',
    6: 'Additional Clarification',
    7: 'Closing Position',
  };

  return (
    <div className="fixed inset-0 z-[90] bg-black/25 backdrop-blur-sm">
      <section
        data-testid="debate-thread-panel"
        className="absolute bottom-4 right-4 top-4 flex w-[min(760px,calc(100vw-2rem))] flex-col overflow-hidden rounded-3xl border border-[var(--card-border)] bg-[var(--app-bg)] shadow-[0_24px_80px_rgba(15,23,42,0.24)]"
      >
        <header className="border-b border-[var(--card-border)] bg-[var(--card-bg)] px-5 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-scarlet">
                Debate Thread
              </p>
              <h2 className="mt-1 line-clamp-2 text-lg font-black text-[var(--text-primary)]">
                {thread.originalQuestion}
              </h2>
              <div className="mt-2 flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-[0.14em] text-[var(--text-muted)]">
                <span className="rounded-full border border-[var(--card-border)] bg-[var(--surface-soft)] px-2.5 py-1">
                  Models: {modelLabels}
                </span>
                <span className="rounded-full border border-[var(--card-border)] bg-[var(--surface-soft)] px-2.5 py-1">
                  Context used: {thread.contextUsed}
                </span>
                <span className="rounded-full border border-[var(--card-border)] bg-[var(--surface-soft)] px-2.5 py-1">
                  Depth: {thread.depth} · {thread.completedRounds}/{thread.maxRounds} rounds
                </span>
                {thread.verdict.reachedRound && (
                  <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-emerald-700">
                    Consensus reached in Round {thread.verdict.reachedRound}
                  </span>
                )}
              </div>
            </div>
            <button
              type="button"
              aria-label="Close debate thread"
              onClick={onClose}
              className="rounded-xl border border-[var(--card-border)] bg-[var(--surface-soft)] px-3 py-2 text-xs font-black text-[var(--text-secondary)] transition-colors hover:border-scarlet hover:text-scarlet"
            >
              Close
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          <div className="mb-5 rounded-2xl border border-[var(--card-border)] bg-[var(--surface-soft)] px-4 py-3">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--text-muted)]">
              Original question
            </p>
            <p className="mt-1 text-sm font-semibold leading-6 text-[var(--text-primary)]">
              {thread.originalQuestion}
            </p>
          </div>

          <div className="space-y-7">
            {groupedMessages.map(([round, messages]) => (
              <section key={round} className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-px flex-1 bg-[var(--card-border)]" />
                  <p className="rounded-full border border-[var(--card-border)] bg-[var(--card-bg)] px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-[var(--text-muted)]">
                    {messages.every((message) => message.role === 'followup')
                      ? 'Follow-up'
                      : `Round ${round}: ${roundLabels[round] ?? 'Response'}`}
                  </p>
                  <div className="h-px flex-1 bg-[var(--card-border)]" />
                </div>
                {messages.map((message) => (
                  <DebateMessageBubble
                    key={message.id}
                    message={message}
                    index={modelOrder.get(message.model) ?? 0}
                  />
                ))}
              </section>
            ))}
          </div>
        </div>

        <div className="border-t border-[var(--card-border)] bg-[var(--card-bg)] p-4">
          <DebateVerdictCard verdict={thread.verdict} />
          <form onSubmit={handleSubmit} className="mt-4 flex gap-3">
            <input
              value={followUp}
              onChange={(event) => setFollowUp(event.target.value)}
              placeholder="Ask both models a follow-up..."
              className="min-w-0 flex-1 rounded-2xl border border-[var(--input-border)] bg-[var(--input-bg)] px-4 py-3 text-sm font-semibold text-[var(--text-primary)] outline-none placeholder:text-[var(--input-placeholder)] focus:border-scarlet"
            />
            <button
              type="submit"
              disabled={isSending || !followUp.trim()}
              className="rounded-2xl bg-scarlet px-4 py-3 text-[10px] font-black uppercase tracking-[0.16em] text-white shadow-md transition-all hover:bg-[#990026] disabled:opacity-50"
            >
              {isSending ? 'Asking' : 'Ask'}
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
