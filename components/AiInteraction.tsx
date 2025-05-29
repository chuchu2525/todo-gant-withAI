
import React, { useState, useEffect, useCallback } from 'react';
import { Task } from '../types';
import { getAiTaskSummary, updateTasksViaAi } from '../services/geminiService';

interface AiInteractionProps {
  tasks: Task[];
  currentYaml: string;
  onYamlUpdateByAi: (newYaml: string) => Promise<void>;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const AiInteraction: React.FC<AiInteractionProps> = ({
  tasks,
  currentYaml,
  onYamlUpdateByAi,
  isLoading,
  setIsLoading,
  setError
}) => {
  const [aiSummary, setAiSummary] = useState<string>('');
  const [userPrompt, setUserPrompt] = useState<string>('');

  const fetchSummary = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const summary = await getAiTaskSummary(tasks);
      setAiSummary(summary);
    } catch (err) {
      setError((err as Error).message);
      setAiSummary('');
    } finally {
      setIsLoading(false);
    }
  }, [tasks, setIsLoading, setError]);

  // Fetch initial summary on mount if tasks are present
  useEffect(() => {
    if (tasks.length > 0) {
      // fetchSummary(); // Optionally fetch summary on load. Let's make it user-triggered.
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount

  const handlePromptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userPrompt.trim()) {
      setError("Please enter a command for the AI.");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const newYaml = await updateTasksViaAi(currentYaml, userPrompt);
      await onYamlUpdateByAi(newYaml);
      setUserPrompt(''); // Clear prompt on success
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 p-1">
      <div>
        <h3 className="text-xl font-semibold text-sky-400 mb-2">AI Task Summary</h3>
        <button
          onClick={fetchSummary}
          disabled={isLoading}
          className="mb-2 px-4 py-2 text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-sky-500 disabled:opacity-50"
        >
          {isLoading && aiSummary === '' ? 'Generating Summary...' : 'Get AI Summary'}
        </button>
        {aiSummary && (
          <div className="bg-slate-800 p-4 rounded-md shadow">
            <pre className="whitespace-pre-wrap text-sm text-slate-300">{aiSummary}</pre>
          </div>
        )}
      </div>

      <div>
        <h3 className="text-xl font-semibold text-sky-400 mb-2">Manage Tasks with AI (via YAML)</h3>
        <form onSubmit={handlePromptSubmit} className="space-y-3">
          <div>
            <label htmlFor="ai-prompt" className="block text-sm font-medium text-slate-300">
              Enter command (e.g., "Add a new task 'Deploy App' due next Friday with high priority")
            </label>
            <textarea
              id="ai-prompt"
              value={userPrompt}
              onChange={(e) => setUserPrompt(e.target.value)}
              rows={3}
              className="mt-1 block w-full bg-slate-700 border-slate-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm text-slate-100 disabled:opacity-60"
              placeholder="Describe changes to tasks..."
              disabled={isLoading}
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-green-500 disabled:opacity-50"
          >
            {isLoading ? 'Processing...' : 'Update Tasks with AI'}
          </button>
        </form>
      </div>

      <div>
        <h3 className="text-xl font-semibold text-sky-400 mb-2">Current Tasks (YAML)</h3>
        <textarea
          value={currentYaml}
          readOnly
          rows={15}
          className="w-full bg-slate-950 text-slate-300 p-3 text-xs rounded-md border border-slate-700 focus:outline-none focus:ring-1 focus:ring-sky-500"
          aria-label="Current tasks in YAML format"
        />
      </div>
    </div>
  );
};
    