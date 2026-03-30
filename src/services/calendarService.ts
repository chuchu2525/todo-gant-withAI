import { Task } from '../types';

/**
 * Google Calendar URL スキームを使用してタスクをカレンダーイベントとしてエクスポートするサービス
 */

interface GoogleCalendarEventParams {
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  timezone?: string;
}

/**
 * 日付文字列をGoogle Calendar用のフォーマット（YYYYMMDD）に変換
 */
const formatDateForGoogleCalendar = (dateString: string): string => {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
};

/**
 * 日付文字列をGoogle Calendar用の日時フォーマット（YYYYMMDDTHHMMSSZ）に変換
 * 開始時刻を9:00、終了時刻を18:00にデフォルト設定
 */
const formatDateTimeForGoogleCalendar = (dateString: string, isEndDate: boolean = false): string => {
  const date = new Date(dateString);
  // JSTのタイムゾーンオフセットを考慮（UTC+9）
  date.setHours(isEndDate ? 18 : 9, 0, 0, 0); // 開始: 9:00, 終了: 18:00
  
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  
  return `${year}${month}${day}T${hours}${minutes}${seconds}`;
};

/**
 * タスクの説明文を生成
 */
const generateTaskDescription = (task: Task): string => {
  let description = '';
  
  if (task.description) {
    description += `説明: ${task.description}\n\n`;
  }
  
  description += `優先度: ${task.priority}\n`;
  description += `ステータス: ${task.status}\n`;
  description += `開始日: ${task.startDate}\n`;
  description += `終了日: ${task.endDate}\n`;
  
  if (task.dependencies && task.dependencies.length > 0) {
    description += `依存関係: ${task.dependencies.join(', ')}\n`;
  }
  
  description += '\n📋 AI搭載TODOアプリから生成されました';
  
  return description;
};

/**
 * Google Calendar URLを生成
 */
const createGoogleCalendarUrl = (params: GoogleCalendarEventParams): string => {
  const baseUrl = 'https://calendar.google.com/calendar/render';
  const urlParams = new URLSearchParams();
  
  urlParams.append('action', 'TEMPLATE');
  urlParams.append('text', params.title);
  
  if (params.description) {
    urlParams.append('details', params.description);
  }
  
  // 同じ日の場合は終日イベント、異なる日の場合は期間イベント
  const startDate = new Date(params.startDate);
  const endDate = new Date(params.endDate);
  
  if (startDate.toDateString() === endDate.toDateString()) {
    // 同じ日の場合：時間指定イベント
    urlParams.append('dates', `${formatDateTimeForGoogleCalendar(params.startDate)}/${formatDateTimeForGoogleCalendar(params.endDate, true)}`);
  } else {
    // 異なる日の場合：複数日イベント
    const endDatePlusOne = new Date(endDate);
    endDatePlusOne.setDate(endDatePlusOne.getDate() + 1); // Google Calendarの仕様で終了日に1日加算
    urlParams.append('dates', `${formatDateForGoogleCalendar(params.startDate)}/${formatDateForGoogleCalendar(endDatePlusOne.toISOString().split('T')[0])}`);
  }
  
  // 日本のタイムゾーンを設定
  urlParams.append('ctz', 'Asia/Tokyo');
  
  return `${baseUrl}?${urlParams.toString()}`;
};

/**
 * 単一のタスクをGoogle Calendarにエクスポート
 */
export const exportTaskToGoogleCalendar = (task: Task): void => {
  const params: GoogleCalendarEventParams = {
    title: `📋 ${task.name}`,
    description: generateTaskDescription(task),
    startDate: task.startDate,
    endDate: task.endDate,
    timezone: 'Asia/Tokyo'
  };
  
  const url = createGoogleCalendarUrl(params);
  window.open(url, '_blank');
};

/**
 * 複数のタスクをGoogle Calendarにエクスポート
 * 各タスクを別々のタブで開く
 */
export const exportMultipleTasksToGoogleCalendar = (tasks: Task[]): void => {
  if (tasks.length === 0) {
    alert('エクスポートするタスクがありません。');
    return;
  }
  
  if (tasks.length > 10) {
    const confirmed = confirm(`${tasks.length}個のタスクをエクスポートしようとしています。多数のタブが開かれますが、続行しますか？`);
    if (!confirmed) {
      return;
    }
  }
  
  // 少し間隔を開けて順次エクスポート（ブラウザのポップアップブロック対策）
  tasks.forEach((task, index) => {
    setTimeout(() => {
      exportTaskToGoogleCalendar(task);
    }, index * 100); // 100ms間隔
  });
  
  const message = `${tasks.length}個のタスクをGoogle Calendarにエクスポートしました。\n新しいタブでGoogle Calendarが開かれるので、各イベントを保存してください。`;
  alert(message);
};

/**
 * 選択されたタスクをGoogle Calendarにエクスポート
 */
export const exportSelectedTasksToGoogleCalendar = (selectedTaskIds: string[], allTasks: Task[]): void => {
  const selectedTasks = allTasks.filter(task => selectedTaskIds.includes(task.id));
  exportMultipleTasksToGoogleCalendar(selectedTasks);
};

/**
 * タスクのGoogle Calendar URL を取得（プレビュー用）
 */
export const getGoogleCalendarUrlForTask = (task: Task): string => {
  const params: GoogleCalendarEventParams = {
    title: `📋 ${task.name}`,
    description: generateTaskDescription(task),
    startDate: task.startDate,
    endDate: task.endDate,
    timezone: 'Asia/Tokyo'
  };
  
  return createGoogleCalendarUrl(params);
};