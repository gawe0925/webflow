import { useAuth } from '../context/AuthContext';
import { LogOut, User, ShieldCheck, UserCheck, Users } from 'lucide-react';

interface HeaderProps {
  useLocalFallback?: boolean;
  onOpenStaffManagement?: () => void; // 點擊開啟員工管理的 callback
}

export default function Header({ useLocalFallback = false, onOpenStaffManagement }: HeaderProps) {
  const { currentStaff, logoutStaff, hasRole } = useAuth();
  
  // 檢查是否為 Admin 或 Manager
  const canManage = hasRole(['admin', 'manager']);

  const handleLogout = () => {
    logoutStaff();
  };

  const getRoleBadge = (role?: string) => {
    switch (role?.toLowerCase()) {
      case 'admin':
        return {
          label: 'Admin (Full Access)',
          bg: 'bg-purple-50 text-purple-700 border-purple-200',
          icon: <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
        };
      case 'manager':
        return {
          label: 'Pharmacy Manager',
          bg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
          icon: <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
        };
      case 'pharmacist':
        return {
          label: 'Pharmacist',
          bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          icon: <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
        };
      case 'dispenser':
        return {
          label: 'Dispenser',
          bg: 'bg-blue-50 text-blue-700 border-blue-200',
          icon: <UserCheck className="w-3.5 h-3.5 text-blue-600" />
        };
      case 'retail assistant':
      case 'staff':
      default:
        return {
          label: 'Retail Assistant',
          bg: 'bg-slate-50 text-slate-700 border-slate-200',
          icon: <UserCheck className="w-3.5 h-3.5 text-slate-600" />
        };
    }
  };

  const badge = getRoleBadge(currentStaff?.role);

  return (
    <header className="flex-shrink-0 bg-white border-b border-slate-200 shadow-sm z-30">
      <div className="max-w-[1920px] mx-auto px-6 py-3">
        <div className="flex items-center justify-between">
          {/* 左側：品牌 Logo */}
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-lg font-bold tracking-tight text-slate-900">WebFlow</h1>
              <p className="text-[11px] font-medium text-slate-500">Webster-pak® Workflow Solutions</p>
            </div>
            {useLocalFallback && (
              <span className="ml-3 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 shadow-sm">
                Offline Mode
              </span>
            )}
          </div>

          {/* 右側：員工資訊與操作按鈕 */}
          <div className="flex items-center gap-4">
            {/* Admin 或 Manager 專屬：員工管理按鈕 */}
            {canManage && onOpenStaffManagement && (
              <button
                onClick={onOpenStaffManagement}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors border border-slate-200 flex items-center gap-1.5 cursor-pointer"
              >
                <Users className="w-4 h-4 text-slate-600" />
                <span>Staff Management</span>
              </button>
            )}

            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold ${badge.bg}`}>
              {badge.icon}
              <span>{badge.label}</span>
            </div>

            <div className="h-4 w-[1px] bg-slate-200" />

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
                <div className="w-6 h-6 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-xs">
                  {currentStaff?.name ? currentStaff.name.charAt(0).toUpperCase() : <User className="w-3.5 h-3.5" />}
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-xs font-bold text-slate-800 leading-tight">
                    {currentStaff?.name || 'Staff'}
                  </span>
                  <span className="text-[10px] font-medium text-slate-500 leading-tight">
                    Code: {currentStaff?.staffCode || 'N/A'}
                  </span>
                </div>
              </div>

              <button
                onClick={handleLogout}
                title="Switch Staff / Duty Logout"
                className="text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors px-2.5 py-1.5 rounded-lg hover:bg-slate-100 border border-slate-200 flex items-center gap-1.5 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}