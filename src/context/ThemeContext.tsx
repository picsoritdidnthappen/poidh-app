'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

type Theme = 'light' | 'dark' | 'cyber';

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle('dark', theme !== 'light');
  document.documentElement.classList.toggle('cyber', theme === 'cyber');
}

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  toggleTheme: () => undefined,
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light');

  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem('theme');
    } catch {
      // The toggle still works when browser storage is unavailable.
    }
    const prefersDark = window.matchMedia(
      '(prefers-color-scheme: dark)'
    ).matches;
    const initial: Theme =
      stored === 'light' || stored === 'dark' || stored === 'cyber'
        ? stored
        : prefersDark
        ? 'dark'
        : 'light';
    setTheme(initial);
    applyTheme(initial);
  }, []);

  const toggleTheme = () => {
    const next: Theme =
      theme === 'light' ? 'dark' : theme === 'dark' ? 'cyber' : 'light';
    applyTheme(next);
    setTheme(next);
    try {
      localStorage.setItem('theme', next);
    } catch {
      // Keep the selected theme for this session when storage is unavailable.
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
