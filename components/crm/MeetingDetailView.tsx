"use client";

import Link from "next/link";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { IconArrowLeft, IconUsers } from "@tabler/icons-react";
import type { ReactNode } from "react";
import { ui } from "@/lib/design/tokens";
import {
  MEETING_TYPE_LABELS,
  participantNames,
  type ProspectMeeting,
} from "@/lib/crm/meetings";

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className={`${ui.card} p-4 lg:p-5`}>
      <h2 className={ui.h2}>{title}</h2>
      <div className="mt-3 text-[13.5px] leading-relaxed text-wo-secondary">{children}</div>
    </section>
  );
}

function List({ items }: { items: string[] }) {
  if (items.length === 0) return <p className="text-wo-dim">Non mentionné dans les notes.</p>;
  return (
    <ul className="space-y-1.5">
      {items.map((item) => (
        <li key={item} className="flex gap-2">
          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-wo-accent" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function MeetingDetailView({
  meeting,
  clubName,
  backHref,
}: {
  meeting: ProspectMeeting;
  clubName: string;
  backHref: string;
}) {
  const report = meeting.report;

  return (
    <div className="space-y-3 lg:space-y-5 crm-animate-in">
      <header>
        <Link href={backHref} className="inline-flex items-center gap-1.5 text-[12.5px] text-wo-dim transition hover:text-wo-text">
          <IconArrowLeft className="h-3.5 w-3.5" />
          {clubName}
        </Link>
        <p className="wo-kicker mt-3">
          {format(new Date(meeting.occurred_at), "d MMMM yyyy · HH:mm", { locale: fr })}
          {" · "}
          {MEETING_TYPE_LABELS[meeting.meeting_type]}
        </p>
        <h1 className="mt-2 font-display text-[1.45rem] font-semibold tracking-tight text-wo-text lg:text-[2rem]">
          {meeting.title}
        </h1>
        {meeting.participants.length > 0 ? (
          <p className="mt-2 flex items-center gap-1.5 text-[13px] text-wo-muted">
            <IconUsers className="h-4 w-4" />
            {participantNames(meeting.participants)}
          </p>
        ) : null}
      </header>

      {report.uncertain.length > 0 ? (
        <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-[13px] text-amber-100">
          À vérifier : {report.uncertain.join(" · ")}
        </div>
      ) : null}

      <Block title="Résumé">
        {report.summary ? <p className="whitespace-pre-wrap text-wo-text">{report.summary}</p> : <p className="text-wo-dim">Aucun résumé.</p>}
      </Block>
      <Block title="Points discutés">
        <List items={report.discussed} />
      </Block>
      <Block title="Besoins">
        <List items={report.needs} />
      </Block>
      <Block title="Retours / objections">
        <List items={[...report.feedback, ...report.objections]} />
      </Block>
      <Block title="Décisions">
        <List items={report.decisions} />
      </Block>
      <Block title="Informations importantes">
        <List items={report.important} />
      </Block>
      <Block title="Prochaines actions">
        {report.next_actions.length === 0 ? (
          <p className="text-wo-dim">Aucune action extraite.</p>
        ) : (
          <ul className="space-y-2">
            {report.next_actions.map((action) => (
              <li key={action.text} className="rounded-2xl border border-white/[0.05] bg-white/[0.03] px-3 py-2.5">
                <p className="font-medium text-wo-text">{action.text}</p>
                <p className="mt-1 text-[12px] text-wo-dim">
                  {[action.owner, action.due, action.uncertain ? "à vérifier" : null].filter(Boolean).join(" · ")}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Block>

      {(meeting.attachments ?? []).length > 0 ? (
        <Block title="Photos d’origine">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {(meeting.attachments ?? []).map((file) =>
              file.url ? (
                <a key={file.id} href={file.url} target="_blank" rel="noreferrer" className="overflow-hidden rounded-2xl border border-wo-border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={file.url} alt={file.file_name ?? "Note"} className="h-36 w-full object-cover" />
                </a>
              ) : null
            )}
          </div>
        </Block>
      ) : null}

      {meeting.notes_free ? (
        <Block title="Notes libres">
          <p className="whitespace-pre-wrap">{meeting.notes_free}</p>
        </Block>
      ) : null}

      {meeting.revisions.length > 0 ? (
        <Block title="Historique des modifications">
          <ul className="space-y-1.5 text-[12.5px] text-wo-dim">
            <li>Créé le {format(new Date(meeting.created_at), "d MMM yyyy à HH:mm", { locale: fr })}</li>
            {meeting.revisions.map((rev) => (
              <li key={rev.at}>{format(new Date(rev.at), "d MMM yyyy à HH:mm", { locale: fr })} — {rev.note || "Modifié"}</li>
            ))}
          </ul>
        </Block>
      ) : null}
    </div>
  );
}
