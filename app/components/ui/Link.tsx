import Link, { LinkProps } from "next/link";
import React from "react";
import clsx from "clsx";

interface ButtonProps extends LinkProps {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "outline";
}

export function Button({
  children,
  className,
  variant = "default",
  ...props
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center rounded-md px-5 py-2 text-sm font-medium transition";

  const variants = {
    default: "bg-red-600 text-white hover:bg-red-700",
    outline:
      "border border-white text-white hover:bg-white hover:text-slate-900",
  };

  return (
    <Link className={clsx(base, variants[variant], className)} {...props}>
      {children}
    </Link>
  );
}
