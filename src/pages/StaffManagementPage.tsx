// src/pages/StaffManagementPage.tsx
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { StaffMember, StaffRole } from '../types/auth';
import { Users, UserPlus, Shield, Edit2, Trash2, ArrowLeft, X, Store, CreditCard } from 'lucide-react';
import CreateStaffModal from '../components/CreateStaffModal';
import { getFirestore, doc, updateDoc, deleteDoc, collection, getDocs, query } from 'firebase/firestore';

interface StaffManagementPageProps {
  onBack?: () => void;
}

export default function StaffManagementPage({ onBack }: StaffManagementPageProps) {
  const { staffList, currentStaff } = useAuth();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);

  // 編輯 Modal 用的內部 State
  const [editName, setEditName] = useState('');
  const [editStaffCode, setEditStaffCode] = useState('');
  const [editPin, setEditPin] = useState('');
  const [editRole, setEditRole] = useState<StaffRole>('dispenser');
  const [isUpdating, setIsUpdating] = useState(false);

  // 📌 看板存取權限 State
  const [editCanAccessDispensary, setEditCanAccessDispensary] = useState<boolean>(true);
  const [editCanAccessCounter, setEditCanAccessCounter] = useState<boolean>(true);

  // 職位名稱對照顯示
  const roleDisplayNames: Record<StaffRole, string> = {
    'retail assistant': 'Retail Assistant',
    dispenser: 'Dispenser',
    pharmacist: 'Pharmacist',
    manager: 'Manager',
    admin: 'Admin',
  };

  // 1. Manager 視野過濾：若是 manager，過濾掉 admin 帳號；admin 則看全部
  const filteredStaffList = staffList.filter((staff) => {
    if (currentStaff?.role === 'manager') {
      return staff.role !== 'admin';
    }
    return true;
  });

  // 2. 刪除員工帳號（含 Admin 自我保護檢查）
  const handleDeleteStaff = async (staffId: string, staffName: string) => {
    if (currentStaff?.id === staffId) {
      alert('Security Protection: You cannot delete your own account while logged in.');
      return;
    }

    if (!window.confirm(`Are you sure you want to delete staff account: "${staffName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const db = getFirestore();
      await deleteDoc(doc(db, 'staff_members', staffId));
      alert(`Successfully deleted staff: ${staffName}`);
      window.location.reload();
    } catch (err) {
      console.error('Failed to delete staff:', err);
      alert('Failed to delete staff account.');
    }
  };

  // 開啟編輯 Modal 並代入資料與權限連動
  const handleOpenEdit = (staff: StaffMember) => {
    setEditingStaff(staff);
    setEditName(staff.name);
    setEditStaffCode(staff.staffCode);
    setEditPin(staff.pin || '');
    setEditRole(staff.role);

    // 開啟時依據當前角色或既有屬性初始化權限 state
    const isPharmacyStaff = ['admin', 'manager', 'pharmacist', 'dispenser'].includes(staff.role);
    setEditCanAccessDispensary(staff.canAccessDispensary ?? isPharmacyStaff);
    setEditCanAccessCounter(staff.canAccessCounter ?? true);
  };

  // 3. 儲存編輯後的員工資料（含 Staff Code 重複性檢查與權限欄位）
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff) return;

    const trimmedCode = editStaffCode.trim();

    try {
      setIsUpdating(true);
      const db = getFirestore();

      // 檢查 Staff Code 是否與其他人重複
      const q = query(collection(db, 'staff_members'));
      const querySnapshot = await getDocs(q);
      const isDuplicate = querySnapshot.docs.some((docSnap) => {
        const data = docSnap.data();
        return docSnap.id !== editingStaff.id && data.staffCode?.toLowerCase() === trimmedCode.toLowerCase();
      });

      if (isDuplicate) {
        alert(`Staff Code "${trimmedCode}" is already used by another staff member. Please use a different code.`);
        setIsUpdating(false);
        return;
      }

      const staffRef = doc(db, 'staff_members', editingStaff.id);
      await updateDoc(staffRef, {
        name: editName.trim(),
        staffCode: trimmedCode,
        pin: editPin.trim(),
        pinHash: editPin.trim(),
        role: editRole,
        canAccessDispensary: editCanAccessDispensary, // 👈 同步寫入數據庫
        canAccessCounter: editCanAccessCounter,       // 👈 同步寫入數據庫
      });

      alert('Staff member updated successfully!');
      setEditingStaff(null);
      window.location.reload();
    } catch (err) {
      console.error('Failed to update staff:', err);
      alert('Failed to update staff details.');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white p-6 antialiased">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Header 標題與操作按鈕 */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                onClick={onBack}
                className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 transition cursor-pointer"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div>
              <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                <Users className="w-6 h-6 text-blue-400" />
                Staff Accounts Management
              </h1>
              <p className="text-xs text-slate-400">Manage pharmacy staff credentials, roles, and system access permissions</p>
            </div>
          </div>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg shadow-md transition flex items-center gap-2 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add New Staff</span>
          </button>
        </div>

        {/* 員工列表表格 */}
        <div className="bg-slate-800 border border-slate-700/60 rounded-xl shadow-xl overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900/60 text-slate-400 text-[11px] uppercase tracking-wider border-b border-slate-700">
                <th className="py-3 px-4 font-semibold">Staff Code</th>
                <th className="py-3 px-4 font-semibold">Name</th>
                <th className="py-3 px-4 font-semibold">Role Permission</th>
                <th className="py-3 px-4 font-semibold">Access Stations</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700 text-sm">
              {filteredStaffList && filteredStaffList.length > 0 ? (
                filteredStaffList.map((staff) => {
                  const isPharmacyStaff = ['admin', 'manager', 'pharmacist', 'dispenser'].includes(staff.role);
                  const hasDispensary = staff.canAccessDispensary ?? isPharmacyStaff;
                  const hasCounter = staff.canAccessCounter ?? true;

                  return (
                    <tr key={staff.id} className="hover:bg-slate-700/40 transition">
                      <td className="py-3 px-4 font-mono font-medium text-blue-300">
                        {staff.staffCode}
                      </td>
                      <td className="py-3 px-4 font-medium text-white">
                        {staff.name}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-900 border border-slate-700 text-slate-300">
                          <Shield className="w-3 h-3 text-blue-400" />
                          {roleDisplayNames[staff.role] || staff.role}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {hasDispensary && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                              <Store className="w-3 h-3" />
                              Dispensary
                            </span>
                          )}
                          {hasCounter && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-blue-500/10 border border-blue-500/20 text-blue-400">
                              <CreditCard className="w-3 h-3" />
                              Counter
                            </span>
                          )}
                          {!hasDispensary && !hasCounter && (
                            <span className="text-xs text-slate-500 italic">No Access</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right space-x-2">
                        {/* 編輯按鈕 */}
                        <button
                          onClick={() => handleOpenEdit(staff)}
                          className="p-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition cursor-pointer"
                          title="Edit Staff"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        {/* 刪除按鈕 */}
                        <button
                          onClick={() => handleDeleteStaff(staff.id, staff.name)}
                          className="p-1.5 bg-red-600/20 hover:bg-red-600/40 text-red-300 rounded-lg transition border border-red-500/30 cursor-pointer"
                          title="Delete Staff"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500 text-xs">
                    No staff accounts found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* 新增員工 Modal */}
      <CreateStaffModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />

      {/* 編輯員工 Modal */}
      {editingStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl max-w-md w-full p-6 text-white relative">
            <button
              onClick={() => setEditingStaff(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-bold mb-1">Edit Staff Account</h3>
            <p className="text-xs text-slate-400 mb-6">Modify credentials and permissions for {editingStaff.name}</p>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">User Name</label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Staff Code</label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  value={editStaffCode}
                  onChange={(e) => setEditStaffCode(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">PIN / Password</label>
                <input
                  type="text"
                  required
                  maxLength={8}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono text-sm tracking-widest focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  value={editPin}
                  onChange={(e) => setEditPin(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Role Permission</label>
                <select
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer"
                  value={editRole}
                  onChange={(e) => {
                    const newRole = e.target.value as StaffRole;
                    setEditRole(newRole);

                    // 判斷是否為主要配藥/管理人員
                    const isPharmacyStaff = ['admin', 'manager', 'pharmacist', 'dispenser'].includes(newRole);

                    // 自動連動預設看板存取權限
                    setEditCanAccessDispensary(isPharmacyStaff);
                    setEditCanAccessCounter(true);
                  }}
                >
                  <option value="retail assistant">Retail Assistant</option>
                  <option value="dispenser">Dispenser</option>
                  <option value="pharmacist">Pharmacist</option>
                  <option value="manager">Manager</option>
                  {currentStaff?.role === 'admin' && <option value="admin">Admin</option>}
                </select>
              </div>

              {/* 📌 看板存取權限手動勾選設定 */}
              <div className="pt-2 border-t border-slate-700/60">
                <label className="block text-xs font-semibold text-slate-300 mb-2 uppercase tracking-wider">
                  Station Access Permissions
                </label>
                <div className="space-y-2 bg-slate-900/60 p-3 rounded-lg border border-slate-700">
                  <label className="flex items-center justify-between cursor-pointer">
                    <div className="flex items-center gap-2">
                      <Store className="w-4 h-4 text-emerald-400" />
                      <span className="text-xs font-medium text-slate-200">Dispensary Station</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={editCanAccessDispensary}
                      onChange={(e) => setEditCanAccessDispensary(e.target.checked)}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 bg-slate-800 border-slate-600 cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between cursor-pointer">
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-blue-400" />
                      <span className="text-xs font-medium text-slate-200">Counter Station</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={editCanAccessCounter}
                      onChange={(e) => setEditCanAccessCounter(e.target.checked)}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 bg-slate-800 border-slate-600 cursor-pointer"
                    />
                  </label>
                </div>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setEditingStaff(null)}
                  className="w-1/2 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-200 font-medium rounded-lg transition text-sm cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="w-1/2 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg shadow-lg transition text-sm disabled:opacity-50 cursor-pointer"
                >
                  {isUpdating ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}