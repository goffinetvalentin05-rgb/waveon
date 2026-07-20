"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { IconPlus, IconSearch, IconUpload } from "@tabler/icons-react";
import { StatusBadge } from "@/components/crm/StatusBadge";
import { ImportProspectsModal } from "@/components/crm/ImportProspectsModal";
import { PROSPECT_STATUSES, type Prospect } from "@/lib/crm/types";
import { ui } from "@/lib/design/tokens";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

function fmtDate(value: string | null) {
  if (!value) return "—";
  try {
    return format(new Date(value.length === 10 ? `${value}T12:00:00` : value), "d MMM yyyy", {
      locale: fr,
    });
  } catch {
    return value;
  }
}

export function ProspectsClient({
  initial,
  total,
  clientsOnly = false,
}: {
  initial: Prospect[];
  total: number;
  clientsOnly?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [sort, setSort] = useState("updated_at");
  const [prospects, setProspects] = useState(initial);
  const [count, setCount] = useState(total);
  const [showCreate, setShowCreate] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importMsg, setImportMsg] = useState<string | null>(null);

  const reload = (opts?: { q?: string; status?: string; sort?: string }) => {
    const params = new URLSearchParams();
    const qq = opts?.q ?? q;
    const ss = opts?.status ?? status;
    const so = opts?.sort ?? sort;
    if (qq) params.set("q", qq);
    if (ss) params.set("status", ss);
    if (so) params.set("sort", so);
    if (clientsOnly) params.set("clients", "1");
    params.set("pageSize", "100");

    startTransition(async () => {
      const res = await fetch(`/api/prospects?${params}`);
      const data = await res.json();
      if (res.ok) {
        setProspects(data.prospects);
        setCount(data.total);
      }
    });
  };

  const onImported = (result: { imported: number; updated: number; skipped: number }) => {
    const parts: string[] = [];
    if (result.imported > 0) parts.push(`${result.imported} importé${result.imported > 1 ? "s" : ""}`);
    if (result.updated > 0) parts.push(`${result.updated} mis à jour`);
    if (result.skipped > 0) parts.push(`${result.skipped} ignoré${result.skipped > 1 ? "s" : ""}`);
    setImportMsg(parts.length ? `Import réussi : ${parts.join(", ")}.` : "Import terminé.");
    reload();
    router.refresh();
  };

  const filteredHint = useMemo(() => {
    if (clientsOnly) return `${count} client${count > 1 ? "s" : ""}`;
    return `${count} prospect${count > 1 ? "s" : ""}`;
  }, [count, clientsOnly]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className={ui.h1}>{clientsOnly ? "Clients" : "Prospects"}</h1>
          <p className="mt-1 text-sm text-slate-500">{filteredHint}</p>
        </div>
        {!clientsOnly ? (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={ui.btnSecondary}
              onClick={() => {
                setImportMsg(null);
                setShowImport(true);
              }}
            >
              <IconUpload className="h-4 w-4" stroke={1.75} />
              Importer des prospects
            </button>
            <button type="button" className={ui.btnPrimary} onClick={() => setShowCreate(true)}>
              <IconPlus className="h-4 w-4" stroke={2} />
              Nouveau
            </button>
          </div>
        ) : null}
      </div>

      {importMsg ? (
        <p className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-700">
          {importMsg}
        </p>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            className={`${ui.input} pl-9`}
            placeholder="Rechercher un club, contact, canton…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") reload({ q });
            }}
          />
        </div>
        {!clientsOnly ? (
          <select
            className={ui.input + " sm:w-44"}
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              reload({ status: e.target.value });
            }}
          >
            <option value="">Tous les statuts</option>
            {PROSPECT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        ) : null}
        <select
          className={ui.input + " sm:w-44"}
          value={sort}
          onChange={(e) => {
            setSort(e.target.value);
            reload({ sort: e.target.value });
          }}
        >
          <option value="updated_at">Récent</option>
          <option value="club_name">Nom</option>
          <option value="next_follow_up">Prochaine relance</option>
          <option value="status">Statut</option>
          <option value="canton">Canton</option>
        </select>
        <button type="button" className={ui.btnSecondary} disabled={pending} onClick={() => reload()}>
          Filtrer
        </button>
      </div>

      <div className="crm-table-wrap crm-animate-in">
        <table className="crm-table">
          <thead>
            <tr>
              <th>Club</th>
              <th>Sport</th>
              <th>Canton</th>
              <th>Contact</th>
              <th>Téléphone</th>
              <th>Email</th>
              <th>Site</th>
              {!clientsOnly ? <th>Statut</th> : null}
              <th>Dernière action</th>
              <th>Prochaine relance</th>
            </tr>
          </thead>
          <tbody>
            {prospects.length === 0 ? (
              <tr>
                <td colSpan={10} className="!cursor-default py-12 text-center text-slate-400">
                  Aucun prospect. Importez un fichier ou créez-en un.
                </td>
              </tr>
            ) : (
              prospects.map((p) => (
                <tr key={p.id} onClick={() => router.push(`/prospects/${p.id}`)}>
                  <td className="font-medium text-slate-900">{p.club_name}</td>
                  <td>{p.sport ?? "—"}</td>
                  <td>{p.canton ?? "—"}</td>
                  <td>{p.contact_name ?? "—"}</td>
                  <td>{p.phone ?? "—"}</td>
                  <td>{p.email ?? "—"}</td>
                  <td>
                    {p.website ? (
                      <Link
                        href={p.website.startsWith("http") ? p.website : `https://${p.website}`}
                        target="_blank"
                        onClick={(e) => e.stopPropagation()}
                        className="text-blue-600 hover:underline"
                      >
                        Lien
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  {!clientsOnly ? (
                    <td>
                      <StatusBadge status={p.status} />
                    </td>
                  ) : null}
                  <td>
                    <div className="text-slate-700">{p.last_action ?? "—"}</div>
                    <div className="text-xs text-slate-400">{fmtDate(p.last_action_at)}</div>
                  </td>
                  <td>{fmtDate(p.next_follow_up)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showImport ? (
        <ImportProspectsModal
          open={showImport}
          onClose={() => setShowImport(false)}
          onImported={onImported}
        />
      ) : null}

      {showCreate ? (
        <CreateProspectModal
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            reload();
            router.refresh();
          }}
        />
      ) : null}
    </div>
  );
}

function CreateProspectModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const body = Object.fromEntries(fd.entries());
    const res = await fetch("/api/prospects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Erreur");
      return;
    }
    onCreated();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm" onClick={onClose} />
      <form
        onSubmit={submit}
        className="relative w-full max-w-lg rounded-2xl border border-[#e8eef6] bg-white p-6 shadow-xl"
      >
        <h2 className="text-lg font-semibold text-slate-900">Nouveau prospect</h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {(
            [
              ["club_name", "Nom du club *", true],
              ["sport", "Sport", false],
              ["canton", "Canton", false],
              ["contact_name", "Contact", false],
              ["phone", "Téléphone", false],
              ["email", "Email", false],
              ["website", "Site web", false],
            ] as const
          ).map(([name, label, required]) => (
            <div key={name} className={name === "club_name" || name === "website" ? "sm:col-span-2" : ""}>
              <label className={ui.label}>{label}</label>
              <input name={name} required={required} className={ui.input} />
            </div>
          ))}
        </div>
        {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" className={ui.btnSecondary} onClick={onClose}>
            Annuler
          </button>
          <button type="submit" className={ui.btnPrimary} disabled={loading}>
            {loading ? "Création…" : "Créer"}
          </button>
        </div>
      </form>
    </div>
  );
}
