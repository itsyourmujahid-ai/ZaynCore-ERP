// ============================================================================
// HR Designation Master Management View
// ============================================================================

import React, { useState, useEffect } from 'react';
import {
  Briefcase,
  Plus,
  Search,
  Edit2,
  Trash2,
  Building2,
  Tag,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { useAuth } from '@/modules/identity/context/AuthContext';
import { Card } from '@/ui/components/Card';
import { Button } from '@/ui/components/Button';
import { DbDesignation } from '@/database/types';
import { EntityStatus } from '@/core/types/common';
import { db } from '@/database/storage';

export const DesignationsView: React.FC = () => {
  const { tenant } = useAuth();
  const [designations, setDesignations] = useState<DbDesignation[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDesignation, setEditingDesignation] = useState<DbDesignation | null>(null);

  // Form State
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formDepartmentId, setFormDepartmentId] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formStatus, setFormStatus] = useState<EntityStatus>('active');

  const departments = db.getDepartments(tenant);
  const employees = db.getEmployees(tenant);

  const loadData = () => {
    setDesignations(db.getDesignations(tenant));
  };

  useEffect(() => {
    loadData();
    const unsub = db.subscribe(() => loadData());
    return unsub;
  }, [tenant]);

  const filteredDesignations = designations.filter((d) => {
    const matchesSearch =
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.description && d.description.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesDept =
      selectedDeptFilter === 'all' ||
      (selectedDeptFilter === 'unassigned' && !d.departmentId) ||
      d.departmentId === selectedDeptFilter;

    return matchesSearch && matchesDept;
  });

  const handleOpenCreate = () => {
    setEditingDesignation(null);
    setFormName('');
    setFormCode(`DESG-${(designations.length + 1).toString().padStart(3, '0')}`);
    setFormDepartmentId(departments[0]?.id || '');
    setFormDescription('');
    setFormStatus('active');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (desg: DbDesignation) => {
    setEditingDesignation(desg);
    setFormName(desg.name);
    setFormCode(desg.code);
    setFormDepartmentId(desg.departmentId || '');
    setFormDescription(desg.description || '');
    setFormStatus(desg.status);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string, name: string) => {
    const attachedEmployees = employees.filter((e) => e.designationId === id || e.designation === name);
    if (attachedEmployees.length > 0) {
      alert(`Cannot delete designation "${name}" because ${attachedEmployees.length} employee(s) are currently assigned to it.`);
      return;
    }
    if (confirm(`Are you sure you want to delete designation "${name}"?`)) {
      db.deleteDesignation(id, tenant);
      loadData();
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const dept = departments.find((d) => d.id === formDepartmentId);

    if (editingDesignation) {
      db.updateDesignation(
        editingDesignation.id,
        {
          name: formName.trim(),
          code: formCode.trim().toUpperCase(),
          departmentId: formDepartmentId || undefined,
          departmentCode: dept?.code,
          description: formDescription.trim(),
          status: formStatus,
        },
        tenant
      );
    } else {
      db.createDesignation(
        {
          name: formName.trim(),
          code: formCode.trim().toUpperCase(),
          departmentId: formDepartmentId || undefined,
          departmentCode: dept?.code,
          description: formDescription.trim(),
          status: formStatus,
        },
        tenant
      );
    }
    setIsModalOpen(false);
    loadData();
  };

  return (
    <div className="space-y-6">
      {/* Search & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by designation title, code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-500"
            />
          </div>
          <select
            value={selectedDeptFilter}
            onChange={(e) => setSelectedDeptFilter(e.target.value)}
            className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-brand-500"
          >
            <option value="all">All Departments</option>
            {departments.map((dept) => (
              <option key={dept.id} value={dept.id}>
                {dept.name} ({dept.code})
              </option>
            ))}
            <option value="unassigned">General / Unassigned</option>
          </select>
        </div>

        <Button variant="primary" size="sm" icon={<Plus className="w-4 h-4" />} onClick={handleOpenCreate}>
          Add Designation
        </Button>
      </div>

      {/* Designations Grid / Table */}
      <Card
        title={`Company Designations & Job Roles (${filteredDesignations.length})`}
        subtitle="Manage official HR titles, organizational hierarchy levels, and department associations"
      >
        {filteredDesignations.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            <Briefcase className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            No designations found. Click &quot;Add Designation&quot; to configure job roles.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/50 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="p-3">Designation Title</th>
                  <th className="p-3">Code</th>
                  <th className="p-3">Department</th>
                  <th className="p-3">Assigned Staff</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredDesignations.map((desg) => {
                  const dept = departments.find((d) => d.id === desg.departmentId);
                  const staffCount = employees.filter(
                    (e) => e.designationId === desg.id || e.designation === desg.name || e.jobTitle === desg.name
                  ).length;

                  return (
                    <tr key={desg.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="p-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-cyan-950/60 border border-cyan-800/40 flex items-center justify-center font-bold text-xs text-cyan-400">
                            <Tag className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-semibold text-slate-200">{desg.name}</div>
                            {desg.description && (
                              <div className="text-[11px] text-slate-400 line-clamp-1">{desg.description}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-3 font-mono text-slate-300 font-semibold">{desg.code}</td>
                      <td className="p-3">
                        {dept ? (
                          <div className="flex items-center gap-1.5 text-slate-300">
                            <Building2 className="w-3.5 h-3.5 text-slate-500" />
                            <span>{dept.name}</span>
                            <span className="text-[10px] text-slate-500 font-mono">({dept.code})</span>
                          </div>
                        ) : (
                          <span className="text-slate-500 italic">General / All Departments</span>
                        )}
                      </td>
                      <td className="p-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-800 text-slate-300 border border-slate-700">
                          {staffCount} {staffCount === 1 ? 'employee' : 'employees'}
                        </span>
                      </td>
                      <td className="p-3">
                        {desg.status === 'active' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-950/60 text-emerald-400 border border-emerald-800/50">
                            <CheckCircle2 className="w-3 h-3" /> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-rose-950/60 text-rose-400 border border-rose-800/50">
                            <XCircle className="w-3 h-3" /> Inactive
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(desg)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                            title="Edit Designation"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(desg.id, desg.name)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 transition-colors"
                            title="Delete Designation"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Add / Edit Designation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg flex flex-col shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-cyan-400" />
                {editingDesignation ? `Edit Designation: ${editingDesignation.name}` : 'Create New Designation'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-100 text-lg leading-none"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Designation Title / Role Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Senior Financial Accountant, Sales Executive, Site Manager"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 mb-1">Designation Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. DESG-ACC-01"
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Department</label>
                  <select
                    value={formDepartmentId}
                    onChange={(e) => setFormDepartmentId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="">General / All Departments</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Description / Key Responsibilities</label>
                <textarea
                  rows={3}
                  placeholder="Brief description of duties, qualifications or role scope..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Status</label>
                <select
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value as EntityStatus)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-cyan-500"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <Button variant="secondary" size="sm" type="button" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit">
                  {editingDesignation ? 'Save Changes' : 'Create Designation'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
