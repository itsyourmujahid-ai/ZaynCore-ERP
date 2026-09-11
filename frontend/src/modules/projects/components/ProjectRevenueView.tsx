// ============================================================================
// Project Revenue Register View (Phase 12: Project Accounting)
// ============================================================================

import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Search, 
  Layers, 
  FileText 
} from 'lucide-react';
import { useAuth } from '@/modules/identity/context/AuthContext';
import { Card } from '@/ui/components/Card';
import { MetricCard } from '@/ui/data-display/MetricCard';
import { projectService } from '../services/project.service';
import { db } from '@/database/storage';
import { DbProject, DbProjectRevenue } from '@/database/types';

export const ProjectRevenueView: React.FC = () => {
  const { tenant } = useAuth();
  const [revenues, setRevenues] = useState<DbProjectRevenue[]>([]);
  const [projects, setProjects] = useState<DbProject[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadData();
  }, [tenant]);

  const loadData = () => {
    const projs = projectService.getProjects(tenant);
    setProjects(projs);
    const revs = db.getProjectRevenues(tenant);
    setRevenues(revs);
  };

  const filteredRevenues = revenues.filter((r) => {
    const matchProj = selectedProjectId === 'all' || r.projectId === selectedProjectId;
    const matchSearch = r.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.documentNumber.toLowerCase().includes(searchQuery.toLowerCase());
    return matchProj && matchSearch;
  });

  const totalRevenueAmount = filteredRevenues.reduce((acc, r) => acc + parseFloat(r.baseAmount || '0'), 0);

  return (
    <div className="space-y-5">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard
          label="Total Recognized Project Revenue"
          value={`$${totalRevenueAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
          icon={<TrendingUp className="w-5 h-5 text-emerald-400" />}
          subtext={`Base: ${tenant.baseCurrency}`}
        />
        <MetricCard
          label="Sourced Revenue Transactions"
          value={`${filteredRevenues.length} Records`}
          icon={<FileText className="w-5 h-5 text-purple-400" />}
          subtext="Linked to Sales & AR"
        />
        <MetricCard
          label="Projects with Recognized Revenue"
          value={`${new Set(filteredRevenues.map((r) => r.projectId)).size} Projects`}
          icon={<Layers className="w-5 h-5 text-cyan-400" />}
          subtext="Active Invoiced Contracts"
        />
      </div>

      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card/60 p-3 rounded-lg border border-border">
        <div className="flex items-center gap-2 w-full sm:w-auto flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search revenues by description, invoice #..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-card border border-border rounded text-xs text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="px-2.5 py-1.5 bg-card border border-border rounded text-xs text-foreground focus:outline-none"
          >
            <option value="all">All Projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.code} — {p.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Revenue Register Table */}
      <Card
        title="Project Revenue Register"
        subtitle={`${filteredRevenues.length} revenue entries recognized in General Ledger`}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-foreground/90">
            <thead className="bg-card/60 text-muted-foreground font-semibold border-b border-border">
              <tr>
                <th className="p-3">Date</th>
                <th className="p-3">Project Code</th>
                <th className="p-3">Source Channel</th>
                <th className="p-3">Invoice / Document #</th>
                <th className="p-3">Description</th>
                <th className="p-3 text-right">Recognized Revenue</th>
                <th className="p-3 text-center">GL Journal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredRevenues.map((r) => {
                const p = projects.find((proj) => proj.id === r.projectId);
                return (
                  <tr key={r.id} className="hover:bg-muted/40 font-mono">
                    <td className="p-3 text-muted-foreground">{r.transactionDate}</td>
                    <td className="p-3 font-sans font-bold text-cyan-400">{p?.code || r.projectId}</td>
                    <td className="p-3 text-[11px] text-purple-400 uppercase font-mono">
                      {r.sourceModule}:{r.sourceType}
                    </td>
                    <td className="p-3 text-emerald-400 font-semibold">{r.documentNumber}</td>
                    <td className="p-3 font-sans text-foreground/90">{r.description}</td>
                    <td className="p-3 text-right font-bold text-emerald-400">${parseFloat(r.amount).toLocaleString()}</td>
                    <td className="p-3 text-center">
                      <span className="text-[11px] font-mono text-muted-foreground bg-muted/60 px-2 py-0.5 rounded border border-border">
                        {r.journalEntryId ? r.journalEntryId.slice(0, 10) : 'Posted'}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {filteredRevenues.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-muted-foreground font-sans">
                    No recognized project revenue yet. Billed milestones, fixed schedules, and T&M invoices will appear here.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
