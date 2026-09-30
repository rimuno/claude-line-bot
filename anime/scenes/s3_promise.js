// ===== s3_promise (21–31 s) : 両手の中のホシ → 空の欠け → ミオの決意 → 丘を駆け下りる =====
// Shot list (global t):
//  A1 21.00–24.35  CU: Hoshi in Mio's cupped hands, Mio's worried face above. Slow push-in. 23.5 power-down (near-out).
//  A2 24.35–25.65  INSERT (Hoshi POV): tilt up to the crown constellation, the empty seat pulsing.
//  A3 25.65–26.50  tighter CU on Mio: worried → resolve (brows set), eyes lift.
//  B  26.50–29.60  low-angle hero shot on the crest: rise (smear/stretch) → pull back reveals the town in the valley →
//                  wind gust (26.8–29.6) while she declares; 28.95 Hoshi hops onto her head.
//  C  29.60–31.40  wide: Mio runs down the hill toward the town, camera pans; footfalls on 29.8 + 0.2k.
(function () {
  const A = window.A, W = A.W, H = A.H, E = A.env, P = A.PAL, TAU = Math.PI * 2, PI = Math.PI;
  const ez = A.ease;
  const sin = Math.sin, cos = Math.cos;

  // ------------------------------------------------------------------ helpers
  const mk = (w, h) => { const c = document.createElement('canvas'); c.width = Math.ceil(w); c.height = Math.ceil(h); return c; };
  const memo = {};
  // parallax camera: layer at depth d (0=infinitely far, 1=subject plane, >1 foreground)
  function pcam(ctx, c, d, fn) {
    const z = 1 + (c.zoom - 1) * d;
    A.camera(ctx, { x: W / 2 + (c.x - W / 2) * d, y: H / 2 + (c.y - H / 2) * d, zoom: z, rot: (c.rot || 0) * d }, fn);
  }
  const glowAt = (ctx, x, y, r, col, a) => E.glow(ctx, x, y, r, col, a);

  // Hoshi's light level over the whole scene (sound cue: deepest dip exactly at 23.5)
  function hoshiGlow(t) {
    let g = 0.33 + 0.045 * sin(t * 2.3) + 0.04 * A.noise(t * 2.7, 11);
    const down = A.tween(t, 23.05, 23.5, 0, 1, ez.inCubic);
    const up = A.tween(t, 23.72, 24.25, 0, 1, ez.outCubic);
    let dip = down * (1 - up);
    const f = Math.floor(t * 30);
    if (t > 23.05 && t < 23.45 && A.hash(f * 3.7) < 0.4) dip = Math.min(1, dip + 0.45); // stutter going down
    if (t > 23.72 && t < 24.25 && A.hash(f * 5.1) < 0.35) dip = Math.max(dip, 0.75); // sputtering back
    const weaker = 1 - 0.22 * A.range(t, 23.7, 24.3) * (1 - A.range(t, 26.3, 27.6)); // after the scare it stays weaker
    g = A.lerp(g * weaker, 0.04, dip);
    g += 0.13 * A.smooth(A.range(t, 28.35, 28.9)); // a spark of hope when she promises
    return { g, dip };
  }

  // Blurred background plate (depth-of-field) — cached, drawn once, animated bokeh added live
  function dofPlate() {
    return memo.plate || (memo.plate = (() => {
      const S = 0.25, c = mk(W * S, H * S), g = c.getContext('2d'); g.scale(S, S);
      const o = { horizonY: 520, offsetY: 0 };
      E.sky(g, 22, o); E.clouds(g, 22, o); E.sea(g, 22, o); E.mountains(g, 22, o);
      E.town(g, 22, { x: 560, y: 690, s: 1.05, lit: 0.12 });
      // near dark hillside behind her
      const gr = g.createLinearGradient(0, 600, 0, 1080); gr.addColorStop(0, 'rgba(8,20,40,0)'); gr.addColorStop(0.25, 'rgba(10,26,46,0.92)'); gr.addColorStop(1, '#06101f');
      g.fillStyle = gr; g.fillRect(0, 560, W, 520);
      g.beginPath(); g.moveTo(0, 760); g.bezierCurveTo(500, 700, 1100, 640, 1920, 690); g.lineTo(1920, 1080); g.lineTo(0, 1080); g.fillStyle = '#0c2238'; g.fill();
      const out = mk(W * S, H * S), og = out.getContext('2d'); og.filter = 'blur(5px)'; og.drawImage(c, 0, 0); og.filter = 'none';
      og.fillStyle = 'rgba(10,12,40,0.22)'; og.fillRect(0, 0, out.width, out.height);
      return out;
    })());
  }
  function bokeh(ctx, t, n, seed, drift, warmK) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < n; i++) {
      const h = (k) => A.hash(i * 9.13 + seed * 31.7 + k * 2.71);
      const x = (h(1) * (W + 300) - 150 + drift.x * (0.5 + h(6)) + A.noise(t * 0.15 + i, seed) * 40 + W * 3) % (W + 300) - 150;
      const y = h(2) * H * 0.75 + drift.y * (0.5 + h(6)) + A.noise(t * 0.12 + i * 2, seed + 4) * 30;
      const r = 14 + h(3) * 46; const tw = 0.6 + 0.4 * sin(t * (0.8 + h(4) * 1.5) + h(5) * TAU);
      const warm = h(7) < warmK; const col = warm ? (h(8) < 0.5 ? '#ffb45a' : '#ffd88a') : (h(8) < 0.5 ? '#9fb4ff' : '#c9b8ff');
      ctx.globalAlpha = 0.07 * tw * (warm ? 1.3 : 1);
      ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
      ctx.globalAlpha = 0.05 * tw; ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.stroke();
    }
    ctx.restore();
  }
  // tiny sparks shed from Hoshi (losing light), in world coords
  function shedSparks(ctx, t, x, y, s, amt) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 14; i++) {
      const per = 1.3 + A.hash(i * 3.3) * 1.2; const ph = ((t / per + A.hash(i * 7.1)) % 1 + 1) % 1; const cyc = Math.floor(t / per + A.hash(i * 7.1));
      const hh = (k) => A.hash(i * 5.7 + cyc * 13.1 + k);
      const px = x + (hh(1) - 0.5) * 30 * s + sin(ph * 5 + i) * 6 * s, py = y + (-10 + ph * 70) * s;
      const a = amt * sin(PI * ph) * (0.5 + 0.5 * hh(2));
      if (a < 0.02) continue;
      ctx.globalAlpha = a; ctx.fillStyle = '#ffe9a8'; ctx.beginPath(); ctx.arc(px, py, (1.2 + hh(3) * 1.6) * s, 0, TAU); ctx.fill();
      ctx.globalAlpha = a * 0.35; ctx.beginPath(); ctx.arc(px, py, (4 + hh(3) * 3) * s, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }

  // ------------------------------------------------------------------ CUT A1 / A3 : close-ups in her hands
  const MX = 860, MY = 900, MS = 1; // Mio's feet (crouch_cup) in close-up world
  function cutClose(ctx, t, shot) {
    const { g, dip } = hoshiGlow(t);
    // camera
    let cam;
    if (shot === 'A1') {
      const k = A.tween(t, 20.6, 24.35, 0, 1, ez.inOutSine);
      const jolt = A.tween(t, 23.4, 23.7, 0, 1, ez.outCubic) * (1 - A.range(t, 23.9, 24.35));
      cam = { x: A.lerp(905, 912, k), y: A.lerp(778, 776, k) - 4 * jolt, zoom: A.lerp(4.7, 5.3, k) + 0.2 * jolt };
    } else {
      const k = A.tween(t, 25.65, 26.6, 0, 1, ez.outSine);
      cam = { x: A.lerp(912, 916, k), y: A.lerp(764, 758, k), zoom: A.lerp(5.4, 5.8, k) };
    }
    const sh = A.shake(t, 1.6, 3); cam.x += sh.dx / cam.zoom * 2; cam.y += sh.dy / cam.zoom * 2;
    // background plate (very far, slight parallax), bokeh
    const par = { x: -(cam.x - 890) * 3, y: -(cam.y - 780) * 2 };
    ctx.drawImage(dofPlate(), -40 + par.x * 0.2, -30 + par.y * 0.2, W + 80, H + 60);
    bokeh(ctx, t, 26, shot === 'A1' ? 3 : 8, { x: par.x * 0.5 + t * 6, y: par.y * 0.5 }, 0.5);
    // fireflies drifting out of focus in the far plane
    E.fireflies(ctx, t, { cx: 1300, cy: 420, rx: 600, ry: 260, count: 7, seed: 12, size: 2.2, alpha: 0.55 });

    const hp0 = { x: MX + 52 * MS, y: MY - 88 * MS }; // approximate Hoshi center (for lights)
    let hpos = hp0;
    A.camera(ctx, cam, () => {
      // grass behind her, lit by Hoshi
      E.grass(ctx, t, { x0: MX - 260, x1: MX + 280, y: MY + 8, h: 70, density: 0.8, wind: 0.35, seed: 31, color: '#1d4a5c',
        lightFrom: { x: hp0.x, y: hp0.y, r: 150, color: P.star, strength: A.clamp(g * 2.2) } });
      // Mio
      let expr = 'worried';
      if (t > 23.55 && t < 24.1) expr = 'surprised';
      if (shot === 'A3' && t > 26.12) expr = 'determined';
      let look = { x: 0.35, y: 0.75 };
      if (t > 23.55 && t < 24.35) look = { x: 0.45, y: 0.95 };
      if (shot === 'A3') { const k = A.tween(t, 26.05, 26.35, 0, 1, ez.inOutCubic); look = { x: A.lerp(0.3, 0.7, k), y: A.lerp(0.8, -0.1, k) }; }
      const lean = shot === 'A1' ? A.tween(t, 23.5, 23.7, 0, 0.05, ez.outCubic) * (1 - A.range(t, 24.0, 24.35)) : 0;
      const tilt = shot === 'A3' ? -A.tween(t, 26.05, 26.4, 0, 0.08, ez.outBack) : 0.03 + lean;
      A.drawMio(ctx, { x: MX, y: MY, s: MS, t, pose: 'crouch_cup', expr, face: 1, wind: 0.22, look, headTilt: tilt,
        light: { x: hp0.x, y: hp0.y, color: P.star, strength: 0.15 + 1.9 * g, radius: 170 }, moonRim: 0.8,
        mouth: { v: 'closed', open: 0 },
        holding: (c, pt) => {
          hpos = { x: pt.x, y: pt.y - 12 * MS };
          drawHoshiHeld(c, t, hpos, g, dip, shot);
        } });
      // light spill around the hands
      glowAt(ctx, hpos.x, hpos.y, 90 * (0.4 + g), P.star, 0.35 * A.clamp(g * 2));
      shedSparks(ctx, t, hpos.x, hpos.y, MS, 0.55 + 0.6 * dip);
      // foreground grass (out of focus, dark)
      E.grass(ctx, t, { x0: MX - 300, x1: MX + 320, y: MY + 60, h: 95, density: 0.35, wind: 0.4, seed: 32, color: '#081626' });
    });
    // whole-frame darkening when the light nearly dies, and a faint warm key when it lives
    const hs = { x: (hpos.x - cam.x) * cam.zoom + W / 2, y: (hpos.y - cam.y) * cam.zoom + H / 2 };
    if (dip > 0.01) { ctx.fillStyle = `rgba(3,4,16,${0.5 * dip})`; ctx.fillRect(0, 0, W, H); }
    glowAt(ctx, hs.x, hs.y, 520, '#ffcf7a', 0.12 * A.clamp(g * 2.5));
    // hard-ish vignette to focus the eye
    const vg = ctx.createRadialGradient(hs.x, hs.y - 120, 200, hs.x, hs.y - 120, 1250);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, `rgba(4,3,18,${0.45 + 0.2 * dip})`);
    ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
  }
  function drawHoshiHeld(c, t, p, g, dip, shot) {
    // look: at Mio while talking → down (dejected) → up at the sky before the insert
    let look = { x: -0.6, y: -0.55 }, rot = -0.08, squash = 0.04 * sin(t * 2.2);
    const kDown = A.tween(t, 22.85, 23.25, 0, 1, ez.inOutCubic), kUp = A.tween(t, 23.95, 24.3, 0, 1, ez.inOutCubic);
    look = { x: A.lerp(look.x, 0.1, kDown), y: A.lerp(look.y, 0.9, kDown) };
    look = { x: A.lerp(look.x, 0.4, kUp), y: A.lerp(look.y, -1, kUp) };
    rot += 0.1 * kDown - 0.22 * kUp;
    squash += 0.12 * kDown * (1 - kUp) - 0.12 * kUp;
    if (shot === 'A3') { look = { x: -0.5, y: -0.7 }; rot = -0.1; squash = 0.1; }
    // shiver when the light fails
    const shv = dip * 1.2 * A.noise(t * 40, 2);
    A.drawHoshi(c, { x: p.x + shv, y: p.y + 1.5 * sin(t * 2.2), s: 0.25 * MS, t, glow: g, expr: 'weak', look, rot, squash });
  }

  // ------------------------------------------------------------------ CUT A2 : the sky insert
  function cutSky(ctx, t) {
    const k = A.tween(t, 24.2, 25.8, 0, 1, ez.outSine);
    const oy = A.lerp(170, 360, k);
    const o = { offsetY: oy, gapPulse: 0.5 + 0.5 * sin((t - 24.35) * TAU * 0.9 - PI / 2), starBright: 1 };
    const gp0 = E.GAP(o);
    const zoom = A.lerp(1.0, 1.12, A.tween(t, 24.35, 25.65, 0, 1, ez.inOutSine));
    A.camera(ctx, { x: A.lerp(W / 2, gp0.x, 0.5), y: A.lerp(H / 2, gp0.y, 0.3), zoom }, () => {
      E.sky(ctx, t, o); E.clouds(ctx, t, o);
      // the empty seat: a faint ghost star + halo breathing
      const gp = E.GAP(o); const pu = o.gapPulse;
      glowAt(ctx, gp.x, gp.y, 70 + 40 * pu, '#bcd2ff', 0.18 + 0.25 * pu);
      ctx.save(); ctx.translate(gp.x, gp.y); ctx.rotate(0.05 * sin(t)); ctx.globalAlpha = 0.25 + 0.45 * pu;
      ctx.setLineDash([5, 7]); ctx.lineDashOffset = -t * 12; ctx.strokeStyle = '#dce8ff'; ctx.lineWidth = 1.6; ctx.lineJoin = 'round';
      ctx.beginPath(); for (let i = 0; i < 10; i++) { const a = -PI / 2 + i * PI / 5; const r = i % 2 ? 9 : 20; ctx[i ? 'lineTo' : 'moveTo'](cos(a) * r, sin(a) * r); } ctx.closePath(); ctx.stroke();
      ctx.setLineDash([]); ctx.restore();
    });
    // Hoshi POV foreground: blurred grass tips and a hint of its own weak light from below
    const { g } = hoshiGlow(t);
    const gr = ctx.createLinearGradient(0, H - 260, 0, H); gr.addColorStop(0, 'rgba(255,214,130,0)'); gr.addColorStop(1, `rgba(255,214,130,${0.18 * A.clamp(g * 2)})`);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = gr; ctx.fillRect(0, H - 260, W, 260); ctx.restore();
    ctx.save(); ctx.filter = 'blur(6px)';
    E.grass(ctx, t, { x0: -80, x1: W + 80, y: H + 120, h: 330, density: 0.18, wind: 0.5, seed: 41, color: '#0a1a2c' });
    ctx.restore();
  }

  // ------------------------------------------------------------------ wind helpers (cut B/C)
  const gustK = (t) => A.smooth(A.range(t, 26.8, 27.35)) * (1 - A.smooth(A.range(t, 29.25, 29.9)));
  function windStreaks(ctx, t, amt, seed) {
    if (amt < 0.02) return;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    for (let i = 0; i < 9; i++) {
      const h = (k) => A.hash(i * 4.7 + seed * 17 + k);
      const per = 0.9 + h(1) * 0.7; const cyc = t / per + h(2); const ph = cyc - Math.floor(cyc); const ci = Math.floor(cyc);
      const hh = (k) => A.hash(i * 2.3 + ci * 7.9 + seed + k);
      const y0 = 120 + hh(1) * 700, L = 260 + hh(2) * 360; const x = -400 + ph * (W + 800);
      const a = amt * sin(PI * ph) * (0.25 + 0.35 * hh(3));
      const gr = ctx.createLinearGradient(x - L, 0, x, 0); gr.addColorStop(0, 'rgba(210,225,255,0)'); gr.addColorStop(1, `rgba(210,225,255,${a})`);
      ctx.strokeStyle = gr; ctx.lineWidth = 1.2 + hh(4) * 1.4; ctx.beginPath();
      ctx.moveTo(x - L, y0 + 18 * sin(hh(5) * 6)); ctx.bezierCurveTo(x - L * 0.6, y0 - 20, x - L * 0.3, y0 + 22, x, y0 + 4 * sin(t * 3 + i)); ctx.stroke();
    }
    ctx.restore();
  }
  function petals(ctx, t, amt, seed, box) {
    if (amt < 0.02) return;
    ctx.save();
    for (let i = 0; i < 34; i++) {
      const h = (k) => A.hash(i * 6.1 + seed * 13 + k);
      const per = 1.1 + h(1) * 1.2; const cyc = t / per + h(2); const ph = cyc - Math.floor(cyc); const ci = Math.floor(cyc);
      const hh = (k) => A.hash(i * 3.9 + ci * 5.3 + seed + k);
      const x = box.x0 + ph * (box.x1 - box.x0) * (0.8 + hh(1) * 0.4);
      const y = box.y0 + hh(2) * (box.y1 - box.y0) - ph * 120 * hh(3) + 26 * sin(t * 4 + i);
      const a = amt * sin(PI * ph); if (a < 0.03) continue;
      const white = hh(4) < 0.55; ctx.globalAlpha = a * 0.9;
      ctx.save(); ctx.translate(x, y); ctx.rotate(t * (4 + hh(5) * 6) + i); ctx.scale(1, 0.35 + 0.65 * Math.abs(sin(t * 7 + i)));
      ctx.fillStyle = white ? '#e8ecff' : '#3d7c80'; ctx.beginPath();
      if (white) ctx.arc(0, 0, 3.2 + hh(6) * 2, 0, TAU); else ctx.ellipse(0, 0, 9 + hh(6) * 6, 1.8, 0, 0, TAU);
      ctx.fill(); ctx.restore();
    }
    ctx.restore();
  }
  // hold point of the 'cup' pose (from characters.js mioPose/drawCup), outer coords, Hoshi centre
  const cupHoshi = (x, y, s, face) => ({ x: x + face * s * 26.2, y: y - s * (222.5 + 12) });

  // ------------------------------------------------------------------ CUT B : the promise (hero shot)
  const BH = { x: 1700, y: 1250, s: 1.2 };
  const BM = { x: 1420, s: 1.9 };
  function cutHero(ctx, t) {
    const gk = gustK(t); const wind = 0.35 + 1.0 * gk * (0.75 + 0.25 * A.noise(t * 1.7, 9));
    const { g } = hoshiGlow(t);
    // camera: rise-follow → pull back (town reveal in the pause) → slow heroic push
    const k1 = A.tween(t, 26.66, 27.1, 0, 1, ez.outCubic);
    const k2 = A.tween(t, 27.15, 27.95, 0, 1, ez.inOutCubic);
    const k3 = A.tween(t, 27.95, 29.7, 0, 1, ez.inOutSine);
    const cam = {
      x: A.lerp(1380, 1060, k2) + 60 * k3,
      y: A.lerp(A.lerp(720, 520, k1), 540, k2) - 25 * k3,
      zoom: A.lerp(1.3, 1.0, k2) * (1 + 0.08 * k3),
      rot: 0.012 * sin(t * 0.9) - 0.01 * k2,
    };
    const sh = A.shake(t, 2.5 * gk + 0.8, 5); cam.x += sh.dx; cam.y += sh.dy;
    const so = { horizonY: 650, gapPulse: 0.25 + 0.25 * sin(t * 3) };
    pcam(ctx, cam, 0.1, () => { E.sky(ctx, t, so); E.clouds(ctx, t * 1.6, so); });
    pcam(ctx, cam, 0.22, () => { E.sea(ctx, t, so); E.mountains(ctx, t, so); });
    pcam(ctx, cam, 0.32, () => {
      E.town(ctx, t, { x: 560, y: 760, s: 0.6, lit: 0.12 });
      // cool mist band where the valley falls away
      const mg = ctx.createLinearGradient(0, 700, 0, 900); mg.addColorStop(0, 'rgba(120,150,210,0)'); mg.addColorStop(0.5, 'rgba(120,150,210,0.12)'); mg.addColorStop(1, 'rgba(120,150,210,0)');
      ctx.fillStyle = mg; ctx.fillRect(-400, 700, W + 800, 200);
    });
    let head = null, hpos = null;
    pcam(ctx, cam, 1, () => {
      const hl = E.hill(ctx, t, { x: BH.x, y: BH.y, s: BH.s, wind, seed: 3 });
      const fy = hl.surfaceY(BM.x) + 4;
      E.fireflies(ctx, t, { cx: 1250, cy: fy - 60, rx: 520, ry: 90, count: 10, seed: 21, size: 1.2 });
      // --- Mio
      const rise = t >= 26.72; const s = BM.s;
      let expr = t < 26.62 ? 'worried' : 'determined';
      if (t > 29.42) expr = 'smile';
      let look = { x: 0.2, y: 0.6 };
      if (t > 26.8) look = { x: 0.75, y: 0.25 };        // toward the town
      if (t > 27.3 && t < 27.85) look = { x: 0.85, y: 0.45 }; // takes in the whole town during the pause
      if (t > 29.3) look = { x: 0.15, y: -0.9 };        // eyes up to Hoshi on her head
      let pose = rise ? 'cup' : 'crouch_cup';
      const hopT0 = 28.95, hopT1 = 29.25;
      if (t >= hopT0) pose = 'stand';
      // anticipation dip / rise stretch
      const dip = A.tween(t, 26.5, 26.7, 0, 1, ez.inOutSine) * (rise ? 0 : 1);
      const st = rise ? (1 - A.range(t, 26.72, 27.05)) : 0; const stretch = st > 0 ? sin(PI * (1 - st) * 1.4) * st * 0.9 + st * 0.5 : 0;
      const sy = 1 - 0.05 * dip + 0.07 * stretch, sx = 1 + 0.035 * dip - 0.04 * stretch;
      // body bob of the decision beat ("あげる！")
      const nod = -6 * A.tween(t, 28.8, 28.95, 0, 1, ez.outCubic) * (1 - A.range(t, 29.0, 29.3));
      ctx.save(); ctx.translate(BM.x, fy); ctx.scale(sx, sy); ctx.translate(-BM.x, -fy);
      const cupH = cupHoshi(BM.x, fy, s, -1);
      const light = { x: cupH.x, y: cupH.y, color: P.star, strength: pose === 'stand' ? 0.2 : 0.2 + 1.3 * g, radius: 220 };
      const mioT = t;
      const a = A.drawMio(ctx, { x: BM.x, y: fy + nod, s, t: mioT, pose, expr, face: -1, wind: 0.3 + 1.2 * gk, look, light, moonRim: 1.2,
        headTilt: (t > 27.8 && t < 29.4 ? -0.05 : 0) + (t > 29.3 ? -0.1 * A.range(t, 29.3, 29.5) : 0),
        holding: (c, pt) => { hpos = { x: pt.x, y: pt.y - 12 * s }; drawHoshiB(c, t, hpos, g, s, null); } });
      ctx.restore();
      // map anchors through the stretch transform
      const mp = (p) => ({ x: BM.x + (p.x - BM.x) * sx, y: fy + (p.y - fy) * sy });
      head = mp(a.head);
      if (hpos) hpos = mp(hpos);
      if (t >= hopT0) {
        const u = A.range(t, hopT0, hopT1);
        const p0 = cupH, p1 = { x: head.x + 4, y: head.y - 70 * s * 0.25 * 0.72 };
        const e = ez.inOutSine(u);
        let p = { x: A.lerp(p0.x, p1.x, e), y: A.lerp(p0.y, p1.y, e) - 150 * 4 * u * (1 - u) };
        if (u >= 1) { p = p1; p.y += 1.5 * sin(t * 5); }
        hpos = p; drawHoshiB(ctx, t, p, g, s, u);
      }
      if (hpos) { glowAt(ctx, hpos.x, hpos.y, 120 * (0.4 + g), P.star, 0.3 * A.clamp(g * 2)); shedSparks(ctx, t, hpos.x, hpos.y, s * 0.8, 0.35); }
      // hop sparkle trail
      if (t > hopT0 && t < hopT1 + 0.35) E.sparkles(ctx, t, { x: hpos.x, y: hpos.y + 20, r: 50, count: 6, seed: 7, alpha: 0.8 * (1 - A.range(t, hopT1, hopT1 + 0.35)), size: 0.8 });
      petals(ctx, t, gk, 2, { x0: 700, x1: 2100, y0: 250, y1: 900 });
    });
    // foreground: dark defocused grass & susuki sweeping in the gust (DOF)
    pcam(ctx, cam, 1.35, () => {
      ctx.save(); ctx.filter = 'blur(4px)';
      E.grass(ctx, t, { x0: 1000, x1: 2300, y: 1200, h: 300, density: 0.22, wind: wind * 1.1, seed: 51, color: '#07121f' });
      ctx.restore();
    });
    windStreaks(ctx, t, gk, 1);
    // cool moonlight grade + top darkening (sky weight)
    const tg = ctx.createLinearGradient(0, 0, 0, H); tg.addColorStop(0, 'rgba(5,6,24,0.25)'); tg.addColorStop(0.4, 'rgba(5,6,24,0)'); tg.addColorStop(1, 'rgba(5,6,24,0.3)');
    ctx.fillStyle = tg; ctx.fillRect(0, 0, W, H);
  }
  function drawHoshiB(c, t, p, g, s, hopU) {
    let expr = 'weak', look = { x: 0.6, y: -0.4 }, rot = 0.05, squash = 0.04 * sin(t * 2.2);
    if (t > 28.3) { expr = 'surprised'; look = { x: 0.3, y: -1 }; }
    if (t > 28.62) { expr = 'smile'; }
    if (hopU === null) {
      // anticipation squash before the hop
      squash += 0.55 * A.tween(t, 28.72, 28.93, 0, 1, ez.inOutSine);
      rot = 0.05 + 0.1 * A.range(t, 28.72, 28.93);
    } else {
      if (hopU < 1) { squash = -0.45 * sin(PI * Math.min(1, hopU * 1.6)) ; rot = -1.2 * ez.inOutCubic(hopU) * (1 - hopU) + 0.3 * hopU; expr = 'smile'; }
      else {
        const lt = t - 29.25; squash = 0.6 * Math.exp(-lt * 7) * cos(lt * 22); rot = 0.08 * sin(t * 2);
        expr = t > 29.4 ? 'smile' : 'surprised'; look = { x: -0.2, y: 0.4 };
      }
    }
    A.drawHoshi(c, { x: p.x, y: p.y, s: 0.25 * s, t, glow: g, expr, look, rot, squash });
  }

  // ------------------------------------------------------------------ CUT C : run down the hill
  const CH = { x: 1500, y: 1150, s: 1.25 };
  function mioRunX(t) {
    // ease-in start at 29.6, full speed by 29.85 (first footfall 29.8)
    const v = 430; const t0 = 29.62;
    const d = t < t0 ? 0 : (t < 29.9 ? v * Math.pow(t - t0, 2) / (2 * 0.28) : v * 0.14 + v * (t - 29.9));
    return 1330 - d;
  }
  function cutRun(ctx, t) {
    const x = mioRunX(t);
    const cam = { x: A.lerp(1180, x - 60, 0.75) , y: 520 + A.tween(t, 29.6, 31.4, 0, 30, ez.inOutSine), zoom: 1.12 - 0.06 * A.range(t, 29.6, 31.4), rot: 0 };
    const sh = A.shake(t, 1.5, 7); cam.x += sh.dx; cam.y += sh.dy;
    const wind = 0.6 + 0.4 * gustK(t);
    const so = { horizonY: 600, gapPulse: 0.3 + 0.3 * sin(t * 3) };
    pcam(ctx, cam, 0.1, () => { E.sky(ctx, t, so); E.clouds(ctx, t * 1.6, so); });
    pcam(ctx, cam, 0.2, () => { E.sea(ctx, t, so); E.mountains(ctx, t, so); });
    pcam(ctx, cam, 0.4, () => { E.town(ctx, t, { x: 420, y: 790, s: 0.78, lit: 0.12 }); });
    pcam(ctx, cam, 1, () => {
      const hl = E.hill(ctx, t, { x: CH.x, y: CH.y, s: CH.s, wind, seed: 3 });
      E.fireflies(ctx, t, { cx: 1100, cy: 760, rx: 600, ry: 110, count: 12, seed: 23, size: 1 });
      const s = 0.62; const fy = hl.surfaceY(x) + 3;
      // run cycle timed so a foot lands on 29.8 + 0.2k (library: 1.5 cycles/s, contact at u=0 / 0.5)
      const running = t >= 29.62;
      const tr = running ? (t - 29.8) * 2.5 / 1.5 + 40 : 40;
      // slope: lean into the downhill
      const slope = Math.atan2(hl.surfaceY(x - 10) - hl.surfaceY(x + 10), 20);
      ctx.save(); ctx.translate(x, fy); ctx.rotate(-slope * 0.35); ctx.translate(-x, -fy);
      const a = A.drawMio(ctx, { x, y: fy, s, t: running ? tr : t, pose: running ? 'run' : 'stand', expr: 'determined', face: -1, wind: 0.8,
        mouth: A.mouth('mio', t), light: { x: x - 20, y: fy - 260 * s, color: P.star, strength: 0.35, radius: 200 } });
      ctx.restore();
      // Hoshi riding on her head, bouncing with each stride
      const u0 = (((tr * 1.5) % 0.5) + 0.5) % 0.5 * 2; // 0..1 per step
      const bounce = running ? Math.abs(sin(PI * u0)) : 0;
      const hs = 0.25 * s * 1.25;
      const hp = { x: a.head.x + 3, y: a.head.y - 70 * hs * 0.7 - 7 * bounce };
      const { g } = hoshiGlow(t);
      A.drawHoshi(ctx, { x: hp.x, y: hp.y, s: hs, t, glow: g + 0.05, expr: 'smile', look: { x: -0.8, y: 0.2 }, rot: -0.15 + 0.1 * sin(tr * TAU * 1.5), squash: running ? 0.35 * (1 - bounce) - 0.15 * bounce : 0 });
      glowAt(ctx, hp.x, hp.y, 70, P.star, 0.35 * A.clamp(g * 2));
      // grass kicked up at each footfall
      if (running) {
        ctx.save();
        for (let k = 0; k < 8; k++) {
          const tf = 29.8 + 0.2 * k; const lt = t - tf; if (lt < 0 || lt > 0.45) continue;
          const fx = mioRunX(tf) - 10, ffy = hl.surfaceY(fx);
          for (let j = 0; j < 5; j++) {
            const h = (q) => A.hash(k * 9.1 + j * 3.3 + q);
            const px = fx + (h(1) * 30 - 5) + lt * 90 * h(2), py = ffy - lt * (80 + 60 * h(3)) + lt * lt * 300;
            ctx.globalAlpha = 0.8 * (1 - lt / 0.45); ctx.fillStyle = h(4) < 0.4 ? '#dfe4fa' : '#3d7c80';
            ctx.beginPath(); ctx.ellipse(px, py, 3.5, 1.4, lt * 10 + j, 0, TAU); ctx.fill();
          }
        }
        ctx.restore();
      }
      petals(ctx, t, 0.5, 5, { x0: 300, x1: 2000, y0: 350, y1: 950 });
    });
    pcam(ctx, cam, 1.4, () => {
      ctx.save(); ctx.filter = 'blur(4px)';
      E.grass(ctx, t, { x0: -300, x1: 2400, y: 1210, h: 230, density: 0.2, wind, seed: 61, color: '#07121f' });
      ctx.restore();
    });
  }

  // ------------------------------------------------------------------ scene
  A.scene('s3_promise', {
    transitionIn: { type: 'fade', dur: 0.5 },
    draw(ctx, lt, t, info) {
      ctx.save();
      ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      if (t < 24.35) cutClose(ctx, t, 'A1');
      else if (t < 25.65) cutSky(ctx, t);
      else if (t < 26.5) cutClose(ctx, t, 'A3');
      else if (t < 29.6) cutHero(ctx, t);
      else cutRun(ctx, t);
      ctx.restore();
    },
  });
})();
