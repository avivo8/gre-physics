/* GRE Physics Trainer — question engine.
 *
 * Every topic registers question *templates*. A template's gen(R) builds one
 * question from a seeded random generator R, so the same seed always yields the
 * same question. buildBank(topic) walks the templates round-robin with fresh
 * seeds until it has GRE.TARGET unique questions, giving every topic a stable,
 * numbered bank (Q1 … Q5000) without shipping 45 000 questions as data.
 */
(function (root) {
  'use strict';
  const GRE = (root.GRE = root.GRE || {});
  GRE.TARGET = 5000;

  // ---------------------------------------------------------------- hashing / RNG
  function hash32(str) {
    let h = 0x811c9dc5 ^ str.length;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b);
    h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35);
    h ^= h >>> 16;
    return h >>> 0;
  }
  GRE.hash = hash32;

  class Rand {
    constructor(seed) {
      this.s = typeof seed === 'number' ? seed >>> 0 : hash32(String(seed));
    }
    /** uniform in [0, 1) */
    random() {
      let t = (this.s = (this.s + 0x6d2b79f5) >>> 0);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
    /** integer in [a, b] inclusive */
    int(a, b) { return a + Math.floor(this.random() * (b - a + 1)); }
    /** real in [a, b); rounded to dp decimals if dp given */
    real(a, b, dp) {
      const x = a + this.random() * (b - a);
      return dp == null ? x : +x.toFixed(dp);
    }
    /** value on the grid a, a+st, …, b */
    step(a, b, st) {
      const n = Math.round((b - a) / st);
      return +(a + st * this.int(0, n)).toFixed(10);
    }
    pick(arr) { return arr[Math.floor(this.random() * arr.length)]; }
    /** n distinct elements */
    pickN(arr, n) { return this.shuffle(arr).slice(0, n); }
    shuffle(arr) {
      const a = arr.slice();
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(this.random() * (i + 1));
        const t = a[i]; a[i] = a[j]; a[j] = t;
      }
      return a;
    }
    bool(p = 0.5) { return this.random() < p; }
    sign() { return this.random() < 0.5 ? -1 : 1; }
    weighted(items, weights) {
      const tot = weights.reduce((s, w) => s + w, 0);
      let r = this.random() * tot;
      for (let i = 0; i < items.length; i++) { r -= weights[i]; if (r < 0) return items[i]; }
      return items[items.length - 1];
    }
  }
  GRE.Rand = Rand;

  // ---------------------------------------------------------------- formatting (TeX)
  const F = (GRE.fmt = {});
  const gcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) { const t = a % b; a = b; b = t; } return a; };
  F.gcd = gcd;
  const trimZeros = s => (s.indexOf('.') >= 0 ? s.replace(/\.?0+$/, '') : s);

  /** round to `sig` significant figures (returns a number) */
  F.round = (x, sig = 2) => (x === 0 ? 0 : +x.toPrecision(sig));

  /** scientific notation, e.g. "3.0 \times 10^{8}" (TeX, no $). keepZeros keeps "3.0". */
  F.sci = function (x, sig = 2, keepZeros = false) {
    if (!isFinite(x)) throw new Error('fmt.sci: non-finite ' + x);
    if (x === 0) return '0';
    let e = Math.floor(Math.log10(Math.abs(x)));
    let m = +(x / Math.pow(10, e)).toPrecision(sig);
    if (Math.abs(m) >= 10) { m /= 10; e += 1; }
    if (Math.abs(m) < 1) { m *= 10; e -= 1; }
    let ms = m.toFixed(Math.max(0, sig - 1));
    if (!keepZeros) ms = trimZeros(ms);
    if (e === 0) return ms;
    if (ms === '1') return `10^{${e}}`;
    if (ms === '-1') return `-10^{${e}}`;
    return `${ms} \\times 10^{${e}}`;
  };

  /** plain decimal for 1e-3 <= |x| < 1e5, scientific otherwise (TeX, no $) */
  F.num = function (x, sig = 2, keepZeros = false) {
    if (!isFinite(x)) throw new Error('fmt.num: non-finite ' + x);
    if (x === 0) return '0';
    const ax = Math.abs(x);
    if (ax >= 1e-3 && ax < 1e5) {
      if (keepZeros) {
        const p = x.toPrecision(sig);
        if (!/e/.test(p)) return p;
      }
      return String(+x.toPrecision(sig));
    }
    return F.sci(x, sig, keepZeros);
  };

  /** fixed decimals with trailing zeros trimmed */
  F.fix = (x, dp = 2) => trimZeros(x.toFixed(dp));

  /** reduced fraction n/d as TeX: "\frac{3}{4}", "-\frac{1}{2}", "5" */
  F.frac = function (n, d = 1) {
    if (d === 0) throw new Error('fmt.frac: zero denominator');
    if (d < 0) { n = -n; d = -d; }
    const g = gcd(n, d) || 1; n /= g; d /= g;
    if (d === 1) return String(n);
    return (n < 0 ? '-' : '') + `\\frac{${Math.abs(n)}}{${d}}`;
  };
  /** reduced fraction n/d inline: "3/4" (for exponents, \text{} etc.) */
  F.fracI = function (n, d = 1) {
    if (d < 0) { n = -n; d = -d; }
    const g = gcd(n, d) || 1; n /= g; d /= g;
    return d === 1 ? String(n) : `${n}/${d}`;
  };
  /** coefficient in front of a symbol: 1 -> "", -1 -> "-", 2 -> "2", 1/2 -> "\frac{1}{2}" */
  F.coef = function (n, d = 1) {
    const s = F.frac(n, d);
    return s === '1' ? '' : s === '-1' ? '-' : s;
  };
  /** simplify the square root of a positive integer: [outside, inside] */
  function surdParts(n) {
    let out = 1, inn = n;
    for (let k = 2; k * k <= inn; k++) while (inn % (k * k) === 0) { inn /= k * k; out *= k; }
    return [out, inn];
  }
  F.surdParts = surdParts;
  /** TeX for sqrt(n), n a positive integer: 8 -> "2\sqrt{2}", 9 -> "3" */
  F.sqrt = function (n) {
    const [o, i] = surdParts(n);
    if (i === 1) return String(o);
    return (o === 1 ? '' : String(o)) + `\\sqrt{${i}}`;
  };

  function toRational(x, maxDen = 64, eps = 1e-9) {
    for (let d = 1; d <= maxDen; d++) {
      const n = Math.round(x * d);
      if (Math.abs(n / d - x) < eps * Math.max(1, Math.abs(x))) return [n, d];
    }
    return null;
  }
  F.toRational = toRational;

  /**
   * Try to write a positive-or-negative real number exactly: integers, p/q,
   * a*sqrt(b)/c, a/(c*sqrt(d)), cube roots. Returns TeX or null.
   * Handy for "by what factor does X change?" answers computed numerically.
   */
  F.exact = function (x, maxDen = 64) {
    if (!isFinite(x)) return null;
    if (x === 0) return '0';
    const sg = x < 0 ? '-' : '';
    const ax = Math.abs(x);
    const r = toRational(ax, maxDen);
    if (r) return sg + F.frac(r[0], r[1]);
    const r2 = toRational(ax * ax, maxDen * maxDen > 4096 ? 4096 : maxDen * maxDen);
    if (r2) {
      const [p, q] = r2;
      const [a, b] = surdParts(p);
      const [c, d] = surdParts(q);
      if (d === 1) { // a sqrt(b) / c
        const g = gcd(a, c); const A = a / g, C = c / g;
        const top = (A === 1 ? '' : A) + `\\sqrt{${b}}`;
        return sg + (C === 1 ? top : `\\frac{${top}}{${C}}`);
      }
      if (b === 1) { // a / (c sqrt(d))
        const g = gcd(a, c); const A = a / g, C = c / g;
        return sg + `\\frac{${A}}{${C === 1 ? '' : C}\\sqrt{${d}}}`;
      }
      // general: sqrt(p/q) = sqrt(pq)/q
      const [e, f] = surdParts(p * q);
      const g = gcd(e, q); const E = e / g, Q = q / g;
      const top = (E === 1 ? '' : E) + `\\sqrt{${f}}`;
      return sg + (Q === 1 ? top : `\\frac{${top}}{${Q}}`);
    }
    const r3 = toRational(ax * ax * ax, 512);
    if (r3) {
      const [p, q] = r3;
      if (q === 1) return sg + `\\sqrt[3]{${p}}`;
      return sg + `\\sqrt[3]{${F.fracI(p, q)}}`;
    }
    return null;
  };

  // ---------------------------------------------------------------- physical constants (SI)
  GRE.C = {
    c: 3.0e8, h: 6.63e-34, hbar: 1.05e-34, e: 1.6e-19, me: 9.11e-31, mp: 1.67e-27, mn: 1.67e-27,
    kB: 1.38e-23, NA: 6.02e23, R: 8.31, eps0: 8.85e-12, mu0: 4 * Math.PI * 1e-7, k: 9.0e9,
    G: 6.67e-11, sigma: 5.67e-8, amu: 1.66e-27, eV: 1.6e-19, g: 9.8, atm: 1.0e5,
    hc_eVnm: 1240, mec2_MeV: 0.511, mpc2_MeV: 938, a0: 0.529e-10, Ry_eV: 13.6, wien: 2.9e-3,
    muB: 9.27e-24, muB_eVT: 5.79e-5, kB_eVK: 8.62e-5,
  };

  // ---------------------------------------------------------------- answer-choice builders
  const norm = s => String(s).replace(/\\[,;: !]|\s+/g, '');
  GRE.norm = norm;

  /**
   * Multiple choice from strings. `correct` and each of `wrongs` are full choice
   * strings (wrap math in $…$ yourself). Duplicates of the correct answer or of
   * each other are dropped; at least 4 distinct wrong answers must remain.
   * If more than 4 remain, 4 are chosen at random (opts.keep: always keep the
   * first `keep` of them). Choices are shuffled unless opts.sort (a comparator)
   * or opts.fixed (keep correct + wrongs in their natural ordinal order, by
   * opts.rank(string) -> number) is given.
   */
  GRE.mc = function (R, correct, wrongs, opts = {}) {
    const seen = new Set([norm(correct)]);
    const pool = [];
    for (const w of wrongs) {
      if (w == null) continue;
      const k = norm(w);
      if (!seen.has(k)) { seen.add(k); pool.push(w); }
    }
    if (pool.length < 4) throw new Error(`mc: need 4 distinct distractors, got ${pool.length}`);
    const keep = Math.min(opts.keep || 0, 4);
    let chosen = null;
    if ((opts.rank || opts.sort) && !keep && pool.length > 4) {
      // choices will be ordered: pick distractors so the correct one lands at a random position
      const cmp = opts.sort || ((a, b) => opts.rank(a) - opts.rank(b));
      const below = pool.filter(w => cmp(w, correct) < 0), above = pool.filter(w => cmp(w, correct) > 0);
      for (const p of R.shuffle([0, 1, 2, 3, 4])) {
        if (below.length >= p && above.length >= 4 - p) { chosen = R.pickN(below, p).concat(R.pickN(above, 4 - p)); break; }
      }
    }
    if (!chosen) chosen = pool.slice(0, keep).concat(R.pickN(pool.slice(keep), 4 - keep));
    let all = [correct].concat(chosen);
    if (opts.sort) all.sort(opts.sort);
    else if (opts.rank) all.sort((a, b) => opts.rank(a) - opts.rank(b));
    else all = R.shuffle(all);
    return { choices: all, ans: all.indexOf(correct) };
  };

  /**
   * Numerical choices. `correct` is a number; `wrongs` are numbers produced by
   * typical mistakes (most plausible first). Fills up with multiples of the
   * correct value if needed, keeps every pair at least `tol` (relative) apart,
   * balances the position of the correct answer among the sorted choices,
   * formats each with opts.fmt (default 2 significant figures) and appends
   * opts.unit (TeX, e.g. '\\text{m/s}'). Choices are sorted ascending like on
   * the real exam unless opts.sort === false. Each choice is wrapped in $…$.
   */
  GRE.numeric = function (R, correct, wrongs = [], opts = {}) {
    const fmt = opts.fmt || (x => F.num(x, opts.sig || 2));
    const unit = opts.unit ? '\\,' + opts.unit : '';
    const tol = opts.tol == null ? 0.12 : opts.tol;
    const fill = opts.fill || [2, 0.5, 4, 0.25, 3, 1 / 3, 1.5, 2 / 3, 10, 0.1, 8, 0.125, 5, 0.2];
    if (!isFinite(correct)) throw new Error('numeric: non-finite correct answer');
    const vals = [correct], strs = [fmt(correct)];
    const ok = v => {
      if (!isFinite(v)) return false;
      if (correct > 0 && v <= 0 && !opts.allowSign) return false;
      if (correct < 0 && v >= 0 && !opts.allowSign) return false;
      for (const u of vals) if (Math.abs(u - v) <= tol * Math.max(Math.abs(u), Math.abs(v))) return false;
      const s = fmt(v);
      return strs.indexOf(s) < 0;
    };
    const add = v => { vals.push(v); strs.push(fmt(v)); };
    const extra = [1.25, 0.8, 1.75, 0.6, 6, 1 / 6, 2.5, 0.4, 20, 0.05];
    const cands = wrongs.concat(R.shuffle(fill).map(f => correct * f), R.shuffle(extra).map(f => correct * f));
    if (opts.sort !== false) {
      // like the real exam, the right answer should be equally likely to be (A)…(E):
      // take `nb` distractors below the correct value and 4 - nb above it, plausible mistakes first
      const nb = R.int(0, 4);
      let lo = 0, hi = 0;
      for (const v of cands) {
        if (vals.length === 5) break;
        if (!ok(v)) continue;
        if (v < correct ? lo < nb : hi < 4 - nb) { add(v); if (v < correct) lo++; else hi++; }
      }
    }
    for (const v of cands) if (vals.length < 5 && ok(v)) add(v);
    if (vals.length < 5) throw new Error('numeric: could not build 5 distinct values');
    let idx = [0, 1, 2, 3, 4];
    if (opts.sort === false) idx = R.shuffle(idx);
    else idx.sort((a, b) => vals[a] - vals[b]);
    return { choices: idx.map(i => `$${strs[i]}${unit}$`), ans: idx.indexOf(0), values: idx.map(i => vals[i]) };
  };

  const ROMAN = ['I only', 'II only', 'III only', 'I and II only', 'I and III only', 'II and III only', 'I, II, and III'];
  const ROMAN_CODE = { 1: 0, 2: 1, 4: 2, 3: 3, 5: 4, 6: 5, 7: 6 };
  /** "Which of the following is (are) true?" choices from three booleans. */
  GRE.roman = function (R, truth) {
    const code = (truth[0] ? 1 : 0) | (truth[1] ? 2 : 0) | (truth[2] ? 4 : 0);
    if (!code) throw new Error('roman: at least one statement must be true');
    const ci = ROMAN_CODE[code];
    const others = [0, 1, 2, 3, 4, 5, 6].filter(i => i !== ci);
    const pick = R.pickN(others, 4).concat([ci]).sort((a, b) => a - b);
    return { choices: pick.map(i => ROMAN[i]), ans: pick.indexOf(ci) };
  };
  /** Stem with the three Roman-numeral statements laid out on their own lines. */
  GRE.romanStem = (intro, stmts) =>
    intro + '<div class="roman">' + stmts.map((s, i) => `<div><b>${['I', 'II', 'III'][i]}.</b> ${s}</div>`).join('') + '</div>';

  // ---------------------------------------------------------------- registry
  GRE.topics = [];
  GRE.T = {};
  GRE.leafIndex = {}; // leaf id -> {topic, section, leaf}

  /** def: {id, name, short, weight, chapter, sections:[{id, name, subs:[{id, name}]}]} */
  GRE.defineTopic = function (def) {
    def.templates = [];
    GRE.topics.push(def);
    GRE.T[def.id] = def;
    for (const s of def.sections) for (const l of s.subs) GRE.leafIndex[l.id] = { topic: def.id, section: s, leaf: l };
  };

  /** list of templates: {id, sec, level?, weight?, gen(R) -> {q, choices, ans, expl, fig?, level?}} */
  GRE.addTemplates = function (tid, list) {
    const T = GRE.T[tid];
    if (!T) throw new Error('unknown topic ' + tid);
    const ids = new Set(T.templates.map(t => t.id));
    for (const t of list) {
      if (!t.id || ids.has(t.id)) throw new Error(`template id missing or duplicated: ${t.id}`);
      const L = GRE.leafIndex[t.sec];
      if (!L || L.topic !== tid) throw new Error(`template ${t.id}: section ${t.sec} is not a leaf of topic ${tid}`);
      if (typeof t.gen !== 'function') throw new Error(`template ${t.id}: gen missing`);
      ids.add(t.id);
      T.templates.push(t);
    }
  };

  /** Build one question from template t with the given seed (may throw). */
  GRE.make = function (T, t, seed) {
    const R = new Rand(seed);
    const o = t.gen(R, GRE);
    // KaTeX treats the Unicode middle dot in text such as "eV·s" as a
    // control sequence. Normalize it at the engine boundary so templates
    // can use ordinary prose punctuation without creating invalid TeX.
    const clean = s => typeof s === 'string' ? s.replace(/·/g, ' ') : s;
    return {
      topic: T.id, tid: t.id, sec: t.sec, level: o.level || t.level || 2,
      profile: t.profile || 'drill', skill: t.skill || null,
      q: clean(o.q), choices: o.choices.map(clean), ans: o.ans, expl: clean(o.expl), fig: o.fig || null,
    };
  };

  const BAD = /undefined|NaN|Infinity|\[object/;
  const dollarsBalanced = s => ((s.replace(/\\\$/g, '').match(/\$/g) || []).length % 2) === 0;
  /** returns '' if the question is well-formed, else a reason */
  GRE.check = function (q) {
    if (!q || typeof q.q !== 'string' || !q.q.trim()) return 'empty stem';
    if (!Array.isArray(q.choices) || q.choices.length !== 5) return 'need exactly 5 choices';
    if (!(Number.isInteger(q.ans) && q.ans >= 0 && q.ans < 5)) return 'bad answer index ' + q.ans;
    if (typeof q.expl !== 'string' || !q.expl.trim()) return 'missing explanation';
    const texts = [q.q, q.expl].concat(q.choices);
    for (const s of texts) {
      if (typeof s !== 'string' || !s.trim()) return 'empty text';
      if (BAD.test(s)) return 'bad token in: ' + s.slice(0, 80);
      if (!dollarsBalanced(s)) return 'unbalanced $ in: ' + s.slice(0, 80);
    }
    const n = new Set(q.choices.map(norm));
    if (n.size !== 5) return 'duplicate choices';
    return '';
  };

  // ---------------------------------------------------------------- banks
  const banks = {};
  GRE.debug = {}; // tid -> per-template build report (used by tools/validate.js)

  /** Stable bank of `target` unique questions for topic tid (cached). */
  GRE.buildBank = function (tid, target = GRE.TARGET) {
    if (banks[tid] && banks[tid].length >= Math.min(target, banks[tid].target)) return banks[tid];
    const T = GRE.T[tid];
    const st = T.templates.filter(t => t.profile !== 'reasoning').map(t => ({ t, k: 0, n: 0, dead: false, errors: 0, lastErr: '', dups: 0 }));
    const keys = new Set();
    const out = [];
    let live = st.length;
    while (out.length < target && live > 0) {
      for (const s of st) {
        if (s.dead) continue;
        const w = s.t.weight || 1;
        for (let j = 0; j < w && out.length < target; j++) {
          let added = false;
          for (let a = 0; a < 40; a++) {
            const seed = `${tid}|${s.t.id}|${s.k++}`;
            let q;
            try { q = GRE.make(T, s.t, seed); } catch (e) { s.errors++; s.lastErr = String(e && e.message || e); continue; }
            const err = GRE.check(q);
            if (err) { s.errors++; s.lastErr = err; continue; }
            const key = q.q + '||' + q.choices[q.ans];
            if (keys.has(key)) { s.dups++; continue; }
            keys.add(key);
            q.key = tid + '-' + hash32(key).toString(36);
            out.push(q); s.n++; added = true;
            break;
          }
          if (!added) { s.dead = true; live--; break; }
        }
      }
    }
    // deterministic interleave so neighbouring question numbers come from different templates
    const R = new Rand(tid + '|order');
    const bank = R.shuffle(out);
    // Append curated items after the existing bank: preserve old question numbers,
    // keys, bookmarks and saved exams rather than renumbering the original bank.
    for (const t of T.templates.filter(t => t.profile === 'reasoning')) {
      const q = GRE.make(T, t, `${tid}|${t.id}|0`);
      const err = GRE.check(q);
      if (err) throw new Error(t.id + ': ' + err);
      const key = q.q + '||' + q.choices[q.ans];
      if (!keys.has(key)) {
        keys.add(key); q.key = tid + '-' + hash32(key).toString(36); bank.push(q);
      }
    }
    bank.forEach((q, i) => { q.num = i + 1; });
    bank.target = target;
    banks[tid] = bank;
    GRE.debug[tid] = T.templates.filter(t => t.profile === 'reasoning').map(t => ({
      id: t.id, sec: t.sec, n: bank.filter(q => q.tid === t.id).length,
      dead: true, errors: 0, dups: 0, lastErr: '',
    })).concat(st.map(s => ({ id: s.t.id, sec: s.t.sec, n: s.n, dead: s.dead, errors: s.errors, dups: s.dups, lastErr: s.lastErr })));
    return bank;
  };

  /** Preserve input priority (e.g. unseen first), preferring distinct templates. */
  GRE.diverse = function (list) {
    const used = new Set(), first = [], rest = [];
    for (const q of list) {
      const id = q.topic + '|' + q.tid;
      if (used.has(id)) rest.push(q); else { used.add(id); first.push(q); }
    }
    return first.concat(rest);
  };
  /** Editorial practice mix, not an asserted ETS question-type distribution.
   * About 60% curated reasoning, with existing drills for short calculations.
   * Exhausted/filtered pools fall back without repeating a question.
   */
  GRE.selectQuestions = function (list, n, profile = 'balanced') {
    if (profile === 'all') return GRE.diverse(list).slice(0, n);
    const reasoning = GRE.diverse(list.filter(q => q.profile === 'reasoning'));
    if (profile === 'reasoning') return reasoning.slice(0, n);
    const drills = GRE.diverse(list.filter(q => q.profile !== 'reasoning'));
    let nr = Math.min(reasoning.length, Math.round(n * 0.6));
    const nd = Math.min(drills.length, n - nr);
    nr = Math.min(reasoning.length, n - nd);
    const out = []; let r = 0, d = 0;
    // Evenly distribute reasoning throughout the requested set.
    while (r < nr || d < nd) {
      if (r < nr && (d >= nd || r < Math.ceil((out.length + 1) * nr / (nr + nd)))) out.push(reasoning[r++]);
      else out.push(drills[d++]);
    }
    return out;
  };
  GRE.practiceOrder = function (list, profile = 'balanced') {
    if (profile !== 'balanced') return GRE.selectQuestions(list, list.length, profile);
    // Keep the opening of a long practice session balanced too. A global quota
    // over 5000 drills would otherwise use all finite reasoning items immediately.
    const reasoning = GRE.diverse(list.filter(q => q.profile === 'reasoning'));
    const drills = GRE.diverse(list.filter(q => q.profile !== 'reasoning'));
    const out = []; let r = 0, d = 0;
    while (r < reasoning.length || d < drills.length) {
      for (let i = 0; i < 3 && r < reasoning.length; i++) out.push(reasoning[r++]);
      for (let i = 0; i < 2 && d < drills.length; i++) out.push(drills[d++]);
    }
    return out;
  };

  GRE.sectionOf = leafId => (GRE.leafIndex[leafId] || {}).section;
  GRE.leafName = leafId => { const L = GRE.leafIndex[leafId]; return L ? L.leaf.name : leafId; };
})(typeof window !== 'undefined' ? window : this);
