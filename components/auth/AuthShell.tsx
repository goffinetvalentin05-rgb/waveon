import { brand } from "@/lib/brand/config";

type AuthShellProps = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
};

export function AuthShell({ title, subtitle, children, footer }: AuthShellProps) {
  return (
    <div className="crm-auth-bg relative flex min-h-screen flex-col overflow-hidden">
      <div className="crm-auth-grid absolute inset-0" />
      <header className="relative z-10 px-5 py-6 sm:px-8">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-sm font-bold text-white shadow-sm">
            P
          </span>
          <span className="text-[15px] font-semibold tracking-tight text-slate-900">
            {brand.name}
          </span>
        </div>
      </header>

      <main className="relative z-10 flex flex-1 items-center justify-center px-5 pb-12 sm:px-8">
        <div className="crm-animate-in w-full max-w-[400px]">
          <div className="rounded-2xl border border-[#e8eef6] bg-white p-7 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_16px_40px_-16px_rgba(15,23,42,0.12)] sm:p-8">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
            {subtitle ? (
              <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{subtitle}</p>
            ) : null}
            <div className="mt-7">{children}</div>
          </div>
          {footer ? (
            <div className="mt-5 text-center text-sm text-slate-500">{footer}</div>
          ) : null}
        </div>
      </main>
    </div>
  );
}
