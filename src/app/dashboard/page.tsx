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
          <CardTitle className="text-sm font-medium">Total Balance</CardTitle>
          <span className="text-muted-foreground">$</span>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {balance.toLocaleString("en-US", {
              style: "currency",
              currency: "USD",
            })}
          </div>
          <p className="text-xs text-muted-foreground">
            Total income minus expenses
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Income</CardTitle>
          <span className="text-muted-foreground text-green-500">+</span>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {totalIncome.toLocaleString("en-US", {
              style: "currency",
              currency: "USD",
            })}
          </div>
           <p className="text-xs text-muted-foreground">This month</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
          <span className="text-muted-foreground text-red-500">-</span>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {totalExpense.toLocaleString("en-US", {
              style: "currency",
              currency: "USD",
            })}
          </div>
           <p className="text-xs text-muted-foreground">This month</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Savings Progress</CardTitle>
          <CategoryIcon category="Savings" className="text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {savingsGoals.reduce((acc,g) => acc + g.currentAmount, 0).toLocaleString("en-US", {
              style: "currency",
              currency: "USD",
            })}
          </div>
          <p className="text-xs text-muted-foreground">
            Across all savings goals
          </p>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.slice(0, 5).map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell>
                    <div className="font-medium">{transaction.description}</div>
                    <div className="text-sm text-muted-foreground">
                      {transaction.date.toLocaleDateString()}
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
                    {transaction.amount.toLocaleString("en-US", {
                      style: "currency",
                      currency: "USD",
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
          <CardTitle>Budgets Overview</CardTitle>
          <CardDescription>Your spending vs. your monthly budgets.</CardDescription>
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
                                {spent.toLocaleString('en-US', { style: 'currency', currency: 'USD' })} / {budget.amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
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
