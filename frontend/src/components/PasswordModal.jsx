import React, { useState } from 'react';
import { Lock, X, AlertCircle } from 'lucide-react';

const PasswordModal = ({ onConfirm, onCancel, title = 'Authentication Required' }) => {
    const [password, setPassword] = useState('');
    const [error, setError] = useState(false);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (password === 'slippers83') {
            onConfirm();
        } else {
            setError(true);
            setPassword('');
        }
    };

    return (
        <div className="fixed inset-0 bg-zinc-950/60 z-[200] flex items-center justify-center p-4 backdrop-blur-sm" style={{ animation: 'fadeSlideIn 150ms ease' }}>
            <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm border border-stone-200">
                <div className="flex items-center gap-3 mb-5 pb-4 border-b border-stone-100">
                    <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center">
                        <Lock size={18} className="text-zinc-700" />
                    </div>
                    <div>
                        <h3 className="font-bold text-zinc-900 text-base">{title}</h3>
                        <p className="text-xs text-zinc-500">Please enter the admin password</p>
                    </div>
                    <button onClick={onCancel} className="ml-auto text-zinc-400 hover:text-red-500"><X size={20} /></button>
                </div>
                
                <form onSubmit={handleSubmit}>
                    <input 
                        type="password"
                        autoFocus
                        value={password}
                        onChange={e => { setPassword(e.target.value); setError(false); }}
                        placeholder="Password"
                        className={`w-full px-4 py-3 bg-stone-50 border ${error ? 'border-red-400 focus:ring-red-500' : 'border-stone-200 focus:ring-zinc-900'} rounded-xl text-sm font-medium outline-none focus:ring-2`}
                    />
                    {error && (
                        <p className="text-red-500 text-xs mt-2 flex items-center gap-1 font-medium">
                            <AlertCircle size={12} /> Incorrect password
                        </p>
                    )}
                    
                    <div className="flex gap-3 mt-6">
                        <button type="button" onClick={onCancel} className="flex-1 px-4 py-2.5 text-sm font-bold border border-stone-200 text-zinc-600 rounded-xl hover:bg-stone-50">
                            Cancel
                        </button>
                        <button type="submit" disabled={!password} className="flex-1 px-4 py-2.5 text-sm font-bold bg-zinc-900 text-white rounded-xl hover:bg-zinc-800 disabled:opacity-40">
                            Confirm
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default PasswordModal;
