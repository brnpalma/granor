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
  updateDoc,
  runTransaction,
} from "firebase/firestore";
import type { Transaction, Budget, SavingsGoal, Category, Account, CreditCard } from "./types";
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

type DataType = Transaction | Budget | SavingsGoal | Account | CreditCard;
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


// Accounts
export const addAccount = (userId: string | null, account: Omit<Account, "id">) => {
    return addDataItem<Account>(userId, "accounts", account);
};

export const getAccounts = (userId: string | null, callback: (accounts: Account[]) => void) => {
    return getDataSubscription<Account>(userId, "accounts", callback, 'name');
};

// Credit Cards
export const addCreditCard = (userId: string | null, card: Omit<CreditCard, "id">) => {
    return addDataItem<CreditCard>(userId, "credit_cards", card);
};

export const getCreditCards = (userId: string | null, callback: (cards: CreditCard[]) => void) => {
    return getDataSubscription<CreditCard>(userId, "credit_cards", callback, 'name');
};


// Transactions
export const addTransaction = async (userId: string | null, transaction: Omit<Transaction, "id">) => {
    // Only update account balance if it's a direct account transaction
    if (transaction.accountId) {
        const path = getCollectionPath(userId, "transactions");
        const accountPath = getCollectionPath(userId, "accounts");

        if (path && accountPath) {
             try {
                await runTransaction(db, async (t) => {
                    const accountRef = doc(db, accountPath, transaction.accountId!);
                    const accountDoc = await t.get(accountRef);
                    if (!accountDoc.exists()) {
                        throw new Error("Conta não encontrada!");
                    }

                    const currentBalance = accountDoc.data().balance;
                    const newBalance = transaction.type === 'income' 
                        ? currentBalance + transaction.amount 
                        : currentBalance - transaction.amount;
                    
                    t.update(accountRef, { balance: newBalance });

                    const transactionRef = doc(collection(db, path));
                    t.set(transactionRef, {
                         ...transaction,
                        date: Timestamp.fromDate(transaction.date),
                    });
                });
            } catch (error) {
                console.error("Error adding transaction: ", error);
                showToast({ title: "Erro", description: "Não foi possível adicionar a transação.", variant: "destructive" });
            }
        } else {
            // Local storage logic for account transactions
            await addDataItem<Transaction>(userId, "transactions", transaction, (item) => ({
                ...item,
                date: item.date, 
            }));
            
            const accounts = getLocalData<Account>('accounts');
            const accountIndex = accounts.findIndex(a => a.id === transaction.accountId);
            if (accountIndex > -1) {
                const account = accounts[accountIndex];
                const newBalance = transaction.type === 'income'
                    ? account.balance + transaction.amount
                    : account.balance - transaction.amount;
                accounts[accountIndex] = { ...account, balance: newBalance };
                setLocalData('accounts', accounts);
            }
        }
    } else {
         // If it's a credit card transaction, just add it without updating any account balance.
         await addDataItem<Transaction>(userId, "transactions", transaction, (item) => ({
            ...item,
            date: Timestamp.fromDate(item.date),
        }));
    }
};


export const getTransactions = (userId: string | null, callback: (transactions: Transaction[]) => void) => {
    return getDataSubscription<Transaction>(userId, "transactions", callback, "date", (data) => ({
        ...data,
        date: (data.date as Timestamp).toDate(),
    }));
};


// Budgets
export const addBudget = async (userId: string | null, budget: Omit<Budget, "id">) => {
    // Budget creation does not create a transaction anymore. 
    // It's just a goal.
    await addDataItem<Budget>(userId, "budgets", budget);
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

    const collections = ["transactions", "budgets", "savings_goals", "accounts", "credit_cards"];

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
