import type { LandingContent } from "@/lib/landing/config";
import { landingCard, landingDivider, landingSection, landingSectionY } from "./landing-tokens";

type LandingProductProps = {
  content: LandingContent["product"];
};

function DashboardMockup() {
  return (
    <div
      className={`${landingCard} overflow-hidden p-6 md:p-7`}
      aria-hidden
    >
      <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
        <p className="text-sm font-medium text-neutral-950">Rendez-vous</p>
        <span className="rounded-full bg-[#f5f5f5] px-2.5 py-1 text-[11px] font-medium text-neutral-600">
          Semaine
        </span>
      </div>
      <ul className="divide-y divide-neutral-100">
        {[
          { day: "Lun 10", time: "09:00", client: "Emma Rousseau", service: "Coupe" },
          { day: "Lun 10", time: "11:30", client: "Hugo Martin", service: "Barbe" },
          { day: "Mar 11", time: "14:00", client: "Inès Bernard", service: "Coupe + soin" },
          { day: "Mar 11", time: "16:30", client: "Paul Garnier", service: "Coupe" },
          { day: "Mer 12", time: "10:00", client: "Léa Fontaine", service: "Coupe femme" },
        ].map((row) => (
          <li key={`${row.day}-${row.time}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3.5">
            <div className="w-16 shrink-0">
              <p className="text-[11px] font-medium text-neutral-500">{row.day}</p>
              <p className="text-xs font-semibold tabular-nums text-neutral-950">{row.time}</p>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-neutral-950">{row.client}</p>
              <p className="truncate text-xs text-neutral-500">{row.service}</p>
            </div>
            <span className="shrink-0 rounded-md bg-[#f5f5f5] px-2 py-0.5 text-[10px] font-medium text-neutral-700">
              OK
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function LandingProduct({ content }: LandingProductProps) {
  return (
    <section className={landingDivider}>
      <div className={`${landingSection} ${landingSectionY}`}>
        <div className="grid items-start gap-14 lg:grid-cols-2 lg:gap-20">
          <div className="lg:pt-1">
            <h2 className="font-display text-3xl font-normal leading-tight tracking-tight text-neutral-950 md:text-4xl lg:text-[2.75rem]">
              {content.title}
            </h2>
            <p className="mt-10 max-w-xl text-base leading-relaxed text-neutral-600 md:mt-12 md:text-lg">
              {content.text}
            </p>
          </div>
          <DashboardMockup />
        </div>
      </div>
    </section>
  );
}
