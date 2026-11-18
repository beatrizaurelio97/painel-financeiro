import { Component, computed, inject, output, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CategoryId, TransactionType } from '../../models/category.model';
import { FinanceService } from '../../services/finance.service';

@Component({
  selector: 'app-transaction-form',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './transaction-form.component.html',
  styleUrl: './transaction-form.component.scss'
})
export class TransactionFormComponent {
  readonly financeService = inject(FinanceService);

  readonly transactionAdded = output<void>();

  readonly currentType = signal<TransactionType>('expense');

  readonly availableCategories = computed(() => {
    const type = this.currentType();
    return this.financeService.categories().filter(c => c.type === 'both' || c.type === type);
  });

  readonly transactionForm = new FormGroup({
    description: new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(3)]
    }),
    amount: new FormControl<number | null>(null, {
      validators: [Validators.required, Validators.min(0.01)]
    }),
    type: new FormControl<TransactionType>('expense', {
      nonNullable: true,
      validators: [Validators.required]
    }),
    categoryId: new FormControl<CategoryId>('food', {
      nonNullable: true,
      validators: [Validators.required]
    }),
    date: new FormControl<string>(new Date().toISOString().substring(0, 10), {
      nonNullable: true,
      validators: [Validators.required]
    }),
    notes: new FormControl<string>('', {
      nonNullable: true
    })
  });

  setType(type: TransactionType): void {
    this.currentType.set(type);
    this.transactionForm.patchValue({ type });

    const validCategory = this.availableCategories()[0]?.id || 'other';
    this.transactionForm.patchValue({ categoryId: validCategory });
  }

  isFieldInvalid(fieldName: 'description' | 'amount' | 'type' | 'categoryId' | 'date'): boolean {
    const field = this.transactionForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  async onSubmit(): Promise<void> {
    if (this.transactionForm.invalid || this.financeService.isSubmitting()) {
      this.transactionForm.markAllAsTouched();
      return;
    }

    const val = this.transactionForm.getRawValue();
    try {
      await this.financeService.addTransaction({
        description: val.description,
        amount: Number(val.amount),
        type: val.type,
        categoryId: val.categoryId,
        date: val.date,
        notes: val.notes || undefined
      });

      this.transactionForm.reset({
        type: val.type,
        date: new Date().toISOString().substring(0, 10),
        description: '',
        amount: null,
        categoryId: val.categoryId,
        notes: ''
      });

      this.transactionAdded.emit();
    } catch {
      // Erro tratado pelo serviço
    }
  }
}
