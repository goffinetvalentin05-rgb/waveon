"use client";

import { PROSPECT_STATUS_PHASES, PROSPECT_STATUSES, type ProspectStatus } from "@/lib/crm/types";
import { ui } from "@/lib/design/tokens";

export function StatusSelect({
  value,
  onChange,
  className,
  disabled,
}: {
  value: string;
  onChange: (status: ProspectStatus) => void;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <select
      className={className ?? `${ui.input} min-w-[11rem]`}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value as ProspectStatus)}
    >
      {PROSPECT_STATUS_PHASES.map((phase) => (
        <optgroup key={phase.id} label={phase.label}>
          {phase.statuses.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </optgroup>
      ))}
      {!(PROSPECT_STATUSES as readonly string[]).includes(value) && value ? (
        <option value={value}>{value}</option>
      ) : null}
    </select>
  );
}
