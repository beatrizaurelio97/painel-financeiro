import {
  HttpErrorResponse,
  HttpEvent,
  HttpHandlerFn,
  HttpInterceptorFn,
  HttpRequest,
  HttpResponse
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, delay, of, throwError } from 'rxjs';
import { Transaction } from '../models/transaction.model';
import { FinanceApiStubService } from '../stubs/finance-api.stub';

export const mockApiInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> => {
  const { url, method } = req;

  // Interceptar apenas chamadas que apontem para /api
  if (!url.startsWith('/api')) {
    return next(req);
  }

  const stub = inject(FinanceApiStubService);

  // Registra a requisição no histórico do Stub para inspeção
  stub.recordRequest(method, url, req.body);

  const delayMs = stub.delayMs();
  const errorConfig = stub.errorConfig();

  // Verifica se o Stub foi configurado para simular um erro HTTP nesta rota
  if (
    errorConfig.enabled &&
    (!errorConfig.endpointFilter || url.includes(errorConfig.endpointFilter))
  ) {
    const errorResponse = new HttpErrorResponse({
      status: errorConfig.status,
      statusText: errorConfig.statusText,
      url,
      error: {
        error: errorConfig.statusText,
        message: errorConfig.message,
        statusCode: errorConfig.status
      }
    });

    return throwError(() => errorResponse).pipe(delay(delayMs));
  }

  // 1. GET /api/categories
  if (url === '/api/categories' && method === 'GET') {
    const data = stub.handleGetCategories();
    return of(new HttpResponse({ status: 200, body: data })).pipe(delay(delayMs));
  }

  // 2. GET /api/transactions
  if (url === '/api/transactions' && method === 'GET') {
    const data = stub.handleGetTransactions();
    return of(new HttpResponse({ status: 200, body: data })).pipe(delay(delayMs));
  }

  // 3. POST /api/transactions
  if (url === '/api/transactions' && method === 'POST') {
    const payload = req.body as Omit<Transaction, 'id' | 'createdAt'>;
    const created = stub.handleCreateTransaction(payload);
    return of(new HttpResponse({ status: 201, body: created })).pipe(delay(delayMs));
  }

  // PUT /api/transactions/:id
  if (url.startsWith('/api/transactions/') && method === 'PUT') {
    const id = url.split('/').pop() || '';
    const payload = req.body as Omit<Transaction, 'id' | 'createdAt'>;
    const updated = stub.handleUpdateTransaction(id, payload);

    if (!updated) {
      const notFound = new HttpErrorResponse({
        status: 404,
        statusText: 'Not Found',
        url,
        error: { error: 'Not Found', message: 'Transação não encontrada', statusCode: 404 }
      });
      return throwError(() => notFound).pipe(delay(delayMs));
    }

    return of(new HttpResponse({ status: 200, body: updated })).pipe(delay(delayMs));
  }

  // 4. DELETE /api/transactions/:id
  if (url.startsWith('/api/transactions/') && method === 'DELETE') {
    const id = url.split('/').pop() || '';
    const result = stub.handleDeleteTransaction(id);
    return of(new HttpResponse({ status: 200, body: result })).pipe(delay(delayMs));
  }

  // 5. POST /api/transactions/reset
  if (url === '/api/transactions/reset' && method === 'POST') {
    const data = stub.handleReset();
    return of(new HttpResponse({ status: 200, body: data })).pipe(delay(delayMs));
  }

  // Rota não mockada
  return next(req);
};
