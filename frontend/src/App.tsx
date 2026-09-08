// ============================================================================
// Master Application Entrypoint & Workspace Router
// ============================================================================

import React, { useState } from 'react';
import { ThemeProvider } from '@/core/theme/ThemeContext';
import { AuthProvider } from '@/modules/identity/context/AuthContext';
import { EnterpriseShell } from '@/ui/layout/EnterpriseShell';
import { DashboardView } from '@/modules/platform/components/DashboardView';
import { SuperAdminPortal } from '@/modules/platform/components/SuperAdminPortal';
import { AccountingWorkspace } from '@/modules/accounting/components/AccountingWorkspace';
import { SalesWorkspace } from '@/modules/sales/components/SalesWorkspace';
import { PurchasesWorkspace } from '@/modules/purchases/components/PurchasesWorkspace';
import { InventoryWorkspace } from '@/modules/inventory/components/InventoryWorkspace';
import { BankingWorkspace } from '@/modules/banking/components/BankingWorkspace';
import { PayrollWorkspace } from '@/modules/payroll/components/PayrollWorkspace';
import { AssetsWorkspace } from '@/modules/assets/components/AssetsWorkspace';
import { ProjectsWorkspace } from '@/modules/projects/components/ProjectsWorkspace';
import { ReportsWorkspace } from '@/modules/reports/components/ReportsWorkspace';
import { TaxWorkspace } from '@/modules/tax/components/TaxWorkspace';
import { SettingsWorkspace } from '@/modules/settings/components/SettingsWorkspace';
import { LoginPage } from '@/modules/identity/components/LoginPage';
import { useAuth } from '@/modules/identity/context/AuthContext';

const MainRouter: React.FC = () => {
  const { isAuthenticated, tenant, availableCompanies } = useAuth();
  const [currentView, setCurrentView] = useState<string>(
    tenant.isPlatformAdmin ? 'superadmin' : 'dashboard'
  );

  // Sync view based on authorization changes
  React.useEffect(() => {
    if (tenant.isPlatformAdmin && (availableCompanies.length === 0 || currentView === 'dashboard')) {
      setCurrentView('superadmin');
    } else if (!tenant.isPlatformAdmin && currentView === 'superadmin') {
      setCurrentView('dashboard');
    }
  }, [tenant.isPlatformAdmin, tenant.userId, availableCompanies.length]);

  // If not authenticated, always display Login Page
  if (!isAuthenticated) {
    return <LoginPage />;
  }

  const renderActiveView = () => {
    switch (currentView) {
      case 'dashboard':
        return <DashboardView onNavigate={setCurrentView} />;
      
      // Primary Workspaces
      case 'sales':
        return <SalesWorkspace onNavigateAccounting={() => setCurrentView('accounting')} />;
      case 'purchases':
        return <PurchasesWorkspace onNavigateAccounting={() => setCurrentView('accounting')} />;
      case 'inventory':
        return <InventoryWorkspace />;
      case 'accounting':
        return <AccountingWorkspace onNavigateReports={() => setCurrentView('reports')} />;
      case 'tax':
        return <TaxWorkspace onNavigateAccounting={() => setCurrentView('accounting')} />;
      case 'banking':
        return <BankingWorkspace />;
      case 'payroll':
        return <PayrollWorkspace />;
      case 'assets':
        return <AssetsWorkspace />;
      case 'projects':
        return <ProjectsWorkspace />;
      case 'reports':
        return <ReportsWorkspace />;
      case 'settings':
        return <SettingsWorkspace onNavigate={setCurrentView} />;

      // Super Admin Platform Console
      case 'superadmin':
        return <SuperAdminPortal />;

      // Backwards Compatibility / Deep Links to Tabs inside Workspaces
      case 'coa':
        return <AccountingWorkspace initialTab="general-ledger" onNavigateReports={() => setCurrentView('reports')} />;
      case 'journals':
        return <AccountingWorkspace initialTab="journals" onNavigateReports={() => setCurrentView('reports')} />;
      case 'accounting-engine':
        return <AccountingWorkspace initialTab="overview" onNavigateReports={() => setCurrentView('reports')} />;
      case 'companies':
        return <SettingsWorkspace initialTab="company" onNavigate={setCurrentView} />;
      case 'fiscal-periods':
        return <SettingsWorkspace initialTab="periods" onNavigate={setCurrentView} />;
      case 'roles':
        return <SettingsWorkspace initialTab="rbac" onNavigate={setCurrentView} />;
      case 'audit':
        return <SettingsWorkspace initialTab="audit" onNavigate={setCurrentView} />;
      case 'registry':
        return <SettingsWorkspace initialTab="capabilities" onNavigate={setCurrentView} />;

      default:
        return <DashboardView onNavigate={setCurrentView} />;
    }
  };

  return (
    <EnterpriseShell currentView={currentView} onNavigate={setCurrentView}>
      {renderActiveView()}
    </EnterpriseShell>
  );
};

export function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <MainRouter />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
