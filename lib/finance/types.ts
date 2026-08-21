export const EXPENSE_CATEGORIES = [
  "SaaS",
  "API",
  "Hébergement",
  "Domaine",
  "Marketing",
  "Matériel",
  "Déplacement",
  "Autre",
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export const SPLIT_METHODS = ["equal", "custom"] as const;
export type SplitMethod = (typeof SPLIT_METHODS)[number];

export type ExpenseShare = {
  id: string;
  user_id: string;
  expense_id: string;
  person_id: string;
  amount: number;
  person?: { id: string; name: string } | null;
};

export type Expense = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  amount: number;
  currency: string;
  project_id: string | null;
  category: ExpenseCategory;
  paid_by: string | null;
  split_method: SplitMethod;
  expense_date: string;
  receipt_url: string | null;
  is_recurring: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
  shares?: ExpenseShare[];
  payer?: { id: string; name: string } | null;
  project?: { id: string; name: string; color: string | null } | null;
};

export type Settlement = {
  id: string;
  user_id: string;
  from_person_id: string;
  to_person_id: string;
  amount: number;
  currency: string;
  notes: string | null;
  settled_at: string;
  created_at: string;
  from_person?: { id: string; name: string } | null;
  to_person?: { id: string; name: string } | null;
};

export const SUBSCRIPTION_FREQUENCIES = ["monthly", "yearly", "custom"] as const;
export type SubscriptionFrequency = (typeof SUBSCRIPTION_FREQUENCIES)[number];

export type FinanceSubscription = {
  id: string;
  user_id: string;
  name: string;
  project_id: string | null;
  amount: number;
  currency: string;
  frequency: SubscriptionFrequency;
  interval_days: number | null;
  paid_by: string | null;
  next_renewal: string | null;
  category: ExpenseCategory;
  status: "active" | "cancelled";
  notes: string | null;
  created_at: string;
  updated_at: string;
  project?: { id: string; name: string; color: string | null } | null;
  payer?: { id: string; name: string } | null;
};

export type BalanceEntry = {
  fromId: string;
  fromName: string;
  toId: string;
  toName: string;
  amount: number;
  currency: string;
};

export type BalanceDetailLine = {
  expenseId: string;
  title: string;
  date: string;
  amount: number;
};

export function monthlyAmount(sub: {
  amount: number;
  frequency: SubscriptionFrequency;
  interval_days: number | null;
}): number {
  const amount = Number(sub.amount) || 0;
  if (sub.frequency === "monthly") return amount;
  if (sub.frequency === "yearly") return amount / 12;
  const days = Math.max(sub.interval_days ?? 30, 1);
  return (amount * 30) / days;
}
