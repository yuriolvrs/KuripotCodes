"use client";

import { createContext, useCallback, useContext, useState } from "react";
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
      setTimeout(() => dismiss(id), 2200);
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-6 z-[200] flex flex-col items-center gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={cn(
              "animate-pop-in pointer-events-auto rounded px-5 py-3 font-mono text-sm tracking-wide text-white shadow-[4px_4px_0_oklch(var(--brand))]",
              t.variant === "error" ? "bg-status-expiring" : "bg-ink"
            )}
          >
            {t.title}
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
