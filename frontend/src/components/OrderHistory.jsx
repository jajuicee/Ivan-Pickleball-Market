import React, { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import {
    History, CheckCircle2, Clock, CreditCard,
    AlertCircle, Loader2, RefreshCw, ChevronDown, Package,
    Calendar, X, ChevronLeft, ChevronRight, Search, MessageSquare, XCircle, Pen
} from 'lucide-react';

const STATUS_ALL = 'ALL';
const STATUS_FULL = 'FULL';
const STATUS_PARTIAL = 'PARTIAL';
const STATUS_UNPAID = 'UNPAID';

const formatDate = (iso) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleString('en-PH', {
        month: 'short', day: 'numeric', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
};

const formatCurrency = (val) =>
    val != null ? `₱${Number(val).toLocaleString('en-PH', { minimumFractionDigits: 2 })}` : '—';

// ── Date helpers ─────────────────────────────────────────────────────────────
const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const endOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
const isSameDay = (a, b) => a && b && a.toDateString() === b.toDateString();
const isInRange = (date, start, end) => {
    if (!start || !end) return false;
    const t = date.getTime();
    return t > Math.min(start.getTime(), end.getTime()) && t < Math.max(start.getTime(), end.getTime());
};

const TIME_RANGES = [
    { id: 'TODAY', label: 'Today' },
    { id: '1W', label: 'This Week' },
    { id: '1M', label: 'This Month' },
    { id: '1Y', label: 'This Year' },
];

const getRangeForPreset = (id) => {
    const now = new Date();
    switch (id) {
        case 'TODAY': return { start: startOfDay(now), end: endOfDay(now) };
        case '1W': {
            const weekStart = new Date(now);
            weekStart.setDate(now.getDate() - now.getDay());
            return { start: startOfDay(weekStart), end: endOfDay(now) };
        }
        case '1M': return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: endOfDay(now) };
        case '1Y': return { start: new Date(now.getFullYear(), 0, 1), end: endOfDay(now) };
        default: return { start: startOfDay(now), end: endOfDay(now) };
    }
};

// ── Calendar Date Range Picker ───────────────────────────────────────────────
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEK_DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

const CalendarPicker = ({ onApply, onClose, visible }) => {
    const today = new Date();
    const [viewYear, setViewYear] = useState(today.getFullYear());
    const [viewMonth, setViewMonth] = useState(today.getMonth());
    const [startDate, setStartDate] = useState(null);
    const [endDate, setEndDate] = useState(null);
    const [hoverDate, setHoverDate] = useState(null);

    const getDaysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
    const getFirstDayOfMonth = (y, m) => new Date(y, m, 1).getDay();

    const prevMonth = () => {
        if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
        else setViewMonth(m => m - 1);
    };
    const nextMonth = () => {
        if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
        else setViewMonth(m => m + 1);
    };

    const handleDayClick = (day) => {
        const clicked = new Date(viewYear, viewMonth, day);
        if (!startDate || (startDate && endDate)) {
            setStartDate(clicked); setEndDate(null);
        } else {
            if (clicked < startDate) { setEndDate(startDate); setStartDate(clicked); }
            else setEndDate(clicked);
        }
    };

    const daysInMonth = getDaysInMonth(viewYear, viewMonth);
    const firstDay = getFirstDayOfMonth(viewYear, viewMonth);
    const formatLabel = (d) => d ? d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

    return (
        <div
            className="absolute right-0 top-12 z-50 bg-white border border-stone-200 rounded-2xl shadow-2xl p-5 w-80"
            style={{
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0) scale(1)' : 'translateY(-8px) scale(0.97)',
                transition: 'opacity 180ms ease, transform 180ms ease',
                pointerEvents: visible ? 'all' : 'none',
            }}
        >
            <div className="flex items-center justify-between mb-4">
                <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-stone-100 text-zinc-500 transition-colors duration-150">
                    <ChevronLeft size={16} />
                </button>
                <span className="text-sm font-bold text-zinc-800">{MONTHS[viewMonth]} {viewYear}</span>
                <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-stone-100 text-zinc-500 transition-colors duration-150">
                    <ChevronRight size={16} />
                </button>
            </div>

            <div className="grid grid-cols-7 mb-1">
                {WEEK_DAYS.map(d => (
                    <div key={d} className="text-center text-xs font-bold text-zinc-400 py-1">{d}</div>
                ))}
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
                        <button
                            key={day}
                            disabled={isFuture}
                            onClick={() => handleDayClick(day)}
                            onMouseEnter={() => setHoverDate(date)}
                            onMouseLeave={() => setHoverDate(null)}
                            className={`
                                text-xs font-medium py-2 rounded-lg
                                ${isFuture ? 'text-zinc-300 cursor-not-allowed' : 'cursor-pointer'}
                                ${isStart || isEnd ? 'bg-zinc-950 text-white font-bold' : ''}
                                ${inRange && !isStart && !isEnd ? 'bg-zinc-100 text-zinc-700 rounded-none' : ''}
                                ${!isStart && !isEnd && !inRange && !isFuture ? 'hover:bg-stone-100 text-zinc-700' : ''}
                                ${isToday && !isStart && !isEnd ? 'ring-1 ring-zinc-300' : ''}
                            `}
                            style={{ transition: 'background-color 100ms ease, color 100ms ease' }}
                        >
                            {day}
                        </button>
                    );
                })}
            </div>

            <div className="mt-4 pt-4 border-t border-stone-100">
                <div className="flex justify-between text-xs text-zinc-500 mb-3">
                    <div>
                        <span className="block font-bold text-zinc-400 mb-0.5">FROM</span>
                        <span className="text-zinc-700 font-semibold">{formatLabel(startDate)}</span>
                    </div>
                    <div className="text-right">
                        <span className="block font-bold text-zinc-400 mb-0.5">TO</span>
                        <span className="text-zinc-700 font-semibold">{formatLabel(endDate)}</span>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button onClick={onClose} className="flex-1 py-2 text-xs font-bold rounded-lg border border-stone-200 text-zinc-500 hover:bg-stone-50 transition-all duration-150">
                        Cancel
                    </button>
                    <button
                        onClick={() => startDate && endDate && onApply(startDate, endDate)}
                        disabled={!startDate || !endDate}
                        className="flex-1 py-2 text-xs font-bold rounded-lg bg-zinc-950 text-white disabled:opacity-30 hover:bg-zinc-800 transition-all duration-150"
                    >
                        Apply Range
                    </button>
                </div>
            </div>
        </div>
    );
};

// ── Payment Method Filter Dropdown ──────────────────────────────────────────

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
                className="absolute left-0 top-10 z-50 bg-white border border-stone-200 rounded-xl shadow-2xl py-1.5 min-w-[160px]"
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

// ── Edit Payment Modal (fixed, appears above everything) ─────────────────────
const EditPaymentModal = ({ group, methods, onSave, onClose }) => {
    const [value, setValue] = useState(group.paymentMethod || '');
    const [custom, setCustom] = useState(
        methods.includes(group.paymentMethod) ? '' : (group.paymentMethod || '')
    );
    const [isCustom, setIsCustom] = useState(!methods.includes(group.paymentMethod));

    const handleSubmit = () => {
        const final = isCustom ? custom.trim() : value;
        if (final) onSave(final);
    };

    return (
        <div
            className="fixed inset-0 bg-zinc-950/50 z-[200] flex items-center justify-center p-4 backdrop-blur-sm"
            onClick={onClose}
            style={{ animation: 'fadeSlideIn 150ms ease' }}
        >
            <div
                className="bg-white rounded-2xl shadow-2xl p-5 w-64 border border-stone-200"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-stone-100">
                    <CreditCard size={16} className="text-zinc-500" />
                    <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-700">Change Payment</h3>
                </div>
                <div className="flex flex-col gap-1 mb-3">
                    {methods.map(m => (
                        <button
                            key={m}
                            onClick={() => { setValue(m); setIsCustom(false); }}
                            className="text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-2"
                            style={{
                                backgroundColor: value === m && !isCustom ? '#09090b' : '#f5f5f4',
                                color: value === m && !isCustom ? '#fff' : '#3f3f46',
                                transition: 'background-color 120ms ease, color 120ms ease',
                            }}
                        >
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${value === m && !isCustom ? 'bg-white' : 'bg-transparent'}`} />
                            {m}
                        </button>
                    ))}
                    <button
                        onClick={() => { setIsCustom(true); setValue(''); }}
                        className="text-left px-3 py-2 rounded-lg text-xs font-medium"
                        style={{
                            backgroundColor: isCustom ? '#09090b' : '#f5f5f4',
                            color: isCustom ? '#fff' : '#3f3f46',
                            transition: 'background-color 120ms ease, color 120ms ease',
                        }}
                    >Custom…</button>
                </div>
                {isCustom && (
                    <input
                        autoFocus
                        value={custom}
                        onChange={e => setCustom(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); if (e.key === 'Escape') onClose(); }}
                        placeholder="e.g. Maya, Check…"
                        className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg mb-3 focus:outline-none focus:ring-2 focus:ring-zinc-300"
                    />
                )}
                <div className="flex gap-2">
                    <button onClick={onClose} className="flex-1 py-2 text-xs font-bold rounded-lg border border-stone-200 text-zinc-500 hover:bg-stone-50 transition-colors">Cancel</button>
                    <button onClick={handleSubmit} className="flex-1 py-2 text-xs font-bold rounded-lg bg-zinc-950 text-white hover:bg-zinc-800 transition-colors">Save</button>
                </div>
            </div>
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────────────────

const OrderHistory = () => {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [filter, setFilter] = useState(STATUS_ALL);
    const [completing, setCompleting] = useState(null);
    const [cancelling, setCancelling] = useState(null);
    const [expanded, setExpanded] = useState(new Set());
    const [noteModal, setNoteModal] = useState(null);
    const [paymentFilter, setPaymentFilter] = useState('All');
    const [editingPayment, setEditingPayment] = useState(null); // orderId being edited
    // Fix #10: Styled confirmation modal state
    const [confirmModal, setConfirmModal] = useState(null); // { group }
    // Fix #11: Toast notification state
    const [toast, setToast] = useState(null); // { message, type }

    const [searchQuery, setSearchQuery] = useState('');
    const isSearching = searchQuery.trim().length > 0;

    const [activePreset, setActivePreset] = useState('TODAY');
    const [customRange, setCustomRange] = useState(null);
    const [showCalendar, setShowCalendar] = useState(false);
    const calendarRef = useRef(null);

    useEffect(() => {
        const handler = (e) => {
            if (calendarRef.current && !calendarRef.current.contains(e.target))
                setShowCalendar(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const handlePresetSelect = (id) => {
        setActivePreset(id);
        setCustomRange(null);
        setShowCalendar(false);
    };

    const handleCalendarApply = (start, end) => {
        const label = `${start.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}`;
        setCustomRange({ start, end, label });
        setActivePreset(null);
        setShowCalendar(false);
    };

    const clearCustomRange = () => {
        setCustomRange(null);
        setActivePreset('TODAY');
    };

    const toggleExpand = (id) => {
        const next = new Set(expanded);
        if (next.has(id)) next.delete(id); else next.add(id);
        setExpanded(next);
    };

    const fetchTransactions = () => {
        setLoading(true);
        setError('');
        axios.get(`http://${window.location.hostname}:8080/api/transactions`)
            .then(res => setTransactions(Array.isArray(res.data) ? res.data : []))
            .catch(() => setError('Could not load order history. Is the backend running?'))
            .finally(() => setLoading(false));
    };

    useEffect(() => { fetchTransactions(); }, []);

    const handleCompleteItem = async (item) => {
        setCompleting(item.id);

        setTransactions(prev =>
            prev.map(t => t.id === item.id ? { ...t, status: 'FULL' } : t)
        );

        try {
            await axios.patch(`http://${window.location.hostname}:8080/api/transactions/${item.id}/complete`);
            axios.get(`http://${window.location.hostname}:8080/api/transactions`).then(res => {
                if (Array.isArray(res.data)) setTransactions(res.data);
            });
        } catch {
            setTransactions(prev =>
                prev.map(t => t.id === item.id ? { ...t, status: item.status } : t)
            );
            setError('Network error — could not save payment completion.');
        } finally {
            setCompleting(null);
        }
    };

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3500);
    };

    const handleCancelOrder = async (group) => {
        // Fix #10: use styled modal instead of window.confirm
        setConfirmModal(group);
    };

    const confirmCancel = async (group) => {
        setConfirmModal(null);
        setCancelling(group.orderId);
        try {
            await axios.post(`http://${window.location.hostname}:8080/api/transactions/cancel/${group.orderId}`);
            fetchTransactions();
            // Fix #11: show success toast
            showToast(`Order #${group.displayId} cancelled and stock restored.`, 'success');
        } catch (err) {
            showToast(err.response?.data?.error || 'Failed to cancel order.', 'error');
        } finally {
            setCancelling(null);
        }
    };

    const handleUpdatePayment = async (group, newMethod) => {
        setEditingPayment(null);
        // Fix #7: Optimistic update handles both LEGACY and normal orders
        setTransactions(prev =>
            prev.map(t => {
                const txGroupId = t.transactionId || `LEGACY-${t.id}`;
                return txGroupId === group.orderId ? { ...t, paymentMethod: newMethod } : t;
            })
        );
        try {
            await axios.patch(`http://${window.location.hostname}:8080/api/transactions/group/${group.orderId}/payment`, { paymentMethod: newMethod });
            fetchTransactions();
        } catch {
            setError('Could not update payment method.');
            fetchTransactions();
        }
    };

    const dateWindow = useMemo(() => {
        if (customRange) return { start: customRange.start, end: endOfDay(customRange.end) };
        if (activePreset) return getRangeForPreset(activePreset);
        return null;
    }, [activePreset, customRange]);

    const groupedOrders = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        const sourceTxs = (isSearching || !dateWindow)
            ? transactions
            : transactions.filter(t => {
                const d = new Date(t.transactionDate);
                return d >= dateWindow.start && d <= dateWindow.end;
            });

        const groups = sourceTxs.reduce((acc, t) => {
            const key = t.transactionId || `LEGACY-${t.id}`;
            if (!acc[key]) {
                acc[key] = {
                    orderId: key,
                    displayId: t.transactionId ? String(t.transactionId).split('-')[1].substring(0, 6) : String(t.id).padStart(4, '0'),
                    customerName: t.customerName,
                    paymentMethod: t.paymentMethod,
                    paymentDetails: t.paymentDetails,
                    status: t.status,
                    date: t.transactionDate,
                    items: [],
                    totalPrice: 0,
                    totalDownpayment: 0
                };
            }
            acc[key].items.push(t);
            acc[key].totalPrice += parseFloat(t.finalPrice || 0);
            acc[key].totalDownpayment += parseFloat(t.downpayment || 0);
            if (t.status === 'PARTIAL') acc[key].status = 'PARTIAL';
            if (t.status === 'UNPAID') acc[key].status = 'UNPAID';
            return acc;
        }, {});

        let allGroups = Object.values(groups).sort((a, b) => new Date(b.date) - new Date(a.date));

        if (isSearching) {
            allGroups = allGroups.filter(g => {
                const productNames = g.items.map(i =>
                    i.variant?.product
                        ? `${i.variant.product.brandName} ${i.variant.product.modelName} ${i.variant?.color || ''}`.toLowerCase()
                        : ''
                ).join(' ');
                const skus = g.items.map(i => (i.variant?.sku || '').toLowerCase()).join(' ');
                return (
                    (g.customerName || '').toLowerCase().includes(q) ||
                    (g.displayId || '').toLowerCase().includes(q) ||
                    (g.paymentMethod || '').toLowerCase().includes(q) ||
                    productNames.includes(q) ||
                    skus.includes(q)
                );
            });
        }

        if (paymentFilter !== 'All') {
            allGroups = allGroups.filter(g => g.paymentMethod === paymentFilter);
        }

        if (filter === STATUS_ALL) return allGroups;
        return allGroups.filter(g => g.status === filter);
    }, [filter, transactions, dateWindow, searchQuery, isSearching, paymentFilter]);

    const counts = useMemo(() => {
        const windowedTxs = dateWindow
            ? transactions.filter(t => {
                const d = new Date(t.transactionDate);
                return d >= dateWindow.start && d <= dateWindow.end;
            })
            : transactions;

        const groups = windowedTxs.reduce((acc, t) => {
            const key = t.transactionId || `LEGACY-${t.id}`;
            if (!acc[key]) acc[key] = t.status;
            if (t.status === 'PARTIAL') acc[key] = 'PARTIAL';
            if (t.status === 'UNPAID') acc[key] = 'UNPAID';
            return acc;
        }, {});
        const arr = Object.values(groups);
        return {
            all: arr.length,
            full: arr.filter(s => s === 'FULL').length,
            partial_unpaid: arr.filter(s => s === 'PARTIAL' || s === 'UNPAID').length,
        };
    }, [transactions, dateWindow]);

    // Unique payment methods in data — mirrors Analytics PaymentFilter options
    const paymentMethods = useMemo(() => {
        const set = new Set(transactions.map(t => t.paymentMethod).filter(Boolean));
        return Array.from(set).sort();
    }, [transactions]);

    const periodLabel = customRange
        ? customRange.label
        : activePreset === 'TODAY' ? "Today's Orders"
            : activePreset === '1W' ? 'This Week'
                : activePreset === '1M' ? 'This Month'
                    : activePreset === '1Y' ? 'This Year'
                        : '';

    // Changes whenever the date filter changes — used to retrigger row animations
    const tableKey = customRange ? customRange.label : (activePreset || 'all');

    // ─────────────────────────────────────────────────────────────────────────
    return (
        <div className="flex flex-col lg:h-full">
            <style>{`
                @keyframes fadeSlideIn {
                    from { opacity: 0; transform: translateY(5px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                @keyframes toastIn {
                    from { opacity: 0; transform: translateY(16px) scale(0.97); }
                    to   { opacity: 1; transform: translateY(0) scale(1); }
                }
            `}</style>

            {/* Fix #11: Toast notification */}
            {toast && (
                <div
                    className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 px-5 py-3 rounded-xl shadow-2xl text-sm font-bold text-white`}
                    style={{
                        animation: 'toastIn 250ms ease',
                        backgroundColor: toast.type === 'success' ? '#16a34a' : '#dc2626',
                        minWidth: '280px',
                    }}
                >
                    {toast.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                    {toast.message}
                    <button onClick={() => setToast(null)} className="ml-auto opacity-70 hover:opacity-100"><X size={14} /></button>
                </div>
            )}

            {/* Fix #10: Styled cancel confirmation modal */}
            {confirmModal && (
                <div className="fixed inset-0 bg-zinc-950/60 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden" style={{ animation: 'toastIn 200ms ease' }}>
                        <div className="bg-red-600 px-6 py-4 flex items-center gap-3 text-white">
                            <XCircle size={20} />
                            <h3 className="font-bold text-base">Cancel Order #{confirmModal.displayId}?</h3>
                        </div>
                        <div className="p-6">
                            <p className="text-sm text-zinc-600 mb-1">This will permanently delete this order and restore stock for all items.</p>
                            <p className="text-xs text-zinc-400 font-medium">Customer: <span className="font-bold text-zinc-700">{confirmModal.customerName}</span></p>
                            <p className="text-xs text-zinc-400 font-medium mt-0.5">{confirmModal.items?.length} item(s) · Total: {formatCurrency(confirmModal.totalPrice)}</p>
                        </div>
                        <div className="px-6 pb-6 flex gap-3">
                            <button
                                onClick={() => setConfirmModal(null)}
                                className="flex-1 py-2.5 rounded-xl border border-stone-200 text-zinc-600 font-bold text-sm hover:bg-stone-50 transition-colors"
                            >Keep Order</button>
                            <button
                                onClick={() => confirmCancel(confirmModal)}
                                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm transition-colors"
                            >Yes, Cancel</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ROW 1 — Title + count + period */}
            <div className="flex items-baseline gap-3 mb-3 shrink-0">
                <h2 className="text-2xl font-bold text-zinc-800 flex items-center gap-2 shrink-0">
                    <History className="text-zinc-500" size={22} /> Order History
                </h2>
                <span
                    className="text-base font-semibold text-zinc-500"
                    style={{
                        opacity: loading ? 0 : 1,
                        transition: 'opacity 300ms ease',
                    }}
                >
                    {isSearching ? (
                        <>
                            <span className="text-zinc-700">{groupedOrders.length} results</span>
                            <span className="mx-2 text-zinc-300">·</span>
                            <span>Searching all dates for "{searchQuery.trim()}"</span>
                        </>
                    ) : (
                        <>
                            <span className="text-zinc-700">{groupedOrders.length} orders</span>
                            {periodLabel && (
                                <>
                                    <span className="mx-2 text-zinc-300">·</span>
                                    <span className="text-zinc-500">{periodLabel}</span>
                                </>
                            )}
                        </>
                    )}
                </span>
            </div>

            {/* ROW 2 — Controls bar */}
            <div className="flex items-center gap-2 mb-4 shrink-0 w-full">

                {/* SEARCH BAR */}
                <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Search all orders…"
                        className="pl-8 pr-8 py-2 text-xs font-medium rounded-lg border border-stone-300 bg-white shadow-sm text-zinc-700 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-300 focus:border-zinc-400 w-52"
                        style={{ transition: 'border-color 200ms ease, box-shadow 200ms ease' }}
                    />
                    <span
                        className="absolute right-2.5 top-1/2 -translate-y-1/2"
                        style={{
                            opacity: isSearching ? 1 : 0,
                            transform: `translateY(-50%) scale(${isSearching ? 1 : 0.6})`,
                            transition: 'opacity 150ms ease, transform 150ms ease',
                            pointerEvents: isSearching ? 'all' : 'none',
                        }}
                    >
                        <button onClick={() => setSearchQuery('')} className="text-zinc-400 hover:text-zinc-700 transition-colors duration-150">
                            <X size={13} />
                        </button>
                    </span>
                </div>

                {/* STATUS FILTER TABS */}
                {[
                    { key: STATUS_ALL, label: 'All', count: counts.all },
                    { key: STATUS_FULL, label: 'Completed', count: counts.full },
                    { key: STATUS_UNPAID, label: 'Unpaid/Partial', count: counts.partial_unpaid },
                ].map(({ key, label, count }) => (
                    <button
                        key={key}
                        onClick={() => setFilter(key)}
                        className="px-4 py-1.5 rounded-full text-sm font-bold border"
                        style={{
                            backgroundColor: filter === key ? '#09090b' : '#ffffff',
                            color: filter === key ? '#ffffff' : '#52525b',
                            borderColor: filter === key ? '#09090b' : '#d6d3d1',
                            transition: 'background-color 200ms ease, color 200ms ease, border-color 200ms ease',
                        }}
                    >
                        {label}
                        <span
                            className="ml-1.5 text-xs px-1.5 py-0.5 rounded-full"
                            style={{
                                backgroundColor: filter === key ? 'rgba(255,255,255,0.2)' : '#f5f5f4',
                                color: filter === key ? '#ffffff' : '#71717a',
                                transition: 'background-color 200ms ease, color 200ms ease',
                            }}
                        >
                            {count}
                        </span>
                    </button>
                ))}

                {/* PAYMENT FILTER */}
                <PaymentFilter transactions={transactions} value={paymentFilter} onChange={setPaymentFilter} />

                {/* Spacer */}
                <div className="flex-1" />

                {/* TIME RANGE PRESETS */}
                <div className="flex bg-white border border-stone-200 rounded-lg p-1 shadow-sm">
                    {TIME_RANGES.map(range => (
                        <button
                            key={range.id}
                            onClick={() => handlePresetSelect(range.id)}
                            className="px-3 py-1.5 text-xs font-bold rounded-md"
                            style={{
                                backgroundColor: activePreset === range.id && !customRange ? '#09090b' : 'transparent',
                                color: activePreset === range.id && !customRange ? '#ffffff' : '#71717a',
                                boxShadow: activePreset === range.id && !customRange ? '0 1px 3px rgba(0,0,0,0.12)' : 'none',
                                transition: 'background-color 200ms ease, color 200ms ease, box-shadow 200ms ease',
                            }}
                        >
                            {range.label}
                        </button>
                    ))}
                </div>

                {/* CALENDAR PICKER */}
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
                        {customRange && (
                            <span className="max-w-[160px] truncate">{customRange.label}</span>
                        )}
                    </button>

                    {customRange && (
                        <button
                            onClick={(e) => { e.stopPropagation(); clearCustomRange(); }}
                            className="absolute -top-1.5 -right-1.5 text-white rounded-full w-4 h-4 flex items-center justify-center"
                            title="Clear custom range"
                            style={{
                                backgroundColor: '#3f3f46',
                                transition: 'background-color 150ms ease',
                            }}
                            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#ef4444'}
                            onMouseLeave={e => e.currentTarget.style.backgroundColor = '#3f3f46'}
                        >
                            <X size={10} />
                        </button>
                    )}

                    {/* Always rendered, animated via opacity/transform */}
                    <CalendarPicker
                        visible={showCalendar}
                        onApply={handleCalendarApply}
                        onClose={() => setShowCalendar(false)}
                    />
                </div>

                {/* REFRESH */}
                <button
                    onClick={fetchTransactions}
                    disabled={loading}
                    className="p-2 rounded-lg border border-stone-300 bg-white text-zinc-500 disabled:opacity-40 shadow-sm"
                    title="Refresh"
                    style={{ transition: 'background-color 150ms ease' }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f5f5f4'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = '#ffffff'}
                >
                    <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
                </button>
            </div>

            {/* ERROR BANNER */}
            {error && (
                <div
                    className="flex items-center gap-2 p-3 mb-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm shrink-0"
                    style={{ animation: 'fadeSlideIn 250ms ease' }}
                >
                    <AlertCircle size={16} /> {error}
                </div>
            )}

            {/* TABLE */}
            <div className="flex-1 min-h-0 overflow-auto bg-white border border-stone-200 rounded-xl shadow-sm">
                <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-stone-100 z-10 text-xs uppercase tracking-wider text-zinc-500 font-bold border-b border-stone-200 shadow-sm">
                        <tr>
                            <th className="px-5 py-4 w-10"></th>
                            <th className="px-5 py-4">Order ID</th>
                            <th className="px-5 py-4">Customer</th>
                            <th className="px-5 py-4">Products</th>
                            <th className="px-5 py-4">Payment</th>
                            <th className="px-5 py-4">Status</th>
                            <th className="px-5 py-4 text-right">Downpayment</th>
                            <th className="px-5 py-4 text-right">Total Balance</th>
                            <th className="px-5 py-4">Date</th>
                            <th className="px-5 py-4">Action</th>
                        </tr>
                    </thead>

                    <tbody key={tableKey} className="divide-y divide-stone-100 text-sm">
                        {loading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <tr key={i} className="animate-pulse">
                                    {Array.from({ length: 10 }).map((_, j) => (
                                        <td key={j} className="px-5 py-4">
                                            <div className="h-4 bg-stone-200 rounded w-3/4" />
                                        </td>
                                    ))}
                                </tr>
                            ))
                        ) : groupedOrders.length === 0 ? (
                            <tr>
                                <td
                                    colSpan="10"
                                    className="px-5 py-16 text-center text-zinc-400"
                                    style={{ animation: 'fadeSlideIn 250ms ease' }}
                                >
                                    {isSearching
                                        ? <Search size={32} className="mx-auto mb-3 opacity-20" />
                                        : <History size={32} className="mx-auto mb-3 opacity-20" />
                                    }
                                    <p className="font-medium">
                                        {isSearching
                                            ? `No orders found matching "${searchQuery.trim()}".`
                                            : filter === STATUS_ALL
                                                ? `No orders found for ${periodLabel.toLowerCase()}.`
                                                : `No ${filter.toLowerCase()} orders for ${periodLabel.toLowerCase()}.`}
                                    </p>
                                    {!isSearching && activePreset === 'TODAY' && (
                                        <p className="text-xs mt-1 text-zinc-300">
                                            Use the time range tabs or calendar to view past orders.
                                        </p>
                                    )}
                                </td>
                            </tr>
                        ) : (
                            groupedOrders.map((group, rowIdx) => {
                                const isUnfinished = group.status === 'PARTIAL' || group.status === 'UNPAID';
                                // remaining is computed by taking totalPrice of ALL items in the order,
                                // minus the downpayment (if any), and minus the price of fully paid items.
                                const paidItemsValue = group.items.filter(i => i.status === 'FULL').reduce((sum, i) => sum + parseFloat(i.finalPrice || 0), 0);
                                const remaining = isUnfinished 
                                    ? group.totalPrice - group.totalDownpayment - paidItemsValue
                                    : null;
                                const isExpanded = expanded.has(group.orderId);

                                return (
                                    <React.Fragment key={group.orderId}>
                                        <tr
                                            className={isUnfinished ? 'bg-amber-50/10' : group.status === 'CANCELLED' ? 'bg-zinc-50/50 opacity-60' : ''}
                                            style={{
                                                transition: 'background-color 150ms ease',
                                                animation: 'fadeSlideIn 220ms ease both',
                                                animationDelay: `${Math.min(rowIdx * 20, 250)}ms`,
                                            }}
                                            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#fafaf9'}
                                            onMouseLeave={e => e.currentTarget.style.backgroundColor = isUnfinished ? 'rgba(251,191,36,0.04)' : ''}
                                        >
                                            {/* Expand toggle */}
                                            <td className="px-5 py-4">
                                                {group.items.length > 1 ? (
                                                    <button
                                                        onClick={() => toggleExpand(group.orderId)}
                                                        className="p-1 rounded bg-stone-100 text-zinc-400 hover:text-zinc-800 hover:bg-stone-200"
                                                        style={{ transition: 'background-color 150ms ease, color 150ms ease' }}
                                                    >
                                                        <span style={{
                                                            display: 'block',
                                                            transition: 'transform 220ms ease',
                                                            transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                                                        }}>
                                                            <ChevronDown size={16} />
                                                        </span>
                                                    </button>
                                                ) : <span className="w-6 inline-block" />}
                                            </td>

                                            <td className="px-5 py-4 font-mono text-xs font-bold text-zinc-500">
                                                #{group.displayId}
                                            </td>
                                            <td className="px-5 py-4 font-medium text-zinc-800">
                                                {group.customerName}
                                            </td>
                                            <td className="px-5 py-4 text-zinc-700">
                                                {group.items.length === 1 && group.items[0].variant?.product ? (
                                                    `${group.items[0].variant.product.brandName} ${group.items[0].variant.product.modelName} ${group.items[0].variant?.color ? `(${group.items[0].variant.color})` : ''}`
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">
                                                        <Package size={14} /> {group.items.length} items
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-2">
                                                    <span
                                                        className="flex items-center gap-1 text-zinc-600 cursor-pointer hover:text-zinc-900 group"
                                                        onClick={(e) => { e.stopPropagation(); setEditingPayment(editingPayment === group.orderId ? null : group.orderId); }}
                                                        title="Click to change payment method"
                                                    >
                                                        <CreditCard size={13} />
                                                        <span className="font-medium">{group.paymentMethod}</span>
                                                        <Pen size={11} className="text-zinc-400 group-hover:text-zinc-600 transition-colors" />
                                                    </span>
                                                    {group.paymentDetails && (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); setNoteModal(group.paymentDetails); }}
                                                            className="text-blue-500 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 p-1.5 rounded-md transition-colors"
                                                            title="View Note"
                                                        >
                                                            <MessageSquare size={14} />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-5 py-4">
                                                {group.status === 'CANCELLED' ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold bg-zinc-200 text-zinc-600">
                                                        <XCircle size={11} /> Cancelled
                                                    </span>
                                                ) : isUnfinished ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700">
                                                        <Clock size={11} /> {group.status === 'UNPAID' ? 'Pending' : 'Partial'}
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">
                                                        <CheckCircle2 size={11} /> Completed
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-5 py-4 text-right font-mono text-zinc-600">
                                                {group.totalDownpayment > 0 ? formatCurrency(group.totalDownpayment) : '—'}
                                            </td>
                                            <td className="px-5 py-4 text-right font-mono text-zinc-800">
                                                <span className="font-black text-sm">{formatCurrency(group.totalPrice)}</span>
                                                {isUnfinished && remaining > 0 && (
                                                    <span className="block text-xs text-amber-600 font-bold mt-1">
                                                        {formatCurrency(remaining)} due
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-5 py-4 text-xs text-zinc-500">
                                                {formatDate(group.date)}
                                            </td>
                                            <td className="px-5 py-4">
                                                <div className="flex flex-col gap-1.5">
                                                    {isUnfinished && group.items.length === 1 && (
                                                        <button
                                                            onClick={() => handleCompleteItem(group.items[0])}
                                                            disabled={completing === group.items[0].id}
                                                            className="flex items-center gap-1.5 px-3 py-1.5 text-white text-xs font-bold rounded-lg disabled:opacity-50 shadow-sm"
                                                            style={{
                                                                backgroundColor: '#16a34a',
                                                                transition: 'background-color 150ms ease',
                                                            }}
                                                            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#15803d'}
                                                            onMouseLeave={e => e.currentTarget.style.backgroundColor = '#16a34a'}
                                                        >
                                                            {completing === group.items[0].id
                                                                ? <Loader2 size={12} className="animate-spin" />
                                                                : <CheckCircle2 size={12} />}
                                                            Pay Bal.
                                                        </button>
                                                    )}
                                                    {isUnfinished && group.items.length > 1 && (
                                                        <div className="text-[10px] font-bold text-zinc-400 bg-stone-100 border border-stone-200 px-2 py-1 rounded text-center">
                                                            Expand to<br/>pay items
                                                        </div>
                                                    )}
                                                    {group.status !== 'CANCELLED' && (
                                                        <button
                                                            onClick={() => handleCancelOrder(group)}
                                                            disabled={cancelling === group.orderId}
                                                            className="flex items-center gap-1.5 px-3 py-1.5 text-white text-xs font-bold rounded-lg disabled:opacity-50 shadow-sm"
                                                            style={{
                                                                backgroundColor: '#dc2626',
                                                                transition: 'background-color 150ms ease',
                                                            }}
                                                            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#b91c1c'}
                                                            onMouseLeave={e => e.currentTarget.style.backgroundColor = '#dc2626'}
                                                        >
                                                            {cancelling === group.orderId
                                                                ? <Loader2 size={12} className="animate-spin" />
                                                                : <XCircle size={12} />}
                                                            Cancel
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>

                                        {/* Expanded sub-rows */}
                                        {group.items.length > 1 && isExpanded && (
                                            <tr>
                                                <td colSpan="10" className="p-0">
                                                    <div
                                                        className="bg-stone-50 border-t border-stone-200"
                                                        style={{
                                                            animation: 'fadeSlideIn 180ms ease',
                                                        }}
                                                    >
                                                        <div className="py-3 px-8 ml-8 border-l-2 border-blue-400 my-2">
                                                            <table className="w-full text-xs">
                                                                <tbody>
                                                                    {group.items.map((item, idx) => {
                                                                        const isItemUnfinished = item.status === 'PARTIAL' || item.status === 'UNPAID';
                                                                        return (
                                                                        <tr
                                                                            key={idx}
                                                                            className="border-b border-stone-200/50 last:border-0"
                                                                            style={{ transition: 'background-color 150ms ease' }}
                                                                            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f5f5f4'}
                                                                            onMouseLeave={e => e.currentTarget.style.backgroundColor = ''}
                                                                        >
                                                                            <td className="py-2 text-zinc-500 font-mono w-24">{item.variant?.sku}</td>
                                                                            <td className="py-2 font-bold text-zinc-800">
                                                                                {item.variant?.product
                                                                                    ? `${item.variant.product.brandName} ${item.variant.product.modelName} ${item.variant?.color ? `(${item.variant.color})` : ''}`
                                                                                    : '—'}
                                                                            </td>
                                                                            <td className="py-2 font-mono text-xs text-center w-20">
                                                                                {item.status === 'CANCELLED' ? (
                                                                                    <span className="text-zinc-600 font-bold bg-zinc-200 px-1.5 py-0.5 rounded">CX</span>
                                                                                ) : item.status === 'FULL' ? (
                                                                                    <span className="text-green-600 font-bold bg-green-50 px-1.5 py-0.5 rounded">PAID</span>
                                                                                ) : (
                                                                                    <span className="text-amber-600 font-bold bg-amber-50 px-1.5 py-0.5 rounded">{item.status}</span>
                                                                                )}
                                                                            </td>
                                                                            <td className="py-2 text-right font-mono text-zinc-600 w-24">{formatCurrency(item.finalPrice)}</td>
                                                                            <td className="py-2 text-right w-20 pl-4">
                                                                                {isItemUnfinished && (
                                                                                    <button
                                                                                        onClick={() => handleCompleteItem(item)}
                                                                                        disabled={completing === item.id}
                                                                                        className="w-full px-2 py-1 bg-green-600 hover:bg-green-700 disabled:bg-stone-300 text-white text-[10px] uppercase tracking-wider font-bold rounded shadow-sm transition-colors flex justify-center items-center"
                                                                                    >
                                                                                        {completing === item.id ? <Loader2 size={12} className="animate-spin" /> : 'Pay'}
                                                                                    </button>
                                                                                )}
                                                                            </td>
                                                                        </tr>
                                                                    )})}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Note Modal */}
            {noteModal && (
                <div className="fixed inset-0 bg-zinc-950/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setNoteModal(null)}>
                    <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full border border-stone-200" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-2 mb-4 border-b border-stone-100 pb-3">
                            <MessageSquare size={18} className="text-blue-500" />
                            <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-700">Order Note</h3>
                        </div>
                        <p className="text-zinc-800 text-sm leading-relaxed whitespace-pre-wrap font-medium">{noteModal}</p>
                        <button onClick={() => setNoteModal(null)} className="mt-6 w-full py-2.5 bg-stone-100 hover:bg-stone-200 text-zinc-700 font-bold rounded-lg transition-colors text-sm">
                            Close
                        </button>
                    </div>
                </div>
            )}

            {/* Edit Payment Modal */}
            {editingPayment && (() => {
                const group = groupedOrders.find(g => g.orderId === editingPayment);
                return group ? (
                    <EditPaymentModal
                        group={group}
                        methods={paymentMethods}
                        onSave={(newMethod) => handleUpdatePayment(group, newMethod)}
                        onClose={() => setEditingPayment(null)}
                    />
                ) : null;
            })()}
        </div>
    );
};

export default OrderHistory;