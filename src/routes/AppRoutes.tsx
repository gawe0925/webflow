import { Routes, Route, Navigate } from 'react-router-dom';
import DashboardPage from '../pages/DashboardPage';
import PhotoUploadPage from '../pages/PhotoUploadPage';

export default function AppRoutes() {
  return (
    <Routes>
      {/* 主看板頁面 */}
      <Route path="/" element={<DashboardPage />} />

      {/* 手機掃 QR Code 上傳圖片的獨立頁面 */}
      <Route path="/upload/:taskId" element={<PhotoUploadPage />} />

      {/* 未定義路徑預設導回主頁 */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}