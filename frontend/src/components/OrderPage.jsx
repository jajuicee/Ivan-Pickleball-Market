import React, { useState, useMemo } from 'react';
import axios from 'axios';
import {
    ShoppingCart, Search, User, CreditCard, Tag, X,
    AlertCircle, CheckCircle, Loader2, ClipboardList, ArrowRight, Trash2
} from 'lucide-react';

const EMPTY_FORM = {
    customerName: '',
    paymentMethod: 'GCash',
    orderStatus: 'FULL',
    downpayment: ''
};

const fmt = (val) =>
    val != null && val !== '' ? `₱${Number(val).toLocaleString('en-PH', { minimumFractionDigits: 2 })}` : '—';

// Props: products (array), loading (bool), refetchProducts (fn)
const OrderPage = ({ products = [], loading = false, refetchProducts }) => {
    const [searchQuery, setSearchQuery]   = useState('');
    const [cart, setCart]                 = useState([]); // Array of { variant, qty, finalPrice }
    const [formData, setFormData]         = useState(EMPTY_FORM);
    const [showSummary, setShowSummary]   = useState(false);
    const [submitting, setSubmitting]     = useState(false);
    const [status, setStatus]             = useState({ type: '', message: '' });

    // ── Product search ────────────────────────────────────────────────────────
    const inventoryList = useMemo(() =>
        products.flatMap(p => p.variants.map(v => ({
            ...v,
            displayName: `${p.brandName} ${p.modelName}${v.color && v.color !== 'N/A' ? ` (${v.color})` : ''}`
        }))),
    [products]);

    const filteredResults = useMemo(() => {
        if (!searchQuery) return [];
        return inventoryList
            .filter(i =>
                i.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                i.sku.toLowerCase().includes(searchQuery.toLowerCase())
            )
            .filter(i => i.stockQuantity > 0) // Only allow searching for in-stock items
            .slice(0, 5);
    }, [searchQuery, inventoryList]);

    const handleAddToCart = (item) => {
        const existing = cart.find(c => c.variant.id === item.id);
        if (existing) {
            setCart(cart.map(c => c.variant.id === item.id ? { ...c, qty: c.qty + 1 } : c));
        } else {
            setCart([...cart, { variant: item, qty: 1, finalPrice: item.sellingPrice }]);
        }
        setSearchQuery('');
        setStatus({ type: '', message: '' });
    };

    const updateCartItem = (variantId, field, value) => {
        setCart(cart.map(c => c.variant.id === variantId ? { ...c, [field]: value } : c));
    };

    const removeCartItem = (variantId) => {
        setCart(cart.filter(c => c.variant.id !== variantId));
    };

    // ── Totals ────────────────────────────────────────────────────────────────
    const cartTotal = cart.reduce((sum, item) => sum + ((parseFloat(item.finalPrice) || 0) * (parseInt(item.qty) || 0)), 0);
    const isPartial = formData.orderStatus === 'PARTIAL';
    const remaining = isPartial && formData.downpayment
        ? cartTotal - Number(formData.downpayment)
        : null;

    // ── Reset ─────────────────────────────────────────────────────────────────
    const resetForm = () => {
        setCart([]);
        setFormData(EMPTY_FORM);
        setShowSummary(false);
        setSearchQuery('');
        setStatus({ type: '', message: '' });
    };

    // ── Confirm ───────────────────────────────────────────────────────────────
    const handleConfirm = () => {
        setSubmitting(true);
        // Generate a shared ID for this batch!
        const generatedTransactionId = 'TRX-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substring(2, 6).toUpperCase();

        const payloads = [];
        cart.forEach(item => {
            const qty = parseInt(item.qty) || 1;
            const pricePerItem = parseFloat(item.finalPrice) || 0;
            // Expand quantity into individual transactions since 1 transaction = 1 item in DB
            for(let i = 0; i < qty; i++) {
                payloads.push({
                    transactionId: generatedTransactionId,
                    variant: { id: item.variant.id },
                    customerName: formData.customerName,
                    paymentMethod: formData.paymentMethod,
                    status: formData.orderStatus,
                    downpayment: 0, // Default 0, overridden on first item below
                    finalPrice: pricePerItem,
                });
            }
        });

        // Apply total downpayment to the FIRST payload so math works out
        if (isPartial && payloads.length > 0) {
            payloads[0].downpayment = parseFloat(formData.downpayment) || 0;
        }

        Promise.all(payloads.map(p => axios.post('http://localhost:8080/api/transactions', p)))
            .then(() => {
                setShowSummary(false);
                setStatus({ type: 'success', message: `Order ${generatedTransactionId} placed successfully!` });
                resetForm();
                if (refetchProducts) refetchProducts();
            })
            .catch(err => {
                const msg = err.response?.data?.error || 'Error processing some items. Check inventory.';
                setShowSummary(false);
                setStatus({ type: 'error', message: msg });
            })
            .finally(() => setSubmitting(false));
    };

    return (
        <div className="w-full h-full flex flex-col space-y-6 p-4 md:p-0">
            <div className="flex-1 bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden flex flex-col lg:flex-row min-h-0">

                {/* LEFT COLUMN: CART BUILDING */}
                <div className="flex-1 p-8 border-b lg:border-b-0 lg:border-r border-stone-200">
                    <div className="flex items-center gap-3 mb-6">
                        <ShoppingCart className="text-zinc-600" />
                        <h2 className="text-xl font-bold text-zinc-800 uppercase tracking-wide">Multi-Item Checkout</h2>
                    </div>

                    {status.message && (
                        <div className={`p-4 mb-6 rounded-lg flex items-center gap-3 ${status.type === 'success' ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-800'}`}>
                            {status.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                            <span className="font-medium inline-block flex-1">{status.message}</span>
                        </div>
                    )}

                    {/* PRODUCT SEARCH */}
                    <div className="relative mb-6">
                        <label className="block text-sm font-bold text-zinc-700 mb-2 flex items-center gap-2">
                            <Tag size={16} /> Search & Add Product
                        </label>
                        {loading ? (
                            <div className="flex items-center gap-2 w-full px-4 py-3 border rounded-lg bg-stone-50 text-zinc-400">
                                <Loader2 size={14} className="animate-spin" />
                                <span className="text-sm">Loading products...</span>
                            </div>
                        ) : (
                            <div className="relative">
                                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                                <input
                                    type="text" value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 border border-stone-300 rounded-lg focus:ring-2 focus:ring-zinc-950 outline-none"
                                    placeholder="Type SKU or Brand name to add to cart..."
                                />
                            </div>
                        )}
                        {searchQuery && filteredResults.length > 0 && (
                            <div className="absolute w-full mt-1 bg-white border border-stone-200 rounded-lg shadow-xl z-50 overflow-hidden">
                                {filteredResults.map(item => (
                                    <div key={item.sku} onClick={() => handleAddToCart(item)}
                                        className="px-4 py-3 hover:bg-stone-50 cursor-pointer text-sm border-b border-stone-100 last:border-0">
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <span className="font-bold text-zinc-900">{item.displayName}</span>
                                                <span className="block text-xs font-mono text-zinc-400 mt-0.5">SKU: {item.sku}</span>
                                            </div>
                                            <span className="text-xs font-bold px-2 py-1 rounded bg-green-100 text-green-700">
                                                {item.stockQuantity} in stock
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        {searchQuery && filteredResults.length === 0 && (
                            <div className="absolute w-full mt-1 bg-white border border-stone-200 rounded-lg shadow-xl z-50 p-4 text-center text-zinc-500 text-sm">
                                No in-stock items found.
                            </div>
                        )}
                    </div>

                    {/* THE CART LIST */}
                    <div className="space-y-3">
                        <label className="block text-sm font-bold text-zinc-700 mb-2">Cart Items ({cart.length})</label>
                        
                        {cart.length === 0 ? (
                            <div className="p-8 border-2 border-dashed border-stone-200 rounded-xl text-center text-zinc-400">
                                <ShoppingCart size={32} className="mx-auto mb-2 opacity-30" />
                                <p className="text-sm font-medium">Cart is empty.</p>
                                <p className="text-xs">Search for a product above to add.</p>
                            </div>
                        ) : (
                            cart.map((item, idx) => (
                                <div key={idx} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 border border-stone-200 rounded-lg bg-stone-50 gap-4">
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-zinc-900 truncate">{item.variant.displayName}</p>
                                        <p className="text-xs font-mono text-zinc-500">
                                            SKU: {item.variant.sku} <span className="text-amber-600 font-bold ml-2">Stock: {item.variant.stockQuantity}</span>
                                        </p>
                                    </div>
                                    
                                    <div className="flex items-center gap-3 w-full sm:w-auto">
                                        <div className="flex-1 sm:w-20">
                                            <label className="block text-[10px] uppercase font-bold text-zinc-500 mb-1">Qty</label>
                                            <input type="number" min="1" max={item.variant.stockQuantity} required value={item.qty}
                                                onChange={e => updateCartItem(item.variant.id, 'qty', e.target.value)}
                                                className="w-full px-2 py-1.5 text-sm border rounded focus:ring-2 focus:ring-zinc-950 font-bold" />
                                        </div>
                                        <div className="flex-1 sm:w-28">
                                            <label className="block text-[10px] uppercase font-bold text-zinc-500 mb-1">Price (ea) ₱</label>
                                            <input type="number" step="0.01" required value={item.finalPrice}
                                                onChange={e => updateCartItem(item.variant.id, 'finalPrice', e.target.value)}
                                                className="w-full px-2 py-1.5 text-sm border rounded focus:ring-2 focus:ring-zinc-950 font-bold text-emerald-700" />
                                        </div>
                                        <button type="button" onClick={() => removeCartItem(item.variant.id)}
                                            className="text-zinc-400 hover:text-red-500 p-2 mt-4 transition-colors">
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* RIGHT COLUMN: CUSTOMER & PAYMENT DETAILS */}
                <div className="w-full lg:w-[400px] bg-stone-50 p-8 flex flex-col">
                    <form onSubmit={(e) => { e.preventDefault(); setShowSummary(true); }} className="space-y-6 flex-1 flex flex-col">
                        
                        <div>
                            <label className="block text-sm font-bold text-zinc-700 mb-2 flex items-center gap-2">
                                <User size={16} /> Customer Name
                            </label>
                            <input type="text" required value={formData.customerName}
                                onChange={e => setFormData({ ...formData, customerName: e.target.value })}
                                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-zinc-950 outline-none"
                                placeholder="e.g. Juan dela Cruz" />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-zinc-700 mb-2 flex items-center gap-2">
                                <CreditCard size={16} /> Payment Method
                            </label>
                            <select value={formData.paymentMethod}
                                onChange={e => setFormData({ ...formData, paymentMethod: e.target.value })}
                                className="w-full px-4 py-2 border rounded-lg bg-white outline-none focus:ring-2 focus:ring-zinc-950">
                                <option value="GCash">GCash</option>
                                <option value="Bank Transfer">Bank Transfer</option>
                                <option value="GoTyme">GoTyme</option>
                                <option value="Cash">Cash</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-zinc-700 mb-2">Payment Status</label>
                            <select value={formData.orderStatus}
                                onChange={e => setFormData({ ...formData, orderStatus: e.target.value })}
                                className="w-full px-4 py-2 border rounded-lg bg-white outline-none focus:ring-2 focus:ring-zinc-950">
                                <option value="FULL">Full Payment</option>
                                <option value="PARTIAL">Partial Payment</option>
                            </select>
                        </div>

                        {isPartial && (
                            <div className="p-4 bg-white border border-amber-300 rounded-lg shadow-sm">
                                <label className="block text-sm font-bold text-amber-800 mb-2">Downpayment (₱)</label>
                                <input type="number" step="0.01" required value={formData.downpayment}
                                    onChange={e => setFormData({ ...formData, downpayment: e.target.value })}
                                    className="w-full px-4 py-2 border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-400 outline-none font-bold"
                                    placeholder="0.00" />
                            </div>
                        )}

                        <div className="mt-auto pt-6 border-t border-stone-200">
                            <div className="flex justify-between items-end mb-6">
                                <span className="font-bold text-zinc-500 uppercase tracking-wide text-sm">Order Total</span>
                                <span className="text-3xl font-black text-zinc-900">{fmt(cartTotal)}</span>
                            </div>
                            
                            <button type="submit" disabled={cart.length === 0 || !formData.customerName}
                                className="w-full bg-zinc-950 text-white px-8 py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-zinc-800 disabled:bg-stone-300 disabled:cursor-not-allowed transition-all text-lg shadow-md">
                                <ClipboardList size={20} /> Review Order
                            </button>
                        </div>
                    </form>
                </div>

            </div>

            {/* ── ORDER SUMMARY MODAL ─────────────────────────────────────────────── */}
            {showSummary && (
                <div className="fixed inset-0 bg-zinc-950/70 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">

                        {/* Modal header */}
                        <div className="bg-zinc-950 px-6 py-5 flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-3 text-white">
                                <ClipboardList size={20} />
                                <h3 className="text-lg font-bold uppercase tracking-wide">Order Summary</h3>
                            </div>
                            <button onClick={() => setShowSummary(false)} className="text-zinc-400 hover:text-white">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Summary scrolling content */}
                        <div className="p-6 overflow-y-auto">
                            <div className="mb-6 space-y-2 text-sm border-b pb-4">
                                <div className="flex justify-between">
                                    <span className="text-zinc-500 font-medium">Customer</span>
                                    <span className="font-bold text-zinc-900">{formData.customerName}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-zinc-500 font-medium">Payment Method</span>
                                    <span className="font-bold text-zinc-900">{formData.paymentMethod}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-zinc-500 font-medium">Payment Status</span>
                                    <span className="font-bold text-zinc-900">{formData.orderStatus === 'FULL' ? 'Full Payment' : 'Partial Payment'}</span>
                                </div>
                            </div>

                            <p className="font-bold text-zinc-800 mb-3 text-sm">Items in Cart</p>
                            <div className="space-y-3 mb-6">
                                {cart.map((item, idx) => (
                                    <div key={idx} className="flex justify-between text-sm py-2 px-3 bg-stone-50 rounded border">
                                        <div className="flex-[2] truncate pr-2 font-medium text-zinc-800">{item.qty}x {item.variant.brandName} {item.variant.modelName}</div>
                                        <div className="font-mono text-zinc-500 text-xs mt-0.5 w-24 truncate">{item.variant.sku}</div>
                                        <div className="font-bold text-zinc-900 text-right w-24">{fmt(item.finalPrice * item.qty)}</div>
                                    </div>
                                ))}
                            </div>

                            <div className="space-y-2 border-t pt-4 text-base">
                                <div className="flex justify-between font-bold">
                                    <span className="text-zinc-800 text-lg">Order Total</span>
                                    <span className="text-green-700 text-xl">{fmt(cartTotal)}</span>
                                </div>
                                {isPartial && (
                                    <>
                                        <div className="flex justify-between text-zinc-600">
                                            <span>Downpayment</span>
                                            <span>-{fmt(formData.downpayment)}</span>
                                        </div>
                                        <div className="flex justify-between font-bold text-amber-600 border-t border-dashed border-stone-300 pt-2 mt-2">
                                            <span>Remaining Balance</span>
                                            <span>{fmt(remaining)}</span>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Confirm / Cancel */}
                        <div className="p-5 bg-stone-50 border-t flex gap-3 shrink-0">
                            <button onClick={() => setShowSummary(false)} disabled={submitting}
                                className="flex-1 px-4 py-3 rounded-lg border border-stone-300 font-bold text-zinc-600 hover:bg-stone-100 disabled:opacity-50 transition-all">
                                Edit Details
                            </button>
                            <button onClick={handleConfirm} disabled={submitting}
                                className="flex-[2] px-4 py-3 rounded-lg bg-green-600 hover:bg-green-700 text-white font-bold flex items-center justify-center gap-2 disabled:opacity-50 transition-all">
                                {submitting
                                    ? <><Loader2 size={16} className="animate-spin" /> Processing…</>
                                    : <><CheckCircle size={16} /> Confirm Checkout</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OrderPage;