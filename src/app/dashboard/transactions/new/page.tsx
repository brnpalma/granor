
"use client";

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { getAccounts, getCategories, getCreditCards, addTransaction, updateTransaction, getTransactionById } from '@/lib/firestore';
import type { Transaction, Account, Category, CreditCard as CreditCardType, Recurrence, RecurrencePeriod, RecurrenceEditScope } from '@/lib/types';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch }from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
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
import { ArrowLeft, AlignLeft, CircleDollarSign, CalendarIcon, CheckSquare, Shapes, Wallet, CreditCard, Repeat, Plus, Minus, ArrowRightLeft, PlusCircle } from 'lucide-react';

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
                    setOriginalTransaction(t);
                    setDescription(t.description);
                    setAmount(String(t.amount));
                    setDate(t.date);
                    setType(t.type);
                    setCategory(t.category);
                    setEfetivado(t.efetivado);
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
            setType(typeParam || 'expense');
            if (isCreditCardParam) {
                setCreditCardId("");
            }
            setIsLoading(false);
        }

        return () => unsubs.forEach(u => u());

    }, [user, transactionId, typeParam, isCreditCardParam]);
    

    const handleSubmit = async (scope?: RecurrenceEditScope) => {
        setIsSaving(true);
        setShowEditScopeDialog(false);

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
                if (originalTransaction?.isRecurring && scope) {
                    await updateTransaction(user.uid, transactionId, transactionData, scope, originalTransaction);
                } else {
                    await updateTransaction(user.uid, transactionId, transactionData, "single");
                }
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
    
    const handleSaveClick = (e: React.FormEvent) => {
        e.preventDefault();
        if (isEditing && originalTransaction?.isRecurring) {
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
                        placeholder="Descrição"
                        className="border-0 focus-visible:ring-0 text-base p-0"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        disabled={isEditing && !!originalTransaction?.isRecurring}
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
                
                <div className="flex items-center gap-2 p-1 rounded-lg border">
                    <div className="p-2 rounded-full bg-muted">
                       <Shapes className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <Select onValueChange={setCategory} value={category}>
                        <SelectTrigger className="border-0 focus:ring-0 w-full">
                            <SelectValue placeholder="Selecione a categoria" />
                        </SelectTrigger>
                        <SelectContent>
                            {categories.filter(c => c.type === type).map(cat => (
                                <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Button variant="ghost" size="icon"><Plus className="h-5 w-5" /></Button>
                </div>

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
                                <SelectValue placeholder="Selecione a conta" />
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
                  <AlertDialogContent>
                      <AlertDialogHeader>
                          <AlertDialogTitle>Editar transação recorrente</AlertDialogTitle>
                          <AlertDialogDescription>
                              Você está editando uma transação recorrente. Como deseja aplicar as alterações?
                          </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter className="flex-col gap-2">
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

    