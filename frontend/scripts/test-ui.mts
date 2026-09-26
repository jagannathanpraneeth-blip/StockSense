import { JSDOM } from 'jsdom';
const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: process.env.TEST_BASE_URL });
for (const key of ['window','document','navigator','HTMLElement','Element','Node','Event','MouseEvent','KeyboardEvent','MutationObserver','getComputedStyle']) Object.defineProperty(globalThis, key, { value: typeof dom.window[key] === 'function' && key === 'getComputedStyle' ? dom.window[key].bind(dom.window) : dom.window[key], configurable: true });
window.confirm = () => true;
window.alert = text => { throw new Error(String(text)); };
const originalFetch = globalThis.fetch;
let cookie = '';
globalThis.fetch = async (input, options = {}) => {
  const headers = new Headers(options.headers);
  if (cookie) headers.set('Cookie', cookie);
  const response = await originalFetch(new URL(String(input), process.env.TEST_BASE_URL), { ...options, headers });
  if (response.headers.get('set-cookie')) cookie = response.headers.get('set-cookie').split(';')[0];
  return response;
};
try { await import('./ui-cases.tsx'); } finally { dom.window.close(); }
