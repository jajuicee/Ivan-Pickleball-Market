import React, { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import { Package, PlusCircle, MinusCircle, X, CheckCircle, AlertCircle, Search, Loader2, Truck } from 'lucide-react';

// Props: products (array), loading (bool), refetchProducts (fn)
const Inventory = ({ products = [], loading = false, refetchProducts }) => {

    // --- INFINITE SCROLL STATE ---
    const [displayedCount, setDisplayedCount] = useState(15);
    const tableContainerRef = useRef(null);

    // --- INCOMING STOCKS STATE ---
    const [incomingStocks, setIncomingStocks] = useState([]);
    
    useEffect(() => {
        const fetchIncoming = async () => {
            try {
                const res = await axios.get(`http://${window.location.hostname}:8080/api/incoming-stocks/pending`);
                setIncomingStocks(res.data);
            } catch (err) {
                console.error("Failed to fetch incoming stocks", err);
            }
        };
        fetchIncoming();
    }, [products]); // Re-fetch when products change just in case

    // --- RESTOCK STATE ---
    const [queuedRestocks, setQueuedRestocks] = useState({}); // { [variantId]: { quantity: '', acquisitionPrice: '', sku: '', name: '' } }
    const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
    const [isIncomingModalOpen, setIsIncomingModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [stockStatus, setStockStatus] = useState({ type: '', message: '' });

    // --- DEDUCT STOCK MODAL STATE ---
    const [deductModal, setDeductModal] = useState(null); // { variantId, name, currentQty }

    // --- TABLE FILTER STATE (main table search bar) ---
    const [tableFilter, setTableFilter] = useState('');
    const [showIncomingOnly, setShowIncomingOnly] = useState(false);

    // --- FLATTEN DATA ---
    const flattenedInventory = useMemo(() => {
        const incomingMap = {};
        incomingStocks.forEach(inc => {
            if (inc.variant && inc.variant.id) {
                incomingMap[inc.variant.id] = (incomingMap[inc.variant.id] || 0) + inc.quantity;
            }
        });

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
                    incomingQuantity: incomingMap[variant.id] || 0,
                    dropdownName: isPaddle
                        ? `${product.brandName} ${product.modelName} ${variant.color} ${variant.thicknessMm}mm`
                        : `${product.brandName} ${product.modelName}`
                };
            }) || []
        );
    }, [products, incomingStocks]);



    // --- FILTER TABLE ROWS (main table) ---
    const filteredInventory = useMemo(() => {
        let list = flattenedInventory;
        
        if (showIncomingOnly) {
            list = list.filter(item => item.incomingQuantity > 0);
        }

        if (!tableFilter.trim()) return list;
        
        const q = tableFilter.toLowerCase();
        return list.filter(item =>
            item.sku.toLowerCase().includes(q) ||
            item.brand.toLowerCase().includes(q) ||
            item.name.toLowerCase().includes(q) ||
            item.dropdownName.toLowerCase().includes(q)
        );
    }, [tableFilter, flattenedInventory, showIncomingOnly]);

    // --- SEARCH SUMMARY: group filtered results by brand+model ---
    const searchSummary = useMemo(() => {
        if (!tableFilter.trim()) return null;
        const grouped = {};
        filteredInventory.forEach(item => {
            const key = `${item.brand} ${item.name}`;
            if (!grouped[key]) grouped[key] = { label: key, totalQty: 0, variantCount: 0 };
            grouped[key].totalQty += (item.quantity || 0);
            grouped[key].variantCount += 1;
        });
        return Object.values(grouped);
    }, [tableFilter, filteredInventory]);

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

    const handleQueueItem = (item, type = 'RESTOCK') => {
        setQueuedRestocks(prev => ({
            ...prev,
            [item.variantId]: { quantity: '', acquisitionPrice: '', sku: item.sku, name: item.dropdownName, type }
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
            
            if (data.type === 'INCOMING') {
                return axios.post(`http://${window.location.hostname}:8080/api/incoming-stocks`, {
                    variant: { id: parseInt(variantId) },
                    quantity: parseInt(data.quantity),
                    expectedPrice: data.acquisitionPrice ? parseFloat(data.acquisitionPrice) : null
                });
            } else {
                let url = `http://${window.location.hostname}:8080/api/products/variants/${variantId}/add-stock?quantity=${data.quantity}`;
                if (data.acquisitionPrice) {
                    url += `&acquisitionPrice=${data.acquisitionPrice}`;
                }
                return axios.patch(url);
            }
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

    const handleReceiveIncoming = async (id) => {
        try {
            await axios.post(`http://${window.location.hostname}:8080/api/incoming-stocks/${id}/receive`);
            // Refresh incoming stocks queue locally
            const res = await axios.get(`http://${window.location.hostname}:8080/api/incoming-stocks/pending`);
            setIncomingStocks(res.data);
            // Refresh main product table via parent
            if (refetchProducts) refetchProducts();
        } catch (err) {
            console.error(err);
            alert("Failed to receive shipment. Check server logs.");
        }
    };

    const handleDeductStock = async ({ variantId, qty }) => {
        if (!qty || Number(qty) <= 0) return;
        try {
            await axios.patch(`http://${window.location.hostname}:8080/api/products/variants/${variantId}/deduct-stock?quantity=${qty}`);
            setDeductModal(null);
            if (refetchProducts) refetchProducts();
        } catch (err) {
            alert(err.response?.data?.error || 'Failed to deduct stock.');
        }
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
                    {incomingStocks.length > 0 && (
                        <button 
                            onClick={() => setIsIncomingModalOpen(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-sm font-bold border border-blue-200 transition-colors shadow-sm"
                        >
                            <Truck size={16} /> 
                            {incomingStocks.length} Incoming
                        </button>
                    )}

                    {/* TABLE FILTER / SEARCH BAR */}
                    <div className="flex bg-stone-100 p-1 rounded-lg border border-stone-200 mr-2">
                        <button 
                            onClick={() => { setShowIncomingOnly(false); setDisplayedCount(15); }}
                            className={`px-4 py-1.5 text-sm font-bold rounded-md transition-all ${!showIncomingOnly ? 'bg-white shadow-sm text-zinc-900 border border-stone-200' : 'text-zinc-500 hover:text-zinc-700'}`}
                        >
                            All Stock
                        </button>
                        <button 
                            onClick={() => { setShowIncomingOnly(true); setDisplayedCount(15); }}
                            className={`px-4 py-1.5 text-sm font-bold rounded-md transition-all ${showIncomingOnly ? 'bg-white shadow-sm text-blue-600 border border-stone-200 flex items-center gap-2' : 'text-zinc-500 hover:text-zinc-700 flex items-center gap-2'}`}
                        >
                            <Truck size={14} /> Incoming
                        </button>
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

            {/* SEARCH SUMMARY BAR */}
            {searchSummary && searchSummary.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 px-1 py-2 shrink-0">
                    <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Total:</span>
                    {searchSummary.map(group => (
                        <div key={group.label} className="flex items-center gap-2 px-3 py-1.5 bg-white border border-stone-200 rounded-full shadow-sm">
                            <span className="text-sm font-bold text-zinc-700">{group.label}</span>
                            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">{group.totalQty} units</span>
                            <span className="text-xs text-zinc-400">{group.variantCount} variant{group.variantCount !== 1 ? 's' : ''}</span>
                        </div>
                    ))}
                </div>
            )}

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
                                        <div className="flex items-center justify-end gap-2">
                                            <span className={`font-bold px-2 py-0.5 rounded text-[13px] ${row.quantity > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                {row.quantity}
                                            </span>
                                            {row.incomingQuantity > 0 && (
                                                <span className="font-bold px-2 py-0.5 rounded text-[13px] bg-blue-100 text-blue-700" title="Incoming Delivery">
                                                    +{row.incomingQuantity}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right w-56">
                                        {queuedRestocks[row.variantId] ? (
                                            <div className="flex flex-col gap-2 items-end">
                                                <div className="flex items-center gap-2">
                                                    {queuedRestocks[row.variantId].type === 'INCOMING' ? (
                                                        <span className="text-[10px] uppercase font-bold text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded flex items-center gap-1">
                                                            <Truck size={10} /> Incoming
                                                        </span>
                                                    ) : (
                                                        <span className="text-[10px] uppercase font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded flex items-center gap-1">
                                                            <PlusCircle size={10} /> Restock
                                                        </span>
                                                    )}
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
                                            <div className="flex items-center justify-end gap-1">
                                                <button 
                                                    onClick={() => handleQueueItem(row, 'RESTOCK')}
                                                    className="inline-flex items-center justify-center p-1.5 text-zinc-500 hover:text-green-600 hover:bg-stone-100 rounded-md transition-colors"
                                                    title="Add Physical Restock"
                                                >
                                                    <PlusCircle size={18} />
                                                </button>
                                                <button 
                                                    onClick={() => handleQueueItem(row, 'INCOMING')}
                                                    className="inline-flex items-center justify-center p-1.5 text-zinc-500 hover:text-blue-600 hover:bg-stone-100 rounded-md transition-colors"
                                                    title="Schedule Incoming Delivery"
                                                >
                                                    <Truck size={18} />
                                                </button>
                                                <button
                                                    onClick={() => setDeductModal({ variantId: row.variantId, name: row.dropdownName, currentQty: row.quantity, qty: '', reason: 'Return to Supplier' })}
                                                    className="inline-flex items-center justify-center p-1.5 text-zinc-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                                    title="Deduct Stock / Return to Supplier"
                                                >
                                                    <MinusCircle size={18} />
                                                </button>
                                            </div>
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
                        {validQueuedCount} item{validQueuedCount !== 1 ? 's' : ''} ready to process
                    </div>
                    <button 
                        onClick={() => setIsSummaryModalOpen(true)}
                        className="bg-white text-zinc-900 px-5 py-2 rounded-full font-bold hover:bg-stone-200 transition-colors"
                    >
                        Review Actions
                    </button>
                </div>
            )}

            {/* --- DEDUCT STOCK MODAL --- */}
            {deductModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm">
                        <div className="flex items-center gap-3 mb-5">
                            <div className="p-2 bg-red-100 rounded-xl"><MinusCircle size={20} className="text-red-600" /></div>
                            <div>
                                <h3 className="font-black text-zinc-900 text-base">Deduct Stock</h3>
                                <p className="text-xs text-zinc-500 truncate max-w-[220px]">{deductModal.name}</p>
                            </div>
                            <button onClick={() => setDeductModal(null)} className="ml-auto text-zinc-400 hover:text-zinc-700"><X size={18} /></button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-zinc-600 mb-1">Reason</label>
                                <select
                                    value={deductModal.reason}
                                    onChange={e => setDeductModal(d => ({ ...d, reason: e.target.value }))}
                                    className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-red-400"
                                >
                                    <option>Return to Supplier</option>
                                    <option>Damaged / Lost</option>
                                    <option>Manual Adjustment</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-zinc-600 mb-1">Quantity to Deduct <span className="text-zinc-400 font-normal">(Current: {deductModal.currentQty})</span></label>
                                <input
                                    type="number" min="1" max={deductModal.currentQty}
                                    value={deductModal.qty}
                                    onChange={e => setDeductModal(d => ({ ...d, qty: e.target.value }))}
                                    className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-red-400"
                                    placeholder={`Max ${deductModal.currentQty}`}
                                />
                            </div>
                        </div>

                        <div className="flex gap-2 mt-6">
                            <button
                                onClick={() => setDeductModal(null)}
                                className="flex-1 px-4 py-2 text-sm font-bold border border-stone-300 rounded-xl hover:bg-stone-50 transition-colors"
                            >Cancel</button>
                            <button
                                onClick={() => handleDeductStock({ variantId: deductModal.variantId, qty: deductModal.qty })}
                                disabled={!deductModal.qty || Number(deductModal.qty) <= 0}
                                className="flex-1 px-4 py-2 text-sm font-bold bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-40 transition-colors"
                            >Confirm Deduction</button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- SUMMARY MODAL --- */}
            {isSummaryModalOpen && (
                <div className="fixed inset-0 bg-zinc-950/60 z-50 flex justify-center items-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="px-6 py-4 border-b flex justify-between items-center bg-stone-50 shrink-0">
                            <h2 className="text-lg font-bold uppercase tracking-wide text-zinc-800 flex items-center gap-2">
                                <Package size={20} /> Review Inventory Updates
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
                                        <div key={variantId} className="flex justify-between items-start p-3 border border-stone-200 rounded-lg">
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    {data.type === 'INCOMING' ? (
                                                        <span className="text-[10px] font-bold uppercase tracking-widest text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded">Incoming Order</span>
                                                    ) : (
                                                        <span className="text-[10px] font-bold uppercase tracking-widest text-green-700 bg-green-100 px-1.5 py-0.5 rounded">Physical Restock</span>
                                                    )}
                                                </div>
                                                <div className="font-bold text-zinc-800">{data.name}</div>
                                                <div className="text-xs font-mono text-zinc-500">SKU: {data.sku}</div>
                                            </div>
                                            <div className="text-right flex items-center gap-4 mt-2">
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
                                {isSubmitting && <Loader2 size={16} className="animate-spin" />} Confirm Updates
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- INCOMING SHIPMENTS MODAL --- */}
            {isIncomingModalOpen && (
                <div className="fixed inset-0 bg-zinc-950/60 z-50 flex justify-center items-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="px-6 py-4 border-b flex justify-between items-center bg-stone-50 shrink-0">
                            <h2 className="text-lg font-bold uppercase tracking-wide text-zinc-800 flex items-center gap-2">
                                <Truck size={20} className="text-blue-500" /> Pending Deliveries Tracker
                            </h2>
                            <button onClick={() => setIsIncomingModalOpen(false)} className="text-zinc-400 hover:text-red-500"><X size={20} /></button>
                        </div>
                        
                        <div className="p-0 overflow-y-auto flex-1 bg-white">
                            {incomingStocks.length === 0 ? (
                                <div className="p-12 text-center text-zinc-500 flex flex-col items-center justify-center space-y-3">
                                    <CheckCircle size={40} className="text-green-500 opacity-50 mb-2"/>
                                    <p className="font-bold text-lg">No pending deliveries</p>
                                    <p className="text-sm">All ordered shipments have arrived!</p>
                                </div>
                            ) : (
                                <table className="w-full text-left border-collapse text-sm">
                                    <thead className="bg-zinc-900 text-xs uppercase text-zinc-300 font-bold sticky top-0 z-10">
                                        <tr>
                                            <th className="px-6 py-3 font-medium">Order Date</th>
                                            <th className="px-6 py-3 font-medium">Variant Details</th>
                                            <th className="px-6 py-3 font-medium text-right">Expected Qty</th>
                                            <th className="px-6 py-3 font-medium text-right">Est. Cost</th>
                                            <th className="px-6 py-3 font-medium text-center">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-stone-200">
                                        {incomingStocks.map(inc => {
                                            const pName = `${inc.variant?.product?.brandName} ${inc.variant?.product?.modelName}`;
                                            return (
                                            <tr key={inc.id} className="hover:bg-blue-50/50 transition-colors">
                                                <td className="px-6 py-4 text-zinc-500 font-medium">
                                                    {new Date(inc.createdAt).toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric'})}
                                                    <div className="text-[10px] text-zinc-400 mt-1">{new Date(inc.createdAt).toLocaleTimeString('en-US', {hour: 'numeric', minute: '2-digit'})}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="font-bold text-zinc-800">{pName}</div>
                                                    <div className="text-xs text-zinc-500 font-mono mt-0.5 tracking-wider">SKU: {inc.variant?.sku}</div>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <span className="font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded text-base">+{inc.quantity}</span>
                                                </td>
                                                <td className="px-6 py-4 text-right font-medium text-zinc-600">
                                                    {inc.expectedPrice ? `₱${Number(inc.expectedPrice).toLocaleString('en-US', {minimumFractionDigits: 2})}` : '—'}
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <button 
                                                        onClick={() => handleReceiveIncoming(inc.id)}
                                                        className="px-4 py-2 bg-zinc-950 text-white rounded-lg text-sm font-bold shadow-md hover:bg-zinc-800 hover:-translate-y-0.5 transition-all w-full flex items-center justify-center gap-2"
                                                    >
                                                        <CheckCircle size={15}/> Instock
                                                    </button>
                                                </td>
                                            </tr>
                                        )})}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Inventory;