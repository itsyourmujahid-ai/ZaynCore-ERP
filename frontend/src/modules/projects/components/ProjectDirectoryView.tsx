// ============================================================================
// Project Directory & Master Registry View (Phase 12: Project Management)
// ============================================================================

import React, { useState, useEffect } from 'react';
import { 
  Briefcase, 
  Search, 
  Plus, 
  Trash2
} from 'lucide-react';
import { useAuth } from '@/modules/identity/context/AuthContext';
import { Card } from '@/ui/components/Card';
import { Button } from '@/ui/components/Button';
import { StatusBadge } from '@/ui/data-display/StatusBadge';
import { projectService } from '../services/project.service';
import { 
  DbProject, 
  DbProjectType, 
  ProjectBillingMethod 
} from '@/database/types';

interface ProjectDirectoryProps {
  onOpenProject: (projectId: string) => void;
  createModalOpen: boolean;
  onCloseCreateModal: () => void;
  onOpenCreateModal: () => void;
}

export const ProjectDirectoryView: React.FC<ProjectDirectoryProps> = ({
  onOpenProject,
  createModalOpen,
  onCloseCreateModal,
  onOpenCreateModal,
}) => {
  const { tenant } = useAuth();
  const [projects, setProjects] = useState<DbProject[]>([]);
  const [projectTypes, setProjectTypes] = useState<DbProjectType[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Form State for Create Project
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [projectTypeId, setProjectTypeId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [projectManagerName, setProjectManagerName] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState('');
  const [billingMethod, setBillingMethod] = useState<ProjectBillingMethod>('milestone');
  const [budgetAmount, setBudgetAmount] = useState('50000.00');
  const [contractValue, setContractValue] = useState('75000.00');
  const [formError, setFormError] = useState('');

  useEffect(() => {
    loadProjects();
  }, [tenant]);

  const loadProjects = () => {
    const list = projectService.getProjects(tenant);
    setProjects(list);
    const types = projectService.getProjectTypes(tenant);
    setProjectTypes(types);
    if (types.length > 0 && !projectTypeId) {
      setProjectTypeId(types[0].id);
    }
  };

  const filteredProjects = projects.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.customerName && p.customerName.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchStatus = statusFilter === 'all' || p.status === statusFilter;
    const matchType = typeFilter === 'all' || p.projectTypeId === typeFilter;
    return matchSearch && matchStatus && matchType;
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    try {
      projectService.createProject({
        code,
        name,
        description,
        projectTypeId,
        customerName: customerName || undefined,
        projectManagerName: projectManagerName || undefined,
        startDate,
        endDate: endDate || undefined,
        billingMethod,
        budgetAmount,
        contractValue,
      }, tenant);

      // Reset & Reload
      setCode('');
      setName('');
      setDescription('');
      onCloseCreateModal();
      loadProjects();
    } catch (err: any) {
      setFormError(err.message || 'Failed to create project.');
    }
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this project?')) {
      try {
        projectService.deleteProject(id, tenant);
        loadProjects();
      } catch (err: any) {
        alert(err.message || 'Cannot delete project with historical transactions.');
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-lg border border-slate-800">
        <div className="flex items-center gap-2 w-full sm:w-auto flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search projects by code, title, customer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-700 rounded text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded text-xs text-slate-200 focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="on_hold">On Hold</option>
            <option value="completed">Completed</option>
            <option value="closed">Closed</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded text-xs text-slate-200 focus:outline-none"
          >
            <option value="all">All Project Types</option>
            {projectTypes.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>

          <Button size="sm" variant="primary" icon={<Plus className="w-4 h-4" />} onClick={onOpenCreateModal}>
            New Project
          </Button>
        </div>
      </div>

      {/* Projects Table */}
      <Card title="Projects Master Directory" subtitle={`${filteredProjects.length} projects matched`}>
        {filteredProjects.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Briefcase className="w-10 h-10 text-slate-600 mx-auto" />
            <p className="text-xs text-slate-400">No projects match the current search or filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/60 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="p-3">Project Code</th>
                  <th className="p-3">Title & Classification</th>
                  <th className="p-3">Customer</th>
                  <th className="p-3">Project Manager</th>
                  <th className="p-3 text-right">Contract Value</th>
                  <th className="p-3 text-right">Budget</th>
                  <th className="p-3">Billing Method</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredProjects.map((p) => {
                  const pType = projectTypes.find((t) => t.id === p.projectTypeId);
                  return (
                    <tr
                      key={p.id}
                      onClick={() => onOpenProject(p.id)}
                      className="hover:bg-slate-800/40 cursor-pointer transition-colors"
                    >
                      <td className="p-3 font-mono font-bold text-cyan-400">{p.code}</td>
                      <td className="p-3">
                        <div className="font-semibold text-slate-200">{p.name}</div>
                        <div className="text-[11px] text-slate-500">{pType?.name || 'General Project'}</div>
                      </td>
                      <td className="p-3 text-slate-300">{p.customerName || 'Internal / R&D'}</td>
                      <td className="p-3 text-slate-400">{p.projectManagerName || 'Unassigned'}</td>
                      <td className="p-3 text-right font-medium text-emerald-400">
                        ${parseFloat(p.contractValue).toLocaleString()} {p.currency}
                      </td>
                      <td className="p-3 text-right font-mono text-slate-300">
                        ${parseFloat(p.budgetAmount).toLocaleString()}
                      </td>
                      <td className="p-3">
                        <span className="capitalize px-2 py-0.5 rounded bg-slate-800 text-[11px] text-slate-300 border border-slate-700">
                          {p.billingMethod.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="p-3">
                        <StatusBadge status={p.status} />
                      </td>
                      <td className="p-3 text-center">
                        <button
                          onClick={(e) => handleDelete(p.id, e)}
                          title="Delete Project"
                          className="p-1 hover:text-rose-400 text-slate-500 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Create Project Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-xl w-full p-6 space-y-4 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-cyan-400" />
                Create Enterprise Project
              </h3>
              <button onClick={onCloseCreateModal} className="text-slate-400 hover:text-slate-200">
                ✕
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Project Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. PRJ-2026-001"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded text-slate-100 focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Project Classification *</label>
                  <select
                    required
                    value={projectTypeId}
                    onChange={(e) => setProjectTypeId(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded text-slate-100 focus:outline-none focus:border-cyan-500"
                  >
                    {projectTypes.map((t) => (
                      <option key={t.id} value={t.id}>{t.name} ({t.category})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Project Title / Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Global ERP NextGen Implementation"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Customer / Client</label>
                  <input
                    type="text"
                    placeholder="e.g. Acme Corporation"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded text-slate-100 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Project Manager</label>
                  <input
                    type="text"
                    placeholder="e.g. Sarah Jenkins, PMP"
                    value={projectManagerName}
                    onChange={(e) => setProjectManagerName(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded text-slate-100 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Start Date *</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded text-slate-100 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Target Completion Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded text-slate-100 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Billing Method</label>
                  <select
                    value={billingMethod}
                    onChange={(e) => setBillingMethod(e.target.value as ProjectBillingMethod)}
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded text-slate-100 focus:outline-none"
                  >
                    <option value="milestone">Milestone Billing</option>
                    <option value="fixed_price">Fixed Price</option>
                    <option value="time_and_material">Time & Material (T&M)</option>
                    <option value="progress_billing">Progress Billing</option>
                    <option value="manual">Manual Billing</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Budget Amount ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={budgetAmount}
                    onChange={(e) => setBudgetAmount(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded text-slate-100 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Contract Value ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={contractValue}
                    onChange={(e) => setContractValue(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded text-slate-100 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Description / Project Scope</label>
                <textarea
                  rows={2}
                  placeholder="Outline key deliverables, contract terms, and specifications..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded text-slate-100 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <Button size="sm" variant="ghost" onClick={onCloseCreateModal}>
                  Cancel
                </Button>
                <Button size="sm" variant="primary" type="submit">
                  Save & Initialize Project
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
