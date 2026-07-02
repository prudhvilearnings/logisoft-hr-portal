interface ButtonProps {
  text: string;
  variant?: "primary" | "secondary";
  type?: "button" | "submit" | "reset";
  onClick?: () => void;
  className?: string;
}

export default function Button({
  text,
  variant = "primary",
  type = "button",
  onClick,
  className = "",
}: ButtonProps) {
  const styles =
    variant === "primary"
      ? "bg-blue-600 text-white hover:bg-blue-700"
      : "border border-blue-600 text-blue-600 hover:bg-blue-50";

  return (
    <button
      type={type}
      onClick={onClick}
      className={`w-full py-3 rounded-lg transition cursor-pointer ${styles} ${className}`}
    >
      {text}
    </button>
  );
}