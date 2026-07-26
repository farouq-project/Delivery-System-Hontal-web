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

// Auth — KL v2 requires terminal_id, branch_id, app_version for all logins
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password, terminal_id: 'pwa-dispatch', branch_id: 1, app_version: '1.0.0' }),
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
  downloadTemplate: () =>
    api.get('/customers/template', { responseType: 'arraybuffer' }),
  bulkUpdateCluster: (ids: number[], cluster: string) =>
    api.post('/customers/bulk-update-cluster', { customer_ids: ids, cluster }),
  deduplicate: () =>
    api.post('/customers/deduplicate'),
  resolveMapsLink: (url: string) =>
    api.post('/customers/resolve-maps-link', { url }),
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

// Delivery Orders
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
  bulkUnassign: (orderIds: number[]) =>
    api.post('/orders/bulk-unassign', { order_ids: orderIds }),
  updateStatus: (id: number, status: string, reason?: string) =>
    api.post(`/orders/${id}/status`, { status, reason }),
  history: (id: number) => api.get(`/orders/${id}/history`),
  geocode: (address: string) => api.post('/geocode/address', { address }),
  nextNumber: () => api.get('/orders/next-number'),
  klotters: (date?: string) => api.get('/orders/klotters', { params: { date } }),
  productSuggestions: (q: string) => api.get('/orders/product-suggestions', { params: { q } }),
  bulkUpdateCashier: (ids: number[], cashier_name: string) =>
    api.post('/orders/bulk-update-cashier', { order_ids: ids, cashier_name }),
};

// Reports
export const reportsApi = {
  deliverySummary: (params?: Record<string, unknown>) => api.get('/reports/delivery-summary', { params }),
  salesSummary: (params?: Record<string, unknown>) => api.get('/reports/sales', { params }),
  cashierSummary: (params?: Record<string, unknown>) => api.get('/reports/cashier-summary', { params }),
};

// Delivery Settings
export const settingsApi = {
  get: () => api.get('/settings'),
  update: (data: Record<string, unknown>) => api.patch('/settings', data),
  getPaymentMethods: () => api.get('/settings/payment-methods'),
  vipIndex: () => api.get('/vip-configs'),
  vipUpdate: (configs: Array<{ vip_level: string; score_value: number }>) =>
    api.patch('/vip-configs', { configs }),
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
  assignOrders: (data: { order_ids: number[]; driver_id: number }) =>
    api.post('/routes/assign-orders', data),
  lock: (id: number) => api.post(`/routes/${id}/lock`),
  unlock: (id: number) => api.post(`/routes/${id}/unlock`),
  reset: (id: number) => api.post(`/routes/${id}/reset`),
  resetUnassigned: (id: number) => api.post(`/routes/${id}/reset-unassigned`),
  remove: (id: number) => api.delete(`/routes/${id}`),
  reoptimize: (id: number, orderIds: number[]) =>
    api.post(`/routes/${id}/reoptimize`, { order_ids: orderIds }),
  updateStop: (routeId: number, stopId: number, data: Record<string, unknown>) =>
    api.put(`/routes/${routeId}/stops/${stopId}`, data),
  removeStop: (routeId: number, stopId: number) =>
    api.delete(`/routes/${routeId}/stops/${stopId}`),
};

// Feature flags for current merchant
export const featuresApi = {
  list: () => api.get('/features'),
};

// Executive Dashboard (Phase 2B)
export const executiveDashboardApi = {
  summary: () => api.get('/dashboard/executive'),
};

// Customer Domain (Phase 2A) — routes live at /api/v1/customer-domain/
export const customerDomainApi = {
  profile:      (customerId: number) =>
    api.get(`/customer-domain/customers/${customerId}/profile`),
  timeline:     (customerId: number, params?: Record<string, unknown>) =>
    api.get(`/customer-domain/customers/${customerId}/timeline`, { params }),
  metrics:      (customerId: number) =>
    api.get(`/customer-domain/customers/${customerId}/metrics`),
  customerTags: (customerId: number) =>
    api.get(`/customer-domain/customers/${customerId}/tags`),
  assignTag:    (customerId: number, tagId: number) =>
    api.post(`/customer-domain/customers/${customerId}/tags/${tagId}`),
  removeTag:    (customerId: number, tagId: number) =>
    api.delete(`/customer-domain/customers/${customerId}/tags/${tagId}`),
  tags:         () => api.get('/customer-domain/tags'),
  createTag:    (data: { name: string; color?: string }) =>
    api.post('/customer-domain/tags', data),
  updateTag:    (id: number, data: { name?: string; color?: string; is_active?: boolean }) =>
    api.put(`/customer-domain/tags/${id}`, data),
  deleteTag:    (id: number) => api.delete(`/customer-domain/tags/${id}`),
};

// Merchant Platform (Phase 3) — settings/platform/*
export const merchantPlatformApi = {
  // Business Profile (company identity — merchants table)
  getProfile:         () => api.get('/settings/platform/profile'),
  updateProfile:      (data: Record<string, unknown>) => api.patch('/settings/platform/profile', data),

  // Business Identity (industry config — merchant_settings, Phase 6.2)
  getBusinessProfile:    () => api.get('/settings/platform/business'),
  updateBusinessProfile: (data: Record<string, unknown>) => api.patch('/settings/platform/business', data),

  // Operational
  getOperational:     () => api.get('/settings/platform/operational'),
  updateOperational:  (data: Record<string, unknown>) => api.patch('/settings/platform/operational', data),

  // Business Hours
  getHours:           () => api.get('/settings/platform/hours'),
  updateHours:        (data: Record<string, unknown>) => api.patch('/settings/platform/hours', data),

  // Invoice
  getInvoice:         () => api.get('/settings/platform/invoice'),
  updateInvoice:      (data: Record<string, unknown>) => api.patch('/settings/platform/invoice', data),

  // Tracking
  getTracking:        () => api.get('/settings/platform/tracking'),
  updateTracking:     (data: Record<string, unknown>) => api.patch('/settings/platform/tracking', data),

  // Notifications
  getNotifications:   () => api.get('/settings/platform/notifications'),
  updateNotifications:(data: Record<string, unknown>) => api.patch('/settings/platform/notifications', data),

  // Payment Methods
  getPaymentMethods:  () => api.get('/settings/platform/payment-methods'),
  storePaymentMethod: (data: Record<string, unknown>) => api.post('/settings/platform/payment-methods', data),
  updatePaymentMethod:(id: number, data: Record<string, unknown>) => api.patch(`/settings/platform/payment-methods/${id}`, data),
  reorderPaymentMethods:(ids: number[]) => api.patch('/settings/platform/payment-methods/reorder', { ids }),

  // Cashiers (use existing SettingsController endpoints)
  getCashiers:        () => api.get('/settings/cashiers'),
  storeCashier:       (name: string) => api.post('/settings/cashiers', { name }),
  destroyCashier:     (id: number) => api.delete(`/settings/cashiers/${id}`),

  // Clusters (use existing SettingsController endpoints)
  getClusters:        () => api.get('/settings/clusters'),
  storeCluster:       (name: string) => api.post('/settings/clusters', { name }),
  destroyCluster:     (id: number) => api.delete(`/settings/clusters/${id}`),

  // Branches
  getBranches:        () => api.get('/settings/platform/branches'),
  storeBranch:        (data: Record<string, unknown>) => api.post('/settings/platform/branches', data),
  updateBranch:       (id: number, data: Record<string, unknown>) => api.patch(`/settings/platform/branches/${id}`, data),
  destroyBranch:      (id: number) => api.delete(`/settings/platform/branches/${id}`),
};

// ─── Super Admin Platform (Phase 5.2 / 5.2A) ──────────────────────────────

export const adminApi = {
  // Applications
  listApplications: (params?: Record<string, unknown>) =>
    api.get('/admin/applications', { params }),
  getApplication: (id: number) =>
    api.get(`/admin/applications/${id}`),
  approveApplication: (id: number) =>
    api.patch(`/admin/applications/${id}/approve`),
  rejectApplication: (id: number, rejection_reason: string) =>
    api.patch(`/admin/applications/${id}/reject`, { rejection_reason }),
  requestInfoApplication: (id: number, notes?: string) =>
    api.patch(`/admin/applications/${id}/request-info`, { notes }),
  updateApplicationNotes: (id: number, notes: string) =>
    api.patch(`/admin/applications/${id}/notes`, { notes }),
  deleteApplication: (id: number) =>
    api.delete(`/admin/applications/${id}`),

  // Merchant directory
  listMerchants: (params?: Record<string, unknown>) =>
    api.get('/admin/merchants', { params }),
  getMerchant: (id: number) =>
    api.get(`/admin/merchants/${id}`),
  updateMerchantStatus: (id: number, status: string) =>
    api.patch(`/admin/merchants/${id}/status`, { status }),
  getMerchantUsers: (id: number, params?: Record<string, unknown>) =>
    api.get(`/admin/merchants/${id}/users`, { params }),
  getMerchantDeliverySummary: (id: number) =>
    api.get(`/admin/merchants/${id}/delivery-summary`),
  getMerchantFeatures: (id: number) =>
    api.get(`/admin/merchants/${id}/features`),
  updateMerchantFeature: (id: number, featureKey: string, enabled: boolean) =>
    api.patch(`/admin/merchants/${id}/features/${featureKey}`, { enabled }),
  getMerchantUsage: (id: number) =>
    api.get(`/admin/merchants/${id}/usage`),
  getMerchantActivity: (id: number, params?: Record<string, unknown>) =>
    api.get(`/admin/merchants/${id}/activity`, { params }),
  resetMerchantUserPassword: (merchantId: number, userId: number) =>
    api.patch(`/admin/merchants/${merchantId}/users/${userId}/reset-password`),
  deactivateMerchantUser: (merchantId: number, userId: number) =>
    api.patch(`/admin/merchants/${merchantId}/users/${userId}/deactivate`),
  reactivateMerchantUser: (merchantId: number, userId: number) =>
    api.patch(`/admin/merchants/${merchantId}/users/${userId}/reactivate`),
  deleteMerchantUser: (merchantId: number, userId: number) =>
    api.delete(`/admin/merchants/${merchantId}/users/${userId}`),

  // Plans (CRUD + lifecycle)
  listPlans: (params?: Record<string, unknown>) => api.get('/admin/plans', { params }),
  getPlan: (id: number) => api.get(`/admin/plans/${id}`),
  createPlan: (data: Record<string, unknown>) => api.post('/admin/plans', data),
  updatePlan: (id: number, data: Record<string, unknown>) => api.patch(`/admin/plans/${id}`, data),
  togglePlan: (id: number) => api.patch(`/admin/plans/${id}/toggle`),
  duplicatePlan: (id: number) => api.post(`/admin/plans/${id}/duplicate`),
  archivePlan: (id: number) => api.patch(`/admin/plans/${id}/archive`),
  restorePlan: (id: number) => api.patch(`/admin/plans/${id}/restore`),
  deletePlan: (id: number) => api.delete(`/admin/plans/${id}`),

  // Subscriptions (view + lifecycle)
  listSubscriptions: (params?: Record<string, unknown>) =>
    api.get('/admin/subscriptions', { params }),
  getSubscription: (id: number) =>
    api.get(`/admin/subscriptions/${id}`),
  changePlan: (subId: number, planId: number) =>
    api.patch(`/admin/subscriptions/${subId}/change-plan`, { plan_id: planId }),
  pauseSubscription: (subId: number) =>
    api.patch(`/admin/subscriptions/${subId}/pause`),
  resumeSubscription: (subId: number) =>
    api.patch(`/admin/subscriptions/${subId}/resume`),
  extendTrial: (subId: number, days: number) =>
    api.patch(`/admin/subscriptions/${subId}/extend-trial`, { days }),
  activateSubscription: (subId: number) =>
    api.patch(`/admin/subscriptions/${subId}/activate`),
  expireSubscription: (subId: number) =>
    api.patch(`/admin/subscriptions/${subId}/expire`),
  cancelSubscription: (subId: number) =>
    api.patch(`/admin/subscriptions/${subId}/cancel`),

  // Platform Dashboard (Phase 5.3)
  getDashboard: () =>
    api.get('/admin/dashboard'),
  getHealth: () =>
    api.get('/admin/health'),
  getActivity: (params?: Record<string, unknown>) =>
    api.get('/admin/activity', { params }),
  globalSearch: (q: string) =>
    api.get('/admin/search', { params: { q } }),
  getGoogleApiAnalytics: () =>
    api.get('/admin/analytics/google-api'),

  // Platform Settings (Phase 5.3)
  getPlatformSettings: () =>
    api.get('/admin/platform/settings'),
  updatePlatformSettings: (settings: Record<string, unknown>) =>
    api.patch('/admin/platform/settings', { settings }),

  // Merchant Support Console (Phase 5.3)
  getMerchantSupport: (id: number) =>
    api.get(`/admin/merchants/${id}/support`),
  updateMerchantSupportNotes: (id: number, data: { support_notes?: string | null; internal_notes?: string | null }) =>
    api.patch(`/admin/merchants/${id}/support-notes`, data),

  // Trial Merchant provisioning (RC1)
  createTrialMerchant: (data: Record<string, unknown>) =>
    api.post('/admin/trial-merchants', data),
  deleteTrialMerchant: (merchantId: number) =>
    api.delete(`/admin/trial-merchants/${merchantId}`),

  // CRM Prospects
  listCrmProspects: (params?: Record<string, unknown>) =>
    api.get('/admin/crm', { params }),
  getCrmStats: () =>
    api.get('/admin/crm/stats'),
  createCrmProspect: (data: Record<string, unknown>) =>
    api.post('/admin/crm', data),
  updateCrmProspect: (id: number, data: Record<string, unknown>) =>
    api.patch(`/admin/crm/${id}`, data),
  deleteCrmProspect: (id: number) =>
    api.delete(`/admin/crm/${id}`),
  importCrmProspects: (file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    return api.post('/admin/crm/import', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  previewCrmImport: (file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    return api.post('/admin/crm/import/preview', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  downloadCrmTemplate: () =>
    api.get('/admin/crm/template', { responseType: 'blob' }),

  // CRM Activities
  listCrmActivities: (prospectId: number) =>
    api.get(`/admin/crm/${prospectId}/activities`),
  addCrmActivity: (prospectId: number, data: { type: string; content: string }) =>
    api.post(`/admin/crm/${prospectId}/activities`, data),
  deleteCrmActivity: (prospectId: number, activityId: number) =>
    api.delete(`/admin/crm/${prospectId}/activities/${activityId}`),

  // CRM Message Templates
  listCrmTemplates: () =>
    api.get('/admin/crm-templates'),
  createCrmTemplate: (data: Record<string, unknown>) =>
    api.post('/admin/crm-templates', data),
  updateCrmTemplate: (id: number, data: Record<string, unknown>) =>
    api.patch(`/admin/crm-templates/${id}`, data),
  deleteCrmTemplate: (id: number) =>
    api.delete(`/admin/crm-templates/${id}`),
  previewCrmTemplate: (id: number, vars: Record<string, string>) =>
    api.post(`/admin/crm-templates/${id}/preview`, vars),

  // Customer Intelligence (cross-merchant, super_admin only)
  searchCustomers: (params?: Record<string, unknown>) =>
    api.get('/admin/customers/search', { params }),
};

// Public API — no auth token, different base path
const publicHttp = axios.create({
  baseURL: (process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') ?? 'http://localhost:8000') + '/api/public',
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
});

export const publicApi = {
  registerInterest: (data: Record<string, unknown>) =>
    publicHttp.post('/register-interest', data),
  plans: () => publicHttp.get('/plans'),
};

// Business Intelligence (Phase 4.1)
export const biApi = {
  overview:   () => api.get('/bi/overview'),
  customers:  () => api.get('/bi/customers'),
  operations: () => api.get('/bi/operations'),
  drivers:    () => api.get('/bi/drivers'),
  branches:   () => api.get('/bi/branches'),
  products:   () => api.get('/bi/products'),
  areas:      () => api.get('/bi/areas'),
  attention:  () => api.get('/bi/attention'),
};

// Driver App
export const driverApi = {
  me: () => api.get('/driver/me'),
  today: () => api.get('/driver/today'),
  updateLocation: (lat: number, lng: number, accuracy?: number) =>
    api.patch('/driver/location', { latitude: lat, longitude: lng, accuracy_m: accuracy }),
  updateStatus: (status: string) => api.patch('/driver/status', { status }),
  deliver: (stopId: number, formData: FormData) =>
    api.post(`/driver/stops/${stopId}/deliver`, formData),
  fail: (stopId: number, reason: string) =>
    api.post(`/driver/stops/${stopId}/fail`, { reason }),
  history: () => api.get('/driver/history'),
};
