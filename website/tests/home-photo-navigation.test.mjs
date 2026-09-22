import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const script = readFileSync(new URL('../src/scripts/navigation.js', import.meta.url), 'utf8');
const home = '/site/', team = '/site/team/', profile = '/site/team/david-tilley/';

async function fixture({ kind, menu = false, historyChange = false, reduced = false, researchId = 'solar-fuels' }) {
  const destination = kind === 'research' ? '/site/research/' : kind === 'team' ? team : profile;
  const listeners = {}, windowListeners = {}, animations = [], fetched = [], fallbacks = [];
  const sourceRect = { left: 120, top: 300, width: 400, height: 267, bottom: 567 };
  const targetRect = { left: 50, top: kind === 'research' ? 1800 : 145, width: kind === 'team' ? 1048 : 320, height: kind === 'team' ? 698 : 400, bottom: 843 };
  const sourceImage = element('source-image', sourceRect);
  let main = makeMain(home);
  const footer = element('footer');
  const headerLinks = [link(home), link(team), link('/site/research/'), link('/site/publications/')];
  const footerLinks = [link('/site/contact/'), link('/site/opportunities/')];
  const header = { querySelectorAll: () => headerLinks, getBoundingClientRect: () => ({ height: 80, bottom: 80 }), setAttribute() {}, removeAttribute() {} };
  const motion = { matches: reduced, addEventListener() {}, removeEventListener() {} };
  const location = { pathname: home, href: 'https://example.org' + home, origin: 'https://example.org', protocol: 'https:', assign: url => fallbacks.push(url), reload: () => fallbacks.push('reload') };
  const history = { state: null, pushState(state, unused, url) { this.state = state; location.pathname = url.pathname; } };
  function element(kind, rect = targetRect) {
    return { kind, style: { removeProperty(name) { delete this[name]; } }, children: [],
      getBoundingClientRect: () => rect, decode: async () => {}, scrollIntoView() { this.scrolled = true; },
      setAttribute() {}, removeAttribute() {}, focus() {}, remove() { this.removed = true; },
      append(node) { this.children.push(node); },
      get firstElementChild() { return this.children[0]; }, get lastElementChild() { return this.children.at(-1); },
      replaceWith(node) { if (this.kind === 'main') main = node; },
      querySelector(selector) { return selector === 'main' ? this.children.find(child => child.kind === 'main') : null; },
      querySelectorAll() { return []; }, cloneNode() { return element(this.kind, rect); },
      animate(frames) { animations.push({ kind: this.kind, frames }); return { finished: Promise.resolve(), finish() {}, cancel() {} }; },
    };
  }
  function makeMain(path) {
    const node = element('main');
    const photo = element('destination-image');
    photo.id = `research-${researchId}`;
    if (path === '/site/research/') node.querySelectorAll = selector => selector === '.research-image' ? [element('wrong-image'), photo] : [];
    node.querySelector = selector =>
      (path === profile && selector === '.profile-portrait') || (path === team && selector === '.team-current-photo img') ? photo : null;
    node.cloneNode = () => makeMain(path);
    return node;
  }
  function link(path, marker) {
    return { href: 'https://example.org' + path, target: '', closest() { return this; },
      hasAttribute: name => name === 'data-home-photo' && Boolean(marker),
      getAttribute: name => name === 'data-home-photo' ? marker : null,
      setAttribute() {}, removeAttribute() {}, querySelector: () => sourceImage };
  }
  const document = { title: 'Home', documentElement: { style: { setProperty() {} } }, body: { append() {} },
    createElement: () => element('overlay'),
    querySelector(selector) {
      if (selector === 'header') return header;
      if (selector === 'footer') return footer;
      if (selector === 'main' || selector === 'body > main') return main;
      return null;
    },
    querySelectorAll: () => footerLinks,
    addEventListener(name, handler) { listeners[name] = handler; },
  };
  const window = { scrollY: 600, innerHeight: 1000, innerWidth: 1200,
    addEventListener(name, handler) { windowListeners[name] = handler; }, removeEventListener() {}, scrollTo({ top }) { this.scrollY = top; } };
  runInNewContext(script, { URL, AbortSignal, document, window, location, history, matchMedia: () => motion,
    ResizeObserver: class { observe() {} }, initializeExternalLinks() {}, initializeHeroVideo() {}, setTimeout, clearTimeout,
    fetch: async path => { fetched.push(path); return { ok: true, text: async () => path }; },
    DOMParser: class { parseFromString(path) { return { title: path, querySelector: selector => selector === 'footer' ? footer : makeMain(path) }; } },
  });
  if (historyChange) {
    location.pathname = destination; location.href = location.origin + destination;
    windowListeners.popstate();
  } else {
    const href = destination + (kind === 'research' && !menu ? `#research-${researchId}` : '');
    listeners.click({ target: link(href, menu ? null : kind), button: 0, preventDefault() {} });
  }
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(fallbacks, []);
  assert.equal(location.pathname, destination);
  assert.equal(sourceImage.style.visibility, undefined);
  return { animations, fetched, sourceRect, targetRect, scrollY: window.scrollY };
}
for (const researchId of ['solar-fuels', 'characterization', 'electrosynthesis']) {
  test(`homepage research figure zooms to the matching ${researchId} section`, async () => {
    const f = await fixture({ kind: 'research', researchId });
    const zoom = f.animations.find(item => item.kind === 'destination-image');
    assert(zoom);
    assert.equal(zoom.frames[1].objectPosition, '50% 50%');
    assert(f.scrollY > 0, 'navigation must land at the research figure, not the page top');
    assert.deepEqual(f.fetched, ['/site/research/']);
  });
}
test('research figure links still navigate when reduced motion is enabled', async () => {
  assert.equal((await fixture({ kind: 'research', reduced: true })).animations.length, 0);
});
test('Research menu retains the horizontal transition', async () => {
  const f = await fixture({ kind: 'research', menu: true });
  assert(!f.animations.some(item => item.kind === 'destination-image'));
  assert(f.animations.some(item => item.frames.some(frame => frame.transform?.includes('translateX'))));
});

for (const kind of ['profile', 'team']) {
  test(`homepage ${kind} photo zooms directly into its matching destination image`, async () => {
    const f = await fixture({ kind });
    const zoom = f.animations.find(item => item.kind === 'destination-image');
    assert(zoom);
    assert.equal(zoom.frames[0].left, f.sourceRect.left + 'px');
    assert.equal(zoom.frames[1].width, f.targetRect.width + 'px');
    assert.equal(f.fetched.length, 1, 'photo zoom must not load intermediate pages');
    assert(!f.animations.some(item => item.frames.some(frame => frame.transform?.includes('translateX'))));
  });
  test(`homepage ${kind} photo respects reduced motion`, async () => {
    assert.equal((await fixture({ kind, reduced: true })).animations.length, 0);
  });
}
for (const options of [{ menu: true }, { historyChange: true }]) {
  test(`Team ${options.menu ? 'menu link' : 'browser history'} retains the horizontal transition`, async () => {
    const f = await fixture({ kind: 'team', ...options });
    assert(!f.animations.some(item => item.kind === 'destination-image'));
    assert(f.animations.some(item => item.frames.some(frame => frame.transform?.includes('translateX'))));
  });
}
