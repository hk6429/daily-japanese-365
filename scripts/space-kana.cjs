// kana 欄分かち書き（文節切）：以 kuromoji 對 ja 斷詞，把助詞／助動詞／接尾黏到前一文節，再對齊 kana 插入空格。對不齊的那一段就不切。
const fs=require('fs'),path=require('path'),kuromoji=require('kuromoji');
const s=JSON.parse(fs.readFileSync('data/scenes.json','utf8'));
const k2h=t=>t.replace(/[ァ-ヶ]/g,c=>String.fromCharCode(c.charCodeAt(0)-0x60));
const PUNCT=/^[、。？！…]+$/;
const attach=t=>t.pos==='助詞'||t.pos==='助動詞'||t.pos_detail_1==='接尾'||t.pos_detail_1==='非自立'||(t.pos==='動詞'&&t.pos_detail_1==='非自立')||t.surface_form==='ん';
kuromoji.builder({dicPath:path.join(path.dirname(require.resolve('kuromoji')),'..','dict')}).build((e,tk)=>{
 if(e) throw e; let full=0,partial=0;
 for(const x of s) for(const l of x.lines){
  const raw=l.kana.replace(/\s+/g,'');
  const toks=tk.tokenize(l.ja).filter(t=>t.surface_form.trim());
  // 文節
  const bun=[];let prevT=null,pendPrefix=false;
  for(const t of toks){const r=k2h(t.reading||t.surface_form);if(PUNCT.test(t.surface_form)){bun.push({r:t.surface_form,p:true});prevT=null;pendPrefix=false;continue;}
   const last=bun.length?bun[bun.length-1]:null;
   let glue=last&&!last.p&&(attach(t)||pendPrefix
     ||(t.pos==='動詞'&&['する','ます','まし','いる','ある','なる'].includes(t.basic_form)&&prevT&&(prevT.pos==='名詞'||prevT.pos==='動詞'))
     ||(t.pos==='名詞'&&prevT&&prevT.pos==='名詞'&&prevT.pos_detail_1!=='代名詞'&&t.pos_detail_1!=='代名詞')
     ||(t.pos==='動詞'&&prevT&&prevT.pos==='動詞'&&prevT.conjugated_form&&prevT.conjugated_form.startsWith('連用'))
     ||(t.surface_form==='まして'||t.basic_form==='ます'));
   if(glue) last.r+=r; else bun.push({r,p:false});
   pendPrefix=(t.pos==='接頭詞'); prevT=t;}
  // 對齊
  const cuts=[];let c=0,ok=true;
  for(let i=0;i<bun.length;i++){const b=bun[i];
   if(raw.startsWith(b.r,c)){c+=b.r.length;cuts.push(c);continue;}
   // 找下一個能定位的文節
   let j=i+1,idx=-1;while(j<bun.length){idx=raw.indexOf(bun[j].r,c+1);if(idx>=0)break;j++;}
   if(idx<0){ok=false;break;}
   c=idx;cuts.push(c);i=j-1;
  }
  const kanaFull=(raw.match(/[、。？！…]/g)||[]).length;
  let out='',prev=0;const set=new Set(cuts);
  for(let i=0;i<raw.length;i++){out+=raw[i];if(set.has(i+1)&&i+1<raw.length&&!PUNCT.test(raw[i+1])&&!(PUNCT.test(raw[i])&&false)) out+=' ';}
  out=out.replace(/ ([、。？！…])/g,'$1').replace(/([、。？！…]) ?/g,'$1 ').replace(/\s+$/,'').replace(/ {2,}/g,' ');
  if(ok) full++; else partial++;
  l.kana=out;
 }
 fs.writeFileSync('data/scenes.json',JSON.stringify(s,null,1));
 console.log('spaced full',full,'partial',partial);
});
