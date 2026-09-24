# Tilley Research Group website

The approved design with six separate pages, powered by Astro and Markdown. The opening video pauses off-screen; portraits load as you approach them. The published site uses ordinary static files. No database or server administration is needed.

## Everyday editing

### Lab Tour

The Lab Tour page at `lab-tour/` lists 30 instruments in Synthetic Equipment and Analytical Devices, followed by Shared Facilities. Edit one Markdown file per instrument in `content/equipment/`; copy `templates/equipment.md` to add another. Set `category` to `synthetic` or `analytical`, use `order` to arrange entries, and set `draft: true` to hide an entry. Optional body text appears below the instrument name.

Published photos live in `public/media/equipment/`. The original supplied files remain in the repository's `media/Equipment/` folder. Upload new website photos into `public/media/equipment/` with filenames without spaces, then set the Markdown `image` field to `media/equipment/filename.webp` and provide descriptive `imageAlt` text. Missing photos stop the build. Edit `content/sections/lab-tour.md` for the introduction and `content/sections/shared-facilities.md` for facility links. The offline exporter includes this page automatically.

For copy-and-paste templates covering every content folder and each fixed section, start with [the template guide](templates/README.md). It explains filenames, optional fields, photos, drafts, and how to publish new entries.

| What to change | Where |
| --- | --- |
| A person's name, role, status, photo, or biography | `content/people/NAME.md` |
| A research topic | `content/research/TOPIC.md` |
| A publication | `content/publications/PAPER.md` |
| Main heading, introductory text, opportunities, contact details | `content/sections/*.md` |
| A portrait | `public/people/` |
| Opening video | `public/media/lab.webm` |

The block between `---` lines holds fields. Text below it is ordinary Markdown. Use quotes around titles or names containing punctuation, particularly colons. Keep `order` as a number and `draft` as `true` or `false` without quotes.

### Add someone

1. Copy `templates/person.md` into `content/people/`, for example `alex-smith.md`.
2. Upload a compressed portrait into `public/people/`, for example `alex-smith.webp`. Around 320 × 400 pixels is sufficient for this design.
3. Edit the Markdown fields. Use `photo: people/alex-smith.webp` — omit `public/` and the leading slash.
4. Set `draft: false` when ready. Save both files.

```yaml
---
name: "Alex Smith"
role: postdoc
status: current
photo: people/alex-smith.webp
order: 20
draft: false
---

Optional short biography.
```

Roles: `group-leader`, `postdoc`, `phd`, `msc`, `technician`.
Lower `order` numbers appear first within the role. Equal orders use filename order.
The photo and email fields are optional; remove either line if not available.

### Person filenames and thesis links

Use one lowercase `name-surname.md` filename per person (include additional given names or surname parts with hyphens). Omit titles such as Dr., status prefixes, and role prefixes; use plain ASCII letters in filenames. Keep the correctly accented display name in `name`.

Every person file and the template includes `thesis: ""`. Leave it empty when unavailable, or enter an HTTP/HTTPS link, for example `thesis: "https://www.zora.uzh.ch/id/eprint/263151/"`. A filled link appears on a current member's personal page or beside an alumnus's name. The field may also be omitted.

Keep one record per person, updating their role/status instead of copying them into another category. Current members must not also have an alumni entry. People who held several former roles are listed under their latest role, retaining their thesis link.

### Move someone to alumni

Change only `status: current` to `status: alumni`. Keep their role, file, and photo. After the next successful build, they leave the current-member grid and appear in the Alumni list under their former role. Alumni photos and biographies are retained in the source but not shown in this compact list. Restoring `status: current` brings the profile back.

### News posts

Copy `templates/news.md` to `content/news/YYYY-MM-DD-short-title.md`, fill in the title, date and summary, and write the full article below the second `---`. Set `draft: false` when ready. Each published file creates a page at `news/YYYY-MM-DD-short-title/`; the News page lists all posts newest first, and the homepage highlights link to the latest three. Both show summaries; the full text appears on the individual page. Keep filenames stable to preserve links. Draft posts have no public page. The offline exporter includes article pages automatically.

### Publications and research

Publications can also receive additive Crossref updates matched by David's ORCID. The original Markdown entries are preserved. See [PUBLICATION-UPDATES.md](PUBLICATION-UPDATES.md) for the weekly workflow, limitations, and the one-switch rollback to the manual-only list.

Copy the matching template into its content folder and edit the fields. Set `draft: false` to include it. Publications sort by year (newest first), then `order` (lowest first). Use `order` to arrange papers within a year. Research topics sort by `order`.

### General page text

Edit `content/sections/hero.md` for the opening heading; `research.md`, `team.md`, and `publications.md` for their introductions; `opportunities.md` for recruitment text and its link; and `contact.md` for the group name, address, email, phone, and footer note. Remove the `note` field when the design-preview label is no longer wanted. Markdown links, bold text, lists, and paragraphs work in section bodies.

## Run on your computer

Install Node.js 24 LTS and pnpm 11.19.0 (one-time setup). From this folder:

```sh
pnpm install
pnpm dev
```

Open the local address printed by Astro. Markdown edits update the local preview automatically. Stop it with Ctrl+C.

To produce the finished static site and a standalone preview:

```sh
pnpm build
pnpm offline
```

Open `offline/index.html` (or the existing `offline-preview.html` entry point). Keep the entire `offline/` folder together: it contains six linked HTML pages with embedded media. Each page works offline; email and DOI links need the appropriate application or internet connection. These files are snapshots: after editing Markdown, run the two commands again. `dist/` is generated output — edit the content files instead.

## Publish with GitHub Pages

This folder's contents must be at the repository root (the repository should contain `package.json`, `content/`, `src/`, and `.github/`, not a wrapping `website/` folder).

1. Create a repository owned by the group and upload these files, including the hidden `.github/` folder and `pnpm-lock.yaml`. Do not upload `node_modules/`, `.astro/`, or `dist/`.
2. Use a `main` branch. Under **Settings → Pages**, choose **GitHub Actions** as the source.
3. Push a change to `main`, or run **Build and publish website** from the Actions tab.
4. GitHub checks the content, rebuilds the page, and publishes it. If validation fails, the previous successful site stays online. The Actions log identifies the failed build.

The workflow reads the GitHub Pages address and repository path automatically, so portraits and video work under `username.github.io/repository/`. It also handles a custom domain configured in GitHub Pages. The existing domain has not been connected or changed; first review the temporary GitHub Pages site.

For a local build that mimics a project subpath:

```sh
BASE_PATH=/my-repository SITE_URL=https://example.github.io pnpm build
```

## Checks and maintenance

`pnpm test` checks the real build, member-to-alumni movement, adding a member, Markdown rendering, draft exclusion, invalid-field rejection, missing-photo rejection, and media paths under a repository subpath. `pnpm build` also validates content fields and referenced media files.

Dependencies are pinned in the manifest and lockfile. Update deliberately and run the checks afterward.

The content was updated from the original group website: 17 current members, 29 alumni entries and 86 publications. See CONTENT-SOURCES.md for source pages, verification details and remaining source-link limitations. The compressed photos and opening video came from the existing group website. The video is cropped to 1440 × 690 pixels to remove the bottom caption at all screen sizes; it is encoded at 24 fps without audio to reduce file size.

## Files for future development

- `src/components/SitePage.astro`: shared design, navigation, and content grouping.
- `src/pages/index.astro` and `src/pages/[page].astro`: Home and five section routes.
- `src/content.config.ts`: allowed fields and validation rules.
- `src/styles/site.css`: approved visual styling.
- `.github/workflows/deploy.yml`: checks and GitHub Pages publishing.
- `scripts/export-offline.mjs`: linked offline-page export.

No GitHub repository has been created and nothing has been deployed by this preparation step.

## Page structure

Home contains the opening video, the first three research topics, David’s portrait and people highlights, the latest three publications (sorted by year and order), and Opportunities and Contact previews. Edit `content/sections/home-team.md` to replace the highlights placeholder. Research, Team (including Alumni), Publications, Opportunities, and Contact each have a separate page. All use the same navigation and visual style. Markdown filenames and status workflows are unchanged. The video loads only on Home; David’s portrait appears on Home; the full portrait grid loads on Team.

## News and homepage highlights

Copy `templates/news.md` into `content/news/`. Set a quoted `date` (YYYY-MM-DD), title, and short summary; put the full article below the fields. Set `draft: false` to display it. News appears newest first; the latest entry automatically becomes the homepage people highlight. The initial three entries are explicitly labelled samples: replace their content and set `sample: false` before launch. `content/sections/news.md` controls the News page heading. `content/sections/home-team.md` still controls the highlights heading; its body is replaced by news entries.


## Personal member pages

Every current, non-draft member has a page under team/NAME/. Their photo and name on the Team page link to that profile. Education and biography text stays in content/people/NAME.md and is displayed only on the personal page.

The offline export includes the personal pages as team-NAME.html. Share the entire offline folder so all profile and navigation links work.

## Horizontal navigation

### Homepage video on phones

The homepage uses a muted, inline MP4 source with WebM as a fallback. `content/sections/hero.md` controls `videoMp4`, `video`, and `poster`; keep all three in sync when replacing the clip. Use H.264 MP4 with web-optimized (fast-start) metadata and no audio. The cover image remains visible until a frame is available. Playback starts on the initial visit and retries when media becomes ready or the page becomes visible again. A Play video button is available if autoplay is blocked. Reduced-motion preferences suppress autoplay but still allow explicit playback. Offscreen and background videos pause. Offline exports embed both video formats and the cover image.

The main menu moves left or right in menu order, passing through intermediate pages. Transitions take 440–1050 ms, depending on the distance. The script in `src/scripts/navigation.js` fetches only the pages on the selected journey and caches them for the current visit; it does not preload the entire website. Browser Back/Forward also animates. Rapid menu selections retain the latest requested destination. Reduced-motion preferences skip the animation and intermediate fetches.

Member portraits in the Team directory zoom into their position on the personal page, with the biography fading in. Returning to Team reverses the portrait motion: the personal information fades out as the image shrinks back into the directory, restoring the saved scroll position. Direct profile visits reveal the matching member when returning. Browser Back/Forward supports these routes too. JavaScript-disabled browsers, failed page fetches, and double-clicked `file://` offline previews retain normal page navigation. To see the animation locally, run the website preview over HTTP (`pnpm dev` or `pnpm preview` after building).

Before a slide, visible images on the journey are loaded and decoded in a hidden staging area; images further down remain lazy-loaded. Video posters (or a first frame) are also prepared. The destination's prepared content is moved into place without cloning its images again. Media preparation waits at most 1.8 seconds; if media is slow or the viewport changes during preparation, navigation completes without the slide.

## Publication search

The Publications page has an instant search across titles, author names, journal details, DOIs, and years, plus a year dropdown. Multiple search words must all match; accents and capitalization are ignored. Search and year filters work together, display a result count, and can be cleared with one button. They apply equally to manual and imported publications and remain selected when navigating away and back during the same visit. No external search service is required; offline previews support the filters too. With JavaScript disabled, the full publication list remains available.
