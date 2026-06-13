import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1',
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('hontal_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('hontal_token');
      localStorage.removeItem('hontal_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;

// Auth
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  me: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
};

// Customers
export const customersApi = {
  list: (params?: Record<string, unknown>) => api.get('/customers', { params }),
  search: (q: string) => api.get('/customers/search', { params: { q } }),
  get: (id: number) => api.get(`/customers/${id}`),
  create: (data: Record<string, unknown>) => api.post('/customers', data),
  update: (id: number, data: Record<string, unknown>) => api.put(`/customers/${id}`, data),
  remove: (id: number) => api.delete(`/customers/${id}`),
  bulkDelete: (ids: number[]) => api.post('/customers/bulk-delete', { ids }),
  import: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/customers/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

// Drivers
export const driversApi = {
  list: (params?: Record<string, unknown>) => api.get('/drivers', { params }),
  live: () => api.get('/drivers/live'),
  get: (id: number) => api.get(`/drivers/${id}`),
  create: (data: Record<string, unknown>) => api.post('/drivers', data),
  update: (id: number, data: Record<string, unknown>) => api.put(`/drivers/${id}`, data),
  remove: (id: number) => api.delete(`/drivers/${id}`),
  updateStatus: (id: number, status: string) => api.patch(`/drivers/${id}/status`, { status }),
  locationHistory: (id: number) => api.get(`/drivers/${id}/location-history`),
};

// Orders
export const ordersApi = {
  list: (params?: Record<string, unknown>) => api.get('/orders', { params }),
  get: (id: number) => api.get(`/orders/${id}`),
  create: (data: Record<string, unknown>) => api.post('/orders', data),
  update: (id: number, data: Record<string, unknown>) => api.put(`/orders/${id}`, data),
  remove: (id: number) => api.delete(`/orders/${id}`),
  assign: (id: number, driverId: number) => api.post(`/orders/${id}/assign`, { driver_id: driverId }),
  unassign: (id: number) => api.post(`/orders/${id}/unassign`),
  bulkAssign: (orderIds: number[], driverId: number) =>
    api.post('/orders/bulk-assign', { order_ids: orderIds, driver_id: driverId }),
  bulkDelete: (orderIds: number[]) =>
    api.post('/orders/bulk-delete', { order_ids: orderIds }),
  updateStatus: (id: number, status: string, notes?: string) =>
    api.post(`/orders/${id}/status`, { status, notes }),
  history: (id: number) => api.get(`/orders/${id}/history`),
  geocode: (address: string) => api.post('/geocode/address', { address }),
  productSuggestions: (q?: string) => api.get('/orders/product-suggestions', { params: { q } }),
  klotters: (date?: string) => api.get('/orders/klotters', { params: { date } }),
};

// Reports
export const reportsApi = {
  cashierSummary: (params?: Record<string, unknown>) => api.get('/reports/cashier-summary', { params }),
};

// Settings
export const settingsApi = {
  get: () => api.get('/settings'),
  update: (data: Record<string, unknown>) => api.patch('/settings', data),
};

// Users (developer / super_admin / merchant_owner)
export const usersApi = {
  list: (params?: Record<string, unknown>) => api.get('/users', { params }),
  get: (id: number) => api.get(`/users/${id}`),
  create: (data: Record<string, unknown>) => api.post('/users', data),
  update: (id: number, data: Record<string, unknown>) => api.put(`/users/${id}`, data),
  remove: (id: number) => api.delete(`/users/${id}`),
  resetPassword: (id: number, password?: string) =>
    api.post(`/users/${id}/reset-password`, { password }),
};

// Routes
export const routesApi = {
  list: (params?: Record<string, unknown>) => api.get('/routes', { params }),
  get: (id: number) => api.get(`/routes/${id}`),
  generate: (data: { route_date: string }) =>
    api.post('/routes/generate', data),
  assignOrder: (data: { order_id: number; driver_id: number }) =>
    api.post('/routes/assign-order', data),
  lock: (id: number) => api.post(`/routes/${id}/lock`),
  unlock: (id: number) => api.post(`/routes/${id}/unlock`),
  reset: (id: number) => api.post(`/routes/${id}/reset`),
  reoptimize: (id: number, orderIds: number[]) =>
    api.post(`/routes/${id}/reoptimize`, { order_ids: orderIds }),
  updateStop: (routeId: number, stopId: number, data: Record<string, unknown>) =>
    api.patch(`/routes/${routeId}/stops/${stopId}`, data),
  removeStop: (routeId: number, stopId: number) =>
    api.delete(`/routes/${routeId}/stops/${stopId}`),
};

// Driver App
export const driverApi = {
  me: () => api.get('/driver/me'),
  today: () => api.get('/driver/today'),
  updateLocation: (lat: number, lng: number, accuracy?: number) =>
    api.patch('/driver/location', { latitude: lat, longitude: lng, accuracy_m: accuracy }),
  updateStatus: (status: string) => api.patch('/driver/status', { status }),
  deliver: (stopId: number, formData: FormData) =>
    api.post(`/driver/stops/${stopId}/deliver`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  fail: (stopId: number, reason: string) =>
    api.post(`/driver/stops/${stopId}/fail`, { fail_reason: reason }),
  history: () => api.get('/driver/history'),
};
