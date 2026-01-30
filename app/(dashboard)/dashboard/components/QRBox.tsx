"use client";

type QRBoxProps = {
  title: string;
  qrUrl: string;
  downloadUrl: string;
};

export default function QRBox({ title, qrUrl, downloadUrl }: QRBoxProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-900">{title}</p>
        <a
          href={downloadUrl}
          download
          className="text-xs font-medium text-slate-600 hover:text-slate-900"
        >
          Télécharger
        </a>
      </div>
      <div className="mt-4 flex items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4">
        <img src={qrUrl} alt="QR code" className="h-40 w-40" />
      </div>
    </div>
  );
}



