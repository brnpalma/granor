export const categories = [
  "Alimentação",
  "Transporte",
  "Compras",
  "Entretenimento",
  "Serviços",
  "Aluguel",
  "Salário",
  "Economias",
  "Outros",
] as const;

export type Category = (typeof categories)[number];

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
  category: Category;
  accountId?: string; // Optional: for bank account transactions
  creditCardId?: string; // Optional: for credit card transactions
  isBudget?: boolean;
}

export interface Budget {
  id: string;
  category: Category;
  amount: number;
}

export interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
}
