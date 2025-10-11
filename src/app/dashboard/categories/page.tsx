

"use client";

import { useState, useEffect, useMemo } from "react";
import { PlusCircle, Trash2, Edit, Check, ChevronDown } from "lucide-react";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
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
import { addCategory, deleteCategory, getCategories, getTransactions, updateCategory } from "@/lib/firestore";
import type { Category, Transaction } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useDate } from "@/hooks/use-date";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CategoryIcon } from "@/components/icons";
import * as icons from "lucide-react";

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const { selectedDate, getMonthDateRange } = useDate();

  const categoryColors = [
      '#F44336', '#E91E63', '#9C27B0', '#673AB7', '#3F51B5',
      '#2196F3', '#03A9F4', '#00BCD4', '#009688', '#4CAF50',
      '#8BC34A', '#CDDC39', '#FFEB3B', '#FFC107', '#FF9800',
      '#FF5722', '#795548', '#9E9E9E', '#607D8B'
  ];

  const iconList = Object.keys(icons).filter(key => key !== 'createReactComponent' && key !== 'LucideIcon' && key.match(/^[A-Z]/));


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
  
  const handleOpenDialogForEdit = (category: Category) => {
    setEditingCategory(category);
    setDialogOpen(true);
  };

  const handleOpenDialogForAdd = () => {
    setEditingCategory(null);
    setDialogOpen(true);
  };
  
  const handleDialogChange = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setEditingCategory(null);
    }
  };

  const handleFormSubmit = async (categoryData: Omit<Category, "id">, categoryId?: string) => {
    if (categories.some(c => c.name.toLowerCase() === categoryData.name.toLowerCase() && c.id !== categoryId)) {
        toast({ title: "Categoria já existe", description: "Esta categoria já foi cadastrada.", variant: "destructive"});
        return;
    }
    
    if (categoryId) {
        await updateCategory(user?.uid || null, categoryId, categoryData);
        toast({ title: "Categoria atualizada!", variant: "success" });
    } else {
        await addCategory(user?.uid || null, categoryData);
        toast({ title: "Categoria adicionada!", variant: "success" });
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    await deleteCategory(user?.uid || null, categoryId);
    toast({ title: "Categoria removida!", variant: "destructive" });
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
                    <div key={cat.id} className="flex items-center gap-4 p-3 border-b last:border-b-0">
                         <div style={{ backgroundColor: cat.color }} className={'p-2 rounded-full text-white'}>
                            <CategoryIcon icon={cat.icon} className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                            <p className="font-bold">{cat.name}</p>
                            <p className="text-xs text-muted-foreground">{total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                        </div>
                        <div className="flex items-center">
                            <Button variant="ghost" size="icon" className="shrink-0" onClick={() => handleOpenDialogForEdit(cat)}>
                                <Edit className="h-4 w-4" />
                            </Button>
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
                    </div>
                )
            })}
            </CardContent>
        </Card>
    );
  }

  function CategoryForm({
      onSubmit,
      onSubmitted,
      category,
  }: {
      onSubmit: (category: Omit<Category, "id">, categoryId?: string) => Promise<void>;
      onSubmitted: () => void;
      category: Category | null;
  }) {
      const [name, setName] = useState("");
      const [type, setType] = useState<"income" | "expense">("expense");
      const [color, setColor] = useState(categoryColors[0]);
      const [icon, setIcon] = useState('MoreHorizontal');
      const [iconSearchOpen, setIconSearchOpen] = useState(false);
      const { toast } = useToast();

      const isEditing = !!category;

      useEffect(() => {
          if (category) {
              setName(category.name);
              setType(category.type);
              setColor(category.color || categoryColors[0]);
              setIcon(category.icon || 'MoreHorizontal');
          } else {
              setName("");
              setType("expense");
              setColor(categoryColors[Math.floor(Math.random() * categoryColors.length)]);
              setIcon('MoreHorizontal');
          }
      }, [category]);


      const handleSubmit = async (e: React.FormEvent) => {
          e.preventDefault();
          if (!name || !type || !icon || !color) {
              toast({ title: "Por favor, preencha todos os campos", variant: 'destructive' });
              return;
          }

          await onSubmit({ name, type, icon, color }, category?.id);

          onSubmitted();
      };

      return (
          <DialogContent>
              <DialogHeader>
                  <DialogTitle>{isEditing ? 'Editar Categoria' : 'Adicionar Nova Categoria'}</DialogTitle>
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
                  <div className="space-y-2">
                      <Label>Ícone e Cor</Label>
                      <div className="flex items-center gap-2">
                          <Popover open={iconSearchOpen} onOpenChange={setIconSearchOpen}>
                              <PopoverTrigger asChild>
                                  <Button variant="outline" size="icon" style={{backgroundColor: color}} className="text-white w-12 h-12 text-2xl">
                                      <CategoryIcon icon={icon} className="h-6 w-6" />
                                  </Button>
                              </PopoverTrigger>
                              <PopoverContent className="p-0 w-[250px]">
                                  <Command>
                                      <CommandInput placeholder="Buscar ícone..." />
                                      <CommandList>
                                          <CommandEmpty>Nenhum ícone encontrado.</CommandEmpty>
                                          <CommandGroup className="max-h-48 overflow-y-auto">
                                              {iconList.map((iconName) => (
                                                  <CommandItem
                                                      key={iconName}
                                                      value={iconName}
                                                      onSelect={(currentValue) => {
                                                          setIcon(currentValue.charAt(0).toUpperCase() + currentValue.slice(1))
                                                          setIconSearchOpen(false)
                                                      }}
                                                      className="flex items-center gap-2"
                                                  >
                                                     <CategoryIcon icon={iconName} className="h-5 w-5" />
                                                      <span>{iconName}</span>
                                                  </CommandItem>
                                              ))}
                                          </CommandGroup>
                                      </CommandList>
                                  </Command>
                              </PopoverContent>
                          </Popover>
                          <div className="flex flex-wrap gap-2 flex-1">
                              {categoryColors.map((c) => (
                                  <Button
                                      key={c}
                                      type="button"
                                      variant="outline"
                                      size="icon"
                                      className="h-8 w-8 rounded-full"
                                      style={{ backgroundColor: c }}
                                      onClick={() => setColor(c)}
                                  >
                                      {color === c && <Check className="h-5 w-5 text-white" />}
                                  </Button>
                              ))}
                          </div>
                      </div>
                  </div>
                  <DialogFooter>
                      <Button type="submit">{isEditing ? 'Salvar Alterações' : 'Adicionar Categoria'}</Button>
                  </DialogFooter>
              </form>
          </DialogContent>
      );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Categorias</h1>
        <Dialog open={dialogOpen} onOpenChange={handleDialogChange}>
            <DialogTrigger asChild>
                <Button onClick={handleOpenDialogForAdd}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Adicionar
                </Button>
            </DialogTrigger>
            <CategoryForm 
                onSubmit={handleFormSubmit} 
                onSubmitted={() => handleDialogChange(false)}
                category={editingCategory}
            />
        </Dialog>
      </div>

       <Tabs defaultValue="expenses" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="expenses">
                  Despesas
                </TabsTrigger>
                <TabsTrigger value="incomes">
                  Receitas
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
