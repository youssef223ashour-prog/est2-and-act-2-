'use strict';

function fromExamRow(e) {
  return { id: e.id, title: e.title, description: e.description, type: e.type, minutes: e.minutes, attempts: e.attempts, shuffle: e.shuffle, status: e.status, qids: e.qids || [], demo: e.is_demo, createdAt: +new Date(e.created_at) };
}
function fromAttemptRow(a) {
  const results = {}; Object.entries(a.results || {}).forEach(([qid, r]) => { results[qid] = { chosen: r.chosen, correct: r.correct }; });
  return {
    id: a.id, userId: a.user_id, kind: a.kind, examId: a.exam_id, title: a.title,
    startedAt: +new Date(a.started_at), submittedAt: a.submitted_at ? +new Date(a.submitted_at) : null, minutes: a.minutes,
    qids: a.qids || [], answers: a.answers || {}, flags: a.flags || {}, results, resultsFull: a.results || {},
    score: a.score, total: a.total, status: a.status, timedOut: a.timed_out, demo: a.is_demo
  };
}
function fromMistakeRow(m) {
  return { id: m.user_id + ':' + m.qid, userId: m.user_id, qid: m.qid, wrongCount: m.wrong_count, firstAt: +new Date(m.first_at), lastAt: +new Date(m.last_at), resolved: m.resolved, resolvedAt: m.resolved_at ? +new Date(m.resolved_at) : null, reason: m.reason || '', lastChosen: m.last_chosen };
}
function fromAnnotationRow(a) {
  return { id: a.id, userId: a.user_id, body: a.body, createdAt: +new Date(a.created_at), updatedAt: +new Date(a.updated_at) };
}

/* ---------- boot: pull the caller's own visible slice into S.db ---------- */
function emptyDb() { return { users: [], chapters: DEFAULT_CHAPTERS.slice(), questions: [], exams: [], attempts: [], mistakes: [], hwProgress: [], annotations: [], recordings: {}, materials: {}, examAccessRows: [] }; }
const hasExamAccess = (db, examId, uidv) => (db.examAccessRows || []).some(r => r.exam_id === examId && r.user_id === uidv);
async function refreshAll() {
  const db = emptyDb();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) { S.db = db; S.userId = null; return; }
  const { data: me, error: meErr } = await sb.from('profiles').select('*').eq('id', user.id).maybeSingle();
  if (meErr || !me) { S.db = db; S.userId = null; await signOutNow(); return; }
  const admin = me.role === 'admin';
  S.userId = user.id;

  const [chaptersR, examsR, recR, matR, accessR] = await Promise.all([
    sb.from('chapters').select('name').order('position'),
    sb.from('exams').select('*').order('created_at', { ascending: false }),
    sb.from('recordings').select('*'),
    sb.from('materials').select('*'),
    sb.from('exam_access').select('exam_id,user_id')
  ]);
  if (chaptersR.data && chaptersR.data.length) db.chapters = chaptersR.data.map(c => c.name);
  db.exams = (examsR.data || []).map(fromExamRow);
  db.recordings = Object.fromEntries((recR.data || []).map(r => [r.chapter, r.url]));
  db.materials = Object.fromEntries((matR.data || []).map(r => [r.chapter, { url: r.url || '', file_path: r.file_path || '', file_name: r.file_name || '' }]));
  db.examAccessRows = accessR.data || [];

  if (admin) {
    const [usersR, questionsR, attemptsR, mistakesR, annoR] = await Promise.all([
      sb.from('profiles').select('*').order('created_at', { ascending: false }),
      sb.from('questions').select('*').order('created_at', { ascending: false }),
      sb.from('attempts').select('*').order('submitted_at', { ascending: true }).limit(8000),
      sb.from('mistakes').select('*').limit(8000),
      sb.from('annotations').select('*').order('created_at', { ascending: false }).limit(4000)
    ]);
    db.users = (usersR.data || []).map(fromProfileRow);
    db.questions = (questionsR.data || []).map(q => fromQuestionRow(q, true));
    db.attempts = (attemptsR.data || []).map(fromAttemptRow);
    db.mistakes = (mistakesR.data || []).map(fromMistakeRow);
    db.annotations = (annoR.data || []).map(fromAnnotationRow);
  } else {
    db.users = [fromProfileRow(me)];
    if (me.status === 'approved') {
      const [questionsR, attemptsR, mistakesR, hwProgR, annoR] = await Promise.all([
        sb.rpc('get_study_questions_for_student'),
        sb.from('attempts').select('*').eq('user_id', user.id).order('submitted_at', { ascending: true }),
        sb.from('mistakes').select('*').eq('user_id', user.id),
        sb.rpc('get_chapter_homework_progress'),
        sb.from('annotations').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
      ]);
      db.questions = (questionsR.data || []).map(q => fromQuestionRow(q, false));
      db.attempts = (attemptsR.data || []).map(fromAttemptRow);
      db.mistakes = (mistakesR.data || []).map(fromMistakeRow);
      db.hwProgress = hwProgR.data || [];
      db.annotations = (annoR.data || []).map(fromAnnotationRow);
    }
  }
  S.db = db;
}
const loadDb = () => S.db;

/* ---------- questions / exams / chapters (admin) ---------- */
function parseTable(text) {
  const rows = String(text || '').split('\n').map(l => l.trim()).filter(Boolean).map(l => l.replace(/^\||\|$/g, '').split(/\||\t/).map(c => c.trim()));
  if (!rows.length) return { rows: [] };
  const w = Math.max(...rows.map(r => r.length));
  if (rows.length < 2 || w < 2) return { rows: [], error: 'A table needs a header row, at least one data row, and two or more columns.' };
  return { rows: rows.map(r => { while (r.length < w) r.push(''); return r; }) };
}
const tableToText = t => t && t.rows ? t.rows.map(r => r.join(' | ')).join('\n') : '';

async function saveQuestion(q) {
  const payload = toQuestionPayload(q);
  if (q.id && S.db.questions.some(x => x.id === q.id)) {
    const { error } = await sb.from('questions').update(Object.assign({}, payload, { updated_at: new Date().toISOString() })).eq('id', q.id);
    if (error) { toast(friendlyDbError(error), 'bad'); return null; }
    Object.assign(S.db.questions.find(x => x.id === q.id), q, { updatedAt: now() });
    sweepImages();
    return q.id;
  }
  const { data, error } = await sb.from('questions').insert(payload).select().single();
  if (error) { toast(friendlyDbError(error), 'bad'); return null; }
  S.db.questions.push(fromQuestionRow(data, true));
  sweepImages();
  return data.id;
}
async function deleteQuestion(id) {
  const { error } = await sb.from('questions').delete().eq('id', id);
  if (error) { toast(friendlyDbError(error), 'bad'); return; }
  S.db.questions = S.db.questions.filter(q => q.id !== id);
  S.db.exams.forEach(e => { e.qids = e.qids.filter(x => x !== id); });
  S.db.mistakes = S.db.mistakes.filter(m => m.qid !== id);
  sweepImages();
}
const examsUsing = (db, qid) => db.exams.filter(e => e.qids.includes(qid));
async function saveExam(e) {
  const payload = { title: e.title, description: e.description, type: e.type, minutes: e.minutes, attempts: e.attempts, shuffle: e.shuffle, status: e.status, qids: e.qids };
  if (e.id && S.db.exams.some(x => x.id === e.id)) {
    const { error } = await sb.from('exams').update(payload).eq('id', e.id);
    if (error) { toast(friendlyDbError(error), 'bad'); return null; }
    Object.assign(S.db.exams.find(x => x.id === e.id), e);
    return e.id;
  }
  const { data, error } = await sb.from('exams').insert(payload).select().single();
  if (error) { toast(friendlyDbError(error), 'bad'); return null; }
  S.db.exams.unshift(fromExamRow(data));
  return data.id;
}
async function deleteExam(id) {
  const { error } = await sb.from('exams').delete().eq('id', id);
  if (error) { toast(friendlyDbError(error), 'bad'); return; }
  S.db.exams = S.db.exams.filter(e => e.id !== id);
  S.db.attempts = S.db.attempts.filter(a => a.examId !== id);
}
async function addChapter(name) {
  const { error } = await sb.from('chapters').insert({ name, position: S.db.chapters.length });
  if (error) return { ok: false, error: friendlyDbError(error) };
  S.db.chapters.push(name); return { ok: true };
}
async function deleteChapter(name) {
  const { error } = await sb.from('chapters').delete().eq('name', name);
  if (error) { toast(friendlyDbError(error), 'bad'); return; }
  S.db.chapters = S.db.chapters.filter(c => c !== name);
}
/* ---------- recorded-session links (admin writes, student reads only) ---------- */
async function setRecording(chapter, url) {
  const u = String(url || '').trim();
  if (!u) {
    const { error } = await sb.from('recordings').delete().eq('chapter', chapter);
    if (error) { toast(friendlyDbError(error), 'bad'); return false; }
    delete S.db.recordings[chapter];
    return true;
  }
  const { error } = await sb.from('recordings').upsert({ chapter, url: u, updated_at: new Date().toISOString() });
  if (error) { toast(friendlyDbError(error), 'bad'); return false; }
  S.db.recordings[chapter] = u;
  return true;
}

/* ---------- lesson materials (admin writes files/links per chapter; student reads only) ---------- */
const MATERIALS_BUCKET = 'materials';
function materialPath(chapter, filename) {
  const slug = String(chapter).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'chapter';
  return `${slug}/${Date.now()}-${String(filename || 'file').replace(/[^A-Za-z0-9._-]+/g, '_')}`;
}
async function setMaterialLink(chapter, url) {
  const u = String(url || '').trim(), cur = S.db.materials[chapter] || {};
  if (!u && !cur.file_path) {
    const { error } = await sb.from('materials').delete().eq('chapter', chapter);
    if (error) { toast(friendlyDbError(error), 'bad'); return false; }
    delete S.db.materials[chapter];
    return true;
  }
  const { error } = await sb.from('materials').upsert({ chapter, url: u || null, file_path: cur.file_path || null, file_name: cur.file_name || null, updated_at: new Date().toISOString() });
  if (error) { toast(friendlyDbError(error), 'bad'); return false; }
  S.db.materials[chapter] = Object.assign({}, cur, { url: u });
  return true;
}
async function uploadMaterialFile(chapter, file) {
  if (file.size > 25 * 1024 * 1024) return { ok: false, error: 'That file is over 25 MB. Choose a smaller one.' };
  const cur = S.db.materials[chapter] || {}, path = materialPath(chapter, file.name);
  const { error: upErr } = await sb.storage.from(MATERIALS_BUCKET).upload(path, file, { upsert: false, contentType: file.type || undefined });
  if (upErr) return { ok: false, error: friendlyDbError(upErr) };
  const { error } = await sb.from('materials').upsert({ chapter, url: cur.url || null, file_path: path, file_name: file.name, updated_at: new Date().toISOString() });
  if (error) { sb.storage.from(MATERIALS_BUCKET).remove([path]).catch(() => { }); return { ok: false, error: friendlyDbError(error) }; }
  if (cur.file_path && cur.file_path !== path) sb.storage.from(MATERIALS_BUCKET).remove([cur.file_path]).catch(() => { });
  S.db.materials[chapter] = Object.assign({}, cur, { file_path: path, file_name: file.name });
  return { ok: true };
}
async function removeMaterialFile(chapter) {
  const cur = S.db.materials[chapter] || {};
  if (cur.file_path) await sb.storage.from(MATERIALS_BUCKET).remove([cur.file_path]).catch(() => { });
  if (!cur.url) {
    const { error } = await sb.from('materials').delete().eq('chapter', chapter);
    if (error) return { ok: false, error: friendlyDbError(error) };
    delete S.db.materials[chapter];
  } else {
    const { error } = await sb.from('materials').upsert({ chapter, url: cur.url, file_path: null, file_name: null, updated_at: new Date().toISOString() });
    if (error) return { ok: false, error: friendlyDbError(error) };
    S.db.materials[chapter] = { url: cur.url };
  }
  return { ok: true };
}
function materialUrlFor(path) { return path ? sb.storage.from(MATERIALS_BUCKET).getPublicUrl(path).data.publicUrl : ''; }

/* ---------- practice / retry grading ---------- */
async function recordPracticeAnswer(kind, title, userId, qid, chosen, aid) {
  const { data, error } = await sb.rpc('submit_practice_answer', { p_attempt_id: aid || null, p_kind: kind, p_title: title, p_qid: qid, p_chosen: chosen });
  if (error) { toast(friendlyDbError(error), 'bad'); return null; }
  const ts = now();
  let a = S.db.attempts.find(x => x.id === data.attempt_id);
  if (!a) { a = { id: data.attempt_id, userId, kind, examId: null, title, startedAt: ts, submittedAt: ts, minutes: 0, qids: [], answers: {}, flags: {}, results: {}, score: 0, total: 0, status: 'submitted' }; S.db.attempts.push(a); }
  if (!a.results[qid]) {
    a.qids.push(qid); a.answers[qid] = chosen; a.results[qid] = { chosen, correct: data.correct }; a.total++; if (data.correct) a.score++; a.submittedAt = ts;
  }
  const q = S.db.questions.find(x => x.id === qid); if (q) { q.answer = data.answer; q.explanation = data.explanation; }
  let m = S.db.mistakes.find(x => x.qid === qid && x.userId === userId);
  if (!data.correct) {
    if (!m) { m = { id: userId + ':' + qid, userId, qid, wrongCount: 0, firstAt: ts, lastAt: ts, resolved: false, resolvedAt: null, reason: '', lastChosen: null }; S.db.mistakes.push(m); }
    m.wrongCount++; m.lastAt = ts; m.resolved = false; m.resolvedAt = null; m.lastChosen = chosen;
  } else if (kind === 'retry' && m && !m.resolved) { m.resolved = true; m.resolvedAt = ts; }
  return { aid: a.id, correct: data.correct };
}
const examAttempts = (db, uidv, eid) => db.attempts.filter(a => a.userId === uidv && a.examId === eid);
function examState(db, e, uidv) {
  const mine = examAttempts(db, uidv, e.id);
  const done = mine.filter(a => a.status === 'submitted');
  const prog = mine.find(a => a.status === 'in_progress') || null;
  const left = e.attempts === 0 ? Infinity : e.attempts - mine.length;
  const best = done.length ? Math.max(...done.map(a => pct(a.score, a.total) || 0)) : null;
  const access = hasExamAccess(db, e.id, uidv);
  return { mine, done, prog, left, best, access };
}
async function setExamAccess(examId, userId, granted) {
  if (granted) {
    const { error } = await sb.from('exam_access').insert({ exam_id: examId, user_id: userId });
    if (error && !/duplicate key/i.test(error.message)) { toast(friendlyDbError(error), 'bad'); return false; }
    if (!S.db.examAccessRows.some(r => r.exam_id === examId && r.user_id === userId)) S.db.examAccessRows.push({ exam_id: examId, user_id: userId });
  } else {
    const { error } = await sb.from('exam_access').delete().eq('exam_id', examId).eq('user_id', userId);
    if (error) { toast(friendlyDbError(error), 'bad'); return false; }
    S.db.examAccessRows = S.db.examAccessRows.filter(r => !(r.exam_id === examId && r.user_id === userId));
  }
  return true;
}
async function startExam(examId, userId) {
  const { data, error } = await sb.rpc('start_exam', { p_exam_id: examId });
  if (error) return { ok: false, error: friendlyDbError(error) };
  await refreshAll();   // exam questions are only released to a student once an attempt exists
  let a = S.db.attempts.find(x => x.id === data.attempt_id);
  if (!a) {
    const e = S.db.exams.find(x => x.id === examId);
    a = { id: data.attempt_id, userId, kind: 'exam', examId, title: e ? e.title : '', startedAt: +new Date(data.started_at), submittedAt: null, minutes: data.minutes, qids: data.qids, answers: {}, flags: {}, results: {}, score: 0, total: data.qids.length, status: 'in_progress', timedOut: false };
    S.db.attempts.push(a);
  }
  return { ok: true, aid: a.id };
}
async function saveExamAnswer(aid, qid, letter) {
  const a = S.db.attempts.find(x => x.id === aid); if (a) { if (letter) a.answers[qid] = letter; else delete a.answers[qid]; }
  const { error } = await sb.rpc('save_exam_progress', { p_attempt_id: aid, p_qid: qid, p_chosen: letter || null, p_flag: null });
  if (error) toast(friendlyDbError(error), 'bad');
}
async function toggleFlag(aid, qid) {
  const a = S.db.attempts.find(x => x.id === aid); let next = null;
  if (a) { next = !a.flags[qid]; if (next) a.flags[qid] = true; else delete a.flags[qid]; }
  const { error } = await sb.rpc('save_exam_progress', { p_attempt_id: aid, p_qid: qid, p_chosen: null, p_flag: next });
  if (error) toast(friendlyDbError(error), 'bad');
}
async function submitExam(aid) {
  const { data, error } = await sb.rpc('submit_exam', { p_attempt_id: aid });
  const a = S.db.attempts.find(x => x.id === aid);
  if (error) { toast(friendlyDbError(error), 'bad'); return a; }
  if (a) {
    a.status = 'submitted'; a.score = data.score; a.total = data.total; a.timedOut = data.timed_out; a.submittedAt = now();
    const { data: row } = await sb.from('attempts').select('results,submitted_at').eq('id', aid).maybeSingle();
    if (row) {
      a.submittedAt = +new Date(row.submitted_at);
      const results = {};
      Object.entries(row.results || {}).forEach(([qid, r]) => {
        results[qid] = { chosen: r.chosen, correct: r.correct };
        const q = S.db.questions.find(x => x.id === qid); if (q) { q.answer = r.answer; q.explanation = r.explanation; }
        if (!r.correct) {
          let m = S.db.mistakes.find(x => x.qid === qid && x.userId === a.userId);
          if (!m) { m = { id: a.userId + ':' + qid, userId: a.userId, qid, wrongCount: 0, firstAt: now(), lastAt: now(), resolved: false, resolvedAt: null, reason: '', lastChosen: null }; S.db.mistakes.push(m); }
          m.wrongCount++; m.lastAt = now(); m.resolved = false; m.lastChosen = r.chosen;
        }
      });
      a.results = results; a.resultsFull = row.results;
    }
  }
  return a;
}
function autoSubmitExpired(userId) {
  S.db.attempts.filter(a => a.userId === userId && a.status === 'in_progress' && now() >= a.startedAt + a.minutes * 60000)
    .forEach(a => { submitExam(a.id); });
}
async function setMistakeReason(userId, qid, reason) {
  const m = S.db.mistakes.find(x => x.qid === qid && x.userId === userId); if (m) m.reason = reason;
  const { error } = await sb.from('mistakes').update({ reason }).eq('user_id', userId).eq('qid', qid);
  if (error) toast(friendlyDbError(error), 'bad');
}
/* ---------- annotations (teacher writes, student reads only) ---------- */
async function addAnnotation(userId, body) {
  const { data, error } = await sb.from('annotations').insert({ user_id: userId, body }).select().single();
  if (error) { toast(friendlyDbError(error), 'bad'); return null; }
  const row = fromAnnotationRow(data); S.db.annotations.unshift(row); return row;
}
async function deleteAnnotation(id) {
  const { error } = await sb.from('annotations').delete().eq('id', id);
  if (error) { toast(friendlyDbError(error), 'bad'); return; }
  S.db.annotations = S.db.annotations.filter(a => a.id !== id);
}
const studentAnnotations = (db, uid) => (db.annotations || []).filter(a => a.userId === uid).sort((a, b) => b.createdAt - a.createdAt);

/* ---------- analytics (pure functions over the in-memory mirror; unchanged from the local-storage version) ---------- */
function resultsOf(db, filterFn) {
  const out = [];
  db.attempts.forEach(a => { if (a.status !== 'submitted' || (filterFn && !filterFn(a))) return; Object.keys(a.results || {}).forEach(qid => out.push({ a, qid, r: a.results[qid] })); });
  return out;
}
function chapterStats(db, userId) {
  const qm = Object.fromEntries(db.questions.map(q => [q.id, q])), agg = {};
  resultsOf(db, a => !userId || a.userId === userId).forEach(({ qid, r }) => {
    const q = qm[qid]; if (!q) return;
    const c = agg[q.chapter] || (agg[q.chapter] = { chapter: q.chapter, answered: 0, correct: 0 });
    c.answered++; if (r.correct) c.correct++;
  });
  return Object.values(agg).map(c => Object.assign(c, { pct: pct(c.correct, c.answered) })).sort((a, b) => a.pct - b.pct || b.answered - a.answered);
}
function userStats(db, userId) {
  const at = db.attempts.filter(a => a.userId === userId && a.status === 'submitted').sort((a, b) => a.submittedAt - b.submittedAt);
  let answered = 0, correct = 0, pAnswered = 0, pCorrect = 0;
  at.forEach(a => Object.values(a.results || {}).forEach(r => { answered++; if (r.correct) correct++; if (a.kind !== 'exam') { pAnswered++; if (r.correct) pCorrect++; } }));
  const exams = at.filter(a => a.kind === 'exam');
  const ex = exams.map(a => pct(a.score, a.total) || 0);
  const qids = new Set(db.questions.map(q => q.id));
  const openMistakes = db.mistakes.filter(m => m.userId === userId && !m.resolved && qids.has(m.qid)).length;
  const resolved = db.mistakes.filter(m => m.userId === userId && m.resolved && qids.has(m.qid)).length;
  const u = userById(db, userId);
  return {
    attempts: at.length, answered, correct, accuracy: pct(correct, answered), practiceAccuracy: pct(pCorrect, pAnswered),
    exams: exams.length, avgExam: ex.length ? Math.round(avg(ex)) : null, lastExam: ex.length ? ex[ex.length - 1] : null,
    trend: ex.length >= 2 ? ex[ex.length - 1] - ex[ex.length - 2] : null,
    openMistakes, resolved, lastActive: Math.max((u && u.lastLogin) || 0, at.length ? at[at.length - 1].submittedAt : 0) || null,
    lastWork: at.length ? at[at.length - 1].submittedAt : null
  };
}
function dailyActivity(db, days) {
  const t0 = startOfDay(now()), out = [];
  for (let i = days - 1; i >= 0; i--) out.push({ day: t0 - i * DAY, n: 0 });
  db.attempts.forEach(a => { if (a.status !== 'submitted') return; const d = out.find(x => x.day === startOfDay(a.submittedAt)); if (d) d.n += Object.keys(a.results || {}).length; });
  return out;
}
function hardestQuestions(db, n) {
  const agg = {};
  resultsOf(db).forEach(({ qid, r }) => { const x = agg[qid] || (agg[qid] = { qid, seen: 0, miss: 0 }); x.seen++; if (!r.correct) x.miss++; });
  const qm = Object.fromEntries(db.questions.map(q => [q.id, q]));
  return Object.values(agg).filter(x => x.seen >= 3 && qm[x.qid]).map(x => Object.assign(x, { q: qm[x.qid], missPct: pct(x.miss, x.seen) })).sort((a, b) => b.missPct - a.missPct || b.seen - a.seen).slice(0, n);
}
function questionAccuracy(db) {
  const agg = {}; resultsOf(db).forEach(({ qid, r }) => { const x = agg[qid] || (agg[qid] = { seen: 0, ok: 0 }); x.seen++; if (r.correct) x.ok++; }); return agg;
}
function reasonCounts(db, userId) {
  const c = {}; db.mistakes.filter(m => m.userId === userId && m.reason).forEach(m => { c[m.reason] = (c[m.reason] || 0) + 1; }); return c;
}

/* =====================================================================
   Section 1b: photos for questions and answer choices, via Supabase
   Storage (bucket "question-images"). Compression is unchanged from
   the prototype — only where the bytes end up has changed.
   ===================================================================== */
const IMG_BUCKET = 'question-images';
const IMG = {
  cache: {}, pending: {},
  async get(path) {
    if (!path) return null;
    if (/^data:image\//.test(path)) return path;   // figures stored inline with the question (drawn diagrams)
    if (this.cache[path]) return this.cache[path];
    if (this.pending[path]) return this.pending[path];
    const p = (async () => {
      const { data, error } = await sb.storage.from(IMG_BUCKET).download(path);
      if (error || !data) return null;
      const url = URL.createObjectURL(data);
      this.cache[path] = url;
      return url;
    })();
    this.pending[path] = p;
    const url = await p; delete this.pending[path];
    return url;
  },
  async put(path, blob) {
    const { error } = await sb.storage.from(IMG_BUCKET).upload(path, blob, { contentType: 'image/jpeg', upsert: true });
    if (error) throw new Error('store');
    this.cache[path] = URL.createObjectURL(blob);
    return true;
  },
  async del(path) { delete this.cache[path]; try { await sb.storage.from(IMG_BUCKET).remove([path]); } catch (e) { } }
};
function imageRefs(db) {
  const s = new Set();
  db.questions.forEach(q => { if (q.image) s.add(q.image); Object.values(q.optImg || {}).forEach(r => { if (r) s.add(r); }); });
  return s;
}
/* Deletes any uploaded photo that no longer belongs to a question —
   called after saving/deleting a question. Admin-only (matches the
   storage delete policy); harmless no-op for students. */
async function sweepImages() {
  const me = currentUser(); if (!me || me.role !== 'admin') return;
  try {
    const refs = imageRefs(S.db);
    const { data } = await sb.storage.from(IMG_BUCKET).list('', { limit: 1000 });
    const orphans = (data || []).map(f => f.name).filter(n => !refs.has(n));
    if (orphans.length) await sb.storage.from(IMG_BUCKET).remove(orphans);
    orphans.forEach(n => delete IMG.cache[n]);
  } catch (e) { /* best-effort housekeeping; never block the UI on this */ }
}
const readFile = f => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(r.error || new Error('read')); r.readAsDataURL(f); });
const loadImg = src => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('decode')); i.src = src; });
async function compressImage(file, maxDim, quality) {
  const src = await readFile(file), img = await loadImg(src);
  let w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
  const s = Math.min(1, maxDim / Math.max(w, h)); w = Math.max(1, Math.round(w * s)); h = Math.max(1, Math.round(h * s));
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d'); if (!x) return await (await fetch(src)).blob();
  x.fillStyle = '#fff'; x.fillRect(0, 0, w, h); x.drawImage(img, 0, 0, w, h);
  const toBlob = q => new Promise(r => c.toBlob(r, 'image/jpeg', q));
  let blob = await toBlob(quality);
  if (blob && blob.size > 1.4e6) blob = await toBlob(0.65);
  return blob;
}
/* kind: 'stem' (large) or 'opt' (small, for answer choices). Resolves to a storage path used as the reference id. */
async function addImage(file, kind) {
  if (!file || !/^image\/(png|jpe?g|webp|gif|bmp)$/i.test(file.type)) throw new Error('type');
  if (file.size > 20 * 1024 * 1024) throw new Error('size');
  const blob = await compressImage(file, kind === 'stem' ? 1400 : 640, kind === 'stem' ? 0.88 : 0.85);
  if (!blob) throw new Error('store');
  const path = uid('im') + '.jpg';
  await IMG.put(path, blob);
  return path;
}

/* =====================================================================
   Section 2: demo data (sample questions, one exam, demo students).
   Everything created here is flagged is_demo so it can be removed in
   one click without touching the teacher's own content. Creating real,
   login-capable demo accounts needs the service_role key, so that part
   goes through the admin-actions Edge Function (see supabase/functions);
   the questions/exam/attempts/mistakes are plain admin-RLS inserts.
   ===================================================================== */
const SAMPLE_QUESTIONS = [
  ['Biochemistry', 'EASY', 'A student is testing a sample of cooled boiled rice water in the lab. After adding a few drops of iodine solution, the liquid turns blue-black. Which macromolecule is most likely present in the sample?',
    ['Protein', 'Starch', 'Glucose', 'Triglyceride', 'DNA'], 'B', 'Iodine forms a blue-black complex with starch. Proteins are detected with biuret reagent, and reducing sugars such as glucose with Benedict’s reagent after heating.'],
  ['Biochemistry', 'EASY', 'A nutrition label for a snack bar lists 12 g of protein, 30 g of carbohydrate and 5 g of fat. Using 4 kcal per gram for protein and carbohydrate and 9 kcal per gram for fat, what is the approximate energy content of one bar?',
    ['147 kcal', '183 kcal', '213 kcal', '243 kcal', '300 kcal'], 'C', '(12 × 4) + (30 × 4) + (5 × 9) = 48 + 120 + 45 = 213 kcal.'],
  ['Biochemistry', 'MEDIUM', 'A student measured the activity of an intestinal enzyme at six pH values, keeping temperature and substrate concentration constant. Which statement best explains the very low activity at pH 10?',
    ['The substrate had been completely used up.', 'The enzyme was denatured because the extreme pH altered the charges and shape of its active site.', 'The enzyme was permanently consumed in the reaction.', 'The activation energy of the reaction increased because the substrate concentration was too high.', 'The reaction reached equilibrium at pH 10.'], 'B',
    'Extreme pH changes the ionization of amino acid side chains, disrupting the ionic and hydrogen bonds that hold the active site in shape. The enzyme denatures and can no longer bind its substrate. Enzymes are catalysts and are not consumed.',
    { caption: 'Relative enzyme activity at different pH values', rows: [['pH', 'Relative activity (%)'], ['2', '5'], ['4', '20'], ['6', '85'], ['7', '100'], ['8', '60'], ['10', '8']] }],
  ['The Cell', 'MEDIUM', 'A potato cylinder with an initial mass of 5.0 g is placed in a 0.6 M sucrose solution. After one hour its mass has fallen to 4.2 g. Which statement best explains this change?',
    ['Sucrose entered the cells by active transport, displacing water.', 'Water left the cells by osmosis because the solution had a lower water potential than the cell cytoplasm.', 'Water entered the cells by osmosis because the solution was hypotonic to the cytoplasm.', 'The cell walls dissolved and released starch into the solution.', 'Water left the cells by active transport using ATP.'], 'B',
    'The mass fell, so there was a net loss of water. The 0.6 M solution has a lower water potential than the cells, so water moved out by osmosis. Osmosis is passive and needs no ATP.'],
  ['Cell Respiration', 'EASY', 'Yeast cells are suspended in a glucose solution in a sealed flask from which all oxygen has been removed. Bubbles form, and gas from the flask turns limewater cloudy. Which pair of products, in addition to a small amount of ATP, is formed by the yeast?',
    ['Ethanol and carbon dioxide', 'Lactic acid and carbon dioxide', 'Water and carbon dioxide', 'Ethanol and oxygen', 'Lactic acid only'], 'A',
    'Without oxygen, yeast carry out alcoholic fermentation: pyruvate is converted to ethanol and CO2, which regenerates NAD+ so glycolysis can continue. Lactic acid fermentation occurs in animal muscle and some bacteria.'],
  ['Photosynthesis', 'MEDIUM', 'In a classroom experiment, small discs cut from spinach leaves are placed in a syringe of dilute sodium bicarbonate solution, and air is drawn out so the discs sink. Under a bright lamp, the discs slowly rise to the surface. What is the main reason the discs rise?',
    ['Oxygen released by the light-dependent reactions collects in the air spaces of the leaf tissue.', 'Carbon dioxide released by respiration collects in the air spaces of the leaf tissue.', 'Glucose made in the light-independent reactions makes the discs less dense.', 'Water evaporating from the discs forms vapor bubbles in the solution.', 'Bicarbonate ions are converted to nitrogen gas by the chloroplasts.'], 'A',
    'Water is split in the light-dependent reactions and O2 is released. The gas collects in the air spaces and makes the discs buoyant. The bicarbonate supplies CO2 for the Calvin cycle, so CO2 is consumed rather than released.'],
  ['Cell Division', 'MEDIUM', 'A fruit fly body cell contains 8 chromosomes. A researcher follows one such cell as it completes meiosis in the testis. How many cells are produced, and how many chromosomes does each contain?',
    ['2 cells, 8 chromosomes each', '2 cells, 4 chromosomes each', '4 cells, 8 chromosomes each', '4 cells, 4 chromosomes each', '4 cells, 2 chromosomes each'], 'D',
    'Meiosis has two divisions but only one round of DNA replication, giving four haploid cells. The haploid number is 8 ÷ 2 = 4 chromosomes.'],
  ['Classical Genetics', 'EASY', 'In garden peas, round seed shape (R) is dominant to wrinkled (r). A grower crosses a heterozygous round-seeded plant with a wrinkled-seeded plant and collects 200 seeds. How many round seeds should be expected?',
    ['50', '100', '150', '200', '25'], 'B', 'Rr × rr gives ½ Rr (round) and ½ rr (wrinkled). Half of 200 seeds is 100.'],
  ['Classical Genetics', 'HARD', 'A woman with blood type A, whose mother had blood type O, has a child with a man who has blood type AB. What is the probability that their child has blood type B?',
    ['0%', '12.5%', '25%', '50%', '75%'], 'C',
    'The woman inherited an i allele from her type O mother, so her genotype is IAi. The man is IAIB. The child is type B only if it receives IB from the father (½) and i from the mother (½): ½ × ½ = ¼ = 25%.'],
  ['Molecular Genetics', 'MEDIUM', 'A researcher sequences a short gene segment. The template strand reads 3′-TAC GGA CTT-5′. Which mRNA is transcribed from this template?',
    ['5′-AUG CCU GAA-3′', '5′-UAC GGA CUU-3′', '5′-ATG CCT GAA-3′', '3′-AUG CCU GAA-5′', '5′-TAC GGA CTT-3′'], 'A',
    'RNA polymerase reads the template 3′→5′ and builds mRNA 5′→3′ with complementary bases (A–U, T–A, G–C, C–G). Option C contains thymine, which is found in DNA, not RNA. Option D pairs the bases in the wrong orientation.'],
  ['Evolution', 'MEDIUM', 'Ecologists measured beak depth in a finch population on a small island over three years. A drought in 2020 reduced the supply of small, soft seeds. Which process best explains the change in mean beak depth?',
    ['Individual birds grew deeper beaks by cracking hard seeds and passed the change to their offspring.', 'Natural selection favored heritable variation for deeper beaks when hard seeds were the main food.', 'Genetic drift changed allele frequencies because the population size fell.', 'Gene flow from a neighboring island introduced deep-beaked birds.', 'Mutations caused by the drought produced deeper beaks in the survivors.'], 'B',
    'Birds with deeper beaks could crack the hard seeds, survived better and left more offspring, so the heritable trait became more common. Acquired changes are not inherited, and nothing in the data points to gene flow or drought-induced mutation.',
    { caption: 'Finch population on a small island', rows: [['Year', 'Mean beak depth (mm)', 'Population size'], ['2019', '9.2', '810'], ['2020', '9.3', '360'], ['2021', '10.1', '430']] }],
  ['Ecology', 'MEDIUM', 'A team estimates the energy captured at each trophic level of a grassland ecosystem. What percentage of the energy in the primary consumers is transferred to the secondary consumers?',
    ['1.3%', '7.2%', '9.0%', '13.9%', '72.0%'], 'D',
    '(250 ÷ 1 800) × 100 = 13.9%. The 9.0% option is the producer-to-primary-consumer transfer (1 800 ÷ 20 000).',
    { caption: 'Energy at each trophic level', rows: [['Trophic level', 'Energy (kJ/m²/year)'], ['Producers', '20 000'], ['Primary consumers', '1 800'], ['Secondary consumers', '250'], ['Tertiary consumers', '20']] }],
  ['Taxonomy', 'EASY', 'A microbiologist isolates a single-celled organism from a hot spring at 85 °C. It has no nucleus and no membrane-bound organelles, and its cell wall contains no peptidoglycan. In which domain should it be classified?',
    ['Bacteria', 'Archaea', 'Eukarya, kingdom Protista', 'Eukarya, kingdom Fungi', 'It is a virus and belongs to no domain'], 'B',
    'Prokaryotic cells without peptidoglycan walls, often found in extreme environments, are archaea. Bacteria have peptidoglycan, eukaryotes have a nucleus, and viruses are not cellular.'],
  ['Endocrine System', 'HARD', 'A patient’s blood test after an overnight fast shows high glucose and higher-than-normal insulin. His muscle and fat cells take up very little glucose. Which explanation is most consistent with these results?',
    ['His alpha cells are secreting too little glucagon.', 'His beta cells have been destroyed, so no insulin is made.', 'His target cells respond poorly to insulin.', 'His liver is converting excess insulin into glucose.', 'His kidneys are absorbing too much insulin from the blood.'], 'C',
    'High insulin together with high glucose means the hormone is present but its effect is reduced, which is insulin resistance, as in type 2 diabetes. Destroyed beta cells would give low insulin.'],
  ['Biochemistry', 'HARD', 'Insulin is made of two polypeptide chains, one of 21 amino acids and one of 30 amino acids, joined by disulfide bonds. How many water molecules are released when the peptide bonds of these two chains form?',
    ['48', '49', '50', '51', '102'], 'B',
    'A chain of n amino acids has n − 1 peptide bonds, and each one is formed by dehydration synthesis that releases one water molecule: (21 − 1) + (30 − 1) = 20 + 29 = 49. Disulfide bonds between chains are not peptide bonds.'],
  ['Ecology', 'HARD', 'To estimate the size of a turtle population in a pond, researchers marked and released 60 turtles. One week later they captured 45 turtles, of which 9 were marked. Assuming a closed population and no loss of marks, what is the best estimate of the population size?',
    ['135', '240', '300', '405', '540'], 'C',
    'Population estimate = (marked first sample × second sample) ÷ marked recaptured = (60 × 45) ÷ 9 = 300.']
];