import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Task, TaskStatus, TaskPriority } from '../types';
import { TaskItem } from './TaskItem';
import { exportMultipleTasksToGoogleCalendar } from '../services/calendarService';

interface TaskListProps {
  tasks: Task[];
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onBulkUpdate?: (tasks: Task[]) => void;
  onReorderTasks?: (reorderedTasks: Task[]) => void;
}

type SortKey = 'startDate' | 'endDate' | 'priority' | 'status';
type SortOrder = 'asc' | 'desc';

interface FilterState {
  status: TaskStatus | 'all';
  priority: TaskPriority | 'all';
  dateRange: 'all' | 'today' | 'thisWeek' | 'thisMonth';
}

const SORT_LABELS: { [key in SortKey]: string } = {
  startDate: '開始日',
  endDate: '終了日',
  priority: '優先度',
  status: 'ステータス',
};

export const TaskList: React.FC<TaskListProps> = ({ tasks, onEditTask, onDeleteTask, onBulkUpdate, onReorderTasks }) => {
  const [sortKey, setSortKey] = useState<SortKey>('startDate');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    status: 'all',
    priority: 'all',
    dateRange: 'all'
  });

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  const handleExportAllToCalendar = () => {
    exportMultipleTasksToGoogleCalendar(tasks);
  };

  const handleTaskSelection = (taskId: string, isSelected: boolean) => {
    const newSelectedTasks = new Set(selectedTasks);
    if (isSelected) {
      newSelectedTasks.add(taskId);
    } else {
      newSelectedTasks.delete(taskId);
    }
    setSelectedTasks(newSelectedTasks);
  };

  const handleSelectAll = () => {
    if (selectedTasks.size === tasks.length) {
      setSelectedTasks(new Set());
    } else {
      setSelectedTasks(new Set(tasks.map(task => task.id)));
    }
  };

  const handleBulkDelete = () => {
    if (selectedTasks.size === 0) return;
    if (window.confirm(`選択した${selectedTasks.size}個のタスクを削除してもよろしいですか？`)) {
      selectedTasks.forEach(taskId => onDeleteTask(taskId));
      setSelectedTasks(new Set());
      setIsSelectionMode(false);
    }
  };

  const handleBulkStatusChange = (status: TaskStatus) => {
    if (selectedTasks.size === 0 || !onBulkUpdate) return;
    const updatedTasks = tasks.map(task => 
      selectedTasks.has(task.id) ? { ...task, status } : task
    );
    onBulkUpdate(updatedTasks);
    setSelectedTasks(new Set());
    setIsSelectionMode(false);
  };

  const toggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode);
    if (isSelectionMode) {
      setSelectedTasks(new Set());
    }
  };

  const applyFilters = (tasks: Task[]): Task[] => {
    return tasks.filter(task => {
      // Status filter
      if (filters.status !== 'all' && task.status !== filters.status) {
        return false;
      }
      
      // Priority filter
      if (filters.priority !== 'all' && task.priority !== filters.priority) {
        return false;
      }
      
      // Date range filter
      if (filters.dateRange !== 'all') {
        const taskDate = new Date(task.startDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        switch (filters.dateRange) {
          case 'today':
            const todayEnd = new Date(today);
            todayEnd.setHours(23, 59, 59, 999);
            if (taskDate < today || taskDate > todayEnd) return false;
            break;
          case 'thisWeek':
            const weekStart = new Date(today);
            weekStart.setDate(today.getDate() - today.getDay());
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 6);
            weekEnd.setHours(23, 59, 59, 999);
            if (taskDate < weekStart || taskDate > weekEnd) return false;
            break;
          case 'thisMonth':
            const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
            const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
            monthEnd.setHours(23, 59, 59, 999);
            if (taskDate < monthStart || taskDate > monthEnd) return false;
            break;
        }
      }
      
      return true;
    });
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination || !onReorderTasks) {
      return;
    }

    const items = Array.from(sortedTasks);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    onReorderTasks(items);
  };

  const filteredTasks = applyFilters(tasks);
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    let aValue: any = a[sortKey];
    let bValue: any = b[sortKey];
    if (sortKey === 'priority') {
      // High > Medium > Low
      const order = { High: 3, Medium: 2, Low: 1 };
      aValue = order[a.priority];
      bValue = order[b.priority];
    } else if (sortKey === 'status') {
      // In Progress > Not Started > Completed
      const order = { 'In Progress': 2, 'Not Started': 1, 'Completed': 0 };
      aValue = order[a.status];
      bValue = order[b.status];
    } else if (sortKey === 'startDate' || sortKey === 'endDate') {
      aValue = new Date(aValue).getTime();
      bValue = new Date(bValue).getTime();
    }
    if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  if (tasks.length === 0) {
    return <p className="text-center text-slate-400 py-8">No tasks yet. Add one to get started!</p>;
  }

  if (filteredTasks.length === 0) {
    return <p className="text-center text-slate-400 py-8">フィルタ条件に一致するタスクがありません。</p>;
  }

  return (
    <div className="space-y-4">
      {/* Filter Controls */}
      <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
        <div className="flex flex-wrap gap-4 mb-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-slate-300">ステータス:</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({...filters, status: e.target.value as TaskStatus | 'all'})}
              className="bg-slate-700 border-slate-600 text-slate-100 text-sm rounded px-2 py-1"
            >
              <option value="all">すべて</option>
              {Object.values(TaskStatus).map(status => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-slate-300">優先度:</label>
            <select
              value={filters.priority}
              onChange={(e) => setFilters({...filters, priority: e.target.value as TaskPriority | 'all'})}
              className="bg-slate-700 border-slate-600 text-slate-100 text-sm rounded px-2 py-1"
            >
              <option value="all">すべて</option>
              {Object.values(TaskPriority).map(priority => (
                <option key={priority} value={priority}>{priority}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-slate-300">期間:</label>
            <select
              value={filters.dateRange}
              onChange={(e) => setFilters({...filters, dateRange: e.target.value as FilterState['dateRange']})}
              className="bg-slate-700 border-slate-600 text-slate-100 text-sm rounded px-2 py-1"
            >
              <option value="all">すべて</option>
              <option value="today">今日</option>
              <option value="thisWeek">今週</option>
              <option value="thisMonth">今月</option>
            </select>
          </div>
        </div>
      </div>

      {/* Sort and Bulk Actions */}
      <div className="flex flex-wrap justify-between items-center gap-2 mb-4">
        <div className="flex flex-wrap gap-2">
          {(['startDate', 'endDate', 'priority', 'status'] as SortKey[]).map(key => {
            const isActive = sortKey === key;
            let activeClass = '';
            if (isActive) {
              activeClass = sortOrder === 'asc'
                ? 'bg-sky-600 text-white border-sky-600'
                : 'bg-pink-600 text-white border-pink-600';
            } else {
              activeClass = 'bg-slate-700 text-slate-300 border-slate-600 hover:bg-slate-600';
            }
            return (
              <button
                key={key}
                onClick={() => handleSort(key)}
                className={`px-3 py-1 text-xs rounded border transition-colors font-medium ${activeClass}`}
              >
                {SORT_LABELS[key]}
                {isActive && (sortOrder === 'asc' ? ' ▲' : ' ▼')}
              </button>
            );
          })}
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={toggleSelectionMode}
            className={`px-3 py-1 text-sm font-medium rounded transition-colors ${
              isSelectionMode 
                ? 'bg-purple-600 text-white' 
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            {isSelectionMode ? '選択モード終了' : '選択モード'}
          </button>
          
          {tasks.length > 0 && (
            <button
              onClick={handleExportAllToCalendar}
              className="px-4 py-2 text-sm font-medium text-green-400 bg-green-900/50 hover:bg-green-800/70 rounded-md transition-colors border border-green-700 hover:border-green-600"
              title="全タスクをGoogle Calendarにエクスポート"
            >
              📅 全タスクをカレンダーに追加
            </button>
          )}
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {isSelectionMode && (
        <div className="bg-purple-900/30 p-3 rounded-lg border border-purple-700 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-300">
              <input
                type="checkbox"
                checked={selectedTasks.size === tasks.length}
                onChange={handleSelectAll}
                className="form-checkbox h-4 w-4 text-purple-600 bg-slate-800 border-slate-600 rounded"
              />
              全選択 ({selectedTasks.size}/{tasks.length})
            </label>
          </div>
          
          {selectedTasks.size > 0 && (
            <div className="flex gap-2">
              <button
                onClick={() => handleBulkStatusChange(TaskStatus.IN_PROGRESS)}
                className="px-3 py-1 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded"
              >
                進行中に変更
              </button>
              <button
                onClick={() => handleBulkStatusChange(TaskStatus.COMPLETED)}
                className="px-3 py-1 text-xs font-medium bg-green-600 hover:bg-green-700 text-white rounded"
              >
                完了に変更
              </button>
              <button
                onClick={handleBulkDelete}
                className="px-3 py-1 text-xs font-medium bg-red-600 hover:bg-red-700 text-white rounded"
              >
                削除
              </button>
            </div>
          )}
        </div>
      )}

      {/* Task List with Drag and Drop */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="tasks">
          {(provided) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className="space-y-3"
            >
              {sortedTasks.map((task, index) => (
                <Draggable 
                  key={task.id} 
                  draggableId={task.id} 
                  index={index}
                  isDragDisabled={isSelectionMode}
                >
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      className={`${snapshot.isDragging ? 'opacity-75 rotate-1' : ''}`}
                    >
                      <TaskItem
                        task={task}
                        onEdit={onEditTask}
                        onDelete={onDeleteTask}
                        allTasks={tasks}
                        isSelectionMode={isSelectionMode}
                        isSelected={selectedTasks.has(task.id)}
                        onSelectionChange={handleTaskSelection}
                      />
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
};
    