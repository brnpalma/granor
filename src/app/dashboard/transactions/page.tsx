"use client";

import { useState } from "react";
import { PlusCircle, Wand2 } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { mockTransactions } from "@/lib/data";
import type { Transaction, Category } from "@/lib/types";
import { categories } from "@/lib/types";
import { cn } from "@/lib/utils";
import { CategoryIcon } from "@/components/icons";
import { categorizeTransaction } from "@/ai/flows/categorize-transaction";
import { useToast } from "@/hooks/use-toast";


export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>(mockTransactions);
  const [dialogOpen, setDialogOpen] = useState(false);

  const addTransaction = (transaction: Omit<Transaction, "id">) => {
    setTransactions([
      { ...transaction, id: crypto.randomUUID() },
      ...transactions,
    ]);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Transactions</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
                <Button>
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Transaction
                </Button>
            </DialogTrigger>
            <TransactionForm onSubmit={addTransaction} onSubmitted={() => setDialogOpen(false)} transactions={transactions} />
        </Dialog>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
          <CardDescription>A list of your recent income and expenses.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Description</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.description}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                        <CategoryIcon category={t.category} className="h-4 w-4 text-muted-foreground" />
                        {t.category}
                    </div>
                  </TableCell>
                  <TableCell>{t.date.toLocaleDateString()}</TableCell>
                  <TableCell className={cn(
                    "text-right",
                    t.type === "income" ? "text-green-500" : "text-red-500"
                  )}>
                    {t.type === "income" ? "+" : "-"}
                    {t.amount.toLocaleString("en-US", { style: "currency", currency: "USD" })}
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


function TransactionForm({
    onSubmit,
    onSubmitted,
    transactions,
}: {
    onSubmit: (transaction: Omit<Transaction, "id">) => void;
    onSubmitted: () => void;
    transactions: Transaction[];
}) {
    const [description, setDescription] = useState("");
    const [amount, setAmount] = useState("");
    const [date, setDate] = useState<Date | undefined>(new Date());
    const [type, setType] = useState<"income" | "expense">("expense");
    const [category, setCategory] = useState<Category | "">("");
    const [suggestedCategory, setSuggestedCategory] = useState<Category | null>(null);
    const [isSuggesting, setIsSuggesting] = useState(false);
    const { toast } = useToast();

    const handleSuggestCategory = async () => {
        if (!description) {
            toast({ title: "Please enter a description first.", variant: 'destructive' });
            return;
        }
        setIsSuggesting(true);
        try {
            const transactionHistory = transactions
                .slice(0, 10)
                .map(t => `${t.date.toLocaleDateString()}: ${t.description} -> ${t.category} ($${t.amount})`)
                .join('\n');

            const result = await categorizeTransaction({
                transactionDescription: description,
                transactionHistory: transactionHistory,
            });
            
            if (result.suggestedCategory && categories.includes(result.suggestedCategory as Category)) {
                setSuggestedCategory(result.suggestedCategory as Category);
                setCategory(result.suggestedCategory as Category);
                toast({ title: `Suggested category: ${result.suggestedCategory}`, description: `Confidence: ${(result.confidence * 100).toFixed(0)}%` });
            } else {
                 toast({ title: "Could not suggest a category.", description: "Please select one manually.", variant: 'destructive' });
            }
        } catch (error) {
            console.error("AI categorization failed:", error);
            toast({ title: "AI suggestion failed.", description: "There was an error getting a suggestion.", variant: 'destructive' });
        } finally {
            setIsSuggesting(false);
        }
    };


    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!description || !amount || !date || !category) {
            toast({ title: "Please fill all fields", variant: 'destructive' });
            return;
        }

        onSubmit({
            description,
            amount: parseFloat(amount),
            date,
            type,
            category,
        });

        // Reset form
        setDescription("");
        setAmount("");
        setDate(new Date());
        setType("expense");
        setCategory("");
        setSuggestedCategory(null);
        onSubmitted();
    };

    return (
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Add New Transaction</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <div className="flex items-center gap-2">
                         <Input id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g., Coffee with friends" />
                         <Button type="button" size="icon" variant="outline" onClick={handleSuggestCategory} disabled={isSuggesting}>
                            <Wand2 className={cn("h-4 w-4", isSuggesting && "animate-spin")} />
                         </Button>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="amount">Amount</Label>
                        <Input id="amount" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="date">Date</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}>
                                    {date ? date.toLocaleDateString() : <span>Pick a date</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <Calendar mode="single" selected={date} onSelect={setDate} initialFocus />
                            </PopoverContent>
                        </Popover>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="type">Type</Label>
                        <Select onValueChange={(value: "income" | "expense") => setType(value)} defaultValue={type}>
                            <SelectTrigger id="type">
                                <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="expense">Expense</SelectItem>
                                <SelectItem value="income">Income</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="category">Category</Label>
                        <Select onValueChange={(value: Category) => setCategory(value)} value={category}>
                            <SelectTrigger id="category">
                                <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent>
                                {categories.map(cat => (
                                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <DialogFooter>
                    <Button type="submit">Add Transaction</Button>
                </DialogFooter>
            </form>
        </DialogContent>
    );
}
