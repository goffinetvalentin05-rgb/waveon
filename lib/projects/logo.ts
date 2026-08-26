export const DEFAULT_PROJECT_COLOR = "#6366F1";

export function looksLikeProjectLogo(value: string | null | undefined): boolean {
  if (!value) return false;
  const v = value.trim();
  return /^(https?:|data:image\/)/i.test(v) || v.startsWith("/");
}

export async function fileToProjectLogo(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Choisissez une image (PNG, JPG, SVG, WebP).");
  }
  if (file.size > 6 * 1024 * 1024) {
    throw new Error("Image trop lourde (max 6 Mo).");
  }

  try {
    const bitmap = await createImageBitmap(file);
    const size = 192;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Impossible de lire l'image.");

    const scale = Math.max(size / bitmap.width, size / bitmap.height);
    const w = bitmap.width * scale;
    const h = bitmap.height * scale;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, size, size);
    ctx.drawImage(bitmap, (size - w) / 2, (size - h) / 2, w, h);
    bitmap.close();
    return canvas.toDataURL("image/jpeg", 0.82);
  } catch {
    if (file.size > 250_000) {
      throw new Error("Impossible de traiter cette image. Essayez un PNG ou JPG plus léger.");
    }
    return fileAsDataUrl(file);
  }
}

async function fileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Impossible de lire l'image."));
    reader.readAsDataURL(file);
  });
}
