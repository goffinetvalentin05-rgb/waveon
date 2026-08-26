"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { IconSearch } from "@tabler/icons-react";

type Hit = {
  id: string;
  kind: string;
  label: string;
  href: string;
  context: string;
};

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Hit[]>([]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    const openPalette = () => setOpen(true);
    window.addEventListener("waveone:search", openPalette);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("waveone:search", openPalette);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(async () => {
      if (q.trim().length < 2) {
        setResults([]);
        return;
      }
      const res = await fetch(`/api/search?q=${encodeURIComponent(q.trim())}`);
      const data = await res.json();
      if (res.ok) setResults(data.results ?? []);
    }, 180);
    return () => clearTimeout(t);
  }, [q, open]);

  const go = useCallback(
    (href: string) => {
      setOpen(false);
      setQ("");
      router.push(href);
    },
    [router]
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center px-4 pt-[12vh]">
      <button type="button" className="absolute inset-0 bg-black/65 backdrop-blur-sm" onClick={() => setOpen(false)} />
      <div className="wo-modal relative w-full max-w-xl overflow-hidden shadow-2xl">
        <div className="flex items-center gap-2 border-b border-wo-border px-4">
          <IconSearch className="h-4 w-4 text-wo-dim" stroke={1.7} />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Rechercher dans tous les espaces…"
            className="h-12 w-full bg-transparent text-sm text-wo-text outline-none placeholder:text-wo-dim"
          />
          <kbd className="hidden rounded-md border border-white/10 px-1.5 py-0.5 text-[10px] text-wo-dim sm:inline">
            ESC
          </kbd>
        </div>
        <div className="max-h-[50vh] overflow-y-auto p-2">
          {q.trim().length < 2 ? (
            <p className="px-3 py-6 text-center text-sm text-wo-dim">Tapez au moins 2 caractères.</p>
          ) : results.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-wo-dim">Aucun résultat.</p>
          ) : (
            results.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => go(item.href)}
                className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-indigo-50"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm text-wo-text">{item.label}</span>
                  <span className="text-[11px] text-wo-muted">
                    {item.kind} · {item.context}
                  </span>
                </span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
