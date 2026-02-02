"use client";

import { useCallback, useEffect, useState } from "react";
import { normalizeHex, isValidHex } from "@/lib/colorUtils";

export type ColorPreset = {
  primary: string;
  secondary: string;
  label: string;
};

type BrandColorPickerProps = {
  primaryColor: string;
  secondaryColor: string;
  onChange: (primary: string, secondary: string) => void;
  presets: ColorPreset[];
  /** Optional: label above the block */
  label?: string;
};

function SingleColorRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (hex: string) => void;
}) {
  const displayValue = value.startsWith("#") ? value : `#${value}`;
  const [hexInput, setHexInput] = useState(displayValue);

  useEffect(() => {
    setHexInput(displayValue);
  }, [displayValue]);

  const handlePickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    onChange(v);
    setHexInput(v);
  };

  const handleHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/^#/, "").trim();
    setHexInput(raw ? `#${raw}` : raw);
    const normalized = normalizeHex(raw ? `#${raw}` : "#000000");
    if (isValidHex(normalized)) onChange(normalized);
  };

  const handleHexBlur = () => {
    if (isValidHex(hexInput)) {
      onChange(normalizeHex(hexInput));
    } else {
      setHexInput(displayValue);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="w-24 text-sm text-zinc-600">{label}</span>
      <input
        type="color"
        value={displayValue}
        onChange={handlePickerChange}
        className="h-9 w-12 cursor-pointer rounded-lg border border-zinc-200 bg-transparent p-0"
        title={label}
      />
      <input
        type="text"
        value={hexInput}
        onChange={handleHexChange}
        onBlur={handleHexBlur}
        placeholder="#000000"
        className="w-24 rounded-lg border border-zinc-200 px-2 py-1.5 text-sm font-mono focus:border-zinc-400 focus:outline-none"
        maxLength={7}
      />
    </div>
  );
}

export default function BrandColorPicker({
  primaryColor,
  secondaryColor,
  onChange,
  presets,
  label = "Couleurs",
}: BrandColorPickerProps) {
  const [showCustom, setShowCustom] = useState(false);
  const selectedPresetIndex = showCustom
    ? -1
    : presets.findIndex(
        (p) =>
          p.primary.toLowerCase() === primaryColor.toLowerCase() &&
          p.secondary.toLowerCase() === secondaryColor.toLowerCase()
      );
  const isCustom = showCustom || selectedPresetIndex < 0;

  const handlePrimaryChange = useCallback(
    (hex: string) => onChange(hex, secondaryColor),
    [onChange, secondaryColor]
  );
  const handleSecondaryChange = useCallback(
    (hex: string) => onChange(primaryColor, hex),
    [onChange, primaryColor]
  );

  return (
    <div className="space-y-3">
      {label ? (
        <label className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
          {label}
        </label>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {presets.map((preset, index) => (
          <button
            key={preset.label}
            type="button"
            onClick={() => {
              setShowCustom(false);
              onChange(preset.primary, preset.secondary);
            }}
            className={`flex items-center gap-2 rounded-xl border-2 px-3 py-2 text-sm transition ${
              !isCustom && selectedPresetIndex === index
                ? "border-zinc-900 bg-zinc-100"
                : "border-zinc-200 hover:bg-zinc-50"
            }`}
          >
            <span
              className="h-5 w-5 rounded-full border border-zinc-200"
              style={{ backgroundColor: preset.primary }}
            />
            <span
              className="h-5 w-5 rounded-full border border-zinc-200"
              style={{ backgroundColor: preset.secondary }}
            />
            {preset.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setShowCustom(true)}
          className={`flex items-center gap-2 rounded-xl border-2 px-3 py-2 text-sm transition ${
            isCustom ? "border-zinc-900 bg-zinc-100" : "border-zinc-200 hover:bg-zinc-50"
          }`}
        >
          Couleur personnalisée
        </button>
      </div>
      {isCustom ? (
        <div className="mt-3 flex flex-col gap-3 rounded-xl border border-zinc-200 bg-zinc-50/50 p-3">
          <SingleColorRow
            label="Principale"
            value={primaryColor}
            onChange={handlePrimaryChange}
          />
          <SingleColorRow
            label="Secondaire"
            value={secondaryColor}
            onChange={handleSecondaryChange}
          />
        </div>
      ) : null}
    </div>
  );
}
