export type TransactionType = 'income' | 'expense' | 'transfer_to_savings' | 'transfer_from_savings' | 'transfer_between_accounts';
export type AccountType = string;
export type Bucket = 'Necessidades' | 'Desejos' | 'Reserva/Dívidas' | 'Renda' | 'Transferência';
export type BudgetMode = '50-30-20' | '80-10-10' | '90-5-5' | '70-0-30' | '50-20-30';

export interface Account {
  id: string;
  name: string;
  icon: string; // e.g., "🏦", "💰", "💵", etc.
  isMain?: boolean;
  type: 'banco' | 'reserva' | 'carteira' | 'custom';
}

export interface Debt {
  id: string;
  name: string;
  totalAmount: number;
  monthlyPayment: number;
  interestRate: number; // percentage
  isLate: boolean;
  creditor: string;
  type: 'rent_late' | 'utility_risk' | 'pension' | 'loan_shark' | 'card_revolving' | 'loan_installments' | 'card_installments' | 'store_installments' | 'no_interest' | 'family' | 'other';
}

export interface Transaction {
  id: string;
  date: string; // ISO string YYYY-MM-DD
  description: string;
  amount: number;
  type: TransactionType;
  category: string;
  bucket: Bucket;
  notes?: string;
  isPending?: boolean;
  account?: AccountType;
  toAccount?: AccountType;
}

export interface MonthlyData {
  monthId: string; // Format: "YYYY-MM"
  transactions: Transaction[];
  devotionalNote?: string;
}

export interface Goal {
  id: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
}

export interface Asset {
  id: string;
  name: string;
  value: number;
  type: 'asset' | 'liability';
}

export interface AppState {
  monthlyData: Record<string, MonthlyData>;
  goals: Goal[];
  assets: Asset[];
  userName?: string;
  budgetMode?: BudgetMode;
  debts?: Debt[];
  dashboardCardOrder?: string[];
  accounts?: Account[];
  customCategories?: {
    expense?: string[];
    income?: string[];
    transfer?: string[];
  };
}
