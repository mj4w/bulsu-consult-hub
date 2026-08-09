import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Button({ className, variant = "default", size = "default", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "default" | "ghost"; size?: "default" | "icon" }) {
  return <button className={cn("inline-flex items-center justify-center rounded-lg text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50", variant === "ghost" ? "hover:bg-accent hover:text-accent-foreground" : "bg-primary text-primary-foreground hover:bg-primary/90", size === "icon" ? "size-9" : "h-10 px-4 py-2", className)} {...props} />;
}
