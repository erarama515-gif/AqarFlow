export enum AccountCategory {
  ASSET = "ASSET",
  LIABILITY = "LIABILITY",
  EQUITY = "EQUITY",
  REVENUE = "REVENUE",
  EXPENSE = "EXPENSE",
}
export const DEFAULT_ACCOUNT_CODES = {
  ASSET: ["1000", "1025"],
  LIABILITY: ["2000"],
  EQUITY: ["3000"],
  REVENUE: ["4000"],
  EXPENSE: ["5000"],
};
export function assertBalanced(lines) {
  const d = lines.reduce((s,l)=>s+Number(l.debit||0),0);
  const c = lines.reduce((s,l)=>s+Number(l.credit||0),0);
  if (Math.abs(d-c)>=1e-6) throw new Error(`Unbalanced: d=${d} c=${c}`);
}
