import { Component, ChangeDetectionStrategy } from '@angular/core';
import { NewTransactionComponent } from '../../components/new-transaction/new-transaction.component';
import { TransactionListComponent } from '../../components/transaction-list/transaction-list.component';
import { TransactionSheetComponent } from '../../components/transaction-sheet/transaction-sheet.component';

@Component({
  selector: 'app-transactions',
  standalone: true,
  imports: [TransactionListComponent, TransactionSheetComponent, NewTransactionComponent],
  templateUrl: './transactions.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './transactions.component.scss'
})
export class TransactionsComponent {}
