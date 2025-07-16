
export enum TaskStatus {
  NOT_STARTED = 'Not Started',
  IN_PROGRESS = 'In Progress',
  COMPLETED = 'Completed',
}

export enum TaskPriority {
  HIGH = 'High',
  MEDIUM = 'Medium',
  LOW = 'Low',
}

export interface Task {
  id: string;
  name: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  dependencies: string[]; // Array of task IDs this task depends on
}

export type ViewMode = 'list' | 'gantt' | 'ai' | 'split-list-gantt' | 'split-list-ai' | 'split-gantt-ai';

export interface SplitViewConfig {
  leftPane: 'list' | 'gantt' | 'ai';
  rightPane: 'list' | 'gantt' | 'ai';
  splitDirection: 'horizontal' | 'vertical';
  leftSize: number; // Percentage (0-100)
  rightSize: number; // Percentage (0-100)
}

// For Gemini Search Grounding (if used)
export interface WebGroundingChunk {
  web: {
    uri: string;
    title: string;
  };
}
export interface GroundingChunk {
  web?: { uri: string; title: string; };
  retrievedContext?: { uri: string; title: string; };
}
    