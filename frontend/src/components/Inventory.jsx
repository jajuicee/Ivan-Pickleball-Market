import React, { useState, useMemo, useRef } from 'react';
import axios from 'axios';
import { Package, PlusCircle, X, CheckCircle, AlertCircle, Search, Loader2 } from 'lucide-react';

// Props: products (array), loading (bool), refetchProducts (fn)
const Inventory = ({ products = [], loading = false, refetchProducts }) => {

    // --- INFINITE SCROLL STATE ---
    const [displayedCount, setDisplayedCount] = useState(15);
    const tableContainerRef = useRef(null);

    // --- MODAL STATE ---
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [stockStatus, setStockStatus] = useState({ type: '', message: '' });
    const [stockForm, setStockForm] = useState({ variantId: '', quantity: '' });

    // --- TABLE FILTER STATE (main table search bar) ---
    const [tableFilter, setTableFilter] = useState('');

    // --- MODAL SEARCH STATE ---
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedItem, setSelectedItem] = useState(null);

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

    // --- FILTER SEARCH RESULTS ---
    const searchResults = useMemo(() => {
        if (!searchQuery) return [];
        const lowerQuery = searchQuery.toLowerCase();
        return flattenedInventory.filter(item =>
            item.dropdownName.toLowerCase().includes(lowerQuery) ||
            item.sku.toLowerCase().includes(lowerQuery) ||
            item.brand.toLowerCase().includes(lowerQuery)
        ).slice(0, 10); // Limit to top 10 results to keep the UI clean
    }, [searchQuery, flattenedInventory]);

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

    // --- RESET MODAL HELPER ---
    const closeModal = () => {
        setIsModalOpen(false);
        setStockForm({ variantId: '', quantity: '' });
        setStockStatus({ type: '', message: '' });
        setSearchQuery('');
        setSelectedItem(null);
    };

    const handleAddStock = (e) => {
        e.preventDefault();
        setStockStatus({ type: '', message: '' });

        if (!stockForm.variantId || !stockForm.quantity) {
            setStockStatus({ type: 'error', message: 'Please select an item and enter a quantity.' });
            return;
        }

        axios.patch(`http://localhost:8080/api/products/variants/${stockForm.variantId}/add-stock?quantity=${stockForm.quantity}`)
            .then(() => {
                setStockStatus({ type: 'success', message: 'Stock updated successfully!' });
                if (refetchProducts) refetchProducts(); // Refresh shared data in Dashboard
                setTimeout(() => closeModal(), 1500);
            })
            .catch(err => {
                console.error(err);
                setStockStatus({ type: 'error', message: 'Failed to update stock. Check backend.' });
            });
    };

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

                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="bg-zinc-950 hover:bg-zinc-800 text-white px-5 py-2.5 rounded-lg font-bold flex items-center gap-2 transition-all shadow-sm"
                    >
                        <PlusCircle size={18} /> Add Stock
                    </button>
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

            {/* --- ADD STOCK MODAL --- */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-zinc-950/60 z-50 flex justify-center items-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-visible">

                        <div className="px-6 py-4 border-b flex justify-between items-center bg-stone-50 rounded-t-xl">
                            <h2 className="text-lg font-bold uppercase tracking-wide text-zinc-800">Receive Shipment</h2>
                            <button onClick={closeModal} className="text-zinc-400 hover:text-red-500"><X size={20} /></button>
                        </div>

                        <div className="p-6">
                            {stockStatus.message && (
                                <div className={`p-3 mb-4 rounded-lg text-sm flex items-center gap-2 ${stockStatus.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                                    {stockStatus.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                                    <span className="font-medium">{stockStatus.message}</span>
                                </div>
                            )}

                            <form id="stock-form" onSubmit={handleAddStock} className="space-y-6">

                                {/* SEARCH & SELECT COMPONENT */}
                                <div>
                                    <label className="block text-sm font-bold text-zinc-700 mb-2">Search Product to Update</label>

                                    {!selectedItem ? (
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <Search size={16} className="text-zinc-400" />
                                            </div>
                                            <input
                                                type="text"
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                className="w-full pl-10 pr-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-zinc-900 outline-none"
                                                placeholder="Search by SKU, Brand, or Name..."
                                            />

                                            {/* Live Dropdown Results */}
                                            {searchQuery && (
                                                <div className="absolute w-full mt-2 bg-white border border-stone-200 rounded-lg shadow-xl max-h-60 overflow-y-auto z-50">
                                                    {searchResults.length > 0 ? (
                                                        searchResults.map(item => (
                                                            <div
                                                                key={item.variantId}
                                                                onClick={() => {
                                                                    setSelectedItem(item);
                                                                    setStockForm({ ...stockForm, variantId: item.variantId });
                                                                    setSearchQuery('');
                                                                }}
                                                                className="px-4 py-3 hover:bg-stone-50 cursor-pointer border-b border-stone-100 last:border-0 transition-colors"
                                                            >
                                                                <div className="flex justify-between items-start">
                                                                    <div>
                                                                        <div className="font-bold text-zinc-900">{item.dropdownName}</div>
                                                                        <div className="text-xs font-mono text-zinc-500 mt-1">SKU: {item.sku}</div>
                                                                    </div>
                                                                    <div className="text-xs font-bold bg-stone-100 text-zinc-600 px-2 py-1 rounded">
                                                                        Stock: {item.quantity}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <div className="px-4 py-3 text-sm text-zinc-500 text-center">No products found matching "{searchQuery}"</div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        // SELECTED ITEM DISPLAY
                                        <div className="flex justify-between items-center p-3 border-2 border-zinc-900 rounded-lg bg-stone-50">
                                            <div>
                                                <div className="text-sm font-bold text-zinc-900">{selectedItem.dropdownName}</div>
                                                <div className="text-xs font-mono text-zinc-500">SKU: {selectedItem.sku} | Current Stock: {selectedItem.quantity}</div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => { setSelectedItem(null); setStockForm({ ...stockForm, variantId: '' }); }}
                                                className="text-zinc-400 hover:text-red-500 p-1"
                                                title="Clear selection"
                                            >
                                                <X size={20} />
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-zinc-700 mb-1">Quantity to Add</label>
                                    <input
                                        type="number"
                                        required
                                        min="1"
                                        disabled={!selectedItem} // Disable until they pick an item
                                        value={stockForm.quantity}
                                        onChange={e => setStockForm({ ...stockForm, quantity: e.target.value })}
                                        className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-zinc-900 outline-none disabled:bg-stone-100 disabled:text-zinc-400 disabled:cursor-not-allowed"
                                        placeholder="e.g., 5"
                                    />
                                </div>
                            </form>
                        </div>

                        <div className="p-4 border-t border-stone-200 bg-stone-50 flex justify-end gap-3 rounded-b-xl">
                            <button onClick={closeModal} className="px-4 py-2 rounded-lg font-bold text-zinc-600 hover:bg-stone-200">Cancel</button>
                            <button form="stock-form" type="submit" disabled={!selectedItem} className="px-4 py-2 bg-zinc-950 text-white rounded-lg font-bold flex items-center gap-2 hover:bg-zinc-800 disabled:bg-zinc-400 disabled:cursor-not-allowed">
                                <PlusCircle size={16} /> Update Stock
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Inventory;