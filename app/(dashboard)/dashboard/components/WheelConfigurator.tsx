"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import type { WheelItem } from "@/types/db";
import WheelPreview from "./WheelPreview";

type WheelConfiguratorProps = {
  campaignId: string;
};

type WheelItemDraft = Omit<
  WheelItem,
  "id" | "wheel_id" | "created_at" | "updated_at"
> & {
  id?: string;
  localId: string;
};

const createDraft = (position: number): WheelItemDraft => ({
  localId: crypto.randomUUID(),
  label: "Nouveau lot",
  kind: "win",
  max_wins: 0,
  is_active: true,
  position,
});

const BASE_PARTICIPATIONS_SUGGESTED = [50, 100, 200];

const toNumber = (value: string) => {
  const parsed = Number(value);
  if (Number.isNaN(parsed)) return 0;
  return parsed;
};

export default function WheelConfigurator({ campaignId }: WheelConfiguratorProps) {
  const [wheelId, setWheelId] = useState<string | null>(null);
  const [baseParticipations, setBaseParticipations] = useState(100);
  const [items, setItems] = useState<WheelItemDraft[]>([]);
  const [removedIds, setRemovedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const totalUsed = useMemo(() => {
    return items
      .filter((item) => item.is_active)
      .reduce((sum, item) => sum + item.max_wins, 0);
  }, [items]);

  const perteCount = Math.max(0, baseParticipations - totalUsed);
  const isOver = totalUsed > baseParticipations;

  useEffect(() => {
    const loadWheel = async () => {
      setLoading(true);
      setError(null);

      const { data: wheel, error: wheelError } = await supabase
        .from("wheels")
        .select("id, campaign_id, base_participations, created_at")
        .eq("campaign_id", campaignId)
        .maybeSingle();

      if (wheelError) {
        setError(wheelError.message);
        setLoading(false);
        return;
      }

      let activeWheelId = wheel?.id ?? null;

      if (!activeWheelId) {
        const { data: createdWheel, error: createError } = await supabase
          .from("wheels")
          .insert({ campaign_id: campaignId, base_participations: 100 })
          .select("id, campaign_id, base_participations, created_at")
          .single();

        if (createError || !createdWheel) {
          setError(createError?.message ?? "Création de la roue impossible.");
          setLoading(false);
          return;
        }
        activeWheelId = createdWheel.id;
      }

      setBaseParticipations(wheel?.base_participations ?? 100);

      const { data: itemsData, error: itemsError } = await supabase
        .from("wheel_items")
        .select("*")
        .eq("wheel_id", activeWheelId)
        .order("position");

      if (itemsError) {
        setError(itemsError.message);
        setLoading(false);
        return;
      }

      setWheelId(activeWheelId);
      setItems(
        (itemsData ?? []).map((item) => ({
          ...item,
          localId: item.id,
        }))
      );
      setLoading(false);
    };

    void loadWheel();
  }, [campaignId]);

  const handleAddItem = () => {
    setItems((prev) => [...prev, createDraft(prev.length)]);
  };

  const handleRemoveItem = (localId: string) => {
    setItems((prev) => {
      const current = prev.find((item) => item.localId === localId);
      if (current?.id) {
        setRemovedIds((existing) => [...existing, current.id as string]);
      }
      return prev.filter((item) => item.localId !== localId);
    });
  };

  const updateItem = (
    localId: string,
    patch: Partial<WheelItemDraft>
  ) => {
    setItems((prev) =>
      prev.map((item, index) =>
        item.localId === localId
          ? { ...item, ...patch, position: index }
          : item
      )
    );
  };

  const handleSave = async () => {
    console.log("[WheelConfigurator] Save button clicked");
    if (!wheelId) {
      console.warn("[WheelConfigurator] Save skipped: no wheelId");
      setError("Roue non chargée. Rechargez la page.");
      return;
    }
    setError(null);
    setSuccess(null);

    if (items.length === 0) {
      setError("Ajoutez au moins un lot.");
      return;
    }

    if (isOver) {
      setError(
        `Le total des gains (${totalUsed}) dépasse le nombre de participations (${baseParticipations}). Réduisez les quantités ou augmentez la base.`
      );
      return;
    }

    console.log("[WheelConfigurator] Save executing", { wheelId, itemsCount: items.length });
    setSaving(true);
    try {
      const { error: wheelUpdateError } = await supabase
        .from("wheels")
        .update({ base_participations: baseParticipations })
        .eq("id", wheelId);

      if (wheelUpdateError) {
        setError(wheelUpdateError.message);
        return;
      }

      if (removedIds.length > 0) {
        const { error: deleteError } = await supabase
          .from("wheel_items")
          .delete()
          .in("id", removedIds);
        if (deleteError) {
          setError(deleteError.message);
          return;
        }
        setRemovedIds([]);
      }

      const toInsert = items.filter((item) => !item.id);
      const toUpdate = items.filter((item) => item.id);

      if (toInsert.length > 0) {
        const { error: insertError } = await supabase
          .from("wheel_items")
          .insert(
            toInsert.map((item, index) => ({
              wheel_id: wheelId,
              label: item.label,
              kind: item.kind,
              max_wins: Math.max(0, item.max_wins),
              is_active: item.is_active,
              position: index,
            }))
          );

        if (insertError) {
          setError(insertError.message);
          return;
        }
      }

      if (toUpdate.length > 0) {
        const { error: updateError } = await supabase
          .from("wheel_items")
          .upsert(
            toUpdate.map((item, index) => ({
              id: item.id,
              wheel_id: wheelId,
              label: item.label,
              kind: item.kind,
              max_wins: Math.max(0, item.max_wins),
              is_active: item.is_active,
              position: index,
            })),
            { onConflict: "id" }
          );

        if (updateError) {
          setError(updateError.message);
          return;
        }
      }

      const { error: poolError } = await supabase.rpc("init_wheel_pool", {
        p_wheel_id: wheelId,
      });

      if (poolError) {
        setSuccess(
          "Roue et lots enregistrés. La pool de tirages n’a pas pu être initialisée : exécutez la migration Supabase puis réenregistrez."
        );
        setError(
          `Pool : ${poolError.message}. Assurez-vous d’avoir exécuté la migration (wheel_pool_remaining + init_wheel_pool).`
        );
        return;
      }

      setSuccess(
        "Roue enregistrée avec succès. La pool de tirages a été initialisée."
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erreur lors de l’enregistrement."
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-slate-300">
        Chargement de la roue…
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-[0_20px_45px_rgba(15,23,42,0.35)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-white">Roue & lots</h2>
          <p className="mt-1 text-sm text-slate-300">
            Définissez les lots et le nombre de gains sur X participations.
          </p>
        </div>
        <button
          type="button"
          onClick={handleAddItem}
          className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white/90 transition hover:border-white/30"
        >
          Ajouter un lot
        </button>
      </div>

      {error ? (
        <div className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      ) : null}
      {success ? (
        <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          {success}
        </div>
      ) : null}

      <div className="mt-6 space-y-6">
        <div className="rounded-xl border border-white/10 bg-[#101025] p-4">
          <label className="block text-sm font-medium text-slate-200">
            Sur combien de participations souhaitez-vous répartir vos gains ?
          </label>
          <div className="mt-3 flex flex-wrap gap-2">
            {BASE_PARTICIPATIONS_SUGGESTED.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setBaseParticipations(n)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  baseParticipations === n
                    ? "bg-indigo-500 text-white"
                    : "border border-white/15 bg-white/5 text-slate-300 hover:border-white/30"
                }`}
              >
                {n}
              </button>
            ))}
            <input
              type="number"
              min={1}
              className="w-20 rounded-full border border-white/10 bg-[#141433] px-3 py-2 text-center text-sm text-slate-100 focus:border-indigo-400 focus:outline-none"
              value={baseParticipations}
              onChange={(e) =>
                setBaseParticipations(Math.max(1, toNumber(e.target.value)))
              }
            />
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[3fr,2fr]">
          <div className="space-y-4">
            {items.length === 0 ? (
              <div className="rounded-xl border border-dashed border-white/10 bg-white/5 px-4 py-6 text-center text-sm text-slate-400">
                Aucun lot pour le moment. Ajoutez-en pour configurer la roue.
              </div>
            ) : null}
            {items.map((item, index) => (
              <div
                key={item.localId}
                className="grid gap-3 rounded-xl border border-white/10 bg-[#101025] p-4 text-sm text-slate-300 md:grid-cols-[2fr,1fr,1fr,auto]"
              >
                <div className="space-y-1">
                  <label className="text-xs uppercase text-slate-400">Lot</label>
                  <input
                    className="w-full rounded-lg border border-white/10 bg-[#141433] px-3 py-2 text-sm text-slate-100 focus:border-indigo-400 focus:outline-none"
                    value={item.label}
                    onChange={(event) =>
                      updateItem(item.localId, { label: event.target.value })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs uppercase text-slate-400">Type</label>
                  <select
                    className="w-full rounded-lg border border-white/10 bg-[#141433] px-3 py-2 text-sm text-slate-100 focus:border-indigo-400 focus:outline-none"
                    value={item.kind}
                    onChange={(event) =>
                      updateItem(item.localId, {
                        kind: event.target.value as WheelItem["kind"],
                      })
                    }
                  >
                    <option value="win">Gain</option>
                    <option value="lose">Perte</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs uppercase text-slate-400">
                    Nombre de fois gagné sur {baseParticipations} participations
                  </label>
                  <input
                    type="number"
                    min={0}
                    className="w-full rounded-lg border border-white/10 bg-[#141433] px-3 py-2 text-sm text-slate-100 focus:border-indigo-400 focus:outline-none"
                    value={item.max_wins}
                    onChange={(event) =>
                      updateItem(item.localId, {
                        max_wins: Math.max(0, toNumber(event.target.value)),
                      })
                    }
                  />
                </div>
                <div className="flex flex-col justify-between gap-3">
                  <label className="flex items-center gap-2 text-xs text-slate-400">
                    <input
                      type="checkbox"
                      checked={item.is_active}
                      onChange={(event) =>
                        updateItem(item.localId, {
                          is_active: event.target.checked,
                        })
                      }
                    />
                    Actif
                  </label>
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(item.localId)}
                    className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300 transition hover:border-rose-400 hover:text-rose-200"
                  >
                    Supprimer
                  </button>
                </div>
              </div>
            ))}

            <div className="flex flex-col gap-3 rounded-xl border border-white/10 bg-[#101025] p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-300">
                <span>
                  Total utilisé :{" "}
                  <strong className={isOver ? "text-rose-400" : "text-white"}>
                    {totalUsed}
                  </strong>
                  {" / "}
                  {baseParticipations}
                  {perteCount > 0 && (
                    <span className="ml-2 text-slate-400">
                      (Perdu : {perteCount})
                    </span>
                  )}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    console.log("[WheelConfigurator] Save button onClick fired");
                    handleSave();
                  }}
                  disabled={saving || isOver}
                  className="rounded-full bg-gradient-to-r from-violet-500 via-indigo-500 to-blue-500 px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-60"
                >
                  {saving ? "Sauvegarde…" : "Enregistrer la roue"}
                </button>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className={`h-full transition-all ${
                    isOver ? "bg-rose-500" : "bg-indigo-500"
                  }`}
                  style={{
                    width: `${Math.min(100, (totalUsed / baseParticipations) * 100)}%`,
                  }}
                />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <h3 className="text-sm font-semibold text-white">Aperçu</h3>
            <p className="mt-1 text-xs text-slate-400">
              Répartition des lots sur {baseParticipations} participations.
            </p>
            <div className="mt-4">
              <WheelPreview
                items={items}
                baseParticipations={baseParticipations}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
