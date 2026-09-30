"""台詞 + BGM(サイドチェインダッキング) + 効果音 を最終ミックスして audio/final_mix.wav を作る。"""
import json, os
import numpy as np
from scipy.io import wavfile
from scipy.signal import resample_poly, fftconvolve, butter, sosfilt

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SR = 48000
TL = json.load(open(f"{ROOT}/timeline.json"))
N = int(TL["duration"] * SR)

def load(path):
    sr, x = wavfile.read(path)
    x = x.astype(np.float32) / (32768.0 if x.dtype == np.int16 else 1.0) if x.dtype != np.float32 else x
    if x.ndim == 1: x = np.stack([x, x], 1)
    if sr != SR: x = resample_poly(x, SR, sr, axis=0).astype(np.float32)
    out = np.zeros((N, 2), np.float32); out[: min(N, len(x))] = x[:N]
    return out

def reverb_ir(sec=1.6, decay=3.0, seed=1):
    r = np.random.default_rng(seed); n = int(sec * SR); t = np.arange(n) / SR
    ir = r.standard_normal((n, 2)).astype(np.float32) * np.exp(-decay * t)[:, None]
    ir[:, :] = sosfilt(butter(2, 6000, 'low', fs=SR, output='sos'), ir, axis=0)
    return ir / np.sqrt((ir ** 2).sum(0))

# 台詞ごとの空間処理（話者の位置・距離感）
SPACE = {"narrator": (0.0, 0.10), "mio": (-0.08, 0.07), "hoshi": (0.10, 0.09), "grandpa": (-0.35, 0.22), "kid": (0.35, 0.22)}
voice = np.zeros((N, 2), np.float32); IR = reverb_ir()
for l in TL["lines"]:
    sr, x = wavfile.read(f"{ROOT}/{l['file']}"); x = x.astype(np.float32) / 32768.0
    if sr != SR: x = resample_poly(x, SR, sr).astype(np.float32)
    x = sosfilt(butter(2, 90, 'high', fs=SR, output='sos'), x)
    pan, wet = SPACE[l["speaker"]]
    st = np.stack([x * np.sqrt(0.5 * (1 - pan)), x * np.sqrt(0.5 * (1 + pan))], 1) * np.sqrt(2)
    rv = np.stack([fftconvolve(st[:, 0], IR[:, 0]), fftconvolve(st[:, 1], IR[:, 1])], 1)
    y = np.zeros_like(rv); y[: len(st)] += st * (1 - wet); y += rv * wet * 1.4
    i0 = int(l["start"] * SR); i1 = min(N, i0 + len(y)); voice[i0:i1] += y[: i1 - i0]
# 台詞のラウドネスを揃える（-3 dBFS ピーク目安）
voice *= 0.7 / max(1e-6, np.abs(voice).max())

bgm = load(f"{ROOT}/audio/bgm.wav") if os.path.exists(f"{ROOT}/audio/bgm.wav") else np.zeros((N, 2), np.float32)
sfx = load(f"{ROOT}/audio/sfx.wav") if os.path.exists(f"{ROOT}/audio/sfx.wav") else np.zeros((N, 2), np.float32)

# サイドチェイン: 台詞の包絡でBGMを最大 -7dB ダッキング（アタック80ms / リリース400ms）
env = np.abs(voice).max(1); k = int(0.02 * SR)
env = np.convolve(env, np.ones(k) / k, 'same'); gate = (env > 0.01).astype(np.float32)
g = np.empty(N, np.float32); cur = 0.0; a_up = 1 - np.exp(-1 / (0.08 * SR)); a_dn = 1 - np.exp(-1 / (0.4 * SR))
for i in range(N):
    cur += (gate[i] - cur) * (a_up if gate[i] > cur else a_dn); g[i] = cur
duck = 10 ** (-6 * g / 20)

def rms(x): return np.sqrt(np.mean(x ** 2) + 1e-12)
bgm_gain = 0.36 / max(rms(bgm), 1e-6) * rms(voice) if rms(bgm) > 1e-5 else 0
mix = voice + bgm * bgm_gain * duck[:, None] * 1.0 + sfx * 0.9
# ソフトリミッタ
peak = np.abs(mix).max(); mix = np.tanh(mix / max(peak, 1) * 1.2) / np.tanh(1.2) * 0.93
wavfile.write(f"{ROOT}/audio/final_mix.wav", SR, (mix * 32767).astype(np.int16))
print("mix written; bgm gain", round(float(bgm_gain), 3), "peak before limit", round(float(peak), 3))
