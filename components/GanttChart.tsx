import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { Task, TaskPriority } from '../types';
import { PRIORITY_COLORS } from '../constants';

interface GanttChartProps {
  tasks: Task[];
  onEditTask: (task: Task) => void;
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

export const GanttChart: React.FC<GanttChartProps> = ({ tasks, onEditTask }) => {
  const [labelWidth, setLabelWidth] = useState(150); // 初期値を150に設定
  const [isResizing, setIsResizing] = useState(false);
  const [tooltipData, setTooltipData] = useState<TooltipData | null>(null); // ツールチップ用state
  const [viewMode, setViewMode] = useState<GanttViewMode>('day'); // ビューモードstate
  const [rowHeight, setRowHeight] = useState(40); // 行の高さをstate管理する
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
  
  const getDaysFromStart = (date: Date): number => {
    return Math.ceil((date.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24));
  };

  const getTaskName = (taskId: string): string => {
    const task = tasks.find(t => t.id === taskId);
    return task ? task.name : 'Unknown Task';
  };

  // ビューモードに応じた設定
  const getChartSettings = () => {
    switch (viewMode) {
      case 'week':
        return { unitWidth: 70, timeUnit: 'week' }; // 1週間あたり70px
      case 'month':
        return { unitWidth: 180, timeUnit: 'month' }; // 1ヶ月あたり180px
      case 'day':
      default:
        return { unitWidth: 75, timeUnit: 'day' }; // 1日あたり55px -> 75px に変更
    }
  };
  const { unitWidth, timeUnit } = getChartSettings();

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
        <div className="flex items-center space-x-4"> {/* Added space-x-4 for better spacing */}
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
      {/* overflow-y-auto */}
        <div style={{ width: totalUnits * unitWidth + labelWidth + 8, minHeight: (tasks.length + 2) * rowHeight + CHART_PADDING*2 }} className="relative">
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
          {sortedTasks.map((task, index) => {
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
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 mr-1.5 text-slate-500 flex-shrink-0">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
                    </svg>
                  )}
                  {task.status === 'In Progress' && (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 mr-1.5 text-sky-400 flex-shrink-0">
                      <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                    </svg>
                  )}
                  {task.status === 'Completed' && (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 mr-1.5 text-green-500 flex-shrink-0">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                    </svg>
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
                      cursor: 'pointer',
                    }}
                    className={`absolute rounded ${PRIORITY_COLORS[task.priority]} text-white text-xs flex items-center px-1.5 overflow-hidden shadow-md hover:brightness-125 transition-all ${task.status === 'Completed' ? 'opacity-60' : ''} ${task.status === 'In Progress' ? 'brightness-110' : ''}`}
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
                    {/* Status Icon for Task Bar */}
                    {task.status === 'Not Started' && (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 mr-1 text-white opacity-70 flex-shrink-0">
                         <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
                      </svg>
                    )}
                    {task.status === 'In Progress' && (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 mr-1 text-white opacity-90 flex-shrink-0">
                         <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                      </svg>
                    )}
                    {task.status === 'Completed' && (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 mr-1 text-white flex-shrink-0">
                         <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                      </svg>
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

                      // 依存先が依存元より視覚的に左にある、または非常に近い場合 (逆S字カーブまたは直線的な経路)
                      if(taskLineX < depLineX + 10) { 
                          // 制御点を調整して逆S字カーブまたは直線的な経路を形成
                          const cp1x = depLineX + controlPointOffset;
                          const cp1y = depLineY;
                          const cp2x = taskLineX - controlPointOffset;
                          const cp2y = taskLineY;

                          // Y座標が大きく異なる場合は、中間点を設けて階段状のカーブにするか、
                          // または単純な角付きのままにするかを検討。ここでは簡易的に制御点を調整。
                          // Yの差が大きい場合は、S字が不自然になることがあるため、ここでは従来の角付きパスを使用することを推奨
                          // 今回はユーザーの要望に「曲線で」とあるため、制御点を調整したS字で試みる
                          // ただし、depLineY と taskLineY が同じか近い場合は、この制御点だと直線に近くなる
                          // より自然な逆S字のためには、Y方向にも制御点を振る必要があるかもしれない
                          // 例: cp1y = depLineY + (taskLineY - depLineY) * 0.25; cp2y = taskLineY - (taskLineY - depLineY) * 0.25;
                          // 今回はシンプルに保つため、X方向のオフセットのみで試行。
                          // やはりこのケースは従来の角付きの方が安定する場合が多い。
                          // ユーザー要望を優先しつつ、複雑になりすぎる場合は代替案を提示できるようにしておく。
                          // ここでは、既存の角付きのロジックを維持し、曲線は通常の左→右の場合のみとするのが安全策かもしれない。
                          // 今回は、曲線で、という強い要望があるので、逆向きでもS字を試みる。
                          // X方向の距離が短い場合は、制御点オフセットが小さくなり、ほぼ直線に近づく。

                          // Y座標が同じ場合は、直線でつなぐか、わずかにカーブさせる。
                          // 異なる場合は、少し複雑なS字になる。
                          // この分岐では、従来の角ばった線の方が、予期せぬ描画を防げる可能性が高いです。
                          // 要望は「曲線」なので、3次ベジェで試みます。
                          // ただし、始点と終点が非常に近い、またはX座標が逆転している場合、制御点の計算によっては不自然なループを描く可能性あり。
                          // 制御点をdepLineXとtaskLineXの間に来るように調整。
                          const midX = (depLineX + taskLineX) / 2;
                          const c1x = depLineX + controlPointOffset; // 始点から右に
                          const c1y = depLineY; 
                          const c2x = taskLineX - controlPointOffset; // 終点から左に
                          const c2y = taskLineY;

                          // もしXが逆転しているなら、制御点のX方向も反転させるイメージ
                          // depLineX > taskLineX の場合
                          const dx1 = depLineX > taskLineX ? -controlPointOffset : controlPointOffset;
                          const dx2 = depLineX > taskLineX ? controlPointOffset : -controlPointOffset;

                          return (
                              <path
                                  key={`${depId}-${task.id}`}
                                  d={`M ${depLineX} ${depLineY} C ${depLineX + dx1} ${depLineY}, ${taskLineX + dx2} ${taskLineY}, ${taskLineX} ${taskLineY}`}
                                  stroke="#60a5fa" 
                                  strokeWidth="1.5"
                                  fill="none"
                                  markerEnd="url(#arrowhead)"
                              />
                          );
                      }
                      // 通常の左から右への依存線 (S字ベジェ曲線)
                      return (
                          <path // lineからpathに変更
                              key={`${depId}-${task.id}`}
                              d={`M ${depLineX} ${depLineY} C ${depLineX + controlPointOffset} ${depLineY}, ${taskLineX - controlPointOffset} ${taskLineY}, ${taskLineX} ${taskLineY}`}
                              stroke="#60a5fa"
                              strokeWidth="1.5"
                              fill="none" // fillをnoneに設定
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
    