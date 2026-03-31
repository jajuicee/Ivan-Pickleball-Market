import React, { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import {
    Receipt, Plus, Trash2, Calendar, X, ChevronLeft, ChevronRight,
    AlertCircle, RefreshCw, Search, ChevronDown, DollarSign, TrendingUp, TrendingDown, Wallet
} from 'lucide-react';

const CATEGORIES = ['Miscellaneous', 'Bills', 'Supplies', 'Salary'];

const CATEGORY_COLORS = {
    'Miscellaneous': { bg: '#f5f5f4', text: '#57534e', dot: '#a8a29e' },
    'Bills':         { bg: '#fef3c7', text: '#92400e', dot: '#f59e0b' },
    'Supplies':      { bg: '#dbeafe', text: '#1e40af', dot: '#3b82f6' },
    'Salary':        { bg: '#dcfce7', text: '#166534', dot: '#22c55e' },
};

const formatCurrency = (val) =>
    `₱${Number(val ?? 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatDate = (iso) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

// ── Date helpers ─────────────────────────────────────────────────────────────
const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const endOfDay   = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
const isSameDay  = (a, b) => a && b && a.toDateString() === b.toDateString();
const isInRange  = (date, start, end) => {
    if (!start || !end) return false;
    const t = date.getTime();
    return t > Math.min(start.getTime(), end.getTime()) && t < Math.max(start.getTime(), end.getTime());
};

const TIME_RANGES = [
    { id: 'TODAY', label: 'Today' },
    { id: '1W',  label: 'This Week' },
    { id: '1M',  label: 'This Month' },
    { id: '1Y',  label: 'This Year' },
];

const getRangeForPreset = (id) => {
    const now = new Date();
    switch (id) {
        case 'TODAY': return { start: startOfDay(now), end: endOfDay(now) };
        case '1W': {
            const ws = new Date(now);
            ws.setDate(now.getDate() - now.getDay());
            return { start: startOfDay(ws), end: endOfDay(now) };
        }
        case '1M': return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: endOfDay(now) };
        case '1Y': return { start: new Date(now.getFullYear(), 0, 1), end: endOfDay(now) };
        default:   return { start: startOfDay(now), end: endOfDay(now) };
    }
};

// ── Calendar Picker ───────────────────────────────────────────────────────────
const MONTHS    = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const WEEK_DAYS = ['Su','Mo','Tu','We','Th','Fr','Sa'];

const CalendarPicker = ({ onApply, onClose, visible }) => {
    const today = new Date();
    const [viewYear,  setViewYear]  = useState(today.getFullYear());
    const [viewMonth, setViewMonth] = useState(today.getMonth());
    const [startDate, setStartDate] = useState(null);
    const [endDate,   setEndDate]   = useState(null);
    const [hoverDate, setHoverDate] = useState(null);

    const getDays  = (y, m) => new Date(y, m + 1, 0).getDate();
    const getFirst = (y, m) => new Date(y, m, 1).getDay();
    const prevMonth = () => { if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y-1); } else setViewMonth(m => m-1); };
    const nextMonth = () => { if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y+1); } else setViewMonth(m => m+1); };

    const handleDay = (day) => {
        const c = new Date(viewYear, viewMonth, day);
        if (!startDate || (startDate && endDate)) { setStartDate(c); setEndDate(null); }
        else { if (c < startDate) { setEndDate(startDate); setStartDate(c); } else setEndDate(c); }
    };

    const daysInMonth = getDays(viewYear, viewMonth);
    const firstDay    = getFirst(viewYear, viewMonth);
    const label = (d) => d ? d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

    return (
        <div
            className="absolute right-0 top-12 z-50 bg-white border border-stone-200 rounded-2xl shadow-2xl p-5 w-80"
            style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateY(0) scale(1)' : 'translateY(-8px) scale(0.97)', transition: 'opacity 180ms ease, transform 180ms ease', pointerEvents: visible ? 'all' : 'none' }}
        >
            <div className="flex items-center justify-between mb-4">
                <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-stone-100 text-zinc-500"><ChevronLeft size={16} /></button>
                <span className="text-sm font-bold text-zinc-800">{MONTHS[viewMonth]} {viewYear}</span>
                <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-stone-100 text-zinc-500"><ChevronRight size={16} /></button>
            </div>
            <div className="grid grid-cols-7 mb-1">
                {WEEK_DAYS.map(d => <div key={d} className="text-center text-xs font-bold text-zinc-400 py-1">{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-y-1">
                {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} />)}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                    const day = i + 1;
                    const date = new Date(viewYear, viewMonth, day);
                    const isStart = isSameDay(date, startDate);
                    const isEnd   = isSameDay(date, endDate);
                    const inRange = isInRange(date, startDate, endDate || hoverDate);
                    const isToday = isSameDay(date, today);
                    const isFuture = date > today;
                    return (
                        <button key={day} disabled={isFuture} onClick={() => handleDay(day)}
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
                    <div><span className="block font-bold text-zinc-400 mb-0.5">FROM</span><span className="text-zinc-700 font-semibold">{label(startDate)}</span></div>
                    <div className="text-right"><span className="block font-bold text-zinc-400 mb-0.5">TO</span><span className="text-zinc-700 font-semibold">{label(endDate)}</span></div>
                </div>
                <div className="flex gap-2">
                    <button onClick={onClose} className="flex-1 py-2 text-xs font-bold rounded-lg border border-stone-200 text-zinc-500 hover:bg-stone-50">Cancel</button>
                    <button onClick={() => startDate && endDate && onApply(startDate, endDate)} disabled={!startDate || !endDate} className="flex-1 py-2 text-xs font-bold rounded-lg bg-zinc-950 text-white disabled:opacity-30 hover:bg-zinc-800">Apply Range</button>
                </div>
            </div>
        </div>
    );
};

// ── Add Expense Modal ─────────────────────────────────────────────────────────
const AddExpenseModal = ({ onSave, onClose }) => {
    const [form, setForm] = useState({ name: '', category: 'Miscellaneous', cost: '', note: '' });
    const [saving, setSaving] = useState(false);
    const [err, setErr] = useState('');

    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const handleSubmit = async () => {
        if (!form.name.trim()) return setErr('Expense name is required.');
        if (!form.cost || isNaN(Number(form.cost)) || Number(form.cost) <= 0) return setErr('Enter a valid cost.');
        setSaving(true); setErr('');
        try {
            await onSave({ ...form, cost: Number(form.cost) });
            onClose();
        } catch {
            setErr('Failed to save expense. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-zinc-950/60 z-[200] flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}
            style={{ animation: 'fadeSlideIn 180ms ease' }}>
            <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md border border-stone-200" onClick={e => e.stopPropagation()}>
                <div className="flex items-center gap-3 mb-5 pb-4 border-b border-stone-100">
                    <div className="p-2 bg-stone-100 rounded-xl"><Receipt size={18} className="text-zinc-700" /></div>
                    <h3 className="text-base font-bold text-zinc-800">Add Expense</h3>
                </div>

                {err && (
                    <div className="flex items-center gap-2 p-3 mb-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs font-medium">
                        <AlertCircle size={14} /> {err}
                    </div>
                )}

                <div className="space-y-4">
                    {/* Name */}
                    <div>
                        <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Expense Name *</label>
                        <input
                            type="text" autoFocus value={form.name} onChange={e => set('name', e.target.value)}
                            placeholder="e.g. Internet Bill, Office Supplies…"
                            className="w-full px-3 py-2.5 text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-300 text-zinc-800"
                        />
                    </div>

                    {/* Category */}
                    <div>
                        <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Category *</label>
                        <div className="relative">
                            <select
                                value={form.category} onChange={e => set('category', e.target.value)}
                                className="w-full appearance-none px-3 py-2.5 text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-300 text-zinc-800 bg-white pr-9"
                            >
                                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                            <ChevronDown size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                        </div>
                    </div>

                    {/* Cost */}
                    <div>
                        <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Cost (₱) *</label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-sm font-medium">₱</span>
                            <input
                                type="number" min="0" step="0.01" value={form.cost} onChange={e => set('cost', e.target.value)}
                                placeholder="0.00"
                                className="w-full pl-7 pr-3 py-2.5 text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-300 text-zinc-800"
                            />
                        </div>
                    </div>

                    {/* Note */}
                    <div>
                        <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Note <span className="font-normal normal-case text-zinc-400">(optional)</span></label>
                        <textarea
                            value={form.note} onChange={e => set('note', e.target.value)}
                            placeholder="Any additional details…" rows={2}
                            className="w-full px-3 py-2.5 text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-300 text-zinc-800 resize-none"
                        />
                    </div>
                </div>

                <div className="flex gap-3 mt-6">
                    <button onClick={onClose} className="flex-1 py-2.5 text-sm font-bold rounded-xl border border-stone-200 text-zinc-500 hover:bg-stone-50 transition-colors">Cancel</button>
                    <button onClick={handleSubmit} disabled={saving} className="flex-1 py-2.5 text-sm font-bold rounded-xl bg-zinc-950 text-white hover:bg-zinc-800 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
                        {saving ? <RefreshCw size={14} className="animate-spin" /> : <Plus size={14} />}
                        {saving ? 'Saving…' : 'Add Expense'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// ── Main Component ────────────────────────────────────────────────────────────
const Expenses = () => {
    const [expenses, setExpenses]   = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading]     = useState(true);
    const [error,   setError]       = useState('');
    const [catFilter, setCatFilter] = useState('All');
    const [searchQuery, setSearch]  = useState('');
    const [showAdd,   setShowAdd]   = useState(false);
    const [deletingId, setDeleting] = useState(null);

    const [activePreset, setActivePreset] = useState('1M');
    const [customRange,  setCustomRange]  = useState(null);
    const [showCal,      setShowCal]      = useState(false);
    const calRef = useRef(null);

    useEffect(() => {
        const handler = (e) => { if (calRef.current && !calRef.current.contains(e.target)) setShowCal(false); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const fetchData = () => {
        setLoading(true); setError('');
        Promise.all([
            axios.get(`http://${window.location.hostname}:8080/api/expenses`),
            axios.get(`http://${window.location.hostname}:8080/api/transactions`)
        ]).then(([resExp, resTx]) => {
            setExpenses(Array.isArray(resExp.data) ? resExp.data : []);
            setTransactions(Array.isArray(resTx.data) ? resTx.data : []);
        }).catch(() => {
            setError('Could not load data. Is the backend running?');
        }).finally(() => setLoading(false));
    };

    useEffect(() => { fetchData(); }, []);

    const handleAdd = async (data) => {
        const res = await axios.post(`http://${window.location.hostname}:8080/api/expenses`, data);
        setExpenses(prev => [res.data, ...prev]);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this expense?')) return;
        setDeleting(id);
        try {
            await axios.delete(`http://${window.location.hostname}:8080/api/expenses/${id}`);
            setExpenses(prev => prev.filter(e => e.id !== id));
        } catch {
            setError('Failed to delete expense.');
        } finally {
            setDeleting(null);
        }
    };

    const handlePresetSelect = (id) => { setActivePreset(id); setCustomRange(null); setShowCal(false); };
    const handleCalApply = (start, end) => {
        const label = `${start.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}`;
        setCustomRange({ start, end, label });
        setActivePreset(null);
        setShowCal(false);
    };

    const dateWindow = useMemo(() => {
        if (customRange) return { start: customRange.start, end: endOfDay(customRange.end) };
        if (activePreset) return getRangeForPreset(activePreset);
        return null;
    }, [activePreset, customRange]);

    const filtered = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        return expenses.filter(e => {
            const d = new Date(e.expenseDate);
            const inDate = !dateWindow || (d >= dateWindow.start && d <= dateWindow.end);
            const inCat  = catFilter === 'All' || e.category === catFilter;
            const inQ    = !q || e.name?.toLowerCase().includes(q) || e.note?.toLowerCase().includes(q);
            return inDate && inCat && inQ;
        });
    }, [expenses, dateWindow, catFilter, searchQuery]);

    const totals = useMemo(() => {
        const byCategory = {};
        CATEGORIES.forEach(c => { byCategory[c] = 0; });
        let total = 0;
        filtered.forEach(e => {
            total += Number(e.cost ?? 0);
            if (byCategory[e.category] !== undefined) byCategory[e.category] += Number(e.cost ?? 0);
        });
        return { total, byCategory };
    }, [filtered]);

    const txTotals = useMemo(() => {
        let income = 0;
        transactions.forEach(t => {
            const d = new Date(t.transactionDate);
            if (!dateWindow || (d >= dateWindow.start && d <= dateWindow.end)) {
                income += Number(t.finalPrice || 0);
            }
        });
        return { income };
    }, [transactions, dateWindow]);

    const currentMoney = txTotals.income - totals.total;

    const periodLabel = customRange ? customRange.label
        : activePreset === 'TODAY' ? "Today" : activePreset === '1W' ? 'This Week'
        : activePreset === '1M' ? 'This Month' : 'This Year';

    return (
        <div className="flex flex-col lg:h-full">
            <style>{`
                @keyframes fadeSlideIn {
                    from { opacity: 0; transform: translateY(5px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
            `}</style>

            {/* ── Header ── */}
            <div className="flex items-baseline gap-3 mb-3 shrink-0">
                <h2 className="text-2xl font-bold text-zinc-800 flex items-center gap-2 shrink-0">
                    <Receipt className="text-zinc-500" size={22} /> Expenses
                </h2>
                <span className="text-base font-semibold text-zinc-500" style={{ opacity: loading ? 0 : 1, transition: 'opacity 300ms ease' }}>
                    <span className="text-zinc-700">{filtered.length} records</span>
                    <span className="mx-2 text-zinc-300">·</span>
                    <span>{periodLabel}</span>
                </span>
            </div>

            {/* ── Controls ── */}
            <div className="flex items-center gap-2 mb-4 shrink-0 flex-wrap">
                {/* Search */}
                <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                    <input type="text" value={searchQuery} onChange={e => setSearch(e.target.value)} placeholder="Search expenses…"
                        className="pl-8 pr-8 py-2 text-xs font-medium rounded-lg border border-stone-300 bg-white shadow-sm text-zinc-700 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-300 w-48" />
                    {searchQuery && (
                        <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700">
                            <X size={13} />
                        </button>
                    )}
                </div>

                {/* Category filter tabs */}
                {['All', ...CATEGORIES].map(cat => {
                    const color = CATEGORY_COLORS[cat];
                    const isActive = catFilter === cat;
                    return (
                        <button key={cat} onClick={() => setCatFilter(cat)}
                            className="px-3 py-1.5 rounded-full text-xs font-bold border transition-all duration-200"
                            style={{
                                backgroundColor: isActive ? '#09090b' : (color?.bg || '#fff'),
                                color:           isActive ? '#fff' : (color?.text || '#52525b'),
                                borderColor:     isActive ? '#09090b' : '#d6d3d1',
                            }}>
                            {cat}
                        </button>
                    );
                })}

                <div className="flex-1" />

                {/* Time range presets */}
                <div className="flex bg-white border border-stone-200 rounded-lg p-1 shadow-sm">
                    {TIME_RANGES.map(r => (
                        <button key={r.id} onClick={() => handlePresetSelect(r.id)}
                            className="px-3 py-1.5 text-xs font-bold rounded-md"
                            style={{
                                backgroundColor: activePreset === r.id && !customRange ? '#09090b' : 'transparent',
                                color:           activePreset === r.id && !customRange ? '#ffffff' : '#71717a',
                                transition: 'background-color 200ms ease, color 200ms ease',
                            }}>
                            {r.label}
                        </button>
                    ))}
                </div>

                {/* Calendar */}
                <div className="relative" ref={calRef}>
                    <button onClick={() => setShowCal(v => !v)} title="Custom date range"
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg border shadow-sm text-xs font-bold"
                        style={{ backgroundColor: customRange ? '#09090b' : '#fff', color: customRange ? '#fff' : '#71717a', borderColor: customRange ? '#09090b' : '#d6d3d1', transition: 'all 200ms ease' }}>
                        <Calendar size={15} />
                        {customRange && <span className="max-w-[160px] truncate">{customRange.label}</span>}
                    </button>
                    {customRange && (
                        <button onClick={(e) => { e.stopPropagation(); setCustomRange(null); setActivePreset('1M'); }}
                            className="absolute -top-1.5 -right-1.5 text-white rounded-full w-4 h-4 flex items-center justify-center"
                            style={{ backgroundColor: '#3f3f46' }}
                            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#ef4444'}
                            onMouseLeave={e => e.currentTarget.style.backgroundColor = '#3f3f46'}>
                            <X size={10} />
                        </button>
                    )}
                    <CalendarPicker visible={showCal} onApply={handleCalApply} onClose={() => setShowCal(false)} />
                </div>

                {/* Refresh */}
                <button onClick={fetchData} disabled={loading} className="p-2 rounded-lg border border-stone-300 bg-white text-zinc-500 disabled:opacity-40 shadow-sm hover:bg-stone-50">
                    <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
                </button>

                {/* Add Expense */}
                <button onClick={() => setShowAdd(true)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold text-white shadow-sm"
                    style={{ backgroundColor: '#09090b', transition: 'background-color 150ms ease' }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#27272a'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = '#09090b'}>
                    <Plus size={14} /> Add Expense
                </button>
            </div>

            {error && (
                <div className="flex items-center gap-2 p-3 mb-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm shrink-0">
                    <AlertCircle size={16} /> {error}
                </div>
            )}

            {/* ── Summary Cards ── */}
            <div className="grid grid-cols-2 lg:grid-cols-8 gap-3 mb-4 shrink-0">
                {/* Cash Flow Main Cards */}
                <div className="col-span-2 lg:col-span-2 grid grid-cols-2 gap-3">
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl shadow-sm p-4 flex flex-col justify-center">
                        <p className="text-[10px] font-black text-emerald-800 uppercase tracking-wider mb-1 flex items-center gap-1.5"><TrendingUp size={14}/> Income</p>
                        <p className="text-xl font-black text-emerald-700 tracking-tight">{formatCurrency(txTotals.income)}</p>
                    </div>
                    <div className="bg-red-50 border border-red-200 rounded-xl shadow-sm p-4 flex flex-col justify-center">
                        <p className="text-[10px] font-black text-red-800 uppercase tracking-wider mb-1 flex items-center gap-1.5"><TrendingDown size={14}/> Expenses</p>
                        <p className="text-xl font-black text-red-700 tracking-tight">{formatCurrency(totals.total)}</p>
                    </div>
                </div>

                <div className="col-span-2 lg:col-span-2 bg-zinc-950 border border-zinc-900 rounded-xl shadow-md p-4 flex flex-col justify-center relative overflow-hidden">
                    <div className="absolute -right-4 -bottom-4 opacity-10"><Wallet size={100} /></div>
                    <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1 flex items-center gap-1.5 relative z-10"><DollarSign size={14}/> Current Money</p>
                    <p className="text-3xl font-black text-white tracking-tight relative z-10">{formatCurrency(currentMoney)}</p>
                </div>

                {/* Categories Breakdown */}
                {CATEGORIES.map(cat => {
                    const c = CATEGORY_COLORS[cat];
                    return (
                        <div key={cat} className="col-span-1 lg:col-span-1 bg-white border border-stone-200 rounded-xl shadow-sm p-3 flex flex-col">
                            <div className="flex items-center gap-1.5 mb-2">
                                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: c.dot }} />
                                <p className="text-[10px] font-black text-zinc-500 uppercase truncate">{cat}</p>
                            </div>
                            <p className="text-sm font-black text-zinc-800 tracking-tight mt-auto">{formatCurrency(totals.byCategory[cat])}</p>
                        </div>
                    );
                })}
            </div>

            {/* ── Table ── */}
            <div className="flex-1 min-h-0 overflow-auto bg-white border border-stone-200 rounded-xl shadow-sm">
                <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-stone-100 z-10 text-xs uppercase tracking-wider text-zinc-500 font-bold border-b border-stone-200 shadow-sm">
                        <tr>
                            <th className="px-5 py-4">Name</th>
                            <th className="px-5 py-4">Category</th>
                            <th className="px-5 py-4 text-right">Cost</th>
                            <th className="px-5 py-4">Date</th>
                            <th className="px-5 py-4">Note</th>
                            <th className="px-5 py-4"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 text-sm">
                        {loading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <tr key={i} className="animate-pulse">
                                    {Array.from({ length: 6 }).map((_, j) => (
                                        <td key={j} className="px-5 py-4"><div className="h-4 bg-stone-200 rounded w-3/4" /></td>
                                    ))}
                                </tr>
                            ))
                        ) : filtered.length === 0 ? (
                            <tr>
                                <td colSpan="6" className="px-5 py-16 text-center text-zinc-400">
                                    <Receipt size={32} className="mx-auto mb-3 opacity-20" />
                                    <p className="font-medium">No expenses found for this period.</p>
                                    <p className="text-xs mt-1 text-zinc-300">Click "Add Expense" to record one.</p>
                                </td>
                            </tr>
                        ) : filtered.map((exp, idx) => {
                            const c = CATEGORY_COLORS[exp.category] || CATEGORY_COLORS['Miscellaneous'];
                            return (
                                <tr key={exp.id}
                                    style={{ animation: 'fadeSlideIn 220ms ease both', animationDelay: `${Math.min(idx * 20, 250)}ms`, transition: 'background-color 150ms ease' }}
                                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#fafaf9'}
                                    onMouseLeave={e => e.currentTarget.style.backgroundColor = ''}>
                                    <td className="px-5 py-4 font-semibold text-zinc-800">{exp.name}</td>
                                    <td className="px-5 py-4">
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold"
                                            style={{ backgroundColor: c.bg, color: c.text }}>
                                            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: c.dot }} />
                                            {exp.category}
                                        </span>
                                    </td>
                                    <td className="px-5 py-4 text-right font-mono font-black text-zinc-900">{formatCurrency(exp.cost)}</td>
                                    <td className="px-5 py-4 text-xs text-zinc-500">{formatDate(exp.expenseDate)}</td>
                                    <td className="px-5 py-4 text-zinc-600 max-w-xs truncate text-xs">{exp.note || '—'}</td>
                                    <td className="px-5 py-4">
                                        <button onClick={() => handleDelete(exp.id)} disabled={deletingId === exp.id}
                                            className="p-1.5 rounded-lg text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40"
                                            title="Delete expense">
                                            {deletingId === exp.id ? <RefreshCw size={14} className="animate-spin" /> : <Trash2 size={14} />}
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* ── Add Expense Modal ── */}
            {showAdd && <AddExpenseModal onSave={handleAdd} onClose={() => setShowAdd(false)} />}
        </div>
    );
};

export default Expenses;
