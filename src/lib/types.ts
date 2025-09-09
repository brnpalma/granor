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

export interface Transaction {
  id: string;
  date: Date;
  description: string;
  amount: number;
  type: "income" | "expense";
  category: Category;
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
