'use client';

import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

const STORAGE_KEY = 'scarlet-theme';

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  window.localStorage.setItem(STORAGE_KEY, theme);
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const storedTheme = window.localStorage.getItem(STORAGE_KEY);
    const initialTheme =
      storedTheme === 'dark' || storedTheme === 'light'
        ? storedTheme
        : ((document.documentElement.dataset.theme as Theme) || 'light');

    setTheme(initialTheme);
    applyTheme(initialTheme);
    setMounted(true);
  }, []);

  const handleSelectTheme = (nextTheme: Theme) => {
    setTheme(nextTheme);
    applyTheme(nextTheme);
  };

  return (
    <div
      className="fixed right-4 bottom-4 z-[90] inline-flex items-center gap-1 rounded-full border border-app-border bg-app-surface p-1 shadow-lg backdrop-blur"
      aria-label={mounted ? `Current theme: ${theme}` : 'Theme selector'}
    >
      <button
        type="button"
        onClick={() => handleSelectTheme('light')}
        aria-pressed={theme === 'light'}
        className={`inline-flex h-9 items-center gap-2 rounded-full px-3 text-sm font-semibold transition ${
          theme === 'light'
            ? 'bg-app-surface-subtle text-scarlet'
            : 'text-app-muted hover:text-app-foreground'
        }`}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-current">
          <path d="M12 18a1 1 0 0 1 1 1v2a1 1 0 1 1-2 0v-2a1 1 0 0 1 1-1Zm0-16a1 1 0 0 1 1 1v2a1 1 0 1 1-2 0V3a1 1 0 0 1 1-1Zm9 9a1 1 0 1 1 0 2h-2a1 1 0 1 1 0-2h2ZM5 11a1 1 0 1 1 0 2H3a1 1 0 1 1 0-2h2Zm12.364 5.95 1.414 1.414a1 1 0 0 1-1.414 1.414l-1.414-1.414a1 1 0 0 1 1.414-1.414ZM7.636 6.222a1 1 0 0 1 0 1.414L6.222 9.05A1 1 0 0 1 4.808 7.636l1.414-1.414a1 1 0 0 1 1.414 0Zm10.142 1.414a1 1 0 1 1 1.414-1.414l1.414 1.414A1 1 0 0 1 19.192 9.05l-1.414-1.414ZM6.222 16.95l-1.414 1.414a1 1 0 0 0 1.414 1.414l1.414-1.414A1 1 0 1 0 6.222 16.95ZM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10Z" />
        </svg>
        <span>Light</span>
      </button>
      <button
        type="button"
        onClick={() => handleSelectTheme('dark')}
        aria-pressed={theme === 'dark'}
        className={`inline-flex h-9 items-center gap-2 rounded-full px-3 text-sm font-semibold transition ${
          theme === 'dark'
            ? 'bg-app-surface-subtle text-scarlet'
            : 'text-app-muted hover:text-app-foreground'
        }`}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-current">
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
        </svg>
        <span>Dark</span>
      </button>
    </div>
  );
}
