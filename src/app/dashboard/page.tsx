

"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
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
import { ExternalLink, MoreVertical, CheckCircle, Clock, Lock, EyeOff, LineChart } from 'lucide-react';
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/use-auth";
import { getAccounts, getCreditCards, getBudgets, getTransactionsOnce, getCategories, getUserPreferences, findPreviousMonthBalance } from "@/lib/firestore";
import type { Account, CreditCard as CreditCardType, Budget, Transaction, UserPreferences } from "@/lib/types";
import { CategoryIcon, ItauLogo, NubankLogo, PicpayLogo, MercadoPagoLogo, BradescoLogo } from "@/components/icons";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { useDate } from "@/hooks/use-date";
import { startOfMonth, endOfMonth, eachDayOfInterval, format, subMonths, startOfDay, isBefore, endOfToday, isSameMonth, isFuture } from 'date-fns';
import { cn } from "@/lib/utils";


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
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [preferences, setPreferences] = useState<UserPreferences>({ showBalance: true, includePreviousMonthBalance: true });
  const [isLoading, setIsLoading] = useState(true);
  const [isBalanceLoading, setIsBalanceLoading] = useState(true);
  
  const [monthlyIncome, setMonthlyIncome] = useState(0);
  const [monthlyExpenses, setMonthlyExpenses] = useState(0);
  const [previousMonthLeftover, setPreviousMonthLeftover] = useState(0);
  const [forecastedBalance, setForecastedBalance] = useState(0);
  
  const includedAccounts = useMemo(() => accounts.filter(a => !a.ignoreInTotals), [accounts]);
  const includedAccountIds = useMemo(() => new Set(includedAccounts.map(a => a.id)), [includedAccounts]);
  
  const transactionsForCurrentMonth = useMemo(() => {
    const { startDate, endDate } = getMonthDateRange(selectedDate);
    return allTransactions.filter(t => t.date >= startDate && t.date <= endDate);
  }, [allTransactions, selectedDate, getMonthDateRange]);

  const includedTransactions = useMemo(() => {
    return transactionsForCurrentMonth.filter(t => !t.accountId || includedAccountIds.has(t.accountId));
  }, [transactionsForCurrentMonth, includedAccountIds]);

   // Effect to fetch all data
    useEffect(() => {
        if (!user?.uid) {
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        
        let dataLoaded = {
            accounts: false,
            creditCards: false,
            budgets: false,
            categories: false,
            transactions: false,
            preferences: false,
        };

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
        
        unsubscribers.push(getUserPreferences(user.uid, (data) => {
            setPreferences(data);
            dataLoaded.preferences = true;
            checkLoading();
        }));

        // Fetch all transactions up to the end of the selected month
        const { endDate } = getMonthDateRange(selectedDate);
        getTransactionsOnce(user.uid, { endDate }).then(transactions => {
            setAllTransactions(transactions);
            dataLoaded.transactions = true;
            checkLoading();
        });


        const timer = setTimeout(() => {
            if (Object.values(dataLoaded).some(v => !v)) {
                setIsLoading(false);
            }
        }, 3000);
        unsubscribers.push(() => clearTimeout(timer));

        return () => unsubscribers.forEach(unsub => unsub());

    }, [user, selectedDate, getMonthDateRange]);

    // Effect to calculate previous month balance
    useEffect(() => {
        if (!user?.uid) return;

        const fetchBalance = async () => {
            setIsBalanceLoading(true);
            const balance = await findPreviousMonthBalance(user.uid, selectedDate);
            setPreviousMonthLeftover(balance);
            setIsBalanceLoading(false);
        };

        fetchBalance();
    }, [user, selectedDate, getMonthDateRange]);
    
    useEffect(() => {
        const effectiveIncome = includedTransactions.filter(t => t.type === 'income' && t.efetivado).reduce((sum, t) => sum + t.amount, 0);
        const effectiveExpenses = includedTransactions.filter(t => t.type === 'expense' && t.efetivado).reduce((sum, t) => sum + t.amount, 0);
        setMonthlyIncome(effectiveIncome);
        setMonthlyExpenses(effectiveExpenses);

        const totalIncome = includedTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
        const totalExpenses = includedTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
      
        setForecastedBalance(totalIncome - totalExpenses);

    }, [includedTransactions]);


  const monthlyNetBalance = useMemo(() => {
    const isFutureMonth = isFuture(startOfMonth(selectedDate));
    const initialAmount = (isFutureMonth && !preferences.includePreviousMonthBalance) ? 0 : previousMonthLeftover;
    const income = includedTransactions.filter(t => t.type === 'income' && t.efetivado).reduce((sum, t) => sum + t.amount, 0);
    const expenses = includedTransactions.filter(t => t.type === 'expense' && t.efetivado).reduce((sum, t) => sum + t.amount, 0);
    return initialAmount + income - expenses;
  }, [includedTransactions, previousMonthLeftover, selectedDate, preferences.includePreviousMonthBalance]);
  
  const effectiveForecastedBalance = useMemo(() => {
    const isFutureMonth = isFuture(startOfMonth(selectedDate));
    const initialAmount = (isFutureMonth && !preferences.includePreviousMonthBalance) ? 0 : previousMonthLeftover;
    return forecastedBalance + initialAmount;
  }, [forecastedBalance, previousMonthLeftover, selectedDate, preferences.includePreviousMonthBalance]);


  const accountBalances = useMemo(() => {
    const balances = new Map<string, number>();
    accounts.forEach(account => {
        const accountTransactions = allTransactions.filter(t => t.accountId === account.id && t.efetivado);
        const currentBalance = accountTransactions.reduce((acc, t) => {
            if (t.type === 'income') return acc + t.amount;
            if (t.type === 'expense') return acc - t.amount;
            return acc;
        }, account.initialBalance);
        balances.set(account.id, currentBalance);
    });
    return balances;
  }, [accounts, allTransactions]);

  const totalBalance = useMemo(() => {
    return includedAccounts.reduce((sum, acc) => sum + (accountBalances.get(acc.id) ?? 0), 0);
  }, [includedAccounts, accountBalances]);

  const creditCardInvoices = useMemo(() => {
    return creditCards.map(card => {
        const invoiceTotal = transactionsForCurrentMonth
            .filter(t => t.creditCardId === card.id && t.type === 'expense')
            .reduce((sum, t) => sum + t.amount, 0);
        return { ...card, invoiceTotal };
    });
  }, [creditCards, transactionsForCurrentMonth]);
  
 const balanceChartData = useMemo(() => {
    const { startDate, endDate } = getMonthDateRange(selectedDate);
    const today = endOfToday();
    const isCurrentMonth = isSameMonth(selectedDate, today);
    const isPastMonth = isBefore(endDate, today);
    const isFutureMonth = isFuture(startDate);

    const initialAmount = (isFutureMonth && !preferences.includePreviousMonthBalance) ? 0 : previousMonthLeftover;
    
    const chartEndDate = isCurrentMonth ? today : endDate;

    const monthTransactions = includedTransactions
      .filter((t) => t.accountId && t.efetivado)
      .sort((a, b) => a.date.getTime() - b.date.getTime());
      
    const dailyChanges: { [key: string]: number } = {};
    monthTransactions.forEach((t) => {
        const dayKey = format(startOfDay(t.date), "yyyy-MM-dd");
        const change = t.type === "income" ? t.amount : -t.amount;
        dailyChanges[dayKey] = (dailyChanges[dayKey] || 0) + change;
    });
    
    if (monthTransactions.length === 0 && !isPastMonth && !isCurrentMonth) {
        return [
          { date: format(startDate, "dd/MM"), Saldo: initialAmount },
          { date: format(chartEndDate, "dd/MM"), Saldo: initialAmount + forecastedBalance },
        ];
    }
    
    let balance = initialAmount;
    
    const allDays = eachDayOfInterval({ start: startDate, end: chartEndDate });

    const chartData = allDays
        .map(day => {
            const dayKey = format(day, "yyyy-MM-dd");
            if (dailyChanges[dayKey]) {
                balance += dailyChanges[dayKey];
            }
            return {
                date: format(day, "dd/MM"),
                Saldo: balance,
                hasTransaction: !!dailyChanges[dayKey],
            };
        })
        .filter(item => isPastMonth || isCurrentMonth ? item.hasTransaction : true);

     // Ensure first and last days are included for past months if they have been filtered out
    if ((isPastMonth || isCurrentMonth) && chartData.length > 0) {
        const firstDayOfMonth = format(startDate, "dd/MM");
        
        if (chartData[0].date !== firstDayOfMonth) {
            chartData.unshift({
                date: firstDayOfMonth,
                Saldo: initialAmount,
                hasTransaction: false,
            });
        }
        
        let lastKnownBalance = chartData[chartData.length -1].Saldo;
        const lastDayInInterval = isCurrentMonth ? today : endDate;
        const lastDayOfMonthFormatted = format(lastDayInInterval, "dd/MM");


        if (chartData[chartData.length - 1].date !== lastDayOfMonthFormatted) {
             chartData.push({
                date: lastDayOfMonthFormatted,
                Saldo: lastKnownBalance,
                hasTransaction: false,
            });
        }
    }


    return chartData;

}, [includedTransactions, previousMonthLeftover, forecastedBalance, selectedDate, getMonthDateRange, preferences.includePreviousMonthBalance]);


  const chartColors = useMemo(() => {
    return {
        stroke: 'hsl(var(--primary))',
        fill: 'hsl(var(--primary))'
    };
  }, []);
  
  const getBudgetSpentAmount = (category: string) => {
    return includedTransactions
      .filter((t) => t.type === 'expense' && t.category === category)
      .reduce((sum, t) => sum + t.amount, 0);
  };
  
  const expensesByCategory = useMemo(() => {
    const expenseCategories = categories.filter(c => c.type === 'expense');
    return expenseCategories.map(category => {
        const total = includedTransactions
            .filter(t => t.type === 'expense' && t.category === category.name)
            .reduce((sum, t) => sum + t.amount, 0);
        return { name: category.name, value: total };
    }).filter(c => c.value > 0)
    .sort((a,b) => b.value - a.value);
  }, [includedTransactions, categories]);

  const totalExpenses = useMemo(() => {
    return expensesByCategory.reduce((sum, i) => sum + i.value, 0);
  }, [expensesByCategory]);
  
  const PIECHART_COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#AF19FF", "#FF4560"];


  if (isLoading) {
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
  
  const renderBalance = (value: number) => {
    if (typeof value !== 'number' || isNaN(value)) {
        value = 0;
    }
    if (!preferences.showBalance) {
        return (
            <div className="flex items-center justify-start gap-2">
                <EyeOff className="h-4 w-4 text-muted-foreground" />
                <span className="font-mono">---</span>
            </div>
        )
    }
    return <span>{value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>;
  }
  
  const renderBalanceInP = (value: number, className?: string) => {
    const content = renderBalance(value);
    if (React.isValidElement(content)) {
        return content;
    }
    return <p className={className}>{content}</p>;
  }

  const isFutureMonth = isFuture(startOfMonth(selectedDate));
  const displayedInitialBalance = (isFutureMonth && !preferences.includePreviousMonthBalance) ? 0 : previousMonthLeftover;


  return (
    <div className="space-y-6">
        <div className="flex w-full items-center justify-center text-center p-2 gap-4">
            <div className="flex-1 flex flex-col items-center gap-1">
                <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Inicial</span>
                </div>
                 {isBalanceLoading ? <Skeleton className="h-6 w-24" /> : renderBalanceInP(displayedInitialBalance, "text-sm md:text-base")}
            </div>
            <div className="flex-shrink-0 flex flex-col items-center gap-1">
                 <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground">
                     <div className="h-4 w-4 rounded-full border-2 border-muted-foreground flex items-center justify-center">
                        <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground"></div>
                    </div>
                    <span>Saldo</span>
                </div>
                 {isBalanceLoading ? <Skeleton className="h-7 w-28" /> : (
                    <Link href="/dashboard/transactions">
                        <div className="cursor-pointer hover:underline text-lg md:text-xl font-bold">
                            {renderBalance(monthlyNetBalance)}
                        </div>
                    </Link>
                 )}
            </div>
            <div className="flex-1 flex flex-col items-center gap-1">
                 <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4"/>
                    <span>Previsto</span>
                </div>
                {isBalanceLoading ? <Skeleton className="h-6 w-24" /> : renderBalanceInP(effectiveForecastedBalance, "text-sm md:text-base")}
            </div>
        </div>

        <div className="h-40 w-full mx-auto">
            {balanceChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart 
                        data={balanceChartData}
                        margin={{ top: 5, right: 30, left: -20, bottom: 5 }}
                    >
                    <defs>
                        <linearGradient id="colorSaldo" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={chartColors.fill} stopOpacity={0.4}/>
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
                        tickFormatter={(value) => preferences.showBalance ? `${(value / 1000).toFixed(0)}k` : '---'}
                        domain={['dataMin - 500', 'dataMax + 500']}
                    />
                    <Tooltip
                        contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--foreground))' }}
                        formatter={(value: number) => [preferences.showBalance ? value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : "---", "Saldo"]}
                        labelStyle={{ fontWeight: 'bold' }}
                    />
                    <Area type="monotone" dataKey="Saldo" stroke={chartColors.stroke} fillOpacity={1} fill="url(#colorSaldo)" strokeWidth={2} dot={{ stroke: chartColors.stroke, strokeWidth: 2, r: 4, fill: 'hsl(var(--background))' }} activeDot={{ r: 6 }}/>
                    </AreaChart>
                </ResponsiveContainer>
            ) : (
                <div className="flex h-full w-full flex-col items-center justify-center rounded-lg border-2 border-dashed bg-muted/50">
                    <LineChart className="h-10 w-10 text-muted-foreground" />
                    <p className="mt-2 text-sm text-muted-foreground">Sem dados de saldo para exibir no período.</p>
                </div>
            )}
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
                        <div className={cn(account.ignoreInTotals && "opacity-50")}>
                            <BankIcon name={account.name} />
                        </div>
                        <div className="flex-1">
                            <p className={cn("font-bold uppercase", account.ignoreInTotals && "text-muted-foreground")}>{account.name}</p>
                        </div>
                        <div className={cn("font-bold", account.ignoreInTotals && "text-muted-foreground")}>
                            {renderBalance(accountBalances.get(account.id) ?? 0)}
                        </div>
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
                        <div className="font-bold text-right">{renderBalance(totalBalance)}</div>
                        <div className="text-sm text-muted-foreground text-right">{renderBalance(effectiveForecastedBalance)}</div>
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
                                    {renderBalance(card.invoiceTotal)}
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
                <h2 className="text-xl font-bold">Orçamentos</h2>
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
                                            <div className="text-sm font-medium">{renderBalance(spent)}</div>
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
                                    formatter={(value: number, name) => [preferences.showBalance ? value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : "---", name]}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
                           <div className="text-2xl font-bold">{renderBalance(totalExpenses)}</div>
                            <p className="text-sm text-muted-foreground">Total de Despesas</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>

    </div>
  );

}
