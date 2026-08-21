"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  IconChecklist,
  IconCreditCard,
  IconFolder,
  IconNote,
  IconReceipt,
  IconSearch,
  IconUsers,
} from "@tabler/icons-react";

type SearchResults = {
  projects: { id: string; name: string; color: string | null }[];
  prospects: { id: string; club_name: string; status: string }[];
  tasks: { id: string; title: string; status: string }[];
  notes: { id: string; title: string }[];
  expenses: { id: string; title: string; amount: number }[];
  subscriptions: { id: string; name: string }[];
};

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);

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
        setResults(null);
        return;
      }
      const res = await fetch(`/api/search?q=${encodeURIComponent(q.trim())}`);
      const data = await res.json();
      if (res.ok) setResults(data);
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

  const groups = results
    ? [
        {
          label: "Projets",
          icon: IconFolder,
          items: results.projects.map((p) => ({
            id: p.id,
            label: p.name,
            href: `/projects/${p.id}`,
          })),
        },
        {
          label: "Prospects",
          icon: IconUsers,
          items: results.prospects.map((p) => ({
            id: p.id,
            label: p.club_name,
            href: `/crm/prospects/${p.id}`,
          })),
        },
        {
          label: "Tâches",
          icon: IconChecklist,
          items: results.tasks.map((t) => ({
            id: t.id,
            label: t.title,
            href: `/tasks`,
          })),
        },
        {
          label: "Notes",
          icon: IconNote,
          items: results.notes.map((n) => ({
            id: n.id,
            label: n.title,
            href: `/notes?id=${n.id}`,
          })),
        },
        {
          label: "Dépenses",
          icon: IconReceipt,
          items: results.expenses.map((e) => ({
            id: e.id,
            label: e.title,
            href: "/finances",
          })),
        },
        {
          label: "Abonnements",
          icon: IconCreditCard,
          items: results.subscriptions.map((s) => ({
            id: s.id,
            label: s.name,
            href: "/finances/subscriptions",
          })),
        },
      ].filter((g) => g.items.length)
    : [];

  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center px-4 pt-[12vh]">
      <button type="button" className="absolute inset-0 bg-black/65 backdrop-blur-sm" onClick={() => setOpen(false)} />
      <div className="relative w-full max-w-xl overflow-hidden rounded-[16px] border border-white/[0.08] bg-[#16141f] shadow-2xl">
        <div className="flex items-center gap-2 border-b border-white/[0.06] px-4">
          <IconSearch className="h-4 w-4 text-[#6a6578]" stroke={1.7} />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Rechercher un projet, prospect, tâche…"
            className="h-12 w-full bg-transparent text-sm text-[#f3f0fa] outline-none placeholder:text-[#6a6578]"
          />
          <kbd className="hidden rounded-md border border-white/10 px-1.5 py-0.5 text-[10px] text-[#6a6578] sm:inline">
            ESC
          </kbd>
        </div>
        <div className="max-h-[50vh] overflow-y-auto p-2">
          {q.trim().length < 2 ? (
            <p className="px-3 py-6 text-center text-sm text-[#6a6578]">Tapez au moins 2 caractères.</p>
          ) : groups.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-[#6a6578]">Aucun résultat.</p>
          ) : (
            groups.map((g) => {
              const Icon = g.icon;
              return (
                <div key={g.label} className="mb-2">
                  <p className="px-2 py-1.5 text-[10px] font-medium uppercase tracking-wider text-[#6a6578]">
                    {g.label}
                  </p>
                  {g.items.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => go(item.href)}
                      className="flex w-full items-center gap-2 rounded-[10px] px-2 py-2 text-left text-sm text-[#e8e4f0] hover:bg-white/[0.05]"
                    >
                      <Icon className="h-4 w-4 text-[#8b869c]" stroke={1.6} />
                      <span className="truncate">{item.label}</span>
                    </button>
                  ))}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
