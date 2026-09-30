// ===== env.js : 背景・エフェクト（環境担当） =====
// All drawing is deterministic in t (A.rng / A.hash / A.noise only). Expensive static layers are cached in
// offscreen canvases (memoized per option-set); only the live parts are redrawn each frame.
(function () {
  const A = window.A; const W = A.W, H = A.H; const TAU = Math.PI * 2;
  const E = (A.env = A.env || {});

  // ------------------------------------------------------------------ utilities
  const mk = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; };
  const memo = new Map();
  const cached = (key, fn) => { let v = memo.get(key); if (v === undefined) { v = fn(); memo.set(key, v); } return v; };
  // small LRU caches for scale/param dependent layers
  const lru = {};
  const cachedLRU = (group, key, fn, max = 6) => {
    const m = (lru[group] = lru[group] || new Map());
    if (m.has(key)) { const v = m.get(key); m.delete(key); m.set(key, v); return v; }
    const v = fn(); m.set(key, v); while (m.size > max) m.delete(m.keys().next().value); return v;
  };
  // option helper: null/undefined entries of o fall back to defaults
  const opt = (o, d) => { const r = Object.assign({}, d); if (o) for (const k in o) if (o[k] != null) r[k] = o[k]; return r; };
  const quantScale = (s, max = 2) => Math.min(max, Math.max(0.25, Math.pow(2, Math.ceil(Math.log2(Math.max(0.01, s)) * 2 - 1e-6) / 2)));

  const _cc = new Map();
  const rgb = (c) => {
    let v = _cc.get(c); if (v) return v;
    if (c[0] === '#') { let h = c.slice(1); if (h.length === 3) h = h.split('').map((x) => x + x).join(''); const n = parseInt(h.slice(0, 6), 16); v = [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
    else { const m = (c.match(/[\d.]+/g) || [255, 255, 255]).map(Number); v = [m[0], m[1], m[2]]; }
    _cc.set(c, v); return v;
  };
  const rgba = (c, a) => { const v = rgb(c); return `rgba(${v[0] | 0},${v[1] | 0},${v[2] | 0},${A.clamp(a)})`; };
  const mixc = (c1, c2, k) => { const a = rgb(c1), b = rgb(c2); const f = (i) => Math.round(a[i] + (b[i] - a[i]) * k); return `rgb(${f(0)},${f(1)},${f(2)})`; };
  const frac = (x) => x - Math.floor(x);
  const gauss = (r) => { let s = 0; for (let i = 0; i < 4; i++) s += r(); return (s - 2) / 0.577; }; // ~N(0,1)

  // ------------------------------------------------------------------ sprites
  const glowSprite = (color) => cached('glow|' + color, () => {
    const S = 128, c = mk(S, S), g = c.getContext('2d'); const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, rgba(color, 1)); gr.addColorStop(0.25, rgba(color, 0.45)); gr.addColorStop(0.6, rgba(color, 0.12)); gr.addColorStop(1, rgba(color, 0));
    g.fillStyle = gr; g.fillRect(0, 0, S, S); return c;
  });
  const coreSprite = (color) => cached('core|' + color, () => {
    const S = 64, c = mk(S, S), g = c.getContext('2d'); const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, rgba('#ffffff', 1)); gr.addColorStop(0.18, rgba(mixc('#ffffff', color, 0.35), 0.9)); gr.addColorStop(0.42, rgba(color, 0.32));
    gr.addColorStop(0.75, rgba(color, 0.06)); gr.addColorStop(1, rgba(color, 0));
    g.fillStyle = gr; g.fillRect(0, 0, S, S); return c;
  });
  // four-pointed sparkle (long thin spikes + soft center)
  const sparkSprite = (color, thin = 1) => cached('spark|' + color + '|' + thin, () => {
    const S = 256, c = mk(S, S), g = c.getContext('2d'); g.translate(128, 128);
    const ctl = 3.2 * thin;
    g.beginPath();
    for (let k = 0; k < 4; k++) {
      const a = (k * TAU) / 4, an = ((k + 1) * TAU) / 4, am = a + TAU / 8;
      if (k === 0) g.moveTo(Math.cos(a) * 126, Math.sin(a) * 126);
      g.quadraticCurveTo(Math.cos(am) * ctl, Math.sin(am) * ctl, Math.cos(an) * 126, Math.sin(an) * 126);
    }
    g.closePath();
    const gr = g.createRadialGradient(0, 0, 0, 0, 0, 126);
    gr.addColorStop(0, rgba('#ffffff', 1)); gr.addColorStop(0.1, rgba(mixc('#ffffff', color, 0.4), 0.95)); gr.addColorStop(0.4, rgba(color, 0.5)); gr.addColorStop(1, rgba(color, 0));
    g.fillStyle = gr; g.fill();
    const g2 = g.createRadialGradient(0, 0, 0, 0, 0, 44);
    g2.addColorStop(0, rgba('#ffffff', 0.9)); g2.addColorStop(0.3, rgba(color, 0.35)); g2.addColorStop(1, rgba(color, 0));
    g.fillStyle = g2; g.beginPath(); g.arc(0, 0, 44, 0, TAU); g.fill();
    return c;
  });
  const spr = (ctx, img, x, y, r, a) => { if (a <= 0.004 || r <= 0.15) return; ctx.globalAlpha = a > 1 ? 1 : a; ctx.drawImage(img, x - r, y - r, r * 2, r * 2); };
  const sprRot = (ctx, img, x, y, r, a, rot) => {
    if (a <= 0.004 || r <= 0.15) return; ctx.globalAlpha = a > 1 ? 1 : a;
    if (!rot) { ctx.drawImage(img, x - r, y - r, r * 2, r * 2); return; }
    ctx.translate(x, y); ctx.rotate(rot); ctx.drawImage(img, -r, -r, r * 2, r * 2); ctx.rotate(-rot); ctx.translate(-x, -y);
  };
  E.glow = (ctx, x, y, r, color, alpha = 1) => { ctx.save(); ctx.globalCompositeOperation = 'lighter'; spr(ctx, glowSprite(color), x, y, r, alpha); ctx.restore(); };
  E.sparkle = (ctx, x, y, r, color = '#fff2c0', alpha = 1, rot = 0) => { ctx.save(); ctx.globalCompositeOperation = 'lighter'; sprRot(ctx, sparkSprite(color), x, y, r, alpha, rot); ctx.restore(); };

  // =================================================================== SKY
  // Sky coordinates: x (px, same as screen when offsetX=0), h = height above the horizon (px).
  // screen: sx = x + offsetX ; sy = horizonY + offsetY - h
  const SKY = { x0: -260, w: 2440, hTop: 3150, hBot: -250 }; const SKY_H = SKY.hTop - SKY.hBot;
  const MOON = { x: 1565, h: 600, r: 40 };
  const GAPC = { cx: 905, ch: 822, R: 182 };
  const bandX = (h) => 330 + h * 0.4 + 55 * Math.sin(h * 0.0014 + 0.6);
  const BAND_N = [0.928, -0.371]; // perpendicular (in x,h) to band direction (0.371,0.928)
  const skyO = (o) => opt(o, { offsetY: 0, offsetX: 0, horizonY: 780, milkyWay: 1, moon: true, starBright: 1, gapPulse: 0, constellationGap: true, gapFilled: 0, warmGlow: 0.5 });
  E.skyPos = (x, h, o) => { o = skyO(o); return { x: x + o.offsetX, y: o.horizonY + o.offsetY - h }; };
  E.MOON = (o) => { const p = E.skyPos(MOON.x, MOON.h, o); p.r = MOON.r; return p; };

  // the known constellation ("the crown"): 7 stars on a bowl-shaped arc, index 3 is missing (the gap)
  const CROWN = (() => {
    const r = A.rng(4242); const out = []; const mags = [0.78, 0.6, 0.88, 1, 0.9, 0.58, 0.74];
    for (let k = 0; k < 7; k++) {
      const th = ((205 + (k * 130) / 6) * Math.PI) / 180; const rr = GAPC.R * (k === 3 ? 1 : 0.94 + r() * 0.12);
      out.push({ x: GAPC.cx + Math.cos(th) * rr + (k === 3 ? 0 : (r() - 0.5) * 16), h: GAPC.ch + Math.sin(th) * rr, m: mags[k], gap: k === 3 });
    }
    return out;
  })();
  E.GAP = (o) => E.skyPos(CROWN[3].x, CROWN[3].h, o);
  E.CROWN = (o) => CROWN.map((s) => Object.assign(E.skyPos(s.x, s.h, o), { m: s.m, gap: s.gap }));

  const STAR_COLS = ['#ffffff', '#ffffff', '#e4ecff', '#cbdcff', '#b8ccff', '#fff3dc', '#ffe6c4', '#ffd6e4'];
  const SKY_STOPS = [[3150, '#01020f'], [2500, '#03061d'], [1800, '#070c2e'], [1200, '#0c1444'], [800, '#131c58'], [520, '#1b2466'], [330, '#272a6e'], [200, '#342f74'], [110, '#393f80'], [50, '#40578e'], [15, '#4f739e'], [0, '#5f88aa'], [-250, '#27345f']];
  const skyCanvasXY = (x, h) => [x - SKY.x0, SKY.hTop - h];
  // --- layer: gradient + horizon glows + moon halo (full-res, no stars, no milky way)
  function skyBaseCanvas() {
    return cached('skyBase', () => {
      const c = mk(SKY.w, SKY_H), g = c.getContext('2d');
      const lg = g.createLinearGradient(0, 0, 0, SKY_H); for (const [h, col] of SKY_STOPS) lg.addColorStop(A.clamp((SKY.hTop - h) / SKY_H), col);
      g.fillStyle = lg; g.fillRect(0, 0, SKY.w, SKY_H);
      const [, hy] = skyCanvasXY(0, 0);
      const hg = g.createLinearGradient(0, hy - 300, 0, hy + 10);
      hg.addColorStop(0, rgba('#5fa3c0', 0)); hg.addColorStop(0.65, rgba('#6fb4cc', 0.1)); hg.addColorStop(1, rgba('#a6d4e0', 0.24));
      g.fillStyle = hg; g.fillRect(0, hy - 300, SKY.w, 310);
      // faint warm glow over the town side of the horizon
      g.save(); g.globalCompositeOperation = 'lighter'; g.translate(760 - SKY.x0, hy); g.scale(1, 0.3);
      const wg = g.createRadialGradient(0, 0, 0, 0, 0, 1000); wg.addColorStop(0, rgba('#ff9a6a', 0.16)); wg.addColorStop(0.5, rgba('#c86a8a', 0.06)); wg.addColorStop(1, rgba('#c86a8a', 0));
      g.fillStyle = wg; g.fillRect(-1000, -1000, 2000, 2000); g.restore();
      // moon halo
      const [mx, my] = skyCanvasXY(MOON.x, MOON.h); g.globalCompositeOperation = 'lighter';
      spr(g, glowSprite('#6f84e8'), mx, my, 820, 0.13); spr(g, glowSprite('#c9d6ff'), mx, my, 320, 0.2); spr(g, glowSprite('#fff6dc'), mx, my, 120, 0.3);
      g.globalAlpha = 1; return c;
    });
  }
  function skyStarsCanvas() {
    return cached('skyStars', () => {
      const c = mk(SKY.w, SKY_H), g = c.getContext('2d'); const r = A.rng(9001);
      const [mx, my] = skyCanvasXY(MOON.x, MOON.h);
      const put = (x, h, rad, a, col) => {
        const [cx, cy] = skyCanvasXY(x, h); if (h < -30) return;
        a *= A.smooth((h + 40) / 380) * (0.25 + 0.75 * A.clamp((Math.hypot(cx - mx, cy - my) - 50) / 300)); if (a < 0.02) return;
        g.fillStyle = rgba(col, a);
        if (rad < 0.75) g.fillRect(cx - rad, cy - rad, rad * 2 + 0.3, rad * 2 + 0.3);
        else { g.beginPath(); g.arc(cx, cy, rad, 0, TAU); g.fill(); }
      };
      for (let i = 0; i < 10000; i++) {
        const x = SKY.x0 + r() * SKY.w, h = SKY.hBot + r() * SKY_H; const m = Math.pow(r(), 3.2);
        put(x, h, 0.38 + m * 1.2, 0.2 + 0.7 * Math.pow(r(), 1.6) + m * 0.3, STAR_COLS[(r() * STAR_COLS.length) | 0]);
      }
      for (let i = 0; i < 30000; i++) {
        const h = -100 + r() * 3300; const d = gauss(r) * 135 * (0.7 + 0.5 * A.noise(h * 0.004, 3));
        const x = bandX(h) + d * BAND_N[0]; const hh = h + d * BAND_N[1];
        const clump = 0.5 + 0.5 * A.noise2(x * 0.012, hh * 0.012, 7);
        if (r() > 0.3 + 0.7 * clump) continue;
        const m = Math.pow(r(), 4);
        put(x, hh, 0.33 + m * 0.9, (0.18 + 0.55 * r()) * (0.5 + clump * 0.7), STAR_COLS[(r() * STAR_COLS.length) | 0]);
      }
      g.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 320; i++) {
        const x = SKY.x0 + r() * SKY.w, h = r() * SKY.hTop; const col = STAR_COLS[(r() * STAR_COLS.length) | 0];
        const a = A.smooth((h + 40) / 380); const [cx, cy] = skyCanvasXY(x, h); const z = 0.7 + r() * 0.8;
        g.globalAlpha = 0.3 * a; g.drawImage(glowSprite(col), cx - 8 * z, cy - 8 * z, 16 * z, 16 * z);
        g.globalAlpha = 0.9 * a; g.drawImage(coreSprite(col), cx - 2.2 * z, cy - 2.2 * z, 4.4 * z, 4.4 * z);
      }
      g.globalAlpha = 1; return c;
    });
  }
  // milky way: built at half resolution, blurred, then upscaled once into a full-res layer
  function skyMilkyCanvas() {
    return cached('skyMilky', () => {
      const S = 0.5; const w = SKY.w * S, hh = SKY_H * S;
      const c = mk(w, hh), g = c.getContext('2d'); g.scale(S, S); const r = A.rng(777);
      const P = (h, d) => skyCanvasXY(bandX(h) + d * BAND_N[0], h + d * BAND_N[1]);
      const inten = (h) => (0.5 + 0.5 * A.noise(h * 0.0024, 11)) * (0.6 + 0.4 * A.smooth((h - 100) / 900)) * (1 - 0.4 * A.smooth((h - 2700) / 500));
      const blob = (x, y, rad, col, a) => { g.globalAlpha = A.clamp(a); g.drawImage(glowSprite(col), x - rad, y - rad, rad * 2, rad * 2); };
      g.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 380; i++) { // faint wide veil
        const h = -150 + r() * 3400, d = gauss(r) * 170; const [x, y] = P(h, d);
        blob(x, y, 150 + r() * 160, ['#3c4db0', '#4a3fa0', '#2f6aa8', '#5a48a8'][(r() * 4) | 0], 0.06 * inten(h));
      }
      for (let i = 0; i < 1700; i++) { // body
        const h = -120 + r() * 3350, d = gauss(r) * 82; const [x, y] = P(h, d); const ad = Math.abs(d);
        const col = ad < 45 ? ['#ffd6b8', '#ffc8d8', '#fff0d4', '#f4d8ff'][(r() * 4) | 0] : ad < 100 ? ['#b890e8', '#d49ad8', '#94a8f0', '#e0a0c8'][(r() * 4) | 0] : ['#5a78d8', '#4f98c8', '#7662d0'][(r() * 3) | 0];
        const k = A.noise2(x * 0.005, y * 0.005, 2); blob(x, y, 30 + r() * 95, col, 0.085 * inten(h) * (0.35 + 0.65 * (k + 1)));
      }
      for (let i = 0; i < 7000; i++) { // clumps of unresolved stars
        const h = -100 + r() * 3300, d = gauss(r) * 70; const [x, y] = P(h, d);
        const cl = A.noise2(x * 0.011, y * 0.011, 5); if (cl < -0.05) continue;
        blob(x, y, 4 + r() * 16, ['#ffffff', '#ffe8d6', '#e8dcff', '#d6ecff'][(r() * 4) | 0], 0.11 * inten(h) * (cl + 0.25));
      }
      for (let i = 0; i < 90; i++) { // faint pink/teal nebula knots
        const h = r() * 3100, d = gauss(r) * 60; const [x, y] = P(h, d);
        blob(x, y, 20 + r() * 50, r() < 0.6 ? '#ff7fae' : '#6fe0e0', 0.08 * inten(h));
      }
      g.globalCompositeOperation = 'destination-out'; // dark rifts
      for (let i = 0; i < 2600; i++) {
        const h = -100 + r() * 3300; const lane = r() < 0.7 ? 0 : 1;
        const d = lane === 0 ? 14 * Math.sin(h * 0.0035) + 26 * A.noise(h * 0.006, 21) + gauss(r) * 11 : -48 + 34 * A.noise(h * 0.005, 31) + gauss(r) * 9;
        const [x, y] = P(h, d); const k = A.noise2(x * 0.009, y * 0.009, 9);
        blob(x, y, 8 + r() * 28, '#000000', (0.1 + 0.22 * r()) * (0.3 + 0.7 * (k + 1) / 2));
      }
      g.globalAlpha = 1;
      const out = mk(SKY.w, SKY_H), og = out.getContext('2d'); og.filter = 'blur(2.5px)'; og.imageSmoothingQuality = 'high'; og.drawImage(c, 0, 0, SKY.w, SKY_H); og.filter = 'none';
      return out;
    });
  }
  // --- fully composed static sky (fast path)
  function skyFullCanvas() {
    return cached('skyFull', () => {
      const c = mk(SKY.w, SKY_H), g = c.getContext('2d'); g.drawImage(skyBaseCanvas(), 0, 0);
      g.globalCompositeOperation = 'lighter'; g.drawImage(skyMilkyCanvas(), 0, 0); g.drawImage(skyStarsCanvas(), 0, 0); return c;
    });
  }
  const LIVE_STARS = (() => {
    const r = A.rng(31337); const out = [];
    for (let i = 0; i < 430; i++) {
      let x, h;
      if (r() < 0.3) { h = r() * 3100; const d = gauss(r) * 170; x = bandX(h) + d * BAND_N[0]; h += d * BAND_N[1]; }
      else { x = SKY.x0 + r() * SKY.w; h = 20 + r() * 3100; }
      const m = Math.pow(r(), 2.6);
      out.push({ x, h, m, col: STAR_COLS[(r() * STAR_COLS.length) | 0], f: 1.2 + r() * 3.5, ph: r() * TAU, flare: m > 0.72 });
    }
    return out;
  })();
  const MOON_SPRITE = () => cached('moon', () => {
    const R = MOON.r, S = 4, D = Math.ceil(R * 2 + 8) * S, c = mk(D, D), g = c.getContext('2d'); g.scale(S, S); const cx = D / S / 2, cy = cx;
    const lit = mk(D, D), lg = lit.getContext('2d'); lg.scale(S, S);
    const gr = lg.createRadialGradient(cx + R * 0.3, cy - R * 0.25, 0, cx, cy, R);
    gr.addColorStop(0, '#fffdf0'); gr.addColorStop(0.7, '#f7f1d8'); gr.addColorStop(1, '#e9dcb8');
    lg.fillStyle = gr; lg.beginPath(); lg.arc(cx, cy, R, 0, TAU); lg.fill();
    lg.globalCompositeOperation = 'source-atop'; const r = A.rng(55);
    for (let i = 0; i < 16; i++) { const a = r() * TAU, d = r() * R * 0.8; lg.fillStyle = rgba('#b9b7a8', 0.12 + r() * 0.16); lg.beginPath(); lg.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d, R * (0.08 + r() * 0.2), 0, TAU); lg.fill(); }
    lg.globalCompositeOperation = 'destination-out';
    const sx = cx - R * 0.62, sy = cy - R * 0.18, sr = R * 1.02; const sg = lg.createRadialGradient(sx, sy, sr * 0.9, sx, sy, sr);
    sg.addColorStop(0, 'rgba(0,0,0,1)'); sg.addColorStop(1, 'rgba(0,0,0,0)'); lg.fillStyle = sg; lg.beginPath(); lg.arc(sx, sy, sr, 0, TAU); lg.fill();
    g.fillStyle = rgba('#6d78b8', 0.22); g.beginPath(); g.arc(cx, cy, R, 0, TAU); g.fill();
    g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(lit, 0, 0);
    return c;
  });

  E.sky = function (ctx, t, o) {
    o = skyO(o);
    const HY = o.horizonY + o.offsetY, OX = o.offsetX; const sy = (h) => HY - h; const top = sy(SKY.hTop), bot = sy(SKY.hBot);
    ctx.save();
    // beyond-cache fill (only visible when panning past the cached area)
    if (top > -400) { ctx.fillStyle = SKY_STOPS[0][1]; ctx.fillRect(-1200, -1600, W + 2400, top + 1601); }
    if (bot < H + 400) { ctx.fillStyle = SKY_STOPS[SKY_STOPS.length - 1][1]; ctx.fillRect(-1200, bot - 1, W + 2400, H + 1600 - bot); }
    const sb = A.clamp(o.starBright, 0, 2), mw = A.clamp(o.milkyWay);
    if (Math.abs(sb - 1) < 0.01 && mw > 0.99) ctx.drawImage(skyFullCanvas(), SKY.x0 + OX, top);
    else {
      ctx.drawImage(skyBaseCanvas(), SKY.x0 + OX, top); ctx.globalCompositeOperation = 'lighter';
      if (mw > 0) { ctx.globalAlpha = mw; ctx.drawImage(skyMilkyCanvas(), SKY.x0 + OX, top); }
      if (sb > 0) { ctx.globalAlpha = Math.min(1, sb); ctx.drawImage(skyStarsCanvas(), SKY.x0 + OX, top); }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }
    if (o.warmGlow > 0.5) { // extra warmth (e.g. when the whole town is lit)
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.translate(760 + OX, sy(0)); ctx.scale(1, 0.3);
      const k = (o.warmGlow - 0.5) * 2; const wg = ctx.createRadialGradient(0, 0, 0, 0, 0, 900); wg.addColorStop(0, rgba('#ff9a5a', 0.3 * k)); wg.addColorStop(0.5, rgba('#d4708a', 0.1 * k)); wg.addColorStop(1, rgba('#d4708a', 0));
      ctx.fillStyle = wg; ctx.fillRect(-900, -900, 1800, 1800); ctx.restore();
    }
    ctx.globalCompositeOperation = 'lighter';
    if (sb > 0) {
      const mx = MOON.x + OX, my = sy(MOON.h);
      for (let i = 0; i < LIVE_STARS.length; i++) {
        const s = LIVE_STARS[i]; const x = s.x + OX, y = sy(s.h); if (x < -40 || x > W + 40 || y < -40 || y > H + 40) continue;
        const dm = Math.hypot(x - mx, y - my); const moonDim = o.moon ? A.clamp((dm - 60) / 260) * 0.8 + 0.2 : 1;
        const tw = 0.62 + 0.25 * Math.sin(t * s.f + s.ph) + 0.2 * A.noise(t * 2.6 + i * 1.7, 4);
        const a = tw * sb * moonDim * A.smooth((s.h + 20) / 320) * (0.5 + 0.5 * s.m);
        const sz = 1 + s.m * 2.3;
        spr(ctx, coreSprite(s.col), x, y, sz * 3.2, a);
        if (s.flare) spr(ctx, sparkSprite(s.col), x, y, sz * (5 + 4 * tw), a * 0.6 * (s.m - 0.6) * 2.5);
      }
    }
    if (o.constellationGap) {
      const pts = CROWN.map((s) => ({ x: s.x + OX, y: sy(s.h), m: s.m, gap: s.gap }));
      const la = 0.06 + 0.32 * o.gapPulse; ctx.lineWidth = 1.2; ctx.lineCap = 'round';
      for (let k = 0; k < 6; k++) {
        const p0 = pts[k], p1 = pts[k + 1]; const dx = p1.x - p0.x, dy = p1.y - p0.y, L = Math.hypot(dx, dy); const ux = dx / L, uy = dy / L;
        const touchesGap = p0.gap || p1.gap;
        ctx.setLineDash(touchesGap && o.gapFilled < 0.5 ? [4, 7] : []);
        ctx.strokeStyle = rgba('#bcd2ff', la * (touchesGap ? 0.8 : 1));
        ctx.beginPath(); ctx.moveTo(p0.x + ux * 12, p0.y + uy * 12); ctx.lineTo(p1.x - ux * 12, p1.y - uy * 12); ctx.stroke();
      }
      ctx.setLineDash([]);
      for (const p of pts) {
        if (p.gap) continue; const tw = 0.85 + 0.15 * Math.sin(t * 2.3 + p.x);
        spr(ctx, glowSprite('#cfe0ff'), p.x, p.y, 24 + 16 * p.m, 0.4 * tw * sb);
        spr(ctx, coreSprite('#f4f7ff'), p.x, p.y, 5 + 4 * p.m, Math.min(1, sb));
        spr(ctx, sparkSprite('#dfe8ff'), p.x, p.y, 12 + 16 * p.m * tw, 0.6 * p.m * Math.min(1, sb));
      }
      const G = pts[3];
      if (o.gapPulse > 0) {
        const pu = o.gapPulse * (0.65 + 0.35 * Math.sin(t * 3.2));
        spr(ctx, glowSprite('#9fb8ff'), G.x, G.y, 70, 0.35 * pu);
        const ph = frac(t * 0.8); ctx.strokeStyle = rgba('#d8e4ff', 0.55 * pu * (1 - ph)); ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(G.x, G.y, 12 + 16 * ph, 0, TAU); ctx.stroke();
      }
      if (o.gapFilled > 0) {
        const f = o.gapFilled; spr(ctx, glowSprite(A.PAL.star), G.x, G.y, 60, 0.6 * f); spr(ctx, coreSprite(A.PAL.star), G.x, G.y, 10, f);
        spr(ctx, sparkSprite(A.PAL.star), G.x, G.y, 40, 0.8 * f);
      }
    }
    if (o.moon) {
      const mx = MOON.x + OX, my = sy(MOON.h);
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
      const ms = MOON_SPRITE(); const D = ms.width / 4; ctx.drawImage(ms, mx - D / 2, my - D / 2, D, D);
      ctx.globalCompositeOperation = 'lighter'; spr(ctx, glowSprite('#fffbe8'), mx + 12, my - 4, 64, 0.35);
    }
    ctx.restore();
  };

  // =================================================================== CLOUDS
  const CL_W = 1600, CL_H = 220;
  const cloudSprite = (v, warm) => cached('cloud' + v + '|' + warm, () => {
    const S = 0.5, w = CL_W, h = CL_H; const c = mk(w * S, h * S), g = c.getContext('2d'); g.scale(S, S); const r = A.rng(100 + v * 17);
    const fil = 2 + ((r() * 3) | 0); const tilt = (r() - 0.5) * 40, bend = 10 + r() * 25, ph = r() * TAU;
    const blob = (x, y, rx, ry, col, a) => { if (a <= 0.003) return; g.save(); g.translate(x, y); g.scale(rx / ry, 1); const gr = g.createRadialGradient(0, 0, 0, 0, 0, ry); gr.addColorStop(0, rgba(col, a)); gr.addColorStop(1, rgba(col, 0)); g.fillStyle = gr; g.beginPath(); g.arc(0, 0, ry, 0, TAU); g.fill(); g.restore(); };
    for (let pass = 0; pass < 2; pass++) {
      const rr = A.rng(300 + v * 31); g.globalCompositeOperation = pass ? 'lighter' : 'source-over';
      for (let f = 0; f < fil; f++) {
        const off = (f - (fil - 1) / 2) * (22 + rr() * 16), u0 = rr() * 0.25, u1 = 0.75 + rr() * 0.25, sh = (rr() - 0.5) * 60;
        for (let i = 0; i < 150; i++) {
          const u = u0 + (u1 - u0) * (i / 150) + (rr() - 0.5) * 0.01; const env = Math.pow(Math.max(0, Math.sin(A.clamp((u - u0) / (u1 - u0)) * Math.PI)), 0.8);
          const th = env * Math.max(0, 0.25 + 0.75 * A.noise(u * 9 + f * 5, v + 3)) * (0.6 + 0.4 * rr());
          const x = 80 + u * (w - 160) + sh * (off / 40); const y = h / 2 + off + tilt * (u - 0.5) + bend * Math.sin(u * Math.PI * 1.6 + ph + f) + A.noise(u * 14 + f, v) * 6;
          const rx = 30 + rr() * 70, ry = 4 + th * 16;
          if (!pass) blob(x, y, rx, ry, '#5a609c', 0.3 * th);
          else blob(x + 6, y - ry * 0.45, rx * 0.8, ry * 0.55, warm ? '#ffc6a8' : '#e4e2ff', (warm ? 0.16 : 0.14) * th);
        }
      }
    }
    const out = mk(w * S, h * S), og = out.getContext('2d'); og.filter = 'blur(1.5px)'; og.drawImage(c, 0, 0); return out;
  });
  const CLOUDS = [
    { h: 60, x: 250, v: 0, sp: 5, sc: 1.2, a: 0.7, warm: 1 }, { h: 115, x: 1350, v: 1, sp: 4, sc: 1.0, a: 0.6, warm: 1 },
    { h: 250, x: 1500, v: 2, sp: 8, sc: 1.0, a: 0.6 }, { h: 410, x: 380, v: 3, sp: 7, sc: 0.9, a: 0.55 },
    { h: 980, x: 1100, v: 4, sp: 11, sc: 1.2, a: 0.4 }, { h: 1550, x: 300, v: 5, sp: 9, sc: 1.4, a: 0.3 }, { h: 2150, x: 1500, v: 1, sp: 12, sc: 1.3, a: 0.25 },
  ];
  E.clouds = function (ctx, t, o) {
    o = opt(o, { offsetY: 0, offsetX: 0, horizonY: 780, alpha: 1 }); if (o.alpha <= 0) return;
    const HY = o.horizonY + o.offsetY; ctx.save();
    for (const c of CLOUDS) {
      const w = CL_W * c.sc, h = CL_H * c.sc;
      let x = c.x + t * c.sp; x = ((x + 1500) % 3900 + 3900) % 3900 - 1500 + o.offsetX; const y = HY - c.h;
      if (y + h / 2 < -20 || y - h / 2 > H + 20 || x + w / 2 < 0 || x - w / 2 > W) continue;
      ctx.globalAlpha = A.clamp(c.a * o.alpha); ctx.drawImage(cloudSprite(c.v, !!c.warm), x - w / 2, y - h / 2, w, h);
    }
    ctx.restore();
  };

  // =================================================================== SEA
  E.sea = function (ctx, t, o) {
    o = opt(o, { horizonY: 780, offsetY: 0, offsetX: 0, bottom: H + 200, moon: true });
    const HY = o.horizonY + o.offsetY; if (HY > o.bottom) return; const B = o.bottom;
    ctx.save();
    const g = ctx.createLinearGradient(0, HY, 0, Math.max(HY + 1, B));
    g.addColorStop(0, '#4a6394'); g.addColorStop(0.03, '#2c3a70'); g.addColorStop(0.2, '#1b2458'); g.addColorStop(1, '#0a0f31');
    ctx.fillStyle = g; ctx.fillRect(-1200, HY, W + 2400, B - HY);
    // ripple lines (perspective spacing)
    ctx.globalCompositeOperation = 'lighter'; const r = A.rng(606);
    for (let i = 0; i < 170; i++) {
      const d = Math.pow(r(), 1.8); const y = HY + 2 + d * (B - HY); if (y > H + 50) { r(); r(); continue; }
      const len = 20 + d * 260 * (0.4 + r()); const x = -100 + r() * (W + 200) + Math.sin(t * 0.4 + i) * 8 * (1 + d * 3);
      ctx.fillStyle = rgba('#8fa8e0', (0.05 + 0.08 * (1 - d)) * (0.6 + 0.4 * Math.sin(t * 1.3 + i * 2.1)));
      ctx.fillRect(x + o.offsetX * 0.3, y, len, 1 + d * 2);
    }
    // horizon bright line
    const hl = ctx.createLinearGradient(0, HY - 2, 0, HY + 6); hl.addColorStop(0, rgba('#c9dcff', 0)); hl.addColorStop(0.35, rgba('#c9dcff', 0.35)); hl.addColorStop(1, rgba('#c9dcff', 0));
    ctx.fillStyle = hl; ctx.fillRect(-1200, HY - 2, W + 2400, 8);
    // moon reflection shimmer
    if (o.moon) {
      const mx = MOON.x + o.offsetX; const rr = A.rng(707);
      ctx.save(); ctx.translate(mx, HY); ctx.scale(1, 1);
      const cg = ctx.createLinearGradient(0, 0, 0, Math.min(700, B - HY)); cg.addColorStop(0, rgba('#dfe6ff', 0.22)); cg.addColorStop(1, rgba('#dfe6ff', 0));
      ctx.fillStyle = cg; ctx.beginPath(); ctx.moveTo(-14, 0); ctx.lineTo(14, 0); ctx.lineTo(140, 700); ctx.lineTo(-140, 700); ctx.fill(); ctx.restore();
      for (let i = 0; i < 150; i++) {
        const d = Math.pow(rr(), 1.5); const y = HY + 2 + d * Math.min(650, B - HY); const spread = 10 + d * 150;
        const ph = rr() * TAU, fq = 1.5 + rr() * 2.5; const x0 = mx + (rr() - 0.5) * 2 * spread * (0.4 + 0.6 * rr()) + Math.sin(t * 0.9 + ph) * 6 * (1 + d * 2);
        const fl = Math.max(0, Math.sin(t * fq + ph) * 0.6 + 0.4 + 0.3 * A.noise(t * 3 + i, 8));
        const len = (6 + rr() * 30) * (0.5 + d * 2.2);
        ctx.fillStyle = rgba(i % 5 ? '#e8ecff' : '#fff6d8', fl * (0.55 - d * 0.35));
        ctx.fillRect(x0 - len / 2, y, len, 1 + d * 2.5);
      }
    }
    ctx.restore();
  };

  // =================================================================== MOUNTAINS
  const mtnProfiles = (seed) => cached('mtn' + seed, () => {
    const layers = [
      { col: '#3c4686', top: '#4a5a98', env: (x) => 150 * A.smooth((1150 - x) / 900) + 70 * A.smooth((x - 1450) / 500), rough: 0.5, f: 0.004, s: 1 },
      { col: '#252f6a', top: '#3a4a88', env: (x) => 105 * A.smooth((760 - x) / 700) + 58 * A.smooth((x - 1650) / 400), rough: 0.35, f: 0.007, s: 2 },
      { col: '#171f50', top: '#2c3a74', env: (x) => 52 * A.smooth((380 - x) / 500) + 34 * A.smooth((x - 1760) / 300), rough: 0.25, f: 0.012, s: 3 },
    ];
    for (const L of layers) {
      L.pts = [];
      for (let x = -400; x <= W + 400; x += 6) {
        const n = 1 - Math.abs(A.noise(x * L.f, seed * 10 + L.s)); const n2 = A.noise(x * L.f * 4, seed * 10 + L.s + 5) * 0.2;
        L.pts.push([x, Math.max(0, L.env(x) * (1 - L.rough + L.rough * (n + n2)))]);
      }
    }
    return layers;
  });
  const MT_TOP = 200, MT_PAD = 400;
  const mtnCanvas = (seed, height) => cachedLRU('mtnC', seed + '|' + height, () => {
    const layers = mtnProfiles(seed); const c = mk(W + MT_PAD * 2, MT_TOP + 8), g = c.getContext('2d'); const HY = MT_TOP; g.translate(MT_PAD, 0);
    layers.forEach((L, li) => {
      g.beginPath(); g.moveTo(L.pts[0][0], HY + 2); let maxh = 1;
      for (const [x, h] of L.pts) { g.lineTo(x, HY - h * height); maxh = Math.max(maxh, h * height); }
      g.lineTo(L.pts[L.pts.length - 1][0], HY + 2); g.closePath();
      const gr = g.createLinearGradient(0, HY - maxh, 0, HY); gr.addColorStop(0, L.top); gr.addColorStop(0.6, L.col); gr.addColorStop(1, mixc(L.col, '#6784ac', 0.45 - li * 0.1));
      g.fillStyle = gr; g.fill(); g.strokeStyle = rgba('#aab8ee', 0.16 - li * 0.03); g.lineWidth = 1.2; g.stroke();
    });
    const mg = g.createLinearGradient(0, HY - 60, 0, HY + 4); mg.addColorStop(0, rgba('#7f9cc4', 0)); mg.addColorStop(1, rgba('#8fb0d0', 0.28));
    g.fillStyle = mg; g.fillRect(-MT_PAD, HY - 60, W + MT_PAD * 2, 64);
    return c;
  }, 4);
  E.mountains = function (ctx, t, o) {
    o = opt(o, { horizonY: 780, offsetY: 0, offsetX: 0, seed: 1, height: 1, alpha: 1 });
    const HY = o.horizonY + o.offsetY; if (HY < -10 || HY - MT_TOP > H + 10) return;
    ctx.save(); ctx.globalAlpha = A.clamp(o.alpha); ctx.drawImage(mtnCanvas(o.seed, Math.round(o.height * 20) / 20), -MT_PAD + o.offsetX, HY - MT_TOP); ctx.restore();
  };

  // =================================================================== TOWN
  const WALLS = ['#2a2e5a', '#322e5e', '#26385e', '#372c56', '#2c3e58', '#393462', '#232c54', '#3e3358', '#2e4260'];
  const ROOFS = ['#522848', '#5e2c3e', '#223258', '#44244e', '#264452', '#563c36', '#66363c', '#2e2c58'];
  const townModel = (seed) => cached('townModel' + seed, () => {
    const r = A.rng(seed * 131 + 7);
    const ground = (x) => 26 + 340 * Math.exp(-Math.pow((x - 40) / 430, 2)) + 22 * A.noise(x * 0.01, seed) + 60 * Math.exp(-Math.pow((x + 420) / 180, 2));
    const rows = []; const windows = []; const trees = [];
    const NR = 12;
    for (let ri = 0; ri < NR; ri++) {
      const base = 24 + ri * 27; const row = []; let x = -620 + r() * 30;
      while (x < 700) {
        const w = 30 + r() * 30 + (r() < 0.12 ? 22 : 0);
        const gnd = Math.min(ground(x), ground(x + w));
        if (gnd < base + 20) { x += 10 + r() * 14; continue; }
        if (r() < 0.12) { trees.push({ ri, x: x + w * 0.4, y: -base, r: 10 + r() * 12, k: r() }); x += w * 0.7; continue; }
        if (r() < 0.08) { x += 6 + r() * 10; continue; }
        const hh = 30 + r() * 20 + (ri === 0 ? 6 : 0); const roofH = w * (0.38 + r() * 0.22); const side = r() < 0.2;
        const hs = { ri, x, y: -base, w, h: hh, roofH, side, wall: WALLS[(r() * WALLS.length) | 0], roof: ROOFS[(r() * ROOFS.length) | 0], chim: r() < 0.45 ? { u: 0.2 + r() * 0.6, w: 5 + r() * 3, h: 10 + r() * 8 } : null, door: ri === 0 && r() < 0.6, wins: [] };
        const cols = w > 52 ? 3 : w > 38 ? 2 : 1; const wrows = hh > 40 ? 2 : 1;
        for (let wr = 0; wr < wrows; wr++) for (let wc = 0; wc < cols; wc++) {
          if (hs.door && wr === wrows - 1 && wc === 0 && cols > 1) continue;
          const wx = x + (w * (wc + 0.5)) / cols - 3.5, wy = -base - hh + 9 + wr * 17;
          const win = { x: wx, y: wy, w: 7, h: 9, row: ri, rank: 0, hue: r(), house: hs };
          hs.wins.push(win); windows.push(win);
        }
        row.push(hs); x += w + 2 + r() * 8;
      }
      rows.push(row);
    }
    // clock tower on the ridge
    const tower = { x: 50, base: 24 + 8 * 27, w: 40, h: 150, ri: 8 };
    for (const row of rows) for (let i = row.length - 1; i >= 0; i--) { const hs = row[i]; if (hs.ri >= 8 && hs.ri <= 9 && hs.x < tower.x + tower.w / 2 + 4 && hs.x + hs.w > tower.x - tower.w / 2 - 4) { for (const wi of hs.wins) windows.splice(windows.indexOf(wi), 1); row.splice(i, 1); } }
    tower.face = { x: tower.x, y: -tower.base - tower.h + 28 };
    tower.wins = [{ x: tower.x - 3.5, y: -tower.base - 62, w: 7, h: 12, row: 8 }, { x: tower.x - 3.5, y: -tower.base - 34, w: 7, h: 12, row: 8 }];
    for (const w of tower.wins) windows.push(Object.assign(w, { rank: 0, hue: 0.5 }));
    // rank for "lit" fraction (random scatter), cascade order (center outward w/ jitter)
    windows.forEach((w, i) => { w.rank = A.hash(i * 3.17 + seed * 11.3); w.key = Math.hypot(w.x - 40, (w.y + 150) * 1.6) + A.hash(i * 7.7 + seed) * 150; });
    windows.sort((a, b) => a.key - b.key);
    const boats = []; for (let i = 0; i < 6; i++) boats.push({ x: -520 + i * 190 + r() * 90, w: 34 + r() * 26, mast: r() < 0.7, col: ['#2d3262', '#5a2f48', '#244a5a', '#3e3470'][(r() * 4) | 0], ph: r() * TAU });
    const lamps = []; for (let x = -540; x < 660; x += 95 + r() * 30) lamps.push({ x });
    return { ground, rows, windows, trees, tower, boats, lamps, lh: { x: -728, y: -60 - 118 } };
  });
  E.townWindowCount = (o) => townModel((o && o.seed) || 1).windows.length;
  const T_PADL = 900, T_PADT = 560, T_W = 1800, T_H = 620; // cache box in unscaled town units
  const townCanvas = (seed, cs) => cachedLRU('town', seed + '|' + cs, () => {
    const M = townModel(seed); const c = mk(T_W * cs, T_H * cs), g = c.getContext('2d');
    g.scale(cs, cs); g.translate(T_PADL, T_PADT); g.lineJoin = 'round';
    // hill mass behind the houses
    g.beginPath(); g.moveTo(-640, -14);
    for (let x = -640; x <= 720; x += 8) g.lineTo(x, -M.ground(x) - (x > 600 ? (x - 600) * -0.1 : 0));
    g.lineTo(720, -14); g.closePath();
    let gr = g.createLinearGradient(0, -380, 0, 0); gr.addColorStop(0, '#26306a'); gr.addColorStop(0.5, '#1b2356'); gr.addColorStop(1, '#131a44');
    g.fillStyle = gr; g.fill();
    g.strokeStyle = rgba('#7f8fd0', 0.35); g.lineWidth = 1.5; g.beginPath(); for (let x = -640; x <= 720; x += 8) { const y = -M.ground(x); if (x === -640) g.moveTo(x, y); else g.lineTo(x, y); } g.stroke();
    // far treeline bumps on ridge
    const rt = A.rng(seed + 99);
    for (let i = 0; i < 90; i++) { const x = -600 + rt() * 1300; const y = -M.ground(x) + 6; if (M.ground(x) < 60) continue; g.fillStyle = mixc('#1d2658', '#2a356e', rt()); g.beginPath(); g.ellipse(x, y, 8 + rt() * 12, 7 + rt() * 9, 0, 0, TAU); g.fill(); }
    const drawTree = (tr) => {
      const y = tr.y; g.fillStyle = '#1a2a4c'; g.beginPath(); g.ellipse(tr.x, y - tr.r, tr.r * 0.8, tr.r * 1.15, 0, 0, TAU); g.fill();
      g.fillStyle = rgba('#5c7fa8', 0.35); g.beginPath(); g.ellipse(tr.x + tr.r * 0.25, y - tr.r * 1.3, tr.r * 0.4, tr.r * 0.55, 0, 0, TAU); g.fill();
    };
    const drawHouse = (hs) => {
      const haze = hs.ri / 12 * 0.22; const wall = mixc(hs.wall, '#46569a', haze), roof = mixc(hs.roof, '#3e4c8c', haze);
      const { x, w, h } = hs; const y = hs.y; const top = y - h;
      g.fillStyle = wall; g.fillRect(x, top, w, h + 30);
      g.fillStyle = rgba('#aab4ff', 0.12); g.fillRect(x + w - 4, top, 4, h + 30); // moonlit side
      g.fillStyle = rgba('#000010', 0.28); g.fillRect(x, top, w, 4); // eave shadow
      if (hs.chim) { const cx = x + w * hs.chim.u; g.fillStyle = mixc(wall, '#1a1a3a', 0.35); g.fillRect(cx - hs.chim.w / 2, top - hs.roofH * 0.9 - hs.chim.h * 0.3, hs.chim.w, hs.chim.h + hs.roofH * 0.5); g.fillStyle = rgba('#aab4ff', 0.25); g.fillRect(cx + hs.chim.w / 2 - 1.5, top - hs.roofH * 0.9 - hs.chim.h * 0.3, 1.5, hs.chim.h); }
      if (hs.side) {
        g.fillStyle = roof; g.beginPath(); g.moveTo(x - 4, top + 1); g.lineTo(x + 6, top - hs.roofH * 0.7); g.lineTo(x + w - 6, top - hs.roofH * 0.7); g.lineTo(x + w + 4, top + 1); g.closePath(); g.fill();
        g.fillStyle = rgba('#c8ccff', 0.14); g.fillRect(x + 6, top - hs.roofH * 0.7, w - 12, 2.2);
      } else {
        const px = x + w / 2, py = top - hs.roofH;
        g.fillStyle = mixc(roof, '#0c0c24', 0.25); g.beginPath(); g.moveTo(x - 5, top + 1); g.lineTo(px, py); g.lineTo(px, top + 1); g.closePath(); g.fill();
        g.fillStyle = mixc(roof, '#b8b8ff', 0.16); g.beginPath(); g.moveTo(px, py); g.lineTo(x + w + 5, top + 1); g.lineTo(px, top + 1); g.closePath(); g.fill();
        g.strokeStyle = rgba('#d6dcff', 0.35); g.lineWidth = 1.1; g.beginPath(); g.moveTo(px, py); g.lineTo(x + w + 5, top + 1); g.stroke();
      }
      for (const wi of hs.wins) { g.fillStyle = '#161b3e'; g.fillRect(wi.x - 1, wi.y - 1, wi.w + 2, wi.h + 2); g.fillStyle = '#232a58'; g.fillRect(wi.x, wi.y, wi.w, wi.h); g.fillStyle = rgba('#8a98d8', 0.25); g.fillRect(wi.x, wi.y, wi.w, 2); }
      if (hs.door) { g.fillStyle = '#141838'; g.fillRect(x + 5, y - 16, 9, 16); }
    };
    const drawTower = (T) => {
      const x = T.x, b = -T.base, top = b - T.h;
      g.fillStyle = '#34386a'; g.fillRect(x - T.w / 2, top, T.w, T.h + 20);
      g.fillStyle = rgba('#b4bcff', 0.16); g.fillRect(x + T.w / 2 - 6, top, 6, T.h + 20);
      g.fillStyle = '#2a2c5a'; g.fillRect(x - T.w / 2 - 4, top - 4, T.w + 8, 7); g.fillRect(x - T.w / 2 - 3, top + 48, T.w + 6, 5);
      g.fillStyle = mixc('#5a3458', '#000020', 0.2); g.beginPath(); g.moveTo(x - T.w / 2 - 6, top - 3); g.lineTo(x, top - 78); g.lineTo(x, top - 3); g.fill();
      g.fillStyle = '#6e4270'; g.beginPath(); g.moveTo(x, top - 78); g.lineTo(x + T.w / 2 + 6, top - 3); g.lineTo(x, top - 3); g.fill();
      g.strokeStyle = rgba('#d6dcff', 0.4); g.lineWidth = 1.2; g.beginPath(); g.moveTo(x, top - 78); g.lineTo(x + T.w / 2 + 6, top - 3); g.stroke();
      g.strokeStyle = '#8a8ab8'; g.beginPath(); g.moveTo(x, top - 78); g.lineTo(x, top - 92); g.stroke();
      const f = T.face; g.fillStyle = '#2a2a58'; g.beginPath(); g.arc(f.x, f.y, 13, 0, TAU); g.fill();
      g.fillStyle = '#efe2c4'; g.beginPath(); g.arc(f.x, f.y, 11, 0, TAU); g.fill();
      g.strokeStyle = '#3a2f55'; g.lineWidth = 1.6; g.lineCap = 'round'; g.beginPath(); g.moveTo(f.x, f.y); g.lineTo(f.x + 1, f.y - 8); g.moveTo(f.x, f.y); g.lineTo(f.x + 6, f.y + 2); g.stroke();
      for (const wi of T.wins) { g.fillStyle = '#232a58'; g.fillRect(wi.x, wi.y, wi.w, wi.h); }
    };
    for (let ri = M.rows.length - 1; ri >= 0; ri--) {
      for (const tr of M.trees) if (tr.ri === ri) drawTree(tr);
      for (const hs of M.rows[ri]) drawHouse(hs);
      if (ri === M.tower.ri) drawTower(M.tower);
    }
    // quay
    g.fillStyle = '#20264f'; g.fillRect(-640, -24, 1360, 16);
    g.fillStyle = rgba('#7c8cd0', 0.5); g.fillRect(-640, -24, 1360, 2);
    g.strokeStyle = rgba('#0c1030', 0.5); g.lineWidth = 1; for (let x = -630; x < 720; x += 22) { g.beginPath(); g.moveTo(x, -22); g.lineTo(x, -8); g.stroke(); }
    for (const L of M.lamps) { g.fillStyle = '#15183a'; g.fillRect(L.x - 1, -44, 2, 20); g.fillRect(L.x - 3, -47, 6, 4); }
    // pier
    g.fillStyle = '#1c2148'; g.fillRect(180, -12, 150, 5); for (let x = 184; x < 330; x += 18) g.fillRect(x, -9, 3, 9);
    // boats
    for (const b of M.boats) {
      const x = b.x, y = -2; g.fillStyle = b.col; g.beginPath(); g.moveTo(x - b.w / 2, y - 9); g.lineTo(x + b.w / 2 + 4, y - 10); g.quadraticCurveTo(x + b.w / 2 - 2, y, x + b.w / 2 - 8, y); g.lineTo(x - b.w / 2 + 5, y); g.closePath(); g.fill();
      g.fillStyle = rgba('#c8d0ff', 0.3); g.fillRect(x - b.w / 2, y - 10, b.w + 3, 1.6);
      g.fillStyle = '#d8d4e8'; g.globalAlpha = 0.5; g.fillRect(x - 6, y - 17, 11, 7); g.globalAlpha = 1;
      if (b.mast) { g.strokeStyle = rgba('#b0b8e0', 0.6); g.lineWidth = 1; g.beginPath(); g.moveTo(x + 2, y - 10); g.lineTo(x + 2, y - 44); g.lineTo(x + b.w / 2, y - 11); g.stroke(); }
    }
    // lighthouse promontory
    g.fillStyle = '#171c44'; g.beginPath(); g.moveTo(-860, 0); g.lineTo(-850, -40);
    const rr = A.rng(seed + 5); for (let x = -840; x <= -620; x += 14) g.lineTo(x, -44 - rr() * 22 + (x > -680 ? (x + 680) * 0.6 : 0));
    g.lineTo(-600, -20); g.lineTo(-560, -16); g.lineTo(-560, 0); g.closePath(); g.fill();
    g.strokeStyle = rgba('#7f8fd0', 0.3); g.lineWidth = 1.2; g.stroke();
    const lx = M.lh.x, lb = -58, lt = lb - 110;
    g.fillStyle = '#d7d4ea'; g.beginPath(); g.moveTo(lx - 13, lb); g.lineTo(lx - 9, lt); g.lineTo(lx + 9, lt); g.lineTo(lx + 13, lb); g.closePath(); g.fill();
    g.save(); g.clip(); g.fillStyle = '#a54a60'; for (let k = 0; k < 3; k++) g.fillRect(lx - 20, lb - 22 - k * 34, 40, 14);
    g.fillStyle = rgba('#10142e', 0.35); g.fillRect(lx - 20, lt, 12, 120); g.restore();
    g.fillStyle = '#2a2d52'; g.fillRect(lx - 14, lt - 3, 28, 4);
    g.fillStyle = '#39406a'; g.fillRect(lx - 8, lt - 17, 16, 14);
    g.fillStyle = '#a54a60'; g.beginPath(); g.arc(lx, lt - 17, 9, Math.PI, 0); g.fill(); g.fillRect(lx - 1, lt - 30, 2, 6);
    return c;
  }, 5);

  const TB_N = 10;
  const townBloom = (seed, cs) => cachedLRU('townBloom', seed + '|' + cs, () => {
    const M = townModel(seed); const bs = cs * 0.5; const buckets = [], cum = [];
    for (let k = 0; k < TB_N; k++) { const c = mk(T_W * bs, T_H * bs), g = c.getContext('2d'); g.scale(bs, bs); g.translate(T_PADL, T_PADT); g.globalCompositeOperation = 'lighter'; buckets.push([c, g]); }
    for (const w of M.windows) { const k = Math.min(TB_N - 1, Math.floor(w.rank * TB_N)); const g = buckets[k][1]; const cx = w.x + w.w / 2, cy = w.y + w.h / 2; spr(g, glowSprite('#ffa94a'), cx, cy, 18, 0.5); spr(g, glowSprite('#ff8a3a'), cx, cy, 46, 0.08); }
    for (let k = 0; k < TB_N; k++) {
      const c = mk(T_W * bs, T_H * bs), g = c.getContext('2d'); if (k) g.drawImage(cum[k - 1], 0, 0); g.globalCompositeOperation = 'lighter'; g.drawImage(buckets[k][0], 0, 0);
      cum.push(c);
    }
    return { cum };
  }, 3);
  E.town = function (ctx, t, o) {
    o = opt(o, { x: 960, y: 900, s: 1, lit: 0.15, litFn: null, lighthouse: 0, seed: 1, reflections: true });
    const M = townModel(o.seed); const s = o.s, X = o.x, Y = o.y; const cs = quantScale(s * 1.25);
    const C = townCanvas(o.seed, cs);
    ctx.save();
    ctx.drawImage(C, X - T_PADL * s, Y - T_PADT * s, T_W * s, T_H * s);
    const res = { windows: [], clockTower: { x: X + M.tower.face.x * s, y: Y + M.tower.face.y * s }, lighthouse: { x: X + M.lh.x * s, y: Y + M.lh.y * s } };
    const warmA = '#ffb65c', warmB = '#ffe29a';
    let sumB = 0; const lits = [];
    for (let i = 0; i < M.windows.length; i++) {
      const w = M.windows[i]; let b = o.litFn ? A.clamp(+o.litFn(i, t) || 0) : A.clamp((o.lit - w.rank) / 0.03);
      if (b > 0) b *= 0.9 + 0.1 * A.noise(t * 1.4 + i * 3.3, 2);
      const sx = X + w.x * s, sy = Y + w.y * s, sw = w.w * s, sh = w.h * s;
      res.windows.push({ x: sx + sw / 2, y: sy + sh / 2, w: sw, h: sh, lit: b, left: sx, top: sy });
      if (b > 0.01) { sumB += b; lits.push([sx, sy, sw, sh, b, w]); }
    }
    if (lits.length) {
      for (const [sx, sy, sw, sh, b, w] of lits) {
        ctx.globalAlpha = b; ctx.fillStyle = mixc(warmA, warmB, w.hue); ctx.fillRect(sx, sy, sw, sh);
        ctx.globalAlpha = b * 0.7; ctx.fillStyle = '#fff4d0'; ctx.fillRect(sx + sw * 0.2, sy + sh * 0.35, sw * 0.6, sh * 0.5);
        if (s >= 1.2) { ctx.globalAlpha = b * 0.6; ctx.fillStyle = '#6a3a2a'; ctx.fillRect(sx + sw / 2 - s * 0.5, sy, s, sh); ctx.fillRect(sx, sy + sh * 0.45, sw, s); }
      }
      ctx.globalCompositeOperation = 'lighter';
      const gs = glowSprite('#ffa94a');
      let full = -1; // rank buckets fully covered by the cached cumulative bloom layer
      if (!o.litFn && lits.length > 90) { full = Math.floor(A.clamp(o.lit) * TB_N) - 1; if (full >= 0) { const L = townBloom(o.seed, cs); ctx.globalAlpha = 1; ctx.drawImage(L.cum[Math.min(TB_N - 1, full)], X - T_PADL * s, Y - T_PADT * s, T_W * s, T_H * s); } }
      for (const [sx, sy, sw, sh, b, w] of lits) {
        const cx = sx + sw / 2, cy = sy + sh / 2;
        if (full < 0 || w.rank >= (full + 1) / TB_N) { spr(ctx, gs, cx, cy, 18 * s, 0.6 * b); }
        if (o.reflections && w.row <= 1) {
          const ry = Y - 6 * s; ctx.fillStyle = rgba('#ffb060', 0.22 * b);
          for (let k = 0; k < 6; k++) { const yy = ry + (k * 9 + 4) * s; const wob = Math.sin(t * 2.2 + k * 1.3 + w.x) * 2 * s; ctx.globalAlpha = 1 - k / 6; ctx.fillRect(cx - sw * 0.6 + wob, yy, sw * 1.2, 2.5 * s); }
          ctx.globalAlpha = 1;
        }
      }
      // overall town warmth
      const avg = sumB / M.windows.length;
      if (avg > 0.02) { ctx.save(); ctx.translate(X + 30 * s, Y - 200 * s); ctx.scale(1, 0.6); spr(ctx, glowSprite('#ff9a4a'), 0, 0, 520 * s, 0.24 * Math.sqrt(avg)); ctx.restore(); }
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.globalCompositeOperation = 'lighter';
    // clock face & quay lamps
    const avg = sumB / M.windows.length; const f = res.clockTower;
    spr(ctx, glowSprite('#ffe6b0'), f.x, f.y, 34 * s, 0.25 + 0.4 * avg);
    const la = A.clamp(0.25 + avg * 1.2);
    for (const L of M.lamps) { const lx = X + L.x * s, ly = Y - 45 * s; spr(ctx, coreSprite('#ffd08a'), lx, ly, 5 * s, la); spr(ctx, glowSprite('#ffb060'), lx, ly, 26 * s, 0.35 * la); ctx.fillStyle = rgba('#ffb060', 0.12 * la); ctx.fillRect(lx - 3 * s, Y, 6 * s, 26 * s); }
    // lighthouse
    const LH = o.lighthouse; const lp = res.lighthouse;
    if (LH > 0) {
      const a = t * 1.3; const c = Math.cos(a), sn = Math.sin(a);
      spr(ctx, glowSprite('#fff2c8'), lp.x, lp.y, 50 * s, LH); spr(ctx, coreSprite('#fff8e0'), lp.x, lp.y, 9 * s, LH);
      spr(ctx, glowSprite('#ffe0a0'), lp.x, lp.y, 220 * s, 0.25 * LH * (1 + Math.max(0, sn) * 1.5));
      const len = 1100 * s * Math.abs(c) + 20 * s; const dir = c >= 0 ? 1 : -1; const spread = (10 + 40 * (1 - Math.abs(c))) * s;
      const bg = ctx.createLinearGradient(lp.x, lp.y, lp.x + dir * len, lp.y);
      bg.addColorStop(0, rgba('#fff1c8', 0.7 * LH)); bg.addColorStop(0.5, rgba('#ffe8b0', 0.25 * LH)); bg.addColorStop(1, rgba('#fff1c8', 0));
      ctx.fillStyle = bg; ctx.beginPath(); ctx.moveTo(lp.x, lp.y - 3 * s); ctx.lineTo(lp.x + dir * len, lp.y - spread); ctx.lineTo(lp.x + dir * len, lp.y + spread * 0.7); ctx.lineTo(lp.x, lp.y + 3 * s); ctx.fill();
      ctx.globalAlpha = 0.35; ctx.beginPath(); ctx.moveTo(lp.x, lp.y - 5 * s); ctx.lineTo(lp.x + dir * len * 0.8, lp.y - spread * 3); ctx.lineTo(lp.x + dir * len * 0.8, lp.y + spread * 2); ctx.lineTo(lp.x, lp.y + 5 * s); ctx.fill(); ctx.globalAlpha = 1;
      if (sn > 0.85) spr(ctx, sparkSprite('#fff4d0'), lp.x, lp.y, 90 * s * (sn - 0.85) / 0.15, LH * 0.9);
    }
    ctx.restore();
    return res;
  };

  // =================================================================== GRASS (shared blade renderer)
  // blade: {x, y, h, w, lean, ph, shade(0..1), curl}
  function drawBlades(ctx, t, blades, o) {
    const wind = o.wind, cols = o.cols, NB = cols.length; const paths = cols.map(() => new Path2D());
    const light = o.lightFrom; const NL = 4;
    const rim = light ? Array.from({ length: NL }, () => new Path2D()) : null, back = light ? Array.from({ length: 3 }, () => new Path2D()) : null;
    const LR = light ? light.r || Math.max(220, o.hRef * 1.2) : 0; const ls = light ? (light.strength == null ? 1 : light.strength) : 0;
    const seed = o.seed || 0; let nl = 0;
    const dist = (x, y) => Math.hypot(x - light.x, y - light.y) / LR;
    for (let i = 0; i < blades.length; i++) {
      const b = blades[i]; const x = b.x, y = b.y, h = b.h, w = b.w;
      const gust = wind * (0.6 * A.noise(x * 0.0028 - t * 0.85, seed) + 0.28 * A.noise(x * 0.011 - t * 1.9, seed + 3));
      const flut = wind * 0.07 * Math.sin(t * (2.1 + b.ph * 0.25) + b.ph);
      const ang = b.lean + (gust + flut + wind * 0.18) * (0.75 + 0.5 * b.flex);
      const tx = x + h * Math.sin(ang) + b.curl * h * 0.18, ty = y - h * Math.cos(ang) * 0.98;
      const mx = x + (tx - x) * 0.42, my = y - h * 0.64, c1y = y - h * 0.3;
      const cubic = h >= 160;
      const outline = (p) => {
        if (!cubic) { p.moveTo(x - w / 2, y); p.quadraticCurveTo(mx - w * 0.3, my + h * 0.08, tx, ty); p.quadraticCurveTo(mx + w * 0.3, my + h * 0.08, x + w / 2, y); p.closePath(); }
        else { p.moveTo(x - w / 2, y); p.bezierCurveTo(x - w * 0.42, c1y, mx - w * 0.3, my, tx, ty); p.bezierCurveTo(mx + w * 0.3, my, x + w * 0.42, c1y, x + w / 2, y); p.closePath(); }
      };
      outline(paths[Math.min(NB - 1, (b.shade * NB) | 0)]);
      if (light) {
        const dLo = dist(x, c1y), dMid = dist(mx, my), dTip = dist(tx, ty); const dmin = Math.min(dLo, dMid, dTip);
        if (dmin < 1) {
          nl++; outline(back[Math.min(2, (dmin * 3) | 0)]);
          const side = light.x > mx ? 1 : -1; const off = side * w * 0.3;
          // rim in two halves, each bucketed by its own distance → falloff along the blade
          const hx = x + (mx - x) * 0.55 + off, hy = y + (my - y) * 0.75;
          const kLo = Math.min(dLo, dMid), kHi = Math.min(dMid, dTip);
          if (kLo < 1) { const r = rim[Math.min(NL - 1, (kLo * NL) | 0)]; r.moveTo(x + off * 1.1, y); r.quadraticCurveTo(x + off * 1.05, c1y, hx, hy); }
          if (kHi < 1) { const r = rim[Math.min(NL - 1, (kHi * NL) | 0)]; r.moveTo(hx, hy); r.quadraticCurveTo(mx + off * 0.8, my - (my - ty) * 0.2, tx, ty); }
        }
      }
    }
    for (let k = 0; k < NB; k++) { ctx.fillStyle = cols[k]; ctx.fill(paths[k]); }
    if (light && nl) {
      ctx.save(); const lc = light.color || A.PAL.warm;
      const bc = [rgba(mixc(lc, '#ffffff', 0.15), 0.55 * ls), rgba(mixc(lc, '#503020', 0.3), 0.3 * ls), rgba(mixc(lc, '#2a2040', 0.55), 0.13 * ls)];
      for (let k = 0; k < 3; k++) { ctx.fillStyle = bc[k]; ctx.fill(back[k]); }
      ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'; ctx.lineWidth = Math.max(1, o.hRef * 0.0045);
      const hot = mixc(lc, '#ffffff', 0.35);
      for (let k = 0; k < NL; k++) { const f = Math.pow(1 - (k + 0.5) / NL, 1.6); ctx.strokeStyle = rgba(k ? lc : hot, 0.95 * f * ls); ctx.stroke(rim[k]); }
      ctx.restore();
    }
  }
  const makeBlades = (x0, x1, y, h, density, seed) => cachedLRU('blades', [x0, x1, y, h, density, seed].map((v) => Math.round(v * 10) / 10).join(','), () => {
    const r = A.rng(seed * 7919 + 13); const sp = Math.max(1.6, h * 0.038) / Math.max(0.05, density);
    const n = Math.min(5000, Math.ceil((x1 - x0) / sp)); const out = [];
    for (let i = 0; i < n; i++) {
      const hk = 0.3 + 0.7 * Math.pow(r(), 0.7); const hh = h * hk;
      out.push({ x: x0 + (i + r()) * sp, y: y + r() * h * 0.04, h: hh, w: h * (0.018 + 0.026 * r()) * (0.6 + 0.5 * hk), lean: (r() - 0.5) * 0.55, ph: r() * TAU, flex: r(), curl: (r() - 0.5) * 0.8, shade: A.clamp(0.15 + 0.55 * hk + (r() - 0.5) * 0.5, 0, 0.999) });
    }
    out.sort((a, b) => a.shade - b.shade); return out;
  }, 24);
  const grassCols = (color) => {
    let c0, c1; if (Array.isArray(color)) { c0 = color[0]; c1 = color[1] || color[0]; } else if (color) { c0 = mixc(color, '#050a1c', 0.45); c1 = color; } else { c0 = '#0b1c34'; c1 = A.PAL.grass2; }
    return [0, 1, 2, 3, 4, 5, 6, 7].map((k) => mixc(c0, c1, k / 7));
  };
  E.grass = function (ctx, t, o) {
    o = opt(o, { x0: -50, x1: W + 50, y: H, h: 120, density: 1, color: null, wind: 0.5, seed: 1, lightFrom: null, ground: false });
    const blades = makeBlades(o.x0, o.x1, o.y, o.h, o.density, o.seed); const cols = grassCols(o.color);
    ctx.save();
    if (o.ground) {
      const gc = typeof o.ground === 'string' ? o.ground : mixc(cols[0], '#040816', 0.3); const gy = o.y - o.h * 0.4;
      const gg = ctx.createLinearGradient(0, gy, 0, o.y); gg.addColorStop(0, rgba(gc, 0)); gg.addColorStop(1, rgba(gc, 1));
      ctx.fillStyle = gg; ctx.fillRect(o.x0, gy, o.x1 - o.x0, o.y - gy); ctx.fillStyle = gc; ctx.fillRect(o.x0, o.y - 0.5, o.x1 - o.x0, H * 3);
    }
    drawBlades(ctx, t, blades, { wind: o.wind, cols, lightFrom: o.lightFrom, hRef: o.h, seed: o.seed });
    ctx.restore();
  };

  // =================================================================== HILL
  const HILL = { H: 300, W: 1250 };
  const hillY = (xl) => { const u = xl / (xl < 0 ? HILL.W * 0.95 : HILL.W * 1.1); const a = Math.abs(u); return a >= 1 ? 0 : -HILL.H * Math.pow(1 - a * a, 0.75) + 6 * A.noise(xl * 0.01, 4); };
  const hillModel = (seed) => cached('hill' + seed, () => {
    const r = A.rng(seed * 17 + 3); const ridge = [], body = [], susuki = [], flowers = [];
    for (let xl = -1400; xl <= 1400; xl += 4.2) {
      const hk = 0.35 + 0.65 * Math.pow(r(), 0.7);
      ridge.push({ xl, dy: r() * 6, h: 70 * hk, w: 3 + r() * 3, lean: (r() - 0.5) * 0.5, ph: r() * TAU, flex: r(), curl: (r() - 0.5) * 0.8, shade: A.clamp(0.25 + 0.55 * hk + (r() - 0.5) * 0.4, 0, 0.999) });
    }
    for (let i = 0; i < 1500; i++) { // tufts of 3-5 blades fanning out from one root
      const xl0 = -1400 + r() * 2800, dy = 10 + Math.pow(r(), 1.25) * 560; const near = dy / 560; const n = 3 + ((r() * 3) | 0);
      const tone = r(); const hk0 = 0.5 + 0.5 * r();
      for (let k = 0; k < n; k++) {
        const fan = (k / (n - 1) - 0.5) * 0.9; const hk = hk0 * (0.6 + 0.4 * r());
        body.push({ xl: xl0 + fan * 6, dy: dy + r() * 2, h: (14 + 34 * near) * hk * (1 - Math.abs(fan) * 0.4), w: 2.2 + 2.5 * r() + near * 3, lean: fan + (r() - 0.5) * 0.2, ph: r() * TAU, flex: r(), curl: fan * 0.6, shade: A.clamp(0.1 + 0.55 * tone + 0.3 * near + (r() - 0.5) * 0.15, 0, 0.999) });
      }
    }
    body.sort((a, b) => a.dy - b.dy);
    const sxs = [-640, -560, -330, -250, 240, 320, 520, 600, 780, -820];
    for (const xl of sxs) { const n = 1 + ((r() * 3) | 0); for (let k = 0; k < n; k++) susuki.push({ xl: xl + (r() - 0.5) * 50, dy: 4 + r() * 30, h: 110 + r() * 90, lean: (r() - 0.5) * 0.3 + 0.08, ph: r() * TAU, v: (r() * 3) | 0 }); }
    for (let i = 0; i < 70; i++) { const xl = -800 + r() * 1600; if (Math.abs(xl) < 70) continue; flowers.push({ xl, dy: 8 + Math.pow(r(), 1.5) * 200, h: 12 + r() * 22, ph: r() * TAU, sz: 0.7 + r() * 0.6 }); }
    return { ridge, body, susuki, flowers };
  });
  // susuki plume sprite: axis starts at (ox,oy) and rises (-y), arching over to +x; fine silky strands
  const PL = { w: 130, h: 150, ox: 40, oy: 140 };
  const plumeSprite = (v) => cached('plume' + v, () => {
    const S = 3, c = mk(PL.w * S, PL.h * S), g = c.getContext('2d'); g.scale(S, S); g.translate(PL.ox, PL.oy); const r = A.rng(70 + v * 13);
    const L = 115, bendK = 34 + v * 8; const ax = (u) => [bendK * u * u, -L * u + 10 * u * u * u];
    g.lineCap = 'round';
    const n = 90;
    for (let pass = 0; pass < 2; pass++) {
      const rr = A.rng(90 + v * 7);
      for (let i = 0; i < n; i++) {
        const u = 0.05 + 0.95 * (i / n); const [x, y] = ax(u); const side = i % 2 ? 1 : -1;
        const len = (10 + 26 * Math.sin(Math.min(1, u * 1.15) * Math.PI * 0.85)) * (0.7 + 0.5 * rr());
        const a = -Math.PI / 2 + u * 0.9 + side * (0.25 + 0.35 * rr()) + 0.5; // strands comb downwind (+x) and droop
        const ex = x + Math.cos(a) * len, ey = y + Math.sin(a) * len + len * 0.45;
        g.strokeStyle = pass ? rgba('#fff0d2', 0.22) : rgba(rr() < 0.5 ? '#c9c0d8' : '#d8ccb4', 0.55);
        g.lineWidth = pass ? 0.6 : 1.1; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a) * len * 0.6, y + Math.sin(a) * len * 0.6 - 4, ex, ey); g.stroke();
      }
      if (!pass) g.globalCompositeOperation = 'lighter';
    }
    g.globalCompositeOperation = 'source-over'; g.strokeStyle = '#6a7a80'; g.lineWidth = 1.2; g.beginPath(); for (let u = 0; u <= 1.001; u += 0.05) { const [x, y] = ax(u); if (!u) g.moveTo(x, y); else g.lineTo(x, y); } g.stroke();
    return c;
  });
  const HB = { x0: -1500, x1: 1500, top: -HILL.H - 110, bot: 620 };
  const hillBody = (seed, cs) => cachedLRU('hillBody', seed + '|' + cs, () => {
    const M = hillModel(seed); const c = mk((HB.x1 - HB.x0) * cs, (HB.bot - HB.top) * cs), g = c.getContext('2d');
    g.scale(cs, cs); g.translate(-HB.x0, -HB.top);
    g.beginPath(); g.moveTo(HB.x0, HB.bot); for (let xl = HB.x0; xl <= HB.x1; xl += 8) g.lineTo(xl, hillY(xl)); g.lineTo(HB.x1, HB.bot); g.closePath();
    const gr = g.createLinearGradient(0, -HILL.H, 0, 300); gr.addColorStop(0, '#153a50'); gr.addColorStop(0.3, '#0f2a42'); gr.addColorStop(1, '#060f26');
    g.fillStyle = gr; g.fill();
    g.save(); g.clip(); const rn = A.rng(seed + 44);
    for (let i = 0; i < 26; i++) { const x = HB.x0 + rn() * (HB.x1 - HB.x0), y = hillY(x) + 60 + rn() * 400; g.save(); g.translate(x, y); g.scale(2.6, 1); spr(g, glowSprite('#030a1c'), 0, 0, 90 + rn() * 120, 0.35); g.restore(); }
    g.globalCompositeOperation = 'lighter';
    g.save(); g.translate(380, -HILL.H + 70); g.scale(1.8, 0.7); spr(g, glowSprite('#3f7c9a'), 0, 0, 520, 0.26); g.restore();
    spr(g, glowSprite('#2a5a78'), -500, -120, 600, 0.08);
    g.restore();
    const bl = M.body.map((b) => ({ x: b.xl, y: hillY(b.xl) + b.dy, h: b.h, w: b.w, lean: b.lean, ph: b.ph, flex: b.flex, curl: b.curl, shade: b.shade }));
    drawBlades(g, 0, bl, { wind: 0.25, cols: ['#0a1e34', '#0f283e', '#143147', '#1a3b50', '#1f4659', '#265262', '#2e5e6c', '#386a74'], hRef: 80, seed });
    g.globalCompositeOperation = 'lighter'; g.lineWidth = 2.5; const rg = g.createLinearGradient(-800, 0, 800, 0);
    rg.addColorStop(0, rgba('#6fb0c8', 0.05)); rg.addColorStop(0.6, rgba('#8fd0e0', 0.3)); rg.addColorStop(1, rgba('#8fd0e0', 0.12)); g.strokeStyle = rg;
    g.beginPath(); for (let xl = -1200; xl <= 1300; xl += 10) { const y = hillY(xl) + 2; if (xl === -1200) g.moveTo(xl, y); else g.lineTo(xl, y); } g.stroke();
    return c;
  }, 4);
  E.hill = function (ctx, t, o) {
    o = opt(o, { x: 1400, y: H, s: 1, wind: 0.5, flowers: true, seed: 1, susuki: true });
    const M = hillModel(o.seed); const s = o.s, X = o.x, Y = o.y; const wind = o.wind;
    const vx0 = -200, vx1 = W + 200; // cull in ctx coords
    ctx.save();
    const cs = quantScale(s, 1.5); ctx.drawImage(hillBody(o.seed, cs), X + HB.x0 * s, Y + HB.top * s, (HB.x1 - HB.x0) * s, (HB.bot - HB.top) * s);
    const mapB = (arr) => { const out = []; for (const b of arr) { const x = X + b.xl * s; if (x < vx0 || x > vx1) continue; out.push({ x, y: Y + (hillY(b.xl) + b.dy) * s, h: b.h * s, w: b.w * s, lean: b.lean, ph: b.ph, flex: b.flex, curl: b.curl, shade: b.shade }); } return out; };
    const drawFlowers = (front) => {
      if (!o.flowers) return; const pet = new Path2D(), stem = new Path2D(), ctr = new Path2D(), heads = [];
      for (const f of M.flowers) {
        if ((f.dy > 60) !== front) continue; const bx = X + f.xl * s; if (bx < vx0 || bx > vx1) continue;
        const by = Y + (hillY(f.xl) + f.dy) * s; const sw = wind * (0.5 * A.noise(bx * 0.0028 - t * 0.85, o.seed) + 0.1 * Math.sin(t * 2 + f.ph));
        const hx = bx + Math.sin(sw + 0.1) * f.h * s, hy = by - Math.cos(sw) * f.h * s;
        stem.moveTo(bx, by); stem.quadraticCurveTo(bx, by - f.h * s * 0.5, hx, hy);
        const pr = 2.1 * s * f.sz; for (let k = 0; k < 5; k++) { const a = (k / 5) * TAU + f.ph; const px = hx + Math.cos(a) * pr * 1.25, py = hy + Math.sin(a) * pr * 0.75; pet.moveTo(px + pr, py); pet.arc(px, py, pr, 0, TAU); }
        ctr.moveTo(hx + pr * 0.55, hy); ctr.arc(hx, hy, pr * 0.55, 0, TAU); heads.push([hx, hy, pr]);
      }
      ctx.strokeStyle = '#1f5460'; ctx.lineWidth = 1.2 * s; ctx.stroke(stem);
      ctx.fillStyle = '#dfe4fa'; ctx.fill(pet); ctx.fillStyle = '#ffd97a'; ctx.fill(ctr);
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; const gsp = glowSprite('#b8ccff'); for (const [x, y, pr] of heads) spr(ctx, gsp, x, y, pr * 5, 0.16); ctx.restore();
    };
    drawFlowers(false);
    if (o.susuki) {
      const stems = new Path2D(), plumes = [];
      for (const p of M.susuki) {
        const bx = X + p.xl * s; if (bx < vx0 - 100 || bx > vx1 + 100) continue; const by = Y + (hillY(p.xl) + p.dy) * s; const hh = p.h * s;
        const gust = wind * (0.8 * A.noise(bx * 0.0028 - t * 0.85, o.seed) + 0.2 * Math.sin(t * 1.7 + p.ph)) + wind * 0.25;
        const ang = p.lean + gust * 0.5; const tx = bx + Math.sin(ang) * hh, ty = by - Math.cos(ang) * hh;
        const cx = bx + (tx - bx) * 0.15, cy = by - hh * 0.55;
        const q = (u) => { const a = 1 - u; return [a * a * bx + 2 * a * u * cx + u * u * tx, a * a * by + 2 * a * u * cy + u * u * ty]; };
        const u0 = 0.68, [px, py] = q(u0); const du = 2 * (1 - u0) * (cx - bx) + 2 * u0 * (tx - cx), dv = 2 * (1 - u0) * (cy - by) + 2 * u0 * (ty - cy);
        stems.moveTo(bx, by); stems.quadraticCurveTo(bx + (cx - bx) * u0, by + (cy - by) * u0, px, py);
        plumes.push([px, py, Math.atan2(du, -dv) + gust * 0.25, (0.34 * hh) / 110, p.v, p.ph]);
      }
      ctx.lineCap = 'round'; ctx.strokeStyle = '#2d5660'; ctx.lineWidth = 1.6 * s; ctx.stroke(stems);
      for (const [px, py, an, k, v, ph] of plumes) {
        const img = plumeSprite(v); ctx.save(); ctx.translate(px, py); ctx.rotate(an); ctx.scale(k * (1 + 0.07 * Math.sin(t * 3.3 + ph)), k);
        ctx.drawImage(img, -PL.ox, -PL.oy, PL.w, PL.h); ctx.restore();
      }
    }
    drawBlades(ctx, t, mapB(M.ridge), { wind, cols: ['#10304a', '#153b52', '#1b475c', '#225466', '#2a6270', '#357078'], hRef: 70 * s, seed: o.seed });
    drawFlowers(true);
    ctx.restore();
    return { crest: { x: X, y: Y + hillY(0) * s }, surfaceY: (x) => Y + hillY((x - X) / s) * s };
  };

  // =================================================================== FIREFLIES
  E.fireflies = function (ctx, t, o) {
    o = opt(o, { cx: W / 2, cy: H / 2, rx: 400, ry: 200, count: 30, seed: 1, alpha: 1, attract: null, size: 1 });
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; const gs = glowSprite('#b8f06a'), cs = coreSprite('#f0ffb0');
    const pos = [];
    for (let i = 0; i < o.count; i++) {
      const hs = (k) => A.hash(i * 13.13 + o.seed * 71.7 + k * 3.31);
      const sp = 0.06 + hs(1) * 0.08;
      let x = o.cx + o.rx * (0.75 * (hs(2) * 2 - 1) + 0.45 * A.noise(t * sp + hs(3) * 50, o.seed + i));
      let y = o.cy + o.ry * (0.75 * (hs(4) * 2 - 1) + 0.45 * A.noise(t * sp * 1.1 + hs(5) * 50, o.seed + i + 40));
      y += Math.sin(t * (1.1 + hs(9)) + hs(6) * TAU) * 6;
      const per = 2.2 + hs(7) * 2.8; const ph = frac(t / per + hs(8)); let b = ph < 0.55 ? Math.pow(Math.sin((ph / 0.55) * Math.PI), 2) : 0; b = 0.15 + 0.85 * b;
      let a = o.alpha;
      if (o.attract && o.attract.k > 0) {
        const k = A.ease.inOutCubic(A.clamp(o.attract.k * 1.35 - hs(10) * 0.35)); const sw = (1 - k) * 60; const an = t * 3 + hs(11) * TAU;
        x = A.lerp(x, o.attract.x + Math.cos(an) * sw, k); y = A.lerp(y, o.attract.y + Math.sin(an) * sw * 0.6, k);
        b = A.lerp(b, 1, k); a *= 1 - A.smooth(A.range(k, 0.9, 1));
      }
      const z = o.size * (0.7 + hs(12) * 0.6);
      spr(ctx, gs, x, y, 22 * z, 0.55 * b * a); spr(ctx, cs, x, y, 4.5 * z, b * a);
      pos.push({ x, y, b });
    }
    ctx.restore(); return pos;
  };

  // =================================================================== LIGHT STREAM
  E.lightStream = function (ctx, t, o) {
    o = opt(o, { from: { x: 0, y: 0 }, to: { x: 500, y: 0 }, p: 0, color: A.PAL.warm, width: 1, seed: 1, count: 24, arc: 0.3, trail: 0.42 });
    const p = o.p; if (p <= 0 || p >= 1) return null;
    const P0 = o.from, P2 = o.to; const dx = P2.x - P0.x, dy = P2.y - P0.y, D = Math.hypot(dx, dy) || 1;
    const nx = -dy / D, ny = dx / D; const C = { x: P0.x + dx / 2 + nx * o.arc * D, y: P0.y + dy / 2 + ny * o.arc * D };
    const Q = (u) => { const a = 1 - u; return { x: a * a * P0.x + 2 * a * u * C.x + u * u * P2.x, y: a * a * P0.y + 2 * a * u * C.y + u * u * P2.y }; };
    const Tn = (u) => { const tx = 2 * (1 - u) * (C.x - P0.x) + 2 * u * (P2.x - C.x), ty = 2 * (1 - u) * (C.y - P0.y) + 2 * u * (P2.y - C.y); const l = Math.hypot(tx, ty) || 1; return { x: -ty / l, y: tx / l }; };
    const L = o.trail; const uh = p * (1 + L), ut = uh - L; const wd = o.width; const col = o.color, hot = mixc(col, '#ffffff', 0.7);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    const wig = (u, k) => { const n = Tn(u); const w = Math.sin(u * 23 - t * 7 + o.seed) * 5 * wd * k; return n; };
    // ribbon
    const N = 18; const a0 = Math.max(0, ut), a1 = Math.min(1, uh);
    if (a1 > a0) {
      let prev = null;
      for (let i = 0; i <= N; i++) {
        const u = a0 + (a1 - a0) * (i / N); const q = Q(u); const n = Tn(u); const age = (uh - u) / L; const wv = Math.sin(u * 20 - t * 6 + o.seed) * 7 * wd * age;
        const pt = { x: q.x + n.x * wv, y: q.y + n.y * wv };
        if (prev) {
          const k = 1 - age; ctx.strokeStyle = rgba(col, 0.18 * k); ctx.lineWidth = (4 + 26 * k) * wd; ctx.beginPath(); ctx.moveTo(prev.x, prev.y); ctx.lineTo(pt.x, pt.y); ctx.stroke();
          ctx.strokeStyle = rgba(hot, 0.7 * k * k); ctx.lineWidth = (1 + 5 * k) * wd; ctx.beginPath(); ctx.moveTo(prev.x, prev.y); ctx.lineTo(pt.x, pt.y); ctx.stroke();
        }
        prev = pt;
      }
    }
    // particles
    const gsC = glowSprite(col), csC = coreSprite(col), spC = sparkSprite(hot);
    for (let j = 0; j < o.count; j++) {
      const h1 = A.hash(j * 1.91 + o.seed * 17.3), h2 = A.hash(j * 5.37 + o.seed * 3.1), h3 = A.hash(j * 9.1 + o.seed);
      const lag = L * Math.pow(h1, 1.3); const u = uh - lag; if (u < 0 || u > 1) continue; const age = lag / L;
      const q = Q(u), n = Tn(u); const off = ((h2 - 0.5) * 22 * (0.3 + age * 1.6) + A.noise(t * 2 + j * 7, o.seed) * 8 * age) * wd;
      const x = q.x + n.x * off, y = q.y + n.y * off + age * age * 14 * wd;
      const tw = 0.5 + 0.5 * Math.sin(t * (9 + h3 * 8) + j * 2.3); const a = (1 - age) * (0.45 + 0.55 * tw);
      spr(ctx, gsC, x, y, (8 + 8 * h3) * wd, 0.5 * a); spr(ctx, csC, x, y, (2 + 2.5 * h3) * wd, a);
      if (h3 > 0.72) sprRot(ctx, spC, x, y, (7 + 10 * tw) * wd, a * 0.8, 0);
    }
    // shed twinkles falling behind
    for (let k = 0; k < 7; k++) {
      const ph = frac(t * 1.6 + k / 7 + o.seed * 0.13); const u = uh - ph * L * 0.9; if (u < 0 || u > 1) continue;
      const q = Q(u); const n = Tn(u); const side = (A.hash(k + Math.floor(t * 1.6 + k / 7 + o.seed * 0.13) * 7) - 0.5) * 40 * wd;
      sprRot(ctx, spC, q.x + n.x * side, q.y + n.y * side + ph * 10 * wd, 14 * wd * Math.sin(ph * Math.PI), 0.9 * (1 - ph), ph * 0.8);
    }
    // head
    if (uh <= 1) {
      const q = Q(uh); const pu = 0.85 + 0.15 * Math.sin(t * 13 + o.seed);
      spr(ctx, gsC, q.x, q.y, 70 * wd * pu, 0.55); spr(ctx, glowSprite(hot), q.x, q.y, 26 * wd, 0.8); spr(ctx, coreSprite('#fffdf0'), q.x, q.y, 9 * wd * pu, 1);
      sprRot(ctx, spC, q.x, q.y, (26 + 8 * Math.sin(t * 9)) * wd, 0.85, Math.sin(t * 2) * 0.2);
    } else {
      // arrival: absorption glow at target
      const k = A.clamp((uh - 1) / L); const f = Math.sin(Math.min(1, k * 1.2) * Math.PI) * 0.8 + 0.2 * (1 - k);
      spr(ctx, gsC, P2.x, P2.y, 60 * wd, 0.5 * f); spr(ctx, coreSprite('#fffdf0'), P2.x, P2.y, 10 * wd, 0.7 * f);
    }
    if (p < 0.15) { const f = 1 - p / 0.15; spr(ctx, gsC, P0.x, P0.y, 40 * wd, 0.6 * f); }
    ctx.restore();
    return uh <= 1 ? Q(uh) : P2;
  };

  // =================================================================== SPARKLES
  E.sparkles = function (ctx, t, o) {
    o = opt(o, { x: W / 2, y: H / 2, r: 100, count: 12, seed: 1, alpha: 1, color: '#fff2c0', size: 1 });
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; const sp = sparkSprite(o.color), gs = glowSprite(o.color);
    for (let i = 0; i < o.count; i++) {
      const h = (k) => A.hash(i * 7.31 + o.seed * 19.7 + k * 1.37);
      const per = 0.7 + h(1) * 1.3; const cyc = t / per + h(2); const ci = Math.floor(cyc), ph = cyc - ci;
      const hh = (k) => A.hash(i * 3.1 + ci * 11.7 + o.seed * 5.3 + k);
      const a = hh(1) * TAU, d = Math.sqrt(hh(2)) * o.r; const x = o.x + Math.cos(a) * d, y = o.y + Math.sin(a) * d;
      const tw = Math.pow(Math.sin(ph * Math.PI), 2); const sz = (8 + hh(3) * 16) * o.size * tw;
      sprRot(ctx, sp, x, y, sz, o.alpha * tw, (hh(4) - 0.5) * 0.3); spr(ctx, gs, x, y, sz * 0.8, 0.4 * o.alpha * tw);
    }
    ctx.restore();
  };

  // =================================================================== BURST
  E.burst = function (ctx, t, o) {
    o = opt(o, { x: W / 2, y: H / 2, p: 0, r: 400, color: A.PAL.star, seed: 1, rays: 18, particles: 44 });
    const p = o.p; if (p <= 0 || p >= 1) return; const R = o.r, col = o.color, hot = mixc(col, '#ffffff', 0.6);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    // flash
    const fl = A.clamp(p / 0.04) * Math.pow(1 - A.clamp(p / 0.45), 2);
    spr(ctx, glowSprite(col), o.x, o.y, R * (0.8 + 0.6 * p), 0.9 * fl); spr(ctx, glowSprite(hot), o.x, o.y, R * 0.35, fl); spr(ctx, coreSprite('#ffffff'), o.x, o.y, R * 0.12, fl);
    // rays
    for (let k = 0; k < o.rays; k++) {
      const h1 = A.hash(k * 3.7 + o.seed), h2 = A.hash(k * 9.1 + o.seed * 2); const an = (k / o.rays) * TAU + h1 * 0.3 + p * 0.15;
      const len = R * (0.5 + 0.9 * h2) * A.ease.outCubic(A.clamp(p * 2.2)); const a = Math.pow(1 - p, 1.6) * (0.35 + 0.4 * h1); const wb = (3 + 9 * h2) * (1 - p * 0.6);
      const c = Math.cos(an), s = Math.sin(an); const g = ctx.createLinearGradient(o.x, o.y, o.x + c * len, o.y + s * len);
      g.addColorStop(0, rgba(hot, a)); g.addColorStop(1, rgba(col, 0)); ctx.fillStyle = g;
      ctx.beginPath(); ctx.moveTo(o.x - s * wb, o.y + c * wb); ctx.lineTo(o.x + c * len, o.y + s * len); ctx.lineTo(o.x + s * wb, o.y - c * wb); ctx.fill();
    }
    // ring
    const rr = R * A.ease.outCubic(p); const ra = Math.pow(1 - p, 1.4);
    ctx.strokeStyle = rgba(col, 0.35 * ra); ctx.lineWidth = 4 + 26 * (1 - p); ctx.beginPath(); ctx.arc(o.x, o.y, rr, 0, TAU); ctx.stroke();
    ctx.strokeStyle = rgba(hot, 0.8 * ra); ctx.lineWidth = 1.5 + 3 * (1 - p); ctx.beginPath(); ctx.arc(o.x, o.y, rr, 0, TAU); ctx.stroke();
    const r2 = R * 0.7 * A.ease.outCubic(A.clamp((p - 0.08) / 0.92)); if (r2 > 0) { ctx.strokeStyle = rgba(hot, 0.35 * ra); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(o.x, o.y, r2, 0, TAU); ctx.stroke(); }
    // particles
    const gs = glowSprite(col), cs = coreSprite(col), sp = sparkSprite(hot);
    for (let i = 0; i < o.particles; i++) {
      const h1 = A.hash(i * 1.3 + o.seed * 7), h2 = A.hash(i * 4.7 + o.seed * 3), h3 = A.hash(i * 8.9 + o.seed);
      const an = h1 * TAU, d = R * (0.3 + 0.95 * h2) * A.ease.outCubic(p) ; const x = o.x + Math.cos(an) * d, y = o.y + Math.sin(an) * d + p * p * 40;
      const tw = 0.55 + 0.45 * Math.sin(t * (10 + h3 * 10) + i); const a = Math.pow(1 - p, 1.1) * tw;
      spr(ctx, gs, x, y, 12 + 10 * h3, 0.5 * a); spr(ctx, cs, x, y, 3 + 3 * h3, a); if (h3 > 0.6) spr(ctx, sp, x, y, 10 + 14 * tw, a * 0.8);
    }
    ctx.restore();
  };

  // =================================================================== SHOOTING STAR
  E.shootingStar = function (ctx, t, o) {
    o = opt(o, { x: W / 2, y: H / 2, angle: 2.4, len: 400, alpha: 1, wobble: 0, color: A.PAL.star, width: 1 });
    if (o.alpha <= 0) return; const dx = Math.cos(o.angle), dy = Math.sin(o.angle); const wd = o.width;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const N = 30; const pts = [];
    for (let i = 0; i <= N; i++) {
      const s = i / N, d = s * o.len; const w = o.wobble * 26 * Math.sin(s * 9 - t * 9) * s;
      pts.push([o.x - dx * d - dy * w, o.y - dy * d + dx * w, s]);
    }
    const band = (W0, colA, a) => {
      ctx.beginPath();
      for (let i = 0; i <= N; i++) { const [x, y, s] = pts[i]; const w = W0 * Math.pow(1 - s, 1.2) * wd; if (i === 0) ctx.moveTo(x + dy * w, y - dx * w); else ctx.lineTo(x + dy * w, y - dx * w); }
      for (let i = N; i >= 0; i--) { const [x, y, s] = pts[i]; const w = W0 * Math.pow(1 - s, 1.2) * wd; ctx.lineTo(x - dy * w, y + dx * w); }
      const e = pts[N]; const g = ctx.createLinearGradient(o.x, o.y, e[0], e[1]); g.addColorStop(0, rgba(colA, a)); g.addColorStop(0.35, rgba(colA, a * 0.45)); g.addColorStop(1, rgba(colA, 0));
      ctx.fillStyle = g; ctx.fill();
    };
    band(16, o.color, 0.3 * o.alpha); band(5, mixc(o.color, '#ffffff', 0.6), 0.9 * o.alpha); band(1.6, '#ffffff', o.alpha);
    // debris
    for (let i = 0; i < 18; i++) {
      const h1 = A.hash(i * 2.3 + 1), h2 = A.hash(i * 5.1 + 2); const ph = frac(t * (0.8 + h2) + h1);
      const s = Math.min(0.95, ph * 0.9 + 0.03); const idx = Math.min(N, Math.round(s * N)); const [x, y] = pts[idx];
      const sd = (h2 - 0.5) * 30 * s * wd; const X = x - dy * sd, Y = y + dx * sd + ph * 16;
      const a = (1 - s) * o.alpha * (0.5 + 0.5 * Math.sin(t * 17 + i * 3));
      spr(ctx, coreSprite(o.color), X, Y, 3 * wd, a); if (i % 3 === 0) sprRot(ctx, sparkSprite(o.color), X, Y, 12 * wd * (1 - s), a, 0);
    }
    // head
    spr(ctx, glowSprite(o.color), o.x, o.y, 110 * wd, 0.5 * o.alpha); spr(ctx, glowSprite('#fff6d8'), o.x, o.y, 34 * wd, 0.9 * o.alpha);
    spr(ctx, coreSprite('#ffffff'), o.x, o.y, 11 * wd, o.alpha); sprRot(ctx, sparkSprite('#fff4cc'), o.x, o.y, (48 + 10 * Math.sin(t * 20)) * wd, 0.9 * o.alpha, 0);
    ctx.restore();
  };

  // =================================================================== CONSTELLATION
  E.constellation = function (ctx, t, o) {
    o = opt(o, { points: [], lines: [], p: 1, alpha: 1, color: '#cfe2ff', starColor: '#fff3cf', size: 1 });
    const P = o.points, Ls = o.lines, nL = Ls.length, a0 = o.alpha; if (a0 <= 0 || !P.length) return;
    // appearance times
    const app = P.map((_, i) => (nL ? 2 : i / P.length));
    Ls.forEach(([i, j], k) => { app[i] = Math.min(app[i], k / nL); app[j] = Math.min(app[j], (k + 1) / nL); });
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    // lines
    const stepP = o.p * nL;
    for (let k = 0; k < nL; k++) {
      const f = A.clamp(stepP - k); if (f <= 0) continue; const [i, j] = Ls[k]; const p0 = P[i], p1 = P[j];
      const dx = p1.x - p0.x, dy = p1.y - p0.y, L = Math.hypot(dx, dy) || 1; const ux = dx / L, uy = dy / L; const gap = Math.min(L * 0.25, 13 * o.size);
      const sx = p0.x + ux * gap, sy = p0.y + uy * gap; const ex = sx + (L - 2 * gap) * f * ux, ey = sy + (L - 2 * gap) * f * uy;
      ctx.strokeStyle = rgba(o.color, 0.14 * a0); ctx.lineWidth = 7 * o.size; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke();
      ctx.strokeStyle = rgba(o.color, 0.75 * a0); ctx.lineWidth = 1.8 * o.size; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke();
      if (f < 1) { spr(ctx, glowSprite(o.color), ex, ey, 26 * o.size, 0.8 * a0); spr(ctx, coreSprite('#ffffff'), ex, ey, 5 * o.size, a0); }
    }
    // stars
    for (let i = 0; i < P.length; i++) {
      const pt = P[i]; const e = A.clamp((o.p - app[i]) * Math.max(nL, P.length) * 1.5); if (e <= 0 && o.p < 1) continue;
      const pop = A.ease.outBack(Math.max(e, o.p >= 1 ? 1 : e)); const m = pt.m == null ? 0.7 : pt.m; const tw = 0.85 + 0.15 * Math.sin(t * (2 + m) + i * 1.7);
      const flash = Math.max(0, 1 - e) * 0 + (e > 0 && e < 1 ? (1 - e) * 1.2 : 0); const z = o.size * pop;
      spr(ctx, glowSprite(o.color), pt.x, pt.y, (34 + 40 * m) * z * (1 + flash), 0.45 * a0 * tw);
      spr(ctx, glowSprite(o.starColor), pt.x, pt.y, (12 + 10 * m) * z, 0.7 * a0);
      spr(ctx, coreSprite('#ffffff'), pt.x, pt.y, (4 + 4 * m) * z, a0);
      sprRot(ctx, sparkSprite(o.starColor), pt.x, pt.y, (18 + 34 * m) * z * tw * (1 + flash * 0.8), 0.75 * a0, 0);
    }
    ctx.restore();
  };
  // normalized (0..1) little girl with a bob haircut, waving her right hand (viewer's right)
  E.MIO_CONSTELLATION = {
    points: [
      { x: 0.42, y: 0.04, m: 0.75 }, // 0 top of head
      { x: 0.29, y: 0.10, m: 0.6 },  // 1 left temple
      { x: 0.26, y: 0.26, m: 0.8 },  // 2 left bob tip (flicks out)
      { x: 0.42, y: 0.31, m: 0.55 }, // 3 chin
      { x: 0.58, y: 0.26, m: 0.8 },  // 4 right bob tip
      { x: 0.55, y: 0.10, m: 0.6 },  // 5 right temple
      { x: 0.35, y: 0.42, m: 0.65 }, // 6 left shoulder
      { x: 0.49, y: 0.42, m: 0.65 }, // 7 right shoulder
      { x: 0.20, y: 0.60, m: 0.6 },  // 8 left hand (arm down)
      { x: 0.22, y: 0.74, m: 0.8 },  // 9 skirt hem left
      { x: 0.62, y: 0.74, m: 0.8 },  // 10 skirt hem right
      { x: 0.35, y: 0.95, m: 0.6 },  // 11 left foot
      { x: 0.49, y: 0.95, m: 0.6 },  // 12 right foot
      { x: 0.66, y: 0.33, m: 0.6 },  // 13 right elbow
      { x: 0.76, y: 0.12, m: 1.0 },  // 14 waving hand (brightest)
    ],
    // drawing order: head → shoulders → dress → legs → lowered arm → waving arm last
    lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 0], [3, 6], [3, 7], [6, 9], [7, 10], [9, 10], [9, 11], [10, 12], [6, 8], [7, 13], [13, 14]],
    hand: 14, head: 0,
  };
  // helper: scale MIO_CONSTELLATION (or any normalized set) into a box → {points, lines}
  E.fitConstellation = (def, x, y, w, h) => ({ points: def.points.map((p) => ({ x: x + p.x * w, y: y + p.y * h, m: p.m })), lines: def.lines });
})();
