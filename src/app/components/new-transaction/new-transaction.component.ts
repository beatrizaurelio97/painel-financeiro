import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { TransactionFormComponent } from '../transaction-form/transaction-form.component';

/**
 * Botão "Nova Transação" + modal com o formulário.
 * Use `<app-new-transaction #novaTransacao />` e `novaTransacao.open()` para abrir por outros gatilhos.
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
  readonly isOpen = signal<boolean>(false);

  open(): void {
    this.isOpen.set(true);
  }

  close(): void {
    this.isOpen.set(false);
  }
}
