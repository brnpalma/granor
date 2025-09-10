

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
  deleteDoc,
  where,
  getDoc,
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

type DataType = Transaction | Budget | SavingsGoal | Account | CreditCard | Category;
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

const deleteDataItem = async (
    userId: string | null,
    collectionName: string,
    itemId: string
) => {
    const path = getCollectionPath(userId, collectionName);
    if (path) {
        try {
            await deleteDoc(doc(db, path, itemId));
        } catch (error) {
            console.error(`Error deleting ${collectionName}: `, error);
            showToast({ title: "Erro", description: `Não foi possível remover ${collectionName}.`, variant: "destructive" });
        }
    } else {
        let localData = getLocalData<any>(collectionName);
        localData = localData.filter((item: any) => item.id !== itemId);
        setLocalData(collectionName, localData);
    }
};


const getDataSubscription = <T extends DataType>(
    userId: string | null,
    collectionName: string,
    callback: (data: T[]) => void,
    { orderField = "date", orderDirection = "desc", dateRange, postProcess = (d) => d }: { orderField?: string; orderDirection?: "asc" | "desc"; dateRange?: { startDate: Date; endDate: Date }; postProcess?: (data: any) => any }
) => {
    const path = getCollectionPath(userId, collectionName);

    if (path) {
        let q = query(collection(db, path), orderBy(orderField, orderDirection));

        if (dateRange) {
            q = query(q, 
                where(orderField, ">=", Timestamp.fromDate(dateRange.startDate)),
                where(orderField, "<=", Timestamp.fromDate(dateRange.endDate))
            );
        }

        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const data: T[] = [];
            querySnapshot.forEach((doc) => {
                data.push({
                    id: doc.id,
                    ...postProcess(doc.data()),
                } as T);
            });
            callback(data);
        }, (error) => {
            console.error(`Error fetching ${collectionName}:`, error);
            callback([]); // Return empty array on error
        });
        return unsubscribe;
    } else {
        let data = getLocalData<T>(collectionName);
        if (dateRange && data.length > 0 && 'date' in data[0]) {
           data = data.filter(item => {
               const itemDate = new Date((item as any).date);
               return itemDate >= dateRange.startDate && itemDate <= dateRange.endDate;
           })
        }
        callback(data);
        return () => {};
    }
};

// Categories
export const addCategory = (userId: string | null, category: Omit<Category, "id">) => {
    return addDataItem<Category>(userId, "categories", category);
};

export const deleteCategory = (userId: string | null, categoryId: string) => {
    return deleteDataItem(userId, "categories", categoryId);
};

export const getCategories = (userId: string | null, callback: (categories: Category[]) => void) => {
    return getDataSubscription<Category>(userId, "categories", callback, { orderField: 'name', orderDirection: 'asc' });
};

// Accounts
export const addAccount = (userId: string | null, account: Omit<Account, "id">) => {
    return addDataItem<Account>(userId, "accounts", account);
};

export const updateAccount = async (userId: string | null, accountId: string, accountData: Omit<Account, "id">) => {
    const path = getCollectionPath(userId, "accounts");
    if (path) {
        try {
            await updateDoc(doc(db, path, accountId), accountData);
        } catch (error) {
            console.error(`Error updating account: `, error);
            showToast({ title: "Erro", description: "Não foi possível atualizar a conta.", variant: "destructive" });
        }
    } else {
        const localData = getLocalData<Account>("accounts");
        const index = localData.findIndex(a => a.id === accountId);
        if (index !== -1) {
            localData[index] = { ...localData[index], ...accountData };
            setLocalData("accounts", localData);
        }
    }
};


export const deleteAccount = async (userId: string | null, accountId: string) => {
    const accountPath = getCollectionPath(userId, "accounts");
    const transactionsPath = getCollectionPath(userId, "transactions");
    if (accountPath && transactionsPath) {
        try {
            const batch = writeBatch(db);
            
            const accountRef = doc(db, accountPath, accountId);
            batch.delete(accountRef);

            const transactionsQuery = query(collection(db, transactionsPath), where("accountId", "==", accountId));
            const transactionsSnapshot = await getDocs(transactionsQuery);
            transactionsSnapshot.forEach(doc => {
                batch.delete(doc.ref);
            });

            await batch.commit();
        } catch (error) {
             console.error("Error deleting account and its transactions: ", error);
             showToast({ title: "Erro", description: "Não foi possível remover a conta e suas transações.", variant: "destructive" });
        }
    } else {
       deleteDataItem(userId, "accounts", accountId);
       let transactions = getLocalData<Transaction>("transactions");
       transactions = transactions.filter(t => t.accountId !== accountId);
       setLocalData("transactions", transactions);
    }
};


export const getAccounts = (userId: string | null, callback: (accounts: Account[]) => void) => {
    return getDataSubscription<Account>(userId, "accounts", callback, { orderField: 'name', orderDirection: 'asc' });
};

// Credit Cards
export const addCreditCard = (userId: string | null, card: Omit<CreditCard, "id">) => {
    return addDataItem<CreditCard>(userId, "credit_cards", card);
};

export const updateCreditCard = async (userId: string | null, cardId: string, cardData: Omit<CreditCard, "id">) => {
    const path = getCollectionPath(userId, "credit_cards");
    if (path) {
        try {
            await updateDoc(doc(db, path, cardId), cardData);
        } catch (error) {
            console.error(`Error updating credit card: `, error);
            showToast({ title: "Erro", description: "Não foi possível atualizar o cartão.", variant: "destructive" });
        }
    } else {
        const localData = getLocalData<CreditCard>("credit_cards");
        const index = localData.findIndex(c => c.id === cardId);
        if (index !== -1) {
            localData[index] = { ...localData[index], ...cardData };
            setLocalData("credit_cards", localData);
        }
    }
};


export const deleteCreditCard = async (userId: string | null, cardId: string) => {
    const cardPath = getCollectionPath(userId, "credit_cards");
    const transactionsPath = getCollectionPath(userId, "transactions");
    if (cardPath && transactionsPath) {
        try {
            const batch = writeBatch(db);
            
            const cardRef = doc(db, cardPath, cardId);
            batch.delete(cardRef);

            const transactionsQuery = query(collection(db, transactionsPath), where("creditCardId", "==", cardId));
            const transactionsSnapshot = await getDocs(transactionsQuery);
            transactionsSnapshot.forEach(doc => {
                batch.delete(doc.ref);
            });

            await batch.commit();
        } catch (error) {
             console.error("Error deleting credit card and its transactions: ", error);
             showToast({ title: "Erro", description: "Não foi possível remover o cartão e suas transações.", variant: "destructive" });
        }
    } else {
       deleteDataItem(userId, "credit_cards", cardId);
       let transactions = getLocalData<Transaction>("transactions");
       transactions = transactions.filter(t => t.creditCardId !== cardId);
       setLocalData("transactions", transactions);
    }
};

export const getCreditCards = (userId: string | null, callback: (cards: CreditCard[]) => void) => {
    return getDataSubscription<CreditCard>(userId, "credit_cards", callback, { orderField: 'name', orderDirection: 'asc' });
};


// Transactions
export const addTransaction = async (userId: string | null, transaction: Omit<Transaction, "id">) => {
    const path = getCollectionPath(userId, "transactions");
    const accountPath = getCollectionPath(userId, "accounts");

    if (path && accountPath && transaction.efetivado) {
        if (transaction.accountId) {
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
                    const transactionToSave = {
                        ...transaction,
                        date: Timestamp.fromDate(transaction.date),
                    };
                    delete (transactionToSave as Partial<typeof transactionToSave>).creditCardId; // Ensure it's not set
                    t.set(transactionRef, transactionToSave);
                });
            } catch (error) {
                console.error("Error adding account transaction: ", error);
                showToast({ title: "Erro", description: "Não foi possível adicionar a transação da conta.", variant: "destructive" });
            }
        } else if (transaction.creditCardId) {
             try {
                const transactionToSave = {
                    ...transaction,
                    date: Timestamp.fromDate(transaction.date),
                };
                delete (transactionToSave as Partial<typeof transactionToSave>).accountId; // Ensure it's not set
                await addDoc(collection(db, path), transactionToSave);
            } catch(error) {
                console.error("Error adding credit card transaction: ", error);
                showToast({ title: "Erro", description: "Não foi possível adicionar a transação do cartão.", variant: "destructive" });
            }
        }
    } else { // Handle local data or non-efetivado transactions
        await addDataItem<Transaction>(userId, "transactions", transaction, (item) => ({
            ...item,
            date: item.date, 
        }));
        
        if (transaction.accountId && transaction.efetivado) {
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
    }
};

export const updateTransaction = async (userId: string, transactionId: string, transactionData: Omit<Transaction, "id"> & { id?: string }) => {
    const path = getCollectionPath(userId, "transactions");
    if (!path) return;

    const { id, ...dataToUpdate } = transactionData;

    try {
        await runTransaction(db, async (t) => {
            const transactionRef = doc(db, path, transactionId);
            const transactionDoc = await t.get(transactionRef);

            if (!transactionDoc.exists()) {
                throw "Transaction does not exist!";
            }

            const originalTransaction = { id: transactionDoc.id, ...transactionDoc.data() } as Transaction;
            originalTransaction.date = (originalTransaction.date as unknown as Timestamp).toDate();

            const wasEfetivado = originalTransaction.efetivado;
            const isNowEfetivado = dataToUpdate.efetivado;

            // Only adjust balance if the 'efetivado' status changes
            if (wasEfetivado !== isNowEfetivado && originalTransaction.accountId) {
                const accountPath = getCollectionPath(userId, "accounts");
                if (!accountPath) throw "Account path not found";
                const accountRef = doc(db, accountPath, originalTransaction.accountId);
                const accountDoc = await t.get(accountRef);

                if (accountDoc.exists()) {
                    const currentBalance = accountDoc.data().balance;
                    let newBalance = currentBalance;

                    // Becoming efetivado: apply transaction
                    if (!wasEfetivado && isNowEfetivado) {
                         newBalance = originalTransaction.type === 'income' ? currentBalance + originalTransaction.amount : currentBalance - originalTransaction.amount;
                    } 
                    // Becoming pending: revert transaction
                    else if (wasEfetivado && !isNowEfetivado) {
                         newBalance = originalTransaction.type === 'income' ? currentBalance - originalTransaction.amount : currentBalance + originalTransaction.amount;
                    }
                    t.update(accountRef, { balance: newBalance });
                }
            }
            
            const finalData = { ...dataToUpdate, date: Timestamp.fromDate(dataToUpdate.date) };
            t.update(transactionRef, finalData);
        });

    } catch (error) {
        console.error("Error updating transaction status: ", error);
        showToast({ title: "Erro", description: "Não foi possível atualizar a transação.", variant: "destructive" });
    }
};


export const deleteTransaction = async (userId: string | null, transactionId: string) => {
    const transactionsPath = getCollectionPath(userId, 'transactions');
    if (!transactionsPath) {
        // Handle local data deletion if needed
        let localTransactions = getLocalData<Transaction>('transactions');
        const transactionToDelete = localTransactions.find(t => t.id === transactionId);
        if (transactionToDelete && transactionToDelete.accountId) {
            let localAccounts = getLocalData<Account>('accounts');
            const accountIndex = localAccounts.findIndex(a => a.id === transactionToDelete.accountId);
            if (accountIndex > -1) {
                const account = localAccounts[accountIndex];
                const amountToRevert = transactionToDelete.amount;
                const newBalance = transactionToDelete.type === 'expense' ? account.balance + amountToRevert : account.balance - amountToRevert;
                localAccounts[accountIndex] = { ...account, balance: newBalance };
                setLocalData('accounts', localAccounts);
            }
        }
        localTransactions = localTransactions.filter(t => t.id !== transactionId);
        setLocalData('transactions', localTransactions);
        return;
    }

    const transactionRef = doc(db, transactionsPath, transactionId);

    try {
        await runTransaction(db, async (t) => {
            const transactionDoc = await t.get(transactionRef);
            if (!transactionDoc.exists()) {
                throw "Transaction does not exist!";
            }

            const transactionData = transactionDoc.data() as Transaction;
            transactionData.date = (transactionData.date as unknown as Timestamp).toDate();


            // Only adjust balance if the transaction was 'efetivado'
            if (transactionData.accountId && transactionData.efetivado) {
                const accountPath = getCollectionPath(userId, 'accounts');
                if (!accountPath) return;

                const accountRef = doc(db, accountPath, transactionData.accountId);
                const accountDoc = await t.get(accountRef);

                if (accountDoc.exists()) {
                    const currentBalance = accountDoc.data().balance;
                    const amountToRevert = transactionData.amount;
                    const newBalance = transactionData.type === 'expense'
                        ? currentBalance + amountToRevert
                        : currentBalance - amountToRevert;
                    
                    t.update(accountRef, { balance: newBalance });
                }
            }
            t.delete(transactionRef);
        });
    } catch (error) {
        console.error("Error deleting transaction: ", error);
        showToast({ title: "Erro", description: "Não foi possível deletar a transação.", variant: "destructive" });
    }
};


export const getTransactions = (
    userId: string | null,
    callback: (transactions: Transaction[]) => void,
    dateRange?: { startDate: Date; endDate: Date }
) => {
    return getDataSubscription<Transaction>(userId, "transactions", callback, {
        orderField: "date",
        orderDirection: "desc",
        dateRange,
        postProcess: (data) => ({
            ...data,
            date: (data.date as Timestamp).toDate(),
        }),
    });
};


// Budgets
export const addBudget = async (userId: string | null, budget: Omit<Budget, "id">) => {
    await addDataItem<Budget>(userId, "budgets", budget);
};

export const deleteBudget = async (userId: string | null, budgetId: string) => {
    try {
        await deleteDataItem(userId, "budgets", budgetId);
    } catch (error) {
        console.error("Error deleting budget: ", error);
        showToast({ title: "Erro", description: "Não foi possível remover o orçamento.", variant: "destructive" });
    }
};


export const getBudgets = (
    userId: string | null,
    callback: (budgets: Budget[]) => void,
) => {
    return getDataSubscription<Budget>(userId, "budgets", callback, { orderField: 'category', orderDirection: 'asc' });
};


// Savings Goals
export const addSavingsGoal = (userId: string | null, goal: Omit<SavingsGoal, "id">) => {
  return addDataItem<SavingsGoal>(userId, "savings_goals", goal);
};

export const deleteSavingsGoal = (userId: string | null, goalId: string) => {
    return deleteDataItem(userId, "savings_goals", goalId);
};

export const getSavingsGoals = (userId: string | null, callback: (goals: SavingsGoal[]) => void) => {
    return getDataSubscription<SavingsGoal>(userId, "savings_goals", callback, { orderField: 'name', orderDirection: 'asc' });
};

// Function to migrate local data to Firestore
export const migrateLocalDataToFirestore = async (userId: string) => {
    if (!userId) return;
    let didMigrate = false;
    
    const collections = ["transactions", "budgets", "savings_goals", "accounts", "credit_cards", "categories"];

    for (const collectionName of collections) {
        const localData = getLocalData<any>(collectionName);
        if (localData.length > 0) {
            const firestorePath = getCollectionPath(userId, collectionName);
            if (firestorePath) {
                // To prevent duplicates, we check if Firestore is already populated.
                const firestoreDocs = await getDocs(collection(db, firestorePath));
                if (firestoreDocs.size > 0) {
                    console.log(`Firestore already has data for ${collectionName}. Skipping migration.`);
                    continue;
                }
                
                didMigrate = true;

                const batch = writeBatch(db);
                localData.forEach(item => {
                    const { id, ...data } = item;
                    let processedData = data;
                    if (collectionName === 'transactions' && data.date) {
                        processedData = {...data, date: Timestamp.fromDate(new Date(data.date))};
                    }
                    const docRef = doc(collection(db, firestorePath));
                    batch.set(docRef, processedData);
                });
                await batch.commit();
            }
        }
    }
    if(didMigrate) {
        showToast({ title: "Dados Sincronizados!", description: "Seus dados locais foram salvos na sua conta." });
    }
};

    
