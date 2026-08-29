"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  IconChevronLeft,
  IconChevronRight,
  IconFilter,
  IconPlus,
  IconSearch,
  IconUpload,
} from "@tabler/icons-react";
import { ImportProspectsModal } from "@/components/crm/ImportProspectsModal";
import { ProspectsFilterPanel } from "@/components/crm/ProspectsFilterPanel";
import { PipelineStats, ProspectsPipeline } from "@/components/crm/ProspectsPipeline";
import { SmartViewBar } from "@/components/crm/SmartViewBar";
import { ProspectListRow, ProspectWorkSections } from "@/components/crm/ProspectWorkList";
import { ClosedReasonModal } from "@/components/crm/ClosedReasonModal";
import { ScrollableModal } from "@/components/ui/ScrollableModal";
import type { Prospect, ProspectStatus } from "@/lib/crm/types";
import { PROSPECT_STATUSES } from "@/lib/crm/types";
import type { ClosedReason } from "@/lib/crm/closed";
import type { ProspectWorkCounts } from "@/lib/crm/counters";
import type { SmartViewId } from "@/lib/crm/smart-views";
import {
  EMPTY_FILTERS,
  buildProspectListPath,
  buildProspectListSearchParams,
  countActiveFilters,
  defaultProspectListParams,
  hasActiveSearchOrFilters,
  parseProspectListParams,
  type ProspectListFilters,
  type ProspectListParams,
} from "@/lib/crm/prospect-list-params";
import { ui } from "@/lib/design/tokens";

const SEARCH_DEBOUNCE_MS = 300;


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
  projectId,
}: {
  initial: Prospect[];
  total: number;
  totalAll: number;
  initialParams?: ProspectListParams;
  clientsOnly?: boolean;
  projectId?: string;
}) {
  const router = useRouter();
  const urlSearchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const params = useMemo(() => {
    const parsed = parseProspectListParams(new URLSearchParams(urlSearchParams.toString()), clientsOnly);
    return projectId ? { ...parsed, projectId } : parsed;
  }, [urlSearchParams, clientsOnly, projectId]);
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
    statuses: [...PROSPECT_STATUSES],
  });
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const [view, setView] = useState<"pipeline" | "list">(
    clientsOnly || params.smartView !== "all" ? "list" : "pipeline"
  );
  const [smartCounts, setSmartCounts] = useState<ProspectWorkCounts | null>(null);
  const [closePrompt, setClosePrompt] = useState<{ id: string } | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);

  const skipNextSearchDebounce = useRef(true);
  const skipInitialUrlFetch = useRef(true);
  const urlChangeFromSelf = useRef(false);
  const listPath =
    projectId && projectId !== "unassigned"
      ? `/projects/${projectId}/${clientsOnly ? "clients" : "prospects"}`
      : clientsOnly
        ? "/crm/clients"
        : "/crm/prospects";

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

  const fetchCounts = useCallback(() => {
    const project = projectId ?? params.projectId;
    const sp = project ? `?project=${encodeURIComponent(project)}` : "";
    void fetch(`/api/prospects/smart-counts${sp}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.counts) setSmartCounts(data.counts);
      });
  }, [projectId, params.projectId]);

  useEffect(() => {
    fetchCounts();
  }, [fetchCounts, allCount]);

  const changeStatus = useCallback(
    (id: string, status: ProspectStatus, extra?: { closed_reason?: string; closed_note?: string }) => {
      if (status === "Fermé" && !extra?.closed_reason) {
        setClosePrompt({ id });
        return;
      }
      setStatusError(null);
      let previousStatus: ProspectStatus | null = null;
      setProspects((list) => {
        previousStatus = list.find((p) => p.id === id)?.status ?? null;
        return list.map((p) => (p.id === id ? { ...p, status } : p));
      });
      startTransition(async () => {
        const res = await fetch(`/api/prospects/${id}/status`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status,
            closed_reason: extra?.closed_reason,
            closed_note: extra?.closed_note,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          if (previousStatus) {
            setProspects((list) =>
              list.map((p) => (p.id === id ? { ...p, status: previousStatus! } : p))
            );
          }
          setStatusError(
            typeof data.error === "string"
              ? data.error
              : "Impossible d’enregistrer le statut."
          );
          return;
        }
        setProspects((list) => {
          const next = list.map((p) => (p.id === id ? { ...p, ...data.prospect } : p));
          return clientsOnly ? next.filter((p) => p.status === "Client") : next;
        });
        fetchCounts();
      });
    },
    [clientsOnly, fetchCounts]
  );

  const confirmClose = (reason: ClosedReason, note: string) => {
    if (!closePrompt) return;
    const id = closePrompt.id;
    setClosePrompt(null);
    changeStatus(id, "Fermé", { closed_reason: reason, closed_note: note });
  };

  const applySmartView = (smartView: SmartViewId) => {
    const next = {
      ...params,
      smartView,
      followUpPreset: null,
      statuses: [] as string[],
      page: 1,
      pageSize: smartView === "today_work" || smartView === "overdue" ? 200 : params.pageSize,
    };
    if (smartView !== "all") setView("list");
    applyParams(next);
  };

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
    const project = projectId ?? params.projectId;
    if (project) sp.set("project", project);
    fetch(`/api/prospects/filter-options?${sp}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.sports !== undefined) {
          setFilterOptions({
            sports: data.sports ?? [],
            cantons: data.cantons ?? [],
            villes: data.villes ?? [],
            statuses: [...PROSPECT_STATUSES],
          });
        }
      })
      .catch(() => {});
  }, [clientsOnly, projectId, params.projectId]);

  useEffect(() => {
    if (clientsOnly || view !== "pipeline") return;
    if (params.pageSize >= 200) return;
    applyParams({ ...params, pageSize: 200, page: 1 });
    // Charge un volume suffisant pour le kanban, sans toucher à la vue liste.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, clientsOnly]);

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
      projectId: params.projectId,
      assignedTo: params.assignedTo,
      tags: params.tags,
      channel: params.channel,
      followUpPreset: params.followUpPreset,
      smartView: params.smartView,
      minValue: params.minValue,
      maxValue: params.maxValue,
      closedReasons: params.closedReasons,
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
    const next = { ...defaultProspectListParams(clientsOnly), projectId: projectId ?? "" };
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

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          {projectId ? null : <h1 className={ui.h1}>{clientsOnly ? "Clients" : "Ma pipeline"}</h1>}
          <p className={`${projectId ? "" : "mt-1"} text-sm text-wo-muted`}>{resultLabel}</p>
          {!clientsOnly ? (
            <div className="mt-4">
              <SmartViewBar
                active={params.smartView}
                counts={smartCounts}
                onSelect={applySmartView}
              />
            </div>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {!clientsOnly ? (
            <div className="inline-flex rounded-full border border-wo-border bg-white p-1">
              <button
                type="button"
                onClick={() => {
                  setView("pipeline");
                  if (params.pageSize < 200) applyParams({ ...params, pageSize: 200, page: 1 });
                }}
                className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                  view === "pipeline" ? "wo-subnav-active" : "text-wo-muted hover:text-wo-text"
                }`}
              >
                Pipeline
              </button>
              <button
                type="button"
                onClick={() => {
                  setView("list");
                  if (params.pageSize !== 25) applyParams({ ...params, pageSize: 25, page: 1 });
                }}
                className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                  view === "list" ? "wo-subnav-active" : "text-wo-muted hover:text-wo-text"
                }`}
              >
                Liste
              </button>
            </div>
          ) : null}
          {!clientsOnly ? (
            <>
              <button
                type="button"
                className={ui.btnSecondary}
                onClick={() => {
                  setImportMsg(null);
                  setShowImport(true);
                }}
              >
                <IconUpload className="h-4 w-4" stroke={1.75} />
                Importer
              </button>
              <button type="button" className={ui.btnPrimary} onClick={() => setShowCreate(true)}>
                <IconPlus className="h-4 w-4" stroke={2} />
                Nouveau
              </button>
            </>
          ) : null}
        </div>
      </div>

      {importMsg ? <p className={ui.alertSuccess}>{importMsg}</p> : null}
      {statusError ? (
        <p className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-2.5 text-sm text-rose-700">
          {statusError}
        </p>
      ) : null}

      {!clientsOnly && view === "pipeline" ? (
        <PipelineStats prospects={prospects} />
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-wo-dim" />
          <input
            className={`${ui.input} pl-9`}
            placeholder="Rechercher un prospect, une entreprise, un contact…"
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
            <span className="text-wo-muted"> · {activeFilterCount}</span>
          ) : null}
        </button>
      </div>

      {!clientsOnly && view === "pipeline" ? (
        <div className={pending ? "opacity-70" : ""}>
          <ProspectsPipeline
            prospects={prospects}
            listReturnUrl={listReturnUrl}
            onStatusChange={changeStatus}
          />
        </div>
      ) : params.smartView === "today_work" ? (
        <div className={pending ? "opacity-70" : ""}>
          <ProspectWorkSections
            prospects={prospects}
            listReturnUrl={listReturnUrl}
            onStatusChange={changeStatus}
          />
        </div>
      ) : (
      <div className={`space-y-2 ${pending ? "opacity-70" : ""}`}>
        {prospects.length === 0 ? (
          <div className={`${ui.card} px-4 py-12 text-center`}>
            {isFiltered ? (
              <div className="space-y-3">
                <p className="text-wo-muted">Aucun prospect ne correspond à votre recherche.</p>
                <button type="button" className={ui.btnSecondary} onClick={resetAll}>
                  Réinitialiser la recherche et les filtres
                </button>
              </div>
            ) : (
              <span className="text-wo-dim">Aucun prospect. Importez un fichier ou créez-en un.</span>
            )}
          </div>
        ) : (
          prospects.map((p) => (
            <ProspectListRow
              key={p.id}
              prospect={p}
              listReturnUrl={listReturnUrl}
              onStatusChange={changeStatus}
            />
          ))
        )}
      </div>
      )}

      {view === "list" && count > params.pageSize ? (
        <div className="flex items-center justify-between gap-3 text-sm text-wo-muted">
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
          projectId={projectId}
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            applyParams(params);
            setAllCount((n) => n + 1);
            router.refresh();
          }}
        />
      ) : null}

      <ClosedReasonModal
        key={closePrompt?.id ?? "close-reason"}
        open={Boolean(closePrompt)}
        clubName={prospects.find((p) => p.id === closePrompt?.id)?.club_name}
        onConfirm={confirmClose}
        onCancel={() => setClosePrompt(null)}
      />
    </div>
  );
}

function CreateProspectModal({
  onClose,
  onCreated,
  projectId,
}: {
  onClose: () => void;
  onCreated: () => void;
  projectId?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const body = Object.fromEntries(fd.entries());
    if (projectId && projectId !== "unassigned") body.project_id = projectId;
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
    <ScrollableModal
      open
      onClose={onClose}
      title="Nouveau prospect"
      asForm
      onSubmit={submit}
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" className={ui.btnSecondary} onClick={onClose}>
            Annuler
          </button>
          <button type="submit" className={ui.btnPrimary} disabled={loading}>
            {loading ? "Création…" : "Créer"}
          </button>
        </div>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        {(
          [
            ["club_name", "Nom / entreprise *", true],
            ["sport", "Secteur", false],
            ["contact_name", "Contact", false],
            ["phone", "Téléphone", false],
            ["email", "Email", false],
            ["website", "Site web", false],
            ["ville", "Ville", false],
            ["country", "Pays", false],
            ["source", "Source", false],
          ] as const
        ).map(([name, label, required]) => (
          <div key={name} className={name === "club_name" || name === "website" ? "sm:col-span-2" : ""}>
            <label className={ui.label}>{label}</label>
            <input name={name} required={required} className={ui.input} />
          </div>
        ))}
      </div>
      {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}
    </ScrollableModal>
  );
}
