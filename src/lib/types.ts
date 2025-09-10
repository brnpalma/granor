

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
  balance: number;
}

export interface CreditCard {
  id: string;
  name: string;
  limit: number;
  closingDay: number;
  dueDay: number;
  defaultAccountId: string;
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
