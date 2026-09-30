"""SFX + ambience for 『星をひろった夜』. Cue times from SPEC.md.
Run: python3 tools/audio/sfx.py -> audio/sfx.wav
"""
import os, sys
import numpy as np
sys.path.insert(0, os.path.dirname(__file__))
from synth import *  # noqa

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
rng = np.random.default_rng(777)
bus = Bus()          # effects (reverb send used)
amb = Bus()          # ambience (light reverb)
TT = np.arange(N) / SR

FPENT = [65, 67, 69, 72, 74]  # F G A C D


def pent(lo, hi):
    return [m + 12 * o for o in range(-2, 5) for m in FPENT if lo <= m + 12 * o <= hi]


def ping(m, vel=0.3, decay=0.6, bright=0.3, freq=None):
    f0 = freq if freq is not None else midi_hz(m)
    n = int(decay * 5 * SR)
    t = np.arange(n) / SR
    x = (np.sin(TWO_PI * f0 * t + rng.uniform(0, TWO_PI)) * np.exp(-t / decay)
         + bright * 0.5 * np.sin(TWO_PI * f0 * 2.756 * t) * np.exp(-t / (decay * 0.3))
         + bright * 0.25 * np.sin(TWO_PI * f0 * 5.40 * t) * np.exp(-t / (decay * 0.12)))
    a = int(0.0015 * SR)
    x[:a] *= np.linspace(0, 1, a)
    return fade_edges(x, 0, 0.02) * vel


def grain_cloud(t0, t1, rate_fn, notes, vel=0.12, pan=(-0.6, 0.6), decay=(0.08, 0.35), send=0.6,
                target=bus, vel_fn=None, pan_fn=None, gain=1.0):
    """Poisson-ish sparkle grains, rate_fn(t)->grains/sec."""
    t = t0
    while t < t1:
        r = max(rate_fn(t), 0.5)
        t += rng.exponential(1.0 / r)
        if t >= t1:
            break
        if rate_fn(t) < 0.6:
            continue
        m = notes[rng.integers(len(notes))]
        v = vel * rng.uniform(0.4, 1.0) * (vel_fn(t) if vel_fn else 1.0)
        x = ping(m, v, decay=rng.uniform(*decay), bright=rng.uniform(0.1, 0.5))
        p = pan_fn(t) + rng.uniform(-0.25, 0.25) if pan_fn else rng.uniform(*pan)
        target.add(x, t, pan=float(np.clip(p, -1, 1)), send=send, gain=gain)


def noise(n, color='white'):
    x = rng.standard_normal(n)
    if color == 'pink':
        b = [0.049922035, -0.095993537, 0.050612699, -0.004408786]
        a = [1, -2.494956002, 2.017265875, -0.522189400]
        x = signal.lfilter(b, a, x) * 8
    elif color == 'brown':
        x = signal.lfilter([1], [1, -0.995], x) * 0.1
    return x


def env_pts(t, pts):
    """piecewise-linear envelope from [(time, value), ...] on local time array"""
    ts, vs = zip(*pts)
    return np.interp(t, ts, vs)


def smooth_rand(n, rate, seed_scale=1.0):
    """smoothed random [-1,1] curve changing ~rate times/sec"""
    k = int(n / SR * rate) + 3
    pts = rng.uniform(-1, 1, k)
    xs = np.linspace(0, n, k)
    from scipy.interpolate import CubicSpline
    return np.clip(CubicSpline(xs, pts)(np.arange(n)), -1.2, 1.2)


def stereoize(x, pan_curve):
    th = (np.clip(pan_curve, -1, 1) + 1) * np.pi / 4
    return np.vstack([x * np.cos(th), x * np.sin(th)])


cues = []

# ======================================================== 3.6–7.4 shooting star
t0, t1 = 3.6, 7.4
n = int((t1 - t0 + 0.2) * SR)
t = np.arange(n) / SR
fc = 7500 * (1500 / 7500) ** np.clip(t / (t1 - t0), 0, 1)
wh = sweep_filter(noise(n, 'pink'), fc, 'bp', q=2.2)
wh += 0.5 * sweep_filter(noise(n), fc * 1.8, 'bp', q=3)
amp = env_pts(t, [(0, 0), (0.5, 0.8), (1.4, 1.0), (3.2, 1.0), (3.75, 0.6), (3.8, 0.0), (4.0, 0)])
# sputter 5.0–6.8: irregular flicker dips
sp_mask = env_pts(t + t0, [(4.9, 0), (5.1, 1), (6.6, 1), (6.85, 0)])
flick = 0.5 + 0.5 * np.tanh(5 * smooth_rand(n, 11))
wob = 1 - sp_mask * 0.9 * (1 - flick)
x = wh * amp * wob
pan = env_pts(t, [(0, 0.75), (3.8, -0.1)])
# tonal "hyuu" glide with sputter warble
fg = 2600 * (620 / 2600) ** np.clip(t / (t1 - t0), 0, 1) * (1 + sp_mask * 0.05 * smooth_rand(n, 14))
tone = np.sin(phase_from_freq(fg)) * env_pts(t, [(0, 0), (0.6, 0.25), (3.0, 0.3), (3.75, 0.1), (3.8, 0)]) * wob
tone = bq(tone, 'lp', 3000)
st = stereoize(x * 0.16 + tone * 0.08, pan)
bus.add(fade_edges(st, 0.01, 0.05), t0, send=0.35)
grain_cloud(t0 + 0.2, t1 - 0.05, lambda tt: 26 * (1 - 0.6 * float(np.interp(tt, [4.9, 5.1, 6.6, 6.85], [0, 1, 1, 0]))
                                                      * (0.5 + 0.5 * np.sin(tt * 40))),
            pent(84, 103), vel=0.07, decay=(0.05, 0.25),
            pan_fn=lambda tt: float(np.interp(tt, [t0, t1], [0.75, -0.1])))
cues.append((3.6, 'shooting star whoosh + shimmer (sputter 5.0–6.8)'))

# ======================================================== 7.4 impact + sparkle
T = 7.4
n = int(1.0 * SR); t = np.arange(n) / SR
thump = np.sin(phase_from_freq(55 + 70 * np.exp(-t / 0.04))) * np.exp(-t / 0.12)
puff = bq(noise(n, 'pink'), 'lp', 1400) * (t / 0.01 * np.exp(1 - t / 0.01)) * 0.4
rust = bq(noise(n), 'bp', 3200, 0.8) * np.exp(-t / 0.08) * 0.15
bus.add(fade_edges(thump * 0.35 + puff * 0.35 + rust, 0.001, 0.1), T, pan=-0.1, send=0.2)
for k, m in enumerate([84, 89, 93, 96, 101, 98, 105, 100]):
    bus.add(ping(m, 0.09 * (0.85 ** k), decay=0.5, bright=0.35), T + 0.03 + 0.07 * k + rng.uniform(0, 0.03),
            pan=rng.uniform(-0.6, 0.5), send=0.6)
grain_cloud(T, T + 1.3, lambda tt: 40 * np.exp(-(tt - T) / 0.4), pent(89, 105), vel=0.06,
            pan=(-0.7, 0.6))
cues.append((7.4, 'soft impact (posu) + sparkle'))

# ======================================================== footsteps
def footstep(T, vel=0.5, pan=0.0, heavy=0.0):
    n = int(0.35 * SR); t = np.arange(n) / SR
    thud = bq(noise(n, 'brown'), 'lp', 180 + 80 * heavy) * (t / 0.012 * np.exp(1 - t / 0.012)) * (0.6 + 0.5 * heavy)
    x = thud
    for g in range(rng.integers(4, 8)):
        gt = rng.uniform(0.0, 0.09 + 0.05 * (1 - heavy))
        gn = int(rng.uniform(0.008, 0.03) * SR)
        gx = bq(noise(gn), 'bp', rng.uniform(1800, 5500), 1.2) * np.hanning(gn) * rng.uniform(0.3, 1)
        i = int(gt * SR)
        x[i:i + gn] += gx[:max(0, min(gn, n - i))] * 0.35
    swish = bq(noise(n, 'pink'), 'bp', 2500, 0.6) * env_pts(t, [(0, 0), (0.02, 1), (0.18, 0.2), (0.3, 0)]) * 0.12
    x = x + swish
    bus.add(fade_edges(x, 0.001, 0.05) * vel, T, pan=pan, send=0.15)


for T, p in [(11.8, 0.25), (12.3, 0.1), (12.8, 0.2)]:
    footstep(T, 0.4, p)
cues.append((11.8, 'grass footsteps x3 (11.8 / 12.3 / 12.8)'))

# ======================================================== 17.6 scoop sparkle
T = 17.6
for k, m in enumerate([84, 89, 93, 96]):
    bus.add(ping(m, 0.08, decay=0.6, bright=0.25), T + 0.07 * k, pan=-0.2 + 0.15 * k, send=0.6)
n = int(0.8 * SR); t = np.arange(n) / SR
fw = bq(noise(n), 'hp', 6000) * env_pts(t, [(0, 0), (0.05, 1), (0.7, 0)]) * 0.04
bus.add(fw, T, pan=0.0, send=0.5)
grain_cloud(T + 0.05, T + 0.9, lambda tt: 25, pent(96, 108), vel=0.035, decay=(0.04, 0.15))
cues.append((17.6, 'scoop sparkle (kira)'))

# ======================================================== 23.5 power-down flicker
T = 23.3
n = int(1.3 * SR); t = np.arange(n) / SR
fg = 880 * (0.42) ** np.clip(t / 1.0, 0, 1)
hum_ = np.sin(phase_from_freq(fg)) + 0.35 * np.sin(phase_from_freq(fg * 1.5)) + 0.2 * np.sin(phase_from_freq(fg * 3.0))
flick = (0.5 + 0.5 * np.tanh(4 * smooth_rand(n, 22)))
# the near-extinction dip lands on 23.5 (0.2s into the buffer)
dip = 1 - 0.9 * np.exp(-((t - 0.2) / 0.05) ** 2)
e = env_pts(t, [(0, 0), (0.05, 0.7), (0.2, 0.5), (0.35, 0.6), (1.2, 0.0)])
x = bq(hum_ * flick * dip * e, 'lp', 2500) * 0.07
x += bq(noise(n), 'hp', 5000) * flick * e * 0.012
bus.add(fade_edges(x, 0.005, 0.05), T, pan=0.0, send=0.45)
cues.append((23.5, "power-down flicker (hum glides down with stutter, dip at 23.5)"))

# ======================================================== 29.8–31.0 running
for k in range(7):
    footstep(29.8 + 0.2 * k, 0.4, pan=0.12 if k % 2 else -0.12, heavy=0.6)
cues.append((29.8, 'running footsteps x7 (every 0.2 s to 31.0)'))

# ======================================================== window chimes 34.8 + 0.35k
seq = [77, 79, 81, 84, 79, 81, 84, 86, 81, 84, 86, 89, 84, 86, 89, 91]


def chime(m, vel=0.15):
    f0 = midi_hz(m)
    n = int(2.4 * SR); t = np.arange(n) / SR
    x = (np.sin(TWO_PI * f0 * t) * np.exp(-t / 0.65)
         + 0.28 * np.sin(TWO_PI * f0 * 2.0 * t) * np.exp(-t / 0.4)
         + 0.12 * np.sin(TWO_PI * f0 * 4.16 * t) * np.exp(-t / 0.15)
         + 0.03 * np.sin(TWO_PI * f0 * 0.5 * t) * (1 - np.exp(-t / 0.08)) * np.exp(-t / 0.5))  # warm glow bloom
    x[:int(0.003 * SR)] *= np.linspace(0, 1, int(0.003 * SR))
    return fade_edges(x, 0, 0.05) * vel


for k, m in enumerate(seq):
    T = 34.8 + 0.35 * k
    bus.add(chime(m, 0.05 * (0.9 + 0.2 * k / 15)), T, pan=-0.7 + 1.4 * ((k * 5) % 16) / 15, send=0.55)
cues.append((34.8, '16 window-light chimes, F-major pentatonic ascending in 4-note waves'))

# ======================================================== 36.2 lantern orb whoosh-chime
T = 36.2
n = int(1.4 * SR); t = np.arange(n) / SR
fc = 700 * (4500 / 700) ** np.clip(t / 0.9, 0, 1)
wh = sweep_filter(noise(n, 'pink'), fc, 'bp', q=1.6) * env_pts(t, [(0, 0), (0.25, 1), (0.8, 0.5), (1.3, 0)]) * 0.12
bus.add(stereoize(wh, env_pts(t, [(0, -0.5), (1.3, 0.4)])), T, send=0.4)
fgl = midi_hz(84) * 2 ** (5 / 12 * np.clip((t - 0.05) / 0.25, 0, 1))  # C6 -> F6 glide
gl = np.sin(phase_from_freq(fgl * (1 + 0.004 * np.sin(TWO_PI * 6 * t)))) * env_pts(t, [(0, 0), (0.06, 1), (1.4, 0)]) ** 1.5
gl += 0.3 * np.sin(phase_from_freq(fgl * 2)) * env_pts(t, [(0, 0), (0.06, 1), (0.6, 0)])
bus.add(fade_edges(gl * 0.035, 0.005, 0.05), T, pan=0.0, send=0.6)
grain_cloud(T + 0.2, T + 1.5, lambda tt: 22 * np.exp(-(tt - T - 0.2) / 0.6), pent(89, 103), vel=0.05,
            pan_fn=lambda tt: float(np.interp(tt, [T, T + 1.5], [-0.4, 0.5])))
cues.append((36.2, 'lantern orb whoosh + rising glass chime'))

# ======================================================== 38.8 fireflies
T = 38.8
n = int(1.8 * SR); t = np.arange(n) / SR
fl = bq(noise(n), 'bp', 1800, 1.0) * (0.5 + 0.5 * np.sin(TWO_PI * 28 * t) ** 2) * env_pts(t, [(0, 0), (0.1, 1), (1.7, 0)]) * 0.03
bus.add(stereoize(fl, 0.5 * np.sin(TWO_PI * 0.8 * t)), T, send=0.3)
grain_cloud(T, T + 1.8, lambda tt: 30 * np.exp(-(tt - T) / 0.9), pent(96, 110), vel=0.05, decay=(0.02, 0.1),
            pan=(-0.8, 0.8))
cues.append((38.8, 'fireflies flutter + tiny sparkles'))

# ======================================================== 40.5–44.6 energy absorption swell
T0, T1 = 40.5, 44.6
n = int((T1 - T0) * SR); t = np.arange(n) / SR
u = t / (T1 - T0)
fc = 250 * (7000 / 250) ** (u ** 1.3)
sw = sweep_filter(noise(n, 'pink'), fc, 'lp', q=0.9)
sw = bq(sw, 'peak', 2000, 0.8, -6)
ampc = (0.05 + 0.95 * u ** 2.2)
swirl = 0.6 * np.sin(TWO_PI * np.cumsum(0.4 + 3.5 * u ** 2) / SR)
x = stereoize(sw * ampc * 0.09, swirl)
x[:, -int(0.02 * SR):] *= np.linspace(1, 0, int(0.02 * SR))
bus.add(fade_edges(x, 0.2, 0.02), T0, send=0.35)
# low sub rumble
sub = np.sin(phase_from_freq(43.65 * np.ones(n))) * ampc * 0.12
bus.add(fade_edges(sub, 0.3, 0.02), T0, send=0.0)
grain_cloud(T0, T1 - 0.02, lambda tt: 8 + 70 * ((tt - T0) / (T1 - T0)) ** 2, pent(84, 108), vel=0.05,
            decay=(0.05, 0.2), pan_fn=lambda tt: 0.6 * np.sin(tt * 5))
cues.append((40.5, 'energy absorption swell (lp-sweep noise, swirl pan, rising sparkle density) -> 44.6'))

# ======================================================== 44.6 big burst
T = 44.6
n = int(3.5 * SR); t = np.arange(n) / SR
tr = bq(noise(n), 'lp', 9000) * np.exp(-t / 0.018) * 0.35
boom = np.sin(phase_from_freq(38 + 45 * np.exp(-t / 0.06))) * np.exp(-t / 0.5) * 0.4
shim = bq(noise(n), 'hp', 6500) * np.exp(-t / 0.9) * (0.6 + 0.4 * (0.5 + 0.5 * np.tanh(3 * smooth_rand(n, 30)))) * 0.08
fo = 9000 * (1800 / 9000) ** np.clip(t / 1.2, 0, 1)
wo = sweep_filter(noise(n, 'pink'), fo, 'bp', q=1.2) * np.exp(-t / 0.5) * 0.12
x = tr + boom + wo
bus.add(fade_edges(x, 0.0005, 0.2), T, pan=0.0, send=0.35)
bus.add(fade_edges(np.vstack([shim, bq(noise(n), 'hp', 6500) * np.exp(-t / 0.9) * 0.08]), 0.001, 0.2), T,
        send=0.5)
for k in range(26):
    dt = rng.exponential(0.35)
    m = [77, 81, 84, 89, 91, 93, 96, 101, 103, 105][rng.integers(10)]
    bus.add(ping(m, 0.11 * np.exp(-dt / 1.0), decay=rng.uniform(0.4, 1.0), bright=0.35), T + dt,
            pan=rng.uniform(-0.9, 0.9), send=0.65)
grain_cloud(T, T + 2.5, lambda tt: 60 * np.exp(-(tt - T) / 0.7), pent(96, 110), vel=0.05, pan=(-0.9, 0.9))
cues.append((44.6, 'BIG shimmering burst (transient, sub boom, down-sweep, bell spray)'))

# ======================================================== 50.9 hairpin kiran
T = 50.9
n = int(1.2 * SR); t = np.arange(n) / SR
fk = 1800 * 2 ** (np.clip(t / 0.05, 0, 1) * 0.95) 
k1 = np.sin(phase_from_freq(fk)) * env_pts(t, [(0, 0), (0.01, 0.6), (0.05, 0.3), (0.07, 0)])
bus.add(fade_edges(k1 * 0.05, 0.001, 0.01), T, pan=0.15, send=0.5)
bus.add(ping(101, 0.09, decay=0.45, bright=0.3), T + 0.05, pan=0.15, send=0.6)   # F7
bus.add(ping(96, 0.05, decay=0.6, bright=0.2), T + 0.05, pan=0.1, send=0.6)      # C7
sh = bq(noise(n), 'hp', 7000) * env_pts(t, [(0, 0), (0.06, 1), (0.6, 0)]) * 0.03
bus.add(sh, T, pan=0.15, send=0.5)
cues.append((50.9, "hairpin 'kiran' glint"))

# ======================================================== 53.0–55.0 lift-off shuwaa
T0, T1 = 53.0, 55.0
n = int((T1 - T0) * SR); t = np.arange(n) / SR
fc = 900 * (7500 / 900) ** np.clip(t / 1.5, 0, 1)
sw = sweep_filter(noise(n, 'pink'), fc, 'bp', q=1.0) + 0.4 * sweep_filter(noise(n), fc * 1.4, 'bp', q=2.5)
e = env_pts(t, [(0, 0), (0.35, 1.0), (1.1, 0.8), (2.0, 0)])
bus.add(fade_edges(stereoize(sw * e * 0.09, env_pts(t, [(0, 0), (2, 0.45)])), 0.01, 0.05), T0, send=0.45)
grain_cloud(T0 + 0.1, T1, lambda tt: 45 * np.exp(-(tt - T0) / 0.8), pent(89, 108), vel=0.05,
            pan_fn=lambda tt: float(np.interp(tt, [T0, T1], [0.0, 0.5])))
cues.append((53.0, "lift-off 'shuwaa' (rising band-pass noise + sparkle trail) to 55.0"))

# ======================================================== 55.5+0.25k constellation twinkles
tw = [77, 79, 81, 84, 86, 89, 93, 96]


def twinkle(m, vel):
    f0 = midi_hz(m)
    n = int(2.2 * SR); t = np.arange(n) / SR
    trem = 1 + 0.25 * np.sin(TWO_PI * 7 * t) * np.clip(t / 0.3, 0, 1)
    x = (np.sin(TWO_PI * f0 * t) + 0.25 * np.sin(TWO_PI * 2 * f0 * t) * np.exp(-t / 0.3)
         + 0.1 * np.sin(TWO_PI * 3.01 * f0 * t) * np.exp(-t / 0.15)) * np.exp(-t / 0.7) * trem
    x[:int(0.004 * SR)] *= np.linspace(0, 1, int(0.004 * SR))
    return fade_edges(x, 0, 0.1) * vel


for k, m in enumerate(tw):
    bus.add(twinkle(m, 0.06), 55.5 + 0.25 * k, pan=-0.6 + 1.2 * k / 7, send=0.6)
    bus.add(ping(m + 24, 0.02, decay=0.2, bright=0.4), 55.5 + 0.25 * k, pan=-0.6 + 1.2 * k / 7, send=0.6)
cues.append((55.5, '8 constellation twinkles F5 G5 A5 C6 D6 F6 A6 C7 (every 0.25 s)'))

# ======================================================== 57.3 title shimmer
T = 57.3
n = int(2.6 * SR); t = np.arange(n) / SR
sh = np.vstack([bq(noise(n), 'hp', 7000), bq(noise(n), 'hp', 7000)]) * env_pts(t, [(0, 0), (0.15, 1), (2.5, 0)]) ** 1.5 * 0.035
bus.add(sh, T, send=0.5)
for k, m in enumerate(pent(84, 101)):
    bus.add(ping(m, 0.05 * (1 - 0.03 * k), decay=0.7, bright=0.25), T + 0.04 * k, pan=-0.5 + 0.1 * k, send=0.65)
for m in [89, 93, 96]:
    bus.add(twinkle(m, 0.03), T + 0.5, pan=0.0, send=0.7)
cues.append((57.3, 'title shimmer (glass gliss + air + soft F chord bells)'))

# ======================================================== AMBIENCE
ins_env = env_pts(TT, [(0, 0.0), (0.8, 0.75), (9, 0.9), (21, 1.0), (29.5, 0.9), (33.5, 0.7), (35.0, 0.0),
                       (46.0, 0.0), (48.5, 0.45), (53.0, 0.55), (58.5, 0.5), (59.9, 0.0), (60, 0)])


def suzumushi(f, pan, lvl, seed):
    r = np.random.default_rng(seed)
    x = np.zeros(N)
    t = r.uniform(0, 1.5)
    while t < 60:
        L = r.uniform(0.3, 0.55)
        n = int(L * SR); tt = np.arange(n) / SR
        pr = r.uniform(38, 48)
        am = (0.5 + 0.5 * np.cos(TWO_PI * pr * tt)) ** 3
        e = env_pts(tt, [(0, 0), (0.03, 0.8), (L * 0.6, 1.0), (L, 0)])
        ff = f * (1 + 0.004 * np.sin(TWO_PI * 3 * tt))
        s = np.sin(phase_from_freq(ff)) + 0.12 * np.sin(2 * phase_from_freq(ff))
        i = int(t * SR)
        seg = s * am * e * r.uniform(0.6, 1.0)
        x[i:i + n] += seg[:max(0, min(n, N - i))]
        t += L + r.uniform(0.35, 1.1)
    amb.add(x * lvl, 0, pan=pan, send=0.25)


def korogi(f, pan, lvl, seed):
    r = np.random.default_rng(seed)
    x = np.zeros(N)
    t = r.uniform(0, 1.0)
    while t < 60:
        npulse = r.integers(3, 6) if r.uniform() < 0.8 else r.integers(8, 14)
        per = r.uniform(0.036, 0.046)
        for p in range(npulse):
            L = per * 0.62
            n = int(L * SR); tt = np.arange(n) / SR
            ff = f * (1 - 0.02 * tt / L)
            s = np.sin(phase_from_freq(ff)) + 0.1 * np.sin(2 * phase_from_freq(ff))
            e = np.sin(np.pi * tt / L) ** 2 * (0.8 + 0.2 * (p == 0))
            i = int((t + p * per) * SR)
            x[i:i + n] += (s * e)[:max(0, min(n, N - i))]
        t += npulse * per + r.uniform(0.25, 0.8)
    amb.add(x * lvl, 0, pan=pan, send=0.25)


suzumushi(4350, -0.55, 0.010, 1)
suzumushi(4520, 0.45, 0.007, 2)
suzumushi(4180, 0.1, 0.004, 3)
korogi(4700, 0.6, 0.008, 4)
korogi(4550, -0.3, 0.006, 5)
korogi(4900, -0.8, 0.004, 6)
# distant chorus bed
bed = bq(bq(rng.standard_normal(N), 'bp', 4500, 4.0), 'bp', 4500, 4.0)
bed *= 0.5 + 0.5 * (0.5 + 0.5 * np.sin(TWO_PI * 42 * TT)) ** 2
amb.add(np.vstack([bed, np.roll(bed, 1234)]) * 0.012, 0, send=0.2)
amb.dry *= ins_env * 1.5
amb.send *= ins_env * 1.5
# wind
wl = bq(noise(N, 'pink'), 'bp', 450, 0.6)
wr = bq(noise(N, 'pink'), 'bp', 520, 0.6)
wmod = 0.6 + 0.4 * smooth_rand(N, 0.25)
wind_env = env_pts(TT, [(0, 0), (1.0, 0.8), (26.5, 0.8), (27.5, 1.6), (29.5, 1.2), (31, 0.7), (34, 0.5),
                        (46, 0.5), (48, 0.8), (59, 0.6), (59.95, 0), (60, 0)])
wind = np.vstack([wl, wr]) * wmod * wind_env * 0.017
amb.dry += wind

# ======================================================== mixdown
ir = make_ir(rt_low=1.8, rt_mid=1.6, rt_high=1.0, length=2.6, predelay=0.015, seed=11)
out = bus.dry + 0.45 * reverb(bus.send, ir) + amb.dry + 0.3 * reverb(amb.send, ir)
out = bq(out, 'hp', 30)
out -= out.mean(axis=1, keepdims=True)
fe = np.ones(N); m_ = TT > 59.6
fe[m_] = np.clip((59.95 - TT[m_]) / 0.35, 0, 1)
out *= fe
fade_edges(out, 0.01, 0.01)
import pyloudnorm as pyln
L = pyln.Meter(SR).integrated_loudness(out.T)
pk = 20 * np.log10(np.abs(out).max())
TARGET = -25.0
out *= 10 ** ((TARGET - L) / 20)
if 20 * np.log10(np.abs(out).max()) > -1.5:
    out = soft_limit(out, -1.3)
print('SFX LUFS %.1f  peak %.2f dBFS' % (L, 20 * np.log10(np.abs(out).max())))
write_wav(os.path.join(ROOT, 'audio', 'sfx.wav'), out)
with open(os.path.join(os.path.dirname(__file__), 'sfx_events.txt'), 'w') as f:
    for tt, lab in cues:
        f.write('%6.2f  %s\n' % (tt, lab))
