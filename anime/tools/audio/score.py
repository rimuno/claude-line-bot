"""BGM for 『星をひろった夜』 — F major, ~80 BPM, section-locked tempo map.
Run: python3 tools/audio/score.py  -> audio/bgm.wav
"""
import os, sys
import numpy as np
sys.path.insert(0, os.path.dirname(__file__))
from synth import *  # noqa

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
rng = np.random.default_rng(20240830)

# ------------------------------------------------------------------ harmony
VOICING = {  # bass, upper voices (MIDI)
    'F':       (41, [57, 60, 65, 69]),
    'C/E':     (40, [55, 60, 64, 67]),
    'Dm7':     (38, [57, 60, 65, 69]),
    'Dm7/C':   (36, [57, 60, 65, 69]),
    'Bbmaj7':  (34, [57, 62, 65, 70]),
    'Gm7':     (43, [58, 62, 65, 70]),
    'C7sus4':  (36, [58, 60, 65, 67]),
    'C7':      (36, [58, 60, 64, 67]),
    'Dm':      (38, [57, 62, 65, 69]),
    'Dm/C':    (36, [57, 62, 65, 69]),
    'Gm6':     (43, [58, 62, 64, 67]),
    'A7sus4':  (45, [57, 62, 64, 67]),
    'A7':      (45, [57, 61, 64, 67]),
    'Bbadd9':  (46, [60, 62, 65, 70]),
    'Csus4':   (48, [60, 65, 67, 72]),
    'C':       (48, [60, 64, 67, 72]),
    'F/A':     (45, [60, 65, 69, 72]),
}


class Sec:
    def __init__(self, start, bpm):
        self.start, self.bpm = start, bpm
        self.b = 60.0 / bpm

    def t(self, beat):
        return self.start + beat * self.b


def hum(t, amt=0.008):
    return t + float(np.clip(rng.normal(0, amt), -2.5 * amt, 2.5 * amt))


def hv(v, amt=0.07):
    return float(v * np.clip(1 + rng.normal(0, amt), 0.75, 1.25))


def pan_for(m, lo=-0.5, hi=0.5):
    return float(np.clip(lo + (hi - lo) * (m - 40) / 50.0, -0.9, 0.9))


bus = Bus()
events = []   # (time, label) for cues/analysis


# ------------------------------------------------------------------ helpers

def play_melody(sec, notes, inst, vel=0.5, transpose=0, pan=0.0, send=0.4, gain=1.0, legato=1.0,
                tjit=0.008, **kw):
    for (b, d, m) in notes:
        m = m + transpose
        t0 = hum(sec.t(b), tjit) if b > 0 else sec.t(b)
        dur = d * sec.b * legato
        v = hv(vel)
        if inst in ('piano',):
            x = piano(m, dur, v, rng=rng)
        elif inst == 'musicbox':
            x = music_box(m, v, rng=rng)
        elif inst == 'celesta':
            x = celesta(m, v, rng=rng)
        elif inst == 'glock':
            x = glock(m, v, rng=rng)
        elif inst == 'harp':
            x = harp(m, v, dur=max(dur, 1.5), rng=rng)
        elif inst == 'pizz':
            x = pizz(m, v, rng=rng)
        elif inst == 'strings':
            x = string_voice(m, dur, v, rng=rng, attack=kw.get('attack', 0.12), release=kw.get('release', 0.5),
                             fc=kw.get('fc', 3000), voices=kw.get('voices', 4), vib=kw.get('vib', 12))
        elif inst == 'choir':
            x = choir(m, dur, v, rng=rng, attack=kw.get('attack', 0.3), release=kw.get('release', 0.8))
        else:
            raise ValueError(inst)
        p = pan if not isinstance(pan, str) else pan_for(m)
        bus.add(x, t0, pan=p, gain=gain, send=send)


def play_pad(sec, chords, vel=0.3, octave=0, attack=0.6, release=1.0, fc=2000, send=0.5, spread=0.6,
             bass=True, bass_vel=None, bass_oct=12, choir_vel=0.0, choir_oct=12, overlap=0.15, voices=5):
    for (b, d, name) in chords:
        bn, up = VOICING[name]
        t0 = sec.t(b)
        dur = d * sec.b + overlap
        for i, m in enumerate(up):
            p = -spread + 2 * spread * i / max(1, len(up) - 1)
            x = string_voice(m + octave, dur, hv(vel, 0.04), rng=rng, attack=attack, release=release, fc=fc,
                             voices=voices, vib=8)
            bus.add(x, t0, pan=p, send=send)
            if choir_vel > 0:
                y = choir(m + choir_oct, dur, hv(choir_vel, 0.04), rng=rng, attack=attack * 1.2, release=release)
                bus.add(y, t0, pan=-p * 0.8, send=0.65)
        if bass:
            bv = bass_vel if bass_vel is not None else vel * 1.1
            x = string_voice(bn + bass_oct, dur, bv, rng=rng, attack=attack, release=release, fc=1200, voices=4,
                             vib=6, bow_noise=0.01)
            bus.add(x, t0, pan=0.25, send=send * 0.8)


def arp(sec, b0, beats, notes, step=0.5, inst='harp', vel=0.35, pan=-0.35, send=0.45, gain=1.0):
    k = 0
    b = b0
    while b < b0 + beats - 1e-6:
        m = notes[k % len(notes)]
        play_melody(sec, [(b, step, m)], inst, vel=vel * (1.0 if k % 4 == 0 else 0.8), pan=pan, send=send,
                    gain=gain)
        k += 1
        b += step


# ------------------------------------------------------------------ theme
T1 = [(0, .5, 69), (.5, .5, 72), (1, 1.5, 77), (2.5, .5, 76), (3, 1, 77)]            # F
T2 = [(0, 1.5, 79), (1.5, .5, 77), (2, 1, 76), (3, 1, 72)]                             # C/E
T3 = [(0, 1, 74), (1, 1, 77), (2, 1.5, 81), (3.5, .5, 79)]                             # Dm7 -> Dm7/C
T4 = [(0, 1, 81), (1, .5, 79), (1.5, .5, 77), (2, 1.5, 74), (3.5, .5, 77)]             # Bbmaj7 -> Gm7
T5 = [(0, 1.5, 79), (1.5, .5, 77), (2, .5, 76), (2.5, .5, 79),
      (3, .25, 81), (3.25, .25, 82), (3.5, .25, 84), (3.75, .25, 88)]                    # C7sus4 -> C7 -> run


def shift(notes, db=0, dm=0):
    return [(b + db, d, m + dm) for (b, d, m) in notes]


THEME = shift(T1, 0) + shift(T2, 4) + shift(T3, 8) + shift(T4, 12) + shift(T5, 16)

# ================================================================== A: intro 0–9 (80 BPM, 3 bars)
A = Sec(0.0, 80)
events.append((0.0, 'A intro: F | C/E | Dm7 Dm7/C  — music box states theme'))
play_pad(A, [(0, 4, 'F'), (4, 4, 'C/E'), (8, 2, 'Dm7'), (10, 2, 'Dm7/C')], vel=0.2, attack=1.6, release=1.4,
         fc=1600, bass_vel=0.18)
play_pad(A, [(0, 4, 'F'), (4, 4, 'C/E'), (8, 4, 'Dm7')], vel=0.07, octave=12, attack=2.0, release=1.5,
         fc=2500, bass=False, spread=0.9, voices=3)
play_melody(A, shift(T1 + shift(T2, 4) + shift(T3, 8), 0, 12), 'musicbox', vel=0.36, pan=0.25, send=0.55)
# harp broken chords (soft, low-mid)
arp(A, 0, 4, [53, 60, 65, 69, 72, 69, 65, 60], vel=0.22)
arp(A, 4, 4, [52, 60, 64, 67, 72, 67, 64, 60], vel=0.22)
arp(A, 8, 2, [50, 57, 62, 65], vel=0.2)
arp(A, 10, 2, [48, 57, 60, 65], vel=0.2)
# celesta sparkle echo answering the music box
play_melody(A, [(6.5, .5, 96), (7, .5, 93), (10.5, .5, 93), (11, 1, 91)], 'celesta', vel=0.14, pan=0.55, send=0.7)

# ================================================================== B: curious 9–21 (80 BPM, 4 bars)
B = Sec(9.0, 80)
events.append((9.0, 'B curious: Bbmaj7 | F/A | Gm7 | C7sus4 C7  — pizzicato + celesta questions'))
chB = [(0, 4, 'Bbmaj7'), (4, 4, 'F/A'), (8, 4, 'Gm7'), (12, 2, 'C7sus4'), (14, 2, 'C7')]
play_pad(B, chB, vel=0.06, octave=12, attack=1.2, release=1.0, fc=2400, bass=False, spread=0.9, voices=3)
bassB = [(0, 46), (2, 53), (3.5, 46), (4, 45), (6, 52), (7.5, 45), (8, 43), (10, 50), (11.5, 46),
         (12, 48), (14, 48), (15, 52), (15.5, 55)]
for b, m in bassB:
    play_melody(B, [(b, .5, m)], 'pizz', vel=0.55 if b % 2 == 0 else 0.4, pan=0.2, send=0.35)
# off-beat plucked chord "tik"s (upper, soft)
for bar, name in [(0, 'Bbmaj7'), (4, 'F/A'), (8, 'Gm7'), (12, 'C7sus4')]:
    up = VOICING[name][1]
    for bb in (1, 3):
        for m in up[1:3]:
            play_melody(B, [(bar + bb, .5, m + 12)], 'pizz', vel=0.2, pan=-0.3, send=0.4)
motifB = [(2, .5, 84), (2.5, .5, 86), (3, 1, 89),
          (6, .5, 84), (6.5, .5, 81), (7, 1, 77),
          (9.5, .5, 82), (10, .5, 86), (10.5, .5, 89), (11, 1, 91),
          (12, 1.5, 89), (14, .5, 88), (14.5, .5, 91), (15, 1, 94)]
play_melody(B, motifB, 'celesta', vel=0.38, pan=0.3, send=0.55)
play_melody(B, shift([(3, 1, 89), (7, 1, 77), (11, 1, 91), (15, 1, 94)], 0, 0), 'glock', vel=0.08, pan=0.45,
            send=0.7)

# ================================================================== C: sad turn 21–26.8 (2 bars)
C = Sec(21.0, 4 * 2 * 60 / 5.8)
events.append((21.0, 'C sad turn (relative minor): Dm | Dm/C | Bbmaj7 | Gm6 A7sus4 A7'))
chC = [(0, 2, 'Dm'), (2, 2, 'Dm/C'), (4, 2, 'Bbmaj7'), (6, 1, 'Gm6'), (7, .5, 'A7sus4'), (7.5, .5, 'A7')]
play_pad(C, chC, vel=0.2, attack=0.9, release=1.2, fc=1500, bass=False, overlap=0.25)
# cello line (legato)
for b, d, m in [(0, 2, 50), (2, 2, 48), (4, 2, 46), (6, 1, 43), (7, 1, 45)]:
    x = string_voice(m, d * C.b + 0.2, 0.26, rng=rng, attack=0.35, release=0.9, fc=1000, voices=4, vib=10)
    bus.add(x, C.t(b), pan=0.3, send=0.45)
play_melody(C, [(0, 1.5, 81), (1.5, .5, 79), (2, 2, 77), (4, 1.5, 74), (5.5, .5, 72), (6, 1, 70), (7, 1, 76)],
            'piano', vel=0.34, pan=-0.1, send=0.5)
play_pad(C, [(0, 4, 'Dm'), (4, 4, 'Bbmaj7')], vel=0.05, octave=12, attack=2.0, release=1.2, fc=2200,
         bass=False, spread=0.9, voices=3)

# ================================================================== D: hopeful lift 26.8 + pickup 29.6–31
D = Sec(26.8, 4 * 60 / 2.8)
events.append((26.8, 'D hopeful lift: Bbadd9 | Csus4 C | C7 pickup (29.6)'))
play_pad(D, [(0, 2, 'Bbadd9'), (2, 1, 'Csus4'), (3, 1, 'C')], vel=0.22, attack=0.5, release=0.8, fc=2200,
         choir_vel=0.12, bass_vel=0.24)
play_melody(D, [(0, 1, 77), (1, 1, 79), (2, 1.5, 81), (3.5, .5, 84)], 'strings', vel=0.34, pan=-0.2,
            send=0.5, attack=0.25, release=0.6, fc=3200, voices=5)
for k, m in enumerate([70, 72, 74, 77, 82, 84, 86, 89]):
    play_melody(D, [(k * 0.25, .25, m)], 'celesta', vel=0.22 + 0.02 * k, pan=0.35, send=0.6)
# pickup (running)
for k, m in enumerate([48, 48, 52, 55]):
    play_melody(D, [(4 + k * 0.5, .5, m)], 'pizz', vel=0.6, pan=0.2, send=0.3)
for k in range(4):
    for m in [58, 64, 67]:
        x = string_voice(m + 12, 0.22, hv(0.16 + 0.03 * k), rng=rng, attack=0.02, release=0.15, fc=3000, voices=3,
                         vib=0)
        bus.add(x, D.t(4 + k * 0.5), pan=pan_for(m), send=0.4)
for k, m in enumerate([72, 74, 76, 77, 79, 81, 82, 84]):
    play_melody(D, [(4 + k * 0.25, .25, m)], 'musicbox', vel=0.28 + 0.02 * k, pan=0.3, send=0.5)
for k in range(8):
    bus.add(timpani(36, 0.05 + 0.02 * k, rng=rng, dur=1.0), hum(D.t(4 + k * 0.25), 0.004), pan=0.0, send=0.3)
    bus.add(shaker(0.25 + 0.05 * (k % 2 == 0), rng=rng), hum(D.t(4 + k * 0.25), 0.004), pan=0.4, send=0.2)
play_pad(D, [(4, 2, 'C7')], vel=0.2, attack=0.3, release=0.3, fc=2400, bass=True, bass_vel=0.25, overlap=0.05)

# ================================================================== E: build 31–44.6 (5 bars, 88.235 BPM)
E = Sec(31.0, 20 * 60 / 13.6)
events.append((31.0, 'E warm build: F | C/E | Dm7 Dm7/C | Bbmaj7 Gm7 | C7sus4 C7 -> 44.6 F'))
chE = [(0, 4, 'F'), (4, 4, 'C/E'), (8, 2, 'Dm7'), (10, 2, 'Dm7/C'), (12, 2, 'Bbmaj7'), (14, 2, 'Gm7'),
       (16, 2, 'C7sus4'), (18, 2, 'C7')]
# pads growing
play_pad(E, chE[:2], vel=0.18, attack=0.6, release=0.8, fc=1800, bass=False)
play_pad(E, chE[2:6], vel=0.24, attack=0.5, release=0.8, fc=2000, bass=True, bass_vel=0.26, choir_vel=0.12)
play_pad(E, chE[6:], vel=0.3, attack=0.4, release=0.4, fc=2400, bass=True, bass_vel=0.32, choir_vel=0.18)
play_pad(E, chE[4:], vel=0.1, octave=12, attack=0.8, release=0.5, fc=3000, bass=False, spread=0.9, voices=3)
# melody layers
play_melody(E, THEME[:len(T1) + len(T2)], 'piano', vel=0.5, pan=-0.1, send=0.45)
play_melody(E, THEME[len(T1) + len(T2):], 'piano', vel=0.42, pan=-0.1, send=0.45, gain=0.8)
play_melody(E, shift(THEME[:len(T1)], 0, 12), 'celesta', vel=0.2, pan=0.35, send=0.6)
play_melody(E, THEME[len(T1):], 'strings', vel=0.34, pan=-0.25, send=0.5, attack=0.12, release=0.5, fc=3200,
            voices=5, legato=1.05)
play_melody(E, THEME[len(T1) + len(T2) + len(T3):], 'strings', vel=0.2, transpose=12, pan=0.3, send=0.55,
            attack=0.12, release=0.5, fc=4000, voices=4, legato=1.05)
play_melody(E, shift(THEME[len(T1) + len(T2) + len(T3):], 0, 12), 'glock', vel=0.14, pan=0.4, send=0.6)
# harp arpeggios (8ths), register above speech fundamentals
harpE = {'F': [65, 69, 72, 77], 'C/E': [64, 67, 72, 76], 'Dm7': [62, 65, 69, 72], 'Dm7/C': [60, 65, 69, 72],
         'Bbmaj7': [62, 65, 69, 74], 'Gm7': [62, 65, 70, 74], 'C7sus4': [65, 67, 70, 72], 'C7': [64, 67, 70, 72]}
for b, d, name in chE:
    ns = harpE[name]
    arp(E, b, d, ns + ns[1:3][::-1] if d == 4 else ns, vel=0.26 if b < 8 else 0.3, pan=-0.4)
# cello countermelody (bars 3-5), warm tenor register
for b, d, m in [(8, 2, 53), (10, 2, 57), (12, 2, 58), (14, 2, 58), (16, 2, 60), (18, 1, 58), (19, 1, 64)]:
    x = string_voice(m, d * E.b + 0.05, hv(0.22), rng=rng, attack=0.2, release=0.5, fc=1400, voices=4, vib=12)
    bus.add(x, hum(E.t(b)), pan=0.35, send=0.45)
# downbeat of the build: soft bass drum + arco bass F
bus.add(bass_drum(0.3, rng=rng), E.t(0), send=0.3)
x = string_voice(41, 4 * E.b, 0.24, rng=rng, attack=0.08, release=0.6, fc=900, voices=4)
bus.add(x, E.t(0), pan=0.2, send=0.4)
x = string_voice(40, 4 * E.b, 0.2, rng=rng, attack=0.3, release=0.6, fc=900, voices=4)
bus.add(x, E.t(4), pan=0.2, send=0.4)
# pizz bass bars 0-1, then arco bass handles it
for b, m in [(0, 41), (2, 48), (4, 40), (6, 48)]:
    play_melody(E, [(b, 1, m)], 'pizz', vel=0.55, pan=0.2, send=0.3)
# percussion
for k in range(4 * 2, 16 * 2):
    b = k * 0.5
    bus.add(shaker(0.3 if k % 2 == 0 else 0.2, rng=rng), hum(E.t(b), 0.006), pan=0.45, send=0.15,
            gain=0.8 + 0.4 * (b / 16))
for b in [8, 10, 12, 14, 16, 18]:
    bus.add(bass_drum(0.35 + 0.03 * b / 2, rng=rng), E.t(b), send=0.3)
# timpani roll (C) through last bar, crescendo
nroll = 24
for k in range(nroll):
    b = 16 + k * (4.0 / nroll)
    bus.add(timpani(36, 0.06 + 0.3 * (k / nroll) ** 2, rng=rng, dur=0.8), hum(E.t(b), 0.003), send=0.3)
# cymbal swell INTO 44.6
cs = cymbal_swell(0, 2.72, rng=rng, tail=3.0)
bus.add(cs, 44.6 - 2.72, pan=0.0, send=0.5, gain=0.55)
# harp gliss up during last beat (F pentatonic)
gl = [60, 62, 65, 67, 69, 72, 74, 77, 79, 81, 84, 86, 89]
for k, m in enumerate(gl):
    play_melody(E, [(19 + k / len(gl), .3, m)], 'harp', vel=0.2 + 0.15 * k / len(gl), pan=-0.4, send=0.5,
                tjit=0.002)

# ------------------------------------------------------------------ CLIMAX 44.6: big bright F
TC = 44.6
events.append((44.6, 'CLIMAX: tutti F (strings, choir, glock, piano, timpani, cymbal)'))
for i, m in enumerate([53, 57, 60, 65, 69, 72, 77, 81]):
    x = string_voice(m, 2.2, 0.26 if m < 70 else 0.22, rng=rng, attack=0.04, release=1.6, fc=3000, voices=5)
    bus.add(x, TC, pan=-0.7 + 1.4 * i / 7, send=0.55)
for m in [29, 41]:
    x = string_voice(m + 12 if m == 29 else m, 2.2, 0.35, rng=rng, attack=0.05, release=1.6, fc=900, voices=4)
    bus.add(x, TC, pan=0.2, send=0.4)
for i, m in enumerate([65, 69, 72, 77]):
    bus.add(choir(m + 12, 2.0, 0.22, rng=rng, attack=0.08, release=1.8), TC, pan=0.6 - 0.4 * i, send=0.7)
x = string_voice(89, 1.8, 0.24, rng=rng, attack=0.03, release=1.5, fc=5000, voices=5)
bus.add(x, TC, pan=0.1, send=0.6)
for m in [89, 93, 96, 101]:
    bus.add(glock(m, 0.25, rng=rng), TC + rng.uniform(0, 0.02), pan=0.4, send=0.7)
for m in [41, 53, 60, 65, 69, 72, 77]:
    bus.add(piano(m, 1.8, 0.55, rng=rng), TC + rng.uniform(0, 0.01), pan=-0.15, send=0.45, gain=0.8)
bus.add(timpani(41, 0.6, rng=rng, dur=2.5), TC, send=0.35)
bus.add(bass_drum(0.6, rng=rng), TC, send=0.35)
for k, m in enumerate([77, 81, 84, 89, 93, 96]):
    bus.add(celesta(m, 0.2, rng=rng), TC + 0.12 * (k + 1), pan=0.5 - 0.2 * k, send=0.7)

# ================================================================== F: tender reprise 45–53 (60 BPM)
F = Sec(45.0, 60)
events.append((45.0, 'F tender reprise: F C/E | Dm7 | Bbmaj7 Gm7 — solo piano + soft strings'))
chF = [(0, 2, 'F'), (2, 2, 'C/E'), (4, 2, 'Dm7'), (6, 1, 'Bbmaj7'), (7, 1, 'Gm7')]
play_melody(F, [(0.1, .4, 69), (0.5, .5, 72), (1, 1.5, 77), (2.5, .5, 76), (3, 1, 77), (4, 1, 74), (5, 1, 77),
                (6, 1.5, 81), (7.5, .5, 79)], 'piano', vel=0.5, pan=-0.05, send=0.55, tjit=0.015)
lh = {'F': [41, 48, 57, 48], 'C/E': [40, 48, 55, 48], 'Dm7': [38, 45, 53, 57], 'Bbmaj7': [34, 46, 53],
      'Gm7': [43, 50, 53]}
for b, d, name in chF:
    ns = lh[name]
    for k, m in enumerate(ns[:int(d * 2)]):
        play_melody(F, [(b + k * 0.5, d - k * 0.5, m)], 'piano', vel=0.26 if k else 0.32, pan=-0.25, send=0.5,
                    gain=0.8, tjit=0.012)
play_pad(F, chF, vel=0.14, attack=1.2, release=1.2, fc=1500, bass=False, spread=0.8, overlap=0.3)
play_pad(F, [(4, 2, 'Dm7'), (6, 1, 'Bbmaj7'), (7, 1, 'Gm7')], vel=0.06, octave=12, attack=1.2, release=1.0,
         fc=2400, bass=False, spread=0.9, voices=3)
play_melody(F, [(2, .5, 96), (6, .5, 93)], 'musicbox', vel=0.12, pan=0.5, send=0.7)

# ================================================================== G: lift-off 53–54
G = Sec(53.0, 60)
events.append((53.0, 'G lift-off swell: C7sus4 crescendo + harp gliss'))
for i, m in enumerate([58, 60, 65, 67, 70, 72, 77]):
    x = string_voice(m, 1.05, 0.2, rng=rng, attack=0.9, release=0.3, fc=2600, voices=4)
    bus.add(x, 52.95, pan=-0.6 + 1.2 * i / 6, send=0.55)
x = string_voice(48, 1.05, 0.25, rng=rng, attack=0.8, release=0.3, fc=900, voices=4)
bus.add(x, 52.95, pan=0.2, send=0.4)
for i, m in enumerate([72, 77, 79]):
    bus.add(choir(m, 1.05, 0.14, rng=rng, attack=0.9, release=0.4), 52.95, pan=-0.4 + 0.4 * i, send=0.7)
glG = [60, 62, 65, 67, 69, 72, 74, 77, 79, 81, 84, 86, 89, 91, 93]
for k, m in enumerate(glG):
    bus.add(harp(m, 0.18 + 0.2 * k / len(glG), dur=1.5, rng=rng), 53.0 + 0.95 * k / len(glG), pan=-0.5 + 0.07 * k,
            send=0.55)
bus.add(cymbal_swell(0, 1.0, rng=rng, tail=2.0), 53.0, send=0.5, gain=0.3)

# ================================================================== H: finale 54–60 (80 BPM)
H = Sec(54.0, 80)
events.append((54.0, 'H finale: Bbmaj7 | C7sus4 C7 | F (57.0) ring & fade to 60'))
chH = [(0, 2, 'Bbmaj7'), (2, 1, 'C7sus4'), (3, 1, 'C7')]
play_pad(H, chH, vel=0.28, attack=0.15, release=0.4, fc=2400, bass=True, bass_vel=0.32, choir_vel=0.16,
         overlap=0.1)
mel = [(0, .5, 81), (.5, .5, 84), (1, 2, 89), (3, 1, 88)]
play_melody(H, mel, 'strings', vel=0.28, pan=-0.2, send=0.55, attack=0.08, release=0.4, fc=4200, voices=5)
play_melody(H, mel, 'strings', vel=0.22, transpose=-12, pan=0.25, send=0.55, attack=0.08, release=0.4, fc=3200,
            voices=5)
play_melody(H, mel, 'glock', vel=0.14, pan=0.35, send=0.6)
play_melody(H, mel, 'piano', vel=0.3, transpose=-12, pan=-0.1, send=0.5, gain=0.7)
arp(H, 0, 2, [62, 65, 69, 74], step=0.5, vel=0.28, pan=-0.4)
arp(H, 2, 2, [64, 67, 70, 72], step=0.5, vel=0.3, pan=-0.4)
# final F (57.0) — long ring
TF = H.t(4)
fin_len = 2.3
for i, m in enumerate([53, 57, 60, 65, 67, 69, 72, 77]):
    x = string_voice(m, fin_len, 0.24 if m < 70 else 0.2, rng=rng, attack=0.12, release=0.6, fc=2600, voices=5)
    bus.add(x, TF, pan=-0.7 + 1.4 * i / 7, send=0.6)
x = string_voice(89, fin_len, 0.22, rng=rng, attack=0.1, release=0.6, fc=5000, voices=5)
bus.add(x, TF, pan=-0.1, send=0.65)
x = string_voice(41, fin_len, 0.32, rng=rng, attack=0.15, release=0.6, fc=800, voices=4)
bus.add(x, TF, pan=0.2, send=0.4)
for i, m in enumerate([69, 72, 77, 81]):
    bus.add(choir(m, fin_len, 0.16, rng=rng, attack=0.4, release=0.6), TF, pan=0.5 - 0.33 * i, send=0.7)
for m in [29, 41, 53, 60, 65, 69]:
    bus.add(piano(m, 2.6, 0.45, rng=rng), TF + rng.uniform(0, 0.012), pan=-0.15, send=0.5, gain=0.8)
bus.add(timpani(41, 0.35, rng=rng, dur=2.5), TF, send=0.35)
for k, m in enumerate([65, 69, 72, 77, 81, 84, 89]):
    bus.add(harp(m, 0.26, dur=2.5, rng=rng), TF + 0.09 * k, pan=-0.4, send=0.55)
for k, m in enumerate([89, 93, 96, 101]):
    bus.add(music_box(m, 0.22, rng=rng), TF + 0.6 + 0.3 * k, pan=0.4 - 0.2 * k, send=0.7)

# ------------------------------------------------------------------ mixdown
print('reverb...')
ir = make_ir(rt_low=2.8, rt_mid=2.4, rt_high=1.3, length=3.6, predelay=0.025)
wet = reverb(bus.send, ir)
mix = bus.dry + 0.42 * wet
# master EQ: rumble cut, clear space for dialogue presence, gentle air
mix = bq(mix, 'hp', 38, 0.7)
mix = bq(mix, 'peak', 2000, 0.8, -3.5)
mix = bq(mix, 'peak', 350, 0.9, -1.5)
mix = bq(mix, 'highshelf', 9000, 0.7, 1.5)
mix -= mix.mean(axis=1, keepdims=True)
# final fade to silence by 60.0
t = np.arange(N) / SR
fade = np.ones(N)
fs, fe = 58.0, 59.92
m_ = (t >= fs)
fade[m_] = np.clip(0.5 * (1 + np.cos(np.pi * np.clip((t[m_] - fs) / (fe - fs), 0, 1))), 0, 1)
mix *= fade
fade_edges(mix, 0.02, 0.01)

import pyloudnorm as pyln
meter = pyln.Meter(SR)
L = meter.integrated_loudness(mix.T)
TARGET = -20.0
mix *= 10 ** ((TARGET - L) / 20)
pk = np.abs(mix).max()
if pk > 10 ** (-1.5 / 20):
    mix = soft_limit(mix, -1.3)
print('pre-norm LUFS %.2f -> target %.1f, peak %.2f dBFS' % (L, TARGET, 20 * np.log10(np.abs(mix).max())))
write_wav(os.path.join(ROOT, 'audio', 'bgm.wav'), mix)
with open(os.path.join(os.path.dirname(__file__), 'bgm_events.txt'), 'w') as f:
    for tt, lab in events:
        f.write('%6.2f  %s\n' % (tt, lab))
print('wrote audio/bgm.wav')
