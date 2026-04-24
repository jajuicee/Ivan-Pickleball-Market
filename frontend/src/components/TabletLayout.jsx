import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import {
    ShoppingCart,
    History,
    PackagePlus,
    Boxes,
    ClipboardList,
    Building2,
    Loader2,
    Truck,
    TrendingUp,
    Receipt,
    BarChart2,
    Monitor
} from 'lucide-react';

// Main Page Components
import OrderPage from './OrderPage';
import OrderHistory from './OrderHistory';
import AddProduct from './AddProduct';
import Inventory from './Inventory';
import ManageInventory from './ManageInventory';
import Suppliers from './Suppliers';
import Supplies from './Supplies';
import Analytics from './Analytics';
import Expenses from './Expenses';
import ProductSales from './ProductSales';

const TabletLayout = () => {
    const location = useLocation();
    const navigate = useNavigate();
    
    // Determine if we are under the /tablet prefix or at the root
    const isExplicitTabletPath = location.pathname.startsWith('/tablet');
    const basePath = isExplicitTabletPath ? '/tablet' : '';

    // ─── SINGLE SHARED DATA FETCH ────────────────────────────────────────────
    const [products, setProducts] = useState([]);
    const [loadingProducts, setLoadingProducts] = useState(true);

    const fetchProducts = useCallback(() => {
        setLoadingProducts(true);
        axios.get(`http://${window.location.hostname}:8080/api/products`)
            .then(res => setProducts(Array.isArray(res.data) ? res.data : []))
            .catch(err => {
                console.error('Failed to load products:', err);
                setProducts([]);
            })
            .finally(() => setLoadingProducts(false));
    }, []);

    useEffect(() => {
        fetchProducts();
    }, [fetchProducts]);
    // ─────────────────────────────────────────────────────────────────────────

    const navItems = [
        { name: 'POS',          path: `${basePath}/orders`,           icon: ShoppingCart },
        { name: 'History',      path: `${basePath}/history`,          icon: History },
        { name: 'Add',          path: `${basePath}/add-product`,      icon: PackagePlus },
        { name: 'Stock',        path: `${basePath}/inventory`,        icon: Boxes },
        { name: 'Manage',       path: `${basePath}/manage-inventory`, icon: ClipboardList },
        { name: 'Supplies',     path: `${basePath}/supplies`,         icon: Truck },
        { name: 'Suppliers',    path: `${basePath}/suppliers`,        icon: Building2 },
        { name: 'Sales',        path: `${basePath}/product-sales`,    icon: BarChart2 },
        { name: 'Analytics',    path: `${basePath}/analytics`,        icon: TrendingUp },
        { name: 'Expenses',     path: `${basePath}/expenses`,         icon: Receipt },
    ];

    const currentTab = navItems.find(item => location.pathname.startsWith(item.path))?.name || 'POS System';

    // Redirect root paths to orders
    useEffect(() => {
        if (location.pathname === (basePath || '/') || location.pathname === (basePath ? `${basePath}/` : '/')) {
            navigate(`${basePath}/orders`, { replace: true });
        }
    }, [location.pathname, navigate, basePath]);

    return (
        <div className="flex flex-col h-[100dvh] w-screen bg-[#F7F6F0] font-sans text-brand-black overflow-hidden relative">

            {/* --- TOP HEADER --- */}
            <header className="bg-white border-b border-brand-black/10 px-6 py-4 flex justify-between items-center z-10 shadow-sm shrink-0">
                <div className="flex items-center gap-3">
                    <img src="/logo.png" alt="Logo"
                        onError={(e) => { e.target.style.display = 'none'; }}
                        className="w-10 h-10 rounded-full shadow-sm border border-stone-200 object-cover"
                    />
                    <div>
                        <h1 className="text-xl font-black text-brand-black tracking-tight leading-none uppercase">Cebu Pickleball</h1>
                        <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">{currentTab}</span>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    {loadingProducts ? (
                        <div className="flex items-center gap-2 px-3 py-1 bg-amber-100 border border-amber-300 rounded-full">
                            <Loader2 size={12} className="animate-spin text-amber-700" />
                            <span className="text-xs font-bold uppercase tracking-wider text-amber-800 hidden sm:inline-block">Syncing Data</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 px-3 py-1 bg-green-100 border border-green-300 rounded-full">
                            <span className="w-2 h-2 bg-green-600 rounded-full animate-pulse shadow-[0_0_8px_rgba(22,163,74,0.8)]"></span>
                            <span className="text-xs font-bold uppercase tracking-wider text-green-800 hidden sm:inline-block">Realtime Sync Active</span>
                        </div>
                    )}
                    <button
                        onClick={() => navigate('/')}
                        className="flex items-center gap-2 px-3 py-1.5 bg-stone-100 text-zinc-600 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-stone-200 transition-all border border-stone-200 active:scale-95 shadow-sm"
                    >
                        <Monitor size={12} />
                        Desktop View
                    </button>
                </div>
            </header>

            {/* --- MAIN SCROLLABLE CONTENT AREA --- */}
            <main className="flex-1 overflow-hidden relative pb-[85px] w-full">
                <div
                    key={location.pathname}
                    className="h-full w-full overflow-y-auto overflow-x-hidden p-4 sm:p-6"
                    style={{ animation: 'pageSlideIn 300ms ease-out both' }}
                >
                    <Routes>
                        <Route path="orders"           element={<OrderPage products={products} loading={loadingProducts} refetchProducts={fetchProducts} />} />
                        <Route path="history"          element={<OrderHistory />} />
                        <Route path="add-product"      element={<AddProduct onProductAdded={fetchProducts} />} />
                        <Route path="inventory"        element={<Inventory products={products} loading={loadingProducts} refetchProducts={fetchProducts} />} />
                        <Route path="manage-inventory" element={<ManageInventory products={products} loading={loadingProducts} refetchProducts={fetchProducts} />} />
                        <Route path="supplies"         element={<Supplies />} />
                        <Route path="suppliers"        element={<Suppliers />} />
                        <Route path="product-sales"    element={<ProductSales products={products} />} />
                        <Route path="analytics"        element={<Analytics />} />
                        <Route path="expenses"         element={<Expenses />} />
                    </Routes>
                </div>
            </main>

            {/* --- FIXED BOTTOM NAVIGATION --- */}
            <nav className="fixed bottom-0 left-0 w-full bg-white/95 backdrop-blur-xl border-t border-stone-200 shadow-[0_-8px_30px_rgba(0,0,0,0.06)] z-50 pb-[env(safe-area-inset-bottom)]">
                <div className="flex justify-start sm:justify-around items-center px-2 py-2 w-full overflow-x-auto no-scrollbar scroll-smooth">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname.startsWith(item.path);
                        return (
                            <Link
                                key={item.name}
                                to={item.path}
                                className={`flex flex-col items-center justify-center gap-1 min-w-0 flex-1 p-2 rounded-xl transition-all duration-200 ${
                                    isActive ? 'text-blue-600 scale-105' : 'text-zinc-400 hover:text-zinc-600 hover:bg-stone-50'
                                }`}
                            >
                                <div className={`p-1.5 rounded-2xl ${isActive ? 'bg-blue-100 shadow-sm' : ''}`}>
                                    <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                                </div>
                                <span className={`text-[10px] uppercase tracking-wider ${isActive ? 'font-black' : 'font-bold'}`}>
                                    {item.name}
                                </span>
                            </Link>
                        );
                    })}
                </div>
            </nav>

            <style>{`
                @keyframes pageSlideIn {
                    0%   { opacity: 0; transform: translateY(-10px); }
                    100% { opacity: 1; transform: translateY(0); }
                }
                .no-scrollbar::-webkit-scrollbar {
                    display: none;
                }
                .no-scrollbar {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
            `}</style>
        </div>
    );
};

export default TabletLayout;
