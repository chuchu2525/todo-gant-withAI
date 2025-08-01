import React, { useState, useRef, useEffect } from 'react';
import { Task, TaskStatus, TaskPriority } from '../types';
import { PRIORITY_COLORS, STATUS_COLORS, STATUS_TEXT_JP, PRIORITY_TEXT_JP } from '../constants';
import { exportTaskToGoogleCalendar } from '../services/calendarService';
import { 
  StatusNotStartedIcon, 
  StatusInProgressIcon, 
  StatusCompletedIcon,
  EditIcon,
  DeleteIcon,
  CalendarIcon,
  CheckIcon,
  CloseIcon,
  iconSizes
} from './icons';

interface TaskItemProps {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  onUpdateTask?: (updatedTask: Task) => void;
  allTasks: Task[];
  isSelectionMode?: boolean;
  isSelected?: boolean;
  onSelectionChange?: (taskId: string, isSelected: boolean) => void;
  taskSize?: 'compact' | 'normal' | 'expanded';
  onTaskSizeChange?: (size: 'compact' | 'normal' | 'expanded') => void;
}

const formatDate = (dateString: string): string => {
  const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' };
  return new Date(dateString).toLocaleDateString(undefined, options);
};

export const TaskItem: React.FC<TaskItemProps> = ({ task, onEdit, onDelete, onUpdateTask, allTasks, isSelectionMode, isSelected, onSelectionChange, taskSize = 'normal', onTaskSizeChange }) => {
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null);
  const selectRef = useRef<HTMLSelectElement>(null);
  const getDependencyNames = (dependencyIds: string[]): string => {
    if (!dependencyIds || dependencyIds.length === 0) return 'None';
    return dependencyIds
      .map(id => allTasks.find(t => t.id === id)?.name || 'Unknown Task')
      .join(', ');
  };

  const handleExportToCalendar = () => {
    exportTaskToGoogleCalendar(task);
  };

  const handleSelectionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (onSelectionChange) {
      onSelectionChange(task.id, e.target.checked);
    }
  };

  const startInlineEdit = (field: string, currentValue: string) => {
    setEditingField(field);
    setEditValue(currentValue);
  };

  const cancelInlineEdit = () => {
    setEditingField(null);
    setEditValue('');
  };

  const saveInlineEdit = () => {
    if (!onUpdateTask || !editingField || editValue.trim() === '') {
      cancelInlineEdit();
      return;
    }

    const updatedTask = { ...task };
    
    switch (editingField) {
      case 'name':
        updatedTask.name = editValue.trim();
        break;
      case 'startDate':
        if (isValidDate(editValue)) {
          updatedTask.startDate = editValue;
        } else {
          cancelInlineEdit();
          return;
        }
        break;
      case 'endDate':
        if (isValidDate(editValue)) {
          updatedTask.endDate = editValue;
        } else {
          cancelInlineEdit();
          return;
        }
        break;
      case 'priority':
        updatedTask.priority = editValue as TaskPriority;
        break;
      case 'status':
        updatedTask.status = editValue as TaskStatus;
        break;
    }
    
    onUpdateTask(updatedTask);
    cancelInlineEdit();
  };

  const isValidDate = (dateString: string): boolean => {
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(dateString)) return false;
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date.getTime());
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      saveInlineEdit();
    } else if (e.key === 'Escape') {
      cancelInlineEdit();
    }
  };

  // Focus input when editing starts
  useEffect(() => {
    if (editingField && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
    if (editingField && selectRef.current) {
      selectRef.current.focus();
    }
  }, [editingField]);
  
  const getSizeClasses = () => {
    switch (taskSize) {
      case 'compact':
        return 'p-2 sm:p-3';
      case 'expanded':
        return 'p-6 sm:p-7';
      default:
        return 'p-4 sm:p-5';
    }
  };

  const getTextSizes = () => {
    switch (taskSize) {
      case 'compact':
        return {
          title: 'text-lg',
          description: 'text-xs',
          details: 'text-xs',
          button: 'text-xs px-2 py-1'
        };
      case 'expanded':
        return {
          title: 'text-2xl',
          description: 'text-base',
          details: 'text-base',
          button: 'text-sm px-4 py-2'
        };
      default:
        return {
          title: 'text-xl',
          description: 'text-sm',
          details: 'text-sm',
          button: 'text-sm px-3 py-1.5'
        };
    }
  };

  const textSizes = getTextSizes();

  return (
    <div className={`bg-slate-800/90 backdrop-blur-sm shadow-lg rounded-lg ${getSizeClasses()} transition-all hover:shadow-xl hover:shadow-sky-500/20 border border-slate-700/50 ${isSelectionMode && isSelected ? 'ring-2 ring-purple-500 shadow-purple-500/20' : ''} relative group`}>
      {/* Size Control */}
      {onTaskSizeChange && (
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
          <div className="bg-slate-700/90 rounded-md border border-slate-600 flex">
            <button
              onClick={() => onTaskSizeChange('compact')}
              className={`px-2 py-1 text-xs font-medium transition-colors ${
                taskSize === 'compact' 
                  ? 'bg-sky-600 text-white' 
                  : 'text-slate-300 hover:text-white hover:bg-slate-600'
              } rounded-l-md`}
              title="コンパクト表示"
            >
              S
            </button>
            <button
              onClick={() => onTaskSizeChange('normal')}
              className={`px-2 py-1 text-xs font-medium transition-colors ${
                taskSize === 'normal' 
                  ? 'bg-sky-600 text-white' 
                  : 'text-slate-300 hover:text-white hover:bg-slate-600'
              }`}
              title="通常表示"
            >
              M
            </button>
            <button
              onClick={() => onTaskSizeChange('expanded')}
              className={`px-2 py-1 text-xs font-medium transition-colors ${
                taskSize === 'expanded' 
                  ? 'bg-sky-600 text-white' 
                  : 'text-slate-300 hover:text-white hover:bg-slate-600'
              } rounded-r-md`}
              title="拡大表示"
            >
              L
            </button>
          </div>
        </div>
      )}
      
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-3">
          {isSelectionMode && (
            <input
              type="checkbox"
              checked={isSelected || false}
              onChange={handleSelectionChange}
              className="form-checkbox h-4 w-4 text-purple-600 bg-slate-800 border-slate-600 rounded"
            />
          )}
          {editingField === 'name' ? (
            <div className="flex items-center gap-2 min-w-0 w-full">
              <input
                ref={inputRef}
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={handleKeyDown}
                className={`${textSizes.title} font-semibold text-sky-400 bg-slate-700 border border-slate-600 rounded px-2 py-1 flex-1 min-w-0`}
              />
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={saveInlineEdit}
                  className="text-green-400 hover:text-green-300 p-2 min-h-[44px] min-w-[44px] flex items-center justify-center"
                  aria-label="保存"
                >
                  <CheckIcon className="w-4 h-4" />
                </button>
                <button
                  onClick={cancelInlineEdit}
                  className="text-red-400 hover:text-red-300 p-2 min-h-[44px] min-w-[44px] flex items-center justify-center"
                  aria-label="キャンセル"
                >
                  <CloseIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <h3 
              className={`${textSizes.title} font-semibold text-sky-400 cursor-pointer hover:text-sky-300 transition-colors`}
              onClick={() => startInlineEdit('name', task.name)}
              title="クリックして編集"
            >
              {task.name}
            </h3>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {editingField === 'priority' ? (
            <div className="flex items-center gap-1 flex-shrink-0 relative z-10">
              <select
                ref={selectRef}
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={handleKeyDown}
                className="px-2 py-1 text-xs font-semibold text-white bg-slate-700 border border-slate-600 rounded min-w-0"
              >
                <option value={TaskPriority.HIGH}>高</option>
                <option value={TaskPriority.MEDIUM}>中</option>
                <option value={TaskPriority.LOW}>低</option>
              </select>
              <button
                onClick={saveInlineEdit}
                className="text-green-400 hover:text-green-300 p-1 min-h-[32px] min-w-[32px] flex items-center justify-center"
                aria-label="保存"
              >
                <CheckIcon className="w-3 h-3" />
              </button>
              <button
                onClick={cancelInlineEdit}
                className="text-red-400 hover:text-red-300 p-1 min-h-[32px] min-w-[32px] flex items-center justify-center"
                aria-label="キャンセル"
              >
                <CloseIcon className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <span 
              className={`px-2 py-1 text-xs font-semibold text-white rounded-full cursor-pointer hover:opacity-80 transition-opacity ${PRIORITY_COLORS[task.priority]}`}
              onClick={() => startInlineEdit('priority', task.priority)}
              title="クリックして編集"
            >
              {PRIORITY_TEXT_JP[task.priority]}
            </span>
          )}
          
          {editingField === 'status' ? (
            <div className="flex items-center gap-1 flex-shrink-0 relative z-10">
              <select
                ref={selectRef}
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={handleKeyDown}
                className="px-2 py-1 text-xs font-semibold text-white bg-slate-700 border border-slate-600 rounded min-w-0"
              >
                <option value={TaskStatus.NOT_STARTED}>未開始</option>
                <option value={TaskStatus.IN_PROGRESS}>進行中</option>
                <option value={TaskStatus.COMPLETED}>完了</option>
              </select>
              <button
                onClick={saveInlineEdit}
                className="text-green-400 hover:text-green-300 p-1 min-h-[32px] min-w-[32px] flex items-center justify-center"
                aria-label="保存"
              >
                <CheckIcon className="w-3 h-3" />
              </button>
              <button
                onClick={cancelInlineEdit}
                className="text-red-400 hover:text-red-300 p-1 min-h-[32px] min-w-[32px] flex items-center justify-center"
                aria-label="キャンセル"
              >
                <CloseIcon className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <span 
              className={`px-2 py-1 text-xs font-semibold text-white rounded-full cursor-pointer hover:opacity-80 transition-opacity ${STATUS_COLORS[task.status]}`}
              onClick={() => startInlineEdit('status', task.status)}
              title="クリックして編集"
            >
              {STATUS_TEXT_JP[task.status]}
            </span>
          )}
        </div>
      </div>
      {task.description && (
        <p 
          className={`text-slate-400 ${textSizes.description} mb-3 cursor-pointer hover:text-slate-200 transition-colors`}
          onClick={() => onEdit(task)}
          title="クリックして編集"
        >
          {task.description}
        </p>
      )}
      <div className={`grid grid-cols-1 gap-y-2 ${textSizes.details} mb-3`}>
        <div className="flex flex-col sm:flex-row sm:gap-x-4 gap-y-1">
          <div className="text-slate-400 sm:flex-1">
            <strong className="text-slate-300">開始日:</strong> 
            {editingField === 'startDate' ? (
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 ml-2 mt-1">
                <input
                  ref={inputRef}
                  type="date"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="text-slate-300 bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs w-full sm:w-auto"
                />
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={saveInlineEdit}
                    className="text-green-400 hover:text-green-300 p-1 min-h-[32px] min-w-[32px] flex items-center justify-center"
                    aria-label="保存"
                  >
                    <CheckIcon className="w-3 h-3" />
                  </button>
                  <button
                    onClick={cancelInlineEdit}
                    className="text-red-400 hover:text-red-300 p-1 min-h-[32px] min-w-[32px] flex items-center justify-center"
                    aria-label="キャンセル"
                  >
                    <CloseIcon className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ) : (
              <span 
                className="cursor-pointer hover:text-slate-200 transition-colors ml-2"
                onClick={() => startInlineEdit('startDate', task.startDate)}
                title="クリックして編集"
              >
                {formatDate(task.startDate)}
              </span>
            )}
          </div>
          <div className="text-slate-400 sm:flex-1">
            <strong className="text-slate-300">終了日:</strong> 
            {editingField === 'endDate' ? (
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 ml-2 mt-1">
                <input
                  ref={inputRef}
                  type="date"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="text-slate-300 bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs w-full sm:w-auto"
                />
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={saveInlineEdit}
                    className="text-green-400 hover:text-green-300 p-1 min-h-[32px] min-w-[32px] flex items-center justify-center"
                    aria-label="保存"
                  >
                    <CheckIcon className="w-3 h-3" />
                  </button>
                  <button
                    onClick={cancelInlineEdit}
                    className="text-red-400 hover:text-red-300 p-1 min-h-[32px] min-w-[32px] flex items-center justify-center"
                    aria-label="キャンセル"
                  >
                    <CloseIcon className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ) : (
              <span 
                className="cursor-pointer hover:text-slate-200 transition-colors ml-2"
                onClick={() => startInlineEdit('endDate', task.endDate)}
                title="クリックして編集"
              >
                {formatDate(task.endDate)}
              </span>
            )}
          </div>
        </div>
      </div>
       <div className={`${textSizes.details} mb-4`}>
        <p className="text-slate-400">
          <strong className="text-slate-300">依存先:</strong> 
          <span 
            className="cursor-pointer hover:text-slate-200 transition-colors ml-2"
            onClick={() => onEdit(task)}
            title="クリックして編集"
          >
            {getDependencyNames(task.dependencies)}
          </span>
        </p>
      </div>
      <div className="flex flex-col sm:flex-row justify-end gap-2 sm:space-x-2 sm:gap-0">
        <button
          onClick={handleExportToCalendar}
          className={`flex items-center justify-center gap-1.5 ${textSizes.button} font-medium text-green-400 bg-green-900/50 hover:bg-green-800/70 rounded-md transition-all border border-green-700/50 hover:border-green-600 hover:shadow-md ${taskSize === 'compact' ? 'min-h-[32px]' : 'min-h-[36px]'}`}
          title="Google Calendarにエクスポート"
        >
          <CalendarIcon className={iconSizes.sm} />
          <span className="hidden sm:inline">カレンダー</span>
        </button>
        <button
          onClick={() => onEdit(task)}
          className={`flex items-center justify-center gap-1.5 ${textSizes.button} font-medium text-sky-400 bg-sky-900/50 hover:bg-sky-800/70 rounded-md transition-all border border-sky-700/50 hover:border-sky-600 hover:shadow-md ${taskSize === 'compact' ? 'min-h-[32px]' : 'min-h-[36px]'}`}
        >
          <EditIcon className={iconSizes.sm} />
          <span className="hidden sm:inline">編集</span>
        </button>
        <button
          onClick={() => onDelete(task.id)}
          className={`flex items-center justify-center gap-1.5 ${textSizes.button} font-medium text-red-400 bg-red-900/50 hover:bg-red-800/70 rounded-md transition-all border border-red-700/50 hover:border-red-600 hover:shadow-md ${taskSize === 'compact' ? 'min-h-[32px]' : 'min-h-[36px]'}`}
        >
          <DeleteIcon className={iconSizes.sm} />
          <span className="hidden sm:inline">削除</span>
        </button>
      </div>
    </div>
  );
};
    