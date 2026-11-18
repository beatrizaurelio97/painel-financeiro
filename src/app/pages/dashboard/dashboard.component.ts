import { Component, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FinanceService } from '../../services/finance.service';
import { SummaryCardComponent } from '../../components/summary-card/summary-card.component';
import { TransactionFormComponent } from '../../components/transaction-form/transaction-form.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    DecimalPipe,
    DatePipe,
    CurrencyPipe,
    RouterLink,
    SummaryCardComponent,
    TransactionFormComponent
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent {
  readonly financeService = inject(FinanceService);

  // Controla a visibilidade do formulário de Nova Transação na Visão Geral
  readonly showTransactionForm = signal<boolean>(false);

  openForm(): void {
    this.showTransactionForm.set(true);
  }

  closeForm(): void {
    this.showTransactionForm.set(false);
  }

  onTransactionAdded(): void {
    this.closeForm();
  }
}
