import { CategoryId, TransactionType } from './category.model';

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
