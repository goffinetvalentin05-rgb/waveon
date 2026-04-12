import type { LandingContent } from "@/lib/landing/config";
import { landingCard, landingDivider, landingSection, landingSectionY } from "./landing-tokens";

type LandingBrandImageProps = {
  content: LandingContent["brandImage"];
};

function ClientsTableMockup() {
  return (
    <div className={`${landingCard} order-2 overflow-hidden p-0 lg:order-1`} aria-hidden>
      <div className="border-b border-neutral-100 bg-[#f5f5f5] px-5 py-3">
        <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">Base clients</p>
        <p className="mt-0.5 text-sm font-medium text-neutral-950">Contacts récents</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[280px] text-left text-sm">
          <thead>
            <tr className="border-b border-neutral-100 text-[11px] font-medium uppercase tracking-wide text-neutral-500">
              <th className="px-5 py-3 font-medium">Client</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="hidden px-4 py-3 font-medium sm:table-cell">Dernière visite</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {[
              { name: "Camille Renard", email: "camille.r@mail.fr", date: "2 juin" },
              { name: "Julien Petit", email: "j.petit@mail.fr", date: "28 mai" },
              { name: "Nora El Mansouri", email: "nora.e@mail.fr", date: "26 mai" },
              { name: "Antoine Vidal", email: "antoine.v@mail.fr", date: "22 mai" },
            ].map((row) => (
              <tr key={row.email} className="bg-white">
                <td className="px-5 py-3.5 font-medium text-neutral-950">{row.name}</td>
                <td className="max-w-[140px] truncate px-4 py-3.5 text-xs text-neutral-600">{row.email}</td>
                <td className="hidden whitespace-nowrap px-4 py-3.5 text-xs text-neutral-500 sm:table-cell">
                  {row.date}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function LandingBrandImage({ content }: LandingBrandImageProps) {
  return (
    <section className={landingDivider}>
      <div className={`${landingSection} ${landingSectionY}`}>
        <div className="grid items-start gap-14 lg:grid-cols-2 lg:gap-20">
          <ClientsTableMockup />
          <div className="order-1 lg:order-2 lg:pt-1">
            <h2 className="font-display text-3xl font-normal leading-tight tracking-tight text-neutral-950 md:text-4xl lg:text-[2.75rem]">
              {content.title}
            </h2>
            <p className="mt-10 max-w-xl whitespace-pre-line text-base leading-relaxed text-neutral-600 md:mt-12 md:text-lg">
              {content.text}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
