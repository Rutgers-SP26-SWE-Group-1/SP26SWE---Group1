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

  const handleToggle = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    applyTheme(nextTheme);
  };

  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-label={mounted ? `Switch to ${isDark ? 'light' : 'dark'} mode` : 'Toggle theme'}
      aria-pressed={isDark}
      className="fixed top-4 right-4 z-[90] inline-flex h-11 items-center gap-2 rounded-full border border-app-border bg-app-surface px-3 text-sm font-semibold text-app-foreground shadow-lg backdrop-blur transition hover:border-scarlet hover:text-scarlet"
    >
      <span
        className={`inline-flex h-6 w-6 items-center justify-center rounded-full transition ${
          isDark ? 'bg-scarlet text-white' : 'bg-app-surface-subtle text-app-muted'
        }`}
      >
        {isDark ? (
          <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-current">
            <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-current">
            <path d="M12 18a1 1 0 0 1 1 1v2a1 1 0 1 1-2 0v-2a1 1 0 0 1 1-1Zm0-16a1 1 0 0 1 1 1v2a1 1 0 1 1-2 0V3a1 1 0 0 1 1-1Zm9 9a1 1 0 1 1 0 2h-2a1 1 0 1 1 0-2h2ZM5 11a1 1 0 1 1 0 2H3a1 1 0 1 1 0-2h2Zm12.364 5.95 1.414 1.414a1 1 0 0 1-1.414 1.414l-1.414-1.414a1 1 0 0 1 1.414-1.414ZM7.636 6.222a1 1 0 0 1 0 1.414L6.222 9.05A1 1 0 0 1 4.808 7.636l1.414-1.414a1 1 0 0 1 1.414 0Zm10.142 1.414a1 1 0 1 1 1.414-1.414l1.414 1.414A1 1 0 0 1 19.192 9.05l-1.414-1.414ZM6.222 16.95l-1.414 1.414a1 1 0 0 0 1.414 1.414l1.414-1.414A1 1 0 1 0 6.222 16.95ZM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10Z" />
          </svg>
        )}
      </span>
      <span className="hidden sm:inline">{isDark ? 'Dark' : 'Light'}</span>
    </button>
  );
}
