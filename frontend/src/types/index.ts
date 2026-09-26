export interface User {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'INVENTORY_MANAGER' | 'WAREHOUSE_STAFF';
  isActive: boolean;
  createdAt?: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: { products: number };
}

export interface Warehouse {
  id: string;
  name: string;
  code: string;
  address?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: { locations: number };
  locations?: Location[];
}

export interface Location {
  id: string;
  name: string;
  code: string;
  warehouseId: string;
  warehouse?: { id: string; name: string; code: string };
  isScrap: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: { stockBalances: number };
  stockBalances?: StockBalance[];
}

export interface StockBalance {
  id: string;
  productId: string;
  locationId: string;
  quantity: number;
  updatedAt: string;
  location?: Location;
  product?: Product;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  categoryId: string;
  category?: Category;
  uom: string;
  reorderThreshold: number;
  description?: string | null;
  isActive: boolean;
  totalStock?: number;
  isLowStock?: boolean;
  isOutOfStock?: boolean;
  shortage?: number;
  suggestedReplenishment?: number;
  stockBalances?: StockBalance[];
  balances?: StockBalance[];
  createdAt: string;
  updatedAt: string;
}

export interface OperationLine {
  id: string;
  operationId: string;
  productId: string;
  product?: Product;
  demandQty: number;
  doneQty: number;
  destLocationId?: string | null;
  sourceLocationId?: string | null;
  balanceSnapshot?: number | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Operation {
  id: string;
  reference: string;
  type: 'RECEIPT' | 'DELIVERY' | 'INTERNAL_TRANSFER' | 'ADJUSTMENT';
  status: 'DRAFT' | 'WAITING' | 'READY' | 'DONE' | 'CANCELED';
  version: number;
  partner?: string | null;
  expectedDate?: string | null;
  destLocationId?: string | null;
  destLocation?: Location | null;
  sourceLocationId?: string | null;
  sourceLocation?: Location | null;
  notes?: string | null;
  createdById?: string | null;
  createdBy?: User | null;
  validatedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  lines?: OperationLine[];
  _count?: { lines: number };
}

export interface StockLedger {
  id: string;
  operationId?: string | null;
  operation?: Operation | null;
  productId: string;
  product?: Product;
  locationId: string;
  location?: Location;
  deltaQty: number;
  balanceAfter: number;
  referenceType: string;
  referenceDoc: string;
  actorId?: string | null;
  actor?: User | null;
  notes?: string | null;
  createdAt: string;
}

export interface DashboardStats {
  filteredOperations?: Pick<Operation, 'id' | 'reference' | 'type' | 'status' | 'partner' | 'expectedDate'>[];
  products: {
    total: number;
    inStock: number;
    outOfStock?: number;
    lowStock: number;
  };
  operations: {
    receipts: { total: number; pending?: number; thisWeek: number };
    deliveries: { total: number; pending: number };
    transfers: { total: number; pending: number; scheduled?: number };
    adjustments: { total: number; pending: number };
  };
  warehouses: number;
  ledgerMoves: number;
  recentMoves: StockLedger[];
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  details?: Record<string, string[]>;
}

export interface HealthStatus {
  status: string;
  app: string;
  stage: string;
  uptime: number;
  timestamp: string;
}
