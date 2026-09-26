import CryptoJS from 'crypto-js';

// 從環境變數讀取金鑰
const SECRET_KEY = import.meta.env.VITE_ENCRYPTION_KEY as string;

/**
 * 1. 利用 Canvas 壓縮圖片，避免超過 Firestore 1MB 限制
 */
export const compressImage = (file: File, maxWidth = 800, quality = 0.7): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event: ProgressEvent<FileReader>) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return reject(new Error('Canvas context unavailable'));
        }

        ctx.drawImage(img, 0, 0, width, height);
        // 傳回壓縮後的 Base64 字串
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

/**
 * 2. AES-256 加密 Base64 字串
 */
export const encryptBase64 = (base64Str: string): string => {
  return CryptoJS.AES.encrypt(base64Str, SECRET_KEY).toString();
};

/**
 * 3. AES-256 解密字串成可供 <img> 顯示的 Base64
 */
export const decryptBase64 = (encryptedStr: string): string => {
  const bytes = CryptoJS.AES.decrypt(encryptedStr, SECRET_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
};