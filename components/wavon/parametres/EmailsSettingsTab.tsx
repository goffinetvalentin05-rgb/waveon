"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useWavon } from "@/components/wavon/WavonProvider";
import { SectionCard } from "@/components/wavon/ui/SectionCard";
import { useToast } from "@/components/wavon/Toast";
import { supabase } from "@/lib/supabase/client";
import type { EmailSettingType, EmailTemplateType } from "@/lib/wavon/types";
import {
  btnGhostClass,
  btnPrimaryClass,
  inputClass,
  labelClass,
  spinnerClass,
  textareaClass,
} from "@/lib/wavon/tokens";

type ScheduledRow = {
  id: string;
  business_id: string;
  type: EmailSettingType;
  enabled: boolean;
  delay_hours: number;
  subject: string;
  body: string;
  custom_links: Record<string, unknown>;
};

type UiEmailTab = "confirmation" | "reminder" | "cancellation" | "post_service";

const INSERT_VARS = [
  "{{client_name}}",
  "{{service_name}}",
  "{{service_price}}",
  "{{reservation_date}}",
  "{{reservation_time}}",
  "{{business_name}}",
  "{{business_phone}}",
  "{{business_address}}",
] as const;

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

type TestConfigurableJson = {
  ok?: boolean;
  error?: string;
  resendEnvKeyNames?: string[];
  serviceRoleEnvKeyNames?: string[];
};

function formatTestConfigurableError(json: TestConfigurableJson | null, res: Response, text: string): string {
  const nonJsonHint =
    text.trim() && !text.trim().startsWith("{") ? text.trim().slice(0, 240) : "";
  let message =
    json?.error ||
    nonJsonHint ||
    (res.status === 401
      ? "Session expirée ou non authentifié. Recharge la page puis réessaie."
      : `Envoi test impossible (${res.status}).`);
  if (json?.resendEnvKeyNames !== undefined) {
    if (json.resendEnvKeyNames.length > 0) {
      message += ` — Variables visibles côté serveur contenant « RESEND » : ${json.resendEnvKeyNames.join(", ")} (le code exige le nom exact RESEND_API_KEY).`;
    } else {
      message +=
        " — Aucune variable « RESEND* » n’est visible sur ce serveur : la clé n’est pas injectée dans cet environnement (mauvais projet Vercel, Preview vs Production, ou déploiement trop ancien).";
    }
  }
  if (json?.serviceRoleEnvKeyNames !== undefined) {
    if (json.serviceRoleEnvKeyNames.length > 0) {
      message += ` — Noms d’env contenant « SERVICE_ROLE » visibles : ${json.serviceRoleEnvKeyNames.join(", ")} (il faut exactement SUPABASE_SERVICE_ROLE_KEY).`;
    } else {
      message +=
        " — Aucune variable « *SERVICE_ROLE* » n’est visible sur ce serveur : ajoute SUPABASE_SERVICE_ROLE_KEY sur Vercel (Production) puis Redeploy.";
    }
  }
  return message;
}

async function postConfigurableEmailTest(body: unknown): Promise<{ ok: boolean; error: string }> {
  const res = await fetch("/api/emails/test-configurable", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json: TestConfigurableJson | null = null;
  try {
    json = text ? (JSON.parse(text) as TestConfigurableJson) : null;
  } catch {
    /* réponse non-JSON */
  }
  if (res.ok && json?.ok) return { ok: true, error: "" };
  return { ok: false, error: formatTestConfigurableError(json, res, text) };
}

export function EmailsSettingsTab() {
  const { ready, state, businessId, upsertEmailTemplate } = useWavon();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Record<EmailSettingType, ScheduledRow | null>>({
    reminder_before: null,
    post_service: null,
  });
  const [testTo, setTestTo] = useState("");
  const [primaryTab, setPrimaryTab] = useState<UiEmailTab>("confirmation");

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
      const map: Record<EmailSettingType, ScheduledRow | null> = { reminder_before: null, post_service: null };
      for (const r of (data ?? []) as ScheduledRow[]) map[r.type] = r;
      if (!cancelled) setRows(map);
      setLoading(false);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [businessId, toast]);

  const saveScheduled = async (type: EmailSettingType, patch: Partial<ScheduledRow>) => {
    if (!businessId) return;
    const cur = rows[type];
    const next: ScheduledRow = {
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

  const sendTestScheduled = async (type: EmailSettingType) => {
    if (!businessId) return;
    const to = effectiveTestTo;
    if (!to) {
      toast.push({ kind: "error", message: "Indique une adresse email pour le test." });
      return;
    }
    const { ok, error } = await postConfigurableEmailTest({
      businessId,
      mode: "scheduled",
      scheduledType: type,
      to,
    });
    if (!ok) {
      toast.push({ kind: "error", message: error });
      return;
    }
    toast.push({ message: "Email test envoyé." });
  };

  const sendTestTemplate = async (templateType: EmailTemplateType) => {
    if (!businessId) return;
    const to = effectiveTestTo;
    if (!to) {
      toast.push({ kind: "error", message: "Indique une adresse email pour le test." });
      return;
    }
    const { ok, error } = await postConfigurableEmailTest({
      businessId,
      mode: "template",
      templateType,
      to,
    });
    if (!ok) {
      toast.push({ kind: "error", message: error });
      return;
    }
    toast.push({ message: "Email test envoyé." });
  };

  if (!ready || loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className={spinnerClass} aria-hidden />
      </div>
    );
  }

  const reminder = rows.reminder_before;
  const post = rows.post_service;
  const links = normalizeLinks(post?.custom_links);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap gap-2 border-b border-neutral-200/80 pb-4">
        {(
          [
            ["confirmation", "Confirmation"],
            ["reminder", "Rappel"],
            ["cancellation", "Annulation"],
            ["post_service", "Post-prestation"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setPrimaryTab(id)}
            className={primaryTab === id ? btnPrimaryClass : btnGhostClass}
          >
            {label}
          </button>
        ))}
      </div>

      <SectionCard title="Email test" description="Envoie un exemplaire à ton adresse.">
        <div className="grid max-w-xl gap-3">
          <div>
            <label className={labelClass}>Adresse de test</label>
            <input
              className={`${inputClass} mt-2`}
              value={testTo}
              onChange={(e) => setTestTo(e.target.value)}
              placeholder={businessEmail || "ton@email.com"}
            />
          </div>
        </div>
      </SectionCard>

      {primaryTab === "confirmation" ? (
        <TemplateBlock
          title="Confirmation"
          description="Envoyé immédiatement après la réservation au client (et notification séparée au commerçant)."
          type="confirmation"
          initial={state.emailTemplates.find((t) => t.type === "confirmation") ?? null}
          onSave={(next) => {
            upsertEmailTemplate(next);
            toast.push({ message: "Template enregistré." });
          }}
          onTest={() => void sendTestTemplate("confirmation")}
        />
      ) : null}

      {primaryTab === "reminder" ? (
        <>
          <ScheduledBlock
            title="Rappel"
            description="Envoyé automatiquement X heures avant le rendez-vous."
            row={reminder}
            showDelay
            onSave={(p) => void saveScheduled("reminder_before", p)}
            onTest={() => void sendTestScheduled("reminder_before")}
          />
        </>
      ) : null}

      {primaryTab === "cancellation" ? (
        <TemplateBlock
          title="Annulation"
          description="Envoyé lorsque le rendez-vous est annulé."
          type="cancellation"
          initial={state.emailTemplates.find((t) => t.type === "cancellation") ?? null}
          onSave={(next) => {
            upsertEmailTemplate(next);
            toast.push({ message: "Template enregistré." });
          }}
          onTest={() => void sendTestTemplate("cancellation")}
        />
      ) : null}

      {primaryTab === "post_service" ? (
        <>
          <ScheduledBlock
            title="Post-prestation"
            description="Envoyé automatiquement X heures après le rendez-vous."
            row={post}
            showDelay
            onSave={(p) => void saveScheduled("post_service", p)}
            onTest={() => void sendTestScheduled("post_service")}
          />
          <SectionCard title="Liens à inclure dans l&apos;email" description="Boutons affichés uniquement si l&apos;URL est renseignée.">
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Lien avis Google</label>
                <input
                  className={`${inputClass} mt-2`}
                  value={links.google_review}
                  onChange={(e) =>
                    void saveScheduled("post_service", {
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
                    void saveScheduled("post_service", {
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
                    void saveScheduled("post_service", {
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
                    void saveScheduled("post_service", {
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
                      void saveScheduled("post_service", {
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
                      void saveScheduled("post_service", {
                        custom_links: { ...(post?.custom_links ?? {}), other_url: e.target.value },
                      })
                    }
                    placeholder="https://…"
                  />
                </div>
              </div>
            </div>
          </SectionCard>
        </>
      ) : null}
    </div>
  );
}

function VariableButtons({ onInsert }: { onInsert: (snippet: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {INSERT_VARS.map((v) => (
        <button
          key={v}
          type="button"
          className="rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 text-xs font-medium text-neutral-800 hover:bg-neutral-100"
          onClick={() => onInsert(v)}
        >
          {v}
        </button>
      ))}
    </div>
  );
}

function TemplateBlock(props: {
  title: string;
  description: string;
  type: EmailTemplateType;
  initial: { isEnabled: boolean; subject: string; body: string } | null;
  onSave: (next: { type: EmailTemplateType; isEnabled: boolean; subject: string; body: string }) => void;
  onTest: () => void;
}) {
  const [isEnabled, setIsEnabled] = useState(props.initial?.isEnabled ?? true);
  const [subject, setSubject] = useState(props.initial?.subject ?? "");
  const [body, setBody] = useState(props.initial?.body ?? "");
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setIsEnabled(props.initial?.isEnabled ?? true);
    setSubject(props.initial?.subject ?? "");
    setBody(props.initial?.body ?? "");
  }, [props.initial, props.type]);

  const insertIntoBody = useCallback(
    (snippet: string) => {
      const el = bodyRef.current;
      const start = el?.selectionStart ?? body.length;
      const end = el?.selectionEnd ?? body.length;
      const next = body.slice(0, start) + snippet + body.slice(end);
      setBody(next);
      queueMicrotask(() => {
        if (!el) return;
        const pos = start + snippet.length;
        el.selectionStart = el.selectionEnd = pos;
        el.focus();
      });
    },
    [body]
  );

  return (
    <SectionCard title={props.title} description={props.description}>
      <form
        className="grid max-w-3xl gap-5"
        onSubmit={(e) => {
          e.preventDefault();
          props.onSave({
            type: props.type,
            isEnabled,
            subject: subject.trim(),
            body,
          });
        }}
      >
        <label className="flex cursor-pointer items-center gap-3 text-sm text-neutral-700">
          <input
            type="checkbox"
            checked={isEnabled}
            onChange={(e) => setIsEnabled(e.target.checked)}
            className="size-4 rounded border-neutral-300 text-neutral-950"
          />
          <span className="font-medium text-neutral-950">Activer cet email</span>
        </label>

        <div>
          <label className={labelClass}>Objet</label>
          <input className={`${inputClass} mt-2`} value={subject} onChange={(e) => setSubject(e.target.value)} />
        </div>

        <div>
          <label className={labelClass}>Contenu</label>
          <textarea
            ref={bodyRef}
            className={`${textareaClass} mt-2 min-h-[220px]`}
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
          <p className={`${labelClass} mt-3`}>Insérer une variable</p>
          <div className="mt-2">
            <VariableButtons onInsert={insertIntoBody} />
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button type="button" className={btnGhostClass} onClick={props.onTest}>
            Envoyer un email test
          </button>
          <button type="submit" className={btnPrimaryClass}>
            Enregistrer le template
          </button>
        </div>
      </form>
    </SectionCard>
  );
}

function ScheduledBlock(props: {
  title: string;
  description: string;
  row: ScheduledRow | null;
  showDelay: boolean;
  onSave: (patch: { enabled: boolean; delay_hours: number; subject: string; body: string }) => void;
  onTest: () => void;
}) {
  const [enabled, setEnabled] = useState(props.row?.enabled ?? true);
  const [delayHours, setDelayHours] = useState(
    props.row?.delay_hours ?? (props.title === "Post-prestation" ? 2 : 24)
  );
  const [subject, setSubject] = useState(props.row?.subject ?? "");
  const [body, setBody] = useState(props.row?.body ?? "");
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setEnabled(props.row?.enabled ?? true);
    setDelayHours(props.row?.delay_hours ?? (props.title === "Post-prestation" ? 2 : 24));
    setSubject(props.row?.subject ?? "");
    setBody(props.row?.body ?? "");
  }, [props.row, props.title]);

  const insertIntoBody = useCallback(
    (snippet: string) => {
      const el = bodyRef.current;
      const start = el?.selectionStart ?? body.length;
      const end = el?.selectionEnd ?? body.length;
      const next = body.slice(0, start) + snippet + body.slice(end);
      setBody(next);
      queueMicrotask(() => {
        if (!el) return;
        const pos = start + snippet.length;
        el.selectionStart = el.selectionEnd = pos;
        el.focus();
      });
    },
    [body]
  );

  return (
    <SectionCard title={props.title} description={props.description}>
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

        {props.showDelay ? (
          <div>
            <label className={labelClass}>Délai (heures)</label>
            <input
              type="number"
              min={0}
              step={1}
              className={`${inputClass} mt-2 max-w-xs`}
              value={delayHours}
              onChange={(e) => setDelayHours(Number(e.target.value))}
            />
          </div>
        ) : null}

        <div>
          <label className={labelClass}>Objet</label>
          <input className={`${inputClass} mt-2`} value={subject} onChange={(e) => setSubject(e.target.value)} />
        </div>

        <div>
          <label className={labelClass}>Contenu</label>
          <textarea
            ref={bodyRef}
            className={`${textareaClass} mt-2 min-h-[220px]`}
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
          <p className={`${labelClass} mt-3`}>Insérer une variable</p>
          <div className="mt-2">
            <VariableButtons onInsert={insertIntoBody} />
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button type="button" className={btnGhostClass} onClick={props.onTest}>
            Envoyer un email test
          </button>
          <button type="submit" className={btnPrimaryClass}>
            Enregistrer le template
          </button>
        </div>
      </form>
    </SectionCard>
  );
}
