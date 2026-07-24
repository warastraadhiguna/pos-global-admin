import { useState } from 'react';
import {
  Package, Folder, Ruler, Tag, Banknote, CreditCard, Users, Truck,
  ShoppingCart, ClipboardCheck, Receipt, Building, BarChart, TrendingUp,
  ChevronRight,
} from 'lucide-react';
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
import ExpensesScreen from './screens/ExpensesScreen.jsx';
import FixedAssetsScreen from './screens/FixedAssetsScreen.jsx';
import AccountingReportsScreen from './screens/AccountingReportsScreen.jsx';
import SuppliersScreen from './screens/SuppliersScreen.jsx';
import PurchasesScreen from './screens/PurchasesScreen.jsx';
import StockOpnameScreen from './screens/StockOpnameScreen.jsx';

const DEFAULT_VIEW = 'products';

const NAV_GROUPS = [
  {
    label: 'Master Data',
    items: [
      { key: 'products', label: 'Produk', icon: Package },
      { key: 'categories', label: 'Kategori', icon: Folder },
      { key: 'units', label: 'Satuan', icon: Ruler },
      { key: 'priceLevels', label: 'Level Harga', icon: Tag },
      { key: 'cashDenominations', label: 'Pecahan Uang', icon: Banknote },
      { key: 'paymentMethods', label: 'Metode Pembayaran', icon: CreditCard },
    ],
  },
  {
    label: 'Administrasi',
    items: [
      { key: 'users', label: 'Kelola Pengguna', icon: Users },
    ],
  },
  {
    label: 'Pembelian',
    items: [
      { key: 'suppliers', label: 'Supplier', icon: Truck },
      { key: 'purchases', label: 'Pembelian', icon: ShoppingCart },
      { key: 'stockOpname', label: 'Stock Opname', icon: ClipboardCheck },
    ],
  },
  {
    label: 'Akuntansi',
    items: [
      { key: 'expenses', label: 'Beban & Prive', icon: Receipt },
      { key: 'fixedAssets', label: 'Aset Tetap & Depresiasi', icon: Building },
      { key: 'accountingReports', label: 'Laporan Keuangan', icon: BarChart },
    ],
  },
  {
    label: 'Laporan',
    items: [
      { key: 'reports', label: 'Laporan Penjualan', icon: TrendingUp },
    ],
  },
];

// Grup yang memuat sebuah key nav — dipakai baik utk state awal (grup berisi
// DEFAULT_VIEW terbuka duluan) maupun utk penanda "has-active" saat tertutup.
function findGroupLabelForKey(key) {
  const group = NAV_GROUPS.find((g) => g.items.some((item) => item.key === key));
  return group ? group.label : null;
}

export default function App() {
  const [session, setSession] = useState(() => (getAuthToken() ? { token: getAuthToken() } : null));
  const [view, setView] = useState(DEFAULT_VIEW);
  const [selectedProductId, setSelectedProductId] = useState(null);

  // React state di level komponen navigasi — SENGAJA bukan localStorage
  // (state cuma bertahan selama sesi, direset lagi kalau halaman di-refresh).
  // Default: semua grup tertutup KECUALI grup yang berisi halaman aktif saat
  // mount. Sesudah itu buka/tutup murni dikendalikan klik user — navigasi
  // antar halaman tidak pernah menyentuh state ini lagi, jadi tidak "reset"
  // tiap pindah halaman.
  const [openGroups, setOpenGroups] = useState(() => {
    const initialGroupLabel = findGroupLabelForKey(DEFAULT_VIEW);
    const initial = {};
    for (const group of NAV_GROUPS) initial[group.label] = group.label === initialGroupLabel;
    return initial;
  });

  function toggleGroup(label) {
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }));
  }

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
        {NAV_GROUPS.map((group) => {
          const isOpen = openGroups[group.label];
          const hasActive = group.items.some((item) => item.key === view);
          return (
            <div className="nav-group" key={group.label}>
              <button
                type="button"
                className={`nav-group-header${hasActive ? ' has-active' : ''}`}
                onClick={() => toggleGroup(group.label)}
                aria-expanded={isOpen}
              >
                <span>{group.label}</span>
                <ChevronRight size={14} className={`nav-group-chevron${isOpen ? ' open' : ''}`} />
              </button>
              {isOpen && (
                <div className="nav-group-items">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.key}
                        className={view === item.key ? 'active' : ''}
                        onClick={() => { setView(item.key); setSelectedProductId(null); }}
                      >
                        <Icon size={16} className="nav-item-icon" />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
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
        {view === 'suppliers' && <SuppliersScreen />}
        {view === 'purchases' && <PurchasesScreen />}
        {view === 'stockOpname' && <StockOpnameScreen />}
        {view === 'users' && <UsersScreen />}
        {view === 'expenses' && <ExpensesScreen />}
        {view === 'fixedAssets' && <FixedAssetsScreen />}
        {view === 'accountingReports' && <AccountingReportsScreen />}
        {view === 'reports' && <ReportsScreen />}
      </div>
    </div>
  );
}
