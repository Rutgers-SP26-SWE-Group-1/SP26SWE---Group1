'use client';

import React from 'react';
import ModelResponseCard, { ResponseSection } from './ModelResponseCard';
import {
  buildGridSections,
  gridColumnCount,
  pickFastestSection,
} from '@/lib/multi-llm/grid';

export type FanoutResponse = {
  modelId?: string;
  modelLabel?: string;
  ollamaTag?: string;
  status?: 'fulfilled' | 'rejected';
  content?: string;
  error?: string;
  durationMs?: number;
};

type MultiResponseGridProps = {
  responses: FanoutResponse[];
  prompt?: string;
  totalDurationMs?: number;
};

export default function MultiResponseGrid({
  responses,
  prompt,
  totalDurationMs,
}: MultiResponseGridProps) {
  const sections = buildGridSections(responses) as ResponseSection[];

  if (sections.length === 0) {
    return (
      <div
        data-testid="multi-response-grid-empty"
        className="rounded-2xl border border-dashed border-gray-300 bg-white p-6 text-center text-sm text-gray-500"
      >
        No model responses yet. Pick at least one local model and ask a question.
      </div>
    );
  }

  const fastest = pickFastestSection(sections);
  const columns = gridColumnCount(sections.length);
  const gridClass = columns === 1
    ? 'grid grid-cols-1 gap-3'
    : columns === 2
      ? 'grid grid-cols-1 gap-3 md:grid-cols-2'
      : 'grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3';

  return (
    <section
      data-testid="multi-response-grid"
      className="rounded-2xl border border-gray-200 bg-gray-50 p-3"
    >
      <header className="mb-3 flex flex-wrap items-baseline justify-between gap-2 px-1">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">
            {sections.length} local model{sections.length === 1 ? '' : 's'} answered
          </h3>
          {prompt ? (
            <p className="line-clamp-1 max-w-xl text-[11px] text-gray-500" title={prompt}>
              Prompt: {prompt}
            </p>
          ) : null}
        </div>
        {typeof totalDurationMs === 'number' ? (
          <p
            data-testid="multi-response-total-duration"
            className="text-[11px] text-gray-500"
          >
            wall-clock {(totalDurationMs / 1000).toFixed(2)}s
          </p>
        ) : null}
      </header>

      <div className={gridClass}>
        {sections.map((section) => (
          <ModelResponseCard
            key={section.key}
            section={section}
            isFastest={fastest ? section.key === fastest.key : false}
          />
        ))}
      </div>
    </section>
  );
}
