import type { SupabaseClient } from "@supabase/supabase-js";
import type { BalanceDetailLine, BalanceEntry, Expense, ExpenseShare, Settlement } from "@/lib/finance/types";

type PersonRef = { id: string; name: string };

export function computeBalances(
  expenses: (Expense & { shares?: ExpenseShare[]; payer?: PersonRef | null })[],
  settlements: Settlement[],
  people: PersonRef[]
): { balances: BalanceEntry[]; details: Record<string, BalanceDetailLine[]> } {
  const nameById = new Map(people.map((p) => [p.id, p.name]));
  const pair = new Map<string, number>();
  const details: Record<string, BalanceDetailLine[]> = {};

  const key = (a: string, b: string) => `${a}::${b}`;

  const addDebt = (from: string, to: string, amount: number, line?: BalanceDetailLine) => {
    if (from === to || amount <= 0) return;
    pair.set(key(from, to), (pair.get(key(from, to)) ?? 0) + amount);
    if (line) {
      const k = key(from, to);
      details[k] = details[k] ?? [];
      details[k].push(line);
    }
  };

  for (const expense of expenses) {
    const payerId = expense.paid_by;
    if (!payerId) continue;
    const shares = expense.shares ?? [];
    for (const share of shares) {
      const amt = Number(share.amount) || 0;
      if (share.person_id === payerId || amt <= 0) continue;
      addDebt(share.person_id, payerId, amt, {
        expenseId: expense.id,
        title: expense.title,
        date: expense.expense_date,
        amount: amt,
      });
    }
  }

  for (const s of settlements) {
    addDebt(s.to_person_id, s.from_person_id, Number(s.amount) || 0);
  }

  const seen = new Set<string>();
  const balances: BalanceEntry[] = [];

  for (const [k, raw] of pair) {
    const [from, to] = k.split("::");
    const reverse = pair.get(key(to, from)) ?? 0;
    const net = raw - reverse;
    const pairId = [from, to].sort().join("|");
    if (seen.has(pairId)) continue;
    seen.add(pairId);
    if (Math.abs(net) < 0.005) continue;
    if (net > 0) {
      balances.push({
        fromId: from,
        fromName: nameById.get(from) ?? "Inconnu",
        toId: to,
        toName: nameById.get(to) ?? "Inconnu",
        amount: Math.round(net * 100) / 100,
        currency: "CHF",
      });
    } else {
      balances.push({
        fromId: to,
        fromName: nameById.get(to) ?? "Inconnu",
        toId: from,
        toName: nameById.get(from) ?? "Inconnu",
        amount: Math.round(-net * 100) / 100,
        currency: "CHF",
      });
    }
  }

  balances.sort((a, b) => b.amount - a.amount);
  return { balances, details };
}

export async function loadFinanceGraph(supabase: SupabaseClient, userId: string) {
  const [expensesRes, sharesRes, settlementsRes, peopleRes] = await Promise.all([
    supabase.from("expenses").select("*").eq("user_id", userId).order("expense_date", { ascending: false }),
    supabase.from("expense_shares").select("*").eq("user_id", userId),
    supabase.from("finance_settlements").select("*").eq("user_id", userId),
    supabase.from("people").select("id, name").eq("user_id", userId),
  ]);

  const shares = (sharesRes.data ?? []) as ExpenseShare[];
  const sharesByExpense = new Map<string, ExpenseShare[]>();
  for (const s of shares) {
    const arr = sharesByExpense.get(s.expense_id) ?? [];
    arr.push(s);
    sharesByExpense.set(s.expense_id, arr);
  }

  const expenses = ((expensesRes.data ?? []) as Expense[]).map((e) => ({
    ...e,
    amount: Number(e.amount),
    shares: sharesByExpense.get(e.id) ?? [],
  }));

  return {
    expenses,
    settlements: (settlementsRes.data ?? []) as Settlement[],
    people: (peopleRes.data ?? []) as { id: string; name: string }[],
  };
}
