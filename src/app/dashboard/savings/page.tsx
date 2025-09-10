
"use client";

import { useState, useEffect } from "react";
import { PlusCircle, Target, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { addSavingsGoal, getSavingsGoals, deleteSavingsGoal } from "@/lib/firestore";
import type { SavingsGoal } from "@/lib/types";
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
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

export default function SavingsPage() {
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [addGoalDialogOpen, setAddGoalDialogOpen] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const unsubscribe = getSavingsGoals(user?.uid || null, (data) => {
        setSavingsGoals(data);
        setIsLoading(false);
    });
    return () => unsubscribe();
  }, [user]);


  const handleAddSavingsGoal = async (goal: Omit<SavingsGoal, "id">) => {
    await addSavingsGoal(user?.uid || null, goal);
    toast({ title: "Meta de economia adicionada!" });
  };
  
  const handleDeleteSavingsGoal = async (goalId: string) => {
    await deleteSavingsGoal(user?.uid || null, goalId);
    toast({ title: "Meta de economia removida!" });
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
        <h1 className="text-2xl font-bold">Metas de Economia</h1>
         <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
                <Button>
                    <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Meta
                </Button>
            </DialogTrigger>
            <SavingsGoalForm onSubmit={handleAddSavingsGoal} onSubmitted={() => setDialogOpen(false)} />
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {savingsGoals.map((goal) => {
          const progress = (goal.currentAmount / goal.targetAmount) * 100;
          return (
            <Card key={goal.id}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-lg font-medium">{goal.name}</CardTitle>
                 <div className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-muted-foreground" />
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
                            Esta ação não pode ser desfeita. Isso removerá permanentemente a meta de economia.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeleteSavingsGoal(goal.id)}>Remover</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {goal.currentAmount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </div>
                <p className="text-xs text-muted-foreground">
                  economizado de {goal.targetAmount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </p>
                <Progress value={progress} className="mt-4" />
              </CardContent>
            </Card>
          );
        })}
        <Card className="border-dashed flex flex-col items-center justify-center">
             <Dialog open={addGoalDialogOpen} onOpenChange={setAddGoalDialogOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" className="h-full w-full">
                    <div className="flex flex-col items-center gap-2">
                        <PlusCircle className="h-8 w-8 text-muted-foreground" />
                        <span className="text-muted-foreground">Adicionar Nova Meta</span>
                    </div>
                </Button>
            </DialogTrigger>
            <SavingsGoalForm onSubmit={handleAddSavingsGoal} onSubmitted={() => setAddGoalDialogOpen(false)} />
        </Dialog>
        </Card>
      </div>
    </div>
  );
}


function SavingsGoalForm({
    onSubmit,
    onSubmitted,
}: {
    onSubmit: (goal: Omit<SavingsGoal, "id" | "currentAmount"> & { currentAmount?: number }) => Promise<void>;
    onSubmitted: () => void;
}) {
    const [name, setName] = useState("");
    const [targetAmount, setTargetAmount] = useState("");
    const { toast } = useToast();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !targetAmount) {
            toast({ title: "Por favor, preencha todos os campos", variant: 'destructive' });
            return;
        }

        await onSubmit({
            name,
            targetAmount: parseFloat(targetAmount),
            currentAmount: 0,
        });

        setName("");
        setTargetAmount("");
        onSubmitted();
    };

    return (
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Adicionar Nova Meta de Economia</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="name">Nome da Meta</Label>
                    <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="ex: Novo MacBook Pro" />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="targetAmount">Valor Alvo</Label>
                    <Input id="targetAmount" type="number" value={targetAmount} onChange={(e) => setTargetAmount(e.target.value)} placeholder="0,00" />
                </div>
                <DialogFooter>
                    <Button type="submit">Adicionar Meta</Button>
                </DialogFooter>
            </form>
        </DialogContent>
    );
}
