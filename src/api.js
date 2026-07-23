// IP/base URL server dikonfigurasi lewat .env (VITE_API_BASE_URL), bukan
// hardcode — jaringan tiap toko bisa beda (Bagian 8).
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:4000/api';
const TOKEN_STORAGE_KEY = 'pos_admin_token';

let authToken = localStorage.getItem(TOKEN_STORAGE_KEY) || null;

export function setAuthToken(token) {
  authToken = token;
  if (token) localStorage.setItem(TOKEN_STORAGE_KEY, token);
  else localStorage.removeItem(TOKEN_STORAGE_KEY);
}

export function getAuthToken() {
  return authToken;
}

async function request(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth && authToken) headers.Authorization = `Bearer ${authToken}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.message || `Request gagal (${res.status})`);
    err.code = data.error;
    err.status = res.status;
    throw err;
  }
  return data;
}

export const api = {
  loginAdmin: (username, password) => request('/auth/login', { method: 'POST', body: { username, password }, auth: false }),
  me: () => request('/auth/me'),

  listCategories: () => request('/categories'),
  createCategory: (payload) => request('/categories', { method: 'POST', body: payload }),
  updateCategory: (id, payload) => request(`/categories/${id}`, { method: 'PUT', body: payload }),

  listUnits: () => request('/units'),
  createUnit: (payload) => request('/units', { method: 'POST', body: payload }),
  updateUnit: (id, payload) => request(`/units/${id}`, { method: 'PUT', body: payload }),

  listPriceLevels: () => request('/price-levels'),
  createPriceLevel: (payload) => request('/price-levels', { method: 'POST', body: payload }),

  listProducts: () => request('/admin/products'),
  getProduct: (id) => request(`/admin/products/${id}`),
  createProduct: (payload) => request('/admin/products', { method: 'POST', body: payload }),
  updateProduct: (id, payload) => request(`/admin/products/${id}`, { method: 'PUT', body: payload }),

  addProductUnit: (productId, payload) => request(`/admin/products/${productId}/units`, { method: 'POST', body: payload }),
  updateProductUnit: (productId, unitId, payload) => request(`/admin/products/${productId}/units/${unitId}`, { method: 'PUT', body: payload }),
  deleteProductUnit: (productId, unitId) => request(`/admin/products/${productId}/units/${unitId}`, { method: 'DELETE' }),

  addBarcode: (productId, payload) => request(`/admin/products/${productId}/barcodes`, { method: 'POST', body: payload }),
  deleteBarcode: (productId, barcodeId) => request(`/admin/products/${productId}/barcodes/${barcodeId}`, { method: 'DELETE' }),

  addPrice: (productId, payload) => request(`/admin/products/${productId}/prices`, { method: 'POST', body: payload }),
  updatePrice: (productId, priceId, payload) => request(`/admin/products/${productId}/prices/${priceId}`, { method: 'PUT', body: payload }),
  deletePrice: (productId, priceId) => request(`/admin/products/${productId}/prices/${priceId}`, { method: 'DELETE' }),

  getDailySalesReport: (date) => request(`/admin/reports/daily-sales?date=${encodeURIComponent(date)}`),

  listAllCashDenominations: () => request('/cash-denominations/all'),
  createCashDenomination: (payload) => request('/cash-denominations', { method: 'POST', body: payload }),
  updateCashDenomination: (id, payload) => request(`/cash-denominations/${id}`, { method: 'PUT', body: payload }),

  listUsers: () => request('/admin/users'),
  createUser: (payload) => request('/admin/users', { method: 'POST', body: payload }),
  updateUser: (id, payload) => request(`/admin/users/${id}`, { method: 'PUT', body: payload }),

  listAllPaymentMethods: () => request('/payment-methods/all'),
  createPaymentMethod: (payload) => request('/payment-methods', { method: 'POST', body: payload }),
  updatePaymentMethod: (id, payload) => request(`/payment-methods/${id}`, { method: 'PUT', body: payload }),
};
