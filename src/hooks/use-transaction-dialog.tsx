
"use client";

import React, { createContext, useContext, useState } from 'react';

// This file is safe to be edited, it's not a standard file from the template.

type TransactionDialogContextType = {
    isOpen: boolean;
    openDialog: (state?: { type?: 'income' | 'expense'; isCreditCard?: boolean }) => void;
    closeDialog: () => void;
    initialType?: 'income' | 'expense';
    initialIsCreditCard?: boolean;
}

const TransactionDialogContext = createContext<TransactionDialogContextType | undefined>(undefined);


export const TransactionDialogProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [initialState, setInitialState] = useState<{ type?: 'income' | 'expense'; isCreditCard?: boolean }>({});

    const openDialog = (state: { type?: 'income' | 'expense'; isCreditCard?: boolean } = {}) => {
        setInitialState(state);
        setIsOpen(true);
    };
    
    const closeDialog = () => {
        setIsOpen(false);
        setInitialState({});
    };

    return (
        <TransactionDialogContext.Provider value={{ isOpen, openDialog, closeDialog, initialType: initialState.type, initialIsCreditCard: initialState.isCreditCard }}>
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

    
