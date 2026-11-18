import { Injectable, computed, signal } from '@angular/core';
import { CATEGORIES, Category } from '../models/category.model';
import { Transaction } from '../models/transaction.model';

export interface InterceptedRequest {
  id: string;
  method: string;
  url: string;
  body?: unknown;
  timestamp: Date;
}

export interface StubErrorConfig {
  enabled: boolean;
  status: number;
  statusText: string;
  message: string;
  endpointFilter?: string; // se informado, falha apenas no endpoint específico
}

const STORAGE_KEY = 'fintrack_stub_transactions';

@Injectable({
  providedIn: 'root'
})
export class FinanceApiStubService {
  // Estado das transações no Stub
  readonly transactions = signal<Transaction[]>(this.loadStorage());

  // Categorias disponíveis
  readonly categories = signal<Category[]>(CATEGORIES);

  // Latência simulada em milissegundos (0 para testes instantâneos)
  readonly delayMs = signal<number>(300);

  // Configuração para forçar respostas de erro HTTP
  readonly errorConfig = signal<StubErrorConfig>({
    enabled: false,
    status: 500,
    statusText: 'Internal Server Error',
    message: 'Erro simulado pelo Stub'
  });

  // Histórico de requisições recebidas pelo Stub (útil para asserções e devtools)
  readonly requestHistory = signal<InterceptedRequest[]>([]);

  // Computed: última requisição recebida
  readonly lastRequest = computed<InterceptedRequest | null>(() => {
    const list = this.requestHistory();
    return list.length > 0 ? list[list.length - 1] : null;
  });

  // Controles do Stub
  setTransactions(data: Transaction[]): void {
    this.transactions.set([...data]);
    this.persist(data);
  }

  setDelay(ms: number): void {
    this.delayMs.set(Math.max(0, ms));
  }

  simulateHttpError(status = 500, message = 'Erro simulado na API', endpointFilter?: string): void {
    const statusTexts: Record<number, string> = {
      400: 'Bad Request',
      401: 'Unauthorized',
      403: 'Forbidden',
      404: 'Not Found',
      422: 'Unprocessable Entity',
      500: 'Internal Server Error',
      503: 'Service Unavailable'
    };

    this.errorConfig.set({
      enabled: true,
      status,
      statusText: statusTexts[status] || 'Error',
      message,
      endpointFilter
    });
  }

  clearSimulatedError(): void {
    this.errorConfig.set({
      enabled: false,
      status: 200,
      statusText: 'OK',
      message: ''
    });
  }

  clearRequestHistory(): void {
    this.requestHistory.set([]);
  }

  reset(): void {
    this.setTransactions([]);
    this.clearSimulatedError();
    this.clearRequestHistory();
    this.delayMs.set(300);
  }

  // Métodos de execução chamados pelo interceptor
  recordRequest(method: string, url: string, body?: unknown): void {
    const newEntry: InterceptedRequest = {
      id: Math.random().toString(36).substring(2, 9),
      method,
      url,
      body,
      timestamp: new Date()
    };
    this.requestHistory.update(prev => [...prev, newEntry]);
  }

  handleGetTransactions(): Transaction[] {
    return this.transactions();
  }

  handleGetCategories(): Category[] {
    return this.categories();
  }

  handleCreateTransaction(payload: Omit<Transaction, 'id' | 'createdAt'>): Transaction {
    const created: Transaction = {
      ...payload,
      id: 'tx-' + Math.random().toString(36).substring(2, 9),
      createdAt: new Date().toISOString()
    };

    this.transactions.update(prev => {
      const next = [created, ...prev];
      this.persist(next);
      return next;
    });

    return created;
  }

  handleDeleteTransaction(id: string): { success: boolean; id: string } {
    this.transactions.update(prev => {
      const next = prev.filter(t => t.id !== id);
      this.persist(next);
      return next;
    });

    return { success: true, id };
  }

  handleReset(): Transaction[] {
    this.setTransactions([]);
    return [];
  }

  private loadStorage(): Transaction[] {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored !== null) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) return parsed;
        }
      } catch {
        // fallback
      }
    }
    return [];
  }

  private persist(data: Transaction[]): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      } catch {
        // fallback
      }
    }
  }
}
