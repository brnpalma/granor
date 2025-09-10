
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
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [monthlyIncome, setMonthlyIncome] = useState(0);
  const [monthlyExpenses, setMonthlyExpenses] = useState(0);
  const [previousMonthLeftover, setPreviousMonthLeftover] = useState<number | null>(null);
  const [forecastedBalance, setForecastedBalance] = useState(0);

  // Effect to calculate previous month's leftover
  useEffect(() => {
    if (!user?.uid) {
      if (previousMonthLeftover === null) setPreviousMonthLeftover(0);
      return;
    }
    
    setIsLoading(true);
    const prevMonthDate = subMonths(selectedDate, 1);
    const { startDate: prevStartDate, endDate: prevEndDate } = getMonthDateRange(prevMonthDate);

    const unsubPrevTransactions = getTransactions(user.uid, (data) => {
      const prevTotalIncome = data.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
      const prevTotalExpenses = data.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
      setPreviousMonthLeftover(prevTotalIncome - prevTotalExpenses);
    }, { startDate: prevStartDate, endDate: prevEndDate });

    return () => unsubPrevTransactions();
  }, [user, selectedDate, getMonthDateRange]);

  // Effect to calculate current month's data, dependent on previousMonthLeftover
  useEffect(() => {
    if (!user?.uid || previousMonthLeftover === null) {
        setIsLoading(false);
        return;
    }

    const { startDate, endDate } = getMonthDateRange(selectedDate);
    
    let dataLoaded = { accounts: false, creditCards: false, transactions: false, budgets: false, categories: false };
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

    unsubscribers.push(getBudgets(user.uid, (data) => {
      setBudgets(data);
      dataLoaded.budgets = true;
      checkLoading();
    }));

    unsubscribers.push(getCategories(user.uid, (data) => {
        setCategories(data);
        dataLoaded.categories = true;
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
      
      setForecastedBalance(totalIncome - totalExpenses + previousMonthLeftover);

      dataLoaded.transactions = true;
      checkLoading();
    }, { startDate, endDate }));

    const timer = setTimeout(() => {
        if (Object.values(dataLoaded).some(v => !v)) {
            setIsLoading(false);
        }
    }, 3000);
    unsubscribers.push(() => clearTimeout(timer));

    return () => unsubscribers.forEach(unsub => unsub());

  }, [user, selectedDate, getMonthDateRange, previousMonthLeftover]);


  const monthlyNetBalance = useMemo(() => {
    if (previousMonthLeftover === null) return 0;
    const income = transactions.filter(t => t.type === 'income' && t.efetivado).reduce((sum, t) => sum + t.amount, 0);
    const expenses = transactions.filter(t => t.type === 'expense' && t.efetivado).reduce((sum, t) => sum + t.amount, 0);
    return previousMonthLeftover + income - expenses;
  }, [transactions, previousMonthLeftover]);
  

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
    if (transactions.length === 0 && (previousMonthLeftover === null || previousMonthLeftover === 0)) return [];
  
    const daysInMonth = eachDayOfInterval({ start: startDate, end: endDate });
  
    const monthTransactions = transactions
      .filter(t => t.accountId && t.efetivado)
      .sort((a, b) => a.date.getTime() - b.date.getTime());
    
    const dailyBalances: { [key: string]: number } = {};

    monthTransactions.forEach(t => {
      const day = format(t.date, 'dd/MM');
      const change = t.type === 'income' ? t.amount : -t.amount;
      dailyBalances[day] = (dailyBalances[day] || 0) + change;
    });

    let lastBalance = previousMonthLeftover || 0;
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
  
  const getBudgetSpentAmount = (category: string) => {
    return transactions
      .filter((t) => t.type === 'expense' && t.category === category)
      .reduce((sum, t) => sum + t.amount, 0);
  };
  
  const expensesByCategory = useMemo(() => {
    const expenseCategories = categories.filter(c => c.type === 'expense');
    return expenseCategories.map(category => {
        const total = transactions
            .filter(t => t.type === 'expense' && t.category === category.name)
            .reduce((sum, t) => sum + t.amount, 0);
        return { name: category.name, value: total };
    }).filter(c => c.value > 0)
    .sort((a,b) => b.value - a.value);
  }, [transactions, categories]);

  const totalExpenses = useMemo(() => {
    return expensesByCategory.reduce((sum, i) => sum + i.value, 0);
  }, [expensesByCategory]);
  
  const PIECHART_COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#AF19FF", "#FF4560"];


  if (isLoading || previousMonthLeftover === null) {
    return (
        <div className="space-y-4">
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
    <div className="space-y-6">
        <div className="flex w-full items-center justify-center text-center p-2 gap-4">
            <div className="flex-1 flex flex-col items-center gap-1">
                <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Inicial</span>
                </div>
                <p className="text-sm md:text-base">
                    {(previousMonthLeftover ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </p>
            </div>
            <div className="flex-shrink-0 flex flex-col items-center gap-1">
                 <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground">
                     <div className="h-4 w-4 rounded-full border-2 border-muted-foreground flex items-center justify-center">
                        <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground"></div>
                    </div>
                    <span>Saldo</span>
                </div>
                <p className="text-lg md:text-xl font-bold">
                    {monthlyNetBalance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </p>
            </div>
            <div className="flex-1 flex flex-col items-center gap-1">
                 <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4"/>
                    <span>Previsto *</span>
                </div>
                <p className="text-sm md:text-base">
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
                    stroke="hsl(var(--muted-foreground))" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false}
                    interval="preserveStartEnd"
                />
                <YAxis 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12} 
                    tickLine={false}                     axisLine={false}
                    tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                    domain={['dataMin - 500', 'dataMax + 500']}
                />
                <Tooltip
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--foreground))' }}
                    formatter={(value: number) => [value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), "Saldo"]}
                    labelStyle={{ fontWeight: 'bold' }}
                 />
                <Area type="monotone" dataKey="Saldo" stroke={chartColors.stroke} fillOpacity={1} fill="url(#colorSaldo)" strokeWidth={2} dot={{ stroke: chartColors.stroke, strokeWidth: 2, r: 4, fill: 'hsl(var(--background))' }} activeDot={{ r: 6 }}/>
                </AreaChart>
            </ResponsiveContainer>
        </div>
        
        <div>
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input placeholder="Pesquisar Transações" className="bg-background border-border pl-10 h-12 rounded-lg" />
            </div>
        </div>

        <div className="space-y-2">
            <div className="flex justify-between items-center px-4">
                <h2 className="text-xl font-bold">Contas</h2>
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon"><ExternalLink className="h-5 w-5 text-muted-foreground" /></Button>
                    <Button variant="ghost" size="icon"><MoreVertical className="h-5 w-5 text-muted-foreground" /></Button>
                </div>
            </div>
            <Card>
              <CardContent className="p-2 space-y-4">
                {accounts.map(account => (
                    <div key={account.id} className="flex items-center gap-4">
                        <BankIcon name={account.name} />
                        <div className="flex-1">
                            <p className="font-bold uppercase">{account.name}</p>
                        </div>
                        <p className="font-bold">{account.balance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                         <Button variant="ghost" size="icon" className="text-muted-foreground"><MoreVertical className="h-5 w-5" /></Button>
                    </div>
                ))}
                 <div className="border-t border-border my-2"></div>
                 <div className="flex items-center gap-4">
                    <div className="w-8 h-8"></div>
                    <div className="flex-1">
                        <p className="font-bold">Total</p>
                         <p className="text-sm text-muted-foreground">Previsto</p>
                    </div>
                    <div>
                        <p className="font-bold text-right">{totalBalance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                         <p className="text-sm text-muted-foreground text-right">R$ 0,00</p>
                    </div>
                    <div className="w-10"></div>
                </div>
              </CardContent>
            </Card>
        </div>
        
        <div className="space-y-2">
             <div className="flex justify-between items-center px-4">
                <h2 className="text-xl font-bold">Cartões de crédito</h2>
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon"><ExternalLink className="h-5 w-5 text-muted-foreground" /></Button>
                    <Button variant="ghost" size="icon"><MoreVertical className="h-5 w-5 text-muted-foreground" /></Button>
                </div>
            </div>
            <Card>
              <CardContent className="p-2 space-y-4">
                {creditCardInvoices.map(card => {
                    const dueDate = new Date();
                    dueDate.setDate(card.dueDay);
                    const isClosed = new Date().getDate() > card.closingDay;

                    return (
                        <div key={card.id} className="flex items-center gap-4">
                            <BankIcon name={card.name} />
                            <div className="flex-1">
                                <p className="font-bold uppercase">{card.name}</p>
                                <p className="text-sm text-muted-foreground">Vencimento</p>
                            </div>
                            <div className="text-right">
                                <div className="flex items-center justify-end gap-2 font-bold">
                                    {isClosed ? <Lock className="h-4 w-4 text-red-500" /> : <CheckCircle className="h-4 w-4 text-green-500" />}
                                    <span>{card.invoiceTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                </div>
                                <p className="text-sm text-muted-foreground">{dueDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).toUpperCase()}</p>
                            </div>
                            <Button variant="ghost" size="icon" className="text-muted-foreground"><MoreVertical className="h-5 w-5" /></Button>
                        </div>
                    )
                })}
              </CardContent>
            </Card>
        </div>
        
        <div className="space-y-2">
            <div className="flex justify-between items-center px-4">
                <h2 className="text-xl font-bold">Orçamentos de despesas</h2>
                <div className="flex items-center gap-2">
                    <Link href="/dashboard/budgets">
                        <Button variant="ghost" size="icon"><ExternalLink className="h-5 w-5 text-muted-foreground" /></Button>
                    </Link>
                    <Button variant="ghost" size="icon"><MoreVertical className="h-5 w-5 text-muted-foreground" /></Button>
                </div>
            </div>
            <Card>
                <CardContent className="p-4 space-y-4">
                    {budgets.map((budget) => {
                        const spent = getBudgetSpentAmount(budget.category);
                        const progress = Math.min((spent / budget.amount) * 100, 100);
                        return (
                            <div key={budget.id}>
                                <div className="flex items-center gap-3">
                                    <div className="bg-muted p-2 rounded-full">
                                        <CategoryIcon category={budget.category} className="h-5 w-5 text-muted-foreground" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex justify-between items-center">
                                            <p className="font-medium">{budget.category}</p>
                                            <p className="text-sm font-medium">{spent.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                                        </div>
                                        <div className="flex justify-between items-center">
                                             <p className="text-xs text-muted-foreground">de {budget.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                                             <p className="text-xs text-muted-foreground">{progress.toFixed(0)}%</p>
                                        </div>
                                    </div>
                                </div>
                                <Progress value={progress} className="mt-2 h-2" />
                            </div>
                        )
                    })}
                </CardContent>
            </Card>
        </div>
        
        <div className="space-y-2">
            <div className="flex justify-between items-center px-4">
                <h2 className="text-xl font-bold">Despesas por categoria</h2>
                <div className="flex items-center gap-2">
                    <Link href="/dashboard/reports">
                        <Button variant="ghost" size="icon"><ExternalLink className="h-5 w-5 text-muted-foreground" /></Button>
                    </Link>
                    <Button variant="ghost" size="icon"><MoreVertical className="h-5 w-5 text-muted-foreground" /></Button>
                </div>
            </div>
             <Card>
                <CardContent className="p-4">
                    <div className="h-64 relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={expensesByCategory}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    outerRadius={80}
                                    innerRadius={60}
                                    fill="#8884d8"
                                    dataKey="value"
                                    paddingAngle={5}
                                >
                                    {expensesByCategory.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={PIECHART_COLORS[index % PIECHART_COLORS.length]} />
                                    ))}
                                </Pie>
                                <Legend iconType="circle" />
                                <Tooltip
                                    formatter={(value: number, name) => [value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), name]}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
                            <p className="text-2xl font-bold">{totalExpenses.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                            <p className="text-sm text-muted-foreground">Total de Despesas</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>

    </div>
  );

}

    
