# Bright Vision Trading, Contracting & Services — www.bvtcs.com.qa

Static website (HTML, CSS, vanilla JavaScript). No build step.

## Pages
`index.html` · `services.html` · `visa.html` · `about.html` · `contact.html`

## Structure
- `css/style.css` – design (tokens at the top: colours, radius)
- `css/logo.css` – logo embedded as a CSS mask
- `js/data.js` – edit here: translations, services, categories, country codes, WhatsApp number
- `js/main.js` – language gate, rendering, search, animations
- `assets/` – logo files

## Run locally
`python3 -m http.server 8000` then open http://localhost:8000

## Publish on GitHub Pages
Push all files to a repo, then Settings → Pages → Deploy from branch `main` / root.
