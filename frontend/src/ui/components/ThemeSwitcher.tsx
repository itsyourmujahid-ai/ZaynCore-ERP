// ============================================================================
// Interactive Palette & Mode Theme Switcher (Light/Dark + Swatches)
// ============================================================================

import React from 'react';
import { useTheme, ERPThemePalette } from '@/core/theme/ThemeContext';
import { Check, Sun, Moon } from 'lucide-react';

export const ThemeSwitcher: React.FC = () => {
  const { mode, toggleMode, palette, setPalette } = useTheme();

  const palettes: Array<{ id: ERPThemePalette; label: string; bgClass: string; borderClass: string }> = [
    {
      id: 'black',
      label: 'Obsidian Slate',
      bgClass: 'bg-slate-800',
      borderClass: 'border-slate-600',
    },
    {
      id: 'blue',
      label: 'Cyber Blue',
      bgClass: 'bg-sky-500',
      borderClass: 'border-sky-400',
    },
    {
      id: 'green',
      label: 'Emerald Green',
      bgClass: 'bg-emerald-500',
      borderClass: 'border-emerald-400',
    },
  ];

  return (
    <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-card border border-border shadow-sm shrink-0">
      {/* Light / Dark Mode Toggle */}
      <button
        onClick={toggleMode}
        title={`Switch to ${mode === 'dark' ? 'Light' : 'Dark'} Mode`}
        className="p-1 rounded-lg hover:bg-muted text-foreground transition-colors flex items-center justify-center"
      >
        {mode === 'dark' ? (
          <Sun className="w-4 h-4 text-amber-400" />
        ) : (
          <Moon className="w-4 h-4 text-slate-700" />
        )}
      </button>

      <div className="h-4 w-px bg-border hidden sm:block" />

      {/* Palette Swatches */}
      <div className="flex items-center gap-1.5">
        {palettes.map((p) => {
          const isSelected = palette === p.id;
          return (
            <button
              key={p.id}
              onClick={() => setPalette(p.id)}
              title={`${p.label} Palette`}
              className={`w-4 h-4 rounded-full ${p.bgClass} border ${p.borderClass} flex items-center justify-center transition-all transform hover:scale-110 shadow-sm ${
                isSelected
                  ? 'ring-2 ring-primary ring-offset-1 ring-offset-background scale-110'
                  : 'opacity-70 hover:opacity-100'
              }`}
            >
              {isSelected && <Check className="w-2.5 h-2.5 text-white drop-shadow stroke-[3]" />}
            </button>
          );
        })}
      </div>
    </div>
  );
};
