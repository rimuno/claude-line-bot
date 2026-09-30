// ===== s6_constellation : 53.5–60  finale — Hoshi returns to the sky, a new constellation, title =====
// Shot list (one continuous crane move, no cuts — the finale should breathe):
//  A 53.5–55.3  low medium on Mio (hill, right), she follows the rising Hoshi with her eyes; camera tilts up & pulls
//               out following the light trail to the crown's gap. 55.3 arrival: burst, gap filled.
//  B 55.0       Mio anticipates (dip) → pops up into a wave (stretch), tears turn into a smile.
//  C 55.3–56.9  pull back to the full wide: warm town, sea, lighthouse, the huge sky.
//     55.5+0.25k the "waving Mio" constellation is drawn, star by star (SFX cues). Hand star waves with tiny Mio.
//  D 57.3       title 「星をひろった夜」 letter by letter; slow drift/pull-back continues until the harness fade.
(function () {
  const A = window.A; const W = A.W, H = A.H; const E = () => A.env;
  const S0 = 53.5;
  const HY_OFF = 20;                              // sky/sea horizon at y=800 (world)
  const MIO = { x: 1560, s: 0.62 };               // tiny Mio on the hill (world)
  const HILL = { x: 1580, y: 1125, s: 1.0 };
  const TOWN = { x: 760, y: 975, s: 0.78 };
  const CBOX = { x: 975, y: 172, w: 540, h: 505 }; // constellation box (sky world)
  const CUE0 = 55.5, CUE_DT = 0.25;
  const ARRIVE = 55.3, LAUNCH = 53.0;
  const TITLE_T = 57.3; const TITLE = '星をひろった夜';
  const TITLE_C = { x: 500, y: 440 };

  // ---------------------------------------------------------------- camera
  // world == final frame at zoom 1. Parallax: layer factor f blends between identity and the full camera.
  function camAt(t) {
    // keyframes: (t, x, y, zoom)
    const k1 = A.ease.inOutSine(A.range(t, 53.3, ARRIVE + 0.1));
    const k2 = A.ease.inOutCubic(A.range(t, 55.1, 57.0));
    let x = A.lerp(1540, 1160, k1), y = A.lerp(625, 470, k1), z = A.lerp(2.2, 1.25, k1);
    x = A.lerp(x, 960, k2); y = A.lerp(y, 540, k2); z = A.lerp(z, 1.0, k2);
    // final slow drift back / up
    const k3 = A.ease.inOutSine(A.range(t, 56.4, 60.4));
    z *= 1 - 0.035 * k3; y -= 14 * k3;
    // subtle handheld float
    const sh = A.shake(t, 2.2 * (1 - 0.6 * k2), 6);
    return { x: x + sh.dx, y: y + sh.dy, zoom: z };
  }
  const layerCam = (c, f) => ({ x: W / 2 + (c.x - W / 2) * f, y: H / 2 + (c.y - H / 2) * f, zoom: 1 + (c.zoom - 1) * f });
  const toScreen = (c, p) => ({ x: W / 2 + (p.x - c.x) * c.zoom, y: H / 2 + (p.y - c.y) * c.zoom });

  // ---------------------------------------------------------------- Hoshi's rise
  const F_SKY = 0.6;
  const HSTART = { x: 1550, y: 560 }, HCTRL = { x: 1480, y: 120 };
  const hU = (t) => A.ease.inOutSine(A.range(t, LAUNCH, ARRIVE));
  function hoshiWorld(u, gap) {
    const a = 1 - u; return { x: a * a * HSTART.x + 2 * a * u * HCTRL.x + u * u * gap.x, y: a * a * HSTART.y + 2 * a * u * HCTRL.y + u * u * gap.y };
  }
  // screen position: starts in the foreground's space, ends in the sky's space (parallax-consistent both ends)
  function hoshiScreen(u, cam, gap) {
    const p = hoshiWorld(u, gap); const a = toScreen(cam, p), b = toScreen(layerCam(cam, F_SKY), p); const w = A.smooth(u * 1.1);
    return { x: A.lerp(a.x, b.x, w), y: A.lerp(a.y, b.y, w) };
  }

  // ---------------------------------------------------------------- constellation
  function constellationPts(t) {
    const C = E().fitConstellation(E().MIO_CONSTELLATION, CBOX.x, CBOX.y, CBOX.w, CBOX.h);
    const pts = C.points.map((p) => Object.assign({}, p));
    const hand = E().MIO_CONSTELLATION.hand;
    // the hand star waves in sync with tiny Mio (her wave: sin(t*9))
    const wv = A.range(t, CUE0 + 7 * CUE_DT, CUE0 + 7 * CUE_DT + 0.3);
    const wx = Math.cos(waveX(t)); pts[hand].x += 10 * (wx - 0.55) * wv; pts[hand].y += 3 * (wx - 0.55) * wv;
    return { points: pts, lines: C.lines };
  }
  function linesP(t) {
    let p = 0; const n = 16;
    for (let k = 0; k < 8; k++) p += (2 / n) * A.ease.inOutSine(A.range(t, CUE0 + k * CUE_DT - 0.1, CUE0 + k * CUE_DT + 0.1));
    return p;
  }
  // the end star of the first line in each cue pops exactly on the cue
  function cueStars(k, lines) { return [lines[2 * k][1], lines[2 * k + 1][1]]; }

  function drawConstellation(ctx, t) {
    const C = constellationPts(t); const p = linesP(t); if (t < CUE0 - 0.15) return C;
    const done = A.range(t, CUE0 + 7 * CUE_DT + 0.1, TITLE_T + 0.2);
    const breathe = 1 + 0.12 * Math.sin(t * 1.6) * done;
    const flash = Math.exp(-Math.max(0, t - TITLE_T) * 2.2) * A.range(t, TITLE_T - 0.08, TITLE_T);
    E().constellation(ctx, t, { points: C.points, lines: C.lines, p: p >= 0.999 ? 1 : p, alpha: 1, size: 1.25 * breathe, color: '#cfe0ff', starColor: '#fff1c8' });
    ctx.save();
    // soft figure glow once complete ("she" lights up)
    if (done > 0) {
      const cx = CBOX.x + CBOX.w * 0.46, cy = CBOX.y + CBOX.h * 0.46;
      ctx.translate(cx, cy); ctx.scale(0.62, 1); A.glow(ctx, 0, 0, CBOX.h * 0.62, '#8fa8ff', (0.1 + 0.18 * flash) * done);
    }
    ctx.restore();
    // cue glints
    for (let k = 0; k < 8; k++) {
      const c = CUE0 + k * CUE_DT; const d = t - c; if (d < -0.02 || d > 0.6) continue;
      const e = Math.exp(-Math.max(0, d) * 6) * A.range(d, -0.02, 0.02);
      for (const [j, idx] of cueStars(k, C.lines).entries()) {
        const q = C.points[idx]; const ee = j ? Math.exp(-Math.max(0, d - 0.1) * 6) * A.range(d, 0.08, 0.12) : e;
        E().sparkle(ctx, q.x, q.y, 70 * ee + 10, '#fff4d6', ee, 0.2 + k);
        A.glow(ctx, q.x, q.y, 60 * ee, '#bcd0ff', 0.5 * ee);
      }
    }
    // the waving hand: extra twinkle in sync with Mio's wave
    const hand = E().MIO_CONSTELLATION.hand; const hp = C.points[hand];
    const hk = A.range(t, CUE0 + 7 * CUE_DT, CUE0 + 7 * CUE_DT + 0.25);
    if (hk > 0) {
      const tw = 0.5 + 0.5 * Math.cos(2 * waveX(t));
      E().sparkle(ctx, hp.x, hp.y, (38 + 34 * tw) * hk, '#fff2c0', 0.85 * hk, Math.sin(t * 4.5) * 0.3);
      A.glow(ctx, hp.x, hp.y, (50 + 30 * tw) * hk, '#ffe28a', 0.35 * hk);
      // a few motes shaken off the waving hand
      for (let i = 0; i < 6; i++) {
        const ph = (t * 0.9 + i / 6) % 1; const a = A.hash(i * 7.7 + Math.floor(t * 0.9 + i / 6)) * Math.PI * 2;
        const x = hp.x + Math.cos(a) * 30 * ph, y = hp.y + Math.sin(a) * 20 * ph + ph * 26;
        E().sparkle(ctx, x, y, 12 * Math.sin(ph * Math.PI), '#fff2c0', hk * (1 - ph), a);
      }
    }
    if (flash > 0) for (const q of C.points) A.glow(ctx, q.x, q.y, 50, '#fff0c8', 0.35 * flash);
    return C;
  }

  // ---------------------------------------------------------------- title
  function drawTitle(ctx, t) {
    const lt = t - TITLE_T; if (lt < -0.05) return;
    const chars = [...TITLE]; const n = chars.length; const fs = 120; const sp = 8;
    ctx.save();
    ctx.font = "700 120px 'Kaisei'"; ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
    const widths = chars.map((c) => ctx.measureText(c).width); const total = widths.reduce((a, b) => a + b, 0) + sp * (n - 1);
    let x = TITLE_C.x - total / 2; const y = TITLE_C.y;
    // backdrop: faint warm haze behind the title for readability over the milky way
    const hz = A.smooth(A.range(lt, 0, 0.9));
    if (hz > 0) {
      ctx.save(); ctx.translate(TITLE_C.x, y); ctx.scale(total / 520, 0.34);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 520); g.addColorStop(0, `rgba(10,8,40,${0.42 * hz})`); g.addColorStop(1, 'rgba(10,8,40,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 520, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }
    const cx = [];
    for (let i = 0; i < n; i++) { cx.push(x + widths[i] / 2); x += widths[i] + sp; }
    for (let i = 0; i < n; i++) {
      const a0 = lt - i * 0.11; const k = A.clamp(a0 / 0.7); if (k <= 0) continue;
      const e = A.ease.outCubic(k); const blur = (1 - e) * 14; const dy = (1 - e) * 26; const sc = 1 + (1 - e) * 0.18;
      const bob = Math.sin(t * 1.4 + i * 0.7) * 1.5 * e;
      ctx.save(); ctx.translate(cx[i], y + dy + bob); ctx.scale(sc, sc);
      if (blur > 0.4) ctx.filter = `blur(${blur.toFixed(1)}px)`;
      // glow pass
      ctx.globalAlpha = e * 0.9; ctx.shadowColor = 'rgba(255,190,90,0.95)'; ctx.shadowBlur = 38; ctx.fillStyle = '#ffe6a8'; ctx.fillText(chars[i], 0, 0);
      ctx.shadowBlur = 0; ctx.filter = 'none';
      // body with vertical gradient
      const g = ctx.createLinearGradient(0, -fs / 2, 0, fs / 2); g.addColorStop(0, '#fffdf2'); g.addColorStop(0.55, '#ffeec0'); g.addColorStop(1, '#ffc970');
      ctx.globalAlpha = e * e; ctx.lineJoin = 'round'; ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(40,24,70,0.55)'; ctx.strokeText(chars[i], 0, 0);
      ctx.fillStyle = g; ctx.fillText(chars[i], 0, 0);
      ctx.restore();
      // birth sparkle for each letter
      const bs = A.range(a0, 0.05, 0.6); if (bs > 0 && bs < 1) E().sparkle(ctx, cx[i] + widths[i] * 0.3, y - fs * 0.38, 46 * Math.sin(bs * Math.PI), '#fff4d0', Math.sin(bs * Math.PI), i);
    }
    // light sweep across the letters
    const sw = A.range(lt, 1.05, 1.85);
    if (sw > 0 && sw < 1) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const sx = TITLE_C.x - total / 2 - 80 + (total + 160) * A.ease.inOutSine(sw);
      ctx.beginPath(); ctx.rect(TITLE_C.x - total / 2 - 20, y - fs * 0.7, total + 40, fs * 1.4); ctx.clip();
      A.glow(ctx, sx, y, 110, '#fff2c8', 0.35 * Math.sin(sw * Math.PI));
      ctx.restore();
    }
    // subtitle line + romaji
    const sub = A.smooth(A.range(lt, 0.95, 1.7));
    if (sub > 0) {
      const ly = y + 94; const hw = (total / 2 - 60) * A.ease.outCubic(sub);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const lg = ctx.createLinearGradient(TITLE_C.x - hw, 0, TITLE_C.x + hw, 0); lg.addColorStop(0, 'rgba(255,220,150,0)'); lg.addColorStop(0.5, `rgba(255,226,160,${0.7 * sub})`); lg.addColorStop(1, 'rgba(255,220,150,0)');
      ctx.fillStyle = lg; ctx.fillRect(TITLE_C.x - hw, ly - 1, hw * 2, 2); ctx.restore();
      ctx.save(); ctx.globalAlpha = sub; ctx.font = "700 34px 'Kaisei'"; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      if ('letterSpacing' in ctx) ctx.letterSpacing = '10px';
      ctx.shadowColor = 'rgba(255,190,110,0.8)'; ctx.shadowBlur = 16; ctx.fillStyle = '#f3e6ff';
      ctx.fillText('Hoshi wo Hirotta Yoru', TITLE_C.x, ly + 40 + (1 - sub) * 10); ctx.restore();
    }
    // lingering sparkles around the title
    const sa = A.smooth(A.range(lt, 0.4, 1.4));
    if (sa > 0) E().sparkles(ctx, t, { x: TITLE_C.x, y: y - 10, r: total * 0.55, count: 16, seed: 61, alpha: 0.8 * sa, size: 0.9, color: '#fff0c0' });
    ctx.restore();
  }

  // ---------------------------------------------------------------- Mio
  // The library's wave swings the hand all the way in over the head (reads as head-scratching at this size).
  // Work-around: feed drawMio a remapped time whose sin(9t') stays in the outward half of the swing.
  // t' = C + phi/9 with C a multiple of 2π/9 (so sin(9t') = sin(phi)); other t-driven details only jiggle ±0.2 s.
  const WAVE_W = 4.5, WAVE_A = 1.65;
  const waveX = (t) => WAVE_A * Math.sin(WAVE_W * (t - 55.0));          // arm phase (0 = most outward)
  const WAVE_C = (() => { // pick a base time whose ±0.25 s neighbourhood has eyes open and no dialogue
    const step = (2 * Math.PI) / 9;
    for (let k = Math.round(56 / step); k < Math.round(56 / step) + 40; k++) {
      const c = k * step; let ok = true;
      for (let d = -0.3; d <= 0.3; d += 0.01) if (A.blink(c + d, 1) < 1 || A.isSpeaking('mio', c + d)) { ok = false; break; }
      if (ok) return c;
    }
    return Math.round(56 / step) * step;
  })();
  const waveT = (t) => WAVE_C + (-Math.PI / 2 + waveX(t)) / 9;
  function mioState(t) {
    const waveOn = t >= 55.0;
    // anticipation dip 54.72–55.0, then stretch on the pop, settle with overshoot
    const dip = Math.sin(Math.PI * A.range(t, 54.7, 55.0));
    const pop = A.range(t, 55.0, 55.45); const stretch = waveOn ? Math.sin(Math.PI * pop) * (1 - pop) * 1.6 : 0;
    const sy = 1 - 0.06 * dip + 0.07 * stretch, sx = 1 + 0.04 * dip - 0.035 * stretch;
    const hop = waveOn ? -12 * Math.sin(Math.PI * A.range(t, 55.0, 55.32)) : 0;
    // gaze: follows Hoshi up and to the left (face=-1: +x looks screen-left)
    const u = hU(t);
    const look = { x: A.lerp(0.1, 0.8, A.smooth(u)), y: A.lerp(-1.1, -1.5, A.smooth(u)) };
    // positive headTilt (mirrored) = chin up
    const tilt = 0.12 + 0.05 * A.smooth(u) + 0.03 * Math.sin(t * 1.1);
    const expr = t < 54.9 ? 'teary_smile' : 'smile';
    // body sway that follows the waving arm (follow-through)
    const sway = waveOn ? 0.025 * Math.cos(waveX(t)) * A.range(t, 55.0, 55.4) : 0.01 * Math.sin(t * 1.3);
    return { pose: waveOn ? 'wave' : 'stand', sx, sy, hop, look, tilt, expr, sway, tt: waveOn ? waveT(t) : t };
  }

  A.scene('s6_constellation', {
    transitionIn: { type: 'fade', dur: 0.5 },
    draw(ctx, lt, t) {
      const env = E(); ctx.save();
      const cam = camAt(t);
      const sky = { offsetY: HY_OFF, warmGlow: 1, gapPulse: 0, gapFilled: 0, starBright: 1 };
      const gap = env.GAP(sky);
      const u = hU(t);
      sky.gapPulse = A.smooth(A.range(t, 54.2, 55.0)) * (1 - A.range(t, ARRIVE, ARRIVE + 0.15));
      sky.gapFilled = A.smooth(A.range(t, ARRIVE - 0.02, ARRIVE + 0.12));

      // ---------- sky layer (slowest)
      const cS = layerCam(cam, F_SKY);
      A.camera(ctx, cS, () => {
        env.sky(ctx, t, sky);
        env.clouds(ctx, t, { offsetY: HY_OFF, alpha: 0.75 });
        // after arrival: the filled crown shimmers
        if (t > ARRIVE) {
          const k = A.range(t, ARRIVE, ARRIVE + 1.2);
          env.burst(ctx, t, { x: gap.x, y: gap.y, p: A.range(t, ARRIVE, ARRIVE + 1.1), r: 260, seed: 6, rays: 16, particles: 36 });
          const tw = 0.8 + 0.2 * Math.sin(t * 5.3);
          A.glow(ctx, gap.x, gap.y, 90 * tw, '#ffe28a', 0.35 + 0.4 * (1 - k));
          env.sparkle(ctx, gap.x, gap.y, 48 * tw, '#fff6d8', 0.9, 0.1 * Math.sin(t));
          // light "passes" from the gap to where the new constellation will be born
          const ls = A.range(t, ARRIVE + 0.02, CUE0 + 0.02);
          if (ls > 0 && ls < 1) {
            const C = constellationPts(t); const hd = C.points[0];
            env.lightStream(ctx, t, { from: gap, to: hd, p: ls, color: '#fff0c0', width: 0.7, seed: 3, count: 14, arc: -0.25, trail: 0.5 });
          }
        }
        drawConstellation(ctx, t);
      });

      // ---------- sea + mountains
      A.camera(ctx, layerCam(cam, 0.72), () => {
        env.sea(ctx, t, { offsetY: HY_OFF });
        env.mountains(ctx, t, { offsetY: HY_OFF });
      });
      // ---------- town (warm, fully lit)
      A.camera(ctx, layerCam(cam, 0.84), () => {
        env.town(ctx, t, { x: TOWN.x, y: TOWN.y, s: TOWN.s, lit: 1, lighthouse: 1 });
        // warm air above the town
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.translate(TOWN.x, TOWN.y - 120); ctx.scale(2.4, 0.6);
        A.glow(ctx, 0, 0, 380, '#ff9a4a', 0.12 + 0.02 * Math.sin(t * 2)); ctx.restore();
        env.fireflies(ctx, t, { cx: 700, cy: 820, rx: 520, ry: 90, count: 16, seed: 9, alpha: 0.7, size: 0.7 });
      });

      // ---------- hill + Mio
      let mioInfo = null;
      A.camera(ctx, cam, () => {
        // cool haze between the town and the hill (depth)
        const hz = ctx.createLinearGradient(0, 700, 0, 1000); hz.addColorStop(0, 'rgba(60,80,140,0)'); hz.addColorStop(1, 'rgba(40,50,110,0.18)');
        ctx.fillStyle = hz; ctx.fillRect(-600, 700, W + 1200, 400);
        const hill = env.hill(ctx, t, { x: HILL.x, y: HILL.y, s: HILL.s, wind: 0.55, seed: 2 });
        const fy = hill.surfaceY(MIO.x) + 6;
        const st = mioState(t);
        // contact shadow
        ctx.save(); ctx.fillStyle = 'rgba(5,10,30,0.45)'; ctx.beginPath(); ctx.ellipse(MIO.x, fy, 38 * MIO.s, 7 * MIO.s, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
        ctx.save(); ctx.translate(MIO.x, fy + st.hop * MIO.s); ctx.rotate(st.sway); ctx.scale(st.sx, st.sy);
        const hs = hoshiScreen(u, cam, gap);
        // Hoshi's light on Mio while it's still near; afterwards the warm town light from below-left
        const inv = { x: cam.x + (hs.x - W / 2) / cam.zoom, y: cam.y + (hs.y - H / 2) / cam.zoom };
        const near = 1 - A.range(t, 53.5, 54.6);
        const light = near > 0.02 ? { x: (inv.x - MIO.x) / st.sx, y: (inv.y - fy) / st.sy, color: A.PAL.star, strength: 0.9 * near, radius: 700 }
          : { x: -520, y: -60, color: A.PAL.warm, strength: 0.45, radius: 900 };
        mioInfo = A.drawMio(ctx, { x: 0, y: 0, s: MIO.s, t: st.tt, mouth: { v: 'closed', open: 0 }, pose: st.pose, expr: st.expr, face: -1, look: st.look, headTilt: st.tilt, hairpin: 1, wind: 0.45, light });
        ctx.restore();
        // hairpin twinkle (answers the constellation)
        if (mioInfo) {
          const hp = { x: MIO.x + (mioInfo.head.x) * st.sx, y: fy + st.hop * MIO.s + mioInfo.head.y * st.sy };
          const tw = 0.5 + 0.5 * Math.sin(t * 4.3);
          env.sparkles(ctx, t, { x: hp.x + 6, y: hp.y + 34, r: 26, count: 4, seed: 12, alpha: 0.8, size: 0.6 });
          A.glow(ctx, hp.x + 8, hp.y + 34, 30 + 10 * tw, '#ffe28a', 0.18);
        }
        env.fireflies(ctx, t, { cx: 1500, cy: 800, rx: 380, ry: 120, count: 12, seed: 4, alpha: 0.85, size: 0.8 });
      });

      // ---------- foreground grass (closer than the hill: parallax + darker = depth of field)
      A.camera(ctx, layerCam(cam, 1.18), () => {
        env.grass(ctx, t, { x0: 1180, x1: 2300, y: 1130, h: 150, density: 0.6, color: '#081626', wind: 0.6, seed: 5, ground: '#050c1c' });
        env.grass(ctx, t, { x0: -300, x1: 520, y: 1140, h: 120, density: 0.5, color: '#081626', wind: 0.6, seed: 8, ground: '#050c1c' });
      });

      // ---------- Hoshi's rise (screen space)
      if (u < 1 && t < ARRIVE + 0.05) {
        const hd = hoshiScreen(u, cam, gap);
        // lingering curved trail: past positions under the current camera
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
        const N = 22; let prev = null;
        for (let i = N; i >= 0; i--) {
          const tp = t - i * 0.045; const up = hU(Math.max(LAUNCH, tp)); const q = hoshiScreen(up, cam, gap);
          if (prev) {
            const k = 1 - i / N; const wob = Math.sin(i * 0.9 - t * 8) * 3 * (1 - k);
            ctx.strokeStyle = `rgba(255,214,130,${0.16 * k})`; ctx.lineWidth = 6 + 26 * k; ctx.beginPath(); ctx.moveTo(prev.x + wob, prev.y); ctx.lineTo(q.x, q.y); ctx.stroke();
            ctx.strokeStyle = `rgba(255,248,220,${0.65 * k * k})`; ctx.lineWidth = 1.5 + 5 * k; ctx.beginPath(); ctx.moveTo(prev.x + wob, prev.y); ctx.lineTo(q.x, q.y); ctx.stroke();
          }
          prev = q;
          if (i % 3 === 1) env.sparkle(ctx, q.x + A.noise(i + t * 3, 2) * 14, q.y + i * 1.5, 16 * (1 - i / N), '#fff2c0', 0.8 * (1 - i / N), i);
        }
        ctx.restore();
        const q2 = hoshiScreen(Math.max(0, u - 0.02), cam, gap); const ang = Math.atan2(hd.y - q2.y, hd.x - q2.x);
        const zS = layerCam(cam, F_SKY).zoom; const size = A.lerp(cam.zoom, zS, u) * (1 - 0.45 * u);
        env.shootingStar(ctx, t, { x: hd.x, y: hd.y, angle: ang, len: 120 * size, width: 0.9 * size, alpha: 1 });
        // still recognisably Hoshi at the start of the shot
        const hk = 1 - A.range(t, 53.6, 54.3);
        if (hk > 0) { ctx.save(); ctx.globalAlpha = hk; A.drawHoshi(ctx, { x: hd.x, y: hd.y, s: 0.22 * size, t, expr: 'joy', glow: 1.3 }); ctx.restore(); }
      }

      // ---------- title
      drawTitle(ctx, t);
      ctx.restore();
    },
  });
})();
