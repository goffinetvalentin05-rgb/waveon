"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  IconArchive,
  IconCards,
  IconPencil,
  IconPlus,
  IconSearch,
  IconTrash,
} from "@tabler/icons-react";
import { ui } from "@/lib/design/tokens";
import { EnglishEntryModal } from "@/components/english/EnglishEntryModal";
import {
  ENGLISH_STATUSES,
  ENGLISH_STATUS_LABELS,
  ENGLISH_TYPES,
  ENGLISH_TYPE_LABELS,
  type EnglishEntry,
  type EnglishStats,
  type EnglishStatus,
  type EnglishType,
} from "@/lib/english/types";
import { todayDateISO } from "@/lib/english/srs";

type Filters = {
  q: string;
  type: EnglishType | "";
  category: string;
  status: EnglishStatus | "";
  sort: "recent" | "old" | "alpha";
};

const DEFAULT_FILTERS: Filters = {
  q: "",
  type: "",
  category: "",
  status: "",
  sort: "recent",
};

const TYPE_STYLES: Record<EnglishType, { bg: string; text: string }> = {
  word: { bg: "bg-violet-500/15", text: "text-violet-200" },
  expression: { bg: "bg-sky-500/15", text: "text-sky-200" },
  sentence: { bg: "bg-white/[0.06]", text: "text-[#c8c3d6]" },
};

const STATUS_STYLES: Record<EnglishStatus, { bg: string; text: string; dot: string }> = {
  new: { bg: "bg-white/[0.06]", text: "text-[#c8c3d6]", dot: "bg-[#8b869c]" },
  learning: { bg: "bg-violet-500/15", text: "text-violet-200", dot: "bg-violet-400" },
  known: { bg: "bg-emerald-500/15", text: "text-emerald-200", dot: "bg-emerald-400" },
  review: { bg: "bg-amber-500/15", text: "text-amber-200", dot: "bg-amber-400" },
  archived: { bg: "bg-white/[0.04]", text: "text-[#6a6578]", dot: "bg-[#6a6578]" },
};

function fmtDate(value: string | null) {
  if (!value) return "—";
  try {
    return format(new Date(`${value.slice(0, 10)}T12:00:00`), "d MMM yyyy", { locale: fr });
  } catch {
    return value;
  }
}

function isDue(entry: EnglishEntry, today: string) {
  return entry.status !== "archived" && entry.next_review_at.slice(0, 10) <= today;
}

export function EnglishClient() {
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [searchInput, setSearchInput] = useState("");
  const [entries, setEntries] = useState<EnglishEntry[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [stats, setStats] = useState<EnglishStats | null>(null);
  const [categories, setCategories] = useState<string[]>([]);

  const [showModal, setShowModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<EnglishEntry | null>(null);

  const [pendingDelete, setPendingDelete] = useState<EnglishEntry | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const today = todayDateISO();

  const fetchEntries = useCallback(async (f: Filters) => {
    setLoading(true);
    setListError(null);
    const sp = new URLSearchParams();
    if (f.q) sp.set("q", f.q);
    if (f.type) sp.set("type", f.type);
    if (f.category) sp.set("category", f.category);
    if (f.status) sp.set("status", f.status);
    sp.set("sort", f.sort);
    try {
      const res = await fetch(`/api/english/entries?${sp.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur lors du chargement.");
      setEntries(data.entries ?? []);
    } catch (e) {
      setListError(e instanceof Error ? e.message : "Erreur lors du chargement.");
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/english/stats");
      const data = await res.json();
      if (res.ok) setStats(data.stats);
    } catch {
      // silencieux — les cartes de résumé restent sur leur dernière valeur connue
    }
  }, []);

  const loadCategories = useCallback(async () => {
    try {
      const res = await fetch("/api/english/entries?sort=alpha");
      const data = await res.json();
      if (!res.ok) return;
      const set = new Set<string>();
      for (const e of (data.entries ?? []) as EnglishEntry[]) {
        if (e.category) set.add(e.category);
      }
      setCategories(Array.from(set).sort((a, b) => a.localeCompare(b, "fr")));
    } catch {
      // silencieux — la liste des catégories restera simplement inchangée
    }
  }, []);

  useEffect(() => {
    fetchEntries(filters);
  }, [filters, fetchEntries]);

  useEffect(() => {
    fetchStats();
    loadCategories();
  }, [fetchStats, loadCategories]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const q = searchInput.trim();
      setFilters((prev) => (prev.q === q ? prev : { ...prev, q }));
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const refresh = () => {
    fetchEntries(filters);
    fetchStats();
  };

  const openCreate = () => {
    setEditingEntry(null);
    setShowModal(true);
  };

  const openEdit = (entry: EnglishEntry) => {
    setEditingEntry(entry);
    setShowModal(true);
  };

  const handleSaved = () => {
    setShowModal(false);
    setEditingEntry(null);
    refresh();
    loadCategories();
  };

  const handleArchive = async (entry: EnglishEntry) => {
    try {
      await fetch(`/api/english/entries/${entry.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archive: true }),
      });
    } finally {
      refresh();
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleteLoading(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/english/entries/${pendingDelete.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setDeleteError(data.error ?? "Impossible de supprimer cette entrée.");
        setDeleteLoading(false);
        return;
      }
      setPendingDelete(null);
      setDeleteLoading(false);
      refresh();
    } catch {
      setDeleteError("Impossible de supprimer cette entrée.");
      setDeleteLoading(false);
    }
  };

  const hasActiveFilters = Boolean(
    filters.q || filters.type || filters.category || filters.status
  );

  const resetFilters = () => {
    setSearchInput("");
    setFilters(DEFAULT_FILTERS);
  };

  const summaryCards: { label: string; value: number | string }[] = [
    { label: "Total", value: stats?.total ?? "—" },
    { label: "À réviser", value: stats?.dueToday ?? "—" },
    { label: "Série", value: stats?.streak != null ? `${stats.streak} j` : "—" },
    { label: "Aujourd'hui", value: stats?.progressToday != null ? `${stats.progressToday}%` : "—" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between crm-animate-in">
        <div>
          <h1 className={ui.h1}>English</h1>
          <p className="mt-1 text-sm text-[#8b869c]">
            Vocabulaire, expressions et répétition espacée — le même cockpit, un module différent.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/personal/english/review" className={ui.btnSecondary}>
            <IconCards className="h-4 w-4" stroke={1.75} />
            Réviser
            {stats && stats.dueToday > 0 ? ` (${stats.dueToday})` : ""}
          </Link>
          <button type="button" className={ui.btnPrimary} onClick={openCreate}>
            <IconPlus className="h-4 w-4" stroke={2} />
            Ajouter
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 crm-animate-in-delay-1">
        {summaryCards.map((c) => (
          <div key={c.label} className={`${ui.card} p-4 sm:p-5`}>
            <p className="text-xs font-medium uppercase tracking-wide text-[#8b869c]">{c.label}</p>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-[#f3f0fa] sm:text-3xl">
              {c.value}
            </p>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 crm-animate-in-delay-1 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative flex-1 sm:min-w-[220px]">
          <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6a6578]" />
          <input
            className={`${ui.input} pl-9`}
            placeholder="Rechercher un mot, une expression, une phrase…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
        <select
          className={`${ui.input} sm:w-40`}
          value={filters.type}
          onChange={(e) =>
            setFilters((prev) => ({ ...prev, type: e.target.value as EnglishType | "" }))
          }
        >
          <option value="">Tous les types</option>
          {ENGLISH_TYPES.map((t) => (
            <option key={t} value={t}>
              {ENGLISH_TYPE_LABELS[t]}
            </option>
          ))}
        </select>
        <select
          className={`${ui.input} sm:w-44`}
          value={filters.category}
          onChange={(e) => setFilters((prev) => ({ ...prev, category: e.target.value }))}
        >
          <option value="">Toutes les catégories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          className={`${ui.input} sm:w-40`}
          value={filters.status}
          onChange={(e) =>
            setFilters((prev) => ({ ...prev, status: e.target.value as EnglishStatus | "" }))
          }
        >
          <option value="">Tous les statuts</option>
          {ENGLISH_STATUSES.filter((s) => s !== "archived").map((s) => (
            <option key={s} value={s}>
              {ENGLISH_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
        <select
          className={`${ui.input} sm:w-40`}
          value={filters.sort}
          onChange={(e) =>
            setFilters((prev) => ({
              ...prev,
              sort: e.target.value as Filters["sort"],
            }))
          }
        >
          <option value="recent">Plus récents</option>
          <option value="old">Plus anciens</option>
          <option value="alpha">Alphabétique</option>
        </select>
      </div>

      {listError ? (
        <p className={ui.alertError}>{listError}</p>
      ) : null}

      {entries === null ? (
        <p className="text-sm text-[#6a6578]">Chargement des entrées…</p>
      ) : entries.length === 0 ? (
        <div className={`${ui.card} flex flex-col items-center gap-3 px-6 py-14 text-center crm-animate-in-delay-2`}>
          <p className="text-base font-medium text-[#f3f0fa]">
            {hasActiveFilters
              ? "Aucune entrée ne correspond à votre recherche."
              : "Aucune entrée pour le moment."}
          </p>
          <p className="max-w-sm text-sm text-[#8b869c]">
            {hasActiveFilters
              ? "Essayez de modifier votre recherche ou vos filtres."
              : "Ajoutez un mot, une expression ou une phrase pour commencer à construire votre vocabulaire."}
          </p>
          {hasActiveFilters ? (
            <button type="button" className={ui.btnSecondary} onClick={resetFilters}>
              Réinitialiser les filtres
            </button>
          ) : (
            <button type="button" className={ui.btnPrimary} onClick={openCreate}>
              <IconPlus className="h-4 w-4" stroke={2} />
              Ajouter une entrée
            </button>
          )}
        </div>
      ) : (
        <ul className={`space-y-2.5 crm-animate-in-delay-2 ${loading ? "opacity-70" : ""}`}>
          {entries.map((entry) => {
            const typeStyle = TYPE_STYLES[entry.type];
            const statusStyle = STATUS_STYLES[entry.status];
            const due = isDue(entry, today);
            return (
              <li
                key={entry.id}
                className={`${ui.card} flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`crm-badge ${typeStyle.bg} ${typeStyle.text}`}>
                      {ENGLISH_TYPE_LABELS[entry.type]}
                    </span>
                    <span className={`crm-badge ${statusStyle.bg} ${statusStyle.text}`}>
                      <span className={`crm-badge-dot ${statusStyle.dot}`} />
                      {ENGLISH_STATUS_LABELS[entry.status]}
                    </span>
                    {entry.category ? (
                      <span className="text-xs font-medium text-[#6a6578]">{entry.category}</span>
                    ) : null}
                  </div>
                  <p className="mt-2 text-base font-semibold text-[#f3f0fa]">{entry.english_text}</p>
                  <p className="text-sm text-[#8b869c]">{entry.french_translation}</p>
                  {entry.example_english ? (
                    <p className="mt-1 truncate text-xs italic text-[#6a6578]">
                      &ldquo;{entry.example_english}&rdquo;
                    </p>
                  ) : null}
                </div>

                <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end sm:justify-end sm:gap-2.5">
                  <div className="text-right">
                    <p className="text-xs text-[#6a6578]">Prochaine révision</p>
                    <p className={`text-sm font-medium ${due ? "text-amber-300" : "text-[#c8c3d6]"}`}>
                      {fmtDate(entry.next_review_at)}
                    </p>
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      className="rounded-lg p-2 text-[#6a6578] transition hover:bg-white/[0.06] hover:text-[#f3f0fa]"
                      onClick={() => openEdit(entry)}
                      aria-label="Modifier"
                      title="Modifier"
                    >
                      <IconPencil className="h-4 w-4" stroke={1.75} />
                    </button>
                    <button
                      type="button"
                      className="rounded-lg p-2 text-[#6a6578] transition hover:bg-white/[0.06] hover:text-[#f3f0fa]"
                      onClick={() => handleArchive(entry)}
                      aria-label="Archiver"
                      title="Archiver"
                    >
                      <IconArchive className="h-4 w-4" stroke={1.75} />
                    </button>
                    <button
                      type="button"
                      className="rounded-lg p-2 text-[#6a6578] transition hover:bg-rose-500/10 hover:text-rose-300"
                      onClick={() => {
                        setDeleteError(null);
                        setPendingDelete(entry);
                      }}
                      aria-label="Supprimer"
                      title="Supprimer"
                    >
                      <IconTrash className="h-4 w-4" stroke={1.75} />
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {showModal ? (
        <EnglishEntryModal
          entry={editingEntry}
          onClose={() => {
            setShowModal(false);
            setEditingEntry(null);
          }}
          onSaved={handleSaved}
        />
      ) : null}

      {pendingDelete ? (
        <ConfirmDeleteModal
          entry={pendingDelete}
          loading={deleteLoading}
          error={deleteError}
          onCancel={() => {
            if (deleteLoading) return;
            setPendingDelete(null);
            setDeleteError(null);
          }}
          onConfirm={confirmDelete}
        />
      ) : null}
    </div>
  );
}

function ConfirmDeleteModal({
  entry,
  loading,
  error,
  onCancel,
  onConfirm,
}: {
  entry: EnglishEntry;
  loading: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className={ui.overlay}
        onClick={loading ? undefined : onCancel}
        aria-label="Fermer"
      />
      <div className={`${ui.modal} max-w-md p-6`}>
        <h3 className="text-lg font-semibold text-[#f3f0fa]">Supprimer cette entrée ?</h3>
        <p className="mt-2 text-sm text-[#8b869c]">
          « {entry.english_text} » sera définitivement supprimé, ainsi que son historique de
          révision. Cette action est irréversible.
        </p>
        {error ? <p className="mt-3 text-sm text-rose-300">{error}</p> : null}
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" className={ui.btnSecondary} onClick={onCancel} disabled={loading}>
            Annuler
          </button>
          <button
            type="button"
            className={ui.btnDanger}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? "Suppression…" : "Supprimer"}
          </button>
        </div>
      </div>
    </div>
  );
}
