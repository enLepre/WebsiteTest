import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const script = readFileSync(new URL('../src/scripts/footer-scroll.mjs', import.meta.url), 'utf8').replace('export async function', 'async function');
function fixture({ reduced = false, supported = true, failure = false } = {}) {
  const motion = new EventTarget(), window = new EventTarget(), animations = [], overlays = [];
  motion.matches = reduced; window.innerHeight = 800;
  let updates = 0;
  function element() {
    return { style: {}, children: [], append(node) { this.children.push(node); }, setAttribute() {},
      remove() { this.removed = true; }, cloneNode: element,
      getBoundingClientRect: () => ({ top: updates ? 80 : -1200, left: 0, width: 1200, height: 1800 }),
      animate(frames, timing) {
        let resolve;
        const animation = { frames, timing, finished: new Promise(done => { resolve = done; }),
          finish() { this.finishes = (this.finishes || 0) + 1; resolve(); }, cancel() { this.cancelled = true; } };
        animations.push(animation); return animation;
      },
    };
  }
  const document = { documentElement: { animate: supported ? () => {} : undefined },
    body: { append: node => overlays.push(node) }, createElement: element,
    querySelector: selector => selector === 'header' ? { getBoundingClientRect: () => ({ bottom: 80 }) } : element() };
  const run = runInNewContext(script + '\nrunFooterScroll', { document, window });
  return { motion, window, animations, overlays, updates: () => updates,
    run: reverse => run({ reverse, reducedMotion: motion, update() { updates++; if (failure) throw Error('Failed update'); } }),
  };
}
for (const reverse of [false, true]) test(`footer scroll ${reverse ? 'back' : 'forward'} moves complete pages in opposite directions below the header`, async () => {
  const f = fixture(); const result = f.run(reverse);
  assert.equal(f.overlays[0].style.top, '80px');
  assert.equal(f.overlays[0].inert, true);
  assert.equal(f.overlays[0].children.length, 2);
  // Each panel contains both the main content and footer, at their actual scroll positions.
  assert.equal(f.overlays[0].children[0].children.length, 2);
  assert.equal(f.overlays[0].children[0].children[0].style.top, '-1280px');
  assert.equal(f.overlays[0].children[1].children[0].style.top, '0px');
  assert.equal(f.animations[0].frames[1].transform, `translateY(${reverse ? 720 : -720}px)`);
  assert.equal(f.animations[1].frames[0].transform, `translateY(${reverse ? -720 : 720}px)`);
  f.animations.forEach(animation => animation.finish()); await result;
  assert.equal(f.updates(), 1);
  assert(f.overlays[0].removed);
  assert(f.animations.every(animation => animation.cancelled));
});
test('reduced motion and unsupported animation navigate once without an overlay', async () => {
  for (const options of [{ reduced: true }, { supported: false }]) {
    const f = fixture(options); await f.run(false);
    assert.equal(f.updates(), 1); assert.equal(f.overlays.length, 0);
  }
});
test('resizing finishes the scroll and removes event listeners', async () => {
  const f = fixture(); const result = f.run(false);
  f.window.dispatchEvent(new Event('resize')); await result;
  assert.equal(f.updates(), 1); assert(f.overlays[0].removed);
  f.window.dispatchEvent(new Event('resize'));
  assert(f.animations.every(animation => animation.finishes === 1));
});
test('a failed page update removes the overlay and falls back to ordinary navigation', async () => {
  const f = fixture({ failure: true }); await assert.rejects(f.run(false), /Failed update/);
  assert.equal(f.updates(), 1); assert(f.overlays[0].removed);
});
