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

  const addSavingsGoal = (goal: Omit<SavingsGoal, "id">) => {
    setSavingsGoals([...savingsGoals, { ...goal, id: crypto.randomUUID() }]);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Savings Goals</h1>
         <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
                <Button>
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Goal
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
                  {goal.currentAmount.toLocaleString("en-US", { style: "currency", currency: "USD" })}
                </div>
                <p className="text-xs text-muted-foreground">
                  saved of {goal.targetAmount.toLocaleString("en-US", { style: "currency", currency: "USD" })}
                </p>
                <Progress value={progress} className="mt-4" />
              </CardContent>
            </Card>
          );
        })}
        <Card className="border-dashed flex flex-col items-center justify-center">
             <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" className="h-full w-full">
                    <div className="flex flex-col items-center gap-2">
                        <PlusCircle className="h-8 w-8 text-muted-foreground" />
                        <span className="text-muted-foreground">Add New Goal</span>
                    </div>
                </Button>
            </DialogTrigger>
            <SavingsGoalForm onSubmit={addSavingsGoal} onSubmitted={() => setDialogOpen(false)} />
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
            toast({ title: "Please fill all fields", variant: 'destructive' });
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
                <DialogTitle>Add New Savings Goal</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="name">Goal Name</Label>
                    <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., New MacBook Pro" />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="targetAmount">Target Amount</Label>
                    <Input id="targetAmount" type="number" value={targetAmount} onChange={(e) => setTargetAmount(e.target.value)} placeholder="0.00" />
                </div>
                <DialogFooter>
                    <Button type="submit">Add Goal</Button>
                </DialogFooter>
            </form>
        </DialogContent>
    );
}
