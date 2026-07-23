import { useState } from 'react';
import { api, setAuthToken, getAuthToken } from './api.js';
import LoginScreen from './screens/LoginScreen.jsx';
import CategoriesScreen from './screens/CategoriesScreen.jsx';
import UnitsScreen from './screens/UnitsScreen.jsx';
import PriceLevelsScreen from './screens/PriceLevelsScreen.jsx';
import ProductsScreen from './screens/ProductsScreen.jsx';
import ProductDetailScreen from './screens/ProductDetailScreen.jsx';
import ReportsScreen from './screens/ReportsScreen.jsx';
import CashDenominationsScreen from './screens/CashDenominationsScreen.jsx';
import UsersScreen from './screens/UsersScreen.jsx';
import PaymentMethodsScreen from './screens/PaymentMethodsScreen.jsx';

const NAV_GROUPS = [
  {
    label: 'Master Data',
    items: [
      { key: 'products', label: 'Produk' },
      { key: 'categories', label: 'Kategori' },
      { key: 'units', label: 'Satuan' },
      { key: 'priceLevels', label: 'Level Harga' },
      { key: 'cashDenominations', label: 'Pecahan Uang' },
      { key: 'paymentMethods', label: 'Metode Pembayaran' },
    ],
  },
  {
    label: 'Administrasi',
    items: [
      { key: 'users', label: 'Kelola Pengguna' },
    ],
  },
  {
    label: 'Laporan',
    items: [
      { key: 'reports', label: 'Laporan Penjualan' },
    ],
  },
];

export default function App() {
  const [session, setSession] = useState(() => (getAuthToken() ? { token: getAuthToken() } : null));
  const [view, setView] = useState('products');
  const [selectedProductId, setSelectedProductId] = useState(null);

  function handleLoggedIn({ token, user }) {
    setAuthToken(token);
    setSession({ token, user });
  }

  function handleLogout() {
    setAuthToken(null);
    setSession(null);
  }

  if (!session) {
    return <LoginScreen onLoggedIn={handleLoggedIn} />;
  }

  return (
    <div className="admin-layout">
      <nav className="admin-nav">
        <div className="brand">POS Admin</div>
        {NAV_GROUPS.map((group) => (
          <div className="nav-group" key={group.label}>
            <div className="nav-group-label">{group.label}</div>
            {group.items.map((item) => (
              <button
                key={item.key}
                className={view === item.key ? 'active' : ''}
                onClick={() => { setView(item.key); setSelectedProductId(null); }}
              >
                {item.label}
              </button>
            ))}
          </div>
        ))}
        <button onClick={handleLogout} style={{ marginTop: 20, color: '#fca5a5' }}>Keluar</button>
      </nav>
      <div className="admin-content">
        {view === 'products' && !selectedProductId && <ProductsScreen onSelectProduct={setSelectedProductId} />}
        {view === 'products' && selectedProductId && (
          <ProductDetailScreen productId={selectedProductId} onBack={() => setSelectedProductId(null)} />
        )}
        {view === 'categories' && <CategoriesScreen />}
        {view === 'units' && <UnitsScreen />}
        {view === 'priceLevels' && <PriceLevelsScreen />}
        {view === 'cashDenominations' && <CashDenominationsScreen />}
        {view === 'paymentMethods' && <PaymentMethodsScreen />}
        {view === 'users' && <UsersScreen />}
        {view === 'reports' && <ReportsScreen />}
      </div>
    </div>
  );
}
