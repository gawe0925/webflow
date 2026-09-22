import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db, storage } from '../firebase';
import { Camera, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';

export default function MobileUploadPage() {
  const { taskId } = useParams<{ taskId: string }>();
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !taskId) return;

    setUploading(true);
    setError(null);

    try {
      if (!storage || !db) {
        throw new Error('Firebase is not initialized. Please check environment variables.');
      }

      // 1. 上傳照片至 Firebase Storage
      const storageRef = ref(storage, `patients/${taskId}/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const photoUrl = await getDownloadURL(storageRef);

      // 2. 更新 Firestore 該 Patient 紀錄的 attachments 陣列
      const patientRef = doc(db, 'patients', taskId);
      await updateDoc(patientRef, {
        attachments: arrayUnion(photoUrl)
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
          <h2 className="text-xl font-bold text-slate-900">Mobile Photo Upload</h2>
          <p className="text-xs text-slate-500 mt-1">
            Patient ID: <span className="font-mono font-bold bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-slate-800">{taskId}</span>
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 text-red-600 rounded-lg text-xs flex items-center justify-center gap-2 text-left">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success ? (
          <div className="p-6 bg-emerald-50 rounded-xl border border-emerald-200 space-y-2">
            <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
            <h3 className="font-bold text-emerald-800">Photo Uploaded Successfully!</h3>
            <p className="text-xs text-emerald-600">The photo has been attached to the patient's file. You can close this page now.</p>
          </div>
        ) : (
          <label className={`w-full py-4 px-6 rounded-xl font-semibold text-white shadow-md flex items-center justify-center gap-2 transition cursor-pointer ${uploading ? 'bg-slate-400 cursor-not-allowed' : 'bg-slate-800 hover:bg-slate-900 active:scale-95'}`}>
            {uploading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Uploading...</span>
              </>
            ) : (
              <>
                <Camera className="w-5 h-5" />
                <span>Take Photo / Choose File</span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  disabled={uploading}
                  onChange={handleFileChange}
                />
              </>
            )}
          </label>
        )}
      </div>
    </div>
  );
}