"use client";

import { useEffect, useMemo, useState } from "react";
import { useWavon } from "@/components/wavon/WavonProvider";
import { PageHeader } from "@/components/wavon/ui/PageHeader";
import { SectionCard } from "@/components/wavon/ui/SectionCard";
import { useToast } from "@/components/wavon/Toast";
import { supabase } from "@/lib/supabase/client";
import type { EmailSettingType } from "@/lib/wavon/types";
import {
  btnGhostClass,
  btnPrimaryClass,
  inputClass,
  labelClass,
  spinnerClass,
  textareaClass,
} from "@/lib/wavon/tokens";

type DbRow = {
  id: string;
  business_id: string;
  type: EmailSettingType;
  enabled: boolean;
  delay_hours: number;
  subject: string;
  body: string;
  custom_links: Record<string, unknown>;
};

function asString(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function normalizeLinks(obj: Record<string, unknown> | null | undefined) {
  const x = obj ?? {};
  return {
    google_review: asString(x.google_review),
    instagram: asString(x.instagram),
    tiktok: asString(x.tiktok),
    website: asString(x.website),
    other_label: asString(x.other_label),
    other_url: asString(x.other_url),
  };
}

const VARS = [
  "{{client_name}}",
  "{{service_name}}",
  "{{reservation_date}}",
  "{{reservation_time}}",
  "{{business_name}}",
  "{{business_phone}}",
  "{{business_address}}",
] as const;

export default function EmailsSettingsPage() {
  const { ready, state, businessId } = useWavon();
  const toast = useToast();
  const [loading, setLoading] = useState(true);

  const [rows, setRows] = useState<Record<EmailSettingType, DbRow | null>>({
    reminder_before: null,
    post_service: null,
  });

  const [testTo, setTestTo] = useState<string>("");

  const businessEmail = useMemo(() => (state.settings.email ?? "").trim(), [state.settings.email]);
  const effectiveTestTo = (testTo.trim() || businessEmail).trim();

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!businessId) return;
      setLoading(true);
      const { data, error } = await supabase
        .from("wavon_email_settings")
        .select("id,business_id,type,enabled,delay_hours,subject,body,custom_links")
        .eq("business_id", businessId);
      if (error) {
        if (!cancelled) toast.push({ kind: "error", message: `Chargement impossible: ${error.message}` });
        setLoading(false);
        return;
      }
      const map: Record<EmailSettingType, DbRow | null> = { reminder_before: null, post_service: null };
      for (const r of (data ?? []) as DbRow[]) map[r.type] = r;
      if (!cancelled) setRows(map);
      setLoading(false);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [businessId, toast]);

  if (!ready || loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className={spinnerClass} aria-hidden />
      </div>
    );
  }

  const save = async (type: EmailSettingType, patch: Partial<DbRow>) => {
    if (!businessId) return;
    const cur = rows[type];
    const next: DbRow = {
      id: cur?.id ?? crypto.randomUUID(),
      business_id: businessId,
      type,
      enabled: patch.enabled ?? cur?.enabled ?? true,
      delay_hours: patch.delay_hours ?? cur?.delay_hours ?? (type === "post_service" ? 2 : 24),
      subject: patch.subject ?? cur?.subject ?? "",
      body: patch.body ?? cur?.body ?? "",
      custom_links: patch.custom_links ?? cur?.custom_links ?? {},
    };

    setRows((prev) => ({ ...prev, [type]: next }));
    const { error } = await supabase.from("wavon_email_settings").upsert(
      {
        business_id: businessId,
        type,
        enabled: next.enabled,
        delay_hours: next.delay_hours,
        subject: next.subject,
        body: next.body,
        custom_links: next.custom_links,
      },
      { onConflict: "business_id,type" }
    );
    if (error) {
      toast.push({ kind: "error", message: `Sauvegarde impossible: ${error.message}` });
      return;
    }
    toast.push({ message: "Réglages enregistrés." });
  };

  const sendTest = async (type: EmailSettingType) => {
    if (!businessId) return;
    const to = effectiveTestTo;
    if (!to) {
      toast.push({ kind: "error", message: "Indique une adresse email pour le test." });
      return;
    }
    const res = await fetch("/api/emails/test-configurable", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businessId, type, to }),
    });
    const json = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
    if (!res.ok || !json?.ok) {
      toast.push({ kind: "error", message: json?.error || "Envoi test impossible." });
      return;
    }
    toast.push({ message: "Email test envoyé." });
  };

  const reminder = rows.reminder_before;
  const post = rows.post_service;
  const links = normalizeLinks(post?.custom_links);

  return (
    <div className="space-y-10 pb-12">
      <PageHeader
        title="Emails"
        description="Configure les emails automatiques (rappel et post-prestation). Variables disponibles ci-dessous."
      />

      <SectionCard
        title="Variables disponibles"
        description="À utiliser dans l’objet et le corps :"
      >
        <div className="flex flex-wrap gap-2">
          {VARS.map((v) => (
            <code key={v} className="rounded-full bg-neutral-100 px-3 py-1 text-xs text-neutral-800">
              {v}
            </code>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title="Email test"
        description="Envoie un email de test à ton adresse (dev uniquement)."
      >
        <div className="grid max-w-xl gap-3">
          <div>
            <label className={labelClass}>Adresse de test</label>
            <input
              className={`${inputClass} mt-2`}
              value={testTo}
              onChange={(e) => setTestTo(e.target.value)}
              placeholder={businessEmail || "ton@email.com"}
            />
            <p className="mt-2 text-xs text-neutral-400">
              Astuce : on pré-remplit avec l’email du business si renseigné.
            </p>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Rappel avant RDV"
        description="Envoyé automatiquement X heures avant le rendez-vous."
      >
        <EmailEditor
          type="reminder_before"
          enabled={reminder?.enabled ?? true}
          delayHours={reminder?.delay_hours ?? 24}
          subject={reminder?.subject ?? ""}
          body={reminder?.body ?? ""}
          onSave={(p) => void save("reminder_before", p)}
          onTest={() => void sendTest("reminder_before")}
        />
      </SectionCard>

      <SectionCard
        title="Email post-prestation"
        description="Envoyé automatiquement X heures après le rendez-vous (idéal pour avis et réseaux)."
      >
        <EmailEditor
          type="post_service"
          enabled={post?.enabled ?? true}
          delayHours={post?.delay_hours ?? 2}
          subject={post?.subject ?? ""}
          body={post?.body ?? ""}
          onSave={(p) => void save("post_service", { ...p, custom_links: rows.post_service?.custom_links ?? {} })}
          onTest={() => void sendTest("post_service")}
        />

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Lien avis Google</label>
            <input
              className={`${inputClass} mt-2`}
              value={links.google_review}
              onChange={(e) =>
                void save("post_service", {
                  custom_links: { ...(post?.custom_links ?? {}), google_review: e.target.value },
                })
              }
              placeholder="https://…"
            />
          </div>
          <div>
            <label className={labelClass}>Instagram</label>
            <input
              className={`${inputClass} mt-2`}
              value={links.instagram}
              onChange={(e) =>
                void save("post_service", {
                  custom_links: { ...(post?.custom_links ?? {}), instagram: e.target.value },
                })
              }
              placeholder="https://instagram.com/…"
            />
          </div>
          <div>
            <label className={labelClass}>TikTok</label>
            <input
              className={`${inputClass} mt-2`}
              value={links.tiktok}
              onChange={(e) =>
                void save("post_service", {
                  custom_links: { ...(post?.custom_links ?? {}), tiktok: e.target.value },
                })
              }
              placeholder="https://tiktok.com/@…"
            />
          </div>
          <div>
            <label className={labelClass}>Site web</label>
            <input
              className={`${inputClass} mt-2`}
              value={links.website}
              onChange={(e) =>
                void save("post_service", {
                  custom_links: { ...(post?.custom_links ?? {}), website: e.target.value },
                })
              }
              placeholder="https://…"
            />
          </div>
          <div className="sm:col-span-2 grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Autre — libellé</label>
              <input
                className={`${inputClass} mt-2`}
                value={links.other_label}
                onChange={(e) =>
                  void save("post_service", {
                    custom_links: { ...(post?.custom_links ?? {}), other_label: e.target.value },
                  })
                }
                placeholder="Ex. Voir mon portfolio"
              />
            </div>
            <div>
              <label className={labelClass}>Autre — URL</label>
              <input
                className={`${inputClass} mt-2`}
                value={links.other_url}
                onChange={(e) =>
                  void save("post_service", {
                    custom_links: { ...(post?.custom_links ?? {}), other_url: e.target.value },
                  })
                }
                placeholder="https://…"
              />
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Planification (toutes les 15 minutes)"
        description="Le job cron doit appeler l’endpoint sécurisé côté serveur."
      >
        <p className="text-sm text-neutral-600">
          Endpoint: <code className="rounded bg-neutral-100 px-2 py-0.5 text-xs">POST /api/cron/emails</code>
        </p>
        <p className="mt-2 text-xs text-neutral-400">
          Il faut configurer un cron côté Supabase (pg_cron + pg_net) qui envoie le header{" "}
          <code className="rounded bg-neutral-100 px-2 py-0.5 text-xs">x-cron-secret</code>.
        </p>
      </SectionCard>
    </div>
  );
}

function EmailEditor(props: {
  type: EmailSettingType;
  enabled: boolean;
  delayHours: number;
  subject: string;
  body: string;
  onSave: (patch: { enabled: boolean; delay_hours: number; subject: string; body: string }) => void;
  onTest: () => void;
}) {
  const [enabled, setEnabled] = useState(props.enabled);
  const [delayHours, setDelayHours] = useState(props.delayHours);
  const [subject, setSubject] = useState(props.subject);
  const [body, setBody] = useState(props.body);

  return (
    <form
      className="grid max-w-3xl gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        props.onSave({
          enabled,
          delay_hours: Math.max(0, Number(delayHours) || 0),
          subject: subject.trim(),
          body,
        });
      }}
    >
      <label className="flex cursor-pointer items-center gap-3 text-sm text-neutral-700">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
          className="size-4 rounded border-neutral-300 text-neutral-950"
        />
        <span className="font-medium text-neutral-950">Activer cet email</span>
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass}>Délai (heures)</label>
          <input
            type="number"
            min={0}
            step={1}
            className={`${inputClass} mt-2`}
            value={delayHours}
            onChange={(e) => setDelayHours(Number(e.target.value))}
          />
        </div>
        <div className="flex items-end gap-2">
          <button type="button" className={btnGhostClass} onClick={props.onTest}>
            Envoyer un email test
          </button>
        </div>
      </div>

      <div>
        <label className={labelClass}>Objet</label>
        <input className={`${inputClass} mt-2`} value={subject} onChange={(e) => setSubject(e.target.value)} />
      </div>

      <div>
        <label className={labelClass}>Corps</label>
        <textarea
          className={`${textareaClass} mt-2 min-h-[220px]`}
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
      </div>

      <div className="flex flex-wrap gap-3">
        <button type="submit" className={btnPrimaryClass}>
          Enregistrer
        </button>
      </div>
    </form>
  );
}

