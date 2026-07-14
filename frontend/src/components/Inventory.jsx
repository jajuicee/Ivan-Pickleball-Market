import React, { useState, useMemo, useRef } from 'react';
import { Package, X, Search, Building2, Boxes, Coins, AlertTriangle, PackageX, Tag } from 'lucide-react';

const DEFAULT_LOW_STOCK_THRESHOLD = 5;

const formatPHP = (n) =>
    new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', minimumFractionDigits: 2 }).format(Number(n) || 0);

// Read-only current stock view. Stock additions and deductions are in "Manage Inventory".
const Inventory = ({ products = [], loading = false }) => {

    // --- INFINITE SCROLL ---
    const [displayedCount, setDisplayedCount] = useState(15);
    const tableContainerRef = useRef(null);

    // --- TABLE FILTER ---
    const [tableFilter, setTableFilter] = useState('');
    const [sortOrder, setSortOrder] = useState('name-asc');
    const [categoryFilter, setCategoryFilter] = useState('All'); // All, Paddles, Accessories, Shoes
    const [stockFilter, setStockFilter] = useState('all'); // all | low | out

    // --- FLATTEN DATA ---
    const flattenedInventory = useMemo(() => {
        return products.flatMap(product =>
            (product.variants || []).map(variant => {
                const isPaddle = product.category === 'Paddles';
                const isShoe = product.category === 'Shoes';
                const qty = variant.stockQuantity ?? 0;
                const threshold = variant.lowStockThreshold ?? DEFAULT_LOW_STOCK_THRESHOLD;
                return {
                    variantId: variant.id,
                    sku: variant.sku,
                    brand: product.brandName,
                    name: product.modelName,
                    color: (variant.color === 'N/A' || !variant.color) ? '-' : variant.color,
                    variantDetails: isPaddle
                        ? `${variant.thicknessMm || 0}mm ${variant.shape || ''}`
                        : isShoe
                            ? `Size ${variant.shape || '-'}`
                            : '-',
                    quantity: qty,
                    sellingPrice: variant.sellingPrice ?? 0,
                    acquisitionPrice: variant.acquisitionPrice ?? 0,
                    totalAdded: variant.totalAdded || 0,
                    totalSold: variant.totalSold || 0,
                    consigned: variant.consigned,
                    defaultSupplier: variant.defaultSupplier,
                    category: product.category,
                    lowStockThreshold: threshold,
                    isLowStock: qty > 0 && qty <= threshold,
                    isOutOfStock: qty <= 0,
                    dropdownName: isPaddle
                        ? `${product.brandName} ${product.modelName} ${variant.color || ''} ${variant.thicknessMm || 0}mm`
                        : isShoe
                            ? `${product.brandName} ${product.modelName} ${variant.shape || ''}`
                            : `${product.brandName} ${product.modelName}`
                };
            })
        );
    }, [products]);

    // --- STATS ---
    const stats = useMemo(() => {
        let totalSkus = flattenedInventory.length;
        let totalUnits = 0;
        let value = 0;
        let lowStock = 0;
        let outOfStock = 0;
        let consignedUnits = 0;
        for (const row of flattenedInventory) {
            totalUnits += row.quantity;
            value += row.quantity * Number(row.sellingPrice || 0);
            if (row.isOutOfStock) outOfStock++;
            else if (row.isLowStock) lowStock++;
            if (row.consigned) consignedUnits += row.quantity;
        }
        return { totalSkus, totalUnits, value, lowStock, outOfStock, consignedUnits };
    }, [flattenedInventory]);

    const filteredInventory = useMemo(() => {
        let list = [...flattenedInventory];
        
        if (categoryFilter !== 'All') {
            list = list.filter(i => i.category === categoryFilter);
        }

        if (stockFilter === 'low') list = list.filter(i => i.isLowStock);
        else if (stockFilter === 'out') list = list.filter(i => i.isOutOfStock);
        
        if (tableFilter.trim()) {
            const q = tableFilter.toLowerCase();
            list = list.filter(item =>
                (item.sku || '').toLowerCase().includes(q) ||
                (item.brand || '').toLowerCase().includes(q) ||
                (item.name || '').toLowerCase().includes(q) ||
                (item.dropdownName || '').toLowerCase().includes(q)
            );
        }

        list.sort((a, b) => {
            if (sortOrder === 'stock-asc') return a.quantity - b.quantity;
            if (sortOrder === 'stock-desc') return b.quantity - a.quantity;
            if (sortOrder === 'name-asc') return a.dropdownName.localeCompare(b.dropdownName, undefined, { numeric: true });
            if (sortOrder === 'name-desc') return b.dropdownName.localeCompare(a.dropdownName, undefined, { numeric: true });
            return 0;
        });

        return list;
    }, [tableFilter, stockFilter, sortOrder, categoryFilter, flattenedInventory]);

    const searchSummary = useMemo(() => {
        if (!tableFilter.trim()) return null;
        const grouped = {};
        filteredInventory.forEach(item => {
            const key = `${item.brand} ${item.name}`;
            if (!grouped[key]) grouped[key] = { label: key, totalQty: 0, totalValue: 0, totalSold: 0, totalAdded: 0, variantCount: 0 };
            grouped[key].totalQty += (item.quantity || 0);
            grouped[key].totalValue += (item.quantity || 0) * (item.sellingPrice || 0);
            grouped[key].totalSold += (item.totalSold || 0);
            grouped[key].totalAdded += (item.totalAdded || 0);
            grouped[key].variantCount += 1;
        });
        return Object.values(grouped);
    }, [tableFilter, filteredInventory]);

    const handleScroll = () => {
        if (tableContainerRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = tableContainerRef.current;
            if (scrollTop + clientHeight >= scrollHeight - 50 && displayedCount < filteredInventory.length) {
                setDisplayedCount(prev => prev + 15);
            }
        }
    };

    const visibleData = filteredInventory.slice(0, displayedCount);

    return (
        <div className="flex flex-col h-full relative">
            {/* HEADER */}
            <div className="flex flex-wrap justify-between items-center gap-4 mb-4 shrink-0">
                <h2 className="text-2xl font-bold text-zinc-800 flex items-center gap-2">
                    <Package className="text-zinc-500" /> Current Stock
                    {!loading && (
                        <span className="ml-2 text-sm font-normal text-zinc-400">
                            {tableFilter ? `${filteredInventory.length} of ${flattenedInventory.length} items` : `${flattenedInventory.length} items`}
                        </span>
                    )}
                </h2>

                <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto mt-2 sm:mt-0 justify-end">
                    <div className="flex bg-stone-200/50 p-1.5 rounded-xl border border-stone-200 mr-auto sm:mr-0 h-[38px] items-center">
                        {['All', 'Paddles', 'Accessories', 'Shoes'].map(cat => (
                            <button
                                key={cat}
                                onClick={() => { setCategoryFilter(cat); setDisplayedCount(15); }}
                                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                                    categoryFilter === cat 
                                        ? 'bg-white text-zinc-900 shadow-sm border border-stone-200' 
                                        : 'text-zinc-500 hover:text-zinc-700'
                                }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                    <div className="relative flex-1 sm:flex-none">
                        <select
                            value={sortOrder}
                            onChange={(e) => setSortOrder(e.target.value)}
                            className="pl-3 pr-8 py-2 text-sm border border-stone-300 rounded-lg focus:ring-2 focus:ring-zinc-900 outline-none bg-white font-bold text-zinc-600 h-[38px]"
                        >
                            <option value="name-asc">Name (A-Z)</option>
                            <option value="name-desc">Name (Z-A)</option>
                            <option value="stock-asc">Stock (Low to High)</option>
                            <option value="stock-desc">Stock (High to Low)</option>
                        </select>
                    </div>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search size={15} className="text-zinc-400" />
                        </div>
                        <input
                            type="text"
                            value={tableFilter}
                            onChange={e => { setTableFilter(e.target.value); setDisplayedCount(15); }}
                            placeholder="Filter by SKU, brand, name…"
                            className="pl-9 pr-8 py-2 text-sm border border-stone-300 rounded-lg focus:ring-2 focus:ring-zinc-900 outline-none w-60 h-[38px]"
                        />
                        {tableFilter && (
                            <button
                                onClick={() => { setTableFilter(''); setDisplayedCount(15); }}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-400 hover:text-zinc-700"
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* STAT CARDS */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-4 shrink-0">
                <StatCard Icon={Boxes} label="SKUs" primary={stats.totalSkus} secondary={`${stats.totalUnits} units in stock`} loading={loading} />
                <StatCard Icon={Coins} label="Inventory Value" primary={loading ? '—' : formatPHP(stats.value)} secondary="at selling price" accent="emerald" loading={loading} />
                <StatCard Icon={AlertTriangle} label="Low Stock" primary={stats.lowStock} secondary={`≤ ${DEFAULT_LOW_STOCK_THRESHOLD} units (default)`} accent="amber" loading={loading}
                    active={stockFilter === 'low'} onClick={() => { setStockFilter(stockFilter === 'low' ? 'all' : 'low'); setDisplayedCount(15); }} />
                <StatCard Icon={PackageX} label="Out of Stock" primary={stats.outOfStock} secondary="needs reorder" accent="red" loading={loading}
                    active={stockFilter === 'out'} onClick={() => { setStockFilter(stockFilter === 'out' ? 'all' : 'out'); setDisplayedCount(15); }} />
                <StatCard Icon={Tag} label="Consigned Units" primary={stats.consignedUnits} secondary="of supplier stock" accent="indigo" loading={loading} />
            </div>

            {/* SEARCH SUMMARY */}
            {searchSummary?.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 px-1 py-2 shrink-0">
                    <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Total:</span>
                    {searchSummary.map(group => (
                        <div key={group.label} className="flex items-center gap-2 px-3 py-1.5 bg-white border border-stone-200 rounded-full shadow-sm">
                            <span className="text-sm font-bold text-zinc-700">{group.label}</span>
                            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700" title="Current Qty">{group.totalQty} in stock</span>
                            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700" title="Unsold Value">{formatPHP(group.totalValue)}</span>
                            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-stone-100 text-zinc-500" title="All-time Sold/Total">
                                {group.totalSold} sold / {group.totalAdded} total
                            </span>
                            <span className="text-xs text-zinc-400">{group.variantCount} variant{group.variantCount !== 1 ? 's' : ''}</span>
                        </div>
                    ))}
                </div>
            )}

            {/* TABLE */}
            <div
                ref={tableContainerRef}
                onScroll={handleScroll}
                className="flex-1 overflow-auto bg-white border border-stone-200 rounded-xl shadow-sm relative"
            >
                <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-stone-100 shadow-sm z-10 text-xs uppercase tracking-wider text-zinc-500 font-bold border-b border-stone-200">
                        <tr>
                            <th className="px-5 py-4">SKU</th>
                            <th className="px-5 py-4">Brand</th>
                            <th className="px-5 py-4">Name</th>
                            <th className="px-5 py-4">Color</th>
                            <th className="px-5 py-4">Variant</th>
                            <th className="px-5 py-4">Supplier</th>
                            <th className="px-5 py-4">Type</th>
                            <th className="px-5 py-4 text-right">Price</th>
                            <th className="px-5 py-4 text-right">Total Value</th>
                            <th className="px-5 py-4 text-right">Status / Tracking</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 text-sm">
                        {loading ? (
                            Array.from({ length: 6 }).map((_, i) => (
                                <tr key={i} className="animate-pulse">
                                    {Array.from({ length: 10 }).map((_, j) => (
                                        <td key={j} className="px-5 py-4">
                                            <div className="h-4 bg-stone-200 rounded w-3/4" />
                                        </td>
                                    ))}
                                </tr>
                            ))
                        ) : visibleData.length > 0 ? (
                            visibleData.map(row => (
                                <tr key={row.variantId} className="hover:bg-stone-50 transition-colors">
                                    <td className="px-5 py-4 font-mono font-medium text-zinc-600 text-xs">{row.sku}</td>
                                    <td className="px-5 py-4 font-bold text-zinc-900">{row.brand}</td>
                                    <td className="px-5 py-4 text-zinc-700">{row.name}</td>
                                    <td className="px-5 py-4 text-zinc-600">{row.color}</td>
                                    <td className="px-5 py-4 text-zinc-600">{row.variantDetails}</td>
                                    <td className="px-5 py-4">
                                        {row.defaultSupplier ? (
                                            <span className="flex items-center gap-1 text-indigo-700 bg-indigo-50 px-2 py-1 rounded-full text-xs font-bold w-fit">
                                                <Building2 size={10} /> {row.defaultSupplier.name}
                                            </span>
                                        ) : <span className="text-zinc-300 text-xs">—</span>}
                                    </td>
                                    <td className="px-5 py-4">
                                        {row.category === 'Paddles'
                                            ? row.consigned
                                                ? <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full text-xs font-bold">Consigned</span>
                                                : <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs font-bold">Owned</span>
                                            : <span className="text-zinc-400 text-xs">{row.category}</span>
                                        }
                                    </td>
                                    <td className="px-5 py-4 text-right font-bold text-emerald-700 whitespace-nowrap">
                                        {formatPHP(row.sellingPrice)}
                                    </td>
                                    <td className="px-5 py-4 text-right font-black text-emerald-800 whitespace-nowrap">
                                        {formatPHP((row.sellingPrice || 0) * (row.quantity || 0))}
                                    </td>
                                    <td className="px-5 py-4 text-right">
                                        <div className="flex flex-col items-end gap-1.5">
                                            <span className={`text-base font-black leading-none flex items-center gap-2 ${row.isOutOfStock ? 'text-red-600' : row.isLowStock ? 'text-amber-600' : 'text-zinc-900'}`}>
                                                {row.isLowStock && !row.isOutOfStock && <AlertTriangle size={14} className="text-amber-500" />}
                                                {row.isOutOfStock && <PackageX size={14} className="text-red-500" />}
                                                {row.quantity ?? 0} stock{(row.quantity ?? 0) !== 1 ? 's' : ''} left
                                            </span>
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                                                    {row.totalSold} sold
                                                </span>
                                                <span className="text-[10px] text-zinc-300">/</span>
                                                <span className="text-[10px] font-bold text-zinc-400 bg-stone-100 px-1.5 py-0.5 rounded">
                                                    {row.totalAdded} total
                                                </span>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="10" className="px-6 py-12 text-center text-zinc-500 border-dashed border-t">
                                    No products match the current filter.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

/* -------- Stat card subcomponent (compact variant) -------- */
const StatCard = (props) => {
    const { label, primary, secondary, accent = 'zinc', loading, active, onClick } = props;
    const Icon = props.Icon;
    const accentMap = {
        zinc:    { ring: 'border-stone-200',  text: 'text-zinc-900',   ic: 'text-zinc-400',   bg: 'bg-stone-100',   ringA: 'ring-zinc-900' },
        emerald: { ring: 'border-emerald-100', text: 'text-emerald-700', ic: 'text-emerald-500', bg: 'bg-emerald-50', ringA: 'ring-emerald-500' },
        indigo:  { ring: 'border-indigo-100',  text: 'text-indigo-700',  ic: 'text-indigo-500',  bg: 'bg-indigo-50',  ringA: 'ring-indigo-500' },
        amber:   { ring: 'border-amber-100',   text: 'text-amber-700',   ic: 'text-amber-500',   bg: 'bg-amber-50',   ringA: 'ring-amber-500' },
        red:     { ring: 'border-red-100',     text: 'text-red-700',     ic: 'text-red-500',     bg: 'bg-red-50',     ringA: 'ring-red-500' },
    };
    const c = accentMap[accent] || accentMap.zinc;
    const isClickable = !!onClick;
    return (
        <div
            onClick={onClick}
            className={`bg-white border ${c.ring} rounded-xl p-3 shadow-sm transition-all ${isClickable ? 'cursor-pointer hover:shadow-md' : ''} ${active ? `ring-2 ${c.ringA}` : ''}`}
        >
            <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black uppercase tracking-[0.12em] text-zinc-400">{label}</span>
                <div className={`p-1.5 rounded-md ${c.bg}`}>
                    <Icon size={12} className={c.ic} />
                </div>
            </div>
            {loading ? (
                <div className="h-6 bg-stone-100 rounded animate-pulse w-2/3" />
            ) : (
                <div className={`text-lg font-black tracking-tight ${c.text} truncate`}>{primary}</div>
            )}
            <p className="text-[10px] font-bold text-zinc-400 mt-0.5">{secondary}</p>
        </div>
    );
};

export default Inventory;
