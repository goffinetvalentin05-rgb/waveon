import type { Prospect, ProspectStatus } from "@/lib/crm/types";
import { isClosedProspectStatus, isDemoStatus, isLostProspectStatus } from "@/lib/crm/closed";
import { migrateProspectStatus } from "@/lib/crm/status";

export type PipelineColumnId =
  | "to_contact"
  | "follow_up_1"
  | "follow_up_2"
  | "relay"
  | "discussion"
  | "demo"
  | "client"
  | "closed";

export type PipelineColumn = {
  id: PipelineColumnId;
  label: string;
  accent: string;
  status: ProspectStatus;
};

export const PIPELINE_COLUMNS: PipelineColumn[] = [
  { id: "to_contact", label: "À contacter", accent: "bg-[#8d8f8e]", status: "À contacter" },
  { id: "follow_up_1", label: "Relance 1", accent: "bg-amber-400", status: "Relance 1" },
  { id: "follow_up_2", label: "Relance 2", accent: "bg-orange-400", status: "Relance 2" },
  { id: "relay", label: "Relais", accent: "bg-indigo-300", status: "Relais" },
  { id: "discussion", label: "En discussion", accent: "bg-violet-400", status: "En discussion" },
  { id: "demo", label: "Démo", accent: "bg-cyan-400", status: "Démo" },
  { id: "client", label: "Client", accent: "bg-emerald-400", status: "Client" },
  { id: "closed", label: "Fermé", accent: "bg-rose-400", status: "Fermé" },
];

export function pipelineColumnId(prospect: Prospect): PipelineColumnId {
  const status = migrateProspectStatus(prospect.status);
  const col = PIPELINE_COLUMNS.find((c) => c.status === status);
  if (col) return col.id;
  if (isDemoStatus(status)) return "demo";
  if (status === "Client") return "client";
  if (isLostProspectStatus(status) || isClosedProspectStatus(status)) return "closed";
  return "to_contact";
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
  "bg-indigo-50 text-indigo-700",
  "bg-violet-50 text-violet-700",
  "bg-sky-50 text-sky-700",
  "bg-amber-50 text-amber-800",
  "bg-rose-50 text-rose-700",
  "bg-slate-100 text-slate-700",
];

export function prospectAvatarTone(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash + name.charCodeAt(i) * (i + 1)) % AVATAR_TONES.length;
  return AVATAR_TONES[hash] ?? AVATAR_TONES[0];
}
