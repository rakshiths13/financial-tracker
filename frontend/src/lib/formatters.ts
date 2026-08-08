export function fmt(v: number): string {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(v);
}

export function fmtShort(v: number): string {
  if (v >= 100000) return `₹${(v / 100000).toFixed(1)}L`;
  if (v >= 1000) return `₹${(v / 1000).toFixed(1)}K`;
  return `₹${v.toFixed(0)}`;
}

export const CATEGORY_COLORS: Record<string, string> = {
  "Online Shopping": "#6366f1",
  "Groceries": "#059669",
  "Food & Dining": "#ea580c",
  "Food & Snacks": "#ea580c",
  "Recharge": "#0891b2",
  "Bills & Utilities": "#7c3aed",
  "Bills": "#7c3aed",
  "Travel & Transport": "#d97706",
  "ATM / Cash": "#64748b",
  "Cash Withdrawal": "#64748b",
  "Income / Transfers": "#10b981",
  "Entertainment": "#ec4899",
  "Healthcare": "#f43f5e",
  "Personal": "#14b8a6",
  "EMI / Loans": "#dc2626",
  "Others": "#94a3b8",
};

const FALLBACK = ["#6366f1", "#7c3aed", "#ec4899", "#f43f5e", "#ea580c", "#d97706", "#059669", "#0891b2"];

export function getColorForCategory(name: string, index: number): string {
  return CATEGORY_COLORS[name] ?? FALLBACK[index % FALLBACK.length];
}
