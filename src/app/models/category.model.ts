export type TransactionType = 'income' | 'expense';

export type CategoryId = string;

export type CategoryGroupId = 'fixed' | 'variable' | 'non-essential' | 'income';

export interface Category {
  id: CategoryId;
  name: string;
  icon: string;
  color: string;
  type: TransactionType | 'both';
  groupId?: CategoryGroupId;
  groupName?: string;
  subgroupName?: string;
}

interface SubgroupDef {
  name: string;
  icon: string;
  items: string[];
}

export interface CategoryGroup {
  id: CategoryGroupId;
  name: string;
  type: TransactionType;
  color: string;
  subgroups: SubgroupDef[];
}

// Estrutura espelhada da planilha: Grupo > Subgrupo > Item
export const CATEGORY_GROUPS: CategoryGroup[] = [
  {
    id: 'fixed',
    name: 'Fixas',
    type: 'expense',
    color: '#2f6db5',
    subgroups: [
      { name: 'Serviços', icon: '🔌', items: ['Internet', 'Operadora', 'Seguro', 'Wellhub'] },
      { name: 'Moradia', icon: '🏠', items: ['Apartamento', 'Condomínio', 'Energia', 'Gás'] }
    ]
  },
  {
    id: 'variable',
    name: 'Variáveis',
    type: 'expense',
    color: '#4e9a3a',
    subgroups: [
      { name: 'Transporte', icon: '🚗', items: ['Metrô', 'Ônibus', 'Uber'] },
      { name: 'Alimentação', icon: '🍔', items: ['Aplicativo', 'Alimento', 'Refeição'] },
      { name: 'Saúde', icon: '🏥', items: ['Farmácia'] }
    ]
  },
  {
    id: 'non-essential',
    name: 'Não essenciais',
    type: 'expense',
    color: '#e08a3c',
    subgroups: [
      { name: 'Pessoal', icon: '🛍️', items: ['Acessórios', 'Casa', 'Estética', 'Vestuário'] },
      { name: 'Lazer', icon: '🎉', items: ['Cinema', 'Show', 'Viagem'] },
      { name: 'Ocasional', icon: '🎁', items: ['Presente', 'Variado'] }
    ]
  },
  {
    id: 'income',
    name: 'Receitas',
    type: 'income',
    color: '#0f2a6b',
    subgroups: [
      { name: 'Saldo', icon: '🍽️', items: ['Vale Refeição', 'Vale Alimentação'] },
      { name: 'Descontos', icon: '🧾', items: ['Contr. INSS + ass.', 'Tributo IRRF', 'Coparticipação'] },
      { name: 'Salário', icon: '💰', items: ['Bruto', 'Quinzenal', 'Mensal', 'Bônus'] }
    ]
  }
];

function slug(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function categoryIdFor(groupId: CategoryGroupId, subgroupName: string, itemName: string): CategoryId {
  return `${groupId}-${slug(subgroupName)}-${slug(itemName)}`;
}

export const CATEGORIES: Category[] = CATEGORY_GROUPS.flatMap(group =>
  group.subgroups.flatMap(sub =>
    sub.items.map<Category>(item => ({
      id: categoryIdFor(group.id, sub.name, item),
      name: item,
      icon: sub.icon,
      color: group.color,
      type: group.type,
      groupId: group.id,
      groupName: group.name,
      subgroupName: sub.name
    }))
  )
);
