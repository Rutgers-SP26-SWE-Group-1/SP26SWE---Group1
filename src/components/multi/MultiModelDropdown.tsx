'use client';

import React, { useEffect, useRef, useState } from 'react';
import { LOCAL_OLLAMA_MODELS, getLocalModel } from '@/lib/multi-llm/localModels';
import {
  MAX_MODELS,
  MIN_MODELS,
  canSelectMore,
  closeDropdown,
  createSelectionState,
  openDropdown,
  selectionCount,
  toggleModel,
} from '@/lib/multi-llm/selection';

type LocalModel = {
  id: string;
  label: string;
  ollamaTag: string;
  family: string;
  blurb: string;
  sizeMb: number;
};

type SelectionState = {
  isOpen: boolean;
  selectedModelIds: string[];
};

type MultiModelDropdownProps = {
  selectedModelIds: string[];
  onChange: (nextIds: string[]) => void;
  disabled?: boolean;
};

export default function MultiModelDropdown({
  selectedModelIds,
  onChange,
  disabled = false,
}: MultiModelDropdownProps) {
  const [state, setState] = useState<SelectionState>(() =>
    createSelectionState(selectedModelIds),
  );
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setState((prev) => {
      const sameLength = prev.selectedModelIds.length === selectedModelIds.length;
      const sameOrder = sameLength
        && prev.selectedModelIds.every((id, i) => id === selectedModelIds[i]);
      return sameOrder ? prev : { ...prev, selectedModelIds: [...selectedModelIds] };
    });
  }, [selectedModelIds]);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (!wrapperRef.current) return;
      if (wrapperRef.current.contains(event.target as Node)) return;
      setState((prev) => (prev.isOpen ? closeDropdown(prev) : prev));
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function handleToggleOpen() {
    if (disabled) return;
    setState((prev) => (prev.isOpen ? closeDropdown(prev) : openDropdown(prev)));
  }

  function handleToggleModel(modelId: string) {
    setState((prev) => {
      const next = toggleModel(prev, modelId);
      if (next !== prev) {
        onChange(next.selectedModelIds);
      }
      return next;
    });
  }

  const count = selectionCount(state);
  const moreAvailable = canSelectMore(state);
  const summaryLabel = state.selectedModelIds
    .map((id) => getLocalModel(id)?.label || id)
    .join(', ');

  return (
    <div
      ref={wrapperRef}
      data-testid="multi-model-dropdown"
      className="relative inline-block text-left"
    >
      <button
        type="button"
        data-testid="multi-model-dropdown-toggle"
        onClick={handleToggleOpen}
        disabled={disabled}
        aria-expanded={state.isOpen}
        aria-haspopup="listbox"
        className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition ${
          disabled
            ? 'cursor-not-allowed border-gray-200 bg-gray-50 text-gray-400'
            : 'border-[#cc0033]/40 bg-white text-[#cc0033] hover:bg-[#cc0033]/5'
        }`}
      >
        <span className="hidden sm:inline">Local models</span>
        <span
          data-testid="multi-model-counter"
          className="rounded-full bg-[#cc0033] px-2 py-0.5 text-xs font-semibold text-white"
        >
          {count}/{MAX_MODELS}
        </span>
        <svg
          aria-hidden="true"
          width="12"
          height="12"
          viewBox="0 0 12 12"
          className={`transition-transform ${state.isOpen ? 'rotate-180' : ''}`}
        >
          <path
            d="M2 4l4 4 4-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {state.isOpen ? (
        <div
          role="listbox"
          aria-multiselectable="true"
          data-testid="multi-model-dropdown-panel"
          className="absolute right-0 z-50 mt-2 w-80 max-w-[90vw] rounded-2xl border border-gray-200 bg-white p-3 shadow-xl"
        >
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Pick {MIN_MODELS}-{MAX_MODELS} local models
            </p>
            <p className="text-[11px] text-gray-400">Ollama only</p>
          </div>

          <ul className="max-h-72 space-y-1 overflow-y-auto">
            {(LOCAL_OLLAMA_MODELS as LocalModel[]).map((model) => {
              const isSelected = state.selectedModelIds.includes(model.id);
              const isCapBlocked = !isSelected && !moreAvailable;
              const isLastSelected = isSelected && count <= MIN_MODELS;
              const isDisabled = isCapBlocked || isLastSelected;

              return (
                <li key={model.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    data-testid={`multi-model-option-${model.id}`}
                    disabled={isDisabled}
                    onClick={() => handleToggleModel(model.id)}
                    className={`flex w-full items-start gap-3 rounded-lg p-2 text-left text-sm transition ${
                      isSelected
                        ? 'bg-[#cc0033]/10 ring-1 ring-[#cc0033]/40'
                        : isDisabled
                          ? 'cursor-not-allowed text-gray-300'
                          : 'hover:bg-gray-50'
                    }`}
                    title={
                      isLastSelected
                        ? `At least ${MIN_MODELS} model must remain selected`
                        : isCapBlocked
                          ? `Limit is ${MAX_MODELS} models`
                          : model.blurb
                    }
                  >
                    <span
                      className={`mt-0.5 flex h-4 w-4 items-center justify-center rounded border ${
                        isSelected
                          ? 'border-[#cc0033] bg-[#cc0033] text-white'
                          : 'border-gray-300 bg-white'
                      }`}
                      aria-hidden="true"
                    >
                      {isSelected ? (
                        <svg width="10" height="10" viewBox="0 0 10 10">
                          <path
                            d="M2 5l2 2 4-4"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.6"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      ) : null}
                    </span>
                    <span className="flex-1">
                      <span className="block font-medium text-gray-900">
                        {model.label}
                      </span>
                      <span className="block text-[11px] text-gray-500">
                        {model.family} | {model.ollamaTag}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          {summaryLabel ? (
            <p
              data-testid="multi-model-summary"
              className="mt-3 truncate text-[11px] text-gray-500"
              title={summaryLabel}
            >
              Selected: {summaryLabel}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
