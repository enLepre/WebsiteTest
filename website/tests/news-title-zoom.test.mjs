import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const script = readFileSync(new URL('../src/scripts/news-title-zoom.mjs', import.meta.url), 'utf8').replace('export async function', 'async function');
async function fixture({ returning = false, reduced = false, absent = false, fail = false, interrupt = false, ready = true } = {}) {
  const animations = [], elements = [], listeners = new Map();
  let sourceScrolled = false;
  const source = element('source', { left: 60, top: returning ? -400 : 200, bottom: returning ? -340 : 230, width: returning ? 700 : 350, height: 60 });
  const target = element('target', { left: 40, top: returning ? 1300 : 150, bottom: returning ? 1330 : 210, width: returning ? 350 : 700, height: 60 });
  const main = element('main');
  const motion = { matches: reduced, addEventListener: (name, fn) => listeners.set('motion', fn), removeEventListener: () => listeners.delete('motion') };
  function element(kind, rect = {}) {
    const node = { kind, textContent: 'A news title spanning multiple words', style: { removeProperty(name) { delete this[name]; } },
      getBoundingClientRect: () => rect, setAttribute() {}, append() {}, remove() { this.removed = true; },
      scrollIntoView() { sourceScrolled = true; rect.top = 200; rect.bottom = 260; },
      animate(frames, options) {
        const cover = elements.find(item => item.className?.includes('news-journey'));
        const item = { kind, frames, options,
          duringMotion: { incomingOpacity: main.style.opacity, outgoingCover: cover?.style.background, coverVisibility: cover?.style.visibility },
          cancel() { this.cancelled = true; }, finish() { this.finishedEarly = true; this.resolve?.(); } };
        item.finished = fail ? Promise.reject(new Error('animation interrupted')) : interrupt ? new Promise(resolve => { item.resolve = resolve; }) : Promise.resolve();
        animations.push(item); return item;
      },
    };
    elements.push(node); return node;
  }
  const window = { innerHeight: 900, addEventListener: (name, fn) => { listeners.set(name, fn); if (interrupt) queueMicrotask(fn); }, removeEventListener: name => listeners.delete(name) };
  const context = { document: { createElement: () => element('overlay'), body: { append() {} } }, window,
    getComputedStyle: node => ({ fontFamily: 'Georgia', fontWeight: '400', fontSize: node === source ? (returning ? '54px' : '27px') : (returning ? '27px' : '54px'), lineHeight: '60px', letterSpacing: 'normal', color: 'rgb(32, 33, 37)' }),
    setTimeout, clearTimeout,
  };
  runInNewContext(script + '\nthis.zoom = runNewsTitleZoom;', context);
  const operation = context.zoom({ source: absent ? null : source, target, destinationMain: main, header: { getBoundingClientRect: () => ({ bottom: 80 }) }, reducedMotion: motion, scrollY: 0, returning, prepareMedia: async () => { if (!ready) motion.matches = true; } });
  let scroll;
  if (fail) await assert.rejects(operation, /animation interrupted/);
  else scroll = await operation;
  assert.equal(source.style.visibility, undefined);
  assert.equal(target.style.visibility, undefined);
  assert.equal(main.style.opacity, undefined, 'destination content must be restored after the zoom');
  assert.equal(listeners.size, 0);
  assert.ok(animations.every(item => item.cancelled));
  assert.ok(elements.filter(item => item.className?.includes('news-journey')).every(item => item.removed));
  return { animations, scroll, sourceScrolled };
}
test('news title grows from listing typography into article typography', async () => {
  const result = await fixture();
  assert.equal(result.animations[0].frames[0].fontSize, '27px');
  assert.equal(result.animations[0].frames[1].fontSize, '54px');
});
test('returning reveals an offscreen article title and shrinks it into the listing', async () => {
  const result = await fixture({ returning: true });
  assert.equal(result.sourceScrolled, true);
  assert.ok(result.scroll > 0);
  assert.equal(result.animations[0].frames[0].fontSize, '54px');
  assert.equal(result.animations[0].frames[1].fontSize, '27px');
});
test('opening and returning show only the title until the zoom completes', async () => {
  for (const returning of [false, true]) {
    const result = await fixture({ returning, interrupt: true });
    assert.equal(result.animations.length, 1, 'page content must not fade in during the title zoom');
    assert.deepEqual(result.animations[0].duringMotion, {
      incomingOpacity: '0', outgoingCover: '#fff', coverVisibility: 'visible',
    });
  }
});
test('reduced motion and missing homepage titles skip the zoom', async () => {
  for (const options of [{ reduced: true }, { absent: true }, { ready: false }]) assert.equal((await fixture(options)).animations.length, 0);
});
test('resize finishes the title animation and removes temporary elements', async () => { await fixture({ interrupt: true }); });
test('animation failure restores both titles and cleans up the overlay', async () => { await fixture({ fail: true }); });
