// src/utils/security.ts
import CryptoJS from 'crypto-js';

const APP_SECRET_KEY = import.meta.env.VITE_UPLOAD_SECRET_KEY || 'pharmacy-app-secure-upload-key-2026';

export interface UploadPayload {
  taskId: string;
  exp: number;
}

export function generateSignedToken(taskId: string, expiresInMinutes: number = 5): string { // 💡 建議將預設調為 5 分鐘
  const expiresAt = Date.now() + expiresInMinutes * 60 * 1000;
  const payload: UploadPayload = { taskId, exp: expiresAt };

  const payloadStr = JSON.stringify(payload);
  const encodedPayload = CryptoJS.enc.Base64.stringify(CryptoJS.enc.Utf8.parse(payloadStr));
  const signature = CryptoJS.HmacSHA256(encodedPayload, APP_SECRET_KEY).toString(CryptoJS.enc.Hex);

  const rawToken = `${encodedPayload}.${signature}`;
  // ⭐️ 將 Token 做 encodeURIComponent，防止 QR Code URL 內的 + / = 字符破壞結構
  return encodeURIComponent(rawToken);
}

export function verifySignedToken(token: string | null): { valid: boolean; taskId?: string; reason?: string } {
  if (!token) {
    return { valid: false, reason: 'Missing upload token.' };
  }

  try {
    // ⭐️ 關鍵：先做 decodeURIComponent，並將可能被瀏覽器替換的空格還原為 +
    const raw = decodeURIComponent(token).replace(/ /g, '+');
    const parts = raw.split('.');

    if (parts.length !== 2) {
      return { valid: false, reason: 'Invalid token structure.' };
    }

    const [encodedPayload, providedSignature] = parts;

    // 1. 重新計算 HMAC 簽名
    const expectedSignature = CryptoJS.HmacSHA256(encodedPayload, APP_SECRET_KEY).toString(CryptoJS.enc.Hex);

    if (providedSignature !== expectedSignature) {
      return { valid: false, reason: 'Security check failed. Token signature mismatch!' };
    }

    // 2. 解碼 Payload
    const payloadStr = CryptoJS.enc.Base64.parse(encodedPayload).toString(CryptoJS.enc.Utf8);
    const payload: UploadPayload = JSON.parse(payloadStr);

    // ⭐️ 3. 允許 30 秒的裝置時鐘誤差緩衝 (Clock Skew Buffer)
    const CLOCK_BUFFER_MS = 30 * 1000;
    if (Date.now() > payload.exp + CLOCK_BUFFER_MS) {
      return { valid: false, reason: 'Upload link has expired. Please rescan QR code.' };
    }

    return { valid: true, taskId: payload.taskId };
  } catch (e) {
    return { valid: false, reason: 'Failed to decode token.' };
  }
}