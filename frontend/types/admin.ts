import { ReactNode } from 'react';

export interface ColumnDef<T = Record<string, unknown>> {
  key: keyof T & string;
  header: string;
  sortable?: boolean;
  render?: (value: unknown, row: T) => ReactNode;
  width?: string;
}

export interface FormField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'email' | 'select' | 'textarea' | 'date' | 'checkbox';
  required?: boolean;
  options?: { value: string; label: string }[];
  placeholder?: string;
}

export interface CrudModuleConfig {
  slug: string;
  title: string;
  apiEndpoint: string;
  columns: ColumnDef[];
  formFields: FormField[];
  searchField?: string;
  canCreate?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
}

export interface ModuleCategory {
  name: string;
  modules: CrudModuleConfig[];
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export type ErrorCategory = 'network' | 'auth' | 'service' | 'database' | 'unknown';

export interface DiagnosticError {
  category: ErrorCategory;
  service: string;
  message: string;
  timestamp: string;
  suggestion: string;
}
