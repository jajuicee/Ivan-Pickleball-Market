import React, { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
    Legend, LabelList
} from 'recharts';
import { BarChart3, TrendingUp, DollarSign, Package, AlertCircle, RefreshCw, Trophy, Calendar, X, ChevronLeft, ChevronRight, CreditCard, ChevronDown } from 'lucide-react';

const formatCurrency = (val) =>
    `₱${Number(val).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const CurrencyDisplay = ({ value }) => (
    <span>
        <span style={{ fontFamily: 'ui-sans-serif, system-ui, sans-serif', fontWeight: 'normal', marginRight: '2px' }}>₱</span>
        {Number(value).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
    </span>
);

const getStartOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const getStartOfWeek = (d) => {
    const date = new Date(d);
    date.setDate(date.getDate() - date.getDay());
    return getStartOfDay(date);
};

const TIME_RANGES = [
    { id: '1Y', label: 'Last 12 Months', groupBy: 'month', days: 365 },
    { id: '6M', label: 'Last 6 Months', groupBy: 'month', days: 180 },
    { id: '30D', label: 'Last 30 Days', groupBy: 'day', days: 30 },
    { id: '7D', label: 'Last 7 Days', groupBy: 'day', days: 7 }
];

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

const isSameDay = (a, b) => a && b && a.toDateString() === b.toDateString();
const isInRange = (date, start, end) => {
    if (!start || !end) return false;
    const t = date.getTime();
    return t > Math.min(start.getTime(), end.getTime()) && t < Math.max(start.getTime(), end.getTime());
};

const CalendarPicker = ({ onApply, onClose }) => {
    const today = new Date();
    const [viewYear, setViewYear] = useState(today.getFullYear());
    const [viewMonth, setViewMonth] = useState(today.getMonth());
    const [startDate, setStartDate] = useState(null);
    const [endDate, setEndDate] = useState(null);
    const [hoverDate, setHoverDate] = useState(null);

    const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
    const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

    const prevMonth = () => { if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); } else setViewMonth(m => m - 1); };
    const nextMonth = () => { if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); } else setViewMonth(m => m + 1); };

    const handleDayClick = (day) => {
        const clicked = new Date(viewYear, viewMonth, day);
        if (!startDate || (startDate && endDate)) { setStartDate(clicked); setEndDate(null); }
        else { if (clicked < startDate) { setEndDate(startDate); setStartDate(clicked); } else setEndDate(clicked); }
    };

    const daysInMonth = getDaysInMonth(viewYear, viewMonth);
    const firstDay = getFirstDayOfMonth(viewYear, viewMonth);
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
                    const day = i + 1;
                    const date = new Date(viewYear, viewMonth, day);
                    const isStart = isSameDay(date, startDate);
                    const isEnd = isSameDay(date, endDate);
                    const inRange = isInRange(date, startDate, endDate || hoverDate);
                    const isToday = isSameDay(date, today);
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

// ── Payment Method Dropdown ──────────────────────────────────────────────────
const PaymentFilter = ({ transactions, value, onChange }) => {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    const methods = useMemo(() => {
        const set = new Set(transactions.map(t => t.paymentMethod).filter(Boolean));
        return ['All', ...Array.from(set).sort()];
    }, [transactions]);

    useEffect(() => {
        const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const isFiltered = value !== 'All';

    return (
        <div className="relative" ref={ref}>
            <button
                onClick={() => setOpen(v => !v)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border shadow-sm text-xs font-bold"
                style={{
                    backgroundColor: isFiltered ? '#09090b' : '#ffffff',
                    color: isFiltered ? '#ffffff' : '#71717a',
                    borderColor: isFiltered ? '#09090b' : '#d6d3d1',
                    transition: 'background-color 200ms ease, color 200ms ease, border-color 200ms ease',
                }}
            >
                <CreditCard size={14} />
                <span>{isFiltered ? value : 'Payment'}</span>
                <ChevronDown size={12} style={{ transition: 'transform 200ms ease', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }} />
                {isFiltered && (
                    <span onClick={(e) => { e.stopPropagation(); onChange('All'); }} className="ml-0.5 hover:text-red-300 transition-colors">
                        <X size={11} />
                    </span>
                )}
            </button>

            <div
                className="absolute right-0 top-10 z-50 bg-white border border-stone-200 rounded-xl shadow-2xl py-1.5 min-w-[160px]"
                style={{
                    opacity: open ? 1 : 0,
                    transform: open ? 'translateY(0) scale(1)' : 'translateY(-6px) scale(0.97)',
                    transition: 'opacity 160ms ease, transform 160ms ease',
                    pointerEvents: open ? 'all' : 'none',
                }}
            >
                {methods.map(method => (
                    <button
                        key={method}
                        onClick={() => { onChange(method); setOpen(false); }}
                        className="w-full text-left px-4 py-2 text-xs flex items-center gap-2"
                        style={{
                            backgroundColor: value === method ? '#f5f5f4' : 'transparent',
                            color: value === method ? '#09090b' : '#52525b',
                            fontWeight: value === method ? '700' : '500',
                            transition: 'background-color 120ms ease',
                        }}
                        onMouseEnter={e => { if (value !== method) e.currentTarget.style.backgroundColor = '#fafaf9'; }}
                        onMouseLeave={e => { if (value !== method) e.currentTarget.style.backgroundColor = 'transparent'; }}
                    >
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${value === method ? 'bg-zinc-800' : 'bg-transparent'}`} />
                        {method}
                    </button>
                ))}
            </div>
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────────────────

const Analytics = () => {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [timeRange, setTimeRange] = useState(TIME_RANGES[2]);
    const [topFilter, setTopFilter] = useState('units');
    const [mainTab, setMainTab] = useState('trends');
    const [paymentFilter, setPaymentFilter] = useState('All');
    const [categoryFilter, setCategoryFilter] = useState('All');
    const [showCalendar, setShowCalendar] = useState(false);
    const [customRange, setCustomRange] = useState(null);
    const calendarRef = useRef(null);

    useEffect(() => {
        const handler = (e) => { if (calendarRef.current && !calendarRef.current.contains(e.target)) setShowCalendar(false); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const handleCalendarApply = (start, end) => {
        const label = `${start.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}`;
        setCustomRange({ start, end, label });
        setTimeRange(null);
        setShowCalendar(false);
    };

    const handlePresetSelect = (range) => { setTimeRange(range); setCustomRange(null); };

    const fetchTransactions = () => {
        setLoading(true);
        setError('');
        axios.get(`http://${window.location.hostname}:8080/api/transactions`)
            .then(res => setTransactions(Array.isArray(res.data) ? res.data : []))
            .catch(() => setError('Could not load analytics data.'))
            .finally(() => setLoading(false));
    };

    useEffect(() => { fetchTransactions(); }, []);

    const processedData = useMemo(() => {
        if (!transactions.length) return { chartData: [], topProducts: [], summary: {} };

        const now = new Date();
        let cutoffDate, toDate;

        if (customRange) {
            cutoffDate = customRange.start;
            toDate = new Date(customRange.end);
            toDate.setHours(23, 59, 59, 999);
        } else if (timeRange) {
            cutoffDate = new Date(now);
            cutoffDate.setDate(now.getDate() - timeRange.days);
            toDate = now;
        } else {
            return { chartData: [], topProducts: [], summary: {} };
        }

        let groupBy = timeRange?.groupBy || 'day';
        if (customRange) {
            const diffDays = Math.round((toDate - cutoffDate) / (1000 * 60 * 60 * 24));
            groupBy = diffDays > 60 ? 'month' : 'day';
        }

        const validTxs = transactions.filter(t => {
            const tDate = new Date(t.transactionDate);
            const inDate = tDate >= cutoffDate && tDate <= toDate;
            const inPayment = paymentFilter === 'All' || t.paymentMethod === paymentFilter;
            return inDate && inPayment;
        }).map(t => {
            const selling = Number(t.finalPrice || 0);
            const cost = Number(t.costPrice || t.variant?.acquisitionPrice || 0);
            return { ...t, date: new Date(t.transactionDate), profit: selling - cost, revenue: selling, cost };
        });

        const grouped = validTxs.reduce((acc, t) => {
            let groupKey;
            if (groupBy === 'month') groupKey = t.date.toLocaleString('en-PH', { month: 'short', year: 'numeric' });
            else if (groupBy === 'week') { const ws = getStartOfWeek(t.date); groupKey = ws.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }); }
            else groupKey = t.date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });

            if (!acc[groupKey]) acc[groupKey] = { name: groupKey, xDate: t.date.getTime(), revenue: 0, profit: 0, cost: 0, units: 0 };
            acc[groupKey].revenue += t.revenue;
            acc[groupKey].profit += t.profit;
            acc[groupKey].cost += t.cost;
            acc[groupKey].units += 1;
            return acc;
        }, {});

        const chartData = Object.values(grouped).sort((a, b) => a.xDate - b.xDate);

        const productMap = validTxs.reduce((acc, t) => {
            if (!t.variant?.product) return acc;
            const p = t.variant.product;
            const name = `${p.brandName} ${p.modelName} ${t.variant.color ? `(${t.variant.color})` : ''}`.trim();
            const key = t.variant.sku;
            if (!acc[key]) acc[key] = { name, sku: t.variant.sku, category: p.category || 'Uncategorized', units: 0, revenue: 0, profit: 0 };
            acc[key].units += 1;
            acc[key].revenue += t.revenue;
            acc[key].profit += t.profit;
            return acc;
        }, {});

        const filteredByCategory = categoryFilter === 'All'
            ? Object.values(productMap)
            : Object.values(productMap).filter(p => p.category === categoryFilter);

        const sortedProducts = filteredByCategory.sort((a, b) =>
            topFilter === 'profit' ? b.profit - a.profit || b.units - a.units : b.units - a.units || b.revenue - a.revenue
        );
        sortedProducts.forEach((p, idx) => { p.name = `#${idx + 1} ${p.name}`; });
        const topProducts = sortedProducts.slice(0, 50);

        // Derive unique categories from all products in range (unfiltered)
        const allCategories = ['All', ...Array.from(new Set(Object.values(productMap).map(p => p.category).filter(Boolean))).sort()];

        const totalRevenue = validTxs.reduce((s, t) => s + t.revenue, 0);
        const totalProfit = validTxs.reduce((s, t) => s + t.profit, 0);
        const totalCost = validTxs.reduce((s, t) => s + t.cost, 0);
        const totalUnits = validTxs.length;
        const avgMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

        return { chartData, topProducts, allCategories, summary: { revenue: totalRevenue, profit: totalProfit, cost: totalCost, units: totalUnits, margin: avgMargin } };
    }, [transactions, timeRange, topFilter, customRange, paymentFilter, categoryFilter]);

    const { chartData, topProducts, allCategories = ['All'], summary } = processedData;
    const paddleChartHeight = Math.max(400, topProducts.length * 40 + 50);

    return (
        <div className="flex flex-col h-full space-y-6 w-full">

            {/* Header & Controls */}
            <div className="flex flex-wrap justify-between items-center gap-4 shrink-0">
                <h2 className="text-2xl font-bold text-zinc-800 flex items-center gap-2">
                    <BarChart3 className="text-zinc-500" /> Performance Analytics
                </h2>

                <div className="flex items-center gap-2">
                    {/* Payment Method Filter */}
                    <PaymentFilter transactions={transactions} value={paymentFilter} onChange={setPaymentFilter} />

                    <div className="w-px h-5 bg-stone-200" />

                    {/* Time Range Presets */}
                    <div className="flex bg-white border border-stone-200 rounded-lg p-1 shadow-sm">
                        {TIME_RANGES.map(range => (
                            <button
                                key={range.id}
                                onClick={() => handlePresetSelect(range)}
                                className="px-4 py-1.5 text-xs font-bold rounded-md"
                                style={{
                                    backgroundColor: timeRange?.id === range.id ? '#09090b' : 'transparent',
                                    color: timeRange?.id === range.id ? '#ffffff' : '#71717a',
                                    transition: 'background-color 200ms ease, color 200ms ease',
                                }}
                            >
                                {range.label}
                            </button>
                        ))}
                    </div>

                    {/* Calendar */}
                    <div className="relative" ref={calendarRef}>
                        <button
                            onClick={() => setShowCalendar(v => !v)}
                            title="Select custom date range"
                            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border shadow-sm text-xs font-bold"
                            style={{
                                backgroundColor: customRange ? '#09090b' : '#ffffff',
                                color: customRange ? '#ffffff' : '#71717a',
                                borderColor: customRange ? '#09090b' : '#d6d3d1',
                                transition: 'background-color 200ms ease, color 200ms ease, border-color 200ms ease',
                            }}
                        >
                            <Calendar size={15} />
                            {customRange && <span className="max-w-[160px] truncate">{customRange.label}</span>}
                        </button>
                        {customRange && (
                            <button
                                onClick={(e) => { e.stopPropagation(); setCustomRange(null); setTimeRange(TIME_RANGES[2]); }}
                                className="absolute -top-1.5 -right-1.5 text-white rounded-full w-4 h-4 flex items-center justify-center"
                                style={{ backgroundColor: '#3f3f46', transition: 'background-color 150ms ease' }}
                                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#ef4444'}
                                onMouseLeave={e => e.currentTarget.style.backgroundColor = '#3f3f46'}
                            >
                                <X size={10} />
                            </button>
                        )}
                        {showCalendar && <CalendarPicker onApply={handleCalendarApply} onClose={() => setShowCalendar(false)} />}
                    </div>

                    <button onClick={fetchTransactions} disabled={loading}
                        className="p-2 ml-1 rounded-lg border border-stone-300 bg-white text-zinc-500 hover:bg-stone-50 disabled:opacity-40 shadow-sm transition-all">
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* Active payment filter badge */}
            {paymentFilter !== 'All' && (
                <div className="flex items-center gap-2 shrink-0" style={{ animation: 'fadeSlideIn 200ms ease' }}>
                    <span className="text-xs text-zinc-400">Filtered by payment:</span>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-zinc-100 text-zinc-700 text-xs font-bold rounded-full">
                        <CreditCard size={11} />
                        {paymentFilter}
                        <button onClick={() => setPaymentFilter('All')} className="ml-0.5 text-zinc-400 hover:text-red-500 transition-colors">
                            <X size={10} />
                        </button>
                    </span>
                </div>
            )}

            {error && (
                <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center gap-2 text-sm font-medium">
                    <AlertCircle size={18} /> {error}
                </div>
            )}

            {/* Top Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 shrink-0">
                <StatCard title="Total Revenue" value={loading ? '...' : <CurrencyDisplay value={summary.revenue} />} icon={<DollarSign size={20} className="text-emerald-600" />} bg="bg-emerald-50" />
                <StatCard title="Net Profit" value={loading ? '...' : <CurrencyDisplay value={summary.profit} />} icon={<TrendingUp size={20} className="text-blue-600" />} subtitle={summary.margin > 0 ? `${summary.margin.toFixed(1)}% margin` : null} bg="bg-blue-50" />
                <StatCard title="Total Cost of Goods" value={loading ? '...' : <CurrencyDisplay value={summary.cost} />} icon={<DollarSign size={20} className="text-amber-600" />} bg="bg-amber-50" />
                <StatCard title="Units Sold" value={loading ? '...' : summary.units?.toLocaleString()} icon={<Package size={20} className="text-purple-600" />} bg="bg-purple-50" />
            </div>

            {/* View Mode Toggle */}
            <div className="flex bg-stone-100 p-1 rounded-lg w-fit shrink-0">
                <button onClick={() => setMainTab('trends')} className={`px-5 py-2 text-sm font-bold rounded-md transition-all ${mainTab === 'trends' ? 'bg-white shadow text-zinc-900' : 'text-zinc-500 hover:text-zinc-700'}`}>Revenue Trends</button>
                <button onClick={() => setMainTab('paddles')} className={`px-5 py-2 text-sm font-bold rounded-md transition-all ${mainTab === 'paddles' ? 'bg-white shadow text-zinc-900' : 'text-zinc-500 hover:text-zinc-700'}`}>Product Rankings</button>
            </div>

            {/* Charts Area */}
            <div className="flex-1 min-h-[500px] flex flex-col pb-6">

                {mainTab === 'trends' && (
                    <div className="bg-white border border-stone-200 rounded-xl shadow-sm p-6 flex flex-col flex-1 h-full min-h-[400px]">
                        <h3 className="text-base font-bold text-zinc-800 mb-6 flex items-center gap-2 flex-wrap">
                            <TrendingUp size={18} className="text-blue-500" /> Revenue & Profit Trends
                            {customRange && <span className="text-xs font-normal text-zinc-400 bg-stone-100 px-2 py-0.5 rounded-full">{customRange.label}</span>}
                            {paymentFilter !== 'All' && <span className="text-xs font-normal text-zinc-400 bg-stone-100 px-2 py-0.5 rounded-full flex items-center gap-1"><CreditCard size={10} /> {paymentFilter}</span>}
                        </h3>
                        {loading ? (
                            <div className="flex-1 flex items-center justify-center text-zinc-400"><RefreshCw size={24} className="animate-spin" /></div>
                        ) : chartData.length === 0 ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-zinc-400">
                                <BarChart3 size={32} className="opacity-20 mb-3" />
                                <p>No sales data found{paymentFilter !== 'All' ? ` for ${paymentFilter}` : ''} in this period.</p>
                            </div>
                        ) : (
                            <div className="flex-1 w-full min-h-0">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                        <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#71717a' }} tickLine={false} axisLine={false} dy={10} />
                                        <YAxis tickFormatter={(val) => `₱${(val / 1000).toFixed(0)}k`} tick={{ fontSize: 12, fill: '#71717a' }} tickLine={false} axisLine={false} />
                                        <RechartsTooltip cursor={{ fill: '#f4f4f5' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} formatter={(value) => [formatCurrency(value)]} />
                                        <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '13px' }} iconType="circle" />
                                        <Bar dataKey="revenue" name="Total Revenue" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={50} />
                                        <Bar dataKey="profit" name="Net Profit" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={50} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </div>
                )}

                {mainTab === 'paddles' && (
                    <div className="bg-white border border-stone-200 rounded-xl shadow-sm p-6 flex flex-col flex-1 h-full min-h-[400px]">
                        <div className="flex items-center justify-between mb-3 shrink-0">
                            <h3 className="text-base font-bold text-zinc-800 flex items-center gap-2 flex-wrap">
                                <Trophy size={18} className="text-amber-500" /> Product Rankings
                                {customRange && <span className="text-xs font-normal text-zinc-400 bg-stone-100 px-2 py-0.5 rounded-full">{customRange.label}</span>}
                                {paymentFilter !== 'All' && <span className="text-xs font-normal text-zinc-400 bg-stone-100 px-2 py-0.5 rounded-full flex items-center gap-1"><CreditCard size={10} /> {paymentFilter}</span>}
                            </h3>
                            <div className="flex bg-stone-100 p-1 rounded-lg">
                                <button onClick={() => setTopFilter('units')} className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${topFilter === 'units' ? 'bg-white shadow text-zinc-900' : 'text-zinc-500 hover:text-zinc-700'}`}>By Sales Vol.</button>
                                <button onClick={() => setTopFilter('profit')} className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${topFilter === 'profit' ? 'bg-white shadow text-zinc-900' : 'text-zinc-500 hover:text-zinc-700'}`}>By Net Profit</button>
                            </div>
                        </div>

                        {/* Category tabs */}
                        <div className="flex items-center gap-2 mb-4 shrink-0 flex-wrap">
                            {allCategories.map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => setCategoryFilter(cat)}
                                    className="px-3 py-1 rounded-full text-xs font-bold border"
                                    style={{
                                        backgroundColor: categoryFilter === cat ? '#09090b' : '#ffffff',
                                        color: categoryFilter === cat ? '#ffffff' : '#52525b',
                                        borderColor: categoryFilter === cat ? '#09090b' : '#d6d3d1',
                                        transition: 'background-color 200ms ease, color 200ms ease, border-color 200ms ease',
                                    }}
                                >
                                    {cat}
                                    {cat !== 'All' && (
                                        <span
                                            className="ml-1.5 px-1.5 py-0.5 rounded-full text-xs"
                                            style={{
                                                backgroundColor: categoryFilter === cat ? 'rgba(255,255,255,0.2)' : '#f5f5f4',
                                                color: categoryFilter === cat ? '#ffffff' : '#71717a',
                                                transition: 'background-color 200ms ease, color 200ms ease',
                                            }}
                                        >
                                            {topProducts.filter(p => categoryFilter === cat
                                                ? true  // already filtered
                                                : p.category === cat
                                            ).length || ''}
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>

                        <p className="text-xs text-zinc-500 mb-4 shrink-0">
                            Showing {topProducts.length} {categoryFilter !== 'All' ? `${categoryFilter} ` : ''}products sold during this period
                        </p>

                        {loading ? (
                            <div className="flex-1 flex items-center justify-center text-zinc-400"><RefreshCw size={24} className="animate-spin" /></div>
                        ) : topProducts.length === 0 ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-zinc-400">
                                <Package size={32} className="opacity-20 mb-3" />
                                <p className="text-sm">No products sold{paymentFilter !== 'All' ? ` via ${paymentFilter}` : ''} in this period.</p>
                            </div>
                        ) : (
                            <div className="flex-1 w-full overflow-y-auto min-h-0 pt-2 pr-4">
                                <div style={{ height: paddleChartHeight }} className="w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={topProducts} layout="vertical" margin={{ top: 0, right: 60, left: 0, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e5e7eb" />
                                            <XAxis type="number" hide />
                                            <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11, fill: '#71717a' }} tickLine={false} axisLine={false} />
                                            <RechartsTooltip cursor={{ fill: '#f4f4f5' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} formatter={(value) => topFilter === 'profit' ? [formatCurrency(value)] : [value]} />
                                            <Bar dataKey={topFilter === 'profit' ? 'profit' : 'units'} name={topFilter === 'profit' ? 'Net Profit' : 'Units Sold'} fill={topFilter === 'profit' ? '#3b82f6' : '#f59e0b'} radius={[0, 4, 4, 0]} barSize={24}>
                                                <LabelList dataKey={topFilter === 'profit' ? 'profit' : 'units'} position="right" fill={topFilter === 'profit' ? '#3b82f6' : '#f59e0b'} fontSize={12} fontWeight="bold" formatter={(val) => topFilter === 'profit' ? formatCurrency(val) : `${val} units`} />
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <style>{`
                @keyframes fadeSlideIn {
                    from { opacity: 0; transform: translateY(4px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
};

const StatCard = ({ title, value, icon, subtitle, bg }) => (
    <div className="bg-white border border-stone-200 rounded-xl shadow-sm p-5 flex items-start gap-4">
        <div className={`p-3 rounded-xl ${bg}`}>{icon}</div>
        <div>
            <p className="text-sm font-bold text-zinc-500 mb-1">{title}</p>
            <h4 className="text-2xl font-normal text-zinc-900 tracking-tight">{value}</h4>
            {subtitle && <p className="text-xs font-bold text-zinc-400 mt-1">{subtitle}</p>}
        </div>
    </div>
);

export default Analytics;