import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, cp, symlink, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

test('Markdown updates drive the real static build', async t => {
  const root = resolve('.');
  const fixture = await mkdtemp(join(tmpdir(), 'tilley-content-test-'));
  try {
    for (const name of ['src', 'content', 'astro.config.mjs', 'package.json', 'tsconfig.json']) {
      await cp(join(root, name), join(fixture, name), { recursive: true });
    }
    await symlink(join(root, 'node_modules'), join(fixture, 'node_modules'), process.platform === 'win32' ? 'junction' : 'dir');
    await cp(join(root, 'public'), join(fixture, 'public'), { recursive: true });
    // Controlled test profiles: ordinary edits to the real roster must not break tests.
    await rm(join(fixture, 'content/people'), { recursive: true });
    await mkdir(join(fixture, 'content/people'));
    await mkdir(join(fixture, 'public/people'), { recursive: true });
    await writeFile(join(fixture, 'public/people/test.png'), Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64'));
    await writeFile(join(fixture, 'content/people/test-current.md'),
      '---\nname: "Fixture Current"\nrole: postdoc\nstatus: "current"\nphoto: people/test.png\nthesis: ""\n---\n');
    await writeFile(join(fixture, 'content/people/test-alumni.md'),
      '---\nname: "Fixture Alumni"\nrole: postdoc\nstatus: alumni\nthesis: "https://example.org/alumni-thesis"\n---\n');
    await rm(join(fixture, 'content/news'), { recursive: true });
    await mkdir(join(fixture, 'content/news/archive'), { recursive: true });
    for (const [id, title, date, draft] of [
      ['latest', 'Latest fixture news', '2026-09-24', false],
      ['archive/older', 'Older fixture news', '2026-09-20', false],
      ['hidden', 'Unpublished fixture news', '2026-09-25', true],
    ]) {
      await writeFile(join(fixture, `content/news/${id}.md`),
        `---\ntitle: "${title}"\ndate: "${date}"\nsummary: "Summary for ${title}"\ndraft: ${draft}\n---\n\nFull article with **unique news body**.\n`);
    }
    function build() {
      return spawnSync(process.execPath, [join(root, 'node_modules/astro/bin/astro.mjs'), 'build'], {
        cwd: fixture,
        env: { ...process.env, ASTRO_TELEMETRY_DISABLED: '1', SITE_URL: 'https://example.github.io', BASE_PATH: '/test-repository' },
        encoding: 'utf8', timeout: 90000,
      });
    }
    function successful(result) { assert.equal(result.status, 0, result.stdout + result.stderr); }
    const page = () => readFile(join(fixture, 'dist/team/index.html'), 'utf8');
    const personPath = join(fixture, 'content/people/test-current.md');
    const original = await readFile(personPath, 'utf8');

    await t.test('baseline has portraits and correct GitHub project media paths', async () => {
      successful(build());
      const html = await page();
      const memberCards = (html.match(/<article\b[^>]*data-person="[^"]+"[\s\S]*?<\/article>/g) || []).join('');
      assert.equal((memberCards.match(/<img\b/g) || []).length, 1);
      assert.match(html, /src="\/test-repository\/people\/test\.png"/);
      const home = await readFile(join(fixture, 'dist/index.html'), 'utf8');
      assert.match(home, /src="\/test-repository\/media\//);
      assert.match(home, /poster="\/test-repository\/media\/lab-poster.jpg"/);
      assert.match(home, /src="\/test-repository\/media\/lab-light-on.mp4" type="video\/mp4"/);
      assert.match(home, /class="video-play"/);
      assert.doesNotMatch(html, /<video/);
      assert.match(home, /src="\/test-repository\/media\/group-2025-display\.webp"/);
      assert.doesNotMatch(home, /src="[^"]*people\/test\.png"/);
      const header = home.match(/<header>[\s\S]*?<\/header>/)[0];
      const footer = home.match(/<footer>[\s\S]*?<\/footer>/)[0];
      assert.doesNotMatch(header, /\/(?:opportunities|contact)\//);
      assert.match(footer, />Opportunities<\/a>/);
      assert.match(footer, />Contacts<\/a>/);
      assert.match(footer, />Contacts<\/a><a[^>]+href="\/test-repository\/">Home<\/a><a[^>]+href="#top">/);
      const contacts = await readFile(join(fixture, 'dist/contact/index.html'), 'utf8');
      assert.match(contacts, /<title>Contacts \|/);
      assert.match(contacts, /<h1><span data-footer-title>Contacts<\/span><\/h1>/);
      assert.match(contacts, /data-footer-back/);
      for (const id of ['research','team','publications','lab-tour','opportunities','contact']) {
        const route = await readFile(join(fixture, `dist/${id}/index.html`), 'utf8');
        const routeFooter = route.match(/<footer>[\s\S]*?<\/footer>/)?.[0];
        assert.equal(routeFooter?.replace(/ aria-current="page"/g, ''), footer);
        assert.match(route, new RegExp(`href="/test-repository/${id}/" aria-current="page"`));
        assert.equal((route.match(/<h1[ >]/g) || []).length, 1);
      }
      assert.match(html, /<article[^>]*data-person="test-current"/);
      const tour = await readFile(join(fixture, 'dist/lab-tour/index.html'), 'utf8');
      assert.match(tour, /<h2 id="equipment-synthetic">Synthetic Equipment<\/h2>/);
      assert.match(tour, /<h2 id="equipment-analytical">Analytical Devices<\/h2>/);
      assert.match(tour, /src="\/test-repository\/media\/equipment\//);
      assert.match(tour, /Shared Facilities/);
      assert.match(html, /<li[^>]*data-person="test-alumni"/);
      assert.match(html, /href="https:\/\/example.org\/alumni-thesis"/);
    });
    await t.test('news summaries link to full articles, including nested posts, and drafts have no page', async () => {
      const listing = await readFile(join(fixture, 'dist/news/index.html'), 'utf8');
      const home = await readFile(join(fixture, 'dist/index.html'), 'utf8');
      assert.ok(listing.indexOf('Latest fixture news') < listing.indexOf('Older fixture news'));
      for (const html of [listing, home]) {
        assert.match(html, /href="\/test-repository\/news\/latest\/"/);
        assert.match(html, /href="\/test-repository\/news\/archive\/older\/"/);
        assert.doesNotMatch(html, /unique news body|Unpublished fixture news/);
      }
      for (const id of ['latest', 'archive/older']) {
        const article = await readFile(join(fixture, `dist/news/${id}/index.html`), 'utf8');
        assert.match(article, /<strong>unique news body<\/strong>/);
        assert.match(article, /href="\/test-repository\/news\/"[^>]*>← All news<\/a>/);
        assert.match(article, /href="\/test-repository\/news\/" aria-current="location"/);
        assert.equal((article.match(/<h1[ >]/g) || []).length, 1);
        assert.match(article, /<meta name="description" content="Summary for /);
        assert.match(article, /<title>(Latest|Older) fixture news \|/);
        assert.ok(article.indexOf('class="news-post-body"') < article.indexOf('class="summary-link news-back"'));
        assert.match(article, /<h1 data-news-heading/);
      }
      await assert.rejects(readFile(join(fixture, 'dist/news/hidden/index.html'), 'utf8'));
    });
    await t.test('automatic publications render and the off switch restores the manual page', async () => {
      const configPath = join(fixture, 'src/data/publication-sync.json');
      const cachePath = join(fixture, 'src/data/publications-auto.json');
      const originalConfig = await readFile(configPath, 'utf8');
      const originalCache = await readFile(cachePath, 'utf8');
      const publicationPath = join(fixture, 'dist/publications/index.html');
      await writeFile(configPath, JSON.stringify({ ...JSON.parse(originalConfig), enabled: false }));
      successful(build());
      const manualPage = await readFile(publicationPath, 'utf8');
      await writeFile(cachePath, JSON.stringify({ schemaVersion: 1, publications: [{
        title: 'Fixture automatic publication', authors: 'Fixture Author', journal: 'Fixture Journal, 2026.',
        year: 2026, date: '2026-09-01', doi: 'https://doi.org/10.1234/fixture-auto',
      }] }));
      await writeFile(configPath, JSON.stringify({ ...JSON.parse(originalConfig), enabled: true }));
      successful(build());
      assert.match(await readFile(publicationPath, 'utf8'), /Fixture automatic publication/);
      assert.match(await readFile(join(fixture, 'dist/index.html'), 'utf8'), /Fixture automatic publication/);
      await writeFile(configPath, JSON.stringify({ ...JSON.parse(originalConfig), enabled: false }));
      successful(build());
      assert.equal(await readFile(publicationPath, 'utf8'), manualPage);
      await writeFile(configPath, originalConfig);
      await writeFile(cachePath, originalCache);
    });
    await t.test('status transition, new member, Markdown body, and draft exclusion', async () => {
      await writeFile(personPath, original.replace('status: "current"', 'status: "alumni"'));
      await writeFile(join(fixture, 'content/people/test-member.md'),
        '---\nname: "Test Member"\nrole: postdoc\nstatus: current\norder: 99\nthesis: "https://example.org/member-thesis"\n---\n\nResearch in **solar fuels**.\n');
      await writeFile(join(fixture, 'content/people/test-draft.md'),
        '---\nname: "Unpublished Profile"\nrole: postdoc\nstatus: current\ndraft: true\n---\n');
      successful(build());
      const html = await page();
      assert.doesNotMatch(html, /<article[^>]*data-person="test-current"/);
      assert.match(html, /<li[^>]*data-person="test-current"/);
      assert.match(html, /<article[^>]*data-person="test-member"/);
      assert.doesNotMatch(html, /<strong>solar fuels<\/strong>/);
      assert.match(html, /href="\/test-repository\/team\/test-member\/"/);
      const profile = await readFile(join(fixture, 'dist/team/test-member/index.html'), 'utf8');
      const home = await readFile(join(fixture, 'dist/index.html'), 'utf8');
      assert.equal(profile.match(/<footer>[\s\S]*?<\/footer>/)?.[0], home.match(/<footer>[\s\S]*?<\/footer>/)?.[0]);
      assert.match(profile, /<strong>solar fuels<\/strong>/);
      assert.match(profile, /href="https:\/\/example.org\/member-thesis"/);
      assert.match(profile, /href="\/test-repository\/team\/"/);
      await assert.rejects(readFile(join(fixture, 'dist/team/test-draft/index.html'), 'utf8'));
      assert.doesNotMatch(html, /Unpublished Profile/);
    });
    await t.test('typos in status fail validation', async () => {
      await writeFile(personPath, original.replace('status: "current"', 'status: "alumnni"'));
      const result = build();
      assert.notEqual(result.status, 0);
      assert.match(result.stdout + result.stderr, /status/);
    });
    await t.test('invalid thesis links fail validation', async () => {
      await writeFile(personPath, original.replace('thesis: ""', 'thesis: "not-a-url"'));
      const result = build();
      assert.notEqual(result.status, 0);
      assert.match(result.stdout + result.stderr, /thesis/);
    });
    await t.test('missing portrait fails before publication', async () => {
      await writeFile(personPath, original.replace('people/test.png', 'people/missing-photo.webp'));
      const result = build();
      assert.notEqual(result.status, 0);
      assert.match(result.stdout + result.stderr, /Missing asset: public\/people\/missing-photo.webp/);
    });
  } finally {
    // Only the disposable fixture created above is removed; source files stay untouched.
    await rm(fixture, { recursive: true, force: true });
  }
});
