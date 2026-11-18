export function normalizeDoi(value) {
  return String(value || '').trim().replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, '').replace(/^doi:\s*/i, '').toLowerCase();
}

// Original entries always win, including drafts (which intentionally hide a DOI).
export function mergePublications(manual, imported, config) {
  const originals = manual.filter(entry => !entry.data.draft).sort((a, b) =>
    a.data.number && b.data.number ? b.data.number - a.data.number :
      b.data.year - a.data.year || a.data.order - b.data.order || a.id.localeCompare(b.id));
  if (!config.enabled) return originals;
  const seen = new Set([...manual.map(entry => normalizeDoi(entry.data.doi)), ...config.excludeDois.map(normalizeDoi)]);
  const additions = imported.filter(publication => {
    const doi = normalizeDoi(publication.doi);
    if (seen.has(doi)) return false;
    seen.add(doi);
    return true;
  }).sort((a, b) => b.date.localeCompare(a.date) || a.doi.localeCompare(b.doi));
  // Insert new papers without changing the curated order among original papers.
  const result = [...originals];
  for (const publication of additions.reverse()) {
    const index = result.findIndex(entry => entry.data.year <= publication.year);
    result.splice(index < 0 ? result.length : index, 0, {
      id: publication.doi, collection: 'publications-auto', body: '',
      data: { ...publication, order: 0, draft: false },
    });
  }
  return result;
}
