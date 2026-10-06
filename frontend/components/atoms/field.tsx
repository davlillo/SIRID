import { cn } from "@/lib/cn";

/** Campo base: label asociado, altura 44-48px y foco terracota. */
export function Field({
  label,
  hint,
  error,
  htmlFor,
  children,
  className,
}: {
  label: string;
  hint?: string;
  error?: string;
  htmlFor: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label
        htmlFor={htmlFor}
        className="font-mono text-[10px] uppercase tracking-[0.16em] text-olive"
      >
        {label}
      </label>
      {children}
      {hint && !error ? <p className="text-xs text-charcoal/60">{hint}</p> : null}
      {error ? (
        <p role="alert" className="text-xs font-medium text-state-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}

const CONTROL =
  "min-h-11 w-full border border-charcoal/25 bg-ivory px-3 text-sm text-charcoal outline-none transition-colors duration-fast focus:border-terracotta disabled:opacity-50";

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(CONTROL, className)} {...props} />;
}

export function Select({
  className,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(CONTROL, "py-2", className)} {...props} />;
}

export function Textarea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(CONTROL, "min-h-24 py-2.5 leading-6", className)} {...props} />;
}
