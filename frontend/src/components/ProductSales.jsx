import React, { useState, useMemo } from 'react';
import { Search, Filter, BarChart2, Package, TrendingUp } from 'lucide-react';

const ProductSales = ({ products = [] }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('All');

    // 1. Extract all unique categories
    const categories = useMemo(() => {
        const catSet = new Set(products.map(p => p.category).filter(Boolean));
        return ['All', ...Array.from(catSet).sort()];
    }, [products]);

    // 2. Flatten products into variant rows with calculated totals
    const salesData = useMemo(() => {
        const flattened = products.flatMap(product => 
            product.variants?.map(variant => {
                const isPaddle = product.category === 'Paddles';
                const name = isPaddle
                    ? `${product.brandName} ${product.modelName} ${variant.color && variant.color !== 'N/A' ? `(${variant.color}) ` : ''}${variant.thicknessMm ? `${variant.thicknessMm}mm` : ''}`
                    : `${product.brandName} ${product.modelName}`;

                const totalAdded = variant.totalAdded || 0;
                const totalSold = variant.totalSold || 0;
                const remaining = variant.stockQuantity || 0;
                
                // Calculate sell-through rate
                const sellThrough = totalAdded > 0 ? (totalSold / totalAdded) * 100 : 0;

                return {
                    id: variant.id,
                    sku: variant.sku,
                    name: name.trim(),
                    brand: product.brandName,
                    category: product.category || 'Uncategorized',
                    totalAdded,
                    totalSold,
                    remaining,
                    sellThrough
                };
            }) || []
        );

        // Filter and sort by highest sold
        return flattened
            .filter(item => categoryFilter === 'All' || item.category === categoryFilter)
            .filter(item => 
                searchQuery === '' || 
                item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                item.sku.toLowerCase().includes(searchQuery.toLowerCase())
            )
            .sort((a, b) => b.totalSold - a.totalSold);
    }, [products, categoryFilter, searchQuery]);

    // Summaries
    const grandTotalAdded = salesData.reduce((sum, item) => sum + item.totalAdded, 0);
    const grandTotalSold = salesData.reduce((sum, item) => sum + item.totalSold, 0);
    const overallSellThrough = grandTotalAdded > 0 ? (grandTotalSold / grandTotalAdded) * 100 : 0;

    return (
        <div className="flex flex-col h-full overflow-hidden">
            {/* Header */}
            <div className="flex flex-wrap justify-between items-center gap-4 mb-6 shrink-0">
                <div className="flex items-center gap-3">
                    <BarChart2 className="text-zinc-500" size={28} />
                    <h2 className="text-2xl font-black text-zinc-800 tracking-tight">Product Sales Tracking</h2>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search by name or SKU..."
                            className="pl-9 pr-4 py-2 border border-stone-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-zinc-900 shadow-sm w-64"
                        />
                    </div>
                </div>
            </div>

            {/* Top Summaries */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 shrink-0">
                {/* Lifetime Stock Card */}
                <div className="relative overflow-hidden bg-white border border-stone-200 rounded-2xl p-5 shadow-sm">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-blue-600 rounded-t-2xl" />
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Lifetime Stock Received</p>
                            <p className="text-4xl font-black text-zinc-900 leading-none">{grandTotalAdded.toLocaleString()}</p>
                            <p className="text-xs text-zinc-400 mt-1.5 font-medium">units ever received</p>
                        </div>
                        <div className="p-3 bg-blue-50 text-blue-500 rounded-xl shrink-0">
                            <Package size={22} />
                        </div>
                    </div>
                </div>

                {/* Total Sold Card */}
                <div className="relative overflow-hidden bg-white border border-stone-200 rounded-2xl p-5 shadow-sm">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-t-2xl" />
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Total Units Sold</p>
                            <p className="text-4xl font-black text-emerald-600 leading-none">{grandTotalSold.toLocaleString()}</p>
                            <p className="text-xs text-zinc-400 mt-1.5 font-medium">of {grandTotalAdded} received</p>
                        </div>
                        <div className="p-3 bg-emerald-50 text-emerald-500 rounded-xl shrink-0">
                            <TrendingUp size={22} />
                        </div>
                    </div>
                </div>

                {/* Sell-Through Card */}
                <div className="relative overflow-hidden bg-white border border-stone-200 rounded-2xl p-5 shadow-sm">
                    <div
                        className="absolute top-0 left-0 h-1 rounded-t-2xl transition-all duration-700"
                        style={{
                            width: `${Math.min(overallSellThrough, 100)}%`,
                            background: overallSellThrough >= 80 ? 'linear-gradient(to right, #10b981, #059669)'
                                : overallSellThrough >= 40 ? 'linear-gradient(to right, #f59e0b, #d97706)'
                                : 'linear-gradient(to right, #f87171, #ef4444)'
                        }}
                    />
                    <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Overall Sell-Through</p>
                            <p className={`text-4xl font-black leading-none ${overallSellThrough >= 80 ? 'text-emerald-600' : overallSellThrough >= 40 ? 'text-amber-500' : 'text-red-500'}`}>
                                {overallSellThrough.toFixed(1)}%
                            </p>
                            <div className="mt-3 w-full bg-stone-100 rounded-full h-1.5 overflow-hidden">
                                <div
                                    className="h-full rounded-full transition-all duration-700"
                                    style={{
                                        width: `${Math.min(overallSellThrough, 100)}%`,
                                        background: overallSellThrough >= 80 ? '#10b981' : overallSellThrough >= 40 ? '#f59e0b' : '#ef4444'
                                    }}
                                />
                            </div>
                        </div>
                        <div className="p-3 bg-amber-50 text-amber-500 rounded-xl shrink-0 ml-3">
                            <BarChart2 size={22} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Category Filter */}
            <div className="flex gap-2 mb-4 shrink-0 flex-wrap">
                <span className="flex items-center gap-1.5 text-xs font-bold text-zinc-400 mr-2 uppercase tracking-wide">
                    <Filter size={14} /> Filter:
                </span>
                {categories.map(cat => (
                    <button
                        key={cat}
                        onClick={() => setCategoryFilter(cat)}
                        className={`px-4 py-1.5 rounded-full text-xs font-bold border transition-colors ${
                            categoryFilter === cat 
                                ? 'bg-zinc-900 border-zinc-900 text-white' 
                                : 'bg-white border-stone-200 text-zinc-600 hover:bg-stone-50'
                        }`}
                    >
                        {cat}
                    </button>
                ))}
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto bg-white border border-stone-200 rounded-xl shadow-sm">
                <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-stone-100/80 backdrop-blur-md shadow-sm z-10 text-xs uppercase tracking-wider text-zinc-500 font-bold border-b border-stone-200">
                        <tr>
                            <th className="px-6 py-4">Product Name</th>
                            <th className="px-6 py-4">SKU</th>
                            <th className="px-6 py-4">Category</th>
                            <th className="px-6 py-4 text-center">
                                <span className="text-blue-500">Lifetime Stock</span>
                            </th>
                            <th className="px-6 py-4 text-center">
                                <span className="text-emerald-500">Total Sold</span>
                            </th>
                            <th className="px-6 py-4 text-center">Remaining</th>
                            <th className="px-6 py-4 text-right">Sell-Through</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 text-sm">
                        {salesData.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="px-6 py-16 text-center text-zinc-400">
                                    No products matching your filters.
                                </td>
                            </tr>
                        ) : (
                            salesData.map((item) => (
                                <tr key={item.id} className="hover:bg-stone-50/80 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-zinc-900 group-hover:text-zinc-700 transition-colors">{item.name}</div>
                                        <div className="text-xs text-zinc-400 mt-0.5">{item.brand}</div>
                                    </td>
                                    <td className="px-6 py-4 font-mono text-xs text-zinc-500">{item.sku}</td>
                                    <td className="px-6 py-4">
                                        <span className="px-2.5 py-1 bg-stone-100 text-stone-600 text-[10px] font-bold uppercase tracking-wider rounded-full">
                                            {item.category}
                                        </span>
                                    </td>

                                    {/* Lifetime Stock */}
                                    <td className="px-6 py-4 text-center">
                                        <div className="flex flex-col items-center gap-1">
                                            <span className="text-lg font-black text-zinc-700">{item.totalAdded}</span>
                                            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">received</span>
                                        </div>
                                    </td>

                                    {/* Total Sold */}
                                    <td className="px-6 py-4 text-center">
                                        <div className="flex flex-col items-center gap-1">
                                            <span className="text-lg font-black text-emerald-600">{item.totalSold}</span>
                                            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wide">sold</span>
                                        </div>
                                    </td>

                                    {/* Remaining */}
                                    <td className="px-6 py-4 text-center">
                                        <span className={`inline-flex items-center justify-center min-w-[2.5rem] font-black text-base px-3 py-1 rounded-xl border ${
                                            item.remaining === 0
                                                ? 'text-red-600 bg-red-50 border-red-200'
                                                : item.remaining <= 2
                                                ? 'text-amber-600 bg-amber-50 border-amber-200'
                                                : 'text-blue-600 bg-blue-50 border-blue-100'
                                        }`}>
                                            {item.remaining}
                                        </span>
                                    </td>

                                    {/* Sell-Through */}
                                    <td className="px-6 py-4">
                                        <div className="flex items-center justify-end gap-3">
                                            <div className="w-28 bg-stone-100 rounded-full h-2 overflow-hidden">
                                                <div
                                                    className="h-full rounded-full transition-all duration-500"
                                                    style={{
                                                        width: `${Math.min(item.sellThrough, 100)}%`,
                                                        background: item.sellThrough >= 80 ? '#10b981'
                                                            : item.sellThrough >= 40 ? '#f59e0b'
                                                            : '#f87171'
                                                    }}
                                                />
                                            </div>
                                            <span className={`font-black text-sm w-12 text-right ${
                                                item.sellThrough >= 80 ? 'text-emerald-600'
                                                : item.sellThrough >= 40 ? 'text-amber-500'
                                                : 'text-red-400'
                                            }`}>
                                                {item.sellThrough.toFixed(0)}%
                                            </span>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ProductSales;
