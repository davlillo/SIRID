"use client";

import { useEffect, useId, useRef } from "react";

import { Button } from "@/components/atoms/button";

/** Modal accesible basado en <dialog>: foco atrapado, Escape y clic fuera para cerrar. */
export function Modal({
  open,
  title,
  onClose,
  showHeaderClose = true,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  /** Ocultar si el contenido ya incluye Cancelar u otra acción de cierre. */
  showHeaderClose?: boolean;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
      className="m-auto max-h-[calc(100dvh-2rem)] w-[min(40rem,calc(100vw-2rem))] overflow-y-auto rounded-2xl border border-charcoal/20 bg-ivory p-0 text-charcoal shadow-2xl backdrop:bg-black/55"
    >
      {open ? (
        <div className="p-5 sm:p-7">
          <div
            className={
              showHeaderClose
                ? "flex items-start justify-between gap-4"
                : "flex items-start gap-4"
            }
          >
            <h2 id={titleId} className="font-display text-2xl font-semibold">
              {title}
            </h2>
            {showHeaderClose ? (
              <Button type="button" variant="ghost" size="sm" onClick={onClose}>
                Cerrar
              </Button>
            ) : null}
          </div>
          <div className="mt-5">{children}</div>
        </div>
      ) : null}
    </dialog>
  );
}
