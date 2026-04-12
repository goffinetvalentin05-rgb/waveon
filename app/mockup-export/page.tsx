import type { Metadata } from "next";
import { MockupExportClient } from "./MockupExportClient";

export const metadata: Metadata = {
  title: "Export mockup — écran réservation",
  description: "Capture d’écran pour composer ton mockup iPhone.",
  robots: { index: false, follow: false },
};

export default function MockupExportPage() {
  return <MockupExportClient />;
}
