// Set native new-tab behavior on links rendered by Astro templates.
export function externalLinkAttributes(href, site) {
  if (typeof href !== 'string' || !/^(https?:)?\/\//i.test(href)) return {};
  try {
    const url = new URL(href, site);
    if (url.origin === new URL(site).origin) return {};
    return { target: '_blank', rel: 'noopener noreferrer' };
  } catch {
    return {};
  }
}
