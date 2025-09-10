"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Bar, BarChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";

import { getTransactions } from "@/lib/firestore";
import type { Transaction } from "@/lib/types";
import { categories } from "@/lib/types";
import { useAuth } from "@/hooks/use-auth";


export default function ReportsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const unsubscribe = getTransactions(user?.uid || null, (data) => {
        setTransactions(data);
        setIsLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  const spendingByCategory = useMemo(() => {
    const expenseCategories = categories.filter(c => c !== 'Salário' && c !== 'Economias');
    return expenseCategories.map(category => {
        const total = transactions
            .filter(t => t.type === 'expense' && t.category === category && !t.isBudget)
            .reduce((sum, t) => sum + t.amount, 0);
        return { name: category, total };
    }).filter(c => c.total > 0)
    .sort((a,b) => b.total - a.total);
  }, [transactions]);
  
  const chartConfig = {
    total: {
      label: "Total",
      color: "hsl(var(--primary))",
    },
  };

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-8rem)] w-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Relatórios</h1>
      <Card>
        <CardHeader>
          <CardTitle>Gastos por Categoria</CardTitle>
          <CardDescription>
            Uma análise de suas despesas para o período atual.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[400px] w-full">
             <ResponsiveContainer width="100%" height="100%">
              <BarChart data={spendingByCategory} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `R$${value}`} />
                <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent 
                        labelFormatter={(label) => { return `${label}`}}
                        formatter={(value) => (value as number).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    />}
                />
                <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}
