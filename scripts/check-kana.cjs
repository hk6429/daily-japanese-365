// kuromoji 自動讀音 vs LLM kana 比對；差異寫 scratch/kana-diff.tsv 供人工裁決。
// 用法：node scripts/check-kana.cjs   （只報告，不擋）
const fs=require('fs'),path=require('path');
const kuromoji=require('kuromoji');
const s=JSON.parse(fs.readFileSync('data/scenes.json','utf8'));
const k2h=t=>t.replace(/[ァ-ヶ]/g,c=>String.fromCharCode(c.charCodeAt(0)-0x60));
const norm=t=>k2h(t).replace(/[\s、。？！,.?!「」…ー]/g,'');
kuromoji.builder({dicPath:path.join(path.dirname(require.resolve('kuromoji')),'..','dict')}).build((e,tk)=>{
 if(e) throw e; const out=[]; let total=0;
 for(const x of s) x.lines.forEach((l,k)=>{ total++;
  const auto=tk.tokenize(l.ja).map(t=>t.reading||t.surface_form).join('');
  if(norm(auto)!==norm(l.kana)) out.push([`${x.id}-${k+1}`,l.ja,l.kana,k2h(auto)].join('\t')); });
 fs.writeFileSync('scratch/kana-diff.tsv',out.join('\n'));
 console.log(`kana diff ${out.length}/${total} → scratch/kana-diff.tsv`);
});
