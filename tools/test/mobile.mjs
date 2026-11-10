// mobile mode check: menu, help, settings, match HUD (survivor + angeline) on an emulated phone (1280 CSS px like the APK)
import { chromium } from 'playwright';
import http from 'node:http'; import { readFile } from 'node:fs/promises'; import { join, extname } from 'node:path';
const ROOT = '/home/user/granny-x-dbd';
const MIME = { '.js': 'text/javascript', '.html': 'text/html', '.css': 'text/css', '.woff2': 'font/woff2', '.glb': 'model/gltf-binary', '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };
const srv = http.createServer(async (q, r) => { let u = decodeURIComponent(q.url.split('?')[0]); if (u === '/') u = '/index.html'; try { const b = await readFile(join(ROOT, u)); r.writeHead(200, { 'content-type': MIME[extname(u)] || 'application/octet-stream' }); r.end(b); } catch { r.writeHead(404); r.end(); } }).listen(0);
const br = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
const errs = [];
async function run(role, killer, pre) {
  const ctx = await br.newContext({ viewport: { width: 1280, height: 600 }, isMobile: true, hasTouch: true, userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36' });
  await ctx.addInitScript(([killer]) => { localStorage.setItem('gdbd_profile', JSON.stringify({ seen: { intro: true, help: true, tut: true }, killer: { char: killer, perks: [] }, survivor: { char: 'mara', perks: [] } })); localStorage.setItem('gdbd_settings', JSON.stringify({ quality: 'low', name: 'Tester' })); window.__nbMqtt = ['ws://127.0.0.1:1']; }, [killer]);
  const pg = await ctx.newPage(); pg.on('pageerror', e => errs.push(e.message));
  await pg.goto(`http://localhost:${srv.address().port}/index.html`);
  await pg.waitForFunction(() => window.__nb && document.querySelector('#mainnav button'), null, { timeout: 120000 });
  await pg.addStyleTag({ content: '#announce{display:none!important}' });
  const click = q => pg.evaluate(q => document.querySelector(q).click(), q);
  if (pre === 'ms') {
    console.log('html.mobile', await pg.evaluate(() => document.documentElement.className));
    await click('[data-act="help"]'); await pg.waitForTimeout(700); await pg.screenshot({ path: pre + '_help.png' });
    console.log('help kbds', await pg.evaluate(() => [...new Set([...document.querySelectorAll('#p-help kbd')].map(k => k.textContent))].join(' ')));
    await click('#panel-close'); await pg.waitForTimeout(300); await click('[data-act="settings"]'); await pg.waitForTimeout(700); await pg.screenshot({ path: pre + '_set.png' });
    await click('#panel-close'); await pg.waitForTimeout(300); await click('[data-act="loadout"]'); await pg.waitForTimeout(700);
  }
  await click(`#mainnav button[data-act="play-${role}"]`); await pg.waitForTimeout(600);
  await pg.selectOption('#bots-map', 'granny');
  if (role === 'survivor') await pg.selectOption('#bots-killer', killer);
  await click('#btn-bots-start');
  await pg.waitForFunction(() => window.__nb.session && window.__nb.session.game && window.__nb.session.sim && window.__nb.session.sim.S.t > 0.5, null, { timeout: 240000 });
  await pg.waitForTimeout(6000);
  await pg.screenshot({ path: pre + '_hud.png' });
  // every <kbd> and text in the HUD: no key names
  console.log(pre, 'HUD kbds:', await pg.evaluate(() => [...document.querySelectorAll('#hud kbd, #power kbd, #item kbd')].map(k => k.textContent).join(' ')), '| buttons:', await pg.evaluate(() => [...document.querySelectorAll('#touch .tc-b')].map(b => b.textContent).join(' ')));
  await ctx.close();
}
await run('survivor', 'angeline', 'ms');
await run('killer', 'angeline', 'mk');
await run('killer', 'granny', 'mg');
console.log('errors', errs); await br.close(); srv.close();
