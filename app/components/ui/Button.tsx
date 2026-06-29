import * as React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost";
  size?: "sm" | "default" | "lg" | "icon";
}

export function Button({
  className = "",
  variant = "default",
  size = "default",
  ...props
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center rounded-md font-medium transition";

  const variants = {
    default: "bg-red-600 text-white hover:bg-red-700",
    outline:
      "border border-slate-300 bg-white text-slate-900 hover:bg-slate-100",
    ghost:
      "bg-transparent text-slate-700 hover:bg-slate-100 hover:text-slate-900",
  };

  const sizes = {
    sm: "h-8 px-3 text-xs",
    default: "h-10 px-4 text-sm",
    lg: "h-12 px-6 text-base",
    icon: "h-10 w-10 p-0",
  };

  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    />
  );
}
