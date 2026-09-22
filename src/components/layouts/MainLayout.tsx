import React, { useState } from 'react';
import Header from '../Header';
import StaffManagementPage from '../../pages/StaffManagementPage'; // 引入你的員工管理頁面

interface MainLayoutProps {
  children: React.ReactNode;
  useLocalFallback?: boolean;
}

export default function MainLayout({ children, useLocalFallback = false }: MainLayoutProps) {
  // 控制是否顯示員工管理畫面的 State
  const [isStaffManagementOpen, setIsStaffManagementOpen] = useState(false);

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-slate-50 text-slate-800 font-sans antialiased">
      {/* 頂部導覽列，並傳入開啟員工管理的 callback */}
      <Header 
        useLocalFallback={useLocalFallback} 
        onOpenStaffManagement={() => setIsStaffManagementOpen(true)} 
      />

      {/* 主要內容區域 */}
      <main className="flex-1 min-h-0 overflow-hidden relative">
        {children}
      </main>

      {/* 當點擊 Staff Management 時跳出的員工管理畫面 / Modal */}
      {isStaffManagementOpen && (
        <div className="absolute inset-0 z-50 bg-slate-900 overflow-y-auto">
          <StaffManagementPage 
            onBack={() => setIsStaffManagementOpen(false)} 
          />
        </div>
      )}
    </div>
  );
}