
"use client";

import { useState, useEffect } from "react";
import { PlusCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { addBudget, getBudgets, getTransactions, getCategories, deleteBudget } from "@/lib/firestore";
import type { Budget, Transaction, Category } from "@/lib/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useDate } from "@/hooks/use-date";
import { CategoryIcon } from "@/components/icons";

export default function BudgetsPage() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const { selectedDate, getMonthDateRange } = useDate();

  useEffect(() => {
    if (typeof window === 'undefined' || !user?.uid) return;

    setIsLoading(true);
    const { startDate, endDate } = getMonthDateRange(selectedDate);
    let dataLoaded = { budgets: false, transactions: false, categories: false };

    const checkLoading = () => {
        if(Object.values(dataLoaded).every(Boolean)) {
            setIsLoading(false);
        }
    }

    const unsubscribeBudgets = getBudgets(user.uid, (data) => {
        setBudgets(data);
        dataLoaded.budgets = true;
        checkLoading();
    });
    const unsubscribeTransactions = getTransactions(user.uid, (data) => {
        setTransactions(data);
        dataLoaded.transactions = true;
        checkLoading();
    }, { startDate, endDate });
    const unsubscribeCategories = getCategories(user.uid, (data) => {
        setCategories(data);
        dataLoaded.categories = true;
        checkLoading();
    });
    
    const timeout = setTimeout(() => setIsLoading(false), 2000);


    return () => {
      unsubscribeBudgets();
      unsubscribeTransactions();
      unsubscribeCategories();
      clearTimeout(timeout);
    };
  }, [user, selectedDate, getMonthDateRange]);

  const handleAddBudget = async (budget: Omit<Budget, "id">) => {
    await addBudget(user?.uid || null, budget);
    toast({ title: "Orçamento adicionado", description: "Seu novo orçamento foi salvo.", variant: "success" });
  };
  
  const handleDeleteBudget = async (budgetId: string) => {
    await deleteBudget(user?.uid || null, budgetId);
    toast({ title: "Orçamento removido!", variant: "destructive" });
  }

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
                    <PlusCircle className="mr-2 h-4 w-4" /> Adicionar
                </Button>
            </DialogTrigger>
            <BudgetForm onSubmit={handleAddBudget} onSubmitted={() => setDialogOpen(false)} categories={categories} />
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {budgets.map((budget) => {
          const spent = getSpentAmount(budget.category);
          const progress = Math.min((spent / budget.amount) * 100, 100);
          const remaining = budget.amount - spent;
          const categoryInfo = categories.find(c => c.name === budget.category);

          return (
            <Card key={budget.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {categoryInfo && (
                            <div style={{ backgroundColor: categoryInfo.color }} className={'p-2 rounded-full text-white'}>
                                <CategoryIcon icon={categoryInfo.icon} className="h-5 w-5" />
                            </div>
                        )}
                        <CardTitle>{budget.category}</CardTitle>
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon">
                            <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta ação não pode ser desfeita. Isso removerá permanentemente o orçamento.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeleteBudget(budget.id)}>Remover</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                </div>
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
      </div>
    </div>
  );
}


function BudgetForm({
    onSubmit,
    onSubmitted,
    categories,
}: {
    onSubmit: (budget: Omit<Budget, "id">) => Promise<void>;
    onSubmitted: () => void;
    categories: Category[];
}) {
    const [amount, setAmount] = useState("");
    const [category, setCategory] = useState<string>("");
    const { toast } = useToast();
    
    const selectedCategoryData = categories.find(c => c.name === category);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!amount || !category) {
            toast({ title: "Por favor, preencha todos os campos", variant: 'destructive' });
            return;
        }

        await onSubmit({
            amount: parseFloat(amount),
            category: category,
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
                    <Select onValueChange={(value: string) => setCategory(value)} value={category}>
                        <SelectTrigger id="category">
                            <SelectValue>
                                 {selectedCategoryData ? (
                                    <div className="flex items-center gap-3">
                                        <div style={{ backgroundColor: selectedCategoryData.color }} className={'p-1.5 rounded-full text-white'}>
                                            <CategoryIcon icon={selectedCategoryData.icon} className="h-4 w-4" />
                                        </div>
                                        <span>{selectedCategoryData.name}</span>
                                    </div>
                                ) : "Selecione a categoria"}
                            </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                            {categories.filter(c => c.type === 'expense').map(cat => (
                                <SelectItem key={cat.id} value={cat.name}>
                                    <div className="flex items-center gap-3">
                                         <div style={{ backgroundColor: cat.color }} className={'p-1.5 rounded-full text-white'}>
                                            <CategoryIcon icon={cat.icon} className="h-4 w-4" />
                                        </div>
                                        <span>{cat.name}</span>
                                    </div>
                                </SelectItem>
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

    

    