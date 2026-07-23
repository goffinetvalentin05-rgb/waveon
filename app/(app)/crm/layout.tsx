import { CrmSubNav } from "@/components/app/CrmSubNav";

export default function CrmLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <CrmSubNav />
      {children}
    </div>
  );
}
