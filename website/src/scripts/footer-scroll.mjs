// Slide only the main content, keeping the menu and destination footer still.
export async function runFooterScroll({ reverse, update, reducedMotion }) {
  if (reducedMotion.matches || !document.documentElement.animate) {
    update();
    return;
  }
  const top = document.querySelector('header').getBoundingClientRect().bottom;
  let distance = Math.max(0, window.innerHeight - top);
  if (!distance) { update(); return; }
  const overlay = document.createElement('div');
  overlay.className = 'footer-scroll';
  overlay.style.top = `${top}px`;
  overlay.inert = true;
  overlay.setAttribute('aria-hidden', 'true');
  const animations = [];
  const finish = () => animations.forEach(animation => animation.finish());
  function snapshot() {
    const panel = document.createElement('div');
    panel.className = 'footer-scroll-panel';
    for (const selector of ['body > main']) {
      const element = document.querySelector(selector);
      const rect = element.getBoundingClientRect();
      const copy = element.cloneNode(true);
      Object.assign(copy.style, {
        position: 'absolute', top: `${rect.top - top}px`, left: `${rect.left}px`,
        width: `${rect.width}px`, height: `${rect.height}px`, margin: '0', flex: 'none',
      });
      panel.append(copy);
    }
    return panel;
  }
  try {
    const departing = snapshot();
    overlay.append(departing);
    document.body.append(overlay);
    update();
    if (reducedMotion.matches) return;
    // Leave the real footer outside the animated viewport. Its normal document
    // position is established by update(), including restored Back positions.
    const footer = document.querySelector('body > footer');
    if (footer && !footer.hidden) {
      const footerTop = footer.getBoundingClientRect().top;
      const bottom = Math.min(window.innerHeight, Math.max(top, footerTop));
      overlay.style.bottom = `${window.innerHeight - bottom}px`;
      distance = bottom - top;
    }
    if (!distance) return;
    const arriving = snapshot();
    overlay.append(arriving);
    const direction = reverse ? -1 : 1;
    const timing = { duration: 650, easing: 'cubic-bezier(.45,0,.2,1)', fill: 'both' };
    animations.push(departing.animate([
      { transform: 'translateY(0)' },
      { transform: `translateY(${-direction * distance}px)` },
    ], timing));
    animations.push(arriving.animate([
      { transform: `translateY(${direction * distance}px)` },
      { transform: 'translateY(0)' },
    ], timing));
    reducedMotion.addEventListener('change', finish);
    window.addEventListener('resize', finish);
    await Promise.all(animations.map(animation => animation.finished));
  } finally {
    reducedMotion.removeEventListener('change', finish);
    window.removeEventListener('resize', finish);
    animations.forEach(animation => animation.cancel());
    overlay.remove();
  }
}
