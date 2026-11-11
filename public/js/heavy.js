// 1.3.3 loading without the freezes.
//  b64buf: decode an embedded model (the offline build keeps every .glb as base64 text in the page) with the browser's
//  own decoder (a data: URL fetch) instead of a JavaScript loop over millions of characters that blocked everything.
//  heavy: run big jobs (parsing a model) one at a time with a frame between them, so the loading screen keeps moving
//  instead of freezing once for all of them together.
export async function b64buf(s) {
  try { const r = await fetch('data:application/octet-stream;base64,' + s); if (r.ok) return await r.arrayBuffer(); } catch (e) { /* old engines: below */ }
  const bin = atob(s), b = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) b[i] = bin.charCodeAt(i);
  return b.buffer;
}
const nextFrame = () => new Promise(r => { let done = false; const go = () => { if (!done) { done = true; r(); } }; requestAnimationFrame(() => setTimeout(go, 0)); setTimeout(go, 120); });
let chain = Promise.resolve();
export function heavy(fn) {
  const p = chain.then(nextFrame).then(fn);
  chain = p.catch(() => {});
  return p;
}
