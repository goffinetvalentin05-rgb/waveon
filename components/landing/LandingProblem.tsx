function ProblemCard({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-3xl border border-white/[0.06] bg-white/[0.02] px-6 py-10 text-center md:px-8">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.06] text-zinc-300">
        {icon}
      </div>
      <p className="max-w-xs text-base font-medium leading-snug text-zinc-200 md:text-lg">{text}</p>
    </div>
  );
}

export function LandingProblem() {
  return (
    <section className="border-t border-white/[0.06] px-5 py-20 md:px-8 md:py-28">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-4 md:grid-cols-2 md:gap-6">
          <ProblemCard
            icon={
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                />
              </svg>
            }
            text="Tu réponds encore au téléphone toute la journée ?"
          />
          <ProblemCard
            icon={
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            }
            text="Tu perds des clients quand tu n’es pas disponible ?"
          />
        </div>
      </div>
    </section>
  );
}
