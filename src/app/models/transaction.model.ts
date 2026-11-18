import { Category, CategoryGroupId, CategoryId, TransactionType } from './category.model';

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: TransactionType;
  categoryId: CategoryId;
  date: string; // ISO format (YYYY-MM-DD)
  notes?: string;
  createdAt: string;
}

export interface FinancialSummary {
  totalBalance: number;
  totalIncome: number;
  totalExpenses: number;
  savingsRate: number; // Porcentagem economizada
  transactionCount: number;
}

export interface CategorySummary {
  categoryId: CategoryId;
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
  total: number;
  percentage: number;
}

// Relatório anual no formato da planilha (12 colunas de meses)
export interface ReportRow {
  category: Category;
  months: number[];
  total: number;
}

export interface ReportSubgroup {
  name: string;
  rows: ReportRow[];
}

export interface ReportGroup {
  id: CategoryGroupId;
  name: string;
  color: string;
  subgroups: ReportSubgroup[];
  rowCount: number;
  months: number[];
  total: number;
}

export interface YearlyReport {
  year: number;
  expenseGroups: ReportGroup[];
  incomeGroups: ReportGroup[];
  expenseMonths: number[];
  incomeMonths: number[];
  balanceMonths: number[];
  expenseTotal: number;
  incomeTotal: number;
  profit: number;
}
