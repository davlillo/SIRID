import { cn } from "@/lib/cn";
import { TechnicalLabel } from "./technical-label";

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      role="status"
      aria-label="Cargando"
      className={cn(
        "inline-block h-4 w-4 animate-spin rounded-full border-2 border-charcoal/25 border-t-terracotta",
        className,
      )}
    />
  );
}

export function LoadingBlock({ label = "Cargando datos" }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 border border-charcoal/15 bg-sand/30 px-5 py-8">
      <Spinner />
      <TechnicalLabel>{label}</TechnicalLabel>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="technical-grid border border-dashed border-charcoal/30 px-6 py-14 text-center">
      <TechnicalLabel>EMPTY_STATE</TechnicalLabel>
      <h3 className="mt-3 font-display text-2xl font-semibold">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-charcoal/65">{description}</p>
      {action ? <div className="mt-6 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function ErrorState({
  title = "Algo no salio bien",
  description,
  action,
}: {
  title?: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div
      role="alert"
      className="border-l-4 border-state-error border-y border-r border-y-charcoal/15 border-r-charcoal/15 bg-ivory px-6 py-6"
    >
      <TechnicalLabel className="text-state-error">ERROR</TechnicalLabel>
      <h3 className="mt-2 font-display text-xl font-semibold">{title}</h3>
      <p className="mt-2 max-w-xl text-sm leading-6 text-charcoal/70">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
