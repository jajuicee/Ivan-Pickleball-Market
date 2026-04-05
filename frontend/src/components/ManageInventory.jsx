import React, { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import {
    ClipboardList, Search, X, PlusCircle, MinusCircle, Layers,
    CheckCircle, AlertCircle, Loader2, Tag, Building2, PackagePlus, Trash2
} from 'lucide-react';
import BatchAddModal from './BatchAddModal';

const BASE = `http://${window.location.hostname}:8080`;

const ManageInventory = ({ products = [], loading = false, refetchProducts }) => {
    const [suppliers, setSuppliers] = useState([]);
    const [tableFilter, setTableFilter] = useState('');
    const [displayedCount, setDisplayedCount] = useState(20);
    const tableContainerRef = useRef(null);

    // --- ADD STOCK MODAL STATE ---
    const [addStockModal, setAddStockModal] = useState(null); // { variantId, sku, name }
    const [addForm, setAddForm] = useState({ quantity: '', acquisitionPrice: '', supplierId: '', consigned: false });
    const [addStatus, setAddStatus] = useState({ type: '', message: '' });
    const [isAdding, setIsAdding] = useState(false);

    // --- DEDUCT STOCK MODAL STATE ---
    const [deductModal, setDeductModal] = useState(null);

    // --- BATCH ADD MODAL STATE ---
    const [showBatchAdd, setShowBatchAdd] = useState(false);

    // --- BATCH LIST MODAL STATE ---
    const [batchModal, setBatchModal] = useState(null); // { variantId, name }
    const [batches, setBatches] = useState([]);
    const [batchLoading, setBatchLoading] = useState(false);

    useEffect(() => {
        axios.get(`${BASE}/api/suppliers`).then(r => setSuppliers(r.data)).catch(() => {});
    }, []);

    // --- FLATTEN DATA ---
    const flattenedInventory = useMemo(() => {
        return products.flatMap(product =>
            (product.variants || []).map(variant => {
                const isPaddle = product.category === 'Paddles';
                return {
                    variantId: variant.id,
                    productId: product.id,
                    category: product.category,
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
                    dropdownName: isPaddle
                        ? `${product.brandName} ${product.modelName} ${variant.color || ''} ${variant.thicknessMm || 0}mm`
                        : `${product.brandName} ${product.modelName}`
                };
            })
        );
    }, [products]);

    // --- FILTER ---
    const filteredInventory = useMemo(() => {
        if (!tableFilter.trim()) return flattenedInventory;
        const q = tableFilter.toLowerCase();
        return flattenedInventory.filter(item =>
            (item.sku || '').toLowerCase().includes(q) ||
            (item.brand || '').toLowerCase().includes(q) ||
            (item.name || '').toLowerCase().includes(q) ||
            (item.dropdownName || '').toLowerCase().includes(q) ||
            (item.defaultSupplier?.name || '').toLowerCase().includes(q)
        );
    }, [tableFilter, flattenedInventory]);

    const visibleData = filteredInventory.slice(0, displayedCount);

    const handleScroll = () => {
        if (tableContainerRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = tableContainerRef.current;
            if (scrollTop + clientHeight >= scrollHeight - 50 && displayedCount < filteredInventory.length) {
                setDisplayedCount(prev => prev + 20);
            }
        }
    };

    // ============ ADD STOCK ============
    const openAddStock = (row) => {
        setAddForm({
            quantity: '',
            acquisitionPrice: '',
            supplierId: row.defaultSupplier?.id ? String(row.defaultSupplier.id) : '',
            consigned: row.consigned || false
        });
        setAddStatus({ type: '', message: '' });
        setAddStockModal({ variantId: row.variantId, sku: row.sku, name: row.dropdownName });
    };

    const handleConfirmAddStock = async () => {
        if (!addForm.quantity || Number(addForm.quantity) <= 0) return;
        setIsAdding(true);
        setAddStatus({ type: '', message: '' });
        try {
            let url = `${BASE}/api/products/variants/${addStockModal.variantId}/add-stock?quantity=${addForm.quantity}&consigned=${addForm.consigned}`;
            if (addForm.acquisitionPrice) url += `&acquisitionPrice=${addForm.acquisitionPrice}`;
            if (addForm.supplierId) url += `&supplierId=${addForm.supplierId}`;
            await axios.patch(url);
            setAddStatus({ type: 'success', message: 'Stock added successfully!' });
            refetchProducts?.();
            setTimeout(() => setAddStockModal(null), 1200);
        } catch (err) {
            setAddStatus({ type: 'error', message: err.response?.data?.error || 'Failed to add stock.' });
        } finally {
            setIsAdding(false);
        }
    };

    // ============ DEDUCT STOCK ============
    const handleDeductStock = async () => {
        if (!deductModal?.qty || Number(deductModal.qty) <= 0) return;
        try {
            await axios.patch(`${BASE}/api/products/variants/${deductModal.variantId}/deduct-stock?quantity=${deductModal.qty}`);
            setDeductModal(null);
            refetchProducts?.();
        } catch (err) {
            alert(err.response?.data?.error || 'Failed to deduct stock.');
        }
    };

    // ============ VIEW BATCHES ============
    const openBatchModal = async (row) => {
        setBatchModal({ variantId: row.variantId, name: row.dropdownName });
        setBatches([]);
        setBatchLoading(true);
        try {
            const res = await axios.get(`${BASE}/api/stock-batches/variant/${row.variantId}`);
            setBatches(res.data);
        } catch (err) {
            console.error('Failed to load batches', err);
        } finally {
            setBatchLoading(false);
        }
    };

    const fmtDate = (dt) => dt ? new Date(dt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
    const fmtPrice = (p) => p != null ? `₱${Number(p).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '—';

    const handleRevertBatch = async (batchId) => {
        if (!confirm('Are you sure you want to revert this stock batch? This will deduct the remaining quantities and delete the logged Expense.')) return;
        try {
            await axios.delete(`${BASE}/api/batch-actions/revert/${batchId}`);
            setBatches(batches.filter(b => b.batchId !== batchId));
            refetchProducts?.();
        } catch (err) {
            alert('Failed to revert batch.');
            console.error(err);
        }
    };

    return (
        <div className="flex flex-col h-full relative">
            {/* HEADER */}
            <div className="flex flex-wrap justify-between items-center gap-4 mb-4 shrink-0">
                <h2 className="text-2xl font-bold text-zinc-800 flex items-center gap-2">
                    <ClipboardList className="text-zinc-500" /> Manage Inventory
                    {!loading && (
                        <span className="ml-2 text-sm font-normal text-zinc-400 hidden sm:inline">
                            {tableFilter ? `${filteredInventory.length} of ${flattenedInventory.length}` : `${flattenedInventory.length} items`}
                        </span>
                    )}
                </h2>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <button
                        onClick={() => setShowBatchAdd(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-lg shadow-sm transition-colors"
                    >
                        <PackagePlus size={16} /> Batch Add
                    </button>
                    <div className="relative flex-1 sm:flex-none">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search size={15} className="text-zinc-400" />
                    </div>
                    <input
                        type="text"
                        value={tableFilter}
                        onChange={e => { setTableFilter(e.target.value); setDisplayedCount(20); }}
                        placeholder="Filter by SKU, brand, supplier…"
                        className="pl-9 pr-8 py-2 text-sm border border-stone-300 rounded-lg focus:ring-2 focus:ring-zinc-900 outline-none w-64"
                    />
                    {tableFilter && (
                        <button onClick={() => setTableFilter('')} className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-400 hover:text-zinc-700">
                            <X size={14} />
                        </button>
                    )}
                </div>
                </div>
            </div>

            {/* TABLE */}
            <div
                ref={tableContainerRef}
                onScroll={handleScroll}
                className="flex-1 overflow-auto bg-white border border-stone-200 rounded-xl shadow-sm relative"
            >
                <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-stone-100 shadow-sm z-10 text-xs uppercase tracking-wider text-zinc-500 font-bold border-b border-stone-200">
                        <tr>
                            <th className="px-4 py-4">SKU</th>
                            <th className="px-4 py-4">Brand / Model</th>
                            <th className="px-4 py-4">Variant</th>
                            <th className="px-4 py-4">Supplier</th>
                            <th className="px-4 py-4">Type</th>
                            <th className="px-4 py-4 text-right">Status / Tracking</th>
                            <th className="px-4 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 text-sm">
                        {loading ? (
                            Array.from({ length: 8 }).map((_, i) => (
                                <tr key={i} className="animate-pulse">
                                    {[0,1,2,3,4,5,6].map(j => (
                                        <td key={j} className="px-4 py-4">
                                            <div className="h-4 bg-stone-200 rounded w-3/4" />
                                        </td>
                                    ))}
                                </tr>
                            ))
                        ) : visibleData.length > 0 ? visibleData.map(row => (
                            <tr key={row.variantId} className="hover:bg-stone-50 transition-colors group">
                                <td className="px-4 py-4 font-mono font-medium text-zinc-600 text-xs">{row.sku}</td>
                                <td className="px-4 py-4">
                                    <div className="font-bold text-zinc-900">{row.brand}</div>
                                    <div className="text-xs text-zinc-400">{row.name}</div>
                                </td>
                                <td className="px-4 py-4 text-zinc-600">
                                    {row.color !== '-' && <span>{row.color} </span>}
                                    {row.variantDetails !== '-' && <span className="text-xs text-zinc-400">{row.variantDetails}</span>}
                                    {row.color === '-' && row.variantDetails === '-' && <span className="text-zinc-300">—</span>}
                                </td>
                                <td className="px-4 py-4">
                                    {row.defaultSupplier ? (
                                        <span className="flex items-center gap-1.5 text-indigo-700 bg-indigo-50 px-2 py-1 rounded-full text-xs font-bold w-fit">
                                            <Building2 size={11} /> {row.defaultSupplier.name}
                                        </span>
                                    ) : (
                                        <span className="text-zinc-300 text-xs">—</span>
                                    )}
                                </td>
                                <td className="px-4 py-4">
                                    {row.category === 'Paddles' ? (
                                        row.consigned ? (
                                            <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded-full text-xs font-bold">Consigned</span>
                                        ) : (
                                            <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-bold">Owned</span>
                                        )
                                    ) : (
                                        <span className="bg-stone-100 text-stone-400 px-2 py-1 rounded-full text-xs font-bold">{row.category}</span>
                                    )}
                                </td>
                                <td className="px-4 py-4 text-right">
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
                                <td className="px-4 py-4 text-right">
                                    <div className="flex items-center justify-end gap-1">
                                        {/* View Batches */}
                                        <button
                                            onClick={() => openBatchModal(row)}
                                            className="inline-flex items-center gap-1 px-2 py-1.5 text-xs font-bold text-zinc-500 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors"
                                            title="View Stock Batches"
                                        >
                                            <Layers size={14} /> Batches
                                        </button>
                                        {/* Add Stock */}
                                        <button
                                            onClick={() => openAddStock(row)}
                                            className="inline-flex items-center gap-1 px-2 py-1.5 text-xs font-bold text-zinc-500 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors"
                                            title="Add Stock"
                                        >
                                            <PlusCircle size={14} /> Add
                                        </button>
                                        {/* Deduct Stock */}
                                        <button
                                            onClick={() => setDeductModal({ variantId: row.variantId, name: row.dropdownName, currentQty: row.quantity, qty: '' })}
                                            className="inline-flex items-center gap-1 px-2 py-1.5 text-xs font-bold text-zinc-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                            title="Deduct Stock"
                                        >
                                            <MinusCircle size={14} /> Deduct
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan="7" className="px-6 py-16 text-center text-zinc-400">
                                    No items found.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* ===== ADD STOCK MODAL ===== */}
            {addStockModal && (
                <div className="fixed inset-0 bg-zinc-950/60 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="px-6 py-4 border-b border-stone-200 flex justify-between items-center bg-stone-50">
                            <div>
                                <h3 className="font-black text-zinc-900 flex items-center gap-2"><PlusCircle size={18} className="text-green-600" /> Add Stock</h3>
                                <p className="text-xs text-zinc-500 mt-0.5 truncate max-w-[280px]">{addStockModal.name}</p>
                            </div>
                            <button onClick={() => !isAdding && setAddStockModal(null)} className="text-zinc-400 hover:text-red-500"><X size={20} /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            {addStatus.message && (
                                <div className={`p-3 rounded-lg text-sm flex items-center gap-2 ${addStatus.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                                    {addStatus.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                                    <span className="font-medium">{addStatus.message}</span>
                                </div>
                            )}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-zinc-600 mb-1">Quantity *</label>
                                    <input
                                        type="number" min="1"
                                        value={addForm.quantity}
                                        onChange={e => setAddForm(f => ({ ...f, quantity: e.target.value }))}
                                        className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-zinc-900"
                                        placeholder="0"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-zinc-600 mb-1">Acquisition Price</label>
                                    <input
                                        type="number" step="0.01" min="0"
                                        value={addForm.acquisitionPrice}
                                        onChange={e => setAddForm(f => ({ ...f, acquisitionPrice: e.target.value }))}
                                        className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-zinc-900"
                                        placeholder="Optional"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-zinc-600 mb-1">Supplier</label>
                                <select
                                    value={addForm.supplierId}
                                    onChange={e => setAddForm(f => ({ ...f, supplierId: e.target.value }))}
                                    className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-zinc-900"
                                >
                                    <option value="">— No supplier —</option>
                                    {suppliers.map(s => (
                                        <option key={s.id} value={s.id}>{s.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-zinc-600 mb-2">Ownership Type</label>
                                <div className="flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setAddForm(f => ({ ...f, consigned: false }))}
                                        className={`flex-1 py-2 rounded-xl text-sm font-bold border-2 transition-all ${!addForm.consigned ? 'border-green-500 bg-green-50 text-green-700' : 'border-stone-200 text-zinc-400 hover:border-stone-300'}`}
                                    >
                                        ✅ Owned
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setAddForm(f => ({ ...f, consigned: true }))}
                                        className={`flex-1 py-2 rounded-xl text-sm font-bold border-2 transition-all ${addForm.consigned ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-stone-200 text-zinc-400 hover:border-stone-300'}`}
                                    >
                                        📦 Consigned
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div className="px-6 pb-6 flex gap-3">
                            <button onClick={() => setAddStockModal(null)} disabled={isAdding} className="flex-1 px-4 py-2 border border-stone-300 rounded-xl font-bold text-zinc-600 hover:bg-stone-50 disabled:opacity-50">Cancel</button>
                            <button
                                onClick={handleConfirmAddStock}
                                disabled={isAdding || !addForm.quantity || Number(addForm.quantity) <= 0}
                                className="flex-1 px-4 py-2 bg-zinc-900 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-zinc-700 disabled:opacity-40 transition-colors"
                            >
                                {isAdding && <Loader2 size={16} className="animate-spin" />}
                                Confirm Add
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ===== DEDUCT STOCK MODAL ===== */}
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
                                    value={deductModal.reason || 'Return to Supplier'}
                                    onChange={e => setDeductModal(d => ({ ...d, reason: e.target.value }))}
                                    className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-red-400"
                                >
                                    <option>Return to Supplier</option>
                                    <option>Damaged / Lost</option>
                                    <option>Manual Adjustment</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-zinc-600 mb-1">
                                    Quantity <span className="text-zinc-400 font-normal">(Current: {deductModal.currentQty})</span>
                                </label>
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
                            <button onClick={() => setDeductModal(null)} className="flex-1 px-4 py-2 text-sm font-bold border border-stone-300 rounded-xl hover:bg-stone-50">Cancel</button>
                            <button
                                onClick={handleDeductStock}
                                disabled={!deductModal.qty || Number(deductModal.qty) <= 0}
                                className="flex-1 px-4 py-2 text-sm font-bold bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-40"
                            >
                                Confirm
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ===== BATCH HISTORY MODAL ===== */}
            {batchModal && (
                <div className="fixed inset-0 bg-zinc-950/60 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]">
                        <div className="px-6 py-4 border-b border-stone-200 flex justify-between items-center bg-stone-50 shrink-0">
                            <div>
                                <h3 className="font-black text-zinc-900 flex items-center gap-2"><Layers size={18} className="text-indigo-600" /> Stock Batches</h3>
                                <p className="text-xs text-zinc-500 mt-0.5 truncate max-w-[380px]">{batchModal.name}</p>
                            </div>
                            <button onClick={() => setBatchModal(null)} className="text-zinc-400 hover:text-red-500"><X size={20} /></button>
                        </div>
                        <div className="overflow-y-auto flex-1">
                            {batchLoading ? (
                                <div className="flex items-center justify-center py-16"><Loader2 size={28} className="animate-spin text-zinc-400" /></div>
                            ) : batches.length === 0 ? (
                                <div className="py-16 text-center text-zinc-400">
                                    <Layers size={40} className="mx-auto mb-3 opacity-30" />
                                    <p className="font-bold">No stock batches yet</p>
                                    <p className="text-sm">Add stock to create the first batch.</p>
                                </div>
                            ) : (
                                <table className="w-full text-left text-sm border-collapse">
                                    <thead className="bg-stone-100 text-xs uppercase text-zinc-500 font-bold sticky top-0">
                                        <tr>
                                            <th className="px-5 py-3">Date Received</th>
                                            <th className="px-5 py-3 text-center">Qty</th>
                                            <th className="px-5 py-3 text-center">Remaining</th>
                                            <th className="px-5 py-3 text-right">Cost</th>
                                            <th className="px-5 py-3">Supplier</th>
                                            <th className="px-5 py-3">Type</th>
                                            <th className="px-5 py-3"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-stone-100">
                                        {batches.map((b, i) => (
                                            <tr key={b.id} className={`${b.remainingQuantity <= 0 ? 'opacity-40' : 'hover:bg-stone-50'} transition-colors`}>
                                                <td className="px-5 py-3 text-zinc-500">
                                                    {fmtDate(b.restockedAt)}
                                                    {i === 0 && b.remainingQuantity > 0 && (
                                                        <span className="ml-2 text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">NEXT SELL</span>
                                                    )}
                                                </td>
                                                <td className="px-5 py-3 text-center font-bold text-zinc-800">{b.quantity}</td>
                                                <td className="px-5 py-3 text-center">
                                                    <span className={`font-bold px-2 py-0.5 rounded text-xs ${b.remainingQuantity > 0 ? 'bg-green-100 text-green-700' : 'bg-stone-100 text-stone-400'}`}>
                                                        {b.remainingQuantity}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3 text-right font-medium text-zinc-700">{fmtPrice(b.acquisitionPrice)}</td>
                                                <td className="px-5 py-3">
                                                    {b.supplier ? (
                                                        <span className="flex items-center gap-1 text-indigo-700 text-xs font-bold">
                                                            <Building2 size={11} /> {b.supplier.name}
                                                        </span>
                                                    ) : <span className="text-zinc-300 text-xs">—</span>}
                                                </td>
                                                <td className="px-5 py-3">
                                                    {b.consigned
                                                        ? <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full text-xs font-bold">Consigned</span>
                                                        : <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs font-bold">Owned</span>
                                                    }
                                                </td>
                                                <td className="px-5 py-3 text-right">
                                                    {b.batchId && (
                                                        <button 
                                                            onClick={() => handleRevertBatch(b.batchId)}
                                                            className="text-zinc-400 hover:text-red-500 transition-colors p-1"
                                                            title="Revert Batch Addition"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                        <div className="px-6 py-3 border-t border-stone-200 bg-stone-50 shrink-0 flex justify-between items-center text-xs text-zinc-500">
                            <span>{batches.length} batch{batches.length !== 1 ? 'es' : ''} · FIFO order (oldest first = sold first)</span>
                            <button onClick={() => setBatchModal(null)} className="px-4 py-1.5 font-bold text-zinc-600 hover:bg-stone-200 rounded-lg">Close</button>
                        </div>
                    </div>
                </div>
            )}
            {/* ===== BATCH ADD MODAL (NEW COMPONENT) ===== */}
            {showBatchAdd && (
                <BatchAddModal 
                    products={products} 
                    suppliers={suppliers} 
                    onClose={() => setShowBatchAdd(false)} 
                    onSuccess={() => { setShowBatchAdd(false); refetchProducts?.(); }} 
                />
            )}
        </div>
    );
};

export default ManageInventory;
