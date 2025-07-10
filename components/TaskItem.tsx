import React from 'react';
import { Task } from '../types';
import { PRIORITY_COLORS, STATUS_COLORS, STATUS_TEXT_JP, PRIORITY_TEXT_JP } from '../constants';
import { exportTaskToGoogleCalendar } from '../services/calendarService';
import { 
  StatusNotStartedIcon, 
  StatusInProgressIcon, 
  StatusCompletedIcon,
  EditIcon,
  DeleteIcon,
  CalendarIcon,
  iconSizes
} from './icons';

interface TaskItemProps {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  allTasks: Task[];
  isSelectionMode?: boolean;
  isSelected?: boolean;
  onSelectionChange?: (taskId: string, isSelected: boolean) => void;
}

const formatDate = (dateString: string): string => {
  const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' };
  return new Date(dateString).toLocaleDateString(undefined, options);
};

export const TaskItem: React.FC<TaskItemProps> = ({ task, onEdit, onDelete, allTasks, isSelectionMode, isSelected, onSelectionChange }) => {
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
  
  return (
    <div className={`bg-slate-800/90 backdrop-blur-sm shadow-lg rounded-lg p-4 sm:p-5 transition-all hover:shadow-xl hover:shadow-sky-500/20 border border-slate-700/50 ${isSelectionMode && isSelected ? 'ring-2 ring-purple-500 shadow-purple-500/20' : ''}`}>
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
          <h3 className="text-xl font-semibold text-sky-400">{task.name}</h3>
        </div>
        <div className="flex space-x-2">
           <span className={`px-2 py-1 text-xs font-semibold text-white rounded-full ${PRIORITY_COLORS[task.priority]}`}>
            {PRIORITY_TEXT_JP[task.priority]}
          </span>
          <span className={`px-2 py-1 text-xs font-semibold text-white rounded-full ${STATUS_COLORS[task.status]}`}>
            {STATUS_TEXT_JP[task.status]}
          </span>
        </div>
      </div>
      {task.description && <p className="text-slate-400 text-sm mb-3">{task.description}</p>}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-sm mb-3">
        <p className="text-slate-400"><strong className="text-slate-300">開始日:</strong> {formatDate(task.startDate)}</p>
        <p className="text-slate-400"><strong className="text-slate-300">終了日:</strong> {formatDate(task.endDate)}</p>
      </div>
       <div className="text-sm mb-4">
        <p className="text-slate-400"><strong className="text-slate-300">依存先:</strong> {getDependencyNames(task.dependencies)}</p>
      </div>
      <div className="flex flex-col sm:flex-row justify-end gap-2 sm:space-x-2 sm:gap-0">
        <button
          onClick={handleExportToCalendar}
          className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-sm font-medium text-green-400 bg-green-900/50 hover:bg-green-800/70 rounded-md transition-all border border-green-700/50 hover:border-green-600 hover:shadow-md min-h-[36px]"
          title="Google Calendarにエクスポート"
        >
          <CalendarIcon className={iconSizes.sm} />
          <span className="hidden sm:inline">カレンダー</span>
        </button>
        <button
          onClick={() => onEdit(task)}
          className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-sm font-medium text-sky-400 bg-sky-900/50 hover:bg-sky-800/70 rounded-md transition-all border border-sky-700/50 hover:border-sky-600 hover:shadow-md min-h-[36px]"
        >
          <EditIcon className={iconSizes.sm} />
          <span className="hidden sm:inline">編集</span>
        </button>
        <button
          onClick={() => onDelete(task.id)}
          className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-400 bg-red-900/50 hover:bg-red-800/70 rounded-md transition-all border border-red-700/50 hover:border-red-600 hover:shadow-md min-h-[36px]"
        >
          <DeleteIcon className={iconSizes.sm} />
          <span className="hidden sm:inline">削除</span>
        </button>
      </div>
    </div>
  );
};
    