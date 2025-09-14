

"use client";

import React, { createContext, useContext, useState, useMemo, useCallback } from 'react';
import { balanceCache } from '@/lib/firestore';

interface DateContextType {
  selectedDate: Date;
  setSelectedDate: (date: Date) => void;
  goToNextMonth: () => void;
  goToPreviousMonth: () => void;
  getMonthDateRange: (date: Date) => { startDate: Date; endDate: Date };
  clearBalanceCache: () => void;
}

const DateContext = createContext<DateContextType | undefined>(undefined);

export const DateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedDate, setSelectedDate] = useState(new Date());

  const clearBalanceCache = useCallback(() => {
    balanceCache.clear();
  }, []);

  const goToNextMonth = () => {
    clearBalanceCache();
    setSelectedDate(currentDate => {
      const newDate = new Date(currentDate);
      newDate.setMonth(newDate.getMonth() + 1);
      return newDate;
    });
  };

  const goToPreviousMonth = () => {
    clearBalanceCache();
    setSelectedDate(currentDate => {
      const newDate = new Date(currentDate);
      newDate.setMonth(newDate.getMonth() - 1);
      return newDate;
    });
  };

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
    getMonthDateRange,
    clearBalanceCache,
  }), [selectedDate, getMonthDateRange, clearBalanceCache, goToNextMonth, goToPreviousMonth]);

  return <DateContext.Provider value={value}>{children}</DateContext.Provider>;
};

export const useDate = () => {
  const context = useContext(DateContext);
  if (context === undefined) {
    throw new Error('useDate must be used within a DateProvider');
  }
  return context;
};
