
"use client";

import React, { createContext, useContext } from 'react';

// This file is safe to be edited, it's not a standard file from the template.

type TransactionDialogContextType = {
    isOpen: boolean;
    openDialog: (state?: { type?: 'income' | 'expense'; isCreditCard?: boolean }) => void;
    closeDialog: () => void;
    initialType?: 'income' | 'expense';
    initialIsCreditCard?: boolean;
}

const TransactionDialogContext = createContext<TransactionDialogContextType | undefined>(undefined);

export const useTransactionDialog = () => {
    const context = useContext(TransactionDialogContext);
    if (!context) {
        throw new Error('useTransactionDialog must be used within a TransactionDialogProvider');
    }
    return context;
};

    