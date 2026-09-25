// src/types.ts

export type StaffRole = 'admin' | 'manager' | 'dispenser' | 'retail assistant' | 'pharmacist';

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
  packs?: PackItem[];
  paymentRecordId?: string | null;

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

  isAccountPayment?: boolean;
  hasWebsterPakFee?: boolean;
}

export interface StatusHistory {
  status: WebsterPakStatus;
  timestamp: string;
  updatedBy: string;
}

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

// 📌 權限設定已抽離至 utils/permissions.ts，此處保留 re-export 以利漸進式重構
export { ROLE_PERMISSIONS } from './utils/permissions';
export type { PermissionConfig } from './utils/permissions';