import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { StaffRole } from '../types/auth';
import { X, UserPlus } from 'lucide-react';

interface CreateStaffModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function CreateStaffModal({ isOpen, onClose }: CreateStaffModalProps) {
    const { createStaff } = useAuth();

    const [name, setName] = useState('');
    const [staffCode, setStaffCode] = useState('');
    const [pin, setPin] = useState('');
    const [role, setRole] = useState<StaffRole>('dispenser');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccessMsg('');

        if (!name || !staffCode || !pin) {
            setError('Please fill in all required fields.');
            return;
        }

        try {
            setLoading(true);

            const isPharmacyStaff = ['admin', 'manager', 'pharmacist', 'dispenser'].includes(role);

            await createStaff({
                staffCode: staffCode.trim(),
                name: name.trim(),
                pin: pin.trim(),
                pinHash: pin.trim(),
                role: role,
                canAccessCounter: true,
                canAccessDispensary: isPharmacyStaff
            });

            setSuccessMsg(`Successfully created staff: ${name}`);
            setName('');
            setStaffCode('');
            setPin('');
            setRole('dispenser');

            setTimeout(() => {
                onClose();
                setSuccessMsg('');
            }, 1500);
        } catch (err: any) {
            setError('Failed to create staff. Staff Code might already exist or network error.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl max-w-md w-full p-6 text-white relative animate-in fade-in zoom-in duration-200">

                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-slate-400 hover:text-white transition cursor-pointer"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2.5 bg-blue-600/20 text-blue-400 rounded-lg border border-blue-500/30">
                        <UserPlus className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold">Add New Staff Account</h3>
                        <p className="text-xs text-slate-400">Create new Staff PIN and system permissions</p>
                    </div>
                </div>

                {error && (
                    <div className="mb-4 p-3 text-xs text-red-300 bg-red-900/40 border border-red-700 rounded-lg">
                        {error}
                    </div>
                )}

                {successMsg && (
                    <div className="mb-4 p-3 text-xs text-emerald-300 bg-emerald-900/40 border border-emerald-700 rounded-lg">
                        {successMsg}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1">User Name</label>
                        <input
                            type="text"
                            required
                            placeholder="e.g. John Doe"
                            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1">Staff Code</label>
                        <input
                            type="text"
                            required
                            placeholder="e.g. 102 or JD"
                            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            value={staffCode}
                            onChange={(e) => setStaffCode(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1">PIN / Password</label>
                        <input
                            type="password"
                            required
                            maxLength={8}
                            placeholder="2 to 8 characters"
                            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono text-sm tracking-widest focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            value={pin}
                            onChange={(e) => setPin(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1">Role Permission</label>
                        <select
                            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer"
                            value={role}
                            onChange={(e) => setRole(e.target.value as StaffRole)}
                        >
                            <option value="retail assistant">Retail Assistant</option>
                            <option value="dispenser">Dispenser</option>
                            <option value="pharmacist">Pharmacist</option>
                            <option value="manager">Manager</option>
                            <option value="admin">Admin</option>
                        </select>
                    </div>

                    <div className="pt-2 flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="w-1/2 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-200 font-medium rounded-lg transition text-sm cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-1/2 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg shadow-lg transition text-sm disabled:opacity-50 cursor-pointer"
                        >
                            {loading ? 'Creating...' : 'Confirm'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}