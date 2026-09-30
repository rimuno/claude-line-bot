// ===== core.js : 共通ユーティリティ（全シーン・全ライブラリが使う） =====
// すべての描画は時間 t に対して決定的（同じ t なら同じ絵）でなければならない。Math.random() 禁止。A.rng を使う。
(function () {
  const A = (window.A = window.A || {});
  A.W = 1920; A.H = 1080;
  A.T = window.TIMELINE;          // timeline.json の中身（lines, scenes, fps, duration）
  A.scenes = A.scenes || {};
  A.scene = (id, def) => { A.scenes[id] = def; };

  // ---- 数学 ----
  A.clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
  A.lerp = (a, b, k) => a + (b - a) * k;
  A.range = (t, a, b) => A.clamp((t - a) / (b - a));           // t を [a,b] で 0..1 に
  A.smooth = (x) => { x = A.clamp(x); return x * x * (3 - 2 * x); };
  A.ease = {
    linear: (x) => x,
    inSine: (x) => 1 - Math.cos((x * Math.PI) / 2),
    outSine: (x) => Math.sin((x * Math.PI) / 2),
    inOutSine: (x) => -(Math.cos(Math.PI * x) - 1) / 2,
    inCubic: (x) => x * x * x,
    outCubic: (x) => 1 - Math.pow(1 - x, 3),
    inOutCubic: (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
    outBack: (x) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); },
    outElastic: (x) => x === 0 ? 0 : x === 1 ? 1 : Math.pow(2, -10 * x) * Math.sin((x * 10 - 0.75) * (2 * Math.PI / 3)) + 1,
    outQuint: (x) => 1 - Math.pow(1 - x, 5),
  };
  // tween: t の時刻 a→b で v0→v1 （イージング付き・範囲外はクランプ）
  A.tween = (t, a, b, v0, v1, e = A.ease.inOutCubic) => A.lerp(v0, v1, e(A.range(t, a, b)));

  // ---- 決定的乱数・ノイズ ----
  A.rng = (seed) => { let s = seed >>> 0 || 1; return () => { s |= 0; s = (s + 0x6d2b79f5) | 0; let r = Math.imul(s ^ (s >>> 15), 1 | s); r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r; return ((r ^ (r >>> 14)) >>> 0) / 4294967296; }; };
  A.hash = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453123; return x - Math.floor(x); };
  A.noise = (x, seed = 0) => { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return A.lerp(A.hash(i + seed * 57.3), A.hash(i + 1 + seed * 57.3), u) * 2 - 1; }; // -1..1
  A.noise2 = (x, y, seed = 0) => { const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy; const h = (a, b) => A.hash(a * 17.17 + b * 91.31 + seed * 13.7); const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy); return A.lerp(A.lerp(h(ix, iy), h(ix + 1, iy), ux), A.lerp(h(ix, iy + 1), h(ix + 1, iy + 1), ux), uy) * 2 - 1; };

  // ---- 色 ----
  A.PAL = {
    night0: '#070a24', night1: '#101743', night2: '#1d2466', violet: '#3a2d6e', dusk: '#6a4a8c',
    teal: '#2b6f86', moon: '#f4f1dc', ink: '#241c3f',          // ink = 線画の色
    star: '#ffe28a', starCore: '#fffbe6', starDim: '#b9ab86',
    warm: '#ffc764', warm2: '#ff9a4a', ember: '#ff6d3a',
    grass0: '#12304a', grass1: '#1d4a5c', grass2: '#2d6a6a',
    mioHair: '#2a2c5e', mioDress: '#7fc4e8', mioCardigan: '#f3e6cc', mioSkin: '#ffe0cc', mioCheek: '#ff9fa0', mioShoe: '#e2505a',
  };
  A.rgba = (hex, a = 1) => { const n = parseInt(hex.slice(1), 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`; };
  A.mix = (h1, h2, k) => { const p = (h) => parseInt(h.slice(1), 16); const a = p(h1), b = p(h2); const c = (s) => Math.round(A.lerp((a >> s) & 255, (b >> s) & 255, k)); return `rgb(${c(16)},${c(8)},${c(0)})`; };

  // ---- 描画ヘルパ ----
  // 柔らかい発光（加算合成）。
  A.glow = (ctx, x, y, r, color, alpha = 1) => {
    if (r <= 0 || alpha <= 0) return;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, A.rgba(color, alpha)); g.addColorStop(0.25, A.rgba(color, alpha * 0.45));
    g.addColorStop(0.6, A.rgba(color, alpha * 0.12)); g.addColorStop(1, A.rgba(color, 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  };
  // カメラ: 画面中心(cx,cy)を見て zoom 倍・rot ラジアン回転。fn の中はワールド座標(1920x1080基準)
  A.camera = (ctx, cam, fn) => {
    const { x = A.W / 2, y = A.H / 2, zoom = 1, rot = 0 } = cam || {};
    ctx.save(); ctx.translate(A.W / 2, A.H / 2); ctx.rotate(rot); ctx.scale(zoom, zoom); ctx.translate(-x, -y); fn(); ctx.restore();
  };
  // 手持ちカメラ風の微揺れ
  A.shake = (t, amp = 1, seed = 1) => ({ dx: A.noise(t * 0.7, seed) * amp, dy: A.noise(t * 0.6, seed + 9) * amp });

  // ---- 台詞・口パク ----
  const VOPEN = { a: 1.0, o: 0.8, e: 0.65, i: 0.35, u: 0.45, N: 0.12, c: 0.2, cl: 0.05, pau: 0 };
  A.lineAt = (speaker, t) => (A.T.lines || []).find((l) => l.speaker === speaker && t >= l.start && t <= l.end);
  A.isSpeaking = (speaker, t) => !!A.lineAt(speaker, t);
  // 戻り値 {v: 'a'|'i'|'u'|'e'|'o'|'N'|'closed', open: 0..1}。話していなければ closed/0。
  A.mouth = (speaker, t) => {
    const l = A.lineAt(speaker, t); if (!l) return { v: 'closed', open: 0 };
    const lt = t - l.start; let open = 0, v = 'closed', wsum = 0;
    // 前後40msの窓で平滑化
    for (const d of [-0.04, -0.02, 0, 0.02, 0.04]) {
      const q = lt + d; const vi = l.visemes.find((x) => q >= x[0] && q < x[1]);
      const w = 1 - Math.abs(d) * 12; wsum += w;
      if (vi) { open += (VOPEN[vi[2]] ?? 0.3) * w; if (d === 0) v = vi[2]; }
    }
    open /= wsum; if (v === 'pau' || v === 'cl' || v === 'c') v = open > 0.3 ? 'a' : 'closed';
    return { v: open < 0.06 ? 'closed' : v, open };
  };
  // まばたき：1=開, 0=閉。seed でキャラごとにずらす。
  A.blink = (t, seed = 0) => {
    const period = 3.2; const k = Math.floor((t + seed * 1.37) / period);
    const offs = A.hash(k + seed * 31) * (period - 0.4);
    const lt = t + seed * 1.37 - k * period - offs;
    if (lt < 0 || lt > 0.16) return 1;
    return Math.abs(lt - 0.08) / 0.08;
  };
})();
