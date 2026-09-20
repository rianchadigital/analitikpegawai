export type ColumnType = 
  | 'text' 
  | 'number' 
  | 'currency' 
  | 'percent' 
  | 'date' 
  | 'category' 
  | 'badge' 
  | 'formula';

export type AggregationType = 'sum' | 'avg' | 'min' | 'max' | 'count' | 'none';

export interface ColumnDef {
  id: string;
  name: string;
  type: ColumnType;
  width?: number;
  visible?: boolean;
  aggregation?: AggregationType;
  formula?: string; // e.g., "[qty] * [price]"
  options?: string[]; // for category/badge dropdown
}

export type RowData = {
  _id: string;
  [key: string]: any;
};

export type FilterOperator = 
  | 'contains' 
  | 'equals' 
  | 'starts_with' 
  | 'greater_than' 
  | 'less_than' 
  | 'is_empty' 
  | 'is_not_empty';

export interface FilterCondition {
  id: string;
  columnId: string;
  operator: FilterOperator;
  value: string;
}

export interface SortConfig {
  columnId: string;
  direction: 'asc' | 'desc';
}

export interface Sheet {
  id: string;
  name: string;
  description: string;
  icon?: string;
  columns: ColumnDef[];
  rows: RowData[];
  primaryMetricId?: string;
  primaryDateId?: string;
  primaryCategoryId?: string;
  updatedAt: string;
}

export interface AIAnalysisResult {
  executiveSummary: string;
  keyFindings: string[];
  anomalies: string[];
  actionableRecommendations: string[];
}

export type ActiveTab = 'sheet' | 'analytics' | 'pivot' | 'ai' | 'uraian_tugas' | 'struktur_organisasi';
