'use client';

export type DebateMessageView = {
  id: string;
  model: string;
  role: 'opening' | 'rebuttal' | 'followup' | 'judge';
  content: string;
  timestamp: string;
  round: number;
};

type DebateMessageBubbleProps = {
  message: DebateMessageView;
  index: number;
};

const MODEL_STYLES = [
  'border-scarlet/25 bg-[rgba(204,0,51,0.08)] text-scarlet',
  'border-blue-500/25 bg-blue-500/10 text-blue-700',
  'border-emerald-500/25 bg-emerald-500/10 text-emerald-700',
  'border-amber-500/25 bg-amber-500/10 text-amber-700',
  'border-violet-500/25 bg-violet-500/10 text-violet-700',
];

function roleLabel(role: DebateMessageView['role']) {
  if (role === 'opening') return 'Opening';
  if (role === 'rebuttal') return 'Response';
  if (role === 'followup') return 'Follow-up';
  return 'Judge';
}

export default function DebateMessageBubble({ message, index }: DebateMessageBubbleProps) {
  const style = MODEL_STYLES[index % MODEL_STYLES.length];

  return (
    <article className="flex items-start gap-3">
      <div className={`mt-1 h-9 w-9 flex-shrink-0 rounded-xl border ${style} flex items-center justify-center text-xs font-black`}>
        {message.model.slice(0, 1)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <span className="text-sm font-black text-[var(--text-primary)]">{message.model}</span>
          <span className={`rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.14em] ${style}`}>
            {roleLabel(message.role)}
          </span>
        </div>
        <div className="rounded-2xl rounded-tl-sm border border-[var(--card-border)] bg-[var(--card-bg)] px-4 py-3 text-sm font-medium leading-6 text-[var(--text-primary)] shadow-[0_10px_24px_rgba(15,23,42,0.06)]">
          {message.content}
        </div>
      </div>
    </article>
  );
}
