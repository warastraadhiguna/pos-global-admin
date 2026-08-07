import { useEffect, useState } from 'react';
import {
  Package, Folder, Ruler, Tag, Banknote, CreditCard, Users, Truck,
  ShoppingCart, ClipboardCheck, Receipt, Building, BarChart, TrendingUp,
  ChevronRight, ChevronsLeft, ChevronsRight, Bell, LogOut,
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
import PriceChangeNotificationsScreen from './screens/PriceChangeNotificationsScreen.jsx';

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
      { key: 'priceChangeNotifications', label: 'Notifikasi Harga', icon: Bell },
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
  const [unreadPriceCount, setUnreadPriceCount] = useState(0);
  // Sidebar collapse — cuma UI, sama seperti openGroups di bawah sengaja
  // tidak persisten (reset tiap refresh), murni dikendalikan klik user.
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Refresh badge notifikasi harga tiap kali pindah halaman (murah, 1 query
  // count) — supaya angkanya turun begitu admin selesai baca & tandai dibaca
  // di halaman Notifikasi Harga, bukan cuma saat app baru dibuka.
  useEffect(() => {
    if (!session) return;
    api.countUnreadPriceChangeNotifications().then((d) => setUnreadPriceCount(d.count)).catch(() => {});
  }, [session, view]);

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
    <div className={`admin-layout${sidebarCollapsed ? ' sidebar-collapsed' : ''}`}>
      <nav className="admin-nav">
        <div className="brand">
          {!sidebarCollapsed && <span>POS Admin</span>}
          <button
            type="button"
            className="nav-collapse-toggle"
            onClick={() => setSidebarCollapsed((v) => !v)}
            title={sidebarCollapsed ? 'Perluas menu' : 'Ciutkan menu'}
          >
            {sidebarCollapsed ? <ChevronsRight size={16} /> : <ChevronsLeft size={16} />}
          </button>
        </div>
        {sidebarCollapsed ? (
          // Ciutkan: grup dilepas (tidak cukup ruang utk label grup), semua
          // item dari semua grup diratakan jadi satu rel ikon, label pindah
          // ke tooltip (title).
          NAV_GROUPS.flatMap((group) => group.items).map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.key}
                type="button"
                className={`nav-icon-btn${view === item.key ? ' active' : ''}`}
                onClick={() => { setView(item.key); setSelectedProductId(null); }}
                title={item.label}
              >
                <Icon size={18} />
                {item.key === 'priceChangeNotifications' && unreadPriceCount > 0 && (
                  <span className="nav-icon-badge">{unreadPriceCount}</span>
                )}
              </button>
            );
          })
        ) : (
          NAV_GROUPS.map((group) => {
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
                          {item.key === 'priceChangeNotifications' && unreadPriceCount > 0 && (
                            <span className="badge active" style={{ marginLeft: 'auto' }}>{unreadPriceCount}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
        <button
          type="button"
          className={sidebarCollapsed ? 'nav-icon-btn' : ''}
          onClick={handleLogout}
          style={sidebarCollapsed ? { color: '#fca5a5', marginTop: 8 } : { marginTop: 20, color: '#fca5a5' }}
          title="Keluar"
        >
          {sidebarCollapsed ? <LogOut size={18} /> : 'Keluar'}
        </button>
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
        {view === 'priceChangeNotifications' && <PriceChangeNotificationsScreen />}
      </div>
    </div>
  );
}
