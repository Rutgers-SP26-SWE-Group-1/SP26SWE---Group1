'use client';

export type DebateVerdictView = {
  status: 'consensus' | 'consensus_with_caveats' | 'no_consensus' | 'still_debating';
  summary: string;
  modelPositions: Record<string, string>;
  reachedRound?: number;
};

type DebateVerdictCardProps = {
  verdict: DebateVerdictView;
};

export default function DebateVerdictCard({ verdict }: DebateVerdictCardProps) {
  const isConsensus = verdict.status === 'consensus' || verdict.status === 'consensus_with_caveats';
  const title =
    verdict.status === 'consensus'
      ? 'Consensus'
      : verdict.status === 'consensus_with_caveats'
        ? 'Consensus with caveats'
        : verdict.status === 'still_debating'
          ? 'Still debating'
          : 'No consensus';

  return (
    <aside className="rounded-2xl border border-[var(--card-border)] bg-[var(--surface-soft)] p-4 shadow-[0_12px_26px_rgba(15,23,42,0.06)]">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h3 className="text-xs font-black uppercase tracking-[0.18em] text-[var(--text-muted)]">
          {title}
        </h3>
        <span
          className={`rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em] ${
            isConsensus
              ? 'bg-emerald-500/10 text-emerald-700'
              : 'bg-amber-500/10 text-amber-700'
          }`}
        >
          Verdict
        </span>
      </div>
      <p className="text-sm font-semibold leading-6 text-[var(--text-primary)]">{verdict.summary}</p>
      {Object.keys(verdict.modelPositions).length > 0 && (
        <div className="mt-3 space-y-2">
          {Object.entries(verdict.modelPositions).map(([model, position]) => (
            <p key={model} className="text-xs font-medium leading-5 text-[var(--text-secondary)]">
              <span className="font-black text-[var(--text-primary)]">{model}:</span> {position}
            </p>
          ))}
        </div>
      )}
    </aside>
  );
}
