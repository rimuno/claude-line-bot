// ===== s5_farewell : 別れ（45.0–53.5） =====
// Cut A (45.0–50.3) two-shot: Mio (left) + radiant Hoshi (right) at eye level, warm backlight, town bokeh, slow push-in.
// Cut B (50.3–53.5) close-up: teary smile, Hoshi touches her hair → star hairpin (50.9 キラン), waves, launches up at 53.0.
(function () {
  const A = window.A, W = A.W, H = A.H, P = A.PAL, TAU = Math.PI * 2;
  const sin = Math.sin, cos = Math.cos;
  const T0 = 45.0, CUT_B = 50.3, HAIR = 50.9, LAUNCH = 53.0;
  const FACE = { x: 21, y: -303 };           // Mio face anchor (world, s=1 at origin)

  // ------------------------------------------------------------------ cached blurred background
  const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  const BGW = 2400, BGH = 1400, MX = 240, MY = 160;
  let BG = null;
  function buildBG() {
    const full = mk(BGW, BGH); const g = full.getContext('2d');
    g.save(); g.translate(MX, MY);
    const so = { offsetY: 520, warmGlow: 1 };
    A.env.sky(g, 50, so); A.env.clouds(g, 50, so);
    const res = A.env.town(g, 50, { x: 960, y: 1180, s: 2.3, litFn: (i) => (i < 16 || A.hash(i * 3.7) < 0.3 ? 1 : 0), lighthouse: 0, reflections: false });
    g.restore();
    // grade: violet at top, warm lift at bottom
    const gr = g.createLinearGradient(0, 0, 0, BGH); gr.addColorStop(0, 'rgba(10,8,40,0.55)'); gr.addColorStop(0.45, 'rgba(30,20,70,0.25)'); gr.addColorStop(1, 'rgba(60,30,40,0.2)');
    g.fillStyle = gr; g.fillRect(0, 0, BGW, BGH);
    const blur = mk(BGW / 2, BGH / 2); const b = blur.getContext('2d');
    b.filter = 'blur(6px)'; b.drawImage(full, 0, 0, BGW / 2, BGH / 2); b.filter = 'none';
    const lights = res.windows.filter((w) => w.lit > 0.5).map((w, k) => ({ x: w.x, y: w.y, h: A.hash(k * 5.13 + 2) }));
    BG = { blur, lights };
  }
  const SPR = new Map();
  function bokehSprite(col) {
    let c = SPR.get(col); if (c) return c;
    c = mk(128, 128); const g = c.getContext('2d');
    const gr = g.createRadialGradient(64, 64, 0, 64, 64, 63);
    gr.addColorStop(0, A.rgba(col, 0.42)); gr.addColorStop(0.72, A.rgba(col, 0.55)); gr.addColorStop(0.86, A.rgba(col, 0.8)); gr.addColorStop(0.93, A.rgba(col, 0.35)); gr.addColorStop(1, A.rgba(col, 0));
    g.fillStyle = gr; g.beginPath(); g.arc(64, 64, 64, 0, TAU); g.fill();
    SPR.set(col, c); return c;
  }
  const BOKEH_COLS = ['#ffc764', '#ffb070', '#ffe2a0', '#ff9a6a'];
  // bg view: sc (scale), ox/oy (screen offset), blurK bokeh size multiplier
  function drawBackground(ctx, t, v) {
    if (!BG) buildBG();
    const map = (x, y) => ({ x: 960 + (x - 960) * v.sc + v.ox, y: 540 + (y - 540) * v.sc + v.oy });
    const o = map(-MX, -MY);
    ctx.drawImage(BG.blur, o.x, o.y, BGW * v.sc, BGH * v.sc);
    // bokeh on the window lights
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < BG.lights.length; i++) {
      const L = BG.lights[i]; const p = map(L.x, L.y);
      const r = (26 + 30 * L.h) * v.blurK; if (p.x < -r || p.x > W + r || p.y < -r || p.y > H + r) continue;
      const br = 0.55 + 0.45 * (0.5 + 0.5 * sin(t * (0.8 + L.h) + i * 1.7));
      ctx.globalAlpha = 0.5 * br * v.bokehA; ctx.drawImage(bokehSprite(BOKEH_COLS[i % 4]), p.x - r, p.y - r, 2 * r, 2 * r);
    }
    // extra large soft bokeh drifting (far, violet/amber)
    for (let i = 0; i < 14; i++) {
      const h1 = A.hash(i * 7.1 + 3), h2 = A.hash(i * 2.9 + 11), h3 = A.hash(i * 4.3 + 5);
      const x = ((h1 * 2400 + t * (6 + h3 * 10) + v.ox * 0.6) % 2400) - 240, y = 120 + h2 * 820 + sin(t * 0.4 + i) * 12 + v.oy * 0.3;
      const r = (50 + 70 * h3) * v.blurK; const col = i % 3 ? '#ffc98a' : '#b9a6ff';
      ctx.globalAlpha = (0.14 + 0.1 * sin(t * 0.9 + i * 2.3)) * v.bokehA; ctx.drawImage(bokehSprite(col), x - r, y - r, 2 * r, 2 * r);
    }
    ctx.restore();
  }
  // floating light motes (screen space, parallax). near=true → big, soft, foreground (DOF)
  function motes(ctx, t, v, near) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const n = near ? 7 : 46;
    for (let i = 0; i < n; i++) {
      const h = (k) => A.hash(i * 13.7 + k * 3.1 + (near ? 99 : 0));
      const sp = near ? 26 + h(1) * 20 : 14 + h(1) * 22;
      const yy = ((h(2) * 1300 - t * sp - v.oy * (near ? 1.4 : 0.6)) % 1300 + 1300) % 1300 - 110;
      const xx = ((h(3) * 2200 + A.noise(t * 0.3 + i, 4) * 60 + v.ox * (near ? 1.6 : 0.8) + v.drift * (near ? 1.8 : 1)) % 2200 + 2200) % 2200 - 140;
      const tw = 0.5 + 0.5 * sin(t * (2 + h(4) * 3) + i);
      if (near) {
        const r = 60 + h(5) * 70; const cl = A.smooth((Math.hypot(xx - 900, (yy - 450) * 1.4) - 380) / 260); ctx.globalAlpha = (0.08 + 0.07 * tw) * v.moteA * cl; ctx.drawImage(bokehSprite(i % 2 ? '#ffe2a0' : '#ffc764'), xx - r, yy - r, 2 * r, 2 * r);
      } else {
        const r = (2 + h(5) * 3.5) * v.moteS; A.env.glow(ctx, xx, yy, r * 5, '#ffd98a', 0.35 * tw * v.moteA);
        ctx.globalAlpha = (0.5 + 0.5 * tw) * v.moteA; ctx.fillStyle = '#fff4cc'; ctx.beginPath(); ctx.arc(xx, yy, r * 0.6, 0, TAU); ctx.fill();
      }
    }
    ctx.restore();
  }

  // head-local → world, from Mio's returned anchors (head=(0,-64), face=(12,20) in head coords)
  function headMap(r) {
    const wx = r.face.x - r.head.x, wy = r.face.y - r.head.y;
    const th = Math.atan2(wy, wx) - Math.atan2(84, 12), k = Math.hypot(wx, wy) / Math.hypot(12, 84);
    const c = cos(th) * k, s = sin(th) * k;
    return (px, py) => { const dx = px, dy = py + 64; return { x: r.head.x + c * dx - s * dy, y: r.head.y + s * dx + c * dy }; };
  }
  const sparkleSoft = (ctx, x, y, r, a, rot = 0) => A.env.sparkle(ctx, x, y, r, '#fff6d8', a, rot);

  // ================================================================== CUT A
  function hoshiA(t) {
    // entrance: from her head (end of s4) floating down/forward to eye level
    const e = A.ease.outCubic(A.range(t, 44.7, 46.0));
    let x = A.lerp(14, 128, e), y = A.lerp(-420, -318, e) - sin(e * Math.PI) * 30;
    let rot = A.lerp(-0.3, 0, e), sq = 0, look = { x: -0.7, y: 0.25 }, expr = 'tender';
    // bob
    x += sin(t * 1.3) * 3; y += sin(t * 2.4) * 5;
    // "ありがとう" bow (45.8–46.4)
    const bow = sin(Math.PI * A.range(t, 45.75, 46.5));
    y += bow * 9; rot -= bow * 0.22; sq += bow * 0.25;
    // "ミオ" lean closer (46.7–47.2)
    const lean = A.tween(t, 46.6, 47.0, 0, 1, A.ease.outBack) - A.tween(t, 47.3, 47.7, 0, 1);
    x -= lean * 14; rot -= lean * 0.08;
    // "空から" rise & look up (47.45–48.35)
    const up = A.tween(t, 47.35, 47.8, 0, 1, A.ease.outBack) * (1 - A.tween(t, 48.35, 48.9, 0, 1));
    y -= up * 34; x += up * 10; rot += up * 0.12;
    if (up > 0.35) { look = { x: 0.2, y: -1 }; expr = 'smile'; }
    // stretch on the rise, squash as it settles
    sq += -0.3 * sin(Math.PI * A.range(t, 47.35, 47.75)) + 0.2 * sin(Math.PI * A.range(t, 48.35, 48.8));
    // "ずっと見てるのだ" come in close, tender (48.7–50.2)
    const near = A.tween(t, 48.6, 49.3, 0, 1);
    x -= near * 16; y += near * 4;
    if (t > 49.35) look = { x: -0.8, y: 0.1 };
    if (t < 45.6) look = { x: -0.4, y: 0.6 };
    return { x, y, rot, sq, look, expr };
  }
  function cutA(ctx, t, lt) {
    const push = A.ease.inOutSine(A.range(t, 44.8, 50.3));
    const cam = { x: A.lerp(78, 70, push), y: A.lerp(-270, -280, push), zoom: A.lerp(3.55, 4.05, push) };
    const sh = A.shake(t, 1.2, 3); cam.x += sh.dx / cam.zoom; cam.y += sh.dy / cam.zoom;
    const v = { sc: A.lerp(1.02, 1.1, push), ox: A.lerp(40, -40, push), oy: A.lerp(-30, 10, push), blurK: 1, bokehA: 1, moteA: 1, moteS: 1, drift: -t * 8 };
    // background
    drawBackground(ctx, t, v);
    const hs = hoshiA(t);
    const toS = (p) => ({ x: (p.x - cam.x) * cam.zoom + W / 2, y: (p.y - cam.y) * cam.zoom + H / 2 });
    const mS = toS({ x: FACE.x - 20, y: FACE.y + 20 });
    // warm backlight behind Mio's head (town glow)
    A.env.glow(ctx, mS.x - 120, mS.y - 60, 900, '#ffab5a', 0.22 + 0.03 * sin(t * 1.7));
    motes(ctx, t, v, false);
    A.camera(ctx, cam, () => {
      // Mio
      const teary = t >= 49.25;
      let look = { x: 0.62, y: -0.05 };
      if (t < 45.9) look = { x: 0.2, y: -0.75 };                        // following Hoshi down from her head
      else if (t < 46.2) look = { x: A.lerp(0.2, 0.62, A.range(t, 45.9, 46.2)), y: A.lerp(-0.75, -0.05, A.range(t, 45.9, 46.2)) };
      const upk = A.tween(t, 47.5, 47.8, 0, 1) * (1 - A.tween(t, 48.4, 48.7, 0, 1));
      look = { x: look.x - upk * 0.1, y: look.y - upk * 0.45 };
      const nod = sin(Math.PI * A.range(t, 46.75, 47.35));               // tiny nod at her name
      const tilt = 0.05 * A.tween(t, 48.8, 49.6, 0, 1) + nod * 0.03 - 0.02;
      A.drawMio(ctx, { x: 0, y: nod * 2.5, s: 1, t, pose: 'cup', expr: teary ? 'teary_smile' : 'smile', face: 1, look, headTilt: tilt, wind: 0.22,
        light: { x: hs.x, y: hs.y, color: '#fff1c2', strength: 1.25, radius: 260 } });
      // Hoshi
      A.drawHoshi(ctx, { x: hs.x, y: hs.y, s: 0.36, t, glow: 1.6, expr: hs.expr, look: hs.look, rot: hs.rot, squash: hs.sq });
      A.env.sparkles(ctx, t, { x: hs.x, y: hs.y, r: 60, count: 10, seed: 5, size: 0.3, alpha: 0.9 });
    });
    // opening: the burst resolving (white-gold bloom decays)
    const bl = 1 - A.range(t, 44.8, 45.9);
    if (bl > 0) {
      const hS = toS(hs);
      A.env.burst(ctx, t, { x: hS.x, y: hS.y, p: A.lerp(0.35, 1, A.range(t, 44.6, 46.2)), r: 700, seed: 7 });
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = A.rgba('#fff3d0', 0.55 * bl * bl); ctx.fillRect(0, 0, W, H); ctx.restore();
    }
    motes(ctx, t, v, true);
  }

  // ================================================================== CUT B
  function cutB(ctx, t, lt) {
    const push = A.ease.inOutSine(A.range(t, CUT_B, 53.4));
    const tiltUp = A.ease.inOutCubic(A.range(t, 52.95, 53.6));
    const cam = { x: A.lerp(38, 34, push), y: A.lerp(-300, -303, push) - tiltUp * 18, zoom: A.lerp(5.9, 6.35, push) };
    const kick = Math.max(0, 1 - A.range(t, LAUNCH, LAUNCH + 0.5));
    const sh = A.shake(t * (1 + kick * 6), 1 + kick * (t > LAUNCH ? 5 : 0), 8); cam.x += sh.dx / cam.zoom; cam.y += sh.dy / cam.zoom;
    const v = { sc: A.lerp(1.55, 1.62, push), ox: A.lerp(-140, -170, push), oy: -250 + tiltUp * 60, blurK: 1.6, bokehA: 0.55, moteA: 1, moteS: 1.6, drift: -t * 6 };
    drawBackground(ctx, t, v);
    const toS = (p) => ({ x: (p.x - cam.x) * cam.zoom + W / 2, y: (p.y - cam.y) * cam.zoom + H / 2 });

    // ---- Hoshi path (pin position estimated for lighting; exact pin from Mio anchors below)
    const pinEst = { x: -9, y: -367 };
    const hoshiAt = (pin) => {
      const rest = { x: FACE.x + 74, y: FACE.y - 12 };
      const touch = { x: pin.x + 12, y: pin.y - 17 };
      const away = { x: FACE.x + 80, y: FACE.y - 26 };
      let x = rest.x, y = rest.y, rot = 0, sq = 0, look = { x: -0.8, y: 0.1 }, expr = 'tender';
      // anticipation (pull back) then arc over the forehead to the hair
      const ant = sin(Math.PI * A.range(t, 50.45, 50.62));
      x += ant * 6; sq += ant * 0.25;
      const g = A.ease.inOutCubic(A.range(t, 50.55, HAIR));
      if (g > 0) { x = A.lerp(rest.x, touch.x, g); y = A.lerp(rest.y, touch.y, g) - sin(g * Math.PI) * 26; rot = -0.35 * g; look = { x: -0.6, y: 0.6 }; sq -= sin(g * Math.PI) * 0.2; }
      // touch: squash + nuzzle
      const tk = A.range(t, HAIR, 51.5);
      if (t >= HAIR && t < 51.5) { sq += 0.6 * Math.exp(-tk * 9) * cos(tk * 30); rot += 0.06 * sin(tk * 14); expr = 'tender'; look = { x: -0.5, y: 0.8 }; }
      // back away up-right
      const b = A.ease.outCubic(A.range(t, 51.5, 52.1));
      if (t >= 51.5) { x = A.lerp(touch.x, away.x, b); y = A.lerp(touch.y, away.y, b); rot = A.lerp(-0.35, 0.05, b); look = { x: -0.8, y: 0.3 }; }
      // wave
      if (t >= 51.95 && t < 52.8) { expr = 'joy'; }
      // anticipation dip then launch
      const dip = A.ease.inOutSine(A.range(t, 52.72, LAUNCH));
      if (t >= 52.72) { y += dip * 10; sq += dip * 0.5; expr = 'smile'; look = { x: -0.3, y: -0.8 }; }
      let gone = 0;
      if (t >= LAUNCH) { const u = A.range(t, LAUNCH, LAUNCH + 0.22); y = away.y + 10 - A.ease.inCubic(u) * 420; sq = -2.2 * sin(Math.PI * Math.min(1, u * 1.4 + 0.25)); rot = 0; gone = u; }
      // bob when idle
      const idle = (t < 50.55 ? 1 : 0) + (t > 51.9 && t < 52.72 ? 1 : 0);
      x += idle * sin(t * 1.4) * 2; y += idle * sin(t * 2.6) * 3;
      return { x, y, rot, sq, look, expr, gone };
    };
    let hs = hoshiAt(pinEst);
    const hS0 = toS(hs);
    // warm backlight
    A.env.glow(ctx, 760, 360, 1000, '#ffab5a', 0.2 + 0.03 * sin(t * 1.5));
    motes(ctx, t, v, false);

    let pinS = null, tearS = [];
    A.camera(ctx, cam, () => {
      // Mio acting
      let look = { x: 0.6, y: -0.1 };
      const gUp = A.range(t, 50.7, 50.95), gBack = A.range(t, 51.55, 51.9);
      if (t >= 50.7 && t < 51.55) look = { x: A.lerp(0.6, 0.05, gUp), y: A.lerp(-0.1, -0.85, gUp) };        // eyes up to the hairpin
      else if (t >= 51.55) look = { x: A.lerp(0.05, 0.6, gBack), y: A.lerp(-0.85, -0.45, gBack) };            // back to Hoshi (up-right)
      const upL = A.ease.outCubic(A.range(t, LAUNCH - 0.02, LAUNCH + 0.3));
      if (t >= LAUNCH - 0.02) look = { x: A.lerp(0.6, 0.35, upL), y: A.lerp(-0.45, -1, upL) };
      const nod = sin(Math.PI * A.range(t, 50.42, 50.85));                   // "うん…"
      const lean = A.tween(t, 50.75, 51.0, 0, 1) * (1 - A.tween(t, 51.4, 51.8, 0, 1));   // lean into the touch
      const tilt = -0.06 * lean + 0.03 * nod + 0.02 * A.tween(t, 51.8, 52.4, 0, 1) - 0.04 * upL;
      // light: Hoshi (and its trail) lights her face
      const lp = t < LAUNCH ? hs : { x: hs.x, y: Math.max(hs.y, cam.y - 110) };
      const lStr = 1.2 + 0.8 * A.range(t, HAIR - 0.05, HAIR + 0.1) * (1 - A.range(t, HAIR + 0.1, HAIR + 0.7)) + (t >= LAUNCH ? 1.2 * (1 - A.range(t, LAUNCH + 0.2, 53.9)) : 0);
      const r = A.drawMio(ctx, { x: 0, y: nod * 2 - upL * 3, s: 1, t, pose: 'cup', expr: 'teary_smile', face: 1, look, headTilt: tilt, wind: 0.25 + 0.5 * Math.max(0, 1 - A.range(t, LAUNCH, LAUNCH + 1.0)) * (t >= LAUNCH ? 1 : 0),
        hairpin: A.range(t, HAIR, HAIR + 0.4), light: { x: lp.x, y: lp.y, color: '#fff1c2', strength: lStr, radius: 240 } });
      const hm = headMap(r);
      const pin = hm(-30, -33);
      pinS = toS(pin); tearS = [toS(hm(-18, 28)), toS(hm(38, 27.5))];
      hs = hoshiAt(pin);
      // Hoshi
      if (hs.gone < 1) A.drawHoshi(ctx, { x: hs.x, y: hs.y, s: 0.3, t, glow: 1.45, expr: hs.expr, look: hs.look, rot: hs.rot, squash: hs.sq });
    });
    const hS = toS(hs);
    // sparkles around Hoshi (screen space)
    if (hs.gone < 0.5) A.env.sparkles(ctx, t, { x: hS.x, y: hS.y, r: 150, count: 9, seed: 9, size: 0.9, alpha: 0.9 });
    // tear glints
    for (let i = 0; i < 2; i++) { const p = tearS[i]; const tw = Math.pow(0.5 + 0.5 * sin(t * 3.1 + i * 2.2), 3); sparkleSoft(ctx, p.x + 3, p.y - 3, 10 + 22 * tw, 0.25 + 0.6 * tw, 0.2); }
    // ---- キラン at 50.9: hairpin sparkle
    const kk = A.range(t, HAIR - 0.02, HAIR + 0.7);
    if (kk > 0 && kk < 1 && pinS) {
      const f = Math.pow(1 - kk, 1.5); const fl = sin(Math.PI * A.range(t, HAIR - 0.02, HAIR + 0.22));
      A.env.glow(ctx, pinS.x, pinS.y, 200 * (0.6 + fl), '#fff2c0', 0.4 * f);
      A.env.sparkle(ctx, pinS.x, pinS.y, 90 + 130 * fl, '#fffbe6', Math.max(fl, f * 0.6), 0.15);
      A.env.sparkles(ctx, t, { x: pinS.x, y: pinS.y, r: 170 * (0.5 + kk), count: 14, seed: 21, size: 1.1, alpha: f });
    }
    // gentle idle twinkle on the pin afterward
    if (t > HAIR + 0.5 && pinS) { const tw = Math.pow(0.5 + 0.5 * sin(t * 2.3), 4); sparkleSoft(ctx, pinS.x + 22, pinS.y - 20, 40 + 60 * tw, 0.8 * tw, 0.1); }
    // ---- launch trail
    if (t >= LAUNCH - 0.05) {
      const u = A.range(t, LAUNCH, LAUNCH + 0.22); const fade = 1 - A.range(t, LAUNCH + 0.25, 54.0);
      const baseY = toS({ x: hs.x, y: FACE.y - 16 }).y;
      const headY = Math.max(Math.min(hS.y, baseY), -260);
      // the tail end retracts upward after the head has left the frame
      const tailY = A.lerp(baseY + 30, -200, A.ease.inOutSine(A.range(t, LAUNCH + 0.12, LAUNCH + 0.95)));
      const len = Math.max(10, tailY - headY);
      if (fade > 0 && t >= LAUNCH) {
        A.env.shootingStar(ctx, t, { x: hS.x, y: headY, angle: -Math.PI / 2, len, alpha: fade, width: 2.6, wobble: 0.12 });
        // launch puff at the take-off point
        A.env.burst(ctx, t, { x: hS.x, y: baseY, p: A.range(t, LAUNCH, LAUNCH + 0.7), r: 260, seed: 33, rays: 12, particles: 26 });
        // afterglow column + falling glitter
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        const cg = ctx.createLinearGradient(0, baseY, 0, -50); cg.addColorStop(0, A.rgba('#fff2c8', 0)); cg.addColorStop(0.3, A.rgba('#fff2c8', 0.22 * fade)); cg.addColorStop(1, A.rgba('#fff2c8', 0.1 * fade));
        ctx.fillStyle = cg; const wc = 34 + 40 * A.range(t, LAUNCH, 53.9); ctx.fillRect(hS.x - wc, -50, 2 * wc, baseY + 50);
        ctx.restore();
        for (let i = 0; i < 26; i++) {
          const h1 = A.hash(i * 3.3 + 1), h2 = A.hash(i * 7.7 + 2); const born = LAUNCH + h1 * 0.35; if (t < born) continue;
          const age = t - born; const y0 = baseY - h2 * (baseY + 150);
          const x = hS.x + (A.hash(i * 5.1) - 0.5) * 70 + sin(age * 3 + i) * 12 * age; const y = y0 + age * (60 + 90 * h1);
          const a = Math.max(0, 1 - age / (0.8 + h2 * 0.8)) * fade;
          sparkleSoft(ctx, x, y, (16 + 26 * h2) * (0.6 + 0.4 * sin(t * 12 + i)), a, 0);
        }
      }
      // flash of the launch lighting her upturned face
      const fl = sin(Math.PI * A.range(t, LAUNCH - 0.03, LAUNCH + 0.45));
      if (fl > 0) { A.env.glow(ctx, hS0.x - 80, toS(FACE).y - 120, 900, '#fff0c8', 0.45 * fl); }
    }
    motes(ctx, t, v, true);
  }

  A.scene('s5_farewell', {
    transitionIn: { type: 'white', dur: 0.6 },
    draw(ctx, lt, t, info) {
      ctx.save();
      ctx.fillStyle = '#0b0c2c'; ctx.fillRect(0, 0, W, H);
      if (t < CUT_B) cutA(ctx, t, lt); else cutB(ctx, t, lt);
      ctx.restore();
    },
  });
})();
