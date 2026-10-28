'use strict';

const DEMO_STUDENTS = [
  ['Omar Hassan', 'omar.hassan', '12', 'approved', 0.82], ['Salma Adel', 'salma.adel', '11', 'approved', 0.71],
  ['Youssef Mostafa', 'y.mostafa', '12', 'approved', 0.58], ['Nour El-Din', 'nour.eldin', '10', 'approved', 0.9],
  ['Malak Samir', 'malak.s', '11', 'approved', 0.44], ['Karim Fathy', 'karim.fathy', '12', 'approved', 0.66],
  ['Hana Mahmoud', 'hana.m', '11', 'pending'], ['Adam Reda', 'adam.reda', '10', 'pending'],
  ['Layla Ibrahim', 'layla.i', '12', 'pending'], ['Ziad Sherif', 'ziad.s', '10', 'rejected']
];
const DEMO_LOGIN = { username: 'demo.student', password: 'DemoPass123' };

function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

async function seedDemo() {
  if (S.db.questions.some(q => q.demo)) return { ok: true };
  const rnd = mulberry32(20260918), t = now();
  const shufR = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  const students = DEMO_STUDENTS.map((s, i) => ({
    name: s[0], username: s[1], grade: s[2], status: s[3], skill: s[4],
    phone: '+2010000' + String(1000 + i + 1), parentPhone: '+2011000' + String(1000 + i + 1),
    daysAgo: Math.floor(rnd() * 25) + 1, lastLogin: s[3] === 'approved' ? t - Math.floor(rnd() * 3) * DAY : null
  }));
  students.push({ name: 'Demo Student', username: DEMO_LOGIN.username, grade: '11', status: 'approved', skill: 0.62,
    phone: '+201000000000', parentPhone: '+201100000000', daysAgo: 1, lastLogin: t, password: DEMO_LOGIN.password });

  const userRes = await callAdminFn('seed_demo', { students, authDomain: AUTH_DOMAIN });
  if (!userRes.ok) return userRes;
  const mapping = userRes.mapping;

  const qPayloads = SAMPLE_QUESTIONS.map(s => {
    const options = {}; s[3].forEach((o, i) => { options[LETTERS[i]] = o; });
    return { chapter: s[0], tier: s[1], stem: s[2], options, answer: s[4], explanation: s[5],
      table_caption: s[6] ? s[6].caption : '', table_rows: s[6] ? s[6].rows : null, is_demo: true };
  });
  const { data: qRows, error: qErr } = await sb.from('questions').insert(qPayloads).select();
  if (qErr) return { ok: false, error: friendlyDbError(qErr) };
  const examQids = [0, 2, 3, 4, 6, 7, 9, 10, 11, 14].map(i => qRows[i].id);
  const { data: exam, error: eErr } = await sb.from('exams').insert({
    title: 'Mock exam 1: mixed chapters', description: 'A ten-question sample exam. Delete it or edit it once you add your own questions.',
    type: 'Mixed', minutes: 15, attempts: 2, shuffle: false, status: 'published', qids: examQids, is_demo: true
  }).select().single();
  if (eErr) return { ok: false, error: friendlyDbError(eErr) };

  const attemptRows = [], mistakeAgg = {};
  students.filter(s => s.status === 'approved').forEach(s => {
    const uidv = mapping[s.username]; if (!uidv) return;
    const n = 4 + Math.floor(rnd() * 4), offs = [];
    for (let i = 0; i < n - 1; i++) offs.push(Math.floor(rnd() * 20) + 1); offs.push(Math.floor(rnd() * 3));
    offs.sort((a, b) => b - a);
    offs.forEach((off, k) => {
      const ts = t - off * DAY - Math.floor(rnd() * 6) * 3600000;
      const isExam = s.username === DEMO_LOGIN.username ? k === 0 : (k < 2 ? rnd() < 0.75 : false);
      const pool = isExam ? examQids : shufR(qRows.map(q => q.id)).slice(0, 5 + Math.floor(rnd() * 4));
      const answers = {}, results = {}; let score = 0;
      pool.forEach(qid => {
        const q = qRows.find(x => x.id === qid);
        const p = Math.min(0.97, Math.max(0.08, s.skill + k * 0.02 + (q.tier === 'HARD' ? -0.2 : q.tier === 'EASY' ? 0.08 : 0) + (rnd() - 0.5) * 0.2));
        const ok = rnd() < p, wrongs = LETTERS.filter(l => l !== q.answer), chosen = ok ? q.answer : wrongs[Math.floor(rnd() * 4)];
        answers[qid] = chosen; results[qid] = { chosen, correct: ok, answer: q.answer, explanation: q.explanation }; if (ok) score++;
        const key = uidv + ':' + qid;
        const m = mistakeAgg[key] || (mistakeAgg[key] = { user_id: uidv, qid, wrong_count: 0, first_at: new Date(ts).toISOString(), last_at: new Date(ts).toISOString(), resolved: false, resolved_at: null, reason: '', last_chosen: null, is_demo: true, _lastTs: 0 });
        if (!ok) { m.wrong_count++; if (ts >= m._lastTs) { m.last_at = new Date(ts).toISOString(); m.last_chosen = chosen; m.resolved = false; m._lastTs = ts; } }
        else if (ts >= m._lastTs && m.wrong_count > 0 && rnd() < 0.4) { m.resolved = true; m.resolved_at = new Date(ts + DAY / 2).toISOString(); m._lastTs = ts; }
      });
      attemptRows.push({
        user_id: uidv, kind: isExam ? 'exam' : 'practice', exam_id: isExam ? exam.id : null,
        title: isExam ? exam.title : 'Practice: mixed chapters', started_at: new Date(ts - (isExam ? 11 : 6) * 60000).toISOString(),
        submitted_at: new Date(ts).toISOString(), minutes: isExam ? exam.minutes : 0, qids: pool, answers, results,
        score, total: pool.length, status: 'submitted', timed_out: false, is_demo: true
      });
    });
  });
  Object.values(mistakeAgg).forEach(m => { m.reason = rnd() < 0.6 ? ['content', 'content', 'misread', 'data', 'calc', 'guess', 'time'][Math.floor(rnd() * 7)] : ''; delete m._lastTs; });
  if (attemptRows.length) { const { error } = await sb.from('attempts').insert(attemptRows); if (error) return { ok: false, error: friendlyDbError(error) }; }
  if (Object.keys(mistakeAgg).length) { const { error } = await sb.from('mistakes').insert(Object.values(mistakeAgg)); if (error) return { ok: false, error: friendlyDbError(error) }; }

  await refreshAll();
  return { ok: true };
}
async function clearDemo() {
  const userRes = await callAdminFn('clear_demo', {});
  if (!userRes.ok) return userRes;
  const { error: e1 } = await sb.from('exams').delete().eq('is_demo', true);
  const { error: e2 } = await sb.from('questions').delete().eq('is_demo', true);
  if (e1 || e2) return { ok: false, error: friendlyDbError(e1 || e2) };
  await refreshAll();
  return { ok: true };
}

/* =====================================================================
   Section 3: UI framework — events, dialogs, navigation, shared components
   ===================================================================== */
const actions = {}, forms = {}, inputs = {}, changes = {};
const ICONS = {
  home: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5 10v10h14V10"/>',
  practice: '<path d="M2 5.5C4.5 4 8 4 12 6c4-2 7.5-2 10-.5V19c-2.5-1.5-6-1.5-10 .5-4-2-7.5-2-10-.5z"/><path d="M12 6v13.5"/>',
  exam: '<rect x="6" y="4" width="12" height="17" rx="2"/><path d="M9 4h6v2H9z"/><path d="m9.5 13 2 2 3.5-4"/>',
  results: '<path d="M5 20V11M12 20V4M19 20v-6"/>',
  retry: '<path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.3c2.2.7 3.5 2.6 3.5 5.7"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5z"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6"/>',
  copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h9"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/>',
  eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  eyeoff: '<path d="M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.2 4M6.5 6.6A17 17 0 0 0 2 12s3.6 7 10 7c1.7 0 3.2-.4 4.5-1"/>',
  left: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
  right: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  logout: '<path d="M9 4H5v16h4M16 8l4 4-4 4M20 12H9"/>',
  layers: '<path d="m12 3 9 5-9 5-9-5 9-5z"/><path d="m3 13 9 5 9-5"/>',
  upload: '<path d="M12 16V4M6 10l6-6 6 6M4 20h16"/>',
  grid: '<rect x="3" y="3" width="7" height="8" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="15" width="7" height="6" rx="1.5"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 .9-1 1.7M12 17v.01"/>',
  chat: '<path d="M4 20l1.3-4A8.5 8.5 0 1 1 8 18.7z"/>',
  lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
  up: '<path d="M12 19V5M6 11l6-6 6 6"/>',
  down: '<path d="M12 5v14M6 13l6 6 6-6"/>',
  alert: '<path d="M12 3 2.5 20h19z"/><path d="M12 10v5M12 18v.01"/>',
  dna: '<path d="M7 3c0 6 10 6 10 12s-10 6-10 6M17 3c0 6-10 6-10 12s10 6 10 6M8 7h8M8 17h8"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="m21 16-5-5-8 8"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01"/>',
  hw: '<path d="M7 3h8l4 4v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M15 3v4h4"/><path d="M9 12h6M9 16h4"/>',
  note: '<path d="M4 4h16v12l-4 4H4z"/><path d="M20 16h-4v4"/><path d="M8 9h8M8 13h5"/>',
  recordings: '<rect x="2.5" y="6" width="13" height="12" rx="2"/><path d="m15.5 10.3 5.5-3v9.4l-5.5-3z"/>',
  quizzes: '<circle cx="5" cy="7" r="1.8"/><path d="M9 7h11"/><circle cx="5" cy="12" r="1.8"/><path d="m4.1 12 .7.7 1.3-1.6"/><path d="M9 12h11"/><circle cx="5" cy="17" r="1.8"/><path d="M9 17h11"/>'
};
const icon = (n, c) => `<svg class="ic ${c || ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n] || ''}</svg>`;
const cleanups = [];
const onLeave = fn => cleanups.push(fn);
function runCleanups() { while (cleanups.length) { try { cleanups.pop()(); } catch (e) { } } }
const go = h => { if (location.hash === h) route(); else location.hash = h; };
const formData = f => Object.fromEntries(new FormData(f).entries());

document.addEventListener('click', e => {
  const t = e.target.closest('[data-act]');
  if (t && actions[t.dataset.act]) actions[t.dataset.act](t, e);
  $$('details.menu[open]').forEach(d => { if (!d.contains(e.target)) d.open = false; });
});
document.addEventListener('submit', e => { const f = e.target.closest('[data-form]'); if (f && forms[f.dataset.form]) { e.preventDefault(); forms[f.dataset.form](f, e); } });
document.addEventListener('input', e => { const f = e.target.closest('[data-input]'); if (f && inputs[f.dataset.input]) inputs[f.dataset.input](f, e); });
document.addEventListener('change', e => { const f = e.target.closest('[data-change]'); if (f && changes[f.dataset.change]) changes[f.dataset.change](f, e); });
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { if ($('.scrim')) closeModal(); const m = $('details.menu[open]'); if (m) m.open = false; }
  if (e.key === 'Tab') {
    const sc = $('.scrim'); if (!sc) return;
    const f = $$('a[href],button:not([disabled]),input:not([disabled]),select,textarea', sc).filter(x => x.offsetParent !== null);
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1], cur = document.activeElement;
    if (e.shiftKey && (cur === first || cur === sc.firstElementChild)) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && cur === last) { e.preventDefault(); first.focus(); }
  }
});

/* ---------- toast, modal, confirm ---------- */
function toast(msg, kind) {
  const box = $('#toasts'); if (!box) return;
  const t = document.createElement('div'); t.className = 'toast ' + (kind || ''); t.textContent = msg; box.appendChild(t);
  setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 320); }, 3200);
}
function openModal(html, o) {
  o = o || {}; closeModal();
  const el = document.createElement('div'); el.className = 'scrim';
  el.innerHTML = `<div class="${o.drawer ? 'drawer' : 'modal' + (o.wide ? ' wide' : '')}" role="dialog" aria-modal="true" aria-label="${esc(o.label || 'Dialog')}" tabindex="-1">${html}</div>`;
  document.body.appendChild(el); S.modalPrev = document.activeElement; el._onClose = o.onClose;
  const box = el.firstElementChild; try { box.focus(); } catch (e) { }
  el.addEventListener('mousedown', e => { if (e.target === el) closeModal(); });
  return box;
}
function closeModal() {
  const el = $('.scrim'); if (!el) return;
  const cb = el._onClose; el.remove();
  if (S.modalPrev && S.modalPrev.focus && document.contains(S.modalPrev)) try { S.modalPrev.focus(); } catch (e) { }
  if (cb) cb();
}
actions.close = () => closeModal();
function confirmBox(o) {
  return new Promise(res => {
    const box = openModal(`<h3>${esc(o.title)}</h3><div class="muted">${o.body || ''}</div><div class="row end gap-s wrapr"><button class="btn btn-line" data-close>${esc(o.cancel || 'Cancel')}</button><button class="btn ${o.danger ? 'btn-danger' : 'btn-primary'}" data-ok>${esc(o.ok || 'Confirm')}</button></div>`, { label: o.title, onClose: () => res(false) });
    box.addEventListener('click', e => {
      if (e.target.closest('[data-ok]')) { const cb = $('.scrim'); if (cb) cb._onClose = null; closeModal(); res(true); }
      else if (e.target.closest('[data-close]')) closeModal();
    });
  });
}
function setBusy(btn, on, label) {
  if (!btn) return; if (on) { btn.dataset.label = btn.innerHTML; btn.disabled = true; if (label) btn.textContent = label; } else { btn.disabled = false; if (btn.dataset.label) btn.innerHTML = btn.dataset.label; }
}
function showErrors(f, errors) {
  $$('[data-err]', f).forEach(x => { x.textContent = ''; });
  $$('[aria-invalid]', f).forEach(x => x.removeAttribute('aria-invalid'));
  Object.keys(errors || {}).forEach(k => {
    const t = $(`[data-err="${k}"]`, f); if (t) t.textContent = errors[k];
    const i = f.elements ? f.elements[k] : null; if (i && i.setAttribute) { i.setAttribute('aria-invalid', 'true'); }
  });
  const first = f.querySelector('[aria-invalid="true"]'); if (first) first.focus();
}

/* ---------- theme ---------- */
function initTheme() { const t = store.get(TKEY); if (t === 'light' || t === 'dark') document.documentElement.setAttribute('data-theme', t); }
function effectiveTheme() { const t = document.documentElement.getAttribute('data-theme'); if (t) return t; return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'; }
actions.theme = el => {
  const next = effectiveTheme() === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next); store.set(TKEY, next);
  $$('[data-act="theme"]').forEach(b => { b.innerHTML = icon(next === 'dark' ? 'sun' : 'moon'); b.setAttribute('aria-label', next === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'); });
};
actions.pwtoggle = el => {
  const inp = el.parentElement.querySelector('input'); const show = inp.type === 'password';
  inp.type = show ? 'text' : 'password'; el.innerHTML = icon(show ? 'eyeoff' : 'eye'); el.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
};
actions.signout = async () => { await signOutNow(); S.userId = null; S.db = null; S.run = null; S.ui = {}; await refreshAll(); location.hash = ''; route(); };

/* ---------- shared components ---------- */
const avatar = (name, c) => `<span class="av hexclip ${c || ''}" aria-hidden="true">${esc(initials(name))}</span>`;
const tierBadge = t => `<span class="badge b-${String(t).toLowerCase()}">${esc(levelName(t))}</span>`;
function statusBadge(s) { return s === 'approved' ? '<span class="badge b-ok">Approved</span>' : s === 'pending' ? '<span class="badge b-warn">Waiting</span>' : '<span class="badge b-bad">Not approved</span>'; }
const nl2br = s => esc(s).replace(/\n/g, '<br>');
const waAnchor = (p, label) => `<a class="wa" href="${esc(waLink(p))}" target="_blank" rel="noopener noreferrer">${icon('chat', 'ic-s')}${esc(label || p)}</a>`;

function tableHtml(t) {
  if (!t || !t.rows || !t.rows.length) return '';
  const h = t.rows[0], b = t.rows.slice(1);
  return `<div class="qt-wrap"><table class="qt">${t.caption ? `<caption>${esc(t.caption)}</caption>` : ''}<thead><tr>${h.map(c => `<th scope="col">${esc(c)}</th>`).join('')}</tr></thead><tbody>${b.map(r => `<tr>${r.map(c => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}
function imgTag(ref, alt, cls) {
  if (!ref) return '';
  const u = IMG.cache[ref];
  return `<img class="${cls || ''}" data-ref="${esc(ref)}" ${u ? `src="${u}"` : ''} alt="${esc(alt || '')}">`;
}
/* o: {act, sel, chosen, reveal, locked, meta, mark (show the correct answer without a chosen one), wrongOnly} */
function questionHtml(q, o) {
  o = o || {};
  const meta = o.meta === false ? '' : `<div class="qmeta"><span class="badge b-mute">${esc(q.chapter)}</span>${tierBadge(q.tier)}</div>`;
  const lo = !!q.lettersOnly;
  const opts = LETTERS.map(l => {
    let c = '', tag = '';
    if (o.reveal || o.mark) {
      if (l === q.answer) { c = 'right'; tag = o.chosen === l ? 'Your answer · correct' : 'Correct answer'; }
      else if (l === o.chosen) { c = 'wrong'; tag = 'Your answer'; }
    } else if (o.wrongOnly && l === o.chosen) { c = 'wrong'; tag = 'Your last answer'; }
    else if (l === o.sel) c = 'sel';
    const interactive = !!o.act && !o.locked;
    const txt = !lo && q.options && q.options[l] ? `<span class="otxt">${esc(q.options[l])}</span>` : '';
    const im = !lo && q.optImg && q.optImg[l] ? imgTag(q.optImg[l], 'Image for option ' + l, 'oimg') : '';
    return `<button type="button" class="opt ${c} ${lo ? 'lo' : ''}" ${interactive ? `data-act="${o.act}" data-l="${l}" role="radio" aria-checked="${l === o.sel}"` : 'disabled'}><span class="ltr" aria-hidden="true">${l}</span><span class="obody"><span class="sr">Option ${l}${lo ? '' : ': '}</span>${txt}${im}${tag ? `<span class="tag">${tag}</span>` : ''}</span></button>`;
  }).join('');
  const stem = q.stem ? `<div class="qstem">${nl2br(q.stem)}</div>` : '';
  const pic = q.image ? `<button type="button" class="qimg" data-act="zoom" data-ref="${esc(q.image)}" aria-label="Enlarge the image">${imgTag(q.image, q.imageAlt || 'Image for this question')}</button>` : '';
  return `${meta}${stem}${pic}${tableHtml(q.table)}<div class="opts ${lo ? 'letters' : ''}" ${o.act && !o.locked ? 'role="radiogroup" aria-label="Answer choices"' : ''}>${opts}</div>`;
}
actions.zoom = el => {
  const box = openModal(`<div class="row end"><button class="iconbtn" data-act="close" aria-label="Close">${icon('x')}</button></div>${imgTag(el.dataset.ref, 'Enlarged image', 'zoomimg')}`, { wide: true, label: 'Image' });
  const im = $('img', box); if (im && !im.getAttribute('src')) IMG.get(el.dataset.ref).then(u => { if (u) im.src = u; });
};
/* fill in photos that are not in memory yet (they live in IndexedDB) */
let hydT = null;
function hydrateImages() {
  $$('img[data-ref]:not([src])').forEach(el => {
    IMG.get(el.dataset.ref).then(u => { if (u) el.src = u; else { const s = document.createElement('span'); s.className = 'noimg'; s.textContent = 'Photo not available on this device'; el.replaceWith(s); } });
  });
}
new MutationObserver(() => { clearTimeout(hydT); hydT = setTimeout(hydrateImages, 0); }).observe(document.body, { childList: true, subtree: true });

/* progress ring for a chapter: c = {chapter, pct (null when not started), answered} */
function ringHtml(c, o) {
  o = o || {}; const p = c.pct, t = tone(p);
  const label = c.chapter + (p == null ? ', not started' : ', ' + p + '% correct, ' + c.answered + ' answered');
  const svg = `<svg viewBox="0 0 100 100" aria-hidden="true"><circle class="rt" cx="50" cy="50" r="42" pathLength="100"/>${p != null ? `<circle class="rf" cx="50" cy="50" r="42" pathLength="100" stroke-dasharray="${Math.max(p, 1.5)} 100" transform="rotate(-90 50 50)"/>` : ''}</svg>`;
  const inner = `<span class="ring ${t}">${svg}<b>${p == null ? '–' : p + '<small>%</small>'}</b></span><span class="rname" title="${esc(c.chapter)}">${esc(c.chapter)}</span><span class="rsub">${p == null ? 'Not started' : c.answered + ' answered'}</span>`;
  return o.href ? `<a class="ringcell" href="${o.href}" aria-label="${esc(label)}. Practise this chapter.">${inner}</a>` : `<div class="ringcell" role="group" aria-label="${esc(label)}">${inner}</div>`;
}
const ringsGrid = (list, o) => `<div class="rings ${o && o.sm ? 'sm' : ''}">${list.map(c => ringHtml(c, o && o.link ? { href: '#/practice?c=' + encodeURIComponent(c.chapter) } : {})).join('')}</div>`;
function explainHtml(q, correct) {
  const head = correct == null ? 'Explanation' : correct ? 'Correct' : 'Not quite. The correct answer is ' + q.answer + '.';
  return `<div class="explain ${correct == null ? '' : correct ? 'ok' : 'bad'}"><b class="h">${esc(head)}</b>${q.explanation ? nl2br(q.explanation) : '<span class="muted">No explanation was added for this question.</span>'}</div>`;
}
function hbars(items) {
  if (!items.length) return '';
  return `<div class="bars">${items.map(i => `<div class="bar"><span class="name" title="${esc(i.name)}">${esc(i.name)}</span><span class="track" role="img" aria-label="${esc(i.name)} ${i.pct}%"><span class="fill ${tone(i.pct)}" style="display:block;width:${Math.max(2, i.pct)}%"></span></span><span class="v">${i.pct}%</span></div>`).join('')}</div>`;
}
function barChart(items, o) {
  o = o || {}; const W = 560, H = 190, padL = 30, padB = 24, padT = 10, n = items.length;
  const max = o.max || Math.max(4, ...items.map(d => d.v)), bw = (W - padL - 6) / n, ch = H - padB - padT;
  const grid = [0, .5, 1].map(f => { const y = padT + ch - ch * f; return `<line class="gl" x1="${padL}" x2="${W}" y1="${y}" y2="${y}"/><text x="${padL - 6}" y="${y + 4}" text-anchor="end">${Math.round(max * f)}</text>`; }).join('');
  const bars = items.map((d, i) => { const h = Math.max(d.v ? 3 : 0, d.v / max * ch), x = padL + i * bw + 3; return `<rect class="gb ${d.today ? 'today' : ''}" x="${x}" y="${padT + ch - h}" width="${Math.max(2, bw - 6)}" height="${h}" rx="3"><title>${esc(d.title)}</title></rect>${i % (o.every || 2) === (n - 1) % (o.every || 2) ? `<text x="${x + (bw - 6) / 2}" y="${H - 6}" text-anchor="middle">${esc(d.label)}</text>` : ''}`; }).join('');
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(o.label || 'Chart')}">${grid}${bars}</svg>`;
}
const activityChart = days => barChart(days.map((d, i) => ({ v: d.n, label: String(new Date(d.day).getDate()), title: fmtDate(d.day) + ': ' + plural(d.n, 'question') + ' answered', today: i === days.length - 1 })), { label: 'Questions answered per day, last ' + days.length + ' days', every: 2 });
const emptyState = (h, p, cta) => `<div class="empty"><h3>${esc(h)}</h3><p>${p}</p>${cta || ''}</div>`;

/* ---------- app frame ---------- */
const STUDENT_NAV = [['home', 'Home', 'home'], ['practice', 'Classified Questions', 'practice'], ['homework', 'Homework', 'quizzes'], ['exams', 'Exams', 'exam'], ['results', 'Results', 'results'], ['notes', 'Annotations', 'note'], ['recordings', 'Recordings', 'recordings'], ['mistakes', 'Mistakes', 'retry']];
const ADMIN_NAV = [['a/overview', 'Overview', 'grid'], ['a/questions', 'Questions', 'help'], ['a/exams', 'Exams', 'exam'], ['a/students', 'Students', 'users']];
function navHtml(u, key) {
  const db = S.db, items = u.role === 'admin' ? ADMIN_NAV : STUDENT_NAV;
  const pending = u.role === 'admin' ? students(db).filter(x => x.status === 'pending').length : 0;
  const dark = effectiveTheme() === 'dark';
  return `${S.volatile ? '<div class="banner" role="status">Your browser is blocking storage, so nothing will be kept after you close this tab.</div>' : ''}
<header class="nav"><div class="wrap wide nav-in">
<a class="brand" href="#/${u.role === 'admin' ? 'a/overview' : 'home'}" aria-label="${esc(BRAND.name)}, home"><img class="hexclip" src="${LOGO_EMBLEM}" alt=""><span><b>${esc(BRAND.name)}</b><small>${esc(BRAND.tag)}</small></span></a>
<nav class="tabs" aria-label="Main">${items.map(([p, l, ic]) => `<a class="tab" href="#/${p}" aria-label="${esc(l)}" title="${esc(l)}" ${key === p ? 'aria-current="page"' : ''}>${icon(ic)}<span>${l}</span>${p === 'a/students' && pending ? `<span class="count" aria-label="${pending} waiting for approval">${pending}</span>` : ''}</a>`).join('')}</nav>
<div class="nav-tools"><button class="iconbtn" data-act="theme" aria-label="${dark ? 'Switch to light theme' : 'Switch to dark theme'}">${icon(dark ? 'sun' : 'moon')}</button>
<details class="menu"><summary aria-label="Account menu">${avatar(u.name)}</summary><div class="menu-pop"><div class="who"><b>${esc(u.name)}</b><div class="xs muted">${u.role === 'admin' ? 'Teacher' : 'Grade ' + esc(u.grade)} · @${esc(u.username)}</div></div><a href="#/profile">${icon('user')}Account</a><button data-act="signout">${icon('logout')}Sign out</button></div></details></div>
</div></header>`;
}
function draw(html, title, key, o) {
  o = o || {}; const u = currentUser();
  $('#app').innerHTML = (o.bare ? '' : navHtml(u, key)) + (o.raw ? html : `<main class="wrap main" id="main" tabindex="-1">${html}</main>`);
  document.title = (title ? title + ' · ' : '') + BRAND.name;
  try { window.scrollTo(0, 0); } catch (e) { }
  const h = $('#main h1'); if (h) { h.setAttribute('tabindex', '-1'); try { h.focus({ preventScroll: true }); } catch (e) { } }
}

/* =====================================================================
   Section 4: sign in / register / teacher setup
   ===================================================================== */
const WA_HREF = 'https://wa.me/' + BRAND.wa;
const fld = (label, name, control, hint) => `<div class="field"><label class="lbl" for="f-${name}">${label}</label>${control}${hint ? `<div class="hint">${hint}</div>` : ''}<div class="err" data-err="${name}" aria-live="polite"></div></div>`;
const pwField = (label, name, auto, hint) => fld(label, name, `<div class="pw"><input class="inp" id="f-${name}" name="${name}" type="password" autocomplete="${auto}" required><button type="button" data-act="pwtoggle" aria-label="Show password">${icon('eye')}</button></div>`, hint);
const txtField = (label, name, o) => { o = o || {}; return fld(label, name, `<input class="inp" id="f-${name}" name="${name}" type="${o.type || 'text'}" ${o.auto ? `autocomplete="${o.auto}"` : ''} ${o.mode ? `inputmode="${o.mode}"` : ''} ${o.ph ? `placeholder="${esc(o.ph)}"` : ''} ${o.max ? `maxlength="${o.max}"` : ''} required>`, o.hint); };

function authShell(inner) {
  return `<div class="auth">
<section class="auth-brand" aria-label="About this site">
  <div class="auth-mini"><img class="hexclip" src="${LOGO_EMBLEM}" width="46" height="46" alt=""><span><b class="serif" style="font-size:19px;display:block;line-height:1.1">${esc(BRAND.name)}</b><small style="letter-spacing:.2em;text-transform:uppercase;font-size:10.5px;color:#CFE0F6">${esc(BRAND.tag)}</small></span></div>
  <div style="display:grid;gap:22px">
    <div class="logo-card"><img src="${LOGO_FULL}" width="589" height="593" alt="${esc(BRAND.name)}, ${esc(BRAND.tag)}. A DNA helix inside a hexagon."></div>
    <h1>Biology for the EST II and ACT II, one chapter at a time.</h1>
    <ul>
      <li><i>${icon('check')}</i><span>Chapter-by-chapter practice with an explanation after every answer</span></li>
      <li><i>${icon('check')}</i><span>Timed exams that are marked for you, with a full review</span></li>
      <li><i>${icon('check')}</i><span>A mistake history you retry until every question is resolved</span></li>
    </ul>
  </div>
  <p class="small">Questions? <a class="wa" href="${WA_HREF}" target="_blank" rel="noopener noreferrer">${icon('chat', 'ic-s')}WhatsApp ${esc(BRAND.waShow)}</a></p>
</section>
<section class="auth-form"><div class="auth-card">${inner}</div></section></div>`;
}
const authTabs = t => `<div class="pill-tabs" role="tablist" aria-label="Account"><button role="tab" aria-selected="${t === 'in'}" data-act="authtab" data-t="in">Sign in</button><button role="tab" aria-selected="${t === 'reg'}" data-act="authtab" data-t="reg">Register</button></div>`;