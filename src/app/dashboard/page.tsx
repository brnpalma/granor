
"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from "@/components/ui/table";
import {
  ChartContainer
} from "@/components/ui/chart";
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Pie, PieChart, Cell, Legend } from "recharts";
import { Button } from "@/components/ui/button";
import { ExternalLink, MoreVertical, Search, CheckCircle, Clock, Lock } from 'lucide-react';
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/use-auth";
import { getAccounts, getCreditCards, getBudgets, getTransactions, addCategory, getCategories } from "@/lib/firestore";
import type { Account, CreditCard as CreditCardType, Budget, Transaction, Category } from "@/lib/types";
import { CategoryIcon, ItauLogo, NubankLogo, PicpayLogo, MercadoPagoLogo, BradescoLogo } from "@/components/icons";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { useDate } from "@/hooks/use-date";
import { startOfMonth, endOfMonth, eachDayOfInterval, format, subMonths } from 'date-fns';


const BankIcon = ({ name }: { name: string }) => {
    const lowerCaseName = name.toLowerCase();
    if (lowerCaseName.includes("itaú") || lowerCaseName.includes("itau")) {
        return <ItauLogo />;
    }
    if (lowerCaseName.includes("nubank")) {
        return <NubankLogo />;
    }
    if (lowerCaseName.includes("picpay")) {
        return <PicpayLogo />;
    }
    if (lowerCaseName.includes("mercado pago")) {
        return <MercadoPagoLogo />;
    }
     if (lowerCaseName.includes("bradesco")) {
        return <BradescoLogo />;
    }
    return <CategoryIcon category="Outros" className="h-8 w-8 text-muted-foreground" />;
};


export default function DashboardPage() {
  const { user } = useAuth();
  const { selectedDate, getMonthDateRange } = useDate();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [creditCards, setCreditCards] = useState<CreditCardType[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [previousMonthTransactions, setPreviousMonthTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [monthlyIncome, setMonthlyIncome] = useState(0);
  const [monthlyExpenses, setMonthlyExpenses] = useState(0);
  const [previousMonthLeftover, setPreviousMonthLeftover] = useState(0);
  const [forecastedBalance, setForecastedBalance] = useState(0);

  useEffect(() => {
    if (!user?.uid) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const { startDate, endDate } = getMonthDateRange(selectedDate);
    const prevMonthDate = subMonths(selectedDate, 1);
    const { startDate: prevStartDate, endDate: prevEndDate } = getMonthDateRange(prevMonthDate);

    let dataLoaded = { accounts: false, creditCards: false, transactions: false, prevTransactions: false };
    const checkLoading = () => {
      if (Object.values(dataLoaded).every(Boolean)) {
        setIsLoading(false);
      }
    };

    const unsubscribers: (() => void)[] = [];

    unsubscribers.push(getAccounts(user.uid, (data) => {
      setAccounts(data);
      dataLoaded.accounts = true;
      checkLoading();
    }));

    unsubscribers.push(getCreditCards(user.uid, (data) => {
      setCreditCards(data);
      dataLoaded.creditCards = true;
      checkLoading();
    }));

    unsubscribers.push(getTransactions(user.uid, (data) => {
      setTransactions(data);
      
      const effectiveIncome = data.filter(t => t.type === 'income' && t.efetivado).reduce((sum, t) => sum + t.amount, 0);
      const effectiveExpenses = data.filter(t => t.type === 'expense' && t.efetivado).reduce((sum, t) => sum + t.amount, 0);
      setMonthlyIncome(effectiveIncome);
      setMonthlyExpenses(effectiveExpenses);
      
      const totalIncome = data.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
      const totalExpenses = data.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
      setForecastedBalance(totalIncome - totalExpenses);

      dataLoaded.transactions = true;
      checkLoading();
    }, { startDate, endDate }));

    unsubscribers.push(getTransactions(user.uid, (data) => {
      setPreviousMonthTransactions(data);
      const prevIncome = data.filter(t => t.type === 'income' && t.efetivado).reduce((sum, t) => sum + t.amount, 0);
      const prevExpenses = data.filter(t => t.type === 'expense' && t.efetivado).reduce((sum, t) => sum + t.amount, 0);
      setPreviousMonthLeftover(prevIncome - prevExpenses);
      dataLoaded.prevTransactions = true;
      checkLoading();
    }, { startDate: prevStartDate, endDate: prevEndDate }));

    const timer = setTimeout(() => {
      if (Object.values(dataLoaded).some(v => !v)) {
        setIsLoading(false)
      }
    }, 3000);
    unsubscribers.push(() => clearTimeout(timer));

    return () => unsubscribers.forEach(unsub => unsub());
  }, [user, selectedDate, getMonthDateRange]);

  const monthlyNetBalance = useMemo(() => {
    return previousMonthLeftover + monthlyIncome - monthlyExpenses;
  }, [previousMonthLeftover, monthlyIncome, monthlyExpenses]);
  

  const totalBalance = useMemo(() => {
    return accounts.reduce((sum, acc) => sum + acc.balance, 0);
  }, [accounts]);
  
  const creditCardInvoices = useMemo(() => {
    return creditCards.map(card => {
        const invoiceTotal = transactions
            .filter(t => t.creditCardId === card.id && t.type === 'expense')
            .reduce((sum, t) => sum + t.amount, 0);
        return { ...card, invoiceTotal };
    });
  }, [creditCards, transactions]);
  
  const balanceChartData = useMemo(() => {
    const { startDate, endDate } = getMonthDateRange(selectedDate);
    if (transactions.length === 0 && previousMonthLeftover === 0) return [];
  
    const daysInMonth = eachDayOfInterval({ start: startDate, end: endDate });
  
    const monthTransactions = transactions
      .filter(t => t.accountId && t.efetivado)
      .sort((a, b) => a.date.getTime() - b.date.getTime());
    
    let cumulativeBalance = previousMonthLeftover;
    const dailyBalances: { [key: string]: number } = {};

    monthTransactions.forEach(t => {
      const day = format(t.date, 'dd/MM');
      const change = t.type === 'income' ? t.amount : -t.amount;
      dailyBalances[day] = (dailyBalances[day] || 0) + change;
    });

    let lastBalance = previousMonthLeftover;
    return daysInMonth.map(day => {
        const dayKey = format(day, 'dd/MM');
        if (dailyBalances[dayKey] !== undefined) {
            lastBalance += dailyBalances[dayKey];
        }
         if (selectedDate.getMonth() === new Date().getMonth() && selectedDate.getFullYear() === new Date().getFullYear() && day > new Date()) {
            return null;
        }
        return {
            date: dayKey,
            Saldo: lastBalance,
        };
    }).filter(Boolean);

  }, [transactions, selectedDate, getMonthDateRange, previousMonthLeftover]);

  const chartColors = useMemo(() => {
    const isPositive = monthlyNetBalance >= 0;
    return {
        stroke: isPositive ? '#22c55e' : '#ef4444', // green-500 or red-500
        fill: isPositive ? 'rgba(34, 197, 94, 0.4)' : 'rgba(239, 68, 68, 0.4)'
    };
  }, [monthlyNetBalance]);
  

  if (isLoading) {
    return (
        <div className="space-y-4 pb-6 px-2">
             <div className="grid gap-4 md:grid-cols-3">
                <Skeleton className="h-24" />
                <Skeleton className="h-24" />
                <Skeleton className="h-24" />
             </div>
             <Skeleton className="h-40" />
             <div className="grid gap-4">
                <Skeleton className="h-32" />
                <Skeleton className="h-48" />
             </div>
        </div>
    );
  }

  return (
    <div className="space-y-6 pb-6 text-white px-2">
        <div className="flex justify-center items-center text-center p-2 gap-4">
            <div className="flex-1 text-center">
                <div className="flex items-center justify-center gap-1 text-sm text-gray-400">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Inicial</span>
                </div>
                <p className="text-base md:text-lg font-bold">
                    {previousMonthLeftover.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </p>
            </div>
            <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-sm text-gray-400">
                     <div className="h-4 w-4 rounded-full border-2 border-gray-400 flex items-center justify-center">
                        <div className="h-1.5 w-1.5 rounded-full bg-gray-400"></div>
                    </div>
                    <span>Saldo</span>
                </div>
                <p className="text-2xl md:text-4xl font-bold">
                    {monthlyNetBalance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </p>
            </div>
            <div className="flex-1 text-center">
                 <div className="flex items-center justify-center gap-1 text-sm text-gray-400">
                    <Clock className="h-4 w-4"/>
                    <span>Previsto *</span>
                </div>
                <p className="text-base md:text-lg font-bold">
                    {forecastedBalance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </p>
            </div>
        </div>

        <div className="h-40 w-full mx-auto">
             <ResponsiveContainer width="100%" height="100%">
                <AreaChart 
                    data={balanceChartData}
                    margin={{ top: 5, right: 30, left: -20, bottom: 5 }}
                >
                <defs>
                    <linearGradient id="colorSaldo" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={chartColors.fill} stopOpacity={0.8}/>
                        <stop offset="95%" stopColor={chartColors.fill} stopOpacity={0}/>
                    </linearGradient>
                </defs>
                <XAxis 
                    dataKey="date" 
                    stroke="#6b7280" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false}
                    interval="preserveStartEnd"
                />
                <YAxis 
                    stroke="#6b7280" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false}
                    tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                    domain={['dataMin - 500', 'dataMax + 500']}
                />
                <Tooltip
                    contentStyle={{ backgroundColor: '#27272a', border: '1px solid #3f3f46', color: '#fff' }}
                    formatter={(value: number) => [value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), "Saldo"]}
                    labelStyle={{ fontWeight: 'bold' }}
                 />
                <Area type="monotone" dataKey="Saldo" stroke={chartColors.stroke} fillOpacity={1} fill="url(#colorSaldo)" strokeWidth={2} dot={{ stroke: chartColors.stroke, strokeWidth: 2, r: 4, fill: '#18181b' }} activeDot={{ r: 6 }}/>
                </AreaChart>
            </ResponsiveContainer>
        </div>
        
        <div>
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input placeholder="Pesquisar Transações" className="bg-[#27272a] border-[#3f3f46] pl-10 h-12 rounded-lg" />
            </div>
        </div>

        <div className="space-y-2">
            <div className="flex justify-between items-center px-4">
                <h2 className="text-xl font-bold">Contas</h2>
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon"><ExternalLink className="h-5 w-5 text-gray-400" /></Button>
                    <Button variant="ghost" size="icon"><MoreVertical className="h-5 w-5 text-gray-400" /></Button>
                </div>
            </div>
            <div className="bg-[#27272a] rounded-lg p-2 space-y-4">
                {accounts.map(account => (
                    <div key={account.id} className="flex items-center gap-4">
                        <BankIcon name={account.name} />
                        <div className="flex-1">
                            <p className="font-bold uppercase">{account.name}</p>
                        </div>
                        <p className="font-bold">{account.balance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                         <Button variant="ghost" size="icon" className="text-gray-400"><MoreVertical className="h-5 w-5" /></Button>
                    </div>
                ))}
                 <div className="border-t border-gray-700 my-2"></div>
                 <div className="flex items-center gap-4">
                    <div className="w-8 h-8"></div>
                    <div className="flex-1">
                        <p className="font-bold">Total</p>
                         <p className="text-sm text-gray-400">Previsto</p>
                    </div>
                    <div>
                        <p className="font-bold text-right">{totalBalance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                         <p className="text-sm text-gray-400 text-right">R$ 0,00</p>
                    </div>
                    <div className="w-10"></div>
                </div>
            </div>
        </div>
        
        <div className="space-y-2">
             <div className="flex justify-between items-center px-4">
                <h2 className="text-xl font-bold">Cartões de crédito</h2>
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon"><ExternalLink className="h-5 w-5 text-gray-400" /></Button>
                    <Button variant="ghost" size="icon"><MoreVertical className="h-5 w-5 text-gray-400" /></Button>
                </div>
            </div>
            <div className="bg-[#27272a] rounded-lg p-2 space-y-4">
                {creditCardInvoices.map(card => {
                    const dueDate = new Date();
                    dueDate.setDate(card.dueDay);
                    const isClosed = new Date().getDate() > card.closingDay;

                    return (
                        <div key={card.id} className="flex items-center gap-4">
                            <BankIcon name={card.name} />
                            <div className="flex-1">
                                <p className="font-bold uppercase">{card.name}</p>
                                <p className="text-sm text-gray-400">Vencimento</p>
                            </div>
                            <div className="text-right">
                                <div className="flex items-center justify-end gap-2 font-bold">
                                    {isClosed ? <Lock className="h-4 w-4 text-red-500" /> : <CheckCircle className="h-4 w-4 text-green-500" />}
                                    <span>{card.invoiceTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                </div>
                                <p className="text-sm text-gray-400">{dueDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).toUpperCase()}</p>
                            </div>
                            <Button variant="ghost" size="icon" className="text-gray-400"><MoreVertical className="h-5 w-5" /></Button>
                        </div>
                    )
                })}
            </div>
        </div>

    </div>
  );

    