import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent),
    title: 'Visão Geral - FinTrack'
  },
  {
    path: 'transacoes',
    loadComponent: () =>
      import('./pages/transactions/transactions.component').then(m => m.TransactionsComponent),
    title: 'Histórico de Transações - FinTrack'
  },
  {
    path: 'relatorios',
    loadComponent: () =>
      import('./pages/reports/reports.component').then(m => m.ReportsComponent),
    title: 'Distribuição de Despesas - FinTrack'
  },
  {
    path: '**',
    redirectTo: ''
  }
];
