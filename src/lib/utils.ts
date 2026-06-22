export function getRootDomain(url: string): string {
  try {
    const { hostname } = new URL(url);
    return hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

export function getFaviconUrl(url: string, fallback: string): string {
  if (fallback) return fallback;
  const domain = getRootDomain(url);
  if (!domain) return "";
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
}

export function hashStringToColor(input: string, palette: string[]): string {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return palette[Math.abs(hash) % palette.length] ?? palette[0]!;
}
