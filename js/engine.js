/* FamilyVerse AI — simulation engine.
   Each family member is an agent with a half-hour routine (48 slots a day), needs and traits.
   A decision changes parameters; a Monte Carlo loop simulates many weeks with random traffic,
   overtime, sick days and night wakings. Common random numbers keep comparisons fair. */
const ST = { SLEEP:0, WORK:1, SCHOOL:2, COMMUTE:3, BUSY:4, FREE:5, SCREEN:6, OUT:7, CARE:8, WFH:9, CLASS:10, DATE:11 };
const PRESENCE = [0, 0, 0, 0, 0.35, 1, 0.25, 0, 0.4, 0, 0, 1];
const LOADS = new Set([ST.WORK, ST.SCHOOL, ST.COMMUTE, ST.BUSY, ST.CARE, ST.WFH, ST.CLASS]);
const AT_HOME = new Set([ST.FREE, ST.BUSY, ST.CARE, ST.SCREEN]);
const ADULT_ROLES = ['father', 'mother', 'husband', 'wife'];

function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function rngFor(run, day, key) { return mulberry(hashStr(run + '|' + day + '|' + key)); }
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const kindOf = m => ADULT_ROLES.includes(m.role) ? 'adult' : m.role;

function fill(a, from, to, s) {
  const i = Math.max(0, Math.round(from * 2)), j = Math.min(48, Math.round(to * 2));
  if (to >= from) { for (let k = i; k < j; k++) a[k] = s; }
  else { for (let k = i; k < 48; k++) a[k] = s; for (let k = 0; k < Math.round(to * 2); k++) a[k] = s; }
}
function fillIf(a, from, to, s, allowed) {
  for (let k = Math.round(from * 2); k < Math.round(to * 2); k++) if (allowed.includes(a[k])) a[k] = s;
}

function newParams() {
  return { commute: {}, finance: {}, privacyLoss: {}, eveningOut: {}, study: {}, remote: {}, nightShift: {}, extraWork: {}, shiftStart: {},
    kidsBus: 0, elderLives: null, baby: false, maternity: null, phonesOff: null, space: 0, inlaws: false,
    dinner: false, homeworkHelper: null, choreShare: false, nightRota: false, privacyFix: false, earnedScreen: false,
    elderCalls: false, satMajlis: false, boundaryPlan: false, coupleRitual: false };
}

/* Effects are the shared language between preset decisions, Claude's reading of a custom decision, and the engine. */
function applyEffects(p, effects, members) {
  const ids = new Set(members.map(m => m.id));
  const ok = id => ids.has(id);
  for (const e of effects || []) {
    switch (e.type) {
      case 'commute': if (ok(e.member)) p.commute[e.member] = clamp(+e.minutesEachWay || 0, 0, 180); break;
      case 'extraWork': if (ok(e.member)) p.extraWork[e.member] = clamp(+e.hours || 0, 0, 4); break;
      case 'eveningOut': if (ok(e.member)) p.eveningOut[e.member] = { days: (e.days || []).map(Number).filter(d => d >= 0 && d <= 6), from: clamp(+e.from, 0, 24), to: clamp(+e.to, 0, 24) }; break;
      case 'study': if (ok(e.member)) p.study[e.member] = true; break;
      case 'remote': if (ok(e.member)) p.remote[e.member] = (e.days || []).map(Number).filter(d => d >= 0 && d <= 4); break;
      case 'nightShift': if (ok(e.member)) p.nightShift[e.member] = (e.days || []).map(Number).filter(d => d >= 0 && d <= 6); break;
      case 'elderLives': if (['home', 'nearby', 'far'].includes(e.value) && members.some(m => m.role === 'elder')) p.elderLives = e.value; break;
      case 'baby': p.baby = true; p.maternity = ok(e.member) ? e.member : (members.find(m => m.role === 'mother' || m.role === 'wife') || {}).id || null; break;
      case 'phonesOff': p.phonesOff = [clamp(+e.from || 19, 0, 23.5), clamp(+e.to || 21, 0.5, 24)]; break;
      case 'finance': if (ok(e.member)) p.finance[e.member] = clamp(+e.delta || 0, -0.3, 0.3); break;
      case 'privacyLoss': if (ok(e.member)) p.privacyLoss[e.member] = clamp(+e.value || 0, 0, 0.4); break;
      case 'kidsBus': p.kidsBus = clamp(+e.extraMinutes || 0, 0, 60); break;
      case 'space': p.space = clamp(+e.value || 0, 0, 0.2); break;
      case 'inlaws': if (members.some(m => m.role === 'husband')) p.inlaws = true; break;
    }
  }
  return p;
}

function household(members, p) {
  const ms = members.map(m => ({ ...m, traits: { ...m.traits } }));
  if (p.baby) ms.push({ id: 'baby', role: 'baby', g: 'm', derived: true, name: { en: 'New baby', ar: 'المولود الجديد' }, age: 0, traits: { social: .5, resilience: .5, screen: 0 } });
  if (p.inlaws) {
    ms.push({ id: 'saif', role: 'inlaw', g: 'm', derived: true, busy: 'majlis', name: { en: 'Saif', ar: 'سيف' }, note: { en: "Rashed's father", ar: 'والد راشد' }, age: 61, traits: { social: .6, resilience: .6, screen: .2 } });
    ms.push({ id: 'moza', role: 'inlaw', g: 'f', derived: true, busy: 'cook', name: { en: 'Moza', ar: 'موزة' }, note: { en: "Rashed's mother", ar: 'والدة راشد' }, age: 55, traits: { social: .75, resilience: .6, screen: .2 } });
  }
  return ms;
}

function screenSlots(a, ranges, prob, rng) {
  for (const [f, t] of ranges) for (let k = Math.round(f * 2); k < Math.round(t * 2); k++) if (a[k] === ST.FREE && rng() < prob) a[k] = ST.SCREEN;
}
function phonesOff(a, p, allow) {
  if (!p.phonesOff) return;
  const [f, t] = p.phonesOff;
  for (let k = Math.round(f * 2); k < Math.round(t * 2); k++) if (a[k] === ST.SCREEN && !(allow || []).includes(k)) a[k] = ST.FREE;
}

function buildAdult(m, p, d, rng, meta) {
  const a = new Array(48).fill(ST.FREE), wk = d < 5, fri = d === 4;
  const isMom = m.role === 'mother' || m.role === 'wife';
  let chores = (wk ? m.chores : m.choresWk).map(c => c.slice());
  if (p.choreShare) {
    if (isMom) { if (chores[0]) chores[0][1] = Math.max(chores[0][0], chores[0][1] - 1); }
    else chores.push(wk ? [19, 19.5] : [11, 12]);
  }
  if (p.inlaws && isMom && chores[0]) chores[0][1] = Math.max(chores[0][0], chores[0][1] - 0.5);
  const ns = p.nightShift[m.id] || [];
  const prevNight = ns.includes((d + 6) % 7), tonight = ns.includes(d);
  if (prevNight || tonight) {
    if (prevNight) { fill(a, 0, 7, ST.WORK); fill(a, 7, 7.5, ST.COMMUTE); fill(a, 7.5, 14, ST.SLEEP); }
    else { fill(a, 0, wk ? 6 : 8, ST.SLEEP); fill(a, 14, 16.5, ST.SLEEP); }
    if (tonight) { fill(a, 18.5, 19, ST.COMMUTE); fill(a, 19, 24, ST.WORK); } else fill(a, 23.5, 24, ST.SLEEP);
    chores.forEach(c => fillIf(a, c[0], c[1], ST.BUSY, [ST.FREE]));
    screenSlots(a, [[21, 22.5]], m.traits.screen * 0.8, rng);
    phonesOff(a, p);
    return a;
  }
  const sickCare = meta.sick && meta.sickCarer === m.id;
  const onLeave = p.baby && p.maternity === m.id;
  const [s0, s1] = wk ? m.sleep : m.sleepWk;
  let wakeEnd = s1, sleepStart = s0;
  if (wk && !onLeave) {
    let cm = p.commute[m.id] ?? m.baseCommute;
    let ws = m.workStart, we = fri ? m.workEndFri : m.workEnd + (p.extraWork[m.id] || 0);
    if (p.shiftStart[m.id]) { ws += 1; we += 1; cm = Math.max(15, cm - 30); }
    if (!fri && rng() < 0.15) we += 1.5;               // overtime
    const remote = (p.remote[m.id] || []).includes(d);
    if (sickCare) fill(a, ws, we, ST.CARE);
    else if (remote) fill(a, ws, we, ST.WFH);
    else {
      const am = cm + (rng() < 0.2 ? (cm >= 75 ? 30 : 15) : 0);   // morning traffic
      const pm = cm + (rng() < 0.25 ? (cm >= 75 ? 40 : 20) : 0);  // evening traffic
      const leave = ws - am / 60;
      wakeEnd = Math.min(s1, leave - 0.5);
      fill(a, leave, ws, ST.COMMUTE); fill(a, ws, we, ST.WORK); fill(a, we, we + pm / 60, ST.COMMUTE);
    }
  }
  const eo = p.eveningOut[m.id];
  if (eo && eo.days.includes(d)) fill(a, eo.from, eo.to, ST.CLASS);
  if (wk && p.study[m.id] && !(eo && eo.days.includes(d))) { fillIf(a, 21, 22, ST.BUSY, [ST.FREE]); sleepStart = Math.max(sleepStart, 22.5); }
  fill(a, sleepStart, wakeEnd, ST.SLEEP);
  chores.forEach(c => fillIf(a, c[0], c[1], ST.BUSY, [ST.FREE]));
  if (onLeave) [[9, 11], [13, 14.5], [16, 17.5]].forEach(c => fillIf(a, c[0], c[1], ST.CARE, [ST.FREE, ST.BUSY]));
  if (isMom && p.elderLives === 'home' && meta.hasElder) [[17, 17.5], [20.5, 21]].forEach(c => fillIf(a, c[0], c[1], ST.CARE, [ST.FREE, ST.BUSY]));
  screenSlots(a, [[19, 21]], m.traits.screen * 0.4, rng);
  screenSlots(a, [[21, 22.5]], m.traits.screen * 0.8, rng);
  if (!wk) screenSlots(a, [[14, 16]], m.traits.screen * 0.6, rng);
  phonesOff(a, p);
  return a;
}

function buildTeen(m, p, d, rng, meta) {
  const a = new Array(48).fill(ST.FREE), wk = d < 5, fri = d === 4;
  if (wk && !fri) fill(a, 23.5, 6, ST.SLEEP);
  else if (fri) { fill(a, 0, 6, ST.SLEEP); fill(a, 24, 24, ST.SLEEP); }
  else { fill(a, 0.5, 9, ST.SLEEP); if (d === 6) fill(a, 23.5, 24, ST.SLEEP); }
  if (wk) {
    const bus = (30 + p.kidsBus) / 60, end = fri ? 11.5 : 14.5;
    fill(a, 7 - bus, 7, ST.COMMUTE); fill(a, 7, end, ST.SCHOOL); fill(a, end, end + bus, ST.COMMUTE);
    if (d < 4) fill(a, 16, 18, ST.BUSY); else fill(a, 16, 17, ST.BUSY);
    if (p.homeworkHelper === 'teen' && d < 4) { fill(a, 16, 18.5, ST.BUSY); meta.tutor = true; }
  }
  if (p.choreShare) fillIf(a, 18, 18.5, ST.BUSY, [ST.FREE]);
  screenSlots(a, wk ? [[19, 23.5]] : [[13, 17], [19, 24]], m.traits.screen * 0.85, rng);
  phonesOff(a, p, p.earnedScreen ? [41] : []);
  if (p.earnedScreen && p.phonesOff && a[41] === ST.FREE) a[41] = ST.SCREEN;
  return a;
}

function buildChild(m, p, d, rng, meta) {
  const a = new Array(48).fill(ST.FREE), wk = d < 5, fri = d === 4;
  const wake = wk ? 6 : 7.5, bed = (d === 4 || d === 5) ? 21.5 : 20.5;
  fill(a, 0, wake, ST.SLEEP); fill(a, bed, 24, ST.SLEEP);
  if (wk && !meta.sick) {
    const bus = (30 + p.kidsBus) / 60, end = fri ? 11.5 : 13.5;
    fill(a, 7 - bus, 7, ST.COMMUTE); fill(a, 7, end, ST.SCHOOL); fill(a, end, end + bus, ST.COMMUTE);
    if (d < 4) { fill(a, 15.5, 17, ST.BUSY); for (let k = 31; k < 34; k++) meta.needHelp[k] = true; }
  }
  if (wk && meta.sick) fill(a, 9, 11, ST.SLEEP);
  screenSlots(a, wk ? [[18, 19.5]] : [[10, 12], [16, 18]], m.traits.screen * 0.8, rng);
  phonesOff(a, p);
  return a;
}

function elderLives(m, p) { return p.elderLives ?? m.lives ?? 'nearby'; }

function buildElder(m, p, d, rng, meta) {
  const a = new Array(48).fill(ST.OUT), lives = elderLives(m, p);
  fill(a, 21.5, 5, ST.SLEEP); fill(a, 14, 15, ST.SLEEP);
  if (lives === 'home') {
    for (let k = 0; k < 48; k++) if (a[k] === ST.OUT) a[k] = ST.FREE;
    if (d === 0 || d === 2) fill(a, 9, 11, ST.OUT);           // morning majlis with friends
    if (meta.sick && meta.sickCarer === m.id) fill(a, 7, 14, ST.CARE);
    if (p.homeworkHelper === 'elder' && d < 4) fill(a, 15.5, 17, ST.CARE);
  } else {
    const visits = [];
    if (lives === 'nearby') { if (d === 2) visits.push([17, 19]); if (d === 5) visits.push([16, 21]); if (p.satMajlis && d === 4) visits.push([17, 19.5]); }
    else { if (d === 5 && (rng() < 0.75 || p.satMajlis)) visits.push([16, 20.5]); }
    if (p.satMajlis && d === 5) visits.push([16, 21]);
    visits.forEach(v => fill(a, v[0], v[1], ST.FREE));
  }
  return a;
}

function buildInlaw(m, p, d) {
  const a = new Array(48).fill(ST.FREE), wk = d < 5;
  fill(a, 22, 5, ST.SLEEP); fill(a, 14, 15, ST.SLEEP);
  if (m.busy === 'majlis') { if (wk) fill(a, 8, 11, ST.OUT); if (d < 4) fill(a, 17, 19, ST.OUT); }
  else { fill(a, 11, 13, ST.BUSY); fill(a, 18, 19, ST.BUSY); }
  return a;
}

function runDay(ms, p, d, run) {
  const mr = rngFor(run, d, 'meta'), wk = d < 5;
  const meta = { needHelp: new Array(48).fill(false), hasElder: ms.some(m => m.role === 'elder'), sick: false, sickCarer: null, wakings: 0, call: false };
  const child = ms.find(m => m.role === 'child'), elder = ms.find(m => m.role === 'elder');
  const sickRoll = mr(), carerRoll = mr(), wakeRoll = mr(), callRoll = mr();
  if (wk && child && sickRoll < 0.06) {
    meta.sick = true;
    const mom = ms.find(m => m.role === 'mother'), dad = ms.find(m => m.role === 'father');
    if (elder && elderLives(elder, p) === 'home') meta.sickCarer = elder.id;
    else if (mom && p.maternity === mom.id) meta.sickCarer = mom.id;
    else meta.sickCarer = (carerRoll < 0.7 && mom) ? mom.id : (dad || mom || {}).id;
  }
  if (p.baby) meta.wakings = 2 + Math.floor(wakeRoll * 3);
  if (elder && elderLives(elder, p) !== 'home') meta.call = p.elderCalls || callRoll < 0.7;
  const sch = {};
  for (const m of ms) {
    const r = rngFor(run, d, m.id);
    const k = kindOf(m);
    sch[m.id] = k === 'adult' ? buildAdult(m, p, d, r, meta) : k === 'teen' ? buildTeen(m, p, d, r, meta) : k === 'child' ? buildChild(m, p, d, r, meta)
      : k === 'elder' ? buildElder(m, p, d, r, meta) : k === 'inlaw' ? buildInlaw(m, p, d) : new Array(48).fill(ST.FREE);
  }
  if (p.dinner) for (const m of ms) for (const k of [39, 40]) if ([ST.SCREEN, ST.BUSY, ST.CARE].includes(sch[m.id][k])) sch[m.id][k] = ST.FREE;
  if (p.coupleRitual) {
    const sp = ms.filter(m => m.role === 'husband' || m.role === 'wife');
    if (sp.length === 2) {
      for (const m of sp) if (AT_HOME.has(sch[m.id][42])) sch[m.id][42] = ST.FREE;
      if (d === 3 && sp.every(m => [38, 39, 40, 41, 42, 43].every(k => AT_HOME.has(sch[m.id][k])))) for (const m of sp) fill(sch[m.id], 19, 22, ST.DATE);
    }
  }
  return { sch, meta };
}

const COUPLE_TARGET = { rest: 7.5, cap: [11, 6], conn: [4, 8] };
const TARGET = {
  adult: { rest: 7.5, cap: [11, 6], conn: [2.5, 5] }, teen: { rest: 9, cap: [10, 4], conn: [2, 4] }, child: { rest: 10, cap: [9, 3], conn: [2.5, 5] },
  elder: { rest: 7.5, cap: [3, 3], conn: [2.5, 5] }, inlaw: { rest: 7.5, cap: [5, 5], conn: [2, 4] }
};

function evalDay(ms, p, d, sch, meta, run) {
  const wk = d < 5, er = rngFor(run, d, 'eval');
  const scored = ms.filter(m => m.role !== 'baby'), N = scored.length;
  const coupleHome = N === 2 && ms.some(m => m.role === 'husband');
  const thr = N <= 2 ? 1.8 : Math.max(2.4, 0.62 * N);
  const famMask = new Array(48).fill(0); let famH = 0;
  for (let k = 12; k < 46; k++) {
    let w = 0; for (const m of scored) w += PRESENCE[sch[m.id][k]];
    if (w >= thr) { const q = (p.dinner && (k === 39 || k === 40)) ? 1.3 : 1; famMask[k] = q; famH += 0.5 * q; }
  }
  const spouses = ms.filter(m => m.role === 'husband' || m.role === 'wife'); let coupleH = 0;
  if (spouses.length === 2) {
    const [x, y] = spouses, priv = p.inlaws ? (p.boundaryPlan ? 0.8 : 0.45) : 1;
    for (let k = 12; k < 48; k++) {
      const sx = sch[x.id][k], sy = sch[y.id][k];
      if (sx === ST.DATE && sy === ST.DATE) coupleH += 0.5;
      else { const w = Math.min(PRESENCE[sx], PRESENCE[sy]); if (w >= 0.4) coupleH += 0.5 * w * priv; }
    }
  }
  const helpers = ms.filter(m => ADULT_ROLES.includes(m.role) || m.role === 'inlaw').map(m => m.id);
  const teen = ms.find(m => m.role === 'teen'), elder = ms.find(m => m.role === 'elder'), child = ms.find(m => m.role === 'child');
  const gap = []; let needSlots = 0;
  for (let k = 0; k < 48; k++) if (meta.needHelp[k]) {
    needSlots++;
    let ok = helpers.some(id => AT_HOME.has(sch[id][k]));
    if (p.homeworkHelper === 'teen' && teen && meta.tutor && k >= 32 && k < 34) ok = true;
    if (p.homeworkHelper === 'elder' && elder && sch[elder.id][k] === ST.CARE) ok = true;
    if (!ok) gap.push(k);
  }
  const hwCoverage = needSlots ? 1 - gap.length / needSlots : 1;
  const out = {};
  for (const m of ms) {
    const a = sch[m.id], K = kindOf(m);
    if (m.role === 'baby') {
      let cov = 0, tot = 0;
      for (let k = 12; k < 44; k++) { tot++; if (ms.some(x => x.role !== 'baby' && (kindOf(x) === 'adult' || kindOf(x) === 'elder' || kindOf(x) === 'inlaw') && [ST.FREE, ST.BUSY, ST.CARE].includes(sch[x.id][k]))) cov++; }
      const c = cov / tot; out[m.id] = { wb: 45 + 50 * c, conn: c, rest: 1, load: 0, need: c, sleepH: 0, presH: 0 }; continue;
    }
    const Tg = (coupleHome && K === 'adult') ? COUPLE_TARGET : TARGET[K];
    let sleepH = 0, loadH = 0, commH = 0, presH = 0, homeH = 0;
    for (let k = 0; k < 48; k++) {
      const s = a[k];
      if (s === ST.SLEEP) sleepH += .5; if (LOADS.has(s)) loadH += .5; if (s === ST.COMMUTE) commH += .5;
      if (famMask[k] > 0) presH += 0.5 * PRESENCE[s] * famMask[k];
      if (K === 'elder' && s === ST.FREE) homeH += .5;
    }
    if (p.baby && meta.wakings && (m.role === 'mother' || m.role === 'father')) {
      const loss = meta.wakings * 0.75;
      let share = m.role === 'mother' ? 0.85 : 0.15;
      if (p.nightRota) share = ((d % 2 === 0) === (m.role === 'mother')) ? 0.65 : 0.35;
      sleepH -= loss * share;
    }
    const rest = clamp(sleepH / Tg.rest);
    const resAmp = 1.25 - 0.5 * m.traits.resilience;
    const loadStress = clamp((clamp((loadH / Tg.cap[wk ? 0 : 1] - 0.85) / 0.5) + clamp((commH - 1) * 0.15, 0, 0.45)) * resAmp);
    let connH = presH;
    const lives = K === 'elder' ? elderLives(m, p) : null;
    if (K === 'elder' && lives !== 'home' && meta.call) connH += p.elderCalls ? 0.5 : 0.3;
    const conn = clamp(connH / Tg.conn[wk ? 0 : 1]);
    let need = 1, extra = 0;
    if (K === 'child') need = hwCoverage * 0.8 + 0.2 * (meta.sick ? 0.4 : 1);
    if (K === 'teen') {
      const pb = p.phonesOff ? 0.45 * Math.pow(0.62, d) * (p.earnedScreen ? 0.5 : 1) : 0;
      const priv = p.privacyFix ? 0 : (p.privacyLoss[m.id] || 0);
      need = clamp(0.88 - pb - priv + (p.space || 0));
    }
    if (K === 'elder') need = lives === 'home' ? 0.95 : clamp(0.2 + 0.22 * homeH + (meta.call ? (p.elderCalls ? 0.35 : 0.2) : 0));
    if (K === 'adult') {
      need = clamp(0.7 - (p.finance[m.id] || 0));
      if (p.inlaws && m.role === 'wife') extra += p.boundaryPlan ? 0.03 : 0.1;
      if (p.inlaws && m.role === 'husband') extra += p.boundaryPlan ? 0.02 : 0.05;
    }
    if (K === 'inlaw') { need = 0.75; if (!p.boundaryPlan) extra += 0.03; }
    if (p.baby && p.maternity === m.id) loadH += 5;
    if (p.baby) extra -= 0.03;
    const connW = 0.26 + 0.12 * m.traits.social, needW = 1 - connW - 0.46;
    const score = clamp(connW * conn + 0.24 * rest + 0.22 * (1 - loadStress) + needW * need - extra * resAmp + (er() - 0.5) * 0.05);
    const wb = clamp(100 * Math.pow(score, 1.5), 3, 99);
    out[m.id] = { wb, conn, rest, load: loadStress, need, sleepH, presH: connH };
  }
  const events = [];
  if (child && gap.length >= 2) events.push({ type: 'homework', k0: gap[0], k1: gap[gap.length - 1] + 1, who: child.id });
  if (wk) for (const m of ms) if (ADULT_ROLES.includes(m.role)) {
    if ([38, 39, 40].some(k => [ST.COMMUTE, ST.WORK, ST.CLASS].includes(sch[m.id][k]))) events.push({ type: 'dinner', k0: 38, k1: 41, who: m.id });
  }
  const stressed = ms.filter(m => kindOf(m) === 'adult' && (out[m.id].load > 0.3 || out[m.id].rest < 0.82)).map(m => m.id);
  if (stressed.length >= 2) {
    let n = 0; for (let k = 34; k < 45; k++) if (stressed.filter(id => PRESENCE[sch[id][k]] > 0).length >= 2) n++;
    if (n >= 2 && er() < 0.55) events.push({ type: 'tension', k0: 36, k1: 44, who: stressed[0] });
  }
  if (p.phonesOff && teen) {
    const pb = 0.45 * Math.pow(0.62, d) * (p.earnedScreen ? 0.5 : 1);
    if (er() < pb * 1.8) events.push({ type: 'pushback', k0: Math.round(p.phonesOff[0] * 2), k1: Math.round(p.phonesOff[1] * 2), who: teen.id });
  }
  if (p.baby) {
    const carer = ms.find(m => m.id === p.maternity) || ms.find(m => m.role === 'mother');
    if (carer && (meta.wakings >= 4 || out[carer.id].rest < 0.72)) events.push({ type: 'care', k0: 0, k1: 10, who: carer.id });
  }
  if (elder && elderLives(elder, p) !== 'home' && !meta.call && !sch[elder.id].some(s => s === ST.FREE)) events.push({ type: 'lonely', k0: 34, k1: 38, who: elder.id });
  if (p.inlaws && er() < (p.boundaryPlan ? 0.08 : 0.4)) { const w = spouses.find(m => m.role === 'wife'); if (w) events.push({ type: 'privacy', k0: 38, k1: 44, who: w.id }); }
  if (spouses.length === 2 && wk && coupleH < 1) events.push({ type: 'couple', k0: 40, k1: 46, who: spouses[0].id });
  for (const m of ms) if (kindOf(m) === 'adult' && out[m.id].sleepH < 6) events.push({ type: 'sleep', k0: 0, k1: 12, who: m.id });
  const wbs = scored.map(m => out[m.id].wb);
  const avg = wbs.reduce((s, x) => s + x, 0) / wbs.length;
  const sd = Math.sqrt(wbs.reduce((s, x) => s + (x - avg) ** 2, 0) / wbs.length);
  const timeH = spouses.length === 2 && N === 2 ? coupleH : famH;
  const couple = spouses.length === 2 && N === 2;
  const famScore = clamp(timeH / (couple ? (wk ? 4 : 8) : (wk ? 2.5 : 5)), 0, 1) * 100;
  const harmony = clamp(0.55 * avg + 0.25 * famScore + 0.20 * clamp(100 - 2 * sd, 0, 100) - 1.5 * events.length, 0, 100);
  return { harmony, famH, coupleH, out, events, avg, sd };
}

const bandOf = k => { const h = k / 2; return h >= 6 && h < 12 ? 0 : h >= 12 && h < 17 ? 1 : h >= 17 && h < 21 ? 2 : 3; };
const mean = a => a.reduce((s, x) => s + x, 0) / (a.length || 1);
function quantile(a, q) { const s = [...a].sort((x, y) => x - y); if (!s.length) return 0; const i = (s.length - 1) * q, lo = Math.floor(i), hi = Math.ceil(i); return s[lo] + (s[hi] - s[lo]) * (i - lo); }

function simulate(members, p, R) {
  const ms = household(members, p);
  const res = { R, ms, famDay: [0, 0, 0, 0, 0, 0, 0], coupleDay: [0, 0, 0, 0, 0, 0, 0], harmonyRuns: [], harmonyDay: [[], [], [], [], [], [], []], famRuns: [], coupleRuns: [], eventsRuns: [], member: {}, heat: Array.from({ length: 7 }, () => [0, 0, 0, 0]), hot: {} };
  ms.forEach(m => res.member[m.id] = { wb: [], conn: 0, rest: 0, load: 0, need: 0, sleep: 0, pres: 0, day: [0, 0, 0, 0, 0, 0, 0], connDay: [0, 0, 0, 0, 0, 0, 0] });
  for (let r = 0; r < R; r++) {
    let hs = 0, fam = 0, cpl = 0, ev = 0; const acc = {}; ms.forEach(m => acc[m.id] = 0);
    for (let d = 0; d < 7; d++) {
      const { sch, meta } = runDay(ms, p, d, r);
      const e = evalDay(ms, p, d, sch, meta, r);
      hs += e.harmony; res.harmonyDay[d].push(e.harmony); res.famDay[d] += e.famH / R; res.coupleDay[d] += e.coupleH / R; fam += e.famH; cpl += e.coupleH; ev += e.events.length;
      for (const m of ms) {
        const o = e.out[m.id], M = res.member[m.id];
        acc[m.id] += o.wb / 7; M.conn += o.conn / (7 * R); M.rest += o.rest / (7 * R); M.load += o.load / (7 * R); M.need += o.need / (7 * R);
        M.sleep += o.sleepH / R; M.pres += o.presH / R; M.day[d] += o.wb / R; M.connDay[d] += o.conn / R;
      }
      const bands = new Set(), seen = new Set();
      for (const x of e.events) {
        bands.add(bandOf(x.k0));
        const key = x.type + '|' + x.who + '|' + d;
        if (!seen.has(key)) { seen.add(key); if (!res.hot[key]) res.hot[key] = { key, type: x.type, who: x.who, d, k0: x.k0, k1: x.k1, n: 0 }; res.hot[key].n++; }
      }
      bands.forEach(b => res.heat[d][b]++);
    }
    res.harmonyRuns.push(hs / 7); res.famRuns.push(fam); res.coupleRuns.push(cpl); res.eventsRuns.push(ev);
    ms.forEach(m => res.member[m.id].wb.push(acc[m.id]));
  }
  res.heat = res.heat.map(row => row.map(c => c / R));
  res.harmony = { mean: mean(res.harmonyRuns), p10: quantile(res.harmonyRuns, .1), p90: quantile(res.harmonyRuns, .9) };
  res.harmonyByDay = res.harmonyDay.map(a => ({ mean: mean(a), p10: quantile(a, .1), p90: quantile(a, .9) }));
  res.fam = mean(res.famRuns); res.couple = mean(res.coupleRuns); res.events = mean(res.eventsRuns);
  for (const m of ms) { const M = res.member[m.id]; M.mean = mean(M.wb); M.p10 = quantile(M.wb, .1); M.p90 = quantile(M.wb, .9); }
  res.hotList = Object.values(res.hot).map(h => ({ ...h, prob: h.n / R })).sort((a, b) => b.prob - a.prob);
  return res;
}

function elderFixTarget(p, ms, dec, base) { const e = ms.find(m => m.role === 'elder'); if (!e || elderLives(e, p) === 'home') return null; const worse = base.member[e.id] && dec.member[e.id].mean < base.member[e.id].mean - 1.5; return (elderLives(e, p) === 'far' || worse) ? e.id : null; }

/* Fix catalogue: each fix knows when it applies and how it changes the parameters. */
const FIXES = [
  { id: 'remote', target: (p, ms) => { const c = ms.filter(m => kindOf(m) === 'adult').map(m => ({ id: m.id, c: p.commute[m.id] ?? m.baseCommute })).sort((a, b) => b.c - a.c)[0]; return c && c.c >= 60 ? c.id : null; }, apply: (p, t) => { p.remote[t] = [1, 3]; } },
  { id: 'shiftStart', target: (p, ms) => { const c = ms.filter(m => kindOf(m) === 'adult').map(m => ({ id: m.id, c: p.commute[m.id] ?? m.baseCommute })).sort((a, b) => b.c - a.c)[0]; return c && c.c >= 60 ? c.id : null; }, apply: (p, t) => { p.shiftStart[t] = true; } },
  { id: 'dinner', target: (p) => p.dinner ? null : 'all', apply: p => { p.dinner = true; } },
  { id: 'homework', target: (p, ms, res) => { const c = ms.find(m => m.role === 'child'); if (!c) return null; const hw = res.hotList.filter(h => h.type === 'homework').reduce((s, h) => s + h.prob, 0); if (hw < 0.3) return null; const e = ms.find(m => m.role === 'elder'); if (e && elderLives(e, p) === 'home') return 'elder'; return ms.some(m => m.role === 'teen') ? 'teen' : null; }, apply: (p, t) => { p.homeworkHelper = t; } },
  { id: 'chores', target: (p, ms, res) => { const mom = ms.find(m => m.role === 'mother' || m.role === 'wife'); return mom && res.member[mom.id].load > 0.12 ? mom.id : null; }, apply: p => { p.choreShare = true; } },
  { id: 'nightRota', target: p => p.baby ? 'parents' : null, apply: p => { p.nightRota = true; } },
  { id: 'privacy', target: (p, ms) => { const t = ms.find(m => m.role === 'teen' && (p.privacyLoss[m.id] || 0) > 0); return t ? t.id : null; }, apply: p => { p.privacyFix = true; } },
  { id: 'earned', target: (p, ms) => p.phonesOff && ms.some(m => m.role === 'teen') ? ms.find(m => m.role === 'teen').id : null, apply: p => { p.earnedScreen = true; } },
  { id: 'calls', target: elderFixTarget, apply: p => { p.elderCalls = true; } },
  { id: 'majlis', target: elderFixTarget, apply: p => { p.satMajlis = true; } },
  { id: 'couple', target: (p, ms) => ms.some(m => m.role === 'husband') && ms.some(m => m.role === 'wife') ? 'couple' : null, apply: p => { p.coupleRitual = true; } },
  { id: 'boundary', target: p => p.inlaws ? 'couple' : null, apply: p => { p.boundaryPlan = true; } }
];

function paramsFor(members, effects, fixIds, fixTargets) {
  const p = newParams(); applyEffects(p, effects, members);
  (fixIds || []).forEach(id => { const f = FIXES.find(x => x.id === id); if (f) f.apply(p, fixTargets[id]); });
  return p;
}

function optimize(members, effects, decRes, R, baseRes) {
  const p0 = paramsFor(members, effects, [], {});
  const ms = household(members, p0);
  const out = [];
  for (const f of FIXES) {
    const t = f.target(p0, ms, decRes, baseRes || decRes);
    if (!t) continue;
    const p = paramsFor(members, effects, [f.id], { [f.id]: t });
    const r = simulate(members, p, R);
    const ref = R === decRes.R ? decRes : simulate(members, p0, R);
    const gains = r.ms.filter(m => ref.member[m.id]).map(m => ({ id: m.id, d: r.member[m.id].mean - ref.member[m.id].mean })).sort((a, b) => b.d - a.d);
    out.push({ id: f.id, target: t, dH: r.harmony.mean - ref.harmony.mean, dFam: (r.couple && !r.ms.some(m => m.role === 'teen' || m.role === 'child' || m.role === 'elder' || m.role === 'inlaw') ? r.couple - ref.couple : r.fam - ref.fam), dEv: r.events - ref.events, best: gains[0] });
  }
  return out.sort((a, b) => b.dH - a.dH);
}

if (typeof module !== 'undefined') module.exports = { ST, simulate, optimize, paramsFor, newParams, applyEffects, household, FIXES };
