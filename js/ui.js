(function () {
  const TABS = ['family', 'decision', 'simulate', 'insights', 'fixes', 'trust'];
  const S = {
    lang: 'en', fam: 'mansoori', members: null, scn: 'dubaiJob', custom: null, customText: '', parseMsg: '', parsing: false,
    R: 60, base: null, dec: null, fixRes: null, fixList: [], picked: new Set(), fixTargets: {}, ran: null,
    voicesAI: null, guideAI: null, aiMsg: '', aiBusy: false, sample: null, aiState: 'wait', tab: 'family', animDay: 6, timer: null, busy: false
  };
  const $ = s => document.querySelector(s);
  const clone = o => JSON.parse(JSON.stringify(o));
  const r0 = x => Math.round(x);
  const ab = (a, b) => `<span dir="ltr" class="num">${a} → ${b}</span>`;
  const f1 = x => (Math.round(x * 10) / 10).toFixed(1);
  const clamp01 = x => Math.max(0, Math.min(1, x));
  const reduced = () => window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  function t(k, v) { let s = STR[S.lang][k] ?? STR.en[k] ?? k; if (v) for (const x in v) s = s.split('{' + x + '}').join(v[x]); return s; }
  function L(o) { return o ? (o[S.lang] ?? o.en) : ''; }
  function tpl(o, v, fem) { let s = (S.lang === 'ar' && fem && o.arF) ? o.arF : L(o); for (const x in v || {}) s = s.split('{' + x + '}').join(v[x]); return s; }
  function esc(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
  const fmtT = slot => String(Math.floor(slot / 2) % 24).padStart(2, '0') + ':' + (slot % 2 ? '30' : '00');
  const fmtHour = h => { const hh = Math.floor(h), mm = Math.round((h - hh) * 60); return String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0'); };
  function member(id) { return (S.members || []).find(m => m.id === id) || (S.dec && S.dec.ms.find(m => m.id === id)); }
  function nameOf(id) { const m = member(id); return m ? L(m.name) : id; }
  function isF(id) { const m = member(id); return m && m.g === 'f'; }
  function initials(m) { if (m.role === 'baby') return '+1'; const w = L(m.name).trim().split(/\s+/); return (w[w.length - 1] || '?').charAt(0).toUpperCase(); }
  const isCouple = res => res.ms.filter(m => m.role !== 'baby').length === 2 && res.ms.some(m => m.role === 'husband');
  const famTime = res => isCouple(res) ? res.couple : res.fam;
  const scnsFor = () => SCENARIOS.filter(s => s.fam.includes(S.fam));
  const curScn = () => S.custom || SCENARIOS.find(s => s.id === S.scn) || scnsFor()[0];

  /* ---------- compute ---------- */
  function compute() {
    const scn = curScn(), eff = scn.effects;
    const pB = paramsFor(S.members, [], [], {});
    S.base = simulate(S.members, pB, S.R);
    S.dec = simulate(S.members, paramsFor(S.members, eff, [], {}), S.R);
    const Ro = Math.min(S.R, 40);
    const decO = Ro === S.R ? S.dec : simulate(S.members, paramsFor(S.members, eff, [], {}), Ro);
    const baseO = Ro === S.R ? S.base : simulate(S.members, pB, Ro);
    S.fixList = optimize(S.members, eff, decO, Ro, baseO);
    S.fixTargets = Object.fromEntries(S.fixList.map(f => [f.id, f.target]));
    S.picked = new Set(S.fixList.filter(f => f.dH > 0.3).slice(0, 2).map(f => f.id));
    S.ran = { title: scn.title, effects: eff };
    S.voicesAI = null; S.guideAI = null; S.aiMsg = '';
    computeFix();
  }
  function computeFix() {
    const ids = [...S.picked];
    S.fixRes = ids.length ? simulate(S.members, paramsFor(S.members, S.ran.effects, ids, S.fixTargets), S.R) : null;
  }

  /* ---------- icons ---------- */
  const ICON = {
    car: 'M3 15l2-6a2 2 0 0 1 2-1.4h10a2 2 0 0 1 2 1.4l2 6v4h-3v-2H6v2H3z M3 15h18 M7 12.5h.01 M17 12.5h.01',
    home: 'M3 11l9-7 9 7 M5 10v10h14V10 M10 20v-6h4v6',
    baby: 'M12 3a3.2 3.2 0 1 1 0 6.4A3.2 3.2 0 0 1 12 3z M6 21c0-4.2 2.7-7.5 6-7.5s6 3.3 6 7.5 M10 6.2h.01 M14 6.2h.01',
    phone: 'M8 2.5h8a1.5 1.5 0 0 1 1.5 1.5v16a1.5 1.5 0 0 1-1.5 1.5H8A1.5 1.5 0 0 1 6.5 20V4A1.5 1.5 0 0 1 8 2.5z M4 4l16 16',
    book: 'M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z M4 20.5V5.5 M8 7h8',
    villa: 'M2 21h20 M4 21V10l6-4.5L16 10v11 M16 13h5v8 M8 21v-5h4v5',
    people: 'M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M16.5 11a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z M2.5 20c0-3.3 2.5-6 5.5-6s5.5 2.7 5.5 6 M13.5 14.6c.9-.4 1.9-.6 3-.6 2.8 0 5 2.5 5 6',
    moon: 'M20 14.5A8.5 8.5 0 1 1 9.5 4a6.6 6.6 0 0 0 10.5 10.5z',
    pin: 'M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z M12 7.6a2.4 2.4 0 1 1 0 4.8 2.4 2.4 0 0 1 0-4.8z',
    spark: 'M12 3v4 M12 17v4 M3 12h4 M17 12h4 M6 6l2.5 2.5 M15.5 15.5L18 18 M6 18l2.5-2.5 M15.5 8.5L18 6'
  };
  const icon = k => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${ICON[k] || ICON.spark}"/></svg>`;
  const LOGO = `<svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="17" fill="none" stroke="var(--accent)" stroke-width="1.6" stroke-dasharray="3 3"/><circle cx="20" cy="20" r="9" fill="var(--accent-soft)" stroke="var(--accent)" stroke-width="1.6"/><path d="M15.5 21l4.5-4 4.5 4 M17 20v4.5h6V20" fill="none" stroke="var(--accent)" stroke-width="1.6" stroke-linejoin="round"/><circle cx="20" cy="3" r="2.6" fill="var(--s1)"/><circle cx="35" cy="26" r="2.6" fill="var(--s2)"/><circle cx="7" cy="29" r="2.6" fill="var(--s3)"/></svg>`;

  /* ---------- orbit ---------- */
  const stCls = wb => wb >= 70 ? 'st-good' : wb >= 50 ? 'st-warn' : 'st-bad';
  function orbitNodes(res, day) {
    return res.ms.map(m => { const M = res.member[m.id]; return { id: m.id, m, wb: day == null ? M.mean : M.day[day], conn: day == null ? M.conn : M.connDay[day] }; });
  }
  function pos(i, n, conn) { const a = (-90 + i * 360 / n) * Math.PI / 180, r = 78 + (1 - clamp01(conn)) * 108; return { x: 210 + r * Math.cos(a), y: 220 + r * Math.sin(a) }; }
  function shortName(m) { const n = L(m.name); return n.length > 14 ? n.split(/\s+/).slice(-1)[0] : n; }
  function orbitSVG(id, nodes) {
    const n = nodes.length;
    const aria = nodes.map(o => `${L(o.m.name)} ${r0(o.wb)}`).join(', ');
    const rings = [80, 133, 186].map(r => `<circle class="ring" cx="210" cy="220" r="${r}"/>`).join('');
    const links = nodes.map((o, i) => { const p = pos(i, n, o.conn); return `<line class="link" id="${id}-l-${o.id}" x1="210" y1="220" x2="${p.x.toFixed(1)}" y2="${p.y.toFixed(1)}" stroke-width="${(1.5 + clamp01(o.conn) * 4).toFixed(1)}"/>`; }).join('');
    const nodesH = nodes.map((o, i) => { const p = pos(i, n, o.conn); return `<g class="node" id="${id}-n-${o.id}" style="transform:translate(${p.x.toFixed(1)}px,${p.y.toFixed(1)}px)"><circle class="base ${stCls(o.wb)}" r="24"/><text class="ini">${esc(initials(o.m))}</text><text class="lbl" y="41">${esc(shortName(o.m))}</text><text class="wb" y="56">${r0(o.wb)}</text></g>`; }).join('');
    return `<svg class="orbit" id="${id}-svg" data-ids="${nodes.map(o => o.id).join(',')}" viewBox="-40 -10 500 480" role="img" aria-label="${esc(aria)}">${rings}<circle class="home" cx="210" cy="220" r="30"/><path class="homeicon" d="M199 221 L210 210 L221 221 M202 219 V230 H218 V219"/>${links}${nodesH}</svg>`;
  }
  function updateOrbit(id, nodes) {
    const svg = document.getElementById(id + '-svg');
    if (!svg || svg.dataset.ids !== nodes.map(o => o.id).join(',')) { const host = document.getElementById(id); if (host) host.innerHTML = orbitSVG(id, nodes); return; }
    nodes.forEach((o, i) => {
      const p = pos(i, nodes.length, o.conn), g = document.getElementById(`${id}-n-${o.id}`), l = document.getElementById(`${id}-l-${o.id}`);
      if (g) { g.style.transform = `translate(${p.x.toFixed(1)}px,${p.y.toFixed(1)}px)`; g.querySelector('circle').setAttribute('class', 'base ' + stCls(o.wb)); g.querySelector('.wb').textContent = r0(o.wb); g.querySelector('.lbl').textContent = shortName(o.m); }
      if (l) { l.setAttribute('x2', p.x.toFixed(1)); l.setAttribute('y2', p.y.toFixed(1)); l.setAttribute('stroke-width', (1.5 + clamp01(o.conn) * 4).toFixed(1)); }
    });
  }
  const orbitLegend = () => `<div class="legend-row"><span><i style="border-color:var(--good)"></i>${t('lg_good')}</span><span><i style="border-color:var(--warn)"></i>${t('lg_warn')}</span><span><i style="border-color:var(--bad)"></i>${t('lg_bad')}</span></div>`;

  /* ---------- line chart ---------- */
  function seriesList(withFix) {
    const s = [{ key: 'today', name: t('s_today'), color: 'var(--s1)', res: S.base }, { key: 'dec', name: t('s_dec'), color: 'var(--s2)', res: S.dec, band: true }];
    if (withFix && S.fixRes) s.push({ key: 'fix', name: t('s_fix'), color: 'var(--s3)', res: S.fixRes });
    return s;
  }
  const legendHTML = list => `<div class="legend-row">${list.map(s => `<span><i class="sw" style="background:${s.color}"></i>${esc(s.name)}</span>`).join('')}</div>`;
  function lineChart(el, list, upto) {
    if (!el) return;
    const W = Math.max(300, el.clientWidth || 600), H = Math.round(Math.min(290, Math.max(210, W * 0.42)));
    const wide = W >= 460, m = { l: 34, r: wide ? 112 : 14, t: 14, b: 28 };
    const vals = list.flatMap(s => s.res.harmonyByDay.flatMap(d => s.band ? [d.p10, d.p90] : [d.mean]));
    let lo = Math.max(0, Math.floor((Math.min(...vals) - 3) / 10) * 10), hi = Math.min(100, Math.ceil((Math.max(...vals) + 3) / 10) * 10);
    if (hi - lo < 20) { lo = Math.max(0, hi - 20); }
    const x = i => m.l + i * (W - m.l - m.r) / 6, y = v => m.t + (hi - v) / (hi - lo) * (H - m.t - m.b);
    const days = STR[S.lang].days;
    let g = '<g class="grid">';
    for (let v = lo; v <= hi; v += 10) g += `<line x1="${m.l}" x2="${W - m.r}" y1="${y(v)}" y2="${y(v)}"/><text x="${m.l - 6}" y="${y(v) + 4}" text-anchor="end">${v}</text>`;
    g += '</g>';
    const dShort = STR[S.lang].daysShort || days;
    let xl = days.map((d, i) => `<text x="${x(i)}" y="${H - 8}" text-anchor="middle">${esc(W < 520 ? dShort[i] : d)}</text>`).join('');
    const n = Math.min(6, upto);
    let body = '';
    list.forEach(s => {
      const D = s.res.harmonyByDay;
      if (n < 0) return;
      if (s.band && n >= 1) {
        const top = D.slice(0, n + 1).map((d, i) => `${x(i)},${y(d.p90)}`), bot = D.slice(0, n + 1).map((d, i) => `${x(i)},${y(d.p10)}`).reverse();
        body += `<polygon points="${top.concat(bot).join(' ')}" style="fill:${s.color};opacity:.14"/>`;
      }
      body += `<polyline points="${D.slice(0, n + 1).map((d, i) => `${x(i)},${y(d.mean)}`).join(' ')}" style="fill:none;stroke:${s.color};stroke-width:2;stroke-linejoin:round;stroke-linecap:round"/>`;
      body += D.slice(0, n + 1).map((d, i) => `<circle cx="${x(i)}" cy="${y(d.mean)}" r="4" style="fill:${s.color};stroke:var(--surface);stroke-width:2"/>`).join('');
    });
    if (wide && n === 6) {
      const ends = list.map(s => ({ s, v: s.res.harmonyByDay[6].mean, yy: y(s.res.harmonyByDay[6].mean) })).sort((a, b) => a.yy - b.yy);
      for (let i = 1; i < ends.length; i++) if (ends[i].yy - ends[i - 1].yy < 15) ends[i].yy = ends[i - 1].yy + 15;
      body += ends.map(e => `<text class="lbl" x="${x(6) + 10}" y="${e.yy + 4}" style="fill:var(--ink)">${esc(e.s.name)} <tspan style="fill:var(--muted)">${r0(e.v)}</tspan></text>`).join('');
    }
    let hits = '';
    for (let i = 0; i <= n; i++) {
      const tip = days[i] + '\n' + list.map(s => `${s.name}: ${r0(s.res.harmonyByDay[i].mean)}` + (s.band ? ` (${r0(s.res.harmonyByDay[i].p10)}–${r0(s.res.harmonyByDay[i].p90)})` : '')).join('\n');
      const w = (W - m.l - m.r) / 6;
      hits += `<rect class="hit" x="${x(i) - w / 2}" y="${m.t}" width="${w}" height="${H - m.t - m.b}" data-tip="${esc(tip)}" data-cx="${x(i)}"/>`;
    }
    el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(t('chartDaily'))}">${g}${xl}<line class="cross" x1="0" x2="0" y1="${m.t}" y2="${H - m.b}"/>${body}${hits}</svg>`;
  }

  /* ---------- bars ---------- */
  function barsHTML(list) {
    const order = [];
    list.forEach(s => s.res.ms.forEach(m => { if (!order.find(o => o.id === m.id)) order.push(m); }));
    const rows = order.map(m => {
      const bars = list.map(s => {
        const M = s.res.member[m.id];
        if (!M) return `<div class="bar" style="margin-inline-end:44px"></div>`;
        const w = clamp01(M.mean / 100) * 100;
        const wh = s.key !== 'today' ? `<span class="wh" style="inset-inline-start:${M.p10}%;width:${Math.max(0.5, M.p90 - M.p10)}%"></span>` : '';
        const tip = `${L(m.name)} · ${s.name}\n${r0(M.mean)} / 100` + (s.key !== 'today' ? ` (${r0(M.p10)}–${r0(M.p90)})` : '');
        return `<div class="bar" style="margin-inline-end:44px" data-tip="${esc(tip)}"><span class="fillb" style="width:${w}%;background:${s.color}"></span>${wh}<span class="val" style="inset-inline-start:calc(${s.key !== 'today' ? Math.max(w, M.p90) : w}% + 6px)">${r0(M.mean)}</span></div>`;
      }).join('');
      const sub = m.role === 'inlaw' ? L(m.note) : m.role === 'baby' ? '' : `${t('age')} ${m.age}`;
      return `<div class="bar-row"><div class="who">${esc(L(m.name))}<small>${esc(sub)}</small></div><div class="bar-set">${bars}</div></div>`;
    }).join('');
    return `<div class="bars">${rows}<div class="bar-scale"><span></span><div style="margin-inline-end:44px"><span>0</span><span>50</span><span>100</span></div></div></div>`;
  }

  /* ---------- risks ---------- */
  function aggregate(res) {
    const A = {};
    for (const h of res.hotList) {
      const k = h.type + '|' + h.who;
      if (!A[k]) A[k] = { type: h.type, who: h.who, exp: 0, days: [], k0: h.k0, k1: h.k1, top: 0 };
      A[k].exp += h.prob; if (h.prob >= 0.25) A[k].days.push(h.d);
      if (h.prob > A[k].top) { A[k].top = h.prob; A[k].k0 = h.k0; A[k].k1 = h.k1; }
    }
    return A;
  }
  function riskDiff() {
    const B = aggregate(S.base), D = aggregate(S.dec);
    const keys = new Set([...Object.keys(B), ...Object.keys(D)]);
    const rows = [...keys].map(k => { const d = D[k], b = B[k]; const x = d || b; return { ...x, days: (d || b).days.sort((a, c) => a - c), dec: d ? d.exp : 0, base: b ? b.exp : 0, delta: (d ? d.exp : 0) - (b ? b.exp : 0) }; });
    return { up: rows.filter(r => r.delta >= 0.3).sort((a, b) => b.delta - a.delta).slice(0, 5), down: rows.filter(r => r.delta <= -0.3).sort((a, b) => a.delta - b.delta).slice(0, 3) };
  }
  const hotText = (type, who) => tpl(HOT[type], { who: esc(nameOf(who)) }, isF(who));
  function daysText(ds) { const L2 = STR[S.lang].days; return ds.length >= 5 ? (S.lang === 'ar' ? 'معظم الأيام' : 'most days') : ds.map(d => L2[d]).join(S.lang === 'ar' ? '، ' : ', '); }
  function riskLi(r, gone) {
    const times = r.type === 'sleep' || r.type === 'care' ? '' : ` · ${fmtT(r.k0)}–${fmtT(r.k1)}`;
    const freq = S.lang === 'ar' ? `${f1(gone ? r.base : r.dec)}× أسبوعيًا` : `${f1(gone ? r.base : r.dec)}× a week`;
    const delta = gone ? (S.lang === 'ar' ? `اليوم ${f1(r.base)}× ← ${f1(r.dec)}×` : `today ${f1(r.base)}× → ${f1(r.dec)}×`) : (S.lang === 'ar' ? `اليوم ${f1(r.base)}×` : `today ${f1(r.base)}×`);
    return `<li><span class="sev ${gone ? 'gone' : ''}"></span><div>${hotText(r.type, r.who)}<small>${esc(daysText(r.days.length ? r.days : []))}${times}</small></div><span class="meta">${gone ? delta : freq}<br><small>${gone ? '' : delta}</small></span></li>`;
  }

  /* ---------- voices & guide ---------- */
  function engineVoices() {
    const out = {};
    for (const m of S.dec.ms) {
      const D = S.dec.member[m.id], B = S.base.member[m.id], K = kindOf(m);
      if (!B) { out[m.id] = L(VOICE[m.role === 'baby' ? 'baby_pos' : 'inlaw_pos']); continue; }
      const c = [
        { k: 'conn', d: D.pres - B.pres, s: (D.pres - B.pres) / 6, ok: Math.abs(D.pres - B.pres) >= 1.5, h: Math.abs(D.pres - B.pres) },
        { k: 'rest', d: D.sleep - B.sleep, s: (D.sleep - B.sleep) / 5, ok: Math.abs(D.sleep - B.sleep) >= 1.5, h: Math.abs(D.sleep - B.sleep) },
        { k: 'load', d: B.load - D.load, s: (B.load - D.load) / 0.2, ok: Math.abs(D.load - B.load) >= 0.05 },
        { k: 'need', d: D.need - B.need, s: (D.need - B.need) / 0.15, ok: Math.abs(D.need - B.need) >= 0.04 }
      ].filter(x => x.ok);
      const neg = c.filter(x => x.s < 0).sort((a, b) => a.s - b.s)[0], pos = c.filter(x => x.s > 0).sort((a, b) => b.s - a.s)[0];
      const phrase = x => { const sign = x.s < 0 ? 'neg' : 'pos'; const key = x.k === 'need' ? (K === 'inlaw' ? 'inlaw_pos' : K + '_' + sign) : x.k + '_' + sign; return L(VOICE[key] || VOICE.neutral).split('{h}').join(Math.max(1, r0(x.h || 1))); };
      let s = '';
      if (neg) s = phrase(neg);
      if (pos) { const p = phrase(pos); s += neg ? ' ' + L(VOICE.but) + (S.lang === 'en' && !p.startsWith('I ') && !p.startsWith("I'") ? p.charAt(0).toLowerCase() + p.slice(1) : p) : p; }
      out[m.id] = s || L(VOICE.neutral);
    }
    return out;
  }
  function engineGuide() {
    const { up } = riskDiff();
    const g = [L(GUIDE.open)];
    up.slice(0, 3).forEach(r => g.push(tpl(GUIDE[r.type], { who: nameOf(r.who) })));
    g.push(L(GUIDE.close));
    return g;
  }

  /* ---------- Claude ---------- */
  function errCopy(e) { const c = e && e.code; return c === 'not_granted' || c === 'sampling_disabled' ? t('err_not_granted') : c === 'rate_limited' ? t('err_rate') : t('err_other'); }
  async function aiVoices() {
    if (!S.sample || S.aiBusy) return;
    S.aiBusy = true; S.aiMsg = ''; renderPanel('insights');
    const prof = S.dec.ms.map(m => { const D = S.dec.member[m.id], B = S.base.member[m.id]; return { id: m.id, name: L(m.name), role: m.role, age: m.age, wellbeing_today: B ? r0(B.mean) : null, wellbeing_with_decision: r0(D.mean), family_time_change_hours_per_week: B ? +f1(D.pres - B.pres) : null, sleep_change_hours_per_week: B ? +f1(D.sleep - B.sleep) : null, load_change: B ? +(D.load - B.load).toFixed(2) : null, need_change: B ? +(D.need - B.need).toFixed(2) : null }; });
    const risks = riskDiff().up.map(r => ({ issue: HOT[r.type].en.replace('{who}', nameOf(r.who)), times_per_week: +f1(r.dec), today: +f1(r.base) }));
    const prompt = `You are the narrator inside FamilyVerse AI, a family decision simulator made by UAE high-school students for the theme "AI for Family". A family is considering this decision: "${L(S.ran.title)}". A Monte Carlo simulation of ${S.R} weeks compared life with and without it. Using only the data below, write what each family member's agent would say, in first person, warm, honest and specific to their numbers, appropriate for an Emirati family, at most 30 words each. Then write a 4-step plan for a calm family majlis conversation about the decision, each step at most 22 words. Give every text in English and in Modern Standard Arabic. Do not diagnose anyone and do not tell the family what to decide.
MEMBERS: ${JSON.stringify(prof)}
NEW OR BIGGER RISKS: ${JSON.stringify(risks)}
Reply with only JSON: {"voices":[{"id":"<member id>","en":"...","ar":"..."}],"guide":[{"en":"...","ar":"..."}]}`;
    try {
      const r = await S.sample.json(prompt, { modelTier: 'quick' });
      const v = {}; (r && Array.isArray(r.voices) ? r.voices : []).forEach(x => { if (x && S.dec.member[x.id] && x.en) v[x.id] = { en: String(x.en), ar: String(x.ar || x.en) }; });
      const g = (r && Array.isArray(r.guide) ? r.guide : []).filter(x => x && x.en).map(x => ({ en: String(x.en), ar: String(x.ar || x.en) })).slice(0, 6);
      if (!Object.keys(v).length) throw { code: 'invalid_json' };
      S.voicesAI = v; S.guideAI = g.length ? g : null;
    } catch (e) { S.aiMsg = errCopy(e); if (e && (e.code === 'not_granted' || e.code === 'sampling_disabled')) { S.sample = null; S.aiState = 'off'; renderChrome(); } }
    S.aiBusy = false; renderPanel('insights');
  }
  const EFFECT_TYPES = ['commute', 'extraWork', 'eveningOut', 'remote', 'nightShift', 'elderLives', 'baby', 'phonesOff', 'finance', 'privacyLoss', 'kidsBus', 'study', 'space', 'inlaws'];
  function cleanEffects(list) {
    const ids = new Set(S.members.map(m => m.id));
    return (Array.isArray(list) ? list : []).filter(e => e && EFFECT_TYPES.includes(e.type) && (!('member' in e) || ids.has(e.member) || e.type === 'baby')).slice(0, 8);
  }
  function offlineParse(text) {
    const tx = text.toLowerCase();
    const rules = [[/night|shift|ليل|مناوب/, 'nightShifts'], [/dubai|commute|drive|traffic|new job|job|دبي|وظيفة|مواصلات|قيادة/, 'dubaiJob'], [/grand|جد/, 'grandmaIn'], [/baby|pregnan|مولود|حمل/, 'baby'],
      [/phone|screen|mobile|هاتف|جوال|شاش/, 'phonesOff'], [/master|study|degree|course|class|university|دراس|ماجستير|جامع/, 'masters'], [/parent|in-law|أهل|والد/, 'inlaws'], [/move|villa|house|انتقال|فيلا|بيت|منزل|سكن/, 'moveFar'], [/branch|closer|near|قريب|فرع/, 'nouraNear']];
    for (const [re, id] of rules) { const s = SCENARIOS.find(x => x.id === id && x.fam.includes(S.fam)); if (re.test(tx) && s) return s; }
    return null;
  }
  async function understand() {
    const el = $('#customTxt'); const text = (el ? el.value : S.customText).trim(); S.customText = text;
    if (!text || S.parsing) return;
    const fallback = (note) => {
      const s = offlineParse(text);
      if (s) { S.custom = { id: 'custom', icon: 'spark', title: { en: text, ar: text }, desc: s.desc, effects: clone(s.effects), by: 'rules', basedOn: s.title }; S.parseMsg = note || ''; }
      else { S.custom = null; S.parseMsg = (note ? note + ' ' : '') + t('parseNone'); }
    };
    if (!S.sample) { fallback(); renderPanel('decision'); return; }
    S.parsing = true; S.parseMsg = t('parsing'); renderPanel('decision');
    const fam = S.members.map(m => ({ id: m.id, name: m.name.en, role: m.role, age: m.age }));
    const prompt = `Translate a family decision into simulation effects for FamilyVerse AI, a family simulator for UAE families.
FAMILY MEMBERS: ${JSON.stringify(fam)}
ALLOWED EFFECTS (use only these, with exactly these fields):
- {"type":"commute","member":id,"minutesEachWay":0-180}  (current drives are about 25-40 minutes)
- {"type":"extraWork","member":id,"hours":0-4}  (longer weekday work)
- {"type":"eveningOut","member":id,"days":[0-6],"from":0-24,"to":0-24}  (days: 0=Monday ... 6=Sunday; away from home)
- {"type":"remote","member":id,"days":[0-4]}
- {"type":"nightShift","member":id,"days":[0-6]}  (19:00 to 07:00)
- {"type":"elderLives","value":"home"|"nearby"|"far"}  (where the grandparent lives)
- {"type":"baby","member":id of the mother}
- {"type":"phonesOff","from":0-24,"to":0-24}
- {"type":"finance","member":id,"delta":-0.3..0.3}  (negative = less money stress, positive = more)
- {"type":"privacyLoss","member":id,"value":0-0.4}
- {"type":"kidsBus","extraMinutes":0-60}
- {"type":"study","member":id}  (1 hour of study on weekday evenings)
- {"type":"space","value":0-0.2}  (more space at home)
DECISION: ${JSON.stringify(text)}
Reply with only JSON: {"title_en":"short title","title_ar":"short Arabic title","summary_en":"one sentence","summary_ar":"one Arabic sentence","effects":[...]}`;
    try {
      const r = await S.sample.json(prompt, { modelTier: 'quick' });
      const eff = cleanEffects(r && r.effects);
      if (!eff.length) throw { code: 'invalid_json' };
      S.custom = { id: 'custom', icon: 'spark', title: { en: String(r.title_en || text), ar: String(r.title_ar || r.title_en || text) }, desc: { en: String(r.summary_en || ''), ar: String(r.summary_ar || r.summary_en || '') }, effects: eff, by: 'ai' };
      S.parseMsg = '';
    } catch (e) {
      if (e && (e.code === 'not_granted' || e.code === 'sampling_disabled')) { S.sample = null; S.aiState = 'off'; renderChrome(); }
      fallback(errCopy(e));
    }
    S.parsing = false; renderPanel('decision');
  }

  /* ---------- effect descriptions ---------- */
  function effectLines(effects) {
    const D = STR[S.lang].days, join = a => a.map(d => D[d]).join(S.lang === 'ar' ? ' و' : ', ');
    return (effects || []).map(e => {
      const m = e.member ? esc(nameOf(e.member)) : '';
      switch (e.type) {
        case 'commute': return tpl(EFFECT_TXT.commute, { m, v: r0(e.minutesEachWay) });
        case 'extraWork': return tpl(EFFECT_TXT.extraWork, { m, v: e.hours });
        case 'eveningOut': return tpl(EFFECT_TXT.eveningOut, { m, days: join(e.days || []), from: fmtHour(e.from), to: fmtHour(e.to) });
        case 'study': return tpl(EFFECT_TXT.study, { m });
        case 'remote': return tpl(EFFECT_TXT.remote, { m, days: join(e.days || []) });
        case 'nightShift': return tpl(EFFECT_TXT.nightShift, { m, days: join(e.days || []) });
        case 'elderLives': return tpl(EFFECT_TXT.elderLives, { v: t('lives_' + e.value) });
        case 'baby': return tpl(EFFECT_TXT.baby, { m: esc(nameOf(e.member || 'fatima')) });
        case 'phonesOff': return tpl(EFFECT_TXT.phonesOff, { from: fmtHour(e.from), to: fmtHour(e.to) });
        case 'finance': return tpl(e.delta < 0 ? EFFECT_TXT.finance_down : EFFECT_TXT.finance_up, { m });
        case 'privacyLoss': return tpl(EFFECT_TXT.privacyLoss, { m });
        case 'kidsBus': return tpl(EFFECT_TXT.kidsBus, { v: e.extraMinutes });
        case 'space': return L(EFFECT_TXT.space);
        case 'inlaws': return L(EFFECT_TXT.inlaws);
      }
      return '';
    }).filter(Boolean);
  }
  function fixTitle(f) {
    const ms = S.dec.ms, by = r => (ms.find(m => m.role === r) || {}).id;
    if (f.id === 'homework') return tpl(FIX_TXT[f.target === 'elder' ? 'homework_elder' : 'homework_teen'], { teen: esc(nameOf(by('teen'))), child: esc(nameOf(by('child'))), elder: esc(nameOf(by('elder'))) });
    const tg = member(f.target) ? esc(nameOf(f.target)) : '';
    return tpl(FIX_TXT[f.id], { t: tg }, isF(f.target));
  }

  /* ---------- panels ---------- */
  function deltaChip(d, invert, unit) {
    const good = invert ? d < 0 : d > 0, cls = Math.abs(d) < 0.5 ? 'flat' : good ? 'up' : 'down';
    const s = (d > 0 ? '+' : d < 0 ? '−' : '±') + (unit === 'h' ? f1(Math.abs(d)) : r0(Math.abs(d)));
    return `<span class="delta ${cls}" dir="ltr">${s}${unit === 'h' ? ' ' + t('hours') : ''}</span>`;
  }
  function renderFamily() {
    const fam = FAMILIES[S.fam];
    return `<h2>${t('famH')}</h2><p class="lede">${t('famSub')}</p>
      <div class="fam-pick" role="group">${Object.keys(FAMILIES).map(id => `<button data-act="fam" data-id="${id}" aria-pressed="${S.fam === id}"><b>${esc(L(FAMILIES[id].name))}</b><small>${esc(L(FAMILIES[id].place))}</small></button>`).join('')}</div>
      <div class="grid2"><div class="box"><div id="famOrbit">${orbitSVG('famOrbit', orbitNodes(S.base))}</div>${orbitLegend()}<p class="note">${t('orbitNote')}</p></div>
      <div class="mgrid">${S.members.map(m => `<div class="mcard"><div class="mhead"><span class="av">${esc(initials(m))}</span><div><input class="nm" id="nm-${m.id}" data-act="name" data-id="${m.id}" value="${esc(L(m.name))}" aria-label="${t('name')}"><div class="sub">${esc(L(m.job))} · ${t('age')} ${m.age}</div></div></div>
        <div class="routine">${esc(L(m.routine))}</div>
        ${['social', 'resilience', 'screen'].map(k => `<label class="sl" for="tr-${m.id}-${k}"><span>${t('tr_' + k)}</span><output id="o-${m.id}-${k}">${r0(m.traits[k] * 10)}/10</output><input type="range" min="0" max="10" step="1" id="tr-${m.id}-${k}" data-act="trait" data-id="${m.id}" data-k="${k}" value="${r0(m.traits[k] * 10)}"></label>`).join('')}</div>`).join('')}</div></div>
      <div class="actions"><button class="btn ghost" data-act="reset">${t('reset')}</button><button class="btn" data-act="go" data-tab="decision">${t('toDecision')} <span class="arr">→</span></button></div>`;
  }
  function renderDecision() {
    const sc = curScn();
    const by = S.custom ? `<p class="by">${S.custom.by === 'ai' ? t('readByAI') : t('readByRules') + ' (' + esc(L(S.custom.basedOn)) + ')'}</p>` : '';
    return `<h2>${t('decH')}</h2><p class="lede">${t('decSub')}</p>
      <div class="dec-grid"><div>
        <div class="scns">${scnsFor().map(s => `<button class="scn" data-act="scn" data-id="${s.id}" aria-pressed="${!S.custom && S.scn === s.id}">${icon(s.icon)}<b>${esc(L(s.title))}</b><span>${esc(L(s.desc))}</span></button>`).join('')}</div>
        <div class="box custom"><label for="customTxt"><h3 style="margin:0">${t('customLabel')}</h3></label><textarea id="customTxt" rows="2" placeholder="${esc(t('customPh'))}">${esc(S.customText)}</textarea>
          <div class="row"><button class="btn ghost small" data-act="understand" ${S.parsing ? 'disabled' : ''}>${S.parsing ? `<span class="busy">${t('parsing')}</span>` : (S.sample ? t('understandAI') : t('understandOff'))}</button><span class="status" aria-live="polite">${S.parsing ? '' : esc(S.parseMsg)}</span></div></div>
      </div>
      <div class="box effects"><div class="eyebrow">${t('changes')}</div><h3 style="margin-top:6px">${esc(L(sc.title))}</h3>${sc.desc && L(sc.desc) ? `<p class="note" style="margin-top:0">${esc(L(sc.desc))}</p>` : ''}<ul>${effectLines(sc.effects).map(x => `<li>${x}</li>`).join('')}</ul>${by}
        <div class="runrow"><label for="runs">${t('runs')}</label><select id="runs" data-act="runs">${[30, 60, 120].map(n => `<option value="${n}" ${S.R === n ? 'selected' : ''}>${n}</option>`).join('')}</select>
        <button class="btn" data-act="run" ${S.busy ? 'disabled' : ''}>${S.busy ? `<span class="busy">${t('running')}</span>` : t('run') + ' <span class="arr">→</span>'}</button></div></div></div>`;
  }
  function feedHTML(upto) {
    const days = STR[S.lang].daysLong, items = [];
    const cpl = isCouple(S.dec);
    for (let d = 0; d <= Math.min(6, upto); d++) {
      const hs = S.dec.hotList.filter(h => h.d === d && h.prob >= 0.3).slice(0, 3);
      const bh = k => (S.base.hot[k] || { n: 0 }).n / S.base.R;
      const a = cpl ? S.dec.coupleDay[d] : S.dec.famDay[d], b = cpl ? S.base.coupleDay[d] : S.base.famDay[d];
      const tag = a - b >= 0.4 ? 'good' : a - b <= -0.4 ? 'bad' : '';
      items.push(`<li><span class="when">${esc(days[d])}</span><span>${tag ? `<span class="tag ${tag}">${tag === 'good' ? '+' : '−'}${f1(Math.abs(a - b))} ${t('hours')}</span>` : ''}${t(cpl ? 'feedTimeC' : 'feedTime', { a: f1(a), b: f1(b) })}</span><span class="p"></span></li>`);
      hs.forEach(h => { const isNew = h.prob - bh(h.key) >= 0.15; items.push(`<li><span class="when">${fmtT(h.k0)}</span><span>${isNew ? `<span class="tag bad">${S.lang === 'ar' ? 'جديد' : 'new'}</span>` : ''}${hotText(h.type, h.who)}</span><span class="p">${r0(h.prob * 100)}%</span></li>`); });
    }
    return items.join('');
  }
  function dayPill(upto) { return STR[S.lang].days.concat([t('week')]).map((d, i) => `<span class="${i === upto ? 'on' : i < upto ? 'done' : ''}">${esc(d)}</span>`).join(''); }
  function renderSimulate() {
    const day = S.animDay;
    return `<h2>${t('simH', { n: S.R })}</h2><p class="lede">${t('simSub', { n: S.R })}</p>
      <div class="grid2"><div class="box"><div class="eyebrow">${esc(L(S.ran.title))}</div><div class="daypill" id="dayPill" style="margin-top:10px">${dayPill(day)}</div><div id="simOrbit">${orbitSVG('simOrbit', orbitNodes(S.dec, day >= 7 ? null : Math.max(0, day)))}</div>${orbitLegend()}</div>
      <div class="stack"><div class="box"><h3>${t('chartDaily')}</h3>${legendHTML(seriesList(false))}<div class="chart" id="lineChart" data-upto="${day}"></div></div>
      <div class="box"><h3>${t('feedH')}</h3><ol class="feed" id="feed">${feedHTML(day)}</ol></div></div></div>
      <div class="actions"><button class="btn ghost" data-act="replay">${t('replay')}</button><button class="btn" data-act="go" data-tab="insights">${t('seeInsights')} <span class="arr">→</span></button></div>`;
  }
  function renderInsights() {
    const B = S.base, D = S.dec, cpl = isCouple(D);
    const diffs = D.ms.filter(m => B.member[m.id]).map(m => ({ m, d: D.member[m.id].mean - B.member[m.id].mean })).sort((a, b) => Math.abs(b.d) - Math.abs(a.d));
    const aff = diffs[0];
    const { up, down } = riskDiff();
    const voices = S.voicesAI ? Object.fromEntries(Object.entries(S.voicesAI).map(([k, v]) => [k, v[S.lang] || v.en])) : engineVoices();
    const guide = S.guideAI ? S.guideAI.map(g => g[S.lang] || g.en) : engineGuide();
    const aiBtn = S.sample ? `<button class="btn ghost small" data-act="aiwrite" ${S.aiBusy ? 'disabled' : ''}>${S.aiBusy ? `<span class="busy">${t('aiWriting')}</span>` : t('aiWrite')}</button>` : '';
    return `<h2>${esc(L(S.ran.title))}</h2><p class="lede">${t('insSub', { n: S.R })}</p>
      <div class="kpis">
        <div class="kpi"><span class="eyebrow">${t('k_harm')}</span><span class="v">${r0(D.harmony.mean)}<small>/ 100</small></span><span class="from">${t('fromToday', { x: r0(B.harmony.mean) })} ${deltaChip(D.harmony.mean - B.harmony.mean)}</span></div>
        <div class="kpi"><span class="eyebrow">${t(cpl ? 'k_timeC' : 'k_time')}</span><span class="v">${f1(famTime(D))}<small>${t('hours')}</small></span><span class="from">${t('fromToday', { x: f1(famTime(B)) + ' ' + t('hours') })} ${deltaChip(famTime(D) - famTime(B), false, 'h')}</span></div>
        <div class="kpi"><span class="eyebrow">${t('k_aff')}</span><span class="v" style="font-size:24px">${esc(aff ? L(aff.m.name) : '—')}</span><span class="from">${aff ? `${ab(r0(B.member[aff.m.id].mean), r0(D.member[aff.m.id].mean))} ${deltaChip(aff.d)}` : ''}</span></div>
        <div class="kpi"><span class="eyebrow">${t('k_hot')}</span><span class="v">${f1(D.events)}</span><span class="from">${t('fromToday', { x: f1(B.events) })} ${deltaChip(D.events - B.events, true)}</span></div>
      </div>
      <p class="conf">${t('range', { n: S.R, a: r0(D.harmony.p10), b: r0(D.harmony.p90) })}</p>
      <div class="ins-grid"><div class="box"><h3>${t('wbH')}</h3>${legendHTML(seriesList(false))}<div style="margin-top:12px">${barsHTML(seriesList(false))}</div><p class="note">${t('wbNote')}</p></div>
        <div class="stack"><div class="box"><h3>${t('heatH')}</h3>${heatHTML(D)}<p class="note">${t('heatNote')}</p></div>
        <div class="box"><h3>${t('risksH')}</h3><ul class="risks">${up.length ? up.map(r => riskLi(r)).join('') : `<li><span></span><span>${t('noRisks')}</span><span></span></li>`}</ul>${down.length ? `<h3 style="margin-top:16px">${t('goneH')}</h3><ul class="risks">${down.map(r => riskLi(r, true)).join('')}</ul>` : ''}</div></div></div>
      <div class="box" style="margin-bottom:18px"><div class="row" style="justify-content:space-between"><h3 style="margin:0">${t('voicesH')}</h3>${aiBtn}</div>
        <p class="by" aria-live="polite">${S.aiMsg ? esc(S.aiMsg) : (S.voicesAI ? t('byAI') : t('byEngine'))}</p>
        <div class="voices">${D.ms.map(m => { const Bm = B.member[m.id], Dm = D.member[m.id]; return `<div class="voice"><div class="mhead"><span class="av">${esc(initials(m))}</span><div><b>${esc(L(m.name))}</b><div class="sub">${Bm ? `${ab(r0(Bm.mean), r0(Dm.mean))} ${deltaChip(Dm.mean - Bm.mean)}` : `${r0(Dm.mean)} / 100`}</div></div></div><q>${esc(voices[m.id] || '')}</q></div>`; }).join('')}</div></div>
      <div class="box"><h3>${t('guideH')}</h3><ol class="guide">${guide.map(g => `<li>${esc(g)}</li>`).join('')}</ol></div>
      <div class="actions"><button class="btn" data-act="go" data-tab="fixes">${t('tab_fixes')} <span class="arr">→</span></button></div>`;
  }
  function heatHTML(res) {
    const days = STR[S.lang].days, bands = STR[S.lang].bands;
    let h = `<div class="heat" role="table"><span></span>${(STR[S.lang].daysShort || days).map(d => `<span class="hd">${esc(d)}</span>`).join('')}`;
    for (let b = 0; b < 4; b++) {
      h += `<span class="rl">${esc(bands[b])}</span>`;
      for (let d = 0; d < 7; d++) {
        const p = res.heat[d][b], top = res.hotList.filter(x => x.d === d && bandOf(x.k0) === b && x.prob >= 0.2).slice(0, 2);
        const tip = `${STR[S.lang].daysLong[d]} · ${bands[b]}\n${r0(p * 100)}%` + (top.length ? '\n' + top.map(x => hotText(x.type, x.who).replace(/&#39;/g, "'").replace(/&amp;/g, '&')).join('\n') : '');
        h += `<span class="cell" data-tip="${esc(tip)}" style="background:color-mix(in oklab, var(--risk) ${r0(5 + p * 85)}%, var(--surface));color:${p > 0.55 ? 'var(--surface)' : 'var(--ink)'}">${p >= 0.05 ? r0(p * 100) : '·'}</span>`;
      }
    }
    return h + `</div><div class="heat-key"><span>0%</span><span class="ramp"></span><span>100%</span></div>`;
  }
  function renderFixes() {
    const list = S.fixList, good = list.filter(f => f.dH > 0.3);
    const cpl = isCouple(S.dec);
    const rows = list.map(f => {
      const on = S.picked.has(f.id), useful = f.dH > 0.3;
      const best = f.best && f.best.d > 0.5 ? t('helpsMost', { n: esc(nameOf(f.best.id)) }) + ` (+${r0(f.best.d)})` : '';
      const why = [f.dFam ? `${f.dFam > 0 ? '+' : '−'}${f1(Math.abs(f.dFam))} ${t('hrsWeek')}` : '', best].filter(Boolean).join(' · ');
      return `<label class="fix ${useful ? '' : 'off'}" for="fx-${f.id}"><input type="checkbox" id="fx-${f.id}" data-act="pick" data-id="${f.id}" ${on ? 'checked' : ''}><div><b>${fixTitle(f)}</b><div class="why">${why}</div></div><div class="gain">${deltaChip(f.dH)}<span class="by">${t('harmony')}</span></div></label>`;
    }).join('');
    const C = (k, res, color) => `<div style="border-top-color:${color}"><small>${t(k)}</small><span class="v">${r0(res.harmony.mean)}</span><small>${f1(famTime(res))} ${t(cpl ? 'k_timeC' : 'hrsWeek')}</small></div>`;
    return `<h2>${t('fixH')}</h2><p class="lede">${t('fixSub', { t: list.length, n: Math.min(S.R, 40) })}</p>
      <div class="grid2"><div class="stack">${good.length ? '' : `<p class="note">${t('fixNone')}</p>`}<div class="fixes">${rows}</div>
        <div class="actions" style="justify-content:flex-start"><button class="btn" data-act="applyFix">${t('applyFix')}</button></div></div>
      <div class="stack"><div class="box"><h3>${t('cmpH')}</h3><div class="cmp">${C('s_today', S.base, 'var(--s1)')}${C('s_dec', S.dec, 'var(--s2)')}${S.fixRes ? C('s_fix', S.fixRes, 'var(--s3)') : ''}</div></div>
        <div class="box"><h3>${t('chartDaily')}</h3>${legendHTML(seriesList(true))}<div class="chart" id="fixChart" data-upto="6"></div></div>
        ${S.fixRes ? `<div class="box"><h3>${t('wbH')}</h3>${legendHTML(seriesList(true))}<div style="margin-top:12px">${barsHTML(seriesList(true))}</div></div>` : ''}</div></div>`;
  }
  const TRUST = {
    pipe: [
      { en: ['Profiles', 'Each member has an age, a role, a routine and three traits.'], ar: ['الملفات', 'لكل فرد عمر ودور وروتين وثلاث سمات.'] },
      { en: ['Agents', 'One agent per person plans every half hour: sleep, work, school, chores, screens and family time.'], ar: ['الوكلاء', 'وكيل لكل شخص يخطط كل نصف ساعة: النوم والعمل والمدرسة والمهام والشاشات ووقت العائلة.'] },
      { en: ['Decision reader', 'Claude turns a decision written in Arabic or English into exact changes. Offline rules are the backup.'], ar: ['قارئ القرار', 'يحوّل Claude القرار المكتوب بالعربية أو الإنجليزية إلى تغييرات دقيقة، والقواعد دون اتصال هي البديل.'] },
      { en: ['Monte Carlo engine', '30 to 120 weeks × 7 days × 48 slots, with random traffic, overtime, sick days and night wakings. Today and the decision share the same random weeks.'], ar: ['محرك مونت كارلو', 'من 30 إلى 120 أسبوعًا × 7 أيام × 48 فترة، مع زحمة وعمل إضافي وأيام مرض واستيقاظ ليلي عشوائي. اليوم والقرار يتشاركان الأسابيع العشوائية نفسها.'] },
      { en: ['Insight engine', 'Scores wellbeing and harmony, finds conflict hotspots, and tests up to 12 fixes to rank what helps.'], ar: ['محرك النتائج', 'يحسب الرفاه والانسجام، ويكتشف بؤر الخلاف، ويجرّب حتى 12 حلًا ويرتّبها حسب فائدتها.'] },
      { en: ['Narrator', 'Claude writes each agent\'s voice and a family conversation plan in both languages.'], ar: ['الراوي', 'يكتب Claude صوت كل وكيل وخطة حوار عائلي باللغتين.'] }
    ],
    formula: {
      en: 'wellbeing (0–100) = 100 × score^1.5\nscore = connection × (0.26 + 0.12 × social)\n      + rest × 0.24\n      + (1 − load stress) × 0.22\n      + role need × remaining weight\n\nrole need: child = homework help · teen = privacy and say\n           grandparent = daily contact · parent = money security\n\nharmony = 0.55 × average wellbeing\n        + 0.25 × family-time score\n        + 0.20 × fairness (100 − 2 × spread between members)\n        − 1.5 per conflict hotspot',
      ar: 'الرفاه (0–100) = 100 × النتيجة^1.5\nالنتيجة = التواصل × (0.26 + 0.12 × الحاجة الاجتماعية)\n        + الراحة × 0.24\n        + (1 − ضغط الأعباء) × 0.22\n        + حاجة الدور × الوزن المتبقي\n\nحاجة الدور: الطفل = المساعدة في الواجبات · المراهق = الخصوصية والرأي\n            الجد = التواصل اليومي · الوالدان = الأمان المالي\n\nالانسجام = 0.55 × متوسط الرفاه\n          + 0.25 × نتيجة وقت العائلة\n          + 0.20 × العدالة (100 − 2 × التفاوت بين الأفراد)\n          − 1.5 لكل بؤرة خلاف'
    },
    principles: [
      { en: ['Estimates, not predictions', 'Results start a family conversation. They never decide for the family.'], ar: ['تقديرات لا تنبؤات', 'النتائج تفتح حوارًا عائليًا، ولا تقرر نيابة عن العائلة.'] },
      { en: ['Privacy by design', 'The simulation runs inside this page and nothing is saved. Claude sees first names, roles and scores only when you press a Claude button.'], ar: ['الخصوصية في التصميم', 'تعمل المحاكاة داخل هذه الصفحة ولا يُحفظ شيء. لا يرى Claude الأسماء الأولى والأدوار والنتائج إلا عند الضغط على زر Claude.'] },
      { en: ['Everyone has a voice', 'Children and grandparents build their own profile with the family, and every agent\'s view is shown, not only the parents\'.'], ar: ['لكل فرد صوت', 'يبني الأطفال والأجداد ملفاتهم مع العائلة، ويظهر رأي كل وكيل وليس الوالدين فقط.'] },
      { en: ['Fairness built in', 'Harmony drops when one person carries the cost, even if the average looks fine.'], ar: ['العدالة جزء من الحساب', 'ينخفض الانسجام عندما يتحمل شخص واحد الكلفة، حتى لو بدا المتوسط جيدًا.'] },
      { en: ['Not a diagnosis', 'FamilyVerse does not assess mental health. For serious worries, families should speak to a family counselling professional.'], ar: ['ليس تشخيصًا', 'لا يقيّم FamilyVerse الصحة النفسية. عند القلق الجدي، على العائلة التحدث إلى مختص في الإرشاد الأسري.'] },
      { en: ['Open about limits', 'Routines are simplified and the weights are our assumptions, written down so anyone can test them.'], ar: ['شفافية في الحدود', 'الروتين مبسّط والأوزان افتراضات من وضعنا، مكتوبة ليتمكن أي شخص من اختبارها.'] }
    ],
    sources: [
      { en: 'The UAE launched the Year of Family 2026 under the tagline "Growing in Unity".', ar: 'أطلقت الإمارات عام الأسرة 2026 تحت شعار «ننمو معًا».', url: 'https://gulfnews.com/uae/government/year-of-family-uae-unveils-plans-to-support-families-1.500412297', src: 'Gulf News' },
      { en: 'In a survey of 5,034 UAE residents, 46% said they get less than one hour of quality family time a day.', ar: 'في استطلاع شمل 5,034 من سكان الإمارات، قال 46% إنهم يقضون أقل من ساعة يوميًا من الوقت العائلي النوعي.', url: 'https://gulfnews.com/uae/uae-families-spend-less-than-an-hour-together-1.1510481', src: 'Gulf News' },
      { en: '30% of UAE parents report conflicts with their children over online life, mostly about time spent online.', ar: '30% من الآباء في الإمارات يواجهون خلافات مع أبنائهم بسبب الحياة الرقمية، ومعظمها حول وقت الاستخدام.', url: 'https://tahawultech.com/?p=105830', src: 'Kaspersky and UAE Cyber Security Council, via Tahawul Tech' },
      { en: 'About 30% of UAE divorces in 2024 happened within the first year of marriage.', ar: 'نحو 30% من حالات الطلاق في الإمارات عام 2024 وقعت في السنة الأولى من الزواج.', url: 'https://www.khaleejtimes.com/uae/uae-marriages-divorce-data-experts-concerned', src: 'Khaleej Times' },
      { en: 'Residents aged 65 and over were projected to grow from 6% to 29% of the UAE population by 2050.', ar: 'توقعت التقديرات ارتفاع نسبة من هم في سن 65 فأكثر من 6% إلى 29% من سكان الإمارات بحلول 2050.', url: 'https://www.thenational.ae/uae/health/uae-s-growing-elderly-population-at-risk-from-isolation-and-depression-1.968037', src: 'The National' },
      { en: 'English media and English-speaking nannies can shift a home\'s main language away from Arabic.', ar: 'قد تؤدي الوسائط الإنجليزية والمربيات الناطقات بالإنجليزية إلى إبعاد لغة البيت عن العربية.', url: 'https://www.thenationalnews.com/news/uae/2026/08/21/learning-arabic-uae-social-media-english/', src: 'The National, 2026' }
    ]
  };
  function renderTrust() {
    return `<h2>${t('trustH')}</h2><p class="lede">${t('trustSub')}</p>
      <div class="trust-grid"><div class="pipe">${TRUST.pipe.map((p, i) => `<div><span class="n">${String(i + 1).padStart(2, '0')}</span><b>${esc(L(p)[0])}</b><span>${esc(L(p)[1])}</span></div>`).join('')}</div>
      <div class="grid2"><div class="box"><h3>${t('formulaH')}</h3><div class="formula" dir="${S.lang === 'ar' ? 'rtl' : 'ltr'}">${esc(L(TRUST.formula))}</div></div>
        <div class="box"><h3>${t('principlesH')}</h3><div class="principles">${TRUST.principles.map(p => `<div><b>${esc(L(p)[0])}</b><p>${esc(L(p)[1])}</p></div>`).join('')}</div></div></div>
      <div class="box"><h3>${t('sourcesH')}</h3><ol class="sources">${TRUST.sources.map(s => `<li>${esc(L(s))} <a href="${s.url}" target="_blank" rel="noopener">${esc(s.src)}</a></li>`).join('')}</ol><p class="note">${t('sourcesNote')}</p></div>
      <div class="box"><h3>${t('teamH')}</h3><p style="margin:0">${S.lang === 'ar' ? 'مدرسة أبو سعيد الخضري · المسار الثاني – الحلقة الثالثة (الصفوف 9–12)' : 'Abu Saeed Al Khodrey School · Track 2 – Cycle 3 (Grades 9–12)'}</p>
        <div class="team">${['Abdulaziz Ahmad', 'Salah Hazem', 'Yaseen Mehmoud', 'Yaseen Sharief', 'Zeyad Hamdi'].map(n => `<span>${n}</span>`).join('')}</div></div></div>`;
  }
  const RENDER = { family: renderFamily, decision: renderDecision, simulate: renderSimulate, insights: renderInsights, fixes: renderFixes, trust: renderTrust };

  /* ---------- shell ---------- */
  function renderChrome() {
    const ai = S.aiState === 'on' ? `<span class="chip on"><i></i>${t('aiOn')}</span>` : S.aiState === 'wait' ? `<span class="chip"><i></i>${t('aiWait')}</span>` : `<span class="chip"><i></i>${t('aiOff')}</span>`;
    $('#chrome').innerHTML = `<div class="brand">${LOGO}<div><b>FamilyVerse AI</b><span>${t('brandSub')}</span></div></div>${ai}<span class="chip">${t('example')}</span>
      <div class="seg" role="group" aria-label="Language"><button data-act="lang" data-v="en" aria-pressed="${S.lang === 'en'}">English</button><button data-act="lang" data-v="ar" aria-pressed="${S.lang === 'ar'}">العربية</button></div>`;
    const d = S.dec.harmony.mean - S.base.harmony.mean;
    $('#hero').innerHTML = `<div><h1>${t('heroH')}</h1><p>${t('heroP')}</p></div>
      <button class="result-strip" data-act="go" data-tab="insights"><small>${t('stripLbl')}</small><b>${esc(L(S.ran.title))}</b><span><small>${t('stripHarm')}</small> <span class="num" dir="ltr">${r0(S.base.harmony.mean)} → ${r0(S.dec.harmony.mean)}</span> ${deltaChip(d)}</span></button>`;
    $('#steps').innerHTML = TABS.map((k, i) => `<button data-act="tab" data-tab="${k}" ${S.tab === k ? 'aria-current="page"' : ''}><span class="n">${i + 1}</span>${t('tab_' + k)}</button>`).join('');
    $('#foot').textContent = t('footer');
  }
  function renderPanel(k) { const el = document.getElementById('p-' + k); if (el) { el.innerHTML = RENDER[k](); if (S.tab === k) drawCharts(); } }
  function renderAll() { renderChrome(); TABS.forEach(k => { const el = document.getElementById('p-' + k); el.innerHTML = RENDER[k](); }); drawCharts(); }
  function drawCharts() {
    if (S.tab === 'simulate') lineChart($('#lineChart'), seriesList(false), S.animDay);
    if (S.tab === 'fixes') lineChart($('#fixChart'), seriesList(true), 6);
  }
  function show(tab, push = true) {
    if (!TABS.includes(tab)) tab = 'family';
    S.tab = tab;
    TABS.forEach(k => { document.getElementById('p-' + k).hidden = k !== tab; });
    document.querySelectorAll('#steps button').forEach(b => { if (b.dataset.tab === tab) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
    if (push && location.hash !== '#' + tab) { try { history.replaceState(null, '', '#' + tab); } catch (e) { location.hash = tab; } }
    drawCharts();
    const b = document.querySelector(`#steps button[data-tab="${tab}"]`); if (b && b.scrollIntoView) b.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }
  function runAnim() {
    clearInterval(S.timer);
    if (reduced()) { S.animDay = 7; renderPanel('simulate'); return; }
    S.animDay = 0; renderPanel('simulate');
    S.timer = setInterval(() => {
      S.animDay++;
      if (S.animDay >= 7) clearInterval(S.timer);
      updateOrbit('simOrbit', orbitNodes(S.dec, S.animDay >= 7 ? null : S.animDay));
      const dp = $('#dayPill'); if (dp) dp.innerHTML = dayPill(S.animDay);
      const fd = $('#feed'); if (fd) { fd.innerHTML = feedHTML(S.animDay); fd.scrollTop = fd.scrollHeight; }
      lineChart($('#lineChart'), seriesList(false), S.animDay);
    }, 700);
  }
  function recomputeQuiet() { compute(); renderChrome(); TABS.filter(k => k !== 'family' && k !== 'decision').forEach(k => { document.getElementById('p-' + k).innerHTML = RENDER[k](); }); updateOrbit('famOrbit', orbitNodes(S.base)); drawCharts(); }
  let debounceT = null;
  const debounced = fn => { clearTimeout(debounceT); debounceT = setTimeout(fn, 320); };

  /* ---------- events ---------- */
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-act]'); if (!b) return;
    const a = b.dataset.act;
    if (a === 'tab' || a === 'go') { show(b.dataset.tab); window.scrollTo({ top: Math.min(window.scrollY, ($('#steps').offsetTop || 0) - 8), behavior: 'smooth' }); }
    else if (a === 'lang') { S.lang = b.dataset.v; document.documentElement.lang = S.lang; document.documentElement.dir = S.lang === 'ar' ? 'rtl' : 'ltr'; renderAll(); show(S.tab, false); }
    else if (a === 'fam') { if (S.fam === b.dataset.id) return; S.fam = b.dataset.id; S.members = clone(FAMILIES[S.fam].members); S.scn = scnsFor()[0].id; S.custom = null; S.customText = ''; S.parseMsg = ''; compute(); renderAll(); show(S.tab, false); }
    else if (a === 'reset') { S.members = clone(FAMILIES[S.fam].members); compute(); renderAll(); show(S.tab, false); }
    else if (a === 'scn') { S.scn = b.dataset.id; S.custom = null; renderPanel('decision'); }
    else if (a === 'understand') understand();
    else if (a === 'run') {
      if (S.busy) return; S.busy = true; renderPanel('decision');
      setTimeout(() => { compute(); S.busy = false; renderAll(); show('simulate'); runAnim(); }, 40);
    }
    else if (a === 'replay') runAnim();
    else if (a === 'aiwrite') aiVoices();
    else if (a === 'applyFix') { computeFix(); renderAll(); show('fixes', false); }
  });
  document.addEventListener('input', e => {
    const el = e.target, a = el.dataset && el.dataset.act;
    if (a === 'trait') { const m = S.members.find(x => x.id === el.dataset.id); m.traits[el.dataset.k] = (+el.value) / 10; const o = document.getElementById(`o-${m.id}-${el.dataset.k}`); if (o) o.textContent = el.value + '/10'; debounced(recomputeQuiet); }
    else if (a === 'name') { const m = S.members.find(x => x.id === el.dataset.id); m.name[S.lang] = el.value.slice(0, 24) || m.name.en; debounced(() => { renderChrome(); TABS.filter(k => k !== 'family').forEach(k => { document.getElementById('p-' + k).innerHTML = RENDER[k](); }); updateOrbit('famOrbit', orbitNodes(S.base)); drawCharts(); }); }
    else if (el.id === 'customTxt') S.customText = el.value;
  });
  document.addEventListener('change', e => {
    const el = e.target, a = el.dataset && el.dataset.act;
    if (a === 'runs') S.R = +el.value;
    else if (a === 'pick') { if (el.checked) S.picked.add(el.dataset.id); else S.picked.delete(el.dataset.id); }
  });
  /* tooltip */
  const tip = document.createElement('div'); tip.className = 'tip'; tip.hidden = true; document.body.appendChild(tip);
  document.addEventListener('pointermove', e => {
    const h = e.target.closest && e.target.closest('[data-tip]');
    if (!h) { tip.hidden = true; document.querySelectorAll('.cross').forEach(c => c.style.opacity = 0); return; }
    tip.textContent = h.dataset.tip; tip.hidden = false;
    const w = tip.offsetWidth, hh = tip.offsetHeight;
    let x = e.clientX + 14, y = e.clientY + 14;
    if (x + w > window.innerWidth - 8) x = e.clientX - w - 14;
    if (y + hh > window.innerHeight - 8) y = e.clientY - hh - 14;
    tip.style.left = Math.max(8, x) + 'px'; tip.style.top = Math.max(8, y) + 'px';
    if (h.dataset.cx) { const c = h.ownerSVGElement && h.ownerSVGElement.querySelector('.cross'); if (c) { c.setAttribute('x1', h.dataset.cx); c.setAttribute('x2', h.dataset.cx); c.style.opacity = 1; } }
  });
  document.addEventListener('pointerleave', () => { tip.hidden = true; });
  window.addEventListener('hashchange', () => { const h = location.hash.slice(1); if (TABS.includes(h) && h !== S.tab) show(h, false); });
  let rz = null; window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(drawCharts, 150); });

  /* ---------- boot ---------- */
  S.members = clone(FAMILIES[S.fam].members);
  compute();
  S.animDay = 7;
  renderAll();
  const h0 = location.hash.slice(1); show(TABS.includes(h0) ? h0 : 'family', false);
  (async () => {
    let s = null;
    try { s = window.claude && window.claude.use ? await window.claude.use('sample') : null; } catch (e) { s = null; }
    S.sample = s; S.aiState = s ? 'on' : 'off';
    renderChrome(); renderPanel('decision'); renderPanel('insights');
  })();
})();
