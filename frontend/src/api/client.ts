import {
  Product,
  Category,
  Warehouse,
  Location,
  ApiResponse,
  HealthStatus,
} from '../types';

const API_BASE = '/api';

export class ApiError extends Error {
  statusCode: number;
  details?: Record<string, string[]>;

  constructor(message: string, statusCode: number, details?: Record<string, string[]>) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(options.headers || {}),
  };

  const response = await fetch(url, { ...options, headers });

  if (!response.ok) {
    let errorData: any = {};
    try {
      errorData = await response.json();
    } catch {
      errorData = { message: response.statusText || 'An unexpected error occurred' };
    }

    throw new ApiError(
      errorData.message || 'Request failed',
      response.status,
      errorData.details
    );
  }

  return response.json();
}

// Health API
export async function getHealth(): Promise<HealthStatus> {
  return request<HealthStatus>('/health');
}

// Categories API
export async function getCategories(): Promise<Category[]> {
  const res = await request<ApiResponse<Category[]>>('/categories');
  return res.data;
}

export async function createCategory(data: { name: string; description?: string }): Promise<Category> {
  const res = await request<ApiResponse<Category>>('/categories', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return res.data;
}

// Warehouses API
export async function getWarehouses(): Promise<Warehouse[]> {
  const res = await request<ApiResponse<Warehouse[]>>('/warehouses');
  return res.data;
}

export async function getWarehouse(id: string): Promise<Warehouse> {
  const res = await request<ApiResponse<Warehouse>>(`/warehouses/${id}`);
  return res.data;
}

export async function createWarehouse(data: {
  name: string;
  code: string;
  address?: string | null;
  isActive?: boolean;
}): Promise<Warehouse> {
  const res = await request<ApiResponse<Warehouse>>('/warehouses', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return res.data;
}

export async function updateWarehouse(
  id: string,
  data: {
    name: string;
    code: string;
    address?: string | null;
    isActive?: boolean;
  }
): Promise<Warehouse> {
  const res = await request<ApiResponse<Warehouse>>(`/warehouses/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  return res.data;
}

// Locations API
export async function getLocations(warehouseId?: string): Promise<Location[]> {
  const query = warehouseId ? `?warehouseId=${encodeURIComponent(warehouseId)}` : '';
  const res = await request<ApiResponse<Location[]>>(`/locations${query}`);
  return res.data;
}

export async function getLocation(id: string): Promise<Location> {
  const res = await request<ApiResponse<Location>>(`/locations/${id}`);
  return res.data;
}

export async function createLocation(data: {
  name: string;
  code: string;
  warehouseId: string;
  isScrap?: boolean;
  isActive?: boolean;
}): Promise<Location> {
  const res = await request<ApiResponse<Location>>('/locations', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return res.data;
}

export async function updateLocation(
  id: string,
  data: {
    name: string;
    code: string;
    warehouseId: string;
    isScrap?: boolean;
    isActive?: boolean;
  }
): Promise<Location> {
  const res = await request<ApiResponse<Location>>(`/locations/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  return res.data;
}

// Products API
export async function getProducts(search?: string, categoryId?: string): Promise<Product[]> {
  const params = new URLSearchParams();
  if (search) params.append('search', search);
  if (categoryId) params.append('categoryId', categoryId);
  const query = params.toString() ? `?${params.toString()}` : '';

  const res = await request<ApiResponse<Product[]>>(`/products${query}`);
  return res.data;
}

export async function getProduct(id: string): Promise<Product> {
  const res = await request<ApiResponse<Product>>(`/products/${id}`);
  return res.data;
}

export async function createProduct(data: {
  name: string;
  sku: string;
  categoryId: string;
  uom: string;
  reorderThreshold: number;
  description?: string | null;
  isActive?: boolean;
}): Promise<Product> {
  const res = await request<ApiResponse<Product>>('/products', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return res.data;
}

export async function updateProduct(
  id: string,
  data: {
    name: string;
    sku: string;
    categoryId: string;
    uom: string;
    reorderThreshold: number;
    description?: string | null;
    isActive?: boolean;
  }
): Promise<Product> {
  const res = await request<ApiResponse<Product>>(`/products/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  return res.data;
}
