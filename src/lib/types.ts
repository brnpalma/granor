import { z } from "zod";

export type RecurrenceEditScope = "single" | "future" | "all";

export interface UserPreferences {
  showBalance: boolean;
  includePreviousMonthBalance: boolean;
  includeBudgetsInForecast?: boolean;
  includeBudgetsInPastForecast?: boolean;
  transactionSortOrder?: 'asc' | 'desc';
}

export interface Category {
  id: string;
  name: string;
  type: "income" | "expense";
  icon: string;
  color: string;
}


export const accountTypes = [
  "Conta Corrente",
  "Poupança",
  "Carteira",
  "Investimentos",
  "Outro",
] as const;

export type AccountType = (typeof accountTypes)[number];

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  initialBalance: number;
  ignoreInTotals?: boolean;
  color?: string;
}

export interface CreditCard {
  id: string;
  name: string;
  limit: number;
  closingDay: number;
  dueDay: number;
  defaultAccountId: string;
  color?: string;
}

export type RecurrencePeriod = "diária" | "semanal" | "mensal" | "anual";

export interface Recurrence {
    period: RecurrencePeriod;
    quantity: number;
    startInstallment: number;
}

export type TransactionType = 'income' | 'expense' | 'credit_card_reversal' | 'transfer';

export const transactionSchema = z.object({
    id: z.string(),
    iaDoubt: z.boolean().optional(),
    iaReply: z.string(),
    amount: z.number(),
    category: z.string(),
    date: z.preprocess(
      (val) => {
        if(!val) return null;
        const d = new Date(val as string);
        return isNaN(d.getTime()) ? null : d;
      },
      z.date().nullable()
    ),
    description: z.string(),
    efetivado: z.boolean(),
    accountId: z.string().optional(),
    creditCardId: z.string().optional(),
    destinationAccountId: z.string().optional(),
    transferId: z.string().optional(),
    type: z.enum(["income", "expense", "credit_card_reversal", "transfer"]),
    isBudget: z.boolean().optional(),
    isRecurring: z.boolean().optional(),
    isFixed: z.boolean().optional(),
    recurrenceId: z.string().optional(),
    endDate: z.preprocess(
      (val) => {
        if(!val) return null;
        const d = new Date(val as string);
        return isNaN(d.getTime()) ? null : d;
      },
      z.date().nullable().optional()
    ),
});

export interface Transaction { // Sempre que algo for alterado aqui, verifique se não precisa alterar no ZOD acima para uso da IA.
  id: string;
  date: Date;
  description: string;
  amount: number;
  type: TransactionType;
  category: string;
  efetivado: boolean;
  accountId?: string; // Optional: for bank account transactions
  creditCardId?: string; // Optional: for credit card transactions
  destinationAccountId?: string; // for transfers
  transferId?: string; // for transfers
  isBudget?: boolean;
  isRecurring?: boolean;
  isFixed?: boolean;
  recurrence?: Recurrence;
  recurrenceId?: string;
  endDate?: Date;
  overrides?: { [monthKey: string]: string }; // e.g. { "2024-6": "override-doc-id" }
}

export interface Budget {
  id: string;
  category: string;
  amount: number;
}

export interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
}
