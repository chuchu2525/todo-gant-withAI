import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TaskForm } from '../../../components/TaskForm';
import { Task, TaskStatus, TaskPriority } from '../../../types';

describe('TaskForm', () => {
  const mockOnSubmit = vi.fn();
  const mockOnCancel = vi.fn();
  
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
      dependencies: ['task1']
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('新規タスクフォームが正しく表示される', () => {
    render(
      <TaskForm 
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        allTasks={mockTasks}
      />
    );

    expect(screen.getByLabelText('タスク名')).toBeInTheDocument();
    expect(screen.getByLabelText('説明（任意）')).toBeInTheDocument();
    expect(screen.getByLabelText('ステータス')).toBeInTheDocument();
    expect(screen.getByLabelText('優先度')).toBeInTheDocument();
    expect(screen.getByLabelText('開始日')).toBeInTheDocument();
    expect(screen.getByLabelText('終了日')).toBeInTheDocument();
    expect(screen.getByText('タスクを追加')).toBeInTheDocument();
  });

  test('既存タスクの編集時に値が正しく表示される', () => {
    const existingTask = mockTasks[0];
    
    render(
      <TaskForm 
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        existingTask={existingTask}
        allTasks={mockTasks}
      />
    );

    expect(screen.getByDisplayValue('Task 1')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Description 1')).toBeInTheDocument();
    expect(screen.getByDisplayValue('In Progress')).toBeInTheDocument();
    expect(screen.getByDisplayValue('High')).toBeInTheDocument();
    expect(screen.getByDisplayValue('2024-01-01')).toBeInTheDocument();
    expect(screen.getByDisplayValue('2024-01-31')).toBeInTheDocument();
    expect(screen.getByText('変更を保存')).toBeInTheDocument();
  });

  test('必須フィールドが空の場合、バリデーションエラーが表示される', async () => {
    render(
      <TaskForm 
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        allTasks={mockTasks}
      />
    );

    fireEvent.click(screen.getByText('タスクを追加'));

    await waitFor(() => {
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });
  });

  test('日付バリデーションが正しく動作する', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    
    render(
      <TaskForm 
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        allTasks={mockTasks}
      />
    );

    fireEvent.change(screen.getByLabelText('タスク名'), {
      target: { value: 'Test Task' }
    });
    fireEvent.change(screen.getByLabelText('開始日'), {
      target: { value: '2024-12-31' }
    });
    fireEvent.change(screen.getByLabelText('終了日'), {
      target: { value: '2024-01-01' }
    });

    fireEvent.click(screen.getByText('タスクを追加'));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('開始日は終了日より後に設定できません。');
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    alertSpy.mockRestore();
  });

  test('正常な入力でタスクが送信される', async () => {
    render(
      <TaskForm 
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        allTasks={mockTasks}
      />
    );

    fireEvent.change(screen.getByLabelText('タスク名'), {
      target: { value: 'New Task' }
    });
    fireEvent.change(screen.getByLabelText('説明（任意）'), {
      target: { value: 'New Description' }
    });
    fireEvent.change(screen.getByLabelText('ステータス'), {
      target: { value: TaskStatus.IN_PROGRESS }
    });
    fireEvent.change(screen.getByLabelText('優先度'), {
      target: { value: TaskPriority.HIGH }
    });
    fireEvent.change(screen.getByLabelText('開始日'), {
      target: { value: '2024-01-01' }
    });
    fireEvent.change(screen.getByLabelText('終了日'), {
      target: { value: '2024-01-31' }
    });

    fireEvent.click(screen.getByText('タスクを追加'));

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'New Task',
          description: 'New Description',
          status: TaskStatus.IN_PROGRESS,
          priority: TaskPriority.HIGH,
          startDate: '2024-01-01',
          endDate: '2024-01-31',
          dependencies: []
        })
      );
    });
  });

  test('依存関係の選択が正しく動作する', async () => {
    render(
      <TaskForm 
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        allTasks={mockTasks}
      />
    );

    // 依存関係のチェックボックスをクリック
    const checkbox = screen.getByLabelText('Task 1');
    fireEvent.click(checkbox);

    expect(checkbox).toBeChecked();

    // タスクを追加
    fireEvent.change(screen.getByLabelText('タスク名'), {
      target: { value: 'New Task' }
    });
    fireEvent.click(screen.getByText('タスクを追加'));

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          dependencies: ['task1']
        })
      );
    });
  });

  test('依存関係の検索が正しく動作する', () => {
    render(
      <TaskForm 
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        allTasks={mockTasks}
      />
    );

    const searchInput = screen.getByPlaceholderText('依存関係を検索...');
    fireEvent.change(searchInput, { target: { value: 'Task 1' } });

    expect(screen.getByText('Task 1')).toBeInTheDocument();
    expect(screen.queryByText('Task 2')).not.toBeInTheDocument();
  });

  test('キャンセルボタンが正しく動作する', () => {
    render(
      <TaskForm 
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        allTasks={mockTasks}
      />
    );

    fireEvent.click(screen.getByText('キャンセル'));

    expect(mockOnCancel).toHaveBeenCalled();
  });

  test('編集時に自分自身が依存関係リストに表示されない', () => {
    const existingTask = mockTasks[0];
    
    render(
      <TaskForm 
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        existingTask={existingTask}
        allTasks={mockTasks}
      />
    );

    // Task 1 (自分自身) は表示されない
    expect(screen.queryByText('Task 1')).not.toBeInTheDocument();
    // Task 2 は表示される
    expect(screen.getByText('Task 2')).toBeInTheDocument();
  });
});