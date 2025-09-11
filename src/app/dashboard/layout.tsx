
"use client";

import { useState, useEffect, createContext } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  LayoutDashboard,
  ArrowRightLeft,
  Wallet,
  AreaChart,
  PiggyBank,
  PanelLeft,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Plus,
  LogOut,
  Menu,
  Target,
  CreditCard,
  Shapes,
  ArrowUpDown,
  Minus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogTrigger
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
import { cn } from "@/lib/utils";
import { CategoryIcon, BankIcon } from "@/components/icons";
import { ThemeToggleButton } from "@/components/theme-toggle-button";
import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DateProvider, useDate } from "@/hooks/use-date";
import { TransactionDialogProvider, useTransactionDialog } from "@/hooks/use-transaction-dialog";
import { useToast } from "@/hooks/use-toast";
import type { Transaction, Account, Category, CreditCard as CreditCardType } from "@/lib/types";
import { getAccounts, getCategories, getCreditCards, getTransactions, addTransaction, updateTransaction } from "@/lib/firestore";

const navItems = [
  { href: "/dashboard", label: "Painel", icon: LayoutDashboard },
  { href: "/dashboard/accounts", label: "Contas", icon: Wallet },
  { href: "/dashboard/credit-cards", label: "Cartões de Crédito", icon: CreditCard },
  { href: "/dashboard/transactions", label: "Transações", icon: ArrowRightLeft },
  { href: "/dashboard/categories", label: "Categorias", icon: Shapes },
  { href: "/dashboard/budgets", label: "Orçamentos", icon: Target },
  { href: "/dashboard/savings", label: "Metas", icon: PiggyBank },
  { href: "/dashboard/reports", label: "Relatórios", icon: AreaChart },
];

function SidebarContent({ onLinkClick }: { onLinkClick: () => void }) {
    const pathname = usePathname();
    const { user, logout } = useAuth();
    const router = useRouter();

    const handleLogout = async () => {
        await logout();
        router.push('/login');
    };

    return (
        <div className="flex flex-col h-full bg-background text-foreground">
            <div className="flex h-[60px] items-center border-b border-border px-6 justify-between">
                <Link href="/dashboard" className="flex items-center gap-2 font-semibold" onClick={onLinkClick}>
                    <Image src="/icone/iconeTransp.png" width={41} height={41} alt="Granor Logo" />
                    <span className="">Granor</span>
                </Link>
                <ThemeToggleButton />
            </div>
            <div className="flex-1 overflow-auto py-2">
                <nav className="grid items-start gap-2 px-4 text-sm font-medium">
                    {navItems.map((item) => (
                    <Link
                        key={item.href}
                        href={item.href}
                        onClick={onLinkClick}
                        className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
                        pathname === item.href && "bg-muted text-primary"
                        )}
                    >
                        <item.icon className="h-4 w-4" />
                        {item.label}
                    </Link>
                    ))}
                </nav>
            </div>
             {user && (
                <div className="mt-auto border-t border-border p-4">
                    <div className="flex items-center gap-2">
                        <Avatar className="h-9 w-9">
                            <AvatarImage src={user.photoURL || undefined} alt="Avatar" />
                            <AvatarFallback>{user.displayName?.[0] || user.email?.[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                            <span className="font-medium text-sm truncate">{user.displayName || user.email}</span>
                             <Button variant="ghost" size="sm" onClick={handleLogout} className="justify-start p-0 h-auto text-muted-foreground hover:text-primary">
                                <LogOut className="mr-2 h-4 w-4" />
                                Sair
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function Header() {
    const { selectedDate, goToNextMonth, goToPreviousMonth } = useDate();
    const [formattedDate, setFormattedDate] = useState('');

    useEffect(() => {
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const selectedYear = selectedDate.getFullYear();

        let dateString;

        if (currentYear === selectedYear) {
            dateString = new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(selectedDate);
        } else {
            const month = new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(selectedDate).replace('.', '');
            const year = selectedDate.getFullYear().toString().slice(-2);
            dateString = `${month.charAt(0).toUpperCase() + month.slice(1)}/${year}`;
        }

        setFormattedDate(dateString.replace(/^\w/, (c) => c.toUpperCase()));
    }, [selectedDate]);


    return (
        <div className="flex w-full items-center justify-center gap-2">
            <Button variant="ghost" size="icon" className="hover:bg-gray-700" onClick={goToPreviousMonth}>
                <ChevronLeft className="h-5 w-5" />
            </Button>
            <span className="text-lg font-semibold w-32 text-center">{formattedDate}</span>
            <Button variant="ghost" size="icon" className="hover:bg-gray-700" onClick={goToNextMonth}>
                <ChevronRight className="h-5 w-5" />
            </Button>
        </div>
    );
}

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const pathname = usePathname();
    const { openDialog } = useTransactionDialog();

    useEffect(() => {
        setIsLoading(true);
        const timer = setTimeout(() => {
            setIsLoading(false);
        }, 300); // Small delay to allow the new page to start its own loading
        return () => clearTimeout(timer);
    }, [pathname]);

    const handleLinkClick = () => {
        setMobileMenuOpen(false);
    }

    return (
        <div className="flex min-h-screen w-full flex-col bg-background">
            <aside className="fixed inset-y-0 left-0 z-10 hidden w-60 flex-col border-r border-border bg-background sm:flex">
                <SidebarContent onLinkClick={() => { }} />
            </aside>
            <div className="flex flex-col sm:pl-60">
                <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b border-border bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
                    <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                        <SheetTrigger asChild>
                            <Button size="icon" variant="outline" className="sm:hidden bg-transparent border-0 hover:bg-gray-700">
                                <Menu className="h-5 w-5" />
                                <span className="sr-only">Alternar Menu</span>
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="left" className="p-0 bg-background border-r-border">
                            <SheetHeader>
                                <SheetTitle className="sr-only">Menu de Navegação</SheetTitle>
                            </SheetHeader>
                            <SidebarContent onLinkClick={handleLinkClick} />
                        </SheetContent>
                    </Sheet>

                    <Header />

                    <Button variant="ghost" size="icon" className="hover:bg-gray-700">
                        <MoreVertical className="h-5 w-5" />
                    </Button>
                </header>
                <main className="flex-1 p-4 sm:p-6 pb-24">
                    <TransactionDialog />
                    {isLoading ? (
                        <div className="flex h-[calc(100vh-8rem)] w-full items-center justify-center">
                            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                        </div>
                    ) : (
                        children
                    )}
                </main>
                <div className="fixed bottom-6 right-6 z-40">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button className="rounded-full h-14 w-14 shadow-lg bg-primary hover:bg-primary/90">
                                <Plus className="h-7 w-7" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-56 mb-2" side="top" align="end">
                            <DropdownMenuItem disabled>
                                <div className="bg-yellow-500/20 p-2 rounded-full mr-3">
                                    <ArrowUpDown className="h-5 w-5 text-yellow-500" />
                                </div>
                                <span>Transferência</span>
                            </DropdownMenuItem>
                             <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => openDialog({ type: 'income' })}>
                                <div className="bg-green-500/20 p-2 rounded-full mr-3">
                                    <Plus className="h-5 w-5 text-green-500" />
                                </div>
                                <span>Receita</span>
                            </DropdownMenuItem>
                             <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => openDialog({ type: 'expense' })}>
                                 <div className="bg-red-500/20 p-2 rounded-full mr-3">
                                    <Minus className="h-5 w-5 text-red-500" />
                                </div>
                                <span>Despesa</span>
                            </DropdownMenuItem>
                             <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => openDialog({ type: 'expense', isCreditCard: true })}>
                                <div className="bg-blue-500/20 p-2 rounded-full mr-3">
                                    <CreditCard className="h-5 w-5 text-blue-500" />
                                </div>
                                <span>Despesa cartão</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
        </div>
    );
}

function TransactionDialog() {
    const { isOpen, closeDialog, initialData } = useTransactionDialog();
    const { user } = useAuth();
    const { toast } = useToast();
    const { selectedDate, getMonthDateRange } = useDate();
    
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [creditCards, setCreditCards] = useState<CreditCardType[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);

    useEffect(() => {
        if (!user?.uid) return;
        const unsubAccounts = getAccounts(user.uid, setAccounts);
        const unsubCreditCards = getCreditCards(user.uid, setCreditCards);
        const unsubCategories = getCategories(user.uid, setCategories);

        return () => {
            unsubAccounts();
            unsubCreditCards();
            unsubCategories();
        };
    }, [user]);

    const handleFormSubmit = async (transaction: Omit<Transaction, "id">, transactionId?: string) => {
        if (!user?.uid) return;
        
        if (transactionId) {
            await updateTransaction(user.uid, transactionId, transaction);
            toast({ title: "Transação atualizada!" });
        } else {
            await addTransaction(user.uid, transaction);
            toast({ title: "Transação adicionada!" });
        }
    };

    if (!isOpen) return null;
    
    return (
        <Dialog open={isOpen} onOpenChange={closeDialog}>
             <TransactionForm 
                onSubmit={handleFormSubmit} 
                onSubmitted={closeDialog} 
                accounts={accounts}
                creditCards={creditCards}
                categories={categories}
                initialData={initialData}
            />
        </Dialog>
    );
}

function TransactionForm({
    onSubmit,
    onSubmitted,
    accounts,
    creditCards,
    categories,
    initialData,
}: {
    onSubmit: (transaction: Omit<Transaction, "id">, transactionId?: string) => Promise<void>;
    onSubmitted: () => void;
    accounts: Account[];
    creditCards: CreditCardType[];
    categories: Category[];
    initialData: { type?: 'income' | 'expense'; isCreditCard?: boolean, transaction?: Transaction };
}) {
    const [description, setDescription] = useState("");
    const [amount, setAmount] = useState("");
    const [date, setDate] = useState<Date | undefined>(new Date());
    const [type, setType] = useState<"income" | "expense">("expense");
    const [category, setCategory] = useState<string>("");
    const [source, setSource] = useState<"account" | "creditCard">("account");
    const [sourceId, setSourceId] = useState<string>("");
    const [efetivado, setEfetivado] = useState(true);
    const { toast } = useToast();
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);

    const isEditing = !!initialData?.transaction;

    useEffect(() => {
        if (isEditing && initialData.transaction) {
            const t = initialData.transaction;
            setDescription(t.description);
            setAmount(String(t.amount));
            setDate(t.date);
            setType(t.type);
            setCategory(t.category);
            setEfetivado(t.efetivado);
            if(t.accountId) {
                setSource("account");
                setSourceId(t.accountId);
            } else if (t.creditCardId) {
                setSource("creditCard");
                setSourceId(t.creditCardId);
            }
        } else {
            if (initialData.type) setType(initialData.type);
            if (initialData.isCreditCard) setSource("creditCard");
        }
    }, [initialData, isEditing]);

    useEffect(() => {
        // Reset sourceId when source type changes, unless we are editing
        if(!isEditing) setSourceId("");
    }, [source, isEditing]);

    useEffect(() => {
      // If income is selected, force source to be account
      if (type === 'income') {
        setSource('account');
      }
    }, [type]);


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!description || !amount || !date || !category || !sourceId) {
            toast({ title: "Por favor, preencha todos os campos", variant: 'destructive' });
            return;
        }

        const transactionData: Omit<Transaction, "id"> = {
            description,
            amount: parseFloat(amount),
            date,
            type,
            category,
            efetivado,
            ...(source === 'account' ? { accountId: sourceId } : {}),
            ...(source === 'creditCard' ? { creditCardId: sourceId } : {}),
        };

        await onSubmit(transactionData, initialData.transaction?.id);
        onSubmitted();
    };
    
    const handleTypeChange = (value: "income" | "expense") => {
        setType(value);
        setCategory(""); // Reset category when type changes
    }

    return (
        <DialogContent onInteractOutside={(e) => { if(isCalendarOpen) e.preventDefault() }}>
            <DialogHeader>
                <DialogTitle>{isEditing ? "Editar Transação" : "Adicionar Nova Transação"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                    <Label>Fonte da Transação</Label>
                    <RadioGroup value={source} onValueChange={(value) => setSource(value as "account" | "creditCard")} className="flex gap-4">
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="account" id="account" />
                            <Label htmlFor="account">Conta</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="creditCard" id="creditCard" disabled={type === 'income'}/>
                            <Label htmlFor="creditCard">Cartão de Crédito</Label>
                        </div>
                    </RadioGroup>
                </div>
                
                <div className="space-y-2">
                    <Label htmlFor="sourceId">
                      {source === 'account' ? 'Conta' : 'Cartão de Crédito'}
                    </Label>
                    <Select onValueChange={setSourceId} value={sourceId}>
                        <SelectTrigger id="sourceId">
                             <SelectValue placeholder={`Selecione ${source === 'account' ? 'a conta' : 'o cartão'}`} />
                        </SelectTrigger>
                        <SelectContent>
                            {source === 'account' ? 
                              accounts.map(acc => (
                                <SelectItem key={acc.id} value={acc.id}>
                                    <div className="flex items-center gap-3">
                                        <div className={cn(acc.ignoreInTotals && "opacity-50")}>
                                            <BankIcon name={acc.name} />
                                        </div>
                                        <span className={cn(acc.ignoreInTotals && "text-muted-foreground")}>{acc.name}</span>
                                    </div>
                                </SelectItem>
                              )) :
                              creditCards.map(card => (
                                <SelectItem key={card.id} value={card.id}>{card.name}</SelectItem>
                              ))
                            }
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="description">Descrição</Label>
                    <Input id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="ex: Café com amigos" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="amount">Valor</Label>
                        <Input id="amount" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0,00" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="date">Data</Label>
                        <Dialog open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                            <DialogTrigger asChild>
                                <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}>
                                    {date ? date.toLocaleDateString('pt-BR') : <span>Escolha uma data</span>}
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="w-auto">
                                <DialogHeader>
                                    <DialogTitle className="sr-only">Selecione uma data</DialogTitle>
                                </DialogHeader>
                                <Calendar mode="single" selected={date} onSelect={(newDate) => { setDate(newDate); setIsCalendarOpen(false); }} initialFocus />
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="type">Tipo</Label>
                        <Select onValueChange={handleTypeChange} value={type}>
                            <SelectTrigger id="type">
                                <SelectValue placeholder="Selecione o tipo" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="expense">Despesa</SelectItem>
                                <SelectItem value="income">Receita</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="category">Categoria</Label>
                        <Select onValueChange={(value: string) => setCategory(value)} value={category}>
                            <SelectTrigger id="category">
                                <SelectValue placeholder="Selecione a categoria" />
                            </SelectTrigger>
                            <SelectContent>
                                {categories.filter(c => c.type === type).map(cat => (
                                    <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                 <div className="flex items-center space-x-2">
                    <Switch id="efetivado" checked={efetivado} onCheckedChange={setEfetivado} />
                    <Label htmlFor="efetivado">Efetivado</Label>
                </div>
                <DialogFooter>
                    <Button type="submit">{isEditing ? "Salvar Alterações" : "Adicionar"}</Button>
                </DialogFooter>
            </form>
        </DialogContent>
    );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    return (
        <DateProvider>
            <TransactionDialogProvider>
                <DashboardLayoutContent>{children}</DashboardLayoutContent>
            </TransactionDialogProvider>
        </DateProvider>
    );
}
