'use strict';


function viewAuth() {
  const tab = S.ui.authTab || 'in'; let inner = '';
  if (tab === 'in') {
    inner = `${authTabs('in')}<div class="panel"><form data-form="signin" novalidate style="display:grid;gap:18px">
<div><h2 class="serif" style="font-size:26px">Welcome back</h2><p class="muted small mt-s">Sign in with the username you registered with.</p></div>
<div class="formerr" data-err="form" role="alert"></div>
${txtField('Username', 'username', { auto: 'username' })}${pwField('Password', 'password', 'current-password')}
<button class="btn btn-primary btn-block" type="submit">Sign in</button></form></div>

<p class="center small muted">Are you the teacher? <button class="linkbtn" data-act="authtab" data-t="teacher">Set up your account</button></p>`;
  } else if (tab === 'reg') {
    inner = `${authTabs('reg')}<div class="panel"><form data-form="register" novalidate style="display:grid;gap:16px">
<div><h2 class="serif" style="font-size:26px">Request access</h2><p class="muted small mt-s">Mr Youssef approves every new student. You can sign in once you are approved.</p></div>
<div class="formerr" data-err="form" role="alert"></div>
${txtField('Full name', 'name', { auto: 'name', max: 60 })}
${txtField('Username', 'username', { auto: 'username', max: 24, hint: 'Letters, numbers, dots and underscores. You will use this to sign in.' })}
${txtField('Email address', 'email', { type: 'email', auto: 'email', ph: 'you@example.com' })}
${pwField('Password', 'password', 'new-password', 'At least 8 characters.')}
${fld('Grade', 'grade', `<select class="sel" id="f-grade" name="grade" required><option value="">Choose your grade</option>${GRADES.map(g => `<option value="${g}">Grade ${g}</option>`).join('')}</select>`)}
${txtField('Your phone number', 'phone', { type: 'tel', auto: 'tel', mode: 'tel', ph: '01012345678' })}
${txtField('Parent’s phone number', 'parentPhone', { type: 'tel', mode: 'tel', ph: '01012345678' })}
${fld('Desired score (out of 800)', 'desiredScore', `<input class="inp" id="f-desiredScore" name="desiredScore" type="number" inputmode="numeric" min="0" max="800" placeholder="e.g. 650">`, 'Optional — your target score, if you have one.')}
${fld('Which trial?', 'trial', `<input class="inp" id="f-trial" name="trial" type="text" maxlength="60" placeholder="e.g. October, December">`, 'Optional — which exam sitting this registration is for.')}
${fld('Is this your first trial?', 'firstTrial', `<select class="sel" id="f-firstTrial" name="firstTrial" data-change="regfirsttrial"><option value="">Choose</option><option value="yes">Yes</option><option value="no">No</option></select>`, 'Optional.')}
<div id="f-prevscorewrap" class="hide">${fld('Previous score (out of 800)', 'previousScore', `<input class="inp" id="f-previousScore" name="previousScore" type="number" inputmode="numeric" min="0" max="800" placeholder="e.g. 600">`, 'Your score on your previous trial.')}</div>
${fld('How did you hear about us?', 'heardAbout', `<select class="sel" id="f-heardAbout" name="heardAbout" data-change="regheard"><option value="">Choose</option>${HEARD_ABOUT.map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}</select>`, 'Optional.')}
<div id="f-heardotherwrap" class="hide">${fld('Tell us more', 'heardAboutOther', `<input class="inp" id="f-heardAboutOther" name="heardAboutOther" type="text" maxlength="160" placeholder="Where did you hear about us?">`)}</div>
<button class="btn btn-primary btn-block" type="submit">Request access</button></form></div>`;
  } else if (tab === 'done') {
    inner = `<div class="panel"><div class="statuscard">${avatar('✓')}<h2 class="serif" style="font-size:26px">Request sent</h2><p class="muted">Thank you${S.ui.doneName ? ', ' + esc(firstName(S.ui.doneName)) : ''}. Mr Youssef will review your request. Once it is approved, sign in with your username and password.</p><button class="btn btn-primary" data-act="authtab" data-t="in">Back to sign in</button></div></div>`;
  } else if (tab === 'status') {
    const pend = S.ui.status === 'pending', locked = S.ui.status === 'device_locked', frozen = S.ui.status === 'frozen';
    const title = pend ? 'Your request is waiting for approval' : locked ? 'Signed in on another device' : frozen ? 'Your account is paused' : 'Your account is not active';
    const body = pend ? 'Mr Youssef reviews each request himself. You will be able to sign in as soon as it is approved.'
      : locked ? 'This account is already set up on another phone or computer. Message Mr Youssef on WhatsApp and he will unlock it for you.'
      : frozen ? 'Mr Youssef has temporarily paused your account. Message him on WhatsApp if you think this is a mistake.'
      : 'Your access was not approved, or it was removed. Message Mr Youssef on WhatsApp and he will sort it out.';
    inner = `<div class="panel"><div class="statuscard">${avatar(pend ? '…' : '!')}<h2 class="serif" style="font-size:26px">${title}</h2>
<p class="muted">${body}</p>
${pend ? '' : `<a class="btn btn-primary" href="${WA_HREF}" target="_blank" rel="noopener noreferrer">${icon('chat')}WhatsApp Mr Youssef</a>`}<button class="btn btn-line" data-act="authtab" data-t="in">Back to sign in</button></div></div>`;
  } else if (tab === 'teacher') {
    inner = `<div class="panel"><form data-form="teacher" novalidate style="display:grid;gap:16px">
<div><h2 class="serif" style="font-size:26px">Set up the teacher account</h2><p class="muted small mt-s">This account opens the dashboard where you add questions and exams and approve students.</p></div>
<div class="formerr" data-err="form" role="alert"></div>
${txtField('Your name', 'name', { auto: 'name', max: 60 })}${txtField('Username', 'username', { auto: 'username', max: 24 })}
${pwField('Password', 'password', 'new-password', 'At least 8 characters.')}${pwField('Confirm password', 'confirm', 'new-password')}
<button class="btn btn-primary btn-block" type="submit">Create teacher account</button></form></div>
<p class="center small"><button class="linkbtn" data-act="authtab" data-t="in">Back to sign in</button></p>`;
  }
  $('#app').innerHTML = authShell(inner);
  document.title = 'Sign in · ' + BRAND.name;
}
actions.authtab = el => { S.ui.authTab = el.dataset.t; viewAuth(); const f = $('.auth-card input'); if (f) try { f.focus(); } catch (e) { } };
changes.regfirsttrial = el => {
  const wrap = document.getElementById('f-prevscorewrap'); if (!wrap) return;
  const show = el.value === 'no'; wrap.classList.toggle('hide', !show);
  if (!show) { const inp = document.getElementById('f-previousScore'); if (inp) inp.value = ''; }
};
changes.regheard = el => {
  const wrap = document.getElementById('f-heardotherwrap'); if (!wrap) return;
  const show = el.value === 'other'; wrap.classList.toggle('hide', !show);
  if (!show) { const inp = document.getElementById('f-heardAboutOther'); if (inp) inp.value = ''; }
};

forms.signin = async f => {
  const d = formData(f), btn = $('button[type=submit]', f);
  showErrors(f, {}); setBusy(btn, true, 'Signing in…');
  const r = await login(d.username, d.password);
  if (r.ok) { await refreshAll(); S.ui.authTab = 'in'; setBusy(btn, false); go(r.user.role === 'admin' ? '#/a/overview' : '#/home'); return; }
  setBusy(btn, false);
  if (r.status) { S.ui.authTab = 'status'; S.ui.status = r.status; viewAuth(); }
  else showErrors(f, { form: r.error });
};
forms.register = async f => {
  const d = formData(f), btn = $('button[type=submit]', f);
  showErrors(f, {}); setBusy(btn, true, 'Sending…');
  const r = await registerStudent(d);
  setBusy(btn, false);
  if (r.ok) { S.ui.authTab = 'done'; S.ui.doneName = r.name; viewAuth(); } else showErrors(f, r.errors);
};
forms.teacher = async f => {
  const d = formData(f), btn = $('button[type=submit]', f);
  showErrors(f, {}); setBusy(btn, true, 'Creating…');
  const r = await createAdmin(d);
  if (r.ok) { await refreshAll(); S.ui.authTab = 'in'; setBusy(btn, false); go('#/a/overview'); return; }
  setBusy(btn, false);
  showErrors(f, r.errors);
};

/* =====================================================================
   Section 5: student portal
   ===================================================================== */
const kindLabel = k => k === 'exam' ? 'Exam' : k === 'retry' ? 'Retry' : 'Practice';
const scoreOf = a => pct(a.score, a.total);

/* ---------- Home ---------- */
function viewHome(u) {
  const db = loadDb(), st = userStats(db, u.id), ch = chapterStats(db, u.id);
  const exams = db.exams.filter(e => e.status === 'published').map(e => ({ e, s: examState(db, e, u.id) }));
  const prog = exams.find(x => x.s.prog), fresh = exams.find(x => !x.s.prog && x.s.left > 0 && !x.s.done.length);
  let next;
  if (prog) next = { h: 'Resume ' + prog.e.title, p: mmss(prog.s.prog.startedAt + prog.s.prog.minutes * 60000 - now()) + ' left on the clock.', cta: 'Resume exam', href: '#/exam/' + prog.s.prog.id };
  else if (fresh) next = { h: 'New exam: ' + fresh.e.title, p: `${plural(fresh.e.qids.length, 'question')}, ${fresh.e.minutes} minutes`, cta: 'See exam', href: '#/exams' };
  else if (st.openMistakes) next = { h: plural(st.openMistakes, 'mistake') + ' to clear', p: 'Retry the questions you missed until each one is resolved.', cta: 'Clear mistakes', href: '#/mistakes' };
  else next = { h: 'Start a practice set', p: 'Pick your chapters and get an explanation after every answer.', cta: 'Practise', href: '#/practice' };
  const recent = db.attempts.filter(a => a.userId === u.id && a.status === 'submitted').sort((a, b) => b.submittedAt - a.submittedAt).slice(0, 5);
  const weakest = ch.find(c => c.answered >= 2);
  const seen = new Set(ch.map(c => c.chapter));
  const ringList = ch.concat(db.chapters.filter(n => !seen.has(n) && db.questions.some(q => q.chapter === n)).map(n => ({ chapter: n, pct: null, answered: 0 })));
  draw(`<div class="pagehead"><div><h1>${st.attempts ? 'Welcome back' : 'Welcome'}, ${esc(firstName(u.name))}</h1><p class="muted">${st.attempts ? 'Here is where you stand.' : 'Answer your first set of questions and your progress will appear here.'}</p></div></div>
<div class="next"><div><h2>${esc(next.h)}</h2><p>${esc(next.p)}</p></div><a class="btn btn-primary" href="${next.href}">${esc(next.cta)}</a></div>
<div class="ledger mt-l"><div><div class="n">${st.answered}</div><div class="l">Questions answered</div></div><div><div class="n">${fmtPct(st.accuracy)}</div><div class="l">Overall accuracy</div></div><div><div class="n">${st.exams}</div><div class="l">Exams taken</div></div><div><div class="n">${st.openMistakes}</div><div class="l">Mistakes to clear</div></div></div>
<div class="split sec"><section><div class="sechead"><h2>Your chapters</h2>${weakest ? `<a class="btn btn-line btn-sm" href="#/practice?c=${encodeURIComponent(weakest.chapter)}">Practise ${esc(weakest.chapter)}</a>` : ''}</div>
${ringList.length ? `<div class="panel">${ringsGrid(ringList, { link: true })}<p class="hint mt">Weakest first. Green is 75% or more, amber 50 to 74%, red under 50%. Tap a ring to practise that chapter.</p></div>` : `<div class="panel">${emptyState('No chapter data yet', 'Finish a practice set or an exam and your accuracy by chapter shows up here.', '<a class="btn btn-primary" href="#/practice">Start practising</a>')}</div>`}</section>
<section><div class="sechead"><h2>Recent results</h2>${recent.length ? '<a class="btn btn-ghost btn-sm" href="#/results">All results</a>' : ''}</div>
<div class="panel">${recent.length ? `<div class="list">${recent.map(a => `<a class="li" style="text-decoration:none;color:inherit" href="#/review/${a.id}"><div class="grow"><div class="strong">${esc(a.title)}</div><div class="xs muted">${kindLabel(a.kind)} · ${ago(a.submittedAt)}</div></div><div class="strong">${scoreOf(a)}%</div></a>`).join('')}</div>` : emptyState('Nothing yet', 'Your exam and practice results will be listed here.')}</div></section></div>`, 'Home', 'home');
}

/* ---------- Chapter picker (shared by Classified Questions and Homework) ---------- */
function poolChapterTiles(db, uid, pk) {
  const counts = {}; db.questions.forEach(q => { if (q.pool === pk) counts[q.chapter] = (counts[q.chapter] || 0) + 1; });
  const agg = {};
  resultsOf(db, a => a.userId === uid).forEach(({ qid, r }) => {
    const q = db.questions.find(x => x.id === qid); if (!q || q.pool !== pk) return;
    const c = agg[q.chapter] || (agg[q.chapter] = { answered: 0, correct: 0 });
    c.answered++; if (r.correct) c.correct++;
  });
  return db.chapters.filter(c => counts[c]).map(c => ({ chapter: c, total: counts[c], answered: agg[c] ? agg[c].answered : 0, pct: agg[c] ? pct(agg[c].correct, agg[c].answered) : null }));
}
function groupHumanSystems(tiles) {
  const hs = new Set(HUMAN_SYSTEMS);
  const sub = tiles.filter(t => hs.has(t.chapter));
  if (!sub.length) return tiles;
  const total = sum(sub.map(t => t.total)), answered = sum(sub.map(t => t.answered));
  const correct = sub.reduce((s, t) => s + (t.pct == null ? 0 : Math.round(t.pct * t.answered / 100)), 0);
  const group = { chapter: 'Human Systems', total, answered, pct: answered ? pct(correct, answered) : null, _sub: sub };
  const out = []; let inserted = false;
  tiles.forEach(t => { if (hs.has(t.chapter)) { if (!inserted) { out.push(group); inserted = true; } } else out.push(t); });
  return out;
}
function humanSystemCellHtml(c, pk) {
  const p = c.pct, t = tone(p);
  const svg = `<svg viewBox="0 0 100 100" aria-hidden="true"><circle class="rt" cx="50" cy="50" r="42" pathLength="100"/>${p != null ? `<circle class="rf" cx="50" cy="50" r="42" pathLength="100" stroke-dasharray="${Math.max(p, 1.5)} 100" transform="rotate(-90 50 50)"/>` : ''}</svg>`;
  return `<button type="button" class="ringcell" data-act="humansys" data-pk="${pk}" aria-label="Human Systems, ${p == null ? 'not started' : p + '% correct'}. Choose a body system."><span class="ring ${t}">${svg}<b>${p == null ? '–' : p + '<small>%</small>'}</b></span><span class="rname">Human Systems</span><span class="rsub">${p == null ? 'Not started' : c.answered + ' answered'}</span></button>`;
}
function chapterGridHtml(pk) {
  const db = S.db, u = currentUser();
  let tiles = poolChapterTiles(db, u.id, pk);
  if (!tiles.length) return '';
  tiles = groupHumanSystems(tiles);
  const lockedSet = pk === 'classified' ? new Set((db.hwProgress || []).filter(p => !p.unlocked && p.hw_total > 0).map(p => p.chapter)) : new Set();
  const cells = tiles.map(c => c._sub ? humanSystemCellHtml(c, pk) : lockedSet.has(c.chapter)
    ? `<a class="ringcell" href="#/homework?c=${encodeURIComponent(c.chapter)}" aria-label="${esc(c.chapter)}, locked. Go to Homework to unlock it."><span class="ring low">${icon('lock')}</span><span class="rname" title="${esc(c.chapter)}">${esc(c.chapter)}</span><span class="rsub">Locked · do Homework</span></a>`
    : ringHtml(c, { href: '#/' + (pk === 'homework' ? 'homework' : 'practice') + '?c=' + encodeURIComponent(c.chapter) })
  ).join('');
  return `<div class="rings">${cells}</div>`;
}
actions.humansys = el => {
  const pk = el.dataset.pk, db = S.db, u = currentUser();
  const tiles = poolChapterTiles(db, u.id, pk).filter(t => HUMAN_SYSTEMS.includes(t.chapter));
  const lockedSet = pk === 'classified' ? new Set((db.hwProgress || []).filter(p => !p.unlocked && p.hw_total > 0).map(p => p.chapter)) : new Set();
  const rows = tiles.map(c => lockedSet.has(c.chapter)
    ? `<a class="li" href="#/homework?c=${encodeURIComponent(c.chapter)}" style="text-decoration:none;color:inherit"><div class="grow">${esc(c.chapter)}</div><span class="badge b-mute">${icon('lock', 'ic-s')}Locked</span></a>`
    : `<button type="button" class="li" data-act="humansyspick" data-pk="${pk}" data-c="${esc(c.chapter)}" style="width:100%;text-align:left;background:none;border:0;cursor:pointer"><div class="grow"><div class="strong">${esc(c.chapter)}</div><div class="xs muted">${c.pct == null ? 'Not started' : c.pct + '% correct · ' + c.answered + ' answered'}</div></div></button>`
  ).join('');
  openModal(`<div class="row between"><h3>Human Systems</h3><button class="iconbtn" data-act="close" aria-label="Close">${icon('x')}</button></div>
<p class="muted small mt-s">Choose a body system.</p><div class="list mt-s">${rows || '<p class="muted">No questions yet.</p>'}</div>`, { label: 'Choose a body system' });
};
actions.humansyspick = el => { closeModal(); startChapterBundle(el.dataset.pk, el.dataset.c); };
function startChapterBundle(pk, chapter) {
  const db = loadDb(), u = currentUser();
  let pool = db.questions.filter(q => q.pool === pk && q.chapter === chapter);
  if (!pool.length) { toast('No questions in this chapter yet.', 'bad'); return go('#/' + (pk === 'homework' ? 'homework' : 'practice')); }
  const seen = new Set(resultsOf(db, a => a.userId === u.id).map(x => x.qid));
  pool = shuffle(pool).sort((a, b) => seen.has(a.id) - seen.has(b.id));
  const kindTitle = pk === 'homework' ? 'Homework' : 'Classified Questions';
  S.run = { kind: 'practice', title: kindTitle + ': ' + chapter, qids: pool.map(q => q.id), i: 0, sel: null, answered: {}, aid: null, done: false, again: { poolKind: pk, chapters: [chapter] } };
  go('#/run');
}
function viewPractice(u) {
  const db = loadDb(); const c = S.params.get('c');
  if (c && db.chapters.includes(c)) {
    const locked = (db.hwProgress || []).some(p => p.chapter === c && !p.unlocked && p.hw_total > 0);
    if (locked) return go('#/homework?c=' + encodeURIComponent(c));
    return startChapterBundle('classified', c);
  }
  const grid = chapterGridHtml('classified');
  draw(`<div class="pagehead"><div><h1>Classified Questions</h1><p class="muted">Pick a chapter to go straight into its full question set. A chapter unlocks once you have answered every question in its Homework set at least once.</p></div></div>
${grid || `<div class="panel">${emptyState('No questions yet', 'Mr Youssef has not added questions yet. Check back soon.')}</div>`}`, 'Classified Questions', 'practice');
}
function viewHomework(u) {
  const db = loadDb(); const c = S.params.get('c');
  if (c && db.chapters.includes(c)) return startChapterBundle('homework', c);
  const grid = chapterGridHtml('homework');
  draw(`<div class="pagehead"><div><h1>Homework</h1><p class="muted">Pick a chapter to go straight into its full question set. Answer every question at least once to unlock that chapter in Classified Questions.</p></div></div>
${grid || `<div class="panel">${emptyState('No homework yet', 'Mr Youssef has not added homework questions yet. Check back soon.')}</div>`}`, 'Homework', 'homework');
}

/* ---------- Session runner (practice + retry) ---------- */
function runQHtml(db) {
  const r = S.run, q = db.questions.find(x => x.id === r.qids[r.i]), ans = r.answered[q.id], total = r.qids.length;
  const retryNote = ans && r.kind === 'retry' ? `<p class="small mt-s ${ans.correct ? '' : 'muted'}"><b>${ans.correct ? 'Resolved.' : 'Still open.'}</b> ${ans.correct ? 'This question is off your open mistakes list.' : 'Read the explanation, then try it again later.'}</p>` : '';
  return `${questionHtml(q, { act: 'runsel', sel: r.sel, chosen: ans && ans.chosen, reveal: !!ans, locked: !!ans })}${ans ? explainHtml(q, ans.correct) + retryNote : ''}
<div class="row end mt-l wrapr">${ans ? `<button class="btn btn-primary" data-act="runnext">${r.i + 1 < total ? 'Next question' : 'See results'}</button>` : `<button class="btn btn-line" data-act="runskip">Skip</button><button class="btn btn-primary" data-act="runcheck" ${r.sel ? '' : 'disabled'}>Check answer</button>`}</div>`;
}
const runDone = () => Object.keys(S.run.answered).length;
function viewRun(u) {
  const r = S.run; if (!r) return go('#/practice');
  if (r.done) return viewRunDone(u);
  const db = loadDb();
  while (r.i < r.qids.length && !db.questions.some(x => x.id === r.qids[r.i])) r.i++;
  if (r.i >= r.qids.length) { r.done = true; return viewRunDone(u); }
  const total = r.qids.length, cur = r.i + (r.answered[r.qids[r.i]] ? 1 : 0);
  draw(`<div class="pagehead"><div><h1 style="font-size:28px">${esc(r.title)}</h1><p class="muted" id="runpos">Question ${r.i + 1} of ${total}</p></div><button class="btn btn-line btn-sm" data-act="runend">End session</button></div>
<div class="progress" id="runprog" role="progressbar" aria-label="Session progress" aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="${cur}"><i style="width:${cur / total * 100}%"></i></div>
<div class="q mt" id="runq">${runQHtml(db)}</div>`, r.title, r.kind === 'retry' ? 'mistakes' : ((r.again && r.again.poolKind === 'homework') ? 'homework' : 'practice'));
}
function refreshRun(focusSel) {
  const db = loadDb(), r = S.run, total = r.qids.length, cur = r.i + (r.answered[r.qids[r.i]] ? 1 : 0);
  $('#runq').innerHTML = runQHtml(db);
  const p = $('#runprog'); if (p) { p.setAttribute('aria-valuenow', cur); p.firstElementChild.style.width = (cur / total * 100) + '%'; }
  if (focusSel) { const b = $('#runq .opt.sel') || $('#runq [data-act="runcheck"]'); if (b) try { b.focus(); } catch (e) { } }
}
actions.runsel = el => { const r = S.run; if (!r) return; r.sel = el.dataset.l; refreshRun(true); };
actions.runcheck = async () => {
  const r = S.run; if (!r || !r.sel) return; const qid = r.qids[r.i];
  const res = await recordPracticeAnswer(r.kind, r.title, currentUser().id, qid, r.sel, r.aid); if (!res) return;
  r.aid = res.aid; r.answered[qid] = { chosen: r.sel, correct: res.correct }; r.sel = null; refreshRun();
  const n = $('#runq [data-act="runnext"]'); if (n) try { n.focus(); } catch (e) { }
};
actions.runnext = actions.runskip = () => { const r = S.run; r.i++; r.sel = null; if (r.i >= r.qids.length) r.done = true; viewRun(currentUser()); };
actions.runend = () => { S.run.done = true; viewRun(currentUser()); };
function viewRunDone(u) {
  const r = S.run, db = loadDb(), ans = Object.entries(r.answered), ok = ans.filter(([, a]) => a.correct).length, n = ans.length;
  const missed = ans.filter(([, a]) => !a.correct).map(([id]) => db.questions.find(q => q.id === id)).filter(Boolean);
  const retry = r.kind === 'retry';
  draw(`<div class="pagehead"><div><h1>${n ? (retry ? 'Retry finished' : 'Set finished') : 'Session ended'}</h1><p class="muted">${esc(r.title)}</p></div></div>
${n ? `<div class="ledger three" style="grid-template-columns:repeat(3,1fr)"><div><div class="n">${retry ? ok : pct(ok, n) + '%'}</div><div class="l">${retry ? 'Resolved' : 'Score'}</div></div><div><div class="n">${ok}/${n}</div><div class="l">Correct</div></div><div><div class="n">${n - ok}</div><div class="l">${retry ? 'Still open' : 'To review'}</div></div></div>` : `<div class="panel">${emptyState('No questions answered', 'You ended the session before answering anything.')}</div>`}
${missed.length ? `<div class="sec"><h2>${retry ? 'Still open' : 'Missed in this set'}</h2><div class="panel mt-s"><div class="list">${missed.map(q => `<div class="li"><div class="grow"><div>${esc(trunc(qTitle(q), 140))}</div><div class="xs muted mt-s">${esc(q.chapter)}</div></div></div>`).join('')}</div><p class="hint mt">${retry ? 'These stay on your mistakes list.' : 'These were added to your mistake history.'}</p></div></div>` : ''}
<div class="row gap-s wrapr mt-l">${retry ? '<a class="btn btn-primary" href="#/mistakes">Back to mistakes</a>' : `<button class="btn btn-primary" data-act="runagain">Practise again</button><a class="btn btn-line" href="#/${r.again && r.again.poolKind === 'homework' ? 'homework' : 'practice'}">Change chapters</a>${missed.length ? '<a class="btn btn-line" href="#/mistakes">Clear mistakes</a>' : ''}`}</div>`, 'Finished', retry ? 'mistakes' : ((r.again && r.again.poolKind === 'homework') ? 'homework' : 'practice'));
}
actions.runagain = () => { const a = S.run.again; startChapterBundle(a.poolKind, a.chapters[0]); };

/* ---------- Exams list + start ---------- */
function viewExams(u) {
  const db = loadDb();
  const rows = db.exams.filter(e => e.status === 'published').map(e => ({ e, s: examState(db, e, u.id) }));
  draw(`<div class="pagehead"><div><h1>Exams</h1><p class="muted">Timed exams set by Mr Youssef. They are marked as soon as you submit.</p></div></div>
<div class="panel">${rows.length ? `<div class="list">${rows.map(({ e, s }) => {
    const last = s.done.length ? s.done.slice().sort((a, b) => b.submittedAt - a.submittedAt)[0] : null;
    const used = e.attempts === 0 ? plural(s.mine.length, 'attempt') + ' so far' : `${s.mine.length} of ${e.attempts} attempts used`;
    let btn;
    if (!s.access) btn = `<span class="badge b-mute">${icon('lock', 'ic-s')}Locked · ask your teacher</span>`;
    else if (s.prog) btn = `<a class="btn btn-primary" href="#/exam/${s.prog.id}">Resume exam</a>`;
    else if (s.left > 0) btn = `<button class="btn btn-primary" data-act="examstart" data-id="${e.id}">${s.done.length ? 'Retake exam' : 'Start exam'}</button>`;
    else btn = '<button class="btn btn-line" disabled>No attempts left</button>';
    return `<div class="li wrapr" style="align-items:flex-start"><div class="grow" style="min-width:240px"><div class="row gap-s wrapr"><h3>${esc(e.title)}</h3><span class="badge b-core">${esc(e.type)}</span></div>${e.description ? `<p class="muted small mt-s">${esc(e.description)}</p>` : ''}<p class="xs muted mt-s">${plural(e.qids.length, 'question')} · ${e.minutes} minutes · ${used}</p>${s.best != null ? `<p class="small mt-s">Best score <b>${s.best}%</b>${last ? ` · <a href="#/review/${last.id}">Review last attempt</a>` : ''}</p>` : ''}</div><div>${btn}</div></div>`;
  }).join('')}</div>` : emptyState('No exams yet', 'When Mr Youssef publishes an exam it will appear here.')}</div>`, 'Exams', 'exams');
}
actions.examstart = async el => {
  const db = loadDb(), e = db.exams.find(x => x.id === el.dataset.id); if (!e) return;
  if (!examState(db, e, currentUser().id).access) return toast('Ask your teacher for access to this exam.', 'bad');
  const ok = await confirmBox({ title: 'Start ' + e.title + '?', body: `<p>You have <b>${e.minutes} minutes</b> for ${plural(e.qids.length, 'question')}. The timer starts now and keeps running if you leave the page. When time runs out your answers are submitted automatically.</p>`, ok: 'Start exam' });
  if (!ok) return;
  const r = await startExam(e.id, currentUser().id);
  if (!r.ok) return toast(r.error, 'bad');
  go('#/exam/' + r.aid);
};

/* ---------- Exam taker ---------- */
function exQuestionHtml(db, at) {
  const i = S.ex.i, n = at.qids.length, qid = at.qids[i], q = db.questions.find(x => x.id === qid);
  const body = q ? questionHtml(q, { act: 'exsel', sel: at.answers[qid], meta: false }) : '<p class="muted">This question was removed by the teacher and will not be counted.</p>';
  return `<div class="q"><h2 id="exqh" tabindex="-1" style="margin-bottom:14px">Question ${i + 1} of ${n}</h2>${body}
<div class="row between wrapr mt-l"><div class="row gap-s"><button class="btn btn-line" data-act="exprev" ${i === 0 ? 'disabled' : ''}>${icon('left')}Previous</button><button class="btn btn-line" data-act="exnext" ${i === n - 1 ? 'disabled' : ''}>Next${icon('right')}</button></div>
<div class="row gap-s wrapr">${at.answers[qid] ? '<button class="btn btn-ghost" data-act="exclear">Clear answer</button>' : ''}<button class="btn btn-line" data-act="exflag" aria-pressed="${!!at.flags[qid]}">${icon('flag')}${at.flags[qid] ? 'Flagged for review' : 'Flag for review'}</button></div></div></div>`;
}
function exNavHtml(at) {
  const answered = at.qids.filter(id => at.answers[id]).length, flagged = at.qids.filter(id => at.flags[id]).length;
  return `<h2 style="font-size:17px">Questions</h2><p class="small muted mt-s">${answered} of ${at.qids.length} answered${flagged ? ` · ${flagged} flagged` : ''}</p>
<div class="nv">${at.qids.map((id, i) => `<button class="chip ${at.answers[id] ? 'done' : ''} ${at.flags[id] ? 'flag' : ''} ${i === S.ex.i ? 'cur' : ''}" data-act="exgo" data-i="${i}" aria-label="Question ${i + 1}, ${at.answers[id] ? 'answered' : 'not answered'}${at.flags[id] ? ', flagged' : ''}" ${i === S.ex.i ? 'aria-current="true"' : ''}><span>${i + 1}</span></button>`).join('')}</div>
<div class="legend"><span><i style="background:var(--brand)"></i>Answered</span><span><i style="background:var(--warn)"></i>Flagged</span><span><i style="background:var(--ink)"></i>Current</span></div>`;
}
function viewExamTake(u, aid) {
  const db = loadDb(), at = db.attempts.find(a => a.id === aid && a.userId === u.id && a.kind === 'exam');
  if (!at) return go('#/exams');
  if (at.status === 'submitted') return go('#/review/' + aid);
  const end = at.startedAt + at.minutes * 60000;
  if (now() >= end) { toast('Time is up. Your exam was submitted.'); submitExam(aid).then(() => go('#/review/' + aid)); return; }
  if (!S.ex || S.ex.aid !== aid) S.ex = { aid, i: 0 };
  draw(`<div class="examtop"><div class="wrap"><div><b class="serif" style="font-size:18px">${esc(at.title)}</b></div><div class="row gap-l"><span class="timer" id="timer" role="timer" aria-label="Time left">${icon('clock')}<span id="tv">${mmss(end - now())}</span></span><button class="btn btn-primary btn-sm" data-act="exsubmit">Submit exam</button></div></div></div>
<main class="wrap main" id="main" tabindex="-1"><div class="exam"><div id="exq">${exQuestionHtml(db, at)}</div><aside class="navp panel" id="exnav" aria-label="Question navigator">${exNavHtml(at)}</aside></div></main>`, at.title, null, { bare: true, raw: true });
  let w5 = false, w1 = false;
  const tick = () => {
    const left = end - now(), tv = $('#tv'), t = $('#timer'); if (!tv) return;
    tv.textContent = mmss(left); t.classList.toggle('warn', left < 300000 && left >= 60000); t.classList.toggle('bad', left < 60000);
    if (left < 300000 && !w5 && at.minutes > 6) { w5 = true; toast('5 minutes left'); }
    if (left < 60000 && !w1) { w1 = true; toast('1 minute left', 'bad'); }
    if (left <= 0) { clearInterval(iv); toast('Time is up. Your exam was submitted.'); submitExam(aid).then(() => go('#/review/' + aid)); }
  };
  const iv = setInterval(tick, 1000); onLeave(() => clearInterval(iv));
}
function refreshExam(focusSel) {
  const db = loadDb(), at = db.attempts.find(a => a.id === S.ex.aid); if (!at) return;
  $('#exq').innerHTML = exQuestionHtml(db, at); $('#exnav').innerHTML = exNavHtml(at);
  if (focusSel === 'opt') { const b = $('#exq .opt.sel'); if (b) try { b.focus(); } catch (e) { } }
  else if (focusSel === 'head') { const h = $('#exqh'); if (h) try { h.focus(); } catch (e) { } }
}
const exAttempt = () => loadDb().attempts.find(a => a.id === S.ex.aid);
actions.exsel = el => { const at = exAttempt(); at.answers[at.qids[S.ex.i]] = el.dataset.l; saveExamAnswer(at.id, at.qids[S.ex.i], el.dataset.l); refreshExam('opt'); };
actions.exclear = () => { const at = exAttempt(); delete at.answers[at.qids[S.ex.i]]; saveExamAnswer(at.id, at.qids[S.ex.i], null); refreshExam('head'); };
actions.exflag = () => { const at = exAttempt(); at.flags[at.qids[S.ex.i]] = !at.flags[at.qids[S.ex.i]]; if (!at.flags[at.qids[S.ex.i]]) delete at.flags[at.qids[S.ex.i]]; toggleFlag(at.id, at.qids[S.ex.i]); refreshExam(); };
actions.exgo = el => { S.ex.i = +el.dataset.i; refreshExam('head'); };
actions.exprev = () => { if (S.ex.i > 0) { S.ex.i--; refreshExam('head'); } };
actions.exnext = () => { const at = exAttempt(); if (S.ex.i < at.qids.length - 1) { S.ex.i++; refreshExam('head'); } };
actions.exsubmit = async () => {
  const at = exAttempt(), un = at.qids.filter(id => !at.answers[id]).length, fl = at.qids.filter(id => at.flags[id]).length;
  const ok = await confirmBox({ title: 'Submit your exam?', body: `<p>You have answered <b>${at.qids.length - un} of ${at.qids.length}</b> questions.${un ? ` <b>${plural(un, 'question')}</b> will be marked wrong.` : ''}${fl ? ` ${plural(fl, 'question')} still flagged.` : ''} You cannot change your answers after you submit.</p>`, ok: 'Submit exam', cancel: 'Keep working' });
  if (!ok) return;
  await submitExam(at.id); go('#/review/' + at.id);
};