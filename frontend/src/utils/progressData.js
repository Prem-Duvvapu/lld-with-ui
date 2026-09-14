const PROGRESS_KEYS = ['lld-progress-v1', 'lld-revealed-v1', 'lld-revisit-v1', 'lld-attempt-v1'];

/**
 * Everything that makes up a visitor's local progress state, bundled into one
 * portable file -- this app has no backend user state, so this is the only way
 * progress can follow someone from one browser/device to another.
 */
export function buildProgressExport() {
  const data = {};
  for (const key of PROGRESS_KEYS) {
    try {
      const raw = localStorage.getItem(key);
      if (raw) data[key] = JSON.parse(raw);
    } catch {
      // skip a key that isn't readable/parseable rather than fail the whole export
    }
  }
  return { app: 'lld-with-ui', version: 1, exportedAt: new Date().toISOString(), data };
}

export function downloadProgress() {
  const payload = buildProgressExport();
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `lld-progress-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function readProgressFile(file) {
  return file.text().then((text) => JSON.parse(text));
}

export function importProgress(payload) {
  if (!payload || typeof payload !== 'object' || !payload.data || typeof payload.data !== 'object') {
    throw new Error('This file does not look like a progress export.');
  }
  let imported = 0;
  for (const key of PROGRESS_KEYS) {
    if (key in payload.data) {
      localStorage.setItem(key, JSON.stringify(payload.data[key]));
      imported += 1;
    }
  }
  if (imported === 0) {
    throw new Error('This file has no recognized progress data.');
  }
}
