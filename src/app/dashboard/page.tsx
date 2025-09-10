
"use client";

import { useState, useEffect, useMemo } from "react";
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
import { getAccounts, getCreditCards, getBudgets, getTransactions } from "@/lib/firestore";
import type { Account, CreditCard, Budget, Transaction, Category } from "@/lib/types";
import { CategoryIcon, ItauLogo, NubankLogo, PicpayLogo, MercadoPagoLogo, BradescoLogo } from "@/components/icons";
import { categories } from "@/lib/types";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";


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
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [creditCards, setCreditCards] = useState<CreditCardType[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    if (!user?.uid) {
        setIsLoading(false);
        return;
    };

    let dataLoaded = { accounts: false, creditCards: false, transactions: false };
    const checkLoading = () => {
        if(Object.values(dataLoaded).every(Boolean)) {
            setIsLoading(false);
        }
    }

    const createUnsubscriber = <T,>(name: keyof typeof dataLoaded, getter: (uid: string, cb: (data: T[]) => void) => () => void, setter: React.Dispatch<React.SetStateAction<T[]>>) => {
        return getter(user.uid, (data) => {
            setter(data);
            dataLoaded[name] = true;
            checkLoading();
        });
    }

    const unsubscribeAccounts = createUnsubscriber('accounts', getAccounts, setAccounts);
    const unsubscribeCreditCards = createUnsubscriber('creditCards', getCreditCards, setCreditCards);
    const unsubscribeTransactions = createUnsubscriber('transactions', getTransactions, setTransactions);

    const timer = setTimeout(() => setIsLoading(false), 3000);

    return () => {
        unsubscribeAccounts();
        unsubscribeCreditCards();
        unsubscribeTransactions();
        clearTimeout(timer);
    };
  }, [user?.uid]);

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
    if (transactions.length === 0 && accounts.length === 0) return [];
    
    const sortedTransactions = [...transactions].sort((a, b) => a.date.getTime() - b.date.getTime());
    const initialBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0) - sortedTransactions.reduce((sum, t) => {
        if(t.accountId) {
             return t.type === 'income' ? sum - t.amount : sum + t.amount;
        }
        return sum;
    }, 0);

    const data: { date: string; Saldo: number }[] = [];
    const dailyBalances: { [date: string]: number } = {};
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    let currentBalance = initialBalance;
    
    // Initialize all days of the month
    for (let d = new Date(firstDayOfMonth); d <= lastDayOfMonth; d.setDate(d.getDate() + 1)) {
        const dateString = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        dailyBalances[dateString] = -1; // Use -1 to indicate not yet calculated
    }
    
    // Set initial balance for the first day
    const firstDayString = firstDayOfMonth.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    dailyBalances[firstDayString] = initialBalance;


    // Process transactions to get daily final balances
    sortedTransactions.forEach(t => {
         if (t.accountId) {
            const dateString = t.date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
            currentBalance = t.type === 'income' ? currentBalance + t.amount : currentBalance - t.amount;
            if(dailyBalances[dateString] !== undefined) {
                 dailyBalances[dateString] = currentBalance;
            }
         }
    });
    
    // Fill in the gaps
    let lastKnownBalance = initialBalance;
    for (const dateString in dailyBalances) {
        if (dailyBalances[dateString] === -1) {
            dailyBalances[dateString] = lastKnownBalance;
        } else {
            lastKnownBalance = dailyBalances[dateString];
        }
        data.push({ date: dateString, Saldo: dailyBalances[dateString] });
    }
    
    return data.slice(0, today.getDate());

  }, [transactions, accounts]);

  if (isLoading) {
    return (
        <div className="space-y-4 pb-16">
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
    <div className="space-y-6 pb-20 text-white">
        {/* Balance Info */}
        <div className="flex justify-between items-center text-center p-4">
            <div className="flex-1">
                <div className="flex items-center justify-center gap-1 text-sm text-gray-400">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Inicial</span>
                </div>
                <p className="text-lg font-bold">
                    {balanceChartData[0]?.Saldo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) || 'R$ 0,00'}
                </p>
            </div>
            <div className="flex-1">
                <p className="text-sm text-gray-400">Saldo</p>
                <p className="text-4xl font-bold">
                    {totalBalance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </p>
            </div>
            <div className="flex-1">
                 <div className="flex items-center justify-center gap-1 text-sm text-gray-400">
                    <Clock className="h-4 w-4"/>
                    <span>Previsto *</span>
                </div>
                <p className="text-lg font-bold">R$ 0,00</p>
            </div>
        </div>

        {/* Balance Chart */}
        <div className="h-40 -mt-4">
             <ResponsiveContainer width="100%" height="100%">
                <AreaChart 
                    data={balanceChartData}
                    margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
                >
                <defs>
                    <linearGradient id="colorSaldo" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="rgba(239, 68, 68, 0.4)" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="rgba(239, 68, 68, 0.1)" stopOpacity={0}/>
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
                <Area type="monotone" dataKey="Saldo" stroke="#ef4444" fillOpacity={1} fill="url(#colorSaldo)" strokeWidth={2} dot={{ stroke: '#ef4444', strokeWidth: 2, r: 4, fill: '#18181b' }} activeDot={{ r: 6 }}/>
                </AreaChart>
            </ResponsiveContainer>
        </div>
        
        {/* Search Bar */}
        <div className="px-4">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input placeholder="Pesquisar no Minhas Finanças" className="bg-[#27272a] border-[#3f3f46] pl-10 h-12 rounded-lg" />
            </div>
        </div>

        {/* Accounts List */}
        <div className="px-4 space-y-2">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">Contas</h2>
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon"><ExternalLink className="h-5 w-5 text-gray-400" /></Button>
                    <Button variant="ghost" size="icon"><MoreVertical className="h-5 w-5 text-gray-400" /></Button>
                </div>
            </div>
            <div className="bg-[#27272a] rounded-lg p-4 space-y-4">
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
        
        {/* Credit Cards List */}
        <div className="px-4 space-y-2">
             <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">Cartões de crédito</h2>
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon"><ExternalLink className="h-5 w-5 text-gray-400" /></Button>
                    <Button variant="ghost" size="icon"><MoreVertical className="h-5 w-5 text-gray-400" /></Button>
                </div>
            </div>
            <div className="bg-[#27272a] rounded-lg p-4 space-y-4">
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
}

    