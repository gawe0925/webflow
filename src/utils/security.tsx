// src/utils/security.ts
import CryptoJS from 'crypto-js';

// ⚠️ 請在 .env 檔案中設定 VITE_UPLOAD_SECRET_KEY，或在此處設定一個自訂金鑰
const APP_SECRET_KEY = import.meta.env.VITE_UPLOAD_SECRET_KEY || 'pharmacy-app-secure-upload-key-2026';

export interface UploadPayload {
  taskId: string;
  exp: number; // Expiration timestamp
}

/**
 * 🔑 生成帶有 HMAC-SHA256 簽名的加密 Token
 */
export function generateSignedToken(taskId: string, expiresInMinutes: number = 3): string {
  const expiresAt = Date.now() + expiresInMinutes * 60 * 1000;
  const payload: UploadPayload = { taskId, exp: expiresAt };

  // 1. 將 Payload 轉為 JSON 並做 Base64 編碼
  const payloadStr = JSON.stringify(payload);
  const encodedPayload = CryptoJS.enc.Base64.stringify(CryptoJS.enc.Utf8.parse(payloadStr));

  // 2. 用 SecretKey 對 Encoded Payload 產生 HMAC-SHA256 簽名
  const signature = CryptoJS.HmacSHA256(encodedPayload, APP_SECRET_KEY).toString(CryptoJS.enc.Hex);

  // 3. 組合為 payload.signature
  return `${encodedPayload}.${signature}`;
}

/**
 * 🛡️ 驗證 Token 的簽名是否合法以及是否過期
 */
export function verifySignedToken(token: string | null): { valid: boolean; taskId?: string; reason?: string } {
  if (!token) {
    return { valid: false, reason: 'Missing upload token.' };
  }

  const parts = token.split('.');
  if (parts.length !== 2) {
    return { valid: false, reason: 'Invalid token structure.' };
  }

  const [encodedPayload, providedSignature] = parts;

  try {
    // 1. 重新計算 HMAC 簽名，檢查是否被篡改
    const expectedSignature = CryptoJS.HmacSHA256(encodedPayload, APP_SECRET_KEY).toString(CryptoJS.enc.Hex);

    if (providedSignature !== expectedSignature) {
      return { valid: false, reason: 'Security check failed. Token has been tampered with!' };
    }

    // 2. 解碼 Payload 並檢查時間戳
    const payloadStr = CryptoJS.enc.Base64.parse(encodedPayload).toString(CryptoJS.enc.Utf8);
    const payload: UploadPayload = JSON.parse(payloadStr);

    if (Date.now() > payload.exp) {
      return { valid: false, reason: 'Upload link has expired. Please refresh the QR code.' };
    }

    return { valid: true, taskId: payload.taskId };
  } catch (e) {
    return { valid: false, reason: 'Failed to decode token.' };
  }
}