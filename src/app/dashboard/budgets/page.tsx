"use client";

import { useState } from "react";
import { PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { mockBudgets, mockTransactions } from "@/lib/data";
import type { Budget, Transaction, Category } from "@/lib/types";
import { categories } from "@/lib/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

export default function BudgetsPage() {
  const [budgets, setBudgets] = useState<Budget[]>(mockBudgets);
  const [transactions] = useState<Transaction[]>(mockTransactions);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [addBudgetDialogOpen, setAddBudgetDialogOpen] = useState(false);


  const addBudget = (budget: Omit<Budget, "id">) => {
    setBudgets([...budgets, { ...budget, id: crypto.randomUUID() }]);
  };

  const getSpentAmount = (category: string) => {
    return transactions
      .filter((t) => t.type === 'expense' && t.category === category)
      .reduce((sum, t) => sum + t.amount, 0);
  };

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
            <BudgetForm onSubmit={addBudget} onSubmitted={() => setDialogOpen(false)} />
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
            <BudgetForm onSubmit={addBudget} onSubmitted={() => setAddBudgetDialogOpen(false)} />
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
    onSubmit: (budget: Omit<Budget, "id">) => void;
    onSubmitted: () => void;
}) {
    const [amount, setAmount] = useState("");
    const [category, setCategory] = useState<Category | "">("");
    const { toast } = useToast();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!amount || !category) {
            toast({ title: "Por favor, preencha todos os campos", variant: 'destructive' });
            return;
        }

        onSubmit({
            amount: parseFloat(amount),
            category,
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
