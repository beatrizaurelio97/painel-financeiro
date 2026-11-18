import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FinanceService } from '../../services/finance.service';
import { SummaryCardComponent } from '../../components/summary-card/summary-card.component';
import { NewTransactionComponent } from '../../components/new-transaction/new-transaction.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    DecimalPipe,
    DatePipe,
    CurrencyPipe,
    RouterLink,
    SummaryCardComponent,
    NewTransactionComponent
  ],
  templateUrl: './dashboard.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent {
  readonly financeService = inject(FinanceService);
}
