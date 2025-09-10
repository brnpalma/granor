
"use client";

import { useState, useEffect } from "react";
import { PlusCircle, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addCategory, deleteCategory, getCategories } from "@/lib/firestore";
import type { Category } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (typeof window === 'undefined' || !user?.uid) return;

    const unsubscribe = getCategories(user.uid, (data) => {
        setCategories(data);
        setIsLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

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
        <h1 className="text-2xl font-bold">Categorias</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
                <Button>
                    <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Categoria
                </Button>
            </DialogTrigger>
            <CategoryForm onSubmit={handleAddCategory} onSubmitted={() => setDialogOpen(false)} />
        </Dialog>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Suas Categorias</CardTitle>
          <CardDescription>Gerencie as categorias para suas transações e orçamentos.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((cat) => (
                <TableRow key={cat.id}>
                  <TableCell className="font-medium">{cat.name}</TableCell>
                  <TableCell>{cat.type === 'income' ? 'Receita' : 'Despesa'}</TableCell>
                  <TableCell className="text-right">
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
                            Esta ação não pode ser desfeita. Isso removerá permanentemente a categoria.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeleteCategory(cat.id)}>Remover</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
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
