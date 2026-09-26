// App.tsx
import { useAuth } from './context/AuthContext';
import FirebaseLoginPage from './pages/FirebaseLoginPage';
import StaffPinPage from './pages/StaffPinPage';
import DashboardPage from './pages/DashboardPage';
import PhotoUploadPage from './pages/PhotoUploadPage';

export default function App() {
  const { firebaseUser, isFirebaseLoading, currentStaff } = useAuth();

  // 0. 特殊通道：判斷是否為手機掃碼上傳頁面 (免登入 Bypass)
  const pathname = window.location.pathname;
  const searchParams = new URLSearchParams(window.location.search);
  const uploadToken = searchParams.get('token');

  // 📌 從 `/upload/{taskId}` 網址中提取真正的 taskId
  if (pathname.startsWith('/upload/')) {
    const taskId = pathname.replace('/upload/', '').trim();

    if (taskId && uploadToken) {
      return <PhotoUploadPage taskId={taskId} rawToken={uploadToken} />;
    }
  }

  // 1. 載入 Firestore / Auth 初始狀態中
  if (isFirebaseLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-900 text-white font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-slate-600 border-t-white rounded-full animate-spin" />
          <p className="text-sm font-medium text-slate-400">Initializing Pharmacy Workspace...</p>
        </div>
      </div>
    );
  }

  // 2. 第一道關卡：藥局/門市帳號登入 (Firebase Auth)
  if (!firebaseUser) {
    return <FirebaseLoginPage />;
  }

  // 3. 第二道關卡：當班員工代號與 PIN 驗證 (Staff Verification)
  if (!currentStaff) {
    return <StaffPinPage />;
  }

  // 4. 兩道關卡皆通過：進入主看板
  return <DashboardPage />;
}