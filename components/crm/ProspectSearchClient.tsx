"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { IconSearch } from "@tabler/icons-react";
import { StatusBadge } from "@/components/crm/StatusBadge";
import { ui } from "@/lib/design/tokens";
import { prospectDetailHref } from "@/lib/crm/paths";
import type { Prospect } from "@/lib/crm/types";

export function ProspectSearchClient({ projectId }: { projectId: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const t = setTimeout(async () => {
      if (q.trim().length < 2) {
        setResults([]);
        return;
      }
      setLoading(true);
      const sp = new URLSearchParams({ q: q.trim(), project: projectId, pageSize: "30" });
      const res = await fetch(`/api/prospects?${sp}`);
      const data = await res.json();
      if (res.ok) setResults(data.prospects ?? []);
      setLoading(false);
    }, 200);
    return () => clearTimeout(t);
  }, [q, projectId]);

  const listReturn = `/projects/${projectId}/search`;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="relative">
        <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-wo-dim" />
        <input
          ref={inputRef}
          className={`${ui.input} pl-9`}
          placeholder="Nom, entreprise, contact, email…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      {q.trim().length < 2 ? (
        <p className="text-sm text-wo-dim">Saisissez au moins 2 caractères pour rechercher dans ce projet.</p>
      ) : loading ? (
        <p className="text-sm text-wo-dim">Recherche…</p>
      ) : results.length === 0 ? (
        <p className="text-sm text-wo-muted">Aucun prospect ne correspond.</p>
      ) : (
        <ul className="wo-card divide-y divide-wo-border">
          {results.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => router.push(prospectDetailHref(p.id, listReturn))}
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-wo-hover"
              >
                <span className="min-w-0">
                  <span className="block truncate text-[13px] font-medium text-wo-text">{p.club_name}</span>
                  <span className="mt-0.5 block truncate text-[12px] text-wo-dim">
                    {[p.contact_name, p.ville || p.canton].filter(Boolean).join(" · ") || "—"}
                  </span>
                </span>
                <StatusBadge status={p.status} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
