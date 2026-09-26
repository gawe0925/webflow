// src/components/PatientModal.tsx
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { PatientTask, COMMON_REJECT_REASONS, StatusHistory, PackItem } from '../types';
import { StaffRole } from '../types/auth';
import { generateSignedToken } from '../utils/security';
import { uploadTaskImage } from '../services/patientService';
import {
  X, Clock, User, FileText, AlertCircle, Save, Trash2, Plus, Edit3,
  CheckCircle, Package, CheckSquare, Square, Calendar, Upload,
  QrCode, Loader2, DollarSign, Receipt, CreditCard, Image as ImageIcon, RotateCw
} from 'lucide-react';

interface PatientModalProps {
  task: PatientTask | null;
  isOpen: boolean;
  onClose: () => void;
  currentUserRole: StaffRole;
  currentStaffName: string;
  onUpdateTask: (taskId: string, updates: Partial<PatientTask>) => void;
  onDeleteTask: (taskId: string) => void;
  statusHistory: StatusHistory[];
  onUpdatePatientCode: (taskId: string, newCode: string) => void;
}

export default function PatientModal({
  task,
  isOpen,
  onClose,
  currentUserRole,
  currentStaffName,
  onUpdateTask,
  onDeleteTask,
  statusHistory,
  onUpdatePatientCode
}: PatientModalProps) {
  const [mounted, setMounted] = useState(false);

  const [notes, setNotes] = useState(task?.notes || '');
  const [rejectReason, setRejectReason] = useState(task?.rejectReason || '');
  const [customRejectReason, setCustomRejectReason] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isEditingCode, setIsEditingCode] = useState(false);
  const [patientCode, setPatientCode] = useState(task?.patientCode || '');
  const [localPacks, setLocalPacks] = useState<PackItem[]>(task?.packs || []);

  // 📌 上傳與 QR Code 狀態
  const [isUploading, setIsUploading] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);

  // 🔐 安全短效 Token 與倒數計時狀態 (預設 5 分鐘 = 300 秒)
  const [uploadToken, setUploadToken] = useState<string>('');
  const [timeLeft, setTimeLeft] = useState<number>(300);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (task) {
      setNotes(task.notes || '');
      setRejectReason(task.rejectReason || '');
      setCustomRejectReason('');
      setPatientCode(task.patientCode);
      setLocalPacks(task.packs || []);
      setIsEditing(false);
      setIsEditingCode(false);
    }
  }, [task]);

  // 🔑 生成帶有 5 分鐘過期時間的臨時 Upload Token
  const generateUploadToken = () => {
    if (!task) return;
    
    // 使用安全簽名工具生成 Token (預設 5 分鐘)
    const token = generateSignedToken(task.id, 5);
    
    setUploadToken(token);
    setTimeLeft(300);
  };

  // ⏱️ QR Code Modal 開啟時觸發倒數計時
  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;

    if (showQrModal) {
      generateUploadToken();

      timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => clearInterval(timer);
  }, [showQrModal]);

  if (!mounted || !task || !isOpen) return null;

  const canEdit = currentUserRole === 'pharmacist' || currentUserRole === 'manager';
  const isRejected = task.currentStatus === 'Rejected';
  const isReadyForDocuments = task.currentStatus === 'Ready for Documents';

  // ---------------- Packs 邏輯 ----------------
  const handleTogglePack = (packId: string) => {
    const updatedPacks = localPacks.map(pack => {
      if (pack.id === packId) {
        const nextState = !pack.isCompleted;
        return {
          ...pack,
          isCompleted: nextState,
          completedAt: nextState ? new Date().toISOString() : null,
          completedBy: nextState ? currentStaffName : null
        };
      }
      return pack;
    });

    setLocalPacks(updatedPacks);
    onUpdateTask(task.id, {
      packs: updatedPacks,
      lastUpdatedTime: new Date().toISOString(),
      lastUpdatedBy: currentStaffName
    });
  };

  const handlePackDateChangeInModal = (packId: string, newDate: string) => {
    const updatedPacks = localPacks.map(pack =>
      pack.id === packId ? { ...pack, startDate: newDate } : pack
    );

    setLocalPacks(updatedPacks);
    onUpdateTask(task.id, {
      packs: updatedPacks,
      lastUpdatedTime: new Date().toISOString(),
      lastUpdatedBy: currentStaffName
    });
  };

  const handleAddPackInModal = () => {
    const nextPackNumber = localPacks.length + 1;
    let defaultDate = new Date().toISOString().split('T')[0];

    if (localPacks.length > 0) {
      const lastPackDateStr = localPacks[localPacks.length - 1].startDate;
      if (lastPackDateStr) {
        const [year, month, day] = lastPackDateStr.split('-').map(Number);
        const lastDate = new Date(year, month - 1, day);
        lastDate.setDate(lastDate.getDate() + 7);

        const y = lastDate.getFullYear();
        const m = String(lastDate.getMonth() + 1).padStart(2, '0');
        const d = String(lastDate.getDate()).padStart(2, '0');
        defaultDate = `${y}-${m}-${d}`;
      }
    }

    const newPack: PackItem = {
      id: Date.now().toString() + Math.random().toString(36).substring(2, 5),
      packNumber: nextPackNumber,
      startDate: defaultDate,
      isCompleted: false,
      completedAt: null,
      completedBy: null
    };

    const updatedPacks = [...localPacks, newPack];
    setLocalPacks(updatedPacks);
    onUpdateTask(task.id, {
      packs: updatedPacks,
      lastUpdatedTime: new Date().toISOString(),
      lastUpdatedBy: currentStaffName
    });
  };

  const handleRemovePackInModal = (packId: string) => {
    const updatedPacks = localPacks
      .filter(p => p.id !== packId)
      .map((p, idx) => ({ ...p, packNumber: idx + 1 }));

    setLocalPacks(updatedPacks);
    onUpdateTask(task.id, {
      packs: updatedPacks,
      lastUpdatedTime: new Date().toISOString(),
      lastUpdatedBy: currentStaffName
    });
  };

  // ---------------- Tick Box 切換邏輯 ----------------
  const handleToggleTickBox = (field: 'hasInvoice' | 'hasScriptReminder' | 'isAccountPayment' | 'hasWebsterPakFee') => {
    onUpdateTask(task.id, {
      [field]: !task[field],
      lastUpdatedTime: new Date().toISOString(),
      lastUpdatedBy: currentStaffName
    });
  };

  // ---------------- 備註與編號保存 ----------------
  const handleSaveNotes = () => {
    const updates: Partial<PatientTask> = {
      notes,
      lastUpdatedTime: new Date().toISOString(),
      lastUpdatedBy: currentStaffName
    };

    if (isRejected) {
      updates.rejectReason = rejectReason === 'Other' ? customRejectReason : rejectReason;
    }

    onUpdateTask(task.id, updates);
    setIsEditing(false);
  };

  const handleSavePatientCode = () => {
    if (patientCode.trim() && patientCode !== task.patientCode) {
      onUpdatePatientCode(task.id, patientCode.trim());
      setIsEditingCode(false);
    }
  };

  const handleQuickRejectReason = (reason: string) => {
    setRejectReason(reason);
    const updates: Partial<PatientTask> = {
      rejectReason: reason,
      lastUpdatedTime: new Date().toISOString(),
      lastUpdatedBy: currentStaffName
    };
    onUpdateTask(task.id, updates);
  };

  // ---------------- 圖片上傳與刪除 ----------------
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const downloadUrl = await uploadTaskImage(task.id, file);
      onUpdateTask(task.id, {
        attachments: [...(task.attachments || []), downloadUrl],
        lastUpdatedTime: new Date().toISOString(),
        lastUpdatedBy: currentStaffName
      });
    } catch (error) {
      console.error('Image upload failed:', error);
      alert('Failed to upload image. Please check your storage settings.');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleRemoveAttachment = (index: number) => {
    const newAttachments = (task.attachments || []).filter((_, i) => i !== index);
    onUpdateTask(task.id, {
      attachments: newAttachments,
      lastUpdatedTime: new Date().toISOString(),
      lastUpdatedBy: currentStaffName
    });
  };

  const formatTime = (timestamp: string) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return isNaN(date.getTime())
      ? timestamp
      : date.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // ⭐️ 攜帶短效 token 的網址（不要重複 encode）
  const mobileUploadUrl = `${window.location.origin}/upload/${task.id}?token=${uploadToken}`;

  return createPortal(
    <div className="fixed inset-0 bg-zinc-950/40 backdrop-blur-xs z-[99999] flex items-center justify-center p-4">
      <div className="absolute inset-0 z-0" onClick={onClose} />

      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden border border-zinc-200/80 relative z-10">

        {/* Header */}
        <div className="bg-zinc-50/80 border-b border-zinc-200/80 p-5 rounded-t-2xl flex items-center justify-between shrink-0">
          <div className="flex-1">
            {isEditingCode && canEdit ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={patientCode}
                  onChange={(e) => setPatientCode(e.target.value)}
                  className="text-xl font-bold text-zinc-900 border border-zinc-300 rounded-lg px-3 py-1 focus:outline-none focus:ring-2 focus:ring-zinc-900 bg-white"
                  placeholder="Patient Code"
                />
                <button
                  type="button"
                  onClick={handleSavePatientCode}
                  className="px-3 py-1 bg-zinc-900 text-white text-xs font-medium rounded-lg hover:bg-black transition-colors cursor-pointer"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditingCode(false);
                    setPatientCode(task.patientCode);
                  }}
                  className="px-3 py-1 bg-zinc-100 text-zinc-700 text-xs font-medium rounded-lg hover:bg-zinc-200 transition-colors border border-zinc-200 cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-semibold tracking-tight text-zinc-900">{task.patientCode}</h2>
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => setIsEditingCode(true)}
                    className="p-1 hover:bg-zinc-200/60 rounded-md transition-colors cursor-pointer"
                    title="Edit Patient Code"
                  >
                    <Edit3 className="w-4 h-4 text-zinc-400" />
                  </button>
                )}
              </div>
            )}
            <p className="text-xs text-zinc-500 mt-1">
              Status: <span className="font-medium text-zinc-800">{task.currentStatus}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-zinc-200/60 rounded-full text-zinc-400 hover:text-zinc-600 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 內容區 */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1 text-zinc-800">

          {/* Processing & Billing Options */}
          <div className="bg-zinc-50/70 border border-zinc-200/80 rounded-xl p-4 space-y-3">
            <h3 className="text-sm font-semibold text-zinc-900 flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-zinc-700" />
              Processing & Billing Options
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => handleToggleTickBox('isAccountPayment')}
                className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-xs font-medium transition-colors text-left cursor-pointer ${task.isAccountPayment
                    ? 'bg-amber-50 border-amber-300 text-amber-900'
                    : 'bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-100/50'
                  }`}
              >
                <CreditCard className={`w-4 h-4 ${task.isAccountPayment ? 'text-amber-600' : 'text-zinc-400'}`} />
                <div className="flex-1">
                  <div>Account Payment</div>
                  <div className="text-[10px] text-zinc-400 font-normal">Bypasses Front Till upon Collection</div>
                </div>
                {task.isAccountPayment ? <CheckSquare className="w-4 h-4 text-amber-600" /> : <Square className="w-4 h-4 text-zinc-300" />}
              </button>

              <button
                type="button"
                onClick={() => handleToggleTickBox('hasWebsterPakFee')}
                className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-xs font-medium transition-colors text-left cursor-pointer ${task.hasWebsterPakFee
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                    : 'bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-100/50'
                  }`}
              >
                <DollarSign className={`w-4 h-4 ${task.hasWebsterPakFee ? 'text-emerald-600' : 'text-zinc-400'}`} />
                <div className="flex-1">
                  <div>Webster Pak Fee</div>
                  <div className="text-[10px] text-zinc-400 font-normal">Standard pak fee applies</div>
                </div>
                {task.hasWebsterPakFee ? <CheckSquare className="w-4 h-4 text-emerald-600" /> : <Square className="w-4 h-4 text-zinc-300" />}
              </button>

              {isReadyForDocuments && (
                <button
                  type="button"
                  onClick={() => handleToggleTickBox('hasInvoice')}
                  className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-xs font-medium transition-colors text-left cursor-pointer ${task.hasInvoice
                      ? 'bg-blue-50 border-blue-300 text-blue-900'
                      : 'bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-100/50'
                    }`}
                >
                  <Receipt className={`w-4 h-4 ${task.hasInvoice ? 'text-blue-600' : 'text-zinc-400'}`} />
                  <div className="flex-1">
                    <div>Invoice Printed</div>
                    <div className="text-[10px] text-zinc-400 font-normal">Ready for document collation</div>
                  </div>
                  {task.hasInvoice ? <CheckSquare className="w-4 h-4 text-blue-600" /> : <Square className="w-4 h-4 text-zinc-300" />}
                </button>
              )}

              {isReadyForDocuments && (
                <button
                  type="button"
                  onClick={() => handleToggleTickBox('hasScriptReminder')}
                  className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-xs font-medium transition-colors text-left cursor-pointer ${task.hasScriptReminder
                      ? 'bg-indigo-50 border-indigo-300 text-indigo-900'
                      : 'bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-100/50'
                    }`}
                >
                  <FileText className={`w-4 h-4 ${task.hasScriptReminder ? 'text-indigo-600' : 'text-zinc-400'}`} />
                  <div className="flex-1">
                    <div>Repeat / Script Reminder</div>
                    <div className="text-[10px] text-zinc-400 font-normal">Attached with packing</div>
                  </div>
                  {task.hasScriptReminder ? <CheckSquare className="w-4 h-4 text-indigo-600" /> : <Square className="w-4 h-4 text-zinc-300" />}
                </button>
              )}
            </div>
          </div>

          {/* Checklist */}
          <div className="bg-zinc-50/70 border border-zinc-200/80 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-zinc-900 flex items-center gap-2">
                <Package className="w-4 h-4 text-zinc-700" />
                Webster-pak Weekly Processing Checklist
              </h3>
              {canEdit && (
                <button
                  type="button"
                  onClick={handleAddPackInModal}
                  className="text-xs px-2.5 py-1 bg-zinc-900 text-white rounded-lg hover:bg-black transition-colors flex items-center gap-1 font-medium shadow-xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Pack
                </button>
              )}
            </div>

            {localPacks.length === 0 ? (
              <p className="text-xs text-zinc-400 p-4 bg-white rounded-xl border border-dashed border-zinc-200 text-center">
                No weekly packs configured for this patient. Click "+ Add Pack" above to start.
              </p>
            ) : (
              <div className="space-y-2">
                {localPacks.map((pack) => (
                  <div
                    key={pack.id}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all ${pack.isCompleted
                        ? 'bg-zinc-100/80 border-zinc-300 text-zinc-900'
                        : 'bg-white border-zinc-200 text-zinc-800'
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => handleTogglePack(pack.id)}
                        className="text-zinc-900 hover:opacity-80 transition-opacity cursor-pointer"
                      >
                        {pack.isCompleted ? (
                          <CheckSquare className="w-5 h-5 text-zinc-900" />
                        ) : (
                          <Square className="w-5 h-5 text-zinc-300" />
                        )}
                      </button>

                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs min-w-[55px] text-zinc-800">Pack {pack.packNumber}</span>

                        <div className="flex items-center gap-1 bg-zinc-50 border border-zinc-200 rounded-lg px-2 py-1">
                          <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                          <input
                            type="date"
                            value={pack.startDate}
                            disabled={!canEdit}
                            onChange={(e) => handlePackDateChangeInModal(pack.id, e.target.value)}
                            className="text-xs bg-transparent focus:outline-none cursor-pointer text-zinc-700 disabled:cursor-not-allowed"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {pack.isCompleted && pack.completedBy && (
                        <span className="text-[11px] text-zinc-700 bg-zinc-200/70 border border-zinc-300/60 px-2 py-0.5 rounded-full font-medium capitalize">
                          Done by {pack.completedBy}
                        </span>
                      )}
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => handleRemovePackInModal(pack.id)}
                          className="p-1 hover:bg-red-50 text-red-500 rounded-md transition-colors cursor-pointer"
                          title="Delete Pack"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* History */}
          <div>
            <h3 className="text-sm font-semibold text-zinc-900 mb-2.5 flex items-center gap-2">
              <Clock className="w-4 h-4 text-zinc-500" />
              Status History
            </h3>
            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
              {(statusHistory || []).map((history, index) => (
                <div key={index} className="flex items-center justify-between text-xs p-2.5 bg-zinc-50/70 rounded-lg border border-zinc-100">
                  <span className="font-medium text-zinc-800">{history.status}</span>
                  <div className="flex items-center gap-2 text-zinc-400">
                    <span className="font-mono text-[11px]">{formatTime(history.timestamp)}</span>
                    <span>•</span>
                    <span className="capitalize">by {history.updatedBy}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <h3 className="text-sm font-semibold text-zinc-900 mb-2.5 flex items-center gap-2">
              <FileText className="w-4 h-4 text-zinc-500" />
              Notes
            </h3>
            {isEditing && canEdit ? (
              <div className="space-y-2">
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full p-3 border border-zinc-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900 text-xs min-h-[100px] bg-white"
                  placeholder="Add notes about this patient..."
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleSaveNotes}
                    className="px-3 py-1.5 bg-zinc-900 text-white rounded-lg hover:bg-black transition-colors flex items-center gap-1.5 text-xs font-medium shadow-xs cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    Save Notes
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(false);
                      setNotes(task.notes || '');
                    }}
                    className="px-3 py-1.5 bg-zinc-100 text-zinc-700 rounded-lg hover:bg-zinc-200 transition-colors text-xs font-medium border border-zinc-200 cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-zinc-600 p-3 bg-zinc-50/70 rounded-xl min-h-[50px] text-xs leading-relaxed border border-zinc-100">
                  {notes || 'No notes available'}
                </p>
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="text-xs text-zinc-700 hover:text-black flex items-center gap-1 font-medium underline underline-offset-2 cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    Edit Notes
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Reject Reason */}
          {isRejected && (
            <div>
              <h3 className="text-sm font-semibold text-zinc-900 mb-2.5 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-500" />
                Rejection Reason
              </h3>
              <div className="space-y-3">
                <p className="text-red-700 p-3 bg-red-50/60 rounded-xl font-medium text-xs border border-red-100">
                  {task.rejectReason || 'No rejection reason specified'}
                </p>
                {canEdit && (
                  <div>
                    <p className="text-xs text-zinc-400 mb-2 font-medium font-sans">Quick select reasons:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {COMMON_REJECT_REASONS.filter(r => r !== 'Other').map(reason => (
                        <button
                          key={reason}
                          type="button"
                          onClick={() => handleQuickRejectReason(reason)}
                          className="px-2.5 py-1 bg-white border border-zinc-200 rounded-full text-xs font-medium hover:bg-zinc-100 transition-colors text-zinc-700 cursor-pointer"
                        >
                          {reason}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Attachments & Photos */}
          <div>
            <h3 className="text-sm font-semibold text-zinc-900 mb-2.5 flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-zinc-500" />
              Attachments & Photos
            </h3>

            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-3">
              {(task.attachments || []).map((attachment, index) => (
                <div key={index} className="relative group aspect-square rounded-xl overflow-hidden border border-zinc-200 bg-zinc-100">
                  <img
                    src={attachment}
                    alt={`Attachment ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <a
                    href={attachment}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-medium"
                  >
                    View
                  </a>
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => handleRemoveAttachment(index)}
                      className="absolute top-1 right-1 p-1 bg-red-600/90 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}

              {canEdit && (
                <label className={`border-2 border-dashed border-zinc-200 hover:border-zinc-400 rounded-xl flex flex-col items-center justify-center p-2 cursor-pointer transition-colors aspect-square bg-zinc-50/50 hover:bg-zinc-100/50 ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                  {isUploading ? (
                    <Loader2 className="w-5 h-5 text-zinc-500 animate-spin" />
                  ) : (
                    <>
                      <Upload className="w-5 h-5 text-zinc-400 mb-1" />
                      <span className="text-[11px] font-semibold text-zinc-600">Upload</span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={isUploading}
                  />
                </label>
              )}
            </div>

            {canEdit && (
              <button
                type="button"
                onClick={() => setShowQrModal(true)}
                className="w-full py-2 px-3 border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 rounded-xl text-xs font-medium text-zinc-700 flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <QrCode className="w-4 h-4 text-zinc-600" />
                Scan QR to Take Photo with Mobile
              </button>
            )}
          </div>

          {/* Clinical Sign-off Info */}
          {task.checkedBy && task.checkedAt && (
            <div className="p-3.5 bg-zinc-100/70 border border-zinc-200 rounded-xl">
              <div className="flex items-center gap-2 text-zinc-900">
                <CheckCircle className="w-4 h-4 text-zinc-700" />
                <span className="font-semibold text-xs">Clinical Sign-off Completed</span>
              </div>
              <p className="text-xs text-zinc-500 mt-1 font-medium capitalize">
                Verified by {task.checkedBy} at {formatTime(task.checkedAt)}
              </p>
            </div>
          )}

          {/* Last Updated Info */}
          <div className="flex items-center gap-1.5 text-xs text-zinc-400 pt-3 border-t border-zinc-100">
            <User className="w-3.5 h-3.5" />
            <span className="capitalize">Last updated by {task.lastUpdatedBy} at {formatTime(task.lastUpdatedTime)}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-zinc-50/80 border-t border-zinc-200/80 p-4 rounded-b-2xl flex justify-between shrink-0">
          <div className="flex gap-2">
            {canEdit && (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm(`Are you sure you want to delete patient ${task.patientCode}?`)) {
                    onDeleteTask(task.id);
                    onClose();
                  }
                }}
                className="px-3.5 py-2 bg-red-50 text-red-600 border border-red-200/60 rounded-xl hover:bg-red-100 transition-colors flex items-center gap-1.5 text-xs font-medium cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete Patient
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-zinc-100 text-zinc-700 border border-zinc-200/80 rounded-xl hover:bg-zinc-200/80 transition-colors text-xs font-medium cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>

      {/* QR Code Modal */}
      {showQrModal && (
        <div className="fixed inset-0 bg-black/60 z-[100000] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full text-center space-y-4 border border-zinc-200 shadow-2xl">
            <div className="flex justify-between items-center">
              <h4 className="text-sm font-bold text-zinc-900">Mobile Photo Upload</h4>
              <button onClick={() => setShowQrModal(false)} className="text-zinc-400 hover:text-zinc-600 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-zinc-500">
              Scan this code with your phone camera to upload a photo for patient <strong className="text-zinc-800">{task.patientCode}</strong>.
            </p>

            <div className="relative flex justify-center p-3 bg-zinc-50 rounded-xl border border-zinc-100 overflow-hidden min-h-[196px] items-center">
              {/* ⭐️ 使用可直接帶入的標準 QR Code 生成 API */}
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(mobileUploadUrl)}`}
                alt="Upload QR Code"
                className={`w-44 h-44 rounded-lg transition-all ${timeLeft === 0 ? 'blur-xs opacity-10' : ''}`}
              />

              {timeLeft === 0 && (
                <div className="absolute inset-0 bg-zinc-900/85 backdrop-blur-xs flex flex-col items-center justify-center gap-2 p-4 text-white">
                  <AlertCircle className="w-6 h-6 text-amber-400" />
                  <p className="text-xs font-semibold">QR Code Expired</p>
                  <button
                    onClick={generateUploadToken}
                    className="px-3 py-1.5 bg-white text-zinc-900 text-xs font-semibold rounded-lg hover:bg-zinc-100 transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                    Renew Code
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center justify-center gap-1.5 text-xs font-medium">
              <span className="text-zinc-500">Expires in:</span>
              <span className={`font-mono font-bold ${timeLeft < 30 ? 'text-red-600 animate-pulse' : 'text-zinc-800'}`}>
                {formatTimer(timeLeft)}
              </span>
            </div>

            <p className="text-[10px] text-zinc-400 break-all font-mono line-clamp-2">{mobileUploadUrl}</p>

            <button
              onClick={() => setShowQrModal(false)}
              className="w-full py-2 bg-zinc-900 text-white rounded-xl text-xs font-medium hover:bg-black transition-colors cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      )}

    </div>,
    document.body
  );
}