# PawTabs v2

Chrome extension for managing tabs and windows — group, tag, note, and clean up.

## Stack

- **Vite 6** — build tool with Chrome MV3 support via `@crxjs/vite-plugin`
- **TypeScript** (strict)
- **Preact** with React compat (for `@phosphor-icons/react`)
- **Tailwind CSS v4** with design tokens (CSS-first config)
- **Phosphor Icons** — single icon family, regular weight
- **Inter** font (bundled via `@fontsource`)

## Development

```bash
npm install
npm run dev      # Vite dev server with HMR for the popup pages
npm run build    # produces dist/ ready to load as unpacked extension
npm run typecheck
```

## Loading as unpacked extension

1. Run `npm run build`
2. Open `chrome://extensions`
3. Enable **Developer mode** (top right)
4. Click **Load unpacked** → select the `dist/` folder
5. Pin the extension and press `Ctrl+Shift+Y` (or `Cmd+Shift+Y` on Mac)

For live development, run `npm run dev` and load the `dist/` folder — CRXJS supports HMR for the popup and mission control pages.

## Project layout

```
src/
  manifest.config.ts        # MV3 manifest (CRXJS)
  background/index.ts       # Service worker
  popup/                    # Toolbar popup (Preact)
  mission-control/          # Full-window dashboard (Preact)
  styles/
    tokens.css              # Design tokens (warm light + dark)
    globals.css             # Base styles, font imports
public/icons/               # Extension icons (16, 48, 128)
legacy/                     # Original v1 code, kept for reference
dist/                       # Build output
```

## Design system

Notion / Arc warm light aesthetic. Single accent color (`#2563EB`), Phosphor icons (regular weight), Inter font. Tokens defined in `src/styles/tokens.css` via Tailwind v4 `@theme` directive — use them as Tailwind classes (`bg-bg`, `text-fg-muted`, `border-border`, etc.).

## Tagged commits

- `legacy-v1` — original vanilla JS + Bootstrap codebase
