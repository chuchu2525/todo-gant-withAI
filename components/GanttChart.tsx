import React from 'react';
import { Task, TaskPriority } from '../types';
import { PRIORITY_COLORS } from '../constants';

interface GanttChartProps {
  tasks: Task[];
}

const DAY_WIDTH = 30; // pixels per day
const ROW_HEIGHT = 40; // pixels per row
const CHART_PADDING = 20;
const LABEL_WIDTH = 150; // Width for task names

export const GanttChart: React.FC<GanttChartProps> = ({ tasks }) => {
  if (tasks.length === 0) {
    return <p className="text-center text-slate-400 py-8">No tasks to display in Gantt chart.</p>;
  }

  const sortedTasks = [...tasks].sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

  const { minDate, maxDate } = sortedTasks.reduce(
    (acc, task) => {
      const start = new Date(task.startDate);
      const end = new Date(task.endDate);
      if (start < acc.minDate) acc.minDate = start;
      if (end > acc.maxDate) acc.maxDate = end;
      return acc;
    },
    { minDate: new Date(sortedTasks[0].startDate), maxDate: new Date(sortedTasks[0].endDate) }
  );
  
  const totalDays = Math.ceil((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const chartWidth = totalDays * DAY_WIDTH + LABEL_WIDTH;

  const getDaysFromStart = (date: Date): number => {
    return Math.ceil((date.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24));
  };

  const getTaskName = (taskId: string): string => {
    const task = tasks.find(t => t.id === taskId);
    return task ? task.name : 'Unknown Task';
  };

  return (
    <div className="bg-slate-800 p-4 rounded-lg shadow-lg overflow-x-auto">
      <h3 className="text-xl font-semibold text-sky-400 mb-4">Gantt Chart</h3>
      <div style={{ width: chartWidth, minHeight: (tasks.length + 1) * ROW_HEIGHT + CHART_PADDING*2 }} className="relative">
        {/* Date Headers */}
        <div className="sticky top-0 z-10 bg-slate-800" style={{paddingLeft: LABEL_WIDTH}}>
          <div className="flex" style={{ height: ROW_HEIGHT }}>
            {Array.from({ length: totalDays }).map((_, i) => {
              const currentDate = new Date(minDate);
              currentDate.setDate(minDate.getDate() + i);
              return (
                <div
                  key={i}
                  style={{ width: DAY_WIDTH }}
                  className="flex-shrink-0 border-r border-b border-slate-700 text-xs text-slate-400 flex items-center justify-center"
                >
                  {currentDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </div>
              );
            })}
          </div>
        </div>

        {/* Task Rows */}
        <div style={{paddingTop: CHART_PADDING}}>
        {sortedTasks.map((task, index) => {
          const startOffset = getDaysFromStart(new Date(task.startDate)) * DAY_WIDTH;
          const durationDays = Math.max(1, Math.ceil((new Date(task.endDate).getTime() - new Date(task.startDate).getTime()) / (1000 * 60 * 60 * 24)) +1);
          const taskWidth = durationDays * DAY_WIDTH - 2; // -2 for small gap

          return (
            <div key={task.id} className="flex items-center" style={{ height: ROW_HEIGHT, marginBottom: '4px' }}>
              <div style={{ width: LABEL_WIDTH }} className="text-sm text-slate-300 pr-2 truncate" title={task.name}>
                {task.name}
              </div>
              <div className="relative h-full" style={{ width: chartWidth - LABEL_WIDTH }}>
                <div
                  title={`${task.name} (${task.status}) - ${task.startDate} to ${task.endDate}`}
                  style={{
                    left: startOffset,
                    width: taskWidth,
                    height: ROW_HEIGHT * 0.7,
                    top: ROW_HEIGHT * 0.15,
                  }}
                  className={`absolute rounded ${PRIORITY_COLORS[task.priority]} text-white text-xs flex items-center px-2 overflow-hidden shadow-md`}
                >
                 <span className="truncate">{task.name}</span>
                </div>
              </div>
            </div>
          );
        })}
        </div>
         {/* Dependency Lines (Basic visualization, might need more advanced SVG for curves) */}
        <svg className="absolute top-0 left-0 w-full h-full pointer-events-none" style={{paddingTop: ROW_HEIGHT + CHART_PADDING}}>
            {sortedTasks.flatMap((task, taskIndex) => 
                task.dependencies.map(depId => {
                    const dependentTaskIndex = sortedTasks.findIndex(t => t.id === depId);
                    if (dependentTaskIndex === -1) return null;

                    const depTask = sortedTasks[dependentTaskIndex];
                    
                    const depEndX = getDaysFromStart(new Date(depTask.endDate)) * DAY_WIDTH + (DAY_WIDTH / 2) + LABEL_WIDTH;
                    const depEndY = (dependentTaskIndex * (ROW_HEIGHT + 4)) + (ROW_HEIGHT / 2);

                    const taskStartX = getDaysFromStart(new Date(task.startDate)) * DAY_WIDTH + LABEL_WIDTH;
                    const taskStartY = (taskIndex * (ROW_HEIGHT + 4)) + (ROW_HEIGHT / 2);
                    
                    if(taskStartX < depEndX) { // Basic arrow pointing right
                        return (
                            <path
                                key={`${depId}-${task.id}`}
                                d={`M ${depEndX} ${depEndY} L ${depEndX + 10} ${depEndY} L ${depEndX + 10} ${taskStartY} L ${taskStartX} ${taskStartY}`}
                                stroke="#60a5fa" // sky-400
                                strokeWidth="1.5"
                                fill="none"
                                markerEnd="url(#arrowhead)"
                            />
                        );
                    }

                    return (
                        <line
                            key={`${depId}-${task.id}`}
                            x1={depEndX}
                            y1={depEndY}
                            x2={taskStartX}
                            y2={taskStartY}
                            stroke="#60a5fa" // sky-400
                            strokeWidth="1.5"
                            markerEnd="url(#arrowhead)"
                        />
                    );
                }).filter(Boolean)
            )}
            <defs>
                <marker id="arrowhead" markerWidth="6" markerHeight="4" refX="5" refY="2" orient="auto">
                    <polygon points="0 0, 6 2, 0 4" fill="#60a5fa" />
                </marker>
            </defs>
        </svg>
      </div>
    </div>
  );
};
    