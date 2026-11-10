// text overlays + title card for the 1.3.2 trailer (transparent 1920x1080 PNGs, the game's own fonts)
const { chromium } = require('playwright');
const F = 'file:///home/user/granny-x-dbd/public/';
const css = `@font-face{font-family:Bebas;src:url(${F}fonts/bebas-neue.woff2)}@font-face{font-family:Fell;src:url(${F}fonts/im-fell-sc.woff2)}@font-face{font-family:Cond;font-weight:600;src:url(${F}fonts/barlow-cond-600.woff2)}
html,body{margin:0;width:1920px;height:1080px;overflow:hidden;background:transparent}
.cap{position:absolute;left:0;right:0;bottom:150px;text-align:center}
.cap b{display:inline-block;font:400 104px/1 Bebas;letter-spacing:6px;color:#f2ebdf;text-shadow:0 4px 30px rgba(0,0,0,.95),0 0 4px #000}
.cap b i{font-style:normal;color:#e02a1e}
.cap small{display:block;margin-top:14px;font:600 32px Cond;letter-spacing:6px;text-transform:uppercase;color:#e8a080;text-shadow:0 2px 14px #000}
.cap:before{content:'';display:block;width:240px;height:3px;margin:0 auto 26px;background:linear-gradient(90deg,transparent,#e02a1e,transparent)}
.side{position:absolute;left:110px;top:50%;transform:translateY(-50%);max-width:760px}
.side b{display:block;font:400 132px/0.92 Bebas;letter-spacing:5px;color:#f2ebdf;text-shadow:0 4px 30px #000}
.side b i{font-style:normal;color:#e02a1e}
.side small{display:block;margin-top:22px;font:600 34px/1.35 Cond;letter-spacing:4px;text-transform:uppercase;color:#d8c8b8}
.title{position:absolute;inset:0;background:radial-gradient(ellipse at 50% 42%,#2a0808 0%,#0a0303 55%,#030101 100%)}
.title .art{position:absolute;inset:0;background:url(${F}img/granny-banner.webp) 78% 30%/auto 108% no-repeat;opacity:.33;filter:saturate(.6);mask-image:linear-gradient(90deg,transparent 30%,#000 75%)}
.title .lg{position:absolute;left:50%;top:300px;transform:translateX(-50%);display:flex;align-items:center;gap:34px}
.title .lg span{display:block;width:660px;height:288px;background:url(${F}img/granny-logo.png) center/contain no-repeat;filter:drop-shadow(0 6px 30px #000)}
.title .lg i{font:400 120px Bebas;color:#e02a1e;font-style:normal}.title .lg em{font:400 230px/1 Bebas;color:#f2ebdf;font-style:normal;letter-spacing:8px}
.title .up{position:absolute;left:0;right:0;top:650px;text-align:center;font:400 96px Bebas;letter-spacing:22px;color:#f2ebdf}
.title .up i{font-style:normal;color:#e02a1e}
.title .on{position:absolute;left:0;right:0;top:770px;text-align:center;font:600 38px Cond;letter-spacing:14px;color:#e8a080;text-transform:uppercase}
.title .dc{position:absolute;left:0;right:0;bottom:70px;text-align:center;font:600 28px Cond;letter-spacing:6px;color:#8a7e74}
.title .ln{position:absolute;left:50%;top:752px;width:520px;height:2px;transform:translateX(-50%);background:linear-gradient(90deg,transparent,#e02a1e,transparent)}`;
const items = {
  t1: `<div class="cap"><b>THEY'VE BEEN <i>PRACTISING.</i></b></div>`,
  t2: `<div class="cap"><b>THEY <i>SPLIT UP.</i></b></div>`,
  t3: `<div class="cap"><b>THEY KNOW <i>WHERE SHE IS.</i></b><small>and they tell each other</small></div>`,
  t4: `<div class="cap"><b>THEY LOOP. THEY HEAL.</b><small>and they won't lead her to you</small></div>`,
  t5: `<div class="cap"><b>HER SLAM STILL <i>HURTS.</i></b><small>it just can't put you down anymore</small></div>`,
  u1: `<div class="side"><b>MAKE IT <i>YOURS.</i></b><small>Profile cards<br>avatar · banner · title · motto</small></div>`,
  u2: `<div class="side"><b>GIFT AN <i>OUTFIT.</i></b><small>Buy it as a gift<br>send the code · they redeem it</small></div>`,
  title: `<div class="title"><div class="art"></div><div class="lg"><span></span><i>×</i><em>DBD</em></div><div class="up">UPDATE <i>1.3.2</i></div><div class="ln"></div><div class="on">Out now · PC &amp; Android</div><div class="dc">discord.gg/WXvAJ2sgVP</div></div>`,
};
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  for (const [k, html] of Object.entries(items)) {
    require('fs').writeFileSync('/tmp/claude-0/tr/ov/_o.html', `<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head><body>${html}</body></html>`);
    await p.goto('file:///tmp/claude-0/tr/ov/_o.html'); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(400);
    await p.screenshot({ path: `/tmp/claude-0/tr/ov/${k}.png`, omitBackground: k !== 'title' });
  }
  await b.close(); console.log('overlays done');
})();
