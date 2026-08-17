// Path RELATIF ("/api") — pos-admin SELALU disajikan dari server yang sama
// dgn API-nya (server/src/app.js), jadi otomatis ikut host/IP apa pun yang
// dipakai browser buat buka halaman ini. Absolut ke 127.0.0.1 sebelumnya
// bikin gagal diakses dari komputer lain lewat IP LAN (fetch selalu nyasar
// ke localhost komputer ITU SENDIRI, bukan server) — ditemukan 2026-08-07.
const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
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
  updatePriceLevel: (id, payload) => request(`/price-levels/${id}`, { method: 'PUT', body: payload }),

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

  getDailySalesReport: (startDate, endDate) =>
    request(`/admin/reports/daily-sales?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`),
  getTransactionsReport: (startDate, endDate) =>
    request(`/admin/reports/transactions?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`),
  getSaleDetail: (saleId) => request(`/sales/${saleId}`),

  listAllCashDenominations: () => request('/cash-denominations/all'),
  createCashDenomination: (payload) => request('/cash-denominations', { method: 'POST', body: payload }),
  updateCashDenomination: (id, payload) => request(`/cash-denominations/${id}`, { method: 'PUT', body: payload }),

  listUsers: () => request('/admin/users'),
  createUser: (payload) => request('/admin/users', { method: 'POST', body: payload }),
  updateUser: (id, payload) => request(`/admin/users/${id}`, { method: 'PUT', body: payload }),
  updateUserRole: (id, roleId) => request(`/admin/users/${id}/role`, { method: 'PUT', body: { roleId } }),
  deleteUser: (id) => request(`/admin/users/${id}`, { method: 'DELETE' }),

  listRoles: () => request('/admin/roles'),
  getPermissionsCatalog: () => request('/admin/roles/permissions-catalog'),
  getRolePermissionIds: (roleId) => request(`/admin/roles/${roleId}/permissions`),
  createRole: (payload) => request('/admin/roles', { method: 'POST', body: payload }),
  updateRoleName: (roleId, payload) => request(`/admin/roles/${roleId}`, { method: 'PUT', body: payload }),
  updateRolePermissions: (roleId, permissionIds) => request(`/admin/roles/${roleId}/permissions`, { method: 'PUT', body: { permissionIds } }),
  deleteRole: (roleId) => request(`/admin/roles/${roleId}`, { method: 'DELETE' }),

  listAllPaymentMethods: () => request('/payment-methods/all'),
  createPaymentMethod: (payload) => request('/payment-methods', { method: 'POST', body: payload }),
  updatePaymentMethod: (id, payload) => request(`/payment-methods/${id}`, { method: 'PUT', body: payload }),

  listAccountingAccounts: () => request('/admin/accounting/accounts'),
  postExpense: (payload) => request('/admin/accounting/expenses', { method: 'POST', body: payload }),
  postOwnerDraw: (payload) => request('/admin/accounting/owner-draws', { method: 'POST', body: payload }),
  listFixedAssets: () => request('/admin/accounting/fixed-assets'),
  createFixedAsset: (payload) => request('/admin/accounting/fixed-assets', { method: 'POST', body: payload }),
  runDepreciation: (payload) => request('/admin/accounting/fixed-assets/depreciation/run', { method: 'POST', body: payload }),

  previewInventoryOpeningBalance: () => request('/admin/accounting/opening-balances/inventory/preview'),
  runInventoryOpeningBalance: (payload) => request('/admin/accounting/opening-balances/inventory/run', { method: 'POST', body: payload }),

  getTrialBalance: (asOfDate) => request(`/admin/accounting/reports/trial-balance?asOfDate=${encodeURIComponent(asOfDate)}`),
  getIncomeStatement: (startDate, endDate) => request(`/admin/accounting/reports/income-statement?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`),
  getBalanceSheet: (asOfDate) => request(`/admin/accounting/reports/balance-sheet?asOfDate=${encodeURIComponent(asOfDate)}`),
  getCashFlow: (startDate, endDate) => request(`/admin/accounting/reports/cash-flow?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`),
  getGeneralLedger: (accountId, startDate, endDate) => request(`/admin/accounting/reports/general-ledger?accountId=${encodeURIComponent(accountId)}&startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`),
  getPpnSetoranReport: (startDate, endDate) => request(`/admin/accounting/reports/ppn-setoran?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`),

  listAllSuppliers: () => request('/admin/suppliers/all'),
  createSupplier: (payload) => request('/admin/suppliers', { method: 'POST', body: payload }),
  updateSupplier: (id, payload) => request(`/admin/suppliers/${id}`, { method: 'PUT', body: payload }),

  listPurchases: () => request('/admin/purchases'),
  getPurchase: (id) => request(`/admin/purchases/${id}`),
  createPurchase: (payload) => request('/admin/purchases', { method: 'POST', body: payload }),
  voidPurchase: (id, payload) => request(`/admin/purchases/${id}/void`, { method: 'POST', body: payload }),

  listPurchaseReturns: () => request('/admin/purchase-returns'),
  createPurchaseReturn: (payload) => request('/admin/purchase-returns', { method: 'POST', body: payload }),

  listStockOpnames: () => request('/admin/stock-opnames'),
  getStockOpname: (id) => request(`/admin/stock-opnames/${id}`),
  createStockOpname: (payload) => request('/admin/stock-opnames', { method: 'POST', body: payload }),
  recordOpnamePhysicalCount: (opnameId, itemId, payload) => request(`/admin/stock-opnames/${opnameId}/items/${itemId}`, { method: 'PUT', body: payload }),
  finalizeStockOpname: (id) => request(`/admin/stock-opnames/${id}/finalize`, { method: 'POST' }),

  getStoreSettings: () => request('/store-settings'),
  updateStoreSettings: (payload) => request('/store-settings', { method: 'PUT', body: payload }),

  getPricingSettings: () => request('/admin/pricing/settings'),
  updatePricingSettings: (payload) => request('/admin/pricing/settings', { method: 'PUT', body: payload }),
  listPriceChangeNotifications: () => request('/admin/pricing/notifications'),
  countUnreadPriceChangeNotifications: () => request('/admin/pricing/notifications/unread-count'),
  markPriceChangeNotificationRead: (id) => request(`/admin/pricing/notifications/${id}/read`, { method: 'PUT' }),
  markAllPriceChangeNotificationsRead: () => request('/admin/pricing/notifications/read-all', { method: 'PUT' }),
};
