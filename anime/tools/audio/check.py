"""Click / DC / stereo checks."""
import os, sys
import numpy as np
sys.path.insert(0, os.path.dirname(__file__))
from synth import read_wav, bq, SR
for p in sys.argv[1:]:
    x = read_wav(p)
    h = bq(x, 'hp', 14000, 0.7)
    e = np.abs(h).max(axis=0)
    # local reference: moving 20 ms RMS of hp signal
    k = int(0.02 * SR)
    ref = np.sqrt(np.convolve(np.mean(h ** 2, axis=0), np.ones(k) / k, mode='same')) + 1e-5
    ratio = e / ref
    idx = np.where((ratio > 12) & (e > 0.004))[0]
    groups = []
    for i in idx:
        if not groups or i - groups[-1][-1] > SR * 0.01:
            groups.append([i])
        else:
            groups[-1].append(i)
    corr = np.corrcoef(x[0], x[1])[0, 1]
    side = np.sqrt(np.mean((x[0] - x[1]) ** 2)); mid = np.sqrt(np.mean((x[0] + x[1]) ** 2))
    print('%s: click candidates %d %s | L/R corr %.2f  side/mid %.2f | first/last sample %.5f %.5f' % (
        os.path.basename(p), len(groups), [round(g[0] / SR, 3) for g in groups[:12]], corr, side / mid,
        np.abs(x[:, 0]).max(), np.abs(x[:, -1]).max()))
