export interface Category {
  id: string;
  name: string;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: {
    products: number;
  };
}

export interface Warehouse {
  id: string;
  name: string;
  code: string;
  address?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    locations: number;
  };
  locations?: Location[];
}

export interface Location {
  id: string;
  name: string;
  code: string;
  warehouseId: string;
  warehouse?: {
    id: string;
    name: string;
    code: string;
  };
  isScrap: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    stockBalances: number;
  };
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
  stockBalances?: StockBalance[];
  createdAt: string;
  updatedAt: string;
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
