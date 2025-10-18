
"use client";

import { useState, useEffect, useMemo } from "react";
import { PlusCircle, Trash2, Edit, Check, Box } from "lucide-react";
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { addCategory, deleteCategory, getCategories, getTransactions, updateCategory } from "@/lib/firestore";
import type { Category, Transaction } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useDate } from "@/hooks/use-date";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CategoryIcon } from "@/components/icons";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [activeTab, setActiveTab] = useState<"expense" | "income">("expense");
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
                defaultType={activeTab}
            />
        </Dialog>
      </div>

       <Tabs defaultValue="expense" onValueChange={(value) => setActiveTab(value as "expense" | "income")} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="expense">
                  Despesas
                </TabsTrigger>
                <TabsTrigger value="income">
                  Receitas
                </TabsTrigger>
            </TabsList>
            <TabsContent value="expense">
                {renderCategoryList("expense")}
            </TabsContent>
            <TabsContent value="income">
                {renderCategoryList("income")}
            </TabsContent>
        </Tabs>
      
    </div>
  );
}


function CategoryForm({
    onSubmit,
    onSubmitted,
    category,
    defaultType,
  }: {
    onSubmit: (category: Omit<Category, "id">, categoryId?: string) => Promise<void>;
    onSubmitted: () => void;
    category: Category | null;
    defaultType: "expense" | "income";
  }) {
    const [name, setName] = useState("");
    const [type, setType] = useState<"income" | "expense">(defaultType);
    const [color, setColor] = useState('#F44336');
    const [colorPickerOpen, setColorPickerOpen] = useState(false);
    const { toast } = useToast();

    const isEditing = !!category;
    
    const categoryColors = [
        '#F44336', '#E91E63', '#9C27B0', '#673AB7', '#3F51B5', '#2196F3', '#03A9F4', 
        '#00BCD4', '#009688', '#4CAF50', '#8BC34A', '#CDDC39', '#FFEB3B', '#FFC107', 
        '#FF9800', '#FF5722', '#795548', '#9E9E9E', '#607D8B', '#B71C1C', '#880E4F', 
        '#4A148C', '#311B92', '#1A237E', '#0D47A1', '#01579B', '#006064', '#004D40', 
        '#1B5E20', '#33691E', '#827717', '#F57F17', '#FF6F00', '#E65100', '#BF360C', 
        '#4E342E', '#424242', '#37474F', '#C62828', '#AD1457', '#6A1B9A', '#4527A0', 
        '#283593', '#1565C0', '#0277BD', '#00838F', '#00695C', '#2E7D32', '#558B2F', 
        '#9E9D24', '#F9A825', '#FF8F00', '#EF6C00', '#D84315',
        '#F06292', '#BA68C8', '#9575CD', '#7986CB', '#64B5F6', '#4FC3F7', '#4DD0E1',
        '#4DB6AC', '#81C784', '#AED581', '#DCE775', '#FFF176', '#FFD54F', '#FFB74D',
        '#FF8A65', '#A1887F', '#BDBDBD', '#90A4AE',
    ];

    useEffect(() => {
        if (category) {
            setName(category.name);
            setType(category.type);
            setColor(category.color || categoryColors[0]);
        } else {
            setName("");
            setType(defaultType);
            setColor(categoryColors[Math.floor(Math.random() * categoryColors.length)]);
        }
    }, [category, defaultType]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !type || !color) {
            toast({ title: "Por favor, preencha todos os campos", variant: 'destructive' });
            return;
        }

        await onSubmit({ name, type, icon: 'Box', color }, category?.id);

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
                 <div className="flex items-end gap-4">
                    <div className="space-y-2 flex-1">
                        <Label>Tipo</Label>
                        <RadioGroup value={type} onValueChange={(value) => setType(value as "income" | "expense")} className="flex gap-4 pt-2">
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
                        <Label>Cor</Label>
                        <DropdownMenu open={colorPickerOpen} onOpenChange={setColorPickerOpen}>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-10 w-10 p-0 border-0 flex items-center justify-center">
                                    <div className="w-8 h-8 rounded-full" style={{ backgroundColor: color }} />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="max-h-60 overflow-y-auto">
                                 <div className="grid grid-cols-5 gap-2 p-2">
                                    {categoryColors.map((c) => (
                                        <button
                                            type="button"
                                            key={c}
                                            className="w-8 h-8 rounded-full cursor-pointer flex items-center justify-center ring-offset-background focus:ring-2 focus:ring-ring"
                                            style={{ backgroundColor: c }}
                                            onClick={() => {
                                                setColor(c);
                                                setColorPickerOpen(false);
                                            }}
                                        >
                                            {color === c && <Check className="h-5 w-5 text-white" />}
                                        </button>
                                    ))}
                                </div>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
                <DialogFooter>
                    <Button type="submit">{isEditing ? 'Salvar Alterações' : 'Adicionar Categoria'}</Button>
                </DialogFooter>
            </form>
        </DialogContent>
    );
  }

    
