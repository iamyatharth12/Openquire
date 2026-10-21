import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export type ThemeMode = 'light' | 'dark';

export interface ThemeContextType {
  theme: ThemeMode;
  isDark: boolean;
  toggleTheme: () => void;
  setTheme: (mode: ThemeMode) => void;
}

export const THEME_STORAGE_KEY = 'openquire_theme';

export function getInitialTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'light';
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') {
      return saved;
    }
  } catch {
    // ignore localStorage errors in sandboxed iframes
  }

  if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
}

export function applyThemeToDOM(theme: ThemeMode) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const body = document.body;

  if (theme === 'dark') {
    root.classList.add('dark');
    body?.classList.add('dark');
    root.setAttribute('data-theme', 'dark');
    root.style.colorScheme = 'dark';
  } else {
    root.classList.remove('dark');
    body?.classList.remove('dark');
    root.setAttribute('data-theme', 'light');
    root.style.colorScheme = 'light';
  }
}

export const themeManager = {
  getTheme: getInitialTheme,
  applyToDOM: applyThemeToDOM,
  setTheme(newTheme: ThemeMode) {
    applyThemeToDOM(newTheme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    } catch {
      // storage unavailable
    }
    return newTheme;
  },
  toggleTheme() {
    const current = this.getTheme();
    const next: ThemeMode = current === 'dark' ? 'light' : 'dark';
    return this.setTheme(next);
  },
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeMode>(getInitialTheme);

  const applyAndSave = useCallback((newTheme: ThemeMode) => {
    themeManager.setTheme(newTheme);
  }, []);

  useEffect(() => {
    applyAndSave(theme);
  }, [theme, applyAndSave]);

  // Listen to OS system preference changes if user has not explicitly set preference
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemChange = (e: MediaQueryListEvent) => {
      try {
        const saved = localStorage.getItem(THEME_STORAGE_KEY);
        if (!saved) {
          const sysTheme: ThemeMode = e.matches ? 'dark' : 'light';
          setThemeState(sysTheme);
          applyAndSave(sysTheme);
        }
      } catch {
        // ignore
      }
    };

    mediaQuery.addEventListener('change', handleSystemChange);
    return () => mediaQuery.removeEventListener('change', handleSystemChange);
  }, [applyAndSave]);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      applyAndSave(next);
      return next;
    });
  }, [applyAndSave]);

  const setTheme = useCallback((newTheme: ThemeMode) => {
    setThemeState(newTheme);
    applyAndSave(newTheme);
  }, [applyAndSave]);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        isDark: theme === 'dark',
        toggleTheme,
        setTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export function useTheme(): ThemeContextType {
  let context: ThemeContextType | undefined;
  try {
    context = useContext(ThemeContext);
  } catch {
    // In environments where useContext cannot be called outside React rendering tree
  }

  if (!context) {
    // Safe fallback for testing outside React component tree
    const currentTheme = getInitialTheme();
    return {
      theme: currentTheme,
      isDark: currentTheme === 'dark',
      toggleTheme: () => {
        themeManager.toggleTheme();
      },
      setTheme: (m) => {
        themeManager.setTheme(m);
      },
    };
  }
  return context;
}
