'use strict';

actions.stopen = el => openStudent(el.dataset.id);
function studentAnnotationsHtml(id) {
  const list = studentAnnotations(loadDb(), id);
  if (!list.length) return `<p class="hint">No annotations yet.</p>`;
  return list.map(a => `<div class="li" style="align-items:flex-start"><div class="grow"><div class="xs muted">${fmtDateTime(a.createdAt)}</div><div class="mt-s" style="white-space:pre-wrap">${nl2br(a.body)}</div></div><button class="btn btn-danger btn-sm" data-act="annodel" data-id="${a.id}" data-uid="${id}" aria-label="Delete annotation">${icon('trash', 'ic-s')}</button></div>`).join('');
}
forms.annoadd = async f => {
  const d = formData(f), id = f.dataset.id, btn = $('button[type=submit]', f);
  const body = String(d.body || '').trim(); if (!body) return;
  setBusy(btn, true, 'Saving…');
  const row = await addAnnotation(id, body);
  setBusy(btn, false);
  if (!row) return;
  f.reset(); toast('Annotation added');
  const list = $('#annolist-' + id); if (list) list.innerHTML = studentAnnotationsHtml(id);
};
actions.annodel = async el => {
  const ok = await confirmBox({ title: 'Delete this annotation?', body: '<p>The student will no longer see this note.</p>', ok: 'Delete', danger: true });
  if (!ok) return;
  await deleteAnnotation(el.dataset.id);
  const list = $('#annolist-' + el.dataset.uid); if (list) list.innerHTML = studentAnnotationsHtml(el.dataset.uid);
};

/* =====================================================================
   Section 6b: teacher dashboard — questions, bulk add, chapters, exams
   ===================================================================== */

/* ---------- Question bank ---------- */
function qFilter(db, f) {
  const q = (f.q || '').trim().toLowerCase();
  return db.questions.filter(x => (!f.chapter || x.chapter === f.chapter) && (!f.tier || x.tier === f.tier) && (!q || x.stem.toLowerCase().includes(q) || LETTERS.some(l => (x.options[l] || '').toLowerCase().includes(q))))
    .sort((a, b) => b.createdAt - a.createdAt || a.stem.localeCompare(b.stem));
}
const qNotes = q => [q.image && 'a photo', q.table && 'a data table', q.optImg && Object.keys(q.optImg).length && 'photo choices', q.lettersOnly && 'choices in the photo'].filter(Boolean);
const levelOpts = (cur, all) => `<option value="">${all}</option>` + LEVELS.map(([v, l]) => `<option value="${v}" ${cur === v ? 'selected' : ''}>${l}</option>`).join('');
function qListHtml() {
  const db = loadDb(), list = qFilter(db, S.ui.qf), acc = questionAccuracy(db);
  if (!db.questions.length) return emptyState('No questions yet', 'Add questions one at a time, or paste many at once.', '<div class="row gap-s wrapr" style="justify-content:center;margin-top:14px"><a class="btn btn-primary" href="#/a/q/new">Add a question</a><a class="btn btn-line" href="#/a/q/bulk">Bulk add</a></div>');
  if (!list.length) return emptyState('No questions match', 'Try a different search or filter.');
  return `<div class="scroll"><table class="tbl rsp"><thead><tr><th>Question</th><th>Chapter</th><th>Difficulty</th><th>Answer</th><th class="num">Correct</th><th></th></tr></thead><tbody>${list.map(q => { const a = acc[q.id], notes = qNotes(q); return `<tr><td><div class="row gap-s">${q.image ? `<span class="thumb">${imgTag(q.image, '')}</span>` : ''}<div><div class="trunc">${esc(qTitle(q))}</div>${notes.length ? `<span class="xs muted">Includes ${notes.join(', ')}</span>` : ''}</div></div></td><td class="chapc" data-l="Chapter">${esc(q.chapter)}${q.pool === 'homework' ? ' <span class="badge b-mute">HW</span>' : ''}</td><td data-l="Difficulty">${tierBadge(q.tier)}</td><td class="strong" data-l="Answer">${q.answer}</td><td class="num" data-l="Correct">${a ? `${pct(a.ok, a.seen)}% <span class="muted xs">of ${a.seen}</span>` : '<span class="muted">—</span>'}</td><td class="acts"><a class="btn btn-line btn-sm" href="#/a/q/${q.id}">${icon('edit', 'ic-s')}Edit</a><button class="btn btn-line btn-sm" data-act="qdup" data-id="${q.id}" aria-label="Duplicate question">${icon('copy', 'ic-s')}</button><button class="btn btn-danger btn-sm" data-act="qdel" data-id="${q.id}" aria-label="Delete question">${icon('trash', 'ic-s')}</button></td></tr>`; }).join('')}</tbody></table></div>`;
}
function viewQuestions(u) {
  const db = loadDb(); S.ui.qf = S.ui.qf || { q: '', chapter: '', tier: '' };
  const n = l => db.questions.filter(q => q.tier === l).length;
  draw(`<div class="pagehead"><div><h1>Question bank</h1><p class="muted">${plural(db.questions.length, 'question')} · ${n('EASY')} easy · ${n('MEDIUM')} medium · ${n('HARD')} hard</p></div><div class="row gap-s wrapr"><button class="btn btn-line" data-act="qchapters">${icon('layers')}Chapters</button><a class="btn btn-line" href="#/a/q/bulk">${icon('upload')}Bulk add</a><a class="btn btn-primary" href="#/a/q/new">${icon('plus')}Add question</a></div></div>
<div class="toolbar" data-input="qf"><div class="searchbox">${icon('search')}<input class="inp" name="q" type="search" placeholder="Search questions" aria-label="Search questions" value="${esc(S.ui.qf.q)}"></div>
<select class="sel" name="chapter" aria-label="Filter by chapter"><option value="">All chapters</option>${db.chapters.map(c => `<option ${S.ui.qf.chapter === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select>
<select class="sel" name="tier" aria-label="Filter by difficulty">${levelOpts(S.ui.qf.tier, 'All difficulties')}</select></div>
<div class="panel tight" id="qlist">${qListHtml()}</div>`, 'Question bank', 'a/questions');
}
inputs.qf = el => { const d = {}; $$('[name]', el).forEach(x => { d[x.name] = x.value; }); S.ui.qf = d; $('#qlist').innerHTML = qListHtml(); };
actions.qdel = async el => {
  const db = loadDb(), q = db.questions.find(x => x.id === el.dataset.id), used = examsUsing(db, q.id);
  const ok = await confirmBox({ title: 'Delete this question?', body: `<p>“${esc(trunc(qTitle(q), 110))}”</p>${used.length ? `<p><b>It is used in ${plural(used.length, 'exam')}</b> and will be removed from ${used.length === 1 ? 'it' : 'them'}. Past results keep their scores.</p>` : ''}<p>Students’ mistake history for this question is removed too.</p>`, ok: 'Delete question', danger: true });
  if (ok) { await deleteQuestion(q.id); toast('Question deleted'); $('#qlist').innerHTML = qListHtml(); }
};
actions.qdup = async el => {
  const q = loadDb().questions.find(x => x.id === el.dataset.id), c = JSON.parse(JSON.stringify(q)); delete c.id; delete c.demo;
  const id = await saveQuestion(c); if (!id) return; toast('Question duplicated'); go('#/a/q/' + id);
};

/* chapters modal */
function chaptersModalHtml() {
  const db = loadDb(), cnt = {}; db.questions.forEach(q => { cnt[q.chapter] = (cnt[q.chapter] || 0) + 1; });
  return `<div class="row between"><h3>Chapters</h3><button class="iconbtn" data-act="close" aria-label="Close">${icon('x')}</button></div>
<p class="muted small">Chapters group your questions. You can only delete a chapter that has no questions.</p>
<ul class="list" style="padding:0;list-style:none;max-height:340px;overflow:auto">${db.chapters.map(c => `<li class="li"><span class="grow">${esc(c)}</span><span class="muted xs">${plural(cnt[c] || 0, 'question')}</span><button class="btn btn-line btn-sm" data-act="chdel" data-c="${esc(c)}" ${cnt[c] ? 'disabled' : ''} aria-label="Delete ${esc(c)}">${icon('trash', 'ic-s')}</button></li>`).join('')}</ul>
<form data-form="chadd" class="row gap-s" novalidate><input class="inp" name="c" maxlength="40" placeholder="New chapter name" aria-label="New chapter name"><button class="btn btn-primary" type="submit">Add</button></form><div class="err" data-err="c"></div>`;
}
actions.qchapters = () => openModal(chaptersModalHtml(), { label: 'Chapters' });
forms.chadd = async f => {
  const c = String(formData(f).c || '').trim().replace(/\s+/g, ' '), db = loadDb(), box = f.closest('.modal');
  if (c.length < 2) return showErrors(box, { c: 'Enter a chapter name.' });
  if (db.chapters.some(x => x.toLowerCase() === c.toLowerCase())) return showErrors(box, { c: 'That chapter already exists.' });
  const r = await addChapter(c); if (!r.ok) return showErrors(box, { c: r.error });
  openModal(chaptersModalHtml(), { label: 'Chapters' }); toast('Chapter added');
  const i = $('.modal input[name=c]'); if (i) try { i.focus(); } catch (e) { }
};
actions.chdel = async el => { await deleteChapter(el.dataset.c); openModal(chaptersModalHtml(), { label: 'Chapters' }); };

/* recorded-sessions modal */
function recordingsModalHtml() {
  const db = loadDb();
  if (!db.chapters.length) return `<div class="row between"><h3>Recorded sessions</h3><button class="iconbtn" data-act="close" aria-label="Close">${icon('x')}</button></div><p class="muted small">Add chapters first (Question bank → Chapters), then come back here to add their recording links.</p>`;
  return `<div class="row between"><h3>Recorded sessions</h3><button class="iconbtn" data-act="close" aria-label="Close">${icon('x')}</button></div>
<p class="muted small">Paste a link (YouTube, Google Drive, etc.) for each chapter's recorded session. Leave a field blank to hide that chapter from students. Links open in a new tab for students.</p>
<form data-form="recsave" novalidate><div style="display:grid;gap:10px;max-height:380px;overflow:auto">${db.chapters.map(c => `<div class="row gap-s wrapr" style="align-items:center"><span class="grow" style="min-width:150px">${esc(c)}</span><input class="inp" style="flex:2;min-width:220px" name="${esc(c)}" placeholder="https://…" value="${esc(db.recordings[c] || '')}"></div>`).join('')}</div>
<div class="row end gap-s mt"><button class="btn btn-primary" type="submit">Save links</button></div></form>`;
}
actions.recordings = () => openModal(recordingsModalHtml(), { label: 'Recorded sessions', wide: true });
forms.recsave = async f => {
  const d = formData(f), db = loadDb(), btn = $('button[type=submit]', f);
  setBusy(btn, true, 'Saving…');
  let ok = true;
  for (const c of db.chapters) {
    const cur = db.recordings[c] || '', next = String(d[c] || '').trim();
    if (cur === next) continue;
    if (!(await setRecording(c, next))) ok = false;
  }
  setBusy(btn, false);
  if (ok) toast('Recording links saved');
};

/* annotations (lesson materials) modal */
function materialFileSlotHtml(c, m) {
  return m.file_name
    ? `<span class="row gap-s" style="align-items:center;flex-wrap:wrap"><span class="badge b-mute">${esc(m.file_name)}</span><label class="btn btn-line btn-sm">Replace<input class="fileinp" type="file" data-change="matfile" data-c="${esc(c)}"></label><button type="button" class="btn btn-line btn-sm" data-act="matfilerm" data-c="${esc(c)}">Remove</button></span>`
    : `<label class="btn btn-line btn-sm">${icon('upload', 'ic-s')}Upload file<input class="fileinp" type="file" data-change="matfile" data-c="${esc(c)}"></label>`;
}
function materialsModalHtml() {
  const db = loadDb();
  if (!db.chapters.length) return `<div class="row between"><h3>Annotations</h3><button class="iconbtn" data-act="close" aria-label="Close">${icon('x')}</button></div><p class="muted small">Add chapters first (Question bank → Chapters), then come back here to add their lesson materials.</p>`;
  return `<div class="row between"><h3>Annotations</h3><button class="iconbtn" data-act="close" aria-label="Close">${icon('x')}</button></div>
<p class="muted small">For each chapter, add a link, upload a file (up to 25 MB), or both. Leave both empty to hide that chapter from students.</p>
<form data-form="matsave" novalidate><div style="display:grid;gap:10px;max-height:420px;overflow:auto">${db.chapters.map(c => { const m = db.materials[c] || {}; return `<div class="row gap-s wrapr" style="align-items:center;border-bottom:1px solid var(--line-2);padding-bottom:10px"><span class="grow" style="min-width:140px"><b>${esc(c)}</b></span><input class="inp" style="flex:2;min-width:200px" name="${esc(c)}" placeholder="Link (optional)" value="${esc(m.url || '')}"><span id="matfile-${esc(c)}">${materialFileSlotHtml(c, m)}</span></div>`; }).join('')}</div>
<div class="row end gap-s mt"><button class="btn btn-primary" type="submit">Save links</button></div></form>`;
}
actions.materials = () => openModal(materialsModalHtml(), { label: 'Annotations', wide: true });
changes.matfile = async el => {
  const file = el.files && el.files[0]; if (!file) return;
  if (file.size > 25 * 1024 * 1024) { toast('That file is over 25 MB. Choose a smaller one.', 'bad'); try { el.value = ''; } catch (e) { } return; }
  const c = el.dataset.c;
  toast('Uploading…');
  const r = await uploadMaterialFile(c, file);
  try { el.value = ''; } catch (e) { }
  if (!r.ok) return toast(r.error || 'Could not upload that file.', 'bad');
  toast('File uploaded');
  const slot = document.getElementById('matfile-' + c); if (slot) slot.innerHTML = materialFileSlotHtml(c, loadDb().materials[c] || {});
};
actions.matfilerm = async el => {
  const c = el.dataset.c;
  const ok = await confirmBox({ title: 'Remove this file?', body: `<p>Students will no longer be able to download it for ${esc(c)}.</p>`, ok: 'Remove file', danger: true });
  if (!ok) return;
  const r = await removeMaterialFile(c);
  if (!r.ok) return toast(r.error || 'Could not remove that file.', 'bad');
  toast('File removed');
  const slot = document.getElementById('matfile-' + c); if (slot) slot.innerHTML = materialFileSlotHtml(c, loadDb().materials[c] || {});
};
forms.matsave = async f => {
  const d = formData(f), db = loadDb(), btn = $('button[type=submit]', f);
  setBusy(btn, true, 'Saving…');
  let ok = true;
  for (const c of db.chapters) {
    const cur = (db.materials[c] || {}).url || '', next = String(d[c] || '').trim();
    if (cur === next) continue;
    if (!(await setMaterialLink(c, next))) ok = false;
  }
  setBusy(btn, false);
  if (ok) toast('Links saved');
};

/* ---------- Question editor ---------- */
const blankQ = () => ({ id: null, chapter: (S.ui.lastQ && S.ui.lastQ.chapter) || loadDb().chapters[0], tier: (S.ui.lastQ && S.ui.lastQ.tier) || 'MEDIUM', stem: '', image: '', imageAlt: '', lettersOnly: false, tableCaption: '', tableText: '', options: { A: '', B: '', C: '', D: '', E: '' }, optImg: {}, answer: '', explanation: '' });
function draftFrom(q) { return { id: q.id, chapter: q.chapter, tier: q.tier, stem: q.stem || '', image: q.image || '', imageAlt: q.imageAlt || '', lettersOnly: !!q.lettersOnly, tableCaption: q.table ? q.table.caption || '' : '', tableText: tableToText(q.table), options: Object.assign({ A: '', B: '', C: '', D: '', E: '' }, q.options), optImg: Object.assign({}, q.optImg || {}), answer: q.answer, explanation: q.explanation || '' }; }
function readQ(f) {
  const d = formData(f), prev = S.ui.qe || {};
  return { id: prev.id, chapter: d.chapter, tier: d.tier, stem: (d.stem || '').trim(), image: prev.image || '', imageAlt: (d.imageAlt || '').trim(), lettersOnly: !!(f.elements.lettersOnly && f.elements.lettersOnly.checked), tableCaption: (d.tableCaption || '').trim(), tableText: d.tableText || '', options: Object.fromEntries(LETTERS.map(l => [l, (d['opt' + l] || '').trim()])), optImg: Object.assign({}, prev.optImg), answer: d.answer || '', explanation: (d.explanation || '').trim() };
}
function draftToQuestion(d) {
  const t = parseTable(d.tableText);
  return { id: d.id, chapter: d.chapter, tier: d.tier, stem: d.stem, image: d.image || '', imageAlt: d.imageAlt || '', lettersOnly: !!d.lettersOnly, table: t.rows.length ? { caption: d.tableCaption, rows: t.rows } : null, options: d.options, optImg: d.lettersOnly ? {} : Object.assign({}, d.optImg), answer: d.answer, explanation: d.explanation };
}
function qPreviewHtml(d) {
  const q = draftToQuestion(d);
  const shown = Object.assign({}, q, { stem: q.stem || (q.image ? '' : 'Your question will appear here.'), options: Object.fromEntries(LETTERS.map(l => [l, q.options[l] || (q.optImg[l] || q.lettersOnly ? '' : 'Option ' + l)])) });
  return `<div class="q">${questionHtml(shown, { mark: !!q.answer, locked: true })}${q.explanation ? explainHtml(q, null) : ''}</div>`;
}
function validateQ(d) {
  const e = {}, db = loadDb();
  if (!db.chapters.includes(d.chapter)) e.chapter = 'Choose a chapter.';
  if (!d.stem && !d.image) e.stem = 'Write the question, or add a photo of it.';
  else if (!d.image && d.stem.length < 10) e.stem = 'Write the question, at least 10 characters.';
  const t = parseTable(d.tableText); if (d.tableText.trim() && t.error) e.tableText = t.error;
  if (d.lettersOnly) { if (!d.image) e.image = 'Add the photo that shows the choices, or turn off “The choices are inside the photo”.'; }
  else {
    const missing = LETTERS.filter(l => !d.options[l] && !d.optImg[l]);
    if (missing.length) e.options = 'Every option needs text or a photo. Missing: ' + missing.join(', ') + '.';
    else if (LETTERS.every(l => d.options[l] && !d.optImg[l]) && new Set(LETTERS.map(l => d.options[l].toLowerCase())).size < 5) e.options = 'Two options are identical. Every option must be different.';
  }
  if (!d.answer) e.answer = 'Mark which option is correct.';
  return e;
}
const fileBtn = (label, slot, ic) => `<label class="btn btn-line btn-sm">${ic ? icon(ic, 'ic-s') : ''}${label}<input class="fileinp" type="file" accept="image/*" data-change="qimgfile" data-slot="${slot}"></label>`;
const stemImgHtml = d => d.image
  ? `<div class="imgprev"><button type="button" class="qimg" data-act="zoom" data-ref="${esc(d.image)}" aria-label="Enlarge the image">${imgTag(d.image, '')}</button><div class="row gap-s wrapr">${fileBtn('Replace photo', 'stem', 'upload')}<button type="button" class="btn btn-line btn-sm" data-act="qimgrm" data-slot="stem">${icon('trash', 'ic-s')}Remove</button></div>
<div class="field"><label class="lbl" for="q-alt">Describe the photo <span class="opt-tag">Read aloud to students who use a screen reader. Optional.</span></label><input class="inp" id="q-alt" name="imageAlt" value="${esc(d.imageAlt)}"></div></div>`
  : `<div class="dropz" tabindex="0"><span class="dz-ic">${icon('image')}</span><div><div class="row gap-s wrapr">${fileBtn('Add a photo', 'stem', 'upload')}</div><p class="hint" style="margin-top:6px">Or drag a photo here, or click this box and paste one with Ctrl+V (Cmd+V on a Mac). A screenshot works too.</p></div></div>`;
const optImgHtml = (l, d) => d.optImg && d.optImg[l]
  ? `<span class="thumb lg">${imgTag(d.optImg[l], '')}</span>${fileBtn('Replace', l)}<button type="button" class="btn btn-line btn-sm" data-act="qimgrm" data-slot="${l}">Remove</button>`
  : fileBtn('Add photo', l, 'image');
function refreshImgSlots() {
  const d = S.ui.qe; if (!$('#stemimg')) return;
  $('#stemimg').innerHTML = stemImgHtml(d);
  LETTERS.forEach(l => { const el = $('#oi-' + l); if (el) el.innerHTML = optImgHtml(l, d); });
  $('#qpreview').innerHTML = qPreviewHtml(d);
}
function viewQEdit(u, id) {
  const db = loadDb(); let ex = null;
  if (id !== 'new') { ex = db.questions.find(q => q.id === id); if (!ex) return go('#/a/questions'); }
  if (!S.ui.qe || S.ui.qeKey !== id) { S.ui.qe = ex ? draftFrom(ex) : blankQ(); S.ui.qeKey = id; }
  S.ui.qFrom = S.params.get('from') || '';
  const d = S.ui.qe, backHref = S.ui.qFrom ? '#/a/' + S.ui.qFrom : '#/a/questions', backLabel = S.ui.qFrom ? 'Back to the exam' : 'Question bank';
  draw(`<a class="btn btn-ghost btn-sm" href="${backHref}" style="margin-left:-10px">${icon('left')}${backLabel}</a>
<div class="pagehead mt-s"><div><h1>${ex ? 'Edit question' : 'Add a question'}</h1><p class="muted">Fill in the question. The preview shows what students will see.</p></div></div>
<div class="split"><form class="panel" id="qform" data-form="qsave" data-input="qe" novalidate style="display:grid;gap:18px">
<div class="formerr" data-err="form" role="alert"></div>
<div class="formgrid"><div class="field"><label class="lbl" for="q-chapter">Chapter</label><select class="sel" id="q-chapter" name="chapter">${db.chapters.map(c => `<option ${d.chapter === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select><div class="err" data-err="chapter"></div></div>
<div class="field"><label class="lbl" for="q-tier">Difficulty</label><select class="sel" id="q-tier" name="tier">${LEVELS.map(([v, l]) => `<option value="${v}" ${d.tier === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div></div>
<div class="field" data-slot="stem"><label class="lbl" for="q-stem">Question <span class="opt-tag">Optional if you add a photo of the question</span></label><textarea class="txt" id="q-stem" name="stem" rows="4" placeholder="Start with a short real-world scenario, then ask the question.">${esc(d.stem)}</textarea><div class="err" data-err="stem" aria-live="polite"></div>
<div id="stemimg">${stemImgHtml(d)}</div><div class="err" data-err="image" aria-live="polite"></div></div>
<details class="fold" ${d.tableText ? 'open' : ''}><summary>Add a data table (optional)</summary><div style="display:grid;gap:12px;margin-top:8px"><div class="field"><label class="lbl" for="q-cap">Table title</label><input class="inp" id="q-cap" name="tableCaption" value="${esc(d.tableCaption)}" placeholder="Relative enzyme activity at different pH values"></div>
<div class="field"><label class="lbl" for="q-tab">Table rows</label><textarea class="txt code" id="q-tab" name="tableText" rows="5" placeholder="pH | Activity (%)&#10;4 | 20&#10;7 | 100">${esc(d.tableText)}</textarea><div class="hint">One row per line, columns separated by the | character. The first line is the header.</div><div class="err" data-err="tableText" aria-live="polite"></div></div></div></details>
<fieldset id="optset" class="${d.lettersOnly ? 'lo-on' : ''}" style="border:0;padding:0;margin:0;display:grid;gap:12px"><legend class="lbl" style="padding:0;margin-bottom:8px">Answer options <span class="opt-tag">Type text, add a photo, or both. Select the correct one.</span></legend>
<label class="check"><input type="checkbox" name="lettersOnly" ${d.lettersOnly ? 'checked' : ''}><span><b>The choices are inside the question photo</b><span class="hint" style="display:block">Students only see the letters A to E to tap. Use this when you photograph a whole question from a paper.</span></span></label>
${LETTERS.map(l => `<div class="opt-row" data-slot="${l}"><span class="ltr" aria-hidden="true">${l}</span><input class="inp" name="opt${l}" value="${esc(d.options[l])}" aria-label="Option ${l} text" placeholder="Option ${l}"><label class="correct"><input type="radio" name="answer" value="${l}" ${d.answer === l ? 'checked' : ''} aria-label="Option ${l} is correct">Correct</label><div class="optimg" id="oi-${l}">${optImgHtml(l, d)}</div></div>`).join('')}
<div class="err" data-err="options" aria-live="polite"></div><div class="err" data-err="answer" aria-live="polite"></div></fieldset>
<div class="field"><label class="lbl" for="q-exp">Explanation <span class="opt-tag">Shown to students after they answer</span></label><textarea class="txt" id="q-exp" name="explanation" rows="3">${esc(d.explanation)}</textarea></div>
<div class="row gap-s wrapr"><button class="btn btn-primary" type="submit" name="after" value="list">${S.ui.qFrom ? 'Save and add to exam' : 'Save question'}</button>${ex ? '' : '<button class="btn btn-line" type="submit" name="after" value="again">Save and add another</button>'}<a class="btn btn-ghost" href="${backHref}">Cancel</a></div></form>
<aside class="sticky"><h2 class="mb">Preview</h2><p class="hint mb">The correct answer is highlighted for you only.</p><div id="qpreview">${qPreviewHtml(d)}</div></aside></div>`, ex ? 'Edit question' : 'Add question', 'a/questions');
}
inputs.qe = f => {
  S.ui.qe = readQ(f); S.ui.lastQ = { chapter: S.ui.qe.chapter, tier: S.ui.qe.tier };
  const os = $('#optset'); if (os) os.classList.toggle('lo-on', S.ui.qe.lettersOnly);
  $('#qpreview').innerHTML = qPreviewHtml(S.ui.qe);
};
async function attachImage(slot, file) {
  try {
    const id = await addImage(file, slot === 'stem' ? 'stem' : 'opt');
    const f = $('#qform'); if (!f) return;
    const d = S.ui.qe = readQ(f);
    if (slot === 'stem') d.image = id; else d.optImg[slot] = id;
    refreshImgSlots(); toast('Photo added');
  } catch (e) {
    toast(e.message === 'type' ? 'Use a JPG, PNG or WebP photo.' : e.message === 'size' ? 'That photo is over 20 MB. Choose a smaller one.' : 'Could not add that photo. Try a different one.', 'bad');
  }
}
changes.qimgfile = el => { const f = el.files && el.files[0]; if (f) attachImage(el.dataset.slot, f); try { el.value = ''; } catch (e) { } };
actions.qimgrm = el => {
  const f = $('#qform'), d = S.ui.qe = readQ(f), slot = el.dataset.slot;
  if (slot === 'stem') d.image = ''; else delete d.optImg[slot];
  refreshImgSlots();
};
document.addEventListener('paste', e => {
  const slotEl = e.target.closest && e.target.closest('#qform [data-slot]'); if (!slotEl || !e.clipboardData) return;
  const it = Array.from(e.clipboardData.items || []).find(i => i.kind === 'file' && /^image\//.test(i.type)); if (!it) return;
  const txt = e.clipboardData.getData('text/plain');
  if (txt && txt.trim() && /^(INPUT|TEXTAREA)$/.test(e.target.tagName)) return;
  e.preventDefault(); attachImage(slotEl.dataset.slot, it.getAsFile());
});
document.addEventListener('dragover', e => {
  const s = e.target.closest && e.target.closest('#qform [data-slot]');
  if (s && e.dataTransfer && Array.from(e.dataTransfer.types || []).includes('Files')) { e.preventDefault(); s.classList.add('dragging'); }
});
document.addEventListener('dragleave', e => { const s = e.target.closest && e.target.closest('[data-slot]'); if (s) s.classList.remove('dragging'); });
document.addEventListener('drop', e => {
  $$('.dragging').forEach(x => x.classList.remove('dragging'));
  const s = e.target.closest && e.target.closest('#qform [data-slot]'); if (!s) return;
  const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
  if (f) { e.preventDefault(); attachImage(s.dataset.slot, f); }
});
forms.qsave = async (f, e) => {
  const d = readQ(f), errs = validateQ(d); S.ui.qe = d;
  showErrors(f, errs);
  if (Object.keys(errs).length) { showErrors(f, Object.assign({ form: 'Fix the highlighted fields, then save again.' }, errs)); return; }
  const q = draftToQuestion(d), again = e.submitter && e.submitter.value === 'again';
  const id = await saveQuestion({ id: d.id, chapter: q.chapter, tier: q.tier, stem: q.stem, image: q.image, imageAlt: q.image ? q.imageAlt : '', lettersOnly: q.lettersOnly, table: q.table, options: q.options, optImg: q.optImg, answer: q.answer, explanation: q.explanation });
  if (!id) return;
  S.ui.lastQ = { chapter: d.chapter, tier: d.tier }; S.ui.qe = null; S.ui.qeKey = null;
  const from = S.ui.qFrom;
  if (from) {
    const eid = from.split('/')[1];
    if (S.ui.ee && S.ui.eeKey === eid && !S.ui.ee.qids.includes(id)) S.ui.ee.qids.push(id);
    toast('Question saved and added to the exam');
    return go(again ? '#/a/q/new?from=' + encodeURIComponent(from) : '#/a/' + from);
  }
  toast('Question saved');
  if (again) go('#/a/q/new'); else go('#/a/questions');
};

/* ---------- Bulk add ---------- */
const BULK_EXAMPLE = `Q: A student adds iodine solution to a sample and it turns blue-black. Which macromolecule is present?
A) Protein
B) Starch
C) Glucose
D) Triglyceride
E) DNA
Answer: B
Chapter: Biochemistry
Level: Easy
Explanation: Iodine forms a blue-black complex with starch.

Q: A student measured enzyme activity at four pH values.
| pH | Activity (%) |
| 4 | 20 |
| 7 | 100 |
| 10 | 8 |
A) …
Answer: A`;
function parseBulk(text, defChapter, defTier, chapters) {
  const blocks = []; let cur = null;
  text.replace(/\r/g, '').split('\n').forEach(line => {
    const m = line.match(/^\s*Q\s*\d*\s*[:.)]\s*(.*)$/i);
    if (m) { cur = { lines: [m[1]] }; blocks.push(cur); } else if (cur) cur.lines.push(line);
  });
  return blocks.map((b, n) => {
    const q = { chapter: '', tier: '', stem: '', tableRows: [], caption: '', options: {}, answer: '', explanation: '' }, errs = [];
    let mode = 'stem', letter = '';
    b.lines.forEach(raw => {
      const line = raw.trim(); let m;
      if ((m = line.match(/^([A-E])\s*[.)]\s*(.*)$/i)) && mode !== 'expl') { letter = m[1].toUpperCase(); q.options[letter] = m[2]; mode = 'opt'; }
      else if ((m = line.match(/^(?:answer|ans|correct(?: answer)?)\s*[:=]\s*([A-E])\b/i))) { q.answer = m[1].toUpperCase(); mode = 'key'; }
      else if ((m = line.match(/^chapter\s*:\s*(.+)$/i))) { q.chapter = m[1].trim(); mode = 'key'; }
      else if ((m = line.match(/^(?:level|difficulty|tier)\s*:\s*(easy|medium|hard|core|extra)/i))) { q.tier = normTier(m[1]); mode = 'key'; }
      else if ((m = line.match(/^(?:table title|caption)\s*:\s*(.+)$/i))) { q.caption = m[1].trim(); mode = 'key'; }
      else if ((m = line.match(/^explanation\s*:\s*(.*)$/i))) { q.explanation = m[1]; mode = 'expl'; }
      else if (line.startsWith('|') && (mode === 'stem' || mode === 'table')) { q.tableRows.push(line); mode = 'table'; }
      else if (line) {
        if (mode === 'stem') q.stem += (q.stem ? '\n' : '') + line;
        else if (mode === 'opt') q.options[letter] += ' ' + line;
        else if (mode === 'expl') q.explanation += ' ' + line;
      }
    });
    q.stem = q.stem.trim(); q.explanation = q.explanation.trim();
    if (q.stem.length < 10) errs.push('The question text is missing or too short.');
    const miss = LETTERS.filter(l => !(q.options[l] || '').trim()); if (miss.length) errs.push('Missing option' + (miss.length > 1 ? 's ' : ' ') + miss.join(', ') + '.');
    if (!q.answer) errs.push('No “Answer:” line.');
    let chapter = q.chapter || defChapter;
    const found = chapters.find(c => c.toLowerCase() === chapter.toLowerCase());
    if (!found) errs.push(`Unknown chapter “${chapter}”. Fix the spelling or add it under Chapters first.`); else chapter = found;
    let table = null;
    if (q.tableRows.length) { const t = parseTable(q.tableRows.join('\n')); if (t.error) errs.push(t.error); else table = { caption: q.caption, rows: t.rows }; }
    return { n: n + 1, errs, stem: q.stem, q: errs.length ? null : { chapter, tier: q.tier || defTier, stem: q.stem, table, options: Object.fromEntries(LETTERS.map(l => [l, q.options[l].trim()])), answer: q.answer, explanation: q.explanation } };
  });
}
function bulkResultHtml() {
  const r = S.ui.bulkRes; if (!r) return '';
  const ok = r.filter(x => x.q), bad = r.filter(x => !x.q);
  if (!r.length) return '<div class="notice warn">No questions found. Each question must start with a line beginning “Q:”.</div>';
  return `<div class="notice ${bad.length ? 'warn' : 'ok'}"><b>${plural(ok.length, 'question')} ready to add.</b>${bad.length ? ` ${plural(bad.length, 'question')} need fixing and will be skipped.` : ''}</div>
${bad.length ? `<ul class="list mt" style="padding:0;list-style:none">${bad.map(b => `<li><b>Question ${b.n}</b> <span class="muted">${esc(trunc(b.stem, 70))}</span><ul style="margin:6px 0 0;padding-left:20px" class="small">${b.errs.map(e => `<li>${esc(e)}</li>`).join('')}</ul></li>`).join('')}</ul>` : ''}
${ok.length ? `<div class="row mt"><button class="btn btn-primary" data-act="bulkimport">Add ${plural(ok.length, 'question')}</button></div>` : ''}`;
}
function viewBulk(u) {
  const db = loadDb(); S.ui.bulk = S.ui.bulk || { text: '', chapter: db.chapters[0], tier: 'MEDIUM' };
  const b = S.ui.bulk;
  draw(`<a class="btn btn-ghost btn-sm" href="#/a/questions" style="margin-left:-10px">${icon('left')}Question bank</a>
<div class="pagehead mt-s"><div><h1>Bulk add questions</h1><p class="muted">Paste many questions at once, for example from a document you already wrote. Check them first, then add.</p></div></div>
<div class="split"><div class="panel" style="display:grid;gap:16px"><div class="formgrid"><div class="field"><label class="lbl" for="b-ch">Default chapter</label><select class="sel" id="b-ch" data-change="bulkdef" name="chapter">${db.chapters.map(c => `<option ${b.chapter === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select><div class="hint">Used when a question has no “Chapter:” line.</div></div>
<div class="field"><label class="lbl" for="b-tier">Default difficulty</label><select class="sel" id="b-tier" data-change="bulkdef" name="tier">${LEVELS.map(([v, l]) => `<option value="${v}" ${b.tier === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div></div>
<div class="field"><label class="lbl" for="b-text">Questions</label><textarea class="txt code" id="b-text" rows="16" data-input="bulktext" placeholder="Q: …">${esc(b.text)}</textarea></div>
<div class="row gap-s wrapr"><button class="btn btn-primary" data-act="bulkcheck">Check questions</button><button class="btn btn-ghost" data-act="bulkexample">Paste an example</button></div><div id="bulkres">${bulkResultHtml()}</div></div>
<aside class="panel"><h2 class="mb">Format</h2><ul class="small" style="padding-left:18px;display:grid;gap:8px"><li>Start each question with <span class="code">Q:</span></li><li>Options on their own lines: <span class="code">A)</span> to <span class="code">E)</span>. All five are required.</li><li><span class="code">Answer: B</span> marks the correct option.</li><li>Optional lines: <span class="code">Chapter:</span>, <span class="code">Level: Easy</span>, <span class="code">Medium</span> or <span class="code">Hard</span>, <span class="code">Explanation:</span></li><li>Photos can't be pasted here. Add them afterwards with <b>Edit</b> on each question.</li><li>Optional data table: lines that start with <span class="code">|</span>, header row first. Add <span class="code">Table title:</span> for a caption.</li></ul>
<h3 class="mt-l mb">Example</h3><pre class="code" style="white-space:pre-wrap;margin:0;background:var(--surface-2);padding:12px;border-radius:10px;border:1px solid var(--line-2);overflow:auto">${esc(BULK_EXAMPLE)}</pre></aside></div>`, 'Bulk add', 'a/questions');
}