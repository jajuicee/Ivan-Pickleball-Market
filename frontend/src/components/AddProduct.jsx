import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Target, Box, X, Plus, Save, AlertCircle, CheckCircle, Building2, Footprints, Trash2 } from 'lucide-react';

const BASE = '';

// ── Common field style ──────────────────────────────────────────────────────
const inp = 'w-full px-3 py-2 border border-stone-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-zinc-900';
const label = 'block text-xs font-bold text-zinc-500 uppercase tracking-wide mb-1';

const AddProduct = ({ onProductAdded }) => {
    // Modal State
    const [activeModal, setActiveModal] = useState(null); // 'paddle' | 'misc' | 'shoes' | null
    const [status, setStatus] = useState({ type: '', message: '' });

    // Suppliers (fetched when paddle modal opens)
    const [suppliers, setSuppliers] = useState([]);

    // ── PADDLE STATE ──────────────────────────────────────────────────────────
    const [paddleBase, setPaddleBase] = useState({ brandName: '', modelName: '' });
    const emptyPaddleVariant = {
        sku: '', color: '', thicknessMm: '', shape: '',
        acquisitionPrice: '', sellingPrice: '',
        supplierId: '', consigned: false
    };
    const [paddleVariants, setPaddleVariants] = useState([{ ...emptyPaddleVariant }]);

    // ── MISC STATE ────────────────────────────────────────────────────────────
    const [miscData, setMiscData] = useState({ brandName: '', name: '', category: 'Accessories', cost: '', price: '', sku: '' });

    // ── SHOES STATE ───────────────────────────────────────────────────────────
    const [shoeBase, setShoeBase] = useState({ brandName: '', modelName: '' });
    const emptySizeVariant = { sku: '', color: '', size: '', acquisitionPrice: '', sellingPrice: '' };
    const [shoeVariants, setShoeVariants] = useState([{ ...emptySizeVariant }]);

    // Fetch suppliers when paddle modal opens
    useEffect(() => {
        if (activeModal === 'paddle') {
            axios.get(`${BASE}/api/suppliers`).then(r => setSuppliers(r.data)).catch(() => setSuppliers([]));
        }
    }, [activeModal]);

    const closeModal = () => {
        setActiveModal(null);
        setStatus({ type: '', message: '' });
    };

    // ── PADDLE HANDLERS ───────────────────────────────────────────────────────
    const handleVariantChange = (index, field, value) => {
        const updated = [...paddleVariants];
        updated[index][field] = value;
        setPaddleVariants(updated);
    };

    const submitPaddle = (e) => {
        e.preventDefault();
        setStatus({ type: '', message: '' });

        const newProduct = {
            brandName: paddleBase.brandName.trim(),
            modelName: paddleBase.modelName.trim(),
            category: 'Paddles',
            variants: paddleVariants.map(v => ({
                sku: v.sku.trim(),
                color: v.color.trim(),
                thicknessMm: parseInt(v.thicknessMm) || 0,
                shape: v.shape,
                acquisitionPrice: parseFloat(v.acquisitionPrice) || 0,
                sellingPrice: parseFloat(v.sellingPrice) || 0,
                stockQuantity: 0,
                consigned: v.consigned,
                defaultSupplier: v.supplierId ? { id: parseInt(v.supplierId) } : null
            }))
        };

        axios.post(`${BASE}/api/products`, newProduct)
            .then(() => {
                setStatus({ type: 'success', message: 'Paddle and variants saved successfully!' });
                setPaddleBase({ brandName: '', modelName: '' });
                setPaddleVariants([{ ...emptyPaddleVariant }]);
                if (onProductAdded) onProductAdded();
                setTimeout(() => closeModal(), 1500);
            })
            .catch(err => {
                const backendMsg = err.response?.data?.error;
                setStatus({ type: 'error', message: backendMsg || 'Failed to save paddle. Check console.' });
            });
    };

    // ── MISC HANDLERS ─────────────────────────────────────────────────────────
    const submitMisc = (e) => {
        e.preventDefault();
        setStatus({ type: '', message: '' });

        const newMiscProduct = {
            brandName: miscData.brandName.trim(),
            modelName: miscData.name.trim(),
            category: miscData.category,
            variants: [{
                sku: (miscData.sku || '').trim() || `MISC-${Math.floor(Math.random() * 100000)}`,
                color: 'N/A',
                thicknessMm: 0,
                shape: 'N/A',
                acquisitionPrice: parseFloat(miscData.cost) || 0,
                sellingPrice: parseFloat(miscData.price) || 0,
                stockQuantity: 0
            }]
        };

        axios.post(`${BASE}/api/products`, newMiscProduct)
            .then(() => {
                setStatus({ type: 'success', message: 'Item added successfully!' });
                setMiscData({ brandName: '', name: '', category: 'Accessories', cost: '', price: '', sku: '' });
                if (onProductAdded) onProductAdded();
                setTimeout(() => closeModal(), 1500);
            })
            .catch(err => {
                const backendMsg = err.response?.data?.error;
                setStatus({ type: 'error', message: backendMsg || 'Failed to save item.' });
            });
    };

    // ── SHOES HANDLERS ────────────────────────────────────────────────────────
    const handleShoeVariantChange = (index, field, value) => {
        const updated = [...shoeVariants];
        updated[index][field] = value;
        setShoeVariants(updated);
    };

    const addShoeSize = () => setShoeVariants([...shoeVariants, { ...emptySizeVariant }]);

    const removeShoeSize = (index) => {
        if (shoeVariants.length === 1) return;
        setShoeVariants(shoeVariants.filter((_, i) => i !== index));
    };

    const submitShoes = (e) => {
        e.preventDefault();
        setStatus({ type: '', message: '' });

        // Validate at least one size has a size value
        const hasEmptySize = shoeVariants.some(v => !v.size.trim());
        if (hasEmptySize) {
            setStatus({ type: 'error', message: 'Every size row must have a Size filled in.' });
            return;
        }

        const newProduct = {
            brandName: shoeBase.brandName.trim(),
            modelName: shoeBase.modelName.trim(),
            category: 'Shoes',
            variants: shoeVariants.map(v => ({
                sku: v.sku.trim() || `SHOE-${shoeBase.brandName.substring(0, 3).toUpperCase()}-${v.size}-${Math.floor(Math.random() * 1000)}`,
                color: v.color.trim() || 'N/A',
                thicknessMm: 0,
                shape: v.size.trim(), // reuse shape field to store size (e.g. "39", "US 8.5")
                acquisitionPrice: parseFloat(v.acquisitionPrice) || 0,
                sellingPrice: parseFloat(v.sellingPrice) || 0,
                stockQuantity: 0,
                consigned: false,
                defaultSupplier: null
            }))
        };

        axios.post(`${BASE}/api/products`, newProduct)
            .then((res) => {
                const msg = res.data?.merged
                    ? `✓ Merged! ${res.data.message}`
                    : `Shoes saved! ${shoeVariants.length} size variant${shoeVariants.length > 1 ? 's' : ''} created.`;
                setStatus({ type: 'success', message: msg });
                setShoeBase({ brandName: '', modelName: '' });
                setShoeVariants([{ ...emptySizeVariant }]);
                if (onProductAdded) onProductAdded();
                setTimeout(() => closeModal(), 1800);
            })
            .catch(err => {
                const backendMsg = err.response?.data?.error;
                setStatus({ type: 'error', message: backendMsg || 'Failed to save shoes.' });
            });
    };

    // ── RENDER ────────────────────────────────────────────────────────────────
    return (
        <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl font-bold text-zinc-800 mb-8">What would you like to add?</h2>

            {/* ── BIG BUTTONS ── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Paddle */}
                <button
                    onClick={() => { setActiveModal('paddle'); setStatus({}); }}
                    className="bg-white border-2 border-stone-200 hover:border-zinc-900 rounded-2xl p-8 flex flex-col items-center justify-center gap-4 transition-all shadow-sm hover:shadow-md group"
                >
                    <div className="bg-stone-100 p-5 rounded-full group-hover:bg-zinc-900 group-hover:text-white transition-colors">
                        <Target size={42} className="text-zinc-700 group-hover:text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-zinc-900">Add New Paddle</h3>
                    <p className="text-zinc-500 text-center text-sm">Register a new paddle model with color and thickness variants.</p>
                </button>

                {/* Shoes */}
                <button
                    onClick={() => { setActiveModal('shoes'); setStatus({}); }}
                    className="bg-white border-2 border-stone-200 hover:border-blue-600 rounded-2xl p-8 flex flex-col items-center justify-center gap-4 transition-all shadow-sm hover:shadow-md group"
                >
                    <div className="bg-blue-50 p-5 rounded-full group-hover:bg-blue-600 transition-colors">
                        <Footprints size={42} className="text-blue-500 group-hover:text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-zinc-900">Add Shoes</h3>
                    <p className="text-zinc-500 text-center text-sm">Register a shoe model with multiple size variants.</p>
                </button>

                {/* Misc */}
                <button
                    onClick={() => { setActiveModal('misc'); setStatus({}); }}
                    className="bg-white border-2 border-stone-200 hover:border-zinc-900 rounded-2xl p-8 flex flex-col items-center justify-center gap-4 transition-all shadow-sm hover:shadow-md group"
                >
                    <div className="bg-stone-100 p-5 rounded-full group-hover:bg-zinc-900 group-hover:text-white transition-colors">
                        <Box size={42} className="text-zinc-700 group-hover:text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-zinc-900">Miscellaneous</h3>
                    <p className="text-zinc-500 text-center text-sm">Quickly add balls, bags, grips, and other retail items.</p>
                </button>
            </div>

            {/* ── PADDLE MODAL ── */}
            {activeModal === 'paddle' && (
                <div className="fixed inset-0 bg-zinc-950/60 z-50 flex justify-center items-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
                        <div className="px-8 py-5 border-b border-stone-200 flex justify-between items-center bg-stone-50">
                            <h2 className="text-xl font-bold uppercase tracking-wide">Register Paddle</h2>
                            <button onClick={closeModal} className="text-zinc-400 hover:text-red-500"><X size={24} /></button>
                        </div>

                        <div className="p-8 overflow-y-auto flex-1">
                            {status.message && (
                                <div className={`p-4 mb-6 rounded-lg flex items-center gap-2 ${status.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                                    {status.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                                    <span className="font-medium">{status.message}</span>
                                </div>
                            )}

                            <form id="paddle-form" onSubmit={submitPaddle} className="space-y-8">
                                <div className="grid grid-cols-2 gap-6">
                                    <div>
                                        <label className={label}>Brand</label>
                                        <input type="text" required value={paddleBase.brandName} onChange={e => setPaddleBase({ ...paddleBase, brandName: e.target.value })} className={inp} placeholder="e.g., JOOLA" />
                                    </div>
                                    <div>
                                        <label className={label}>Model Name</label>
                                        <input type="text" required value={paddleBase.modelName} onChange={e => setPaddleBase({ ...paddleBase, modelName: e.target.value })} className={inp} placeholder="e.g., Perseus 3" />
                                    </div>
                                </div>

                                <div>
                                    <div className="flex justify-between items-end mb-4 border-b pb-2">
                                        <h3 className="text-lg font-bold text-zinc-800">Variants</h3>
                                        <button type="button" onClick={() => setPaddleVariants([...paddleVariants, { ...emptyPaddleVariant }])} className="text-sm font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 bg-blue-50 px-3 py-1 rounded">
                                            <Plus size={16} /> Add Variant
                                        </button>
                                    </div>

                                    <div className="space-y-6">
                                        {paddleVariants.map((variant, index) => (
                                            <div key={index} className="bg-stone-50 p-5 rounded-lg border border-stone-200 relative">
                                                <span className="absolute -top-3 left-4 bg-zinc-800 text-white text-xs font-bold px-2 py-1 rounded">Variant {index + 1}</span>
                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
                                                    <div>
                                                        <label className={label}>SKU</label>
                                                        <input type="text" required value={variant.sku} onChange={e => handleVariantChange(index, 'sku', e.target.value)} className={inp} placeholder="JL-PER-16" />
                                                    </div>
                                                    <div>
                                                        <label className={label}>Color</label>
                                                        <input type="text" required value={variant.color} onChange={e => handleVariantChange(index, 'color', e.target.value)} className={inp} />
                                                    </div>
                                                    <div>
                                                        <label className={label}>Thick (mm)</label>
                                                        <input type="number" required value={variant.thicknessMm} onChange={e => handleVariantChange(index, 'thicknessMm', e.target.value)} className={inp} />
                                                    </div>
                                                    <div>
                                                        <label className={label}>Shape</label>
                                                        <select value={variant.shape} required onChange={e => handleVariantChange(index, 'shape', e.target.value)} className={inp + ' bg-white'}>
                                                            <option value="">Select...</option>
                                                            <option value="Standard">Standard</option>
                                                            <option value="Elongated">Elongated</option>
                                                            <option value="Hybrid">Hybrid</option>
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className={label}>Cost (₱)</label>
                                                        <input type="number" step="0.01" required value={variant.acquisitionPrice} onChange={e => handleVariantChange(index, 'acquisitionPrice', e.target.value)} className={inp} />
                                                    </div>
                                                    <div>
                                                        <label className={label}>Price (₱)</label>
                                                        <input type="number" step="0.01" required value={variant.sellingPrice} onChange={e => handleVariantChange(index, 'sellingPrice', e.target.value)} className={inp} />
                                                    </div>
                                                    <div>
                                                        <label className={label + ' flex items-center gap-1'}><Building2 size={10} /> Supplier</label>
                                                        <select value={variant.supplierId} onChange={e => handleVariantChange(index, 'supplierId', e.target.value)} className={inp + ' bg-white'}>
                                                            <option value="">— None —</option>
                                                            {suppliers.map(s => (<option key={s.id} value={s.id}>{s.name}</option>))}
                                                        </select>
                                                    </div>
                                                    <div className="flex flex-col justify-end">
                                                        <label className={label}>Ownership</label>
                                                        <div className="flex gap-1 mt-1">
                                                            <button type="button" onClick={() => handleVariantChange(index, 'consigned', false)} className={`flex-1 py-1.5 text-xs font-bold rounded border-2 transition-all ${!variant.consigned ? 'border-green-500 bg-green-50 text-green-700' : 'border-stone-200 text-zinc-400'}`}>Owned</button>
                                                            <button type="button" onClick={() => handleVariantChange(index, 'consigned', true)} className={`flex-1 py-1.5 text-xs font-bold rounded border-2 transition-all ${variant.consigned ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-stone-200 text-zinc-400'}`}>Consigned</button>
                                                        </div>
                                                    </div>
                                                    {paddleVariants.length > 1 && (
                                                        <div className="flex items-end">
                                                            <button type="button" onClick={() => setPaddleVariants(paddleVariants.filter((_, i) => i !== index))} className="text-red-500 text-sm font-bold hover:underline mb-2">Remove</button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </form>
                        </div>

                        <div className="p-5 border-t border-stone-200 bg-stone-50 flex justify-end gap-3">
                            <button onClick={closeModal} className="px-6 py-2 rounded-lg font-bold text-zinc-600 hover:bg-stone-200">Cancel</button>
                            <button form="paddle-form" type="submit" className="px-6 py-2 bg-zinc-950 text-white rounded-lg font-bold flex items-center gap-2 hover:bg-zinc-800"><Save size={18} /> Save Paddle</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── SHOES MODAL ── */}
            {activeModal === 'shoes' && (
                <div className="fixed inset-0 bg-zinc-950/60 z-50 flex justify-center items-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
                        {/* Header */}
                        <div className="px-8 py-5 border-b border-stone-200 flex justify-between items-center bg-blue-50">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-100 rounded-xl">
                                    <Footprints size={22} className="text-blue-600" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold uppercase tracking-wide text-zinc-900">Add Shoes</h2>
                                    <p className="text-xs text-zinc-500">Each row below = one size variant of this shoe model</p>
                                </div>
                            </div>
                            <button onClick={closeModal} className="text-zinc-400 hover:text-red-500"><X size={24} /></button>
                        </div>

                        <div className="p-8 overflow-y-auto flex-1">
                            {status.message && (
                                <div className={`p-4 mb-6 rounded-lg flex items-center gap-2 ${status.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                                    {status.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                                    <span className="font-medium">{status.message}</span>
                                </div>
                            )}

                            <form id="shoes-form" onSubmit={submitShoes} className="space-y-8">
                                {/* Base info */}
                                <div className="grid grid-cols-2 gap-6">
                                    <div>
                                        <label className={label}>Brand Name *</label>
                                        <input type="text" required value={shoeBase.brandName} onChange={e => setShoeBase({ ...shoeBase, brandName: e.target.value })} className={inp} placeholder="e.g., Nike" />
                                    </div>
                                    <div>
                                        <label className={label}>Model Name *</label>
                                        <input type="text" required value={shoeBase.modelName} onChange={e => setShoeBase({ ...shoeBase, modelName: e.target.value })} className={inp} placeholder="e.g., Court Vision" />
                                    </div>
                                </div>

                                {/* Size variants table */}
                                <div>
                                    <div className="flex justify-between items-center mb-3 border-b pb-3">
                                        <div>
                                            <h3 className="text-base font-bold text-zinc-800">Size Variants</h3>
                                            <p className="text-xs text-zinc-400 mt-0.5">Add one row per size. SKU is optional (auto-generated if left blank).</p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={addShoeSize}
                                            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-lg transition-colors"
                                        >
                                            <Plus size={16} /> Add Size
                                        </button>
                                    </div>

                                    {/* Table header */}
                                    <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-stone-100 rounded-lg text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2">
                                        <div className="col-span-2">Size *</div>
                                        <div className="col-span-2">Color</div>
                                        <div className="col-span-3">SKU</div>
                                        <div className="col-span-2">Cost (₱) *</div>
                                        <div className="col-span-2">Price (₱) *</div>
                                        <div className="col-span-1"></div>
                                    </div>

                                    <div className="space-y-2">
                                        {shoeVariants.map((v, index) => (
                                            <div
                                                key={index}
                                                className="grid grid-cols-12 gap-2 items-center p-2 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 transition-colors"
                                            >
                                                {/* Size */}
                                                <div className="col-span-2">
                                                    <input
                                                        type="text"
                                                        placeholder="e.g. 39 / US 8"
                                                        value={v.size}
                                                        onChange={e => handleShoeVariantChange(index, 'size', e.target.value)}
                                                        className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                                                    />
                                                </div>

                                                {/* Color */}
                                                <div className="col-span-2">
                                                    <input
                                                        type="text"
                                                        placeholder="e.g. Black"
                                                        value={v.color}
                                                        onChange={e => handleShoeVariantChange(index, 'color', e.target.value)}
                                                        className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                                    />
                                                </div>

                                                {/* SKU */}
                                                <div className="col-span-3">
                                                    <input
                                                        type="text"
                                                        placeholder="Auto-generated if blank"
                                                        value={v.sku}
                                                        onChange={e => handleShoeVariantChange(index, 'sku', e.target.value)}
                                                        className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                                                    />
                                                </div>

                                                {/* Cost */}
                                                <div className="col-span-2">
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        min="0"
                                                        placeholder="0.00"
                                                        value={v.acquisitionPrice}
                                                        onChange={e => handleShoeVariantChange(index, 'acquisitionPrice', e.target.value)}
                                                        className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                                    />
                                                </div>

                                                {/* Selling Price */}
                                                <div className="col-span-2">
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        min="0"
                                                        placeholder="0.00"
                                                        value={v.sellingPrice}
                                                        onChange={e => handleShoeVariantChange(index, 'sellingPrice', e.target.value)}
                                                        className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                                    />
                                                </div>

                                                {/* Remove */}
                                                <div className="col-span-1 flex justify-center">
                                                    <button
                                                        type="button"
                                                        onClick={() => removeShoeSize(index)}
                                                        disabled={shoeVariants.length === 1}
                                                        className="p-1.5 text-zinc-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                                        title="Remove this size"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Summary bar */}
                                    <div className="mt-4 flex items-center gap-3 px-3 py-2.5 bg-blue-50 border border-blue-100 rounded-lg">
                                        <Footprints size={16} className="text-blue-400 shrink-0" />
                                        <span className="text-xs font-bold text-blue-600">
                                            {shoeVariants.length} size{shoeVariants.length !== 1 ? 's' : ''} will be created for <span className="italic">{shoeBase.brandName || '...'} {shoeBase.modelName || '...'}</span>
                                        </span>
                                        {shoeVariants.length > 1 && (
                                            <span className="text-xs text-blue-400 ml-auto">
                                                Sizes: {shoeVariants.map(v => v.size || '?').join(', ')}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </form>
                        </div>

                        <div className="p-5 border-t border-stone-200 bg-stone-50 flex justify-end gap-3">
                            <button onClick={closeModal} className="px-6 py-2 rounded-lg font-bold text-zinc-600 hover:bg-stone-200">Cancel</button>
                            <button form="shoes-form" type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold flex items-center gap-2 hover:bg-blue-700">
                                <Save size={18} /> Save Shoes
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── MISC MODAL ── */}
            {activeModal === 'misc' && (
                <div className="fixed inset-0 bg-zinc-950/60 z-50 flex justify-center items-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="px-6 py-4 border-b flex justify-between items-center bg-stone-50">
                            <h2 className="text-lg font-bold uppercase tracking-wide">Add Item</h2>
                            <button onClick={closeModal} className="text-zinc-400 hover:text-red-500"><X size={20} /></button>
                        </div>

                        <div className="p-6">
                            {status.message && (
                                <div className={`p-3 mb-4 rounded-lg text-sm flex items-center gap-2 ${status.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                                    {status.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                                    <span className="font-medium">{status.message}</span>
                                </div>
                            )}

                            <form id="misc-form" onSubmit={submitMisc} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className={label}>Item Name</label>
                                        <input type="text" required value={miscData.name} onChange={e => setMiscData({ ...miscData, name: e.target.value })} className={inp} placeholder="e.g., Tourna Grip" />
                                    </div>
                                    <div>
                                        <label className={label}>Brand</label>
                                        <input type="text" required value={miscData.brandName} onChange={e => setMiscData({ ...miscData, brandName: e.target.value })} className={inp} placeholder="e.g., Tourna" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className={label}>Category</label>
                                        <select value={miscData.category} onChange={e => setMiscData({ ...miscData, category: e.target.value })} className={inp + ' bg-white'}>
                                            <option value="Accessories">Accessories</option>
                                            <option value="Balls">Balls</option>
                                            <option value="Bags">Bags</option>
                                            <option value="Apparel">Apparel</option>
                                            <option value="Shoes">Shoes</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className={label}>SKU (Optional)</label>
                                        <input type="text" value={miscData.sku} onChange={e => setMiscData({ ...miscData, sku: e.target.value })} className={inp} placeholder="Auto-generates if blank" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className={label}>Cost Price</label>
                                        <input type="number" step="0.01" required value={miscData.cost} onChange={e => setMiscData({ ...miscData, cost: e.target.value })} className={inp} placeholder="5.00" />
                                    </div>
                                    <div>
                                        <label className={label}>Selling Price</label>
                                        <input type="number" step="0.01" required value={miscData.price} onChange={e => setMiscData({ ...miscData, price: e.target.value })} className={inp} placeholder="9.99" />
                                    </div>
                                </div>
                            </form>
                        </div>

                        <div className="p-4 border-t bg-stone-50 flex justify-end gap-3">
                            <button onClick={closeModal} className="px-4 py-2 rounded-lg font-bold text-zinc-600 hover:bg-stone-200">Cancel</button>
                            <button form="misc-form" type="submit" className="px-4 py-2 bg-zinc-950 text-white rounded-lg font-bold flex items-center gap-2 hover:bg-zinc-800"><Save size={16} /> Save Item</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AddProduct;