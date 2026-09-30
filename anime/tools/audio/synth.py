"""Shared synthesis toolkit for 『星をひろった夜』 score + SFX.
Everything is deterministic (seeded RNG). 48 kHz stereo float buffers of shape (2, N).
"""
import numpy as np
from scipy import signal

SR = 48000
DUR = 60.0
N = int(SR * DUR)
TWO_PI = 2 * np.pi


def midi_hz(m):
    return 440.0 * 2 ** ((m - 69) / 12.0)


class Bus:
    """Stereo dry bus + reverb send bus."""

    def __init__(self, n=N):
        self.dry = np.zeros((2, n))
        self.send = np.zeros((2, n))

    def add(self, sig, t0, pan=0.0, gain=1.0, send=0.3, width=0.0):
        """sig mono (n,) or stereo (2,n). pan -1..1 equal power."""
        i0 = int(round(t0 * SR))
        if sig.ndim == 1:
            th = (pan + 1) * np.pi / 4
            st = np.vstack([sig * np.cos(th), sig * np.sin(th)]) * np.sqrt(2) * 0.7071
        else:
            st = sig
        st = st * gain
        n = st.shape[1]
        a, b = max(0, i0), min(self.dry.shape[1], i0 + n)
        if b <= a:
            return
        seg = st[:, a - i0:b - i0]
        self.dry[:, a:b] += seg
        self.send[:, a:b] += seg * send


# ---------------------------------------------------------------- envelopes

def adsr(n, a, d, s, r, sustain_len=None):
    """sample-count based ADSR. a,d,r in seconds; sustain level s; sustain_len total note-on secs."""
    t = np.arange(n) / SR
    env = np.ones(n) * s
    ai = max(1, int(a * SR))
    env[:ai] = np.linspace(0, 1, ai) ** 1.5 if ai < n else np.linspace(0, 1, n)[:n]
    if d > 0:
        dm = (t >= a) & (t < a + d)
        env[dm] = 1 - (1 - s) * ((t[dm] - a) / d)
    if sustain_len is not None:
        rm = t >= sustain_len
        if rm.any():
            lvl = env[rm][0] if rm.any() else s
            env[rm] = lvl * np.exp(-(t[rm] - sustain_len) / max(r / 4.6, 1e-3))
    return env


def fade_edges(x, fi=0.003, fo=0.02):
    n = x.shape[-1]
    a = min(n, int(fi * SR)); b = min(n, int(fo * SR))
    if a > 0:
        x[..., :a] *= np.linspace(0, 1, a)
    if b > 0:
        x[..., n - b:] *= np.linspace(1, 0, b)
    return x


# ---------------------------------------------------------------- filters

def bq(x, kind, f, q=0.707, gain_db=0.0):
    """RBJ biquad; x can be 1-D or 2-D (filtered along last axis)."""
    A = 10 ** (gain_db / 40)
    w0 = TWO_PI * min(f, SR * 0.49) / SR
    al = np.sin(w0) / (2 * q)
    c = np.cos(w0)
    if kind == 'lp':
        b = [(1 - c) / 2, 1 - c, (1 - c) / 2]; a = [1 + al, -2 * c, 1 - al]
    elif kind == 'hp':
        b = [(1 + c) / 2, -(1 + c), (1 + c) / 2]; a = [1 + al, -2 * c, 1 - al]
    elif kind == 'bp':
        b = [al, 0, -al]; a = [1 + al, -2 * c, 1 - al]
    elif kind == 'peak':
        b = [1 + al * A, -2 * c, 1 - al * A]; a = [1 + al / A, -2 * c, 1 - al / A]
    elif kind == 'lowshelf':
        sq = 2 * np.sqrt(A) * al
        b = [A * ((A + 1) - (A - 1) * c + sq), 2 * A * ((A - 1) - (A + 1) * c), A * ((A + 1) - (A - 1) * c - sq)]
        a = [(A + 1) + (A - 1) * c + sq, -2 * ((A - 1) + (A + 1) * c), (A + 1) + (A - 1) * c - sq]
    elif kind == 'highshelf':
        sq = 2 * np.sqrt(A) * al
        b = [A * ((A + 1) + (A - 1) * c + sq), -2 * A * ((A - 1) + (A + 1) * c), A * ((A + 1) + (A - 1) * c - sq)]
        a = [(A + 1) - (A - 1) * c + sq, 2 * ((A - 1) - (A + 1) * c), (A + 1) - (A - 1) * c - sq]
    else:
        raise ValueError(kind)
    return signal.lfilter(np.array(b) / a[0], np.array(a) / a[0], x, axis=-1)


def sweep_filter(x, fc_curve, kind='bp', q=1.0, block=256):
    """Time-varying biquad (block-wise coefficient update, state carried)."""
    y = np.zeros_like(x)
    zi = np.zeros(2)
    for s in range(0, len(x), block):
        e = min(len(x), s + block)
        f = float(np.clip(fc_curve[s], 20, SR * 0.45))
        w0 = TWO_PI * f / SR; al = np.sin(w0) / (2 * q); c = np.cos(w0)
        if kind == 'bp':
            b = [al, 0, -al]
        elif kind == 'lp':
            b = [(1 - c) / 2, 1 - c, (1 - c) / 2]
        else:
            b = [(1 + c) / 2, -(1 + c), (1 + c) / 2]
        a = [1 + al, -2 * c, 1 - al]
        b = np.array(b) / a[0]; a = np.array(a) / a[0]
        y[s:e], zi = signal.lfilter(b, a, x[s:e], zi=zi)
    return y


# ---------------------------------------------------------------- oscillators

def phase_from_freq(f):
    return TWO_PI * np.cumsum(f) / SR


def vibrato_curve(n, f0, rate=5.2, depth_cents=10, delay=0.3, rng=None, drift_cents=3):
    t = np.arange(n) / SR
    ph = rng.uniform(0, TWO_PI) if rng is not None else 0
    ramp = np.clip((t - delay) / 0.6, 0, 1)
    r = rate * (1 + 0.04 * np.sin(TWO_PI * 0.37 * t + ph))
    vib = depth_cents * ramp * np.sin(TWO_PI * np.cumsum(r) / SR + ph)
    drift = drift_cents * np.sin(TWO_PI * 0.23 * t + 2 * ph)
    return f0 * 2 ** ((vib + drift) / 1200.0)


# ---------------------------------------------------------------- instruments
# each returns a mono numpy array starting at the note onset

def piano(m, dur, vel=0.7, rng=None):
    f0 = midi_hz(m)
    tail = 2.2 if m < 72 else 1.4
    n = int((dur + tail) * SR)
    t = np.arange(n) / SR
    B = 0.00018 * (f0 / 261.6) ** 0.8
    out = np.zeros(n)
    bright = 0.35 + 0.65 * vel
    tau0 = np.clip(3.2 * (261.6 / f0) ** 0.6, 0.7, 6.0)
    nk = int(min(18, (7000 / f0)))
    for k in range(1, nk + 1):
        fk = k * f0 * np.sqrt(1 + B * k * k)
        if fk > 9000:
            break
        amp = (1.0 / k ** 1.15) * np.exp(-(k - 1) * (0.55 - 0.35 * bright) * 0.6)
        if k == 1:
            amp *= 0.9
        tau_fast = tau0 * 0.18 / (1 + 0.25 * k)
        tau_slow = tau0 / (1 + 0.18 * k)
        env = 0.55 * np.exp(-t / tau_fast) + 0.45 * np.exp(-t / tau_slow)
        det = 1 + (0.35 + 0.2 * k * 0.1) * 1e-3 * (rng.uniform(-1, 1) if rng is not None else 0.5)
        ph1 = rng.uniform(0, TWO_PI) if rng is not None else 0
        s = np.sin(TWO_PI * fk * t + ph1) + 0.8 * np.sin(TWO_PI * fk * det * t + ph1 * 1.7)
        out += amp * env * s * 0.5
    # hammer thump
    hn = int(0.012 * SR)
    ham = (rng.standard_normal(hn) if rng is not None else np.random.standard_normal(hn))
    ham = bq(ham, 'lp', min(4000, f0 * 6)) * np.hanning(hn * 2)[hn:] * 0.08 * vel
    out[:hn] += ham
    # damper release
    off = int(dur * SR)
    rel = np.ones(n)
    if off < n:
        rel[off:] = np.exp(-(t[off:] - dur) / 0.25)
    out *= rel
    atk = int(0.002 * SR)
    out[:atk] *= np.linspace(0, 1, atk)
    out = fade_edges(out, 0.0, 0.05)
    return out * vel ** 1.3 * 0.5


def bell(m, ratios, amps, decays, vel=0.7, dur_extra=0.0, rng=None, attack=0.002, detune=0.0015,
         click=0.0, glide=0.0):
    f0 = midi_hz(m)
    L = max(decays) * 5 + dur_extra
    n = int(L * SR)
    t = np.arange(n) / SR
    out = np.zeros(n)
    for r, a, d in zip(ratios, amps, decays):
        f = f0 * r
        if f > 16000:
            continue
        ph = rng.uniform(0, TWO_PI) if rng is not None else 0
        dt = 1 + detune * (rng.uniform(-1, 1) if rng is not None else 0.3)
        fcurve = f * (1 + glide * np.exp(-t / 0.03)) if glide else f
        s = np.sin(TWO_PI * fcurve * t + ph) * 0.6 + 0.4 * np.sin(TWO_PI * f * dt * t + ph * 1.3)
        out += a * np.exp(-t / d) * s
    ai = max(2, int(attack * SR))
    out[:ai] *= np.linspace(0, 1, ai) ** 2
    if click > 0 and rng is not None:
        cn = int(0.004 * SR)
        c = bq(rng.standard_normal(cn), 'hp', 3000) * np.linspace(1, 0, cn) ** 3
        out[:cn] += c * click
    return fade_edges(out, 0, 0.05) * vel


def music_box(m, vel=0.6, rng=None):
    return bell(m, [1.0, 2.0, 5.40, 6.27, 11.2], [1.0, 0.10, 0.22, 0.10, 0.04],
                [1.4, 0.7, 0.25, 0.18, 0.08], vel=vel, rng=rng, attack=0.0015, click=0.06) * 0.5


def celesta(m, vel=0.6, rng=None):
    return bell(m, [1.0, 2.0, 3.0, 4.07, 8.9], [1.0, 0.18, 0.05, 0.22, 0.04],
                [1.1, 0.5, 0.3, 0.25, 0.08], vel=vel, rng=rng, attack=0.004, click=0.03) * 0.5


def glock(m, vel=0.6, rng=None):
    return bell(m, [1.0, 2.76, 5.40, 8.93], [1.0, 0.35, 0.15, 0.06],
                [1.8, 0.6, 0.25, 0.12], vel=vel, rng=rng, attack=0.0015, click=0.04) * 0.45


def karplus(m, dur, vel=0.7, t60=1.2, bright=0.5, rng=None, pluck_pos=0.2):
    """Karplus-Strong: y[n] = x[n] + g*((1-c)*y[n-L] + c*y[n-L-1]); total loop delay ~ L + c."""
    f0 = midi_hz(m)
    D = SR / f0
    L = int(np.floor(D))
    c = float(np.clip(D - L, 0.0, 1.0))
    g = 10 ** (-3 / (t60 * f0))
    n = int((dur + t60) * SR)
    p = max(1, int(pluck_pos * L))
    tri = np.concatenate([np.linspace(0, 1, p, endpoint=False), np.linspace(1, 0, L + 1 - p)])
    tri -= tri.mean()
    nz = bq(rng.standard_normal(L + 1), 'lp', 800 + 7000 * bright)
    exc = tri * 2.0 + nz * (0.15 + 0.35 * bright)
    x = np.zeros(n)
    x[:len(exc)] = exc * vel
    a = np.zeros(L + 2)
    a[0] = 1.0
    a[L] = -g * (1 - c)
    a[L + 1] = -g * c
    y = signal.lfilter([1.0], a, x)
    y = bq(y, 'lp', 1200 + 6000 * bright)
    t = np.arange(n) / SR
    off = int(dur * SR)
    if off < n:
        y[off:] *= np.exp(-(t[off:] - dur) / 0.12)
    y = bq(y, 'hp', 40)
    return fade_edges(y, 0.001, 0.03) * 0.35


def pizz(m, vel=0.7, rng=None):
    return karplus(m, 0.5, vel, t60=0.55, bright=0.25, rng=rng, pluck_pos=0.3) * 1.2


def harp(m, vel=0.6, dur=2.0, rng=None):
    return karplus(m, dur, vel, t60=2.6 * (261.6 / midi_hz(m)) ** 0.3, bright=0.35, rng=rng, pluck_pos=0.12)


def string_voice(m, dur, vel=0.6, rng=None, attack=0.35, release=0.7, fc=2200, voices=5,
                 detune_cents=7, vib=9, bow_noise=0.02):
    """Warm string ensemble note (additive saw ensemble, low-passed)."""
    f0 = midi_hz(m)
    n = int((dur + release) * SR)
    t = np.arange(n) / SR
    out = np.zeros(n)
    nk = int(min(24, 7000 / f0))
    ks = np.arange(1, nk + 1)
    # amplitude spectrum: saw * lowpass rolloff * slight formant (body) bump ~ 450 Hz
    fk = ks * f0
    amp = (1 / ks) / np.sqrt(1 + (fk / fc) ** 4) * (1 + 0.5 * np.exp(-((fk - 450) / 250) ** 2))
    for v in range(voices):
        dc = detune_cents * ((v - (voices - 1) / 2) / max(1, (voices - 1) / 2)) + rng.uniform(-1.5, 1.5)
        fc_ = vibrato_curve(n, f0 * 2 ** (dc / 1200), rate=rng.uniform(4.7, 5.8), depth_cents=vib,
                            delay=0.25, rng=rng)
        ph = phase_from_freq(fc_)
        for k, a in zip(ks, amp):
            out += a * np.sin(k * ph + rng.uniform(0, TWO_PI))
    out /= voices
    env = adsr(n, attack, 0.0, 1.0, release, sustain_len=dur)
    # slow bow-pressure swell
    env *= 0.9 + 0.1 * np.sin(np.pi * np.clip(t / max(dur, 0.1), 0, 1))
    if bow_noise > 0:
        bn = bq(rng.standard_normal(n), 'bp', min(3000, f0 * 4), 0.7) * bow_noise
        out += bn
    out = out * env
    return fade_edges(out, 0.0, 0.03) * vel * 0.35


def choir(m, dur, vel=0.5, rng=None, attack=0.6, release=1.0, voices=4, vowel='ah'):
    f0 = midi_hz(m)
    n = int((dur + release) * SR)
    formants = {'ah': [(700, 110, 1.0), (1100, 130, 0.35), (2600, 200, 0.05), (3300, 250, 0.04)],
                'oo': [(400, 90, 1.0), (800, 120, 0.25), (2400, 200, 0.03)]}[vowel]
    nk = int(min(30, 5000 / f0))
    ks = np.arange(1, nk + 1)
    fk = ks * f0
    g = np.zeros(nk)
    for F, bw, a in formants:
        g += a / (1 + ((fk - F) / bw) ** 2)
    amp = g * (1 / ks ** 0.6) + 0.02 / ks
    out = np.zeros(n)
    for v in range(voices):
        dc = rng.uniform(-9, 9)
        fcurve = vibrato_curve(n, f0 * 2 ** (dc / 1200), rate=rng.uniform(4.6, 5.6), depth_cents=14,
                               delay=0.35, rng=rng, drift_cents=4)
        ph = phase_from_freq(fcurve)
        for k, a in zip(ks, amp):
            out += a * np.sin(k * ph + rng.uniform(0, TWO_PI))
    out /= voices
    breath = bq(rng.standard_normal(n), 'bp', 900, 0.8) * 0.01
    out += breath
    env = adsr(n, attack, 0.0, 1.0, release, sustain_len=dur)
    return fade_edges(out * env, 0, 0.03) * vel * 0.6


def timpani(m, vel=0.6, rng=None, dur=2.0):
    f0 = midi_hz(m)
    n = int(dur * SR)
    t = np.arange(n) / SR
    pitch = f0 * (1 + 0.04 * np.exp(-t / 0.08))
    ph = phase_from_freq(pitch)
    out = (np.sin(ph) * np.exp(-t / 0.9) + 0.5 * np.sin(1.504 * ph) * np.exp(-t / 0.5)
           + 0.3 * np.sin(1.742 * ph) * np.exp(-t / 0.35) + 0.2 * np.sin(2.0 * ph) * np.exp(-t / 0.3))
    mal = bq(rng.standard_normal(n), 'lp', 600) * np.exp(-t / 0.02) * 0.6
    out = (out + mal)
    out[:48] *= np.linspace(0, 1, 48)
    return fade_edges(out, 0, 0.1) * vel * 0.5


def bass_drum(vel=0.6, rng=None):
    n = int(1.2 * SR)
    t = np.arange(n) / SR
    f = 48 + 30 * np.exp(-t / 0.05)
    out = np.sin(phase_from_freq(f)) * np.exp(-t / 0.35)
    out += bq(rng.standard_normal(n), 'lp', 300) * np.exp(-t / 0.05) * 0.4
    out[:48] *= np.linspace(0, 1, 48)
    return fade_edges(out, 0, 0.1) * vel * 0.6


def shaker(vel=0.4, rng=None):
    n = int(0.12 * SR)
    t = np.arange(n) / SR
    env = (t / 0.015) * np.exp(1 - t / 0.015)
    out = bq(bq(rng.standard_normal(n), 'hp', 5500), 'lp', 11000) * env
    return out * vel * 0.25


def cymbal_swell(length, peak_at, rng=None, tail=2.5):
    """Suspended-cymbal mallet roll swell peaking at `peak_at` seconds into the buffer, then decaying."""
    n = int((peak_at + tail) * SR)
    t = np.arange(n) / SR
    noise = rng.standard_normal(n)
    # metallic: ring-modulate with a few inharmonic partials
    met = np.zeros(n)
    for f in [3150, 4410, 5230, 6870, 7730, 9120]:
        met += np.sin(TWO_PI * f * t + rng.uniform(0, TWO_PI))
    x = bq(noise, 'hp', 2500) * 0.7 + bq(noise * met * 0.2, 'hp', 3000)
    x = bq(x, 'lp', 12000)
    env = np.where(t < peak_at, (np.clip(t / peak_at, 0, 1)) ** 3.0,
                   np.exp(-(t - peak_at) / (tail / 4)))
    # slight mallet-roll pulsation
    env *= 1 + 0.15 * np.sin(TWO_PI * 13 * t)
    return fade_edges(x * env, 0.01, 0.1) * 0.35


# ---------------------------------------------------------------- reverb

def make_ir(rt_low=2.6, rt_mid=2.2, rt_high=1.2, length=3.4, predelay=0.02, seed=7, early=True):
    rng = np.random.default_rng(seed)
    n = int(length * SR)
    t = np.arange(n) / SR
    ir = np.zeros((2, n))
    for ch in range(2):
        nz = rng.standard_normal(n)
        lo = bq(nz, 'lp', 500)
        hi = bq(nz, 'hp', 3500)
        mid = nz - lo - hi
        x = (lo * np.exp(-6.9 * t / rt_low) + mid * np.exp(-6.9 * t / rt_mid) + hi * np.exp(-6.9 * t / rt_high))
        # soft onset of diffuse tail
        x *= np.clip(t / 0.06, 0, 1) ** 1.5
        if early:
            for k in range(12):
                d = rng.uniform(0.008, 0.07)
                x[int(d * SR)] += rng.uniform(-1, 1) * 2.0 * (1 - d / 0.08)
        pd = int(predelay * SR)
        x = np.concatenate([np.zeros(pd), x[:n - pd]])
        ir[ch] = x
    ir /= np.sqrt(np.sum(ir ** 2) / 2)
    return ir


def reverb(send, ir):
    out = np.zeros_like(send)
    for ch in range(2):
        out[ch] = signal.fftconvolve(send[ch], ir[ch])[:send.shape[1]]
    # tiny cross-feed for width consistency
    return out


# ---------------------------------------------------------------- utils

def write_wav(path, x):
    from scipy.io import wavfile
    x = np.asarray(x, dtype=np.float64)
    pcm = np.clip(x.T, -1, 1)
    wavfile.write(path, SR, (pcm * 32767).astype(np.int16))


def read_wav(path):
    from scipy.io import wavfile
    sr, d = wavfile.read(path)
    assert sr == SR, (path, sr)
    if d.dtype == np.int16:
        d = d.astype(np.float64) / 32768
    elif d.dtype == np.int32:
        d = d.astype(np.float64) / 2 ** 31
    if d.ndim == 1:
        d = np.vstack([d, d])
    else:
        d = d.T
    return d


def soft_limit(x, ceiling_db=-1.2):
    c = 10 ** (ceiling_db / 20)
    return c * np.tanh(x / c)
