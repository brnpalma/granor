
"use client";

import { useState, useEffect, useMemo } from "react";
import { PlusCircle, Trash2, MoreVertical, Edit } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import { addAccount, getAccounts, deleteAccount, updateAccount } from "@/lib/firestore";
import type { Account, AccountType } from "@/lib/types";
import { accountTypes } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { BankIcon } from "@/components/icons";
import { cn } from "@/lib/utils";

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
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

  const handleOpenDialogForEdit = (account: Account) => {
    setEditingAccount(account);
    setDialogOpen(true);
  };
  
  const handleOpenDialogForAdd = () => {
    setEditingAccount(null);
    setDialogOpen(true);
  };
  
  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingAccount(null);
  };

  const handleFormSubmit = async (accountData: Omit<Account, "id">, accountId?: string) => {
    if (accountId) {
      await updateAccount(user?.uid || null, accountId, accountData);
      toast({ title: "Conta atualizada!" });
    } else {
      await addAccount(user?.uid || null, accountData);
      toast({ title: "Conta adicionada!" });
    }
  };
  
  const handleDeleteAccount = async (accountId: string) => {
    await deleteAccount(user?.uid || null, accountId);
    toast({ title: "Conta removida!"});
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
        <h1 className="text-2xl font-bold">Contas</h1>
        <Dialog open={dialogOpen} onOpenChange={handleCloseDialog}>
            <DialogTrigger asChild>
                <Button onClick={handleOpenDialogForAdd}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Adicionar
                </Button>
            </DialogTrigger>
            <AccountForm 
              onSubmit={handleFormSubmit} 
              onSubmitted={handleCloseDialog} 
              account={editingAccount} 
            />
        </Dialog>
      </div>

       <div className="space-y-2">
            <Card>
              <CardContent className="p-0">
                {accounts.map(account => (
                    <div key={account.id} className="flex items-center gap-4 p-2.5 border-b last:border-b-0">
                        <div className={cn(account.ignoreInTotals && "opacity-50")}>
                          <BankIcon name={account.name} />
                        </div>
                        <div className="flex-1">
                            <p className="text-xs text-muted-foreground">{account.type}</p>
                            <p className={cn("font-bold uppercase", account.ignoreInTotals && "text-muted-foreground")}>{account.name}</p>
                        </div>
                        <div className="text-right">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="shrink-0">
                                        <MoreVertical className="h-5 w-5" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                    <DropdownMenuItem onClick={() => handleOpenDialogForEdit(account)}>
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
                                                   Esta ação não pode ser desfeita. Isso removerá permanentemente a conta e todas as transações associadas a ela.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handleDeleteAccount(account.id)}>Remover</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </DropdownMenuContent>
                            </DropdownMenu>
                           <p className={cn("font-bold text-sm mt-1", account.ignoreInTotals && "text-muted-foreground")}>{account.balance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                        </div>
                    </div>
                ))}
              </CardContent>
            </Card>
        </div>
    </div>
  );
}


function AccountForm({
    onSubmit,
    onSubmitted,
    account,
}: {
    onSubmit: (account: Omit<Account, "id">, accountId?: string) => Promise<void>;
    onSubmitted: () => void;
    account: Account | null;
}) {
    const [name, setName] = useState("");
    const [type, setType] = useState<AccountType | "">("");
    const [balance, setBalance] = useState("");
    const [ignoreInTotals, setIgnoreInTotals] = useState(false);
    const { toast } = useToast();
    
    const isEditing = !!account;

    useEffect(() => {
        if (isEditing) {
            setName(account.name);
            setType(account.type);
            setBalance(String(account.balance));
            setIgnoreInTotals(account.ignoreInTotals || false);
        } else {
            setName("");
            setType("");
            setBalance("");
            setIgnoreInTotals(false);
        }
    }, [account, isEditing]);

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
            ignoreInTotals,
        }, account?.id);

        onSubmitted();
    };

    return (
        <DialogContent>
            <DialogHeader>
                <DialogTitle>{isEditing ? "Editar Conta" : "Adicionar Nova Conta"}</DialogTitle>
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
                    <Label htmlFor="balance">{isEditing ? "Saldo" : "Saldo Inicial (Opcional)"}</Label>
                    <Input id="balance" type="number" value={balance} onChange={(e) => setBalance(e.target.value)} placeholder="0,00" />
                </div>
                <div className="flex items-center space-x-2">
                    <Switch id="ignoreInTotals" checked={ignoreInTotals} onCheckedChange={setIgnoreInTotals} />
                    <Label htmlFor="ignoreInTotals">Ignorar nos totais</Label>
                </div>
                <DialogFooter>
                    <Button type="submit">{isEditing ? "Salvar Alterações" : "Adicionar"}</Button>
                </DialogFooter>
            </form>
        </DialogContent>
    );
}
