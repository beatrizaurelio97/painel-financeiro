import { Component } from '@angular/core';
import { TransactionListComponent } from '../../components/transaction-list/transaction-list.component';

@Component({
  selector: 'app-transactions',
  standalone: true,
  imports: [TransactionListComponent],
  templateUrl: './transactions.component.html',
  styleUrl: './transactions.component.scss'
})
export class TransactionsComponent {}
