// ============================================================================
// Enterprise ERP Master Login Page (Sanitized Normal Login + Hidden VVIP Portal)
// ============================================================================

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Building2, 
  User, 
  Lock, 
  ArrowRight, 
  AlertCircle, 
  Eye, 
  EyeOff, 
  ShieldAlert,
  X
} from 'lucide-react';
import { InteractiveBackground } from '@/ui/components/InteractiveBackground';
import { ZaynCoreLogo } from '@/ui/components/ZaynCoreLogo';

export const LoginPage: React.FC = () => {
  const { loginCompanyUser, loginSuperAdmin } = useAuth();

  // Company member form state (Default visible login)
  const [companyAccessCode, setCompanyAccessCode] = useState('DEMO-CORP');
  const [companyIdentifier, setCompanyIdentifier] = useState('');
  const [companyPassword, setCompanyPassword] = useState('');
  const [showCompanyPass, setShowCompanyPass] = useState(false);

  // Hidden VVIP Modal state (Revealed ONLY via CTRL + M + U + J)
  const [isVVIPOpen, setIsVVIPOpen] = useState(false);
  const [adminIdentifier, setAdminIdentifier] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [showAdminPass, setShowAdminPass] = useState(false);

  // Error handling & loading state
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [vvipErrorMessage, setVvipErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Buffer to track hidden keyboard sequence
  const keySequenceRef = useRef<string[]>([]);
  const lastKeyTimeRef = useRef<number>(Date.now());

  // --------------------------------------------------------------------------
  // Hidden VVIP Trigger (CTRL + Mouse Left Click & CTRL + M + U + J)
  // --------------------------------------------------------------------------
  useEffect(() => {
    // 1. CTRL + Mouse Left Click Detector
    const handleMouseClick = (e: MouseEvent) => {
      // Check for left click (button === 0) with Ctrl or Meta key held
      if (e.button === 0 && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        setIsVVIPOpen(true);
        setVvipErrorMessage(null);
      }
    };

    // 2. Keyboard Sequence Detector (CTRL + M + U + J)
    const handleKeyDown = (e: KeyboardEvent) => {
      const now = Date.now();
      if (now - lastKeyTimeRef.current > 3000) {
        keySequenceRef.current = [];
      }
      lastKeyTimeRef.current = now;

      const key = e.key.toLowerCase();

      // Support 1: Holding Ctrl/Meta while pressing M -> U -> J
      if (e.ctrlKey || e.metaKey) {
        if (key === 'm') {
          keySequenceRef.current = ['m'];
          return;
        } else if (key === 'u' && keySequenceRef.current.length === 1 && keySequenceRef.current[0] === 'm') {
          keySequenceRef.current = ['m', 'u'];
          return;
        } else if (key === 'j' && keySequenceRef.current.length === 2 && keySequenceRef.current[0] === 'm' && keySequenceRef.current[1] === 'u') {
          e.preventDefault();
          keySequenceRef.current = [];
          setIsVVIPOpen(true);
          setVvipErrorMessage(null);
          return;
        }
      }

      // Support 2: Sequential keypresses 'control' -> 'm' -> 'u' -> 'j'
      if (key === 'control') {
        keySequenceRef.current = ['control'];
      } else if (keySequenceRef.current.length === 1 && keySequenceRef.current[0] === 'control' && key === 'm') {
        keySequenceRef.current.push('m');
      } else if (keySequenceRef.current.length === 2 && keySequenceRef.current[1] === 'm' && key === 'u') {
        keySequenceRef.current.push('u');
      } else if (keySequenceRef.current.length === 3 && keySequenceRef.current[2] === 'u' && key === 'j') {
        e.preventDefault();
        keySequenceRef.current = [];
        setIsVVIPOpen(true);
        setVvipErrorMessage(null);
      } else if (key !== 'control' && key !== 'shift' && key !== 'alt') {
        keySequenceRef.current = [];
      }
    };

    window.addEventListener('click', handleMouseClick, true);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('click', handleMouseClick, true);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Submit Company User Login
  const handleCompanySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      loginCompanyUser(companyAccessCode, companyIdentifier, companyPassword);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to authenticate company user.');
    } finally {
      setIsLoading(false);
    }
  };

  // Submit Hidden VVIP Super Admin Login
  const handleVVIPSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setVvipErrorMessage(null);
    setIsLoading(true);

    try {
      loginSuperAdmin(adminIdentifier, adminPassword);
    } catch (err: any) {
      setVvipErrorMessage(err.message || 'Failed to authenticate Platform Super Admin.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-screen bg-background text-foreground flex flex-col justify-between selection:bg-primary selection:text-primary-foreground font-sans relative">
      {/* Interactive Mouse-Reactive Dot Grid Background */}
      <InteractiveBackground />

      {/* Background Subtle Gradient */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-primary/10 blur-[120px] rounded-full" />
        <div className="absolute -bottom-40 right-10 w-[500px] h-[400px] bg-blue-500/10 blur-[140px] rounded-full" />
      </div>

      {/* Top Brand Bar */}
      <header className="relative z-10 px-6 py-4 border-b border-border/80 bg-card/70 backdrop-blur-md flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <ZaynCoreLogo size="md" />
          <div>
            <div className="text-sm font-bold tracking-tight text-foreground flex items-center gap-2">
              <span>ZaynCore</span>
              <span className="px-1.5 py-0.2 text-[9px] font-black uppercase tracking-wider bg-primary/20 text-primary border border-primary/30 rounded">
                CORE v2.0
              </span>
            </div>
            <div className="text-[10px] text-muted-foreground font-medium tracking-wide">
              Enterprise Ledger & Operations System
            </div>
          </div>
        </div>

        <div className="text-xs text-muted-foreground">
          <span>Enterprise Cloud System</span>
        </div>
      </header>

      {/* Main Clean Normal Login Container */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md">
          {/* Main Frosted Glass Card */}
          <div className="bg-card/85 backdrop-blur-xl border border-border/90 rounded-2xl shadow-2xl p-6 sm:p-8 space-y-6">
            
            <div>
              <h1 className="text-xl font-bold text-card-foreground tracking-tight flex items-center gap-2">
                <Building2 className="w-5 h-5 text-primary" />
                <span>Company Workspace Sign In</span>
              </h1>
              <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                Enter your Company Access Code with your authorized employee or administrator credentials.
              </p>
            </div>

            {/* Error Notification Banner */}
            {errorMessage && (
              <div className="p-3.5 rounded-xl bg-destructive/15 border border-destructive/30 text-destructive text-xs flex items-start gap-2.5 animate-fadeIn">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="leading-relaxed font-medium">{errorMessage}</span>
              </div>
            )}

            {/* Normal Company Login Form */}
            <form onSubmit={handleCompanySubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-card-foreground flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>Company Code / Access Identifier</span>
                </label>
                <input
                  type="text"
                  required
                  value={companyAccessCode}
                  onChange={(e) => setCompanyAccessCode(e.target.value)}
                  placeholder="e.g. DEMO-CORP"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-card-foreground flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>Username or Work Email</span>
                </label>
                <input
                  type="text"
                  required
                  value={companyIdentifier}
                  onChange={(e) => setCompanyIdentifier(e.target.value)}
                  placeholder="e.g. user@company.com"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-card-foreground flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>Password</span>
                </label>
                <div className="relative">
                  <input
                    type={showCompanyPass ? 'text' : 'password'}
                    required
                    value={companyPassword}
                    onChange={(e) => setCompanyPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full px-3.5 py-2.5 pr-10 rounded-xl bg-background border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCompanyPass(!showCompanyPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                  >
                    {showCompanyPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 px-4 rounded-xl bg-primary hover:opacity-90 active:scale-[0.99] text-primary-foreground text-sm font-semibold flex items-center justify-center gap-2 shadow-md transition-all disabled:opacity-50 mt-2 cursor-pointer"
              >
                <span>{isLoading ? 'Authenticating...' : 'Sign In to Workspace'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </main>

      {/* Hidden VVIP Platform Admin Modal (Triggered ONLY via CTRL + M + U + J) */}
      {isVVIPOpen && (
        <div 
          data-testid="vvip-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn"
        >
          <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl p-6 sm:p-8 space-y-6 animate-scaleUp">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-card-foreground flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-purple-500" />
                  <span>Platform Super Administrator</span>
                </h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Enter master administrative credentials to access the sovereign platform console.
                </p>
              </div>
              <button
                onClick={() => setIsVVIPOpen(false)}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {vvipErrorMessage && (
              <div className="p-3.5 rounded-xl bg-destructive/15 border border-destructive/30 text-destructive text-xs flex items-start gap-2.5 animate-fadeIn">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="leading-relaxed font-medium">{vvipErrorMessage}</span>
              </div>
            )}

            <form onSubmit={handleVVIPSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-card-foreground flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>Master Administrator Email</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={adminIdentifier}
                  onChange={(e) => setAdminIdentifier(e.target.value)}
                  placeholder="admin@platform.com"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-card-foreground flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>Master Access Key</span>
                </label>
                <div className="relative">
                  <input
                    type={showAdminPass ? 'text' : 'password'}
                    required
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full px-3.5 py-2.5 pr-10 rounded-xl bg-background border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAdminPass(!showAdminPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                  >
                    {showAdminPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsVVIPOpen(false)}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-secondary hover:bg-muted text-secondary-foreground text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-md transition-all disabled:opacity-50 cursor-pointer"
                >
                  <span>{isLoading ? 'Verifying...' : 'Access Console'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Clean Footer */}
      <footer className="relative z-10 px-6 py-4 border-t border-border bg-card/40 backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
        <div>
          <span>© 2026 ZaynCore. All rights reserved.</span>
        </div>
        <div className="flex items-center gap-4">
          <span>Enterprise Multi-Tenant Architecture</span>
        </div>
      </footer>
    </div>
  );
};
