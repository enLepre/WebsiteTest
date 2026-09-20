import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';

// Discover generated routes, including individual member pages.
async function routes(dir = '') {
  const found = [];
  for (const item of await readdir(resolve('dist', dir), { withFileTypes: true })) {
    const relative = dir ? `${dir}/${item.name}` : item.name;
    if (item.isDirectory()) found.push(...await routes(relative));
    else if (item.name === 'index.html') found.push({ route: dir, input: relative, output: dir ? `${dir.replaceAll('/', '-')}.html` : 'index.html' });
  }
  return found;
}
const pages = await routes();
if (new Set(pages.map(p => p.output)).size !== pages.length) throw new Error('Offline route filename collision');
await mkdir('offline', { recursive: true });
const cache = new Map();
for (const page of pages) {
  let html = await readFile(resolve('dist', page.input), 'utf8');
  const homeHref = html.match(/<a[^>]*class="brand"[^>]*href="([^"]+)"/)?.[1];
  if (!homeHref) throw new Error(`Cannot locate home link in ${page.input}`);
  for (const target of pages) {
    const url = `${homeHref}${target.route ? target.route + '/' : ''}`;
    html = html.split(`href="${url}"`).join(`href="${target.output}"`);
  }
  for (const source of new Set([...html.matchAll(/src="([^"]+)"/g)].map(m => m[1]))) {
    const match = source.match(/(?:^|\/)((?:people|media)\/[a-zA-Z0-9_.\/-]+)$/);
    if (!match) continue;
    const assetPath = match[1];
    if (assetPath.split('/').includes('..')) throw new Error(`Invalid media path: ${assetPath}`);
    const types = {webp:'image/webp',jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webm:'video/webm',mp4:'video/mp4'};
    const mime = types[assetPath.split('.').pop()];
    if (!mime) throw new Error(`Unsupported offline asset: ${assetPath}`);
    if (!cache.has(assetPath)) {
      const bytes = await readFile(resolve('dist', assetPath));
      cache.set(assetPath, `data:${mime};base64,${bytes.toString('base64')}`);
    }
    html = html.split(`src="${source}"`).join(`src="${cache.get(assetPath)}"`);
  }
  await writeFile(resolve('offline', page.output), html);
  if (!page.route) {
    let legacy = html;
    for (const target of pages) legacy = legacy.split(`href="${target.output}"`).join(`href="offline/${target.output}"`);
    await writeFile('offline-preview.html', legacy);
  }
}
console.log(`Saved ${pages.length} offline pages, including member profiles. Open offline/index.html; keep the folder together.`);
