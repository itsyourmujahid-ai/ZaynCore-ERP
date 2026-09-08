// ============================================================================
// React Auth & Tenant Context Provider
// ============================================================================

import React, { createContext, useContext, useState, useEffect } from 'react';
import { TenantContext } from '@/core/types/common';
import { authService } from '../services/auth-service';
import { db } from '@/database/storage';
import { DbUser, DbCompany, DbBranch } from '@/database/types';
import { permissionService } from '@/modules/authorization/services/permission-service';
import { capabilityService } from '@/modules/capabilities/services/capability-service';

interface AuthContextType {
  isAuthenticated: boolean;
  currentUser: DbUser | undefined;
  tenant: TenantContext;
  allUsers: DbUser[];
  availableCompanies: DbCompany[];
  availableBranches: DbBranch[];
  loginSuperAdmin: (identifier: string, password: string) => DbUser;
  loginCompanyUser: (accessCode: string, identifier: string, password: string) => { user: DbUser; company: DbCompany };
  logout: () => void;
  switchUser: (userId: string) => void;
  switchCompany: (companyId: string) => void;
  switchBranch: (branchId: string) => void;
  hasPermission: (permission: string) => boolean;
  isModuleEnabled: (moduleKey: string) => boolean;
  isFeatureEnabled: (moduleKey: string, featureKey: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(authService.isAuthenticated());
  const [currentUser, setCurrentUser] = useState<DbUser | undefined>(authService.getCurrentUser());
  const [tenant, setTenant] = useState<TenantContext>(authService.getTenantContext());
  const [allUsers, setAllUsers] = useState<DbUser[]>(db.getUsers());
  const [availableCompanies, setAvailableCompanies] = useState<DbCompany[]>(db.getCompanies(tenant));
  const [availableBranches, setAvailableBranches] = useState<DbBranch[]>(db.getBranches(tenant));

  useEffect(() => {
    const update = () => {
      const auth = authService.isAuthenticated();
      const currentTenant = authService.getTenantContext();
      setIsAuthenticated(auth);
      setCurrentUser(authService.getCurrentUser());
      setTenant(currentTenant);
      setAllUsers(db.getUsers());
      setAvailableCompanies(db.getCompanies(currentTenant));
      setAvailableBranches(db.getBranches(currentTenant));
    };

    const unsubAuth = authService.subscribe(update);
    const unsubDb = db.subscribe(update);

    return () => {
      unsubAuth();
      unsubDb();
    };
  }, []);

  const handleLoginSuperAdmin = (identifier: string, password: string) => {
    return authService.loginSuperAdmin(identifier, password);
  };

  const handleLoginCompanyUser = (accessCode: string, identifier: string, password: string) => {
    return authService.loginCompanyUser(accessCode, identifier, password);
  };

  const handleLogout = () => {
    authService.logout();
  };

  const handleSwitchUser = (userId: string) => {
    authService.switchUser(userId);
  };

  const handleSwitchCompany = (companyId: string) => {
    authService.switchCompany(companyId);
  };

  const handleSwitchBranch = (branchId: string) => {
    authService.switchBranch(branchId);
  };

  const hasPermission = (permission: string) => {
    return permissionService.hasPermission(tenant, permission);
  };

  const isModuleEnabled = (moduleKey: string) => {
    return capabilityService.isModuleEnabled(tenant, moduleKey);
  };

  const isFeatureEnabled = (moduleKey: string, featureKey: string) => {
    return capabilityService.isFeatureEnabled(tenant, moduleKey, featureKey);
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        currentUser,
        tenant,
        allUsers,
        availableCompanies,
        availableBranches,
        loginSuperAdmin: handleLoginSuperAdmin,
        loginCompanyUser: handleLoginCompanyUser,
        logout: handleLogout,
        switchUser: handleSwitchUser,
        switchCompany: handleSwitchCompany,
        switchBranch: handleSwitchBranch,
        hasPermission,
        isModuleEnabled,
        isFeatureEnabled,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
