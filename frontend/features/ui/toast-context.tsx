"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { X } from "lucide-react";

import { cn } from "@/lib/cn";

type ToastTone = "info" | "success" | "error";

type Toast = { id: number; message: string; tone: ToastTone };

type ToastContextValue = {
  notify: (message: string, tone?: ToastTone) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const TONE_STYLES: Record<ToastTone, string> = {
  info: "border-charcoal bg-charcoal text-ivory",
  success: "border-state-confirmed bg-state-confirmed text-ivory",
  error: "border-state-error bg-state-error text-ivory",
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const notify = useCallback((message: string, tone: ToastTone = "info") => {
    const id = Date.now() + Math.random();
    setToasts((current) => [...current.slice(-1), { id, message, tone }]);
    setTimeout(() => setToasts((current) => current.filter((t) => t.id !== id)), 5000);
  }, []);

  const value = useMemo(() => ({ notify }), [notify]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* `aria-live` para que un lector de pantalla anuncie el resultado. */}
      <div
        aria-live="polite"
        className="pointer-events-none fixed bottom-6 right-6 z-50 flex w-[min(24rem,calc(100vw-3rem))] flex-col gap-2"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cn(
              "pointer-events-auto flex animate-dvl-reveal items-start gap-3 rounded-2xl border py-3 pl-4 pr-2 text-sm shadow-sm",
              TONE_STYLES[toast.tone],
            )}
          >
            <span className="min-w-0 flex-1 self-center">{toast.message}</span>
            <button type="button" aria-label="Cerrar notificación" onClick={() => setToasts((current) => current.filter((item) => item.id !== toast.id))}
              className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-xl hover:opacity-70">
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast debe usarse dentro de ToastProvider");
  return context;
}
