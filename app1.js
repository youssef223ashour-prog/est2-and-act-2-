const LOGO_FULL='data:image/jpeg;base64,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';
const LOGO_EMBLEM='data:image/jpeg;base64,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';

'use strict';
/* =====================================================================
   Mr Youssef Ashour · The Biology Tutor — EST II / ACT II Biology
   Section 1: constants, utilities, Supabase-backed data layer, analytics

   S.db is an in-memory mirror of the caller's own visible slice of the
   database (populated by refreshAll()). View code (js3, js5, js6) reads
   S.db synchronously, exactly as it did when this was a localStorage
   prototype — only the functions in THIS file talk to the network.
   Every write below updates S.db to match immediately (optimistic), so
   the UI never has to wait on a round trip to redraw.
   ===================================================================== */
const BRAND = { name: 'Mr Youssef Ashour', tag: 'The Biology Tutor', wa: '201039383329', waShow: '+20 103 938 3329' };
const TKEY = 'ybt:theme:v1';
const LETTERS = ['A', 'B', 'C', 'D', 'E'];
const GRADES = ['10', '11', '12'];
const EXAM_TYPES = ['EST II', 'ACT II', 'Mixed'];
const LEVELS = [['EASY', 'Easy'], ['MEDIUM', 'Medium'], ['HARD', 'Hard']];
const levelName = t => (LEVELS.find(l => l[0] === t) || [0, t])[1];
const normTier = t => { t = String(t || '').toUpperCase(); return t === 'CORE' ? 'MEDIUM' : t === 'EXTRA' ? 'HARD' : ['EASY', 'MEDIUM', 'HARD'].includes(t) ? t : 'MEDIUM'; };
const qTitle = q => q.stem || (q.image ? 'Question shown as a photo' : 'Untitled question');
const REASONS = {
  content: "I didn't know the content", misread: 'I misread the question', data: 'I misread the table or graph',
  calc: 'I made a calculation slip', time: 'I ran out of time', guess: 'I guessed'
};
const DEFAULT_CHAPTERS = ['Biochemistry', 'Cell Structure & Transport', 'Enzymes', 'Cellular Respiration', 'Photosynthesis',
  'Cell Division', 'Classical Genetics', 'Molecular Genetics', 'Evolution', 'Ecology', 'Taxonomy & Diversity',
  'Human Physiology', 'Plant Biology', 'Lab Skills & Data Analysis'];
// The six body-system chapters are grouped under one "Human Systems" tile in the
// Classified Questions / Homework chapter pickers (see groupHumanSystems in app4.js).
// They stay as separate rows in the real `chapters` table — this is UI-only grouping.
const HUMAN_SYSTEMS = ['Digestive System', 'Circulatory System', 'Immune System', 'Nervous System', 'Endocrine System', 'Reproductive System'];
const HEARD_ABOUT = [['social', 'Social media'], ['friend', 'A friend'], ['family', 'A family member'], ['other', 'Other']];
const heardAboutLabel = v => (HEARD_ABOUT.find(x => x[0] === v) || [v, v])[1];
const S = { db: null, userId: null, run: null, ui: {}, params: new URLSearchParams(), ready: false, authError: null };

/* ---------- utilities ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = p => (p || 'id') + '_' + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-3);
const now = () => Date.now();
const DAY = 86400000;
const sum = a => a.reduce((x, y) => x + y, 0);
const avg = a => a.length ? sum(a) / a.length : null;
const pct = (n, d) => d ? Math.round(n / d * 100) : null;
const fmtPct = v => v == null ? '—' : v + '%';
const plural = (n, w, pl) => n + ' ' + (n === 1 ? w : (pl || w + 's'));
const fmtDate = ts => new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
const fmtDateTime = ts => fmtDate(ts) + ', ' + new Date(ts).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
const startOfDay = ts => { const d = new Date(ts); d.setHours(0, 0, 0, 0); return d.getTime(); };
function ago(ts) {
  if (!ts) return 'Never';
  const d = Math.round((startOfDay(now()) - startOfDay(ts)) / DAY);
  if (d <= 0) return 'Today'; if (d === 1) return 'Yesterday'; if (d < 7) return d + ' days ago';
  return fmtDate(ts);
}
function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
const initials = n => String(n || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
const firstName = n => String(n || '').trim().split(/\s+/)[0] || '';
const trunc = (s, n) => { s = String(s || ''); return s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s; };
function mmss(ms) { ms = Math.max(0, ms); const s = Math.ceil(ms / 1000); return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); }
const tone = p => p == null ? '' : p < 50 ? 'low' : p < 75 ? 'mid' : 'high';
const store = { get(k) { try { return window.localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { window.localStorage.setItem(k, v); } catch (e) { } } };
const DEVKEY = 'ybt:device:v1';
function deviceToken() {
  let t = store.get(DEVKEY);
  if (t) return t;
  t = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : (uid() + uid());
  store.set(DEVKEY, t);
  return store.get(DEVKEY) === t ? t : null;
}

/* ---------- Supabase client ---------- */
// CONFIG comes from config.js, loaded before this file.
const sb = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false }
});
const AUTH_DOMAIN = CONFIG.AUTH_DOMAIN || 'students.ybt.invalid';
const emailFor = username => String(username).trim().toLowerCase() + '@' + AUTH_DOMAIN;
function friendlyDbError(e) {
  const m = (e && e.message) || String(e);
  if (/profiles_username_key|duplicate key.*username/i.test(m)) return 'That username is taken. Try another.';
  if (/row-level security/i.test(m)) return 'That was not allowed.';
  if (/network|fetch/i.test(m)) return 'Could not reach the server. Check your connection and try again.';
  return m.replace(/^\w+:\s*/, '');
}

/* ---------- accounts ---------- */
const currentUser = () => S.userId ? (S.db.users || []).find(u => u.id === S.userId) || null : null;
const userById = (db, id) => db.users.find(u => u.id === id);
const students = db => db.users.filter(u => u.role === 'student');
const hasAdmin = () => (S.db.users || []).some(u => u.role === 'admin'); // only meaningful once an admin session has loaded

const USERNAME_RE = /^[a-z0-9._]{3,24}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const cleanPhone = p => String(p || '').trim().replace(/[\s\-().]/g, '');
const validPhone = p => /^\+?\d{8,15}$/.test(cleanPhone(p));
function canonPhone(p) { let d = cleanPhone(p).replace(/\D/g, ''); if (d.startsWith('00')) d = d.slice(2); if (d.startsWith('0') && d.length === 11) d = '20' + d.slice(1); return d; }
const waLink = p => 'https://wa.me/' + canonPhone(p);

async function registerStudent(f) {
  const errors = {};
  const name = String(f.name || '').trim().replace(/\s+/g, ' ');
  const un = String(f.username || '').trim().toLowerCase();
  const pw = String(f.password || '');
  const trial = String(f.trial || '').trim().slice(0, 120);
  let desiredScore = null;
  if (String(f.desiredScore || '').trim()) {
    const n = Number(f.desiredScore);
    if (!Number.isFinite(n) || n < 0 || n > 800) errors.desiredScore = 'Enter a score between 0 and 800.';
    else desiredScore = Math.round(n);
  }
  const firstTrialRaw = String(f.firstTrial || '').trim().toLowerCase();
  const firstTrial = firstTrialRaw === 'yes' || firstTrialRaw === 'no' ? firstTrialRaw : null;
  let previousScore = null;
  if (firstTrial === 'no') {
    const n = Number(f.previousScore);
    if (!String(f.previousScore || '').trim() || !Number.isFinite(n) || n < 0 || n > 800) errors.previousScore = 'Enter your previous score out of 800.';
    else previousScore = Math.round(n);
  }
  const heardRaw = String(f.heardAbout || '').trim().toLowerCase();
  const heardAbout = HEARD_ABOUT.some(x => x[0] === heardRaw) ? heardRaw : null;
  const heardAboutOther = heardAbout === 'other' ? String(f.heardAboutOther || '').trim().slice(0, 160) || null : null;
  const email = String(f.email || '').trim().toLowerCase();
  if (name.length < 3) errors.name = 'Enter your full name.';
  if (!USERNAME_RE.test(un)) errors.username = 'Use 3 to 24 letters, numbers, dots or underscores.';
  if (pw.length < 8) errors.password = 'Use at least 8 characters.';
  if (!EMAIL_RE.test(email)) errors.email = 'Enter a valid email address.';
  if (!GRADES.includes(f.grade)) errors.grade = 'Choose your grade.';
  if (!validPhone(f.phone)) errors.phone = 'Enter a valid phone number, for example 01012345678.';
  if (!validPhone(f.parentPhone)) errors.parentPhone = 'Enter a valid phone number for your parent.';
  else if (!errors.phone && canonPhone(f.phone) === canonPhone(f.parentPhone)) errors.parentPhone = 'Use your parent’s number, not your own.';
  if (Object.keys(errors).length) return { ok: false, errors };

  const { data, error } = await sb.auth.signUp({ email: emailFor(un), password: pw });
  if (error) {
    if (/already registered|already exists/i.test(error.message)) return { ok: false, errors: { username: 'That username is taken. Try another.' } };
    return { ok: false, errors: { form: friendlyDbError(error) } };
  }
  const { error: perr } = await sb.from('profiles').insert({
    id: data.user.id, role: 'student', name, username: un, grade: f.grade,
    phone: cleanPhone(f.phone), parent_phone: cleanPhone(f.parentPhone), status: 'pending',
    desired_score: desiredScore, trial: trial || null, email,
    first_trial: firstTrial, previous_score: previousScore,
    heard_about: heardAbout, heard_about_other: heardAboutOther
  });
  if (perr) { await sb.auth.signOut(); return { ok: false, errors: { username: friendlyDbError(perr) } }; }
  await sb.auth.signOut();
  return { ok: true, name };
}
async function createAdmin(f) {
  const errors = {};
  const name = String(f.name || '').trim().replace(/\s+/g, ' ');
  const un = String(f.username || '').trim().toLowerCase();
  if (name.length < 3) errors.name = 'Enter your name.';
  if (!USERNAME_RE.test(un)) errors.username = 'Use 3 to 24 letters, numbers, dots or underscores.';
  if (String(f.password || '').length < 8) errors.password = 'Use at least 8 characters.';
  if (f.password !== f.confirm) errors.confirm = 'The passwords do not match.';
  if (Object.keys(errors).length) return { ok: false, errors };

  const { data, error } = await sb.auth.signUp({ email: emailFor(un), password: f.password });
  if (error) {
    if (/already registered|already exists/i.test(error.message)) return { ok: false, errors: { username: 'That username is taken.' } };
    return { ok: false, errors: { form: friendlyDbError(error) } };
  }
  const { error: perr } = await sb.from('profiles').insert({ id: data.user.id, role: 'admin', name, username: un, status: 'approved' });
  if (perr) {
    await sb.auth.signOut();
    if (/row-level security/i.test(perr.message)) return { ok: false, errors: { form: 'A teacher account already exists. Sign in instead.' } };
    return { ok: false, errors: { username: friendlyDbError(perr) } };
  }
  return { ok: true };
}
async function login(username, password) {
  const un = String(username || '').trim().toLowerCase();
  const { data, error } = await sb.auth.signInWithPassword({ email: emailFor(un), password });
  if (error) return { ok: false, error: /invalid login credentials/i.test(error.message) ? 'Username or password is incorrect.' : friendlyDbError(error) };
  const { data: prof, error: perr } = await sb.from('profiles').select('*').eq('id', data.user.id).maybeSingle();
  if (perr || !prof) { await sb.auth.signOut(); return { ok: false, error: 'Your account could not be loaded. Try again.' }; }
  if (prof.role === 'student' && prof.status !== 'approved') return { ok: false, status: prof.status };
  if (prof.role === 'student' && prof.frozen) { await sb.auth.signOut(); return { ok: false, status: 'frozen' }; }
  if (prof.role === 'student') {
    const dev = deviceToken();
    if (dev) {
      try {
        const { data: chk, error: cerr } = await sb.rpc('check_or_bind_device', { p_token: dev });
        if (!cerr && chk && chk.ok === false) {
          await sb.auth.signOut();
          return { ok: false, status: 'device_locked' };
        }
      } catch (e) { /* network/infra hiccup: fail open rather than block a legitimate student */ }
    }
  }
  sb.from('profiles').update({ last_login: new Date().toISOString() }).eq('id', data.user.id).then(() => { });
  return { ok: true, user: fromProfileRow(prof) };
}
async function signOutNow() { try { await sb.auth.signOut(); } catch (e) { } }
async function changePassword(id, cur, next) {
  const u = currentUser();
  const { error: verr } = await sb.auth.signInWithPassword({ email: emailFor(u.username), password: cur });
  if (verr) return { ok: false, errors: { cur: 'That is not your current password.' } };
  if (String(next).length < 8) return { ok: false, errors: { next: 'Use at least 8 characters.' } };
  const { error } = await sb.auth.updateUser({ password: next });
  if (error) return { ok: false, errors: { next: friendlyDbError(error) } };
  return { ok: true };
}
/* Admin resetting a STUDENT's password needs the service-role key, which
   must never reach the browser — it goes through the admin-actions Edge
   Function instead. See supabase/functions/admin-actions. */
async function adminSetPassword(id, pw) {
  if (String(pw).length < 8) return { ok: false, error: 'Use at least 8 characters.' };
  return callAdminFn('reset_password', { target_user_id: id, new_password: pw });
}
async function resetStudentDevice(id) {
  return callAdminFn('reset_device', { target_user_id: id });
}
async function setStatus(id, status) {
  const u = userById(S.db, id); if (!u) return;
  const { error } = await sb.from('profiles').update({ status, decided_at: new Date().toISOString() }).eq('id', id);
  if (error) { toast(friendlyDbError(error), 'bad'); return; }
  u.status = status; u.decidedAt = now();
}
async function setFrozen(id, frozen) {
  const u = userById(S.db, id); if (!u) return;
  const { error } = await sb.from('profiles').update({ frozen }).eq('id', id);
  if (error) { toast(friendlyDbError(error), 'bad'); return; }
  u.frozen = frozen;
}
async function removeUser(id) {
  const r = await callAdminFn('delete_student', { target_user_id: id });
  if (!r.ok) { toast(r.error, 'bad'); return; }
  S.db.users = S.db.users.filter(u => u.id !== id);
  S.db.attempts = S.db.attempts.filter(a => a.userId !== id);
  S.db.mistakes = S.db.mistakes.filter(m => m.userId !== id);
}
async function callAdminFn(action, payload) {
  try {
    const { data: sess } = await sb.auth.getSession();
    const res = await fetch(CONFIG.SUPABASE_URL + '/functions/v1/admin-actions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + sess.session.access_token, apikey: CONFIG.SUPABASE_ANON_KEY },
      body: JSON.stringify(Object.assign({ action }, payload))
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: body.error || 'That did not work. Please try again.' };
    return Object.assign({ ok: true }, body);
  } catch (e) {
    return { ok: false, error: 'Could not reach the server for this. If you have not deployed the admin-actions function yet, see the README.' };
  }
}

/* ---------- mapping DB rows <-> the in-memory shapes the UI expects ---------- */
function fromProfileRow(p) {
  return {
    id: p.id, role: p.role, name: p.name, username: p.username, grade: p.grade,
    phone: p.phone, parentPhone: p.parent_phone, status: p.status, demo: p.is_demo,
    desiredScore: p.desired_score == null ? null : p.desired_score, trial: p.trial || '', email: p.email || '',
    firstTrial: p.first_trial || '', previousScore: p.previous_score == null ? null : p.previous_score,
    heardAbout: p.heard_about || '', heardAboutOther: p.heard_about_other || '', frozen: !!p.frozen,
    createdAt: +new Date(p.created_at), decidedAt: p.decided_at ? +new Date(p.decided_at) : null,
    lastLogin: p.last_login ? +new Date(p.last_login) : null
  };
}
function fromQuestionRow(q, isAdmin) {
  return {
    id: q.id, chapter: q.chapter, tier: q.tier, stem: q.stem, image: q.image || '', imageAlt: q.image_alt || '',
    lettersOnly: q.letters_only, table: q.table_rows ? { caption: q.table_caption, rows: q.table_rows } : null,
    options: q.options || {}, optImg: q.opt_img || {}, pool: q.pool || 'classified',
    answer: isAdmin ? q.answer : null, explanation: isAdmin ? (q.explanation || '') : null,
    demo: q.is_demo, createdAt: +new Date(q.created_at), updatedAt: +new Date(q.updated_at)
  };
}
function toQuestionPayload(q) {
  return {
    chapter: q.chapter, tier: q.tier, stem: q.stem || '', image: q.image || null, image_alt: q.imageAlt || '',
    letters_only: !!q.lettersOnly, table_caption: q.table ? (q.table.caption || '') : '', table_rows: q.table ? q.table.rows : null,
    options: q.options || {}, opt_img: q.optImg || {}, answer: q.answer, explanation: q.explanation || ''
  };
}