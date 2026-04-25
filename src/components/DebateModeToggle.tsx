'use client';

type DebateModeToggleProps = {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
};

export default function DebateModeToggle({ enabled, onChange }: DebateModeToggleProps) {
  return (
    <button
      type="button"
      aria-label="Debate Mode"
      aria-pressed={enabled}
      data-testid="debate-mode-toggle"
      onClick={() => onChange(!enabled)}
      className={`inline-flex items-center gap-3 rounded-xl border px-4 py-2.5 transition-colors ${
        enabled
          ? 'border-scarlet/40 bg-[rgba(204,0,51,0.08)] text-scarlet'
          : 'border-[var(--card-border)] bg-[var(--card-bg)] text-[var(--text-secondary)]'
      }`}
    >
      <span className="flex flex-col text-left leading-tight">
        <span className="text-[10px] font-black uppercase tracking-widest">Debate Mode</span>
        <span className="text-[10px] font-semibold normal-case opacity-80">
          {enabled ? 'Models compare arguments' : 'Let models debate first'}
        </span>
      </span>
    </button>
  );
}
