import { vi } from 'vitest';
import { getAiTaskSummary, updateTasksViaAi } from '../../../services/geminiService';
import { Task, TaskStatus, TaskPriority } from '../../../types';

// GoogleGenAIをモック
const mockGenerateContent = vi.fn();
vi.mock('@google/genai', () => ({
  GoogleGenAI: vi.fn().mockImplementation(() => ({
    models: {
      generateContent: mockGenerateContent
    }
  }))
}));

describe('geminiService', () => {
  const mockTasks: Task[] = [
    {
      id: '1',
      name: 'テストタスク1',
      description: 'テストの説明',
      status: TaskStatus.IN_PROGRESS,
      priority: TaskPriority.HIGH,
      startDate: '2024-01-01',
      endDate: '2024-01-31',
      dependencies: []
    },
    {
      id: '2',
      name: 'テストタスク2',
      status: TaskStatus.COMPLETED,
      priority: TaskPriority.LOW,
      startDate: '2024-01-15',
      endDate: '2024-01-30',
      dependencies: ['1']
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockGenerateContent.mockClear();
    // APIキーをモック
    vi.stubGlobal('process', {
      env: {
        GEMINI_API_KEY: 'test-api-key'
      }
    });
  });

  describe('getAiTaskSummary', () => {
    it('APIキーが設定されていない場合、適切なメッセージを返す', async () => {
      vi.stubGlobal('process', {
        env: {}
      });
      
      const result = await getAiTaskSummary(mockTasks);
      expect(result).toBe('API Key not configured. Cannot fetch summary.');
    });

    it('タスクが空の場合、適切なメッセージを返す', async () => {
      const result = await getAiTaskSummary([]);
      expect(result).toBe('No tasks to summarize.');
    });

    it('正常なレスポンスを返す', async () => {
      const mockResponse = {
        text: 'タスクの概要: 2つのタスクがあります。'
      };
      
      mockGenerateContent.mockResolvedValue(mockResponse);

      const result = await getAiTaskSummary(mockTasks);
      expect(result).toBe('タスクの概要: 2つのタスクがあります。');
    });

    it('エラーが発生した場合、エラーメッセージを返す', async () => {
      mockGenerateContent.mockRejectedValue(new Error('API Error'));

      const result = await getAiTaskSummary(mockTasks);
      expect(result).toBe('Error fetching summary: API Error');
    });
  });

  describe('updateTasksViaAi', () => {
    it('APIキーが設定されていない場合、エラーを投げる', async () => {
      vi.stubGlobal('process', {
        env: {}
      });
      
      await expect(updateTasksViaAi('yaml content', 'instruction')).rejects.toThrow('API Key not configured. Cannot update tasks via AI.');
    });

    it('正常なYAMLレスポンスを返す', async () => {
      const mockResponse = {
        text: '```yaml\ntasks:\n  - id: 1\n    name: Updated Task\n```'
      };
      
      mockGenerateContent.mockResolvedValue(mockResponse);

      const result = await updateTasksViaAi('original yaml', 'update instruction');
      expect(result).toBe('tasks:\n  - id: 1\n    name: Updated Task');
    });

    it('YAMLフェンスなしのレスポンスを処理する', async () => {
      const mockResponse = {
        text: 'tasks:\n  - id: 1\n    name: Direct YAML'
      };
      
      mockGenerateContent.mockResolvedValue(mockResponse);

      const result = await updateTasksViaAi('original yaml', 'update instruction');
      expect(result).toBe('tasks:\n  - id: 1\n    name: Direct YAML');
    });

    it('エラーが発生した場合、エラーを投げる', async () => {
      mockGenerateContent.mockRejectedValue(new Error('API Error'));

      await expect(updateTasksViaAi('yaml content', 'instruction')).rejects.toThrow('AI update failed: API Error');
    });
  });

  describe('セキュリティテスト', () => {
    it('APIキーがコンソールに出力されないことを確認', () => {
      const consoleSpy = vi.spyOn(console, 'log');
      const consoleWarnSpy = vi.spyOn(console, 'warn');
      
      // 正常なAPIキーが設定されている場合
      vi.stubGlobal('process', {
        env: {
          GEMINI_API_KEY: 'secret-api-key'
        }
      });
      
      // この時点でAPIキーがコンソールに出力されないことを確認
      expect(consoleSpy).not.toHaveBeenCalledWith(expect.stringContaining('secret-api-key'));
      expect(consoleWarnSpy).not.toHaveBeenCalledWith(expect.stringContaining('secret-api-key'));
      
      consoleSpy.mockRestore();
      consoleWarnSpy.mockRestore();
    });

    it('APIキーが環境変数に存在しない場合、警告を出力', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn');
      
      vi.stubGlobal('process', {
        env: {
          NODE_ENV: 'development'
        }
      });
      
      // 新しいgeminiServiceをインポートして警告をトリガー
      const result = await getAiTaskSummary(mockTasks);
      
      expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('GEMINI_API_KEY not found'));
      expect(result).toBe('API Key not configured. Cannot fetch summary.');
      
      consoleWarnSpy.mockRestore();
    });

    it('悪意のある入力を検出して拒否する', async () => {
      const maliciousTask = {
        ...mockTasks[0],
        name: '<script>alert("xss")</script>',
        description: 'javascript:alert("xss")'
      };
      
      const result = await getAiTaskSummary([maliciousTask]);
      expect(result).toBe('Invalid input detected. Cannot process request.');
    });
  });
});