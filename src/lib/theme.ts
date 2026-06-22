import type { Theme } from "@/types";

const MEDIA_QUERY = "(prefers-color-scheme: dark)";

export function applyTheme(theme: Theme): void {
  const resolved = resolveTheme(theme);
  document.documentElement.dataset.theme = resolved;
}

export function resolveTheme(theme: Theme): "light" | "dark" {
  if (theme === "system") {
    return window.matchMedia(MEDIA_QUERY).matches ? "dark" : "light";
  }
  return theme;
}

export function watchSystemTheme(
  callback: (resolved: "light" | "dark") => void,
): () => void {
  const mql = window.matchMedia(MEDIA_QUERY);
  const handler = (e: MediaQueryListEvent) =>
    callback(e.matches ? "dark" : "light");
  mql.addEventListener("change", handler);
  return () => mql.removeEventListener("change", handler);
}
