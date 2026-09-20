import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { convertWork, syncPublications } from '../scripts/sync-publications.mjs';
import { mergePublications } from '../src/lib/publications.mjs';

const config = { enabled: true, orcid: '0000-0002-7542-1147', fromDate: '2026-01-01', excludeDois: [] };
const work = (doi = '10.1234/new') => ({ DOI: doi, title: ['New <i>research</i> &amp; results'], type: 'journal-article',
  author: [{ given: 'David', family: 'Tilley', ORCID: `https://orcid.org/${config.orcid}` }],
  'container-title': ['Test Journal'], published: { 'date-parts': [[2026, 2, 3]] }, volume: '12', page: '1–5' });
const now = new Date('2026-09-20T00:00:00Z');
const response = (items, cursor) => ({ ok: true, json: async () => ({ status: 'ok', message: { items, 'next-cursor': cursor } }) });

async function fixture(t, override = {}) {
  const root = await mkdtemp(join(tmpdir(), 'publication-sync-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, 'src/data'), { recursive: true });
  await mkdir(join(root, 'content/publications'), { recursive: true });
  await writeFile(join(root, 'src/data/publication-sync.json'), JSON.stringify({ ...config, ...override }));
  await writeFile(join(root, 'src/data/publications-auto.json'), JSON.stringify({ schemaVersion: 1, publications: [] }));
  await writeFile(join(root, 'content/publications/original.md'), '---\ntitle: "Original wording"\ndoi: "https://doi.org/10.1234/EXISTING"\n---\nManually written note.\n');
  return root;
}

test('accepts only dated journal articles explicitly linked to the verified ORCID', () => {
  const converted = convertWork(work(), config, '2026-09-20');
  assert.equal(converted.title, 'New research & results');
  assert.equal(converted.year, 2026);
  for (const change of [
    { author: [{ given: 'David', family: 'Tilley' }] },
    { author: [{ ORCID: 'https://orcid.org/0000-0000-0000-0000' }] },
    { type: 'posted-content' }, { 'update-to': [{ type: 'correction' }] },
    { published: { 'date-parts': [[2025]] } }, { published: { 'date-parts': [[2027]] } },
    { published: { 'date-parts': [[2026, 2, 30]] } }, { title: [] }, { DOI: 'bad' },
  ]) assert.equal(convertWork({ ...work(), ...change }, config, '2026-09-20'), null);
});

test('sync is additive, deduplicated, and leaves the manual files byte-for-byte intact', async t => {
  const root = await fixture(t);
  const original = await readFile(join(root, 'content/publications/original.md'), 'utf8');
  const result = await syncPublications({ root, now, fetchImpl: async url => {
    assert.match(url.searchParams.get('filter'), /orcid:0000-0002-7542-1147/);
    return response([work(), work('10.1234/NEW'), work('10.1234/existing')]);
  } });
  assert.equal(result.added, 1);
  const cache = await readFile(join(root, 'src/data/publications-auto.json'), 'utf8');
  await syncPublications({ root, now, fetchImpl: async () => response([]) });
  assert.equal(await readFile(join(root, 'src/data/publications-auto.json'), 'utf8'), cache);
  assert.equal(await readFile(join(root, 'content/publications/original.md'), 'utf8'), original);
});

test('disabled sync makes no network request and exclusions are respected', async t => {
  const root = await fixture(t, { enabled: false });
  assert.equal((await syncPublications({ root, now, fetchImpl: () => assert.fail('must not fetch') })).disabled, true);
  const enabled = await fixture(t, { excludeDois: ['https://doi.org/10.1234/new'] });
  assert.equal((await syncPublications({ root: enabled, now, fetchImpl: async () => response([work()]) })).added, 0);
});

test('pagination follows cursors and a partial failure never writes the cache', async t => {
  const root = await fixture(t);
  let calls = 0;
  await syncPublications({ root, now, fetchImpl: async url => {
    calls++;
    if (calls === 1) return response(Array(100).fill(work()), 'page2');
    assert.equal(url.searchParams.get('cursor'), 'page2');
    return response([work('10.1234/second')]);
  } });
  assert.equal(calls, 2);
  const cache = await readFile(join(root, 'src/data/publications-auto.json'), 'utf8');
  calls = 0;
  await assert.rejects(syncPublications({ root, now, fetchImpl: async () => ++calls === 1
    ? response(Array(100).fill(work('10.1234/uncommitted')), 'page2')
    : { ok: true, json: async () => ({ status: 'error' }) } }), /Invalid Crossref/);
  assert.equal(await readFile(join(root, 'src/data/publications-auto.json'), 'utf8'), cache);
});

test('rollback restores the original list and manual drafts suppress automatic duplicates', () => {
  const originals = [
    { id: 'a', data: { title: 'Manual title', doi: 'https://doi.org/10.1234/new', year: 2026, number: 2, order: 1 } },
    { id: 'b', data: { doi: 'https://doi.org/10.1234/old', year: 2025, number: 1, order: 2 } },
    { id: 'hidden', data: { doi: 'https://doi.org/10.1234/hidden', year: 2026, draft: true } },
  ];
  const automatic = ['new', 'hidden', 'extra'].map(id => convertWork(work(`10.1234/${id}`), config, '2026-09-20'));
  assert.deepEqual(mergePublications(originals, automatic, { ...config, enabled: false }), originals.slice(0, 2));
  const combined = mergePublications(originals, automatic, config);
  assert.equal(combined.length, 3);
  assert.equal(combined[0].data.doi, 'https://doi.org/10.1234/extra');
  assert.equal(combined[1].data.title, 'Manual title');
  assert.deepEqual(mergePublications(originals, automatic, { ...config, excludeDois: ['10.1234/extra'] }), originals.slice(0, 2));
});
