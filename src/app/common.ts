export const TILE_SIZE = 64;

export const C = {
  blue: { h: 240, s: 100, l: 25 },
  red: { h: 360, s: 100, l: 25 },
};

/**
 * Resolves static asset paths taking into account Vite BASE_URL (e.g. for GitHub Pages).
 */
export function getAssetUrl(path: string): string {
  const cleanPath = path.startsWith("/") ? path.slice(1) : path;
  const base = import.meta.env.BASE_URL || "./";
  return base.endsWith("/") ? `${base}${cleanPath}` : `${base}/${cleanPath}`;
}
