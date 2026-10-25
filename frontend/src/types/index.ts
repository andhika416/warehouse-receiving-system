export type UserRole = 'OPERATOR' | 'SUPERVISOR';

export interface User {
  id: string;
  username: string;
  role: UserRole;
  createdAt?: string;
}

export type DocumentStatus = 'DRAFT' | 'IN_PROGRESS' | 'COMPLETED';

export type ItemStatus = 'PENDING' | 'PARTIAL' | 'COMPLETED';

export interface Product {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  unit: string;
  current_stock?: number;
  created_at?: string;
  updated_at?: string;
}

export interface InventoryItem {
  id: string;
  product_id: string;
  sku: string;
  product_name: string;
  unit: string;
  description: string | null;
  quantity: number;
  updated_at: string;
}

export interface InventoryTransaction {
  id: string;
  product_id: string;
  sku: string;
  product_name: string;
  receiving_document_id: string;
  doc_number: string;
  type: string;
  quantity: number;
  created_by: string;
  operator_username: string;
  created_at: string;
}

export interface ReceivingItem {
  id: string;
  receiving_document_id: string;
  product_id: string;
  sku: string;
  product_name: string;
  unit: string;
  expected_quantity: number;
  received_quantity: number;
  remaining_quantity: number;
  status: ItemStatus;
  updated_at?: string;
}

export interface ReceivingDocumentSummary {
  id: string;
  doc_number: string;
  status: DocumentStatus;
  supervisor_username: string;
  total_items: number;
  completed_items: number;
  created_at: string;
}

export interface ReceivingDocumentDetail {
  id: string;
  doc_number: string;
  status: DocumentStatus;
  supervisor_id: string;
  supervisor_username: string;
  total_items: number;
  completed_items: number;
  created_at: string;
  updated_at: string;
  items: ReceivingItem[];
}

export interface StatusBreakdownItem {
  key: string;
  label: string;
  count: number;
  color: string;
  description: string;
}

export interface TopStockProduct {
  id?: string;
  sku: string;
  name: string;
  unit: string;
  quantity: number;
}

export interface DocumentProgressItem {
  id: string;
  doc_number: string;
  status: DocumentStatus;
  expected: number;
  received: number;
  percentage: number;
}

export interface ActiveDocumentQueueItem {
  id: string;
  doc_number: string;
  status: DocumentStatus;
  created_at: string;
  supervisor_username: string;
  total_items: number;
  completed_items: number;
  percentage: number;
}

export interface RecentTransactionItem {
  id: string;
  quantity: number;
  type: string;
  created_at: string;
  sku: string;
  product_name: string;
  unit: string;
  doc_number: string;
  operator_username: string;
}

export interface DashboardStats {
  summary: {
    totalProducts: number;
    totalPhysicalStock: number;
    activeDocuments: number;
    inProgressDocuments: number;
    draftDocuments: number;
    completedDocuments: number;
    totalDocuments: number;
    totalItems: number;
    completedItems: number;
    partialItems: number;
    pendingItems: number;
    fulfillmentRate: number;
    totalTransactions: number;
  };
  documentBreakdown: StatusBreakdownItem[];
  itemBreakdown: StatusBreakdownItem[];
  topStockProducts: TopStockProduct[];
  documentProgress: DocumentProgressItem[];
  activeDocuments: ActiveDocumentQueueItem[];
  recentTransactions: RecentTransactionItem[];
}

