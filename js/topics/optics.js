/* Optics and Wave Phenomena — Chapter 3 of Conquering the Physics GRE.
 * Templates follow the conventions in tools/AUTHORING.md.
 */
(function (GRE) {
  'use strict';
  const F = GRE.fmt;
  const raw = String.raw;
  const C = GRE.C;

  // ------------------------------------------------------------------ helpers
  const DEG = Math.PI / 180;
  const sinD = a => Math.sin(a * DEG), cosD = a => Math.cos(a * DEG), tanD = a => Math.tan(a * DEG);
  const asinD = x => Math.asin(x) / DEG, acosD = x => Math.acos(x) / DEG, atanD = x => Math.atan(x) / DEG;
  const RN = ['I', 'II', 'III'];
  const ORD = ['zeroth', 'first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth'];
  const isInt = x => Math.abs(x - Math.round(x)) < 1e-9;
  /** TeX for x: exact (fraction or surd) when possible, else a decimal */
  const ex = (x, sig = 3, maxDen = 64) => { const e = F.exact(x, maxDen); return e != null ? e : F.num(x, sig); };
  /** TeX for x times a symbol with an exact coefficient ("I_0", "\frac{3}{4}\,I_0", "0"); null if not exact */
  const times = (x, sym, maxDen = 64) => {
    if (Math.abs(x) < 1e-12) return '0';
    const e = F.exact(x, maxDen);
    if (e == null) return null;
    if (e === '1') return sym;
    if (e === '-1') return '-' + sym;
    return e + '\\,' + sym;
  };
  /** (n/d)·π as TeX */
  const piF = (n, d = 1) => {
    if (n === 0) return '0';
    const g = F.gcd(n, d) || 1; n /= g; d /= g;
    if (d < 0) { n = -n; d = -d; }
    const s = n < 0 ? '-' : '';
    const a = Math.abs(n);
    const top = (a === 1 ? '' : a) + '\\pi';
    return s + (d === 1 ? top : `\\frac{${top}}{${d}}`);
  };
  const degs = x => `${Math.round(x)}^\\circ`;
  /** GRE.numeric options for answers in degrees: fill values stay between 2 and 89 degrees */
  const degOpt = (c, tol) => ({ fmt: degs, tol, fill: [0.5, 0.7, 1.3, 1.5, 0.4, 1.7, 0.6, 2, 0.3, 0.8, 1.2, 2.5, 3].filter(f => c * f < 89 && c * f > 2) });
  /**
   * Multiple choice from numeric values, ordered ascending like the exam.
   * fmt(value) returns the full choice string (with $…$) or null to skip it.
   * Values within relative `tol` of an accepted value are dropped (no near-ties).
   */
  function mcv(R, correct, wrongs, fmt, opts = {}) {
    const tol = opts.tol == null ? 1e-6 : opts.tol;
    const val = new Map();
    const cs = fmt(correct);
    if (cs == null) throw new Error('mcv: correct value cannot be formatted');
    val.set(cs, correct);
    const acc = [correct];
    const ws = [];
    for (const w of wrongs) {
      if (w == null || !isFinite(w)) continue;
      if (opts.positive && w <= 0) continue;
      if (acc.some(a => Math.abs(a - w) <= tol * Math.max(Math.abs(a), Math.abs(w), 1e-12))) continue;
      const s = fmt(w);
      if (s == null || val.has(s)) continue;
      val.set(s, w); acc.push(w); ws.push(s);
    }
    const o = { rank: s => val.get(s) };
    if (opts.keep) o.keep = opts.keep;
    return GRE.mc(R, cs, ws, o);
  }
  /** Roman-numeral question from pools of [statement, reason] that are true (T) or false (Fz). */
  function romanPick(R, T, Fz, intro) {
    const nTrue = R.weighted([1, 2, 3], [4, 4, 2]);
    const items = R.shuffle(R.pickN(T, nTrue).map(x => [x, true]).concat(R.pickN(Fz, 3 - nTrue).map(x => [x, false])));
    const ch = GRE.roman(R, items.map(x => x[1]));
    return {
      q: GRE.romanStem(intro, items.map(x => x[0][0])),
      choices: ch.choices, ans: ch.ans,
      why: items.map((x, i) => `${RN[i]} is ${x[1] ? 'true' : 'false'}: ${x[0][1]}`).join(' '),
    };
  }
  /** One-answer concept question: "which is true" (1 true + 4 false) or "which is NOT true" (1 false + 4 true). */
  function conceptPick(R, T, Fz, stemTrue, stemFalse) {
    if (!stemFalse || R.bool(0.6)) {
      const c = R.pick(T);
      const ch = GRE.mc(R, c[0], R.pickN(Fz, 4).map(x => x[0]));
      return { q: stemTrue, choices: ch.choices, ans: ch.ans, why: c[1] };
    }
    const c = R.pick(Fz);
    const ch = GRE.mc(R, c[0], R.pickN(T, 4).map(x => x[0]));
    return { q: stemFalse, choices: ch.choices, ans: ch.ans, why: c[1] };
  }
  /** "doubled", "halved", … for a scale factor applied to a quantity */
  const SCALE = [[2, 'doubled'], [3, 'tripled'], [4, 'quadrupled'], [1 / 2, 'halved'], [1 / 3, 'reduced to one-third of its original value'],
    [1 / 4, 'reduced to one-quarter of its original value'], [3 / 2, 'increased by a factor of $3/2$'], [2 / 3, 'reduced to two-thirds of its original value']];
  /** words for "k times the X": "twice the tension", "half the tension" */
  const timesWords = (k, noun) => {
    const W = { 1: 'the same', 2: 'twice the', 3: 'three times the', 4: 'four times the', 8: 'eight times the', 9: 'nine times the', 16: 'sixteen times the' };
    if (W[k]) return `${W[k]} ${noun}`;
    const inv = { 2: 'half the', 3: 'one-third the', 4: 'one-quarter the', 9: 'one-ninth the', 8: 'one-eighth the' }[Math.round(1 / k)];
    if (inv && isInt(1 / k)) return `${inv} ${noun}`;
    return `$${ex(k)}$ times the ${noun}`;
  };

  GRE.addTemplates('optics', [
    // ================================================================ 3.1.1 wave equation
    {
      id: 'optics.waveeq.speed', sec: '3.1.1', level: 1,
      gen(R) {
        const kind = R.weighted(['sym1', 'sym2', 'phys', 'num'], [2, 2, 2, 4]);
        const fn = R.pick(['f', 'y', 'u', '\\psi', '\\xi']);
        const d2 = v => `\\dfrac{\\partial^2 ${fn}}{\\partial ${v}^2}`;
        if (kind === 'sym1') {
          const K = R.pick(['\\alpha', '\\beta', '\\kappa', '\\gamma', '\\eta', 'K']);
          const tFirst = R.bool();
          const eq = tFirst ? `${d2('t')} = ${K}\\,${d2('x')}` : `${d2('x')} = ${K}\\,${d2('t')}`;
          const S = { sq: `$\\sqrt{${K}}$`, isq: `$1/\\sqrt{${K}}$`, K: `$${K}$`, iK: `$1/${K}$`, K2: `$${K}^2$`, iK2: `$1/${K}^2$` };
          const c = tFirst ? S.sq : S.isq;
          return {
            q: raw`A disturbance $${fn}(x,t)$ obeys the equation $${eq}$, where $${K}$ is a positive constant. What is the speed of the waves described by this equation?`,
            ...GRE.mc(R, c, [tFirst ? S.isq : S.sq, S.K, S.iK, S.K2, S.iK2]),
            expl: raw`Every function $${fn}(x \pm vt)$ solves $\partial_t^2 ${fn} = v^2\,\partial_x^2 ${fn}$. Rewriting the given equation in that form gives $v^2 = ${tFirst ? K : '1/' + K}$, so $v = ${c.slice(1, -1)}$.`,
          };
        }
        if (kind === 'sym2') {
          const [a, b] = R.pick([['a', 'b'], ['p', 'q'], ['\\alpha', '\\beta'], ['A', 'B'], ['m', 's'], ['\\lambda', '\\sigma']]);
          const tLeft = R.bool();
          // tLeft: a d2t = b d2x  -> v^2 = b/a ; else a d2x = b d2t -> v^2 = a/b
          const eq = tLeft ? `${a}\\,${d2('t')} = ${b}\\,${d2('x')}` : `${a}\\,${d2('x')} = ${b}\\,${d2('t')}`;
          const [num, den] = tLeft ? [b, a] : [a, b];
          const c = `$\\sqrt{${num}/${den}}$`;
          return {
            q: raw`The function $${fn}(x,t)$ satisfies $${eq}$, where $${a}$ and $${b}$ are positive constants. At what speed do waves described by this equation propagate?`,
            ...GRE.mc(R, c, [`$\\sqrt{${den}/${num}}$`, `$${num}/${den}$`, `$${den}/${num}$`, `$\\sqrt{${a}${b}}$`, `$1/\\sqrt{${a}${b}}$`]),
            expl: raw`Divide through to get $\partial_t^2 ${fn} = (${num}/${den})\,\partial_x^2 ${fn}$; comparing with $\partial_t^2 ${fn} = v^2\partial_x^2 ${fn}$ gives $v = \sqrt{${num}/${den}}$.`,
          };
        }
        if (kind === 'phys') {
          const P = R.pick([
            { d: raw`The voltage $V(x,t)$ on a lossless transmission line with inductance $\mathcal{L}$ and capacitance $\mathcal{C}$ per unit length obeys`, eq: raw`\dfrac{\partial^2 V}{\partial x^2} = \mathcal{L}\mathcal{C}\,\dfrac{\partial^2 V}{\partial t^2}`, c: raw`1/\sqrt{\mathcal{L}\mathcal{C}}`, w: [raw`\sqrt{\mathcal{L}\mathcal{C}}`, raw`\mathcal{L}\mathcal{C}`, raw`1/(\mathcal{L}\mathcal{C})`, raw`\sqrt{\mathcal{L}/\mathcal{C}}`, raw`\sqrt{\mathcal{C}/\mathcal{L}}`] },
            { d: raw`In a linear medium with permittivity $\epsilon$ and permeability $\mu$, the electric field of an electromagnetic wave obeys`, eq: raw`\nabla^2\mathbf{E} = \mu\epsilon\,\dfrac{\partial^2 \mathbf{E}}{\partial t^2}`, c: raw`1/\sqrt{\mu\epsilon}`, w: [raw`\sqrt{\mu\epsilon}`, raw`\mu\epsilon`, raw`1/(\mu\epsilon)`, raw`\sqrt{\mu/\epsilon}`, raw`\sqrt{\epsilon/\mu}`] },
            { d: raw`Longitudinal displacements $s(x,t)$ in a solid rod of density $\rho$ and Young's modulus $Y$ obey`, eq: raw`\rho\,\dfrac{\partial^2 s}{\partial t^2} = Y\,\dfrac{\partial^2 s}{\partial x^2}`, c: raw`\sqrt{Y/\rho}`, w: [raw`\sqrt{\rho/Y}`, raw`Y/\rho`, raw`\rho/Y`, raw`\sqrt{Y\rho}`, raw`1/\sqrt{Y\rho}`] },
            { d: raw`The excess pressure $p(x,t)$ of a sound wave in a fluid of density $\rho$ and bulk modulus $B$ obeys`, eq: raw`\dfrac{\partial^2 p}{\partial x^2} = \dfrac{\rho}{B}\,\dfrac{\partial^2 p}{\partial t^2}`, c: raw`\sqrt{B/\rho}`, w: [raw`\sqrt{\rho/B}`, raw`B/\rho`, raw`\rho/B`, raw`\sqrt{B\rho}`, raw`1/\sqrt{B\rho}`] },
            { d: raw`The twist angle $\theta(x,t)$ of a rod with moment of inertia per unit length $I$ and torsional stiffness $\kappa$ obeys`, eq: raw`I\,\dfrac{\partial^2 \theta}{\partial t^2} = \kappa\,\dfrac{\partial^2 \theta}{\partial x^2}`, c: raw`\sqrt{\kappa/I}`, w: [raw`\sqrt{I/\kappa}`, raw`\kappa/I`, raw`I/\kappa`, raw`\sqrt{\kappa I}`, raw`1/\sqrt{\kappa I}`] },
          ]);
          return {
            q: raw`${P.d} $${P.eq}$. What is the propagation speed of these waves?`,
            ...GRE.mc(R, `$${P.c}$`, P.w.map(s => `$${s}$`)),
            expl: raw`Put the equation in the form $\partial_t^2 u = v^2\,\partial_x^2 u$ and read off $v^2$: here $v = ${P.c}$. A quick dimensional check confirms that this combination has units of speed.`,
          };
        }
        // numeric
        const v = R.pick([2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 20, 25, 30, 40, 50]);
        const a = R.pick([1, 2, 3, 4, 5, 9, 10, 16, 25]);
        const b = a * v * v;
        const form = R.int(0, 2);
        let eq;
        if (form === 0) eq = `${a === 1 ? '' : a}${d2('t')} = ${b}\\,${d2('x')}`;
        else if (form === 1) eq = `${b}\\,${d2('x')} - ${a === 1 ? '' : a}${d2('t')} = 0`;
        else eq = `${d2('x')} = \\dfrac{${a}}{${b}}\\,${d2('t')}`;
        if (form === 2 && F.gcd(a, b) !== 1) eq = `${d2('x')} = ${F.frac(a, b).replace('\\frac', '\\dfrac')}\\,${d2('t')}`;
        return {
          q: raw`A wave on a long elastic cord satisfies $${eq}$, where $x$ is in meters and $t$ is in seconds. What is the wave speed?`,
          ...GRE.numeric(R, v, [v * v, 1 / v, Math.sqrt(b), a * v, 2 * v, v / 2], { unit: raw`\text{m/s}`, sig: 3 }),
          expl: raw`Write it as $\partial_t^2 ${fn} = v^2\,\partial_x^2 ${fn}$: $v^2 = ${b}/${a} = ${v * v}\ \text{m}^2/\text{s}^2$, so $v = ${v}\ \text{m/s}$. Choosing $v^2$ itself is the usual slip.`,
        };
      },
    },
    {
      id: 'optics.waveeq.solutions', sec: '3.1.1', level: 2,
      gen(R) {
        if (R.bool(0.55)) {
          const T = [
            ['A\\sin(kx - kvt)', 'it is a function of $x - vt$ only.'],
            ['A\\,e^{-(x + vt)^2/a^2}', 'it is a function of $x + vt$ only.'],
            ['(x - vt)^3', 'it is a function of $x - vt$ only.'],
            ['\\cos(kx)\\cos(kvt)', 'it is a standing wave with $\\omega = kv$ (the sum of two traveling waves).'],
            ['\\sin(kx)\\sin(kvt)', 'it is a standing wave with $\\omega = kv$.'],
            ['x^2 + v^2t^2', '$\\partial_t^2 f = 2v^2 = v^2\\,\\partial_x^2 f$.'],
            ['xt', 'both second derivatives vanish.'],
            ['e^{k(x - vt)}', 'it is a function of $x - vt$ only.'],
            ['e^{kx}\\sinh(kvt)', '$\\partial_t^2 f = k^2v^2 f = v^2\\,\\partial_x^2 f$.'],
            ['\\sin^2(kx + kvt)', 'it is a function of $x + vt$ only.'],
            ['(x - vt)^2 + (x + vt)^2', 'it is a sum of two solutions.'],
            ['\\ln\\!\\left[1 + (x - vt)^2\\right]', 'it is a function of $x - vt$ only.'],
          ];
          const Fz = [
            ['x^2 - v^2t^2', '$\\partial_t^2 f = -2v^2$, but $v^2\\,\\partial_x^2 f = +2v^2$.'],
            ['\\sin(kx)\\cos(2kvt)', 'a standing wave with wavenumber $k$ must oscillate at $\\omega = kv$, not $2kv$.'],
            ['e^{-x^2/a^2}\\cos(kvt)', '$\\partial_t^2 f = -k^2v^2 f$, but $\\partial_x^2 f$ is not $-k^2 f$ for a Gaussian profile.'],
            ['\\sin(kx - kvt)\\sin(kx + kvt)', 'a product of solutions is not a solution; it equals $\\tfrac12[\\cos(2kvt) - \\cos(2kx)]$, which fails.'],
            ['e^{-kx}\\sin(kvt)', '$\\partial_t^2 f = -k^2v^2 f$, while $v^2\\,\\partial_x^2 f = +k^2v^2 f$.'],
            ['x^2 t', '$\\partial_t^2 f = 0$, but $\\partial_x^2 f = 2t$.'],
            ['e^{kx}\\sin(kvt)', '$\\partial_t^2 f = -k^2v^2 f$, while $v^2\\,\\partial_x^2 f = +k^2v^2 f$.'],
            ['\\cos(kx)\\,e^{-kvt}', '$\\partial_t^2 f = +k^2v^2 f$, while $v^2\\,\\partial_x^2 f = -k^2v^2 f$.'],
            ['(x - vt)(x + vt)', 'it equals $x^2 - v^2t^2$, for which the two sides have opposite signs.'],
            ['x^3 - v^3t^3', '$\\partial_t^2 f = -6v^3 t$, which is not $v^2\\,\\partial_x^2 f = 6v^2 x$.'],
          ];
          const r = romanPick(R, T.map(x => [`$f = ${x[0]}$`, x[1]]), Fz.map(x => [`$f = ${x[0]}$`, x[1]]),
            raw`Which of the following functions satisfy the wave equation $\partial^2 f/\partial t^2 = v^2\,\partial^2 f/\partial x^2$? ($A$, $a$, $k$, and $v$ are positive constants.)`);
          return { q: r.q, choices: r.choices, ans: r.ans, expl: 'Any twice-differentiable function of $x - vt$ or $x + vt$ is a solution; otherwise compare $\\partial_t^2 f$ with $v^2\\partial_x^2 f$ directly. ' + r.why };
        }
        const T = [
          ['$f + g$', 'the wave equation is linear (superposition).'],
          ['$3f - 2g$', 'any linear combination of solutions is a solution.'],
          ['$\\partial f/\\partial x$', 'differentiating a linear equation with constant coefficients gives another solution.'],
          ['$f(x, t + t_0)$, where $t_0$ is a constant', 'the equation is unchanged by a shift of time.'],
          ['$f(x - x_0, t)$, where $x_0$ is a constant', 'the equation is unchanged by a shift in $x$.'],
          ['$f(-x, t)$', 'only the second derivative in $x$ appears, which is unchanged by $x \\to -x$.'],
          ['$f(x, -t)$', 'only the second derivative in $t$ appears, which is unchanged by $t \\to -t$.'],
          ['$f(2x, 2t)$', 'rescaling $x$ and $t$ by the same factor multiplies both sides by 4.'],
        ];
        const Fz = [
          ['$fg$', 'a product of solutions is not a solution in general.'],
          ['$f^2$', 'the equation is linear, so squaring a solution does not give a solution.'],
          ['$f(2x, t)$', 'it satisfies the wave equation with speed $v/2$, not $v$.'],
          ['$f(x, 2t)$', 'it satisfies the wave equation with speed $2v$, not $v$.'],
          ['$e^{f}$', 'a nonlinear function of a solution is not a solution in general.'],
          ['$t\\,f(x,t)$', 'substituting leaves the extra term $2\\,\\partial f/\\partial t$.'],
          ['$f/g$', 'a ratio of solutions is not a solution in general.'],
        ];
        const r = romanPick(R, T, Fz, raw`Suppose $f(x,t)$ and $g(x,t)$ are two different solutions of the wave equation $\partial^2 u/\partial t^2 = v^2\,\partial^2 u/\partial x^2$. Which of the following must also be a solution of this equation?`);
        return { q: r.q, choices: r.choices, ans: r.ans, expl: 'The wave equation is linear with constant coefficients, so superpositions, derivatives, shifts and reflections of solutions are solutions, but products and other nonlinear combinations are not. ' + r.why };
      },
    },
    {
      id: 'optics.waveeq.travel', sec: '3.1.1', level: 1,
      gen(R) {
        const v = R.pick([2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 25, 30, 40, 50]);
        const b = R.pick([0.5, 1, 2, 3, 4, 5, 10]);
        const c = b * v;
        const plusX = R.bool();
        const A = R.pick(['0.020', '0.050', '0.10', '0.30', '1.5', '2.0']);
        const bx = (b === 1 ? '' : F.num(b, 2)) + 'x';
        const ct = F.num(c, 3) + 't';
        const arg = plusX ? (R.bool(0.75) ? `(${bx} - ${ct})` : `(${ct} - ${bx})`) : `(${bx} + ${ct})`;
        const shape = R.pick([
          raw`y(x,t) = ${A}\,e^{-${arg}^2}`,
          raw`y(x,t) = \dfrac{${A}}{1 + ${arg}^2}`,
          raw`y(x,t) = \dfrac{${A}}{2 + ${arg}^2}`,
          raw`y(x,t) = ${A}\,e^{-${arg}^4}`,
        ]);
        const dir = s => (s ? 'the $+x$-direction' : 'the $-x$-direction');
        const stem = raw`A pulse on a long rope is described by $${shape}$, where $x$ and $y$ are in meters and $t$ is in seconds.`;
        const expl0 = raw`Up to an overall sign (the profile is even in its argument), the argument is $${F.num(b, 2)}\,(x ${plusX ? '-' : '+'} ${v}t)$, so the profile is a fixed shape moving ${plusX ? 'toward $+x$' : 'toward $-x$'} at $v = ${F.num(c, 3)}/${F.num(b, 2)} = ${v}\ \text{m/s}$.`;
        if (R.bool(0.55)) {
          const sp = (x, s) => `$${F.num(x, 3)}\\,\\text{m/s}$ in ${dir(s)}`;
          const correct = sp(v, plusX);
          const wr = [sp(v, !plusX), sp(c, plusX), sp(c, !plusX), sp(1 / v, plusX), sp(1 / v, !plusX), sp(v * v, plusX), sp(b * c, plusX)];
          return {
            q: stem + ' What are the speed and direction of propagation of the pulse?',
            ...GRE.mc(R, correct, wr, { keep: 1 }),
            expl: expl0 + ' A minus sign between the $x$ and $t$ terms means motion toward $+x$; a plus sign means motion toward $-x$.',
          };
        }
        const t1 = R.pick([0.5, 1, 1.5, 2, 3, 4]);
        const xp = (plusX ? 1 : -1) * v * t1;
        return {
          q: stem + raw` The peak of the pulse is at $x = 0$ at $t = 0$. Where is the peak at $t = ${t1}\ \text{s}$?`,
          ...GRE.numeric(R, xp, [-xp, (plusX ? 1 : -1) * c * t1, -(plusX ? 1 : -1) * c * t1, (plusX ? 1 : -1) * t1 / v, (plusX ? 1 : -1) * v * t1 / 2], { allowSign: true, fmt: x => `x = ${F.num(x, 3)}`, unit: raw`\text{m}`, tol: 0.08 }),
          expl: expl0 + raw` So after $${t1}\ \text{s}$ the peak is at $x = ${F.num(xp, 3)}\ \text{m}$.`,
        };
      },
    },
    {
      id: 'optics.waveeq.standing', sec: '3.1.1', level: 2,
      gen(R) {
        const p = R.pick([0.5, 1, 2, 4, 5, 10, 20]);
        const q = R.pick([10, 20, 40, 50, 100, 120, 200, 240, 300, 400, 500, 800, 1000]);
        const A = R.pick([0.5, 1, 1.5, 2, 2.5, 3, 4, 5]);
        const kT = (p === 1 ? '' : F.num(p, 2)) + '\\pi', wT = q + '\\pi';
        const sum = R.bool();
        const stem = sum
          ? raw`Two waves $y_1 = A\sin(kx - \omega t)$ and $y_2 = A\sin(kx + \omega t)$ travel on the same string, with $A = ${A}\ \text{cm}$, $k = ${kT}\ \text{m}^{-1}$, and $\omega = ${wT}\ \text{s}^{-1}$. Their superposition is a standing wave.`
          : raw`A standing wave on a string is described by $y(x,t) = (${F.num(2 * A, 2)}\ \text{cm})\sin(${kT}\,x)\cos(${wT}\,t)$, with $x$ in meters and $t$ in seconds.`;
        const sumNote = raw`Since $\sin(kx - \omega t) + \sin(kx + \omega t) = 2\sin kx\cos\omega t$, the resultant is $y = 2A\sin kx\,\cos\omega t$.`;
        const modes = sum ? ['node', 'amp', 'speed', 'flat', 'freq'] : ['node', 'speed', 'flat', 'freq'];
        const mode = R.pick(modes);
        const pre = sum ? sumNote + ' ' : '';
        if (mode === 'node') {
          return {
            q: stem + ' What is the distance between adjacent nodes?',
            ...GRE.numeric(R, 1 / p, [2 / p, 1 / (2 * p), Math.PI / p, 1 / (Math.PI * p)], { unit: raw`\text{m}`, sig: 3 }),
            expl: pre + raw`Nodes are where $\sin kx = 0$, i.e. $kx = n\pi$, so they are spaced by $\pi/k = \lambda/2 = 1/${F.num(p, 2)} = ${F.num(1 / p, 3)}\ \text{m}$. A full wavelength $2\pi/k$ would be the spacing of every other node.`,
          };
        }
        if (mode === 'amp') {
          return {
            q: stem + ' What is the maximum displacement of the string at an antinode?',
            ...GRE.numeric(R, 2 * A, [A, Math.SQRT2 * A, A / 2, 4 * A], { unit: raw`\text{cm}`, sig: 3 }),
            expl: sumNote + raw` At an antinode $|\sin kx| = 1$, so the maximum displacement is $2A = ${F.num(2 * A, 3)}\ \text{cm}$.`,
          };
        }
        if (mode === 'speed') {
          const v = q / p;
          return {
            q: stem + ` At what speed do the two traveling waves that make up this standing wave move?`,
            ...GRE.numeric(R, v, [p / q, v / 2, 2 * v, v * Math.PI, v / Math.PI], { unit: raw`\text{m/s}`, sig: 3 }),
            expl: pre + raw`A standing wave is a sum of two equal waves moving in opposite directions at $v = \omega/k = ${wT}/${kT} = ${F.num(v, 3)}\ \text{m/s}$; the standing pattern itself does not move.`,
          };
        }
        if (mode === 'flat') {
          return {
            q: stem + ' What is the time interval between successive instants at which the string is everywhere straight (zero displacement)?',
            ...GRE.numeric(R, 1 / q, [2 / q, 1 / (2 * q), 1 / (Math.PI * q), Math.PI / q], { unit: raw`\text{s}`, sig: 3 }),
            expl: pre + raw`The string is flat when $\cos\omega t = 0$, which happens twice per period: every $\pi/\omega = 1/${q}\ \text{s} = ${F.num(1 / q, 3)}\ \text{s}$, i.e. half the period $2\pi/\omega$.`,
          };
        }
        return {
          q: stem + ' With what frequency does each point of the string (other than the nodes) oscillate?',
          ...GRE.numeric(R, q / 2, [q, q * Math.PI, 2 / q, q / 4], { unit: raw`\text{Hz}`, sig: 3 }),
          expl: pre + raw`Every point oscillates as $\cos\omega t$, with $f = \omega/2\pi = ${wT}/2\pi = ${F.num(q / 2, 3)}\ \text{Hz}$. Using $\omega$ itself as the frequency is the classic slip.`,
        };
      },
    },

    // ================================================================ 3.1.2 nomenclature and complex notation
    {
      id: 'optics.nomen.readoff', sec: '3.1.2', level: 1, weight: 2,
      gen(R) {
        const piStyle = R.bool(0.6);
        let K, W, kT, wT;
        if (piStyle) {
          const p = R.pick([0.5, 1, 2, 3, 4, 5, 6, 8, 10, 20]);
          const q = R.pick([4, 6, 10, 20, 40, 50, 60, 100, 120, 200, 300, 400, 500, 600, 800, 1000]);
          K = p * Math.PI; W = q * Math.PI;
          kT = (p === 1 ? '' : F.num(p, 2)) + '\\pi'; wT = q + '\\pi';
        } else {
          const k = R.pick([2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 25]);
          const w = R.pick([10, 20, 30, 50, 60, 100, 120, 150, 200, 300, 400, 500, 600, 1000, 1200, 2000]);
          K = k; W = w; kT = String(k); wT = String(w);
        }
        const A = R.pick([0.002, 0.004, 0.005, 0.01, 0.02, 0.03, 0.04, 0.05, 0.08]);
        const fn = R.pick(['\\sin', '\\cos']);
        const ph = R.pick(['', '', ' + \\pi/4', ' + \\pi/3', ' - \\pi/6', ' + \\pi/2']);
        const left = R.bool(0.3);
        const wave = raw`y(x,t) = ${F.num(A, 2, true)}\,${fn}\!\left(${kT}\,x ${left ? '+' : '-'} ${wT}\,t${ph}\right)`;
        const P = Math.PI;
        const Q = {
          lam: { name: 'the wavelength', val: 2 * P / K, unit: raw`\text{m}`, w: [1 / K, P / K, K / (2 * P), 4 * P / K, W / K], e: raw`\lambda = 2\pi/k = 2\pi/(${kT}\ \text{m}^{-1})` },
          f: { name: 'the frequency', val: W / (2 * P), unit: raw`\text{Hz}`, w: [W, W / P, 2 * P / W, W / (4 * P)], e: raw`f = \omega/2\pi = (${wT}\ \text{s}^{-1})/2\pi` },
          T: { name: 'the period', val: 2 * P / W, unit: raw`\text{s}`, w: [1 / W, P / W, W / (2 * P), 4 * P / W], e: raw`T = 2\pi/\omega = 2\pi/(${wT}\ \text{s}^{-1})` },
          v: { name: 'the speed of the wave', val: W / K, unit: raw`\text{m/s}`, w: [K / W, W * K, W / (2 * P * K), 2 * P * W / K, A * W], e: raw`v = \omega/k = ${wT}/${kT}` },
          u: { name: 'the maximum transverse speed of a point on the string', val: A * W, unit: raw`\text{m/s}`, w: [W / K, A * W * W, A * W / (2 * P), A * K, A * W / K], e: raw`u_{\max} = A\omega = (${F.num(A, 2)}\ \text{m})(${wT}\ \text{s}^{-1})` },
          a: { name: 'the maximum transverse acceleration of a point on the string', val: A * W * W, unit: raw`\text{m/s}^2`, w: [A * W, A * W * W / (2 * P), A * (W / (2 * P)) ** 2, A * W * W / K, A * A * W * W], e: raw`a_{\max} = A\omega^2 = (${F.num(A, 2)}\ \text{m})(${wT}\ \text{s}^{-1})^2` },
        };
        const key = R.weighted(['lam', 'f', 'T', 'v', 'u', 'a'], [3, 3, 2, 3, 3, 1]);
        const X = Q[key];
        const trap = { lam: 'Forgetting the $2\\pi$ (taking $\\lambda = 1/k$) is the usual mistake.', f: 'Reporting $\\omega$ itself as the frequency is the usual mistake.', T: 'Taking $T = 1/\\omega$ forgets the $2\\pi$.', v: 'Note the speed is $\\omega/k$, not $k/\\omega$.', u: 'Do not confuse the transverse velocity of the string, $\\partial y/\\partial t$, with the wave speed $\\omega/k$.', a: 'The acceleration is $\\partial^2 y/\\partial t^2$, whose amplitude is $A\\omega^2$.' }[key];
        return {
          q: raw`A transverse wave on a string is described by $${wave}$, where $x$ and $y$ are in meters and $t$ is in seconds. What is ${X.name}?`,
          ...GRE.numeric(R, X.val, X.w, { unit: X.unit, sig: 3 }),
          level: key === 'u' || key === 'a' ? 2 : 1,
          expl: raw`Compare with $y = A\sin(kx - \omega t + \delta)$: $A = ${F.num(A, 2)}\ \text{m}$, $k = ${kT}\ \text{m}^{-1}$, $\omega = ${wT}\ \text{s}^{-1}$. Then $${X.e} = ${F.num(X.val, 3)}\ ${X.unit}$. ${trap}`,
        };
      },
    },
    {
      id: 'optics.nomen.phase', sec: '3.1.2', level: 2,
      gen(R) {
        // phases in units of pi/12
        const mod24 = x => ((x % 24) + 24) % 24;
        const red = x => { const m = mod24(x); return m > 12 ? 24 - m : m; };
        const wave = () => ({ fn: R.pick(['sin', 'cos']), neg: R.bool(0.25), ph: R.pick([0, 0, 2, 3, 4, 6, 8, 9, -2, -3, -4, -6]) });
        const cph = w => w.ph + (w.fn === 'sin' ? -6 : 0) + (w.neg ? 12 : 0);
        const tex = w => `${w.neg ? '-' : ''}A\\${w.fn}(kx - \\omega t${w.ph === 0 ? '' : (w.ph > 0 ? ' + ' : ' - ') + piF(Math.abs(w.ph), 12)})`;
        const mode = R.weighted(['phase', 'amp', 'int'], [3, 2, 1]);
        let w1, w2, D, tries = 0;
        do {
          w1 = wave(); w2 = wave();
          D = red(cph(w1) - cph(w2));
          tries++;
          if (tries > 200) throw new Error('no phase combination');
        } while ((mode !== 'phase' && [0, 4, 6, 8, 12].indexOf(D) < 0) || (w1.fn === w2.fn && w1.neg === w2.neg && w1.ph === w2.ph));
        const stem = raw`Two waves travel together along the $x$-axis: $f_1 = ${tex(w1)}$ and $f_2 = ${tex(w2)}$.`;
        const conv = raw`Convert both to cosines using $\sin\theta = \cos(\theta - \pi/2)$ and $-\cos\theta = \cos(\theta + \pi)$: the phases become $${piF(cph(w1), 12)}$ and $${piF(cph(w2), 12)}$, so the phase difference, reduced modulo $2\pi$ to the range $[0, \pi]$, is $${piF(D, 12)}$.`;
        if (mode === 'phase') {
          const naive = red(w1.ph - w2.ph);
          const wr = [naive, red(D + 6), red(D - 6), red(D + 12), red(naive + 6), 0, 2, 3, 4, 6, 8, 9, 10, 12];
          return {
            q: stem + raw` What is the magnitude of their phase difference, expressed as a value between $0$ and $\pi$?`,
            ...mcv(R, D, wr, x => `$${piF(x, 12)}$`),
            expl: conv + ' Ignoring the built-in $\\pi/2$ offset between sine and cosine (or the $\\pi$ from a minus sign) is the trap.',
          };
        }
        const AMP = { 0: '2A', 4: '\\sqrt{3}\\,A', 6: '\\sqrt{2}\\,A', 8: 'A', 12: '0' };
        const INT = { 0: '4I_1', 4: '3I_1', 6: '2I_1', 8: 'I_1', 12: '0' };
        const VAL = { 0: 2, 4: Math.sqrt(3), 6: Math.SQRT2, 8: 1, 12: 0 };
        const order = [12, 8, 6, 4, 0];
        if (mode === 'amp') {
          const ch = GRE.mc(R, `$${AMP[D]}$`, order.filter(x => x !== D).map(x => `$${AMP[x]}$`), { rank: s => VAL[order.find(x => `$${AMP[x]}$` === s)] });
          return {
            q: stem + ' What is the amplitude of their superposition $f_1 + f_2$?',
            ...ch,
            expl: conv + raw` Two equal waves with phase difference $\phi$ add to amplitude $2A|\cos(\phi/2)|$, here $${AMP[D]}$.`,
          };
        }
        const ch = GRE.mc(R, `$${INT[D]}$`, order.filter(x => x !== D).map(x => `$${INT[x]}$`), { rank: s => VAL[order.find(x => `$${INT[x]}$` === s)] });
        return {
          q: stem + raw` If either wave alone has intensity $I_1$, what is the intensity of their superposition?`,
          ...ch,
          expl: conv + raw` Intensity goes as amplitude squared: $I = 4I_1\cos^2(\phi/2) = ${INT[D]}$. Adding intensities ($2I_1$) is correct only for incoherent waves.`,
        };
      },
    },
    {
      id: 'optics.nomen.complex', sec: '3.1.2', level: 2,
      gen(R) {
        const mode = R.weighted(['amp', 'f00', 't', 'sum', 'phase'], [2, 2, 2, 2, 2]);
        const unit = R.pick(['mm', 'cm', '\\mu\\text{m}']);
        const U = unit === '\\mu\\text{m}' ? unit : `\\text{${unit}}`;
        const fm = x => `$${x}\\,${U}$`;
        if (mode === 'phase') {
          const P = R.pick([
            ['1 + i', 3], ['1 - i', -3], ['-1 + i', 9], ['-1 - i', -9], ['\\sqrt{3} + i', 2], ['1 + \\sqrt{3}\\,i', 4], ['-\\sqrt{3} + i', 10],
            ['\\sqrt{3} - i', -2], ['1 - \\sqrt{3}\\,i', -4], ['-1 + \\sqrt{3}\\,i', 8], ['2i', 6], ['-2i', -6], ['-3', 12], ['-1 - \\sqrt{3}\\,i', -8],
          ]);
          const d = P[1];
          const wr = [-d, d + 6, d - 6, 12 - d, d / 2, 6 - d, d === 12 ? 0 : -12 + d].filter(x => x > -12 && x <= 12);
          return {
            q: raw`A wave is written in complex notation as $f(x,t) = \mathrm{Re}\left[A\,e^{i(kx - \omega t)}\right]$ with $A = (${P[0]})\,${U}$. If the same wave is written as $f = |A|\cos(kx - \omega t + \delta)$ with $-\pi < \delta \le \pi$, what is $\delta$?`,
            ...mcv(R, d, wr, x => `$${piF(x, 12)}$`),
            expl: raw`Write $A = |A|e^{i\delta}$; then $\mathrm{Re}[|A|e^{i\delta}e^{i(kx-\omega t)}] = |A|\cos(kx - \omega t + \delta)$. The phase $\delta$ is the argument of $A = ${P[0]}$, i.e. $\delta = ${piF(d, 12)}$ (check the quadrant from the signs of the real and imaginary parts).`,
          };
        }
        const [a0, b0, c0] = R.pick([[3, 4, 5], [4, 3, 5], [5, 12, 13], [12, 5, 13], [6, 8, 10], [8, 6, 10], [8, 15, 17], [15, 8, 17], [7, 24, 25], [24, 7, 25], [9, 12, 15], [12, 9, 15], [20, 21, 29], [21, 20, 29]]);
        if (mode === 'sum') {
          const cplx = R.bool();
          const stem = cplx
            ? raw`Two waves on the same medium are $f_1 = \mathrm{Re}\left[${a0}\,e^{i(kx - \omega t)}\right]$ and $f_2 = \mathrm{Re}\left[${b0}i\,e^{i(kx - \omega t)}\right]$, both in ${unit === 'mm' ? 'millimeters' : unit === 'cm' ? 'centimeters' : 'micrometers'}.`
            : raw`Two waves on the same medium are $f_1 = ${a0}\cos(kx - \omega t)$ and $f_2 = ${b0}\sin(kx - \omega t)$, both in ${unit === 'mm' ? 'millimeters' : unit === 'cm' ? 'centimeters' : 'micrometers'}.`;
          return {
            q: stem + ' What is the amplitude of the superposition $f_1 + f_2$?',
            ...mcv(R, c0, [a0 + b0, Math.abs(a0 - b0), c0 * c0, Math.max(a0, b0), (a0 + b0) / 2, a0 * b0], fm),
            expl: raw`${cplx ? 'Add the complex amplitudes' : 'Since $\\sin\\theta = \\mathrm{Re}[-i\\,e^{i\\theta}]$, the complex amplitudes are ' + a0 + ' and $-' + b0 + 'i$; add them'}: $|A| = \sqrt{${a0}^2 + ${b0}^2} = ${c0}$. The waves are $90^\circ$ out of phase, so the amplitudes add in quadrature, not directly.`,
          };
        }
        const a = R.sign() * a0, b = R.sign() * b0;
        const At = `${a} ${b < 0 ? '-' : '+'} ${Math.abs(b)}i`;
        const stem = raw`A wave is described by $f(x,t) = \mathrm{Re}\left[A\,e^{i(kx - \omega t)}\right]$, where $A = (${At})\,${U}$.`;
        if (mode === 'amp') {
          return {
            q: stem + ' What is the maximum value that $f$ attains?',
            ...mcv(R, c0, [a0 + b0, Math.abs(a0 - b0), a0, b0, c0 * c0], fm),
            expl: raw`The real amplitude is the modulus of the complex amplitude: $|A| = \sqrt{${a0}^2 + ${b0}^2} = ${c0}\ ${U}$. The phase of $A$ only shifts where the maximum occurs.`,
          };
        }
        if (mode === 'f00') {
          return {
            q: stem + raw` What is $f(0, 0)$?`,
            ...mcv(R, a, [-a, b, -b, c0, -c0, a + b], fm),
            expl: raw`At $x = t = 0$ the exponential is 1, so $f(0,0) = \mathrm{Re}\,A = ${a}\ ${U}$.`,
          };
        }
        const which = R.pick([[1, 'T/4', b, raw`e^{-i\pi/2} = -i`, raw`\mathrm{Re}(-iA) = \mathrm{Im}\,A`], [2, 'T/2', -a, raw`e^{-i\pi} = -1`, raw`\mathrm{Re}(-A) = -\mathrm{Re}\,A`], [3, '3T/4', -b, raw`e^{-3i\pi/2} = i`, raw`\mathrm{Re}(iA) = -\mathrm{Im}\,A`]]);
        return {
          q: stem + raw` If $T = 2\pi/\omega$ is the period, what is $f(0, ${which[1]})$?`,
          ...mcv(R, which[2], [a, -a, b, -b, c0, -c0, 0], fm),
          expl: raw`At $x = 0$, $t = ${which[1]}$ we have $\omega t = ${piF(which[0], 2)}$ and $${which[3]}$, so $f = ${which[4]} = ${which[2]}\ ${U}$.`,
        };
      },
    },

    // ================================================================ 3.1.3 dispersion relations
    {
      id: 'optics.disp.power', sec: '3.1.3', level: 2, weight: 2,
      gen(R) {
        if (R.bool(0.4)) {
          const S = [
            ['deep-water gravity waves', raw`\omega = \sqrt{gk}`, 1, 2],
            ['capillary (surface-tension) ripples', raw`\omega = \sqrt{\sigma k^3/\rho}`, 3, 2],
            ['the de Broglie waves of a free nonrelativistic particle of mass $m$', raw`\omega = \hbar k^2/2m`, 2, 1],
            ['bending (flexural) waves on a thin elastic beam', raw`\omega = \beta k^2`, 2, 1],
            ['waves in a certain medium', raw`\omega = \alpha k^3`, 3, 1],
            ['waves in a certain medium', raw`\omega = \alpha k^{1/3}`, 1, 3],
            ['waves in a certain medium', raw`\omega = \alpha k^{4}`, 4, 1],
            ['waves in a certain medium', raw`\omega = \alpha k^{3/4}`, 3, 4],
            ['waves in a certain medium', raw`\omega = \alpha k^{5/2}`, 5, 2],
            ['transverse waves on an ideal stretched string', raw`\omega = k\sqrt{T/\mu}`, 1, 1],
          ];
          const [what, rel, a, b] = R.pick(S);
          const n = a / b;
          const inv = R.bool();
          const corr = inv ? 1 / n : n;
          const ask = inv ? raw`the ratio $v_{\text{phase}}/v_{\text{group}}$ of the phase velocity to the group velocity` : raw`the ratio $v_{\text{group}}/v_{\text{phase}}$ of the group velocity to the phase velocity`;
          return {
            q: raw`The dispersion relation for ${what} is $${rel}$. What is ${ask}?`,
            ...mcv(R, corr, [1 / corr, 1, n * n, 1 / (n * n), 2 * corr, corr / 2, 2, 0.5, 3, 1 / 3], x => { const e = F.exact(x); return e == null ? null : `$${e}$`; }),
            expl: raw`For $\omega = Ck^{p}$: $v_{\text{phase}} = \omega/k = Ck^{p-1}$ and $v_{\text{group}} = d\omega/dk = pCk^{p-1} = p\,v_{\text{phase}}$. Here $p = ${F.frac(a, b)}$, so the requested ratio is $${F.exact(corr)}$.`,
          };
        }
        const kind = R.pick(['k2', 'k3', 'sqrt', 'mixed']);
        const askG = R.bool(0.6);
        let rel, kv, vp, vg, extra = [], expl;
        if (kind === 'k2') {
          const al = R.pick([0.05, 0.1, 0.2, 0.25, 0.5, 1, 2, 4, 5]);
          kv = R.pick([2, 3, 4, 5, 6, 8, 10]);
          rel = raw`\omega = (${F.num(al, 2)}\ \text{m}^2/\text{s})\,k^2`;
          vp = al * kv; vg = 2 * al * kv; extra = [al * kv * kv, al * kv / 2, al];
          expl = raw`$v_{\text{phase}} = \omega/k = \alpha k = ${F.num(vp, 3)}\ \text{m/s}$ and $v_{\text{group}} = d\omega/dk = 2\alpha k = ${F.num(vg, 3)}\ \text{m/s}$.`;
        } else if (kind === 'k3') {
          const al = R.pick([0.01, 0.02, 0.05, 0.1, 0.2, 0.5]);
          kv = R.pick([2, 3, 4, 5, 10]);
          rel = raw`\omega = (${F.num(al, 2)}\ \text{m}^3/\text{s})\,k^3`;
          vp = al * kv * kv; vg = 3 * al * kv * kv; extra = [al * kv ** 3, 2 * al * kv * kv, 3 * al * kv];
          expl = raw`$v_{\text{phase}} = \omega/k = \alpha k^2 = ${F.num(vp, 3)}\ \text{m/s}$ and $v_{\text{group}} = d\omega/dk = 3\alpha k^2 = ${F.num(vg, 3)}\ \text{m/s}$.`;
        } else if (kind === 'sqrt') {
          const al = R.pick([2, 3, 4, 5, 6, 8, 10, 12]);
          kv = R.pick([0.25, 1, 4, 9, 16, 25, 36, 100]);
          rel = raw`\omega = (${al}\ \text{m}^{1/2}/\text{s})\sqrt{k}`;
          vp = al / Math.sqrt(kv); vg = vp / 2; extra = [al * Math.sqrt(kv), 2 * vp, al / kv];
          expl = raw`$v_{\text{phase}} = \omega/k = \alpha/\sqrt{k} = ${F.num(vp, 3)}\ \text{m/s}$ and $v_{\text{group}} = d\omega/dk = \alpha/(2\sqrt{k}) = ${F.num(vg, 3)}\ \text{m/s}$ (half the phase velocity, as for deep-water waves).`;
        } else {
          const a = R.pick([1, 2, 3, 5, 10]);
          const b = R.pick([0.01, 0.02, 0.05, 0.1, 0.2, 0.5]);
          kv = R.pick([1, 2, 3, 4, 5]);
          rel = raw`\omega = (${a}\ \text{m/s})\,k + (${F.num(b, 2)}\ \text{m}^3/\text{s})\,k^3`;
          vp = a + b * kv * kv; vg = a + 3 * b * kv * kv; extra = [a, 3 * b * kv * kv, a + 2 * b * kv * kv, a * kv + b * kv ** 3];
          expl = raw`$v_{\text{phase}} = \omega/k = a + bk^2 = ${F.num(vp, 3)}\ \text{m/s}$, while $v_{\text{group}} = d\omega/dk = a + 3bk^2 = ${F.num(vg, 3)}\ \text{m/s}$.`;
        }
        const corr = askG ? vg : vp;
        return {
          q: raw`Waves in a certain medium obey the dispersion relation $${rel}$. What is the ${askG ? 'group' : 'phase'} velocity of waves with wavenumber $k = ${F.num(kv, 3)}\ \text{m}^{-1}$?`,
          ...GRE.numeric(R, corr, [askG ? vp : vg].concat(extra), { unit: raw`\text{m/s}`, sig: 3, tol: 0.08 }),
          expl: expl + ' Phase velocity is $\\omega/k$; group velocity is $d\\omega/dk$. They agree only for linear dispersion.',
        };
      },
    },
    {
      id: 'optics.disp.plasma', sec: '3.1.3', level: 3,
      gen(R) {
        const cc = x => { const t = times(x, 'c'); return t == null ? null : `$${t}$`; };
        const mode = R.weighted(['vg', 'vp', 'fromvp', 'particle', 'cutoff'], [3, 2, 2, 2, 1]);
        const rel = raw`$\omega^2 = \omega_p^2 + c^2k^2$`;
        if (mode === 'cutoff') {
          const opts = [['$\\omega_p$', 1], ['$\\omega_p/2$', 0.5], ['$\\sqrt{2}\\,\\omega_p$', Math.SQRT2], ['$2\\omega_p$', 2], ['$0$ (all frequencies propagate)', 0], ['$\\omega_p/\\sqrt{2}$', Math.SQRT1_2]];
          const ch = GRE.mc(R, opts[0][0], opts.slice(1).map(x => x[0]), { rank: s => opts.find(x => x[0] === s)[1] });
          return {
            q: raw`Electromagnetic waves in a plasma obey the dispersion relation ${rel}, where $\omega_p$ is the plasma frequency. What is the lowest angular frequency at which a wave can propagate through the plasma?`,
            ...ch,
            expl: raw`For $\omega < \omega_p$, $k^2 = (\omega^2 - \omega_p^2)/c^2 < 0$, so $k$ is imaginary and the wave decays (is reflected) instead of propagating. Propagation requires $\omega \ge \omega_p$. This is why the ionosphere reflects low-frequency radio waves.`,
          };
        }
        const [p, q] = R.pick([[5, 4], [5, 3], [13, 12], [13, 5], [17, 15], [17, 8], [25, 24], [25, 7], [2, 1], [3, 1], [3, 2], [4, 1]]);
        const x = Math.sqrt(1 - (q * q) / (p * p)); // v_g / c
        if (mode === 'vg' || mode === 'vp') {
          const g = mode === 'vg';
          return {
            q: raw`Electromagnetic waves in a plasma obey ${rel}, where $\omega_p$ is the plasma frequency. What is the ${g ? 'group' : 'phase'} velocity of a wave with angular frequency $\omega = ${F.frac(p, q)}\,\omega_p$?`,
            ...mcv(R, g ? x : 1 / x, g ? [1 / x, q / p, 1 - (q * q) / (p * p), p / q, 1] : [x, p / q, q / p, 1, 1 / (1 - (q * q) / (p * p))], cc),
            expl: raw`From the dispersion relation, $ck = \sqrt{\omega^2 - \omega_p^2} = \omega\sqrt{1 - (\omega_p/\omega)^2}$. Then $v_{\text{phase}} = \omega/k = c/\sqrt{1 - (\omega_p/\omega)^2}$ and $v_{\text{group}} = d\omega/dk = c^2k/\omega = c\sqrt{1 - (\omega_p/\omega)^2}$. With $\omega_p/\omega = ${F.frac(q, p)}$: $v_{\text{group}} = ${times(x, 'c')}$ and $v_{\text{phase}} = ${times(1 / x, 'c')}$. Note $v_{\text{phase}}v_{\text{group}} = c^2$; only the group velocity (which carries the signal) must be below $c$.`,
          };
        }
        if (mode === 'fromvp') {
          return {
            q: raw`Waves in a certain medium obey ${rel}. If the phase velocity of a particular wave is $${times(1 / x, 'c')}$, what is its group velocity?`,
            ...mcv(R, x, [1 / x, 1, x * x, 1 / (x * x), Math.sqrt(x)], cc),
            expl: raw`Differentiating, $2\omega\,d\omega = 2c^2k\,dk$, so $v_{\text{group}} = d\omega/dk = c^2k/\omega = c^2/v_{\text{phase}} = ${times(x, 'c')}$.`,
          };
        }
        // relativistic particle: group velocity = particle speed beta c, phase velocity c/beta
        const beta = x;
        return {
          q: raw`A free particle of mass $m$ moves at speed $${times(beta, 'c')}$. Its de Broglie wave has $E = \hbar\omega$ and $p = \hbar k$, so the relativistic relation $E^2 = p^2c^2 + m^2c^4$ becomes a dispersion relation for $\omega(k)$. What is the phase velocity of this wave?`,
          ...mcv(R, 1 / beta, [beta, beta / 2, 1, beta * beta, 1 / (beta * beta)], cc),
          expl: raw`The group velocity $d\omega/dk = dE/dp = pc^2/E$ equals the particle speed $v$. Since $\omega^2 = c^2k^2 + \text{const}$, $v_{\text{phase}}v_{\text{group}} = c^2$, so $v_{\text{phase}} = c^2/v = ${times(1 / beta, 'c')}$, faster than light but carrying no information. (The nonrelativistic result $v_{\text{phase}} = v/2$ ignores the rest energy.)`,
        };
      },
    },
    {
      id: 'optics.disp.concept', sec: '3.1.3', level: 2,
      gen(R) {
        const T = [
          ['Information and energy in a wave packet travel at the group velocity $d\\omega/dk$.', 'the envelope of a packet moves at $d\\omega/dk$.'],
          ['If $\\omega$ is directly proportional to $k$, the phase and group velocities are equal.', 'for $\\omega = vk$, both $\\omega/k$ and $d\\omega/dk$ equal $v$.'],
          ['The phase velocity of a wave can exceed $c$ without violating special relativity.', 'no information travels at the phase velocity.'],
          ['In a dispersive medium, a pulse containing many wavelengths spreads out as it travels.', 'its components travel at different speeds.'],
          ['For the de Broglie wave of a free nonrelativistic particle, the phase velocity is half the group velocity.', 'with $\\omega = \\hbar k^2/2m$, $\\omega/k = \\hbar k/2m$ and $d\\omega/dk = \\hbar k/m$.'],
          ['A prism separates white light into colors because the index of refraction depends on wavelength.', 'that wavelength dependence is dispersion.'],
          ['For deep-water waves, $\\omega = \\sqrt{gk}$, longer wavelengths travel faster.', 'the phase velocity $\\sqrt{g/k}$ grows with wavelength.'],
        ];
        const Fz = [
          ['The group velocity is always larger than the phase velocity.', 'for deep-water waves, for example, it is half the phase velocity.'],
          ['A linear dispersion relation $\\omega = vk$ makes wave packets spread out.', 'with linear dispersion every component moves at $v$, so the shape is preserved.'],
          ['The phase velocity is $d\\omega/dk$ and the group velocity is $\\omega/k$.', 'the definitions are reversed.'],
          ['For the de Broglie wave of a free nonrelativistic particle, the group velocity is half the particle’s speed.', 'the group velocity equals the particle’s speed.'],
          ['When light enters glass its frequency changes while its wavelength stays the same.', 'it is the other way round: the frequency is fixed by continuity at the boundary.'],
          ['In ordinary glass, violet light travels faster than red light.', 'glass has a larger index for violet, so violet is slower.'],
          ['Signals can be sent faster than $c$ whenever the phase velocity exceeds $c$.', 'signals travel at the group velocity, which stays below $c$.'],
          ['For deep-water waves, $\\omega = \\sqrt{gk}$, the group velocity is twice the phase velocity.', 'it is half the phase velocity.'],
        ];
        if (R.bool(0.45)) {
          const r = romanPick(R, T, Fz, 'Which of the following statements about dispersion and wave velocities is (are) true?');
          return { q: r.q, choices: r.choices, ans: r.ans, expl: 'Phase velocity is $\\omega/k$, group velocity is $d\\omega/dk$. ' + r.why };
        }
        const r = conceptPick(R, T, Fz, 'Which of the following statements about wave dispersion is true?', 'Which of the following statements about wave dispersion is NOT true?');
        return { q: r.q, choices: r.choices, ans: r.ans, level: 1, expl: 'The answer is the statement shown: ' + r.why + ' Recall that phase velocity is $\\omega/k$ and group velocity is $d\\omega/dk$.' };
      },
    },

    // ================================================================ 3.1.4 examples of waves
    {
      id: 'optics.examples.string', sec: '3.1.4', level: 1, weight: 2,
      gen(R) {
        const mode = R.weighted(['speed', 'massLen', 'ratio', 'lambda', 'scale'], [2, 2, 2, 2, 2]);
        if (mode === 'speed' || mode === 'massLen' || mode === 'lambda') {
          for (let tries = 0; tries < 80; tries++) {
            const mu = R.pick([0.001, 0.002, 0.0025, 0.004, 0.005, 0.008, 0.01, 0.02, 0.025, 0.04, 0.05, 0.1]);
            const v = R.pick([10, 15, 20, 25, 30, 40, 50, 60, 80, 100, 120, 150, 200, 250, 300]);
            const T = mu * v * v;
            if (T < 1 || T > 2000 || Math.abs(F.round(T, 2) - T) > 1e-9 * T) continue;
            if (mode === 'speed') {
              return {
                q: raw`A string with linear mass density $${F.num(mu * 1000, 3)}\ \text{g/m}$ is held under a tension of $${F.num(T, 3)}\ \text{N}$. What is the speed of transverse waves on the string?`,
                ...GRE.numeric(R, v, [Math.sqrt(T / (mu * 1000)), T / mu, Math.sqrt(mu / T), v * Math.sqrt(1000), 2 * v], { unit: raw`\text{m/s}`, sig: 3 }),
                expl: raw`$v = \sqrt{T/\mu} = \sqrt{${F.num(T, 3)}\ \text{N}/${F.num(mu, 3)}\ \text{kg/m}} = ${v}\ \text{m/s}$. Remember to convert grams to kilograms.`,
              };
            }
            if (mode === 'massLen') {
              const L = R.pick([0.5, 0.8, 1, 1.2, 1.5, 2, 2.5, 4, 5]);
              const m = mu * L * 1000; // g
              if (Math.abs(F.round(m, 2) - m) > 1e-9 * m) continue;
              return {
                q: raw`A wire of length $${F.num(L, 2)}\ \text{m}$ and mass $${F.num(m, 3)}\ \text{g}$ is stretched with a tension of $${F.num(T, 3)}\ \text{N}$. How fast do transverse pulses travel along it?`,
                ...GRE.numeric(R, v, [Math.sqrt(T / (m / 1000)), Math.sqrt(T * (m / 1000) / L), Math.sqrt(T / (m / 1000 * L)), T * L / (m / 1000)], { unit: raw`\text{m/s}`, sig: 3 }),
                expl: raw`The linear density is $\mu = m/L = ${F.num(mu, 3)}\ \text{kg/m}$, so $v = \sqrt{T/\mu} = ${v}\ \text{m/s}$. Using the total mass in place of $\mu$ is the common error.`,
              };
            }
            const f = R.pick([5, 10, 20, 25, 40, 50, 60, 100, 120, 200, 250, 400, 500]);
            const lam = v / f;
            return {
              q: raw`One end of a long string (linear mass density $${F.num(mu * 1000, 3)}\ \text{g/m}$, tension $${F.num(T, 3)}\ \text{N}$) is shaken sinusoidally at $${f}\ \text{Hz}$. What is the wavelength of the resulting wave?`,
              ...GRE.numeric(R, lam, [f / v, 2 * lam, lam / 2, lam * 2 * Math.PI, Math.sqrt(T * mu) / f], { unit: raw`\text{m}`, sig: 3 }),
              expl: raw`$v = \sqrt{T/\mu} = ${v}\ \text{m/s}$; the driver fixes the frequency, so $\lambda = v/f = ${v}/${f} = ${F.num(lam, 3)}\ \text{m}$.`,
            };
          }
          throw new Error('no nice string numbers');
        }
        if (mode === 'ratio') {
          const byDiam = R.bool(0.35);
          let kT, kM, desc;
          if (byDiam) {
            kT = R.pick([1, 2, 4, 9, 1 / 2, 1 / 4]);
            const kd = R.pick([2, 3, 1 / 2, 1 / 3]);
            kM = kd * kd;
            if (kT === kM) throw new Error('trivial');
            desc = raw`Strings A and B are made of the same material. String A has ${timesWords(kd, 'diameter')} and ${timesWords(kT, 'tension')} of string B.`;
          } else {
            kT = R.pick([1, 2, 3, 4, 9, 1 / 2, 1 / 4]);
            kM = R.pick([1, 2, 3, 4, 9, 1 / 2, 1 / 4]);
            if (kT === kM) throw new Error('trivial');
            desc = raw`String A has ${timesWords(kT, 'tension')} and ${timesWords(kM, 'linear mass density')} of string B.`;
          }
          const r = Math.sqrt(kT / kM);
          return {
            q: desc + raw` What is the ratio $v_A/v_B$ of the speeds of transverse waves on the two strings?`,
            ...mcv(R, r, [1 / r, r * r, 1 / (r * r), Math.sqrt(kT * kM), kT * kM, 1, Math.sqrt(r)], x => { const e = F.exact(x); return e == null ? null : `$${e}$`; }),
            expl: raw`$v = \sqrt{T/\mu}$, so $v_A/v_B = \sqrt{(T_A/T_B)/(\mu_A/\mu_B)} = \sqrt{${ex(kT)}/${ex(kM)}} = ${ex(r)}$.${byDiam ? ' For the same material, $\\mu$ scales with the cross-sectional area, i.e. with the diameter squared.' : ''}`,
          };
        }
        const X = R.pick([2, 3, 4, 9, 16, 1 / 2, 1 / 4, 1 / 9]);
        const what = R.pick(['tension', 'density']);
        const fac = what === 'tension' ? Math.sqrt(X) : 1 / Math.sqrt(X);
        const qty = R.pick(['the wave speed', 'the wavelength of waves produced by a driver of fixed frequency']);
        return {
          q: raw`The ${what === 'tension' ? 'tension in a stretched string' : 'linear mass density of a stretched string (at fixed tension)'} is multiplied by $${ex(X)}$. By what factor does ${qty} change?`,
          ...mcv(R, fac, [1 / fac, fac * fac, 1 / (fac * fac), 1, 2 * fac], x => { const e = F.exact(x); return e == null ? null : `$${e}$`; }),
          expl: raw`$v = \sqrt{T/\mu}$ ${what === 'tension' ? 'scales as $\\sqrt{T}$' : 'scales as $1/\\sqrt{\\mu}$'}, giving a factor $${ex(fac)}$.${qty.indexOf('wavelength') >= 0 ? ' The frequency is set by the driver, so $\\lambda = v/f$ changes by the same factor.' : ''}`,
        };
      },
    },
    {
      id: 'optics.examples.sound', sec: '3.1.4', level: 2, weight: 2,
      gen(R) {
        const mode = R.weighted(['bulk', 'temp', 'gas', 'medium'], [2, 3, 2, 2]);
        if (mode === 'bulk') {
          const K = R.pick([0.8, 1.0, 1.2, 1.6, 2.0, 2.2, 2.5, 3.2, 3.6, 4.0, 4.9, 6.4, 8.1, 9.0]);
          const rho = R.pick([800, 900, 1000, 1250, 1600, 2000, 2500]);
          const v = Math.sqrt(K * 1e9 / rho);
          return {
            q: raw`A liquid has bulk modulus $${F.num(K, 2)}\ \text{GPa}$ and density $${rho}\ \text{kg/m}^3$. The speed of sound in the liquid is closest to`,
            ...GRE.numeric(R, v, [Math.sqrt(K * 1e6 / rho), K * 1e9 / rho, Math.sqrt(rho / (K * 1e9)) * 1e6, v / Math.sqrt(10)], { unit: raw`\text{m/s}`, sig: 2 }),
            expl: raw`By dimensional analysis (stiffness over inertia), $c_s = \sqrt{K/\rho} = \sqrt{${F.num(K, 2)}\times10^9/${rho}} \approx ${F.num(v, 2)}\ \text{m/s}$.`,
          };
        }
        if (mode === 'temp') {
          const Ts = [250, 273, 300, 320, 350, 400, 450, 500, 600, 1200];
          const [T1, T2] = R.pickN(Ts, 2);
          const v1 = Math.round(20.05 * Math.sqrt(T1));
          const v2 = v1 * Math.sqrt(T2 / T1);
          const c1 = T1 - 273, c2 = T2 - 273;
          const wr = [v1 * T2 / T1, v1 * Math.sqrt(T1 / T2), v1];
          if (c1 > 0 && c2 > 0) wr.unshift(v1 * Math.sqrt(c2 / c1));
          return {
            q: raw`The speed of sound in air is $${v1}\ \text{m/s}$ at $${c1}^\circ\text{C}$. Treating air as an ideal gas, what is the speed of sound at $${c2}^\circ\text{C}$?`,
            ...GRE.numeric(R, v2, wr, { unit: raw`\text{m/s}`, sig: 3, tol: 0.04 }),
            expl: raw`For an ideal gas $c_s = \sqrt{\gamma RT/M} \propto \sqrt{T}$ with $T$ in kelvin: $v = ${v1}\sqrt{${T2}/${T1}} \approx ${F.num(v2, 3)}\ \text{m/s}$. Using Celsius temperatures, or forgetting the square root, are the traps.`,
          };
        }
        if (mode === 'gas') {
          const P = R.pick([
            ['helium', 4, 'argon', 40, 'monatomic'], ['neon', 20, 'argon', 40, 'monatomic'], ['helium', 4, 'neon', 20, 'monatomic'], ['helium', 4, 'krypton', 84, 'monatomic'],
            ['hydrogen ($\\text{H}_2$)', 2, 'oxygen ($\\text{O}_2$)', 32, 'diatomic'], ['hydrogen ($\\text{H}_2$)', 2, 'nitrogen ($\\text{N}_2$)', 28, 'diatomic'], ['nitrogen ($\\text{N}_2$)', 28, 'oxygen ($\\text{O}_2$)', 32, 'diatomic'],
          ]);
          const lightFirst = R.bool();
          const r = Math.sqrt(P[3] / P[1]);
          const corr = lightFirst ? r : 1 / r;
          const [A, B] = lightFirst ? [P[0], P[2]] : [P[2], P[0]];
          return {
            q: raw`Both ${P[0]} and ${P[2]} are ${P[4]} ideal gases (molar masses $${P[1]}$ and $${P[3]}\ \text{g/mol}$). At the same temperature, what is the ratio of the speed of sound in ${A} to that in ${B}?`,
            ...mcv(R, corr, [1 / corr, corr * corr, 1 / (corr * corr), 1, Math.sqrt(corr)], x => { const e = F.exact(x); return e == null ? `$${F.num(x, 3)}$` : `$${e}$`; }, { tol: 0.05 }),
            expl: raw`$c_s = \sqrt{\gamma RT/M}$. With equal $\gamma$ (both ${P[4]}) and equal $T$, $c_s \propto 1/\sqrt{M}$, so the ratio is $\sqrt{M_B/M_A} = ${ex(corr)}$.`,
          };
        }
        const media = R.pick([['water', 1480], ['steel', 5900], ['glass', 5600], ['aluminum', 6400], ['sea water', 1530]]);
        const va = R.pick([340, 343]);
        const f = R.pick([200, 250, 400, 500, 800, 1000, 2000, 5000]);
        const lam = media[1] / f;
        return {
          q: raw`A $${f}\ \text{Hz}$ sound wave in air (speed $${va}\ \text{m/s}$) passes into ${media[0]}, where the speed of sound is $${media[1]}\ \text{m/s}$. What is its wavelength in ${media[0]}?`,
          ...GRE.numeric(R, lam, [va / f, (va / f) * va / media[1], f / media[1], lam * 2 * Math.PI], { unit: raw`\text{m}`, sig: 3, tol: 0.1 }),
          expl: raw`The frequency is set by the source and does not change at the boundary; the speed does. So $\lambda = v/f = ${media[1]}/${f} = ${F.num(lam, 3)}\ \text{m}$.`,
        };
      },
    },
    {
      id: 'optics.examples.dimensional', sec: '3.1.4', level: 2,
      gen(R) {
        const L = [
          { w: 'long-wavelength water waves in a shallow channel', v: 'the gravitational acceleration $g$ and the water depth $h$', c: '\\sqrt{gh}', x: ['\\sqrt{g/h}', 'gh', '\\sqrt{h/g}', 'g/h', 'gh^2'] },
          { w: 'deep-water surface waves of wavelength $\\lambda$', v: 'the gravitational acceleration $g$ and the wavelength $\\lambda$', c: '\\sqrt{g\\lambda}', x: ['\\sqrt{g/\\lambda}', 'g\\lambda', '\\sqrt{\\lambda/g}', 'g\\lambda^2', 'g/\\lambda'] },
          { w: 'short capillary ripples of wavelength $\\lambda$ on a liquid', v: 'the surface tension $\\sigma$ (force per length), the density $\\rho$, and the wavelength $\\lambda$', c: '\\sqrt{\\sigma/(\\rho\\lambda)}', x: ['\\sqrt{\\sigma\\lambda/\\rho}', '\\sqrt{\\sigma/\\rho}', '\\sigma/(\\rho\\lambda)', '\\sqrt{\\rho\\lambda/\\sigma}', '\\sqrt{\\sigma\\rho/\\lambda}'] },
          { w: 'longitudinal waves in a solid rod', v: 'Young’s modulus $Y$ (a pressure) and the density $\\rho$', c: '\\sqrt{Y/\\rho}', x: ['\\sqrt{\\rho/Y}', 'Y/\\rho', '\\sqrt{Y\\rho}', 'Y\\rho', '\\rho/Y'] },
          { w: 'transverse waves on a stretched drumhead', v: 'the tension per unit length $\\tau$ (N/m) and the mass per unit area $\\sigma$ (kg/m$^2$)', c: '\\sqrt{\\tau/\\sigma}', x: ['\\sqrt{\\sigma/\\tau}', '\\tau/\\sigma', '\\sqrt{\\tau\\sigma}', '\\tau\\sigma', '\\sigma/\\tau'] },
          { w: 'sound in an ideal gas', v: 'the pressure $P$ and the mass density $\\rho$', c: '\\sqrt{P/\\rho}', x: ['\\sqrt{\\rho/P}', 'P/\\rho', '\\sqrt{P\\rho}', 'P\\rho', '\\rho/P'] },
          { w: 'compressional waves along a long, uniform spring', v: 'its spring constant $k$, total mass $M$, and length $L$', c: 'L\\sqrt{k/M}', x: ['\\sqrt{kL/M}', 'L\\sqrt{M/k}', '\\sqrt{k/M}', 'kL/M', '\\sqrt{k/(ML)}'] },
          { w: 'Alfvén waves in a plasma', v: 'the magnetic field $B$, the mass density $\\rho$, and $\\mu_0$', c: 'B/\\sqrt{\\mu_0\\rho}', x: ['B\\sqrt{\\mu_0/\\rho}', 'B^2/(\\mu_0\\rho)', 'B\\sqrt{\\mu_0\\rho}', '\\sqrt{B/(\\mu_0\\rho)}', 'B\\sqrt{\\rho/\\mu_0}'] },
          { w: 'signals on a lossless coaxial cable', v: 'its inductance per length $\\mathcal{L}$ (H/m) and capacitance per length $\\mathcal{C}$ (F/m)', c: '1/\\sqrt{\\mathcal{L}\\mathcal{C}}', x: ['\\sqrt{\\mathcal{L}\\mathcal{C}}', '\\sqrt{\\mathcal{L}/\\mathcal{C}}', '1/(\\mathcal{L}\\mathcal{C})', '\\sqrt{\\mathcal{C}/\\mathcal{L}}', '\\mathcal{L}\\mathcal{C}'] },
          { w: 'light in a nonmagnetic dielectric', v: 'the permittivity $\\epsilon$ of the material and $\\mu_0$', c: '1/\\sqrt{\\mu_0\\epsilon}', x: ['\\sqrt{\\mu_0\\epsilon}', '\\sqrt{\\epsilon/\\mu_0}', '1/(\\mu_0\\epsilon)', '\\sqrt{\\mu_0/\\epsilon}', '\\mu_0\\epsilon'] },
          { w: 'transverse waves on a heavy rope', v: 'the tension $T$ and the linear mass density $\\mu$', c: '\\sqrt{T/\\mu}', x: ['\\sqrt{\\mu/T}', 'T/\\mu', '\\sqrt{T\\mu}', 'T\\mu', '\\mu/T'] },
        ];
        const P = R.pick(L);
        return {
          q: raw`The speed of ${P.w} depends only on ${P.v}. Up to a dimensionless constant, the speed must be proportional to`,
          ...GRE.mc(R, `$${P.c}$`, P.x.map(s => `$${s}$`)),
          expl: raw`Only $${P.c}$ has dimensions of length/time. Building speeds from "stiffness over inertia" (as in $\sqrt{T/\mu}$ and $\sqrt{K/\rho}$) is the fast way to reconstruct such formulas.`,
        };
      },
    },

    // ================================================================ 3.1.5 index of refraction
    {
      id: 'optics.index.medium', sec: '3.1.5', level: 1, weight: 2,
      gen(R) {
        const M = R.pick([['water', 1.33], ['glass', 1.5], ['crown glass', 1.52], ['flint glass', 1.65], ['diamond', 2.42], ['fused quartz', 1.46], ['sapphire', 1.77], ['acrylic plastic', 1.49], ['a transparent plastic', 1.6], ['a crystal', 2.0], ['an oil', 1.47]]);
        const n = M[1];
        const lam = R.pick([400, 450, 480, 500, 520, 550, 589, 600, 633, 650, 700]);
        const mode = R.weighted(['lam', 'freq', 'speed', 'time', 'count', 'reverse', 'n'], [3, 2, 2, 2, 2, 2, 1]);
        const stem0 = raw`Light of vacuum wavelength $${lam}\ \text{nm}$ travels through ${M[0]} (index of refraction $${n}$).`;
        if (mode === 'lam') {
          return {
            q: stem0 + ' What is its wavelength inside the material?',
            ...GRE.numeric(R, lam / n, [lam * n, lam, lam / (n * n), lam * (n - 1)], { unit: raw`\text{nm}`, sig: 3, tol: 0.08 }),
            expl: raw`The frequency is unchanged and the speed drops to $c/n$, so $\lambda = \lambda_0/n = ${lam}/${n} \approx ${F.num(lam / n, 3)}\ \text{nm}$.`,
          };
        }
        if (mode === 'freq') {
          const f = C.c / (lam * 1e-9);
          return {
            q: stem0 + ' What is the frequency of the light inside the material?',
            ...GRE.numeric(R, f, [f / n, f * n, f / (2 * Math.PI), f / (n * n)], { unit: raw`\text{Hz}`, sig: 2, fmt: x => F.sci(x, 2), tol: 0.1 }),
            expl: raw`The frequency does not change at a boundary (the fields must match in time on both sides): $f = c/\lambda_0 = (3\times10^8)/(${lam}\times10^{-9}) \approx ${F.sci(f, 2)}\ \text{Hz}$, in the material as in vacuum. Only the speed and wavelength change.`,
          };
        }
        if (mode === 'speed') {
          const v = C.c / n;
          return {
            q: raw`What is the speed of light in ${M[0]}, whose index of refraction is $${n}$?`,
            ...GRE.numeric(R, v, [C.c * n, C.c, C.c / (n * n), C.c * (n - 1)], { unit: raw`\text{m/s}`, fmt: x => F.sci(x, 2), tol: 0.08 }),
            expl: raw`By definition $n = c/v$, so $v = c/n = (3.0\times10^8)/${n} \approx ${F.sci(v, 2)}\ \text{m/s}$.`,
          };
        }
        if (mode === 'time') {
          const Lc = R.pick([[1, 'km', 1000, 'an optical fiber'], [10, 'km', 1e4, 'an optical fiber'], [3, 'm', 3, 'a long rod'], [30, 'cm', 0.3, 'a block'], [6, 'cm', 0.06, 'a slab']]);
          const t = n * Lc[2] / C.c;
          return {
            q: raw`How long does it take a light pulse to travel through $${Lc[0]}\ \text{${Lc[1]}}$ of ${Lc[3]} made of a material with index of refraction $${n}$?`,
            ...GRE.numeric(R, t, [Lc[2] / C.c, Lc[2] / (n * C.c), n * n * Lc[2] / C.c, (n - 1) * Lc[2] / C.c], { unit: raw`\text{s}`, fmt: x => F.sci(x, 2), tol: 0.08 }),
            expl: raw`The light moves at $c/n$, so $t = nL/c = ${n}\times ${F.num(Lc[2], 3)}\ \text{m}/(3\times10^8\ \text{m/s}) \approx ${F.sci(t, 2)}\ \text{s}$. ($nL$ is the optical path length.)`,
          };
        }
        if (mode === 'count') {
          const d = R.pick([1, 2, 3, 5, 10, 20, 50]); // micrometers
          const N = n * d * 1000 / lam;
          return {
            q: stem0 + raw` How many wavelengths fit within a $${d}\ \mu\text{m}$ thickness of the material?`,
            ...GRE.numeric(R, N, [d * 1000 / lam, d * 1000 / (n * lam), (n - 1) * d * 1000 / lam, 2 * N], { sig: 3, tol: 0.08 }),
            expl: raw`Inside the material $\lambda = \lambda_0/n$, so the number of wavelengths is $d/(\lambda_0/n) = nd/\lambda_0 = ${n}\times${d * 1000}/${lam} \approx ${F.num(N, 3)}$.`,
          };
        }
        if (mode === 'reverse') {
          const lm = Math.round(lam / n);
          const l0 = lm * n;
          return {
            q: raw`Inside ${M[0]} (index of refraction $${n}$), a beam of monochromatic light has wavelength $${lm}\ \text{nm}$. What is the wavelength of this light in vacuum?`,
            ...GRE.numeric(R, l0, [lm / n, lm, lm * n * n, lm * (n - 1)], { unit: raw`\text{nm}`, sig: 3, tol: 0.08 }),
            expl: raw`$\lambda_{\text{medium}} = \lambda_0/n$, so $\lambda_0 = n\lambda_{\text{medium}} = ${n}\times${lm} \approx ${F.num(l0, 3)}\ \text{nm}$. The vacuum wavelength is always the longer one.`,
          };
        }
        const v = C.c / n;
        const vs = F.round(v / 1e8, 3);
        const nn = 3 / vs;
        return {
          q: raw`Light travels through a transparent material at $${F.num(vs, 3)}\times10^{8}\ \text{m/s}$. What is the index of refraction of the material?`,
          ...GRE.numeric(R, nn, [1 / nn, nn * nn, nn - 1, Math.sqrt(nn)], { sig: 3, tol: 0.06 }),
          expl: raw`$n = c/v = (3.00\times10^8)/(${F.num(vs, 3)}\times10^8) \approx ${F.num(nn, 3)}$.`,
        };
      },
    },
    {
      id: 'optics.index.compare', sec: '3.1.5', level: 1,
      gen(R) {
        const mode = R.weighted(['ratio', 'roman', 'color'], [3, 2, 1]);
        if (mode === 'ratio') {
          const M = [['water', 4, 3], ['glass', 3, 2], ['a plastic', 8, 5], ['diamond', 12, 5], ['a crystal', 2, 1], ['an oil', 5, 4], ['vacuum', 1, 1]];
          const [A, B] = R.pickN(M, 2);
          const n1 = A[1] / A[2], n2 = B[1] / B[2];
          const qty = R.pick(['wavelength', 'speed', 'frequency', 'wavenumber']);
          const corr = { wavelength: n1 / n2, speed: n1 / n2, frequency: 1, wavenumber: n2 / n1 }[qty];
          const nt = X => X[0] === 'vacuum' ? 'vacuum' : `${X[0]} ($n = ${F.fracI(X[1], X[2])}$)`;
          const why = {
            wavelength: raw`$\lambda = \lambda_0/n$, so $\lambda_2/\lambda_1 = n_1/n_2$`,
            speed: raw`$v = c/n$, so $v_2/v_1 = n_1/n_2$`,
            frequency: raw`the frequency is fixed by the source and does not change at a boundary, so the ratio is 1`,
            wavenumber: raw`$k = 2\pi n/\lambda_0$, so $k_2/k_1 = n_2/n_1$`,
          }[qty];
          return {
            q: raw`A beam of monochromatic light passes from ${nt(A)} into ${nt(B)}. What is the ratio of the light’s ${qty} in ${B[0]} to its ${qty} in ${A[0]}?`,
            ...mcv(R, corr, [n1 / n2, n2 / n1, 1, (n1 / n2) ** 2, (n2 / n1) ** 2, Math.sqrt(n1 / n2)], x => { const e = F.exact(x); return e == null ? null : `$${e}$`; }),
            expl: raw`${why[0].toUpperCase() + why.slice(1)}: here $${ex(corr)}$.`,
          };
        }
        if (mode === 'roman') {
          const up = R.bool();
          const [m1, m2] = up ? R.pick([['air', 'glass'], ['air', 'water'], ['water', 'glass'], ['air', 'diamond']]) : R.pick([['glass', 'air'], ['water', 'air'], ['glass', 'water'], ['diamond', 'air']]);
          // effect of entering higher index (up): speed -, wavelength -, wavenumber +, frequency 0, photon energy 0
          const props = [['its speed', up ? -1 : 1], ['its wavelength', up ? -1 : 1], ['its wavenumber', up ? 1 : -1], ['its frequency', 0], ['the energy of each photon', 0]];
          const T = [], Fz = [];
          for (const [p, s] of props) {
            const why = s === 0 ? 'the frequency (and hence $E = hf$) is fixed at the boundary.' : p === 'its wavenumber' ? `$k = 2\\pi n/\\lambda_0$ ${s > 0 ? 'increases' : 'decreases'} with $n$.` : `${p.slice(4)} goes as $1/n$.`;
            const forms = [['increases', 1], ['decreases', -1], ['is unchanged', 0]];
            for (const [word, val] of forms) (val === s ? T : Fz).push([`${p[0].toUpperCase() + p.slice(1)} ${word}.`, why]);
          }
          const r = romanPick(R, T, Fz, `Monochromatic light passes from ${m1} into ${m2}. Which of the following is (are) true?`);
          return { q: r.q, choices: r.choices, ans: r.ans, expl: `Going into a medium of ${up ? 'higher' : 'lower'} index, $v = c/n$ and $\\lambda = \\lambda_0/n$ ${up ? 'decrease' : 'increase'} while the frequency is unchanged. ` + r.why };
        }
        const ask = R.pick([
          ['has the greatest speed in glass', 'red'], ['has the smallest speed in glass', 'violet'], ['has the largest index of refraction in glass', 'violet'],
          ['is bent (refracted) the most by a glass prism', 'violet'], ['is deviated the least by a glass prism', 'red'],
        ]);
        const cols = ['red', 'orange', 'yellow', 'green', 'blue', 'violet'];
        const others = cols.filter(c => c !== ask[1]);
        const wr = R.pickN(others, 3).map(c => c[0].toUpperCase() + c.slice(1)).concat(['All colors behave identically']);
        return {
          q: `Ordinary glass shows normal dispersion in the visible: its index of refraction is larger for shorter wavelengths. Which color of visible light ${ask[0]}?`,
          ...GRE.mc(R, ask[1][0].toUpperCase() + ask[1].slice(1), wr),
          expl: `With normal dispersion $n$ is largest for violet and smallest for red. Larger $n$ means slower light ($v = c/n$) and stronger bending, so violet is bent most and red least; that is why a prism produces a spectrum with violet deviated farthest.`,
        };
      },
    },

    // ================================================================ 3.1.6 polarization
    {
      id: 'optics.pol.malus', sec: '3.1.6', level: 2, weight: 2,
      gen(R) {
        const C2 = { 0: 1, 30: 0.75, 45: 0.5, 60: 0.25, 90: 0, 120: 0.25, 135: 0.5, 150: 0.75 };
        const S2 = { 0: 0, 30: 0.25, 45: 0.5, 60: 0.75, 90: 1, 120: 0.75, 135: 0.5, 150: 0.25 };
        const CA = { 0: 1, 30: Math.sqrt(3) / 2, 45: Math.SQRT1_2, 60: 0.5, 90: 0, 120: 0.5, 135: Math.SQRT1_2, 150: Math.sqrt(3) / 2 };
        const nrm = a => ((a % 180) + 180) % 180;
        const unpol = R.bool(0.6);
        const nP = R.weighted([2, 3], [1, 2]);
        const allowZero = R.bool(0.12);
        let angs, phi0, tries = 0;
        for (;;) {
          if (++tries > 200) throw new Error('no polarizer sequence');
          phi0 = R.pick([0, 0, 90, 30, 60]);
          angs = [unpol ? R.pick([0, 30, 45, 60, 90, 120, 135, 150]) : nrm(phi0 + R.pick([30, 45, 60, -30, -45, -60, 0]))];
          for (let i = 1; i < nP; i++) angs.push(nrm(angs[i - 1] + R.pick([30, 45, 60, 90, -30, -45, -60])));
          const diffs = angs.slice(1).map((a, i) => nrm(a - angs[i]));
          if (!allowZero && diffs.some(d => d === 90)) continue;
          if (!unpol && C2[nrm(angs[0] - phi0)] === 0) continue;
          if (new Set(angs).size < angs.length) continue;
          break;
        }
        const diffs = angs.slice(1).map((a, i) => nrm(a - angs[i]));
        const first = unpol ? 0.5 : C2[nrm(angs[0] - phi0)];
        const prodC = diffs.reduce((p, d) => p * C2[d], 1);
        const corr = first * prodC;
        const wr = [
          unpol ? 2 * corr : corr / 2,                                     // forgot / added the factor 1/2
          first * C2[nrm(angs[angs.length - 1] - angs[0])],                // ignored the middle polarizer(s)
          first * angs.slice(1).reduce((p, a) => p * C2[nrm(a - (unpol ? 0 : phi0))], 1), // used angles from the vertical
          (unpol ? 0.5 : CA[nrm(angs[0] - phi0)]) * diffs.reduce((p, d) => p * CA[d], 1), // cos instead of cos^2
          (unpol ? 0.5 : S2[nrm(angs[0] - phi0)]) * diffs.reduce((p, d) => p * S2[d], 1), // sin^2 instead of cos^2
          0.5 ** nP, corr / 4, 0.5, 0.25, 0,
        ];
        const numeric = R.bool(0.35);
        const I0 = R.pick([16, 32, 48, 64, 80, 96, 128, 160, 256]);
        const fmt = numeric ? (x => `$${F.num(x * I0, 3)}\\,\\text{W/m}^2$`) : (x => { const t = times(x, 'I_0', 512); return t == null ? null : `$${t}$`; });
        const src = unpol ? (numeric ? raw`Unpolarized light of intensity $${I0}\ \text{W/m}^2$` : raw`Unpolarized light of intensity $I_0$`)
          : (numeric ? raw`Light of intensity $${I0}\ \text{W/m}^2$, ${phi0 === 0 ? 'vertically polarized' : phi0 === 90 ? 'horizontally polarized' : `linearly polarized at $${phi0}^\\circ$ from the vertical`},` : raw`Light of intensity $I_0$, ${phi0 === 0 ? 'vertically polarized' : phi0 === 90 ? 'horizontally polarized' : `linearly polarized at $${phi0}^\\circ$ from the vertical`},`);
        const list = angs.map(a => `$${a}^\\circ$`);
        const listS = list.length === 2 ? list.join(' and ') : list.slice(0, -1).join(', ') + ', and ' + list[list.length - 1];
        const factors = [unpol ? '\\tfrac12' : `\\cos^2 ${nrm(angs[0] - phi0)}^\\circ`].concat(diffs.map(d => `\\cos^2 ${d > 90 ? 180 - d : d}^\\circ`)).join('\\times');
        return {
          q: raw`${src} passes through ${nP} ideal polarizers in succession. Their transmission axes make angles of ${listS} with the vertical, in order (all angles measured in the same sense). What is the intensity of the light that emerges from the last polarizer?`,
          ...mcv(R, corr, wr, fmt),
          expl: raw`${unpol ? 'The first polarizer passes half of unpolarized light.' : 'Malus’s law at the first polarizer uses the angle between the incident polarization and its axis.'} Each later polarizer transmits $\cos^2\theta$, where $\theta$ is the angle between successive axes, so $I = ${factors} = ${numeric ? F.num(corr * I0, 3) + '\\ \\text{W/m}^2' : times(corr, 'I_0', 512)}$. Using only the first and last axes, or angles from the vertical, are the traps.`,
        };
      },
    },
    {
      id: 'optics.pol.vector', sec: '3.1.6', level: 2,
      gen(R) {
        if (R.bool(0.2)) {
          const ang = R.pick([0, 30, 45, 60, 90, 120]);
          const opts = [['$\\tfrac12 I_0$', 0.5], ['$I_0\\cos^2' + ang + '^\\circ$', 0.51], ['$I_0$', 1], ['$\\tfrac14 I_0$', 0.25], ['$0$', 0], ['$\\tfrac{1}{\\sqrt2} I_0$', 0.7]];
          if (ang === 0) opts.splice(1, 1);
          if (ang === 90) opts.splice(1, 1);
          if (ang === 45 || ang === 135) opts.splice(1, 1);
          const ch = GRE.mc(R, opts[0][0], opts.slice(1).map(x => x[0]));
          return {
            q: raw`A circularly polarized beam of intensity $I_0$, $\mathbf{E} = E_0(\hat{x}\cos\omega t + \hat{y}\sin\omega t)$ at a fixed point, falls on an ideal linear polarizer whose transmission axis makes an angle of $${ang}^\circ$ with the $x$-axis. What intensity is transmitted?`,
            ...ch,
            expl: raw`The field component along any axis at angle $\theta$ is $E_0\cos(\omega t - \theta)$, whose time-averaged square is the same for every $\theta$. Circularly polarized light therefore behaves like unpolarized light here: half the intensity, $I_0/2$, is transmitted for every orientation.`,
          };
        }
        let a, b, c, d, tries = 0;
        do {
          a = R.int(-3, 3); b = R.int(1, 4); c = R.int(1, 4); d = R.int(-3, 3);
          if (R.bool()) [a, b] = [b, a];
          if (++tries > 200) throw new Error('no vectors');
        } while (a * d - b * c === 0 || a * c + b * d === 0 || (a === 0 && b === 0) || (c === 0 && d === 0));
        const dot = a * c + b * d, e2 = a * a + b * b, p2 = c * c + d * d;
        const corr = dot * dot / (e2 * p2);
        const vec = (x, y) => {
          const t = (k, s) => k === 0 ? '' : (k === 1 ? '' : k === -1 ? '-' : k) + s;
          const xs = t(x, '\\hat{x}'), ys = t(y, '\\hat{y}');
          if (!xs) return ys; if (!ys) return xs;
          return xs + (y < 0 ? ' - ' + t(-y, '\\hat{y}') : ' + ' + ys);
        };
        const fmt = x => { const e = F.exact(x, 512); return e == null ? null : `$${e}$`; };
        return {
          q: raw`A plane wave traveling along $z$ is linearly polarized along the direction $${vec(a, b)}$. It is incident on an ideal polarizer whose transmission axis lies along $${vec(c, d)}$. What fraction of the incident intensity is transmitted?`,
          ...mcv(R, corr, [Math.abs(dot) / Math.sqrt(e2 * p2), 1 - corr, dot * dot / e2, dot * dot / p2, 0.5, dot * dot / (e2 + p2), 0.25, 0.75, 1 / 3, 2 / 3, 1].filter(x => x > 0 && x <= 1.5), fmt),
          expl: raw`Malus’s law with $\cos\theta = \hat{n}\cdot\hat{n}_0 = \dfrac{${dot}}{\sqrt{${e2}}\sqrt{${p2}}}$: $I/I_0 = \cos^2\theta = ${F.exact(corr, 512)}$. Normalize both vectors, and square the cosine.`,
        };
      },
    },
    {
      id: 'optics.pol.brewster', sec: '3.1.6', level: 2, weight: 2,
      gen(R) {
        const MED = [['air', 1, '1.00'], ['water', 1.33, '1.33'], ['glass', 1.5, '1.50'], ['a dense flint glass', 1.73, '1.73'], ['diamond', 2.42, '2.42'], ['a plastic', 1.6, '1.60'], ['an oil', 1.47, '1.47']];
        const mode = R.weighted(['num', 'sym', 'refr', 'crit'], [3, 2, 2, 2]);
        if (mode === 'num' || mode === 'sym') {
          let A, B;
          do { [A, B] = R.pickN(MED, 2); } while (Math.abs(A[1] - B[1]) < 0.25);
          const n1 = A[1], n2 = B[1];
          const tb = atanD(n2 / n1);
          const lo = Math.min(n1, n2), hi = Math.max(n1, n2);
          const nt = X => `${X[0]} ($n = ${X[2]}$)`;
          const stem = raw`Unpolarized light traveling in ${nt(A)} strikes a flat interface with ${nt(B)}. At what angle of incidence is the reflected light completely polarized?`;
          if (mode === 'num') {
            return {
              q: stem + ' The angle is closest to',
              ...GRE.numeric(R, tb, [atanD(n1 / n2), asinD(lo / hi), acosD(lo / hi), 90 - asinD(lo / hi) / 2], degOpt(tb, 0.08)),
              expl: raw`Brewster’s angle: $\tan\theta_B = n_2/n_1 = ${B[2]}/${A[2]}$, so $\theta_B \approx ${degs(tb)}$. Do not confuse it with the critical angle $\sin^{-1}(n_{\text{low}}/n_{\text{high}}) \approx ${degs(asinD(lo / hi))}$, or invert the ratio.`,
            };
          }
          const T = (f, x, y) => `$\\${f}^{-1}(${x}/${y})$`;
          const corr = T('tan', B[2], A[2]);
          const wr = [T('tan', A[2], B[2]), T('sin', F.num(lo, 3, true), F.num(hi, 3, true)), T('cos', F.num(lo, 3, true), F.num(hi, 3, true)), 'No such angle exists for light incident from this side'];
          return {
            q: stem,
            ...GRE.mc(R, corr, wr),
            expl: raw`Brewster’s angle obeys $\tan\theta_B = n_2/n_1$, with $n_1$ the medium of incidence: $\theta_B = \tan^{-1}(${B[2]}/${A[2]})$. A Brewster angle exists for incidence from either side; $\sin^{-1}(n_{\text{low}}/n_{\text{high}})$ is the critical angle for total internal reflection, a different thing.`,
          };
        }
        if (mode === 'refr') {
          const tb = R.pick([50, 52, 53, 54, 56, 58, 60, 62, 63, 65, 67]);
          return {
            q: raw`Light strikes the surface of a transparent material at its Brewster angle, $${tb}^\circ$ from the normal. What is the angle of refraction?`,
            ...GRE.numeric(R, 90 - tb, [tb, 180 - 2 * tb, 2 * tb - 90 > 0 ? 2 * tb - 90 : null, tb / 2, 90].filter(x => x != null), { fmt: x => `${F.num(x, 3)}^\\circ`, tol: 0.08 }),
            level: 1,
            expl: raw`At Brewster’s angle the reflected and refracted rays are perpendicular. Since the reflected ray is at $\theta_B$, $\theta_B + \theta_t = 90^\circ$, giving $\theta_t = ${90 - tb}^\circ$. (Check: $n_1\sin\theta_B = n_2\cos\theta_B$ is exactly $\tan\theta_B = n_2/n_1$.)`,
          };
        }
        const [p, q] = R.pick([[2, 3], [3, 4], [3, 5], [1, 2], [4, 5], [5, 8], [5, 6], [7, 10]]);
        const fromInside = R.bool(0.35);
        const corr = fromInside ? `$\\tan^{-1}(${F.fracI(p, q)})$` : `$\\tan^{-1}(${F.fracI(q, p)})$`;
        const wr = [fromInside ? `$\\tan^{-1}(${F.fracI(q, p)})$` : `$\\tan^{-1}(${F.fracI(p, q)})$`, `$\\sin^{-1}(${F.fracI(p, q)})$`, `$\\cos^{-1}(${F.fracI(p, q)})$`, `$\\tan^{-1}(${F.fracI(q * q, p * p)})$`];
        return {
          q: raw`For light inside a block of transparent material, the critical angle for total internal reflection at the material–air interface is $\theta_c$, with $\sin\theta_c = ${F.frac(p, q)}$. What is Brewster’s angle for light ${fromInside ? 'inside the block striking the interface with air' : 'in air reflecting from the block'}?`,
          ...GRE.mc(R, corr, wr),
          level: 3,
          expl: raw`$\sin\theta_c = 1/n$, so $n = ${F.frac(q, p)}$. Brewster’s angle is $\tan\theta_B = n_2/n_1$: ${fromInside ? `from inside, $n_2/n_1 = 1/n = ${F.frac(p, q)}$` : `from air, $n_2/n_1 = n = ${F.frac(q, p)}$`}, giving ${corr}.`,
        };
      },
    },
    {
      id: 'optics.pol.concept', sec: '3.1.6', level: 2,
      gen(R) {
        const T = [
          ['Unpolarized light passing through an ideal polarizer loses half its intensity.', 'averaging $\\cos^2\\theta$ over all angles gives $1/2$.'],
          ['Sunlight reflected from a calm lake near Brewster’s angle is polarized mostly horizontally.', 'reflected light is polarized perpendicular to the plane of incidence, which is vertical here.'],
          ['Sound waves in air cannot be polarized.', 'they are longitudinal, so there is no transverse direction to select.'],
          ['At Brewster’s angle the reflected and refracted rays are perpendicular to each other.', '$\\tan\\theta_B = n_2/n_1$ is equivalent to $\\theta_B + \\theta_t = 90^\\circ$.'],
          ['Light polarized in the plane of incidence is not reflected at all when incident at Brewster’s angle.', 'that is the defining property of Brewster’s angle.'],
          ['Inserting a third polarizer between two crossed polarizers can allow light to pass.', 'with the middle axis at $45^\\circ$, a fraction $1/8$ of unpolarized light gets through.'],
          ['Circularly polarized light can be written as a superposition of two perpendicular linear polarizations that are $90^\\circ$ out of phase.', 'that is its definition.'],
          ['Rotating an ideal polarizer in a beam of unpolarized light does not change the transmitted intensity.', 'unpolarized light has no preferred direction.'],
        ];
        const Fz = [
          ['Two crossed ideal polarizers transmit half of the incident unpolarized light.', 'the first passes half and the second blocks all of it.'],
          ['Polarizing sunglasses cut glare from a road by transmitting horizontally polarized light.', 'glare is mostly horizontally polarized, so the glasses transmit vertical polarization.'],
          ['Light reflected at Brewster’s angle is polarized parallel to the plane of incidence.', 'it is polarized perpendicular to the plane of incidence.'],
          ['A Brewster angle exists only for light going from a lower to a higher index of refraction.', '$\\tan\\theta_B = n_2/n_1$ has a solution for either order.'],
          ['Sound waves in air can be linearly polarized by passing them through a slatted fence.', 'longitudinal waves have no polarization.'],
          ['The intensity transmitted by a polarizer is proportional to $\\cos\\theta$, where $\\theta$ is the angle between the polarization and the axis.', 'intensity goes as the square of the transmitted field, $\\cos^2\\theta$.'],
          ['Circularly polarized light is completely blocked by a linear polarizer oriented along $x$.', 'half of its intensity is transmitted for any orientation.'],
          ['Placing more polarizers in a beam can never increase the light transmitted.', 'a polarizer inserted between crossed polarizers increases it from zero.'],
        ];
        if (R.bool(0.55)) {
          const r = romanPick(R, T, Fz, 'Which of the following statements about polarization is (are) true?');
          return { q: r.q, choices: r.choices, ans: r.ans, expl: r.why };
        }
        const r = conceptPick(R, T, Fz, 'Which of the following statements about polarized light is correct?', 'Which of the following statements about polarized light is FALSE?');
        return { q: r.q, choices: r.choices, ans: r.ans, level: 1, expl: 'The answer is the statement shown: ' + r.why };
      },
    },

    // ================================================================ 3.2.1 double-slit interference
    {
      id: 'optics.ds.spacing', sec: '3.2.1', level: 1, weight: 3,
      gen(R) {
        const lam = R.pick([400, 420, 450, 480, 500, 520, 540, 550, 560, 580, 589, 600, 630, 633, 650, 680, 700]);
        const d = R.pick([0.10, 0.12, 0.15, 0.20, 0.25, 0.30, 0.40, 0.50, 0.60, 0.80, 1.0]);
        const L = R.pick([0.50, 0.80, 1.0, 1.2, 1.5, 2.0, 2.5, 3.0, 4.0]);
        const dy = lam * 1e-9 * L / (d * 1e-3) * 1e3; // mm
        const src = lam === 589 ? 'Yellow light from a sodium lamp' : lam === 633 ? 'Light from a helium–neon laser' : 'Monochromatic light';
        const setup = raw`${src} of wavelength $${lam}\ \text{nm}$ illuminates two narrow slits separated by $${F.num(d, 2, true)}\ \text{mm}$. The interference pattern is viewed on a screen $${F.num(L, 2, true)}\ \text{m}$ away.`;
        const base = raw`For $L \gg d$ the $m$th bright fringe is at $y_m = m\lambda L/d$ and dark fringes are at $y = (m + \tfrac12)\lambda L/d$; the fringe spacing is $\Delta y = \lambda L/d = (${lam}\times10^{-9})(${F.num(L, 2)})/(${F.num(d, 2)}\times10^{-3})\ \text{m} = ${F.num(dy, 3)}\ \text{mm}$.`;
        const mode = R.weighted(['spacing', 'bright', 'dark', 'across', 'lam', 'd'], [3, 2, 2, 1, 2, 2]);
        const mm = { unit: raw`\text{mm}`, sig: 3, tol: 0.08 };
        if (mode === 'spacing') {
          return { q: setup + ' What is the distance between adjacent bright fringes near the center of the pattern?', ...GRE.numeric(R, dy, [dy / 2, 2 * dy, 4 * dy, dy / 4], mm), expl: base };
        }
        if (mode === 'bright') {
          const m = R.int(2, 5);
          return {
            q: setup + raw` How far from the center of the central bright fringe is the center of the ${ORD[m]}-order bright fringe?`,
            ...GRE.numeric(R, m * dy, [(m - 0.5) * dy, (m + 0.5) * dy, (m - 1) * dy, (m + 1) * dy, 2 * m * dy, m * dy / 2], mm),
            level: 1,
            expl: base + raw` So $y_${m} = ${m}\Delta y = ${F.num(m * dy, 3)}\ \text{mm}$.`,
          };
        }
        if (mode === 'dark') {
          const n = R.int(1, 4);
          return {
            q: setup + raw` How far from the center of the pattern is the ${ORD[n]} dark fringe (counting outward from the central maximum)?`,
            ...GRE.numeric(R, (n - 0.5) * dy, [n * dy, (n + 0.5) * dy, n > 1 ? (n - 1) * dy : 2 * dy, (2 * n - 1) * dy, (n - 0.5) * dy / 2], mm),
            level: 2,
            expl: base + raw` The ${ORD[n]} dark fringe has path difference $(${n} - \tfrac12)\lambda$, so it lies at $${F.num(n - 0.5, 2)}\,\Delta y = ${F.num((n - 0.5) * dy, 3)}\ \text{mm}$.`,
          };
        }
        if (mode === 'across') {
          const m = R.int(1, 4);
          return {
            q: setup + raw` What is the distance between the ${ORD[m]}-order bright fringes on opposite sides of the central maximum?`,
            ...GRE.numeric(R, 2 * m * dy, [m * dy, (2 * m - 1) * dy, (2 * m + 1) * dy, 4 * m * dy], mm),
            expl: base + raw` The two ${ORD[m]}-order fringes are at $\pm ${m}\Delta y$, so they are $${2 * m}\Delta y = ${F.num(2 * m * dy, 3)}\ \text{mm}$ apart.`,
          };
        }
        if (mode === 'lam') {
          const m = R.int(1, 4);
          const ym = F.round(m * dy, 2);
          const lr = ym * 1e-3 * d * 1e-3 / (m * L) * 1e9;
          return {
            q: raw`Two narrow slits separated by $${F.num(d, 2, true)}\ \text{mm}$ are illuminated by monochromatic light, and the pattern is viewed on a screen $${F.num(L, 2, true)}\ \text{m}$ away. The ${ORD[m]}-order bright fringe is $${F.num(ym, 2, true)}\ \text{mm}$ from the center of the central maximum. What is the wavelength of the light?`,
            ...GRE.numeric(R, lr, [lr * m, lr * m / (m - 0.5), lr / 2, 2 * lr, lr * m / (m + 0.5)], { unit: raw`\text{nm}`, sig: 3, tol: 0.08 }),
            level: 2,
            expl: raw`$y_m = m\lambda L/d$, so $\lambda = y_m d/(mL) = (${F.num(ym, 2)}\times10^{-3})(${F.num(d, 2)}\times10^{-3})/(${m}\times${F.num(L, 2)})\ \text{m} \approx ${F.num(lr, 3)}\ \text{nm}$.${m > 1 ? ' Forgetting to divide by the order $m$ is the trap.' : ''}`,
          };
        }
        const dys = F.round(dy, 2);
        const dr = lam * 1e-9 * L / (dys * 1e-3) * 1e3; // mm
        return {
          q: raw`Light of wavelength $${lam}\ \text{nm}$ falls on two narrow slits, producing bright fringes spaced $${F.num(dys, 2, true)}\ \text{mm}$ apart on a screen $${F.num(L, 2, true)}\ \text{m}$ away. What is the slit separation?`,
          ...GRE.numeric(R, dr, [dr / 2, 2 * dr, dr * 10, dr / 10], { unit: raw`\text{mm}`, sig: 2, tol: 0.1 }),
          level: 2,
          expl: raw`$\Delta y = \lambda L/d$, so $d = \lambda L/\Delta y = (${lam}\times10^{-9})(${F.num(L, 2)})/(${F.num(dys, 2)}\times10^{-3})\ \text{m} \approx ${F.num(dr, 2)}\ \text{mm}$.`,
        };
      },
    },
    {
      id: 'optics.ds.scaling', sec: '3.2.1', level: 2, weight: 2,
      gen(R) {
        const LIQ = [['water ($n = 4/3$)', 4 / 3], ['an oil with $n = 3/2$', 3 / 2], ['a liquid with index of refraction $5/4$', 5 / 4], ['a liquid with index of refraction $8/5$', 8 / 5], ['a liquid with index of refraction $6/5$', 6 / 5]];
        const LAMS = [[600, 400], [400, 600], [450, 600], [600, 450], [480, 600], [600, 480], [400, 500], [500, 400], [420, 630], [630, 420], [700, 350], [400, 700]];
        const angular = R.bool(0.3);
        const types = R.shuffle(['n', 'd', 'L', 'lam', 'freq', 'width', 'bright']);
        const nCh = R.weighted([1, 2, 3], [3, 5, 2]);
        const chosen = [];
        for (const t of types) {
          if (chosen.length >= nCh) break;
          if ((t === 'lam' && chosen.indexOf('freq') >= 0) || (t === 'freq' && chosen.indexOf('lam') >= 0)) continue;
          if ((t === 'width' || t === 'bright') && (chosen.indexOf('width') >= 0 || chosen.indexOf('bright') >= 0)) continue;
          if (t === 'L' && angular && R.bool(0.5)) continue;
          chosen.push(t);
        }
        if (chosen.every(t => t === 'width' || t === 'bright')) throw new Error('only trivial changes');
        let f = 1, nLiq = 1, lFac = 1, lamPair = null;
        const txt = [], why = [];
        for (const t of chosen) {
          if (t === 'n') { const [nm, n] = R.pick(LIQ); nLiq = n; f /= n; txt.push(`the entire apparatus is immersed in ${nm}`); why.push(`immersion shortens the wavelength to $\\lambda/n$ (factor $${ex(1 / n)}$)`); }
          if (t === 'd') { const [a, w] = R.pick(SCALE); f /= a; txt.push(`the slit separation is ${w}`); why.push(`spacing $\\propto 1/d$ (factor $${ex(1 / a)}$)`); }
          if (t === 'L') { const [b, w] = R.pick(SCALE); lFac = b; if (!angular) f *= b; txt.push(`the distance from the slits to the screen is ${w}`); why.push(angular ? 'the angular spacing $\\lambda/d$ does not depend on the screen distance' : `spacing $\\propto L$ (factor $${ex(b)}$)`); }
          if (t === 'lam') { lamPair = R.pick(LAMS); f *= lamPair[1] / lamPair[0]; txt.push(`the $${lamPair[0]}\\ \\text{nm}$ light is replaced by light of wavelength $${lamPair[1]}\\ \\text{nm}$`); why.push(`spacing $\\propto \\lambda$ (factor $${ex(lamPair[1] / lamPair[0])}$)`); }
          if (t === 'freq') { const [c, w] = R.pick(SCALE.slice(0, 4)); f /= c; txt.push(`the frequency of the light is ${w}`); why.push(`$\\lambda = c/f$, so the spacing changes by $${ex(1 / c)}$`); }
          if (t === 'width') { txt.push('each slit is made narrower, with the distance between the slits unchanged'); why.push('narrowing the slits widens the diffraction envelope but does not move the fringes'); }
          if (t === 'bright') { txt.push('the intensity of the light source is doubled'); why.push('brightness does not affect fringe positions'); }
        }
        const join = a => a.length === 1 ? a[0] : a.length === 2 ? a.join(' and ') : a.slice(0, -1).join(', ') + ', and ' + a[a.length - 1];
        const qty = angular ? 'the angular separation between adjacent bright fringes' : 'the spacing between adjacent bright fringes on the screen';
        const light = lamPair ? `light of wavelength $${lamPair[0]}\\ \\text{nm}$` : 'monochromatic light';
        const wr = [1 / f, f * nLiq * nLiq, f * nLiq, angular ? f * lFac : f / lFac, f * f, 1, 2 * f, f / 2, Math.sqrt(f)];
        const fmt = x => { if (Math.abs(x - 1) < 1e-9) return 'It is unchanged.'; const e = F.exact(x); return e == null ? null : `It is multiplied by $${e}$.`; };
        return {
          q: `In a double-slit experiment with ${light}, ${join(txt)}. By what factor does ${qty} change?`,
          ...mcv(R, f, wr, fmt),
          expl: `Bright fringes are at $d\\sin\\theta = m\\lambda$, so the angular spacing is $\\lambda/d$ and the spacing on a distant screen is $\\lambda L/d$. Here: ${join(why)}. Overall factor: $${ex(f)}$.`,
        };
      },
    },
    {
      id: 'optics.ds.coincide', sec: '3.2.1', level: 2,
      gen(R) {
        const mode = R.weighted(['bb', 'bd', 'first'], [2, 2, 2]);
        if (mode === 'first') {
          const P = R.pick([[400, 600], [450, 600], [480, 600], [500, 600], [400, 500], [420, 560], [500, 700], [450, 750], [480, 640], [400, 700], [540, 720], [420, 630], [560, 700]]);
          const [l1, l2] = P;
          const g = F.gcd(l1, l2), m1 = l2 / g, m2 = l1 / g;
          const d = R.pick([0.2, 0.25, 0.3, 0.4, 0.5, 0.6, 0.8, 1.0]);
          const L = R.pick([1, 1.5, 2, 2.5, 3]);
          const y = m1 * l1 * 1e-9 * L / (d * 1e-3) * 1e3;
          return {
            q: raw`Two narrow slits separated by $${F.num(d, 2, true)}\ \text{mm}$ are illuminated simultaneously by light of wavelengths $${l1}\ \text{nm}$ and $${l2}\ \text{nm}$, and the pattern is viewed on a screen $${F.num(L, 2)}\ \text{m}$ away. Apart from the center, what is the smallest distance from the central maximum at which bright fringes of both wavelengths coincide?`,
            ...GRE.numeric(R, y, [l1 * 1e-9 * L / (d * 1e-3) * 1e3, l2 * 1e-9 * L / (d * 1e-3) * 1e3, m1 * m2 * l1 * 1e-9 * L / (d * 1e-3) * 1e3, (l2 - l1) * 1e-9 * L / (d * 1e-3) * 1e3, y / 2], { unit: raw`\text{mm}`, sig: 3, tol: 0.08 }),
            level: 3,
            expl: raw`Coincidence requires $m_1\lambda_1 = m_2\lambda_2$, i.e. $m_1/m_2 = ${l2}/${l1} = ${m1}/${m2}$. The smallest nonzero solution is $m_1 = ${m1}$, $m_2 = ${m2}$, at $y = m_1\lambda_1L/d = ${m1}\times${l1}\ \text{nm}\times${F.num(L, 2)}\ \text{m}/${F.num(d, 2)}\ \text{mm} \approx ${F.num(y, 3)}\ \text{mm}$.`,
          };
        }
        for (let tries = 0; tries < 200; tries++) {
          const l1 = R.pick([400, 420, 450, 480, 500, 540, 560, 600, 630, 640, 660, 700]);
          const m = R.int(1, 6), n = R.int(1, 6);
          const l2 = mode === 'bb' ? m * l1 / n : m * l1 / (n - 0.5);
          if (l2 < 400 || l2 > 720 || Math.abs(l2 - l1) < 20 || !isInt(l2) || m === n) continue;
          const darkTxt = mode === 'bb' ? `${ORD[n]}-order bright fringe` : `${ORD[n]} dark fringe (counting outward from the central maximum)`;
          const wr = mode === 'bb'
            ? [n * l1 / m, (m + 1) * l1 / n, m * l1 / (n + 1), n > 1 ? m * l1 / (n - 1) : null, m * l1 / (n - 0.5)]
            : [m * l1 / n, m * l1 / (n + 0.5), (m - 0.5) * l1 / n, m * l1 / (n - 1.5) > 0 && n > 1 ? m * l1 / (n - 1) : null, (n - 0.5) * l1 / m];
          return {
            q: raw`In a double-slit experiment, the ${ORD[m]}-order bright fringe produced by light of wavelength $${l1}\ \text{nm}$ falls at exactly the same place on the screen as the ${darkTxt} produced by a second wavelength. What is the second wavelength?`,
            ...GRE.numeric(R, l2, wr.filter(x => x != null && x > 0), { unit: raw`\text{nm}`, sig: 3, tol: 0.05 }),
            expl: mode === 'bb'
              ? raw`Same angle means the same path difference $d\sin\theta$: $${m}\lambda_1 = ${n}\lambda_2$, so $\lambda_2 = ${m}(${l1})/${n} = ${l2}\ \text{nm}$.`
              : raw`Bright: $d\sin\theta = m\lambda_1$; the ${ORD[n]} dark fringe has $d\sin\theta = (${n} - \tfrac12)\lambda_2$. Equating, $\lambda_2 = ${m}(${l1})/${F.num(n - 0.5, 2)} = ${l2}\ \text{nm}$.`,
          };
        }
        throw new Error('no coincidence found');
      },
    },
    {
      id: 'optics.ds.intensity', sec: '3.2.1', level: 2,
      gen(R) {
        const fmt = x => { const e = F.exact(x); return e == null ? null : `$${e === '1' ? '' : e + '\\,'}I_{\\max}$`.replace('$0\\,I_{\\max}$', '$0$'); };
        if (R.bool(0.6)) {
          const kind = R.pick(['path', 'frac', 'phase', 'dark']);
          let ph, desc; // ph = phase difference / pi
          if (kind === 'path') { const [a, b] = R.pick([[1, 4], [1, 3], [1, 6], [2, 3], [3, 4], [5, 6]]); ph = 2 * a / b; desc = raw`at a point where the path difference from the two slits is $${F.frac(a, b)}\lambda$`; }
          else if (kind === 'frac') { const [a, b] = R.pick([[1, 4], [1, 3], [1, 6], [2, 3], [3, 4], [5, 6]]); ph = 2 * a / b; desc = raw`at a point ${F.fracI(a, b)} of the way from the center of the central bright fringe to the center of the first-order bright fringe (small angles)`; }
          else if (kind === 'phase') { const [a, b] = R.pick([[1, 3], [1, 2], [2, 3], [3, 2], [4, 3], [5, 3]]); ph = a / b; desc = raw`at a point where the waves from the two slits differ in phase by $${piF(a, b)}$`; }
          else { const [a, b] = R.pick([[1, 3], [1, 2], [2, 3]]); ph = a / b; desc = raw`at a point ${F.fracI(a, b)} of the way from the center of the central bright fringe to the first dark fringe (small angles)`; }
          const c2 = Math.cos(Math.PI * ph / 2) ** 2;
          const ok = F.exact(c2);
          if (ok == null) throw new Error('not exact');
          const wr = [Math.abs(Math.cos(Math.PI * ph / 2)), Math.cos(Math.PI * ph) ** 2, Math.sin(Math.PI * ph / 2) ** 2, (1 + Math.abs(Math.cos(Math.PI * ph / 2))) / 2, 0.5, 0.25, 0.75, 0, 1];
          return {
            q: raw`In a two-slit interference pattern produced by identical narrow slits, the intensity at the center of the central bright fringe is $I_{\max}$. What is the intensity ${desc}?`,
            ...mcv(R, c2, wr, fmt),
            expl: raw`Two equal waves with phase difference $\phi$ give $I = I_{\max}\cos^2(\phi/2)$. Here $\phi = ${piF(Math.round(ph * 12), 12)}$ (a path difference $\Delta$ gives $\phi = 2\pi\Delta/\lambda$), so $I = I_{\max}\cos^2(${piF(Math.round(ph * 6), 12)}) = ${ex(c2)}\,I_{\max}$.`,
          };
        }
        const s = R.pick([2, 3, 4, 5]); // amplitude ratio
        const ampForm = R.bool();
        const desc = ampForm ? `the wave arriving from one slit has ${['', '', 'twice', 'three times', 'four times', 'five times'][s]} the amplitude of the wave from the other`
          : `light from one slit alone would produce intensity $I_1$ at the screen, and light from the other slit alone would produce $${s * s}I_1$`;
        const ask = R.pick(['ratio', 'max', 'min']);
        if (ask === 'ratio' || ampForm) {
          const corr = ((s + 1) / (s - 1)) ** 2;
          return {
            q: `In a double-slit experiment, ${desc}. What is the ratio of the maximum intensity to the minimum intensity in the interference pattern?`,
            ...mcv(R, corr, [(s * s + 1) / (s * s - 1), (s + 1) / (s - 1), s * s, (s + 1) ** 2, s, 4 * s], x => `$${ex(x)}$`),
            level: 3,
            expl: raw`Amplitudes add: $A_{\max} = A(1 + ${s})$, $A_{\min} = A(${s} - 1)$, so $I_{\max}/I_{\min} = (${s + 1}/${s - 1})^2 = ${ex(corr)}$. Adding intensities instead of amplitudes gives the wrong ratio.`,
          };
        }
        const mx = ask === 'max';
        const corr = mx ? (s + 1) ** 2 : (s - 1) ** 2;
        return {
          q: `In a double-slit experiment, ${desc}. What is the ${mx ? 'maximum' : 'minimum'} intensity in the interference pattern?`,
          ...mcv(R, corr, [s * s + 1, mx ? (s - 1) ** 2 : (s + 1) ** 2, s * s - 1, 2 * (s * s + 1), 0, 4 * s * s], x => `$${x === 0 ? '0' : x === 1 ? 'I_1' : x + 'I_1'}$`),
          level: 3,
          expl: raw`The amplitudes are $\sqrt{I_1}$ and $${s}\sqrt{I_1}$. ${mx ? 'In phase they add' : 'Out of phase they subtract'}: $I = (${s} ${mx ? '+' : '-'} 1)^2 I_1 = ${corr}I_1$. Simply adding the intensities would give $${s * s + 1}I_1$ everywhere (no interference).`,
        };
      },
    },
    {
      id: 'optics.ds.concept', sec: '3.2.1', level: 1,
      gen(R) {
        const T = [
          ['Covering one slit replaces the fringes with a broad single-slit diffraction pattern.', 'with one slit there is nothing to interfere with.'],
          ['With white light, the central fringe is white and the side fringes are colored, with red farther from the center than violet in each order.', '$y_m \\propto \\lambda$, and at the center every wavelength is in phase.'],
          ['Making each slit narrower, with the separation fixed, leaves the fringe spacing unchanged.', 'the spacing $\\lambda L/d$ does not involve the slit width.'],
          ['Covering one slit with a thin sheet of glass shifts the whole pattern toward that slit.', 'the extra optical path must be compensated by a shorter geometric path from that slit.'],
          ['If the two slits are lit by two independent lamps, no stable fringes are seen.', 'the relative phase of incoherent sources fluctuates rapidly.'],
          ['Immersing the apparatus in water brings the fringes closer together.', 'the wavelength in water is $\\lambda/n$.'],
          ['Adjacent bright fringes correspond to path differences that differ by one wavelength.', 'bright fringes satisfy $d\\sin\\theta = m\\lambda$.'],
        ];
        const Fz = [
          ['Immersing the apparatus in water spreads the fringes farther apart.', 'the wavelength shrinks to $\\lambda/n$, so the fringes move closer together.'],
          ['Increasing the slit separation increases the fringe spacing.', 'the spacing is $\\lambda L/d$, which decreases.'],
          ['Blue light produces more widely spaced fringes than red light.', 'the spacing is proportional to $\\lambda$, so red fringes are wider.'],
          ['The first dark fringe occurs where the path difference is one full wavelength.', 'it occurs at a path difference of $\\lambda/2$.'],
          ['Covering one slit halves the intensity everywhere but leaves the fringes in place.', 'the fringes disappear altogether.'],
          ['Raising the frequency of the light spreads the fringes apart.', 'higher frequency means shorter wavelength and closer fringes.'],
          ['The center of the pattern is dark because the two waves travel equal distances.', 'equal paths give constructive interference: the center is bright.'],
        ];
        if (R.bool(0.5)) {
          const r = romanPick(R, T, Fz, 'In a Young double-slit experiment, which of the following statements is (are) true?');
          return { q: r.q, choices: r.choices, ans: r.ans, level: 2, expl: 'Bright fringes satisfy $d\\sin\\theta = m\\lambda$ (spacing $\\lambda L/d$ on the screen). ' + r.why };
        }
        const r = conceptPick(R, T, Fz, 'Which of the following statements about a Young double-slit experiment is correct?', 'Which of the following statements about a Young double-slit experiment is NOT correct?');
        return { q: r.q, choices: r.choices, ans: r.ans, expl: 'The answer is the statement shown: ' + r.why };
      },
    },

    // ================================================================ 3.2.2 single-slit diffraction
    {
      id: 'optics.ss.width', sec: '3.2.2', level: 1, weight: 2,
      gen(R) {
        const lam = R.pick([400, 450, 480, 500, 520, 550, 600, 633, 650, 700]);
        const a = R.pick([0.02, 0.025, 0.04, 0.05, 0.08, 0.1, 0.12, 0.15, 0.2, 0.25, 0.3]); // mm
        const L = R.pick([0.5, 1, 1.2, 1.5, 2, 2.5, 3]);
        const y1 = lam * 1e-9 * L / (a * 1e-3) * 1e3; // mm
        const setup = raw`Light of wavelength $${lam}\ \text{nm}$ passes through a single slit of width $${F.num(a, 2)}\ \text{mm}$ and falls on a screen $${F.num(L, 2)}\ \text{m}$ away.`;
        const base = raw`Single-slit minima are at $a\sin\theta = m\lambda$ ($m = \pm1, \pm2, \dots$), so on the screen $y_m \approx m\lambda L/a$, with $\lambda L/a = ${F.num(y1, 3)}\ \text{mm}$ here.`;
        const mode = R.weighted(['width', 'first', 'mmin', 'solveA', 'angle', 'two'], [3, 2, 2, 2, 2, 2]);
        const mm = { unit: raw`\text{mm}`, sig: 3, tol: 0.08 };
        if (mode === 'width') {
          return { q: setup + ' What is the width of the central bright maximum (the distance between the first minima on either side)?', ...GRE.numeric(R, 2 * y1, [y1, 4 * y1, y1 / 2, 2.44 * y1], mm), expl: base + raw` The central maximum spans $-y_1$ to $+y_1$: width $2\lambda L/a = ${F.num(2 * y1, 3)}\ \text{mm}$, twice the width of the other maxima.` };
        }
        if (mode === 'first') {
          return { q: setup + ' How far from the center of the pattern is the first dark fringe?', ...GRE.numeric(R, y1, [2 * y1, y1 / 2, 1.22 * y1, 1.5 * y1], mm), expl: base + raw` The first minimum is at $y_1 = \lambda L/a = ${F.num(y1, 3)}\ \text{mm}$. (The factor 1.22 belongs to a circular aperture, not a slit.)` };
        }
        if (mode === 'mmin') {
          const m = R.int(2, 4);
          return { q: setup + raw` How far from the center of the pattern is the ${ORD[m]} dark fringe on one side?`, ...GRE.numeric(R, m * y1, [(m + 0.5) * y1, (m - 0.5) * y1, 2 * m * y1, (m - 1) * y1, (m + 1) * y1], mm), expl: base + raw` So $y_${m} = ${m}\lambda L/a = ${F.num(m * y1, 3)}\ \text{mm}$. For a single slit the integer condition gives the dark fringes, unlike the double slit.` };
        }
        if (mode === 'solveA') {
          const W = F.round(2 * y1, 2);
          const ar = 2 * lam * 1e-9 * L / (W * 1e-3) * 1e3; // mm
          return {
            q: raw`Light of wavelength $${lam}\ \text{nm}$ passes through a single narrow slit. On a screen $${F.num(L, 2)}\ \text{m}$ away, the central bright maximum is $${F.num(W, 2, true)}\ \text{mm}$ wide. What is the width of the slit?`,
            ...GRE.numeric(R, ar, [ar / 2, 2 * ar, ar * 1.22, ar / 10], { unit: raw`\text{mm}`, sig: 2, tol: 0.1 }),
            level: 2,
            expl: raw`The central maximum has full width $W = 2\lambda L/a$, so $a = 2\lambda L/W \approx ${F.num(ar, 2)}\ \text{mm}$. Using $W = \lambda L/a$ (half-width) gives half the answer.`,
          };
        }
        if (mode === 'angle') {
          const P = R.pick([[2, 30], [5 / 3, 37], [5 / 4, 53], [4 / 3, 49], [10 / 3, 17], [4, 14]]);
          const r = P[0];
          const l2 = R.pick([400, 450, 500, 600]);
          const aa = r * l2; // nm
          if (!isInt(aa)) throw new Error('non-integer slit');
          const aTxt = raw`$${F.num(aa / 1000, 4)}\ \mu\text{m}$`;
          const th = asinD(1 / r);
          const wr = [asinD(1 / (2 * r)), 1 / r * 2 <= 1 ? asinD(2 / r) : 90, acosD(1 / r), 2 * th <= 90 ? 2 * th : null].filter(x => x != null);
          return {
            q: raw`Light of wavelength $${l2}\ \text{nm}$ is incident on a slit of width ${aTxt}. The first diffraction minimum is at an angle from the central axis closest to`,
            ...GRE.numeric(R, th, wr, degOpt(th, 0.08)),
            level: 2,
            expl: raw`$\sin\theta_1 = \lambda/a = ${l2}/${F.num(aa, 4)} \approx ${F.num(1 / r, 3)}$, so $\theta_1 \approx ${degs(th)}$. Note that this is a large angle, so no small-angle approximation is used.`,
          };
        }
        const [l1, l2] = R.pick([[400, 500], [400, 600], [450, 600], [500, 650], [400, 700], [480, 640], [500, 600], [550, 700]]);
        const dd = (l2 - l1) * 1e-9 * L / (a * 1e-3) * 1e3;
        return {
          q: raw`Light containing two wavelengths, $${l1}\ \text{nm}$ and $${l2}\ \text{nm}$, passes through a single slit of width $${F.num(a, 2)}\ \text{mm}$ onto a screen $${F.num(L, 2)}\ \text{m}$ away. How far apart on the screen are the first diffraction minima of the two wavelengths (on the same side of the center)?`,
          ...GRE.numeric(R, dd, [2 * dd, dd / 2, (l1 + l2) * 1e-9 * L / (a * 1e-3) * 1e3, l2 * 1e-9 * L / (a * 1e-3) * 1e3], mm),
          level: 2,
          expl: raw`Each first minimum is at $y_1 = \lambda L/a$, so the separation is $(\lambda_2 - \lambda_1)L/a = (${l2 - l1}\times10^{-9})(${F.num(L, 2)})/(${F.num(a, 2)}\times10^{-3})\ \text{m} = ${F.num(dd, 3)}\ \text{mm}$.`,
        };
      },
    },
    {
      id: 'optics.ss.scaling', sec: '3.2.2', level: 2,
      gen(R) {
        if (R.bool(0.4)) {
          const T = [
            ['Narrowing the slit makes the central maximum wider.', 'its half-angle obeys $\\sin\\theta_1 = \\lambda/a$.'],
            ['If the slit is narrower than the wavelength, there are no diffraction minima at all.', '$a\\sin\\theta = \\lambda$ has no solution when $a < \\lambda$.'],
            ['The central maximum is about twice as wide as each of the other bright maxima.', 'adjacent minima are $\\lambda L/a$ apart except across the center, where the gap is $2\\lambda L/a$.'],
            ['Longer wavelengths are diffracted through larger angles.', '$\\sin\\theta_m = m\\lambda/a$.'],
            ['The side maxima are much dimmer than the central maximum.', 'the first side maximum has under 5% of the central intensity.'],
            ['For a slit much wider than the wavelength, the pattern approaches the geometric shadow of the slit.', 'all minima crowd toward $\\theta = 0$.'],
          ];
          const Fz = [
            ['The first dark fringe occurs where $a\\sin\\theta = \\lambda/2$.', 'the first single-slit minimum is at $a\\sin\\theta = \\lambda$.'],
            ['Narrowing the slit makes the central maximum narrower.', 'a narrower slit spreads the light more.'],
            ['There is a dark fringe at the center of the pattern ($m = 0$).', 'the center is the brightest point.'],
            ['All the bright maxima have the same width and brightness.', 'the central maximum is twice as wide and far brighter.'],
            ['Immersing the apparatus in water widens the central maximum.', 'the wavelength in water is shorter, so the pattern shrinks.'],
            ['Red light gives a narrower central maximum than blue light.', 'the width is proportional to $\\lambda$, so red is wider.'],
          ];
          const r = romanPick(R, T, Fz, 'Monochromatic light passes through a single narrow slit of width $a$. Which of the following statements about the diffraction pattern on a distant screen is (are) true?');
          return { q: r.q, choices: r.choices, ans: r.ans, expl: 'Minima satisfy $a\\sin\\theta = m\\lambda$ with $m = \\pm1, \\pm2, \\dots$. ' + r.why };
        }
        const LIQ = [['water ($n = 4/3$)', 4 / 3], ['a liquid with $n = 3/2$', 3 / 2], ['a liquid with $n = 5/4$', 5 / 4]];
        const types = R.shuffle(['a', 'lam', 'n', 'L']);
        const nCh = R.weighted([1, 2], [2, 3]);
        const angular = R.bool(0.3);
        let f = 1, nL = 1, lF = 1, aF = 1;
        const txt = [], why = [];
        let lamPair = null;
        for (const t of types.slice(0, nCh)) {
          if (t === 'a') { const [k, w] = R.pick(SCALE); aF = k; f /= k; txt.push(`the slit width is ${w}`); why.push(`width $\\propto 1/a$ (factor $${ex(1 / k)}$)`); }
          if (t === 'lam') { lamPair = R.pick([[600, 400], [400, 600], [450, 600], [600, 450], [500, 400], [400, 500], [700, 350]]); f *= lamPair[1] / lamPair[0]; txt.push(`the light is changed to wavelength $${lamPair[1]}\\ \\text{nm}$`); why.push(`width $\\propto \\lambda$ (factor $${ex(lamPair[1] / lamPair[0])}$)`); }
          if (t === 'n') { const [nm, n] = R.pick(LIQ); nL = n; f /= n; txt.push(`the apparatus is submerged in ${nm}`); why.push(`the wavelength becomes $\\lambda/n$ (factor $${ex(1 / n)}$)`); }
          if (t === 'L') { const [k, w] = R.pick(SCALE); lF = k; if (!angular) f *= k; txt.push(`the screen distance is ${w}`); why.push(angular ? 'the angular width does not depend on the screen distance' : `width $\\propto L$ (factor $${ex(k)}$)`); }
        }
        const join = a => a.length === 1 ? a[0] : a.join(' and ');
        const qty = angular ? 'the angular width of the central maximum' : 'the width of the central maximum on the screen';
        const fmt = x => { if (Math.abs(x - 1) < 1e-9) return 'It is unchanged.'; const e = F.exact(x); return e == null ? null : `It is multiplied by $${e}$.`; };
        return {
          q: `Light of wavelength ${lamPair ? `$${lamPair[0]}\\ \\text{nm}$` : '$\\lambda$'} passes through a single slit onto a distant screen. Then ${join(txt)}. By what factor does ${qty} change?`,
          ...mcv(R, f, [1 / f, f * nL * nL, f * nL, angular ? f * lF : f / lF, f * aF * aF, 1, 2 * f, f / 2], fmt),
          expl: `The central maximum extends to $\\sin\\theta_1 = \\lambda/a$, so its angular width $\\propto \\lambda/a$ and its width on the screen $\\propto \\lambda L/a$. Here: ${join(why)}; overall factor $${ex(f)}$.`,
        };
      },
    },
    {
      id: 'optics.ss.count', sec: '3.2.2', level: 3,
      gen(R) {
        const a = R.pick([0.02, 0.025, 0.03, 0.04, 0.05, 0.06, 0.08, 0.1]); // mm
        const r = R.pick([2, 3, 4, 5, 6, 2.5, 3.5, 4.5, 5.5]);
        const d = a * r;
        const integer = isInt(r);
        const mode = R.weighted(['count', 'missing', 'between'], integer ? [3, 2, 2] : [3, 0, 2]);
        const setup = raw`Monochromatic light falls on two slits, each of width $${F.num(a, 2)}\ \text{mm}$, whose centers are $${F.num(d, 4)}\ \text{mm}$ apart.`;
        const ints = x => `$${x}$`;
        if (mode === 'count') {
          const corr = integer ? 2 * r - 1 : 2 * Math.floor(r) + 1;
          const wr = integer ? [2 * r + 1, 2 * r, r, r - 1, 2 * r - 3] : [2 * Math.floor(r) - 1, 2 * Math.ceil(r) + 1, 2 * Math.floor(r), Math.floor(r), 2 * Math.ceil(r)];
          return {
            q: setup + ' How many bright interference fringes lie within the central maximum of the single-slit diffraction envelope?',
            ...mcv(R, corr, wr, ints),
            expl: raw`Interference maxima: $d\sin\theta = m\lambda$; the envelope's first minima: $a\sin\theta = \lambda$. Fringes inside the central envelope have $|m| < d/a = ${F.num(r, 2)}$${integer ? `, and $m = \\pm${r}$ falls exactly on the diffraction minimum (missing order)` : ''}. So $m = 0, \pm1, \dots, \pm${integer ? r - 1 : Math.floor(r)}$: ${corr} fringes.`,
          };
        }
        if (mode === 'missing') {
          return {
            q: setup + ' Which is the lowest-order interference maximum (other than $m = 0$) that is missing from the pattern?',
            ...mcv(R, r, [r - 1, r + 1, 2 * r, r / 2, 1, r * r].filter(x => isInt(x) && x >= 1), x => `$m = ${x}$`),
            expl: raw`An interference maximum is missing when it coincides with a diffraction minimum: $d\sin\theta = m\lambda$ and $a\sin\theta = \lambda$ give $m = d/a = ${r}$.`,
          };
        }
        const corr = Math.ceil(2 * r - 1e-9) - Math.floor(r + 1e-9) - 1;
        return {
          q: setup + ' How many bright interference fringes appear between the first and second diffraction minima on one side of the center?',
          ...mcv(R, corr, [corr + 1, corr - 1, corr + 2, Math.ceil(r), Math.floor(r), 2 * corr].filter(x => x >= 0), ints),
          expl: raw`Diffraction minima at $\sin\theta = \lambda/a$ and $2\lambda/a$ correspond to interference orders $m = d/a = ${F.num(r, 2)}$ and $2d/a = ${F.num(2 * r, 2)}$. The fringes strictly between have $m = ${Math.floor(r + 1e-9) + 1}, \dots, ${Math.ceil(2 * r - 1e-9) - 1}$: ${corr} fringes${integer ? ' (the orders on the minima themselves are missing)' : ''}.`,
        };
      },
    },

    // ================================================================ 3.2.3 optical path length
    {
      id: 'optics.opl.plate', sec: '3.2.3', level: 2,
      gen(R) {
        for (let tries = 0; tries < 200; tries++) {
          const n = R.pick([1.2, 1.25, 1.4, 1.5, 1.6, 1.75]);
          const lam = R.pick([400, 450, 480, 500, 540, 560, 600, 640, 700]);
          const N = R.int(1, 12);
          const t = N * lam / (n - 1); // nm
          const tu = t / 1000;
          if (Math.abs(F.round(tu, 3) - tu) > 1e-9 || tu > 40) continue;
          const mode = R.weighted(['N', 't', 'n'], [3, 2, 2]);
          const setup = raw`In a double-slit experiment with light of wavelength $${lam}\ \text{nm}$, one slit is covered by a thin transparent film`;
          const base = raw`The film adds an optical path $(n-1)t$ relative to the same thickness of air, so the pattern shifts by $N = (n-1)t/\lambda$ fringes, toward the covered slit (the zero-path-difference point moves to where the geometric path from that slit is shorter).`;
          if (mode === 'N') {
            const dirAsk = R.bool(0.4);
            if (dirAsk) {
              const s = (k, dir) => `${k} fringe${k === 1 ? '' : 's'}, ${dir}`;
              const T = 'toward the covered slit', A = 'away from the covered slit';
              const k2 = Math.round(n * t / lam);
              const wr = [s(N, A), s(k2, T), s(k2, A), s(2 * N, T), s(2 * N, A), N % 2 === 0 ? s(N / 2, T) : null].filter(Boolean);
              return {
                q: setup + raw` of thickness $${F.num(tu, 3)}\ \mu\text{m}$ and index of refraction $${n}$. How does the interference pattern shift?`,
                ...GRE.mc(R, s(N, T), wr, { keep: 1 }),
                expl: base + raw` Here $N = (${n} - 1)(${F.num(t, 4)})/${lam} = ${N}$.`,
              };
            }
            return {
              q: setup + raw` of thickness $${F.num(tu, 3)}\ \mu\text{m}$ and index of refraction $${n}$. By how many fringes does the pattern shift?`,
              ...GRE.numeric(R, N, [n * t / lam, t / lam, N / 2, 2 * N], { sig: 3, tol: 0.08 }),
              expl: base + raw` Here $N = (${n} - 1)(${F.num(t, 4)}\ \text{nm})/(${lam}\ \text{nm}) = ${N}$. Using $nt$ instead of $(n-1)t$ ignores the air the film displaced.`,
            };
          }
          if (mode === 't') {
            return {
              q: setup + raw` of index of refraction $${n}$. The central bright fringe moves to the position previously occupied by the ${ORD[N] || N + 'th'}-order bright fringe. What is the thickness of the film?`,
              ...GRE.numeric(R, tu, [N * lam / n / 1000, N * lam / (2 * (n - 1)) / 1000, N * lam / 1000, 2 * tu], { unit: raw`\mu\text{m}`, sig: 3, tol: 0.08 }),
              expl: base + raw` Setting $(n-1)t = ${N}\lambda$ gives $t = ${N}(${lam}\ \text{nm})/${F.num(n - 1, 2)} = ${F.num(tu, 3)}\ \mu\text{m}$.`,
            };
          }
          return {
            q: setup + raw` of thickness $${F.num(tu, 3)}\ \mu\text{m}$, and the pattern shifts by exactly ${N} fringe${N === 1 ? '' : 's'}. What is the index of refraction of the film?`,
            ...GRE.numeric(R, n, [n - 1, 1 + (n - 1) / 2, 1 + 2 * (n - 1), n + 1], { sig: 3, tol: 0.05 }),
            expl: base + raw` So $n = 1 + N\lambda/t = 1 + ${N}(${lam})/${F.num(t, 4)} = ${n}$. Forgetting the 1 gives $n - 1$.`,
          };
        }
        throw new Error('no nice film');
      },
    },
    {
      id: 'optics.opl.phase', sec: '3.2.3', level: 2,
      gen(R) {
        const mode = R.weighted(['phase', 'min', 'delay', 'gas', 'sum'], [2, 2, 2, 2, 2]);
        if (mode === 'phase') {
          for (let tries = 0; tries < 200; tries++) {
            const n = R.pick([1.25, 1.4, 1.5, 1.6, 1.75, 2.0]);
            const lam = R.pick([400, 500, 600, 640, 700, 450, 480]);
            const L = R.pick([0.5, 1, 1.2, 1.5, 2, 2.4, 3, 4, 5, 6]); // micrometers
            const k = 2 * (n - 1) * L * 1000 / lam; // phase / pi
            if (!isInt(2 * k) || k < 0.5 || k > 30) continue;
            const fm = x => { const e = F.exact(x, 4); if (e == null) return null; return `$${e === '1' ? '' : e}\\pi$`; };
            return {
              q: raw`Two beams of light of vacuum wavelength $${lam}\ \text{nm}$ start in phase. One passes through a glass plate of thickness $${F.num(L, 3)}\ \mu\text{m}$ and index of refraction $${n}$; the other travels the same distance in air ($n = 1$). What is the phase difference between the beams when they emerge?`,
              ...mcv(R, k, [2 * n * L * 1000 / lam, k / 2, 2 * k, 2 * (n - 1) * L * 1000 / (n * lam), k + 1].filter(x => isInt(4 * x)), fm),
              expl: raw`The optical path difference is $(n - 1)L = ${F.num((n - 1) * L * 1000, 4)}\ \text{nm}$, so $\Delta\phi = 2\pi(n-1)L/\lambda = ${piF(Math.round(2 * k), 2)}$. Using $nL$ forgets that the other beam also travels through a distance $L$.`,
            };
          }
          throw new Error('no nice phase');
        }
        if (mode === 'min') {
          const n = R.pick([1.25, 1.4, 1.5, 1.6, 1.75, 2.0]);
          const lam = R.pick([400, 450, 480, 500, 540, 600, 640, 700]);
          const destr = R.bool(0.65);
          const t = destr ? lam / (2 * (n - 1)) : lam / (n - 1);
          return {
            q: raw`Two coherent beams of vacuum wavelength $${lam}\ \text{nm}$ arrive in phase at a detector. A thin glass sheet of index $${n}$ is inserted, at normal incidence, into one beam only. What is the minimum thickness of the sheet that makes the beams arrive ${destr ? 'exactly out of phase' : 'in phase again'}?`,
            ...GRE.numeric(R, t, destr ? [lam / (2 * n), lam / (4 * (n - 1)), lam / (n - 1), lam / 2] : [lam / n, lam / (2 * (n - 1)), lam, 2 * lam / (n - 1)], { unit: raw`\text{nm}`, sig: 3, tol: 0.08 }),
            expl: raw`The sheet adds optical path $(n-1)t$. ${destr ? 'Destructive interference needs $(n-1)t = \\lambda/2$' : 'Being back in phase needs $(n-1)t = \\lambda$'}, so $t = ${destr ? '\\lambda/[2(n-1)]' : '\\lambda/(n-1)'} = ${F.num(t, 3)}\ \text{nm}$.`,
          };
        }
        if (mode === 'delay') {
          const n = R.pick([1.33, 1.4, 1.46, 1.5, 1.6]);
          const Lc = R.pick([[1, 'cm', 0.01], [3, 'cm', 0.03], [10, 'cm', 0.1], [1, 'm', 1], [3, 'm', 3], [30, 'cm', 0.3]]);
          const dt = (n - 1) * Lc[2] / C.c;
          return {
            q: raw`Two light pulses leave a source at the same instant and travel the same distance, $${Lc[0]}\ \text{${Lc[1]}}$. One travels through vacuum and the other through a medium with index of refraction $${n}$. By how much does the second pulse lag the first?`,
            ...GRE.numeric(R, dt, [n * Lc[2] / C.c, Lc[2] / C.c, Lc[2] / (n * C.c), dt / 2], { unit: raw`\text{s}`, fmt: x => F.sci(x, 2), tol: 0.08 }),
            expl: raw`Time $= $ optical path$/c$: $\Delta t = (n - 1)L/c = ${F.num(n - 1, 2)}\times${F.num(Lc[2], 2)}\ \text{m}/(3\times10^8\ \text{m/s}) \approx ${F.sci(dt, 2)}\ \text{s}$.`,
          };
        }
        if (mode === 'gas') {
          const mich = R.bool();
          const L = R.pick([2, 3, 4, 5, 6, 8, 10]); // cm
          const lam = R.pick([500, 546, 589, 600, 633]);
          const N = R.pick([20, 24, 30, 36, 40, 45, 50, 60, 80, 100]);
          const nm1 = N * lam * 1e-9 / ((mich ? 2 : 1) * L * 1e-2);
          return {
            q: raw`A gas cell of length $${L}\ \text{cm}$ sits in one arm of ${mich ? 'a Michelson interferometer, so the light passes through the cell twice (once in each direction)' : 'a Mach–Zehnder interferometer, so the light passes through the cell once'}. As the cell is slowly filled from vacuum to atmospheric pressure, ${N} fringes of $${lam}\ \text{nm}$ light pass a reference mark. What is $n - 1$ for the gas at atmospheric pressure?`,
            ...GRE.numeric(R, nm1, [nm1 * (mich ? 2 : 0.5), nm1 / 2 * (mich ? 1 : 0.5), 1 + nm1, nm1 * 10], { fmt: x => F.sci(x, 2), tol: 0.1 }),
            level: 3,
            expl: raw`Each fringe is one wavelength of optical path. The optical path changes by $${mich ? '2(n - 1)L' : '(n - 1)L'}$, so $n - 1 = ${mich ? 'N\\lambda/2L' : 'N\\lambda/L'} = ${N}(${lam}\times10^{-9})/(${mich ? 2 * L : L}\times10^{-2}) \approx ${F.sci(nm1, 2)}$.`,
          };
        }
        const A = R.pick([['glass', 1.5], ['crown glass', 1.52], ['flint glass', 1.65], ['diamond', 2.42]]);
        const B = R.pick([['water', 1.33], ['oil', 1.47], ['ethanol', 1.36], ['air', 1.0]]);
        const d1 = R.pick([1, 2, 3, 4, 5]), d2 = R.pick([1, 2, 3, 4, 6]);
        const opl = A[1] * d1 + B[1] * d2;
        return {
          q: raw`A light ray passes, at normal incidence, through $${d1}\ \text{cm}$ of ${A[0]} ($n = ${A[1]}$) and then $${d2}\ \text{cm}$ of ${B[0]} ($n = ${B[1]}$). What is the total optical path length?`,
          ...GRE.numeric(R, opl, [d1 + d2, d1 / A[1] + d2 / B[1], (A[1] + B[1]) / 2 * (d1 + d2) === opl ? null : (A[1] + B[1]) / 2 * (d1 + d2), A[1] * B[1] * (d1 + d2)].filter(x => x != null), { unit: raw`\text{cm}`, sig: 3, tol: 0.05 }),
          level: 1,
          expl: raw`Optical path length $= \sum n_i d_i = ${A[1]}(${d1}) + ${B[1]}(${d2}) = ${F.num(opl, 4)}\ \text{cm}$: the vacuum distance light would cover in the same time.`,
        };
      },
    },

    // ================================================================ 3.2.4 thin films
    {
      id: 'optics.film.minthick', sec: '3.2.4', level: 2, weight: 3,
      gen(R) {
        const FILMS = [
          { d: 'a soap film (index of refraction $1.33$) surrounded by air', n1: 1, nf: 1.33, n2: 1 },
          { d: 'a soap film (index of refraction $1.40$) surrounded by air', n1: 1, nf: 1.40, n2: 1 },
          { d: 'a thin film of oil (index of refraction $1.45$) floating on water ($n = 1.33$), viewed from above', n1: 1, nf: 1.45, n2: 1.33 },
          { d: 'a thin film of oil (index of refraction $1.50$) floating on water ($n = 1.33$), viewed from above', n1: 1, nf: 1.5, n2: 1.33 },
          { d: 'a thin layer of oil (index of refraction $1.25$) floating on water ($n = 1.33$), viewed from above', n1: 1, nf: 1.25, n2: 1.33 },
          { d: 'a magnesium fluoride coating (index of refraction $1.38$) on a glass lens ($n = 1.50$), in air', n1: 1, nf: 1.38, n2: 1.5 },
          { d: 'a transparent coating of index $1.25$ on glass of index $1.50$, in air', n1: 1, nf: 1.25, n2: 1.5 },
          { d: 'a transparent coating of index $2.00$ on glass of index $1.50$, in air', n1: 1, nf: 2.0, n2: 1.5 },
          { d: 'a thin layer of water ($n = 1.33$) on a flat glass plate ($n = 1.50$), in air', n1: 1, nf: 1.33, n2: 1.5 },
          { d: 'a thin glass plate (index of refraction $1.50$) immersed in water ($n = 1.33$)', n1: 1.33, nf: 1.5, n2: 1.33 },
          { d: 'a thin air gap ($n = 1.00$) between two glass plates ($n = 1.50$), viewed through the top plate', n1: 1.5, nf: 1.0, n2: 1.5 },
          { d: 'a thin film of index $1.60$ deposited on a substrate of index $1.40$, in air', n1: 1, nf: 1.6, n2: 1.4 },
        ];
        const Fm = R.pick(FILMS);
        const lam = R.pick([400, 420, 450, 480, 500, 520, 550, 560, 580, 600, 640, 650, 700]);
        const s = (Fm.nf > Fm.n1 ? 1 : 0) + (Fm.n2 > Fm.nf ? 1 : 0);
        const half = s === 1;
        const want = R.pick(['bright', 'dark', 'trans']);
        const constructive = want === 'bright';
        const second = R.bool(0.25);
        const k = second ? 2 : 1;
        // reflection constructive: half ? (k-1/2) : k ; destructive: half ? k : (k-1/2)   [in units of lam/(2 nf)]
        const useHalfInt = constructive ? half : !half;
        const mult = useHalfInt ? k - 0.5 : k;
        const t = mult * lam / (2 * Fm.nf);
        const other = useHalfInt ? k : k - 0.5;
        const wr = [other * lam / (2 * Fm.nf), (useHalfInt ? (second ? 0.5 : 1.5) : (second ? 1 : 2)) * lam / (2 * Fm.nf), mult * lam / 2, Fm.n2 !== 1 && Fm.n2 !== Fm.nf ? mult * lam / (2 * Fm.n2) : null, mult * lam / (4 * Fm.nf)].filter(x => x != null);
        const goal = { bright: 'strongly reflects', dark: 'reflects as little as possible of', trans: 'transmits as much as possible of' }[want];
        const shifts = `Reflection from a higher index gives a phase shift of $\\pi$: the top surface (${F.num(Fm.n1, 3)} → ${F.num(Fm.nf, 3)}) ${Fm.nf > Fm.n1 ? 'does' : 'does not'} and the bottom surface (${F.num(Fm.nf, 3)} → ${F.num(Fm.n2, 3)}) ${Fm.n2 > Fm.nf ? 'does' : 'does not'}, so the net reflection phase difference is ${half ? '$\\pi$' : 'zero'}.`;
        const cond = useHalfInt ? `2n_ft = (m - \\tfrac12)\\lambda` : `2n_ft = m\\lambda`;
        return {
          q: raw`Light of vacuum wavelength $${lam}\ \text{nm}$ falls at normal incidence on ${Fm.d}. What is the ${second ? 'second-smallest' : 'smallest'} nonzero film thickness for which the film ${goal} this light?`,
          ...GRE.numeric(R, t, wr, { unit: raw`\text{nm}`, sig: 3, tol: 0.07 }),
          level: second || Fm.n1 !== 1 ? 3 : 2,
          expl: raw`${shifts} ${want === 'trans' ? 'Maximum transmission means minimum reflection. ' : ''}The required condition is $${cond}$ ($m = 1, 2, \dots$), so $t = ${F.num(mult, 2)}\lambda/(2n_f) = ${F.num(mult, 2)}(${lam})/(2\times${F.num(Fm.nf, 3)}) \approx ${F.num(t, 3)}\ \text{nm}$.`,
        };
      },
    },
    {
      id: 'optics.film.which', sec: '3.2.4', level: 3,
      gen(R) {
        const FILMS = [
          { d: 'a soap film of index $1.33$ in air', n1: 1, nf: 1.33, n2: 1 },
          { d: 'a soap film of index $1.40$ in air', n1: 1, nf: 1.4, n2: 1 },
          { d: 'a film of oil (index $1.50$) on water (index $1.33$)', n1: 1, nf: 1.5, n2: 1.33 },
          { d: 'a coating of index $1.25$ on glass of index $1.50$', n1: 1, nf: 1.25, n2: 1.5 },
          { d: 'a coating of index $1.38$ on glass of index $1.52$', n1: 1, nf: 1.38, n2: 1.52 },
          { d: 'a coating of index $2.00$ on glass of index $1.50$', n1: 1, nf: 2.0, n2: 1.5 },
          { d: 'a layer of water (index $1.33$) on glass of index $1.50$', n1: 1, nf: 1.33, n2: 1.5 },
          { d: 'a film of index $1.60$ suspended in air', n1: 1, nf: 1.6, n2: 1 },
        ];
        for (let tries = 0; tries < 100; tries++) {
          const Fm = R.pick(FILMS);
          const t = R.pick([200, 250, 300, 350, 400, 450, 500, 600, 700, 750, 800, 900, 1000, 1200]);
          const half = ((Fm.nf > Fm.n1 ? 1 : 0) + (Fm.n2 > Fm.nf ? 1 : 0)) === 1;
          const bright = R.bool();
          const useHalfInt = bright ? half : !half;
          const opl2 = 2 * Fm.nf * t;
          const allowed = [], opposite = [];
          for (let m = 1; m <= 60; m++) {
            allowed.push(useHalfInt ? opl2 / (m - 0.5) : opl2 / m);
            opposite.push(useHalfInt ? opl2 / m : opl2 / (m - 0.5));
          }
          const vis = allowed.filter(x => x >= 400 && x <= 700);
          if (!vis.length) continue;
          const corr = R.pick(vis);
          const far = (x, list, tol) => list.every(y => Math.abs(x - y) > tol * y);
          const cands = opposite.filter(x => x >= 400 && x <= 700).concat(R.shuffle([400, 410, 420, 430, 440, 450, 460, 470, 480, 490, 500, 510, 520, 530, 540, 550, 560, 570, 580, 590, 600, 610, 620, 630, 640, 650, 660, 670, 680, 690, 700]));
          const picked = [];
          for (const c of cands) {
            const cr = Math.round(c);
            if (!far(cr, allowed, 0.03)) continue;
            if (!far(cr, picked.concat([corr]), 0.03)) continue;
            picked.push(cr);
            if (picked.length === 6) break;
          }
          if (picked.length < 4) continue;
          const m = allowed.indexOf(corr) + 1;
          const cs = Math.round(corr);
          const ch = mcv(R, cs, picked, x => `$${x}\\ \\text{nm}$`);
          return {
            q: raw`White light falls at normal incidence on ${Fm.d}; the film is $${t}\ \text{nm}$ thick. Which of the following vacuum wavelengths is ${bright ? 'most strongly reflected' : 'missing from (strongly suppressed in) the reflected light'}?`,
            ...ch,
            expl: raw`The two reflections ${half ? 'differ by a phase shift of $\\pi$' : 'have the same phase shift'}, so ${bright ? 'constructive' : 'destructive'} interference needs $2n_ft = ${useHalfInt ? '(m - \\tfrac12)\\lambda' : 'm\\lambda'}$. With $2n_ft = ${F.num(opl2, 4)}\ \text{nm}$, $m = ${m}$ gives $\lambda \approx ${cs}\ \text{nm}$; none of the other choices satisfies the condition for any integer $m$.`,
          };
        }
        throw new Error('no film wavelength');
      },
    },
    {
      id: 'optics.film.wedge', sec: '3.2.4', level: 2,
      gen(R) {
        const mode = R.weighted(['spacing', 'diam', 'count', 'newton'], [3, 2, 2, 2]);
        const lam = R.pick([450, 500, 546, 589, 600, 633, 650]);
        if (mode === 'newton') {
          const Rr = R.pick([0.5, 1, 1.5, 2, 3, 4, 5]); // m
          const m = R.int(1, 10);
          const r = Math.sqrt(m * lam * 1e-9 * Rr) * 1e3; // mm
          return {
            q: raw`A plano-convex lens with radius of curvature $${F.num(Rr, 2)}\ \text{m}$ rests on a flat glass plate and is illuminated from above with light of wavelength $${lam}\ \text{nm}$. Viewed in reflection, the center is dark and is surrounded by alternating bright and dark rings (Newton’s rings). What is the radius of the ${ORD[m]} dark ring, not counting the central dark spot?`,
            ...GRE.numeric(R, r, [Math.sqrt((m - 0.5) * lam * 1e-9 * Rr) * 1e3, Math.sqrt(2 * m * lam * 1e-9 * Rr) * 1e3, Math.sqrt(m * lam * 1e-9 * Rr / 2) * 1e3, m * lam * 1e-9 * Rr * 1e3 * 1e3].filter(x => x > 0), { unit: raw`\text{mm}`, sig: 2, tol: 0.1 }),
            level: 3,
            expl: raw`The air gap at radius $r$ is $t \approx r^2/2R$. The reflection off the lower (glass) surface adds a phase shift $\pi$, so dark rings need $2t = m\lambda$, i.e. $r_m = \sqrt{m\lambda R} = \sqrt{${m}(${lam}\times10^{-9})(${F.num(Rr, 2)})} \approx ${F.num(r, 2)}\ \text{mm}$.`,
          };
        }
        const L = R.pick([5, 8, 10, 12, 15, 20]); // cm
        const D = R.pick([10, 20, 25, 30, 40, 50, 60, 80, 100]); // micrometers
        const liq = R.bool(0.25) ? R.pick([['water', 1.33], ['a liquid', 1.4]]) : null;
        const n = liq ? liq[1] : 1;
        const dx = lam * 1e-9 * L * 1e-2 / (2 * n * D * 1e-6) * 1e3; // mm
        const setup = raw`Two flat glass plates of length $${L}\ \text{cm}$ touch along one edge and are separated by a thin wire of diameter $${D}\ \mu\text{m}$ at the opposite edge, forming a thin wedge${liq ? ` that is filled with ${liq[0]} ($n = ${liq[1]}$)` : ' of air'}. The wedge is illuminated from above at normal incidence with light of wavelength $${lam}\ \text{nm}$ and viewed in reflection.`;
        const base = raw`The film thickness grows linearly, $t = Dx/L$; successive dark fringes differ in $2nt$ by one wavelength, so the spacing is $\Delta x = \lambda L/(2nD)$.`;
        if (mode === 'spacing') {
          return {
            q: setup + ' What is the spacing between adjacent dark fringes?',
            ...GRE.numeric(R, dx, [2 * dx, dx / 2, liq ? dx * n : dx * 4, liq ? dx * n * n : dx / 4], { unit: raw`\text{mm}`, sig: 3, tol: 0.1 }),
            expl: base + raw` Here $\Delta x = (${lam}\times10^{-9})(${L}\times10^{-2})/(2\times${n}\times${D}\times10^{-6})\ \text{m} \approx ${F.num(dx, 3)}\ \text{mm}$.`,
          };
        }
        if (mode === 'count') {
          const Nf = 2 * n * D * 1000 / lam;
          return {
            q: setup + ' Approximately how many dark fringes are seen across the wedge?',
            ...GRE.numeric(R, Nf, [Nf / 2, 2 * Nf, Nf / 4, liq ? Nf / n : 4 * Nf], { sig: 2, tol: 0.15 }),
            expl: raw`Each dark fringe corresponds to a change of $\lambda$ in the round-trip optical path $2nt$. Across the wedge $2nt$ goes from 0 to $2nD = ${F.num(2 * n * D * 1000, 4)}\ \text{nm}$, so there are about $2nD/\lambda \approx ${F.num(Nf, 2)}$ dark fringes.`,
          };
        }
        const per = R.pick([4, 5, 8, 10, 12, 16, 20]); // dark fringes per cm
        const Dm = lam * 1e-9 * L * 1e-2 * per / (2 * n * 1e-2) * 1e6; // micrometers
        return {
          q: raw`Two flat glass plates of length $${L}\ \text{cm}$ touch along one edge and are separated by a thin spacer at the other edge, forming a thin wedge${liq ? ` filled with ${liq[0]} ($n = ${liq[1]}$)` : ' of air'}. Under normal illumination with light of wavelength $${lam}\ \text{nm}$, the reflected light shows ${per} dark fringes per centimeter. What is the thickness of the spacer?`,
          ...GRE.numeric(R, Dm, [2 * Dm, Dm / 2, liq ? Dm * n : 4 * Dm, liq ? Dm * n * n : Dm / 4], { unit: raw`\mu\text{m}`, sig: 2, tol: 0.1 }),
          level: 3,
          expl: base + raw` With $\Delta x = 1/${per}\ \text{cm}$, $D = \lambda L/(2n\,\Delta x) = (${lam}\times10^{-9})(${L}\times10^{-2})(${per})/(2\times${n}\times10^{-2})\ \text{m} \approx ${F.num(Dm, 2)}\ \mu\text{m}$.`,
        };
      },
    },
    {
      id: 'optics.film.concept', sec: '3.2.4', level: 2,
      gen(R) {
        const T = [
          ['A soap film in air that is much thinner than the wavelength looks dark in reflected light.', 'only one of the two reflections has a $\\pi$ phase shift, so as $t \\to 0$ they cancel.'],
          ['An antireflection coating whose index lies between those of air and glass works best when its thickness is $\\lambda/(4n_{\\text{coating}})$.', 'both reflections then have a $\\pi$ shift and the round trip adds $\\lambda/2$.'],
          ['Light reflecting from a medium of higher index of refraction undergoes a phase shift of $\\pi$.', 'this is the hard-boundary case.'],
          ['The center of a Newton’s-ring pattern, viewed in reflection, is dark.', 'the air gap vanishes there and only the lower reflection has a $\\pi$ shift.'],
          ['The colors of an oil slick arise because the condition for constructive interference depends on wavelength and thickness.', 'different thicknesses reinforce different colors.'],
          ['For a non-absorbing film, a wavelength that is suppressed in reflection is enhanced in transmission.', 'energy is conserved.'],
        ];
        const Fz = [
          ['Light reflecting from a medium of lower index of refraction undergoes a phase shift of $\\pi$.', 'there is no phase shift in that case.'],
          ['A film of thickness $\\lambda/(2n)$ with air on both sides strongly reflects light of vacuum wavelength $\\lambda$.', 'with one $\\pi$ shift, a round trip of one wavelength gives destructive interference.'],
          ['A quarter-wave coating whose index is larger than the glass’s reduces reflection from the glass.', 'with only one $\\pi$ shift the quarter-wave round trip makes the reflections add, increasing reflection.'],
          ['The thinnest soap film in air that strongly reflects light of vacuum wavelength $\\lambda$ has thickness $\\lambda/(2n)$.', 'it is $\\lambda/(4n)$ because of the single $\\pi$ shift.'],
          ['The light reflected from the back surface of a film picks up an extra path of one film thickness.', 'it crosses the film twice, an extra optical path of $2nt$.'],
          ['A soap film in air that is much thinner than the wavelength looks bright white in reflected light.', 'it looks dark: the two reflections cancel.'],
        ];
        if (R.bool(0.55)) {
          const r = romanPick(R, T, Fz, 'Which of the following statements about thin-film interference at normal incidence is (are) true?');
          return { q: r.q, choices: r.choices, ans: r.ans, expl: 'Count the $\\pi$ phase shifts (one for each reflection off a higher index) and add the round-trip path $2nt$. ' + r.why };
        }
        const r = conceptPick(R, T, Fz, 'Which of the following statements about thin-film interference is correct?', 'Which of the following statements about thin-film interference is NOT correct?');
        return { q: r.q, choices: r.choices, ans: r.ans, expl: 'The answer is the statement shown: ' + r.why };
      },
    },

    // ================================================================ 3.2.5 gratings, resolution, Bragg
    {
      id: 'optics.grating.angle', sec: '3.2.5', level: 2, weight: 2,
      gen(R) {
        const mode = R.weighted(['angle', 'maxorder', 'lines', 'overlap'], [3, 2, 2, 2]);
        if (mode === 'overlap') {
          for (let tries = 0; tries < 100; tries++) {
            const lam = R.pick([400, 420, 450, 480, 500, 540, 600, 630, 640, 660, 700]);
            const m = R.int(1, 4), m2 = R.int(1, 5);
            const l2 = m * lam / m2;
            if (m === m2 || !isInt(l2) || l2 < 350 || l2 > 800) continue;
            return {
              q: raw`A diffraction grating is illuminated with light containing several wavelengths. The ${ORD[m]}-order maximum of $${lam}\ \text{nm}$ light appears at the same angle as the ${ORD[m2]}-order maximum of another wavelength present. What is that wavelength?`,
              ...GRE.numeric(R, l2, [m2 * lam / m, lam, (m + 1) * lam / m2, m * lam / (m2 + 1)], { unit: raw`\text{nm}`, sig: 3, tol: 0.05 }),
              level: 2,
              expl: raw`Same angle means $d\sin\theta = ${m}(${lam}\ \text{nm}) = ${m2}\lambda'$, so $\lambda' = ${l2}\ \text{nm}$. Such overlapping orders are a practical limitation of grating spectrometers.`,
            };
          }
          throw new Error('no overlap');
        }
        const N = R.pick([100, 200, 250, 300, 400, 500, 600, 800, 1000, 1200]); // lines/mm
        const lam = R.pick([400, 450, 480, 500, 550, 589, 600, 633, 650, 700]);
        const d = 1e6 / N; // nm
        if (mode === 'angle') {
          const ms = [1, 2, 3].filter(m => m * lam / d <= 0.95 && m * lam / d >= 0.08);
          if (!ms.length) throw new Error('no order');
          const m = R.pick(ms);
          const s = m * lam / d;
          const th = asinD(s);
          const wr = [m > 1 ? asinD(lam / d) : null, asinD(s / 2), acosD(s), 2 * s <= 1 ? asinD(2 * s) : null, atanD(s), (m + 1) * lam / d <= 1 ? asinD((m + 1) * lam / d) : null].filter(x => x != null && x > 0 && x < 90);
          return {
            q: raw`Light of wavelength $${lam}\ \text{nm}$ falls at normal incidence on a diffraction grating with $${N}$ lines per millimeter. The ${ORD[m]}-order maximum appears at an angle from the normal closest to`,
            ...GRE.numeric(R, th, wr, degOpt(th, 0.1)),
            expl: raw`The line spacing is $d = 1/${N}\ \text{mm} = ${F.num(d, 4)}\ \text{nm}$. Principal maxima obey $d\sin\theta = m\lambda$: $\sin\theta = ${m}(${lam})/${F.num(d, 4)} = ${F.num(s, 3)}$, so $\theta \approx ${degs(th)}$.`,
          };
        }
        if (mode === 'maxorder') {
          const r = d / lam;
          if (Math.abs(r - Math.round(r)) < 0.05 || r < 1.1 || r > 12) throw new Error('ambiguous max order');
          const mmax = Math.floor(r);
          const total = R.bool();
          const corr = total ? 2 * mmax + 1 : mmax;
          const wr = total ? [2 * mmax, 2 * mmax + 3, 2 * mmax - 1, mmax, mmax + 1] : [mmax + 1, mmax - 1, 2 * mmax + 1, Math.ceil(r) + 1, 2 * mmax].filter(x => x >= 0);
          return {
            q: raw`Light of wavelength $${lam}\ \text{nm}$ falls at normal incidence on a grating with $${N}$ lines per millimeter. ${total ? 'How many principal maxima in total (including the central one) can be observed?' : 'What is the highest order of principal maximum that can be observed?'}`,
            ...mcv(R, corr, wr, x => `$${x}$`),
            expl: raw`$\sin\theta = m\lambda/d \le 1$ requires $m \le d/\lambda = ${F.num(d, 4)}/${lam} \approx ${F.num(r, 3)}$, so $m_{\max} = ${mmax}$${total ? `; counting both sides and the center gives $2(${mmax}) + 1 = ${corr}$` : ''}.`,
          };
        }
        const sOpts = R.pick([[0.5, 'an angle of $30^\\circ$'], [0.6, 'an angle $\\theta$, with $\\sin\\theta = 0.60$,'], [0.8, 'an angle $\\theta$, with $\\sin\\theta = 0.80$,'], [0.3, 'an angle $\\theta$, with $\\sin\\theta = 0.30$,'], [0.25, 'an angle $\\theta$, with $\\sin\\theta = 0.25$,'], [0.4, 'an angle $\\theta$, with $\\sin\\theta = 0.40$,']]);
        const m = R.int(1, 3);
        const Nl = sOpts[0] / (m * lam * 1e-6); // lines per mm
        return {
          q: raw`When light of wavelength $${lam}\ \text{nm}$ falls at normal incidence on a diffraction grating, the ${ORD[m]}-order maximum appears at ${sOpts[1]} from the normal. How many lines per millimeter does the grating have?`,
          ...GRE.numeric(R, Nl, [Nl * m, Nl / 2, 2 * Nl, m > 1 ? Nl / m * 0.5 : Nl * 3].filter(x => x > 0), { sig: 3, tol: 0.1 }),
          level: 2,
          expl: raw`$d = m\lambda/\sin\theta = ${m}(${lam}\ \text{nm})/${sOpts[0]} = ${F.num(m * lam / sOpts[0], 4)}\ \text{nm}$, so the line density is $1/d \approx ${F.num(Nl, 3)}$ lines per mm.`,
        };
      },
    },
    {
      id: 'optics.grating.resolve', sec: '3.2.5', level: 3,
      gen(R) {
        const P = R.pick([
          ['the sodium D lines', 589.0, 589.6], ['two mercury lines', 577.0, 579.1], ['the hydrogen and deuterium Balmer-alpha lines', 656.1, 656.3],
          ['two closely spaced spectral lines', 500.0, 500.5], ['two closely spaced spectral lines', 600.0, 600.3], ['two closely spaced spectral lines', 450.0, 450.9], ['two closely spaced spectral lines', 700.0, 701.4],
        ]);
        const lam = (P[1] + P[2]) / 2, dl = P[2] - P[1];
        const mode = R.weighted(['N', 'dl', 'order'], [3, 2, 1]);
        if (mode === 'N') {
          const m = R.int(1, 3);
          const N = lam / (m * dl);
          return {
            q: raw`A diffraction grating is used in ${ORD[m]} order to resolve ${P[0]} at $${F.num(P[1], 4)}\ \text{nm}$ and $${F.num(P[2], 4)}\ \text{nm}$. What is the minimum number of grating lines that must be illuminated?`,
            ...GRE.numeric(R, N, [lam / dl, m * lam / dl, lam / (2 * m * dl), N * 10], { sig: 2, tol: 0.15 }),
            expl: raw`The resolving power of a grating is $\lambda/\Delta\lambda = mN$. Here $\lambda/\Delta\lambda = ${F.num(lam, 4)}/${F.num(dl, 2)} \approx ${F.num(lam / dl, 3)}$, so $N = (\lambda/\Delta\lambda)/m \approx ${F.num(N, 2)}$.`,
          };
        }
        if (mode === 'dl') {
          const N = R.pick([500, 1000, 2000, 5000, 10000, 20000]);
          const m = R.int(1, 3);
          const l0 = R.pick([400, 500, 600, 700]);
          const res = l0 / (m * N);
          return {
            q: raw`A grating with $${N}$ illuminated lines is used in ${ORD[m]} order near $${l0}\ \text{nm}$. What is the smallest wavelength difference it can resolve?`,
            ...GRE.numeric(R, res, [l0 / N, m * l0 / N, l0 / (2 * m * N), res / 10], { unit: raw`\text{nm}`, sig: 2, tol: 0.15 }),
            expl: raw`$\lambda/\Delta\lambda = mN$ gives $\Delta\lambda = \lambda/(mN) = ${l0}/(${m}\times${N}) \approx ${F.num(res, 2)}\ \text{nm}$.`,
          };
        }
        const N = R.pick([300, 400, 500, 600, 800, 1000]);
        const need = lam / dl / N;
        const m = Math.ceil(need - 1e-9);
        if (Math.abs(need - Math.round(need)) < 0.08 || m > 6) throw new Error('ambiguous order');
        return {
          q: raw`Only $${N}$ lines of a grating are illuminated. What is the lowest order in which the grating can resolve ${P[0]} at $${F.num(P[1], 4)}\ \text{nm}$ and $${F.num(P[2], 4)}\ \text{nm}$?`,
          ...mcv(R, m, [m - 1, m + 1, m + 2, m + 3, 1].filter(x => x >= 1), x => ORD[x][0].toUpperCase() + ORD[x].slice(1) + ' order'),
          expl: raw`Need $mN \ge \lambda/\Delta\lambda \approx ${F.num(lam / dl, 3)}$, i.e. $m \ge ${F.num(need, 3)}$, so the lowest usable order is $m = ${m}$.`,
        };
      },
    },
    {
      id: 'optics.res.rayleigh', sec: '3.2.5', level: 2, weight: 2,
      gen(R) {
        const mode = R.weighted(['dist', 'angle', 'moon', 'diam', 'scale'], [3, 2, 2, 2, 1]);
        if (mode === 'dist') {
          const S = R.pick([['the two headlights of a car', 1.5, 'm'], ['two lamps on a building', 2, 'm'], ['two small LEDs on a sign', 1, 'cm'], ['two dots of a printed colon', 1, 'mm'], ['two marker lights on an aircraft wing tip and tail', 12, 'm']]);
          const s = S[1] * { m: 1, cm: 1e-2, mm: 1e-3 }[S[2]];
          const D = R.pick([2, 3, 4, 5, 6, 8]); // mm
          const lam = R.pick([500, 550, 600]);
          const L = s * D * 1e-3 / (1.22 * lam * 1e-9);
          return {
            q: raw`The pupil of a person’s eye has a diameter of $${D}\ \text{mm}$. Considering diffraction alone, what is the greatest distance at which the person can resolve ${S[0]}, $${S[1]}\ \text{${S[2]}}$ apart, in light of wavelength $${lam}\ \text{nm}$? The answer is closest to`,
            ...GRE.numeric(R, L, [L * 1.22, L * 2, L / 2, L * 1.22 * 1.22], { unit: raw`\text{m}`, sig: 2, tol: 0.15 }),
            expl: raw`Rayleigh: $\theta_{\min} = 1.22\lambda/D = 1.22(${lam}\times10^{-9})/(${D}\times10^{-3}) \approx ${F.sci(1.22 * lam * 1e-9 / (D * 1e-3), 2)}\ \text{rad}$. The sources subtend $s/L$, so $L_{\max} = s/\theta_{\min} \approx ${F.num(L, 2)}\ \text{m}$.`,
          };
        }
        if (mode === 'angle') {
          const T = R.pick([['an optical telescope', [0.1, 0.2, 0.5, 1, 2.4, 4, 10], [400, 500, 550, 600]], ['a radio telescope observing the 21-cm hydrogen line', [25, 50, 100, 300], [2.1e8]], ['a camera lens', [0.01, 0.02, 0.025, 0.05], [500, 550, 600]]]);
          const D = R.pick(T[1]);
          const lam = R.pick(T[2]);
          const th = 1.22 * lam * 1e-9 / D;
          return {
            q: raw`What is the diffraction-limited angular resolution of ${T[0]} with an aperture of diameter $${F.num(D, 3)}\ \text{m}$${T[2][0] > 1e6 ? '' : raw`, at a wavelength of $${lam}\ \text{nm}$`}? The answer is closest to`,
            ...GRE.numeric(R, th, [th / 1.22, th * 2, th / 2, lam * 1e-9 / (D * D) * 1.22], { unit: raw`\text{rad}`, fmt: x => F.sci(x, 2), tol: 0.15 }),
            expl: raw`Rayleigh criterion: $\theta_{\min} = 1.22\lambda/D = 1.22(${F.sci(lam * 1e-9, 2)}\ \text{m})/(${F.num(D, 3)}\ \text{m}) \approx ${F.sci(th, 2)}\ \text{rad}$. Use the full diameter, not the radius.`,
          };
        }
        if (mode === 'moon') {
          const T = R.pick([['the Moon', 3.8e8, '3.8 \\times 10^{8}\\ \\text{m}'], ['a satellite passing overhead', 4e5, '400\\ \\text{km}'], ['an aircraft flying overhead', 1e4, '10\\ \\text{km}']]);
          const D = R.pick([0.1, 0.2, 0.5, 1, 2, 5]);
          const lam = R.pick([500, 550, 600]);
          const s = 1.22 * lam * 1e-9 * T[1] / D;
          return {
            q: raw`A telescope with a $${F.num(D, 2)}\ \text{m}$ diameter objective observes ${T[0]}, at a distance of $${T[2]}$, in light of wavelength $${lam}\ \text{nm}$. What is the smallest separation between two features that can be resolved? The answer is closest to`,
            ...GRE.numeric(R, s, [s / 1.22, 2 * s, s / 2, s * 10], { unit: raw`\text{m}`, sig: 2, tol: 0.15 }),
            expl: raw`$s = L\theta_{\min} = 1.22\lambda L/D = 1.22(${lam}\times10^{-9})(${F.sci(T[1], 2)})/${F.num(D, 2)} \approx ${F.num(s, 2)}\ \text{m}$.`,
          };
        }
        if (mode === 'diam') {
          const L = R.pick([[100, 'm', 100], [1, 'km', 1000], [10, 'km', 1e4], [400, 'km', 4e5]]);
          const s = R.pick([[1, 'cm', 0.01], [5, 'cm', 0.05], [10, 'cm', 0.1], [1, 'm', 1], [2, 'mm', 0.002]]);
          const lam = R.pick([500, 550, 600]);
          const D = 1.22 * lam * 1e-9 * L[2] / s[2];
          if (D < 1e-4 || D > 50) throw new Error('silly aperture');
          return {
            q: raw`What minimum aperture diameter does a camera need, considering diffraction only, to resolve two points $${s[0]}\ \text{${s[1]}}$ apart from a distance of $${L[0]}\ \text{${L[1]}}$, using light of wavelength $${lam}\ \text{nm}$? The answer is closest to`,
            ...GRE.numeric(R, D, [D / 1.22, 2 * D, D / 2, D * 10], { unit: raw`\text{m}`, sig: 2, tol: 0.15 }),
            expl: raw`Require $1.22\lambda/D \le s/L$, so $D \ge 1.22\lambda L/s = 1.22(${lam}\times10^{-9})(${F.num(L[2], 3)})/${F.num(s[2], 3)} \approx ${F.num(D, 2)}\ \text{m}$.`,
          };
        }
        const [kD, wD] = R.pick(SCALE.slice(0, 4));
        const [lamA, lamB] = R.pick([[600, 400], [400, 600], [500, 400], [600, 450], [700, 350], [500, 500]]);
        const f = (lamB / lamA) / kD;
        const fmt = x => { const e = F.exact(x); return e == null ? null : `$${e}$`; };
        return {
          q: raw`A telescope’s diffraction-limited angular resolution (the smallest resolvable angle) is $\theta_0$ at a wavelength of $${lamA}\ \text{nm}$. If the diameter of its objective is ${wD}${lamA !== lamB ? raw` and it is used at $${lamB}\ \text{nm}$` : ''}, what is the new smallest resolvable angle, in units of $\theta_0$?`,
          ...mcv(R, f, [1 / f, f * kD * kD, (lamA / lamB) / kD, (lamB / lamA) * kD, f * 1.22, 1], fmt),
          level: 1,
          expl: raw`$\theta_{\min} = 1.22\lambda/D \propto \lambda/D$: the factor is $(${lamB}/${lamA})/(${ex(kD)}) = ${ex(f)}$. Bigger apertures and shorter wavelengths resolve finer detail.`,
        };
      },
    },
    {
      id: 'optics.grating.bragg', sec: '3.2.5', level: 2,
      gen(R) {
        const mode = R.weighted(['lam', 'd', 'theta', 'maxorder'], [3, 2, 2, 1]);
        const S = R.pick([[0.5, '30^\\circ', 30], [Math.sqrt(3) / 2, '60^\\circ', 60], [0.25, null, null], [0.2, null, null], [0.4, null, null], [0.6, null, null], [0.3, null, null]]);
        const fromNormal = S[2] != null && R.bool(0.3);
        const angTxt = S[2] == null ? raw`a glancing angle $\theta$ (measured from the planes) with $\sin\theta = ${S[0]}$`
          : fromNormal ? raw`an angle of $${90 - S[2]}^\circ$ from the normal to the planes` : raw`a glancing angle of $${S[1]}$ measured from the planes`;
        const sinT = S[0];
        const m = R.int(1, 3);
        const d = R.pick([0.15, 0.2, 0.25, 0.28, 0.3, 0.35, 0.4, 0.5]); // nm
        const base = raw`Bragg’s law: $2d\sin\theta = m\lambda$, with $\theta$ measured from the crystal planes${fromNormal ? ` (here $\\theta = 90^\\circ - ${90 - S[2]}^\\circ = ${S[1]}$)` : ''}. The factor 2 comes from the extra round-trip path between adjacent planes.`;
        const cosT = fromNormal ? Math.sqrt(1 - sinT * sinT) : null;
        if (mode === 'lam') {
          const lam = 2 * d * sinT / m;
          return {
            q: raw`X-rays reflect from a set of crystal planes with spacing $${F.num(d, 2)}\ \text{nm}$. A ${ORD[m]}-order Bragg maximum is observed at ${angTxt}. What is the X-ray wavelength?`,
            ...GRE.numeric(R, lam, [d * sinT / m, 2 * d * sinT, fromNormal ? 2 * d * Math.sqrt(1 - sinT * sinT) / m : 2 * d * Math.sqrt(1 - sinT * sinT) / m, 4 * d * sinT / m].filter(x => x > 0), { unit: raw`\text{nm}`, sig: 3, tol: 0.08 }),
            expl: base + raw` $\lambda = 2d\sin\theta/m = 2(${F.num(d, 2)})(${F.num(sinT, 3)})/${m} \approx ${F.num(lam, 3)}\ \text{nm}$.`,
          };
        }
        if (mode === 'd') {
          const lam = R.pick([0.071, 0.1, 0.154, 0.2, 0.12, 0.15]);
          const dd = m * lam / (2 * sinT);
          return {
            q: raw`X-rays of wavelength $${lam}\ \text{nm}$ produce a ${ORD[m]}-order Bragg reflection from a family of crystal planes at ${angTxt}. What is the spacing of the planes?`,
            ...GRE.numeric(R, dd, [m * lam / sinT, lam / (2 * sinT), m * lam / (2 * Math.sqrt(1 - sinT * sinT)), dd / 2].filter(x => x > 0), { unit: raw`\text{nm}`, sig: 3, tol: 0.08 }),
            expl: base + raw` $d = m\lambda/(2\sin\theta) = ${m}(${lam})/(2\times${F.num(sinT, 3)}) \approx ${F.num(dd, 3)}\ \text{nm}$.`,
          };
        }
        if (mode === 'theta') {
          const lam0 = R.pick([0.05, 0.1, 0.075, 0.15]);
          const s = m * lam0 / (2 * d);
          if (s > 0.95) throw new Error('no reflection');
          return {
            q: raw`X-rays of wavelength $${lam0}\ \text{nm}$ are incident on crystal planes of spacing $${F.num(d, 2)}\ \text{nm}$. For the ${ORD[m]}-order Bragg reflection, what is $\sin\theta$, where $\theta$ is the glancing angle between the incident beam and the planes?`,
            ...GRE.numeric(R, s, [m * lam0 / d, lam0 / (2 * d), s / 2, Math.sqrt(1 - s * s)].filter(x => x > 0 && x <= 1), { sig: 3, tol: 0.08 }),
            expl: base + raw` $\sin\theta = m\lambda/(2d) = ${m}(${lam0})/(2\times${F.num(d, 2)}) = ${F.num(s, 3)}$.`,
          };
        }
        const lam0 = R.pick([0.07, 0.09, 0.11, 0.13, 0.15, 0.17]);
        const r = 2 * d / lam0;
        if (Math.abs(r - Math.round(r)) < 0.05) throw new Error('ambiguous');
        const mm = Math.floor(r);
        return {
          q: raw`X-rays of wavelength $${lam0}\ \text{nm}$ reflect from crystal planes of spacing $${F.num(d, 2)}\ \text{nm}$. What is the highest order of Bragg reflection that can occur?`,
          ...mcv(R, mm, [Math.floor(d / lam0), mm + 1, mm - 1, mm + 2, 2 * mm].filter(x => x >= 1), x => `$${x}$`),
          expl: raw`$\sin\theta = m\lambda/(2d) \le 1$ requires $m \le 2d/\lambda = ${F.num(r, 3)}$, so $m_{\max} = ${mm}$. Dropping the factor of 2 gives $d/\lambda$ instead.`,
        };
      },
    },
    {
      id: 'optics.grating.nslit', sec: '3.2.5', level: 2,
      gen(R) {
        const N = R.int(3, 12);
        const mode = R.weighted(['minima', 'secondary', 'intensity', 'width'], [2, 2, 2, 1]);
        const setup = `Monochromatic light illuminates ${N} identical, equally spaced, very narrow slits.`;
        const ints = x => `$${x}$`;
        if (mode === 'minima') return { q: setup + ' How many intensity minima (zeros) lie between two adjacent principal maxima?', ...mcv(R, N - 1, [N - 2, N, N + 1, 2 * N - 1, N - 3].filter(x => x >= 0), ints), expl: raw`For $N$ slits the phasor sum vanishes $N-1$ times between principal maxima (whenever the phase between adjacent slits is $2\pi k/N$, $k = 1, \dots, N-1$): here ${N - 1} minima, with ${N - 2} weak secondary maxima between them.` };
        if (mode === 'secondary') return { q: setup + ' How many secondary (subsidiary) maxima lie between two adjacent principal maxima?', ...mcv(R, N - 2, [N - 1, N, N - 3, 2 * N - 2, N + 1].filter(x => x >= 0), ints), expl: raw`There are $N - 1 = ${N - 1}$ zeros between adjacent principal maxima, and a secondary maximum between each pair of neighboring zeros: $N - 2 = ${N - 2}$.` };
        if (mode === 'intensity') return { q: setup + ' The intensity at a principal maximum is how many times the intensity that a single one of these slits would produce at the same point?', ...mcv(R, N * N, [N, 2 * N, N * N * N, N * (N - 1), (N - 1) * (N - 1)], ints), expl: raw`At a principal maximum all $N$ amplitudes add in phase: amplitude $NA$, intensity $N^2 = ${N * N}$ times that of one slit.` };
        const N2 = N * R.pick([2, 3, 4]);
        return {
          q: raw`A grating with ${N} illuminated slits is replaced by one with the same slit spacing but ${N2} illuminated slits. By what factor does the angular width of each principal maximum change?`,
          ...mcv(R, N / N2, [N2 / N, (N / N2) ** 2, 1, Math.sqrt(N / N2)], x => `$${ex(x)}$`),
          expl: raw`The principal maxima stay at $d\sin\theta = m\lambda$ but their half-width (to the adjacent zero) is $\Delta(\sin\theta) = \lambda/(Nd) \propto 1/N$, so the width changes by $${N}/${N2} = ${ex(N / N2)}$.`,
        };
      },
    },

    // ================================================================ 3.3.1 reflection and refraction
    {
      id: 'optics.snell.angle', sec: '3.3.1', level: 1, weight: 2,
      gen(R) {
        const MED = [['air', 1.0, '1.00'], ['water', 1.33, '1.33'], ['glass', 1.5, '1.50'], ['diamond', 2.42, '2.42'], ['an oil', 1.47, '1.47'], ['a plastic', 1.6, '1.60'], ['flint glass', 1.65, '1.65']];
        const mode = R.weighted(['angle', 'surface', 'index', 'speed'], [3, 2, 3, 1]);
        if (mode === 'angle' || mode === 'surface') {
          for (let tries = 0; tries < 100; tries++) {
            const [A, B] = R.pickN(MED, 2);
            const th1 = R.pick([20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70]);
            const s2 = A[1] * sinD(th1) / B[1];
            if (s2 >= 0.97) continue;
            const th2 = asinD(s2);
            if (Math.abs(th2 - th1) < 4) continue;
            const nt = X => `${X[0]} ($n = ${X[2]}$)`;
            const rev = B[1] * sinD(th1) / A[1];
            if (mode === 'angle') {
              return {
                q: raw`A ray of light in ${nt(A)} strikes a flat interface with ${nt(B)} at an angle of incidence of $${th1}^\circ$ (measured from the normal). The angle of refraction is closest to`,
                ...GRE.numeric(R, th2, [th1, rev < 1 ? asinD(rev) : null, 90 - th2, asinD(Math.min(0.999, A[1] * cosD(th1) / B[1]))].filter(x => x != null), degOpt(th2, 0.08)),
                expl: raw`Snell’s law: $n_1\sin\theta_1 = n_2\sin\theta_2$, so $\sin\theta_2 = ${A[2]}\sin${th1}^\circ/${B[2]} \approx ${F.num(s2, 3)}$ and $\theta_2 \approx ${degs(th2)}$. The ray bends ${B[1] > A[1] ? 'toward' : 'away from'} the normal because it enters a medium of ${B[1] > A[1] ? 'higher' : 'lower'} index.`,
              };
            }
            const alpha = 90 - th1;
            return {
              q: raw`A ray of light in ${nt(A)} strikes the flat surface of ${nt(B)}, making an angle of $${alpha}^\circ$ with the surface itself. What angle does the refracted ray make with the normal to the surface? The answer is closest to`,
              ...GRE.numeric(R, th2, [A[1] * sinD(alpha) / B[1] < 1 ? asinD(A[1] * sinD(alpha) / B[1]) : null, 90 - th2, th1, alpha].filter(x => x != null), degOpt(th2, 0.08)),
              level: 2,
              expl: raw`Snell’s law uses angles from the normal: $\theta_1 = 90^\circ - ${alpha}^\circ = ${th1}^\circ$. Then $\sin\theta_2 = ${A[2]}\sin${th1}^\circ/${B[2]} \approx ${F.num(s2, 3)}$, so $\theta_2 \approx ${degs(th2)}$. Plugging the surface angle into Snell’s law is the trap.`,
            };
          }
          throw new Error('no refraction geometry');
        }
        const P = R.pick([
          [60, 30, '60^\\circ', '30^\\circ'], [45, 30, '45^\\circ', '30^\\circ'], [60, 45, '60^\\circ', '45^\\circ'],
          [asinD(0.8), 30, '\\theta_a', '30^\\circ', 0.8], [asinD(0.6), asinD(0.4), '\\theta_a', '\\theta_m', 0.6, 0.4], [asinD(0.9), asinD(0.6), '\\theta_a', '\\theta_m', 0.9, 0.6],
          [asinD(0.8), asinD(0.6), '\\theta_a', '\\theta_m', 0.8, 0.6], [asinD(0.5), asinD(0.3), '30^\\circ', '\\theta_m', 0.5, 0.3], [asinD(0.6), asinD(0.3), '\\theta_a', '\\theta_m', 0.6, 0.3], [asinD(0.9), asinD(0.5), '\\theta_a', '30^\\circ', 0.9, 0.5],
        ]);
        const sa = sinD(P[0]), sm = sinD(P[1]);
        const n = sa / sm;
        const intoMedium = R.bool();
        const note = [];
        if (P[2] === '\\theta_a') note.push(`$\\sin\\theta_a = ${F.num(P[4], 2, true)}$`);
        if (P[3] === '\\theta_m') note.push(`$\\sin\\theta_m = ${F.num(P[P[2] === '\\theta_a' ? 5 : 5], 2, true)}$`);
        const noteS = note.length ? ` (${note.join(' and ')})` : '';
        const geom = intoMedium
          ? raw`A ray of light in air strikes the surface of a transparent block at an angle of incidence $${P[2]}$ and is refracted at an angle $${P[3]}$ from the normal${noteS}.`
          : raw`A ray of light inside a transparent block strikes the surface at an angle of incidence $${P[3]}$ and emerges into air at an angle $${P[2]}$ from the normal${noteS}.`;
        const fmt = x => `$${ex(x, 3)}$`;
        if (mode === 'index') {
          return {
            q: geom + ' What is the index of refraction of the block?',
            ...mcv(R, n, [1 / n, tanD(P[0]) / tanD(P[1]), P[0] / P[1], cosD(P[1]) / cosD(P[0]), n * n], fmt, { tol: 0.04 }),
            expl: raw`Snell’s law with air ($n = 1$): $\sin\theta_{\text{air}} = n\sin\theta_{\text{block}}$, so $n = \sin(${P[2]})/\sin(${P[3]}) = ${F.num(sa, 3)}/${F.num(sm, 3)} = ${ex(n, 3)}$. The angle in air is always the larger one.`,
          };
        }
        const cf = x => { const t = times(x, 'c'); return `$${t == null ? F.num(x, 3) + '\\,c' : t}$`; };
        return {
          q: geom + ' What is the speed of light in the block?',
          ...mcv(R, 1 / n, [n, sm, sa, (1 / n) ** 2, cosD(P[0]) / cosD(P[1])].filter(x => x < 1.01), cf, { tol: 0.04 }),
          level: 2,
          expl: raw`$n = \sin\theta_{\text{air}}/\sin\theta_{\text{block}} = ${ex(n, 3)}$ and $v = c/n = ${ex(1 / n, 3)}\,c$.`,
        };
      },
    },
    {
      id: 'optics.snell.tir', sec: '3.3.1', level: 2, weight: 2,
      gen(R) {
        const mode = R.weighted(['crit', 'n', 'prism', 'fiber', 'gas', 'roman'], [3, 2, 2, 2, 1, 2]);
        const PAIRS = [[['glass', 1.5, '1.50'], ['air', 1, '1.00']], [['water', 1.33, '1.33'], ['air', 1, '1.00']], [['diamond', 2.42, '2.42'], ['air', 1, '1.00']], [['glass', 1.5, '1.50'], ['water', 1.33, '1.33']],
          [['diamond', 2.42, '2.42'], ['water', 1.33, '1.33']], [['a plastic', 1.6, '1.60'], ['air', 1, '1.00']], [['flint glass', 1.65, '1.65'], ['crown glass', 1.52, '1.52']], [['a crystal', 2.0, '2.00'], ['glass', 1.5, '1.50']]];
        if (mode === 'crit' || mode === 'roman') {
          const [A, B] = R.pick(PAIRS);
          const tc = asinD(B[1] / A[1]);
          if (mode === 'crit') {
            return {
              q: raw`Light travels inside ${A[0]} ($n = ${A[2]}$) toward a flat interface with ${B[0]} ($n = ${B[2]}$). Above what angle of incidence is the light totally internally reflected? The answer is closest to`,
              ...GRE.numeric(R, tc, [acosD(B[1] / A[1]), atanD(B[1] / A[1]), B[1] !== 1 ? asinD(1 / A[1]) : null, 90 - tc / 2].filter(x => x != null), degOpt(tc, 0.08)),
              expl: raw`Total internal reflection begins when the refracted angle reaches $90^\circ$: $\sin\theta_c = n_2/n_1 = ${B[2]}/${A[2]} \approx ${F.num(B[1] / A[1], 3)}$, so $\theta_c \approx ${degs(tc)}$. ${B[1] !== 1 ? 'Using $1/n_1$ (as if the outside were air) is a common slip.' : '$\\tan^{-1}(n_2/n_1)$ would be Brewster’s angle instead.'}`,
            };
          }
          const angs = R.shuffle([20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80].filter(a => Math.abs(a - tc) > 3)).slice(0, 3);
          if (!angs.some(a => a > tc)) throw new Error('no TIR angle');
          // romanPick picks randomly; build directly instead to keep the chosen three
          const stmts = angs.map(a => `an angle of incidence of $${a}^\\circ$`);
          const ch = GRE.roman(R, angs.map(a => a > tc));
          return {
            q: GRE.romanStem(raw`Light inside ${A[0]} ($n = ${A[2]}$) is incident on a flat interface with ${B[0]} ($n = ${B[2]}$). For which of the following angles of incidence is the light totally internally reflected?`, stmts),
            ...ch,
            expl: raw`$\sin\theta_c = ${B[2]}/${A[2]} \approx ${F.num(B[1] / A[1], 3)}$, so $\theta_c \approx ${degs(tc)}$; only angles of incidence larger than $\theta_c$ give total internal reflection. ` + angs.map((a, i) => `${RN[i]}: ${a > tc ? 'yes' : 'no'}.`).join(' '),
          };
        }
        if (mode === 'n') {
          const T = R.pick([[30, '30^\\circ', 0.5], [45, '45^\\circ', Math.SQRT1_2], [60, '60^\\circ', Math.sqrt(3) / 2], [null, '\\theta_c \\text{ with } \\sin\\theta_c = 0.60', 0.6], [null, '\\theta_c \\text{ with } \\sin\\theta_c = 0.75', 0.75], [null, '\\theta_c \\text{ with } \\sin\\theta_c = 0.80', 0.8], [null, '\\theta_c \\text{ with } \\sin\\theta_c = 2/3', 2 / 3]]);
          const s = T[2], c = Math.sqrt(1 - s * s);
          const n = 1 / s;
          return {
            q: raw`For light inside a transparent material, the critical angle at the material–air interface is $${T[1]}$. What is the index of refraction of the material?`,
            ...mcv(R, n, [s, 1 / c, s / c, c / s, 1 / (s * s), 2 * s].filter(x => x > 0), x => `$${ex(x, 3)}$`, { tol: 0.04 }),
            level: 1,
            expl: raw`At the critical angle the refracted ray grazes the surface: $n\sin\theta_c = 1$, so $n = 1/\sin\theta_c = ${ex(n, 3)}$.`,
          };
        }
        if (mode === 'prism') {
          const out = R.pick([['air', 1, '1.00'], ['air', 1, '1.00'], ['water', 1.33, '1.33']]);
          const P = R.pick([
            ['a 45°–45°–90° glass prism. The light enters perpendicular to one of the short faces and strikes the long (hypotenuse) face', 45],
            ['a 30°–60°–90° prism. The light enters perpendicular to the shorter leg and strikes the hypotenuse', 60],
            ['a 30°–60°–90° prism. The light enters perpendicular to the longer leg and strikes the hypotenuse', 30],
          ]);
          const nmin = out[1] / sinD(P[1]);
          return {
            q: raw`Light travels through ${P[0]}, which is surrounded by ${out[0]}${out[1] !== 1 ? ` ($n = ${out[2]}$)` : ''}. What is the minimum index of refraction of the prism for the light to be totally internally reflected at that face?`,
            ...GRE.numeric(R, nmin, [out[1] * sinD(P[1]), out[1] / cosD(P[1]), out[1] !== 1 ? 1 / sinD(P[1]) : out[1] * tanD(P[1]) + 0.3, out[1] / sinD(P[1]) ** 2], { sig: 3, tol: 0.06 }),
            level: 2,
            expl: raw`Geometry gives an angle of incidence of $${P[1]}^\circ$ on that face. TIR requires $${P[1]}^\circ \ge \theta_c$, i.e. $\sin${P[1]}^\circ \ge n_{\text{out}}/n$, so $n \ge ${out[2]}/\sin${P[1]}^\circ \approx ${F.num(nmin, 3)}$.`,
          };
        }
        if (mode === 'fiber') {
          const P = R.pick([[1.3, 1.2], [1.5, 1.2], [1.25, 1.2], [1.5, 1.4], [1.6, 1.5], [1.45, 1.4], [1.62, 1.52], [1.5, 1.3], [1.7, 1.5]]);
          const [nc, nk] = P;
          const NA = Math.sqrt(nc * nc - nk * nk);
          if (NA >= 1) throw new Error('NA >= 1');
          return {
            q: raw`An optical fiber has a core of index $${F.num(nc, 3)}$ surrounded by cladding of index $${F.num(nk, 3)}$. Light enters the flat end of the fiber from air. What is the sine of the largest angle (measured from the fiber axis) at which entering light is still totally internally reflected at the core–cladding boundary?`,
            ...GRE.numeric(R, NA, [nk / nc, nc - nk, Math.sqrt(1 - (nk / nc) ** 2), nc * nc - nk * nk, Math.sqrt(nc - nk)].filter(x => x < 1), { sig: 2, tol: 0.1 }),
            level: 3,
            expl: raw`At the end face $\sin\theta_a = n_{\text{core}}\sin\theta_r$. At the wall the angle of incidence is $90^\circ - \theta_r$, and TIR needs $\cos\theta_r \ge n_{\text{clad}}/n_{\text{core}}$. Combining, $\sin\theta_a \le \sqrt{n_{\text{core}}^2 - n_{\text{clad}}^2} = \sqrt{${F.num(nc * nc, 4)} - ${F.num(nk * nk, 4)}} \approx ${F.num(NA, 2)}$. Omitting the refraction at the entrance gives $\sqrt{1 - (n_{\text{clad}}/n_{\text{core}})^2}$.`,
          };
        }
        const G = R.pick([[30, 0.5, '30^\\circ'], [45, Math.SQRT1_2, '45^\\circ'], [60, Math.sqrt(3) / 2, '60^\\circ'], [null, 0.8, '\\theta \\text{ with } \\sin\\theta = 0.8'], [null, 0.6, '\\theta \\text{ with } \\sin\\theta = 0.6']]);
        const fromSurface = G[0] != null && R.bool(0.4);
        const s = G[1], c = Math.sqrt(1 - s * s);
        const corr = 1 / (s * s);
        const angTxt = fromSurface ? raw`making an angle of $${90 - G[0]}^\circ$ with the boundary` : raw`at an angle of incidence $${G[2]}$ (measured from the normal)`;
        return {
          q: raw`A sound wave travels through a gas at absolute temperature $T_1$ and strikes, ${angTxt}, a flat boundary beyond which the same gas is held at temperature $T_2$. The speed of sound in an ideal gas is proportional to $\sqrt{T}$. What is the minimum value of $T_2/T_1$ for which the sound is totally reflected?`,
          ...mcv(R, corr, [1 / s, 1 / (c * c), 1 / c, s * s, s, 2 / (s * s)], x => `$${ex(x, 3)}$`),
          level: 3,
          expl: raw`Snell’s law for any wave: $\sin\theta_1/v_1 = \sin\theta_2/v_2$. Total reflection needs $(v_2/v_1)\sin\theta_1 \ge 1$, i.e. $\sqrt{T_2/T_1} \ge 1/\sin\theta_1$, so $T_2/T_1 \ge 1/\sin^2\theta_1 = ${ex(corr, 3)}$.${fromSurface ? ` The angle of incidence is from the normal: $\\theta_1 = 90^\\circ - ${90 - G[0]}^\\circ = ${G[0]}^\\circ$.` : ''} Sound bends away from the normal when it enters the faster (hotter) gas.`,
        };
      },
    },
    {
      id: 'optics.snell.depth', sec: '3.3.1', level: 1,
      gen(R) {
        const LIQ = [['water', 4 / 3, '4/3'], ['water', 1.33, '1.33'], ['an oil', 1.5, '1.50'], ['glycerin', 1.47, '1.47'], ['alcohol', 1.36, '1.36']];
        const mode = R.weighted(['coin', 'bird', 'slab', 'layers', 'reverse'], [3, 2, 2, 2, 1]);
        const near = ' (viewing at nearly normal incidence)';
        if (mode === 'coin') {
          const L = R.pick(LIQ);
          const d = R.pick([20, 30, 40, 60, 80, 90, 100, 120, 150, 200]);
          const ap = d / L[1];
          return {
            q: raw`A coin lies at the bottom of a pool of ${L[0]} ($n = ${L[2]}$) that is $${d}\ \text{cm}$ deep. Seen from directly above${near}, how far below the surface does the coin appear to be?`,
            ...GRE.numeric(R, ap, [d * L[1], d, d * (1 - 1 / L[1]), d / (L[1] * L[1])], { unit: raw`\text{cm}`, sig: 3, tol: 0.08 }),
            expl: raw`For small angles, $\tan\theta \approx \sin\theta$ and Snell’s law gives apparent depth $= d\,(n_{\text{viewer}}/n_{\text{object}}) = ${d}/${L[2]} \approx ${F.num(ap, 3)}\ \text{cm}$. Objects under water look shallower.`,
          };
        }
        if (mode === 'bird') {
          const L = R.pick(LIQ.slice(0, 2));
          const h = R.pick([1, 1.5, 2, 3, 4, 5, 6]);
          const ap = h * L[1];
          return {
            q: raw`A fish just below the surface of a pond (${L[0]}, $n = ${L[2]}$) looks straight up at a bird hovering $${h}\ \text{m}$ above the water. How high above the surface does the bird appear to the fish?`,
            ...GRE.numeric(R, ap, [h / L[1], h, h * (L[1] - 1), h * L[1] * L[1]], { unit: raw`\text{m}`, sig: 3, tol: 0.08 }),
            expl: raw`Apparent distance $= d\,(n_{\text{viewer}}/n_{\text{object}}) = ${h}\times${L[2]} \approx ${F.num(ap, 3)}\ \text{m}$: seen from the denser medium, the bird looks farther away.`,
          };
        }
        if (mode === 'slab') {
          const n = R.pick([1.5, 1.6, 1.25, 2.0]);
          const t = R.pick([3, 4, 6, 8, 9, 10, 12, 15]);
          const askRaise = R.bool();
          const val = askRaise ? t * (1 - 1 / n) : t / n;
          return {
            q: raw`A glass block ($n = ${n}$) of thickness $${t}\ \text{cm}$ is placed over a printed dot. Viewed from directly above${near}, ${askRaise ? 'by how much does the dot appear to be raised?' : 'how far below the top surface of the block does the dot appear?'}`,
            ...GRE.numeric(R, val, askRaise ? [t / n, t * (n - 1), t, t / (n - 1)] : [t * n, t * (1 - 1 / n), t, t / (n * n)], { unit: raw`\text{cm}`, sig: 3, tol: 0.08 }),
            expl: raw`The dot’s apparent depth below the top surface is $t/n = ${F.num(t / n, 3)}\ \text{cm}$, so it appears raised by $t(1 - 1/n) = ${F.num(t * (1 - 1 / n), 3)}\ \text{cm}$.`,
          };
        }
        if (mode === 'layers') {
          const d1 = R.pick([2, 3, 4, 5, 6, 8, 10]), d2 = R.pick([4, 8, 10, 12, 16, 20]);
          const n1 = 1.5, n2 = 4 / 3;
          const ap = d1 / n1 + d2 / n2;
          return {
            q: raw`A tank contains a layer of oil ($n = 1.5$) of thickness $${d1}\ \text{cm}$ floating on top of a layer of water ($n = 4/3$) of thickness $${d2}\ \text{cm}$. Viewed from directly above${near}, how far below the oil’s surface does the bottom of the tank appear to be?`,
            ...GRE.numeric(R, ap, [(d1 + d2) / n2, (d1 + d2) / n1, d1 * n1 + d2 * n2, d1 + d2, (d1 + d2) / (n1 * n2)], { unit: raw`\text{cm}`, sig: 3, tol: 0.04 }),
            level: 2,
            expl: raw`Each layer contributes its thickness divided by its index (the intermediate refractions cancel in the small-angle limit): $${d1}/1.5 + ${d2}/(4/3) = ${F.num(d1 / n1, 3)} + ${F.num(d2 / n2, 3)} = ${F.num(ap, 3)}\ \text{cm}$.`,
          };
        }
        const P = R.pick([[40, 30], [80, 60], [60, 45], [120, 90], [100, 75], [30, 20], [45, 30], [90, 60], [50, 40], [25, 20]]);
        const n = P[0] / P[1];
        return {
          q: raw`A pebble at the bottom of a tank of clear liquid $${P[0]}\ \text{cm}$ deep appears, when viewed from directly above, to be only $${P[1]}\ \text{cm}$ below the surface. What is the index of refraction of the liquid?`,
          ...mcv(R, n, [1 / n, n * n, Math.sqrt(n), n + 0.5, 2 - 1 / n], x => `$${F.num(x, 3)}$`, { tol: 0.05 }),
          expl: raw`Apparent depth $= d/n$, so $n = d/d_{\text{app}} = ${P[0]}/${P[1]} = ${F.num(n, 3)}$.`,
        };
      },
    },
    {
      id: 'optics.reflect.mirrors', sec: '3.3.1', level: 1,
      gen(R) {
        const mode = R.weighted(['height', 'images', 'rotate', 'walk'], [2, 2, 2, 2]);
        if (mode === 'height') {
          const H = R.pick([1.5, 1.6, 1.7, 1.75, 1.8, 1.9]);
          const D = R.pick([1, 2, 3, 5]);
          return {
            q: raw`A person of height $${H}\ \text{m}$ stands $${D}\ \text{m}$ in front of a vertical plane mirror. What is the minimum height of the mirror that allows the person to see their entire body, from head to feet, at once?`,
            ...GRE.numeric(R, H / 2, [H, H / 4, 3 * H / 4, H / 3, H * D / (D + 1)], { unit: raw`\text{m}`, sig: 3, tol: 0.08 }),
            expl: raw`Light from the head and from the feet reflects at points halfway (in height) between each and the eye, so the mirror must span half the person’s height: $${F.num(H / 2, 3)}\ \text{m}$, independent of the distance to the mirror.`,
          };
        }
        if (mode === 'images') {
          const th = R.pick([90, 60, 45, 40, 36, 30, 20, 120, 72]);
          const N = 360 / th - 1;
          return {
            q: raw`Two plane mirrors meet at an angle of $${th}^\circ$, and a small object is placed between them. How many images of the object are formed?`,
            ...mcv(R, N, [N + 1, N - 1, 2 * N, 180 / th, N + 2].filter(x => isInt(x) && x >= 1), x => `$${x}$`),
            expl: raw`For mirrors at angle $\theta$ with $360^\circ/\theta$ an integer, the number of images is $360^\circ/\theta - 1 = ${360 / th} - 1 = ${N}$. (Two mirrors at $90^\circ$ give the familiar three images.)`,
          };
        }
        if (mode === 'rotate') {
          const a = R.pick([3, 5, 8, 10, 12, 15, 20, 25, 30]);
          return {
            q: raw`A narrow beam of light reflects from a plane mirror. If the mirror is rotated by $${a}^\circ$ about an axis lying in its surface and perpendicular to the plane of incidence, through what angle does the reflected beam rotate?`,
            ...GRE.numeric(R, 2 * a, [a, a / 2, 4 * a, 90 - a], { fmt: x => `${F.num(x, 3)}^\\circ`, tol: 0.08 }),
            expl: raw`Rotating the mirror by $\alpha$ rotates the normal by $\alpha$, which changes the angle of incidence by $\alpha$ and the angle of reflection by $\alpha$, turning the reflected beam by $2\alpha = ${2 * a}^\circ$.`,
          };
        }
        const v = R.pick([0.5, 1, 1.5, 2, 2.5, 3, 4]);
        const rel = R.bool();
        return {
          q: raw`A person walks directly toward a large plane mirror at $${v}\ \text{m/s}$. ${rel ? 'At what speed does the person’s image approach the person?' : 'At what speed does the image move relative to the mirror?'}`,
          ...GRE.numeric(R, rel ? 2 * v : v, rel ? [v, v / 2, 4 * v] : [2 * v, v / 2, 4 * v], { unit: raw`\text{m/s}`, sig: 3, tol: 0.08 }),
          expl: raw`The image is always as far behind the mirror as the person is in front. Relative to the mirror the image moves at $${v}\ \text{m/s}$ toward it; relative to the person the separation $2x$ shrinks at $${2 * v}\ \text{m/s}$.`,
        };
      },
    },

    // ================================================================ 3.3.2 lenses and mirrors
    {
      id: 'optics.lens.image', sec: '3.3.2', level: 2, weight: 3,
      gen(R) {
        const kind = R.pick(['conv', 'div', 'concave', 'convex', 'conv', 'concave']);
        const lens = kind === 'conv' || kind === 'div';
        const fm = R.pick([5, 6, 8, 10, 12, 15, 18, 20, 24, 25, 30, 36, 40, 50, 60]);
        const f = (kind === 'conv' || kind === 'concave') ? fm : -fm;
        let s = null, sp = null;
        for (const x of R.shuffle(Array.from({ length: 149 }, (_, i) => i + 2))) {
          if (x === f) continue;
          const y = x * f / (x - f);
          if (Math.abs(y) > 300 || Math.abs(y) < 2 || !isInt(2 * y)) continue;
          s = x; sp = y; break;
        }
        if (s == null) throw new Error('no lens geometry');
        const useR = !lens && R.bool(0.5);
        const el = {
          conv: `a thin converging lens of focal length $${fm}\\ \\text{cm}$`,
          div: `a thin diverging lens whose focal length has magnitude $${fm}\\ \\text{cm}$`,
          concave: useR ? `a concave spherical mirror with radius of curvature $${2 * fm}\\ \\text{cm}$` : `a concave mirror of focal length $${fm}\\ \\text{cm}$`,
          convex: useR ? `a convex spherical mirror whose radius of curvature has magnitude $${2 * fm}\\ \\text{cm}$` : `a convex mirror whose focal length has magnitude $${fm}\\ \\text{cm}$`,
        }[kind];
        const name = lens ? 'lens' : 'mirror';
        const m = -sp / s;
        const real = sp > 0;
        const base = raw`${useR ? `For a spherical mirror $f = R/2 = ${f}\\ \\text{cm}$. ` : ''}Use $1/s + 1/s' = 1/f$ with $f = ${f}\ \text{cm}$ (${f > 0 ? 'positive for a converging element' : 'negative for a diverging element'}): $1/s' = 1/(${f}) - 1/${s}$, so $s' = ${F.num(sp, 4)}\ \text{cm}$. ${real ? `Positive $s'$ means a real image ${lens ? 'on the far side of the lens' : 'in front of the mirror'}` : `Negative $s'$ means a virtual image ${lens ? 'on the same side as the object' : 'behind the mirror'}`}; $m = -s'/s = ${ex(m)}$.`;
        const mode = R.weighted(['where', 'mag', 'height', 'findf'], [3, 2, 2, (kind === 'conv' || kind === 'concave') && real ? 2 : 0]);
        if (mode === 'where') {
          const side = r => lens ? (r ? 'on the opposite side of the lens from the object' : 'on the same side of the lens as the object') : (r ? 'in front of the mirror' : 'behind the mirror');
          const opt = (dist, r) => `$${F.num(Math.abs(dist), 4)}\\ \\text{cm}$ from the ${name}, ${side(r)}`;
          const corr = opt(sp, real);
          const d2 = s * f / (s + f);
          const wr = [opt(sp, !real), opt(d2, d2 > 0), opt(d2, !(d2 > 0)), opt(fm, real), opt(fm, !real)];
          if (useR) { const fR = 2 * f; if (s !== fR) { const d3 = s * fR / (s - fR); wr.push(opt(d3, d3 > 0)); } }
          if (Math.abs(Math.abs(sp) - s) > 0.5) wr.push(opt(s, !real));
          return {
            q: raw`An object is placed $${s}\ \text{cm}$ from ${el}. Where is the image?`,
            ...GRE.mc(R, corr, wr, { keep: 1 }),
            expl: base,
          };
        }
        if (mode === 'mag') {
          const fmt = x => { const e = F.exact(x); return e == null ? null : `$${x > 0 ? '+' : ''}${e}$`; };
          return {
            q: raw`An object is placed $${s}\ \text{cm}$ from ${el}. What is the lateral magnification of the image (negative for an inverted image)?`,
            ...mcv(R, m, [-m, 1 / m, -1 / m, m * 2, -s / (s * f / (s + f))], fmt),
            expl: base + ' The image is ' + (m < 0 ? 'inverted' : 'upright') + ` and ${Math.abs(m) > 1 ? 'enlarged' : Math.abs(m) < 1 ? 'reduced' : 'the same size'}.`,
          };
        }
        if (mode === 'height') {
          const h = R.pick([1, 2, 3, 4, 5, 6]);
          const hi = Math.abs(m) * h;
          const opt = (x, up) => `$${F.num(x, 3)}\\ \\text{cm}$, ${up ? 'upright' : 'inverted'}`;
          const wr = [opt(hi, m < 0), opt(h / Math.abs(m), m > 0), opt(h / Math.abs(m), m < 0), opt(h, true), opt(h, false), opt(2 * hi, m > 0)];
          return {
            q: raw`A $${h}\ \text{cm}$ tall object stands $${s}\ \text{cm}$ from ${el}. What are the height and orientation of the image?`,
            ...GRE.mc(R, opt(hi, m > 0), wr, { keep: 1 }),
            expl: base + raw` Image height $|m|h = ${F.num(hi, 3)}\ \text{cm}$, ${m > 0 ? 'upright (virtual image)' : 'inverted (real image)'}.`,
          };
        }
        const wr = [s + sp, Math.abs(sp - s), (s + sp) / 2, s * sp / Math.abs(sp - s), 2 * s * sp / (s + sp)];
        return {
          q: kind === 'conv'
            ? raw`An object $${s}\ \text{cm}$ from a thin converging lens forms a sharp image on a screen $${F.num(sp, 4)}\ \text{cm}$ from the lens on the other side. What is the focal length of the lens?`
            : raw`An object $${s}\ \text{cm}$ in front of a concave mirror forms a real image $${F.num(sp, 4)}\ \text{cm}$ in front of the mirror. What is the ${useR ? 'radius of curvature' : 'focal length'} of the mirror?`,
          ...GRE.numeric(R, useR && kind === 'concave' ? 2 * f : f, wr.map(x => (useR && kind === 'concave' ? 2 * x : x)).concat(useR && kind === 'concave' ? [f] : []), { unit: raw`\text{cm}`, sig: 3, tol: 0.06 }),
          expl: raw`$1/f = 1/s + 1/s' = 1/${s} + 1/${F.num(sp, 4)}$, so $f = ss'/(s + s') = ${F.num(f, 3)}\ \text{cm}$${useR && kind === 'concave' ? ` and $R = 2f = ${2 * f}\\ \\text{cm}$` : ''}.`,
        };
      },
    },
    {
      id: 'optics.lens.nature', sec: '3.3.2', level: 1,
      gen(R) {
        const kind = R.pick(['conv', 'conv', 'concave', 'concave', 'div', 'convex']);
        const conv = kind === 'conv' || kind === 'concave';
        const fm = R.pick([6, 8, 10, 12, 16, 20, 24, 30, 40]);
        const ratios = conv ? [[3, 1], [5, 2], [2, 1], [3, 2], [5, 4], [1, 2], [3, 4], [1, 3], [1, 1]] : [[1, 2], [1, 1], [2, 1], [3, 1], [3, 2]];
        const [p, q] = R.pick(ratios.filter(([a, b]) => isInt(fm * a / b)));
        const s = fm * p / q;
        const r = p / q;
        const D = {
          rir: 'real, inverted, and reduced', rie: 'real, inverted, and enlarged', ris: 'real, inverted, and the same size as the object',
          vue: 'virtual, upright, and enlarged', vur: 'virtual, upright, and reduced', none: 'no image is formed (the reflected or refracted rays emerge parallel)',
          rue: 'real, upright, and enlarged', vir: 'virtual, inverted, and reduced', vus: 'virtual, upright, and the same size as the object',
        };
        let key;
        if (!conv) key = 'vur';
        else if (r > 2) key = 'rir';
        else if (r === 2) key = 'ris';
        else if (r > 1) key = 'rie';
        else if (r === 1) key = 'none';
        else key = 'vue';
        const el = { conv: `a converging lens of focal length $${fm}\\ \\text{cm}$`, concave: `a concave mirror of focal length $${fm}\\ \\text{cm}$`, div: `a diverging lens whose focal length has magnitude $${fm}\\ \\text{cm}$`, convex: `a convex mirror whose focal length has magnitude $${fm}\\ \\text{cm}$` }[kind];
        const others = Object.keys(D).filter(k => k !== key);
        const near = { rir: ['rie', 'vur'], rie: ['rir', 'vue'], ris: ['rie', 'rir'], vue: ['rie', 'vur'], vur: ['vue', 'rir'], none: ['rie', 'vue'] }[key];
        const wr = near.concat(R.shuffle(others.filter(k => near.indexOf(k) < 0)));
        const f = conv ? fm : -fm;
        const sp = r === 1 && conv ? null : s * f / (s - f);
        return {
          q: raw`An object is placed $${F.num(s, 3)}\ \text{cm}$ from ${el}. The image is`,
          ...GRE.mc(R, D[key], wr.map(k => D[k]), { keep: 2 }),
          expl: sp == null
            ? raw`The object is at the focal point, so $1/s' = 1/f - 1/s = 0$: the rays leave parallel and no image forms at a finite distance.`
            : raw`$1/s' = 1/f - 1/s$ with $f = ${f}\ \text{cm}$, $s = ${F.num(s, 3)}\ \text{cm}$ gives $s' = ${F.num(sp, 3)}\ \text{cm}$ and $m = -s'/s = ${ex(-sp / s)}$: ${D[key]}. ${conv ? 'For a converging element: beyond $2f$ reduced, at $2f$ same size, between $f$ and $2f$ enlarged (all real and inverted), inside $f$ virtual, upright and enlarged.' : 'A diverging element always forms a virtual, upright, reduced image of a real object.'}`,
        };
      },
    },
    {
      id: 'optics.lens.twolens', sec: '3.3.2', level: 3, weight: 2,
      gen(R) {
        if (R.bool(0.25)) {
          for (let tries = 0; tries < 100; tries++) {
            const f1 = R.pick([10, 12, 15, 20, 25, 30, 40, 50]) * (R.bool(0.7) ? 1 : -1);
            const f2 = R.pick([10, 12, 15, 20, 25, 30, 40, 50, 60]) * (R.bool(0.5) ? 1 : -1);
            if (f1 + f2 === 0) continue;
            const fc = f1 * f2 / (f1 + f2);
            if (!isInt(fc) || Math.abs(fc) > 300) continue;
            const desc = f => f > 0 ? `a converging lens of focal length $${f}\\ \\text{cm}$` : `a diverging lens of focal length $${f}\\ \\text{cm}$`;
            const diopt = R.bool(0.4);
            if (diopt) {
              const P = 100 / fc;
              return {
                q: raw`Two thin lenses are placed in contact: ${desc(f1)} and ${desc(f2)}. What is the optical power of the combination, in diopters ($\text{m}^{-1}$)?`,
                ...GRE.numeric(R, P, [100 / f1 - 100 / f2, 100 / (f1 + f2), 100 / f1 + 100 / Math.abs(f2) === P ? null : 100 / Math.abs(f1) + 100 / Math.abs(f2), -P].filter(x => x != null && isFinite(x)), { allowSign: true, unit: raw`\text{D}`, sig: 3, tol: 0.06 }),
                expl: raw`Powers of thin lenses in contact add: $P = 1/f_1 + 1/f_2 = 1/(${F.num(f1 / 100, 2)}\ \text{m}) + 1/(${F.num(f2 / 100, 2)}\ \text{m}) = ${F.num(P, 3)}\ \text{D}$.`,
              };
            }
            return {
              q: raw`Two thin lenses are placed in contact: ${desc(f1)} and ${desc(f2)}. What is the focal length of the combination?`,
              ...GRE.numeric(R, fc, [f1 + f2, (f1 + f2) / 2, f1 * f2 / (f1 - f2), -fc, Math.abs(f1) * Math.abs(f2) / (Math.abs(f1) + Math.abs(f2))].filter(x => isFinite(x) && x !== 0), { allowSign: true, unit: raw`\text{cm}`, sig: 3, tol: 0.06 }),
              level: 2,
              expl: raw`For thin lenses in contact $1/f = 1/f_1 + 1/f_2 = 1/(${f1}) + 1/(${f2})$, so $f = f_1f_2/(f_1 + f_2) = ${fc}\ \text{cm}$${fc < 0 ? ' (diverging)' : ''}.`,
            };
          }
          throw new Error('no contact lenses');
        }
        for (let tries = 0; tries < 400; tries++) {
          const f1 = R.pick([5, 10, 15, 20, 25, 30, 40]) * (R.bool(0.8) ? 1 : -1);
          const f2 = R.pick([5, 10, 15, 20, 25, 30, 40]) * (R.bool(0.65) ? 1 : -1);
          const D = R.pick([5, 10, 15, 20, 25, 30, 40, 50, 60, 80]);
          const s1 = R.pick([10, 15, 20, 25, 30, 40, 45, 50, 60, 75, 80, 90, 100]);
          if (s1 === f1) continue;
          const p1 = s1 * f1 / (s1 - f1);
          if (!isInt(p1) || Math.abs(p1) > 200) continue;
          const s2 = D - p1;
          if (s2 === 0 || s2 === f2) continue;
          const p2 = s2 * f2 / (s2 - f2);
          if (!isInt(2 * p2) || Math.abs(p2) > 300 || Math.abs(p2) < 1) continue;
          const m = (p1 / s1) * (p2 / s2);
          if (F.exact(m) == null) continue;
          const desc = f => f > 0 ? `converging lens of focal length $${f}\\ \\text{cm}$` : `diverging lens of focal length $${f}\\ \\text{cm}$`;
          const setup = raw`An object is placed $${s1}\ \text{cm}$ to the left of a ${desc(f1)}. A ${desc(f2)} is located $${D}\ \text{cm}$ to the right of the first lens.`;
          const expl = raw`Lens 1: $1/s_1' = 1/(${f1}) - 1/${s1}$ gives $s_1' = ${p1}\ \text{cm}$ (${p1 > 0 ? 'right of lens 1' : 'left of lens 1, virtual'}). This image is the object for lens 2 at $s_2 = ${D} - (${p1}) = ${s2}\ \text{cm}$${s2 < 0 ? ' (a virtual object, since it lies beyond lens 2)' : ''}. Lens 2: $1/s_2' = 1/(${f2}) - 1/(${s2})$ gives $s_2' = ${F.num(p2, 4)}\ \text{cm}$. Total magnification $m = m_1m_2 = (${ex(-p1 / s1)})(${ex(-p2 / s2)}) = ${ex(m)}$.`;
          const mode = R.weighted(['where', 'mag', 'nature'], [3, 2, 2]);
          if (mode === 'where') {
            const opt = x => `$${F.num(Math.abs(x), 4)}\\ \\text{cm}$ to the ${x > 0 ? 'right' : 'left'} of the second lens`;
            const wr = [opt(-p2)];
            if (f1 + f2 !== 0) { const fc = f1 * f2 / (f1 + f2); if (s1 !== fc) wr.push(opt(s1 * fc / (s1 - fc))); }
            const s2b = p1 - D; if (s2b !== 0 && s2b !== f2) wr.push(opt(s2b * f2 / (s2b - f2)));
            wr.push(opt(p2 + D), opt(p1 - D), opt(p1));
            return { q: setup + ' Where is the final image?', ...GRE.mc(R, opt(p2), wr, { keep: 1 }), expl };
          }
          if (mode === 'mag') {
            const fmt = x => { const e = F.exact(x); return e == null ? null : `$${x > 0 ? '+' : ''}${e}$`; };
            return { q: setup + ' What is the overall lateral magnification of the final image (negative if inverted)?', ...mcv(R, m, [-m, -p1 / s1, -p2 / s2, 1 / m, -p1 / s1 - p2 / s2, m * 2], fmt), expl };
          }
          const D2 = { ru: 'real and upright', ri: 'real and inverted', vu: 'virtual and upright', vi: 'virtual and inverted' };
          const key = (p2 > 0 ? 'r' : 'v') + (m > 0 ? 'u' : 'i');
          const ch = GRE.mc(R, `The final image is ${D2[key]}.`, Object.keys(D2).filter(k => k !== key).map(k => `The final image is ${D2[k]}.`).concat(['No final image is formed.']));
          return { q: setup + ' Which of the following describes the final image?', ...ch, expl: expl + ` ${p2 > 0 ? 'Positive' : 'Negative'} $s_2'$ means ${p2 > 0 ? 'real' : 'virtual'}; ${m > 0 ? 'positive' : 'negative'} $m$ means ${m > 0 ? 'upright' : 'inverted'}.` };
        }
        throw new Error('no two-lens geometry');
      },
    },
    {
      id: 'optics.lens.lensmaker', sec: '3.3.2', level: 2,
      gen(R) {
        const mode = R.weighted(['bi', 'plano', 'immerse', 'n', 'mirror'], [3, 2, 3, 1, 1]);
        const n = R.pick([1.25, 1.4, 1.5, 1.6, 1.75, 2.0]);
        const Rr = R.pick([10, 12, 15, 20, 24, 30, 40, 60]);
        const lm = raw`The lensmaker’s equation $1/f = (n - 1)(1/R_1 - 1/R_2)$`;
        if (mode === 'bi') {
          const cvx = R.bool(0.65);
          const f = (cvx ? 1 : -1) * Rr / (2 * (n - 1));
          return {
            q: raw`A thin ${cvx ? 'biconvex' : 'biconcave'} lens is made of glass with index of refraction $${n}$. Both surfaces have radius of curvature of magnitude $${Rr}\ \text{cm}$. What is the focal length of the lens in air (negative for a diverging lens)?`,
            ...GRE.numeric(R, f, [-f, 2 * f, f / 2, Rr / 2 * Math.sign(f), Math.sign(f) * 2 * Rr * (n - 1)], { allowSign: true, unit: raw`\text{cm}`, sig: 3, tol: 0.06 }),
            expl: raw`${lm} with $R_1 = ${cvx ? '+' : '-'}${Rr}\ \text{cm}$, $R_2 = ${cvx ? '-' : '+'}${Rr}\ \text{cm}$: $1/f = ${cvx ? '' : '-'}2(${F.num(n - 1, 2)})/${Rr}$, so $f = ${F.num(f, 3)}\ \text{cm}$.`,
          };
        }
        if (mode === 'plano') {
          const cvx = R.bool(0.65);
          const f = (cvx ? 1 : -1) * Rr / (n - 1);
          return {
            q: raw`A thin plano-${cvx ? 'convex' : 'concave'} lens has one flat face; its curved face has radius of curvature of magnitude $${Rr}\ \text{cm}$. The glass has index of refraction $${n}$. What is the focal length in air (negative for a diverging lens)?`,
            ...GRE.numeric(R, f, [-f, f / 2, 2 * f, Math.sign(f) * Rr, Math.sign(f) * Rr * (n - 1)], { allowSign: true, unit: raw`\text{cm}`, sig: 3, tol: 0.06 }),
            expl: raw`${lm}: a flat face has $1/R = 0$, so $|1/f| = (n - 1)/R$ and $f = ${F.num(f, 3)}\ \text{cm}$.`,
          };
        }
        if (mode === 'immerse') {
          const P = R.pick([[1.5, 4 / 3, '4/3'], [1.5, 1.2, '1.20'], [1.5, 1.25, '1.25'], [1.6, 1.2, '1.20'], [1.5, 1.4, '1.40'], [1.5, 1.6, '1.60'], [1.5, 1.75, '1.75'], [1.6, 4 / 3, '4/3'], [1.6, 1.4, '1.40'], [1.75, 1.4, '1.40']]);
          const [ng, nl, nlT] = P;
          const fa = R.pick([10, 12, 15, 20, 24, 30, 40]);
          const fl = fa * (ng - 1) * nl / (ng - nl);
          return {
            q: raw`A thin glass lens ($n = ${ng}$) has a focal length of $+${fa}\ \text{cm}$ in air. What is its focal length when it is immersed in a liquid of index of refraction $${nlT}$ (negative means diverging)?`,
            ...GRE.numeric(R, fl, [fa * nl, fa / nl, fa, fa * (ng - 1) / (ng - nl), -fl], { allowSign: true, unit: raw`\text{cm}`, sig: 3, tol: 0.06 }),
            level: 3,
            expl: raw`In a medium, $(n - 1)$ in the lensmaker’s equation becomes $(n_{\text{lens}}/n_{\text{liquid}} - 1)$ while the radii stay the same, so $f' = f\,\dfrac{n - 1}{n/n_l - 1} = ${fa}\times\dfrac{${F.num(ng - 1, 2)}}{${F.num(ng / nl - 1, 3)}} \approx ${F.num(fl, 3)}\ \text{cm}$.${nl > ng ? ' Since the liquid is optically denser than the glass, the converging lens becomes diverging.' : ' The lens becomes weaker in the liquid.'}`,
          };
        }
        if (mode === 'n') {
          const f = R.pick([10, 12, 15, 20, 25, 30, 40]);
          const nn = 1 + Rr / (2 * f);
          if (nn > 2.5 || nn < 1.2) throw new Error('silly index');
          return {
            q: raw`A symmetric thin biconvex lens has surfaces with radius of curvature $${Rr}\ \text{cm}$ and a focal length of $${f}\ \text{cm}$ in air. What is the index of refraction of the lens material?`,
            ...GRE.numeric(R, nn, [1 + Rr / f, Rr / (2 * f), 1 + 2 * f / Rr, 1 + Rr / (4 * f)], { sig: 3, tol: 0.04 }),
            expl: raw`$1/f = (n - 1)(2/R)$, so $n = 1 + R/(2f) = 1 + ${Rr}/${2 * f} = ${F.num(nn, 3)}$.`,
          };
        }
        const P = R.pick([[1.5, 4], [1.6, 3], [2.0, 2]]);
        const f0 = R.pick([10, 15, 20, 25, 30]);
        const fl = f0 * P[1];
        const opt = (a, b) => `lens: $${a}\\ \\text{cm}$; mirror: $${b}\\ \\text{cm}$`;
        const wr = [opt(f0, f0), opt(fl, fl), opt(f0, f0 * 4 / 3), opt(f0 * 4 / 3, f0), opt(f0 * 3 / 4, f0), opt(fl, f0 * 3 / 4)];
        return {
          q: raw`A thin glass lens ($n = ${P[0]}$) and a concave mirror each have a focal length of $${f0}\ \text{cm}$ in air. Both are submerged in water ($n = 4/3$). What are their new focal lengths?`,
          ...GRE.mc(R, opt(fl, f0), wr),
          level: 3,
          expl: raw`A mirror’s focal length $f = R/2$ depends only on geometry (the law of reflection involves no index), so it stays $${f0}\ \text{cm}$. The lens’s focal length scales by $(n - 1)/(n/n_w - 1) = ${F.num(P[0] - 1, 2)}/${F.num(P[0] * 0.75 - 1, 3)} = ${P[1]}$, giving $${fl}\ \text{cm}$.`,
        };
      },
    },
    {
      id: 'optics.lens.telescope', sec: '3.3.2', level: 2,
      gen(R) {
        const mode = R.weighted(['mag', 'length', 'fe', 'galilean', 'magnifier'], [3, 2, 2, 1, 2]);
        const fo = R.pick([[40, 'cm', 40], [50, 'cm', 50], [60, 'cm', 60], [80, 'cm', 80], [1.0, 'm', 100], [1.2, 'm', 120], [1.5, 'm', 150], [2.0, 'm', 200]]);
        const fe = R.pick([[1, 'cm', 1], [2, 'cm', 2], [2.5, 'cm', 2.5], [4, 'cm', 4], [5, 'cm', 5], [8, 'mm', 0.8], [10, 'cm', 10], [20, 'mm', 2]]);
        if (fe[2] * 4 > fo[2]) throw new Error('weak telescope');
        const M = fo[2] / fe[2];
        const setup = raw`An astronomical (Keplerian) refracting telescope has an objective lens of focal length $${fo[0]}\ \text{${fo[1]}}$ and an eyepiece of focal length $${fe[0]}\ \text{${fe[1]}}$, adjusted so that the final image is at infinity.`;
        if (mode === 'mag') {
          return {
            q: setup + ' What is the magnitude of its angular magnification?',
            ...GRE.numeric(R, M, [fe[2] / fo[2], (fo[2] + fe[2]) / fe[2] * 2, fo[2] * fe[2] / 10, M / 2, 2 * M], { sig: 3, tol: 0.1 }),
            level: 1,
            expl: raw`$|M| = f_o/f_e = ${fo[2]}\ \text{cm}/${fe[2]}\ \text{cm} = ${F.num(M, 3)}$ (the image is inverted). Convert both focal lengths to the same unit first.`,
          };
        }
        if (mode === 'length') {
          return {
            q: setup + ' What is the distance between the two lenses?',
            ...GRE.numeric(R, fo[2] + fe[2], [fo[2] - fe[2], fo[2], fo[2] * fe[2] / (fo[2] + fe[2]), 2 * (fo[2] + fe[2])], { unit: raw`\text{cm}`, sig: 3, tol: 0.015 }),
            expl: raw`The objective’s image of a distant object forms at its focal point, which must also be the focal point of the eyepiece for parallel output rays: $L = f_o + f_e = ${F.num(fo[2] + fe[2], 4)}\ \text{cm}$.`,
          };
        }
        if (mode === 'fe') {
          const Mm = R.pick([10, 20, 25, 30, 40, 50, 60, 75, 100]);
          const f = fo[2] / Mm;
          return {
            q: raw`A refracting telescope with an objective of focal length $${fo[0]}\ \text{${fo[1]}}$ is to have an angular magnification of magnitude ${Mm} (final image at infinity). What focal length eyepiece is needed?`,
            ...GRE.numeric(R, f, [fo[2] * Mm, fo[2] / Mm / 2, fo[2] / (Mm - 1), 2 * f], { unit: raw`\text{cm}`, sig: 3, tol: 0.06 }),
            expl: raw`$|M| = f_o/f_e$, so $f_e = f_o/|M| = ${fo[2]}\ \text{cm}/${Mm} = ${F.num(f, 3)}\ \text{cm}$.`,
          };
        }
        if (mode === 'galilean') {
          return {
            q: raw`A Galilean telescope uses a converging objective of focal length $${fo[0]}\ \text{${fo[1]}}$ and a diverging eyepiece whose focal length has magnitude $${fe[0]}\ \text{${fe[1]}}$, with the final image at infinity. How far apart are the lenses?`,
            ...GRE.numeric(R, fo[2] - fe[2], [fo[2] + fe[2], fo[2], fo[2] * fe[2] / (fo[2] - fe[2]), fe[2]], { unit: raw`\text{cm}`, sig: 3, tol: 0.015 }),
            level: 3,
            expl: raw`The eyepiece must sit where the objective’s focal point is also the eyepiece’s (virtual) focal point, a distance $|f_e|$ before the objective’s image: $L = f_o - |f_e| = ${F.num(fo[2] - fe[2], 4)}\ \text{cm}$. The image is upright, with $|M| = f_o/|f_e| = ${F.num(M, 3)}$.`,
          };
        }
        const f = R.pick([2, 2.5, 4, 5, 6.25, 8, 10, 12.5]);
        const nearPt = R.bool();
        const val = nearPt ? 1 + 25 / f : 25 / f;
        return {
          q: raw`A simple magnifier is a converging lens of focal length $${f}\ \text{cm}$. Taking the near point of the eye to be $25\ \text{cm}$, what is its angular magnification when the ${nearPt ? 'image is formed at the near point' : 'final image is at infinity (relaxed eye)'}?`,
          ...GRE.numeric(R, val, [nearPt ? 25 / f : 1 + 25 / f, f / 25, 25 / f - 1, 50 / f], { sig: 3, tol: 0.05 }),
          level: 2,
          expl: raw`${nearPt ? 'With the image at the near point, $M = 1 + (25\\ \\text{cm})/f' : 'With the object at the focal point, the image is at infinity and $M = (25\\ \\text{cm})/f'} = ${F.num(val, 3)}$.`,
        };
      },
    },

    // ================================================================ 3.4.1 Rayleigh scattering
    {
      id: 'optics.rayleigh.ratio', sec: '3.4.1', level: 1, weight: 2,
      gen(R) {
        const mode = R.weighted(['lambda', 'freq', 'size', 'combo'], [3, 2, 2, 1]);
        const fmt = x => `$${ex(x, 3)}$`;
        if (mode === 'lambda') {
          const P = R.pick([[400, 800], [350, 700], [400, 600], [450, 600], [400, 500], [500, 750], [300, 600], [450, 675], [420, 700], [400, 700], [480, 640], [500, 600]]);
          const rev = R.bool(0.3);
          const r = P[1] / P[0];
          const corr = rev ? r ** -4 : r ** 4;
          const k = rev ? 1 / r : r;
          return {
            q: raw`Light scattered by air molecules obeys Rayleigh’s law. Two beams of equal incident intensity, with wavelengths $${P[0]}\ \text{nm}$ and $${P[1]}\ \text{nm}$, pass through the same air. What is the ratio of the intensity scattered from the $${rev ? P[1] : P[0]}\ \text{nm}$ beam to that scattered from the $${rev ? P[0] : P[1]}\ \text{nm}$ beam?`,
            ...mcv(R, corr, [k * k, k, k ** 6, 1 / corr, k ** 3, k ** 8], fmt, { tol: 0.08 }),
            expl: raw`Rayleigh scattering goes as $\lambda^{-4}$, so the ratio is $(${rev ? P[0] : P[1]}/${rev ? P[1] : P[0]})^4 = ${ex(corr, 3)}$. Shorter wavelengths scatter much more strongly, which is why the sky is blue.`,
          };
        }
        if (mode === 'freq') {
          const k = R.pick([2, 3, 1.5, 0.5, 4 / 3, 0.75]);
          const c = k ** 4;
          return {
            q: raw`Light of frequency $\nu$ is Rayleigh-scattered by small molecules. If the frequency is multiplied by $${ex(k)}$ (same incident intensity), by what factor does the scattered intensity change?`,
            ...mcv(R, c, [k * k, k, 1 / c, k ** 6, k ** 3, 1], fmt, { tol: 0.08 }),
            expl: raw`$I \propto \lambda^{-4} \propto \nu^4$ (the $\omega^4$ of dipole radiation), so the factor is $(${ex(k)})^4 = ${ex(c, 3)}$.`,
          };
        }
        if (mode === 'size') {
          const vol = R.bool(0.3);
          const k = R.pick([2, 3, 0.5, 1.5]);
          const c = vol ? k * k : k ** 6;
          return {
            q: raw`Small particles, much smaller than the wavelength, scatter light according to Rayleigh’s law. If each particle’s ${vol ? 'volume' : 'diameter'} is multiplied by $${ex(k)}$ (same wavelength, same number of particles), by what factor does the light scattered by each particle change?`,
            ...mcv(R, c, vol ? [k, k ** 3, k ** 6, k ** 4, 1] : [k ** 3, k * k, k ** 4, k, k ** -4], fmt, { tol: 0.08 }),
            level: 2,
            expl: raw`Rayleigh: $I \propto a^6/\lambda^4$ (the induced dipole moment is proportional to the particle volume, and intensity to its square). ${vol ? `Since $a^6 \\propto V^2$, the factor is $(${ex(k)})^2 = ${ex(c, 3)}$.` : `The factor is $(${ex(k)})^6 = ${ex(c, 3)}$.`}`,
          };
        }
        const a = R.pick([2, 0.5]), l = R.pick([2, 0.5, 1.5]);
        const c = a ** 6 / l ** 4;
        return {
          q: raw`In Rayleigh scattering, the particle diameter is multiplied by $${ex(a)}$ and the wavelength of the light is multiplied by $${ex(l)}$. By what factor does the scattered intensity per particle change?`,
          ...mcv(R, c, [a ** 6 * l ** 4, a ** 3 / l ** 4, a ** 6 / l ** 2, a ** 2 / l ** 4, l ** 4 / a ** 6], fmt, { tol: 0.08 }),
          level: 2,
          expl: raw`$I \propto a^6\lambda^{-4}$: factor $= (${ex(a)})^6/(${ex(l)})^4 = ${ex(c, 3)}$.`,
        };
      },
    },
    {
      id: 'optics.rayleigh.concept', sec: '3.4.1', level: 1,
      gen(R) {
        const T = [
          ['The sky is blue because short wavelengths are scattered much more strongly than long ones.', 'Rayleigh scattering goes as $\\lambda^{-4}$.'],
          ['The setting Sun looks red because much of the blue light has been scattered out of the direct beam.', 'the long path through the atmosphere removes short wavelengths.'],
          ['Skylight scattered through $90^\\circ$ from the Sun’s direction is strongly linearly polarized.', 'each molecule radiates like a dipole, which emits no radiation along its axis.'],
          ['Rayleigh’s law applies to scatterers much smaller than the wavelength.', 'larger particles are described by Mie scattering or geometric optics.'],
          ['Clouds look white because water droplets are much larger than visible wavelengths, so they scatter all colors about equally.', 'the $\\lambda^{-4}$ law does not apply to large droplets.'],
          ['Rayleigh scattering is the same physics as radiation from oscillating electric dipoles, whose radiated power grows as $\\omega^4$.', 'the incident field drives each molecule as a dipole.'],
          ['Seen from the Moon’s surface, the daytime sky is black.', 'there is no atmosphere to scatter sunlight.'],
        ];
        const Fz = [
          ['Air molecules scatter red light more strongly than blue light.', 'blue is scattered more, by $\\lambda^{-4}$.'],
          ['Rayleigh-scattered intensity is proportional to $\\lambda^{-2}$.', 'it goes as $\\lambda^{-4}$.'],
          ['Rayleigh scattering is strongest for particles much larger than the wavelength.', 'it describes particles much smaller than the wavelength.'],
          ['The sky is blue because air molecules absorb red light.', 'it is scattering, not absorption.'],
          ['Light from the clear sky is unpolarized in every direction.', 'it is strongly polarized at $90^\\circ$ from the Sun.'],
          ['Doubling the wavelength increases the scattered intensity 16-fold.', 'it decreases it 16-fold.'],
          ['The light scattered by a small particle does not depend on the particle’s size.', 'it scales as $a^6$.'],
        ];
        if (R.bool(0.5)) {
          const r = romanPick(R, T, Fz, 'Which of the following statements about the scattering of sunlight in the atmosphere is (are) true?');
          return { q: r.q, choices: r.choices, ans: r.ans, level: 2, expl: 'Rayleigh scattering: $I \\propto a^6/\\lambda^4$ for scatterers much smaller than $\\lambda$. ' + r.why };
        }
        const r = conceptPick(R, T, Fz, 'Which of the following statements about Rayleigh scattering is correct?', 'Which of the following statements about Rayleigh scattering is NOT correct?');
        return { q: r.q, choices: r.choices, ans: r.ans, expl: 'The answer is the statement shown: ' + r.why };
      },
    },

    // ================================================================ 3.4.2 Doppler effect
    {
      id: 'optics.doppler.basic', sec: '3.4.2', level: 2, weight: 3,
      gen(R) {
        const v = R.pick([330, 340, 343, 350]);
        const f0 = R.pick([200, 250, 300, 400, 440, 500, 512, 600, 800, 1000, 1200]);
        const sc = R.pick(['srcTo', 'srcAway', 'obsTo', 'obsAway', 'both', 'chase', 'apart']);
        const u1 = R.pick([10, 15, 20, 25, 30, 34, 40, 50, 60, 70, 85]);
        const u2 = R.pick([5, 10, 15, 20, 25, 30]);
        let vs = 0, vr = 0, desc;
        const src = `a source emitting a steady ${f0}-Hz tone`;
        switch (sc) {
          case 'srcTo': vs = u1; desc = `A car carrying ${src} moves at $${u1}\\ \\text{m/s}$ directly toward a stationary listener.`; break;
          case 'srcAway': vs = -u1; desc = `A car carrying ${src} moves at $${u1}\\ \\text{m/s}$ directly away from a stationary listener.`; break;
          case 'obsTo': vr = u1; desc = `A listener moves at $${u1}\\ \\text{m/s}$ directly toward a stationary loudspeaker emitting a steady ${f0}-Hz tone.`; break;
          case 'obsAway': vr = -u1; desc = `A listener moves at $${u1}\\ \\text{m/s}$ directly away from a stationary loudspeaker emitting a steady ${f0}-Hz tone.`; break;
          case 'both': vs = u1; vr = u2; desc = `A train sounding a ${f0}-Hz horn moves at $${u1}\\ \\text{m/s}$ toward a cyclist who rides toward the train at $${u2}\\ \\text{m/s}$ along the same line.`; break;
          case 'chase': vs = u1; vr = -u2; desc = `A car moving at $${u1}\\ \\text{m/s}$ sounds a ${f0}-Hz horn while following a cyclist directly ahead of it who rides at $${u2}\\ \\text{m/s}$ in the same direction.`; break;
          default: vs = -u1; vr = -u2; desc = `A train sounding a ${f0}-Hz horn moves at $${u1}\\ \\text{m/s}$ away from a cyclist who rides at $${u2}\\ \\text{m/s}$ in the opposite direction, away from the train.`;
        }
        const air = `The air is still and the speed of sound is $${v}\\ \\text{m/s}$.`;
        const f = f0 * (v + vr) / (v - vs);
        const lamMode = (sc === 'srcTo' || sc === 'srcAway') && R.bool(0.3);
        if (lamMode) {
          const lam = (v - vs) / f0;
          return {
            q: desc + ' ' + air + ' What is the wavelength of the sound in the air between the source and the listener?',
            ...GRE.numeric(R, lam, [v / f0, (v + vs) / f0, v / f, v * v / ((v + vs) * f0)], { unit: raw`\text{m}`, sig: 3, tol: 0.03 }),
            expl: raw`A moving source crowds (or spreads) its wavefronts: each period it moves $v_sT$, so $\lambda = (v ${vs > 0 ? '-' : '+'} ${u1})/f_0 = ${F.num(lam, 3)}\ \text{m}$ on the listener’s side.`,
          };
        }
        const a = Math.abs(vr), b = Math.abs(vs);
        const urel = vs + vr;
        const wr = [f0 * (v - vr) / (v + vs), f0 * (v - vr) / (v - vs), f0 * (v + vr) / (v + vs), f0 * (v + a) / (v - b), f0 * (v - a) / (v + b), f0 * (1 + urel / v), f0 * v / (v - urel), f0];
        return {
          q: desc + ' ' + air + ' What frequency does the listener hear?',
          ...GRE.numeric(R, f, wr, { unit: raw`\text{Hz}`, fmt: x => F.num(x, 4), tol: 0.02 }),
          expl: raw`$f = f_0\,\dfrac{v + v_r}{v - v_s}$, with $v_r$ and $v_s$ positive when the listener/source moves toward the other: here $v_r = ${vr}$, $v_s = ${vs}\ \text{m/s}$, so $f = ${f0}\times\dfrac{${v + vr}}{${v - vs}} \approx ${F.num(f, 4)}\ \text{Hz}$. For sound, the source and listener speeds enter differently, so only the relative speed is not enough.`,
        };
      },
    },
    {
      id: 'optics.doppler.solve', sec: '3.4.2', level: 2, weight: 2,
      gen(R) {
        const mode = R.weighted(['passing', 'approach', 'listener', 'reflect'], [3, 2, 2, 3]);
        const v = 340;
        if (mode === 'passing') {
          const u = R.pick([10, 17, 20, 30, 34, 40, 50, 60, 68]);
          const g = F.gcd(v + u, v - u);
          let A = (v + u) / g, B = (v - u) / g;
          const k = R.pick([1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20].filter(k => A * k >= 250 && A * k <= 1600));
          if (!k) throw new Error('no scale');
          A *= k; B *= k;
          return {
            q: raw`An ambulance moving at constant speed along a straight road passes a pedestrian standing beside the road. Well before it passes, the pedestrian hears its siren at $${A}\ \text{Hz}$; well after, at $${B}\ \text{Hz}$. The speed of sound is $${v}\ \text{m/s}$. What is the speed of the ambulance?`,
            ...GRE.numeric(R, u, [v * (A - B) / A, v * (A - B) / B, 2 * u, u / 2, v * (A - B) / (2 * B)], { unit: raw`\text{m/s}`, sig: 3, tol: 0.06 }),
            expl: raw`$f_a = f_0v/(v - u)$ and $f_r = f_0v/(v + u)$, so $f_a/f_r = (v + u)/(v - u)$, giving $u = v\,\dfrac{f_a - f_r}{f_a + f_r} = ${v}\times\dfrac{${A - B}}{${A + B}} = ${u}\ \text{m/s}$.`,
          };
        }
        if (mode === 'approach' || mode === 'listener') {
          const u = R.pick([20, 34, 40, 68, 85]);
          const srcMoves = mode === 'approach';
          // integer f0 and f
          const num = srcMoves ? v : v + u, den = srcMoves ? v - u : v;
          const g = F.gcd(num, den);
          const base0 = den / g, base1 = num / g;
          const ks = [1, 2, 3, 4, 5, 6, 8, 10, 20, 25, 40, 50].filter(k => base0 * k >= 200 && base0 * k <= 1200);
          if (!ks.length) throw new Error('no scale');
          const k = R.pick(ks);
          const f0 = base0 * k, f = base1 * k;
          return {
            q: srcMoves
              ? raw`A source emits sound at $${f0}\ \text{Hz}$ and moves directly toward a stationary listener, who hears $${f}\ \text{Hz}$. The speed of sound is $${v}\ \text{m/s}$. How fast is the source moving?`
              : raw`A stationary source emits sound at $${f0}\ \text{Hz}$. A listener moving directly toward it hears $${f}\ \text{Hz}$. The speed of sound is $${v}\ \text{m/s}$. How fast is the listener moving?`,
            ...GRE.numeric(R, u, [srcMoves ? v * (f - f0) / f0 : v * (f - f0) / f, v * (f - f0) / (f + f0), 2 * u, v * f0 / f], { unit: raw`\text{m/s}`, sig: 3, tol: 0.05 }),
            expl: srcMoves
              ? raw`$f = f_0\,v/(v - u)$, so $u = v(1 - f_0/f) = ${v}(1 - ${f0}/${f}) = ${u}\ \text{m/s}$. Using the moving-listener formula gives a different (wrong) answer.`
              : raw`$f = f_0(v + u)/v$, so $u = v(f/f_0 - 1) = ${v}(${f}/${f0} - 1) = ${u}\ \text{m/s}$.`,
          };
        }
        const u = R.pick([5, 10, 15, 20, 25, 30, 40]);
        const f0 = R.pick([500, 1000, 2000, 4000, 25000, 40000]);
        const fr = f0 * (v + u) / (v - u);
        const bat = f0 >= 20000;
        const askBeat = !bat && R.bool(0.6);
        const desc = bat ? raw`A bat flying at $${u}\ \text{m/s}$ directly toward a wall emits an ultrasonic pulse at $${f0 / 1000}\ \text{kHz}$. The speed of sound is $${v}\ \text{m/s}$. What frequency does the bat hear in the echo?`
          : raw`A stationary loudspeaker emits a $${f0}\ \text{Hz}$ tone toward a large flat panel that moves directly toward the speaker at $${u}\ \text{m/s}$. The speed of sound is $${v}\ \text{m/s}$. ${askBeat ? 'A microphone beside the speaker picks up both the direct and the reflected sound. What beat frequency does it record?' : 'What is the frequency of the reflected sound received back at the speaker?'}`;
        const kk = bat ? 1000 : 1;
        const val = (askBeat ? fr - f0 : fr) / kk;
        const wr = askBeat ? [u * f0 / (v - u), u * f0 / v, 2 * u * f0 / (v + u), 4 * u * f0 / v, (fr - f0) / 2] : [f0 * v / (v - u), f0 * (v + u) / v, f0 * (v - u) / (v + u), f0 * (1 + 2 * u / v) * (1 + u / v)];
        return {
          q: desc,
          ...GRE.numeric(R, val, wr.map(x => x / kk), { unit: bat ? raw`\text{kHz}` : raw`\text{Hz}`, fmt: x => F.num(x, 4), tol: 0.02 }),
          level: 3,
          expl: raw`Two Doppler shifts: the ${bat ? 'wall' : 'panel'} receives as a moving listener, $f_1 = f_0(v + u)/v$, then re-emits as a moving source, $f_2 = f_1v/(v - u)$. So $f_2 = f_0\,\dfrac{v + u}{v - u} \approx ${F.num(fr, 4)}\ \text{Hz}$${askBeat ? `, and the beat frequency is $f_2 - f_0 = ${F.num(fr - f0, 4)}\\ \\text{Hz}$` : ''}.`,
        };
      },
    },
    {
      id: 'optics.doppler.concept', sec: '3.4.2', level: 2,
      gen(R) {
        const T = [
          ['For a source approaching a stationary listener head-on at constant speed, the pitch heard is constant until the source passes.', 'the Doppler formula involves only the constant velocities.'],
          ['When a source and a listener move with the same velocity relative to still air, along the line joining them, there is no frequency shift.', 'the factors $(v - u)$ in numerator and denominator cancel.'],
          ['A steady wind does not change the frequency heard when the source and listener are both at rest on the ground.', 'every wavefront takes the same time to arrive, so as many arrive per second as are emitted.'],
          ['The falling pitch of a car passing at constant speed comes from the changing component of its velocity along the line of sight.', 'the shift depends on $v_s\\cos\\theta$.'],
          ['At the same speed, a source approaching a stationary listener produces a larger upward shift than a listener approaching a stationary source.', '$v/(v - u) > (v + u)/v$.'],
          ['A moving source changes the wavelength of sound in the air; a moving listener does not.', 'the listener only changes the rate at which crests are met.'],
        ];
        const Fz = [
          ['For sound, the frequency heard depends only on the relative velocity of source and listener.', 'the motion relative to the air matters, so source and listener motions enter differently.'],
          ['A listener moving away from a stationary source hears a higher frequency.', 'they meet fewer crests per second, so the pitch is lower.'],
          ['The sound wavelength in the air ahead of a moving source is longer than behind it.', 'it is shorter ahead.'],
          ['When a source approaches a listener head-on at constant speed, the pitch rises steadily as it gets closer.', 'the pitch is constant (but higher than emitted).'],
          ['A steady wind blowing from a stationary source to a stationary listener raises the frequency heard.', 'it changes the speed of the sound but not the frequency.'],
          ['The formula $f = f_0(v + v_r)/(v - v_s)$ remains valid when the source moves faster than sound.', 'a supersonic source produces a shock wave.'],
        ];
        if (R.bool(0.5)) {
          const r = romanPick(R, T, Fz, 'Which of the following statements about the Doppler effect for sound is (are) true?');
          return { q: r.q, choices: r.choices, ans: r.ans, expl: 'For sound, $f = f_0(v + v_r)/(v - v_s)$ with velocities measured relative to the air. ' + r.why };
        }
        const r = conceptPick(R, T, Fz, 'Which of the following statements about the Doppler effect for sound is correct?', 'Which of the following statements about the Doppler effect for sound is NOT correct?');
        return { q: r.q, choices: r.choices, ans: r.ans, expl: 'The answer is the statement shown: ' + r.why };
      },
    },

    // ================================================================ 3.4.3 standing sound waves
    {
      id: 'optics.pipe.harmonics', sec: '3.4.3', level: 2, weight: 3,
      gen(R) {
        const v = R.pick([330, 340, 343, 350]);
        const mode = R.weighted(['fund', 'nth', 'length', 'consec', 'allowed', 'convert'], [3, 2, 2, 3, 2, 1]);
        const typeTxt = c => c ? 'closed at one end and open at the other' : 'open at both ends';
        if (mode === 'fund' || mode === 'nth') {
          const L = R.pick([0.25, 0.3, 0.34, 0.4, 0.5, 0.6, 0.68, 0.75, 0.85, 1.0, 1.2, 1.5, 1.7, 2.0]);
          const closed = R.bool();
          const f1 = closed ? v / (4 * L) : v / (2 * L);
          if (mode === 'fund') {
            return {
              q: raw`A pipe of length $${F.num(L, 3)}\ \text{m}$ is ${typeTxt(closed)}. The speed of sound is $${v}\ \text{m/s}$. What is its fundamental frequency?`,
              ...GRE.numeric(R, f1, [closed ? v / (2 * L) : v / (4 * L), v / L, closed ? 3 * v / (4 * L) : 2 * v / L], { unit: raw`\text{Hz}`, sig: 3, tol: 0.08 }),
              level: 1,
              expl: closed ? raw`A closed end is a pressure antinode and an open end a pressure node, so the lowest mode fits a quarter wavelength: $\lambda = 4L$, $f_1 = v/4L = ${F.num(f1, 3)}\ \text{Hz}$.` : raw`Both open ends are pressure nodes, so the lowest mode fits half a wavelength: $\lambda = 2L$, $f_1 = v/2L = ${F.num(f1, 3)}\ \text{Hz}$.`,
            };
          }
          const k = R.pick([2, 3]);
          const corr = closed ? (2 * k - 1) * f1 : k * f1;
          return {
            q: raw`A pipe of length $${F.num(L, 3)}\ \text{m}$ is ${typeTxt(closed)}. The speed of sound is $${v}\ \text{m/s}$. What is the ${k === 2 ? 'second-lowest' : 'third-lowest'} resonant frequency of the pipe?`,
            ...GRE.numeric(R, corr, [closed ? k * f1 : (2 * k - 1) * f1, closed ? (2 * k - 1) * v / (2 * L) : k * v / (4 * L), corr / 2, f1], { unit: raw`\text{Hz}`, sig: 3, tol: 0.08 }),
            expl: closed ? raw`A closed–open pipe has only odd harmonics: $f = f_1, 3f_1, 5f_1, \dots$ with $f_1 = v/4L = ${F.num(f1, 3)}\ \text{Hz}$. The ${k === 2 ? 'second' : 'third'} resonance is $${2 * k - 1}f_1 = ${F.num(corr, 3)}\ \text{Hz}$.` : raw`An open–open pipe has all harmonics $nf_1$ with $f_1 = v/2L = ${F.num(f1, 3)}\ \text{Hz}$, so the answer is $${k}f_1 = ${F.num(corr, 3)}\ \text{Hz}$.`,
          };
        }
        if (mode === 'length') {
          const f = R.pick([110, 170, 200, 220, 250, 262, 330, 340, 440, 500, 680]);
          const closed = R.bool();
          const L = closed ? v / (4 * f) : v / (2 * f);
          return {
            q: raw`An organ pipe ${typeTxt(closed)} is to have a fundamental frequency of $${f}\ \text{Hz}$. If the speed of sound is $${v}\ \text{m/s}$, how long must the pipe be?`,
            ...GRE.numeric(R, L, [closed ? v / (2 * f) : v / (4 * f), v / f, 2 * v / f], { unit: raw`\text{m}`, sig: 3, tol: 0.08 }),
            level: 1,
            expl: raw`$f_1 = v/${closed ? 4 : 2}L$, so $L = v/(${closed ? 4 : 2}f_1) = ${v}/(${closed ? 4 : 2}\times${f}) \approx ${F.num(L, 3)}\ \text{m}$.`,
          };
        }
        if (mode === 'consec') {
          const closed = R.bool();
          const f1 = R.pick([50, 60, 75, 80, 85, 100, 110, 120, 125, 150, 170, 200]);
          const k = R.int(1, 4);
          const fa = closed ? (2 * k + 1) * f1 : (k + 1) * f1, fb = closed ? (2 * k + 3) * f1 : (k + 2) * f1;
          const askL = R.bool();
          const L = closed ? v / (4 * f1) : v / (2 * f1);
          const d = fb - fa;
          return {
            q: raw`A pipe resonates at $${fa}\ \text{Hz}$ and at $${fb}\ \text{Hz}$, with no resonances in between, and its fundamental frequency is below $${fa}\ \text{Hz}$. ${askL ? `The speed of sound is $${v}\\ \\text{m/s}$. What is the length of the pipe?` : 'What is the fundamental frequency of the pipe?'}`,
            ...(askL
              ? GRE.numeric(R, L, closed ? [v / (2 * d), v / (4 * d), v / (2 * f1), v / d] : [v / (4 * f1), v / (4 * d) * 4, v / (8 * f1), v / (2 * fa)], { unit: raw`\text{m}`, sig: 3, tol: 0.08 })
              : GRE.numeric(R, f1, [closed ? d : d / 2, fa - f1 === f1 ? 3 * f1 : fa / 2, F.gcd(fa, fb) === f1 ? null : F.gcd(fa, fb), d / 4].filter(x => x != null && x > 0), { unit: raw`\text{Hz}`, sig: 3, tol: 0.08 })),
            level: 3,
            expl: closed
              ? raw`Consecutive resonances differ by $${d}\ \text{Hz}$. If both ends were open, $${fa}$ would be a multiple of $${d}$; it is not, but $${fa} = ${2 * k + 1}\times${f1}$ and $${fb} = ${2 * k + 3}\times${f1}$ are consecutive odd multiples of $${f1}\ \text{Hz}$. So the pipe is closed at one end with $f_1 = ${f1}\ \text{Hz}$${askL ? ` and $L = v/4f_1 = ${F.num(L, 3)}\\ \\text{m}$` : ''}.`
              : raw`Consecutive resonances differ by $${d}\ \text{Hz}$, and $${fa} = ${k + 1}\times${d}$, $${fb} = ${k + 2}\times${d}$ are consecutive integer multiples: an open–open pipe with $f_1 = ${f1}\ \text{Hz}$${askL ? ` and $L = v/2f_1 = ${F.num(L, 3)}\\ \\text{m}$` : ''}. (A closed pipe would have resonances at odd multiples of half the spacing.)`,
          };
        }
        if (mode === 'allowed') {
          const closed = R.bool(0.6);
          const f1 = R.pick([60, 80, 100, 110, 120, 150, 200, 250]);
          const good = closed ? R.pick([3, 5, 7, 9]) : R.pick([2, 3, 4, 5, 6]);
          const bad = closed ? [2, 4, 6, 8, 1.5, 2.5, 0.5] : [1.5, 2.5, 3.5, 0.5, 4.5];
          return {
            q: raw`A pipe ${typeTxt(closed)} has a fundamental frequency of $${f1}\ \text{Hz}$. Which of the following is also a resonant frequency of the pipe?`,
            ...mcv(R, good * f1, R.shuffle(bad).map(x => x * f1), x => `$${F.num(x, 4)}\\ \\text{Hz}$`),
            expl: closed ? raw`A pipe closed at one end supports only odd multiples of the fundamental: $${f1}, ${3 * f1}, ${5 * f1}, \dots\ \text{Hz}$. So $${good * f1}\ \text{Hz} = ${good}f_1$ is allowed, while even multiples are not.` : raw`An open–open pipe supports every integer multiple of $f_1 = ${f1}\ \text{Hz}$, so $${good * f1}\ \text{Hz} = ${good}f_1$ is allowed; non-integer multiples are not.`,
          };
        }
        const f = R.pick([200, 240, 300, 400, 440, 500, 600]);
        return {
          q: raw`A pipe open at both ends has a fundamental frequency of $${f}\ \text{Hz}$. One end is then closed. What is the new fundamental frequency?`,
          ...GRE.numeric(R, f / 2, [2 * f, f, f / 4, 1.5 * f], { unit: raw`\text{Hz}`, sig: 3 }),
          level: 1,
          expl: raw`Open–open: $\lambda_1 = 2L$; closed–open: $\lambda_1 = 4L$. Doubling the wavelength halves the frequency: $${f / 2}\ \text{Hz}$.`,
        };
      },
    },
    {
      id: 'optics.string.harmonics', sec: '3.4.3', level: 2, weight: 2,
      gen(R) {
        const mode = R.weighted(['freq', 'tension', 'consec', 'nodes', 'wavelength'], [3, 2, 2, 2, 1]);
        const HN = [null, 'fundamental (first harmonic)', 'second harmonic', 'third harmonic', 'fourth harmonic', 'fifth harmonic'];
        if (mode === 'freq') {
          for (let tries = 0; tries < 80; tries++) {
            const mu = R.pick([0.001, 0.002, 0.004, 0.005, 0.01, 0.02, 0.025]);
            const vv = R.pick([40, 50, 60, 80, 100, 120, 150, 200, 240, 300]);
            const T = mu * vv * vv;
            if (T < 1 || T > 2000 || Math.abs(F.round(T, 2) - T) > 1e-9 * T) continue;
            const L = R.pick([0.5, 0.6, 0.75, 0.8, 1, 1.2, 1.5, 2]);
            const n = R.int(1, 4);
            const ov = n > 1 && R.bool(0.4);
            const name = ov ? `${ORD[n - 1]} overtone` : HN[n];
            const f = n * vv / (2 * L);
            return {
              q: raw`A string of length $${F.num(L, 3)}\ \text{m}$ and linear mass density $${F.num(mu * 1000, 3)}\ \text{g/m}$ is fixed at both ends and held at a tension of $${F.num(T, 3)}\ \text{N}$. What is the frequency of its ${name}?`,
              ...GRE.numeric(R, f, [n * vv / L, n * vv / (4 * L), ov ? (n - 1) * vv / (2 * L) : (n + 1) * vv / (2 * L), vv / (2 * L) === f ? 3 * f : vv / (2 * L)], { unit: raw`\text{Hz}`, sig: 3, tol: 0.08 }),
              expl: raw`$v = \sqrt{T/\mu} = ${vv}\ \text{m/s}$; a string fixed at both ends has $f_n = nv/2L$.${ov ? ` The ${ORD[n - 1]} overtone is the ${HN[n]} ($n = ${n}$).` : ''} So $f = ${n}(${vv})/(2\times${F.num(L, 3)}) = ${F.num(f, 3)}\ \text{Hz}$.`,
            };
          }
          throw new Error('no string');
        }
        if (mode === 'tension') {
          const [f1, f2] = R.pick([[200, 300], [220, 440], [300, 400], [400, 300], [200, 250], [240, 360], [500, 400], [330, 440], [100, 150]]);
          const T1 = R.pick([40, 50, 60, 80, 90, 100, 120, 160]);
          const T2 = T1 * (f2 / f1) ** 2;
          return {
            q: raw`A guitar string under a tension of $${T1}\ \text{N}$ has a fundamental frequency of $${f1}\ \text{Hz}$. To what tension must it be adjusted (length and mass unchanged) to give a fundamental of $${f2}\ \text{Hz}$?`,
            ...GRE.numeric(R, T2, [T1 * f2 / f1, T1 * Math.sqrt(f2 / f1), T1 * (f1 / f2) ** 2, T1 * (f2 / f1) ** 4], { unit: raw`\text{N}`, sig: 3, tol: 0.06 }),
            expl: raw`$f \propto v \propto \sqrt{T}$, so $T_2 = T_1(f_2/f_1)^2 = ${T1}(${f2}/${f1})^2 = ${F.num(T2, 3)}\ \text{N}$.`,
          };
        }
        if (mode === 'consec') {
          const f1 = R.pick([40, 50, 60, 70, 80, 90, 110, 120, 150]);
          const k = R.int(2, 6);
          const L = R.pick([0.5, 0.6, 0.8, 1, 1.25, 1.5, 2]);
          const askV = R.bool();
          const fa = k * f1, fb = (k + 1) * f1;
          return {
            q: raw`A string fixed at both ends has two consecutive resonant frequencies of $${fa}\ \text{Hz}$ and $${fb}\ \text{Hz}$.${askV ? ` The string is $${F.num(L, 3)}\\ \\text{m}$ long. What is the speed of waves on the string?` : ' What is its fundamental frequency?'}`,
            ...(askV ? GRE.numeric(R, 2 * L * f1, [L * f1, 4 * L * f1, 2 * L * fa, L * f1 / 2], { unit: raw`\text{m/s}`, sig: 3, tol: 0.08 })
              : GRE.numeric(R, f1, [f1 / 2, fa, 2 * f1, (fa + fb) / 2].filter(x => x !== f1), { unit: raw`\text{Hz}`, sig: 3, tol: 0.08 })),
            expl: raw`All harmonics $nf_1$ are present on a string fixed at both ends, so consecutive resonances differ by $f_1 = ${fb} - ${fa} = ${f1}\ \text{Hz}$${askV ? `, and $v = \\lambda_1 f_1 = 2Lf_1 = ${F.num(2 * L * f1, 3)}\\ \\text{m/s}$` : ''}.`,
          };
        }
        if (mode === 'nodes') {
          const n = R.int(2, 6);
          const ov = R.bool(0.4);
          const name = ov ? `${ORD[n - 1]} overtone` : `${ORD[n]} harmonic`;
          const askNodes = R.bool();
          const corr = askNodes ? n + 1 : n;
          return {
            q: raw`A string fixed at both ends vibrates in its ${name}. How many ${askNodes ? 'nodes, including the two fixed ends,' : 'antinodes'} does the standing wave have?`,
            ...mcv(R, corr, [corr - 1, corr + 1, corr + 2, corr - 2, 2 * n].filter(x => x >= 1), x => `$${x}$`),
            level: 1,
            expl: raw`The ${name} is the mode $n = ${n}$ (${n} half-wavelengths on the string)${ov ? '; the $k$th overtone is the $(k+1)$th harmonic' : ''}. It has $n = ${n}$ antinodes and $n + 1 = ${n + 1}$ nodes counting the ends.`,
          };
        }
        const L = R.pick([0.6, 0.8, 1, 1.2, 1.5, 2, 3]);
        const n = R.int(1, 5);
        const lam = 2 * L / n;
        return {
          q: raw`A string of length $${F.num(L, 3)}\ \text{m}$ fixed at both ends vibrates in its ${HN[n]}. What is the wavelength of the standing wave?`,
          ...GRE.numeric(R, lam, [L / n, 4 * L / n, 2 * L * n, n > 1 ? 2 * L / (n - 1) : 4 * L], { unit: raw`\text{m}`, sig: 3, tol: 0.08 }),
          level: 1,
          expl: raw`Mode $n$ fits $n$ half-wavelengths: $L = n\lambda/2$, so $\lambda = 2L/n = ${F.num(lam, 3)}\ \text{m}$.`,
        };
      },
    },
    {
      id: 'optics.beats', sec: '3.4.3', level: 2, weight: 2,
      gen(R) {
        const mode = R.weighted(['simple', 'tune', 'temp', 'tension', 'envelope'], [2, 3, 2, 2, 2]);
        if (mode === 'simple' || mode === 'envelope') {
          const f1 = R.pick([256, 300, 320, 400, 440, 480, 512, 600, 880]);
          const d = R.pick([2, 3, 4, 5, 6, 8, 10]);
          const f2 = f1 + R.sign() * d;
          if (mode === 'simple') {
            const askT = R.bool();
            return {
              q: raw`Two tuning forks with frequencies $${f1}\ \text{Hz}$ and $${f2}\ \text{Hz}$ are sounded together. ${askT ? 'What is the time between successive maxima of loudness?' : 'How many beats per second are heard?'}`,
              ...(askT ? GRE.numeric(R, 1 / d, [2 / d, 1 / (2 * d), 2 / (f1 + f2), 1 / (f1 + f2)], { unit: raw`\text{s}`, sig: 3, tol: 0.08 })
                : GRE.numeric(R, d, [2 * d, d / 2, (f1 + f2) / 2, f1 + f2], { unit: raw`\text{Hz}`, sig: 3, tol: 0.08 })),
              level: 1,
              expl: raw`The beat frequency is $|f_1 - f_2| = ${d}\ \text{Hz}$${askT ? `, so loudness maxima are $1/${d} = ${F.num(1 / d, 3)}\\ \\text{s}$ apart` : ''}.`,
            };
          }
          const avg = (f1 + f2) / 2;
          return {
            q: raw`Two pure tones of $${f1}\ \text{Hz}$ and $${f2}\ \text{Hz}$ with equal amplitudes are played together. The listener hears a single tone whose loudness pulsates. What is the frequency of that tone?`,
            ...mcv(R, avg, [d, f1 + f2, d / 2, 2 * d], x => `$${F.num(x, 4)}\\ \\text{Hz}$`),
            expl: raw`$\cos 2\pi f_1t + \cos 2\pi f_2t = 2\cos\!\big(2\pi\tfrac{f_1 - f_2}{2}t\big)\cos\!\big(2\pi\tfrac{f_1 + f_2}{2}t\big)$: a tone at the average frequency $${F.num(avg, 4)}\ \text{Hz}$ whose amplitude envelope produces $|f_1 - f_2| = ${d}$ beats per second.`,
          };
        }
        if (mode === 'tune') {
          const fF = R.pick([256, 320, 384, 440, 480, 512]);
          const b = R.pick([2, 3, 4, 5, 6]);
          const wax = R.bool(0.35);
          const inc = R.bool();
          // tightening raises string: beats increase -> string above fork. wax lowers fork: beats increase -> string above fork
          const above = wax ? inc : inc;
          const fs = above ? fF + b : fF - b;
          const action = wax ? 'A small piece of wax is then stuck to the tuning fork, slightly lowering its frequency' : 'The string is then tightened slightly';
          return {
            q: raw`A piano string sounded together with a $${fF}\ \text{Hz}$ tuning fork produces ${b} beats per second. ${action}, and the beat frequency ${inc ? 'increases' : 'decreases'}. What was the original frequency of the string?`,
            ...mcv(R, fs, [above ? fF - b : fF + b, fF, fF + 2 * b, fF - 2 * b, b], x => `$${x}\\ \\text{Hz}$`),
            expl: wax
              ? raw`The string is at $${fF} \pm ${b}\ \text{Hz}$. Lowering the fork moves it ${inc ? 'away from' : 'toward'} the string, so the string is ${above ? 'above' : 'below'} the fork: $${fs}\ \text{Hz}$.`
              : raw`The string is at $${fF} \pm ${b}\ \text{Hz}$. Tightening raises its frequency; the beats ${inc ? 'increase, so it was already above' : 'decrease, so it was below'} the fork: $${fs}\ \text{Hz}$.`,
          };
        }
        if (mode === 'temp') {
          const f = R.pick([220, 256, 300, 440, 500, 600]);
          const T1 = R.pick([290, 293, 300]);
          const dT = R.pick([3, 4, 6, 9, 12]);
          const beat = f * (Math.sqrt((T1 + dT) / T1) - 1);
          return {
            q: raw`Two identical organ pipes each have a fundamental of $${f}\ \text{Hz}$ when the air in them is at $${T1 - 273}^\circ\text{C}$. The air in one pipe is warmed by $${dT}\ \text{K}$. Approximately what beat frequency is heard when both pipes sound their fundamentals?`,
            ...GRE.numeric(R, beat, [beat * 2, beat / 2, f * dT / (T1 - 273) / 2, beat * 4], { unit: raw`\text{Hz}`, sig: 2, tol: 0.15 }),
            level: 3,
            expl: raw`The pipe frequency is proportional to the sound speed, $\propto\sqrt{T}$ (kelvin). For small changes $\Delta f/f \approx \tfrac12\Delta T/T = \tfrac12(${dT}/${T1})$, so $\Delta f \approx ${F.num(beat, 2)}\ \text{Hz}$. Forgetting the $\tfrac12$ doubles the answer.`,
          };
        }
        const f = R.pick([200, 220, 300, 400, 440, 500]);
        const pct = R.pick([1, 2, 3, 4]);
        const beat = f * (Math.sqrt(1 + pct / 100) - 1);
        return {
          q: raw`Two identical strings are tuned to $${f}\ \text{Hz}$. The tension in one is then increased by $${pct}\%$. Approximately how many beats per second are heard when both are plucked?`,
          ...GRE.numeric(R, beat, [beat * 2, beat / 2, beat * 4], { unit: raw`\text{Hz}`, sig: 2, tol: 0.15 }),
          level: 3,
          expl: raw`$f \propto \sqrt{T}$, so $\Delta f/f \approx \tfrac12\Delta T/T = ${F.num(pct / 200, 2)}$ and $\Delta f \approx ${F.num(beat, 2)}\ \text{Hz}$.`,
        };
      },
    },
    {
      id: 'optics.pipe.concept', sec: '3.4.3', level: 2,
      gen(R) {
        const T = [
          ['A pipe closed at one end supports only odd harmonics of its fundamental.', 'its modes fit odd numbers of quarter wavelengths.'],
          ['At an open end of a pipe, the pressure variation is approximately zero.', 'the air there equilibrates with the atmosphere (a pressure node).'],
          ['At a closed end of a pipe there is a displacement node and a pressure antinode.', 'the air cannot move against the cap.'],
          ['Warming the air in an organ pipe raises its resonant frequencies.', 'the sound speed grows as $\\sqrt{T}$ while the wavelengths are fixed by the pipe.'],
          ['Filling a pipe with helium raises its resonant frequencies.', 'sound is faster in helium.'],
          ['The fundamental wavelength of a pipe of length $L$ open at both ends is $2L$.', 'half a wavelength fits between the two pressure nodes.'],
          ['Closing one end of a pipe that was open at both ends halves its fundamental frequency.', 'the fundamental wavelength doubles from $2L$ to $4L$.'],
        ];
        const Fz = [
          ['There is a pressure node at the closed end of a pipe.', 'the closed end is a pressure antinode.'],
          ['The fundamental wavelength of a pipe of length $L$ closed at one end is $2L$.', 'it is $4L$.'],
          ['A pipe open at both ends supports only odd harmonics.', 'it supports all harmonics.'],
          ['Sound waves in a pipe are transverse waves.', 'sound in air is longitudinal.'],
          ['Warming the air in an organ pipe lowers its fundamental frequency.', 'it raises it, since the sound speed increases.'],
          ['A pipe closed at one end has twice the fundamental frequency of an open pipe of the same length.', 'it has half the fundamental frequency.'],
        ];
        if (R.bool(0.55)) {
          const r = romanPick(R, T, Fz, 'Which of the following statements about standing sound waves in pipes is (are) true?');
          return { q: r.q, choices: r.choices, ans: r.ans, expl: 'Open ends are pressure nodes, closed ends pressure antinodes. ' + r.why };
        }
        const r = conceptPick(R, T, Fz, 'Which of the following statements about standing sound waves in pipes is correct?', 'Which of the following statements about standing sound waves in pipes is NOT correct?');
        return { q: r.q, choices: r.choices, ans: r.ans, level: 1, expl: 'The answer is the statement shown: ' + r.why };
      },
    },
  ]);
})(typeof window !== 'undefined' ? window.GRE : this.GRE);
