"""Analysis: loudness, peak, DC, clicks, per-second band energy, spectrogram PNG."""
import os, sys
import numpy as np
sys.path.insert(0, os.path.dirname(__file__))
from synth import read_wav, SR
import pyloudnorm as pyln
from scipy import signal


def analyze(path, png=None, t0=0, t1=60):
    x = read_wav(path)
    meter = pyln.Meter(SR)
    L = meter.integrated_loudness(x.T)
    pk = 20 * np.log10(np.abs(x).max() + 1e-12)
    dc = x.mean(axis=1)
    d2 = np.abs(np.diff(x, 2, axis=1)).max()
    print('%s: len %.3fs  I=%.1f LUFS  peak=%.2f dBFS  DC=%s  max|d2|=%.4f' % (
        os.path.basename(path), x.shape[1] / SR, L, pk, np.round(dc, 6), d2))
    m = x.mean(axis=0)
    f, t, S = signal.spectrogram(m, SR, nperseg=4096, noverlap=3072)
    bands = [(20, 250), (250, 1000), (1000, 3000), (3000, 8000), (8000, 20000)]
    print(' t    rms   ' + '  '.join('%d-%d' % b for b in bands))
    for s in range(int(t0), int(t1)):
        seg = m[s * SR:(s + 1) * SR]
        r = 20 * np.log10(np.sqrt(np.mean(seg ** 2)) + 1e-9)
        idx = (t >= s) & (t < s + 1)
        e = [10 * np.log10(S[(f >= a) & (f < b)][:, idx].sum() + 1e-15) for a, b in bands]
        print('%2d %6.1f  ' % (s, r) + '  '.join('%7.1f' % v for v in e))
    if png:
        import matplotlib; matplotlib.use('Agg')
        import matplotlib.pyplot as plt
        fig, ax = plt.subplots(figsize=(22, 7))
        sel = (t >= t0) & (t <= t1)
        ax.pcolormesh(t[sel], f, 10 * np.log10(S[:, sel] + 1e-14), vmin=-130, vmax=-50, shading='auto', cmap='magma')
        ax.set_yscale('symlog', linthresh=500); ax.set_ylim(40, 20000)
        ax.set_xticks(np.arange(t0, t1 + 1, 1))
        ax.grid(alpha=0.3)
        fig.tight_layout(); fig.savefig(png, dpi=60)


if __name__ == '__main__':
    p = sys.argv[1]
    png = sys.argv[2] if len(sys.argv) > 2 else None
    a = float(sys.argv[3]) if len(sys.argv) > 3 else 0
    b = float(sys.argv[4]) if len(sys.argv) > 4 else 60
    analyze(p, png, a, b)
