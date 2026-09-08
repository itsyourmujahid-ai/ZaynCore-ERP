// ============================================================================
// Enterprise ERP Master Login Page
// ============================================================================

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  ShieldCheck, 
  Building2, 
  KeyRound, 
  User, 
  Lock, 
  ArrowRight, 
  AlertCircle, 
  Crown,
  Eye,
  EyeOff,
  Briefcase
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { loginSuperAdmin, loginCompanyUser } = useAuth();

  const [activeTab, setActiveTab] = useState<'superadmin' | 'company'>('superadmin');
  
  // Super Admin form state
  const [adminIdentifier, setAdminIdentifier] = useState('admin@mujahid.com');
  const [adminPassword, setAdminPassword] = useState('bahwanmge');
  const [showAdminPass, setShowAdminPass] = useState(false);

  // Company member form state
  const [companyAccessCode, setCompanyAccessCode] = useState('');
  const [companyIdentifier, setCompanyIdentifier] = useState('');
  const [companyPassword, setCompanyPassword] = useState('');
  const [showCompanyPass, setShowCompanyPass] = useState(false);

  // Error handling & loading state
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSuperAdminSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      loginSuperAdmin(adminIdentifier, adminPassword);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to authenticate Platform Super Admin.');
    } finally {
      setIsLoading(false);
    }
  };

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

  return (
    <div className="min-h-screen w-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-brand-500 selection:text-white">
      {/* Background Ambience Glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-gradient-to-b from-brand-600/20 via-purple-600/10 to-transparent blur-[120px] rounded-full" />
        <div className="absolute -bottom-40 right-10 w-[500px] h-[400px] bg-indigo-600/10 blur-[140px] rounded-full" />
      </div>

      {/* Top Brand Bar */}
      <header className="relative z-10 px-6 py-4 border-b border-slate-800/60 bg-slate-900/40 backdrop-blur-md flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-600 flex items-center justify-center font-bold text-lg text-white shadow-lg shadow-brand-500/20 ring-1 ring-white/20">
            E
          </div>
          <div>
            <div className="text-sm font-bold tracking-tight text-white flex items-center gap-2">
              <span>ENTERPRISE ERP</span>
              <span className="px-1.5 py-0.2 text-[9px] font-black uppercase tracking-wider bg-brand-500/20 text-brand-300 border border-brand-500/30 rounded">
                CORE
              </span>
            </div>
            <div className="text-[10px] text-slate-400 font-medium tracking-wide">
              Unified Platform & Tenant Management
            </div>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Strict Tenant Isolation & AES Security</span>
        </div>
      </header>

      {/* Main Login Card Container */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md">
          {/* Main Card */}
          <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8 space-y-6 ring-1 ring-white/5">
            
            {/* Header / Tabs */}
            <div className="space-y-4">
              <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800/80">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('superadmin');
                    setErrorMessage(null);
                  }}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                    activeTab === 'superadmin'
                      ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Crown className="w-3.5 h-3.5 text-amber-300" />
                  <span>VVIP Super Admin</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('company');
                    setErrorMessage(null);
                  }}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                    activeTab === 'company'
                      ? 'bg-brand-600 text-white shadow-md shadow-brand-600/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5 text-brand-200" />
                  <span>Company Workspace</span>
                </button>
              </div>

              <div>
                <h1 className="text-xl font-bold text-white tracking-tight">
                  {activeTab === 'superadmin' ? 'Platform Super Administrator' : 'Company ERP Portal'}
                </h1>
                <p className="text-xs text-slate-400 mt-1">
                  {activeTab === 'superadmin'
                    ? 'Enter VVIP credentials to access the central Platform Management Console.'
                    : 'Enter your Company Access Code with your Admin or Employee credentials.'}
                </p>
              </div>
            </div>

            {/* Error Notification */}
            {errorMessage && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-3 animate-fadeIn">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div className="text-xs text-rose-300 font-medium leading-relaxed">
                  {errorMessage}
                </div>
              </div>
            )}

            {/* Mode 1: Super Admin Login Form */}
            {activeTab === 'superadmin' ? (
              <form onSubmit={handleSuperAdminSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                    <span>Admin Username / Email</span>
                    <span className="text-[10px] text-purple-400 font-mono">VVIP Platform Owner</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      required
                      value={adminIdentifier}
                      onChange={(e) => setAdminIdentifier(e.target.value)}
                      placeholder="admin@mujahid.com"
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    Master Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showAdminPass ? 'text' : 'password'}
                      required
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-10 py-2.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowAdminPass(!showAdminPass)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200"
                    >
                      {showAdminPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-sm shadow-lg shadow-purple-600/25 flex items-center justify-center gap-2 transition-all active:scale-[0.99] disabled:opacity-50"
                  >
                    <span>Sign In to Super Admin Console</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
                  <span>Default VVIP Login:</span>
                  <span className="font-mono text-purple-300 font-semibold">admin@mujahid.com</span>
                </div>
              </form>
            ) : (
              /* Mode 2: Company Workspace Login Form (Admin & Employees) */
              <form onSubmit={handleCompanySubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                    <span>Company Access Code</span>
                    <span className="text-[10px] text-brand-400 font-medium">Unique Tenant ID</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                      <KeyRound className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      required
                      value={companyAccessCode}
                      onChange={(e) => setCompanyAccessCode(e.target.value.toUpperCase())}
                      placeholder="e.g. APEX or APEX-2026"
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all uppercase font-mono tracking-wider font-semibold"
                    />
                  </div>
                  <p className="text-[10px] text-slate-500">
                    Given by Super Admin during company onboarding.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    Username or Email
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      required
                      value={companyIdentifier}
                      onChange={(e) => setCompanyIdentifier(e.target.value)}
                      placeholder="admin or employee username"
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    Account Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showCompanyPass ? 'text' : 'password'}
                      required
                      value={companyPassword}
                      onChange={(e) => setCompanyPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-10 py-2.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCompanyPass(!showCompanyPass)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200"
                    >
                      {showCompanyPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-semibold text-sm shadow-lg shadow-brand-600/25 flex items-center justify-center gap-2 transition-all active:scale-[0.99] disabled:opacity-50"
                  >
                    <span>Sign In to Company ERP</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 text-[10px] text-slate-400 flex items-start gap-2">
                  <Briefcase className="w-3.5 h-3.5 text-brand-400 shrink-0 mt-0.5" />
                  <span>
                    Company Admins & Employees log in here with the assigned Company Access Code and role-based credentials.
                  </span>
                </div>
              </form>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-4 text-center text-xs text-slate-500 border-t border-slate-800/60 bg-slate-950/80">
        Enterprise ERP Suite • Relational Ledger & Multi-Tenant Engine • 100% Isolated
      </footer>
    </div>
  );
};
