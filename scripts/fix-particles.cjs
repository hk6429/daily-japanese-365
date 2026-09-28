// 一次性：kana 欄助詞 わ/え → 正字 は/へ（依 kuromoji 前一 token 讀音對齊）
const fs=require('fs'),path=require('path'),kuromoji=require('kuromoji');
const s=JSON.parse(fs.readFileSync('data/scenes.json','utf8'));
const k2h=t=>t.replace(/[ァ-ヶ]/g,c=>String.fromCharCode(c.charCodeAt(0)-0x60));
kuromoji.builder({dicPath:path.join(path.dirname(require.resolve('kuromoji')),'..','dict')}).build((e,tk)=>{
 if(e) throw e; let n=0,miss=[];
 for(const x of s) x.lines.forEach((l,li)=>{
  let k=l.kana; const toks=tk.tokenize(l.ja); let cur=0;
  for(let i=0;i<toks.length;i++){const t=toks[i];
   let from,to; if(t.pos!=='助詞'&&t.pos!=='接続詞') continue;
   if(t.surface_form==='は'){from='わ';to='は';} else if(t.surface_form==='へ'){from='え';to='へ';} else if(t.surface_form==='では'){from='でわ';to='では';} else continue;
   const prevRaw=i>0?(toks[i-1].reading||toks[i-1].surface_form):'';
   let done=false;
   for(const prev of [k2h(prevRaw),prevRaw,toks[i-1]?toks[i-1].surface_form:'']){ if(done) break;
   for(let len=Math.min(prev.length,4);len>=1;len--){const pre=prev.slice(prev.length-len);const pat=pre+from;const idx=k.indexOf(pat,cur);
    if(idx>=0){k=k.slice(0,idx)+pre+to+k.slice(idx+pat.length);cur=idx+pre.length+to.length;done=true;break;}}}
   if(!done&&i===0&&k.startsWith(from)){k=to+k.slice(from.length);cur=to.length;done=true;}
   if(!done){const rest=k.slice(cur);const cnt=rest.split(from).length-1;if(cnt===1){const idx=k.indexOf(from,cur);k=k.slice(0,idx)+to+k.slice(idx+from.length);cur=idx+to.length;done=true;}}
   if(!done) miss.push(`${x.id}-${li+1}\t${t.surface_form}\t${l.ja}\t${k}`);
  }
  k=k.replace(/^(それ)?でわ/,'$1では');
  if(k!==l.kana){n++;l.kana=k;}
 });
 fs.writeFileSync('data/scenes.json',JSON.stringify(s,null,1));
 fs.writeFileSync('scratch/particle-miss.tsv',miss.join('\n'));
 console.log('lines changed',n,'unresolved',miss.length);
});
