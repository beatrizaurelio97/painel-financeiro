import { Component, computed, inject, input, OnInit, output, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Category, CategoryId, TransactionType } from '../../models/category.model';
import { Transaction } from '../../models/transaction.model';
import { FinanceService } from '../../services/finance.service';

@Component({
  selector: 'app-transaction-form',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './transaction-form.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './transaction-form.component.scss'
})
export class TransactionFormComponent implements OnInit {
  readonly financeService = inject(FinanceService);

  // Quando informado, o formulário edita essa transação em vez de criar uma nova
  readonly transaction = input<Transaction | null>(null);
  readonly isEditing = computed(() => this.transaction() !== null);

  // Emitido após criar ou editar com sucesso
  readonly saved = output<void>();

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

  ngOnInit(): void {
    const tx = this.transaction();
    if (!tx) return;

    this.currentType.set(tx.type);
    this.transactionForm.setValue({
      description: tx.description,
      amount: tx.amount,
      type: tx.type,
      categoryId: tx.categoryId,
      date: tx.date,
      notes: tx.notes ?? ''
    });
  }

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
    const payload = {
      description: val.description,
      amount: Number(val.amount),
      type: val.type,
      categoryId: val.categoryId,
      date: val.date,
      notes: val.notes || undefined
    };

    try {
      const editing = this.transaction();
      if (editing) {
        await this.financeService.updateTransaction(editing.id, payload);
        this.saved.emit();
        return;
      }

      await this.financeService.addTransaction(payload);

      this.transactionForm.reset({
        type: val.type,
        date: new Date().toISOString().substring(0, 10),
        description: '',
        amount: null,
        categoryId: val.categoryId,
        notes: ''
      });

      this.saved.emit();
    } catch {
      // Erro tratado pelo serviço
    }
  }
}
