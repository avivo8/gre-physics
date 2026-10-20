/* Thermodynamics and Statistical Mechanics — Chapter 4 of Conquering the Physics GRE.
 * Templates follow the conventions in tools/AUTHORING.md.
 */
(function (GRE) {
  'use strict';
  const F = GRE.fmt;
  const raw = String.raw;
  const C = GRE.C;
  const L = []; // templates, registered at the end of the file

  // ------------------------------------------------------------------ helpers
  const ROM = ['I', 'II', 'III'];
  const close = (a, b) => Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b));
  /** exact TeX for a number (fraction / surd) or a 3-significant-figure decimal */
  /** F.exact, but refusing tiny values (which it can only approximate) */
  const exq = x => { if (x !== 0 && Math.abs(x) < 1e-3) return null; const e = F.exact(x); return e != null && !/\\sqrt\[3\]\{0/.test(e) ? e : null; };
  const fx = x => { const e = exq(x); return e != null ? e : F.num(x, 3); };
  /** coefficient times a symbol: (1,'k_BT') -> 'k_BT', (1.5,'k_BT') -> '\frac{3}{2}\,k_BT' */
  const cs = (x, sym) => {
    if (Math.abs(x) < 1e-12) return '0';
    if (!sym) return fx(x);
    if (close(x, 1)) return sym;
    if (close(x, -1)) return '-' + sym;
    return fx(x) + '\\,' + sym;
  };
  /** fraction n/d times a symbol */
  const fs = (n, d, sym) => {
    const f = F.frac(n, d);
    if (!sym) return f;
    if (f === '0') return '0';
    if (f === '1') return sym;
    if (f === '-1') return '-' + sym;
    return f + '\\,' + sym;
  };
  /**
   * Multiple choice from [tex, value] pairs (tex without $). Wrong answers whose value equals
   * the correct value or an earlier choice are dropped, so no two choices are equivalent.
   * Choices are ordered by value unless opts.shuffle.
   */
  function valMC(R, c, wrongs, opts = {}) {
    const val = new Map();
    const mk = ([t, v]) => { const s = `$${t}$`; val.set(s, v); return s; };
    const ct = mk(c);
    const vs = [c[1]];
    const ws = [];
    for (const w of wrongs) {
      if (!w || w[0] == null || !isFinite(w[1])) continue;
      if (opts.positive && w[1] <= 0) continue;
      if (vs.some(v => close(v, w[1]))) continue;
      vs.push(w[1]);
      ws.push(mk(w));
    }
    return GRE.mc(R, ct, ws, opts.shuffle ? {} : { rank: t => val.get(t) });
  }
  /** numbers (optionally times a symbol) written exactly, ordered by value */
  const PAD = [2, 1 / 2, 3, 1 / 3, 3 / 2, 2 / 3, 4, 1 / 4];
  const exactMC = (R, correct, wrongs, sym, opts = {}) => {
    const ex = exq(correct) != null; // if the answer is exact, show only exact distractors
    const ok = w => w != null && isFinite(w) && !(ex && exq(w) == null) && !(opts.max != null && w > opts.max);
    // plausible mistakes first, then simple multiples of the answer as a fallback
    const all = wrongs.filter(ok).concat(close(correct, 0) ? [] : PAD.map(f => correct * f).filter(ok));
    const uniq = [];
    for (const w of all) if (!close(w, correct) && uniq.every(u => !close(u, w))) uniq.push(w);
    const nMist = wrongs.filter(ok).filter(w => !close(w, correct)).length;
    const list = nMist >= 4 ? uniq.slice(0, Math.max(nMist, 4)) : uniq.slice(0, Math.max(4, nMist));
    return valMC(R, [cs(correct, sym), correct], list.map(w => [cs(w, sym), w]), opts);
  };
  /** fractions [n, d] (optionally times a symbol), ordered by value */
  const fracMC = (R, c, wrongs, sym, opts = {}) => {
    const ok = w => w && w[1] !== 0 && !(opts.max != null && w[0] / w[1] > opts.max);
    const pad = c[0] === 0 ? [] : [[2, 1], [1, 2], [3, 2], [2, 3], [3, 1], [1, 3], [4, 1], [1, 4]].map(([a, b]) => [c[0] * a, c[1] * b]);
    const mist = wrongs.filter(ok);
    const distinct = mist.filter((w, i) => !close(w[0] / w[1], c[0] / c[1]) && mist.findIndex(u => close(u[0] / u[1], w[0] / w[1])) === i).length;
    const list = distinct >= 4 ? mist : mist.concat(pad.filter(ok));
    return valMC(R, [fs(c[0], c[1], sym), c[0] / c[1]], list.map(w => [fs(w[0], w[1], sym), w[0] / w[1]]), opts);
  };
  /** plain symbolic choices (TeX without $), shuffled */
  const symMC = (R, correct, wrongs, opts) => GRE.mc(R, `$${correct}$`, wrongs.map(w => `$${w}$`), opts);
  /** text choices, shuffled */
  const txtMC = (R, correct, wrongs, opts) => GRE.mc(R, correct, wrongs, opts);
  /**
   * Roman-numeral question from pools of [statement, reason] pairs.
   * Returns {q, choices, ans, expl}.
   */
  function romanQ(R, intro, trues, falses, lead) {
    const nT = R.weighted([1, 2, 3], [4, 4, 2]);
    const nt = Math.min(nT, trues.length), nf = 3 - nt;
    if (falses.length < nf) throw new Error('romanQ: not enough false statements');
    const st = R.shuffle(R.pickN(trues, nt).map(s => [s, true]).concat(R.pickN(falses, nf).map(s => [s, false])));
    const why = st.map((x, i) => `${ROM[i]} is ${x[1] ? 'true' : 'false'}: ${x[0][1]}`).join(' ');
    return {
      q: GRE.romanStem(intro, st.map(x => x[0][0])),
      ...GRE.roman(R, st.map(x => x[1])),
      expl: (lead ? lead + ' ' : '') + why,
    };
  }
  const binom = (n, k) => { if (k < 0 || k > n) return 0; let r = 1; for (let i = 1; i <= k; i++) r = r * (n - k + i) / i; return Math.round(r); };
  const fact = n => { let r = 1; for (let i = 2; i <= n; i++) r *= i; return r; };
  const LN = { 2: '0.69', 3: '1.10', 4: '1.39', 5: '1.61', 10: '2.30' };
  const lnHint = r => `(Use $\\ln ${r} \\approx ${LN[r]}$.)`;
  const degTxt = g => (g === 1 ? 'nondegenerate' : `${g}-fold degenerate`);
  /** temperature in kelvin, optionally written in degrees Celsius */
  /** x^p as TeX with parentheses around fractions; p a number; '' power omitted for p = 1 */
  const powTex = (x, p) => { const b = fx(x); const bb = /frac|sqrt/.test(b) ? `\\left(${b}\\right)` : b; return close(p, 1) ? bb : `${bb}^{${F.fracI(Math.round(p * 4), 4)}}`; };
  const celsius = K => `${K - 273}^\\circ\\text{C}`;

  // ================================================================== 4.1.1 Ensembles and the partition function
  // rational p/q as TeX, using 10^{-k} for tiny powers of ten
  const pq = (p, q) => {
    const g = F.gcd(p, q) || 1; p /= g; q /= g;
    if (p === 1 && q >= 1e5 && Math.abs(Math.log10(q) - Math.round(Math.log10(q))) < 1e-9) return `10^{-${Math.round(Math.log10(q))}}`;
    return F.frac(p, q);
  };
  L.push({
    id: 'thermo.boltz.ratio', sec: '4.1.1', level: 1, weight: 2,
    gen(R) {
      const v = R.weighted(['deg', 'temp', 'scale'], [3, 2, 2]);
      if (v === 'deg') {
        const a = R.pick([0.5, 1, 1.5, 2, 2.5, 3, 4, 5]);
        const gl = R.int(1, 4), gu = R.int(1, 6);
        const [sys, short] = R.pick([['atoms in a dilute gas', 'atoms'], ['impurity ions in a crystal', 'ions'], ['molecules in a gas cell', 'molecules'], ['nuclei in a sample', 'nuclei']]);
        const inv = R.bool(0.3);
        const r = gu / gl * Math.exp(-a);
        const f = x => (inv ? 1 / x : x);
        const ch = GRE.numeric(R, f(r), [f(Math.exp(-a)), f(gl / gu * Math.exp(-a)), f(gu / gl * Math.exp(a)), f(gu / gl * Math.exp(-a / 2)), f(gu / gl * Math.exp(-2 * a))]);
        const aT = a === 1 ? 'k_BT' : `${a}\\,k_BT`;
        return {
          q: raw`A collection of ${sys} is in thermal equilibrium at temperature $T$. Each has a lower energy level that is ${degTxt(gl)} and an upper level, a height $\Delta E = ${aT}$ above it, that is ${degTxt(gu)}. The ratio of the number of ${short} in the ${inv ? 'lower' : 'upper'} level to the number in the ${inv ? 'upper' : 'lower'} level is closest to`,
          ...ch,
          expl: raw`Each level's population is (number of states) $\times$ (Boltzmann factor): $N_u/N_l = (g_u/g_l)\,e^{-\Delta E/k_BT} = (${gu}/${gl})\,e^{-${a}} \approx ${F.num(r, 2)}$${inv ? raw`, so $N_l/N_u \approx ${F.num(1 / r, 2)}$` : ''}. Forgetting the degeneracies is the usual trap.`,
        };
      }
      if (v === 'temp') {
        const dE = R.pick([0.01, 0.02, 0.03, 0.05, 0.1, 0.2, 0.3, 0.5, 1, 2]);
        const m = R.pick([1, 2, 3, 4, 5, 10]);
        const k = C.kB_eVK;
        const T = dE / (m * k);
        const ch = GRE.numeric(R, T, [dE / k, m * dE / k, dE / (2 * m * k), 2 * dE / (m * k)], { unit: raw`\text{K}` });
        return {
          q: raw`Two nondegenerate energy levels of a system are separated by $${F.num(dE)}\,\text{eV}$. At what temperature is the population of the upper level equal to $e^{-${m}}$ times that of the lower level? (Take $k_B \approx 8.6\times 10^{-5}\,\text{eV/K}$.)`,
          ...ch,
          expl: raw`$N_2/N_1 = e^{-\Delta E/k_BT} = e^{-${m}}$ requires $k_BT = \Delta E/${m}$, so $T = \Delta E/(${m}k_B) = ${F.num(dE)}/(${m}\times 8.6\times10^{-5}) \approx ${F.num(T, 2)}\,\text{K}$.`,
        };
      }
      // scale: how a population ratio changes with temperature
      const combos = [];
      for (const b of [2, 3, 4, 5, 10]) for (const j of [2, 3, 4, 6]) for (const [fN, fD] of [[2, 1], [3, 1], [4, 1], [1, 2], [1, 3], [3, 2], [2, 3]]) {
        const k = j * fD / fN;
        if (Math.abs(k - Math.round(k)) > 1e-9 || k < 1) continue;
        if (Math.pow(b, Math.max(j, k)) > (b === 10 ? 1e12 : 1e6)) continue;
        combos.push([b, j, fN, fD, Math.round(k)]);
      }
      const [b, j, fN, fD, k] = R.pick(combos);
      const q1 = Math.pow(b, j);
      const W = [];
      const kInv = j * fN / fD;
      if (Math.abs(kInv - Math.round(kInv)) < 1e-9 && Math.pow(b, kInv) <= 1e12) W.push([1, Math.pow(b, Math.round(kInv))]);
      W.push([1, q1]);
      if (fN / (fD * q1) < 1) W.push([fN, fD * q1]);
      W.push([fD, fN * q1]);
      W.push([1, Math.pow(b, k + 1)]);
      if (k > 1) W.push([1, Math.pow(b, k - 1)]);
      const val = new Map();
      const mk = ([p, q]) => { const t = `$${pq(p, q)}$`; val.set(t, p / q); return t; };
      const c = mk([1, Math.pow(b, k)]);
      const ws = W.filter(w => !close(w[0] / w[1], 1 / Math.pow(b, k))).map(mk);
      const Tf = F.frac(fN, fD);
      return {
        q: raw`A system with two nondegenerate energy levels is in equilibrium at temperature $T_1$, where the ratio of the upper-level population to the lower-level population is $${pq(1, q1)}$. The temperature is changed to $${Tf === '1' ? '' : Tf}\,T_1$. What is the new ratio?`,
        ...GRE.mc(R, c, ws, { rank: t => val.get(t) }),
        expl: raw`The ratio is $e^{-\Delta E/k_BT}$, so its logarithm scales as $1/T$: $r_2 = r_1^{\,T_1/T_2} = (${pq(1, q1)})^{${F.fracI(fD, fN)}} = ${pq(1, Math.pow(b, k))}$. The ratio is not linear in $T$.`,
      };
    },
  });

  L.push({
    id: 'thermo.twolevel.symbolic', sec: '4.1.1', level: 2,
    gen(R) {
      const a = R.int(-3, 2), b = R.int(a + 1, 3), d = b - a;
      const deg = R.bool(0.45);
      const ga = deg ? R.int(1, 3) : 1, gb = deg ? R.int(1, 3) : 1;
      if (deg && ga === gb) throw new Error('retry');
      if (!deg && a === -1 && b === 2) throw new Error('retry'); // avoid duplicating a book review problem
      const E = s => cs(s, '\\varepsilon');
      const X = `${d === 1 ? '' : d}\\varepsilon/k_BT`;
      const co = g => (g === 1 ? '' : String(g));
      const P = (num, oth, sg) => (num === oth ? `\\dfrac{1}{1 + e^{${sg}${X}}}` : `\\dfrac{${num}}{${num} + ${co(oth)}e^{${sg}${X}}}`);
      const ask = R.weighted(['up', 'low', 'Ehigh', 'Elow'], [3, 2, 2, 1]);
      const degS = deg ? raw`, with degeneracies $g_1 = ${ga}$ and $g_2 = ${gb}$` : ', both nondegenerate';
      const stem = raw`A system has two energy levels, $E_1 = ${E(a)}$ and $E_2 = ${E(b)}$, where $\varepsilon > 0$${degS}. It is in thermal equilibrium with a reservoir at temperature $T$. `;
      if (ask === 'up' || ask === 'low') {
        const up = ask === 'up';
        const corr = up ? P(gb, ga, '') : P(ga, gb, '-');
        const wr = up
          ? [P(gb, ga, '-'), P(ga, gb, '-'), `${co(gb)}e^{-${X}}`, gb === ga ? `\\dfrac{1}{e^{${X}} - 1}` : `\\dfrac{${gb}}{${co(ga)}e^{${X}} - ${gb}}`, `\\dfrac{${gb}}{${ga + gb}}`]
          : [P(ga, gb, ''), P(gb, ga, ''), `1 - e^{-${X}}`, ga === gb ? `\\dfrac{1}{1 - e^{-${X}}}` : `\\dfrac{${ga}}{${ga} - ${co(gb)}e^{-${X}}}`, `\\dfrac{${ga}}{${ga + gb}}`];
        if (!deg && a !== 0 && b > 0 && up) wr.push(`\\dfrac{1}{1 + e^{${b === 1 ? '' : b}\\varepsilon/k_BT}}`);
        return {
          q: stem + `What is the probability that the system is found in the ${up ? 'upper' : 'lower'} level (energy $${up ? E(b) : E(a)}$)?`,
          ...symMC(R, corr, wr),
          expl: raw`Only the energy difference $\Delta = ${E(d)}$ matters. $P_2/P_1 = (g_2/g_1)e^{-\Delta/k_BT}$, so $P_${up ? 2 : 1} = ${corr}$. Check: it tends to ${up ? `$${F.frac(gb, ga + gb)}$` : `$${F.frac(ga, ga + gb)}$`} as $T\to\infty$ and to ${up ? '0' : '1'} as $T \to 0$.`,
        };
      }
      if (ask === 'Ehigh') {
        const c = (ga * a + gb * b) / (ga + gb);
        return {
          q: stem + 'What is the average energy of the system in the limit $T \\to \\infty$?',
          ...exactMC(R, c, [(a + b) / 2, a, b, 0, (gb * a + ga * b) / (ga + gb), a + b], '\\varepsilon'),
          expl: raw`As $T\to\infty$ every state (not every level) becomes equally likely, so $\langle E\rangle \to \dfrac{g_1E_1 + g_2E_2}{g_1 + g_2} = ${E(c)}$.`,
        };
      }
      return {
        q: stem + 'What is the average energy of the system in the limit $T \\to 0$?',
        ...exactMC(R, a, [b, (a + b) / 2, (ga * a + gb * b) / (ga + gb), 0, -a, a + b], '\\varepsilon'),
        expl: raw`As $T \to 0$ the Boltzmann factor of the upper level relative to the lower, $e^{-\Delta/k_BT}$, vanishes, so the system sits in the lower level: $\langle E\rangle \to ${E(a)}$.`,
      };
    },
  });

  L.push({
    id: 'thermo.nlevel.prob', sec: '4.1.1', level: 2, weight: 2,
    gen(R) {
      const nL = R.int(2, 4);
      const ns = R.pickN([0, 1, 2, 3], nL).sort((x, y) => x - y);
      const shift = R.pick([0, 0, 0, -1]);
      const gs = ns.map(() => R.pick([1, 1, 2, 3]));
      const q = R.pick([2, 3]);
      const N = ns[nL - 1];
      const W = ns.map((n, i) => gs[i] * Math.pow(q, N - n));
      const Z = W.reduce((s, w) => s + w, 0);
      const W0 = ns.map(n => Math.pow(q, N - n)), Z0 = W0.reduce((s, w) => s + w, 0);
      const G = gs.reduce((s, g) => s + g, 0);
      const allOne = gs.every(g => g === 1);
      const Etex = n => cs(n + shift, '\\varepsilon');
      const lev = ns.map(n => `$${Etex(n)}$`).join(', ');
      const degs = allOne ? 'all nondegenerate' : `with degeneracies ${gs.join(', ')}, respectively`;
      const stem = raw`A system has energy levels ${lev} (${degs}). It is in equilibrium at a temperature $T$ for which $e^{-\varepsilon/k_BT} = ${F.frac(1, q)}$. `;
      const ask = R.weighted(['prob', 'ratio', 'avg'], [3, 2, 2]);
      if (ask === 'prob') {
        const j = R.int(0, nL - 1);
        const wr = [[W0[j], Z0], [gs[j], G], [gs[j], Math.pow(q, ns[j])], [gs[j] * Math.pow(q, ns[j]), ns.reduce((s, n, i) => s + gs[i] * Math.pow(q, n), 0)], [1, G], [W[j] / gs[j], Z]];
        if (j > 0) wr.push([W[j - 1], Z]);
        if (j < nL - 1) wr.push([W[j + 1], Z]);
        return {
          q: stem + `What is the probability that the system has energy $${Etex(ns[j])}$?`,
          ...fracMC(R, [W[j], Z], wr, '', { max: 1 }),
          expl: raw`Relative weights $g_i e^{-E_i/k_BT}$ (measured from the top level, in units of $(1/${q})^{${N}}$): ${W.join(', ')}; their sum is ${Z}. So $P = ${W[j]}/${Z} = ${F.frac(W[j], Z)}$. Don't forget the degeneracy factors.`,
        };
      }
      if (ask === 'ratio') {
        const [i, j] = R.pickN([...Array(nL).keys()], 2);
        const c = [W[i], W[j]];
        const wr = [[W[j], W[i]], [W0[i], W0[j]], [gs[i], gs[j]], [gs[i] * Math.pow(q, ns[i]), gs[j] * Math.pow(q, ns[j])], [W[i], Z], [gs[j] * Math.pow(q, ns[i]), gs[i] * Math.pow(q, ns[j])]];
        return {
          q: stem + `What is the ratio of the probability of finding the system with energy $${Etex(ns[i])}$ to that of finding it with energy $${Etex(ns[j])}$?`,
          ...fracMC(R, c, wr),
          expl: raw`$\dfrac{P_i}{P_j} = \dfrac{g_i}{g_j}\,e^{-(E_i - E_j)/k_BT} = \dfrac{${gs[i]}}{${gs[j]}}\,(${q})^{${ns[j] - ns[i]}} = ${F.frac(W[i], W[j])}$. The partition function cancels in a ratio.`,
        };
      }
      const num = ns.reduce((s, n, i) => s + (n + shift) * W[i], 0);
      const wr = [
        [ns.reduce((s, n, i) => s + (n + shift) * W0[i], 0), Z0],
        [ns.reduce((s, n, i) => s + (n + shift) * gs[i], 0), G],
        [ns.reduce((s, n) => s + n + shift, 0), nL],
        [ns[0] + shift, 1],
        [ns.reduce((s, n, i) => s + (n + shift) * gs[i] * Math.pow(q, n), 0), ns.reduce((s, n, i) => s + gs[i] * Math.pow(q, n), 0)],
        [num, Z * q],
      ];
      return {
        q: stem + 'What is the average energy of the system?',
        level: 3,
        ...fracMC(R, [num, Z], wr, '\\varepsilon'),
        expl: raw`$\langle E\rangle = \sum_i E_i g_i e^{-E_i/k_BT}\big/\sum_i g_i e^{-E_i/k_BT}$. With relative weights ${W.join(', ')} (sum ${Z}), $\langle E\rangle = ${fs(num, Z, '\\varepsilon')}$.`,
      };
    },
  });

  L.push({
    id: 'thermo.partition.avgE', sec: '4.1.1', level: 2, weight: 2,
    gen(R) {
      const form = R.weighted(['pow', 'two', 'osc', 'spin'], [4, 2, 1.5, 1.5]);
      if (form === 'pow') {
        const p2 = R.int(1, 9), p = p2 / 2;
        const useBeta = R.bool();
        const s = R.pick([0, 0, 1, -1]);
        const A = R.pick(['A', 'C', 'Z_0', 'a']);
        const ex = F.fracI(p2, 2);
        let Zt = useBeta ? `${A}\\,\\beta^{-${ex}}` : `${A}\\,T^{${ex === '1' ? '' : ex}}`.replace('T^{}', 'T');
        if (s) Zt += `\\,e^{${s > 0 ? '-' : ''}\\Delta/k_BT}`;
        const dt = s ? (s > 0 ? ' + \\Delta' : ' - \\Delta') : '';
        const dw = s ? (s > 0 ? ' - \\Delta' : ' + \\Delta') : '';
        const stem = raw`The partition function of a system in equilibrium at temperature $T$ is $Z = ${Zt}$, where $${A}$${s ? ' and $\\Delta > 0$ are constants' : ' is a constant'}${useBeta ? ' and $\\beta = 1/k_BT$' : ''}. `;
        if (R.bool(0.7)) {
          const corr = cs(p, 'k_BT') + dt;
          const wr = [cs(p, 'k_BT') + dw, cs(p + 1, 'k_BT') + dt, cs(1 / p, 'k_BT') + dt, cs(p, 'T') + dt, '-' + cs(p, 'k_BT') + dt, cs(2 * p, 'k_BT') + dt];
          if (s) wr.unshift(cs(p, 'k_BT'));
          return {
            q: stem + 'What is the average energy $\\langle E\\rangle$ of the system?',
            ...symMC(R, corr, wr),
            expl: raw`$\langle E\rangle = -\partial \ln Z/\partial\beta$. Here $\ln Z = -${ex === '1' ? '' : F.frac(p2, 2)}\ln\beta${s ? (s > 0 ? ' - \\beta\\Delta' : ' + \\beta\\Delta') : ''} + \text{const}$, so $\langle E\rangle = ${corr}$. A power $T^{p}$ in $Z$ always contributes $p\,k_BT$.`,
          };
        }
        const corr = cs(p, 'k_B');
        const wr = [cs(p, 'k_BT'), cs(p + 1, 'k_B'), cs(2 * p, 'k_B'), cs(1 / p, 'k_B'), '0'];
        if (s) wr.unshift(cs(p, 'k_B') + ' + \\Delta/T');
        return {
          q: stem + 'What is the heat capacity $C = d\\langle E\\rangle/dT$ of the system?',
          ...symMC(R, corr, wr),
          expl: raw`$\langle E\rangle = -\partial\ln Z/\partial\beta = ${cs(p, 'k_BT') + dt}$, so $C = ${corr}$.${s ? ' The constant energy offset $\\Delta$ shifts $\\langle E\\rangle$ but not $C$.' : ''}`,
        };
      }
      if (form === 'two') {
        const n = R.pick(['N', 2, 3, 4, 5, 6]);
        const eps = R.pick(['\\varepsilon', '\\Delta', 'E_0']);
        const Nt = n === 'N' ? 'N' : String(n);
        const X = `${eps}/k_BT`;
        const stem = raw`A system of ${n === 'N' ? '$N$' : n} distinguishable, independent two-level units (level energies $0$ and $${eps}$) has partition function $Z = \left(1 + e^{-${X}}\right)^{${Nt}}$ at temperature $T$. `;
        if (R.bool(0.65)) {
          const corr = `\\dfrac{${Nt}${eps}}{e^{${X}} + 1}`;
          return {
            q: stem + 'What is the average energy of the system?',
            ...symMC(R, corr, [`\\dfrac{${Nt}${eps}}{e^{${X}} - 1}`, `${Nt}${eps}\\,e^{-${X}}`, `\\dfrac{${eps}}{e^{${X}} + 1}`, `\\dfrac{${Nt}${eps}}{e^{-${X}} + 1}`, `${Nt}k_BT`]),
            expl: raw`$\ln Z = ${Nt}\ln(1 + e^{-\beta ${eps}})$, so $\langle E\rangle = -\partial\ln Z/\partial\beta = \dfrac{${Nt}${eps}\,e^{-\beta ${eps}}}{1 + e^{-\beta ${eps}}} = ${corr}$. It goes to 0 as $T\to0$ and to $${Nt}${eps}/2$ as $T\to\infty$.`,
          };
        }
        const corr = `\\dfrac{${Nt}${eps}}{2}`;
        return {
          q: stem + 'What is the average energy in the limit $T \\to \\infty$?',
          ...symMC(R, corr, [`${Nt}${eps}`, '0', `${Nt}k_BT`, `\\dfrac{${eps}}{2}`, `\\dfrac{${n === 'N' ? '3N' : 3 * n}}{2}k_BT`]),
          expl: raw`$\langle E\rangle = ${Nt}${eps}/(e^{\beta ${eps}} + 1) \to ${Nt}${eps}/2$ as $\beta\to0$: both levels become equally populated, so on average half the units are excited. The energy saturates rather than growing like $k_BT$.`,
        };
      }
      if (form === 'osc') {
        const X = '\\hbar\\omega/k_BT';
        const stem = raw`A quantum harmonic oscillator of angular frequency $\omega$ in equilibrium at temperature $T$ has partition function $Z = \dfrac{e^{-${X.replace('/', '/2')}}}{1 - e^{-${X}}}$. `;
        const ask = R.weighted(['E', 'hi', 'lo'], [2, 1, 1]);
        if (ask === 'E') {
          const corr = `\\dfrac{\\hbar\\omega}{2} + \\dfrac{\\hbar\\omega}{e^{${X}} - 1}`;
          return {
            q: stem + 'What is its average energy?',
            ...symMC(R, corr, [`\\dfrac{\\hbar\\omega}{e^{${X}} - 1}`, `\\dfrac{\\hbar\\omega}{2} + \\dfrac{\\hbar\\omega}{e^{${X}} + 1}`, `\\dfrac{\\hbar\\omega}{2} + k_BT`, `\\hbar\\omega\\,e^{-${X}}`, `\\dfrac{\\hbar\\omega}{2} - \\dfrac{\\hbar\\omega}{e^{${X}} - 1}`]),
            expl: raw`$\ln Z = -\beta\hbar\omega/2 - \ln(1 - e^{-\beta\hbar\omega})$, so $\langle E\rangle = -\partial_\beta\ln Z = ${corr}$: zero-point energy plus Planck's thermal term.`,
          };
        }
        if (ask === 'hi') {
          return {
            q: stem + 'In the limit $k_BT \\gg \\hbar\\omega$, its average energy approaches',
            ...symMC(R, 'k_BT', ['\\dfrac{1}{2}k_BT', '\\dfrac{3}{2}k_BT', '\\dfrac{\\hbar\\omega}{2}', '\\hbar\\omega', '2k_BT']),
            expl: raw`For $\beta\hbar\omega \ll 1$, $\hbar\omega/(e^{\beta\hbar\omega} - 1) \approx k_BT - \hbar\omega/2$, so $\langle E\rangle \to k_BT$: the classical equipartition value for two quadratic terms ($p^2$ and $x^2$).`,
          };
        }
        return {
          q: stem + 'In the limit $k_BT \\ll \\hbar\\omega$, its average energy approaches',
          ...symMC(R, '\\dfrac{\\hbar\\omega}{2}', ['0', 'k_BT', '\\hbar\\omega', '\\dfrac{1}{2}k_BT', '\\dfrac{3\\hbar\\omega}{2}']),
          expl: raw`As $T\to0$ the thermal term $\hbar\omega/(e^{\beta\hbar\omega} - 1)$ vanishes exponentially, leaving the zero-point energy $\hbar\omega/2$.`,
        };
      }
      const n = R.pick(['N', 1, 2, 3, 4]);
      const Nt = n === 'N' ? 'N' : n === 1 ? '' : String(n);
      const X = '\\mu B/k_BT';
      const corr = `-${Nt}\\mu B\\tanh\\!\\left(${X}\\right)`;
      return {
        q: raw`${n === 1 ? 'A single spin-1/2 magnetic moment' : `A system of ${n === 'N' ? '$N$' : n} independent spin-1/2 magnetic moments`} $\mu$ in a magnetic field $B$ has energy levels $\mp\mu B$ per moment and partition function $Z = \left[2\cosh(${X})\right]^{${n === 'N' ? 'N' : n}}$ at temperature $T$. What is the average energy?`.replace('^{1}', ''),
        ...symMC(R, corr, [`${Nt}\\mu B\\tanh\\!\\left(${X}\\right)`, `-${Nt}\\mu B\\coth\\!\\left(${X}\\right)`, `-${Nt}\\mu B\\sinh\\!\\left(${X}\\right)`, `-${Nt}k_BT`, `-\\dfrac{${Nt}\\mu B}{\\cosh(${X})}`]),
        expl: raw`$\ln Z = ${n === 'N' ? 'N' : n === 1 ? '' : n}\ln[2\cosh(\beta\mu B)]$, so $\langle E\rangle = -\partial_\beta\ln Z = ${corr}$. It is negative (moments align with $B$) and tends to 0 at high $T$.`,
      };
    },
  });

  L.push({
    id: 'thermo.ensemble.concept', sec: '4.1.1', level: 1,
    gen(R) {
      const ens = R.pick(['micro', 'canon', 'grand']);
      const S = {
        micro: [[
          ['The total energy $E$ of the system is fixed.', 'the microcanonical ensemble describes an isolated system at fixed $E$, $V$, $N$.'],
          ['The particle number $N$ is fixed.', 'an isolated system exchanges neither energy nor particles.'],
          ['The volume $V$ is fixed.', '$N$, $V$, $E$ are the fixed variables.'],
          ['All accessible microstates are equally probable.', 'this is the fundamental postulate behind $S = k_B\\ln\\Omega$.'],
        ], [
          ['The system exchanges energy with a heat bath.', 'that is the canonical ensemble; the microcanonical system is isolated.'],
          ['The system exchanges particles with a reservoir.', 'that is the grand canonical ensemble.'],
          ['The energy of the system fluctuates.', 'the energy is fixed exactly in the microcanonical ensemble.'],
        ]],
        canon: [[
          ['The particle number $N$ is fixed.', 'the canonical ensemble has fixed $N$, $V$, $T$.'],
          ['The temperature is fixed by contact with a large heat bath.', 'the bath has such a large heat capacity that $T$ stays fixed.'],
          ['The energy of the system fluctuates.', 'energy is exchanged with the bath, so only $\\langle E\\rangle$ is fixed.'],
          ['The probability of a microstate with energy $E_i$ is proportional to $e^{-E_i/k_BT}$.', 'this is the Boltzmann distribution, $p_i = e^{-\\beta E_i}/Z$.'],
        ], [
          ['The total energy of the system is fixed exactly.', 'the energy fluctuates through exchange with the bath.'],
          ['The system exchanges particles with a reservoir.', '$N$ is fixed in the canonical ensemble.'],
          ['All microstates are equally probable, whatever their energy.', 'states are weighted by $e^{-E_i/k_BT}$.'],
        ]],
        grand: [[
          ['The temperature $T$ is fixed.', 'the grand canonical ensemble has fixed $\\mu$, $V$, $T$.'],
          ['The chemical potential $\\mu$ is fixed.', 'the particle reservoir fixes $\\mu$.'],
          ['The number of particles fluctuates.', 'particles are exchanged with the reservoir.'],
          ['The energy of the system fluctuates.', 'energy is exchanged with the reservoir too.'],
        ], [
          ['The particle number $N$ is fixed exactly.', 'only $\\langle N\\rangle$ is fixed; $N$ fluctuates.'],
          ['The total energy is fixed exactly.', 'the system exchanges energy with the reservoir.'],
          ['The chemical potential fluctuates while $N$ is fixed.', 'it is the other way round.'],
        ]],
      }[ens];
      const name = { micro: 'microcanonical', canon: 'canonical', grand: 'grand canonical' }[ens];
      return romanQ(R, `Which of the following is (are) true of a system described by the ${name} ensemble?`, S[0], S[1]);
    },
  });

  // ================================================================== 4.1.2 Entropy
  L.push({
    id: 'thermo.entropy.count', sec: '4.1.2', level: 2, weight: 2,
    gen(R) {
      if (R.bool(0.55)) {
        const N = R.int(4, 12), n = R.int(1, N - 1);
        const Om = binom(N, n);
        const [what, up] = R.pick([
          ['distinguishable spin-1/2 particles, fixed in a lattice, are placed in a magnetic field', 'have their spins aligned with the field'],
          ['distinguishable two-level atoms are held at fixed sites', 'are in the excited state'],
          ['distinguishable adsorption sites on a surface can each hold at most one atom', 'are occupied'],
          ['fair coins are laid on a table and labeled', 'show heads'],
        ]);
        const val = new Map();
        const mk = x => { const t = `$k_B\\ln ${x}$`; val.set(t, x); return t; };
        const wr = [Math.pow(2, N), fact(N) / fact(N - n), N, n, binom(N, n - 1), N * n, fact(N) / fact(n)].filter(x => x > 1 && x !== Om && Number.isInteger(x));
        return {
          q: raw`${N} ${what}. In a particular macrostate exactly ${n} of them ${up}. What is the entropy $S$ of this macrostate?`,
          ...GRE.mc(R, mk(Om), [...new Set(wr)].map(mk), { rank: t => val.get(t) }),
          expl: raw`$S = k_B\ln\Omega$ with $\Omega = \binom{${N}}{${n}} = \dfrac{${N}!}{${n}!\,${N - n}!} = ${Om}$, the number of ways to choose which ${n} of the ${N} are distinguished. $2^{${N}}$ counts all microstates of all macrostates.`,
        };
      }
      const SYS = [
        ['a particle in a three-dimensional isotropic harmonic oscillator', 'level $n$', n => (n + 1) * (n + 2) / 2, [0, 1, 2, 3, 4, 5], 'the degeneracy of level $n = n_x + n_y + n_z$ is $(n+1)(n+2)/2$'],
        ['the electron in a hydrogen atom (ignoring spin)', 'shell $n$', n => n * n, [1, 2, 3, 4, 5, 6], 'shell $n$ contains $n^2$ orbital states'],
        ['the electron in a hydrogen atom (including the two spin states)', 'shell $n$', n => 2 * n * n, [1, 2, 3, 4, 5], 'shell $n$ contains $2n^2$ states'],
        ['a rigid diatomic rotor', 'the rotational level with quantum number $\\ell$', l => 2 * l + 1, [0, 1, 2, 3, 4, 5, 6], 'level $\\ell$ has $2\\ell + 1$ values of $m$'],
        ['a particle in a two-dimensional isotropic harmonic oscillator', 'level $n$', n => n + 1, [0, 1, 2, 3, 4, 5, 6, 7], 'level $n = n_x + n_y$ has $n + 1$ states'],
      ];
      const k = R.int(0, SYS.length - 1);
      const [sys, lev, g, rng, why] = SYS[k];
      const [n1, n2] = R.pickN(rng, 2);
      if (k === 0 && n1 === 1 && n2 === 2) throw new Error('retry');
      const g1 = g(n1), g2 = g(n2);
      if (g1 === g2) throw new Error('retry');
      const sym = lev.indexOf('\\ell') >= 0 ? '\\ell' : 'n';
      const T = (num, den) => { const f = F.frac(num, den); return f === '1' ? '0' : `k_B\\ln ${f.indexOf('frac') >= 0 ? f.replace('\\frac', '\\tfrac') : f}`; };
      const wr = [[T(g2, 1), Math.log(g2)], [T(g1, g2), Math.log(g1 / g2)], [T(n2, n1 || 1), Math.log(n2 / (n1 || 1))], [`${g2 - g1}k_B`, g2 - g1], ['0', 0], [T(Math.abs(g2 - g1), 1), Math.log(Math.abs(g2 - g1))]];
      return {
        q: raw`For ${sys}, all states within an energy level are taken to be equally likely. The system is known to be in ${lev.replace(/\$n\$|\$\\ell\$/, `$${sym} = ${n1}$`)}, and is then moved to ${lev.replace(/\$n\$|\$\\ell\$/, `$${sym} = ${n2}$`)}. What is the change in the entropy $S = k_B\ln\Omega$?`,
        ...valMC(R, [T(g2, g1), Math.log(g2 / g1)], wr),
        expl: raw`Here ${why}, so $\Omega_1 = ${g1}$ and $\Omega_2 = ${g2}$. Then $\Delta S = k_B\ln(\Omega_2/\Omega_1) = ${T(g2, g1)}$.`,
      };
    },
  });

  L.push({
    id: 'thermo.entropy.gibbs', sec: '4.1.2', level: 2,
    gen(R) {
      // probabilities 2^-k (dyadic): entropy in bits = sum p k
      const DIST = [[1, 1], [1, 2, 2], [1, 2, 3, 3], [2, 2, 2, 2], [1, 3, 3, 3, 3], [2, 2, 2, 3, 3], [1, 2, 3, 4, 4], [3, 3, 3, 3, 3, 3, 3, 3], [2, 2, 3, 3, 3, 3], [1, 2, 4, 4, 4, 4], [1, 3, 3, 3, 4, 4], [2, 2, 3, 3, 4, 4, 4, 4]];
      const ks = R.shuffle(R.pick(DIST));
      const n = ks.length;
      const bits = ks.reduce((s, k) => s + k / Math.pow(2, k), 0);
      const who = R.pick([['N', 'N\\,'], ['1', ''], ['NA', 'N_A\\,']]);
      const lab = R.pick(['states', 'microstates', 'quantum states']);
      const probs = ks.map(k => `$${F.frac(1, Math.pow(2, k))}$`).join(', ');
      const unit = `${who[1]}k_B\\ln 2`;
      const wb = [bits / 2, 2 * bits, bits + 0.5, bits - 0.5, bits + 0.25, -bits];
      const lnN = Number.isInteger(Math.log2(n)) ? null : [`${who[1]}k_B\\ln ${n}`, Math.log2(n)];
      const intro = who[0] === '1' ? 'A system' : who[0] === 'N' ? 'Each of $N$ independent, distinguishable subsystems' : 'Each molecule in one mole ($N_A$ molecules) of a substance';
      const ask = who[0] === '1' ? 'What is the entropy $S = -k_B\\sum_i p_i\\ln p_i$ of the system?' : 'What is the total entropy, using $S = -k_B\\sum_i p_i\\ln p_i$ for each and adding?';
      return {
        q: raw`${intro} can be found in ${n} ${lab} with probabilities ${probs}. ${ask}`,
        ...valMC(R, [cs(bits, unit), bits], wb.map(w => [cs(w, unit), w]).concat(lnN ? [lnN] : [[cs(Math.log2(n), unit), Math.log2(n)]])),
        expl: raw`$-\sum p_i\ln p_i = \sum p_i\,k_i\ln 2$ with $p_i = 2^{-k_i}$, giving $${fx(bits)}\ln 2$ per ${who[0] === '1' ? 'system' : 'subsystem; entropy is additive'}. So $S = ${cs(bits, unit)}$. The maximum, $k_B\ln ${n}$, holds only for equal probabilities.`,
      };
    },
  });

  L.push({
    id: 'thermo.entropy.idealgas', sec: '4.1.2', level: 2, weight: 2,
    gen(R) {
      const gas = R.pick([['monatomic', 3], ['diatomic', 5]]);
      const f = gas[1];
      const bs = f === 3 ? [1, 4, 9, 16, 1 / 4, 1 / 9] : [1, 4, 9, 1 / 4];
      const b = R.pick(bs);
      const a = R.pick([1, 2, 3, 4, 8, 1 / 2, 1 / 3, 1 / 4, 1 / 8]);
      if (a === 1 && b === 1) throw new Error('retry');
      const X = a * Math.pow(b, f / 2);
      const nm = R.pick([['Nk_B', 'N'], ['nR', 'n']]);
      const lnT = x => (close(x, 1) ? '0' : exq(x) == null ? null : `${nm[0]}\\ln ${fx(x)}`);
      if (exq(X) == null) throw new Error('retry');
      const wr = [[lnT(a * b), Math.log(a * b)], [lnT(a * Math.pow(b, (8 - f) / 2)), Math.log(a * Math.pow(b, (8 - f) / 2))], [lnT(a), Math.log(a)], [lnT(Math.pow(b, f / 2) / a), Math.log(Math.pow(b, f / 2) / a)], [`${fx(f / 2)}${nm[0]}\\ln ${fx(a * b)}`, (f / 2) * Math.log(a * b)], [lnT(a * Math.pow(b, (f + 2) / 2)), Math.log(a * Math.pow(b, (f + 2) / 2))]].concat([2, 1 / 2, 4, 1 / 4, 3, 1 / 3].map(k => [lnT(X * k), Math.log(X * k)]));
      const cnt = nm[1] === 'N' ? '$N$ molecules' : '$n$ moles';
      const desc = b === 1 ? `its volume is multiplied by $${fx(a)}$ at constant temperature` : a === 1 ? `its temperature is multiplied by $${fx(b)}$ at constant volume` : `its volume is multiplied by $${fx(a)}$ and its absolute temperature by $${fx(b)}$`;
      return {
        q: raw`An ideal ${gas[0]} gas of ${cnt} (vibrations frozen out) is taken from one equilibrium state to another in which ${desc}. What is the change in the entropy of the gas?`,
        ...valMC(R, [lnT(X), Math.log(X)], wr),
        expl: raw`For an ideal gas $S = ${nm[0]}\ln\!\left(V T^{${F.fracI(f, 2)}}\right) + \text{const}$ (the exponent is $C_V/${nm[0]}$ = ${F.fracI(f, 2)} for a ${gas[0]} gas). So $\Delta S = ${nm[0]}\ln\!\left(${fx(a)}\times ${powTex(b, f / 2)}\right) = ${lnT(X)}$. Entropy is a state function, so the path does not matter.`,
      };
    },
  });

  L.push({
    id: 'thermo.entropy.boltz', sec: '4.1.2', level: 2,
    gen(R) {
      const v = R.pick(['factor', 'combine', 'perunit']);
      if (v === 'factor') {
        const p = R.pick([10, 12, 15, 18, 20, 23, 25, 30]);
        const dS = C.kB * p * Math.log(10);
        return {
          q: raw`During a process the number of accessible microstates of a system increases by a factor of $10^{${p}}$. The entropy of the system increases by approximately (take $\ln 10 \approx 2.3$)`,
          ...GRE.numeric(R, dS, [C.kB * p, C.R * p * Math.log(10), C.kB * Math.log(p), C.kB * p * p * Math.log(10)], { unit: raw`\text{J/K}` }),
          expl: raw`$\Delta S = k_B\ln(\Omega_2/\Omega_1) = k_B\cdot ${p}\ln 10 \approx 1.38\times10^{-23}\times ${F.num(p * 2.3, 3)} \approx ${F.sci(dS, 2)}\,\text{J/K}$. Even a huge multiplicity factor is a tiny entropy in SI units.`,
        };
      }
      if (v === 'combine') {
        const a = R.pick([2, 3, 4, 5, 6, 8, 10]), b = R.pick([2, 3, 4, 5, 6, 8, 10]);
        const corr = `k_B\\ln ${a * b}`;
        return {
          q: raw`System A has $\Omega_A = ${a}^{N}$ accessible microstates and system B has $\Omega_B = ${b}^{N}$. If the two systems are weakly coupled but do not exchange energy, what is the entropy of the combined system?`,
          ...symMC(R, `N${corr}`, [`Nk_B\\ln ${a + b}`, `N^2k_B\\ln ${a * b}`, `k_B\\ln ${a * b}`, `Nk_B\\ln ${Math.max(a, b)}`, `2Nk_B\\ln ${a * b}`, `Nk_B\\ln ${a}\\,\\ln ${b}`]),
          expl: raw`Microstates multiply, $\Omega = \Omega_A\Omega_B = (${a * b})^N$, so entropies add: $S = k_B\ln\Omega = Nk_B\ln ${a * b} = S_A + S_B$.`,
        };
      }
      const g = R.pick([2, 3, 4, 5, 6, 8]);
      const unit = R.pick([['N', 'N independent, distinguishable particles', 'Nk_B'], ['mol', 'one mole of independent, distinguishable particles', 'R']]);
      return {
        q: raw`${unit[0] === 'N' ? 'Each of $N$ independent, distinguishable particles' : 'Each particle in one mole of independent, distinguishable particles'} can occupy any of ${g} states of equal energy, independently of the others. What is the entropy of the system?`,
        ...symMC(R, `${unit[2]}\\ln ${g}`, [`k_B\\ln ${g}`, `${g}${unit[2]}`, `${unit[2]}\\ln ${2 * g}`, `k_B\\ln ${unit[2] === 'R' ? 'N_A' : 'N'}`, `${unit[2]}\\ln 2`, `k_B\\ln ${g}^{1/${unit[2] === 'R' ? 'N_A' : 'N'}}`]),
        expl: raw`$\Omega = ${g}^{N}$ for $N$ independent particles, so $S = k_B\ln ${g}^N = Nk_B\ln ${g}$${unit[0] === 'mol' ? ', which for one mole is $N_Ak_B\\ln ' + g + ' = R\\ln ' + g + '$' : ''}.`,
      };
    },
  });

  // ================================================================== 4.1.3 Classical limit
  L.push({
    id: 'thermo.classical.Zscale', sec: '4.1.3', level: 2,
    gen(R) {
      const SYS = [
        ['a free nonrelativistic particle of mass $m$ in a box of volume $V$', 3 / 2, 'V', 'volume', '$H = p^2/2m$ in 3D: the momentum integral gives $(2\\pi mk_BT)^{3/2}$ and the position integral gives $V$'],
        ['a nonrelativistic particle confined to move on a flat surface of area $A$', 1, 'A', 'area', 'two Gaussian momentum integrals give $2\\pi mk_BT$, and the position integral gives $A$'],
        ['a one-dimensional harmonic oscillator, $H = p^2/2m + \\tfrac12 m\\omega^2x^2$', 1, null, null, 'two Gaussian integrals each give a factor $\\sqrt{T}$'],
        ['a three-dimensional isotropic harmonic oscillator', 3, null, null, 'six quadratic terms each give a factor $\\sqrt{T}$'],
        ['an ultrarelativistic particle ($E = pc$) in a box of volume $V$', 3, 'V', 'volume', '$\\int d^3p\\, e^{-pc/k_BT} = 8\\pi (k_BT/c)^3$'],
        ['a particle moving in one dimension in the potential $U(x) = \\alpha x^4$', 3 / 4, null, null, 'the $p$ integral gives $T^{1/2}$ and $\\int e^{-\\alpha x^4/k_BT}dx \\propto T^{1/4}$'],
        ['a particle moving in one dimension in the potential $U(x) = \\alpha|x|$', 3 / 2, null, null, 'the $p$ integral gives $T^{1/2}$ and $\\int e^{-\\alpha|x|/k_BT}dx = 2k_BT/\\alpha$'],
      ];
      const [desc, p, Vs, Vn, why] = R.pick(SYS);
      const ask = R.weighted(['Z', 'E', 'C'], [3, 2, 1]);
      const pre = raw`In the classical limit, the single-particle partition function $Z_1 = h^{-d}\!\int e^{-H/k_BT}\,d^dp\,d^dx$ is computed for ${desc}. `;
      if (ask === 'Z') {
        const ts = { 1.5: [4, 9, 16, 1 / 4], 1: [2, 3, 4, 1 / 2, 1 / 3], 3: [2, 3, 1 / 2, 4], 0.75: [16, 81, 1 / 16] }[p];
        const t = R.pick(ts);
        const v = Vs ? R.pick([1, 2, 3, 1 / 2, 8]) : 1;
        const X = v * Math.pow(t, p);
        const ch = `the absolute temperature is multiplied by $${fx(t)}$${Vs && v !== 1 ? ` and the ${Vn} by $${fx(v)}$` : ''}`;
        return {
          q: pre + `If ${ch}, by what factor does $Z_1$ change?`,
          ...exactMC(R, X, [v * t, v * Math.pow(t, p === 1.5 ? 3 : 1.5), Math.pow(t, p), v * Math.pow(t, -p), v * t * t, v * Math.sqrt(t), v * Math.pow(t, 2 * p)], '', { positive: true }),
          expl: raw`Here ${why}, so $Z_1 \propto ${Vs ? Vs + '\\,' : ''}${powTex(2, p).replace(/^2/, 'T')}$. The factor is $${Vs && v !== 1 ? fx(v) + '\\times' : ''}${powTex(t, p)} = ${fx(X)}$.`,
        };
      }
      const sym = ask === 'E' ? 'k_BT' : 'k_B';
      return {
        q: pre + (ask === 'E' ? 'What is the average energy of the particle in thermal equilibrium?' : 'What is the heat capacity per particle?'),
        ...exactMC(R, p, [1 / 2, 1, 3 / 2, 2, 3, 5 / 2, p / 2, 2 * p].filter(x => !close(x, p)), sym),
        expl: raw`Here ${why}, so $Z_1 \propto ${powTex(2, p).replace(/^2/, 'T')}$ and $\langle E\rangle = k_BT^2\,\partial\ln Z_1/\partial T = ${cs(p, 'k_BT')}$${ask === 'C' ? `, giving $C = ${cs(p, 'k_B')}$` : ''}.`,
      };
    },
  });

  L.push({
    id: 'thermo.classical.validity', sec: '4.1.3', level: 2,
    gen(R) {
      const v = R.weighted(['factor', 'roman', 'mc'], [3, 2, 1]);
      if (v === 'factor') {
        const a = R.pick([2, 4, 8, 1 / 2, 1 / 8, 27]);
        const b = R.pick([1, 4, 9, 1 / 4, 16]);
        const c = R.pick([1, 1, 4, 1 / 4]);
        if (b === 1 && c === 1) throw new Error('retry');
        const X = a * Math.pow(b * c, -1.5);
        if (exq(X) == null || X > 1000) throw new Error('retry');
        const parts = [`the number density is multiplied by $${fx(a)}$`];
        if (b !== 1) parts.push(`the absolute temperature by $${fx(b)}$`);
        if (c !== 1) parts.push(`the particle mass by $${fx(c)}$`);
        return {
          q: raw`Quantum effects in a gas are negligible when $n\lambda^3 \ll 1$, where $n$ is the number density and $\lambda = h/\sqrt{2\pi mk_BT}$ is the thermal de Broglie wavelength. If ${parts.join(', ').replace(/, ([^,]*)$/, ' and $1')}, by what factor does $n\lambda^3$ change?`,
          ...exactMC(R, X, [a * Math.pow(b * c, 1.5), a / (b * c), a * Math.pow(b * c, -0.5), Math.pow(b * c, -1.5), a * b * c, a * Math.pow(b * c, -3)], '', { positive: true }),
          expl: raw`$\lambda \propto (mT)^{-1/2}$, so $n\lambda^3 \propto n\,(mT)^{-3/2}$: the factor is $${fx(a)}\times(${fx(b * c)})^{-3/2} = ${fx(X)}$.`,
        };
      }
      if (v === 'roman') {
        return romanQ(R, 'Which of the following changes, made separately, make(s) a gas better described by classical (Maxwell–Boltzmann) statistics?',
          [['Raising the temperature at fixed density', 'the thermal wavelength $\\lambda \\propto T^{-1/2}$ shrinks.'],
            ['Lowering the density at fixed temperature', 'the interparticle spacing $n^{-1/3}$ grows compared with $\\lambda$.'],
            ['Using heavier particles at the same density and temperature', '$\\lambda \\propto m^{-1/2}$ shrinks.']],
          [['Lowering the temperature at fixed density', '$\\lambda$ grows, so quantum effects increase.'],
            ['Compressing the gas at fixed temperature', 'higher density increases $n\\lambda^3$.'],
            ['Using lighter particles at the same density and temperature', 'a smaller mass means a longer $\\lambda$.']],
          'Classical statistics need $n\\lambda^3 \\ll 1$ with $\\lambda = h/\\sqrt{2\\pi m k_BT}$.');
      }
      const ok = R.bool();
      const corr = ok ? 'the thermal de Broglie wavelength is much smaller than the typical distance between particles'
        : 'the thermal de Broglie wavelength is comparable to or larger than the typical distance between particles';
      const wr = ok ? ['the thermal de Broglie wavelength is much larger than the typical distance between particles', 'the temperature is low enough that only the ground state is occupied', 'the particles are fermions rather than bosons', 'the density is high enough that particles collide frequently', 'the spacing between energy levels is much larger than $k_BT$']
        : ['the temperature is high and the density low', 'the particles are heavy', 'the energy level spacing is much smaller than $k_BT$', 'the gas is dilute', 'the occupation number of every single-particle state is much less than 1'];
      return {
        q: ok ? 'The classical (Maxwell–Boltzmann) description of an ideal gas is accurate when' : 'Quantum statistics (Fermi–Dirac or Bose–Einstein) must be used for an ideal gas when',
        ...txtMC(R, corr, wr),
        expl: 'Quantum statistics matter when wavefunctions of neighboring particles overlap, i.e. when $\\lambda = h/\\sqrt{2\\pi mk_BT}$ is comparable to $n^{-1/3}$. At high $T$, low density or large mass, every occupation number is small and the Boltzmann limit applies.',
      };
    },
  });

  L.push({
    id: 'thermo.classical.speeds', sec: '4.1.3', level: 2,
    gen(R) {
      const GAS = [['H$_2$', 2], ['He', 4], ['CH$_4$', 16], ['Ne', 20], ['N$_2$', 28], ['O$_2$', 32], ['Ar', 40], ['CO$_2$', 44], ['Kr', 84]];
      const v = R.weighted(['ratio', 'ke', 'order'], [4, 2, 1]);
      if (v === 'order') {
        const which = R.pick([['largest', 'v_{\\text{rms}} = \\sqrt{3k_BT/m}'], ['smallest', 'v_{p} = \\sqrt{2k_BT/m}']]);
        const corr = which[0] === 'largest' ? 'the root-mean-square speed' : 'the most probable speed';
        return {
          q: `For molecules in a gas obeying the Maxwell–Boltzmann speed distribution, which of the following characteristic speeds is the ${which[0]}?`,
          ...txtMC(R, corr, ['the most probable speed', 'the mean speed', 'the root-mean-square speed', 'all three are equal', 'it depends on the molecular mass', 'it depends on the temperature']),
          expl: raw`$v_p = \sqrt{2k_BT/m} < \bar v = \sqrt{8k_BT/\pi m} < v_{\text{rms}} = \sqrt{3k_BT/m}$ for every gas and temperature (ratios $\sqrt2 : \sqrt{8/\pi} : \sqrt3$). The ${which[0]} is $${which[1]}$.`,
        };
      }
      const [g1, g2] = R.pickN(GAS, 2);
      const T1 = R.pick([200, 300, 400, 600, 800, 1200]), T2 = R.pick([200, 300, 400, 600, 800, 1200]);
      if (v === 'ke') {
        const X = T1 / T2;
        return {
          q: raw`Gas A (${g1[0]}, molar mass ${g1[1]} g/mol) is at ${T1} K and gas B (${g2[0]}, molar mass ${g2[1]} g/mol) is at ${T2} K. What is the ratio of the average translational kinetic energy of a molecule of A to that of a molecule of B?`,
          ...exactMC(R, X, [X * g1[1] / g2[1], X * g2[1] / g1[1], Math.sqrt(X), Math.sqrt(X * g2[1] / g1[1]), 1, X * X], '', { positive: true }),
          expl: raw`The average translational kinetic energy is $\tfrac32 k_BT$, independent of mass, so the ratio is $T_A/T_B = ${fx(X)}$.`,
        };
      }
      const r2 = (T1 * g2[1]) / (T2 * g1[1]);
      const X = Math.sqrt(r2);
      if (exq(X) == null) throw new Error('retry');
      const tSame = T1 === T2;
      return {
        q: raw`Gas A (${g1[0]}, molar mass ${g1[1]} g/mol) is at ${T1} K${tSame ? ' and gas B' : ' and gas B'} (${g2[0]}, molar mass ${g2[1]} g/mol) is at ${T2} K. What is the ratio $v_{\text{rms},A}/v_{\text{rms},B}$ of their root-mean-square molecular speeds?`,
        ...exactMC(R, X, [r2, 1 / X, Math.sqrt(g2[1] / g1[1]), Math.sqrt(T1 / T2), 1 / r2, Math.sqrt(T1 * g1[1] / (T2 * g2[1]))], '', { positive: true }),
        expl: raw`$v_{\text{rms}} = \sqrt{3k_BT/m}$, so $\dfrac{v_A}{v_B} = \sqrt{\dfrac{T_A}{T_B}\cdot\dfrac{m_B}{m_A}} = \sqrt{\dfrac{${T1}\times${g2[1]}}{${T2}\times${g1[1]}}} = ${fx(X)}$.`,
      };
    },
  });

  // ================================================================== 4.1.4 Equipartition theorem
  // [description, quadratic dof per particle, is a gas, reason]
  const DOF = [
    ['a monatomic ideal gas', 3, true, '3 translational terms'],
    ['a diatomic ideal gas at room temperature (vibrations frozen out)', 5, true, '3 translational + 2 rotational terms'],
    ['a diatomic ideal gas hot enough that vibrations are fully excited (but with no dissociation)', 7, true, '3 translational + 2 rotational + 2 vibrational (kinetic and potential) terms'],
    ['a diatomic ideal gas so cold that rotations and vibrations are frozen out (assume it remains an ideal gas)', 3, true, 'only the 3 translational terms survive'],
    ['a monatomic ideal gas whose atoms can move only in two dimensions', 2, true, '2 translational terms'],
    ['a monatomic ideal gas whose atoms can move only along a line', 1, true, '1 translational term'],
    ['an ideal gas of rigid nonlinear polyatomic molecules (vibrations frozen out)', 6, true, '3 translational + 3 rotational terms'],
    ['an ideal gas of rigid linear triatomic molecules (vibrations frozen out)', 5, true, '3 translational + 2 rotational terms (no rotation about the molecular axis)'],
    ['a collection of independent classical one-dimensional harmonic oscillators', 2, false, 'one kinetic and one potential quadratic term'],
    ['a classical crystalline solid (each atom a 3D harmonic oscillator about its lattice site)', 6, false, '3 kinetic + 3 potential quadratic terms'],
  ];
  L.push({
    id: 'thermo.equip.dof', sec: '4.1.4', level: 1, weight: 2,
    gen(R) {
      const [desc, f, gas, why] = R.pick(DOF);
      const ask = R.pick(gas ? ['U', 'Cv', 'Cp', 'gamma', 'num'] : ['U', 'Cv', 'num']);
      const others = [1, 2, 3, 5, 6, 7].filter(x => x !== f);
      const pf = R.shuffle(others);
      if (ask === 'U') {
        const sym = R.pick(['Nk_BT', 'nRT']);
        return {
          q: raw`According to the equipartition theorem, what is the internal energy of ${desc}${sym === 'Nk_BT' ? ', with $N$ particles,' : ', with $n$ moles,'} at temperature $T$?`,
          ...exactMC(R, f / 2, pf.map(x => x / 2).concat([f]), sym),
          expl: raw`Each quadratic term in the energy contributes $\tfrac12 k_BT$ per particle. Here there are ${f} (${why}), so $U = ${cs(f / 2, sym)}$.`,
        };
      }
      if (ask === 'Cv' || ask === 'Cp') {
        const p = ask === 'Cv' ? f / 2 : f / 2 + 1;
        return {
          q: raw`What is the molar heat capacity ${ask === 'Cv' ? 'at constant volume, $C_V$' : 'at constant pressure, $C_P$'}, of ${desc}?`,
          ...exactMC(R, p, (ask === 'Cv' ? [f / 2 + 1] : [f / 2]).concat(pf.map(x => x / 2 + (ask === 'Cp' ? 1 : 0)), [f]), 'R'),
          expl: raw`${f} quadratic terms (${why}) give $C_V = \tfrac{${f}}{2}R$${ask === 'Cp' ? raw`, and for an ideal gas $C_P = C_V + R = ${cs(p, 'R')}$` : ''}.`,
        };
      }
      if (ask === 'gamma') {
        return {
          q: raw`What is the ratio $\gamma = C_P/C_V$ for ${desc}?`,
          ...exactMC(R, 1 + 2 / f, pf.map(x => 1 + 2 / x).concat([f / (f + 2)])),
          expl: raw`$C_V = \tfrac{${f}}{2}R$ (${why}) and $C_P = C_V + R$, so $\gamma = 1 + 2/f = ${fx(1 + 2 / f)}$.`,
        };
      }
      const n = R.pick([0.5, 1, 2, 3, 4]), T = R.pick([200, 250, 300, 400, 500, 600]);
      const U = f / 2 * n * C.R * T;
      return {
        q: raw`What is the internal energy of $${F.num(n)}\,\text{mol}$ of ${desc} at $${T}\,\text{K}$, according to the equipartition theorem? (Take $R = 8.3\,\text{J/(mol}\cdot\text{K)}$.)`,
        ...GRE.numeric(R, U, pf.slice(0, 3).map(x => x / 2 * n * C.R * T).concat([f * n * C.R * T]), { unit: raw`\text{J}` }),
        expl: raw`$U = \tfrac{${f}}{2}nRT$ (${why}) $= \tfrac{${f}}{2}(${F.num(n)})(8.3)(${T}) \approx ${F.num(U, 2)}\,\text{J}$.`,
      };
    },
  });

  L.push({
    id: 'thermo.equip.potential', sec: '4.1.4', level: 3,
    gen(R) {
      const v = R.weighted(['radial', 'aniso'], [3, 2]);
      let desc, Uavg, Kavg, why;
      if (v === 'radial') {
        const d = R.pick([1, 2, 3]), s = R.pick([1, 2, 4, 6]);
        const rel = R.bool(0.25);
        const pot = d === 1 ? (s === 1 ? '\\alpha|x|' : s === 2 ? '\\alpha x^2' : `\\alpha x^{${s}}`) : (s === 1 ? '\\alpha r' : `\\alpha r^{${s}}`);
        const kin = rel ? 'c|\\mathbf{p}|' : (d === 1 ? 'p^2/2m' : '|\\mathbf{p}|^2/2m');
        desc = raw`a classical particle moving in ${['one', 'two', 'three'][d - 1]} dimension${d > 1 ? 's' : ''} with Hamiltonian $H = ${kin} + ${pot}$${rel ? ' (ultrarelativistic)' : ''}, where $\alpha > 0$${d > 1 ? ' and $r$ is the distance from the origin' : ''}`;
        Kavg = rel ? d : d / 2;
        Uavg = d / s;
        why = raw`each momentum component gives ${rel ? '$k_BT$ for $c|p|$ (a linear term)' : '$\\tfrac12k_BT$'}, so $\langle K\rangle = ${cs(Kavg, 'k_BT')}$; the configuration integral $\int ${d === 1 ? 'dx' : `d^{${d}}x`}\,e^{-\alpha ${d === 1 ? '|x|' : 'r'}^{${s}}/k_BT} \propto T^{${F.fracI(d, s)}}$ gives $\langle U\rangle = ${cs(Uavg, 'k_BT')}$`;
      } else {
        const ss = R.pickN([1, 2, 4, 6], R.pick([2, 3]));
        const vars = ['x', 'y', 'z'];
        const coefs = ['a', 'b', 'c'];
        const terms = ss.map((s, i) => (s === 1 ? `${coefs[i]}|${vars[i]}|` : `${coefs[i]}${vars[i]}^{${s}}`));
        desc = raw`a classical particle of mass $m$ moving in ${ss.length === 2 ? 'two' : 'three'} dimensions in the potential $U = ${terms.join(' + ')}$ (with positive constants)`;
        Kavg = ss.length / 2;
        Uavg = ss.reduce((t, s) => t + 1 / s, 0);
        why = raw`each kinetic term gives $\tfrac12k_BT$, and a potential term $\propto |q|^{s}$ gives $k_BT/s$, so $\langle K\rangle = ${cs(Kavg, 'k_BT')}$ and $\langle U\rangle = ${cs(Uavg, 'k_BT')}$`;
      }
      const ask = R.weighted(['E', 'U', 'C'], [2, 2, 1]);
      const tot = Kavg + Uavg;
      const corr = ask === 'U' ? Uavg : tot;
      const sym = ask === 'C' ? 'k_B' : 'k_BT';
      const naive = v === 'radial' ? Kavg * 2 : Kavg * 2; // treating every term as quadratic
      const wr = [naive, Kavg, Uavg, tot, Kavg + 2 * Uavg, Uavg / 2, 2 * Uavg, tot / 2].filter(x => !close(x, corr));
      return {
        q: raw`In thermal equilibrium at temperature $T$, what is ${ask === 'U' ? 'the average potential energy' : ask === 'E' ? 'the average total energy' : 'the heat capacity'} of ${desc}?`,
        ...exactMC(R, corr, wr, sym),
        expl: raw`Generalized equipartition: ${why}. ${ask === 'U' ? '' : `Total: $\\langle E\\rangle = ${cs(tot, 'k_BT')}$${ask === 'C' ? `, so $C = ${cs(tot, 'k_B')}$` : ''}. `}Only a quadratic term gives exactly $\tfrac12k_BT$.`,
      };
    },
  });

  L.push({
    id: 'thermo.equip.solid', sec: '4.1.4', level: 2,
    gen(R) {
      const EL = [['copper', 63.5], ['aluminum', 27], ['iron', 56], ['lead', 207], ['silver', 108], ['gold', 197], ['nickel', 59], ['tungsten', 184]];
      const v = R.weighted(['Q', 'c', 'roman'], [3, 2, 2]);
      if (v === 'roman') {
        return romanQ(R, 'Which of the following statements about the heat capacity of a crystalline solid is (are) correct?',
          [['At high temperature its molar heat capacity approaches $3R$, independent of the material.', 'this is the Dulong–Petit law: 6 quadratic terms per atom.'],
            ['Its heat capacity goes to zero as $T \\to 0$.', 'the vibrational modes freeze out (third law).'],
            ['For an insulator at low temperature, $C \\propto T^3$.', 'the Debye $T^3$ law for acoustic phonons.'],
            ['At high temperature, its molar heat capacity is about twice that of a monatomic ideal gas at constant volume.', '$3R$ versus $\\tfrac32R$: the potential energy terms double the count.']],
          [['Its molar heat capacity is $\\tfrac32R$ at all temperatures.', 'that is a monatomic gas; a solid has $3R$ at high $T$ and less at low $T$.'],
            ['Its heat capacity is independent of temperature at low temperatures.', 'it falls to zero as quantum effects freeze out the vibrations.'],
            ['At high temperature, its molar heat capacity is proportional to the atomic mass.', 'the molar value $3R$ is independent of mass; only the per-gram value depends on it.'],
            ['At low temperature, $C$ grows exponentially with $T$ for every solid.', 'the Debye model gives a power law, $T^3$.']]);
      }
      const [el, M] = R.pick(EL);
      if (v === 'c') {
        const c = 3 * C.R / M;
        return {
          q: raw`Using the Dulong–Petit law, estimate the specific heat of ${el} (molar mass $${M}\,\text{g/mol}$) at room temperature.`,
          ...GRE.numeric(R, c, [1.5 * C.R / M, C.R / M, 3 * C.R * M / 1000, 3 * C.R / M * 1000 / 100], { unit: raw`\text{J/(g}\cdot\text{K)}` }),
          expl: raw`Each atom has 6 quadratic terms, so $C = 3R \approx 25\,\text{J/(mol}\cdot\text{K)}$; per gram, $c = 3R/M = 25/${M} \approx ${F.num(c, 2)}\,\text{J/(g}\cdot\text{K)}$.`,
        };
      }
      const m = R.pick([50, 100, 200, 250, 500, 1000]), dT = R.pick([5, 10, 20, 25, 40, 50]);
      const Q = m / M * 3 * C.R * dT;
      return {
        q: raw`Approximately how much heat is needed to raise the temperature of a $${m}\,\text{g}$ block of ${el} (molar mass $${M}\,\text{g/mol}$) by $${dT}\,\text{K}$ near room temperature? (Treat the solid classically.)`,
        ...GRE.numeric(R, Q, [m / M * 1.5 * C.R * dT, m / M * C.R * dT, m / M * 2.5 * C.R * dT, 3 * C.R * dT], { unit: raw`\text{J}` }),
        expl: raw`Dulong–Petit: $C = 3R \approx 25\,\text{J/(mol}\cdot\text{K)}$. With $n = ${m}/${M} \approx ${F.num(m / M, 2)}\,\text{mol}$, $Q = 3nR\Delta T \approx ${F.num(Q, 2)}\,\text{J}$. Using $\tfrac32R$ (gas value) is the trap.`,
      };
    },
  });

  L.push({
    id: 'thermo.equip.freezeout', sec: '4.1.4', level: 2,
    gen(R) {
      const thr = R.pick([2, 5, 10, 20, 40, 80]), thv = R.pick([800, 1000, 2000, 3000, 4000, 6000]);
      const regime = R.pick(['low', 'mid', 'high']);
      const T = regime === 'low' ? R.pick([thr / 20, thr / 10]) : regime === 'mid' ? R.pick([10 * thr, thv / 10, Math.round(Math.sqrt(thr * thv) / 10) * 10].filter(t => t >= 10 * thr && t <= thv / 10)) : R.pick([10 * thv, 20 * thv]);
      if (T == null) throw new Error('retry');
      const f = { low: 3, mid: 5, high: 7 }[regime];
      const ask = R.pick(['Cv', 'Cp', 'U', 'gamma']);
      const why = { low: 'only translation is active ($T \\ll \\theta_{\\text{rot}}$)', mid: 'translation and rotation are active, vibration is frozen ($\\theta_{\\text{rot}} \\ll T \\ll \\theta_{\\text{vib}}$)', high: 'translation, rotation and vibration are all active ($T \\gg \\theta_{\\text{vib}}$)' }[regime];
      const stem = raw`A diatomic ideal gas has characteristic rotational temperature $\theta_{\text{rot}} = ${thr}\,\text{K}$ and vibrational temperature $\theta_{\text{vib}} = ${thv}\,\text{K}$. Assume it remains an undissociated ideal gas. At $T = ${F.num(T, 3)}\,\text{K}$, `;
      const fs3 = [3, 5, 7, 9, 6].filter(x => x !== f);
      if (ask === 'gamma') {
        return { q: stem + 'what is $\\gamma = C_P/C_V$?', ...exactMC(R, 1 + 2 / f, fs3.map(x => 1 + 2 / x).concat([f / (f + 2)])), expl: raw`Here ${why}, so $C_V = \tfrac{${f}}{2}R$ and $\gamma = 1 + 2/${f} = ${fx(1 + 2 / f)}$.` };
      }
      const sym = ask === 'U' ? 'k_BT' : 'R';
      const corr = ask === 'Cp' ? f / 2 + 1 : f / 2;
      const wr = fs3.map(x => x / 2 + (ask === 'Cp' ? 1 : 0)).concat(ask === 'Cp' ? [f / 2] : ask === 'Cv' ? [f / 2 + 1] : [f]);
      return {
        q: stem + (ask === 'Cv' ? 'what is its molar heat capacity at constant volume?' : ask === 'Cp' ? 'what is its molar heat capacity at constant pressure?' : 'what is the average energy per molecule?'),
        ...exactMC(R, corr, wr, sym),
        expl: raw`Modes with characteristic temperature well above $T$ are frozen out. Here ${why}: ${f} quadratic terms, so $C_V = \tfrac{${f}}{2}R$${ask === 'Cp' ? ` and $C_P = C_V + R = ${cs(corr, 'R')}$` : ask === 'U' ? ` and $\\langle E\\rangle = ${cs(corr, 'k_BT')}$` : ''}.`,
      };
    },
  });

  // ================================================================== 4.1.5 Some mathematical facts
  L.push({
    id: 'thermo.math.count', sec: '4.1.5', level: 2, weight: 2,
    gen(R) {
      const v = R.pick(['choose', 'two', 'einstein', 'dist']);
      const opt = (c, ws, expl, q) => {
        const W = [...new Set(ws.filter(x => Number.isInteger(x) && x > 0 && x !== c))];
        return { q, ...valMC(R, [String(c), c], W.map(x => [String(x), x])), expl };
      };
      if (v === 'choose') {
        const N = R.int(5, 12), n = R.int(2, N - 2);
        const [thing, site] = R.pick([['identical atoms', 'distinguishable lattice sites, at most one atom per site'], ['indistinguishable vacancies', 'distinguishable sites of a small crystal'], ['identical excitations', 'distinguishable two-level atoms, at most one excitation per atom']]);
        return opt(binom(N, n), [fact(N) / fact(N - n), Math.pow(N, n), Math.pow(2, N), binom(N, n - 1), N * n, binom(N + n - 1, n)],
          raw`Choose which ${n} of the ${N} sites are occupied: $\binom{${N}}{${n}} = \dfrac{${N}!}{${n}!\,${N - n}!} = ${binom(N, n)}$. The ordered count $${N}!/${N - n}!$ overcounts by $${n}!$ because the objects are identical.`,
          raw`In how many distinct ways can ${n} ${thing} be placed on ${N} ${site}?`);
      }
      if (v === 'two') {
        const N = R.int(5, 10), a = R.int(1, 3), b = R.int(1, N - a - 1);
        if (N === 6 && ((a === 3 && b === 1) || (a === 1 && b === 3))) throw new Error('avoid');
        const c = fact(N) / (fact(a) * fact(b) * fact(N - a - b));
        const [A, B, S] = R.pick([[['red marble', 'red marbles'], ['blue marble', 'blue marbles'], 'numbered boxes, at most one marble per box'], [['argon atom', 'argon atoms'], ['krypton atom', 'krypton atoms'], 'distinguishable adsorption sites, at most one atom per site'], [['spin-up impurity', 'spin-up impurities'], ['spin-down impurity', 'spin-down impurities'], 'distinguishable lattice sites, at most one impurity per site']]);
        const nm = (k, x) => `${k} ${x[k === 1 ? 0 : 1]}`;
        return opt(c, [binom(N, a) * binom(N, b), fact(N) / (fact(a) * fact(b)), binom(N, a + b), fact(N) / fact(N - a - b), binom(N, a) + binom(N, b), binom(N, a + b) * 2],
          raw`Choose the site${a === 1 ? '' : 's'} for the ${A[1]}, $\binom{${N}}{${a}}$, then the site${b === 1 ? '' : 's'} for the ${B[1]} from the remaining ${N - a}, $\binom{${N - a}}{${b}}$. Total $\dfrac{${N}!}{${a}!\,${b}!\,${N - a - b}!} = ${c}$. Multiplying $\binom{${N}}{${a}}\binom{${N}}{${b}}$ double-counts sites.`,
          raw`${nm(a, A).replace(/^1 /, 'One ')} and ${nm(b, B)} are to be placed in ${N} ${S}. Objects of the same kind are identical. How many distinct arrangements are there?`);
      }
      if (v === 'einstein') {
        const N = R.int(2, 5), q = R.int(2, 6);
        const c = binom(q + N - 1, q);
        return opt(c, [binom(q + N, q), Math.pow(N, q), Math.pow(q, N), binom(q + N - 1, q - 1), N * q, binom(N, q) || null, fact(q + N - 1) / fact(N - 1)],
          raw`Distributing $q = ${q}$ identical quanta among $N = ${N}$ distinguishable oscillators ("stars and bars"): $\binom{q + N - 1}{q} = \binom{${q + N - 1}}{${q}} = ${c}$.`,
          raw`An Einstein solid consists of ${N} distinguishable harmonic oscillators sharing ${q} identical energy quanta $\hbar\omega$. How many microstates does this macrostate have?`);
      }
      const N = R.int(2, 5), g = R.int(2, 6);
      const c = Math.pow(g, N);
      return opt(c, [binom(g + N - 1, N), binom(g, N) || null, Math.pow(N, g), g * N, fact(g) / Math.max(1, fact(g - N) || 1)],
        raw`Each of the ${N} distinguishable particles independently chooses one of ${g} states: $${g}^{${N}} = ${c}$. (Identical bosons would give $\binom{${g + N - 1}}{${N}}$.)`,
        raw`${N} distinguishable particles each occupy one of ${g} single-particle states, with no restriction on how many share a state. How many microstates are there?`);
    },
  });

  L.push({
    id: 'thermo.math.stirling', sec: '4.1.5', level: 2,
    gen(R) {
      const v = R.weighted(['frac', 'lnN'], [3, 2]);
      if (v === 'frac') {
        const q = R.pick([2, 3, 4, 5, 6, 8, 10]);
        const [sys, frac] = R.pick([['$N$ distinguishable spin-1/2 particles', 'have spin up'], ['$N$ distinguishable lattice sites', 'are occupied by identical atoms (at most one per site)'], ['$N$ distinguishable two-level atoms', 'are excited']]);
        const val = q === 2 ? Math.log(2) : Math.log(q) - (q - 1) / q * Math.log(q - 1);
        const corr = q === 2 ? 'Nk_B\\ln 2' : `Nk_B\\left(\\ln ${q} - \\frac{${q - 1}}{${q}}\\ln ${q - 1}\\right)`;
        const wr = [
          [`Nk_B\\ln ${q}`, Math.log(q)],
          [`\\frac{N}{${q}}k_B\\ln ${q}`, Math.log(q) / q],
          ['Nk_B\\ln 2', Math.log(2)],
          [`Nk_B\\ln N`, 99],
          [q === 2 ? 'Nk_B' : `Nk_B\\left(\\ln ${q} + \\frac{${q - 1}}{${q}}\\ln ${q - 1}\\right)`, q === 2 ? 1 : Math.log(q) + (q - 1) / q * Math.log(q - 1)],
          [`\\frac{${q - 1}}{${q}}Nk_B\\ln ${q}`, (q - 1) / q * Math.log(q)],
          [`2Nk_B\\ln ${q}`, 2 * Math.log(q)], [`k_B\\ln ${q}`, 0.001], [`\\frac{N}{${q}}k_B\\ln N`, 98],
        ];
        return {
          q: raw`In a macrostate of ${sys}, a fraction $1/${q}$ of them ${frac}. Using Stirling's approximation $\ln n! \approx n\ln n - n$ for large $N$, the entropy $S = k_B\ln\Omega$ of this macrostate is`,
          ...valMC(R, [corr, val], wr, { shuffle: true }),
          expl: raw`$\Omega = \binom{N}{N/${q}}$. Stirling gives $\ln\Omega \approx -N[x\ln x + (1-x)\ln(1-x)]$ with $x = 1/${q}$, i.e. $S = ${corr}$.${q === 2 ? ' The half-filled macrostate has the maximum entropy.' : ''}`,
        };
      }
      const k = R.pick([20, 22, 23, 24, 25, 26]);
      const val = Math.pow(10, k) * (k * Math.log(10) - 1);
      return {
        q: raw`For $N = 10^{${k}}$, Stirling's approximation gives $\ln(N!)$ closest to (take $\ln 10 \approx 2.3$)`,
        ...GRE.numeric(R, val, [Math.pow(10, k) * k, Math.pow(10, k), Math.pow(10, k) * Math.log(10), Math.pow(10, k + 1) * k * Math.log(10)]),
        expl: raw`$\ln N! \approx N\ln N - N = 10^{${k}}(${k}\times 2.3 - 1) \approx ${F.sci(val, 2)}$. The $-N$ term changes the answer by only a few percent.`,
      };
    },
  });

  L.push({
    id: 'thermo.math.gaussian', sec: '4.1.5', level: 2,
    gen(R) {
      const v = R.weighted(['int', 'mb'], [3, 2]);
      if (v === 'mb') {
        const ask = R.pick(['vx2', 'vx4', 'v2', 'absvx']);
        const corr = { vx2: '\\dfrac{k_BT}{m}', vx4: '3\\left(\\dfrac{k_BT}{m}\\right)^2', v2: '\\dfrac{3k_BT}{m}', absvx: '\\sqrt{\\dfrac{2k_BT}{\\pi m}}' }[ask];
        const lab = { vx2: '\\langle v_x^2\\rangle', vx4: '\\langle v_x^4\\rangle', v2: '\\langle v^2\\rangle = \\langle v_x^2 + v_y^2 + v_z^2\\rangle', absvx: '\\langle |v_x|\\rangle' }[ask];
        const pool = ['\\dfrac{k_BT}{m}', '\\dfrac{k_BT}{2m}', '\\dfrac{2k_BT}{m}', '\\dfrac{3k_BT}{m}', '3\\left(\\dfrac{k_BT}{m}\\right)^2', '\\left(\\dfrac{k_BT}{m}\\right)^2', '\\sqrt{\\dfrac{2k_BT}{\\pi m}}', '\\sqrt{\\dfrac{k_BT}{m}}', '\\sqrt{\\dfrac{8k_BT}{\\pi m}}'].filter(x => x !== corr);
        return {
          q: raw`In a classical ideal gas at temperature $T$, each velocity component of a molecule of mass $m$ has the distribution $f(v_x) \propto e^{-mv_x^2/2k_BT}$. What is $${lab}$?`,
          ...symMC(R, corr, pool),
          expl: raw`With $a = m/2k_BT$: $\langle v_x^2\rangle = 1/(2a) = k_BT/m$, $\langle v_x^4\rangle = 3/(4a^2) = 3(k_BT/m)^2$, $\langle|v_x|\rangle = 2\int_0^\infty v e^{-av^2}dv\big/\sqrt{\pi/a} = 1/\sqrt{\pi a}$, and $\langle v^2\rangle = 3k_BT/m$. So $${lab} = ${corr}$.`,
        };
      }
      const a = R.pick(['a', '\\alpha', 'b', '\\lambda', '2', '3', '5', '6']);
      const isNum = /^\d$/.test(a);
      const A = a;
      const av = isNum ? +a : 1.37; // generic value used to rule out equivalent choices
      const I = R.pick(['full0', 'half0', 'full2', 'half1', 'half3', 'exp']);
      const n = R.int(1, 4);
      const ex = I === 'exp' ? `${n === 1 ? 'x' : `x^{${n}}`}e^{-${A} x}` : `${{ full0: '', half0: '', full2: 'x^2', half1: 'x', half3: 'x^3' }[I]}e^{-${A} x^2}`;
      const lim = I.startsWith('full') ? '_{-\\infty}^{\\infty}' : '_0^{\\infty}';
      const sq = `\\sqrt{\\dfrac{\\pi}{${A}}}`;
      const P = (s, k) => (k === 1 ? s : `${s}^{${k}}`);
      const SP = Math.sqrt(Math.PI);
      const ans = {
        full0: [sq, SP / Math.sqrt(av)],
        half0: [`\\dfrac{1}{2}${sq}`, SP / Math.sqrt(av) / 2],
        full2: [`\\dfrac{\\sqrt{\\pi}}{2${P(A, '3/2')}}`, SP / (2 * Math.pow(av, 1.5))],
        half1: [`\\dfrac{1}{${isNum ? 2 * +A : '2' + A}}`, 1 / (2 * av)],
        half3: [`\\dfrac{1}{${isNum ? 2 * A * A : '2' + P(A, 2)}}`, 1 / (2 * av * av)],
        exp: [`\\dfrac{${fact(n)}}{${P(A, n + 1)}}`, fact(n) / Math.pow(av, n + 1)],
      };
      const wr = Object.keys(ans).filter(k => k !== I).map(k => ans[k]).concat([
        [`\\sqrt{${A}\\pi}`, Math.sqrt(av * Math.PI)], [`\\dfrac{\\sqrt{\\pi}}{${A}}`, SP / av],
        I === 'exp' ? [`\\dfrac{${fact(n + 1)}}{${P(A, n + 1)}}`, fact(n + 1) / Math.pow(av, n + 1)] : [`\\dfrac{\\pi}{${A}}`, Math.PI / av],
        I === 'exp' ? [`\\dfrac{${fact(n)}}{${P(A, n)}}`, fact(n) / Math.pow(av, n)] : [`\\dfrac{\\sqrt{\\pi}}{${P(A, '3/2')}}`, SP / Math.pow(av, 1.5)]]);
      const corr = ans[I][0];
      const why = {
        full0: 'the standard Gaussian integral',
        half0: 'half of the symmetric full-line integral',
        full2: 'obtained by differentiating $\\int e^{-ax^2}dx = \\sqrt{\\pi/a}$ with respect to $a$',
        half1: 'an exact antiderivative: $-e^{-ax^2}/(2a)$',
        half3: 'substitute $u = x^2$: $\\tfrac12\\int_0^\\infty u e^{-au}du = 1/(2a^2)$',
        exp: 'the Gamma function: $\\int_0^\\infty x^n e^{-ax}dx = n!/a^{n+1}$',
      }[I];
      const dim = isNum ? '' : raw` Dimensional check: with $[${A}] = [x]^{${I === 'exp' ? -1 : -2}}$ the answer must scale as $[x]^{${I === 'exp' ? n + 1 : { full0: 1, half0: 1, full2: 3, half1: 2, half3: 4 }[I]}}$.`;
      return {
        q: raw`What is the value of $\displaystyle\int${lim} ${ex}\,dx$${isNum ? '' : `, where $${A} > 0$`}?`,
        ...valMC(R, ans[I], wr, { shuffle: true }),
        expl: raw`This is ${why}, giving $${corr}$.${dim}`,
      };
    },
  });

  // ================================================================== 4.2.1 Three laws
  L.push({
    id: 'thermo.laws.firstlaw', sec: '4.2.1', level: 1,
    gen(R) {
      const Q = R.step(50, 900, 25), W = R.step(50, 900, 25);
      if (Q === W) throw new Error('retry');
      const sQ = R.sign(), sW = R.sign(); // sQ: +1 absorbs heat; sW: +1 gas does work on surroundings
      const sys = R.pick(['A gas in a cylinder', 'A gas sealed in a piston–cylinder device', 'A sample of ideal gas', 'A fluid in a closed container']);
      const hq = sQ > 0 ? `absorbs $${Q}\\,\\text{J}$ of heat` : `gives off $${Q}\\,\\text{J}$ of heat`;
      const wq = sW > 0 ? `does $${W}\\,\\text{J}$ of work on its surroundings` : `has $${W}\\,\\text{J}$ of work done on it`;
      const dU = sQ * Q - sW * W;
      const ask = R.weighted(['dU', 'Q'], [3, 2]);
      if (ask === 'dU') {
        return {
          q: raw`${sys} ${hq} while it ${wq}. What is the change in its internal energy?`,
          ...GRE.numeric(R, dU, [sQ * Q + sW * W, -dU, -sQ * Q - sW * W, Q + W], { unit: raw`\text{J}`, allowSign: true, fmt: x => String(Math.round(x)), tol: 0.05 }),
          expl: raw`First law: $\Delta U = Q - W$ with $Q$ the heat added and $W$ the work done by the system. Here $Q = ${sQ * Q}\,\text{J}$ and $W = ${sW * W}\,\text{J}$, so $\Delta U = ${dU}\,\text{J}$. Keep the sign conventions straight.`,
        };
      }
      // given dU and work, ask heat added
      const up = dU > 0;
      return {
        q: raw`The internal energy of ${sys.toLowerCase().replace(/^an? /, 'a ')} ${up ? 'increases' : 'decreases'} by $${Math.abs(dU)}\,\text{J}$ while it ${wq}. How much heat is added to it? (A negative value means heat leaves it.)`,
        ...GRE.numeric(R, sQ * Q, [dU - sW * W, -sQ * Q, sW * W, sQ * Q + 2 * sW * W, -dU - sW * W], { unit: raw`\text{J}`, allowSign: true, fmt: x => String(Math.round(x)), tol: 0.05 }),
        expl: raw`$Q = \Delta U + W = (${dU}) + (${sW * W}) = ${sQ * Q}\,\text{J}$, where $W$ is the work done by the system.`,
      };
    },
  });

  L.push({
    id: 'thermo.laws.second', sec: '4.2.1', level: 2, weight: 2,
    gen(R) {
      const T = [
        ['The total entropy of an isolated system never decreases.', 'this is the entropy statement of the second law.'],
        ['No engine operating between two reservoirs can be more efficient than a reversible engine operating between the same two reservoirs.', 'Carnot’s theorem follows from the second law.'],
        ['Heat cannot flow spontaneously from a colder body to a hotter one with no other effect.', 'this is the Clausius (refrigerator) statement.'],
        ['The entropy of a system can decrease if the system gives off heat.', 'only the total entropy of system plus surroundings must not decrease.'],
        ['No cyclic device can convert heat drawn from a single reservoir entirely into work.', 'this is the Kelvin–Planck (engine) statement.'],
        ['The entropy change of a system taken around a complete cycle is zero, even if the cycle is irreversible.', 'entropy is a state function; irreversibility shows up in the surroundings.'],
        ['In a reversible process, the total entropy of a system plus its surroundings is unchanged.', 'reversible processes generate no entropy.'],
        ['A refrigerator can move heat from a cold body to a hot body if work is done on it.', 'work input is the “other effect” that the Clausius statement allows.'],
      ];
      const Fs = [
        ['The entropy of any system can never decrease.', 'it can decrease if heat leaves the system; only isolated systems are constrained.'],
        ['A reversible heat engine operating in a cycle can convert all of the heat it absorbs into work.', 'even a Carnot engine rejects heat $Q_C = Q_H T_C/T_H$.'],
        ['A refrigerator violates the second law because it moves heat from cold to hot.', 'it requires work input, so heat flow is not its sole effect.'],
        ['In an irreversible process, the total entropy of a system plus its surroundings may decrease.', 'it must increase.'],
        ['The efficiency of a reversible engine operating between two reservoirs depends on the working substance.', 'it is $1 - T_C/T_H$ for any reversible engine.'],
        ['Every adiabatic process leaves the entropy of the system unchanged.', 'a free expansion is adiabatic but increases the entropy.'],
        ['Heat can flow spontaneously from a colder body to a hotter body if the colder body has more internal energy.', 'heat flow direction is set by temperature, not internal energy.'],
      ];
      return romanQ(R, 'Which of the following statements is (are) correct?', T, Fs);
    },
  });

  L.push({
    id: 'thermo.laws.statefn', sec: '4.2.1', level: 1,
    gen(R) {
      if (R.bool(0.55)) {
        const T = [
          ['the change in internal energy, $\\Delta U$', '$U$ is a state function.'],
          ['the change in entropy, $\\Delta S$', '$S$ is a state function.'],
          ['the change in enthalpy, $\\Delta H$', '$H = U + PV$ is a state function.'],
          ['the difference $Q - W$ between the heat absorbed and the work done by the gas', 'by the first law it equals $\\Delta U$.'],
          ['the change in temperature, $\\Delta T$', '$T$ is a state variable.'],
          ['the change in the Gibbs free energy, $\\Delta G$', '$G = H - TS$ is a state function.'],
        ];
        const Fs = [
          ['the heat $Q$ absorbed by the gas', 'heat is a path-dependent transfer, not a property of a state.'],
          ['the work $W$ done by the gas', 'work equals the (path-dependent) area under the $P$–$V$ curve.'],
          ['the sum $Q + W$ of the heat absorbed and the work done by the gas', 'only $Q - W$ is path-independent.'],
          ['the integral $\\int P\\,dV$ along the path', 'it is the area under the path, which depends on the path.'],
        ];
        return romanQ(R, 'An ideal gas is taken from equilibrium state A to equilibrium state B by various different paths. Which of the following is (are) the same for every path?', T, Fs);
      }
      const ST = [
        ['If body A is in thermal equilibrium with body C, and body B is in thermal equilibrium with C, then A and B are in thermal equilibrium with each other.', 'the zeroth law', 'This is the zeroth law ("thermometers exist").'],
        ['Temperature is a well-defined quantity that two bodies in equilibrium share, which justifies the use of thermometers.', 'the zeroth law', 'Transitivity of thermal equilibrium (zeroth law) is what makes thermometers meaningful.'],
        ['The change in internal energy of a system equals the heat added minus the work done by the system.', 'the first law', 'This is energy conservation, $\\Delta U = Q - W$.'],
        ['A perpetual-motion machine that produces work with no energy input is impossible.', 'the first law', 'Producing energy from nothing violates energy conservation (first law).'],
        ['No process can have as its only result the complete conversion of heat from one reservoir into work.', 'the second law', 'This is the Kelvin–Planck form of the second law.'],
        ['The entropy of an isolated system cannot decrease.', 'the second law', 'This is the entropy form of the second law.'],
        ['The entropy of a perfect crystal approaches zero as the temperature approaches absolute zero.', 'the third law', 'This is the third law (Nernst).'],
        ['Absolute zero cannot be reached in a finite number of steps.', 'the third law', 'The unattainability of $T = 0$ is a form of the third law.'],
        ['A ship cannot propel itself by extracting heat from the ocean and converting all of it to work.', 'the second law', 'Converting heat from a single reservoir entirely into work violates the second law (energy would be conserved).'],
      ];
      const [st, law, why] = R.pick(ST);
      return {
        q: `The statement “${st}” is an expression of which of the following?`,
        ...txtMC(R, law.charAt(0).toUpperCase() + law.slice(1) + ' of thermodynamics', ['The zeroth law of thermodynamics', 'The first law of thermodynamics', 'The second law of thermodynamics', 'The third law of thermodynamics', 'The equipartition theorem'].filter(x => x.toLowerCase() !== (law + ' of thermodynamics'))),
        expl: why,
      };
    },
  });

  L.push({
    id: 'thermo.laws.inventor', sec: '4.2.1', level: 2,
    gen(R) {
      const pairs = [[400, 200], [400, 300], [500, 300], [500, 250], [600, 300], [600, 400], [800, 400], [800, 200], [1000, 300], [1000, 400], [750, 300], [900, 300]];
      const [TH, TC] = R.pick(pairs);
      const fridge = R.bool(0.35);
      const kind = R.pick(['first', 'second', 'ok']);
      const ec = 1 - TC / TH;
      const CH = ['It violates the first law of thermodynamics.', 'It violates the second law but not the first law.', 'It violates neither law and could in principle be built.', 'It violates the third law of thermodynamics.', 'It violates the zeroth law of thermodynamics.'];
      const idx = { first: 0, second: 1, ok: 2 }[kind];
      let q, why;
      if (!fridge) {
        const QH = R.step(200, 1000, 100);
        let W;
        if (kind === 'second') W = Math.round(QH * Math.min(0.95, ec + R.pick([0.08, 0.12, 0.18])) / 10) * 10;
        else W = Math.round(QH * Math.max(0.05, ec - R.pick([0.08, 0.12, 0.18])) / 10) * 10;
        let QC = QH - W;
        if (kind === 'first') QC += R.pick([1, -1]) * R.step(30, 150, 10);
        if (QC <= 0 || W <= 0) throw new Error('retry');
        if (kind !== 'first' && Math.abs(W / QH - ec) < 0.05) throw new Error('retry');
        q = raw`An inventor claims that in each cycle her engine absorbs $${QH}\,\text{J}$ of heat from a reservoir at $${TH}\,\text{K}$, delivers $${W}\,\text{J}$ of work, and exhausts $${QC}\,\text{J}$ of heat to a reservoir at $${TC}\,\text{K}$. Which of the following best evaluates the claim?`;
        why = kind === 'first' ? raw`Energy is not conserved: $W + Q_C = ${W + QC}\,\text{J} \ne Q_H = ${QH}\,\text{J}$, so the first law is violated.`
          : raw`Energy balances ($${W} + ${QC} = ${QH}$). The claimed efficiency is $${W}/${QH} = ${F.num(W / QH, 2)}$, while the Carnot limit is $1 - ${TC}/${TH} = ${F.num(ec, 2)}$; ${kind === 'second' ? 'exceeding it violates the second law.' : 'it is below the limit, so the engine is allowed.'}`;
      } else {
        const cop = TC / (TH - TC);
        const W = R.step(100, 500, 50);
        let QC;
        if (kind === 'second') QC = Math.round(W * cop * R.pick([1.3, 1.5, 2]) / 10) * 10;
        else QC = Math.round(W * cop * R.pick([0.4, 0.5, 0.7]) / 10) * 10;
        let QH = QC + W;
        if (kind === 'first') QH += R.pick([1, -1]) * R.step(30, 150, 10);
        if (QC <= 0 || QH <= 0) throw new Error('retry');
        q = raw`A company claims that in each cycle its refrigerator removes $${QC}\,\text{J}$ of heat from a cold compartment at $${TC}\,\text{K}$ using $${W}\,\text{J}$ of work and rejects $${QH}\,\text{J}$ of heat to a room at $${TH}\,\text{K}$. Which of the following best evaluates the claim?`;
        why = kind === 'first' ? raw`Energy is not conserved: $Q_C + W = ${QC + W}\,\text{J} \ne Q_H = ${QH}\,\text{J}$, so the first law is violated.`
          : raw`Energy balances. The claimed coefficient of performance is $${QC}/${W} = ${F.num(QC / W, 2)}$, while the Carnot maximum is $T_C/(T_H - T_C) = ${F.num(cop, 2)}$; ${kind === 'second' ? 'exceeding it violates the second law.' : 'it is below the limit, so it is allowed.'}`;
      }
      const ch = R.shuffle([0, 1, 2, 3, 4]);
      return { q, choices: ch.map(i => CH[i]), ans: ch.indexOf(idx), expl: why };
    },
  });

  L.push({
    id: 'thermo.laws.reservoirs', sec: '4.2.1', level: 2,
    gen(R) {
      const TH = R.pick([400, 500, 600, 800, 1000, 1200]), TC = R.pick([200, 250, 300, 400]);
      if (TC >= TH) throw new Error('retry');
      const v = R.weighted(['cond', 'engine', 'hot'], [3, 2, 1]);
      const Q = R.step(600, 6000, 200);
      if (v === 'cond') {
        const dS = Q * (1 / TC - 1 / TH);
        return {
          q: raw`$${Q}\,\text{J}$ of heat flows by conduction from a large reservoir at $${TH}\,\text{K}$ through a metal rod to a large reservoir at $${TC}\,\text{K}$. The rod's state does not change. What is the total entropy change of the universe?`,
          ...GRE.numeric(R, dS, [Q / TC, Q / TH, Q / TC + Q / TH, Q / (TH - TC)], { unit: raw`\text{J/K}` }),
          expl: raw`$\Delta S = -Q/T_H + Q/T_C = -${Q}/${TH} + ${Q}/${TC} \approx ${F.num(dS, 2)}\,\text{J/K} > 0$, as the second law requires for this irreversible flow.`,
        };
      }
      if (v === 'engine') {
        const ec = 1 - TC / TH;
        const frac = R.pick([0.25, 0.5, 0.75]);
        const W = Math.round(Q * ec * frac / 10) * 10;
        const dS = -Q / TH + (Q - W) / TC;
        return {
          q: raw`In one cycle an engine absorbs $${Q}\,\text{J}$ from a reservoir at $${TH}\,\text{K}$, does $${W}\,\text{J}$ of work, and rejects the rest to a reservoir at $${TC}\,\text{K}$. What is the total entropy change of the universe per cycle?`,
          ...GRE.numeric(R, dS, [(Q - W) / TC, Q / TH, Q * (1 / TC - 1 / TH), W / TC, (Q - W) / TC + Q / TH], { unit: raw`\text{J/K}` }),
          expl: raw`The engine returns to its initial state, so only the reservoirs change: $\Delta S = -\dfrac{${Q}}{${TH}} + \dfrac{${Q - W}}{${TC}} \approx ${F.num(dS, 2)}\,\text{J/K}$. A reversible engine would give zero.`,
        };
      }
      const dS = -Q / TH;
      return {
        q: raw`$${Q}\,\text{J}$ of heat flows out of a large reservoir at $${TH}\,\text{K}$ into a colder object at $${TC}\,\text{K}$. What is the entropy change of the hot reservoir?`,
        ...GRE.numeric(R, dS, [Q / TH, -Q / TC, Q / TC - Q / TH, -Q / (TH - TC)], { unit: raw`\text{J/K}`, allowSign: true }),
        expl: raw`The reservoir stays at $${TH}\,\text{K}$, so $\Delta S = Q/T = -${Q}/${TH} = ${F.num(dS, 2)}\,\text{J/K}$ (negative: heat leaves it). The cold object gains more entropy, so the total increases.`,
      };
    },
  });

  // ================================================================== 4.2.2 Gases and equations of state
  const GASES = [['hydrogen (H$_2$)', 2, 'molecules'], ['helium', 4, 'atoms'], ['neon', 20, 'atoms'], ['nitrogen (N$_2$)', 28, 'molecules'], ['oxygen (O$_2$)', 32, 'molecules'], ['argon', 40, 'atoms'], ['carbon dioxide', 44, 'molecules'], ['krypton', 84, 'atoms']];
  L.push({
    id: 'thermo.gas.law', sec: '4.2.2', level: 1, weight: 2,
    gen(R) {
      const v = R.weighted(['celsius', 'factor', 'count', 'leak'], [2, 2, 2, 1]);
      if (v === 'celsius') {
        const Ti = R.pick([273, 300, 323, 373, 400, 250]);
        const [what, fP, fV] = R.pick([['its pressure is doubled at constant volume', 2, 1], ['its pressure is tripled at constant volume', 3, 1], ['its volume is doubled at constant pressure', 1, 2], ['its pressure is halved at constant volume', 0.5, 1], ['its volume is halved at constant pressure', 1, 0.5], ['both its pressure and its volume are doubled', 2, 2], ['its pressure is doubled and its volume halved', 2, 0.5], ['its volume is tripled and its pressure halved', 0.5, 3]]);
        const fT = fP * fV;
        if (fT === 1) throw new Error('retry');
        const Tf = Ti * fT;
        const tc = Ti - 273;
        return {
          q: raw`A fixed amount of ideal gas is initially at $${tc}^\circ\text{C}$. The gas is brought to a new equilibrium state in which ${what}. What is its final temperature?`,
          ...valMC(R, [`${Math.round(Tf - 273)}{}^\\circ\\text{C}`, Math.round(Tf - 273)], [tc * fT, Tf, Ti / fT - 273, tc / fT, Ti * fT * fT - 273, Ti * Math.sqrt(fT) - 273].map(Math.round).filter(x => x > -273).map(x => [`${x}{}^\\circ\\text{C}`, x])),
          expl: raw`$PV/T$ is constant for a fixed amount of ideal gas, so the absolute temperature changes by $${fx(fT)}$: $T_f = ${fx(fT)}\times ${Ti}\,\text{K} = ${F.num(Tf, 3)}\,\text{K} = ${Math.round(Tf - 273)}^\circ\text{C}$. Scaling the Celsius value is the trap.`,
        };
      }
      if (v === 'factor') {
        const ask = R.pick(['P', 'V', 'n', 'rho']);
        const a = R.pick([2, 3, 4, 1 / 2, 1 / 3]), b = R.pick([2, 3, 4, 1 / 2, 1 / 4, 3 / 2]);
        let q, X, why, W;
        if (ask === 'P') { q = raw`The absolute temperature of an ideal gas in a container is multiplied by $${fx(a)}$ while its volume is multiplied by $${fx(b)}$ (no gas escapes). By what factor does its pressure change?`; X = a / b; W = [a * b, b / a, a, 1 / b]; why = '$P = nRT/V$'; }
        else if (ask === 'V') { q = raw`The pressure of a fixed amount of ideal gas is multiplied by $${fx(a)}$ and its absolute temperature by $${fx(b)}$. By what factor does its volume change?`; X = b / a; W = [a * b, a / b, b, 1 / a]; why = '$V = nRT/P$'; }
        else if (ask === 'n') { q = raw`Two rigid tanks hold ideal gases. Tank 2 has $${fx(a)}$ times the volume of tank 1, is at $${fx(b)}$ times the pressure, and is at the same temperature. What is the ratio of the number of moles in tank 2 to that in tank 1?`; X = a * b; W = [a / b, b / a, a, b]; why = '$n = PV/RT$'; }
        else { q = raw`An ideal gas is at absolute temperature $T$ and pressure $P$. If its pressure is multiplied by $${fx(a)}$ and its absolute temperature by $${fx(b)}$, by what factor does its mass density change?`; X = a / b; W = [a * b, b / a, a, 1 / b]; why = '$\\rho = PM/RT$'; }
        return { q, ...exactMC(R, X, W.concat([X * X, Math.sqrt(X)]), '', { positive: true }), expl: raw`From ${why}, the factor is $${fx(X)}$.` };
      }
      if (v === 'count') {
        const P = R.pick([1, 2, 0.5]) * 1e5, V = R.pick([1, 2, 5, 10, 20, 50]) * 1e-3, T = R.pick([250, 300, 400, 500]);
        const N = P * V / (C.kB * T);
        return {
          q: raw`Approximately how many molecules are in a $${F.num(V * 1000)}\,\text{L}$ container of ideal gas at pressure $${F.sci(P, 2)}\,\text{Pa}$ and temperature $${T}\,\text{K}$?`,
          ...GRE.numeric(R, N, [N * 1000, N / 1000, P * V / (C.R * T)], { fill: [10, 0.1, 100, 0.01, 3, 1 / 3] }),
          expl: raw`$N = PV/k_BT = (${F.sci(P, 2)})(${F.sci(V, 2)}\,\text{m}^3)/(1.38\times10^{-23}\times ${T}) \approx ${F.sci(N, 2)}$. Remember $1\,\text{L} = 10^{-3}\,\text{m}^3$.`,
        };
      }
      const P1 = R.pick([10, 12, 15, 20, 25, 30]) * 1e5, P2 = P1 * R.pick([0.2, 0.25, 0.4, 0.5, 0.6, 0.75, 0.8]);
      const T1 = R.pick([300, 400]);
      const sameT = R.bool(0.6);
      const T2 = sameT ? T1 : T1 * R.pick([0.75, 1.25, 1.5]);
      const frac = 1 - (P2 / T2) / (P1 / T1);
      if (frac <= 0.05) throw new Error('retry');
      return {
        q: raw`A rigid tank of gas at $${F.sci(P1, 2)}\,\text{Pa}$ and $${T1}\,\text{K}$ leaks until the pressure is $${F.sci(P2, 2)}\,\text{Pa}$ ${sameT ? 'at the same temperature' : `and the temperature is $${T2}\\,\\text{K}$`}. What fraction of the original gas has escaped?`,
        ...exactMC(R, frac, [1 - P2 / P1, P2 / P1, (P2 / T2) / (P1 / T1), 1 - (P2 * T2) / (P1 * T1), 0.5].filter(x => x > 0 && x < 1), '', {}),
        expl: raw`At fixed $V$, $n \propto P/T$. The remaining fraction is $\dfrac{P_2/T_2}{P_1/T_1} = ${fx(1 - frac)}$, so $${fx(frac)}$ escaped.`,
      };
    },
  });

  L.push({
    id: 'thermo.gas.vrms', sec: '4.2.2', level: 1,
    gen(R) {
      const [name, M, part] = R.pick(GASES);
      const Mk = M / 1000;
      if (R.bool(0.65)) {
        const T = R.pick([100, 200, 250, 300, 400, 500, 600, 900, 1200]);
        const v = Math.sqrt(3 * C.R * T / Mk);
        return {
          q: raw`What is the root-mean-square speed of ${name} ${part} (molar mass $${M}\,\text{g/mol}$) in a gas at $${T}\,\text{K}$? (Take $R = 8.3\,\text{J/(mol}\cdot\text{K)}$.)`,
          expl: raw`$v_{\text{rms}} = \sqrt{3RT/M} = \sqrt{3(8.3)(${T})/(${F.num(Mk, 2)}\,\text{kg/mol})} \approx ${F.num(v, 2)}\,\text{m/s}$. Using $M$ in g/mol instead of kg/mol is the classic slip (factor $\sqrt{1000}$).`,
          ...GRE.numeric(R, v, [Math.sqrt(C.R * T / Mk), Math.sqrt(3 * C.R * T / M), Math.sqrt(2 * C.R * T / Mk) * 0.7, 3 * C.R * T / Mk / 1000], { unit: raw`\text{m/s}` }),
        };
      }
      const v = R.pick([300, 400, 500, 600, 800, 1000, 1500, 2000]);
      const T = Mk * v * v / (3 * C.R);
      if (T < 20 || T > 20000) throw new Error('retry');
      return {
        q: raw`At what temperature is the root-mean-square speed of ${name} ${part} (molar mass $${M}\,\text{g/mol}$) equal to $${v}\,\text{m/s}$? (Take $R = 8.3\,\text{J/(mol}\cdot\text{K)}$.)`,
        ...GRE.numeric(R, T, [Mk * v * v / C.R, Mk * v * v / (2 * C.R), M * v * v / (3 * C.R), Mk * v / (3 * C.R) * 100], { unit: raw`\text{K}` }),
        expl: raw`From $v_{\text{rms}} = \sqrt{3RT/M}$: $T = Mv^2/3R = (${F.num(Mk, 2)})(${v})^2/(3\times 8.3) \approx ${F.num(T, 2)}\,\text{K}$.`,
      };
    },
  });

  L.push({
    id: 'thermo.gas.vdw', sec: '4.2.2', level: 3,
    gen(R) {
      const v = R.weighted(['roman', 'meaning', 'work'], [3, 2, 2]);
      const eq = raw`$\left(P + \dfrac{an^2}{V^2}\right)(V - nb) = nRT$`;
      if (v === 'roman') {
        return romanQ(R, raw`A gas obeys the van der Waals equation ${eq} with $a > 0$ and $b > 0$. Which of the following is (are) true?`,
          [['Setting $a = b = 0$ recovers the ideal gas law.', 'both correction terms vanish.'],
            ['The term containing $b$ accounts for the finite volume occupied by the molecules.', '$V - nb$ is the free volume.'],
            ['The term containing $a$ accounts for attractive forces between molecules.', 'attraction reduces the pressure on the walls.'],
            ['At fixed $n$, $V$ and $T$, and with $b = 0$, the pressure is lower than that of an ideal gas.', '$P = nRT/V - an^2/V^2$.'],
            ['The gas cools when it undergoes a free expansion into vacuum.', 'its internal energy $U = C_VT - an^2/V$ is fixed, so $T$ drops as $V$ grows.'],
            ['The gas behaves more like an ideal gas at low density.', 'both corrections become negligible as $n/V \\to 0$.']],
          [['The term containing $a$ accounts for the finite size of the molecules.', 'that is $b$; $a$ describes attraction.'],
            ['Its internal energy depends only on temperature.', 'the attraction makes $U$ depend on $V$: $U = C_VT - an^2/V$.'],
            ['Its temperature is unchanged in a free expansion.', 'it cools, because work is done against the intermolecular attraction.'],
            ['The gas deviates more from ideal behavior as its density decreases.', 'deviations grow with density.'],
            ['With $a = 0$, the pressure at fixed $n$, $V$, $T$ is lower than that of an ideal gas.', 'excluded volume raises the pressure: $P = nRT/(V - nb)$.']]);
      }
      if (v === 'meaning') {
        const k = R.pick(['a', 'b']);
        return {
          q: raw`In the van der Waals equation of state ${eq}, the constant $${k}$ accounts for`,
          ...txtMC(R, k === 'a' ? 'the attractive forces between molecules' : 'the volume occupied by the molecules themselves',
            [k === 'a' ? 'the volume occupied by the molecules themselves' : 'the attractive forces between molecules', 'the internal (rotational and vibrational) degrees of freedom of the molecules', 'quantum-mechanical exchange effects at low temperature', 'the energy lost in inelastic collisions with the container walls', 'the dependence of the molecular speed on temperature']),
          expl: raw`$b$ is the excluded volume per mole ($V \to V - nb$); $a$ models the pairwise attraction, which lowers the pressure on the walls by $an^2/V^2$.`,
        };
      }
      const ask = R.pick(['W', 'dUdV']);
      if (ask === 'W') {
        const corr = 'nRT\\ln\\dfrac{V_2 - nb}{V_1 - nb} + an^2\\left(\\dfrac{1}{V_2} - \\dfrac{1}{V_1}\\right)';
        return {
          q: raw`$n$ moles of a van der Waals gas, ${eq}, expand reversibly and isothermally at temperature $T$ from volume $V_1$ to $V_2$. What is the work done by the gas?`,
          ...symMC(R, corr, ['nRT\\ln\\dfrac{V_2 - nb}{V_1 - nb} - an^2\\left(\\dfrac{1}{V_2} - \\dfrac{1}{V_1}\\right)', 'nRT\\ln\\dfrac{V_2}{V_1} + an^2\\left(\\dfrac{1}{V_2} - \\dfrac{1}{V_1}\\right)', 'nRT\\ln\\dfrac{V_2 - nb}{V_1 - nb}', 'nRT\\ln\\dfrac{V_1 - nb}{V_2 - nb} + an^2\\left(\\dfrac{1}{V_1} - \\dfrac{1}{V_2}\\right)', 'nRT\\ln\\dfrac{V_2 + nb}{V_1 + nb} - an^2\\left(\\dfrac{1}{V_2} - \\dfrac{1}{V_1}\\right)']),
          expl: raw`$P = \dfrac{nRT}{V - nb} - \dfrac{an^2}{V^2}$, so $W = \int_{V_1}^{V_2}P\,dV = ${corr}$. The attraction term reduces the work (note $1/V_2 - 1/V_1 < 0$); $a = b = 0$ gives the ideal result.`,
        };
      }
      return {
        q: raw`For a van der Waals gas, ${eq}, the thermodynamic identity $\left(\dfrac{\partial U}{\partial V}\right)_T = T\left(\dfrac{\partial P}{\partial T}\right)_V - P$ gives $(\partial U/\partial V)_T$ equal to`,
        ...symMC(R, '\\dfrac{an^2}{V^2}', ['0', '-\\dfrac{an^2}{V^2}', '\\dfrac{nRT}{V - nb}', '\\dfrac{nR}{V - nb}', 'nb', '\\dfrac{an^2}{V}']),
        expl: raw`$(\partial P/\partial T)_V = nR/(V - nb)$, so $T(\partial P/\partial T)_V - P = an^2/V^2 > 0$. For an ideal gas ($a = 0$) this vanishes. Hence $U = C_VT - an^2/V$.`,
      };
    },
  });

  L.push({
    id: 'thermo.gas.kinetic', sec: '4.2.2', level: 2,
    gen(R) {
      const v = R.weighted(['mfp', 'ke', 'pressure', 'effuse'], [2, 2, 2, 1]);
      if (v === 'mfp') {
        const a = R.pick([2, 3, 4, 1 / 2]), b = R.pick([2, 4, 1 / 2, 1 / 3, 1]), c = R.pick([1, 1, 2, 1 / 2]);
        if (b === 1 && c === 1 && a === 1) throw new Error('retry');
        const X = a / (b * c * c);
        const parts = [`the absolute temperature is multiplied by $${fx(a)}$`];
        if (b !== 1) parts.push(`the pressure by $${fx(b)}$`);
        if (c !== 1) parts.push(`the molecular diameter by $${fx(c)}$`);
        return {
          q: raw`The mean free path of a molecule in a dilute gas is $\lambda = \dfrac{1}{\sqrt2\,n\pi d^2}$, where $n$ is the number density and $d$ the molecular diameter. If ${parts.join(', ').replace(/, ([^,]*)$/, ' and $1')}, by what factor does $\lambda$ change?`,
          ...exactMC(R, X, [b / (a * c * c), a / (b * c), a * b / (c * c), 1 / (b * c * c), a / b * c * c, Math.sqrt(a / b) / (c * c)], '', { positive: true }),
          expl: raw`With $n = P/k_BT$, $\lambda = \dfrac{k_BT}{\sqrt2\,\pi d^2P} \propto \dfrac{T}{Pd^2}$, so the factor is $${fx(X)}$.`,
        };
      }
      if (v === 'ke') {
        const T = R.pick([100, 200, 300, 400, 600, 1000, 3000, 6000]);
        const E = 1.5 * C.kB_eVK * T;
        return {
          q: raw`What is the average translational kinetic energy of a molecule in an ideal gas at $${T}\,\text{K}$? (Take $k_B \approx 8.6\times10^{-5}\,\text{eV/K}$.)`,
          ...GRE.numeric(R, E, [E / 1.5, E / 3, 2 * E, 5 / 3 * E], { unit: raw`\text{eV}` }),
          expl: raw`$\langle K\rangle = \tfrac32 k_BT = 1.5\times 8.6\times10^{-5}\times ${T} \approx ${F.num(E, 2)}\,\text{eV}$, independent of the molecular mass. (Useful anchor: $k_BT \approx 1/40\,\text{eV}$ at 300 K.)`,
        };
      }
      if (v === 'pressure') {
        if (R.bool()) {
          const rho = R.pick([0.2, 0.5, 1, 1.2, 2, 4]), vr = R.pick([300, 400, 500, 600, 1000, 1500]);
          const P = rho * vr * vr / 3;
          return {
            q: raw`A gas has mass density $${F.num(rho)}\,\text{kg/m}^3$ and its molecules have root-mean-square speed $${vr}\,\text{m/s}$. According to kinetic theory, what is the pressure of the gas?`,
            ...GRE.numeric(R, P, [rho * vr * vr, rho * vr * vr / 2, rho * vr / 3, 2 * rho * vr * vr / 3], { unit: raw`\text{Pa}` }),
            expl: raw`Kinetic theory gives $P = \tfrac13\rho\,v_{\text{rms}}^2 = \tfrac13(${F.num(rho)})(${vr})^2 \approx ${F.num(P, 2)}\,\text{Pa}$; the $\tfrac13$ comes from averaging over three directions.`,
          };
        }
        const P = R.pick([0.5, 1, 2, 3]) * 1e5, rho = R.pick([0.2, 0.5, 1, 1.2, 2, 4]);
        const vr = Math.sqrt(3 * P / rho);
        return {
          q: raw`A gas at pressure $${F.sci(P, 2)}\,\text{Pa}$ has mass density $${F.num(rho)}\,\text{kg/m}^3$. What is the root-mean-square speed of its molecules?`,
          ...GRE.numeric(R, vr, [Math.sqrt(P / rho), Math.sqrt(2 * P / rho), 3 * P / rho / 100, Math.sqrt(P / (3 * rho))], { unit: raw`\text{m/s}` }),
          expl: raw`$P = \tfrac13\rho v_{\text{rms}}^2 \Rightarrow v_{\text{rms}} = \sqrt{3P/\rho} \approx ${F.num(vr, 2)}\,\text{m/s}$.`,
        };
      }
      const [g1, g2] = R.pickN(GASES, 2);
      const X = Math.sqrt(g2[1] / g1[1]);
      if (exq(X) == null) throw new Error('retry');
      return {
        q: raw`Two containers at the same temperature and pressure, one holding ${g1[0]} (molar mass ${g1[1]} g/mol) and the other ${g2[0]} (molar mass ${g2[1]} g/mol), each have an identical tiny hole. What is the ratio of the rate at which ${g1[0].replace(/ \(.*\)/, '')} ${g1[2]} escape to the rate at which ${g2[0].replace(/ \(.*\)/, '')} ${g2[2]} escape?`,
        ...exactMC(R, X, [g2[1] / g1[1], 1 / X, g1[1] / g2[1], 1, Math.sqrt(X)], '', { positive: true }),
        expl: raw`The effusion rate is $\tfrac14 n\bar v A$; at equal $T$ and $P$ the number densities are equal and $\bar v \propto 1/\sqrt{m}$, so the ratio is $\sqrt{${g2[1]}/${g1[1]}} = ${fx(X)}$ (Graham's law).`,
      };
    },
  });

  // ================================================================== 4.2.3 Types of processes
  /** closed polygon cycle on a two-axis diagram (straight edges), with direction arrows and point labels */
  function cycleFig(pts, names, ax) {
    const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
    const xm = Math.max(...xs) * 1.2, ym = Math.max(...ys) * 1.25;
    const X = x => 45 + 230 * x / xm, Y = y => 185 - 160 * y / ym;
    const P = pts.map(p => [X(p[0]), Y(p[1])]);
    let s = '<svg viewBox="0 0 300 210" width="300" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" fill="none" stroke-width="1.5">';
    s += '<path d="M45 190 V12 M40 20 L45 10 L50 20 M40 185 H290 M282 180 L292 185 L282 190" stroke-width="1.2"/>';
    s += `<text x="30" y="18" fill="currentColor" stroke="none" font-size="14" font-style="italic">${ax[1]}</text><text x="282" y="204" fill="currentColor" stroke="none" font-size="14" font-style="italic">${ax[0]}</text>`;
    s += `<path d="M${P.map(p => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' L')} Z"/>`;
    for (let i = 0; i < P.length; i++) {
      const a = P[i], b = P[(i + 1) % P.length];
      const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
      const ux = (b[0] - a[0]) / len, uy = (b[1] - a[1]) / len;
      const t = [[mx + 6 * ux, my + 6 * uy], [mx - 5 * ux + 4.5 * uy, my - 5 * uy - 4.5 * ux], [mx - 5 * ux - 4.5 * uy, my - 5 * uy + 4.5 * ux]];
      s += `<path d="M${t.map(p => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' L')} Z" fill="currentColor" stroke="none"/>`;
    }
    const cx = P.reduce((t, p) => t + p[0], 0) / P.length, cy = P.reduce((t, p) => t + p[1], 0) / P.length;
    P.forEach((p, i) => {
      const dx = p[0] - cx, dy = p[1] - cy, d = Math.hypot(dx, dy) || 1;
      s += `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="2.5" fill="currentColor" stroke="none"/>`;
      s += `<text x="${(p[0] + 13 * dx / d - 4).toFixed(1)}" y="${(p[1] + 13 * dy / d + 5).toFixed(1)}" fill="currentColor" stroke="none" font-size="13">${names[i]}</text>`;
    });
    return s + '</svg>';
  }

  L.push({
    id: 'thermo.proc.isothermal', sec: '4.2.3', level: 2, weight: 2,
    gen(R) {
      const n = R.pick([0.5, 1, 2, 3, 4]), T = R.pick([250, 300, 350, 400, 500, 600]);
      const r = R.pick([2, 3, 4, 5, 10]);
      const expand = R.bool();
      const lnr = +LN[r];
      const byP = R.bool(0.35);
      const change = expand ? (byP ? `its pressure falls to $1/${r}$ of its initial value` : `its volume increases by a factor of ${r}`) : (byP ? `its pressure rises by a factor of ${r}` : `its volume decreases to $1/${r}$ of its initial value`);
      const ask = R.pick(expand ? ['W', 'Q', 'S'] : ['Won', 'Qout', 'S']);
      const W = n * C.R * T * lnr;
      const stem = raw`$${F.num(n)}\,\text{mol}$ of an ideal gas is ${expand ? 'expanded' : 'compressed'} reversibly at a constant temperature of $${T}\,\text{K}$ until ${change}. `;
      const hint = ` (Take $R = 8.3\\,\\text{J/(mol}\\cdot\\text{K)}$ and $\\ln ${r} \\approx ${LN[r]}$.)`;
      if (ask === 'S') {
        const dS = (expand ? 1 : -1) * n * C.R * lnr;
        return {
          q: stem + 'What is the entropy change of the gas?' + hint,
          ...GRE.numeric(R, dS, [-dS, (expand ? 1 : -1) * n * C.R * (r - 1), (expand ? 1 : -1) * n * C.R * T * lnr / 100, (expand ? 1 : -1) * 1.5 * n * C.R * lnr], { unit: raw`\text{J/K}`, allowSign: true }),
          expl: raw`$\Delta U = 0$, so $Q = W = nRT\ln(V_f/V_i)$ and $\Delta S = Q/T = nR\ln(V_f/V_i) = ${expand ? '' : '-'}${F.num(n)}(8.3)(${LN[r]}) \approx ${F.num(dS, 2)}\,\text{J/K}$.`,
        };
      }
      const what = { W: 'How much work is done by the gas?', Q: 'How much heat does the gas absorb?', Won: 'How much work is done on the gas?', Qout: 'How much heat does the gas give off?' }[ask];
      return {
        q: stem + what + hint,
        ...GRE.numeric(R, W, [n * C.R * T * (r - 1), n * C.R * T, n * C.R * T * (1 - 1 / r), 1.5 * n * C.R * T * lnr, n * C.R * lnr], { unit: raw`\text{J}` }),
        expl: raw`For an isothermal ideal-gas process $\Delta U = 0$, so the heat exchanged equals the work: $|W| = nRT\ln(V_{\max}/V_{\min}) = ${F.num(n)}(8.3)(${T})(${LN[r]}) \approx ${F.num(W, 2)}\,\text{J}$${byP ? ' (at constant $T$, $V \\propto 1/P$)' : ''}.`,
      };
    },
  });

  L.push({
    id: 'thermo.proc.adiabatic', sec: '4.2.3', level: 2, weight: 2,
    gen(R) {
      // [gamma n/d, volume ratio V1/V2, T factor, P factor]
      const CS = [[5, 3, 8, 4, 32], [5, 3, 27, 9, 243], [5, 3, 1 / 8, 1 / 4, 1 / 32], [5, 3, 1 / 27, 1 / 9, 1 / 243], [5, 3, 64, 16, 1024], [7, 5, 32, 4, 128], [7, 5, 1 / 32, 1 / 4, 1 / 128]];
      const [gn, gd, r, tf, pf] = R.pick(CS);
      const g = gn / gd;
      const gas = gn === 5 ? 'monatomic' : 'diatomic';
      const comp = r > 1;
      const vtxt = comp ? `compressed to $1/${r}$ of its initial volume` : `expanded to ${1 / r} times its initial volume`;
      const ask = R.pick(['T', 'P', 'Pfac', 'W']);
      const stem = raw`An ideal ${gas} gas ($\gamma = ${gn}/${gd}$) initially at `;
      if (ask === 'T') {
        const T1 = comp ? R.pick([100, 150, 200, 250, 300, 400]) : R.pick([400, 600, 800, 1200, 1600]);
        return {
          q: stem + raw`$${T1}\,\text{K}$ is ${vtxt} in a reversible adiabatic process. What is its final temperature?`,
          ...GRE.numeric(R, T1 * tf, [T1, T1 * r, T1 * Math.pow(r, gn === 5 ? 0.4 : 2 / 3), T1 * Math.pow(r, g), T1 * Math.pow(r, 1 / g)], { unit: raw`\text{K}`, sig: 3 }),
          expl: raw`$TV^{\gamma - 1}$ is constant, so $T_2 = T_1 (V_1/V_2)^{\gamma - 1} = ${T1}\times(${fx(r)})^{${gn - gd}/${gd}} = ${F.num(T1 * tf, 3)}\,\text{K}$.`,
        };
      }
      if ((ask === 'P' || ask === 'Pfac') && exq(pf) != null) {
        return {
          q: stem + raw`pressure $P_0$ is ${vtxt} in a reversible adiabatic process. What is its final pressure?`,
          ...exactMC(R, pf, [r, tf, Math.pow(r, gn === 5 ? 1.4 : 5 / 3), 1 / pf, pf / r, r * r], 'P_0', { positive: true }),
          expl: raw`$PV^\gamma$ is constant, so $P = P_0 (V_1/V_2)^{\gamma} = (${fx(r)})^{${gn}/${gd}}P_0 = ${cs(pf, 'P_0')}$. The isothermal answer would be $${cs(r, 'P_0')}$.`,
        };
      }
      const n = R.pick([1, 2, 3]), T1 = comp ? R.pick([200, 250, 300, 400]) : R.pick([400, 600, 800, 1200]);
      const cv = gn === 5 ? 1.5 : 2.5;
      const W = n * cv * C.R * T1 * Math.abs(tf - 1);
      return {
        q: raw`$${n}\,\text{mol}$ of an ideal ${gas} gas ($\gamma = ${gn}/${gd}$) initially at $${T1}\,\text{K}$ is ${vtxt} in a reversible adiabatic process. How much work is done ${comp ? 'on' : 'by'} the gas? (Take $R = 8.3\,\text{J/(mol}\cdot\text{K)}$.)`,
        ...GRE.numeric(R, W, [n * C.R * T1 * Math.abs(tf - 1), n * (cv + 1) * C.R * T1 * Math.abs(tf - 1), n * C.R * T1 * Math.log(comp ? r : 1 / r), n * cv * C.R * T1 * tf], { unit: raw`\text{J}` }),
        expl: raw`With $Q = 0$, $|W| = |\Delta U| = nC_V|\Delta T|$. Here $T_2 = ${F.num(T1 * tf, 3)}\,\text{K}$ (from $TV^{\gamma-1} = $ const), so $|W| = ${n}(${fx(cv)})(8.3)(${F.num(Math.abs(T1 * tf - T1), 3)}) \approx ${F.num(W, 2)}\,\text{J}$.`,
      };
    },
  });

  L.push({
    id: 'thermo.proc.isobaric', sec: '4.2.3', level: 2,
    gen(R) {
      const [gas, f] = R.pick([['monatomic', 3], ['diatomic', 5]]);
      const ask = R.weighted(['frac', 'Q', 'W', 'dU', 'ratio'], [2, 2, 1, 1, 1]);
      if (ask === 'frac' || ask === 'ratio') {
        if (ask === 'frac') {
          const which = R.pick(['work', 'internal']);
          const c = which === 'work' ? [2, f + 2] : [f, f + 2];
          return {
            q: raw`Heat is added to an ideal ${gas} gas${f === 5 ? ' (vibrations frozen out)' : ''} at constant pressure. What fraction of the heat goes into ${which === 'work' ? 'work done by the gas' : 'the internal energy of the gas'}?`,
            ...fracMC(R, c, [[c[1] - c[0], c[1]], [2, f], [f, 2 * f], [1, 2], [1, 1], [0, 1], [2, f + 4]]),
            expl: raw`$Q = nC_P\Delta T = \tfrac{${f + 2}}{2}nR\Delta T$, $W = P\Delta V = nR\Delta T$ and $\Delta U = \tfrac{${f}}{2}nR\Delta T$. So the fraction is $${F.frac(c[0], c[1])}$.`,
          };
        }
        return {
          q: raw`The same amount of an ideal ${gas} gas is heated through the same temperature rise once at constant pressure and once at constant volume. What is the ratio $Q_P/Q_V$ of the heats required?`,
          ...fracMC(R, [f + 2, f], [[f, f + 2], [1, 1], [f + 4, f + 2], [2, 1], [(8 - f) + 2, 8 - f]]),
          expl: raw`$Q_P/Q_V = C_P/C_V = \gamma = ${F.frac(f + 2, f)}$: at constant pressure some heat goes into expansion work.`,
        };
      }
      const n = R.pick([1, 2, 3, 4, 0.5]), dT = R.pick([10, 20, 25, 40, 50, 100]);
      const vals = { Q: (f + 2) / 2, W: 1, dU: f / 2 };
      const k = vals[ask];
      const val = k * n * C.R * dT;
      return {
        q: raw`$${F.num(n)}\,\text{mol}$ of an ideal ${gas} gas${f === 5 ? ' (vibrations frozen out)' : ''} is heated at constant pressure so that its temperature rises by $${dT}\,\text{K}$. ${{ Q: 'How much heat is absorbed by the gas?', W: 'How much work does the gas do?', dU: 'By how much does its internal energy increase?' }[ask]} (Take $R = 8.3\,\text{J/(mol}\cdot\text{K)}$.)`,
        ...GRE.numeric(R, val, Object.values(vals).filter(x => x !== k).map(x => x * n * C.R * dT).concat([(f + 4) / 2 * n * C.R * dT, (f - 2) / 2 * n * C.R * dT].filter(x => x > 0)), { unit: raw`\text{J}` }),
        expl: raw`At constant $P$: $Q = nC_P\Delta T$, $W = nR\Delta T$, $\Delta U = nC_V\Delta T$ with $C_V = \tfrac{${f}}{2}R$, $C_P = \tfrac{${f + 2}}{2}R$. So the answer is $${k === 1 ? '' : fx(k)}(${F.num(n)})(8.3)(${dT}) \approx ${F.num(val, 2)}\,\text{J}$.`,
      };
    },
  });

  L.push({
    id: 'thermo.proc.identify', sec: '4.2.3', level: 1, weight: 2,
    gen(R) {
      if (R.bool(0.6)) {
        return romanQ(R, 'An ideal gas undergoes the processes described below. Which of the following statements is (are) true?',
          [['In a reversible isothermal expansion, the heat absorbed equals the work done by the gas.', '$\\Delta U = 0$ at constant $T$.'],
            ['In a constant-volume process, the gas does no work.', '$W = \\int P\\,dV = 0$.'],
            ['In a reversible adiabatic expansion, the temperature of the gas decreases.', 'the work is paid for out of $U$.'],
            ['In a constant-pressure expansion, the gas absorbs heat.', '$Q = nC_P\\Delta T > 0$ since $T \\propto V$ rises.'],
            ['In a free expansion into vacuum, the temperature of the gas is unchanged.', '$Q = W = 0$, so $\\Delta U = 0$.'],
            ['In a reversible isothermal compression, the gas gives off heat.', '$Q = W < 0$.'],
            ['In a reversible adiabatic process, the entropy of the gas is constant.', 'reversible and $\\delta Q = 0$ means $dS = 0$.'],
            ['In a free expansion into vacuum, the entropy of the gas increases.', 'it is irreversible; $\\Delta S = nR\\ln(V_f/V_i)$.']],
          [['In a reversible isothermal expansion, the internal energy of the gas increases.', '$U$ depends only on $T$ for an ideal gas.'],
            ['In a reversible adiabatic compression, the temperature of the gas decreases.', 'work done on the gas raises $T$.'],
            ['In a free expansion into vacuum, the gas does positive work.', 'there is nothing to push against: $W = 0$.'],
            ['In a constant-volume heating, the work done by the gas equals the heat absorbed.', '$W = 0$; all the heat goes into $U$.'],
            ['In a constant-pressure compression, the gas absorbs heat.', '$T$ falls, so $Q = nC_P\\Delta T < 0$.'],
            ['In a free expansion into vacuum, the entropy of the gas is unchanged because no heat is exchanged.', '$\\Delta S = \\int\\delta Q/T$ only for reversible paths.'],
            ['In a reversible isothermal expansion, no heat is exchanged.', 'heat $Q = W > 0$ must be absorbed to keep $T$ fixed.']]);
      }
      const P = ['a reversible isothermal expansion', 'a constant-pressure expansion', 'a constant-volume heating', 'a reversible adiabatic expansion', 'a free expansion into vacuum'];
      const Qs = [
        ['$Q = 0$ but the gas does nonzero work', 3, 'Adiabatic means $Q = 0$; only the reversible expansion does work ($W = -\\Delta U > 0$). The free expansion has $W = 0$.'],
        ['the gas does no work but absorbs heat', 2, 'At constant volume $W = 0$ and $Q = \\Delta U = nC_V\\Delta T > 0$.'],
        ['the internal energy is unchanged but heat is absorbed', 0, 'At constant $T$, $\\Delta U = 0$ and $Q = W > 0$. The free expansion also has $\\Delta U = 0$ but absorbs no heat.'],
        ['$Q$, $W$ and $\\Delta U$ are all positive', 1, 'At constant $P$, expansion raises $T$: $W = P\\Delta V > 0$, $\\Delta U > 0$ and $Q = \\Delta U + W > 0$.'],
        ['$Q = W = \\Delta U = 0$ but the entropy increases', 4, 'A free expansion exchanges no heat, does no work, leaves $T$ unchanged, and is irreversible, so $\\Delta S = nR\\ln(V_f/V_i) > 0$.'],
        ['the temperature falls although no heat leaves the gas', 3, 'In a reversible adiabatic expansion the gas does work at the expense of its internal energy, so $T$ drops with $Q = 0$.'],
      ];
      const [cond, k, why] = R.pick(Qs);
      const pre = R.pick(['an ideal gas', 'a fixed amount of an ideal gas']);
      return {
        q: `For ${pre}, in which of the following processes is it true that ${cond}?`,
        ...txtMC(R, P[k].charAt(0).toUpperCase() + P[k].slice(1), P.filter((_, i) => i !== k).map(x => x.charAt(0).toUpperCase() + x.slice(1))),
        expl: why,
      };
    },
  });

  L.push({
    id: 'thermo.proc.freeexp', sec: '4.2.3', level: 2,
    gen(R) {
      const r = R.pick([2, 3, 4, 5, 10]);
      const n = R.pick([0.5, 1, 2, 3, 4]);
      const T = R.pick([250, 300, 350, 400, 500]);
      const ask = R.weighted(['S', 'T', 'Ssym', 'recompress'], [3, 1, 2, 2]);
      const setup = R.pick([
        `$${F.num(n)}\\,\\text{mol}$ of an ideal gas at $${T}\\,\\text{K}$ is confined to one part of a thermally insulated, rigid container; the rest is evacuated. The partition is punctured and the gas fills the whole container, whose volume is ${r} times the gas's initial volume.`,
        `An insulated, rigid box of volume $${r}V$ has $${F.num(n)}\\,\\text{mol}$ of an ideal gas at $${T}\\,\\text{K}$ confined to a region of volume $V$, with vacuum in the remainder. A valve opens and the gas expands freely to fill the box.`,
      ]);
      if (ask === 'T') {
        return {
          q: setup + ' What is the final temperature of the gas once it reaches equilibrium?',
          ...GRE.numeric(R, T, [T / r, T * Math.pow(1 / r, 2 / 3), T * Math.pow(1 / r, 0.4), T * r], { unit: raw`\text{K}`, sig: 3 }),
          expl: raw`Free expansion: $Q = 0$ (insulated) and $W = 0$ (no external pressure), so $\Delta U = 0$. For an ideal gas $U$ depends only on $T$, so $T$ stays at $${T}\,\text{K}$. Using $TV^{\gamma-1} = $ const is wrong: the process is not reversible.`,
        };
      }
      if (ask === 'Ssym') {
        const corr = `Nk_B\\ln ${r}`;
        return {
          q: raw`An ideal gas of $N$ molecules, initially in volume $V$ inside a thermally insulated container, expands freely into vacuum until it occupies volume $${r}V$. What is the change in the entropy of the gas?`,
          ...symMC(R, corr, ['0', `\\dfrac{3}{2}Nk_B\\ln ${r}`, `-Nk_B\\ln ${r}`, `${r - 1}Nk_B`, `Nk_B\\ln ${r + 1}`, `k_B\\ln ${r}`]),
          expl: raw`Entropy is a state function, so evaluate it along a reversible isothermal path between the same end states: $\Delta S = Nk_B\ln(V_f/V_i) = ${corr}$. The answer is not zero even though $Q = 0$, because the process is irreversible.`,
        };
      }
      const dS = n * C.R * Math.log(r);
      if (ask === 'S') {
        return {
          q: setup + ` What is the change in entropy of the gas? (Take $R = 8.3\\,\\text{J/(mol}\\cdot\\text{K)}$ and $\\ln ${r} \\approx ${LN[r]}$.)`,
          ...valMC(R, [`${F.num(dS, 2)}\\,\\text{J/K}`, dS], [[`0`, 0], [`${F.num(1.5 * dS, 2)}\\,\\text{J/K}`, 1.5 * dS], [`${F.num(n * C.R * (r - 1), 2)}\\,\\text{J/K}`, n * C.R * (r - 1)], [`${F.num(-dS, 2)}\\,\\text{J/K}`, -dS], [`${F.num(dS * T / 100, 2)}\\,\\text{J/K}`, dS * T / 100], [`${F.num(dS / 2, 2)}\\,\\text{J/K}`, dS / 2]]),
          expl: raw`Use a reversible isothermal path between the same states: $\Delta S = nR\ln(V_f/V_i) = ${F.num(n)}(8.3)(${LN[r]}) \approx ${F.num(dS, 2)}\,\text{J/K}$. "$Q = 0$ so $\Delta S = 0$" is the trap.`,
        };
      }
      const Q = n * C.R * T * Math.log(r);
      return {
        q: setup + ` The gas is then compressed reversibly and isothermally back to its original volume. How much heat must be removed from the gas during the compression? (Take $R = 8.3\\,\\text{J/(mol}\\cdot\\text{K)}$ and $\\ln ${r} \\approx ${LN[r]}$.)`,
        ...GRE.numeric(R, Q, [n * C.R * T * (r - 1), 1.5 * n * C.R * T * Math.log(r), n * C.R * Math.log(r), n * C.R * T], { unit: raw`\text{J}` }),
        expl: raw`The free expansion leaves $T = ${T}\,\text{K}$. The isothermal compression has $\Delta U = 0$, so the heat removed equals the work done on the gas: $nRT\ln ${r} \approx ${F.num(Q, 2)}\,\text{J}$. This dumps entropy $nR\ln ${r}$ into the surroundings, the entropy created in the free expansion.`,
      };
    },
  });

  L.push({
    id: 'thermo.proc.pvwork', sec: '4.2.3', level: 2, weight: 2,
    gen(R) {
      const shape = R.pick(['rect', 'tri', 'tri', 'edge']);
      const V1 = R.int(1, 4), V2 = V1 + R.int(1, 5);
      const P1 = R.step(100, 300, 50), P2 = P1 + R.step(100, 400, 50);
      let pts;
      if (shape === 'rect' || shape === 'edge') pts = [[V1, P1], [V1, P2], [V2, P2], [V2, P1]];
      else pts = R.pick([[[V1, P1], [V1, P2], [V2, P1]], [[V1, P1], [V2, P2], [V2, P1]], [[V1, P2], [V2, P2], [V2, P1]], [[V1, P1], [V1, P2], [V2, P2]]]);
      if (R.bool()) pts = pts.slice().reverse();
      const rot = R.int(0, pts.length - 1);
      pts = pts.slice(rot).concat(pts.slice(0, rot));
      const names = ['A', 'B', 'C', 'D'].slice(0, pts.length);
      let As = 0;
      for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; As += a[0] * b[1] - b[0] * a[1]; }
      As /= 2;
      const W = -As; // kPa*L = J
      const coords = pts.map((p, i) => `${names[i]} $(${p[0]}\\,\\text{L},\\ ${p[1]}\\,\\text{kPa})$`).join(', ');
      const fig = cycleFig(pts, names, ['V', 'P']);
      const path = names.join(' → ') + ' → A';
      if (shape === 'edge') {
        const i = R.int(0, 3), a = pts[i], b = pts[(i + 1) % 4];
        const We = (a[1] + b[1]) / 2 * (b[0] - a[0]);
        if (We === 0) {
          return {
            q: raw`An ideal gas is taken around the cycle ${path} shown in the $P$–$V$ diagram, with ${coords}. How much work is done by the gas during the step ${names[i]} → ${names[(i + 1) % 4]}?`,
            ...valMC(R, ['0', 0], [[`${(b[1] - a[1]) * a[0]}\\,\\text{J}`, (b[1] - a[1]) * a[0]], [`${-(b[1] - a[1]) * a[0]}\\,\\text{J}`, -(b[1] - a[1]) * a[0]], [`${Math.abs(W)}\\,\\text{J}`, Math.abs(W)], [`${-Math.abs(W)}\\,\\text{J}`, -Math.abs(W)]]),
            expl: raw`Step ${names[i]} → ${names[(i + 1) % 4]} is at constant volume, so $W = \int P\,dV = 0$ (the pressure change is due to heating or cooling).`,
            fig,
          };
        }
        return {
          q: raw`An ideal gas is taken around the cycle ${path} shown in the $P$–$V$ diagram, with ${coords}. How much work is done by the gas during the step ${names[i]} → ${names[(i + 1) % 4]}? ($1\,\text{kPa}\cdot\text{L} = 1\,\text{J}$.)`,
          ...GRE.numeric(R, We, [-We, W, -W, a[1] * a[0] - b[1] * b[0], (b[0] - a[0]) * (a[1] === P1 ? P2 : P1)], { unit: raw`\text{J}`, allowSign: true, fmt: x => String(Math.round(x)), tol: 0.05 }),
          expl: raw`At constant pressure $W = P\Delta V = (${a[1]}\,\text{kPa})(${b[0] - a[0]}\,\text{L}) = ${We}\,\text{J}$${We < 0 ? ' (negative: the gas is compressed)' : ''}.`,
          fig,
        };
      }
      const ask = R.pick(['W', 'Q']);
      const area = Math.abs(W);
      return {
        q: raw`An ideal gas is taken around the cycle ${path} shown in the $P$–$V$ diagram, with ${coords}. What is the ${ask === 'W' ? 'net work done by the gas' : 'net heat absorbed by the gas'} in one cycle? ($1\,\text{kPa}\cdot\text{L} = 1\,\text{J}$.)`,
        ...GRE.numeric(R, W, [-W, shape === 'tri' ? 2 * W : W / 2, (P2 - P1) * V2 * Math.sign(W), P2 * (V2 - V1) * Math.sign(W), 0.5 * W], { unit: raw`\text{J}`, allowSign: true, fmt: x => String(Math.round(x)), tol: 0.05 }),
        expl: raw`The net work equals the enclosed area, ${shape === 'tri' ? raw`$\tfrac12(${V2 - V1}\,\text{L})(${P2 - P1}\,\text{kPa}) = ${area}\,\text{J}$` : raw`$(${V2 - V1}\,\text{L})(${P2 - P1}\,\text{kPa}) = ${area}\,\text{J}$`}, positive for a clockwise cycle and negative for counterclockwise. This cycle is ${W > 0 ? 'clockwise' : 'counterclockwise'}, so $W = ${W}\,\text{J}$.${ask === 'Q' ? ' Over a full cycle $\\Delta U = 0$, so $Q_{\\text{net}} = W$.' : ''}`,
        fig,
      };
    },
  });

  L.push({
    id: 'thermo.proc.compare', sec: '4.2.3', level: 2,
    gen(R) {
      const ex = R.bool();
      const QS = ex ? [
        ['the work done by the gas', ['P', 'T', 'S'], 'The isobaric path stays at the highest pressure, and the adiabat falls fastest ($P \\propto V^{-\\gamma}$), so the area under it is smallest.'],
        ['the final temperature', ['P', 'T', 'S'], 'Isobaric: $T$ doubles with $V$; isothermal: unchanged; adiabatic: $T$ falls as the gas does work at the expense of $U$.'],
        ['the final pressure', ['P', 'T', 'S'], 'Isobaric: $P_0$; isothermal: $P_0/2$; adiabatic: $P_0/2^\\gamma$.'],
        ['the heat absorbed by the gas', ['P', 'T', 'S'], 'Isobaric: $nC_P\\Delta T > W$; isothermal: $Q = W = nRT\\ln 2$; adiabatic: $Q = 0$.'],
      ] : [
        ['the work done on the gas', ['S', 'T', 'P'], 'In compression the adiabat rises most steeply ($P \\propto V^{-\\gamma}$), so the area under it is largest; the isobar stays at $P_0$, the lowest.'],
        ['the final temperature', ['S', 'T', 'P'], 'Adiabatic: $T$ rises because work is done on the gas; isothermal: unchanged; isobaric: $T$ halves with $V$.'],
        ['the final pressure', ['S', 'T', 'P'], 'Adiabatic: $2^\\gamma P_0$; isothermal: $2P_0$; isobaric: $P_0$.'],
      ];
      const [qty, order, why] = R.pick(QS);
      const name = { P: 'isobaric', T: 'isothermal', S: 'adiabatic' };
      const sym = { P: 'P', T: 'T', S: 'A' };
      const perm = o => `$${sym[o[0]]} > ${sym[o[1]]} > ${sym[o[2]]}$`;
      const all = [['P', 'T', 'S'], ['P', 'S', 'T'], ['T', 'P', 'S'], ['T', 'S', 'P'], ['S', 'P', 'T'], ['S', 'T', 'P']];
      const corr = perm(order);
      return {
        q: raw`A sample of ideal gas starts at pressure $P_0$, volume $V_0$ and temperature $T_0$. In three separate experiments it is ${ex ? 'expanded' : 'compressed'} reversibly to volume ${ex ? '$2V_0$' : '$V_0/2$'}: at constant pressure (P), at constant temperature (T), and adiabatically (A). How do the three processes rank in ${qty}?`,
        ...txtMC(R, corr, all.map(perm).filter(x => x !== corr)),
        expl: why + ` Ranking: ${corr}.`,
      };
    },
  });

  L.push({
    id: 'thermo.proc.heatentropy', sec: '4.2.3', level: 2,
    gen(R) {
      const Cp = R.pick([50, 100, 200, 400, 500, 1000, 2000]);
      const [T1, r] = R.pick([[300, 2], [200, 2], [250, 2], [150, 2], [300, 3], [100, 3], [200, 3], [100, 4], [150, 4], [100, 5]]);
      const T2 = T1 * r;
      const ln = +LN[r];
      const ask = R.pick(['body', 'res', 'tot']);
      const [obj, short] = R.pick([['a block of metal', 'block'], ['a container of liquid', 'liquid'], ['a copper sphere', 'sphere'], ['a stone', 'stone']]);
      const dSb = Cp * ln, dSr = -Cp * (T2 - T1) / T2;
      const stem = raw`${obj.charAt(0).toUpperCase() + obj.slice(1)} with constant heat capacity $${Cp}\,\text{J/K}$, initially at $${T1}\,\text{K}$, is placed in contact with a large reservoir at $${T2}\,\text{K}$ and comes to equilibrium with it. ${lnHint(r)} `;
      if (ask === 'body') {
        return {
          q: stem + `What is the entropy change of the ${short}?`,
          ...GRE.numeric(R, dSb, [Cp * (T2 - T1) / T2, Cp * (T2 - T1) / T1, Cp * r, Cp * (T2 - T1) / (T1 + T2) * 4], { unit: raw`\text{J/K}` }),
          expl: raw`Along a reversible path, $dS = C\,dT/T$, so $\Delta S = C\ln(T_2/T_1) = ${Cp}\times ${LN[r]} \approx ${F.num(dSb, 2)}\,\text{J/K}$.`,
        };
      }
      if (ask === 'res') {
        return {
          q: stem + 'What is the entropy change of the reservoir?',
          ...GRE.numeric(R, dSr, [-dSr, -dSb, -Cp * (T2 - T1) / T1, dSb + dSr], { unit: raw`\text{J/K}`, allowSign: true }),
          expl: raw`The reservoir gives up $Q = C(T_2 - T_1) = ${Cp * (T2 - T1)}\,\text{J}$ at fixed $T_2$: $\Delta S = -Q/T_2 \approx ${F.num(dSr, 2)}\,\text{J/K}$.`,
        };
      }
      return {
        q: stem + 'What is the total entropy change of the body plus reservoir?',
        ...GRE.numeric(R, dSb + dSr, [dSb, -dSr, dSb - dSr, Cp * (T2 - T1) / T1 + dSr], { unit: raw`\text{J/K}` }),
        expl: raw`$\Delta S_{\text{body}} = C\ln(T_2/T_1) \approx ${F.num(dSb, 2)}\,\text{J/K}$ and $\Delta S_{\text{res}} = -C(T_2 - T_1)/T_2 \approx ${F.num(dSr, 2)}\,\text{J/K}$; the total is $\approx ${F.num(dSb + dSr, 2)}\,\text{J/K} > 0$, as required for irreversible heat flow.`,
      };
    },
  });

  // ================================================================== 4.2.4 Relations between thermodynamic variables
  const pd = (a, b, c) => `\\left(\\dfrac{\\partial ${a}}{\\partial ${b}}\\right)_{${c}}`;
  L.push({
    id: 'thermo.rel.maxwell', sec: '4.2.4', level: 3,
    gen(R) {
      // Maxwell relations: [lhs, rhs, sign, potential]
      const MX = [
        [['T', 'V', 'S'], ['P', 'S', 'V'], -1, 'U(S,V)', 'dU = T\\,dS - P\\,dV'],
        [['T', 'P', 'S'], ['V', 'S', 'P'], 1, 'H(S,P)', 'dH = T\\,dS + V\\,dP'],
        [['S', 'V', 'T'], ['P', 'T', 'V'], 1, 'F(T,V)', 'dF = -S\\,dT - P\\,dV'],
        [['S', 'P', 'T'], ['V', 'T', 'P'], -1, 'G(T,P)', 'dG = -S\\,dT + V\\,dP'],
      ];
      const v = R.weighted(['rel', 'gas'], [3, 1]);
      if (v === 'gas') {
        const [what, corr, wr, why] = R.pick([
          [pd('S', 'V', 'T'), '\\dfrac{nR}{V}', ['-\\dfrac{nR}{V}', '\\dfrac{nR}{P}', '-\\dfrac{nR}{P}', '0', '\\dfrac{nRT}{V}'], '$(\\partial S/\\partial V)_T = (\\partial P/\\partial T)_V = nR/V$ from $P = nRT/V$.'],
          [pd('S', 'P', 'T'), '-\\dfrac{nR}{P}', ['\\dfrac{nR}{P}', '\\dfrac{nR}{V}', '-\\dfrac{nR}{V}', '0', '-\\dfrac{V}{T}\\cdot\\dfrac{1}{P^2}'], '$(\\partial S/\\partial P)_T = -(\\partial V/\\partial T)_P = -nR/P$ from $V = nRT/P$.'],
        ]);
        return {
          q: raw`For $n$ moles of an ideal gas, use a Maxwell relation to find $${what}$.`,
          ...symMC(R, corr, wr),
          expl: why + ' Entropy increases on isothermal expansion and decreases on isothermal compression.',
        };
      }
      const k = R.int(0, 3);
      const [l, r, sg, pot, dif] = MX[k];
      const flip = R.bool();
      const A = flip ? r : l, B = flip ? l : r;
      const corr = (sg < 0 ? '-' : '') + pd(...B);
      const wr = [
        (sg < 0 ? '' : '-') + pd(...B),
        (sg < 0 ? '-' : '') + pd(B[1], B[0], B[2]),
        (sg < 0 ? '-' : '') + pd(B[0], B[1], A[1]),
      ];
      for (const [l2, r2, s2] of MX) {
        if (l2 === l) continue;
        for (const X of [l2, r2]) { if (X[0] !== A[0] || X[1] !== A[1]) wr.push(pd(...X), '-' + pd(...X)); }
      }
      return {
        q: raw`Which of the following is equal to $${pd(...A)}$?`,
        ...symMC(R, corr, [wr[0]].concat(R.shuffle(wr.slice(1).filter(w => w !== corr))), { keep: 1 }),
        expl: raw`From $${dif}$ (the potential $${pot}$), equality of mixed second derivatives gives $${pd(...l)} = ${sg < 0 ? '-' : ''}${pd(...r)}$.`,
      };
    },
  });

  L.push({
    id: 'thermo.rel.potentials', sec: '4.2.4', level: 2,
    gen(R) {
      const D = { U: 'T\\,dS - P\\,dV', H: 'T\\,dS + V\\,dP', F: '-S\\,dT - P\\,dV', G: '-S\\,dT + V\\,dP' };
      const NAME = { U: 'internal energy $U$', H: 'enthalpy $H = U + PV$', F: 'Helmholtz free energy $F = U - TS$', G: 'Gibbs free energy $G = U - TS + PV$' };
      const v = R.pick(['diff', 'min', 'deriv', 'deriv', 'phys']);
      if (v === 'diff') {
        const k = R.pick(['U', 'H', 'F', 'G']);
        const wr = Object.keys(D).filter(x => x !== k).map(x => `d${k} = ${D[x]}`).concat([`d${k} = ${D[k].startsWith('-') ? D[k].slice(1) : '-' + D[k]}`, `d${k} = S\\,dT + P\\,dV`]);
        return {
          q: `For a simple compressible system with fixed particle number, the differential of the ${NAME[k]} is`,
          ...symMC(R, `d${k} = ${D[k]}`, wr),
          expl: raw`Start from $dU = T\,dS - P\,dV$ and Legendre-transform: $H = U + PV$ swaps $-P\,dV \to +V\,dP$; $F = U - TS$ swaps $T\,dS \to -S\,dT$; $G$ does both. So $d${k} = ${D[k]}$.`,
        };
      }
      if (v === 'min') {
        const [cond, k] = R.pick([['constant temperature and volume', 'F'], ['constant temperature and pressure', 'G'], ['constant entropy and volume', 'U'], ['constant entropy and pressure', 'H']]);
        const NM = { U: 'The internal energy $U$', H: 'The enthalpy $H$', F: 'The Helmholtz free energy $F$', G: 'The Gibbs free energy $G$' };
        return {
          q: `A system is held at ${cond} (with fixed particle number) and allowed to come to equilibrium. Which quantity is minimized at equilibrium?`,
          ...txtMC(R, NM[k], Object.keys(NM).filter(x => x !== k).map(x => NM[x]).concat(['The entropy $S$'])),
          expl: raw`The natural variables of $${k}$ are those held fixed ($d${k} = ${D[k]}$), and at fixed natural variables the corresponding potential is minimized in equilibrium. (Entropy is maximized, not minimized, for an isolated system.)`,
        };
      }
      if (v === 'deriv') {
        const DV = [['S', '-' + pd('F', 'T', 'V'), ['F', 'T', 'V'], '-', 'dF = -S\\,dT - P\\,dV'], ['S', '-' + pd('G', 'T', 'P'), null, '-', 'dG = -S\\,dT + V\\,dP'], ['P', '-' + pd('F', 'V', 'T'), null, '-', 'dF = -S\\,dT - P\\,dV'], ['P', '-' + pd('U', 'V', 'S'), null, '-', 'dU = T\\,dS - P\\,dV'], ['T', pd('U', 'S', 'V'), null, '', 'dU = T\\,dS - P\\,dV'], ['T', pd('H', 'S', 'P'), null, '', 'dH = T\\,dS + V\\,dP'], ['V', pd('G', 'P', 'T'), null, '', 'dG = -S\\,dT + V\\,dP'], ['V', pd('H', 'P', 'S'), null, '', 'dH = T\\,dS + V\\,dP']];
        const [x, corr, , , dif] = R.pick(DV);
        const wr = DV.filter(d => d[0] !== x).map(d => d[1]).concat(DV.filter(d => d[0] === x && d[1] !== corr).map(d => (d[1].startsWith('-') ? d[1].slice(1) : '-' + d[1])), [corr.startsWith('-') ? corr.slice(1) : '-' + corr]);
        return {
          q: raw`Which of the following is equal to $${x}$?`,
          ...symMC(R, corr, R.shuffle(wr).slice(0, 6)),
          expl: raw`Read it off $${dif}$: the coefficient of each differential is a partial derivative of the potential. Hence $${x} = ${corr}$.`,
        };
      }
      const [stmt, corr, wrs, why] = R.pick([
        ['The heat absorbed by a system in a reversible process at constant pressure equals the change in its', 'enthalpy', ['internal energy', 'Helmholtz free energy', 'Gibbs free energy', 'entropy'], 'At constant $P$, $dH = T\\,dS = \\delta Q$.'],
        ['The heat absorbed by a system in a reversible process at constant volume equals the change in its', 'internal energy', ['enthalpy', 'Helmholtz free energy', 'Gibbs free energy', 'entropy'], 'At constant $V$, $dU = T\\,dS = \\delta Q$.'],
        ['The maximum work a system can do in a process at constant temperature equals the decrease in its', 'Helmholtz free energy', ['internal energy', 'enthalpy', 'entropy', 'temperature'], 'At constant $T$, $dF = -P\\,dV$ for a reversible process, so $W_{\\max} = -\\Delta F$.'],
        ['In the canonical ensemble, the quantity $-k_BT\\ln Z$ is the', 'Helmholtz free energy', ['internal energy', 'enthalpy', 'Gibbs free energy', 'entropy'], '$F = -k_BT\\ln Z$; then $S = -\\partial F/\\partial T$ and $P = -\\partial F/\\partial V$.'],
        ['For two phases of a pure substance coexisting at fixed temperature and pressure, the quantity that is equal per particle in both phases is the', 'Gibbs free energy', ['internal energy', 'enthalpy', 'entropy', 'Helmholtz free energy'], 'Phase equilibrium at fixed $T$, $P$ requires equal chemical potentials, i.e. equal Gibbs free energy per particle.'],
      ]);
      return { q: stmt, ...txtMC(R, corr, wrs), expl: why };
    },
  });

  L.push({
    id: 'thermo.rel.fundamental', sec: '4.2.4', level: 3,
    gen(R) {
      const v = R.pick(['SUV', 'SUV', 'USV']);
      if (v === 'SUV') {
        const [al, be] = R.pick([[1, 2, 1, 2], [3, 4, 1, 4], [3, 5, 2, 5], [1, 3, 1, 3], [1, 3, 2, 3], [2, 3, 1, 3], [1, 4, 3, 4], [2, 5, 3, 5], [1, 2, 1, 4]].map(a => [[a[0], a[1]], [a[2], a[3]]]));
        const ask = R.pick(['P', 'T']);
        const A = R.pick(['A', 'c', 'K']);
        const ex = (f) => F.fracI(f[0], f[1]);
        const stem = raw`A system has the fundamental relation $S = ${A}\,U^{${ex(al)}}V^{${ex(be)}}$ (fixed particle number, $${A}$ a positive constant). `;
        const a = al[0] / al[1], b = be[0] / be[1];
        if (ask === 'P') {
          const X = b / a;
          return {
            q: stem + 'Using $dS = dU/T + (P/T)\\,dV$, which relation between its pressure $P$, energy $U$ and volume $V$ follows?',
            ...valMC(R, [`PV = ${cs(X, 'U')}`, X], [[`PV = ${cs(a / b, 'U')}`, a / b], [`PV = ${cs(b, 'U')}`, b + 1e-6], [`PV = ${cs(a, 'U')}`, a + 2e-6], ['PV = U', 1 + 3e-6], [`PV = ${cs(a * b, 'U')}`, a * b + 4e-6], [`PV = ${cs(2 / 3, 'U')}`, 2 / 3 + 5e-6], [`PV = ${cs(1 / a, 'U')}`, 1 / a + 6e-6], [`PV = ${cs(a + b, 'U')}`, a + b + 7e-6]].filter(w => !close(w[1], X) && !(w[0] === `PV = ${cs(X, 'U')}`)), { shuffle: true }),
            expl: raw`$1/T = \partial S/\partial U = ${fx(a)}\,S/U$ and $P/T = \partial S/\partial V = ${fx(b)}\,S/V$. Dividing, $P = \dfrac{${fx(b)}}{${fx(a)}}\dfrac{U}{V}$, i.e. $PV = ${cs(X, 'U')}$.${close(X, 1 / 3) ? ' (This is the photon-gas relation $P = u/3$.)' : close(X, 2 / 3) ? ' (Same as a monatomic ideal gas.)' : ''}`,
          };
        }
        return {
          q: stem + 'What is its temperature $T$ in terms of $U$ and $S$?',
          ...valMC(R, [`T = ${cs(1 / a, '\\dfrac{U}{S}')}`, 1 / a], [[`T = ${cs(a, '\\dfrac{U}{S}')}`, a + 1e-6], [`T = ${cs(1 / b, '\\dfrac{U}{S}')}`, 1 / b + 2e-6], ['T = \\dfrac{U}{S}', 1 + 3e-6], [`T = ${cs(1 / a, '\\dfrac{S}{U}')}`, -1], [`T = ${cs(b / a, '\\dfrac{U}{S}')}`, b / a + 4e-6], [`T = ${cs(1 / (a + b), '\\dfrac{U}{S}')}`, 1 / (a + b) + 5e-6], [`T = ${cs(2 / a, '\\dfrac{U}{S}')}`, 2 / a + 6e-6]].filter(w => !close(w[1], 1 / a)), { shuffle: true }),
          expl: raw`$\dfrac{1}{T} = \left(\dfrac{\partial S}{\partial U}\right)_V = ${fx(a)}\,\dfrac{S}{U}$, so $T = ${cs(1 / a, '\\dfrac{U}{S}')}$.`,
        };
      }
      const [p, q] = R.pick([[2, 1], [3, 1], [3, 2], [4, 3], [5, 3], [2, 3], [4, 1], [3, 4]].map(x => [x[0], x[1]]));
      const [qn, qd] = R.pick([[1, 1], [2, 1], [1, 3], [2, 3], [1, 2]]);
      const qq = qn / qd;
      const ask = R.pick(['P', 'T']);
      const stem = raw`The internal energy of a system is $U(S, V) = \alpha\,S^{${F.fracI(p, q)}}V^{-${F.fracI(qn, qd)}}$, with $\alpha$ a positive constant and fixed particle number. `;
      const pe = p / q;
      if (ask === 'P') {
        return {
          q: stem + 'What is the pressure?',
          ...valMC(R, [cs(qq, '\\dfrac{U}{V}'), qq], [[cs(pe, '\\dfrac{U}{V}'), pe + 1e-6], [cs(qq, '\\dfrac{U}{S}'), -1], ['-' + cs(qq, '\\dfrac{U}{V}'), -qq], [cs(qq + 1, '\\dfrac{U}{V}'), qq + 1], [cs(1 / qq, '\\dfrac{U}{V}'), 1 / qq + 2e-6], [cs(pe, '\\dfrac{U}{S}'), -2]].filter(w => !close(w[1], qq)), { shuffle: true }),
          expl: raw`$P = -(\partial U/\partial V)_S = ${fx(qq)}\,\alpha S^{${F.fracI(p, q)}}V^{-${F.fracI(qn, qd)} - 1} = ${cs(qq, '\\dfrac{U}{V}')}$.`,
        };
      }
      return {
        q: stem + 'What is the temperature?',
        ...valMC(R, [cs(pe, '\\dfrac{U}{S}'), pe], [[cs(qq, '\\dfrac{U}{S}'), qq + 1e-6], [cs(pe, '\\dfrac{U}{V}'), -1], [cs(pe - 1, '\\dfrac{U}{S}'), pe - 1 + 2e-6], [cs(1 / pe, '\\dfrac{U}{S}'), 1 / pe + 3e-6], [cs(pe, '\\dfrac{S}{U}'), -2]].filter(w => !close(w[1], pe) && w[0] !== '0'), { shuffle: true }),
        expl: raw`$T = (\partial U/\partial S)_V = ${fx(pe)}\,\alpha S^{${F.fracI(p - q, q)}}V^{-${F.fracI(qn, qd)}} = ${cs(pe, '\\dfrac{U}{S}')}$.`,
      };
    },
  });

  // ================================================================== 4.2.5 Heat capacity
  L.push({
    id: 'thermo.heat.calorimetry', sec: '4.2.5', level: 1, weight: 2,
    gen(R) {
      const MET = [['aluminum', 0.2], ['iron', 0.1], ['copper', 0.1], ['lead', 0.03], ['glass', 0.2], ['silver', 0.05]];
      const v = R.weighted(['mix', 'same', 'time'], [3, 1, 2]);
      if (v === 'mix') {
        const [met, c] = R.pick(MET);
        const mw = R.pick([100, 200, 250, 300, 400, 500]), mm = R.pick([100, 200, 250, 500, 1000]);
        const Tw = R.pick([10, 15, 20, 25]), Tm = R.pick([80, 90, 100, 150, 200]);
        const Cw = mw, Cm = mm * c;
        const Tf = (Cw * Tw + Cm * Tm) / (Cw + Cm);
        return {
          q: raw`A $${mm}\,\text{g}$ piece of ${met} (specific heat $${c}\,\text{cal/(g}\cdot\text{}^\circ\text{C)}$) at $${Tm}^\circ\text{C}$ is dropped into $${mw}\,\text{g}$ of water (specific heat $1\,\text{cal/(g}\cdot\text{}^\circ\text{C)}$) at $${Tw}^\circ\text{C}$ in an insulated container. Neglecting the container, what is the final temperature?`,
          ...valMC(R, [`${F.num(Tf, 3)}^\\circ\\text{C}`, +F.num(Tf, 3)], [(Tw + Tm) / 2, (mw * Tw + mm * Tm) / (mw + mm), (Cm * Tw + Cw * Tm) / (Cw + Cm), Tw + (Tm - Tw) * Cm / Cw].filter(x => x > Tw && x < Tm && Math.abs(x - Tf) > 1.5).map(x => [`${F.num(x, 3)}^\\circ\\text{C}`, +F.num(x, 3)]).concat([[`${Tw}^\\circ\\text{C}`, Tw], [`${Tm}^\\circ\\text{C}`, Tm]])),
          expl: raw`Heat lost by the metal equals heat gained by the water: $${Cm}(${Tm} - T) = ${Cw}(T - ${Tw})$ (in cal/°C), so $T = \dfrac{${Cm}\cdot${Tm} + ${Cw}\cdot${Tw}}{${Cm + Cw}} \approx ${F.num(Tf, 3)}^\circ\text{C}$. Averaging the temperatures ignores the heat capacities.`,
        };
      }
      if (v === 'same') {
        const m1 = R.pick([1, 2, 3, 4]), m2 = R.pick([1, 2, 3, 5]), T1 = R.pick([10, 20, 30]), T2 = R.pick([50, 60, 70, 80, 90]);
        const Tf = (m1 * T1 + m2 * T2) / (m1 + m2);
        return {
          q: raw`$${m1}\,\text{kg}$ of water at $${T1}^\circ\text{C}$ is mixed with $${m2}\,\text{kg}$ of water at $${T2}^\circ\text{C}$ in an insulated container. What is the final temperature?`,
          ...valMC(R, [`${F.num(Tf, 3)}^\\circ\\text{C}`, +F.num(Tf, 3)], [(T1 + T2) / 2, (m2 * T1 + m1 * T2) / (m1 + m2), T2 - T1, (m1 * T1 + m2 * T2) / Math.max(m1, m2), T1 + T2 * m2 / (m1 + m2) / 2].filter(x => Math.abs(x - Tf) > 1).map(x => [`${F.num(x, 3)}^\\circ\\text{C}`, +F.num(x, 3)])),
          expl: raw`Same specific heat, so the final temperature is the mass-weighted mean: $(${m1}\cdot${T1} + ${m2}\cdot${T2})/${m1 + m2} \approx ${F.num(Tf, 3)}^\circ\text{C}$.`,
        };
      }
      const m = R.pick([0.5, 1, 2, 3]), dT = R.pick([10, 20, 40, 50, 80]), P = R.pick([500, 1000, 1500, 2000]);
      const t = m * 4200 * dT / P;
      return {
        q: raw`A $${P}\,\text{W}$ heater is immersed in $${F.num(m)}\,\text{kg}$ of water (specific heat $4200\,\text{J/(kg}\cdot\text{K)}$). Ignoring losses, how long does it take to raise the water's temperature by $${dT}\,\text{K}$?`,
        ...GRE.numeric(R, t, [m * 4200 * dT / P / 4.2, m * 1000 * dT / P, m * 4.2 * dT / P, t * 60], { unit: raw`\text{s}` }),
        expl: raw`$Q = mc\Delta T = ${F.num(m)}(4200)(${dT}) = ${F.num(m * 4200 * dT, 3)}\,\text{J}$, and $t = Q/P \approx ${F.num(t, 2)}\,\text{s}$.`,
      };
    },
  });

  L.push({
    id: 'thermo.heat.gamma', sec: '4.2.5', level: 1,
    gen(R) {
      const [gn, gd] = R.pick([[5, 3], [7, 5], [4, 3], [9, 7]]);
      const f = 2 * gd / (gn - gd);
      const ask = R.pick(['Cv', 'Cp', 'f', 'Cvnum', 'diff']);
      const g = `\\gamma = C_P/C_V = ${gn}/${gd}`;
      if (ask === 'Cv' || ask === 'Cp') {
        const corr = ask === 'Cv' ? f / 2 : f / 2 + 1;
        return {
          q: raw`An ideal gas has $${g}$. What is its molar heat capacity at constant ${ask === 'Cv' ? 'volume' : 'pressure'}?`,
          ...exactMC(R, corr, [ask === 'Cv' ? f / 2 + 1 : f / 2, gn / gd, gd / gn, f, 1 / (gn / gd - 1) + 1 + (ask === 'Cv' ? 1 : 0), corr + 0.5].filter(x => !close(x, corr)), 'R'),
          expl: raw`With $C_P - C_V = R$ and $C_P = \gamma C_V$: $C_V = R/(\gamma - 1) = ${cs(f / 2, 'R')}$ and $C_P = \gamma R/(\gamma - 1) = ${cs(f / 2 + 1, 'R')}$.`,
        };
      }
      if (ask === 'f') {
        return {
          q: raw`Measurements on an ideal gas give $${g}$. According to the equipartition theorem, how many quadratic degrees of freedom does each molecule have?`,
          ...exactMC(R, f, [3, 5, 6, 7, 2, 4, 9].filter(x => x !== f)),
          expl: raw`$C_V = \tfrac{f}{2}R$ and $\gamma = 1 + 2/f$, so $f = 2/(\gamma - 1) = ${f}$.`,
        };
      }
      if (ask === 'Cvnum') {
        const cv = C.R * f / 2;
        return {
          q: raw`An ideal gas has $${g}$. Its molar heat capacity at constant volume is closest to (take $R = 8.3\,\text{J/(mol}\cdot\text{K)}$)`,
          ...GRE.numeric(R, cv, [C.R * (f / 2 + 1), C.R * gn / gd, C.R / (gn / gd), C.R * f], { unit: raw`\text{J/(mol}\cdot\text{K)}` }),
          expl: raw`$C_V = R/(\gamma - 1) = ${cs(f / 2, 'R')} \approx ${F.num(cv, 2)}\,\text{J/(mol}\cdot\text{K)}$.`,
        };
      }
      return {
        q: raw`For $n$ moles of any ideal gas (monatomic or polyatomic), the difference $C_P - C_V$ between the heat capacities at constant pressure and constant volume is`,
        ...symMC(R, 'nR', ['0', '\\dfrac{3}{2}nR', '\\dfrac{5}{2}nR', '\\gamma nR', '\\dfrac{nR}{\\gamma}', 'nR\\ln 2']),
        expl: raw`At constant pressure the gas must also do work $P\Delta V = nR\Delta T$, so $C_P = C_V + nR$ for every ideal gas, independent of its internal structure.`,
      };
    },
  });

  L.push({
    id: 'thermo.heat.mixture', sec: '4.2.5', level: 2,
    gen(R) {
      const MONO = ['helium', 'neon', 'argon'], DI = ['nitrogen', 'oxygen', 'hydrogen'];
      const n1 = R.int(1, 6), n2 = R.int(1, 6);
      const a = R.pick(MONO), b = R.pick(DI);
      const ask = R.pick(['gamma', 'Cv', 'U']);
      const stem = raw`A mixture contains $${n1}\,\text{mol}$ of ${a} and $${n2}\,\text{mol}$ of ${b}, both treated as ideal gases at room temperature (vibrations frozen out). `;
      if (ask === 'gamma') {
        const c = [5 * n1 + 7 * n2, 3 * n1 + 5 * n2];
        return {
          q: stem + 'What is $\\gamma = C_P/C_V$ for the mixture?',
          ...fracMC(R, c, [[25 * n1 + 21 * n2, 15 * (n1 + n2)], [5, 3], [7, 5], [3 * n1 + 5 * n2, 5 * n1 + 7 * n2], [12, 8], [5 * n1 + 7 * n2, 3 * n1 + 5 * n2 + 2]]),
          expl: raw`Heat capacities add: $C_V = (\tfrac32\cdot${n1} + \tfrac52\cdot${n2})R$ and $C_P = C_V + (${n1 + n2})R = (\tfrac52\cdot${n1} + \tfrac72\cdot${n2})R$. So $\gamma = \dfrac{${5 * n1 + 7 * n2}}{${3 * n1 + 5 * n2}} = ${F.frac(c[0], c[1])}$. Averaging the two $\gamma$ values is the trap.`,
        };
      }
      if (ask === 'Cv') {
        const c = [3 * n1 + 5 * n2, 2 * (n1 + n2)];
        return {
          q: stem + 'What is the molar heat capacity at constant volume of the mixture (per mole of mixture)?',
          ...fracMC(R, c, [[4, 1], [3, 2], [5, 2], [3 * n2 + 5 * n1, 2 * (n1 + n2)], [5 * n1 + 7 * n2, 2 * (n1 + n2)], [3 * n1 + 5 * n2, 2]], 'R'),
          expl: raw`$C_V^{\text{tot}} = (\tfrac32\cdot${n1} + \tfrac52\cdot${n2})R$; divide by $${n1 + n2}$ mol: $${fs(c[0], c[1], 'R')}$.`,
        };
      }
      const c = [3 * n1 + 5 * n2, 2];
      return {
        q: stem + 'What is the total internal energy of the mixture at temperature $T$?',
        ...fracMC(R, c, [[3 * (n1 + n2), 2], [5 * (n1 + n2), 2], [5 * n1 + 7 * n2, 2], [3 * n2 + 5 * n1, 2], [3 * n1 + 5 * n2, 1]], 'RT'),
        expl: raw`Equipartition: $U = \tfrac32 n_1RT + \tfrac52 n_2RT = ${fs(c[0], c[1], 'RT')}$.`,
      };
    },
  });

  L.push({
    id: 'thermo.heat.sound', sec: '4.2.5', level: 2,
    gen(R) {
      const G = [['helium', 4, 5, 3], ['neon', 20, 5, 3], ['argon', 40, 5, 3], ['nitrogen', 28, 7, 5], ['oxygen', 32, 7, 5], ['hydrogen', 2, 7, 5]];
      const v = R.weighted(['num', 'scale', 'ratio'], [2, 2, 1]);
      if (v === 'num') {
        const [name, M, gn, gd] = R.pick(G);
        const T = R.pick([200, 250, 300, 400, 500, 600]);
        const c = Math.sqrt(gn / gd * C.R * T / (M / 1000));
        return {
          q: raw`What is the speed of sound in ${name} gas (molar mass $${M}\,\text{g/mol}$, $\gamma = ${gn}/${gd}$) at $${T}\,\text{K}$? (Take $R = 8.3\,\text{J/(mol}\cdot\text{K)}$.)`,
          ...GRE.numeric(R, c, [Math.sqrt(C.R * T / (M / 1000)), Math.sqrt(3 * C.R * T / (M / 1000)), Math.sqrt(gn / gd * C.R * T / M), c * c / 1000], { unit: raw`\text{m/s}` }),
          expl: raw`$v = \sqrt{\gamma P/\rho} = \sqrt{\gamma RT/M} = \sqrt{${fx(gn / gd)}(8.3)(${T})/${M / 1000}} \approx ${F.num(c, 2)}\,\text{m/s}$. Without $\gamma$ you get Newton's isothermal value; with 3 instead of $\gamma$ you get $v_{\text{rms}}$.`,
        };
      }
      if (v === 'scale') {
        const a = R.pick([4, 9, 1 / 4, 2, 16]), b = R.pick([1, 2, 4, 1 / 2]);
        const which = R.bool();
        if (which) {
          const X = Math.sqrt(a);
          return {
            q: raw`The pressure of an ideal gas is multiplied by $${fx(b === 1 ? 2 : b)}$ while its absolute temperature is multiplied by $${fx(a)}$. By what factor does the speed of sound in the gas change?`,
            ...exactMC(R, X, [a, Math.sqrt(a * (b === 1 ? 2 : b)), Math.sqrt(a / (b === 1 ? 2 : b)), 1, Math.sqrt(b === 1 ? 2 : b)], '', { positive: true }),
            expl: raw`$v = \sqrt{\gamma RT/M}$ depends only on temperature (at fixed composition): $P/\rho = RT/M$, so the pressure change cancels. The factor is $\sqrt{${fx(a)}} = ${fx(X)}$.`,
          };
        }
        return {
          q: raw`At constant temperature, the density of an ideal gas is increased by a factor of $${fx(a)}$ by compressing it. By what factor does the speed of sound change?`,
          ...exactMC(R, 1, [Math.sqrt(a), 1 / Math.sqrt(a), a, 1 / a], '', { positive: true }),
          expl: raw`$v = \sqrt{\gamma P/\rho}$, and at constant $T$, $P \propto \rho$, so the speed is unchanged.`,
        };
      }
      const [g1, g2] = R.pickN(G, 2);
      const X = Math.sqrt((g1[2] / g1[3]) * g2[1] / ((g2[2] / g2[3]) * g1[1]));
      if (exq(X) == null) throw new Error('retry');
      return {
        q: raw`What is the ratio of the speed of sound in ${g1[0]} ($\gamma = ${g1[2]}/${g1[3]}$, ${g1[1]} g/mol) to that in ${g2[0]} ($\gamma = ${g2[2]}/${g2[3]}$, ${g2[1]} g/mol) at the same temperature?`,
        ...exactMC(R, X, [Math.sqrt(g2[1] / g1[1]), X * X, 1 / X, g2[1] / g1[1], Math.sqrt(g1[1] / g2[1])], '', { positive: true }),
        expl: raw`$v \propto \sqrt{\gamma/M}$ at fixed $T$: ratio $= \sqrt{\dfrac{(${g1[2]}/${g1[3]})\cdot ${g2[1]}}{(${g2[2]}/${g2[3]})\cdot ${g1[1]}}} = ${fx(X)}$.`,
      };
    },
  });

  L.push({
    id: 'thermo.heat.schottky', sec: '4.2.5', level: 2,
    gen(R) {
      if (R.bool(0.6)) {
        return romanQ(R, 'A system consists of $N$ independent, distinguishable two-level units with nondegenerate levels separated by energy $\\Delta$. Which of the following is (are) true of its heat capacity $C$ and energy $U$ (with the ground level at zero)?',
          [['$C \\to 0$ as $T \\to 0$.', 'excitations are exponentially suppressed, $C \\propto e^{-\\Delta/k_BT}/T^2$.'],
            ['$C \\to 0$ as $T \\to \\infty$.', 'both levels become equally populated and $U$ saturates.'],
            ['$C$ has a maximum at a temperature where $k_BT$ is of order $\\Delta$.', 'this is the Schottky anomaly (peak near $k_BT \\approx 0.42\\Delta$).'],
            ['$U \\to N\\Delta/2$ as $T \\to \\infty$.', 'each unit is excited with probability 1/2.'],
            ['The entropy approaches $Nk_B\\ln 2$ as $T \\to \\infty$.', 'each unit has two equally likely states.']],
          [['$C$ approaches $Nk_B$ as $T \\to \\infty$.', 'that is the classical oscillator; the two-level energy saturates, so $C \\to 0$.'],
            ['$C$ increases monotonically with $T$.', 'it rises and then falls (Schottky peak).'],
            ['$U \\to N\\Delta$ as $T \\to \\infty$.', 'at most half the units are excited at positive temperature.'],
            ['The entropy approaches zero as $T \\to \\infty$.', 'it approaches its maximum, $Nk_B\\ln 2$.'],
            ['$C$ approaches $\\tfrac12Nk_B$ at high temperature.', 'equipartition does not apply to a bounded spectrum; $C \\to 0$.']]);
      }
      return romanQ(R, 'A crystal is modeled as $N$ independent quantum harmonic oscillators of angular frequency $\\omega$ (an Einstein solid with $N$ oscillators). Which of the following is (are) true?',
        [['$C \\to Nk_B$ when $k_BT \\gg \\hbar\\omega$.', 'the classical equipartition limit (two quadratic terms per oscillator).'],
          ['$C \\to 0$ as $T \\to 0$.', 'the oscillators freeze into the ground state; $C \\propto e^{-\\hbar\\omega/k_BT}$.'],
          ['$U \\to N\\hbar\\omega/2$ as $T \\to 0$.', 'the zero-point energy remains.'],
          ['$U \\approx Nk_BT$ when $k_BT \\gg \\hbar\\omega$.', 'equipartition, apart from a constant offset.']],
        [['$C \\to 0$ as $T \\to \\infty$.', 'the spectrum is unbounded, so $C \\to Nk_B$.'],
          ['$U \\to 0$ as $T \\to 0$.', 'the zero-point energy $N\\hbar\\omega/2$ remains.'],
          ['$C \\to \\tfrac12 Nk_B$ when $k_BT \\gg \\hbar\\omega$.', 'there are two quadratic terms per oscillator, giving $Nk_B$.'],
          ['$C$ is proportional to $T^3$ at low temperature.', 'that is the Debye model; the Einstein model gives an exponential.']]);
    },
  });

  L.push({
    id: 'thermo.heat.lowT', sec: '4.2.5', level: 2,
    gen(R) {
      const SYS = [
        ['an insulating crystal well below its Debye temperature', 3, 'Debye $T^3$ law (acoustic phonons)'],
        ['the conduction electrons of a metal (with $k_BT \\ll E_F$)', 1, 'only electrons within $\\sim k_BT$ of $E_F$ are excited, giving $C \\propto T$'],
        ['black-body radiation in a cavity of fixed volume', 3, '$U \\propto VT^4$, so $C_V \\propto T^3$'],
        ['an ideal Bose gas of massive particles below its condensation temperature', 1.5, 'below $T_c$ the uncondensed particles give $C \\propto T^{3/2}$'],
      ];
      const v = R.weighted(['factor', 'metal'], [3, 1]);
      if (v === 'metal') {
        const r = R.pick([2, 3, 4, 1 / 2, 1 / 3]);
        const X = 1 / (r * r);
        return {
          q: raw`At low temperature the heat capacity of a metal is $C = \gamma T + AT^3$ (electrons plus lattice). At temperature $T_0$ the two contributions are equal. At temperature $${fx(r)}\,T_0$, what is the ratio of the electronic contribution to the lattice contribution?`,
          ...exactMC(R, X, [r * r, 1 / r, r, 1 / Math.pow(r, 3), Math.pow(r, 3), 1], '', { positive: true }),
          expl: raw`The ratio is $\gamma T/AT^3 \propto T^{-2}$, equal to 1 at $T_0$, so at $${fx(r)}T_0$ it is $(${fx(r)})^{-2} = ${fx(X)}$. The electronic term dominates at the lowest temperatures.`,
        };
      }
      const [desc, n, why] = R.pick(SYS);
      const rs = n === 1.5 ? [4, 9, 1 / 4] : [2, 3, 1 / 2, 1 / 3, 4];
      const r = R.pick(rs);
      const X = Math.pow(r, n);
      const askU = R.bool(0.3);
      const val = askU ? Math.pow(r, n + 1) : X;
      if (exq(val) == null) throw new Error('retry');
      return {
        q: raw`The temperature of ${desc} is changed from $T$ to $${fx(r)}\,T$, both temperatures being in the same low-temperature regime. By what factor does ${askU ? 'its thermal energy (measured from the ground state)' : 'its heat capacity'} change?`,
        ...exactMC(R, val, [Math.pow(r, 3), r, 1, Math.pow(r, 4), Math.pow(r, 1.5), r * r, Math.pow(r, 2.5)].filter(x => !close(x, val) && exq(x) != null), '', { positive: true }),
        expl: raw`${why}. ${askU ? `Since $C \\propto T^{${F.fracI(2 * n, 2)}}$, the thermal energy $U = \\int C\\,dT \\propto T^{${F.fracI(2 * n + 2, 2)}}$, so the factor is $${fx(val)}$.` : `So the factor is $${powTex(r, n)} = ${fx(val)}$.`}`,
      };
    },
  });

  // ================================================================== 4.2.6 Model systems
  const TPAIRS = [[400, 200], [400, 300], [500, 300], [500, 250], [500, 400], [600, 300], [600, 400], [600, 450], [800, 200], [800, 400], [800, 600], [900, 300], [1000, 250], [1000, 300], [1000, 400], [1200, 300], [1200, 400], [750, 300]];
  L.push({
    id: 'thermo.engine.carnot', sec: '4.2.6', level: 1, weight: 3,
    gen(R) {
      const [TH, TC] = R.pick(TPAIRS);
      const e = 1 - TC / TH;
      const v = R.weighted(['eff', 'celsius', 'work', 'qc', 'TH', 'power'], [2, 2, 2, 2, 1, 1]);
      if (v === 'eff' || v === 'celsius') {
        const cel = v === 'celsius';
        const tH = cel ? `${TH - 273}^\\circ\\text{C}` : `${TH}\\,\\text{K}`, tC = cel ? `${TC - 273}^\\circ\\text{C}` : `${TC}\\,\\text{K}`;
        const wr = [TC / TH, (TH - TC) / TC, 1 - Math.sqrt(TC / TH)].concat(cel && TC !== 273 ? [1 - (TC - 273) / (TH - 273)] : []);
        return {
          q: raw`What is the maximum possible efficiency of a heat engine operating between reservoirs at $${tH}$ and $${tC}$?`,
          ...(() => {
            const pc = x => +F.num(100 * x, 2);
            const cands = wr.concat([e / 2, (TH - TC) / (TH + TC), TC / (TH + TC), 1 - Math.pow(TC / TH, 2), e * e]).filter(x => x > 0 && x < 1).map(pc);
            const ws = [];
            for (const x of cands) if (Math.abs(x - pc(e)) >= 4 && ws.every(y => Math.abs(x - y) >= 4)) ws.push(x);
            return valMC(R, [`${pc(e)}\\,\\%`, pc(e)], ws.map(x => [`${x}\\,\\%`, x]));
          })(),
          expl: raw`The Carnot efficiency $e = 1 - T_C/T_H$ with absolute temperatures${cel ? ` ($T_H = ${TH}\\,\\text{K}$, $T_C = ${TC}\\,\\text{K}$)` : ''}: $1 - ${TC}/${TH} = ${F.num(100 * e, 2)}\\%$.${cel ? ' Using Celsius temperatures is the trap.' : ''}`.replace(/\\\\%/g, '\\%'),
        };
      }
      const QH = R.step(200, 2000, 100);
      if (v === 'work' || v === 'qc') {
        const W = e * QH;
        const corr = v === 'work' ? W : QH - W;
        return {
          q: raw`A Carnot engine operates between reservoirs at $${TH}\,\text{K}$ and $${TC}\,\text{K}$ and absorbs $${QH}\,\text{J}$ of heat from the hot reservoir each cycle. How much ${v === 'work' ? 'work does it do' : 'heat does it reject to the cold reservoir'} per cycle?`,
          ...GRE.numeric(R, corr, v === 'work' ? [QH - W, QH * TC / TH * TC / TH, QH, QH * (TH - TC) / TC] : [W, QH, QH * (TH - TC) / TC, QH * TH / TC], { unit: raw`\text{J}`, sig: 3, tol: 0.06 }),
          expl: raw`$e = 1 - T_C/T_H = ${fx(e)}$, so $W = eQ_H = ${F.num(W, 3)}\,\text{J}$ and $Q_C = Q_H - W = Q_H T_C/T_H = ${F.num(QH - W, 3)}\,\text{J}$.`,
        };
      }
      if (v === 'TH') {
        return {
          q: raw`A Carnot engine rejects heat to a reservoir at $${TC}\,\text{K}$ and has efficiency $${F.num(100 * e, 3)}\%$. What is the temperature of its hot reservoir?`,
          ...GRE.numeric(R, TH, [TC * (1 + e), TC / e, TC * e, TC / (1 + e)], { unit: raw`\text{K}`, sig: 3, tol: 0.05 }),
          expl: raw`$T_H = T_C/(1 - e) = ${TC}/${F.num(1 - e, 3)} = ${TH}\,\text{K}$.`,
        };
      }
      const P = R.pick([100, 200, 500, 1000, 2000]);
      const rej = P * TC / (TH - TC);
      return {
        q: raw`An engine operating at the Carnot efficiency between $${TH}\,\text{K}$ and $${TC}\,\text{K}$ delivers mechanical power $${P}\,\text{W}$. At what rate does it reject heat to the cold reservoir?`,
        ...GRE.numeric(R, rej, [P / e, P * TC / TH, P * (TH - TC) / TC, P], { unit: raw`\text{W}`, sig: 3, tol: 0.06 }),
        expl: raw`$P_{\text{in}} = P/e$ with $e = ${fx(e)}$, so $P_{\text{out}} = P_{\text{in}} - P = P\,T_C/(T_H - T_C) = ${F.num(rej, 3)}\,\text{W}$.`,
      };
    },
  });

  L.push({
    id: 'thermo.engine.fridge', sec: '4.2.6', level: 2, weight: 2,
    gen(R) {
      const [TH, TC] = R.pick([[300, 250], [300, 270], [300, 200], [310, 280], [295, 255], [300, 150], [300, 100], [400, 300], [500, 400], [350, 280], [320, 240], [300, 240]]);
      const kind = R.pick(['fridge', 'pump']);
      const ask = R.pick(['cop', 'W', 'Q']);
      const cel = TH < 400 && R.bool();
      const t = T => (cel ? `${T - 273}^\\circ\\text{C}` : `${T}\\,\\text{K}`);
      const copR = TC / (TH - TC), copP = TH / (TH - TC);
      if (ask === 'cop') {
        const corr = kind === 'fridge' ? copR : copP;
        const wr = kind === 'fridge' ? [copP, (TH - TC) / TC, 1 - TC / TH, TH / TC] : [copR, (TH - TC) / TH, TH / TC, 1 - TC / TH];
        if (cel) wr.push(kind === 'fridge' ? (TC - 273) / (TH - TC) : (TH - 273) / (TH - TC));
        return {
          q: raw`What is the maximum possible coefficient of performance of a ${kind === 'fridge' ? 'refrigerator that removes heat from a compartment' : 'heat pump that delivers heat to a house'} at $${t(kind === 'fridge' ? TC : TH)}$ ${kind === 'fridge' ? 'and exhausts it to a room' : 'by extracting it from the outside'} at $${t(kind === 'fridge' ? TH : TC)}$?`,
          ...GRE.numeric(R, corr, wr.filter(x => x > 0), { sig: 2, tol: 0.08 }),
          expl: raw`For a reversible device, ${kind === 'fridge' ? raw`$K = Q_C/W = T_C/(T_H - T_C)` : raw`$K = Q_H/W = T_H/(T_H - T_C)`} = ${F.num(corr, 2)}$ (absolute temperatures).`,
        };
      }
      if (ask === 'W') {
        const Q = R.step(500, 5000, 250);
        const W = kind === 'fridge' ? Q / copR : Q / copP;
        return {
          q: raw`What is the minimum work needed for a ${kind === 'fridge' ? `refrigerator to remove $${Q}\\,\\text{J}$ of heat from a compartment at $${t(TC)}$ while exhausting heat to a room at $${t(TH)}$` : `heat pump to deliver $${Q}\\,\\text{J}$ of heat into a house at $${t(TH)}$ while extracting heat from the outside at $${t(TC)}$`}?`,
          ...GRE.numeric(R, W, kind === 'fridge' ? [Q / copP, Q * copR, Q * (1 - TC / TH) * TH / TC * 0.5, Q * TC / TH] : [Q / copR, Q * copP, Q * TC / TH, Q], { unit: raw`\text{J}`, sig: 2, tol: 0.08 }),
          expl: raw`The reversible limit gives $W = Q_${kind === 'fridge' ? 'C' : 'H'}\,\dfrac{T_H - T_C}{T_${kind === 'fridge' ? 'C' : 'H'}} = ${Q}\times\dfrac{${TH - TC}}{${kind === 'fridge' ? TC : TH}} \approx ${F.num(W, 2)}\,\text{J}$.`,
        };
      }
      const W = R.step(100, 1000, 50);
      const Q = kind === 'fridge' ? W * copR : W * copP;
      return {
        q: raw`An ideal (reversible) ${kind === 'fridge' ? 'refrigerator' : 'heat pump'} operates between $${t(TC)}$ and $${t(TH)}$ and uses $${W}\,\text{J}$ of work per cycle. How much heat does it ${kind === 'fridge' ? 'remove from the cold reservoir' : 'deliver to the hot reservoir'} per cycle?`,
        ...GRE.numeric(R, Q, kind === 'fridge' ? [W * copP, W / copR, W * (1 - TC / TH)] : [W * copR, W / copP, W * TH / TC], { unit: raw`\text{J}`, sig: 2, tol: 0.08 }),
        expl: raw`Coefficient of performance ${kind === 'fridge' ? raw`$T_C/(T_H - T_C) = ${F.num(copR, 3)}$` : raw`$T_H/(T_H - T_C) = ${F.num(copP, 3)}$`}, so $Q = ${F.num(Q, 2)}\,\text{J}$.${kind === 'pump' ? ' The heat delivered exceeds the work input.' : ''}`,
      };
    },
  });

  L.push({
    id: 'thermo.engine.ts', sec: '4.2.6', level: 2, weight: 2,
    gen(R) {
      const [TH, TC] = R.pick(TPAIRS);
      const S1 = R.pick([1, 2, 3, 5, 10]), dS = R.pick([1, 2, 3, 4, 5, 10]), S2 = S1 + dS;
      const shape = R.pick(['rect', 'rect', 'tri']);
      const pts = shape === 'rect' ? [[S1, TC], [S1, TH], [S2, TH], [S2, TC]] : [[S1, TC], [S2, TH], [S2, TC]];
      const names = shape === 'rect' ? ['A', 'B', 'C', 'D'] : ['A', 'B', 'C'];
      const fig = cycleFig(pts, names, ['S', 'T']);
      const coords = pts.map((p, i) => `${names[i]} $(${p[0]}\\,\\text{J/K},\\ ${p[1]}\\,\\text{K})$`).join(', ');
      const ask = R.pick(shape === 'rect' ? ['W', 'QH', 'QC', 'e'] : ['W', 'QH', 'e']);
      const stem = raw`A reversible engine runs the cycle ${names.join(' → ')} → A shown in the temperature–entropy diagram, with (entropy, temperature) coordinates ${coords}. `;
      const Wv = shape === 'rect' ? (TH - TC) * dS : (TH - TC) * dS / 2;
      const QHv = shape === 'rect' ? TH * dS : (TH + TC) / 2 * dS;
      const ev = Wv / QHv;
      if (ask === 'e') {
        return {
          q: stem + 'What is its efficiency?',
          ...exactMC(R, ev, [1 - TC / TH, (TH - TC) / (2 * TH), TC / TH, (TH - TC) / (TH + TC), (TH - TC) / TC, (TH - TC) / (2 * TC)].filter(x => x < 1 && !close(x, ev))),
          level: shape === 'rect' ? 2 : 3,
          expl: shape === 'rect' ? raw`A rectangle in the $T$–$S$ plane is a Carnot cycle: $e = 1 - T_C/T_H = ${fx(ev)}$.`
            : raw`Heat is absorbed only on A → B: $Q_H = \int T\,dS = \tfrac12(T_H + T_C)\Delta S$. The work is the enclosed area $\tfrac12(T_H - T_C)\Delta S$, so $e = \dfrac{T_H - T_C}{T_H + T_C} = ${fx(ev)}$, below the Carnot value.`,
          fig,
        };
      }
      const corr = { W: Wv, QH: QHv, QC: TC * dS }[ask];
      const lab = { W: 'net work done per cycle', QH: 'heat absorbed per cycle', QC: 'heat rejected per cycle' }[ask];
      return {
        q: stem + `What is the ${lab}?`,
        ...GRE.numeric(R, corr, [Wv, QHv, TC * dS, TH * dS, (TH - TC) * dS, (TH + TC) * dS].filter(x => !close(x, corr)), { unit: raw`\text{J}`, sig: 3, tol: 0.05 }),
        expl: raw`In a reversible process $Q = \int T\,dS$: heat absorbed is the area under the upper path, heat rejected the area under the lower path, and the net work (clockwise cycle) is the enclosed area. Here $W = ${F.num(Wv, 3)}\,\text{J}$, $Q_H = ${F.num(QHv, 3)}\,\text{J}$, $Q_C = ${F.num(QHv - Wv, 3)}\,\text{J}$.`,
        fig,
      };
    },
  });

  L.push({
    id: 'thermo.engine.cycles', sec: '4.2.6', level: 2,
    gen(R) {
      const v = R.pick(['otto', 'series', 'actual']);
      if (v === 'otto') {
        const [r, gn, gd, e] = R.pick([[8, 5, 3, 3 / 4], [27, 5, 3, 8 / 9], [64, 5, 3, 15 / 16], [32, 7, 5, 3 / 4], [243, 7, 5, 8 / 9]]);
        const g = gn / gd;
        return {
          q: raw`An idealized Otto cycle (two reversible adiabats and two constant-volume steps) uses an ideal gas with $\gamma = ${gn}/${gd}$ and compression ratio $V_{\max}/V_{\min} = ${r}$. What is its efficiency?`,
          ...exactMC(R, e, [1 - 1 / r, 1 - Math.pow(r, -g), 1 - Math.pow(r, gn === 5 ? -0.4 : -2 / 3), Math.pow(r, 1 - g), 1 - Math.pow(r, -1 / g)].filter(x => exq(x) != null)),
          expl: raw`$e = 1 - r^{1-\gamma} = 1 - ${r}^{-${gn - gd}/${gd}} = ${fx(e)}$, equal to $1 - T_{\text{after adiabatic expansion}}/T_{\text{before}}$ for each adiabat.`,
        };
      }
      if (v === 'series') {
        const T1 = R.pick([600, 800, 900, 1000, 1200]), T2 = R.pick([400, 450, 500, 600]), T3 = R.pick([150, 200, 250, 300]);
        if (!(T1 > T2 && T2 > T3)) throw new Error('retry');
        const e1 = 1 - T2 / T1, e2 = 1 - T3 / T2, e = 1 - T3 / T1;
        return {
          q: raw`Two Carnot engines operate in series: the first absorbs heat at $${T1}\,\text{K}$ and rejects heat at $${T2}\,\text{K}$; the second absorbs all of that rejected heat at $${T2}\,\text{K}$ and rejects heat at $${T3}\,\text{K}$. What is the overall efficiency of the combination?`,
          ...exactMC(R, e, [e1 + e2, e1 * e2, (e1 + e2) / 2, e1, e2, 1 - T3 / T2 * T2 / T1 * 0.5].filter(x => x < 1)),
          expl: raw`The combination is reversible and takes heat at ${T1} K and rejects it at ${T3} K, so $e = 1 - ${T3}/${T1} = ${fx(e)}$. Efficiencies do not add: $1 - e = (1 - e_1)(1 - e_2)$.`,
        };
      }
      const [TH, TC] = R.pick(TPAIRS);
      const ec = 1 - TC / TH;
      const fr = R.pick([0.25, 0.4, 0.5, 0.6, 0.75, 0.8]);
      const QH = R.step(500, 5000, 500);
      const W = Math.round(QH * ec * fr);
      const ea = W / QH;
      return {
        q: raw`A real engine operating between $${TH}\,\text{K}$ and $${TC}\,\text{K}$ absorbs $${QH}\,\text{J}$ from the hot reservoir and delivers $${W}\,\text{J}$ of work per cycle. Its efficiency is what fraction of the maximum (Carnot) efficiency for these reservoirs?`,
        ...GRE.numeric(R, ea / ec, [ea, ec, ea * ec, (1 - ea) / ec], { sig: 2, tol: 0.08 }),
        expl: raw`$e = ${W}/${QH} = ${F.num(ea, 3)}$ and $e_C = 1 - ${TC}/${TH} = ${F.num(ec, 3)}$, so $e/e_C \approx ${F.num(ea / ec, 2)}$.`,
      };
    },
  });

  L.push({
    id: 'thermo.engine.pvcycle', sec: '4.2.6', level: 3,
    gen(R) {
      const [gas, f] = R.pick([['monatomic', 3], ['diatomic', 5]]);
      const a = R.pick([2, 3, 4]), b = R.pick([2, 3, 4]);
      // A(V0,P0) -> B(V0,aP0) -> C(bV0,aP0) -> D(bV0,P0) -> A : clockwise
      const pts = [[1, 1], [1, a], [b, a], [b, 1]];
      const names = ['A', 'B', 'C', 'D'];
      const fig = cycleFig(pts, names, ['V', 'P']);
      const W = (a - 1) * (b - 1);
      const Qab = f / 2 * (a - 1), Qbc = (f + 2) / 2 * a * (b - 1);
      const Qin = Qab + Qbc;
      const ask = R.pick(['W', 'Qin', 'e', 'Tmax']);
      const stem = raw`An ideal ${gas} gas${f === 5 ? ' (vibrations frozen out)' : ''} is taken around the rectangular cycle A → B → C → D → A shown, where A $= (V_0, P_0)$, B $= (V_0, ${a}P_0)$, C $= (${b}V_0, ${a}P_0)$ and D $= (${b}V_0, P_0)$. `;
      if (ask === 'Tmax') {
        return {
          q: stem + 'What is the ratio of the highest temperature reached in the cycle to the lowest?',
          ...exactMC(R, a * b, [a, b, a + b, a * b / 2, Math.max(a, b) * 2 + 1], '', { positive: true }),
          expl: raw`$T \propto PV$: the hottest point is C ($${a * b}P_0V_0$) and the coldest is A ($P_0V_0$), a ratio of ${a * b}.`,
          fig,
        };
      }
      if (ask === 'W') {
        return {
          q: stem + 'What is the net work done by the gas per cycle?',
          ...exactMC(R, W, [a * b, W / 2, (a - 1) * b, a * (b - 1), Qin, -W], 'P_0V_0'),
          expl: raw`The enclosed area is $(${a} - 1)P_0 \times (${b} - 1)V_0 = ${cs(W, 'P_0V_0')}$, positive because the cycle is clockwise.`,
          fig,
        };
      }
      if (ask === 'Qin') {
        return {
          q: stem + 'How much heat does the gas absorb per cycle (counting only the steps in which heat flows in)?',
          ...exactMC(R, Qin, [Qbc, Qab, W, f / 2 * (a - 1) + f / 2 * a * (b - 1), Qin + (f + 2) / 2 * (b - 1), (f + 2) / 2 * (a - 1) + f / 2 * a * (b - 1)], 'P_0V_0'),
          expl: raw`Heat enters on A → B (constant $V$, $T$ rises): $\tfrac{${f}}{2}V_0\Delta P = ${cs(Qab, 'P_0V_0')}$, and on B → C (constant $P$, expansion): $\tfrac{${f + 2}}{2}P\Delta V = ${cs(Qbc, 'P_0V_0')}$. Total $${cs(Qin, 'P_0V_0')}$; heat leaves on C → D and D → A.`,
          fig,
        };
      }
      const e = W / Qin;
      return {
        q: stem + 'What is the efficiency of this cycle?',
        ...exactMC(R, e, [1 - 1 / (a * b), W / Qbc, W / (Qab + f / 2 * a * (b - 1)), W / (W + Qin), W / (a * b)].filter(x => x < 1 && x > 0)),
        expl: raw`$W = ${cs(W, 'P_0V_0')}$; heat in on A → B and B → C: $Q_{\text{in}} = ${cs(Qab, 'P_0V_0')} + ${cs(Qbc, 'P_0V_0')} = ${cs(Qin, 'P_0V_0')}$. So $e = W/Q_{\text{in}} = ${fx(e)}$, well below the Carnot value $1 - T_A/T_C = ${fx(1 - 1 / (a * b))}$ between its extreme temperatures.`,
        fig,
      };
    },
  });

  L.push({
    id: 'thermo.model.mixing', sec: '4.2.6', level: 2,
    gen(R) {
      const m = R.pick([1, 1, 2, 3, 4]);
      const same = R.bool(0.2);
      const [A, B] = R.pick([['helium', 'argon'], ['neon', 'krypton'], ['nitrogen', 'oxygen'], ['hydrogen', 'helium']]);
      const units = R.pick([['N', 'Nk_B', 'molecules'], ['n', 'nR', 'moles']]);
      const left = `$${units[0]}$ ${units[2]} of ${A}`;
      const right = `$${m === 1 ? '' : m}${units[0]}$ ${units[2]} of ${same ? A : B}`;
      const q = raw`An insulated box is divided by a partition into two compartments with volumes in the ratio $1 : ${m}$. One holds ${left} and the other ${right}, both ideal gases at the same temperature and pressure. The partition is removed and the gases come to equilibrium. What is the change in entropy?`;
      const k = units[1];
      const val = Math.log(1 + m) + m * Math.log((1 + m) / m);
      const corr = m === 1 ? `2${k}\\ln 2` : `${k}\\left(\\ln ${1 + m} + ${m}\\ln\\tfrac{${1 + m}}{${m}}\\right)`;
      const wr = [
        ['0', 0], [`${1 + m}${k}\\ln 2`, (1 + m) * Math.log(2)], [`${k}\\ln ${1 + m}`, Math.log(1 + m)], [`${1 + m}${k}\\ln ${1 + m}`, (1 + m) * Math.log(1 + m)],
        [`${k}\\ln 2`, Math.log(2)], [`${m}${k}\\ln\\tfrac{${1 + m}}{${m}}`, m * Math.log((1 + m) / m)], [`-2${k}\\ln 2`, -2 * Math.log(2)],
        [`2${k}\\ln ${1 + m}`, 2 * Math.log(1 + m)], [`${k}\\ln\\tfrac{${1 + m}}{${m}}`, Math.log((1 + m) / m) + 1e-7], [`${m === 1 ? '' : m}${k}\\ln ${1 + m}`, m * Math.log(1 + m) + 2e-7], [`${1 + m}${k}`, 1 + m],
      ];
      if (same) {
        return {
          q, ...valMC(R, ['0', 0], [[corr, val]].concat(wr.slice(1)), { shuffle: true }),
          expl: raw`Both compartments contain the same gas at the same $T$ and $P$, so removing the partition changes no macroscopic variable: $\Delta S = 0$ (the $1/N!$ for identical particles resolves the Gibbs paradox). For different gases it would be $${corr}$.`,
        };
      }
      return {
        q, ...valMC(R, [corr, val], wr, { shuffle: true }),
        expl: raw`Each gas expands freely into the whole volume: $\Delta S = ${k}\ln\dfrac{V}{V_A} + ${m === 1 ? '' : m}${k}\ln\dfrac{V}{V_B}$ with $V/V_A = ${1 + m}$ and $V/V_B = ${F.frac(1 + m, m)}$, giving $${corr}$. If the gases were identical the change would be zero.`,
      };
    },
  });

  L.push({
    id: 'thermo.model.paramagnet', sec: '4.2.6', level: 2, weight: 2,
    gen(R) {
      const v = R.weighted(['pop', 'curie', 'demag'], [3, 2, 2]);
      if (v === 'pop') {
        const r = R.pick([2, 3, 4, 5, 7, 9]);
        const ask = R.pick(['up', 'down', 'M', 'E']);
        const stem = raw`A paramagnet consists of $N$ independent spin-1/2 particles, each with magnetic moment $\mu$, in a field $B$ at temperature $T$, where $e^{2\mu B/k_BT} = ${r}$. `;
        if (ask === 'M' || ask === 'E') {
          const c = [r - 1, r + 1];
          return {
            q: stem + (ask === 'M' ? 'What is the net magnetization, in units of $N\\mu$?' : 'What is the average energy per particle, in units of $\\mu B$?'),
            ...fracMC(R, ask === 'M' ? c : [-(r - 1), r + 1], (ask === 'M' ? [[r, r + 1], [1, r + 1], [r - 1, r], [1, 1], [r + 1, r - 1], [1, 2]] : [[r - 1, r + 1], [-r, r + 1], [-1, r + 1], [-1, 1], [-(r - 1), r], [0, 1]])),
            expl: raw`The aligned and anti-aligned states have energies $\mp\mu B$, so their populations are in the ratio $e^{2\mu B/k_BT} = ${r}$: fractions $${F.frac(r, r + 1)}$ and $${F.frac(1, r + 1)}$. ${ask === 'M' ? `$M = N\\mu(${F.frac(r, r + 1)} - ${F.frac(1, r + 1)}) = ${F.frac(r - 1, r + 1)}\\,N\\mu$` : `$\\langle E\\rangle = -\\mu B(${F.frac(r, r + 1)} - ${F.frac(1, r + 1)}) = -${F.frac(r - 1, r + 1)}\\,\\mu B$`} $= ${ask === 'M' ? '' : '-'}\tanh(\mu B/k_BT)$ in these units.`,
          };
        }
        const up = ask === 'up';
        return {
          q: stem + `What fraction of the moments are ${up ? 'aligned' : 'anti-aligned'} with the field?`,
          ...fracMC(R, up ? [r, r + 1] : [1, r + 1], [up ? [1, r + 1] : [r, r + 1], [1, r], [r - 1, r + 1], [1, 2], [r - 1, r], [1, r - 1]].filter(x => x[0] < x[1])),
          expl: raw`Populations $\propto e^{\pm\mu B/k_BT}$, so aligned : anti-aligned $= e^{2\mu B/k_BT} = ${r} : 1$. The ${up ? 'aligned' : 'anti-aligned'} fraction is $${up ? F.frac(r, r + 1) : F.frac(1, r + 1)}$.`,
        };
      }
      if (v === 'curie') {
        const hi = R.bool(0.75);
        const a = R.pick([2, 3, 4, 1 / 2]), b = R.pick([2, 3, 4, 1 / 2, 1 / 3]);
        const X = hi ? a / b : 1;
        return {
          q: raw`A paramagnetic salt of independent spin-1/2 moments is in the ${hi ? 'high-temperature limit, $\\mu B \\ll k_BT$' : 'low-temperature limit, $\\mu B \\gg k_BT$'}. The applied field is multiplied by $${fx(a)}$ and the absolute temperature by $${fx(b)}$, keeping the system in the same limit. By what factor does the magnetization change?`,
          ...exactMC(R, X, hi ? [a * b, b / a, a, 1 / b, 1, a / (b * b)] : [a / b, a, a * b, 1 / b, b / a], '', { positive: true }),
          expl: hi ? raw`For $\mu B \ll k_BT$, $M = N\mu\tanh(\mu B/k_BT) \approx N\mu^2B/k_BT$ (Curie's law), so $M \propto B/T$: factor $${fx(X)}$.` : raw`For $\mu B \gg k_BT$ the moments are essentially all aligned: $M \approx N\mu$ (saturation), so the factor is 1.`,
        };
      }
      const T1 = R.pick([0.5, 1, 2, 4]), B1 = R.pick([1, 2, 4, 5]), B2 = B1 * R.pick([0.01, 0.02, 0.05, 0.1, 0.25]);
      const T2 = T1 * B2 / B1;
      return {
        q: raw`An ideal paramagnet of non-interacting spins is cooled to $${T1}\,\text{K}$ in a field of $${B1}\,\text{T}$, thermally isolated, and then the field is reduced slowly (reversibly) to $${F.num(B2, 3)}\,\text{T}$. Neglecting the lattice heat capacity and interactions between spins, what is the final temperature?`,
        ...GRE.numeric(R, T2, [T1, T1 * B1 / B2, T1 * Math.sqrt(B2 / B1), T1 * Math.pow(B2 / B1, 2)], { unit: raw`\text{K}`, sig: 3 }),
        expl: raw`For ideal non-interacting spins the partition function depends only on $\mu B/k_BT$, so the entropy is a function of $B/T$ alone. A reversible adiabatic (isentropic) demagnetization keeps $B/T$ fixed: $T_2 = T_1 B_2/B_1 = ${F.num(T2, 3)}\,\text{K}$.`,
      };
    },
  });

  L.push({
    id: 'thermo.photon.scaling', sec: '4.2.6', level: 1, weight: 2,
    gen(R) {
      const v = R.weighted(['power', 'wien', 'planet', 'u'], [3, 2, 1, 1]);
      if (v === 'power') {
        const a = R.pick([1, 2, 3, 1 / 2]), b = R.pick([2, 3, 1 / 2, 3 / 2, 4]);
        const X = a * a * Math.pow(b, 4);
        const obj = R.pick(['a spherical black body', 'a star (treated as a black body)', 'a small blackened sphere']);
        return {
          q: raw`The absolute temperature of ${obj} is multiplied by $${fx(b)}$${a !== 1 ? ` and its radius by $${fx(a)}$` : ''}. By what factor does the total power it radiates change?`,
          ...exactMC(R, X, [a * a * b * b, a * Math.pow(b, 4), a * a * Math.pow(b, 3), Math.pow(b, 4), a * a * b, a * a * a * Math.pow(b, 4)].filter(x => exq(x) != null), '', { positive: true }),
          expl: raw`Stefan–Boltzmann: $P = \sigma(4\pi r^2)T^4 \propto r^2T^4$, so the factor is $${a !== 1 ? `(${fx(a)})^2` : ''}(${fx(b)})^4 = ${fx(X)}$.`,
        };
      }
      if (v === 'wien') {
        if (R.bool()) {
          const T = R.pick([300, 1000, 2900, 3000, 5800, 6000, 10000, 2.7, 30000]);
          const lam = C.wien / T;
          return {
            q: raw`At what wavelength does the spectral intensity (per unit wavelength) of black-body radiation at $${F.num(T)}\,\text{K}$ peak? (Wien's constant $b \approx 2.9\times10^{-3}\,\text{m}\cdot\text{K}$.)`,
            ...GRE.numeric(R, lam, [lam * 10, lam / 10, T / C.wien * 1e-6, lam * 1000], { unit: raw`\text{m}`, fill: [10, 0.1, 100, 0.01, 3, 1 / 3] }),
            expl: raw`$\lambda_{\max} = b/T = 2.9\times10^{-3}/${F.num(T)} \approx ${F.sci(lam, 2)}\,\text{m}$.`,
          };
        }
        const lamnm = R.pick([290, 400, 500, 580, 725, 966, 2900, 10000]);
        const T = C.wien / (lamnm * 1e-9);
        return {
          q: raw`The thermal spectrum of an object (treated as a black body) peaks at $${lamnm}\,\text{nm}$. Its surface temperature is closest to (Wien's constant $b \approx 2.9\times10^{-3}\,\text{m}\cdot\text{K}$)`,
          ...GRE.numeric(R, T, [T / 10, T * 10, T / 1000, T * 2], { unit: raw`\text{K}`, fill: [10, 0.1, 3, 1 / 3, 100] }),
          expl: raw`$T = b/\lambda_{\max} = 2.9\times10^{-3}/(${lamnm}\times10^{-9}) \approx ${F.num(T, 2)}\,\text{K}$.`,
        };
      }
      if (v === 'planet') {
        const d = R.pick([4, 9, 16, 1 / 4, 1 / 9]);
        const X = Math.pow(d, -0.5);
        return {
          q: raw`A black-body planet in equilibrium absorbs sunlight and re-radiates it as thermal radiation. If it were moved to $${fx(d)}$ times its present distance from the star, by what factor would its equilibrium temperature change?`,
          ...exactMC(R, X, [1 / d, 1 / (d * d), Math.pow(d, 0.5), Math.pow(d, -0.25), d], '', { positive: true }),
          expl: raw`Absorbed power $\propto 1/d^2$ must equal emitted power $\propto T^4$, so $T \propto d^{-1/2}$: factor $(${fx(d)})^{-1/2} = ${fx(X)}$.`,
        };
      }
      const b = R.pick([2, 3, 1 / 2, 4]);
      const ask = R.pick(['u', 'n', 'S']);
      const p = { u: 4, n: 3, S: 3 }[ask];
      const X = Math.pow(b, p);
      return {
        q: raw`The absolute temperature of the black-body radiation in a cavity of fixed volume is multiplied by $${fx(b)}$. By what factor does ${{ u: 'its energy density', n: 'the number of photons in the cavity', S: 'the entropy of the radiation' }[ask]} change?`,
        ...exactMC(R, X, [Math.pow(b, 4), Math.pow(b, 3), b, b * b, Math.pow(b, 5)].filter(x => !close(x, X)), '', { positive: true }),
        expl: raw`For a photon gas $u \propto T^4$, while the photon number density and the entropy density both scale as $T^3$ ($s = \tfrac43 u/T$). Factor: $(${fx(b)})^{${p}} = ${fx(X)}$.`,
      };
    },
  });

  L.push({
    id: 'thermo.photon.gas', sec: '4.2.6', level: 3,
    gen(R) {
      const v = R.pick(['P', 'adiabat', 'iso', 'roman']);
      if (v === 'P') {
        return {
          q: raw`Black-body radiation in an enclosure has energy density $u$ (isotropic). What pressure does it exert on the walls?`,
          ...symMC(R, '\\dfrac{u}{3}', ['u', '\\dfrac{u}{2}', '\\dfrac{2u}{3}', '\\dfrac{u}{6}', '\\dfrac{4u}{3}']),
          expl: raw`For massless particles $E = pc$; averaging the momentum flux over all directions gives $P = u/3$ (compare $P = \tfrac23 u$ for a nonrelativistic ideal gas).`,
        };
      }
      if (v === 'adiabat') {
        const [r, tf] = R.pick([[8, 1 / 2], [27, 1 / 3], [1 / 8, 2], [64, 1 / 4], [1 / 27, 3]]);
        const askP = (tf >= 1 || tf === 1 / 2) && R.bool(0.35);
        const corr = askP ? Math.pow(tf, 4) : tf;
        return {
          q: raw`A cavity filled with black-body radiation (and nothing else) has perfectly reflecting walls. Its volume is changed slowly by a factor of $${fx(r)}$. By what factor does ${askP ? 'the radiation pressure' : 'the temperature of the radiation'} change?`,
          ...exactMC(R, corr, askP ? [Math.pow(tf, 3), 1 / r, tf, Math.pow(r, -5 / 3), Math.pow(tf, 2)] : [Math.pow(r, -2 / 3), 1 / r, 1, Math.pow(tf, 2), Math.pow(r, -1 / 4)].filter(x => exq(x) != null), '', { positive: true }),
          expl: raw`A slow change with no heat flow is isentropic, and $S \propto VT^3$, so $T \propto V^{-1/3}$: factor $${fx(tf)}$${askP ? raw`. Since $P = aT^4/3$, the pressure changes by $${fx(corr)}$ ($PV^{4/3}$ = const)` : ''}. ($T V^{2/3}$ = const would be a monatomic gas.)`,
        };
      }
      if (v === 'iso') {
        const [what, corr, wr, why] = R.pick([
          ['how much heat must be supplied', '\\dfrac{4}{3}u\\,\\Delta V', ['u\\,\\Delta V', '\\dfrac{1}{3}u\\,\\Delta V', '0', '\\dfrac{2}{3}u\\,\\Delta V'], 'The energy grows by $u\\Delta V$ and the radiation does work $P\\Delta V = \\tfrac13u\\Delta V$, so $Q = \\tfrac43u\\Delta V$ (equivalently $T\\Delta S$ with $S = \\tfrac43 uV/T$).'],
          ['how much work does the radiation do on the piston', '\\dfrac{1}{3}u\\,\\Delta V', ['u\\,\\Delta V', '\\dfrac{4}{3}u\\,\\Delta V', '0', '\\dfrac{2}{3}u\\,\\Delta V'], 'At constant $T$ the pressure $P = u/3$ is constant, so $W = P\\Delta V = \\tfrac13u\\Delta V$.'],
          ['by how much does the energy of the radiation increase', 'u\\,\\Delta V', ['0', '\\dfrac{1}{3}u\\,\\Delta V', '\\dfrac{4}{3}u\\,\\Delta V', '-\\dfrac{1}{3}u\\,\\Delta V'], 'The energy density depends only on $T$, so at fixed $T$ the energy grows by $u\\Delta V$, unlike an ideal gas whose energy would not change.'],
        ]);
        return {
          q: raw`A cylinder of black-body radiation at temperature $T$ (energy density $u$) is expanded slowly by $\Delta V$ while kept at constant temperature by contact with a reservoir. During the expansion, ${what}?`,
          ...symMC(R, corr, wr),
          expl: why,
        };
      }
      return Object.assign({ level: 2 }, romanQ(R, 'Which of the following is (are) true of black-body radiation (a photon gas) in a cavity at temperature $T$?',
        [['The chemical potential of the photons is zero.', 'photon number is not conserved; it adjusts to minimize $F$.'],
          ['The energy density is proportional to $T^4$.', 'Stefan–Boltzmann.'],
          ['The pressure is one third of the energy density.', 'for an isotropic gas of massless particles.'],
          ['The number of photons is not fixed but depends on $T$ and $V$.', '$N \\propto VT^3$.'],
          ['The photons obey Bose–Einstein statistics.', 'photons are spin-1 bosons.']],
        [['The pressure is two thirds of the energy density.', 'that holds for a nonrelativistic ideal gas; photons give $u/3$.'],
          ['The total number of photons is conserved when the cavity is heated.', 'photons are created and absorbed by the walls.'],
          ['The photons obey Fermi–Dirac statistics.', 'photons are bosons.'],
          ['The energy density depends on the material of the cavity walls.', 'equilibrium radiation is universal.'],
          ['The heat capacity at constant volume is independent of temperature.', '$C_V \\propto VT^3$.']]));
    },
  });

  // ================================================================== 4.3 Quantum statistical mechanics
  L.push({
    id: 'thermo.qsm.occupation', sec: '4.3', level: 2, weight: 2,
    gen(R) {
      const v = R.weighted(['exact', 'approx', 'ratio'], [3, 1, 1]);
      if (v === 'approx') {
        const x = R.pick([1, 2, 3, 4, 5]);
        const stat = R.pick(['FD', 'BE']);
        const kT = R.pick([0.01, 0.02, 0.025, 0.05, 0.1]);
        const d = x * kT;
        const f = stat === 'FD' ? 1 / (Math.exp(x) + 1) : 1 / (Math.exp(x) - 1);
        return {
          q: raw`A single-particle state of an ideal ${stat === 'FD' ? 'Fermi' : 'Bose'} gas lies $${F.num(d)}\,\text{eV}$ above the chemical potential, and $k_BT = ${F.num(kT)}\,\text{eV}$. Its mean occupation number is closest to`,
          ...GRE.numeric(R, f, [stat === 'FD' ? 1 / (Math.exp(x) - 1) : 1 / (Math.exp(x) + 1), Math.exp(-x) * (stat === 'FD' ? 2 : 0.5), 1 / (Math.exp(-x) + 1), Math.exp(-x / 2)], { tol: 0.1 }),
          expl: raw`$\bar n = 1/(e^{(\varepsilon - \mu)/k_BT} ${stat === 'FD' ? '+' : '-'} 1) = 1/(e^{${x}} ${stat === 'FD' ? '+' : '-'} 1) \approx ${F.num(f, 2)}$.`,
        };
      }
      const r = R.pick([2, 3, 4, 5, 7, 9]);
      if (v === 'ratio') {
        return {
          q: raw`For a single-particle state with $\varepsilon - \mu = k_BT\ln ${r}$, what is the ratio of the Bose–Einstein mean occupation number to the Fermi–Dirac mean occupation number?`,
          ...fracMC(R, [r + 1, r - 1], [[r - 1, r + 1], [1, 1], [r, 1], [r + 1, r], [r * r, 1], [r, r - 1]]),
          expl: raw`$\bar n_{BE} = 1/(${r} - 1)$ and $\bar n_{FD} = 1/(${r} + 1)$, so the ratio is $${F.frac(r + 1, r - 1)}$. It approaches 1 when $e^{(\varepsilon-\mu)/k_BT} \gg 1$ (classical limit).`,
        };
      }
      const stat = R.pick(['FD', 'FD', 'BE', 'MB']);
      const below = stat === 'FD' && R.bool(0.4);
      const empty = stat === 'FD' && R.bool(0.3);
      const name = { FD: 'identical fermions (Fermi–Dirac statistics)', BE: 'identical bosons (Bose–Einstein statistics)', MB: 'classical particles (Maxwell–Boltzmann statistics)' }[stat];
      let c;
      if (stat === 'FD') c = below ? [r, r + 1] : [1, r + 1];
      else if (stat === 'BE') c = [1, r - 1];
      else c = [1, r];
      if (empty) c = [c[1] - c[0], c[1]];
      const wr = [[1, r + 1], [r, r + 1], [1, r - 1], [1, r], [r - 1, r], [1, 2], [r - 1, r + 1]];
      return {
        q: raw`A gas of ${name} is in equilibrium at temperature $T$ and chemical potential $\mu$. For a single-particle state with energy $\varepsilon = \mu ${below ? '-' : '+'} k_BT\ln ${r}$, what is ${empty ? 'the probability that the state is empty' : 'the mean occupation number'}?`,
        ...fracMC(R, c, wr),
        expl: raw`${{ FD: '$\\bar n = 1/(e^{(\\varepsilon-\\mu)/k_BT} + 1)$', BE: '$\\bar n = 1/(e^{(\\varepsilon-\\mu)/k_BT} - 1)$', MB: '$\\bar n = e^{-(\\varepsilon-\\mu)/k_BT}$' }[stat]} with $e^{(\varepsilon - \mu)/k_BT} = ${below ? F.frac(1, r) : r}$ gives $\bar n = ${stat === 'FD' ? F.frac(below ? r : 1, r + 1) : F.frac(c[0], c[1])}$${empty ? `, so the state is empty with probability $1 - \\bar n = ${F.frac(c[0], c[1])}$` : ''}.`,
      };
    },
  });

  L.push({
    id: 'thermo.qsm.fermi', sec: '4.3', level: 2, weight: 2,
    gen(R) {
      const v = R.weighted(['scale', 'avg', 'pressure', 'TF'], [3, 2, 2, 2]);
      if (v === 'scale') {
        const d = R.pick([3, 3, 2, 1]);
        const nf = d === 3 ? R.pick([8, 27, 1 / 8, 64]) : R.pick([2, 3, 4, 1 / 2]);
        const mf = R.pick([1, 1, 2, 1 / 2, 4]);
        const ask = R.pick(['E', 'v']);
        const pn = { 3: 2 / 3, 2: 1, 1: 2 }[d];
        const ex = (p, q) => (F.fracI(p, q) === '1' ? '' : `^{${F.fracI(p, q)}}`);
        const E = Math.pow(nf, pn) / mf;
        const X = ask === 'E' ? E : Math.sqrt(E * mf * mf);
        const parts = [`the number density is multiplied by $${fx(nf)}$`];
        if (mf !== 1) parts.push(`the particle mass by $${fx(mf)}$`);
        return {
          q: raw`For an ideal gas of spin-1/2 fermions confined to ${['a line', 'a plane', 'three dimensions'][d - 1]} at $T = 0$, ${parts.join(' and ')}. By what factor does the Fermi ${ask === 'E' ? 'energy' : 'velocity'} change?`,
          ...exactMC(R, X, [Math.pow(nf, 2 / 3) * (ask === 'E' ? 1 / mf : 1 / mf), Math.pow(nf, 1 / 3) / (ask === 'E' ? mf : mf), nf / mf, nf * nf / mf, Math.pow(nf, 2 / 3) * mf, Math.sqrt(X), X * X].filter(x => exq(x) != null && !close(x, X)), '', { positive: true }),
          expl: raw`In ${d}D, $k_F \propto n${ex(1, d)}$ and $E_F = \hbar^2k_F^2/2m \propto n${ex(2, d)}/m$${ask === 'v' ? ', while $v_F = \\hbar k_F/m \\propto n' + ex(1, d) + '/m$' : ''}. Factor: $${fx(X)}$.`,
        };
      }
      if (v === 'avg') {
        const d = R.pick([3, 3, 2, 1]);
        const c = { 3: 3 / 5, 2: 1 / 2, 1: 1 / 3 }[d];
        return {
          q: raw`An ideal gas of $N$ spin-1/2 fermions moves freely in ${['one dimension', 'two dimensions', 'three dimensions'][d - 1]} at $T = 0$, with Fermi energy $E_F$. What is the total energy?`,
          ...exactMC(R, c, [3 / 5, 1 / 2, 1 / 3, 1, 3 / 2, 2 / 3, 0].filter(x => !close(x, c)), 'NE_F'),
          expl: raw`At $T = 0$ all states up to $E_F$ are filled. In ${d}D the density of states is $g(\varepsilon) \propto \varepsilon^{${F.fracI(d - 2, 2)}}$, so $\langle\varepsilon\rangle = \dfrac{\int_0^{E_F}\varepsilon\,g\,d\varepsilon}{\int_0^{E_F}g\,d\varepsilon} = \dfrac{${d}}{${d + 2}}E_F$, and $U = ${cs(c, 'NE_F')}$. The energy is not zero, unlike a classical gas at $T = 0$.`,
        };
      }
      if (v === 'pressure') {
        const r = R.pick([2, 8, 27, 1 / 8, 1 / 27]);
        const X = Math.pow(r, -5 / 3);
        if (exq(X) == null) throw new Error('retry');
        return {
          q: raw`A degenerate ideal Fermi gas (for example, the electrons in a white dwarf, treated nonrelativistically at $T \approx 0$) is ${r > 1 ? 'expanded' : 'compressed'} so that its volume changes by a factor of $${fx(r)}$ with the number of particles fixed. By what factor does its degeneracy pressure change?`,
          ...exactMC(R, X, [1 / r, Math.pow(r, -2 / 3), Math.pow(r, -4 / 3), Math.pow(r, -2), 1, Math.pow(r, 5 / 3)].filter(x => exq(x) != null), '', { positive: true }),
          expl: raw`$P = \tfrac25 nE_F$ with $E_F \propto n^{2/3}$, so $P \propto n^{5/3} \propto V^{-5/3}$: factor $(${fx(r)})^{-5/3} = ${fx(X)}$. (Equivalently $PV^{5/3}$ = const, like a $\gamma = 5/3$ adiabat.)`,
        };
      }
      const EF = R.pick([1, 2, 3, 4, 5, 7, 10, 0.5]);
      const TF = EF / C.kB_eVK;
      return {
        q: raw`The Fermi energy of the conduction electrons in a metal is $${EF}\,\text{eV}$. What is the corresponding Fermi temperature? (Take $k_B \approx 8.6\times10^{-5}\,\text{eV/K}$.)`,
        ...GRE.numeric(R, TF, [TF * 2 / 3, TF * 10, TF / 10, EF * C.kB_eVK * 1e9], { unit: raw`\text{K}`, fill: [10, 0.1, 3, 1 / 3] }),
        expl: raw`$T_F = E_F/k_B = ${EF}/(8.6\times10^{-5}) \approx ${F.sci(TF, 2)}\,\text{K}$, far above room temperature, so the electron gas is highly degenerate at 300 K.`,
      };
    },
  });

  L.push({
    id: 'thermo.qsm.counting', sec: '4.3', level: 2, weight: 2,
    gen(R) {
      if (R.bool(0.4)) {
        const s = R.int(2, 9);
        const stat = R.pick(['dist', 'bos', 'fer']);
        const c = { dist: s + 1, bos: Math.floor(s / 2) + 1, fer: Math.floor((s + 1) / 2) }[stat];
        const name = { dist: 'distinguishable particles', bos: 'identical spinless bosons', fer: 'identical fermions, both in the same spin state,' }[stat];
        const wr = [s + 1, Math.floor(s / 2) + 1, Math.floor((s + 1) / 2), s, s + 2, 2 * s].filter(x => x !== c && x > 0);
        return {
          q: raw`Two non-interacting ${name} are placed in the same one-dimensional harmonic oscillator potential, with single-particle energies $(n + \tfrac12)\hbar\omega$. How many distinct two-particle states have total energy $${s + 1}\hbar\omega$?`,
          ...valMC(R, [String(c), c], [...new Set(wr)].map(x => [String(x), x])),
          expl: raw`We need $n_1 + n_2 = ${s}$. Distinguishable: ordered pairs, ${s + 1}. Bosons: unordered pairs, $\lfloor ${s}/2\rfloor + 1 = ${Math.floor(s / 2) + 1}$. Fermions: unordered pairs with $n_1 \neq n_2$, ${Math.floor((s + 1) / 2)}. Answer: ${c}.`,
        };
      }
      const N = R.pick([2, 2, 3]), g = R.int(N, 6);
      const ask = R.weighted(['dist', 'bos', 'fer', 'same'], [1, 2, 2, 1]);
      const nD = Math.pow(g, N), nB = binom(g + N - 1, N), nF = binom(g, N);
      if (ask === 'same') {
        const stat = R.pick(['dist', 'bos']);
        const c = stat === 'dist' ? [1, g] : [g, nB];
        return {
          q: raw`Two non-interacting particles each occupy one of ${g} single-particle states of equal energy. If all allowed two-particle states are equally likely, what is the probability that both particles are in the same single-particle state, if they are ${stat === 'dist' ? 'distinguishable' : 'identical bosons'}?`,
          ...fracMC(R, c, [[1, g], [g, nB], [0, 1], [1, nB], [1, g * g], [2, g]].filter(x => !(x[0] * c[1] === c[0] * x[1]))),
          expl: raw`Distinguishable: $${g}^2 = ${g * g}$ states, ${g} of them doubly occupied: $1/${g}$. Bosons: $\binom{${g + 1}}{2} = ${nB}$ states, ${g} doubly occupied: $${F.frac(g, nB)}$, enhanced relative to the classical value. (Identical fermions: 0.)`,
        };
      }
      const c = { dist: nD, bos: nB, fer: nF }[ask];
      const name = { dist: 'distinguishable', bos: 'identical bosons', fer: 'identical fermions (in the same spin state)' }[ask];
      const wr = [nD, nB, nF, fact(g) / fact(g - N), N * g, Math.pow(N, g), binom(g, N - 1), g + N, binom(g + N, N), 2 * c].filter(x => x !== c && x > 0);
      return {
        q: raw`${N === 2 ? 'Two' : 'Three'} non-interacting particles are distributed among ${g} single-particle states of equal energy. How many distinct ${N}-particle states are possible if the particles are ${name}?`,
        ...valMC(R, [String(c), c], [...new Set(wr)].map(x => [String(x), x])),
        expl: raw`Distinguishable: $g^N = ${nD}$. Identical bosons (any occupancy, order irrelevant): $\binom{g+N-1}{N} = ${nB}$. Identical fermions (at most one per state): $\binom{g}{N} = ${nF}$. Answer: ${c}.`,
      };
    },
  });

  L.push({
    id: 'thermo.qsm.concept', sec: '4.3', level: 2, weight: 2,
    gen(R) {
      if (R.bool(0.55)) {
        return romanQ(R, 'Which of the following statements about ideal quantum gases is (are) correct?',
          [['The Fermi–Dirac mean occupation number of any single-particle state lies between 0 and 1.', 'Pauli exclusion: $1/(e^x + 1) < 1$.'],
            ['At $T = 0$ the Fermi–Dirac distribution is a step function: states below $\\mu$ are full and states above are empty.', 'the exponent goes to $\\pm\\infty$.'],
            ['Both the Bose–Einstein and Fermi–Dirac distributions reduce to the Boltzmann distribution when $\\varepsilon - \\mu \\gg k_BT$.', 'the $\\pm1$ becomes negligible.'],
            ['For an ideal Bose gas, the chemical potential cannot exceed the lowest single-particle energy.', 'otherwise some occupation numbers would be negative.'],
            ['At any temperature $T > 0$, the Fermi–Dirac occupation of a state with $\\varepsilon = \\mu$ is exactly 1/2.', '$1/(e^0 + 1) = 1/2$.'],
            ['Below the Bose–Einstein condensation temperature, a macroscopic fraction of the bosons occupies the single-particle ground state.', 'this is Bose–Einstein condensation.']],
          [['The Bose–Einstein mean occupation number can never exceed 1.', 'it is unbounded as $\\varepsilon \\to \\mu$; many bosons can share a state.'],
            ['At $T = 0$, an ideal Fermi gas has zero total energy.', 'the filled Fermi sea has $U = \\tfrac35 NE_F$ in 3D.'],
            ['The Fermi–Dirac occupation of a state with $\\varepsilon = \\mu$ equals 1 at every temperature.', 'it is exactly 1/2 for $T > 0$.'],
            ['For an ideal Bose gas, the chemical potential must be greater than the ground-state energy.', 'it must be less than (or equal to) it.'],
            ['At high temperature and low density, the quantum distributions differ greatly from the Boltzmann distribution.', 'that is precisely the classical limit, where they agree.'],
            ['At $T = 0$, an ideal Fermi gas exerts no pressure.', 'it exerts degeneracy pressure $P = \\tfrac25 nE_F$.']]);
      }
      const B = [['a photon', 'spin 1'], ['a $^{4}\\text{He}$ atom', '2 protons + 2 neutrons + 2 electrons = 6 fermions'], ['a deuteron ($^{2}\\text{H}$ nucleus)', 'proton + neutron = 2 fermions'], ['an $\\alpha$ particle', '4 nucleons'], ['a $\\pi^+$ meson', 'quark + antiquark, spin 0'], ['a Cooper pair of electrons', '2 electrons'], ['a $^{87}\\text{Rb}$ atom', '37 + 50 + 37 = 124 fermions'], ['a hydrogen ($^{1}\\text{H}$) atom', 'proton + electron = 2 fermions'], ['a $^{7}\\text{Li}$ atom', '3 + 4 + 3 = 10 fermions']];
      const Fm = [['an electron', 'spin 1/2'], ['a $^{3}\\text{He}$ atom', '2 + 1 + 2 = 5 fermions'], ['a proton', 'spin 1/2'], ['a neutron', 'spin 1/2'], ['a $^{6}\\text{Li}$ atom', '3 + 3 + 3 = 9 fermions'], ['a $^{40}\\text{K}$ atom', '19 + 21 + 19 = 59 fermions'], ['a muon', 'spin 1/2'], ['a $^{3}\\text{He}$ nucleus', '3 nucleons']];
      const bos = R.bool();
      const T = (bos ? B : Fm).map(x => [x[0].charAt(0).toUpperCase() + x[0].slice(1).replace(/^A /, 'A '), `it is a ${bos ? 'boson' : 'fermion'} (${x[1]}).`]);
      const Fs = (bos ? Fm : B).map(x => [x[0].charAt(0).toUpperCase() + x[0].slice(1), `it is a ${bos ? 'fermion' : 'boson'} (${x[1]}).`]);
      return romanQ(R, `Which of the following obey(s) ${bos ? 'Bose–Einstein' : 'Fermi–Dirac'} statistics?`, T, Fs, 'A composite particle made of an even number of fermions is a boson; an odd number makes it a fermion.');
    },
  });

  L.push({
    id: 'thermo.qsm.filling', sec: '4.3', level: 3, weight: 2,
    gen(R) {
      const pot = R.pick(['well', 'well', 'osc1', 'osc3']);
      const kind = R.weighted(['half', 'spinless', 'boson'], [3, 1, 1]);
      const N = pot === 'osc3' ? R.int(2, 20) : R.int(2, 9);
      const ask = R.pick(['Etot', 'Etop']);
      // levels: [energy, degeneracy (orbital)]
      const lev = [];
      for (let n = 0; n < 40; n++) {
        if (pot === 'well') lev.push([(n + 1) * (n + 1), 1]);
        else if (pot === 'osc1') lev.push([n + 0.5, 1]);
        else lev.push([n + 1.5, (n + 1) * (n + 2) / 2]);
      }
      const unit = pot === 'well' ? 'E_1' : '\\hbar\\omega';
      const fill = (cap) => {
        let left = N, tot = 0, top = 0;
        for (const [E, g] of lev) {
          if (left <= 0) break;
          const k = Math.min(left, g * cap);
          tot += k * E; top = E; left -= k;
        }
        return [tot, top];
      };
      const cap = kind === 'half' ? 2 : kind === 'spinless' ? 1 : Infinity;
      const [tot, top] = fill(cap);
      const alt = [fill(1), fill(2), fill(Infinity), fill(4)];
      const potTxt = { well: 'a one-dimensional infinite square well (single-particle energies $E_n = n^2E_1$, $n = 1, 2, \\ldots$)', osc1: 'a one-dimensional harmonic oscillator potential (energies $(n + \\tfrac12)\\hbar\\omega$)', osc3: 'a three-dimensional isotropic harmonic oscillator potential (energies $(n + \\tfrac32)\\hbar\\omega$, with level $n$ having $(n+1)(n+2)/2$ orbital states)' }[pot];
      const who = { half: 'non-interacting spin-1/2 fermions', spinless: 'non-interacting identical fermions, all in the same spin state,', boson: 'non-interacting identical spin-0 bosons' }[kind];
      const corr = ask === 'Etot' ? tot : top;
      const wr = alt.map(a => (ask === 'Etot' ? a[0] : a[1])).concat(ask === 'Etot' ? [N * top, tot - lev[0][0], tot + top] : [lev[1][0], top + (lev[1][0] - lev[0][0]), lev[0][0] * N]);
      return {
        q: raw`${N} ${who} are placed in ${potTxt}. In the ground state of the system, what is ${ask === 'Etot' ? 'the total energy' : 'the energy of the highest occupied single-particle level'}?`,
        ...exactMC(R, corr, wr.filter(x => !close(x, corr) && x > 0), unit),
        expl: raw`${kind === 'boson' ? 'Bosons can all occupy the lowest level.' : kind === 'half' ? 'Each orbital state holds two spin-1/2 fermions (spin up and down).' : 'Spin-polarized fermions occupy each orbital state at most once.'} Filling from the bottom gives total energy $${cs(tot, unit)}$ with the highest occupied level at $${cs(top, unit)}$.`,
      };
    },
  });

  L.push({
    id: 'thermo.qsm.electrons', sec: '4.3', level: 2,
    gen(R) {
      const v = R.pick(['frac', 'why', 'ratio']);
      const EF = R.pick([2, 3, 4, 5, 7, 10]);
      const T = R.pick([30, 100, 300, 600, 1000]);
      const kT = C.kB_eVK * T;
      if (v === 'frac') {
        const fr = kT / EF;
        return {
          q: raw`In a metal with Fermi energy $${EF}\,\text{eV}$ at $${T}\,\text{K}$, roughly what fraction of the conduction electrons can be thermally excited? (Take $k_B \approx 8.6\times10^{-5}\,\text{eV/K}$.)`,
          ...GRE.numeric(R, fr, [fr * 100, fr / 100, 1, 1.5 * kT], { fill: [10, 0.1, 100, 0.01, 1000] }),
          expl: raw`Only electrons within about $k_BT$ of the Fermi surface have empty states nearby to move into, a fraction $\sim k_BT/E_F = ${F.num(kT, 2)}/${EF} \approx ${F.sci(fr, 1)}$. This is why the electronic heat capacity of a metal is so small.`,
        };
      }
      if (v === 'ratio') {
        const r = R.pick([2, 3, 4, 1 / 2, 1 / 3]);
        return {
          q: raw`The electronic contribution to the heat capacity of a metal (with $k_BT \ll E_F$) is measured at temperature $T$ and again at $${fx(r)}\,T$. By what factor does it change?`,
          ...exactMC(R, r, [r * r * r, r * r, 1, Math.sqrt(r), 1 / r], '', { positive: true }),
          expl: raw`$C_{el} \approx \tfrac{\pi^2}{2}Nk_B\,(k_BT/E_F) \propto T$, so it changes by $${fx(r)}$.`,
        };
      }
      return {
        q: 'Why do conduction electrons contribute much less than $\\tfrac32 k_B$ per electron to the heat capacity of a metal at room temperature?',
        ...txtMC(R, 'Because of the Pauli principle, only electrons within about $k_BT$ of the Fermi energy can absorb thermal energy.',
          ['Because the electrons are bound to the ions and cannot move freely.', 'Because electrons obey Bose–Einstein statistics and condense into the ground state.', 'Because the electron mass is much smaller than the ion mass.', 'Because the electrons lose their energy to the lattice through collisions.', 'Because the equipartition theorem applies only to particles with zero spin.']),
        expl: 'The Fermi energy (several eV) is much larger than $k_BT \\approx 0.025\\,\\text{eV}$. Electrons deep in the Fermi sea have no empty states within reach, so only a fraction $\\sim k_BT/E_F$ participate, giving $C_{el} \\propto T$ and small.',
      };
    },
  });

  // tidy TeX: drop trivial exponents such as T^{1} or (3)^{1}
  const tidy = s => (typeof s === 'string' ? s.replace(/\^\{1\}(?![0-9])/g, '') : s);
  for (const t of L) {
    const g = t.gen;
    t.gen = R => {
      const o = g(R);
      o.q = tidy(o.q); o.expl = tidy(o.expl);
      o.choices = o.choices.map(tidy);
      return o;
    };
  }

  GRE.addTemplates('thermo', L);
})(typeof window !== 'undefined' ? window.GRE : this.GRE);
