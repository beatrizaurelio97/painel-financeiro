import { Component, ChangeDetectionStrategy, input, signal } from '@angular/core';
import { Transaction } from '../../models/transaction.model';
import { TransactionFormComponent } from '../transaction-form/transaction-form.component';

/**
 * Botão "Nova Transação" + modal com o formulário.
 * - `open()` abre o modal para criar; `edit(transaction)` abre para editar.
 * - Com `[showButton]="false"` só o modal é renderizado (útil para abrir por outros gatilhos).
 */
@Component({
  selector: 'app-new-transaction',
  standalone: true,
  imports: [TransactionFormComponent],
  templateUrl: './new-transaction.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './new-transaction.component.scss'
})
export class NewTransactionComponent {
  readonly showButton = input<boolean>(true);

  readonly isOpen = signal<boolean>(false);
  readonly editing = signal<Transaction | null>(null);

  open(): void {
    this.editing.set(null);
    this.isOpen.set(true);
  }

  edit(transaction: Transaction): void {
    this.editing.set(transaction);
    this.isOpen.set(true);
  }

  close(): void {
    this.isOpen.set(false);
    this.editing.set(null);
  }
}
