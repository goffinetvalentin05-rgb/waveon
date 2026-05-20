"use client";

import { AdminNav } from "@/components/pronoclash/admin/AdminNav";
import { AppSecondaryPage } from "@/components/pronoclash/AppSecondaryPage";

type Props = {
  username?: string | null;
  email?: string | null;
  children: React.ReactNode;
};

export function AdminLayoutClient({ username, email, children }: Props) {
  return (
    <AppSecondaryPage pageTitle="Administration" username={username} email={email} isAdmin>
      <div className="pc-admin-wrap">
        <div className="pc-glass">
          <AdminNav />
        </div>
        <div>{children}</div>
      </div>
    </AppSecondaryPage>
  );
}
