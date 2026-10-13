import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

type IconActionVariant = "default" | "danger" | "primary";

export function IconAction({
  label,
  children,
  variant = "default",
  size = "md",
  disabled,
  onClick,
}: {
  label: string;
  children: ReactNode;
  variant?: IconActionVariant;
  size?: "md" | "sm";
  disabled?: boolean;
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex shrink-0 items-center justify-center border transition-colors duration-fast",
        size === "sm" ? "min-h-8 min-w-8" : "min-h-9 min-w-9",
        "disabled:cursor-not-allowed disabled:opacity-45",
        variant === "danger" &&
          "border-state-error/40 text-state-error hover:bg-state-error hover:text-ivory",
        variant === "primary" &&
          "border-terracotta bg-terracotta text-ivory hover:border-coffee hover:bg-coffee",
        variant === "default" &&
          "border-charcoal/25 text-charcoal hover:border-charcoal hover:bg-sand",
      )}
    >
      {children}
    </button>
  );
}
