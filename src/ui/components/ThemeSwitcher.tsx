// ============================================================================
// Interactive Palette Swatch Switcher (Black, Blue, Green)
// ============================================================================

import React from 'react';
import { useTheme, ERPTheme } from '@/core/theme/ThemeContext';
import { Check } from 'lucide-react';

export const ThemeSwitcher: React.FC = () => {
  const { theme, setTheme } = useTheme();

  const themes: Array<{ id: ERPTheme; label: string; bgClass: string; borderClass: string }> = [
    {
      id: 'black',
      label: 'Obsidian Black',
      bgClass: 'bg-card',
      borderClass: 'border-border',
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
    <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-card/60 backdrop-blur-md border border-white/10 shrink-0">
      <span className="text-[11px] font-semibold text-foreground/90 hidden sm:inline select-none">
        Theme:
      </span>
      <div className="flex items-center gap-1.5">
        {themes.map((t) => {
          const isSelected = theme === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTheme(t.id)}
              title={`${t.label} Palette`}
              className={`w-5 h-5 rounded-full ${t.bgClass} border ${t.borderClass} flex items-center justify-center transition-all transform hover:scale-110 shadow-sm ${
                isSelected
                  ? 'ring-2 ring-white/60 ring-offset-1 ring-offset-slate-950 scale-105'
                  : 'opacity-70 hover:opacity-100'
              }`}
            >
              {isSelected && <Check className="w-3 h-3 text-white drop-shadow stroke-[3]" />}
            </button>
          );
        })}
      </div>
    </div>
  );
};
