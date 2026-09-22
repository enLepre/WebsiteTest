import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

test('footer links, Back, browser Back/Forward, and nested footer visits restore the right page', async () => {
  const base = 'https://example.org';
  const home = '/site/', contacts = '/site/contact/', opportunities = '/site/opportunities/';
  const listeners = {}, windowListeners = {}, transitions = [], fallbacks = [];
  const link = (path, text, attributes = []) => ({ _href: base + path,
    get href() { return this._href; }, set href(value) { this._href = new URL(value, base).href; }, textContent: text, target: '',
    hasAttribute: name => attributes.includes(name), setAttribute() {}, removeAttribute() {},
    closest() { return this; }, scrollIntoView() {} });
  const main = (title = null) => ({ title, style: {}, focus() {},
    querySelector: () => null, cloneNode() { return main(this.title); },
    replaceWith(node) { document.main = node; } });
  const footer = () => ({ links: [link(opportunities, 'Opportunities', ['data-footer-link']), link(contacts, 'Contacts', ['data-footer-link'])],
    cloneNode: footer, replaceWith(node) { document.footer = node; } });
  const headerLinks = [link(home, 'Home'), link('/site/team/', 'Team')];
  const header = { querySelectorAll: () => headerLinks, getBoundingClientRect: () => ({ height: 80 }), setAttribute() {}, removeAttribute() {} };
  const location = { href: base + home, pathname: home, protocol: 'https:', origin: base,
    assign: url => fallbacks.push(url), reload: () => fallbacks.push('reload') };
  const document = { title: 'Home', main: main(), footer: footer(), documentElement: { style: { setProperty() {} } },
    querySelector(selector) {
      if (selector === 'header') return header;
      if (selector === 'footer') return this.footer;
      if (selector === '[data-footer-title]') return this.main.title;
      if (selector === '[data-footer-back]') return this.main.title ? (this.back ||= link(home, 'Back', ['data-footer-back'])) : null;
      if (selector === 'main video') return null;
      return this.main;
    },
    querySelectorAll: () => document.footer.links,
    addEventListener: (name, handler) => { listeners[name] = handler; },
  };
  const window = { scrollY: 720, addEventListener: (name, handler) => { windowListeners[name] = handler; }, removeEventListener() {},
    scrollTo({ top }) { this.scrollY = top; } };
  let entries = [{ url: home, state: null }], index = 0;
  function setLocation(path) { location.pathname = path; location.href = base + path; }
  const history = { state: null,
    pushState(state, unused, url) {
      entries = entries.slice(0, index + 1); entries.push({ url: url.pathname, state }); index++;
      this.state = state; setLocation(url.pathname);
    },
    back() { index--; this.state = entries[index].state; setLocation(entries[index].url); windowListeners.popstate(); },
    forward() { index++; this.state = entries[index].state; setLocation(entries[index].url); windowListeners.popstate(); },
  };
  const motion = { matches: false, addEventListener() {}, removeEventListener() {} };
  runInNewContext(readFileSync(new URL('../src/scripts/navigation.js', import.meta.url), 'utf8'), {
    URL, AbortSignal, document, window, location, history, matchMedia: () => motion,
    ResizeObserver: class { observe() {} }, initializeExternalLinks() {}, initializeHeroVideo() {},
    setTimeout, clearTimeout,
    fetch: async path => ({ ok: true, text: async () => path }),
    DOMParser: class { parseFromString(path) {
      const heading = { textContent: path === contacts ? 'Contacts' : 'Opportunities', style: {} };
      return { title: heading.textContent, querySelector: selector => selector === 'footer' ? footer() : main(heading) };
    } },
    runFooterScroll: async options => {

      options.update();
      transitions.push({ reverse: options.reverse });
    },
  });
  const settle = () => new Promise(resolve => setImmediate(resolve));
  async function click(item) { listeners.click({ target: item, button: 0, preventDefault() {} }); await settle(); }
  const footerLink = path => document.footer.links.find(item => new URL(item.href).pathname === path);

  await click(footerLink(contacts));
  assert.equal(location.pathname, contacts);
  assert.equal(document.back.href, base + home);
  assert.deepEqual(transitions.at(-1), { reverse: false });
  assert.equal(window.scrollY, 0);
  await click(document.back);
  assert.equal(location.pathname, home);
  assert.equal(window.scrollY, 720);
  assert.deepEqual(transitions.at(-1), { reverse: true });
  history.forward(); await settle();
  assert.equal(location.pathname, contacts);
  assert.equal(transitions.at(-1).reverse, false);
  window.scrollY = 120;
  await click(footerLink(opportunities));
  assert.equal(location.pathname, opportunities);
  assert.equal(document.back.href, base + contacts);
  history.back(); await settle();
  assert.equal(location.pathname, contacts);
  assert.equal(window.scrollY, 120);
  assert.deepEqual(transitions.at(-1), { reverse: true });
  await click(document.back);
  assert.equal(location.pathname, home);
  assert.equal(window.scrollY, 720);
  // Choosing a menu page also slides down, but starts at its top instead of
  // borrowing the saved scroll position that belongs to the Back action.
  for (const path of [contacts, opportunities]) {
    for (const target of headerLinks) {
      window.scrollY = 360;
      await click(footerLink(path));
      const count = transitions.length;
      await click(target);
      assert.equal(location.pathname, new URL(target.href).pathname);
      assert.equal(transitions.length, count + 1);
      assert.equal(transitions.at(-1).reverse, true);
      assert.equal(window.scrollY, 0);
    }
  }
  assert.deepEqual(fallbacks, []);
});
