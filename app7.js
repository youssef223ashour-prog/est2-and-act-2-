'use strict';

inputs.bulktext = el => { S.ui.bulk.text = el.value; };
changes.bulkdef = el => { S.ui.bulk[el.name] = el.value; };
actions.bulkexample = () => { S.ui.bulk.text = BULK_EXAMPLE; $('#b-text').value = BULK_EXAMPLE; };
actions.bulkcheck = () => { const b = S.ui.bulk, db = loadDb(); S.ui.bulkRes = parseBulk(b.text, b.chapter, b.tier, db.chapters); $('#bulkres').innerHTML = bulkResultHtml(); };
actions.bulkimport = async () => {
  const ok = (S.ui.bulkRes || []).filter(x => x.q); if (!ok.length) return;
  const { data, error } = await sb.from('questions').insert(ok.map(x => toQuestionPayload(x.q))).select();
  if (error) return toast(friendlyDbError(error), 'bad');
  data.forEach(row => S.db.questions.push(fromQuestionRow(row, true)));
  toast(plural(ok.length, 'question') + ' added'); S.ui.bulk = null; S.ui.bulkRes = null; go('#/a/questions');
};

/* ---------- Exams (teacher) ---------- */
function examStats(db, e) {
  const at = db.attempts.filter(a => a.examId === e.id && a.status === 'submitted');
  return { n: at.length, who: new Set(at.map(a => a.userId)).size, avg: at.length ? Math.round(avg(at.map(a => scoreOf(a) || 0))) : null };
}
function viewAdminExams(u) {
  const db = loadDb(), list = db.exams.slice().sort((a, b) => b.createdAt - a.createdAt);
  draw(`<div class="pagehead"><div><h1>Exams</h1><p class="muted">Build exams from your question bank. Students only see exams that are published.</p></div><a class="btn btn-primary" href="#/a/e/new">${icon('plus')}Create exam</a></div>
<div class="panel tight">${list.length ? `<div class="scroll"><table class="tbl rsp"><thead><tr><th>Exam</th><th class="num">Questions</th><th class="num">Minutes</th><th>Attempts</th><th>Taken</th><th>Status</th><th></th></tr></thead><tbody>${list.map(e => { const s = examStats(db, e); return `<tr><td class="wrapc"><div class="strong">${esc(e.title)}</div><span class="badge b-core mt-s">${esc(e.type)}</span></td><td class="num" data-l="Questions">${e.qids.length}</td><td class="num" data-l="Minutes">${e.minutes}</td><td data-l="Attempts">${e.attempts === 0 ? 'Unlimited' : e.attempts + ' per student'}</td><td data-l="Taken">${s.n ? `${plural(s.n, 'attempt')}<div class="xs muted">${plural(s.who, 'student')} · avg ${s.avg}%</div>` : '<span class="muted">No attempts</span>'}</td><td data-l="Status">${e.status === 'published' ? '<span class="badge b-ok">Published</span>' : '<span class="badge b-mute">Draft</span>'}</td>
<td class="acts"><button class="btn ${e.status === 'published' ? 'btn-line' : 'btn-primary'} btn-sm" data-act="expub" data-id="${e.id}">${e.status === 'published' ? 'Unpublish' : 'Publish'}</button><button class="btn btn-line btn-sm" data-act="exres" data-id="${e.id}">Results</button><a class="btn btn-line btn-sm" href="#/a/e/${e.id}">Edit</a><button class="btn btn-line btn-sm" data-act="exdup" data-id="${e.id}" aria-label="Duplicate exam">${icon('copy', 'ic-s')}</button><button class="btn btn-danger btn-sm" data-act="exdel" data-id="${e.id}" aria-label="Delete exam">${icon('trash', 'ic-s')}</button></td></tr>`; }).join('')}</tbody></table></div>` : emptyState('No exams yet', 'Create an exam, pick its questions, then publish it for your students.', `<a class="btn btn-primary" href="#/a/e/new">Create exam</a>`)}</div>`, 'Exams', 'a/exams');
}
actions.expub = async el => {
  const db = loadDb(), e = db.exams.find(x => x.id === el.dataset.id);
  if (e.status !== 'published' && !e.qids.length) return toast('Add questions before publishing.', 'bad');
  const wasPublished = e.status === 'published';
  const id = await saveExam(Object.assign({}, e, { status: wasPublished ? 'draft' : 'published' }));
  if (!id) return;
  toast(wasPublished ? 'Exam unpublished' : 'Exam published'); viewAdminExams(currentUser());
};
actions.exdup = async el => { const e = JSON.parse(JSON.stringify(loadDb().exams.find(x => x.id === el.dataset.id))); delete e.id; delete e.demo; e.title += ' (copy)'; e.status = 'draft'; const id = await saveExam(e); if (!id) return; toast('Exam duplicated as a draft'); go('#/a/e/' + id); };
actions.exdel = async el => {
  const db = loadDb(), e = db.exams.find(x => x.id === el.dataset.id), s = examStats(db, e);
  const ok = await confirmBox({ title: 'Delete this exam?', body: `<p><b>${esc(e.title)}</b></p>${s.n ? `<p>Its ${plural(s.n, 'attempt')} and results will be deleted too.</p>` : ''}`, ok: 'Delete exam', danger: true });
  if (ok) { await deleteExam(e.id); toast('Exam deleted'); viewAdminExams(currentUser()); }
};
actions.exres = el => {
  const db = loadDb(), e = db.exams.find(x => x.id === el.dataset.id), at = db.attempts.filter(a => a.examId === e.id && a.status === 'submitted').sort((a, b) => b.submittedAt - a.submittedAt);
  const qm = Object.fromEntries(db.questions.map(q => [q.id, q])), agg = {};
  at.forEach(a => Object.keys(a.results).forEach(id => { const x = agg[id] || (agg[id] = { seen: 0, ok: 0 }); x.seen++; if (a.results[id].correct) x.ok++; }));
  const qs = Object.keys(agg).filter(id => qm[id]).map(id => ({ q: qm[id], p: pct(agg[id].ok, agg[id].seen), seen: agg[id].seen })).sort((a, b) => a.p - b.p);
  openModal(`<div class="row between"><h3>${esc(e.title)}: results</h3><button class="iconbtn" data-act="close" aria-label="Close">${icon('x')}</button></div>
${at.length ? `<div class="scroll"><table class="tbl" style="min-width:520px"><thead><tr><th>Student</th><th class="num">Score</th><th>Time taken</th><th>Submitted</th><th></th></tr></thead><tbody>${at.map(a => { const s = userById(db, a.userId); return `<tr><td>${s ? esc(s.name) : 'Deleted student'}</td><td class="num"><b>${scoreOf(a)}%</b> <span class="muted xs">${a.score}/${a.total}</span></td><td>${mmss(a.submittedAt - a.startedAt)}</td><td>${fmtDate(a.submittedAt)}</td><td class="acts"><a class="btn btn-line btn-sm" href="#/review/${a.id}">Review</a></td></tr>`; }).join('')}</tbody></table></div>
<h3 class="mt">Questions, hardest first</h3>${hbars(qs.slice(0, 8).map(x => ({ name: trunc(qTitle(x.q), 60), pct: x.p })))}` : emptyState('No attempts yet', 'Results appear here once students submit this exam.')}`, { wide: true, label: 'Exam results' });
};

/* ---------- Exam editor ---------- */
const blankExam = () => ({ id: null, title: '', description: '', type: 'Mixed', minutes: 30, attempts: 1, shuffle: false, status: 'draft', qids: [] });
function readExamFields(f) {
  const d = formData(f);
  return Object.assign({}, S.ui.ee, { title: (d.title || '').trim(), description: (d.description || '').trim(), type: d.type, minutes: parseInt(d.minutes, 10) || 0, attempts: parseInt(d.attempts, 10) || 0, shuffle: !!f.elements.shuffle.checked, status: d.status });
}
const qMeta = q => `${esc(q.chapter)} · ${levelName(q.tier)}${q.image || (q.optImg && Object.keys(q.optImg).length) ? ` · <span class="row gap-s" style="display:inline-flex;gap:4px;vertical-align:middle">${icon('image', 'ic-s')}Photo</span>` : ''}`;
function eeSelectedHtml() {
  const db = loadDb(), d = S.ui.ee, qs = d.qids.map(id => db.questions.find(q => q.id === id)).filter(Boolean);
  const n = l => qs.filter(q => q.tier === l).length;
  return `<div class="sechead"><h2>Selected questions</h2><span class="muted small">${plural(qs.length, 'question')} · ${n('EASY')} easy · ${n('MEDIUM')} medium · ${n('HARD')} hard</span></div>
${qs.length ? `<ol class="list" style="padding:0;list-style:none">${qs.map((q, i) => `<li class="li"><span class="badge b-mute" style="min-width:30px;justify-content:center">${i + 1}</span>${q.image ? `<span class="thumb">${imgTag(q.image, '')}</span>` : ''}<div class="grow"><div class="trunc" style="max-width:none;white-space:normal">${esc(trunc(qTitle(q), 110))}</div><div class="xs muted">${qMeta(q)}</div></div><div class="row" style="gap:2px"><button class="iconbtn" data-act="eeup" data-id="${q.id}" aria-label="Move up" ${i === 0 ? 'disabled' : ''}>${icon('up')}</button><button class="iconbtn" data-act="eedown" data-id="${q.id}" aria-label="Move down" ${i === qs.length - 1 ? 'disabled' : ''}>${icon('down')}</button><button class="iconbtn" data-act="eerem" data-id="${q.id}" aria-label="Remove question">${icon('x')}</button></div></li>`).join('')}</ol>` : '<p class="muted">Nothing selected yet. Add questions from the bank, use auto-pick, or create a new question.</p>'}`;
}
function eeBankHtml() {
  const db = loadDb(), f = S.ui.ebf, list = qFilter(db, f), sel = new Set(S.ui.ee.qids);
  return list.length ? `<div class="list" style="max-height:460px;overflow:auto">${list.map(q => `<div class="li">${q.image ? `<span class="thumb">${imgTag(q.image, '')}</span>` : ''}<div class="grow"><div class="small">${esc(trunc(qTitle(q), 100))}</div><div class="xs muted">${qMeta(q)}</div></div>${sel.has(q.id) ? `<button class="btn btn-line btn-sm" data-act="eerem" data-id="${q.id}">Added</button>` : `<button class="btn btn-primary btn-sm" data-act="eeadd" data-id="${q.id}">Add</button>`}</div>`).join('')}</div>` : emptyState('No questions match', db.questions.length ? 'Try a different filter.' : 'Add questions to the bank first.', db.questions.length ? '' : '<a class="btn btn-primary" href="#/a/q/new">Add a question</a>');
}
function eeRefresh() { $('#esel').innerHTML = eeSelectedHtml(); $('#ebank').innerHTML = eeBankHtml(); }
function eeAccessHtml() {
  const db = loadDb(), d = S.ui.ee;
  if (!d.id) return '<p class="muted small">Save the exam first, then come back here to choose which students can take it.</p>';
  const list = students(db).filter(s => s.status === 'approved');
  const granted = new Set(db.examAccessRows.filter(r => r.exam_id === d.id).map(r => r.user_id));
  return `<div class="row between wrapr"><span class="muted small">${granted.size} of ${list.length} approved students have access</span><span class="row gap-s"><button class="btn btn-line btn-sm" data-act="eeaccessall" data-id="${d.id}">Grant all</button><button class="btn btn-line btn-sm" data-act="eeaccessnone" data-id="${d.id}">Revoke all</button></span></div>
<div class="list mt-s" style="max-height:320px;overflow:auto">${list.length ? list.map(s => `<label class="li" style="cursor:pointer"><input type="checkbox" data-change="eeaccesstoggle" data-id="${d.id}" data-uid="${s.id}" ${granted.has(s.id) ? 'checked' : ''} style="margin-right:10px"><span class="grow">${esc(s.name)}</span><span class="xs muted">@${esc(s.username)}</span></label>`).join('') : emptyState('No approved students yet', 'Approve students on the Students page first.')}</div>`;
}
function viewEExam(u, id) {
  const db = loadDb(); let ex = null;
  if (id !== 'new') { ex = db.exams.find(e => e.id === id); if (!ex) return go('#/a/exams'); }
  if (!S.ui.ee || S.ui.eeKey !== id) { S.ui.ee = ex ? JSON.parse(JSON.stringify(ex)) : blankExam(); S.ui.eeKey = id; S.ui.ebf = { q: '', chapter: '', tier: '' }; }
  const d = S.ui.ee, taken = ex ? examStats(db, ex).n : 0;
  draw(`<a class="btn btn-ghost btn-sm" href="#/a/exams" style="margin-left:-10px">${icon('left')}Exams</a>
<div class="pagehead mt-s"><div><h1>${ex ? 'Edit exam' : 'Create an exam'}</h1><p class="muted">Set the rules, then choose the questions.</p></div></div>
${taken ? `<div class="notice warn" style="margin-bottom:16px">${plural(taken, 'attempt')} already exist. Changing the questions will not change past scores.</div>` : ''}
<form class="panel" id="eeform" data-form="eesave" data-input="eef" novalidate style="display:grid;gap:18px"><div class="formerr" data-err="form" role="alert"></div>
<div class="formgrid"><div class="field full"><label class="lbl" for="e-title">Exam title</label><input class="inp" id="e-title" name="title" value="${esc(d.title)}" placeholder="Mock exam 2: Genetics and evolution"><div class="err" data-err="title" aria-live="polite"></div></div>
<div class="field full"><label class="lbl" for="e-desc">Description <span class="opt-tag">Optional, shown to students</span></label><input class="inp" id="e-desc" name="description" value="${esc(d.description)}"></div>
<div class="field"><label class="lbl" for="e-type">Exam type</label><select class="sel" id="e-type" name="type">${EXAM_TYPES.map(t => `<option ${d.type === t ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
<div class="field"><label class="lbl" for="e-min">Time limit (minutes)</label><input class="inp" id="e-min" name="minutes" type="number" min="1" max="300" value="${d.minutes}"><div class="err" data-err="minutes" aria-live="polite"></div></div>
<div class="field"><label class="lbl" for="e-att">Attempts per student</label><select class="sel" id="e-att" name="attempts">${[[1, '1 attempt'], [2, '2 attempts'], [3, '3 attempts'], [0, 'Unlimited']].map(([v, l]) => `<option value="${v}" ${d.attempts === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
<div class="field"><label class="lbl" for="e-status">Status</label><select class="sel" id="e-status" name="status"><option value="draft" ${d.status === 'draft' ? 'selected' : ''}>Draft, hidden from students</option><option value="published" ${d.status === 'published' ? 'selected' : ''}>Published</option></select></div>
<label class="check full"><input type="checkbox" name="shuffle" ${d.shuffle ? 'checked' : ''}><span><b>Shuffle question order for each student</b><span class="hint" style="display:block">Answer options always stay in the order you wrote them.</span></span></label></div></form>
<div class="panel mt-l"><div class="sechead"><h2>Who can take this exam</h2></div><p class="muted small">Exams are locked by default. A student can only start this exam once you grant them access here.</p><div class="mt-s" id="eeaccess">${eeAccessHtml()}</div></div>
<div class="split even mt-l"><section class="panel" id="esel">${eeSelectedHtml()}</section>
<section class="panel"><div class="sechead"><h2>Question bank</h2><a class="btn btn-primary btn-sm" href="#/a/q/new?from=${encodeURIComponent('e/' + (d.id || 'new'))}">${icon('plus', 'ic-s')}New question</a></div>
<div class="toolbar" data-input="ebf" style="margin-bottom:10px"><div class="searchbox">${icon('search')}<input class="inp" name="q" type="search" placeholder="Search" aria-label="Search the bank"></div><select class="sel" name="chapter" aria-label="Chapter"><option value="">All chapters</option>${db.chapters.map(c => `<option>${esc(c)}</option>`).join('')}</select><select class="sel" name="tier" aria-label="Difficulty">${levelOpts('', 'All difficulties')}</select></div>
<div class="row gap-s wrapr" style="margin-bottom:10px"><button class="btn btn-line btn-sm" data-act="eeaddall">Add all shown</button><span class="row gap-s"><input class="inp" id="ee-n" type="number" min="1" max="200" value="10" style="width:76px;min-height:36px" aria-label="How many random questions"><button class="btn btn-line btn-sm" data-act="eeauto">Auto-pick random</button></span></div>
<div id="ebank">${eeBankHtml()}</div></section></div>
<div class="row gap-s wrapr mt-l"><button class="btn btn-primary" data-act="eesubmit">Save exam</button><a class="btn btn-ghost" href="#/a/exams">Cancel</a></div>`, ex ? 'Edit exam' : 'Create exam', 'a/exams');
}
inputs.eef = f => { S.ui.ee = readExamFields(f); };
inputs.ebf = el => { const d = {}; $$('[name]', el).forEach(x => { d[x.name] = x.value; }); S.ui.ebf = d; $('#ebank').innerHTML = eeBankHtml(); };
const eeMove = (id, dir) => { const a = S.ui.ee.qids, i = a.indexOf(id), j = i + dir; if (i < 0 || j < 0 || j >= a.length) return; [a[i], a[j]] = [a[j], a[i]]; eeRefresh(); };
actions.eeadd = el => { if (!S.ui.ee.qids.includes(el.dataset.id)) S.ui.ee.qids.push(el.dataset.id); eeRefresh(); };
actions.eerem = el => { S.ui.ee.qids = S.ui.ee.qids.filter(x => x !== el.dataset.id); eeRefresh(); };
actions.eeup = el => eeMove(el.dataset.id, -1);
actions.eedown = el => eeMove(el.dataset.id, 1);
actions.eeaddall = () => { const sel = S.ui.ee.qids; qFilter(loadDb(), S.ui.ebf).slice().reverse().forEach(q => { if (!sel.includes(q.id)) sel.push(q.id); }); eeRefresh(); };
actions.eeauto = () => {
  const n = Math.max(1, parseInt($('#ee-n').value, 10) || 10), pool = shuffle(qFilter(loadDb(), S.ui.ebf).filter(q => !S.ui.ee.qids.includes(q.id)));
  if (!pool.length) return toast('No unused questions match the filter.', 'bad');
  pool.slice(0, n).forEach(q => S.ui.ee.qids.push(q.id)); toast(plural(Math.min(n, pool.length), 'question') + ' added'); eeRefresh();
};
actions.eesubmit = async () => {
  const f = $('#eeform'); const d = S.ui.ee = readExamFields(f), errs = {};
  if (d.title.length < 3) errs.title = 'Give the exam a title.';
  if (d.minutes < 1 || d.minutes > 300) errs.minutes = 'Enter a time limit between 1 and 300 minutes.';
  if (d.status === 'published' && !d.qids.length) errs.form = 'Add at least one question before publishing, or save it as a draft.';
  showErrors(f, errs);
  if (Object.keys(errs).length) { if (errs.form) showErrors(f, errs); return; }
  const id = await saveExam({ id: d.id, title: d.title, description: d.description, type: d.type, minutes: d.minutes, attempts: d.attempts, shuffle: d.shuffle, status: d.status, qids: d.qids, demo: d.demo });
  if (!id) return;
  S.ui.ee = null; S.ui.eeKey = null; toast('Exam saved'); go('#/a/exams');
};
forms.eesave = () => actions.eesubmit();
changes.eeaccesstoggle = async el => {
  const ok = await setExamAccess(el.dataset.id, el.dataset.uid, el.checked);
  if (!ok) el.checked = !el.checked;
  const panel = $('#eeaccess'); if (panel) panel.innerHTML = eeAccessHtml();
};
actions.eeaccessall = async el => {
  const list = students(loadDb()).filter(s => s.status === 'approved');
  await Promise.all(list.map(s => setExamAccess(el.dataset.id, s.id, true)));
  toast('Access granted to all approved students'); const panel = $('#eeaccess'); if (panel) panel.innerHTML = eeAccessHtml();
};
actions.eeaccessnone = async el => {
  const list = students(loadDb()).filter(s => s.status === 'approved');
  const ok = await confirmBox({ title: 'Revoke access for everyone?', body: '<p>No student will be able to start this exam until you grant access again.</p>', ok: 'Revoke all', danger: true });
  if (!ok) return;
  await Promise.all(list.map(s => setExamAccess(el.dataset.id, s.id, false)));
  toast('Access revoked for all students'); const panel = $('#eeaccess'); if (panel) panel.innerHTML = eeAccessHtml();
};

/* =====================================================================
   Section 7: account page, router, boot
   ===================================================================== */
function viewProfile(u) {
  const admin = u.role === 'admin';
  draw(`<div class="pagehead"><div><h1>Account</h1><p class="muted">Your details and password.</p></div></div>
<div class="split"><section class="panel"><div class="row gap-l">${avatar(u.name, 'lg')}<div><h2 class="serif" style="font-size:26px;line-height:1.15">${esc(u.name)}</h2><p class="muted small">${admin ? 'Teacher' : 'Grade ' + esc(u.grade)}</p></div></div>
<dl class="kv mt-l"><dt>Username</dt><dd>${esc(u.username)}</dd>${admin ? '' : `<dt>Grade</dt><dd>Grade ${esc(u.grade)}</dd><dt>Your phone</dt><dd>${esc(u.phone)}</dd><dt>Parent’s phone</dt><dd>${esc(u.parentPhone)}</dd>`}<dt>Member since</dt><dd>${fmtDate(u.createdAt)}</dd></dl>
${admin ? '' : `<p class="hint mt">To change your grade or phone numbers, message Mr Youssef on <a href="${WA_HREF}" target="_blank" rel="noopener noreferrer">WhatsApp</a>.</p>`}
<div class="mt-l"><button class="btn btn-line" data-act="signout">${icon('logout')}Sign out</button></div></section>
<section class="panel"><h2>Change password</h2><form data-form="pwchange" class="mt" novalidate style="display:grid;gap:16px"><div class="formerr" data-err="form" role="alert"></div>
${pwField('Current password', 'cur', 'current-password')}${pwField('New password', 'next', 'new-password', 'At least 8 characters.')}${pwField('Confirm new password', 'confirm', 'new-password')}
<div><button class="btn btn-primary" type="submit">Change password</button></div></form></section></div>`, 'Account', null);
}
forms.pwchange = async f => {
  const d = formData(f), btn = $('button[type=submit]', f); showErrors(f, {});
  if (d.next !== d.confirm) return showErrors(f, { confirm: 'The new passwords do not match.' });
  setBusy(btn, true, 'Saving…'); const r = await changePassword(currentUser().id, d.cur, d.next); setBusy(btn, false);
  if (!r.ok) return showErrors(f, r.errors);
  f.reset(); toast('Password changed');
};

function studentRoute(p, u) {
  const [a, b] = p;
  if (!a || a === 'home') return viewHome(u);
  if (a === 'practice') return viewPractice(u);
  if (a === 'homework') return viewHomework(u);
  if (a === 'run') return viewRun(u);
  if (a === 'exams') return viewExams(u);
  if (a === 'exam' && b) return viewExamTake(u, b);
  if (a === 'results') return viewResults(u);
  if (a === 'review' && b) return viewReview(u, b);
  if (a === 'mistakes') return viewMistakes(u);
  if (a === 'notes') return viewAnnotations(u);
  if (a === 'recordings') return viewRecordings(u);
  if (a === 'profile') return viewProfile(u);
  go('#/home');
}
function adminRoute(p, u) {
  const [a, b, c] = p;
  if (a === 'a') {
    if (b === 'overview') return viewOverview(u);
    if (b === 'questions') return viewQuestions(u);
    if (b === 'q' && c === 'bulk') return viewBulk(u);
    if (b === 'q' && c) return viewQEdit(u, c);
    if (b === 'exams') return viewAdminExams(u);
    if (b === 'e' && c) return viewEExam(u, c);
    if (b === 'students') return viewStudents(u);
  }
  if (a === 'review' && b) return viewReview(u, b);
  if (a === 'profile') return viewProfile(u);
  go('#/a/overview');
}
function route() {
  runCleanups(); closeModal();
  const u = currentUser();
  if (u && u.role === 'student' && u.frozen) { S.userId = null; S.db = emptyDb(); signOutNow(); S.ui.authTab = 'status'; S.ui.status = 'frozen'; return viewAuth(); }
  if (!u || (u.role === 'student' && u.status !== 'approved')) return viewAuth();
  if (u.role === 'student') autoSubmitExpired(u.id);
  const raw = (location.hash || '').replace(/^#\/?/, ''), parts = raw.split('?');
  S.params = new URLSearchParams(parts[1] || '');
  const p = parts[0].split('/').filter(Boolean);
  try { return u.role === 'admin' ? adminRoute(p, u) : studentRoute(p, u); }
  catch (err) {
    console.error(err);
    draw(`<div class="panel">${emptyState('Something went wrong', 'Reload the page and try again. If it keeps happening, tell Mr Youssef.', '<a class="btn btn-primary" href="#/">Back to start</a>')}</div>`, 'Error', null);
  }
}
async function softRefresh() {
  const u = currentUser(); if (!u || $('.scrim') || S.ex) return; const h = location.hash;
  await refreshAll();
  if (u.role === 'admin') { if (h.startsWith('#/a/students')) refreshStudents(); else if (h === '' || h.startsWith('#/a/overview')) route(); else updateBadge(); }
  else if (/^(#\/?|#\/home|#\/exams|#\/results)$/.test(h)) route();
}
async function boot() {
  initTheme();
  draw('<div class="boot-loading" role="status" aria-label="Loading">' + icon('dna', 'ic-lg') + '</div>', 'Loading…', null, { bare: true, raw: true });
  try { await refreshAll(); } catch (e) { console.error(e); S.db = emptyDb(); S.userId = null; }
  window.addEventListener('hashchange', route);
  // Supabase's client persists its own session in localStorage and
  // refreshes tokens on its own; we just need to know when it changes
  // (sign-in elsewhere, token refresh, sign-out) so the UI stays in sync.
  sb.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_OUT') { S.userId = null; S.db = emptyDb(); route(); }
    else if (event === 'TOKEN_REFRESHED') { /* nothing to do — same user */ }
  });
  // No realtime subscriptions in this version, so other people's changes
  // (a teacher's approval, a new question) show up here within ~25s
  // rather than instantly. Fine for a small tutoring class; a future
  // version could switch this to Supabase Realtime if that ever matters.
  setInterval(() => { softRefresh().catch(() => { }); }, 25000);
  route();
}
boot();