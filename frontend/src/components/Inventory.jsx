import React, { useState, useMemo, useRef } from 'react';
import axios from 'axios';
import { Package, PlusCircle, X, CheckCircle, AlertCircle, Search, Loader2 } from 'lucide-react';

// Props: products (array), loading (bool), refetchProducts (fn)
const Inventory = ({ products = [], loading = false, refetchProducts }) => {

    // --- INFINITE SCROLL STATE ---
    const [displayedCount, setDisplayedCount] = useState(15);
    const tableContainerRef = useRef(null);

    // --- RESTOCK STATE ---
    const [queuedRestocks, setQueuedRestocks] = useState({}); // { [variantId]: { quantity: '', acquisitionPrice: '', sku: '', name: '' } }
    const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [stockStatus, setStockStatus] = useState({ type: '', message: '' });

    // --- TABLE FILTER STATE (main table search bar) ---
    const [tableFilter, setTableFilter] = useState('');

    // --- FLATTEN DATA ---
    const flattenedInventory = useMemo(() => {
        return products.flatMap(product =>
            product.variants?.map(variant => {
                const isPaddle = product.category === 'Paddles';
                return {
                    variantId: variant.id,
                    productId: product.id,
                    sku: variant.sku,
                    brand: product.brandName,
                    name: product.modelName,
                    color: variant.color === 'N/A' ? '-' : variant.color,
                    variantDetails: isPaddle ? `${variant.thicknessMm}mm ${variant.shape}` : '-',
                    quantity: variant.stockQuantity,
                    dropdownName: isPaddle
                        ? `${product.brandName} ${product.modelName} ${variant.color} ${variant.thicknessMm}mm`
                        : `${product.brandName} ${product.modelName}`
                };
            }) || []
        );
    }, [products]);



    // --- FILTER TABLE ROWS (main table) ---
    const filteredInventory = useMemo(() => {
        if (!tableFilter.trim()) return flattenedInventory;
        const q = tableFilter.toLowerCase();
        return flattenedInventory.filter(item =>
            item.sku.toLowerCase().includes(q) ||
            item.brand.toLowerCase().includes(q) ||
            item.name.toLowerCase().includes(q) ||
            item.dropdownName.toLowerCase().includes(q)
        );
    }, [tableFilter, flattenedInventory]);

    const handleScroll = () => {
        if (tableContainerRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = tableContainerRef.current;
            if (scrollTop + clientHeight >= scrollHeight - 50) {
                if (displayedCount < filteredInventory.length) {
                    setDisplayedCount(prev => prev + 15);
                }
            }
        }
    };

    const visibleData = filteredInventory.slice(0, displayedCount);

    const handleQueueItem = (item) => {
        setQueuedRestocks(prev => ({
            ...prev,
            [item.variantId]: { quantity: '', acquisitionPrice: '', sku: item.sku, name: item.dropdownName }
        }));
    };

    const handleRemoveFromQueue = (variantId) => {
        setQueuedRestocks(prev => {
            const next = { ...prev };
            delete next[variantId];
            return next;
        });
    };

    const handleUpdateQueue = (variantId, field, value) => {
        setQueuedRestocks(prev => ({
            ...prev,
            [variantId]: { ...prev[variantId], [field]: value }
        }));
    };

    const handleConfirmRestock = () => {
        setIsSubmitting(true);
        setStockStatus({ type: '', message: '' });

        const requests = Object.entries(queuedRestocks).map(([variantId, data]) => {
            if (!data.quantity || Number(data.quantity) <= 0) return Promise.resolve(); // Skip empty
            let url = `http://localhost:8080/api/products/variants/${variantId}/add-stock?quantity=${data.quantity}`;
            if (data.acquisitionPrice) {
                url += `&acquisitionPrice=${data.acquisitionPrice}`;
            }
            return axios.patch(url);
        });

        Promise.all(requests)
            .then(() => {
                setStockStatus({ type: 'success', message: 'All stock updated successfully!' });
                if (refetchProducts) refetchProducts();
                setTimeout(() => {
                    setIsSummaryModalOpen(false);
                    setQueuedRestocks({});
                    setStockStatus({ type: '', message: '' });
                }, 1500);
            })
            .catch(err => {
                console.error(err);
                setStockStatus({ type: 'error', message: 'Failed to update some stock. Check backend.' });
            })
            .finally(() => setIsSubmitting(false));
    };

    const validQueuedCount = Object.values(queuedRestocks).filter(data => data.quantity && Number(data.quantity) > 0).length;

    return (
        <div className="flex flex-col h-full relative">

            {/* HEADER */}
            <div className="flex flex-wrap justify-between items-center gap-4 mb-4 shrink-0">
                <h2 className="text-2xl font-bold text-zinc-800 flex items-center gap-2">
                    <Package className="text-zinc-500" /> Current Stock
                    {!loading && (
                        <span className="ml-2 text-sm font-normal text-zinc-400">
                            {tableFilter
                                ? `${filteredInventory.length} of ${flattenedInventory.length} items`
                                : `${flattenedInventory.length} items`}
                        </span>
                    )}
                </h2>

                <div className="flex items-center gap-3">
                    {/* TABLE FILTER / SEARCH BAR */}
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search size={15} className="text-zinc-400" />
                        </div>
                        <input
                            type="text"
                            value={tableFilter}
                            onChange={e => { setTableFilter(e.target.value); setDisplayedCount(15); }}
                            placeholder="Filter by SKU, brand, name…"
                            className="pl-9 pr-3 py-2 text-sm border border-stone-300 rounded-lg focus:ring-2 focus:ring-zinc-900 outline-none w-64"
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

            {/* TABLE CONTAINER */}
            <div
                ref={tableContainerRef}
                onScroll={handleScroll}
                className="flex-1 overflow-auto bg-white border border-stone-200 rounded-xl shadow-sm relative"
            >
                <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-stone-100 shadow-sm z-10 text-xs uppercase tracking-wider text-zinc-500 font-bold border-b border-stone-200">
                        <tr>
                            <th className="px-6 py-4">SKU</th>
                            <th className="px-6 py-4">Brand</th>
                            <th className="px-6 py-4">Name</th>
                            <th className="px-6 py-4">Color</th>
                            <th className="px-6 py-4">Variant</th>
                            <th className="px-6 py-4 text-right">Qty</th>
                            <th className="px-6 py-4 text-right">Restock</th>
                        </tr>
                    </thead>

                    <tbody className="divide-y divide-stone-100 text-sm">
                        {loading ? (
                            // Loading skeleton rows
                            Array.from({ length: 6 }).map((_, i) => (
                                <tr key={i} className="animate-pulse">
                                    {Array.from({ length: 6 }).map((_, j) => (
                                        <td key={j} className="px-6 py-4">
                                            <div className="h-4 bg-stone-200 rounded w-3/4"></div>
                                        </td>
                                    ))}
                                </tr>
                            ))
                        ) : visibleData.length > 0 ? (
                            visibleData.map((row) => (
                                <tr key={row.variantId} className="hover:bg-stone-50 transition-colors group">
                                    <td className="px-6 py-4 font-mono font-medium text-zinc-600">{row.sku}</td>
                                    <td className="px-6 py-4 font-bold text-zinc-900">{row.brand}</td>
                                    <td className="px-6 py-4 text-zinc-700">{row.name}</td>
                                    <td className="px-6 py-4 text-zinc-600">{row.color}</td>
                                    <td className="px-6 py-4 text-zinc-600">{row.variantDetails}</td>
                                    <td className="px-6 py-4 text-right">
                                        <span className={`font-bold px-2 py-1 rounded ${row.quantity > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                            {row.quantity}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right w-48">
                                        {queuedRestocks[row.variantId] ? (
                                            <div className="flex flex-col gap-2 items-end">
                                                <div className="flex items-center gap-2">
                                                    <input 
                                                        type="number" 
                                                        placeholder="Qty" 
                                                        min="1"
                                                        value={queuedRestocks[row.variantId].quantity}
                                                        onChange={(e) => handleUpdateQueue(row.variantId, 'quantity', e.target.value)}
                                                        className="w-16 px-2 py-1 text-sm border border-stone-300 rounded focus:ring-1 focus:ring-zinc-900 outline-none"
                                                    />
                                                    <input 
                                                        type="number" 
                                                        placeholder="Price (Opt)" 
                                                        step="0.01"
                                                        min="0"
                                                        value={queuedRestocks[row.variantId].acquisitionPrice}
                                                        onChange={(e) => handleUpdateQueue(row.variantId, 'acquisitionPrice', e.target.value)}
                                                        className="w-24 px-2 py-1 text-sm border border-stone-300 rounded focus:ring-1 focus:ring-zinc-900 outline-none"
                                                    />
                                                    <button onClick={() => handleRemoveFromQueue(row.variantId)} className="text-zinc-400 hover:text-red-500 p-1">
                                                        <X size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <button 
                                                onClick={() => handleQueueItem(row)}
                                                className="inline-flex items-center justify-center p-1.5 text-zinc-500 hover:text-zinc-900 hover:bg-stone-100 rounded-md transition-colors"
                                            >
                                                <PlusCircle size={18} />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="6" className="px-6 py-12 text-center text-zinc-500 border-dashed border-t">
                                    No products found in the database.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* --- FLOATING CART BAR --- */}
            {validQueuedCount > 0 && (
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-zinc-900 text-white px-6 py-4 rounded-full shadow-2xl flex items-center gap-6 z-40 animate-in slide-in-from-bottom-8">
                    <div className="font-bold">
                        {validQueuedCount} item{validQueuedCount !== 1 ? 's' : ''} ready to restock
                    </div>
                    <button 
                        onClick={() => setIsSummaryModalOpen(true)}
                        className="bg-white text-zinc-900 px-5 py-2 rounded-full font-bold hover:bg-stone-200 transition-colors"
                    >
                        Confirm Restock
                    </button>
                </div>
            )}

            {/* --- SUMMARY MODAL --- */}
            {isSummaryModalOpen && (
                <div className="fixed inset-0 bg-zinc-950/60 z-50 flex justify-center items-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="px-6 py-4 border-b flex justify-between items-center bg-stone-50 shrink-0">
                            <h2 className="text-lg font-bold uppercase tracking-wide text-zinc-800 flex items-center gap-2">
                                <Package size={20} /> Review Restock
                            </h2>
                            <button onClick={() => !isSubmitting && setIsSummaryModalOpen(false)} className="text-zinc-400 hover:text-red-500"><X size={20} /></button>
                        </div>
                        
                        <div className="p-6 overflow-y-auto flex-1">
                            {stockStatus.message && (
                                <div className={`p-3 mb-4 rounded-lg text-sm flex items-center gap-2 ${stockStatus.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                                    {stockStatus.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                                    <span className="font-medium">{stockStatus.message}</span>
                                </div>
                            )}

                            <div className="space-y-3">
                                {Object.entries(queuedRestocks).map(([variantId, data]) => {
                                    if (!data.quantity || Number(data.quantity) <= 0) return null;
                                    return (
                                        <div key={variantId} className="flex justify-between items-center p-3 border border-stone-200 rounded-lg">
                                            <div>
                                                <div className="font-bold text-zinc-800">{data.name}</div>
                                                <div className="text-xs font-mono text-zinc-500">SKU: {data.sku}</div>
                                            </div>
                                            <div className="text-right flex items-center gap-4">
                                                <div>
                                                    <div className="text-xs font-bold text-zinc-400">QTY</div>
                                                    <div className="font-bold text-zinc-800">+{data.quantity}</div>
                                                </div>
                                                <div>
                                                    <div className="text-xs font-bold text-zinc-400">COST</div>
                                                    <div className="font-bold text-zinc-800">{data.acquisitionPrice ? `₱${Number(data.acquisitionPrice).toFixed(2)}` : 'N/A'}</div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="p-4 border-t border-stone-200 bg-stone-50 flex justify-end gap-3 shrink-0">
                            <button onClick={() => setIsSummaryModalOpen(false)} disabled={isSubmitting} className="px-4 py-2 rounded-lg font-bold text-zinc-600 hover:bg-stone-200 disabled:opacity-50">Back</button>
                            <button onClick={handleConfirmRestock} disabled={isSubmitting} className="px-6 py-2 bg-zinc-950 text-white rounded-lg font-bold flex items-center gap-2 hover:bg-zinc-800 disabled:bg-zinc-400 transition-colors">
                                {isSubmitting && <Loader2 size={16} className="animate-spin" />} Submit Restock
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Inventory;