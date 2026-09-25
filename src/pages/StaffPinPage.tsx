// src/pages/StaffPinPage.tsx
import React, { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserCheck, KeyRound, LogOut, AlertCircle, Users, UserPlus } from 'lucide-react';
import CreateStaffModal from '../components/CreateStaffModal';

export default function StaffPinPage() {
  const { staffList, loginStaff, logoutFirebase, firebaseUser } = useAuth();
  const [staffCode, setStaffCode] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isCreateStaffModalOpen, setIsCreateStaffModalOpen] = useState(false);

  const pinInputRef = useRef<HTMLInputElement>(null);

  // 嚴格檢查是否為 Admin 帳號 (信箱為 admin@gmail.com 或指定的 UID)
  const isAdminUser = 
    firebaseUser?.email === 'admin@gmail.com' || 
    firebaseUser?.uid === 'BGvyxrszAOOln9bO4XQWW735drz1';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffCode || !pin) {
      setError('Please enter both Staff Code and PIN.');
      return;
    }

    setError(null);
    setLoading(true);

    const success = await loginStaff(staffCode, pin);
    if (!success) {
      setError('Invalid Staff Code or PIN.');
    }
    setLoading(false);
  };

  const handleQuickSelect = (code: string) => {
    setStaffCode(code);
    setError(null);
    // 自動 focus 到 PIN 輸入框
    if (pinInputRef.current) {
      pinInputRef.current.focus();
    }
  };

  return (
    <div className="min-h-screen w-screen bg-slate-900 flex items-center justify-center p-4 antialiased">
      <div className="max-w-md w-full bg-slate-800 rounded-2xl shadow-2xl border border-slate-700/60 p-8 space-y-6 relative">
        
        {/* Header Branding */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-slate-700 text-slate-100 border border-slate-600 mb-2">
            <UserCheck className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Duty Verification</h1>
          <p className="text-xs font-medium text-slate-400">
            System Level 2: Staff Identification & PIN
          </p>
        </div>

        {/* Admin Only: Create Staff Action Banner / Button */}
        {isAdminUser && (
          <div className="bg-blue-900/30 border border-blue-500/30 rounded-xl p-3.5 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-blue-300">Admin Mode Detected</p>
              <p className="text-[11px] text-slate-400">You can create new staff accounts here.</p>
            </div>
            <button
              type="button"
              onClick={() => setIsCreateStaffModalOpen(true)}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              Add Staff
            </button>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3.5 flex items-start gap-3 text-red-400 text-xs font-medium">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Quick Select active staff if available */}
        {staffList.length > 0 && (
          <div className="space-y-2">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" /> Active Staff List
            </label>
            <div className="flex flex-wrap gap-2">
              {staffList.map(staff => (
                <button
                  key={staff.id}
                  type="button"
                  onClick={() => handleQuickSelect(staff.staffCode)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                    staffCode.toLowerCase() === staff.staffCode.toLowerCase()
                      ? 'bg-white text-slate-900 border-white shadow-sm'
                      : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-500'
                  }`}
                >
                  {staff.name} ({staff.staffCode})
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Staff Code / Initial
            </label>
            <input
              type="text"
              required
              value={staffCode}
              onChange={(e) => setStaffCode(e.target.value.toUpperCase())}
              placeholder="e.g. PH1 or ST01"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2.5 px-4 text-sm text-white uppercase placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500 transition-all font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Personal Security PIN
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                ref={pinInputRef}
                type="password"
                required
                maxLength={8}
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="••••"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500 transition-all font-mono"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 bg-white text-slate-900 hover:bg-slate-100 font-bold py-2.5 rounded-xl transition-all shadow-md text-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
            ) : (
              <span>Confirm & Enter Workspace</span>
            )}
          </button>
        </form>

        <div className="pt-2 text-center border-t border-slate-700/50 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">Store Authenticated</span>
          <button
            type="button"
            onClick={logoutFirebase}
            className="text-xs text-slate-400 hover:text-red-400 font-semibold flex items-center gap-1 cursor-pointer transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Store Logout
          </button>
        </div>
      </div>

      {/* 建立員工 Modal（僅限 Admin 能透過此畫面開啟並送出） */}
      <CreateStaffModal
        isOpen={isCreateStaffModalOpen}
        onClose={() => setIsCreateStaffModalOpen(false)}
      />
    </div>
  );
}