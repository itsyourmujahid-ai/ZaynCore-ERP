// ============================================================================
// Enterprise Theme Context (Light/Dark Modes & High-Contrast Palettes)
// ============================================================================

import React, { createContext, useContext, useState, useEffect } from 'react';

export type ERPThemeMode = 'light' | 'dark';
export type ERPThemePalette = 'green' | 'blue' | 'black';
export type ERPTheme = ERPThemePalette; // Backwards compatibility

interface ThemeContextType {
  mode: ERPThemeMode;
  setMode: (mode: ERPThemeMode) => void;
  toggleMode: () => void;
  palette: ERPThemePalette;
  setPalette: (palette: ERPThemePalette) => void;
  theme: ERPThemePalette;
  setTheme: (theme: ERPThemePalette) => void;
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

const THEME_MODE_KEY = 'QUANTUM_CORE_THEME_MODE';
const THEME_PALETTE_KEY = 'QUANTUM_CORE_THEME_PALETTE';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Mode: Light vs Dark
  const [mode, setModeState] = useState<ERPThemeMode>(() => {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem(THEME_MODE_KEY) as ERPThemeMode;
      if (saved === 'light' || saved === 'dark') {
        return saved;
      }
    }
    return 'dark'; // Default Dark Theme
  });

  // Palette: Green, Blue, Black
  const [palette, setPaletteState] = useState<ERPThemePalette>(() => {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem(THEME_PALETTE_KEY) as ERPThemePalette;
      if (saved === 'black' || saved === 'blue' || saved === 'green') {
        return saved;
      }
    }
    return 'green'; // Default Emerald
  });

  const setMode = (newMode: ERPThemeMode) => {
    setModeState(newMode);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(THEME_MODE_KEY, newMode);
    }
  };

  const toggleMode = () => {
    setMode(mode === 'dark' ? 'light' : 'dark');
  };

  const setPalette = (newPalette: ERPThemePalette) => {
    setPaletteState(newPalette);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(THEME_PALETTE_KEY, newPalette);
    }
  };

  // Backwards compatible setTheme
  const setTheme = (newTheme: ERPThemePalette) => {
    setPalette(newTheme);
  };

  // Apply classes to <html> root element
  useEffect(() => {
    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      
      // Update Mode (class and attribute)
      if (mode === 'dark') {
        root.classList.add('dark');
        root.classList.remove('light');
      } else {
        root.classList.add('light');
        root.classList.remove('dark');
      }
      root.setAttribute('data-mode', mode);

      // Update Palette (class and attribute)
      root.classList.remove('theme-black', 'theme-blue', 'theme-green');
      root.classList.add(`theme-${palette}`);
      root.setAttribute('data-palette', palette);
      root.setAttribute('data-theme', palette);
    }
  }, [mode, palette]);

  // Derived style utilities based on current palette & mode
  const getThemeVars = () => {
    const isDark = mode === 'dark';

    switch (palette) {
      case 'black':
        return {
          accentColor: isDark ? '#94a3b8' : '#334155',
          chartStroke: isDark ? '#94a3b8' : '#334155',
          chartFill: isDark ? 'rgba(148, 163, 184, 0.15)' : 'rgba(51, 65, 85, 0.15)',
          chartDot: isDark ? '#f8fafc' : '#0f172a',
          accentText: isDark ? 'text-foreground' : 'text-foreground',
          accentBadge: isDark ? 'bg-muted text-foreground border-border' : 'bg-muted text-foreground border-border',
          navActiveBg: isDark ? 'bg-muted/80 text-white' : 'bg-slate-200 text-foreground',
          navActiveBorder: isDark ? 'border-slate-600 ring-1 ring-slate-500' : 'border-slate-400 ring-1 ring-slate-400',
          navActiveDot: isDark ? 'bg-slate-200' : 'bg-card',
        };
      case 'blue':
        return {
          accentColor: '#0284c7',
          chartStroke: '#0284c7',
          chartFill: 'rgba(2, 132, 199, 0.15)',
          chartDot: '#0284c7',
          accentText: isDark ? 'text-sky-400' : 'text-sky-700',
          accentBadge: isDark ? 'bg-sky-950/60 text-sky-300 border-sky-800' : 'bg-sky-50 text-sky-800 border-sky-200',
          navActiveBg: isDark ? 'bg-sky-600/30 text-white' : 'bg-sky-100 text-sky-900',
          navActiveBorder: isDark ? 'border-sky-500/50 ring-1 ring-sky-500/40' : 'border-sky-400 ring-1 ring-sky-300',
          navActiveDot: 'bg-sky-400 shadow-[0_0_8px_#38bdf8]',
        };
      case 'green':
      default:
        return {
          accentColor: isDark ? '#10b981' : '#059669',
          chartStroke: isDark ? '#10b981' : '#059669',
          chartFill: 'rgba(5, 150, 105, 0.15)',
          chartDot: isDark ? '#10b981' : '#059669',
          accentText: isDark ? 'text-emerald-400' : 'text-emerald-700',
          accentBadge: isDark ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800' : 'bg-emerald-50 text-emerald-800 border-emerald-200',
          navActiveBg: isDark ? 'bg-emerald-600/30 text-white' : 'bg-emerald-100 text-emerald-900',
          navActiveBorder: isDark ? 'border-emerald-500/50 ring-1 ring-emerald-500/40' : 'border-emerald-400 ring-1 ring-emerald-300',
          navActiveDot: 'bg-emerald-400 shadow-[0_0_8px_#34d399]',
        };
    }
  };

  const themeVars = getThemeVars();

  return (
    <ThemeContext.Provider
      value={{
        mode,
        setMode,
        toggleMode,
        palette,
        setPalette,
        theme: palette,
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
