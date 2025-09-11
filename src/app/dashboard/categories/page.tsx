
"use client";

import { useState, useEffect, useMemo } from "react";
import { PlusCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
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
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addCategory, deleteCategory, getCategories, getTransactions } from "@/lib/firestore";
import type { Category, Transaction } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useDate } from "@/hooks/use-date";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CategoryIcon } from "@/components/icons";

const categoryColors = [
  "bg-blue-500/20 text-blue-500",
  "bg-emerald-500/20 text-emerald-500",
  "bg-amber-500/20 text-amber-500",
  "bg-violet-500/20 text-violet-500",
  "bg-rose-500/20 text-rose-500",
  "bg-cyan-500/20 text-cyan-500",
  "bg-fuchsia-500/20 text-fuchsia-500",
  "bg-orange-500/20 text-orange-500",
];

const getColorForCategory = (index: number) => {
    return categoryColors[index % categoryColors.length];
}


export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const { selectedDate, getMonthDateRange } = useDate();

  useEffect(() => {
    if (typeof window === 'undefined' || !user?.uid) {
      setIsLoading(false);
      return;
    };
    
    setIsLoading(true);
    const { startDate, endDate } = getMonthDateRange(selectedDate);

    let dataLoaded = { categories: false, transactions: false };
    const checkLoading = () => {
        if(Object.values(dataLoaded).every(Boolean)) {
            setIsLoading(false);
        }
    }

    const unsubCategories = getCategories(user.uid, (data) => {
        setCategories(data);
        dataLoaded.categories = true;
        checkLoading();
    });

     const unsubTransactions = getTransactions(user.uid, (data) => {
        setTransactions(data);
        dataLoaded.transactions = true;
        checkLoading();
    }, { startDate, endDate });


    const timeout = setTimeout(() => setIsLoading(false), 2500);

    return () => {
      unsubCategories();
      unsubTransactions();
      clearTimeout(timeout);
    };
  }, [user, selectedDate, getMonthDateRange]);

  const handleAddCategory = async (category: Omit<Category, "id">) => {
    if (categories.some(c => c.name.toLowerCase() === category.name.toLowerCase())) {
        toast({ title: "Categoria já existe", description: "Esta categoria já foi cadastrada.", variant: "destructive"});
        return;
    }
    await addCategory(user?.uid || null, category);
    toast({ title: "Categoria adicionada!"});
  };

  const handleDeleteCategory = async (categoryId: string) => {
    await deleteCategory(user?.uid || null, categoryId);
    toast({ title: "Categoria removida!"});
  }

  const categoryExpenses = useMemo(() => {
    const expenseMap = new Map<string, number>();
    transactions
      .filter(t => t.type === 'expense')
      .forEach(t => {
        const currentTotal = expenseMap.get(t.category) || 0;
        expenseMap.set(t.category, currentTotal + t.amount);
      });
    return expenseMap;
  }, [transactions]);
  
  const categoryIncomes = useMemo(() => {
    const incomeMap = new Map<string, number>();
    transactions
      .filter(t => t.type === 'income')
      .forEach(t => {
        const currentTotal = incomeMap.get(t.category) || 0;
        incomeMap.set(t.category, currentTotal + t.amount);
      });
    return incomeMap;
  }, [transactions]);
  
  const totalExpenses = useMemo(() => {
    return Array.from(categoryExpenses.values()).reduce((sum, amount) => sum + amount, 0);
  }, [categoryExpenses]);

  const totalIncomes = useMemo(() => {
    return Array.from(categoryIncomes.values()).reduce((sum, amount) => sum + amount, 0);
  }, [categoryIncomes]);


  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-8rem)] w-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const renderCategoryList = (type: "expense" | "income") => {
    const relevantCategories = categories.filter(c => c.type === type);
    const totalsMap = type === 'expense' ? categoryExpenses : categoryIncomes;

    return (
        <Card>
            <CardContent className="p-0">
            {relevantCategories.map((cat, index) => {
                const total = totalsMap.get(cat.name) || 0;
                return (
                    <div key={cat.id} className="flex items-center gap-4 p-4 border-b last:border-b-0">
                         <div className={`p-2 rounded-full ${getColorForCategory(index)}`}>
                            <CategoryIcon category={cat.name} className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                            <p className="font-bold">{cat.name}</p>
                            <p className="text-sm text-muted-foreground">{total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                        </div>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="shrink-0">
                                <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta ação não pode ser desfeita. Isso removerá permanentemente a categoria e todas as transações associadas.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteCategory(cat.id)}>Remover</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                    </div>
                )
            })}
            </CardContent>
        </Card>
    );
  }


  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Categorias</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
                <Button>
                    <PlusCircle className="mr-2 h-4 w-4" /> Adicionar
                </Button>
            </DialogTrigger>
            <CategoryForm onSubmit={handleAddCategory} onSubmitted={() => setDialogOpen(false)} />
        </Dialog>
      </div>

       <Tabs defaultValue="expenses" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="expenses">
                  Despesas ({totalExpenses.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })})
                </TabsTrigger>
                <TabsTrigger value="incomes">
                  Receitas ({totalIncomes.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })})
                </TabsTrigger>
            </TabsList>
            <TabsContent value="expenses">
                {renderCategoryList("expense")}
            </TabsContent>
            <TabsContent value="incomes">
                {renderCategoryList("income")}
            </TabsContent>
        </Tabs>
      
    </div>
  );
}


function CategoryForm({
    onSubmit,
    onSubmitted,
}: {
    onSubmit: (category: Omit<Category, "id">) => Promise<void>;
    onSubmitted: () => void;
}) {
    const [name, setName] = useState("");
    const [type, setType] = useState<"income" | "expense">("expense");
    const { toast } = useToast();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !type) {
            toast({ title: "Por favor, preencha todos os campos", variant: 'destructive' });
            return;
        }

        await onSubmit({ name, type });

        setName("");
        setType("expense");
        onSubmitted();
    };

    return (
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Adicionar Nova Categoria</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="name">Nome da Categoria</Label>
                    <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="ex: Lazer" />
                </div>
                 <div className="space-y-2">
                    <Label>Tipo</Label>
                    <RadioGroup value={type} onValueChange={(value) => setType(value as "income" | "expense")} className="flex gap-4">
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="expense" id="expense" />
                            <Label htmlFor="expense">Despesa</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="income" id="income" />
                            <Label htmlFor="income">Receita</Label>
                        </div>
                    </RadioGroup>
                </div>
                <DialogFooter>
                    <Button type="submit">Adicionar Categoria</Button>
                </DialogFooter>
            </form>
        </DialogContent>
    );
}
