import { render, screen, fireEvent } from '@testing-library/react';
import { TaskItem } from '../../../components/TaskItem';
import { Task, TaskStatus, TaskPriority } from '../../../types';

// calendarServiceをモック
vi.mock('../../../services/calendarService', () => ({
  exportTaskToGoogleCalendar: vi.fn()
}));

describe('TaskItem', () => {
  const mockOnEdit = vi.fn();
  const mockOnDelete = vi.fn();

  const mockTask: Task = {
    id: 'task1',
    name: 'テストタスク',
    description: 'テストの説明',
    status: TaskStatus.IN_PROGRESS,
    priority: TaskPriority.HIGH,
    startDate: '2024-01-01',
    endDate: '2024-01-31',
    dependencies: ['task2']
  };

  const mockAllTasks: Task[] = [
    mockTask,
    {
      id: 'task2',
      name: '依存タスク',
      description: '',
      status: TaskStatus.COMPLETED,
      priority: TaskPriority.MEDIUM,
      startDate: '2024-01-01',
      endDate: '2024-01-15',
      dependencies: []
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('タスク情報が正しく表示される', () => {
    render(
      <TaskItem
        task={mockTask}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        allTasks={mockAllTasks}
      />
    );

    expect(screen.getByText('テストタスク')).toBeInTheDocument();
    expect(screen.getByText('テストの説明')).toBeInTheDocument();
    expect(screen.getByText('高')).toBeInTheDocument();
    expect(screen.getByText('進行中')).toBeInTheDocument();
  });

  test('日付が正しいフォーマットで表示される', () => {
    render(
      <TaskItem
        task={mockTask}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        allTasks={mockAllTasks}
      />
    );

    expect(screen.getByText(/2024年1月1日/)).toBeInTheDocument();
    expect(screen.getByText(/2024年1月31日/)).toBeInTheDocument();
  });

  test('依存関係が正しく表示される', () => {
    render(
      <TaskItem
        task={mockTask}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        allTasks={mockAllTasks}
      />
    );

    expect(screen.getByText('依存タスク')).toBeInTheDocument();
  });

  test('依存関係がない場合は「None」が表示される', () => {
    const taskWithoutDeps = { ...mockTask, dependencies: [] };
    
    render(
      <TaskItem
        task={taskWithoutDeps}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        allTasks={mockAllTasks}
      />
    );

    expect(screen.getByText('None')).toBeInTheDocument();
  });

  test('カレンダーエクスポートボタンが表示される', () => {
    render(
      <TaskItem
        task={mockTask}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        allTasks={mockAllTasks}
      />
    );

    expect(screen.getByText('📅 カレンダー')).toBeInTheDocument();
  });

  test('カレンダーエクスポートボタンをクリックすると正しく動作する', async () => {
    const { exportTaskToGoogleCalendar } = await import('../../../services/calendarService');
    
    render(
      <TaskItem
        task={mockTask}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        allTasks={mockAllTasks}
      />
    );

    const calendarButton = screen.getByText('📅 カレンダー');
    fireEvent.click(calendarButton);

    expect(exportTaskToGoogleCalendar).toHaveBeenCalledWith(mockTask);
  });

  test('編集ボタンをクリックすると正しく動作する', () => {
    render(
      <TaskItem
        task={mockTask}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        allTasks={mockAllTasks}
      />
    );

    const editButton = screen.getByText('編集');
    fireEvent.click(editButton);

    expect(mockOnEdit).toHaveBeenCalledWith(mockTask);
  });

  test('削除ボタンをクリックすると正しく動作する', () => {
    render(
      <TaskItem
        task={mockTask}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        allTasks={mockAllTasks}
      />
    );

    const deleteButton = screen.getByText('削除');
    fireEvent.click(deleteButton);

    expect(mockOnDelete).toHaveBeenCalledWith('task1');
  });

  test('説明がない場合は表示されない', () => {
    const taskWithoutDescription = { ...mockTask, description: undefined };
    
    render(
      <TaskItem
        task={taskWithoutDescription}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        allTasks={mockAllTasks}
      />
    );

    expect(screen.queryByText('テストの説明')).not.toBeInTheDocument();
  });

  test('カレンダーボタンにツールチップが設定されている', () => {
    render(
      <TaskItem
        task={mockTask}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        allTasks={mockAllTasks}
      />
    );

    const calendarButton = screen.getByText('📅 カレンダー');
    expect(calendarButton).toHaveAttribute('title', 'Google Calendarにエクスポート');
  });
});