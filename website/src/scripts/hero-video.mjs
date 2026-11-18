// One controller for direct visits and pages restored by the navigation script.
export function initializeHeroVideo(video, button, reducedMotion, environment = {}) {
  const doc = environment.document || document;
  const win = environment.window || window;
  const Observer = environment.IntersectionObserver || IntersectionObserver;
  const rect = video.getBoundingClientRect();
  let visible = rect.bottom > 0 && rect.top < win.innerHeight;
  let disposed = false;
  let pending = false;
  let userRequested = false;
  const listeners = [];
  const listen = (target, event, handler) => {
    target.addEventListener(event, handler);
    listeners.push(() => target.removeEventListener(event, handler));
  };
  // Set properties as well as attributes: cloned video elements must stay muted.
  video.muted = true;
  video.defaultMuted = true;
  video.playsInline = true;
  video.preload = 'auto';
  const wanted = () => !disposed && visible && !doc.hidden && (userRequested || !reducedMotion.matches);
  const showButton = () => { if (!disposed && button) button.hidden = false; };
  const sync = (force = false) => {
    if (disposed) return;
    video.autoplay = wanted();
    if (!wanted()) { video.pause(); return; }
    if (!video.paused || (pending && force !== true)) return;
    pending = true;
    // The click handler calls this directly so playback retains the user gesture.
    try {
      Promise.resolve(video.play()).then(() => {
        if (!wanted()) video.pause();
        else if (button) button.hidden = true;
      }, showButton).finally(() => { pending = false; });
    } catch {
      pending = false;
      showButton();
    }
  };
  showButton();
  const observer = new Observer(entries => { visible = entries[0].isIntersecting; sync(); });
  observer.observe(video);
  for (const event of ['loadeddata', 'canplay']) listen(video, event, sync);
  listen(video, 'playing', () => {
    if (!wanted()) video.pause();
    else if (button) button.hidden = true;
  });
  listen(video, 'pause', showButton);
  listen(video, 'error', showButton);
  listen(doc, 'visibilitychange', sync);
  listen(win, 'pageshow', sync);
  listen(reducedMotion, 'change', () => { userRequested = false; sync(); });
  if (button) listen(button, 'click', () => { userRequested = true; sync(true); });
  sync();
  return () => {
    disposed = true;
    observer.disconnect();
    listeners.forEach(remove => remove());
    video.autoplay = false;
    video.pause();
  };
}
