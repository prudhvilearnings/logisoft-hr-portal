import { useState } from "react";

const roles = [
  "Employee",
  "Team Leader",
  "Manager",
];

export default function LoginForm() {
  const [role, setRole] = useState("Employee");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    console.log({
      role,
      email: (e.target as HTMLFormElement).email.value,
      password: (e.target as HTMLFormElement).password.value,
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md space-y-5"
    >
      <h1 className="text-2xl font-bold text-center">
        Employee Portal
      </h1>

      <select
        className="w-full border rounded-lg p-3"
        value={role}
        onChange={(e) => setRole(e.target.value)}
      >
        {roles.map((r) => (
          <option key={r}>{r}</option>
        ))}
      </select>

      <input
        name="email"
        type="email"
        placeholder="Email"
        className="w-full border rounded-lg p-3"
      />

      <input
        name="password"
        type="password"
        placeholder="Password"
        className="w-full border rounded-lg p-3"
      />

      <button
        className="w-full bg-blue-600 text-white rounded-lg py-3 hover:bg-blue-700"
      >
        Login
      </button>
    </form>
  );
}