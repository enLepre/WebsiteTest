// Match the footer word to the heading while the surrounding page zooms.
export async function runFooterZoom({ source, reverse, update, target, reducedMotion }) {
  if (!source || reducedMotion.matches || !document.startViewTransition) {
    update();
    return;
  }
  const root = document.documentElement;
  const header = document.querySelector('header');
  const oldMain = document.querySelector('main');
  let destination;
  let newMain;
  let transition;
  const skip = () => transition?.skipTransition();
  try {
    root.dataset.footerZoom = reverse ? 'out' : 'in';
    source.style.viewTransitionName = 'footer-word';
    header.style.viewTransitionName = 'footer-header';
    oldMain.style.viewTransitionName = 'footer-content';
    transition = document.startViewTransition(() => {
      update();
      destination = target();
      newMain = document.querySelector('main');
      newMain.style.viewTransitionName = 'footer-content';
      if (destination) destination.style.viewTransitionName = 'footer-word';
    });
    reducedMotion.addEventListener('change', skip);
    window.addEventListener('resize', skip);
    // A skipped animation must still finish the navigation exactly once.
    await Promise.all([transition.updateCallbackDone, transition.finished]);
  } finally {
    reducedMotion.removeEventListener('change', skip);
    window.removeEventListener('resize', skip);
    delete root.dataset.footerZoom;
    for (const element of [source, destination, header, oldMain, newMain]) {
      element?.style.removeProperty('view-transition-name');
    }
  }
}
