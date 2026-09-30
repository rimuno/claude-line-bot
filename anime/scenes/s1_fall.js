// ===== s1_fall : 0–9s  夜空からティルトダウン → 流れ星がよろよろ落ちて丘の草むらへ =====
// Shot list
//   A 0.00–5.00  WIDE: tilt down from the Milky Way to the establishing shot (multiplane parallax; hill rises last).
//                3.60 a shooting star streaks in from the upper left.
//   B 5.00–6.30  CU (tele, tracking): the star sputters, tumbles, sheds sparks; the crown's empty slot above it.
//   C 6.30–9.00  WIDE → PUSH-IN: star stalls (6.6–6.75, anticipation), drops to the hill, lands 7.40 (puff + sparkles),
//                camera dollies in toward the faintly flickering spot in the grass (continuity into s2).
(function () {
  const A = window.A; const W = A.W, H = A.H, CX = W / 2, CY = H / 2; const E = A.env; const TAU = Math.PI * 2;

  const T_APPEAR = 3.6, T_WOB0 = 5.0, T_WOB1 = 6.8, T_STALL = 6.75, T_LAND = 7.4;
  const CUT_B = 5.0, CUT_C = 6.3;

  // ---------------------------------------------------------------- world (hill-layer coords = establishing framing)
  const HILL = { x: 1500, y: 1130 };
  const hillYw = (xl) => { const u = xl / (xl < 0 ? 1250 * 0.95 : 1250 * 1.1); const a = Math.abs(u); return a >= 1 ? 0 : -300 * Math.pow(1 - a * a, 0.75) + 6 * A.noise(xl * 0.01, 4); };
  const LX = 1430; const LY = HILL.y + hillYw(LX - HILL.x) + 12; // landing spot (a bit inside the grass)

  // ---------------------------------------------------------------- star path
  const KEYS = [[3.6, 120, 60], [4.3, 560, 190], [5.0, 930, 310], [5.6, 1120, 382], [6.2, 1262, 440], [T_STALL, 1352, 468]];
  const TAN = KEYS.map((k, i) => {
    if (i === KEYS.length - 1) return [150, -10];
    if (i === 0) { const n = KEYS[1]; return [(n[1] - k[1]) / (n[0] - k[0]) * 1.1, (n[2] - k[2]) / (n[0] - k[0]) * 1.1]; }
    const p = KEYS[i - 1], n = KEYS[i + 1]; return [(n[1] - p[1]) / (n[0] - p[0]), (n[2] - p[2]) / (n[0] - p[0])];
  });
  const wobAmp = (t) => A.smooth(A.range(t, T_WOB0 - 0.1, T_WOB0 + 0.35)) * (1 - A.smooth(A.range(t, T_STALL - 0.25, T_STALL + 0.05)));
  function basePath(t) {
    if (t <= KEYS[0][0]) { const k = KEYS[0], m = TAN[0], d = t - k[0]; return [k[1] + m[0] * d, k[2] + m[1] * d]; }
    if (t >= T_STALL) { // stall → gravity drop (anticipation: tiny hang, then accelerating fall)
      const k = KEYS[KEYS.length - 1]; const u = A.clamp((t - T_STALL) / (T_LAND - T_STALL));
      const x = k[1] + (LX - k[1]) * (0.25 * u + 0.75 * A.ease.outSine(u)) + 0 * u;
      const y = k[2] - 10 * Math.sin(u * Math.PI) * (1 - u) + (LY - k[2]) * Math.pow(u, 2.2);
      return [x, y];
    }
    let i = 0; while (i < KEYS.length - 2 && t > KEYS[i + 1][0]) i++;
    const a = KEYS[i], b = KEYS[i + 1], ma = TAN[i], mb = TAN[i + 1]; const h = b[0] - a[0]; const s = (t - a[0]) / h;
    const s2 = s * s, s3 = s2 * s; const h00 = 2 * s3 - 3 * s2 + 1, h10 = s3 - 2 * s2 + s, h01 = -2 * s3 + 3 * s2, h11 = s3 - s2;
    return [h00 * a[1] + h10 * h * ma[0] + h01 * b[1] + h11 * h * mb[0], h00 * a[2] + h10 * h * ma[1] + h01 * b[2] + h11 * h * mb[1]];
  }
  function starPos(t) {
    const p = basePath(t); const w = wobAmp(t); if (w <= 0) return p;
    const q = basePath(t + 0.02); let dx = q[0] - p[0], dy = q[1] - p[1]; const L = Math.hypot(dx, dy) || 1; dx /= L; dy /= L;
    const off = w * (16 * Math.sin(t * 10.5) + 14 * A.noise(t * 3.3, 11) + 6 * Math.sin(t * 23 + 1));
    const along = w * 8 * A.noise(t * 5.1, 12);
    return [p[0] - dy * off + dx * along, p[1] + dx * off + dy * along];
  }
  // brightness of the star (flicker / sputter)
  function starBright(t) {
    if (t < T_APPEAR) return 0;
    let b = A.smooth(A.range(t, T_APPEAR, T_APPEAR + 0.12));
    const w = A.smooth(A.range(t, T_WOB0, T_WOB0 + 0.15));
    if (w > 0) {
      const n = A.noise(t * 17, 21) * 0.6 + A.noise(t * 6.3, 22) * 0.4; // -1..1
      const drop = n < -0.35 ? 0.25 : 1; // sputter dropouts
      const f = (0.62 + 0.38 * n) * drop;
      b *= A.lerp(1, A.clamp(f, 0.12, 1), w);
    }
    if (t > T_STALL - 0.1) b = A.lerp(b, 0.55 + 0.25 * Math.sin(t * 40), A.smooth(A.range(t, T_STALL - 0.1, T_STALL + 0.1)));
    return b;
  }
  const starColor = (t) => A.mix('#fff6d8', A.PAL.starDim, 0.55 * A.smooth(A.range(t, T_WOB0, T_WOB1)));

  // ---------------------------------------------------------------- camera
  // returns {Z, C:[x,y], tilt, shake:[dx,dy]}
  const tiltE = (x) => 0.12 * x + 0.88 * A.ease.inOutSine(x);
  function camera(t) {
    const sh = A.clamp(1 - (t - T_LAND) / 0.5) * (t >= T_LAND ? 1 : 0); const amp = 7 * sh * sh;
    const shake = [amp * A.noise(t * 38, 31), amp * A.noise(t * 41, 32) + (t >= T_LAND ? 5 * sh * sh * sh : 0)];
    if (t < CUT_B) { // A: tilt down + slow creep
      const tilt = 1 - tiltE(A.range(t, -0.2, 4.85));
      const Z = 1 + 0.025 * A.smooth(A.range(t, 3.4, 5.4));
      return { Z, C: [CX + 60 * (1 - tilt) * 0, CY], tilt, shake };
    }
    if (t < CUT_C) { // B: tele tracking of the star
      const u = A.range(t, CUT_B, CUT_C); const lag = starPos(t - 0.3), lag2 = starPos(t - 0.6);
      const Cx = (lag[0] + lag2[0]) / 2 + 150, Cy = (lag[1] + lag2[1]) / 2 + 10;
      return { Z: 2.0 + 0.12 * u, C: [Cx, Cy], tilt: 0, shake: [A.noise(t * 1.3, 41) * 3, A.noise(t * 1.1, 42) * 3] };
    }
    // C: wide → push in to the landing spot (still moving at 9.3 for the crossfade)
    const k = A.ease.inOutCubic(A.range(t, 6.45, 9.45)); const k2 = A.smooth(A.range(t, 6.3, 6.5)) * 0.02;
    const Z = A.lerp(1.0 + k2, 2.4, k);
    const C = [A.lerp(CX, LX, k), A.lerp(CY, LY - 45, k)];
    return { Z, C, tilt: 0, shake };
  }
  // layer mapping: d = depth factor (0 = infinitely far, 1 = hill), tf = tilt factor
  const TILT_PX = 1950;
  function layer(cam, d, tf) {
    const z = 1 + (cam.Z - 1) * d; const cx = CX + (cam.C[0] - CX) * d, cy = CY + (cam.C[1] - CY) * d;
    const ox = CX - cx * z + cam.shake[0] * d, oy = CY - cy * z + cam.tilt * TILT_PX * tf + cam.shake[1] * d;
    return { z, ox, oy, X: (x) => x * z + ox, Y: (y) => y * z + oy, apply: (ctx) => { ctx.translate(ox, oy); ctx.scale(z, z); } };
  }

  // ---------------------------------------------------------------- foreground (out of focus) grass: low-res offscreen = soft
  let fgC = null;
  function drawFgGrass(ctx, t, L, alpha, wind) {
    if (alpha <= 0) return;
    const S = 0.25; if (!fgC) { fgC = document.createElement('canvas'); fgC.width = W * S; fgC.height = H * S; }
    const g = fgC.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, fgC.width, fgC.height);
    g.setTransform(S * L.z, 0, 0, S * L.z, S * L.ox, S * L.oy);
    E.grass(g, t, { x0: 700, x1: 1180, y: 1190, h: 250, density: 0.55, color: ['#02050f', '#0b1a2c'], wind, seed: 7 });
    E.grass(g, t, { x0: 1700, x1: 2150, y: 1200, h: 280, density: 0.55, color: ['#02050f', '#0c1c2e'], wind, seed: 8 });
    ctx.save(); ctx.globalAlpha = alpha; ctx.drawImage(fgC, 0, 0, W, H); ctx.restore();
  }

  // ---------------------------------------------------------------- the star (head + trail + shed sparks), drawn in hill-layer coords
  function drawStar(ctx, t, L, cu) {
    if (t < T_APPEAR - 0.02) return;
    const landed = t >= T_LAND; const col = starColor(Math.min(t, T_LAND));
    ctx.save(); L.apply(ctx); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const zs = 1 / L.z; // keep some elements screen-sized
    // ---- trail
    const trailFade = 1 - A.smooth(A.range(t, T_LAND, T_LAND + 0.35));
    if (trailFade > 0) {
      const N = 40, dt = 0.016; const pts = [];
      for (let i = 0; i <= N; i++) { const tau = Math.min(t, T_LAND) - i * dt; if (tau < T_APPEAR) break; pts.push([...starPos(tau), i / N, tau]); }
      const wob = A.smooth(A.range(t, T_WOB0, T_WOB0 + 0.2));
      for (let i = 1; i < pts.length; i++) {
        const [x0, y0, s0, tau] = pts[i - 1], [x1, y1, s1] = pts[i];
        let a = Math.pow(1 - s1, 1.4) * trailFade;
        // broken trail while sputtering (mask moves with the trail itself: based on emission time)
        if (tau > T_WOB0) { const m = A.noise(tau * 14, 51) * 0.7 + A.noise(tau * 37, 52) * 0.3; a *= A.lerp(1, A.smooth((m + 0.15) / 0.35), wob); }
        a *= 0.35 + 0.65 * starBright(tau);
        if (a <= 0.01) continue;
        const wdt = (1 - s1) * (1 - 0.35 * wob);
        ctx.strokeStyle = A.rgba(A.PAL.star, 0.16 * a); ctx.lineWidth = 30 * wdt; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
        ctx.strokeStyle = A.rgba('#fff0c0', 0.55 * a); ctx.lineWidth = 9 * wdt; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
        ctx.strokeStyle = A.rgba('#ffffff', 0.9 * a); ctx.lineWidth = 2.2 * wdt + 0.4; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
      }
    }
    // ---- shed sparks (emitted along the path; fall with gravity)
    const nEm = 60;
    for (let j = 0; j < nEm; j++) {
      const te = T_APPEAR + 0.15 + j * ((T_LAND - T_APPEAR - 0.15) / nEm); const age = t - te; const life = 0.7 + 0.6 * A.hash(j * 3.7);
      if (age < 0 || age > life) continue;
      const sput = te > T_WOB0 ? 1 : 0.35; if (A.hash(j * 9.1) > (te > T_WOB0 ? 1 : 0.6)) continue;
      const p = starPos(te); const an = A.hash(j * 1.7) * TAU; const sp = (20 + 70 * A.hash(j * 2.9)) * sput;
      const x = p[0] + Math.cos(an) * sp * age, y = p[1] + Math.sin(an) * sp * age * 0.6 + 55 * age * age + 8 * age;
      const k = age / life; const tw = 0.5 + 0.5 * Math.sin(t * (14 + 9 * A.hash(j)) + j);
      const a = (1 - k) * (0.4 + 0.6 * tw);
      E.sparkle(ctx, x, y, (5 + 9 * A.hash(j * 5.3)) * (1 - 0.6 * k) * (cu ? 1 : 1.3), j % 2 ? '#fff2c0' : A.PAL.star, a, 0);
      E.glow(ctx, x, y, 7, A.PAL.star, 0.5 * a);
    }
    // ---- sputter "pops": a spit of sparks + flash
    for (const tp of [5.18, 5.62, 5.95, 6.38]) {
      const age = t - tp; if (age < 0 || age > 0.8) continue; const p = starPos(tp); const k = age / 0.8;
      E.glow(ctx, p[0], p[1], 60 * (0.5 + k), A.PAL.star, 0.5 * Math.pow(1 - k, 3));
      for (let i = 0; i < 7; i++) {
        const an = A.hash(tp * 10 + i) * TAU, sp = 60 + 90 * A.hash(tp * 7 + i * 3);
        const x = p[0] + Math.cos(an) * sp * age, y = p[1] + Math.sin(an) * sp * age + 90 * age * age;
        E.sparkle(ctx, x, y, 10 * (1 - k), '#fff4d0', (1 - k), 0);
      }
    }
    // ---- head
    if (!landed) {
      const [x, y] = starPos(t); const q = starPos(t - 0.02); const vx = (x - q[0]) / 0.02, vy = (y - q[1]) / 0.02; const v = Math.hypot(vx, vy);
      const b = starBright(t); const ang = Math.atan2(vy, vx);
      E.glow(ctx, x, y, 120 * (0.6 + 0.4 * b), col, 0.45 * b);
      E.glow(ctx, x, y, 36, '#fff6d8', 0.9 * b);
      // stretched core along velocity (squash & stretch)
      const st = A.clamp(v / 900, 0, 0.9);
      ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.scale(1 + st * 1.6, 1 - st * 0.35);
      E.glow(ctx, 0, 0, 14, '#ffffff', b); ctx.restore();
      E.sparkle(ctx, x, y, (46 + 12 * Math.sin(t * 20)) * (0.5 + 0.5 * b), '#fff4cc', 0.9 * b, t * 0.8);
      // the tiny star itself (visible once it slows down): tumbling, wincing
      const vis = A.smooth(A.range(t, T_WOB0 - 0.3, T_WOB0 + 0.2));
      if (vis > 0) {
        ctx.save(); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = vis;
        const fall = A.range(t, T_STALL, T_LAND);
        const stall = A.smooth(A.range(t, T_STALL - 0.3, T_STALL)) * (1 - A.smooth(A.range(t, T_STALL, T_STALL + 0.12)));
        const tumble = (t - T_WOB0) * 2.2 + 0.5 * Math.sin(t * 7) + fall * fall * 5;
        ctx.translate(x, y); ctx.rotate(ang); ctx.scale(1 + st * 0.35 + 0.25 * fall * fall, 1 - st * 0.15 - 0.1 * fall); ctx.rotate(-ang);
        A.drawHoshi(ctx, { x: 0, y: 0, s: (cu ? 0.3 : 0.17), t, glow: 0.25 + 0.5 * b, expr: 'cry', rot: tumble, squash: -0.5 * stall + 0.3 * Math.sin(t * 30) * stall, mouth: { v: 'closed', open: 0 } });
        ctx.restore();
      }
    }
    ctx.restore();
  }

  // ---------------------------------------------------------------- landed star in the grass (+ impact FX)
  function drawLanded(ctx, t, L) {
    if (t < T_LAND - 0.02) return;
    const age = t - T_LAND;
    ctx.save(); L.apply(ctx);
    // alive flicker: faint, breathing, occasionally dipping
    const fl = 0.55 + 0.25 * Math.sin(t * 2.6) + 0.2 * A.noise(t * 7, 61) - (A.noise(t * 3.3, 62) < -0.55 ? 0.25 : 0);
    const settle = A.smooth(A.range(age, 0, 0.6));
    ctx.globalCompositeOperation = 'lighter';
    // ground puff of light (flattened)
    const pk = A.range(age, 0, 0.9);
    if (pk < 1) {
      ctx.save(); ctx.translate(LX, LY + 4); ctx.scale(1, 0.32);
      E.glow(ctx, 0, 0, 80 + 260 * A.ease.outCubic(pk), A.PAL.warm, 0.55 * Math.pow(1 - pk, 2)); ctx.restore();
      E.glow(ctx, LX, LY - 10, 70 + 90 * A.ease.outCubic(pk), '#fff2c8', 0.45 * Math.pow(1 - pk, 3));
    }
    ctx.save(); ctx.translate(LX, LY + 2); ctx.scale(1, 0.4); E.glow(ctx, 0, 0, 170, A.PAL.warm, (0.2 + 0.12 * fl) * settle); ctx.restore();
    E.glow(ctx, LX, LY - 6, 130, A.PAL.star, (0.3 + 0.2 * fl) * settle + 0.2 * (1 - settle));
    E.glow(ctx, LX, LY - 6, 40, '#fff3c8', (0.4 + 0.25 * fl) * settle + 0.3 * (1 - settle));
    ctx.globalCompositeOperation = 'source-over';
    // the tiny star lying tilted in the grass (bounce: squash on impact, small hop)
    const bounce = age < 0.45 ? Math.sin((age / 0.45) * Math.PI) * 12 * (1 - age / 0.45) : 0;
    const sq = age < 0.5 ? 0.9 * Math.exp(-age * 9) * Math.cos(age * 30) : 0;
    A.drawHoshi(ctx, { x: LX, y: LY - 6 - bounce, s: 0.16, t, glow: 0.3 + 0.2 * fl, expr: 'cry', rot: 0.5 - 0.1 * A.smooth(A.range(age, 0, 0.5)) + 0.04 * Math.sin(t * 1.7), squash: sq, mouth: { v: 'closed', open: 0 } });
    ctx.restore();
  }
  function drawImpactFX(ctx, t, L) {
    const age = t - T_LAND; if (age < -0.02) return;
    ctx.save(); L.apply(ctx);
    E.burst(ctx, t, { x: LX, y: LY - 6, p: A.range(age, 0, 1.1), r: 120, color: A.PAL.star, seed: 3, rays: 12, particles: 26 });
    const sa = (1 - A.smooth(A.range(age, 0, 1.4))) * 0.9 + 0.35;
    E.sparkles(ctx, t, { x: LX, y: LY - 30, r: 70 + 50 * A.smooth(A.range(age, 0, 1)), count: 9, seed: 4, alpha: sa, color: '#fff2c0', size: 0.7 });
    ctx.restore();
  }

  // ---------------------------------------------------------------- scene
  A.scene('s1_fall', {
    transitionIn: { type: 'fade', dur: 0.6 },
    draw(ctx, lt, t) {
      ctx.save();
      const cam = camera(t); const cu = t >= CUT_B && t < CUT_C;
      const Lsky = layer(cam, 0.35, 0), Ltown = layer(cam, 0.6, 1.12), Lhill = layer(cam, 1.0, 1.35), Lfg = layer(cam, 1.45, 1.8);
      const gust = t >= T_LAND ? 1.1 * A.smooth(A.range(t, T_LAND, T_LAND + 0.12)) * Math.exp(-(t - T_LAND) * 2.2) : 0;
      const wind = 0.5 + gust;
      const gapPulse = 0.55 * A.smooth(A.range(t, 7.6, 8.2)) * (1 - 0.4 * A.smooth(A.range(t, 8.4, 9.2))) + (cu ? 0.18 : 0);

      // --- far: sky, clouds, sea, mountains (shared horizon) under a transform
      ctx.save(); Lsky.apply(ctx);
      const so = { offsetY: cam.tilt * TILT_PX / Lsky.z, gapPulse };
      E.sky(ctx, t, so); E.clouds(ctx, t, so); E.sea(ctx, t, so); E.mountains(ctx, t, so);
      ctx.restore();
      // --- town (crisp, explicit scale)
      E.town(ctx, t, { x: Ltown.X(760), y: Ltown.Y(955), s: 0.78 * Ltown.z, lit: 0.12 });
      // depth haze between town and hill when pushed in
      const haze = A.smooth(A.range(cam.Z, 1.2, 2.4)) * 0.28;
      if (haze > 0) { ctx.fillStyle = A.rgba('#0a1030', haze); ctx.fillRect(0, 0, W, H); }
      // --- the star while still in the sky is behind the hill only after it crosses the crest: draw before hill when low
      const hillVisible = Lhill.Y(HILL.y - 330) < H + 50;
      if (hillVisible) {
        const hr = E.hill(ctx, t, { x: Lhill.X(HILL.x), y: Lhill.Y(HILL.y), s: Lhill.z, wind });
        void hr;
        // fireflies over the hill
        ctx.save(); Lhill.apply(ctx); E.fireflies(ctx, t, { cx: 1380, cy: 800, rx: 420, ry: 110, count: 20, seed: 2, size: 0.8 }); ctx.restore();
      }
      drawStar(ctx, t, Lhill, cu);
      drawLanded(ctx, t, Lhill);
      // near grass tuft in front of the landing spot, rim-lit by the star
      if (hillVisible) {
        ctx.save(); Lhill.apply(ctx);
        const fl = 0.55 + 0.25 * Math.sin(t * 2.6) + 0.2 * A.noise(t * 7, 61);
        const ls = t >= T_LAND ? A.lerp(1.6, 0.7 + 0.3 * fl, A.smooth(A.range(t, T_LAND, T_LAND + 0.8))) : A.smooth(A.range(t, T_LAND - 0.35, T_LAND)) * 0.8;
        E.grass(ctx, t, { x0: LX - 70, x1: LX + 75, y: LY + 14, h: 48, density: 0.8, color: ['#10304a', '#2f6672'], wind, seed: 5,
          lightFrom: ls > 0.02 ? { x: LX, y: LY - 8, r: 70, color: A.PAL.star, strength: ls } : null });
        ctx.restore();
      }
      drawImpactFX(ctx, t, Lhill);
      // --- out-of-focus foreground
      drawFgGrass(ctx, t, Lfg, 0.9, wind);
      // bokeh fireflies near camera at the end
      const bk = A.smooth(A.range(t, 7.8, 8.8));
      if (bk > 0) {
        for (let i = 0; i < 3; i++) {
          const x = [260, 1700, 520][i] + 30 * A.noise(t * 0.4 + i * 5, 71), y = [300, 240, 820][i] + 24 * A.noise(t * 0.35 + i * 9, 72);
          E.glow(ctx, x, y, 70 + 20 * i, '#b8f06a', 0.12 * bk * (0.6 + 0.4 * Math.sin(t * 1.8 + i * 2)));
        }
      }
      ctx.restore();
    },
  });
})();
