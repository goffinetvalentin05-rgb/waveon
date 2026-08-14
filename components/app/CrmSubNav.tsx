"use client";

import { CRM_SUB_NAV } from "@/modules/registry";
import { SubNav } from "@/components/ui/SubNav";

export function CrmSubNav() {
  return <SubNav items={CRM_SUB_NAV} ariaLabel="Navigation CRM" />;
}
