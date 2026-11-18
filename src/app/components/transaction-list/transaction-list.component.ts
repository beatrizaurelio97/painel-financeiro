import { Component, computed, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FinanceService } from '../../services/finance.service';
import { CategoryId, TransactionType } from '../../models/category.model';
import { NewTransactionComponent } from '../new-transaction/new-transaction.component';

@Component({
  selector: 'app-transaction-list',
  standalone: true,
  imports: [CurrencyPipe, DatePipe, FormsModule, NewTransactionComponent],
  templateUrl: './transaction-list.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './transaction-list.component.scss'
})
export class TransactionListComponent {
  readonly financeService = inject(FinanceService);

  readonly pageSize = 20;
  private readonly requestedPage = signal<number>(1);

  readonly totalItems = computed(() => this.financeService.filteredTransactions().length);
  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.totalItems() / this.pageSize)));

  // Página efetiva: nunca passa do total (ex.: ao excluir o último item da última página)
  readonly currentPage = computed(() => Math.min(this.requestedPage(), this.totalPages()));

  readonly pagedTransactions = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.financeService.filteredTransactions().slice(start, start + this.pageSize);
  });

  readonly rangeStart = computed(() => (this.totalItems() === 0 ? 0 : (this.currentPage() - 1) * this.pageSize + 1));
  readonly rangeEnd = computed(() => Math.min(this.currentPage() * this.pageSize, this.totalItems()));

  // Botões de página: 1 … 4 5 6 … 20 (null = reticências)
  readonly pageButtons = computed<(number | null)[]>(() => {
    const total = this.totalPages();
    const current = this.currentPage();
    const pages = new Set<number>([1, total, current - 1, current, current + 1]);
    const sorted = [...pages].filter(n => n >= 1 && n <= total).sort((a, b) => a - b);

    const result: (number | null)[] = [];
    sorted.forEach((n, i) => {
      if (i > 0 && n - sorted[i - 1] > 1) result.push(null);
      result.push(n);
    });
    return result;
  });

  goToPage(page: number): void {
    this.requestedPage.set(Math.min(Math.max(1, page), this.totalPages()));
  }

  onSearchChange(query: string): void {
    this.financeService.searchQuery.set(query);
    this.requestedPage.set(1);
  }

  onTypeFilterChange(type: TransactionType | 'all'): void {
    this.financeService.filterType.set(type);
    this.requestedPage.set(1);
  }

  onCategoryFilterChange(cat: CategoryId | 'all'): void {
    this.financeService.filterCategory.set(cat);
    this.requestedPage.set(1);
  }

  onDelete(id: string, description: string): void {
    if (confirm(`Deseja realmente remover "${description}"?`)) {
      this.financeService.deleteTransaction(id);
    }
  }

  onClearAll(): void {
    if (confirm('Deseja realmente limpar todas as transações?')) {
      this.financeService.resetToSampleData();
    }
  }
}
