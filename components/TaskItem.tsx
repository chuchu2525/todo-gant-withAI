import React from 'react';
import { Task, TaskPriority, TaskStatus } from '../types';
import { PRIORITY_COLORS, STATUS_COLORS, STATUS_TEXT_JP, PRIORITY_TEXT_JP } from '../constants';

interface TaskItemProps {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  allTasks: Task[];
}

const formatDate = (dateString: string): string => {
  const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' };
  return new Date(dateString).toLocaleDateString(undefined, options);
};

export const TaskItem: React.FC<TaskItemProps> = ({ task, onEdit, onDelete, allTasks }) => {
  const getDependencyNames = (dependencyIds: string[]): string => {
    if (!dependencyIds || dependencyIds.length === 0) return 'None';
    return dependencyIds
      .map(id => allTasks.find(t => t.id === id)?.name || 'Unknown Task')
      .join(', ');
  };
  
  return (
    <div className="bg-slate-800 shadow-lg rounded-lg p-5 transition-all hover:shadow-sky-500/30">
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-xl font-semibold text-sky-400">{task.name}</h3>
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
      <div className="grid grid-cols-2 gap-x-4 text-sm mb-3">
        <p className="text-slate-400"><strong className="text-slate-300">開始日:</strong> {formatDate(task.startDate)}</p>
        <p className="text-slate-400"><strong className="text-slate-300">終了日:</strong> {formatDate(task.endDate)}</p>
      </div>
       <div className="text-sm mb-4">
        <p className="text-slate-400"><strong className="text-slate-300">依存先:</strong> {getDependencyNames(task.dependencies)}</p>
      </div>
      <div className="flex justify-end space-x-2">
        <button
          onClick={() => onEdit(task)}
          className="px-3 py-1 text-sm font-medium text-sky-400 bg-sky-900/50 hover:bg-sky-800/70 rounded-md"
        >
          編集
        </button>
        <button
          onClick={() => onDelete(task.id)}
          className="px-3 py-1 text-sm font-medium text-red-400 bg-red-900/50 hover:bg-red-800/70 rounded-md"
        >
          削除
        </button>
      </div>
    </div>
  );
};
    