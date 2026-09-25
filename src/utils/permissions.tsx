// src/utils/permissions.ts
import { StaffRole, StaffMember } from '../types/auth';

/**
 * 系統所有細項權限介面定義
 */
export interface PermissionConfig {
  // ── 看板與分頁存取權限 ──
  canAccessDispensary: boolean;       // 是否可存取/檢視配藥區看板 (Dispensary Station)
  canAccessCounter: boolean;          // 是否可存取/檢視收銀櫃檯看板 (Checkout Counter)
  canViewAll: boolean;               // 是否可檢視所有卡片/資料

  // ── 看板操作與卡片流轉權限 ──
  canDragToClinical: boolean;        // 是否可將卡片拖曳至臨床核對區
  canSignOffReady: boolean;          // 是否可核對並簽章 Ready (Ready for Collection/Documents)
  canRejectTask: boolean;            // 是否可退回任務/退單 (Reject Task)
  canModifyRejectReason: boolean;    // 是否可填寫或修改退回原因 (僅限 Pharmacist)
  canExecuteBatchUpdate: boolean;    // 是否可執行批量狀態更新 (handleExecuteBatchUpdate)

  // ── 病患與任務管理權限 (Modal / Card) ──
  canManagePatients: boolean;        // 是否有權限新增/管理病患資料
  canEditPatientModal: boolean;      // 是否可編輯 Patient Modal 內容 (Notes, Packs, Tickbox 等)
  canDeleteTask: boolean;            // 是否可刪除病患任務

  // ── 員工與系統管理權限 ──
  canManageStaff: boolean;           // 是否能管理員工帳號 (看得到 Header/選單的員工管理按鈕)
  canViewAdminAccounts: boolean;     // 是否能在員工列表中檢視/管理 Admin 高階帳號
  isAdminAccount: boolean;           // 是否為最高權限 Admin 帳號 (StaffPinPage 等切換驗證用)
}

/**
 * 各角色的預設權限矩陣表 (ROLE_PERMISSIONS)
 */
export const ROLE_PERMISSIONS: Record<StaffRole, PermissionConfig> = {
  pharmacist: {
    canAccessDispensary: true,
    canAccessCounter: true,
    canViewAll: true,

    canDragToClinical: true,
    canSignOffReady: true,
    canRejectTask: true,
    canModifyRejectReason: true, // 僅限 Pharmacist
    canExecuteBatchUpdate: true,

    canManagePatients: true,
    canEditPatientModal: true,
    canDeleteTask: true,

    canManageStaff: true,
    canViewAdminAccounts: false,
    isAdminAccount: false,
  },

  manager: {
    canAccessDispensary: true,
    canAccessCounter: true,
    canViewAll: true,

    canDragToClinical: true,
    canSignOffReady: true,
    canRejectTask: false,
    canModifyRejectReason: false, // 只有 Pharmacist 能填退回原因
    canExecuteBatchUpdate: true,

    canManagePatients: true,
    canEditPatientModal: true,
    canDeleteTask: true,

    canManageStaff: true,
    canViewAdminAccounts: false,
    isAdminAccount: false,
  },

  dispenser: {
    canAccessDispensary: true,
    canAccessCounter: true,
    canViewAll: true,

    canDragToClinical: false,
    canSignOffReady: false,
    canRejectTask: false,
    canModifyRejectReason: false,
    canExecuteBatchUpdate: false,

    canManagePatients: true,
    canEditPatientModal: false,
    canDeleteTask: false,

    canManageStaff: false,
    canViewAdminAccounts: false,
    isAdminAccount: false,
  },

  'retail assistant': {
    canAccessDispensary: false, // 門市助理預設看不到調劑區
    canAccessCounter: true,
    canViewAll: false,

    canDragToClinical: false,
    canSignOffReady: false,
    canRejectTask: false,
    canModifyRejectReason: false,
    canExecuteBatchUpdate: false,

    canManagePatients: false,
    canEditPatientModal: false,
    canDeleteTask: false,

    canManageStaff: false,
    canViewAdminAccounts: false,
    isAdminAccount: false,
  },

  admin: {
    canAccessDispensary: true,
    canAccessCounter: true,
    canViewAll: true,

    canDragToClinical: true,
    canSignOffReady: true,
    canRejectTask: true,
    canModifyRejectReason: true,
    canExecuteBatchUpdate: true,

    canManagePatients: true,
    canEditPatientModal: true,
    canDeleteTask: true,

    canManageStaff: true,
    canViewAdminAccounts: true, // 只有 Admin 可以看管理員帳號
    isAdminAccount: true,
  },
};

// ─────────────────────────────────────────────────────────────
// 🛠️ 權限 Helper 函式庫
// ─────────────────────────────────────────────────────────────

/**
 * 取得特定角色的完整預設權限表
 */
export const getRolePermissions = (role?: StaffRole): PermissionConfig => {
  if (!role || !ROLE_PERMISSIONS[role]) {
    // 預設全關 Safe Fallback
    return {
      canAccessDispensary: false,
      canAccessCounter: false,
      canViewAll: false,
      canDragToClinical: false,
      canSignOffReady: false,
      canRejectTask: false,
      canModifyRejectReason: false,
      canExecuteBatchUpdate: false,
      canManagePatients: false,
      canEditPatientModal: false,
      canDeleteTask: false,
      canManageStaff: false,
      canViewAdminAccounts: false,
      isAdminAccount: false,
    };
  }
  return ROLE_PERMISSIONS[role];
};

/**
 * 檢查特定員工是否具備某項權限 (支援 Individual Override 獨立開關)
 */
export const hasPermission = (
  staff: StaffMember | null | undefined,
  permissionKey: keyof PermissionConfig
): boolean => {
  if (!staff) return false;

  // 1. 特殊個案：若 Staff 物件上有個別覆寫設定 (例如特例開啟/關閉看板 Access)
  if (permissionKey === 'canAccessDispensary' && typeof staff.canAccessDispensary === 'boolean') {
    return staff.canAccessDispensary;
  }
  if (permissionKey === 'canAccessCounter' && typeof staff.canAccessCounter === 'boolean') {
    return staff.canAccessCounter;
  }

  // 2. 一般情況：回到角色的預設權限表判斷
  const roleConfig = getRolePermissions(staff.role);
  return roleConfig[permissionKey];
};

/**
 * CreateStaffModal 專用：取得特定角色的預設 Dispensary 存取權限
 * (取代原本寫在 CreateStaffModal 裡的 defaultDispensaryAccessByRole)
 */
export const getDefaultDispensaryAccessByRole = (role: StaffRole): boolean => {
  return ROLE_PERMISSIONS[role]?.canAccessDispensary ?? false;
};