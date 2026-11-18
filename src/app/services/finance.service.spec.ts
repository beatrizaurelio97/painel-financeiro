import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { FinanceService } from './finance.service';
import { FinanceApiService } from './finance-api.service';
import { Transaction } from '../models/transaction.model';

describe('FinanceService (Signals & Computed)', () => {
  let service: FinanceService;
  let httpTestingController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        FinanceService,
        FinanceApiService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });

    httpTestingController = TestBed.inject(HttpTestingController);
    service = TestBed.inject(FinanceService);

    // Responde às chamadas iniciais do constructor
    const reqTx = httpTestingController.expectOne('/api/transactions');
    reqTx.flush([]);

    const reqCat = httpTestingController.expectOne('/api/categories');
    reqCat.flush([]);
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('deve inicializar com saldo zerado', () => {
    expect(service.transactions()).toEqual([]);
    expect(service.summary().totalBalance).toBe(0);
    expect(service.summary().totalIncome).toBe(0);
    expect(service.summary().totalExpenses).toBe(0);
  });

  it('deve recalcular computed summary ao adicionar transação de receita', async () => {
    const mockTransaction: Transaction = {
      id: 'tx-1',
      description: 'Salário',
      amount: 5000,
      type: 'income',
      categoryId: 'salary',
      date: '2026-11-18',
      createdAt: new Date().toISOString()
    };

    const addPromise = service.addTransaction({
      description: 'Salário',
      amount: 5000,
      type: 'income',
      categoryId: 'salary',
      date: '2026-11-18'
    });

    const req = httpTestingController.expectOne('/api/transactions');
    expect(req.request.method).toBe('POST');
    req.flush(mockTransaction);

    await addPromise;

    expect(service.transactions().length).toBe(1);
    expect(service.summary().totalIncome).toBe(5000);
    expect(service.summary().totalBalance).toBe(5000);
    expect(service.summary().totalExpenses).toBe(0);
  });

  it('deve recalcular computed summary ao adicionar receita e despesa', async () => {
    const incomeTx: Transaction = {
      id: 'tx-1',
      description: 'Freelance',
      amount: 2000,
      type: 'income',
      categoryId: 'freelance',
      date: '2026-11-18',
      createdAt: new Date().toISOString()
    };

    const expenseTx: Transaction = {
      id: 'tx-2',
      description: 'Mercado',
      amount: 500,
      type: 'expense',
      categoryId: 'food',
      date: '2026-11-18',
      createdAt: new Date().toISOString()
    };

    const p1 = service.addTransaction({
      description: 'Freelance',
      amount: 2000,
      type: 'income',
      categoryId: 'freelance',
      date: '2026-11-18'
    });
    httpTestingController.expectOne('/api/transactions').flush(incomeTx);
    await p1;

    const p2 = service.addTransaction({
      description: 'Mercado',
      amount: 500,
      type: 'expense',
      categoryId: 'food',
      date: '2026-11-18'
    });
    httpTestingController.expectOne('/api/transactions').flush(expenseTx);
    await p2;

    expect(service.summary().totalIncome).toBe(2000);
    expect(service.summary().totalExpenses).toBe(500);
    expect(service.summary().totalBalance).toBe(1500);
    expect(service.summary().savingsRate).toBe(75); // (1500/2000)*100
  });
});
