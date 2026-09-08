// ============================================================================
// Customer Master Directory & Customer Registration Component
// ============================================================================

import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  Eye
} from 'lucide-react';
import { useAuth } from '@/modules/identity/context/AuthContext';
import { db } from '@/database/storage';
import { CustomerProfileModal } from './CustomerProfileModal';
import { Card } from '@/ui/components/Card';
import { Button } from '@/ui/components/Button';
import { Modal } from '@/ui/components/Modal';
import { Input } from '@/ui/components/Input';
import { Select } from '@/ui/components/Select';
import { CustomerType } from '@/database/types';
import { accountsReceivableService } from '../services/ar.service';

export const CustomerDirectoryView: React.FC<{
  onOpenNewInvoice?: (customerId: string) => void;
  onOpenNewReceipt?: (customerId: string) => void;
}> = ({ onOpenNewInvoice, onOpenNewReceipt }) => {
  const { tenant } = useAuth();
  const customers = db.getCustomers(tenant);
  const groups = db.getCustomerGroups(tenant);

  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('all');

  const [form, setForm] = useState({
    code: `CUST-${Math.floor(1000 + Math.random() * 9000)}`,
    name: '',
    customerGroupId: groups[0]?.id || '',
    customerType: 'corporate' as CustomerType,
    contactPerson: '',
    email: '',
    phone: '',
    addressLine1: '',
    city: '',
    countryCode: 'US',
    currency: tenant.baseCurrency,
    paymentTermsDays: 30,
    creditLimit: '25000.0000',
    taxIdentifier: '',
    salesperson: '',
    notes: '',
  });

  const filteredCustomers = customers.filter((c) => {
    const matchesGroup = selectedGroup === 'all' || c.customerGroupId === selectedGroup;
    const matchesSearch = !searchQuery || 
      c.code.toLowerCase().includes(searchQuery.toLowerCase()) || 
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.email && c.email.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesGroup && matchesSearch;
  });

  const handleCreateCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.code || !form.name) return;

    try {
      const created = db.createCustomer({
        code: form.code,
        name: form.name,
        customerGroupId: form.customerGroupId || undefined,
        customerType: form.customerType,
        contactPerson: form.contactPerson || undefined,
        email: form.email || undefined,
        phone: form.phone || undefined,
        addressLine1: form.addressLine1 || undefined,
        city: form.city || undefined,
        countryCode: form.countryCode,
        currency: form.currency,
        paymentTermsDays: Number(form.paymentTermsDays),
        creditLimit: parseFloat(form.creditLimit || '0').toFixed(4),
        taxIdentifier: form.taxIdentifier || undefined,
        salesperson: form.salesperson || undefined,
        isActive: true,
        notes: form.notes || undefined,
      }, tenant);

      setIsCreateModalOpen(false);
      setForm({
        code: `CUST-${Math.floor(1000 + Math.random() * 9000)}`,
        name: '',
        customerGroupId: groups[0]?.id || '',
        customerType: 'corporate',
        contactPerson: '',
        email: '',
        phone: '',
        addressLine1: '',
        city: '',
        countryCode: 'US',
        currency: tenant.baseCurrency,
        paymentTermsDays: 30,
        creditLimit: '25000.0000',
        taxIdentifier: '',
        salesperson: '',
        notes: '',
      });
      setSelectedCustomerId(created.id);
      setIsProfileModalOpen(true);
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-4">
      {/* Search & Actions Bar */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative w-full md:w-72">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search customer name, code, email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-950/80 border border-slate-800 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-500"
            />
          </div>

          <Select
            label=""
            options={[
              { value: 'all', label: 'All Customer Groups' },
              ...groups.map((g) => ({ value: g.id, label: g.name })),
            ]}
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
          />
        </div>

        <Button
          variant="primary"
          size="sm"
          icon={<Plus className="w-3.5 h-3.5" />}
          onClick={() => setIsCreateModalOpen(true)}
        >
          Add Customer
        </Button>
      </div>

      {/* Customers Table */}
      <Card
        title="Customer Master Register"
        subtitle={`Total ${customers.length} commercial accounts registered in company directory`}
        noPadding
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/90 text-slate-400 font-semibold uppercase tracking-wider">
                <th className="px-5 py-3.5">Customer Code</th>
                <th className="px-5 py-3.5">Company / Customer Name</th>
                <th className="px-5 py-3.5">Type</th>
                <th className="px-5 py-3.5">Payment Terms</th>
                <th className="px-5 py-3.5 text-right">Credit Limit</th>
                <th className="px-5 py-3.5 text-right">Outstanding Balance</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200">
              {filteredCustomers.map((cust) => {
                const summary = accountsReceivableService.getCustomerCreditSummary(cust.id, tenant);
                return (
                  <tr key={cust.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-5 py-3.5 font-mono font-bold text-brand-400">{cust.code}</td>
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-slate-100">{cust.name}</div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                        {cust.contactPerson && <span>{cust.contactPerson}</span>}
                        {cust.email && <span className="text-slate-500">• {cust.email}</span>}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 capitalize text-slate-300">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
                        {cust.customerType}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-300 font-mono">Net {cust.paymentTermsDays}d</td>
                    <td className="px-5 py-3.5 text-right font-mono text-slate-200">${parseFloat(cust.creditLimit).toFixed(2)}</td>
                    <td className="px-5 py-3.5 text-right font-mono font-bold text-amber-400">
                      ${parseFloat(summary.outstandingBalance).toFixed(2)}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <Button
                        variant="ghost"
                        size="xs"
                        icon={<Eye className="w-3 h-3" />}
                        onClick={() => {
                          setSelectedCustomerId(cust.id);
                          setIsProfileModalOpen(true);
                        }}
                      >
                        Profile
                      </Button>
                    </td>
                  </tr>
                );
              })}
              {filteredCustomers.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-slate-500">
                    No customers found. Click "+ Add Customer" to register your first commercial account.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Customer Profile Modal */}
      <CustomerProfileModal
        customerId={selectedCustomerId}
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        onOpenNewInvoice={onOpenNewInvoice}
        onOpenNewReceipt={onOpenNewReceipt}
      />

      {/* Create Customer Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Add Commercial Customer"
        subtitle={`Register new client in ${tenant.companyName} directory`}
        size="lg"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleCreateCustomer}>
              Create Customer
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreateCustomer} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              label="Customer Code"
              required
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
            />
            <div className="sm:col-span-2">
              <Input
                label="Customer / Company Name"
                required
                placeholder="e.g. Apex Dynamics Ltd."
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Select
              label="Customer Type"
              options={[
                { value: 'corporate', label: 'Corporate' },
                { value: 'retail', label: 'Retail' },
                { value: 'wholesale', label: 'Wholesale' },
                { value: 'government', label: 'Government' },
                { value: 'distributor', label: 'Distributor' },
              ]}
              value={form.customerType}
              onChange={(e) => setForm({ ...form, customerType: e.target.value as CustomerType })}
            />
            <Select
              label="Customer Group"
              options={groups.map((g) => ({ value: g.id, label: g.name }))}
              value={form.customerGroupId}
              onChange={(e) => setForm({ ...form, customerGroupId: e.target.value })}
            />
            <Input
              label="Currency"
              value={form.currency}
              onChange={(e) => setForm({ ...form, currency: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Credit Limit"
              type="number"
              step="0.01"
              value={form.creditLimit}
              onChange={(e) => setForm({ ...form, creditLimit: e.target.value })}
            />
            <Input
              label="Payment Terms (Days)"
              type="number"
              value={form.paymentTermsDays.toString()}
              onChange={(e) => setForm({ ...form, paymentTermsDays: parseInt(e.target.value || '0') })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              label="Contact Person"
              placeholder="Primary contact"
              value={form.contactPerson}
              onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
            />
            <Input
              label="Email"
              type="email"
              placeholder="billing@client.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
            <Input
              label="Phone"
              placeholder="+1-555-0199"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Address Line 1"
              placeholder="Suite / Street address"
              value={form.addressLine1}
              onChange={(e) => setForm({ ...form, addressLine1: e.target.value })}
            />
            <Input
              label="City"
              placeholder="City"
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
            />
          </div>

          <Input
            label="Tax / VAT Identifier"
            placeholder="e.g. VAT-987654"
            value={form.taxIdentifier}
            onChange={(e) => setForm({ ...form, taxIdentifier: e.target.value })}
          />
        </form>
      </Modal>
    </div>
  );
};
