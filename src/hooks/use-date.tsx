

"use client";

import React, { createContext, useContext, useState, useMemo, useCallback } from 'react';
import { balanceCache } from '@/lib/firestore';

const DATE_CACHE_KEY = 'granor_selected_date';

interface DateContextType {
  selectedDate: Date;
  setSelectedDate: (date: Date) => void;
  goToNextMonth: () => void;
  goToPreviousMonth: () => void;
  goToCurrentMonth: () => void;
  getMonthDateRange: (date: Date) => { startDate: Date; endDate: Date };
  clearBalanceCache: () => void;
}

const DateContext = createContext<DateContextType | undefined>(undefined);

export const DateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedDate, setSelectedDateState] = useState(new Date());

  const setSelectedDate = (date: Date) => {
    if (typeof window !== 'undefined') {
        localStorage.setItem(DATE_CACHE_KEY, date.toISOString());
    }
    setSelectedDateState(date);
  };

  const clearBalanceCache = useCallback(() => {
    balanceCache.clear();
  }, []);

  const goToNextMonth = () => {
    clearBalanceCache();
    const newDate = new Date(selectedDate);
    newDate.setMonth(newDate.getMonth() + 1);
    setSelectedDate(newDate);
  };

  const goToPreviousMonth = () => {
    clearBalanceCache();
    const newDate = new Date(selectedDate);
    newDate.setMonth(newDate.getMonth() - 1);
    setSelectedDate(newDate);
  };
  
  const goToCurrentMonth = () => {
    clearBalanceCache();
    setSelectedDate(new Date());
  }

  const getMonthDateRange = useCallback((date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0, 23, 59, 59);
    return { startDate, endDate };
  }, []);

  const value = useMemo(() => ({
    selectedDate,
    setSelectedDate,
    goToNextMonth,
    goToPreviousMonth,
    goToCurrentMonth,
    getMonthDateRange,
    clearBalanceCache,
  }), [selectedDate, getMonthDateRange, clearBalanceCache]);

  return <DateContext.Provider value={value}>{children}</DateContext.Provider>;
};

export const useDate = () => {
  const context = useContext(DateContext);
  if (context === undefined) {
    throw new Error('useDate must be used within a DateProvider');
  }
  return context;
};

    