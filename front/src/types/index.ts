export interface Task {
  id: number;
  title: string;
  description?: string | null;
  status: 'pending' | 'completed';
  priority: 'low' | 'medium' | 'high';
  due_date?: string | null;
  created_at?: string | null;
}

export interface Account {
  id: number;
  name: string;
  account_type: string;
  currency: string;
  current_balance: number;
  created_at?: string | null;
}

export interface Transaction {
  id: number;
  account_id?: number | null;
  type: 'income' | 'expense';
  amount: number;
  currency: string;
  merchant?: string | null;
  category?: string | null;
  transaction_date?: string | null;
  payment_method?: string | null;
  description?: string | null;
  created_at?: string | null;
}

export interface CashFlow {
  income: number;
  expenses: number;
  cash_flow: number;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: Date;
}
