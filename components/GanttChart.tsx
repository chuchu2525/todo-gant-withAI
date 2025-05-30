import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Task, TaskPriority } from '../types';
import { PRIORITY_COLORS } from '../constants';

interface GanttChartProps {
  tasks: Task[];
  onEditTask: (task: Task) => void;
}

const DAY_WIDTH = 30; // pixels per day
const ROW_HEIGHT = 40; // pixels per row
const CHART_PADDING = 20;
const MIN_LABEL_WIDTH = 80; // ラベルの最小幅
const MAX_LABEL_WIDTH = 400; // ラベルの最大幅

interface TooltipData {
  task: Task;
  x: number;
  y: number;
}

export const GanttChart: React.FC<GanttChartProps> = ({ tasks, onEditTask }) => {
  const [labelWidth, setLabelWidth] = useState(150); // 初期値を150に設定
  const [isResizing, setIsResizing] = useState(false);
  const [tooltipData, setTooltipData] = useState<TooltipData | null>(null); // ツールチップ用state
  const resizeHandleRef = useRef<HTMLDivElement>(null);
  const chartContainerRef = useRef<HTMLDivElement>(null); // チャート全体のコンテナ参照用

  // ドラッグ開始
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  // ドラッグ中の処理 (useEffect内でイベントリスナーを登録・解除)
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizing && chartContainerRef.current) {
        const chartLeft = chartContainerRef.current.getBoundingClientRect().left;
        let newWidth = e.clientX - chartLeft;
        newWidth = Math.max(MIN_LABEL_WIDTH, Math.min(newWidth, MAX_LABEL_WIDTH));
        setLabelWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

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
  const chartWidth = totalDays * DAY_WIDTH + labelWidth;

  const getDaysFromStart = (date: Date): number => {
    return Math.ceil((date.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24));
  };

  const getTaskName = (taskId: string): string => {
    const task = tasks.find(t => t.id === taskId);
    return task ? task.name : 'Unknown Task';
  };

  return (
    <div className="bg-slate-800 p-4 rounded-lg shadow-lg overflow-x-auto relative" ref={chartContainerRef}>
      <h3 className="text-xl font-semibold text-sky-400 mb-4">Gantt Chart</h3>
      <div style={{ width: chartWidth, minHeight: (tasks.length + 2) * ROW_HEIGHT + CHART_PADDING*2 }} className="relative">
        {/* Date Headers and Resizer */}
        <div className="sticky top-0 z-10 bg-slate-800 flex" style={{ height: ROW_HEIGHT }}>
          <div style={{ width: labelWidth, flexShrink: 0 }} className="border-r border-b border-slate-700">
            {/* Empty cell for alignment or label header */}
          </div>
          {/* Resizer Handle */}
          <div 
            ref={resizeHandleRef} 
            onMouseDown={handleMouseDown}
            style={{ width: '8px', cursor: 'ew-resize', backgroundColor: isResizing ? '#0ea5e9' : '#334155'}} 
            className="h-full flex-shrink-0 border-b border-slate-700 hover:bg-sky-600 transition-colors"
            title="Drag to resize task name column"
          >
            &nbsp; {/* For visibility and click area */}
          </div>
          <div className="flex" style={{paddingLeft: 0 /* LABEL_WIDTH を削除 */}}>
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
              <div style={{ width: labelWidth, flexShrink: 0 }} className="text-sm text-slate-300 pr-2 truncate border-r border-slate-700" title={task.name}>
                {task.name}
              </div>
              {/* Resize Handle Placeholder - to align rows correctly with header resizer */}
              <div style={{ width: '8px', flexShrink: 0 }} className="border-r border-slate-700 h-full"></div>
              <div className="relative h-full" style={{ width: chartWidth - labelWidth -8 /* Resizer分引く*/ }}>
                <div
                  style={{
                    left: startOffset,
                    width: taskWidth,
                    height: ROW_HEIGHT * 0.7,
                    top: ROW_HEIGHT * 0.15,
                    cursor: 'pointer',
                  }}
                  className={`absolute rounded ${PRIORITY_COLORS[task.priority]} text-white text-xs flex items-center px-2 overflow-hidden shadow-md hover:brightness-125 transition-all`}
                  onClick={() => onEditTask(task)}
                  onMouseEnter={(e) => {
                    setTooltipData({ 
                      task,
                      x: e.clientX + 15, 
                      y: e.clientY - 10 // マウスカーソルの少し上
                    });
                  }}
                  onMouseMove={(e) => {
                    if (tooltipData) {
                      setTooltipData({ 
                        ...tooltipData, 
                        x: e.clientX + 15,
                        y: e.clientY - 10 // マウスカーソルの少し上
                      });
                    }
                  }}
                  onMouseLeave={() => {
                    setTooltipData(null);
                  }}
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
                    
                    const depEndX = getDaysFromStart(new Date(depTask.endDate)) * DAY_WIDTH + (DAY_WIDTH / 2) + labelWidth + 8; // labelWidthとリサイザ幅考慮
                    const depEndY = (dependentTaskIndex * (ROW_HEIGHT + 4)) + (ROW_HEIGHT / 2);

                    const taskStartX = getDaysFromStart(new Date(task.startDate)) * DAY_WIDTH + labelWidth + 8; // labelWidthとリサイザ幅考慮
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
      {/* Custom Tooltip */} 
      {tooltipData && (
        <div 
          style={{
            position: 'fixed', // fixed に変更してビューポート基準で位置決め
            left: `${tooltipData.x}px`,
            top: `${tooltipData.y}px`,
            transform: 'translateY(-100%)', // Y座標をツールチップの高さ分だけ上にオフセット
            backgroundColor: 'rgba(0,0,0,0.85)',
            color: 'white',
            padding: '8px 12px',
            borderRadius: '6px',
            fontSize: '1rem', // 少し大きく
            zIndex: 100, // 他の要素より手前に表示
            pointerEvents: 'none', // ツールチップ自体がマウスイベントを拾わないように
            whiteSpace: 'nowrap',
            boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
          }}
        >
          {tooltipData.task.name}
        </div>
      )}
    </div>
  );
};
    