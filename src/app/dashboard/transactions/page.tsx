

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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { addTransaction, deleteTransaction, getTransactions, getAccounts, getCreditCards, getCategories, updateTransaction, findPreviousMonthBalance, getUserPreferences, updateUserPreferences } from "@/lib/firestore";
import type { Transaction, Account, CreditCard as CreditCardType, UserPreferences, RecurrenceEditScope, Category } from "@/lib/types";
import { cn } from "@/lib/utils";
import { CategoryIcon } from "@/components/icons";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useDate } from "@/hooks/use-date";
import { Skeleton } from "@/components/ui/skeleton";
import { useRouter } from "next/navigation";
import { isFuture, startOfMonth, isSameMonth } from "date-fns";


type GroupedTransactions = {
    date: string;
    transactions: Transaction[];
};


export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [creditCards, setCreditCards] = useState<CreditCardType[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [initialBalance, setInitialBalance] = useState(0);
  const [preferences, setPreferences] = useState<UserPreferences>({ showBalance: true, includePreviousMonthBalance: true, transactionSortOrder: 'desc' });
  const [isLoading, setIsLoading] = useState(true);
  const [isBalanceLoading, setIsBalanceLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();
  const { selectedDate, getMonthDateRange, clearBalanceCache } = useDate();
  const router = useRouter();

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);
  const [isTogglingEfetivado, setIsTogglingEfetivado] = useState<string[]>([]);


  useEffect(() => {
    if (typeof window === 'undefined' || !user?.uid) {
        setIsLoading(false);
        setIsBalanceLoading(false);
        return;
    };

    setIsLoading(true);
    const { startDate, endDate } = getMonthDateRange(selectedDate);
    
    let dataLoaded = { transactions: false, accounts: false, creditCards: false, categories: false, preferences: false };
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
     const unsubPrefs = getUserPreferences(user.uid, (data) => {
        setPreferences(data);
        dataLoaded.preferences = true;
        checkLoading();
    });

    const timeout = setTimeout(() => {
        setIsLoading(false);
        setIsBalanceLoading(false);
    }, 2500);


    return () => {
        unsubTransactions();
        unsubAccounts();
        unsubCreditCards();
        unsubCategories();
        unsubPrefs();
        clearTimeout(timeout);
    };
  }, [user, selectedDate, getMonthDateRange]);

  useEffect(() => {
      if (!user?.uid) return;

      const fetchBalance = async () => {
          setIsBalanceLoading(true);
          const balance = await findPreviousMonthBalance(user.uid, selectedDate);
          setInitialBalance(balance);
          setIsBalanceLoading(false);
      };

      fetchBalance();
  }, [user, selectedDate]);
  
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

  const handleToggleEfetivado = async (transaction: Transaction) => {
    if (!user?.uid) return;
    setIsTogglingEfetivado(prev => [...prev, transaction.id]);
    try {
        if (transaction.isFixed && transaction.id.includes('-projected-')) {
            const { id, ...rest } = transaction;
            const newTransaction: Omit<Transaction, "id"> = {
                ...rest,
                efetivado: true,
                isFixed: false,
                isRecurring: false,
                description: transaction.description,
            };
            
            const originalId = transaction.recurrenceId;
            if(originalId) {
                const addedTransactionId = await addTransaction(user.uid, newTransaction, true);
                if (addedTransactionId) {
                     const monthKey = `${transaction.date.getFullYear()}-${transaction.date.getMonth()}`;
                     await updateTransaction(user.uid, originalId, { 
                        overrides: { [monthKey]: addedTransactionId } 
                     }, 'all', transaction);
                }
            }
        } else {
          await updateTransaction(user.uid, transaction.id, { efetivado: !transaction.efetivado });
        }

        toast({ title: `Transação ${!transaction.efetivado ? 'efetivada' : 'marcada como pendente'}.`, variant: "success" });
        clearBalanceCache();
    } catch(error) {
        console.error("Error toggling efetivado: ", error);
        toast({ title: "Erro ao atualizar transação.", variant: "destructive" });
    } finally {
        setIsTogglingEfetivado(prev => prev.filter(id => id !== transaction.id));
    }
  }

  const handleEditTransaction = (transaction: Transaction) => {
      let url = `/dashboard/transactions/new?id=${transaction.recurrenceId || transaction.id}`;
      if (transaction.isFixed && transaction.id.includes('-projected-')) {
          url += `&overrideDate=${transaction.date.toISOString()}`;
      }
      if(transaction.transferId) {
        url += `&type=transfer`;
      }
      router.push(url);
  }
  
  const getSourceName = (t: Transaction) => {
    if (t.transferId) {
        const source = accounts.find(a => a.id === t.accountId);
        const incomePart = transactions.find(trans => trans.transferId === t.transferId && trans.type === 'income');
        const destination = accounts.find(a => a.id === incomePart?.accountId);
        return `${source?.name || '?'} -> ${destination?.name || '?'}`;
    }
    if (t.accountId) {
        return accounts.find(a => a.id === t.accountId)?.name || "Conta Desconhecida";
    }
    if (t.creditCardId) {
        return creditCards.find(c => c.id === t.creditCardId)?.name || "Cartão Desconhecido";
    }
    return "N/A";
  }

  const isTransactionIgnored = (transaction: Transaction) => {
    if (!transaction.accountId) return false;
    const account = accounts.find(a => a.id === transaction.accountId);
    return account?.ignoreInTotals || false;
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
    // Filter out the income part of transfers to avoid duplication
    const filtered = transactions.filter(t => !(t.type === 'income' && t.transferId));
    
    return [...filtered].sort((a, b) => {
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
  
  const displayedInitialBalance = useMemo(() => {
    const isFutureMonth = isFuture(startOfMonth(selectedDate));
    return (isFutureMonth && !preferences.includePreviousMonthBalance) ? 0 : initialBalance;
  }, [selectedDate, preferences.includePreviousMonthBalance, initialBalance]);

  const finalBalance = useMemo(() => {
    const isFutureMonth = isFuture(startOfMonth(selectedDate));
    const effectiveInitialBalance = (isFutureMonth && !preferences.includePreviousMonthBalance) ? 0 : initialBalance;
    const includedAccountIds = new Set(accounts.filter(a => !a.ignoreInTotals).map(a => a.id));
    const monthlyFlow = transactions
        .filter(t => t.efetivado && (!t.accountId || includedAccountIds.has(t.accountId)))
        .reduce((acc, t) => {
            if (t.type === 'income') return acc + t.amount;
            if (t.type === 'expense') return acc - t.amount;
            // Estorno de cartão não afeta o saldo da conta principal
            return acc;
        }, 0);
    return effectiveInitialBalance + monthlyFlow;
}, [transactions, initialBalance, accounts, selectedDate, preferences.includePreviousMonthBalance]);


  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-8rem)] w-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }
  
  const BalanceInfo = ({ isTop }: { isTop: boolean }) => {
    const isAsc = preferences.transactionSortOrder === 'asc';
    const label = isTop ? (isAsc ? "Saldo Inicial" : "Saldo Final") : (isAsc ? "Saldo Final" : "Saldo Inicial");
    const value = isTop ? (isAsc ? displayedInitialBalance : finalBalance) : (isAsc ? finalBalance : displayedInitialBalance);

    return (
        <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            {isBalanceLoading ? (
                <Skeleton className="h-6 w-28" />
            ) : (
                <p className="text-lg font-bold">{renderBalance(value)}</p>
            )}
        </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Transações</h1>
        <Button variant="ghost" size="icon" onClick={handleToggleSortOrder}>
            {preferences.transactionSortOrder === 'asc' ? <ArrowUpNarrowWide className="h-5 w-5" /> : <ArrowDownNarrowWide className="h-5 w-5" />}
        </Button>
      </div>

      <BalanceInfo isTop />

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

      <div className="space-y-4">
        {groupedTransactions.map((group, groupIndex) => (
            <div key={group.date}>
                <h2 className="text-sm font-semibold text-muted-foreground mb-2 p-2 rounded-md bg-muted/50">{group.date}</h2>
                <div className="space-y-1">
                    {group.transactions.map((t, transIndex) => {
                      const isIgnored = isTransactionIgnored(t);
                      const isToggling = isTogglingEfetivado.includes(t.id);
                      const categoryInfo = categories.find(c => c.name === t.category);
                      const isTransfer = !!t.transferId;

                      return (
                        <div key={t.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
                            <div className="relative flex flex-col items-center">
                                {groupIndex > 0 || transIndex > 0 ? <div className="absolute top-0 h-1/2 w-0.5 bg-border -translate-y-1/2"></div> : null}
                                <div className="z-10 rounded-full">
                                     <div 
                                        style={{ backgroundColor: isTransfer ? '#FBBF24' : categoryInfo?.color }} 
                                        className={cn("p-2 rounded-full text-white", isIgnored && "opacity-50")}
                                      >
                                         {isTransfer
                                          ? <ArrowUpDown className="h-5 w-5" /> 
                                          : t.creditCardId 
                                            ? ( t.type === 'credit_card_reversal' ? <RotateCcw className="h-5 w-5" /> : <CreditCard className="h-5 w-5" />)
                                            : <CategoryIcon icon={categoryInfo?.icon} className="h-5 w-5" />
                                         }
                                    </div>
                                </div>
                                {transIndex < group.transactions.length - 1 ? <div className="absolute bottom-0 h-1/2 w-0.5 bg-border translate-y-1/2"></div> : null}
                            </div>
                            <div className="flex-1">
                                <p className={cn("font-medium", isIgnored && "text-muted-foreground", isTransfer && "text-yellow-500")}>{t.description}</p>
                                <p className="text-sm text-muted-foreground">{getSourceName(t)}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="flex flex-col items-end gap-1">
                                    <p className={cn(
                                        "font-bold text-sm",
                                         isTransfer ? "text-yellow-500" : (t.type === "income" || t.type === 'credit_card_reversal' ? "text-green-500" : "text-red-500"),
                                        isIgnored && "text-muted-foreground"
                                    )}>
                                        {t.type === "income" ? "+" : isTransfer ? "" : (t.type === 'credit_card_reversal' ? '+' : "-")}
                                        {t.amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                                    </p>
                                    {!t.efetivado && (
                                        <Button 
                                            size="sm" 
                                            variant="outline" 
                                            className={cn(
                                                "h-6 text-xs px-2",
                                                t.type === 'income' || t.type === 'credit_card_reversal'
                                                    ? "border-green-500 text-green-500 hover:bg-green-500/10 hover:text-green-600"
                                                    : "border-red-500 text-red-500 hover:bg-red-500/10 hover:text-red-600"
                                            )} 
                                            onClick={() => handleToggleEfetivado(t)} 
                                            disabled={isToggling}
                                        >
                                            {isToggling ? "Aguarde..." : "Efetivar"}
                                        </Button>
                                    )}
                                </div>

                                <div className="flex items-center">
                                    {/* Desktop Buttons */}
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
                                    {/* Mobile Dropdown */}
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
            <AlertDialogContent>
                <AlertDialogHeader className="text-left">
                    <AlertDialogTitle>Remover Transação</AlertDialogTitle>
                    {(transactionToDelete?.isRecurring || transactionToDelete?.isFixed) ? (
                        <AlertDialogDescription>
                            Esta é uma transação recorrente/fixa. Como você gostaria de removê-la?
                        </AlertDialogDescription>
                    ) : (
                         transactionToDelete?.transferId ? (
                            <AlertDialogDescription>
                                Esta ação removerá a despesa e a receita correspondente a esta transferência. Deseja continuar?
                            </AlertDialogDescription>
                         ) : (
                            <AlertDialogDescription>
                                Você tem certeza que quer remover esta transação? Esta ação não pode ser desfeita.
                            </AlertDialogDescription>
                         )
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

    

    

    
