// ============================================================================
// Employee Master Directory View (HR Master + System User Access Integration)
// ============================================================================

import React, { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  Search,
  Eye,
  Edit2,
  ShieldCheck,
  UserCheck,
  Building2,
  Briefcase,
  KeyRound,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '@/modules/identity/context/AuthContext';
import { Card } from '@/ui/components/Card';
import { Button } from '@/ui/components/Button';
import { StatusBadge } from '@/ui/data-display/StatusBadge';
import { DbEmployee, DbDesignation, DbDepartment, DbRole, EmploymentType, Gender, PayrollPaymentMethod } from '@/database/types';
import { db } from '@/database/storage';
import { employeeService } from '../services/employee.service';
import { EmployeeProfileModal } from './EmployeeProfileModal';

interface EmployeeDirectoryViewProps {
  isCreateModalOpen?: boolean;
  onCloseCreateModal?: () => void;
}

export const EmployeeDirectoryView: React.FC<EmployeeDirectoryViewProps> = ({
  isCreateModalOpen: propCreateOpen,
  onCloseCreateModal,
}) => {
  const { tenant } = useAuth();
  const [employees, setEmployees] = useState<DbEmployee[]>([]);
  const [departments, setDepartments] = useState<DbDepartment[]>([]);
  const [designations, setDesignations] = useState<DbDesignation[]>([]);
  const [roles, setRoles] = useState<DbRole[]>([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [accessFilter, setAccessFilter] = useState<string>('all');

  const [selectedEmployee, setSelectedEmployee] = useState<DbEmployee | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<DbEmployee | null>(null);

  // Quick Add Designation inline state
  const [isQuickAddDesgOpen, setIsQuickAddDesgOpen] = useState(false);
  const [quickDesgName, setQuickDesgName] = useState('');
  const [quickDesgCode, setQuickDesgCode] = useState('');

  // Form states
  const [formFirstName, setFormFirstName] = useState('');
  const [formLastName, setFormLastName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formDepartmentId, setFormDepartmentId] = useState('');
  const [formDesignationId, setFormDesignationId] = useState('');
  const [formJobTitle, setFormJobTitle] = useState('');
  const [formDOB, setFormDOB] = useState('1990-01-01');
  const [formGender, setFormGender] = useState<Gender>('male');
  const [formNationality, setFormNationality] = useState('American');
  const [formNationalId, setFormNationalId] = useState('');
  const [formJoiningDate, setFormJoiningDate] = useState(new Date().toISOString().split('T')[0]);
  const [formEmpType, setFormEmpType] = useState<EmploymentType>('full_time');
  const [formBasicSalary, setFormBasicSalary] = useState('5000.00');
  const [formPaymentMethod, setFormPaymentMethod] = useState<PayrollPaymentMethod>('bank_transfer');
  const [formBankName, setFormBankName] = useState('Bank of America');
  const [formBankIban, setFormBankIban] = useState('');
  const [formStructureId, setFormStructureId] = useState('');

  // System User Login Creation State
  const [formEnableSystemAccess, setFormEnableSystemAccess] = useState(false);
  const [formUsername, setFormUsername] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formRoleId, setFormRoleId] = useState('');

  const loadData = () => {
    setEmployees(db.getEmployees(tenant));
    setDepartments(db.getDepartments(tenant));
    setDesignations(db.getDesignations(tenant));
    setRoles(db.getRoles(tenant));
  };

  useEffect(() => {
    loadData();
    const unsub = db.subscribe(() => loadData());
    return unsub;
  }, [tenant]);

  useEffect(() => {
    if (propCreateOpen) {
      handleOpenCreate();
    }
  }, [propCreateOpen]);

  const structures = db.getSalaryStructures(tenant);

  // Filter designations based on selected department in form
  const availableFormDesignations = designations.filter(
    (d) => !formDepartmentId || !d.departmentId || d.departmentId === formDepartmentId
  );

  const filteredEmployees = employees.filter((e) => {
    const matchesSearch =
      e.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.employeeCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.jobTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (e.designation && e.designation.toLowerCase().includes(searchQuery.toLowerCase())) ||
      e.email.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || e.employmentStatus === statusFilter;
    const matchesDept = departmentFilter === 'all' || e.departmentId === departmentFilter;
    const matchesAccess =
      accessFilter === 'all' ||
      (accessFilter === 'system_user' && (e.hasSystemAccess || e.systemUserId)) ||
      (accessFilter === 'hr_only' && !e.hasSystemAccess && !e.systemUserId);

    return matchesSearch && matchesStatus && matchesDept && matchesAccess;
  });

  const handleOpenCreate = () => {
    setEditingEmployee(null);
    setFormFirstName('');
    setFormLastName('');
    setFormCode(`EMP-${(employees.length + 1).toString().padStart(4, '0')}`);
    setFormEmail('');
    setFormPhone('');
    setFormDepartmentId(departments[0]?.id || '');
    setFormDesignationId('');
    setFormJobTitle('');
    setFormDOB('1990-01-01');
    setFormGender('male');
    setFormNationality('American');
    setFormNationalId('');
    setFormJoiningDate(new Date().toISOString().split('T')[0]);
    setFormEmpType('full_time');
    setFormBasicSalary('5000.00');
    setFormPaymentMethod('bank_transfer');
    setFormBankName('Bank of America');
    setFormBankIban('');
    setFormStructureId(structures[0]?.id || '');
    setFormEnableSystemAccess(false);
    setFormUsername('');
    setFormPassword('');
    setFormRoleId(roles.find((r) => r.code === 'role-viewer')?.id || roles[0]?.id || '');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (emp: DbEmployee) => {
    setEditingEmployee(emp);
    setFormFirstName(emp.firstName);
    setFormLastName(emp.lastName);
    setFormCode(emp.employeeCode);
    setFormEmail(emp.email);
    setFormPhone(emp.phone);
    setFormDepartmentId(emp.departmentId || '');
    setFormDesignationId(emp.designationId || '');
    setFormJobTitle(emp.jobTitle || emp.designation || '');
    setFormDOB(emp.dateOfBirth);
    setFormGender(emp.gender);
    setFormNationality(emp.nationality);
    setFormNationalId(emp.nationalIdOrPassport || '');
    setFormJoiningDate(emp.joiningDate);
    setFormEmpType(emp.employmentType);
    setFormBasicSalary(emp.basicSalary);
    setFormPaymentMethod(emp.paymentMethod);
    setFormBankName(emp.bankName || '');
    setFormBankIban(emp.bankIban || emp.bankAccountNumber || '');
    setFormStructureId(emp.salaryStructureId || structures[0]?.id || '');
    setFormEnableSystemAccess(Boolean(emp.hasSystemAccess || emp.systemUserId));
    setFormUsername('');
    setFormPassword('');
    setFormRoleId(emp.systemRoleId || roles[0]?.id || '');
    setIsModalOpen(true);
  };

  const handleQuickAddDesignation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickDesgName.trim()) return;
    const dept = departments.find((d) => d.id === formDepartmentId);
    const newDesg = db.createDesignation(
      {
        name: quickDesgName.trim(),
        code: (quickDesgCode.trim() || `DESG-${Date.now().toString().slice(-4)}`).toUpperCase(),
        departmentId: formDepartmentId || undefined,
        departmentCode: dept?.code,
        status: 'active',
      },
      tenant
    );
    setDesignations(db.getDesignations(tenant));
    setFormDesignationId(newDesg.id);
    setFormJobTitle(newDesg.name);
    setIsQuickAddDesgOpen(false);
    setQuickDesgName('');
    setQuickDesgCode('');
  };

  const handleSaveEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const selectedDesg = designations.find((d) => d.id === formDesignationId);
      const jobTitleFinal = formJobTitle.trim() || selectedDesg?.name || 'Staff';

      if (editingEmployee) {
        employeeService.updateEmployee(
          editingEmployee.id,
          {
            firstName: formFirstName.trim(),
            lastName: formLastName.trim(),
            email: formEmail.trim(),
            phone: formPhone.trim(),
            departmentId: formDepartmentId || undefined,
            designationId: formDesignationId || undefined,
            designation: selectedDesg?.name || jobTitleFinal,
            jobTitle: jobTitleFinal,
            dateOfBirth: formDOB,
            gender: formGender,
            nationality: formNationality.trim(),
            nationalIdOrPassport: formNationalId.trim(),
            joiningDate: formJoiningDate,
            employmentType: formEmpType,
            basicSalary: formBasicSalary,
            paymentMethod: formPaymentMethod,
            bankName: formBankName.trim(),
            bankIban: formBankIban.trim(),
            salaryStructureId: formStructureId,
            hasSystemAccess: formEnableSystemAccess,
            systemRoleId: formEnableSystemAccess ? formRoleId : undefined,
          },
          tenant
        );
      } else {
        employeeService.createEmployee(
          {
            employeeCode: formCode.trim(),
            firstName: formFirstName.trim(),
            lastName: formLastName.trim(),
            email: formEmail.trim(),
            phone: formPhone.trim(),
            departmentId: formDepartmentId || undefined,
            designationId: formDesignationId || undefined,
            designation: selectedDesg?.name || jobTitleFinal,
            jobTitle: jobTitleFinal,
            dateOfBirth: formDOB,
            gender: formGender,
            nationality: formNationality.trim(),
            nationalIdOrPassport: formNationalId.trim(),
            joiningDate: formJoiningDate,
            employmentType: formEmpType,
            basicSalary: formBasicSalary,
            paymentMethod: formPaymentMethod,
            bankName: formBankName.trim(),
            bankIban: formBankIban.trim(),
            salaryStructureId: formStructureId,
            hasSystemAccess: formEnableSystemAccess,
            systemUser: formEnableSystemAccess
              ? {
                  username: formUsername.trim() || formEmail.trim().split('@')[0],
                  email: formEmail.trim(),
                  password: formPassword.trim() || 'Password@123',
                  roleId: formRoleId || roles[0]?.id || 'role-viewer',
                }
              : undefined,
          },
          tenant
        );
      }
      setIsModalOpen(false);
      if (onCloseCreateModal) onCloseCreateModal();
      loadData();
    } catch (err: unknown) {
      alert((err as Error).message || 'Failed to save employee');
    }
  };

  return (
    <div className="space-y-6">
      {/* Search & Filters Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative flex-1 min-w-[220px] max-w-xs">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search employee, designation, code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-card border border-border rounded-lg text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-brand-500"
            />
          </div>

          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="px-3 py-2 bg-card border border-border rounded-lg text-xs text-foreground/90 focus:outline-none focus:border-brand-500"
          >
            <option value="all">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} ({d.code})
              </option>
            ))}
          </select>

          <select
            value={accessFilter}
            onChange={(e) => setAccessFilter(e.target.value)}
            className="px-3 py-2 bg-card border border-border rounded-lg text-xs text-foreground/90 focus:outline-none focus:border-brand-500"
          >
            <option value="all">All Access Types</option>
            <option value="system_user">ERP System Users (With Login)</option>
            <option value="hr_only">HR Master Only (No Login)</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-card border border-border rounded-lg text-xs text-foreground/90 focus:outline-none focus:border-brand-500"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="on_leave">On Leave</option>
            <option value="suspended">Suspended</option>
            <option value="terminated">Terminated</option>
          </select>
        </div>

        <Button variant="primary" size="sm" icon={<Plus className="w-4 h-4" />} onClick={handleOpenCreate}>
          Register Employee
        </Button>
      </div>

      {/* Employees Table Card */}
      <Card
        title={`Staff Directory & HR Master (${filteredEmployees.length} records)`}
        subtitle="Manage complete employee profiles, department/designation assignments, and ERP system login credentials"
      >
        {filteredEmployees.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground text-xs">
            <Users className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            No employee records match your criteria. Click &quot;Register Employee&quot; to add staff.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 text-muted-foreground border-b border-border">
                <tr>
                  <th className="p-3">Employee</th>
                  <th className="p-3">Department & Designation</th>
                  <th className="p-3">ERP Access</th>
                  <th className="p-3">Contact</th>
                  <th className="p-3">Basic Salary</th>
                  <th className="p-3">Joining Date</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredEmployees.map((emp) => {
                  const dept = departments.find((d) => d.id === emp.departmentId);
                  const desg = designations.find((d) => d.id === emp.designationId);
                  const role = roles.find((r) => r.id === emp.systemRoleId);

                  return (
                    <tr key={emp.id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-purple-950/60 border border-purple-800/40 flex items-center justify-center font-bold text-xs text-purple-400">
                            {emp.firstName.charAt(0)}
                            {emp.lastName.charAt(0)}
                          </div>
                          <div>
                            <div className="font-semibold text-foreground">{emp.fullName}</div>
                            <div className="text-[10px] text-muted-foreground font-mono">{emp.employeeCode}</div>
                          </div>
                        </div>
                      </td>

                      <td className="p-3">
                        <div className="font-medium text-foreground flex items-center gap-1.5">
                          <Briefcase className="w-3 h-3 text-cyan-400" />
                          <span>{desg?.name || emp.designation || emp.jobTitle}</span>
                        </div>
                        <div className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Building2 className="w-3 h-3 text-muted-foreground" />
                          <span>{dept?.name || 'General Org'}</span>
                          <span className="text-muted-foreground">•</span>
                          <span className="capitalize">{emp.employmentType.replace('_', ' ')}</span>
                        </div>
                      </td>

                      <td className="p-3">
                        {emp.hasSystemAccess || emp.systemUserId ? (
                          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-950/80 text-indigo-300 border border-indigo-700/60">
                            <ShieldCheck className="w-3 h-3 text-indigo-400" />
                            <span>ERP User: {role?.name || 'Assigned Role'}</span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-muted/80 text-muted-foreground border border-border/50">
                            <UserCheck className="w-3 h-3 text-muted-foreground" />
                            <span>HR Only</span>
                          </div>
                        )}
                      </td>

                      <td className="p-3 text-muted-foreground">
                        <div>{emp.email}</div>
                        <div className="text-[10px] text-muted-foreground">{emp.phone}</div>
                      </td>

                      <td className="p-3 font-semibold text-emerald-400 font-mono">
                        ${parseFloat(emp.basicSalary).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>

                      <td className="p-3 text-muted-foreground">{emp.joiningDate}</td>

                      <td className="p-3">
                        <StatusBadge status={emp.employmentStatus} />
                      </td>

                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedEmployee(emp)}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-brand-400 hover:bg-muted transition-colors"
                            title="View 360 Profile"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(emp)}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                            title="Edit Employee"
                          >
                            <Edit2 className="w-4 h-4" />
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

      {/* View 360 Profile Modal */}
      {selectedEmployee && (
        <EmployeeProfileModal
          employee={selectedEmployee}
          onClose={() => setSelectedEmployee(null)}
          onEdit={(emp) => {
            setSelectedEmployee(null);
            handleOpenEdit(emp);
          }}
        />
      )}

      {/* Add / Edit Employee Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-card/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-card border border-border rounded-2xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-border flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                  <Users className="w-5 h-5 text-purple-400" />
                  {editingEmployee ? `Edit Employee: ${editingEmployee.employeeCode}` : 'Register New Employee'}
                </h2>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  HR master profile, designation cascading, salary compensation, and optional ERP system user creation.
                </p>
              </div>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  if (onCloseCreateModal) onCloseCreateModal();
                }}
                className="text-muted-foreground hover:text-foreground text-lg leading-none"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEmployee} className="p-6 overflow-y-auto space-y-5 text-xs">
              {/* Section 1: Basic Info */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" /> 1. Employee Identity & Personal Information
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-muted-foreground mb-1">Employee Code *</label>
                    <input
                      type="text"
                      required
                      value={formCode}
                      onChange={(e) => setFormCode(e.target.value)}
                      className="w-full px-3 py-2 bg-card border border-border rounded-lg text-foreground font-mono focus:outline-none focus:border-brand-500"
                    />
                  </div>
                  <div>
                    <label className="block text-muted-foreground mb-1">First Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. John"
                      value={formFirstName}
                      onChange={(e) => setFormFirstName(e.target.value)}
                      className="w-full px-3 py-2 bg-card border border-border rounded-lg text-foreground focus:outline-none focus:border-brand-500"
                    />
                  </div>
                  <div>
                    <label className="block text-muted-foreground mb-1">Last Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Doe"
                      value={formLastName}
                      onChange={(e) => setFormLastName(e.target.value)}
                      className="w-full px-3 py-2 bg-card border border-border rounded-lg text-foreground focus:outline-none focus:border-brand-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-muted-foreground mb-1">Email Address *</label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. john.doe@company.com"
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      className="w-full px-3 py-2 bg-card border border-border rounded-lg text-foreground focus:outline-none focus:border-brand-500"
                    />
                  </div>
                  <div>
                    <label className="block text-muted-foreground mb-1">Phone Number *</label>
                    <input
                      type="tel"
                      required
                      placeholder="e.g. +1 555-0199"
                      value={formPhone}
                      onChange={(e) => setFormPhone(e.target.value)}
                      className="w-full px-3 py-2 bg-card border border-border rounded-lg text-foreground focus:outline-none focus:border-brand-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-muted-foreground mb-1">Date of Birth</label>
                    <input
                      type="date"
                      required
                      value={formDOB}
                      onChange={(e) => setFormDOB(e.target.value)}
                      className="w-full px-3 py-2 bg-card border border-border rounded-lg text-foreground focus:outline-none focus:border-brand-500"
                    />
                  </div>
                  <div>
                    <label className="block text-muted-foreground mb-1">Gender</label>
                    <select
                      value={formGender}
                      onChange={(e) => setFormGender(e.target.value as Gender)}
                      className="w-full px-3 py-2 bg-card border border-border rounded-lg text-foreground focus:outline-none focus:border-brand-500"
                    >
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-muted-foreground mb-1">Nationality</label>
                    <input
                      type="text"
                      value={formNationality}
                      onChange={(e) => setFormNationality(e.target.value)}
                      className="w-full px-3 py-2 bg-card border border-border rounded-lg text-foreground focus:outline-none focus:border-brand-500"
                    />
                  </div>
                  <div>
                    <label className="block text-muted-foreground mb-1">National ID / Passport</label>
                    <input
                      type="text"
                      value={formNationalId}
                      onChange={(e) => setFormNationalId(e.target.value)}
                      className="w-full px-3 py-2 bg-card border border-border rounded-lg text-foreground focus:outline-none focus:border-brand-500"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Department & Designation Hierarchy */}
              <div className="space-y-3 border-t border-border pt-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5" /> 2. Department & Designation Assignment
                  </h3>
                  <button
                    type="button"
                    onClick={() => setIsQuickAddDesgOpen(!isQuickAddDesgOpen)}
                    className="text-[11px] text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Quick Add Designation
                  </button>
                </div>

                {isQuickAddDesgOpen && (
                  <div className="p-3.5 rounded-xl bg-cyan-950/30 border border-cyan-800/50 space-y-2.5">
                    <div className="font-semibold text-cyan-300 text-xs flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" /> Fast-Track Designation Creator
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] text-muted-foreground mb-0.5">Designation Title</label>
                        <input
                          type="text"
                          placeholder="e.g. Lead Developer"
                          value={quickDesgName}
                          onChange={(e) => setQuickDesgName(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-card border border-border rounded-lg text-foreground text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-muted-foreground mb-0.5">Code (Optional)</label>
                        <input
                          type="text"
                          placeholder="e.g. DESG-DEV-01"
                          value={quickDesgCode}
                          onChange={(e) => setQuickDesgCode(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-card border border-border rounded-lg text-foreground text-xs uppercase"
                        />
                      </div>
                      <div className="flex items-end gap-2">
                        <Button variant="primary" size="sm" type="button" onClick={handleQuickAddDesignation}>
                          Save & Select
                        </Button>
                        <Button variant="ghost" size="sm" type="button" onClick={() => setIsQuickAddDesgOpen(false)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-muted-foreground mb-1">Department</label>
                    <select
                      value={formDepartmentId}
                      onChange={(e) => {
                        setFormDepartmentId(e.target.value);
                      }}
                      className="w-full px-3 py-2 bg-card border border-border rounded-lg text-foreground focus:outline-none focus:border-brand-500"
                    >
                      <option value="">General / Unassigned</option>
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name} ({d.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-muted-foreground mb-1">Designation (Cascaded)</label>
                    <select
                      value={formDesignationId}
                      onChange={(e) => {
                        setFormDesignationId(e.target.value);
                        const desg = designations.find((d) => d.id === e.target.value);
                        if (desg) {
                          setFormJobTitle(desg.name);
                        }
                      }}
                      className="w-full px-3 py-2 bg-card border border-border rounded-lg text-foreground focus:outline-none focus:border-brand-500"
                    >
                      <option value="">Select Designation...</option>
                      {availableFormDesignations.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name} ({d.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-muted-foreground mb-1">Job Title / Display Role *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Senior Accountant"
                      value={formJobTitle}
                      onChange={(e) => setFormJobTitle(e.target.value)}
                      className="w-full px-3 py-2 bg-card border border-border rounded-lg text-foreground focus:outline-none focus:border-brand-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-muted-foreground mb-1">Joining Date</label>
                    <input
                      type="date"
                      required
                      value={formJoiningDate}
                      onChange={(e) => setFormJoiningDate(e.target.value)}
                      className="w-full px-3 py-2 bg-card border border-border rounded-lg text-foreground focus:outline-none focus:border-brand-500"
                    />
                  </div>
                  <div>
                    <label className="block text-muted-foreground mb-1">Employment Type</label>
                    <select
                      value={formEmpType}
                      onChange={(e) => setFormEmpType(e.target.value as EmploymentType)}
                      className="w-full px-3 py-2 bg-card border border-border rounded-lg text-foreground focus:outline-none focus:border-brand-500"
                    >
                      <option value="full_time">Full-Time</option>
                      <option value="part_time">Part-Time</option>
                      <option value="contract">Contract</option>
                      <option value="probation">Probation</option>
                      <option value="intern">Intern</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Section 3: ERP System Login Access Toggle */}
              <div className="border-t border-border pt-4 space-y-3">
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-card/60 border border-border">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-950/80 border border-indigo-700/50 flex items-center justify-center text-indigo-400">
                      <KeyRound className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-foreground text-xs flex items-center gap-2">
                        Enable ERP System Access / Create System User
                        {formEnableSystemAccess && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] bg-indigo-900/60 text-indigo-300 font-semibold">
                            Login Enabled
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Check this box if this employee requires an active ERP account to log in and perform operations.
                      </p>
                    </div>
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formEnableSystemAccess}
                      onChange={(e) => setFormEnableSystemAccess(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-card after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>

                {formEnableSystemAccess && (
                  <div className="p-4 rounded-xl bg-indigo-950/20 border border-indigo-800/40 space-y-3 animate-fadeIn">
                    <div className="text-[11px] text-indigo-300 font-medium">
                      Configure ERP Login Credentials and Role-Based Access Control (RBAC)
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-muted-foreground mb-1">Username {!editingEmployee && '*'}</label>
                        <input
                          type="text"
                          required={!editingEmployee && formEnableSystemAccess}
                          placeholder={formEmail ? formEmail.split('@')[0] : 'e.g. john.doe'}
                          value={formUsername}
                          onChange={(e) => setFormUsername(e.target.value)}
                          className="w-full px-3 py-2 bg-card border border-border rounded-lg text-foreground focus:outline-none focus:border-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="block text-muted-foreground mb-1">
                          {editingEmployee ? 'Reset Password (Optional)' : 'Initial Password *'}
                        </label>
                        <input
                          type="password"
                          required={!editingEmployee && formEnableSystemAccess}
                          placeholder={editingEmployee ? '••••••••' : 'Min 6 characters'}
                          value={formPassword}
                          onChange={(e) => setFormPassword(e.target.value)}
                          className="w-full px-3 py-2 bg-card border border-border rounded-lg text-foreground focus:outline-none focus:border-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="block text-muted-foreground mb-1">System Security Role *</label>
                        <select
                          value={formRoleId}
                          onChange={(e) => setFormRoleId(e.target.value)}
                          className="w-full px-3 py-2 bg-card border border-border rounded-lg text-foreground focus:outline-none focus:border-indigo-500"
                        >
                          {roles.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Section 4: Compensation & Banking */}
              <div className="space-y-3 border-t border-border pt-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  3. Compensation, Salary Structure & Bank Details
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-muted-foreground mb-1">Basic Monthly Wage ($) *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={formBasicSalary}
                      onChange={(e) => setFormBasicSalary(e.target.value)}
                      className="w-full px-3 py-2 bg-card border border-border rounded-lg text-foreground font-mono focus:outline-none focus:border-brand-500"
                    />
                  </div>
                  <div>
                    <label className="block text-muted-foreground mb-1">Salary Structure</label>
                    <select
                      value={formStructureId}
                      onChange={(e) => setFormStructureId(e.target.value)}
                      className="w-full px-3 py-2 bg-card border border-border rounded-lg text-foreground focus:outline-none focus:border-brand-500"
                    >
                      {structures.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.code})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-muted-foreground mb-1">Payment Method</label>
                    <select
                      value={formPaymentMethod}
                      onChange={(e) => setFormPaymentMethod(e.target.value as PayrollPaymentMethod)}
                      className="w-full px-3 py-2 bg-card border border-border rounded-lg text-foreground focus:outline-none focus:border-brand-500"
                    >
                      <option value="bank_transfer">Bank Transfer</option>
                      <option value="cash">Petty Cash</option>
                      <option value="cheque">Cheque</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-muted-foreground mb-1">Bank Name</label>
                    <input
                      type="text"
                      value={formBankName}
                      onChange={(e) => setFormBankName(e.target.value)}
                      className="w-full px-3 py-2 bg-card border border-border rounded-lg text-foreground focus:outline-none focus:border-brand-500"
                    />
                  </div>
                  <div>
                    <label className="block text-muted-foreground mb-1">Bank IBAN / Account Number</label>
                    <input
                      type="text"
                      value={formBankIban}
                      onChange={(e) => setFormBankIban(e.target.value)}
                      placeholder="e.g. US88BOFA1234567890"
                      className="w-full px-3 py-2 bg-card border border-border rounded-lg text-foreground font-mono focus:outline-none focus:border-brand-500"
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
                <Button
                  variant="secondary"
                  size="sm"
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    if (onCloseCreateModal) onCloseCreateModal();
                  }}
                >
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit">
                  {editingEmployee ? 'Save Changes' : 'Register Employee'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
