import { useState, useEffect } from 'react';
import { StaffRole } from '../types/auth';
import { ROLE_PERMISSIONS } from '../types'
import {
  PatientTask,
  WebsterPakStatus,
  DispensaryStatus,
  PaymentStatus,
  DISPENSARY_COLUMNS,
  PatientFormData,
  StatusHistory
} from '../types';
import {
  PaymentRecord,
  subscribeToPatients,
  subscribeToPaymentRecords,
  updatePatientStatusInService,
  updatePatientInService,
  addPatientToService,
  deletePatientFromService,
  updatePaymentStatusInService
} from '../services/patientService';

// 引入全頁 Layout (已包含 Header)
import MainLayout from '../components/layouts/MainLayout';

import DispensaryKanban from '../components/DispensaryKanban';
import CounterKanban, { CounterTask } from '../components/CounterKanban';
import PatientModal from '../components/PatientModal';
import AddPatientModal from '../components/AddPatientModal';
import Toast, { ToastType } from '../components/Toast';
import AIAssistantModal from '../components/AIAssistantModal';
import { Plus, Search, Filter, X, Store, CreditCard, CheckSquare, ArrowRight } from 'lucide-react';
import { isFirebaseInitialized } from '../firebase';
import { useAuth } from '../context/AuthContext';

const PAYMENT_COLUMNS: PaymentStatus[] = ['Unpaid', 'Paid'];

const generateMockTasks = (): PatientTask[] => [];

export default function DashboardPage() {
  // 從 AuthContext 取出當前登入員工資訊
  const { currentStaff } = useAuth();

  // 將登入員工角色自動同步至看板權限（系統最高權限 mapping）
  const currentUserRole: StaffRole = (currentStaff?.role === 'admin' ? 'pharmacist' : currentStaff?.role) as StaffRole || 'retail assistant';

  // 📌 從權限對照表中取得目前使用者的看板權限
  const userPermissions = ROLE_PERMISSIONS[currentUserRole] || {
    canAccessDispensary: false,
    canAccessCounter: true
  };

  const showDispensary = userPermissions.canAccessDispensary;
  const showCounter = userPermissions.canAccessCounter;

  const [tasks, setTasks] = useState<PatientTask[]>([]);
  const [paymentRecords, setPaymentRecords] = useState<PaymentRecord[]>([]);

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  // 批量選取狀態與下拉選單選擇之目標狀態
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [batchTargetStatus, setBatchTargetStatus] = useState<DispensaryStatus | ''>('');

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [statusHistory, setStatusHistory] = useState<Record<string, StatusHistory[]>>({});
  const [useLocalFallback, setUseLocalFallback] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [visibleStatuses, setVisibleStatuses] = useState<DispensaryStatus[]>(DISPENSARY_COLUMNS);
  const [showFilterPanel, setShowFilterPanel] = useState(false);

  const selectedTask = tasks.find(t => t.id === selectedTaskId) || null;

  // 目前已選取的任務狀態
  const selectedTaskStatus: DispensaryStatus | null = selectedTaskIds.length > 0
    ? (tasks.find(t => t.id === selectedTaskIds[0])?.currentStatus as DispensaryStatus || null)
    : null;

  // 取得與目前選取 Task 相同狀態的所有 Tasks (支援搜尋過濾)
  const sameStatusTasksInColumn = selectedTaskStatus
    ? tasks.filter(t => t.currentStatus === selectedTaskStatus && t.patientCode.toLowerCase().includes(searchQuery.toLowerCase()))
    : [];

  const isAllColumnSelected = sameStatusTasksInColumn.length > 0 && sameStatusTasksInColumn.every(t => selectedTaskIds.includes(t.id));

  // 全選當前欄位中的所有 Tasks
  const handleSelectAllInColumn = () => {
    if (!selectedTaskStatus) return;
    const allIdsInCol = sameStatusTasksInColumn.map(t => t.id);
    setSelectedTaskIds(allIdsInCol);
  };

  // 可轉移的目標狀態列表（排除自身狀態，且防呆控制 Pharmacist 專屬權限）
  const availableTargetStatuses = DISPENSARY_COLUMNS.filter(status => {
    if (status === selectedTaskStatus) return false;
    if (status === 'Rejected' && currentUserRole !== 'pharmacist') return false;
    return true;
  });

  useEffect(() => {
    const firebaseReady = isFirebaseInitialized();

    if (firebaseReady) {
      const unsubPatients = subscribeToPatients(
        (patientsData) => {
          setTasks(patientsData);
          setUseLocalFallback(false);
        },
        (error) => {
          console.error('Firestore Patients error:', error);
          setTasks(generateMockTasks());
          setUseLocalFallback(true);
        }
      );

      const unsubPayments = subscribeToPaymentRecords(
        (paymentsData) => {
          setPaymentRecords(paymentsData);
        },
        (error) => {
          console.error('Firestore Payment Records error:', error);
        }
      );

      return () => {
        unsubPatients();
        unsubPayments();
      };
    } else {
      setTasks(generateMockTasks());
      setUseLocalFallback(true);
    }
  }, []);

  const handleToggleSelectTask = (taskId: string) => {
    const targetTask = tasks.find(t => t.id === taskId);
    if (!targetTask) return;

    if (selectedTaskIds.includes(taskId)) {
      setSelectedTaskIds(prev => prev.filter(id => id !== taskId));
    } else {
      if (selectedTaskStatus && selectedTaskStatus !== targetTask.currentStatus) {
        handleShowToast('Cannot select tasks with different statuses simultaneously.', 'error');
        return;
      }
      setSelectedTaskIds(prev => [...prev, taskId]);
    }
  };

  const handleClearSelection = () => {
    setSelectedTaskIds([]);
    setBatchTargetStatus('');
  };

  // 執行批量更新
  const handleExecuteBatchUpdate = async () => {
    if (!batchTargetStatus) {
      handleShowToast('Please select a target status first.', 'error');
      return;
    }

    if (selectedTaskIds.length === 0) return;

    const verificationData = currentUserRole === 'pharmacist' && batchTargetStatus === 'Ready for Collection'
      ? { checkedBy: 'pharmacist', checkedAt: new Date().toISOString() }
      : undefined;

    try {
      await Promise.all(
        selectedTaskIds.map(id =>
          handleStatusChange(id, batchTargetStatus, verificationData)
        )
      );

      handleShowToast(
        `Successfully moved ${selectedTaskIds.length} tasks to "${batchTargetStatus}"`,
        'success'
      );
      setSelectedTaskIds([]);
      setBatchTargetStatus('');
    } catch (err) {
      console.error('Failed to batch update status:', err);
      handleShowToast('Failed to perform batch update. Please try again.', 'error');
    }
  };

  const handleStatusChange = async (
    taskId: string,
    newStatus: WebsterPakStatus,
    verificationData?: { checkedBy: string; checkedAt: string }
  ) => {
    const targetTask = tasks.find(t => t.id === taskId);
    if (!targetTask) return;

    try {
      const { updatedTask, newPaymentRecordId } = await updatePatientStatusInService(
        targetTask,
        newStatus as DispensaryStatus,
        currentStaff?.name || 'Unknown Staff',
        verificationData,
        useLocalFallback
      );

      if (useLocalFallback) {
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...updatedTask } : t));

        if (newStatus === 'Collected' && targetTask.currentStatus !== 'Collected' && newPaymentRecordId) {
          setPaymentRecords(prev => [
            ...prev,
            {
              id: newPaymentRecordId,
              dispensaryTaskId: taskId,
              patientCode: targetTask.patientCode,
              paymentStatus: 'Unpaid',
              createdAt: new Date().toISOString()
            }
          ]);
        } else if (targetTask.currentStatus === 'Collected' && newStatus !== 'Collected') {
          setPaymentRecords(prev => prev.filter(p => p.id !== targetTask.paymentRecordId));
        }
      }

      const newHistory: StatusHistory = {
        status: newStatus,
        timestamp: new Date().toISOString(),
        updatedBy: currentStaff?.name || 'Unknown Staff'
      };
      setStatusHistory(prev => ({
        ...prev,
        [taskId]: [...(prev[taskId] || []), newHistory]
      }));

    } catch (err) {
      console.error('Failed to change status:', err);
    }
  };

  const handlePaymentStatusChange = async (paymentRecordId: string, newStatus: PaymentStatus) => {
    try {
      await updatePaymentStatusInService(paymentRecordId, newStatus, useLocalFallback);
      if (useLocalFallback) {
        setPaymentRecords(prev => prev.map(p => p.id === paymentRecordId ? { ...p, paymentStatus: newStatus } : p));
      }
    } catch (err) {
      console.error('Failed to update payment status:', err);
    }
  };

  const handleUpdateTask = async (taskId: string, updates: Partial<PatientTask>) => {
    const targetTask = tasks.find(t => t.id === taskId);
    try {
      const { taskUpdates, updatedPaymentRecordId } = await updatePatientInService(
        taskId,
        updates,
        currentStaff?.name || 'Unknown Staff',
        useLocalFallback,
        targetTask
      );

      if (useLocalFallback && targetTask) {
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...taskUpdates } : t));

        if (targetTask.currentStatus === 'Collected' && typeof updates.isAccountPayment === 'boolean') {
          if (updates.isAccountPayment && targetTask.paymentRecordId) {
            setPaymentRecords(prev => prev.filter(p => p.id !== targetTask.paymentRecordId));
          } else if (!updates.isAccountPayment && !targetTask.paymentRecordId && updatedPaymentRecordId) {
            setPaymentRecords(prev => [
              ...prev,
              {
                id: updatedPaymentRecordId,
                dispensaryTaskId: taskId,
                patientCode: targetTask.patientCode,
                paymentStatus: 'Unpaid',
                createdAt: new Date().toISOString()
              }
            ]);
          }
        }
      }
    } catch (err) {
      console.error('Failed to update task:', err);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    const targetTask = tasks.find(t => t.id === taskId);
    if (!targetTask) return;

    try {
      await deletePatientFromService(taskId, targetTask.paymentRecordId, useLocalFallback);
      if (useLocalFallback) {
        if (targetTask.paymentRecordId) {
          setPaymentRecords(prev => prev.filter(p => p.id !== targetTask.paymentRecordId));
        }
        setTasks(prev => prev.filter(t => t.id !== taskId));
      }
      setSelectedTaskId(null);
    } catch (err) {
      console.error('Failed to delete task:', err);
    }
  };

  const handleAddPatient = async (formData: PatientFormData & { initialStatus?: string }) => {
    const trimmedCode = formData.patientCode.trim();

    const isDuplicate = tasks.some(
      (task) => task.patientCode.trim().toLowerCase() === trimmedCode.toLowerCase()
    );

    if (isDuplicate) {
      handleShowToast(`Patient Code "${trimmedCode}" already exists in the system.`, 'error');
      return;
    }

    try {
      const newTask = await addPatientToService(
        formData, 
        currentStaff?.name || 'Unknown Staff', 
        useLocalFallback);
      if (useLocalFallback) {
        setTasks(prev => [...prev, newTask]);
      }
      handleShowToast(`Patient "${trimmedCode}" added successfully!`, 'success');
      setIsAddModalOpen(false);
    } catch (err) {
      console.error('Failed to add patient:', err);
      handleShowToast('Failed to add patient. Please try again.', 'error');
    }
  };

  const handleUpdatePatientCode = async (taskId: string, newCode: string) => {
    await handleUpdateTask(taskId, { patientCode: newCode });
  };

  const canManagePatients = currentUserRole === 'pharmacist' || currentUserRole === 'manager' || currentUserRole === 'admin';

  const handleShowToast = (message: string, type: ToastType) => {
    setToast({ message, type });
  };

  const counterTasksForKanban: CounterTask[] = paymentRecords.map(record => ({
    id: record.id,
    patientCode: record.patientCode,
    currentStatus: record.paymentStatus,
    lastUpdatedTime: record.createdAt,
    lastUpdatedBy: 'Counter',
    notes: '',
    attachments: [],
    packs: []
  }));

  const handleCardClick = (task: PatientTask) => {
    if (task && task.id) {
      setSelectedTaskId(task.id);
    }
  };

  return (
    <MainLayout useLocalFallback={useLocalFallback}>
      <div className="h-full max-w-[1920px] w-full mx-auto px-6 py-3.5 flex flex-col gap-3 overflow-y-auto">

        {/* AI Smart Operations Assistant */}
        <AIAssistantModal
          tasks={tasks}
          paymentRecords={paymentRecords}
        />

        {/* Toolbar */}
        <div className="flex-shrink-0 bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 flex gap-3 max-w-2xl">
              <div className="flex-1 relative">
                <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value.trim().toUpperCase())}
                  placeholder="Search patient code"
                  className="w-full pl-10 pr-9 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:bg-white transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <button
                onClick={() => setShowFilterPanel(!showFilterPanel)}
                className={`px-3.5 py-1.5 border rounded-lg text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer ${showFilterPanel
                  ? 'bg-slate-800 text-white border-slate-800 shadow-sm'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
              >
                <Filter className="w-4 h-4" />
                Filter Columns
              </button>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
                Total Patients: <span className="text-slate-900 font-bold text-sm ml-1">{tasks.length}</span>
              </div>

              {canManagePatients && (
                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className="px-3.5 py-1.5 bg-slate-800 text-white text-xs font-semibold rounded-lg hover:bg-slate-900 transition-colors shadow-sm flex items-center gap-2 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Add Patient
                </button>
              )}
            </div>
          </div>

          {/* Filter Panel */}
          {showFilterPanel && (
            <div className="pt-2.5 border-t border-slate-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Column Display Settings</span>
                <button
                  onClick={() => {
                    setVisibleStatuses(DISPENSARY_COLUMNS);
                    setSearchQuery('');
                  }}
                  className="text-xs text-slate-600 hover:underline font-semibold cursor-pointer"
                >
                  Reset to Default
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {DISPENSARY_COLUMNS.map(status => (
                  <label key={status} className="flex items-center gap-2 cursor-pointer bg-slate-50 px-3 py-1 rounded-md border border-slate-200 hover:bg-slate-100 transition-colors text-xs font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={visibleStatuses.includes(status)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setVisibleStatuses([...visibleStatuses, status]);
                        } else {
                          setVisibleStatuses(visibleStatuses.filter(s => s !== status));
                        }
                      }}
                      className="w-3.5 h-3.5 text-slate-800 rounded focus:ring-slate-500 border-slate-300 cursor-pointer"
                    />
                    {status}
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        {selectedTaskIds.length > 0 && (
          <div className="bg-[#343a40] flex-shrink-0 text-white px-4 py-2.5 rounded-xl shadow-sm flex items-center justify-between gap-4 border border-slate-300/40">
            <div className="flex items-center gap-3">
              <CheckSquare className="w-4 h-4 text-white/90" />
              <span className="bg-black/20 px-2.5 py-0.5 rounded-md text-xs font-bold text-white">
                {selectedTaskIds.length} Selected ({selectedTaskStatus})
              </span>

              {!isAllColumnSelected && (
                <button
                  onClick={handleSelectAllInColumn}
                  className="text-xs bg-white/20 hover:bg-white/30 text-white px-2 py-0.5 rounded font-medium transition-colors cursor-pointer"
                >
                  Select All in "{selectedTaskStatus}" ({sameStatusTasksInColumn.length})
                </button>
              )}

              <button
                onClick={handleClearSelection}
                className="text-xs text-white/80 hover:text-white underline font-medium cursor-pointer"
              >
                Deselect All
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-white/90">Batch Move to:</span>

              <select
                value={batchTargetStatus}
                onChange={(e) => setBatchTargetStatus(e.target.value as DispensaryStatus)}
                className="bg-white text-slate-800 text-xs font-semibold py-1 px-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-400 cursor-pointer"
              >
                <option value="" disabled>-- Select Target Status --</option>
                {availableTargetStatuses.map(status => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>

              <button
                onClick={handleExecuteBatchUpdate}
                disabled={!batchTargetStatus}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 shadow-xs ${batchTargetStatus
                  ? 'bg-slate-900 text-white hover:bg-black cursor-pointer'
                  : 'bg-white/20 text-white/50 cursor-not-allowed'
                  }`}
              >
                <span>Confirm Move</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Board Main Area - 依據權限彈性切換版面 */}
        <div className="flex-1 min-h-0">
          {showDispensary && showCounter ? (
            /* 1. 調劑區與櫃檯皆可看見（雙欄模式） */
            <div className="h-full grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
              <section className="lg:col-span-8 flex flex-col min-h-0 bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex-shrink-0 flex items-center justify-between mb-2.5 pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-slate-100 text-slate-700 rounded-lg">
                      <Store className="w-4 h-4" />
                    </div>
                    <h1 className="text-sm font-bold text-slate-900">Dispensary Station</h1>
                  </div>
                </div>
                <div className="flex-1 min-h-0">
                  <DispensaryKanban
                    tasks={tasks}
                    currentUserRole={currentUserRole}
                    selectedTaskIds={selectedTaskIds}
                    selectedTaskStatus={selectedTaskStatus}
                    onToggleSelectTask={handleToggleSelectTask}
                    onStatusChange={handleStatusChange}
                    onCardClick={handleCardClick}
                    onUpdateRejectReason={(taskId, reason) => handleUpdateTask(taskId, { rejectReason: reason })}
                    onShowToast={handleShowToast}
                    searchQuery={searchQuery}
                    visibleStatuses={visibleStatuses}
                  />
                </div>
              </section>

              <section className="lg:col-span-4 flex flex-col min-h-0 bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex-shrink-0 flex items-center justify-between mb-2.5 pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-slate-100 text-slate-700 rounded-lg">
                      <CreditCard className="w-4 h-4" />
                    </div>
                    <h1 className="text-sm font-bold text-slate-900">Checkout Counter</h1>
                  </div>
                </div>
                <div className="flex-1 min-h-0">
                  <CounterKanban
                    tasks={counterTasksForKanban}
                    currentUserRole={currentUserRole}
                    onStatusChange={(id: string, newStatus: PaymentStatus) => handlePaymentStatusChange(id, newStatus)}
                    onShowToast={handleShowToast}
                    searchQuery={searchQuery}
                    visibleStatuses={PAYMENT_COLUMNS}
                  />
                </div>
              </section>
            </div>
          ) : showCounter ? (
            /* 2. 僅可看見櫃檯（單欄收銀模式） */
            <section className="h-full max-w-5xl w-full mx-auto flex flex-col bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex-shrink-0 flex items-center gap-3 mb-4 pb-3 border-b border-slate-100">
                <div className="p-2 bg-slate-100 text-slate-700 rounded-lg">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Retail Checkout Counter</h2>
                  <p className="text-xs text-slate-500">Patient collections and payment completion status</p>
                </div>
              </div>
              <div className="flex-1 min-h-0">
                <CounterKanban
                  tasks={counterTasksForKanban}
                  currentUserRole={currentUserRole}
                  onStatusChange={(id: string, newStatus: PaymentStatus) => handlePaymentStatusChange(id, newStatus)}
                  onShowToast={handleShowToast}
                  searchQuery={searchQuery}
                  visibleStatuses={PAYMENT_COLUMNS}
                />
              </div>
            </section>
          ) : showDispensary ? (
            /* 3. 僅可看見調劑區（單欄配藥模式） */
            <section className="h-full w-full flex flex-col bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex-shrink-0 flex items-center gap-3 mb-4 pb-3 border-b border-slate-100">
                <div className="p-2 bg-slate-100 text-slate-700 rounded-lg">
                  <Store className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Dispensary Station</h2>
                  <p className="text-xs text-slate-500">Prescription packing and clinical verification status</p>
                </div>
              </div>
              <div className="flex-1 min-h-0">
                <DispensaryKanban
                  tasks={tasks}
                  currentUserRole={currentUserRole}
                  selectedTaskIds={selectedTaskIds}
                  selectedTaskStatus={selectedTaskStatus}
                  onToggleSelectTask={handleToggleSelectTask}
                  onStatusChange={handleStatusChange}
                  onCardClick={handleCardClick}
                  onUpdateRejectReason={(taskId, reason) => handleUpdateTask(taskId, { rejectReason: reason })}
                  onShowToast={handleShowToast}
                  searchQuery={searchQuery}
                  visibleStatuses={visibleStatuses}
                />
              </div>
            </section>
          ) : (
            /* 4. 無權限時顯示提示 */
            <div className="h-full flex items-center justify-center text-slate-400 text-sm">
              No station permissions granted for this role.
            </div>
          )}
        </div>

        {/* Patient Detail Modal */}
        {selectedTask && (
          <PatientModal
            task={selectedTask}
            isOpen={!!selectedTaskId}
            onClose={() => setSelectedTaskId(null)}
            currentUserRole={currentUserRole}
            currentStaffName={currentStaff?.name || 'Unknown Staff'}
            onUpdateTask={handleUpdateTask}
            onDeleteTask={handleDeleteTask}
            statusHistory={selectedTaskId ? statusHistory[selectedTaskId] || [] : []}
            onUpdatePatientCode={handleUpdatePatientCode}
          />
        )}

        {/* Add Patient Modal */}
        <AddPatientModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onAddPatient={handleAddPatient}
        />

        {/* Toast Notification */}
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}
      </div>
    </MainLayout>
  );
}