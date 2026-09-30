#!/bin/bash
# フレーム + ミックス音声 → out/hoshi_wo_hirotta_yoru.mp4
set -e; cd "$(dirname "$0")/.."
ffmpeg -y -loglevel error -framerate 30 -i out/frames/%05d.jpg -i audio/final_mix.wav \
  -c:v libx264 -preset slow -crf 17 -pix_fmt yuv420p -tune animation -movflags +faststart \
  -c:a aac -b:a 256k -shortest out/hoshi_wo_hirotta_yoru.mp4
ls -la out/hoshi_wo_hirotta_yoru.mp4
