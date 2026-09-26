// src/utils/security.ts
import CryptoJS from 'crypto-js';

// ⚠️ 確保兩端讀取相同的預設 Key
const APP_SECRET_KEY = import.meta.env.VITE_UPLOAD_SECRET_KEY || 'pharmacy-app-secure-upload-key-2026';

export interface UploadPayload {
  taskId: string;
  exp: number;
}

export function generateSignedToken(taskId: string, expiresInMinutes: number = 5): string {
  const expiresAt = Date.now() + expiresInMinutes * 60 * 1000;
  const payload: UploadPayload = { taskId, exp: expiresAt };

  const payloadStr = JSON.stringify(payload);
  const encodedPayload = CryptoJS.enc.Base64.stringify(CryptoJS.enc.Utf8.parse(payloadStr));
  const signature = CryptoJS.HmacSHA256(encodedPayload, APP_SECRET_KEY).toString(CryptoJS.enc.Hex);

  const rawToken = `${encodedPayload}.${signature}`;
  return encodeURIComponent(rawToken);
}

export function verifySignedToken(token: string | null): { valid: boolean; taskId?: string; reason?: string } {
  if (!token) {
    return { valid: false, reason: 'Missing upload token.' };
  }

  try {
    // ⭐️ 先還原被 URL 轉換的加號與轉義字元
    const decodedToken = decodeURIComponent(token).replace(/ /g, '+');
    const parts = decodedToken.split('.');

    if (parts.length !== 2) {
      return { valid: false, reason: `Invalid token structure (Parts: ${parts.length})` };
    }

    const [encodedPayload, providedSignature] = parts;

    // 重新計算 HMAC
    const expectedSignature = CryptoJS.HmacSHA256(encodedPayload, APP_SECRET_KEY).toString(CryptoJS.enc.Hex);

    if (providedSignature !== expectedSignature) {
      return { 
        valid: false, 
        reason: `Signature mismatch! Recv: [${providedSignature.slice(0, 6)}...], Expected: [${expectedSignature.slice(0, 6)}...]` 
      };
    }

    const payloadStr = CryptoJS.enc.Base64.parse(encodedPayload).toString(CryptoJS.enc.Utf8);
    const payload: UploadPayload = JSON.parse(payloadStr);

    // ⭐️ 允許 60 秒的裝置時鐘誤差緩衝
    const CLOCK_BUFFER_MS = 60 * 1000;
    if (Date.now() > payload.exp + CLOCK_BUFFER_MS) {
      const diffSec = Math.round((Date.now() - payload.exp) / 1000);
      return { valid: false, reason: `Link expired ${diffSec}s ago.` };
    }

    return { valid: true, taskId: payload.taskId };
  } catch (e: any) {
    return { valid: false, reason: `Decode Exception: ${e.message}` };
  }
}