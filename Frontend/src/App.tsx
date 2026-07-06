import { useState } from "react";
import Header from "./components/Header";
import Card from "./components/Card";
import RoleSelect from "./components/RoleSelect";
import Input from "./components/Input";
import PasswordInput from "./components/PasswordInput";
import Button from "./components/Button";
import Dashboard from "./components/Dashboard";
import { API_CONFIG } from "./api";

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [role, setRole] = useState("Employee");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Toggle between login and registration
  const [isRegistering, setIsRegistering] = useState(false);

  // Registration state
  const [regUsername, setRegUsername] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regFirstName, setRegFirstName] = useState("");
  const [regLastName, setRegLastName] = useState("");
  const [regRole, setRegRole] = useState("Employee");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      alert("Please enter both username and password.");
      return;
    }

    try {
      const response = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/login/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: email, password: password }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Authentication failed.");
      }

      const data = await response.json();
      localStorage.setItem("accessToken", data.access);
      localStorage.setItem("refreshToken", data.refresh);

      // Map backend role (MANAGER, TEAM_LEAD, EMPLOYEE) to frontend role
      const backendRole = data.user?.role;
      const mappedRole = 
        backendRole === "MANAGER" ? "Manager" :
        backendRole === "TEAM_LEAD" ? "Team Leader" : "Employee";

      setRole(mappedRole);
      setIsLoggedIn(true);
    } catch (err: any) {
      alert(err.message || "Invalid credentials");
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regUsername || !regEmail || !regPassword) {
      alert("Username, email, and password are required.");
      return;
    }

    // Map frontend roles to backend role constants
    const mappedBackendRole = 
      regRole === "Manager" ? "MANAGER" :
      regRole === "Team Leader" ? "TEAM_LEAD" : "EMPLOYEE";

    try {
      const response = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/register/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: regUsername,
          email: regEmail,
          password: regPassword,
          first_name: regFirstName,
          last_name: regLastName,
          role: mappedBackendRole,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        const errMessage = errorData.username?.[0] || errorData.email?.[0] || "Registration failed.";
        throw new Error(errMessage);
      }

      alert("Registration successful! Please sign in with your credentials.");
      // Reset form and toggle to login
      setIsRegistering(false);
      setEmail(regUsername);
      setPassword(regPassword);
      setRegUsername("");
      setRegEmail("");
      setRegPassword("");
      setRegFirstName("");
      setRegLastName("");
    } catch (err: any) {
      alert(err.message || "Registration failed");
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setEmail("");
    setPassword("");
    setRole("Employee");
    localStorage.clear();
  };

  if (isLoggedIn) {
    return <Dashboard role={role} email={email} onLogout={handleLogout} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Elegant background glowing design elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none"></div>
      
      <div className="relative z-10 w-full max-w-md">
        <Card>
        <Header
          title="Logisoft-HR Portal"
          subtitle={isRegistering ? "Create your account" : "Sign in to continue"}
        />

        {isRegistering ? (
          <form onSubmit={handleRegister} className="space-y-4">
            <RoleSelect value={regRole} onChange={setRegRole} />

            <Input
              label="Username"
              type="text"
              placeholder="Enter username"
              value={regUsername}
              onChange={(e) => setRegUsername(e.target.value)}
              required
            />

            <Input
              label="Email"
              type="email"
              placeholder="Enter email"
              value={regEmail}
              onChange={(e) => setRegEmail(e.target.value)}
              required
            />

            <PasswordInput
              value={regPassword}
              onChange={(e) => setRegPassword(e.target.value)}
              required
            />

            <Input
              label="First Name"
              type="text"
              placeholder="Enter first name"
              value={regFirstName}
              onChange={(e) => setRegFirstName(e.target.value)}
            />

            <Input
              label="Last Name"
              type="text"
              placeholder="Enter last name"
              value={regLastName}
              onChange={(e) => setRegLastName(e.target.value)}
            />

            <div className="mt-5 space-y-3 pt-2">
              <Button text="Register Account" type="submit" />

              <Button
                text="Already have an account? Sign In"
                variant="secondary"
                type="button"
                onClick={() => setIsRegistering(false)}
              />
            </div>
          </form>
        ) : (
          <form onSubmit={handleLogin} className="space-y-4">
            <Input
              label="Username"
              type="text"
              placeholder="Enter your username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <PasswordInput
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <div className="mt-5 space-y-3 pt-2">
              <Button text="Login" type="submit" />

              <Button
                text="Create an Account (Sign Up)"
                variant="secondary"
                type="button"
                onClick={() => setIsRegistering(true)}
              />
            </div>
          </form>
        )}
      </Card>
      </div>
    </div>
  );
}