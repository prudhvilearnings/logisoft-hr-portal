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
  BACKEND_BASE_URL: "http://127.0.0.1:8000/api",

  // API Key for your LLM or chatbot service (e.g. Gemini, OpenAI, Anthropic, etc.)
  CHATBOT_API_KEY: "YOUR_CHATBOT_API_KEY_HERE",

  // Endpoint for the chatbot service
  CHATBOT_ENDPOINT: "https://api.openai.com/v1/chat/completions",

  // Switch to false when you want to connect to the live backend and chatbot APIs
  USE_MOCK_API: false,
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

  // Real LLM / Django Backend Integration
  try {
    const token = localStorage.getItem("accessToken");
    const response = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/chat/send/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": token ? `Bearer ${token}` : "",
      },
      body: JSON.stringify({
        content: message,
        session_id: null, // Django backend handles session tracking
      }),
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("Unauthorized. Please log in first.");
      }
      throw new Error(`API response error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.ai_message?.content || "No response received from assistant.";
  } catch (error: any) {
    console.error("Chatbot API connection error:", error);
    return `Error connecting to Chatbot API: ${error.message}. (Please ensure backend server is running and you are logged in)`;
  }
}

export async function fetchBackendUsers(): Promise<any[]> {
  const token = localStorage.getItem("accessToken");
  const response = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/users/`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "Authorization": token ? `Bearer ${token}` : "",
    },
  });
  if (!response.ok) {
    throw new Error("Failed to fetch users from backend");
  }
  return response.json();
}

export async function assignUserRoleAndTeam(userId: string, role: string, teamId: number | null): Promise<any> {
  const token = localStorage.getItem("accessToken");
  const response = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/users/${userId}/assign-role/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": token ? `Bearer ${token}` : "",
    },
    body: JSON.stringify({
      role,
      team_id: teamId,
    }),
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.detail || "Failed to assign role/team");
  }
  return response.json();
}

export async function fetchTeams(): Promise<any[]> {
  const token = localStorage.getItem("accessToken");
  const response = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/teams/`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "Authorization": token ? `Bearer ${token}` : "",
    },
  });
  if (!response.ok) {
    throw new Error("Failed to fetch teams");
  }
  return response.json();
}

export async function fetchBackendTasks(): Promise<any[]> {
  const token = localStorage.getItem("accessToken");
  const response = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/tasks/`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "Authorization": token ? `Bearer ${token}` : "",
    },
  });
  if (!response.ok) {
    throw new Error("Failed to fetch tasks from backend");
  }
  return response.json();
}

export async function createBackendTask(title: string, description: string, status: string, assigneeId: number): Promise<any> {
  const token = localStorage.getItem("accessToken");
  const response = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/tasks/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": token ? `Bearer ${token}` : "",
    },
    body: JSON.stringify({
      title,
      description,
      status,
      assignee: assigneeId
    }),
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.detail || "Failed to create task");
  }
  return response.json();
}

export async function updateBackendTask(taskId: string, title: string, description: string, status: string, assigneeId: number): Promise<any> {
  const token = localStorage.getItem("accessToken");
  const response = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/tasks/${taskId}/`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "Authorization": token ? `Bearer ${token}` : "",
    },
    body: JSON.stringify({
      title,
      description,
      status,
      assignee: assigneeId
    }),
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.detail || "Failed to update task");
  }
  return response.json();
}

export async function deleteBackendTask(taskId: string): Promise<any> {
  const token = localStorage.getItem("accessToken");
  const response = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/tasks/${taskId}/`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      "Authorization": token ? `Bearer ${token}` : "",
    },
  });
  if (!response.ok) {
    throw new Error("Failed to delete task");
  }
  return true;
}

export async function updateTaskStatus(taskId: string, status: string): Promise<any> {
  const token = localStorage.getItem("accessToken");
  const response = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/tasks/${taskId}/`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "Authorization": token ? `Bearer ${token}` : "",
    },
    body: JSON.stringify({ status }),
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.detail || "Failed to update task status");
  }
  return response.json();
}

export async function fetchChatHistory(): Promise<any[]> {
  const token = localStorage.getItem("accessToken");
  const response = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/chat/history/`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "Authorization": token ? `Bearer ${token}` : "",
    },
  });
  if (!response.ok) {
    throw new Error("Failed to fetch chat history");
  }
  return response.json();
}

export async function sendChatMessageToBackend(message: string, sessionId: number | null = null): Promise<any> {
  const token = localStorage.getItem("accessToken");
  const response = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/chat/send/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": token ? `Bearer ${token}` : "",
    },
    body: JSON.stringify({
      content: message,
      session_id: sessionId,
    }),
  });
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("Unauthorized. Please log in first.");
    }
    throw new Error(`API error: ${response.statusText}`);
  }
  return response.json();
}
