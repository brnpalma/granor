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
import { ExternalLink, MoreVertical, ShieldCheck, Target } from 'lucide-react';
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/use-auth";
import { getAccounts, getCreditCards, getBudgets, getTransactions } from "@/lib/firestore";
import type { Account, CreditCard, Budget, Transaction, Category } from "@/lib/types";
import { CategoryIcon } from "@/components/icons";
import { categories } from "@/lib/types";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";


const COLORS = ["#38bdf8", "#f472b6", "#f97316", "#f59e0b", "#6366f1", "#10b981", "#8b5cf6"];


export default function DashboardPage() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [creditCards, setCreditCards] = useState<CreditCard[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    if (!user?.uid) return;

    const unsubscribers = [
        getAccounts(user.uid, setAccounts),
        getCreditCards(user.uid, setCreditCards),
        getBudgets(user.uid, setBudgets),
        getTransactions(user.uid, setTransactions),
    ];
    
    // Check if all initial data has been loaded
    const checkLoading = () => {
        if (accounts.length > 0 || creditCards.length > 0 || budgets.length > 0 || transactions.length > 0) {
           setIsLoading(false);
        }
    }
    
    // Give it a moment to load, then disable spinner
    const timer = setTimeout(() => setIsLoading(false), 2500);

    return () => {
        unsubscribers.forEach(unsub => unsub());
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
  
  const getSpentAmount = (category: string) => {
    return transactions
      .filter((t) => t.type === 'expense' && t.category === category)
      .reduce((sum, t) => sum + t.amount, 0);
  };
  
   const categoryExpenses = useMemo(() => {
    const expenseData: { [key in Category]?: number } = {};
    transactions
      .filter(t => t.type === 'expense')
      .forEach(t => {
        if (expenseData[t.category]) {
          expenseData[t.category]! += t.amount;
        } else {
          expenseData[t.category] = t.amount;
        }
      });
      
    return Object.entries(expenseData)
      .map(([name, value], index) => ({ name, value, color: COLORS[index % COLORS.length] }))
      .sort((a,b) => b.value - a.value);
  }, [transactions]);
  
  const totalExpenses = useMemo(() => {
      return categoryExpenses.reduce((sum, item) => sum + item.value, 0);
  }, [categoryExpenses])
  
  if (isLoading) {
    return (
        <div className="space-y-4 pb-16">
            <Card>
                <CardHeader>
                    <CardTitle>Saldo Total</CardTitle>
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-8 w-1/2" />
                </CardContent>
            </Card>
             <div className="grid md:grid-cols-2 gap-4">
                <Skeleton className="h-64" />
                <Skeleton className="h-64" />
             </div>
        </div>
    );
  }

  return (
    <div className="space-y-6 pb-16">
       <Card>
         <CardHeader>
            <CardTitle>Saldo Total</CardTitle>
            <CardDescription>A soma dos saldos de todas as suas contas.</CardDescription>
         </CardHeader>
         <CardContent>
            <p className="text-3xl font-bold">
                {totalBalance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </p>
         </CardContent>
       </Card>
      
      <div>
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-xl font-semibold">Contas</h2>
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/accounts"><ExternalLink className="h-5 w-5" /></Link>
          </Button>
        </div>
        <Card>
          <CardContent className="p-0">
            {accounts.length > 0 ? (
                 <Table>
                    <TableBody>
                        {accounts.map((account) => (
                        <TableRow key={account.id}>
                            <TableCell className="font-medium">{account.name}</TableCell>
                            <TableCell>{account.type}</TableCell>
                            <TableCell className="text-right">{account.balance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</TableCell>
                        </TableRow>
                        ))}
                    </TableBody>
                </Table>
            ) : (
                <div className="p-6 text-center text-muted-foreground">Nenhuma conta cadastrada.</div>
            )}
          </CardContent>
        </Card>
      </div>

       <div>
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-xl font-semibold">Faturas dos Cartões</h2>
           <Button variant="ghost" size="icon" asChild>
                <Link href="/dashboard/credit-cards"><ExternalLink className="h-5 w-5" /></Link>
            </Button>
        </div>
        <Card>
          <CardContent className="p-0">
             {creditCardInvoices.length > 0 ? (
                <Table>
                    <TableBody>
                        {creditCardInvoices.map((card) => (
                        <TableRow key={card.id}>
                            <TableCell className="font-medium">{card.name}</TableCell>
                            <TableCell>Venc. dia {card.dueDay}</TableCell>
                            <TableCell className="text-right font-semibold text-red-500">
                                {card.invoiceTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </TableCell>
                        </TableRow>
                        ))}
                    </TableBody>
                </Table>
             ) : (
                <div className="p-6 text-center text-muted-foreground">Nenhum cartão de crédito cadastrado.</div>
             )}
          </CardContent>
        </Card>
      </div>

      <div>
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-xl font-semibold">Orçamentos</h2>
           <Button variant="ghost" size="icon" asChild>
                <Link href="/dashboard/budgets"><ExternalLink className="h-5 w-5" /></Link>
            </Button>
        </div>
        <Card>
          <CardContent className="p-4 space-y-4">
             {budgets.length > 0 ? (
                budgets.map((budget) => {
                const spent = getSpentAmount(budget.category);
                const progress = budget.amount > 0 ? (spent / budget.amount) * 100 : 0;
                return (
                    <div key={budget.id}>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center bg-muted">
                            <CategoryIcon category={budget.category} className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <div className="flex-1">
                        <div className="flex justify-between items-center">
                            <span className="font-semibold">{budget.category}</span>
                            <span className="text-sm font-medium">
                                {spent.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} / {budget.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </span>
                        </div>
                        <Progress value={progress} className="h-2 mt-1" />
                        </div>
                    </div>
                    </div>
                )
                })
             ) : (
                 <div className="p-6 text-center text-muted-foreground">Nenhum orçamento cadastrado.</div>
             )}
          </CardContent>
        </Card>
      </div>

      <div>
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-xl font-semibold">Despesas por categoria</h2>
            <Button variant="ghost" size="icon" asChild>
                <Link href="/dashboard/reports"><ExternalLink className="h-5 w-5" /></Link>
            </Button>
        </div>
        <Card>
            <CardContent className="p-4">
                {categoryExpenses.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                        <div className="h-48 relative">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie 
                                        data={categoryExpenses} 
                                        dataKey="value" 
                                        nameKey="name" 
                                        cx="50%" 
                                        cy="50%" 
                                        innerRadius="60%" 
                                        outerRadius="80%"
                                        paddingAngle={2}
                                        stroke="none"
                                    >
                                        {categoryExpenses.map((entry) => (
                                            <Cell key={`cell-${entry.name}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                     <Tooltip
                                        contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                                        formatter={(value: number) => [value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), "Total"]}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <span className="text-muted-foreground text-sm">Total Gasto</span>
                                <span className="text-2xl font-bold">
                                    {totalExpenses.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                </span>
                            </div>
                        </div>
                        <div className="flex flex-col gap-2 text-sm">
                            {categoryExpenses.map((entry) => (
                                <div key={entry.name} className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }}></div>
                                        <span>{entry.name}</span>
                                    </div>
                                    <span className="font-semibold">{entry.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                     <div className="p-6 text-center text-muted-foreground">Nenhuma despesa registrada no período.</div>
                )}
            </CardContent>
        </Card>
      </div>

    </div>
  );
}
