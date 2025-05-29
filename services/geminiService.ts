import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { GEMINI_TEXT_MODEL } from '../constants';
import { Task } from "../types";

// Assume process.env.API_KEY is available in the execution environment
// This is a significant assumption for client-side code as per prompt.
let apiKey = "";
if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
  apiKey = process.env.API_KEY;
} else {
  // Fallback or warning if not found - in a real app, this needs robust handling or a clear setup guide.
  console.warn("API_KEY not found in process.env. It must be globally available for Gemini API calls.");
  // To prevent the app from completely breaking if API key is not set (e.g. for local dev without key)
  // we can set a placeholder, but API calls will fail.
  // apiKey = "YOUR_API_KEY"; // This line should NOT be used in production or committed.
}

const ai = new GoogleGenAI({ apiKey });

export const getAiTaskSummary = async (tasks: Task[]): Promise<string> => {
  if (!apiKey) return "API Key not configured. Cannot fetch summary.";
  if (tasks.length === 0) return "No tasks to summarize.";

  const taskContext = tasks.map(task => 
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
  if (!apiKey) return Promise.reject(new Error("API Key not configured. Cannot update tasks via AI."));

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
${currentYaml}
\`\`\`

User Instruction: ${userInstruction}

Updated YAML:
`;
  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: GEMINI_TEXT_MODEL,
      contents: prompt,
      // config: { responseMimeType: "text/plain" } // Ensure we get plain text to parse YAML from
    });

    let newYaml = (response.text || "").trim();
    const fenceRegex = /^```(?:yaml)?\s*\n?(.*?)\n?\s*```$/s;
    const match = newYaml.match(fenceRegex);
    if (match && match[1]) {
      newYaml = match[1].trim();
    } else if (newYaml.startsWith("```") && newYaml.endsWith("```")) {
      // Simpler fallback if no language tag but fences exist
      newYaml = newYaml.substring(3, newYaml.length - 3).trim();
    }
    
    return newYaml;

  } catch (error) {
    console.error("Error updating tasks via AI:", error);
    throw new Error(`AI update failed: ${(error as Error).message}`);
  }
};
    