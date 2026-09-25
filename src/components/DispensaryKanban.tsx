// src/components/DispensaryKanban.tsx
import React from 'react';
import { PatientTask, DispensaryStatus } from '../types';
import { StaffRole } from '../types/auth';
import TaskCard from './TaskCard';
import { ToastType } from './Toast';

interface DispensaryKanbanProps {
  tasks: PatientTask[];
  currentUserRole: StaffRole;
  selectedTaskIds?: string[];
  selectedTaskStatus?: DispensaryStatus | null;
  onToggleSelectTask?: (taskId: string) => void;
  onStatusChange: (taskId: string, newStatus: DispensaryStatus) => void;
  onCardClick: (task: PatientTask) => void;
  onUpdateRejectReason?: (taskId: string, reason: string) => void;
  onShowToast: (message: string, type: ToastType) => void;
  searchQuery: string;
  visibleStatuses: DispensaryStatus[];
}

export default function DispensaryKanban({
  tasks,
  currentUserRole,
  selectedTaskIds = [],
  selectedTaskStatus,
  onToggleSelectTask,
  onStatusChange,
  onCardClick,
  onUpdateRejectReason,
  onShowToast,
  searchQuery,
  visibleStatuses
}: DispensaryKanbanProps) {
  // 過濾搜尋條件 (Patient Code 或關鍵字)
  const filteredTasks = tasks.filter(task => 
    task.patientCode.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetStatus: DispensaryStatus) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain');
    if (!taskId) return;

    // 權限檢查：只有 Pharmacist (或更高層級如 Manager/Admin) 才可以拒絕任務
    const canReject = ['pharmacist', 'manager', 'admin'].includes(currentUserRole);

    if (targetStatus === 'Rejected' && !canReject) {
      onShowToast('Only pharmacists have permission to reject tasks.', 'error');
      return;
    }

    if (targetStatus === 'Rejected') {
      onShowToast('Please provide a rejection reason on the card.', 'info');
    }

    onStatusChange(taskId, targetStatus);
  };

  // 📌 動態計算欄（Columns）與列（Rows），實現自適應高度與寬度
  const totalItems = visibleStatuses.length;
  // 若欄位數 > 4 則分兩列，否則排成單列；欄數依總數動態計算
  const gridRows = totalItems > 4 ? 2 : 1;
  const gridCols = Math.ceil(totalItems / gridRows) || 1;

  return (
    <div 
      className="grid gap-3.5 h-full w-full min-h-0 min-w-0"
      style={{
        gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))`,
        gridTemplateRows: `repeat(${gridRows}, minmax(0, 1fr))`
      }}
    >
      {visibleStatuses.map(status => {
        const columnTasks = filteredTasks.filter(t => t.currentStatus === status);

        return (
          <div
            key={status}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, status)}
            className="flex flex-col bg-zinc-100/50 p-2.5 rounded-2xl border border-zinc-200/70 h-full w-full min-h-0 min-w-0 transition-all duration-200 overflow-hidden"
          >
            {/* Column Header */}
            <div className="flex items-center justify-between mb-2 px-1 flex-shrink-0">
              <h3 className="text-xs font-semibold tracking-wide uppercase text-zinc-600 truncate pr-1">
                {status}
              </h3>
              <span className="text-xs font-medium bg-zinc-200/70 text-zinc-700 px-2 py-0.5 rounded-full min-w-[20px] text-center flex-shrink-0">
                {columnTasks.length}
              </span>
            </div>

            {/* Task Cards Container */}
            <div 
              className="space-y-2 flex-1 min-h-0 overflow-y-auto pr-0.5 scrollbar-none"
            >
              {columnTasks.map(task => {
                const isSelected = selectedTaskIds.includes(task.id);
                // 異態禁用判斷：已選取其他狀態的卡片時，停用目前卡片的勾選
                const isDisabled = Boolean(
                  selectedTaskStatus && selectedTaskStatus !== task.currentStatus
                );

                return (
                  <TaskCard
                    key={task.id}
                    task={task}
                    currentUserRole={currentUserRole}
                    isSelected={isSelected}
                    disabledSelection={isDisabled}
                    selectionDisabledTooltip="Can only batch update tasks with the same status"
                    onToggleSelect={onToggleSelectTask}
                    onClick={() => onCardClick(task)}
                    onUpdateRejectReason={onUpdateRejectReason}
                    onShowToast={onShowToast}
                  />
                );
              })}

              {columnTasks.length === 0 && (
                <div className="h-full min-h-[60px] flex items-center justify-center text-xs font-medium text-zinc-400 border border-dashed border-zinc-200 rounded-xl bg-zinc-50/50">
                  No tasks
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}