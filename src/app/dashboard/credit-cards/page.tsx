
"use client";

import { useState, useEffect, useMemo } from "react";
import { PlusCircle, CreditCard, Banknote, Trash2, MoreVertical, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { addCreditCard, getCreditCards, getAccounts, deleteCreditCard, getTransactions, updateCreditCard } from "@/lib/firestore";
import type { CreditCard as CreditCardType, Account, Transaction } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useDate } from "@/hooks/use-date";
import { BankIcon } from "@/components/icons";

export default function CreditCardsPage() {
  const [creditCards, setCreditCards] = useState<CreditCardType[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<CreditCardType | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const { selectedDate, getMonthDateRange } = useDate();

  useEffect(() => {
    if (typeof window === 'undefined' || !user?.uid) return;
    
    setIsLoading(true);
    const { startDate, endDate } = getMonthDateRange(selectedDate);

    let dataLoaded = { cards: false, accounts: false, transactions: false };
    const checkLoading = () => {
        if(Object.values(dataLoaded).every(Boolean)) {
            setIsLoading(false);
        }
    }

    const unsubscribeCards = getCreditCards(user.uid, (data) => {
        setCreditCards(data);
        dataLoaded.cards = true;
        checkLoading();
    });

    const unsubscribeAccounts = getAccounts(user.uid, (data) => {
        setAccounts(data);
        dataLoaded.accounts = true;
        checkLoading();
    });

    const unsubscribeTransactions = getTransactions(user.uid, (data) => {
        setTransactions(data);
        dataLoaded.transactions = true;
        checkLoading();
    }, { startDate, endDate });

    const timeout = setTimeout(() => setIsLoading(false), 2500);

    return () => {
        unsubscribeCards();
        unsubscribeAccounts();
        unsubscribeTransactions();
        clearTimeout(timeout);
    };
  }, [user, selectedDate, getMonthDateRange]);

  const handleOpenDialogForEdit = (card: CreditCardType) => {
    setEditingCard(card);
    setDialogOpen(true);
  };

  const handleOpenDialogForAdd = () => {
    setEditingCard(null);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingCard(null);
  };
  
  const handleFormSubmit = async (cardData: Omit<CreditCardType, "id">, cardId?: string) => {
    if (cardId) {
      await updateCreditCard(user?.uid || null, cardId, cardData);
      toast({ title: "Cartão atualizado!", variant: "success" });
    } else {
      await addCreditCard(user?.uid || null, cardData);
      toast({ title: "Cartão adicionado!", variant: "success" });
    }
  };
  
  const handleDeleteCreditCard = async (cardId: string) => {
    await deleteCreditCard(user?.uid || null, cardId);
    toast({ title: "Cartão de crédito removido!", variant: "destructive" });
  }
  
  const getAccountName = (accountId: string) => {
    return accounts.find(a => a.id === accountId)?.name || "Desconhecida";
  }

  const creditCardInvoices = useMemo(() => {
    return creditCards.map(card => {
        const invoiceTotal = transactions
            .filter(t => t.creditCardId === card.id && t.type === 'expense')
            .reduce((sum, t) => sum + t.amount, 0);
        return { ...card, invoiceTotal };
    });
  }, [creditCards, transactions]);

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
        <h1 className="text-2xl font-bold">Cartões de Crédito</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
                <Button onClick={handleOpenDialogForAdd} disabled={accounts.length === 0}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Adicionar
                </Button>
            </DialogTrigger>
            <CreditCardForm 
                onSubmit={handleFormSubmit} 
                onSubmitted={handleCloseDialog} 
                card={editingCard}
                accounts={accounts} 
            />
        </Dialog>
      </div>
       {accounts.length === 0 && (
          <Card className="text-center p-6">
            <CardTitle>Nenhuma conta encontrada</CardTitle>
            <CardDescription>É necessário ter pelo menos uma conta para vincular ao pagamento do cartão de crédito.</CardDescription>
          </Card>
        )}
      
      <div className="space-y-4">
        {creditCardInvoices.map(card => {
          const availableLimit = card.limit - card.invoiceTotal;
          const progress = card.limit > 0 ? (card.invoiceTotal / card.limit) * 100 : 0;
          return (
            <Card key={card.id}>
              <CardContent className="p-4 space-y-4">
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                        <BankIcon name={card.name} />
                        <div>
                            <p className="font-bold">{card.name}</p>
                            <p className="text-sm text-muted-foreground">MasterCard</p>
                        </div>
                    </div>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="shrink-0 -mr-2 -mt-2">
                                <MoreVertical className="h-5 w-5" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                            <DropdownMenuItem onClick={() => handleOpenDialogForEdit(card)}>
                                <Edit className="mr-2 h-4 w-4" />
                                <span>Editar</span>
                            </DropdownMenuItem>
                             <AlertDialog>
                                <AlertDialogTrigger asChild>
                                     <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                        <Trash2 className="mr-2 h-4 w-4 text-destructive" />
                                        <span className="text-destructive">Remover</span>
                                    </DropdownMenuItem>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                           Esta ação não pode ser desfeita. Isso removerá permanentemente o cartão e todas as transações associadas a ele.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleDeleteCreditCard(card.id)}>Remover</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                <div className="grid grid-cols-3 gap-2 text-sm">
                    <div>
                        <p className="text-muted-foreground">Limite</p>
                        <p className="font-semibold">{card.limit.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p>
                    </div>
                    <div>
                        <p className="text-muted-foreground">Em aberto</p>
                        <p className="font-semibold">{card.invoiceTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-muted-foreground">Lim. disponível</p>
                        <p className="font-semibold text-green-500">{availableLimit.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p>
                    </div>
                </div>

                <Progress value={progress} className="h-2" />

                <div className="grid grid-cols-3 gap-2 text-sm">
                    <div>
                        <p className="text-muted-foreground">Conta</p>
                        <p className="font-semibold">{getAccountName(card.defaultAccountId)}</p>
                    </div>
                     <div>
                        <p className="text-muted-foreground">Fechamento</p>
                        <p className="font-semibold">{card.closingDay}/{new Date(selectedDate).toLocaleDateString('pt-BR', { month: 'short' }).replace('.','').toUpperCase()}</p>
                    </div>
                     <div className="text-right">
                        <p className="text-muted-foreground">Vencimento</p>
                        <p className="font-semibold">{card.dueDay}/{new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 1).toLocaleDateString('pt-BR', { month: 'short' }).replace('.','').toUpperCase()}</p>
                    </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}


function CreditCardForm({
    onSubmit,
    onSubmitted,
    accounts,
    card,
}: {
    onSubmit: (card: Omit<CreditCardType, "id">, cardId?: string) => Promise<void>;
    onSubmitted: () => void;
    accounts: Account[];
    card: CreditCardType | null;
}) {
    const [name, setName] = useState("");
    const [limit, setLimit] = useState("");
    const [dueDay, setDueDay] = useState("");
    const [closingDay, setClosingDay] = useState("");
    const [defaultAccountId, setDefaultAccountId] = useState("");
    const { toast } = useToast();

    const isEditing = !!card;

    useEffect(() => {
        if (isEditing) {
            setName(card.name);
            setLimit(String(card.limit));
            setDueDay(String(card.dueDay));
            setClosingDay(String(card.closingDay));
            setDefaultAccountId(card.defaultAccountId);
        } else {
            setName("");
            setLimit("");
            setDueDay("");
            setClosingDay("");
            setDefaultAccountId("");
        }
    }, [card, isEditing]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !limit || !dueDay || !closingDay || !defaultAccountId) {
            toast({ title: "Por favor, preencha todos os campos", variant: 'destructive' });
            return;
        }

        await onSubmit({
            name,
            limit: parseFloat(limit),
            dueDay: parseInt(dueDay),
            closingDay: parseInt(closingDay),
            defaultAccountId,
        }, card?.id);

        if (!isEditing) {
            setName("");
            setLimit("");
            setDueDay("");
            setClosingDay("");
            setDefaultAccountId("");
        }
        onSubmitted();
    };

    return (
        <DialogContent>
            <DialogHeader>
                <DialogTitle>{isEditing ? "Editar Cartão" : "Adicionar Cartão"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="name">Nome do Cartão</Label>
                    <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="ex: Cartão Nubank" />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="defaultAccountId">Conta para Pagamento</Label>
                    <Select onValueChange={setDefaultAccountId} value={defaultAccountId}>
                        <SelectTrigger id="defaultAccountId">
                            <SelectValue placeholder="Selecione a conta" />
                        </SelectTrigger>
                        <SelectContent>
                            {accounts.map(acc => (
                                <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="limit">Limite do Cartão</Label>
                        <Input id="limit" type="number" value={limit} onChange={(e) => setLimit(e.target.value)} placeholder="5000,00" />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="dueDay">Dia do Vencimento</Label>
                        <Input id="dueDay" type="number" min="1" max="31" value={dueDay} onChange={(e) => setDueDay(e.target.value)} placeholder="ex: 10" />
                    </div>
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="closingDay">Dia do Fechamento</Label>
                    <Input id="closingDay" type="number" min="1" max="31" value={closingDay} onChange={(e) => setClosingDay(e.target.value)} placeholder="ex: 3" />
                </div>
                <DialogFooter>
                    <Button type="submit">{isEditing ? "Salvar Alterações" : "Adicionar"}</Button>
                </DialogFooter>
            </form>
        </DialogContent>
    );
}

    

    

    
