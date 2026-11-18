import { Injectable, computed, inject, signal } from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { CATEGORIES, Category, CategoryId, TransactionType } from '../models/category.model';
import { CategorySummary, FinancialSummary, Transaction, YearlyReport } from '../models/transaction.model';
import { FinanceApiService } from './finance-api.service';
import { buildYearlyReport } from './yearly-report';

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

  // Ano exibido no histórico (visão de planilha)
  readonly selectedYear = signal<number>(new Date().getFullYear());

  readonly availableYears = computed<number[]>(() => {
    const years = new Set<number>([new Date().getFullYear(), this.selectedYear()]);
    for (const t of this.transactions()) {
      const year = Number(t.date.substring(0, 4));
      if (year) years.add(year);
    }
    return Array.from(years).sort((a, b) => b - a);
  });

  // Computed: Planilha anual (Saída / Entrada / Totais por mês)
  readonly yearlyReport = computed<YearlyReport>(() =>
    buildYearlyReport(this.transactions(), this.selectedYear())
  );

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

  updateTransaction(id: string, item: Omit<Transaction, 'id' | 'createdAt'>): Promise<Transaction> {
    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    return new Promise((resolve, reject) => {
      this.api.updateTransaction(id, item).subscribe({
        next: updated => {
          this.transactions.update(prev => prev.map(t => (t.id === id ? updated : t)));
          this.isSubmitting.set(false);
          resolve(updated);
        },
        error: err => {
          console.error('Erro ao atualizar transação via API mock', err);
          this.errorMessage.set('Erro ao atualizar transação.');
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

  // Substitui todas as transações do ano pelas importadas da planilha
  importYear(year: number, items: Omit<Transaction, 'id' | 'createdAt'>[]): Promise<number> {
    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    const prefix = `${year}-`;
    const toRemove = this.transactions().filter(t => t.date.startsWith(prefix));

    return new Promise((resolve, reject) => {
      const removals = toRemove.length
        ? forkJoin(toRemove.map(t => this.api.deleteTransaction(t.id)))
        : of([]);

      removals.subscribe({
        next: () => {
          const creations = items.length
            ? forkJoin(items.map(item => this.api.createTransaction(item)))
            : of([] as Transaction[]);

          creations.subscribe({
            next: created => {
              const removedIds = new Set(toRemove.map(t => t.id));
              this.transactions.update(prev => [...created, ...prev.filter(t => !removedIds.has(t.id))]);
              this.isSubmitting.set(false);
              resolve(created.length);
            },
            error: err => {
              console.error('Erro ao importar transações via API mock', err);
              this.errorMessage.set('Erro ao importar planilha.');
              this.isSubmitting.set(false);
              this.loadInitialData();
              reject(err);
            }
          });
        },
        error: err => {
          console.error('Erro ao limpar transações do ano via API mock', err);
          this.errorMessage.set('Erro ao importar planilha.');
          this.isSubmitting.set(false);
          reject(err);
        }
      });
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
