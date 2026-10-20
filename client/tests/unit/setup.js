Object.defineProperty(globalThis, 'localStorage', {
  value: globalThis.jsdom.window.localStorage,
  configurable: true,
  writable: true
})
