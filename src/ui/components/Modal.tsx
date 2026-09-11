// ============================================================================
// Enterprise Modal Dialog Component (Responsive & Viewport Guarded)
// ============================================================================

import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  size = 'md',
  children,
  footer,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    '2xl': 'max-w-6xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-card/60 backdrop-blur-sm transition-opacity animate-fadeIn" 
        onClick={onClose} 
      />

      {/* Modal Container */}
      <div
        className={`relative w-full ${sizeClasses[size]} max-w-[calc(100vw-1.5rem)] sm:max-w-[calc(100vw-2rem)] bg-card border border-border rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] z-10 animate-scaleUp text-foreground`}
      >
        {/* Header */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-border flex items-center justify-between gap-3 bg-muted shrink-0">
          <div className="min-w-0 flex-1 pr-2">
            <h3 className="text-sm sm:text-base font-bold text-foreground truncate">{title}</h3>
            {subtitle && <p className="text-xs text-muted-foreground mt-0.5 truncate">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground/90 hover:bg-muted transition-colors shrink-0"
            title="Close dialog (Esc)"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 min-w-0 text-foreground">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="px-4 sm:px-6 py-3 sm:py-3.5 border-t border-border bg-muted flex items-center justify-end gap-2 sm:gap-3 shrink-0 flex-wrap sm:flex-nowrap">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
