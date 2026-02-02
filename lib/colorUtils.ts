/** Normalize hex to #RRGGBB (6 digits). */
export function normalizeHex(value: string): string {
  const cleaned = value.replace(/^#/, "").trim();
  if (cleaned.length === 3) {
    const r = cleaned[0] + cleaned[0];
    const g = cleaned[1] + cleaned[1];
    const b = cleaned[2] + cleaned[2];
    return `#${r}${g}${b}`.toLowerCase();
  }
  if (cleaned.length === 6 && /^[0-9a-fA-F]+$/.test(cleaned)) {
    return `#${cleaned}`.toLowerCase();
  }
  return value;
}

export function isValidHex(value: string): boolean {
  const normalized = normalizeHex(value);
  return /^#[0-9a-fA-F]{6}$/.test(normalized);
}

/** Get a hex color from an RGB tuple. */
function rgbToHex(r: number, g: number, b: number): string {
  return (
    "#" +
    [r, g, b]
      .map((x) => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, "0"))
      .join("")
  );
}

/**
 * Extract a dominant color from an image URL (client-side).
 * Uses a small canvas to sample pixels and returns the most frequent non-transparent color.
 */
export function getDominantColorFromImageUrl(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const size = 32;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve("#0f172a");
          return;
        }
        ctx.drawImage(img, 0, 0, size, size);
        const data = ctx.getImageData(0, 0, size, size).data;
        const count: Record<string, number> = {};
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const a = data[i + 3];
          if (a < 128) continue;
          const key = `${r},${g},${b}`;
          count[key] = (count[key] ?? 0) + 1;
        }
        let max = 0;
        let dominantKey = "15,23,42";
        for (const [key, n] of Object.entries(count)) {
          if (n > max) {
            max = n;
            dominantKey = key;
          }
        }
        const [r, g, b] = dominantKey.split(",").map(Number);
        resolve(rgbToHex(r, g, b));
      } catch {
        resolve("#0f172a");
      }
    };
    img.onerror = () => resolve("#0f172a");
    img.src = url;
  });
}
