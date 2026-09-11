// ============================================================================
// Enterprise Error Boundary & Graceful Degradation Component
// ============================================================================

import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertOctagon, RotateCcw, Home, ShieldAlert } from 'lucide-react';
import { Button } from './Button';

export interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackSubtitle?: string;
  onReset?: () => void;
  showHomeButton?: boolean;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ error, errorInfo });
    console.error('[ZaynCore ErrorBoundary Caught Exception]:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    this.props.onReset?.();
  };

  handleReload = () => {
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      const isAuthError = this.state.error?.message?.toLowerCase().includes('tenant') ||
                          this.state.error?.message?.toLowerCase().includes('permission') ||
                          this.state.error?.message?.toLowerCase().includes('unauthorized');

      return (
        <div className="min-h-[360px] w-full p-6 sm:p-8 flex items-center justify-center">
          <div className="max-w-xl w-full rounded-2xl bg-card/90 border border-border p-6 sm:p-8 shadow-xl backdrop-blur-xl text-center space-y-5">
            <div className={`w-14 h-14 rounded-2xl mx-auto flex items-center justify-center shadow-inner ${
              isAuthError 
                ? 'bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400' 
                : 'bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400'
            }`}>
              {isAuthError ? <ShieldAlert className="w-7 h-7" /> : <AlertOctagon className="w-7 h-7" />}
            </div>

            <div>
              <h2 className="text-xl font-bold text-foreground">
                {this.props.fallbackTitle || (isAuthError ? 'Access or Security Restriction' : 'Component Render Failure')}
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1.5 leading-relaxed">
                {this.props.fallbackSubtitle || 
                 this.state.error?.message || 
                 'An unexpected error occurred while rendering this workspace. Your session and tenant data remain safe.'}
              </p>
            </div>

            {/* Error Details for Debugging */}
            {this.state.error && (
              <div className="p-3 rounded-xl bg-muted border border-border text-left overflow-hidden">
                <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1">
                  Diagnostic Message
                </div>
                <div className="text-xs font-mono text-rose-600 dark:text-rose-400 break-words line-clamp-3">
                  {this.state.error.toString()}
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Button
                variant="primary"
                size="sm"
                icon={<RotateCcw className="w-3.5 h-3.5" />}
                onClick={this.handleReset}
              >
                Try Again
              </Button>

              <Button
                variant="outline"
                size="sm"
                icon={<Home className="w-3.5 h-3.5" />}
                onClick={this.handleReload}
              >
                Reload Application
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
