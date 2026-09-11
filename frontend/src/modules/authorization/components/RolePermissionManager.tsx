// ============================================================================
// Role-Based Access Control (RBAC) & Granular Permission Matrix Manager
// ============================================================================

import React, { useState } from 'react';
import { 
  Check, 
  X, 
  Save
} from 'lucide-react';
import { useAuth } from '@/modules/identity/context/AuthContext';
import { db } from '@/database/storage';
import { Card } from '@/ui/components/Card';
import { Button } from '@/ui/components/Button';
import { Badge } from '@/ui/components/Badge';
import { ERP_MODULE_REGISTRY } from '@/modules/registry/registry';
import { DbRole } from '@/database/types';

export const RolePermissionManager: React.FC = () => {
  const { tenant } = useAuth();
  const [roles, setRoles] = useState<DbRole[]>(db.getRoles(tenant));
  const [selectedRoleId, setSelectedRoleId] = useState<string>(roles[1]?.id || roles[0]?.id);
  const [editedPermissions, setEditedPermissions] = useState<string[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const selectedRole = roles.find((r) => r.id === selectedRoleId) || roles[0];

  const handleSelectRole = (role: DbRole) => {
    setSelectedRoleId(role.id);
    setEditedPermissions([...role.permissions]);
    setHasUnsavedChanges(false);
  };

  React.useEffect(() => {
    if (selectedRole) {
      setEditedPermissions([...selectedRole.permissions]);
      setHasUnsavedChanges(false);
    }
  }, [selectedRoleId]);

  const togglePermission = (permCode: string) => {
    if (selectedRole?.code === 'SUPER_ADMIN') return;

    let next: string[];
    if (editedPermissions.includes(permCode)) {
      next = editedPermissions.filter((p) => p !== permCode);
    } else {
      next = [...editedPermissions, permCode];
    }
    setEditedPermissions(next);
    setHasUnsavedChanges(true);
  };

  const handleSavePermissions = () => {
    if (!selectedRole) return;
    try {
      db.updateRolePermissions(selectedRole.id, editedPermissions, tenant);
      setRoles(db.getRoles(tenant));
      setHasUnsavedChanges(false);
      alert(`Permissions updated successfully for role '${selectedRole.name}'!`);
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-400">Security & Authorization</span>
            <span className="text-muted-foreground">•</span>
            <span className="text-xs text-muted-foreground">Tenant: {tenant.companyName}</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground mt-1">Roles & Granular RBAC</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Configure fine-grained resource permissions across all ERP modules for system and custom roles.
          </p>
        </div>

        {hasUnsavedChanges && (
          <Button
            variant="primary"
            icon={<Save className="w-4 h-4" />}
            onClick={handleSavePermissions}
          >
            Save Permission Matrix
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Column: Roles Selector */}
        <div className="space-y-3">
          <span className="text-xs font-bold uppercase text-muted-foreground tracking-wider block px-1">
            Available Roles ({roles.length})
          </span>
          <div className="space-y-1.5">
            {roles.map((role) => {
              const isSelected = role.id === selectedRoleId;
              return (
                <div
                  key={role.id}
                  onClick={() => handleSelectRole(role)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-brand-600/10 border-brand-500/50 shadow-sm'
                      : 'bg-card border-border hover:bg-muted/60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground">{role.name}</span>
                    {role.isSystemRole && <Badge variant="purple" size="xs">SYSTEM</Badge>}
                  </div>
                  <div className="text-[10px] font-mono text-muted-foreground mt-0.5">{role.code}</div>
                  <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{role.description}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right 3 Cols: Granular Permission Matrix */}
        <div className="lg:col-span-3 space-y-4">
          <Card
            title={`Permissions for: ${selectedRole?.name} (${selectedRole?.code})`}
            subtitle={selectedRole?.code === 'SUPER_ADMIN' ? 'Super Admin automatically has unrestricted wildcard (*) access' : 'Toggle granular permissions per domain'}
            action={
              hasUnsavedChanges && (
                <Button size="xs" variant="primary" onClick={handleSavePermissions}>
                  Save Changes
                </Button>
              )
            }
          >
            <div className="space-y-6">
              {ERP_MODULE_REGISTRY.map((mod) => {
                if (mod.permissions.length === 0) return null;

                return (
                  <div key={mod.key} className="p-4 rounded-xl bg-card/60 border border-border space-y-3">
                    <div className="flex items-center justify-between border-b border-border pb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-foreground">{mod.name}</span>
                        <span className="font-mono text-[10px] text-muted-foreground">[{mod.key}]</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground uppercase font-semibold">
                        {mod.permissions.length} Available Permissions
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                      {mod.permissions.map((perm) => {
                        const isGranted = selectedRole?.code === 'SUPER_ADMIN' || editedPermissions.includes('*') || editedPermissions.includes(perm.code);
                        const isSuper = selectedRole?.code === 'SUPER_ADMIN';

                        return (
                          <div
                            key={perm.code}
                            onClick={() => !isSuper && togglePermission(perm.code)}
                            className={`p-2.5 rounded-lg border transition-all flex items-start justify-between gap-2 ${
                              isSuper
                                ? 'bg-card/60 border-border opacity-90 cursor-default'
                                : isGranted
                                ? 'bg-brand-500/10 border-brand-500/30 cursor-pointer hover:bg-brand-500/15'
                                : 'bg-card/40 border-border/80 cursor-pointer hover:bg-muted/40 opacity-70'
                            }`}
                          >
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className={`text-xs font-semibold ${isGranted ? 'text-brand-300' : 'text-foreground/90'}`}>
                                  {perm.name}
                                </span>
                              </div>
                              <span className="font-mono text-[10px] text-muted-foreground block">{perm.code}</span>
                              <p className="text-[11px] text-muted-foreground mt-0.5">{perm.description}</p>
                            </div>

                            <div className="shrink-0 mt-0.5">
                              {isGranted ? (
                                <div className="w-5 h-5 rounded bg-brand-500 flex items-center justify-center text-white">
                                  <Check className="w-3.5 h-3.5" />
                                </div>
                              ) : (
                                <div className="w-5 h-5 rounded bg-muted border border-border flex items-center justify-center text-muted-foreground">
                                  <X className="w-3.5 h-3.5" />
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
