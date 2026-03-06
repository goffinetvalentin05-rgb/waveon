"use client";

import type { ReactNode } from "react";
import Sidebar from "./components/Sidebar";

type DashboardLayoutProps = {
  children: ReactNode;
};

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-[#080808] text-white">
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 px-5 py-6 lg:px-10 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
