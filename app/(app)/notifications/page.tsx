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
        <p className="mt-1 text-sm text-[#8b869c]">Alertes calculées à partir de tes données.</p>
      </div>
      {items.length === 0 ? (
        <EmptyState title="Rien pour le moment" description="Les relances, retards et renouvellements apparaîtront ici." />
      ) : (
        <ul className="space-y-2">
          {items.map((n) => (
            <li key={n.id}>
              <Link href={n.href} className={`${ui.cardInteractive} block px-4 py-3 text-sm text-[#e8e4f0]`}>
                {n.title}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
