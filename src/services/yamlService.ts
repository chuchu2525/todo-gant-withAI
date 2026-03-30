
import { Task } from '../types';

export const parseTasksFromYaml = (yamlString: string): Task[] => {
  try {
    const parsed = jsyaml.load(yamlString);
    if (Array.isArray(parsed)) {
      // Add basic validation if needed
      return parsed.filter(task => task && task.id && task.name) as Task[];
    }
    return [];
  } catch (error) {
    console.error("Error parsing YAML:", error);
    // Consider re-throwing or returning a specific error state
    throw new Error(`Invalid YAML format: ${(error as Error).message}`);
  }
};

export const stringifyTasksToYaml = (tasks: Task[]): string => {
  try {
    return jsyaml.dump(tasks, { indent: 2 });
  } catch (error) {
    console.error("Error stringifying tasks to YAML:", error);
    return ''; // Or handle error appropriately
  }
};
    