import { cn } from "@/lib/cn";
import { STATUS_LABEL } from "@/lib/format";
import type { ReservationStatus, SlotStatus } from "@/lib/types";

/**
 * Estados de reserva segun spect/13. El color acompaña al texto: nunca se
 * comunica un estado solo por color.
 */
const RESERVATION_STYLES: Record<ReservationStatus, string> = {
  PENDING: "border-sand bg-sand text-coffee",
  CONFIRMED: "border-state-confirmed bg-state-confirmed text-ivory",
  CANCELLED: "border-charcoal/30 bg-transparent text-charcoal/60",
  COMPLETED: "border-coffee bg-coffee text-ivory",
};

export function StatusBadge({
  status,
  className,
}: {
  status: ReservationStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em]",
        RESERVATION_STYLES[status],
        className,
      )}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

const SLOT_LABEL: Record<SlotStatus, string> = {
  AVAILABLE: "Disponible",
  BUSY: "Ocupado",
  PAST: "Pasado",
};

const SLOT_STYLES: Record<SlotStatus, string> = {
  AVAILABLE: "border-olive bg-olive text-ivory",
  BUSY: "border-charcoal bg-charcoal text-ivory",
  PAST: "border-charcoal/25 bg-transparent text-charcoal/50",
};

export function SlotBadge({ status }: { status: SlotStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em]",
        SLOT_STYLES[status],
      )}
    >
      {SLOT_LABEL[status]}
    </span>
  );
}
