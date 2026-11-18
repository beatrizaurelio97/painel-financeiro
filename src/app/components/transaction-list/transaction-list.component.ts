import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FinanceService } from '../../services/finance.service';
import { CategoryId, TransactionType } from '../../models/category.model';

@Component({
  selector: 'app-transaction-list',
  standalone: true,
  imports: [CurrencyPipe, DatePipe, FormsModule],
  templateUrl: './transaction-list.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './transaction-list.component.scss'
})
export class TransactionListComponent {
  readonly financeService = inject(FinanceService);

  onTypeFilterChange(type: TransactionType | 'all'): void {
    this.financeService.filterType.set(type);
  }

  onCategoryFilterChange(cat: CategoryId | 'all'): void {
    this.financeService.filterCategory.set(cat);
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
