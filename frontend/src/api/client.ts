import {
  User,
  Product,
  Category,
  Warehouse,
  Location,
  Operation,
  OperationLine,
  StockLedger,
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

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include', // Ensure HttpOnly session cookies are transmitted
  });

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

// --- Health API ---
export async function getHealth(): Promise<HealthStatus> {
  return request<HealthStatus>('/health');
}

// --- Auth API ---
export async function login(credentials: { email: string; password: string }): Promise<User> {
  const res = await request<ApiResponse<User>>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  });
  return res.data;
}

export async function signup(data: { name: string; email: string; password: string }): Promise<User> {
  const res = await request<ApiResponse<User>>('/auth/signup', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return res.data;
}

export async function logout(): Promise<void> {
  await request<ApiResponse<void>>('/auth/logout', { method: 'POST' });
}

export async function getMe(): Promise<User> {
  const res = await request<ApiResponse<User>>('/auth/me');
  return res.data;
}

export async function requestPasswordReset(email: string): Promise<{ success: boolean; message: string; debugEmailSent?: boolean }> {
  return request<{ success: boolean; message: string; debugEmailSent?: boolean }>('/auth/reset-password/request', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export async function verifyOtp(data: { email: string; otp: string }): Promise<{ success: boolean; message: string }> {
  return request<{ success: boolean; message: string }>('/auth/reset-password/verify', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function resetPassword(data: { email: string; otp: string; newPassword: string }): Promise<{ success: boolean; message: string }> {
  return request<{ success: boolean; message: string }>('/auth/reset-password/reset', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// --- Categories API ---
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

// --- Warehouses API ---
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

// --- Locations API ---
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

// --- Products API ---
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

// --- Receipts API ---
export async function getReceipts(status?: string, search?: string): Promise<Operation[]> {
  const params = new URLSearchParams();
  if (status && status !== 'ALL') params.append('status', status);
  if (search) params.append('search', search);
  const query = params.toString() ? `?${params.toString()}` : '';

  const res = await request<ApiResponse<Operation[]>>(`/receipts${query}`);
  return res.data;
}

export async function getReceipt(id: string): Promise<Operation> {
  const res = await request<ApiResponse<Operation>>(`/receipts/${id}`);
  return res.data;
}

export async function createReceipt(data: {
  partner: string;
  destLocationId: string;
  expectedDate?: string | null;
  notes?: string | null;
  lines?: { productId: string; demandQty: number; doneQty?: number }[];
}): Promise<Operation> {
  const res = await request<ApiResponse<Operation>>('/receipts', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return res.data;
}

export async function updateReceipt(
  id: string,
  data: {
    partner?: string;
    destLocationId?: string;
    expectedDate?: string | null;
    notes?: string | null;
    version: number;
  }
): Promise<Operation> {
  const res = await request<ApiResponse<Operation>>(`/receipts/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  return res.data;
}

export async function addReceiptLine(
  receiptId: string,
  data: {
    productId: string;
    demandQty: number;
    doneQty?: number;
  }
): Promise<OperationLine> {
  const res = await request<ApiResponse<OperationLine>>(`/receipts/${receiptId}/lines`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return res.data;
}

export async function updateReceiptLine(
  receiptId: string,
  lineId: string,
  data: {
    demandQty?: number;
    doneQty?: number;
  }
): Promise<OperationLine> {
  const res = await request<ApiResponse<OperationLine>>(`/receipts/${receiptId}/lines/${lineId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  return res.data;
}

export async function deleteReceiptLine(receiptId: string, lineId: string): Promise<void> {
  await request<ApiResponse<void>>(`/receipts/${receiptId}/lines/${lineId}`, {
    method: 'DELETE',
  });
}

export async function setAllReceiptLinesDone(receiptId: string): Promise<Operation> {
  const res = await request<ApiResponse<Operation>>(`/receipts/${receiptId}/set-all-done`, {
    method: 'POST',
  });
  return res.data;
}

export async function validateReceipt(receiptId: string, version: number, autoSetDoneIfZero = true): Promise<Operation> {
  const res = await request<ApiResponse<Operation>>(`/receipts/${receiptId}/validate`, {
    method: 'POST',
    body: JSON.stringify({ version, autoSetDoneIfZero }),
  });
  return res.data;
}

// --- Stock Ledger / Move History API ---
export async function getLedgerEntries(params?: {
  productId?: string;
  locationId?: string;
  referenceType?: string;
  search?: string;
}): Promise<StockLedger[]> {
  const searchParams = new URLSearchParams();
  if (params?.productId) searchParams.append('productId', params.productId);
  if (params?.locationId) searchParams.append('locationId', params.locationId);
  if (params?.referenceType) searchParams.append('referenceType', params.referenceType);
  if (params?.search) searchParams.append('search', params.search);
  const query = searchParams.toString() ? `?${searchParams.toString()}` : '';

  const res = await request<ApiResponse<StockLedger[]>>(`/ledger${query}`);
  return res.data;
}
