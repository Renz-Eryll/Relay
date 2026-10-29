// The product areas Relay ships with. No database imports, so scripts (seed, eval) can share it.
export const CATEGORIES = [
  { slug: "pos", name: "POS & Retail", description: "Point-of-sale terminals, receipts, cashier accounts and promos." },
  { slug: "inventory", name: "Inventory", description: "Stock levels, warehouse transfers and item sync across branches." },
  { slug: "accounting", name: "Accounting", description: "Invoices, ledgers, bank reconciliation and tax reports." },
  { slug: "billing", name: "Utility Billing", description: "Meter readings, bill generation and payment posting." },
  { slug: "payroll", name: "HR & Payroll", description: "Payslips, attendance, leave and government contributions." },
];
