import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

interface StaffLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const StaffLoginModal: React.FC<StaffLoginModalProps> = ({ isOpen, onClose }) => {
  const { staffList, loginStaff } = useAuth();
  const [selectedStaffCode, setSelectedStaffCode] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!selectedStaffCode) {
      setError('請選擇或輸入 Staff 代號');
      return;
    }

    const success = await loginStaff(selectedStaffCode, pin);
    if (success) {
      setPin('');
      onClose();
    } else {
      setError('PIN 碼不正確，請重新輸入');
      setPin('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between border-b pb-3">
          <h2 className="text-xl font-bold text-gray-800">Staff 快速切換 / 登入</h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-600 border border-red-200">
              {error}
            </div>
          )}

          {/* Staff 代號選擇 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Staff 代號 (Code)
            </label>
            <select
              value={selectedStaffCode}
              onChange={(e) => setSelectedStaffCode(e.target.value)}
              className="w-full rounded-lg border border-gray-300 p-2.5 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
            >
              <option value="">-- 請選擇 Staff --</option>
              {staffList
                .map((staff) => (
                  <option key={staff.id} value={staff.staffCode}>
                    {staff.staffCode} - {staff.name} ({staff.role})
                  </option>
                ))}
            </select>
          </div>

          {/* PIN 碼輸入 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              4 位數 PIN 碼
            </label>
            <input
              type="password"
              maxLength={4}
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="請輸入 PIN"
              className="w-full rounded-lg border border-gray-300 p-2.5 text-center text-2xl tracking-widest focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
              autoFocus
            />
          </div>

          {/* 按鈕組 */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors shadow-md"
            >
              確認登入
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};