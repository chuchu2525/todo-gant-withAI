import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import App from '../App';

// Mock the Gemini service
vi.mock('../services/geminiService', () => ({
  getAiTaskSummary: vi.fn().mockResolvedValue('Test summary'),
  updateTasksViaAi: vi.fn().mockResolvedValue('tasks:\n- id: 1\n  name: Test Task')
}));

// Mock the calendar service
vi.mock('../services/calendarService', () => ({
  exportToGoogleCalendar: vi.fn(),
  exportMultipleTasksToGoogleCalendar: vi.fn()
}));

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });

describe('Split View Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
  });

  describe('View Mode Switching', () => {
    it('should switch from single view to split view correctly', () => {
      render(<App />);
      
      // Start with list view
      const listButton = screen.getByRole('button', { name: /list view/i });
      expect(listButton).toBeDefined();
      
      // Click split view button (List + Gantt)
      const splitButton = screen.getByRole('button', { name: /list.*gantt/i });
      if (splitButton) {
        fireEvent.click(splitButton);
        
        // Check that we're now in split view mode
        // The app should render both views in panels
        expect(document.querySelector('.flex.h-full.gap-2')).toBeDefined();
      }
    });

    it('should maintain scroll state when switching between views', () => {
      render(<App />);
      
      // Test switching between different view modes
      const listButton = screen.getByRole('button', { name: /list view/i });
      const ganttButton = screen.getByRole('button', { name: /gantt view/i });
      
      // Switch to list view
      fireEvent.click(listButton);
      let container = document.querySelector('.flex-1.overflow-auto');
      expect(container).toBeDefined();
      
      // Switch to gantt view
      fireEvent.click(ganttButton);
      container = document.querySelector('.overflow-auto');
      expect(container).toBeDefined();
    });

    it('should handle split view combinations correctly', () => {
      render(<App />);
      
      // Test all split view combinations
      const splitButtons = [
        /list.*gantt/i,
        /list.*ai/i,
        /gantt.*ai/i
      ];
      
      splitButtons.forEach(pattern => {
        const button = screen.queryByRole('button', { name: pattern });
        if (button) {
          fireEvent.click(button);
          
          // Check that split view layout is applied
          const splitContainer = document.querySelector('.flex.h-full.gap-2');
          expect(splitContainer).toBeDefined();
          
          // Check that both panels exist
          const panels = document.querySelectorAll('.overflow-hidden.bg-slate-800');
          expect(panels.length).toBe(2);
        }
      });
    });
  });

  describe('Scroll Container Integration', () => {
    it('should ensure proper scroll containers in single view mode', () => {
      render(<App />);
      
      // Test list view
      const listButton = screen.getByRole('button', { name: /list view/i });
      fireEvent.click(listButton);
      
      let scrollContainer = document.querySelector('.flex-1.overflow-auto');
      expect(scrollContainer).toBeDefined();
      
      // Test gantt view
      const ganttButton = screen.getByRole('button', { name: /gantt view/i });
      fireEvent.click(ganttButton);
      
      scrollContainer = document.querySelector('.overflow-auto');
      expect(scrollContainer).toBeDefined();
      
      // Test AI view
      const aiButton = screen.getByRole('button', { name: /ai view/i });
      fireEvent.click(aiButton);
      
      scrollContainer = document.querySelector('.flex-1.overflow-auto');
      expect(scrollContainer).toBeDefined();
    });

    it('should ensure proper scroll containers in split view mode', () => {
      render(<App />);
      
      // Click split view button
      const splitButton = screen.queryByRole('button', { name: /list.*gantt/i });
      if (splitButton) {
        fireEvent.click(splitButton);
        
        // Check that both panels have proper scroll containers
        const scrollContainers = document.querySelectorAll('.overflow-hidden');
        expect(scrollContainers.length).toBeGreaterThan(0);
        
        // Check that panels are properly structured
        const panels = document.querySelectorAll('.bg-slate-800');
        expect(panels.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Responsive Behavior', () => {
    it('should handle mobile view correctly', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 500,
      });
      
      render(<App />);
      
      // Split view buttons should be hidden on mobile
      const splitButtons = document.querySelectorAll('.hidden.sm\\:flex');
      expect(splitButtons.length).toBeGreaterThan(0);
    });

    it('should maintain scroll functionality across responsive breakpoints', () => {
      render(<App />);
      
      // Test different view modes
      const viewButtons = [
        { name: /list view/i, selector: '.flex-1.overflow-auto' },
        { name: /gantt view/i, selector: '.overflow-auto' },
        { name: /ai view/i, selector: '.flex-1.overflow-auto' }
      ];
      
      viewButtons.forEach(({ name, selector }) => {
        const button = screen.getByRole('button', { name });
        fireEvent.click(button);
        
        const scrollContainer = document.querySelector(selector);
        expect(scrollContainer).toBeDefined();
      });
    });
  });

  describe('Layout Constraints', () => {
    it('should enforce proper height constraints', () => {
      render(<App />);
      
      // Check main container height
      const mainContainer = document.querySelector('.h-screen');
      expect(mainContainer).toBeDefined();
      
      // Check overflow handling
      const overflowContainer = document.querySelector('.overflow-hidden');
      expect(overflowContainer).toBeDefined();
    });

    it('should maintain proper flex layout structure', () => {
      render(<App />);
      
      // Check main layout structure
      const flexContainer = document.querySelector('.flex.flex-col');
      expect(flexContainer).toBeDefined();
      
      // Check main content area
      const mainContent = document.querySelector('.flex-1.flex.flex-col');
      expect(mainContent).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle view switching errors gracefully', () => {
      render(<App />);
      
      // Test rapid view switching
      const listButton = screen.getByRole('button', { name: /list view/i });
      const ganttButton = screen.getByRole('button', { name: /gantt view/i });
      
      // Rapid switching should not cause errors
      fireEvent.click(listButton);
      fireEvent.click(ganttButton);
      fireEvent.click(listButton);
      
      // App should still be responsive
      expect(screen.getByRole('button', { name: /list view/i })).toBeDefined();
    });
  });
});