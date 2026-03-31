import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
    Truck, 
    CheckCircle, 
    Clock, 
    ChevronDown, 
    ChevronUp, 
    Loader2,
    PackageSearch,
    Building2,
    Receipt
} from 'lucide-react';

const BASE = `http://${window.location.hostname}:8080`;

const SupplyHistory = () => {
    const [batches, setBatches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedBatchId, setExpandedBatchId] = useState(null);
    const [statusFilter, setStatusFilter] = useState('ALL'); // ALL, INCOMING, RECEIVED

    const fetchHistory = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${BASE}/api/batch-actions/history`);
            setBatches(res.data);
        } catch (err) {
            console.error('Failed to fetch supply history', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchHistory();
    }, []);

    const handleMarkReceived = async (batchId) => {
        if (!confirm('Marking this batch as Received will add its items to your active sellable inventory. Proceed?')) return;
        try {
            await axios.post(`${BASE}/api/batch-actions/${batchId}/mark-received`);
            // Optimistically update
            setBatches(batches.map(b => b.batchId === batchId ? { ...b, status: 'RECEIVED' } : b));
            alert('Batch marked as received. Stock is now updated!');
        } catch (err) {
            console.error(err);
            alert('Failed to mark batch as received.');
        }
    };

    const toggleExpand = (batchId) => {
        setExpandedBatchId(prev => prev === batchId ? null : batchId);
    };

    const fmtDate = (isoString) => {
        return new Date(isoString).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric',
            hour: 'numeric', minute: '2-digit'
        });
    };

    const fmtPrice = (val) => val != null ? `₱${Number(val).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '—';

    const filteredBatches = batches.filter(b => {
        if (statusFilter === 'ALL') return true;
        return b.status === statusFilter;
    });

    return (
        <div className="flex flex-col h-full overflow-hidden">
            <div className="flex justify-between items-center mb-6 shrink-0">
                <div className="flex items-center gap-3">
                    <Truck className="text-zinc-500" size={28} />
                    <h2 className="text-2xl font-black text-zinc-800 tracking-tight">Supply History</h2>
                </div>

                <div className="flex bg-stone-200/50 p-1.5 rounded-xl border border-stone-200">
                    {['ALL', 'INCOMING', 'RECEIVED'].map(filter => (
                        <button
                            key={filter}
                            onClick={() => setStatusFilter(filter)}
                            className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${
                                statusFilter === filter 
                                    ? 'bg-white text-zinc-900 shadow-sm border border-stone-200' 
                                    : 'text-zinc-500 hover:text-zinc-700'
                            }`}
                        >
                            {filter}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex-1 overflow-auto bg-white border border-stone-200 rounded-xl shadow-sm">
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 size={32} className="animate-spin text-indigo-500" />
                    </div>
                ) : filteredBatches.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-zinc-400">
                        <Truck size={48} className="mb-4 opacity-30" />
                        <h3 className="text-lg font-bold text-zinc-600 mb-1">No batches found</h3>
                        <p className="text-sm">There are no batches matching this filter.</p>
                    </div>
                ) : (
                    <table className="w-full text-left border-collapse">
                        <thead className="sticky top-0 bg-stone-100 shadow-sm z-10 text-xs uppercase tracking-wider text-zinc-500 font-bold border-b border-stone-200">
                            <tr>
                                <th className="px-6 py-4">Date Logged</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Supplier</th>
                                <th className="px-6 py-4 text-center">Total Qty</th>
                                <th className="px-6 py-4 text-right">Logged Expense</th>
                                <th className="px-6 py-4"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100 text-sm">
                            {filteredBatches.map(row => (
                                <React.Fragment key={row.batchId}>
                                    <tr className={`hover:bg-stone-50 transition-colors cursor-pointer ${expandedBatchId === row.batchId ? 'bg-indigo-50/30' : ''}`}
                                        onClick={() => toggleExpand(row.batchId)}>
                                        <td className="px-6 py-4 whitespace-nowrap text-zinc-700 font-medium">
                                            {fmtDate(row.date)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {row.status === 'INCOMING' ? (
                                                <div className="flex flex-col gap-1 items-start">
                                                    <span className="inline-flex items-center gap-1.5 bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full text-xs font-bold border border-blue-200">
                                                        <Clock size={12} /> Incoming
                                                    </span>
                                                    {row.eta && (
                                                        <span className="text-[10px] uppercase font-bold text-blue-600 bg-blue-50/50 px-2 py-0.5 rounded tracking-wider">
                                                            ETA: {new Date(row.eta).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                        </span>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 bg-green-100 text-green-700 px-2.5 py-1 rounded-full text-xs font-bold border border-green-200">
                                                    <CheckCircle size={12} /> Received
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-zinc-800 font-bold">
                                            <div className="flex items-center gap-2">
                                                <Building2 size={14} className="text-zinc-400" />
                                                {row.supplier}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center font-bold text-zinc-900">
                                            {row.totalQuantity} <span className="text-xs font-normal text-zinc-500">units</span>
                                        </td>
                                        <td className="px-6 py-4 text-right font-bold text-green-700">
                                            {fmtPrice(row.totalExpense)}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {expandedBatchId === row.batchId ? <ChevronUp size={20} className="text-zinc-400" /> : <ChevronDown size={20} className="text-zinc-400" />}
                                        </td>
                                    </tr>

                                    {/* EXPANDED DETAILS */}
                                    {expandedBatchId === row.batchId && (
                                        <tr className="bg-stone-50">
                                            <td colSpan="6" className="px-8 py-6 border-b border-indigo-100">
                                                <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
                                                    <div className="px-6 py-3 bg-indigo-50/50 border-b border-stone-200 flex justify-between items-center">
                                                        <h4 className="font-bold text-indigo-900 flex items-center gap-2">
                                                            <PackageSearch size={16} /> Batch Items Breakdown
                                                        </h4>
                                                        {row.status === 'INCOMING' && (
                                                            <button 
                                                                onClick={(e) => { e.stopPropagation(); handleMarkReceived(row.batchId); }}
                                                                className="px-4 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors flex items-center gap-2"
                                                            >
                                                                <CheckCircle size={14} /> Mark Batch as Received
                                                            </button>
                                                        )}
                                                    </div>
                                                    <table className="w-full text-left text-sm border-collapse">
                                                        <thead className="bg-stone-100/50 text-[10px] uppercase text-zinc-500 font-bold">
                                                            <tr>
                                                                <th className="px-6 py-2">Item</th>
                                                                <th className="px-6 py-2">SKU</th>
                                                                <th className="px-6 py-2 text-center">Qty</th>
                                                                <th className="px-6 py-2 text-right">Acq. Cost</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-stone-100">
                                                            {row.items.map((item, idx) => (
                                                                <tr key={idx} className="hover:bg-stone-50">
                                                                    <td className="px-6 py-3 font-bold text-zinc-800">{item.name}</td>
                                                                    <td className="px-6 py-3 text-xs font-mono text-zinc-500">{item.sku}</td>
                                                                    <td className="px-6 py-3 text-center font-bold text-zinc-700">{item.quantity}</td>
                                                                    <td className="px-6 py-3 text-right font-medium text-emerald-700">{fmtPrice(item.baseCost)}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

export default SupplyHistory;
