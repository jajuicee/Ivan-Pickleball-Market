import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import {
    Users, UserPlus, CreditCard, CheckCircle2, Loader2,
    AlertCircle, X, Undo2, ChevronDown, Trash2
} from 'lucide-react';

const BASE = `http://${window.location.hostname}:8080`;

const fmt = (n) => Number(n || 0).toLocaleString('en-PH', { style: 'currency', currency: 'PHP' });

const ConsigneesPage = () => {
    const [consignees, setConsignees] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedConsigneeId, setSelectedConsigneeId] = useState(null);
    const [showAddConsignee, setShowAddConsignee] = useState(false);
    const [newConsigneeName, setNewConsigneeName] = useState('');
    const [deleteConfirm, setDeleteConfirm] = useState(null);

    // Payment states
    const [completing, setCompleting] = useState(null);
    const [payingGroup, setPayingGroup] = useState(null); // group being paid
    const [itemPaySelections, setItemPaySelections] = useState({}); // { [id]: boolean }
    const [customAmount, setCustomAmount] = useState('');
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('GCash');

    const PAYMENT_METHODS = ['GCash', 'Cash', 'Credit Card', 'BDO', 'BPI', 'Banko', 'Maya', 'Check', 'GoTyme'];

    // Return states
    const [returningItem, setReturningItem] = useState(null); // id being returned
    const [returnConfirmItem, setReturnConfirmItem] = useState(null); // { item, group }

    const [toast, setToast] = useState(null);
    const [expandedGroups, setExpandedGroups] = useState(new Set());
    const [consigneeSort, setConsigneeSort] = useState('DATE_DESC'); // 'DATE_DESC' | 'DATE_ASC' | 'NAME'

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3500);
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            const [consRes, txRes] = await Promise.all([
                axios.get(`${BASE}/api/consignees`),
                axios.get(`${BASE}/api/transactions/consignment`), // consignment-only endpoint
            ]);
            setConsignees(consRes.data);
            setTransactions(txRes.data);
        } catch {
            showToast('Failed to load data.', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const handleAddConsignee = async (e) => {
        e.preventDefault();
        if (!newConsigneeName.trim()) return;
        try {
            const res = await axios.post(`${BASE}/api/consignees`, { name: newConsigneeName });
            setConsignees(prev => [...prev, res.data]);
            setSelectedConsigneeId(res.data.id);
            setShowAddConsignee(false);
            setNewConsigneeName('');
        } catch {
            showToast('Failed to add consignee.', 'error');
        }
    };

    // ── Grouping ──────────────────────────────────────────────────────────────
    const groupedTransactions = useMemo(() => {
        if (!selectedConsigneeId) return [];
        const consigneeTxs = transactions.filter(t =>
            t.consignee?.id === selectedConsigneeId
        );

        const groups = {};
        consigneeTxs.forEach(t => {
            const tid = t.transactionId;
            if (!groups[tid]) {
                groups[tid] = {
                    orderId: tid,
                    date: new Date(t.transactionDate),
                    items: [],
                };
            }
            groups[tid].items.push({
                ...t,
                finalPrice: Number(t.finalPrice || 0),
                downpayment: Number(t.downpayment || 0),
            });
        });

        const sorted = Object.values(groups).sort((a, b) => b.date - a.date);
        sorted.forEach(g => {
            const hasUnpaid  = g.items.some(i => i.status === 'UNPAID');
            const hasPartial = g.items.some(i => i.status === 'PARTIAL');
            g.status = hasUnpaid ? 'UNPAID' : hasPartial ? 'PARTIAL' : 'FULL';
            g.totalPrice   = g.items.reduce((s, i) => s + i.finalPrice, 0);
            g.totalUnpaid  = g.items.reduce((s, i) =>
                s + (i.status === 'FULL' ? 0 : i.finalPrice - i.downpayment), 0);
        });

        return sorted;
    }, [transactions, selectedConsigneeId]);

    // ── Sorted consignee list ─────────────────────────────────────────────────
    const sortedConsignees = useMemo(() => {
        // Build a map of consignee id → latest transaction date for date-based sorting
        const latestDate = {};
        transactions.forEach(t => {
            const cid = t.consignee?.id;
            if (!cid) return;
            const d = new Date(t.transactionDate);
            if (!latestDate[cid] || d > latestDate[cid]) latestDate[cid] = d;
        });

        return [...consignees].sort((a, b) => {
            if (consigneeSort === 'NAME') {
                return a.name.localeCompare(b.name, 'en', { sensitivity: 'base' });
            }
            // Date sort — consignees with no activity fall to the bottom
            const da = latestDate[a.id] || new Date(0);
            const db = latestDate[b.id] || new Date(0);
            return consigneeSort === 'DATE_DESC' ? db - da : da - db;
        });
    }, [consignees, transactions, consigneeSort]);

    const toggleGroup = (orderId) => {
        setExpandedGroups(prev => {
            const next = new Set(prev);
            next.has(orderId) ? next.delete(orderId) : next.add(orderId);
            return next;
        });
    };

    // ── Open Pay Amount modal ─────────────────────────────────────────────────
    const openPayModal = (group) => {
        const unpaidItems = group.items.filter(i => i.status !== 'FULL');
        // Default: pre-select all unpaid items
        const sel = {};
        unpaidItems.forEach(i => { sel[i.id] = true; });
        setItemPaySelections(sel);
        setCustomAmount('');
        setSelectedPaymentMethod('GCash');
        setPayingGroup(group);
    };

    // When custom amount changes, auto-select paddles that fit within the amount
    const handleCustomAmountChange = (val, unpaidItems) => {
        setCustomAmount(val);
        const budget = parseFloat(val);
        if (isNaN(budget) || budget <= 0) {
            // Clear all
            const next = {};
            unpaidItems.forEach(i => { next[i.id] = false; });
            setItemPaySelections(next);
            return;
        }
        // Greedily select paddles (sorted cheapest-first so more paddles fit)
        let remaining = budget;
        const sorted = [...unpaidItems].sort((a, b) => a.finalPrice - b.finalPrice);
        const next = {};
        unpaidItems.forEach(i => { next[i.id] = false; });
        for (const item of sorted) {
            if (remaining >= item.finalPrice) {
                next[item.id] = true;
                remaining -= item.finalPrice;
            }
        }
        setItemPaySelections(next);
    };

    // ── Submit pay modal ──────────────────────────────────────────────────────
    const handlePaySubmit = async (e) => {
        e.preventDefault();
        const group = payingGroup;
        const selectedIds = Object.entries(itemPaySelections)
            .filter(([, v]) => v)
            .map(([id]) => Number(id));
        if (selectedIds.length === 0) {
            showToast('Please select at least one item to pay.', 'error');
            return;
        }

        // Calculate the balance of selected items
        const unpaidItems = group.items.filter(i => i.status !== 'FULL');
        // Round the total balance to 2 decimal places to avoid JS floating point errors
        const selectedTotalBalance = parseFloat(
            unpaidItems
                .filter(i => itemPaySelections[i.id])
                .reduce((s, i) => s + (i.finalPrice - i.downpayment), 0)
                .toFixed(2)
        );

        // If custom amount is provided, use it. Otherwise, fully pay the selected items.
        const amountToPay = customAmount && parseFloat(customAmount) > 0 
            ? parseFloat(parseFloat(customAmount).toFixed(2))
            : selectedTotalBalance;

        if (amountToPay > selectedTotalBalance) {
            showToast(`Payment amount (${fmt(amountToPay)}) exceeds the total balance of selected items (${fmt(selectedTotalBalance)}). Please select more items.`, 'error');
            return;
        }

        setPayingGroup(null);
        setCompleting(group.orderId);
        try {
            await axios.patch(`${BASE}/api/transactions/pay-selected`, {
                itemIds: selectedIds,
                amount: amountToPay,
                paymentMethod: selectedPaymentMethod
            });
            await fetchData();
            showToast(`Applied payment of ${fmt(amountToPay)} to selected item(s).`, 'success');
        } catch {
            await fetchData();
            showToast('Network error — could not apply payment.', 'error');
        } finally {
            setCompleting(null);
        }
    };

    // ── Return paddle ─────────────────────────────────────────────────────────
    const handleReturnItem = async (item) => {
        setReturnConfirmItem(null);
        setReturningItem(item.id);
        try {
            await axios.delete(`${BASE}/api/transactions/${item.id}/return`);
            await fetchData();
            showToast('Paddle returned and stock restored.', 'success');
        } catch (err) {
            showToast(err.response?.data?.error || 'Failed to return item.', 'error');
        } finally {
            setReturningItem(null);
        }
    };

    // ── Delete Consignee ──────────────────────────────────────────────────────
    const handleDeleteConsignee = async (id) => {
        try {
            await axios.delete(`${BASE}/api/consignees/${id}`);
            showToast('Consignee deleted successfully.', 'success');
            setDeleteConfirm(null);
            if (selectedConsigneeId === id) setSelectedConsigneeId(null);
            fetchData();
        } catch (err) {
            showToast(err.response?.data?.error || 'Failed to delete consignee.', 'error');
        }
    };

    // ── Derived state for selected consignee summary ──────────────────────────
    const selectedConsignee = consignees.find(c => c.id === selectedConsigneeId);
    const totalOutstanding = groupedTransactions.reduce((s, g) => s + g.totalUnpaid, 0);
    const totalValue = groupedTransactions.reduce((s, g) => s + g.totalPrice, 0);

    return (
        <div className="w-full h-full flex flex-col md:flex-row bg-stone-50 overflow-hidden relative">

            {/* ── Toast ──────────────────────────────────────────────────── */}
            {toast && (
                <div className={`absolute top-4 right-4 z-[999] px-4 py-3 rounded-xl shadow-xl font-bold text-sm flex items-center gap-2 ${toast.type === 'success' ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-red-100 text-red-800 border border-red-200'}`}>
                    {toast.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                    {toast.message}
                </div>
            )}

            {/* ── Left Panel: Consignees List ──────────────────────────── */}
            <div className="w-full md:w-72 bg-white border-r border-stone-200 flex flex-col h-[40vh] md:h-full shrink-0">
                <div className="p-4 border-b border-stone-200 bg-stone-50 flex justify-between items-center shrink-0">
                    <h2 className="font-bold text-zinc-800 flex items-center gap-2 text-base">
                        <Users size={17} className="text-zinc-500" /> Consignees
                    </h2>
                    <button
                        onClick={() => setShowAddConsignee(true)}
                        className="p-1.5 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
                    >
                        <UserPlus size={15} />
                    </button>
                </div>

                {/* Sort toggle */}
                <div className="flex gap-1 px-3 py-2 border-b border-stone-100 bg-stone-50 shrink-0">
                    {[
                        { id: 'DATE_DESC', label: 'Newest' },
                        { id: 'DATE_ASC',  label: 'Oldest' },
                        { id: 'NAME',      label: 'A–Z' },
                    ].map(opt => (
                        <button
                            key={opt.id}
                            onClick={() => setConsigneeSort(opt.id)}
                            className="flex-1 py-1 text-[11px] font-bold rounded-md transition-colors"
                            style={{
                                backgroundColor: consigneeSort === opt.id ? '#09090b' : '#f1f5f9',
                                color: consigneeSort === opt.id ? '#ffffff' : '#64748b',
                            }}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>

                <div className="flex-1 overflow-y-auto p-2">
                    {loading ? (
                        <div className="p-4 text-center text-zinc-400 flex flex-col items-center gap-2">
                            <Loader2 className="animate-spin" size={20} /> Loading...
                        </div>
                    ) : sortedConsignees.length === 0 ? (
                        <div className="p-8 text-center text-zinc-400 text-sm">No consignees yet. Add one!</div>
                    ) : (
                        sortedConsignees.map(c => (
                            <button
                                key={c.id}
                                onClick={() => setSelectedConsigneeId(c.id)}
                                className={`group w-full text-left px-4 py-3 mb-1 rounded-xl font-medium text-sm flex items-center justify-between transition-colors ${
                                    selectedConsigneeId === c.id
                                        ? 'bg-zinc-900 text-white shadow-md'
                                        : 'hover:bg-stone-100 text-zinc-700'
                                }`}
                            >
                                <span>{c.name}</span>
                                <div
                                    onClick={(e) => { e.stopPropagation(); setDeleteConfirm(c.id); }}
                                    className={`p-1.5 rounded-lg transition-opacity ${
                                        selectedConsigneeId === c.id 
                                            ? 'text-zinc-400 hover:text-white hover:bg-zinc-700 opacity-100' 
                                            : 'opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-red-600 hover:bg-red-50'
                                    }`}
                                >
                                    <Trash2 size={14} />
                                </div>
                            </button>
                        ))
                    )}
                </div>
            </div>

            {/* ── Right Panel ─────────────────────────────────────────── */}
            <div className="flex-1 flex flex-col h-[60vh] md:h-full overflow-hidden bg-stone-100">
                {!selectedConsigneeId ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-zinc-400 gap-3">
                        <Users size={48} className="opacity-20" />
                        <p className="text-sm">Select a consignee to view their consignments.</p>
                    </div>
                ) : (
                    <>
                        {/* Header */}
                        <div className="p-5 bg-white border-b border-stone-200 shrink-0">
                            <div className="flex items-start justify-between gap-4 flex-wrap">
                                <div>
                                    <h2 className="text-xl font-black text-zinc-900">
                                        {selectedConsignee?.name}'s Consignments
                                    </h2>
                                    <p className="text-xs text-zinc-500 mt-0.5">Manage items assigned to this consignee.</p>
                                </div>
                                <div className="flex items-center gap-4 text-right text-xs font-bold text-zinc-500">
                                    <div>
                                        <div className="text-[10px] uppercase tracking-wider mb-0.5">Total Value</div>
                                        <div className="text-base font-black text-zinc-800 font-mono">{fmt(totalValue)}</div>
                                    </div>
                                    <div>
                                        <div className="text-[10px] uppercase tracking-wider mb-0.5">Outstanding</div>
                                        <div className={`text-base font-black font-mono ${totalOutstanding > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                                            {fmt(totalOutstanding)}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Order list */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                            {groupedTransactions.length === 0 ? (
                                <div className="text-center text-zinc-400 py-16 text-sm">No consignments found.</div>
                            ) : (
                                groupedTransactions.map(group => {
                                    const isExpanded = expandedGroups.has(group.orderId);
                                    const isUnfinished = group.status !== 'FULL';
                                    const shortId = String(group.orderId).slice(-6).toUpperCase();

                                    return (
                                        <div key={group.orderId} className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm">
                                            {/* Group header */}
                                            <div
                                                className="px-5 py-4 flex items-center justify-between cursor-pointer select-none hover:bg-stone-50 transition-colors"
                                                onClick={() => toggleGroup(group.orderId)}
                                            >
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className={`p-1 rounded transition-transform ${isExpanded ? 'rotate-0' : '-rotate-90'}`}>
                                                        <ChevronDown size={16} className="text-zinc-400" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="font-mono text-xs text-zinc-400">#{shortId}</div>
                                                        <div className="font-bold text-zinc-800 text-sm truncate">
                                                            {group.date.toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })}
                                                        </div>
                                                        <div className="text-xs text-zinc-500 mt-0.5">
                                                            {group.items.length} paddle{group.items.length !== 1 ? 's' : ''} · {fmt(group.totalPrice)}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2 shrink-0" onClick={e => e.stopPropagation()}>
                                                    {isUnfinished ? (
                                                        <>
                                                            <div className="text-right mr-1">
                                                                <div className="text-[10px] text-zinc-400 font-bold uppercase">Due</div>
                                                                <div className="text-sm font-black text-amber-600 font-mono">{fmt(group.totalUnpaid)}</div>
                                                            </div>
                                                            <button
                                                                onClick={() => openPayModal(group)}
                                                                disabled={completing === group.orderId}
                                                                className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold disabled:opacity-50 transition-colors shadow-sm"
                                                            >
                                                                <CreditCard size={12} /> Pay Balance
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <span className="text-xs font-bold text-green-700 bg-green-100 px-3 py-1.5 rounded-lg">
                                                            FULLY PAID ✓
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Expanded items */}
                                            {isExpanded && (
                                                <div className="border-t border-stone-100 divide-y divide-stone-100">
                                                    {group.items.map(item => {
                                                        const isPaid = item.status === 'FULL';
                                                        const productName = item.variant?.product
                                                            ? `${item.variant.product.brandName} ${item.variant.product.modelName}${item.variant?.color ? ` (${item.variant.color})` : ''}`
                                                            : (item.variant?.sku || '—');
                                                        return (
                                                            <div key={item.id} className="px-5 py-3 flex items-center gap-4 hover:bg-stone-50 transition-colors">
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="font-bold text-zinc-800 text-sm truncate">{productName}</div>
                                                                    <div className="text-xs text-zinc-400 font-mono">{item.variant?.sku}</div>
                                                                </div>
                                                                <div className="text-right shrink-0">
                                                                    <div className="font-black text-zinc-900 font-mono text-sm">{fmt(item.finalPrice)}</div>
                                                                    {!isPaid && item.downpayment > 0 && (
                                                                        <div className="text-[10px] text-amber-600 font-bold">
                                                                            DP: {fmt(item.downpayment)}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <div className="shrink-0 flex items-center gap-1.5">
                                                                    {isPaid ? (
                                                                        <span className="text-[10px] font-bold bg-green-100 text-green-700 px-2 py-1 rounded-md">PAID</span>
                                                                    ) : (
                                                                        <>
                                                                            <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-1 rounded-md">
                                                                                {item.status}
                                                                            </span>
                                                                            <button
                                                                                onClick={() => {
                                                                                    // Pay just this single item
                                                                                    openPayModal({
                                                                                        ...group,
                                                                                        items: [item],
                                                                                    });
                                                                                }}
                                                                                disabled={completing === item.id}
                                                                                className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white text-[10px] font-bold rounded-md transition-colors flex items-center gap-1 shadow-sm disabled:opacity-50"
                                                                            >
                                                                                {completing === item.id
                                                                                    ? <Loader2 size={11} className="animate-spin" />
                                                                                    : <CheckCircle2 size={11} />}
                                                                                Pay
                                                                            </button>
                                                                            <button
                                                                                onClick={() => setReturnConfirmItem({ item, group })}
                                                                                disabled={returningItem === item.id}
                                                                                className="px-2 py-1 text-white text-[10px] font-bold rounded-md transition-colors flex items-center gap-1 shadow-sm disabled:opacity-50"
                                                                                style={{ backgroundColor: '#d97706' }}
                                                                                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#b45309'}
                                                                                onMouseLeave={e => e.currentTarget.style.backgroundColor = '#d97706'}
                                                                            >
                                                                                {returningItem === item.id
                                                                                    ? <Loader2 size={11} className="animate-spin" />
                                                                                    : <Undo2 size={11} />}
                                                                                Return
                                                                            </button>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </>
                )}
            </div>

            {/* ── Add Consignee Modal ─────────────────────────────────── */}
            {showAddConsignee && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
                        <div className="p-4 bg-stone-50 border-b border-stone-100 flex justify-between items-center">
                            <h3 className="font-bold text-zinc-800 flex items-center gap-2">
                                <UserPlus size={16} className="text-blue-500" /> Add Consignee
                            </h3>
                            <button onClick={() => setShowAddConsignee(false)} className="text-zinc-400 hover:text-zinc-800 p-1 rounded-full hover:bg-stone-100">
                                <X size={16} />
                            </button>
                        </div>
                        <form onSubmit={handleAddConsignee} className="p-6 flex flex-col gap-4">
                            <div>
                                <label className="text-xs font-bold text-zinc-500 mb-1.5 block uppercase tracking-wider">Name</label>
                                <input
                                    type="text" autoFocus required
                                    value={newConsigneeName}
                                    onChange={e => setNewConsigneeName(e.target.value)}
                                    className="w-full px-3 py-2.5 border-2 border-stone-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                                    placeholder="Enter consignee name..."
                                />
                            </div>
                            <button type="submit" className="w-full py-2.5 bg-zinc-900 text-white font-bold rounded-xl hover:bg-zinc-700 transition-colors">
                                Save Consignee
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* ── Pay Amount Modal (checkbox + custom amount) ─────────── */}
            {payingGroup && (() => {
                const unpaidItems = payingGroup.items.filter(i => i.status !== 'FULL');
                const selectedIds = Object.entries(itemPaySelections).filter(([, v]) => v).map(([id]) => Number(id));
                const selectedTotal = unpaidItems.filter(i => itemPaySelections[i.id]).reduce((s, i) => s + i.finalPrice, 0);
                const allSelected = unpaidItems.length > 0 && unpaidItems.every(i => itemPaySelections[i.id]);

                return (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col" style={{ maxHeight: '90vh' }}>
                            {/* Header */}
                            <div className="p-4 bg-stone-50 border-b border-stone-100 flex items-center justify-between shrink-0">
                                <h3 className="font-bold text-stone-800 flex items-center gap-2">
                                    <CreditCard size={17} className="text-blue-500" /> Select Items to Pay
                                </h3>
                                <button onClick={() => setPayingGroup(null)} className="p-1 hover:bg-stone-200 rounded-full text-stone-400">
                                    <X size={16} />
                                </button>
                            </div>

                            <form onSubmit={handlePaySubmit} className="flex flex-col overflow-hidden">
                                {/* Custom amount input */}
                                <div className="px-5 pt-4 pb-3 border-b border-stone-100 shrink-0">
                                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5 block">
                                        Enter paid amount to auto-select paddles
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 font-bold text-sm">₱</span>
                                        <input
                                            type="number" step="0.01" min="0"
                                            value={customAmount}
                                            onChange={e => handleCustomAmountChange(e.target.value, unpaidItems)}
                                            className="w-full pl-8 pr-3 py-2.5 border-2 border-stone-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-bold text-lg text-stone-800 outline-none"
                                            placeholder="0.00"
                                            autoFocus
                                        />
                                    </div>
                                    <p className="text-[10px] text-zinc-400 mt-1.5">Or manually check the paddles below.</p>
                                </div>
                                
                                {/* Payment Method Selector */}
                                <div className="px-5 py-3 border-b border-stone-100 shrink-0">
                                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5 block">
                                        Payment Method
                                    </label>
                                    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                                        {PAYMENT_METHODS.map(method => (
                                            <button
                                                key={method}
                                                type="button"
                                                onClick={() => setSelectedPaymentMethod(method)}
                                                className="px-3 py-1.5 text-xs font-bold rounded-lg whitespace-nowrap transition-colors"
                                                style={{
                                                    backgroundColor: selectedPaymentMethod === method ? '#09090b' : '#f5f5f4',
                                                    color: selectedPaymentMethod === method ? '#fff' : '#52525b',
                                                }}
                                            >
                                                {method}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Select All toggle */}
                                <div className="px-5 py-2.5 flex items-center justify-between border-b border-stone-100 bg-stone-50 shrink-0">
                                    <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">
                                        {unpaidItems.length} unpaid paddle{unpaidItems.length !== 1 ? 's' : ''}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const next = {};
                                            unpaidItems.forEach(i => { next[i.id] = !allSelected; });
                                            setItemPaySelections(next);
                                        }}
                                        className="text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors"
                                    >
                                        {allSelected ? 'Deselect All' : 'Select All'}
                                    </button>
                                </div>

                                {/* Paddle list */}
                                <div className="overflow-y-auto flex-1">
                                    {unpaidItems.map(item => {
                                        const isChecked = !!itemPaySelections[item.id];
                                        const productName = item.variant?.product
                                            ? `${item.variant.product.brandName} ${item.variant.product.modelName}${item.variant?.color ? ` (${item.variant.color})` : ''}`
                                            : (item.variant?.sku || '—');
                                        return (
                                            <label
                                                key={item.id}
                                                className="flex items-center gap-3 px-5 py-3 cursor-pointer border-b border-stone-100 last:border-0 transition-colors"
                                                style={{ backgroundColor: isChecked ? '#f0fdf4' : 'transparent' }}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={isChecked}
                                                    onChange={e => {
                                                        setItemPaySelections(prev => ({ ...prev, [item.id]: e.target.checked }));
                                                    }}
                                                    className="w-4 h-4 accent-green-600 cursor-pointer shrink-0"
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-sm font-bold text-zinc-800 truncate">{productName}</div>
                                                    <div className="text-[11px] text-zinc-400 font-mono">{item.variant?.sku}</div>
                                                </div>
                                                <div className="text-right shrink-0">
                                                    <div className={`text-sm font-black font-mono ${isChecked ? 'text-green-700' : 'text-zinc-800'}`}>
                                                        {fmt(item.finalPrice)}
                                                    </div>
                                                    {item.downpayment > 0 && (
                                                        <div className="text-[10px] text-amber-600 font-bold">DP: {fmt(item.downpayment)}</div>
                                                    )}
                                                </div>
                                            </label>
                                        );
                                    })}
                                </div>

                                {/* Running total + actions */}
                                <div className="shrink-0 border-t border-stone-200 bg-stone-50">
                                    <div className="px-5 py-3 flex items-center justify-between">
                                        <span className="text-xs font-bold text-stone-500">
                                            {selectedIds.length} selected
                                        </span>
                                        <span className="text-lg font-black text-green-700 font-mono">{fmt(selectedTotal)}</span>
                                    </div>
                                    <div className="px-5 pb-4 flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setPayingGroup(null)}
                                            className="flex-1 py-2.5 text-sm font-bold text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-xl transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={selectedIds.length === 0}
                                            className="flex-1 py-2.5 text-sm font-bold text-white rounded-xl transition-colors shadow-sm disabled:opacity-40"
                                            style={{ backgroundColor: '#16a34a' }}
                                            onMouseEnter={e => { if (selectedIds.length > 0) e.currentTarget.style.backgroundColor = '#15803d'; }}
                                            onMouseLeave={e => e.currentTarget.style.backgroundColor = '#16a34a'}
                                        >
                                            Confirm Payment
                                        </button>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </div>
                );
            })()}

            {/* ── Return Confirmation Modal ───────────────────────────── */}
            {returnConfirmItem && (() => {
                const { item, group } = returnConfirmItem;
                const productName = item.variant?.product
                    ? `${item.variant.product.brandName} ${item.variant.product.modelName}${item.variant?.color ? ` (${item.variant.color})` : ''}`
                    : (item.variant?.sku || 'this item');
                return (
                    <div className="fixed inset-0 bg-zinc-950/60 z-[200] flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
                            <div className="px-6 py-4 flex items-center gap-3" style={{ backgroundColor: '#d97706' }}>
                                <Undo2 size={20} className="text-white" />
                                <h3 className="font-bold text-base text-white">Return Paddle?</h3>
                            </div>
                            <div className="p-6">
                                <p className="text-sm text-zinc-700">
                                    Return <strong>{productName}</strong> to stock?
                                </p>
                                <p className="text-xs text-zinc-400 font-medium mt-3">
                                    Price: {fmt(item.finalPrice)} · Stock will be restored by 1 unit.
                                </p>
                            </div>
                            <div className="px-6 pb-6 flex gap-3">
                                <button
                                    onClick={() => setReturnConfirmItem(null)}
                                    className="flex-1 py-2.5 rounded-xl border border-stone-200 text-zinc-600 font-bold text-sm hover:bg-stone-50 transition-colors"
                                >
                                    Keep
                                </button>
                                <button
                                    onClick={() => handleReturnItem(item)}
                                    className="flex-1 py-2.5 rounded-xl text-white font-bold text-sm transition-colors"
                                    style={{ backgroundColor: '#d97706' }}
                                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#b45309'}
                                    onMouseLeave={e => e.currentTarget.style.backgroundColor = '#d97706'}
                                >
                                    Yes, Return
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })()}
            {/* ── Delete Confirm Modal ────────────────────────────────────── */}
            {deleteConfirm && (
                <div className="fixed inset-0 bg-zinc-950/60 z-[300] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm text-center animate-fade-in-up">
                        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600">
                            <Trash2 size={24} />
                        </div>
                        <h3 className="font-bold text-zinc-900 text-lg mb-1">Delete Consignee?</h3>
                        <p className="text-sm text-zinc-500 mb-5">Consignees referenced by past transactions cannot be deleted. Are you sure?</p>
                        <div className="flex gap-3">
                            <button onClick={() => setDeleteConfirm(null)}
                                className="flex-1 px-4 py-2.5 border border-stone-300 rounded-xl font-bold text-zinc-600 hover:bg-stone-50 transition-colors">Cancel</button>
                            <button onClick={() => handleDeleteConsignee(deleteConfirm)}
                                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors shadow-sm">Delete</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ConsigneesPage;
