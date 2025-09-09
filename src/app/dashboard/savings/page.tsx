"use client";

import { useState } from "react";
import { PlusCircle, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { mockSavingsGoals } from "@/lib/data";
import type { SavingsGoal } from "@/lib/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

export default function SavingsPage() {
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>(mockSavingsGoals);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [addGoalDialogOpen, setAddGoalDialogOpen] = useState(false);


  const addSavingsGoal = (goal: Omit<SavingsGoal, "id">) => {
    setSavingsGoals([...savingsGoals, { ...goal, id: crypto.randomUUID() }]);
  };

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
            <SavingsGoalForm onSubmit={addSavingsGoal} onSubmitted={() => setDialogOpen(false)} />
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {savingsGoals.map((goal) => {
          const progress = (goal.currentAmount / goal.targetAmount) * 100;
          return (
            <Card key={goal.id}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-lg font-medium">{goal.name}</CardTitle>
                <Target className="h-5 w-5 text-muted-foreground" />
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
            <SavingsGoalForm onSubmit={addSavingsGoal} onSubmitted={() => setAddGoalDialogOpen(false)} />
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
    onSubmit: (goal: Omit<SavingsGoal, "id" | "currentAmount"> & { currentAmount?: number }) => void;
    onSubmitted: () => void;
}) {
    const [name, setName] = useState("");
    const [targetAmount, setTargetAmount] = useState("");
    const { toast } = useToast();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !targetAmount) {
            toast({ title: "Por favor, preencha todos os campos", variant: 'destructive' });
            return;
        }

        onSubmit({
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
