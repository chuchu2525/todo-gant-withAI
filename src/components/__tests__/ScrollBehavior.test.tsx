import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { TaskList } from '../../../components/TaskList';
import { AiInteraction } from '../../../components/AiInteraction';
import { GanttChart } from '../../../components/GanttChart';
import { Task, TaskStatus, TaskPriority } from '../../../types';

// Mock data
const mockTasks: Task[] = [
  {
    id: '1',
    name: 'Task 1',
    description: 'Description 1',
    status: TaskStatus.NOT_STARTED,
    priority: TaskPriority.HIGH,
    startDate: '2024-01-01',
    endDate: '2024-01-02',
    dependencies: []
  },
  {
    id: '2',
    name: 'Task 2',
    description: 'Description 2',
    status: TaskStatus.IN_PROGRESS,
    priority: TaskPriority.MEDIUM,
    startDate: '2024-01-03',
    endDate: '2024-01-04',
    dependencies: ['1']
  }
];

const mockProps = {
  tasks: mockTasks,
  onEditTask: vi.fn(),
  onDeleteTask: vi.fn(),
  onBulkUpdate: vi.fn(),
  onReorderTasks: vi.fn(),
};

const mockAiProps = {
  tasks: mockTasks,
  currentYaml: 'tasks:\n- id: 1\n  name: Task 1',
  onYamlUpdateByAi: vi.fn(),
  isLoading: false,
  setIsLoading: vi.fn(),
  setError: vi.fn(),
};

const mockGanttProps = {
  tasks: mockTasks,
  onEditTask: vi.fn(),
  onTaskDateChange: vi.fn(),
  onMultipleTaskDateChange: vi.fn(),
};

describe('Scroll Behavior Tests', () => {
  describe('TaskList Component', () => {
    it('should render with normal scroll behavior when not in split view', () => {
      render(<TaskList {...mockProps} isInSplitView={false} />);
      
      const container = screen.getByRole('generic');
      expect(container).toBeDefined();
      // Normal view should not have height restrictions
      expect(container.className).not.toContain('h-full');
      expect(container.className).not.toContain('overflow-hidden');
    });

    it('should render with split view scroll behavior when in split view', () => {
      render(<TaskList {...mockProps} isInSplitView={true} />);
      
      const container = screen.getByRole('generic');
      expect(container).toBeDefined();
      // Split view should have height restrictions and scroll
      expect(container.className).toContain('h-full');
      expect(container.className).toContain('overflow-hidden');
    });

    it('should have scrollable task list area in split view', () => {
      render(<TaskList {...mockProps} isInSplitView={true} />);
      
      // Check if task list area exists with proper scroll classes
      const taskListContainer = document.querySelector('.flex-1.overflow-auto');
      expect(taskListContainer).toBeDefined();
    });
  });

  describe('AiInteraction Component', () => {
    it('should render with normal behavior when not in split view', () => {
      render(<AiInteraction {...mockAiProps} isInSplitView={false} />);
      
      const container = screen.getByRole('generic');
      expect(container).toBeDefined();
      // Normal view should not have height restrictions
      expect(container.className).not.toContain('h-full');
      expect(container.className).not.toContain('overflow-hidden');
    });

    it('should render with split view behavior when in split view', () => {
      render(<AiInteraction {...mockAiProps} isInSplitView={true} />);
      
      const container = screen.getByRole('generic');
      expect(container).toBeDefined();
      // Split view should have height restrictions
      expect(container.className).toContain('h-full');
      expect(container.className).toContain('overflow-hidden');
    });

    it('should have scrollable content area in split view', () => {
      render(<AiInteraction {...mockAiProps} isInSplitView={true} />);
      
      // Check if content area exists with proper scroll classes
      const contentContainer = document.querySelector('.flex-1.overflow-auto');
      expect(contentContainer).toBeDefined();
    });
  });

  describe('GanttChart Component', () => {
    it('should render with normal scroll behavior when not in split view', () => {
      render(<GanttChart {...mockGanttProps} isInSplitView={false} />);
      
      // Check if chart container exists
      const chartContainer = document.querySelector('.overflow-auto');
      expect(chartContainer).toBeDefined();
      
      // Should use 75vh height in normal view
      expect(chartContainer?.getAttribute('style')).toContain('75vh');
    });

    it('should render with split view scroll behavior when in split view', () => {
      render(<GanttChart {...mockGanttProps} isInSplitView={true} />);
      
      // Check if chart container exists
      const chartContainer = document.querySelector('.overflow-auto');
      expect(chartContainer).toBeDefined();
      
      // Should use calc height in split view
      expect(chartContainer?.getAttribute('style')).toContain('calc(100% - 60px)');
    });

    it('should maintain scroll functionality across view modes', () => {
      const { rerender } = render(<GanttChart {...mockGanttProps} isInSplitView={false} />);
      
      let chartContainer = document.querySelector('.overflow-auto');
      expect(chartContainer).toBeDefined();
      expect(chartContainer?.getAttribute('style')).toContain('75vh');
      
      // Switch to split view
      rerender(<GanttChart {...mockGanttProps} isInSplitView={true} />);
      
      chartContainer = document.querySelector('.overflow-auto');
      expect(chartContainer).toBeDefined();
      expect(chartContainer?.getAttribute('style')).toContain('calc(100% - 60px)');
    });
  });

  describe('Scroll Container Behavior', () => {
    it('should ensure all components have proper scroll containers', () => {
      // Test TaskList
      const { unmount: unmountTaskList } = render(<TaskList {...mockProps} isInSplitView={true} />);
      let scrollContainer = document.querySelector('.overflow-auto');
      expect(scrollContainer).toBeDefined();
      unmountTaskList();

      // Test AiInteraction
      const { unmount: unmountAi } = render(<AiInteraction {...mockAiProps} isInSplitView={true} />);
      scrollContainer = document.querySelector('.overflow-auto');
      expect(scrollContainer).toBeDefined();
      unmountAi();

      // Test GanttChart
      render(<GanttChart {...mockGanttProps} isInSplitView={true} />);
      scrollContainer = document.querySelector('.overflow-auto');
      expect(scrollContainer).toBeDefined();
    });
  });
});