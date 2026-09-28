#!/bin/bash
# 13 張全版背景（12 主題＋generic），無人物、留白多、供文字覆蓋。輸出 bg/<slug>.webp
set -u
ROOT="$HOME/projects/daily-japanese-365"; PNGDIR="$HOME/projects/_daily-japanese-365-png/bg"; mkdir -p "$PNGDIR"
gen() {
  local slug="$1" scene="$2" TMP="/tmp/dj365-bg-$1.png" WEBP="$ROOT/bg/$1.webp"
  if [ -f "$WEBP" ] && [ "$(stat -f%z "$WEBP")" -gt 20000 ]; then echo "skip $slug"; return 0; fi
  local PROMPT="請生成一張圖片，存成 ${TMP} 。Wide atmospheric background illustration in splash-ink (潑墨) style fused with American cartoon color accents: loose wet black ink washes, rice-paper texture, sparse accent colors (vermilion red, indigo, ochre) bleeding into ink, lots of soft white space especially in the center, low contrast and gentle so text can be overlaid on top. Scene, environment only, NO people, NO characters, NO animals: $scene. No text, no letters, no signs with words, no watermark. Landscape 3:2 (1536x1024)."
  /bin/rm -f "$TMP"
  (cd "$HOME/Library/Mobile Documents/com~apple~CloudDocs/naicheng-codex-agent" && perl -e 'alarm 300; exec @ARGV' command codex exec --skip-git-repo-check "$PROMPT" </dev/null >"/tmp/dj365-bg-$slug.log" 2>&1)
  if [ -f "$TMP" ] && [ "$(stat -f%z "$TMP")" -gt 100000 ]; then
    mv "$TMP" "$PNGDIR/$slug.png"
    ffmpeg -y -loglevel error -i "$PNGDIR/$slug.png" -vf "scale=1600:-2" -c:v libwebp -quality 72 "$WEBP" && echo "ok $slug $(stat -f%z "$WEBP")"
  else echo "FAIL $slug"; return 1; fi
}
gen generic   "a misty ink-wash Japanese townscape with a red torii gate, a wooden bridge over a stream, distant Mount-Fuji-like peak, a few cherry blossom branches"
gen jiaotong  "a Japanese train station platform with a commuter train, ticket gates, a shinkansen nose in the distance, a yellow tactile paving line, a bus stop sign shape without words"
gen canyin    "a cozy Japanese ramen shop interior with a wooden counter, steaming bowls, a noren curtain, paper lanterns, a ticket vending machine without text"
gen gouwu     "a Japanese shopping arcade with small storefronts under a glass roof, a convenience store, a capsule toy machine, shopping baskets, hanging noren"
gen zhusu     "a Japanese ryokan room with tatami mats, a low table, sliding shoji screens opening to a garden with a stone lantern and an outdoor hot spring bath"
gen gongzuo   "a bright Japanese office with rows of desks, laptops, a meeting room behind glass, a whiteboard with only doodles, city view through tall windows"
gen xuexiao   "a Japanese school classroom with wooden desks in rows, a blank blackboard, a school building with a clock and cherry trees outside, a row of shoe lockers"
gen yiliao    "a calm Japanese clinic waiting room with a reception counter, numbered ticket machine without words, potted plants, a drugstore shelf with bottles, soft light"
gen jinrong   "a Japanese post office and bank corner with a red cylindrical mailbox, an ATM booth, a queue rope, envelopes and coins on a counter"
gen shejiao   "a Japanese park with a bench under a cherry tree, a small izakaya table with two glasses and skewers, string lights, a festival lantern"
gen jiating   "a warm Japanese apartment living room with a kotatsu, a small kitchen with a rice cooker, laundry drying on a balcony, a genkan entrance with shoes"
gen xiuxian   "a Japanese leisure scene: a karaoke room glow, a baseball stadium, a snowy ski slope, a public bath house entrance, a bicycle by a river path"
gen jinji     "a Japanese street corner with a small police box (koban), a fire hydrant, a coin locker bank, a rainy street with clear umbrellas, a red emergency light"
