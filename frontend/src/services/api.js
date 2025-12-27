import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor for adding auth headers, etc.
api.interceptors.request.use(
  (config) => {
    // Add any auth tokens here if needed
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for handling errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      // Server responded with error status
      console.error('API Error:', error.response.data);
    } else if (error.request) {
      // Request made but no response
      console.error('Network Error:', error.message);
    }
    return Promise.reject(error);
  }
);

export default api;

// Helper functions for common operations
export const locations = {
  getAll: () => api.get('/locations'),
  getOne: (id) => api.get(`/locations/${id}`),
  create: (data) => api.post('/locations', data),
  update: (id, data) => api.put(`/locations/${id}`, data),
  delete: (id) => api.delete(`/locations/${id}`),
  getSummary: (id) => api.get(`/locations/${id}/inventory-summary`)
};

export const items = {
  getAll: (params) => api.get('/items', { params }),
  getOne: (id) => api.get(`/items/${id}`),
  create: (data) => api.post('/items', data),
  update: (id, data) => api.put(`/items/${id}`, data),
  delete: (id) => api.delete(`/items/${id}`),
  getCategories: () => api.get('/items/categories'),
  getInventory: (itemId, locationId) => api.get(`/items/${itemId}/inventory/${locationId}`),
  updateInventory: (itemId, locationId, data) => api.put(`/items/${itemId}/inventory/${locationId}`, data)
};

export const preps = {
  getAll: () => api.get('/preps'),
  getOne: (id) => api.get(`/preps/${id}`),
  create: (data) => api.post('/preps', data),
  update: (id, data) => api.put(`/preps/${id}`, data),
  delete: (id) => api.delete(`/preps/${id}`)
};

export const products = {
  getAll: (params) => api.get('/products', { params }),
  getOne: (id) => api.get(`/products/${id}`),
  create: (data) => api.post('/products', data),
  update: (id, data) => api.put(`/products/${id}`, data),
  delete: (id) => api.delete(`/products/${id}`),
  getCategories: () => api.get('/products/categories')
};

export const mappings = {
  getAll: () => api.get('/mappings'),
  create: (data) => api.post('/mappings', data),
  createBulk: (mappings) => api.post('/mappings/bulk', { mappings }),
  update: (id, data) => api.put(`/mappings/${id}`, data),
  delete: (id) => api.delete(`/mappings/${id}`),
  getUnmapped: (locationId) => api.get('/mappings/unmapped', { params: { location_id: locationId } })
};

export const vendors = {
  getAll: () => api.get('/vendors'),
  getOne: (id) => api.get(`/vendors/${id}`),
  create: (data) => api.post('/vendors', data),
  update: (id, data) => api.put(`/vendors/${id}`, data),
  delete: (id) => api.delete(`/vendors/${id}`)
};

export const invoices = {
  getAll: (params) => api.get('/invoices', { params }),
  getOne: (id) => api.get(`/invoices/${id}`),
  create: (data) => api.post('/invoices', data),
  update: (id, data) => api.put(`/invoices/${id}`, data),
  delete: (id) => api.delete(`/invoices/${id}`),
  receive: (id) => api.post(`/invoices/${id}/receive`)
};

export const sales = {
  preview: (formData) => api.post('/sales/preview', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  import: (formData) => api.post('/sales/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getImports: (params) => api.get('/sales/imports', { params }),
  getImport: (id) => api.get(`/sales/imports/${id}`),
  deleteImport: (id) => api.delete(`/sales/imports/${id}`),
  deductInventory: (id) => api.post(`/sales/imports/${id}/deduct-inventory`),
  getSummary: (params) => api.get('/sales/summary', { params }),
  getTopProducts: (params) => api.get('/sales/top-products', { params })
};

export const inventory = {
  getForLocation: (locationId, params) => api.get(`/inventory/location/${locationId}`, { params }),
  getSummary: (locationId) => api.get(`/inventory/location/${locationId}/summary`),
  adjust: (locationId, data) => api.post(`/inventory/location/${locationId}/adjust`, data),
  getCounts: (locationId) => api.get(`/inventory/counts/${locationId}`),
  getCount: (locationId, countId) => api.get(`/inventory/counts/${locationId}/${countId}`),
  startCount: (locationId, data) => api.post(`/inventory/counts/${locationId}`, data),
  updateCountLine: (locationId, countId, lineId, data) =>
    api.put(`/inventory/counts/${locationId}/${countId}/lines/${lineId}`, data),
  finalizeCount: (locationId, countId) =>
    api.post(`/inventory/counts/${locationId}/${countId}/finalize`),
  getTransactions: (locationId, params) => api.get(`/inventory/transactions/${locationId}`, { params })
};

export const reports = {
  getFoodCost: (params) => api.get('/reports/food-cost', { params }),
  getItemUsage: (params) => api.get('/reports/item-usage', { params }),
  getProductProfitability: (params) => api.get('/reports/product-profitability', { params }),
  getWaste: (params) => api.get('/reports/waste', { params }),
  getPurchases: (params) => api.get('/reports/purchases', { params })
};

export const dashboard = {
  get: (locationId, params) => api.get(`/dashboard/${locationId}`, { params }),
  compareLocations: (params) => api.get('/dashboard/compare/locations', { params })
};
