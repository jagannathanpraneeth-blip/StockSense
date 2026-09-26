import {
  User,
  Product,
  Category,
  Warehouse,
  Location,
  Operation,
  OperationLine,
  StockLedger,
  DashboardStats,
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

  const response = await fetch(url, { ...options, headers, credentials: 'include' });

  if (!response.ok) {
    if (response.status === 401 && (!endpoint.startsWith('/auth/') || endpoint === '/auth/me')) {
      window.dispatchEvent(new Event('stocksense:session-expired'));
    }
    let errorData: any = {};
    try { errorData = await response.json(); }
    catch { errorData = { message: response.statusText || 'An unexpected error occurred' }; }
    throw new ApiError(errorData.message || 'Request failed', response.status, errorData.details);
  }

  return response.json();
}

// ─── Health ─────────────────────────────────────────────────────────────────
export async function getHealth(): Promise<HealthStatus> {
  return request<HealthStatus>('/health');
}

// ─── Auth ────────────────────────────────────────────────────────────────────
export async function login(credentials: { email: string; password: string }): Promise<User> {
  const res = await request<ApiResponse<User>>('/auth/login', { method: 'POST', body: JSON.stringify(credentials) });
  return res.data;
}
export async function signup(data: { name: string; email: string; password: string }): Promise<User> {
  const res = await request<ApiResponse<User>>('/auth/signup', { method: 'POST', body: JSON.stringify(data) });
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
  return request('/auth/reset-password/request', { method: 'POST', body: JSON.stringify({ email }) });
}
export async function verifyOtp(data: { email: string; otp: string }): Promise<{ success: boolean; message: string }> {
  return request('/auth/reset-password/verify', { method: 'POST', body: JSON.stringify(data) });
}
export async function resetPassword(data: { email: string; otp: string; newPassword: string }): Promise<{ success: boolean; message: string }> {
  return request('/auth/reset-password/reset', { method: 'POST', body: JSON.stringify(data) });
}

// ─── Dashboard ───────────────────────────────────────────────────────────────
export async function getDashboardStats(warehouseId?: string, categoryId?: string, filters: { locationId?: string; type?: string; status?: string } = {}): Promise<DashboardStats> {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) if (value) params.append(key, value);
  if (warehouseId) params.append('warehouseId', warehouseId);
  if (categoryId) params.append('categoryId', categoryId);
  const query = params.toString() ? `?${params}` : '';
  const res = await request<ApiResponse<DashboardStats>>(`/dashboard${query}`);
  return res.data;
}

// ─── Categories ──────────────────────────────────────────────────────────────
export async function getCategories(): Promise<Category[]> {
  const res = await request<ApiResponse<Category[]>>('/categories');
  return res.data;
}
export async function createCategory(data: { name: string; description?: string }): Promise<Category> {
  const res = await request<ApiResponse<Category>>('/categories', { method: 'POST', body: JSON.stringify(data) });
  return res.data;
}

// ─── Warehouses ──────────────────────────────────────────────────────────────
export async function getWarehouses(): Promise<Warehouse[]> {
  const res = await request<ApiResponse<Warehouse[]>>('/warehouses');
  return res.data;
}
export async function getWarehouse(id: string): Promise<Warehouse> {
  const res = await request<ApiResponse<Warehouse>>(`/warehouses/${id}`);
  return res.data;
}
export async function createWarehouse(data: { name: string; code: string; address?: string | null; isActive?: boolean }): Promise<Warehouse> {
  const res = await request<ApiResponse<Warehouse>>('/warehouses', { method: 'POST', body: JSON.stringify(data) });
  return res.data;
}
export async function updateWarehouse(id: string, data: { name: string; code: string; address?: string | null; isActive?: boolean }): Promise<Warehouse> {
  const res = await request<ApiResponse<Warehouse>>(`/warehouses/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  return res.data;
}

// ─── Locations ───────────────────────────────────────────────────────────────
export async function getLocations(warehouseId?: string): Promise<Location[]> {
  const query = warehouseId ? `?warehouseId=${encodeURIComponent(warehouseId)}` : '';
  const res = await request<ApiResponse<Location[]>>(`/locations${query}`);
  return res.data;
}
export async function getLocation(id: string): Promise<Location> {
  const res = await request<ApiResponse<Location>>(`/locations/${id}`);
  return res.data;
}
export async function createLocation(data: { name: string; code: string; warehouseId: string; isScrap?: boolean; isActive?: boolean }): Promise<Location> {
  const res = await request<ApiResponse<Location>>('/locations', { method: 'POST', body: JSON.stringify(data) });
  return res.data;
}
export async function updateLocation(id: string, data: { name: string; code: string; warehouseId: string; isScrap?: boolean; isActive?: boolean }): Promise<Location> {
  const res = await request<ApiResponse<Location>>(`/locations/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  return res.data;
}

// ─── Products ─────────────────────────────────────────────────────────────────
export async function getProducts(search?: string, categoryId?: string): Promise<Product[]> {
  const params = new URLSearchParams();
  if (search) params.append('search', search);
  if (categoryId) params.append('categoryId', categoryId);
  const query = params.toString() ? `?${params}` : '';
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
  initialStock?: number;
  initialLocationId?: string | null;
}): Promise<Product> {
  const res = await request<ApiResponse<Product>>('/products', { method: 'POST', body: JSON.stringify(data) });
  return res.data;
}
export async function updateProduct(id: string, data: { name: string; sku: string; categoryId: string; uom: string; reorderThreshold: number; description?: string | null; isActive?: boolean }): Promise<Product> {
  const res = await request<ApiResponse<Product>>(`/products/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  return res.data;
}

// ─── Receipts ─────────────────────────────────────────────────────────────────
export async function getReceipts(status?: string, search?: string): Promise<Operation[]> {
  const params = new URLSearchParams();
  if (status && status !== 'ALL') params.append('status', status);
  if (search) params.append('search', search);
  const query = params.toString() ? `?${params}` : '';
  const res = await request<ApiResponse<Operation[]>>(`/receipts${query}`);
  return res.data;
}
export async function getReceipt(id: string): Promise<Operation> {
  const res = await request<ApiResponse<Operation>>(`/receipts/${id}`);
  return res.data;
}
export async function createReceipt(data: { partner: string; destLocationId: string; expectedDate?: string | null; notes?: string | null; lines?: { productId: string; demandQty: number; doneQty?: number }[] }): Promise<Operation> {
  const res = await request<ApiResponse<Operation>>('/receipts', { method: 'POST', body: JSON.stringify(data) });
  return res.data;
}
export async function updateReceipt(id: string, data: { partner?: string; destLocationId?: string; expectedDate?: string | null; notes?: string | null; version: number }): Promise<Operation> {
  const res = await request<ApiResponse<Operation>>(`/receipts/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  return res.data;
}
export async function addReceiptLine(receiptId: string, data: { productId: string; demandQty: number; doneQty?: number }): Promise<OperationLine> {
  const res = await request<ApiResponse<OperationLine>>(`/receipts/${receiptId}/lines`, { method: 'POST', body: JSON.stringify(data) });
  return res.data;
}
export async function updateReceiptLine(receiptId: string, lineId: string, data: { demandQty?: number; doneQty?: number }): Promise<OperationLine> {
  const res = await request<ApiResponse<OperationLine>>(`/receipts/${receiptId}/lines/${lineId}`, { method: 'PUT', body: JSON.stringify(data) });
  return res.data;
}
export async function deleteReceiptLine(receiptId: string, lineId: string): Promise<void> {
  await request<ApiResponse<void>>(`/receipts/${receiptId}/lines/${lineId}`, { method: 'DELETE' });
}
export async function setAllReceiptLinesDone(receiptId: string): Promise<Operation> {
  const res = await request<ApiResponse<Operation>>(`/receipts/${receiptId}/set-all-done`, { method: 'POST' });
  return res.data;
}
export async function validateReceipt(receiptId: string, version: number, autoSetDoneIfZero = true): Promise<Operation> {
  const res = await request<ApiResponse<Operation>>(`/receipts/${receiptId}/validate`, { method: 'POST', body: JSON.stringify({ version, autoSetDoneIfZero }) });
  return res.data;
}

// ─── Deliveries ───────────────────────────────────────────────────────────────
export async function getDeliveries(status?: string, search?: string): Promise<Operation[]> {
  const params = new URLSearchParams();
  if (status && status !== 'ALL') params.append('status', status);
  if (search) params.append('search', search);
  const query = params.toString() ? `?${params}` : '';
  const res = await request<ApiResponse<Operation[]>>(`/deliveries${query}`);
  return res.data;
}
export async function getDelivery(id: string): Promise<Operation> {
  const res = await request<ApiResponse<Operation>>(`/deliveries/${id}`);
  return res.data;
}
export async function createDelivery(data: { partner: string; sourceLocationId: string; expectedDate?: string | null; notes?: string | null; lines?: { productId: string; demandQty: number }[] }): Promise<Operation> {
  const res = await request<ApiResponse<Operation>>('/deliveries', { method: 'POST', body: JSON.stringify(data) });
  return res.data;
}
export async function updateDelivery(id: string, data: { partner?: string; sourceLocationId?: string; expectedDate?: string | null; notes?: string | null; version: number }): Promise<Operation> {
  const res = await request<ApiResponse<Operation>>(`/deliveries/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  return res.data;
}
export async function addDeliveryLine(deliveryId: string, data: { productId: string; demandQty: number }): Promise<OperationLine> {
  const res = await request<ApiResponse<OperationLine>>(`/deliveries/${deliveryId}/lines`, { method: 'POST', body: JSON.stringify(data) });
  return res.data;
}
export async function updateDeliveryLine(deliveryId: string, lineId: string, data: { demandQty?: number; doneQty?: number }): Promise<OperationLine> {
  const res = await request<ApiResponse<OperationLine>>(`/deliveries/${deliveryId}/lines/${lineId}`, { method: 'PUT', body: JSON.stringify(data) });
  return res.data;
}
export async function deleteDeliveryLine(deliveryId: string, lineId: string): Promise<void> {
  await request<ApiResponse<void>>(`/deliveries/${deliveryId}/lines/${lineId}`, { method: 'DELETE' });
}
export async function startDeliveryPicking(deliveryId: string): Promise<Operation> {
  const res = await request<ApiResponse<Operation>>(`/deliveries/${deliveryId}/start-picking`, { method: 'POST' });
  return res.data;
}
export async function markDeliveryReady(deliveryId: string): Promise<Operation> {
  const res = await request<ApiResponse<Operation>>(`/deliveries/${deliveryId}/mark-ready`, { method: 'POST' });
  return res.data;
}
export async function validateDelivery(deliveryId: string, version: number): Promise<Operation> {
  const res = await request<ApiResponse<Operation>>(`/deliveries/${deliveryId}/validate`, { method: 'POST', body: JSON.stringify({ version }) });
  return res.data;
}
export async function cancelDelivery(deliveryId: string): Promise<Operation> {
  const res = await request<ApiResponse<Operation>>(`/deliveries/${deliveryId}/cancel`, { method: 'POST' });
  return res.data;
}

// ─── Transfers ────────────────────────────────────────────────────────────────
export async function getTransfers(status?: string, search?: string): Promise<Operation[]> {
  const params = new URLSearchParams();
  if (status && status !== 'ALL') params.append('status', status);
  if (search) params.append('search', search);
  const query = params.toString() ? `?${params}` : '';
  const res = await request<ApiResponse<Operation[]>>(`/transfers${query}`);
  return res.data;
}
export async function getTransfer(id: string): Promise<Operation> {
  const res = await request<ApiResponse<Operation>>(`/transfers/${id}`);
  return res.data;
}
export async function createTransfer(data: { sourceLocationId: string; destLocationId: string; expectedDate?: string | null; notes?: string | null; lines: { productId: string; demandQty: number }[] }): Promise<Operation> {
  const res = await request<ApiResponse<Operation>>('/transfers', { method: 'POST', body: JSON.stringify(data) });
  return res.data;
}
export async function addTransferLine(transferId: string, data: { productId: string; demandQty: number }): Promise<OperationLine> {
  const res = await request<ApiResponse<OperationLine>>(`/transfers/${transferId}/lines`, { method: 'POST', body: JSON.stringify(data) });
  return res.data;
}
export async function deleteTransferLine(transferId: string, lineId: string): Promise<void> {
  await request<ApiResponse<void>>(`/transfers/${transferId}/lines/${lineId}`, { method: 'DELETE' });
}
export async function validateTransfer(transferId: string, version: number): Promise<Operation> {
  const res = await request<ApiResponse<Operation>>(`/transfers/${transferId}/validate`, { method: 'POST', body: JSON.stringify({ version }) });
  return res.data;
}
export async function cancelTransfer(transferId: string): Promise<Operation> {
  const res = await request<ApiResponse<Operation>>(`/transfers/${transferId}/cancel`, { method: 'POST' });
  return res.data;
}

// ─── Adjustments ──────────────────────────────────────────────────────────────
export async function getAdjustments(status?: string, search?: string): Promise<Operation[]> {
  const params = new URLSearchParams();
  if (status && status !== 'ALL') params.append('status', status);
  if (search) params.append('search', search);
  const query = params.toString() ? `?${params}` : '';
  const res = await request<ApiResponse<Operation[]>>(`/adjustments${query}`);
  return res.data;
}
export async function getAdjustment(id: string): Promise<Operation> {
  const res = await request<ApiResponse<Operation>>(`/adjustments/${id}`);
  return res.data;
}
export async function createAdjustment(data: { productId: string; locationId: string; countedQty: number; reason: string }): Promise<Operation> {
  const res = await request<ApiResponse<Operation>>('/adjustments', { method: 'POST', body: JSON.stringify(data) });
  return res.data;
}
export async function validateAdjustment(adjustmentId: string, version: number): Promise<Operation> {
  const res = await request<ApiResponse<Operation>>(`/adjustments/${adjustmentId}/validate`, { method: 'POST', body: JSON.stringify({ version }) });
  return res.data;
}
export async function cancelAdjustment(adjustmentId: string): Promise<Operation> {
  const res = await request<ApiResponse<Operation>>(`/adjustments/${adjustmentId}/cancel`, { method: 'POST' });
  return res.data;
}

// ─── Stock Ledger ─────────────────────────────────────────────────────────────
export async function getLedgerEntries(params?: { productId?: string; locationId?: string; referenceType?: string; search?: string; dateFrom?: string; dateTo?: string; offset?: number }): Promise<{ data: StockLedger[]; meta: { total: number; hasMore: boolean } }> {
  const searchParams = new URLSearchParams();
  if (params?.productId) searchParams.append('productId', params.productId);
  if (params?.locationId) searchParams.append('locationId', params.locationId);
  if (params?.referenceType) searchParams.append('referenceType', params.referenceType);
  if (params?.search) searchParams.append('search', params.search);
  if (params?.dateFrom) searchParams.append('dateFrom', params.dateFrom);
  if (params?.dateTo) searchParams.append('dateTo', params.dateTo);
  const query = searchParams.toString() ? `?${searchParams}` : '';
  return request(`/ledger${query}${query ? '&' : '?'}limit=50&offset=${params?.offset || 0}`);
}

export async function cancelReceipt(id: string): Promise<void> { await request(`/receipts/${id}/cancel`, { method: 'POST' }); }
