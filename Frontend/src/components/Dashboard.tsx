import { useState, useEffect, useRef } from "react";
import type { Task, Employee, TeamLeader } from "../api";
import {
  loadTasks,
  saveTasks,
  loadEmployees,
  saveEmployees,
  loadTeamLeaders,
  saveTeamLeaders,
  getChatbotResponse,
  fetchBackendUsers,
  API_CONFIG,
  assignUserRoleAndTeam,
  fetchTeams,
  fetchBackendTasks,
  createBackendTask,
  updateBackendTask,
  deleteBackendTask,
  updateTaskStatus,
  fetchChatHistory,
  sendChatMessageToBackend
} from "../api";

interface DashboardProps {
  role: string; // "Employee" | "Team Leader" | "Manager"
  email: string;
  onLogout: () => void;
}

export default function Dashboard({ role, email, onLogout }: DashboardProps) {
  // State for data lists loaded via API helpers
  const [tasks, setTasks] = useState<Task[]>(() => loadTasks());
  const [employees, setEmployees] = useState<Employee[]>(() => loadEmployees());
  const [teamLeaders, setTeamLeaders] = useState<TeamLeader[]>(() => loadTeamLeaders());
  
  // Available Teams from Backend
  const [teams, setTeams] = useState<any[]>([]);

  const refreshUsers = () => {
    if (!API_CONFIG.USE_MOCK_API) {
      fetchBackendUsers()
        .then((users) => {
          // Map backend users to Employee list
          const fetchedEmployees: Employee[] = users
            .filter((u) => u.role === "EMPLOYEE")
            .map((u) => ({
              id: u.id.toString(),
              name: `${u.first_name} ${u.last_name}`.trim() || u.username,
              email: u.email,
              department: u.team_details?.name || "Unassigned",
            }));
          setEmployees(fetchedEmployees);

          // Map backend users to TeamLeader list
          const fetchedTeamLeaders: TeamLeader[] = users
            .filter((u) => u.role === "TEAM_LEAD")
            .map((u) => ({
              id: u.id.toString(),
              name: `${u.first_name} ${u.last_name}`.trim() || u.username,
              email: u.email,
              teamName: u.team_details?.name || "Unassigned",
              teamId: u.team_details?.id || null
            } as any));
          setTeamLeaders(fetchedTeamLeaders);
        })
        .catch((err) => console.error("Failed to load users from backend:", err));
    }
  };

  const refreshTasks = () => {
    if (!API_CONFIG.USE_MOCK_API) {
      fetchBackendTasks()
        .then((backendTasks) => {
          const mappedTasks: Task[] = backendTasks.map((t) => ({
            id: t.id.toString(),
            title: t.title,
            description: t.description,
            status: t.status,
            assigneeName: t.assignee_name,
          }));
          setTasks(mappedTasks);
        })
        .catch((err) => console.error("Failed to load tasks from backend:", err));
    }
  };

  // Load database users, teams, and tasks on mount if not in mock mode
  useEffect(() => {
    refreshUsers();
    refreshTasks();

    if (!API_CONFIG.USE_MOCK_API && role === "Manager") {
      fetchTeams()
        .then(setTeams)
        .catch((err) => console.error("Failed to load teams:", err));
    }
  }, [role]);

  // Save to database on change (only in mock mode)
  useEffect(() => {
    if (API_CONFIG.USE_MOCK_API) {
      saveTasks(tasks);
    }
  }, [tasks]);

  useEffect(() => {
    if (API_CONFIG.USE_MOCK_API) {
      saveEmployees(employees);
    }
  }, [employees]);

  useEffect(() => {
    if (API_CONFIG.USE_MOCK_API) {
      saveTeamLeaders(teamLeaders);
    }
  }, [teamLeaders]);

  // Permissions helper
  const canEditTasks = role === "Team Leader" || role === "Manager";
  const canViewEmployees = role === "Team Leader" || role === "Manager";
  const canEditEmployees = role === "Team Leader" || role === "Manager";
  const canViewTeamLeaders = role === "Manager";
  const canEditTeamLeaders = role === "Manager";

  // Tab state: "tasks" | "employees" | "teamLeaders"
  const [activeTab, setActiveTab] = useState<"tasks" | "employees" | "teamLeaders">("tasks");

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<"task" | "employee" | "teamLeader">("task");
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form states
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDesc, setTaskDesc] = useState("");
  const [taskStatus, setTaskStatus] = useState<"Pending" | "In Progress" | "Completed">("Pending");
  const [taskAssignee, setTaskAssignee] = useState("");

  const [empName, setEmpName] = useState("");
  const [empEmail, setEmpEmail] = useState("");
  const [empDept, setEmpDept] = useState("");

  const [tlName, setTlName] = useState("");
  const [tlEmail, setTlEmail] = useState("");
  const [tlTeam, setTlTeam] = useState("");

  // Chatbot states
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<Array<{ sender: "user" | "bot"; text: string; time: string }>>([
    { sender: "bot", text: "Hello! I'm your HR AI assistant. How can I help you today?", time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
  ]);
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);
  const [isBotTyping, setIsBotTyping] = useState(false);


  const refreshChatSessions = () => {
    if (!API_CONFIG.USE_MOCK_API) {
      fetchChatHistory()
        .then(() => {})
        .catch((err) => console.error("Failed to load chat history:", err));
    }
  };

  const startNewChat = () => {
    setActiveSessionId(null);
    setChatMessages([
      { sender: "bot", text: "Hello! I'm your HR AI assistant. How can I help you today?", time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
    ]);
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isChatOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages, isChatOpen]);

  useEffect(() => {
    if (isChatOpen) {
      refreshChatSessions();
    }
  }, [isChatOpen]);

  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = chatInput.trim();
    if (!query) return;

    const userMsg = {
      sender: "user" as const,
      text: query,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setChatMessages(prev => [...prev, userMsg]);
    setChatInput("");
    setIsBotTyping(true);

    try {
      if (!API_CONFIG.USE_MOCK_API) {
        const responseData = await sendChatMessageToBackend(query, activeSessionId);
        if (!activeSessionId) {
          setActiveSessionId(responseData.session_id);
        }
        setChatMessages(prev => [...prev, {
          sender: "bot" as const,
          text: responseData.ai_message?.content || "No response received.",
          time: new Date(responseData.ai_message?.timestamp || new Date()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }]);
        refreshChatSessions();
      } else {
        const responseText = await getChatbotResponse(query, role, email, {
          tasks: tasks.length,
          employees: employees.length,
          teamLeaders: teamLeaders.length
        });

        setChatMessages(prev => [...prev, {
          sender: "bot" as const,
          text: responseText,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }]);
      }
    } catch (err: any) {
      console.error("Failed to send chatbot message:", err);
      setChatMessages(prev => [...prev, {
        sender: "bot" as const,
        text: `Error: ${err.message}`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    } finally {
      setIsBotTyping(false);
    }
  };

  // Handlers for Add/Edit click
  const openAddModal = (type: "task" | "employee" | "teamLeader") => {
    setModalType(type);
    setEditingId(null);
    if (type === "task") {
      setTaskTitle("");
      setTaskDesc("");
      setTaskStatus("Pending");
      setTaskAssignee("");
    } else if (type === "employee") {
      setEmpName("");
      setEmpEmail("");
      setEmpDept("");
    } else if (type === "teamLeader") {
      setTlName("");
      setTlEmail("");
      setTlTeam("");
    }
    setIsModalOpen(true);
  };

  const openEditModal = (type: "task" | "employee" | "teamLeader", item: any) => {
    setModalType(type);
    setEditingId(item.id);
    if (type === "task") {
      setTaskTitle(item.title);
      setTaskDesc(item.description);
      setTaskStatus(item.status);
      setTaskAssignee(item.assigneeName);
    } else if (type === "employee") {
      setEmpName(item.name);
      setEmpEmail(item.email);
      setEmpDept(item.department);
    } else if (type === "teamLeader") {
      setTlName(item.name);
      setTlEmail(item.email);
      setTlTeam(item.teamName);
    }
    setIsModalOpen(true);
  };

  // Submit Handler
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (modalType === "task") {
      if (!API_CONFIG.USE_MOCK_API) {
        const selectedAssignee = role === "Manager"
          ? teamLeaders.find(tl => tl.name === taskAssignee)
          : employees.find(emp => emp.name === taskAssignee);
        if (!selectedAssignee) {
          alert("Please select a valid assignee.");
          return;
        }
        const assigneeId = parseInt(selectedAssignee.id);

        if (editingId) {
          updateBackendTask(editingId, taskTitle, taskDesc, taskStatus, assigneeId)
            .then(() => {
              alert("Task updated successfully!");
              refreshTasks();
            })
            .catch((err) => alert(err.message || "Failed to update task."));
        } else {
          createBackendTask(taskTitle, taskDesc, taskStatus, assigneeId)
            .then(() => {
              alert("Task created successfully!");
              refreshTasks();
            })
            .catch((err) => alert(err.message || "Failed to create task."));
        }
      } else {
        if (editingId) {
          setTasks(tasks.map(t => t.id === editingId ? { ...t, title: taskTitle, description: taskDesc, status: taskStatus, assigneeName: taskAssignee } : t));
        } else {
          const newTask: Task = {
            id: Date.now().toString(),
            title: taskTitle,
            description: taskDesc,
            status: taskStatus,
            assigneeName: taskAssignee
          };
          setTasks([...tasks, newTask]);
        }
      }
    } else if (modalType === "employee") {
      if (!API_CONFIG.USE_MOCK_API) {
        if (editingId) {
          let teamId: number | null = null;
          if (role === "Manager") {
            const selectedTeam = teams.find(t => t.name === empDept);
            teamId = selectedTeam ? selectedTeam.id : null;
          } else if (role === "Team Leader") {
            const myTeam = teamLeaders.find(tl => tl.email === email || tl.name === email || (tl as any).teamId !== null);
            teamId = (myTeam as any)?.teamId || null;
          }
          assignUserRoleAndTeam(editingId, "EMPLOYEE", teamId)
            .then(() => {
              alert("Employee team updated successfully!");
              refreshUsers();
            })
            .catch((err) => {
              alert(err.message || "Failed to assign employee to team.");
            });
        } else {
          alert("New employee registration must be done via the Sign Up screen.");
        }
      } else {
        if (editingId) {
          setEmployees(employees.map(emp => emp.id === editingId ? { ...emp, name: empName, email: empEmail, department: empDept } : emp));
        } else {
          const newEmp: Employee = {
            id: "e" + Date.now().toString(),
            name: empName,
            email: empEmail,
            department: empDept
          };
          setEmployees([...employees, newEmp]);
        }
      }
    } else if (modalType === "teamLeader") {
      if (editingId) {
        setTeamLeaders(teamLeaders.map(tl => tl.id === editingId ? { ...tl, name: tlName, email: tlEmail, teamName: tlTeam } : tl));
      } else {
        const newTl: TeamLeader = {
          id: "tl" + Date.now().toString(),
          name: tlName,
          email: tlEmail,
          teamName: tlTeam
        };
        setTeamLeaders([...teamLeaders, newTl]);
      }
    }

    setIsModalOpen(false);
  };

  // Delete Handlers
  const handleDelete = (type: "task" | "employee" | "teamLeader", id: string) => {
    if (confirm("Are you sure you want to delete this item?")) {
      if (type === "task") {
        if (!API_CONFIG.USE_MOCK_API) {
          deleteBackendTask(id)
            .then(() => {
              alert("Task deleted successfully!");
              refreshTasks();
            })
            .catch((err) => alert(err.message || "Failed to delete task."));
        } else {
          setTasks(tasks.filter(t => t.id !== id));
        }
      } else if (type === "employee") {
        setEmployees(employees.filter(emp => emp.id !== id));
      } else if (type === "teamLeader") {
        setTeamLeaders(teamLeaders.filter(tl => tl.id !== id));
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 w-full flex flex-col">
      {/* Premium Navigation Header */}
      <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-md">
              L
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800 leading-tight">Logisoft-HR</h1>
              <p className="text-xs text-slate-500 font-medium">Enterprise Management Portal</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-sm font-semibold text-slate-700">{email}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold mt-0.5 ${
                role === "Manager" ? "bg-purple-100 text-purple-700 border border-purple-200" :
                role === "Team Leader" ? "bg-indigo-100 text-indigo-700 border border-indigo-200" :
                "bg-blue-100 text-blue-700 border border-blue-200"
              }`}>
                {role}
              </span>
            </div>
            <button
              onClick={onLogout}
              className="px-4 py-2 border border-slate-300 text-slate-600 rounded-lg hover:bg-slate-50 font-medium transition cursor-pointer"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Dashboard Layout */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full">
        {/* Premium Welcome Banner */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 rounded-2xl p-6 md:p-8 text-white shadow-lg mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
          {/* Background glow effects */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-60 h-60 bg-white/5 rounded-full blur-2xl -ml-20 -mb-20 pointer-events-none"></div>
          
          <div className="relative z-1">
            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">Welcome back, {email.split("@")[0]}!</h2>
            <p className="text-blue-100 mt-2 font-medium">Manage tasks, assign teams, and coordinate workspace activities smoothly.</p>
          </div>
          <div className="relative z-1 flex gap-3">
            <span className="px-4 py-2 bg-white/20 backdrop-blur-md rounded-xl text-sm font-bold border border-white/10 shadow-sm">
              Role: {role}
            </span>
          </div>
        </div>

        {/* Stats Section */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Active Tasks</p>
              <h3 className="text-3xl font-extrabold text-slate-900 mt-1">{tasks.length}</h3>
            </div>
            <div className="p-3 bg-blue-50 text-blue-600 rounded-lg font-semibold text-xl">📋</div>
          </div>

          {canViewEmployees && (
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Employees</p>
                <h3 className="text-3xl font-extrabold text-slate-900 mt-1">{employees.length}</h3>
              </div>
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg font-semibold text-xl">👤</div>
            </div>
          )}

          {canViewTeamLeaders && (
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Team Leaders</p>
                <h3 className="text-3xl font-extrabold text-slate-900 mt-1">{teamLeaders.length}</h3>
              </div>
              <div className="p-3 bg-purple-50 text-purple-600 rounded-lg font-semibold text-xl">👑</div>
            </div>
          )}
        </section>

        {/* Tab Controls & Actions bar */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-6 py-4 border-b border-slate-200 gap-4 bg-slate-50/50">
            <div className="flex border border-slate-200 rounded-lg overflow-hidden bg-white p-1 max-w-max">
              <button
                onClick={() => setActiveTab("tasks")}
                className={`px-4 py-2 text-sm font-semibold rounded-md transition cursor-pointer ${
                  activeTab === "tasks" ? "bg-blue-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                Tasks
              </button>
              {canViewEmployees && (
                <button
                  onClick={() => setActiveTab("employees")}
                  className={`px-4 py-2 text-sm font-semibold rounded-md transition cursor-pointer ${
                    activeTab === "employees" ? "bg-blue-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  Employees
                </button>
              )}
              {canViewTeamLeaders && (
                <button
                  onClick={() => setActiveTab("teamLeaders")}
                  className={`px-4 py-2 text-sm font-semibold rounded-md transition cursor-pointer ${
                    activeTab === "teamLeaders" ? "bg-blue-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  Team Leaders
                </button>
              )}
            </div>

            {/* Contextual Action Button */}
            <div>
              {activeTab === "tasks" && canEditTasks && (
                <button
                  onClick={() => openAddModal("task")}
                  className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-sm transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span className="text-lg font-bold">+</span> Add Task
                </button>
              )}
              {activeTab === "employees" && canEditEmployees && (
                <button
                  onClick={() => openAddModal("employee")}
                  className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-sm transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span className="text-lg font-bold">+</span> Add Employee
                </button>
              )}
              {activeTab === "teamLeaders" && canEditTeamLeaders && (
                <button
                  onClick={() => openAddModal("teamLeader")}
                  className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-sm transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span className="text-lg font-bold">+</span> Add Team Leader
                </button>
              )}
            </div>
          </div>

          {/* List Content */}
          <div className="p-6">
            {activeTab === "tasks" && (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead>
                    <tr className="text-left text-xs font-bold text-slate-400 uppercase tracking-wider">
                      <th className="pb-4">Task Info</th>
                      <th className="pb-4">Assignee</th>
                      <th className="pb-4">Status</th>
                      {canEditTasks && <th className="pb-4 text-right">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700 text-sm">
                    {tasks.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-slate-400">
                          No tasks available.
                        </td>
                      </tr>
                    ) : (
                      tasks.map((task) => (
                        <tr key={task.id} className="hover:bg-slate-50/55 transition-colors">
                          <td className="py-4 pr-4">
                            <div className="font-semibold text-slate-800">{task.title}</div>
                            <div className="text-xs text-slate-400 mt-0.5">{task.description}</div>
                          </td>
                          <td className="py-4 pr-4 text-slate-600 font-medium">{task.assigneeName || "Unassigned"}</td>
                          <td className="py-4 pr-4">
                            {!API_CONFIG.USE_MOCK_API && role === "Employee" ? (
                              <select
                                value={task.status}
                                onChange={(e) => {
                                  const newStatus = e.target.value;
                                  updateTaskStatus(task.id, newStatus)
                                    .then(() => {
                                      alert("Task status updated successfully!");
                                      refreshTasks();
                                    })
                                    .catch((err) => alert(err.message || "Failed to update status"));
                                }}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold border outline-none bg-white cursor-pointer ${
                                  task.status === "Completed" ? "text-emerald-700 border-emerald-200 bg-emerald-50/20" :
                                  task.status === "In Progress" ? "text-amber-700 border-amber-200 bg-amber-50/20" :
                                  "text-slate-600 border-slate-200 bg-slate-50/20"
                                }`}
                              >
                                <option value="Pending">Pending</option>
                                <option value="In Progress">In Progress</option>
                                <option value="Completed">Completed</option>
                              </select>
                            ) : (
                              <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold border ${
                                task.status === "Completed" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                                task.status === "In Progress" ? "bg-amber-50 text-amber-700 border-amber-200" :
                                "bg-slate-100 text-slate-600 border-slate-200"
                              }`}>
                                {task.status}
                              </span>
                            )}
                          </td>
                          {canEditTasks && (
                            <td className="py-4 text-right whitespace-nowrap">
                              <button
                                onClick={() => openEditModal("task", task)}
                                className="text-blue-600 hover:text-blue-800 font-semibold mr-4 cursor-pointer"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDelete("task", task.id)}
                                className="text-rose-600 hover:text-rose-800 font-semibold cursor-pointer"
                              >
                                Delete
                              </button>
                            </td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === "employees" && canViewEmployees && (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead>
                    <tr className="text-left text-xs font-bold text-slate-400 uppercase tracking-wider">
                      <th className="pb-4">Name</th>
                      <th className="pb-4">Email</th>
                      <th className="pb-4">Tasks</th>
                      {canEditEmployees && <th className="pb-4 text-right">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700 text-sm">
                    {employees.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-slate-400">
                          No employees registered.
                        </td>
                      </tr>
                    ) : (
                      employees.map((emp) => {
                        const empTasks = tasks.filter(t => t.assigneeName === emp.name);
                        return (
                          <tr key={emp.id} className="hover:bg-slate-50/55 transition-colors">
                            <td className="py-4 pr-4 font-semibold text-slate-800">{emp.name}</td>
                            <td className="py-4 pr-4 text-slate-500 font-medium">{emp.email}</td>
                            <td className="py-4 pr-4 text-slate-600">
                              {empTasks.length === 0 ? (
                                <span className="text-slate-400 italic text-xs">No tasks</span>
                              ) : (
                                <div className="flex flex-wrap gap-1.5 max-w-xs">
                                  {empTasks.map(t => (
                                    <span key={t.id} className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${
                                      t.status === "Completed" ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                                      t.status === "In Progress" ? "bg-amber-50 text-amber-700 border-amber-100" :
                                      "bg-slate-50 text-slate-600 border-slate-100"
                                    }`} title={t.description}>
                                      {t.title}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </td>
                            {canEditEmployees && (
                            <td className="py-4 text-right whitespace-nowrap">
                              <button
                                onClick={() => openEditModal("employee", emp)}
                                className="text-blue-600 hover:text-blue-800 font-semibold mr-4 cursor-pointer"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDelete("employee", emp.id)}
                                className="text-rose-600 hover:text-rose-800 font-semibold cursor-pointer"
                              >
                                Delete
                              </button>
                            </td>
                            )}
                        </tr>
                      );
                    })
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === "teamLeaders" && canViewTeamLeaders && (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead>
                    <tr className="text-left text-xs font-bold text-slate-400 uppercase tracking-wider">
                      <th className="pb-4">Name</th>
                      <th className="pb-4">Email</th>
                      <th className="pb-4">Team Designation</th>
                      <th className="pb-4">Team Members</th>
                      {canEditTeamLeaders && <th className="pb-4 text-right">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700 text-sm">
                    {teamLeaders.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-400">
                          No team leaders registered.
                        </td>
                      </tr>
                    ) : (
                      teamLeaders.map((tl) => {
                        const ledEmployees = employees.filter(
                          (emp) => emp.department === tl.teamName && tl.teamName !== "Unassigned"
                        );
                        return (
                          <tr key={tl.id} className="hover:bg-slate-50/55 transition-colors">
                            <td className="py-4 pr-4 font-semibold text-slate-800">{tl.name}</td>
                            <td className="py-4 pr-4 text-slate-500 font-medium">{tl.email}</td>
                            <td className="py-4 pr-4 text-slate-600">{tl.teamName}</td>
                            <td className="py-4 pr-4 text-slate-600 font-medium">
                              {ledEmployees.length === 0 ? (
                                <span className="text-slate-400 italic text-xs">No employees assigned</span>
                              ) : (
                                <div className="flex flex-wrap gap-1">
                                  {ledEmployees.map((emp) => (
                                    <span
                                      key={emp.id}
                                      className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-100"
                                    >
                                      {emp.name}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </td>
                            {canEditTeamLeaders && (
                            <td className="py-4 text-right whitespace-nowrap">
                              <button
                                onClick={() => openEditModal("teamLeader", tl)}
                                className="text-blue-600 hover:text-blue-800 font-semibold mr-4 cursor-pointer"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDelete("teamLeader", tl.id)}
                                className="text-rose-600 hover:text-rose-800 font-semibold cursor-pointer"
                              >
                                Delete
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Overlay Modal for Adding/Editing */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md border border-slate-100 overflow-hidden transform scale-100 transition-all duration-300">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-lg">
                {editingId ? "Edit" : "Add"} {modalType === "task" ? "Task" : modalType === "employee" ? "Employee" : "Team Leader"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-xl cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
              {modalType === "task" && (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-slate-600 mb-1">Title</label>
                    <input
                      type="text"
                      value={taskTitle}
                      onChange={(e) => setTaskTitle(e.target.value)}
                      required
                      placeholder="Task title"
                      className="w-full border border-slate-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-600 mb-1">Description</label>
                    <textarea
                      value={taskDesc}
                      onChange={(e) => setTaskDesc(e.target.value)}
                      placeholder="Task details"
                      rows={3}
                      className="w-full border border-slate-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-600 mb-1">Status</label>
                    <select
                      value={taskStatus}
                      onChange={(e: any) => setTaskStatus(e.target.value)}
                      className="w-full border border-slate-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      <option value="Pending">Pending</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Completed">Completed</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-600 mb-1">Assignee</label>
                    <select
                      value={taskAssignee}
                      onChange={(e) => setTaskAssignee(e.target.value)}
                      className="w-full border border-slate-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      required
                    >
                      <option value="">-- Select Assignee --</option>
                      {role === "Manager" ? (
                        teamLeaders.map((tl) => (
                          <option key={tl.id} value={tl.name}>
                            {tl.name} (Team Lead: {tl.teamName})
                          </option>
                        ))
                      ) : (
                        employees.map((emp) => (
                          <option key={emp.id} value={emp.name}>
                            {emp.name} (Employee)
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                </>
              )}

              {modalType === "employee" && (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-slate-600 mb-1">Full Name</label>
                    <input
                      type="text"
                      value={empName}
                      onChange={(e) => setEmpName(e.target.value)}
                      required
                      placeholder="Employee name"
                      className="w-full border border-slate-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-600 mb-1">Email</label>
                    <input
                      type="email"
                      value={empEmail}
                      onChange={(e) => setEmpEmail(e.target.value)}
                      required
                      placeholder="employee@company.com"
                      className="w-full border border-slate-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-600 mb-1">
                      {API_CONFIG.USE_MOCK_API ? "Department" : "Assigned Team"}
                    </label>
                    {API_CONFIG.USE_MOCK_API ? (
                      <input
                        type="text"
                        value={empDept}
                        onChange={(e) => setEmpDept(e.target.value)}
                        required
                        placeholder="Engineering, Design, HR, etc."
                        className="w-full border border-slate-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    ) : (
                      <select
                        value={empDept}
                        onChange={(e) => setEmpDept(e.target.value)}
                        className="w-full border border-slate-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        required
                      >
                        <option value="Unassigned">-- Unassigned --</option>
                        {role === "Manager" ? (
                          teams.map((t) => (
                            <option key={t.id} value={t.name}>
                              {t.name} (Lead: {t.leader_name || "None"})
                            </option>
                          ))
                        ) : (
                          // Team Leads can only assign to the team they lead
                          (() => {
                            const myTeam = teamLeaders.find(tl => tl.email === email || tl.name === email || (tl as any).teamId !== null);
                            return myTeam ? (
                              <option key={(myTeam as any).teamId} value={myTeam.teamName}>
                                {myTeam.teamName}
                              </option>
                            ) : null;
                          })()
                        )}
                      </select>
                    )}
                  </div>
                </>
              )}

              {modalType === "teamLeader" && (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-slate-600 mb-1">Full Name</label>
                    <input
                      type="text"
                      value={tlName}
                      onChange={(e) => setTlName(e.target.value)}
                      required
                      placeholder="Team Leader name"
                      className="w-full border border-slate-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-600 mb-1">Email</label>
                    <input
                      type="email"
                      value={tlEmail}
                      onChange={(e) => setTlEmail(e.target.value)}
                      required
                      placeholder="lead@company.com"
                      className="w-full border border-slate-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-600 mb-1">Team Designation</label>
                    <input
                      type="text"
                      value={tlTeam}
                      onChange={(e) => setTlTeam(e.target.value)}
                      required
                      placeholder="Frontend Team, Security Team, etc."
                      className="w-full border border-slate-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </>
              )}

              <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-slate-500 hover:text-slate-700 font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition cursor-pointer"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end">
        {isChatOpen && (
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-96 h-[460px] flex flex-col overflow-hidden mb-4 transition-all duration-300 ease-out transform scale-100 origin-bottom-right">
            
            {/* Main Chat Container */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Header */}
              <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span className="font-bold text-sm">
                    {activeSessionId ? `Chat #${activeSessionId}` : "HR AI Assistant"}
                  </span>
                </div>
                <div className="flex items-center gap-2.5">
                  <button 
                    onClick={startNewChat}
                    className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-200 px-2 py-0.5 rounded transition cursor-pointer font-medium"
                    title="Clear current conversation"
                  >
                    Clear
                  </button>
                  <button 
                    onClick={() => setIsChatOpen(false)}
                    className="text-slate-400 hover:text-white transition text-xl font-bold cursor-pointer"
                  >
                    &times;
                  </button>
                </div>
              </div>

              {/* Messages body */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-50 flex flex-col">
                {chatMessages.map((msg, index) => (
                  <div 
                    key={index}
                    className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}
                  >
                    <div className={`px-3.5 py-2 rounded-xl text-sm shadow-sm ${
                      msg.sender === "user" 
                        ? "bg-blue-600 text-white rounded-tr-none" 
                        : "bg-white text-slate-800 border border-slate-200 rounded-tl-none"
                    }`}>
                      {msg.text}
                    </div>
                    <span className="text-[9px] text-slate-400 mt-1 px-1">
                      {msg.time}
                    </span>
                  </div>
                ))}
                {isBotTyping && (
                  <div className="flex flex-col items-start animate-pulse">
                    <div className="bg-white text-slate-500 border border-slate-200 px-3.5 py-2.5 rounded-xl rounded-tl-none text-xs shadow-sm flex items-center gap-2">
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-slate-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-slate-500"></span>
                      </span>
                      <span>AI is thinking... (fetching database and website sources)</span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input footer */}
              <form onSubmit={handleSendChatMessage} className="p-3 bg-white border-t border-slate-100 flex items-center gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder={isBotTyping ? "AI is processing your query..." : "Ask me anything..."}
                  disabled={isBotTyping}
                  className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition disabled:bg-slate-50 disabled:text-slate-400"
                />
                <button
                  type="submit"
                  disabled={isBotTyping}
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-3.5 py-2 text-sm font-semibold transition cursor-pointer flex items-center justify-center disabled:bg-slate-300 disabled:cursor-not-allowed"
                >
                  {isBotTyping ? "..." : "Send"}
                </button>
              </form>
            </div>

          </div>
        )}

        {/* Chat Toggle Button */}
        <button
          onClick={() => setIsChatOpen(!isChatOpen)}
          className={`h-14 w-14 rounded-full relative flex items-center justify-center shadow-lg transition-all duration-300 hover:scale-105 cursor-pointer ${
            isChatOpen ? "bg-slate-900 text-white" : "bg-blue-600 text-white"
          }`}
          title="Chat with HR Assistant"
        >
          {/* Chat Icon SVG */}
          <svg
            className={`w-6 h-6 absolute transition-all duration-150 transform ${
              isChatOpen ? "opacity-0 scale-75 rotate-90" : "opacity-100 scale-100 rotate-0"
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>

          {/* Close Icon SVG */}
          <svg
            className={`w-6 h-6 absolute transition-all duration-150 transform ${
              isChatOpen ? "opacity-100 scale-100 rotate-0" : "opacity-0 scale-75 -rotate-90"
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
