import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { GEMINI_TEXT_MODEL } from '../constants';
import { Task } from "../types";

// セキュリティ強化: APIキーの安全な管理
class SecureApiKeyManager {
  private apiKey: string | null = null;
  private isInitialized = false;

  constructor() {
    this.initializeApiKey();
  }

  private initializeApiKey() {
    if (this.isInitialized) return;
    
    // セキュリティ: 環境変数からAPIキーを取得、コンソールに出力しない
    if (typeof process !== 'undefined' && process.env && process.env.GEMINI_API_KEY) {
      this.apiKey = process.env.GEMINI_API_KEY;
    } else {
      // セキュリティ: APIキーがない場合の警告（プロダクション環境では無効化）
      if (process.env.NODE_ENV !== 'production') {
        console.warn("GEMINI_API_KEY not found in process.env. Please set it in your environment variables.");
      }
      this.apiKey = null;
    }
    
    this.isInitialized = true;
  }

  public hasApiKey(): boolean {
    return this.apiKey !== null && this.apiKey.length > 0;
  }

  public getApiKey(): string | null {
    return this.apiKey;
  }

  // セキュリティ: APIキーの検証
  public isValidApiKey(): boolean {
    if (!this.apiKey) return false;
    
    // 基本的な形式チェック（Gemini APIキーの形式）
    const apiKeyPattern = /^[A-Za-z0-9_-]{35,}$/;
    return apiKeyPattern.test(this.apiKey);
  }
}

// シングルトンパターンでAPIキーマネージャーを管理
const apiKeyManager = new SecureApiKeyManager();

// セキュリティ強化: AI インスタンスの安全な初期化
function createSecureAiInstance(): GoogleGenAI | null {
  if (!apiKeyManager.hasApiKey()) {
    return null;
  }
  
  const apiKey = apiKeyManager.getApiKey();
  if (!apiKey) {
    return null;
  }
  
  try {
    return new GoogleGenAI({ apiKey });
  } catch (error) {
    console.error('Failed to initialize AI instance:', error);
    return null;
  }
}

// セキュリティ強化: リクエストの検証
function validateRequest(input: any): boolean {
  if (!input || typeof input !== 'object') return false;
  
  // 悪意のあるペイロードの検出
  const maliciousPatterns = [
    /eval\s*\(/,
    /function\s*\(/,
    /javascript:/,
    /<script/i,
    /on\w+\s*=/i
  ];
  
  const inputStr = JSON.stringify(input);
  return !maliciousPatterns.some(pattern => pattern.test(inputStr));
}

export const getAiTaskSummary = async (tasks: Task[]): Promise<string> => {
  // セキュリティ: APIキーの存在確認
  if (!apiKeyManager.hasApiKey()) {
    return "API Key not configured. Cannot fetch summary.";
  }

  // セキュリティ: 入力検証
  if (!tasks || tasks.length === 0) {
    return "No tasks to summarize.";
  }

  if (!validateRequest(tasks)) {
    return "Invalid input detected. Cannot process request.";
  }

  const ai = createSecureAiInstance();
  if (!ai) {
    return "Failed to initialize AI service. Please check your configuration.";
  }

  // セキュリティ: 入力のサニタイズ
  const sanitizedTasks = tasks.map(task => ({
    name: String(task.name).replace(/[<>]/g, ''),
    priority: String(task.priority),
    status: String(task.status),
    endDate: String(task.endDate).replace(/[^\d-]/g, '')
  }));

  const taskContext = sanitizedTasks.map(task => 
    `- ${task.name} (Priority: ${task.priority}, Status: ${task.status}, Due: ${task.endDate})`
  ).join('\n');

  const prompt = `
Provide a concise summary of the following tasks:
${taskContext}

Focus on overdue tasks, high priority items, and overall progress.
  `;

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: GEMINI_TEXT_MODEL,
      contents: prompt,
    });
    
    return response.text || "No response received from AI.";
  } catch (error) {
    console.error("Error getting AI task summary:", error);
    return `Error fetching summary: ${(error as Error).message}`;
  }
};

export const updateTasksViaAi = async (currentYaml: string, userInstruction: string): Promise<string> => {
  // セキュリティ: APIキーの存在確認
  if (!apiKeyManager.hasApiKey()) {
    return Promise.reject(new Error("API Key not configured. Cannot update tasks via AI."));
  }

  // セキュリティ: 入力検証
  if (!currentYaml || typeof currentYaml !== 'string') {
    return Promise.reject(new Error("Invalid YAML input."));
  }

  if (!userInstruction || typeof userInstruction !== 'string') {
    return Promise.reject(new Error("Invalid instruction input."));
  }

  if (!validateRequest({ currentYaml, userInstruction })) {
    return Promise.reject(new Error("Invalid input detected. Cannot process request."));
  }

  const ai = createSecureAiInstance();
  if (!ai) {
    return Promise.reject(new Error("Failed to initialize AI service. Please check your configuration."));
  }

  // セキュリティ: 入力のサニタイズ
  const sanitizedInstruction = userInstruction.replace(/[<>]/g, '').substring(0, 500);
  const sanitizedYaml = currentYaml.substring(0, 10000); // YAML サイズ制限

  const currentDate = new Date().toISOString().split('T')[0];

  const systemInstruction = `You are an AI assistant that modifies a list of tasks defined in YAML format based on user instructions.
The tasks have the following fields: id (string, unique, do not change existing IDs unless asked to delete/create), name (string), description (string, optional), status (string: "Not Started", "In Progress", "Completed"), priority (string: "High", "Medium", "Low"), startDate (string: "YYYY-MM-DD"), endDate (string: "YYYY-MM-DD"), dependencies (array of task IDs).
Your response MUST ONLY be the complete, valid YAML content of the updated task list, enclosed in triple backticks with a yaml label (e.g., \`\`\`yaml ... \`\`\`).
Do not add any explanations, apologies, or conversational text outside the YAML block.
If creating a new task, generate a new UUID-like string for its id (e.g., "task-" + new Date().getTime()).
If the user asks to set a date like "tomorrow" or "next week", calculate the actual date based on the current date.
Preserve YAML comments if any.
Ensure dates are in YYYY-MM-DD format.
Current Date for relative calculations: ${currentDate}
`;

  const prompt = `
${systemInstruction}

Current YAML:
\`\`\`yaml
${sanitizedYaml}
\`\`\`

User Instruction: ${sanitizedInstruction}

Updated YAML:
`;

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: GEMINI_TEXT_MODEL,
      contents: prompt,
    });

    let newYaml = (response.text || "").trim();
    
    // セキュリティ: レスポンスの検証
    if (!newYaml) {
      throw new Error("Empty response from AI service.");
    }

    // YAML フェンスの処理
    const fenceRegex = /^```(?:yaml)?\s*\n?(.*?)\n?\s*```$/s;
    const match = newYaml.match(fenceRegex);
    if (match && match[1]) {
      newYaml = match[1].trim();
    } else if (newYaml.startsWith("```") && newYaml.endsWith("```")) {
      newYaml = newYaml.substring(3, newYaml.length - 3).trim();
    }
    
    // セキュリティ: 出力の検証
    if (!validateRequest({ yaml: newYaml })) {
      throw new Error("Invalid response from AI service.");
    }
    
    return newYaml;

  } catch (error) {
    console.error("Error updating tasks via AI:", error);
    throw new Error(`AI update failed: ${(error as Error).message}`);
  }
};

// セキュリティ: APIキーの状態確認用エクスポート（テスト用）
export const getApiKeyStatus = () => ({
  hasApiKey: apiKeyManager.hasApiKey(),
  isValid: apiKeyManager.isValidApiKey()
});