// ============================================================================
// Fixed Assets & Asset Accounting Master Workspace (Phase 9 Enterprise Delivery)
// ============================================================================

import React, { useState } from 'react';
import { 
  Building2, 
  Layers, 
  Clock, 
  ArrowLeftRight, 
  TrendingDown, 
  Trash2, 
  Scale, 
  FileText, 
  DollarSign, 
  Plus 
} from 'lucide-react';
import { useAuth } from '@/modules/identity/context/AuthContext';
import { db } from '@/database/storage';
import { Card } from '@/ui/components/Card';
import { Button } from '@/ui/components/Button';
import { MetricCard } from '@/ui/data-display/MetricCard';
import { Breadcrumb } from '@/ui/components/Breadcrumb';
import { DropdownMenu } from '@/ui/components/DropdownMenu';
import { AssetRegisterView } from './AssetRegisterView';
import { AssetAcquisitionsView } from './AssetAcquisitionsView';
import { DepreciationRunView } from './DepreciationRunView';
import { AssetTransfersView } from './AssetTransfersView';
import { AssetImpairmentsView } from './AssetImpairmentsView';
import { AssetDisposalsView } from './AssetDisposalsView';
import { AssetCategoriesView } from './AssetCategoriesView';
import { AssetReportsView } from './AssetReportsView';
import { assetReportsService } from '../services/asset-reports.service';

export const AssetsWorkspace: React.FC = () => {
  const { tenant } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');

  const stats = assetReportsService.getOverviewStats(tenant);
  const recon = assetReportsService.getFixedAssetReconciliation(tenant);
  const pendingCapCount = db.getFixedAssets(tenant).filter(
    (a) => a.status === 'draft' || a.status === 'acquired'
  ).length;

  return (
    <div className="space-y-6">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <Breadcrumb
            items={[
              { label: 'Financial Accounting', onClick: () => setActiveTab('overview') },
              { label: 'Fixed Assets & Depreciation', isCurrent: true },
            ]}
          />
          <h1 className="text-2xl font-black text-foreground flex items-center gap-3 mt-1">
            <Building2 className="w-7 h-7 text-brand-600" />
            Fixed Assets & Asset Accounting
          </h1>
        </div>

        {/* Global Action Shortcuts */}
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => setActiveTab('acquisitions')}
            className="text-xs flex items-center gap-2 border-border text-foreground/90 hover:bg-muted"
          >
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            Capitalization Queue ({pendingCapCount})
          </Button>

          <Button
            variant="primary"
            onClick={() => setActiveTab('register')}
            className="text-xs flex items-center gap-2"
          >
            <Plus className="w-3.5 h-3.5" />
            Register Asset
          </Button>
        </div>
      </div>

      {/* KPI Metric Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Total Gross Asset Cost"
          value={`$${parseFloat(stats.totalOriginalCost).toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
          subtext={`${stats.activeAssetsCount} In-Service Assets`}
          icon={<Building2 className="w-5 h-5 text-brand-600" />}
        />
        <MetricCard
          label="Accum. Depreciation"
          value={`-$${parseFloat(stats.totalAccumulatedDepreciation).toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
          subtext="Contra Asset (#1520)"
          icon={<Clock className="w-5 h-5 text-amber-600" />}
        />
        <MetricCard
          label="Net Book Value (Carrying)"
          value={`$${parseFloat(stats.totalNetBookValue).toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
          subtext="Carrying Asset Value"
          icon={<DollarSign className="w-5 h-5 text-emerald-600" />}
        />
        <MetricCard
          label="Sub-Ledger Reconciliation"
          value={recon.variance.isBalanced ? 'Balanced' : 'Variance'}
          subtext={`Diff: $${recon.variance.netBookValueVariance}`}
          icon={<Scale className={`w-5 h-5 ${recon.variance.isBalanced ? 'text-emerald-600' : 'text-rose-600'}`} />}
        />
      </div>

      {/* Primary Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border text-sm font-medium">
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'overview', label: 'Overview', icon: Building2 },
            { id: 'register', label: `Asset Register (${stats.totalAssetsCount})`, icon: Building2 },
            { id: 'acquisitions', label: `Acquisitions (${pendingCapCount})`, icon: Clock },
            { id: 'depreciation', label: 'Depreciation Runs', icon: Clock },
            { id: 'transfers', label: 'Transfers', icon: ArrowLeftRight },
            { id: 'impairments', label: 'Impairments', icon: TrendingDown },
            { id: 'disposals', label: 'Disposals & Write-offs', icon: Trash2 },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 flex items-center gap-2 border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-brand-600 text-brand-600 font-bold bg-brand-50/50'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* More ▾ Dropdown Menu */}
        <div className="pb-2">
          <DropdownMenu
            label="More ▾"
            items={[
              {
                label: 'Asset Categories Config',
                icon: <Layers className="w-3.5 h-3.5" />,
                onClick: () => setActiveTab('categories'),
              },
              {
                label: 'Sub-Ledger Reconciliation',
                icon: <Scale className="w-3.5 h-3.5" />,
                onClick: () => setActiveTab('reports'),
              },
              {
                label: 'Reports & Gain/Loss',
                icon: <FileText className="w-3.5 h-3.5" />,
                onClick: () => setActiveTab('reports'),
              },
            ]}
          />
        </div>
      </div>

      {/* Main Workspace Content Area */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Quick Action Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <Card
              onClick={() => setActiveTab('register')}
              className="p-5 border border-border hover:border-brand-500 cursor-pointer transition-all hover:bg-muted/80 group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-brand-50 border border-brand-200 flex items-center justify-center text-brand-600 group-hover:scale-105 transition-transform">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-foreground">Asset Register</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">Explore physical asset inventory, RFID tags, serials, and carrying values.</p>
                </div>
              </div>
            </Card>

            <Card
              onClick={() => setActiveTab('depreciation')}
              className="p-5 border border-border hover:border-amber-500 cursor-pointer transition-all hover:bg-muted/80 group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 group-hover:scale-105 transition-transform">
                  <Clock className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-foreground">Depreciation Engine</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">Run monthly batch depreciation and post automated GL double-entry journals.</p>
                </div>
              </div>
            </Card>

            <Card
              onClick={() => setActiveTab('reports')}
              className="p-5 border border-border hover:border-emerald-500 cursor-pointer transition-all hover:bg-muted/80 group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 group-hover:scale-105 transition-transform">
                  <Scale className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-foreground">Sub-Ledger Reconciliation</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">Verify zero-variance integrity between Asset Sub-Ledger and GL Account #1510 / #1520.</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Asset Register Quick Snapshot */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">
                Active Capital Assets Register
              </h3>
              <Button size="sm" variant="ghost" onClick={() => setActiveTab('register')} className="text-xs text-brand-600 font-bold hover:text-brand-700">
                View Full Register →
              </Button>
            </div>
            <AssetRegisterView />
          </div>
        </div>
      )}

      {activeTab === 'register' && <AssetRegisterView />}
      {activeTab === 'acquisitions' && <AssetAcquisitionsView />}
      {activeTab === 'depreciation' && <DepreciationRunView />}
      {activeTab === 'transfers' && <AssetTransfersView />}
      {activeTab === 'impairments' && <AssetImpairmentsView />}
      {activeTab === 'disposals' && <AssetDisposalsView />}
      {activeTab === 'categories' && <AssetCategoriesView />}
      {activeTab === 'reports' && <AssetReportsView />}
    </div>
  );
};

export const AssetWorkspace = AssetsWorkspace;
