export type TransactionStatus = 'COMPLETED' | 'CANCELLED' | 'REFUNDED' | 'PARTIAL_REFUND';

export type ImportStatus = 'PROCESSING' | 'COMPLETED' | 'COMPLETED_WITH_ERRORS' | 'FAILED';

export interface F04Page<T> {
  content: T[];
  page: number;
  pageSize: number;
  totalElements: number;
}

export interface ImportSummary {
  importBatchId: number;
  status: ImportStatus;
  filename: string | null;
  startedAt: string;
  finishedAt: string | null;
  totalCount: number;
  validCount: number;
  rejectedCount: number;
  totalOrderCount: number;
  acceptedOrderCount: number;
  rejectedOrderCount: number;
  duplicateOrderCount: number;
  conflictOrderCount: number;
  errorSummary: string | null;
}

export interface ImportError {
  rowNumber: number;
  sourceOrderId: string | null;
  status: string;
  errorDetails: string | null;
}

export interface TransactionLine {
  transactionItemId: number;
  productId: number;
  sku: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  unitCost: number;
}

export interface TransactionView {
  transactionId: number;
  sourceSystem: string;
  sourceOrderId: string;
  occurredAt: string;
  status: TransactionStatus;
  f03Eligible: boolean;
  totalAmount: number;
  /** The list endpoint returns an empty array; getTransaction returns the lines. */
  items: TransactionLine[];
}

export interface TransactionFilters {
  status?: TransactionStatus;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}
