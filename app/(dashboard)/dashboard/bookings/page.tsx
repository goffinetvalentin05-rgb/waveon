"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import {
  cardClass,
  formatDate,
  mapBooking,
  type BookingItem,
  type RawRow,
} from "../components/dashboardData";

export default function BookingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [bookings, setBookings] = useState<BookingItem[]>([]);

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getSession();
      const session = data.session;
      if (!session) {
        router.replace("/login");
        return;
      }
      setUserId(session.user.id);
      await fetchBookings(session.user.id);
      setLoading(false);
    };
    void init();
  }, [router]);

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`bookings-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bookings",
          filter: `user_id=eq.${userId}`,
        },
        async () => {
          await fetchBookings(userId);
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#080808] text-white/70">
        Chargement des appels bookés...
      </div>
    );
  }

  return (
    <div>
      <header>
        <h1 className="text-2xl font-semibold text-white">Appels bookés</h1>
        <p className="mt-1 text-sm text-white/65">
          Liste des appels planifiés par ton agent IA.
        </p>
      </header>

      {error ? (
        <div className="mt-5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      ) : null}

      <section className={`${cardClass} mt-6`}>
        {bookings.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#39FF14]/20 bg-[#080808] px-4 py-5 text-sm text-white/65">
            Aucun appel booké pour le moment.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead>
                <tr className="border-b border-[#39FF14]/15 text-white/60">
                  <th className="px-2 py-3 font-medium">Date</th>
                  <th className="px-2 py-3 font-medium">Prospect</th>
                  <th className="px-2 py-3 font-medium">Statut</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((booking) => (
                  <tr
                    key={booking.id}
                    className="border-b border-[#39FF14]/10 last:border-none"
                  >
                    <td className="px-2 py-3 text-white/80">
                      {formatDate(booking.scheduledAt)}
                    </td>
                    <td className="px-2 py-3 text-white">{booking.prospectName}</td>
                    <td className="px-2 py-3">
                      <span className="rounded-full border border-[#39FF14]/30 bg-[#39FF14]/10 px-2 py-1 text-xs text-[#39FF14]">
                        {booking.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );

  async function fetchBookings(currentUserId: string) {
    setError(null);
    const { data, error: fetchError } = await supabase
      .from("bookings")
      .select("*")
      .eq("user_id", currentUserId)
      .order("scheduled_at", { ascending: false });

    if (fetchError) {
      setError(fetchError.message);
      return;
    }

    setBookings(((data ?? []) as RawRow[]).map(mapBooking));
  }
}
