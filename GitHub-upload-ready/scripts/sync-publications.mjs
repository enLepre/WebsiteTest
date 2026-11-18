import { readFile, readdir, writeFile, rename } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { normalizeDoi } from '../src/lib/publications.mjs';

const clean = value => String(value || '').replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim();
const orcidId = value => String(value || '').replace(/^https?:\/\/orcid.org\//, '').replace(/\/$/, '');

export function convertWork(work, config, today) {
  if (work.type !== 'journal-article' || !work.author?.some(author => orcidId(author.ORCID) === config.orcid)) return null;
  if (work['update-to']?.length) return null; // Corrections/retractions need editorial review.
  const doi = normalizeDoi(work.DOI);
  const title = clean(work.title?.[0]);
  const journalName = clean(work['container-title']?.[0]);
  const parts = (work.published || work['published-online'] || work['published-print'] || work.issued)?.['date-parts']?.[0];
  if (!/^10\.\d{4,9}\/\S+$/.test(doi) || !title || !journalName || !parts?.length) return null;
  const [year, month = 1, day = 1] = parts;
  const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const parsed = new Date(date);
  if (!Number.isInteger(year) || !Number.isFinite(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== date || date < config.fromDate || date > today) return null;
  const authors = work.author.map(author => clean([author.given, author.family].filter(Boolean).join(' ') || author.name)).filter(Boolean).join(', ');
  if (!authors) return null;
  const volume = clean(work.volume), issue = clean(work.issue), pages = clean(work.page || work['article-number']);
  const journal = [journalName, year, volume && `${volume}${issue ? `(${issue})` : ''}`, pages].filter(Boolean).join(', ') + '.';
  return { title, authors, journal, year, date, doi: `https://doi.org/${doi}`, source: 'Crossref', orcid: config.orcid };
}

async function requestJson(url, fetchImpl) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetchImpl(url, {
        headers: { Accept: 'application/json', 'User-Agent': 'TilleyResearchGroup-publications/1.0 (https://tilleyresearchgroup.com)' },
        signal: AbortSignal.timeout(20000),
      });
      if (!response.ok) throw new Error(`Crossref HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      if (attempt === 2) throw error;
      await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1)));
    }
  }
}

export async function syncPublications({ root = process.cwd(), fetchImpl = fetch, now = new Date() } = {}) {
  const config = JSON.parse(await readFile(resolve(root, 'src/data/publication-sync.json'), 'utf8'));
  if (!config.enabled) return { disabled: true, added: 0 };
  if (!/^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/.test(config.orcid) || !/^\d{4}-\d{2}-\d{2}$/.test(config.fromDate) || !Array.isArray(config.excludeDois)) throw new Error('Invalid publication sync configuration');
  const cachePath = resolve(root, 'src/data/publications-auto.json');
  const previous = JSON.parse(await readFile(cachePath, 'utf8'));
  if (previous.schemaVersion !== 1 || !Array.isArray(previous.publications)) throw new Error('Invalid publication cache');
  const manualDois = new Set();
  for (const file of await readdir(resolve(root, 'content/publications'))) {
    if (!file.endsWith('.md')) continue;
    const text = await readFile(resolve(root, 'content/publications', file), 'utf8');
    const doi = text.match(/^doi:\s*["']?([^\s"']+)/m)?.[1];
    if (!doi) throw new Error(`Missing DOI in manual publication ${file}`);
    manualDois.add(normalizeDoi(doi));
  }
  const excluded = new Set(config.excludeDois.map(normalizeDoi));
  const papers = new Map(previous.publications.map(paper => [normalizeDoi(paper.doi), paper]));
  const today = now.toISOString().slice(0, 10);
  let cursor = '*', added = 0, skipped = 0, complete = false;
  const cursors = new Set();
  for (let page = 0; page < 100; page++) {
    const url = new URL('https://api.crossref.org/works');
    url.search = new URLSearchParams({ filter: `orcid:${config.orcid},from-pub-date:${config.fromDate},type:journal-article`, rows: '100', cursor }).toString();
    const result = await requestJson(url, fetchImpl);
    if (result.status !== 'ok' || !Array.isArray(result.message?.items)) throw new Error('Invalid Crossref response; cached publications preserved');
    const items = result.message.items;
    for (const work of items) {
      const paper = convertWork(work, config, today);
      if (!paper) { skipped++; continue; }
      const doi = normalizeDoi(paper.doi);
      if (manualDois.has(doi) || excluded.has(doi) || papers.has(doi)) continue;
      papers.set(doi, paper);
      added++;
    }
    if (items.length < 100) { complete = true; break; }
    const next = result.message['next-cursor'];
    if (!next || cursors.has(next)) throw new Error('Incomplete Crossref pagination; cached publications preserved');
    cursors.add(next);
    cursor = next;
  }
  if (!complete) throw new Error('Crossref page limit reached; cached publications preserved');
  // Write only after the entire request succeeds. Never remove or overwrite entries.
  if (added) {
    const next = { schemaVersion: 1, publications: [...papers.values()].sort((a, b) => b.date.localeCompare(a.date) || a.doi.localeCompare(b.doi)) };
    await writeFile(cachePath + '.tmp', JSON.stringify(next, null, 2) + '\n');
    await rename(cachePath + '.tmp', cachePath);
  }
  return { added, skipped, totalImported: papers.size, manualPreserved: manualDois.size };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try { console.log(JSON.stringify(await syncPublications(), null, 2)); }
  catch (error) { console.error(`Publication sync failed: ${error.message}. No publication files were changed.`); process.exitCode = 1; }
}
