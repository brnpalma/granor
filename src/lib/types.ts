

export type RecurrenceEditScope = "single" | "future" | "all";

export interface UserPreferences {
  showBalance: boolean;
  includePreviousMonthBalance: boolean;
}

export interface Category {
  id: string;
  name: string;
  type: "income" | "expense";
}


export const accountTypes = [
  "Conta Corrente",
  "Poupança",
  "Carteira",
  "Investimentos",
  "Outro",
] as const;

export type AccountType = (typeof accountTypes)[number];

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  initialBalance: number;
  ignoreInTotals?: boolean;
  color?: string;
}

export interface CreditCard {
  id: string;
  name: string;
  limit: number;
  closingDay: number;
  dueDay: number;
  defaultAccountId: string;
  color?: string;
}

export type RecurrencePeriod = "diária" | "semanal" | "mensal" | "anual";

export interface Recurrence {
    period: RecurrencePeriod;
    quantity: number;
    startInstallment: number;
}

export interface Transaction {
  id: string;
  date: Date;
  description: string;
  amount: number;
  type: "income" | "expense";
  category: string;
  efetivado: boolean;
  accountId?: string; // Optional: for bank account transactions
  creditCardId?: string; // Optional: for credit card transactions
  isBudget?: boolean;
  isRecurring?: boolean;
  isFixed?: boolean;
  recurrence?: Recurrence;
  recurrenceId?: string;
  endDate?: Date;
  overrides?: { [monthKey: string]: string }; // e.g. { "2024-6": "override-doc-id" }
}

export interface Budget {
  id: string;
  category: string;
  amount: number;
}

export interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
}

    