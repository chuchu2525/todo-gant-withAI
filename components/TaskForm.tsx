import React, { useState, useEffect } from 'react';
import { Task, TaskStatus, TaskPriority } from '../types';
import { DEFAULT_TASK_STATUS, DEFAULT_TASK_PRIORITY } from '../constants';

interface TaskFormProps {
  onSubmit: (task: Task) => void;
  onCancel: () => void;
  existingTask?: Task | null;
  allTasks: Task[]; // For dependency selection
}

const getDefaultDate = (): string => new Date().toISOString().split('T')[0];

export const TaskForm: React.FC<TaskFormProps> = ({ onSubmit, onCancel, existingTask, allTasks }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TaskStatus>(DEFAULT_TASK_STATUS);
  const [priority, setPriority] = useState<TaskPriority>(DEFAULT_TASK_PRIORITY);
  const [startDate, setStartDate] = useState(getDefaultDate());
  const [endDate, setEndDate] = useState(getDefaultDate());
  const [dependencies, setDependencies] = useState<string[]>([]);
  const [dependencySearchTerm, setDependencySearchTerm] = useState('');

  useEffect(() => {
    if (existingTask) {
      setName(existingTask.name);
      setDescription(existingTask.description || '');
      setStatus(existingTask.status);
      setPriority(existingTask.priority);
      setStartDate(existingTask.startDate);
      setEndDate(existingTask.endDate);
      setDependencies(existingTask.dependencies || []);
    } else {
      // Reset for new task
      setName('');
      setDescription('');
      setStatus(DEFAULT_TASK_STATUS);
      setPriority(DEFAULT_TASK_PRIORITY);
      setStartDate(getDefaultDate());
      setEndDate(getDefaultDate());
      setDependencies([]);
    }
  }, [existingTask]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert("タスク名は空にできません。");
      return;
    }
    if (new Date(startDate) > new Date(endDate)) {
      alert("開始日は終了日より後に設定できません。");
      return;
    }
    
    const taskData: Task = {
      id: existingTask ? existingTask.id : `task-${crypto.randomUUID()}`,
      name,
      description,
      status,
      priority,
      startDate,
      endDate,
      dependencies,
    };
    onSubmit(taskData);
  };

  const handleDependencyToggle = (taskId: string) => {
    setDependencies(prev => 
      prev.includes(taskId) 
        ? prev.filter(id => id !== taskId) 
        : [...prev, taskId]
    );
  };

  const availableDependencies = allTasks.filter(t => 
    existingTask ? t.id !== existingTask.id : true
  );
  
  const filteredAvailableDependencies = availableDependencies.filter(task => 
    task.name.toLowerCase().includes(dependencySearchTerm.toLowerCase())
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-slate-300">
      <div>
        <label htmlFor="task-name" className="block text-sm font-medium text-slate-300">タスク名</label>
        <input
          type="text"
          id="task-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 block w-full bg-slate-700 border-slate-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm text-slate-100"
          required
        />
      </div>
      <div>
        <label htmlFor="task-description" className="block text-sm font-medium text-slate-300">説明（任意）</label>
        <textarea
          id="task-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="mt-1 block w-full bg-slate-700 border-slate-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm text-slate-100"
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="task-status" className="block text-sm font-medium text-slate-300">ステータス</label>
          <select
            id="task-status"
            value={status}
            onChange={(e) => setStatus(e.target.value as TaskStatus)}
            className="mt-1 block w-full bg-slate-700 border-slate-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm text-slate-100"
          >
            {Object.values(TaskStatus).map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="task-priority" className="block text-sm font-medium text-slate-300">優先度</label>
          <select
            id="task-priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value as TaskPriority)}
            className="mt-1 block w-full bg-slate-700 border-slate-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm text-slate-100"
          >
            {Object.values(TaskPriority).map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="task-start-date" className="block text-sm font-medium text-slate-300">開始日</label>
          <input
            type="date"
            id="task-start-date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="mt-1 block w-full bg-slate-700 border-slate-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm text-slate-100"
            required
          />
        </div>
        <div>
          <label htmlFor="task-end-date" className="block text-sm font-medium text-slate-300">終了日</label>
          <input
            type="date"
            id="task-end-date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="mt-1 block w-full bg-slate-700 border-slate-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm text-slate-100"
            required
          />
        </div>
      </div>
      <div>
        <label htmlFor="task-dependencies" className="block text-sm font-medium text-slate-300">依存関係</label>
        <input 
          type="text"
          placeholder="依存関係を検索..."
          value={dependencySearchTerm}
          onChange={(e) => setDependencySearchTerm(e.target.value)}
          className="mt-1 mb-2 block w-full bg-slate-600 border-slate-500 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm text-slate-100"
        />
        <div 
          id="task-dependencies"
          className="mt-1 block w-full h-40 bg-slate-700 border-slate-600 rounded-md shadow-sm p-2 overflow-y-auto space-y-1"
        >
          {filteredAvailableDependencies.length > 0 ? (
            filteredAvailableDependencies.map(task => (
            <label key={task.id} className="flex items-center space-x-2 p-1.5 rounded hover:bg-slate-600 cursor-pointer">
              <input 
                type="checkbox"
                checked={dependencies.includes(task.id)}
                onChange={() => handleDependencyToggle(task.id)}
                className="form-checkbox h-4 w-4 text-sky-600 bg-slate-800 border-slate-500 rounded focus:ring-sky-500"
              />
              <span>{task.name}</span>
            </label>
          ))
        ) : (
          <p className="text-xs text-slate-400 text-center py-4">一致するタスクが見つからないか、他のタスクがありません。</p>
        )}
        </div>
        <p className="mt-1 text-xs text-slate-400">自分自身は選択できません。検索してタスクを絞り込みます。</p>
      </div>
      <div className="flex justify-end space-x-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-slate-300 bg-slate-600 hover:bg-slate-500 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-sky-500"
        >
          キャンセル
        </button>
        <button
          type="submit"
          className="px-4 py-2 text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-sky-500"
        >
          {existingTask ? '変更を保存' : 'タスクを追加'}
        </button>
      </div>
    </form>
  );
};
    