"use client";

import { db } from "./firebase";
import {
  collection,
  addDoc,
  onSnapshot,
  Timestamp,
  orderBy,
  query,
  doc,
  writeBatch,
} from "firebase/firestore";
import type { Transaction, Budget, SavingsGoal, Category } from "./types";
import { useToast } from "@/hooks/use-toast";

// Toast hook must be called from a component
const showToast = (options: { title: string; description?: string; variant?: "default" | "destructive" }) => {
    // This is a placeholder. In a real component, you'd use the useToast hook.
    console.log(`Toast: ${options.title} - ${options.description}`);
};


// Transactions
export const addTransaction = async (transaction: Omit<Transaction, "id">) => {
  try {
    await addDoc(collection(db, "transactions"), {
        ...transaction,
        date: Timestamp.fromDate(transaction.date),
    });
  } catch (error) {
    console.error("Error adding transaction: ", error);
    showToast({ title: "Erro", description: "Não foi possível adicionar a transação.", variant: "destructive" });
  }
};

export const getTransactions = (callback: (transactions: Transaction[]) => void) => {
  const q = query(collection(db, "transactions"), orderBy("date", "desc"));
  return onSnapshot(q, (querySnapshot) => {
    const transactions: Transaction[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      transactions.push({
        id: doc.id,
        ...data,
        date: (data.date as Timestamp).toDate(),
      } as Transaction);
    });
    callback(transactions);
  });
};

// Budgets
export const addBudget = async (budget: Omit<Budget, "id">) => {
    const batch = writeBatch(db);

    // 1. Add the budget document
    const budgetRef = doc(collection(db, "budgets"));
    batch.set(budgetRef, budget);

    // 2. Add the corresponding forecasted transaction
    const transactionRef = doc(collection(db, "transactions"));
    const budgetTransaction: Omit<Transaction, "id"> = {
      date: new Date(),
      description: `Orçamento de ${budget.category}`,
      amount: budget.amount,
      type: 'expense',
      category: budget.category as Category,
      isBudget: true,
    };
    batch.set(transactionRef, {
        ...budgetTransaction,
        date: Timestamp.fromDate(budgetTransaction.date),
    });

    try {
        await batch.commit();
    } catch (error) {
        console.error("Error adding budget and transaction: ", error);
        showToast({ title: "Erro", description: "Não foi possível adicionar o orçamento.", variant: "destructive" });
    }
};

export const getBudgets = (callback: (budgets: Budget[]) => void) => {
  return onSnapshot(collection(db, "budgets"), (querySnapshot) => {
    const budgets: Budget[] = [];
    querySnapshot.forEach((doc) => {
      budgets.push({ id: doc.id, ...doc.data() } as Budget);
    });
    callback(budgets);
  });
};

// Savings Goals
export const addSavingsGoal = async (goal: Omit<SavingsGoal, "id">) => {
  try {
    await addDoc(collection(db, "savings_goals"), goal);
  } catch (error) {
    console.error("Error adding savings goal: ", error);
    showToast({ title: "Erro", description: "Não foi possível adicionar a meta de economia.", variant: "destructive" });
  }
};

export const getSavingsGoals = (callback: (goals: SavingsGoal[]) => void) => {
  return onSnapshot(collection(db, "savings_goals"), (querySnapshot) => {
    const goals: SavingsGoal[] = [];
    querySnapshot.forEach((doc) => {
      goals.push({ id: doc.id, ...doc.data() } as SavingsGoal);
    });
    callback(goals);
  });
};
