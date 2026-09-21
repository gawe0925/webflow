import { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { PatientTask, UserRole, WebsterPakStatus, ROLE_PERMISSIONS } from '../types';
import TaskCard from './TaskCard';

interface KanbanBoardProps {
  tasks: PatientTask[];
  currentUserRole: UserRole;
  onStatusChange: (id: string, newStatus: WebsterPakStatus | string, verificationData?: any) => void;
  onCardClick: (task: PatientTask) => void;
  onShowToast: (message: string, type: 'error' | 'success' | 'info') => void;
  searchQuery: string;
  visibleStatuses: string[];
  availableColumns: string[]; // 接收當前看板擁有的全部欄位
}

export default function KanbanBoard({
  tasks,
  currentUserRole,
  onStatusChange,
  onCardClick,
  onShowToast,
  searchQuery,
  visibleStatuses,
  availableColumns
}: KanbanBoardProps) {
  const [columns, setColumns] = useState<Record<string, PatientTask[]>>(() => {
    return availableColumns.reduce((acc, status) => {
      acc[status] = tasks.filter(task => (task.currentStatus || (task as any).paymentStatus) === status);
      return acc;
    }, {} as Record<string, PatientTask[]>);
  });

  useEffect(() => {
    const updatedColumns = availableColumns.reduce((acc, status) => {
      acc[status] = tasks.filter(task => (task.currentStatus || (task as any).paymentStatus) === status);
      return acc;
    }, {} as Record<string, PatientTask[]>);

    setColumns(updatedColumns);
  }, [tasks, availableColumns]);

  const permissions = ROLE_PERMISSIONS[currentUserRole];

  const visibleColumns = availableColumns.filter(status => visibleStatuses.includes(status));

  const getFilteredTasks = (status: string) => {
    const statusTasks = columns[status] || [];
    if (searchQuery.trim()) {
      return statusTasks.filter(task =>
        task.patientCode?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    return statusTasks;
  };

  const onDragEnd = (result: DropResult) => {
    const { source, destination } = result;
    if (!destination) return;

    const sourceColumn = source.droppableId;
    const destinationColumn = destination.droppableId;

    if (destinationColumn === 'Ready for Collection' && !permissions.canSignOffReady) {
      onShowToast('Access Denied: Only a Pharmacist can sign off and check the Webster-pak.', 'error');
      return;
    }

    if (sourceColumn === destinationColumn) {
      const newTasks = [...(columns[sourceColumn] || [])];
      const [reorderedTask] = newTasks.splice(source.index, 1);
      newTasks.splice(destination.index, 0, reorderedTask);

      setColumns({ ...columns, [sourceColumn]: newTasks });
    } else {
      const sourceTasks = [...(columns[sourceColumn] || [])];
      const destTasks = [...(columns[destinationColumn] || [])];

      const [movedTask] = sourceTasks.splice(source.index, 1);
      destTasks.splice(destination.index, 0, movedTask);

      setColumns({
        ...columns,
        [sourceColumn]: sourceTasks,
        [destinationColumn]: destTasks
      });

      let verificationData;
      if (destinationColumn === 'Ready for Collection' && permissions.canSignOffReady) {
        verificationData = {
          checkedBy: currentUserRole === 'pharmacist' ? 'Pharmacist' : 'Manager',
          checkedAt: new Date().toISOString()
        };
      }

      onStatusChange(movedTask.id, destinationColumn, verificationData);
    }
  };

  const getColumnColor = (status: string) => {
    const colors: Record<string, string> = {
      'TODO': 'bg-gray-100',
      'Packing in Progress': 'bg-blue-50',
      'Pending Pharmacist Check': 'bg-yellow-50 border-yellow-300',
      'Rejected': 'bg-red-50',
      'Ready for Collection': 'bg-green-50',
      'Collected': 'bg-purple-50',
      'Unpaid': 'bg-orange-50',
      'Paid': 'bg-teal-50'
    };
    return colors[status] || 'bg-gray-50';
  };

  const getColumnHeaderColor = (status: string) => {
    const colors: Record<string, string> = {
      'TODO': 'bg-gray-200',
      'Packing in Progress': 'bg-blue-200',
      'Pending Pharmacist Check': 'bg-yellow-100 border-yellow-300',
      'Rejected': 'bg-red-200',
      'Ready for Collection': 'bg-green-200',
      'Collected': 'bg-purple-200',
      'Unpaid': 'bg-orange-200',
      'Paid': 'bg-teal-200'
    };
    return colors[status] || 'bg-gray-200';
  };

  return (
    <div className="h-full flex flex-col">
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {visibleColumns.map((status) => {
            const filteredTasks = getFilteredTasks(status);
            return (
              <div key={status} className="flex-shrink-0 w-80">
                <div className={`${getColumnColor(status)} rounded-lg border border-gray-200 flex flex-col h-full`}>
                  <div className={`${getColumnHeaderColor(status)} p-3 rounded-t-lg border-b border-gray-200`}>
                    <h3 className="font-semibold text-gray-800 flex items-center justify-between">
                      {status}
                      <span className="bg-white px-2 py-1 rounded-full text-xs font-medium text-gray-600">
                        {filteredTasks.length}
                      </span>
                    </h3>
                  </div>

                  <Droppable droppableId={status}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`p-3 flex-1 overflow-y-auto min-h-[200px] space-y-3 ${
                          snapshot.isDraggingOver ? 'bg-blue-50' : ''
                        }`}
                      >
                        {filteredTasks.length === 0 ? (
                          <div className="text-center py-8 text-gray-500 text-sm">
                            {searchQuery ? 'No patients found' : 'No tasks in this column'}
                          </div>
                        ) : (
                          filteredTasks.map((task, index) => (
                            <Draggable key={task.id} draggableId={String(task.id)} index={index}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className={`cursor-pointer ${snapshot.isDragging ? 'opacity-50' : ''}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onCardClick(task);
                                  }}
                                >
                                  <TaskCard
                                    task={task}
                                    onClick={() => onCardClick(task)}
                                    isDragging={snapshot.isDragging}
                                  />
                                </div>
                              )}
                            </Draggable>
                          ))
                        )}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </div>
              </div>
            );
          })}
        </div>
      </DragDropContext>
    </div>
  );
}