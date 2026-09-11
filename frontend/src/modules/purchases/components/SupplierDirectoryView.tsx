// ============================================================================
// Supplier Master Directory & Registration Component
// ============================================================================

import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  Eye
} from 'lucide-react';
import { useAuth } from '@/modules/identity/context/AuthContext';
import { db } from '@/database/storage';
import { SupplierProfileModal } from './SupplierProfileModal';
import { Card } from '@/ui/components/Card';
import { Button } from '@/ui/components/Button';
import { Modal } from '@/ui/components/Modal';
import { Input } from '@/ui/components/Input';
import { Select } from '@/ui/components/Select';
import { StatusBadge } from '@/ui/data-display/StatusBadge';
import { SupplierType } from '@/database/types';

export const SupplierDirectoryView: React.FC<{
  onRecordBill?: (supplierId: string) => void;
  onRecordPayment?: (supplierId: string) => void;
}> = ({ onRecordBill, onRecordPayment }) => {
  const { tenant } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [profileSupplierId, setProfileSupplierId] = useState<string | null>(null);

  const suppliers = db.getSuppliers(tenant);
  const supplierGroups = db.getSupplierGroups(tenant);
  const bills = db.getSupplierBills(tenant).filter((b) => b.status === 'posted');

  const [form, setForm] = useState({
    code: `SUP-${Math.floor(100 + Math.random() * 900)}`,
    name: '',
    supplierType: 'local' as SupplierType,
    supplierGroupId: supplierGroups[0]?.id || '',
    contactPerson: '',
    email: '',
    phone: '',
    addressLine1: '',
    city: 'Muscat',
    countryCode: 'OM',
    currency: tenant.baseCurrency,
    paymentTermsDays: 30,
    creditLimit: '50000.0000',
    taxIdentifier: '',
    bankName: '',
    accountNumber: '',
    swiftCode: '',
    iban: '',
    notes: '',
  });

  const handleCreateSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.code) {
      alert('Please provide supplier name and code.');
      return;
    }

    try {
      db.createSupplier({
        code: form.code.toUpperCase(),
        name: form.name,
        supplierType: form.supplierType,
        supplierGroupId: form.supplierGroupId || undefined,
        contactPerson: form.contactPerson || undefined,
        email: form.email || undefined,
        phone: form.phone || undefined,
        addressLine1: form.addressLine1 || undefined,
        city: form.city,
        countryCode: form.countryCode,
        currency: form.currency,
        paymentTermsDays: Number(form.paymentTermsDays),
        creditLimit: form.creditLimit,
        taxIdentifier: form.taxIdentifier || undefined,
        bankDetails: {
          bankName: form.bankName || undefined,
          accountNumber: form.accountNumber || undefined,
          swiftCode: form.swiftCode || undefined,
          iban: form.iban || undefined,
        },
        status: 'active',
        notes: form.notes || undefined,
      }, tenant);

      setIsCreateModalOpen(false);
      setForm({
        code: `SUP-${Math.floor(100 + Math.random() * 900)}`,
        name: '',
        supplierType: 'local',
        supplierGroupId: supplierGroups[0]?.id || '',
        contactPerson: '',
        email: '',
        phone: '',
        addressLine1: '',
        city: 'Muscat',
        countryCode: 'OM',
        currency: tenant.baseCurrency,
        paymentTermsDays: 30,
        creditLimit: '50000.0000',
        taxIdentifier: '',
        bankName: '',
        accountNumber: '',
        swiftCode: '',
        iban: '',
        notes: '',
      });
    } catch (err: any) {
      alert(err.message);
    }
  };

  const filteredSuppliers = suppliers.filter((s) => {
    const matchesGroup = selectedGroup === 'all' || s.supplierGroupId === selectedGroup;
    const matchesSearch = !searchQuery || 
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.contactPerson?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesGroup && matchesSearch;
  });

  return (
    <div className="space-y-4">
      {/* Top Filter Bar */}
      <div className="p-4 rounded-xl bg-card border border-border flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative w-full md:w-72">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by code, supplier, or contact..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-card/80 border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-brand-500"
            />
          </div>

          <select
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            className="px-3 py-1.5 text-xs bg-card/80 border border-border rounded-lg text-foreground/90 focus:outline-none focus:border-brand-500"
          >
            <option value="all">All Supplier Groups</option>
            {supplierGroups.map((g) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
        </div>

        <Button
          variant="primary"
          size="sm"
          icon={<Plus className="w-3.5 h-3.5" />}
          onClick={() => setIsCreateModalOpen(true)}
        >
          Register Supplier
        </Button>
      </div>

      {/* Supplier Register Card */}
      <Card
        title="Supplier Master Directory"
        subtitle={`Managing ${filteredSuppliers.length} vendor accounts with dynamic credit limits`}
        noPadding
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border bg-card/90 text-muted-foreground font-semibold uppercase tracking-wider">
                <th className="px-5 py-3.5">Supplier Code & Name</th>
                <th className="px-5 py-3.5">Category Group</th>
                <th className="px-5 py-3.5">Contact Person</th>
                <th className="px-5 py-3.5">Payment Terms</th>
                <th className="px-5 py-3.5 text-right">Outstanding AP</th>
                <th className="px-5 py-3.5 text-center">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-foreground">
              {filteredSuppliers.map((s) => {
                const group = supplierGroups.find((g) => g.id === s.supplierGroupId);
                const supplierBills = bills.filter((b) => b.supplierId === s.id);
                const totalOutstanding = supplierBills.reduce((sum, b) => sum + parseFloat(b.balanceDue), 0);

                return (
                  <tr key={s.id} className="hover:bg-muted/40 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center font-bold text-foreground/90 text-[11px] shrink-0">
                          {s.code.slice(0, 2)}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-foreground truncate max-w-[180px]" title={s.name}>{s.name}</div>
                          <div className="text-[10px] font-mono text-muted-foreground">{s.code} • {s.currency}</div>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-3.5 text-foreground/90">
                      <span className="px-2 py-0.5 rounded bg-muted text-foreground/90 text-[10px] font-medium">
                        {group?.name || s.supplierType.toUpperCase()}
                      </span>
                    </td>

                    <td className="px-5 py-3.5 text-foreground/90">
                      <div>{s.contactPerson || '—'}</div>
                      <div className="text-[10px] text-muted-foreground">{s.email || s.phone || ''}</div>
                    </td>

                    <td className="px-5 py-3.5 text-foreground/90">
                      <span className="font-semibold">Net {s.paymentTermsDays} Days</span>
                    </td>

                    <td className="px-5 py-3.5 text-right font-mono font-bold text-amber-400">
                      ${totalOutstanding.toFixed(2)}
                    </td>

                    <td className="px-5 py-3.5 text-center">
                      <StatusBadge status={s.status} size="xs" />
                    </td>

                    <td className="px-5 py-3.5 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <Button
                          variant="ghost"
                          size="xs"
                          icon={<Eye className="w-3 h-3" />}
                          onClick={() => setProfileSupplierId(s.id)}
                        >
                          Profile
                        </Button>
                        <Button
                          variant="primary"
                          size="xs"
                          onClick={() => onRecordBill?.(s.id)}
                        >
                          + Bill
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredSuppliers.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-muted-foreground">
                    No suppliers found. Click "+ Register Supplier" to add your first vendor.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Register Supplier Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Register New Supplier"
        subtitle="Adds an authorized supplier with credit terms, bank coordinates, and tax configuration."
        size="lg"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleCreateSupplier}>
              Register Supplier
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreateSupplier} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Supplier Code"
              required
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
            />
            <Input
              label="Supplier / Company Name"
              required
              placeholder="e.g. Apex Industrial Supplies LLC"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Select
              label="Supplier Category"
              options={[
                { value: 'local', label: 'Local Supplier' },
                { value: 'international', label: 'International Supplier' },
                { value: 'raw_material', label: 'Raw Material Vendor' },
                { value: 'service', label: 'Service Provider' },
                { value: 'contractor', label: 'Contractor' },
                { value: 'utility', label: 'Utility Company' },
                { value: 'other', label: 'Other Supplier' },
              ]}
              value={form.supplierType}
              onChange={(e) => setForm({ ...form, supplierType: e.target.value as SupplierType })}
            />

            <Select
              label="Supplier Group"
              options={supplierGroups.map((g) => ({ value: g.id, label: g.name }))}
              value={form.supplierGroupId}
              onChange={(e) => setForm({ ...form, supplierGroupId: e.target.value })}
            />

            <Input
              label="Payment Terms (Days)"
              type="number"
              value={form.paymentTermsDays.toString()}
              onChange={(e) => setForm({ ...form, paymentTermsDays: parseInt(e.target.value) || 0 })}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Contact Person"
              placeholder="e.g. Sarah Jenkins"
              value={form.contactPerson}
              onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
            />
            <Input
              label="Email Address"
              type="email"
              placeholder="billing@apexsupplies.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
            <Input
              label="Phone Number"
              placeholder="+968 9123 4567"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Tax / VAT ID"
              placeholder="e.g. VAT-OM-887766"
              value={form.taxIdentifier}
              onChange={(e) => setForm({ ...form, taxIdentifier: e.target.value })}
            />
            <Input
              label="Bank Name"
              placeholder="e.g. Bank Muscat"
              value={form.bankName}
              onChange={(e) => setForm({ ...form, bankName: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Account Number / IBAN"
              placeholder="e.g. OM00 0000 1234 5678 9012 34"
              value={form.iban || form.accountNumber}
              onChange={(e) => setForm({ ...form, iban: e.target.value, accountNumber: e.target.value })}
            />
            <Input
              label="SWIFT / BIC Code"
              placeholder="e.g. BMUSOMRX"
              value={form.swiftCode}
              onChange={(e) => setForm({ ...form, swiftCode: e.target.value })}
            />
          </div>

          <Input
            label="Address"
            placeholder="e.g. Ghala Industrial Area, Building 4"
            value={form.addressLine1}
            onChange={(e) => setForm({ ...form, addressLine1: e.target.value })}
          />
        </form>
      </Modal>

      {/* Supplier Profile Modal */}
      <SupplierProfileModal
        supplierId={profileSupplierId}
        isOpen={!!profileSupplierId}
        onClose={() => setProfileSupplierId(null)}
        onOpenNewBill={onRecordBill}
        onOpenNewPayment={onRecordPayment}
      />
    </div>
  );
};
