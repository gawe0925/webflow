// pages/PhotoUploadPage.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../firebase';
import { verifySignedToken } from '../utils/security'; // 👈 改用 HMAC 安全驗證工具
import { Upload, CheckCircle2, Loader2, AlertCircle, ShieldAlert } from 'lucide-react'; // 👈 換上 ShieldAlert 圖示[cite: 5]

export default function PhotoUploadPage() {
  const { taskId } = useParams<{ taskId: string }>(); //[cite: 5]
  const [searchParams] = useSearchParams(); //[cite: 5]
  const token = searchParams.get('token'); //[cite: 5]

  const [uploading, setUploading] = useState(false); //[cite: 5]
  const [success, setSuccess] = useState(false); //[cite: 5]
  const [error, setError] = useState<string | null>(null); //[cite: 5]
  const [isTokenValid, setIsTokenValid] = useState(true);

  // 🛡️ 使用 HMAC-SHA256 驗證 Token 是否被篡改或過期
  useEffect(() => {
    const result = verifySignedToken(token);

    if (!result.valid) {
      setIsTokenValid(false);
      setError(result.reason || 'Invalid or expired access token.');
    } else if (result.taskId !== taskId) {
      setIsTokenValid(false);
      setError('Token does not match the requested patient record.');
    } else {
      setIsTokenValid(true);
      setError(null);
    }
  }, [token, taskId]);

  // 壓縮圖片並轉換為 Base64 (維持在 300KB 以內以符合 Firestore 1MB 上限)[cite: 5]
  const compressAndConvertToBase64 = (file: File): Promise<string> => { //[cite: 5]
    return new Promise((resolve, reject) => { //[cite: 5]
      const reader = new FileReader(); //[cite: 5]
      reader.readAsDataURL(file); //[cite: 5]
      reader.onload = (event) => { //[cite: 5]
        const img = new Image(); //[cite: 5]
        img.src = event.target?.result as string; //[cite: 5]
        img.onload = () => { //[cite: 5]
          const canvas = document.createElement('canvas'); //[cite: 5]
          const MAX_WIDTH = 1000; //[cite: 5]
          let width = img.width; //[cite: 5]
          let height = img.height; //[cite: 5]

          if (width > MAX_WIDTH) { //[cite: 5]
            height = Math.round((height * MAX_WIDTH) / width); //[cite: 5]
            width = MAX_WIDTH; //[cite: 5]
          }

          canvas.width = width; //[cite: 5]
          canvas.height = height; //[cite: 5]

          const ctx = canvas.getContext('2d'); //[cite: 5]
          ctx?.drawImage(img, 0, 0, width, height); //[cite: 5]

          // 壓縮為 JPEG, 品質 0.6[cite: 5]
          const base64 = canvas.toDataURL('image/jpeg', 0.6); //[cite: 5]
          resolve(base64); //[cite: 5]
        };
        img.onerror = (err) => reject(err); //[cite: 5]
      };
      reader.onerror = (err) => reject(err); //[cite: 5]
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => { //[cite: 5]
    const file = e.target.files?.[0]; //[cite: 5]
    if (!file || !taskId || !isTokenValid) return; //[cite: 5]

    setUploading(true); //[cite: 5]
    setError(null); //[cite: 5]

    try {
      if (!db) { //[cite: 5]
        throw new Error('Firestore is not initialized.'); //[cite: 5]
      }

      // 1. 壓縮圖片為 Base64[cite: 5]
      const base64Image = await compressAndConvertToBase64(file); //[cite: 5]

      // 2. 存入 Firestore attachments 陣列欄位[cite: 5]
      const patientRef = doc(db, 'patients', taskId); //[cite: 5]
      await updateDoc(patientRef, { //[cite: 5]
        attachments: arrayUnion(base64Image) //[cite: 5]
      });

      setSuccess(true); //[cite: 5]
    } catch (err: any) { //[cite: 5]
      console.error('Upload failed:', err); //[cite: 5]
      setError(err?.message || 'Failed to upload photo. Please try again.'); //[cite: 5]
    } finally {
      setUploading(false); //[cite: 5]
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4"> {/*[cite: 5] */}
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg border border-slate-200 p-6 text-center space-y-6"> {/*[cite: 5] */}
        <div>
          <h2 className="text-xl font-bold text-slate-900">Patient Attachment Upload</h2> {/*[cite: 5] */}
          <p className="text-xs text-slate-500 mt-1"> {/*[cite: 5] */}
            Patient ID: <span className="font-mono font-bold bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-slate-800">{taskId}</span> {/*[cite: 5] */}
          </p>
        </div>

        {/* ❌ 簽名無效、過期或經篡改提示 */}
        {!isTokenValid ? (
          <div className="p-6 bg-amber-50 rounded-xl border border-amber-200 space-y-3">
            <ShieldAlert className="w-10 h-10 text-amber-600 mx-auto" />
            <h3 className="font-bold text-amber-900">Access Denied</h3>
            <p className="text-xs text-amber-700 leading-relaxed">
              {error}
            </p>
          </div>
        ) : error ? ( //[cite: 5]
          <div className="p-3 bg-red-50 text-red-600 rounded-lg text-xs flex items-center justify-center gap-2 text-left"> {/*[cite: 5] */}
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {/*[cite: 5] */}
            <span>{error}</span> {/*[cite: 5] */}
          </div>
        ) : null}

        {/* 🟢 上傳成功 */}
        {success ? ( //[cite: 5]
          <div className="p-6 bg-emerald-50 rounded-xl border border-emerald-200 space-y-2"> {/*[cite: 5] */}
            <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" /> {/*[cite: 5] */}
            <h3 className="font-bold text-emerald-800">Photo Uploaded Successfully!</h3> {/*[cite: 5] */}
            <p className="text-xs text-emerald-600">The attachment has been saved directly to the patient record.</p> {/*[cite: 5] */}
          </div>
        ) : (
          isTokenValid && (
            <label className={`w-full py-4 px-6 rounded-xl font-semibold text-white shadow-md flex items-center justify-center gap-2 transition cursor-pointer ${uploading ? 'bg-slate-400 cursor-not-allowed' : 'bg-slate-800 hover:bg-slate-900 active:scale-95'}`}> {/*[cite: 5] */}
              {uploading ? ( //[cite: 5]
                <>
                  <Loader2 className="w-5 h-5 animate-spin" /> {/*[cite: 5] */}
                  <span>Processing & Saving...</span> {/*[cite: 5] */}
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5" /> {/*[cite: 5] */}
                  <span>Select or Take Photo</span> {/*[cite: 5] */}
                  <input
                    type="file" //[cite: 5]
                    accept="image/*" //[cite: 5]
                    capture="environment" // 👈 手機開啟時自動對準後鏡頭[cite: 5]
                    className="hidden" //[cite: 5]
                    disabled={uploading} //[cite: 5]
                    onChange={handleFileChange} //[cite: 5]
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