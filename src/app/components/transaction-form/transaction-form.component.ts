import { Component, computed, inject, output, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Category, CategoryId, TransactionType } from '../../models/category.model';
import { FinanceService } from '../../services/finance.service';

@Component({
  selector: 'app-transaction-form',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './transaction-form.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
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

  // Agrupa as categorias como na planilha: "Fixas · Serviços" > Internet, Operadora...
  readonly categoryGroups = computed(() => {
    const groups = new Map<string, Category[]>();
    for (const cat of this.availableCategories()) {
      const label = cat.groupName && cat.subgroupName ? `${cat.groupName} · ${cat.subgroupName}` : 'Outros';
      groups.set(label, [...(groups.get(label) ?? []), cat]);
    }
    return Array.from(groups.entries()).map(([label, items]) => ({ label, items }));
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
    categoryId: new FormControl<CategoryId>(this.defaultCategoryId('expense'), {
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

    this.transactionForm.patchValue({ categoryId: this.defaultCategoryId(type) });
  }

  private defaultCategoryId(type: TransactionType): CategoryId {
    return this.financeService.categories().find(c => c.type === 'both' || c.type === type)?.id ?? '';
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
