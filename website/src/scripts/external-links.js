// Include links rendered from Markdown, such as news and shared facilities.
function initializeExternalLinks() {
  for (const link of document.querySelectorAll('a[href]')) {
    let url;
    try { url = new URL(link.href, document.baseURI); } catch { continue; }
    if ((url.protocol === 'https:' || url.protocol === 'http:') && url.origin !== window.location.origin) {
      link.target = '_blank';
      link.relList.add('noopener', 'noreferrer');
    }
  }
}
initializeExternalLinks();
