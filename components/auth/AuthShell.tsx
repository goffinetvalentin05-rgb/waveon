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
          <span className="wo-brand-mark h-8 w-8 text-sm">W</span>
          <span className="font-display text-[15px] font-semibold tracking-tight text-wo-text">
            {brand.name}
          </span>
        </div>
      </header>

      <main className="relative z-10 flex flex-1 items-center justify-center px-5 pb-12 sm:px-8">
        <div className="crm-animate-in w-full max-w-[400px]">
          <div className="wo-card p-7 sm:p-8">
            <h1 className="font-display text-2xl font-semibold tracking-tight text-wo-text">{title}</h1>
            {subtitle ? (
              <p className="mt-1.5 text-sm leading-relaxed text-wo-muted">{subtitle}</p>
            ) : null}
            <div className="mt-7">{children}</div>
          </div>
          {footer ? (
            <div className="mt-5 text-center text-sm text-wo-muted">{footer}</div>
          ) : null}
        </div>
      </main>
    </div>
  );
}
