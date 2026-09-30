"""Quick sanity mix: BGM (-8 dB) + SFX + dialogue lines at timeline start times -> audio/test_mix.wav"""
import os, sys, json
import numpy as np
sys.path.insert(0, os.path.dirname(__file__))
from synth import read_wav, write_wav, SR, N, soft_limit

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
bgm_db = float(sys.argv[1]) if len(sys.argv) > 1 else -8.0
sfx_db = float(sys.argv[2]) if len(sys.argv) > 2 else -4.0
bgm = read_wav(os.path.join(ROOT, 'audio', 'bgm.wav'))
sfx = read_wav(os.path.join(ROOT, 'audio', 'sfx.wav'))
dia = np.zeros((2, N))
tl = json.load(open(os.path.join(ROOT, 'timeline.json')))
for ln in tl['lines']:
    x = read_wav(os.path.join(ROOT, ln['file']))
    i = int(round(ln['start'] * SR))
    n = min(x.shape[1], N - i)
    dia[:, i:i + n] += x[:, :n]
mix = bgm * 10 ** (bgm_db / 20) + sfx * 10 ** (sfx_db / 20) + dia
mix = soft_limit(mix, -1.0)
write_wav(os.path.join(ROOT, 'audio', 'test_mix.wav'), mix)
import pyloudnorm as pyln
m = pyln.Meter(SR)
print('test_mix LUFS %.1f  dialogue-only %.1f  bgm(scaled) %.1f  sfx(scaled) %.1f  peak %.2f' % (
    m.integrated_loudness(mix.T), m.integrated_loudness(dia.T), m.integrated_loudness((bgm * 10 ** (bgm_db / 20)).T),
    m.integrated_loudness((sfx * 10 ** (sfx_db / 20)).T), 20 * np.log10(np.abs(mix).max())))
# per-line: dialogue vs background loudness (momentary-ish RMS over line span, K-weight approx skipped)
for ln in tl['lines']:
    a, b = int(ln['start'] * SR), int(ln['end'] * SR)
    d = 10 * np.log10(np.mean(dia[:, a:b] ** 2) + 1e-12)
    bg = 10 * np.log10(np.mean((bgm * 10 ** (bgm_db / 20) + sfx * 10 ** (sfx_db / 20))[:, a:b] ** 2) + 1e-12)
    print('line %2d %5.1f-%5.1f  dia %6.1f dB  bg %6.1f dB  SNR %5.1f' % (ln['index'], ln['start'], ln['end'], d, bg, d - bg))

# speech-band (300 Hz – 4 kHz) SNR, separately for BGM and SFX
from synth import bq
def sb(x):
    return bq(bq(x, 'hp', 300), 'lp', 4000)
dS, bS, sS = sb(dia), sb(bgm * 10 ** (bgm_db / 20)), sb(sfx * 10 ** (sfx_db / 20))
print('speech-band SNR (dialogue vs bgm / sfx):')
for ln in tl['lines']:
    a, b = int(ln['start'] * SR), int(ln['end'] * SR)
    e = lambda y: 10 * np.log10(np.mean(y[:, a:b] ** 2) + 1e-12)
    print('line %2d  vs bgm %5.1f  vs sfx %5.1f' % (ln['index'], e(dS) - e(bS), e(dS) - e(sS)))
