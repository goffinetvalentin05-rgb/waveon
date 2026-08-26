"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { IconChevronRight, IconSearch } from "@tabler/icons-react";
import { formatShortDate } from "@/lib/crm/format";
import { prospectDetailHref } from "@/lib/crm/paths";
import type { Prospect } from "@/lib/crm/types";
import { ui } from "@/lib/design/tokens";

export function ClientsClient({
  initial,
  total,
  totalAll,
  projectId,
}: {
  initial: Prospect[];
  total: number;
  totalAll: number;
  projectId: string;
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const listReturnUrl = `/projects/${projectId}/clients`;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return initial;
    return initial.filter((p) => {
      const hay = [
        p.club_name,
        p.contact_name,
        p.phone,
        p.email,
        p.ville,
        p.canton,
        p.assignee?.name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [initial, search]);

  const noun = totalAll > 1 ? "clients" : "client";
  const resultLabel =
    search.trim() && filtered.length !== total
      ? `${filtered.length} résultat${filtered.length > 1 ? "s" : ""} sur ${totalAll}`
      : `${totalAll} ${noun}`;

  return (
    <div className="space-y-5">
      <p className="text-sm text-wo-muted">{resultLabel}</p>

      <div className="relative">
        <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-wo-dim" />
        <input
          className={`${ui.input} pl-9`}
          placeholder="Rechercher un client, contact, email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <div className={`${ui.card} px-4 py-12 text-center`}>
          <p className="text-wo-muted">
            {search.trim()
              ? "Aucun client ne correspond à votre recherche."
              : "Aucun client pour le moment. Passez un prospect en client depuis sa fiche."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((p) => (
            <article
              key={p.id}
              className="cursor-pointer rounded-[1.15rem] border border-wo-border bg-white px-4 py-3.5 transition hover:border-indigo-200 hover:bg-slate-50/70"
              onClick={() => router.push(prospectDetailHref(p.id, listReturnUrl))}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate text-[15px] font-medium text-wo-text">{p.club_name}</h3>
                  <p className="mt-0.5 truncate text-xs text-wo-dim">
                    {p.contact_name || "Aucun contact principal"}
                  </p>
                </div>
                <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-wo-muted">
                  Ouvrir
                  <IconChevronRight className="h-3.5 w-3.5" stroke={1.75} />
                </span>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-wo-muted">
                <span>{p.phone || "Pas de téléphone"}</span>
                <span>{p.email || "Pas d’email"}</span>
                <span>Client depuis {formatShortDate(p.last_action_at ?? p.updated_at)}</span>
                {p.assignee?.name ? <span>{p.assignee.name}</span> : <span>Sans responsable</span>}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
