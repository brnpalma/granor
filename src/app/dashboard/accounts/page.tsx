

"use client";

import { useState, useEffect, useMemo } from "react";
import { PlusCircle, Trash2, MoreVertical, Edit, Check } from "lucide-react";
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
import { addAccount, getAccounts, deleteAccount, updateAccount, getTransactionsOnce } from "@/lib/firestore";
import type { Account, AccountType, Transaction } from "@/lib/types";
import { accountTypes } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { BankIcon } from "@/components/icons";
import { cn } from "@/lib/utils";

const accountColors = [
    '#F44336', '#E91E63', '#9C27B0', '#673AB7', '#3F51B5',
    '#2196F3', '#03A9F4', '#00BCD4', '#009688', '#4CAF50',
    '#8BC34A', '#CDDC39', '#FFEB3B', '#FFC107', '#FF9800',
    '#FF5722', '#795548', '#9E9E9E', '#607D8B', '#B71C1C',
    '#880E4F', '#4A148C', '#311B92', '#1A237E', '#0D47A1',
    '#01579B', '#006064', '#004D40', '#1B5E20', '#33691E',
    '#827717', '#F57F17', '#FF6F00', '#E65100', '#BF360C',
    '#4E342E', '#424242', '#37474F', '#C62828', '#AD1457',
    '#6A1B9A', '#4527A0', '#283593', '#1565C0', '#0277BD',
    '#00838F', '#00695C', '#2E7D32', '#558B2F', '#9E9D24',
    '#F9A825', '#FF8F00', '#EF6C00', '#D84315'
];


export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (typeof window === 'undefined' || !user?.uid) return;
    
    setIsLoading(true);
    let dataLoaded = { accounts: false, transactions: false };

    const checkLoading = () => {
        if(Object.values(dataLoaded).every(Boolean)) {
            setIsLoading(false);
        }
    }

    const unsubscribe = getAccounts(user?.uid || null, (data) => {
        setAccounts(data);
        dataLoaded.accounts = true;
        checkLoading();
    });

    getTransactionsOnce(user.uid, { endDate: new Date() }).then(transactions => {
        setAllTransactions(transactions);
        dataLoaded.transactions = true;
        checkLoading();
    });


    return () => unsubscribe();
  }, [user]);

  const accountBalances = useMemo(() => {
    const balances = new Map<string, number>();
    accounts.forEach(account => {
        const accountTransactions = allTransactions.filter(t => t.accountId === account.id && t.efetivado);
        const currentBalance = accountTransactions.reduce((acc, t) => {
            if (t.type === 'income') return acc + t.amount;
            if (t.type === 'expense') return acc - t.amount;
            return acc;
        }, account.initialBalance);
        balances.set(account.id, currentBalance);
    });
    return balances;
  }, [accounts, allTransactions]);


  const handleOpenDialogForEdit = (account: Account) => {
    setEditingAccount(account);
    setDialogOpen(true);
  };
  
  const handleOpenDialogForAdd = () => {
    setEditingAccount(null);
    setDialogOpen(true);
  };
  
  const handleDialogChange = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setEditingAccount(null);
    }
  }

  const handleFormSubmit = async (accountData: Omit<Account, "id">, accountId?: string) => {
    if (accountId) {
      await updateAccount(user?.uid || null, accountId, accountData);
      toast({ title: "Conta atualizada!", variant: "success" });
    } else {
      await addAccount(user?.uid || null, accountData);
      toast({ title: "Conta adicionada!", variant: "success" });
    }
  };
  
  const handleDeleteAccount = async (accountId: string) => {
    await deleteAccount(user?.uid || null, accountId);
    toast({ title: "Conta removida!", variant: "destructive" });
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
        <Dialog open={dialogOpen} onOpenChange={handleDialogChange}>
            <DialogTrigger asChild>
                <Button>
                    <PlusCircle className="mr-2 h-4 w-4" /> Adicionar
                </Button>
            </DialogTrigger>
            <AccountForm 
              onSubmit={handleFormSubmit} 
              onSubmitted={() => handleDialogChange(false)} 
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
                          <BankIcon name={account.name} color={account.color} />
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
                           <p className={cn("font-bold text-sm mt-1", account.ignoreInTotals && "text-muted-foreground")}>{(accountBalances.get(account.id) ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
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
    const [balance, setBalance] = useState(0);
    const [color, setColor] = useState(accountColors[0]);
    const [ignoreInTotals, setIgnoreInTotals] = useState(false);
    const { toast } = useToast();
    
    const isEditing = !!account;

    useEffect(() => {
        if (account) {
            setName(account.name);
            setType(account.type);
            setBalance(account.initialBalance * 100);
            setIgnoreInTotals(account.ignoreInTotals || false);
            setColor(account.color || accountColors[0]);
        } else {
            setName("");
            setType("");
            setBalance(0);
            setIgnoreInTotals(false);
            setColor(accountColors[0]);
        }
    }, [account]);

    const formatCurrency = (value: number) => {
        const amountInReais = value / 100;
        return amountInReais.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };

    const handleBalanceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const rawValue = e.target.value.replace(/\D/g, '');
        setBalance(Number(rawValue));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !type) {
            toast({ title: "Por favor, preencha o nome e o tipo da conta", variant: 'destructive' });
            return;
        }

        await onSubmit({
            name,
            type: type as AccountType,
            initialBalance: balance / 100,
            ignoreInTotals,
            color,
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
                    <Label>Cor da Conta</Label>
                    <Select onValueChange={setColor} value={color}>
                        <SelectTrigger>
                            <SelectValue asChild>
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: color }} />
                                    <span>{color}</span>
                                </div>
                            </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                            <div className="grid grid-cols-5 gap-2 p-2">
                                {accountColors.map((c) => (
                                     <SelectItem key={c} value={c} className="p-0 m-0 focus:ring-0 focus:bg-transparent">
                                        <div 
                                            className="w-8 h-8 rounded-full cursor-pointer flex items-center justify-center ring-offset-background focus:ring-2 focus:ring-ring"
                                            style={{ backgroundColor: c }}
                                            onClick={() => setColor(c)}
                                        >
                                            {color === c && <Check className="h-5 w-5 text-white" />}
                                        </div>
                                    </SelectItem>
                                ))}
                            </div>
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="balance">{isEditing ? "Saldo Inicial (Não pode ser alterado)" : "Saldo Inicial (Opcional)"}</Label>
                    <Input id="balance" type="text" value={formatCurrency(balance)} onChange={handleBalanceChange} placeholder="R$ 0,00" disabled={isEditing} />
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
