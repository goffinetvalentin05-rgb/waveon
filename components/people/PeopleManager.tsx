"use client";

import { useEffect, useState } from "react";
import { ui } from "@/lib/design/tokens";
import { personInitials, type Person } from "@/lib/people/types";

export function PeopleManager() {
  const [people, setPeople] = useState<Person[]>([]);
  const [name, setName] = useState("");
  const [role, setRole] = useState("");

  const load = async () => {
    const res = await fetch("/api/people");
    const data = await res.json();
    setPeople(data.people ?? []);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, []);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await fetch("/api/people", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, role }),
    });
    setName("");
    setRole("");
    void load();
  };

  const remove = async (id: string) => {
    await fetch(`/api/people/${id}`, { method: "DELETE" });
    void load();
  };

  return (
    <section className={`${ui.card} p-5 sm:p-6`}>
      <h2 className={ui.h2}>Personnes</h2>
      <p className="mt-1 text-sm text-wo-muted">
        Carnet interne pour assigner tâches, prospects et dépenses.
      </p>
      <ul className="mt-4 space-y-2">
        {people.map((p) => (
          <li key={p.id} className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/20 text-[11px] font-semibold text-emerald-200">
                {personInitials(p.name)}
              </span>
              <div>
                <p className="text-sm font-medium text-wo-text">
                  {p.name}
                  {p.is_self ? <span className="ml-2 text-[10px] text-emerald-300">toi</span> : null}
                </p>
                {p.role ? <p className="text-[11px] text-wo-dim">{p.role}</p> : null}
              </div>
            </div>
            {p.is_self ? null : (
              <button type="button" className={ui.btnGhost} onClick={() => void remove(p.id)}>
                Retirer
              </button>
            )}
          </li>
        ))}
      </ul>
      <form onSubmit={add} className="mt-4 flex flex-col gap-2 sm:flex-row">
        <input className={ui.input} placeholder="Nom" value={name} onChange={(e) => setName(e.target.value)} />
        <input className={ui.input} placeholder="Rôle (optionnel)" value={role} onChange={(e) => setRole(e.target.value)} />
        <button type="submit" className={ui.btnSecondary}>
          Ajouter
        </button>
      </form>
    </section>
  );
}
