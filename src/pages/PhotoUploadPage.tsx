// pages/PhotoUploadPage.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../firebase';
import { Upload, CheckCircle2, Loader2, AlertCircle, Clock } from 'lucide-react';

export default function PhotoUploadPage() {
  const { taskId } = useParams<{ taskId: string }>();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isTokenExpired, setIsTokenExpired] = useState(false);

  // 🔑 驗證 3 分鐘 Token 是否過期
  useEffect(() => {
    if (!token) {
      setIsTokenExpired(true);
      setError('Missing security token.');
      return;
    }

    try {
      const payload = JSON.parse(atob(token));
      if (Date.now() > payload.exp) {
        setIsTokenExpired(true);
        setError('Upload link/QR code has expired. Please scan a new one from the desktop screen.');
      }
    } catch (e) {
      setIsTokenExpired(true);
      setError('Invalid security token.');
    }
  }, [token]);

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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !taskId || isTokenExpired) return;

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
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg border border-slate-200 p-6 text-center space-y-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Patient Attachment Upload</h2>
          <p className="text-xs text-slate-500 mt-1">
            Patient ID: <span className="font-mono font-bold bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-slate-800">{taskId}</span>
          </p>
        </div>

        {/* ❌ Token 過期或錯誤提示 */}
        {isTokenExpired ? (
          <div className="p-6 bg-amber-50 rounded-xl border border-amber-200 space-y-3">
            <Clock className="w-10 h-10 text-amber-600 mx-auto" />
            <h3 className="font-bold text-amber-900">Link Expired</h3>
            <p className="text-xs text-amber-700 leading-relaxed">
              {error || 'This upload link has expired. Please refresh the QR code on the desktop app and scan again.'}
            </p>
          </div>
        ) : error ? (
          <div className="p-3 bg-red-50 text-red-600 rounded-lg text-xs flex items-center justify-center gap-2 text-left">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}

        {/* 🟢 上傳成功 */}
        {success ? (
          <div className="p-6 bg-emerald-50 rounded-xl border border-emerald-200 space-y-2">
            <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
            <h3 className="font-bold text-emerald-800">Photo Uploaded Successfully!</h3>
            <p className="text-xs text-emerald-600">The attachment has been saved directly to the patient record.</p>
          </div>
        ) : (
          !isTokenExpired && (
            <label className={`w-full py-4 px-6 rounded-xl font-semibold text-white shadow-md flex items-center justify-center gap-2 transition cursor-pointer ${uploading ? 'bg-slate-400 cursor-not-allowed' : 'bg-slate-800 hover:bg-slate-900 active:scale-95'}`}>
              {uploading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Processing & Saving...</span>
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5" />
                  <span>Select or Take Photo</span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment" // 👈 讓手機點擊時優先觸發後鏡頭拍照
                    className="hidden"
                    disabled={uploading}
                    onChange={handleFileChange}
                  />
                </>
              )}
            </label>
          )
        )}
      </div>
    </div>
  );
}