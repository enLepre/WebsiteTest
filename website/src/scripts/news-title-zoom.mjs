// Animate the actual title typography without stretching the letters.
export async function runNewsTitleZoom({ source, target, destinationMain, header, reducedMotion, scrollY, returning, prepareMedia }) {
  if (!source || !target || reducedMotion.matches) return scrollY;
  const overlay = document.createElement('div');
  overlay.className = 'page-journey profile-journey news-journey';
  overlay.inert = true;
  overlay.setAttribute('aria-hidden', 'true');
  const top = header.getBoundingClientRect().bottom;
  overlay.style.top = top + 'px';
  overlay.style.visibility = 'hidden';
  // Cover the departing page; only the moving title is visible during the zoom.
  overlay.style.background = '#fff';
  const animations = [];
  let interrupted = false;
  const finish = () => {
    interrupted = true;
    animations.forEach(animation => animation.finish());
  };
  const sourceVisibility = source.style.visibility;
  const targetVisibility = target.style.visibility;
  const destinationOpacity = destinationMain.style.opacity;
  let timer;
  try {
    // The return link is below the article; bring its title back into view.
    const sourceBounds = source.getBoundingClientRect();
    if (sourceBounds.top < top || sourceBounds.bottom > window.innerHeight) {
      source.scrollIntoView({ block: 'center', behavior: 'instant' });
    }
    destinationMain.style.transform = `translateY(-${scrollY}px)`;
    overlay.append(destinationMain);
    document.body.append(overlay);
    const ready = await Promise.race([
      prepareMedia(overlay).then(() => true),
      new Promise(resolve => { timer = setTimeout(() => resolve(false), 1800); }),
    ]);
    clearTimeout(timer);
    let targetBounds = target.getBoundingClientRect();
    if (targetBounds.top < top || targetBounds.bottom > window.innerHeight) {
      scrollY = Math.max(0, scrollY + targetBounds.top - top - Math.max(0, (window.innerHeight - top - targetBounds.height) / 2));
      destinationMain.style.transform = `translateY(-${scrollY}px)`;
      targetBounds = target.getBoundingClientRect();
    }
    if (!ready || reducedMotion.matches) return scrollY;
    const sourceRect = source.getBoundingClientRect();
    const sourceStyle = getComputedStyle(source);
    const targetStyle = getComputedStyle(target);
    const title = document.createElement('div');
    title.textContent = target.textContent;
    Object.assign(title.style, {
      position: 'fixed', margin: '0', zIndex: '1', transformOrigin: 'top left',
      fontFamily: targetStyle.fontFamily, fontWeight: targetStyle.fontWeight,
      letterSpacing: targetStyle.letterSpacing, overflowWrap: 'anywhere',
    });
    const frame = (rect, style) => ({
      left: rect.left + 'px', top: rect.top + 'px', width: rect.width + 'px',
      fontSize: style.fontSize, lineHeight: style.lineHeight, color: style.color,
    });
    source.style.visibility = 'hidden';
    target.style.visibility = 'hidden';
    // Keep layout measurable without revealing the incoming article or listing.
    destinationMain.style.opacity = '0';
    overlay.append(title);
    overlay.style.visibility = 'visible';
    animations.push(title.animate([frame(sourceRect, sourceStyle), frame(targetBounds, targetStyle)], {
      duration: 650, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'both',
    }));
    reducedMotion.addEventListener('change', finish);
    window.addEventListener('resize', finish);
    await Promise.all(animations.map(animation => animation.finished));
    // Keep the settled title visible while the rest of the prepared page fades in.
    // Start only after the zoom, so incoming text never crosses the moving title.
    if (!interrupted && !reducedMotion.matches) {
      const reveal = destinationMain.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration: 320, easing: 'ease-out', fill: 'both',
      });
      animations.push(reveal);
      await reveal.finished;
    }
    return scrollY;
  } finally {
    clearTimeout(timer);
    reducedMotion.removeEventListener('change', finish);
    window.removeEventListener('resize', finish);
    animations.forEach(animation => animation.cancel());
    source.style.visibility = sourceVisibility;
    target.style.visibility = targetVisibility;
    destinationMain.style.opacity = destinationOpacity;
    destinationMain.style.removeProperty('transform');
    overlay.remove();
  }
}
