// Between-test DOM cleanup is React Testing Library's own afterEach(cleanup), which it
// registers when it finds a global `afterEach` — hence `test.globals: true` in
// vite.config.js.
//
// Calling cleanup() from this file instead does NOT work, though it looks like it should:
// the setup file resolves its own instance of RTL whose container registry is a different
// object from the one the test files populate, so it dutifully cleans an empty set while
// every real render leaks into the next test. A two-test probe (render a marker, then
// assert the next test's body is empty) fails with the setup-file version and passes with
// globals. Without either, "this element is absent" assertions pass against stale DOM.

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
