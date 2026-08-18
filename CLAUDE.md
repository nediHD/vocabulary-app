# Projekt-Hinweise für Claude

## Deployment / Branch-Workflow
- Die live Seite (`nedihd.github.io/vocabulary-app`) wird über GitHub Pages
  deployt und baut **ausschließlich beim Push auf `main`**
  (siehe `.github/workflows/deploy.yml`).
- **Stehende Freigabe des Nutzers:** Änderungen sollen **immer direkt nach
  `main` gepusht** werden, damit sie automatisch deployt werden. Nicht mehr
  vor dem Merge nachfragen. (Feature-Branches dürfen weiterhin genutzt und
  danach in `main` gemerged werden — Endziel ist immer `main`.)
- Nach einem Push auf `main` deployt GitHub Pages automatisch (~1–2 Min).
  Im Browser danach ggf. Hard-Reload, wegen JS-Caching.
