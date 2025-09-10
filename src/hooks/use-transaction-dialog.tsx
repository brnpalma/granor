
"use client";

import React, { createContext, useContext, useState } from 'react';
import type { Transaction } from '@/lib/types';

type DialogInitialState = {
    type?: 'income' | 'expense';
    isCreditCard?: boolean;
    transaction?: Transaction;
};

type TransactionDialogContextType = {
    isOpen: boolean;
    openDialog: (initialState?: DialogInitialState) => void;
    closeDialog: () => void;
    initialData: DialogInitialState;
}

const TransactionDialogContext = createContext<TransactionDialogContextType | undefined>(undefined);


export const TransactionDialogProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [initialData, setInitialData] = useState<DialogInitialState>({});

    const openDialog = (initialState: DialogInitialState = {}) => {
        setInitialData(initialState);
        setIsOpen(true);
    };
    
    const closeDialog = () => {
        setIsOpen(false);
        setInitialData({}); // Reset initial data on close
    };

    return (
        <TransactionDialogContext.Provider value={{ isOpen, openDialog, closeDialog, initialData }}>
            {children}
        </TransactionDialogContext.Provider>
    );
};


export const useTransactionDialog = () => {
    const context = useContext(TransactionDialogContext);
    if (!context) {
        throw new Error('useTransactionDialog must be used within a TransactionDialogProvider');
    }
    return context;
};
