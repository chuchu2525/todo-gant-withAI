import React, { useState, useEffect, useCallback } from 'react';
import { Task, ViewMode } from './types';
import { TaskForm } from './components/TaskForm';
import { TaskList } from './components/TaskList';
import { GanttChart } from './components/GanttChart';
import { AiInteraction } from './components/AiInteraction';
import { Modal } from './components/Modal';
import { parseTasksFromYaml, stringifyTasksToYaml } from './services/yamlService';
import { APP_TITLE, INITIAL_TASKS_YAML } from './constants';

const App: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [yamlString, setYamlString] = useState<string>('');
  const [currentView, setCurrentView] = useState<ViewMode>('list');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load initial tasks from YAML constant or localStorage
  useEffect(() => {
    const storedYaml = localStorage.getItem('tasksYaml');
    const initialYaml = storedYaml || INITIAL_TASKS_YAML;
    setYamlString(initialYaml);
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
    if (window.confirm('Are you sure you want to delete this task? This may affect dependent tasks.')) {
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


  const openNewTaskModal = () => {
    setEditingTask(null);
    setIsModalOpen(true);
  };

  const renderView = () => {
    switch (currentView) {
      case 'list':
        return <TaskList tasks={tasks} onEditTask={handleEditTask} onDeleteTask={handleDeleteTask} />;
      case 'gantt':
        return <GanttChart tasks={tasks} onEditTask={handleEditTask} />;
      case 'ai':
        return (
          <AiInteraction
            tasks={tasks}
            currentYaml={yamlString}
            onYamlUpdateByAi={handleYamlUpdateByAi}
            isLoading={isLoading}
            setIsLoading={setIsLoading}
            setError={setError}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-900 to-slate-950 text-slate-100">
      <header className="bg-slate-800/50 backdrop-blur-md shadow-lg p-4 sticky top-0 z-40">
        <div className="container mx-auto flex flex-col sm:flex-row justify-between items-center">
          <h1 className="text-3xl font-bold text-sky-400 tracking-tight">{APP_TITLE}</h1>
          <nav className="mt-2 sm:mt-0 flex space-x-2 sm:space-x-3">
            {(['list', 'gantt', 'ai'] as ViewMode[]).map(view => (
              <button
                key={view}
                onClick={() => setCurrentView(view)}
                className={`px-3 py-2 text-sm font-medium rounded-md transition-colors
                  ${currentView === view 
                    ? 'bg-sky-600 text-white shadow-md' 
                    : 'text-slate-300 hover:bg-slate-700 hover:text-white'}`}
              >
                {view.charAt(0).toUpperCase() + view.slice(1)} View
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-full px-2 md:px-4 pt-4 md:pt-6 flex-grow">
        {error && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-700 text-red-300 rounded-md" role="alert">
            <strong className="font-bold">Error:</strong>
            <span className="block sm:inline ml-2">{error}</span>
            <button onClick={() => setError(null)} className="float-right font-bold text-lg">&times;</button>
          </div>
        )}
         {isLoading && currentView !== 'ai' && ( // Show general loading indicator if not in AI view (AI view has its own)
          <div className="fixed inset-0 bg-slate-900 bg-opacity-50 flex items-center justify-center z-50">
            <div className="text-white text-xl">Loading...</div>
          </div>
        )}

        {currentView === 'list' && (
          <div className="mb-6 flex justify-end">
            <button
              onClick={openNewTaskModal}
              className="px-5 py-2.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-green-500 transition-transform hover:scale-105"
            >
              ✨ Add New Task
            </button>
          </div>
        )}
        
        <div className="bg-slate-800/30 p-4 sm:p-6 rounded-xl shadow-2xl min-h-[70vh]">
        {/* h-[80vh] overflow-y-auto */}
            {renderView()}
        </div>
      </main>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingTask ? 'Edit Task' : 'Add New Task'}>
        <TaskForm
          onSubmit={editingTask ? handleUpdateTask : handleAddTask}
          onCancel={() => { setIsModalOpen(false); setEditingTask(null); }}
          existingTask={editingTask}
          allTasks={tasks}
        />
      </Modal>
      
      <footer className="text-center p-1 text-xs text-slate-500 border-t border-slate-700/50 mt-2">
        Powered by React, Tailwind CSS, and Gemini AI.
      </footer>
    </div>
  );
};

export default App;
    