"use client";

import { useState, useEffect } from "react";
import { PlusCircle, Wallet } from "lucide-react";
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
import { addAccount, getAccounts } from "@/lib/firestore";
import type { Account, AccountType } from "@/lib/types";
import { accountTypes } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { user } = useAuth();

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
                    <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Conta
                </Button>
            </DialogTrigger>
            <AccountForm onSubmit={handleAddAccount} onSubmitted={() => setDialogOpen(false)} />
        </Dialog>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Suas Contas</CardTitle>
          <CardDescription>Uma lista de todas as suas contas cadastradas.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Saldo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts.map((acc) => (
                <TableRow key={acc.id}>
                  <TableCell className="font-medium">{acc.name}</TableCell>
                  <TableCell>{acc.type}</TableCell>
                  <TableCell className="text-right">
                    {acc.balance.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
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
        if (!name || !type || !balance) {
            toast({ title: "Por favor, preencha todos os campos", variant: 'destructive' });
            return;
        }

        await onSubmit({
            name,
            type: type as AccountType,
            balance: parseFloat(balance),
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
                    <Label htmlFor="balance">Saldo Inicial</Label>
                    <Input id="balance" type="number" value={balance} onChange={(e) => setBalance(e.target.value)} placeholder="0,00" />
                </div>
                <DialogFooter>
                    <Button type="submit">Adicionar Conta</Button>
                </DialogFooter>
            </form>
        </DialogContent>
    );
}
