"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

const features = [
  {
    title: "Plus d’avis Google",
    text: "Générez plus d’avis authentiques après chaque visite client\net améliorez votre visibilité sur Google.",
  },
  {
    title: "Plus d’abonnés Instagram",
    text: "Transformez vos clients réels en abonnés engagés,\nsans concours compliqués ni pubs inutiles.",
  },
  {
    title: "Plus de clients",
    text: "Plus d’avis et plus d’abonnés,\nc’est plus de confiance… et plus de clients qui reviennent.",
  },
];

const steps = [
  {
    title: "Créez votre campagne",
    text: "Configurez votre page en quelques minutes\navec votre lien Google et votre compte Instagram.",
  },
  {
    title: "Le client participe",
    text: "Le client scanne, laisse un avis, s’abonne\net accède à l’expérience Waveon.",
  },
  {
    title: "Votre visibilité grandit",
    text: "Les avis et abonnements s’accumulent naturellement,\nsans que vous ayez à y penser.",
  },
];

export default function Home() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="min-h-screen text-slate-100">
      <div className="relative">

        <header
          className={`sticky top-0 z-30 transition ${
            isScrolled
              ? "border-b border-white/10 bg-[#0a1430]/70 backdrop-blur-[14px]"
              : "bg-transparent"
          }`}
        >
          <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
            <Image
              src="/logo_waveon.png"
              alt="Waveon"
              width={200}
              height={54}
              className="h-12 w-auto md:h-14"
              priority
            />
            <nav className="hidden items-center gap-6 text-sm text-white/70 md:flex">
              <a className="transition hover:text-white" href="#pourquoi">
                Pourquoi Waveon
              </a>
              <a className="transition hover:text-white" href="#ce-que-fait">
                Ce que fait Waveon
              </a>
              <a className="transition hover:text-white" href="#comment">
                Comment ça marche
              </a>
              <a className="transition hover:text-white" href="#pour-qui">
                Pour qui
              </a>
            </nav>
            <a
              href="/login"
              className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold text-white/80 shadow-[0_10px_30px_rgba(15,23,42,0.25)] backdrop-blur transition hover:border-white/30 hover:text-white"
            >
              Se connecter
            </a>
          </div>
        </header>

        <main className="relative">
          <section className="relative flex min-h-screen items-center justify-center px-6 pt-16">
            <div className="relative mx-auto flex w-full max-w-5xl -translate-y-6 flex-col items-center text-center">
              <div className="pointer-events-none absolute -top-24 h-[420px] w-[420px] rounded-full bg-gradient-to-br from-[#7fc6ff]/35 via-[#9a9bff]/25 to-transparent blur-[160px]" />
              <h1 className="mt-4 text-4xl font-semibold leading-tight text-white md:text-6xl">
                La façon la plus simple de booster votre visibilité locale.
              </h1>
              <p className="mt-6 text-base text-white/70 md:text-lg">
                Waveon transforme chaque visite client en avis Google et abonnés Instagram, simplement et sans friction.
              </p>
              <div className="mt-10 flex flex-col gap-3 sm:flex-row">
                <a
                  href="/login"
                  className="rounded-full bg-gradient-to-r from-[#4ab4ff] via-[#6a5bff] to-[#9650ff] px-7 py-3 text-sm font-semibold text-white shadow-[0_18px_50px_rgba(90,120,255,0.6)] transition hover:opacity-90"
                >
                  Lancer une campagne
                </a>
                <a
                  href="#comment"
                  className="rounded-full border border-white/15 bg-white/5 px-7 py-3 text-sm font-semibold text-white/75 shadow-[0_12px_30px_rgba(15,23,42,0.2)] backdrop-blur transition hover:border-white/30 hover:text-white"
                >
                  Comment ça marche
                </a>
              </div>
            </div>
          </section>

          <section
            id="pourquoi"
            className="relative flex min-h-[90vh] items-center px-6"
          >
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              <div className="absolute -left-24 top-10 h-[420px] w-[420px] rounded-full bg-gradient-to-br from-[#6fb4ff]/20 via-[#7c7dff]/15 to-transparent blur-[160px]" />
              <div className="absolute right-10 bottom-10 h-[360px] w-[360px] rounded-full bg-gradient-to-br from-[#7fb8ff]/20 via-[#c7e6ff]/15 to-transparent blur-[150px]" />
            </div>
            <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-12 md:flex-row md:items-center">
              <div className="max-w-xl">
                <h2 className="mt-4 text-3xl font-semibold text-white md:text-4xl">
                  Vos clients sont déjà là. Votre visibilité, pas toujours.
                </h2>
                <p className="mt-4 text-sm text-white/70 md:text-base whitespace-pre-line">
                  La plupart des clients sont satisfaits.
                  {"\n"}Mais très peu prennent le temps de laisser un avis ou de vous suivre sur les réseaux.
                  {"\n"}Waveon règle ce problème simplement :
                  {"\n"}au bon moment, sans friction, sans effort pour vos clients.
                </p>
              </div>
              <div className="relative flex flex-1 items-center justify-center">
                <div className="h-[260px] w-[260px] rounded-full border border-white/10" />
                <div className="absolute h-[340px] w-[340px] rounded-full border border-white/10 opacity-60" />
                <div className="absolute h-[180px] w-[180px] rounded-full bg-gradient-to-br from-[#62b5ff]/35 via-[#a5c7ff]/25 to-[#c4c7ff]/30 blur-[70px]" />
              </div>
            </div>
          </section>

          <section id="ce-que-fait" className="px-6 py-16">
            <div className="mx-auto flex w-full max-w-6xl flex-col gap-12">
              <div className="max-w-2xl">
                <h2 className="mt-4 text-3xl font-semibold text-white md:text-4xl">
                  Ce que fait Waveon
                </h2>
              </div>
              <div className="flex flex-col gap-14">
                {features.map((feature, index) => (
                  <div
                    key={feature.title}
                    className={`flex flex-col items-start gap-8 md:flex-row ${
                      index % 2 === 1 ? "md:flex-row-reverse" : ""
                    }`}
                  >
                    <div className="max-w-xl">
                      <h3 className="mt-3 text-2xl font-semibold text-white">
                        {feature.title}
                      </h3>
                      <p className="mt-3 text-sm text-white/70 md:text-base whitespace-pre-line">
                        {feature.text}
                      </p>
                    </div>
                    <div className="relative flex w-full max-w-sm flex-1 items-center justify-center">
                      <div className="h-40 w-40 rounded-full bg-gradient-to-br from-[#62b5ff]/35 via-[#9fc6ff]/25 to-[#c4c7ff]/30 blur-[55px]" />
                      <div className="absolute h-52 w-52 rounded-full border border-white/10" />
                      <div className="absolute h-24 w-24 rounded-full border border-white/10" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section id="comment" className="px-6 py-16">
            <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 md:flex-row">
              <div className="max-w-md">
                <h2 className="mt-4 text-3xl font-semibold text-white md:text-4xl">
                  Comment ça marche
                </h2>
              </div>
              <div className="relative flex-1">
                <div className="absolute left-4 top-0 h-full w-px bg-gradient-to-b from-[#6ab6ff] via-[#a8d4ff]/30 to-transparent" />
                <div className="space-y-8 pl-12">
                  {steps.map((step, index) => (
                    <div key={step.title} className="relative">
                      <div className="absolute -left-12 top-1.5 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-xs font-semibold text-[#88b7ff] shadow-[0_8px_18px_rgba(59,130,246,0.25)] backdrop-blur">
                        {index + 1}
                      </div>
                      <h3 className="text-lg font-semibold text-white">
                        {step.title}
                      </h3>
                      <p className="mt-2 text-sm text-white/70 whitespace-pre-line">
                        {step.text}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section id="pour-qui" className="px-6 py-16">
            <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
              <h2 className="text-3xl font-semibold text-white md:text-4xl">
                Pensé pour les commerces locaux
              </h2>
              <p className="text-sm text-white/70 md:text-base whitespace-pre-line">
                Waveon est utilisé par :
                {"\n"}restaurants,
                {"\n"}fast-foods,
                {"\n"}coiffeurs,
                {"\n"}bars,
                {"\n"}commerces de proximité.
                {"\n"}
                {"\n"}Si vous recevez des clients chaque jour, Waveon peut vous aider.
              </p>
            </div>
          </section>

          <section className="relative flex min-h-screen items-center justify-center px-6">
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute -left-10 top-10 h-[360px] w-[360px] rounded-full bg-gradient-to-br from-[#6fb4ff]/30 via-[#bfe0ff]/15 to-transparent blur-[140px]" />
              <div className="absolute right-0 bottom-0 h-[320px] w-[320px] rounded-full bg-gradient-to-br from-[#7aa8ff]/25 via-[#c7e6ff]/20 to-transparent blur-[120px]" />
            </div>
            <div className="relative mx-auto flex w-full max-w-3xl flex-col items-center text-center">
              <h2 className="mt-4 text-3xl font-semibold text-white md:text-5xl">
                Commencez à transformer vos clients en visibilité locale.
              </h2>
              <p className="mt-5 text-sm text-white/70 md:text-base">
                Mettez en place Waveon et laissez vos clients
                faire grandir votre présence locale pour vous.
              </p>
              <div className="mt-8">
                <a
                  href="/login"
                  className="rounded-full bg-white/10 px-8 py-3 text-sm font-semibold text-white shadow-[0_14px_35px_rgba(15,23,42,0.35)] backdrop-blur transition hover:bg-white/20"
                >
                  Lancer une campagne
                </a>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
