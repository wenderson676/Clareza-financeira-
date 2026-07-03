export type TransactionType = 'income' | 'expense' | 'transfer_to_savings' | 'transfer_from_savings';
export type Bucket = 'Dízimo' | 'Necessidades' | 'Vida' | 'Poupança' | 'Renda' | 'Transferência';

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
}
