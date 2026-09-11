// ============================================================================
// Master Enterprise Application Shell Layout Frame (Responsive & Polished)
// ============================================================================

import React, { useState } from 'react';
import { SidebarNav } from './SidebarNav';
import { TopHeader } from './TopHeader';
import { ChevronRight, Home } from 'lucide-react';
import { useAuth } from '@/modules/identity/context/AuthContext';
import { InteractiveBackground } from '@/ui/components/InteractiveBackground';
import { ErrorBoundary } from '@/ui/components/ErrorBoundary';
import { PageTransition } from './PageTransition';

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
    <div className="h-screen w-screen flex bg-background text-foreground overflow-hidden font-sans relative">
      {/* Interactive Mouse-Reactive Dot Grid Background */}
      <InteractiveBackground />

      {/* Dynamic Left Sidebar (Desktop + Mobile Drawer) */}
      <SidebarNav
        currentView={currentView}
        onNavigate={onNavigate}
        isCollapsed={isSidebarCollapsed}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative z-10">
        {/* Top Header */}
        <TopHeader
          onToggleSidebar={handleToggleSidebar}
          onNavigate={onNavigate}
          currentView={currentView}
        />

        {/* Breadcrumbs Bar */}
        <div className="h-9 px-3 sm:px-6 bg-card/75 backdrop-blur-md border-b border-border/80 flex items-center justify-between text-xs select-none min-w-0 shadow-sm">
          <div className="flex items-center gap-1.5 sm:gap-2 text-muted-foreground min-w-0 pr-2">
            <button
              onClick={() => onNavigate('dashboard')}
              className="flex items-center gap-1 hover:text-foreground transition-colors shrink-0"
            >
              <Home className="w-3.5 h-3.5 text-primary" />
              <span className="hidden xs:inline text-foreground font-medium">ERP</span>
            </button>
            <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0" />
            <span className="text-foreground font-semibold truncate">{getBreadcrumbTitle(currentView)}</span>
          </div>

          <div className="hidden md:flex items-center gap-2 text-[11px] text-muted-foreground shrink-0">
            <span className="truncate max-w-[200px]" title={tenant.companyName}>
              Tenant: <strong className="text-foreground">{tenant.companyName}</strong>
            </span>
            <span>•</span>
            <span className="shrink-0">
              Role: <strong className="text-primary font-mono font-semibold">{tenant.roles[0]}</strong>
            </span>
          </div>
        </div>

        {/* Dynamic Viewport with Apple-Style Fluid Page Transition */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-5 md:p-6 text-foreground">
          <div className="max-w-7xl mx-auto space-y-6 w-full min-w-0">
            <ErrorBoundary>
              <PageTransition viewKey={currentView}>
                {children}
              </PageTransition>
            </ErrorBoundary>
          </div>
        </main>
      </div>
    </div>
  );
};
