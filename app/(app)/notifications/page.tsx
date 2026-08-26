"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ui } from "@/lib/design/tokens";
import { EmptyState } from "@/components/ui/ConfirmModal";
import type { AppNotification } from "@/lib/workspace/notifications";

export default function NotificationsPage() {
  const [items, setItems] = useState<AppNotification[]>([]);

  useEffect(() => {
    void fetch("/api/notifications")
      .then((r) => r.json())
      .then((d) => setItems(d.notifications ?? []));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className={ui.h1}>Notifications</h1>
        <p className="mt-1 text-sm text-wo-muted">Chaque alerte indique son espace.</p>
      </div>
      {items.length === 0 ? (
        <EmptyState
          title="Rien pour le moment"
          description="Les relances, retards et rendez-vous apparaîtront ici."
        />
      ) : (
        <ul className="space-y-2">
          {items.map((n) => (
            <li key={n.id}>
              <Link href={n.href} className={`${ui.cardInteractive} block px-4 py-3`}>
                <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-wo-muted">
                  {n.context}
                </p>
                <p className="mt-1 text-sm text-wo-text">{n.title}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
