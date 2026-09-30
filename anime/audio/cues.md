# 『星をひろった夜』 — music & SFX cue sheet

All audio is synthesized in Python (numpy/scipy); nothing is sampled. The code is in `tools/audio/`:
`synth.py` (instruments and reverb), `score.py` → `bgm.wav`, `sfx.py` → `sfx.wav`, `mix_test.py` → `test_mix.wav`, `analyze.py` / `check.py` (QC).
Format: 48 kHz, stereo, 16-bit, 60.000 s.

## BGM (`bgm.wav`): F major, about 80 BPM. Integrated −20.1 LUFS, true peak −2.7 dBFS
Tempo is set per section so that every downbeat lands on a scene cue.

**Main theme** (the same 5 bars are used everywhere): `A C F. E F | G. F E C | D F A. G | A G F D. F | G. F E G A B♭ C E → F`.
Harmony: I – V⁶ – vi7 – vi7/C – IV△7 – ii7 – V7sus4 – V7 – I.

| Time | Section / tempo | Harmony | Orchestration |
|---|---|---|---|
| 0–9 | A intro, 80 BPM, 3 bars | F · C/E · Dm7 Dm7/C | The music box plays theme bars 1–3 an octave up, over a soft harp arpeggio and a string pad fading in. A celesta echo answers it. |
| 9–21 | B curious, 80 BPM, 4 bars | B♭△7 · F/A · Gm7 · C7sus4 C7 | Pizzicato bass and off-beat "tik" plucks. The celesta asks rising questions that end on B♭6. |
| 21–26.8 | C sad turn, 82.8 BPM, 2 bars | Dm · Dm/C · B♭△7 · Gm6 A7sus4 A7 | The C7 → Dm deceptive cadence starts the section. Sustained strings, a descending cello line and a sighing piano line. |
| 26.8–29.6 | D hopeful lift, 85.7 BPM | B♭add9 · Csus4 C | The strings rise F G A C and a celesta arpeggio shimmers upward. |
| 29.6–31.0 | Running pickup | C7 | Pizzicato 8ths, staccato strings, a music-box 16th run from C5 to C6, and a timpani and shaker crescendo. |
| 31–44.6 | E warm build, 88.2 BPM, 5 bars (2.72 s each) | F · C/E · Dm7 Dm7/C · B♭△7 Gm7 · C7sus4 C7 | The full theme, played by piano and celesta. Strings join in bar 2. In bar 3 the choir, cello countermelody and bass drum join. In bar 4 the high strings and glockenspiel double the melody. Bar 5 adds a timpani roll, a cymbal swell peaking at 44.6 and a harp glissando. |
| **44.6** | **CLIMAX** | **F** | Tutti F chord: strings over 3 octaves, choir, glockenspiel, piano, timpani and bass drum. The melody lands on F6. |
| 45–53 | F tender reprise, 60 BPM | F C/E · Dm7 · B♭△7 Gm7 | Solo piano plays the theme slowly over a very soft string pad. |
| 53–54 | G lift-off | C7sus4 | Strings and choir crescendo while a harp glissando rises from C4 to A6. |
| 54–60 | H finale, 80 BPM | B♭△7 · C7sus4 C7 · **F at 57.0** | The theme head is augmented (A C F — E — F) in strings in octaves with choir, glockenspiel and piano. The final F add9 chord (57.0) rings out and fades between 58.0 and 59.92. The file ends in silence. |

Mixing notes:
- Reverb is a synthetic 3.6 s hall. The master EQ applies −3.5 dB at 2 kHz and −1.5 dB at 350 Hz to leave room for speech.
- Melodies sit mostly between A4 and F6.

## SFX (`sfx.wav`): integrated −25.0 LUFS, true peak −5.3 dBFS

| Time | Cue |
|---|---|
| 3.6→7.4 | Shooting star. A band-pass whoosh sweeps from 7.5 kHz down to 1.5 kHz, with a "hyuu" tone gliding from 2.6 kHz to 620 Hz and pans from right to centre. A sparkle cloud follows it. Between 5.0 and 6.8 the whoosh sputters with irregular dropouts and pitch warble. |
| 7.4 | Soft "posu" landing: a thump, a grass puff and a sparkle spray. |
| 11.8 / 12.3 / 12.8 | Three soft grass footsteps. |
| 17.6 | Scoop "kira": a rising C6 F6 A6 C7 figure with an airy shimmer. |
| 23.5 | Power-down flicker. A hum glides from 880 to 370 Hz and stutters; its deepest dip lands on 23.5. |
| 29.8–31.0 | Seven running footsteps, 0.2 s apart. |
| 34.8 + 0.35k (k = 0..15) | Window chimes on F-pentatonic notes, rising in 4-note waves: F5 G5 A5 C6 · G5 A5 C6 D6 · A5 C6 D6 F6 · C6 D6 F6 G6. |
| 36.2 | Lantern orb: a rising whoosh plus a glass chime gliding from C6 to F6, with a sparkle trail. |
| 38.8 | Fireflies: a wing flutter plus tiny high sparkles. |
| 40.5→44.6 | Energy absorption. Noise swells as a low-pass filter opens, the pan swirls faster and faster, sparkles get denser and a sub rumble builds. It cuts off at 44.58. |
| 44.6 | Big burst: a transient, a sub boom, a down-sweep, a bell spray tuned to F add9 and a 3 s air shimmer. |
| 50.9 | Hairpin "kiran": an upward glint into F7 and C7 bells. |
| 53.0–55.0 | Lift-off "shuwaa": a band-pass sweep from 0.9 to 7.5 kHz with a sparkle trail. |
| 55.5 + 0.25k (k = 0..7) | Constellation twinkles: F5 G5 A5 C6 D6 F6 A6 C7, which fit the final F chord. |
| 57.3 | Title shimmer: a glass glissando, air and soft F chord bells. |

**Ambience (whole length):**
- Three suzumushi (bell crickets, around 4.2–4.5 kHz "riin" trills) and three kōrogi (field crickets, 4.5–4.9 kHz chirps), plus a distant chorus. They fade out between 33.5 and 35.0, stay silent until 46.0, and come back softly from 46 to 48.5.
- Soft wind with a gust from 26.8 to 29.6.
- Both fade out by 59.95.

## Test mix (`test_mix.wav`)
BGM at −8 dB, SFX at 0 dB and dialogue at the start times in `timeline.json`, with no ducking. Integrated −20.7 LUFS; the dialogue alone is −21.2 LUFS.
