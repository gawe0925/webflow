import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  onSnapshot, 
  query, 
  orderBy 
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage, isFirebaseInitialized } from '../firebase';
import { 
  PatientTask, 
  DispensaryStatus, 
  PaymentStatus, 
  PatientFormData 
} from '../types';

// 1. 定義並導出 PaymentRecord 型態（避免跨檔案引用的型態缺失問題）
export interface PaymentRecord {
  id: string;
  dispensaryTaskId: string;
  patientCode: string;
  paymentStatus: PaymentStatus;
  createdAt: string;
}

// 2. 擴充 PatientTaskUpdates 介面，明確包含可更新的 paymentRecordId 欄位
export interface ExtendedPatientTaskUpdates extends Partial<PatientTask> {
  paymentRecordId?: string | null;
}

// 輔助函式：清理 undefined 欄位，避免 Firestore 寫入時報錯
export const cleanFirestoreData = (data: Record<string, any>): Record<string, any> => {
  const cleaned: Record<string, any> = {};
  Object.keys(data).forEach((key) => {
    cleaned[key] = data[key] === undefined ? null : data[key];
  });
  return cleaned;
};

// 📌 新增：上傳圖片至 Firebase Storage 函式
export const uploadTaskImage = async (taskId: string, file: File): Promise<string> => {
  if (!isFirebaseInitialized()) {
    throw new Error('Firebase not initialized');
  }
  // 建立 Storage 檔案路徑：patient_attachments/{taskId}/{timestamp}_{filename}
  const storageRef = ref(storage, `patient_attachments/${taskId}/${Date.now()}_${file.name}`);
  const snapshot = await uploadBytes(storageRef, file);
  const downloadUrl = await getDownloadURL(snapshot.ref);
  return downloadUrl;
};

// 3. 監聽 Patients 列表
export const subscribeToPatients = (
  onSuccess: (data: PatientTask[]) => void,
  onError: (err: any) => void
) => {
  if (!isFirebaseInitialized()) {
    onError('Firebase not initialized');
    return () => {};
  }

  const q = query(collection(db, 'patients'), orderBy('lastUpdatedTime', 'desc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const patientsData: PatientTask[] = snapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          patientCode: data.patientCode || '',
          currentStatus: (data.currentStatus as DispensaryStatus) || 'TODO',
          lastUpdatedTime: data.lastUpdatedTime || new Date().toISOString(),
          lastUpdatedBy: data.lastUpdatedBy || 'unknown',
          notes: data.notes || '',
          attachments: data.attachments || [],
          rejectReason: data.rejectReason || undefined,
          checkedBy: data.checkedBy || null,
          checkedAt: data.checkedAt || null,
          packs: data.packs || [],
          paymentRecordId: data.paymentRecordId || null,

          // 📌 新增 4 個 Tick Box 欄位映射
          hasInvoice: data.hasInvoice ?? false,
          hasScriptReminder: data.hasScriptReminder ?? false,
          isAccountPayment: data.isAccountPayment ?? false,
          hasWebsterPakFee: data.hasWebsterPakFee ?? false
        } as PatientTask;
      });
      onSuccess(patientsData);
    },
    onError
  );
};

// 4. 監聽 PaymentRecords 列表
export const subscribeToPaymentRecords = (
  onSuccess: (data: PaymentRecord[]) => void,
  onError: (err: any) => void
) => {
  if (!isFirebaseInitialized()) {
    onError('Firebase not initialized');
    return () => {};
  }

  const q = query(collection(db, 'payment_records'), orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const paymentsData: PaymentRecord[] = snapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          dispensaryTaskId: data.dispensaryTaskId || '',
          patientCode: data.patientCode || '',
          paymentStatus: (data.paymentStatus as PaymentStatus) || 'Unpaid',
          createdAt: data.createdAt || new Date().toISOString()
        };
      });
      onSuccess(paymentsData);
    },
    onError
  );
};

// 5. 處理狀態變更 (連動自動新增/刪除 Front Counter 的 Payment Record)
export const updatePatientStatusInService = async (
  targetTask: PatientTask,
  newStatus: DispensaryStatus,
  currentStaffName: string,
  verificationData?: { checkedBy: string; checkedAt: string },
  isLocalFallback = false
): Promise<{ updatedTask: ExtendedPatientTaskUpdates; newPaymentRecordId: string | null }> => {
  const oldStatus = targetTask.currentStatus;
  let newPaymentRecordId: string | null = targetTask.paymentRecordId || null;

  // 狀態轉為 Collected -> 自動建立 Payment Record (📌 若為 Account Payment 則跳過，不存入 Till)
  if (newStatus === 'Collected' && oldStatus !== 'Collected') {
    if (!targetTask.isAccountPayment) {
      if (!isLocalFallback && isFirebaseInitialized()) {
        const paymentRef = await addDoc(collection(db, 'payment_records'), {
          dispensaryTaskId: targetTask.id,
          patientCode: targetTask.patientCode,
          paymentStatus: 'Unpaid' as PaymentStatus,
          createdAt: new Date().toISOString()
        });
        newPaymentRecordId = paymentRef.id;
      } else {
        newPaymentRecordId = 'pay_' + Date.now();
      }
    }
  } 
  // 狀態從 Collected 移開 -> 自動刪除 Payment Record
  else if (oldStatus === 'Collected' && newStatus !== 'Collected') {
    if (targetTask.paymentRecordId) {
      if (!isLocalFallback && isFirebaseInitialized()) {
        await deleteDoc(doc(db, 'payment_records', targetTask.paymentRecordId));
      }
      newPaymentRecordId = null;
    }
  }

  const updates: ExtendedPatientTaskUpdates = {
    currentStatus: newStatus,
    lastUpdatedTime: new Date().toISOString(),
    lastUpdatedBy: currentStaffName,
    paymentRecordId: newPaymentRecordId
  };

  if (newStatus !== 'Rejected') {
    updates.rejectReason = undefined;
  }

  if (verificationData) {
    updates.checkedBy = verificationData.checkedBy;
    updates.checkedAt = verificationData.checkedAt;
  } else if (newStatus !== 'Ready for Collection' && newStatus !== 'Ready for Documents') {
    // 若不是核對完成或準備文件狀態，清空核對人員記錄
    updates.checkedBy = null;
    updates.checkedAt = null;
  }

  if (!isLocalFallback && isFirebaseInitialized()) {
    await updateDoc(doc(db, 'patients', targetTask.id), cleanFirestoreData(updates));
  }

  return { updatedTask: updates, newPaymentRecordId };
};

// 6. 更新 Patient 資訊 (Notes, Attachments, Tick Boxes 等，含 Account Payment 自動連動 Till)
export const updatePatientInService = async (
  taskId: string,
  updates: Partial<PatientTask>,
  currentStaffName: string,
  isLocalFallback = false,
  currentTask?: PatientTask // 📌 傳入當前 Task 用於判斷狀態與連動 paymentRecord
) => {
  let updatedPaymentRecordId: string | null | undefined = updates.paymentRecordId;

  // 📌 核心同步邏輯：如果更新包含 isAccountPayment 且 Task 目前處於 Collected 狀態
  if (currentTask && typeof updates.isAccountPayment === 'boolean' && currentTask.currentStatus === 'Collected') {
    const isNowAccount = updates.isAccountPayment;

    if (isNowAccount && currentTask.paymentRecordId) {
      // 1. 切換為 Account Payment：如果有 Till 記錄，自動刪除
      if (!isLocalFallback && isFirebaseInitialized()) {
        await deleteDoc(doc(db, 'payment_records', currentTask.paymentRecordId));
      }
      updatedPaymentRecordId = null;
    } else if (!isNowAccount && !currentTask.paymentRecordId) {
      // 2. 取消 Account Payment：如果沒有 Till 記錄，自動在 Till (payment_records) 新增一筆
      if (!isLocalFallback && isFirebaseInitialized()) {
        const paymentRef = await addDoc(collection(db, 'payment_records'), {
          dispensaryTaskId: taskId,
          patientCode: currentTask.patientCode,
          paymentStatus: 'Unpaid' as PaymentStatus,
          createdAt: new Date().toISOString()
        });
        updatedPaymentRecordId = paymentRef.id;
      } else {
        updatedPaymentRecordId = 'pay_' + Date.now();
      }
    }
  }

  const taskUpdates = {
    ...updates,
    ...(updatedPaymentRecordId !== undefined ? { paymentRecordId: updatedPaymentRecordId } : {}),
    lastUpdatedTime: new Date().toISOString(),
    lastUpdatedBy: currentStaffName
  };

  if (!isLocalFallback && isFirebaseInitialized()) {
    await updateDoc(doc(db, 'patients', taskId), cleanFirestoreData(taskUpdates));
  }
  return { taskUpdates, updatedPaymentRecordId };
};

// 7. 新增 Patient
export const addPatientToService = async (
  formData: PatientFormData & { initialStatus?: string },
  currentStaffName: string,
  isLocalFallback = false
): Promise<PatientTask> => {
  const newTaskData = {
    patientCode: formData.patientCode,
    currentStatus: (formData.initialStatus || 'TODO') as DispensaryStatus,
    lastUpdatedTime: new Date().toISOString(),
    lastUpdatedBy: currentStaffName,
    notes: formData.notes,
    attachments: formData.attachments,
    checkedBy: null,
    checkedAt: null,
    packs: formData.packs || [],
    paymentRecordId: null,

    // 📌 新增 Tick Boxes 預設值
    hasInvoice: false,
    hasScriptReminder: false,
    isAccountPayment: formData.isAccountPayment ?? false,
    hasWebsterPakFee: formData.hasWebsterPakFee ?? false
  };

  if (!isLocalFallback && isFirebaseInitialized()) {
    const docRef = await addDoc(collection(db, 'patients'), cleanFirestoreData(newTaskData));
    return { id: docRef.id, ...newTaskData };
  } else {
    return { id: Date.now().toString(), ...newTaskData };
  }
};

// 8. 刪除 Patient (同時刪除連動的 Payment Record)
export const deletePatientFromService = async (
  taskId: string,
  paymentRecordId: string | null | undefined,
  isLocalFallback = false
) => {
  if (paymentRecordId) {
    if (!isLocalFallback && isFirebaseInitialized()) {
      await deleteDoc(doc(db, 'payment_records', paymentRecordId));
    }
  }

  if (!isLocalFallback && isFirebaseInitialized()) {
    await deleteDoc(doc(db, 'patients', taskId));
  }
};

// 9. 更新 Front Counter 支付狀態 (Paid / Unpaid)
export const updatePaymentStatusInService = async (
  paymentRecordId: string,
  newStatus: PaymentStatus,
  isLocalFallback = false
) => {
  if (!isLocalFallback && isFirebaseInitialized()) {
    await updateDoc(doc(db, 'payment_records', paymentRecordId), {
      paymentStatus: newStatus,
      updatedAt: new Date().toISOString()
    });
  }
};