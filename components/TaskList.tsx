
import React from 'react';
import { Task } from '../types';
import { TaskItem } from './TaskItem';

interface TaskListProps {
  tasks: Task[];
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
}

export const TaskList: React.FC<TaskListProps> = ({ tasks, onEditTask, onDeleteTask }) => {
  if (tasks.length === 0) {
    return <p className="text-center text-slate-400 py-8">No tasks yet. Add one to get started!</p>;
  }

  // Sort tasks: In Progress > Not Started > Completed, then by End Date (earlier first)
  const sortedTasks = [...tasks].sort((a, b) => {
    const statusOrder = { "In Progress": 1, "Not Started": 2, "Completed": 3 };
    if (statusOrder[a.status] !== statusOrder[b.status]) {
      return statusOrder[a.status] - statusOrder[b.status];
    }
    return new Date(a.endDate).getTime() - new Date(b.endDate).getTime();
  });


  return (
    <div className="space-y-4">
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
    