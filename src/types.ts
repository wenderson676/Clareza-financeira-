export type TransactionType = 'income' | 'expense' | 'transfer_to_savings' | 'transfer_from_savings';
export type Bucket = 'Necessidades' | 'Desejos' | 'Reserva/Dívidas' | 'Renda' | 'Transferência';
export type BudgetMode = '50-30-20' | '80-10-10' | '90-5-5';

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
}
