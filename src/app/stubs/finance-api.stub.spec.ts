import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors, withXhr } from '@angular/common/http';
import { FinanceApiStubService } from './finance-api.stub';
import { mockApiInterceptor } from '../interceptors/mock-api.interceptor';
import { Transaction } from '../models/transaction.model';

describe('FinanceApiStubService & Mock Control', () => {
  let stub: FinanceApiStubService;
  let httpClient: HttpClient;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        FinanceApiStubService,
        provideHttpClient(withXhr(), withInterceptors([mockApiInterceptor]))
      ]
    });

    stub = TestBed.inject(FinanceApiStubService);
    httpClient = TestBed.inject(HttpClient);

    // Configura delay zero para testes instantâneos
    stub.setDelay(0);
    stub.reset();
  });

  it('deve permitir injetar dados customizados no Stub e retornar via HTTP GET', (done) => {
    const customData: Transaction[] = [
      {
        id: 'stub-1',
        description: 'Bônus Anual',
        amount: 10000,
        type: 'income',
        categoryId: 'salary',
        date: '2026-11-18',
        createdAt: new Date().toISOString()
      }
    ];

    // Injeta dados no Stub programaticamente
    stub.setTransactions(customData);

    httpClient.get<Transaction[]>('/api/transactions').subscribe({
      next: (res) => {
        expect(res.length).toBe(1);
        expect(res[0].description).toBe('Bônus Anual');
        expect(res[0].amount).toBe(10000);
        expect(stub.lastRequest()?.method).toBe('GET');
        expect(stub.lastRequest()?.url).toBe('/api/transactions');
        done();
      },
      error: done.fail
    });
  });

  it('deve simular erro HTTP 500 controlado quando configurado', (done) => {
    // Configura o Stub para forçar erro 500
    stub.simulateHttpError(500, 'Servidor temporariamente indisponível');

    httpClient.get('/api/transactions').subscribe({
      next: () => done.fail('A requisição deveria ter falhado com erro 500'),
      error: (error) => {
        expect(error.status).toBe(500);
        expect(error.statusText).toBe('Internal Server Error');
        expect(error.error.message).toBe('Servidor temporariamente indisponível');
        done();
      }
    });
  });

  it('deve simular erro apenas em endpoint específico quando filtrado', (done) => {
    // Falha apenas no POST de transações, mas permite o GET de categorias
    stub.simulateHttpError(400, 'Dados inválidos', '/transactions');

    // GET categories deve funcionar (200)
    httpClient.get('/api/categories').subscribe({
      next: (categories) => {
        expect(Array.isArray(categories)).toBe(true);

        // POST transactions deve falhar (400)
        httpClient.post('/api/transactions', { description: 'Teste' }).subscribe({
          next: () => done.fail('Deveria ter falhado'),
          error: (err) => {
            expect(err.status).toBe(400);
            expect(err.error.message).toBe('Dados inválidos');
            done();
          }
        });
      },
      error: done.fail
    });
  });

  it('deve registrar o histórico de todas as requisições interceptadas', (done) => {
    stub.clearRequestHistory();

    httpClient.get('/api/categories').subscribe(() => {
      httpClient.post('/api/transactions', {
        description: 'Cinema',
        amount: 45,
        type: 'expense',
        categoryId: 'leisure',
        date: '2026-11-18'
      }).subscribe(() => {
        const history = stub.requestHistory();
        expect(history.length).toBe(2);
        expect(history[0].method).toBe('GET');
        expect(history[0].url).toBe('/api/categories');
        expect(history[1].method).toBe('POST');
        expect(history[1].url).toBe('/api/transactions');
        expect(stub.lastRequest()?.method).toBe('POST');
        done();
      });
    });
  });

  it('deve atualizar uma transação via PUT preservando id e createdAt', (done) => {
    const original: Transaction = {
      id: 'stub-1',
      description: 'Internet',
      amount: 100,
      type: 'expense',
      categoryId: 'fixed-servicos-internet',
      date: '2026-11-01',
      createdAt: '2026-11-01T10:00:00.000Z'
    };
    stub.setTransactions([original]);

    httpClient
      .put<Transaction>('/api/transactions/stub-1', {
        description: 'Internet fibra',
        amount: 120,
        type: 'expense',
        categoryId: 'fixed-servicos-internet',
        date: '2026-11-05'
      })
      .subscribe({
        next: (res) => {
          expect(res.id).toBe('stub-1');
          expect(res.createdAt).toBe(original.createdAt);
          expect(res.amount).toBe(120);
          expect(stub.transactions()[0].description).toBe('Internet fibra');
          done();
        },
        error: done.fail
      });
  });

  it('deve responder 404 ao atualizar uma transação inexistente', (done) => {
    httpClient
      .put('/api/transactions/nao-existe', {
        description: 'x',
        amount: 1,
        type: 'expense',
        categoryId: 'a',
        date: '2026-01-01'
      })
      .subscribe({
        next: () => done.fail('deveria falhar com 404'),
        error: (error) => {
          expect(error.status).toBe(404);
          done();
        }
      });
  });
});
