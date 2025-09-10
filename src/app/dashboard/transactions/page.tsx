
"use client";

import { useState, useEffect } from "react";
import { PlusCircle, Wand2, Target, CreditCard, Trash2 } from "lucide-react";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { addTransaction, deleteTransaction, getTransactions, getAccounts, getCreditCards, getCategories } from "@/lib/firestore";
import type { Transaction, Category, Account, CreditCard as CreditCardType } from "@/lib/types";
import { cn } from "@/lib/utils";
import { CategoryIcon } from "@/components/icons";
import { categorizeTransaction } from "@/ai/flows/categorize-transaction";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useDate } from "@/hooks/use-date";


export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [creditCards, setCreditCards] = useState<CreditCardType[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
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
    
    let dataLoaded = { transactions: false, accounts: false, creditCards: false, categories: false };
    const checkLoading = () => {
        if(Object.values(dataLoaded).every(Boolean)) {
            setIsLoading(false);
        }
    }

    const unsubTransactions = getTransactions(user.uid, (data) => {
      setTransactions(data);
      dataLoaded.transactions = true;
      checkLoading();
    }, { startDate, endDate });

    const unsubAccounts = getAccounts(user.uid, (data) => {
        setAccounts(data);
        dataLoaded.accounts = true;
        checkLoading();
    });
    const unsubCreditCards = getCreditCards(user.uid, (data) => {
        setCreditCards(data);
        dataLoaded.creditCards = true;
        checkLoading();
    });
    const unsubCategories = getCategories(user.uid, (data) => {
        setCategories(data);
        dataLoaded.categories = true;
        checkLoading();
    });


    return () => {
        unsubTransactions();
        unsubAccounts();
        unsubCreditCards();
        unsubCategories();
    };
  }, [user, selectedDate, getMonthDateRange]);


  const handleAddTransaction = async (transaction: Omit<Transaction, "id">) => {
    await addTransaction(user?.uid || null, transaction);
    toast({ title: "Transação adicionada", description: "Sua nova transação foi salva." });
  };
  
  const handleDeleteTransaction = async (transactionId: string) => {
    await deleteTransaction(user?.uid || null, transactionId);
    toast({ title: "Transação removida!" });
  }
  
  const getSourceName = (t: Transaction) => {
    if (t.accountId) {
        return accounts.find(a => a.id === t.accountId)?.name || "Conta Desconhecida";
    }
    if (t.creditCardId) {
        return creditCards.find(c => c.id === t.creditCardId)?.name || "Cartão Desconhecido";
    }
    return "N/A";
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
        <h1 className="text-2xl font-bold">Transações</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
                <Button disabled={accounts.length === 0 && creditCards.length === 0}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Transação
                </Button>
            </DialogTrigger>
            <TransactionForm 
                onSubmit={handleAddTransaction} 
                onSubmitted={() => setDialogOpen(false)} 
                transactions={transactions}
                accounts={accounts}
                creditCards={creditCards}
                categories={categories}
            />
        </Dialog>
      </div>
       {(accounts.length === 0 && creditCards.length === 0) && (
          <Card className="text-center p-6">
            <CardTitle>Nenhuma conta ou cartão encontrado</CardTitle>
            <CardDescription>Por favor, adicione uma conta ou cartão primeiro para registrar transações.</CardDescription>
          </Card>
        )}
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
                <TableHead>Fonte</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Data</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((t) => (
                <TableRow key={t.id} className={cn(t.isBudget && "bg-muted/50")}>
                  <TableCell className="font-medium">{t.description}</TableCell>
                   <TableCell>
                     <div className="flex items-center gap-2">
                       {t.creditCardId && <CreditCard className="h-4 w-4 text-muted-foreground" />}
                       {getSourceName(t)}
                     </div>
                   </TableCell>
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
                  <TableCell className="text-right">
                    {!t.isBudget && (
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
                              Esta ação não pode ser desfeita. Isso removerá permanentemente a transação. Se for uma transação de conta, o saldo será ajustado.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteTransaction(t.id)}>Remover</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
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
    accounts,
    creditCards,
    categories
}: {
    onSubmit: (transaction: Omit<Transaction, "id">) => Promise<void>;
    onSubmitted: () => void;
    transactions: Transaction[];
    accounts: Account[];
    creditCards: CreditCardType[];
    categories: Category[];
}) {
    const [description, setDescription] = useState("");
    const [amount, setAmount] = useState("");
    const [date, setDate] = useState<Date | undefined>(new Date());
    const [type, setType] = useState<"income" | "expense">("expense");
    const [category, setCategory] = useState<string>("");
    const [source, setSource] = useState<"account" | "creditCard">("account");
    const [sourceId, setSourceId] = useState<string>("");
    const [suggestedCategory, setSuggestedCategory] = useState<string | null>(null);
    const [isSuggesting, setIsSuggesting] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        // Reset sourceId when source type changes
        setSourceId("");
    }, [source]);

    useEffect(() => {
      // If income is selected, force source to be account
      if (type === 'income') {
        setSource('account');
      }
    }, [type]);


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
            
            const categoryExists = categories.some(c => c.name === result.suggestedCategory);
            if (result.suggestedCategory && categoryExists) {
                setSuggestedCategory(result.suggestedCategory);
                setCategory(result.suggestedCategory);
                toast({ title: `Categoria sugerida: ${result.suggestedCategory}`, description: `Confiança: ${(result.confidence * 100).toFixed(0)}%` });
            } else {
                 toast({ title: "Não foi possível sugerir uma categoria.", description: "A categoria sugerida não existe ou a IA não pôde determinar uma. Por favor, selecione uma manualmente.", variant: 'destructive' });
            }
        } catch (error) {
            console.error("Falha na categorização por IA:", error);
            toast({ title: "Falha na sugestão da IA.", description: "Ocorreu um erro ao obter uma sugestão.", variant: 'destructive' });
        } finally {
            setIsSuggesting(false);
        }
    };


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!description || !amount || !date || !category || !sourceId) {
            toast({ title: "Por favor, preencha todos os campos", variant: 'destructive' });
            return;
        }

        const transactionData: Omit<Transaction, "id"> = {
            description,
            amount: parseFloat(amount),
            date,
            type,
            category,
            accountId: source === 'account' ? sourceId : undefined,
            creditCardId: source === 'creditCard' ? sourceId : undefined,
        };

        await onSubmit(transactionData);

        // Reset form
        setDescription("");
        setAmount("");
        setDate(new Date());
        setType("expense");
        setCategory("");
        setSource("account");
        setSourceId("");
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
                    <Label>Fonte da Transação</Label>
                    <RadioGroup value={source} onValueChange={(value) => setSource(value as "account" | "creditCard")} className="flex gap-4">
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="account" id="account" />
                            <Label htmlFor="account">Conta</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="creditCard" id="creditCard" disabled={type === 'income'}/>
                            <Label htmlFor="creditCard">Cartão de Crédito</Label>
                        </div>
                    </RadioGroup>
                </div>
                
                <div className="space-y-2">
                    <Label htmlFor="sourceId">
                      {source === 'account' ? 'Conta' : 'Cartão de Crédito'}
                    </Label>
                    <Select onValueChange={setSourceId} value={sourceId}>
                        <SelectTrigger id="sourceId">
                            <SelectValue placeholder={`Selecione ${source === 'account' ? 'a conta' : 'o cartão'}`} />
                        </SelectTrigger>
                        <SelectContent>
                            {source === 'account' ? 
                              accounts.map(acc => (
                                  <SelectItem key={acc.id} value={acc.id}>{acc.name} ({acc.balance.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })})</SelectItem>
                              )) :
                              creditCards.map(card => (
                                <SelectItem key={card.id} value={card.id}>{card.name}</SelectItem>
                              ))
                            }
                        </SelectContent>
                    </Select>
                </div>

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
                        <Select onValueChange={(value: string) => setCategory(value)} value={category}>
                            <SelectTrigger id="category">
                                <SelectValue placeholder="Selecione a categoria" />
                            </SelectTrigger>
                            <SelectContent>
                                {categories.filter(c => type === 'income' ? c.name === 'Salário' : c.name !== 'Salário').map(cat => (
                                    <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
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
