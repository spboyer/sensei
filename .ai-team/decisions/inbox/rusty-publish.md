### 2026-02-09: Enable GitHub Pages before deploy workflow can succeed
**By:** Rusty
**What:** The `deploy-pages.yml` workflow build job passes, but the deploy job fails with `404 Not Found` because GitHub Pages is not enabled on the `spboyer/sensei` repository. Owner must go to **Settings → Pages → Build and deployment → Source** and select **"GitHub Actions"**. After enabling, either re-run the failed workflow or push any change to `docs/` to trigger a new deploy. The site URL will be `https://spboyer.github.io/sensei/`.
**Why:** The `actions/deploy-pages@v4` action requires the Pages API to be enabled on the repo. This is a one-time manual step that can't be done via git — it's a repo settings change. Once enabled, all future pushes to `main` touching `docs/**` will auto-deploy.
