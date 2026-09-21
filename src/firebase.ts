import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage'; // 1. 補上 Firebase Storage

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

let app: FirebaseApp;
let db: Firestore;
let storage: FirebaseStorage; // 2. 宣告 storage 變數

try {
  // Initialize Firebase
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    storage = getStorage(app); // 3. 初始化 storage
    console.log('Firebase initialized successfully');
  } else {
    app = getApps()[0];
    db = getFirestore(app);
    storage = getStorage(app); // 3. 初始化 storage
  }
} catch (error) {
  console.warn('Firebase initialization failed, using local state fallback:', error);
  // Local state fallback will be handled in components
}

// 4. 將 storage 匯出
export { db, storage };

export const isFirebaseInitialized = () => {
  try {
    return !!getApps().length;
  } catch {
    return false;
  }
};