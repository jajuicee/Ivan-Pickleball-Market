import React, { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import { Package, X, CheckCircle, Search, Loader2, Truck, Building2 } from 'lucide-react';

const BASE = `http://${window.location.hostname}:8080`;

// Read-only current stock view. Stock additions and deductions are in "Manage Inventory".
const Inventory = ({ products = [], loading = false, refetchProducts }) => {

    // --- INFINITE SCROLL ---
    const [displayedCount, setDisplayedCount] = useState(15);
    const tableContainerRef = useRef(null);

    // --- TABLE FILTER ---
    const [tableFilter, setTableFilter] = useState('');

    // --- FLATTEN DATA ---
    const flattenedInventory = useMemo(() => {
        return products.flatMap(product =>
            (product.variants || []).map(variant => {
                const isPaddle = product.category === 'Paddles';
                return {
                    variantId: variant.id,
                    sku: variant.sku,
                    brand: product.brandName,
                    name: product.modelName,
                    color: (variant.color === 'N/A' || !variant.color) ? '-' : variant.color,
                    variantDetails: isPaddle ? `${variant.thicknessMm || 0}mm ${variant.shape || ''}` : '-',
                    quantity: variant.stockQuantity ?? 0,
                    totalAdded: variant.totalAdded || 0,
                    totalSold: variant.totalSold || 0,
                    consigned: variant.consigned,
                    defaultSupplier: variant.defaultSupplier,
                    category: product.category,
                    dropdownName: isPaddle
                        ? `${product.brandName} ${product.modelName} ${variant.color || ''} ${variant.thicknessMm || 0}mm`
                        : `${product.brandName} ${product.modelName}`
                };
            })
        );
    }, [products]);

    const filteredInventory = useMemo(() => {
        let list = flattenedInventory;
        if (!tableFilter.trim()) return list;
        const q = tableFilter.toLowerCase();
        return list.filter(item =>
            (item.sku || '').toLowerCase().includes(q) ||
            (item.brand || '').toLowerCase().includes(q) ||
            (item.name || '').toLowerCase().includes(q) ||
            (item.dropdownName || '').toLowerCase().includes(q)
        );
    }, [tableFilter, flattenedInventory]);

    const searchSummary = useMemo(() => {
        if (!tableFilter.trim()) return null;
        const grouped = {};
        filteredInventory.forEach(item => {
            const key = `${item.brand} ${item.name}`;
            if (!grouped[key]) grouped[key] = { label: key, totalQty: 0, totalSold: 0, totalAdded: 0, variantCount: 0 };
            grouped[key].totalQty += (item.quantity || 0);
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

                <div className="flex items-center gap-3">

                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search size={15} className="text-zinc-400" />
                        </div>
                        <input
                            type="text"
                            value={tableFilter}
                            onChange={e => { setTableFilter(e.target.value); setDisplayedCount(15); }}
                            placeholder="Filter by SKU, brand, name…"
                            className="pl-9 pr-3 py-2 text-sm border border-stone-300 rounded-lg focus:ring-2 focus:ring-zinc-900 outline-none w-60"
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

            {/* SEARCH SUMMARY */}
            {searchSummary?.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 px-1 py-2 shrink-0">
                    <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Total:</span>
                    {searchSummary.map(group => (
                        <div key={group.label} className="flex items-center gap-2 px-3 py-1.5 bg-white border border-stone-200 rounded-full shadow-sm">
                            <span className="text-sm font-bold text-zinc-700">{group.label}</span>
                            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700" title="Current Qty">{group.totalQty} in stock</span>
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
                            <th className="px-5 py-4 text-right">Status / Tracking</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 text-sm">
                        {loading ? (
                            Array.from({ length: 6 }).map((_, i) => (
                                <tr key={i} className="animate-pulse">
                                    {Array.from({ length: 8 }).map((_, j) => (
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
                                    <td className="px-5 py-4 text-right">
                                        <div className="flex flex-col items-end gap-1.5">
                                            {/* Current stock — big & colored */}
                                            <span className="text-base font-black leading-none text-zinc-900">
                                                {row.quantity ?? 0} stock{(row.quantity ?? 0) !== 1 ? 's' : ''} left
                                            </span>
                                            {/* Sold / Total sub-row */}
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
                                <td colSpan="8" className="px-6 py-12 text-center text-zinc-500 border-dashed border-t">
                                    No products found in the database.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Inventory;