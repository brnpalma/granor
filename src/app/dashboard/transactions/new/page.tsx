"use client";

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { getAccounts, getCategories, getCreditCards, addTransaction, updateTransaction, getTransactionById } from '@/lib/firestore';
import type { Transaction, Account, Category, CreditCard as CreditCardType } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch }from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { ArrowLeft, AlignLeft, CircleDollarSign, CalendarIcon, CheckSquare, Shapes, Wallet, CreditCard, Repeat, Tags, ArrowRight, Plus } from 'lucide-react';

function TransactionForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user } = useAuth();
    const { toast } = useToast();

    const transactionId = searchParams.get('id');
    const typeParam = searchParams.get('type') as 'income' | 'expense' | null;
    const isCreditCardParam = searchParams.get('isCreditCard') === 'true';

    const [description, setDescription] = useState("");
    const [amount, setAmount] = useState("");
    const [date, setDate] = useState<Date | undefined>(new Date());
    const [type, setType] = useState<'income' | 'expense' | null>(typeParam);
    const [category, setCategory] = useState("");
    const [accountId, setAccountId] = useState<string | undefined>();
    const [creditCardId, setCreditCardId] = useState<string | undefined>();
    const [efetivado, setEfetivado] = useState(true);

    const [accounts, setAccounts] = useState<Account[]>([]);
    const [creditCards, setCreditCards] = useState<CreditCardType[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    
    const [isEditing, setIsEditing] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);


    useEffect(() => {
        if (!user?.uid) return;
        
        const unsubs: (() => void)[] = [];
        unsubs.push(getAccounts(user.uid, setAccounts));
        unsubs.push(getCreditCards(user.uid, setCreditCards));
        unsubs.push(getCategories(user.uid, setCategories));

        if (transactionId) {
            setIsEditing(true);
            getTransactionById(user.uid, transactionId).then(t => {
                if (t) {
                    setDescription(t.description);
                    setAmount(String(t.amount));
                    setDate(t.date);
                    setType(t.type);
                    setCategory(t.category);
                    setEfetivado(t.efetivado);
                    setAccountId(t.accountId);
                    setCreditCardId(t.creditCardId);
                }
                setIsLoading(false);
            });
        } else {
            setType(typeParam || 'expense');
            if (isCreditCardParam) {
                setCreditCardId("");
            }
            setIsLoading(false);
        }

        return () => unsubs.forEach(u => u());

    }, [user, transactionId, typeParam, isCreditCardParam]);
    

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);

        const parsedAmount = parseFloat(amount);
        if (!user?.uid || !description || isNaN(parsedAmount) || parsedAmount <= 0 || !date || !type || !category || (!accountId && !creditCardId)) {
            toast({ title: "Por favor, preencha todos os campos obrigatórios", variant: 'destructive' });
            setIsSaving(false);
            return;
        }

        const transactionData: Omit<Transaction, "id"> = {
            description,
            amount: parsedAmount,
            date,
            type,
            category,
            efetivado,
            isBudget: false,
        };

        if (creditCardId) {
            transactionData.creditCardId = creditCardId;
        } else if (accountId) {
            transactionData.accountId = accountId;
        }


        try {
            if (isEditing && transactionId) {
                await updateTransaction(user.uid, transactionId, transactionData);
                toast({ title: "Transação atualizada!" });
            } else {
                await addTransaction(user.uid, transactionData);
                toast({ title: "Transação adicionada!" });
            }
            router.back();
        } catch (error) {
            console.error(error);
            toast({ title: "Erro ao salvar transação", variant: 'destructive' });
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-background">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
        );
    }
    
    const pageTitle = isEditing 
        ? "Editar Transação" 
        : type === 'income' 
            ? "Nova Receita" 
            : "Nova Despesa";

    const saveButtonColor = type === 'income'
        ? "bg-green-500 hover:bg-green-600 text-white"
        : "bg-red-500 hover:bg-red-600 text-white";

    return (
        <div className="flex flex-col h-screen bg-background">
            <header className="sticky top-0 z-10 flex items-center justify-between p-4 border-b bg-background">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-6 w-6" />
                </Button>
                <h1 className="text-lg font-semibold">{pageTitle}</h1>
                <div className="flex items-center gap-2">
                    <Button onClick={handleSubmit} className={cn(saveButtonColor)} disabled={isSaving}>
                        {isSaving ? "Salvando..." : "Salvar"}
                    </Button>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto p-4 space-y-2">
                 <div className="flex items-center gap-4 p-3 rounded-lg border">
                    <AlignLeft className="h-5 w-5 text-muted-foreground" />
                    <Input
                        placeholder="Descrição"
                        className="border-0 focus-visible:ring-0 text-base p-0"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                    />
                </div>
                
                <div className="flex items-center gap-4 p-3 rounded-lg border">
                    <CircleDollarSign className="h-5 w-5 text-muted-foreground" />
                    <Input
                        type="number"
                        placeholder="R$ 0,00"
                        className="border-0 focus-visible:ring-0 text-base p-0"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                    />
                </div>
                
                 <div className="flex items-center justify-between gap-4 p-3 rounded-lg border">
                    <div className="flex items-center gap-4">
                        <Repeat className="h-5 w-5 text-muted-foreground" />
                        <span>Não recorrente</span>
                    </div>
                </div>

                <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                    <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start font-normal h-auto p-3 border">
                            <div className="flex items-center justify-between w-full">
                                <div className='flex items-center gap-4'>
                                    <CalendarIcon className="h-5 w-5 text-muted-foreground" />
                                    <span>Data vencimento</span>
                                </div>
                                <span className="text-muted-foreground">{date ? date.toLocaleDateString('pt-BR') : 'Selecione'}</span>
                            </div>
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                        <Calendar
                            mode="single"
                            selected={date}
                            onSelect={(newDate) => {
                                setDate(newDate);
                                setIsCalendarOpen(false);
                            }}
                            initialFocus
                            fixedWeeks
                        />
                    </PopoverContent>
                </Popover>

                <div className="flex items-center justify-between gap-4 p-3 rounded-lg border">
                    <div className="flex items-center gap-4">
                        <CheckSquare className="h-5 w-5 text-muted-foreground" />
                        <Label htmlFor="efetivado">Efetivada</Label>
                    </div>
                    <Switch id="efetivado" checked={efetivado} onCheckedChange={setEfetivado} />
                </div>
                
                {/* Category */}
                <div className="pt-4 space-y-1">
                    <Label className="px-3 text-sm text-muted-foreground">Categoria</Label>
                    <div className="flex items-center gap-2 p-1 rounded-lg border">
                        <div className="p-2 rounded-full bg-muted">
                           <Shapes className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <Select onValueChange={setCategory} value={category}>
                            <SelectTrigger className="border-0 focus:ring-0 w-full">
                                <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent>
                                {categories.filter(c => c.type === type).map(cat => (
                                    <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Button variant="ghost" size="icon"><Plus className="h-5 w-5" /></Button>
                    </div>
                </div>

                 {/* Account or Credit Card */}
                <div className="pt-4 space-y-1">
                    <Label className="px-3 text-sm text-muted-foreground">Conta</Label>
                     { type === 'expense' ? (
                        <div className="flex items-center gap-2 p-1 rounded-lg border">
                             <div className="p-2 rounded-full bg-muted">
                                {creditCardId !== undefined ? 
                                    <CreditCard className="h-5 w-5 text-muted-foreground" /> :
                                    <Wallet className="h-5 w-5 text-muted-foreground" />
                                }
                            </div>
                            <Select 
                                onValueChange={(val) => {
                                    if (val.startsWith('acc-')) {
                                        setAccountId(val.replace('acc-', ''));
                                        setCreditCardId(undefined);
                                    } else {
                                        setCreditCardId(val.replace('cc-', ''));
                                        setAccountId(undefined);
                                    }
                                }} 
                                value={creditCardId ? `cc-${creditCardId}` : accountId ? `acc-${accountId}` : ''}
                            >
                                <SelectTrigger className="border-0 focus:ring-0 w-full">
                                    <SelectValue placeholder="Selecione a fonte" />
                                </SelectTrigger>
                                <SelectContent>
                                    {accounts.map(acc => (
                                        <SelectItem key={acc.id} value={`acc-${acc.id}`}>{acc.name}</SelectItem>
                                    ))}
                                    {creditCards.map(cc => (
                                        <SelectItem key={cc.id} value={`cc-${cc.id}`}>{cc.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                     ) : (
                         <div className="flex items-center gap-2 p-1 rounded-lg border">
                             <div className="p-2 rounded-full bg-muted">
                                <Wallet className="h-5 w-5 text-muted-foreground" />
                            </div>
                            <Select onValueChange={setAccountId} value={accountId}>
                                <SelectTrigger className="border-0 focus:ring-0 w-full">
                                    <SelectValue placeholder="Selecione a conta" />
                                </SelectTrigger>
                                <SelectContent>
                                    {accounts.map(acc => (
                                        <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                     )
                    }
                </div>

                <div className="flex items-center justify-between gap-4 p-3 rounded-lg border">
                    <div className="flex items-center gap-4">
                        <Tags className="h-5 w-5 text-muted-foreground" />
                        <span>Tags</span>
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground" />
                </div>
                 <div className="flex items-center justify-between gap-4 p-3 rounded-lg border">
                    <div className="flex items-center gap-4">
                        <Repeat className="h-5 w-5 text-muted-foreground" />
                        <Label htmlFor="save-continue">Salvar e continuar</Label>
                    </div>
                    <Switch id="save-continue" />
                </div>

            </main>
        </div>
    );
}


export default function NewTransactionPage() {
    return (
        <Suspense fallback={<div>Carregando...</div>}>
            <TransactionForm />
        </Suspense>
    )
}

    