export function readMemory(key, fallback, persistent = false) {
  try {
    const storage = persistent ? localStorage : sessionStorage;
    return JSON.parse(storage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}

export function writeMemory(key, value, persistent = false) {
  try {
    const storage = persistent ? localStorage : sessionStorage;
    storage.setItem(key, JSON.stringify(value));
  } catch {
    return;
  }
}

export function recentPaths() {
  const saved = readMemory('lld-recent-modules', [], true);
  return Array.isArray(saved) ? [...new Set(saved.filter(path => typeof path === 'string'))].slice(0, 5) : [];
}

export function rememberModule(path) {
  writeMemory('lld-recent-modules', [path, ...recentPaths().filter(saved => saved !== path)].slice(0, 5), true);
}
