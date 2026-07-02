import { useState } from "react";
import Header from "./components/Header";
import Card from "./components/Card";
import RoleSelect from "./components/RoleSelect";
import Input from "./components/Input";
import PasswordInput from "./components/PasswordInput";
import Button from "./components/Button";
import Dashboard from "./components/Dashboard";

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [role, setRole] = useState("Employee");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      alert("Please enter your email.");
      return;
    }
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setEmail("");
    setPassword("");
    setRole("Employee");
  };

  if (isLoggedIn) {
    return <Dashboard role={role} email={email} onLogout={handleLogout} />;
  }

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <Card>
        <Header
          title="Logisoft-HR Portal"
          subtitle="Sign in to continue"
        />

        <form onSubmit={handleLogin} className="space-y-4">
          <RoleSelect value={role} onChange={setRole} />

          <Input
            label="Email"
            type="email"
            placeholder="Enter your email"
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
              text="Sign Up"
              variant="secondary"
              type="button"
              onClick={() => alert("Sign up functionality coming soon!")}
            />
          </div>
        </form>
      </Card>
    </div>
  );
}