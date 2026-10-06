import { cn } from "@/lib/cn";

/** Microdato mono del lenguaje visual SIRID (isotipo DVL): `DVL / RESERVE_01`. */
export function TechnicalLabel({
  children,
  className,
  as: Tag = "span",
}: {
  children: React.ReactNode;
  className?: string;
  as?: "span" | "p" | "div";
}) {
  return (
    <Tag
      className={cn(
        "font-mono text-[10px] uppercase leading-[1.3] tracking-[0.18em] text-olive",
        className,
      )}
    >
      {children}
    </Tag>
  );
}
