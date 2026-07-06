# PawTabs website

Single-page landing site + privacy policy page for the PawTabs Chrome extension.

## Structure

```
website/
  index.html              landing page
  privacy.html            full privacy policy (linked from index)
  logo.png                site favicon + hero logo (icon-128 copy)
  screenshots/
    01-popup.png          popup with grouped tabs (uploaded)
    02-overview.png       Mission Control Overview (placeholder — todo)
    03-windows.png        Windows view (placeholder — todo)
    04-details.png        Tab details modal (placeholder — todo)
    05-tags.png           Tags view (placeholder — todo)
```

## Local preview

Just open `index.html` in a browser. No build step, no dependencies.

If you want a proper server (for correct MIME types on some browsers):

```
cd website
python3 -m http.server 8080
# then browse to http://localhost:8080
```

## Deploy options

**GitHub Pages** — push this folder to a repo, enable Pages from `main` branch. You'll get `https://<username>.github.io/<repo>/`.

**Vercel** — drag the `website/` folder into vercel.com/new. Gets a `*.vercel.app` URL instantly. Add a custom domain later from the Vercel dashboard.

**Netlify** — same drag-and-drop pattern from netlify.com/drop.

## Updating

Once the remaining screenshots are captured (per `../SCREENSHOTS.txt`), drop them into `website/screenshots/` with the filenames listed above and the placeholders in `index.html` will start displaying real images. Each figure's caption stays as-is.

Replace the `#` placeholder links in `index.html` when:
- Chrome Web Store listing is live (find the "Install from Chrome Web Store" and "Install" button hrefs)
- GitHub repo is public (footer link)
