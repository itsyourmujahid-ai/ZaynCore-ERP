// ============================================================================
// Global Platform Configuration & Defaults
// ============================================================================

export const PLATFORM_CONFIG = {
  platformName: 'Enterprise ERP Platform',
  version: '1.0.0-foundation',
  defaultCurrency: 'USD',
  supportedCurrencies: [
    { code: 'USD', name: 'US Dollar', symbol: '$', precision: 2 },
    { code: 'EUR', name: 'Euro', symbol: '€', precision: 2 },
    { code: 'GBP', name: 'British Pound', symbol: '£', precision: 2 },
    { code: 'OMR', name: 'Omani Rial', symbol: 'ر.ع.', precision: 3 },
    { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ', precision: 2 },
    { code: 'SAR', name: 'Saudi Riyal', symbol: '﷼', precision: 2 },
    { code: 'CAD', name: 'Canadian Dollar', symbol: 'CA$', precision: 2 },
    { code: 'AUD', name: 'Australian Dollar', symbol: 'AU$', precision: 2 },
    { code: 'JPY', name: 'Japanese Yen', symbol: '¥', precision: 0 },
    { code: 'INR', name: 'Indian Rupee', symbol: '₹', precision: 2 },
  ],
  companyTiers: [
    {
      id: 'small',
      name: 'Small Business',
      description: 'Essential general ledger, invoicing, bills, cash/bank accounts, and basic reports.',
      maxBranches: 1,
      maxUsers: 5,
      supportsMultiCurrency: false,
      supportsCustomWorkflows: false,
      badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    },
    {
      id: 'medium',
      name: 'Medium Business',
      description: 'Standard accounting, sales, procurement, multi-warehouse inventory, VAT/Tax, and departmental budgeting.',
      maxBranches: 5,
      maxUsers: 50,
      supportsMultiCurrency: true,
      supportsCustomWorkflows: true,
      badgeColor: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      description: 'Full ERP capability: unlimited branches, inter-company consolidation, multi-currency auto-revaluation, and 3-way matching.',
      maxBranches: -1, // Unlimited
      maxUsers: -1,
      supportsMultiCurrency: true,
      supportsCustomWorkflows: true,
      badgeColor: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    },
  ],
};
