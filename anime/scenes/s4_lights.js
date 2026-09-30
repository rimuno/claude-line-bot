// ===== s4_lights : 町のみんなが光を貸してくれる（31–45 s） =====
// Shot list (global time):
//  A  30.6–34.7  plaza, low angle. Mio skids to a stop, inhales, shouts「みんなー！少しだけ、光を貸して！」(Hoshi on her head)
//  B1 34.7–35.3  POV reverse: the town slope. first chime windows light (34.8, 35.15)
//  B2 35.3–37.1  cut-in: grandpa at his window raises the lantern; 36.2 an orb leaves it (town chimes behind)
//  B3 37.1–38.0  wide slope again, chain reaction spreads, grandpa's orb + streams fly toward camera (Mio)
//  B4 38.0–39.3  cut-in: kid at his window, 38.8 fireflies burst from the jar
//  B5 39.3–40.3  extreme wide from the sea: whole town lit, dozens of streams converging on tiny Mio on the quay
//  C  40.3–45.0  Mio & Hoshi: spiral rivers of light pour into Hoshi (40.5–44.6), glow 0.3→2, 44.6 white-gold burst
(function () {
  const A = window.A, E = A.env, P = A.PAL, W = A.W, H = A.H, TAU = Math.PI * 2;
  const sin = Math.sin, cos = Math.cos;
  const CH = (k) => 34.8 + 0.35 * k;               // window chime cue times (k = 0..15)
  const G_WIN = 1, K_WIN = 9;                        // grandpa's / kid's window indices in the town model
  const T_LAUNCH = 36.2, T_FLY = 38.8, T_BURST = 44.6;

  // ------------------------------------------------------------------ local sprite cache (fast additive dots)
  const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  const SPR = {};
  const sprite = (col) => SPR[col] || (SPR[col] = (() => {
    const c = mk(64, 64), g = c.getContext('2d'); const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, A.rgba(col, 1)); gr.addColorStop(0.22, A.rgba(col, 0.5)); gr.addColorStop(0.55, A.rgba(col, 0.13)); gr.addColorStop(1, A.rgba(col, 0));
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return c; })());
  const dot = (ctx, x, y, r, col, a) => { if (a <= 0.004 || r < 0.3) return; ctx.globalAlpha = Math.min(1, a); ctx.drawImage(sprite(col), x - r, y - r, r * 2, r * 2); };

  // ------------------------------------------------------------------ window lighting schedule
  let ON = null;
  const onTimes = () => {
    if (ON) return ON; const n = E.townWindowCount({ seed: 1 }); ON = [];
    for (let i = 0; i < n; i++) {
      if (i < 16) { ON.push(CH(i)); continue; }
      if (A.hash(i * 5.13 + 2) < 0.045) { ON.push(-99); continue; }   // a few night-owls are already lit
      const u = (i - 16) / (n - 16);
      ON.push(36.05 + 3.85 * Math.pow(u, 0.6) + (A.hash(i * 3.71) - 0.5) * 0.3);  // accelerating chain reaction, all by ~40
    }
    return ON;
  };
  const litFn = (i, t) => { const on = onTimes()[i]; return on == null ? 0 : A.clamp((t - on) / 0.09); };
  const townO = (X, Y, s) => ({ x: X, y: Y, s, litFn, seed: 1, lighthouse: 0 });

  // chime flash (sparkle + pulse) on the 16 cue windows
  function chimeFx(ctx, t, res, s, ks) {
    for (const k of ks) {
      const dt = t - CH(k); if (dt < -0.02 || dt > 0.7) continue; const w = res.windows[k]; if (!w) continue;
      const f = A.clamp(1 - dt / 0.7); const pop = A.ease.outCubic(A.clamp(dt / 0.12));
      E.glow(ctx, w.x, w.y, 70 * s * (0.6 + 0.6 * pop), P.warm, 0.7 * f);
      E.sparkle(ctx, w.x, w.y, 34 * s * pop * (0.4 + f), '#fff2c0', f, dt * 0.8);
    }
  }
  // streams from lit windows toward a target (town views)
  function townStreams(ctx, t, res, target, ws, opt = {}) {
    const on = onTimes(); const n = res.windows.length;
    for (let i = 0; i < n; i++) {
      if (i === G_WIN || i === K_WIN) continue;
      if (i >= 16 && i % (opt.every || 2)) continue; if (on[i] < 0) continue;
      const h = A.hash(i * 7.77 + 1), h2 = A.hash(i * 2.19 + 5);
      const t0 = on[i] + 0.35 + h * 0.5, dur = 1.6 + h2 * 0.8; const p = (t - t0) / dur;
      if (p <= 0 || p >= 1) continue; const w = res.windows[i];
      E.lightStream(ctx, t, { from: { x: w.x, y: w.y }, to: target, p, seed: i + 3, width: ws * (0.55 + 0.5 * h2) * (i < 16 ? 1.25 : 1), count: i < 16 ? 16 : 7,
        arc: (h - 0.5) * 0.7, color: h2 < 0.45 ? P.warm : h2 < 0.8 ? P.star : '#ffb27a', trail: 0.45 });
    }
    // grandpa's orb (launched at 36.2 from his window)
    const gw = res.windows[G_WIN];
    if (gw) { const p = (t - 36.45) / 2.9; if (p > 0 && p < 1) { const q = E.lightStream(ctx, t, { from: { x: gw.x, y: gw.y }, to: target, p, seed: 77, width: ws * 2.2, count: 26, arc: -0.28, color: P.star, trail: 0.5 }); if (q) { E.glow(ctx, q.x, q.y, 60 * ws, '#ffe9b0', 0.6); } } }
    // kid's fireflies (38.8)
    const kw = res.windows[K_WIN];
    if (kw) { const p = (t - 38.95) / 2.4; if (p > 0 && p < 1) E.lightStream(ctx, t, { from: { x: kw.x, y: kw.y }, to: target, p, seed: 91, width: ws * 1.8, count: 24, arc: 0.3, color: '#b8f06a', trail: 0.55 }); }
  }

  // ------------------------------------------------------------------ soft (defocused) layer helper: draw at 1/4 res, upscale
  const SOFT = {};
  function soft(ctx, key, fn, k = 4) {
    let c = SOFT[key]; if (!c) { c = SOFT[key] = mk(W / k, H / k); }
    const g = c.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, c.width, c.height); g.scale(1 / k, 1 / k); fn(g);
    ctx.save(); ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high'; ctx.drawImage(c, 0, 0, W, H); ctx.restore();
  }

  // ------------------------------------------------------------------ backgrounds
  function skyBg(ctx, t, o) { E.sky(ctx, t, o); E.clouds(ctx, t, o); }

  // plaza floor: cobbles in perspective
  const COB = (() => { const r = A.rng(4411); const a = []; for (let row = 0; row < 22; row++) { const d = row / 21; const y = 955 + Math.pow(d, 1.7) * 330; const hgt = 5 + d * 26; const wid = 22 + d * 70; for (let x = -300 - r() * wid; x < W + 300; x += wid * (0.9 + r() * 0.3)) a.push({ x, y, w: wid * 0.86, h: hgt * 0.8, c: r(), d }); } return a; })();
  function plaza(ctx, t, lampX) {
    const g = ctx.createLinearGradient(0, 940, 0, 1300); g.addColorStop(0, '#2a2c62'); g.addColorStop(0.3, '#1f2254'); g.addColorStop(1, '#10123a');
    ctx.fillStyle = g; ctx.fillRect(-400, 940, W + 800, 500);
    for (const c of COB) { ctx.fillStyle = A.mix('#262a60', '#34306c', c.c); ctx.beginPath(); ctx.ellipse(c.x, c.y, c.w / 2, c.h / 2, 0, 0, TAU); ctx.fill(); ctx.fillStyle = A.rgba('#9aa6ff', 0.07 + 0.05 * c.c); ctx.fillRect(c.x - c.w * 0.3, c.y - c.h * 0.42, c.w * 0.6, Math.max(1, c.h * 0.12)); }
    // step / low wall where the plaza meets the houses
    ctx.fillStyle = '#1a1c48'; ctx.fillRect(-400, 930, W + 800, 22); ctx.fillStyle = A.rgba('#a8b2ff', 0.22); ctx.fillRect(-400, 930, W + 800, 2);
    // warm light pool of the lamp
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.translate(lampX, 1010); ctx.scale(1, 0.28); dot(ctx, 0, 0, 520, P.warm2, 0.3); ctx.restore();
  }
  function lampPost(ctx, t, x, y, s, a = 1) {
    ctx.save(); ctx.fillStyle = '#141433'; ctx.globalAlpha = a;
    ctx.fillRect(x - 6 * s, y - 520 * s, 12 * s, 520 * s); ctx.fillRect(x - 18 * s, y - 30 * s, 36 * s, 30 * s);
    ctx.beginPath(); ctx.moveTo(x - 30 * s, y - 520 * s); ctx.lineTo(x + 30 * s, y - 520 * s); ctx.lineTo(x + 18 * s, y - 590 * s); ctx.lineTo(x - 18 * s, y - 590 * s); ctx.closePath(); ctx.fill();
    ctx.fillRect(x - 36 * s, y - 598 * s, 72 * s, 10 * s);
    ctx.fillStyle = '#ffd98a'; ctx.fillRect(x - 20 * s, y - 582 * s, 40 * s, 56 * s);
    ctx.globalCompositeOperation = 'lighter'; const fl = 0.93 + 0.07 * A.noise(t * 6, 3);
    dot(ctx, x, y - 555 * s, 240 * s, P.warm2, 0.35 * fl * a); dot(ctx, x, y - 555 * s, 70 * s, '#fff0c8', 0.8 * fl * a);
    ctx.restore();
  }

  // house facade with a lit window (cut-ins). opening: {x0,y0,x1,y1}; side = which side the wall edge/corner is (+1 right, -1 left)
  function facade(ctx, t, o) {
    const { x0, y0, x1, y1, wallL, wallR, eaveY, wall, on } = o; const cx = (x0 + x1) / 2;
    // wall
    const g = ctx.createLinearGradient(0, eaveY, 0, 1300); g.addColorStop(0, A.mix(wall, '#0b0b24', 0.35)); g.addColorStop(0.5, wall); g.addColorStop(1, A.mix(wall, '#0b0b24', 0.5));
    ctx.fillStyle = g; ctx.fillRect(wallL, eaveY, wallR - wallL, 1400);
    // plaster blotches
    const r = A.rng(o.seed || 3); ctx.fillStyle = A.rgba('#ffffff', 0.025);
    for (let i = 0; i < 40; i++) { const x = wallL + r() * (wallR - wallL), y = eaveY + r() * 1100; ctx.beginPath(); ctx.ellipse(x, y, 20 + r() * 60, 8 + r() * 20, 0, 0, TAU); ctx.fill(); }
    // timber beams
    ctx.fillStyle = A.mix(wall, '#140c1c', 0.55);
    ctx.fillRect(wallL, eaveY + 30, wallR - wallL, 20); ctx.fillRect(wallL, y1 + 120, wallR - wallL, 18);
    // moonlit wall edge
    if (o.edge) { ctx.fillStyle = A.rgba('#b8c0ff', 0.18); ctx.fillRect(o.edge > 0 ? wallR - 14 : wallL, eaveY, 14, 1400); ctx.fillStyle = 'rgba(0,0,20,0.35)'; ctx.fillRect(o.edge > 0 ? wallR : wallL - 10, eaveY, 10, 1400); }
    // eave + roof tiles
    ctx.fillStyle = '#1c1432'; ctx.fillRect(wallL - 60, eaveY - 30, wallR - wallL + 120, 34);
    ctx.fillStyle = o.roof || '#4a2440'; ctx.beginPath(); ctx.moveTo(wallL - 80, eaveY - 26); ctx.lineTo(wallR + 80, eaveY - 26); ctx.lineTo(wallR + 40, eaveY - 400); ctx.lineTo(wallL - 40, eaveY - 400); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = A.rgba('#000018', 0.35); ctx.lineWidth = 3; for (let y = eaveY - 60; y > eaveY - 400; y -= 34) { ctx.beginPath(); ctx.moveTo(wallL - 80, y); ctx.lineTo(wallR + 80, y); ctx.stroke(); }
    ctx.fillStyle = A.rgba('#c8c0ff', 0.2); ctx.fillRect(wallL - 60, eaveY - 30, wallR - wallL + 120, 3);
    // warm spill on the wall around the window
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; dot(ctx, cx, (y0 + y1) / 2, (x1 - x0) * 1.25, P.warm2, 0.28 * on); ctx.restore();
    // frame
    ctx.fillStyle = '#2a1a22'; ctx.fillRect(x0 - 26, y0 - 26, x1 - x0 + 52, y1 - y0 + 40);
    ctx.fillStyle = '#4a2e2a'; ctx.fillRect(x0 - 18, y0 - 18, x1 - x0 + 36, 10);
    // interior
    const ig = ctx.createRadialGradient(cx, y0 + (y1 - y0) * 0.45, 10, cx, y0 + (y1 - y0) * 0.45, (x1 - x0) * 0.8);
    ig.addColorStop(0, A.mix('#2a2240', '#ffe2a0', on)); ig.addColorStop(0.6, A.mix('#221c3a', '#ffbe6a', on)); ig.addColorStop(1, A.mix('#1a1630', '#c47a44', on));
    ctx.fillStyle = ig; ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
    // shelf + picture frame silhouettes inside
    ctx.fillStyle = A.rgba('#7a4630', 0.45 * on + 0.1); ctx.fillRect(x0 + 20, y0 + (y1 - y0) * 0.3, (x1 - x0) * 0.32, 8);
    ctx.fillRect(x1 - 110, y0 + 50, 70, 54); ctx.fillStyle = A.rgba('#ffe9c0', 0.35 * on); ctx.fillRect(x1 - 102, y0 + 58, 54, 38);
    // curtains (tied back)
    for (const sd of [-1, 1]) {
      const ex = sd < 0 ? x0 : x1; ctx.fillStyle = A.mix('#8a3040', '#e06a60', on * 0.6);
      ctx.beginPath(); ctx.moveTo(ex, y0); ctx.lineTo(ex - sd * 90, y0); ctx.quadraticCurveTo(ex - sd * 20, y0 + (y1 - y0) * 0.45, ex - sd * 50 + sin(t * 1.3 + sd) * 3, y1); ctx.lineTo(ex, y1); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = A.rgba('#2a0a18', 0.4); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(ex - sd * 55, y0 + 10); ctx.quadraticCurveTo(ex - sd * 18, y0 + (y1 - y0) * 0.45, ex - sd * 30, y1 - 10); ctx.stroke();
    }
  }
  function sill(ctx, t, o) {
    const { x0, x1, y1, on } = o;
    ctx.fillStyle = '#3a2420'; ctx.fillRect(x0 - 50, y1, x1 - x0 + 100, 26); ctx.fillStyle = A.rgba('#ffcf8a', 0.35 * on + 0.08); ctx.fillRect(x0 - 50, y1, x1 - x0 + 100, 4);
    ctx.fillStyle = '#281818'; ctx.fillRect(x0 - 40, y1 + 26, x1 - x0 + 80, 14);
    // flower box
    ctx.fillStyle = '#4a2c24'; ctx.fillRect(x0 - 20, y1 + 40, x1 - x0 + 40, 60);
    const r = A.rng(o.seed || 9);
    for (let i = 0; i < 26; i++) {
      const x = x0 - 10 + r() * (x1 - x0 + 20), y = y1 + 40 - r() * 30; const sw = sin(t * 1.6 + i) * 3;
      ctx.fillStyle = A.mix('#1d4a3a', '#2e6a4a', r()); ctx.beginPath(); ctx.ellipse(x + sw, y + 8, 14, 22, (r() - 0.5) * 0.8, 0, TAU); ctx.fill();
      if (r() < 0.55) { ctx.fillStyle = r() < 0.5 ? '#ff7a8a' : '#fff0f4'; ctx.beginPath(); ctx.arc(x + sw * 1.4, y - 12, 7 + r() * 4, 0, TAU); ctx.fill(); ctx.fillStyle = '#ffd86a'; ctx.beginPath(); ctx.arc(x + sw * 1.4, y - 12, 2.5, 0, TAU); ctx.fill(); }
    }
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = A.rgba('#ffb060', 0.12 * on); ctx.fillRect(x0 - 20, y1 + 40, x1 - x0 + 40, 12); ctx.restore();
  }

  // floating dust / motes (every frame has motion)
  function motes(ctx, t, n, seed, col, rect, size = 1, alpha = 1) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < n; i++) {
      const h = (k) => A.hash(i * 13.1 + seed * 7.3 + k);
      const x = rect[0] + ((h(1) * rect[2] + t * (8 + 14 * h(2)) + A.noise(t * 0.3 + i, seed) * 40) % rect[2] + rect[2]) % rect[2];
      const y = rect[1] + ((h(3) * rect[3] - t * (6 + 10 * h(4))) % rect[3] + rect[3]) % rect[3];
      const tw = 0.5 + 0.5 * sin(t * (1.5 + h(5) * 3) + i);
      dot(ctx, x, y, (3 + 6 * h(6)) * size, col, alpha * (0.25 + 0.5 * tw));
    }
    ctx.restore();
  }

  // ================================================================== CUT A : plaza, the call
  function cutA(ctx, t) {
    const lt = t - 31;
    const zoom = A.tween(t, 30.6, 34.7, 1.0, 1.1, A.ease.inOutSine) + 0.025 * Math.exp(-Math.pow((t - 31.5) / 0.12, 2));
    const sh = A.shake(t, 2.5 * A.range(t, 31.35, 31.5) * (1 - A.range(t, 31.9, 32.4)), 5);
    const cam = { x: 960 + sh.dx + A.tween(t, 30.6, 34.7, -20, 30), y: 540 + sh.dy - A.tween(t, 30.6, 34.7, 0, 30), zoom, rot: -0.012 };
    A.camera(ctx, cam, () => {
      // sky + far/near town (parallax: far layer drifts more slowly than near)
      skyBg(ctx, t, { offsetY: 330, offsetX: -lt * 4, warmGlow: 0.5 });
      E.town(ctx, t, townO(1060 - lt * 6, 1210, 2.35));
      // cool haze to push the town back and separate Mio
      const hz = ctx.createLinearGradient(0, 300, 0, 960); hz.addColorStop(0, 'rgba(16,20,70,0)'); hz.addColorStop(1, 'rgba(22,26,80,0.55)'); ctx.fillStyle = hz; ctx.fillRect(-300, 300, W + 600, 660);
      plaza(ctx, t, 1540);
      lampPost(ctx, t, 1540 - lt * 3, 985, 1.0);
      motes(ctx, t, 26, 3, '#b8f06a', [-100, 250, W + 200, 600], 1, 0.7);
      // ---- Mio
      const mx = t < 31.25 ? A.lerp(560, 900, A.ease.outCubic(A.range(t, 30.55, 31.25))) : 900;
      let pose = 'call', sx = 1, sy = 1, rot = 0, expr = 'determined', face = 1;
      if (t < 31.25) { pose = 'run'; }
      else if (t < 31.4) { pose = 'stand'; const k = A.range(t, 31.25, 31.4); sy = 1 - 0.07 * sin(k * Math.PI * 0.5 + 0.2) + 0.1 * A.smooth((k - 0.45) / 0.55) * 0.5; sx = 2 - sy; rot = -0.05 * A.smooth(k); }
      else {
        const k = A.range(t, 31.4, 31.65); const m = A.mouth('mio', t).open;
        rot = A.lerp(-0.05, 0.035, A.ease.outBack(k)) + 0.02 * m; sy = 1 + 0.02 * m - 0.03 * (1 - k) * k * 4; sx = 2 - sy;
        if (t > 34.6) { rot = A.lerp(0.035, 0.0, A.smooth(A.range(t, 34.6, 34.9))); }
      }
      const fy = 1045, s = 1.85;
      ctx.save(); ctx.translate(mx, fy); ctx.rotate(rot); ctx.scale(sx, sy); ctx.translate(-mx, -fy);
      // contact shadow
      ctx.fillStyle = 'rgba(8,6,30,0.45)'; ctx.beginPath(); ctx.ellipse(mx + 8, fy + 4, 95, 16, 0, 0, TAU); ctx.fill();
      const lamp = { x: 1540, y: 430, color: P.warm, strength: 0.75 };
      const R = A.drawMio(ctx, { x: mx, y: fy, s, t, pose, expr, face, wind: 0.45, windDir: -1, light: lamp, look: { x: 0.1, y: -0.15 } });
      // Hoshi riding on the head, with follow-through
      const stopK = t - 31.25; let hop = 0, sq = 0, hr = 0;
      if (stopK > 0) { hop = -26 * Math.exp(-stopK * 6) * Math.abs(sin(stopK * 12)); sq = 0.5 * Math.exp(-stopK * 7) * cos(stopK * 20); hr = 0.35 * Math.exp(-stopK * 5) * sin(stopK * 14); }
      else { hop = -8 * Math.abs(sin(t * TAU * 1.5)); hr = 0.15; }
      const shout = Math.exp(-Math.pow((t - 31.55) / 0.12, 2));
      sq += 0.35 * shout; hr += -0.2 * shout;
      E.glow(ctx, R.head.x, R.head.y - 30, 90, P.star, 0.25);
      A.drawHoshi(ctx, { x: R.head.x + 4, y: R.head.y - 24 + hop, s: 0.44, t, glow: 0.3, expr: 'weak', rot: hr - rot, squash: sq, look: { x: 0.2, y: -0.4 } });
      ctx.restore();
      // shout "sound" arcs from the hands (anime accent)
      const m = A.mouth('mio', t).open;
      if (t > 31.4 && t < 34.6 && m > 0.2) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = A.rgba('#fff4d0', 0.25 * m); ctx.lineWidth = 4; ctx.lineCap = 'round';
        const ox = R.mouth.x + 30, oy = R.mouth.y;
        for (let j = 0; j < 3; j++) { const ph = ((t * 2.4 + j / 3) % 1); const rr = 40 + ph * 140; ctx.globalAlpha = 1 - ph; ctx.beginPath(); ctx.arc(ox, oy, rr, -0.55, 0.45); ctx.stroke(); }
        ctx.restore();
      }
    });
    // defocused foreground: dark planter + railing in the lower-left corner, a warm bokeh on the right
    soft(ctx, 'fgA', (g) => {
      g.fillStyle = '#05061a'; g.beginPath(); g.moveTo(-40, 1100); g.lineTo(-40, 780); g.quadraticCurveTo(120, 720, 250, 800); g.lineTo(330, 1100); g.closePath(); g.fill();
      g.fillRect(1720 + lt * 10, 640, 36, 500); g.fillRect(1640 + lt * 10, 700, 300, 26);
      g.globalCompositeOperation = 'lighter'; g.fillStyle = A.rgba(P.warm, 0.18); g.beginPath(); g.arc(1780 + lt * 10, 330, 70, 0, TAU); g.fill();
      g.fillStyle = A.rgba('#b8f06a', 0.16); g.beginPath(); g.arc(160, 520 - lt * 12, 40, 0, TAU); g.fill();
    });
  }

  // ================================================================== town slope views (B1, B3)
  function townView(ctx, t, v) {
    A.camera(ctx, v.cam, () => {
      skyBg(ctx, t, { offsetY: v.skyY, offsetX: v.skyX || 0, warmGlow: 0.5 + 0.4 * A.range(t, 36, 40) });
      E.sea(ctx, t, { offsetY: v.skyY }); E.mountains(ctx, t, { offsetY: v.skyY });
      const res = E.town(ctx, t, townO(v.X, v.Y, v.s));
      chimeFx(ctx, t, res, v.s * 0.8, [...Array(16).keys()]);
      // grandpa's window: tiny silhouette + lantern glow
      const gw = res.windows[G_WIN]; if (gw && t > 35.1) { E.glow(ctx, gw.x + gw.w * 0.3, gw.y - gw.h * 0.2, 18 * v.s, P.star, 0.9 * A.clamp(1.4 - A.range(t, 36.3, 36.6) * 0.5)); }
      townStreams(ctx, t, res, v.target, v.ws);
      motes(ctx, t, 22, 7, '#ffe9b0', [-100, 200, W + 200, 800], 0.8, 0.7);
    });
  }

  // ================================================================== B2 : grandpa cut-in
  function cutGrandpa(ctx, t) {
    const lt = t - 35.3; const follow = A.ease.inOutCubic(A.range(t, T_LAUNCH, T_LAUNCH + 0.7));
    const cam = { x: A.lerp(760, 900, follow) + A.tween(t, 35.3, 36.2, 20, 0), y: A.lerp(530, 500, follow), zoom: A.tween(t, 35.3, 36.2, 1.02, 1.1, A.ease.inOutSine) - 0.06 * follow };
    const op = { x0: 470, y0: 300, x1: 990, y1: 800, wallL: -300, wallR: 1220, eaveY: 150, wall: '#3a3462', on: 1, edge: 1, seed: 4, roof: '#4e2a44' };
    A.camera(ctx, cam, () => {
      skyBg(ctx, t, { offsetY: 520, offsetX: -200 - lt * 8, warmGlow: 0.6 });
      E.mountains(ctx, t, { offsetY: 380 });
      const res = E.town(ctx, t, townO(1330 + lt * 5, 960, 2.6));
      chimeFx(ctx, t, res, 2.0, [2, 3, 4, 5, 6]);
      townStreams(ctx, t, res, { x: 1700, y: 1400 }, 1.4, { every: 3 });
      facade(ctx, t, op);
      // grandpa
      const raise = A.clamp(A.lerp(0, 1, A.ease.outBack(A.range(t, 35.45, 35.95))) - 0.12 * Math.exp(-Math.pow((t - T_LAUNCH - 0.08) / 0.1, 2)));
      const dip = 10 * Math.exp(-Math.pow((t - 35.42) / 0.07, 2)) - 6 * Math.exp(-Math.pow((t - 35.9) / 0.1, 2));
      const lan = 1 - 0.35 * A.range(t, T_LAUNCH, T_LAUNCH + 0.2) + 0.25 * A.range(t, T_LAUNCH + 0.3, T_LAUNCH + 1.0);
      const gs = 2.0, gx = 730, gy = op.y1 + dip;
      const Gr = A.drawGrandpa(ctx, { x: gx, y: gy, s: gs, t, lantern: lan, raise: A.clamp(raise) });
      const L = Gr.lantern;
      // lantern warm aura
      E.glow(ctx, L.x, L.y, 260, P.warm2, 0.35 * lan); E.glow(ctx, L.x, L.y, 90, '#fff0c8', 0.35 * lan);
      // the orb: gathers 35.95–36.2, launches 36.2
      const gather = A.range(t, 35.95, T_LAUNCH);
      if (t < T_LAUNCH + 0.05) {
        const pu = A.ease.inCubic(gather); E.glow(ctx, L.x, L.y - 10, 40 + 90 * pu, P.star, 0.3 + 0.6 * pu);
        E.sparkles(ctx, t, { x: L.x, y: L.y - 10, r: 90 * (1 - pu) + 20, count: 8, seed: 12, alpha: pu });
      }
      const p = (t - T_LAUNCH) / 1.25;
      if (p > 0 && p < 1) {
        const q = E.lightStream(ctx, t, { from: { x: L.x, y: L.y - 10 }, to: { x: 2250, y: 1150 }, p, seed: 5, width: 2.4, count: 30, arc: -0.42, color: P.star, trail: 0.5 });
        if (q) { E.glow(ctx, q.x, q.y, 150, '#ffe9b0', 0.55); E.sparkle(ctx, q.x, q.y, 60 + 10 * sin(t * 20), '#fff8e0', 0.9, t); }
        const pk = A.range(t, T_LAUNCH, T_LAUNCH + 0.35); E.sparkle(ctx, L.x, L.y - 10, 160 * sin(pk * Math.PI), '#fff8e0', 1 - pk, 0.3);
      }
      sill(ctx, t, op);
      motes(ctx, t, 18, 11, '#ffe0a0', [300, 200, 900, 700], 0.9, 0.8);
    });
    // defocused foreground: hanging leaves top-left
    soft(ctx, 'fgG', (g) => {
      g.fillStyle = '#060818';
      for (let i = 0; i < 9; i++) { const x = -40 + i * 45 + sin(t * 1.2 + i) * 8, y = -20 + (i % 3) * 40; g.beginPath(); g.ellipse(x, y + 60, 38, 80, 0.6 - i * 0.12, 0, TAU); g.fill(); }
    });
  }

  // ================================================================== B4 : kid cut-in
  function cutKid(ctx, t) {
    const lt = t - 38.0; const pop = Math.exp(-Math.pow((t - T_FLY - 0.05) / 0.1, 2));
    const sh = A.shake(t * 3, 5 * A.range(t, T_FLY, T_FLY + 0.05) * (1 - A.range(t, T_FLY + 0.2, T_FLY + 0.7)), 17);
    const cam = { x: A.tween(t, 38.0, 39.3, 1180, 1100) + sh.dx, y: A.tween(t, 38.0, 39.3, 560, 520) + sh.dy, zoom: A.tween(t, 38.0, 39.3, 1.08, 1.0, A.ease.inOutSine) + 0.03 * pop, rot: 0.01 };
    const on = A.clamp(0.35 + (t - CH(K_WIN)) / 0.15) * (1 + 0.25 * Math.exp(-(t - CH(K_WIN)) * 8));
    const op = { x0: 960, y0: 250, x1: 1500, y1: 820, wallL: 700, wallR: 2300, eaveY: 110, wall: '#2c3e62', on: A.clamp(on), edge: -1, seed: 8, roof: '#5e2c3e' };
    A.camera(ctx, cam, () => {
      skyBg(ctx, t, { offsetY: 500, offsetX: 120 + lt * 8, warmGlow: 0.7 });
      E.mountains(ctx, t, { offsetY: 360 });
      const res = E.town(ctx, t, townO(330 - lt * 6, 960, 2.6));
      chimeFx(ctx, t, res, 2.0, [10, 11, 12]);
      townStreams(ctx, t, res, { x: 200, y: 1400 }, 1.4, { every: 3 });
      facade(ctx, t, op);
      // kid
      const pre = A.range(t, T_FLY - 0.25, T_FLY - 0.02);             // anticipation: jar pulled back/down
      const bob = 14 * sin(pre * Math.PI) * (t < T_FLY ? 1 : 0) - 10 * pop;
      const jar = A.lerp(1, 0.12, A.ease.outCubic(A.range(t, T_FLY, T_FLY + 0.5)));
      const K = A.drawKid(ctx, { x: 1235, y: op.y1 + bob, s: 2.05, t, jar, wave: 1 });
      const J = K.jar;
      E.glow(ctx, J.x, J.y, 200, '#b8f06a', 0.35 * jar + 0.1);
      // lid pops off at 38.8
      if (t > T_FLY) {
        const u = t - T_FLY; const lx = J.x + 160 * u, ly = J.y - 60 + (-700 * u + 1400 * u * u); const rr = u * 9;
        if (ly < H + 200) { ctx.save(); ctx.translate(lx, ly); ctx.rotate(rr); ctx.fillStyle = '#d24a40'; ctx.strokeStyle = P.ink; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(0, 0, 30, 9, 0, 0, TAU); ctx.fill(); ctx.stroke(); ctx.restore(); }
      }
      // fireflies burst
      fireflyBurst(ctx, t, { x: J.x, y: J.y - 40 }, { x: -300, y: 1150 });
      sill(ctx, t, op);
    });
    soft(ctx, 'fgK', (g) => {
      g.fillStyle = '#05061a'; g.beginPath(); g.moveTo(W + 40, 1100); g.lineTo(W + 40, 700 + lt * 20); g.quadraticCurveTo(1700, 760, 1640, 1100); g.closePath(); g.fill();
    });
  }
  function fireflyBurst(ctx, t, from, exit) {
    if (t < T_FLY - 0.05) return;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    if (t < T_FLY + 0.4) { const k = A.range(t, T_FLY, T_FLY + 0.4); E.sparkle(ctx, from.x, from.y, 220 * sin(k * Math.PI), '#e8ffc0', 1 - k, 0.2); dot(ctx, from.x, from.y, 300 * k + 60, '#b8f06a', 0.6 * (1 - k)); }
    const N = 40;
    for (let i = 0; i < N; i++) {
      const h = (k) => A.hash(i * 9.31 + k * 1.7);
      const u = t - T_FLY - h(1) * 0.12; if (u < 0) continue;
      const pos = (uu) => {
        const an = -Math.PI / 2 + (h(2) - 0.5) * 2.6; const d = (180 + 260 * h(3)) * (1 - Math.exp(-uu * 5));
        let x = from.x + cos(an) * d, y = from.y + sin(an) * d * 0.8 + A.noise(uu * 2 + i, 4) * 30;
        const k = A.ease.inOutCubic(A.clamp((uu - 0.35 - h(4) * 0.3) / (1.6 + h(5) * 0.5)));
        const cx = A.lerp(from.x, exit.x, 0.5) + (h(6) - 0.5) * 300, cy = from.y - 250 - h(7) * 200;
        const a = 1 - k; x = a * a * x + 2 * a * k * cx + k * k * (exit.x + (h(8) - 0.5) * 300); y = a * a * y + 2 * a * k * cy + k * k * (exit.y + (h(9) - 0.5) * 200);
        return { x: x + sin(uu * 7 + i) * 8, y: y + cos(uu * 6 + i) * 8 };
      };
      const p = pos(u), q = pos(Math.max(0, u - 0.06)); const b = 0.55 + 0.45 * sin(t * (9 + h(10) * 7) + i);
      const z = 0.8 + h(11) * 0.8;
      ctx.globalAlpha = 0.35 * b; ctx.strokeStyle = '#d8ff9a'; ctx.lineWidth = 5 * z; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(p.x, p.y); ctx.stroke();
      dot(ctx, p.x, p.y, 34 * z, '#b8f06a', 0.5 * b); dot(ctx, p.x, p.y, 8 * z, '#f4ffd0', b);
    }
    ctx.restore();
  }

  // ================================================================== B5 : extreme wide from the sea
  function wideAll(ctx, t) {
    const lt = t - 39.3; const zk = A.ease.inOutSine(A.range(t, 39.3, 40.35));
    const cam = { x: A.lerp(960, 1080, zk), y: A.lerp(560, 660, zk), zoom: A.lerp(1.0, 1.22, zk) };
    const X = 900, Y = 900, s = 1.35;
    A.camera(ctx, cam, () => {
      skyBg(ctx, t, { offsetY: 0, warmGlow: 1 });
      E.sea(ctx, t, {}); E.mountains(ctx, t, {});
      const res = E.town(ctx, t, townO(X, Y, s));
      chimeFx(ctx, t, res, 1.2, [13, 14, 15]);
      // Mio on the quay, tiny, looking up; Hoshi on her head glowing
      const mx = X + 170 * s, my = Y - 16 * s;
      const target = { x: mx + 2, y: my - 90 };
      townStreams(ctx, t, res, target, 0.8, { every: 1 });
      E.fireflies(ctx, t, { cx: res.windows[K_WIN].x, cy: res.windows[K_WIN].y - 40, rx: 120, ry: 60, count: 16, seed: 4, size: 0.7, attract: { x: target.x, y: target.y, k: A.range(t, 39.0, 40.6) } });
      const R = A.drawMio(ctx, { x: mx, y: my, s: 0.22, t, pose: 'stand', expr: 'smile', wind: 0.6, look: { x: 0, y: -1 } });
      const gl = 0.45 + 0.4 * A.range(t, 39.3, 40.3);
      E.glow(ctx, R.head.x, R.head.y - 6, 120 + 40 * gl, P.star, 0.5 * gl);
      A.drawHoshi(ctx, { x: R.head.x, y: R.head.y - 5, s: 0.07, t, glow: gl, expr: 'weak' });
      E.sparkles(ctx, t, { x: R.head.x, y: R.head.y - 10, r: 60, count: 8, seed: 21, size: 0.6 });
    });
  }

  // ================================================================== CUT C : the rivers of light
  const RIV = (() => { const a = []; const N = 34; for (let i = 0; i < N; i++) { const h = (k) => A.hash(i * 4.13 + k * 7.1 + 3); a.push({ t0: 40.45 + (i / N) * 3.05 + h(1) * 0.25, dur: 1.25 + h(2) * 0.7, th: i * 2.39996 + h(3) * 0.4, R0: 1250 + h(4) * 500, spin: (h(5) < 0.5 ? 1 : -1) * (1.6 + h(6) * 1.4), w: 0.7 + h(7) * 0.8, col: h(8) < 0.18 ? '#b8f06a' : h(8) < 0.55 ? P.warm : h(8) < 0.85 ? P.star : '#ffb27a', seed: i }); } return a; })();
  function rivers(ctx, t, C) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    let absorbed = 0;
    for (const r of RIV) {
      const u = (t - r.t0) / r.dur; if (u <= 0) continue;
      if (u >= 1) { const k = (u - 1) * r.dur; if (k < 0.35) absorbed += 1 - k / 0.35; continue; }
      const L = 0.42; const at = (v) => { v = A.clamp(v); const e = A.ease.inOutSine(v); const rr = r.R0 * Math.pow(1 - e, 1.15); const th = r.th + r.spin * e + 0.25 * sin(v * 9 + r.seed); return { x: C.x + cos(th) * rr, y: C.y + sin(th) * rr * 0.72 }; };
      const head = Math.min(1, u * (1 + 0.05)); const tail = Math.max(0, head - L);
      const NS = 16; let prev = at(tail);
      const hot = A.mix(r.col, '#ffffff', 0.6);
      for (let j = 1; j <= NS; j++) {
        const v = tail + (head - tail) * (j / NS); const q = at(v); const k = j / NS;
        ctx.globalAlpha = 0.16 * k; ctx.strokeStyle = r.col; ctx.lineWidth = (6 + 30 * k) * r.w; ctx.beginPath(); ctx.moveTo(prev.x, prev.y); ctx.lineTo(q.x, q.y); ctx.stroke();
        ctx.globalAlpha = 0.75 * k * k; ctx.strokeStyle = hot; ctx.lineWidth = (1.5 + 5 * k) * r.w; ctx.beginPath(); ctx.moveTo(prev.x, prev.y); ctx.lineTo(q.x, q.y); ctx.stroke();
        prev = q;
      }
      // particles shed along the river
      for (let j = 0; j < 10; j++) { const hv = A.hash(j * 3.3 + r.seed * 11); const v = head - L * hv; if (v < 0) continue; const q = at(v); const off = (A.hash(j * 7.1 + r.seed) - 0.5) * 40 * hv * r.w; const tw = 0.5 + 0.5 * sin(t * 12 + j * 2 + r.seed);
        dot(ctx, q.x + off, q.y + off * 0.6 + hv * 16, (6 + 8 * tw) * r.w, r.col, (1 - hv) * 0.8); }
      const q = at(head); dot(ctx, q.x, q.y, 50 * r.w, r.col, 0.55); dot(ctx, q.x, q.y, 14 * r.w, '#fffdf0', 0.95);
    }
    ctx.restore();
    return absorbed;
  }
  function cutC(ctx, t) {
    const lt = t - 40.3; const k = A.ease.inOutSine(A.range(t, 40.3, 44.6));
    // Mio (chest-up) and Hoshi lifting off her head
    const s = 2.75, mx = 820, fy = 1560;
    const lift = A.ease.inOutCubic(A.range(t, 40.55, 41.9));
    const antic = Math.exp(-Math.pow((t - 40.48) / 0.06, 2));           // squash before lift-off
    const pre = A.range(t, 44.15, T_BURST);                               // contraction before the burst
    const glow = A.clamp(A.lerp(0.3, 2, Math.pow(A.range(t, 40.5, 44.45), 1.25)), 0, 2);
    const hexpr = t < 40.9 ? 'weak' : t < 42.2 ? 'surprised' : 'joy';
    const orbit = lt * 0.12;
    const cam = { x: A.lerp(900, 1010, k) + sin(orbit * 3) * 12, y: A.lerp(560, 430, k), zoom: A.lerp(1.0, 1.2, k) + 0.04 * pre, rot: A.lerp(-0.035, 0.025, k) };
    const bs = A.shake(t * 2, 4 * A.range(t, 43.2, 44.6), 31);
    cam.x += bs.dx; cam.y += bs.dy;
    // bloom warmth
    A.camera(ctx, cam, () => {
      // sky, looking up: stars stronger, parallax opposite to the camera orbit
      skyBg(ctx, t, { offsetY: 420, offsetX: -lt * 40, warmGlow: 1, starBright: 1 });
      // defocused town far behind (render small, upscale = lens blur)
      soft(ctx, 'townC', (g) => { g.save(); E.town(g, t, townO(900 - lt * 30, 1500, 1.9)); g.restore(); }, 5);
      // warm bokeh from the lit windows
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 26; i++) { const h = (q) => A.hash(i * 5.7 + q); const x = -200 + h(1) * 2400 - lt * (30 + 20 * h(2)), y = 820 + h(3) * 380; const r = 30 + h(4) * 50; ctx.globalAlpha = 0.1 + 0.08 * h(5); ctx.fillStyle = h(6) < 0.7 ? P.warm : '#ffe9b0'; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); }
      ctx.restore();
      // global warm wash grows with the energy
      E.glow(ctx, 1000, 400, 1400, P.warm2, 0.12 + 0.25 * k);
    });
    let hx, hy, R;
    A.camera(ctx, cam, () => {
      // Hoshi path: head → above-front of Mio's face
      const head0 = { x: mx + 18, y: fy - 387 * s };
      const tgt = { x: mx + 250, y: fy - 387 * s - 150 };
      hx = A.lerp(head0.x + 6, tgt.x, lift) + sin(t * 1.7) * 8 * lift; hy = A.lerp(head0.y - 30, tgt.y, lift) - 40 * sin(lift * Math.PI) + cos(t * 2.1) * 10 * lift;
      const light = { x: hx, y: hy, color: '#ffe3a0', strength: 0.35 + 1.1 * k };
      const mexpr = t < 40.55 ? 'determined' : t < 41.1 ? 'surprised' : 'smile';
      const lookX = A.lerp(0.2, 0.75, lift), lookY = A.lerp(-0.6, -0.9, lift);
      // Mio
      R = A.drawMio(ctx, { x: mx, y: fy, s, t, pose: 'stand', expr: mexpr, face: 1, wind: 0.35 + 0.8 * k, windDir: 1, light, look: { x: lookX, y: lookY }, headTilt: -0.06 - 0.06 * lift });
      // warm light washing over her
      E.glow(ctx, hx, hy, 700, P.warm, 0.12 + 0.3 * k);
      // rivers
      const absorbed = rivers(ctx, t, { x: hx, y: hy });
      // Hoshi
      const pulse = Math.min(1.2, absorbed);
      const sq = 0.6 * antic - 0.35 * A.ease.outElastic(A.range(t, 40.5, 41.0)) * (1 - A.range(t, 40.9, 41.3)) + 0.25 * pulse * sin(t * 30) - 0.5 * pre;
      const hs = 0.7 + 0.12 * lift + 0.04 * pulse - 0.12 * A.ease.inCubic(pre);
      E.glow(ctx, hx, hy, (160 + 260 * glow / 2) * (1 + 0.15 * pulse), P.star, 0.3 + 0.3 * glow / 2);
      A.drawHoshi(ctx, { x: hx, y: hy, s: hs, t, glow, expr: hexpr, squash: sq, rot: sin(t * 1.3) * 0.08 + (1 - lift) * 0.2, look: { x: -0.5, y: 0.3 } });
      if (pulse > 0.05) E.sparkle(ctx, hx, hy, 120 * pulse, '#fff8e0', 0.6 * pulse, t);
      E.sparkles(ctx, t, { x: hx, y: hy, r: 140 + 60 * glow, count: 10 + Math.round(6 * glow), seed: 33, size: 0.8 + 0.3 * glow, alpha: 0.4 + 0.3 * glow });
      // pre-burst: light sucked inward
      if (pre > 0) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; for (let i = 0; i < 24; i++) { const a = i * 0.2618 + t; const d = 420 * (1 - ((t * 2.2 + A.hash(i)) % 1)); dot(ctx, hx + cos(a) * d, hy + sin(a) * d, 12, '#fff4d0', pre * 0.9); } ctx.restore(); }
      // burst
      const bp = (t - T_BURST) / 0.9; if (bp > 0) E.burst(ctx, t, { x: hx, y: hy, p: Math.min(0.999, bp), r: 1500, seed: 4, rays: 26, particles: 60 });
    });
    // defocused foreground particles drifting fast (depth)
    soft(ctx, 'fgC', (g) => {
      g.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 12; i++) { const h = (q) => A.hash(i * 3.9 + q + 50); const x = ((h(1) * 2400 + lt * (120 + 80 * h(2))) % 2400) - 240, y = h(3) * 1080 - lt * 40 * h(4); g.fillStyle = A.rgba(h(5) < 0.3 ? '#b8f06a' : P.warm, 0.22); g.beginPath(); g.arc(x, y, 30 + 40 * h(6), 0, TAU); g.fill(); }
    });
    // white-gold flash: peak 44.6–44.9, then holds near-white into s5
    const wa = t < T_BURST ? 0.9 * Math.pow(A.range(t, T_BURST - 0.12, T_BURST), 2) : t < 44.9 ? 0.96 : A.lerp(0.96, 0.82, A.range(t, 44.9, 45.4));
    if (wa > 0) {
      ctx.save(); const g = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W * 0.75); g.addColorStop(0, A.rgba('#fffdf2', wa)); g.addColorStop(1, A.rgba('#ffe7b0', wa * 0.92));
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
    }
  }

  // ================================================================== dispatcher
  A.scene('s4_lights', {
    transitionIn: { type: 'fade', dur: 0.5 },
    draw(ctx, lt, t, info) {
      ctx.save();
      if (t < 34.7) cutA(ctx, t);
      else if (t < 35.3) townView(ctx, t, { cam: { x: 960, y: A.tween(t, 34.7, 35.3, 580, 540), zoom: A.tween(t, 34.7, 35.3, 1.0, 1.035) }, skyY: -150, X: 900, Y: 1120, s: 2.1, target: { x: 980, y: 1500 }, ws: 1.6 });
      else if (t < 37.1) cutGrandpa(ctx, t);
      else if (t < 38.0) townView(ctx, t, { cam: { x: A.tween(t, 37.1, 38.0, 1010, 930, A.ease.inOutSine), y: 540, zoom: 1.0 }, skyY: -60, skyX: -(t - 37.1) * 20, X: 960, Y: 1060, s: 1.8, target: { x: 960, y: 1450 }, ws: 1.5 });
      else if (t < 39.3) cutKid(ctx, t);
      else if (t < 40.3) wideAll(ctx, t);
      else cutC(ctx, t);
      ctx.restore();
    },
  });
})();
