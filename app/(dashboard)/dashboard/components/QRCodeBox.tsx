"use client";

type QRCodeBoxProps = {
  title: string;
  qrUrl: string;
  downloadUrl: string;
  publicUrl?: string;
};

export default function QRCodeBox({
  title,
  qrUrl,
  downloadUrl,
  publicUrl,
}: QRCodeBoxProps) {
  const handlePrint = () => {
    if (typeof window === "undefined") return;
    window.open(downloadUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-[0_20px_45px_rgba(15,23,42,0.35)]">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-white">{title}</p>
          {publicUrl ? (
            <p className="mt-1 text-xs text-slate-400">{publicUrl}</p>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <a
            href={downloadUrl}
            download
            className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/90 transition hover:border-white/30"
          >
            Télécharger
          </a>
          <button
            type="button"
            onClick={handlePrint}
            className="rounded-full bg-gradient-to-r from-violet-500 via-indigo-500 to-blue-500 px-3 py-1.5 text-xs font-medium text-white transition hover:brightness-110"
          >
            Imprimer
          </button>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-center rounded-xl border border-dashed border-white/15 bg-[#121225] p-4">
        <img src={qrUrl} alt="QR code" className="h-40 w-40 rounded-lg bg-white p-2" />
      </div>
    </div>
  );
}

