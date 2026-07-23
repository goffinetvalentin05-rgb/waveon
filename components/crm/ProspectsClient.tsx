"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconChevronUp,
  IconFilter,
  IconPlus,
  IconSearch,
  IconSelector,
  IconUpload,
} from "@tabler/icons-react";
import { StatusBadge } from "@/components/crm/StatusBadge";
import { ImportProspectsModal } from "@/components/crm/ImportProspectsModal";
import { ProspectsFilterPanel } from "@/components/crm/ProspectsFilterPanel";
import type { Prospect } from "@/lib/crm/types";
import {
  EMPTY_FILTERS,
  buildProspectListPath,
  buildProspectListSearchParams,
  countActiveFilters,
  cycleSortColumn,
  defaultProspectListParams,
  hasActiveSearchOrFilters,
  parseProspectListParams,
  type ProspectListFilters,
  type ProspectListParams,
  type SortableColumn,
} from "@/lib/crm/prospect-list-params";
import { ui } from "@/lib/design/tokens";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const SEARCH_DEBOUNCE_MS = 300;

const SORT_COLUMNS: { key: SortableColumn; label: string }[] = [
  { key: "club_name", label: "Club" },
  { key: "sport", label: "Sport" },
  { key: "canton", label: "Canton" },
  { key: "contact_name", label: "Contact" },
  { key: "phone", label: "Téléphone" },
  { key: "email", label: "Email" },
  { key: "website", label: "Site" },
  { key: "status", label: "Statut" },
  { key: "last_action_at", label: "Dernière action" },
  { key: "next_follow_up", label: "Prochaine relance" },
];

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

function SortIcon({
  column,
  sort,
  order,
}: {
  column: SortableColumn;
  sort: string;
  order: "asc" | "desc";
}) {
  if (sort !== column) {
    return <IconSelector className="h-3.5 w-3.5 opacity-30" stroke={1.75} />;
  }
  if (order === "asc") {
    return <IconChevronUp className="h-3.5 w-3.5 text-blue-600" stroke={2} />;
  }
  return <IconChevronDown className="h-3.5 w-3.5 text-blue-600" stroke={2} />;
}

type FilterOptions = {
  sports: string[];
  cantons: string[];
  villes: string[];
  statuses: string[];
};

export function ProspectsClient({
  initial,
  total,
  totalAll,
  clientsOnly = false,
}: {
  initial: Prospect[];
  total: number;
  totalAll: number;
  initialParams?: ProspectListParams;
  clientsOnly?: boolean;
}) {
  const router = useRouter();
  const urlSearchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const params = useMemo(
    () => parseProspectListParams(new URLSearchParams(urlSearchParams.toString()), clientsOnly),
    [urlSearchParams, clientsOnly]
  );
  const paramsKey = useMemo(() => buildProspectListSearchParams(params).toString(), [params]);

  const [searchInput, setSearchInput] = useState(params.q);
  const [prospects, setProspects] = useState(initial);
  const [count, setCount] = useState(total);
  const [allCount, setAllCount] = useState(totalAll);
  const [showCreate, setShowCreate] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filterDraft, setFilterDraft] = useState<ProspectListFilters>(EMPTY_FILTERS);
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    sports: [],
    cantons: [],
    villes: [],
    statuses: [],
  });
  const [importMsg, setImportMsg] = useState<string | null>(null);

  const skipNextSearchDebounce = useRef(true);
  const skipInitialUrlFetch = useRef(true);
  const urlChangeFromSelf = useRef(false);
  const listPath = clientsOnly ? "/crm/clients" : "/crm/prospects";

  const activeFilterCount = countActiveFilters(params);
  const isFiltered = hasActiveSearchOrFilters(params);

  const syncUrl = useCallback(
    (next: ProspectListParams) => {
      urlChangeFromSelf.current = true;
      const qs = buildProspectListSearchParams(next).toString();
      router.replace(qs ? `${listPath}?${qs}` : listPath, { scroll: false });
    },
    [router, listPath]
  );

  const fetchList = useCallback(
    (next: ProspectListParams) => {
      const sp = buildProspectListSearchParams(next);
      startTransition(async () => {
        const res = await fetch(`/api/prospects?${sp}`);
        const data = await res.json();
        if (res.ok) {
          setProspects(data.prospects);
          setCount(data.total);
        }
      });
    },
    []
  );

  const applyParams = useCallback(
    (next: ProspectListParams) => {
      urlChangeFromSelf.current = true;
      syncUrl(next);
      fetchList(next);
    },
    [syncUrl, fetchList]
  );

  useEffect(() => {
    if (skipInitialUrlFetch.current) {
      skipInitialUrlFetch.current = false;
      return;
    }
    if (urlChangeFromSelf.current) {
      urlChangeFromSelf.current = false;
      return;
    }
    // Synchronise la barre de recherche lors d'une navigation arrière/avancer.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync URL → champ recherche
    setSearchInput(params.q);
    fetchList(params);
  }, [paramsKey, params, fetchList]);

  useEffect(() => {
    if (skipNextSearchDebounce.current) {
      skipNextSearchDebounce.current = false;
      return;
    }

    const timer = window.setTimeout(() => {
      const q = searchInput.trim();
      if (q === params.q) return;
      applyParams({ ...params, q, page: 1 });
    }, SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [searchInput, params, applyParams]);

  useEffect(() => {
    const sp = new URLSearchParams();
    if (clientsOnly) sp.set("clients", "1");
    fetch(`/api/prospects/filter-options?${sp}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.sports) setFilterOptions(data);
      })
      .catch(() => {});
  }, [clientsOnly]);

  const onSortColumn = (column: SortableColumn) => {
    const { sort, order } = cycleSortColumn(params.sort, params.order, column);
    applyParams({ ...params, sort, order, page: 1 });
  };

  const openFilters = () => {
    setFilterDraft({
      sports: params.sports,
      cantons: params.cantons,
      villes: params.villes,
      statuses: params.statuses,
      hasEmail: params.hasEmail,
      hasPhone: params.hasPhone,
      nextFollowUpFrom: params.nextFollowUpFrom,
      nextFollowUpTo: params.nextFollowUpTo,
      lastActionFrom: params.lastActionFrom,
      lastActionTo: params.lastActionTo,
      archived: params.archived,
    });
    setShowFilters(true);
  };

  const applyFilters = () => {
    setShowFilters(false);
    applyParams({ ...params, ...filterDraft, page: 1 });
  };

  const resetAll = () => {
    skipNextSearchDebounce.current = true;
    setSearchInput("");
    setFilterDraft(EMPTY_FILTERS);
    setShowFilters(false);
    const next = defaultProspectListParams(clientsOnly);
    applyParams(next);
  };

  const resetFiltersOnly = () => {
    setFilterDraft(EMPTY_FILTERS);
  };

  const goToPage = (page: number) => {
    applyParams({ ...params, page });
  };

  const onImported = (result: { imported: number; updated: number; skipped: number }) => {
    const parts: string[] = [];
    if (result.imported > 0) parts.push(`${result.imported} importé${result.imported > 1 ? "s" : ""}`);
    if (result.updated > 0) parts.push(`${result.updated} mis à jour`);
    if (result.skipped > 0) parts.push(`${result.skipped} ignoré${result.skipped > 1 ? "s" : ""}`);
    setImportMsg(parts.length ? `Import réussi : ${parts.join(", ")}.` : "Import terminé.");
    applyParams(params);
    setAllCount((n) => n + result.imported);
    router.refresh();
  };

  const resultLabel = useMemo(() => {
    const noun = clientsOnly ? "client" : "prospect";
    const plural = count > 1 ? "s" : "";
    if (params.archived === "archived") {
      return `${count} archivé${plural}`;
    }
    if (isFiltered) {
      return `${count} résultat${plural} sur ${allCount}`;
    }
    return `${allCount} ${noun}${allCount > 1 ? "s" : ""}`;
  }, [count, allCount, isFiltered, clientsOnly, params.archived]);

  const totalPages = Math.max(1, Math.ceil(count / params.pageSize));
  const listReturnUrl = buildProspectListPath(params, listPath);

  const visibleSortColumns = clientsOnly
    ? SORT_COLUMNS.filter((c) => c.key !== "status")
    : SORT_COLUMNS;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className={ui.h1}>{clientsOnly ? "Clients" : "Prospects"}</h1>
          <p className="mt-1 text-sm text-slate-500">{resultLabel}</p>
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
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
        <button
          type="button"
          className={`${ui.btnSecondary} relative`}
          onClick={openFilters}
        >
          <IconFilter className="h-4 w-4" stroke={1.75} />
          Filtrer
          {activeFilterCount > 0 ? (
            <span className="text-slate-500"> · {activeFilterCount}</span>
          ) : null}
        </button>
      </div>

      <div className={`crm-table-wrap crm-animate-in ${pending ? "opacity-70" : ""}`}>
        <table className="crm-table">
          <thead>
            <tr>
              {visibleSortColumns.map(({ key, label }) => (
                <th key={key}>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 hover:text-slate-900"
                    onClick={() => onSortColumn(key)}
                  >
                    {label}
                    <SortIcon column={key} sort={params.sort} order={params.order} />
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {prospects.length === 0 ? (
              <tr>
                <td colSpan={visibleSortColumns.length} className="!cursor-default py-12 text-center">
                  {isFiltered ? (
                    <div className="space-y-3">
                      <p className="text-slate-500">
                        Aucun prospect ne correspond à votre recherche.
                      </p>
                      <button type="button" className={ui.btnSecondary} onClick={resetAll}>
                        Réinitialiser la recherche et les filtres
                      </button>
                    </div>
                  ) : (
                    <span className="text-slate-400">
                      Aucun prospect. Importez un fichier ou créez-en un.
                    </span>
                  )}
                </td>
              </tr>
            ) : (
              prospects.map((p) => (
                <tr
                  key={p.id}
                  onClick={() => {
                    const back = encodeURIComponent(listReturnUrl);
                    router.push(`/crm/prospects/${p.id}?back=${back}`);
                  }}
                >
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

      {count > params.pageSize ? (
        <div className="flex items-center justify-between gap-3 text-sm text-slate-600">
          <button
            type="button"
            className={ui.btnGhost}
            disabled={params.page <= 1 || pending}
            onClick={() => goToPage(params.page - 1)}
          >
            <IconChevronLeft className="h-4 w-4" />
            Précédent
          </button>
          <span>
            Page {params.page} sur {totalPages}
          </span>
          <button
            type="button"
            className={ui.btnGhost}
            disabled={params.page >= totalPages || pending}
            onClick={() => goToPage(params.page + 1)}
          >
            Suivant
            <IconChevronRight className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      <ProspectsFilterPanel
        open={showFilters}
        draft={filterDraft}
        options={filterOptions}
        clientsOnly={clientsOnly}
        onChange={setFilterDraft}
        onApply={applyFilters}
        onReset={resetFiltersOnly}
        onClose={() => setShowFilters(false)}
      />

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
            applyParams(params);
            setAllCount((n) => n + 1);
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
