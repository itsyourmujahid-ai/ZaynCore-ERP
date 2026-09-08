// ============================================================================
// QuantumCore ERP Dynamic Glass Theme Context (Black, Blue, Green Palettes)
// ============================================================================

import React, { createContext, useContext, useState, useEffect } from 'react';

export type ERPTheme = 'black' | 'blue' | 'green';

interface ThemeContextType {
  theme: ERPTheme;
  setTheme: (theme: ERPTheme) => void;
  accentColor: string;
  chartStroke: string;
  chartFill: string;
  chartDot: string;
  accentText: string;
  accentBadge: string;
  navActiveBg: string;
  navActiveBorder: string;
  navActiveDot: string;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = 'QUANTUM_CORE_THEME_PALETTE';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ERPTheme>(() => {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem(THEME_STORAGE_KEY) as ERPTheme;
      if (saved === 'black' || saved === 'blue' || saved === 'green') {
        return saved;
      }
    }
    return 'green'; // Default as requested by user with checkmark on green swatch
  });

  const setTheme = (newTheme: ERPTheme) => {
    setThemeState(newTheme);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    }
  };

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', theme);
      document.documentElement.classList.remove('theme-black', 'theme-blue', 'theme-green');
      document.documentElement.classList.add(`theme-${theme}`);
    }
  }, [theme]);

  // Derived style utilities based on current palette
  const getThemeVars = () => {
    switch (theme) {
      case 'black':
        return {
          accentColor: '#334155',
          chartStroke: '#334155',
          chartFill: 'rgba(51, 65, 85, 0.14)',
          chartDot: '#0f172a',
          accentText: 'text-slate-900',
          accentBadge: 'bg-slate-100 text-slate-900 border-slate-300',
          navActiveBg: 'bg-white/15 text-white',
          navActiveBorder: 'border-white/30 ring-1 ring-white/20',
          navActiveDot: 'bg-slate-200',
        };
      case 'blue':
        return {
          accentColor: '#0284c7',
          chartStroke: '#0284c7',
          chartFill: 'rgba(2, 132, 199, 0.15)',
          chartDot: '#0284c7',
          accentText: 'text-sky-600',
          accentBadge: 'bg-sky-50 text-sky-700 border-sky-200',
          navActiveBg: 'bg-sky-500/20 text-white',
          navActiveBorder: 'border-sky-400/40 ring-1 ring-sky-400/30',
          navActiveDot: 'bg-sky-400 shadow-[0_0_8px_#38bdf8]',
        };
      case 'green':
      default:
        return {
          accentColor: '#059669',
          chartStroke: '#059669',
          chartFill: 'rgba(5, 150, 105, 0.15)',
          chartDot: '#059669',
          accentText: 'text-emerald-600',
          accentBadge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          navActiveBg: 'bg-emerald-500/20 text-white',
          navActiveBorder: 'border-emerald-400/40 ring-1 ring-emerald-400/30',
          navActiveDot: 'bg-emerald-400 shadow-[0_0_8px_#34d399]',
        };
    }
  };

  const themeVars = getThemeVars();

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        ...themeVars,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
