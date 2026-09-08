// ============================================================================
// Master Enterprise Application Shell Layout Frame (Responsive & Polished)
// ============================================================================

import React, { useState } from 'react';
import { SidebarNav } from './SidebarNav';
import { TopHeader } from './TopHeader';
import { ChevronRight, Home } from 'lucide-react';
import { useAuth } from '@/modules/identity/context/AuthContext';

export interface EnterpriseShellProps {
  currentView: string;
  onNavigate: (viewId: string) => void;
  children: React.ReactNode;
}

export const EnterpriseShell: React.FC<EnterpriseShellProps> = ({ currentView, onNavigate, children }) => {
  const { tenant } = useAuth();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Format breadcrumb title
  const getBreadcrumbTitle = (view: string) => {
    switch (view) {
      case 'dashboard': return 'Executive Overview';
      case 'sales': return 'Sales & Accounts Receivable';
      case 'purchases': return 'Purchases & Accounts Payable';
      case 'inventory': return 'Perpetual Inventory Management';
      case 'accounting': return 'Core Accounting & General Ledger';
      case 'banking': return 'Cash & Treasury Operations';
      case 'payroll': return 'Human Resources & Payroll';
      case 'assets': return 'Fixed Asset Registry & Depreciation';
      case 'projects': return 'Project Accounting & Job Costing';
      case 'reports': return 'Financial Statements & Reports';
      case 'settings': return 'System Settings & Organization';
      case 'superadmin': return 'Platform Super Admin Console';
      default:
        if (view.startsWith('module-')) {
          return `Future ERP Module: ${view.replace('module-', '').toUpperCase()}`;
        }
        return view;
    }
  };

  const handleToggleSidebar = () => {
    if (window.innerWidth < 1024) {
      setIsMobileSidebarOpen(!isMobileSidebarOpen);
    } else {
      setIsSidebarCollapsed(!isSidebarCollapsed);
    }
  };

  return (
    <div className="h-screen w-screen flex bg-slate-950 text-slate-900 overflow-hidden font-sans">
      {/* Dynamic Left Sidebar (Desktop + Mobile Drawer) */}
      <SidebarNav
        currentView={currentView}
        onNavigate={onNavigate}
        isCollapsed={isSidebarCollapsed}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <TopHeader
          onToggleSidebar={handleToggleSidebar}
          onNavigate={onNavigate}
          currentView={currentView}
        />

        {/* Breadcrumbs Bar */}
        <div className="h-9 px-3 sm:px-6 bg-slate-900/80 backdrop-blur-md border-b border-white/10 flex items-center justify-between text-xs select-none min-w-0">
          <div className="flex items-center gap-1.5 sm:gap-2 text-slate-400 min-w-0 pr-2">
            <button
              onClick={() => onNavigate('dashboard')}
              className="flex items-center gap-1 hover:text-white transition-colors shrink-0"
            >
              <Home className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden xs:inline text-slate-300">ERP</span>
            </button>
            <ChevronRight className="w-3 h-3 text-slate-600 shrink-0" />
            <span className="text-white font-medium truncate">{getBreadcrumbTitle(currentView)}</span>
          </div>

          <div className="hidden md:flex items-center gap-2 text-[11px] text-slate-400 shrink-0">
            <span className="truncate max-w-[200px]" title={tenant.companyName}>
              Tenant: <strong className="text-white">{tenant.companyName}</strong>
            </span>
            <span>•</span>
            <span className="shrink-0">
              Role: <strong className="text-emerald-400 font-mono">{tenant.roles[0]}</strong>
            </span>
          </div>
        </div>

        {/* Dynamic Viewport */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-5 md:p-6 bg-dot-grid text-slate-900">
          <div className="max-w-7xl mx-auto space-y-6 w-full min-w-0">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
