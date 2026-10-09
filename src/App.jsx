import { useEffect, useState } from 'react';
import {
  Package, Folder, Ruler, Tag, Banknote, CreditCard, Users, Truck,
  ShoppingCart, ClipboardCheck, Receipt, Building, BarChart, TrendingUp,
  ChevronRight, ChevronsLeft, ChevronsRight, Bell, LogOut, FileText, Store, ShieldCheck,
  History, RotateCcw, Warehouse, PackageMinus, DatabaseBackup, PackageSearch, Lock, RefreshCw,
} from 'lucide-react';
import { api, setAuthToken, getAuthToken } from './api.js';
import ProfileMenu from './components/ProfileMenu.jsx';
import LoginScreen from './screens/LoginScreen.jsx';
import CategoriesScreen from './screens/CategoriesScreen.jsx';
import UnitsScreen from './screens/UnitsScreen.jsx';
import PriceLevelsScreen from './screens/PriceLevelsScreen.jsx';
import ProductsScreen from './screens/ProductsScreen.jsx';
import ProductDetailScreen from './screens/ProductDetailScreen.jsx';
import ReportsScreen from './screens/ReportsScreen.jsx';
import TransactionsReportScreen from './screens/TransactionsReportScreen.jsx';
import CashDenominationsScreen from './screens/CashDenominationsScreen.jsx';
import UsersScreen from './screens/UsersScreen.jsx';
import PaymentMethodsScreen from './screens/PaymentMethodsScreen.jsx';
import ExpensesScreen from './screens/ExpensesScreen.jsx';
import FixedAssetsScreen from './screens/FixedAssetsScreen.jsx';
import AccountingReportsScreen from './screens/AccountingReportsScreen.jsx';
import SuppliersScreen from './screens/SuppliersScreen.jsx';
import PurchasesScreen from './screens/PurchasesScreen.jsx';
import PurchaseHistoryScreen from './screens/PurchaseHistoryScreen.jsx';
import PurchaseReturnsScreen from './screens/PurchaseReturnsScreen.jsx';
import StockOpnameScreen from './screens/StockOpnameScreen.jsx';
import PriceChangeNotificationsScreen from './screens/PriceChangeNotificationsScreen.jsx';
import StoreSettingsScreen from './screens/StoreSettingsScreen.jsx';
import RolesScreen from './screens/RolesScreen.jsx';
import StockScreen from './screens/StockScreen.jsx';
import StockHistoryScreen from './screens/StockHistoryScreen.jsx';
import InternalStockUsageScreen from './screens/InternalStockUsageScreen.jsx';
import InternalStockUsageHistoryScreen from './screens/InternalStockUsageHistoryScreen.jsx';
import BackupScreen from './screens/BackupScreen.jsx';
import SyncScreen from './screens/SyncScreen.jsx';
import PurchaseHistoryByProductScreen from './screens/PurchaseHistoryByProductScreen.jsx';
import SalesReturnsScreen from './screens/SalesReturnsScreen.jsx';
import ClosePeriodScreen from './screens/ClosePeriodScreen.jsx';

const DEFAULT_VIEW = 'products';

// permission: [module, action] — HARUS sama persis dgn requirePermission()
// di route GET/list yang dipanggil screen terkait saat pertama dibuka (lihat
// catatan di filterNavGroups). Ini LAPISAN KENYAMANAN di atas penegakan
// server yang sudah ada (requirePermission tiap route) — BUKAN pengganti.
// Kalau filter ini salah/dilewati, API tetap menolak (403); efeknya cuma
// user lihat menu yang ujungnya gagal, bukan celah keamanan.
const NAV_GROUPS = [
  {
    label: 'Master Data',
    items: [
      { key: 'products', label: 'Produk', icon: Package, permission: ['products', 'edit'] },
      { key: 'categories', label: 'Kategori', icon: Folder, permission: ['categories', 'view'] },
      { key: 'units', label: 'Satuan', icon: Ruler, permission: ['units', 'view'] },
      { key: 'priceLevels', label: 'Level Harga', icon: Tag, permission: ['price_levels', 'view'] },
      { key: 'cashDenominations', label: 'Pecahan Uang', icon: Banknote, permission: ['cash_denominations', 'view'] },
      { key: 'paymentMethods', label: 'Metode Pembayaran', icon: CreditCard, permission: ['payment_methods', 'view'] },
    ],
  },
  {
    label: 'Stok',
    items: [
      { key: 'stock', label: 'Stok', icon: Warehouse, permission: ['products', 'view'] },
      { key: 'stockHistory', label: 'Riwayat Stok', icon: History, permission: ['products', 'view'] },
      { key: 'internalStockUsage', label: 'Pemakaian Internal', icon: PackageMinus, permission: ['internal_stock_usage', 'create'] },
      { key: 'internalStockUsageHistory', label: 'Riwayat Pemakaian Internal', icon: History, permission: ['internal_stock_usage', 'view'] },
    ],
  },
  {
    label: 'Administrasi',
    items: [
      { key: 'users', label: 'Kelola Pengguna', icon: Users, permission: ['users', 'view'] },
      { key: 'roles', label: 'Kelola Role', icon: ShieldCheck, permission: ['roles', 'view'] },
      { key: 'storeSettings', label: 'Pengaturan Toko', icon: Store, permission: ['store_settings', 'view'] },
      { key: 'backups', label: 'Backup Database', icon: DatabaseBackup, permission: ['backups', 'view'] },
      { key: 'sync', label: 'Sinkronisasi ke Pusat', icon: RefreshCw, permission: ['sync', 'view'] },
    ],
  },
  {
    label: 'Pembelian',
    items: [
      { key: 'suppliers', label: 'Supplier', icon: Truck, permission: ['suppliers', 'view'] },
      { key: 'purchases', label: 'Pembelian', icon: ShoppingCart, permission: ['purchases', 'create'] },
      { key: 'purchaseHistory', label: 'Riwayat Pembelian', icon: History, permission: ['purchases', 'view'] },
      { key: 'purchaseHistoryByProduct', label: 'Riwayat Pembelian per Produk', icon: PackageSearch, permission: ['purchases', 'view'] },
      { key: 'purchaseReturns', label: 'Retur Pembelian', icon: RotateCcw, permission: ['purchase_returns', 'view'] },
      { key: 'stockOpname', label: 'Stock Opname', icon: ClipboardCheck, permission: ['stock_opnames', 'view'] },
    ],
  },
  {
    label: 'Akuntansi',
    items: [
      { key: 'expenses', label: 'Beban & Prive', icon: Receipt, permission: ['accounting', 'view'] },
      { key: 'fixedAssets', label: 'Aset Tetap & Depresiasi', icon: Building, permission: ['accounting', 'view'] },
      { key: 'accountingReports', label: 'Laporan Keuangan', icon: BarChart, permission: ['accounting', 'view'] },
      { key: 'closePeriod', label: 'Tutup Buku', icon: Lock, permission: ['accounting', 'view'] },
    ],
  },
  {
    label: 'Laporan',
    items: [
      { key: 'reports', label: 'Laporan Penjualan', icon: TrendingUp, permission: ['reports', 'view'] },
      { key: 'transactionsReport', label: 'Laporan Transaksi', icon: FileText, permission: ['reports', 'view'] },
      { key: 'salesReturns', label: 'Retur Penjualan', icon: RotateCcw, permission: ['sales_returns', 'view'] },
      { key: 'priceChangeNotifications', label: 'Notifikasi Harga', icon: Bell, permission: ['pricing_settings', 'view'] },
    ],
  },
];

// isSuperadmin bypass total (konsisten dgn requirePermission di server).
// Grup yang semua item-nya tersaring habis ikut disembunyikan (headernya
// tidak berguna kalau kosong).
function filterNavGroups(groups, user) {
  if (!user) return [];
  if (user.isSuperadmin) return groups;
  const granted = new Set((user.permissions || []).map((p) => `${p.module}:${p.action}`));
  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => granted.has(`${item.permission[0]}:${item.permission[1]}`)),
    }))
    .filter((group) => group.items.length > 0);
}

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
  const [openGroups, setOpenGroups] = useState({});
  const [navReady, setNavReady] = useState(false);

  // session awal (dari token di localStorage, lihat useState di atas) cuma
  // punya token, belum ada user/permissions — ambil fresh lewat /me supaya
  // menu tersaring benar & ProfileMenu (nama/role) tampil benar setelah
  // refresh halaman (bukan cuma setelah login baru, yang sudah dapat user
  // lengkap langsung dari respons login).
  useEffect(() => {
    if (session && !session.user) {
      api.me().then(({ user }) => setSession((s) => ({ ...s, user }))).catch(() => handleLogout());
    }
  }, [session]);

  const navGroups = filterNavGroups(NAV_GROUPS, session?.user);

  // Begitu daftar menu yang BOLEH dilihat user diketahui (login baru maupun
  // setelah /me di atas selesai): kalau DEFAULT_VIEW/view saat ini bukan
  // bagian dari itu (role terbatas, mis. cuma Laporan), pindah ke item
  // pertama yang boleh — supaya tidak mendarat di layar yang langsung 403,
  // dan supaya grup yang terbuka pertama kali sesuai itu juga. Jalan SEKALI
  // per sesi (navReady), bukan tiap render / tiap ganti halaman manual.
  useEffect(() => {
    if (!session?.user || navReady) return;
    const allowedKeys = navGroups.flatMap((g) => g.items.map((i) => i.key));
    const initialView = allowedKeys.includes(DEFAULT_VIEW) ? DEFAULT_VIEW : allowedKeys[0];
    if (initialView) {
      setView(initialView);
      const initialGroupLabel = findGroupLabelForKey(initialView);
      const initial = {};
      for (const group of navGroups) initial[group.label] = group.label === initialGroupLabel;
      setOpenGroups(initial);
    }
    setNavReady(true);
  }, [session?.user, navReady]);

  // Refresh badge notifikasi harga tiap kali pindah halaman (murah, 1 query
  // count) — supaya angkanya turun begitu admin selesai baca & tandai dibaca
  // di halaman Notifikasi Harga, bukan cuma saat app baru dibuka.
  useEffect(() => {
    if (!session) return;
    api.countUnreadPriceChangeNotifications().then((d) => setUnreadPriceCount(d.count)).catch(() => {});
  }, [session, view]);

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
    setNavReady(false);
  }

  if (!session) {
    return <LoginScreen onLoggedIn={handleLoggedIn} />;
  }

  if (!session.user) {
    return <div style={{ padding: 40, color: '#666' }}>Memuat...</div>;
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
          navGroups.flatMap((group) => group.items).map((item) => {
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
          navGroups.map((group) => {
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
      <div className="admin-main">
        <div className="admin-topbar">
          <ProfileMenu user={session.user} onLogout={handleLogout} />
        </div>
        <div className="admin-content">
          {view === 'products' && !selectedProductId && <ProductsScreen onSelectProduct={setSelectedProductId} />}
          {view === 'products' && selectedProductId && (
            <ProductDetailScreen productId={selectedProductId} onBack={() => setSelectedProductId(null)} />
          )}
          {view === 'stock' && <StockScreen />}
          {view === 'stockHistory' && <StockHistoryScreen />}
          {view === 'internalStockUsage' && <InternalStockUsageScreen />}
          {view === 'internalStockUsageHistory' && <InternalStockUsageHistoryScreen />}
          {view === 'categories' && <CategoriesScreen />}
          {view === 'units' && <UnitsScreen />}
          {view === 'priceLevels' && <PriceLevelsScreen />}
          {view === 'cashDenominations' && <CashDenominationsScreen />}
          {view === 'paymentMethods' && <PaymentMethodsScreen />}
          {view === 'suppliers' && <SuppliersScreen />}
          {view === 'purchases' && <PurchasesScreen />}
          {view === 'purchaseHistory' && <PurchaseHistoryScreen />}
          {view === 'purchaseHistoryByProduct' && <PurchaseHistoryByProductScreen />}
          {view === 'purchaseReturns' && <PurchaseReturnsScreen />}
          {view === 'salesReturns' && <SalesReturnsScreen />}
          {view === 'stockOpname' && <StockOpnameScreen />}
          {view === 'users' && <UsersScreen />}
          {view === 'roles' && <RolesScreen />}
          {view === 'storeSettings' && <StoreSettingsScreen />}
          {view === 'backups' && <BackupScreen />}
          {view === 'sync' && <SyncScreen />}
          {view === 'expenses' && <ExpensesScreen />}
          {view === 'fixedAssets' && <FixedAssetsScreen />}
          {view === 'accountingReports' && <AccountingReportsScreen />}
          {view === 'closePeriod' && <ClosePeriodScreen />}
          {view === 'reports' && <ReportsScreen />}
          {view === 'transactionsReport' && <TransactionsReportScreen />}
          {view === 'priceChangeNotifications' && <PriceChangeNotificationsScreen />}
        </div>
      </div>
    </div>
  );
}
