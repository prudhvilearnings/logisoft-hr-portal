import type { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
}

export default function Card({ children }: CardProps) {
  return (
    <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md">
      {children}
    </div>
  );
}