// ============================================================================
// Sleek Accessible Dropdown Menu Component (Viewport Guarded)
// ============================================================================

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, MoreVertical } from 'lucide-react';

export interface DropdownMenuItem {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  divider?: boolean;
  danger?: boolean;
}

export interface DropdownMenuProps {
  label?: React.ReactNode;
  items: DropdownMenuItem[];
  variant?: 'button' | 'ghost' | 'dots';
  align?: 'left' | 'right';
  className?: string;
}

export const DropdownMenu: React.FC<DropdownMenuProps> = ({
  label = 'More',
  items,
  variant = 'button',
  align = 'right',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`relative inline-block text-left shrink-0 ${className}`} ref={dropdownRef}>
      {variant === 'dots' ? (
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          aria-expanded={isOpen}
          title="More Actions"
        >
          <MoreVertical className="w-4 h-4" />
        </button>
      ) : variant === 'ghost' ? (
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-foreground/90 hover:text-foreground rounded-lg hover:bg-muted transition-colors"
          aria-expanded={isOpen}
        >
          <span>{label}</span>
          <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-semibold bg-card border border-border hover:border-slate-400 text-foreground/90 hover:text-foreground rounded-lg shadow-sm transition-all"
          aria-expanded={isOpen}
        >
          <span>{label}</span>
          <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      )}

      {isOpen && (
        <div
          className={`absolute z-50 mt-1.5 w-52 max-w-[calc(100vw-2rem)] rounded-xl bg-card border border-border shadow-2xl py-1 animate-scaleUp ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          {items.map((item, idx) => (
            <React.Fragment key={idx}>
              {item.divider && <div className="my-1 border-t border-slate-100" />}
              {item.label && (
                <button
                  type="button"
                  disabled={item.disabled}
                  onClick={() => {
                    setIsOpen(false);
                    if (!item.disabled) item.onClick();
                  }}
                  className={`w-full text-left px-3.5 py-2 text-xs flex items-center gap-2.5 transition-colors ${
                    item.disabled
                      ? 'opacity-40 cursor-not-allowed text-muted-foreground'
                      : item.danger
                      ? 'text-rose-600 hover:bg-rose-50'
                      : 'text-foreground/90 hover:text-foreground hover:bg-muted'
                  }`}
                >
                  {item.icon && <span className="shrink-0">{item.icon}</span>}
                  <span className="truncate font-medium">{item.label}</span>
                </button>
              )}
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  );
};
