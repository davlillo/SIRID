"use client";

import { useEffect, useRef } from "react";

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

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby="modal-title"
      onClose={onClose}
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
      className="m-auto w-[min(36rem,calc(100vw-2rem))] border border-charcoal bg-ivory p-0 text-charcoal backdrop:bg-charcoal/50"
    >
      {open ? (
        <div className="p-6">
          <div
            className={
              showHeaderClose
                ? "flex items-start justify-between gap-4"
                : "flex items-start gap-4"
            }
          >
            <h2 id="modal-title" className="font-display text-2xl font-semibold">
              {title}
            </h2>
            {showHeaderClose ? (
              <Button type="button" variant="ghost" size="sm" onClick={onClose}>
                Cerrar
              </Button>
            ) : null}
          </div>
          <div className="mt-4 max-h-[60vh] overflow-y-auto">{children}</div>
        </div>
      ) : null}
    </dialog>
  );
}
