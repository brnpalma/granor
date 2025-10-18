

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
import type { Transaction, Budget, SavingsGoal, Category, Account, CreditCard, UserPreferences, RecurrencePeriod, RecurrenceEditScope, TransactionType } from "./types";
import { toast } from "@/hooks/use-toast";
import { subMonths, startOfMonth, endOfMonth, addDays, addWeeks, addMonths, addYears, isAfter, isSameMonth } from 'date-fns';


// Toast hook must be called from a component
const showToast = (options: { title: string; description?: string; variant?: "default" | "destructive" | "success" }) => {
    toast(options);
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
            const docRef = await addDoc(collection(db, path), postProcess(item));
            return docRef.id;
        } catch (error) {
            console.error(`Error adding ${collectionName}: `, error);
            showToast({ title: "Erro", description: `Não foi possível adicionar ${collectionName}.`, variant: "destructive" });
        }
    } else {
        const localData = getLocalData<T>(collectionName);
        const newItem = { ...item, id: new Date().toISOString() } as T;
        setLocalData<T>(collectionName, [...localData, newItem]);
        return newItem.id;
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
        const defaultPrefs: UserPreferences = {
            showBalance: true,
            includePreviousMonthBalance: true,
            includeBudgetsInForecast: false,
            includeBudgetsInPastForecast: false,
            transactionSortOrder: 'desc',
        };
        if (docSnap.exists()) {
            const data = docSnap.data();
            callback({
                showBalance: data.showBalance ?? defaultPrefs.showBalance,
                includePreviousMonthBalance: data.includePreviousMonthBalance ?? defaultPrefs.includePreviousMonthBalance,
                includeBudgetsInForecast: data.includeBudgetsInForecast ?? defaultPrefs.includeBudgetsInForecast,
                includeBudgetsInPastForecast: data.includeBudgetsInPastForecast ?? defaultPrefs.includeBudgetsInPastForecast,
                transactionSortOrder: data.transactionSortOrder ?? defaultPrefs.transactionSortOrder,
            });
        } else {
            // Return default preferences if document doesn't exist
            callback(defaultPrefs);
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

export const updateCategory = async (userId: string | null, categoryId: string, categoryData: Partial<Omit<Category, "id">>) => {
    const path = getCollectionPath(userId, "categories");
    if (path) {
        try {
            await updateDoc(doc(db, path, categoryId), categoryData);
        } catch (error) {
            console.error(`Error updating category: `, error);
            showToast({ title: "Erro", description: "Não foi possível atualizar a categoria.", variant: "destructive" });
        }
    } else {
        const localData = getLocalData<Category>("categories");
        const index = localData.findIndex(c => c.id === categoryId);
        if (index !== -1) {
            localData[index] = { ...localData[index], ...categoryData };
            setLocalData("categories", localData);
        }
    }
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

export const addTransaction = async (userId: string, transaction: Omit<Transaction, "id">, returnId: boolean = false) => {
    const transactionsPath = getCollectionPath(userId, "transactions");
    if (!transactionsPath) return;

    try {
        const { date, ...restOfTransaction } = transaction;
        const dataToAdd: any = {
            ...restOfTransaction,
            date: Timestamp.fromDate(date),
        };

        if (transaction.type === 'transfer') {
            const batch = writeBatch(db);
            const transferId = doc(collection(db, 'transactions')).id;

            // Expense from source account
            const expenseDocRef = doc(collection(db, transactionsPath));
            const expenseData: Omit<Transaction, "id" | "type"> & { type: 'expense' } = {
                ...transaction,
                description: transaction.description || "Transferência",
                type: 'expense',
                transferId: transferId,
                category: 'Transferência',
            };
            delete (expenseData as any).destinationAccountId;
            delete (expenseData as any).creditCardId;
            batch.set(expenseDocRef, { ...expenseData, date: Timestamp.fromDate(expenseData.date) });
            
            // Income to destination account
            const incomeDocRef = doc(collection(db, transactionsPath));
            const incomeData: Omit<Transaction, "id" | "type" | "accountId"> & { type: 'income', accountId: string } = {
                ...transaction,
                description: transaction.description || "Transferência",
                type: 'income',
                transferId: transferId,
                accountId: transaction.destinationAccountId as string,
                category: 'Transferência',
            };
            delete (incomeData as any).destinationAccountId;
            delete (incomeData as any).creditCardId;
            batch.set(incomeDocRef, { ...incomeData, date: Timestamp.fromDate(incomeData.date) });
            
            await batch.commit();

        } else if (transaction.isRecurring && transaction.recurrence && !transaction.isFixed) {
            const batch = writeBatch(db);
            const recurrenceId = doc(collection(db, 'transactions')).id; // Generate a unique ID for the group
            const { quantity, period, startInstallment } = transaction.recurrence;
            let currentDate = transaction.date;
            
            const installmentsToCreate = quantity - startInstallment + 1;

            for (let i = 0; i < installmentsToCreate; i++) {
                const installmentNumber = startInstallment + i;
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
                const { date: installmentDate, recurrence: installmentRecurrence, ...restOfInstallment } = installmentTransaction;
                batch.set(newDocRef, { ...restOfInstallment, date: Timestamp.fromDate(installmentDate), recurrence: installmentRecurrence || null });

                currentDate = getNextDate(currentDate, period);
            }
            await batch.commit();

        } else {
            // Single transaction (or fixed)
            if (dataToAdd.recurrence === undefined) delete dataToAdd.recurrence;
            if (dataToAdd.recurrenceId === undefined) delete dataToAdd.recurrenceId;
            const docRef = await addDoc(collection(db, transactionsPath), dataToAdd);
            if(returnId) return docRef.id;
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
  originalTransaction?: Transaction | null
) => {
    const transactionsPath = getCollectionPath(userId, "transactions");
    if (!transactionsPath) return;

    try {
        const dataWithTimestamp: any = { ...dataToUpdate };
        if (dataToUpdate.date) {
            dataWithTimestamp.date = Timestamp.fromDate(dataToUpdate.date);
        }
        if ('overrides' in dataToUpdate && originalTransaction?.overrides) {
            dataWithTimestamp.overrides = { ...originalTransaction.overrides, ...dataToUpdate.overrides };
        }

        // Handle recurring transactions
        if (originalTransaction?.isRecurring && scope !== "single" && originalTransaction?.recurrenceId) {
             const batch = writeBatch(db);
             const q = query(collection(db, transactionsPath), where("recurrenceId", "==", originalTransaction.recurrenceId));
             const querySnapshot = await getDocs(q);
             let transactionsToUpdate = querySnapshot.docs;

             if (scope === "future") {
                 transactionsToUpdate = transactionsToUpdate.filter(d => (d.data().date as Timestamp).toDate() >= originalTransaction.date);
             }
             const { date, description, ...sharedData } = dataToUpdate;
             transactionsToUpdate.forEach(docToUpdate => {
                 batch.update(docToUpdate.ref, sharedData);
             });
             await batch.commit();

        } else if (originalTransaction?.isFixed && scope === 'single' && dataToUpdate.date) {
            // Create a one-off override for a fixed transaction
            const monthKey = `${dataToUpdate.date.getFullYear()}-${dataToUpdate.date.getMonth()}`;
            const newTransactionData = { ...dataToUpdate, isFixed: false, isRecurring: false, recurrenceId: originalTransaction.id } as Omit<Transaction, 'id'>;
            if('id' in newTransactionData) delete (newTransactionData as any).id;
            
            const overrideId = await addTransaction(userId, newTransactionData, true);

            if (overrideId) {
                const originalDocRef = doc(db, transactionsPath, originalTransaction.id);
                await updateDoc(originalDocRef, { overrides: { ...(originalTransaction.overrides || {}), [monthKey]: overrideId } });
            }
        } else if (originalTransaction?.isFixed && scope === 'future' && dataToUpdate.date) {
             // End the current fixed transaction and create a new one starting from this month
             const oldDocRef = doc(db, transactionsPath, transactionId);
             await updateDoc(oldDocRef, { endDate: Timestamp.fromDate(subMonths(dataToUpdate.date, 1)) });
             
             const { id, ...newFixedTransaction } = { ...originalTransaction, ...dataToUpdate, id: '', date: dataToUpdate.date, endDate: null, overrides: {} };
             await addTransaction(userId, newFixedTransaction as Omit<Transaction, 'id'>);
        
        } else if (originalTransaction?.isFixed && scope === 'all') {
            const mainTransactionRef = doc(db, transactionsPath, transactionId);
            // ao editar todas, nao devemos mudar a data
            const { date, ...rest } = dataWithTimestamp;
            await updateDoc(mainTransactionRef, rest);
        } else { // 'all' scope for fixed, or any other single update
            const mainTransactionRef = doc(db, transactionsPath, transactionId);
            await updateDoc(mainTransactionRef, dataWithTimestamp);
        }
    } catch (error) {
        console.error("Error updating transaction(s): ", error);
        showToast({ title: "Erro", description: "Não foi possível atualizar a(s) transação(ões).", variant: "destructive" });
    }
};


export const deleteTransaction = async (
  userId: string | null,
  transactionId: string,
  scope: RecurrenceEditScope = "single",
  transaction?: Transaction | null
) => {
  const transactionsPath = getCollectionPath(userId, 'transactions');
  if (!transactionsPath) return;

  try {
    const originalDocId = transaction?.recurrenceId || (transaction?.isFixed ? transaction.id : null) || transactionId;
    const originalDocRef = doc(db, transactionsPath, originalDocId);

    // Deleting a transfer
    if(transaction?.transferId) {
        const q = query(collection(db, transactionsPath), where('transferId', '==', transaction.transferId));
        const querySnapshot = await getDocs(q);
        const batch = writeBatch(db);
        querySnapshot.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
        return;
    }

    // Deleting a single instance of a non-fixed recurring transaction
    if (transaction?.isRecurring && scope === 'single') {
        await deleteDoc(doc(db, transactionsPath, transactionId));
        return;
    }
    
    // Deleting a single projected instance of a fixed transaction
    if (transaction?.isFixed && transaction.id.includes('-projected-') && scope === 'single') {
        const monthKey = `${transaction.date.getFullYear()}-${transaction.date.getMonth()}`;
        await updateDoc(originalDocRef, {
            [`overrides.${monthKey}`]: 'deleted'
        });
        return;
    }

    // Deleting a single original transaction (non-recurring)
    if (!transaction?.isFixed && !transaction?.isRecurring && scope === 'single') {
        await deleteDoc(doc(db, transactionsPath, transactionId));
        return;
    }

    // Deleting ALL instances of a recurring/fixed transaction
    if (scope === 'all') {
        const docToDeleteId = transaction?.isFixed ? (transaction.recurrenceId || transaction.id) : transaction?.recurrenceId;
        if (!docToDeleteId) {
             await deleteDoc(doc(db, transactionsPath, transactionId));
             return;
        }

        if (transaction?.isFixed) {
            await deleteDoc(doc(db, transactionsPath, docToDeleteId));
        } else if (transaction?.isRecurring) {
            const q = query(collection(db, transactionsPath), where('recurrenceId', '==', docToDeleteId));
            const querySnapshot = await getDocs(q);
            const batch = writeBatch(db);
            querySnapshot.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
        }
        return;
    }

    // Deleting FUTURE instances of a recurring/fixed transaction
    if (scope === 'future') {
        if (transaction?.isFixed && transaction.date) {
            const newEndDate = endOfMonth(subMonths(transaction.date, 1));
            await updateDoc(originalDocRef, { endDate: Timestamp.fromDate(newEndDate) });
        } else if (transaction?.isRecurring && transaction.recurrenceId && transaction.date) {
            const q = query(collection(db, transactionsPath), where('recurrenceId', '==', transaction.recurrenceId));
            const querySnapshot = await getDocs(q);
            const batch = writeBatch(db);
            querySnapshot.docs.forEach(doc => {
                if ((doc.data().date as Timestamp).toDate() >= transaction.date) {
                    batch.delete(doc.ref);
                }
            });
            await batch.commit();
        }
        return;
    }

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
                endDate: data.endDate ? (data.endDate as Timestamp).toDate() : undefined,
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

    // Query for transactions where isFixed is not true (includes false and non-existent)
    // We split into two because Firestore doesn't support != queries with range filters
    const nonRecurringQuery1 = query(
        collection(db, path),
        where("isFixed", "==", false),
        where("date", ">=", Timestamp.fromDate(dateRange.startDate)),
        where("date", "<=", Timestamp.fromDate(dateRange.endDate))
    );
     const nonRecurringQuery2 = query(
        collection(db, path),
        where("isFixed", "==", null),
        where("date", ">=", Timestamp.fromDate(dateRange.startDate)),
        where("date", "<=", Timestamp.fromDate(dateRange.endDate))
    );

    // Query for fixed transactions that could occur in the current month
    const fixedQuery = query(
        collection(db, path),
        where("isFixed", "==", true)
    );

    const handleSnapshots = async () => {
        try {
            const [nonRecurringSnap1, nonRecurringSnap2, fixedSnapshot] = await Promise.all([
                getDocs(nonRecurringQuery1),
                getDocs(nonRecurringQuery2),
                getDocs(fixedQuery),
            ]);
            
            const combinedResults: Transaction[] = [];
            const processedIds = new Set<string>();

            const processDoc = (doc: any) => {
                 const t = { id: doc.id, ...doc.data(), date: (doc.data().date as Timestamp).toDate() } as Transaction;
                 if (!processedIds.has(t.id)) {
                     combinedResults.push(t);
                     processedIds.add(t.id);
                 }
            };
            
            nonRecurringSnap1.forEach(processDoc);
            nonRecurringSnap2.forEach(processDoc);

            const selectedYear = dateRange.startDate.getFullYear();
            const selectedMonth = dateRange.startDate.getMonth();

            fixedSnapshot.forEach(doc => {
                const t = { id: doc.id, ...doc.data(), date: (doc.data().date as Timestamp).toDate(), endDate: doc.data().endDate ? (doc.data().endDate as Timestamp).toDate() : null } as Transaction;
                const originalDate = t.date;
                const originalYear = originalDate.getFullYear();
                const originalMonth = originalDate.getMonth();

                const isAfterStartDate = selectedYear > originalYear || (selectedYear === originalYear && selectedMonth >= originalMonth);
                if (!isAfterStartDate) return;
                
                const isBeforeEndDate = !t.endDate || selectedYear < t.endDate.getFullYear() || (selectedYear === t.endDate.getFullYear() && selectedMonth <= t.endDate.getMonth());
                if (!isBeforeEndDate) return;
                
                const monthKey = `${selectedYear}-${selectedMonth}`;
                if (t.overrides && t.overrides[monthKey]) {
                    if (t.overrides[monthKey] !== 'deleted') {
                         // An override exists, so we should not show the original projected transaction.
                         // The override itself is a normal transaction and will be fetched by other queries.
                    }
                    return; // Either handled by override or deleted for this month
                }
                
                const isOriginalMonth = selectedYear === originalYear && selectedMonth === originalMonth;
                if(isOriginalMonth) {
                     if (!processedIds.has(t.id)) {
                        combinedResults.push(t);
                        processedIds.add(t.id);
                    }
                    return;
                }

                const projectedDate = new Date(selectedYear, selectedMonth, originalDate.getDate());
                const projectedId = `${t.id}-projected-${monthKey}`;

                if (!processedIds.has(projectedId)) {
                    combinedResults.push({
                        ...t,
                        id: projectedId,
                        date: projectedDate,
                        efetivado: false,
                        recurrenceId: t.id,
                    });
                    processedIds.add(projectedId);
                }
            });
            
            callback(combinedResults);

        } catch (error) {
            console.error("Error handling snapshots in getTransactions: ", error);
        }
    };
    
    // Combine listeners
    const unsub1 = onSnapshot(nonRecurringQuery1, handleSnapshots);
    const unsub2 = onSnapshot(nonRecurringQuery2, handleSnapshots);
    const unsub3 = onSnapshot(fixedQuery, handleSnapshots);

    return () => {
        unsub1();
        unsub2();
        unsub3();
    };
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

export const updateBudget = async (userId: string | null, budgetId: string, budgetData: Partial<Omit<Budget, "id">>) => {
    const path = getCollectionPath(userId, "budgets");
    if (path) {
        try {
            await updateDoc(doc(db, path, budgetId), budgetData);
        } catch (error) {
            console.error(`Error updating budget: `, error);
            showToast({ title: "Erro", description: "Não foi possível atualizar o orçamento.", variant: "destructive" });
        }
    } else {
        const localData = getLocalData<Budget>("budgets");
        const index = localData.findIndex(b => b.id === budgetId);
        if (index !== -1) {
            localData[index] = { ...localData[index], ...budgetData };
            setLocalData("budgets", localData);
        }
    }
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
        showToast({ title: "Dados Sincronizados!", description: "Seus dados locais foram salvos na sua conta.", variant: "success" });
    }
};
