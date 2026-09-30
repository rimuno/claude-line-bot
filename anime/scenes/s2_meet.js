// ===== s2_meet : 草むらの出会い (9–21 s) =====
// Cut A (9–14.3)  ground-level close-up in the grass: Hoshi crying, rack focus, Mio's footsteps (11.8/12.3/12.8)
// Cut B (14.3–17) medium: crouching Mio recoils "えっ" (14.5), leans in
// Cut C (17–21)   Mio scoops Hoshi (17.6) into cupped hands, worried; slow push-in
(function () {
  const A = window.A, E = A.env, P = A.PAL, W = A.W, H = A.H, TAU = Math.PI * 2;
  const ease = A.ease, tw = A.tween, rg = A.range;
  const CUT_B = 14.3, CUT_C = 17.0;
  const STEPS = [11.8, 12.3, 12.8];

  // ------------------------------------------------------------ helpers
  // damped "spring" pulse after time t0 (0 before). k: decay, f: frequency
  const spring = (t, t0, k = 6, f = 14) => (t < t0 ? 0 : Math.exp(-(t - t0) * k) * Math.cos((t - t0) * f));
  const pulse = (t, t0, a = 0.05, d = 0.35) => (t < t0 - a || t > t0 + d ? 0 : t < t0 ? A.smooth((t - (t0 - a)) / a) : 1 - A.smooth((t - t0) / d));
  // camera with parallax factor p (p=1: full camera, p<1: far layer moves less)
  const camP = (cam, p) => ({ x: A.lerp(W / 2, cam.x, p), y: A.lerp(H / 2, cam.y, p), zoom: 1 + (cam.zoom - 1) * p, rot: (cam.rot || 0) * p });
  const inCam = (ctx, cam, p, fn) => A.camera(ctx, camP(cam, p), fn);

  // soft (defocused) layer: render at 1/k resolution, upscale with smoothing
  let OFF = null;
  const offCanvas = () => { if (!OFF) { OFF = document.createElement('canvas'); OFF.width = W; OFF.height = H; } return OFF; };
  function soft(ctx, k, fn) {
    if (k <= 1.08) { fn(ctx); return; }
    const c = offCanvas(), g = c.getContext('2d'); const w = Math.ceil(W / k) + 2, h = Math.ceil(H / k) + 2;
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.filter = 'none';
    g.clearRect(0, 0, w + 2, h + 2); g.setTransform(1 / k, 0, 0, 1 / k, 0, 0);
    fn(g);
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(c, 0, 0, W / k, H / k, 0, 0, W, H); ctx.restore();
  }

  // a single hand-drawn blade (for hero foreground blades & trampled tufts)
  function blade(ctx, x, y, h, w, ang, curl, col) {
    const tx = x + h * Math.sin(ang) + curl * h * 0.18, ty = y - h * Math.cos(ang);
    const mx = x + (tx - x) * 0.42 + curl * h * 0.05, my = y - h * 0.62 * Math.cos(ang * 0.7);
    ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x - w / 2, y);
    ctx.quadraticCurveTo(mx - w * 0.35, my, tx, ty); ctx.quadraticCurveTo(mx + w * 0.35, my, x + w / 2, y); ctx.closePath(); ctx.fill();
    return { x: tx, y: ty };
  }
  const windAt = (x, t, s = 1) => 0.5 * (0.6 * A.noise(x * 0.0028 - t * 0.85, s) + 0.28 * A.noise(x * 0.011 - t * 1.9, s + 3));

  // ------------------------------------------------------------ CUT A : ground level
  const HO_A = { x: 870, y: 742, s: 0.95 };
  const GROUND_A = 842;           // where Mio's shoes land
  const MIO_A = { s: 4.1, xStop: 1400 };
  const WALK_V = 84 * MIO_A.s;    // px / s so the stance foot stays planted
  const mioAX = (t) => MIO_A.xStop + WALK_V * (STEPS[2] - Math.min(t, STEPS[2]));
  const landX = (i) => mioAX(STEPS[i]) - 22 * MIO_A.s; // heel-strike point (face=-1 → local +x maps to screen -x)

  function hoshiA(t) {
    const st = { x: HO_A.x, y: HO_A.y, s: HO_A.s, rot: -0.55, squash: 0, expr: 'cry', look: { x: -0.2, y: 0.3 }, glow: 0.35 };
    // sniffles (little hiccups)
    let sn = 0; for (const s0 of [8.72, 9.08, 9.3, 10.28, 10.46, 11.5]) sn += spring(t, s0, 9, 22) * 0.28 * (t - s0 < 0.6 ? 1 : 0);
    // sit up from lying (anticipation dip then rise)
    const up = ease.outBack(rg(t, 10.08, 10.62)); const dip = pulse(t, 10.08, 0.12, 0.12);
    st.rot = A.lerp(-0.55, -0.1, up); st.y += -12 * up + 8 * dip; st.squash = sn + dip * 0.3 - 0.12 * pulse(t, 10.4, 0.2, 0.3);
    // body shaking while sobbing
    const mo = A.mouth('hoshi', t); st.rot += 0.035 * Math.sin(t * 17) * (mo.open > 0.06 ? 1 : 0.35) * (t < 11.8 ? 1 : 0.3);
    st.look = { x: -0.3 + 0.2 * up, y: 0.4 - 0.4 * up };
    // footsteps: startle, hop, flinches
    if (t >= 11.8) {
      st.expr = 'surprised';
      const hop = rg(t, 11.84, 12.12); const hy = Math.sin(hop * Math.PI) * 30;
      st.y -= hy; st.squash += 0.55 * pulse(t, 11.8, 0.01, 0.06) - 0.35 * Math.sin(hop * Math.PI) + 0.35 * spring(t, 12.12, 10, 20);
      st.squash += 0.28 * spring(t, 12.3, 12, 24) + 0.32 * spring(t, 12.8, 12, 24);
      st.x -= 10 * ease.outCubic(rg(t, 11.84, 12.1)) + 6 * ease.outCubic(rg(t, 12.3, 12.45)) + 6 * ease.outCubic(rg(t, 12.8, 12.95));
      const lu = ease.inOutCubic(rg(t, 12.95, 13.45));
      st.rot = A.lerp(-0.22, 0.2, lu) + 0.04 * Math.sin(t * 9) * (1 - lu) + 0.02 * Math.sin(t * 3);
      st.look = { x: A.lerp(0.9, 0.7, lu), y: A.lerp(0.1, -1, lu) };
      st.glow = 0.35 + 0.2 * pulse(t, 11.82, 0.02, 0.5) + 0.1 * pulse(t, 12.82, 0.02, 0.4);
    }
    return st;
  }
  function camA(t) {
    const push = ease.inOutSine(rg(t, 8.6, 11.7));
    const tilt = ease.inOutCubic(rg(t, 12.9, 14.3));
    const cam = { x: A.lerp(A.lerp(930, 890, push), 1010, tilt), y: A.lerp(A.lerp(620, 650, push), 540, tilt), zoom: A.lerp(A.lerp(1.0, 1.12, push), 1.02, tilt), rot: 0.012 * Math.sin(t * 0.7) };
    let j = 0; STEPS.forEach((s, i) => { j += spring(t, s, 9, 30) * (i === 2 ? 7 : 5); });
    cam.y -= j; const sh = A.shake(t, 3, 21); cam.x += sh.dx; cam.y += sh.dy;
    return cam;
  }
  // trampled tufts at each footstep
  function tuft(ctx, t, i, front) {
    const x0 = landX(i), y0 = GROUND_A + 6; const ts = STEPS[i]; const r = A.rng(900 + i * 17);
    const dt = t - ts; const flat = dt < -0.06 ? 0 : dt < 0 ? 1 - dt / -0.06 : Math.max(0.35, 1 - A.smooth((dt - 0.6) / 1.8) * 0.65);
    const boing = dt > 0 ? 0.18 * spring(t, ts, 5, 16) : 0;
    const n = 11;
    for (let k = 0; k < n; k++) {
      const u = k / (n - 1) - 0.5; const isFront = r() < 0.45; const h = (70 + r() * 80) * (1 - Math.abs(u) * 0.3); const w = 10 + r() * 8;
      const lean = u * 0.7 + (r() - 0.5) * 0.3; const px = x0 + u * 190 + (r() - 0.5) * 20;
      if (isFront !== front) continue;
      const out = Math.sign(u || 0.01) * (0.95 + 0.4 * Math.abs(u)) * (Math.abs(u) < 0.35 ? 1 : 0.55);
      const ang = lean + out * (flat + boing) + windAt(px, t, 7) * (1 - flat * 0.8) * 0.8;
      const col = front ? A.mix('#10263c', '#23505c', r()) : A.mix('#0d2034', '#1c4254', r());
      blade(ctx, px, y0 + (front ? 10 : 0), h * (1 - flat * 0.25), w, ang, (r() - 0.5) * 0.6, col);
    }
  }
  // tiny seeds / pollen kicked up by each step
  function stepMotes(ctx, t) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    STEPS.forEach((ts, i) => {
      const dt = t - ts; if (dt < 0 || dt > 2.2) return;
      for (let k = 0; k < 9; k++) {
        const h = (q) => A.hash(i * 31 + k * 7.3 + q * 1.9);
        const vx = (h(1) - 0.5) * 260, vy = -80 - h(2) * 160; const x = landX(i) + vx * dt * 0.8 + Math.sin(t * 3 + k) * 8;
        const y = GROUND_A - 10 + vy * dt + 60 * dt * dt; const a = (1 - dt / 2.2) * (0.5 + 0.5 * Math.sin(t * 12 + k * 2));
        E.glow(ctx, x, y, 10 + h(3) * 8, '#dfe8c8', 0.35 * a); ctx.fillStyle = `rgba(250,248,225,${0.8 * a})`; ctx.fillRect(x - 1.5, y - 1.5, 3, 3);
      }
    });
    ctx.restore();
  }
  function heroBlades(ctx, t, ho) {
    // big foreground blades (left + right edge), one carries a dew drop catching Hoshi's light
    const defs = [[120, 1180, 980, 60, 0.22, 0.4], [310, 1200, 820, 46, 0.36, 0.2], [520, 1210, 700, 40, 0.5, -0.1], [-40, 1150, 900, 70, 0.05, 0.3],
      [1760, 1190, 900, 60, -0.3, -0.35], [1600, 1210, 760, 44, -0.46, -0.2], [1930, 1150, 980, 70, -0.12, -0.3], [640, 1230, 520, 34, 0.62, -0.25]];
    let dew = null;
    defs.forEach(([x, y, h, w, lean, curl], i) => {
      const a = lean + windAt(x, t, 11) * 0.12 + 0.015 * Math.sin(t * 1.3 + i);
      const col = i % 2 ? '#081322' : '#0a1828';
      const tip = blade(ctx, x, y, h, w, a, curl, col);
      if (i === 7) dew = tip;
      // faint moon rim on the upper edge
      ctx.save(); ctx.globalAlpha = 0.18; blade(ctx, x + 3, y, h * 0.985, w * 0.25, a, curl, '#6f86c8'); ctx.restore();
    });
    if (dew) {
      const dx = dew.x - 6, dy = dew.y + 34; const r = 9;
      ctx.save(); ctx.fillStyle = 'rgba(160,200,255,0.25)'; ctx.beginPath(); ctx.arc(dx, dy, r, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(200,225,255,0.5)'; ctx.lineWidth = 1.5; ctx.stroke();
      E.glow(ctx, dx, dy, 34, P.warm, 0.5 * ho.glow + 0.15); ctx.fillStyle = '#fff6d8'; ctx.beginPath(); ctx.arc(dx - 3, dy - 3, 2.6, 0, TAU); ctx.fill();
      E.sparkle(ctx, dx - 3, dy - 3, 16 + 6 * Math.sin(t * 5), '#fff2c0', 0.7);
      ctx.restore();
    }
  }
  function drawCutA(ctx, t) {
    const cam = camA(t); const ho = hoshiA(t);
    // focus: first on the dew-drop blade (foreground), then pull to Hoshi (9.35–10.1)
    const rf = ease.inOutCubic(rg(t, 9.35, 10.1));
    const kMid = A.lerp(3.2, 1, rf), kFG = A.lerp(1, 4.2, rf);
    const L = { x: ho.x, y: ho.y, color: P.star, strength: 0.55 + ho.glow * 0.9 };
    // sky + far bank
    inCam(ctx, cam, 0.12, () => { E.sky(ctx, t, { horizonY: 700 }); E.clouds(ctx, t, { horizonY: 700 }); });
    soft(ctx, 2.2, (g) => inCam(g, cam, 0.45, () => {
      E.grass(g, t, { x0: -300, x1: W + 300, y: 610, h: 150, density: 0.9, color: ['#0a1830', '#1f4660'], wind: 0.4, seed: 3, ground: true });
      E.fireflies(g, t, { cx: 960, cy: 430, rx: 900, ry: 140, count: 12, seed: 4, size: 1.2 });
    }));
    // mid layer (focus plane): back grass, Hoshi, glow puddle
    soft(ctx, kMid, (g) => inCam(g, cam, 1, () => {
      E.grass(g, t, { x0: -200, x1: W + 300, y: 770, h: 250, density: 1, color: ['#0b1b33', '#21506a'], wind: 0.45, seed: 5, ground: true, lightFrom: Object.assign({ r: 420 }, L) });
      // warm puddle of light on the ground
      g.save(); g.translate(ho.x, ho.y + 60); g.scale(2.6, 0.55); E.glow(g, 0, 0, 150, P.warm, 0.35 + 0.3 * ho.glow); g.restore();
      E.glow(g, ho.x, ho.y, 260, P.star, 0.18 + 0.25 * ho.glow);
      A.drawHoshi(g, { x: ho.x, y: ho.y, s: ho.s, t, glow: ho.glow, expr: ho.expr, look: ho.look, rot: ho.rot, squash: ho.squash });
    }));
    // Mio's legs + trampled grass (sharp — they are in the focus plane after the pull)
    inCam(ctx, cam, 1, () => {
      const mx = mioAX(t);
      for (let i = 0; i < 3; i++) if (t > STEPS[i] - 0.5) tuft(ctx, t, i, false);
      if (t > 11.05 && mx < W + 700) {
        const tw_ = 10 + (Math.min(t, STEPS[2]) - STEPS[0]) / 0.9; // walk cycle: heel strikes exactly on the cue times
        A.drawMio(ctx, { x: mx, y: GROUND_A, s: MIO_A.s, face: -1, t: tw_, pose: 'walk', expr: 'neutral', wind: 0.3, light: { x: ho.x, y: ho.y, color: P.star, strength: 0.9, radius: 700 } });
      }
      for (let i = 0; i < 3; i++) if (t > STEPS[i] - 0.5) tuft(ctx, t, i, true);
      stepMotes(ctx, t);
    });
    // near grass around Hoshi (slightly in front of the focus plane)
    soft(ctx, A.lerp(1.6, 1.3, rf), (g) => inCam(g, cam, 1.08, () => {
      E.grass(g, t, { x0: -200, x1: W + 300, y: 905, h: 150, density: 0.75, color: ['#08162a', '#1a4058'], wind: 0.5, seed: 7, ground: true, lightFrom: { x: ho.x, y: ho.y, r: 380, color: P.star, strength: 0.8 } });
    }));
    // foreground: hero blades + bokeh
    soft(ctx, kFG, (g) => inCam(g, cam, 1.35, () => {
      heroBlades(g, t, ho);
      g.save(); g.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 7; i++) { const x = 200 + i * 260 + 40 * Math.sin(t * 0.3 + i), y = 250 + 120 * A.hash(i * 3.3) + 20 * Math.sin(t * 0.5 + i * 2); E.glow(g, x, y, 40 + 30 * A.hash(i), i % 3 ? '#b8f06a' : '#ffe28a', 0.12 + 0.08 * Math.sin(t * 1.7 + i)); }
      g.restore();
    }));
    return cam;
  }

  // ------------------------------------------------------------ CUT B / C : hill-top, medium shots
  const GROUND_B = 850;
  const MIO_B = { x: 1260, s: 2.3 };
  function hillWorld(ctx, t, cam, ho, fgK) {
    inCam(ctx, cam, 0.15, () => { E.sky(ctx, t, { horizonY: 600 }); E.clouds(ctx, t, { horizonY: 600 }); E.sea(ctx, t, { horizonY: 600 }); E.mountains(ctx, t, { horizonY: 600, height: 0.7 }); });
    inCam(ctx, cam, 0.25, () => { E.town(ctx, t, { x: 170, y: 760, s: 0.42, lit: 0.12 }); });
    inCam(ctx, cam, 0.45, () => { const g = ctx;
      E.hill(g, t, { x: 1500, y: 1020, s: 1.25, wind: 0.45, seed: 2 });
      E.fireflies(g, t, { cx: 900, cy: 560, rx: 900, ry: 150, count: 16, seed: 9, size: 1.1 });
    });
    // near bank the characters are on
    inCam(ctx, cam, 1, () => {
      E.grass(ctx, t, { x0: -300, x1: W + 400, y: GROUND_B - 10, h: 120, density: 1, color: ['#0b1c34', '#24566a'], wind: 0.45, seed: 12, ground: true, lightFrom: { x: ho.x, y: ho.y, r: 360, color: P.star, strength: 0.9 } });
    });
  }
  function frontGrass(ctx, t, cam, ho, k) {
    soft(ctx, k, (g) => inCam(g, cam, 1.25, () => {
      E.grass(g, t, { x0: -300, x1: W + 300, y: 1130, h: 300, density: 0.55, color: ['#060f20', '#15324a'], wind: 0.5, seed: 14, lightFrom: { x: ho.x, y: ho.y, r: 420, color: P.star, strength: 0.5 } });
    }));
  }

  // Cut B
  function drawCutB(ctx, t) {
    const lt = t - CUT_B;
    // Mio acting: anticipation dip → recoil pop (stretch) → land (squash) → settle; then leans in
    const ant = pulse(t, 14.5, 0.1, 0.04);
    const pop = rg(t, 14.52, 14.78); const popS = Math.sin(pop * Math.PI);
    const land = spring(t, 14.8, 7, 18) * (t >= 14.8 ? 1 : 0);
    const lean = ease.inOutSine(rg(t, 15.3, 16.9));
    let dy = 7 * ant - 26 * popS + 5 * Math.max(0, land);
    let rot = 0.1 * ease.outCubic(rg(t, 14.52, 14.7)) * (1 - ease.inOutCubic(rg(t, 14.9, 15.6))) - 0.07 * lean + 0.012 * Math.sin(t * 1.4);
    let sx = 1 + 0.035 * ant - 0.04 * popS + 0.04 * Math.max(0, land), sy = 1 - 0.045 * ant + 0.06 * popS - 0.05 * Math.max(0, land);
    const dx = 14 * ease.outCubic(rg(t, 14.52, 14.75)) * (1 - ease.inOutSine(rg(t, 15.0, 16.2))) - 16 * lean;
    const expr = t < 14.49 ? 'neutral' : 'surprised';
    const tilt = -0.05 + 0.13 * lean + 0.03 * Math.sin(t * 1.2);
    // Hoshi on the grass in front of her
    const hoX = MIO_B.x - 300, hoY = GROUND_B - 38;
    const hsq = 0.45 * pulse(t, 14.56, 0.02, 0.1) - 0.25 * Math.sin(rg(t, 14.6, 14.85) * Math.PI) + 0.25 * spring(t, 14.86, 10, 22) + 0.04 * Math.sin(t * 2.4);
    const ho = { x: hoX - 8 * ease.outCubic(rg(t, 14.58, 14.85)), y: hoY - 16 * Math.sin(rg(t, 14.6, 14.85) * Math.PI), s: 0.66, rot: 0.14 + 0.05 * Math.sin(t * 1.8), squash: hsq, glow: 0.35 + 0.15 * pulse(t, 14.56, 0.02, 0.5) };
    const cam = { x: A.lerp(1030, 1060, ease.inOutSine(rg(t, CUT_B, CUT_C))), y: A.lerp(560, 575, ease.inOutSine(rg(t, CUT_B, CUT_C))), zoom: A.lerp(1.0, 1.09, ease.inOutSine(rg(t, CUT_B, CUT_C))) + 0.035 * pulse(t, 14.53, 0.02, 0.4), rot: 0 };
    const sh = A.shake(t, 2.5, 5); cam.x += sh.dx; cam.y += sh.dy - 6 * pulse(t, 14.53, 0.02, 0.3);
    hillWorld(ctx, t, cam, ho);
    inCam(ctx, cam, 1, () => {
      // ground glow
      ctx.save(); ctx.translate(ho.x, GROUND_B - 6); ctx.scale(3, 0.5); E.glow(ctx, 0, 0, 140, P.warm, 0.5); ctx.restore();
      // Mio (scale around her feet for squash & stretch)
      ctx.save(); ctx.translate(MIO_B.x + dx, GROUND_B); ctx.rotate(rot); ctx.scale(sx, sy);
      const m = A.drawMio(ctx, { x: 0, y: dy / sy, s: MIO_B.s, face: -1, t, pose: 'crouch', expr, headTilt: tilt, look: { x: 0.55, y: 0.75 }, wind: 0.35,
        light: { x: (ho.x - MIO_B.x - dx) / sx, y: (ho.y - GROUND_B) / sy, color: P.star, strength: 1.0, radius: 520 } });
      ctx.restore();
      E.glow(ctx, ho.x, ho.y, 200, P.star, 0.25);
      A.drawHoshi(ctx, { x: ho.x, y: ho.y, s: ho.s, t, glow: ho.glow, expr: 'surprised', look: { x: 0.8, y: -0.9 }, rot: ho.rot, squash: ho.squash });
      // surprise marks
      const sa = pulse(t, 14.56, 0.03, 0.45);
      if (sa > 0) {
        const hx = MIO_B.x + dx - 30, hy = GROUND_B - 560 + dy; ctx.save(); ctx.strokeStyle = `rgba(255,248,220,${sa})`; ctx.lineWidth = 5; ctx.lineCap = 'round';
        const gr = 1 + 0.4 * ease.outBack(rg(t, 14.53, 14.7));
        for (const a of [-2.3, -1.85, -1.4]) { ctx.beginPath(); ctx.moveTo(hx + Math.cos(a) * 130 * gr, hy + Math.sin(a) * 110 * gr); ctx.lineTo(hx + Math.cos(a) * 175 * gr, hy + Math.sin(a) * 150 * gr); ctx.stroke(); }
        ctx.restore();
      }
    });
    frontGrass(ctx, t, cam, ho, 3);
  }

  // Cut C
  const HOLD_S = 0.56;
  function mioCTransform(t) {
    const dip = ease.inOutCubic(rg(t, 17.0, 17.48)) * (1 - ease.inOutCubic(rg(t, 17.62, 18.35)));
    const rise = ease.inOutSine(rg(t, 17.9, 18.8));
    return { x: MIO_B.x - 50 * dip + 10 * rise, y: GROUND_B + 38 * dip - 6 * rise, rot: -0.13 * dip + 0.01 * Math.sin(t * 1.3) };
  }
  // hold point of the crouch_cup pose in world coords (pelvis(-20,-54+br*.4) + (70,-16) + (1,-3))
  function holdPoint(t, T) {
    const br = Math.sin(t * 2.3); const lx = -(51) * MIO_B.s, ly = (-73 + br * 0.4) * MIO_B.s; // face -1 mirrors x
    const c = Math.cos(T.rot), s = Math.sin(T.rot); return { x: T.x + lx * c - ly * s, y: T.y + lx * s + ly * c };
  }
  function drawCutC(ctx, t) {
    const T = mioCTransform(t);
    const hp = holdPoint(t, T);
    const groundHo = { x: MIO_B.x - 230, y: GROUND_B - 36 };
    const lift = ease.inOutCubic(rg(t, 17.42, 17.6)); const held = t >= 17.6;
    const R = 70 * HOLD_S;
    const hoInCup = (p) => ({ x: p.x, y: p.y - R * 0.55 + 2 * Math.sin(t * 2.1) });
    const pIn = hoInCup(hp);
    let ho = { x: A.lerp(groundHo.x, pIn.x, lift), y: A.lerp(groundHo.y, pIn.y, lift) - Math.sin(lift * Math.PI) * 30, s: A.lerp(0.62, HOLD_S, lift), glow: 0.34, rot: A.lerp(0.12, -0.08, lift), squash: 0 };
    ho.squash = -0.3 * Math.sin(lift * Math.PI) + 0.35 * spring(t, 17.6, 8, 20) + 0.03 * Math.sin(t * 2.4);
    const expr = t < 18.7 ? 'surprised' : 'weak';
    const look = t < 18.7 ? { x: 0.5, y: -0.9 } : { x: 0.3, y: -0.5 };
    // camera: push in toward her face and the star
    const push = ease.inOutSine(rg(t, 17.7, 21.4));
    const cam = { x: A.lerp(1080, 1160, push), y: A.lerp(590, 610, push), zoom: A.lerp(1.28, 1.95, push), rot: 0 };
    const sh = A.shake(t, 2, 8); cam.x += sh.dx; cam.y += sh.dy;
    hillWorld(ctx, t, cam, ho);
    let heldHo = null;
    inCam(ctx, cam, 1, () => {
      ctx.save(); ctx.translate(groundHo.x, GROUND_B - 6); ctx.scale(3, 0.5); E.glow(ctx, 0, 0, 140, P.warm, 0.5 * (1 - lift)); ctx.restore();
      const tilt = -0.04 - 0.1 * ease.inOutSine(rg(t, 18.2, 19.2)) + 0.035 * Math.sin(t * 1.25);
      const light = { x: ho.x, y: ho.y, color: P.star, strength: 1.15, radius: 480 };
      const holding = held ? (c, p) => { const q = hoInCup(p); heldHo = q; E.glow(c, q.x, q.y, 110, P.star, 0.35); A.drawHoshi(c, { x: q.x, y: q.y, s: HOLD_S, t, glow: 0.34 + 0.12 * pulse(t, 17.6, 0.02, 0.8), expr, look, rot: -0.08 + 0.05 * Math.sin(t * 1.7), squash: ho.squash }); } : null;
      // draw Mio in world coords: we pass x/y and rotate via ctx around feet
      ctx.save(); ctx.translate(T.x, T.y); ctx.rotate(T.rot); ctx.translate(-T.x, -T.y);
      const m = A.drawMio(ctx, { x: T.x, y: T.y, s: MIO_B.s, face: -1, t, pose: 'crouch_cup', expr: 'worried', headTilt: tilt, look: { x: 0.45, y: 0.85 }, wind: 0.35, light: rotInv(light, T), holding });
      ctx.restore();
      if (!held) { E.glow(ctx, ho.x, ho.y, 180, P.star, 0.25); A.drawHoshi(ctx, { x: ho.x, y: ho.y, s: ho.s, t, glow: ho.glow, expr: 'surprised', look: { x: 0.6, y: -0.9 }, rot: ho.rot, squash: ho.squash }); }
      // scoop sparkle (17.6)
      const sp = rg(t, 17.6, 18.5);
      if (sp > 0 && sp < 1) {
        E.burst(ctx, t, { x: pIn.x, y: pIn.y, p: sp, r: 170, color: P.star, seed: 3, rays: 12, particles: 22 });
        E.sparkle(ctx, pIn.x + 20, pIn.y - 30, 70 * Math.sin(sp * Math.PI), '#fff6d0', 0.9 * (1 - sp), sp * 0.8);
      }
      if (held) E.sparkles(ctx, t, { x: pIn.x, y: pIn.y - 10, r: 70, count: 5, seed: 6, size: 0.6, alpha: 0.7 });
    });
    frontGrass(ctx, t, cam, ho, A.lerp(3, 4.5, push));
  }
  // light position in the rotated Mio frame (rotation around her feet)
  function rotInv(L, T) {
    const c = Math.cos(-T.rot), s = Math.sin(-T.rot); const dx = L.x - T.x, dy = L.y - T.y;
    return Object.assign({}, L, { x: T.x + dx * c - dy * s, y: T.y + dx * s + dy * c });
  }

  A.scene('s2_meet', {
    transitionIn: { type: 'fade', dur: 0.8 },
    draw(ctx, lt, t) {
      ctx.save();
      ctx.fillStyle = P.night0; ctx.fillRect(0, 0, W, H);
      if (t < CUT_B) drawCutA(ctx, t);
      else if (t < CUT_C) drawCutB(ctx, t);
      else drawCutC(ctx, t);
      ctx.restore();
    },
  });
})();
