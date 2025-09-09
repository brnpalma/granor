"use client";

import { useState } from "react";
import { PlusCircle, Wand2, Target } from "lucide-react";
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
  const [transactions, setTransactions] = useState<Transaction[]>(mockTransactions.sort((a, b) => b.date.getTime() - a.date.getTime()));
  const [dialogOpen, setDialogOpen] = useState(false);

  const addTransaction = (transaction: Omit<Transaction, "id">) => {
    const newTransactions = [
      { ...transaction, id: crypto.randomUUID() },
      ...transactions,
    ].sort((a, b) => b.date.getTime() - a.date.getTime());
    setTransactions(newTransactions);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Transações</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
                <Button>
                    <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Transação
                </Button>
            </DialogTrigger>
            <TransactionForm onSubmit={addTransaction} onSubmitted={() => setDialogOpen(false)} transactions={transactions} />
        </Dialog>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Transações</CardTitle>
          <CardDescription>Uma lista de suas receitas e despesas recentes.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Descrição</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Data</TableHead>
                <TableHead className="text-right">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((t) => (
                <TableRow key={t.id} className={cn(t.isBudget && "bg-muted/50")}>
                  <TableCell className="font-medium">{t.description}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                        {t.isBudget ? <Target className="h-4 w-4 text-muted-foreground" /> : <CategoryIcon category={t.category} className="h-4 w-4 text-muted-foreground" />}
                        {t.category}
                    </div>
                  </TableCell>
                  <TableCell>{t.date.toLocaleDateString('pt-BR')}</TableCell>
                  <TableCell className={cn(
                    "text-right",
                    t.type === "income" ? "text-green-500" : t.isBudget ? "text-yellow-600" : "text-red-500"
                  )}>
                    {t.type === "income" ? "+" : "-"}
                    {t.amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
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
            toast({ title: "Por favor, insira uma descrição primeiro.", variant: 'destructive' });
            return;
        }
        setIsSuggesting(true);
        try {
            const transactionHistory = transactions
                .slice(0, 10)
                .map(t => `${t.date.toLocaleDateString('pt-BR')}: ${t.description} -> ${t.category} (R$${t.amount})`)
                .join('\n');

            const result = await categorizeTransaction({
                transactionDescription: description,
                transactionHistory: transactionHistory,
            });
            
            if (result.suggestedCategory && categories.includes(result.suggestedCategory as Category)) {
                setSuggestedCategory(result.suggestedCategory as Category);
                setCategory(result.suggestedCategory as Category);
                toast({ title: `Categoria sugerida: ${result.suggestedCategory}`, description: `Confiança: ${(result.confidence * 100).toFixed(0)}%` });
            } else {
                 toast({ title: "Não foi possível sugerir uma categoria.", description: "Por favor, selecione uma manualmente.", variant: 'destructive' });
            }
        } catch (error) {
            console.error("Falha na categorização por IA:", error);
            toast({ title: "Falha na sugestão da IA.", description: "Ocorreu um erro ao obter uma sugestão.", variant: 'destructive' });
        } finally {
            setIsSuggesting(false);
        }
    };


    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!description || !amount || !date || !category) {
            toast({ title: "Por favor, preencha todos os campos", variant: 'destructive' });
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
                <DialogTitle>Adicionar Nova Transação</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="description">Descrição</Label>
                    <div className="flex items-center gap-2">
                         <Input id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="ex: Café com amigos" />
                         <Button type="button" size="icon" variant="outline" onClick={handleSuggestCategory} disabled={isSuggesting}>
                            <Wand2 className={cn("h-4 w-4", isSuggesting && "animate-spin")} />
                         </Button>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="amount">Valor</Label>
                        <Input id="amount" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0,00" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="date">Data</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}>
                                    {date ? date.toLocaleDateString('pt-BR') : <span>Escolha uma data</span>}
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
                        <Label htmlFor="type">Tipo</Label>
                        <Select onValueChange={(value: "income" | "expense") => setType(value)} defaultValue={type}>
                            <SelectTrigger id="type">
                                <SelectValue placeholder="Selecione o tipo" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="expense">Despesa</SelectItem>
                                <SelectItem value="income">Receita</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="category">Categoria</Label>
                        <Select onValueChange={(value: Category) => setCategory(value)} value={category}>
                            <SelectTrigger id="category">
                                <SelectValue placeholder="Selecione a categoria" />
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
                    <Button type="submit">Adicionar Transação</Button>
                </DialogFooter>
            </form>
        </DialogContent>
    );
}
