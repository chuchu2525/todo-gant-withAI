import { TaskPriority, TaskStatus } from './types';

export const APP_TITLE = "AI Powered TODO App";

export const DEFAULT_TASK_STATUS = TaskStatus.NOT_STARTED;
export const DEFAULT_TASK_PRIORITY = TaskPriority.MEDIUM;

export const PRIORITY_COLORS: Record<TaskPriority, string> = {
  [TaskPriority.HIGH]: 'bg-red-500 hover:bg-red-600',
  [TaskPriority.MEDIUM]: 'bg-yellow-500 hover:bg-yellow-600',
  [TaskPriority.LOW]: 'bg-green-500 hover:bg-green-600',
};

export const STATUS_COLORS: { [key in TaskStatus]: string } = {
  "Not Started": "bg-slate-500",
  "In Progress": "bg-sky-500",
  "Completed": "bg-green-600",
};

export const STATUS_TEXT_JP: { [key in TaskStatus]: string } = {
  "Not Started": "未着手",
  "In Progress": "進行中",
  "Completed": "完了",
};

export const PRIORITY_TEXT_JP: { [key in TaskPriority]: string } = {
  "High": "高",
  "Medium": "中",
  "Low": "低",
};

export const GEMINI_TEXT_MODEL = 'gemini-2.5-flash-preview-04-17';

export const INITIAL_TASKS_YAML = `
- id: "task-1"
  name: "Project Kickoff Meeting"
  description: "Initial meeting to discuss project scope and goals."
  status: "Not Started"
  priority: "High"
  startDate: "${new Date().toISOString().split('T')[0]}"
  endDate: "${new Date(new Date().setDate(new Date().getDate() + 1)).toISOString().split('T')[0]}"
  dependencies: []
- id: "task-2"
  name: "Requirement Gathering"
  description: "Collect all necessary requirements from stakeholders."
  status: "Not Started"
  priority: "High"
  startDate: "${new Date(new Date().setDate(new Date().getDate() + 2)).toISOString().split('T')[0]}"
  endDate: "${new Date(new Date().setDate(new Date().getDate() + 5)).toISOString().split('T')[0]}"
  dependencies: ["task-1"]
- id: "task-3"
  name: "UI/UX Design Phase"
  description: "Design the user interface and user experience mockups."
  status: "Not Started"
  priority: "Medium"
  startDate: "${new Date(new Date().setDate(new Date().getDate() + 6)).toISOString().split('T')[0]}"
  endDate: "${new Date(new Date().setDate(new Date().getDate() + 10)).toISOString().split('T')[0]}"
  dependencies: ["task-2"]
`;
    