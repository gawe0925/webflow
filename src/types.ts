export type UserRole = 'pharmacist' | 'manager' | 'staff';

export type DispensaryStatus =
  | 'TODO'
  | 'Packing in Progress'
  | 'Pending Pharmacist Check'
  | 'Rejected'
  | 'Ready for Documents'
  | 'Ready for Collection'
  | 'Collected'
  | 'On Hold';

export type PaymentStatus = 'Unpaid' | 'Paid';

export type WebsterPakStatus = DispensaryStatus | PaymentStatus;

export const DISPENSARY_COLUMNS: DispensaryStatus[] = [
  'On Hold',
  'TODO',
  'Packing in Progress',
  'Pending Pharmacist Check',
  'Rejected',
  'Ready for Documents',
  'Ready for Collection',
  'Collected'
];

export const COUNTER_COLUMNS: PaymentStatus[] = ['Unpaid', 'Paid'];

// Payment 表格資料結構
export interface PaymentRecord {
  id: string;
  dispensaryTaskId: string;
  patientCode: string;
  patientName: string;
  amountDue?: number;
  paymentStatus: PaymentStatus;
  createdAt: string;
  paidAt?: string;
}

export interface PackItem {
  id: string;
  packNumber: number; // 例如: 1, 2, 3, 4
  startDate: string;  // 開始日期 YYYY-MM-DD
  isCompleted: boolean;
  completedAt?: string | null;
  completedBy?: string | null;
}

export interface PatientTask {
  id: string;
  patientCode: string;
  currentStatus: WebsterPakStatus;
  lastUpdatedTime: string;
  lastUpdatedBy: string;
  notes: string;
  attachments: string[]; // 存放圖片 URL (Firebase Storage Download URLs)
  rejectReason?: string | null;
  checkedBy?: string | null;
  checkedAt?: string | null;
  // 新增 Webster-pak 多週數追蹤欄位
  packs?: PackItem[];
  paymentRecordId?: string | null;

  // 📌 新增：文件與收費 Tick Box 欄位
  hasInvoice?: boolean;          // 僅在 Ready for Documents 狀態下顯示與勾選
  hasScriptReminder?: boolean;   // 僅在 Ready for Documents 狀態下顯示與勾選
  isAccountPayment?: boolean;    // 帳戶扣款/預付病患（移動至 Collected 時不進入 Till 櫃檯）
  hasWebsterPakFee?: boolean;    // 是否收取 Webster Pak 包裝費
}

export interface PatientFormData {
  patientCode: string;
  notes: string;
  attachments: string[];
  packs?: PackItem[];

  // 📌 新增：建立病患 Task 時可選的初始偏好設定
  isAccountPayment?: boolean;
  hasWebsterPakFee?: boolean;
}

export interface StatusHistory {
  status: WebsterPakStatus;
  timestamp: string;
  updatedBy: string;
}

// 📌 新增：手機端 QR Code 上傳圖片會話型別（供 B 方案使用）
export interface UploadSession {
  taskId: string;
  token: string;
  createdAt: string;
  expiresAt: string;
}

export const COMMON_REJECT_REASONS = [
  'Damaged Tablet',
  'Incorrect Dose',
  'Missing Medication',
  'Wrong Foil Seal',
  'Expired Pill',
  'Other'
];

export const ROLE_PERMISSIONS = {
  pharmacist: {
    canViewAll: true,
    canDragToClinical: true,
    canSignOffReady: true,
  },
  manager: {
    canViewAll: true,
    canDragToClinical: true,
    canSignOffReady: false,
  },
  staff: {
    canViewAll: false,
    canDragToClinical: false,
    canSignOffReady: false,
  }
};