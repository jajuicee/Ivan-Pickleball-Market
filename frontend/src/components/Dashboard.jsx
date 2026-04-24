import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Routes, Route, Link, useLocation, Navigate, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard,
    PackagePlus,
    Boxes,
    History,
    TrendingUp,
    ShoppingCart,
    Loader2,
    Receipt,
    ClipboardList,
    Building2,
    Truck,
    BarChart2,
    Tablet
} from 'lucide-react';

// Main Page Components
import Inventory from './Inventory';
import AddProduct from './AddProduct';
import OrderPage from './OrderPage';
import OrderHistory from './OrderHistory';
import Analytics from './Analytics';
import Expenses from './Expenses';
import ManageInventory from './ManageInventory';
import Supplies from './Supplies';
import Suppliers from './Suppliers';
import ProductSales from './ProductSales';

const Dashboard = () => {
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
        { name: 'New Order',       path: '/orders',           icon: ShoppingCart },
        { name: 'Add Products',    path: '/add-product',      icon: PackagePlus },
        { name: 'View Inventory',  path: '/inventory',        icon: Boxes },
        { name: 'Manage Inventory',path: '/manage-inventory', icon: ClipboardList },
        { name: 'Supplies',        path: '/supplies',         icon: Truck },
        { name: 'Suppliers',       path: '/suppliers',        icon: Building2 },
        { name: 'Product Sales',   path: '/product-sales',    icon: BarChart2 },
        { name: 'Order History',   path: '/history',          icon: History },
        { name: 'Analytics',       path: '/analytics',        icon: TrendingUp },
        { name: 'Expenses',        path: '/expenses',         icon: Receipt },
    ];

    const currentTab = navItems.find(item => location.pathname.startsWith(item.path))?.name || 'Dashboard';

    return (
        <div className="flex h-screen bg-brand-cream font-sans text-brand-black overflow-hidden">

            {/* --- LEFT SIDEBAR --- */}
            <aside className="w-64 bg-brand-cream text-brand-black flex flex-col shadow-[4px_0_24px_rgba(0,0,0,0.05)] z-20 border-r border-stone-200">
                <div className="p-6 text-center border-b border-black/5 flex flex-col items-center">
                    <img src="/logo.png" alt="Cebu Pickleball Market Logo"
                        onError={(e) => { e.target.style.display = 'none'; }}
                        className="w-[100px] h-[100px] rounded-full brightness-105 mb-4 shadow-xl border-4 border-white object-cover"
                    />
                    <h1 className="text-2xl tracking-wider text-black uppercase leading-tight">
                        Cebu PICKLEBALL
                        <span className="block text-sm text-black/80 mt-1 tracking-widest">Market</span>
                    </h1>
                </div>

                <nav className="flex-1 px-4 py-8 space-y-2">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname.startsWith(item.path);
                        return (
                            <Link
                                key={item.name}
                                to={item.path}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${isActive
                                    ? 'bg-white shadow-md font-black tracking-wide text-black border border-stone-200'
                                    : 'hover:shadow-md text-black/70 hover:text-black font-medium border border-transparent'
                                    }`}
                            >
                                <Icon size={20} className={isActive ? 'text-black' : 'text-black/60'} />
                                {item.name}
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-black/5 text-xs text-black/40 text-center uppercase tracking-widest font-bold">
                    System Hub v2.0
                </div>
            </aside>

            {/* --- MAIN CONTENT AREA --- */}
            <main className="flex-1 flex flex-col relative w-full h-full overflow-hidden">
                <header className="bg-brand-cream border-b border-brand-black/10 px-8 py-5 flex justify-between items-center z-10 shadow-sm relative">
                    <div className="flex items-center gap-3 text-brand-black/40">
                        <LayoutDashboard size={20} />
                        <h2 className="text-2xl font-black text-brand-black tracking-tight">{currentTab}</h2>
                    </div>
                    <div className="flex items-center gap-4">
                        {loadingProducts && (
                            <div className="flex items-center gap-2 px-3 py-1 bg-amber-100 border border-amber-300 rounded-full">
                                <Loader2 size={12} className="animate-spin text-amber-700" />
                                <span className="text-xs font-bold uppercase tracking-wider text-amber-800">Syncing Data</span>
                            </div>
                        )}
                        {!loadingProducts && (
                            <div className="flex items-center gap-2 px-3 py-1 bg-green-100 border border-green-300 rounded-full">
                                <span className="w-2 h-2 bg-green-600 rounded-full animate-pulse shadow-[0_0_8px_rgba(22,163,74,0.8)]"></span>
                                <span className="text-xs font-bold uppercase tracking-wider text-green-800">Realtime Sync Active</span>
                            </div>
                        )}
                        <button
                            onClick={() => navigate('/tablet')}
                            className="flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-zinc-800 transition-all shadow-lg shadow-zinc-900/10 active:scale-95 border border-white/10"
                        >
                            <Tablet size={14} />
                            Tablet View
                        </button>
                    </div>
                </header>

                {/* ── ROUTED VIEWS — key on pathname so div remounts and animates on every tab switch ── */}
                <div className="flex-1 overflow-hidden bg-[#F7F6F0]">
                    <div
                        key={location.pathname}
                        className="h-full flex flex-col p-8 pb-12 w-full mx-auto min-h-0"
                        style={{ animation: 'pageSlideIn 380ms cubic-bezier(0.16, 1, 0.3, 1) both' }}
                    >
                        <Routes>
                            <Route path="/" element={<Navigate to="/inventory" replace />} />
                            <Route path="/orders" element={<OrderPage products={products} loading={loadingProducts} refetchProducts={fetchProducts} />} />
                            <Route path="/add-product" element={<AddProduct onProductAdded={fetchProducts} />} />
                            <Route path="/inventory" element={<Inventory products={products} loading={loadingProducts} refetchProducts={fetchProducts} />} />
                            <Route path="/manage-inventory" element={<ManageInventory products={products} loading={loadingProducts} refetchProducts={fetchProducts} />} />
                            <Route path="/supplies" element={<Supplies />} />
                            <Route path="/suppliers" element={<Suppliers />} />
                            <Route path="/product-sales" element={<ProductSales products={products} />} />
                            <Route path="/history" element={<OrderHistory />} />
                            <Route path="/analytics" element={<Analytics />} />
                            <Route path="/expenses" element={<Expenses />} />
                        </Routes>
                    </div>
                </div>
            </main>

            <style>{`
                @keyframes pageSlideIn {
                    0%   { opacity: 0; transform: translateY(-12px) scale(0.98); filter: blur(4px); }
                    60%  { opacity: 1; filter: blur(0px); }
                    100% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0px); }
                }
            `}</style>
        </div>
    );
};

export default Dashboard;