import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import {
    Activity,
    DollarSign,
    Wallet,
    PiggyBank,
    AlertCircle,
    RefreshCw,
    CalendarDays,
    Filter
} from 'lucide-react';

const formatCurrency = (val) =>
    `₱${Number(val).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const Reporting = () => {
    const [financials, setFinancials] = useState(null);
    const [ledger, setLedger] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    
    // YYYY-MM-DD format for the date picker. Default to today.
    const [selectedDate, setSelectedDate] = useState(new Date().toLocaleDateString('en-CA'));
    const [categoryFilter, setCategoryFilter] = useState('All');

    const fetchData = () => {
        setLoading(true);
        setError('');
        
        const params = {};
        if (selectedDate) {
            params.date = selectedDate;
        }

        Promise.all([
            axios.get(`http://${window.location.hostname}:8080/api/reporting/financials`, { params }),
            axios.get(`http://${window.location.hostname}:8080/api/reporting/inventory-ledger`, { params })
        ])
            .then(([finRes, ledRes]) => {
                setFinancials(finRes.data);
                setLedger(Array.isArray(ledRes.data) ? ledRes.data : []);
            })
            .catch(err => {
                console.error("Error fetching reporting data:", err);
                setError('Failed to load reporting data.');
            })
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        fetchData();
    }, [selectedDate]);

    // Filter by Category
    const filteredLedger = useMemo(() => {
        if (!ledger.length) return [];
        let filtered = ledger.filter(item => {
            if (categoryFilter === 'All') return true;
            return item.category === categoryFilter;
        });
        
        // Sort alphabetically and numerically so shoe sizes stay in order
        return filtered.sort((a, b) => a.productName.localeCompare(b.productName, undefined, { numeric: true }));
    }, [ledger, categoryFilter]);

    // Extract unique categories for the filter buttons
    const categories = useMemo(() => {
        const cats = new Set(ledger.map(item => item.category).filter(Boolean));
        return ['All', ...Array.from(cats)].sort();
    }, [ledger]);

    return (
        <div className="flex flex-col h-full space-y-6 w-full">
            {/* Header & Controls */}
            <div className="flex flex-wrap justify-between items-center gap-4 shrink-0">
                <h2 className="text-2xl font-black text-zinc-800 flex items-center gap-3">
                    <Activity className="text-zinc-500" size={28} /> Reporting Hub
                </h2>
                <div className="flex items-center gap-3">
                    
                    <div className="relative">
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="px-3 py-1.5 bg-white border border-stone-200 rounded-xl text-sm font-bold text-zinc-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all"
                        />
                    </div>

                    <button onClick={fetchData} disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-zinc-900 rounded-xl text-sm font-bold text-white hover:bg-zinc-800 disabled:opacity-50 transition-all shadow-sm">
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                        Refresh Data
                    </button>
                </div>
            </div>

            {error && (
                <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-3 text-sm font-bold shrink-0">
                    <AlertCircle size={20} /> {error}
                </div>
            )}

            {/* Financial Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 shrink-0">
                <StatCard 
                    title="Total Expected Revenue" 
                    value={loading || !financials ? '...' : formatCurrency(financials.expectedRevenue)} 
                    icon={<DollarSign size={24} className="text-emerald-600" />} 
                    bg="bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-emerald-200/60"
                    iconBg="bg-emerald-100 text-emerald-600 shadow-inner"
                    description={`Value of items sold ${selectedDate ? 'on this date' : '(All-Time)'}.`}
                />
                
                <div className="border rounded-2xl p-4 flex flex-col relative overflow-hidden transition-all hover:shadow-md bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200/60">
                    <div className="flex justify-between items-start mb-2 relative z-10">
                        <h3 className="text-xs font-bold text-zinc-600 tracking-wide">Actual Cash Received</h3>
                        <div className="p-2 rounded-xl bg-blue-100 text-blue-600 shadow-inner">
                            <PiggyBank size={18} />
                        </div>
                    </div>
                    <div className="mt-auto relative z-10">
                        <h4 className="text-xl font-black text-zinc-900 tracking-tight mb-2">
                            {loading || !financials ? '...' : formatCurrency(financials.actualReceived)}
                        </h4>
                        
                        {/* Payment Methods Breakdown */}
                        {financials?.methodsBreakdown && Object.keys(financials.methodsBreakdown).length > 0 ? (
                            <div className="mt-3 flex flex-wrap gap-2">
                                {Object.entries(financials.methodsBreakdown).map(([method, amount]) => (
                                    <div key={method} className="flex items-center gap-1.5 bg-white/60 px-2.5 py-1 rounded-md border border-blue-200/50">
                                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{method}</span>
                                        <span className="text-xs font-black text-blue-800">{formatCurrency(amount)}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-xs font-medium text-zinc-500 leading-snug">No payments recorded.</p>
                        )}
                    </div>
                    <div className="absolute -bottom-8 -right-8 w-24 h-24 bg-white/40 blur-2xl rounded-full z-0 pointer-events-none"></div>
                </div>

                <StatCard 
                    title="Balance Due (Floating)" 
                    value={loading || !financials ? '...' : formatCurrency(financials.balanceDue)} 
                    icon={<Wallet size={24} className="text-amber-600" />} 
                    bg="bg-gradient-to-br from-amber-50 to-amber-100/50 border-amber-200/60"
                    iconBg="bg-amber-100 text-amber-600 shadow-inner"
                    description={`Money still owed from sales ${selectedDate ? 'on this date' : '(All-Time)'}.`}
                />
            </div>

            {/* Inventory Movement Ledger */}
            <div className="bg-white border border-stone-200 rounded-2xl shadow-sm flex flex-col flex-1 min-h-[400px] overflow-hidden">
                <div className="p-5 border-b border-stone-100 flex justify-between items-center bg-stone-50/50">
                    <div className="flex items-center gap-4">
                        <h3 className="text-lg font-black text-zinc-800 flex items-center gap-2">
                            <CalendarDays size={20} className="text-zinc-400" /> Daily Inventory Snapshot
                        </h3>
                        
                        {/* Category Filter */}
                        <div className="flex items-center gap-2 bg-white rounded-lg p-1 border border-stone-200 shadow-sm">
                            <Filter size={14} className="text-zinc-400 ml-2" />
                            {categories.map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => setCategoryFilter(cat)}
                                    className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                                        categoryFilter === cat 
                                        ? 'bg-zinc-800 text-white shadow-sm' 
                                        : 'text-zinc-500 hover:bg-stone-100'
                                    }`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                    </div>

                    <span className="text-xs font-bold uppercase tracking-widest text-zinc-400 bg-white px-3 py-1 rounded-full border border-stone-200 shadow-sm">
                        {filteredLedger.length} products
                    </span>
                </div>

                {loading ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-zinc-400">
                        <RefreshCw size={32} className="animate-spin mb-4" />
                        <p className="font-bold tracking-wide">Compiling Report...</p>
                    </div>
                ) : filteredLedger.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-zinc-400 p-8">
                        <Activity size={48} className="opacity-20 mb-4" />
                        <p className="font-bold tracking-wide text-lg text-zinc-500">No products found for this category.</p>
                    </div>
                ) : (
                    <div className="flex-1 overflow-y-auto bg-white">
                        <table className="w-full text-left border-collapse text-sm">
                            <thead className="bg-stone-50 sticky top-0 border-b border-stone-200 shadow-sm z-10">
                                <tr>
                                    <th className="py-3 px-4 font-black text-[10px] text-zinc-500 uppercase tracking-widest border-r border-stone-200/60 w-full">Product Model</th>
                                    <th className="py-3 px-4 font-black text-[10px] text-zinc-500 uppercase tracking-widest border-r border-stone-200/60">Color Variant</th>
                                    <th className="py-3 px-4 font-black text-[10px] text-zinc-500 uppercase tracking-widest border-r border-stone-200/60 text-center whitespace-nowrap bg-stone-100">Starting Stock</th>
                                    <th className="py-3 px-4 font-black text-[10px] text-emerald-600 uppercase tracking-widest border-r border-stone-200/60 text-center whitespace-nowrap bg-emerald-50">Restocks (In)</th>
                                    <th className="py-3 px-4 font-black text-[10px] text-rose-600 uppercase tracking-widest border-r border-stone-200/60 text-center whitespace-nowrap bg-rose-50">Sales (Out)</th>
                                    <th className="py-3 px-4 font-black text-[10px] text-amber-600 uppercase tracking-widest border-r border-stone-200/60 text-center whitespace-nowrap bg-amber-50">Adjustments</th>
                                    <th className="py-3 px-4 font-black text-[10px] text-zinc-800 uppercase tracking-widest text-center whitespace-nowrap bg-stone-200">Closing Stock</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-stone-200">
                                {filteredLedger.map((item, idx) => {
                                    const hasActivity = item.restocked > 0 || item.sold > 0 || item.adjusted > 0;
                                    
                                    return (
                                        <tr 
                                            key={item.variantId} 
                                            className={`transition-colors group ${hasActivity ? 'hover:bg-amber-50/40 bg-white' : 'hover:bg-stone-50/40 bg-stone-50/30'}`}
                                        >
                                            <td className="py-2 px-4 border-r border-stone-200/60 font-bold text-zinc-800 text-xs">
                                                {item.productName}
                                            </td>
                                            
                                            <td className="py-2 px-4 border-r border-stone-200/60">
                                                {item.color ? (
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="w-2 h-2 rounded-full border border-black/10 shrink-0" style={{ backgroundColor: item.color.toLowerCase() }}></span>
                                                        <span className="text-xs font-bold text-zinc-600">{item.color}</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs font-medium text-zinc-400 italic">N/A</span>
                                                )}
                                            </td>
                                            
                                            {/* Starting Stock */}
                                            <td className="py-2 px-4 border-r border-stone-200/60 text-center font-bold tabular-nums text-sm text-zinc-600 bg-stone-50/50">
                                                {item.startingStock}
                                            </td>
                                            
                                            {/* Restocks (In) */}
                                            <td className={`py-2 px-4 border-r border-stone-200/60 text-center font-black tabular-nums text-sm ${item.restocked > 0 ? 'text-emerald-600 bg-emerald-50/30' : 'text-zinc-300'}`}>
                                                {item.restocked > 0 ? `+${item.restocked}` : '-'}
                                            </td>
                                            
                                            {/* Sales (Out) */}
                                            <td className={`py-2 px-4 border-r border-stone-200/60 text-center font-black tabular-nums text-sm ${item.sold > 0 ? 'text-rose-600 bg-rose-50/30' : 'text-zinc-300'}`}>
                                                {item.sold > 0 ? `-${item.sold}` : '-'}
                                            </td>

                                            {/* Adjustments */}
                                            <td className={`py-2 px-4 border-r border-stone-200/60 text-center font-black tabular-nums text-sm ${item.adjusted > 0 ? 'text-amber-600 bg-amber-50/30' : 'text-zinc-300'}`}>
                                                {item.adjusted > 0 ? `-${item.adjusted}` : '-'}
                                            </td>
                                            
                                            {/* Closing Stock */}
                                            <td className="py-2 px-4 text-center font-black tabular-nums text-sm text-zinc-900 bg-stone-100/50 border-l-2 border-stone-300/50">
                                                {item.closingStock}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

const StatCard = ({ title, value, icon, bg, iconBg, description }) => (
    <div className={`border rounded-2xl p-4 flex flex-col relative overflow-hidden transition-all hover:shadow-md ${bg}`}>
        <div className="flex justify-between items-start mb-2 relative z-10">
            <h3 className="text-xs font-bold text-zinc-600 tracking-wide">{title}</h3>
            <div className={`p-2 rounded-xl ${iconBg}`}>
                {React.cloneElement(icon, { size: 18 })}
            </div>
        </div>
        <div className="mt-auto relative z-10">
            <h4 className="text-xl font-black text-zinc-900 tracking-tight mb-1">{value}</h4>
            <p className="text-[10px] font-medium text-zinc-500 leading-snug">{description}</p>
        </div>
        
        {/* Decorative background glow */}
        <div className="absolute -bottom-8 -right-8 w-24 h-24 bg-white/40 blur-2xl rounded-full z-0 pointer-events-none"></div>
    </div>
);

export default Reporting;
