
"use client";

import { useState, useEffect, useMemo } from "react";
import { CreditCard, Edit, MoreVertical, EyeOff, Trash2, RotateCcw, ArrowUpNarrowWide, ArrowDownNarrowWide, ArrowUpDown } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
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
} from "@/components/ui/alert-dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { deleteTransaction, getTransactions, getCreditCards, getCategories, updateUserPreferences, getUserPreferences } from "@/lib/firestore";
import type { Transaction, CreditCard as CreditCardType, UserPreferences, RecurrenceEditScope, Category } from "@/lib/types";
import { cn } from "@/lib/utils";
import { CategoryIcon } from "@/components/icons";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useDate } from "@/hooks/use-date";
import { Skeleton } from "@/components/ui/skeleton";
import { useRouter } from "next/navigation";


type GroupedTransactions = {
    date: string;
    transactions: Transaction[];
};


export default function CreditCardTransactionsPage({ params }: { params: { id: string } }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [creditCard, setCreditCard] = useState<CreditCardType | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [preferences, setPreferences] = useState<UserPreferences>({ showBalance: true, includePreviousMonthBalance: true, transactionSortOrder: 'desc' });
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();
  const { selectedDate, getMonthDateRange, clearBalanceCache } = useDate();
  const router = useRouter();

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);

  const cardId = params.id;

  useEffect(() => {
    if (typeof window === 'undefined' || !user?.uid) {
        setIsLoading(false);
        return;
    };

    setIsLoading(true);
    const { startDate, endDate } = getMonthDateRange(selectedDate);
    
    let dataLoaded = { transactions: false, card: false, categories: false, preferences: false };
    const checkLoading = () => {
        if(Object.values(dataLoaded).every(Boolean)) {
            setIsLoading(false);
        }
    }

    const unsubTransactions = getTransactions(user.uid, (data) => {
      setTransactions(data.filter(t => t.creditCardId === cardId));
      dataLoaded.transactions = true;
      checkLoading();
    }, { startDate, endDate });
    
    const unsubCreditCards = getCreditCards(user.uid, (data) => {
        const foundCard = data.find(c => c.id === cardId) || null;
        setCreditCard(foundCard);
        dataLoaded.card = true;
        checkLoading();
    });

    const unsubCategories = getCategories(user.uid, (data) => {
        setCategories(data);
        dataLoaded.categories = true;
        checkLoading();
    });
     const unsubPrefs = getUserPreferences(user.uid, (data) => {
        setPreferences(data);
        dataLoaded.preferences = true;
        checkLoading();
    });

    const timeout = setTimeout(() => {
        setIsLoading(false);
    }, 2500);


    return () => {
        unsubTransactions();
        unsubCreditCards();
        unsubCategories();
        unsubPrefs();
        clearTimeout(timeout);
    };
  }, [user, selectedDate, getMonthDateRange, cardId]);

  
  const handleDeleteTransaction = async (scope: RecurrenceEditScope) => {
    if (!transactionToDelete) return;
    await deleteTransaction(user?.uid || null, transactionToDelete.id, scope, transactionToDelete);
    toast({ title: "Transação removida!", variant: "destructive" });
    setTransactionToDelete(null);
    setDeleteDialogOpen(false);
    clearBalanceCache(); // Force re-fetch of balance
  }

  const openDeleteDialog = (transaction: Transaction) => {
      setTransactionToDelete(transaction);
      setDeleteDialogOpen(true);
  }
  
  const handleToggleSortOrder = () => {
    if (!user?.uid) return;
    const newSortOrder = preferences.transactionSortOrder === 'asc' ? 'desc' : 'asc';
    updateUserPreferences(user.uid, { transactionSortOrder: newSortOrder });
  };


  const handleEditTransaction = (transaction: Transaction) => {
      let url = `/dashboard/transactions/new?id=${transaction.recurrenceId || transaction.id}`;
      if (transaction.isFixed && transaction.id.includes('-projected-')) {
          url += `&overrideDate=${transaction.date.toISOString()}`;
      }
      url += `&isCreditCard=true`;
      router.push(url);
  }
  
  const renderBalance = (value: number) => {
    if (typeof value !== 'number' || isNaN(value)) {
        value = 0;
    }
    if (!preferences.showBalance) {
        return (
            <div className="flex items-center justify-start gap-2">
                <EyeOff className="h-4 w-4 text-muted-foreground" />
                <span className="font-mono">---</span>
            </div>
        )
    }
    return <span>{value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>;
  }

  const sortedTransactions = useMemo(() => {
    return [...transactions].sort((a, b) => {
        if (preferences.transactionSortOrder === 'asc') {
            return a.date.getTime() - b.date.getTime();
        }
        return b.date.getTime() - a.date.getTime();
    });
  }, [transactions, preferences.transactionSortOrder]);


  const groupedTransactions = useMemo(() => {
    const groups: { [key: string]: Transaction[] } = {};
    sortedTransactions.forEach(t => {
      const dateKey = t.date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(t);
    });
    return Object.entries(groups).map(([date, transactions]) => {
      const [day] = date.split('/');
      const weekday = new Intl.DateTimeFormat('pt-BR', { weekday: 'long' }).format(transactions[0].date);
      return {
        date: `${day} • ${weekday.charAt(0).toUpperCase() + weekday.slice(1)}`,
        transactions,
      };
    });
  }, [sortedTransactions]);
  
  const totalInvoice = useMemo(() => {
      return transactions.reduce((acc, t) => {
          if(t.type === 'expense') return acc + t.amount;
          if(t.type === 'credit_card_reversal') return acc - t.amount;
          return acc;
      }, 0);
  }, [transactions]);


  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-8rem)] w-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }
  
  const BalanceInfo = ({ isTop }: { isTop: boolean }) => {
    const isAsc = preferences.transactionSortOrder === 'asc';
    const label = isTop ? "Total da Fatura" : "Total da Fatura";
    const value = totalInvoice;

    return (
        <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            <p className="text-lg font-bold">{renderBalance(value)}</p>
        </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{creditCard?.name || 'Cartão de Crédito'}</h1>
        <Button variant="ghost" size="icon" onClick={handleToggleSortOrder}>
            {preferences.transactionSortOrder === 'asc' ? <ArrowUpNarrowWide className="h-5 w-5" /> : <ArrowDownNarrowWide className="h-5 w-5" />}
        </Button>
      </div>

      <BalanceInfo isTop />

      {transactions.length === 0 && !isLoading && (
        <Card className="text-center p-6">
            <CardTitle>Nenhuma transação encontrada</CardTitle>
            <CardDescription>Não há transações para este cartão no período selecionado.</CardDescription>
        </Card>
      )}

      <div className="space-y-4">
        {groupedTransactions.map((group) => (
            <div key={group.date}>
                <h2 className="text-sm font-semibold text-muted-foreground mb-2 p-2 rounded-md bg-muted/50">{group.date}</h2>
                <div className="space-y-1">
                    {group.transactions.map((t, transIndex) => {
                        const categoryInfo = categories.find(c => c.name === t.category);
                        const isLastItemInGroup = transIndex === group.transactions.length - 1;
                        
                      return (
                        <div key={t.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
                            <div className="relative flex flex-col items-center">
                                {!isLastItemInGroup && <div className="absolute top-8 h-full w-0.5 bg-border z-0"></div>}
                                <div className="z-10 rounded-full">
                                     <div 
                                        style={{ backgroundColor: categoryInfo?.color }} 
                                        className={cn("p-2 rounded-full text-white")}
                                      >
                                         {t.type === 'credit_card_reversal' ? <RotateCcw className="h-5 w-5" /> : <CategoryIcon icon={categoryInfo?.icon} className="h-5 w-5" />}
                                    </div>
                                </div>
                            </div>
                            <div className="flex-1">
                                <p className={cn("font-medium")}>{t.description}</p>
                                <p className="text-sm text-muted-foreground">{t.category}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="flex flex-col items-end gap-1">
                                    <p className={cn(
                                        "font-bold text-sm",
                                        (t.type === 'credit_card_reversal' ? "text-green-500" : "text-red-500"),
                                    )}>
                                        {t.type === 'credit_card_reversal' ? '+' : "-"}
                                        {t.amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                                    </p>
                                </div>

                                <div className="flex items-center">
                                    <div className="hidden md:flex items-center">
                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditTransaction(t)} disabled={!!t.isBudget}>
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                        {!t.isBudget && (
                                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openDeleteDialog(t)}>
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                            </Button>
                                        )}
                                    </div>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8 md:hidden">
                                                <MoreVertical className="h-5 w-5 text-muted-foreground" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent>
                                            <DropdownMenuItem onClick={() => handleEditTransaction(t)} disabled={!!t.isBudget}>
                                                <Edit className="mr-2 h-4 w-4" />
                                                <span>Editar</span>
                                            </DropdownMenuItem>
                                            {!t.isBudget && (
                                                <DropdownMenuItem onSelect={(e) => { e.preventDefault(); openDeleteDialog(t); }}>
                                                    <Trash2 className="mr-2 h-4 w-4 text-destructive" />
                                                    <span className="text-destructive">Remover</span>
                                                </DropdownMenuItem>
                                            )}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </div>
                        </div>
                      )
                    })}
                </div>
            </div>
        ))}
      </div>
        {groupedTransactions.length > 0 && (
            <BalanceInfo isTop={false} />
        )}
        <div className="pb-24"></div>
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <AlertDialogContent style={{ maxWidth: 'fit-content' }}>
                <AlertDialogHeader>
                    <AlertDialogTitle>Remover Transação</AlertDialogTitle>
                    {(transactionToDelete?.isRecurring || transactionToDelete?.isFixed) ? (
                        <AlertDialogDescription>
                            Esta é uma transação recorrente/fixa. Como você gostaria de removê-la?
                        </AlertDialogDescription>
                    ) : (
                        <AlertDialogDescription>
                            Você tem certeza que quer remover esta transação? Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                    )}
                </AlertDialogHeader>
                <AlertDialogFooter className="flex-col gap-2 sm:flex-col sm:gap-2">
                    {(transactionToDelete?.isRecurring || transactionToDelete?.isFixed) ? (
                        <>
                            <AlertDialogAction className={cn(buttonVariants({ variant: "destructive" }))} onClick={() => handleDeleteTransaction("single")}>Remover somente esta</AlertDialogAction>
                            <AlertDialogAction className={cn(buttonVariants({ variant: "destructive" }))} onClick={() => handleDeleteTransaction("future")}>Remover esta e as futuras</AlertDialogAction>
                            <AlertDialogAction className={cn(buttonVariants({ variant: "destructive" }))} onClick={() => handleDeleteTransaction("all")}>Remover todas as parcelas</AlertDialogAction>
                        </>
                    ) : (
                        <AlertDialogAction className={cn(buttonVariants({ variant: "destructive" }))} onClick={() => handleDeleteTransaction("single")}>Remover</AlertDialogAction>
                    )}
                    <AlertDialogCancel onClick={() => setTransactionToDelete(null)}>Cancelar</AlertDialogCancel>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </div>
  );
}

    