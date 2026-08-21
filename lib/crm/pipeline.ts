import type { Prospect } from "@/lib/crm/types";
import { isClosedProspectStatus, isDemoScheduledStatus } from "@/lib/crm/closed";

export type PipelineColumnId =
  | "to_contact"
  | "contacted"
  | "replied"
  | "demo_scheduled"
  | "demo_done"
  | "negotiation"
  | "client"
  | "refus";

export type PipelineColumn = {
  id: PipelineColumnId;
  label: string;
  accent: string;
};

export const PIPELINE_COLUMNS: PipelineColumn[] = [
  { id: "to_contact", label: "À contacter", accent: "bg-[#8b869c]" },
  { id: "contacted", label: "Contacté", accent: "bg-violet-400" },
  { id: "replied", label: "Répondu", accent: "bg-sky-400" },
  { id: "demo_scheduled", label: "Démo prévue", accent: "bg-violet-500" },
  { id: "demo_done", label: "Démo faite", accent: "bg-emerald-400" },
  { id: "negotiation", label: "Négociation", accent: "bg-amber-400" },
  { id: "client", label: "Client", accent: "bg-emerald-400" },
  { id: "refus", label: "Refusé", accent: "bg-rose-400" },
];

export function pipelineColumnId(prospect: Prospect): PipelineColumnId {
  if (prospect.status === "À contacter") return "to_contact";
  if (prospect.status === "Contacté") return "contacted";
  if (prospect.status === "Répondu") return "replied";
  if (prospect.status === "Démo faite") return "demo_done";
  if (isDemoScheduledStatus(prospect.status)) return "demo_scheduled";
  if (prospect.status === "Négociation") return "negotiation";
  if (prospect.status === "Client") return "client";
  if (isClosedProspectStatus(prospect.status)) return "refus";
  return "contacted";
}

export function groupProspectsByPipeline(prospects: Prospect[]): Record<PipelineColumnId, Prospect[]> {
  const groups: Record<PipelineColumnId, Prospect[]> = {
    to_contact: [],
    contacted: [],
    replied: [],
    demo_scheduled: [],
    demo_done: [],
    negotiation: [],
    client: [],
    refus: [],
  };
  for (const p of prospects) {
    groups[pipelineColumnId(p)].push(p);
  }
  return groups;
}

export function isFollowedProspect(prospect: Prospect): boolean {
  return !isClosedProspectStatus(prospect.status);
}

const AVATAR_TONES = [
  "bg-violet-500/20 text-violet-200",
  "bg-emerald-500/20 text-emerald-200",
  "bg-sky-500/20 text-sky-200",
  "bg-amber-500/20 text-amber-200",
  "bg-rose-500/20 text-rose-200",
  "bg-fuchsia-500/20 text-fuchsia-200",
];

export function prospectAvatarTone(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash + name.charCodeAt(i) * (i + 1)) % AVATAR_TONES.length;
  return AVATAR_TONES[hash] ?? AVATAR_TONES[0];
}
