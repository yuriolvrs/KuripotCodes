"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { AlertCircle, CheckCircle2, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Toast {
  id: number;
  title: string;
  variant: "default" | "success" | "error";
}

interface ToastOptions {
  title: string;
  variant?: Toast["variant"];
}

interface ToastContextValue {
  toast: (options: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let nextId = 1;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    ({ title, variant = "default" }: ToastOptions) => {
      const id = nextId++;
      setToasts((prev) => [...prev, { id, title, variant }]);
      setTimeout(() => dismiss(id), 4000);
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4 sm:items-end sm:px-6">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={cn(
              "pointer-events-auto flex w-full max-w-sm items-start gap-2 rounded-md border bg-popover px-3 py-2.5 text-sm text-popover-foreground shadow-lg",
              t.variant === "success" && "border-emerald-300 dark:border-emerald-800",
              t.variant === "error" && "border-red-300 dark:border-red-800"
            )}
          >
            {t.variant === "success" && <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />}
            {t.variant === "error" && <AlertCircle className="mt-0.5 size-4 shrink-0 text-red-600" />}
            <span className="flex-1 text-foreground">{t.title}</span>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              className="rounded p-0.5 text-muted-foreground hover:bg-muted"
              aria-label="Dismiss"
            >
              <X className="size-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}
