import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { FinanceService } from '../../services/finance.service';
import { Transaction } from '../../models/transaction.model';
import { TransactionListComponent } from './transaction-list.component';

const makeTransactions = (count: number): Transaction[] =>
  Array.from({ length: count }, (_, i) => ({
    id: `tx-${i + 1}`,
    description: `Item ${i + 1}`,
    amount: 10,
    type: i % 2 === 0 ? ('expense' as const) : ('income' as const),
    categoryId: 'fixed-servicos-internet',
    date: '2026-01-10',
    createdAt: '2026-01-10T00:00:00.000Z'
  }));

describe('TransactionListComponent (paginação)', () => {
  let component: TransactionListComponent;
  let finance: FinanceService;

  const setup = (count: number): void => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withXhr()), provideHttpClientTesting()]
    });
    const http = TestBed.inject(HttpTestingController);
    finance = TestBed.inject(FinanceService);
    http.expectOne('/api/transactions').flush(makeTransactions(count));
    http.expectOne('/api/categories').flush([]);
    component = TestBed.runInInjectionContext(() => new TransactionListComponent());
  };

  it('deve exibir no máximo 20 itens por página', () => {
    setup(45);

    expect(component.pageSize).toBe(20);
    expect(component.totalPages()).toBe(3);
    expect(component.pagedTransactions()).toHaveLength(20);
    expect(component.rangeStart()).toBe(1);
    expect(component.rangeEnd()).toBe(20);
  });

  it('deve navegar entre as páginas e mostrar o restante na última', () => {
    setup(45);

    component.goToPage(2);
    expect(component.pagedTransactions()[0].id).toBe('tx-21');
    expect(component.rangeStart()).toBe(21);

    component.goToPage(3);
    expect(component.pagedTransactions()).toHaveLength(5);
    expect(component.rangeEnd()).toBe(45);
  });

  it('não deve sair do intervalo de páginas válido', () => {
    setup(45);

    component.goToPage(99);
    expect(component.currentPage()).toBe(3);

    component.goToPage(-5);
    expect(component.currentPage()).toBe(1);
  });

  it('deve usar uma única página quando houver 20 itens ou menos', () => {
    setup(20);

    expect(component.totalPages()).toBe(1);
    expect(component.pagedTransactions()).toHaveLength(20);
  });

  it('deve voltar para a página 1 ao filtrar ou buscar', () => {
    setup(45);

    component.goToPage(3);
    component.onTypeFilterChange('income');
    expect(component.currentPage()).toBe(1);
    expect(component.totalItems()).toBe(22);

    component.goToPage(2);
    component.onSearchChange('Item 4');
    expect(component.currentPage()).toBe(1);
  });

  it('deve ajustar a página atual quando o total diminui', () => {
    setup(45);

    component.goToPage(3);
    finance.transactions.set(makeTransactions(30)); // simula exclusões

    expect(component.totalPages()).toBe(2);
    expect(component.currentPage()).toBe(2);
    expect(component.pagedTransactions()).toHaveLength(10);
  });

  it('deve mostrar reticências nas páginas distantes', () => {
    setup(200); // 10 páginas

    component.goToPage(5);
    expect(component.pageButtons()).toEqual([1, null, 4, 5, 6, null, 10]);

    component.goToPage(1);
    expect(component.pageButtons()).toEqual([1, 2, null, 10]);
  });

  it('deve funcionar sem nenhum item', () => {
    setup(0);

    expect(component.totalPages()).toBe(1);
    expect(component.pagedTransactions()).toEqual([]);
    expect(component.rangeStart()).toBe(0);
    expect(component.rangeEnd()).toBe(0);
  });
});
