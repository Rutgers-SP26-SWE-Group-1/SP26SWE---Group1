'use client';

import type { ChatModelOption } from '@/lib/chat-models';

type ModelDebatePanelProps = {
  enabled: boolean;
  models: ChatModelOption[];
  selectedModelIds: string[];
  debateDepth?: 'quick' | 'standard' | 'deep';
  onChange: (modelIds: string[]) => void;
  onDepthChange?: (depth: 'quick' | 'standard' | 'deep') => void;
};

export default function ModelDebatePanel({
  enabled,
  models,
  selectedModelIds,
  debateDepth = 'standard',
  onChange,
  onDepthChange,
}: ModelDebatePanelProps) {
  if (!enabled) {
    return null;
  }

  const toggleModel = (modelId: string) => {
    const isSelected = selectedModelIds.includes(modelId);
    const nextSelection = isSelected
      ? selectedModelIds.filter((id) => id !== modelId)
      : [...selectedModelIds, modelId].slice(0, 5);

    if (nextSelection.length >= 2) {
      onChange(nextSelection);
    } else if (!isSelected) {
      onChange(nextSelection);
    }
  };

  return (
    <div
      data-testid="debate-model-panel"
      className="flex flex-wrap items-center gap-2 border-t border-[var(--input-border)] px-4 py-3"
    >
      <span className="text-[9px] font-black uppercase tracking-[0.16em] text-[var(--text-muted)]">
        Debate models
      </span>
      {models.map((model) => {
        const checked = selectedModelIds.includes(model.id);

        return (
          <label
            key={model.id}
            className={`cursor-pointer rounded-lg border px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wider transition-colors ${
              checked
                ? 'border-scarlet/40 bg-[rgba(204,0,51,0.08)] text-scarlet'
                : 'border-[var(--card-border)] bg-[var(--card-bg)] text-[var(--text-secondary)]'
            }`}
          >
            <input
              type="checkbox"
              className="sr-only"
              checked={checked}
              onChange={() => toggleModel(model.id)}
            />
            {model.label}
          </label>
        );
      })}
      {onDepthChange && (
        <div className="ml-auto flex items-center gap-1 rounded-xl border border-[var(--card-border)] bg-[var(--surface-soft)] p-1">
          {[
            { id: 'quick', label: 'Quick', rounds: '3' },
            { id: 'standard', label: 'Standard', rounds: '5' },
            { id: 'deep', label: 'Deep', rounds: '7' },
          ].map((option) => (
            <button
              key={option.id}
              type="button"
              title={`${option.label} debate, ${option.rounds} rounds max`}
              onClick={() => onDepthChange(option.id as 'quick' | 'standard' | 'deep')}
              className={`rounded-lg px-2.5 py-1.5 text-[9px] font-black uppercase tracking-wider transition-colors ${
                debateDepth === option.id
                  ? 'bg-[var(--card-bg)] text-scarlet shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
