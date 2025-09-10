
"use client";

import { useState, useEffect } from "react";
import { PlusCircle, CreditCard, Banknote, Trash2 } from "lucide-react";
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
import { addCreditCard, getCreditCards, getAccounts, deleteCreditCard } from "@/lib/firestore";
import type { CreditCard as CreditCardType, Account } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

export default function CreditCardsPage() {
  const [creditCards, setCreditCards] = useState<CreditCardType[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const unsubscribeCards = getCreditCards(user?.uid || null, (data) => {
        setCreditCards(data);
        setIsLoading(false);
    });

    const unsubscribeAccounts = getAccounts(user?.uid || null, (data) => {
        setAccounts(data);
    });

    return () => {
        unsubscribeCards();
        unsubscribeAccounts();
    };
  }, [user]);

  const handleAddCreditCard = async (card: Omit<CreditCardType, "id">) => {
    await addCreditCard(user?.uid || null, card);
    toast({ title: "Cartão de Crédito Adicionado", description: "Seu novo cartão foi salvo." });
  };
  
  const handleDeleteCreditCard = async (cardId: string) => {
    await deleteCreditCard(user?.uid || null, cardId);
    toast({ title: "Cartão de crédito removido!" });
  }
  
  const getAccountName = (accountId: string) => {
    return accounts.find(a => a.id === accountId)?.name || "Desconhecida";
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
        <h1 className="text-2xl font-bold">Cartões de Crédito</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
                <Button disabled={accounts.length === 0}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Cartão
                </Button>
            </DialogTrigger>
            <CreditCardForm onSubmit={handleAddCreditCard} onSubmitted={() => setDialogOpen(false)} accounts={accounts} />
        </Dialog>
      </div>
       {accounts.length === 0 && (
          <Card className="text-center p-6">
            <CardTitle>Nenhuma conta encontrada</CardTitle>
            <CardDescription>É necessário ter pelo menos uma conta para vincular ao pagamento do cartão de crédito.</CardDescription>
          </Card>
        )}
      <Card>
        <CardHeader>
          <CardTitle>Seus Cartões</CardTitle>
          <CardDescription>Uma lista de todos os seus cartões de crédito.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Vencimento (Dia)</TableHead>
                <TableHead>Fechamento (Dia)</TableHead>
                <TableHead>Conta Padrão</TableHead>
                <TableHead>Limite</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {creditCards.map((card) => (
                <TableRow key={card.id}>
                  <TableCell className="font-medium">{card.name}</TableCell>
                  <TableCell>{card.dueDay}</TableCell>
                  <TableCell>{card.closingDay}</TableCell>
                  <TableCell>{getAccountName(card.defaultAccountId)}</TableCell>
                  <TableCell>
                    {card.limit.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </TableCell>
                  <TableCell className="text-right">
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
                            Esta ação não pode ser desfeita. Isso removerá permanentemente o cartão e todas as transações associadas a ele.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeleteCreditCard(card.id)}>Remover</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
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


function CreditCardForm({
    onSubmit,
    onSubmitted,
    accounts,
}: {
    onSubmit: (card: Omit<CreditCardType, "id">) => Promise<void>;
    onSubmitted: () => void;
    accounts: Account[];
}) {
    const [name, setName] = useState("");
    const [limit, setLimit] = useState("");
    const [dueDay, setDueDay] = useState("");
    const [closingDay, setClosingDay] = useState("");
    const [defaultAccountId, setDefaultAccountId] = useState("");
    const { toast } = useToast();

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
        });

        setName("");
        setLimit("");
        setDueDay("");
        setClosingDay("");
        setDefaultAccountId("");
        onSubmitted();
    };

    return (
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Adicionar Novo Cartão de Crédito</DialogTitle>
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
                    <Button type="submit">Adicionar Cartão</Button>
                </DialogFooter>
            </form>
        </DialogContent>
    );
}

    