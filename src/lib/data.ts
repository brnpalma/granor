import type { Transaction, Budget, SavingsGoal } from "./types";

export const mockTransactions: Transaction[] = [
  // Budget transactions (forecasted expenses)
  {
    id: "budget-1",
    date: new Date(),
    description: "Orçamento de Alimentação",
    amount: 500,
    type: "expense",
    category: "Alimentação",
    isBudget: true,
  },
  {
    id: "budget-2",
    date: new Date(),
    description: "Orçamento de Compras",
    amount: 300,
    type: "expense",
    category: "Compras",
    isBudget: true,
  },
  {
    id: "budget-3",
    date: new Date(),
    description: "Orçamento de Entretenimento",
    amount: 100,
    type: "expense",
    category: "Entretenimento",
    isBudget: true,
  },
  // Actual transactions
  {
    id: "1",
    date: new Date("2024-07-15"),
    description: "Assinatura do Spotify",
    amount: 9.99,
    type: "expense",
    category: "Entretenimento",
  },
  {
    id: "2",
    date: new Date("2024-07-14"),
    description: "Salário Mensal",
    amount: 3500,
    type: "income",
    category: "Salário",
  },
  {
    id: "3",
    date: new Date("2024-07-12"),
    description: "Compras no supermercado",
    amount: 124.5,
    type: "expense",
    category: "Alimentação",
  },
  {
    id: "4",
    date: new Date("2024-07-10"),
    description: "Gasolina para o carro",
    amount: 45.0,
    type: "expense",
    category: "Transporte",
  },
  {
    id: "5",
    date: new Date("2024-07-08"),
    description: "Sapatos novos da Nike",
    amount: 150.0,
    type: "expense",
    category: "Compras",
  },
];

export const mockBudgets: Budget[] = [
  { id: "1", category: "Alimentação", amount: 500 },
  { id: "2", category: "Compras", amount: 300 },
  { id: "3", category: "Entretenimento", amount: 100 },
];

export const mockSavingsGoals: SavingsGoal[] = [
  {
    id: "1",
    name: "Novo Laptop",
    targetAmount: 1500,
    currentAmount: 750,
  },
  {
    id: "2",
    name: "Férias no Havaí",
    targetAmount: 4000,
    currentAmount: 1200,
  },
];
