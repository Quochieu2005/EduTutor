import { type ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
}

const variants = {
  primary: "bg-blue-600 text-white hover:bg-blue-700",
  secondary: "bg-purple-600 text-white hover:bg-purple-700",
  outline: "border-2 border-blue-600 text-blue-600 hover:bg-blue-50",
  ghost: "text-blue-600 hover:bg-blue-50",
  danger: "bg-red-600 text-white hover:bg-red-700",
};

const sizes = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2",
  lg: "px-6 py-3 text-lg",
};

export function Button({
  variant = "primary",
  size = "md",
  fullWidth,
  className = "",
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${fullWidth ? "w-full" : ""} ${className}`}
      disabled={disabled}
      {...props}
    />
  );
}
