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
.title .up{position:absolute;left:0;right:0;top:650px;text-align:center;font:400 88px Bebas;letter-spacing:16px;color:#f2ebdf}
.title .up i{font-style:normal;color:#e02a1e}
.title .on{position:absolute;left:0;right:0;top:770px;text-align:center;font:600 38px Cond;letter-spacing:14px;color:#e8a080;text-transform:uppercase}
.title .dc{position:absolute;left:0;right:0;bottom:105px;text-align:center;font:600 56px Cond;letter-spacing:3px;color:#f2ebdf}
.title .ln{position:absolute;left:50%;top:752px;width:520px;height:2px;transform:translateX(-50%);background:linear-gradient(90deg,transparent,#e02a1e,transparent)}`;
const items = {
  v1: `<div class="cap"><b>SOMETHING NEW IS <i>HUNTING</i> TONIGHT.</b></div>`,
  v2: `<div class="cap"><small style="margin:0 0 14px">Granny's new legendary skin</small><b>FREDDY <i>FAZBEAR</i></b></div>`,
  v3: `<div class="cap"><b>FREE FOR THE <i>FIRST 10</i></b><small>members of the official Discord</small></div>`,
  pg: `<div class="cap"><b>PLAY AS <i>GRANNY</i></b></div>`,
  pp: `<div class="cap"><b>PLAY AS <i>GRANDPA</i></b></div>`,
  ps: `<div class="cap"><b>PLAY AS <i>SLENDRINA</i></b></div>`,
  pa: `<div class="cap"><b>PLAY AS <i>ANGELINE</i></b></div>`,
  u1: `<div class="side"><b>PROFILE <i>CARDS.</i></b><small>avatar · banner · title · motto</small></div>`,
  u2: `<div class="side"><b>GIFT <i>OUTFITS.</i></b><small>buy it as a gift<br>send the code · they redeem it</small></div>`,
  sb: `<div class="cap"><b>+ SMARTER <i>BOTS</i></b><small>they split up, heal each other and loop</small></div>`,
  title: `<div class="title"><div class="art"></div><div class="lg"><span></span><i>×</i><em>DBD</em></div><div class="up">UPDATE <i>1.3.2</i> · OUT NOW</div><div class="ln"></div><div class="on">First 10 Discord members get Freddy Fazbear</div><div class="dc">discord.gg/WXvAJ2sgVP</div></div>`,
};
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  for (const [k, html] of Object.entries(items)) {
    require('fs').writeFileSync('/tmp/claude-0/tr/ov2/_o.html', `<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head><body>${html}</body></html>`);
    await p.goto('file:///tmp/claude-0/tr/ov2/_o.html'); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(400);
    await p.screenshot({ path: `/tmp/claude-0/tr/ov2/${k}.png`, omitBackground: k !== 'title' });
  }
  await b.close(); console.log('overlays done');
})();
