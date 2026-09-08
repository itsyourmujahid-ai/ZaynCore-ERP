# Centralized Accounting Engine Specification
## Enterprise Automated Double-Entry Posting & Sub-Ledger Architecture

---

## 1. Accounting Philosophy: Automated Posting

In this ERP, operational users (sales reps, warehouse clerks, procurement agents, cashiers) **never write manual debits and credits** for standard business transactions. 

Instead, the lifecycle follows this deterministic pipeline:

```
[Operational Event / Document] (e.g. Sales Invoice, Goods Receipt, Payment)
                  │
                  ▼
         [State Validation] (Check fiscal period open, credit limits, valid tax codes)
                  │
                  ▼
         [Approval Gate] (Workflow approval if required by company policy)
                  │
                  ▼
         [Posting Execution] (Document status changes from 'approved' -> 'posted')
                  │
                  ▼
    [Centralized Posting Engine] (Applies Posting Rules based on company COA mapping)
                  │
                  ▼
    [Balanced Journal Generation] (Sum of Debits == Sum of Credits in base currency)
                  │
        ┌─────────┴─────────┐
        ▼                   ▼
[General Ledger]     [Sub-Ledger] (AR, AP, Inventory, Fixed Assets, Bank)
        │                   │
        └─────────┬─────────┘
                  ▼
   [Trial Balance & Financial Statements] (Real-time or aggregated reporting)
```

---

## 2. Standard Automated Posting Rule Matrix

| Document / Event | Debit Account(s) | Credit Account(s) | Sub-Ledger Updated |
| :--- | :--- | :--- | :--- |
| **Sales Invoice** | Accounts Receivable (Customer) | Sales Revenue<br>Output Tax / VAT Payable | Accounts Receivable (AR) |
| **Customer Receipt** | Bank Account / Cash Drawer | Accounts Receivable (Customer) | Accounts Receivable (AR) + Bank |
| **Supplier Bill** | Inventory / Expense (Cost Center) | Accounts Payable (Supplier)<br>Input Tax / VAT Recoverable | Accounts Payable (AP) |
| **Supplier Payment** | Accounts Payable (Supplier) | Bank Account / Cash Drawer | Accounts Payable (AP) + Bank |
| **Goods Receipt (PO)** | Inventory In-Transit / Raw Materials | Accrued Goods Received (GRIR) | Inventory Sub-Ledger |
| **Payroll Processing** | Gross Salaries Expense<br>Employer Tax Expense | Net Salaries Payable<br>Payroll Taxes Withheld | Payroll Sub-Ledger |
| **Depreciation Run** | Depreciation Expense (Cost Center) | Accumulated Depreciation (Asset) | Fixed Asset Register |

---

## 3. Transaction Immutability & Reversal Protocol

- **Zero In-Place Edits**: Once a journal entry is marked `posted`, it is **cryptographically and logically immutable**. It cannot be updated or deleted via SQL `UPDATE`/`DELETE`.
- **Reversal Protocol**: If a posted document must be corrected:
  1. A formal `Reversal Transaction` or `Credit/Debit Note` is initiated.
  2. The system generates an inverse journal entry referencing the original `journal_entry_id`.
  3. Both the original and reversing journals remain in the general ledger and audit trail forever.
- **Fiscal Period Lock Enforcement**: Postings cannot occur if the target date falls into a locked or closed `accounting_period`.
