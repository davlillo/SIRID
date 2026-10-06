import { cn } from "@/lib/cn";

/**
 * Marca SIRID. El simbolo DVL (Davlillos, la casa que construye el sistema)
 * se conserva como isotipo; el nombre de producto es SIRID.
 */
export function BrandMark({
  className,
  withTagline = false,
  inverse = false,
}: {
  className?: string;
  withTagline?: boolean;
  inverse?: boolean;
}) {
  return (
    <span className={cn("inline-flex flex-col", className)}>
      <span className="inline-flex items-center gap-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={inverse ? "/brand/davlillos-symbol-inverse.svg" : "/brand/davlillos-symbol-primary.svg"}
          alt=""
          aria-hidden="true"
          className="h-7 w-7"
        />
        <span className="font-display text-lg font-bold leading-none tracking-[-0.04em]">
          SIRID
        </span>
      </span>
      {withTagline ? (
        <span
          className={cn(
            "mt-1.5 font-mono text-[10px] uppercase tracking-[0.18em]",
            inverse ? "text-sand" : "text-olive",
          )}
        >
          Ideas que se construyen.
        </span>
      ) : null}
    </span>
  );
}
