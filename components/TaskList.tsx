import React, { useState } from 'react';
import { Task } from '../types';
import { TaskItem } from './TaskItem';
import { exportMultipleTasksToGoogleCalendar } from '../services/calendarService';

interface TaskListProps {
  tasks: Task[];
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
}

type SortKey = 'startDate' | 'endDate' | 'priority' | 'status';
type SortOrder = 'asc' | 'desc';

const SORT_LABELS: { [key in SortKey]: string } = {
  startDate: '開始日',
  endDate: '終了日',
  priority: '優先度',
  status: 'ステータス',
};

export const TaskList: React.FC<TaskListProps> = ({ tasks, onEditTask, onDeleteTask }) => {
  const [sortKey, setSortKey] = useState<SortKey>('startDate');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

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

  const sortedTasks = [...tasks].sort((a, b) => {
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

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between items-center gap-2 mb-4">
        <div className="flex flex-wrap gap-2">
          {(['startDate', 'endDate', 'priority', 'status'] as SortKey[]).map(key => {
            const isActive = sortKey === key;
            let activeClass = '';
            if (isActive) {
              activeClass = sortOrder === 'asc'
                ? 'bg-sky-600 text-white border-sky-600' // 昇順は青
                : 'bg-pink-600 text-white border-pink-600'; // 降順は赤
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
      {sortedTasks.map(task => (
        <TaskItem
          key={task.id}
          task={task}
          onEdit={onEditTask}
          onDelete={onDeleteTask}
          allTasks={tasks}
        />
      ))}
    </div>
  );
};
    