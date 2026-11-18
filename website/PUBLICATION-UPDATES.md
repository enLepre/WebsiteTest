# Automatic publication updates

The Publications page and homepage highlights can include new journal articles from Crossref, matched to David Tilley's ORCID: **0000-0002-7542-1147**. This identifier is linked from his [UZH profile](https://www.lightchec.uzh.ch/en/aboutus/steeringcommittee/davidtilley.html).

## What stays intact

All 86 original Markdown records in `content/publications/` remain unchanged. Imported entries are stored separately in `src/data/publications-auto.json`. Existing manual entries take precedence by DOI, including drafts; automated updates never rewrite or delete them. The site retains its existing Publications layout and renders local saved data, so visitors do not wait for Crossref.

Before implementation, a separate local backup was saved at `../.workspace-backups/publications-before-crossref/`, containing the original Markdown records, rendered publication page, page component, and deployment workflow. Keep this backup when moving the project elsewhere.

## Disable and undo

In `src/data/publication-sync.json`, change `"enabled": true` to `"enabled": false`, then build/deploy normally. This stops fetching and hides **all** imported entries. The original manual publications and their ordering are restored. The generated cache is retained, so enabling the feature again is also reversible. No files need deleting.

## How updates run

Run `pnpm sync:publications` to check now, followed by `pnpm build` (and `pnpm offline` if sharing the offline preview).

The GitHub Pages workflow checks every Monday at 06:17 UTC, on pushes to main, and on manual workflow runs. Pull-request checks do not contact Crossref. After a successful test/build, newly imported records are committed to `main` and deployed in the same workflow. Commits made with GitHub's workflow token do not launch a second push-triggered run.

**The weekly schedule is prepared but is not active in this local folder.** Upload the website project to a GitHub repository on its default `main` branch, enable Actions and Pages (GitHub Actions source), and allow the workflow to write repository contents. Branch protection may require a different approved update workflow. The existing Pages instructions in README.md still apply. No repository or deployment was created by this change.

The sync uses the public Crossref API with an ORCID filter; it does not require Google Scholar scraping, API keys, or an ORCID login. It checks journal articles dated **2026-01-01 onward**. This date avoids importing historical omissions into the already curated list. Change `fromDate` deliberately to expand the range.

## Matching, limits, and failures

- Only papers explicitly listing the exact ORCID in Crossref author metadata are eligible. Author-name similarity alone is never used. Papers without that metadata can still be added manually.
- Titles, authors, journal details, dates, and DOIs come from publishers' Crossref deposits. This is not a complete mirror of Google Scholar or of the ORCID works list.
- Preprints, records without required metadata, future-dated papers, and records marked as updates/corrections are skipped. The sync reports its result in the workflow log.
- DOIs are compared case-insensitively. Previously imported entries are retained even when absent from a subsequent response. Metadata changes to existing imports are not applied automatically; edit the cached record or add a manual record with the same DOI to override it.
- Add a DOI to `excludeDois` in the configuration to hide an imported paper and prevent its import. This does not hide original manual publications.
- Network requests are retried and bounded. An incomplete response or failed sync leaves saved data untouched and stops that deployment, preserving the previously published site. Local builds continue to work without the network.
- Imported papers appear before manually ordered papers in the same year; originals retain their curated relative order. New imports also feed the homepage's latest publications.

## Verification

`pnpm test` covers exact ORCID matching, publication type/date validation, DOI deduplication, exclusions, disabled sync, paginated responses, partial failure, preservation of manual files, and an actual build with imported publications followed by an exact manual-page restoration.
