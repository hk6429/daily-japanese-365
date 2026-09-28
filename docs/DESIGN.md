# 日語日日聽 設計摘要（2026-09-29）

仿英語日日聽（daily-english-365）骨架，改為日本在地生活情境 365 則，每則 5 句 A/B 對話。

- 資料：`data/scenes.json`，欄位 `title_ja / title_zh / scene_zh / image_prompt_en / lines[5]{speaker, ja, kana, zh}`；12 主題各 30（緊急與服務 35）。
- 三層揭曉：日文 → 假名 → 中譯，各自遮字；`看假名` 連帶揭日文，`看中譯` 揭全部。
- 讀音品質閘門：`validate.cjs`（kana 只允許假名／標點）＋ `check-kana.cjs`（kuromoji 讀音比對，差異人工裁決）。
- 語音：edge-tts `ja-JP-KeitaNeural`（A）／`ja-JP-NanamiNeural`（B），餵漢字原句。
- 配圖：與英語版同風格 prompt，加「set in Japan」；批次腳本等英語版 `scratch/img-done` 才啟動。
- 部署：CF Pages ＋ Netlify（不推 Vercel），先上文字＋語音，缺圖顯示墨點佔位，圖完成後重部署。
