import type { Prospect } from "@/lib/crm/types";

export type PipelineColumnId =
  | "to_contact"
  | "to_recall"
  | "meeting"
  | "demo_done"
  | "client"
  | "refus";

export type PipelineColumn = {
  id: PipelineColumnId;
  label: string;
  accent: string;
};

export const PIPELINE_COLUMNS: PipelineColumn[] = [
  { id: "to_contact", label: "À contacter", accent: "bg-[#8b869c]" },
  { id: "to_recall", label: "À rappeler", accent: "bg-violet-400" },
  { id: "meeting", label: "RDV à venir", accent: "bg-violet-500" },
  { id: "demo_done", label: "Démo faite", accent: "bg-emerald-400" },
  { id: "client", label: "Client", accent: "bg-emerald-400" },
  { id: "refus", label: "Refus", accent: "bg-rose-400" },
];

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function demoDate(prospect: Prospect): string | null {
  return prospect.demo_at ? prospect.demo_at.slice(0, 10) : null;
}

export function pipelineColumnId(prospect: Prospect): PipelineColumnId {
  if (prospect.status === "À contacter") return "to_contact";
  if (prospect.status === "Client") return "client";
  if (prospect.status === "Refus" || prospect.status === "Pas intéressé") return "refus";
  if (prospect.status === "Démonstration") {
    const d = demoDate(prospect);
    if (d && d < todayISO()) return "demo_done";
    return "meeting";
  }
  return "to_recall";
}

export function groupProspectsByPipeline(prospects: Prospect[]): Record<PipelineColumnId, Prospect[]> {
  const groups: Record<PipelineColumnId, Prospect[]> = {
    to_contact: [],
    to_recall: [],
    meeting: [],
    demo_done: [],
    client: [],
    refus: [],
  };
  for (const p of prospects) {
    groups[pipelineColumnId(p)].push(p);
  }
  return groups;
}

export function isFollowedProspect(prospect: Prospect): boolean {
  return !["Client", "Refus", "Pas intéressé"].includes(prospect.status);
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
