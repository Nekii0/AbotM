# AbotM

Abot-Mamamayan community hub: find help, give help, build a stronger community.

**Live site:** https://nekii0.github.io/AbotM/

## Files

- `index.html`: page content
- `style.css`: design
- `script.js`: search box
- `volunteer.html`, `wellness.html`, `education.html`, `donate.html`, `request-help.html`, `community-needs.html`: service pages (replace the green placeholder boxes with your real contacts)

## Publishing

The site is published with GitHub Pages from the `main` branch (**Settings → Pages**).
Every push to `main` updates the live site in about a minute.

When you change `style.css` or `script.js`, raise the number in `style.css?v=2` / `script.js?v=2` in every `.html` file (for example to `v=3`), so visitors' browsers load the new version instead of an old cached copy.

### Update on github.com

1. Open the file you want to change (for example `index.html`).
2. Click the pencil icon and make your edit.
3. Click **Commit changes**.

### Update from your computer

```bash
git add .
git commit -m "Update site"
git push
```
