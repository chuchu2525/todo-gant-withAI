import { vi } from 'vitest';
import { 
  exportTaskToGoogleCalendar,
  exportMultipleTasksToGoogleCalendar,
  getGoogleCalendarUrlForTask 
} from '../../../services/calendarService';
import { Task, TaskStatus, TaskPriority } from '../../../types';

describe('calendarService', () => {
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

  const mockTasks: Task[] = [
    mockTask,
    {
      id: 'task2',
      name: 'タスク2',
      description: '',
      status: TaskStatus.NOT_STARTED,
      priority: TaskPriority.MEDIUM,
      startDate: '2024-01-15',
      endDate: '2024-01-15',
      dependencies: []
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    // window.openをモック
    global.window.open = vi.fn();
    // alertをモック
    global.alert = vi.fn();
    // confirmをモック
    global.confirm = vi.fn(() => true);
  });

  describe('getGoogleCalendarUrlForTask', () => {
    it('正しいGoogle Calendar URLを生成する', () => {
      const url = getGoogleCalendarUrlForTask(mockTask);
      
      expect(url).toContain('https://calendar.google.com/calendar/render');
      expect(url).toContain('action=TEMPLATE');
      expect(url).toContain('text='); // タイトルパラメータが存在
      expect(url).toContain('ctz=Asia');
      
      // デコードしてタイトルを確認
      const decodedUrl = decodeURIComponent(url);
      expect(decodedUrl).toContain('📋+テストタスク');
    });

    it('タスクの説明が正しく含まれる', () => {
      const url = getGoogleCalendarUrlForTask(mockTask);
      
      // URLデコードして内容を確認
      const decodedUrl = decodeURIComponent(url);
      expect(decodedUrl).toContain('説明:+テストの説明');
      expect(decodedUrl).toContain('優先度:+High');
      expect(decodedUrl).toContain('ステータス:+In+Progress');
      expect(decodedUrl).toContain('依存関係:+task2');
    });

    it('同じ日のタスクは時間指定イベントとして生成される', () => {
      const sameDayTask: Task = {
        ...mockTask,
        startDate: '2024-01-15',
        endDate: '2024-01-15'
      };
      
      const url = getGoogleCalendarUrlForTask(sameDayTask);
      
      // 同じ日の場合は時間付きフォーマット（YYYYMMDDTHHMMSS）
      expect(url).toContain('20240115T');
    });

    it('異なる日のタスクは期間イベントとして生成される', () => {
      const multiDayTask: Task = {
        ...mockTask,
        startDate: '2024-01-01',
        endDate: '2024-01-31'
      };
      
      const url = getGoogleCalendarUrlForTask(multiDayTask);
      
      // 異なる日の場合は日付のみフォーマット（YYYYMMDD）
      expect(url).toContain('dates=20240101%2F20240201'); // 終了日+1日（URLエンコード）
    });
  });

  describe('exportTaskToGoogleCalendar', () => {
    it('window.openが正しいURLで呼ばれる', () => {
      exportTaskToGoogleCalendar(mockTask);
      
      expect(window.open).toHaveBeenCalledTimes(1);
      const calledUrl = (window.open as any).mock.calls[0][0];
      expect(calledUrl).toContain('https://calendar.google.com/calendar/render');
      expect((window.open as any).mock.calls[0][1]).toBe('_blank');
    });
  });

  describe('exportMultipleTasksToGoogleCalendar', () => {
    it('複数のタスクを順次エクスポートする', async () => {
      vi.useFakeTimers();
      
      exportMultipleTasksToGoogleCalendar(mockTasks);
      
      // 全てのタイマーを実行
      vi.runAllTimers();
      expect(window.open).toHaveBeenCalledTimes(2);
      
      // 成功メッセージが表示される
      expect(alert).toHaveBeenCalledWith(
        expect.stringContaining('2個のタスクをGoogle Calendarにエクスポートしました')
      );
      
      vi.useRealTimers();
    });

    it('タスクが空の場合はエラーメッセージを表示する', () => {
      exportMultipleTasksToGoogleCalendar([]);
      
      expect(alert).toHaveBeenCalledWith('エクスポートするタスクがありません。');
      expect(window.open).not.toHaveBeenCalled();
    });

    it('10個を超えるタスクの場合は確認ダイアログを表示する', () => {
      const manyTasks = Array(15).fill(null).map((_, index) => ({
        ...mockTask,
        id: `task${index}`,
        name: `タスク${index}`
      }));
      
      exportMultipleTasksToGoogleCalendar(manyTasks);
      
      expect(confirm).toHaveBeenCalledWith(
        expect.stringContaining('15個のタスクをエクスポートしようとしています')
      );
    });

    it('確認ダイアログでキャンセルした場合はエクスポートしない', () => {
      (global.confirm as any).mockReturnValue(false);
      
      const manyTasks = Array(15).fill(null).map((_, index) => ({
        ...mockTask,
        id: `task${index}`,
        name: `タスク${index}`
      }));
      
      exportMultipleTasksToGoogleCalendar(manyTasks);
      
      expect(window.open).not.toHaveBeenCalled();
    });
  });

  describe('URL生成の詳細テスト', () => {
    it('特殊文字を含むタスク名が正しくエンコードされる', () => {
      const specialTask: Task = {
        ...mockTask,
        name: 'テスト & 開発 <重要>',
        description: '改行\nあり'
      };
      
      const url = getGoogleCalendarUrlForTask(specialTask);
      
      // URLが正しく生成されることを確認
      expect(url).toContain('https://calendar.google.com/calendar/render');
      expect(url).toContain('action=TEMPLATE');
    });

    it('依存関係がないタスクでも正しく処理される', () => {
      const noDepsTask: Task = {
        ...mockTask,
        dependencies: []
      };
      
      const url = getGoogleCalendarUrlForTask(noDepsTask);
      const decodedUrl = decodeURIComponent(url);
      
      expect(decodedUrl).not.toContain('依存関係:');
    });

    it('説明がないタスクでも正しく処理される', () => {
      const noDescTask: Task = {
        ...mockTask,
        description: undefined
      };
      
      const url = getGoogleCalendarUrlForTask(noDescTask);
      const decodedUrl = decodeURIComponent(url);
      
      expect(decodedUrl).not.toContain('説明:');
      expect(decodedUrl).toContain('優先度:+High');
    });
  });
});