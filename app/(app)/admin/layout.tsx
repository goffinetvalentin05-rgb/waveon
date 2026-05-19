import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerComponentSupabase } from "@/lib/supabase/server-component";
import { ui } from "@/lib/design/tokens";

const NAV = [
  { href: "/admin",                    label: "Vue d'ensemble" },
  { href: "/admin/tournament",         label: "Tournoi" },
  { href: "/admin/tournament/teams",   label: "Équipes" },
  { href: "/admin/tournament/matches", label: "Matchs" },
  { href: "/admin/contest",            label: "Concours" },
  { href: "/admin/leagues",            label: "Ligues" },
  { href: "/admin/payments",           label: "Paiements" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerComponentSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile?.is_admin) redirect("/dashboard");

  return (
    <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
      <aside className={`${ui.glassCard} h-fit p-3`}>
        <nav className="flex flex-col gap-1">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="rounded-lg px-3 py-2 text-sm text-white/75 hover:bg-white/5 hover:text-white"
            >
              {n.label}
            </Link>
          ))}
        </nav>
      </aside>
      <div>{children}</div>
    </div>
  );
}
