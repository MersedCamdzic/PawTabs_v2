import type { WindowColor } from "@/types";

export interface ColorStyle {
  /** small filled circle / swatch */
  dot: string;
  swatch: string;
  /** thin left border (legacy use) */
  border: string;
  /** full card border color */
  cardBorder: string;
  /** subtle full-card background */
  cardBg: string;
  /** slightly stronger header background */
  headerBg: string;
  /** title text color (works in light + dark via Tailwind palette) */
  titleText: string;
  /** color for icons in card chrome */
  iconText: string;
}

export const WINDOW_COLOR_PALETTE: { value: WindowColor; label: string }[] = [
  { value: "gray", label: "Gray" },
  { value: "blue", label: "Blue" },
  { value: "green", label: "Green" },
  { value: "amber", label: "Amber" },
  { value: "red", label: "Red" },
  { value: "purple", label: "Purple" },
  { value: "pink", label: "Pink" },
  { value: "cyan", label: "Cyan" },
];

function make(base: string): ColorStyle {
  return {
    dot: `bg-${base}-500`,
    swatch: `bg-${base}-500`,
    border: `border-l-${base}-500/70`,
    cardBorder: `border-${base}-500/40`,
    cardBg: `bg-${base}-500/[0.04]`,
    headerBg: `bg-${base}-500/15`,
    titleText: `text-${base}-700 dark:text-${base}-300`,
    iconText: `text-${base}-600 dark:text-${base}-400`,
  };
}

export const WINDOW_COLOR_STYLES: Record<WindowColor, ColorStyle> = {
  gray: make("gray"),
  blue: make("blue"),
  green: make("emerald"),
  amber: make("amber"),
  red: make("red"),
  purple: make("purple"),
  pink: make("pink"),
  cyan: make("cyan"),
};
