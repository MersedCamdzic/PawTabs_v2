import type { WindowColor } from "@/types";

export interface ColorStyle {
  dot: string;
  border: string;
  headerBg: string;
  swatch: string;
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

export const WINDOW_COLOR_STYLES: Record<WindowColor, ColorStyle> = {
  gray: {
    dot: "bg-gray-500",
    border: "border-l-gray-400/70",
    headerBg: "bg-gray-500/5",
    swatch: "bg-gray-500",
  },
  blue: {
    dot: "bg-blue-500",
    border: "border-l-blue-500/70",
    headerBg: "bg-blue-500/5",
    swatch: "bg-blue-500",
  },
  green: {
    dot: "bg-emerald-500",
    border: "border-l-emerald-500/70",
    headerBg: "bg-emerald-500/5",
    swatch: "bg-emerald-500",
  },
  amber: {
    dot: "bg-amber-500",
    border: "border-l-amber-500/70",
    headerBg: "bg-amber-500/5",
    swatch: "bg-amber-500",
  },
  red: {
    dot: "bg-red-500",
    border: "border-l-red-500/70",
    headerBg: "bg-red-500/5",
    swatch: "bg-red-500",
  },
  purple: {
    dot: "bg-purple-500",
    border: "border-l-purple-500/70",
    headerBg: "bg-purple-500/5",
    swatch: "bg-purple-500",
  },
  pink: {
    dot: "bg-pink-500",
    border: "border-l-pink-500/70",
    headerBg: "bg-pink-500/5",
    swatch: "bg-pink-500",
  },
  cyan: {
    dot: "bg-cyan-500",
    border: "border-l-cyan-500/70",
    headerBg: "bg-cyan-500/5",
    swatch: "bg-cyan-500",
  },
};
