"use client";

import { PronoClashShell } from "@/components/dashboard/PronoClashShell";

export type AppSecondaryPageProps = {
  pageTitle?: string;
  hidePageTitle?: boolean;
  username?: string | null;
  email?: string | null;
  isAdmin?: boolean;
  /** Layout centré (checkout, états). */
  centered?: boolean;
  children: React.ReactNode;
};

/** Pages app hors dashboard/matchs : même topbar et fond premium que le dashboard. */
export function AppSecondaryPage({
  pageTitle,
  hidePageTitle,
  username,
  email,
  isAdmin = false,
  centered = false,
  children,
}: AppSecondaryPageProps) {
  return (
    <PronoClashShell
      pageTitle={pageTitle}
      hidePageTitle={hidePageTitle}
      username={username}
      email={email}
      isAdmin={isAdmin}
    >
      <div className={centered ? "pc-state-page" : undefined}>{children}</div>
    </PronoClashShell>
  );
}
