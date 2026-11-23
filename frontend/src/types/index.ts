export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'STAFF';

export interface User {
  id: string;
  fullName: string;
  email: string;
  roleId: number;
  role: UserRole;
  status: 'ACTIVE' | 'INACTIVE';
  avatarUrl?: string;
  isGoogleAccount?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Category {
  id: number;
  name: string;
  description?: string;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  category_id: number;
  category_name?: string;
  description?: string;
  unit_price: number | string;
  stock_quantity: number;
  low_stock_threshold: number;
  created_at: string;
  updated_at: string;
  created_by_name?: string;
  updated_by_name?: string;
  created_by_email?: string;
  stock_status?: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
  transactions?: InventoryTransaction[];
}

export type TransactionType = 'RESTOCK' | 'DAMAGE' | 'LOSS' | 'SALE' | 'RETURN' | 'ADJUSTMENT' | 'INITIAL';

export interface InventoryTransaction {
  id: string;
  product_id: string;
  product_name?: string;
  product_sku?: string;
  user_id?: string;
  user_name?: string;
  transaction_type: TransactionType;
  quantity_change: number;
  previous_quantity: number;
  new_quantity: number;
  reason: string;
  notes?: string;
  created_at: string;
}

export interface NotificationItem {
  id: string;
  user_id?: string;
  type: 'LOW_STOCK' | 'OUT_OF_STOCK' | 'PRODUCT_CREATED' | 'PRODUCT_UPDATED' | 'STOCK_ADJUSTED' | 'SYSTEM_ALERT';
  title: string;
  message: string;
  link?: string;
  is_read: boolean;
  created_at: string;
}

export interface AuditLog {
  id: string;
  actor_user_id?: string;
  actor_email?: string;
  actor_name?: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  details?: Record<string, any>;
  ip_address?: string;
  created_at: string;
}

export interface DashboardSummary {
  totalProducts: number;
  totalCategories: number;
  totalStockUnits: number;
  totalValuation: number;
  lowStockCount: number;
  outOfStockCount: number;
  inStockCount: number;
  categories: {
    id: number;
    name: string;
    product_count: number;
    total_units: number;
    valuation: string | number;
  }[];
}

export interface PaginationMeta {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  limit: number;
}

