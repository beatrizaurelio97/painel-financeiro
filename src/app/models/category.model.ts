export type TransactionType = 'income' | 'expense';

export type CategoryId =
  | 'salary'
  | 'freelance'
  | 'investment'
  | 'food'
  | 'housing'
  | 'transport'
  | 'leisure'
  | 'health'
  | 'education'
  | 'other';

export interface Category {
  id: CategoryId;
  name: string;
  icon: string;
  color: string;
  type: TransactionType | 'both';
}

export const CATEGORIES: Category[] = [
  { id: 'salary', name: 'Salário', icon: '💰', color: '#10b981', type: 'income' },
  { id: 'freelance', name: 'Freelance', icon: '💻', color: '#06b6d4', type: 'income' },
  { id: 'investment', name: 'Investimentos', icon: '📈', color: '#8b5cf6', type: 'both' },
  { id: 'food', name: 'Alimentação', icon: '🍔', color: '#f59e0b', type: 'expense' },
  { id: 'housing', name: 'Moradia & Contas', icon: '🏠', color: '#ef4444', type: 'expense' },
  { id: 'transport', name: 'Transporte', icon: '🚗', color: '#6366f1', type: 'expense' },
  { id: 'leisure', name: 'Lazer & Entretenimento', icon: '🎉', color: '#ec4899', type: 'expense' },
  { id: 'health', name: 'Saúde', icon: '🏥', color: '#14b8a6', type: 'expense' },
  { id: 'education', name: 'Educação', icon: '📚', color: '#3b82f6', type: 'expense' },
  { id: 'other', name: 'Outros', icon: '📦', color: '#6b7280', type: 'both' }
];
