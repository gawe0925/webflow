// pages/PhotoUploadPage.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../firebase';
import { verifySignedToken } from '../utils/security';
import { Upload, CheckCircle2, Loader2, AlertCircle, ShieldAlert, RefreshCw } from 'lucide-react';

export default function PhotoUploadPage() {
  const { taskId } = useParams<{ taskId: string }>();
  const [searchParams] = useSearchParams();
  const rawToken = searchParams.get('token');

  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isTokenValid, setIsTokenValid] = useState<boolean | null>(null); // null 代表初始化檢查中

  const fileInputRef = useRef<HTMLInputElement>(null);

  // 🛡️ 每次網址上的 rawToken 或 taskId 變動（或重新整理）時，重新進行驗證
  useEffect(() => {
    if (!rawToken) {
      setIsTokenValid(false);
      setError('Missing upload token in URL.');
      return;
    }

    // 直接將 URL 上的 rawToken 帶入驗證
    const result = verifySignedToken(rawToken);

    if (!result.valid) {
      setIsTokenValid(false);
      // 💡 顯示詳細的除錯原因
      setError(result.reason || 'Invalid or expired access token.');
    } else if (result.taskId !== taskId) {
      setIsTokenValid(false);
      setError(`Task ID Mismatch: URL is [${taskId}], Token is [${result.taskId}]`);
    } else {
      setIsTokenValid(true);
      setError(null);
    }
  }, [rawToken, taskId]);

  // 壓縮圖片並轉換為 Base64
  const compressAndConvertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 1000;
          let width = img.width;
          let height = img.height;

          if (width > MAX_WIDTH) {
            height = Math.round((height * MAX_WIDTH) / width);
            width = MAX_WIDTH;
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);

          const base64 = canvas.toDataURL('image/jpeg', 0.6);
          resolve(base64);
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  // 觸發原生檔案選擇/拍照元件
  const handleButtonClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !taskId || !isTokenValid) return;

    setUploading(true);
    setError(null);

    try {
      if (!db) {
        throw new Error('Firestore is not initialized.');
      }

      const base64Image = await compressAndConvertToBase64(file);

      const patientRef = doc(db, 'patients', taskId);
      await updateDoc(patientRef, {
        attachments: arrayUnion(base64Image)
      });

      setSuccess(true);
    } catch (err: any) {
      console.error('Upload failed:', err);
      setError(err?.message || 'Failed to upload photo. Please try again.');
    } finally {
      setUploading(false);
      // 清空 input 值，讓使用者若選擇同一張照片也能重複觸發 onChange
      if (e.target) {
        e.target.value = '';
      }
    }
  };

  // 畫面載入中狀態
  if (isTokenValid === null) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <Loader2 className="w-8 h-8 animate-spin text-slate-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg border border-slate-200 p-6 text-center space-y-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Patient Attachment Upload</h2>
          <p className="text-xs text-slate-500 mt-1">
            Patient ID: <span className="font-mono font-bold bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-slate-800">{taskId}</span>
          </p>
        </div>

        {/* ❌ 簽名無效、過期或經篡改提示 */}
        {!isTokenValid ? (
          <div className="p-6 bg-amber-50 rounded-xl border border-amber-200 space-y-4">
            <ShieldAlert className="w-10 h-10 text-amber-600 mx-auto" />
            <div>
              <h3 className="font-bold text-amber-900">Access Denied / Expired</h3>
              <p className="text-xs text-amber-700 leading-relaxed mt-1">
                {error}
              </p>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-amber-600 text-white text-xs font-semibold rounded-lg hover:bg-amber-700 transition flex items-center justify-center gap-1.5 mx-auto"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Re-check / Refresh
            </button>
          </div>
        ) : error ? (
          <div className="p-3 bg-red-50 text-red-600 rounded-lg text-xs flex items-center justify-center gap-2 text-left">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}

        {/* 🟢 上傳成功 */}
        {success ? (
          <div className="p-6 bg-emerald-50 rounded-xl border border-emerald-200 space-y-3">
            <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
            <h3 className="font-bold text-emerald-800">Photo Uploaded Successfully!</h3>
            <p className="text-xs text-emerald-600">The attachment has been saved directly to the patient record.</p>
            <button
              onClick={() => setSuccess(false)}
              className="mt-2 px-4 py-2 bg-emerald-600 text-white text-xs font-medium rounded-lg hover:bg-emerald-700 transition"
            >
              Upload Another Photo
            </button>
          </div>
        ) : (
          isTokenValid && (
            <div>
              {/* 採用按鈕主動觸發，解決手機 `<label>` 點擊沒反應的問題 */}
              <button
                type="button"
                onClick={handleButtonClick}
                disabled={uploading}
                className={`w-full py-4 px-6 rounded-xl font-semibold text-white shadow-md flex items-center justify-center gap-2 transition cursor-pointer ${uploading ? 'bg-slate-400 cursor-not-allowed' : 'bg-slate-800 hover:bg-slate-900 active:scale-95'
                  }`}
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Processing & Saving...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5" />
                    <span>Select or Take Photo</span>
                  </>
                )}
              </button>

              {/* 隱藏的 input，支援一般上傳與相機拍照 */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment" // 👈 新增：點擊時優先開啟手機後置相機
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          )
        )}
      </div>
    </div>
  );
}