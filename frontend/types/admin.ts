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
  type: 'text' | 'number' | 'email' | 'password' | 'select' | 'textarea' | 'date' | 'checkbox' | 'file';
  required?: boolean;
  options?: { value: string | number; label: string }[];
  placeholder?: string;
  /** Fetch options dynamically from an API endpoint */
  fetchOptions?: {
    endpoint: string;
    valueKey: string;
    labelKey: string;
  };
  /** Upload endpoint for file fields (e.g. '/employee-documents/upload') */
  uploadEndpoint?: string;
  /** Accepted file types for file input (e.g. '.pdf,.doc,.docx') */
  accept?: string;
}

export interface CustomRowAction {
  key: string;
  label: string;
  title?: string;
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
  customRowActions?: CustomRowAction[];
  /** Show a "Download PDF" button in the page header for each row via row-level action */
  hasPdf?: boolean;
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
