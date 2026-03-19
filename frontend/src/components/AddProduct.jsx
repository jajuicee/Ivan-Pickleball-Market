import React, { useState } from 'react';
import axios from 'axios';
import { Target, Box, X, Plus, Save, AlertCircle, CheckCircle } from 'lucide-react';

const AddProduct = ({ onProductAdded }) => {
    // Modal State
    const [activeModal, setActiveModal] = useState(null); // 'paddle' | 'misc' | null
    const [status, setStatus] = useState({ type: '', message: '' });

    // --- PADDLE STATE ---
    const [paddleBase, setPaddleBase] = useState({ brandName: '', modelName: '' });
    const emptyVariant = { sku: '', color: '', thicknessMm: '', shape: '', acquisitionPrice: '', sellingPrice: '', stockQuantity: '' };
    const [paddleVariants, setPaddleVariants] = useState([{ ...emptyVariant }]);

    // --- MISC STATE --- (Added 'cost' for acquisition price, sku and stockQuantity)
    const [miscData, setMiscData] = useState({ brandName: '', name: '', category: 'Accessories', cost: '', price: '', sku: '', stockQuantity: '' });

    // --- PADDLE HANDLERS ---
    const handleAddVariant = () => {
        setPaddleVariants([...paddleVariants, { ...emptyVariant }]);
    };

    const handleVariantChange = (index, field, value) => {
        const updatedVariants = [...paddleVariants];
        updatedVariants[index][field] = value;
        setPaddleVariants(updatedVariants);
    };

    const submitPaddle = (e) => {
        e.preventDefault();
        setStatus({ type: '', message: '' });

        const newProduct = {
            brandName: paddleBase.brandName,
            modelName: paddleBase.modelName,
            category: 'Paddles',
            variants: paddleVariants.map(v => ({
                ...v,
                thicknessMm: parseInt(v.thicknessMm) || 0,
                acquisitionPrice: parseFloat(v.acquisitionPrice) || 0,
                sellingPrice: parseFloat(v.sellingPrice) || 0,
                stockQuantity: parseInt(v.stockQuantity) || 0
            }))
        };

        axios.post('http://localhost:8080/api/products', newProduct)
            .then(() => {
                setStatus({ type: 'success', message: 'Paddle and variants saved successfully!' });
                setPaddleBase({ brandName: '', modelName: '' });
                setPaddleVariants([{ ...emptyVariant }]);
                if (onProductAdded) onProductAdded(); // Refresh shared product list
                setTimeout(() => setActiveModal(null), 1500);
            })
            .catch(err => {
                const backendMsg = err.response?.data?.error;
                setStatus({ type: 'error', message: backendMsg || 'Failed to save paddle. Check console.' });
            });
    };

    // --- MISC HANDLERS ---
    const submitMisc = (e) => {
        e.preventDefault();
        setStatus({ type: '', message: '' });

        const newMiscProduct = {
            brandName: miscData.brandName,
            modelName: miscData.name,
            category: miscData.category,
            variants: [{
                sku: miscData.sku || `MISC-${Math.floor(Math.random() * 100000)}`,
                color: 'N/A',
                thicknessMm: 0,
                shape: 'N/A',
                acquisitionPrice: parseFloat(miscData.cost) || 0, // Now capturing cost price!
                sellingPrice: parseFloat(miscData.price) || 0,
                stockQuantity: parseInt(miscData.stockQuantity) || 0
            }]
        };

        axios.post('http://localhost:8080/api/products', newMiscProduct)
            .then(() => {
                setStatus({ type: 'success', message: 'Item added successfully!' });
                setMiscData({ brandName: '', name: '', category: 'Accessories', cost: '', price: '', sku: '', stockQuantity: '' });
                if (onProductAdded) onProductAdded(); // Refresh shared product list
                setTimeout(() => setActiveModal(null), 1500);
            })
            .catch(err => {
                const backendMsg = err.response?.data?.error;
                setStatus({ type: 'error', message: backendMsg || 'Failed to save item.' });
            });
    };

    return (
        <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl font-bold text-zinc-800 mb-8">What would you like to add?</h2>

            {/* --- BIG BUTTONS --- */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <button
                    onClick={() => { setActiveModal('paddle'); setStatus({}); }}
                    className="bg-white border-2 border-stone-200 hover:border-zinc-900 rounded-2xl p-10 flex flex-col items-center justify-center gap-4 transition-all shadow-sm hover:shadow-md group"
                >
                    <div className="bg-stone-100 p-6 rounded-full group-hover:bg-zinc-900 group-hover:text-white transition-colors">
                        <Target size={48} className="text-zinc-700 group-hover:text-white" />
                    </div>
                    <h3 className="text-2xl font-bold text-zinc-900">Add New Paddle</h3>
                    <p className="text-zinc-500 text-center">Register a new paddle model and all its specific variants (colors, thicknesses).</p>
                </button>

                <button
                    onClick={() => { setActiveModal('misc'); setStatus({}); }}
                    className="bg-white border-2 border-stone-200 hover:border-zinc-900 rounded-2xl p-10 flex flex-col items-center justify-center gap-4 transition-all shadow-sm hover:shadow-md group"
                >
                    <div className="bg-stone-100 p-6 rounded-full group-hover:bg-zinc-900 group-hover:text-white transition-colors">
                        <Box size={48} className="text-zinc-700 group-hover:text-white" />
                    </div>
                    <h3 className="text-2xl font-bold text-zinc-900">Miscellaneous</h3>
                    <p className="text-zinc-500 text-center">Quickly add balls, bags, grips, and other general retail items.</p>
                </button>
            </div>

            {/* --- PADDLE MODAL --- */}
            {activeModal === 'paddle' && (
                <div className="fixed inset-0 bg-zinc-950/60 z-50 flex justify-center items-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">

                        <div className="px-8 py-5 border-b border-stone-200 flex justify-between items-center bg-stone-50">
                            <h2 className="text-xl font-bold uppercase tracking-wide">Register Paddle</h2>
                            <button onClick={() => setActiveModal(null)} className="text-zinc-400 hover:text-red-500"><X size={24} /></button>
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
                                        <label className="block text-sm font-bold text-zinc-700 mb-1">Brand</label>
                                        <input type="text" required value={paddleBase.brandName} onChange={e => setPaddleBase({ ...paddleBase, brandName: e.target.value })} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-zinc-900 outline-none" placeholder="e.g., JOOLA" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-zinc-700 mb-1">Model Name</label>
                                        <input type="text" required value={paddleBase.modelName} onChange={e => setPaddleBase({ ...paddleBase, modelName: e.target.value })} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-zinc-900 outline-none" placeholder="e.g., Perseus 3" />
                                    </div>
                                </div>

                                <div>
                                    <div className="flex justify-between items-end mb-4 border-b pb-2">
                                        <h3 className="text-lg font-bold text-zinc-800">Variants</h3>
                                        <button type="button" onClick={handleAddVariant} className="text-sm font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 bg-blue-50 px-3 py-1 rounded">
                                            <Plus size={16} /> Add Variant
                                        </button>
                                    </div>

                                    <div className="space-y-6">
                                        {paddleVariants.map((variant, index) => (
                                            <div key={index} className="bg-stone-50 p-5 rounded-lg border border-stone-200 relative">
                                                <span className="absolute -top-3 left-4 bg-zinc-800 text-white text-xs font-bold px-2 py-1 rounded">Variant {index + 1}</span>
                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
                                                    <div>
                                                        <label className="block text-xs font-bold text-zinc-500 uppercase">SKU</label>
                                                        <input type="text" required value={variant.sku} onChange={e => handleVariantChange(index, 'sku', e.target.value)} className="w-full px-3 py-1.5 text-sm border rounded mt-1 font-mono" placeholder="JL-PER-16" />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold text-zinc-500 uppercase">Color</label>
                                                        <input type="text" required value={variant.color} onChange={e => handleVariantChange(index, 'color', e.target.value)} className="w-full px-3 py-1.5 text-sm border rounded mt-1" />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold text-zinc-500 uppercase">Thick (mm)</label>
                                                        <input type="number" required value={variant.thicknessMm} onChange={e => handleVariantChange(index, 'thicknessMm', e.target.value)} className="w-full px-3 py-1.5 text-sm border rounded mt-1" />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold text-zinc-500 uppercase">Shape</label>
                                                        <select value={variant.shape} required onChange={e => handleVariantChange(index, 'shape', e.target.value)} className="w-full px-3 py-1.5 text-sm border rounded mt-1 bg-white">
                                                            <option value="">Select...</option>
                                                            <option value="Standard">Standard</option>
                                                            <option value="Elongated">Elongated</option>
                                                            <option value="Hybrid">Hybrid</option>
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold text-zinc-500 uppercase">Cost ($)</label>
                                                        <input type="number" step="0.01" required value={variant.acquisitionPrice} onChange={e => handleVariantChange(index, 'acquisitionPrice', e.target.value)} className="w-full px-3 py-1.5 text-sm border rounded mt-1" />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold text-zinc-500 uppercase">Price ($)</label>
                                                        <input type="number" step="0.01" required value={variant.sellingPrice} onChange={e => handleVariantChange(index, 'sellingPrice', e.target.value)} className="w-full px-3 py-1.5 text-sm border rounded mt-1" />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold text-zinc-500 uppercase">Stock</label>
                                                        <input type="number" required value={variant.stockQuantity} onChange={e => handleVariantChange(index, 'stockQuantity', e.target.value)} className="w-full px-3 py-1.5 text-sm border rounded mt-1" />
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
                            <button onClick={() => setActiveModal(null)} className="px-6 py-2 rounded-lg font-bold text-zinc-600 hover:bg-stone-200">Cancel</button>
                            <button form="paddle-form" type="submit" className="px-6 py-2 bg-zinc-950 text-white rounded-lg font-bold flex items-center gap-2 hover:bg-zinc-800"><Save size={18} /> Save Paddle</button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- MISC MODAL --- */}
            {activeModal === 'misc' && (
                <div className="fixed inset-0 bg-zinc-950/60 z-50 flex justify-center items-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">

                        <div className="px-6 py-4 border-b flex justify-between items-center bg-stone-50">
                            <h2 className="text-lg font-bold uppercase tracking-wide">Add Item</h2>
                            <button onClick={() => setActiveModal(null)} className="text-zinc-400 hover:text-red-500"><X size={20} /></button>
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
                                        <label className="block text-sm font-bold text-zinc-700 mb-1">Item Name</label>
                                        <input type="text" required value={miscData.name} onChange={e => setMiscData({ ...miscData, name: e.target.value })} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-zinc-900 outline-none" placeholder="e.g., Tourna Grip" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-zinc-700 mb-1">Brand</label>
                                        <input type="text" required value={miscData.brandName} onChange={e => setMiscData({ ...miscData, brandName: e.target.value })} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-zinc-900 outline-none" placeholder="e.g., Tourna" />
                                    </div>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-zinc-700 mb-1">Category</label>
                                        <select value={miscData.category} onChange={e => setMiscData({ ...miscData, category: e.target.value })} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-zinc-900 outline-none">
                                            <option value="Accessories">Accessories</option>
                                            <option value="Balls">Balls</option>
                                            <option value="Bags">Bags</option>
                                            <option value="Apparel">Apparel</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-zinc-700 mb-1">SKU (Optional)</label>
                                        <input type="text" value={miscData.sku} onChange={e => setMiscData({ ...miscData, sku: e.target.value })} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-zinc-900 outline-none" placeholder="Auto-generates if blank" />
                                    </div>
                                </div>

                                {/* NEW PRICING GRID */}
                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-zinc-700 mb-1">Cost Price</label>
                                        <input type="number" step="0.01" required value={miscData.cost} onChange={e => setMiscData({ ...miscData, cost: e.target.value })} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-zinc-900 outline-none" placeholder="5.00" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-zinc-700 mb-1">Selling Price</label>
                                        <input type="number" step="0.01" required value={miscData.price} onChange={e => setMiscData({ ...miscData, price: e.target.value })} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-zinc-900 outline-none" placeholder="9.99" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-zinc-700 mb-1">Initial Stock</label>
                                        <input type="number" required min="0" value={miscData.stockQuantity} onChange={e => setMiscData({ ...miscData, stockQuantity: e.target.value })} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-zinc-900 outline-none" placeholder="Qty" />
                                    </div>
                                </div>

                            </form>
                        </div>

                        <div className="p-4 border-t bg-stone-50 flex justify-end gap-3">
                            <button onClick={() => setActiveModal(null)} className="px-4 py-2 rounded-lg font-bold text-zinc-600 hover:bg-stone-200">Cancel</button>
                            <button form="misc-form" type="submit" className="px-4 py-2 bg-zinc-950 text-white rounded-lg font-bold flex items-center gap-2 hover:bg-zinc-800"><Save size={16} /> Save Item</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AddProduct;