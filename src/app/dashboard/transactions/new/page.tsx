
"use client";

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { getAccounts, getCategories, getCreditCards, addTransaction, updateTransaction, getTransactionById, addCategory } from '@/lib/firestore';
import type { Transaction, Account, Category, CreditCard as CreditCardType, Recurrence, RecurrencePeriod, RecurrenceEditScope, TransactionType } from '@/lib/types';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch }from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
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
import { cn } from '@/lib/utils';
import { ArrowLeft, AlignLeft, CircleDollarSign, CalendarIcon, CheckSquare, Shapes, Wallet, CreditCard, Repeat, Plus, Minus, ArrowRightLeft, PlusCircle, Check } from 'lucide-react';
import { startOfMonth } from 'date-fns';
import { BankIcon, CreditCardDisplayIcon, CategoryIcon } from '@/components/icons';

function CategoryForm({
    onSubmit,
    onSubmitted,
    category,
  }: {
    onSubmit: (category: Omit<Category, "id">, categoryId?: string) => Promise<void>;
    onSubmitted: () => void;
    category: Category | null;
  }) {
    const [name, setName] = useState("");
    const [type, setType] = useState<"income" | "expense">("expense");
    const [color, setColor] = useState('#F44336');
    const { toast } = useToast();

    const isEditing = !!category;
    
    const categoryColors = [
      '#F44336', '#E91E63', '#9C27B0', '#673AB7', '#3F51B5',
      '#2196F3', '#03A9F4', '#00BCD4', '#009688', '#4CAF50',
      '#8BC34A', '#CDDC39', '#FFEB3B', '#FFC107', '#FF9800',
      '#FF5722', '#795548', '#9E9E9E', '#607D8B'
    ];

    useEffect(() => {
        if (category) {
            setName(category.name);
            setType(category.type);
            setColor(category.color || categoryColors[0]);
        } else {
            setName("");
            setType("expense");
            setColor(categoryColors[Math.floor(Math.random() * categoryColors.length)]);
        }
    }, [category]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !type || !color) {
            toast({ title: "Por favor, preencha todos os campos", variant: 'destructive' });
            return;
        }

        await onSubmit({ name, type, icon: 'Box', color }, category?.id);

        onSubmitted();
    };

    return (
        <DialogContent>
            <DialogHeader>
                <DialogTitle>{isEditing ? 'Editar Categoria' : 'Adicionar Nova Categoria'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="name">Nome da Categoria</Label>
                    <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="ex: Lazer" />
                </div>
                 <div className="space-y-2">
                    <Label>Tipo</Label>
                    <RadioGroup value={type} onValueChange={(value) => setType(value as "income" | "expense")} className="flex gap-4">
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="expense" id="expense" />
                            <Label htmlFor="expense">Despesa</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="income" id="income" />
                            <Label htmlFor="income">Receita</Label>
                        </div>
                    </RadioGroup>
                </div>
                <div className="space-y-2">
                    <Label>Cor</Label>
                     <div className="flex flex-wrap gap-2">
                        {categoryColors.map((c) => (
                            <Button
                                key={c}
                                type="button"
                                variant="outline"
                                size="icon"
                                className="h-8 w-8 rounded-full"
                                style={{ backgroundColor: c }}
                                onClick={() => setColor(c)}
                            >
                                {color === c && <Check className="h-5 w-5 text-white" />}
                            </Button>
                        ))}
                    </div>
                </div>
                <DialogFooter>
                    <Button type="submit">{isEditing ? 'Salvar Alterações' : 'Adicionar Categoria'}</Button>
                </DialogFooter>
            </form>
        </DialogContent>
    );
  }

function RecurrenceDialog({
  open,
  onOpenChange,
  recurrence,
  isFixed,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recurrence: Recurrence;
  isFixed: boolean;
  onSave: (recurrence: Recurrence, isFixed: boolean) => void;
}) {
  const [tempRecurrence, setTempRecurrence] = useState<Recurrence>(recurrence);
  const [tempIsFixed, setTempIsFixed] = useState(isFixed);

  useEffect(() => {
    setTempRecurrence(recurrence);
    setTempIsFixed(isFixed);
  }, [recurrence, isFixed, open]);

  const handleSave = () => {
    onSave(tempRecurrence, tempIsFixed);
    onOpenChange(false);
  };
  
  const handleQuantityChange = (amount: number) => {
    setTempRecurrence(prev => ({ ...prev, quantity: Math.max(2, prev.quantity + amount)}));
  }
  
  const handleStartInstallmentChange = (amount: number) => {
    setTempRecurrence(prev => ({ ...prev, startInstallment: Math.max(1, prev.startInstallment + amount)}));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Configurar repetição</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="flex items-center justify-between">
              <Label htmlFor="fixed-monthly-switch" className='flex items-center gap-4 cursor-pointer'>
                  <Repeat className="h-5 w-5 text-muted-foreground" />
                  <span>Fixa Mensal</span>
              </Label>
              <Switch id="fixed-monthly-switch" checked={tempIsFixed} onCheckedChange={setTempIsFixed} />
          </div>

          <div className={cn("space-y-4", tempIsFixed && "opacity-50")}>
            <div className="flex items-center justify-between">
              <div className='flex items-center gap-4'>
                  <ArrowRightLeft className="h-5 w-5 text-muted-foreground" />
                  <Label>Parcela inicial</Label>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={() => handleStartInstallmentChange(-1)} disabled={tempIsFixed}><Minus className="h-4 w-4" /></Button>
                <span className="font-bold w-4 text-center">{tempRecurrence.startInstallment}</span>
                <Button variant="ghost" size="icon" onClick={() => handleStartInstallmentChange(1)} disabled={tempIsFixed}><Plus className="h-4 w-4" /></Button>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className='flex items-center gap-4'>
                  <PlusCircle className="h-5 w-5 text-muted-foreground" />
                  <Label>Quantidade</Label>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={() => handleQuantityChange(-1)} disabled={tempIsFixed}><Minus className="h-4 w-4" /></Button>
                <span className="font-bold w-4 text-center">{tempRecurrence.quantity}</span>
                <Button variant="ghost" size="icon" onClick={() => handleQuantityChange(1)} disabled={tempIsFixed}><Plus className="h-4 w-4" /></Button>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className='flex items-center gap-4'>
                  <CalendarIcon className="h-5 w-5 text-muted-foreground" />
                  <Label>Periodicidade</Label>
              </div>
              <Select 
                  value={tempRecurrence.period} 
                  onValueChange={(value: RecurrencePeriod) => setTempRecurrence(prev => ({ ...prev, period: value}))}
                  disabled={tempIsFixed}
              >
                  <SelectTrigger className="w-[120px] border-0 focus:ring-0">
                      <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                      <SelectItem value="diária">Diária</SelectItem>
                      <SelectItem value="semanal">Semanal</SelectItem>
                      <SelectItem value="mensal">Mensal</SelectItem>
                      <SelectItem value="anual">Anual</SelectItem>
                  </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave}>Concluído</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


function TransactionForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user } = useAuth();
    const { toast } = useToast();

    const transactionId = searchParams.get('id');
    const typeParam = searchParams.get('type') as TransactionType | null;
    const isCreditCardParam = searchParams.get('isCreditCard') === 'true' || typeParam === 'credit_card_reversal';
    const overrideDateParam = searchParams.get('overrideDate');


    const [description, setDescription] = useState("");
    const [amount, setAmount] = useState(0); // Store amount as a number (cents)
    const [date, setDate] = useState<Date | undefined>(overrideDateParam ? new Date(overrideDateParam) : new Date());
    const [type, setType] = useState<TransactionType | null>(typeParam);
    const [category, setCategory] = useState("");
    const [accountId, setAccountId] = useState<string | undefined>();
    const [creditCardId, setCreditCardId] = useState<string | undefined>();
    const [efetivado, setEfetivado] = useState(false);
    
    const [isRecurring, setIsRecurring] = useState(false);
    const [isFixed, setIsFixed] = useState(false);
    const [recurrence, setRecurrence] = useState<Recurrence>({ period: 'mensal', quantity: 2, startInstallment: 1 });
    const [originalTransaction, setOriginalTransaction] = useState<Transaction | null>(null);
    const [isRecurrenceDialogOpen, setIsRecurrenceDialogOpen] = useState(false);


    const [accounts, setAccounts] = useState<Account[]>([]);
    const [creditCards, setCreditCards] = useState<CreditCardType[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    
    const [isEditing, setIsEditing] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);
    const [showEditScopeDialog, setShowEditScopeDialog] = useState(false);
    const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);


    useEffect(() => {
        if (!user?.uid) return;
        
        const unsubs: (() => void)[] = [];
        unsubs.push(getAccounts(user.uid, setAccounts));
        unsubs.push(getCreditCards(user.uid, setCreditCards));
        unsubs.push(getCategories(user.uid, setCategories));

        if (transactionId) {
            setIsEditing(true);
            const idToFetch = transactionId.includes('-projected-') ? transactionId.split('-projected-')[0] : transactionId;
            getTransactionById(user.uid, idToFetch).then(t => {
                if (t) {
                    setOriginalTransaction(t);
                    setDescription(t.description);
                    setAmount(t.amount * 100);
                    if (overrideDateParam) {
                       const overrideDate = new Date(overrideDateParam);
                       const originalDay = t.date.getDate();
                       setDate(new Date(overrideDate.getFullYear(), overrideDate.getMonth(), originalDay));
                    } else {
                       setDate(t.date);
                    }
                    setType(t.type);
                    setCategory(t.category);
                    
                    if (transactionId.includes('-projected-')) {
                        setEfetivado(false);
                    } else {
                        setEfetivado(t.efetivado);
                    }
                    
                    setAccountId(t.accountId);
                    setCreditCardId(t.creditCardId);
                    setIsRecurring(t.isRecurring || false);
                    setIsFixed(t.isFixed || false);
                    if (t.recurrence) {
                        setRecurrence(t.recurrence);
                    }
                }
                setIsLoading(false);
            });
        } else {
            setEfetivado(false);
            setType(typeParam || 'expense');
            if (isCreditCardParam) {
                setCreditCardId("");
            }
            setIsLoading(false);
        }

        return () => unsubs.forEach(u => u());

    }, [user, transactionId, typeParam, isCreditCardParam, overrideDateParam]);

    const formatCurrency = (value: number) => {
        const amountInReais = value / 100;
        return amountInReais.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };

    const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const rawValue = e.target.value.replace(/\D/g, '');
        setAmount(Number(rawValue));
    };

    const handleAddCategory = async (categoryData: Omit<Category, "id">) => {
      if (user?.uid) {
        if (categories.some(c => c.name.toLowerCase() === categoryData.name.toLowerCase())) {
          toast({ title: "Categoria já existe", description: "Esta categoria já foi cadastrada.", variant: "destructive" });
          return;
        }
        await addCategory(user.uid, categoryData);
        toast({ title: "Categoria adicionada!", variant: "success" });
        setCategory(categoryData.name);
      }
    };
    

    const handleSubmit = async (scope?: RecurrenceEditScope) => {
        setIsSaving(true);
        setShowEditScopeDialog(false);
    
        if (!user?.uid || !date || !type) {
            toast({ title: "Erro de sistema. Tente novamente.", variant: 'destructive' });
            setIsSaving(false);
            return;
        }

        if (!category) {
            toast({ title: "Por favor, selecione uma categoria.", variant: 'destructive' });
            setIsSaving(false);
            return;
        }

        if (!accountId && !creditCardId) {
            toast({ title: "Por favor, selecione uma conta ou cartão de crédito.", variant: 'destructive' });
            setIsSaving(false);
            return;
        }
    
        const finalAmount = amount / 100;
        if (isNaN(finalAmount) || finalAmount <= 0) {
            toast({ title: "O valor da transação é inválido.", variant: 'destructive' });
            setIsSaving(false);
            return;
        }
    
        const finalDescription = description.trim() === "" ? category : description;
    
        const transactionData: Omit<Transaction, "id"> = {
            description: finalDescription,
            amount: finalAmount,
            date,
            type,
            category,
            efetivado,
            isBudget: false,
            isRecurring: isRecurring && !isFixed,
            isFixed: isFixed,
        };
    
        if (transactionData.isRecurring) {
            transactionData.recurrence = recurrence;
        }
    
        if (creditCardId) {
            transactionData.creditCardId = creditCardId;
        } else if (accountId) {
            transactionData.accountId = accountId;
        }
    
        try {
            if (isEditing && transactionId) {
                let dataToUpdate: Partial<Transaction> = { ...transactionData };
                
                if (scope === 'all' && originalTransaction?.isFixed) {
                   delete dataToUpdate.date;
                }
                await updateTransaction(user.uid, transactionId, dataToUpdate, scope, originalTransaction);
                toast({ title: "Transação atualizada!", variant: "success" });
            } else {
                await addTransaction(user.uid, transactionData);
                toast({ title: "Transação adicionada!", variant: "success" });
            }
            router.back();
        } catch (error) {
            console.error(error);
            toast({ title: "Erro ao salvar transação", variant: 'destructive' });
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleSaveClick = (e: React.FormEvent) => {
        e.preventDefault();
        if (isEditing && (originalTransaction?.isRecurring || originalTransaction?.isFixed)) {
            setShowEditScopeDialog(true);
        } else {
            handleSubmit();
        }
    };

    const handleSaveRecurrence = (newRecurrence: Recurrence, newIsFixed: boolean) => {
        setIsFixed(newIsFixed);
        if (newIsFixed) {
            setIsRecurring(false);
        } else {
            setRecurrence(newRecurrence);
            setIsRecurring(true);
        }
    };
    
    const getSelectedAccount = () => {
        if(creditCardId) {
            const card = creditCards.find(c => c.id === creditCardId);
            return { name: card?.name, color: card?.color, isCard: true };
        }
        if(accountId) {
            const account = accounts.find(a => a.id === accountId);
             return { name: account?.name, color: account?.color, isCard: false };
        }
        return null;
    }
    
    const selectedCategoryData = categories.find(c => c.name === category);

    if (isLoading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-background">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
        );
    }
    
    const pageTitle = isEditing
        ? "Editar Transação"
        : type === 'credit_card_reversal'
            ? "Novo Estorno Cartão"
            : isCreditCardParam
                ? "Nova Despesa Cartão"
                : type === 'income'
                    ? "Nova Receita"
                    : "Nova Despesa";

    const saveButtonColor = type === 'income' || type === 'credit_card_reversal'
        ? "bg-green-500 hover:bg-green-600 text-white"
        : "bg-red-500 hover:bg-red-600 text-white";
        
    const recurrenceText = isFixed
        ? "Fixa Mensal"
        : isRecurring
        ? `${recurrence.period.charAt(0).toUpperCase() + recurrence.period.slice(1)}, ${recurrence.quantity} parcelas`
        : "Não recorrente";

    return (
        <div className="flex flex-col h-screen bg-background">
            <header className="sticky top-0 z-10 flex items-center justify-between p-4 border-b bg-background">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-6 w-6" />
                </Button>
                <h1 className="text-lg font-semibold">{pageTitle}</h1>
                <Button onClick={handleSaveClick} className={cn(saveButtonColor)} disabled={isSaving}>
                    {isSaving ? "Salvando..." : "Salvar"}
                </Button>
            </header>

            <main className="flex-1 overflow-y-auto p-4 space-y-2">
                 <div className="flex items-center gap-4 p-3 rounded-lg border">
                    <AlignLeft className="h-5 w-5 text-muted-foreground" />
                    <Input
                        placeholder="Descrição (se vazio, usa categoria)"
                        className="border-0 focus-visible:ring-0 text-base p-0"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        disabled={isEditing && !!originalTransaction?.isRecurring}
                    />
                </div>
                
                <div className="flex items-center gap-4 p-3 rounded-lg border">
                    <CircleDollarSign className="h-5 w-5 text-muted-foreground" />
                    <Input
                        type="text"
                        placeholder="R$ 0,00"
                        className="border-0 focus-visible:ring-0 text-base p-0"
                        value={formatCurrency(amount)}
                        onChange={handleAmountChange}
                    />
                </div>
                
                <Button variant="outline" className="w-full justify-start font-normal h-auto p-3 border" onClick={() => setIsRecurrenceDialogOpen(true)} disabled={isEditing}>
                    <div className="flex items-center justify-between w-full">
                        <div className='flex items-center gap-4'>
                            <Repeat className="h-5 w-5 text-muted-foreground" />
                            <span>Repetir</span>
                        </div>
                        <span className="text-muted-foreground">{recurrenceText}</span>
                    </div>
                </Button>
                 {(isRecurring || isFixed) && !isEditing && (
                    <div className="flex items-center justify-between gap-4 p-3 rounded-lg border -mt-1">
                        <div className="flex items-center gap-4">
                            <Label htmlFor="is-recurring-switch">Desativar repetição</Label>
                        </div>
                        <Switch id="is-recurring-switch" checked={!isRecurring && !isFixed} onCheckedChange={(checked) => {
                            setIsRecurring(!checked);
                            setIsFixed(!checked);
                        }} />
                    </div>
                 )}


                <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                    <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start font-normal h-auto p-3 border" disabled={isEditing && !!originalTransaction?.isRecurring}>
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
                
                 <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
                    <div className="flex items-center gap-2 p-1 rounded-lg border">
                        <div className="p-2 rounded-full bg-muted">
                           <Shapes className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <Select onValueChange={setCategory} value={category}>
                            <SelectTrigger className="border-0 focus:ring-0 w-full">
                               <SelectValue placeholder="Selecione a categoria">
                                    {selectedCategoryData ? (
                                        <div className="flex items-center gap-3">
                                            <div style={{ backgroundColor: selectedCategoryData.color }} className={'p-1.5 rounded-full text-white'}>
                                                <CategoryIcon icon={selectedCategoryData.icon} className="h-4 w-4" />
                                            </div>
                                            <span>{selectedCategoryData.name}</span>
                                        </div>
                                    ) : "Selecione a categoria"}
                                </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                                {categories.filter(c => c.type === (type === 'credit_card_reversal' ? 'income' : type)).map(cat => (
                                    <SelectItem key={cat.id} value={cat.name}>
                                        <div className="flex items-center gap-3">
                                             <div style={{ backgroundColor: cat.color }} className={'p-1.5 rounded-full text-white'}>
                                                <CategoryIcon icon={cat.icon} className="h-4 w-4" />
                                            </div>
                                            <span>{cat.name}</span>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <DialogTrigger asChild>
                             <Button variant="ghost" size="icon"><Plus className="h-5 w-5" /></Button>
                        </DialogTrigger>
                    </div>
                     <CategoryForm
                        onSubmit={handleAddCategory}
                        onSubmitted={() => setCategoryDialogOpen(false)}
                        category={null}
                    />
                </Dialog>

                 { type === 'expense' || type === 'credit_card_reversal' ? (
                    <div className="flex items-center gap-2 p-1 rounded-lg border">
                         <div className="p-2 rounded-full bg-muted">
                            {creditCardId !== undefined || isCreditCardParam ? 
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
                                <SelectValue placeholder={isCreditCardParam ? "Selecione o cartão" : "Selecione a conta"}>
                                    {(() => {
                                        const selected = getSelectedAccount();
                                        if(selected?.name) {
                                            return (
                                                <div className="flex items-center gap-2">
                                                    {selected.isCard ? <CreditCardDisplayIcon color={selected.color} /> : <BankIcon name={selected.name || ''} color={selected.color} />}
                                                    <span>{selected.name}</span>
                                                </div>
                                            )
                                        }
                                        return isCreditCardParam ? "Selecione o cartão" : "Selecione a conta";
                                    })()}
                                </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                                {type === 'expense' && !isCreditCardParam && accounts.map(acc => (
                                    <SelectItem key={acc.id} value={`acc-${acc.id}`}>
                                        <div className="flex items-center gap-2">
                                            <BankIcon name={acc.name} color={acc.color} />
                                            <span>{acc.name}</span>
                                        </div>
                                    </SelectItem>
                                ))}
                                {(type === 'expense' && isCreditCardParam || type === 'credit_card_reversal') && creditCards.map(cc => (
                                    <SelectItem key={cc.id} value={`cc-${cc.id}`}>
                                        <div className="flex items-center gap-2">
                                            <CreditCardDisplayIcon color={cc.color} />
                                            <span>{cc.name}</span>
                                        </div>
                                    </SelectItem>
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
                                <SelectValue placeholder="Selecione a conta">
                                     {(() => {
                                        const selected = getSelectedAccount();
                                        if(selected?.name) {
                                            return (
                                                <div className="flex items-center gap-2">
                                                    <BankIcon name={selected.name || ''} color={selected.color} />
                                                    <span>{selected.name}</span>
                                                </div>
                                            )
                                        }
                                        return "Selecione a conta";
                                    })()}
                                </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                                {accounts.map(acc => (
                                    <SelectItem key={acc.id} value={acc.id}>
                                         <div className="flex items-center gap-2">
                                            <BankIcon name={acc.name} color={acc.color} />
                                            <span>{acc.name}</span>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                 )
                }
            </main>
             <RecurrenceDialog
                open={isRecurrenceDialogOpen}
                onOpenChange={setIsRecurrenceDialogOpen}
                recurrence={recurrence}
                isFixed={isFixed}
                onSave={handleSaveRecurrence}
            />
            {showEditScopeDialog && (
              <AlertDialog open={showEditScopeDialog} onOpenChange={setShowEditScopeDialog}>
                  <AlertDialogContent style={{ maxWidth: 'fit-content' }}>
                      <AlertDialogHeader>
                          <AlertDialogTitle>Editar Transação</AlertDialogTitle>
                          <AlertDialogDescription>
                              Você está editando uma transação recorrente/fixa. Como deseja aplicar as alterações?
                          </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter className="flex-col gap-2 sm:flex-col sm:gap-2">
                           <AlertDialogAction onClick={() => handleSubmit("single")}>Salvar somente esta transação</AlertDialogAction>
                           <AlertDialogAction className={cn(buttonVariants({ variant: "destructive" }))} onClick={() => handleSubmit("future")}>Salvar esta e as futuras</AlertDialogAction>
                           <AlertDialogAction className={cn(buttonVariants({ variant: "destructive" }))} onClick={() => handleSubmit("all")}>Salvar todas as transações</AlertDialogAction>
                           <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      </AlertDialogFooter>
                  </AlertDialogContent>
              </AlertDialog>
            )}
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

    
    