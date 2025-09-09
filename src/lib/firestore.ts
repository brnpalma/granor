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
  getDocs,
} from "firebase/firestore";
import type { Transaction, Budget, SavingsGoal, Category } from "./types";
import { useToast } from "@/hooks/use-toast";

// Toast hook must be called from a component
const showToast = (options: { title: string; description?: string; variant?: "default" | "destructive" }) => {
    // This is a placeholder. In a real component, you'd use the useToast hook.
    console.log(`Toast: ${options.title} - ${options.description}`);
};

const getCollectionPath = (userId: string | null, collectionName: string) => {
    return userId ? `users/${userId}/${collectionName}` : null;
};

// --- Local Storage Functions ---

const getLocalData = <T>(key: string): T[] => {
    if (typeof window === 'undefined') return [];
    const data = window.localStorage.getItem(key);
    if (!data) return [];
    return JSON.parse(data, (key, value) => {
        if (key === 'date' && typeof value === 'string') {
            return new Date(value);
        }
        return value;
    });
};

const setLocalData = <T>(key: string, data: T[]) => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(key, JSON.stringify(data));
};

// --- Generic Data Operations ---

type DataType = Transaction | Budget | SavingsGoal;
type DataTypeOmitId<T> = Omit<T, "id">;

const addDataItem = async <T extends DataType>(
    userId: string | null,
    collectionName: string,
    item: DataTypeOmitId<T>,
    postProcess: (item: any) => any = (i) => i
) => {
    const path = getCollectionPath(userId, collectionName);
    if (path) {
        try {
            await addDoc(collection(db, path), postProcess(item));
        } catch (error) {
            console.error(`Error adding ${collectionName}: `, error);
            showToast({ title: "Erro", description: `Não foi possível adicionar ${collectionName}.`, variant: "destructive" });
        }
    } else {
        const localData = getLocalData<T>(collectionName);
        const newItem = { ...item, id: new Date().toISOString() } as T;
        setLocalData<T>(collectionName, [...localData, newItem]);
    }
};

const getDataSubscription = <T extends DataType>(
    userId: string | null,
    collectionName: string,
    callback: (data: T[]) => void,
    orderField: string = "date",
    postProcess: (data: any) => any = (d) => d
) => {
    const path = getCollectionPath(userId, collectionName);
    if (path) {
        const q = query(collection(db, path), orderBy(orderField, "desc"));
        return onSnapshot(q, (querySnapshot) => {
            const data: T[] = [];
            querySnapshot.forEach((doc) => {
                data.push({
                    id: doc.id,
                    ...postProcess(doc.data()),
                } as T);
            });
            callback(data);
        });
    } else {
        // For local storage, we can't use real-time subscriptions.
        // We'll call the callback once with the current data.
        // The component will need to re-fetch on its own if needed.
        const data = getLocalData<T>(collectionName);
        callback(data);
        // Return a no-op unsubscribe function
        return () => {};
    }
};


// Transactions
export const addTransaction = (userId: string | null, transaction: Omit<Transaction, "id">) => {
    return addDataItem<Transaction>(userId, "transactions", transaction, (item) => ({
        ...item,
        date: Timestamp.fromDate(item.date),
    }));
};

export const getTransactions = (userId: string | null, callback: (transactions: Transaction[]) => void) => {
    return getDataSubscription<Transaction>(userId, "transactions", callback, "date", (data) => ({
        ...data,
        date: (data.date as Timestamp).toDate(),
    }));
};


// Budgets
export const addBudget = async (userId: string | null, budget: Omit<Budget, "id">) => {
    const path = getCollectionPath(userId, "budgets");
    const transPath = getCollectionPath(userId, "transactions");

    if (path && transPath) {
        const batch = writeBatch(db);
        const budgetRef = doc(collection(db, path));
        batch.set(budgetRef, budget);

        const transactionRef = doc(collection(db, transPath));
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
    } else {
        // Local storage logic
        await addDataItem<Budget>(userId, "budgets", budget);
        const budgetTransaction: Omit<Transaction, "id"> = {
            date: new Date(),
            description: `Orçamento de ${budget.category}`,
            amount: budget.amount,
            type: 'expense',
            category: budget.category as Category,
            isBudget: true,
        };
        await addDataItem<Transaction>(userId, "transactions", budgetTransaction);
    }
};


export const getBudgets = (userId: string | null, callback: (budgets: Budget[]) => void) => {
    return getDataSubscription<Budget>(userId, "budgets", callback, 'category');
};


// Savings Goals
export const addSavingsGoal = (userId: string | null, goal: Omit<SavingsGoal, "id">) => {
  return addDataItem<SavingsGoal>(userId, "savings_goals", goal);
};

export const getSavingsGoals = (userId: string | null, callback: (goals: SavingsGoal[]) => void) => {
    return getDataSubscription<SavingsGoal>(userId, "savings_goals", callback, 'name');
};

// Function to migrate local data to Firestore
export const migrateLocalDataToFirestore = async (userId: string) => {
    if (!userId) return;

    const collections = ["transactions", "budgets", "savings_goals"];

    for (const collectionName of collections) {
        const localData = getLocalData<any>(collectionName);
        if (localData.length > 0) {
            const firestorePath = getCollectionPath(userId, collectionName);
            if (firestorePath) {
                 // Check if firestore already has data to avoid duplicates
                const firestoreDocs = await getDocs(collection(db, firestorePath));
                if (firestoreDocs.size > 0) {
                    console.log(`Firestore already has data for ${collectionName}. Skipping migration.`);
                    continue;
                }

                const batch = writeBatch(db);
                localData.forEach(item => {
                    const { id, ...data } = item;
                    let processedData = data;
                    if (collectionName === 'transactions') {
                        processedData = {...data, date: Timestamp.fromDate(new Date(data.date))};
                    }
                    const docRef = doc(collection(db, firestorePath));
                    batch.set(docRef, processedData);
                });
                await batch.commit();
                // Optional: Clear local data after successful migration
                // window.localStorage.removeItem(collectionName);
            }
        }
    }
    showToast({ title: "Dados Sincronizados!", description: "Seus dados locais foram salvos na sua conta." });
};
