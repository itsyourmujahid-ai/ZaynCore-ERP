// ============================================================================
// Fiscal Years & Accounting Period Lock Management
// ============================================================================

import React, { useState } from 'react';
import { 
  Calendar, 
  Lock, 
  Unlock, 
  ShieldAlert,
  Clock
} from 'lucide-react';
import { useAuth } from '@/modules/identity/context/AuthContext';
import { db } from '@/database/storage';
import { Card } from '@/ui/components/Card';
import { Button } from '@/ui/components/Button';
import { StatusBadge } from '@/ui/data-display/StatusBadge';
import { Can } from '@/modules/authorization/components/Can';

export const FiscalPeriodsView: React.FC = () => {
  const { tenant } = useAuth();
  const fiscalYears = db.getFiscalYears(tenant);
  const periods = db.getAccountingPeriods(tenant);
  const [selectedFyId, setSelectedFyId] = useState(fiscalYears[0]?.id || '');

  const filteredPeriods = periods.filter((p) => p.fiscalYearId === selectedFyId);

  const handleStatusChange = (periodId: string, status: 'open' | 'locked' | 'closed') => {
    try {
      db.setPeriodStatus(periodId, status, tenant);
    } catch (e: any) {
      alert(e.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400">Financial Governance</span>
            <span className="text-slate-600">•</span>
            <span className="text-xs text-slate-400">Tenant: {tenant.companyName}</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-100 mt-1">Fiscal Periods & Period Locks</h1>
          <p className="text-xs text-slate-400 mt-1">
            Enforce period locks and month-end closes. Posted transactions are strictly prohibited in locked or closed periods.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {fiscalYears.map((fy) => (
            <button
              key={fy.id}
              onClick={() => setSelectedFyId(fy.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                selectedFyId === fy.id
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {fy.name} ({fy.startDate} to {fy.endDate})
            </button>
          ))}
        </div>
      </div>

      {/* Security Notice Card */}
      <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200 flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <strong className="font-semibold block text-amber-100">Accounting Integrity Period Lock Principle:</strong>
          <span>
            When a financial period is marked as <strong>LOCKED</strong> or <strong>CLOSED</strong>, all automatic posting engines, sub-ledger syncs, and manual adjustment journals targeting that date range will be rejected with an immutable domain violation exception.
          </span>
        </div>
      </div>

      {/* Periods Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPeriods.map((period) => {
          const isOpen = period.status === 'open';
          const isLocked = period.status === 'locked';
          const isClosed = period.status === 'closed';

          return (
            <Card
              key={period.id}
              className={`transition-all ${
                isOpen ? 'border-emerald-500/30' : isLocked ? 'border-amber-500/30' : 'border-slate-800'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-100">{period.name}</span>
                    <StatusBadge status={period.status} size="xs" />
                  </div>
                  <div className="text-xs text-slate-400 mt-1 flex items-center gap-1.5 font-mono">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    <span>{period.startDate}</span>
                    <span>→</span>
                    <span>{period.endDate}</span>
                  </div>
                </div>

                <div className={`p-2 rounded-lg ${
                  isOpen ? 'bg-emerald-500/10 text-emerald-400' : isLocked ? 'bg-amber-500/10 text-amber-400' : 'bg-rose-500/10 text-rose-400'
                }`}>
                  {isOpen ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                </div>
              </div>

              {period.lockedAt && (
                <div className="mt-3 pt-2.5 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-500" />
                  <span>Locked on: {new Date(period.lockedAt).toLocaleDateString()}</span>
                </div>
              )}

              {/* Action Controls */}
              <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                <Can permission="accounting.lock_period" fallback={<span className="text-[10px] text-slate-500">Requires 'accounting.lock_period'</span>}>
                  <div className="flex items-center gap-1.5 w-full">
                    <Button
                      variant={isOpen ? 'primary' : 'outline'}
                      size="xs"
                      className="flex-1"
                      disabled={isOpen}
                      onClick={() => handleStatusChange(period.id, 'open')}
                    >
                      Re-Open
                    </Button>
                    <Button
                      variant={isLocked ? 'secondary' : 'outline'}
                      size="xs"
                      className="flex-1"
                      disabled={isLocked}
                      onClick={() => handleStatusChange(period.id, 'locked')}
                    >
                      Lock Period
                    </Button>
                    <Button
                      variant={isClosed ? 'danger' : 'outline'}
                      size="xs"
                      className="flex-1"
                      disabled={isClosed}
                      onClick={() => handleStatusChange(period.id, 'closed')}
                    >
                      Close Period
                    </Button>
                  </div>
                </Can>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
