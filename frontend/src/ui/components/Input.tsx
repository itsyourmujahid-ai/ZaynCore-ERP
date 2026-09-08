// ============================================================================
// Enterprise Input Component (Adaptive Semantic Theming & High Contrast)
// ============================================================================

import React, { forwardRef } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
  icon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, helperText, error, icon, className, disabled, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-semibold text-foreground tracking-wider">
            {label}
            {props.required && <span className="text-destructive ml-1">*</span>}
          </label>
        )}
        <div className="relative rounded-lg shadow-sm">
          {icon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            className={twMerge(
              clsx(
                'block w-full rounded-lg bg-input border border-border text-foreground text-sm transition-colors duration-150 shadow-sm',
                'focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary',
                'placeholder:text-muted-foreground disabled:opacity-50 disabled:bg-muted disabled:cursor-not-allowed',
                icon ? 'pl-9 pr-3.5 py-2' : 'px-3.5 py-2',
                error ? 'border-destructive focus:ring-destructive' : 'border-border hover:border-muted-foreground/50',
                className
              )
            )}
            {...props}
          />
        </div>
        {error ? (
          <p className="text-xs text-destructive font-medium">{error}</p>
        ) : helperText ? (
          <p className="text-xs text-muted-foreground">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = 'Input';
