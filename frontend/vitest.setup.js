import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// React Testing Library only auto-registers its cleanup when vitest runs with
// `globals: true`, which this project doesn't. Without it, every render leaks into the
// next test's DOM and `screen` queries match components a previous test mounted — which
// silently turns "this element is absent" assertions into false passes.
afterEach(() => {
  cleanup();
});

// ClassDiagram uses ResizeObserver in a layout effect to keep relationship lines
// attached to their boxes. Stub the DOM APIs the test environment doesn't provide so
// component tests exercise the real component instead of crashing on mount.
//
// happy-dom rather than jsdom: jsdom pulls in undici, whose `markAsUncloneable` call
// needs a newer Node than CI's 20, so the whole DOM suite failed to load there while
// passing locally on Node 22.
if (typeof window !== 'undefined') {
  if (!window.ResizeObserver) {
    window.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  }

  if (!window.matchMedia) {
    window.matchMedia = (query) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener() {},
      removeEventListener() {},
      addListener() {},
      removeListener() {},
      dispatchEvent() {
        return false;
      },
    });
  }
}
