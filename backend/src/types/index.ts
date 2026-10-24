export type UserRole = 'OPERATOR' | 'SUPERVISOR';

export type DocumentStatus = 'DRAFT' | 'IN_PROGRESS' | 'COMPLETED';

export type ItemStatus = 'PENDING' | 'PARTIAL' | 'COMPLETED';

export type TransactionType = 'INBOUND_RECEIVING';

export interface UserPayload {
  id: string;
  username: string;
  role: UserRole;
}

declare global {
  namespace Express {
    interface Request {
      user?: UserPayload;
    }
  }
}

export interface UserRow {
  id: string;
  username: string;
  password_hash: string;
  role: UserRole;
  created_at: Date;
  updated_at: Date;
}

export interface ProductRow {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  unit: string;
  created_at: Date;
  updated_at: Date;
}

export interface InventoryRow {
  id: string;
  product_id: string;
  quantity: number;
  updated_at: Date;
}

export interface ReceivingDocumentRow {
  id: string;
  doc_number: string;
  status: DocumentStatus;
  supervisor_id: string;
  created_at: Date;
  updated_at: Date;
}

export interface ReceivingItemRow {
  id: string;
  receiving_document_id: string;
  product_id: string;
  expected_quantity: number;
  received_quantity: number;
  status: ItemStatus;
  created_at: Date;
  updated_at: Date;
}

export interface InventoryTransactionRow {
  id: string;
  product_id: string;
  receiving_document_id: string;
  type: TransactionType;
  quantity: number;
  created_by: string;
  created_at: Date;
}
