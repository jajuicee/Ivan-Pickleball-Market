import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { Users, UserPlus, CreditCard, CheckCircle2, Loader2, AlertCircle, X } from 'lucide-react';

const ConsigneesPage = () => {
    const [consignees, setConsignees] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedConsigneeId, setSelectedConsigneeId] = useState(null);
    const [showAddConsignee, setShowAddConsignee] = useState(false);
    const [newConsigneeName, setNewConsigneeName] = useState('');
    
    // Payment states
    const [completing, setCompleting] = useState(null);
    const [payingBalanceGroup, setPayingBalanceGroup] = useState(null);
    const [paymentAmountInput, setPaymentAmountInput] = useState('');
    const [toast, setToast] = useState(null);
    const [expandedGroups, setExpandedGroups] = useState(new Set());

    const fetchData = async () => {
        setLoading(true);
        try {
            const [consRes, txRes] = await Promise.all([
                axios.get(`http://${window.location.hostname}:8080/api/consignees`),
                axios.get(`http://${window.location.hostname}:8080/api/transactions`)
            ]);
            setConsignees(consRes.data);
            setTransactions(txRes.data);
        } catch {
            console.error('Failed to fetch data.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const handleAddConsignee = async (e) => {
        e.preventDefault();
        if (!newConsigneeName.trim()) return;
        try {
            const res = await axios.post(`http://${window.location.hostname}:8080/api/consignees`, { name: newConsigneeName });
            setConsignees([...consignees, res.data]);
            setSelectedConsigneeId(res.data.id);
            setShowAddConsignee(false);
            setNewConsigneeName('');
        } catch {
            alert('Failed to add consignee.');
        }
    };

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    // Grouping logic (similar to OrderHistory but filtered by consignee)
    const groupedTransactions = useMemo(() => {
        if (!selectedConsigneeId) return [];
        
        // Filter only consignments for this consignee
        const consigneeTxs = transactions.filter(t => 
            t.transactionType === 'CONSIGNMENT' && 
            t.consignee && 
            t.consignee.id === selectedConsigneeId
        );

        const groups = {};
        consigneeTxs.forEach(t => {
            const tid = t.transactionId;
            if (!groups[tid]) {
                groups[tid] = {
                    orderId: tid,
                    date: new Date(t.transactionDate),
                    status: t.status, // updated below
                    items: []
                };
            }
            groups[tid].items.push({
                ...t,
                finalPrice: Number(t.finalPrice || 0),
                downpayment: Number(t.downpayment || 0)
            });
        });

        const sortedGroups = Object.values(groups).sort((a, b) => b.date - a.date);
        
        sortedGroups.forEach(g => {
            const isUnpaid = g.items.some(i => i.status === 'UNPAID');
            const isPartial = g.items.some(i => i.status === 'PARTIAL');
            if (isUnpaid) g.status = 'UNPAID';
            else if (isPartial) g.status = 'PARTIAL';
            else g.status = 'FULL';
            
            g.totalUnpaid = g.items.reduce((sum, i) => sum + (i.status === 'FULL' ? 0 : (i.finalPrice - (i.downpayment || 0))), 0);
        });
        
        return sortedGroups;
    }, [transactions, selectedConsigneeId]);

    const toggleGroup = (orderId) => {
        setExpandedGroups(prev => {
            const next = new Set(prev);
            if (next.has(orderId)) next.delete(orderId);
            else next.add(orderId);
            return next;
        });
    };

    const handlePayPartialSubmit = async (e) => {
        e.preventDefault();
        const group = payingBalanceGroup;
        const amount = parseFloat(paymentAmountInput);
        if (isNaN(amount) || amount <= 0) return;

        setPayingBalanceGroup(null);
        setCompleting(group.orderId);

        try {
            await axios.patch(`http://${window.location.hostname}:8080/api/transactions/group/${group.orderId}/pay-partial`, { amount });
            await fetchData();
            showToast(`Applied ₱${amount.toFixed(2)} to Consignment #${group.orderId}.`, 'success');
        } catch {
            await fetchData();
            alert('Network error — could not apply payment.');
        } finally {
            setCompleting(null);
        }
    };

    const handleCompleteGroup = async (group) => {
        setCompleting(group.orderId);
        const unfinished = group.items.filter(i => i.status !== 'FULL');
        try {
            await Promise.all(unfinished.map(i => axios.patch(`http://${window.location.hostname}:8080/api/transactions/${i.id}/complete`)));
            await fetchData();
            showToast('Consignment marked as fully paid.', 'success');
        } catch {
            await fetchData();
            alert('Error completing payment.');
        } finally {
            setCompleting(null);
        }
    };

    return (
        <div className="w-full h-full flex flex-col md:flex-row bg-stone-50 overflow-hidden relative">
            {toast && (
                <div className={`absolute top-4 right-4 z-[999] px-4 py-3 rounded-lg shadow-xl font-bold text-sm flex items-center gap-2 ${toast.type === 'success' ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-red-100 text-red-800 border border-red-200'}`}>
                    {toast.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                    {toast.message}
                </div>
            )}

            {/* Left Panel: Consignees List */}
            <div className="w-full md:w-80 bg-white border-r border-stone-200 flex flex-col h-[40vh] md:h-full shrink-0">
                <div className="p-4 border-b border-stone-200 bg-stone-50 flex justify-between items-center shrink-0">
                    <h2 className="font-bold text-zinc-800 flex items-center gap-2 text-lg">
                        <Users size={18} className="text-zinc-500" /> Consignees
                    </h2>
                    <button onClick={() => setShowAddConsignee(true)} className="p-1.5 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors">
                        <UserPlus size={16} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-2">
                    {loading ? (
                        <div className="p-4 text-center text-zinc-400 flex flex-col items-center"><Loader2 className="animate-spin mb-2" /> Loading...</div>
                    ) : consignees.length === 0 ? (
                        <div className="p-8 text-center text-zinc-400">No consignees found. Add one above!</div>
                    ) : (
                        consignees.map(c => (
                            <button
                                key={c.id}
                                onClick={() => setSelectedConsigneeId(c.id)}
                                className={`w-full text-left px-4 py-3 mb-1 rounded-lg font-medium text-sm flex items-center justify-between transition-colors ${selectedConsigneeId === c.id ? 'bg-zinc-950 text-white shadow-md' : 'hover:bg-stone-100 text-zinc-700'}`}
                            >
                                <span>{c.name}</span>
                            </button>
                        ))
                    )}
                </div>
            </div>

            {/* Right Panel: Selected Consignee History */}
            <div className="flex-1 flex flex-col h-[60vh] md:h-full overflow-hidden bg-stone-100">
                {!selectedConsigneeId ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-zinc-400">
                        <Users size={48} className="mb-4 opacity-20" />
                        <p>Select a consignee to view their active consignments.</p>
                    </div>
                ) : (
                    <>
                        <div className="p-6 bg-white border-b border-stone-200 shrink-0">
                            <h2 className="text-2xl font-bold text-zinc-900">
                                {consignees.find(c => c.id === selectedConsigneeId)?.name}'s Consignments
                            </h2>
                            <p className="text-sm text-zinc-500">Manage items assigned to this consignee.</p>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 space-y-4">
                            {groupedTransactions.length === 0 ? (
                                <div className="text-center text-zinc-400 py-12">No consignments found for this consignee.</div>
                            ) : (
                                groupedTransactions.map(group => (
                                    <div key={group.orderId} className="bg-white border border-stone-200 rounded-xl overflow-hidden shadow-sm">
                                        <div className="p-4 bg-stone-50 border-b border-stone-100 flex justify-between items-center cursor-pointer" onClick={() => toggleGroup(group.orderId)}>
                                            <div>
                                                <div className="font-mono text-xs text-zinc-500 mb-1">{group.orderId}</div>
                                                <div className="font-bold text-zinc-800 text-sm">
                                                    {group.date.toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                {group.status !== 'FULL' ? (
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2 py-1 rounded">
                                                            UNPAID: ₱{group.totalUnpaid.toLocaleString()}
                                                        </span>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleCompleteGroup(group); }}
                                                            disabled={completing === group.orderId}
                                                            className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-md text-xs font-bold disabled:opacity-50"
                                                        >
                                                            {completing === group.orderId ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                                                            All Paid
                                                        </button>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setPayingBalanceGroup(group);
                                                                setPaymentAmountInput(group.totalUnpaid.toString());
                                                            }}
                                                            disabled={completing === group.orderId}
                                                            className="text-xs font-bold text-blue-600 border border-blue-200 px-3 py-1.5 rounded-md hover:bg-blue-50"
                                                        >
                                                            Pay Amount
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs font-bold text-green-700 bg-green-100 px-2 py-1 rounded">FULLY PAID</span>
                                                )}
                                            </div>
                                        </div>
                                        {expandedGroups.has(group.orderId) && (
                                            <div className="divide-y divide-stone-100">
                                                {group.items.map(item => (
                                                    <div key={item.id} className="p-4 flex justify-between text-sm hover:bg-stone-50">
                                                        <div>
                                                            <div className="font-bold text-zinc-800">
                                                                {item.variant.product?.brandName} {item.variant.product?.modelName}
                                                            </div>
                                                            <div className="text-xs text-zinc-500 font-mono">SKU: {item.variant.sku}</div>
                                                        </div>
                                                        <div className="text-right">
                                                            <div className="font-bold text-zinc-900">₱{item.finalPrice.toLocaleString()}</div>
                                                            {item.status !== 'FULL' && item.downpayment > 0 && (
                                                                <div className="text-xs text-amber-600 font-bold">Paid: ₱{item.downpayment.toLocaleString()}</div>
                                                            )}
                                                            <div className="text-[10px] font-bold mt-1 px-2 py-0.5 rounded inline-block bg-stone-200 text-stone-600">
                                                                {item.status}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </>
                )}
            </div>

            {/* Add Consignee Modal */}
            {showAddConsignee && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden">
                        <div className="p-4 bg-stone-50 border-b border-stone-100 flex justify-between items-center">
                            <h3 className="font-bold text-zinc-800">Add Consignee</h3>
                            <button onClick={() => setShowAddConsignee(false)} className="text-zinc-400 hover:text-zinc-800"><X size={18}/></button>
                        </div>
                        <form onSubmit={handleAddConsignee} className="p-6 flex flex-col gap-4">
                            <div>
                                <label className="text-xs font-bold text-zinc-500 mb-1 block">Name</label>
                                <input type="text" autoFocus required value={newConsigneeName} onChange={e => setNewConsigneeName(e.target.value)}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-zinc-950 outline-none" placeholder="Enter consignee name..." />
                            </div>
                            <button type="submit" className="w-full py-2 bg-zinc-950 text-white font-bold rounded-lg hover:bg-zinc-800">Save Consignee</button>
                        </form>
                    </div>
                </div>
            )}

            {/* Partial Payment Modal */}
            {payingBalanceGroup && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden">
                        <div className="p-4 bg-stone-50 border-b border-stone-100 flex items-center justify-between">
                            <h3 className="font-bold text-stone-800 flex items-center gap-2"><CreditCard size={18} className="text-blue-500" /> Pay Consignment</h3>
                            <button onClick={() => setPayingBalanceGroup(null)} className="text-stone-400 hover:text-stone-800"><X size={16} /></button>
                        </div>
                        <form onSubmit={handlePayPartialSubmit} className="p-5 flex flex-col gap-4">
                            <div className="text-xs text-stone-500">
                                Total remaining balance: <span className="font-bold text-stone-800">₱{payingBalanceGroup.totalUnpaid.toLocaleString()}</span>
                            </div>
                            <div>
                                <label className="text-sm font-semibold text-stone-700 mb-1 block">Amount Paid</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 font-bold">₱</span>
                                    <input type="number" step="0.01" min="0.01" required autoFocus value={paymentAmountInput} onChange={e => setPaymentAmountInput(e.target.value)}
                                        className="w-full pl-8 pr-3 py-2 border-2 rounded-xl focus:border-blue-500 font-bold text-lg text-stone-800 outline-none" placeholder="0.00" />
                                </div>
                            </div>
                            <div className="flex items-center gap-2 pt-4">
                                <button type="button" onClick={() => setPayingBalanceGroup(null)} className="flex-1 py-2 text-sm font-bold bg-stone-100 rounded-xl hover:bg-stone-200">Cancel</button>
                                <button type="submit" className="flex-1 py-2 text-sm font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700">Submit</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ConsigneesPage;
