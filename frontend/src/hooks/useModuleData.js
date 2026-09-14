import { useEffect, useState } from 'react';
import { resolveModuleKey } from '../data/moduleKeys';

/**
 * Resolve a module id to its design/diagram/sequence content, loading that module's
 * chunk on demand.
 *
 * The barrels map key -> `() => import(...)` rather than key -> data: statically
 * importing all 60 modules put ~1.7 MB of content into one shared chunk that every
 * module page downloaded in order to render exactly one of them. Resolution itself is
 * unchanged — `resolveModuleKey` runs against the same keys it always did, so alias
 * handling and the "no entry for this module" path behave exactly as before.
 *
 * `customData`, when a caller passes it, short-circuits the store entirely.
 *
 * @returns {{status: 'loading'|'ready'|'missing'|'error', data: object|null}}
 */
export function useModuleData(loaders, module, customData = null, label = 'moduleData') {
  const key = customData ? null : resolveModuleKey(loaders, module);
  const [state, setState] = useState(() =>
    customData ? { status: 'ready', data: customData } : { status: key ? 'loading' : 'missing', data: null },
  );

  useEffect(() => {
    if (customData) {
      setState({ status: 'ready', data: customData });
      return undefined;
    }
    if (!key) {
      if (import.meta.env?.DEV && module) {
        console.warn(`[${label}] no entry for module "${module}" — add the file and register it in the barrel.`);
      }
      setState({ status: 'missing', data: null });
      return undefined;
    }

    let alive = true;
    setState({ status: 'loading', data: null });
    loaders[key]()
      .then((mod) => {
        if (alive) setState({ status: 'ready', data: mod.default });
      })
      .catch((err) => {
        // A failed chunk fetch (offline, stale deploy) must not render as "this module
        // has no content" — that reads as a missing-data bug rather than a network blip.
        if (import.meta.env?.DEV) console.error(`[useModuleData] failed to load "${key}"`, err);
        if (alive) setState({ status: 'error', data: null });
      });

    return () => {
      alive = false;
    };
  }, [loaders, key, customData, module, label]);

  return state;
}
