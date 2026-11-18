import { Injectable, computed, inject, signal } from '@angular/core';
import { CATEGORIES, Category, CategoryId, TransactionType } from '../models/category.model';
import { CategorySummary, FinancialSummary, Transaction } from '../models/transaction.model';
import { FinanceApiService } from './finance-api.service';

@Injectable({
  providedIn: 'root'
})
export class FinanceService {
  private api = inject(FinanceApiService);

  // Estados de Dados (Signals)
  readonly transactions = signal<Transaction[]>([]);
  readonly categories = signal<Category[]>(CATEGORIES);

  // Estados Assíncronos / UI (Signals)
  readonly isLoading = signal<boolean>(false);
  readonly isSubmitting = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  // Filtros Reativos (Signals)
  readonly filterType = signal<TransactionType | 'all'>('all');
  readonly filterCategory = signal<CategoryId | 'all'>('all');
  readonly searchQuery = signal<string>('');

  // Computed: Resumo Geral
  readonly summary = computed<FinancialSummary>(() => {
    const list = this.transactions();
    let totalIncome = 0;
    let totalExpenses = 0;

    for (const t of list) {
      if (t.type === 'income') {
        totalIncome += t.amount;
      } else {
        totalExpenses += t.amount;
      }
    }

    const totalBalance = totalIncome - totalExpenses;
    const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0;

    return {
      totalBalance,
      totalIncome,
      totalExpenses,
      savingsRate: Math.max(0, savingsRate),
      transactionCount: list.length
    };
  });

  // Computed: Despesas por Categoria com %
  readonly expensesByCategory = computed<CategorySummary[]>(() => {
    const expenses = this.transactions().filter(t => t.type === 'expense');
    const totalExpenses = expenses.reduce((acc, curr) => acc + curr.amount, 0);

    if (totalExpenses === 0) return [];

    const categoryMap = new Map<CategoryId, number>();
    for (const item of expenses) {
      categoryMap.set(item.categoryId, (categoryMap.get(item.categoryId) || 0) + item.amount);
    }

    return Array.from(categoryMap.entries())
      .map(([catId, total]) => {
        const cat = CATEGORIES.find(c => c.id === catId) || {
          id: catId,
          name: 'Outros',
          icon: '📦',
          color: '#6b7280',
          type: 'both' as const
        };
        return {
          categoryId: catId,
          categoryName: cat.name,
          categoryIcon: cat.icon,
          categoryColor: cat.color,
          total,
          percentage: (total / totalExpenses) * 100
        };
      })
      .sort((a, b) => b.total - a.total);
  });

  // Computed: Lista Filtrada
  readonly filteredTransactions = computed<Transaction[]>(() => {
    const list = this.transactions();
    const type = this.filterType();
    const cat = this.filterCategory();
    const query = this.searchQuery().trim().toLowerCase();

    return list.filter(t => {
      const matchType = type === 'all' || t.type === type;
      const matchCategory = cat === 'all' || t.categoryId === cat;
      const matchQuery =
        !query ||
        t.description.toLowerCase().includes(query) ||
        (t.notes && t.notes.toLowerCase().includes(query));

      return matchType && matchCategory && matchQuery;
    });
  });

  // Computed: Últimas 5 Transações
  readonly recentTransactions = computed<Transaction[]>(() => {
    return [...this.transactions()]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
  });

  constructor() {
    this.loadInitialData();
  }

  // Operações Assíncronas integradas com o Stub HTTP
  loadInitialData(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.api.getTransactions().subscribe({
      next: data => {
        this.transactions.set(data);
        this.isLoading.set(false);
      },
      error: err => {
        console.error('Erro ao buscar transações via API mock', err);
        this.errorMessage.set('Falha ao carregar transações da API.');
        this.isLoading.set(false);
      }
    });

    this.api.getCategories().subscribe({
      next: cats => {
        this.categories.set(cats);
      },
      error: err => console.error('Erro ao buscar categorias via API mock', err)
    });
  }

  addTransaction(item: Omit<Transaction, 'id' | 'createdAt'>): Promise<Transaction> {
    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    return new Promise((resolve, reject) => {
      this.api.createTransaction(item).subscribe({
        next: created => {
          this.transactions.update(prev => [created, ...prev]);
          this.isSubmitting.set(false);
          resolve(created);
        },
        error: err => {
          console.error('Erro ao adicionar transação via API mock', err);
          this.errorMessage.set('Erro ao salvar transação.');
          this.isSubmitting.set(false);
          reject(err);
        }
      });
    });
  }

  deleteTransaction(id: string): void {
    this.api.deleteTransaction(id).subscribe({
      next: () => {
        this.transactions.update(prev => prev.filter(t => t.id !== id));
      },
      error: err => {
        console.error('Erro ao excluir transação via API mock', err);
        this.errorMessage.set('Erro ao excluir movimentação.');
      }
    });
  }

  resetToSampleData(): void {
    this.isLoading.set(true);
    this.api.resetData().subscribe({
      next: data => {
        this.transactions.set(data);
        this.isLoading.set(false);
      },
      error: err => {
        console.error('Erro ao resetar dados via API mock', err);
        this.isLoading.set(false);
      }
    });
  }

  getCategoryById(id: CategoryId): Category | undefined {
    return this.categories().find(c => c.id === id) || CATEGORIES.find(c => c.id === id);
  }
}
