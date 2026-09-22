import React, { useState } from 'react';
import { PatientTask, WebsterPakStatus } from '../types';
import { StaffRole } from '../types/auth';
import { 
  Clock, User, FileText, AlertCircle, Package, CheckCircle2, Send, 
  CreditCard, DollarSign, Receipt, Image as ImageIcon 
} from 'lucide-react';
import { ToastType } from './Toast';

interface TaskCardProps {
  task: PatientTask;
  currentUserRole?: StaffRole;
  isSelected?: boolean;
  disabledSelection?: boolean;
  selectionDisabledTooltip?: string;
  onToggleSelect?: (taskId: string) => void;
  onClick: (task: PatientTask) => void;
  onUpdateRejectReason?: (taskId: string, reason: string) => void;
  onShowToast?: (message: string, type: ToastType) => void;
  isDragging?: boolean;
}

const STATUS_CONFIG: Partial<Record<WebsterPakStatus, { label: string; icon: React.ReactNode }>> = {
  'TODO': {
    label: 'TODO',
    icon: <Clock className="w-3.5 h-3.5 text-zinc-400" />
  },
  'Packing in Progress': {
    label: 'Packing',
    icon: <Clock className="w-3.5 h-3.5 text-zinc-600" />
  },
  'Pending Pharmacist Check': {
    label: 'Pending Check',
    icon: <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
  },
  'Rejected': {
    label: 'Rejected',
    icon: <AlertCircle className="w-3.5 h-3.5 text-red-600" />
  },
  'Ready for Collection': {
    label: 'Ready',
    icon: <CheckCircle2 className="w-3.5 h-3.5 text-zinc-700" />
  },
  'Collected': {
    label: 'Collected',
    icon: <CheckCircle2 className="w-3.5 h-3.5 text-zinc-400" />
  },
  'Unpaid': {
    label: 'Unpaid',
    icon: <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
  },
  'Paid': {
    label: 'Paid',
    icon: <CheckCircle2 className="w-3.5 h-3.5 text-zinc-700" />
  }
};

export default function TaskCard({ 
  task, 
  currentUserRole, 
  isSelected = false,
  disabledSelection = false,
  selectionDisabledTooltip,
  onToggleSelect,
  onClick, 
  onUpdateRejectReason, 
  onShowToast, 
  isDragging 
}: TaskCardProps) {
  const [rejectReasonText, setRejectReasonText] = useState(task.rejectReason || '');
  const [isEditingReason, setIsEditingReason] = useState(!task.rejectReason);

  const isPharmacist = currentUserRole === 'pharmacist';

  const currentConfig = STATUS_CONFIG[task.currentStatus as WebsterPakStatus] || {
    label: task.currentStatus,
    icon: <Clock className="w-3.5 h-3.5 text-zinc-400" />
  };

  const formatTime = (timestamp: string) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return isNaN(date.getTime())
      ? timestamp
      : date.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const packs = task.packs || [];
  const totalPacks = packs.length;
  const completedPacks = packs.filter((p) => p.isCompleted).length;
  const progressPercent = totalPacks > 0 ? (completedPacks / totalPacks) * 100 : 0;
  const isFullyCompleted = totalPacks > 0 && completedPacks === totalPacks;

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData('text/plain', task.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleSaveReason = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (!isPharmacist) {
      onShowToast?.('Only pharmacists can fill or modify rejection reasons.', 'error');
      return;
    }

    if (!rejectReasonText.trim()) {
      onShowToast?.('Rejection reason is required!', 'error');
      return;
    }

    if (onUpdateRejectReason) {
      onUpdateRejectReason(task.id, rejectReasonText.trim());
      setIsEditingReason(false);
    }
  };

  // 檢查是否有任何需要顯示的關鍵 Badge
  const hasBadges = task.isAccountPayment || task.hasWebsterPakFee || task.hasInvoice || task.hasScriptReminder;

  return (
    <div
      role="button"
      tabIndex={0}
      draggable
      onDragStart={handleDragStart}
      onClick={() => onClick(task)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick(task);
        }
      }}
      className={`
        group relative w-full text-left p-3 rounded-xl bg-white border cursor-pointer active:cursor-grabbing 
        transition-all duration-200 select-none shadow-xs
        ${isDragging ? 'opacity-40 scale-95 border-zinc-400' : 'hover:border-zinc-400 hover:shadow-md'}
        ${isSelected ? 'border-zinc-500 ring-2 ring-zinc-400/30 bg-zinc-50/50' : ''}
        ${task.currentStatus === 'Rejected' 
          ? 'border-red-200 bg-red-50/20 hover:border-red-300' 
          : 'border-zinc-200/80'
        }
      `}
    >
      {/* Header: Checkbox + Patient Code & Status Badge */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          {onToggleSelect && (
            <div title={disabledSelection ? selectionDisabledTooltip : undefined}>
              <input
                type="checkbox"
                checked={isSelected}
                disabled={disabledSelection}
                onChange={(e) => {
                  e.stopPropagation();
                  onToggleSelect(task.id);
                }}
                onClick={(e) => e.stopPropagation()}
                className={`w-3.5 h-3.5 rounded border-zinc-300 focus:ring-zinc-500 ${
                  disabledSelection 
                    ? 'opacity-30 cursor-not-allowed bg-zinc-100' 
                    : 'text-zinc-800 cursor-pointer'
                }`}
              />
            </div>
          )}
          <span className="text-sm font-semibold tracking-tight text-zinc-900 group-hover:text-black">
            {task.patientCode}
          </span>
        </div>
        
        <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-zinc-100/80 border border-zinc-200/80 text-[10px] font-medium text-zinc-700">
          {currentConfig.icon}
          <span>{currentConfig.label}</span>
        </div>
      </div>

      {/* 📌 新增：Processing & Billing Option Badges */}
      {hasBadges && (
        <div className="flex flex-wrap items-center gap-1 mb-2">
          {task.isAccountPayment && (
            <span 
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-medium"
              title="Account Payment (Bypasses Front Till)"
            >
              <CreditCard className="w-3 h-3 text-amber-600" />
              Account
            </span>
          )}

          {task.hasWebsterPakFee && (
            <span 
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-medium"
              title="Webster Pak Fee Applied"
            >
              <DollarSign className="w-3 h-3 text-emerald-600" />
              Pak Fee
            </span>
          )}

          {task.hasInvoice && (
            <span 
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-blue-50 border border-blue-200 text-blue-800 text-[10px] font-medium"
              title="Invoice Printed"
            >
              <Receipt className="w-3 h-3 text-blue-600" />
              Invoice
            </span>
          )}

          {task.hasScriptReminder && (
            <span 
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-800 text-[10px] font-medium"
              title="Repeat / Script Reminder Attached"
            >
              <FileText className="w-3 h-3 text-indigo-600" />
              Reminder
            </span>
          )}
        </div>
      )}

      {/* Webster-pak Progress Bar */}
      {totalPacks > 0 && (
        <div className="mb-2 p-2 rounded-lg bg-zinc-50 border border-zinc-100 space-y-1">
          <div className="flex items-center justify-between text-[11px] font-medium text-zinc-600">
            <span className="flex items-center gap-1 text-zinc-500">
              <Package className="w-3 h-3 text-zinc-400" />
              Packs
            </span>
            <span className={isFullyCompleted ? 'text-zinc-900 font-semibold' : 'text-zinc-600'}>
              {completedPacks} / {totalPacks}
            </span>
          </div>
          <div className="w-full bg-zinc-200/70 rounded-full h-1 overflow-hidden">
            <div
              className={`h-1 rounded-full transition-all duration-300 ${
                isFullyCompleted ? 'bg-zinc-900' : 'bg-zinc-600'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Time & Last Updated By */}
      <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-0.5">
        <div className="flex items-center gap-1">
          <Clock className="w-3 h-3 text-zinc-300" />
          <span className="font-mono text-zinc-500">{formatTime(task.lastUpdatedTime)}</span>
        </div>
        
        <div className="flex items-center gap-1 max-w-[100px]">
          <User className="w-3 h-3 text-zinc-300" />
          <span className="truncate text-zinc-500">{task.lastUpdatedBy}</span>
        </div>
      </div>

      {/* Notes */}
      {task.notes && (
        <div className="mt-2 pt-1.5 border-t border-zinc-100">
          <p className="text-[11px] text-zinc-500 line-clamp-2 leading-relaxed">{task.notes}</p>
        </div>
      )}

      {/* Rejection Reason Section */}
      {task.currentStatus === 'Rejected' && (
        <div 
          className="mt-2 p-2 rounded-lg bg-red-50 border border-red-200/80 space-y-1.5"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-red-700 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              Rejection Reason <span className="text-red-500">*</span>
            </span>
            {isPharmacist && task.rejectReason && !isEditingReason && (
              <button
                type="button"
                onClick={() => setIsEditingReason(true)}
                className="text-[10px] text-red-600 underline font-medium hover:text-red-800 cursor-pointer"
              >
                Edit
              </button>
            )}
          </div>

          {isPharmacist && isEditingReason ? (
            <div className="space-y-1.5">
              <textarea
                value={rejectReasonText}
                onChange={(e) => setRejectReasonText(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
                placeholder="Enter rejection reason (required)..."
                rows={2}
                className="w-full p-1.5 bg-white border border-red-200 rounded-md text-[11px] text-zinc-800 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-red-400 focus:border-red-400 resize-none"
              />
              <div className="flex justify-end gap-1.5">
                {task.rejectReason && (
                  <button
                    type="button"
                    onClick={() => {
                      setRejectReasonText(task.rejectReason || '');
                      setIsEditingReason(false);
                    }}
                    className="px-2 py-0.5 bg-white border border-zinc-200 text-zinc-600 text-[10px] rounded hover:bg-zinc-50 font-medium cursor-pointer"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleSaveReason}
                  className="px-2 py-0.5 bg-red-600 text-white text-[10px] font-medium rounded hover:bg-red-700 flex items-center gap-1 cursor-pointer"
                >
                  <Send className="w-2.5 h-2.5" />
                  Save
                </button>
              </div>
            </div>
          ) : (
            <p className="text-[11px] font-medium text-red-800 leading-relaxed">
              {task.rejectReason || (isPharmacist ? 'Click edit to enter reason...' : 'No rejection reason provided')}
            </p>
          )}
        </div>
      )}

      {/* Attachments / Photos Badge */}
      {task.attachments && task.attachments.length > 0 && (
        <div className="mt-2 pt-1 border-t border-zinc-100 flex items-center justify-end gap-1 text-[10px] font-medium text-zinc-500">
          <ImageIcon className="w-3 h-3 text-zinc-400" />
          <span>{task.attachments.length} photo{task.attachments.length > 1 ? 's' : ''}</span>
        </div>
      )}
    </div>
  );
}