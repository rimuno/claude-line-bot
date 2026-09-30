// ===== characters.js : キャラクター（ミオ・ホシ・おじいさん・男の子） =====
// すべて Canvas 2D の手続き描画。時間 t（全体時刻）に対して決定的。
// API: A.drawMio / A.drawHoshi / A.drawGrandpa / A.drawKid（詳細は各関数の上のコメント）
(function () {
  const A = window.A; const P = A.PAL; const TAU = Math.PI * 2; const PI = Math.PI;
  const sin = Math.sin, cos = Math.cos, hyp = Math.hypot;

  // ---------------------------------------------------------------- color utils
  const h2r = (h) => { let s = h.slice(1); if (s.length === 3) s = s.split('').map((c) => c + c).join(''); const n = parseInt(s, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const r2h = (r) => '#' + r.map((v) => Math.round(A.clamp(v, 0, 255)).toString(16).padStart(2, '0')).join('');
  const CC = new Map();
  const memo = (k, f) => { let v = CC.get(k); if (v === undefined) { v = f(); if (CC.size > 5000) CC.clear(); CC.set(k, v); } return v; };
  const mix = (a, b, k) => { k = Math.round(A.clamp(k) * 100) / 100; return memo(a + b + k, () => { const x = h2r(a), y = h2r(b); return r2h(x.map((v, i) => v + (y[i] - v) * k)); }); };
  const mul = (a, b) => memo(a + '*' + b, () => { const x = h2r(a), y = h2r(b); return r2h(x.map((v, i) => (v * y[i]) / 255)); });
  const SHT = '#9f98d8';                       // 夜の影（寒色の乗算）
  const shd = (c) => mul(c, SHT);
  const rgba = (c, a) => { const x = h2r(c); return `rgba(${x[0]},${x[1]},${x[2]},${A.clamp(a)})`; };
  const MOONRIM = '#b9c6ff';

  // ---------------------------------------------------------------- draw state / lighting
  let S = null;
  // Mo = 呼び出し側（外側）の変換行列。アンカー・光源座標はこの座標系。
  function begin(ctx, o, lw, Mo) {
    const M = Mo; const Mi = ctx.getTransform();
    const ds = Math.sqrt(Math.abs(Mi.a * Mi.d - Mi.b * Mi.c)) || 1; const lk = Math.pow(ds, -0.42);
    S = { M0: M, M0i: M.inverse(), lw: lw * lk, lk, key: { x: 0.55, y: -0.83 }, light: null, moon: o.moonRim ?? 1 };
    if (o.light && (o.light.strength ?? 1) > 0) S.light = { p: M.transformPoint(new DOMPoint(o.light.x, o.light.y)), color: o.light.color || P.star, str: o.light.strength ?? 1, r: o.light.radius };
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  }
  const shift = (dx, dy) => new DOMMatrix([1, 0, 0, 1, dx, dy]);
  function localKey(Ci) {
    const M = S.M0; const kx = M.a * S.key.x + M.c * S.key.y, ky = M.b * S.key.x + M.d * S.key.y;
    let lx = Ci.a * kx + Ci.c * ky, ly = Ci.b * kx + Ci.d * ky; const n = hyp(lx, ly) || 1; return { x: lx / n, y: ly / n };
  }
  // 塗り（ベタ）→ セル影（寒色）→ 月のリム → 光源のリム＋照り返し → 線画
  // o: {sh, sd(影のずれ量), moon(月リムα), cx,cy(パーツ中心: 光源用), fall, lw(0で線なし), extra(ctx)}
  function paint(ctx, path, base, o = {}) {
    ctx.fillStyle = base; ctx.fill(path);
    const Ci = ctx.getTransform().inverse();
    ctx.save(); ctx.clip(path);
    const k = localKey(Ci);
    const sd = o.sd ?? 5;
    if (sd > 0) { const p = new Path2D(path); p.addPath(path, shift(k.x * sd, k.y * sd)); ctx.fillStyle = o.sh || shd(base); ctx.fill(p, 'evenodd'); }
    if (o.extra) o.extra(ctx, k);
    const mr = (o.moon ?? ((o.sd ?? 5) >= 4 ? 0.22 : 0)) * S.moon;
    if (mr > 0) { const rw = o.mw ?? 1.8; const p = new Path2D(path); p.addPath(path, shift(-k.x * rw, -k.y * rw)); ctx.fillStyle = rgba(MOONRIM, mr); ctx.fill(p, 'evenodd'); }
    if (S.light && o.cx !== undefined) {
      const lp = Ci.transformPoint(S.light.p);
      let dx = lp.x - o.cx, dy = lp.y - o.cy; const d = hyp(dx, dy) || 1; const fall = o.fall || S.light.r || 360;
      const st = S.light.str * A.clamp(1.15 - d / fall);
      if (st > 0.01) {
        const g = ctx.createRadialGradient(lp.x, lp.y, 0, lp.x, lp.y, fall * 0.8);
        g.addColorStop(0, rgba(S.light.color, (o.wash ?? 0.75) * st)); g.addColorStop(1, rgba(S.light.color, 0));
        ctx.globalCompositeOperation = 'soft-light'; ctx.fillStyle = g; ctx.fillRect(lp.x - fall, lp.y - fall, fall * 2, fall * 2);
        ctx.globalCompositeOperation = 'source-over';
        dx /= d; dy /= d; const rw = (o.rimW ?? 3.2) * (0.5 + 0.6 * st);
        const p = new Path2D(path); p.addPath(path, shift(-dx * rw, -dy * rw));
        ctx.fillStyle = rgba(mix(S.light.color, '#ffffff', 0.35), Math.min(1, st * 1.1)); ctx.fill(p, 'evenodd');
      }
    }
    ctx.restore();
    if (o.lw !== 0) { ctx.lineWidth = o.lw || S.lw; ctx.strokeStyle = o.ink || P.ink; ctx.stroke(path); }
  }
  function toOuter(ctx, x, y) { const d = ctx.getTransform().transformPoint(new DOMPoint(x, y)); const q = S.M0i.transformPoint(d); return { x: q.x, y: q.y }; }

  // ---------------------------------------------------------------- geometry
  function capsule(a, b, ra, rb, p = new Path2D()) {
    const dx = b.x - a.x, dy = b.y - a.y, d = hyp(dx, dy);
    if (d < Math.abs(ra - rb) + 0.01) { p.moveTo(a.x + Math.max(ra, rb), a.y); p.arc(a.x, a.y, Math.max(ra, rb), 0, TAU); return p; }
    const th = Math.atan2(dy, dx), q = PI / 2 - Math.asin((ra - rb) / d);
    p.moveTo(a.x + ra * cos(th + q), a.y + ra * sin(th + q));
    p.arc(a.x, a.y, ra, th + q, th + TAU - q); p.arc(b.x, b.y, rb, th - q, th + q); p.closePath(); return p;
  }
  function ellipseP(x, y, rx, ry, rot = 0) { const p = new Path2D(); p.ellipse(x, y, rx, ry, rot, 0, TAU); return p; }
  function ik(a, b, L1, L2, bend) {
    let dx = b.x - a.x, dy = b.y - a.y; let d = hyp(dx, dy); const dm = L1 + L2 - 0.5;
    if (d > dm) { const k = dm / d; dx *= k; dy *= k; d = dm; }
    d = Math.max(d, Math.abs(L1 - L2) + 1);
    const ang = Math.atan2(dy, dx); const ca = A.clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1); const a1 = Math.acos(ca);
    return { e: { x: a.x + L1 * cos(ang + bend * a1), y: a.y + L1 * sin(ang + bend * a1) }, w: { x: a.x + dx, y: a.y + dy } };
  }
  const rot = (p, a) => ({ x: p.x * cos(a) - p.y * sin(a), y: p.x * sin(a) + p.y * cos(a) });
  const add = (a, b) => ({ x: a.x + b.x, y: a.y + b.y });
  const lerpP = (a, b, k) => ({ x: A.lerp(a.x, b.x, k), y: A.lerp(a.y, b.y, k) });
  // 角の丸い星形（arms: 各頂点の角度ずれ・半径倍率）
  function starPath(R, ri, rOut, rIn, tips, p = new Path2D()) {
    const v = [];
    for (let i = 0; i < 5; i++) {
      const tp = tips ? tips[i] : { da: 0, k: 1 };
      const a = -PI / 2 + (i * TAU) / 5 + tp.da; v.push({ x: cos(a) * R * tp.k, y: sin(a) * R * tp.k, r: rOut });
      const b = -PI / 2 + (i * TAU) / 5 + PI / 5; v.push({ x: cos(b) * ri, y: sin(b) * ri, r: rIn });
    }
    const m = (i) => { const a = v[(i + 10) % 10], b = v[(i + 11) % 10]; return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }; };
    const s0 = m(-1); p.moveTo(s0.x, s0.y);
    for (let i = 0; i < 10; i++) { const n = m(i); p.arcTo(v[i].x, v[i].y, n.x, n.y, v[i].r); }
    p.closePath(); return p;
  }
  function sparkle(ctx, x, y, r, a, col = '#ffffff') {
    if (a <= 0.01 || r <= 0) return;
    ctx.save(); ctx.globalAlpha *= A.clamp(a); ctx.fillStyle = col; ctx.beginPath();
    ctx.moveTo(x, y - r); ctx.quadraticCurveTo(x, y, x + r * 0.8, y); ctx.quadraticCurveTo(x, y, x, y + r);
    ctx.quadraticCurveTo(x, y, x - r * 0.8, y); ctx.quadraticCurveTo(x, y, x, y - r); ctx.fill(); ctx.restore();
  }

  // ================================================================ MIO
  const C = {
    skin: P.mioSkin, hair: P.mioHair, dress: P.mioDress, card: P.mioCardigan, shoe: P.mioShoe, cheek: P.mioCheek,
    sock: '#f7f5fb', sole: '#fbf6ee', collar: '#ffffff', ribbon: '#e2505a',
    hairHi: '#5a64ad', irisTop: '#191a4a', irisMid: '#2c3d92', irisBot: '#74c8f4', mouthIn: '#6b2238', tongue: '#ef7d8a',
  };
  const MEX = {
    neutral: { open: 1, lower: 0.05, bi: 0, bo: 0, pupil: 1, mouth: 'line', blush: 0.55, tilt: 0 },
    surprised: { open: 1.14, lower: 0, bi: 7, bo: 5, pupil: 0.72, mouth: 'o', blush: 0.5, tilt: 0 },
    worried: { open: 0.95, lower: 0.12, bi: 5, bo: -2, pupil: 1, mouth: 'wavy', blush: 0.5, tilt: -0.25 },
    smile: { open: 0.92, lower: 0.5, bi: 2, bo: 1, pupil: 1, mouth: 'smile', blush: 0.85, tilt: 0 },
    determined: { open: 0.9, lower: 0.12, bi: -4, bo: 2.5, pupil: 1, mouth: 'firm', blush: 0.5, tilt: 0.35 },
    teary_smile: { open: 0.86, lower: 0.46, bi: 4, bo: -1, pupil: 1.06, mouth: 'smile', blush: 1, tilt: -0.15, gloss: 1, tear: 1 },
    sad: { open: 0.74, lower: 0.12, bi: 5, bo: -3, pupil: 1, mouth: 'frown', blush: 0.4, tilt: -0.3, gloss: 0.5 },
  };
  const ARM1 = 46, ARM2 = 42, LEG1 = 76, LEG2 = 74;

  // 走りのキーフレーム（u: 0..1）→ [足首x, 足首y, つま先角]
  const RUNK = [[0, 30, -12, -0.25], [0.22, 2, -10, 0], [0.45, -34, -15, 0.55], [0.62, -34, -64, 1.05], [0.8, 4, -60, 0.45], [0.92, 30, -32, -0.05]];
  function runKey(u) {
    const n = RUNK.length; let i = n - 1; for (let j = 0; j < n; j++) if (RUNK[j][0] <= u) i = j;
    const k0 = RUNK[(i - 1 + n) % n], k1 = RUNK[i], k2 = RUNK[(i + 1) % n], k3 = RUNK[(i + 2) % n];
    const u1 = k1[0], u2 = i + 1 < n ? k2[0] : 1; const f = (u - u1) / (u2 - u1);
    const cr = (a, b, c, d) => 0.5 * (2 * b + (c - a) * f + (2 * a - 5 * b + 4 * c - d) * f * f + (3 * b - a - 3 * c + d) * f * f * f);
    return [1, 2, 3].map((m) => cr(k0[m], k1[m], k2[m], k3[m]));
  }
  // ポーズ → 関節
  function mioPose(o, t) {
    const pose = o.pose || 'stand'; const br = sin(t * 2.3);
    const R = { pelvis: { x: 0, y: -160 + br * 0.5 }, lean: 0.02, head: 0, skirt: 'stand', ankles: [{ x: 16, y: -10 }, { x: -10, y: -10 }], foot: [0, 0],
      arms: null, hands: ['mitten', 'mitten'], cup: false, callArms: false, flutter: 0, breath: br };
    const hang = (sh, side) => ({ x: sh.x + (side ? 7 : -4), y: sh.y + 84 });
    switch (pose) {
      case 'crouch': case 'crouch_cup': {
        R.pelvis = { x: -20, y: -54 + br * 0.4 }; R.ankles = [{ x: 18, y: -15 }, { x: -2, y: -15 }]; R.foot = [0.3, 0.3];
        R.lean = pose === 'crouch' ? 0.42 : 0.5; R.head = pose === 'crouch' ? 0.22 : 0.16; R.skirt = 'crouch'; break;
      }
      case 'call': R.lean = 0.14; R.head = -0.16; R.callArms = true; R.ankles = [{ x: 20, y: -10 }, { x: -14, y: -10 }]; break;
      case 'reach_up': R.lean = -0.05; R.head = -0.12; R.ankles = [{ x: 14, y: -10 }, { x: -8, y: -10 }]; break;
      case 'wave': R.lean = 0.0; break;
      case 'run': {
        const ph = t * TAU * 1.5; R.lean = 0.26; R.skirt = 'run'; R.flutter = 1; R.head = -0.12;
        const u0 = (((t * 1.5) % 1) + 1) % 1;
        R.pelvis = { x: 0, y: -151 - 5 * cos(4 * PI * u0) };
        R.ankles = []; R.foot = [];
        for (let i = 0; i < 2; i++) { const k = runKey((u0 + i * 0.5) % 1); R.ankles.push({ x: k[0], y: k[1] }); R.foot.push(k[2]); }
        R.runPh = ph; break;
      }
    }
    return R;
  }

  function drawMioLegs(ctx, R, which, part = 'all') {
    const i = which; const far = i === 0;
    const hip = { x: R.pelvis.x + (far ? 8 : -8), y: R.pelvis.y - 2 };
    const L = ik(hip, R.ankles[i], LEG1, LEG2, -1); const k = L.e, a = L.w;
    const skin = far ? mix(C.skin, shd(C.skin), 0.3) : C.skin; const sock = far ? mix(C.sock, shd(C.sock), 0.3) : C.sock;
    const cx = (hip.x + a.x) / 2, cy = (hip.y + a.y) / 2;
    const th = capsule(hip, k, 10.5, 7.8), sh = capsule(k, a, 7.8, 5.8);
    if (part === 'upper') { paint(ctx, th, skin, { sd: 3.5, cx, cy }); return { hip, k, a }; }
    ctx.lineWidth = S.lw * 2; ctx.strokeStyle = P.ink; if (part === 'all') ctx.stroke(th); ctx.stroke(sh);
    if (part === 'all') paint(ctx, th, skin, { lw: 0, sd: 3.5, cx, cy });
    paint(ctx, sh, skin, { lw: 0, sd: 3.5, cx, cy });
    if (part === 'lower') { // knee cap (covers the joint seam)
      ctx.save(); ctx.clip(th); paint(ctx, ellipseP(k.x, k.y, 8.6, 8.6), skin, { lw: 0, sd: 2.5, cx, cy }); ctx.restore();
      ctx.strokeStyle = P.ink; ctx.lineWidth = S.lw; ctx.beginPath(); ctx.arc(k.x, k.y, 7.8, -2.4, 1.2); ctx.stroke();
    }
    const st = lerpP(a, k, 0.42);
    paint(ctx, capsule(st, a, 7.2, 6.5), sock, { sd: 3, lw: S.lw * 0.8, cx, cy });
    // shoe
    ctx.save(); ctx.translate(a.x, a.y); ctx.rotate(R.foot[i] || 0);
    const p = new Path2D();
    p.moveTo(-7, -5); p.bezierCurveTo(-12, -3, -12, 8, -7, 9.5); p.lineTo(19, 9.5);
    p.bezierCurveTo(28, 9.5, 28, 0, 21, -2.5); p.bezierCurveTo(15, -5, 9, -8, 2, -8.5); p.closePath();
    const sc = far ? mix(C.shoe, shd(C.shoe), 0.3) : C.shoe;
    paint(ctx, p, sc, { sd: 3, cx: 8, cy: 0, extra: (c) => {
      c.fillStyle = far ? mix(C.sole, shd(C.sole), 0.3) : C.sole; c.fillRect(-14, 5, 44, 6);
      c.beginPath(); c.ellipse(21, 1.5, 6, 7, 0, 0, TAU); c.fill();
      c.strokeStyle = rgba(P.ink, 0.6); c.lineWidth = 1; c.beginPath(); c.moveTo(-13, 5); c.lineTo(30, 5); c.stroke();
      c.beginPath(); c.moveTo(15, -4); c.lineTo(15, 5); c.stroke();
      c.strokeStyle = rgba('#ffffff', 0.9); c.lineWidth = 1.3; c.beginPath(); c.moveTo(3, -6); c.lineTo(7, -3); c.moveTo(7, -7); c.lineTo(10, -3.5); c.stroke();
    } });
    ctx.restore();
    return { hip, k, a };
  }

  // 腕：shoulder→wrist（IK）、袖＝カーディガン
  function drawMioArm(ctx, sh, wr, bend, hand, far, t, handRot) {
    const L = ik(sh, wr, ARM1, ARM2, bend); const e = L.e, w = L.w;
    const cc = far ? mix(C.card, shd(C.card), 0.35) : C.card; const skin = far ? mix(C.skin, shd(C.skin), 0.3) : C.skin;
    const cx = (sh.x + w.x) / 2, cy = (sh.y + w.y) / 2;
    const up = capsule(sh, e, 9, 7.4), fo = capsule(e, w, 7.4, 7);
    const dir = { x: (w.x - e.x) / ARM2, y: (w.y - e.y) / ARM2 }; const ang = Math.atan2(dir.y, dir.x) - PI / 2;
    // hand behind cuff? mitten is drawn after sleeve so it sits over cuff edge
    ctx.lineWidth = S.lw * 2; ctx.strokeStyle = P.ink; ctx.stroke(up); ctx.stroke(fo);
    paint(ctx, up, cc, { lw: 0, sd: 4, cx, cy }); paint(ctx, fo, cc, { lw: 0, sd: 4, cx, cy });
    // cuff
    ctx.save(); ctx.translate(w.x, w.y); ctx.rotate(ang);
    ctx.strokeStyle = rgba(P.ink, 0.55); ctx.lineWidth = 1.1; ctx.beginPath(); ctx.moveTo(-6.5, -5); ctx.quadraticCurveTo(0, -3, 6.5, -5); ctx.stroke();
    ctx.restore();
    if (hand !== 'none') drawHand(ctx, w, ang + (handRot || 0), hand, skin, far, cx, cy);
    return { e, w };
  }
  function drawHand(ctx, w, ang, kind, skin, far, cx, cy) {
    ctx.save(); ctx.translate(w.x, w.y); ctx.rotate(ang);
    if (kind === 'fist') {
      const p = ellipseP(0, 6, 7.2, 7.6); paint(ctx, p, skin, { sd: 2.5, lw: S.lw * 0.85 });
      ctx.strokeStyle = rgba(P.ink, 0.6); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-3, 9); ctx.quadraticCurveTo(0, 11, 3, 9); ctx.stroke();
    } else if (kind === 'open') {
      const p = new Path2D(); // palm + fingers (mitten with finger splits)
      p.moveTo(-6, -1); p.bezierCurveTo(-9, 6, -9, 18, -4, 20); p.bezierCurveTo(0, 22, 5, 21, 7, 17); p.bezierCurveTo(9, 10, 8, 3, 6, -1); p.closePath();
      const th = capsule({ x: 5, y: 4 }, { x: 11, y: 10 }, 2.8, 2.4);
      paint(ctx, th, skin, { sd: 1.5, lw: S.lw * 0.8 });
      paint(ctx, p, skin, { sd: 2.5, lw: S.lw * 0.85 });
      ctx.strokeStyle = rgba(P.ink, 0.5); ctx.lineWidth = 0.9; ctx.beginPath();
      ctx.moveTo(-2.5, 20.5); ctx.lineTo(-2.4, 14); ctx.moveTo(1.2, 21); ctx.lineTo(1.2, 14.5); ctx.moveTo(4.5, 19); ctx.lineTo(4, 14); ctx.stroke();
    } else { // mitten
      const p = new Path2D();
      p.moveTo(-6, 0); p.bezierCurveTo(-8, 7, -7, 16, -1, 16.5); p.bezierCurveTo(5, 17, 8, 9, 6.5, 0); p.closePath();
      paint(ctx, p, skin, { sd: 2.5, lw: S.lw * 0.85 });
      const th = capsule({ x: 5.5, y: 4 }, { x: 7, y: 9 }, 2.6, 2.3);
      paint(ctx, th, skin, { sd: 0, lw: S.lw * 0.7, moon: 0 });
    }
    ctx.restore();
  }

  // 胴体（トルソー座標：原点=骨盤、上が負）
  function drawMioTorso(ctx, R, t, ws, wl) {
    const sway = ws * wl * 6 + sin(t * 1.9) * 0.8 + R.flutter * sin(t * 13) * 2.5;
    const cxT = 0, cyT = -50;
    // skirt
    if (R.skirt !== 'crouch') {
      const lift = R.skirt === 'run' ? 6 : 0; const s2 = R.skirt === 'run' ? -8 + sway : sway;
      const p = new Path2D();
      p.moveTo(-24, -52); p.bezierCurveTo(-30, -30, -44 + s2 * 0.5, -6, -50 + s2, 12 - lift);
      const hem = [[-50, 12], [-35, 17], [-18, 13], [0, 18], [18, 13], [36, 17], [54, 10]];
      for (let i = 1; i < hem.length; i++) {
        const [x0, y0] = hem[i - 1], [x1, y1] = hem[i]; const f = sin(t * 3 + i) * R.flutter * 2;
        p.quadraticCurveTo((x0 + x1) / 2 + s2, Math.max(y0, y1) + 3 - lift + f, x1 + s2, y1 - lift + f * 0.5);
      }
      p.bezierCurveTo(46 + s2 * 0.5, -8, 34, -32, 27, -52); p.closePath();
      paint(ctx, p, C.dress, { sd: 7, cx: cxT, cy: cyT, extra: (c) => {
        c.strokeStyle = rgba(shd(shd(C.dress)), 0.55); c.lineWidth = 1.3;
        c.beginPath(); c.moveTo(-8, -40); c.quadraticCurveTo(-14 + s2 * 0.4, -10, -18 + s2, 12 - lift);
        c.moveTo(14, -40); c.quadraticCurveTo(16 + s2 * 0.4, -10, 18 + s2, 12 - lift); c.stroke();
        c.fillStyle = rgba(shd(C.dress), 0.6); c.beginPath(); c.moveTo(-3, -35); c.quadraticCurveTo(-4 + s2 * 0.4, -5, -2 + s2, 16 - lift); c.lineTo(6 + s2, 16 - lift); c.quadraticCurveTo(1 + s2 * 0.3, -10, -3, -35); c.fill();
        // hem lace
        c.strokeStyle = rgba('#ffffff', 0.7); c.lineWidth = 1.4; c.setLineDash([2.5, 3]);
        c.beginPath(); for (let i = 0; i < hem.length; i++) { const [x, y] = hem[i]; i ? c.lineTo(x + s2, y - 3 - lift) : c.moveTo(x + s2, y - 3 - lift); } c.stroke(); c.setLineDash([]);
      } });
    }
    // bodice
    const bd = new Path2D();
    bd.moveTo(-26, -96); bd.bezierCurveTo(-29, -80, -27, -62, -24, -48); bd.lineTo(27, -48); bd.bezierCurveTo(31, -64, 32, -84, 29, -96); bd.closePath();
    paint(ctx, bd, C.dress, { sd: 5, cx: cxT, cy: -80 });
    // cardigan (open front) — hem sways
    const cs = ws * wl * 3 + sin(t * 2.1) * 0.5 + R.flutter * sin(t * 11) * 2;
    const hemY = -36 + (R.skirt === 'crouch' ? 2 : 0);
    const cl = new Path2D();
    cl.moveTo(-30, -97); cl.bezierCurveTo(-34, -80, -33 + cs * 0.3, -55, -33 + cs, hemY - 1);
    cl.quadraticCurveTo(-14 + cs, hemY + 5, 5 + cs * 0.8, hemY + 2); cl.bezierCurveTo(4, -60, 3, -85, 4, -101); cl.bezierCurveTo(-8, -103, -22, -101, -30, -97); cl.closePath();
    const cr = new Path2D();
    cr.moveTo(15, -101); cr.bezierCurveTo(22, -100, 28, -99, 31, -96); cr.bezierCurveTo(35, -80, 35, -58, 33 + cs, hemY);
    cr.quadraticCurveTo(26 + cs, hemY + 3, 20 + cs * 0.9, hemY + 1.5); cr.bezierCurveTo(19, -60, 16, -84, 15, -101); cr.closePath();
    const cardEx = (c) => {
      c.strokeStyle = rgba(shd(C.card), 0.9); c.lineWidth = 1; // ribbed hem
      for (let x = -34; x < 36; x += 3.2) { c.beginPath(); c.moveTo(x + cs, hemY - 5); c.lineTo(x + cs, hemY + 5); c.stroke(); }
      c.beginPath(); c.moveTo(-36 + cs, hemY - 5); c.quadraticCurveTo(-14 + cs, hemY, 36 + cs, hemY - 5); c.stroke();
    };
    paint(ctx, cl, C.card, { sd: 6, cx: -15, cy: -70, extra: cardEx });
    paint(ctx, cr, mix(C.card, shd(C.card), 0.15), { sd: 5, cx: 25, cy: -70, extra: cardEx });
    // buttons
    for (const by of [-82, -64, -46]) { const b = ellipseP(1.2, by, 2.1, 2.1); paint(ctx, b, '#c9a57a', { sd: 0, lw: 0.9, moon: 0 }); }
    // collar + ribbon
    const co = new Path2D();
    co.moveTo(-14, -104); co.bezierCurveTo(-16, -96, -8, -90, 1, -94); co.bezierCurveTo(4, -95, 8, -96, 9, -99);
    co.bezierCurveTo(11, -94, 19, -92, 22, -97); co.bezierCurveTo(24, -101, 22, -104, 20, -106); co.bezierCurveTo(8, -103, -2, -103, -14, -104); co.closePath();
    paint(ctx, co, C.collar, { sd: 2, lw: S.lw * 0.8, cx: 4, cy: -100 });
    const rb = new Path2D(); rb.moveTo(9, -98); rb.bezierCurveTo(3, -103, 1, -94, 9, -96.5); rb.bezierCurveTo(17, -94, 16, -103, 9, -98); rb.closePath();
    paint(ctx, rb, C.ribbon, { sd: 1.5, lw: S.lw * 0.7, moon: 0 });
    const rt = new Path2D(); rt.moveTo(8, -97); rt.lineTo(5.5, -90); rt.lineTo(8.5, -91.5); rt.lineTo(10, -97); rt.moveTo(10, -97); rt.lineTo(13, -90.5); rt.lineTo(10.5, -97);
    paint(ctx, rt, C.ribbon, { sd: 0, lw: S.lw * 0.6, moon: 0 });
  }

  // しゃがみ時のスカート（ワールド座標）
  function drawCrouchSkirt(ctx, R, legs, T, t, ws, wl) {
    const P0 = R.pelvis; const wb = T({ x: -24, y: -50 }), wf = T({ x: 27, y: -50 });
    const kN = legs[1].k, kF = legs[0].k; const kx = Math.max(kN.x, kF.x), ky = Math.min(kN.y, kF.y);
    const sw = ws * wl * 3 + sin(t * 2) * 0.8;
    const p = new Path2D();
    p.moveTo(wb.x, wb.y); p.bezierCurveTo(wb.x - 14, wb.y + 16, P0.x - 32, P0.y - 2, P0.x - 30 + sw, P0.y + 14);
    p.quadraticCurveTo(P0.x - 24 + sw, P0.y + 24, P0.x - 10 + sw, P0.y + 22);
    p.quadraticCurveTo(kx - 30 + sw * 0.6, ky + 26, kx - 12 + sw * 0.4, ky + 10);
    p.quadraticCurveTo(kx - 6, ky + 2, kx - 9, ky - 9);
    p.bezierCurveTo(kx - 24, ky - 14, wf.x + 10, wf.y + 4, wf.x, wf.y); p.closePath();
    paint(ctx, p, C.dress, { sd: 7, cx: P0.x + 10, cy: P0.y - 10, extra: (c) => {
      c.strokeStyle = rgba(shd(shd(C.dress)), 0.5); c.lineWidth = 1.3; c.beginPath();
      c.moveTo(kx - 22, ky - 8); c.quadraticCurveTo(kx - 26, ky + 6, kx - 30 + sw, ky + 20);
      c.moveTo(P0.x - 6, P0.y - 8); c.quadraticCurveTo(P0.x - 14, P0.y + 8, P0.x - 18 + sw, P0.y + 26); c.stroke();
      c.strokeStyle = rgba('#ffffff', 0.7); c.lineWidth = 1.4; c.setLineDash([2.5, 3]); c.beginPath();
      c.moveTo(P0.x - 28 + sw, P0.y + 11); c.quadraticCurveTo(P0.x - 23 + sw, P0.y + 20, P0.x - 10 + sw, P0.y + 18.5); c.quadraticCurveTo(kx - 30 + sw * 0.6, ky + 22, kx - 14 + sw * 0.4, ky + 7); c.stroke(); c.setLineDash([]);
    } });
  }

  // ---------------------------------------------------------------- head (head coords: origin = skull center, R≈48)
  function hairBack(ctx, H) {
    const w = H.hw, w2 = H.hw2;
    const p = new Path2D();
    p.moveTo(2, -67); p.bezierCurveTo(-48, -68, -74, -18, -69, 6); p.bezierCurveTo(-68, 24, -67 + w, 38, -70 + w, 50);
    p.quadraticCurveTo(-74 + w, 58, -81 + w * 1.4, 53 + w2); p.quadraticCurveTo(-64 + w, 57, -54 + w * 0.8, 53);
    p.bezierCurveTo(-30, 58, 18, 58, 44 + w * 0.6, 51); p.quadraticCurveTo(56 + w, 58, 66 + w * 1.3, 53 - w2);
    p.quadraticCurveTo(61 + w, 44, 60, 30); p.bezierCurveTo(63, -10, 42, -67, 2, -67); p.closePath();
    paint(ctx, p, mix(C.hair, shd(C.hair), 0.35), { sd: 6, moon: 0.4, mw: 2.4, cx: 0, cy: 0, wash: 0.25, extra: (c) => {
      c.strokeStyle = rgba('#12123a', 0.6); c.lineWidth = 1.1; c.beginPath();
      c.moveTo(-60, 10); c.quadraticCurveTo(-62, 36, -66 + w, 50); c.moveTo(56, 20); c.quadraticCurveTo(58, 38, 60 + w, 50); c.stroke();
    } });
  }
  function eyePath(ex, ey, w, h, op, lower, tilt, inner) {
    // inner: +1 → inner corner on +x side
    const yc = ey - h * 0.12; const yT = A.lerp(ey + h * 0.45, ey - h, op);
    const yB = ey + h - lower * h * 0.95; const L = ex - w, Rr = ex + w;
    const tiL = inner < 0 ? tilt : -tilt * 0.4, tiR = inner > 0 ? tilt : -tilt * 0.4; // tilt>0: inner lid lowered
    const cT = (yT - yc) / 0.75, cB = (yB - yc) / 0.75;
    const top = [L, yc + tiL * h * 0.3, L + w * 0.15, yc + cT + tiL * h * 0.45, Rr - w * 0.15, yc + cT + tiR * h * 0.45, Rr, yc + tiR * h * 0.3];
    const p = new Path2D(); p.moveTo(top[0], top[1]); p.bezierCurveTo(top[2], top[3], top[4], top[5], top[6], top[7]);
    p.bezierCurveTo(Rr + w * 0.02, yc + cB * 0.9, L - w * 0.02, yc + cB * 0.9, top[0], top[1]); p.closePath();
    return { p, top, yT, yB, yc };
  }
  function drawEye(ctx, ex, ey, w, h, E, inner, far, t, look) {
    const op = E.eopen;
    if (op < 0.16) { // closed
      const cu = E.closedCurve; ctx.strokeStyle = P.ink; ctx.lineWidth = 2.6;
      ctx.beginPath(); ctx.moveTo(ex - w, ey + h * 0.2); ctx.quadraticCurveTo(ex, ey + h * 0.2 + cu * h * 0.7, ex + w, ey + h * 0.2); ctx.stroke();
      const ox = ex - inner * w; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(ox, ey + h * 0.2); ctx.lineTo(ox - inner * 4, ey + h * 0.2 - 2 + cu * 1); ctx.stroke();
      if (E.gloss) { ctx.fillStyle = rgba('#dff4ff', 0.8); ctx.beginPath(); ctx.ellipse(ex, ey + h * 0.5, w * 0.7, 2, 0, 0, TAU); ctx.fill(); }
      return;
    }
    const G = eyePath(ex, ey, w, h, op, E.lower, E.tilt, inner);
    ctx.save(); ctx.clip(G.p);
    ctx.fillStyle = '#fdfcff'; ctx.fill(G.p);
    // iris
    const ix = ex + look.x * w * 0.28 + inner * w * 0.08, iy = ey + h * 0.04 + look.y * h * 0.2;
    const rx = w * 0.74, ry = h * 0.9;
    const gi = ctx.createLinearGradient(0, iy - ry, 0, iy + ry);
    gi.addColorStop(0, C.irisTop); gi.addColorStop(0.45, C.irisMid); gi.addColorStop(0.82, C.irisBot); gi.addColorStop(1, '#b8ecff');
    ctx.fillStyle = gi; ctx.beginPath(); ctx.ellipse(ix, iy, rx, ry, 0, 0, TAU); ctx.fill();
    // soft light-blue glow top of iris (spec: 上部に水色)
    ctx.fillStyle = rgba('#8fd6ff', 0.28); ctx.beginPath(); ctx.ellipse(ix, iy - ry * 0.55, rx * 0.7, ry * 0.25, 0, 0, TAU); ctx.fill();
    // radial strands
    ctx.strokeStyle = rgba('#0b0a2a', 0.22); ctx.lineWidth = 0.5;
    ctx.beginPath(); for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU; ctx.moveTo(ix + cos(a) * rx * 0.35, iy + sin(a) * ry * 0.35); ctx.lineTo(ix + cos(a) * rx * 0.9, iy + sin(a) * ry * 0.9); } ctx.stroke();
    // pupil
    const pk = E.pupil;
    const gp = ctx.createRadialGradient(ix, iy, 0, ix, iy, rx * 0.5 * pk);
    gp.addColorStop(0, '#07061a'); gp.addColorStop(0.8, '#0d0c2a'); gp.addColorStop(1, rgba('#0d0c2a', 0));
    ctx.fillStyle = gp; ctx.beginPath(); ctx.ellipse(ix, iy + ry * 0.02, rx * 0.46 * pk, ry * 0.5 * pk, 0, 0, TAU); ctx.fill();
    // iris rings
    ctx.strokeStyle = '#11103a'; ctx.lineWidth = 1.1; ctx.beginPath(); ctx.ellipse(ix, iy, rx, ry, 0, 0, TAU); ctx.stroke();
    ctx.strokeStyle = rgba('#9fdcff', 0.4); ctx.lineWidth = 0.6; ctx.beginPath(); ctx.ellipse(ix, iy, rx * 0.72, ry * 0.74, 0, 0.2, PI - 0.2); ctx.stroke();
    // upper-lid shadow
    const gs = ctx.createLinearGradient(0, G.yT, 0, G.yT + h * 0.8);
    gs.addColorStop(0, rgba('#2a1f5a', 0.55)); gs.addColorStop(1, rgba('#2a1f5a', 0));
    ctx.fillStyle = gs; ctx.fillRect(ex - w * 1.2, G.yT - 2, w * 2.4, h * 1.2);
    // highlights
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.ellipse(ix - rx * 0.32 * inner * -1, iy - ry * 0.42, w * 0.27, h * 0.2, -0.3 * inner, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(ix + rx * 0.38 * -inner * -1, iy + ry * 0.42, w * 0.11, 0, TAU); ctx.fill();
    if (E.gloss) {
      const tw = 0.6 + 0.4 * sin(t * 5 + ex);
      ctx.fillStyle = rgba('#ffffff', 0.85 * E.gloss);
      ctx.beginPath(); ctx.arc(ix + rx * 0.35, iy - ry * 0.05, w * 0.07, 0, TAU); ctx.arc(ix - rx * 0.45, iy + ry * 0.3, w * 0.06 * tw, 0, TAU); ctx.fill();
      ctx.strokeStyle = rgba('#ffffff', 0.7 * E.gloss); ctx.lineWidth = 1.2; ctx.beginPath();
      ctx.moveTo(ix - rx * 0.7, iy + ry * 0.62); ctx.quadraticCurveTo(ix - rx * 0.2, iy + ry * 0.5 + tw, ix + rx * 0.2, iy + ry * 0.66); ctx.quadraticCurveTo(ix + rx * 0.5, iy + ry * 0.75, ix + rx * 0.75, iy + ry * 0.55); ctx.stroke();
      ctx.fillStyle = rgba('#cdeeff', 0.55 * E.gloss); ctx.beginPath(); ctx.ellipse(ex, G.yB - 1, w * 0.9, 2.6, 0, 0, TAU); ctx.fill();
    }
    ctx.restore();
    // lash line (thick upper lid)
    const T = G.top; const outer = -inner;
    const lp = new Path2D();
    lp.moveTo(T[0], T[1]); lp.bezierCurveTo(T[2], T[3], T[4], T[5], T[6], T[7]);
    const up = 2.6; lp.bezierCurveTo(T[4], T[5] - up, T[2], T[3] - up, T[0], T[1]); lp.closePath();
    ctx.fillStyle = P.ink; ctx.fill(lp); ctx.strokeStyle = P.ink; ctx.lineWidth = 1.6; ctx.stroke(lp);
    // outer wing (lash flick)
    const oxI = outer > 0 ? 6 : 0; const ox = T[oxI], oy = T[oxI + 1];
    ctx.beginPath(); ctx.moveTo(ox - outer * 4, oy - 2.6); ctx.quadraticCurveTo(ox + outer * 2.5, oy - 3.4, ox + outer * 5, oy - 6.2);
    ctx.quadraticCurveTo(ox + outer * 2.2, oy + 0.4, ox - outer * 0.5, oy + 1.2); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(ox - outer * 1, oy - 1); ctx.quadraticCurveTo(ox + outer * 3.2, oy - 0.8, ox + outer * 4.6, oy - 2.2); ctx.lineWidth = 1.1; ctx.stroke();
    // crease
    ctx.strokeStyle = rgba(P.ink, 0.4); ctx.lineWidth = 0.8; ctx.beginPath();
    ctx.moveTo(ex - w * 0.55, G.yT - 3.2 + (op < 0.6 ? 2 : 0)); ctx.quadraticCurveTo(ex, G.yT - 5.2, ex + w * 0.7, G.yT - 2.8); ctx.stroke();
    // lower lid (outer 2/3) + tiny lash
    const q = (u) => { const yb = G.yc + (G.yB - G.yc) * (1 - u * u) ; return yb; };
    ctx.strokeStyle = rgba(P.ink, 0.75); ctx.lineWidth = 1.1; ctx.beginPath();
    for (let i = 0; i <= 8; i++) { const u = 0.85 - i * 0.12; const xx = ex + outer * w * u; const yy = q(Math.abs(u)) + 0.6; i ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); }
    ctx.stroke();
    ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(ex + outer * w * 0.62, q(0.62) + 0.8); ctx.lineTo(ex + outer * w * 0.74, q(0.74) + 2.6); ctx.stroke();
  }
  function drawMouth(ctx, cx, cy, shape, mo, k = 1) {
    ctx.save(); ctx.translate(cx, cy); ctx.scale(k, k);
    ctx.strokeStyle = P.ink; ctx.fillStyle = C.mouthIn; ctx.lineWidth = 1.7;
    let open = mo.open, v = mo.v;
    if (shape === 'shout') { open = Math.max(open, 0.8); if (v === 'closed') v = 'a'; }
    if (open > 0.06) {
      const V = { a: [6.5, 1], i: [8, 0.5], u: [4, 0.8], e: [7.5, 0.65], o: [5, 0.95], N: [4.5, 0.35] }[v] || [6, 0.8];
      const sm = shape === 'smile' ? 1 : shape === 'frown' || shape === 'wavy' ? -1 : 0;
      const w = V[0] * (sm > 0 ? 1.15 : 1), h = 1.2 + open * V[1] * 10;
      const cy0 = -sm * 1.2;
      const p = new Path2D();
      p.moveTo(-w, cy0); p.quadraticCurveTo(0, cy0 - h * 0.28 + sm * 0.8, w * 0.85, cy0 - 0.3);
      p.bezierCurveTo(w * 0.8, h * 0.95, -w * 0.9, h * 0.95, -w, cy0); p.closePath();
      ctx.fill(p); ctx.save(); ctx.clip(p);
      ctx.fillStyle = C.tongue; ctx.beginPath(); ctx.ellipse(-0.5, h * 0.78, w * 0.62, h * 0.4, 0, 0, TAU); ctx.fill();
      if (open > 0.45) { ctx.fillStyle = '#ffffff'; ctx.fillRect(-w, cy0 - h, w * 2, h * 0.28 + 0.8); }
      ctx.restore(); ctx.lineWidth = 1.5; ctx.stroke(p);
    } else {
      ctx.beginPath();
      switch (shape) {
        case 'smile': ctx.moveTo(-6, -2); ctx.quadraticCurveTo(-0.5, 4, 5.5, -2.4); ctx.stroke();
          ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-6.5, -1); ctx.lineTo(-7, -3); ctx.stroke(); break;
        case 'o': ctx.ellipse(0, 1, 2.8, 3.6, 0, 0, TAU); ctx.fill(); ctx.lineWidth = 1.3; ctx.stroke(); break;
        case 'wavy': ctx.moveTo(-5, 1); ctx.bezierCurveTo(-2.5, -2, 0.5, 3, 5, -0.2); ctx.stroke(); break;
        case 'frown': ctx.moveTo(-5, 2); ctx.quadraticCurveTo(0, -2.2, 4.6, 1.8); ctx.stroke(); break;
        case 'firm': ctx.lineWidth = 1.9; ctx.moveTo(-5, 0.3); ctx.quadraticCurveTo(0, 1.2, 4.6, -0.4); ctx.stroke(); break;
        default: ctx.moveTo(-3.8, 0); ctx.quadraticCurveTo(0, 1.5, 3.6, -0.2); ctx.stroke();
      }
    }
    ctx.restore();
  }

  function headFront(ctx, H, o, t) {
    const E = H.E; const skin = C.skin; const w = H.hw;
    // face
    const f = new Path2D();
    f.moveTo(-47, -6); f.bezierCurveTo(-49, 22, -30, 44, -2, 52); f.bezierCurveTo(5, 55, 10, 56, 14, 55);
    f.bezierCurveTo(31, 49, 44, 35, 47, 14); f.bezierCurveTo(49, 2, 49, -8, 47, -14); f.bezierCurveTo(45, -62, -45, -62, -47, -6); f.closePath();
    paint(ctx, f, skin, { sd: 0, cx: 10, cy: 20, fall: 300, extra: (c) => {
      // hair shadow under fringe + jaw shade
      c.fillStyle = rgba(shd(skin), 0.9); c.translate(-1, 6); c.fill(H.cap); c.translate(1, -6);
      c.fillStyle = rgba(shd(skin), 0.75); c.beginPath(); c.moveTo(-50, 0); c.bezierCurveTo(-48, 26, -30, 44, -4, 53); c.lineTo(-6, 58); c.lineTo(-56, 58); c.closePath(); c.fill();
      // cheek glow
      const g = c.createRadialGradient(-10, 30, 2, -10, 30, 30); g.addColorStop(0, rgba('#fff4ea', 0.5)); g.addColorStop(1, rgba('#fff4ea', 0));
      c.fillStyle = g; c.fillRect(-40, 0, 60, 60);
    } });
    // blush with hatching
    const bl = E.blush;
    for (const [bx, by, bw] of [[-16, 35, 10], [34, 35, 7]]) {
      const g = ctx.createRadialGradient(bx, by, 0, bx, by, bw); g.addColorStop(0, rgba(C.cheek, 0.6 * bl)); g.addColorStop(1, rgba(C.cheek, 0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(bx, by, bw, bw * 0.55, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = rgba('#f0707a', 0.55 * bl); ctx.lineWidth = 0.8; ctx.beginPath();
      for (let i = -1; i <= 1; i++) { const hx = bx + i * bw * 0.32; ctx.moveTo(hx - 1.3, by + 1.8); ctx.lineTo(hx + 1.3, by - 1.8); } ctx.stroke();
    }
    // eyes
    const look = o.look || { x: 0, y: 0 };
    drawEye(ctx, -13.5, 16, 12.6, 16, E, 1, false, t, look);
    drawEye(ctx, 31.5, 16, 10, 15.4, E, -1, true, t, look);
    // nose
    ctx.strokeStyle = rgba(shd(shd(skin)), 0.9); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(23.5, 33); ctx.lineTo(22, 35.5); ctx.stroke();
    // mouth
    drawMouth(ctx, 15, 44.5, E.mouth, H.mo);
    // tears
    if (E.tear) {
      const ph = (t * 0.45) % 1; const ty = 30 + ph * 20; const ta = A.clamp(1 - ph * 1.1) * E.tear;
      ctx.strokeStyle = rgba('#dff4ff', 0.5 * ta); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(-18, 28); ctx.quadraticCurveTo(-20, 30 + ph * 8, -19, ty - 3); ctx.stroke();
      const d = new Path2D(); d.moveTo(-19, ty - 5); d.bezierCurveTo(-17, ty - 1, -15.5, ty + 1, -17, ty + 3); d.bezierCurveTo(-18.5, ty + 4.5, -21.5, ty + 3.5, -21.2, ty + 1.2); d.bezierCurveTo(-21, ty - 1, -19.6, ty - 3, -19, ty - 5); d.closePath();
      ctx.fillStyle = rgba('#c8ecff', 0.85 * ta); ctx.fill(d); ctx.strokeStyle = rgba('#5a7fc0', 0.8 * ta); ctx.lineWidth = 0.8; ctx.stroke(d);
      ctx.fillStyle = rgba('#ffffff', ta); ctx.beginPath(); ctx.arc(-18.3, ty + 0.6, 0.9, 0, TAU); ctx.fill();
      // welling tear at far eye
      ctx.fillStyle = rgba('#dff4ff', 0.8 * E.tear); ctx.beginPath(); ctx.ellipse(38, 27.5, 2, 2.6, 0, 0, TAU); ctx.fill();
    }
    // fringe/cap
    paint(ctx, H.cap, C.hair, { sd: 5, moon: 0.45, mw: 2.4, cx: 0, cy: -20, fall: 320, wash: 0.3, extra: (c) => {
      // strand lines (clump separations)
      c.strokeStyle = rgba('#131338', 0.55); c.lineWidth = 0.9; c.beginPath();
      for (const [x0, x1, bend] of [[-4, -6, -3], [8, 18, 2], [22, 28, 3], [-20, -28, -4], [36, 39, 2]]) { c.moveTo(x0 * 0.5, -58); c.quadraticCurveTo(x0 + bend, -30, x1, -2); }
      c.stroke();
      // angel ring (soft, zigzag lower edge)
      const ring = new Path2D(); ring.moveTo(-50, -20); ring.quadraticCurveTo(-4, -66, 50, -22);
      for (let i = 14; i >= 0; i--) { const u = i / 14; const x = A.lerp(-50, 50, u); const yb = -21 - 42 * 4 * u * (1 - u) * 0.5 + (i % 2 ? 5.5 : 1); ring.lineTo(x, yb); }
      ring.closePath();
      const rg = c.createLinearGradient(0, -48, 0, -20); rg.addColorStop(0, rgba(C.hairHi, 0.95)); rg.addColorStop(1, rgba(C.hairHi, 0.35));
      c.fillStyle = rg; c.fill(ring);
      c.fillStyle = rgba('#9aa4ea', 0.75); c.beginPath(); c.ellipse(-16, -43, 6, 1.8, -0.4, 0, TAU); c.ellipse(12, -44, 4, 1.4, 0.3, 0, TAU); c.fill();
    } });
    // near side lock (on top of face)
    const sl = new Path2D(); const w2 = H.hw2;
    sl.moveTo(-50, -12); sl.bezierCurveTo(-60, 2, -61, 26, -60 + w * 0.6, 42); sl.quadraticCurveTo(-64 + w, 52, -72 + w * 1.3, 51 + w2);
    sl.quadraticCurveTo(-60 + w, 51, -51 + w * 0.7, 47); sl.bezierCurveTo(-45, 36, -41, 16, -40, -2); sl.closePath();
    paint(ctx, sl, C.hair, { sd: 3, moon: 0.4, cx: -50, cy: 20, wash: 0.3, extra: (c) => {
      c.strokeStyle = rgba('#131338', 0.6); c.lineWidth = 1; c.beginPath(); c.moveTo(-50, 0); c.quadraticCurveTo(-54, 26, -58 + w, 46); c.stroke();
    } });
    // far side lock sliver
    const fl = new Path2D();
    fl.moveTo(47, -12); fl.bezierCurveTo(55, 0, 56, 22, 55 + w * 0.5, 40); fl.quadraticCurveTo(57 + w, 48, 62 + w * 1.2, 50 - w2);
    fl.quadraticCurveTo(52 + w, 48, 47 + w * 0.5, 44); fl.bezierCurveTo(48, 30, 47, 14, 44, 0); fl.closePath();
    paint(ctx, fl, C.hair, { sd: 2, moon: 0.45, cx: 50, cy: 20 });
    // eyebrows (drawn over the fringe, anime-style see-through)
    const bi = E.bi, bo = E.bo;
    ctx.strokeStyle = rgba('#191538', 0.9); ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.moveTo(-25, -4 - bo); ctx.quadraticCurveTo(-14, -8.5 - (bi + bo) / 2, -3, -4 - bi); ctx.stroke();
    ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(24, -4 - bi); ctx.quadraticCurveTo(32, -8 - (bi + bo) / 2, 40, -4 - bo); ctx.stroke();
    // hairpin
    if (o.hairpin > 0.001) drawHairpin(ctx, -30, -33, o.hairpin, t);
  }
  function makeCap(H) {
    const p = new Path2D();
    p.moveTo(-56, 18); p.bezierCurveTo(-74, -18, -48, -68, 2, -67); p.bezierCurveTo(42, -67, 62, -34, 55, 10);
    p.bezierCurveTo(53, 4, 50, 0, 47, -2);
    const tips = [[47, -2], [39, 3], [28, 5.5], [18, 2.5], [6, 4.5], [-6, 3], [-17, 5], [-28, 2.5], [-38, 6], [-47, 9]];
    for (let i = 1; i < tips.length; i++) {
      const [x0, y0] = tips[i - 1], [x1, y1] = tips[i]; const nx = (x0 + x1) / 2 + 1, ny = Math.min(y0, y1) - 5 - (i % 3) * 1.5;
      p.quadraticCurveTo(x0 - 1, y0 - 3, nx, ny); p.quadraticCurveTo(x1 + 1.5, y1 - 4, x1, y1);
    }
    p.bezierCurveTo(-50, 8, -53, 12, -55, 16); p.closePath();
    return p;
  }
  function drawHairpin(ctx, x, y, k, t) {
    const pop = A.ease.outBack(A.clamp(k)); const flare = sin(PI * A.clamp(k)) ;
    const tw = 0.75 + 0.25 * sin(t * 4.3);
    A.glow(ctx, x, y, 34 * pop * (0.8 + flare * 0.8), P.star, 0.55 * tw);
    ctx.save(); ctx.translate(x, y); ctx.rotate(-0.25); ctx.scale(pop, pop);
    const p = starPath(10, 5.2, 2, 1.4);
    const g = ctx.createRadialGradient(-2, -2, 0, 0, 0, 11); g.addColorStop(0, P.starCore); g.addColorStop(0.6, P.star); g.addColorStop(1, '#f2b640');
    ctx.fillStyle = g; ctx.fill(p); ctx.strokeStyle = '#8a5a24'; ctx.lineWidth = 1.2; ctx.stroke(p);
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(-2.5, -4, 1.8, 1, -0.6, 0, TAU); ctx.fill();
    ctx.restore();
    sparkle(ctx, x + 9, y - 10, 9 * flare + 3 * tw, 0.9 * Math.max(flare, 0.4 * tw));
    if (flare > 0.05) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = rgba(P.starCore, 0.7 * flare); ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(x - 40 * flare, y); ctx.lineTo(x + 40 * flare, y); ctx.moveTo(x, y - 30 * flare); ctx.lineTo(x, y + 30 * flare); ctx.stroke(); ctx.restore(); }
  }

  // ---------------------------------------------------------------- A.drawMio
  A.drawMio = function (ctx, o = {}) {
    const x = o.x ?? 0, y = o.y ?? 0, s = o.s ?? 1, face = (o.face ?? 1) < 0 ? -1 : 1, t = o.t ?? 0;
    const wind = o.wind ?? 0.3; const pose = o.pose || 'stand';
    ctx.save(); const Mo = ctx.getTransform(); ctx.translate(x, y); ctx.scale(s * face, s);
    begin(ctx, o, 3.4, Mo);
    const R = mioPose(o, t);
    const ex = MEX[o.expr] || MEX.neutral;
    const wl = o.windDir !== undefined ? (o.windDir < 0 ? -1 : 1) * face : -1;
    const wk = wind + (pose === 'run' ? 0.5 : 0);
    const ws = wk * (0.6 + 0.4 * A.noise(t * 1.3, 7)) + 0.12 * wk * sin(t * 7.3);
    const bl = A.blink(t, 1);
    let mo = o.mouth || A.mouth('mio', t);
    const E = Object.assign({}, ex); E.eopen = ex.open * bl; E.closedCurve = (o.expr === 'smile' || o.expr === 'teary_smile') && bl < 0.16 ? -0.8 : 0.6;
    if (pose === 'call') E.mouth = 'shout';
    // frames
    const lean = R.lean; const Pv = R.pelvis;
    const T = (p) => add(Pv, rot({ x: p.x, y: p.y + (p.y < -60 ? R.breath * -0.4 : 0) }, lean));
    const neckB = T({ x: 5, y: -101 });
    const hTilt = (o.headTilt || 0) + R.head + lean * 0.3 + sin(t * 1.1) * 0.012;
    const nTop = add(neckB, rot({ x: 0, y: -18 }, lean * 0.6));
    const headFrame = (c) => { c.translate(nTop.x, nTop.y); c.rotate(hTilt); c.translate(2, -44); };
    const H = { E, mo, hw: ws * wl * 9 + sin(t * 1.7) * 1.2, hw2: ws * 3 * sin(t * 5.1), cap: null };
    H.cap = makeCap(H);
    // arms setup
    const shN = T({ x: -22, y: -94 }), shF = T({ x: 25, y: -93 });
    let arms = []; // [{sh, wr, bend, hand, far, layer}]
    let cupC = null;
    const hangN = { x: shN.x - 4, y: shN.y + 84 }, hangF = { x: shF.x + 7, y: shF.y + 84 };
    switch (pose) {
      case 'stand': arms = [{ sh: shF, wr: hangF, bend: 1, hand: 'mitten', far: 1, layer: 0 }, { sh: shN, wr: hangN, bend: 1, hand: 'mitten', far: 0, layer: 1 }]; break;
      case 'cup': case 'crouch_cup': {
        const C0 = pose === 'cup' ? T({ x: 24, y: -60 }) : { x: Pv.x + 70, y: Pv.y - 16 };
        arms = [{ sh: shF, wr: { x: C0.x + 9, y: C0.y }, bend: 1, hand: 'none', far: 1, layer: 0 }, { sh: shN, wr: { x: C0.x - 9, y: C0.y + 2 }, bend: 1, hand: 'none', far: 0, layer: 2 }];
        cupC = C0; break;
      }
      case 'crouch': arms = [{ sh: shF, wr: null, knee: 0, bend: 1, hand: 'mitten', far: 1, layer: 0 }, { sh: shN, wr: null, knee: 1, bend: 1, hand: 'mitten', far: 0, layer: 1 }]; break;
      case 'reach_up': arms = [{ sh: shF, wr: { x: shF.x + 40, y: shF.y - 80 }, bend: -1, hand: 'open', far: 1, layer: 0, hr: PI }, { sh: shN, wr: hangN, bend: 1, hand: 'mitten', far: 0, layer: 1 }]; break;
      case 'wave': {
        const ea = -1.05; const el = add(shN, { x: sin(ea) * ARM1, y: -cos(ea) * ARM1 });
        const b = -0.3 + 0.38 * sin(t * 9); const wr = add(el, { x: sin(b) * ARM2, y: -cos(b) * ARM2 });
        arms = [{ sh: shF, wr: hangF, bend: 1, hand: 'mitten', far: 1, layer: 0 }, { sh: shN, wr, bend: 1, hand: 'open', far: 0, layer: 1, hr: PI, elbow: el }]; break;
      }
      case 'run': {
        arms = [];
        for (let i = 0; i < 2; i++) {
          const q = R.runPh + i * PI; const a = -cos(q) * 0.95; const sh = i ? shN : shF;
          const el = add(sh, { x: sin(a) * ARM1, y: cos(a) * ARM1 }); const b = a + 1.75 + 0.25 * sin(q); const wr = add(el, { x: sin(b) * ARM2, y: cos(b) * ARM2 });
          arms.push({ sh, wr, bend: 1, hand: 'fist', far: i ? 0 : 1, layer: i ? 1 : 0, elbow: el });
        }
        break;
      }
      case 'call': arms = []; break;
    }
    // ---------- draw
    const drawArm = (a) => {
      if (a.elbow) { // explicit elbow (FK)
        const cc = a.far ? mix(C.card, shd(C.card), 0.35) : C.card; const skin = a.far ? mix(C.skin, shd(C.skin), 0.3) : C.skin;
        const cx = (a.sh.x + a.wr.x) / 2, cy = (a.sh.y + a.wr.y) / 2;
        const up = capsule(a.sh, a.elbow, 9, 7.4), fo = capsule(a.elbow, a.wr, 7.4, 7);
        ctx.lineWidth = S.lw * 2; ctx.strokeStyle = P.ink; ctx.stroke(up); ctx.stroke(fo);
        paint(ctx, up, cc, { lw: 0, sd: 4, cx, cy }); paint(ctx, fo, cc, { lw: 0, sd: 4, cx, cy });
        const ang = Math.atan2(a.wr.y - a.elbow.y, a.wr.x - a.elbow.x) - PI / 2;
        ctx.save(); ctx.translate(a.wr.x, a.wr.y); ctx.rotate(ang); ctx.strokeStyle = rgba(P.ink, 0.55); ctx.lineWidth = 1.1; ctx.beginPath(); ctx.moveTo(-6.5, -5); ctx.quadraticCurveTo(0, -3, 6.5, -5); ctx.stroke(); ctx.restore();
        drawHand(ctx, a.wr, ang + (a.hr ? 0 : 0), a.hand, skin, a.far, cx, cy);
        return a.wr;
      }
      return drawMioArm(ctx, a.sh, a.wr, a.bend, a.hand, a.far, t, a.hr ? 0 : 0).w;
    };
    const handPos = {};
    for (const a of arms) if (a.layer === 0 && !a.knee && a.knee !== 0) handPos[a.far ? 'f' : 'n'] = drawArm(a);
    let callL = null;
    if (pose === 'call') {
      ctx.save(); headFrame(ctx); const mL = ctx.getTransform(); ctx.restore();
      callL = (hx, hy) => { const d = mL.transformPoint(new DOMPoint(hx, hy)); const q = ctx.getTransform().inverse().transformPoint(d); return { x: q.x, y: q.y }; };
      drawMioArm(ctx, shF, callL(40, 62), -1, 'none', 1, t);
    }
    // back hair
    ctx.save(); headFrame(ctx); hairBack(ctx, H); ctx.restore();
    // legs
    const crouch = R.skirt === 'crouch';
    const legs = crouch ? [drawMioLegs(ctx, R, 0, 'upper'), drawMioLegs(ctx, R, 1, 'upper')] : [drawMioLegs(ctx, R, 0), drawMioLegs(ctx, R, 1)];
    // crouch arms to knees (far first, behind skirt)
    for (const a of arms) if (a.knee !== undefined) { a.wr = { x: legs[a.knee].k.x + (a.far ? 4 : -4), y: legs[a.knee].k.y - 12 }; }
    for (const a of arms) if (a.knee === 0) handPos.f = drawArm(a);
    // neck
    const nk = capsule(neckB, nTop, 6.8, 6.3);
    paint(ctx, nk, C.skin, { sd: 3, cx: nTop.x, cy: nTop.y, extra: (c) => { c.fillStyle = rgba(shd(C.skin), 0.95); c.beginPath(); c.ellipse(nTop.x + 2, nTop.y + 2, 11, 7, hTilt, 0, TAU); c.fill(); } });
    // torso
    if (R.skirt === 'crouch') drawCrouchSkirt(ctx, R, legs, T, t, ws, wl);
    ctx.save(); ctx.translate(Pv.x, Pv.y); ctx.rotate(lean); drawMioTorso(ctx, R, t, ws, wl); ctx.restore();
    if (crouch) { drawMioLegs(ctx, R, 0, 'lower'); drawMioLegs(ctx, R, 1, 'lower'); }
    for (const a of arms) if (a.layer === 1) handPos[a.far ? 'f' : 'n'] = drawArm(a);
    // cupped hands
    let holdPt = null;
    if (cupC) {
      for (const a of arms) if (a.layer === 2) drawArm(a);
      holdPt = drawCup(ctx, cupC, o, t);
    }
    // head
    ctx.save(); headFrame(ctx); headFront(ctx, H, o, t);
    const aHead = toOuter(ctx, 0, -64), aFace = toOuter(ctx, 12, 20), aEyes = toOuter(ctx, 10, 14), aMouth = toOuter(ctx, 15, 42);
    ctx.restore();
    // call: hands around the mouth
    if (pose === 'call') {
      const wN = callL(-2, 62);
      ctx.save(); headFrame(ctx); drawHand(ctx, { x: 38, y: 60 }, PI - 0.55, 'mitten', mix(C.skin, shd(C.skin), 0.2), 1); ctx.restore();
      drawMioArm(ctx, shN, wN, 1, 'none', 0, t);
      ctx.save(); headFrame(ctx); drawHand(ctx, { x: 1, y: 60 }, PI + 0.5, 'mitten', C.skin, 0); ctx.restore();
      handPos.n = wN;
    }
    const outer = (p) => { const d = ctx.getTransform().transformPoint(new DOMPoint(p.x, p.y)); const q = S.M0i.transformPoint(d); return { x: q.x, y: q.y }; };
    let hands;
    if (holdPt) hands = outer(holdPt);
    else if (pose === 'call') hands = aMouth;
    else if (pose === 'reach_up') hands = outer(handPos.f);
    else if (pose === 'wave') hands = outer(handPos.n);
    else if (pose === 'crouch') hands = outer(lerpP(handPos.n || legs[1].k, handPos.f || legs[0].k, 0.5));
    else hands = outer(handPos.n || { x: 0, y: -150 });
    const chest = outer(T({ x: 4, y: -75 }));
    ctx.restore();
    return { head: aHead, face: aFace, eyes: aEyes, mouth: aMouth, hands, chest, height: hyp(aHead.x - x, aHead.y - y) };
  };

  function drawCup(ctx, c, o, t) {
    const skin = C.skin; const sb = mix(skin, shd(skin), 0.35);
    // back rim (far hand fingertips)
    const bk = new Path2D(); bk.moveTo(c.x - 17, c.y - 1); bk.bezierCurveTo(c.x - 14, c.y - 9, c.x + 16, c.y - 10, c.x + 19, c.y - 2); bk.quadraticCurveTo(c.x, c.y + 2, c.x - 17, c.y - 1); bk.closePath();
    paint(ctx, bk, sb, { sd: 0, lw: S.lw * 0.85, moon: 0.15, cx: c.x, cy: c.y });
    const hold = { x: c.x + 1, y: c.y - 3 };
    if (o.holding) { ctx.save(); ctx.setTransform(S.M0); const hp = S.M0i.transformPoint(ctx.getTransform().transformPoint(new DOMPoint(0, 0))); ctx.restore();
      ctx.save(); const cur = ctx.getTransform(); const d = cur.transformPoint(new DOMPoint(hold.x, hold.y)); const q = S.M0i.transformPoint(d); ctx.setTransform(S.M0); o.holding(ctx, { x: q.x, y: q.y }); ctx.restore(); }
    // front bowl
    const p = new Path2D();
    p.moveTo(c.x - 21, c.y - 3); p.bezierCurveTo(c.x - 22, c.y + 12, c.x - 8, c.y + 18, c.x + 2, c.y + 17.5);
    p.bezierCurveTo(c.x + 14, c.y + 17, c.x + 23, c.y + 10, c.x + 22, c.y - 3);
    p.bezierCurveTo(c.x + 14, c.y + 3, c.x + 8, c.y + 2, c.x + 1, c.y + 3); p.bezierCurveTo(c.x - 6, c.y + 2, c.x - 13, c.y + 3, c.x - 21, c.y - 3); p.closePath();
    paint(ctx, p, skin, { sd: 3, cx: c.x, cy: c.y + 8, extra: (k) => {
      k.strokeStyle = rgba(P.ink, 0.5); k.lineWidth = 1; k.beginPath();
      k.moveTo(c.x + 1, c.y + 3); k.quadraticCurveTo(c.x + 2, c.y + 10, c.x + 1.5, c.y + 17);
      for (const dx of [-14, -8, 9, 15]) { k.moveTo(c.x + dx, c.y + 2); k.quadraticCurveTo(c.x + dx * 1.05, c.y + 5, c.x + dx * 1.1, c.y + 7); }
      k.stroke();
    } });
    // thumbs
    paint(ctx, capsule({ x: c.x - 20, y: c.y - 1 }, { x: c.x - 15, y: c.y - 6 }, 3, 2.6), skin, { sd: 0, lw: S.lw * 0.7 });
    paint(ctx, capsule({ x: c.x + 21, y: c.y - 1 }, { x: c.x + 16, y: c.y - 6 }, 3, 2.6), skin, { sd: 0, lw: S.lw * 0.7 });
    return hold;
  }

  // ================================================================ HOSHI
  const HEX = { cry: 1, weak: 1, surprised: 1, smile: 1, joy: 1, tender: 1 };
  A.drawHoshi = function (ctx, o = {}) {
    const x = o.x ?? 0, y = o.y ?? 0, s = o.s ?? 1, t = o.t ?? 0; const expr = HEX[o.expr] ? o.expr : 'smile';
    const glow0 = o.glow ?? 1; const look = o.look || { x: 0, y: 0 };
    const mo = o.mouth || A.mouth('hoshi', t); const speaking = mo.open > 0.06 ? 1 : 0;
    const R = 70;
    // flicker when weak
    let g = glow0;
    if (glow0 < 0.9) { const fl = 0.5 + 0.5 * A.noise(t * 11, 3) * A.noise(t * 3.1, 5); g = glow0 * (0.65 + 0.55 * fl) ; }
    const gl = A.clamp(g, 0, 2);
    // color by glow
    const dim = A.clamp(1 - gl); const hot = A.clamp(gl - 1);
    let body = mix(P.star, P.starDim, dim * 0.95); body = mix(body, '#fff6d8', hot * 0.7);
    let core = mix(P.starCore, '#d9cfb0', dim * 0.9); let edge = mix('#f2b54c', '#9a8a68', dim); edge = mix(edge, '#ffd978', hot * 0.6);
    ctx.save(); const Mo = ctx.getTransform(); ctx.translate(x, y); ctx.scale(s, s);
    begin(ctx, {}, 3, Mo);
    // aura
    const auraC = hot > 0 ? mix(P.star, '#fffbe6', hot) : P.star;
    A.glow(ctx, 0, 0, R * (1.4 + gl * 1.25 + hot * 1.2), auraC, 0.12 + 0.38 * Math.min(gl, 1) + hot * 0.25);
    if (hot > 0) { // rays
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.rotate(t * 0.25);
      for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU; const L = R * (1.8 + 0.6 * sin(t * 2 + i * 1.7)) * (0.6 + hot * 0.7);
        const gr = ctx.createLinearGradient(0, 0, cos(a) * L, sin(a) * L); gr.addColorStop(0, rgba('#fff4c8', 0.25 * hot)); gr.addColorStop(1, rgba('#fff4c8', 0));
        ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(cos(a - 0.05) * L, sin(a - 0.05) * L); ctx.lineTo(cos(a + 0.05) * L, sin(a + 0.05) * L); ctx.fill(); }
      ctx.restore();
      // particle aura
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 22; i++) { const r0 = A.hash(i * 3.1); const ph = (t * (0.25 + r0 * 0.3) + A.hash(i * 7.7)) % 1;
        const a = A.hash(i * 1.3) * TAU + t * 0.4 * (r0 - 0.5); const rr = R * (0.9 + ph * 1.6);
        const px = cos(a) * rr, py = sin(a) * rr - ph * R * 0.6; const al = sin(PI * ph) * hot;
        ctx.fillStyle = rgba('#fff3c0', 0.9 * al); ctx.beginPath(); ctx.arc(px, py, 2 + r0 * 3, 0, TAU); ctx.fill(); }
      ctx.restore();
    }
    // orbiting sparkles
    const nsp = Math.round(2 + Math.min(gl, 2) * 3 + (expr === 'joy' ? 4 : 0));
    for (let i = 0; i < nsp; i++) { const a = A.hash(i * 5.3) * TAU + t * (0.3 + A.hash(i) * 0.4); const rr = R * (1.2 + A.hash(i * 2.2) * 0.7);
      const tw = Math.max(0, sin(t * (2 + A.hash(i * 9) * 3) + i * 2.1)); sparkle(ctx, cos(a) * rr, sin(a) * rr * 0.9, 5 + 7 * tw, tw * Math.min(1, gl * 0.8 + 0.1), '#fff7d6'); }
    // body transform
    ctx.rotate(o.rot || 0); const sq = o.squash || 0; ctx.scale(1 + sq * 0.18, 1 - sq * 0.18);
    // limbs
    const tips = [0, 1, 2, 3, 4].map(() => ({ da: 0, k: 1 }));
    let armA = 0, armW = 0, kick = 0;
    if (expr === 'cry') { armA = 0.16; armW = 0.05 * sin(t * 14); }
    else if (expr === 'weak') { armA = 0.18; armW = 0.03 * sin(t * 2); }
    else if (expr === 'joy') { armA = -0.22; armW = 0.16 * sin(t * 10); kick = 0.08 * sin(t * 10); }
    else if (expr === 'surprised') { armA = -0.2; armW = 0; }
    else if (expr === 'tender') { armA = 0.1; armW = 0.04 * sin(t * 2.5); }
    else { armA = -0.05; armW = 0.07 * sin(t * 3); }
    armW += speaking * 0.12 * sin(t * 7.5);
    tips[1].da = armA + armW; tips[4].da = -(armA + armW * 0.8 * (expr === 'joy' ? -1 : 1));
    tips[1].k = tips[4].k = 1.02;
    tips[2].da = kick + 0.03 * sin(t * 2.2); tips[3].da = kick * -1 - 0.03 * sin(t * 2.2);
    tips[0].da = 0.03 * sin(t * 1.7); tips[0].k = 1 + 0.02 * sin(t * 2.3);
    const path = starPath(R, R * 0.5, R * 0.17, R * 0.16, tips);
    const gb = ctx.createRadialGradient(-R * 0.12, -R * 0.15, R * 0.05, 0, 0, R * 1.02);
    gb.addColorStop(0, core); gb.addColorStop(0.5, body); gb.addColorStop(1, edge);
    ctx.fillStyle = gb; ctx.fill(path);
    ctx.save(); ctx.clip(path);
    { const k = localKey(ctx.getTransform().inverse()); const sh = new Path2D(path); sh.addPath(path, shift(k.x * 9, k.y * 9)); ctx.fillStyle = rgba(mix(edge, '#b86a3a', 0.45), 0.45 * (1 - hot)); ctx.fill(sh, 'evenodd'); }
    ctx.globalCompositeOperation = 'lighter'; const gc = ctx.createRadialGradient(0, R * 0.05, 0, 0, R * 0.05, R * 0.6); gc.addColorStop(0, rgba('#fffbe6', 0.35 * Math.min(1, gl))); gc.addColorStop(1, rgba('#fffbe6', 0)); ctx.fillStyle = gc; ctx.fillRect(-R, -R, 2 * R, 2 * R);
    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();
    ctx.strokeStyle = mix(mix(P.ink, '#a8651f', 0.45), '#fff0c0', hot * 0.5); ctx.lineWidth = 3.2; ctx.stroke(path);
    // gloss highlights
    ctx.strokeStyle = rgba('#ffffff', 0.85); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-R * 0.2, -R * 0.5); ctx.quadraticCurveTo(-R * 0.16, -R * 0.66, -R * 0.07, -R * 0.76); ctx.stroke();
    ctx.fillStyle = rgba('#ffffff', 0.8); ctx.beginPath(); ctx.arc(-R * 0.23, -R * 0.4, 2.2, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(-R * 0.6, -R * 0.27, R * 0.07, R * 0.025, -0.15, 0, TAU); ctx.fill();
    // face
    drawHoshiFace(ctx, R, expr, t, look, mo, gl);
    ctx.restore();
    return { x, y, r: R * s };
  };
  function hoshiEye(ctx, ex, ey, rx, ry, expr, bl, look, t, side) {
    ctx.fillStyle = '#2a1d36'; ctx.strokeStyle = '#2a1d36';
    if (expr === 'joy' || (expr === 'tender' && bl < 0.25)) { // ^^ arcs
      ctx.lineWidth = 3.4; ctx.beginPath(); ctx.moveTo(ex - rx * 1.2, ey + ry * 0.2); ctx.quadraticCurveTo(ex, ey - ry * 1.1, ex + rx * 1.2, ey + ry * 0.2); ctx.stroke(); return;
    }
    if (expr === 'cry') { // squeezed > <
      ctx.lineWidth = 3.2; const d = side; ctx.beginPath();
      ctx.moveTo(ex - d * rx * 1.1, ey - ry * 0.7); ctx.quadraticCurveTo(ex + d * rx * 0.2, ey - ry * 0.1, ex + d * rx * 1.1, ey); ctx.quadraticCurveTo(ex + d * rx * 0.2, ey + ry * 0.1, ex - d * rx * 1.1, ey + ry * 0.7); ctx.stroke(); return;
    }
    if (bl < 0.16) { ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(ex - rx * 1.1, ey); ctx.quadraticCurveTo(ex, ey + ry * 0.6, ex + rx * 1.1, ey); ctx.stroke(); return; }
    let k = bl; let sc = 1; if (expr === 'surprised') sc = 1.2;
    const erx = rx * sc, ery = ry * sc * k;
    ctx.save(); ctx.beginPath(); ctx.ellipse(ex, ey, erx, ery, 0, 0, TAU);
    if (expr === 'weak' || expr === 'tender') { ctx.save(); ctx.clip(); }
    ctx.fill();
    // iris shine
    const lx = ex + look.x * erx * 0.2, ly = ey + look.y * ery * 0.2;
    const g = ctx.createLinearGradient(0, ey - ery, 0, ey + ery); g.addColorStop(0.45, rgba('#5a3f7a', 0)); g.addColorStop(1, rgba('#8a6ad0', 0.7));
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(lx, ly, erx * 0.85, ery * 0.9, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#ffffff';
    const hs = expr === 'surprised' ? 0.7 : 1;
    ctx.beginPath(); ctx.ellipse(lx - erx * 0.28, ly - ery * 0.38, erx * 0.42 * hs, ery * 0.3 * hs, -0.3, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(lx + erx * 0.35, ly + ery * 0.4, erx * 0.18 * hs, 0, TAU); ctx.fill();
    if (expr === 'weak' || expr === 'tender') {
      ctx.restore();
      // heavy lid
      const lidY = expr === 'weak' ? ey - ery * 0.1 : ey - ery * 0.55;
      ctx.fillStyle = mix(P.star, '#e8c070', 0.5); ctx.globalAlpha = 1;
      ctx.beginPath(); ctx.rect(ex - erx * 1.3, ey - ery * 1.4, erx * 2.6, lidY - (ey - ery * 1.4)); ctx.save(); ctx.clip();
      ctx.beginPath(); ctx.ellipse(ex, ey, erx + 0.5, ery + 0.5, 0, 0, TAU); ctx.fillStyle = 'rgba(0,0,0,0)'; ctx.restore();
      ctx.strokeStyle = '#2a1d36'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(ex - erx * 1.15, lidY + (expr === 'weak' ? 1.5 : 0)); ctx.quadraticCurveTo(ex, lidY - (expr === 'weak' ? 0 : 3), ex + erx * 1.15, lidY + (expr === 'weak' ? 1.5 : 0)); ctx.stroke();
    }
    ctx.restore();
  }
  function drawHoshiFace(ctx, R, expr, t, look, mo, gl) {
    const bl = A.blink(t, 2);
    const ey = -R * 0.0 + look.y * 2, exo = R * 0.22, rx = R * 0.095, ry = R * 0.135;
    const fx = look.x * 3;
    // weak/tender eyes: draw the eye ball clipped under a lid
    for (const side of [-1, 1]) {
      const ex = fx + side * exo;
      if (expr === 'tender' && bl >= 0.16) {
        ctx.save(); ctx.beginPath(); ctx.moveTo(ex - rx * 2, ey - ry * 2); ctx.lineTo(ex + rx * 2, ey - ry * 2); ctx.lineTo(ex + rx * 2, ey + ry * 0.55);
        ctx.quadraticCurveTo(ex, ey - ry * 0.35, ex - rx * 2, ey + ry * 0.55); ctx.closePath(); ctx.clip();
        hoshiEye(ctx, ex, ey, rx, ry, 'smile', 1, look, t, side); ctx.restore();
        ctx.strokeStyle = '#2a1d36'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(ex - rx * 1.1, ey + ry * 0.4); ctx.quadraticCurveTo(ex, ey - ry * 0.28, ex + rx * 1.1, ey + ry * 0.4); ctx.stroke();
      } else if (expr === 'weak' || expr === 'tender') {
        const lidT = expr === 'weak' ? 0.1 : -0.5;
        ctx.save(); ctx.beginPath(); ctx.rect(ex - rx * 2, ey + ry * lidT - 0.5, rx * 4, ry * 3); ctx.clip();
        hoshiEye(ctx, ex, ey, rx, ry, 'smile', bl < 0.16 ? bl : 1, look, t, side); ctx.restore();
        if (bl >= 0.16) { ctx.strokeStyle = '#2a1d36'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(ex - rx * 1.25, ey + ry * lidT + (expr === 'weak' ? 1.5 * side * 0 + 1 : 0.5)); ctx.quadraticCurveTo(ex, ey + ry * lidT - (expr === 'tender' ? 2.5 : 0.5), ex + rx * 1.25, ey + ry * lidT + (expr === 'weak' ? 1 : 0.5)); ctx.stroke(); }
        if (expr === 'tender' && bl >= 0.16) { ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(ex - rx * 0.9, ey + ry * 1.25); ctx.quadraticCurveTo(ex, ey + ry * 1.05, ex + rx * 0.9, ey + ry * 1.25); ctx.stroke(); }
      } else hoshiEye(ctx, ex, ey, rx, ry, expr, bl, look, t, side);
    }
    // cheeks
    for (const side of [-1, 1]) {
      const cx = fx + side * R * 0.36, cy = R * 0.15;
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 0.11); g.addColorStop(0, rgba('#ff8f8f', 0.65 * (0.5 + 0.5 * Math.min(1, gl)))); g.addColorStop(1, rgba('#ff8f8f', 0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(cx, cy, R * 0.11, R * 0.07, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = rgba('#e4606a', 0.55); ctx.lineWidth = 1; ctx.beginPath();
      for (let i = -1; i <= 1; i++) { ctx.moveTo(cx + i * 3.4 - 1.2, cy + 2); ctx.lineTo(cx + i * 3.4 + 1.2, cy - 2); } ctx.stroke();
    }
    // tears
    if (expr === 'cry') {
      for (const side of [-1, 1]) {
        const sx = fx + side * (exo + rx * 0.6), sy = ey + ry * 0.4;
        ctx.fillStyle = rgba('#bfe8ff', 0.55); ctx.beginPath(); ctx.moveTo(sx - 2, sy); ctx.quadraticCurveTo(sx + side * 8, sy + 16, sx + side * 6, sy + 34); ctx.lineTo(sx + side * 11, sy + 34); ctx.quadraticCurveTo(sx + side * 12, sy + 14, sx + 2, sy - 1); ctx.fill();
        for (let k = 0; k < 3; k++) { const ph = (t * 1.3 + k / 3 + (side > 0 ? 0.17 : 0)) % 1; const dx = sx + side * (4 + ph * 12), dy = sy + 6 + ph * 40;
          ctx.fillStyle = rgba('#d8f2ff', 0.9 * (1 - ph)); ctx.beginPath(); ctx.moveTo(dx, dy - 5); ctx.quadraticCurveTo(dx + 3.4, dy + 1, dx, dy + 3); ctx.quadraticCurveTo(dx - 3.4, dy + 1, dx, dy - 5); ctx.fill();
          ctx.strokeStyle = rgba('#6d95c8', 0.6 * (1 - ph)); ctx.lineWidth = 0.8; ctx.stroke(); }
      }
    }
    // mouth
    const mx = fx, my = R * 0.17; ctx.strokeStyle = '#2a1d36'; ctx.lineWidth = 2.4; ctx.fillStyle = '#7a2a3a';
    const open = mo.open;
    if (open > 0.06 || expr === 'joy' || expr === 'surprised') {
      let w = 6 + (mo.v === 'i' || mo.v === 'e' ? 2 : 0), h = 2 + open * 9;
      if (expr === 'joy') { w = Math.max(w, 9); h = Math.max(h, 7); }
      if (expr === 'surprised' && open < 0.06) { w = 3.6; h = 5; }
      const p = new Path2D();
      if (expr === 'cry') { // wobbly
        const wb = sin(t * 22) * 1.2; p.moveTo(mx - w, my + 1); p.quadraticCurveTo(mx - w / 2, my - 2 + wb, mx, my); p.quadraticCurveTo(mx + w / 2, my - 2 - wb, mx + w, my + 1);
        p.bezierCurveTo(mx + w, my + h, mx - w, my + h, mx - w, my + 1);
      } else if (expr === 'surprised' && open < 0.06) { p.ellipse(mx, my + 2, w, h * 0.6, 0, 0, TAU); }
      else { p.moveTo(mx - w, my); p.quadraticCurveTo(mx, my + 1.5, mx + w, my); p.bezierCurveTo(mx + w, my + h * 1.2, mx - w, my + h * 1.2, mx - w, my); }
      ctx.fill(p); ctx.save(); ctx.clip(p); ctx.fillStyle = '#f07c88'; ctx.beginPath(); ctx.ellipse(mx, my + h * 0.95, w * 0.6, h * 0.45, 0, 0, TAU); ctx.fill(); ctx.restore(); ctx.lineWidth = 2; ctx.stroke(p);
    } else {
      ctx.beginPath();
      if (expr === 'cry') { ctx.moveTo(mx - 6, my + 3); ctx.bezierCurveTo(mx - 3, my - 1 + sin(t * 20), mx + 3, my - 1 - sin(t * 20), mx + 6, my + 3); }
      else if (expr === 'weak') { ctx.moveTo(mx - 3.5, my + 1.5); ctx.quadraticCurveTo(mx, my - 0.5, mx + 3.5, my + 1.5); }
      else if (expr === 'tender') { ctx.moveTo(mx - 5.5, my); ctx.quadraticCurveTo(mx, my + 4.5, mx + 5.5, my); }
      else { ctx.moveTo(mx - 6.5, my - 0.5); ctx.quadraticCurveTo(mx - 3, my + 5, mx, my + 1.2); ctx.quadraticCurveTo(mx + 3, my + 5, mx + 6.5, my - 0.5); }
      ctx.stroke();
    }
    if (expr === 'surprised') { ctx.strokeStyle = '#2a1d36'; ctx.lineWidth = 2; for (const side of [-1, 1]) { ctx.beginPath(); ctx.moveTo(fx + side * (exo - 6), ey - ry * 1.9); ctx.quadraticCurveTo(fx + side * exo, ey - ry * 2.3, fx + side * (exo + 6), ey - ry * 1.9); ctx.stroke(); } }
  }

  // ================================================================ GRANDPA
  const GC = { skin: '#f2c9a8', vest: '#7a4e2e', shirt: '#f4efe6', white: '#f6f4f0', glass: '#c7b07a', lantern: '#ffb85a' };
  A.drawGrandpa = function (ctx, o = {}) {
    const x = o.x ?? 0, y = o.y ?? 0, s = o.s ?? 1, t = o.t ?? 0; const lan = A.clamp(o.lantern ?? 1); const raise = A.clamp(o.raise ?? 0);
    const mo = o.mouth || A.mouth('grandpa', t); const br = sin(t * 1.8);
    ctx.save(); const Mo = ctx.getTransform(); ctx.translate(x, y); ctx.scale(s, s);
    // lantern position (hand) — needed for lighting
    const shR = { x: 62, y: -112 };
    const hand = { x: A.lerp(100, 94, raise), y: A.lerp(-118, -240, raise) + sin(t * 1.3) * 2 };
    const sw = sin(t * 1.6) * 0.08;
    const lc = add(hand, rot({ x: 0, y: 46 }, sw));
    begin(ctx, {}, 3, Mo);
    if (lan > 0) S.light = { p: ctx.getTransform().transformPoint(new DOMPoint(lc.x, lc.y)), color: '#ffc36a', str: lan * 0.9, r: 260 };
    A.glow(ctx, lc.x, lc.y, 190 * lan, P.warm, 0.45 * lan);
    // body
    const bd = new Path2D(); bd.moveTo(-92, 0); bd.bezierCurveTo(-92, -60, -84, -104, -52, -118); bd.bezierCurveTo(-30, -126, 30, -126, 52, -118); bd.bezierCurveTo(84, -104, 92, -60, 92, 0); bd.closePath();
    paint(ctx, bd, GC.shirt, { sd: 8, cx: 0, cy: -60 });
    const vest = new Path2D(); vest.moveTo(-88, 0); vest.bezierCurveTo(-88, -50, -80, -96, -46, -114); vest.lineTo(-8, -40); vest.lineTo(-4, 0); vest.closePath();
    vest.moveTo(88, 0); vest.bezierCurveTo(88, -50, 80, -96, 46, -114); vest.lineTo(8, -40); vest.lineTo(4, 0); vest.closePath();
    paint(ctx, vest, GC.vest, { sd: 8, cx: 0, cy: -50, extra: (c) => { c.strokeStyle = rgba('#3b2412', 0.5); c.lineWidth = 1.2; c.beginPath(); c.moveTo(-60, -30); c.lineTo(-30, -30); c.moveTo(34, -30); c.lineTo(64, -30); c.stroke(); } });
    for (const by of [-26, -8]) { paint(ctx, ellipseP(-12, by, 2.8, 2.8), '#d8b56a', { sd: 0, lw: 1, moon: 0 }); }
    // left arm resting (screen-left) — sleeve to the sill
    paint(ctx, capsule({ x: -64, y: -106 }, { x: -78, y: -20 }, 17, 15), GC.shirt, { sd: 6, cx: -70, cy: -60 });
    // head
    const hx = 0, hy = -182 + br * 0.8; const tilt = sin(t * 0.9) * 0.03;
    ctx.save(); ctx.translate(hx, hy); ctx.rotate(tilt); ctx.scale(1.12, 1.12);
    paint(ctx, capsule({ x: 0, y: 30 }, { x: 0, y: 60 }, 16, 18), GC.skin, { sd: 3, cx: 0, cy: 40 });
    // ears
    for (const sd of [-1, 1]) paint(ctx, ellipseP(sd * 46, 6, 9, 13), GC.skin, { sd: 2, cx: sd * 46, cy: 6 });
    const hd = new Path2D(); hd.moveTo(-45, -4); hd.bezierCurveTo(-47, -52, 47, -52, 45, -4); hd.bezierCurveTo(46, 30, 28, 48, 0, 48); hd.bezierCurveTo(-28, 48, -46, 30, -45, -4); hd.closePath();
    paint(ctx, hd, GC.skin, { sd: 5, cx: 0, cy: 0, extra: (c) => { c.fillStyle = rgba('#ffffff', 0.6); c.beginPath(); c.ellipse(-14, -30, 12, 5, -0.4, 0, TAU); c.fill(); c.fillStyle = rgba('#e89f8a', 0.4); c.beginPath(); c.ellipse(-26, 18, 9, 5, 0, 0, TAU); c.ellipse(26, 18, 9, 5, 0, 0, TAU); c.fill();
      c.strokeStyle = rgba('#a06a50', 0.5); c.lineWidth = 1.2; c.beginPath(); c.moveTo(-14, -26); c.quadraticCurveTo(0, -30, 14, -26); c.moveTo(-10, -20); c.quadraticCurveTo(0, -23, 10, -20); c.stroke(); } });
    // side hair tufts
    for (const sd of [-1, 1]) { const p = new Path2D(); ctx.save(); ctx.scale(sd, 1);
      p.moveTo(40, -24); p.bezierCurveTo(56, -26, 60, -12, 54, -6); p.bezierCurveTo(62, 0, 58, 14, 50, 14); p.bezierCurveTo(54, 22, 44, 28, 40, 20); p.bezierCurveTo(38, 6, 38, -10, 40, -24); p.closePath();
      paint(ctx, p, GC.white, { sd: 3, cx: 48, cy: 0 }); ctx.restore(); }
    // eyes (kind, closed-ish arcs) behind glasses
    const bl = A.blink(t, 3);
    ctx.strokeStyle = P.ink; ctx.lineWidth = 2.6;
    for (const sd of [-1, 1]) { const ex = sd * 17, ey = 0; ctx.beginPath();
      if (bl < 0.2) { ctx.moveTo(ex - 6, ey + 1); ctx.lineTo(ex + 6, ey + 1); } else { ctx.moveTo(ex - 6.5, ey + 2); ctx.quadraticCurveTo(ex, ey - 5, ex + 6.5, ey + 2); }
      ctx.stroke(); ctx.fillStyle = P.ink; if (bl >= 0.2) { ctx.beginPath(); ctx.ellipse(ex, ey + 1, 2.4, 2.2, 0, 0, PI); ctx.fill(); } }
    // glasses
    ctx.strokeStyle = '#6b4a2a'; ctx.lineWidth = 2.4;
    for (const sd of [-1, 1]) { ctx.beginPath(); ctx.arc(sd * 17, 0, 12.5, 0, TAU); ctx.fillStyle = rgba('#fff8e8', 0.15); ctx.fill(); ctx.stroke();
      ctx.save(); ctx.strokeStyle = rgba('#ffffff', 0.8); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(sd * 17, 0, 9, -2.4, -1.8); ctx.stroke(); ctx.restore(); }
    ctx.beginPath(); ctx.moveTo(-5, -1); ctx.quadraticCurveTo(0, -4, 5, -1); ctx.moveTo(-29.5, -2); ctx.lineTo(-44, -5); ctx.moveTo(29.5, -2); ctx.lineTo(44, -5); ctx.stroke();
    // brows (bushy, droop outward)
    for (const sd of [-1, 1]) { const p = new Path2D(); ctx.save(); ctx.scale(sd, 1); const lift = mo.open * 2;
      p.moveTo(6, -16 - lift); p.bezierCurveTo(10, -26 - lift, 28, -28 - lift, 34, -18 - lift); p.quadraticCurveTo(40, -12, 38, -8); p.quadraticCurveTo(32, -14, 26, -14 - lift); p.quadraticCurveTo(18, -15, 12, -12 - lift); p.quadraticCurveTo(6, -11, 6, -16 - lift); p.closePath();
      paint(ctx, p, GC.white, { sd: 2, lw: 2.4, cx: 20, cy: -18 }); ctx.restore(); }
    // nose
    paint(ctx, ellipseP(0, 13, 8.5, 7.5), mix(GC.skin, '#e8907a', 0.35), { sd: 2.5, lw: 2.2, cx: 0, cy: 13 });
    // mouth opening (under mustache)
    const op = mo.open; const my = 26;
    if (op > 0.06) { const p = new Path2D(); p.ellipse(0, my + 3 + op * 3, 8 + op * 2, 3 + op * 6, 0, 0, TAU); ctx.fillStyle = C.mouthIn; ctx.fill(p); ctx.strokeStyle = P.ink; ctx.lineWidth = 1.8; ctx.stroke(p); }
    // mustache
    const mu = new Path2D(); const ml = op * 2.5;
    ctx.save(); ctx.translate(0, -ml);
    mu.moveTo(0, 18); mu.bezierCurveTo(10, 14, 26, 16, 32, 26); mu.quadraticCurveTo(36, 34, 30, 36); mu.quadraticCurveTo(24, 30, 16, 32); mu.quadraticCurveTo(8, 33, 0, 28);
    mu.quadraticCurveTo(-8, 33, -16, 32); mu.quadraticCurveTo(-24, 30, -30, 36); mu.quadraticCurveTo(-36, 34, -32, 26); mu.bezierCurveTo(-26, 16, -10, 14, 0, 18); mu.closePath();
    paint(ctx, mu, GC.white, { sd: 2.5, lw: 2.4, cx: 0, cy: 26, extra: (c) => { c.strokeStyle = rgba('#b8b0c8', 0.8); c.lineWidth = 1; c.beginPath(); c.moveTo(8, 22); c.quadraticCurveTo(18, 24, 24, 30); c.moveTo(-8, 22); c.quadraticCurveTo(-18, 24, -24, 30); c.stroke(); } });
    ctx.restore();
    ctx.restore();
    // lantern arm
    const L = ik(shR, { x: hand.x, y: hand.y + 6 }, 58, 54, raise > 0.5 ? -1 : 1);
    const up = capsule(shR, L.e, 16, 13), fo = capsule(L.e, L.w, 13, 11);
    ctx.lineWidth = 6; ctx.strokeStyle = P.ink; ctx.stroke(up); ctx.stroke(fo);
    paint(ctx, up, GC.shirt, { lw: 0, sd: 5, cx: shR.x, cy: shR.y }); paint(ctx, fo, GC.shirt, { lw: 0, sd: 5, cx: L.e.x, cy: L.e.y });
    // handle + lantern
    ctx.strokeStyle = '#3a2618'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(hand.x, hand.y); ctx.lineTo(lc.x, lc.y - 34); ctx.stroke();
    ctx.save(); ctx.translate(lc.x, lc.y); ctx.rotate(sw);
    const lb = ellipseP(0, 0, 25, 30);
    const flick = 0.9 + 0.1 * A.noise(t * 8, 11);
    const lg = ctx.createRadialGradient(0, 4, 2, 0, 0, 30); lg.addColorStop(0, mix('#fff3cc', '#8a6a4a', 1 - lan)); lg.addColorStop(0.6, mix(GC.lantern, '#7a5a3a', (1 - lan) * 0.8)); lg.addColorStop(1, mix('#e0762e', '#5a3a2a', 1 - lan));
    ctx.fillStyle = lg; ctx.fill(lb);
    ctx.strokeStyle = rgba('#9a4a1a', 0.6); ctx.lineWidth = 1.2; ctx.save(); ctx.clip(lb);
    for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.ellipse(0, i * 8, 26, 3.5, 0, 0, PI); ctx.stroke(); } ctx.restore();
    ctx.strokeStyle = P.ink; ctx.lineWidth = 2.6; ctx.stroke(lb);
    ctx.fillStyle = '#2a1e1a'; ctx.beginPath(); ctx.roundRect(-13, -35, 26, 8, 3); ctx.fill(); ctx.beginPath(); ctx.roundRect(-13, 27, 26, 8, 3); ctx.fill();
    ctx.restore();
    A.glow(ctx, lc.x, lc.y, 60 * lan, '#fff0c0', 0.6 * lan * flick);
    // hand on handle
    paint(ctx, ellipseP(hand.x, hand.y + 2, 10, 11), GC.skin, { sd: 2, lw: 2.6, cx: hand.x, cy: hand.y });
    const lanOut = toOuter(ctx, lc.x, lc.y);
    ctx.restore();
    return { lantern: lanOut };
  };

  // ================================================================ KID
  const KC = { skin: '#ffd6b8', hair: '#6b4226', shirtA: '#f8f4ec', shirtB: '#ec6a3c', jar: '#cfe8f0' };
  A.drawKid = function (ctx, o = {}) {
    const x = o.x ?? 0, y = o.y ?? 0, s = o.s ?? 1, t = o.t ?? 0; const jar = A.clamp(o.jar ?? 1); const wave = A.clamp(o.wave ?? 1);
    const mo = o.mouth || A.mouth('kid', t); const bob = sin(t * 3) * 1.5;
    ctx.save(); const Mo = ctx.getTransform(); ctx.translate(x, y); ctx.scale(s, s);
    const jc = { x: -78 + sin(t * 1.4) * 2, y: -236 + bob };
    begin(ctx, {}, 3, Mo);
    S.light = jar > 0 ? { p: ctx.getTransform().transformPoint(new DOMPoint(jc.x, jc.y)), color: '#d8ff7a', str: jar * 0.8, r: 240 } : null;
    A.glow(ctx, jc.x, jc.y, 150 * jar, '#d6ff6a', 0.35 * jar);
    // torso leaning out
    ctx.save(); ctx.translate(0, 0); ctx.rotate(-0.04);
    const bd = new Path2D(); bd.moveTo(-70, 0); bd.bezierCurveTo(-72, -50, -66, -92, -44, -104); bd.bezierCurveTo(-24, -112, 24, -112, 44, -104); bd.bezierCurveTo(66, -92, 72, -50, 70, 0); bd.closePath();
    paint(ctx, bd, KC.shirtA, { sd: 8, cx: 0, cy: -60, extra: (c) => { c.fillStyle = KC.shirtB; for (let yy = -96; yy < 0; yy += 22) c.fillRect(-80, yy, 160, 10);
      c.fillStyle = rgba(shd(KC.shirtA), 0.0); } });
    // redo shading over stripes
    ctx.save(); ctx.clip(bd); { const k = localKey(ctx.getTransform().inverse()); const p = new Path2D(bd); p.addPath(bd, shift(k.x * 9, k.y * 9)); ctx.fillStyle = rgba('#3a3a8a', 0.3); ctx.fill(p, 'evenodd'); } ctx.restore();
    ctx.strokeStyle = P.ink; ctx.lineWidth = S.lw; ctx.stroke(bd);
    ctx.strokeStyle = P.ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-16, -107); ctx.quadraticCurveTo(0, -94, 16, -107); ctx.stroke();
    ctx.restore();
    // head
    const hx = 4, hy = -160 + bob; const tl = sin(t * 2.2) * 0.05;
    ctx.save(); ctx.translate(hx, hy); ctx.rotate(tl);
    paint(ctx, capsule({ x: 0, y: 30 }, { x: -2, y: 56 }, 13, 15), KC.skin, { sd: 3, cx: 0, cy: 40 });
    // back spikes
    const sp = new Path2D(); const N = 9;
    for (let i = 0; i <= N; i++) { const a = PI + 0.05 + (i / N) * (PI - 0.1); const r1 = 50, r2 = 64 + (i % 2 ? 0 : 6);
      const am = a - (PI / N) * 0.5; const px = cos(a) * r1, py = sin(a) * r1 - 4, qx = cos(am) * r2, qy = sin(am) * r2 - 6;
      if (i === 0) sp.moveTo(px, py); else { sp.lineTo(qx, qy); sp.lineTo(px, py); } }
    sp.lineTo(44, 10); sp.lineTo(-44, 10); sp.closePath();
    paint(ctx, sp, KC.hair, { sd: 5, cx: 0, cy: -20, moon: 0.35 });
    for (const sd of [-1, 1]) paint(ctx, ellipseP(sd * 43, 8, 8, 11), KC.skin, { sd: 2, cx: sd * 43, cy: 8 });
    const hd = new Path2D(); hd.moveTo(-43, -6); hd.bezierCurveTo(-44, -54, 44, -54, 43, -6); hd.bezierCurveTo(43, 28, 26, 46, 0, 46); hd.bezierCurveTo(-26, 46, -43, 28, -43, -6); hd.closePath();
    paint(ctx, hd, KC.skin, { sd: 5, cx: 0, cy: 0 });
    // fringe spikes
    const fr = new Path2D(); fr.moveTo(-46, 4); fr.bezierCurveTo(-50, -40, -20, -58, 4, -56); fr.bezierCurveTo(30, -56, 50, -36, 46, 2);
    const fx = [[46, 2], [34, -14], [26, -4], [14, -18], [4, -6], [-8, -20], [-16, -6], [-28, -18], [-34, -4], [-46, 4]];
    for (let i = 1; i < fx.length; i++) fr.lineTo(fx[i][0], fx[i][1] + (i % 2 ? -4 : 2));
    fr.closePath();
    paint(ctx, fr, KC.hair, { sd: 4, cx: 0, cy: -30, moon: 0.35, extra: (c) => { c.fillStyle = rgba('#a9744a', 0.8); c.beginPath(); c.ellipse(-10, -40, 14, 4, -0.3, 0, TAU); c.fill(); } });
    // eyes (big happy)
    const bl = A.blink(t, 4);
    for (const sd of [-1, 1]) { const ex = sd * 16, ey = 6;
      if (bl < 0.2) { ctx.strokeStyle = P.ink; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(ex - 7, ey + 1); ctx.quadraticCurveTo(ex, ey - 6, ex + 7, ey + 1); ctx.stroke(); continue; }
      ctx.fillStyle = '#2a1a14'; ctx.beginPath(); ctx.ellipse(ex, ey, 6, 8.5, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = rgba('#8a5a3a', 0.9); ctx.beginPath(); ctx.ellipse(ex, ey + 3.5, 4, 3.5, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ex - 2, ey - 3.2, 2.4, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.arc(ex + 2.3, ey + 3, 1.1, 0, TAU); ctx.fill();
      ctx.strokeStyle = P.ink; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(ex - 7, -12); ctx.quadraticCurveTo(ex, -16, ex + 7, -12.5); ctx.stroke(); }
    // cheeks, bandaid, freckles
    ctx.fillStyle = rgba('#ff9a8a', 0.45); ctx.beginPath(); ctx.ellipse(-27, 20, 7, 4, 0, 0, TAU); ctx.ellipse(27, 20, 7, 4, 0, 0, TAU); ctx.fill();
    ctx.save(); ctx.translate(-26, 22); ctx.rotate(-0.5); ctx.scale(0.75, 0.75); ctx.fillStyle = '#f3d7a6'; ctx.strokeStyle = P.ink; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.roundRect(-10, -3.5, 20, 7, 3.5); ctx.fill(); ctx.stroke();
    ctx.fillStyle = rgba('#b08050', 0.6); for (const dx of [-2, 2]) for (const dy of [-1.2, 1.2]) { ctx.beginPath(); ctx.arc(dx, dy, 0.6, 0, TAU); ctx.fill(); } ctx.restore();
    // grin mouth
    const op = Math.max(mo.open, 0.35); const w = 13, h = 4 + op * 11;
    const mp = new Path2D(); mp.moveTo(-w, 27); mp.quadraticCurveTo(0, 30, w, 27); mp.bezierCurveTo(w, 27 + h, -w, 27 + h, -w, 27); mp.closePath();
    ctx.fillStyle = C.mouthIn; ctx.fill(mp); ctx.save(); ctx.clip(mp); ctx.fillStyle = '#fff'; ctx.fillRect(-w, 24, 2 * w, 5.5); ctx.fillStyle = C.tongue; ctx.beginPath(); ctx.ellipse(0, 27 + h, w * 0.6, h * 0.4, 0, 0, TAU); ctx.fill(); ctx.restore();
    ctx.strokeStyle = P.ink; ctx.lineWidth = 2; ctx.stroke(mp);
    ctx.restore();
    // jar arm (screen left)
    const shL = { x: -48, y: -96 }, shR = { x: 50, y: -96 };
    const La = ik(shL, { x: jc.x + 4, y: jc.y + 36 }, 50, 48, 1);
    const drawSleeveArm = (sh, e, w) => { const a = capsule(sh, e, 12, 9.5), b = capsule(e, w, 9.5, 8.5); ctx.lineWidth = S.lw * 2; ctx.strokeStyle = P.ink; ctx.stroke(a); ctx.stroke(b);
      paint(ctx, a, KC.skin, { lw: 0, sd: 3, cx: sh.x, cy: sh.y }); paint(ctx, b, KC.skin, { lw: 0, sd: 3, cx: e.x, cy: e.y });
      const sl = capsule(sh, lerpP(sh, e, 0.55), 15, 13); paint(ctx, sl, KC.shirtA, { sd: 3, cx: sh.x, cy: sh.y, extra: (c) => { c.fillStyle = KC.shirtB; c.fillRect(sh.x - 30, sh.y - 30, 60, 8); } }); };
    drawSleeveArm(shL, La.e, La.w);
    // jar
    ctx.save(); ctx.translate(jc.x, jc.y); ctx.rotate(sin(t * 1.4) * 0.06);
    const jp = new Path2D(); jp.moveTo(-20, -24); jp.lineTo(20, -24); jp.bezierCurveTo(28, -18, 28, 26, 22, 32); jp.lineTo(-22, 32); jp.bezierCurveTo(-28, 26, -28, -18, -20, -24); jp.closePath();
    ctx.fillStyle = rgba('#a8d8e8', 0.28); ctx.fill(jp);
    ctx.save(); ctx.clip(jp); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 7; i++) { const fxx = A.noise(t * 0.8 + i * 3.1, i) * 16, fyy = A.noise(t * 0.7 + i * 5.3, i + 20) * 20 + 4; const tw = 0.5 + 0.5 * sin(t * (3 + i) + i);
      const gr = ctx.createRadialGradient(fxx, fyy, 0, fxx, fyy, 10); gr.addColorStop(0, rgba('#f4ff9a', jar * (0.5 + 0.5 * tw))); gr.addColorStop(1, rgba('#b8ff40', 0)); ctx.fillStyle = gr; ctx.fillRect(fxx - 10, fyy - 10, 20, 20);
      ctx.fillStyle = rgba('#ffffe0', jar * tw); ctx.beginPath(); ctx.arc(fxx, fyy, 1.8, 0, TAU); ctx.fill(); }
    ctx.restore();
    ctx.strokeStyle = rgba('#ffffff', 0.7); ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(-17, -14); ctx.quadraticCurveTo(-21, 6, -17, 24); ctx.stroke();
    ctx.strokeStyle = P.ink; ctx.lineWidth = 2.6; ctx.stroke(jp);
    ctx.fillStyle = '#c24a3a'; ctx.beginPath(); ctx.roundRect(-22, -33, 44, 11, 3); ctx.fill(); ctx.stroke();
    ctx.restore();
    // hand holding jar
    paint(ctx, ellipseP(jc.x + 2, jc.y + 34, 10, 9), KC.skin, { sd: 2, lw: 2.6, cx: jc.x, cy: jc.y + 30 });
    // wave arm (screen right)
    const ea = 0.55 + (1 - wave) * 1.6; const el = add(shR, { x: sin(ea) * 50, y: -cos(ea) * 50 * (wave > 0.3 ? 1 : -1) });
    const b = 0.05 + wave * 0.45 * sin(t * 10); const wr = add(el, { x: sin(b) * 46, y: -cos(b) * 46 });
    drawSleeveArm(shR, el, wr);
    ctx.save(); ctx.translate(wr.x, wr.y); ctx.rotate(b);
    const hp = new Path2D(); hp.moveTo(-9, 2); hp.bezierCurveTo(-11, -10, -8, -20, 0, -20); hp.bezierCurveTo(8, -20, 11, -10, 9, 2); hp.closePath();
    paint(ctx, capsule({ x: -7, y: -2 }, { x: -14, y: -9 }, 3.5, 3), KC.skin, { sd: 1, lw: 2.2 });
    paint(ctx, hp, KC.skin, { sd: 2, lw: 2.6, cx: 0, cy: -8 });
    ctx.strokeStyle = rgba(P.ink, 0.5); ctx.lineWidth = 1; ctx.beginPath(); for (const dx of [-3, 1, 5]) { ctx.moveTo(dx, -20); ctx.lineTo(dx, -13); } ctx.stroke();
    ctx.restore();
    const jarOut = toOuter(ctx, jc.x, jc.y);
    ctx.restore();
    return { jar: jarOut };
  };
})();
