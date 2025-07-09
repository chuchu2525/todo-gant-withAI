import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { ErrorBoundary } from '../ErrorBoundary';

// テスト用のコンポーネント
const ThrowingComponent = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>正常なコンポーネント</div>;
};

describe('ErrorBoundary', () => {
  // コンソールエラーをモック（テスト中にエラーログが表示されるのを防ぐ）
  const originalConsoleError = console.error;
  beforeEach(() => {
    console.error = vi.fn();
  });
  
  afterEach(() => {
    console.error = originalConsoleError;
  });

  test('正常なコンポーネントを正しく表示する', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={false} />
      </ErrorBoundary>
    );
    
    expect(screen.getByText('正常なコンポーネント')).toBeInTheDocument();
  });

  test('エラーが発生した場合にフォールバックUIを表示する', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    );
    
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('Test error')).toBeInTheDocument();
  });

  test('リロードボタンが存在する', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    );
    
    expect(screen.getByText('Reload App')).toBeInTheDocument();
  });

  test('カスタムフォールバックコンポーネントを表示する', () => {
    const customFallback = <div>カスタムエラーメッセージ</div>;
    
    render(
      <ErrorBoundary fallback={customFallback}>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    );
    
    expect(screen.getByText('カスタムエラーメッセージ')).toBeInTheDocument();
  });

  test('onErrorコールバックが呼ばれる', () => {
    const onErrorMock = vi.fn();
    
    render(
      <ErrorBoundary onError={onErrorMock}>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    );
    
    expect(onErrorMock).toHaveBeenCalledWith(
      expect.any(Error),
      expect.any(Object)
    );
  });
});