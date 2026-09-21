import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const script = readFileSync(new URL('../src/scripts/footer-zoom.mjs', import.meta.url), 'utf8').replace('export async function', 'async function');
function fixture({ reduced = false, supported = true, failure = false } = {}) {
  const element = () => ({ style: { removeProperty() { delete this.viewTransitionName; } } });
  const source = element(), target = element(), header = element(), oldMain = element(), newMain = element();
  const root = { dataset: {} }, motion = new EventTarget(), window = new EventTarget();
  motion.matches = reduced;
  let main = oldMain, updates = 0, starts = 0, skips = 0;
  const document = {
    documentElement: root,
    querySelector: selector => selector === 'header' ? header : main,
  };
  let finish;
  if (supported) document.startViewTransition = update => {
    starts++;
    assert.equal(source.style.viewTransitionName, 'footer-word');
    const updateCallbackDone = Promise.resolve().then(update);
    const finished = updateCallbackDone.then(() => new Promise(resolve => { finish = resolve; }));
    return { updateCallbackDone, finished, skipTransition() { skips++; finish?.(); } };
  };
  const run = runInNewContext(script + '\nrunFooterZoom', { document, window });
  return {
    run: (reverse = false) => run({ source, reverse, reducedMotion: motion,
      update() { updates++; if (failure) throw Error('Failed update'); main = newMain; }, target: () => target }),
    source, target, header, oldMain, newMain, root, motion, window,
    counts: () => ({ updates, starts, skips }),
    finish: () => finish(),
    clean() {
      assert.equal(root.dataset.footerZoom, undefined);
      for (const node of [source, target, header, oldMain, newMain]) assert.equal(node.style.viewTransitionName, undefined);
    },
  };
}
const settle = () => new Promise(resolve => setImmediate(resolve));

for (const reverse of [false, true]) test(`footer text zoom ${reverse ? 'out' : 'in'} connects both elements and cleans up`, async () => {
  const f = fixture();
  const result = f.run(reverse);
  await settle();
  assert.equal(f.root.dataset.footerZoom, reverse ? 'out' : 'in');
  assert.equal(f.target.style.viewTransitionName, 'footer-word');
  f.finish(); await result;
  assert.deepEqual(f.counts(), { updates: 1, starts: 1, skips: 0 });
  f.clean();
});

test('reduced motion and browsers without View Transitions navigate once without animation', async () => {
  for (const options of [{ reduced: true }, { supported: false }]) {
    const f = fixture(options); await f.run();
    assert.deepEqual(f.counts(), { updates: 1, starts: 0, skips: 0 }); f.clean();
  }
});

test('resize finishes the transition without repeating navigation', async () => {
  const f = fixture(); const result = f.run(); await settle();
  f.window.dispatchEvent(new Event('resize')); await result;
  assert.deepEqual(f.counts(), { updates: 1, starts: 1, skips: 1 }); f.clean();
  f.window.dispatchEvent(new Event('resize'));
  assert.equal(f.counts().skips, 1);
});

test('a failed page update removes transition state and propagates to normal navigation', async () => {
  const f = fixture({ failure: true });
  await assert.rejects(f.run(), /Failed update/);
  assert.equal(f.counts().updates, 1);
  f.clean();
});
