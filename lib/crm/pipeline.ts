import type { Prospect, ProspectStatus } from "@/lib/crm/types";
import { isClosedProspectStatus, isDemoScheduledStatus } from "@/lib/crm/closed";
import { migrateProspectStatus } from "@/lib/crm/status";

export type PipelineColumnId =
  | "to_contact"
  | "outreach"
  | "waiting"
  | "discussion"
  | "demo"
  | "considering"
  | "client"
  | "lost";

export type PipelineColumn = {
  id: PipelineColumnId;
  label: string;
  accent: string;
  statuses: ProspectStatus[];
};

export const PIPELINE_COLUMNS: PipelineColumn[] = [
  { id: "to_contact", label: "À contacter", accent: "bg-[#8d8f8e]", statuses: ["À contacter"] },
  {
    id: "outreach",
    label: "Relances",
    accent: "bg-amber-400",
    statuses: ["1er contact envoyé", "Relance 1", "Relance 2", "Relance 3 / dernière relance"],
  },
  {
    id: "waiting",
    label: "En attente",
    accent: "bg-slate-400",
    statuses: ["Sans réponse", "À recontacter plus tard"],
  },
  {
    id: "discussion",
    label: "Discussion",
    accent: "bg-violet-400",
    statuses: ["Réponse reçue", "À qualifier", "Intéressé"],
  },
  {
    id: "demo",
    label: "Démo",
    accent: "bg-cyan-400",
    statuses: ["Démo à planifier", "Démo prévue", "Démo effectuée", "À relancer après démo"],
  },
  {
    id: "considering",
    label: "Décision",
    accent: "bg-amber-300",
    statuses: ["En réflexion", "Discussion avec comité / équipe", "Offre / prix envoyé"],
  },
  { id: "client", label: "Clients", accent: "bg-emerald-400", statuses: ["Client"] },
  {
    id: "lost",
    label: "Perdus",
    accent: "bg-rose-400",
    statuses: ["Pas maintenant", "Pas intéressé", "Perdu"],
  },
];

export function pipelineColumnId(prospect: Prospect): PipelineColumnId {
  const status = migrateProspectStatus(prospect.status);
  const col = PIPELINE_COLUMNS.find((c) => c.statuses.includes(status));
  if (col) return col.id;
  if (isDemoScheduledStatus(status)) return "demo";
  if (isClosedProspectStatus(status)) return status === "Client" ? "client" : "lost";
  return "outreach";
}

export function groupProspectsByPipeline(prospects: Prospect[]): Record<PipelineColumnId, Prospect[]> {
  const groups = Object.fromEntries(PIPELINE_COLUMNS.map((c) => [c.id, [] as Prospect[]])) as Record<
    PipelineColumnId,
    Prospect[]
  >;
  for (const p of prospects) {
    groups[pipelineColumnId(p)].push(p);
  }
  return groups;
}

export function isFollowedProspect(prospect: Prospect): boolean {
  return !isClosedProspectStatus(migrateProspectStatus(prospect.status));
}

const AVATAR_TONES = [
  "bg-teal-500/20 text-teal-200",
  "bg-emerald-500/20 text-emerald-200",
  "bg-sky-500/20 text-sky-200",
  "bg-amber-500/20 text-amber-200",
  "bg-rose-500/20 text-rose-200",
  "bg-cyan-500/20 text-cyan-200",
];

export function prospectAvatarTone(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash + name.charCodeAt(i) * (i + 1)) % AVATAR_TONES.length;
  return AVATAR_TONES[hash] ?? AVATAR_TONES[0];
}
