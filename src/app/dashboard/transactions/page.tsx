
"use client";

import { useState, useEffect } from "react";
import { PlusCircle, Trash2, Target, CreditCard } from "lucide-react";
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
import { addTransaction, deleteTransaction, getTransactions, getAccounts, getCreditCards, getCategories } from "@/lib/firestore";
import type { Transaction, Category, Account, CreditCard as CreditCardType } from "@/lib/types";
import { cn } from "@/lib/utils";
import { CategoryIcon } from "@/components/icons";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useDate } from "@/hooks/use-date";
import { useTransactionDialog } from "@/hooks/use-transaction-dialog";


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

    return () => {
        unsubTransactions();
        unsubAccounts();
        unsubCreditCards();
    };
  }, [user, selectedDate, getMonthDateRange]);

  
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
        <Button onClick={() => openDialog()} disabled={accounts.length === 0 && creditCards.length === 0}>
            <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Transação
        </Button>
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

    