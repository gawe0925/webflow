// src/routes/AppRoutes.tsx
import { Routes, Route, Navigate, useParams, useSearchParams } from 'react-router-dom';
import DashboardPage from '../pages/DashboardPage';
import PhotoUploadPage from '../pages/PhotoUploadPage';

// 📌 Wrapper 元件：從 React Router 解析 taskId 與 query string token 後傳給 PhotoUploadPage
function PhotoUploadPageWrapper() {
  const { taskId } = useParams<{ taskId: string }>();
  const [searchParams] = useSearchParams();
  const rawToken = searchParams.get('token') || '';

  return <PhotoUploadPage taskId={taskId || ''} rawToken={rawToken} />;
}

export default function AppRoutes() {
  return (
    <Routes>
      {/* 主看板頁面 */}
      <Route path="/" element={<DashboardPage />} />

      {/* 手機掃 QR Code 上傳圖片的獨立頁面 */}
      <Route path="/upload/:taskId" element={<PhotoUploadPageWrapper />} />

      {/* 未定義路徑預設導回主頁 */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}