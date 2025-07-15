import React, { useState, useEffect, useCallback } from 'react';
import { Task, ViewMode, SplitViewConfig } from './types';
import { TaskForm } from './components/TaskForm';
import { TaskList } from './components/TaskList';
import { GanttChart } from './components/GanttChart';
import { AiInteraction } from './components/AiInteraction';
import { Modal } from './components/Modal';
import { parseTasksFromYaml, stringifyTasksToYaml } from './services/yamlService';
import { APP_TITLE, INITIAL_TASKS_YAML } from './constants';
import { 
  ListViewIcon, 
  GanttViewIcon, 
  AiViewIcon,
  AddIcon,
  CloseIcon,
  iconSizes
} from './components/icons';
import { ResizablePanel } from './components/ResizablePanel';
import './styles/globals.css';

const App: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [yamlString, setYamlString] = useState<string>('');
  const [currentView, setCurrentView] = useState<ViewMode>('list');
  const [splitViewConfig, setSplitViewConfig] = useState<SplitViewConfig>({
    leftPane: 'list',
    rightPane: 'gantt',
    splitDirection: 'horizontal',
    leftSize: 50,
    rightSize: 50
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load initial tasks from YAML constant or localStorage
  useEffect(() => {
    const storedYaml = localStorage.getItem('tasksYaml');
    const initialYaml = storedYaml || INITIAL_TASKS_YAML;
    setYamlString(initialYaml);
    
    // Load split view configuration from localStorage
    const storedSplitConfig = localStorage.getItem('splitViewConfig');
    if (storedSplitConfig) {
      try {
        const parsedConfig = JSON.parse(storedSplitConfig);
        setSplitViewConfig(parsedConfig);
      } catch (e) {
        console.error('Failed to parse stored split view config:', e);
      }
    }
    
    try {
      const parsedTasks = parseTasksFromYaml(initialYaml);
      setTasks(parsedTasks);
    } catch (e) {
      setError(`Error loading initial tasks: ${(e as Error).message}`);
      setTasks([]); // fallback to empty
      setYamlString(stringifyTasksToYaml([])); // clear yaml if parsing fails
    }
  }, []);

  // Sync tasks to YAML string and localStorage whenever tasks change from GUI
  const syncTasksToYaml = useCallback((updatedTasks: Task[]) => {
    try {
      const newYaml = stringifyTasksToYaml(updatedTasks);
      setYamlString(newYaml);
      localStorage.setItem('tasksYaml', newYaml);
      setError(null); // Clear previous errors on successful sync
    } catch (e) {
       setError(`Error converting tasks to YAML: ${(e as Error).message}`);
    }
  }, []);


  const handleAddTask = (task: Task) => {
    const newTasks = [...tasks, task];
    setTasks(newTasks);
    syncTasksToYaml(newTasks);
    setIsModalOpen(false);
  };

  const handleEditTask = (taskToEdit: Task) => {
    setEditingTask(taskToEdit);
    setIsModalOpen(true);
  };

  const handleUpdateTask = (updatedTask: Task) => {
    const newTasks = tasks.map(task => (task.id === updatedTask.id ? updatedTask : task));
    setTasks(newTasks);
    syncTasksToYaml(newTasks);
    setIsModalOpen(false);
    setEditingTask(null);
  };

  const handleDeleteTask = (taskId: string) => {
    if (window.confirm('このタスクを削除してもよろしいですか？依存するタスクに影響する可能性があります。')) {
      const newTasks = tasks.filter(task => task.id !== taskId)
        // Also remove this task from other tasks' dependencies
        .map(t => ({
            ...t,
            dependencies: t.dependencies.filter(depId => depId !== taskId)
        }));
      setTasks(newTasks);
      syncTasksToYaml(newTasks);
    }
  };
  
  const handleYamlUpdateByAi = useCallback(async (newYamlFromAi: string) => {
    try {
      const parsedTasks = parseTasksFromYaml(newYamlFromAi); // This can throw
      setTasks(parsedTasks);
      setYamlString(newYamlFromAi); // Update YAML state only if parsing is successful
      localStorage.setItem('tasksYaml', newYamlFromAi);
      setError(null); // Clear error on success
    } catch (e) {
      console.error("Failed to parse YAML from AI:", e);
      setError(`AI returned invalid YAML or task structure: ${(e as Error).message}. Please check the YAML manually or try a different command.`);
      // Optionally, do not update tasks or yamlString if parsing fails, keeping the last valid state.
      // Or, set yamlString to newYamlFromAi to let user see the problematic YAML.
      setYamlString(newYamlFromAi); // Show potentially problematic YAML for user debugging
    }
  }, []);

  const handleBulkUpdate = useCallback((updatedTasks: Task[]) => {
    setTasks(updatedTasks);
    syncTasksToYaml(updatedTasks);
  }, [syncTasksToYaml]);

  const handleReorderTasks = useCallback((reorderedTasks: Task[]) => {
    setTasks(reorderedTasks);
    syncTasksToYaml(reorderedTasks);
  }, [syncTasksToYaml]);

  const handleTaskDateChange = useCallback((taskId: string, newStartDate: string, newEndDate: string) => {
    const updatedTasks = tasks.map(task => 
      task.id === taskId 
        ? { ...task, startDate: newStartDate, endDate: newEndDate }
        : task
    );
    setTasks(updatedTasks);
    syncTasksToYaml(updatedTasks);
  }, [tasks, syncTasksToYaml]);

  const handleMultipleTaskDateChange = useCallback((taskUpdates: Array<{taskId: string, newStartDate: string, newEndDate: string}>) => {
    const updatedTasks = tasks.map(task => {
      const update = taskUpdates.find(u => u.taskId === task.id);
      return update 
        ? { ...task, startDate: update.newStartDate, endDate: update.newEndDate }
        : task;
    });
    setTasks(updatedTasks);
    syncTasksToYaml(updatedTasks);
  }, [tasks, syncTasksToYaml]);


  const openNewTaskModal = () => {
    setEditingTask(null);
    setIsModalOpen(true);
  };

  const renderSingleView = (viewType: 'list' | 'gantt' | 'ai', isInSplitView: boolean = false) => {
    switch (viewType) {
      case 'list':
        return <TaskList tasks={tasks} onEditTask={handleEditTask} onDeleteTask={handleDeleteTask} onBulkUpdate={handleBulkUpdate} onReorderTasks={handleReorderTasks} isInSplitView={isInSplitView} />;
      case 'gantt':
        return <GanttChart tasks={tasks} onEditTask={handleEditTask} onTaskDateChange={handleTaskDateChange} onMultipleTaskDateChange={handleMultipleTaskDateChange} isInSplitView={isInSplitView} />;
      case 'ai':
        return (
          <AiInteraction
            tasks={tasks}
            currentYaml={yamlString}
            onYamlUpdateByAi={handleYamlUpdateByAi}
            isLoading={isLoading}
            setIsLoading={setIsLoading}
            setError={setError}
            isInSplitView={isInSplitView}
          />
        );
      default:
        return null;
    }
  };

  const renderSplitView = () => {
    let leftPane: 'list' | 'gantt' | 'ai' = 'list';
    let rightPane: 'list' | 'gantt' | 'ai' = 'gantt';

    switch (currentView) {
      case 'split-list-gantt':
        leftPane = 'list';
        rightPane = 'gantt';
        break;
      case 'split-list-ai':
        leftPane = 'list';
        rightPane = 'ai';
        break;
      case 'split-gantt-ai':
        leftPane = 'gantt';
        rightPane = 'ai';
        break;
    }

    return (
      <div className="flex h-full gap-2 overflow-hidden">
        <ResizablePanel
          direction="horizontal"
          initialSize={splitViewConfig.leftSize}
          onResize={(newSize) => {
            const newConfig = { ...splitViewConfig, leftSize: newSize, rightSize: 100 - newSize };
            setSplitViewConfig(newConfig);
            localStorage.setItem('splitViewConfig', JSON.stringify(newConfig));
          }}
          className="flex-shrink-0"
        >
          <div className="h-full overflow-hidden bg-slate-800/40 backdrop-blur-sm rounded-lg shadow-lg border border-slate-700/50 p-4">
            {renderSingleView(leftPane, true)}
          </div>
        </ResizablePanel>
        
        <div className="flex-1 overflow-hidden bg-slate-800/40 backdrop-blur-sm rounded-lg shadow-lg border border-slate-700/50 p-4">
          {renderSingleView(rightPane, true)}
        </div>
      </div>
    );
  };

  const renderView = () => {
    // Force single view on mobile for split views
    if (currentView.startsWith('split-')) {
      const isMobile = window.innerWidth < 768;
      if (isMobile) {
        // Default to first view on mobile
        let fallbackView: 'list' | 'gantt' | 'ai' = 'list';
        if (currentView === 'split-list-gantt') fallbackView = 'list';
        else if (currentView === 'split-list-ai') fallbackView = 'list';
        else if (currentView === 'split-gantt-ai') fallbackView = 'gantt';
        return renderSingleView(fallbackView);
      }
      return renderSplitView();
    }
    return renderSingleView(currentView as 'list' | 'gantt' | 'ai');
  };

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 text-slate-100 overflow-hidden">
      <header className="bg-slate-800/60 backdrop-blur-md shadow-xl border-b border-slate-700/50 p-3 md:p-4 flex-shrink-0 z-40">
        <div className="w-full max-w-none px-4 md:px-8 flex flex-col sm:flex-row justify-between items-center">
          <h1 className="text-3xl font-bold text-sky-400 tracking-tight drop-shadow-md">{APP_TITLE}</h1>
          <nav className="mt-2 sm:mt-0 flex flex-wrap gap-2 sm:gap-3">
            {/* Single View Buttons */}
            {(['list', 'gantt', 'ai'] as ViewMode[]).map(view => {
              const getViewIcon = (viewType: ViewMode) => {
                switch (viewType) {
                  case 'list': return <ListViewIcon className={iconSizes.sm} />;
                  case 'gantt': return <GanttViewIcon className={iconSizes.sm} />;
                  case 'ai': return <AiViewIcon className={iconSizes.sm} />;
                }
              };

              return (
                <button
                  key={view}
                  onClick={() => setCurrentView(view)}
                  className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-all duration-200
                    ${currentView === view 
                      ? 'bg-sky-600 text-white shadow-lg shadow-sky-600/25 ring-1 ring-sky-500/50' 
                      : 'text-slate-300 hover:bg-slate-700/70 hover:text-white hover:shadow-md'}`}
                >
                  {getViewIcon(view)}
                  {view.charAt(0).toUpperCase() + view.slice(1)} View
                </button>
              );
            })}

            {/* Split View Buttons - Hidden on mobile */}
            <div className="hidden sm:flex items-center gap-1 ml-2 pl-2 border-l border-slate-600">
              <button
                onClick={() => setCurrentView('split-list-gantt')}
                className={`flex items-center gap-1 px-2 py-2 text-xs font-medium rounded-md transition-all duration-200
                  ${currentView === 'split-list-gantt'
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/25 ring-1 ring-emerald-500/50'
                    : 'text-slate-300 hover:bg-slate-700/70 hover:text-white hover:shadow-md'}`}
              >
                <ListViewIcon className="w-3 h-3" />
                <span className="text-slate-400">|</span>
                <GanttViewIcon className="w-3 h-3" />
              </button>
              <button
                onClick={() => setCurrentView('split-list-ai')}
                className={`flex items-center gap-1 px-2 py-2 text-xs font-medium rounded-md transition-all duration-200
                  ${currentView === 'split-list-ai'
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/25 ring-1 ring-emerald-500/50'
                    : 'text-slate-300 hover:bg-slate-700/70 hover:text-white hover:shadow-md'}`}
              >
                <ListViewIcon className="w-3 h-3" />
                <span className="text-slate-400">|</span>
                <AiViewIcon className="w-3 h-3" />
              </button>
              <button
                onClick={() => setCurrentView('split-gantt-ai')}
                className={`flex items-center gap-1 px-2 py-2 text-xs font-medium rounded-md transition-all duration-200
                  ${currentView === 'split-gantt-ai'
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/25 ring-1 ring-emerald-500/50'
                    : 'text-slate-300 hover:bg-slate-700/70 hover:text-white hover:shadow-md'}`}
              >
                <GanttViewIcon className="w-3 h-3" />
                <span className="text-slate-400">|</span>
                <AiViewIcon className="w-3 h-3" />
              </button>
            </div>
          </nav>
        </div>
      </header>

      <main className="w-full px-4 md:px-8 pt-4 md:pt-6 flex-1 flex flex-col overflow-hidden">
        {error && (
          <div className="mb-4 p-4 bg-red-500/20 border border-red-400/50 text-red-200 rounded-lg shadow-lg" role="alert">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-5 h-5 mt-0.5">
                  <svg className="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-semibold text-red-300">エラーが発生しました</h4>
                  <p className="mt-1 text-red-200">{error}</p>
                </div>
              </div>
              <button 
                onClick={() => setError(null)} 
                className="text-red-300 hover:text-red-100 p-1 rounded-md hover:bg-red-500/20 transition-colors"
              >
                <CloseIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
         {isLoading && currentView !== 'ai' && ( // Show general loading indicator if not in AI view (AI view has its own)
          <div className="fixed inset-0 bg-slate-900 bg-opacity-50 flex items-center justify-center z-50">
            <div className="text-white text-xl">Loading...</div>
          </div>
        )}

        {(currentView === 'list' || currentView.includes('list')) && (
          <div className="mb-6 flex justify-end flex-shrink-0">
            <button
              onClick={openNewTaskModal}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-green-500 transition-all hover:scale-105 border border-green-500/30"
            >
              <AddIcon className={iconSizes.sm} />
              新規タスクを追加
            </button>
          </div>
        )}
        
        <div className={`${currentView.startsWith('split-') ? 'flex-1 overflow-hidden' : 'bg-slate-800/40 backdrop-blur-sm rounded-xl shadow-2xl border border-slate-700/50 flex-1 overflow-auto'} ${currentView === 'list' ? 'p-3 sm:p-5' : currentView.startsWith('split-') ? '' : 'p-4 sm:p-6'}`}>
            {renderView()}
        </div>
      </main>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingTask ? 'タスクの編集' : '新規タスクの追加'}>
        <TaskForm
          onSubmit={editingTask ? handleUpdateTask : handleAddTask}
          onCancel={() => { setIsModalOpen(false); setEditingTask(null); }}
          existingTask={editingTask}
          allTasks={tasks}
        />
      </Modal>
      
      <footer className="text-center p-4 text-xs text-slate-400 border-t border-slate-700/30 mt-8 bg-slate-800/20">
        <div className="flex items-center justify-center gap-2">
          <span>Powered by React, Tailwind CSS, and Gemini AI</span>
          <span className="text-slate-600">•</span>
          <span className="text-sky-400">Made with ❤️</span>
        </div>
      </footer>
    </div>
  );
};

export default App;
    