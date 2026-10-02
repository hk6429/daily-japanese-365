import { todayIndex, parseDay, taipeiDateKey } from './day.js';
import { bgFor, setPageBg } from './cats.js';
import { loadDone, markDone, doneDate, isDoneToday, streakInfo, practicedDays, earnedBadges, nextBadge, loadVoice, addVoice } from './progress.js';
import { STAGES, plan, total, initial, advance, needsAudio, progress, loadMission, saveMission } from './mission.js';
import { shareCard } from './share.js';

const $ = (s, r = document) => r.querySelector(s);
const pad = n => String(n).padStart(3, '0');
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const state = { scenes: [], id: 1, rate: 1, playing: false };
const player = new Audio(); // 單一元素重用：iOS 首次手勢解鎖後，後續換 src 才能自動連播
let playToken = 0;

async function main() {
  state.scenes = await (await fetch('data/scenes.json')).json();
  state.id = parseDay(location.search) ?? todayIndex();
  render();
}

function scene() { return state.scenes[state.id - 1]; }

function render() {
  stopAll(); closeMission();
  const x = scene();
  const today = todayIndex();
  document.title = `${x.title_zh} — 日語日日聽`;
  $('#dayLabel').textContent = state.id === today ? `今天 · 第 ${state.id} 天` : `第 ${state.id} 天`;
  $('#cat').textContent = x.category;
  setPageBg(bgFor(x.category));
  $('#titleZh').textContent = x.title_zh;
  $('#titleJa').textContent = x.title_ja;
  $('#scene').textContent = x.scene_zh;
  const hero = $('#hero');
  hero.classList.remove('missing');
  const img = $('#heroImg');
  img.alt = x.title_zh;
  img.onerror = () => { hero.classList.add('missing'); img.style.display = 'none'; };
  img.style.display = '';
  img.src = `img/${pad(x.id)}.webp`;

  const ul = $('#lines'); ul.innerHTML = '';
  x.lines.forEach((l, k) => {
    const li = document.createElement('li');
    li.className = 'line hide-ja hide-kana hide-zh'; li.dataset.k = k + 1;
    const role = (x.roles && x.roles[l.speaker]) || l.speaker;
    li.innerHTML = `<button class="play" aria-label="播放第 ${k + 1} 句">▶</button>
      <div><span class="spk spk-${l.speaker}"></span><span class="ja" lang="ja"></span><span class="kana" lang="ja"></span><span class="zh"></span></div>`;
    $('.spk', li).textContent = role; $('.ja', li).textContent = l.ja; $('.kana', li).textContent = l.kana; $('.zh', li).textContent = l.zh;
    $('.play', li).onclick = () => { stopAll(); playLine(k + 1); };
    $('.ja', li).onclick = () => li.classList.remove('hide-ja');
    $('.kana', li).onclick = () => li.classList.remove('hide-kana');
    $('.zh', li).onclick = () => li.classList.remove('hide-zh');
    ul.appendChild(li);
  });
  $('#prev').disabled = state.id <= 1; $('#next').disabled = state.id >= 365;
  renderDone();
  renderMissionBtn();
}

const yesterdayKey = () => taipeiDateKey(new Date(Date.now() - 86400000));
const isYesterdayLesson = () => state.id === todayIndex() - 1;

function renderDone() {
  const list = loadDone(); const x = scene();
  const done = isDoneToday(list, x.id) || (isYesterdayLesson() && isDoneToday(list, x.id, yesterdayKey())); // 補課記在昨天
  const btn = $('#doneBtn');
  btn.classList.toggle('is-done', done); btn.textContent = done ? '✓ 已完成' : '完成這一課';
  const { streak: s, freezes } = streakInfo(list); const days = practicedDays(list), voice = loadVoice();
  $('#stats').innerHTML = `已練 <b>${days}</b> 天 · 連續 <b>${s}</b> 天${freezes ? ` · 保護卡 <b>${freezes}</b>` : ''}`;
  const y = $('#missed'); const today = taipeiDateKey();
  const backfill = `<a href="?d=${Math.max(1, todayIndex() - 1)}">補一課</a>`;
  y.hidden = !(list.length > 0 && !list.some(v => v.d === yesterdayKey()) && !list.some(v => v.d === today) && state.id === todayIndex());
  if (!y.hidden) y.innerHTML = s > 0 ? `昨天沒練到，保護卡先幫你保住連續 ${s} 天；${backfill}就能把卡省下來。` : `昨天沒練到？${backfill}，連續天數會接回來。`;
  renderBadges(days, voice);
  $('#shareBtn').hidden = !done;
  $('#stamp').classList.toggle('show', done);
  $('#stampSay').classList.toggle('show', loadMission(x.id).done);
}

// 里程碑：已得的印章＋下一枚目標；新得的那枚彈一下
function renderBadges(days, voice) {
  const got = earnedBadges(days, voice).map(b => b.label); const nb = nextBadge(days, voice);
  let seen = []; try { seen = JSON.parse(localStorage.getItem('dj365.badges') || '[]'); } catch {}
  const box = $('#badges');
  box.hidden = !got.length && !nb;
  box.innerHTML = got.map(l => `<span class="badge${seen.includes(l) ? '' : ' pop'}">${esc(l)}</span>`).join('')
    + (nb ? `<span class="badge-next">下一枚「${esc(nb.label)}」${esc(nb.left)}</span>` : '<span class="badge-next">全部收齊！</span>');
  try { localStorage.setItem('dj365.badges', JSON.stringify(got)); } catch {}
}
function complete(id) { markDone(id, doneDate(loadDone(), isYesterdayLesson())); renderDone(); }

function speakFallback(k) {
  return new Promise(res => {
    if (!('speechSynthesis' in window)) return res();
    const u = new SpeechSynthesisUtterance(scene().lines[k - 1].ja);
    u.lang = 'ja-JP'; u.rate = state.rate; u.onend = res; u.onerror = res;
    speechSynthesis.cancel(); speechSynthesis.speak(u);
  });
}
function markPlaying(k) {
  document.querySelectorAll('.line.playing').forEach(e => e.classList.remove('playing'));
  const li = $(`.line[data-k="${k}"]`); li && li.classList.add('playing');
}
// 回傳的 Promise 在播完、或被 stopAll 取代時 resolve
function playLine(k) {
  const token = ++playToken;
  markPlaying(k);
  return new Promise(res => {
    const finish = () => {
      player.onended = player.onerror = null;
      if (token === playToken) document.querySelectorAll('.line.playing').forEach(e => e.classList.remove('playing'));
      res();
    };
    state.stopRes = res;
    player.onended = finish;
    player.onerror = () => { if (token !== playToken) return res(); speakFallback(k).then(finish); };
    player.src = `audio/${pad(state.id)}-${k}.mp3`;
    player.playbackRate = state.rate;
    player.play().catch(() => { if (token !== playToken) return res(); speakFallback(k).then(finish); });
  });
}
function stopAll() {
  playToken++;
  state.playing = false;
  player.onended = player.onerror = null;
  try { player.pause(); } catch {}
  if (state.stopRes) { state.stopRes(); state.stopRes = null; }
  if ('speechSynthesis' in window) speechSynthesis.cancel();
  document.querySelectorAll('.line.playing').forEach(e => e.classList.remove('playing'));
  $('#playAll').textContent = '▶ 聽全部'; $('#playAll').classList.remove('primary');
}

async function playAll() {
  if (state.playing) return stopAll();
  state.playing = true; $('#playAll').textContent = '■ 停止'; $('#playAll').classList.add('primary');
  const myToken = playToken + 1;
  for (let k = 1; k <= 5 && state.playing; k++) {
    await playLine(k);
    if (playToken !== myToken + (k - 1) || !state.playing) return; // 中途被停止或換句
    if (k < 5) await new Promise(r => setTimeout(r, 1000));
  }
  stopAll();
}

// ── 今日口說任務（四關跟讀；不用麥克風，學習者念完自己按「念完了」）──
const MISSION_LABEL = '今日口說任務（四關）';
const ms = { st: null, check: false, hint: 0 };
const missionOpen = () => !$('#mission').hidden;
const MSG = {
  1: '看著日文和假名，跟著原音一起念。',
  2: '只看日文和假名，聽完原音後自己念。',
  3: '字遮起來了，聽完原音後自己念。',
  4: '不看字、不放原音，把這句背出來。',
};
const FOOT = {
  1: '五句輪流念：原音播完才能按「念完了」，跟著原音同步念。',
  2: '五句輪流念：第一輪先播原音，之後看著日文自己念；念不順就按「再聽一次」。',
  3: '憑耳朵記憶念出來；按「念完了」會揭曉日文並播原音讓你對照。',
  4: '卡住可以按「提示」；按「念完了」會揭曉日文並播原音讓你對照。',
};
// 第 1 次提示給中譯，第 2 次再給假名的第一個文節
const hintText = (l, h) => h >= 2 ? `${esc(l.zh)}<br><span lang="ja">${esc(l.kana.split(' ')[0])} …</span>` : esc(l.zh);

function renderMissionBtn() {
  const b = $('#missionBtn'); if (missionOpen()) return;
  b.textContent = loadMission(scene().id).done ? '✓ 口說任務完成' : MISSION_LABEL;
}
function closeMission() {
  const box = $('#mission'); if (box.hidden) return;
  stopAll();
  box.hidden = true; box.innerHTML = '';
  $('#lines').hidden = false; $('.controls').hidden = false;
  const b = $('#missionBtn'); b.setAttribute('aria-expanded', 'false'); renderMissionBtn();
}
function openMission() {
  stopAll();
  ms.st = loadMission(scene().id); ms.check = false; ms.hint = 0;
  if (!ms.st.done && progress(ms.st) === 0 && new URLSearchParams(location.search).get('mission') === 'lite') ms.st = initial(true); // 老師可用 ?mission=lite 讓全班做輕量版
  $('#lines').hidden = true; $('.controls').hidden = true; $('#mission').hidden = false;
  const b = $('#missionBtn'); b.setAttribute('aria-expanded', 'true'); b.textContent = '離開口說任務（進度會保留）';
  renderMission(true);
  $('#mission').scrollIntoView({ block: 'start', behavior: 'smooth' });
}
// 按鈕至少鎖 1.2 秒（防連點）；有播原音就等原音播完才解鎖，原音卡住最多等 6 秒
function lockUntil(btn, audio) {
  btn.disabled = true;
  const t0 = Date.now(); let open = false;
  const unlock = () => { if (open) return; open = true; setTimeout(() => { btn.disabled = false; }, Math.max(0, 1200 - (Date.now() - t0))); };
  if (audio) { audio.then(unlock); setTimeout(unlock, 6000); } else unlock();
}
// autoplay：這一次需要原音時自動播（開啟面板或按鈕的點擊當下觸發，iOS 才放行）
// 關三、關四按「念完了」先進入對照（揭曉日文＋播原音），自評念對了才計次
function renderMission(autoplay) {
  const box = $('#mission'); const st = ms.st; const x = scene();
  const S = STAGES[st.stage - 1]; const l = x.lines[st.k - 1];
  const who = (x.roles && x.roles[l.speaker]) ? `${l.speaker} · ${x.roles[l.speaker]}` : l.speaker;
  const P = plan(st.lite), N = total(st.lite), pct = Math.round(progress(st) / N * 100);
  const stages = STAGES.filter(s => P.stages.includes(s.n)).map(s => `<li data-s="${s.n}" class="${st.done || s.n < st.stage ? 'ok' : s.n === st.stage ? 'on' : ''}">${st.done || s.n < st.stage ? '✓' : s.n}</li>`).join('');
  if (st.done) {
    box.innerHTML = `<ol class="m-stages">${stages}</ol><div class="m-seal" aria-hidden="true">說</div><p class="m-done">✓ 口說任務完成</p><p class="m-sub">${N} 次開口全數完成，也算完成這一課！</p>`;
    return;
  }
  const dots = '●'.repeat(st.k - 1) + '○'.repeat(5 - st.k + 1); // 這一輪念到第幾句
  const where = `第 ${st.n + 1} / ${P.reps} 輪　${dots}`;
  const mode = progress(st) === 0 ? `<button class="m-mode" type="button">${st.lite ? '改完整版（100 次，約 12 分鐘）' : '時間不多？改輕量版（30 次，約 4 分鐘）'}</button>` : '';
  const showJa = S.ja || ms.check, showZh = S.zh || (ms.check && st.stage === 4);
  const hint = !ms.check && st.stage === 4 && ms.hint ? `<div class="m-hint">${hintText(l, ms.hint)}</div>` : '';
  const act = ms.check
    ? '<button class="m-again" type="button">↻ 沒念對，再一次</button><button class="m-ok" type="button">✓ 念對了</button>'
    : (S.audio === 'none' ? `<button class="m-tip" type="button"${ms.hint >= 2 ? ' disabled' : ''}>💡 提示</button>` : '<button class="m-hear" type="button">▶ 再聽一次</button>')
      + '<button class="m-manual" type="button">✓ 念完了</button>';
  box.innerHTML = `<ol class="m-stages">${stages}</ol>
    <p class="m-name">第${'一二三四'[st.stage - 1]}關：${esc(S.name)}</p>
    <div class="m-line${ms.check ? ' checking' : ''}"><span class="spk">${esc(who)}</span>
      ${showJa ? `<div class="m-ja" lang="ja">${esc(l.ja)}</div><div class="m-kana" lang="ja">${esc(l.kana)}</div>` : '<div class="m-ja masked">‧‧‧‧‧‧</div>'}
      ${showZh ? `<div class="m-zh">${esc(l.zh)}</div>` : ''}${hint}</div>
    <p class="m-where">${where}</p>
    <p class="m-count">總進度 ${progress(st)} / ${N}　第 ${st.k} 句</p>
    <div class="m-bar"><i style="width:${pct}%"></i></div>
    <p class="m-msg" aria-live="polite">${ms.check ? '對照一下：剛剛念的跟原音一樣嗎？' : MSG[st.stage]}</p>
    <div class="m-act">${act}</div>
    <p class="hint-inline">${ms.check ? '念對了才計一次；沒念對就再念一次，不扣進度。' : FOOT[st.stage]}</p>${mode}`;
  const next = () => {
    stopAll(); ms.check = false; ms.hint = 0; ms.st = advance(ms.st); saveMission(x.id, ms.st); addVoice();
    if (ms.st.done) complete(x.id); // 口說任務全過也算完成這一課
    renderMission(true); renderMissionBtn(); renderDone();
  };
  const md = $('.m-mode', box); if (md) md.onclick = () => { stopAll(); ms.st = initial(!st.lite); saveMission(x.id, ms.st); renderMission(true); };
  const hear = $('.m-hear', box); if (hear) hear.onclick = () => { stopAll(); playLine(st.k); };
  const tip = $('.m-tip', box); if (tip) tip.onclick = () => { ms.hint++; renderMission(false); };
  const again = $('.m-again', box); if (again) again.onclick = () => { stopAll(); ms.check = false; renderMission(false); };
  const ok = $('.m-ok', box);
  if (ok) { ok.onclick = next; lockUntil(ok, autoplay ? playLine(st.k) : null); return; }
  const man = $('.m-manual', box);
  man.onclick = () => { if (st.stage >= 3) { stopAll(); ms.check = true; renderMission(true); } else next(); };
  lockUntil(man, autoplay && needsAudio(st) ? playLine(st.k) : null);
}
$('#missionBtn').onclick = () => (missionOpen() ? closeMission() : openMission());

$('#shareBtn').onclick = () => {
  const x = scene(); const list = loadDone();
  shareCard({ id3: pad(x.id), day: state.id, date: taipeiDateKey(), titleZh: x.title_zh, titleJa: x.title_ja,
    streak: streakInfo(list).streak, days: practicedDays(list), voice: loadVoice(), said: loadMission(x.id).done });
};

function go(id) { history.pushState(null, '', `?d=${id}`); state.id = id; render(); window.scrollTo(0, 0); }

$('#playAll').onclick = playAll;
const reveal = (...cls) => document.querySelectorAll('.line').forEach(e => cls.forEach(c => e.classList.remove(c)));
$('#showJa').onclick = () => reveal('hide-ja');
$('#showKana').onclick = () => reveal('hide-ja', 'hide-kana');
$('#showZh').onclick = () => reveal('hide-ja', 'hide-kana', 'hide-zh');
$('#rate').onclick = e => { state.rate = state.rate === 1 ? 0.75 : 1; e.currentTarget.textContent = state.rate === 1 ? '1×' : '0.75× 慢速'; e.currentTarget.setAttribute('aria-pressed', state.rate !== 1); };
$('#prev').onclick = () => go(state.id - 1);
$('#next').onclick = () => go(state.id + 1);
$('#doneBtn').onclick = () => complete(scene().id);
window.addEventListener('popstate', () => { state.id = parseDay(location.search) ? parseDay(location.search) : todayIndex(); render(); });

main().catch(e => { $('#titleZh').textContent = '載入失敗，請重新整理'; console.error(e); });
