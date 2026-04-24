'use client';

import React, { useState } from 'react';

export type ResponseSection = {
  key: string;
  modelId?: string;
  modelLabel: string;
  family: string | null;
  ollamaTag: string | null;
  content: string;
  durationMs: number | null;
  hasError: boolean;
  errorMessage: string | null;
  orderIndex: number;
};

type ModelResponseCardProps = {
  section: ResponseSection;
  isFastest?: boolean;
};

export default function ModelResponseCard({ section, isFastest = false }: ModelResponseCardProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    if (!section.content) return;
    try {
      await navigator.clipboard.writeText(section.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (_err) {
      setCopied(false);
    }
  }

  return (
    <article
      data-testid={`model-response-card-${section.modelId || section.key}`}
      className={`flex h-full flex-col rounded-2xl border bg-white p-4 shadow-sm ${
        section.hasError ? 'border-red-200' : 'border-gray-200'
      }`}
    >
      <header className="mb-3 flex items-start justify-between gap-2">
        <div>
          <h4
            data-testid={`model-response-label-${section.modelId || section.key}`}
            className="text-sm font-semibold text-gray-900"
          >
            {section.modelLabel}
          </h4>
          {section.family || section.ollamaTag ? (
            <p className="text-[11px] text-gray-500">
              {[section.family, section.ollamaTag].filter(Boolean).join(' | ')}
            </p>
          ) : null}
        </div>
        <div className="flex flex-col items-end gap-1 text-[11px] text-gray-500">
          {typeof section.durationMs === 'number' ? (
            <span
              data-testid={`model-response-latency-${section.modelId || section.key}`}
              className={`rounded-full px-2 py-0.5 ${
                isFastest && !section.hasError
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-gray-50 text-gray-500'
              }`}
            >
              {(section.durationMs / 1000).toFixed(2)}s
              {isFastest && !section.hasError ? ' (fastest)' : ''}
            </span>
          ) : null}
          {section.hasError ? null : (
            <button
              type="button"
              onClick={handleCopy}
              className="rounded border border-gray-200 px-2 py-0.5 text-[11px] text-gray-600 hover:bg-gray-50"
            >
              {copied ? 'Copied' : 'Copy'}
            </button>
          )}
        </div>
      </header>

      {section.hasError ? (
        <p
          data-testid={`model-response-error-${section.modelId || section.key}`}
          className="rounded-md bg-red-50 p-3 text-xs text-red-700"
        >
          {section.errorMessage}
        </p>
      ) : (
        <div
          data-testid={`model-response-content-${section.modelId || section.key}`}
          className="flex-1 whitespace-pre-wrap text-sm leading-relaxed text-gray-800"
        >
          {section.content || <span className="text-gray-400">(empty response)</span>}
        </div>
      )}
    </article>
  );
}
