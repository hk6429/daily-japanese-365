# 日語日日聽 daily-japanese-365

每天一個日本生活情境、5 句實用日語對話。先聽、再看日文、漢字不會讀再看假名、最後看中譯，逐句重播、0.75× 慢速，記錄已練天數與連續天數。365 個情境依「台北時區一年第幾天」輪播，`?d=N` 可跳任一天，`archive.html` 依主題總覽。姊妹站：[英語日日聽](https://daily-english-365.pages.dev)。

- 純靜態站，無框架、無後端、免帳號。
- 12 大主題：交通、餐飲、購物、住宿旅遊、工作、學校、醫療健康、金融郵政、社交人際、家庭生活、休閒運動、緊急與服務，情境全部設定在日本。
- 難度 JLPT N5–N4 為主；每句附全假名讀音（正字法：助詞は／へ不改寫，文節間以空格分隔）；每句標示角色（客人／店員等）。
- 配圖：潑墨水墨 × 美式 Q 版（1:1 頭身），AI 生成。
- 語音：edge-tts 神經語音（A＝ja-JP-Keita、B＝ja-JP-Nanami）。

## 結構

```
index.html / archive.html
css/style.css  js/app.js  js/day.js  js/cats.js
data/scenes.json   365 筆 {id, category, title_ja, title_zh, scene_zh, image_prompt_en, roles{A,B}, lines[5]{speaker,ja,kana,zh}}
img/NNN.webp       365 張 4:3
audio/NNN-K.mp3    1825 檔
scripts/           validate.cjs / check-kana.cjs / space-kana.cjs / fix-particles.cjs / check-assets.cjs / merge-batches.cjs / gen-audio.py / gen-image.sh / gen-images-all.sh / gen-bg.sh
test/              day.test.mjs（node --test）、smoke.mjs（Playwright WebKit）
```

## 開發

```bash
npm install                   # kuromoji（讀音比對用）
npm test                      # 日期邏輯 + 資料驗證 + 資產檢查
npm run kana                  # kuromoji 讀音 vs 資料 kana 差異 → scratch/kana-diff.tsv
node scripts/space-kana.cjs   # 重算 kana 文節空格（改過 ja/kana 後跑）
STRICT_IMG=1 npm test         # 上線前：缺圖視為錯誤
python3 scripts/gen-audio.py  # 補產缺的 mp3（已存在跳過）
scripts/gen-images-all.sh     # 補產缺的配圖（codex exec，4 線）
npx serve .                   # 本機預覽
```

## 授權

對話文字 CC BY-NC 4.0；插畫為 AI 生成、語音為合成人聲，僅供學習用途。
