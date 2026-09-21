// Enhance ordinary static links; only fetch the pages in the selected journey.
(() => {
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const header = document.querySelector('header');
  const links = [...header.querySelectorAll('nav a')];
  const routes = links.map(link => new URL(link.href).pathname);
  const footerRoutes = [...document.querySelectorAll('footer [data-footer-link]')].map(link => new URL(link.href).pathname);
  const isFooter = path => footerRoutes.includes(path);
  const teamRoute = routes[1];
  const isProfile = path => path.startsWith(teamRoute) && /^[^/]+\/$/.test(path.slice(teamRoute.length));
  const routeIndex = path => isProfile(path) ? 1.5 : routes.indexOf(path);
  const canNavigate = path => routes.includes(path) || isProfile(path) || isFooter(path);
  const cache = new Map();
  let current = location.pathname;
  let busy = false;
  let pendingUrl;
  let cleanupVideo = () => {};
  let footerReturn = history.state?.footerReturn || null;

  function initializePublicationFilters() {
    const main = document.querySelector('body > main');
    const form = main.querySelector('.publication-filters');
    if (!form) return;
    const search = form.querySelector('input');
    const year = form.querySelector('select');
    const count = form.querySelector('.publication-count');
    const clear = form.querySelector('button');
    const empty = main.querySelector('.publication-empty');
    const normalize = text => text.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
    const papers = [...main.querySelectorAll('.paper')].map(element => ({
      element, text: normalize(element.textContent), year: element.querySelector('time').textContent.trim(),
    }));
    search.value = form.dataset.query || '';
    year.value = form.dataset.year || '';
    const update = () => {
      form.dataset.query = search.value;
      form.dataset.year = year.value;
      const terms = normalize(search.value).split(/\s+/).filter(Boolean);
      let matches = 0;
      for (const paper of papers) {
        const visible = (!year.value || paper.year === year.value) && terms.every(term => paper.text.includes(term));
        paper.element.hidden = !visible;
        if (visible) matches++;
      }
      count.textContent = `${matches} of ${papers.length} publications`;
      empty.hidden = matches > 0;
      clear.disabled = !search.value && !year.value;
    };
    form.addEventListener('submit', event => event.preventDefault());
    form.addEventListener('input', update);
    form.addEventListener('change', update);
    form.addEventListener('reset', event => {
      event.preventDefault();
      search.value = '';
      year.value = '';
      update();
      search.focus();
    });
    form.hidden = false;
    update();
  }

  function initializePage() {
    const back = document.querySelector('[data-footer-back]');
    if (back && footerReturn && canNavigate(footerReturn.path)) back.href = footerReturn.path;
    initializeExternalLinks();
    initializePublicationFilters();
    cleanupVideo();
    const video = document.querySelector('main video');
    if (!video) return;
    cleanupVideo = initializeHeroVideo(video, document.querySelector('main .video-play'), reducedMotion);
  }

  function rememberPage() {
    const main = document.querySelector('main').cloneNode(true);
    const video = document.querySelector('main video');
    if (video?.readyState >= 2) {
      // Reuse the visible frame so Home does not flash black as it slides away.
      try {
        const frame = document.createElement('canvas');
        frame.width = video.videoWidth;
        frame.height = video.videoHeight;
        frame.getContext('2d').drawImage(video, 0, 0);
        main.querySelector('video').poster = frame.toDataURL('image/jpeg', 0.7);
      } catch { /* The transition also works if a video frame is unavailable. */ }
    }
    cache.set(current, {
      title: document.title,
      main,
      footer: document.querySelector('footer').cloneNode(true),
      scrollY: window.scrollY,
    });
  }

  async function loadPage(path) {
    if (cache.has(path)) return cache.get(path);
    const response = await fetch(path, { signal: AbortSignal.timeout(5000) });
    if (!response.ok) throw new Error('Page unavailable');
    const doc = new DOMParser().parseFromString(await response.text(), 'text/html');
    if (!doc.querySelector('main#content') || !doc.querySelector('footer')) throw new Error('Invalid page');
    const page = { title: doc.title, main: doc.querySelector('main'), footer: doc.querySelector('footer') };
    cache.set(path, page);
    return page;
  }

  // Decode only images that will pass through the viewport. Repeat after each
  // batch because images without intrinsic dimensions can change the layout.
  async function prepareVisibleMedia(overlay) {
    const prepared = new Set();
    const viewport = overlay.getBoundingClientRect();
    while (true) {
      const images = [...overlay.querySelectorAll('img')].filter(image => {
        const rect = image.getBoundingClientRect();
        return !prepared.has(image) && rect.top < viewport.bottom && rect.bottom >= viewport.top;
      });
      if (!images.length) break;
      await Promise.all(images.map(async image => {
        prepared.add(image);
        image.loading = 'eager';
        try { await image.decode(); } catch { /* Broken images must not block navigation. */ }
      }));
    }
    await Promise.all([...overlay.querySelectorAll('video')].map(async video => {
      if (video.poster) {
        const poster = new Image();
        poster.src = video.poster;
        try { await poster.decode(); } catch { /* Keep the existing video background. */ }
      } else {
        // Home may be visited for the first time from a different entry page.
        await new Promise(resolve => {
          video.addEventListener('loadeddata', resolve, { once: true });
          video.addEventListener('error', resolve, { once: true });
          video.preload = 'auto';
          video.load();
        });
      }
    }));
  }

  async function navigate(url, historyChange = false, trigger = null) {
    if (busy) { pendingUrl = { url, historyChange, trigger }; return; }
    busy = true;
    header.setAttribute('aria-busy', 'true');
    let overlay;
    let animation;
    let preparationTimer;
    let hiddenPortrait;
    let portraitVisibility;
    const portraitAnimations = [];
    const finishMotion = () => { animation?.finish(); portraitAnimations.forEach(item => item.finish()); };
    try {
      rememberPage();
      const reverseFooter = isFooter(current) && (trigger?.hasAttribute('data-footer-back') || (historyChange && footerReturn?.path === url.pathname));
      if (isFooter(url.pathname) || reverseFooter) {
        const departure = current;
        const origin = footerReturn;
        const nextOrigin = historyChange ? history.state?.footerReturn || null
          : { path: current, scrollY: window.scrollY };
        const destination = await loadPage(url.pathname);
        const footerLink = (path) => [...document.querySelectorAll('footer [data-footer-link]')].find(link => new URL(link.href).pathname === path);
        await runFooterScroll({
          reverse: reverseFooter, reducedMotion,
          update: () => {
            cleanupVideo();
            document.querySelector('main').replaceWith(destination.main.cloneNode(true));
            document.querySelector('footer').replaceWith(destination.footer.cloneNode(true));
            document.title = destination.title;
            current = url.pathname;
            footerReturn = isFooter(current) ? nextOrigin : null;
            links.forEach(link => {
              if (new URL(link.href).pathname === (isProfile(current) ? teamRoute : current)) link.setAttribute('aria-current', 'page');
              else link.removeAttribute('aria-current');
            });
            if (!historyChange) history.pushState({ footerReturn }, '', url);
            window.scrollTo({ top: reverseFooter ? (origin?.scrollY || destination.scrollY || 0) : 0, behavior: 'instant' });
            // Direct visits have no saved source. Land on the footer for the reverse scroll.
            if (reverseFooter && !origin) footerLink(departure)?.scrollIntoView({ block: 'center', behavior: 'instant' });
            initializePage();
            document.querySelector('main').focus({ preventScroll: true });
          },
        });
        return;
      }
      const from = routeIndex(current);
      const to = routeIndex(url.pathname);
      const direction = to > from ? 1 : -1;
      const sourceLink = current === teamRoute && isProfile(url.pathname)
        ? [...document.querySelectorAll('main .member-photo')].find(link => new URL(link.href).pathname === url.pathname)
        : null;
      const returningToTeam = isProfile(current) && url.pathname === teamRoute;
      const sourcePortrait = returningToTeam ? document.querySelector('main .profile-portrait') : sourceLink?.querySelector('img');
      const paths = reducedMotion.matches || isFooter(current) ? [url.pathname] : [current];
      if (!reducedMotion.matches && !isFooter(current)) {
        const between = routes.filter((path, i) => direction > 0 ? i > from && i < to : i < from && i > to);
        paths.push(...(direction > 0 ? between : between.reverse()), url.pathname);
      }
      const pages = await Promise.all(paths.map(loadPage));
      const destination = pages.at(-1);
      let destinationMain = destination.main.cloneNode(true);
      let destinationScroll = returningToTeam || historyChange ? (destination.scrollY || 0) : 0;
      const targetPortrait = returningToTeam
        ? [...destinationMain.querySelectorAll('.member-photo')].find(link => new URL(link.getAttribute('href'), location.href).pathname === current)?.querySelector('img')
        : destinationMain.querySelector('.profile-portrait');
      if (!reducedMotion.matches && sourcePortrait && targetPortrait) {
        overlay = document.createElement('div');
        overlay.className = 'page-journey profile-journey';
        overlay.inert = true;
        overlay.setAttribute('aria-hidden', 'true');
        overlay.style.top = header.getBoundingClientRect().bottom + 'px';
        overlay.style.visibility = 'hidden';
        if (destinationScroll) destinationMain.style.transform = `translateY(-${destinationScroll}px)`;
        // Keep the same sharp image throughout the return, including its landing.
        if (returningToTeam) targetPortrait.src = sourcePortrait.currentSrc || sourcePortrait.src;
        overlay.append(destinationMain);
        document.body.append(overlay);
        if (returningToTeam) {
          const rect = targetPortrait.getBoundingClientRect();
          const top = header.getBoundingClientRect().bottom;
          // Direct profile visits have no saved directory position; reveal the member.
          if (rect.top < top || rect.bottom > window.innerHeight) {
            destinationScroll = Math.max(0, destinationScroll + rect.top - top - Math.max(0, (window.innerHeight - top - rect.height) / 2));
            destinationMain.style.transform = `translateY(-${destinationScroll}px)`;
          }
        }
        const ready = await Promise.race([
          prepareVisibleMedia(overlay).then(() => true),
          new Promise(resolve => { preparationTimer = setTimeout(() => resolve(false), 1800); }),
        ]);
        clearTimeout(preparationTimer);
        const sourceRect = sourcePortrait.getBoundingClientRect();
        const portrait = targetPortrait;
        const targetRect = portrait.getBoundingClientRect();
        if (ready && !reducedMotion.matches && sourceRect.bottom > header.getBoundingClientRect().bottom && sourceRect.top < window.innerHeight) {
          const placeholder = document.createElement('div');
          placeholder.style.width = targetRect.width + 'px';
          placeholder.style.height = targetRect.height + 'px';
          portrait.replaceWith(placeholder);
          overlay.append(portrait);
          Object.assign(portrait.style, {
            position: 'fixed', left: targetRect.left + 'px', top: targetRect.top + 'px',
            width: targetRect.width + 'px', height: targetRect.height + 'px',
            margin: '0', maxWidth: 'none', transformOrigin: 'top left', zIndex: '1',
            objectFit: 'cover', objectPosition: 'center top', borderRadius: '5px',
          });
          hiddenPortrait = sourcePortrait;
          portraitVisibility = sourcePortrait.style.visibility;
          sourcePortrait.style.visibility = 'hidden';
          overlay.style.visibility = 'visible';
          const motion = { duration: 650, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'both' };
          portraitAnimations.push(portrait.animate([
            { transform: `translate(${sourceRect.left - targetRect.left}px, ${sourceRect.top - targetRect.top}px) scale(${sourceRect.width / targetRect.width}, ${sourceRect.height / targetRect.height})` },
            { transform: 'translate(0, 0) scale(1, 1)' },
          ], motion));
          // Reverse the information fade as the portrait returns to the directory.
          portraitAnimations.push(destinationMain.animate([{ opacity: 0 }, { opacity: 1 }], { duration: returningToTeam ? 350 : 220, delay: returningToTeam ? 180 : 0, fill: 'both' }));
          const information = returningToTeam ? document.querySelector('body > main') : destinationMain;
          for (const element of information.querySelectorAll('.profile-info, .profile-back')) {
            portraitAnimations.push(element.animate(returningToTeam ? [{ opacity: 1 }, { opacity: 0 }] : [{ opacity: 0 }, { opacity: 1 }], { duration: returningToTeam ? 220 : 350, delay: returningToTeam ? 0 : 320, fill: 'both' }));
          }
          reducedMotion.addEventListener('change', finishMotion);
          window.addEventListener('resize', finishMotion);
          await Promise.all(portraitAnimations.map(item => item.finished));
          portraitAnimations.forEach(item => item.cancel());
          portrait.removeAttribute('style');
          placeholder.replaceWith(portrait);
        }
      } else if (!reducedMotion.matches && from !== to && pages.length > 1) {
        const preparedScroll = window.scrollY;
        const preparedWidth = window.innerWidth;
        const preparedHeight = window.innerHeight;
        overlay = document.createElement('div');
        overlay.className = 'page-journey';
        // Keep the current page visible until the journey's media is ready.
        overlay.style.visibility = 'hidden';
        overlay.inert = true;
        overlay.setAttribute('aria-hidden', 'true');
        overlay.style.top = header.getBoundingClientRect().bottom + 'px';
        const track = document.createElement('div');
        track.className = 'page-journey-track';
        const ordered = direction > 0 ? pages : [...pages].reverse();
        for (const page of ordered) {
          const panel = document.createElement('div');
          panel.className = 'page-journey-panel';
          const content = page.main.cloneNode(true);
          if (page === destination) destinationMain = content;
          if (page === destination && destinationScroll) content.style.transform = `translateY(-${destinationScroll}px)`;
          content.querySelectorAll('video').forEach(video => {
            video.removeAttribute('autoplay');
            video.preload = 'none';
          });
          // Keep the departing page at the reader's current vertical position.
          if (page === pages[0]) content.style.transform = `translateY(-${window.scrollY}px)`;
          panel.append(content);
          track.append(panel);
        }
        overlay.append(track);
        document.body.append(overlay);
        const distance = (pages.length - 1) * 100;
        track.style.transform = `translateX(-${direction > 0 ? 0 : distance}%)`;
        const ready = await Promise.race([
          prepareVisibleMedia(overlay).then(() => true),
          new Promise(resolve => { preparationTimer = setTimeout(() => resolve(false), 1800); }),
        ]);
        clearTimeout(preparationTimer);
        // On a slow connection, navigate normally instead of sliding blank images.
        if (ready && !reducedMotion.matches && window.scrollY === preparedScroll && window.innerWidth === preparedWidth && window.innerHeight === preparedHeight) {
          overlay.style.top = header.getBoundingClientRect().bottom + 'px';
          const departing = direction > 0 ? track.firstElementChild : track.lastElementChild;
          departing.querySelector('main').style.transform = `translateY(-${window.scrollY}px)`;
          overlay.style.visibility = 'visible';
          animation = track.animate([
            { transform: `translateX(-${direction > 0 ? 0 : distance}%)` },
            { transform: `translateX(-${direction > 0 ? distance : 0}%)` },
          ], { duration: Math.min(1050, 440 + (pages.length - 2) * 140), easing: 'cubic-bezier(.45,0,.2,1)', fill: 'forwards' });
          reducedMotion.addEventListener('change', finishMotion);
          window.addEventListener('resize', finishMotion);
          await animation.finished;
        }
      }
      cleanupVideo();
      // Move the already decoded destination into place; never clone it again.
      destinationMain.style.removeProperty('transform');
      document.querySelector('main').replaceWith(destinationMain);
      document.querySelector('footer').replaceWith(destination.footer.cloneNode(true));
      document.title = destination.title;
      current = url.pathname;
      footerReturn = null;
      links.forEach(link => {
        if (new URL(link.href).pathname === (isProfile(current) ? teamRoute : current)) link.setAttribute('aria-current', 'page');
        else link.removeAttribute('aria-current');
      });
      if (!historyChange) history.pushState(null, '', url);
      window.scrollTo({ top: destinationScroll, behavior: 'instant' });
      document.querySelector('main').focus({ preventScroll: true });
      initializePage();
    } catch {
      location.assign(url.href);
    } finally {
      clearTimeout(preparationTimer);
      reducedMotion.removeEventListener('change', finishMotion);
      window.removeEventListener('resize', finishMotion);
      animation?.cancel();
      portraitAnimations.forEach(item => item.cancel());
      if (hiddenPortrait) hiddenPortrait.style.visibility = portraitVisibility;
      overlay?.remove();
      busy = false;
      header.removeAttribute('aria-busy');
      if (pendingUrl) {
        const next = pendingUrl;
        pendingUrl = undefined;
        if (next.url.pathname !== current) navigate(next.url, next.historyChange, next.trigger);
      }
    }
  }

  const updateHeader = () => document.documentElement.style.setProperty('--site-header-height', header.getBoundingClientRect().height + 'px');
  updateHeader();
  new ResizeObserver(updateHeader).observe(header);
  initializePage();
  // file:// previews retain normal links because browsers block local fetches.
  if (!['http:', 'https:'].includes(location.protocol)) return;
  history.scrollRestoration = 'manual';
  document.addEventListener('click', event => {
    const link = event.target.closest('a[href]');
    if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || link.hasAttribute('download') || (link.target && link.target !== '_self')) return;
    const url = new URL(link.href);
    if (url.origin !== location.origin || url.hash || url.search || !canNavigate(current) || !canNavigate(url.pathname)) return;
    event.preventDefault();
    if (link.hasAttribute('data-footer-back') && footerReturn?.path === url.pathname) history.back();
    else if (url.pathname !== current || busy) navigate(url, false, link);
  });
  window.addEventListener('popstate', () => {
    if (location.pathname === current) return;
    if (busy || !canNavigate(current) || !canNavigate(location.pathname)) location.reload();
    else navigate(new URL(location.href), true);
  });
})();
