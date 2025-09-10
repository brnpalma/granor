"use client";

import { useState, useEffect } from "react";
import { PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { addBudget, getBudgets, getTransactions } from "@/lib/firestore";
import type { Budget, Transaction, Category } from "@/lib/types";
import { categories } from "@/lib/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

export default function BudgetsPage() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [addBudgetDialogOpen, setAddBudgetDialogOpen] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleData = <T,>(setter: React.Dispatch<React.SetStateAction<T[]>>) => (data: T[]) => {
        setter(data);
        setIsLoading(false);
    };

    const unsubscribeBudgets = getBudgets(user?.uid || null, handleData(setBudgets));
    const unsubscribeTransactions = getTransactions(user?.uid || null, handleData(setTransactions));
    
    // In case one of them returns empty and the other has data
    const timeout = setTimeout(() => setIsLoading(false), 2000);


    return () => {
      unsubscribeBudgets();
      unsubscribeTransactions();
      clearTimeout(timeout);
    };
  }, [user]);

  const handleAddBudget = async (budget: Omit<Budget, "id">) => {
    await addBudget(user?.uid || null, budget);
    toast({ title: "Orçamento adicionado", description: "Seu novo orçamento foi salvo." });
  };

  const getSpentAmount = (category: string) => {
    return transactions
      .filter((t) => t.type === 'expense' && t.category === category && !t.isBudget)
      .reduce((sum, t) => sum + t.amount, 0);
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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Orçamentos</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
                <Button>
                    <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Orçamento
                </Button>
            </DialogTrigger>
            <BudgetForm onSubmit={handleAddBudget} onSubmitted={() => setDialogOpen(false)} />
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {budgets.map((budget) => {
          const spent = getSpentAmount(budget.category);
          const progress = Math.min((spent / budget.amount) * 100, 100);
          const remaining = budget.amount - spent;

          return (
            <Card key={budget.id}>
              <CardHeader>
                <CardTitle>{budget.category}</CardTitle>
                <CardDescription>
                  {`${spent.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} de ${budget.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Progress value={progress} className="mb-2" />
                <p className="text-sm text-muted-foreground">
                  {remaining >= 0 ? `${remaining.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} restantes` : `${Math.abs(remaining).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} acima`}
                </p>
              </CardContent>
            </Card>
          );
        })}
         <Card className="border-dashed flex flex-col items-center justify-center">
            <Dialog open={addBudgetDialogOpen} onOpenChange={setAddBudgetDialogOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" className="h-full w-full">
                    <div className="flex flex-col items-center gap-2">
                        <PlusCircle className="h-8 w-8 text-muted-foreground" />
                        <span className="text-muted-foreground">Adicionar Novo Orçamento</span>
                    </div>
                </Button>
            </DialogTrigger>
            <BudgetForm onSubmit={handleAddBudget} onSubmitted={() => setAddBudgetDialogOpen(false)} />
        </Dialog>
          </Card>
      </div>
    </div>
  );
}


function BudgetForm({
    onSubmit,
    onSubmitted,
}: {
    onSubmit: (budget: Omit<Budget, "id">) => Promise<void>;
    onSubmitted: () => void;
}) {
    const [amount, setAmount] = useState("");
    const [category, setCategory] = useState<Category | "">("");
    const { toast } = useToast();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!amount || !category) {
            toast({ title: "Por favor, preencha todos os campos", variant: 'destructive' });
            return;
        }

        await onSubmit({
            amount: parseFloat(amount),
            category: category as Category,
        });
        
        setAmount("");
        setCategory("");
        onSubmitted();
    };
    
    return (
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Adicionar Novo Orçamento</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
                 <div className="space-y-2">
                    <Label htmlFor="category">Categoria</Label>
                    <Select onValueChange={(value: Category) => setCategory(value)} value={category}>
                        <SelectTrigger id="category">
                            <SelectValue placeholder="Selecione a categoria" />
                        </SelectTrigger>
                        <SelectContent>
                            {categories.filter(c => c !== 'Salário').map(cat => (
                                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="amount">Valor do Orçamento Mensal</Label>
                    <Input id="amount" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0,00" />
                </div>
                <DialogFooter>
                    <Button type="submit">Adicionar Orçamento</Button>
                </DialogFooter>
            </form>
        </DialogContent>
    )
}
