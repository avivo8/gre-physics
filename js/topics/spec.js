/* Specialized Topics — Chapter 8 of Conquering the Physics GRE (Kahn & Anderson).
 * 8.1 nuclear & particle physics, 8.2 condensed matter, 8.3 astrophysics, 8.4 recent Nobel prizes.
 * Templates follow tools/AUTHORING.md. Particle quantum numbers and masses follow the PDG.
 */
(function (GRE) {
  'use strict';
  const F = GRE.fmt;
  const raw = String.raw;
  const C = GRE.C;

  // ================================================================== generic helpers
  const ROM = ['I', 'II', 'III'];
  /** Roman-numeral question from pools of [statement, reason] pairs. */
  function romanQ(R, intro, TRUE, FALSE) {
    const nT = R.int(1, 3);
    const st = R.shuffle(R.pickN(TRUE, nT).map(s => [s, true]).concat(R.pickN(FALSE, 3 - nT).map(s => [s, false])));
    return Object.assign({ q: GRE.romanStem(intro, st.map(x => x[0][0])) }, GRE.roman(R, st.map(x => x[1])), {
      expl: st.map((x, i) => `${ROM[i]} is ${x[1] ? 'true' : 'false'}: ${x[0][1]}`).join(' '),
    });
  }
  /** "Which statement is true?" from [statement, reason] pools (neg: "which is false?"). */
  function factQ(R, stem, TRUE, FALSE, neg) {
    const good = neg ? FALSE : TRUE, bad = neg ? TRUE : FALSE;
    const c = R.pick(good);
    return Object.assign({ q: stem }, GRE.mc(R, c[0], R.pickN(bad, Math.min(bad.length, 6)).map(x => x[0])), { expl: c[1] });
  }
  /** mc over numeric values with ordered choices; fmt(v) -> choice string */
  function mcVals(R, correct, wrongs, fmt) {
    const val = new Map();
    const f = v => { const s = fmt(v); if (s != null) val.set(s, v); return s; };
    const c = f(correct);
    const seen = new Set([c]);
    const ws = [];
    for (const w of wrongs) { if (w == null || !isFinite(w)) continue; const s = f(w); if (s != null && !seen.has(s)) { seen.add(s); ws.push(s); } }
    for (const k of [2, 0.5, 4, 0.25, 3, 1 / 3, 8]) { // pad with simple multiples only when the mistakes run out
      if (ws.length >= 4) break;
      const s = f(correct * k); if (s != null && !seen.has(s)) { seen.add(s); ws.push(s); }
    }
    return GRE.mc(R, c, ws, { rank: s => val.get(s) });
  }
  const thirds = n3 => { if (n3 === 0) return '0'; const s = F.frac(n3, 3); return n3 > 0 ? '+' + s : s; };
  const signed = n => (n > 0 ? '+' + n : String(n));
  const exactOr = (x, sig) => { const e = F.exact(x, 1000); return e && e.length <= 24 ? e : F.num(x, sig || 3); };
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

  // ================================================================== quarks and hadrons
  const QCH3 = { u: 2, d: -1, s: -1, c: 2, b: -1, t: 2 };
  const QORD = 'udscbt';
  const isQ = ch => ch === ch.toLowerCase();
  const canon = str => {
    const a = str.split('');
    const lo = a.filter(isQ).sort((x, y) => QORD.indexOf(x) - QORD.indexOf(y));
    const up = a.filter(ch => !isQ(ch)).sort((x, y) => QORD.indexOf(x.toLowerCase()) - QORD.indexOf(y.toLowerCase()));
    return lo.concat(up).join('');
  };
  const qtex = str => str.split('').map(ch => (isQ(ch) ? ch : raw`\bar{${ch.toLowerCase()}}`)).join('');
  const charge3 = str => str.split('').reduce((s, ch) => s + (isQ(ch) ? 1 : -1) * QCH3[ch.toLowerCase()], 0);
  const strange = str => str.split('').reduce((s, ch) => s + (ch === 's' ? -1 : ch === 'S' ? 1 : 0), 0);
  const swapCase = str => str.split('').map(ch => (isQ(ch) ? ch.toUpperCase() : ch.toLowerCase())).join('');
  const chargeTerms = str => str.split('').map((ch, i) => {
    const v = (isQ(ch) ? 1 : -1) * QCH3[ch.toLowerCase()];
    return (v < 0 ? '-' : i ? '+' : '') + F.frac(Math.abs(v), 3);
  }).join(' ');
  // named hadrons: [TeX, descriptor, quark content (capital = antiquark)]
  const HADRONS = [
    ['p', 'proton', 'uud'], ['n', 'neutron', 'udd'], [raw`\Lambda^0`, 'baryon', 'uds'], [raw`\Sigma^+`, 'baryon', 'uus'],
    [raw`\Sigma^-`, 'baryon', 'dds'], [raw`\Xi^0`, 'baryon', 'uss'], [raw`\Xi^-`, 'baryon', 'dss'], [raw`\Omega^-`, 'baryon', 'sss'],
    [raw`\Delta^{++}`, 'baryon', 'uuu'], [raw`\Delta^-`, 'baryon', 'ddd'], [raw`\Lambda_c^+`, 'baryon', 'udc'],
    [raw`\bar{p}`, 'antiproton', 'UUD'], [raw`\bar{n}`, 'antineutron', 'UDD'], [raw`\bar{\Omega}^+`, 'antibaryon', 'SSS'],
    [raw`\pi^+`, 'meson', 'uD'], [raw`\pi^-`, 'meson', 'dU'], ['K^+', 'meson', 'uS'], ['K^-', 'meson', 'sU'],
    ['K^0', 'meson', 'dS'], [raw`\bar{K}^0`, 'meson', 'sD'], ['D^+', 'meson', 'cD'], ['D^-', 'meson', 'dC'],
    ['D^0', 'meson', 'cU'], ['D_s^+', 'meson', 'cS'], ['B^+', 'meson', 'uB'], ['B^-', 'meson', 'bU'], ['B^0', 'meson', 'dB'],
    [raw`J/\psi`, 'meson', 'cC'], [raw`\Upsilon`, 'meson', 'bB'], [raw`\phi`, 'meson', 'sS'],
  ];

  // ================================================================== particle table for reactions
  // key, TeX, Q, B, Le, Lmu, Ltau, S, 2J, mass (MeV), kind, antiKey, antiTeX
  const PT = [
    ['e-', 'e^-', -1, 0, 1, 0, 0, 0, 1, 0.511, 'lepton', 'e+', 'e^+'],
    ['mu-', raw`\mu^-`, -1, 0, 0, 1, 0, 0, 1, 105.7, 'lepton', 'mu+', raw`\mu^+`],
    ['tau-', raw`\tau^-`, -1, 0, 0, 0, 1, 0, 1, 1777, 'lepton', 'tau+', raw`\tau^+`],
    ['nue', raw`\nu_e`, 0, 0, 1, 0, 0, 0, 1, 0, 'nu', 'anue', raw`\bar{\nu}_e`],
    ['numu', raw`\nu_\mu`, 0, 0, 0, 1, 0, 0, 1, 0, 'nu', 'anumu', raw`\bar{\nu}_\mu`],
    ['nutau', raw`\nu_\tau`, 0, 0, 0, 0, 1, 0, 1, 0, 'nu', 'anutau', raw`\bar{\nu}_\tau`],
    ['gamma', raw`\gamma`, 0, 0, 0, 0, 0, 0, 2, 0, 'gamma', null, null],
    ['pi+', raw`\pi^+`, 1, 0, 0, 0, 0, 0, 0, 139.6, 'meson', 'pi-', raw`\pi^-`],
    ['pi0', raw`\pi^0`, 0, 0, 0, 0, 0, 0, 0, 135.0, 'meson', null, null],
    ['K+', 'K^+', 1, 0, 0, 0, 0, 1, 0, 493.7, 'meson', 'K-', 'K^-'],
    ['K0', 'K^0', 0, 0, 0, 0, 0, 1, 0, 497.6, 'meson', 'aK0', raw`\bar{K}^0`],
    ['eta', raw`\eta`, 0, 0, 0, 0, 0, 0, 0, 547.9, 'meson', null, null],
    ['p', 'p', 1, 1, 0, 0, 0, 0, 1, 938.3, 'baryon', 'ap', raw`\bar{p}`],
    ['n', 'n', 0, 1, 0, 0, 0, 0, 1, 939.6, 'baryon', 'an', raw`\bar{n}`],
    ['Lam', raw`\Lambda^0`, 0, 1, 0, 0, 0, -1, 1, 1115.7, 'baryon', 'aLam', raw`\bar{\Lambda}^0`],
    ['Sig+', raw`\Sigma^+`, 1, 1, 0, 0, 0, -1, 1, 1189.4, 'baryon', 'aSig+', raw`\bar{\Sigma}^-`],
    ['Sig0', raw`\Sigma^0`, 0, 1, 0, 0, 0, -1, 1, 1192.6, 'baryon', 'aSig0', raw`\bar{\Sigma}^0`],
    ['Sig-', raw`\Sigma^-`, -1, 1, 0, 0, 0, -1, 1, 1197.4, 'baryon', 'aSig-', raw`\bar{\Sigma}^+`],
    ['Xi0', raw`\Xi^0`, 0, 1, 0, 0, 0, -2, 1, 1314.9, 'baryon', 'aXi0', raw`\bar{\Xi}^0`],
    ['Xi-', raw`\Xi^-`, -1, 1, 0, 0, 0, -2, 1, 1321.7, 'baryon', 'aXi-', raw`\bar{\Xi}^+`],
    ['Om-', raw`\Omega^-`, -1, 1, 0, 0, 0, -3, 3, 1672.5, 'baryon', 'aOm-', raw`\bar{\Omega}^+`],
    ['Dpp', raw`\Delta^{++}`, 2, 1, 0, 0, 0, 0, 3, 1232, 'baryon', null, null],
    ['D0b', raw`\Delta^0`, 0, 1, 0, 0, 0, 0, 3, 1232, 'baryon', null, null],
    ['Dm', raw`\Delta^-`, -1, 1, 0, 0, 0, 0, 3, 1232, 'baryon', null, null],
  ];
  const P = {};
  for (const r of PT) {
    const [k, tex, Q, B, Le, Lm, Lt, S, J2, m, kind, ak, atex] = r;
    P[k] = { k, tex, Q, B, Le, Lm, Lt, S, J2, m, kind };
    if (ak) P[ak] = { k: ak, tex: atex, Q: -Q, B: -B, Le: -Le, Lm: -Lm, Lt: -Lt, S: -S, J2, m, kind };
  }
  const tot = (list, f) => list.reduce((s, k) => s + P[k][f], 0);
  const LAW = {
    Q: 'electric charge', B: 'baryon number', Le: 'electron-lepton number', Lm: 'muon-lepton number',
    Lt: 'tau-lepton number', L: 'total lepton number', J: 'angular momentum', E: 'energy', S: 'strangeness',
  };
  const ABS = ['Q', 'B', 'Le', 'Lm', 'Lt', 'L', 'J', 'E'];
  /** list of laws violated by reaction {i:[keys], f:[keys]} */
  function viol(r) {
    const v = [];
    for (const k of ['Q', 'B', 'Le', 'Lm', 'Lt']) if (tot(r.i, k) !== tot(r.f, k)) v.push(k);
    const L = l => tot(l, 'Le') + tot(l, 'Lm') + tot(l, 'Lt');
    if (L(r.i) !== L(r.f)) v.push('L');
    if ((tot(r.i, 'J2') - tot(r.f, 'J2')) % 2 !== 0) v.push('J');
    if (r.i.length === 1 && tot(r.f, 'm') >= P[r.i[0]].m) v.push('E');
    if (tot(r.i, 'S') !== tot(r.f, 'S')) v.push('S');
    return v;
  }
  const rtex = r => r.i.map(k => P[k].tex).join(' + ') + raw` \to ` + r.f.map(k => P[k].tex).join(' + ');
  const rkey = r => r.i.join(',') + '>' + r.f.slice().sort().join(',');
  const RX = (s, type) => { const [a, b] = s.split('>'); return { i: a.trim().split(/\s+/), f: b.trim().split(/\s+/), type }; };
  // real, observed processes. type: 'weak' | 'strong' | 'em'
  const REAL = [
    RX('n > p e- anue', 'weak'), RX('mu- > e- anue numu', 'weak'), RX('mu+ > e+ nue anumu', 'weak'),
    RX('pi+ > mu+ numu', 'weak'), RX('pi- > mu- anumu', 'weak'), RX('pi- > e- anue', 'weak'),
    RX('K+ > mu+ numu', 'weak'), RX('K- > mu- anumu', 'weak'), RX('K+ > pi+ pi0', 'weak'), RX('K+ > pi0 e+ nue', 'weak'),
    RX('K+ > pi+ pi+ pi-', 'weak'), RX('K0 > pi+ pi-', 'weak'), RX('Lam > p pi-', 'weak'), RX('Lam > n pi0', 'weak'),
    RX('Sig+ > p pi0', 'weak'), RX('Sig+ > n pi+', 'weak'), RX('Sig- > n pi-', 'weak'), RX('Xi- > Lam pi-', 'weak'),
    RX('Xi0 > Lam pi0', 'weak'), RX('Om- > Lam K-', 'weak'), RX('Om- > Xi0 pi-', 'weak'), RX('tau- > mu- anumu nutau', 'weak'),
    RX('tau- > e- anue nutau', 'weak'), RX('tau- > pi- nutau', 'weak'), RX('an > ap e+ nue', 'weak'),
    RX('Dpp > p pi+', 'strong'), RX('D0b > p pi-', 'strong'), RX('Dm > n pi-', 'strong'),
    RX('nue n > e- p', 'weak'), RX('anue p > e+ n', 'weak'), RX('numu n > mu- p', 'weak'), RX('anumu p > mu+ n', 'weak'),
    RX('numu e- > mu- nue', 'weak'),
    RX('pi- p > K0 Lam', 'strong'), RX('pi- p > K+ Sig-', 'strong'), RX('pi+ p > K+ Sig+', 'strong'), RX('K- p > Xi- K+', 'strong'),
    RX('K- p > Om- K+ K0', 'strong'), RX('K- p > Lam pi0', 'strong'), RX('K- p > Sig+ pi-', 'strong'), RX('p p > p n pi+', 'strong'),
    RX('p p > p p pi0', 'strong'), RX('p p > p p p ap', 'strong'), RX('p ap > pi+ pi- pi0', 'strong'), RX('pi- p > pi0 n', 'strong'),
    RX('K+ n > K0 p', 'strong'), RX('p p > p Lam K+', 'strong'), RX('p p > p Sig+ K0', 'strong'), RX('pi+ n > pi0 p', 'strong'),
    RX('e- e+ > mu- mu+', 'em'), RX('e- e+ > tau- tau+', 'em'),
  ];
  const SUB = {
    'e-': ['mu-', 'e+', 'nue', 'pi-'], 'e+': ['mu+', 'e-', 'anue', 'pi+'], 'mu-': ['e-', 'mu+', 'numu', 'pi-'],
    'mu+': ['e+', 'mu-', 'anumu', 'pi+'], 'tau-': ['mu-', 'e-', 'nutau', 'tau+'], 'tau+': ['mu+', 'e+', 'anutau', 'tau-'],
    nue: ['anue', 'numu', 'nutau'], anue: ['nue', 'anumu', 'anutau'], numu: ['anumu', 'nue', 'nutau'], anumu: ['numu', 'anue'],
    nutau: ['anutau', 'numu', 'nue'], anutau: ['nutau', 'anumu'],
    'pi+': ['pi0', 'pi-', 'K+', 'mu+'], 'pi-': ['pi0', 'pi+', 'K-', 'mu-'], pi0: ['pi+', 'pi-', 'K0', 'eta'],
    'K+': ['pi+', 'K0', 'K-', 'p'], 'K-': ['pi-', 'aK0', 'K+'], K0: ['aK0', 'pi0', 'K+', 'n'], aK0: ['K0', 'pi0', 'K-'],
    p: ['n', 'ap', 'pi+', 'e+', 'Sig+'], n: ['p', 'an', 'Lam', 'pi0'], ap: ['an', 'p', 'pi-', 'e-'], an: ['ap', 'n'],
    Lam: ['n', 'p', 'K0', 'aLam'], 'Sig+': ['p', 'Sig-', 'Lam'], 'Sig-': ['n', 'Sig+', 'Xi-'], Sig0: ['Lam', 'n'],
    'Xi-': ['Sig-', 'Xi0', 'Lam'], Xi0: ['Lam', 'Xi-', 'n'], 'Om-': ['Xi-', 'Sig-'], Dpp: ['p', 'D0b'], D0b: ['n', 'p'], Dm: ['n', 'p'],
    eta: ['pi0'],
  };
  /** single (and if needed double) mutations of a reaction */
  function mutants(r, depth) {
    const out = new Map();
    const add = m => { if (m.f.length >= 2 && m.i.length >= 1) { const k = rkey(m); if (k !== rkey(r)) out.set(k, m); } };
    const one = base => {
      const res = [];
      ['i', 'f'].forEach(side => base[side].forEach((k, j) => {
        if (side === 'i' && base.i.length === 1) return; // keep the decaying particle
        (SUB[k] || []).forEach(s => { const m = { i: base.i.slice(), f: base.f.slice() }; m[side][j] = s; res.push(m); });
      }));
      if (base.f.length >= 3) base.f.forEach((k, j) => res.push({ i: base.i.slice(), f: base.f.filter((_, q) => q !== j) }));
      return res;
    };
    const first = one(r);
    first.forEach(add);
    if (depth > 1) first.forEach(m => one(m).forEach(add));
    return [...out.values()];
  }
  const absViol = r => viol(r).filter(k => ABS.indexOf(k) >= 0);

  // ================================================================== 8.1.1 Standard Model
  GRE.addTemplates('spec', [
    {
      id: 'spec.sm.quarkcharge', sec: '8.1.1', level: 1,
      gen(R) {
        const FL = ['u', 'd', 's', 'c', 'b'];
        const kind = R.weighted(['baryon', 'antibaryon', 'meson'], [3, 1, 3]);
        let qs = kind === 'meson' ? R.pick(FL) + R.pick(FL).toUpperCase() : [R.pick(FL), R.pick(FL), R.pick(FL)].join('');
        if (kind === 'antibaryon') qs = qs.toUpperCase();
        qs = canon(qs);
        const hasS = /s/i.test(qs);
        const what = R.weighted(['Q', 'S', 'B'], [5, hasS ? 3 : 0.3, 1.2]);
        const intro = `${what === 'B' ? 'A hadron' : kind === 'antibaryon' ? 'An antibaryon' : 'A ' + kind} has quark content $${qtex(qs)}$.`;
        if (what === 'Q') {
          const c3 = charge3(qs);
          const noBar = charge3(qs.toLowerCase()) * (kind === 'antibaryon' ? -1 : 1);
          const dSign = qs.split('').reduce((s, ch) => s + (isQ(ch) ? 1 : -1) * Math.abs(QCH3[ch.toLowerCase()]), 0);
          return Object.assign({ q: intro + ' What is its electric charge, in units of $e$?' },
            mcVals(R, c3, [noBar, dSign, -c3, -6, -3, 0, 3, 6, c3 + 1, c3 - 1], v => `$${thirds(v)}$`),
            { expl: raw`Add the quark charges ($u, c: +\tfrac{2}{3}$; $d, s, b: -\tfrac{1}{3}$; antiquarks have the opposite sign): $${chargeTerms(qs)} = ${thirds(c3)}$. Every hadron has an integer charge.` });
        }
        if (what === 'S') {
          const S = strange(qs);
          return Object.assign({ q: intro + ' What is its strangeness $S$?', level: 2 },
            mcVals(R, S, [-S, -3, -2, -1, 0, 1, 2, 3], v => `$${signed(v)}$`),
            { expl: raw`By convention the strange quark has $S = -1$ and the strange antiquark $\bar{s}$ has $S = +1$. Counting gives $S = ${signed(S)}$. The sign convention is the classic trap.` });
        }
        const B3 = kind === 'meson' ? 0 : kind === 'baryon' ? 3 : -3;
        return Object.assign({ q: intro + ' What is its baryon number?' },
          mcVals(R, B3, [-3, -1, 0, 1, 2, 3, 9], v => `$${thirds(v)}$`),
          { expl: raw`Each quark carries baryon number $+\tfrac{1}{3}$ and each antiquark $-\tfrac{1}{3}$, so this ${kind} has $B = ${thirds(B3)}$.` });
      },
    },
    {
      id: 'spec.sm.quarkcontent', sec: '8.1.1', level: 2,
      gen(R) {
        if (R.bool(0.6)) {
          const [tex, desc, qs] = R.pick(HADRONS);
          const heavy = /[cb]/i.test(qs);
          const FL = heavy ? ['u', 'd', 's', 'c', 'b'] : ['u', 'd', 's'];
          const conj = canon(swapCase(qs));
          const muts = [];
          for (let i = 0; i < qs.length; i++) for (const f of FL) {
            const ch = isQ(qs[i]) ? f : f.toUpperCase();
            muts.push(canon(qs.slice(0, i) + ch + qs.slice(i + 1)));
          }
          for (let i = 0; i < qs.length; i++) for (let j = i + 1; j < qs.length; j++) for (const f of FL) {
            const a = qs.split('');
            a[i] = isQ(a[i]) ? f : f.toUpperCase(); a[j] = isQ(a[j]) ? f : f.toUpperCase();
            muts.push(canon(a.join('')));
          }
          if (qs.length === 2) muts.push(canon(qs.toLowerCase()));
          const wr = [conj].concat(R.shuffle(muts)).filter(m => m !== qs);
          const ch = GRE.mc(R, `$${qtex(qs)}$`, wr.map(m => `$${qtex(m)}$`), { keep: conj !== qs ? 1 : 0 });
          return Object.assign({ q: `Which of the following is the quark content of the ${desc === 'proton' || desc === 'neutron' || desc === 'antiproton' || desc === 'antineutron' ? desc : desc} $${tex}$?` }, ch, {
            expl: raw`The $${tex}$ is $${qtex(qs)}$: charge $${chargeTerms(qs)} = ${thirds(charge3(qs))}$${/s/i.test(qs) ? raw`, strangeness $${signed(strange(qs))}$` : ''}. ${qs.length === 3 ? (isQ(qs[0]) ? 'Baryons are made of three quarks.' : 'Antibaryons are made of three antiquarks.') : 'Mesons are quark–antiquark pairs.'}${conj !== qs ? raw` The content $${qtex(conj)}$ belongs to the antiparticle.` : ''}`,
          });
        }
        // quantum numbers -> content, light quarks only (unique answer)
        const FL = ['u', 'd', 's'];
        const pool = [];
        if (R.bool(0.55)) {
          for (let a = 0; a < 3; a++) for (let b = a; b < 3; b++) for (let c = b; c < 3; c++) pool.push(FL[a] + FL[b] + FL[c]);
        } else {
          for (const a of FL) for (const b of FL) { const m = a + b.toUpperCase(); if (charge3(m) !== 0 || strange(m) !== 0) pool.push(m); }
        }
        const qs = R.pick(pool);
        const kind = qs.length === 3 ? 'baryon' : 'meson';
        const wr = R.shuffle(pool.filter(m => m !== qs)).concat([canon(swapCase(qs))]);
        return Object.assign({
          q: raw`A ${kind} made only of $u$, $d$, and $s$ quarks and antiquarks has ${charge3(qs) ? raw`electric charge $${signed(charge3(qs) / 3)}e$` : 'zero electric charge'} and strangeness $S = ${signed(strange(qs))}$. What is its quark content?`,
        }, GRE.mc(R, `$${qtex(qs)}$`, wr.map(m => `$${qtex(m)}$`)), {
          expl: raw`The strangeness fixes the number of strange (anti)quarks ($s$ has $S=-1$, $\bar{s}$ has $S=+1$); the charge then fixes the rest: $${chargeTerms(qs)} = ${thirds(charge3(qs))}$, so the content is $${qtex(qs)}$.`,
        });
      },
    },
    {
      id: 'spec.sm.antiparticle', sec: '8.1.1', level: 1,
      gen(R) {
        const v = R.weighted(['anti', 'self', 'notself'], [3, 1, 1]);
        if (v === 'anti') {
          const T = [
            ['e^-', 'e^+', ['p', 'e^-', raw`\mu^+`, raw`\bar{\nu}_e`, raw`\pi^+`], ''],
            [raw`\mu^-`, raw`\mu^+`, ['e^+', raw`\mu^-`, raw`\bar{\nu}_\mu`, raw`\pi^+`], ''],
            [raw`\pi^+`, raw`\pi^-`, [raw`\pi^+`, raw`\pi^0`, raw`\mu^-`, 'K^-'], ''],
            [raw`\pi^0`, raw`\pi^0`, [raw`\pi^+`, raw`\pi^-`, raw`\gamma`, raw`\eta`, 'K^0'], raw`The $\pi^0$ is a $u\bar{u}/d\bar{d}$ superposition and is its own antiparticle.`],
            ['K^+', 'K^-', ['K^0', raw`\bar{K}^0`, raw`\pi^-`, 'K^+'], ''],
            ['K^0', raw`\bar{K}^0`, ['K^0', 'K^-', raw`\pi^0`, 'K^+'], raw`The $K^0 = d\bar{s}$ is neutral but is <i>not</i> its own antiparticle: $\bar{K}^0 = s\bar{d}$ has strangeness $-1$.`],
            ['n', raw`\bar{n}`, ['n', 'p', raw`\bar{p}`, raw`\nu_e`], raw`The neutron is neutral but carries baryon number $+1$, so its antiparticle $\bar{n}$ (baryon number $-1$) is distinct.`],
            ['p', raw`\bar{p}`, [raw`\bar{n}`, 'e^+', raw`\pi^-`, 'p'], ''],
            [raw`\Lambda^0`, raw`\bar{\Lambda}^0`, [raw`\Lambda^0`, raw`\Sigma^0`, raw`\bar{n}`, 'K^0'], raw`The $\Lambda^0$ has baryon number $+1$ and strangeness $-1$; its antiparticle has the opposite values.`],
            [raw`\Sigma^+`, raw`\bar{\Sigma}^-`, [raw`\Sigma^-`, raw`\Sigma^+`, raw`\bar{\Sigma}^+`, raw`\bar{p}`], raw`The antiparticle of $\Sigma^+$ ($uus$) is $\bar{\Sigma}^-$ ($\bar{u}\bar{u}\bar{s}$), not the $\Sigma^-$ ($dds$), which is a different baryon.`],
            ['W^+', 'W^-', ['W^+', 'Z^0', raw`\gamma`, raw`\pi^-`], ''],
            ['Z^0', 'Z^0', [raw`\gamma`, 'W^+', 'W^-', raw`\pi^0`], 'The $Z^0$ is its own antiparticle.'],
            [raw`\gamma`, raw`\gamma`, ['Z^0', raw`\pi^0`, 'W^-', 'e^+'], 'The photon is its own antiparticle.'],
            ['D^0', raw`\bar{D}^0`, ['D^0', 'D^+', 'D^-', raw`\bar{K}^0`], raw`$D^0 = c\bar{u}$ and $\bar{D}^0 = \bar{c}u$ are distinct.`],
          ];
          const [a, b, w, why] = R.pick(T);
          const self = a === b;
          const choice = GRE.mc(R, self ? `$${b}$ itself` : `$${b}$`, w.map(x => (x === a ? `$${x}$ itself` : `$${x}$`)));
          return Object.assign({ q: `What is the antiparticle of the $${a}$?` }, choice, {
            expl: (why || raw`The antiparticle has the same mass and spin but opposite charges (electric charge, baryon and lepton number, strangeness): $${a} \to ${b}$.`),
          });
        }
        const SELF = [[raw`\gamma`, '(photon)'], ['Z^0', ''], [raw`\pi^0`, ''], [raw`\eta`, ''], [raw`J/\psi`, raw`($c\bar{c}$)`], ['H', '(Higgs boson)'], [raw`\phi`, raw`($s\bar{s}$)`], [raw`\Upsilon`, raw`($b\bar{b}$)`]];
        const NOT = [['n', '(neutron)'], ['K^0', ''], [raw`\Lambda^0`, ''], ['W^+', ''], ['e^-', ''], ['D^0', ''], ['p', ''], [raw`\pi^+`, ''], [raw`\mu^-`, ''], ['B^0', ''], [raw`\Sigma^0`, '']];
        const s = x => `$${x[0]}$${x[1] ? ' ' + x[1] : ''}`;
        const [good, bad] = v === 'self' ? [SELF, NOT] : [NOT, SELF];
        const c = R.pick(good);
        const stem = v === 'self' ? R.pick(['Which of the following particles is its own antiparticle?', 'Which of the following particles is identical to its antiparticle?'])
          : R.pick(['Which of the following particles is NOT its own antiparticle?', 'Which of the following particles is distinct from its antiparticle?']);
        return Object.assign({ q: stem }, GRE.mc(R, s(c), R.pickN(bad, 4).map(s)), {
          expl: raw`A particle can be its own antiparticle only if all its additive quantum numbers (charge, baryon number, lepton number, strangeness, charm, …) vanish. The $\gamma$, $Z^0$, $\pi^0$, $\eta$, Higgs and quarkonia like $J/\psi$ qualify; the neutron ($B=1$), $K^0$ ($S=+1$) and $\Lambda^0$ do not, even though they are neutral.`,
        });
      },
    },
    {
      id: 'spec.sm.classify', sec: '8.1.1', level: 1,
      gen(R) {
        // tex, tags
        const L = [
          ['e^-', 'lepton fermion elem gen1 charged'], [raw`\mu^-`, 'lepton fermion elem gen2 charged'], [raw`\tau^-`, 'lepton fermion elem gen3 charged'],
          [raw`\nu_e`, 'lepton fermion elem gen1 neutral'], [raw`\nu_\mu`, 'lepton fermion elem gen2 neutral'], [raw`\nu_\tau`, 'lepton fermion elem gen3 neutral'],
          ['u', 'quark fermion elem gen1 charged colored'], ['d', 'quark fermion elem gen1 charged colored'], ['s', 'quark fermion elem gen2 charged colored'],
          ['c', 'quark fermion elem gen2 charged colored'], ['b', 'quark fermion elem gen3 charged colored'], ['t', 'quark fermion elem gen3 charged colored'],
          [raw`\gamma`, 'gauge boson elem neutral'], ['g', 'gauge boson elem neutral colored', '(gluon)'], ['W^+', 'gauge boson elem charged'],
          ['Z^0', 'gauge boson elem neutral'], ['H', 'boson elem neutral', '(Higgs boson)'],
          ['p', 'baryon hadron fermion composite charged colored'], ['n', 'baryon hadron fermion composite neutral colored'],
          [raw`\Lambda^0`, 'baryon hadron fermion composite neutral colored'], [raw`\Sigma^+`, 'baryon hadron fermion composite charged colored'],
          [raw`\Omega^-`, 'baryon hadron fermion composite charged colored'], [raw`\Delta^{++}`, 'baryon hadron fermion composite charged colored'],
          [raw`\pi^+`, 'meson hadron boson composite charged colored'], [raw`\pi^0`, 'meson hadron boson composite neutral colored'],
          ['K^+', 'meson hadron boson composite charged colored'], ['K^0', 'meson hadron boson composite neutral colored'],
          [raw`J/\psi`, 'meson hadron boson composite neutral colored'], ['D^0', 'meson hadron boson composite neutral colored'],
        ];
        // 'colored' here means "takes part in the strong interaction"
        const CAT = [
          ['lepton', 'a lepton', 'Leptons ($e, \\mu, \\tau$ and their neutrinos) are elementary spin-1/2 particles that do not feel the strong force.'],
          ['quark', 'a quark', 'The six quarks are $u, d, c, s, t, b$.'],
          ['gauge', 'a gauge boson (force carrier)', 'The gauge bosons are the photon, the eight gluons, and the $W^\\pm$ and $Z^0$; the Higgs is a scalar, not a gauge boson.'],
          ['baryon', 'a baryon', 'Baryons are three-quark bound states (half-integer spin).'],
          ['meson', 'a meson', 'Mesons are quark–antiquark bound states (integer spin).'],
          ['hadron', 'a hadron', 'Hadrons are bound states of quarks (baryons and mesons); quarks themselves, leptons and gauge bosons are not hadrons.'],
          ['fermion', 'a fermion', 'Fermions have half-integer spin: quarks, leptons and baryons. Mesons and gauge bosons are bosons.'],
          ['boson', 'a boson', 'Bosons have integer spin: gauge bosons, the Higgs, and mesons.'],
          ['elem', 'an elementary (not composite) particle', 'Quarks, leptons, gauge bosons and the Higgs are elementary; hadrons are composite.'],
          ['composite', 'a composite particle', 'Hadrons (baryons and mesons) are composite; quarks, leptons and gauge bosons are elementary.'],
          ['gen2', 'a second-generation fermion', 'The second generation is $c, s, \\mu, \\nu_\\mu$.'],
          ['gen3', 'a third-generation fermion', 'The third generation is $t, b, \\tau, \\nu_\\tau$.'],
          ['gen1', 'a first-generation fermion', 'The first generation is $u, d, e, \\nu_e$; all stable matter is made of it.'],
          ['neutral', 'electrically neutral', 'Neutral particles here include neutrinos, $\\gamma$, $g$, $Z^0$, $H$, and hadrons whose quark charges sum to zero.'],
          ['nostrong', 'a particle that does NOT feel the strong interaction', 'Only quarks, gluons and hadrons interact strongly; leptons, photons, $W$, $Z$ and the Higgs do not carry color.'],
        ];
        const [tag, name, why] = R.pick(CAT);
        const has = x => (tag === 'nostrong' ? x[1].split(' ').indexOf('colored') < 0 : x[1].split(' ').indexOf(tag) >= 0);
        const neg = tag !== 'nostrong' && R.bool(0.3);
        const yes = L.filter(x => has(x) !== neg), no = L.filter(x => has(x) === neg);
        const c = R.pick(yes);
        const what = neg ? `NOT ${name}` : name;
        const lab = x => `$${x[0]}$` + (x[2] ? ' ' + x[2] : '');
        return Object.assign({ q: `Which of the following is ${what}?` }, GRE.mc(R, lab(c), R.pickN(no, 4).map(lab)), {
          expl: `${why} Of the choices, only $${c[0]}$ is ${what}.`,
        });
      },
    },
    {
      id: 'spec.sm.mediator', sec: '8.1.1', level: 1,
      gen(R) {
        const B = { g: 'the photon', W1: raw`the $W^-$ boson`, W2: raw`the $W^+$ boson`, Z: raw`the $Z^0$ boson`, gl: 'the gluon', gr: 'the graviton' };
        const T = [
          ['the Coulomb attraction between an electron and a nucleus', 'g', 'Electromagnetic forces are mediated by the photon.'],
          ['the electrostatic repulsion between two protons in a nucleus', 'g', 'Electromagnetic forces are mediated by the photon.'],
          ['the light emitted in an atomic transition', 'g', 'Atomic transitions are electromagnetic; the emitted quantum is a photon.'],
          ['the force that binds quarks together inside a proton', 'gl', 'The strong (color) force between quarks is mediated by gluons.'],
          [raw`the strong decay $\Delta^{++} \to p + \pi^+$`, 'gl', 'Strong decays are mediated by gluons.'],
          [raw`neutron beta decay, $n \to p + e^- + \bar{\nu}_e$`, 'W1', raw`At the quark level $d \to u + W^-$, followed by $W^- \to e^- + \bar{\nu}_e$; charge conservation fixes the $W^-$.`],
          [raw`positron emission by a proton bound in a nucleus, $p \to n + e^+ + \nu_e$`, 'W2', raw`At the quark level $u \to d + W^+$, followed by $W^+ \to e^+ + \nu_e$.`],
          [raw`the decay $\mu^- \to e^- + \bar{\nu}_e + \nu_\mu$`, 'W1', raw`The muon turns into a $\nu_\mu$ by emitting a $W^-$, which then produces $e^- \bar{\nu}_e$.`],
          [raw`the decay $\pi^+ \to \mu^+ + \nu_\mu$`, 'W2', raw`The $u$ and $\bar{d}$ in the $\pi^+$ annihilate into a virtual $W^+$, which produces $\mu^+\nu_\mu$.`],
          [raw`the decay $K^+ \to \mu^+ + \nu_\mu$`, 'W2', raw`The $u\bar{s}$ pair annihilates into a virtual $W^+$; the change of strangeness is a hallmark of the weak force.`],
          [raw`the decay $\Lambda^0 \to p + \pi^-$`, 'W1', raw`Strangeness changes, so this is weak: $s \to u + W^-$, then $W^- \to d\bar{u}$ (the $\pi^-$).`],
          [raw`the elastic scattering $\nu_\mu + e^- \to \nu_\mu + e^-$`, 'Z', raw`No charge is exchanged between the neutrino and electron lines, so only the neutral weak boson $Z^0$ can contribute (a $W$ exchange would turn $\nu_\mu$ into $\mu^-$).`],
          [raw`the elastic scattering $\bar{\nu}_\mu + e^- \to \bar{\nu}_\mu + e^-$`, 'Z', raw`Only a neutral-current ($Z^0$) exchange can leave both the $\bar{\nu}_\mu$ and the $e^-$ unchanged.`],
          ['the gravitational attraction between two masses, in a quantum description', 'gr', 'Gravity would be mediated by the hypothetical spin-2 graviton, which has not been observed.'],
        ];
        const P2 = [
          ['Which force carrier is electrically charged?', R.pick(['W1', 'W2']), raw`Only the $W^\pm$ bosons carry electric charge.`],
          ['Which force carrier is massive and electrically neutral?', 'Z', raw`The $Z^0$ (about $91\,\text{GeV}/c^2$) is neutral; the $W^\pm$ are massive but charged; photons and gluons are massless.`],
          ['Which force carrier itself carries color charge?', 'gl', 'Gluons carry color, so they interact with each other; this underlies confinement.'],
          ['Which force carrier would have spin 2?', 'gr', 'The graviton (hypothetical) has spin 2; all Standard Model gauge bosons have spin 1.'],
          ['The strong interaction is mediated by eight massless spin-1 particles. What are they?', 'gl', 'There are eight gluons, for group-theoretical reasons (SU(3) has eight generators).'],
        ];
        const it = R.bool(0.72) ? (x => [`Which particle mediates ${x[0]}?`, x[1], x[2]])(R.pick(T)) : R.pick(P2);
        const wr = Object.keys(B).filter(k => k !== it[1] && !(it[1].startsWith('W') && k.startsWith('W') && it[0].indexOf('charged') >= 0)).map(k => B[k]);
        return Object.assign({ q: it[0] }, GRE.mc(R, B[it[1]], wr), { expl: it[2] });
      },
    },
    {
      id: 'spec.sm.interaction', sec: '8.1.1', level: 2, weight: 2,
      gen(R) {
        // decay, lifetime (s), interaction, reason
        const D = [
          [raw`\Delta^{++} \to p + \pi^+`, 5.6e-24, 'strong'], [raw`\rho^0 \to \pi^+ + \pi^-`, 4.5e-24, 'strong'],
          [raw`K^{*+} \to K^0 + \pi^+`, 1.4e-23, 'strong'], [raw`\phi \to K^+ + K^-`, 1.5e-22, 'strong'], [raw`\Delta^0 \to n + \pi^0`, 5.6e-24, 'strong'],
          [raw`\Sigma^{*+} \to \Lambda^0 + \pi^+`, 1.8e-23, 'strong'],
          [raw`\pi^0 \to \gamma + \gamma`, 8.5e-17, 'em'], [raw`\eta \to \gamma + \gamma`, 5.0e-19, 'em'], [raw`\Sigma^0 \to \Lambda^0 + \gamma`, 7.4e-20, 'em'],
          [raw`\pi^+ \to \mu^+ + \nu_\mu`, 2.6e-8, 'weak'], [raw`K^+ \to \mu^+ + \nu_\mu`, 1.2e-8, 'weak'], [raw`\Lambda^0 \to p + \pi^-`, 2.6e-10, 'weak'],
          [raw`\Sigma^+ \to p + \pi^0`, 8.0e-11, 'weak'], [raw`\Xi^- \to \Lambda^0 + \pi^-`, 1.6e-10, 'weak'], [raw`\Omega^- \to \Lambda^0 + K^-`, 8.2e-11, 'weak'],
          [raw`K^0_S \to \pi^+ + \pi^-`, 9.0e-11, 'weak'], [raw`K^+ \to \pi^+ + \pi^0`, 1.2e-8, 'weak'], [raw`\mu^- \to e^- + \bar{\nu}_e + \nu_\mu`, 2.2e-6, 'weak'],
          [raw`n \to p + e^- + \bar{\nu}_e`, 880, 'weak'], [raw`\tau^- \to \pi^- + \nu_\tau`, 2.9e-13, 'weak'], [raw`\Xi^0 \to \Lambda^0 + \pi^0`, 2.9e-10, 'weak'],
        ];
        const NAME = { strong: 'the strong interaction', em: 'the electromagnetic interaction', weak: 'the weak interaction' };
        const OTHER = ['the gravitational interaction', 'the Higgs interaction'];
        const pow = x => F.sci(x, 2);
        const v = R.weighted(['which', 'lifetime'], [4, 1]);
        if (v === 'lifetime') {
          const kind = R.pick(['strong', 'em']);
          const E = kind === 'strong' ? -23 : -17;
          const opts = [-23, -17, -10, -6, 3].map(e => `$10^{${e}}\\,\\text{s}$`);
          const c = `$10^{${E}}\\,\\text{s}$`;
          return Object.assign({ q: `An unstable hadron decays through ${NAME[kind]}. Its lifetime is most likely of order`, level: 1 },
            GRE.mc(R, c, opts.filter(o => o !== c), { rank: s => +s.match(/\{(-?\d+)\}/)[1] }),
            { expl: raw`Stronger forces mean faster decays: strong decays take $\sim 10^{-23}\,\text{s}$, electromagnetic ones $\sim 10^{-18}$–$10^{-16}\,\text{s}$, weak ones $\gtrsim 10^{-13}\,\text{s}$ (typically $10^{-10}$–$10^{-8}\,\text{s}$).` });
        }
        const [dec, tau, kind] = R.pick(D);
        const showTau = R.bool(0.6);
        const why = {
          strong: 'The final state contains only hadrons, all quantum numbers including strangeness are conserved, and the lifetime is of order $10^{-23}\\,\\text{s}$: a strong decay.',
          em: 'A photon in the final state with no neutrinos, conserved strangeness, and a lifetime in the $10^{-20}$–$10^{-16}\\,\\text{s}$ range marks an electromagnetic decay.',
          weak: /nu/.test(dec) ? 'A neutrino in the final state is the telltale sign of the weak interaction (long lifetime too).'
            : 'Strangeness changes by one unit, which only the weak interaction allows; the long lifetime confirms it.',
        }[kind];
        return Object.assign({
          q: showTau ? raw`The decay $${dec}$ has a mean lifetime of about $${pow(tau)}\,\text{s}$. Through which interaction does it mainly proceed?`
            : raw`Through which interaction does the decay $${dec}$ mainly proceed?`,
        }, GRE.mc(R, cap(NAME[kind]), ['strong', 'em', 'weak'].filter(k => k !== kind).map(k => cap(NAME[k])).concat(OTHER.map(cap))), { expl: why });
      },
    },
    {
      id: 'spec.sm.numbers', sec: '8.1.1', level: 1,
      gen(R) {
        const T = [
          ['How many types (colors) of gluon are there in the Standard Model?', 8, 'There are eight gluons (the generators of SU(3)).', [1, 3, 6, 9, 12]],
          ['How many quark flavors are there in the Standard Model?', 6, 'Six flavors: $u, d, s, c, b, t$, two per generation.', [2, 3, 4, 8, 12]],
          ['How many generations of fermions does the Standard Model contain?', 3, 'Three generations, each with two quarks, a charged lepton and a neutrino.', [1, 2, 4, 6]],
          ['How many color charges (red, green, blue) can a quark carry?', 3, 'Each quark comes in three colors.', [1, 2, 6, 8]],
          ['How many distinct leptons (not counting antiparticles) are in the Standard Model?', 6, 'Three charged leptons ($e, \\mu, \\tau$) and three neutrinos.', [2, 3, 4, 8, 12]],
          ['How many quarks make up a baryon?', 3, 'A baryon is three quarks; a meson is a quark–antiquark pair.', [1, 2, 4, 6]],
        ];
        const S = [
          ['a baryon made of three light quarks with no orbital angular momentum', ['1/2', '3/2'], ['0', '1', '2', '5/2'], 'Three spin-1/2 quarks with $L = 0$ combine to total spin 1/2 or 3/2.'],
          ['a meson (quark–antiquark pair) with no orbital angular momentum', ['0', '1'], ['1/2', '3/2', '2', '5/2'], 'Two spin-1/2 constituents with $L = 0$ combine to spin 0 or 1.'],
          ['a ground-state baryon made of three identical quarks, such as $uuu$ or $sss$', ['3/2'], ['1/2', '0', '1', '5/2'], 'Identical flavors, symmetric space wavefunction and antisymmetric color force a symmetric spin state: spin 3/2 (like the $\\Delta^{++}$ and $\\Omega^-$).'],
        ];
        if (R.bool(0.55)) {
          const [q, a, why, w] = R.pick(T);
          return Object.assign({ q }, mcVals(R, a, w, v => `$${v}$`), { expl: why });
        }
        const [what, good, bad, why] = R.pick(S);
        const c = R.pick(good);
        return Object.assign({ q: `Which of the following is a possible total spin for ${what}?`, level: what.indexOf('identical') >= 0 ? 3 : 2 },
          GRE.mc(R, `$${c}$`, bad.map(x => `$${x}$`), { rank: s => { const m = s.replace(/\$/g, '').split('/'); return m.length > 1 ? m[0] / m[1] : +m[0]; } }), { expl: why });
      },
    },
    {
      id: 'spec.sm.facts', sec: '8.1.1', level: 1,
      gen(R) {
        const TRUE = [
          ['The photon and the $Z^0$ are their own antiparticles.', 'both are neutral with no other charges.'],
          ['The $W^+$ is the antiparticle of the $W^-$.', 'they have opposite charge and equal mass.'],
          ['Leptons do not participate in the strong interaction.', 'leptons carry no color charge.'],
          ['Quarks carry electric charge, color charge, and weak charge.', 'quarks feel all three Standard Model forces.'],
          ['The up quark has charge $+\\tfrac{2}{3}e$ and the down quark $-\\tfrac{1}{3}e$.', 'these are the standard quark charges.'],
          ['The $W$ and $Z$ bosons are roughly 90 times as massive as the proton.', '$m_W \\approx 80\\,\\text{GeV}/c^2$ and $m_Z \\approx 91\\,\\text{GeV}/c^2$.'],
          ['Gluons and photons are massless.', 'only the weak bosons are massive.'],
          ['Free quarks have never been observed in isolation.', 'confinement binds quarks into color-singlet hadrons.'],
          ['Every hadron is a color singlet (color neutral).', 'this is the statement of confinement.'],
          ['Stable ordinary matter is made of first-generation particles.', 'heavier generations decay to the first.'],
          ['The muon is about 200 times more massive than the electron.', '$m_\\mu \\approx 207 m_e$.'],
          ['Baryons have half-integer spin and mesons have integer spin.', 'three spin-1/2 quarks give half-integer spin; a quark–antiquark pair gives integer spin.'],
        ];
        const FALSE = [
          ['Neutrinos interact through the strong force.', 'neutrinos feel only the weak force (and gravity).'],
          ['The $W^\\pm$ and $Z^0$ bosons are massless like the photon.', 'they are very heavy, about $80$–$90\\,\\text{GeV}/c^2$.'],
          ['The strange quark has charge $+\\tfrac{2}{3}e$.', 'the strange quark is down-type, with charge $-\\tfrac{1}{3}e$.'],
          ['The graviton has been directly observed in particle experiments.', 'the graviton is hypothetical and unobserved.'],
          ['Mesons are fermions.', 'mesons (quark–antiquark) have integer spin, so they are bosons.'],
          ['There are three types of gluons, one for each color.', 'there are eight gluons.'],
          ['The electron interacts through the strong force.', 'leptons carry no color.'],
          ['Isolated quarks are routinely detected in particle detectors.', 'confinement prevents free quarks.'],
          ['The muon is a second-generation quark.', 'the muon is a lepton.'],
          ['The neutron is its own antiparticle because it is electrically neutral.', 'the neutron carries baryon number, so $\\bar{n}$ is distinct.'],
          ['Each generation is lighter than the one before it.', 'each generation is heavier than the previous one.'],
        ];
        return romanQ(R, 'Which of the following statements about the Standard Model is (are) true?', TRUE, FALSE);
      },
    },
  ]);

  // ================================================================== nuclei
  const EL = ('n H He Li Be B C N O F Ne Na Mg Al Si P S Cl Ar K Ca Sc Ti V Cr Mn Fe Co Ni Cu Zn Ga Ge As Se Br Kr Rb Sr Y Zr Nb Mo Tc Ru Rh Pd Ag Cd In Sn Sb Te I Xe Cs Ba La Ce Pr Nd Pm Sm Eu Gd Tb Dy Ho Er Tm Yb Lu Hf Ta W Re Os Ir Pt Au Hg Tl Pb Bi Po At Rn Fr Ra Ac Th Pa U Np Pu Am Cm Bk Cf Es Fm').split(' ');
  if (EL[26] !== 'Fe' || EL[82] !== 'Pb' || EL[92] !== 'U') throw new Error('spec: element table misaligned');
  const nuc = (A, Z) => raw`{}^{${A}}_{${Z}}\text{${EL[Z]}}`;
  const baseA = Z => Math.round(Z * (2 + 0.006 * Z));
  // light particles in reactions: [A, Z, TeX, name]
  const LP = {
    n: [1, 0, raw`{}^{1}_{0}n`, 'a neutron'], p: [1, 1, raw`{}^{1}_{1}p`, 'a proton'], d: [2, 1, raw`{}^{2}_{1}\text{H}`, 'a deuteron'],
    t: [3, 1, raw`{}^{3}_{1}\text{H}`, 'a triton'], h: [3, 2, raw`{}^{3}_{2}\text{He}`, 'a helium-3 nucleus'], a: [4, 2, raw`{}^{4}_{2}\text{He}`, 'an alpha particle'],
    g: [0, 0, raw`\gamma`, 'a gamma-ray photon'],
  };
  // atomic masses (u): [A, Z, mass]
  const MASS = [
    [2, 1, 2.014102], [3, 1, 3.016049], [3, 2, 3.016029], [4, 2, 4.002603], [6, 3, 6.015122], [7, 3, 7.016004], [9, 4, 9.012182],
    [10, 5, 10.012937], [11, 5, 11.009305], [12, 6, 12.000000], [13, 6, 13.003355], [14, 7, 14.003074], [15, 7, 15.000109],
    [16, 8, 15.994915], [19, 9, 18.998403], [20, 10, 19.992440], [23, 11, 22.989769], [24, 12, 23.985042], [27, 13, 26.981538],
    [28, 14, 27.976927], [32, 16, 31.972071], [40, 20, 39.962591], [56, 26, 55.934937], [62, 28, 61.928345], [63, 29, 62.929598],
    [90, 40, 89.904704], [107, 47, 106.905097], [120, 50, 119.902195], [197, 79, 196.966569], [208, 82, 207.976652],
    [235, 92, 235.043930], [238, 92, 238.050788],
  ];
  const mH = 1.007825, mN = 1.008665, uMeV = 931.5;
  const defect = ([A, Z, M]) => Z * mH + (A - Z) * mN - M;

  // ================================================================== 8.1.2 nuclear bound states
  GRE.addTemplates('spec', [
    {
      id: 'spec.nuc.chain', sec: '8.1.2', level: 2, weight: 2,
      gen(R) {
        const PAR = [[238, 92], [235, 92], [232, 90], [234, 90], [226, 88], [228, 88], [222, 86], [241, 95], [239, 94], [244, 94], [237, 93], [227, 89], [231, 91], [218, 84], [210, 84], [224, 88], [236, 92], [233, 92]];
        const [A, Z] = R.pick(PAR);
        const na = R.int(1, 8), nb = R.int(1, 6);
        const Ad = A - 4 * na, Zd = Z - 2 * na + nb, Nd = Ad - Zd;
        if (Zd < 78 || Zd > Z + 1 || Nd - Zd < 34 || Nd - Zd > 58) throw new Error('implausible chain');
        const pl = (k, w) => `$${k}$ ${w}${k === 1 ? '' : 's'}`;
        if (R.bool(0.55)) {
          const W = [[Ad, Z - 2 * na - nb], [A - 2 * na, Zd], [Ad - nb, Zd], [Ad, Z - na + nb], [Ad, Z - 2 * na], [Ad, Zd + 1], [Ad, Zd - 1], [Ad + 4, Zd + 2]]
            .filter(([a, z]) => z > 0 && z < EL.length && !(a === Ad && z === Zd));
          return Object.assign({
            q: raw`The nucleus $${nuc(A, Z)}$ undergoes a series of radioactive decays in which it emits ${pl(na, 'alpha particle')} and ${pl(nb, raw`$\beta^-$ particle`).replace('$$', '$')}. What is the resulting nucleus?`.replace(/\$\$/g, '$'),
          }, GRE.mc(R, `$${nuc(Ad, Zd)}$`, W.map(([a, z]) => `$${nuc(a, z)}$`)), {
            expl: raw`Each $\alpha$ decay removes 4 nucleons and 2 protons; each $\beta^-$ decay leaves $A$ unchanged and raises $Z$ by 1 (a neutron becomes a proton). So $A = ${A} - 4(${na}) = ${Ad}$ and $Z = ${Z} - 2(${na}) + ${nb} = ${Zd}$: $${nuc(Ad, Zd)}$.`,
          });
        }
        const lab = (a, b) => `${a} alpha decay${a === 1 ? '' : 's'} and ${b} beta-minus decay${b === 1 ? '' : 's'}`;
        const W = [[na, nb + 1], [na, nb - 1], [na + 1, nb + 2], [na - 1, nb - 2], [na, nb + 2], [na + 1, nb], [na - 1, nb], [na, nb + 3]].filter(([a, b]) => a >= 1 && b >= 0);
        return Object.assign({
          q: raw`The nucleus $${nuc(A, Z)}$ decays to $${nuc(Ad, Zd)}$ through a chain of $\alpha$ and $\beta^-$ decays. How many of each occur?`,
        }, GRE.mc(R, lab(na, nb), W.map(([a, b]) => lab(a, b))), {
          expl: raw`Only $\alpha$ decays change $A$: $(${A} - ${Ad})/4 = ${na}$ alpha decays, which alone would lower $Z$ by $${2 * na}$. The actual drop is $${Z - Zd}$, so $${2 * na} - ${Z - Zd} = ${nb}$ $\beta^-$ decays (each raises $Z$ by 1).`,
        });
      },
    },
    {
      id: 'spec.nuc.decaytype', sec: '8.1.2', level: 1,
      gen(R) {
        const type = R.pick(['alpha', 'bminus', 'bplus', 'gamma']);
        const Z = type === 'alpha' ? R.int(62, 95) : R.int(8, 92);
        const A = baseA(Z) + R.int(-3, 3);
        const D = { alpha: [A - 4, Z - 2], bminus: [A, Z + 1], bplus: [A, Z - 1], gamma: [A, Z] }[type];
        const NAME = { alpha: 'alpha decay', bminus: raw`beta-minus ($\beta^-$) decay`, bplus: raw`beta-plus ($\beta^+$, positron) decay`, gamma: 'gamma decay' };
        const EMIT = { alpha: 'an alpha particle', bminus: 'an electron', bplus: 'a positron', gamma: 'a photon' };
        const why = {
          alpha: raw`$A$ drops by 4 and $Z$ by 2: a $${nuc(4, 2)}$ nucleus (alpha particle) is emitted.`,
          bminus: raw`$A$ is unchanged and $Z$ rises by 1: a neutron turned into a proton, emitting an electron and an antineutrino ($\beta^-$ decay).`,
          bplus: raw`$A$ is unchanged and $Z$ drops by 1: a proton turned into a neutron, emitting a positron and a neutrino ($\beta^+$ decay).`,
          gamma: raw`Neither $A$ nor $Z$ changes; an excited nucleus drops to a lower state by emitting a photon (gamma decay).`,
        }[type];
        const par = type === 'gamma' ? raw`${nuc(A, Z)}^{*}` : nuc(A, Z);
        if (R.bool(0.5)) {
          const others = Object.keys(NAME).filter(k => k !== type).map(k => cap(NAME[k])).concat(['Neutron emission', 'Proton emission', 'Spontaneous fission']);
          return Object.assign({ q: raw`The nucleus $${par}$ decays to $${nuc(D[0], D[1])}$${type === 'gamma' ? ' (its ground state)' : ''}. What kind of decay is this?` },
            GRE.mc(R, cap(NAME[type]), others), { expl: why });
        }
        const nu = { bminus: raw` + \bar{\nu}_e`, bplus: raw` + \nu_e` }[type] || '';
        const others = Object.keys(EMIT).filter(k => k !== type).map(k => EMIT[k]).concat(['a neutron', 'a proton', 'a deuteron']);
        return Object.assign({ q: raw`In the decay $${par} \to ${nuc(D[0], D[1])} + X${nu}$, the particle $X$ is` },
          GRE.mc(R, EMIT[type], others), { expl: why + ' Balance the mass number and the charge on both sides.' });
      },
    },
    {
      id: 'spec.nuc.balance', sec: '8.1.2', level: 2, weight: 2,
      gen(R) {
        const TG = [[6, 3], [7, 3], [9, 4], [10, 5], [11, 5], [12, 6], [13, 6], [14, 7], [15, 7], [16, 8], [17, 8], [18, 8], [19, 9], [23, 11], [24, 12], [27, 13], [28, 14], [31, 15], [32, 16], [40, 20], [55, 25], [56, 26], [59, 27], [63, 29], [107, 47], [197, 79], [235, 92], [238, 92]];
        const [A, Z] = R.pick(TG);
        const pj = R.weighted(['n', 'p', 'd', 'a', 'g'], [3, 3, 2, 3, 0.7]);
        const ej = R.pick(['n', 'p', 'd', 'a', 'g', 't'].filter(k => k !== pj && !(pj === 'g' && k === 'g')));
        const [a, z] = LP[pj], [b, zb] = LP[ej];
        const A2 = A + a - b, Z2 = Z + z - zb, N2 = A2 - Z2;
        if (Z2 < 2 || N2 < Z2 - 1 || N2 > 1.62 * Z2 + 2 || A2 < 6) throw new Error('implausible product');
        const lhs = `${nuc(A, Z)} + ${LP[pj][2]}`;
        const expl0 = raw`Conserve nucleon number and charge: $A$: $${A} + ${a} = ${A2} + ${b}$; $Z$: $${Z} + ${z} = ${Z2} + ${zb}$.`;
        if (R.bool(0.5)) {
          const W = [[A2, Z + z + zb], [A + a + b, Z2], [A2, Z2 + 1], [A2, Z2 - 1], [A2 + 1, Z2], [A2 - 1, Z2], [A2 + 2, Z2 + 1]].filter(([x, y]) => y > 0 && !(x === A2 && y === Z2));
          return Object.assign({ q: raw`Complete the nuclear reaction $${lhs} \to X + ${LP[ej][2]}$. The nucleus $X$ is` },
            GRE.mc(R, `$${nuc(A2, Z2)}$`, W.map(([x, y]) => `$${nuc(x, y)}$`)), { expl: expl0 + raw` So $X = ${nuc(A2, Z2)}$.` });
        }
        const others = Object.keys(LP).filter(k => k !== ej).map(k => LP[k][3]);
        return Object.assign({ q: raw`In the nuclear reaction $${lhs} \to ${nuc(A2, Z2)} + X$, the particle $X$ is` },
          GRE.mc(R, LP[ej][3], others), { expl: expl0 + ` The missing particle has $A = ${b}$ and $Z = ${zb}$: ${LP[ej][3]}.` });
      },
    },
    {
      id: 'spec.nuc.binding', sec: '8.1.2', level: 2, weight: 2,
      gen(R) {
        const v = R.pick(['mass', 'defect', 'perA', 'toDefect']);
        const rec = v === 'mass' ? R.pick(MASS.filter(m => m[0] <= 40)) : R.pick(MASS);
        const [A, Z, M] = rec;
        const dm = defect(rec), BE = dm * uMeV, b = BE / A;
        const name = nuc(A, Z);
        if (v === 'mass') {
          return Object.assign({
            q: raw`The atomic mass of $${name}$ is $${M.toFixed(6)}\,\text{u}$. Using $m(^{1}\text{H}) = ${mH}\,\text{u}$, $m_n = ${mN}\,\text{u}$, and $1\,\text{u}\,c^2 = 931.5\,\text{MeV}$, the total binding energy of the nucleus is closest to`,
            level: 3,
          }, GRE.numeric(R, BE, [BE / A, 2 * BE, BE / 2, BE * 1.5], { unit: raw`\text{MeV}`, sig: 3, tol: 0.15 }), {
            expl: raw`$\Delta m = ${Z}(${mH}) + ${A - Z}(${mN}) - ${M.toFixed(6)} = ${dm.toFixed(5)}\,\text{u}$, so $B = \Delta m\,c^2 \approx ${F.num(BE, 3)}\,\text{MeV}$ (${F.num(b, 3)} MeV per nucleon). Using hydrogen-atom masses makes the electron masses cancel.`,
          });
        }
        if (v === 'defect' || v === 'perA') {
          const dmr = +dm.toPrecision(3);
          const BEr = dmr * uMeV, br = BEr / A;
          const ans = v === 'defect' ? BEr : br;
          return Object.assign({
            q: raw`The mass defect of the $${name}$ nucleus is $${dmr}\,\text{u}$. What is its ${v === 'defect' ? 'total binding energy' : 'binding energy per nucleon'}? ($1\,\text{u}\,c^2 = 931.5\,\text{MeV}$)`,
          }, GRE.numeric(R, ans, v === 'defect' ? [br, BEr / Z, 2 * BEr] : [BEr, BEr / Z, br / 2, BEr / (A - Z)], { unit: raw`\text{MeV}`, sig: 2, tol: 0.2 }), {
            expl: raw`$B = \Delta m\,c^2 = ${dmr} \times 931.5 \approx ${F.num(BEr, 3)}\,\text{MeV}$${v === 'perA' ? raw`; dividing by $A = ${A}$ nucleons gives $${F.num(br, 2)}\,\text{MeV}$ per nucleon` : ''}.`,
          });
        }
        const br = +b.toPrecision(3), dmx = br * A / uMeV;
        return Object.assign({
          q: raw`The binding energy per nucleon of $${name}$ is $${br}\,\text{MeV}$. What is the mass defect of this nucleus? ($1\,\text{u}\,c^2 = 931.5\,\text{MeV}$)`,
        }, GRE.numeric(R, dmx, [br / uMeV, dmx * Z / A === dmx ? null : dmx * Z / A, 2 * dmx, dmx / 2], { unit: raw`\text{u}`, sig: 2, tol: 0.25, fmt: x => F.num(x, 2) }), {
          expl: raw`Total binding energy $B = A \times ${br} = ${F.num(br * A, 3)}\,\text{MeV}$, so $\Delta m = B/c^2 = ${F.num(br * A, 3)}/931.5 \approx ${F.num(dmx, 2)}\,\text{u}$. Don't forget to multiply by $A$.`,
        });
      },
    },
    {
      id: 'spec.nuc.qvalue', sec: '8.1.2', level: 2, weight: 2,
      gen(R) {
        const BE = { d: 2.224, t: 8.482, h: 7.718, a: 28.296, Li6: 31.994, Li7: 39.245, B10: 64.751, B11: 76.205, C12: 92.162, C13: 97.108, N14: 104.659, N15: 115.492, O16: 127.619, Ne20: 160.645, Mg24: 198.257, Si28: 236.537, n: 0, p: 0 };
        const TX = { d: raw`{}^{2}\text{H}`, t: raw`{}^{3}\text{H}`, h: raw`{}^{3}\text{He}`, a: raw`{}^{4}\text{He}`, Li6: raw`{}^{6}\text{Li}`, Li7: raw`{}^{7}\text{Li}`, B10: raw`{}^{10}\text{B}`, B11: raw`{}^{11}\text{B}`, C12: raw`{}^{12}\text{C}`, C13: raw`{}^{13}\text{C}`, N14: raw`{}^{14}\text{N}`, N15: raw`{}^{15}\text{N}`, O16: raw`{}^{16}\text{O}`, Ne20: raw`{}^{20}\text{Ne}`, Mg24: raw`{}^{24}\text{Mg}`, Si28: raw`{}^{28}\text{Si}`, n: 'n', p: 'p' };
        if (R.bool(0.3)) {
          // fission estimate from the binding-energy curve
          const A = R.pick([234, 236, 238, 240, 242]), b0 = R.pick([7.5, 7.6, 7.7]), b1 = R.pick([8.3, 8.4, 8.5, 8.6]);
          const Q = A * (b1 - b0);
          return Object.assign({
            q: raw`A nucleus with $A = ${A}$ has a binding energy of $${b0}\,\text{MeV}$ per nucleon. It splits into two fragments, each with a binding energy of about $${b1}\,\text{MeV}$ per nucleon. Neglecting emitted neutrons, the energy released is closest to`,
          }, GRE.numeric(R, Q, [b1 - b0, A * b1, 2 * (b1 - b0), Q / 2, A * (b1 + b0) / 2], { unit: raw`\text{MeV}`, sig: 2, tol: 0.2 }), {
            expl: raw`Energy released = (binding energy after) $-$ (binding energy before) $= ${A}(${b1} - ${b0}) \approx ${F.num(Q, 2)}\,\text{MeV}$, the famous $\sim 200\,\text{MeV}$ per fission.`,
          });
        }
        const RX2 = [
          [['d', 't'], ['a', 'n']], [['d', 'd'], ['h', 'n']], [['d', 'd'], ['t', 'p']], [['d', 'h'], ['a', 'p']], [['p', 'Li7'], ['a', 'a']],
          [['n', 'Li6'], ['t', 'a']], [['d', 'Li6'], ['a', 'a']], [['p', 'B11'], ['a', 'a', 'a']], [['a', 'a', 'a'], ['C12']], [['a', 'C12'], ['O16']],
          [['C12', 'C12'], ['Ne20', 'a']], [['O16', 'O16'], ['Si28', 'a']], [['p', 'N15'], ['C12', 'a']], [['h', 'h'], ['a', 'p', 'p']],
          [['n', 'B10'], ['Li7', 'a']], [['a', 'Ne20'], ['Mg24']], [['p', 'd'], ['h']], [['p', 'C13'], ['N14']],
        ];
        const [ini, fin] = R.pick(RX2);
        const sum = l => l.reduce((s, k) => s + BE[k], 0);
        const Q = sum(fin) - sum(ini);
        const species = [...new Set(ini.concat(fin))].filter(k => BE[k] > 0);
        const perN = R.bool(0.35);
        const Aof = { d: 2, t: 3, h: 3, a: 4, Li6: 6, Li7: 7, B10: 10, B11: 11, C12: 12, C13: 13, N14: 14, N15: 15, O16: 16, Ne20: 20, Mg24: 24, Si28: 28 };
        const list = species.map(k => perN ? raw`$${TX[k]}$: $${(BE[k] / Aof[k]).toFixed(3)}\,\text{MeV/nucleon}$` : raw`$${TX[k]}$: $${BE[k].toFixed(2)}\,\text{MeV}$`).join(', ');
        const uniq = l => [...new Set(l)];
        const wr = [sum(uniq(fin)) - sum(uniq(ini)), sum(fin), sum(fin) + sum(ini), Q / 2, 2 * Q];
        return Object.assign({
          q: raw`Consider the reaction $${ini.map(k => TX[k]).join(' + ')} \to ${fin.map(k => TX[k]).join(' + ')}${fin.length === 1 ? raw` + \gamma` : ''}$. The ${perN ? 'binding energies per nucleon' : 'total nuclear binding energies'} are ${list}. The energy released is closest to`,
          level: perN ? 3 : 2,
        }, GRE.numeric(R, Q, wr.filter(x => x > 0), { unit: raw`\text{MeV}`, sig: 2, tol: 0.12 }), {
          expl: raw`$Q$ = (total binding energy of products) $-$ (total binding energy of reactants)${perN ? ' (multiply each per-nucleon value by $A$ first)' : ''} $\approx ${F.num(Q, 3)}\,\text{MeV}$. Free nucleons have zero binding energy, and a nucleus that appears twice must be counted twice.`,
        });
      },
    },
    {
      id: 'spec.nuc.curve', sec: '8.1.2', level: 1,
      gen(R) {
        const TRUE = [
          ['The binding energy per nucleon is largest, about $8.8\\,\\text{MeV}$, near iron and nickel.', 'the curve peaks near $A \\approx 56$–$62$.'],
          ['Fusing two light nuclei into a nucleus lighter than iron releases energy.', 'the product is more tightly bound per nucleon.'],
          ['Fission of a uranium nucleus releases energy because the fragments are more tightly bound per nucleon.', 'binding energy per nucleon rises from about 7.6 MeV to about 8.5 MeV.'],
          ['For most nuclei the binding energy per nucleon is roughly 7 to 9 MeV.', 'apart from the lightest nuclei, the curve is fairly flat.'],
          ['Helium-4 is unusually tightly bound compared with its neighbors.', 'it has about 7 MeV per nucleon, far above $^{3}$He or $^{6}$Li.'],
          ['A nucleus has less mass than the sum of the masses of its separated protons and neutrons.', 'the mass defect is $B/c^2$.'],
          ['A typical uranium fission releases about 200 MeV.', '$\\approx 236 \\times (8.5 - 7.6)\\,\\text{MeV}$.'],
          ['Heavy elements beyond lead are all unstable.', 'all nuclei heavier than lead eventually decay.'],
        ];
        const FALSE = [
          ['Fusing two iron nuclei releases a large amount of energy.', 'iron is at the peak, so fusing it absorbs energy.'],
          ['The binding energy per nucleon increases steadily all the way up to uranium.', 'it peaks near iron and then decreases.'],
          ['A bound nucleus has more mass than its separated nucleons.', 'binding lowers the mass.'],
          ['Fission of light nuclei such as carbon releases energy.', 'light nuclei release energy by fusion, not fission.'],
          ['The deuteron has the largest binding energy per nucleon of all nuclei.', 'the deuteron is very weakly bound (about 1.1 MeV per nucleon).'],
          ['The Sun is powered mainly by the fission of heavy elements.', 'the Sun is powered by fusion of hydrogen into helium.'],
          ['A typical uranium fission releases about 2 MeV.', 'it releases about 200 MeV.'],
          ['The total binding energy of a nucleus is independent of its mass number.', 'it grows roughly in proportion to $A$.'],
        ];
        if (R.bool(0.5)) return romanQ(R, 'Which of the following statements about nuclear binding energy is (are) true?', TRUE, FALSE);
        const neg = R.bool(0.4);
        return factQ(R, neg ? 'Which of the following statements about the nuclear binding-energy curve is FALSE?' : 'Which of the following statements about the nuclear binding-energy curve is true?', TRUE.map(x => [x[0], cap(x[1])]), FALSE.map(x => [x[0], cap(x[1])]), neg);
      },
    },
    {
      id: 'spec.nuc.radius', sec: '8.1.2', level: 2, weight: 2,
      gen(R) {
        const v = R.pick(['R', 'R', 'ratio', 'A', 'density']);
        const CUBE = [[8, 4], [27, 13], [64, 30], [125, 52], [216, 84]];
        if (v === 'R') {
          const cube = R.bool(0.5);
          const [A, Z] = cube ? R.pick(CUBE) : (Z => [baseA(Z) + R.int(-2, 2), Z])(R.int(6, 92));
          const r = 1.2 * Math.cbrt(A);
          return Object.assign({ q: raw`Using $R = R_0 A^{1/3}$ with $R_0 = 1.2\,\text{fm}$, the radius of the $${nuc(A, Z)}$ nucleus is closest to`, level: cube ? 1 : 2 },
            GRE.numeric(R, r, [1.2 * A, 1.2 * Math.sqrt(A), 1.2 * Math.pow(A, 2 / 3), 2 * r], { unit: raw`\text{fm}`, sig: 2, tol: 0.15 }),
            { expl: raw`$R = 1.2\,\text{fm} \times ${A}^{1/3} \approx ${F.num(r, 2)}\,\text{fm}$. Nuclear volume scales as $A$, so the radius scales as $A^{1/3}$.` });
        }
        if (v === 'A') {
          const [A, Z] = R.pick(CUBE);
          const r = 1.2 * Math.cbrt(A);
          return Object.assign({ q: raw`A nucleus has radius $${F.num(r, 2)}\,\text{fm}$. Taking $R = (1.2\,\text{fm})A^{1/3}$, its mass number is closest to` },
            mcVals(R, A, [Math.round(r / 1.2), Math.round((r / 1.2) ** 2), Math.round(r * r * r), Math.round(A / 2), 2 * A, Math.round(r)], x => `$${x}$`),
            { expl: raw`$A = (R/1.2\,\text{fm})^3 = (${F.num(r / 1.2, 2)})^3 = ${A}$.` });
        }
        if (v === 'ratio') {
          const [a, b] = R.pickN(CUBE, 2).sort((x, y) => y[0] - x[0]);
          const what = R.pick(['radius', 'volume', 'density', 'surface area']);
          const k = a[0] / b[0];
          const val = { radius: Math.cbrt(k), volume: k, density: 1, 'surface area': Math.pow(k, 2 / 3) }[what];
          const W = [Math.cbrt(k), k, 1, Math.pow(k, 2 / 3), Math.sqrt(k), 1 / Math.cbrt(k), k * k];
          return Object.assign({ q: raw`What is the ratio of the nuclear ${what} of $${nuc(a[0], a[1])}$ to that of $${nuc(b[0], b[1])}$?` },
            mcVals(R, val, W, x => `$${exactOr(x)}$`),
            { expl: raw`With $R \propto A^{1/3}$: radius ratio $(${a[0]}/${b[0]})^{1/3} = ${exactOr(Math.cbrt(k))}$, volume ratio $= A$ ratio $= ${exactOr(k)}$, area ratio $(A_1/A_2)^{2/3}$. Since volume $\propto A$, nuclear density is the same for all nuclei (ratio 1).` });
        }
        const Z = R.int(6, 92), A = baseA(Z);
        const rho = 3 * C.mp / (4 * Math.PI * Math.pow(1.2e-15, 3));
        return Object.assign({ q: raw`Taking $R = (1.2\,\text{fm})A^{1/3}$, the mass density of a $${nuc(A, Z)}$ nucleus is closest to`, level: 2 },
          GRE.numeric(R, rho, [rho * 1e3, rho / 1e3, rho * 1e6, rho / 1e6, rho / 1e14], { unit: raw`\text{kg/m}^3`, sig: 1, tol: 0.5, fmt: x => F.sci(x, 1) }),
          { expl: raw`$\rho = \dfrac{A m_p}{\tfrac{4}{3}\pi R_0^3 A} = \dfrac{3m_p}{4\pi R_0^3} \approx \dfrac{3(1.67\times10^{-27})}{4\pi(1.2\times10^{-15})^3} \approx 2\times10^{17}\,\text{kg/m}^3$, independent of $A$ — about $10^{14}$ times the density of water.` });
      },
    },
    {
      id: 'spec.nuc.coulomb', sec: '8.1.2', level: 3,
      gen(R) {
        const PR = [[4, 2, raw`an alpha particle`], [1, 1, 'a proton'], [2, 1, 'a deuteron'], [12, 6, raw`a $${nuc(12, 6)}$ nucleus`], [16, 8, raw`an $${nuc(16, 8)}$ nucleus`]];
        const pr = R.pick(PR);
        const Z2 = R.int(6, 92), A2 = baseA(Z2);
        const R1 = 1.2 * Math.cbrt(pr[0]), R2 = 1.2 * Math.cbrt(A2);
        const U = 1.44 * pr[1] * Z2 / (R1 + R2);
        return Object.assign({
          q: raw`Estimate the height of the Coulomb barrier for ${pr[2]} approaching a $${nuc(A2, Z2)}$ nucleus, i.e. the electrostatic potential energy when the two nuclear surfaces just touch. Use $R = (1.2\,\text{fm})A^{1/3}$ and $e^2/4\pi\epsilon_0 = 1.44\,\text{MeV}\cdot\text{fm}$.`,
        }, GRE.numeric(R, U, [1.44 * pr[1] * Z2 / R2, 1.44 * Z2 / (R1 + R2), 1.44 * pr[1] * Z2 / (1.2 * (pr[0] + A2)), U / 2, 2 * U], { unit: raw`\text{MeV}`, sig: 2, tol: 0.15 }), {
          expl: raw`$U = \dfrac{Z_1Z_2 e^2}{4\pi\epsilon_0(R_1 + R_2)} = \dfrac{${pr[1]}\times${Z2}\times1.44}{${F.num(R1, 2)} + ${F.num(R2, 2)}}\,\text{MeV} \approx ${F.num(U, 2)}\,\text{MeV}$. Barriers of several MeV are why fusion needs enormous temperatures (and tunneling).`,
        });
      },
    },
    {
      id: 'spec.nuc.alphake', sec: '8.1.2', level: 2,
      gen(R) {
        const Z = R.int(84, 96), A = baseA(Z) + R.int(-6, 4);
        const Q = R.step(4.0, 8.9, 0.1);
        const Ka = Q * (A - 4) / A, Kd = Q * 4 / A;
        const v = R.pick(['Ka', 'Kd', 'ratio']);
        const intro = raw`The nucleus $${nuc(A, Z)}$, initially at rest, undergoes alpha decay with $Q = ${F.fix(Q, 1)}\,\text{MeV}$ (nonrelativistic).`;
        const ex = raw`Momentum conservation gives equal and opposite momenta, and $K = p^2/2m$, so the energies divide inversely to the masses: $K_\alpha = Q\,\dfrac{A-4}{A}$, $K_{\text{recoil}} = Q\,\dfrac{4}{A}$.`;
        if (v === 'Ka') return Object.assign({ q: intro + ' What is the kinetic energy of the alpha particle?' },
          GRE.numeric(R, Ka, [Q, Q / 2, Kd, Q * 4 / (A - 4), Q * (A - 4) / (2 * A)], { unit: raw`\text{MeV}`, sig: 3, tol: 0.01 }),
          { expl: ex + raw` Here $K_\alpha = ${F.fix(Q, 1)} \times ${A - 4}/${A} = ${F.num(Ka, 3)}\,\text{MeV}$: slightly less than $Q$.` });
        if (v === 'Kd') return Object.assign({ q: intro + ' What is the kinetic energy of the recoiling daughter nucleus?' },
          GRE.numeric(R, Kd, [Ka, Q / 2, Q / A, 2 * Kd, Kd / 4], { unit: raw`\text{MeV}`, sig: 2, tol: 0.2 }),
          { expl: ex + raw` Here $K_{\text{recoil}} = ${F.fix(Q, 1)} \times 4/${A} = ${F.num(Kd, 2)}\,\text{MeV}$.` });
        return Object.assign({ q: intro + ' What is the ratio of the kinetic energy of the alpha particle to that of the daughter nucleus?' },
          mcVals(R, (A - 4) / 4, [4 / (A - 4), A / 4, Math.sqrt((A - 4) / 4), 1, (A - 4) / 2], x => `$${x >= 1 ? F.num(x, 3) : F.frac(4, A - 4)}$`),
          { expl: ex + raw` The ratio is $m_D/m_\alpha = ${A - 4}/4 = ${F.num((A - 4) / 4, 3)}$.` });
      },
    },
    {
      id: 'spec.nuc.terms', sec: '8.1.2', level: 1,
      gen(R) {
        const Z = R.int(8, 90), A = baseA(Z) + R.int(-2, 2), N = A - Z;
        const mk = (kind, d) => kind === 'iso' ? [A + d, Z] : kind === 'bar' ? [A, Z + d] : [A + d, Z + d];
        const dd = () => R.pick([-2, -1, 1, 2]);
        const TERM = { iso: 'isotopes', bar: 'isobars', ton: 'isotones' };
        const SAME = { iso: 'the same proton number $Z$', bar: 'the same mass number $A$', ton: 'the same neutron number $N$' };
        const kind = R.pick(['iso', 'bar', 'ton']);
        if (R.bool(0.5)) {
          const d0 = dd();
          if (kind === 'bar' && Z + d0 === N) throw new Error('mirror pair');
          const [A2, Z2] = mk(kind, d0);
          return Object.assign({ q: raw`The nuclei $${nuc(A, Z)}$ and $${nuc(A2, Z2)}$ are` },
            GRE.mc(R, TERM[kind], ['isotopes', 'isobars', 'isotones', 'isomers', 'mirror nuclei'].filter(x => x !== TERM[kind])),
            { expl: raw`$${nuc(A, Z)}$ has $N = ${N}$; $${nuc(A2, Z2)}$ has $N = ${A2 - Z2}$. They share ${SAME[kind]} only, so they are ${TERM[kind]}. (Isomers are excited states of the same nuclide; mirror nuclei have $Z$ and $N$ interchanged.)` });
        }
        const [A2, Z2] = mk(kind, dd());
        const others = ['iso', 'bar', 'ton'].filter(k => k !== kind);
        const W = [];
        for (const k of others) for (const d of [-2, -1, 1, 2]) W.push(mk(k, d));
        const ws = R.shuffle(W).filter(([a, z]) => !(a === A2 && z === Z2));
        return Object.assign({ q: raw`Which of the following is an ${TERM[kind].slice(0, -1)} of $${nuc(A, Z)}$?` },
          GRE.mc(R, `$${nuc(A2, Z2)}$`, ws.map(([a, z]) => `$${nuc(a, z)}$`)),
          { expl: raw`${cap(TERM[kind])} share ${SAME[kind]}. $${nuc(A, Z)}$ has $Z = ${Z}$, $A = ${A}$, $N = ${N}$; only $${nuc(A2, Z2)}$ (with $N = ${A2 - Z2}$) matches.` });
      },
    },
  ]);

  // ================================================================== 8.1.3 conservation laws
  const lawVals = (r, k) => {
    if (k === 'E') return [P[r.i[0]].m, tot(r.f, 'm')];
    if (k === 'L') { const L = l => tot(l, 'Le') + tot(l, 'Lm') + tot(l, 'Lt'); return [L(r.i), L(r.f)]; }
    if (k === 'J') return [tot(r.i, 'J2'), tot(r.f, 'J2')];
    return [tot(r.i, k), tot(r.f, k)];
  };
  const lawNote = (r, k) => {
    const [a, b] = lawVals(r, k);
    if (k === 'E') return raw`the products' rest energy ($${F.num(b, 4)}\,\text{MeV}$) exceeds the parent's ($${F.num(a, 4)}\,\text{MeV}$)`;
    if (k === 'J') return raw`the number of spin-$\tfrac{1}{2}$ fermions changes from ${a % 2 ? 'odd' : 'even'} to ${b % 2 ? 'odd' : 'even'}, so the total spin would jump between half-integer and integer values, which no orbital angular momentum can fix`;
    return `${LAW[k]} goes from $${a}$ to $${b}$`;
  };
  const isDecay = r => r.i.length === 1;
  const describeViol = r => { const v = absViol(r); return v.length ? v.map(k => LAW[k]).join(', ') : 'nothing'; };

  GRE.addTemplates('spec', [
    {
      id: 'spec.cons.violated', sec: '8.1.3', level: 2, weight: 2,
      gen(R) {
        const base = R.pick(REAL);
        const m = R.pick(mutants(base, 1).filter(x => absViol(x).length));
        if (!m) throw new Error('no mutant');
        const V = viol(m);
        const laws = ABS.filter(k => k !== 'E' || isDecay(m));
        const bad = V.filter(k => laws.indexOf(k) >= 0);
        const good = laws.filter(k => V.indexOf(k) < 0).concat(V.indexOf('S') < 0 ? ['S'] : []);
        if (good.length < 4) throw new Error('too few conserved laws');
        const c = R.pick(bad);
        const name = k => `Conservation of ${LAW[k]}`;
        return Object.assign({
          q: raw`The ${isDecay(m) ? 'decay' : 'reaction'} $${rtex(m)}$ is never observed. Which of the following conservation laws does it violate?`,
        }, GRE.mc(R, name(c), good.map(name)), {
          expl: raw`Check each quantity: ${lawNote(m, c)}.${bad.length > 1 ? ` (It also violates conservation of ${bad.filter(k => k !== c).map(k => LAW[k]).join(' and ')}, which ${bad.length > 2 ? 'are' : 'is'} not among the choices.)` : ''} All the other listed quantities balance.`,
        });
      },
    },
    {
      id: 'spec.cons.allowed', sec: '8.1.3', level: 2, weight: 2,
      gen(R) {
        const base = R.pick(REAL);
        let ms = mutants(base, 1).filter(x => absViol(x).length);
        if (ms.length < 6) ms = mutants(base, 2).filter(x => absViol(x).length);
        const W = R.pickN(ms, 4);
        if (W.length < 4) throw new Error('few mutants');
        const dec = isDecay(base);
        const ch = GRE.mc(R, `$${rtex(base)}$`, W.map(x => `$${rtex(x)}$`));
        return Object.assign({
          q: dec ? R.pick(['Which of the following decays can occur?', 'Which of the following decays is allowed by all conservation laws?', 'Which of the following is a possible decay mode?'])
            : R.pick(['Which of the following reactions can occur?', 'Which of the following reactions is allowed by all conservation laws?']),
        }, ch, {
          expl: raw`$${rtex(base)}$ conserves charge, baryon number, each lepton family number, angular momentum${dec ? ' and energy' : ''}${base.type === 'weak' && viol(base).indexOf('S') >= 0 ? ' (strangeness changes, which the weak interaction allows)' : ''}. The others fail: ` +
            W.map(x => raw`$${rtex(x)}$ violates ${describeViol(x)}`).join('; ') + '.',
        });
      },
    },
    {
      id: 'spec.cons.missing', sec: '8.1.3', level: 2, weight: 2,
      gen(R) {
        const base = R.pick(REAL);
        const side = isDecay(base) || R.bool(0.75) ? 'f' : 'i';
        const j = R.int(0, base[side].length - 1);
        const key = base[side][j];
        const cands = Object.keys(P).filter(k => k !== key && k !== 'gamma').map(k => {
          const m = { i: base.i.slice(), f: base.f.slice() }; m[side][j] = k;
          return [k, absViol(m).length];
        }).filter(x => x[1] > 0).sort((a, b) => a[1] - b[1]);
        const pool = R.shuffle(cands.slice(0, 9)).map(x => `$${P[x[0]].tex}$`);
        const shown = { i: base.i.map(k => P[k].tex), f: base.f.map(k => P[k].tex) };
        shown[side][j] = 'X';
        const tex = shown.i.join(' + ') + raw` \to ` + shown.f.join(' + ');
        const p = P[key];
        const need = [raw`charge $${signed(p.Q)}$`, raw`baryon number $${signed(p.B)}$`];
        if (p.Le || p.Lm || p.Lt) need.push(raw`lepton numbers $L_e = ${signed(p.Le)}$, $L_\mu = ${signed(p.Lm)}$, $L_\tau = ${signed(p.Lt)}$`);
        else need.push('zero lepton number');
        if (base.type === 'strong') need.push(raw`strangeness $${signed(p.S)}$ (the strong interaction conserves strangeness)`);
        need.push(p.J2 % 2 ? 'half-integer spin' : 'integer spin');
        return Object.assign({
          q: raw`In the ${isDecay(base) ? 'decay' : 'reaction'} $${tex}$, the particle X must be`,
        }, GRE.mc(R, `$${P[key].tex}$`, pool), {
          expl: raw`Balancing the quantum numbers, X must have ${need.join(', ')}: that is $${P[key].tex}$. Every other choice violates at least one absolute conservation law.`,
        });
      },
    },
    {
      id: 'spec.cons.strong', sec: '8.1.3', level: 3,
      gen(R) {
        const base = R.pick(REAL.filter(r => r.type === 'strong'));
        const ms = mutants(base, 2).filter(x => viol(x).some(k => k === 'S' || ABS.indexOf(k) >= 0));
        const sOnly = R.shuffle(ms.filter(x => !absViol(x).length && x.f.concat(x.i).every(k => P[k].kind === 'meson' || P[k].kind === 'baryon')));
        const rest = R.shuffle(ms.filter(x => absViol(x).length));
        const W = sOnly.slice(0, R.int(1, 3)).concat(rest).slice(0, 4);
        if (W.length < 4) throw new Error('few');
        const why = x => { const v = absViol(x); return v.length ? v.map(k => LAW[k]).join(', ') : `strangeness (changes from $${tot(x.i, 'S')}$ to $${tot(x.f, 'S')}$)`; };
        return Object.assign({ q: 'Which of the following reactions can proceed through the strong interaction?' },
          GRE.mc(R, `$${rtex(base)}$`, W.map(x => `$${rtex(x)}$`)), {
            expl: raw`The strong interaction conserves strangeness as well as charge, baryon number and lepton numbers. $${rtex(base)}$ conserves all of them (strangeness $${tot(base.i, 'S')} \to ${tot(base.f, 'S')}$). The others violate: ` + W.map(x => raw`$${rtex(x)}$: ${why(x)}`).join('; ') + '.',
          });
      },
    },
    {
      id: 'spec.cons.notconserved', sec: '8.1.3', level: 2,
      gen(R) {
        const base = R.pick(REAL.filter(r => viol(r).indexOf('S') >= 0));
        const laws = ['Q', 'B', 'L', 'Le', 'J', 'E'].filter(k => k !== 'Le' || base.f.some(x => /e|nue/.test(x)) || R.bool(0.3));
        const nm = k => cap(k === 'E' ? 'energy' : LAW[k]);
        return Object.assign({ q: raw`In the decay $${rtex(base)}$, which of the following quantities is NOT conserved?` },
          GRE.mc(R, 'Strangeness', laws.map(nm)), {
            expl: raw`Strangeness goes from $${tot(base.i, 'S')}$ to $${tot(base.f, 'S')}$. Only the weak interaction can change strangeness (by one unit), which is why this decay is slow ($\sim 10^{-10}\,\text{s}$ or longer). Charge, baryon number, lepton numbers, energy and angular momentum are all conserved.`,
          });
      },
    },
    {
      id: 'spec.cons.why', sec: '8.1.3', level: 2,
      gen(R) {
        const LW = { Q: 'conservation of electric charge', B: 'conservation of baryon number', Lf: 'conservation of the separate lepton family numbers ($L_e$, $L_\\mu$)',
          S: 'conservation of strangeness in strong and electromagnetic interactions', E: 'conservation of energy and momentum', J: 'conservation of angular momentum', P: 'conservation of parity', L: 'conservation of total lepton number' };
        const T = [
          ['The electron does not decay, for example into $\\nu_e + \\gamma$. This is explained by', 'Q', [], 'The electron is the lightest charged particle, so any decay would violate charge conservation.'],
          ['The proton does not decay into $e^+ + \\pi^0$ (or any lighter particles). This is explained by', 'B', ['Lf', 'L'], 'The proton is the lightest baryon; baryon number conservation forbids its decay. (The proposed mode also changes lepton number, so those choices are excluded.)'],
          ['The decay $\\mu^- \\to e^- + \\gamma$ has never been observed. This is explained by', 'Lf', ['L'], 'Total lepton number is unchanged, but muon number goes $1 \\to 0$ and electron number $0 \\to 1$; the separate family numbers are conserved.'],
          ['The decay $\\Lambda^0 \\to p + \\pi^-$ is slow ($\\sim 10^{-10}\\,\\text{s}$) rather than strong ($\\sim 10^{-23}\\,\\text{s}$). The reason is', 'S', [], 'The $\\Lambda^0$ has strangeness $-1$ while $p\\pi^-$ has $0$; strong decays must conserve strangeness, so only the weak force can act.'],
          ['An isolated photon in vacuum cannot convert into an electron–positron pair. This is explained by', 'E', [], 'In the pair\'s center-of-momentum frame the total momentum is zero, but a single photon always carries momentum $E/c$; energy and momentum cannot both be conserved (a nearby nucleus is needed).'],
          ['The decay $\\mu^- \\to e^- + \\bar{\\nu}_e + \\nu_\\mu$ must include the $\\nu_\\mu$. This is required by', 'Lf', ['L', 'J'], 'The $\\mu^-$ has muon number $+1$; without the $\\nu_\\mu$ muon number would not be conserved.'],
          ['The $K^+$ cannot decay strongly to $\\pi^+ + \\pi^0$, even though this is energetically allowed. The reason is', 'S', [], 'The $K^+$ has strangeness $+1$; pions have none, so the decay must be weak.'],
          ['The antineutron cannot decay to $\\bar{p} + e^- + \\bar{\\nu}_e$. This is forbidden by', 'Q', ['Lf', 'L'], 'Charge goes from $0$ to $-2$. (Lepton number is also violated, so those choices are excluded; the actual decay is $\\bar{n} \\to \\bar{p} + e^+ + \\nu_e$.)'],
        ];
        const [q, a, excl, why] = R.pick(T);
        const wr = Object.keys(LW).filter(k => k !== a && excl.indexOf(k) < 0).map(k => cap(LW[k]));
        return Object.assign({ q }, GRE.mc(R, cap(LW[a]), wr), { expl: why });
      },
    },
    {
      id: 'spec.cons.discrete', sec: '8.1.3', level: 2,
      gen(R) {
        const TRUE = [
          ['The weak interaction violates parity (P).', 'it is maximally parity violating, as the cobalt-60 beta-decay experiment showed.'],
          ['CP violation was observed in the neutral kaon system.', 'the $K^0$–$\\bar{K}^0$ system gave the first evidence.'],
          ['Every Lorentz-invariant local quantum field theory is invariant under the combined operation CPT.', 'this is the CPT theorem.'],
          ['Because CP is violated while CPT is conserved, T must also be violated.', 'CPT invariance links CP violation to T violation.'],
          ['Charge conjugation (C) exchanges particles and antiparticles.', 'that is the definition of C.'],
          ['Parity (P) maps a configuration to its mirror image (inverts spatial coordinates).', 'that is the definition of P.'],
          ['In the beta decay of polarized cobalt-60, electrons are emitted preferentially in one direction relative to the nuclear spin.', 'this asymmetry was the proof of parity violation.'],
        ];
        const FALSE = [
          ['The weak interaction conserves parity.', 'the weak interaction violates parity maximally.'],
          ['The weak interaction violates CPT.', 'CPT is conserved by any Lorentz-invariant local quantum field theory.'],
          ['CP violation was first observed in free neutron decay.', 'it was first seen in neutral kaons.'],
          ['Parity reverses the direction of time.', 'that is time reversal, T.'],
          ['Charge conjugation reverses the spin of a particle while keeping its charge.', 'C exchanges particles and antiparticles.'],
          ['Time-reversal symmetry is exact in all interactions.', 'CP violation plus the CPT theorem implies T violation.'],
          ['In polarized cobalt-60 beta decay, electrons are emitted isotropically, showing that parity is conserved.', 'the emission is asymmetric: parity is violated.'],
        ];
        if (R.bool(0.6)) return romanQ(R, 'Which of the following statements about the discrete symmetries C, P, and T is (are) true?', TRUE, FALSE);
        const neg = R.bool(0.4);
        return factQ(R, neg ? 'Which of the following statements about the discrete symmetries C, P, and T is FALSE?' : 'Which of the following statements about the discrete symmetries C, P, and T is true?', TRUE.map(x => [x[0], cap(x[1])]), FALSE.map(x => [x[0], cap(x[1])]), neg);
      },
    },
  ]);

  // ================================================================== 8.1.4 recent developments
  GRE.addTemplates('spec', [
    {
      id: 'spec.recent.higgs', sec: '8.1.4', level: 1,
      gen(R) {
        if (R.bool(0.3)) {
          const c = 'The top quark';
          return Object.assign({ q: 'The Higgs boson couples to each elementary particle with a strength proportional to the particle’s mass. To which of the following does it couple most strongly?' },
            GRE.mc(R, c, ['The electron', 'The up quark', 'The muon', 'The electron neutrino', 'The bottom quark', 'The tau lepton']),
            { expl: 'The top quark is the heaviest Standard Model particle (about $173\\,\\text{GeV}/c^2$), so it has the largest Higgs coupling — a key handle in the Higgs searches at the LHC.' });
        }
        const TRUE = [
          ['It was discovered at the Large Hadron Collider, with the discovery announced in 2012.', 'the discovery was announced on July 4, 2012.'],
          ['It has spin 0.', 'the Higgs is a scalar boson.'],
          ['Its mass is roughly $125\\,\\text{GeV}/c^2$.', 'it is measured at about $125$–$126\\,\\text{GeV}/c^2$.'],
          ['The nonzero vacuum value of the Higgs field gives mass to the $W$ and $Z$ bosons.', 'that is the Higgs mechanism.'],
          ['It couples to particles in proportion to their mass.', 'so it couples most strongly to the top quark.'],
          ['It is electrically neutral.', 'the physical Higgs boson has zero charge.'],
        ];
        const FALSE = [
          ['It is a spin-1 gauge boson that mediates a new force.', 'the Higgs is a spin-0 scalar, not a gauge boson.'],
          ['It couples most strongly to the electron.', 'the coupling grows with mass, so the electron coupling is tiny.'],
          ['It gives a small mass to the photon.', 'the photon remains massless.'],
          ['It was discovered in 1983 together with the $W$ and $Z$ bosons.', 'it was found in 2012 at the LHC.'],
          ['Its mass is about $1\\,\\text{GeV}/c^2$, comparable to the proton.', 'it is about $125\\,\\text{GeV}/c^2$.'],
          ['It couples with equal strength to all particles.', 'the coupling is proportional to mass.'],
          ['It carries color charge.', 'it does not interact strongly at tree level.'],
        ];
        if (R.bool(0.5)) return romanQ(R, 'Which of the following statements about the Higgs boson is (are) true?', TRUE, FALSE);
        return factQ(R, 'Which of the following statements about the Higgs boson is correct?', TRUE.map(x => [x[0], cap(x[1])]), FALSE.map(x => [x[0], cap(x[1])]));
      },
    },
    {
      id: 'spec.recent.neutrino', sec: '8.1.4', level: 1,
      gen(R) {
        const TRUE = [
          ['Neutrino oscillations imply that at least some neutrinos have nonzero mass.', 'oscillation requires different mass eigenvalues.'],
          ['Oscillation experiments are sensitive to differences of neutrino masses, not their absolute values.', 'only mass differences enter the oscillation phase.'],
          ['A neutrino produced as an electron neutrino can later be detected as a muon or tau neutrino.', 'that is what oscillation means.'],
          ['Neutrino masses are smaller than one-thousandth of the electron mass.', 'neutrino masses are below about $1\\,\\text{eV}/c^2$.'],
        ];
        const FALSE = [
          ['Neutrino oscillations prove that all neutrinos are exactly massless.', 'oscillations require mass.'],
          ['Oscillation experiments directly determine the absolute neutrino masses.', 'they measure mass differences only.'],
          ['Neutrino oscillations violate conservation of electric charge.', 'neutrinos are neutral; charge is untouched.'],
          ['Neutrinos are heavier than electrons.', 'they are far lighter.'],
          ['A neutrino keeps its flavor forever once produced.', 'flavor oscillates in flight.'],
          ['Neutrino oscillations show that neutrinos interact through the strong force.', 'neutrinos feel only the weak force (and gravity).'],
        ];
        if (R.bool(0.6)) return romanQ(R, 'Which of the following statements about neutrinos is (are) true?', TRUE, FALSE);
        const neg = R.bool(0.4);
        return factQ(R, neg ? 'Which of the following statements about neutrino oscillations is FALSE?' : 'Which of the following statements about neutrino oscillations is correct?', TRUE.map(x => [x[0], cap(x[1])]), FALSE.map(x => [x[0], cap(x[1])]), neg);
      },
    },
    {
      id: 'spec.recent.susy', sec: '8.1.4', level: 1,
      gen(R) {
        const TRUE = [
          ['Each particle would have a superpartner with the same charges but spin differing by $\\tfrac{1}{2}$.', 'that is the defining property of supersymmetry.'],
          ['The superpartner of a fermion is a boson.', 'a spin change of $\\tfrac{1}{2}$ turns half-integer spin into integer spin.'],
          ['The superpartner of a gauge boson is a fermion.', 'spin 1 becomes spin $\\tfrac{1}{2}$.'],
          ['As of now, no superpartner has been observed experimentally.', 'searches at the LHC have found none.'],
        ];
        const FALSE = [
          ['Superpartners have the same spin as their partners but opposite electric charge.', 'superpartners have the same charges and different spin; opposite charges describe antiparticles.'],
          ['Superpartners were discovered at the LHC along with the Higgs boson.', 'none has been found.'],
          ['The superpartner of the electron is a spin-$\\tfrac{1}{2}$ fermion.', 'it would be a boson.'],
          ['Supersymmetry pairs each particle with its antiparticle.', 'antiparticles exist without supersymmetry; superpartners differ in spin.'],
          ['The superpartner of the photon is another spin-1 boson.', 'it would be a spin-$\\tfrac{1}{2}$ fermion (the photino).'],
        ];
        if (R.bool(0.5)) return romanQ(R, 'Which of the following statements about supersymmetry is (are) correct?', TRUE, FALSE);
        return factQ(R, 'Which of the following statements about supersymmetry is correct?', TRUE.map(x => [x[0], cap(x[1])]), FALSE.map(x => [x[0], cap(x[1])]));
      },
    },
  ]);

  // ================================================================== 8.2.1 crystal structure
  const LAT = {
    sc: { name: 'simple cubic', n: 1, z: 6, naive: 8, dv: 1, dt: 'a', pfv: Math.PI / 6, pft: raw`\frac{\pi}{6}`, ex: ['polonium'] },
    bcc: { name: 'body-centered cubic (bcc)', n: 2, z: 8, naive: 9, dv: Math.sqrt(3) / 2, dt: raw`\frac{\sqrt{3}}{2}a`, pfv: Math.sqrt(3) * Math.PI / 8, pft: raw`\frac{\sqrt{3}\,\pi}{8}`, ex: ['sodium', 'potassium', 'tungsten', 'chromium', 'lithium', '<i>α</i>-iron'] },
    fcc: { name: 'face-centered cubic (fcc)', n: 4, z: 12, naive: 14, dv: Math.SQRT2 / 2, dt: raw`\frac{\sqrt{2}}{2}a`, pfv: Math.SQRT2 * Math.PI / 6, pft: raw`\frac{\sqrt{2}\,\pi}{6}`, ex: ['copper', 'aluminum', 'silver', 'gold', 'nickel', 'lead'] },
  };
  const LATK = ['sc', 'bcc', 'fcc'];
  const LATWHY = {
    sc: '8 corners shared by 8 cells each: $8 \\times \\tfrac18 = 1$ atom; each atom has 6 nearest neighbors at distance $a$.',
    bcc: '8 corners $\\times \\tfrac18$ plus 1 body center $= 2$ atoms; each atom has 8 nearest neighbors at half the body diagonal, $\\tfrac{\\sqrt3}{2}a$.',
    fcc: '8 corners $\\times \\tfrac18$ plus 6 faces $\\times \\tfrac12 = 4$ atoms; each atom has 12 nearest neighbors at half the face diagonal, $\\tfrac{\\sqrt2}{2}a$.',
  };

  GRE.addTemplates('spec', [
    {
      id: 'spec.cm.cubic', sec: '8.2.1', level: 1, weight: 2,
      gen(R) {
        const k = R.pick(LATK), L = LAT[k];
        const v = R.pick(['n', 'z', 'dsym', 'dnum', 'pf', 'afromd']);
        const who = R.bool(0.6) ? `${cap(R.pick(L.ex))} has a ${L.name} crystal structure.` : `A crystal has a ${L.name} lattice.`;
        if (v === 'n') return Object.assign({ q: `${who} How many atoms are contained in one conventional cubic unit cell?` },
          mcVals(R, L.n, [L.naive, 1, 2, 4, 6, 8, 9, 14].filter(x => x !== L.n), x => `$${x}$`), { expl: LATWHY[k] + ' Counting every lattice point without sharing is the classic trap.' });
        if (v === 'z') return Object.assign({ q: `${who} How many nearest neighbors does each atom have?` },
          mcVals(R, L.z, [4, 6, 8, 12, 14, 2], x => `$${x}$`), { expl: LATWHY[k] });
        if (v === 'dsym') {
          const all = ['a', raw`\frac{\sqrt{3}}{2}a`, raw`\frac{\sqrt{2}}{2}a`, raw`\sqrt{2}\,a`, raw`\sqrt{3}\,a`, raw`\frac{a}{2}`, raw`\frac{\sqrt{3}}{4}a`];
          return Object.assign({ q: `${who} If the side of the conventional cubic cell is $a$, what is the nearest-neighbor distance?`, level: 2 },
            GRE.mc(R, `$${L.dt}$`, all.filter(x => x !== L.dt).map(x => `$${x}$`)), { expl: LATWHY[k] });
        }
        if (v === 'pf') {
          const W = LATK.filter(x => x !== k).map(x => LAT[x].pfv).concat([Math.PI / 4, 0.5, Math.PI / 3]);
          const tx = x => { for (const q of LATK) if (Math.abs(LAT[q].pfv - x) < 1e-9) return LAT[q].pft; return x === 0.5 ? raw`\frac{1}{2}` : Math.abs(x - Math.PI / 4) < 1e-9 ? raw`\frac{\pi}{4}` : raw`\frac{\pi}{3}`; };
          return Object.assign({ q: `${who} Treating the atoms as touching hard spheres, what fraction of the volume do they fill (the packing fraction)?`, level: 3 },
            mcVals(R, L.pfv, W, x => `$${tx(x)} \\approx ${x.toFixed(2)}$`),
            { expl: raw`Spheres of radius $r = d/2$ with $d = ${L.dt}$; $${L.n}$ atom${L.n > 1 ? 's' : ''} per cell of volume $a^3$ give fraction $${L.n}\cdot\tfrac{4}{3}\pi r^3/a^3 = ${L.pft} \approx ${L.pfv.toFixed(2)}$.` });
        }
        const a = R.step(0.25, 0.6, 0.005);
        const d = a * L.dv;
        const nm = raw`\text{nm}`;
        if (v === 'dnum') return Object.assign({ q: `A metal crystallizes in a ${L.name} lattice with lattice constant $a = ${F.num(a, 3)}\\,\\text{nm}$. What is the distance between nearest-neighbor atoms?`, level: 2 },
          GRE.numeric(R, d, LATK.filter(x => x !== k).map(x => a * LAT[x].dv).concat([a / 2, a * Math.SQRT2, a * Math.sqrt(3)]), { unit: nm, sig: 3, tol: 0.06 }),
          { expl: raw`For ${L.name}, $d = ${L.dt} = ${F.num(d, 3)}\,\text{nm}$. ` + LATWHY[k] });
        const dr = +d.toPrecision(3), ar = dr / L.dv;
        return Object.assign({ q: `In a ${L.name} metal the nearest-neighbor distance is $${F.num(dr, 3)}\\,\\text{nm}$. What is the side of the conventional cubic unit cell?`, level: 2 },
          GRE.numeric(R, ar, LATK.filter(x => x !== k).map(x => dr / LAT[x].dv).concat([dr * L.dv, 2 * dr, dr / 2]), { unit: nm, sig: 3, tol: 0.06 }),
          { expl: raw`$d = ${L.dt}$, so $a = ${F.num(dr, 3)}/${F.num(L.dv, 3)} = ${F.num(ar, 3)}\,\text{nm}$.` });
      },
    },
    {
      id: 'spec.cm.primitive', sec: '8.2.1', level: 2,
      gen(R) {
        const k = R.pick(['bcc', 'fcc', 'bcc', 'fcc', 'sc']), L = LAT[k];
        const v = R.pick(['conv', 'a', 'd', 'num']);
        const intro = `The primitive unit cell of a ${L.name} lattice has volume $V$.`;
        const nV = n => (n === 1 ? 'V' : `${n}V`);
        if (v === 'conv') return Object.assign({ q: `${intro} What is the volume of the conventional cubic unit cell?` },
          GRE.mc(R, `$${nV(L.n)}$`, ['V', '2V', '4V', '8V', raw`\frac{V}{2}`, raw`\frac{V}{4}`, '14V'].filter(x => x !== nV(L.n)).map(x => `$${x}$`)),
          { expl: `A primitive cell holds exactly one lattice point; the conventional ${k} cell holds ${L.n}, so its volume is $${nV(L.n)}$.` });
        const cube = n => (n === 1 ? 'V^{1/3}' : `(${n}V)^{1/3}`);
        if (v === 'a') return Object.assign({ q: `${intro} What is the side length $a$ of the conventional cubic unit cell?` },
          GRE.mc(R, `$${cube(L.n)}$`, [1, 2, 4, 8].filter(n => n !== L.n).map(n => `$${cube(n)}$`).concat([raw`$(V/2)^{1/3}$`, raw`$(V/4)^{1/3}$`])),
          { expl: `The conventional cell contains ${L.n} lattice point${L.n > 1 ? 's' : ''}, so $a^3 = ${nV(L.n)}$ and $a = ${cube(L.n)}$.` });
        const DT = { sc: 'V^{1/3}', bcc: raw`\frac{\sqrt{3}}{2}(2V)^{1/3}`, fcc: raw`\frac{1}{\sqrt{2}}(4V)^{1/3}` };
        if (v === 'd') {
          const W = LATK.filter(x => x !== k).map(x => DT[x]).concat([cube(L.n), raw`\sqrt{3}\,(2V)^{1/3}`, raw`\sqrt{2}\,(4V)^{1/3}`, raw`\frac{\sqrt{3}}{2}V^{1/3}`, raw`\frac{1}{\sqrt{2}}V^{1/3}`]).filter(x => x !== DT[k]);
          return Object.assign({ q: `${intro} What is the nearest-neighbor distance?`, level: 3 },
            GRE.mc(R, `$${DT[k]}$`, W.map(x => `$${x}$`)),
            { expl: raw`First $a^3 = ${nV(L.n)}$ (${L.n} lattice point${L.n > 1 ? 's' : ''} per conventional cell), then $d = ${L.dt} = ${DT[k]}$.` });
        }
        const a = R.step(3, 6, 0.1);
        const V = +(a * a * a / L.n).toPrecision(3);
        const ar = Math.cbrt(V * L.n), d = ar * L.dv;
        return Object.assign({ q: raw`The primitive unit cell of a ${L.name} crystal has volume $${F.num(V, 3)}\,\text{\AA}^3$. What is the nearest-neighbor distance?`, level: 3 },
          GRE.numeric(R, d, [ar, Math.cbrt(V) * L.dv, Math.cbrt(V), ...LATK.filter(x => x !== k).map(x => Math.cbrt(V * LAT[x].n) * LAT[x].dv)], { unit: raw`\text{\AA}`, sig: 3, tol: 0.05 }),
          { expl: raw`$a^3 = ${L.n} \times ${F.num(V, 3)}\,\text{\AA}^3$, so $a = ${F.num(ar, 3)}\,\text{\AA}$ and $d = ${L.dt} = ${F.num(d, 3)}\,\text{\AA}$.` });
      },
    },
    {
      id: 'spec.cm.density', sec: '8.2.1', level: 2,
      gen(R) {
        const REAL_EL = [['Copper', 'fcc', 0.3615, 63.55], ['Aluminum', 'fcc', 0.4050, 26.98], ['Silver', 'fcc', 0.4086, 107.87], ['Gold', 'fcc', 0.4078, 196.97], ['Nickel', 'fcc', 0.3524, 58.69], ['Lead', 'fcc', 0.4950, 207.2],
          ['Iron', 'bcc', 0.2866, 55.85], ['Sodium', 'bcc', 0.4291, 22.99], ['Potassium', 'bcc', 0.5328, 39.10], ['Tungsten', 'bcc', 0.3165, 183.84], ['Chromium', 'bcc', 0.2910, 52.00], ['Lithium', 'bcc', 0.3510, 6.94], ['Polonium', 'sc', 0.3359, 209.0]];
        let name, k, a, M;
        if (R.bool(0.4)) [name, k, a, M] = R.pick(REAL_EL);
        else { name = 'A hypothetical element'; k = R.pick(LATK); a = R.step(0.25, 0.6, 0.01); M = R.int(10, 240); }
        const L = LAT[k], acm = a * 1e-7;
        const rho = L.n * M / (C.NA * acm * acm * acm);
        const Wn = [1, 2, 4, 8, 14, 9].filter(n => n !== L.n).map(n => rho * n / L.n);
        if (R.bool(0.7)) return Object.assign({
          q: raw`${name} has a ${L.name} structure with lattice constant $a = ${F.num(a, 4)}\,\text{nm}$ and molar mass $${F.num(M, 4)}\,\text{g/mol}$. Its mass density is closest to`,
        }, GRE.numeric(R, rho, Wn, { unit: raw`\text{g/cm}^3`, sig: 2, tol: 0.2 }), {
          expl: raw`$\rho = \dfrac{nM}{N_A a^3}$ with $n = ${L.n}$ atoms per conventional cell: $\rho = \dfrac{${L.n}(${F.num(M, 4)}\,\text{g/mol})}{(6.02\times10^{23})(${F.num(a, 4)}\times10^{-7}\,\text{cm})^3} \approx ${F.num(rho, 2)}\,\text{g/cm}^3$.`,
        });
        const nd = L.n / Math.pow(a * 1e-9, 3);
        return Object.assign({
          q: raw`${name} has a ${L.name} structure with lattice constant $a = ${F.num(a, 4)}\,\text{nm}$. What is the number of atoms per cubic meter?`,
        }, GRE.numeric(R, nd, [1, 2, 4, 8, 14].filter(n => n !== L.n).map(n => nd * n / L.n), { unit: raw`\text{m}^{-3}`, sig: 2, tol: 0.2 }), {
          expl: raw`Number density $= n/a^3 = ${L.n}/(${F.num(a, 4)}\times10^{-9}\,\text{m})^3 \approx ${F.sci(nd, 2)}\,\text{m}^{-3}$ (${L.n} atom${L.n > 1 ? 's' : ''} per conventional ${k} cell).`,
        });
      },
    },
    {
      id: 'spec.cm.bragg', sec: '8.2.1', level: 2, weight: 2,
      gen(R) {
        const v = R.pick(['lam', 'lam', 'defl', 'planes', 'order']);
        const SIN = { 30: 0.5, 45: Math.SQRT2 / 2, 60: Math.sqrt(3) / 2 };
        const nm = raw`\text{nm}`;
        if (v === 'lam' || v === 'defl') {
          const th = R.pick([30, 45, 60]), d = R.step(0.1, 0.5, 0.01), n = R.pick([1, 1, 2, 3]);
          const lam = 2 * d * SIN[th] / n;
          const ordinal = ['', 'first', 'second', 'third'][n];
          if (v === 'lam') return Object.assign({
            q: raw`X rays reflect from crystal planes with spacing $d = ${F.num(d, 2)}\,\text{nm}$. A ${ordinal}-order Bragg maximum is observed when the incident beam makes an angle of $${th}^\circ$ with the planes. What is the wavelength?`,
          }, GRE.numeric(R, lam, [d * SIN[th] / n, 2 * d * Math.cos(th * Math.PI / 180) / n, 2 * d * SIN[th], 4 * d * SIN[th] / n, d / n], { unit: nm, sig: 3, tol: 0.08 }), {
            expl: raw`Bragg's law: $2d\sin\theta = n\lambda$, so $\lambda = 2(${F.num(d, 2)})\sin${th}^\circ/${n} = ${F.num(lam, 3)}\,\text{nm}$. The angle is measured from the planes, not from the normal.`,
          });
          const phi = 2 * th;
          return Object.assign({
            q: raw`In a ${ordinal}-order Bragg reflection from planes of spacing $d = ${F.num(d, 2)}\,\text{nm}$, the diffracted beam is deflected by $${phi}^\circ$ from the direction of the incident beam. What is the X-ray wavelength?`, level: 3,
          }, GRE.numeric(R, lam, [2 * d * Math.sin(Math.min(phi, 180 - phi) * Math.PI / 180) / n, d * SIN[th] / n, 2 * d * Math.cos(th * Math.PI / 180) / n, 2 * d * SIN[th] * n], { unit: nm, sig: 3, tol: 0.08 }), {
            expl: raw`The deflection angle is $2\theta$, so the Bragg angle is $\theta = ${th}^\circ$. Then $\lambda = 2d\sin\theta/n = ${F.num(lam, 3)}\,\text{nm}$. Using the deflection angle directly in Bragg's law is the trap.`,
          });
        }
        if (v === 'planes') {
          const HKL = [[1, 0, 0], [1, 1, 0], [1, 1, 1], [2, 0, 0], [2, 1, 0], [2, 1, 1], [2, 2, 0], [2, 2, 1]];
          const [h, kk, l] = R.pick(HKL), s2 = h * h + kk * kk + l * l;
          const a = R.step(0.3, 0.6, 0.01), d = a / Math.sqrt(s2);
          return Object.assign({ q: raw`For a simple cubic lattice with lattice constant $a = ${F.num(a, 2)}\,\text{nm}$, what is the spacing between adjacent $(${h}${kk}${l})$ planes?` },
            GRE.numeric(R, d, [a * Math.sqrt(s2), a / s2, a / (h + kk + l), a, a / 2], { unit: nm, sig: 3, tol: 0.06 }),
            { expl: raw`For cubic lattices $d_{hkl} = a/\sqrt{h^2+k^2+l^2} = ${F.num(a, 2)}/\sqrt{${s2}} = ${F.num(d, 3)}\,\text{nm}$.` });
        }
        const d = R.step(0.15, 0.5, 0.01), lam = R.step(0.05, 0.2, 0.005);
        const x = 2 * d / lam;
        if (Math.abs(x - Math.round(x)) < 0.08 || x > 12) throw new Error('edge');
        const nmax = Math.floor(x);
        return Object.assign({ q: raw`X rays of wavelength $${F.num(lam, 3)}\,\text{nm}$ are incident on crystal planes with spacing $${F.num(d, 2)}\,\text{nm}$. What is the highest order of Bragg reflection that can be observed?` },
          mcVals(R, nmax, [Math.floor(d / lam), nmax + 1, Math.floor(4 * d / lam), nmax - 1, nmax + 2, Math.round(lam / d)].filter(y => y >= 1), y => `$${y}$`),
          { expl: raw`Since $\sin\theta \le 1$, $n \le 2d/\lambda = ${F.num(x, 3)}$, so the highest order is $${nmax}$.` });
      },
    },
    {
      id: 'spec.cm.reciprocal', sec: '8.2.1', level: 2,
      gen(R) {
        if (R.bool(0.35)) {
          const a = R.step(0.25, 0.6, 0.01), b = 2 * Math.PI / a;
          return Object.assign({ q: raw`A simple cubic lattice has lattice constant $a = ${F.num(a, 2)}\,\text{nm}$. What is the side length of the cubic cell of its reciprocal lattice?` },
            GRE.numeric(R, b, [1 / a, Math.PI / a, a, 2 * Math.PI * a, 4 * Math.PI / a], { unit: raw`\text{nm}^{-1}`, sig: 2, tol: 0.15 }),
            { expl: raw`The simple cubic lattice is its own reciprocal, with side $2\pi/a = ${F.num(b, 2)}\,\text{nm}^{-1}$ (the $2\pi$ comes from the Fourier transform).` });
        }
        const T = [
          ['The reciprocal lattice of a body-centered cubic (bcc) lattice is', 'a face-centered cubic (fcc) lattice', ['a body-centered cubic lattice', 'a simple cubic lattice', 'a hexagonal lattice', 'a diamond lattice'], 'The bcc and fcc lattices are reciprocal (dual) to each other.'],
          ['The reciprocal lattice of a face-centered cubic (fcc) lattice is', 'a body-centered cubic (bcc) lattice', ['a face-centered cubic lattice', 'a simple cubic lattice', 'a hexagonal lattice', 'a diamond lattice'], 'The bcc and fcc lattices are reciprocal (dual) to each other.'],
          ['The reciprocal lattice of a simple cubic lattice of side $a$ is', 'a simple cubic lattice of side $2\\pi/a$', ['a simple cubic lattice of side $a$', 'a simple cubic lattice of side $2\\pi a$', 'a body-centered cubic lattice of side $2\\pi/a$', 'a face-centered cubic lattice of side $2\\pi/a$'], 'Simple cubic is self-dual; reciprocal vectors have units of wavenumber, hence side $2\\pi/a$.'],
          ['The reciprocal lattice of a two-dimensional hexagonal lattice is', 'a hexagonal lattice rotated by $30^\\circ$', ['a square lattice', 'a hexagonal lattice with the same orientation', 'a rectangular lattice', 'an oblique lattice with no rotational symmetry'], 'The dual of a hexagonal lattice is hexagonal, rotated by $30^\\circ$.'],
          ['The first Brillouin zone of a crystal is', 'the primitive (Wigner–Seitz) cell of the reciprocal lattice', ['the conventional unit cell of the direct lattice', 'the primitive cell of the direct lattice', 'the Fermi sphere of the conduction electrons', 'the smallest cell containing one atom of each type'], 'The first Brillouin zone is the primitive (Wigner–Seitz) cell of the reciprocal lattice.'],
          ['The reciprocal lattice vectors of a crystal are', 'normal to sets of lattice planes of the direct lattice', ['parallel to the nearest-neighbor bonds', 'parallel to the lattice planes', 'the positions of the atoms in the unit cell', 'always of length equal to the lattice constant'], 'Each reciprocal lattice vector is normal to a family of lattice planes; its length is $2\\pi/d$ for the planes’ spacing $d$.'],
        ];
        const [q, c, w, why] = R.pick(T);
        return Object.assign({ q }, GRE.mc(R, c, w), { expl: why });
      },
    },
  ]);

  // ================================================================== 8.2.2 electron theory of metals
  const EF = n => C.hbar * C.hbar * Math.pow(3 * Math.PI * Math.PI * n, 2 / 3) / (2 * C.me); // J
  GRE.addTemplates('spec', [
    {
      id: 'spec.cm.fermiscale', sec: '8.2.2', level: 2, weight: 2,
      gen(R) {
        const sc = R.pick(['n', 'n', 'a', 'val', 'm']);
        let f = 1, mk = 1, how;
        if (sc === 'n') { f = R.pick([8, 27, 64, 2, 4, 3]); if (R.bool(0.3)) f = 1 / f; how = `the conduction-electron density $n$ is ${f > 1 ? 'multiplied' : 'divided'} by $${f > 1 ? f : 1 / f}$`; }
        if (sc === 'a') { const s = R.pick([2, 3]); f = s * s * s; how = `the metal is compressed so that its lattice constant decreases by a factor of $${s}$ (same number of conduction electrons per atom)`; }
        if (sc === 'val') { f = R.pick([2, 3]); how = `each atom contributes ${f === 2 ? 'two' : 'three'} conduction electrons instead of one (same atomic density)`; }
        if (sc === 'm') { mk = R.pick([2, 3, 4, 9, 0.5]); how = `the electrons' effective mass is ${mk > 1 ? 'multiplied' : 'divided'} by $${mk > 1 ? mk : 1 / mk}$ (same density)`; }
        const Q = sc === 'm' ? R.pick(['EF', 'vF', 'kF', 'g'])
          : R.pick(['EF', 'EF', 'kF', 'vF', 'TF', 'pF']);
        // exponents of n and m
        const EXP = { EF: [2 / 3, -1, 'Fermi energy $E_F$'], TF: [2 / 3, -1, 'Fermi temperature $T_F$'], kF: [1 / 3, 0, 'Fermi wave number $k_F$'], pF: [1 / 3, 0, 'Fermi momentum $p_F$'], vF: [1 / 3, -1, 'Fermi velocity $v_F$'], g: [1 / 3, 1, 'density of states at the Fermi energy (per unit volume)'] };
        const [en, em, label] = EXP[Q];
        const val = Math.pow(f, en) * Math.pow(mk, em);
        const base = sc === 'm' ? mk : f;
        const W = [1 / 3, 2 / 3, 1, 1 / 2, 3 / 2, -2 / 3, -1, 2, 0].map(e => Math.pow(base, e)).filter(x => Math.abs(x - val) > 1e-9);
        return Object.assign({ q: `In the free-electron model of a metal, suppose ${how}. By what factor does the ${label} change?` },
          mcVals(R, val, W, x => `$${exactOr(x)}$`), {
            expl: raw`Free-electron results: $k_F = (3\pi^2 n)^{1/3}$, $p_F = \hbar k_F$, $v_F = \hbar k_F/m$, $E_F = \hbar^2k_F^2/2m \propto n^{2/3}/m$, $T_F = E_F/k_B$, and $g(E_F) = 3n/2E_F \propto m\,n^{1/3}$. ${sc === 'm' ? raw`Here only $m$ changes (by $${exactOr(mk)}$), ` : raw`Here $n$ changes by a factor $${exactOr(f)}$, `}so the ${label} changes by $${exactOr(val)}$.`,
          });
      },
    },
    {
      id: 'spec.cm.fermi', sec: '8.2.2', level: 3,
      gen(R) {
        const n = R.step(1, 20, 0.1) * 1e28;
        const E = EF(n), kF = Math.cbrt(3 * Math.PI * Math.PI * n), vF = C.hbar * kF / C.me;
        const Q = R.pick(['E', 'E', 'T', 'v']);
        const intro = raw`A metal has $${F.sci(n, 2)}$ conduction electrons per cubic meter. Treating them as a free-electron gas ($E_F = \frac{\hbar^2}{2m}(3\pi^2 n)^{2/3}$),`;
        const wrongE = [C.hbar * C.hbar * Math.pow(n, 2 / 3) / (2 * C.me), C.hbar * C.hbar * Math.pow(3 * Math.PI * Math.PI * n, 2 / 3) / C.me, E * 10, E / 10];
        if (Q === 'E') return Object.assign({ q: intro + ' the Fermi energy is closest to' },
          GRE.numeric(R, E / C.eV, wrongE.map(x => x / C.eV), { unit: raw`\text{eV}`, sig: 2, tol: 0.25 }),
          { expl: raw`$k_F = (3\pi^2 n)^{1/3} = ${F.sci(kF, 2)}\,\text{m}^{-1}$ and $E_F = \hbar^2k_F^2/2m = ${F.sci(E, 2)}\,\text{J} \approx ${F.num(E / C.eV, 2)}\,\text{eV}$ — a few eV, typical for metals.` });
        if (Q === 'T') return Object.assign({ q: intro + raw` the Fermi temperature $T_F = E_F/k_B$ is closest to` },
          GRE.numeric(R, E / C.kB, wrongE.map(x => x / C.kB), { unit: raw`\text{K}`, sig: 2, tol: 0.25 }),
          { expl: raw`$E_F \approx ${F.num(E / C.eV, 2)}\,\text{eV}$, so $T_F = E_F/k_B \approx ${F.sci(E / C.kB, 2)}\,\text{K}$, far above room temperature: the electron gas is highly degenerate.` });
        return Object.assign({ q: intro + ' the Fermi velocity is closest to' },
          GRE.numeric(R, vF, [vF * 10, vF / 10, Math.sqrt(2) * vF * 3, C.c], { unit: raw`\text{m/s}`, sig: 2, tol: 0.25 }),
          { expl: raw`$v_F = \hbar k_F/m$ with $k_F = (3\pi^2n)^{1/3} = ${F.sci(kF, 2)}\,\text{m}^{-1}$: $v_F \approx ${F.sci(vF, 2)}\,\text{m/s}$, about $1\%$ of $c$.` });
      },
    },
    {
      id: 'spec.cm.thermal', sec: '8.2.2', level: 2,
      gen(R) {
        if (R.bool(0.35)) {
          const TRUE = [['Only electrons within about $k_BT$ of the Fermi energy can be thermally excited, because lower states are already filled (Pauli exclusion).', 'This is why the electronic heat capacity is a small fraction $\\sim k_BT/E_F$ of the classical value.']];
          const FALSE = [
            ['Conduction electrons are tightly bound to individual ions and cannot move.', ''], ['The electrons obey Maxwell–Boltzmann statistics at room temperature.', ''],
            ['The electrons have zero kinetic energy at room temperature.', ''], ['Electrons are bosons and condense into the ground state.', ''],
            ['The electron mass is too small to store thermal energy.', ''], ['Electron–phonon collisions remove all the thermal energy from the electrons.', ''],
          ];
          return factQ(R, 'The conduction electrons in a metal contribute far less to its heat capacity at room temperature than the classical equipartition value $\\tfrac{3}{2}k_B$ per electron. Why?', TRUE, FALSE);
        }
        const EFeV = R.pick([2, 3, 4, 5, 6, 7, 8, 10, 12]), T = R.pick([3, 10, 30, 77, 100, 300, 500, 1000]);
        const x = C.kB_eVK * T / EFeV;
        if (R.bool(0.6)) return Object.assign({
          q: raw`In a metal with Fermi energy $${EFeV}\,\text{eV}$ at temperature $${T}\,\text{K}$, the fraction of conduction electrons that can be thermally excited is roughly $k_BT/E_F$. This fraction is closest to`,
        }, GRE.numeric(R, x, [x * 10, x / 10, x * 100, x / 100, Math.sqrt(x)], { fmt: v => F.sci(v, 1), tol: 0.6 }), {
          expl: raw`$k_BT = (8.6\times10^{-5}\,\text{eV/K})(${T}\,\text{K}) = ${F.num(C.kB_eVK * T, 2)}\,\text{eV}$, so $k_BT/E_F \approx ${F.sci(x, 1)}$. Only electrons within $\sim k_BT$ of the Fermi surface can be excited.`,
        });
        const r = Math.PI * Math.PI / 3 * x;
        return Object.assign({
          q: raw`The free-electron heat capacity is $C_{\text{el}} = \frac{\pi^2}{2}Nk_B\frac{k_BT}{E_F}$. For $E_F = ${EFeV}\,\text{eV}$ and $T = ${T}\,\text{K}$, the ratio of $C_{\text{el}}$ to the classical value $\frac{3}{2}Nk_B$ is closest to`, level: 3,
        }, GRE.numeric(R, r, [r * 10, r / 10, x * 3 / 2 * Math.PI * Math.PI, r * 100, r / 100], { fmt: v => F.sci(v, 1), tol: 0.6 }), {
          expl: raw`$C_{\text{el}}/(\tfrac32 Nk_B) = \tfrac{\pi^2}{3}\,k_BT/E_F = 3.3 \times ${F.sci(x, 2)} \approx ${F.sci(r, 1)}$.`,
        });
      },
    },
    {
      id: 'spec.cm.heatcap', sec: '8.2.2', level: 2, weight: 2,
      gen(R) {
        const v = R.pick(['scale', 'scale', 'cross', 'plot', 'dp', 'mix']);
        if (v === 'scale') {
          const who = R.pick(['phonon', 'electron']);
          const T1 = R.int(2, 12), k = R.pick([2, 3, 0.5]), T2 = T1 * k;
          const C1 = R.step(0.2, 9.9, 0.1);
          const p = who === 'phonon' ? 3 : 1;
          const C2 = C1 * Math.pow(k, p);
          const desc = who === 'phonon' ? `an insulating crystal (no free electrons) well below its Debye temperature` : `a metal at temperatures low enough that the conduction electrons dominate the heat capacity`;
          return Object.assign({ q: raw`The molar heat capacity of ${desc} is $${F.num(C1, 2)}\,\text{mJ/(mol·K)}$ at $${T1}\,\text{K}$. What is it at $${F.num(T2, 2)}\,\text{K}$?` },
            GRE.numeric(R, C2, [C1 * Math.pow(k, 4 - p), C1 * k * k, C1 * Math.pow(k, 4), C1, C1 * Math.pow(k, p === 3 ? 1 : 3)], { unit: raw`\text{mJ/(mol·K)}`, sig: 2, tol: 0.15 }),
            { expl: who === 'phonon' ? raw`Debye law: the phonon heat capacity at low $T$ is $\propto T^3$, so it changes by $(${F.num(k, 2)})^3 = ${F.num(k * k * k, 3)}$: $${F.num(C2, 2)}\,\text{mJ/(mol·K)}$.`
              : raw`The electronic heat capacity is $\propto T$ (only electrons within $k_BT$ of $E_F$ are excited), so it changes by $${F.num(k, 2)}$: $${F.num(C2, 2)}\,\text{mJ/(mol·K)}$.` });
        }
        if (v === 'cross') {
          const g = R.step(0.5, 2, 0.05), b = R.step(0.01, 0.2, 0.005);
          const Ts = Math.sqrt(g / b);
          return Object.assign({ q: raw`At low temperature the molar heat capacity of a metal is $C = \gamma T + \beta T^3$ with $\gamma = ${F.num(g, 3)}\,\text{mJ/(mol·K}^2)$ and $\beta = ${F.num(b, 2)}\,\text{mJ/(mol·K}^4)$. At what temperature are the electronic and lattice contributions equal?`, level: 3 },
            GRE.numeric(R, Ts, [g / b, Math.cbrt(g / b), Math.sqrt(b / g), Math.pow(g / b, 0.25)], { unit: raw`\text{K}`, sig: 2, tol: 0.15 }),
            { expl: raw`Set $\gamma T = \beta T^3$: $T = \sqrt{\gamma/\beta} = \sqrt{${F.num(g / b, 3)}}\,\text{K} \approx ${F.num(Ts, 2)}\,\text{K}$. Below this the electrons ($\propto T$) dominate; above it the phonons ($\propto T^3$).` });
        }
        if (v === 'plot') {
          return Object.assign({ q: raw`The low-temperature heat capacity of a metal has the form $C = \gamma T + \beta T^3$. Which plot of the data gives a straight line from whose intercept $\gamma$ can be read off?` },
            GRE.mc(R, raw`$C/T$ versus $T^2$`, [raw`$C$ versus $T$`, raw`$C$ versus $T^3$`, raw`$\ln C$ versus $T$`, raw`$C/T^3$ versus $T$`, raw`$CT$ versus $T^2$`]),
            { expl: raw`Dividing by $T$: $C/T = \gamma + \beta T^2$, a straight line in $T^2$ with intercept $\gamma$ (electrons) and slope $\beta$ (phonons, Debye $T^3$ law).` });
        }
        if (v === 'dp') {
          return Object.assign({ q: 'At high temperatures (well above the Debye temperature), the molar heat capacity of a monatomic crystalline solid approaches approximately', level: 1 },
            GRE.mc(R, raw`$3R \approx 25\,\text{J/(mol·K)}$`, [raw`$R \approx 8.3\,\text{J/(mol·K)}$`, raw`$\tfrac{3}{2}R \approx 12\,\text{J/(mol·K)}$`, raw`$6R \approx 50\,\text{J/(mol·K)}$`, 'zero', raw`a value that grows as $T^3$ without limit`]),
            { expl: raw`Dulong–Petit: each atom is a 3D oscillator with 6 quadratic terms, $\tfrac{1}{2}k_BT$ each, so $C = 3Nk_B = 3R$ per mole $\approx 25\,\text{J/(mol·K)}$.` });
        }
        const k = R.pick([2, 3, 0.5, 4]);
        const val = (k + k * k * k) / 2;
        return Object.assign({ q: raw`A metal's low-temperature heat capacity is $C = \gamma T + \beta T^3$. At temperature $T_0$ the electronic and lattice contributions are equal. By what factor does the total heat capacity change if the temperature becomes $${F.num(k, 2)}\,T_0$?`, level: 3 },
          mcVals(R, val, [k, k * k * k, k * k, (1 + k * k * k) / 2, (k + k * k) / 2], x => `$${exactOr(x)}$`),
          { expl: raw`At $T_0$: $C_0 = 2\gamma T_0$. At $${F.num(k, 2)}T_0$: $C = \gamma T_0(${F.num(k, 2)} + ${F.num(k * k * k, 3)})$, so the ratio is $(${F.num(k, 2)} + ${F.num(k * k * k, 3)})/2 = ${exactOr(val)}$.` });
      },
    },
    {
      id: 'spec.cm.drude', sec: '8.2.2', level: 2,
      gen(R) {
        if (R.bool(0.55)) {
          const fn = R.pick([1, 2, 3, 4, 0.5]), ft = R.pick([1, 2, 3, 0.5, 0.25]), fm = R.pick([1, 1, 2, 0.5]);
          if (fn === 1 && ft === 1 && fm === 1) throw new Error('trivial');
          const askRho = R.bool(0.4);
          const s = fn * ft / fm, val = askRho ? 1 / s : s;
          const parts = [];
          if (fn !== 1) parts.push(`the carrier density is ${fn > 1 ? 'multiplied' : 'divided'} by $${fn > 1 ? fn : 1 / fn}$`);
          if (ft !== 1) parts.push(`the mean time between collisions is ${ft > 1 ? 'multiplied' : 'divided'} by $${ft > 1 ? ft : 1 / ft}$`);
          if (fm !== 1) parts.push(`the carrier effective mass is ${fm > 1 ? 'multiplied' : 'divided'} by $${fm > 1 ? fm : 1 / fm}$`);
          const W = [1 / val, fn * ft * fm, fn / ft, ft / fn, val * 2, val / 2, val * 4, val / 4, fn * fn * ft / fm].filter(x => Math.abs(x - val) > 1e-9);
          return Object.assign({ q: `In the Drude model of a metal, suppose ${parts.length > 2 ? parts.slice(0, -1).join(', ') + ', and ' + parts[parts.length - 1] : parts.join(' and ')}. By what factor does the ${askRho ? 'resistivity' : 'conductivity'} change?` },
            mcVals(R, val, W, x => `$${exactOr(x)}$`),
            { expl: raw`Drude: $\sigma = ne^2\tau/m$ and $\rho = 1/\sigma$. The conductivity changes by $${exactOr(s)}$${askRho ? raw`, so the resistivity changes by $${exactOr(val)}$` : ''}.` });
        }
        const n = R.step(1, 20, 0.5) * 1e28, sig = R.step(1, 9.5, 0.5) * 1e7;
        const tau = C.me * sig / (n * C.e * C.e);
        return Object.assign({ q: raw`A metal has conductivity $${F.sci(sig, 2)}\,(\Omega\cdot\text{m})^{-1}$ and $${F.sci(n, 2)}$ conduction electrons per $\text{m}^3$. In the Drude model, the mean time between collisions is closest to` },
          GRE.numeric(R, tau, [C.me * sig / (n * C.e), n * C.e * C.e / (C.me * sig), tau * 1e3, tau / 1e3], { unit: raw`\text{s}`, sig: 2, tol: 0.3 }),
          { expl: raw`$\tau = m\sigma/(ne^2) = \dfrac{(9.11\times10^{-31})(${F.sci(sig, 2)})}{(${F.sci(n, 2)})(1.6\times10^{-19})^2} \approx ${F.sci(tau, 2)}\,\text{s}$ — typical metals have $\tau \sim 10^{-14}\,\text{s}$.` });
      },
    },
    {
      id: 'spec.cm.drift', sec: '8.2.2', level: 2,
      gen(R) {
        const I = R.pick([0.5, 1, 2, 3, 5, 8, 10, 15, 20]), dmm = R.pick([0.5, 0.8, 1, 1.2, 1.5, 2, 2.5, 3]);
        const n = R.pick([[8.5e28, 'copper'], [5.9e28, 'gold'], [5.9e28, 'silver'], [18.1e28, 'aluminum']]);
        const A = Math.PI * Math.pow(dmm * 1e-3, 2) / 4;
        const v = I / (n[0] * C.e * A);
        return Object.assign({ q: raw`${n[1] === 'aluminum' ? 'An' : 'A'} ${n[1]} wire of diameter $${F.num(dmm, 2)}\,\text{mm}$ carries a current of $${I}\,\text{A}$. The density of conduction electrons is $${F.sci(n[0], 2)}\,\text{m}^{-3}$. The electron drift speed is closest to` },
          GRE.numeric(R, v, [v / 4, I / (n[0] * C.e * Math.PI * Math.pow(dmm * 1e-3, 2) * 4), v * 1e3, I / (n[0] * A), v / 1e3], { unit: raw`\text{m/s}`, sig: 2, tol: 0.3 }),
          { expl: raw`$I = neAv_d$ with $A = \pi d^2/4 = ${F.sci(A, 2)}\,\text{m}^2$: $v_d = I/(neA) \approx ${F.sci(v, 2)}\,\text{m/s}$ — millimeters per second or less, vastly smaller than the Fermi velocity ($\sim 10^6\,\text{m/s}$). Using the diameter as the radius gives an answer 4 times too small.` });
      },
    },
    {
      id: 'spec.cm.hallsign', sec: '8.2.2', level: 2,
      gen(R) {
        const ax = R.shuffle(['x', 'y', 'z']);
        const sI = R.sign(), sB = R.sign();
        const vec = (a, s) => { const v = { x: 0, y: 0, z: 0 }; v[a] = s; return v; };
        const I = vec(ax[0], sI), B = vec(ax[1], sB);
        const cr = { x: I.y * B.z - I.z * B.y, y: I.z * B.x - I.x * B.z, z: I.x * B.y - I.y * B.x };
        const fa = ax[2], fs = cr[fa]; // carriers pushed toward face (fa, fs) regardless of sign
        const face = (a, s) => `the face at $${s > 0 ? '+' : '-'}${a}$`;
        const dir = (a, s) => `$${s > 0 ? '+' : '-'}${a}$`;
        const holes = R.bool();
        const hi = holes ? fs : -fs;
        const setup = `A rectangular slab carries a current in the ${dir(ax[0], sI)} direction in a uniform magnetic field along ${dir(ax[1], sB)}.`;
        const geom = raw`The magnetic force $q\mathbf{v}\times\mathbf{B}$ points along $\hat{I}\times\hat{B} = ${fs > 0 ? '+' : '-'}\hat{${fa}}$ for <i>either</i> sign of carrier (reversing $q$ also reverses $\mathbf{v}$), so carriers pile up on ${face(fa, fs)}.`;
        if (R.bool(0.6)) {
          const all = [];
          for (const a of ['x', 'y', 'z']) for (const s of [1, -1]) all.push(face(a, s));
          const c = face(fa, hi);
          return Object.assign({ q: `${setup} The charge carriers are ${holes ? 'holes (positive)' : 'electrons (negative)'}. Which face of the slab is at the higher electric potential?` },
            GRE.mc(R, c, [face(fa, -hi)].concat(R.shuffle(all.filter(x => x !== c && x !== face(fa, -hi)))), { keep: 1 }),
            { expl: geom + ` These carriers are ${holes ? 'positive, so that face becomes positive and is at the higher potential' : 'negative, so that face becomes negative and the opposite face is at the higher potential'}.` });
        }
        return Object.assign({ q: `${setup} Measurements show that ${face(fa, hi)} is at a higher potential than the opposite face. What can be concluded about the charge carriers?` },
          GRE.mc(R, holes ? 'They are positive (holes).' : 'They are negative (electrons).', [holes ? 'They are negative (electrons).' : 'They are positive (holes).', 'Nothing; the sign of the Hall voltage does not depend on the carrier sign.', 'They are neutral.', 'The carrier density must be zero.', 'The current must actually flow in the opposite direction.']),
          { expl: geom + ` The higher-potential face is ${holes ? 'the one where the carriers collect, so they are positive (holes)' : 'the opposite one, so the collecting carriers are negative (electrons)'}.` });
      },
    },
  ]);

  // ================================================================== 8.2.2 Hall effect (numeric), 8.2.3 semiconductors, 8.2.4 superconductors
  GRE.addTemplates('spec', [
    {
      id: 'spec.cm.hall', sec: '8.2.2', level: 3,
      gen(R) {
        const I = R.pick([0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1]), B = R.pick([0.2, 0.25, 0.5, 0.8, 1, 1.5, 2]);
        const t = R.pick([0.1, 0.2, 0.25, 0.5, 1]) * 1e-3, w = R.pick([2, 3, 4, 5, 10]) * 1e-3;
        const n0 = R.step(1, 9.5, 0.5) * Math.pow(10, R.int(20, 23));
        const VH = +(I * B / (n0 * C.e * t)).toPrecision(2);
        const n = I * B / (C.e * t * VH);
        const dims = raw`It is $${F.num(w * 1e3, 2)}\,\text{mm}$ wide and $${F.num(t * 1e3, 2)}\,\text{mm}$ thick (the thickness is measured along $\mathbf{B}$)`;
        const setup = raw`A semiconductor slab carries a current of $${I >= 1 ? F.num(I, 2) + raw`\,\text{A}` : F.num(I * 1e3, 2) + raw`\,\text{mA}`}$ perpendicular to a magnetic field of $${B}\,\text{T}$. ${dims}.`;
        const Vt = VH >= 1 ? [VH, raw`\text{V}`] : VH >= 1e-3 ? [VH * 1e3, raw`\text{mV}`] : [VH * 1e6, raw`\mu\text{V}`];
        if (R.bool(0.6)) return Object.assign({ q: setup + raw` The measured Hall voltage is $${F.num(Vt[0], 2)}\,${Vt[1]}$. The carrier density is closest to` },
          GRE.numeric(R, n, [I * B / (C.e * w * VH), I * B / (C.e * t * w * VH) * 1e-3, n * 1e3, n / 1e3], { unit: raw`\text{m}^{-3}`, sig: 2, tol: 0.3 }),
          { expl: raw`Balancing the Hall field against the magnetic force gives $V_H = \dfrac{IB}{nqt}$ with $t$ the thickness along $\mathbf{B}$, so $n = \dfrac{IB}{eV_Ht} \approx ${F.sci(n, 2)}\,\text{m}^{-3}$. Using the width instead of the thickness is the trap.` });
        const V = I * B / (n0 * C.e * t);
        return Object.assign({ q: setup + raw` The carrier density is $${F.sci(n0, 2)}\,\text{m}^{-3}$. The Hall voltage is closest to` },
          GRE.numeric(R, V, [I * B / (n0 * C.e * w), V * 1e3, V / 1e3, I * B / (n0 * t)], { unit: raw`\text{V}`, sig: 2, tol: 0.3 }),
          { expl: raw`$V_H = \dfrac{IB}{net} = ${F.sci(V, 2)}\,\text{V}$. Low carrier densities make Hall voltages in semiconductors far larger than in metals.` });
      },
    },
    {
      id: 'spec.semi.dopant', sec: '8.2.3', level: 1,
      gen(R) {
        const host = R.pick(['silicon', 'germanium']);
        const ACC = ['boron', 'aluminum', 'gallium', 'indium'], DON = ['phosphorus', 'arsenic', 'antimony'];
        const NEU = { silicon: ['germanium', 'tin', 'carbon'], germanium: ['silicon', 'tin', 'carbon'] }[host];
        const why = raw`${cap(host)} (group 14) has four valence electrons. A group-15 donor (P, As, Sb) has five, contributing an extra electron: n-type, electrons are the majority carriers. A group-13 acceptor (B, Al, Ga, In) has three, leaving a hole: p-type, holes are the majority carriers.`;
        const v = R.pick(['type', 'type', 'pick']);
        if (v === 'type') {
          const isAcc = R.bool();
          const el = R.pick(isAcc ? ACC : DON);
          const S = {
            n: 'n-type, with electrons as the majority carriers', p: 'p-type, with holes as the majority carriers',
            nh: 'n-type, with holes as the majority carriers', pe: 'p-type, with electrons as the majority carriers',
            i: 'intrinsic, since the dopant has the same number of valence electrons', ins: 'an insulator, since the dopant atoms trap all free carriers',
          };
          const c = isAcc ? S.p : S.n;
          return Object.assign({ q: `A small amount of ${el} is added to pure ${host}. The resulting semiconductor is` },
            GRE.mc(R, cap(c), Object.values(S).filter(x => x !== c).map(cap)), { expl: why });
        }
        const wantP = R.bool();
        const c = R.pick(wantP ? ACC : DON);
        return Object.assign({ q: `Which of the following elements, added in small amounts to ${host}, produces ${wantP ? 'a p' : 'an n'}-type semiconductor?` },
          GRE.mc(R, cap(c), R.shuffle((wantP ? DON : ACC).concat(NEU)).map(cap)), { expl: why });
      },
    },
    {
      id: 'spec.semi.gap', sec: '8.2.3', level: 2, weight: 2,
      gen(R) {
        const MAT = [['silicon', 1.1], ['germanium', 0.67], ['gallium arsenide', 1.42], ['gallium nitride', 3.4], ['cadmium sulfide', 2.42], ['indium phosphide', 1.34], ['zinc oxide', 3.37], ['diamond', 5.5], ['gallium phosphide', 2.26], ['cadmium selenide', 1.74]];
        const named = R.bool(0.4);
        const [name, Eg] = named ? R.pick(MAT) : ['A semiconductor', R.step(0.5, 4, 0.05)];
        const lam = C.hc_eVnm / Eg;
        const v = R.pick(['lam', 'lam', 'Eg', 'which']);
        const intro = named ? `${cap(name)} has a band gap of $${Eg}\\,\\text{eV}$.` : `A semiconductor has a band gap of $${F.num(Eg, 3)}\\,\\text{eV}$.`;
        if (v === 'lam') return Object.assign({ q: intro + ' What is the longest wavelength of light that can create electron–hole pairs (the absorption edge)?' },
          GRE.numeric(R, lam, [lam / 2, 2 * lam, C.hc_eVnm * Eg, 1240 / (2 * Eg) + 0.4 * lam], { unit: raw`\text{nm}`, sig: 3, tol: 0.1 }),
          { expl: raw`A photon must supply at least the gap energy: $\lambda_{\max} = hc/E_g = (1240\,\text{eV·nm})/(${F.num(Eg, 3)}\,\text{eV}) \approx ${F.num(lam, 3)}\,\text{nm}$. Longer wavelengths pass through.` });
        if (v === 'Eg') {
          const L = Math.round(lam / 10) * 10, E = C.hc_eVnm / L;
          return Object.assign({ q: raw`A photodetector made of a semiconductor stops responding to light with wavelengths longer than $${L}\,\text{nm}$. The band gap is closest to` },
            GRE.numeric(R, E, [E / 2, 2 * E, L / 1240, E * 1.6], { unit: raw`\text{eV}`, sig: 2, tol: 0.15 }),
            { expl: raw`At the cutoff the photon energy equals the gap: $E_g = hc/\lambda = 1240/${L} \approx ${F.num(E, 2)}\,\text{eV}$.` });
        }
        const lams = [250, 350, 450, 550, 650, 800, 1000, 1500, 2000, 3000];
        const abs = lams.filter(l => l < lam * 0.93), tr = lams.filter(l => l > lam * 1.07);
        if (!abs.length || tr.length < 4) throw new Error('range');
        const c = R.pick(abs);
        return Object.assign({ q: intro + ' Which of the following photons can be absorbed by exciting an electron across the gap?' },
          GRE.mc(R, `$\\lambda = ${c}\\,\\text{nm}$`, tr.map(l => `$\\lambda = ${l}\\,\\text{nm}$`), { rank: s => +s.match(/= (\d+)/)[1] }),
          { expl: raw`Absorption requires $hc/\lambda \ge E_g$, i.e. $\lambda \le 1240/${F.num(Eg, 3)} \approx ${F.num(lam, 3)}\,\text{nm}$. Only the ${c} nm photon qualifies.` });
      },
    },
    {
      id: 'spec.semi.facts', sec: '8.2.3', level: 2,
      gen(R) {
        const TRUE = [
          ['The resistivity of a pure semiconductor decreases as temperature increases.', 'more electrons are thermally excited across the gap.'],
          ['The resistivity of a typical metal increases as temperature increases.', 'more lattice vibrations (phonons) scatter the electrons.'],
          ['A hole behaves like a positively charged carrier.', 'it is the absence of an electron in the valence band.'],
          ['Doping with impurities can greatly increase a semiconductor’s conductivity.', 'dopants add carriers without thermal excitation.'],
          ['In an n-type semiconductor, electrons are the majority carriers.', 'donors supply extra conduction electrons.'],
          ['An ideal pure semiconductor at absolute zero behaves as an insulator.', 'the valence band is full and the conduction band empty.'],
          ['The intrinsic carrier density grows roughly as $e^{-E_g/2k_BT}$.', 'thermal excitation across the gap is Boltzmann suppressed.'],
          ['Insulators have much larger band gaps than semiconductors.', 'gaps of several eV make thermal excitation negligible.'],
        ];
        const FALSE = [
          ['The conductivity of a pure semiconductor decreases as temperature increases.', 'it increases, because the carrier density rises.'],
          ['Semiconductor conductivity rises with temperature mainly because carriers scatter less.', 'scattering actually increases; the carrier density increase dominates.'],
          ['Holes are positrons trapped in the crystal lattice.', 'a hole is a missing electron, not an antiparticle.'],
          ['In a p-type semiconductor, electrons are the majority carriers.', 'holes are.'],
          ['Adding phosphorus to silicon produces a p-type semiconductor.', 'phosphorus is a donor, giving n-type material.'],
          ['A metal’s resistivity decreases with increasing temperature.', 'it increases because of phonon scattering.'],
          ['A semiconductor has zero resistance below a critical temperature.', 'that describes a superconductor.'],
          ['Semiconductors have no band gap.', 'they have a small, nonzero gap (about 1 eV).'],
        ];
        if (R.bool(0.55)) return romanQ(R, 'Which of the following statements about semiconductors is (are) true?', TRUE, FALSE);
        const neg = R.bool(0.4);
        return factQ(R, neg ? 'Which of the following statements about semiconductors and metals is FALSE?' : 'Which of the following statements about semiconductors and metals is true?', TRUE.map(x => [x[0], cap(x[1])]), FALSE.map(x => [x[0], cap(x[1])]), neg);
      },
    },
    {
      id: 'spec.sc.flux', sec: '8.2.4', level: 2,
      gen(R) {
        const phi0 = C.h / (2 * C.e);
        const v = R.pick(['N', 'N', 'q', 'e']);
        if (v === 'N') {
          const r = R.pick([0.5, 1, 2, 5, 10, 20]) * 1e-6, B = R.pick([1, 2, 5, 10, 20, 50, 100]) * 1e-3;
          const N = B * Math.PI * r * r / phi0;
          if (N < 3) throw new Error('small');
          return Object.assign({ q: raw`A superconducting ring of radius $${F.num(r * 1e6, 2)}\,\mu\text{m}$ traps the flux of a $${F.num(B * 1e3, 2)}\,\text{mT}$ field threading it. Approximately how many flux quanta are trapped?` },
            GRE.numeric(R, N, [N / 2, 2 * N, B * r * r / phi0, N * Math.PI], { sig: 2, tol: 0.2 }),
            { expl: raw`The flux quantum is $\Phi_0 = h/2e \approx 2.07\times10^{-15}\,\text{Wb}$. $N = B\pi r^2/\Phi_0 \approx ${F.num(N, 2)}$. Using $h/e$ (single electrons) would halve the count.` });
        }
        if (v === 'q') return Object.assign({ q: 'The magnetic flux through a superconducting ring is quantized in units of', level: 1 },
          GRE.mc(R, raw`$h/2e$, because the supercurrent is carried by Cooper pairs of charge $2e$`, [raw`$h/e$, because the supercurrent is carried by single electrons`, raw`$2h/e$, because electrons have two spin states`, raw`$h/4e$, because Cooper pairs contain four electrons`, raw`$e/h$, the conductance quantum`, raw`$\hbar/e$, because flux is proportional to angular momentum`]),
          { expl: raw`Single-valuedness of the condensate wavefunction quantizes the flux in units of $h/q$; the carriers are Cooper pairs with $q = 2e$, so $\Phi_0 = h/2e \approx 2.07\times10^{-15}\,\text{Wb}$.` });
        return Object.assign({ q: raw`The superconducting flux quantum $\Phi_0 = h/2e$ is closest to`, level: 1 },
          GRE.numeric(R, phi0, [2 * phi0, phi0 / 2, phi0 * Math.PI * 2, phi0 * 1e3, phi0 / 1e3], { unit: raw`\text{Wb}`, sig: 2, tol: 0.3 }),
          { expl: raw`$\Phi_0 = \dfrac{6.63\times10^{-34}}{2(1.6\times10^{-19})} \approx 2.1\times10^{-15}\,\text{Wb}$.` });
      },
    },
    {
      id: 'spec.sc.facts', sec: '8.2.4', level: 2, weight: 2,
      gen(R) {
        const TRUE = [
          ['Below its critical temperature, a superconductor has exactly zero DC electrical resistance.', 'that is the defining property.'],
          ['A superconductor expels a weak applied magnetic field from its interior (the Meissner effect).', 'surface currents cancel the field in the bulk.'],
          ['Inside a superconductor, an applied magnetic field decays exponentially with depth below the surface.', 'over the London penetration depth.'],
          ['Cooper pairs of electrons behave collectively like bosons.', 'two spin-1/2 electrons form an integer-spin object.'],
          ['A sufficiently strong applied magnetic field destroys superconductivity.', 'above the critical field the material returns to the normal state.'],
          ['A current set up in a superconducting ring persists without decaying.', 'there is no resistance to dissipate it.'],
          ['In BCS theory, the electron pairing is mediated by lattice vibrations (phonons).', 'the electron–phonon interaction gives the attraction.'],
          ['Superconductivity cannot be explained by classical electromagnetism alone.', 'it is a quantum-mechanical phenomenon.'],
        ];
        const FALSE = [
          ['The Meissner effect follows from zero resistance alone, using Ohm’s law.', 'a mere perfect conductor would trap, not expel, existing flux.'],
          ['Cooper pairs obey the Pauli exclusion principle like single electrons.', 'they behave as bosons.'],
          ['The magnetic field inside a superconductor equals the applied field.', 'the field is expelled from the bulk.'],
          ['A material becomes superconducting above its critical temperature.', 'superconductivity appears below $T_c$.'],
          ['Increasing the applied magnetic field always raises the critical temperature.', 'fields suppress superconductivity.'],
          ['Magnetic flux through a superconducting ring is quantized in units of $h/e$.', 'the quantum is $h/2e$.'],
          ['A Cooper pair consists of an electron bound to a hole.', 'it is a pair of electrons.'],
          ['The resistance of a superconductor falls gradually toward zero only as $T \\to 0$.', 'it drops abruptly to zero at $T_c$.'],
        ];
        if (R.bool(0.55)) return romanQ(R, 'Which of the following statements about superconductors is (are) true?', TRUE, FALSE);
        const neg = R.bool(0.4);
        return factQ(R, neg ? 'Which of the following statements about superconductivity is FALSE?' : 'Which of the following statements about superconductivity is true?', TRUE.map(x => [x[0], cap(x[1])]), FALSE.map(x => [x[0], cap(x[1])]), neg);
      },
    },
    {
      id: 'spec.sc.critical', sec: '8.2.4', level: 2,
      gen(R) {
        const v = R.pick(['Bc', 'Bc', 'Tmax', 'iso', 'gap']);
        const Tc = R.pick([1.2, 3.7, 4.2, 7.2, 9.2, 18, 2.4, 5.4, 6]);
        if (v === 'Bc' || v === 'Tmax') {
          const B0 = R.pick([10, 20, 30, 50, 80, 100, 200, 400]);
          const x = R.pick([0.2, 0.25, 0.4, 0.5, 0.6, 0.75, 0.8]);
          const law = raw`$B_c(T) = B_c(0)\left[1 - (T/T_c)^2\right]$`;
          if (v === 'Bc') {
            const B = B0 * (1 - x * x);
            return Object.assign({ q: raw`A superconductor has $T_c = ${F.num(Tc, 2)}\,\text{K}$ and critical field $B_c(0) = ${B0}\,\text{mT}$. Using ${law}, what is the critical field at $T = ${F.num(x * Tc, 3)}\,\text{K}$?` },
              GRE.numeric(R, B, [B0 * (1 - x), B0 * x * x, B0 * (1 - x * x * x), B0 * Math.sqrt(1 - x * x)], { unit: raw`\text{mT}`, sig: 2, tol: 0.08 }),
              { expl: raw`$T/T_c = ${x}$, so $B_c = ${B0}(1 - ${F.num(x * x, 3)}) = ${F.num(B, 3)}\,\text{mT}$.` });
          }
          const y = R.pick([0.19, 0.36, 0.51, 0.64, 0.75, 0.84, 0.91]), T = Tc * Math.sqrt(1 - y);
          return Object.assign({ q: raw`A superconductor has $T_c = ${F.num(Tc, 2)}\,\text{K}$ and $B_c(0) = ${B0}\,\text{mT}$, with ${law}. What is the highest temperature at which it remains superconducting in an applied field of $${F.num(y * B0, 3)}\,\text{mT}$?`, level: 3 },
            GRE.numeric(R, T, [Tc * (1 - y), Tc * y, Tc * Math.sqrt(y), Tc * (1 - y * y)], { unit: raw`\text{K}`, sig: 2, tol: 0.08 }),
            { expl: raw`Solve $B = B_c(0)[1 - (T/T_c)^2]$: $T = T_c\sqrt{1 - B/B_c(0)} = ${F.num(Tc, 2)}\sqrt{1 - ${y}} \approx ${F.num(T, 2)}\,\text{K}$.` });
        }
        if (v === 'iso') {
          const [M1, M2] = R.pick([[198, 202], [199, 204], [196, 204], [112, 124], [116, 124], [92, 100], [64, 81], [100, 121], [36, 49]]);
          const T1 = R.step(2, 9.5, 0.1), T2 = T1 * Math.sqrt(M1 / M2);
          return Object.assign({ q: raw`In the BCS theory the critical temperature obeys the isotope effect $T_c \propto M^{-1/2}$, where $M$ is the isotopic mass. A sample made of the isotope with mass number $${M1}$ has $T_c = ${F.num(T1, 2)}\,\text{K}$. What is $T_c$ for a sample of the isotope with mass number $${M2}$?`, level: 3 },
            GRE.numeric(R, T2, [T1 * Math.sqrt(M2 / M1), T1 * M1 / M2, T1 * M2 / M1, T1], { unit: raw`\text{K}`, sig: 3, tol: 0.01 }),
            { expl: raw`$T_2 = T_1\sqrt{M_1/M_2} = ${F.num(T1, 2)}\sqrt{${M1}/${M2}} \approx ${F.num(T2, 3)}\,\text{K}$. Heavier ions vibrate more slowly, weakening the phonon-mediated pairing: evidence that phonons drive conventional superconductivity.` });
        }
        const gap = 3.5 * C.kB * Tc, f = gap / C.h;
        return Object.assign({ q: raw`In BCS theory the energy needed to break a Cooper pair at $T = 0$ is $2\Delta \approx 3.5\,k_BT_c$. For a superconductor with $T_c = ${F.num(Tc, 2)}\,\text{K}$, the minimum photon frequency that can break pairs is closest to`, level: 3 },
          GRE.numeric(R, f, [f / 2, 2 * f, f / 3.5, f * 1e3], { unit: raw`\text{Hz}`, sig: 2, tol: 0.3 }),
          { expl: raw`$hf = 3.5k_BT_c$, so $f = 3.5(1.38\times10^{-23})(${F.num(Tc, 2)})/(6.63\times10^{-34}) \approx ${F.sci(f, 2)}\,\text{Hz}$ — microwave/far-infrared frequencies.` });
      },
    },
    {
      id: 'spec.sc.london', sec: '8.2.4', level: 2,
      gen(R) {
        const lam = R.pick([20, 30, 40, 50, 60, 80, 100, 150, 200]);
        const v = R.pick(['depth', 'frac', 'lam']);
        if (v === 'depth') {
          const k = R.pick([1, 2, 3, 4, 5]);
          return Object.assign({ q: raw`A weak magnetic field $B_0$ is applied parallel to the surface of a superconductor with penetration depth $\lambda = ${lam}\,\text{nm}$. At what depth below the surface has the field fallen to $B_0/e^{${k}}$?` },
            GRE.numeric(R, k * lam, [lam / k, lam, k * k * lam, lam * Math.exp(k) / 10], { unit: raw`\text{nm}`, sig: 2, tol: 0.1 }),
            { expl: raw`Inside, $B(x) = B_0e^{-x/\lambda}$ (Meissner effect: screening currents flow within $\sim\lambda$ of the surface). $e^{-x/\lambda} = e^{-${k}}$ gives $x = ${k}\lambda = ${k * lam}\,\text{nm}$.` });
        }
        if (v === 'frac') {
          const k = R.pick([1, 2, 3]), x = k * lam;
          const fr = Math.exp(-k);
          return Object.assign({ q: raw`The magnetic field inside a superconductor decays as $B(x) = B_0e^{-x/\lambda}$ with $\lambda = ${lam}\,\text{nm}$. What fraction of the surface field remains at a depth of $${x}\,\text{nm}$?` },
            GRE.numeric(R, fr, [1 - k / 3 > 0 ? 1 / k : 0.5, Math.exp(-k * k), Math.exp(-k / 2), Math.exp(-(k + 1))], { sig: 2, tol: 0.15 }),
            { expl: raw`$B/B_0 = e^{-${x}/${lam}} = e^{-${k}} \approx ${F.num(fr, 2)}$.` });
        }
        const r = R.pick([2, 4, 10]);
        const d = Math.round(lam * Math.log(r));
        const lm = d / Math.log(r);
        return Object.assign({ q: raw`Inside a superconductor the field decays as $B_0e^{-x/\lambda}$. The field at a depth of $${d}\,\text{nm}$ is $1/${r}$ of its surface value. The penetration depth $\lambda$ is closest to (use $\ln 2 \approx 0.69$, $\ln 10 \approx 2.3$)`, level: 3 },
          GRE.numeric(R, lm, [d / r, d * Math.log(r), d, d / (r - 1)], { unit: raw`\text{nm}`, sig: 2, tol: 0.15 }),
          { expl: raw`$e^{-d/\lambda} = 1/${r}$ gives $\lambda = d/\ln ${r} \approx ${F.num(lm, 2)}\,\text{nm}$.` });
      },
    },
  ]);

  // ================================================================== 8.3 astrophysics
  const MSUN = 2.0e30, MPC = 3.09e22, YR = 3.16e7;
  GRE.addTemplates('spec', [
    {
      id: 'spec.astro.redshift', sec: '8.3', level: 2, weight: 2,
      gen(R) {
        const v = R.pick(['lobs', 'z', 'size', 'size', 'T']);
        const LINES = [['Lyman-alpha', 121.6], ['H-alpha', 656.3], ['H-beta', 486.1], ['ionized-oxygen', 500.7], ['magnesium', 280.0]];
        if (v === 'lobs') {
          const z = R.pick([0.1, 0.2, 0.25, 0.5, 1, 1.5, 2, 3, 4, 5, 6]);
          const [nm, l0] = R.pick(LINES);
          const lo = l0 * (1 + z);
          return Object.assign({ q: raw`The ${nm} line, emitted at $${l0}\,\text{nm}$, is observed from a galaxy at redshift $z = ${z}$. At what wavelength is it observed?` },
            GRE.numeric(R, lo, [l0 * z, l0 / (1 + z), l0 * (1 + z) * (1 + z), l0 * (2 + z)], { unit: raw`\text{nm}`, sig: 3, tol: 0.06 }),
            { expl: raw`By definition $1 + z = \lambda_{\text{obs}}/\lambda_{\text{emit}}$, so $\lambda_{\text{obs}} = (1 + ${z})(${l0}\,\text{nm}) = ${F.num(lo, 4)}\,\text{nm}$. Multiplying by $z$ instead of $1+z$ is the classic trap.` });
        }
        if (v === 'z') {
          const k = R.pick([1.5, 2, 2.5, 3, 4, 5, 6, 8, 1.25]);
          const [nm, l0] = R.pick(LINES);
          return Object.assign({ q: raw`A spectral line emitted at $${l0}\,\text{nm}$ is observed at $${F.num(l0 * k, 4)}\,\text{nm}$ in the spectrum of a distant quasar. What is the quasar's redshift $z$?` },
            mcVals(R, k - 1, [k, 1 / k, k + 1, 1 - 1 / k, (k - 1) / 2, 2 * k - 1, k * k - 1], x => `$${F.num(x, 3)}$`),
            { expl: raw`$z = \lambda_{\text{obs}}/\lambda_{\text{emit}} - 1 = ${k} - 1 = ${F.num(k - 1, 3)}$.` });
        }
        if (v === 'size') {
          const z = R.pick([1, 2, 3, 4, 5, 7, 9, 0.5, 1.5]);
          if (R.bool()) return Object.assign({ q: raw`Light from a galaxy at redshift $z = ${z}$ was emitted when distances between widely separated galaxies were what fraction of their present values?` },
            mcVals(R, 1 / (1 + z), [1 / z, z / (1 + z), 1 / (1 + z) ** 2, 1 / Math.sqrt(1 + z), 1 / (z + 2)], x => `$${exactOr(x)}$`),
            { expl: raw`Wavelengths stretch with the scale factor: $1 + z = a_{\text{now}}/a_{\text{then}}$, so distances were $1/(1+z) = ${exactOr(1 / (1 + z))}$ of today's. (At $z = 3$ the universe was $1/4$, not $1/3$, its present size.)` });
          const k = R.pick([2, 3, 4, 5, 10, 11, 100, 1.5]);
          return Object.assign({ q: raw`Light emitted when the universe's scale factor was $1/${k}$ of its present value is received today. What redshift $z$ does it have?` },
            mcVals(R, k - 1, [k, 1 / k, k + 1, k * k, (k - 1) / k], x => `$${F.num(x, 3)}$`),
            { expl: raw`$1 + z = a_0/a = ${k}$, so $z = ${F.num(k - 1, 3)}$.` });
        }
        const T0 = 2.7, z = R.pick([1, 2, 3, 5, 9, 10, 99, 1100, 4, 19]);
        const T = T0 * (1 + z);
        return Object.assign({ q: raw`The cosmic microwave background has a blackbody temperature of $2.7\,\text{K}$ today. What was its temperature at redshift $z = ${z}$?` },
          GRE.numeric(R, T, [T0 * z, T0 / (1 + z), T0 * (1 + z) ** 2, T0 * Math.pow(1 + z, 4)], { unit: raw`\text{K}`, sig: 2, tol: 0.08 }),
          { expl: raw`Photon wavelengths scale as $1 + z$, so by Wien's law $T \propto 1/\lambda$: $T = 2.7(1 + z) = ${F.num(T, 3)}\,\text{K}$.` });
      },
    },
    {
      id: 'spec.astro.hubble', sec: '8.3', level: 2, weight: 2,
      gen(R) {
        const H = R.pick([65, 67, 70, 72, 75, 80]);
        const v = R.pick(['v', 'D', 'z', 'age', 'ratio']);
        const Ht = raw`$H_0 = ${H}\,\text{km/s/Mpc}$`;
        if (v === 'v') {
          const D = R.pick([10, 20, 50, 100, 150, 200, 300, 400, 500]);
          return Object.assign({ q: raw`Using Hubble's law with ${Ht}, what is the recession speed of a galaxy $${D}\,\text{Mpc}$ away?`, level: 1 },
            GRE.numeric(R, H * D, [H / D, D / H * 1000, H * D * 1000, H * D / 2], { unit: raw`\text{km/s}`, sig: 2, tol: 0.2 }),
            { expl: raw`$v = H_0D = ${H} \times ${D} \approx ${F.num(H * D, 2)}\,\text{km/s}$.` });
        }
        if (v === 'D' || v === 'z') {
          const z = R.pick([0.005, 0.01, 0.02, 0.03, 0.04, 0.05]);
          const vel = v === 'z' ? 3e5 * z : R.pick([1400, 3500, 7000, 10500, 14000, 21000]);
          const D = vel / H;
          const stem = v === 'z' ? raw`A galaxy's spectral lines are redshifted by $z = ${z}$. Treating this as a nonrelativistic recession ($v = cz$) and using ${Ht}, the galaxy's distance is closest to`
            : raw`A galaxy recedes at $${vel}\,\text{km/s}$. Using ${Ht}, its distance is closest to`;
          return Object.assign({ q: stem },
            GRE.numeric(R, D, [D * 1000, vel * H / 1e4, D / 2, 2 * D, H / vel * 1e4], { unit: raw`\text{Mpc}`, sig: 2, tol: 0.2 }),
            { expl: raw`${v === 'z' ? raw`$v = cz = (3\times10^5\,\text{km/s})(${z}) = ${F.num(vel, 3)}\,\text{km/s}$; then ` : ''}$D = v/H_0 = ${F.num(vel, 3)}/${H} \approx ${F.num(D, 2)}\,\text{Mpc}$.` });
        }
        if (v === 'age') {
          const t = MPC / 1e3 / H / YR;
          return Object.assign({ q: raw`If the universe had always expanded at its present rate, its age would be the Hubble time $1/H_0$. For ${Ht} ($1\,\text{Mpc} = 3.1\times10^{19}\,\text{km}$), this is closest to`, level: 3 },
            GRE.numeric(R, t, [t / 10, t * 10, t / 1000, t * Math.PI], { unit: raw`\text{years}`, sig: 2, tol: 0.3, fmt: x => F.sci(x, 2) }),
            { expl: raw`$1/H_0 = \dfrac{3.1\times10^{19}\,\text{km}}{${H}\,\text{km/s}} \approx ${F.sci(MPC / 1e3 / H, 2)}\,\text{s} \approx ${F.sci(t, 2)}\,\text{yr}$ — comparable to the actual age, about 14 billion years.` });
        }
        const k = R.pick([2, 3, 4, 5, 10]);
        return Object.assign({ q: raw`Galaxy B is $${k}$ times as far from us as galaxy A. According to Hubble's law, how does B's recession speed compare with A's?`, level: 1 },
          GRE.mc(R, `$${k}$ times as large`, [`$${k * k}$ times as large`, `$1/${k}$ as large`, 'The same', raw`$\sqrt{${k}}$ times as large`, `$1/${k * k}$ as large`]),
          { expl: raw`$v = H_0D$ is linear in distance, so B recedes $${k}$ times as fast.` });
      },
    },
    {
      id: 'spec.astro.star', sec: '8.3', level: 2, weight: 2,
      gen(R) {
        const v = R.pick(['L', 'L', 'R', 'wien', 'wienT']);
        if (v === 'L') {
          const rR = R.pick([0.5, 2, 3, 4, 5, 10, 1, 100]), rT = R.pick([0.5, 2, 3, 1.5, 1, 4]);
          if (rR === 1 && rT === 1) throw new Error('trivial');
          const val = rR * rR * Math.pow(rT, 4);
          const parts = [];
          if (rR !== 1) parts.push(rR > 1 ? `${rR} times the radius` : 'half the radius');
          if (rT !== 1) parts.push(rT > 1 ? `${rT} times the surface temperature` : 'half the surface temperature');
          return Object.assign({ q: `Star X has ${parts.join(' and ')} of star Y${parts.length === 1 ? ' (the other property being equal)' : ''}. Treating both as blackbodies, what is the ratio of X's luminosity to Y's?` },
            mcVals(R, val, [rR * Math.pow(rT, 4), rR * rR * rT * rT, rR * rR * rT, Math.pow(rR, 3) * Math.pow(rT, 4), rR * rR * Math.pow(rT, 2) * 2, val * 2, val / 2, val * 4, val / 4, val * 16, val / 16], x => `$${exactOr(x)}$`),
            { expl: raw`Stefan–Boltzmann: $L = 4\pi R^2\sigma T^4$, so $L_X/L_Y = (${F.num(rR, 2)})^2(${F.num(rT, 2)})^4 = ${exactOr(val)}$.` });
        }
        if (v === 'R') {
          const rT = R.pick([2, 3, 0.5, 4]), rL = R.pick([1, 4, 9, 16, 25, 100, 0.25, 10000]);
          const val = Math.sqrt(rL) / (rT * rT);
          return Object.assign({ q: raw`Star X is ${rL === 1 ? 'exactly as luminous as' : rL + ' times as luminous as'} star Y, but its surface temperature is $${rT > 1 ? rT : '1/2'}$ times Y's. What is the ratio of X's radius to Y's?` },
            mcVals(R, val, [rL / Math.pow(rT, 4), Math.sqrt(rL) / rT, Math.sqrt(rL) * rT * rT, rL / (rT * rT), Math.sqrt(rL) / Math.pow(rT, 4), 2 * val, val / 2], x => `$${exactOr(x)}$`),
            { expl: raw`$R \propto \sqrt{L}/T^2$ from $L = 4\pi R^2\sigma T^4$: ratio $= \sqrt{${rL}}/(${F.num(rT, 2)})^2 = ${exactOr(val)}$.` });
        }
        if (v === 'wien') {
          const T = R.step(2500, 40000, 500);
          const lam = C.wien / T * 1e9;
          return Object.assign({ q: raw`A star's surface temperature is $${T}\,\text{K}$. Using Wien's law ($\lambda_{\max}T = 2.9\times10^{-3}\,\text{m·K}$), at what wavelength does its blackbody spectrum peak?`, level: 1 },
            GRE.numeric(R, lam, [lam * 2, lam / 2, lam * 10, T / 2.9e-3 * 1e-3], { unit: raw`\text{nm}`, sig: 2, tol: 0.2 }),
            { expl: raw`$\lambda_{\max} = 2.9\times10^{-3}/${T}\,\text{m} \approx ${F.num(lam, 2)}\,\text{nm}$. (The Sun, at $\sim 5800\,\text{K}$, peaks near $500\,\text{nm}$.)` });
        }
        const lam = R.step(100, 1200, 10);
        const T = C.wien / (lam * 1e-9);
        return Object.assign({ q: raw`The thermal spectrum of a star peaks at $${lam}\,\text{nm}$. Using $\lambda_{\max}T = 2.9\times10^{-3}\,\text{m·K}$, its surface temperature is closest to`, level: 1 },
          GRE.numeric(R, T, [T * 2, T / 2, T * 10, T / 10], { unit: raw`\text{K}`, sig: 2, tol: 0.2 }),
          { expl: raw`$T = 2.9\times10^{-3}/(${lam}\times10^{-9}) \approx ${F.num(T, 2)}\,\text{K}$.` });
      },
    },
    {
      id: 'spec.astro.compact', sec: '8.3', level: 2, weight: 2,
      gen(R) {
        const v = R.pick(['Rs', 'Rs', 'ratio', 'vesc', 'compress']);
        if (v === 'Rs') {
          const ms = R.pick([1, 2, 3, 5, 8, 10, 15, 20, 30, 50, 4e6, 1e9]);
          const [nm, M] = R.bool(0.2) ? R.pick([['Earth', 6.0e24], ['Jupiter', 1.9e27]]) : [ms === 1 ? 'the Sun' : `an object of ${ms >= 1e6 ? F.sci(ms, 1).replace(/^/, '$').concat('$') : ms} solar masses`, ms * MSUN];
          const Rs = 2 * C.G * M / (C.c * C.c);
          return Object.assign({ q: raw`The Schwarzschild radius $R_s = 2GM/c^2$ of ${nm} ($M = ${F.sci(M, 2)}\,\text{kg}$) is closest to` },
            GRE.numeric(R, Rs, [Rs / 2, C.G * M / C.c, Rs * 1000, Math.sqrt(Rs), Rs / 1000], { unit: raw`\text{m}`, sig: 1, tol: 0.6 }),
            { expl: raw`$R_s = 2GM/c^2 = 2(6.67\times10^{-11})(${F.sci(M, 2)})/(9\times10^{16}) \approx ${F.num(Rs, 2)}\,\text{m}$. Handy rule: about $3\,\text{km}$ per solar mass.` });
        }
        if (v === 'ratio') {
          const fM = R.pick([2, 3, 4, 8, 0.5]), fR = R.pick([2, 4, 0.5, 0.25, 1]);
          const ask = R.pick(['vesc', 'Rs']);
          const val = ask === 'Rs' ? fM : Math.sqrt(fM / fR);
          const what = ask === 'Rs' ? 'Schwarzschild radius' : 'escape speed from its surface';
          return Object.assign({ q: `Object B has ${fM >= 1 ? fM + ' times' : 'half'} the mass of object A${ask === 'vesc' ? ` and ${fR === 1 ? 'the same radius' : (fR >= 1 ? fR + ' times' : F.fracI(1, 1 / fR) + ' of')} the radius` : ''}. What is the ratio of B's ${what} to A's?` },
            mcVals(R, val, [fM / fR, Math.sqrt(fM), fM * fM, Math.sqrt(fM * fR), fR / fM, Math.sqrt(fR / fM)], x => `$${exactOr(x)}$`),
            { expl: ask === 'Rs' ? raw`$R_s = 2GM/c^2$ is linear in $M$: ratio $${exactOr(val)}$.` : raw`$v_{\text{esc}} = \sqrt{2GM/R}$, so the ratio is $\sqrt{${exactOr(fM)}/${exactOr(fR)}} = ${exactOr(val)}$.` });
        }
        if (v === 'vesc') {
          const [nm, M, Rr] = R.pick([['Earth', 6.0e24, 6.4e6], ['the Moon', 7.3e22, 1.74e6], ['Mars', 6.4e23, 3.4e6], ['the Sun', MSUN, 7.0e8], ['a white dwarf of one solar mass and radius 7000 km', MSUN, 7.0e6], ['a neutron star of 1.4 solar masses and radius 12 km', 2.8e30, 1.2e4]]);
          const ve = Math.sqrt(2 * C.G * M / Rr);
          return Object.assign({ q: raw`The escape speed from the surface of ${nm} ($M = ${F.sci(M, 2)}\,\text{kg}$, $R = ${F.sci(Rr, 2)}\,\text{m}$) is closest to` },
            GRE.numeric(R, ve, [ve / Math.SQRT2, 2 * C.G * M / Rr / 1e3, ve * 2, ve / 2], { unit: raw`\text{m/s}`, sig: 2, tol: 0.2 }),
            { expl: raw`Setting $\tfrac12 mv^2 = GMm/R$: $v_{\text{esc}} = \sqrt{2GM/R} \approx ${F.sci(ve, 2)}\,\text{m/s}$. Forgetting the 2 gives the circular-orbit speed.` });
        }
        const M = R.pick([1, 2, 5, 10]) * MSUN;
        const Rs = 2 * C.G * M / (C.c * C.c);
        const k = R.pick([2, 4]);
        const ve = C.c / Math.sqrt(k);
        return Object.assign({ q: raw`A star of mass $${F.sci(M, 2)}\,\text{kg}$ is compressed to a radius $${k}$ times its Schwarzschild radius. Using the Newtonian formula, the escape speed from its surface is`, level: 3 },
          GRE.mc(R, raw`$c/${k === 4 ? '2' : raw`\sqrt{2}`}$`, [raw`$c$`, raw`$c/${k}$`, raw`$c/${k * k}$`, raw`$${k === 4 ? '2' : raw`\sqrt{2}`}\,c$`, raw`$c/${k === 4 ? '8' : raw`2\sqrt{2}`}$`]),
          { expl: raw`$v^2 = 2GM/R$ and $R_s = 2GM/c^2$ give $v^2 = c^2R_s/R = c^2/${k}$, so $v = c/\sqrt{${k}}$ (independent of the mass; $R_s \approx ${F.num(Rs / 1e3, 2)}\,\text{km}$ here). At $R = R_s$ the escape speed reaches $c$.` });
      },
    },
    {
      id: 'spec.astro.orbit', sec: '8.3', level: 2, weight: 2,
      gen(R) {
        const v = R.pick(['units', 'units', 'ratio', 'mass']);
        if (v === 'units') {
          const a = R.pick([1, 4, 9, 16, 0.25, 2, 3, 0.5, 100, 25]), M = R.pick([1, 4, 0.25, 9, 2, 0.5, 16]);
          const T = Math.sqrt(a * a * a / M);
          return Object.assign({ q: raw`An exoplanet orbits a star of $${exactOr(M)}$ solar mass${M === 1 ? '' : 'es'} in a circular orbit of radius $${exactOr(a)}\,\text{AU}$ (the planet's mass is negligible). Its orbital period is` },
            mcVals(R, T, [Math.sqrt(a * a * a * M), Math.sqrt(a * a * a), a * a * a / M, Math.pow(a, 2 / 3) / M, Math.sqrt(a / M)], x => `$${exactOr(x)}\\,\\text{yr}$`),
            { expl: raw`Kepler's third law $T^2 = 4\pi^2a^3/GM$, scaled to Earth's orbit: $T(\text{yr}) = \sqrt{a(\text{AU})^3/M(M_\odot)} = \sqrt{${a === Math.round(a) ? a : '(' + exactOr(a) + ')'}^3/${exactOr(M)}} = ${exactOr(T)}\,\text{yr}$. A heavier star gives a <i>shorter</i> period.` });
        }
        if (v === 'ratio') {
          const k = R.pick([4, 9, 16, 1.0 / 4, 2]);
          const val = Math.pow(k, 1.5);
          return Object.assign({ q: raw`Two planets orbit the same star in circular orbits. Planet B's orbital radius is $${exactOr(k)}$ times planet A's. What is the ratio of B's orbital period to A's?`, level: 1 },
            mcVals(R, val, [k, k * k, Math.pow(k, 2 / 3), Math.sqrt(k), k * k * k], x => `$${exactOr(x)}$`),
            { expl: raw`$T \propto a^{3/2}$: ratio $= ${exactOr(k)}^{3/2} = ${exactOr(val)}$.` });
        }
        const aAU = R.pick([0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 5]), Ms = R.pick([0.3, 0.5, 0.8, 1, 1.5, 2, 3, 5]);
        const a = aAU * 1.5e11;
        const Td = +(2 * Math.PI * Math.sqrt(a * a * a / (C.G * Ms * MSUN)) / 86400).toPrecision(2), T = Td * 86400;
        const M = 4 * Math.PI * Math.PI * a * a * a / (C.G * T * T);
        return Object.assign({ q: raw`A planet circles a star once every $${Td}$ days at a distance of $${F.sci(a, 2)}\,\text{m}$. The star's mass is closest to`, level: 3 },
          GRE.numeric(R, M, [M / (4 * Math.PI * Math.PI), M / (2 * Math.PI), M / 1000, M * 1000], { unit: raw`\text{kg}`, sig: 1, tol: 0.4 }),
          { expl: raw`$GM = 4\pi^2a^3/T^2$ with $T = ${Td}\times86400\,\text{s}$: $M \approx ${F.sci(M, 2)}\,\text{kg}$ ($\approx ${F.num(M / MSUN, 2)}\,M_\odot$).` });
      },
    },
    {
      id: 'spec.astro.rotation', sec: '8.3', level: 2,
      gen(R) {
        const v = R.pick(['mass', 'kep', 'num', 'rho']);
        const k = R.pick([2, 3, 4, 5, 10]);
        if (v === 'mass') return Object.assign({ q: raw`The rotation curve of a spiral galaxy is flat: stars orbit at the same speed at all radii well beyond the visible disk. How does the mass enclosed within radius $${k}r_0$ compare with that within $r_0$?` },
          mcVals(R, k, [1, k * k, Math.sqrt(k), 1 / k, k * k * k], x => `$${exactOr(x)}$ times`),
          { expl: raw`For circular orbits $v^2 = GM(r)/r$, so constant $v$ means $M(r) \propto r$: $${k}$ times as much mass. Since little light comes from there, this is evidence for dark matter (density $\propto 1/r^2$).` });
        if (v === 'kep') return Object.assign({ q: raw`If nearly all of a galaxy's mass were concentrated in its bright central region, how would the orbital speed of a star at $${k}r_0$ compare with one at $r_0$ (both well outside the central region)?` },
          mcVals(R, 1 / Math.sqrt(k), [1, 1 / k, Math.sqrt(k), 1 / (k * k), k], x => `$${exactOr(x)}$ times`),
          { expl: raw`Outside a central mass $v = \sqrt{GM/r} \propto r^{-1/2}$: factor $1/\sqrt{${k}}$. Observed curves stay flat instead — the classic evidence for dark matter.` });
        if (v === 'rho') return Object.assign({ q: raw`A galaxy's dark-matter halo produces a flat rotation curve, $v(r) = \text{const}$. How must the halo's mass density depend on $r$?`, level: 3 },
          GRE.mc(R, raw`$\rho \propto r^{-2}$`, [raw`$\rho \propto r^{-1}$`, raw`$\rho \propto r^{-3}$`, raw`$\rho = \text{const}$`, raw`$\rho \propto r^{-1/2}$`, raw`$\rho \propto r$`]),
          { expl: raw`$M(r) = v^2r/G \propto r$, and $dM/dr = 4\pi r^2\rho$ is constant, so $\rho \propto 1/r^2$.` });
        const vv = R.step(120, 320, 10), rk = R.pick([3, 5, 8, 10, 12, 15, 20, 25, 30, 40]);
        const r = rk * 3.09e19;
        const M = (vv * 1e3) ** 2 * r / C.G;
        return Object.assign({ q: raw`Stars orbit a galaxy's center at $${vv}\,\text{km/s}$ at a radius of $${rk}\,\text{kpc}$ ($1\,\text{kpc} = 3.1\times10^{19}\,\text{m}$). The mass enclosed within that radius is closest to`, level: 3 },
          GRE.numeric(R, M / MSUN, [M / MSUN / 1000, M / MSUN * 1000, M / MSUN / 2, (vv * 1e3) * r / C.G / MSUN], { unit: raw`M_\odot`, sig: 1, tol: 0.6, fmt: x => F.sci(x, 1) }),
          { expl: raw`$M = v^2r/G = (${vv}\times10^3)^2(${rk}\times3.1\times10^{19})/(6.67\times10^{-11}) \approx ${F.sci(M, 2)}\,\text{kg} \approx ${F.sci(M / MSUN, 1)}\,M_\odot$ (with $M_\odot = 2\times10^{30}\,\text{kg}$).` });
      },
    },
    {
      id: 'spec.astro.cosmo', sec: '8.3', level: 1, weight: 2,
      gen(R) {
        const TRUE = [
          ['Cosmological redshift arises from the expansion of space, not from a Doppler shift of moving sources.', 'photon wavelengths stretch with the scale factor.'],
          ['Gravitationally bound systems such as the solar system do not expand with the universe.', 'the expanding metric applies only on large scales.'],
          ['The cosmic microwave background has an almost perfect blackbody spectrum at about $2.7\\,\\text{K}$.', 'deviations are about one part in $10^5$.'],
          ['The CMB photons last scattered roughly 380,000 years after the Big Bang, at about $3000\\,\\text{K}$.', 'that is the epoch of recombination.'],
          ['The extreme uniformity of the CMB temperature is explained by inflation.', 'inflation smoothed out early inhomogeneities.'],
          ['Galaxy rotation curves indicate more mass than is visible.', 'flat curves need extra (dark) mass.'],
          ['Dark matter cannot carry more than a tiny electric charge.', 'otherwise it would emit or scatter light.'],
          ['The total mass of dark matter is more than five times that of ordinary matter.', 'as inferred from the CMB and large-scale structure.'],
          ['Collisions of galaxy clusters such as the Bullet Cluster provide evidence for dark matter.', 'the gravitating mass is offset from the hot gas.'],
          ['A galaxy twice as far away recedes twice as fast, on average.', 'that is Hubble’s law, $v = H_0D$.'],
          ['The Hubble parameter changes with time.', 'calling it a “constant” is misleading.'],
          ['Weakly interacting massive particles (WIMPs) are a popular dark-matter candidate.', 'they would interact only weakly and gravitationally.'],
        ];
        const FALSE = [
          ['The solar system is expanding at the Hubble rate.', 'bound systems do not expand.'],
          ['Cosmological redshift is a Doppler shift caused by galaxies moving through space.', 'it is due to the expansion of space itself.'],
          ['Dark matter has been directly detected in laboratory experiments on Earth.', 'it has not yet been directly detected.'],
          ['Dark matter is ordinary gas that is too cold to glow.', 'it is non-luminous, non-baryonic matter.'],
          ['The CMB temperature is about $300\\,\\text{K}$.', 'it is about $2.7\\,\\text{K}$.'],
          ['A galaxy at redshift $z = 3$ emitted its light when the universe was one-third its present size.', 'it was one-fourth: $1/(1+z)$.'],
          ['Galaxy rotation speeds fall off as $r^{-1/2}$ far from the center, exactly as expected from the visible mass.', 'observed curves are flat.'],
          ['The Hubble parameter has had the same value at all times.', 'it changes with time.'],
          ['Ordinary matter outweighs dark matter by about five to one.', 'it is the reverse.'],
          ['Dark matter must interact via the strong nuclear force.', 'it is thought to interact at most weakly.'],
        ];
        if (R.bool(0.55)) return romanQ(R, 'Which of the following statements about cosmology and dark matter is (are) true?', TRUE, FALSE);
        const neg = R.bool(0.35);
        return factQ(R, neg ? 'Which of the following statements about the expanding universe and dark matter is FALSE?' : 'Which of the following statements about the expanding universe and dark matter is true?', TRUE.map(x => [x[0], cap(x[1])]), FALSE.map(x => [x[0], cap(x[1])]), neg);
      },
    },
  ]);

  // ================================================================== 8.4 recent Nobel prizes
  GRE.addTemplates('spec', [
    {
      id: 'spec.nobel.concepts', sec: '8.4', level: 2,
      gen(R) {
        const T = [
          ['The 2011 Nobel Prize recognized the discovery that the expansion of the universe is accelerating. In terms of the scale factor $a(t)$, this means', raw`$\ddot{a} > 0$`, [raw`$\dot{a} < 0$`, raw`$\ddot{a} < 0$`, raw`$a$ is constant`, raw`$\dot{a} = 0$`, raw`$\dot{a} > 0$ but $\ddot{a} = 0$`], 'Expansion means $\\dot{a} > 0$; acceleration means $\\ddot{a} > 0$.'],
          ['Electrons in graphene (2010 Nobel Prize) behave like massless particles. Their dispersion relation near the relevant points has the form', raw`$\omega \propto k$`, [raw`$\omega \propto k^2$`, raw`$\omega \propto \sqrt{k}$`, raw`$\omega$ independent of $k$`, raw`$\omega \propto k^3$`, raw`$\omega \propto 1/k$`], 'Massless particles have a linear dispersion $\\omega \\propto k$, unlike massive ones with $\\omega \\propto k^2$.'],
          ['Graphene, isolated in work recognized by the 2010 Nobel Prize, is', 'a single layer of carbon atoms arranged in a hexagonal lattice', ['a three-dimensional cubic crystal of carbon', 'a single layer of silicon atoms in a square lattice', 'a hollow spherical carbon molecule', 'a high-temperature superconducting ceramic', 'a stack of many carbon layers held by covalent bonds'], 'Graphene is one atom thick: a hexagonal (honeycomb) sheet of carbon; graphite is many stacked graphene layers.'],
          ['According to the 2008 Nobel Prize work on spontaneous symmetry breaking, when the ground state of a system does not respect a continuous symmetry of the theory, there appears', 'a massless scalar Nambu–Goldstone boson', ['a massive spin-2 boson', 'a massless spin-1/2 fermion', 'a magnetic monopole', 'a new conserved charge', 'an infinitely heavy scalar particle'], 'Spontaneous breaking of a continuous symmetry gives a massless scalar Nambu–Goldstone boson (in a gauge theory, it becomes part of the massive gauge boson via the Higgs mechanism).'],
          ['Part of the 2008 Nobel Prize recognized the result that CP violation in the Standard Model requires at least how many families (generations) of quarks?', '3', ['1', '2', '4', '6'], 'Kobayashi and Maskawa showed that CP violation needs at least three quark families.'],
          ['The Higgs mechanism (2013 Nobel Prize) gives mass to the $W$ and $Z$ bosons through', 'the nonzero vacuum expectation value of the Higgs field', ['the exchange of gluons', 'their electric charge', 'their interaction with the cosmic microwave background', 'the strong coupling to the top quark', 'an explicit mass term added by hand'], 'The $W$ and $Z$ start massless and acquire mass from the Higgs field’s constant, nonzero vacuum value; adding masses by hand gives inconsistencies.'],
          ['The 2006 Nobel Prize concerned the cosmic microwave background. Its tiny deviations from a perfect blackbody (about one part in $10^5$) are interpreted as', 'density perturbations in the early universe that seeded galaxies', ['instrumental noise from the detectors', 'Doppler shifts due to Earth’s orbit only', 'radiation from nearby stars', 'evidence that the universe is contracting', 'emission from dark matter particles'], 'CMB anisotropies trace primordial density perturbations, correlated with today’s large-scale structure.'],
          ['Dark energy, implied by the accelerating expansion (2011 Nobel Prize), is most commonly modeled as a cosmological constant. Such an energy density', 'has negative pressure and does not dilute as the universe expands', ['dilutes like ordinary matter as $a^{-3}$', 'dilutes like radiation as $a^{-4}$', 'has positive pressure like a hot gas', 'is concentrated in galaxy halos', 'is made of weakly interacting massive particles'], 'A cosmological constant is a homogeneous energy density with negative pressure, constant in time — it comes to dominate as matter dilutes.'],
          ['The 2012 Nobel Prize recognized methods to measure quantum systems without destroying them. In one scheme the number of photons in a cavity is determined by', 'measuring the phase shift of atoms sent through the cavity', ['absorbing the photons in a photodiode', 'weighing the cavity mirrors', 'heating the cavity and measuring its temperature', 'counting the photons that leak out', 'measuring the cavity’s electrical resistance'], 'The photon number is encoded in the phase of atoms crossing the cavity; measuring the atoms leaves the photons in place.'],
          ['Optical fibers (2009 Nobel Prize) guide light over long distances by means of', 'total internal reflection', ['diffraction', 'the photoelectric effect', 'stimulated emission', 'Rayleigh scattering', 'the Meissner effect'], 'Light in the higher-index core hits the cladding beyond the critical angle and is totally internally reflected.'],
        ];
        const [q, c, w, why] = R.pick(T);
        return Object.assign({ q }, GRE.mc(R, c, w), { expl: why });
      },
    },
    {
      id: 'spec.nobel.roman', sec: '8.4', level: 2,
      gen(R) {
        const TRUE = [
          ['The Higgs boson couples most strongly to the top quark.', 'its coupling is proportional to mass.'],
          ['The accelerating expansion of the universe implies that dark energy dominates today’s energy density.', 'dark energy, not matter or dark matter, is the main component today.'],
          ['Graphene is a single sheet of carbon atoms one atom thick.', 'it was first isolated with sticky tape.'],
          ['Decoherence by the environment tends to destroy quantum superpositions.', 'this is why the 2012-prize experiments cool and trap single atoms or photons.'],
          ['After recombination the CMB photons travel essentially freely.', 'they last scattered about 380,000 years after the Big Bang.'],
          ['Spontaneous breaking of a continuous symmetry produces a massless scalar boson.', 'the Nambu–Goldstone boson.'],
        ];
        const FALSE = [
          ['The $W$ and $Z$ bosons are massless, like the photon.', 'they are massive, via the Higgs mechanism.'],
          ['Graphene electrons have a quadratic dispersion $\\omega \\propto k^2$.', 'the dispersion is linear.'],
          ['The expansion of the universe is slowing down.', 'it is accelerating.'],
          ['The CMB was emitted at a temperature of about $2.7\\,\\text{K}$.', 'it was about $3000\\,\\text{K}$ then and has been redshifted to $2.7\\,\\text{K}$.'],
          ['CP violation is possible with only two quark families.', 'at least three are needed.'],
          ['A cosmological constant dilutes as the universe expands.', 'its energy density stays constant.'],
        ];
        return romanQ(R, 'Which of the following statements, related to recent Nobel Prizes in physics, is (are) true?', TRUE, FALSE);
      },
    },
  ]);

})(typeof window !== 'undefined' ? window.GRE : this.GRE);
