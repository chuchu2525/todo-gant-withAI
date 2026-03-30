import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, test, expect, beforeEach } from 'vitest';
import { TaskList } from '../../../src/components/TaskList';
import { Task, TaskStatus, TaskPriority } from '../../../src/types';

// TaskItemをモック
vi.mock('../../../src/components/TaskItem', () => ({
  TaskItem: ({ task, onEdit, onDelete }: { task: Task; onEdit: (task: Task) => void; onDelete: (taskId: string) => void }) => (
    <div data-testid={`task-item-${task.id}`}>
      <span>{task.name}</span>
      <button onClick={() => onEdit(task)}>Edit</button>
      <button onClick={() => onDelete(task.id)}>Delete</button>
    </div>
  )
}));

// calendarServiceをモック
vi.mock('@/services/calendarService', () => ({
  exportMultipleTasksToGoogleCalendar: vi.fn()
}));

describe('TaskList', () => {
  const mockOnEditTask = vi.fn();
  const mockOnDeleteTask = vi.fn();

  const mockTasks: Task[] = [
    {
      id: 'task1',
      name: 'Task 1',
      description: 'Description 1',
      status: TaskStatus.IN_PROGRESS,
      priority: TaskPriority.HIGH,
      startDate: '2024-01-01',
      endDate: '2024-01-31',
      dependencies: []
    },
    {
      id: 'task2',
      name: 'Task 2',
      description: 'Description 2',
      status: TaskStatus.COMPLETED,
      priority: TaskPriority.LOW,
      startDate: '2024-01-15',
      endDate: '2024-01-30',
      dependencies: []
    },
    {
      id: 'task3',
      name: 'Task 3',
      description: 'Description 3',
      status: TaskStatus.NOT_STARTED,
      priority: TaskPriority.MEDIUM,
      startDate: '2024-01-10',
      endDate: '2024-02-15',
      dependencies: []
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('タスクが存在しない場合、空のメッセージを表示する', () => {
    render(
      <TaskList
        tasks={[]}
        onEditTask={mockOnEditTask}
        onDeleteTask={mockOnDeleteTask}
      />
    );

    expect(screen.getByText('まだタスクがありません。最初のタスクを追加してください！')).toBeInTheDocument();
  });

  test('タスクリストが正しく表示される', () => {
    render(
      <TaskList
        tasks={mockTasks}
        onEditTask={mockOnEditTask}
        onDeleteTask={mockOnDeleteTask}
      />
    );

    expect(screen.getByTestId('task-item-task1')).toBeInTheDocument();
    expect(screen.getByTestId('task-item-task2')).toBeInTheDocument();
    expect(screen.getByTestId('task-item-task3')).toBeInTheDocument();
  });

  test('ソートボタンが正しく表示される', () => {
    render(
      <TaskList
        tasks={mockTasks}
        onEditTask={mockOnEditTask}
        onDeleteTask={mockOnDeleteTask}
      />
    );

    // ソートボタンのテキスト部分を検索（テキストとアイコンが分離されているため）
    const sortButtons = screen.getAllByRole('button').filter(button =>
      button.textContent?.includes('開始日') ||
      button.textContent?.includes('終了日') ||
      button.textContent?.includes('優先度') ||
      button.textContent?.includes('ステータス')
    );

    expect(sortButtons).toHaveLength(4);
  });

  test('開始日でソートが正しく動作する', () => {
    render(
      <TaskList
        tasks={mockTasks}
        onEditTask={mockOnEditTask}
        onDeleteTask={mockOnDeleteTask}
      />
    );

    // 開始日ボタンを検索
    const startDateButton = screen.getByTestId('sort-button-startDate');
    expect(startDateButton).toBeInTheDocument();

    // デフォルトで開始日昇順でソートされている
    const taskItems = screen.getAllByTestId(/task-item-/);
    expect(taskItems[0]).toHaveAttribute('data-testid', 'task-item-task1'); // 2024-01-01
    expect(taskItems[1]).toHaveAttribute('data-testid', 'task-item-task3'); // 2024-01-10
    expect(taskItems[2]).toHaveAttribute('data-testid', 'task-item-task2'); // 2024-01-15
  });

  test('ソートボタンをクリックして降順に変更できる', () => {
    render(
      <TaskList
        tasks={mockTasks}
        onEditTask={mockOnEditTask}
        onDeleteTask={mockOnDeleteTask}
      />
    );

    const startDateButton = screen.getByTestId('sort-button-startDate');
    fireEvent.click(startDateButton);

    expect(screen.getByTestId('sort-button-startDate')).toBeInTheDocument();
  });

  test('優先度でソートが正しく動作する', () => {
    render(
      <TaskList
        tasks={mockTasks}
        onEditTask={mockOnEditTask}
        onDeleteTask={mockOnDeleteTask}
      />
    );

    const priorityButton = screen.getAllByRole('button').find(button =>
      button.textContent?.includes('優先度')
    );
    expect(priorityButton).toBeInTheDocument();
    if (priorityButton) {
      fireEvent.click(priorityButton);
    }

    // ソートボタンのみを取得（data-testid属性があるボタン）
    const prioritySortButton = screen.getByTestId('sort-button-priority');
    expect(prioritySortButton).toBeInTheDocument();

    // Low > Medium > High の順序でソートされる（昇順）
    const taskItems = screen.getAllByTestId(/task-item-/);
    expect(taskItems[0]).toHaveAttribute('data-testid', 'task-item-task2'); // LOW
    expect(taskItems[1]).toHaveAttribute('data-testid', 'task-item-task3'); // MEDIUM
    expect(taskItems[2]).toHaveAttribute('data-testid', 'task-item-task1'); // HIGH
  });

  test('ステータスでソートが正しく動作する', () => {
    render(
      <TaskList
        tasks={mockTasks}
        onEditTask={mockOnEditTask}
        onDeleteTask={mockOnDeleteTask}
      />
    );

    const statusButton = screen.getAllByRole('button').find(button =>
      button.textContent?.includes('ステータス')
    );
    expect(statusButton).toBeInTheDocument();
    if (statusButton) {
      fireEvent.click(statusButton);
    }

    // ソートボタンのみを取得（data-testid属性があるボタン）
    const statusSortButton = screen.getByTestId('sort-button-status');
    expect(statusSortButton).toBeInTheDocument();

    // Completed > Not Started > In Progress の順序でソートされる（昇順）
    const taskItems = screen.getAllByTestId(/task-item-/);
    expect(taskItems[0]).toHaveAttribute('data-testid', 'task-item-task2'); // COMPLETED
    expect(taskItems[1]).toHaveAttribute('data-testid', 'task-item-task3'); // NOT_STARTED
    expect(taskItems[2]).toHaveAttribute('data-testid', 'task-item-task1'); // IN_PROGRESS
  });

  test('TaskItemのeditボタンが正しく動作する', () => {
    render(
      <TaskList
        tasks={mockTasks}
        onEditTask={mockOnEditTask}
        onDeleteTask={mockOnDeleteTask}
      />
    );

    const editButtons = screen.getAllByText('Edit');
    fireEvent.click(editButtons[0]);

    expect(mockOnEditTask).toHaveBeenCalledWith(mockTasks[0]);
  });

  test('TaskItemのdeleteボタンが正しく動作する', () => {
    render(
      <TaskList
        tasks={mockTasks}
        onEditTask={mockOnEditTask}
        onDeleteTask={mockOnDeleteTask}
      />
    );

    const deleteButtons = screen.getAllByText('Delete');
    fireEvent.click(deleteButtons[0]);

    expect(mockOnDeleteTask).toHaveBeenCalledWith('task1');
  });

  test('アクティブなソートボタンに正しいスタイルが適用される', () => {
    render(
      <TaskList
        tasks={mockTasks}
        onEditTask={mockOnEditTask}
        onDeleteTask={mockOnDeleteTask}
      />
    );

    const activeButton = screen.getByTestId('sort-button-startDate');
    expect(activeButton).toHaveClass('bg-sky-600', 'text-white');

    const inactiveButton = screen.getByTestId('sort-button-priority');
    expect(inactiveButton).toHaveClass('bg-slate-700', 'text-slate-300');
  });

  test('降順ソートボタンに正しいスタイルが適用される', () => {
    render(
      <TaskList
        tasks={mockTasks}
        onEditTask={mockOnEditTask}
        onDeleteTask={mockOnDeleteTask}
      />
    );

    const button = screen.getByTestId('sort-button-startDate');
    fireEvent.click(button);

    const descendingButton = screen.getByTestId('sort-button-startDate');
    expect(descendingButton).toHaveClass('bg-pink-600', 'text-white');
  });

  test('全タスクをカレンダーに追加ボタンが表示される', () => {
    render(
      <TaskList
        tasks={mockTasks}
        onEditTask={mockOnEditTask}
        onDeleteTask={mockOnDeleteTask}
      />
    );

    expect(screen.getByText('全タスクをカレンダーに追加')).toBeInTheDocument();
  });

  test('タスクがない場合は全タスクエクスポートボタンが表示されない', () => {
    render(
      <TaskList
        tasks={[]}
        onEditTask={mockOnEditTask}
        onDeleteTask={mockOnDeleteTask}
      />
    );

    expect(screen.queryByText('全タスクをカレンダーに追加')).not.toBeInTheDocument();
  });

  test('全タスクをカレンダーに追加ボタンをクリックすると正しく動作する', async () => {
    const { exportMultipleTasksToGoogleCalendar } = await import('@/services/calendarService');

    render(
      <TaskList
        tasks={mockTasks}
        onEditTask={mockOnEditTask}
        onDeleteTask={mockOnDeleteTask}
      />
    );

    const exportButton = screen.getByText('全タスクをカレンダーに追加');
    fireEvent.click(exportButton);

    expect(exportMultipleTasksToGoogleCalendar).toHaveBeenCalledWith(mockTasks);
  });
});
