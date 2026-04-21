"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useWavon } from "@/components/wavon/WavonProvider";
import { SectionCard } from "@/components/wavon/ui/SectionCard";
import { useToast } from "@/components/wavon/Toast";
import { btnGhostClass, btnPrimaryClass, labelClass } from "@/lib/wavon/tokens";
import { publicBookingAbsoluteUrl } from "@/lib/wavon/public-page-url";
import {
  normalizePublicSlugInput,
  PUBLIC_SLUG_MAX_LEN,
  validatePublicSlugFormat,
} from "@/lib/wavon/public-slug";

const DEBOUNCE_MS = 500;

type RemoteCheck = { slug: string; status: "loading" | "available" | "taken" };

export function MonLienTab() {
  const { state, patchSettings } = useWavon();
  const toast = useToast();
  const s = state.settings;
  const [slugInput, setSlugInput] = useState(() => s.publicSlug?.trim() ?? "");
  const [remoteCheck, setRemoteCheck] = useState<RemoteCheck | null>(null);

  const normalized = useMemo(() => normalizePublicSlugInput(slugInput), [slugInput]);
  const formatResult = useMemo(() => validatePublicSlugFormat(normalized), [normalized]);
  const savedNorm = useMemo(() => s.publicSlug?.trim().toLowerCase() ?? "", [s.publicSlug]);

  const availability = useMemo(() => {
    if (!formatResult.ok) {
      return normalized.length === 0
        ? ({ kind: "idle" } as const)
        : ({ kind: "invalid" } as const);
    }
    if (formatResult.slug === savedNorm) {
      return { kind: "available" } as const;
    }
    const r = remoteCheck;
    if (!r || r.slug !== formatResult.slug || r.status === "loading") {
      return { kind: "checking" } as const;
    }
    return r.status === "available"
      ? ({ kind: "available" } as const)
      : ({ kind: "taken" } as const);
  }, [formatResult, normalized.length, remoteCheck, savedNorm]);

  useEffect(() => {
    const fr = validatePublicSlugFormat(normalized);
    if (!fr.ok || fr.slug === savedNorm) {
      return;
    }
    const slug = fr.slug;
    const ctrl = new AbortController();
    const t = window.setTimeout(() => {
      setRemoteCheck({ slug, status: "loading" });
      void (async () => {
        try {
          const res = await fetch(
            `/api/business/check-public-slug?slug=${encodeURIComponent(slug)}`,
            { credentials: "include", signal: ctrl.signal }
          );
          const json = (await res.json()) as {
            ok?: boolean;
            validFormat?: boolean;
            available?: boolean;
          };
          if (ctrl.signal.aborted) return;
          if (!json.ok || !json.validFormat) {
            setRemoteCheck({ slug, status: "taken" });
            return;
          }
          setRemoteCheck({ slug, status: json.available ? "available" : "taken" });
        } catch {
          if (!ctrl.signal.aborted) setRemoteCheck(null);
        }
      })();
    }, DEBOUNCE_MS);

    return () => {
      window.clearTimeout(t);
      ctrl.abort();
    };
  }, [normalized, savedNorm]);

  const fullUrl = useMemo(() => {
    if (!formatResult.ok) return publicBookingAbsoluteUrl(normalized || "votre-lien");
    return publicBookingAbsoluteUrl(formatResult.slug);
  }, [formatResult, normalized]);

  const onSubmit = useCallback(
    (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (!formatResult.ok) {
        toast.push({ kind: "error", message: formatResult.error });
        return;
      }
      if (availability.kind === "taken") {
        toast.push({ kind: "error", message: "Cet identifiant est déjà utilisé." });
        return;
      }
      if (availability.kind === "checking") {
        toast.push({ kind: "error", message: "Vérification en cours, réessaie dans un instant." });
        return;
      }
      patchSettings({ publicSlug: formatResult.slug });
      toast.push({ message: "Lien enregistré." });
    },
    [availability.kind, formatResult, patchSettings, toast]
  );

  const copyLink = useCallback(() => {
    if (!formatResult.ok) return;
    const url = publicBookingAbsoluteUrl(formatResult.slug);
    void navigator.clipboard.writeText(url).then(() => {
      toast.push({ message: "Lien copié dans le presse-papiers." });
    });
  }, [formatResult, toast]);

  const openLink = useCallback(() => {
    if (!formatResult.ok) return;
    window.open(publicBookingAbsoluteUrl(formatResult.slug), "_blank", "noopener,noreferrer");
  }, [formatResult]);

  return (
    <SectionCard
      title="Ton lien de réservation"
      description="C'est le lien que tu partages avec tes clients pour qu'ils puissent réserver en ligne. Personnalise-le pour qu'il soit simple à retenir."
    >
      <form className="grid max-w-2xl gap-8" onSubmit={onSubmit}>
        <div>
          <label className={labelClass}>Identifiant de ton lien</label>
          <div className="mt-2 flex min-h-[44px] w-full overflow-hidden rounded-2xl border border-neutral-200/90 bg-white text-sm outline-none transition focus-within:border-neutral-300 focus-within:ring-2 focus-within:ring-neutral-950/5">
            <span className="flex shrink-0 items-center border-r border-neutral-200/90 bg-neutral-50 px-3 text-neutral-500">
              waevon.com/
            </span>
            <input
              type="text"
              className="min-w-0 flex-1 border-0 bg-transparent px-3 py-2.5 text-neutral-950 outline-none placeholder:text-neutral-400"
              value={slugInput}
              onChange={(e) =>
                setSlugInput(normalizePublicSlugInput(e.target.value).slice(0, PUBLIC_SLUG_MAX_LEN))
              }
              placeholder="ex: onglerie-alle"
              autoComplete="off"
              spellCheck={false}
            />
          </div>
          <p className="mt-1 text-xs text-neutral-400">
            Lettres minuscules, chiffres et tirets uniquement. Pas d&apos;espaces ni d&apos;accents.
          </p>
          {formatResult.ok && availability.kind === "taken" ? (
            <p className="mt-2 text-sm text-red-600">Cet identifiant est déjà utilisé, choisis-en un autre</p>
          ) : null}
          {formatResult.ok && availability.kind === "available" ? (
            <p className="mt-2 text-sm text-emerald-700">✓ Disponible</p>
          ) : null}
          {availability.kind === "checking" && formatResult.ok ? (
            <p className="mt-2 text-xs text-neutral-400">Vérification…</p>
          ) : null}
          {!formatResult.ok && normalized.length > 0 ? (
            <p className="mt-2 text-sm text-red-600">{formatResult.error}</p>
          ) : null}
        </div>

        <div className="rounded-2xl border border-neutral-200/90 bg-neutral-50/80 p-5">
          <p className={labelClass}>Aperçu de ton lien</p>
          <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="break-all text-base font-medium text-neutral-950">{fullUrl}</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" className={btnPrimaryClass} onClick={copyLink}>
                Copier le lien
              </button>
              <button type="button" className={btnGhostClass} onClick={openLink} disabled={!formatResult.ok}>
                Ouvrir le lien
              </button>
            </div>
          </div>
        </div>

        <button type="submit" className={`${btnPrimaryClass} w-fit`}>
          Enregistrer
        </button>
      </form>
    </SectionCard>
  );
}
