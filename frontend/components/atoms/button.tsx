import { cva, type VariantProps } from "class-variance-authority";
import Link from "next/link";

import { cn } from "@/lib/cn";

/**
 * Boton del design system DVL (producto SIRID).
 * Terracota solido para la accion principal, borde carbon para la secundaria.
 * Sin gradientes; altura minima 44px por accesibilidad tactil.
 */
const button = cva(
  "inline-flex min-h-11 items-center justify-center gap-2 border text-sm font-semibold transition-colors duration-fast ease-technical disabled:cursor-not-allowed disabled:opacity-45",
  {
    variants: {
      variant: {
        primary: "border-terracotta bg-terracotta text-ivory hover:bg-coffee hover:border-coffee",
        secondary: "border-charcoal bg-transparent text-charcoal hover:bg-sand",
        ghost: "border-transparent bg-transparent text-charcoal hover:bg-sand",
        danger: "border-state-error bg-transparent text-state-error hover:bg-state-error hover:text-ivory",
        inverse: "border-ivory bg-transparent text-ivory hover:bg-ivory hover:text-charcoal",
      },
      size: {
        sm: "px-3 py-1.5 text-xs",
        md: "px-5 py-2.5",
        lg: "px-7 py-3.5 text-base",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

type ButtonVariants = VariantProps<typeof button>;

export function Button({
  className,
  variant,
  size,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & ButtonVariants) {
  return <button className={cn(button({ variant, size }), className)} {...props} />;
}

export function ButtonLink({
  href,
  className,
  variant,
  size,
  ...props
}: React.ComponentProps<typeof Link> & ButtonVariants) {
  return <Link href={href} className={cn(button({ variant, size }), className)} {...props} />;
}
