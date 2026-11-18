import { Component, ChangeDetectionStrategy } from '@angular/core';
import { TransactionListComponent } from '../../components/transaction-list/transaction-list.component';

@Component({
  selector: 'app-transactions',
  standalone: true,
  imports: [TransactionListComponent],
  templateUrl: './transactions.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './transactions.component.scss'
})
export class TransactionsComponent {}
