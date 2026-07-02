import { useState } from "react";

interface PasswordInputProps {
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  required?: boolean;
}

export default function PasswordInput({
  value,
  onChange,
  required,
}: PasswordInputProps) {
  const [show, setShow] = useState(false);

  return (
    <div className="mb-4">
      <label className="block mb-2 font-medium">
        Password
      </label>

      <div className="flex border rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500">
        <input
          type={show ? "text" : "password"}
          placeholder="Enter password"
          value={value}
          onChange={onChange}
          required={required}
          className="flex-1 p-3 outline-none"
        />

        <button
          type="button"
          onClick={() => setShow(!show)}
          className="px-4 bg-gray-100 hover:bg-gray-200 cursor-pointer"
        >
          {show ? "🙈" : "👁"}
        </button>
      </div>
    </div>
  );
}