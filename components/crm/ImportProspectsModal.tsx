"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  IconAlertCircle,
  IconArrowLeft,
  IconCheck,
  IconFileSpreadsheet,
  IconLoader2,
  IconUpload,
} from "@tabler/icons-react";
import {
  autoMapColumns,
  IMPORT_FIELDS,
  mapRowToProspect,
  type ColumnMapping,
  type DuplicateStrategy,
  type ImportFieldKey,
  type ImportProspectRow,
  type ParsedImportFile,
} from "@/lib/crm/import-fields";
import { parseImportFile } from "@/lib/crm/import-parse";
import { ui } from "@/lib/design/tokens";

type Step = "select" | "preview" | "success";

type PreviewCounts = {
  willImport: number;
  willCreate: number;
  willUpdate: number;
  willSkip: number;
  invalidCount: number;
};

type ImportProspectsModalProps = {
  open: boolean;
  onClose: () => void;
  onImported: (result: { imported: number; updated: number; skipped: number }) => void;
};

export function ImportProspectsModal({ open, onClose, onImported }: ImportProspectsModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>("select");
  const [fileName, setFileName] = useState("");
  const [parsed, setParsed] = useState<ParsedImportFile | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [duplicateStrategy, setDuplicateStrategy] = useState<DuplicateStrategy>("ignore");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [previewCounts, setPreviewCounts] = useState<PreviewCounts | null>(null);
  const [result, setResult] = useState<{
    imported: number;
    updated: number;
    skipped: number;
    errors: string[];
  } | null>(null);

  const reset = useCallback(() => {
    setStep("select");
    setFileName("");
    setParsed(null);
    setMapping({});
    setDuplicateStrategy("ignore");
    setError(null);
    setLoading(false);
    setImporting(false);
    setPreviewCounts(null);
    setResult(null);
  }, []);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [onClose, reset]);

  const mappedRows = useMemo((): ImportProspectRow[] => {
    if (!parsed) return [];
    return parsed.rows
      .map((row) => mapRowToProspect(parsed.columns, row, mapping))
      .filter((r): r is ImportProspectRow => r !== null);
  }, [parsed, mapping]);

  const hasClubMapping = useMemo(() => {
    return Object.values(mapping).includes("club_name");
  }, [mapping]);

  const previewRows = useMemo(() => {
    if (!parsed) return [];
    return parsed.rows.slice(0, 5);
  }, [parsed]);

  const fetchPreviewCounts = useCallback(async () => {
    if (!mappedRows.length) {
      setPreviewCounts({
        willImport: 0,
        willCreate: 0,
        willUpdate: 0,
        willSkip: parsed?.totalRows ?? 0,
        invalidCount: (parsed?.totalRows ?? 0) - mappedRows.length,
      });
      return;
    }
    try {
      const res = await fetch("/api/prospects/import", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: mappedRows, duplicateStrategy }),
      });
      const data = await res.json();
      if (res.ok) setPreviewCounts(data);
    } catch {
      /* preview non bloquant */
    }
  }, [mappedRows, duplicateStrategy, parsed?.totalRows]);

  useEffect(() => {
    if (step === "preview" && hasClubMapping) {
      const t = setTimeout(() => void fetchPreviewCounts(), 300);
      return () => clearTimeout(t);
    }
  }, [step, hasClubMapping, fetchPreviewCounts, mapping, duplicateStrategy]);

  const handleFileSelect = async (file: File) => {
    setError(null);
    setLoading(true);
    try {
      const data = await parseImportFile(file);
      const autoMapping = autoMapColumns(data.columns);
      setFileName(file.name);
      setParsed(data);
      setMapping(autoMapping);
      setStep("preview");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de lire le fichier.");
      setStep("select");
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!hasClubMapping) {
      setError("La colonne « Nom du club » est obligatoire.");
      return;
    }
    if (mappedRows.length === 0) {
      setError("Aucune ligne valide à importer.");
      return;
    }

    setImporting(true);
    setError(null);
    try {
      const res = await fetch("/api/prospects/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: mappedRows, duplicateStrategy }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Erreur lors de l'import.");
        if (data.errors?.length) {
          setError(`${data.error}\n${data.errors.slice(0, 3).join("\n")}`);
        }
        return;
      }
      setResult({
        imported: data.imported ?? 0,
        updated: data.updated ?? 0,
        skipped: data.skipped ?? 0,
        errors: data.errors ?? [],
      });
      setStep("success");
      onImported({
        imported: data.imported ?? 0,
        updated: data.updated ?? 0,
        skipped: data.skipped ?? 0,
      });
    } catch {
      setError("Erreur réseau lors de l'import.");
    } finally {
      setImporting(false);
    }
  };

  const updateMapping = (column: string, field: ImportFieldKey | "") => {
    setMapping((prev) => {
      const next = { ...prev };
      // Retirer ce champ d'une autre colonne si déjà assigné
      if (field) {
        for (const col of Object.keys(next)) {
          if (col !== column && next[col] === field) next[col] = "";
        }
      }
      next[column] = field;
      return next;
    });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className={ui.overlay}
        onClick={step === "success" ? handleClose : undefined}
        aria-label="Fermer"
      />

      <div className={`${ui.modal} flex max-h-[90vh] max-w-3xl flex-col`}>
        {/* Header */}
        <div className="border-b border-wo-border px-6 py-4">
          <h2 className="text-lg font-semibold text-wo-text">Importer des prospects</h2>
          {fileName && step !== "select" ? (
            <p className="mt-0.5 flex items-center gap-1.5 text-sm text-wo-muted">
              <IconFileSpreadsheet className="h-4 w-4" stroke={1.75} />
              {fileName}
            </p>
          ) : null}
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {/* Étape 1 : sélection fichier */}
          {step === "select" ? (
            <div className="space-y-4">
              <p className="text-sm text-wo-muted">
                Formats acceptés : CSV, Excel (.xlsx, .xls). Encodage UTF-8 recommandé pour les CSV.
              </p>

              <label
                className={`flex cursor-pointer flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-wo-border bg-wo-hover/50 px-6 py-10 transition hover:border-indigo-300 hover:bg-indigo-50 ${loading ? "pointer-events-none opacity-60" : ""}`}
              >
                {loading ? (
                  <IconLoader2 className="h-8 w-8 animate-spin text-wo-accent" />
                ) : (
                  <IconUpload className="h-8 w-8 text-wo-dim" stroke={1.5} />
                )}
                <span className="text-sm font-medium text-wo-secondary">
                  {loading ? "Lecture du fichier…" : "Cliquez pour sélectionner un fichier"}
                </span>
                <span className="text-xs text-wo-dim">.csv · .xlsx · .xls</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void handleFileSelect(f);
                    e.target.value = "";
                  }}
                />
              </label>

              {error ? <ErrorBox message={error} /> : null}
            </div>
          ) : null}

          {/* Étape 2 : aperçu + mapping */}
          {step === "preview" && parsed ? (
            <div className="space-y-6">
              {/* Stats */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <StatCard label="Lignes détectées" value={parsed.totalRows} />
                <StatCard label="Colonnes" value={parsed.columns.length} />
                <StatCard
                  label="Lignes valides"
                  value={mappedRows.length}
                  accent={hasClubMapping ? undefined : "text-rose-600"}
                />
              </div>

              {/* Mapping colonnes */}
              <section>
                <h3 className="text-sm font-semibold text-wo-text">Association des colonnes</h3>
                <p className="mt-0.5 text-xs text-wo-dim">
                  Associez chaque colonne du fichier à un champ CRM. « Nom du club » est obligatoire.
                </p>
                <div className="mt-3 space-y-2">
                  {parsed.columns.map((col) => (
                    <div key={col} className="flex items-center gap-3">
                      <span className="w-2/5 truncate text-sm text-wo-muted" title={col}>
                        {col || "(sans nom)"}
                      </span>
                      <span className="text-wo-dim">→</span>
                      <select
                        className={`${ui.input} flex-1 text-sm`}
                        value={mapping[col] ?? ""}
                        onChange={(e) =>
                          updateMapping(col, e.target.value as ImportFieldKey | "")
                        }
                      >
                        <option value="">— Ignorer —</option>
                        {IMPORT_FIELDS.map((f) => (
                          <option key={f.key} value={f.key}>
                            {f.label}
                            {f.required ? " *" : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
                {!hasClubMapping ? (
                  <p className="mt-2 flex items-center gap-1.5 text-xs text-rose-600">
                    <IconAlertCircle className="h-3.5 w-3.5" />
                    Associez au moins une colonne au champ « Nom du club ».
                  </p>
                ) : null}
              </section>

              {/* Doublons */}
              <section>
                <h3 className="text-sm font-semibold text-wo-text">Gestion des doublons</h3>
                <p className="mt-0.5 text-xs text-wo-dim">
                  Détection par email, nom de club ou téléphone.
                </p>
                <div className="mt-3 space-y-2">
                  {(
                    [
                      ["ignore", "Ignorer les doublons", "Ne pas importer les lignes déjà existantes."],
                      ["import_anyway", "Importer quand même", "Créer de nouveaux prospects même si un doublon est détecté."],
                      ["update", "Mettre à jour les existants", "Enrichir les prospects existants avec les nouvelles données."],
                    ] as const
                  ).map(([value, label, hint]) => (
                    <label
                      key={value}
                      className={`flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 transition ${
                        duplicateStrategy === value
                          ? "border-indigo-200 bg-indigo-50"
                          : "border-wo-border hover:bg-wo-hover"
                      }`}
                    >
                      <input
                        type="radio"
                        name="duplicateStrategy"
                        value={value}
                        checked={duplicateStrategy === value}
                        onChange={() => setDuplicateStrategy(value)}
                        className="mt-0.5"
                      />
                      <div>
                        <p className="text-sm font-medium text-wo-text">{label}</p>
                        <p className="text-xs text-wo-dim">{hint}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </section>

              {/* Aperçu 5 lignes */}
              <section>
                <h3 className="text-sm font-semibold text-wo-text">Aperçu (5 premières lignes)</h3>
                <div className="mt-2 overflow-x-auto rounded-xl border border-wo-border">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-wo-border bg-wo-hover">
                        {parsed.columns.map((col, i) => (
                          <th key={i} className="whitespace-nowrap px-3 py-2 text-left font-medium text-wo-muted">
                            {col || `Col ${i + 1}`}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewRows.map((row, ri) => (
                        <tr key={ri} className="border-b border-wo-border last:border-0">
                          {row.map((cell, ci) => (
                            <td key={ci} className="whitespace-nowrap px-3 py-2 text-wo-secondary">
                              {cell || "—"}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* Compteur avant import */}
              {hasClubMapping && previewCounts ? (
                <div className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3">
                  <p className="text-sm font-medium text-indigo-700">
                    {previewCounts.willImport} prospect{previewCounts.willImport > 1 ? "s" : ""}{" "}
                    {previewCounts.willImport > 1 ? "seront importés" : "sera importé"}
                    {previewCounts.willUpdate > 0
                      ? ` (${previewCounts.willCreate} création${previewCounts.willCreate > 1 ? "s" : ""}, ${previewCounts.willUpdate} mise${previewCounts.willUpdate > 1 ? "s" : ""} à jour)`
                      : ""}
                    .
                  </p>
                  {previewCounts.willSkip > 0 ? (
                    <p className="mt-0.5 text-xs text-wo-accent">
                      {previewCounts.willSkip} ligne{previewCounts.willSkip > 1 ? "s" : ""} ignorée
                      {previewCounts.willSkip > 1 ? "s" : ""}.
                    </p>
                  ) : null}
                </div>
              ) : null}

              {error ? <ErrorBox message={error} /> : null}
            </div>
          ) : null}

          {/* Étape 3 : succès */}
          {step === "success" && result ? (
            <div className="space-y-4 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
                <IconCheck className="h-7 w-7 text-emerald-600" stroke={2} />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-wo-text">Import terminé</h3>
                <p className="mt-2 text-sm text-wo-muted">
                  {result.imported} prospect{result.imported > 1 ? "s" : ""} créé
                  {result.imported > 1 ? "s" : ""}
                  {result.updated > 0
                    ? `, ${result.updated} mis à jour`
                    : ""}
                  .
                </p>
                {result.skipped > 0 ? (
                  <p className="mt-1 text-sm text-wo-dim">
                    {result.skipped} ligne{result.skipped > 1 ? "s" : ""} ignorée
                    {result.skipped > 1 ? "s" : ""}.
                  </p>
                ) : null}
              </div>
              {result.errors.length > 0 ? (
                <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-left text-xs text-amber-800">
                  {result.errors.slice(0, 5).map((e, i) => (
                    <p key={i}>{e}</p>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between gap-2 border-t border-wo-border px-6 py-4">
          {step === "select" ? (
            <>
              <div />
              <button type="button" className={ui.btnSecondary} onClick={handleClose}>
                Annuler
              </button>
            </>
          ) : null}

          {step === "preview" ? (
            <>
              <button
                type="button"
                className={ui.btnGhost}
                disabled={importing}
                onClick={() => {
                  setStep("select");
                  setParsed(null);
                  setFileName("");
                  setError(null);
                }}
              >
                <IconArrowLeft className="h-4 w-4" />
                Retour
              </button>
              <div className="flex gap-2">
                <button type="button" className={ui.btnSecondary} disabled={importing} onClick={handleClose}>
                  Annuler
                </button>
                <button
                  type="button"
                  className={ui.btnPrimary}
                  disabled={importing || !hasClubMapping || mappedRows.length === 0}
                  onClick={() => void handleImport()}
                >
                  {importing ? (
                    <>
                      <IconLoader2 className="h-4 w-4 animate-spin" />
                      Import en cours…
                    </>
                  ) : (
                    `Importer ${previewCounts?.willImport ?? mappedRows.length} prospect${(previewCounts?.willImport ?? mappedRows.length) > 1 ? "s" : ""}`
                  )}
                </button>
              </div>
            </>
          ) : null}

          {step === "success" ? (
            <>
              <div />
              <button type="button" className={ui.btnPrimary} onClick={handleClose}>
                Fermer
              </button>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: string;
}) {
  return (
    <div className="rounded-xl border border-wo-border bg-wo-hover/50 px-4 py-3">
      <p className="text-xs text-wo-dim">{label}</p>
      <p className={`mt-0.5 text-xl font-semibold ${accent ?? "text-wo-text"}`}>{value}</p>
    </div>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
      <IconAlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <span className="whitespace-pre-line">{message}</span>
    </div>
  );
}
