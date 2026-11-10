// 1.3.2: codes typed into Store > Codes.
//  - secret codes: 10 one-off codes handed out by the developer; each unlocks the Freddy Fazbear outfit for all
//    four survivors. Only their SHA-256 (salted) is in the game.
//  - gift codes: someone buys an outfit as a gift and gets a code to send; whoever types it in gets the outfit.
//    They check themselves (a checksum), so they work offline with no server. A device takes each code once.
import { SKINS, SECRET_CODES, GIFT_CHARS } from './config.js';

// small synchronous SHA-256 (crypto.subtle is not always there for a page opened from a file)
const K = new Uint32Array([0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2]);
export function sha256(str) {
  const bytes = new TextEncoder().encode(str), len = bytes.length, n = ((len + 9 + 63) >> 6) << 6, m = new Uint8Array(n);
  m.set(bytes); m[len] = 0x80; const dv = new DataView(m.buffer); dv.setUint32(n - 4, len * 8); dv.setUint32(n - 8, Math.floor(len / 0x20000000));
  const H = new Uint32Array([0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19]), W = new Uint32Array(64);
  const rr = (x, k) => (x >>> k) | (x << (32 - k));
  for (let o = 0; o < n; o += 64) {
    for (let i = 0; i < 16; i++) W[i] = dv.getUint32(o + i * 4);
    for (let i = 16; i < 64; i++) { const a = W[i - 15], b = W[i - 2]; W[i] = (W[i - 16] + (rr(a, 7) ^ rr(a, 18) ^ (a >>> 3)) + W[i - 7] + (rr(b, 17) ^ rr(b, 19) ^ (b >>> 10))) >>> 0; }
    let [a, b, c, d, e, f, g, h] = H;
    for (let i = 0; i < 64; i++) {
      const t1 = (h + (rr(e, 6) ^ rr(e, 11) ^ rr(e, 25)) + ((e & f) ^ (~e & g)) + K[i] + W[i]) >>> 0, t2 = ((rr(a, 2) ^ rr(a, 13) ^ rr(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) >>> 0;
      h = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = b; b = a; a = (t1 + t2) >>> 0;
    }
    H[0] += a; H[1] += b; H[2] += c; H[3] += d; H[4] += e; H[5] += f; H[6] += g; H[7] += h;
  }
  return [...H].map(x => x.toString(16).padStart(8, '0')).join('');
}

const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O, 1/I
export const clean = s => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '').replace(/O/g, '0').replace(/I/g, '1');
const pretty = c => c.slice(0, 4) + '-' + c.slice(4, 8) + '-' + c.slice(8);
const check = body => { const h = sha256('gdbd-gift-v1:' + body); let o = ''; for (let i = 0; i < 4; i++) o += A[parseInt(h.slice(i * 2, i * 2 + 2), 16) % 32]; return o; };

// a gift code for one outfit
export function makeGift(char, skin) {
  const ci = GIFT_CHARS.indexOf(char), si = (SKINS[char] || []).findIndex(s => s.id === skin);
  if (ci < 0 || si < 0 || ci > 31 || si > 31) return null;
  let body = A[ci] + A[si];
  const rnd = new Uint32Array(6); (globalThis.crypto && crypto.getRandomValues ? crypto.getRandomValues(rnd) : rnd.forEach((_, i) => { rnd[i] = Math.random() * 1e9; }));
  for (const x of rnd) body += A[x % 32];
  return pretty(body + check(body));
}

// what a code is: { kind: 'secret' } / { kind: 'gift', char, skin } / null
export function readCode(input) {
  const c = clean(input).replace(/0/g, 'O').replace(/1/g, 'I'); // typed zeros/ones back to letters for the hash
  const raw = String(input || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  for (const v of new Set([raw, c])) if (v.length === 12 && SECRET_CODES.includes(sha256('gdbd-showbear:' + v))) return { kind: 'secret', id: v };
  const g = clean(input).replace(/0/g, 'O').replace(/1/g, 'I');
  if (g.length !== 12) return null;
  const body = g.slice(0, 8);
  if (check(body) !== g.slice(8)) return null;
  const char = GIFT_CHARS[A.indexOf(body[0])], sk = char && (SKINS[char] || [])[A.indexOf(body[1])];
  if (!char || !sk || sk.secret || sk.price <= 0) return null;
  return { kind: 'gift', id: g, char, skin: sk.id, name: sk.name };
}
