import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { Task } from '../types';
import { PRIORITY_COLORS, STATUS_TEXT_JP, PRIORITY_TEXT_JP } from '../constants';
import { 
  StatusNotStartedIcon, 
  StatusInProgressIcon, 
  StatusCompletedIcon,
  ZoomInIcon,
  ZoomOutIcon,
  ResetIcon,
  iconSizes
} from './icons';

interface GanttChartProps {
  tasks: Task[];
  onEditTask: (task: Task) => void;
  onTaskDateChange?: (taskId: string, newStartDate: string, newEndDate: string) => void;
  onMultipleTaskDateChange?: (taskUpdates: Array<{taskId: string, newStartDate: string, newEndDate: string}>) => void;
}

// const DAY_WIDTH = 30; // pixels per day // This seems unused, unitWidth is used instead
// const ROW_HEIGHT = 40; // pixels per row // Will be replaced by state
const CHART_PADDING = 20;
const MIN_LABEL_WIDTH = 80; // ラベルの最小幅
const MAX_LABEL_WIDTH = 400; // ラベルの最大幅

type GanttViewMode = 'day' | 'week' | 'month'; // ビューモードの型定義

interface TooltipData {
  task: Task;
  x: number;
  y: number;
}

export const GanttChart: React.FC<GanttChartProps> = ({ tasks, onEditTask, onTaskDateChange, onMultipleTaskDateChange }) => {
  const [labelWidth, setLabelWidth] = useState(150); // 初期値を150に設定
  const [isResizing, setIsResizing] = useState(false);
  const [tooltipData, setTooltipData] = useState<TooltipData | null>(null); // ツールチップ用state
  const [viewMode, setViewMode] = useState<GanttViewMode>('day'); // ビューモードstate
  const [rowHeight, setRowHeight] = useState(40); // 行の高さをstate管理する
  const [zoomLevel, setZoomLevel] = useState(1); // ズームレベル
  const [draggingTask, setDraggingTask] = useState<string | null>(null); // ドラッグ中のタスクID
  const [dragStartX, setDragStartX] = useState(0); // ドラッグ開始位置
  const [originalTaskData, setOriginalTaskData] = useState<{startDate: string, endDate: string} | null>(null);
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set()); // 複数選択されたタスクID
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false); // 複数選択モード
  const [originalMultiTaskData, setOriginalMultiTaskData] = useState<Map<string, {startDate: string, endDate: string}>>(new Map());
  const [hasDragged, setHasDragged] = useState(false); // 実際にドラッグが発生したか
  const [dragStartPosition, setDragStartPosition] = useState({ x: 0, y: 0 }); // ドラッグ開始位置
  const [preventClick, setPreventClick] = useState(false); // クリック抑制フラグ
  const resizeHandleRef = useRef<HTMLDivElement>(null);
  const chartContainerRef = useRef<HTMLDivElement>(null); // チャート全体のコンテナ参照用
  
  // ドラッグ判定の閾値（ピクセル）
  const DRAG_THRESHOLD = 5;

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

  // ビューモードに応じた設定（ズームレベルを適用）
  const getChartSettings = () => {
    let baseUnitWidth;
    let timeUnit;
    
    switch (viewMode) {
      case 'week':
        baseUnitWidth = 70;
        timeUnit = 'week';
        break;
      case 'month':
        baseUnitWidth = 180;
        timeUnit = 'month';
        break;
      case 'day':
      default:
        baseUnitWidth = 75;
        timeUnit = 'day';
        break;
    }
    
    return { 
      unitWidth: Math.round(baseUnitWidth * zoomLevel), 
      timeUnit 
    };
  };
  const { unitWidth, timeUnit } = getChartSettings();

  // ズーム制御関数
  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev * 1.2, 3)); // 最大3倍まで
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev / 1.2, 0.3)); // 最小0.3倍まで
  };

  const resetZoom = () => {
    setZoomLevel(1);
  };

  // 複数選択モードの切り替え
  const toggleMultiSelectMode = () => {
    setIsMultiSelectMode(!isMultiSelectMode);
    if (isMultiSelectMode) {
      setSelectedTaskIds(new Set());
    }
  };

  // タスクの選択/選択解除
  const handleTaskSelection = (taskId: string, event: React.MouseEvent) => {
    if (!isMultiSelectMode) return;
    
    event.preventDefault();
    event.stopPropagation();
    
    const newSelectedIds = new Set(selectedTaskIds);
    
    if (event.ctrlKey || event.metaKey) {
      // Ctrl/Cmd + クリックで追加/削除
      if (newSelectedIds.has(taskId)) {
        newSelectedIds.delete(taskId);
      } else {
        newSelectedIds.add(taskId);
      }
    } else {
      // 通常クリックで単一選択
      newSelectedIds.clear();
      newSelectedIds.add(taskId);
    }
    
    setSelectedTaskIds(newSelectedIds);
  };

  // 全選択/全解除
  const handleSelectAll = () => {
    if (selectedTaskIds.size === sortedTasks.length) {
      setSelectedTaskIds(new Set());
    } else {
      setSelectedTaskIds(new Set(sortedTasks.map(task => task.id)));
    }
  };

  // タスクバーのドラッグ開始
  const handleTaskMouseDown = useCallback((e: React.MouseEvent, task: Task) => {
    if (!onTaskDateChange) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    // ドラッグ開始位置を記録
    setDragStartPosition({ x: e.clientX, y: e.clientY });
    setDragStartX(e.clientX);
    setHasDragged(false);
    setPreventClick(false);
    
    // 複数選択されている場合のドラッグ準備
    if (selectedTaskIds.size > 1 && selectedTaskIds.has(task.id)) {
      setDraggingTask(task.id);
      
      // 複数タスクの元データを保存
      const multiTaskData = new Map<string, {startDate: string, endDate: string}>();
      selectedTaskIds.forEach(taskId => {
        const targetTask = tasks.find(t => t.id === taskId);
        if (targetTask) {
          multiTaskData.set(taskId, {
            startDate: targetTask.startDate,
            endDate: targetTask.endDate
          });
        }
      });
      setOriginalMultiTaskData(multiTaskData);
    } else {
      // 単一タスクのドラッグ準備
      setDraggingTask(task.id);
      setOriginalTaskData({
        startDate: task.startDate,
        endDate: task.endDate
      });
    }
  }, [onTaskDateChange, selectedTaskIds, tasks]);

  // タスクバーのドラッグ中とドラッグ終了の処理
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!draggingTask || !onTaskDateChange) return;

      // ドラッグ閾値の判定
      if (!hasDragged) {
        const deltaX = e.clientX - dragStartPosition.x;
        const deltaY = e.clientY - dragStartPosition.y;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        
        if (distance < DRAG_THRESHOLD) return;
        
        // 閾値を超えた場合、ドラッグ開始
        setHasDragged(true);
        setPreventClick(true);
      }

      const deltaX = e.clientX - dragStartX;
      const deltaUnits = Math.round(deltaX / unitWidth);

      if (deltaUnits === 0) return;

      // 複数タスクの移動処理
      if (originalMultiTaskData.size > 0) {
        if (onMultipleTaskDateChange) {
          // 複数タスクの日付変更を一括処理
          const taskUpdates: Array<{taskId: string, newStartDate: string, newEndDate: string}> = [];
          
          originalMultiTaskData.forEach((data, taskId) => {
            const originalStart = new Date(data.startDate);
            const originalEnd = new Date(data.endDate);
            
            let newStartDate = new Date(originalStart);
            let newEndDate = new Date(originalEnd);

            if (timeUnit === 'day') {
              newStartDate.setDate(originalStart.getDate() + deltaUnits);
              newEndDate.setDate(originalEnd.getDate() + deltaUnits);
            } else if (timeUnit === 'week') {
              newStartDate.setDate(originalStart.getDate() + (deltaUnits * 7));
              newEndDate.setDate(originalEnd.getDate() + (deltaUnits * 7));
            } else if (timeUnit === 'month') {
              newStartDate.setMonth(originalStart.getMonth() + deltaUnits);
              newEndDate.setMonth(originalEnd.getMonth() + deltaUnits);
            }

            const newStartStr = newStartDate.toISOString().split('T')[0];
            const newEndStr = newEndDate.toISOString().split('T')[0];
            
            taskUpdates.push({
              taskId,
              newStartDate: newStartStr,
              newEndDate: newEndStr
            });
          });
          
          // 一括で複数タスクの日付を更新
          onMultipleTaskDateChange(taskUpdates);
        } else {
          // フォールバック: 従来の方法（個別更新）
          originalMultiTaskData.forEach((data, taskId) => {
            const originalStart = new Date(data.startDate);
            const originalEnd = new Date(data.endDate);
            
            let newStartDate = new Date(originalStart);
            let newEndDate = new Date(originalEnd);

            if (timeUnit === 'day') {
              newStartDate.setDate(originalStart.getDate() + deltaUnits);
              newEndDate.setDate(originalEnd.getDate() + deltaUnits);
            } else if (timeUnit === 'week') {
              newStartDate.setDate(originalStart.getDate() + (deltaUnits * 7));
              newEndDate.setDate(originalEnd.getDate() + (deltaUnits * 7));
            } else if (timeUnit === 'month') {
              newStartDate.setMonth(originalStart.getMonth() + deltaUnits);
              newEndDate.setMonth(originalEnd.getMonth() + deltaUnits);
            }

            const newStartStr = newStartDate.toISOString().split('T')[0];
            const newEndStr = newEndDate.toISOString().split('T')[0];
            
            onTaskDateChange && onTaskDateChange(taskId, newStartStr, newEndStr);
          });
        }
      } else if (originalTaskData) {
        // 単一タスクの移動処理
        const task = tasks.find(t => t.id === draggingTask);
        if (!task) return;

        const originalStart = new Date(originalTaskData.startDate);
        const originalEnd = new Date(originalTaskData.endDate);
        
        let newStartDate = new Date(originalStart);
        let newEndDate = new Date(originalEnd);

        if (timeUnit === 'day') {
          newStartDate.setDate(originalStart.getDate() + deltaUnits);
          newEndDate.setDate(originalEnd.getDate() + deltaUnits);
        } else if (timeUnit === 'week') {
          newStartDate.setDate(originalStart.getDate() + (deltaUnits * 7));
          newEndDate.setDate(originalEnd.getDate() + (deltaUnits * 7));
        } else if (timeUnit === 'month') {
          newStartDate.setMonth(originalStart.getMonth() + deltaUnits);
          newEndDate.setMonth(originalEnd.getMonth() + deltaUnits);
        }

        const newStartStr = newStartDate.toISOString().split('T')[0];
        const newEndStr = newEndDate.toISOString().split('T')[0];
        
        onTaskDateChange(draggingTask, newStartStr, newEndStr);
      }
    };

    const handleMouseUp = () => {
      const hadDraggedBefore = hasDragged;
      
      setDraggingTask(null);
      setDragStartX(0);
      setOriginalTaskData(null);
      setOriginalMultiTaskData(new Map());
      setHasDragged(false);
      setDragStartPosition({ x: 0, y: 0 });
      
      // ドラッグが発生した場合、短時間クリックを抑制
      if (hadDraggedBefore) {
        setPreventClick(true);
        setTimeout(() => {
          setPreventClick(false);
        }, 100); // 100ms後にクリック抑制を解除
      }
    };

    if (draggingTask) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingTask, dragStartX, originalTaskData, originalMultiTaskData, onTaskDateChange, unitWidth, timeUnit, tasks]);

  // 期間の開始日と終了日を決定
  const { chartMinDate, chartMaxDate } = useMemo(() => {
    if (sortedTasks.length === 0) {
      const today = new Date();
      return { chartMinDate: today, chartMaxDate: today };
    }
    let minD = new Date(sortedTasks[0].startDate);
    let maxD = new Date(sortedTasks[0].endDate);
    sortedTasks.forEach(task => {
      const start = new Date(task.startDate);
      const end = new Date(task.endDate);
      if (start < minD) minD = start;
      if (end > maxD) maxD = end;
    });

    // ビューモードによって表示範囲を調整 (例: 月表示なら月の初めから終わりまで)
    if (timeUnit === 'month') {
        minD = new Date(minD.getFullYear(), minD.getMonth(), 1);
        maxD = new Date(maxD.getFullYear(), maxD.getMonth() + 1, 0); // 月末
    } else if (timeUnit === 'week') {
        const dayOfWeekMin = minD.getDay();
        minD.setDate(minD.getDate() - dayOfWeekMin + (dayOfWeekMin === 0 ? -6 : 1)); // 週の開始(月曜)
        const dayOfWeekMax = maxD.getDay();
        maxD.setDate(maxD.getDate() + (7 - dayOfWeekMax + (dayOfWeekMax === 0 ? -6 : 1) -1)); // 週の終わり(日曜)
    }
    return { chartMinDate: minD, chartMaxDate: maxD };
  }, [sortedTasks, timeUnit]);
  
  // 表示単位の計算 (日、週、月)
  const getDateUnits = () => {
    const units = [];
    let currentDate = new Date(chartMinDate);
    currentDate.setHours(0,0,0,0); // 時間をリセットして日付のみで比較

    while (currentDate <= chartMaxDate) {
      units.push(new Date(currentDate));
      if (timeUnit === 'day') {
        currentDate.setDate(currentDate.getDate() + 1);
      } else if (timeUnit === 'week') {
        currentDate.setDate(currentDate.getDate() + 7);
      } else if (timeUnit === 'month') {
        currentDate.setMonth(currentDate.getMonth() + 1);
      }
    }
    return units;
  };
  const dateUnits = getDateUnits();
  const totalUnits = dateUnits.length;

  // 指定された日付がチャート開始日から何単位目かを取得
  const getOffsetUnits = (date: Date): number => {
    const targetDate = new Date(date);
    targetDate.setHours(0,0,0,0);
    let count = 0;
    for (const unitStartDate of dateUnits) {
        if (timeUnit === 'day') {
            if (targetDate < new Date(unitStartDate.getFullYear(), unitStartDate.getMonth(), unitStartDate.getDate() + 1)) break;
        } else if (timeUnit === 'week') {
            if (targetDate < new Date(unitStartDate.getFullYear(), unitStartDate.getMonth(), unitStartDate.getDate() + 7)) break;
        } else if (timeUnit === 'month') {
            const nextMonth = new Date(unitStartDate.getFullYear(), unitStartDate.getMonth() + 1, 1);
            if (targetDate < nextMonth) break;
        }
        count++;
    }
    return Math.max(0, count -1); // 0-indexedに近くするため
  };

  // タスクの期間を単位数で取得
  const getTaskDurationInUnits = (startDate: Date, endDate: Date): number => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    start.setHours(0,0,0,0);
    end.setHours(0,0,0,0);

    let duration = 0;
    if (timeUnit === 'day') {
      duration = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    } else if (timeUnit === 'week') {
      // 週の最終日までを考慮
      const endOfWeekForStart = new Date(start);
      endOfWeekForStart.setDate(start.getDate() + (6 - start.getDay())); 
      if (end <= endOfWeekForStart) return 1; // 同週内なら1
      duration = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 7));
    } else if (timeUnit === 'month') {
      duration = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1;
    }
    return Math.max(1, duration);
  };

  return (
    <div className="bg-slate-800 p-4 rounded-lg shadow-lg relative" ref={chartContainerRef}>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-semibold text-sky-400">Gantt Chart</h3>
        <div className="flex items-center space-x-4">
          {/* Multi-select Mode Controls */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsMultiSelectMode(!isMultiSelectMode)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                isMultiSelectMode 
                  ? 'bg-purple-600 text-white shadow-sm' 
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              {isMultiSelectMode ? '複数選択終了' : '複数選択'}
            </button>
            {isMultiSelectMode && selectedTaskIds.size > 0 && (
              <div className="flex items-center space-x-2">
                <span className="text-xs text-purple-300 font-medium">
                  {selectedTaskIds.size}件選択中
                </span>
                <button
                  onClick={() => setSelectedTaskIds(new Set())}
                  className="px-2 py-1 text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 rounded transition-colors"
                >
                  選択解除
                </button>
              </div>
            )}
          </div>
          {/* Zoom Controls */}
          <div className="flex items-center space-x-2">
            <label className="text-sm text-slate-300 whitespace-nowrap">ズーム:</label>
            <button
              onClick={handleZoomOut}
              className="w-8 h-8 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded flex items-center justify-center transition-colors"
              title="ズームアウト"
            >
              <ZoomOutIcon className={iconSizes.sm} />
            </button>
            <span className="text-xs text-slate-400 min-w-[40px] text-center">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              onClick={handleZoomIn}
              className="w-8 h-8 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded flex items-center justify-center transition-colors"
              title="ズームイン"
            >
              <ZoomInIcon className={iconSizes.sm} />
            </button>
            <button
              onClick={resetZoom}
              className="flex items-center gap-1 px-2 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded text-xs transition-colors"
              title="ズームリセット"
            >
              <ResetIcon className={iconSizes.xs} />
              リセット
            </button>
          </div>
          {/* Row Height Input */}
          <div className="flex items-center space-x-2">
            <label htmlFor="rowHeightInput" className="text-sm text-slate-300 whitespace-nowrap">Row Height:</label>
            <input
              type="number"
              id="rowHeightInput"
              value={rowHeight}
              onChange={(e) => setRowHeight(Math.max(20, parseInt(e.target.value, 10) || 40))} // Min height 20, default to 40 if NaN
              className="w-16 bg-slate-700 border-slate-600 rounded-md py-1 px-2 text-slate-100 text-sm focus:ring-sky-500 focus:border-sky-500"
            />
          </div>
          {/* View Mode Buttons */}
          <div className="flex space-x-2">
            {(['day', 'week', 'month'] as GanttViewMode[]).map(mode => (
              <button 
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors 
                  ${viewMode === mode 
                    ? 'bg-sky-600 text-white shadow-sm' 
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
              >
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="overflow-auto" style={{ height: '75vh' }}>
        <div style={{ width: totalUnits * unitWidth + labelWidth + 8, minHeight: (tasks.length + 2) * rowHeight + CHART_PADDING*2 }} className={`relative ${isMultiSelectMode ? 'bg-purple-900/10' : ''}`}>
          {/* Multi-select mode indicator */}
          {isMultiSelectMode && (
            <div className="absolute top-0 left-0 w-full h-full bg-purple-500/5 pointer-events-none z-0">
              <div className="absolute top-2 left-2 bg-purple-600/90 text-white text-xs px-2 py-1 rounded-md shadow-lg">
                複数選択モード（クリックで選択/解除、右クリックで詳細編集）
              </div>
            </div>
          )}
          {/* Date Headers and Resizer - MaterialTable style sticky header */}
          <div 
            className="z-20 bg-slate-800 flex border-b border-slate-700" 
            style={{ 
              position: 'sticky', 
              top: 0, 
              height: rowHeight 
            }}
          >
            {/* Top-left fixed cell (for label header area) */}
            <div style={{ width: labelWidth, flexShrink: 0 }} className="bg-slate-800 border-r border-slate-700 flex items-center justify-center">
              <span className="text-sm text-slate-400 font-medium">Tasks</span>
            </div>
            {/* Resizer Handle */}
            <div
              ref={resizeHandleRef}
              onMouseDown={handleMouseDown}
              style={{
                width: '8px',
                cursor: 'ew-resize',
                backgroundColor: isResizing ? '#0ea5e9' : '#334155'
              }}
              className="h-full flex-shrink-0 border-r border-slate-700 hover:bg-sky-600 transition-colors"
              title="Drag to resize task name column"
            >
              &nbsp;
            </div>
            {/* Date units */}
            <div className="flex">
              {dateUnits.map((unitDate, i) => {
                let displayContent;
                if (timeUnit === 'day') {
                  const day = unitDate.toLocaleDateString(undefined, { day: 'numeric' });
                  const month = unitDate.toLocaleDateString(undefined, { month: 'short' });
                  const weekday = unitDate.toLocaleDateString(undefined, { weekday: 'short' });
                  displayContent = (
                    <div className="flex flex-col items-center justify-center h-full leading-tight whitespace-nowrap">
                      <span className="text-xs">{month} {day}</span>
                      <span className="text-xs font-medium">{weekday}</span>
                    </div>
                  );
                } else if (timeUnit === 'week') {
                  const weekEnd = new Date(unitDate);
                  weekEnd.setDate(unitDate.getDate() + 6);
                  const displayDate = `${unitDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
                  displayContent = displayDate;
                } else { // month
                  const displayDate = unitDate.toLocaleDateString(undefined, { year: 'numeric', month: 'long' });
                  displayContent = displayDate;
                }
                return (
                  <div
                    key={i}
                    style={{ width: unitWidth }}
                    className="flex-shrink-0 border-r border-slate-700 text-xs text-slate-400 flex items-center justify-center px-1 text-center h-full"
                  >
                    {displayContent}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Task Rows */}
          <div style={{paddingTop: CHART_PADDING}}>
          {sortedTasks.map((task) => {
            const taskStart = new Date(task.startDate);
            const taskEnd = new Date(task.endDate);

            const startOffsetUnits = getOffsetUnits(taskStart);
            const durationUnits = getTaskDurationInUnits(taskStart, taskEnd);
            
            const taskStartOffsetPx = startOffsetUnits * unitWidth;
            const taskWidthPx = durationUnits * unitWidth - 2; // -2 for small gap

            return (
              <div key={task.id} className="flex items-center" style={{ height: rowHeight, marginBottom: '4px' }}> {/* Use rowHeight here */}
                {/* Sticky Task Name Column */}
                <div 
                  style={{ width: labelWidth, flexShrink: 0, left:0 }} // left:0 を追加
                  className={`sticky z-10 bg-slate-800 text-sm text-slate-300 pr-2 border-r border-slate-700 flex items-center ${task.status === 'Completed' ? 'opacity-60 line-through' : ''} ${task.status === 'In Progress' ? 'text-sky-300' : ''}`}
                  title={task.name}
                >
                  {/* Status Icon for Label Column */}
                  {task.status === 'Not Started' && (
                    <StatusNotStartedIcon className="w-3.5 h-3.5 mr-1.5 text-slate-500 flex-shrink-0" />
                  )}
                  {task.status === 'In Progress' && (
                    <StatusInProgressIcon className="w-3.5 h-3.5 mr-1.5 text-sky-400 flex-shrink-0" />
                  )}
                  {task.status === 'Completed' && (
                    <StatusCompletedIcon className="w-4 h-4 mr-1.5 text-green-500 flex-shrink-0" />
                  )}
                  <span className="truncate">{task.name}</span>
                </div>
                {/* Sticky Resize Handle Placeholder - This follows the task name column */}
                <div style={{ width: '8px', flexShrink: 0, left: labelWidth }} className="sticky z-10 bg-slate-800 border-r border-slate-700 h-full"></div> {/* left: labelWidth, z-10, bg-slate-800 を追加*/}
                <div className="relative h-full" style={{ width: totalUnits * unitWidth }}>
                  <div
                    style={{
                      left: taskStartOffsetPx,
                      width: taskWidthPx,
                      height: rowHeight * 0.7, // Use rowHeight here
                      top: rowHeight * 0.15,  // Use rowHeight here
                      cursor: onTaskDateChange ? 'grab' : 'pointer',
                    }}
                    className={`absolute rounded ${PRIORITY_COLORS[task.priority]} text-white text-xs flex items-center px-1.5 overflow-hidden shadow-md hover:brightness-125 transition-all ${task.status === 'Completed' ? 'opacity-60' : ''} ${task.status === 'In Progress' ? 'brightness-110' : ''} ${draggingTask === task.id ? 'opacity-80 scale-105' : ''} ${selectedTaskIds.has(task.id) ? 'ring-2 ring-purple-400 ring-offset-2 ring-offset-slate-800' : ''} ${isMultiSelectMode ? 'cursor-pointer' : ''}`}
                    onClick={(e) => {
                      // ドラッグ後のクリック抑制
                      if (preventClick) {
                        e.preventDefault();
                        e.stopPropagation();
                        return;
                      }
                      
                      if (!draggingTask) {
                        if (isMultiSelectMode) {
                          // Multi-select mode: toggle selection
                          const newSelection = new Set(selectedTaskIds);
                          // 複数選択モードでは常にトグル選択
                          if (newSelection.has(task.id)) {
                            newSelection.delete(task.id);
                          } else {
                            newSelection.add(task.id);
                          }
                          setSelectedTaskIds(newSelection);
                        } else {
                          // Normal mode: edit task
                          onEditTask(task);
                        }
                      }
                    }}
                    onMouseDown={(e) => {
                      if (onTaskDateChange) {
                        handleTaskMouseDown(e, task);
                      }
                    }}
                    onContextMenu={(e) => {
                      // 右クリックで詳細編集（複数選択モード中でも有効）
                      e.preventDefault();
                      if (!preventClick) {
                        onEditTask(task);
                      }
                    }}
                    onMouseEnter={(e) => {
                      if (!draggingTask) {
                        setTooltipData({ 
                          task,
                          x: e.clientX,
                          y: e.clientY
                        });
                      }
                    }}
                    onMouseMove={(e) => {
                      if (tooltipData && !draggingTask) {
                        setTooltipData({ 
                          ...tooltipData, 
                          x: e.clientX,
                          y: e.clientY
                        });
                      }
                    }}
                    onMouseLeave={() => {
                      if (!draggingTask) {
                        setTooltipData(null);
                      }
                    }}
                  >
                    {/* Status Icon for Task Bar */}
                    {task.status === 'Not Started' && (
                      <StatusNotStartedIcon className="w-3 h-3 mr-1 text-white opacity-70 flex-shrink-0" />
                    )}
                    {task.status === 'In Progress' && (
                      <StatusInProgressIcon className="w-3 h-3 mr-1 text-white opacity-90 flex-shrink-0" />
                    )}
                    {task.status === 'Completed' && (
                      <StatusCompletedIcon className="w-3.5 h-3.5 mr-1 text-white flex-shrink-0" />
                    )}
                   <span className={`truncate ${task.status === 'Completed' ? 'line-through' : ''}`}>{task.name}</span>
                  </div>
                </div>
              </div>
            );
          })}
          </div>
           {/* Dependency Lines (Basic visualization, might need more advanced SVG for curves) */}
          <svg className="absolute top-0 left-0 w-full h-full pointer-events-none" style={{/* paddingTop: rowHeight + CHART_PADDING REMOVED - this was an incorrect comment */}}>
              {sortedTasks.flatMap((task, taskIndex) => 
                  task.dependencies.map(depId => {
                      const dependentTaskIndex = sortedTasks.findIndex(t => t.id === depId);
                      if (dependentTaskIndex === -1) return null;

                      const depTask = sortedTasks[dependentTaskIndex];
                      
                      // Y座標の計算修正:
                      // SVGの(0,0)は日付ヘッダーの真下に来るようにする。
                      // タスク行はCHART_PADDING後に始まる。
                      // 各タスク行の中央を指すようにする。
                      const yOffset = rowHeight + CHART_PADDING; // Use rowHeight here // 日付ヘッダー高さ + タスク行コンテナのpaddingTop

                      const depLineY = yOffset + (dependentTaskIndex * (rowHeight + 4)) + (rowHeight / 2); // Use rowHeight here
                      const taskLineY = yOffset + (taskIndex * (rowHeight + 4)) + (rowHeight / 2); // Use rowHeight here

                      // X座標 (変更なし)
                      const depTaskStartUnits = getOffsetUnits(new Date(depTask.startDate));
                      const depTaskDurationUnits = getTaskDurationInUnits(new Date(depTask.startDate), new Date(depTask.endDate));
                      const depTaskVisualRightEdgePx = (depTaskStartUnits * unitWidth) + (depTaskDurationUnits * unitWidth - 2); // タイムラインエリア内での相対X
                      const depLineX = depTaskVisualRightEdgePx + labelWidth + 8; // SVG全体座標系でのX

                      // 依存先タスク (task) のバーの視覚的な左端X座標
                      const taskStartUnits = getOffsetUnits(new Date(task.startDate));
                      const taskVisualLeftEdgePx = taskStartUnits * unitWidth; // タイムラインエリア内での相対X
                      const taskLineX = taskVisualLeftEdgePx + labelWidth + 8; // SVG全体座標系でのX
                      
                      // 制御点のオフセット距離 (線の長さの一定割合)
                      const controlPointOffset = Math.abs(taskLineX - depLineX) * 0.3;

                      // Y座標が同じ場合は、直線でつなぐか、わずかにカーブさせる。
                      // 異なる場合は、少し複雑なS字になる。
                      // この分岐では、従来の角ばった線の方が、予期せぬ描画を防げる可能性が高いです。
                      // 要望は「曲線」なので、3次ベジェで試みます。
                      // ただし、始点と終点が非常に近い、またはX座標が逆転している場合、制御点の計算によっては不自然なループを描く可能性あり。
                      
                      // もしXが逆転しているなら、制御点のX方向も反転させるイメージ
                      // depLineX > taskLineX の場合
                      const dx1 = depLineX > taskLineX ? -controlPointOffset : controlPointOffset;
                      const dx2 = depLineX > taskLineX ? controlPointOffset : -controlPointOffset;

                      return (
                          <path
                              key={`${depId}-${task.id}`}
                              d={`M ${depLineX} ${depLineY} C ${depLineX + dx1} ${depLineY}, ${taskLineX + dx2} ${taskLineY}, ${taskLineX} ${taskLineY}`}
                              stroke="#60a5fa" 
                              strokeWidth="2"
                              fill="none"
                              markerEnd="url(#arrowhead)"
                              className="dependency-line"
                              style={{
                                filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))',
                                transition: 'stroke-width 0.2s ease'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.strokeWidth = '3';
                                e.currentTarget.style.stroke = '#3b82f6';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.strokeWidth = '2';
                                e.currentTarget.style.stroke = '#60a5fa';
                              }}
                          />
                      );
                  }).filter(Boolean)
              )}
              <defs>
                  <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                      <polygon points="0 0, 8 3, 0 6" fill="#60a5fa" stroke="#60a5fa" strokeWidth="0.5" />
                  </marker>
                  <filter id="glow">
                      <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                      <feMerge> 
                          <feMergeNode in="coloredBlur"/>
                          <feMergeNode in="SourceGraphic"/>
                      </feMerge>
                  </filter>
              </defs>
          </svg>
        </div>
      </div>
      {/* Custom Tooltip */} 
      {tooltipData && (
        <div 
          style={{
            position: 'fixed', // fixed に変更してビューポート基準で位置決め
            left: `${tooltipData.x + 15}px`, // マウス追従
            top: `${tooltipData.y - 10}px`, // マウス追従
            transform: 'translateY(-100%)', // Y座標をツールチップの高さ分だけ上にオフセット
            backgroundColor: 'rgba(15, 23, 42, 0.85)', // bg-slate-900/85
            color: 'white',
            padding: '10px 14px',
            borderRadius: '8px',
            fontSize: '0.875rem',
            zIndex: 100, // 他の要素より手前に表示
            pointerEvents: 'none', // ツールチップ自体がマウスイベントを拾わないように
            backdropFilter: 'blur(4px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            whiteSpace: 'nowrap',
            transition: 'opacity 0.2s ease-in-out',
            opacity: 1,
          }}
        >
          <div className="font-bold text-base mb-1.5 text-sky-300">{tooltipData.task.name}</div>
          <div className="text-slate-300 space-y-1">
            <p><span className="font-semibold text-slate-400 w-16 inline-block">ステータス:</span> {STATUS_TEXT_JP[tooltipData.task.status]}</p>
            <p><span className="font-semibold text-slate-400 w-16 inline-block">優先度:</span> {PRIORITY_TEXT_JP[tooltipData.task.priority]}</p>
            <p><span className="font-semibold text-slate-400 w-16 inline-block">開始日:</span> {tooltipData.task.startDate}</p>
            <p><span className="font-semibold text-slate-400 w-16 inline-block">終了日:</span> {tooltipData.task.endDate}</p>
          </div>
        </div>
      )}
    </div>
  );
};
    