// Transient navigation only: never persist learner notes or answers here.
const positions = new Map();
export function rememberCatalog(key, lessonId, focusId = `lesson-${lessonId}`) {
  positions.delete(key);
  positions.set(key, { lessonId, focusId, scrollY: window.scrollY });
  if (positions.size > 30) positions.delete(positions.keys().next().value);
}
export function catalogPosition(key) { return positions.get(key); }
export function catalogReturn(state) {
  const catalog = state?.learnCatalog;
  return catalog && typeof catalog.search === 'string' && (!catalog.search || catalog.search.startsWith('?'))
    ? { to: `/learn${catalog.search}`, state: { learnCatalog: catalog } }
    : { to: '/learn' };
}
