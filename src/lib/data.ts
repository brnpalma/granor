import type { Transaction, Budget, SavingsGoal } from "./types";

export const mockTransactions: Transaction[] = [
  {
    id: "1",
    date: new Date("2024-07-15"),
    description: "Spotify Subscription",
    amount: 9.99,
    type: "expense",
    category: "Entertainment",
  },
  {
    id: "2",
    date: new Date("2024-07-14"),
    description: "Monthly Salary",
    amount: 3500,
    type: "income",
    category: "Salary",
  },
  {
    id: "3",
    date: new Date("2024-07-12"),
    description: "Grocery shopping at Walmart",
    amount: 124.5,
    type: "expense",
    category: "Food",
  },
  {
    id: "4",
    date: new Date("2024-07-10"),
    description: "Gas for car",
    amount: 45.0,
    type: "expense",
    category: "Transportation",
  },
  {
    id: "5",
    date: new Date("2024-07-08"),
    description: "New shoes from Nike",
    amount: 150.0,
    type: "expense",
    category: "Shopping",
  },
];

export const mockBudgets: Budget[] = [
  { id: "1", category: "Food", amount: 500 },
  { id: "2", category: "Shopping", amount: 300 },
  { id: "3", category: "Entertainment", amount: 100 },
];

export const mockSavingsGoals: SavingsGoal[] = [
  {
    id: "1",
    name: "New Laptop",
    targetAmount: 1500,
    currentAmount: 750,
  },
  {
    id: "2",
    name: "Vacation to Hawaii",
    targetAmount: 4000,
    currentAmount: 1200,
  },
];
