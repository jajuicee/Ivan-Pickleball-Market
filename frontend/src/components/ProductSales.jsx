import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { Search, Filter, BarChart2, Package, TrendingUp, Calendar, ChevronLeft, ChevronRight, X, Loader2 } from 'lucide-react';

// ── Helpers ──────────────────────────────────────────────────────────────────
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS   = ['Su','Mo','Tu','We','Th','Fr','Sa'];

const pad   = (n) => n.toString().padStart(2, '0');
const fmtDt = (d) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;

const getStartOfDay  = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const getStartOfWeek = (d) => { const c = new Date(d); c.setDate(c.getDate() - c.getDay()); return getStartOfDay(c); };
const getStartOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1);
const isSameDay = (a, b) => a && b && a.toDateString() === b.toDateString();
const isInRange = (date, start, end) => {
    if (!start || !end) return false;
    const t = date.getTime();
    return t > Math.min(start.getTime(), end.getTime()) && t < Math.max(start.getTime(), end.getTime());
};

const PRESETS = [
    { id: 'ALL',   label: 'All Time' },
    { id: 'TODAY', label: 'Today' },
    { id: 'WEEK',  label: 'This Week' },
    { id: 'MONTH', label: 'This Month' },
    { id: 'LAST_MONTH', label: 'Last Month' },
];

// ── Calendar Picker (same style as Analytics) ────────────────────────────────
const CalendarPicker = ({ onApply, onClose }) => {
    const today = new Date();
    const [viewYear,  setViewYear]  = useState(today.getFullYear());
    const [viewMonth, setViewMonth] = useState(today.getMonth());
    const [startDate, setStartDate] = useState(null);
    const [endDate,   setEndDate]   = useState(null);
    const [hoverDate, setHoverDate] = useState(null);

    const getDaysInMonth  = (y, m) => new Date(y, m + 1, 0).getDate();
    const getFirstDayOfMonth = (y, m) => new Date(y, m, 1).getDay();

    const prevMonth = () => { if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y-1); } else setViewMonth(m => m-1); };
    const nextMonth = () => { if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y+1); } else setViewMonth(m => m+1); };

    const handleDayClick = (day) => {
        const clicked = new Date(viewYear, viewMonth, day);
        if (!startDate || (startDate && endDate)) { setStartDate(clicked); setEndDate(null); }
        else { if (clicked < startDate) { setEndDate(startDate); setStartDate(clicked); } else setEndDate(clicked); }
    };

    const daysInMonth = getDaysInMonth(viewYear, viewMonth);
    const firstDay    = getFirstDayOfMonth(viewYear, viewMonth);
    const formatLabel = (d) => d ? d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

    return (
        <div className="absolute right-0 top-12 z-50 bg-white border border-stone-200 rounded-2xl shadow-2xl p-5 w-80">
            <div className="flex items-center justify-between mb-4">
                <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-stone-100 text-zinc-500 transition-colors"><ChevronLeft size={16} /></button>
                <span className="text-sm font-bold text-zinc-800">{MONTHS[viewMonth]} {viewYear}</span>
                <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-stone-100 text-zinc-500 transition-colors"><ChevronRight size={16} /></button>
            </div>
            <div className="grid grid-cols-7 mb-1">
                {DAYS.map(d => <div key={d} className="text-center text-xs font-bold text-zinc-400 py-1">{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-y-1">
                {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} />)}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                    const day  = i + 1;
                    const date = new Date(viewYear, viewMonth, day);
                    const isStart  = isSameDay(date, startDate);
                    const isEnd    = isSameDay(date, endDate);
                    const inRange  = isInRange(date, startDate, endDate || hoverDate);
                    const isToday  = isSameDay(date, today);
                    const isFuture = date > today;
                    return (
                        <button key={day} disabled={isFuture} onClick={() => handleDayClick(day)}
                            onMouseEnter={() => setHoverDate(date)} onMouseLeave={() => setHoverDate(null)}
                            className={`text-xs font-medium py-2 rounded-lg transition-all
                                ${isFuture ? 'text-zinc-300 cursor-not-allowed' : 'cursor-pointer'}
                                ${isStart || isEnd ? 'bg-zinc-950 text-white font-bold' : ''}
                                ${inRange && !isStart && !isEnd ? 'bg-zinc-100 text-zinc-700 rounded-none' : ''}
                                ${!isStart && !isEnd && !inRange && !isFuture ? 'hover:bg-stone-100 text-zinc-700' : ''}
                                ${isToday && !isStart && !isEnd ? 'ring-1 ring-zinc-300' : ''}`}>
                            {day}
                        </button>
                    );
                })}
            </div>
            <div className="mt-4 pt-4 border-t border-stone-100">
                <div className="flex justify-between text-xs text-zinc-500 mb-3">
                    <div><span className="block font-bold text-zinc-400 mb-0.5">FROM</span><span className="text-zinc-700 font-semibold">{formatLabel(startDate)}</span></div>
                    <div className="text-right"><span className="block font-bold text-zinc-400 mb-0.5">TO</span><span className="text-zinc-700 font-semibold">{formatLabel(endDate)}</span></div>
                </div>
                <div className="flex gap-2">
                    <button onClick={onClose} className="flex-1 py-2 text-xs font-bold rounded-lg border border-stone-200 text-zinc-500 hover:bg-stone-50 transition-all">Cancel</button>
                    <button onClick={() => startDate && endDate && onApply(startDate, endDate)} disabled={!startDate || !endDate}
                        className="flex-1 py-2 text-xs font-bold rounded-lg bg-zinc-950 text-white disabled:opacity-30 hover:bg-zinc-800 transition-all">Apply Range</button>
                </div>
            </div>
        </div>
    );
};

// ── Main Component ────────────────────────────────────────────────────────────
const ProductSales = ({ products = [] }) => {
    const [searchQuery,    setSearchQuery]    = useState('');
    const [categoryFilter, setCategoryFilter] = useState('All');
    const [preset,         setPreset]         = useState(PRESETS[0]); // default: All Time
    const [customRange,    setCustomRange]    = useState(null);
    const [showCalendar,   setShowCalendar]   = useState(false);
    const [transactions,   setTransactions]   = useState([]);
    const [loadingTx,      setLoadingTx]      = useState(false);
    const calendarRef = useRef(null);

    // Close calendar on outside click
    useEffect(() => {
        const handler = (e) => { if (calendarRef.current && !calendarRef.current.contains(e.target)) setShowCalendar(false); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // Compute API query bounds from preset or custom range
    const getDateBounds = useCallback(() => {
        const now = new Date();
        if (customRange) {
            const end = new Date(customRange.end); end.setHours(23, 59, 59);
            return { from: fmtDt(customRange.start), to: fmtDt(end) };
        }
        if (!preset || preset.id === 'ALL') return null;
        if (preset.id === 'TODAY') return { from: fmtDt(getStartOfDay(now)), to: fmtDt(now) };
        if (preset.id === 'WEEK')  return { from: fmtDt(getStartOfWeek(now)), to: fmtDt(now) };
        if (preset.id === 'MONTH') return { from: fmtDt(getStartOfMonth(now)), to: fmtDt(now) };
        if (preset.id === 'LAST_MONTH') {
            const firstOfThisMonth = getStartOfMonth(now);
            const firstOfLast = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const lastOfLast  = new Date(firstOfThisMonth.getTime() - 1);
            return { from: fmtDt(firstOfLast), to: fmtDt(lastOfLast) };
        }
        return null;
    }, [preset, customRange]);

    // Fetch transactions whenever filter changes
    useEffect(() => {
        setLoadingTx(true);
        const bounds = getDateBounds();
        const url = bounds
            ? `/api/transactions?from=${bounds.from}&to=${bounds.to}&limit=100000`
            : `/api/transactions?limit=100000`;
        axios.get(url)
            .then(res => setTransactions(Array.isArray(res.data) ? res.data : []))
            .catch(() => setTransactions([]))
            .finally(() => setLoadingTx(false));
    }, [getDateBounds]);

    // Build a sold-count map from filtered transactions { variantId -> count }
    const soldInPeriod = useMemo(() => {
        const map = {};
        transactions.forEach(tx => {
            if (tx.status === 'UNPAID') return; // only count paid/partial
            const vid = tx.variantId ?? tx.variant?.id;
            if (vid != null) map[vid] = (map[vid] || 0) + 1;
        });
        return map;
    }, [transactions]);

    // Unique categories from products
    const categories = useMemo(() => {
        const catSet = new Set(products.map(p => p.category).filter(Boolean));
        return ['All', ...Array.from(catSet).sort()];
    }, [products]);

    // Flatten to variant rows, injecting period-specific sold count
    const salesData = useMemo(() => {
        const flattened = products.flatMap(product =>
            product.variants?.map(variant => {
                const isPaddle = product.category === 'Paddles';
                const isShoe   = product.category === 'Shoes';
                const colorTag = variant.color && variant.color !== 'N/A' ? ` (${variant.color})` : '';
                const sizeTag  = isShoe   && variant.shape       ? ` Size ${variant.shape}` : '';
                const thickTag = isPaddle && variant.thicknessMm ? ` ${variant.thicknessMm}mm` : '';
                const name     = `${product.brandName} ${product.modelName}${colorTag}${thickTag}${sizeTag}`;

                const totalAdded = variant.totalAdded || 0;
                const totalSold  = (preset?.id === 'ALL' && !customRange)
                    ? (variant.totalSold || 0)               // lifetime: use precomputed value
                    : (soldInPeriod[variant.id] || 0);       // filtered: use tx count
                const remaining  = variant.stockQuantity || 0;
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
                    sellThrough,
                };
            }) || []
        );

        return flattened
            .filter(item => categoryFilter === 'All' || item.category === categoryFilter)
            .filter(item =>
                searchQuery === '' ||
                (item.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (item.sku  || '').toLowerCase().includes(searchQuery.toLowerCase())
            )
            .sort((a, b) => {
                if (b.totalSold !== a.totalSold) return b.totalSold - a.totalSold;
                return a.name.localeCompare(b.name, undefined, { numeric: true });
            });
    }, [products, categoryFilter, searchQuery, preset, customRange, soldInPeriod]);

    // Summary stats
    const grandTotalAdded = salesData.reduce((s, i) => s + i.totalAdded, 0);
    const grandTotalSold  = salesData.reduce((s, i) => s + i.totalSold,  0);
    const overallSellThrough = grandTotalAdded > 0 ? (grandTotalSold / grandTotalAdded) * 100 : 0;

    // Calendar handlers
    const handleCalendarApply = (start, end) => {
        const label = `${start.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}`;
        setCustomRange({ start, end, label });
        setPreset(null);
        setShowCalendar(false);
    };

    const activeDateLabel = customRange?.label ?? preset?.label ?? 'All Time';

    return (
        <div className="flex flex-col h-full overflow-hidden">

            {/* Header */}
            <div className="flex flex-wrap justify-between items-center gap-4 mb-5 shrink-0">
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

            {/* ── Date Filter Row ───────────────────────────────────────────── */}
            <div className="flex items-center gap-2 mb-5 shrink-0 flex-wrap">
                <span className="flex items-center gap-1.5 text-xs font-bold text-zinc-400 mr-1 uppercase tracking-wide">
                    <Calendar size={14} /> Period:
                </span>

                {PRESETS.map(p => (
                    <button
                        key={p.id}
                        onClick={() => { setPreset(p); setCustomRange(null); }}
                        className={`px-4 py-1.5 rounded-full text-xs font-bold border transition-colors ${
                            !customRange && preset?.id === p.id
                                ? 'bg-zinc-900 border-zinc-900 text-white'
                                : 'bg-white border-stone-200 text-zinc-600 hover:bg-stone-50'
                        }`}
                    >
                        {p.label}
                    </button>
                ))}

                {/* Custom Range Button */}
                <div className="relative" ref={calendarRef}>
                    <button
                        onClick={() => setShowCalendar(v => !v)}
                        className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold border transition-colors ${
                            customRange
                                ? 'bg-zinc-900 border-zinc-900 text-white'
                                : 'bg-white border-stone-200 text-zinc-600 hover:bg-stone-50'
                        }`}
                    >
                        <Calendar size={12} />
                        {customRange ? customRange.label : 'Custom Range'}
                        {customRange && (
                            <span
                                onClick={(e) => { e.stopPropagation(); setCustomRange(null); setPreset(PRESETS[0]); }}
                                className="ml-1 hover:text-red-400 transition-colors"
                            >
                                <X size={11} />
                            </span>
                        )}
                    </button>
                    {showCalendar && (
                        <CalendarPicker
                            onApply={handleCalendarApply}
                            onClose={() => setShowCalendar(false)}
                        />
                    )}
                </div>

                {/* Loading spinner */}
                {loadingTx && (
                    <div className="flex items-center gap-1.5 ml-2 text-xs text-zinc-400">
                        <Loader2 size={13} className="animate-spin" />
                        <span>Loading…</span>
                    </div>
                )}
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5 shrink-0">
                {/* Lifetime Stock */}
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

                {/* Total Sold in Period */}
                <div className="relative overflow-hidden bg-white border border-stone-200 rounded-2xl p-5 shadow-sm">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-t-2xl" />
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
                                Units Sold
                                {activeDateLabel !== 'All Time' && (
                                    <span className="ml-1 normal-case font-semibold text-zinc-300">({activeDateLabel})</span>
                                )}
                            </p>
                            <p className="text-4xl font-black text-emerald-600 leading-none">{grandTotalSold.toLocaleString()}</p>
                            <p className="text-xs text-zinc-400 mt-1.5 font-medium">of {grandTotalAdded} received</p>
                        </div>
                        <div className="p-3 bg-emerald-50 text-emerald-500 rounded-xl shrink-0">
                            <TrendingUp size={22} />
                        </div>
                    </div>
                </div>

                {/* Sell-Through */}
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
                    <Filter size={14} /> Category:
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
                            <th className="px-6 py-4 text-center"><span className="text-blue-500">Lifetime Stock</span></th>
                            <th className="px-6 py-4 text-center">
                                <span className="text-emerald-500">
                                    Sold
                                    {activeDateLabel !== 'All Time' && (
                                        <span className="block text-[10px] font-semibold text-emerald-300 normal-case">{activeDateLabel}</span>
                                    )}
                                </span>
                            </th>
                            <th className="px-6 py-4 text-center">Remaining</th>
                            <th className="px-6 py-4 text-right">Sell-Through</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 text-sm">
                        {loadingTx ? (
                            <tr>
                                <td colSpan={7} className="px-6 py-16 text-center text-zinc-400">
                                    <Loader2 className="inline w-6 h-6 animate-spin mb-2 text-zinc-300" />
                                    <div>Loading transactions…</div>
                                </td>
                            </tr>
                        ) : salesData.length === 0 ? (
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

                                    {/* Sold in Period */}
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
