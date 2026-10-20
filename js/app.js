/* GRE Physics Trainer — user interface (practice, quiz, full test, results, progress). */
(function () {
  'use strict';
  const GRE = window.GRE;
  const topics = GRE.topics;
  const LET = 'ABCDE';
  const LEVEL = { 1: 'Easy', 2: 'Medium', 3: 'Hard' };
  const main = document.getElementById('main');

  // ------------------------------------------------------------------ helpers
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pct = (a, b) => (b ? Math.round((100 * a) / b) : 0);
  const fmtN = n => n.toLocaleString('en-US');
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; } return a; };
  const fmtTime = s => {
    s = Math.max(0, Math.round(s));
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
    return (h ? h + ':' + String(m).padStart(2, '0') : String(m)) + ':' + String(x).padStart(2, '0');
  };
  const leavesOf = t => t.sections.flatMap(s => s.subs.map(l => l.id));
  const topicOfKey = k => k.slice(0, k.lastIndexOf('-'));

  function math(el) {
    if (window.renderMathInElement) {
      renderMathInElement(el, { delimiters: [{ left: '$', right: '$', display: false }], throwOnError: false });
    }
  }
  let toastTimer = null;
  /** short message at the bottom of the screen, optionally with one action button (e.g. Undo) */
  function toast(msg, actionLabel, action) {
    const t = $('#toast');
    t.innerHTML = `<span>${esc(msg)}</span>${actionLabel ? `<button class="toast-btn">${esc(actionLabel)}</button>` : ''}`;
    if (actionLabel) $('.toast-btn', t).onclick = () => { t.classList.add('hidden'); action(); };
    t.classList.remove('hidden');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.add('hidden'), actionLabel ? 6000 : 3200);
  }
  function overlay(text) {
    $('#overlay').classList.toggle('hidden', !text);
    if (text) $('#overlayText').textContent = text;
  }
  function modal(html) {
    $('#modalBody').innerHTML = html; $('#modal').classList.remove('hidden'); math($('#modalBody'));
  }
  $('#modal').addEventListener('click', e => { if (e.target.id === 'modal' || e.target.closest('.modal-close')) $('#modal').classList.add('hidden'); });

  // ------------------------------------------------------------------ storage
  const KEY = 'grephys.v1', CUR = 'grephys.cur';
  const blank = () => ({ q: {}, bm: {}, hid: {}, tests: [], settings: {} });
  let P = (() => { try { return Object.assign(blank(), JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { return blank(); } })();
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(P)); } catch (e) { toast('Could not save progress (browser storage is full or disabled).'); }
  }
  const getCur = () => { try { return JSON.parse(localStorage.getItem(CUR) || 'null'); } catch (e) { return null; } };
  const setCur = c => { try { if (c) localStorage.setItem(CUR, JSON.stringify(c)); else localStorage.removeItem(CUR); } catch (e) { /* ignore */ } };
  /** questions the user removed: never drawn again until restored */
  const removed = k => !!P.hid[k];
  function setRemoved(q, on) {
    if (on) P.hid[q.key] = Date.now(); else delete P.hid[q.key];
    save();
  }
  function record(q, chosen) {
    const r = P.q[q.key] || (P.q[q.key] = { n: 0, c: 0, l: 0, t: 0 });
    r.n++; if (chosen === q.ans) r.c++;
    r.l = chosen === q.ans ? 1 : 0; r.t = Date.now();
  }

  // ------------------------------------------------------------------ question banks
  const ready = new Set();
  const byKey = new Map();
  const bank = tid => (ready.has(tid) ? GRE.buildBank(tid) : []);
  function build(tid) {
    if (ready.has(tid)) return;
    let b = [];
    try { b = GRE.buildBank(tid); } catch (e) { console.error('bank ' + tid, e); }
    b.forEach(q => byKey.set(q.key, q));
    ready.add(tid);
  }
  function bankStatus() {
    const el = $('#bankStatus');
    if (ready.size < topics.length) el.textContent = `Preparing question banks ${ready.size}/${topics.length}…`;
    else el.textContent = fmtN(topics.reduce((s, t) => s + bank(t.id).length, 0)) + ' questions ready';
  }
  /** make sure the banks of `tids` are built, then call cb (shows a spinner while building) */
  function withBanks(tids, cb) {
    const todo = [...new Set(tids)].filter(t => !ready.has(t));
    if (!todo.length) return cb();
    let i = 0;
    overlay(`Preparing question banks… 0/${todo.length}`);
    (function step() {
      if (i === todo.length) { overlay(null); bankStatus(); return cb(); }
      build(todo[i++]);
      overlay(`Preparing question banks… ${i}/${todo.length}`);
      setTimeout(step, 0);
    })();
  }
  function warmUp() {
    const t = topics.find(x => !ready.has(x.id));
    if (t) { build(t.id); bankStatus(); setTimeout(warmUp, 10); return; }
    bankStatus();
    if (view === 'home') renderHome();
    if (view === 'setup' && refreshSetupCount) refreshSetupCount();
  }

  // ------------------------------------------------------------------ routing & keys
  let view = null, cleanup = null, keyHandler = null, refreshSetupCount = null;
  function go(name, arg) {
    if (name === 'constants') return showConstants();
    if (cleanup) { cleanup(); cleanup = null; }
    keyHandler = null; refreshSetupCount = null;
    window.scrollTo(0, 0);
    $$('.topbar nav a').forEach(a => a.classList.toggle('active', a.dataset.go === name));
    if (name === 'setup-practice') return renderSetup('practice', arg);
    if (name === 'setup-quiz') return renderSetup('quiz', arg);
    if (name === 'setup-test') return renderTestSetup();
    if (name === 'stats') return renderStats();
    return renderHome();
  }
  document.addEventListener('click', e => {
    const a = e.target.closest('[data-go]');
    if (!a) return;
    e.preventDefault();
    if (view === 'exam' && a.dataset.go !== 'constants') toast('Your test is saved — resume it from the home page (the clock keeps running).');
    go(a.dataset.go, a.dataset.arg);
  });
  document.addEventListener('keydown', e => {
    if (!keyHandler || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.target.closest('input, select, textarea')) return;
    if (!$('#modal').classList.contains('hidden')) { if (e.key === 'Escape') $('#modal').classList.add('hidden'); return; }
    keyHandler(e);
  });
  const choiceKey = e => {
    const k = e.key.toUpperCase();
    if ('ABCDE'.includes(k) && k.length === 1) return 'ABCDE'.indexOf(k);
    if ('12345'.includes(k) && k.length === 1) return +k - 1;
    return -1;
  };

  // ------------------------------------------------------------------ statistics helpers
  function topicStats(tid) {
    const pre = tid + '-';
    let seen = 0, att = 0, cor = 0;
    for (const k in P.q) if (k.startsWith(pre)) { const r = P.q[k]; seen++; att += r.n; cor += r.c; }
    return { seen, att, cor };
  }
  const mistakes = () => Object.keys(P.q).filter(k => P.q[k].l === 0 && !removed(k));
  const bookmarks = () => Object.keys(P.bm).filter(k => !removed(k));

  // ------------------------------------------------------------------ home
  function renderHome() {
    view = 'home';
    const cur = getCur();
    const total = topics.reduce((s, t) => s + (ready.has(t.id) ? bank(t.id).length : GRE.TARGET), 0);
    const nm = mistakes().length, nb = bookmarks().length;
    main.innerHTML = `
      ${cur ? `<div class="resume"><div><b>${esc(cur.title)}</b> in progress — ${cur.ans.filter(a => a != null).length} of ${cur.keys.length} answered${cur.end ? `, ${fmtTime((cur.end - Date.now()) / 1000)} left` : ''}.</div>
        <span class="spacer"></span><button class="btn primary" id="resume">Resume</button><button class="btn" id="discard">Discard</button></div>` : ''}
      <div class="welcome">
        <div class="eyebrow">Physics GRE study workspace</div>
        <h1>What would you like to do?</h1>
        <p class="lead">Choose a study mode below. There are ${fmtN(total)} original GRE-style questions across all nine content areas.</p>
      </div>
      <div class="section-intro"><h2>Start studying</h2><p class="muted">Practice gives immediate feedback; quizzes and tests save the answers until the end.</p></div>
      <div class="modes">
        <button class="mode" data-go="setup-practice"><span class="mode-kicker">Immediate feedback</span><h3>Practice</h3><p>Answer one question at a time and see the worked explanation right away.</p><span class="mode-action">Choose topics →</span></button>
        <button class="mode" data-go="setup-quiz"><span class="mode-kicker">10–100 questions</span><h3>Quiz</h3><p>Build a focused set from the topics and sections you choose, optionally timed.</p><span class="mode-action">Build a quiz →</span></button>
        <button class="mode" data-go="setup-test"><span class="mode-kicker">Exam simulation</span><h3>Full practice test</h3><p>Use the real Physics GRE topic weights, question count, and time limit.</p><span class="mode-action">Choose a format →</span></button>
      </div>
      <div class="quick"><span class="quick-label">Shortcuts</span>
        <button class="btn" id="qMistakes" ${nm ? '' : 'disabled'}>Redo my mistakes (${fmtN(nm)})</button>
        <button class="btn" id="qBookmarks" ${nb ? '' : 'disabled'}>★ Bookmarked (${fmtN(nb)})</button>
        <button class="btn" data-go="stats">Progress &amp; test history</button>
        <button class="btn" data-go="constants">Constants sheet</button>
      </div>
      <div class="section-intro topic-intro"><h2>Browse a topic</h2><p class="muted">Choose one area to start a focused practice session, or use Practice above for a mixed session.</p></div>
      <div class="topic-grid">${topics.map(t => {
        const s = topicStats(t.id);
        const size = ready.has(t.id) ? bank(t.id).length : GRE.TARGET;
        return `<div class="tcard" style="--c:${t.color}" data-topic="${t.id}">
          <h3>${esc(t.name)}</h3>
          <div class="meta">Chapter ${t.chapter} · ${t.weight}% of the exam · ${t.sections.length} sections</div>
          <div class="bar"><span style="width:${(100 * s.seen) / Math.max(1, size)}%"></span></div>
          <div class="meta">${fmtN(s.seen)} / ${fmtN(size)} answered${s.att ? ` · ${pct(s.cor, s.att)}% correct` : ''}</div>
        </div>`;
      }).join('')}</div>`;
    $$('.tcard', main).forEach(c => c.addEventListener('click', () => go('setup-practice', c.dataset.topic)));
    const r = $('#resume', main);
    if (r) r.onclick = resumeExam;
    const d = $('#discard', main);
    if (d) d.onclick = () => { if (confirm('Discard the test in progress?')) { setCur(null); renderHome(); } };
    $('#qMistakes', main).onclick = () => practiceKeys(mistakes(), 'Redo my mistakes');
    $('#qBookmarks', main).onclick = () => practiceKeys(bookmarks(), 'Bookmarked questions');
  }
  function practiceKeys(keys, title) {
    withBanks(keys.map(topicOfKey), () => {
      const list = shuffle(keys.map(k => byKey.get(k)).filter(Boolean));
      if (!list.length) return toast('Nothing to practice here yet.');
      startPractice(list, title);
    });
  }

  // ------------------------------------------------------------------ setup (practice & quiz)
  function renderSetup(mode, preTopic) {
    view = 'setup';
    const st = P.settings[mode] || {};
    const allLeaves = topics.flatMap(leavesOf);
    let sel = new Set(preTopic && GRE.T[preTopic] ? leavesOf(GRE.T[preTopic]) : st.sel && st.sel.length ? st.sel : allLeaves);
    const levels = new Set(st.levels || [1, 2, 3]);
    const which = st.which || 'unseen';
    const order = st.order || 'random';
    const nQ = st.n || 20;
    const timer = st.timer || 'pace';
    main.innerHTML = `
      <h1>${mode === 'practice' ? 'Practice' : 'Quiz'}</h1>
      <p class="lead">${mode === 'practice'
        ? 'Questions one at a time. Each answer is checked immediately and explained.'
        : 'A fixed set of questions answered like a test. Results and explanations come at the end.'}</p>
      <div class="stephead"><span class="stepno">1</span><div><h2>Choose topics</h2><p class="muted">Start with all topics, or open a topic to select specific sections.</p></div></div>
      <div class="setup">
        <div class="panel tree topic-panel">
          <div class="panel-head"><div><b>Topics and sections</b><div class="panel-hint">Checked topics are included in your session.</div></div><div class="row">
            <button class="btn small" id="all">All topics</button><button class="btn small" id="none">Clear topics</button></div></div>
          ${topics.map(t => `
            <details data-t="${t.id}" ${preTopic === t.id ? 'open' : ''}>
              <summary style="--c:${t.color}"><input type="checkbox" class="ct" data-t="${t.id}"><span class="dot"></span>
                <span class="tname">${esc(t.name)}</span><span class="cnt" data-cnt="${t.id}"></span></summary>
              ${t.sections.map(s => {
                const single = s.subs.length === 1 && s.subs[0].id === s.id;
                return `<div class="sec">
                  <label><input type="checkbox" class="${single ? 'cl' : 'cs'}" data-${single ? 'l' : 's'}="${s.id}" data-t="${t.id}" data-sec="${s.id}"> ${s.id} ${esc(s.name)}</label>
                  ${single ? '' : `<div class="leaves">${s.subs.map(l => `<label><input type="checkbox" class="cl" data-l="${l.id}" data-sec="${s.id}" data-t="${t.id}"> ${l.id === s.id ? '' : l.id + ' '}${esc(l.name)}</label>`).join('')}</div>`}
                </div>`;
              }).join('')}
            </details>`).join('')}
        </div>
        <div class="panel options-panel">
          <div class="stephead compact"><span class="stepno">2</span><div><h2>Set preferences</h2><p class="muted">These choices are optional.</p></div></div>
          ${mode === 'quiz' ? `
          <div class="opt"><div class="lbl">Number of questions</div>
            <select id="nQ">${[10, 20, 30, 50, 70, 100].map(n => `<option ${n === nQ ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
          <div class="opt"><div class="lbl">Timer</div>
            <label><input type="radio" name="timer" value="pace" ${timer === 'pace' ? 'checked' : ''}> GRE pace (about 1.7 min per question)</label>
            <label><input type="radio" name="timer" value="off" ${timer === 'off' ? 'checked' : ''}> No time limit</label></div>` : ''}
          <div class="opt"><div class="lbl">Difficulty</div>
            ${[1, 2, 3].map(l => `<label><input type="checkbox" name="lvl" value="${l}" ${levels.has(l) ? 'checked' : ''}> ${LEVEL[l]}</label>`).join('')}</div>
          <div class="opt"><div class="lbl">Which questions</div>
            <label><input type="radio" name="which" value="unseen" ${which === 'unseen' ? 'checked' : ''}> New questions first</label>
            <label><input type="radio" name="which" value="any" ${which === 'any' ? 'checked' : ''}> Any question</label>
            <label><input type="radio" name="which" value="missed" ${which === 'missed' ? 'checked' : ''}> Only ones I got wrong</label>
            <label><input type="radio" name="which" value="bookmarked" ${which === 'bookmarked' ? 'checked' : ''}> Only bookmarked</label></div>
          ${mode === 'practice' ? `<div class="opt"><div class="lbl">Order</div>
            <label><input type="radio" name="order" value="random" ${order === 'random' ? 'checked' : ''}> Shuffled</label>
            <label><input type="radio" name="order" value="number" ${order === 'number' ? 'checked' : ''}> By question number (Q1, Q2, …)</label></div>` : ''}
          <div class="stephead compact start-step"><span class="stepno">3</span><div><h2>Start</h2><p class="muted">You can stop a practice session at any time.</p></div></div>
          <div class="match" id="match"></div>
          <button class="btn primary" id="start">Start ${mode === 'practice' ? 'practice' : 'quiz'}</button>
        </div>
      </div>`;

    const cfg = () => ({
      sel,
      levels: new Set($$('input[name=lvl]:checked', main).map(i => +i.value)),
      which: ($('input[name=which]:checked', main) || {}).value || 'unseen',
      order: ($('input[name=order]:checked', main) || {}).value || 'random',
      n: $('#nQ', main) ? +$('#nQ', main).value : 0,
      timer: ($('input[name=timer]:checked', main) || {}).value || 'off',
    });
    function sync() {
      for (const t of topics) {
        const L = leavesOf(t), k = L.filter(l => sel.has(l)).length;
        const ct = $(`.ct[data-t="${t.id}"]`, main);
        ct.checked = k === L.length; ct.indeterminate = k > 0 && k < L.length;
        for (const s of t.sections) {
          const cs = $(`.cs[data-s="${s.id}"]`, main);
          if (cs) {
            const n = s.subs.filter(l => sel.has(l.id)).length;
            cs.checked = n === s.subs.length; cs.indeterminate = n > 0 && n < s.subs.length;
          }
        }
      }
      $$('.cl', main).forEach(i => { i.checked = sel.has(i.dataset.l); });
      count();
    }
    function count() {
      const c = cfg();
      let n = 0;
      for (const t of topics) {
        const el = $(`[data-cnt="${t.id}"]`, main);
        if (!ready.has(t.id)) { el.textContent = '…'; continue; }
        const m = pool(c, [t]).length;
        n += m;
        el.textContent = m === bank(t.id).length ? fmtN(m) : `${fmtN(m)} / ${fmtN(bank(t.id).length)}`;
      }
      const waiting = topics.some(t => !ready.has(t.id));
      const nh = Object.keys(P.hid).length;
      $('#match', main).innerHTML = `<b>${fmtN(n)}</b> matching questions${waiting ? ' <span class="muted small">(still preparing some banks…)</span>' : ''}` +
        (nh ? `<div class="muted small">${fmtN(nh)} removed question${nh > 1 ? 's are' : ' is'} left out — restore them on the Progress page.</div>` : '');
      $('#start', main).disabled = !sel.size || (!waiting && !n);
    }
    refreshSetupCount = count;
    $('.setup', main).addEventListener('change', e => {
      const i = e.target;
      if (i.classList.contains('cl')) { if (i.checked) sel.add(i.dataset.l); else sel.delete(i.dataset.l); }
      else if (i.classList.contains('cs')) { const s = GRE.T[i.dataset.t].sections.find(x => x.id === i.dataset.s); s.subs.forEach(l => (i.checked ? sel.add(l.id) : sel.delete(l.id))); }
      else if (i.classList.contains('ct')) { leavesOf(GRE.T[i.dataset.t]).forEach(l => (i.checked ? sel.add(l) : sel.delete(l))); }
      sync();
    });
    $('#all', main).onclick = () => { sel = new Set(allLeaves); sync(); };
    $('#none', main).onclick = () => { sel = new Set(); sync(); };
    $('#start', main).onclick = () => {
      const c = cfg();
      P.settings[mode] = { sel: [...sel], levels: [...c.levels], which: c.which, order: c.order, n: c.n, timer: c.timer };
      save();
      const tids = topics.filter(t => leavesOf(t).some(l => sel.has(l))).map(t => t.id);
      withBanks(tids, () => {
        let list = pool(c, topics);
        if (!list.length) return toast('No questions match these choices.');
        if (mode === 'practice') {
          list = orderList(list, c);
          startPractice(list, 'Practice');
        } else {
          list = pickDiverse(orderList(list, { ...c, order: 'random' }), c.n);
          startExam(shuffle(list), { title: `Quiz — ${list.length} questions`, kind: 'quiz', limit: c.timer === 'pace' ? Math.round(list.length * 1.7 * 60) : 0 });
        }
      });
    };
    sync();
  }

  function pool(c, ts) {
    const out = [];
    for (const t of ts) {
      for (const q of bank(t.id)) {
        if (!c.sel.has(q.sec) || !c.levels.has(q.level) || removed(q.key)) continue;
        const r = P.q[q.key];
        if (c.which === 'missed' && !(r && r.l === 0)) continue;
        if (c.which === 'bookmarked' && !P.bm[q.key]) continue;
        out.push(q);
      }
    }
    return out;
  }
  function orderList(list, c) {
    const ti = Object.fromEntries(topics.map((t, i) => [t.id, i]));
    let arr = c.order === 'number' ? list.slice().sort((a, b) => ti[a.topic] - ti[b.topic] || a.num - b.num) : shuffle(list);
    if (c.which === 'unseen') arr = arr.filter(q => !P.q[q.key]).concat(arr.filter(q => P.q[q.key]));
    return arr;
  }
  /** first n questions of `list`, preferring a different template for each */
  function pickDiverse(list, n) {
    const used = new Set(), out = [], rest = [];
    for (const q of list) {
      if (out.length >= n) break;
      if (used.has(q.tid)) rest.push(q); else { used.add(q.tid); out.push(q); }
    }
    for (const q of rest) { if (out.length >= n) break; out.push(q); }
    return out;
  }

  // ------------------------------------------------------------------ question rendering
  function qhead(q, extra) {
    const T = GRE.T[q.topic];
    return `<div class="qhead">
      <span class="pill" style="--c:${T.color}">${esc(T.short)}</span>
      <span>§${q.sec} ${esc(GRE.leafName(q.sec))}</span>
      <span class="lvl">${LEVEL[q.level]}</span>
      <span class="spacer"></span>
      <span>Q ${fmtN(q.num)} / ${fmtN(bank(q.topic).length)}</span>
      ${extra || ''}
    </div>`;
  }
  function qbody(q) {
    return `<div class="stem">${q.q}</div>${q.fig ? `<div class="fig">${q.fig}</div>` : ''}
      <ol class="choices">${q.choices.map((c, i) => `<li><button class="choice" data-i="${i}"><span class="let">(${LET[i]})</span><span class="txt">${c}</span></button></li>`).join('')}</ol>`;
  }
  const starBtn = q => `<button class="star ${P.bm[q.key] ? 'on' : ''}" id="star" title="Bookmark (B)">★</button>`;
  const TRASH = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6"/></svg>';
  const removeBtn = (q, id) => `<button class="rmbtn ${removed(q.key) ? 'on' : ''}" ${id ? `id="${id}"` : ''} title="Remove this question from all future sessions">${TRASH}<span>${removed(q.key) ? 'Removed — restore' : 'Remove'}</span></button>`;
  function toggleStar(q) {
    if (P.bm[q.key]) delete P.bm[q.key]; else P.bm[q.key] = 1;
    save();
    const s = $('#star'); if (s) s.classList.toggle('on', !!P.bm[q.key]);
  }

  // ------------------------------------------------------------------ practice mode
  let practiceSession = null;
  function startPractice(list, title) {
    const S = { list: list.filter(q => !removed(q.key)), i: 0, n: 0, ok: 0, log: [], title, t0: Date.now() };
    if (!S.list.length) return toast('Every question in this set has been removed.');
    view = 'practice';
    practiceSession = S;
    showPractice(S);
  }
  function showPractice(S) {
    if (S.i >= S.list.length) return endPractice(S);
    const q = S.list[S.i];
    let done = false;
    main.innerHTML = `${qhead(q, starBtn(q) + removeBtn(q, 'remove'))}
      <div class="qcard">${qbody(q)}<div id="fbk"></div></div>
      <div class="actions">
        <span class="muted">${esc(S.title)}: <b>${S.ok}</b> / ${S.n} correct · question ${S.i + 1} of ${fmtN(S.list.length)}</span>
        <span class="spacer"></span>
        <button class="btn" id="end">End session</button>
        <button class="btn" id="skip">Skip</button>
        <button class="btn primary hidden" id="next">Next →</button>
      </div>
      <div class="row" style="margin-top:14px">
        <span class="kbd"><kbd>A</kbd>–<kbd>E</kbd> answer · <kbd>Enter</kbd> next · <kbd>B</kbd> bookmark</span>
        <span class="spacer"></span>
        <form class="jump" id="jump">Go to
          <select>${topics.map(t => `<option value="${t.id}" ${t.id === q.topic ? 'selected' : ''}>${esc(t.short)}</option>`).join('')}</select>
          Q# <input type="number" min="1" max="${GRE.TARGET}" placeholder="1–${GRE.TARGET}" required>
          <button class="btn small">Go</button></form>
      </div>`;
    math(main);
    const answer = i => {
      if (done) return;
      done = true;
      const ok = i === q.ans;
      record(q, i); save();
      S.n++; if (ok) S.ok++;
      S.log.push({ k: q.key, c: i });
      $$('.choice', main).forEach((b, j) => {
        b.disabled = true;
        if (j === q.ans) b.classList.add('right');
        else if (j === i) b.classList.add('wrong');
      });
      const f = $('#fbk', main);
      f.innerHTML = `<div class="feedback ${ok ? 'ok' : 'no'}">
        <div class="verdict">${ok ? '✓ Correct' : `✗ Not quite — the answer is (${LET[q.ans]})`}</div>
        <div class="expl">${q.expl}</div></div>`;
      math(f);
      $('#skip', main).classList.add('hidden');
      $('#next', main).classList.remove('hidden');
      $('#next', main).focus();
      $('.actions .muted', main).innerHTML = `${esc(S.title)}: <b>${S.ok}</b> / ${S.n} correct · question ${S.i + 1} of ${fmtN(S.list.length)}`;
    };
    const next = () => { S.i++; showPractice(S); window.scrollTo(0, 0); };
    $$('.choice', main).forEach(b => (b.onclick = () => answer(+b.dataset.i)));
    $('#next', main).onclick = next;
    $('#skip', main).onclick = () => { S.log.push({ k: q.key, c: null }); next(); };
    $('#end', main).onclick = () => endPractice(S);
    $('#star', main).onclick = () => toggleStar(q);
    $('#remove', main).onclick = () => {
      setRemoved(q, true);
      const at = S.i;
      S.list.splice(at, 1);
      showPractice(S);
      window.scrollTo(0, 0);
      toast('Question removed — it won’t appear again.', 'Undo', () => {
        setRemoved(q, false);
        if (view === 'practice' && practiceSession === S) { S.list.splice(at, 0, q); S.i = at; showPractice(S); }
        else toast('Question restored.');
      });
    };
    $('#jump', main).onsubmit = e => {
      e.preventDefault();
      const tid = $('#jump select', main).value, n = +$('#jump input', main).value;
      withBanks([tid], () => {
        const target = bank(tid)[n - 1];
        if (!target) return toast(`There is no question ${n} in that topic.`);
        if (!done) S.list.splice(S.i, 0, target); else S.list.splice(S.i + 1, 0, target);
        if (done) S.i++;
        showPractice(S);
      });
    };
    keyHandler = e => {
      const c = choiceKey(e);
      if (c >= 0 && !done) { e.preventDefault(); answer(c); }
      else if ((e.key === 'Enter' || e.key === 'ArrowRight' || e.key === 'n' || e.key === 'N') && done) { e.preventDefault(); next(); }
      else if (e.key === 'b' || e.key === 'B') toggleStar(q);
    };
  }
  function endPractice(S) {
    if (!S.log.length) return go('home');
    renderResults(S.log, { title: S.title, kind: 'practice', secs: (Date.now() - S.t0) / 1000 });
  }

  // ------------------------------------------------------------------ exam mode (quiz & full test)
  function startExam(qs, o) {
    const now = Date.now();
    setCur({ title: o.title, kind: o.kind, keys: qs.map(q => q.key), ans: qs.map(() => null), mk: qs.map(() => 0), i: 0, start: now, end: o.limit ? now + o.limit * 1000 : 0 });
    runExam();
  }
  function resumeExam() {
    const C = getCur();
    if (!C) return renderHome();
    withBanks(C.keys.map(topicOfKey), runExam);
  }
  function runExam() {
    const C = getCur();
    const qs = C.keys.map(k => byKey.get(k));
    if (qs.some(q => !q)) { setCur(null); toast('This test can no longer be loaded.'); return renderHome(); }
    view = 'exam';
    const n = qs.length;
    let gridOpen = false;
    const tick = () => {
      const el = $('#timer', main);
      if (!el) return;
      if (C.end) {
        const left = (C.end - Date.now()) / 1000;
        el.textContent = fmtTime(left) + ' left';
        el.classList.toggle('low', left < 300);
        if (left <= 0) { clearInterval(iv); toast('Time is up — your answers were submitted.'); finishExam(C); }
      } else el.textContent = fmtTime((Date.now() - C.start) / 1000);
    };
    const iv = setInterval(tick, 500);
    cleanup = () => clearInterval(iv);
    const persist = () => setCur(C);
    function show(i) {
      C.i = Math.max(0, Math.min(n - 1, i)); persist();
      const q = qs[C.i];
      const answered = C.ans.filter(a => a != null).length;
      main.innerHTML = `
        <div class="exambar"><b>${esc(C.title)}</b><span>Question ${C.i + 1} of ${n}</span><span class="muted">${answered} answered</span>
          <span class="spacer"></span><span class="timer" id="timer"></span>
          <button class="btn small" data-go="constants">Constants</button>
          <button class="btn small" id="gridBtn">${gridOpen ? 'Hide overview' : 'Overview'}</button>
          <button class="btn small primary" id="submit">Submit</button></div>
        <div class="qgrid ${gridOpen ? '' : 'hidden'}">${qs.map((_, j) => `<button data-j="${j}" class="${C.ans[j] != null ? 'ans' : ''} ${C.mk[j] ? 'mk' : ''} ${j === C.i ? 'cur' : ''}">${j + 1}</button>`).join('')}
          <div class="legend"><span>■ answered</span><span style="color:var(--warn)">● marked for review</span><span>click a number to jump</span></div></div>
        <div class="qcard">${qbody(q)}</div>
        <div class="actions">
          <button class="btn" id="prev" ${C.i === 0 ? 'disabled' : ''}>← Previous</button>
          <button class="btn markbtn ${C.mk[C.i] ? 'on' : ''}" id="mark">${C.mk[C.i] ? '● Marked' : 'Mark for review'}</button>
          <span class="spacer"></span>
          <span class="kbd"><kbd>A</kbd>–<kbd>E</kbd> choose · <kbd>←</kbd><kbd>→</kbd> move · <kbd>M</kbd> mark</span>
          <button class="btn primary" id="next">${C.i === n - 1 ? 'Review & submit' : 'Next →'}</button>
        </div>`;
      math($('.qcard', main));
      $$('.choice', main).forEach(b => {
        if (+b.dataset.i === C.ans[C.i]) b.classList.add('sel');
        b.onclick = () => choose(+b.dataset.i);
      });
      $('#prev', main).onclick = () => show(C.i - 1);
      $('#next', main).onclick = () => (C.i === n - 1 ? submit() : show(C.i + 1));
      $('#mark', main).onclick = mark;
      $('#gridBtn', main).onclick = () => { gridOpen = !gridOpen; show(C.i); };
      $$('.qgrid button[data-j]', main).forEach(b => (b.onclick = () => show(+b.dataset.j)));
      $('#submit', main).onclick = submit;
      tick();
    }
    function choose(i) {
      C.ans[C.i] = C.ans[C.i] === i ? null : i; persist();
      $$('.choice', main).forEach(b => b.classList.toggle('sel', +b.dataset.i === C.ans[C.i]));
      $('.exambar .muted', main).textContent = `${C.ans.filter(a => a != null).length} answered`;
      const g = $(`.qgrid button[data-j="${C.i}"]`, main); if (g) g.classList.toggle('ans', C.ans[C.i] != null);
    }
    function mark() { C.mk[C.i] = C.mk[C.i] ? 0 : 1; persist(); show(C.i); }
    function submit() {
      const blank = C.ans.filter(a => a == null).length, marked = C.mk.filter(Boolean).length;
      const msg = (blank ? `${blank} question${blank > 1 ? 's are' : ' is'} unanswered (there is no penalty for guessing). ` : '') +
        (marked ? `${marked} marked for review. ` : '') + 'Submit now?';
      if (confirm(msg)) { clearInterval(iv); finishExam(C); }
    }
    keyHandler = e => {
      const c = choiceKey(e);
      if (c >= 0) { e.preventDefault(); choose(c); }
      else if (e.key === 'ArrowRight' || e.key === 'Enter') { e.preventDefault(); if (C.i < n - 1) show(C.i + 1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); show(C.i - 1); }
      else if (e.key === 'm' || e.key === 'M') mark();
    };
    show(C.i);
  }
  function finishExam(C) {
    if (cleanup) { cleanup(); cleanup = null; }
    const items = C.keys.map((k, j) => ({ k, c: C.ans[j], m: C.mk[j] }));
    items.forEach(it => { const q = byKey.get(it.k); if (q && it.c != null) record(q, it.c); });
    const secs = (Math.min(Date.now(), C.end || Infinity) - C.start) / 1000;
    const correct = items.filter(it => it.c != null && byKey.get(it.k) && it.c === byKey.get(it.k).ans).length;
    P.tests.unshift({ id: C.start, date: Date.now(), title: C.title, kind: C.kind, n: items.length, correct, secs, items });
    P.tests = P.tests.slice(0, 60);
    save(); setCur(null);
    renderResults(items, { title: C.title, kind: C.kind, secs });
  }

  // ------------------------------------------------------------------ full test setup
  const FORMATS = {
    std: { n: 70, min: 120, title: 'Full practice test (70 questions)', label: 'Current format (since September 2023)', desc: '70 questions · 2 hours' },
    classic: { n: 100, min: 170, title: 'Full practice test (100 questions, classic)', label: 'Classic format', desc: '100 questions · 2 hours 50 minutes' },
    half: { n: 35, min: 60, title: 'Half-length practice test', label: 'Half-length test', desc: '35 questions · 1 hour' },
  };
  function allocate(n) {
    const raw = topics.map(t => (n * t.weight) / 100);
    const out = raw.map(Math.floor);
    let left = n - out.reduce((s, x) => s + x, 0);
    raw.map((x, i) => [x - Math.floor(x), i]).sort((a, b) => b[0] - a[0]).forEach(([, i]) => { if (left > 0) { out[i]++; left--; } });
    return out;
  }
  function renderTestSetup() {
    view = 'setup';
    const st = P.settings.test || {};
    const fmt = st.fmt || 'std';
    main.innerHTML = `
      <h1>Full practice test</h1>
      <p class="lead">Questions from all nine content areas, in the same proportions as the real Physics GRE, shuffled together. There is no penalty for wrong answers, so answer every question.</p>
      <div class="setup">
        <div class="panel">
          <div class="formats">${Object.entries(FORMATS).map(([k, f]) => `
            <label class="format"><input type="radio" name="fmt" value="${k}" ${k === fmt ? 'checked' : ''}><div><b>${f.label}</b><br><span class="muted">${f.desc}</span></div></label>`).join('')}
          </div>
          <div class="opt" style="margin-top:16px">
            <label><input type="checkbox" id="fresh" ${st.fresh === false ? '' : 'checked'}> Use questions I haven't seen before when possible</label>
          </div>
          <button class="btn primary" id="start">Start test</button>
          <p class="muted small" style="margin-top:12px">The clock keeps running if you leave the page; you can resume from the home page. The constants sheet is available during the test, as on the real exam. No calculator.</p>
        </div>
        <div class="panel"><b>Questions per topic</b><table class="weights" id="wt"></table></div>
      </div>`;
    const showW = () => {
      const f = FORMATS[$('input[name=fmt]:checked', main).value];
      const a = allocate(f.n);
      $('#wt', main).innerHTML = topics.map((t, i) => `<tr><td><span class="pill" style="--c:${t.color}">${esc(t.short)}</span></td><td>${a[i]} questions</td><td>${t.weight}%</td></tr>`).join('');
    };
    $$('input[name=fmt]', main).forEach(i => (i.onchange = showW));
    showW();
    $('#start', main).onclick = () => {
      const key = $('input[name=fmt]:checked', main).value, f = FORMATS[key], fresh = $('#fresh', main).checked;
      P.settings.test = { fmt: key, fresh }; save();
      withBanks(topics.map(t => t.id), () => {
        const a = allocate(f.n);
        let qs = [];
        topics.forEach((t, i) => {
          let list = shuffle(bank(t.id).filter(q => !removed(q.key)));
          if (fresh) list = list.filter(q => !P.q[q.key]).concat(list.filter(q => P.q[q.key]));
          qs = qs.concat(pickDiverse(list, a[i]));
        });
        startExam(shuffle(qs), { title: f.title, kind: 'test', limit: f.min * 60 });
      });
    };
  }

  // ------------------------------------------------------------------ results
  function renderResults(items, meta) {
    view = 'results';
    keyHandler = null;
    const rows = items.map(it => ({ ...it, q: byKey.get(it.k) })).filter(r => r.q);
    const n = rows.length;
    const ok = r => r.c != null && r.c === r.q.ans;
    const correct = rows.filter(ok).length, answered = rows.filter(r => r.c != null).length;
    const byT = {}, byS = {};
    rows.forEach(r => {
      const t = byT[r.q.topic] || (byT[r.q.topic] = { c: 0, n: 0 }); t.n++; if (ok(r)) t.c++;
      const sec = GRE.sectionOf(r.q.sec);
      const sk = r.q.topic + '|' + sec.id;
      const s = byS[sk] || (byS[sk] = { c: 0, n: 0, name: `${sec.id} ${sec.name}`, topic: r.q.topic }); s.n++; if (ok(r)) s.c++;
    });
    const weak = Object.values(byS).filter(s => s.n >= 2 && s.c < s.n).sort((a, b) => a.c / a.n - b.c / b.n).slice(0, 5);
    const wrongKeys = rows.filter(r => !ok(r) && !removed(r.k)).map(r => r.k);
    main.innerHTML = `
      <h1>${esc(meta.title)}</h1>
      <div class="scorebox">
        <div><div class="big">${correct} / ${n}</div><div class="muted">correct · ${pct(correct, n)}%</div></div>
        <div><div><b>${answered}</b> answered${n - answered ? `, ${n - answered} left blank` : ''}</div><div class="muted">time ${fmtTime(meta.secs)}${meta.kind !== 'practice' && n ? ` · ${(meta.secs / 60 / n).toFixed(1)} min per question` : ''}</div></div>
        <span class="spacer"></span>
        <div class="row"><button class="btn" id="redo" ${wrongKeys.length ? '' : 'disabled'}>Practice the ${wrongKeys.length} I missed</button><button class="btn primary" data-go="home">Done</button></div>
      </div>
      <h2>By topic</h2>
      <table class="tbl"><tr><th>Topic</th><th class="num">Correct</th><th class="num">%</th><th></th></tr>
        ${topics.filter(t => byT[t.id]).map(t => `<tr><td><span class="pill" style="--c:${t.color}">${esc(t.short)}</span></td>
          <td class="num">${byT[t.id].c} / ${byT[t.id].n}</td><td class="num">${pct(byT[t.id].c, byT[t.id].n)}%</td>
          <td><div class="bar" style="--c:${t.color}"><span style="width:${pct(byT[t.id].c, byT[t.id].n)}%"></span></div></td></tr>`).join('')}
      </table>
      ${weak.length ? `<h2>Sections to review</h2><table class="tbl"><tr><th>Section</th><th class="num">Correct</th></tr>
        ${weak.map(s => `<tr><td><span class="pill" style="--c:${GRE.T[s.topic].color}">${esc(GRE.T[s.topic].short)}</span> §${esc(s.name)}</td><td class="num">${s.c} / ${s.n}</td></tr>`).join('')}</table>` : ''}
      <h2>Review answers</h2>
      <div class="filters" id="filters">
        <button class="btn small on" data-f="all">All (${n})</button>
        <button class="btn small" data-f="wrong">Wrong (${rows.filter(r => r.c != null && !ok(r)).length})</button>
        <button class="btn small" data-f="blank">Unanswered (${n - answered})</button>
        ${rows.some(r => r.m) ? `<button class="btn small" data-f="marked">Marked (${rows.filter(r => r.m).length})</button>` : ''}
      </div>
      <div id="revList"></div>`;
    $('#redo', main).onclick = () => startPractice(shuffle(wrongKeys.map(k => byKey.get(k))), 'Missed questions');
    const list = $('#revList', main);
    const showList = f => {
      const sel = rows.map((r, idx) => ({ r, idx })).filter(({ r }) =>
        f === 'all' || (f === 'wrong' && r.c != null && !ok(r)) || (f === 'blank' && r.c == null) || (f === 'marked' && r.m));
      list.innerHTML = sel.length ? sel.map(({ r, idx }) => {
        const T = GRE.T[r.q.topic];
        const res = r.c == null ? '<span class="res skip">–</span>' : ok(r) ? '<span class="res ok">✓</span>' : '<span class="res no">✗</span>';
        return `<details class="rev" data-idx="${idx}"><summary>${res}<span>${idx + 1}.</span>
          <span class="pill" style="--c:${T.color}">${esc(T.short)}</span><span class="muted small">§${r.q.sec} ${esc(GRE.leafName(r.q.sec))}</span>
          <span class="spacer"></span><span class="small">${r.c == null ? 'no answer' : 'you: (' + LET[r.c] + ')'} · answer (${LET[r.q.ans]})</span></summary><div class="body"></div></details>`;
      }).join('') : '<div class="empty">Nothing here.</div>';
      $$('details.rev', list).forEach(d => d.addEventListener('toggle', () => {
        const body = $('.body', d);
        if (!d.open || body.childElementCount) return;
        const r = rows[+d.dataset.idx];
        body.innerHTML = `${qhead(r.q, starBtn(r.q).replace('id="star"', '') + removeBtn(r.q))}${qbody(r.q)}
          <div class="feedback ${ok(r) ? 'ok' : 'no'}"><div class="verdict">${ok(r) ? '✓ Correct' : `Answer: (${LET[r.q.ans]})`}</div><div class="expl">${r.q.expl}</div></div>`;
        $$('.choice', body).forEach((b, j) => {
          b.disabled = true;
          if (j === r.q.ans) b.classList.add('right'); else if (j === r.c) b.classList.add('wrong');
        });
        const st = $('.star', body);
        st.onclick = () => { if (P.bm[r.q.key]) delete P.bm[r.q.key]; else P.bm[r.q.key] = 1; save(); st.classList.toggle('on', !!P.bm[r.q.key]); };
        const rm = $('.rmbtn', body);
        rm.onclick = () => {
          setRemoved(r.q, !removed(r.q.key));
          rm.classList.toggle('on', removed(r.q.key));
          $('span', rm).textContent = removed(r.q.key) ? 'Removed — restore' : 'Remove';
          toast(removed(r.q.key) ? 'Question removed — it won’t appear again.' : 'Question restored.');
        };
        math(body);
      }));
    };
    $$('#filters button', main).forEach(b => (b.onclick = () => {
      $$('#filters button', main).forEach(x => x.classList.toggle('on', x === b));
      showList(b.dataset.f);
    }));
    showList('all');
    window.scrollTo(0, 0);
  }

  // ------------------------------------------------------------------ progress page
  function renderStats() {
    view = 'stats';
    withBanks(topics.map(t => t.id), () => {
      if (view !== 'stats') return;
      const secStats = {};
      let seen = 0, att = 0, cor = 0;
      for (const k in P.q) {
        const q = byKey.get(k), r = P.q[k];
        seen++; att += r.n; cor += r.c;
        if (!q) continue;
        const sid = GRE.sectionOf(q.sec).id;
        const s = secStats[q.topic + '|' + sid] || (secStats[q.topic + '|' + sid] = { seen: 0, att: 0, cor: 0 });
        s.seen++; s.att += r.n; s.cor += r.c;
      }
      const total = topics.reduce((s, t) => s + bank(t.id).length, 0);
      main.innerHTML = `
        <h1>Your progress</h1>
        <div class="scorebox">
          <div><div class="big">${fmtN(seen)}</div><div class="muted">of ${fmtN(total)} questions answered</div></div>
          <div><div class="big">${att ? pct(cor, att) + '%' : '–'}</div><div class="muted">correct over ${fmtN(att)} attempts</div></div>
          <div><div class="big">${P.tests.length}</div><div class="muted">quizzes and tests taken</div></div>
        </div>
        <h2>By topic and section</h2>
        <table class="tbl"><tr><th>Topic / section</th><th class="num">Answered</th><th class="num">Accuracy</th><th></th></tr>
          ${topics.map(t => {
            const s = topicStats(t.id);
            return `<tr><td><span class="pill" style="--c:${t.color}">${esc(t.name)}</span></td><td class="num">${fmtN(s.seen)} / ${fmtN(bank(t.id).length)}</td>
              <td class="num">${s.att ? pct(s.cor, s.att) + '%' : '–'}</td><td><div class="bar" style="--c:${t.color}"><span style="width:${s.att ? pct(s.cor, s.att) : 0}%"></span></div></td></tr>` +
              t.sections.map(sec => {
                const x = secStats[t.id + '|' + sec.id];
                return `<tr class="sub"><td>§${sec.id} ${esc(sec.name)}</td><td class="num">${x ? fmtN(x.seen) : 0}</td><td class="num">${x && x.att ? pct(x.cor, x.att) + '%' : '–'}</td>
                  <td><div class="bar" style="--c:${t.color}"><span style="width:${x && x.att ? pct(x.cor, x.att) : 0}%"></span></div></td></tr>`;
              }).join('');
          }).join('')}
        </table>
        <h2>Quiz and test history</h2>
        ${P.tests.length ? `<table class="tbl"><tr><th>Date</th><th>Session</th><th class="num">Score</th><th class="num">Time</th><th></th></tr>
          ${P.tests.map((t, i) => `<tr><td>${new Date(t.date).toLocaleString()}</td><td>${esc(t.title)}</td>
            <td class="num">${t.correct} / ${t.n} (${pct(t.correct, t.n)}%)</td><td class="num">${fmtTime(t.secs)}</td>
            <td><button class="btn small" data-rev="${i}">Review</button></td></tr>`).join('')}</table>` : '<div class="empty">No quizzes or tests yet.</div>'}
        <h2>Removed questions</h2>
        <div id="removedList"></div>
        <h2>Your data</h2>
        <p class="muted small">Progress is stored in this browser only. Export it to back it up or move it to another computer.</p>
        <div class="row">
          <button class="btn" id="exp">Export progress</button>
          <label class="btn">Import progress<input type="file" id="imp" accept="application/json" class="hidden"></label>
          <span class="spacer"></span>
          <button class="btn danger" id="reset">Reset all progress</button>
        </div>`;
      showRemoved();
      $$('[data-rev]', main).forEach(b => (b.onclick = () => {
        const t = P.tests[+b.dataset.rev];
        renderResults(t.items, { title: t.title, kind: t.kind, secs: t.secs });
      }));
      $('#exp', main).onclick = () => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([JSON.stringify(P)], { type: 'application/json' }));
        a.download = `gre-physics-progress-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      };
      $('#imp', main).onchange = e => {
        const f = e.target.files[0];
        if (!f) return;
        f.text().then(txt => {
          const d = JSON.parse(txt);
          if (!d || typeof d.q !== 'object') throw new Error('not a progress file');
          if (!confirm('Replace your current progress with the imported file?')) return;
          P = Object.assign(blank(), d); save(); toast('Progress imported.'); renderStats();
        }).catch(err => toast('Could not import: ' + err.message));
      };
      $('#reset', main).onclick = () => {
        if (!confirm('Delete all answers, bookmarks, removed questions and test history? This cannot be undone.')) return;
        P = blank(); save(); setCur(null); toast('Progress reset.'); renderStats();
      };
    });
  }

  function showRemoved() {
    const box = $('#removedList', main);
    if (!box) return;
    const qs = Object.keys(P.hid).sort((a, b) => P.hid[b] - P.hid[a]).map(k => byKey.get(k)).filter(Boolean);
    if (!qs.length) { box.innerHTML = '<div class="empty">No removed questions. Use “Remove” on a question to stop seeing it.</div>'; return; }
    box.innerHTML = `<div class="row" style="margin-bottom:10px"><span class="muted">${fmtN(qs.length)} question${qs.length > 1 ? 's' : ''} hidden from all sessions.</span>
        <span class="spacer"></span><button class="btn small" id="restoreAll">Restore all</button></div>
      ${qs.map(q => {
        const T = GRE.T[q.topic];
        return `<div class="rmrow" data-k="${q.key}"><div class="rmhead"><span class="pill" style="--c:${T.color}">${esc(T.short)}</span>
          <span class="muted small">Q ${fmtN(q.num)} · §${q.sec}</span><span class="spacer"></span><button class="btn small" data-restore="${q.key}">Restore</button></div>
          <div class="rmstem">${q.q}</div></div>`;
      }).join('')}`;
    math(box);
    $$('[data-restore]', box).forEach(b => (b.onclick = () => { setRemoved(byKey.get(b.dataset.restore), false); showRemoved(); }));
    $('#restoreAll', box).onclick = () => {
      if (!confirm(`Restore all ${qs.length} removed questions?`)) return;
      P.hid = {}; save(); showRemoved();
    };
  }

  // ------------------------------------------------------------------ constants sheet
  function showConstants() {
    const rows = [
      ['Rest mass of the electron', 'm_e = 9.11 \\times 10^{-31}\\ \\text{kg}'],
      ['Magnitude of the electron charge', 'e = 1.60 \\times 10^{-19}\\ \\text{C}'],
      ['Avogadro’s number', 'N_A = 6.02 \\times 10^{23}'],
      ['Universal gas constant', 'R = 8.31\\ \\text{J/(mol·K)}'],
      ['Boltzmann’s constant', 'k = 1.38 \\times 10^{-23}\\ \\text{J/K}'],
      ['Speed of light', 'c = 3.00 \\times 10^{8}\\ \\text{m/s}'],
      ['Planck’s constant', 'h = 6.63 \\times 10^{-34}\\ \\text{J·s} = 4.14 \\times 10^{-15}\\ \\text{eV·s}'],
      ['', '\\hbar = h/2\\pi = 1.05 \\times 10^{-34}\\ \\text{J·s} = 6.58 \\times 10^{-16}\\ \\text{eV·s}'],
      ['Vacuum permittivity', '\\epsilon_0 = 8.85 \\times 10^{-12}\\ \\text{C}^2/(\\text{N·m}^2)'],
      ['Vacuum permeability', '\\mu_0 = 4\\pi \\times 10^{-7}\\ \\text{T·m/A}'],
      ['Universal gravitational constant', 'G = 6.67 \\times 10^{-11}\\ \\text{m}^3/(\\text{kg·s}^2)'],
      ['Acceleration due to gravity', 'g = 9.80\\ \\text{m/s}^2'],
      ['1 atmosphere pressure', '1\\ \\text{atm} = 1.0 \\times 10^{5}\\ \\text{N/m}^2 = 1.0 \\times 10^{5}\\ \\text{Pa}'],
      ['1 angstrom', '1\\ \\text{Å} = 1 \\times 10^{-10}\\ \\text{m} = 0.1\\ \\text{nm}'],
      ['Bohr magneton', '\\mu_B = 9.27 \\times 10^{-24}\\ \\text{J/T}'],
      ['Stefan–Boltzmann constant', '\\sigma = 5.67 \\times 10^{-8}\\ \\text{W/(m}^2\\text{·K}^4)'],
    ];
    const handy = [
      ['hc = 1240\\ \\text{eV·nm}', 'm_e c^2 = 0.511\\ \\text{MeV}'],
      ['m_p c^2 = 938\\ \\text{MeV}', '1\\ \\text{u} = 931.5\\ \\text{MeV}/c^2'],
      ['E_1(\\text{H}) = -13.6\\ \\text{eV}', 'a_0 = 0.529\\ \\text{Å}'],
      ['k_B T \\approx \\tfrac{1}{40}\\ \\text{eV at } 300\\ \\text{K}', '\\lambda_{\\max} T = 2.9 \\times 10^{-3}\\ \\text{m·K}'],
      ['\\alpha \\approx 1/137', '\\mu_B = 5.79 \\times 10^{-5}\\ \\text{eV/T}'],
    ];
    modal(`<h2 style="margin-top:0">Table of information</h2>
      <p class="muted small">The constants printed on the real exam.</p>
      <table class="consts">${rows.map(r => `<tr><td>${r[0]}</td><td>$${r[1]}$</td></tr>`).join('')}</table>
      <h3 style="margin-top:18px">Rotational inertia about the center of mass</h3>
      <table class="consts"><tr><td>Rod</td><td>$\\tfrac{1}{12}M\\ell^2$</td><td>Disk</td><td>$\\tfrac{1}{2}MR^2$</td><td>Sphere</td><td>$\\tfrac{2}{5}MR^2$</td></tr></table>
      <h3 style="margin-top:18px">Prefixes</h3>
      <table class="consts"><tr>${[['10^{12}', 'T'], ['10^{9}', 'G'], ['10^{6}', 'M'], ['10^{3}', 'k'], ['10^{-2}', 'c'], ['10^{-3}', 'm'], ['10^{-6}', '\\mu'], ['10^{-9}', 'n'], ['10^{-12}', 'p'], ['10^{-15}', 'f']].map(p => `<td>$${p[0]}$ ${p[1].startsWith('\\') ? `$${p[1]}$` : p[1]}</td>`).join('')}</tr></table>
      <h3 style="margin-top:18px">Handy values (not on the official sheet)</h3>
      <table class="consts">${handy.map(r => `<tr><td>$${r[0]}$</td><td>$${r[1]}$</td></tr>`).join('')}</table>`);
  }

  // ------------------------------------------------------------------ start
  bankStatus();
  if (!window.renderMathInElement) toast('Math rendering failed to load; formulas will show as TeX.');
  go('home');
  setTimeout(warmUp, 50);
})();
