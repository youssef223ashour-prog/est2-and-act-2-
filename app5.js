'use strict';


/* ---------- Review (student + teacher) ---------- */
function reviewListHtml(db, at) {
  const f = S.ui.rv || 'all';
  const items = at.qids.map((qid, i) => ({ qid, i, r: at.results[qid], q: db.questions.find(x => x.id === qid) })).filter(x => x.r || !x.q);
  const shown = items.filter(x => f === 'all' || (f === 'wrong' && x.r && !x.r.correct && x.r.chosen) || (f === 'skipped' && x.r && !x.r.chosen));
  if (!shown.length) return `<div class="panel">${emptyState('Nothing to show', 'No questions match this filter.')}</div>`;
  return shown.map(({ i, r, q }) => {
    if (!q) return `<div class="q mt"><h3>Question ${i + 1}</h3><p class="muted mt-s">This question was removed from the bank.</p></div>`;
    const badge = !r.chosen ? '<span class="badge b-warn">Skipped</span>' : r.correct ? '<span class="badge b-ok">Correct</span>' : '<span class="badge b-bad">Incorrect</span>';
    return `<div class="q mt"><div class="row between wrapr" style="margin-bottom:12px"><h3>Question ${i + 1}</h3>${badge}</div>${questionHtml(q, { reveal: true, chosen: r.chosen, locked: true })}${explainHtml(q, null)}</div>`;
  }).join('');
}
function viewReview(u, aid) {
  const db = loadDb(), at = db.attempts.find(a => a.id === aid);
  const admin = u.role === 'admin';
  if (!at || (!admin && at.userId !== u.id)) return go(admin ? '#/a/students' : '#/results');
  if (at.status !== 'submitted') return go(at.kind === 'exam' && !admin ? '#/exam/' + aid : '#/results');
  const owner = userById(db, at.userId), p = scoreOf(at) || 0, wrong = Object.values(at.results).filter(r => r.chosen && !r.correct).length, skipped = Object.values(at.results).filter(r => !r.chosen).length;
  S.ui.rv = 'all';
  draw(`<a class="btn btn-ghost btn-sm" href="${admin ? '#/a/students' : '#/results'}" style="margin-left:-10px">${icon('left')}${admin ? 'Students' : 'Results'}</a>
<div class="pagehead mt-s"><div><h1>${esc(at.title)}</h1><p class="muted">${admin && owner ? esc(owner.name) + ' · ' : ''}${kindLabel(at.kind)} · ${fmtDateTime(at.submittedAt)}${at.timedOut ? ' · submitted when time ran out' : ''}</p></div></div>
<div class="ledger three" style="grid-template-columns:repeat(3,1fr)"><div><div class="n">${p}%</div><div class="l">Score</div></div><div><div class="n">${at.score}/${at.total}</div><div class="l">Correct</div></div><div><div class="n">${at.kind === 'exam' ? mmss(at.submittedAt - at.startedAt) : wrong}</div><div class="l">${at.kind === 'exam' ? 'Time taken' : 'Incorrect'}</div></div></div>
<div class="toolbar mt-l" role="group" aria-label="Filter questions"><div class="seg">${[['all', 'All ' + at.total], ['wrong', 'Incorrect ' + wrong], ['skipped', 'Skipped ' + skipped]].map(([v, l]) => `<button data-act="rvf" data-v="${v}" aria-pressed="${v === 'all'}">${l}</button>`).join('')}</div>${!admin && wrong + skipped ? '<a class="btn btn-line btn-sm" href="#/mistakes">Clear these in Mistakes</a>' : ''}</div>
<div id="rvlist">${reviewListHtml(db, at)}</div>`, 'Review', admin ? 'a/students' : (at.kind === 'exam' ? 'exams' : 'results'));
  S.ui.rvAid = aid;
}
actions.rvf = el => {
  S.ui.rv = el.dataset.v; $$('[data-act="rvf"]').forEach(b => b.setAttribute('aria-pressed', b === el));
  const db = loadDb(), at = db.attempts.find(a => a.id === S.ui.rvAid); $('#rvlist').innerHTML = reviewListHtml(db, at);
};

/* ---------- Results ---------- */
function resultsListHtml(u) {
  const db = loadDb(), f = S.ui.rs || 'all';
  const list = db.attempts.filter(a => a.userId === u.id && a.status === 'submitted' && (f === 'all' || (f === 'exam') === (a.kind === 'exam'))).sort((a, b) => b.submittedAt - a.submittedAt);
  if (!list.length) return emptyState('Nothing here yet', f === 'exam' ? 'You have not finished an exam.' : 'Finish a practice set or an exam and it will be listed here.');
  return `<div class="scroll"><table class="tbl rsp"><thead><tr><th>Date</th><th>Title</th><th>Type</th><th class="num">Score</th><th></th></tr></thead><tbody>${list.map(a => `<tr><td data-l="Date">${fmtDate(a.submittedAt)}</td><td>${esc(a.title)}</td><td data-l="Type"><span class="badge ${a.kind === 'exam' ? 'b-core' : 'b-mute'}">${kindLabel(a.kind)}</span></td><td class="num"><span class="mini" aria-hidden="true"><i style="width:${scoreOf(a)}%"></i></span> <b>${scoreOf(a)}%</b> <span class="muted xs">${a.score}/${a.total}</span></td><td class="acts"><a class="btn btn-line btn-sm" href="#/review/${a.id}">Review</a></td></tr>`).join('')}</tbody></table></div>`;
}
function viewResults(u) {
  const db = loadDb(); S.ui.rs = 'all';
  const all = db.attempts.filter(a => a.userId === u.id && a.status === 'submitted').sort((a, b) => a.submittedAt - b.submittedAt).slice(-12);
  draw(`<div class="pagehead"><div><h1>Results</h1><p class="muted">Every exam and practice set you have finished.</p></div></div>
${all.length > 1 ? `<div class="panel"><h2 style="margin-bottom:10px">Your last ${all.length} scores</h2>${barChart(all.map(a => ({ v: scoreOf(a) || 0, label: new Date(a.submittedAt).getDate() + '/' + (new Date(a.submittedAt).getMonth() + 1), title: a.title + ': ' + scoreOf(a) + '%' })), { max: 100, every: 1, label: 'Scores of your last ' + all.length + ' attempts' })}</div>` : ''}
<div class="toolbar mt-l"><div class="seg" role="group" aria-label="Filter results">${[['all', 'All'], ['exam', 'Exams'], ['practice', 'Practice']].map(([v, l]) => `<button data-act="rsf" data-v="${v}" aria-pressed="${v === 'all'}">${l}</button>`).join('')}</div></div>
<div class="panel tight" id="rslist">${resultsListHtml(u)}</div>`, 'Results', 'results');
}
actions.rsf = el => { S.ui.rs = el.dataset.v; $$('[data-act="rsf"]').forEach(b => b.setAttribute('aria-pressed', b === el)); $('#rslist').innerHTML = resultsListHtml(currentUser()); };

/* ---------- Mistakes ---------- */
function mistakeItems(db, u) {
  const qm = Object.fromEntries(db.questions.map(q => [q.id, q])), f = S.ui.mf;
  return db.mistakes.filter(m => m.userId === u.id && qm[m.qid]).map(m => ({ m, q: qm[m.qid] }))
    .filter(x => (f.status === 'all' || (f.status === 'open') === !x.m.resolved) && (!f.chapter || x.q.chapter === f.chapter))
    .sort((a, b) => b.m.lastAt - a.m.lastAt);
}
function mistakeListHtml(u) {
  const db = loadDb(), items = mistakeItems(db, u), f = S.ui.mf;
  if (!items.length) return emptyState(f.status === 'open' ? 'No open mistakes' : 'Nothing here', f.status === 'open' ? 'Every question you missed has been resolved. Keep practising to find new gaps.' : 'No mistakes match this filter.', '<a class="btn btn-primary" href="#/practice">Practise</a>');
  return items.map(({ m, q }) => `<details class="mist"><summary><div><div class="strong">${esc(trunc(qTitle(q), 130))}</div><div class="row gap-s wrapr mt-s"><span class="badge b-mute">${esc(q.chapter)}</span>${tierBadge(q.tier)}<span class="xs muted">Missed ${m.wrongCount}× · last ${ago(m.lastAt)}</span></div></div>${m.resolved ? '<span class="badge b-ok">Resolved</span>' : '<span class="badge b-warn">Open</span>'}</summary>
<div class="body">${questionHtml(q, { meta: false, chosen: m.lastChosen, wrongOnly: true, locked: true })}
<div id="exp-${esc(m.id)}" class="hide">${explainHtml(q, null).replace('Explanation</b>', 'Correct answer: ' + q.answer + '</b>')}</div>
<div class="row gap-s wrapr mt"><button class="btn btn-primary btn-sm" data-act="mretry" data-q="${q.id}">${icon('retry')}${m.resolved ? 'Retry again' : 'Retry this question'}</button><button class="btn btn-line btn-sm" data-act="mexp" data-id="${esc(m.id)}">Show explanation</button>${m.resolved ? `<span class="xs muted">Resolved ${fmtDate(m.resolvedAt)}</span>` : ''}</div>
<div class="field mt" style="max-width:340px"><label class="lbl" for="rs-${q.id}">Why did you miss it?</label><select class="sel" id="rs-${q.id}" data-change="mreason" data-q="${q.id}"><option value="">Choose a reason</option>${Object.entries(REASONS).map(([k, v]) => `<option value="${k}" ${m.reason === k ? 'selected' : ''}>${esc(v)}</option>`).join('')}</select></div></div></details>`).join('');
}
function viewMistakes(u) {
  const db = loadDb(); S.ui.mf = S.ui.mf || { status: 'open', chapter: '' };
  const st = userStats(db, u.id), f = S.ui.mf, chapters = [...new Set(db.mistakes.filter(m => m.userId === u.id).map(m => (db.questions.find(q => q.id === m.qid) || {}).chapter).filter(Boolean))];
  const total = sum(db.mistakes.filter(m => m.userId === u.id).map(m => m.wrongCount));
  draw(`<div class="pagehead"><div><h1>Mistake history</h1><p class="muted">Every question you have missed. Retry a question and get it right to resolve it.</p></div><button class="btn btn-primary" data-act="mretryall" ${st.openMistakes ? '' : 'disabled'}>${icon('retry')}Retry open mistakes</button></div>
<div class="ledger three" style="grid-template-columns:repeat(3,1fr)"><div><div class="n">${st.openMistakes}</div><div class="l">Open</div></div><div><div class="n">${st.resolved}</div><div class="l">Resolved</div></div><div><div class="n">${total}</div><div class="l">Times missed in total</div></div></div>
<div class="toolbar mt-l"><div class="seg" role="group" aria-label="Status">${[['open', 'Open'], ['resolved', 'Resolved'], ['all', 'All']].map(([v, l]) => `<button data-act="mfs" data-v="${v}" aria-pressed="${f.status === v}">${l}</button>`).join('')}</div>
<select class="sel" data-change="mfc" aria-label="Filter by chapter"><option value="">All chapters</option>${chapters.map(c => `<option ${f.chapter === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></div>
<div class="panel tight" id="mlist">${mistakeListHtml(u)}</div>`, 'Mistakes', 'mistakes');
}
actions.mfs = el => { S.ui.mf.status = el.dataset.v; $$('[data-act="mfs"]').forEach(b => b.setAttribute('aria-pressed', b === el)); $('#mlist').innerHTML = mistakeListHtml(currentUser()); };
changes.mfc = el => { S.ui.mf.chapter = el.value; $('#mlist').innerHTML = mistakeListHtml(currentUser()); };
actions.mexp = el => { const box = document.getElementById('exp-' + el.dataset.id); if (box) { const h = box.classList.toggle('hide'); el.textContent = h ? 'Show explanation' : 'Hide explanation'; } };
changes.mreason = el => { setMistakeReason(currentUser().id, el.dataset.q, el.value); toast('Saved'); };
function startRetry(qids) {
  S.run = { kind: 'retry', title: 'Retry mistakes', qids, i: 0, sel: null, answered: {}, aid: null, done: false };
  go('#/run');
}
actions.mretry = el => startRetry([el.dataset.q]);
actions.mretryall = () => {
  const db = loadDb(), u = currentUser(), qm = Object.fromEntries(db.questions.map(q => [q.id, q])), f = S.ui.mf || {};
  const ids = db.mistakes.filter(m => m.userId === u.id && !m.resolved && qm[m.qid] && (!f.chapter || qm[m.qid].chapter === f.chapter)).map(m => m.qid);
  if (!ids.length) return toast('No open mistakes to retry.');
  startRetry(shuffle(ids).slice(0, 20));
};

/* ---------- Annotations (per-chapter lesson materials: a file, a link, or both) ---------- */
function materialTilesHtml(db) {
  return `<div class="rings">${db.chapters.map(c => {
    const m = db.materials[c] || {}, has = !!(m.url || m.file_path);
    return has
      ? `<button type="button" class="ringcell" data-act="matopen" data-c="${esc(c)}" aria-label="${esc(c)}, view lesson material"><span class="ring high">${icon('note')}</span><span class="rname" title="${esc(c)}">${esc(c)}</span><span class="rsub">View</span></button>`
      : `<div class="ringcell" role="group" aria-label="${esc(c)}, no material yet"><span class="ring low">${icon('note')}</span><span class="rname" title="${esc(c)}">${esc(c)}</span><span class="rsub">Not available yet</span></div>`;
  }).join('')}</div>`;
}
function viewAnnotations(u) {
  const db = loadDb();
  draw(`<div class="pagehead"><div><h1>Annotations</h1><p class="muted">Lesson materials Mr Youssef adds for each chapter. Pick a chapter to view a file, a link, or both.</p></div></div>
${db.chapters.length ? materialTilesHtml(db) : `<div class="panel">${emptyState('No chapters yet', 'Chapters will appear here once Mr Youssef adds them.')}</div>`}`, 'Annotations', 'notes');
}
actions.matopen = el => {
  const db = loadDb(), c = el.dataset.c, m = db.materials[c] || {}, fileUrl = materialUrlFor(m.file_path);
  openModal(`<div class="row between"><h3>${esc(c)}</h3><button class="iconbtn" data-act="close" aria-label="Close">${icon('x')}</button></div>
<div style="display:grid;gap:10px;margin-top:12px">
${fileUrl ? `<a class="btn btn-primary" href="${esc(fileUrl)}" target="_blank" rel="noopener noreferrer">${icon('upload', 'ic-s')}Download ${esc(m.file_name || 'file')}</a>` : ''}
${m.url ? `<a class="btn btn-line" href="${esc(m.url)}" target="_blank" rel="noopener noreferrer">Open link</a>` : ''}
</div>`, { label: 'Lesson material: ' + c });
};

/* ---------- Recorded sessions (per-chapter external links) ---------- */
function recordingTilesHtml(db) {
  return `<div class="rings">${db.chapters.map(c => {
    const url = db.recordings[c];
    return url
      ? `<a class="ringcell" href="${esc(url)}" target="_blank" rel="noopener noreferrer" aria-label="${esc(c)}, watch the recorded session (opens in a new tab)"><span class="ring high">${icon('recordings')}</span><span class="rname" title="${esc(c)}">${esc(c)}</span><span class="rsub">Watch now</span></a>`
      : `<div class="ringcell" role="group" aria-label="${esc(c)}, no recording yet"><span class="ring low">${icon('recordings')}</span><span class="rname" title="${esc(c)}">${esc(c)}</span><span class="rsub">Not available yet</span></div>`;
  }).join('')}</div>`;
}
function viewRecordings(u) {
  const db = loadDb();
  draw(`<div class="pagehead"><div><h1>Recorded Sessions</h1><p class="muted">Pick a chapter to watch its recorded session. Links open in a new tab.</p></div></div>
${db.chapters.length ? recordingTilesHtml(db) : `<div class="panel">${emptyState('No chapters yet', 'Chapters will appear here once Mr Youssef adds them.')}</div>`}`, 'Recorded Sessions', 'recordings');
}

/* =====================================================================
   Section 6a: teacher dashboard — overview + students
   ===================================================================== */
function updateBadge() {
  const n = students(loadDb()).filter(s => s.status === 'pending').length, tab = $('.tab[href="#/a/students"]'); if (!tab) return;
  let c = tab.querySelector('.count');
  if (n) { if (!c) { c = document.createElement('span'); c.className = 'count'; tab.appendChild(c); } c.textContent = n; c.setAttribute('aria-label', n + ' waiting for approval'); } else if (c) c.remove();
}
const trendHtml = t => t == null ? '<span class="muted">—</span>' : t > 0 ? `<span class="up">▲ +${t}</span>` : t < 0 ? `<span class="down">▼ ${t}</span>` : '<span class="muted">0</span>';

/* ---------- Overview ---------- */
const OV_SORTS = { last: 'Recent activity', name: 'Name', avg: 'Lowest exam average', open: 'Most open mistakes' };
function overviewTableHtml() {
  const db = loadDb(), rows = students(db).filter(s => s.status === 'approved').map(s => ({ s, st: userStats(db, s.id) }));
  const k = S.ui.ov || 'last';
  rows.sort((a, b) => k === 'name' ? a.s.name.localeCompare(b.s.name) : k === 'avg' ? (a.st.avgExam == null) - (b.st.avgExam == null) || a.st.avgExam - b.st.avgExam : k === 'open' ? b.st.openMistakes - a.st.openMistakes : (b.st.lastActive || 0) - (a.st.lastActive || 0));
  if (!rows.length) return emptyState('No approved students yet', 'Approved students and their progress will be listed here.', '<a class="btn btn-primary" href="#/a/students">Go to students</a>');
  return `<div class="scroll"><table class="tbl rsp"><thead><tr><th>Student</th><th class="num">Exams</th><th>Exam average</th><th class="num">Accuracy</th><th class="num">Open mistakes</th><th>Last active</th><th>Trend</th></tr></thead><tbody>${rows.map(({ s, st }) => `<tr><td><button class="namecell" data-act="stopen" data-id="${s.id}">${avatar(s.name, 'sm')}<span><b>${esc(s.name)}</b><span class="xs muted">Grade ${esc(s.grade)}</span></span></button></td><td class="num" data-l="Exams">${st.exams}</td><td data-l="Exam average">${st.avgExam == null ? '<span class="muted">—</span>' : `<span class="mini" aria-hidden="true"><i style="width:${st.avgExam}%"></i></span> <b>${st.avgExam}%</b>`}</td><td class="num" data-l="Accuracy">${fmtPct(st.accuracy)}</td><td class="num" data-l="Open mistakes">${st.openMistakes}</td><td data-l="Last active">${ago(st.lastActive)}</td><td data-l="Trend">${trendHtml(st.trend)}</td></tr>`).join('')}</tbody></table></div>`;
}
function viewOverview(u) {
  const db = loadDb(), studs = students(db), pending = studs.filter(s => s.status === 'pending'), approved = studs.filter(s => s.status === 'approved');
  const exScores = db.attempts.filter(a => a.status === 'submitted' && a.kind === 'exam').map(a => scoreOf(a) || 0);
  const week = sum(db.attempts.filter(a => a.status === 'submitted' && a.submittedAt >= now() - 7 * DAY).map(a => Object.keys(a.results).length));
  const ch = chapterStats(db, null).filter(c => c.answered >= 3).slice(0, 8), hard = hardestQuestions(db, 5);
  const empty = !db.demo && !db.questions.length && !studs.length;
  draw(`<div class="pagehead"><div><h1>Overview</h1><p class="muted">How your students are doing across exams and practice.</p></div><div class="row gap-s wrapr"><button class="btn btn-line" data-act="materials">${icon('note')}Annotations</button><button class="btn btn-line" data-act="recordings">${icon('recordings')}Recorded sessions</button></div></div>
${pending.length ? `<div class="notice warn row between wrapr" style="margin-bottom:20px"><span><b>${plural(pending.length, 'student')}</b> ${pending.length === 1 ? 'is' : 'are'} waiting for access.</span><a class="btn btn-primary btn-sm" href="#/a/students?s=pending">Review requests</a></div>` : ''}
${db.demo ? `<div class="notice row between wrapr" style="margin-bottom:20px"><span><b>Demo data is on.</b> Sample questions, one exam and demo students are loaded so you can explore. To see the student side, sign in as <b>${DEMO_LOGIN.username}</b> with password <b>${DEMO_LOGIN.password}</b>.</span><button class="btn btn-line btn-sm" data-act="demooff">Remove demo data</button></div>` : ''}
${empty ? `<div class="notice row between wrapr" style="margin-bottom:20px"><span><b>Your site is empty.</b> Load sample content to explore every page, or start with your own first question.</span><span class="row gap-s"><button class="btn btn-line btn-sm" data-act="demoon">Load demo data</button><a class="btn btn-primary btn-sm" href="#/a/q/new">Add a question</a></span></div>` : ''}
<div class="ledger"><div><div class="n">${approved.length}</div><div class="l">Active students</div></div><div><div class="n">${pending.length}</div><div class="l">Waiting for approval</div></div><div><div class="n">${exScores.length ? Math.round(avg(exScores)) + '%' : '—'}</div><div class="l">Average exam score</div></div><div><div class="n">${week}</div><div class="l">Questions answered this week</div></div></div>
<div class="split sec"><section><div class="sechead"><h2>Activity, last 14 days</h2></div><div class="panel">${activityChart(dailyActivity(db, 14))}</div></section>
<section><div class="sechead"><h2>Weakest chapters</h2></div><div class="panel">${ch.length ? ringsGrid(ch, { sm: true }) : emptyState('Not enough data yet', 'Chapter accuracy appears once students have answered a few questions.')}</div></section></div>
<section class="sec"><div class="sechead"><h2>Student progress</h2><label class="row gap-s small"><span class="muted">Sort by</span><select class="sel" style="width:auto;min-height:38px" data-change="ovsort" aria-label="Sort students">${Object.entries(OV_SORTS).map(([k, v]) => `<option value="${k}" ${(S.ui.ov || 'last') === k ? 'selected' : ''}>${v}</option>`).join('')}</select></label></div><div class="panel tight" id="ovtable">${overviewTableHtml()}</div></section>
${hard.length ? `<section class="sec"><div class="sechead"><h2>Most-missed questions</h2></div><div class="panel"><div class="list">${hard.map(h => `<div class="li wrapr"><div class="grow" style="min-width:220px"><div>${esc(trunc(qTitle(h.q), 150))}</div><div class="xs muted mt-s">${esc(h.q.chapter)} · ${levelName(h.q.tier)}</div></div><div class="strong">${h.missPct}% missed <span class="muted xs" style="font-weight:500">of ${h.seen}</span></div><a class="btn btn-line btn-sm" href="#/a/q/${h.q.id}">Edit</a></div>`).join('')}</div></div></section>` : ''}`, 'Overview', 'a/overview');
}
changes.ovsort = el => { S.ui.ov = el.value; $('#ovtable').innerHTML = overviewTableHtml(); };
actions.demoon = async el => { setBusy(el, true, 'Loading…'); await seedDemo(); toast('Demo data loaded'); route(); };
actions.demooff = async el => {
  const ok = await confirmBox({ title: 'Remove demo data?', body: '<p>This deletes the sample questions, the sample exam and every demo student with their results. Anything you added yourself stays.</p>', ok: 'Remove demo data', danger: true });
  if (ok) { clearDemo(); toast('Demo data removed'); route(); }
};

/* ---------- Students ---------- */
function studentFilter() {
  const db = loadDb(), f = S.ui.sf, q = f.q.trim().toLowerCase();
  return students(db).filter(s => (f.status === 'all' || s.status === f.status) && (!f.grade || s.grade === f.grade) &&
    (!q || s.name.toLowerCase().includes(q) || s.username.includes(q) || (s.email && s.email.toLowerCase().includes(q)) || canonPhone(s.phone).includes(canonPhone(q) || '#') || canonPhone(s.parentPhone).includes(canonPhone(q) || '#')))
    .sort((a, b) => b.createdAt - a.createdAt);
}
function studentSegHtml() {
  const all = students(loadDb()), f = S.ui.sf, c = s => all.filter(x => x.status === s).length;
  return `<div class="seg" role="group" aria-label="Filter by status">${[['pending', 'Waiting', c('pending')], ['approved', 'Approved', c('approved')], ['rejected', 'Not approved', c('rejected')], ['all', 'All', all.length]].map(([v, l, n]) => `<button data-act="sfs" data-v="${v}" aria-pressed="${f.status === v}">${l} ${n}</button>`).join('')}</div>`;
}
function studentListHtml() {
  const list = studentFilter(), f = S.ui.sf;
  if (!list.length) return emptyState(f.status === 'pending' ? 'No requests waiting' : 'No students found', f.status === 'pending' ? 'New access requests appear here as soon as students register.' : 'Try a different filter or search.');
  return `<div class="scroll"><table class="tbl rsp"><thead><tr><th>Student</th><th>Grade</th><th>Phone</th><th>Parent’s phone</th><th>Requested</th><th>Status</th><th></th></tr></thead><tbody>${list.map(s => `<tr><td><button class="namecell" data-act="stopen" data-id="${s.id}">${avatar(s.name, 'sm')}<span><b>${esc(s.name)}</b><span class="xs muted">@${esc(s.username)}</span></span></button></td><td data-l="Grade">${esc(s.grade)}</td><td data-l="Phone">${esc(s.phone)}</td><td data-l="Parent’s phone">${esc(s.parentPhone)}</td><td data-l="Requested">${fmtDate(s.createdAt)}</td><td data-l="Status">${statusBadge(s.status)}${s.frozen ? ' <span class="badge b-bad">Frozen</span>' : ''}</td>
<td class="acts">${s.status === 'pending' ? `<button class="btn btn-ok btn-sm" data-act="stapprove" data-id="${s.id}">${icon('check', 'ic-s')}Approve</button><button class="btn btn-danger btn-sm" data-act="streject" data-id="${s.id}">${icon('x', 'ic-s')}Reject</button>` : s.status === 'rejected' ? `<button class="btn btn-ok btn-sm" data-act="stapprove" data-id="${s.id}">Approve</button>` : ''}<button class="btn btn-line btn-sm" data-act="stopen" data-id="${s.id}">Details</button></td></tr>`).join('')}</tbody></table></div>`;
}
function refreshStudents() {
  const seg = $('#stseg'); if (seg) seg.innerHTML = studentSegHtml();
  const l = $('#stlist'); if (l) l.innerHTML = studentListHtml();
  const n = students(loadDb()).filter(s => s.status === 'pending').length, b = $('#stall'); if (b) b.innerHTML = n > 1 ? `<button class="btn btn-ok" data-act="stapproveall">${icon('check')}Approve all ${n} waiting</button>` : '';
  updateBadge();
}
function viewStudents(u) {
  const db = loadDb(); const pend = students(db).filter(s => s.status === 'pending').length;
  const want = S.params.get('s'); S.ui.sf = S.ui.sf || { status: pend ? 'pending' : 'approved', q: '', grade: '' };
  if (want && ['pending', 'approved', 'rejected', 'all'].includes(want)) S.ui.sf.status = want;
  draw(`<div class="pagehead"><div><h1>Students</h1><p class="muted">Approve or reject access requests, and open a student to see their details and progress.</p></div><div id="stall"></div></div>
<div class="toolbar"><div id="stseg"></div><div class="searchbox" data-input="stq">${icon('search')}<input class="inp" type="search" placeholder="Search name, username, email or phone" aria-label="Search students" value="${esc(S.ui.sf.q)}"></div>
<select class="sel" data-change="stgrade" aria-label="Filter by grade"><option value="">All grades</option>${GRADES.map(g => `<option value="${g}" ${S.ui.sf.grade === g ? 'selected' : ''}>Grade ${g}</option>`).join('')}</select></div>
<div class="panel tight" id="stlist"></div>`, 'Students', 'a/students');
  refreshStudents();
}
actions.sfs = el => { S.ui.sf.status = el.dataset.v; refreshStudents(); };
inputs.stq = el => { S.ui.sf.q = $('input', el).value; $('#stlist').innerHTML = studentListHtml(); };
changes.stgrade = el => { S.ui.sf.grade = el.value; $('#stlist').innerHTML = studentListHtml(); };
function afterDecision(id) { if ($('.drawer')) openStudent(id); refreshStudents(); }
actions.stapprove = async el => { const id = el.dataset.id; await setStatus(id, 'approved'); toast('Student approved'); afterDecision(id); };
actions.streject = async el => { const id = el.dataset.id; await setStatus(id, 'rejected'); toast('Request rejected'); afterDecision(id); };
actions.strevoke = async el => {
  const s = userById(loadDb(), el.dataset.id);
  const ok = await confirmBox({ title: 'Revoke access?', body: `<p>${esc(s.name)} will no longer be able to sign in. Their results are kept, and you can approve them again later.</p>`, ok: 'Revoke access', danger: true });
  if (ok) { await setStatus(s.id, 'rejected'); toast('Access revoked'); afterDecision(s.id); }
};
actions.stapproveall = async () => {
  const p = students(loadDb()).filter(s => s.status === 'pending');
  const ok = await confirmBox({ title: `Approve ${p.length} students?`, body: '<p>Everyone waiting will be able to sign in right away.</p>', ok: 'Approve all' });
  if (ok) { await Promise.all(p.map(s => setStatus(s.id, 'approved'))); toast(plural(p.length, 'student') + ' approved'); refreshStudents(); }
};
actions.stdelete = async el => {
  const s = userById(loadDb(), el.dataset.id);
  const ok = await confirmBox({ title: 'Delete this student?', body: `<p>This permanently deletes ${esc(s.name)} and all of their results and mistakes. It cannot be undone.</p>`, ok: 'Delete permanently', danger: true });
  if (ok) { await removeUser(s.id); closeModal(); toast('Student deleted'); refreshStudents(); }
};
forms.stpw = async f => {
  const d = formData(f), r = await adminSetPassword(f.dataset.id, d.pw);
  if (!r.ok) return showErrors(f, { pw: r.error });
  f.reset(); showErrors(f, {}); toast('Password changed. Tell the student their new password.');
};
actions.stfreeze = async el => {
  const s = userById(loadDb(), el.dataset.id);
  const ok = await confirmBox({ title: 'Freeze this account?', body: `<p>${esc(s.name)} will not be able to sign in until you unfreeze the account. Nothing is deleted — all of their results and progress are kept.</p>`, ok: 'Freeze account' });
  if (ok) { await setFrozen(s.id, true); toast('Account frozen'); afterDecision(s.id); }
};
actions.stunfreeze = async el => {
  const s = userById(loadDb(), el.dataset.id);
  await setFrozen(s.id, false); toast('Account unfrozen'); afterDecision(s.id);
};
actions.stresetdevice = async el => {
  const s = userById(loadDb(), el.dataset.id); if (!s) return;
  const ok = await confirmBox({ title: 'Reset device?', body: `<p>${esc(s.name)} will be able to sign in from a new device. Use this if they got a new phone, or if they were cut off for signing in somewhere else.</p>`, ok: 'Reset device' });
  if (!ok) return;
  const r = await resetStudentDevice(s.id);
  if (!r.ok) return toast(r.error || 'Could not reset device.', 'bad');
  toast('Device reset for ' + firstName(s.name) + '.');
};
function openStudent(id) {
  const db = loadDb(), s = userById(db, id); if (!s) return;
  const st = userStats(db, id), ch = chapterStats(db, id), rs = reasonCounts(db, id);
  const recent = db.attempts.filter(a => a.userId === id && a.status === 'submitted').sort((a, b) => b.submittedAt - a.submittedAt).slice(0, 6);
  const acts = s.status === 'pending' ? `<button class="btn btn-ok" data-act="stapprove" data-id="${id}">${icon('check')}Approve</button><button class="btn btn-danger" data-act="streject" data-id="${id}">${icon('x')}Reject</button>`
    : s.status === 'approved' ? `<button class="btn btn-line" data-act="strevoke" data-id="${id}">Revoke access</button>` : `<button class="btn btn-ok" data-act="stapprove" data-id="${id}">${icon('check')}Approve</button>`;
  const freezeBtn = s.status === 'approved' ? (s.frozen
    ? `<button class="btn btn-ok" data-act="stunfreeze" data-id="${id}">${icon('check')}Unfreeze account</button>`
    : `<button class="btn btn-line" data-act="stfreeze" data-id="${id}">${icon('lock')}Freeze account</button>`) : '';
  openModal(`<div class="row top between"><div class="row gap-l" style="align-items:center">${avatar(s.name, 'lg')}<div><h2 class="serif" style="font-size:26px;line-height:1.15">${esc(s.name)}</h2><p class="muted small">@${esc(s.username)} · Grade ${esc(s.grade)}</p><div class="mt-s">${statusBadge(s.status)}${s.frozen ? ' <span class="badge b-bad">Frozen</span>' : ''}</div></div></div><button class="iconbtn" data-act="close" aria-label="Close">${icon('x')}</button></div>
<div class="row gap-s wrapr mt">${acts}${freezeBtn}</div>
<h3 class="mt-l">Details</h3><dl class="kv mt-s"><dt>Username</dt><dd>${esc(s.username)}</dd><dt>Grade</dt><dd>Grade ${esc(s.grade)}</dd>${s.email ? `<dt>Email</dt><dd><a href="mailto:${esc(s.email)}">${esc(s.email)}</a></dd>` : ''}<dt>Student phone</dt><dd>${waAnchor(s.phone)}</dd><dt>Parent’s phone</dt><dd>${waAnchor(s.parentPhone)}</dd>${s.desiredScore != null ? `<dt>Desired score</dt><dd>${s.desiredScore}/800</dd>` : ''}${s.trial ? `<dt>Trial</dt><dd>${esc(s.trial)}</dd>` : ''}${s.firstTrial ? `<dt>First trial?</dt><dd>${s.firstTrial === 'yes' ? 'Yes' : 'No'}</dd>` : ''}${s.firstTrial === 'no' && s.previousScore != null ? `<dt>Previous score</dt><dd>${s.previousScore}/800</dd>` : ''}${s.heardAbout ? `<dt>Heard about us via</dt><dd>${esc(heardAboutLabel(s.heardAbout))}${s.heardAbout === 'other' && s.heardAboutOther ? ': ' + esc(s.heardAboutOther) : ''}</dd>` : ''}<dt>Registered on</dt><dd>${fmtDateTime(s.createdAt)}</dd>${s.decidedAt ? `<dt>Decision</dt><dd>${fmtDateTime(s.decidedAt)}</dd>` : ''}<dt>Last sign-in</dt><dd>${s.lastLogin ? fmtDateTime(s.lastLogin) : 'Never'}</dd></dl>
${st.attempts ? `<h3 class="mt-l">Progress</h3><div class="ledger mt-s" style="grid-template-columns:repeat(2,1fr)"><div><div class="n">${st.exams}</div><div class="l">Exams taken</div></div><div><div class="n">${st.avgExam == null ? '—' : st.avgExam + '%'}</div><div class="l">Exam average</div></div><div style="border-top:1px solid var(--line);border-left:0"><div class="n">${fmtPct(st.accuracy)}</div><div class="l">Overall accuracy</div></div><div style="border-top:1px solid var(--line)"><div class="n">${st.openMistakes}</div><div class="l">Open mistakes</div></div></div>
${ch.length ? `<h3 class="mt-l mb">Accuracy by chapter</h3>${ringsGrid(ch.slice(0, 6), { sm: true })}` : ''}
${Object.keys(rs).length ? `<h3 class="mt-l">Why they miss questions</h3><ul class="list mt-s" style="padding:0;list-style:none">${Object.entries(rs).sort((a, b) => b[1] - a[1]).map(([k, n]) => `<li class="li"><span class="grow">${esc(REASONS[k] || k)}</span><b>${n}</b></li>`).join('')}</ul>` : ''}
<h3 class="mt-l">Recent attempts</h3><ul class="list mt-s" style="padding:0;list-style:none">${recent.map(a => `<li class="li"><div class="grow"><div class="strong">${esc(a.title)}</div><div class="xs muted">${kindLabel(a.kind)} · ${ago(a.submittedAt)}</div></div><b>${scoreOf(a)}%</b><a class="btn btn-line btn-sm" href="#/review/${a.id}">Review</a></li>`).join('')}</ul>` : `<div class="notice mt-l">No exam or practice results yet.</div>`}
<h3 class="mt-l">Private notes</h3><p class="hint">Internal notes about ${esc(firstName(s.name))} — visible only to you here, not shown to the student.</p>
<form data-form="annoadd" data-id="${id}" class="mt-s" novalidate style="display:grid;gap:10px"><textarea class="txt" name="body" placeholder="Write a private note about today's session…" required></textarea><div><button class="btn btn-primary btn-sm" type="submit">Add note</button></div></form>
<div class="list mt-s" id="annolist-${id}">${studentAnnotationsHtml(id)}</div>
<details class="fold mt-l"><summary>Set a new password</summary><form data-form="stpw" data-id="${id}" class="mt-s" novalidate style="display:grid;gap:10px"><div class="field"><label class="lbl" for="stpw-in">New password</label><input class="inp" id="stpw-in" name="pw" type="text" autocomplete="off" placeholder="At least 8 characters"><div class="err" data-err="pw" aria-live="polite"></div></div><div><button class="btn btn-line btn-sm" type="submit">Change password</button></div><p class="hint">Use this if a student forgets their password, then send them the new one.</p></form></details>
<div class="mt-l"><button class="btn btn-line btn-sm" data-act="stresetdevice" data-id="${id}">${icon('retry', 'ic-s')}Reset device</button><p class="hint">Each account is locked to the first device it signs in on. Use this to let ${esc(firstName(s.name))} sign in again after getting a new phone, or after being cut off for signing in somewhere else.</p></div>
<div class="mt-l"><button class="btn btn-danger btn-sm" data-act="stdelete" data-id="${id}">${icon('trash', 'ic-s')}Delete this student</button><p class="hint">Permanently deletes this account and all of their results, mistakes and notes. It cannot be undone.</p></div>`, { drawer: true, label: 'Student details ' + s.name });
}