"use client";

import { useState } from "react";
import { ScrollableModal } from "@/components/ui/ScrollableModal";
import { ui } from "@/lib/design/tokens";
import { crmToday } from "@/lib/crm/date-only";
import {
  INTERACTION_KIND_LABELS,
  INTERACTION_KINDS,
  type InteractionChannel,
  type InteractionKind,
} from "@/lib/crm/interactions";

export function InteractionModal({
  open,
  channel,
  defaultKind,
  saving,
  onClose,
  onSave,
}: {
  open: boolean;
  channel: InteractionChannel | null;
  defaultKind: InteractionKind;
  saving: boolean;
  onClose: () => void;
  onSave: (payload: {
    channel: InteractionChannel;
    kind: InteractionKind;
    description: string;
    occurredAt: string;
  }) => void;
}) {
  if (!open || !channel) return null;

  return (
    <InteractionModalInner
      key={`${channel}-${defaultKind}`}
      channel={channel}
      defaultKind={defaultKind}
      saving={saving}
      onClose={onClose}
      onSave={onSave}
    />
  );
}

function InteractionModalInner({
  channel,
  defaultKind,
  saving,
  onClose,
  onSave,
}: {
  channel: InteractionChannel;
  defaultKind: InteractionKind;
  saving: boolean;
  onClose: () => void;
  onSave: (payload: {
    channel: InteractionChannel;
    kind: InteractionKind;
    description: string;
    occurredAt: string;
  }) => void;
}) {
  const [kind, setKind] = useState<InteractionKind>(defaultKind);
  const [description, setDescription] = useState("");
  const [occurredAt, setOccurredAt] = useState(crmToday());
  const title = channel === "email" ? "Email" : channel === "message" ? "Message" : "Appel";

  return (
    <ScrollableModal
      open
      onClose={saving ? () => undefined : onClose}
      title={title}
      subtitle="Qu’avez-vous fait ?"
      maxWidthClass="max-w-md"
      footer={
        <div className="flex justify-end gap-2">
          <button type="button" className={ui.btnSecondary} onClick={onClose} disabled={saving}>
            Annuler
          </button>
          <button
            type="button"
            className={ui.btnPrimary}
            disabled={saving}
            onClick={() => {
              if (saving) return;
              onSave({ channel, kind, description, occurredAt });
            }}
          >
            {saving ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      }
    >
      <fieldset className="space-y-2" disabled={saving}>
        <legend className="sr-only">Type d&apos;interaction</legend>
        {INTERACTION_KINDS.map((value) => (
          <label
            key={value}
            className="flex cursor-pointer items-center gap-3 rounded-xl border border-wo-border px-3.5 py-2.5 text-sm text-wo-text hover:bg-wo-hover"
          >
            <input
              type="radio"
              name="interaction-kind"
              className="h-4 w-4 accent-indigo-600"
              checked={kind === value}
              onChange={() => setKind(value)}
            />
            {INTERACTION_KIND_LABELS[value]}
          </label>
        ))}
      </fieldset>

      <div className="mt-5">
        <label className={ui.label}>Date</label>
        <input
          type="date"
          className={`${ui.input} mt-1`}
          value={occurredAt}
          disabled={saving}
          onChange={(e) => setOccurredAt(e.target.value)}
        />
      </div>

      <div className="mt-4">
        <label className={ui.label}>Description facultative</label>
        <textarea
          className={`${ui.input} mt-1 min-h-[88px] resize-y`}
          value={description}
          disabled={saving}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Note libre…"
        />
      </div>
    </ScrollableModal>
  );
}
