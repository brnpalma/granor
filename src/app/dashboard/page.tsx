"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  mockTransactions,
  mockBudgets,
  mockSavingsGoals,
} from "@/lib/data";
import type { Transaction, Budget, SavingsGoal } from "@/lib/types";
import { CategoryIcon } from "@/components/icons";
import { cn } from "@/lib/utils";

export default function DashboardPage() {
  const [transactions] = useState<Transaction[]>(mockTransactions);
  const [budgets] = useState<Budget[]>(mockBudgets);
  const [savingsGoals] = useState<SavingsGoal[]>(mockSavingsGoals);

  const totalIncome = transactions
    .filter((t) => t.type === "income")
    .reduce((acc, t) => acc + t.amount, 0);
  const totalExpense = transactions
    .filter((t) => t.type === "expense")
    .reduce((acc, t) => acc + t.amount, 0);
  const balance = totalIncome - totalExpense;

  const getSpentAmount = (category: string) => {
    return transactions
      .filter((t) => t.type === 'expense' && t.category === category)
      .reduce((sum, t) => sum + t.amount, 0);
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Saldo Total</CardTitle>
          <span className="text-muted-foreground">R$</span>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {balance.toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
            })}
          </div>
          <p className="text-xs text-muted-foreground">
            Renda total menos despesas
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Renda Total</CardTitle>
          <span className="text-muted-foreground text-green-500">+</span>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {totalIncome.toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
            })}
          </div>
           <p className="text-xs text-muted-foreground">Este mês</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Despesas Totais</CardTitle>
          <span className="text-muted-foreground text-red-500">-</span>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {totalExpense.toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
            })}
          </div>
           <p className="text-xs text-muted-foreground">Este mês</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Progresso das Economias</CardTitle>
          <CategoryIcon category="Economias" className="text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {savingsGoals.reduce((acc,g) => acc + g.currentAmount, 0).toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
            })}
          </div>
          <p className="text-xs text-muted-foreground">
            Em todas as metas de economia
          </p>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Transações Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Descrição</TableHead>
                <TableHead className="text-right">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.slice(0, 5).map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell>
                    <div className="font-medium">{transaction.description}</div>
                    <div className="text-sm text-muted-foreground">
                      {transaction.date.toLocaleDateString('pt-BR')}
                    </div>
                  </TableCell>
                  <TableCell
                    className={cn(
                      "text-right",
                      transaction.type === "income"
                        ? "text-green-500"
                        : "text-red-500"
                    )}
                  >
                    {transaction.type === "income" ? "+" : "-"}
                    {transaction.amount.toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Visão Geral dos Orçamentos</CardTitle>
          <CardDescription>Seus gastos vs. seus orçamentos mensais.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            {budgets.map(budget => {
                const spent = getSpentAmount(budget.category);
                const progress = (spent / budget.amount) * 100;
                return (
                    <div key={budget.id} className="space-y-1">
                        <div className="flex justify-between items-center text-sm">
                            <span className="font-medium">{budget.category}</span>
                            <span className="text-muted-foreground">
                                {spent.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} / {budget.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </span>
                        </div>
                        <Progress value={progress} />
                    </div>
                )
            })}
        </CardContent>
      </Card>
    </div>
  );
}
