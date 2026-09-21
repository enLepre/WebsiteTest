# Tilley Research Group website — current project status

Deployment checked: 2026-09-21, approximately 16:13 Europe/Zurich (CEST). Local development updated later the same day.

## Lab Tour addition — local, awaiting publication

Added `website/content/equipment/` with 30 editable Markdown entries (18 synthetic and 12 analytical), using all supplied photos from `media/Equipment/`. Website copies are in `website/public/media/equipment/`. The new `/lab-tour/` route appears in the shared navigation, uses a responsive photo grid, and includes the four shared-facility links from the original lab tour. Page introduction and facility links are editable in `website/content/sections/`. An equipment template and maintainer instructions are included.

Built successfully with the real `/WebsiteTest` deployment prefix; all 12 automated tests passed. The offline export contains 24 pages, including `website/offline/lab-tour.html`. Static checks verified all 30 instrument cards, their image paths, embedded offline photos, and internal offline page links. Browser visual verification was blocked by an admin-enforced browser policy, so desktop/mobile appearance has not been visually confirmed.

The local checkout was already at `6611fada7eee181d199b4d4ec70bf9a13211c341` (merge of `main`) with a clean working tree when this work began, superseding the older local-checkout snapshot below. This addition has not been committed, pushed, or deployed; deployment observations below are the earlier snapshot.

## Overall status

**Live on GitHub Pages; latest Astro publishing run successful.** After the user followed the Pages configuration instructions, a manual publishing run succeeded and no newer Jekyll run was observed. A future push still needs to confirm that the duplicate Jekyll build no longer triggers. The local source checkout remains two commits behind the deployed revision.

- Repository: https://github.com/enLepre/WebsiteTest (public; default branch `main`).
- Live website: https://enlepre.github.io/WebsiteTest/
- Latest remote `main` and successful publishing revision: `be1ce48dc8853d1bbe69bc89b243074e5a1f6e42`.
- Latest successful deployment completed on 2026-09-21 at 16:11:40 CEST (14:11:40 UTC), triggered manually (`workflow_dispatch`).
- Publishing run: https://github.com/enLepre/WebsiteTest/actions/runs/35610424005
- GitHub deployment status explicitly reports `success` and the live URL above.

This record supersedes the deployment/source-discovery status in the historical `HANDOFF_previousProject` and the preparation-only statements in `website/README.md`. Those older documents are not evidence of the current deployment state.

## Live page checks

All seven main routes returned HTTP 200 over HTTPS with the expected page titles:

| Route under `/WebsiteTest/` | Page title |
| --- | --- |
| `/` | Tilley Research Group |
| `research/` | Research \| Tilley Research Group |
| `team/` | Team \| Tilley Research Group |
| `publications/` | Publications \| Tilley Research Group |
| `news/` | News \| Tilley Research Group |
| `opportunities/` | Opportunities \| Tilley Research Group |
| `contact/` | Contact \| Tilley Research Group |

These checks establish page availability, not a full visual, mobile, asset, member-profile, or navigation test.

## Actual source and publishing structure

- The editable Astro application is in `website/`, with Markdown content in `website/content/`.
- The active repository workflow is `.github/workflows/publish.yml` (`Publish website`). It runs on pushes to `main` or manual dispatch, installs dependencies, builds from `website/`, uploads `website/dist`, and deploys to GitHub Pages.
- This repository therefore supports the existing `website/` wrapper; the older README instruction to move the application to the repository root does not describe this checkout's active workflow.
- The active workflow runs `pnpm build`, but does not run the separate `pnpm test` suite. A successful deployment should not be described as a complete test-suite pass.
- Generated previews, `dist/`, and `GitHub-upload-ready/` are not the source directory used by the active publishing workflow.

## Local checkout

- Local branch: `main`.
- Local HEAD at inspection: `5dd99552cb8c7bb92e7e3512f501200b990e6490` (`Update 2026-09-15-welcome.md`).
- Working tree was clean before this status file was added.
- GitHub's commit comparison shows remote `main` is two commits ahead, with no divergent commits. The changed files are `website/content/sections/opportunities.md` and `website/src/styles/site.css`.
- Local `origin/main` was stale: the initial local status showed no difference from that cached reference. The two-commit difference was verified against GitHub directly.
- This status update does not synchronize the source files, make a commit, or publish changes. Synchronize with remote `main` before further website development so that the live edits are preserved.

Comparison: https://github.com/enLepre/WebsiteTest/compare/5dd99552cb8c7bb92e7e3512f501200b990e6490...be1ce48dc8853d1bbe69bc89b243074e5a1f6e42

## Open follow-up

1. Confirm on the next ordinary push that the separate `pages build and deployment` workflow no longer runs. The old failure was diagnosed from its logs: Jekyll attempted to parse Astro source as YAML, reporting invalid front matter in `website/src/pages/index.astro` and a YAML parsing exception in `website/src/pages/team/[member].astro`. The user reports following the instructions to select GitHub Actions as the Pages source and rerun the existing publisher. The new manual run succeeded; no later Jekyll run appears in the latest workflow history. A manual run alone does not prove that automatic Jekyll builds on push have been disabled. The homepage was rechecked and returned HTTP 200 at 16:13 CEST.
   Failed run: https://github.com/enLepre/WebsiteTest/actions/runs/35603830136
2. Synchronize the local source checkout with remote `main` before editing the website.
3. Complete visual and interaction checks before treating this as a fully validated launch.
4. The intended long-term domain remains `tilleyresearchgroup.com`. Its current DNS/connection was not checked here. The unauthenticated Pages settings API returned 404, so this check does not establish the configured Pages source, custom domain, or HTTPS-enforcement setting.

Verification used authenticated GitHub repository metadata, public GitHub workflow/deployment/commit APIs, the local workflow and Git history, and direct HTTP requests to the live pages. No repository settings, remote files, or DNS records were changed.
