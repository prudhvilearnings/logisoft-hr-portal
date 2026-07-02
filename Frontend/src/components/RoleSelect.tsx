const roles = [
  "Employee",
  "Team Leader",
  "Manager",
];

interface RoleSelectProps {
  value: string;
  onChange: (value: string) => void;
}

export default function RoleSelect({ value, onChange }: RoleSelectProps) {
  return (
    <div className="mb-4">
      <label className="block mb-2 font-medium">
        Role
      </label>

      <select
        className="w-full border rounded-lg p-3"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {roles.map((role) => (
          <option key={role}>
            {role}
          </option>
        ))}
      </select>
    </div>
  );
}