// Placeholder with the final API (docs/spec.md section 8); the search work replaces it.
export function buildIndex(guides) {
  return { v: 0, docs: guides.map((g) => ({ s: g.slug, p: g.path, t: g.title, u: g.summary })) };
}

export function createSearcher(index) {
  return {
    search(query, { limit = 20 } = {}) {
      const q = String(query).toLowerCase().trim();
      if (!q) return [];
      return index.docs
        .filter((d) => (d.t + ' ' + d.u).toLowerCase().includes(q))
        .slice(0, limit)
        .map((d) => ({ slug: d.s, path: d.p, title: d.t, summary: d.u, score: 1, matched: ['title'] }));
    },
    suggest() {
      return [];
    }
  };
}
