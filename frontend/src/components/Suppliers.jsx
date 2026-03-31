import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Building2, Plus, Pencil, Trash2, X, Save, CheckCircle, AlertCircle, Phone, FileText } from 'lucide-react';

const API = `http://${window.location.hostname}:8080/api/suppliers`;

const emptyForm = { name: '', contactInfo: '', notes: '' };

const Suppliers = () => {
    const [suppliers, setSuppliers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState(null); // null | { mode: 'add'|'edit', data: {} }
    const [form, setForm] = useState(emptyForm);
    const [status, setStatus] = useState({ type: '', message: '' });
    const [deleteConfirm, setDeleteConfirm] = useState(null); // supplier id

    const fetchSuppliers = async () => {
        setLoading(true);
        try {
            const res = await axios.get(API);
            setSuppliers(res.data);
        } catch (err) {
            console.error('Failed to load suppliers', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchSuppliers(); }, []);

    const openAdd = () => {
        setForm(emptyForm);
        setStatus({ type: '', message: '' });
        setModal({ mode: 'add' });
    };

    const openEdit = (s) => {
        setForm({ name: s.name, contactInfo: s.contactInfo || '', notes: s.notes || '' });
        setStatus({ type: '', message: '' });
        setModal({ mode: 'edit', id: s.id });
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setStatus({ type: '', message: '' });
        try {
            if (modal.mode === 'add') {
                await axios.post(API, form);
                setStatus({ type: 'success', message: 'Supplier added!' });
            } else {
                await axios.put(`${API}/${modal.id}`, form);
                setStatus({ type: 'success', message: 'Supplier updated!' });
            }
            await fetchSuppliers();
            setTimeout(() => setModal(null), 1000);
        } catch (err) {
            setStatus({ type: 'error', message: err.response?.data?.error || 'Failed to save.' });
        }
    };

    const handleDelete = async (id) => {
        try {
            await axios.delete(`${API}/${id}`);
            setDeleteConfirm(null);
            fetchSuppliers();
        } catch (err) {
            alert('Failed to delete supplier.');
        }
    };

    return (
        <div className="flex flex-col h-full">
            {/* HEADER */}
            <div className="flex justify-between items-center mb-6 shrink-0">
                <h2 className="text-2xl font-bold text-zinc-800 flex items-center gap-2">
                    <Building2 className="text-zinc-500" /> Suppliers
                    {!loading && (
                        <span className="ml-2 text-sm font-normal text-zinc-400">{suppliers.length} registered</span>
                    )}
                </h2>
                <button
                    onClick={openAdd}
                    className="flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white rounded-xl text-sm font-bold hover:bg-zinc-700 transition-colors shadow-sm"
                >
                    <Plus size={16} /> Add Supplier
                </button>
            </div>

            {/* TABLE */}
            <div className="flex-1 overflow-auto bg-white border border-stone-200 rounded-xl shadow-sm">
                <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-stone-100 shadow-sm z-10 text-xs uppercase tracking-wider text-zinc-500 font-bold border-b border-stone-200">
                        <tr>
                            <th className="px-6 py-4">Name</th>
                            <th className="px-6 py-4">Contact Info</th>
                            <th className="px-6 py-4">Notes</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 text-sm">
                        {loading ? (
                            Array.from({ length: 4 }).map((_, i) => (
                                <tr key={i} className="animate-pulse">
                                    {[0,1,2,3].map(j => (
                                        <td key={j} className="px-6 py-4">
                                            <div className="h-4 bg-stone-200 rounded w-3/4" />
                                        </td>
                                    ))}
                                </tr>
                            ))
                        ) : suppliers.length > 0 ? suppliers.map(s => (
                            <tr key={s.id} className="hover:bg-stone-50 transition-colors group">
                                <td className="px-6 py-4 font-bold text-zinc-800 flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-black text-xs shrink-0">
                                        {s.name.charAt(0).toUpperCase()}
                                    </div>
                                    {s.name}
                                </td>
                                <td className="px-6 py-4 text-zinc-600">
                                    {s.contactInfo ? (
                                        <span className="flex items-center gap-1.5">
                                            <Phone size={13} className="text-zinc-400" /> {s.contactInfo}
                                        </span>
                                    ) : <span className="text-zinc-300">—</span>}
                                </td>
                                <td className="px-6 py-4 text-zinc-500 max-w-xs truncate">
                                    {s.notes ? (
                                        <span className="flex items-center gap-1.5">
                                            <FileText size={13} className="text-zinc-400" /> {s.notes}
                                        </span>
                                    ) : <span className="text-zinc-300">—</span>}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => openEdit(s)}
                                            className="p-1.5 rounded-lg hover:bg-blue-50 text-zinc-400 hover:text-blue-600 transition-colors"
                                            title="Edit"
                                        >
                                            <Pencil size={16} />
                                        </button>
                                        <button
                                            onClick={() => setDeleteConfirm(s.id)}
                                            className="p-1.5 rounded-lg hover:bg-red-50 text-zinc-400 hover:text-red-600 transition-colors"
                                            title="Delete"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan="4" className="px-6 py-16 text-center text-zinc-400">
                                    <Building2 size={40} className="mx-auto mb-3 opacity-30" />
                                    <p className="font-bold">No suppliers yet</p>
                                    <p className="text-sm mt-1">Add your first supplier to start tracking stock origin.</p>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* ADD / EDIT MODAL */}
            {modal && (
                <div className="fixed inset-0 bg-zinc-950/60 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="px-6 py-4 border-b border-stone-200 flex justify-between items-center bg-stone-50">
                            <h3 className="font-bold text-zinc-800 flex items-center gap-2">
                                <Building2 size={18} />
                                {modal.mode === 'add' ? 'Add Supplier' : 'Edit Supplier'}
                            </h3>
                            <button onClick={() => setModal(null)} className="text-zinc-400 hover:text-red-500"><X size={20} /></button>
                        </div>

                        <form onSubmit={handleSave} className="p-6 space-y-4">
                            {status.message && (
                                <div className={`p-3 rounded-lg text-sm flex items-center gap-2 ${status.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                                    {status.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                                    <span className="font-medium">{status.message}</span>
                                </div>
                            )}
                            <div>
                                <label className="block text-sm font-bold text-zinc-700 mb-1">Supplier Name *</label>
                                <input
                                    required
                                    type="text"
                                    value={form.name}
                                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                    className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-zinc-900 outline-none"
                                    placeholder="e.g., JOOLA Philippines"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-zinc-700 mb-1">Contact Info</label>
                                <input
                                    type="text"
                                    value={form.contactInfo}
                                    onChange={e => setForm(f => ({ ...f, contactInfo: e.target.value }))}
                                    className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-zinc-900 outline-none"
                                    placeholder="Phone, email, etc."
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-zinc-700 mb-1">Notes</label>
                                <textarea
                                    value={form.notes}
                                    onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                                    rows={3}
                                    className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-zinc-900 outline-none resize-none"
                                    placeholder="Payment terms, delivery schedule, etc."
                                />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setModal(null)} className="flex-1 px-4 py-2 border border-stone-300 rounded-xl font-bold text-zinc-600 hover:bg-stone-50">Cancel</button>
                                <button type="submit" className="flex-1 px-4 py-2 bg-zinc-900 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-zinc-700">
                                    <Save size={16} /> Save
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* DELETE CONFIRM */}
            {deleteConfirm && (
                <div className="fixed inset-0 bg-zinc-950/60 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm text-center">
                        <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Trash2 size={24} className="text-red-600" />
                        </div>
                        <h3 className="font-bold text-zinc-900 text-lg mb-1">Delete Supplier?</h3>
                        <p className="text-sm text-zinc-500 mb-5">This will not delete the stock batches linked to this supplier.</p>
                        <div className="flex gap-3">
                            <button onClick={() => setDeleteConfirm(null)} className="flex-1 px-4 py-2 border border-stone-300 rounded-xl font-bold text-zinc-600 hover:bg-stone-50">Cancel</button>
                            <button onClick={() => handleDelete(deleteConfirm)} className="flex-1 px-4 py-2 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700">Delete</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Suppliers;
