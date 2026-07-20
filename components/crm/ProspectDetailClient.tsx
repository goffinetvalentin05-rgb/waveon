"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  IconArrowLeft,
  IconMail,
  IconPhone,
  IconPresentation,
  IconUserCheck,
  IconUserX,
} from "@tabler/icons-react";
import { StatusBadge } from "@/components/crm/StatusBadge";
import { QUICK_ACTION_LABELS } from "@/lib/crm/actions";
import type { Prospect, ProspectActivity, QuickAction } from "@/lib/crm/types";
import { ui } from "@/lib/design/tokens";

function fmtDay(iso: string) {
  return format(new Date(iso), "d MMMM yyyy", { locale: fr });
}

export function ProspectDetailClient({
  prospect: initial,
  activities: initialActivities,
}: {
  prospect: Prospect;
  activities: ProspectActivity[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [prospect, setProspect] = useState(initial);
  const [activities, setActivities] = useState(initialActivities);
  const [notes, setNotes] = useState(initial.notes ?? "");
  const [msg, setMsg] = useState<string | null>(null);

  const runAction = (action: QuickAction) => {
    setMsg(null);
    startTransition(async () => {
      const res = await fetch(`/api/prospects/${prospect.id}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg(data.error ?? "Erreur");
        return;
      }
      setProspect(data.prospect);
      setMsg(`${QUICK_ACTION_LABELS[action]} — enregistré.`);
      const refreshed = await fetch(`/api/prospects/${prospect.id}`);
      const json = await refreshed.json();
      if (refreshed.ok) {
        setActivities(json.activities);
        setProspect(json.prospect);
      }
      router.refresh();
    });
  };

  const saveNotes = () => {
    startTransition(async () => {
      const res = await fetch(`/api/prospects/${prospect.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });
      if (res.ok) {
        const data = await res.json();
        setProspect(data.prospect);
        setMsg("Notes enregistrées.");
      }
    });
  };

  const actions: { key: QuickAction; label: string; icon: React.ReactNode; className: string }[] = [
    {
      key: "mail_sent",
      label: "Mail envoyé",
      icon: <IconMail className="h-4 w-4" />,
      className: ui.btnSecondary,
    },
    {
      key: "call_made",
      label: "Appel effectué",
      icon: <IconPhone className="h-4 w-4" />,
      className: ui.btnSecondary,
    },
    {
      key: "demo_scheduled",
      label: "Démonstration planifiée",
      icon: <IconPresentation className="h-4 w-4" />,
      className: ui.btnSecondary,
    },
    {
      key: "client",
      label: "Client",
      icon: <IconUserCheck className="h-4 w-4" />,
      className: "inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-700 transition hover:bg-emerald-100",
    },
    {
      key: "refus",
      label: "Refus",
      icon: <IconUserX className="h-4 w-4" />,
      className: ui.btnDanger,
    },
  ];

  return (
    <div className="space-y-6 crm-animate-in">
      <div>
        <Link
          href="/prospects"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800"
        >
          <IconArrowLeft className="h-4 w-4" />
          Prospects
        </Link>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className={ui.h1}>{prospect.club_name}</h1>
            <div className="mt-2">
              <StatusBadge status={prospect.status} />
            </div>
          </div>
        </div>
      </div>

      {msg ? (
        <p className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-2.5 text-sm text-blue-700">
          {msg}
        </p>
      ) : null}

      <section className={`${ui.card} p-5 sm:p-6`}>
        <h2 className={ui.h2}>Actions rapides</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {actions.map((a) => (
            <button
              key={a.key}
              type="button"
              disabled={pending}
              className={a.className}
              onClick={() => runAction(a.key)}
            >
              {a.icon}
              {a.label}
            </button>
          ))}
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className={`${ui.card} p-5 sm:p-6`}>
          <h2 className={ui.h2}>Informations générales</h2>
          <dl className="mt-4 space-y-3 text-sm">
            {(
              [
                ["Sport", prospect.sport],
                ["Canton", prospect.canton],
                ["Contact", prospect.contact_name],
                ["Téléphone", prospect.phone],
                ["Email", prospect.email],
                ["Site web", prospect.website],
                ["Dernière action", prospect.last_action],
                [
                  "Prochaine relance",
                  prospect.next_follow_up
                    ? format(new Date(`${prospect.next_follow_up}T12:00:00`), "d MMMM yyyy", {
                        locale: fr,
                      })
                    : null,
                ],
              ] as const
            ).map(([label, value]) => (
              <div key={label} className="flex justify-between gap-4 border-b border-slate-50 pb-2 last:border-0">
                <dt className="text-slate-400">{label}</dt>
                <dd className="text-right font-medium text-slate-800">
                  {value ? (
                    label === "Site web" ? (
                      <a
                        href={value.startsWith("http") ? value : `https://${value}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        {value}
                      </a>
                    ) : label === "Email" ? (
                      <a href={`mailto:${value}`} className="text-blue-600 hover:underline">
                        {value}
                      </a>
                    ) : label === "Téléphone" ? (
                      <a href={`tel:${value}`} className="text-blue-600 hover:underline">
                        {value}
                      </a>
                    ) : (
                      value
                    )
                  ) : (
                    "—"
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <section className={`${ui.card} p-5 sm:p-6`}>
          <h2 className={ui.h2}>Notes</h2>
          <textarea
            className={`${ui.input} mt-4 min-h-[140px] resize-y`}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes libres sur ce prospect…"
          />
          <div className="mt-3 flex justify-end">
            <button type="button" className={ui.btnPrimary} disabled={pending} onClick={saveNotes}>
              Enregistrer
            </button>
          </div>
        </section>
      </div>

      <section className={`${ui.card} p-5 sm:p-6`}>
        <h2 className={ui.h2}>Historique</h2>
        {activities.length === 0 ? (
          <p className="mt-4 text-sm text-slate-400">Aucune action pour le moment.</p>
        ) : (
          <ol className="mt-5 space-y-0">
            {activities.map((a, idx) => (
              <li key={a.id} className="relative flex gap-4 pb-6 last:pb-0">
                {idx < activities.length - 1 ? (
                  <span className="absolute left-[7px] top-3 h-full w-px bg-slate-100" />
                ) : null}
                <span className="relative mt-1.5 h-3.5 w-3.5 shrink-0 rounded-full border-2 border-blue-500 bg-white" />
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    {fmtDay(a.created_at)}
                  </p>
                  <p className="mt-0.5 text-sm font-medium text-slate-800">{a.title}</p>
                  {a.description ? (
                    <p className="mt-0.5 text-sm text-slate-500">{a.description}</p>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
