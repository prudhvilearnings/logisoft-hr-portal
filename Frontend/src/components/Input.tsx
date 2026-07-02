interface InputProps {
  label: string;
  type?: string;
  placeholder?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  required?: boolean;
}

export default function Input({
  label,
  type = "text",
  placeholder,
  value,
  onChange,
  required,
}: InputProps) {
  return (
    <div className="mb-4">
      <label className="block mb-2 font-medium">
        {label}
      </label>

      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        required={required}
        className="w-full border rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );
}