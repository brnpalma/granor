
"use client";

import { useState, useEffect, useMemo } from "react";
import { PlusCircle, Trash2, MoreVertical, ExternalLink } from "lucide-react";
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
import { addAccount, getAccounts, deleteAccount } from "@/lib/firestore";
import type { Account, AccountType } from "@/lib/types";
import { accountTypes } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { BankIcon } from "@/components/icons";

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const unsubscribe = getAccounts(user?.uid || null, (data) => {
        setAccounts(data);
        setIsLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  const handleAddAccount = async (account: Omit<Account, "id">) => {
    await addAccount(user?.uid || null, account);
  };
  
  const handleDeleteAccount = async (accountId: string) => {
    await deleteAccount(user?.uid || null, accountId);
    toast({ title: "Conta removida!"});
  }
  
  const totalBalance = useMemo(() => {
    return accounts.reduce((sum, acc) => sum + acc.balance, 0);
  }, [accounts]);

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
        <h1 className="text-2xl font-bold">Contas</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
                <Button>
                    <PlusCircle className="mr-2 h-4 w-4" /> Adicionar
                </Button>
            </DialogTrigger>
            <AccountForm onSubmit={handleAddAccount} onSubmitted={() => setDialogOpen(false)} />
        </Dialog>
      </div>

       <div className="space-y-2">
            <Card>
              <CardContent className="p-2 space-y-4">
                {accounts.map(account => (
                    <div key={account.id} className="flex items-center gap-4 p-2 rounded-lg hover:bg-muted">
                        <BankIcon name={account.name} />
                        <div className="flex-1">
                            <p className="text-xs text-muted-foreground">{account.type}</p>
                            <p className="font-bold uppercase">{account.name}</p>
                        </div>
                        <div className="text-right">
                           <p className="font-bold">{account.balance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                        </div>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                             <Button variant="ghost" size="icon" className="shrink-0">
                                <MoreVertical className="h-5 w-5" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta ação não pode ser desfeita. Isso removerá permanentemente a conta e todas as transações associadas a ela.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteAccount(account.id)}>Remover</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                    </div>
                ))}
                 <div className="border-t border-border my-2"></div>
                 <div className="flex items-center gap-4 p-2">
                    <div className="w-8 h-8"></div>
                    <div className="flex-1">
                        <p className="font-bold">Total</p>
                    </div>
                    <div className="text-right">
                        <p className="font-bold">{totalBalance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                    </div>
                    <div className="w-10"></div>
                </div>
              </CardContent>
            </Card>
        </div>
    </div>
  );
}


function AccountForm({
    onSubmit,
    onSubmitted,
}: {
    onSubmit: (account: Omit<Account, "id">) => Promise<void>;
    onSubmitted: () => void;
}) {
    const [name, setName] = useState("");
    const [type, setType] = useState<AccountType | "">("");
    const [balance, setBalance] = useState("");
    const { toast } = useToast();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !type) {
            toast({ title: "Por favor, preencha o nome e o tipo da conta", variant: 'destructive' });
            return;
        }

        await onSubmit({
            name,
            type: type as AccountType,
            balance: parseFloat(balance) || 0,
        });

        setName("");
        setType("");
        setBalance("");
        onSubmitted();
    };

    return (
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Adicionar Nova Conta</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="name">Nome da Conta</Label>
                    <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="ex: Banco Principal" />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="type">Tipo de Conta</Label>
                    <Select onValueChange={(value: AccountType) => setType(value)} value={type}>
                        <SelectTrigger id="type">
                            <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                        <SelectContent>
                            {accountTypes.map(cat => (
                                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="balance">Saldo Inicial (Opcional)</Label>
                    <Input id="balance" type="number" value={balance} onChange={(e) => setBalance(e.target.value)} placeholder="0,00" />
                </div>
                <DialogFooter>
                    <Button type="submit">Adicionar Conta</Button>
                </DialogFooter>
            </form>
        </DialogContent>
    );
}
