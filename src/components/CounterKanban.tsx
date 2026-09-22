import React from 'react';
import { PaymentStatus } from '../types';
import { StaffRole } from '../types/auth';
import { ToastType } from './Toast';

export interface CounterTask {
  id: string;
  patientCode: string;
  currentStatus: PaymentStatus;
  lastUpdatedTime: string;
  lastUpdatedBy: string;
  notes?: string;
  attachments?: string[];
  packs?: any[];
}

interface CounterKanbanProps {
  tasks: CounterTask[];
  currentUserRole: StaffRole;
  onStatusChange: (id: string, newStatus: PaymentStatus) => void;
  onCardClick?: (task: CounterTask) => void;
  onShowToast: (message: string, type: ToastType) => void;
  searchQuery: string;
  visibleStatuses: PaymentStatus[];
}

const CounterKanban: React.FC<CounterKanbanProps> = ({
  tasks,
  currentUserRole,
  onStatusChange,
  onCardClick,
  onShowToast,
  searchQuery,
  visibleStatuses
}) => {
  const filteredTasks = tasks.filter(task => 
    task.patientCode.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 h-full min-h-0">
      {visibleStatuses.map((status) => {
        const columnTasks = filteredTasks.filter(t => t.currentStatus === status);

        return (
          <div 
            key={status} 
            /* 📌 高度設為 h-full 配合父層 flex-1 min-h-0 */
            className="flex flex-col bg-zinc-100/50 p-3.5 rounded-2xl border border-zinc-200/70 h-full min-h-0"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-3 px-1 flex-shrink-0">
              <h3 className="text-xs font-semibold tracking-wide uppercase text-zinc-600">
                {status}
              </h3>
              <span className="text-xs font-medium bg-zinc-200/70 text-zinc-700 px-2 py-0.5 rounded-full min-w-[20px] text-center">
                {columnTasks.length}
              </span>
            </div>

            {/* Task List (獨立滾動區域) */}
            <div 
              className="space-y-3 flex-1 min-h-0 overflow-y-auto pr-0.5"
              style={{
                scrollbarWidth: 'none',
                msOverflowStyle: 'none'
              }}
            >
              <style>{`
                div::-webkit-scrollbar {
                  display: none;
                }
              `}</style>

              {columnTasks.map((task) => (
                <div
                  key={task.id}
                  onClick={() => onCardClick && onCardClick(task)}
                  className="group bg-white p-4 rounded-xl border border-zinc-200/80 shadow-xs hover:border-zinc-300 hover:shadow-md transition-all duration-200 cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-base font-semibold tracking-tight text-zinc-900 group-hover:text-black">
                      {task.patientCode}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${
                      task.currentStatus === 'Paid' 
                        ? 'bg-zinc-100 text-zinc-800 border-zinc-300' 
                        : 'bg-amber-50/80 text-amber-700 border-amber-200/80'
                    }`}>
                      {task.currentStatus}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end gap-2 mt-3 pt-2.5 border-t border-zinc-100">
                    {task.currentStatus === 'Unpaid' ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onStatusChange(task.id, 'Paid');
                          onShowToast(`Payment mark as Paid for ${task.patientCode}`, 'success');
                        }}
                        className="px-3 py-1 bg-zinc-900 text-white rounded-lg text-xs font-medium hover:bg-black transition-colors shadow-xs"
                      >
                        Mark Paid
                      </button>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onStatusChange(task.id, 'Unpaid');
                          onShowToast(`Status reverted to Unpaid for ${task.patientCode}`, 'info');
                        }}
                        className="px-3 py-1 bg-zinc-100 text-zinc-700 border border-zinc-200 rounded-lg text-xs font-medium hover:bg-zinc-200/80 transition-colors"
                      >
                        Mark Unpaid
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {columnTasks.length === 0 && (
                <div className="h-32 flex items-center justify-center text-xs font-medium text-zinc-400 border border-dashed border-zinc-200 rounded-xl bg-zinc-50/50">
                  No records
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default CounterKanban;