

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
  setDoc,
  limit,
} from "firebase/firestore";
import type { Transaction, Budget, SavingsGoal, Category, Account, CreditCard, UserPreferences, RecurrencePeriod, RecurrenceEditScope } from "./types";
import { useToast } from "@/hooks/use-toast";
import { subMonths, startOfMonth, endOfMonth, addDays, addWeeks, addMonths, addYears, isAfter, isSameMonth } from 'date-fns';


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

// User Preferences
export const getUserPreferences = (
    userId: string,
    callback: (preferences: UserPreferences) => void
): (() => void) => {
    const prefDocRef = doc(db, `users/${userId}/preferences`, 'user');
    const unsubscribe = onSnapshot(prefDocRef, (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            callback({
                showBalance: data.showBalance ?? true,
                includePreviousMonthBalance: data.includePreviousMonthBalance ?? true,
            });
        } else {
            // Return default preferences if document doesn't exist
            callback({ showBalance: true, includePreviousMonthBalance: true });
        }
    });
    return unsubscribe;
};

export const updateUserPreferences = async (
    userId: string,
    preferences: Partial<UserPreferences>
): Promise<void> => {
    const prefDocRef = doc(db, `users/${userId}/preferences`, 'user');
    try {
        await setDoc(prefDocRef, preferences, { merge: true });
    } catch (error) {
        console.error("Error updating user preferences: ", error);
        showToast({ title: "Erro", description: "Não foi possível salvar suas preferências.", variant: "destructive" });
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

export const updateAccount = async (userId: string | null, accountId: string, accountData: Partial<Omit<Account, "id">>) => {
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
const getNextDate = (currentDate: Date, period: RecurrencePeriod): Date => {
    switch(period) {
        case 'diária': return addDays(currentDate, 1);
        case 'semanal': return addWeeks(currentDate, 1);
        case 'mensal': return addMonths(currentDate, 1);
        case 'anual': return addYears(currentDate, 1);
        default: return currentDate;
    }
};

export const addTransaction = async (userId: string, transaction: Omit<Transaction, "id">) => {
    const transactionsPath = getCollectionPath(userId, "transactions");
    if (!transactionsPath) return;

    try {
        const { date, ...restOfTransaction } = transaction;
        const dataToAdd: any = {
            ...restOfTransaction,
            date: Timestamp.fromDate(date),
        };

        if (transaction.isRecurring && transaction.recurrence && !transaction.isFixed) {
            const batch = writeBatch(db);
            const recurrenceId = doc(collection(db, 'transactions')).id; // Generate a unique ID for the group
            const { quantity, period, startInstallment } = transaction.recurrence;
            let currentDate = transaction.date;

            for (let i = 0; i < quantity; i++) {
                const installmentNumber = i + startInstallment;
                const newDocRef = doc(collection(db, transactionsPath));
                
                const installmentTransaction: Omit<Transaction, "id"> = {
                    ...transaction,
                    date: currentDate,
                    description: `${transaction.description} (${installmentNumber}/${quantity})`,
                    recurrenceId: recurrenceId,
                    efetivado: i === 0 ? transaction.efetivado : false, // Only first is effective if checked
                    isRecurring: true,
                };
                 // Ensure date is a Timestamp
                const { date: installmentDate, ...restOfInstallment } = installmentTransaction;
                batch.set(newDocRef, { ...restOfInstallment, date: Timestamp.fromDate(installmentDate) });

                currentDate = getNextDate(currentDate, period);
            }
            await batch.commit();

        } else {
            // Single transaction (or fixed)
            await addDoc(collection(db, transactionsPath), dataToAdd);
        }
    } catch (error) {
        console.error("Error adding transaction(s): ", error);
        showToast({ title: "Erro", description: "Não foi possível adicionar a transação.", variant: "destructive" });
    }
};

export const updateTransaction = async (
  userId: string,
  transactionId: string,
  dataToUpdate: Partial<Omit<Transaction, "id">>,
  scope: RecurrenceEditScope = "single",
  originalTransaction?: Transaction
) => {
  const transactionsPath = getCollectionPath(userId, "transactions");
  if (!transactionsPath) return;

  try {
    const batch = writeBatch(db);
    const mainTransactionRef = doc(db, transactionsPath, transactionId);

    if (scope === "single" || !originalTransaction?.recurrenceId) {
      const dataWithTimestamp: any = { ...dataToUpdate };
       if (dataToUpdate.date) {
            dataWithTimestamp.date = Timestamp.fromDate(dataToUpdate.date);
       }
      batch.update(mainTransactionRef, dataWithTimestamp);
    } else {
      const q = query(
        collection(db, transactionsPath),
        where("recurrenceId", "==", originalTransaction.recurrenceId)
      );
      const querySnapshot = await getDocs(q);

      let transactionsToUpdate = querySnapshot.docs;

      if (scope === "future") {
        transactionsToUpdate = transactionsToUpdate.filter(
          (doc) => (doc.data().date as Timestamp).toDate() >= originalTransaction.date
        );
      }

      // These fields are unique per installment and should not be bulk-updated
      const { date, description, ...sharedData } = dataToUpdate;
      
      transactionsToUpdate.forEach((doc) => {
        const transactionRef = doc.ref;
        batch.update(transactionRef, sharedData);
      });
    }

    await batch.commit();
  } catch (error) {
    console.error("Error updating transaction(s): ", error);
    showToast({ title: "Erro", description: "Não foi possível atualizar a(s) transação(ões).", variant: "destructive" });
  }
};


export const deleteTransaction = async (
  userId: string | null,
  transactionId: string,
  scope: RecurrenceEditScope = "single",
  transaction?: Transaction
) => {
  const transactionsPath = getCollectionPath(userId, 'transactions');
  if (!transactionsPath) return;

  try {
    const batch = writeBatch(db);

    if (scope === 'single' || !transaction?.recurrenceId) {
      const transactionRef = doc(db, transactionsPath, transactionId);
      batch.delete(transactionRef);
    } else {
      const q = query(collection(db, transactionsPath), where('recurrenceId', '==', transaction.recurrenceId));
      const querySnapshot = await getDocs(q);

      let docsToDelete = querySnapshot.docs;

      if (scope === 'future') {
        docsToDelete = docsToDelete.filter(doc => (doc.data().date as Timestamp).toDate() >= transaction.date);
      }
      
      docsToDelete.forEach(doc => {
        batch.delete(doc.ref);
      });
    }
    
    await batch.commit();
  } catch (error) {
    console.error("Error deleting transaction(s): ", error);
    showToast({ title: "Erro", description: "Não foi possível deletar a(s) transação(ões).", variant: "destructive" });
  }
};

export const getTransactionById = async (userId: string, transactionId: string): Promise<Transaction | null> => {
    const path = getCollectionPath(userId, "transactions");
    if (!path) return null;

    try {
        const docRef = doc(db, path, transactionId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            return {
                id: docSnap.id,
                ...data,
                date: (data.date as Timestamp).toDate(),
            } as Transaction;
        } else {
            return null;
        }
    } catch (error) {
        console.error("Error fetching transaction by ID:", error);
        return null;
    }
};


export const getTransactions = (
    userId: string,
    callback: (transactions: Transaction[]) => void,
    dateRange: { startDate: Date; endDate: Date }
) => {
    const path = getCollectionPath(userId, "transactions");
    if (!path) {
        callback([]);
        return () => {};
    }

    const allTransactionsQuery = query(
        collection(db, path),
        where("date", "<=", Timestamp.fromDate(dateRange.endDate)),
        orderBy("date", "desc")
    );

    const unsubscribe = onSnapshot(allTransactionsQuery, (snapshot) => {
        const transactions: Transaction[] = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            date: (doc.data().date as Timestamp).toDate(),
        } as Transaction));

        const transactionsForMonth: Transaction[] = [];
        const fixedTransactionsProjections = new Map<string, Transaction>();

        const selectedYear = dateRange.startDate.getFullYear();
        const selectedMonth = dateRange.startDate.getMonth();

        for (const t of transactions) {
            const originalDate = t.date;
            const originalYear = originalDate.getFullYear();
            const originalMonth = originalDate.getMonth();

            if (t.isFixed) {
                const isAfterOrSameMonth = (selectedYear > originalYear) || (selectedYear === originalYear && selectedMonth >= originalMonth);
                
                if (isAfterOrSameMonth) {
                    const projectedDate = new Date(selectedYear, selectedMonth, originalDate.getDate());
                    
                    const projectionId = `${t.id}-${selectedYear}-${selectedMonth}`;
                    
                    if (!fixedTransactionsProjections.has(projectionId)) {
                         fixedTransactionsProjections.set(projectionId, {
                            ...t,
                            id: projectionId, // Give it a temporary unique ID for the UI
                            date: projectedDate,
                            efetivado: false, // Projections are not effective by default
                        });
                    }
                }
            } else if (originalYear === selectedYear && originalMonth === selectedMonth) {
                transactionsForMonth.push(t);
            }
        }
        
        // Filter out projections that have already been made effective
        for(const t of transactions) {
            if (isSameMonth(t.date, dateRange.startDate) && !t.isFixed) {
                // This transaction might be an effective version of a projection
                const originalDay = t.date.getDate();
                // A bit of a hacky way to find the original fixed transaction
                const potentialOriginalId = Array.from(fixedTransactionsProjections.values()).find(p => p.date.getDate() === originalDay && p.description === t.description)?.id.split('-')[0];
                
                if (potentialOriginalId) {
                     const projectionId = `${potentialOriginalId}-${selectedYear}-${selectedMonth}`;
                     if(fixedTransactionsProjections.has(projectionId)) {
                        fixedTransactionsProjections.delete(projectionId);
                     }
                }
            }
        }


        transactionsForMonth.push(...Array.from(fixedTransactionsProjections.values()));
        
        callback(transactionsForMonth.sort((a, b) => b.date.getTime() - a.date.getTime()));

    }, (error) => {
        console.error("Error fetching transactions:", error);
        callback([]);
    });

    return unsubscribe;
};


export const getTransactionsOnce = async (
    userId: string,
    dateRange?: { startDate?: Date; endDate: Date }
): Promise<Transaction[]> => {
    const path = getCollectionPath(userId, "transactions");
    if (!path) return [];
    
    try {
        let q = query(
            collection(db, path),
            orderBy("date", "asc"), // ascending to calculate running balance
            where("date", "<=", Timestamp.fromDate(dateRange?.endDate ?? new Date()))
        );

        if(dateRange?.startDate) {
            q = query(q, where("date", ">=", Timestamp.fromDate(dateRange.startDate)));
        }

        const querySnapshot = await getDocs(q);
        const transactions: Transaction[] = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            transactions.push({
                id: doc.id,
                ...data,
                date: (data.date as Timestamp).toDate(),
            } as Transaction);
        });
        return transactions;
    } catch (error) {
        console.error("Error fetching transactions once:", error);
        return [];
    }
};

// In-memory cache for balance calculations
export const balanceCache = new Map<string, number>();

export const findPreviousMonthBalance = async (
  userId: string,
  currentDate: Date,
): Promise<number> => {
    const previousMonthEndDate = endOfMonth(subMonths(currentDate, 1));
    const cacheKey = `${userId}-${previousMonthEndDate.getFullYear()}-${previousMonthEndDate.getMonth()}`;

    if (balanceCache.has(cacheKey)) {
        return balanceCache.get(cacheKey)!;
    }

    const accountsPath = getCollectionPath(userId, "accounts");
    if(!accountsPath) return 0;

    const accountsSnapshot = await getDocs(collection(db, accountsPath));
    const initialBalances = accountsSnapshot.docs.reduce((sum, doc) => {
        const account = doc.data() as Omit<Account, "id">;
        if (!account.ignoreInTotals) {
            return sum + account.initialBalance;
        }
        return sum;
    }, 0);

    const allTransactionsUntilPreviousMonth = await getTransactionsOnce(userId, { endDate: previousMonthEndDate });
    
    const accountsInfo: Account[] = accountsSnapshot.docs.map(doc => ({id: doc.id, ...doc.data()} as Account));
    const includedAccountIds = new Set(accountsInfo.filter(a => !a.ignoreInTotals).map(a => a.id));

    const finalBalance = allTransactionsUntilPreviousMonth.reduce((balance, t) => {
        if (!t.accountId || !includedAccountIds.has(t.accountId) || !t.efetivado) {
            return balance;
        }
        if (t.type === 'income') {
            return balance + t.amount;
        }
        if (t.type === 'expense') {
            return balance - t.amount;
        }
        return balance;
    }, initialBalances);

    balanceCache.set(cacheKey, finalBalance);
    return finalBalance;
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
                    console.log(`Firestore has data for ${collectionName}. Skipping migration.`);
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
