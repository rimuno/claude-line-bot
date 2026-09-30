"""台本(script.json)からVOICEVOXで音声を合成し、口パク用の母音タイミング付き timeline.json を出力する。"""
import glob, json, sys, wave, os
from voicevox_core.blocking import Onnxruntime, OpenJtalk, Synthesizer, VoiceModelFile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
script = json.load(open(f"{ROOT}/script.json"))
ort = Onnxruntime.load_once(filename=glob.glob("/opt/vv/voicevox_onnxruntime-linux-x64-*/lib/libvoicevox_onnxruntime.so.*")[0])
syn = Synthesizer(ort, OpenJtalk("/opt/vv/open_jtalk_dic_utf_8-1.11"))
need = {l["style"] for l in script["lines"]}
for f in sorted(glob.glob("/opt/vv/*.vvm")):
    with VoiceModelFile.open(f) as m:
        if any(s.id in need for c in m.metas for s in c.styles):
            syn.load_voice_model(m)

out = []
for i, l in enumerate(script["lines"]):
    q = syn.create_audio_query(l.get("kana_text", l["text"]), l["style"])
    q.speed_scale = l.get("speed", 1.0)
    q.pitch_scale = l.get("pitch", 0.0)
    q.intonation_scale = l.get("intonation", 1.15)
    q.volume_scale = l.get("volume", 1.0)
    q.pre_phoneme_length = 0.05
    q.post_phoneme_length = 0.15
    q.output_sampling_rate = 48000
    wav = syn.synthesis(q, l["style"])
    path = f"{ROOT}/audio/line_{i:02d}.wav"
    open(path, "wb").write(wav)
    with wave.open(path) as w:
        dur = w.getnframes() / w.getframerate()
    # 母音タイミング（口パク）
    sp = q.speed_scale
    t = q.pre_phoneme_length / sp
    visemes = []
    for ap in q.accent_phrases:
        for m in ap.moras:
            c = (m.consonant_length or 0) / sp
            v = m.vowel_length / sp
            if c:
                visemes.append([round(t, 3), round(t + c, 3), "c"])
            t += c
            visemes.append([round(t, 3), round(t + v, 3), m.vowel])
            t += v
        if ap.pause_mora:
            pm = ap.pause_mora
            v = (pm["vowel_length"] if isinstance(pm, dict) else pm.vowel_length) / sp
            visemes.append([round(t, 3), round(t + v, 3), "pau"])
            t += v
    out.append({**l, "index": i, "file": f"audio/line_{i:02d}.wav", "duration": round(dur, 3),
                "end": round(l["start"] + dur, 3), "visemes": visemes})
    print(f"{i:2d} {l['speaker']:6s} {l['start']:6.2f}-{l['start']+dur:6.2f} ({dur:.2f}s) {l['text']}")

# 重なりチェック
for a, b in zip(out, out[1:]):
    if a["end"] > b["start"] - 0.1:
        print(f"!! OVERLAP line {a['index']} ends {a['end']} > next start {b['start']}")
TL = {**{k: v for k, v in script.items() if k != "lines"}, "lines": out}
json.dump(TL,
          open(f"{ROOT}/timeline.json", "w"), ensure_ascii=False, indent=1)
open(f"{ROOT}/timeline.js", "w").write("window.TIMELINE=" + json.dumps(TL, ensure_ascii=False) + ";")
