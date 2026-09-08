// ============================================================================
// Group Accounting & Consolidation Master Workspace (Phase 14)
// ============================================================================

import React, { useState } from 'react';
import { 
  Building2, 
  ArrowLeftRight, 
  Scale, 
  BookOpen, 
  Layers 
} from 'lucide-react';
import { Tabs } from '@/ui/components/Tabs';
import { Breadcrumb } from '@/ui/components/Breadcrumb';
import { GroupOverviewView } from './GroupOverviewView';
import { IntercompanyTransactionsView } from './IntercompanyTransactionsView';
import { IntercompanyReconciliationView } from './IntercompanyReconciliationView';
import { GroupCoaMappingView } from './GroupCoaMappingView';
import { ConsolidationWorkbenchView } from './ConsolidationWorkbenchView';

export const ConsolidationWorkspace: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'intercompany' | 'reconciliation' | 'coa_mapping' | 'statements'>('overview');

  const tabs = [
    { id: 'overview', label: 'Group Overview', icon: <Building2 className="w-3.5 h-3.5" /> },
    { id: 'intercompany', label: 'Intercompany Transactions', icon: <ArrowLeftRight className="w-3.5 h-3.5" /> },
    { id: 'reconciliation', label: 'IC Reconciliation', icon: <Scale className="w-3.5 h-3.5" /> },
    { id: 'coa_mapping', label: 'Group COA & Mapping', icon: <BookOpen className="w-3.5 h-3.5" /> },
    { id: 'statements', label: 'Consolidated Statements', icon: <Layers className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="space-y-5">
      {/* Breadcrumb Navigation */}
      <Breadcrumb
        items={[
          { label: 'Financial Accounting', onClick: () => {} },
          { label: 'Group & Consolidation', isCurrent: true },
        ]}
      />

      {/* Main Tab Navigation */}
      <Tabs
        activeTab={activeTab}
        onChange={(tab) => setActiveTab(tab as any)}
        tabs={tabs}
      />

      {/* Active Tab View */}
      {activeTab === 'overview' && <GroupOverviewView />}
      {activeTab === 'intercompany' && <IntercompanyTransactionsView />}
      {activeTab === 'reconciliation' && <IntercompanyReconciliationView />}
      {activeTab === 'coa_mapping' && <GroupCoaMappingView />}
      {activeTab === 'statements' && <ConsolidationWorkbenchView />}
    </div>
  );
};
