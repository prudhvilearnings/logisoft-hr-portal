export interface Task {
  id: string;
  title: string;
  description: string;
  status: "Pending" | "In Progress" | "Completed";
  assigneeName: string;
}

export interface Employee {
  id: string;
  name: string;
  email: string;
  department: string;
}

export interface TeamLeader {
  id: string;
  name: string;
  email: string;
  teamName: string;
}

// ==========================================
// API CONFIGURATION & KEYS
// ==========================================
export const API_CONFIG = {
  // Base URL of your backend server
  BACKEND_BASE_URL: "https://api.logisoft-hr.com/api",

  // API Key for your LLM or chatbot service (e.g. Gemini, OpenAI, Anthropic, etc.)
  CHATBOT_API_KEY: "YOUR_CHATBOT_API_KEY_HERE",

  // Endpoint for the chatbot service
  CHATBOT_ENDPOINT: "https://api.openai.com/v1/chat/completions",

  // Switch to false when you want to connect to the live backend and chatbot APIs
  USE_MOCK_API: true,
};

// ==========================================
// DEFAULT MOCK DATA (Fallback)
// ==========================================
const defaultTasks: Task[] = [
  { id: "1", title: "Complete UI/UX refinement", description: "Polish the dashboard styling, hover states, and cards", status: "In Progress", assigneeName: "Alice Johnson" },
  { id: "2", title: "Integrate role permissions", description: "Hook up App.tsx state with RoleSelect and restrict routes", status: "Completed", assigneeName: "Bob Smith" },
  { id: "3", title: "Write automated tests", description: "Perform unit testing for role views and actions", status: "Pending", assigneeName: "Charlie Brown" },
];

const defaultEmployees: Employee[] = [
  { id: "e1", name: "Alice Johnson", email: "alice@logisoft.com", department: "Engineering" },
  { id: "e2", name: "Bob Smith", email: "bob@logisoft.com", department: "Design" },
];

const defaultTeamLeaders: TeamLeader[] = [
  { id: "tl1", name: "Charlie Brown", email: "charlie@logisoft.com", teamName: "Frontend Team" },
  { id: "tl2", name: "Diana Prince", email: "diana@logisoft.com", teamName: "DevOps Team" },
];

// ==========================================
// BACKEND API METHODS (Tasks, Employees, Leaders)
// ==========================================

export function loadTasks(): Task[] {
  if (API_CONFIG.USE_MOCK_API) {
    const saved = localStorage.getItem("hr_tasks");
    return saved ? JSON.parse(saved) : defaultTasks;
  }
  // Real sync load / fallback (modify to use async fetch inside Dashboard if needed)
  return defaultTasks;
}

export function saveTasks(tasks: Task[]): void {
  if (API_CONFIG.USE_MOCK_API) {
    localStorage.setItem("hr_tasks", JSON.stringify(tasks));
    return;
  }

  // Real HTTP POST/PUT implementation template
  fetch(`${API_CONFIG.BACKEND_BASE_URL}/tasks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tasks }),
  }).catch(err => console.error("Failed to sync tasks with backend", err));
}

export function loadEmployees(): Employee[] {
  if (API_CONFIG.USE_MOCK_API) {
    const saved = localStorage.getItem("hr_employees");
    return saved ? JSON.parse(saved) : defaultEmployees;
  }
  return defaultEmployees;
}

export function saveEmployees(employees: Employee[]): void {
  if (API_CONFIG.USE_MOCK_API) {
    localStorage.setItem("hr_employees", JSON.stringify(employees));
    return;
  }

  fetch(`${API_CONFIG.BACKEND_BASE_URL}/employees`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ employees }),
  }).catch(err => console.error("Failed to sync employees with backend", err));
}

export function loadTeamLeaders(): TeamLeader[] {
  if (API_CONFIG.USE_MOCK_API) {
    const saved = localStorage.getItem("hr_team_leaders");
    return saved ? JSON.parse(saved) : defaultTeamLeaders;
  }
  return defaultTeamLeaders;
}

export function saveTeamLeaders(leaders: TeamLeader[]): void {
  if (API_CONFIG.USE_MOCK_API) {
    localStorage.setItem("hr_team_leaders", JSON.stringify(leaders));
    return;
  }

  fetch(`${API_CONFIG.BACKEND_BASE_URL}/team-leaders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ leaders }),
  }).catch(err => console.error("Failed to sync team leaders with backend", err));
}

// Real asynchronous APIs (Example for loading inside useEffect in the future)
/*
export async function fetchTasksAsync(): Promise<Task[]> {
  const response = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/tasks`);
  if (!response.ok) throw new Error("Failed to fetch tasks");
  return response.json();
}
*/

// ==========================================
// CHATBOT API METHOD (Real Asynchronous call)
// ==========================================

export async function getChatbotResponse(
  message: string,
  role: string,
  email: string,
  stats: { tasks: number; employees: number; teamLeaders: number }
): Promise<string> {
  if (API_CONFIG.USE_MOCK_API) {
    await new Promise(resolve => setTimeout(resolve, 500));
    const textLower = message.toLowerCase();

    if (textLower.includes("hello") || textLower.includes("hi")) {
      return `Hello there! I am your Logisoft-HR assistant. How can I help you today?`;
    }
    if (textLower.includes("task")) {
      const editPermission = role === "Team Leader" || role === "Manager";
      return `Currently, there are ${stats.tasks} active tasks in the portal. Since you are logged in as a ${role}, you ${editPermission ? "have full editing rights" : "have view-only access"
        } for tasks.`;
    }
    if (textLower.includes("employee")) {
      const viewPermission = role === "Team Leader" || role === "Manager";
      if (viewPermission) {
        return `I can confirm there are ${stats.employees} employees registered. You can manage them in the Employees tab.`;
      }
      return "Access denied: As an Employee, you do not have permission to view other employee records.";
    }
    if (textLower.includes("manager") || textLower.includes("lead")) {
      const viewPermission = role === "Manager";
      if (viewPermission) {
        return `There are currently ${stats.teamLeaders} Team Leaders under management. You can add, edit, or delete them in the Team Leaders tab.`;
      }
      return `Access denied: As a ${role}, you do not have permission to view or manage Team Leaders.`;
    }
    return `I received your message: "${message}". You are authenticated as a ${role} (${email}). Let me know if you need help with portal operations or permissions.`;
  }

  // Real LLM / OpenAI API Key integration
  try {
    const response = await fetch(API_CONFIG.CHATBOT_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${API_CONFIG.CHATBOT_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini", // or appropriate model (e.g. gemini-2.5-flash)
        messages: [
          {
            role: "system",
            content: `You are an HR Portal AI Assistant for Logisoft-HR. 
            The current user's profile is: Email: ${email}, Role: ${role}.
            Current dashboard statistics:
            - Active Tasks: ${stats.tasks}
            - Employees: ${stats.employees}
            - Team Leaders: ${stats.teamLeaders}
            Tailor your answers strictly according to the user's role and database statistics. Do not leak unauthorized sections.`
          },
          {
            role: "user",
            content: message
          }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`API response error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || "No response received from assistant.";
  } catch (error: any) {
    console.error("Chatbot API connection error:", error);
    return `Error connecting to Chatbot API: ${error.message}. (Please double check your API Key and endpoint in src/api.ts)`;
  }
}
