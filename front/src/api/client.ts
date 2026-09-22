import { getServerUrl } from './config';
import { Task, Account, Transaction, CashFlow } from '../types';

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 8000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

export const api = {
  // Health probe
  async checkHealth(): Promise<boolean> {
    try {
      const baseUrl = await getServerUrl();
      const res = await fetchWithTimeout(`${baseUrl}/health`, { method: 'GET' }, 4000);
      if (!res.ok) return false;
      const data = await res.json();
      return data.status === 'ok';
    } catch {
      return false;
    }
  },

  // Assistant Chat
  async sendChatMessage(message: string, language: string = 'es'): Promise<string> {
    const baseUrl = await getServerUrl();
    const res = await fetchWithTimeout(`${baseUrl}/chat`, {
      method: 'POST',
      body: JSON.stringify({ message, language }),
    }, 180000); // Allow up to 3 minutes for slow Ollama LLM response & multi-agent execution
    if (!res.ok) {
      throw new Error(`Server returned error ${res.status}`);
    }
    const data = await res.json();
    return data.response;
  },

  // Tasks
  async getTasks(params?: { status?: string; start_date?: string; end_date?: string }): Promise<Task[]> {
    const baseUrl = await getServerUrl();
    const query = new URLSearchParams();
    if (params?.status) query.append('status', params.status);
    if (params?.start_date) query.append('start_date', params.start_date);
    if (params?.end_date) query.append('end_date', params.end_date);

    const queryString = query.toString() ? `?${query.toString()}` : '';
    const res = await fetchWithTimeout(`${baseUrl}/tasks${queryString}`);
    if (!res.ok) throw new Error(`Error fetching tasks: ${res.status}`);
    return await res.json();
  },

  async createTask(task: {
    title: string;
    description?: string;
    due_date?: string;
    priority?: 'low' | 'medium' | 'high';
  }): Promise<Task> {
    const baseUrl = await getServerUrl();
    const res = await fetchWithTimeout(`${baseUrl}/tasks`, {
      method: 'POST',
      body: JSON.stringify(task),
    });
    if (!res.ok) throw new Error(`Error creating task: ${res.status}`);
    return await res.json();
  },

  async completeTask(taskId: number): Promise<{ id: number; title: string; status: string }> {
    const baseUrl = await getServerUrl();
    const res = await fetchWithTimeout(`${baseUrl}/tasks/${taskId}/complete`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error(`Error completing task: ${res.status}`);
    return await res.json();
  },

  async deleteTask(taskId: number): Promise<{ id: number; title: string }> {
    const baseUrl = await getServerUrl();
    const res = await fetchWithTimeout(`${baseUrl}/tasks/${taskId}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error(`Error deleting task: ${res.status}`);
    return await res.json();
  },

  // Accounts
  async getAccounts(): Promise<Account[]> {
    const baseUrl = await getServerUrl();
    const res = await fetchWithTimeout(`${baseUrl}/accounts`);
    if (!res.ok) throw new Error(`Error fetching accounts: ${res.status}`);
    return await res.json();
  },

  async createAccount(acc: {
    name: string;
    account_type: string;
    currency?: string;
    current_balance?: number;
  }): Promise<Account> {
    const baseUrl = await getServerUrl();
    const res = await fetchWithTimeout(`${baseUrl}/accounts`, {
      method: 'POST',
      body: JSON.stringify(acc),
    });
    if (!res.ok) throw new Error(`Error creating account: ${res.status}`);
    return await res.json();
  },

  // Transactions
  async getTransactions(params?: {
    type?: string;
    category?: string;
    start_date?: string;
    end_date?: string;
  }): Promise<Transaction[]> {
    const baseUrl = await getServerUrl();
    const query = new URLSearchParams();
    if (params?.type) query.append('type', params.type);
    if (params?.category) query.append('category', params.category);
    if (params?.start_date) query.append('start_date', params.start_date);
    if (params?.end_date) query.append('end_date', params.end_date);

    const queryString = query.toString() ? `?${query.toString()}` : '';
    const res = await fetchWithTimeout(`${baseUrl}/transactions${queryString}`);
    if (!res.ok) throw new Error(`Error fetching transactions: ${res.status}`);
    return await res.json();
  },

  async createTransaction(tx: {
    type: 'income' | 'expense';
    amount: number;
    currency?: string;
    account_id?: number | null;
    merchant?: string;
    category?: string;
    transaction_date?: string;
    payment_method?: string;
    description?: string;
  }): Promise<Transaction> {
    const baseUrl = await getServerUrl();
    const res = await fetchWithTimeout(`${baseUrl}/transactions`, {
      method: 'POST',
      body: JSON.stringify(tx),
    });
    if (!res.ok) throw new Error(`Error creating transaction: ${res.status}`);
    return await res.json();
  },

  // Bank Webhook ingestion simulation
  async simulateBankWebhook(notification: string): Promise<any> {
    const baseUrl = await getServerUrl();
    const res = await fetchWithTimeout(`${baseUrl}/webhooks/bank`, {
      method: 'POST',
      body: JSON.stringify({ notification }),
    });
    if (!res.ok) throw new Error(`Webhook ingestion failed: ${res.status}`);
    return await res.json();
  },
};
