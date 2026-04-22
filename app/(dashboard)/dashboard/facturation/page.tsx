import { Suspense } from "react";
import FacturationClient from "./FacturationClient";

export default function FacturationPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-neutral-500">Chargement…</div>}>
      <FacturationClient />
    </Suspense>
  );
}
