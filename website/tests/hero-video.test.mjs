import test from 'node:test';
import assert from 'node:assert/strict';
import { initializeHeroVideo } from '../src/scripts/hero-video.mjs';

const settle = () => new Promise(resolve => setImmediate(resolve));
function fixture({ reduced = false, reject = false } = {}) {
  const video = new EventTarget();
  Object.assign(video, { paused: true, calls: 0, reject, getBoundingClientRect: () => ({ top: 80, bottom: 560 }) });
  video.play = () => {
    video.calls++;
    if (video.reject) return Promise.reject(new Error('Autoplay blocked'));
    video.paused = false;
    video.dispatchEvent(new Event('playing'));
    return Promise.resolve();
  };
  video.pause = () => {
    if (!video.paused) { video.paused = true; video.dispatchEvent(new Event('pause')); }
  };
  const button = Object.assign(new EventTarget(), { hidden: true });
  const motion = Object.assign(new EventTarget(), { matches: reduced });
  const document = Object.assign(new EventTarget(), { hidden: false });
  const window = Object.assign(new EventTarget(), { innerHeight: 800 });
  let visibility;
  let disconnected = false;
  class Observer {
    constructor(callback) { visibility = value => callback([{ isIntersecting: value }]); }
    observe() {}
    disconnect() { disconnected = true; }
  }
  const cleanup = initializeHeroVideo(video, button, motion, { document, window, IntersectionObserver: Observer });
  return { video, button, motion, document, window, cleanup, visible: value => visibility(value), disconnected: () => disconnected };
}

test('direct Home visit starts without waiting for a navigation or observer callback', async () => {
  const f = fixture();
  assert.equal(f.video.calls, 1);
  assert.equal(f.video.muted, true);
  assert.equal(f.video.defaultMuted, true);
  assert.equal(f.video.playsInline, true);
  assert.equal(f.video.preload, 'auto');
  await settle();
  assert.equal(f.button.hidden, true);
  f.cleanup();
});

test('blocked autoplay exposes a button and retries when media becomes ready', async () => {
  const f = fixture({ reject: true });
  await settle();
  assert.equal(f.button.hidden, false);
  f.video.reject = false;
  f.video.dispatchEvent(new Event('canplay'));
  await settle();
  assert.equal(f.video.calls, 2);
  assert.equal(f.button.hidden, true);
  f.cleanup();
});

test('Play video invokes playback directly after autoplay rejection', async () => {
  const f = fixture({ reject: true });
  await settle();
  f.video.reject = false;
  f.button.dispatchEvent(new Event('click'));
  assert.equal(f.video.calls, 2);
  await settle();
  assert.equal(f.button.hidden, true);
  f.cleanup();
});

test('reduced motion suppresses autoplay but allows an explicit play request', async () => {
  const f = fixture({ reduced: true });
  assert.equal(f.video.calls, 0);
  assert.equal(f.button.hidden, false);
  f.button.dispatchEvent(new Event('click'));
  await settle();
  assert.equal(f.video.calls, 1);
  f.cleanup();
});

test('offscreen and background videos pause; returning resumes; disposal removes handlers', async () => {
  const f = fixture();
  await settle();
  f.visible(false);
  assert.equal(f.video.paused, true);
  f.visible(true);
  await settle();
  assert.equal(f.video.calls, 2);
  f.document.hidden = true;
  f.document.dispatchEvent(new Event('visibilitychange'));
  assert.equal(f.video.paused, true);
  f.document.hidden = false;
  f.window.dispatchEvent(new Event('pageshow'));
  await settle();
  assert.equal(f.video.calls, 3);
  f.cleanup();
  assert.equal(f.disconnected(), true);
  f.video.dispatchEvent(new Event('canplay'));
  f.button.dispatchEvent(new Event('click'));
  f.window.dispatchEvent(new Event('pageshow'));
  assert.equal(f.video.calls, 3);
  assert.equal(f.video.paused, true);
});
