
"use client";

import { useState, useEffect, useMemo } from "react";
import { PlusCircle, Trash2, Target, CreditCard, Check, Clock, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { addTransaction, deleteTransaction, getTransactions, getAccounts, getCreditCards, getCategories, updateTransaction } from "@/lib/firestore";
import type { Transaction, Category, Account, CreditCard as CreditCardType } from "@/lib/types";
import { cn } from "@/lib/utils";
import { CategoryIcon } from "@/components/icons";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useDate } from "@/hooks/use-date";
import { useTransactionDialog } from "@/hooks/use-transaction-dialog";

type GroupedTransactions = {
    date: string;
    transactions: Transaction[];
};


export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [creditCards, setCreditCards] = useState<CreditCardType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { openDialog } = useTransactionDialog();
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
    
    let dataLoaded = { transactions: false, accounts: false, creditCards: false };
    const checkLoading = () => {
        if(Object.values(dataLoaded).every(Boolean)) {
            setIsLoading(false);
        }
    }

    const unsubTransactions = getTransactions(user.uid, (data) => {
      setTransactions(data.sort((a,b) => b.date.getTime() - a.date.getTime()));
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

    const timeout = setTimeout(() => setIsLoading(false), 2500);


    return () => {
        unsubTransactions();
        unsubAccounts();
        unsubCreditCards();
        clearTimeout(timeout);
    };
  }, [user, selectedDate, getMonthDateRange]);

  
  const handleDeleteTransaction = async (transactionId: string) => {
    await deleteTransaction(user?.uid || null, transactionId);
    toast({ title: "Transação removida!" });
  }

  const handleToggleEfetivado = async (transaction: Transaction) => {
      if (!user?.uid) return;
      await updateTransaction(user.uid, transaction.id, { ...transaction, efetivado: !transaction.efetivado });
      toast({ title: `Transação ${!transaction.efetivado ? 'efetivada' : 'marcada como pendente'}.` });
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

  const groupedTransactions = useMemo(() => {
    const groups: { [key: string]: Transaction[] } = {};
    transactions.forEach(t => {
      const dateKey = t.date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(t);
    });
    return Object.entries(groups).map(([date, transactions]) => {
      const day = date.split('/')[0];
      const weekday = transactions[0].date.toLocaleDateString('pt-BR', { weekday: 'long' });
      return {
        date: `${day} • ${weekday}`,
        transactions,
      };
    });
  }, [transactions]);


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
        <Button onClick={() => openDialog()} disabled={accounts.length === 0 && creditCards.length === 0}>
            <PlusCircle className="mr-2 h-4 w-4" /> Adicionar
        </Button>
      </div>
       {(accounts.length === 0 && creditCards.length === 0) && (
          <Card className="text-center p-6">
            <CardTitle>Nenhuma conta ou cartão encontrado</CardTitle>
            <CardDescription>Por favor, adicione uma conta ou cartão primeiro para registrar transações.</CardDescription>
          </Card>
        )}
      
      {groupedTransactions.length === 0 && !isLoading && (
        <Card className="text-center p-6">
            <CardTitle>Nenhuma transação encontrada</CardTitle>
            <CardDescription>Não há transações para o período selecionado.</CardDescription>
        </Card>
      )}

      <div className="space-y-6">
        {groupedTransactions.map((group, groupIndex) => (
            <div key={group.date}>
                <h2 className="text-sm font-semibold text-muted-foreground mb-2 px-2">{group.date}</h2>
                <div className="space-y-1">
                    {group.transactions.map((t, transIndex) => (
                        <div key={t.id} className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50">
                            <div className="relative flex flex-col items-center">
                                {groupIndex > 0 || transIndex > 0 ? <div className="absolute top-0 h-1/2 w-0.5 bg-border -translate-y-1/2"></div> : null}
                                <div className="z-10 bg-background">
                                     <div className="bg-muted p-2 rounded-full">
                                         {t.creditCardId ? 
                                         <CreditCard className="h-5 w-5 text-muted-foreground" /> :
                                         <CategoryIcon category={t.category} className="h-5 w-5 text-muted-foreground" />
                                         }
                                    </div>
                                </div>
                                {transIndex < group.transactions.length - 1 ? <div className="absolute bottom-0 h-1/2 w-0.5 bg-border translate-y-1/2"></div> : null}
                            </div>
                            <div className="flex-1">
                                <p className="font-medium">{t.description}</p>
                                <p className="text-sm text-muted-foreground">{getSourceName(t)}</p>
                            </div>
                            <div className="text-right">
                                <p className={cn(
                                    "font-bold",
                                    t.type === "income" ? "text-green-500" : "text-foreground"
                                )}>
                                    {t.type === "income" ? "+" : "-"}
                                    {t.amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                                </p>
                                {!t.efetivado && (
                                    <Button size="sm" variant="outline" className="mt-1 h-7 text-xs" onClick={() => handleToggleEfetivado(t)}>Efetivar</Button>
                                )}
                            </div>
                             <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="shrink-0 -mr-2">
                                        <MoreVertical className="h-5 w-5 text-muted-foreground" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                    <DropdownMenuItem onClick={() => handleToggleEfetivado(t)}>
                                        {t.efetivado ? <Clock className="mr-2 h-4 w-4" /> : <Check className="mr-2 h-4 w-4" />}
                                        <span>{t.efetivado ? 'Pendente' : 'Efetivada'}</span>
                                    </DropdownMenuItem>
                                     {!t.isBudget && (
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
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    ))}
                </div>
            </div>
        ))}
      </div>
    </div>
  );
}



    