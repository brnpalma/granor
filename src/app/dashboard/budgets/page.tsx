
"use client";

import { useState, useEffect } from "react";
import { PlusCircle, Trash2, Edit, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { addBudget, getBudgets, getTransactions, getCategories, deleteBudget, updateBudget } from "@/lib/firestore";
import type { Budget, Transaction, Category } from "@/lib/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
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

  const handleOpenDialogForEdit = (budget: Budget) => {
    setEditingBudget(budget);
    setDialogOpen(true);
  };

  const handleOpenDialogForAdd = () => {
    setEditingBudget(null);
    setDialogOpen(true);
  };
  
  const handleDialogChange = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setEditingBudget(null);
    }
  }

  const handleFormSubmit = async (budgetData: Omit<Budget, "id">, budgetId?: string) => {
    if (budgetId) {
      await updateBudget(user?.uid || null, budgetId, budgetData);
      toast({ title: "Orçamento atualizado!", variant: "success" });
    } else {
      await addBudget(user?.uid || null, budgetData);
      toast({ title: "Orçamento adicionado", description: "Seu novo orçamento foi salvo.", variant: "success" });
    }
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
        <Dialog open={dialogOpen} onOpenChange={handleDialogChange}>
            <DialogTrigger asChild>
                <Button onClick={handleOpenDialogForAdd}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Adicionar
                </Button>
            </DialogTrigger>
            <BudgetForm 
              onSubmit={handleFormSubmit} 
              onSubmitted={() => handleDialogChange(false)} 
              categories={categories} 
              budget={editingBudget}
            />
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
                     <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="shrink-0 -mr-2 h-7 w-7">
                                <MoreVertical className="h-5 w-5" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                            <DropdownMenuItem onClick={() => handleOpenDialogForEdit(budget)}>
                                <Edit className="mr-2 h-4 w-4" />
                                <span>Editar</span>
                            </DropdownMenuItem>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                 <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                    <Trash2 className="mr-2 h-4 w-4 text-destructive" />
                                    <span className="text-destructive">Remover</span>
                                </DropdownMenuItem>
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
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
                <CardDescription>
                  {`${spent.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} de ${budget.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
                    <div
                        className="h-full w-full flex-1 bg-primary transition-all"
                        style={{ transform: `translateX(-${100 - (progress || 0)}%)`, backgroundColor: categoryInfo?.color }}
                    />
                </div>
                <p className="text-sm text-muted-foreground mt-2">
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
    budget,
}: {
    onSubmit: (budget: Omit<Budget, "id">, budgetId?: string) => Promise<void>;
    onSubmitted: () => void;
    categories: Category[];
    budget: Budget | null;
}) {
    const [amount, setAmount] = useState(0);
    const [category, setCategory] = useState<string>("");
    const { toast } = useToast();
    
    const isEditing = !!budget;
    const selectedCategoryData = categories.find(c => c.name === category);

    useEffect(() => {
        if (isEditing && budget) {
            setAmount(budget.amount * 100);
            setCategory(budget.category);
        } else {
            setAmount(0);
            setCategory("");
        }
    }, [budget, isEditing]);

    const formatCurrency = (value: number) => {
        const amountInReais = value / 100;
        return amountInReais.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };

    const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const rawValue = e.target.value.replace(/\D/g, '');
        setAmount(Number(rawValue));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!amount || !category) {
            toast({ title: "Por favor, preencha todos os campos", variant: 'destructive' });
            return;
        }

        await onSubmit({
            amount: amount / 100,
            category: category,
        }, budget?.id);
        
        if (isEditing) {
            onSubmitted();
        } else {
            // Reset form for next entry
            setAmount(0);
            setCategory("");
        }
    };
    
    return (
        <DialogContent>
            <DialogHeader>
                <DialogTitle>{isEditing ? 'Editar Orçamento' : 'Adicionar Novo Orçamento'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
                 <div className="space-y-2">
                    <Label htmlFor="category">Categoria</Label>
                    <Select onValueChange={(value: string) => setCategory(value)} value={category} disabled={isEditing}>
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
                    <Input id="amount" type="text" inputMode="numeric" value={formatCurrency(amount)} onChange={handleAmountChange} placeholder="R$ 0,00" />
                </div>
                <DialogFooter>
                    <Button type="submit">{isEditing ? 'Salvar Alterações' : 'Adicionar Orçamento'}</Button>
                </DialogFooter>
            </form>
        </DialogContent>
    )
}
