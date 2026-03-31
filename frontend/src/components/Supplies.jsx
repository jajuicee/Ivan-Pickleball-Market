import React, { useState } from 'react';
import Suppliers from './Suppliers';
import SupplyHistory from './SupplyHistory';
import { Building2, Truck } from 'lucide-react';

const Supplies = () => {
    const [activeTab, setActiveTab] = useState('history');

    return (
        <div className="flex flex-col h-full w-full">
            <div className="flex gap-4 mb-6 shrink-0">
                <button 
                    onClick={() => setActiveTab('history')}
                    className={`flex items-center gap-2 px-6 py-3 rounded-lg font-bold transition-all ${activeTab === 'history' ? 'bg-zinc-950 text-white shadow-md' : 'bg-white text-zinc-600 border border-stone-200 hover:bg-zinc-100'}`}
                >
                    <Truck size={18} /> Supply History
                </button>
                <button 
                    onClick={() => setActiveTab('suppliers')}
                    className={`flex items-center gap-2 px-6 py-3 rounded-lg font-bold transition-all ${activeTab === 'suppliers' ? 'bg-zinc-950 text-white shadow-md' : 'bg-white text-zinc-600 border border-stone-200 hover:bg-zinc-100'}`}
                >
                    <Building2 size={18} /> Supplier List
                </button>
            </div>
            
            <div className="flex-1 min-h-0">
                {activeTab === 'history' ? <SupplyHistory /> : <Suppliers />}
            </div>
        </div>
    );
};

export default Supplies;
