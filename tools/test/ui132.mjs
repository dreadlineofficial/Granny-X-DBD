// 1.3.2 UI: profile chip + panel, Store > Codes (secret code, gift code), the Showbear outfit
import { chromium } from 'playwright';
import http from 'node:http'; import { readFile } from 'node:fs/promises'; import { join, extname } from 'node:path';
const ROOT = '/home/user/granny-x-dbd', OUT = process.argv[2] || '/tmp/claude-0/shots/ui', CODE = process.argv[3];
const MIME = { '.js': 'text/javascript', '.html': 'text/html', '.css': 'text/css', '.woff2': 'font/woff2', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg' };
const srv = http.createServer(async (q, r) => { let u = decodeURIComponent(q.url.split('?')[0]); if (u === '/') u = '/index.html'; try { const b = await readFile(join(ROOT, u)); r.writeHead(200, { 'content-type': MIME[extname(u)] || 'application/octet-stream' }); r.end(b); } catch { r.writeHead(404); r.end(); } }).listen(0);
const br = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
const ctx = await br.newContext({ viewport: { width: 1600, height: 900 } });
await ctx.addInitScript(() => { if (!localStorage.getItem('gdbd_profile')) localStorage.setItem('gdbd_profile', JSON.stringify({ seen: { intro: true, help: true, tut: true, granny: true }, stats: { embers: 20000, matches: 30, escapes: 12, kills: 3 }, killer: { char: 'granny', perks: [] }, survivor: { char: 'mara', perks: [] } })); localStorage.setItem('gdbd_settings', JSON.stringify({ quality: 'low', name: 'Froody' })); window.__nbNoRTC = true; window.__nbMqtt = ['ws://127.0.0.1:1']; });
const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', e => errs.push(e.message));
await pg.goto(`http://localhost:${srv.address().port}/public/index.html`, { timeout: 240000 });
await pg.waitForFunction(() => window.__nb && document.getElementById('loading').classList.contains('hidden'), null, { timeout: 300000 });
await pg.addStyleTag({ content: '#announce{display:none!important}' });
await pg.waitForTimeout(1500);
await pg.click('#profile'); await pg.waitForTimeout(800);
await pg.click('[data-bn="midnight"]'); await pg.waitForTimeout(300); await pg.click('[data-tt="escape"]'); await pg.waitForTimeout(300);
await pg.click('[data-av="angeline"]'); await pg.waitForTimeout(600);
await pg.fill('#pf-motto', 'She hums. I run.'); await pg.press('#pf-motto', 'Tab'); await pg.waitForTimeout(500);
await pg.screenshot({ path: OUT + '-profile.png' });
console.log('card', JSON.stringify(await pg.evaluate(() => window.__nb.profile.card)));
await pg.evaluate(() => document.getElementById('panel-close').click()); await pg.waitForTimeout(300);
// store > codes
await pg.evaluate(() => document.querySelector('#mainnav button[data-act="store"]')?.click()); await pg.waitForTimeout(800);
await pg.evaluate(() => document.querySelector('#st-tabs [data-t="codes"]').click()); await pg.waitForTimeout(800);
await pg.fill('#cd-in', 'ABCD-EFGH-JKLM'); await pg.click('#cd-go'); console.log('bad code:', await pg.textContent('#cd-msg'));
if (CODE) { await pg.fill('#cd-in', CODE.toLowerCase()); await pg.click('#cd-go'); console.log('secret:', await pg.textContent('#cd-msg')); await pg.waitForTimeout(4000); await pg.fill('#cd-in', CODE); await pg.click('#cd-go'); console.log('again:', await pg.textContent('#cd-msg')); }
await pg.selectOption('#cd-char', 'granny'); await pg.waitForTimeout(500);
const before = await pg.evaluate(() => window.__nb.profile.stats.embers);
await pg.click('#cd-buy'); await pg.waitForTimeout(600);
const gift = await pg.evaluate(() => window.__nb.profile.gifts.at(-1));
console.log('gift bought', gift.code, gift.name, 'embers', before, '->', await pg.evaluate(() => window.__nb.profile.stats.embers));
await pg.screenshot({ path: OUT + '-codes.png' });
// characters tab: the Showbear outfit shows for Mara now
await pg.evaluate(() => document.querySelector('#st-tabs [data-t="characters"]').click()); await pg.waitForTimeout(800);
await pg.evaluate(() => document.querySelector('.cs-roles [data-role="killer"]').click()); await pg.waitForTimeout(800);
await pg.evaluate(() => document.querySelector('.cs-por[data-c="granny"]').click()); await pg.waitForTimeout(800);
const of = await pg.evaluate(() => [...document.querySelectorAll('.of')].map(e => e.dataset.s + ':' + e.className).join(' '));
console.log('granny outfits', of, 'detail:', await pg.evaluate(() => document.querySelector('.cs-detail .rk') && document.querySelector('.cs-detail .rk').textContent));
if (of.includes('freddy')) { await pg.evaluate(() => document.querySelector('.of[data-s="freddy"]').click()); await pg.waitForTimeout(2500); await pg.screenshot({ path: OUT + '-bear.png' }); }
// a second player redeems the gift
const ctx2 = await br.newContext({ viewport: { width: 1280, height: 720 } });
await ctx2.addInitScript(() => { localStorage.setItem('gdbd_profile', JSON.stringify({ seen: { intro: true, help: true, tut: true, granny: true }, killer: { char: 'granny', perks: [] }, survivor: { char: 'mara', perks: [] } })); localStorage.setItem('gdbd_settings', JSON.stringify({ quality: 'low', name: 'Friend' })); window.__nbNoRTC = true; window.__nbMqtt = ['ws://127.0.0.1:1']; });
const p2 = await ctx2.newPage(); p2.on('pageerror', e => errs.push('p2 ' + e.message));
await p2.goto(`http://localhost:${srv.address().port}/public/index.html`, { timeout: 240000 });
await p2.waitForFunction(() => window.__nb && document.getElementById('loading').classList.contains('hidden'), null, { timeout: 300000 });
await p2.addStyleTag({ content: '#announce{display:none!important}' });
await p2.evaluate(() => document.querySelector('#mainnav button[data-act="store"]')?.click()); await p2.waitForTimeout(600);
await p2.evaluate(() => document.querySelector('#st-tabs [data-t="codes"]').click()); await p2.waitForTimeout(600);
await p2.fill('#cd-in', gift.code); await p2.click('#cd-go'); console.log('friend:', await p2.textContent('#cd-msg'), JSON.stringify(await p2.evaluate(c => window.__nb.profile.owned, gift.code)));
console.log('errors', errs);
await br.close(); srv.close();
