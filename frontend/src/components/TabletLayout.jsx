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
    Truck
} from 'lucide-react';

// Main Page Components
import OrderPage from './OrderPage';
import OrderHistory from './OrderHistory';
import AddProduct from './AddProduct';
import Inventory from './Inventory';
import ManageInventory from './ManageInventory';
import Suppliers from './Suppliers';
import Supplies from './Supplies';

const TabletLayout = () => {
    const location = useLocation();
    const navigate = useNavigate();

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
        { name: 'New Order',    path: '/tablet/orders',           icon: ShoppingCart },
        { name: 'History',      path: '/tablet/history',          icon: History },
        { name: 'Add Product',  path: '/tablet/add-product',      icon: PackagePlus },
        { name: 'Stock',        path: '/tablet/inventory',        icon: Boxes },
        { name: 'Manage Inv.',  path: '/tablet/manage-inventory', icon: ClipboardList },
        { name: 'Supplies',     path: '/tablet/supplies',         icon: Truck },
        { name: 'Suppliers',    path: '/tablet/suppliers',        icon: Building2 },
    ];

    const currentTab = navItems.find(item => location.pathname.startsWith(item.path))?.name || 'POS System';

    // Redirect /tablet root to orders
    useEffect(() => {
        if (location.pathname === '/tablet' || location.pathname === '/tablet/') {
            navigate('/tablet/orders', { replace: true });
        }
    }, [location.pathname, navigate]);

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
                    </Routes>
                </div>
            </main>

            {/* --- FIXED BOTTOM NAVIGATION --- */}
            <nav className="fixed bottom-0 left-0 w-full bg-white/90 backdrop-blur-xl border-t border-stone-200 shadow-[0_-8px_30px_rgba(0,0,0,0.06)] z-50 pb-[env(safe-area-inset-bottom)]">
                <div className="flex justify-around items-center px-1 py-2 max-w-3xl mx-auto">
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
            `}</style>
        </div>
    );
};

export default TabletLayout;
