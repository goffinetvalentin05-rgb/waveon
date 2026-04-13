"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";

type ToastKind = "success" | "error";

export type ToastInput = {
  message: string;
  kind?: ToastKind;
};

type ToastItem = ToastInput & { id: string };

type ToastContextValue = {
  push: (t: ToastInput) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const push = useCallback((t: ToastInput) => {
    const id = crypto.randomUUID();
    const item: ToastItem = { id, kind: t.kind ?? "success", message: t.message };
    setItems((prev) => [...prev, item]);
    const tid = setTimeout(() => {
      setItems((prev) => prev.filter((x) => x.id !== id));
      timers.current.delete(id);
    }, 4200);
    timers.current.set(id, tid);
  }, []);

  const value = useMemo(() => ({ push }), [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed bottom-6 right-4 z-[100] flex max-w-[min(100vw-2rem,24rem)] flex-col gap-2 sm:right-8"
        aria-live="polite"
      >
        {items.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto rounded-xl border px-4 py-3 text-sm shadow-lg backdrop-blur-md transition-all duration-300 motion-safe:translate-y-0 motion-safe:opacity-100 ${
              t.kind === "error"
                ? "border-red-500/35 bg-red-950/90 text-red-100"
                : "border-emerald-500/35 bg-emerald-950/90 text-emerald-50"
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast requires ToastProvider");
  return ctx;
}
