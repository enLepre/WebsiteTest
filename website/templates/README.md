# Copy-and-paste content templates

Start here whenever you add content. Paths below are relative to the `website/` folder (or the repository root after uploading its contents).

## Which template should I use?

| What you want to add or edit | Template | Destination |
| --- | --- | --- |
| A current member or alumnus | `person.md` | `content/people/firstname-lastname.md` |
| A news item | `news.md` | `content/news/YYYY-MM-DD-short-title.md` |
| A research topic | `research.md` | `content/research/short-topic-name.md` |
| A publication | `publication.md` | `content/publications/short-paper-title.md` |
| Homepage heading and video | `sections/hero.md` | Existing `content/sections/hero.md` |
| Research introduction | `sections/research.md` | Existing `content/sections/research.md` |
| Team introduction | `sections/team.md` | Existing `content/sections/team.md` |
| Publications introduction | `sections/publications.md` | Existing `content/sections/publications.md` |
| News introduction | `sections/news.md` | Existing `content/sections/news.md` |
| Vacancies and application links | `sections/opportunities.md` | Existing `content/sections/opportunities.md` |
| Group name and contact details | `sections/contact.md` | Existing `content/sections/contact.md` |
| Legacy people highlights section | `sections/home-team.md` | Reference only; currently unused |

## Add an entry in five steps

1. Open the appropriate template and copy its entire contents, including both `---` lines.
2. Create a new `.md` file in the destination folder. Use a unique filename with lowercase letters, digits and hyphens, without spaces or accents. Keep accents in the displayed name or text. Do not overwrite an existing entry.
3. Replace the example values and body text. Lines beginning with `#` between the `---` lines are explanatory comments and will not appear on the website. Remove the `#` from an optional field only when you have filled it in.
4. Add any images to `public/people/` or `public/media/`. Reference them as `people/filename.webp` or `media/filename.webp`, without `public/` or a leading slash. Names and capitalization must match exactly. If no image is available, leave its field commented out.
5. Change `draft: true` to `draft: false` when the entry is ready, then save. Once GitHub publishing is configured, commit the file and any new images; the next successful automated build publishes them. Existing local HTML previews are snapshots and need to be regenerated separately.

Keep the original templates in `templates/` for the next editor. Do not put templates or README files inside `content/`: the website treats Markdown there as actual entries. Templates are deliberately outside those folders so they cannot accidentally appear as content.

## People and alumni

For example, copy `person.md` to `content/people/jane-smith.md`, change the name and role, add a biography, and optionally upload `public/people/jane-smith.webp` and enable the photo field. Set `draft: false` to publish. A current member automatically gets a Team listing and a personal page at `team/jane-smith/`.

Allowed roles are `group-leader`, `postdoc`, `phd`, `msc`, and `technician`. `roleLabel` is optional display text; remove or change the example label to match the selected role. Lower `order` values appear first within each role. Use the person's name for the filename, without titles such as Dr. Avoid renaming published files because their names determine profile addresses.

When someone leaves, change `status: current` to `status: alumni` in their existing file. Keep their role, biography and photo; do not create a duplicate. Alumni appear in the compact alumni list, without a personal page, photo or biography. Use the same template with `status: alumni` when adding a previously unlisted alumnus. Leave `thesis: ""` empty or supply a full HTTP/HTTPS thesis link.

## News, research and publications

- News dates must be quoted valid dates such as `"2026-09-20"`. Newest news appears first; the latest three items supply homepage highlights. Use `sample: false` for actual news.
- Each published news file creates its own page at `news/FILENAME/` (without `.md`). The News page and homepage highlights show the date, title and summary, linking to the full post. Write the article below the second `---`. Keep the filename unchanged to preserve shared links. Setting `draft: true` hides both the listing and the article page.
- All published research topics appear on Research; the first three by `order` also appear on the homepage. `homeTitle` and `summary` provide their shorter homepage text. If omitted, the full title and body are used.
- Publications require a title, year, journal and `https://doi.org/…` link. `authors` and the body note are optional. Replace the example DOI before publishing. The optional `number` field preserves curated numbering: when both compared entries have numbers, higher numbers sort first; otherwise year (newest first), order (lowest first), and filename determine their order. Do not assign arbitrary numbers. Manual entries override automatic imports of the same DOI, including when the manual entry is a draft.

## Fixed page sections are edited in place

The files in `content/sections/` describe existing parts of the site. Use their matching templates as field references, then edit the existing file while preserving any text you want to keep. They do not have a draft switch. Copying one to a new filename will not create a new page or menu item.

Opportunities currently uses one file for all vacancies. To add a position, add another heading and description inside `content/sections/opportunities.md`; there is no separate positions collection.

`home-team.md` is retained as a legacy file but is not currently used by the page component. Edit news entries for homepage highlights. Group photographs and navigation structure are not controlled by new Markdown entries.

## Formatting tips

Keep field names exactly as shown. Put text in double quotes; escape a double quote inside a value as `\"`. Leave numbers and `true`/`false` unquoted. Keep the two `---` separators. Text below the second separator is the page body and supports paragraphs, **bold**, headings, lists and `[link text](https://example.org)`.

A draft still needs valid fields; for example, a malformed date or email can prevent a build. Optional email and image fields should be omitted or commented out rather than set to empty strings. A missing local image on a published entry also prevents a build.

The project README and other documentation explain how to maintain the site; they are not repeatable website entries and do not need content templates. Markdown in backups or archives should not be used as a starting point.
