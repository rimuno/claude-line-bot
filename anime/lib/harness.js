// ===== harness.js : シーン切替・トランジション・字幕・仕上げ =====
(function () {
  const A = window.A, W = A.W, H = A.H;
  const main = document.getElementById('c'); const ctx = main.getContext('2d');
  const mk = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; };
  const bufA = mk(), bufB = mk();
  const SC = A.T.scenes;

  function drawScene(i, t, target) {
    const s = SC[i]; const def = A.scenes[s.id]; const c = target.getContext('2d');
    c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
    c.fillStyle = '#000'; c.fillRect(0, 0, W, H);
    if (def) { try { def.draw(c, t - s.start, t, { start: s.start, end: s.end, dur: s.end - s.start }); } catch (e) { console.error(s.id, e); c.fillStyle = '#f00'; c.font = '40px sans-serif'; c.fillText(s.id + ': ' + e.message, 40, 80); } }
    else { c.fillStyle = '#222'; c.fillRect(0, 0, W, H); c.fillStyle = '#fff'; c.font = '60px sans-serif'; c.fillText('[' + s.id + ']', 80, 140); }
    c.restore();
  }
  // 各シーンは def.transitionIn = {type:'fade'|'cut'|'white'|'black', dur:秒} を指定可（既定 fade 0.6秒）
  function renderScenes(t) {
    let i = SC.findIndex((s) => t >= s.start && t < s.end); if (i < 0) i = t < 0 ? 0 : SC.length - 1;
    // 境界付近か？
    const trIn = (k) => ((A.scenes[SC[k].id] || {}).transitionIn) || { type: 'fade', dur: 0.6 };
    for (const k of [i, i + 1]) {
      if (k <= 0 || k >= SC.length) continue; const B = SC[k].start; const tr = trIn(k); const d = tr.dur || 0;
      if (tr.type === 'cut' || d <= 0) continue;
      if (t >= B - d / 2 && t < B + d / 2) {
        const p = A.smooth((t - (B - d / 2)) / d);
        drawScene(k - 1, t, bufA); drawScene(k, t, bufB);
        ctx.globalAlpha = 1; ctx.drawImage(bufA, 0, 0);
        if (tr.type === 'white' || tr.type === 'black') {
          const col = tr.type === 'white' ? '#fff' : '#000';
          ctx.drawImage(p < 0.5 ? bufA : bufB, 0, 0);
          ctx.globalAlpha = 1 - Math.abs(p - 0.5) * 2; ctx.fillStyle = col; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1;
        } else { ctx.globalAlpha = p; ctx.drawImage(bufB, 0, 0); ctx.globalAlpha = 1; }
        return;
      }
    }
    drawScene(i, t, bufA); ctx.drawImage(bufA, 0, 0);
  }

  const SPEAKER_COLOR = { narrator: '#d9d4ff', mio: '#9fe0ff', hoshi: '#ffe28a', grandpa: '#ffc79a', kid: '#b8ffb0' };
  function subtitles(t) {
    for (const l of A.T.lines) {
      const a = A.range(t, l.start - 0.12, l.start + 0.05) * (1 - A.range(t, l.end + 0.15, l.end + 0.35));
      if (a <= 0) continue;
      const narr = l.speaker === 'narrator';
      ctx.save(); ctx.globalAlpha = a; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = narr ? "700 50px 'Kaisei'" : "700 54px 'ZenMaru'";
      const y = H - 92 + (1 - a) * 8;
      ctx.lineJoin = 'round'; ctx.lineWidth = 12; ctx.strokeStyle = 'rgba(10,8,30,0.85)'; ctx.strokeText(l.text, W / 2, y);
      ctx.fillStyle = SPEAKER_COLOR[l.speaker] || '#fff'; ctx.fillText(l.text, W / 2, y);
      ctx.restore();
    }
  }
  function post(t) {
    // ビネット
    const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, H * 1.05);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(5,3,20,0.55)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // 微細なフィルムグレイン（決定的）
    const r = A.rng(Math.floor(t * 30) + 7); ctx.save(); ctx.globalAlpha = 0.035;
    for (let k = 0; k < 900; k++) { ctx.fillStyle = r() < 0.5 ? '#fff' : '#000'; ctx.fillRect(r() * W, r() * H, 2, 2); }
    ctx.restore();
    // 冒頭・末尾のフェード
    const fa = Math.max(1 - A.range(t, 0, 0.8), A.range(t, A.T.duration - 0.6, A.T.duration));
    if (fa > 0) { ctx.fillStyle = `rgba(0,0,0,${fa})`; ctx.fillRect(0, 0, W, H); }
  }
  window.renderFrame = function (t, opts = {}) {
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    renderScenes(t); if (!opts.noSubs) subtitles(t); post(t);
  };
  window.frameJPEG = (t, q = 0.93) => { window.renderFrame(t); return main.toDataURL('image/jpeg', q); };
  window.framePNG = (t) => { window.renderFrame(t); return main.toDataURL('image/png'); };
  // コンタクトシート: times の各フレームを縮小してグリッドに並べる
  window.contactSheet = function (times, cols = 4) {
    const cw = 480, ch = 270, rows = Math.ceil(times.length / cols); const s = document.createElement('canvas');
    s.width = cols * cw; s.height = rows * (ch + 28); const c = s.getContext('2d'); c.fillStyle = '#111'; c.fillRect(0, 0, s.width, s.height);
    times.forEach((t, k) => { window.renderFrame(t); const x = (k % cols) * cw, y = Math.floor(k / cols) * (ch + 28); c.drawImage(main, x, y + 28, cw, ch); c.fillStyle = '#fff'; c.font = '20px sans-serif'; c.fillText('t=' + t.toFixed(2), x + 6, y + 20); });
    return s.toDataURL('image/png');
  };
  window.READY = document.fonts.ready.then(() => Promise.all(["700 50px 'Kaisei'", "700 54px 'ZenMaru'", "500 54px 'ZenMaru'"].map((f) => document.fonts.load(f, 'あ星'))));
})();
