/* Quantum Mechanics, part A — §5.1–5.3 of Conquering the Physics GRE:
 * formalism (wavefunctions, Dirac notation, Schrödinger equation, commutators),
 * the harmonic oscillator, and the other standard 1D Hamiltonians.
 * Sections 5.4–5.6 live in qm-2.js. Templates follow tools/AUTHORING.md.
 */
(function (GRE) {
  'use strict';
  const F = GRE.fmt;
  const raw = String.raw;
  const gcd = F.gcd;

  const HC = GRE.C.hc_eVnm;                 // 1240 eV nm
  const HBARC = HC / (2 * Math.PI);         // 197 eV nm
  const HBAR_EVS = GRE.C.hbar / GRE.C.eV;   // 6.6e-16 eV s
  const H_EVS = GRE.C.h / GRE.C.eV;         // 4.1e-15 eV s
  const MEC2 = GRE.C.mec2_MeV * 1e6;        // electron rest energy, eV
  const MPC2 = GRE.C.mpc2_MeV * 1e6;        // proton rest energy, eV

  // ------------------------------------------------------------------ helpers
  const ORD = ['ground', 'first excited', 'second excited', 'third excited', 'fourth excited', 'fifth excited', 'sixth excited', 'seventh excited', 'eighth excited'];
  const ROMAN = ['I', 'II', 'III'];
  const KET = s => raw`|${s}\rangle`;
  const $ = s => '$' + s + '$';
  const Q = (n, d = 1) => { if (d < 0) { n = -n; d = -d; } const g = gcd(n, d) || 1; return [n / g, d / g]; };
  const isSq = n => n >= 0 && Math.round(Math.sqrt(n)) ** 2 === n;
  const near = (a, b, tol) => a === b || Math.abs(a - b) <= tol * Math.max(Math.abs(a), Math.abs(b));

  /** Choices from [tex, value] pairs (tex without $). Drops wrongs whose value is
   *  within tol of an already accepted one; ranks by value unless opts.shuffle. */
  function mcV(R, correct, wrongs, opts = {}) {
    const tol = opts.tol == null ? 1e-6 : opts.tol;
    const vals = [correct[1]], seen = new Set([GRE.norm(correct[0])]);
    const val = new Map([[$(correct[0]), correct[1]]]);
    const ws = [];
    for (const w of wrongs) {
      if (!w || w[0] == null || w[1] == null || !isFinite(w[1])) continue;
      if (seen.has(GRE.norm(w[0]))) continue;
      if (vals.some(v => near(v, w[1], tol))) continue;
      vals.push(w[1]); seen.add(GRE.norm(w[0]));
      val.set($(w[0]), w[1]); ws.push($(w[0]));
    }
    const o = { keep: opts.keep };
    if (!opts.shuffle) o.rank = s => val.get(s);
    return GRE.mc(R, $(correct[0]), ws, o);
  }
  /** plain string choices (tex without $), shuffled */
  const mcS = (R, correct, wrongs, opts = {}) => GRE.mc(R, $(correct), wrongs.filter(w => w != null).map($), opts);

  /** k * sym in TeX, for k rational or the square root of a rational: (1/sqrt3, 'a') -> \frac{a}{\sqrt{3}} */
  function mono(k, sym = '') {
    if (k === 0) return '0';
    const sg = k < 0 ? '-' : '';
    const ak = Math.abs(k);
    let r = F.toRational(ak, 2000);
    if (r) {
      const [p, q] = r;
      const top = (p === 1 && sym ? '' : String(p)) + sym;
      return sg + (q === 1 ? top : raw`\frac{${top}}{${q}}`);
    }
    r = F.toRational(ak * ak, 20000);
    if (!r) throw new Error('mono: cannot write ' + k);
    const [o1, i1] = F.surdParts(r[0]), [o2, i2] = F.surdParts(r[1]);
    const g = gcd(o1, o2), A = o1 / g, B = o2 / g;
    let top = (A === 1 && (i1 > 1 || sym) ? '' : String(A)) + (i1 > 1 ? raw`\sqrt{${i1}}` : '');
    if (sym) top += (i1 > 1 ? raw`\,` : '') + sym;
    const bot = (B === 1 && i2 > 1 ? '' : B === 1 ? '' : String(B)) + (i2 > 1 ? raw`\sqrt{${i2}}` : '');
    return sg + (bot ? raw`\frac{${top}}{${bot}}` : top);
  }
  /** (p/q) * num/den as one fraction: fracSym(7, 2, '\\hbar', 'm\\omega') -> \frac{7\hbar}{2m\omega} */
  function fracSym(p, q, num, den = '') {
    if (p === 0) return '0';
    const sg = (p < 0) !== (q < 0) ? '-' : '';
    p = Math.abs(p); q = Math.abs(q);
    const g = gcd(p, q); p /= g; q /= g;
    const top = (p === 1 && num ? '' : String(p)) + num;
    const bot = (q === 1 ? '' : String(q)) + den;
    return sg + (bot ? raw`\frac{${top}}{${bot}}` : top);
  }
  /** p/q times a symbol written after the fraction: \frac{7}{2}\hbar\omega */
  const cs = (p, q, sym) => { const c = F.coef(p, q); return c + sym; };

  // ---- complex numbers [re, im] with integer parts
  const cMul = (a, b) => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]];
  const cAdd = (a, b) => [a[0] + b[0], a[1] + b[1]];
  const cConj = a => [a[0], -a[1]];
  const cNeg = a => [-a[0], -a[1]];
  const cAbs2 = a => a[0] * a[0] + a[1] * a[1];
  function cTeX(c) {
    const [a, b] = c;
    if (b === 0) return String(a);
    const im = b === 1 ? 'i' : b === -1 ? '-i' : b + 'i';
    if (a === 0) return im;
    return a + (b > 0 ? '+' : '') + im;
  }
  /** complex number (re + i im)/d in lowest terms */
  function cqTeX(z, d = 1) {
    let [a, b] = z;
    if (d < 0) { a = -a; b = -b; d = -d; }
    const g = gcd(gcd(Math.abs(a), Math.abs(b)), d) || 1;
    a /= g; b /= g; d /= g;
    if (d === 1) return cTeX([a, b]);
    if (b === 0) return F.frac(a, d);
    if (a === 0) { const B = Math.abs(b); return (b < 0 ? '-' : '') + raw`\frac{${B === 1 ? '' : B}i}{${d}}`; }
    return raw`\frac{${cTeX([a, b])}}{${d}}`;
  }
  /** linear combination  c1|l1> + c2|l2> + ... ; labels are TeX ket contents (or full symbols when sym=true) */
  function combo(coefs, labels, sym) {
    let s = '';
    coefs.forEach((c, i) => {
      const thing = sym ? labels[i] : KET(labels[i]);
      let sign = '+', body;
      if (c[1] === 0) { sign = c[0] < 0 ? '-' : '+'; const m = Math.abs(c[0]); body = m === 1 ? '' : String(m); }
      else if (c[0] === 0) { sign = c[1] < 0 ? '-' : '+'; const m = Math.abs(c[1]); body = (m === 1 ? '' : m) + 'i'; }
      else body = '(' + cTeX(c) + ')';
      if (i === 0) s += (sign === '-' ? '-' : '') + body + thing;
      else s += ` ${sign} ` + body + thing;
    });
    return s;
  }
  const COEF = [[1, 0], [2, 0], [3, 0], [-1, 0], [-2, 0], [0, 1], [0, -1], [0, 2], [0, -2], [1, 1], [1, -1], [-1, 1], [2, 1], [1, 2], [1, -2], [0, 3]];
  /** 1/sqrt(N) in TeX */
  const invSqrt = N => isSq(N) ? F.frac(1, Math.round(Math.sqrt(N))) : raw`\frac{1}{\sqrt{${N}}}`;
  const ex = x => F.exact(x, 400);

  /** three Roman-numeral statements (at least one true) from pools of [text, why] */
  function romanQ(R, intro, T, Fs, opts = {}) {
    const nTrue = R.int(1, Math.min(3, T.length));
    const st = R.shuffle(R.pickN(T, nTrue).map(s => [s, true]).concat(R.pickN(Fs, 3 - nTrue).map(s => [s, false])));
    return {
      q: GRE.romanStem(intro, st.map(x => x[0][0])),
      ...GRE.roman(R, st.map(x => x[1])),
      expl: (opts.pre ? opts.pre + ' ' : '') + st.map((x, i) => `${ROMAN[i]} is ${x[1] ? 'true' : 'false'}: ${x[0][1]}`).join(' '),
    };
  }
  /** "which one is NOT true" (or "which one is true") from pools of [text, why] */
  function oddOneQ(R, stem, odd, others) {
    const pick = R.pickN(others, 4);
    return {
      q: stem,
      ...GRE.mc(R, odd[0], pick.map(x => x[0])),
      expl: odd[1],
    };
  }

  // ---- harmonic-oscillator / square-well wavefunction sketch
  function waveSVG(kind, n, sgn) {
    const W = 320, H = 150, y0 = 78, amp = 52;
    const pts = [];
    let extra = '';
    if (kind === 'isw') {
      const xa = 45, xb = 275;
      for (let i = 0; i <= 240; i++) {
        const u = i / 240;
        pts.push([xa + (xb - xa) * u, y0 - sgn * amp * Math.sin(n * Math.PI * u)]);
      }
      extra = `<line x1="${xa}" y1="12" x2="${xa}" y2="142" stroke="currentColor" stroke-width="2.5"/>` +
        `<line x1="${xb}" y1="12" x2="${xb}" y2="142" stroke="currentColor" stroke-width="2.5"/>` +
        `<line x1="${xa}" y1="${y0}" x2="${xb + 25}" y2="${y0}" stroke="currentColor" stroke-width="0.8"/>` +
        `<text x="${xa - 4}" y="${y0 + 16}" font-size="12" fill="currentColor" text-anchor="end">0</text>` +
        `<text x="${xb + 4}" y="${y0 + 16}" font-size="12" fill="currentColor">L</text>` +
        `<text x="${xb + 28}" y="${y0 + 4}" font-size="12" fill="currentColor">x</text>`;
    } else {
      const X = 5.2;
      const herm = xi => { let h0 = 1, h1 = 2 * xi; if (n === 0) return h0; for (let k = 1; k < n; k++) { const h2 = 2 * xi * h1 - 2 * k * h0; h0 = h1; h1 = h2; } return h1; };
      const f = xi => herm(xi) * Math.exp(-xi * xi / 2);
      let mx = 0;
      for (let i = 0; i <= 400; i++) mx = Math.max(mx, Math.abs(f(-X + 2 * X * i / 400)));
      for (let i = 0; i <= 260; i++) {
        const xi = -X + 2 * X * i / 260;
        pts.push([20 + 280 * i / 260, y0 - sgn * amp * f(xi) / mx]);
      }
      extra = `<line x1="12" y1="${y0}" x2="306" y2="${y0}" stroke="currentColor" stroke-width="0.8"/>` +
        `<line x1="160" y1="16" x2="160" y2="140" stroke="currentColor" stroke-width="0.5" stroke-dasharray="3 3"/>` +
        `<text x="163" y="${y0 + 16}" font-size="12" fill="currentColor">0</text>` +
        `<text x="309" y="${y0 + 4}" font-size="12" fill="currentColor">x</text>`;
    }
    const d = 'M' + pts.map(p => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' L');
    return `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">` + extra +
      `<path d="${d}" stroke="currentColor" fill="none" stroke-width="2"/>` +
      `<text x="8" y="16" font-size="13" fill="currentColor" font-style="italic">ψ(x)</text></svg>`;
  }

  GRE.addTemplates('qm', [
    // ================================================================ 5.1.1 Wavefunctions and operators
    {
      id: 'qm.wf.normalize', sec: '5.1.1', level: 2,
      gen(R) {
        const s = R.pick(['a', 'b', 'L', raw`\ell`]);
        const sp = k => (k === 1 ? s : `${s}^{${k}}`);
        // A = sqrt(p / (q s^k)) when root, else p / (q s^k)
        const fm = (p, q, k, root = true) => { const [P, D] = Q(p, q); const t = raw`\frac{${P}}{${D === 1 ? '' : D}${sp(k)}}`; return root ? raw`\sqrt{${t}}` : t; };
        const restricted = d => raw` for $${d}$ and $\psi(x) = 0$ elsewhere`;
        const m = R.pick([1, 1, 2, 3]);
        const mx = m === 1 ? '' : m;
        const n = R.pick([1, 2, 3]);
        const G = {
          g1: raw`\frac{1}{(\pi ${sp(2)})^{1/4}}`, g2: raw`\left(\frac{2}{\pi ${sp(2)}}\right)^{1/4}`, g3: raw`\frac{1}{\sqrt{\pi}\,${s}}`,
          g4: raw`\frac{1}{\sqrt{2\pi}\,${s}}`, g5: raw`\frac{1}{(2\pi ${sp(2)})^{1/4}}`, g6: raw`\frac{1}{(\pi ${s})^{1/4}}`,
        };
        const cases = [
          { psi: raw`Ae^{-${mx}|x|/${s}}`, dom: ' for all $x$', X: m === 1 ? s : raw`\frac{${s}}{${m}}`, A: fm(m, 1, 1),
            W: [fm(2 * m, 1, 1), fm(m, 2, 1), fm(m, 2, 1, false), m > 1 ? fm(1, m, 1) : fm(1, 4, 1), m > 1 ? fm(1, 1, 1) : fm(4, 1, 1)] },
          { psi: raw`Ae^{-${mx}x/${s}}`, dom: restricted(raw`x \ge 0`), X: raw`\frac{${s}}{${2 * m}}`, A: fm(2 * m, 1, 1),
            W: [fm(m, 1, 1), fm(4 * m, 1, 1), fm(m, 1, 1, false), fm(m, 2, 1), m > 1 ? fm(2, 1, 1) : fm(1, 4, 1)] },
          { psi: raw`Ax(${s} - x)`, dom: restricted(raw`0 \le x \le ${s}`), X: raw`\frac{${sp(5)}}{30}`, A: fm(30, 1, 5),
            W: [fm(6, 1, 3, false), fm(6, 1, 3), fm(15, 1, 5), fm(60, 1, 5), fm(30, 1, 3)] },
          { psi: raw`A\left(1 - \frac{|x|}{${s}}\right)`, dom: restricted(raw`|x| \le ${s}`), X: raw`\frac{2${s}}{3}`, A: fm(3, 2, 1),
            W: [fm(3, 1, 1), fm(1, 1, 1, false), fm(2, 3, 1), fm(3, 4, 1), fm(1, 1, 1)] },
          { psi: raw`A(${sp(2)} - x^2)`, dom: restricted(raw`|x| \le ${s}`), X: raw`\frac{16${sp(5)}}{15}`, A: fm(15, 16, 5),
            W: [fm(15, 8, 5), fm(3, 4, 3, false), fm(16, 15, 5), fm(15, 16, 3), fm(15, 32, 5)] },
          { psi: raw`Axe^{-x/${s}}`, dom: restricted(raw`x \ge 0`), X: raw`\frac{${sp(3)}}{4}`, A: fm(4, 1, 3),
            W: [fm(1, 1, 2, false), fm(2, 1, 3), fm(8, 1, 3), fm(1, 1, 3), fm(4, 1, 1)] },
          { psi: raw`A\sin(${n === 1 ? '' : n}\pi x/${s})`, dom: restricted(raw`0 \le x \le ${s}`), X: raw`\frac{${s}}{2}`, A: fm(2, 1, 1),
            W: [fm(1, 1, 1), n % 2 ? raw`\frac{${n === 1 ? '' : n}\pi}{2${s}}` : fm(1, 2, 1), fm(2, 1, 1, false), fm(4, 1, 1), n > 1 ? fm(2 * n, 1, 1) : fm(1, 2, 1)] },
          { psi: raw`Ae^{-x^2/2${sp(2)}}`, dom: ' for all $x$', X: raw`\sqrt{\pi}\,${s}`, A: G.g1, W: [G.g2, G.g3, G.g4, G.g5, G.g6] },
          { psi: raw`Ae^{-x^2/${sp(2)}}`, dom: ' for all $x$', X: raw`\sqrt{\pi/2}\,${s}`, A: G.g2, W: [G.g1, G.g3, G.g4, G.g5, G.g6] },
        ];
        const c = R.pick(cases);
        return {
          q: raw`A particle moving in one dimension has the wavefunction $\psi(x) = ${c.psi}$${c.dom}, where $${s}$ is a positive constant with dimensions of length. What value of the positive real constant $A$ normalizes $\psi$?`,
          ...mcS(R, c.A, c.W),
          expl: raw`Normalization requires $\int|\psi|^2\,dx = A^2\cdot ${c.X} = 1$, so $A = ${c.A}$. Quick check: in one dimension $\psi$ must have dimensions of (length)$^{-1/2}$, which rules out several choices at once; a common slip is to integrate $|\psi|$ instead of $|\psi|^2$.`,
        };
      },
    },
    {
      id: 'qm.wf.probregion', sec: '5.1.1', level: 2,
      gen(R) {
        const kind = R.pick(['tri', 'para', 'poly', 'exp', 'exp', 'step', 'step']);
        const fa = (p, q, s) => (p === q ? s : `${p === 1 ? '' : p}${s}${q === 1 ? '' : '/' + q}`);
        const qa = (a, b) => Q(a[0] * b[1] + b[0] * a[1], a[1] * b[1]);
        const qs = (a, b) => qa(a, [-b[0], b[1]]);
        const qh = a => Q(a[0], 2 * a[1]);
        const ONE = [1, 1];
        const T = z => [F.frac(z[0], z[1]), z[0] / z[1]];
        if (kind === 'exp') {
          const j = R.int(1, 4);      // 2d/a = j
          const d = fa(j, 2, 'a');
          const e = x => (x === 1 ? 'e^{-1}' : `e^{-${x}}`);
          const eh = j2 => (j2 % 2 === 0 ? e(j2 / 2) : `e^{-${j2}/2}`); // e^{-j2/2}
          const reg = R.pick(['in', 'in', 'out', 'right']);
          const E = Math.exp(-j), Eh = Math.exp(-j / 2);
          let cor, W, where;
          if (reg === 'in') {
            where = raw`within $|x| < ${d}$`; cor = ['1 - ' + e(j), 1 - E];
            W = [['1 - ' + eh(j), 1 - Eh], [e(j), E], [raw`\frac{1 - ${e(j)}}{2}`, (1 - E) / 2], ['1 - ' + e(2 * j), 1 - E * E], [eh(j), Eh]];
          } else if (reg === 'out') {
            where = raw`at $|x| > ${d}$`; cor = [e(j), E];
            W = [['1 - ' + e(j), 1 - E], [eh(j), Eh], [e(2 * j), E * E], [raw`\frac{1}{2}${e(j)}`, E / 2], ['1 - ' + eh(j), 1 - Eh]];
          } else {
            where = raw`at $x > ${d}$`; cor = [raw`\frac{1}{2}${e(j)}`, E / 2];
            W = [[e(j), E], [raw`\frac{1}{2}${eh(j)}`, Eh / 2], [raw`\frac{1}{2}${e(2 * j)}`, E * E / 2], [raw`\frac{1 - ${e(j)}}{2}`, (1 - E) / 2], [eh(j), Eh]];
          }
          return {
            q: raw`A particle has the wavefunction $\psi(x) = Ae^{-|x|/a}$, where $a > 0$ and $A$ is a normalization constant. What is the probability that a measurement of position finds the particle ${where}?`,
            ...mcV(R, cor, W),
            expl: raw`$|\psi|^2 \propto e^{-2|x|/a}$, so $P(|x| < d) = \dfrac{\int_0^d e^{-2x/a}dx}{\int_0^\infty e^{-2x/a}dx} = 1 - e^{-2d/a}$, and each side of the origin carries half of any symmetric region. With $d = ${d}$, $e^{-2d/a} = ${e(j)}$, giving $${cor[0]}$. Squaring the wavefunction doubles the decay rate; forgetting that gives $${eh(j)}$ instead of $${e(j)}$.`,
          };
        }
        if (kind === 'step') {
          let l1, l2, c1, c2, A1, A2, first, cor, W;
          for (let tries = 0; ; tries++) {
            l1 = R.pick([1, 1, 2, 3]); l2 = R.pick([1, 2, 3]);
            c1 = R.pick([[1, 0], [2, 0], [3, 0], [0, 1], [0, 2], [-1, 0], [1, 1]]); c2 = R.pick([[1, 0], [2, 0], [-2, 0], [0, 1], [0, -2], [3, 0], [1, -1]]);
            A1 = cAbs2(c1); A2 = cAbs2(c2);
            first = R.bool();
            const [wa, wb] = first ? [A1 * l1, A2 * l2] : [A2 * l2, A1 * l1];
            const m1 = Math.sqrt(A1), m2 = Math.sqrt(A2);
            const [ma, mb, la, lb, Aa, Ab] = first ? [m1, m2, l1, l2, A1, A2] : [m2, m1, l2, l1, A2, A1];
            cor = T(Q(wa, wa + wb));
            W = [T(Q(la, la + lb)), T(Q(Aa, Aa + Ab)), T(Q(wb, wa + wb)), [ex(ma * la / (ma * la + mb * lb)), ma * la / (ma * la + mb * lb)], [ex(ma / (ma + mb)), ma / (ma + mb)], T(Q(1, 2)), T(Q(Ab, Aa + Ab))]
              .filter(w => w[0] && w[1] > 0 && w[1] < 1);
            const vals = [cor[1]];
            W.forEach(w => { if (!vals.some(v => near(v, w[1], 1e-6))) vals.push(w[1]); });
            if (wa !== wb && vals.length >= 5) break;
            if (tries > 40) throw new Error('step: no good draw');
          }
          const L = x => (x === 1 ? 'a' : x + 'a');
          const region = first ? raw`$0 < x < ${L(l1)}$` : raw`$${L(l1)} < x < ${L(l1 + l2)}$`;
          return {
            q: raw`A particle has the wavefunction $\psi(x) = \begin{cases} ${combo([c1], ['A'], true)} & 0 < x < ${L(l1)} \\ ${combo([c2], ['A'], true)} & ${L(l1)} < x < ${L(l1 + l2)} \\ 0 & \text{otherwise} \end{cases}$ where $A$ is a normalization constant. What is the probability that the particle is found in the region ${region}?`,
            ...mcV(R, cor, W),
            expl: raw`The probability is $\int|\psi|^2dx$ over the region divided by the total: $|c|^2\times$(length) for each piece, i.e. $${A1}\cdot ${l1}$ and $${A2}\cdot ${l2}$, so $P = ${cor[0]}$. Both the squared modulus ($|i|^2 = 1$, $|2|^2 = 4$, $|1\pm i|^2 = 2$) and the length of each region matter.`,
          };
        }
        const [p, q] = R.pick({ tri: [[1, 2], [1, 3], [2, 3], [1, 4], [3, 4]], para: [[1, 2], [1, 3], [2, 3], [1, 4]], poly: [[1, 4], [1, 3], [2, 3], [3, 4]] }[kind]);
        const f = [p, q], g = qs(ONE, f);
        const cube = z => Q(z[0] ** 3, z[1] ** 3), sq = z => Q(z[0] ** 2, z[1] ** 2);
        let psi, region, ans, lin, uni, how;
        const reg = kind === 'poly' ? R.pick(p * 2 < q ? ['left', 'right', 'mid'] : ['left', 'right']) : R.pick(['in', 'in', 'out', 'pos', 'right']);
        if (kind === 'tri') {
          psi = raw`A\left(1 - \frac{|x|}{a}\right)$ for $|x| \le a$ and $\psi = 0$ elsewhere`;
          const Pin = qs(ONE, cube(g)), Lin = qs(ONE, sq(g));
          ({ ans, lin, uni } = {
            in: { ans: Pin, lin: Lin, uni: f }, out: { ans: cube(g), lin: sq(g), uni: g },
            pos: { ans: qh(Pin), lin: qh(Lin), uni: qh(f) }, right: { ans: qh(cube(g)), lin: qh(sq(g)), uni: qh(g) },
          }[reg]);
          how = raw`$\int_0^{fa}(1 - x/a)^2dx \big/ \int_0^{a}(1-x/a)^2dx = 1 - (1-f)^3$ with $f = ${F.fracI(p, q)}$, so $P(|x| < ${fa(p, q, 'a')}) = ${F.frac(Pin[0], Pin[1])}$`;
        } else if (kind === 'para') {
          psi = raw`A(a^2 - x^2)$ for $|x| \le a$ and $\psi = 0$ elsewhere`;
          const Pin = Q(15 * p * q ** 4 - 10 * p ** 3 * q * q + 3 * p ** 5, 8 * q ** 5), Lin = Q(3 * p * q * q - p ** 3, 2 * q ** 3);
          ({ ans, lin, uni } = {
            in: { ans: Pin, lin: Lin, uni: f }, out: { ans: qs(ONE, Pin), lin: qs(ONE, Lin), uni: g },
            pos: { ans: qh(Pin), lin: qh(Lin), uni: qh(f) }, right: { ans: qh(qs(ONE, Pin)), lin: qh(qs(ONE, Lin)), uni: qh(g) },
          }[reg]);
          how = raw`with $u = x/a$, $P(|x| < ${fa(p, q, 'a')}) = \dfrac{\int_0^{${F.fracI(p, q)}}(1-u^2)^2du}{\int_0^1(1-u^2)^2du} = \tfrac{15}{8}\left(u - \tfrac{2}{3}u^3 + \tfrac{1}{5}u^5\right)\Big|_{u = ${F.fracI(p, q)}} = ${F.frac(Pin[0], Pin[1])}$`;
        } else {
          psi = raw`Ax(L - x)$ for $0 \le x \le L$ and $\psi = 0$ elsewhere`;
          const P = Q(10 * p ** 3 * q * q - 15 * p ** 4 * q + 6 * p ** 5, q ** 5), Lp = Q(3 * p * p * q - 2 * p ** 3, q ** 3);
          ({ ans, lin, uni } = {
            left: { ans: P, lin: Lp, uni: f }, right: { ans: qs(ONE, P), lin: qs(ONE, Lp), uni: g },
            mid: { ans: qs(ONE, Q(2 * P[0], P[1])), lin: qs(ONE, Q(2 * Lp[0], Lp[1])), uni: qs(ONE, Q(2 * p, q)) },
          }[reg]);
          how = raw`with $u = x/L$, $P(0 < x < ${fa(p, q, 'L')}) = 30\int_0^{${F.fracI(p, q)}}u^2(1-u)^2du = \left(10u^3 - 15u^4 + 6u^5\right)\big|_{u=${F.fracI(p, q)}} = ${F.frac(P[0], P[1])}$` + (reg === 'left' ? '' : ' (and the wavefunction is symmetric about $x = L/2$)');
        }
        const s = kind === 'poly' ? 'L' : 'a';
        region = {
          in: raw`$|x| < ${fa(p, q, s)}$`, out: raw`$|x| > ${fa(p, q, s)}$`, pos: raw`$0 < x < ${fa(p, q, s)}$`, right: raw`$x > ${fa(p, q, s)}$`,
          left: raw`$0 < x < ${fa(p, q, s)}$`, mid: raw`$${fa(p, q, s)} < x < ${fa(q - p, q, s)}$`,
        }[reg];
        const W = [T(lin), T(uni), T(qs(ONE, ans)), T(qh(ans)), T(Q(1, 2))];
        if (ans[0] * 2 <= ans[1]) W.push(T(Q(2 * ans[0], ans[1])));
        return {
          q: raw`A particle has the wavefunction $\psi(x) = ${psi}, where $A$ is a normalization constant. What is the probability that a measurement of position finds the particle in the region ${region}?`,
          ...mcV(R, T(ans), W),
          expl: raw`Probability is the integral of $|\psi|^2$ (not $|\psi|$) over the region, divided by its integral over all space: ${how}. The requested region then gives $${F.frac(ans[0], ans[1])}$. Integrating $|\psi|$ instead of $|\psi|^2$ gives $${F.frac(lin[0], lin[1])}$, and assuming a uniform distribution gives $${F.frac(uni[0], uni[1])}$.`,
        };
      },
    },
    {
      id: 'qm.wf.measure.prob', sec: '5.1.1', level: 1, weight: 2,
      gen(R) {
        const n = R.pick([2, 3, 3, 4]);
        const c = []; for (let i = 0; i < n; i++) c.push(R.pick(COEF));
        const N = c.reduce((s, z) => s + cAbs2(z), 0);
        const labelMode = R.bool();
        const ev = labelMode ? R.pickN([0, 1, 2, 3, 4, 5, 6], n).sort((a, b) => a - b) : R.pickN([-3, -2, -1, 0, 1, 2, 3, 4, 5], n).sort((a, b) => a - b);
        const op = R.pick([raw`\hat Q`, raw`\hat O`, raw`\hat A`, raw`\hat B`]);
        const labels = labelMode ? ev.map(String) : ev.map((_, i) => raw`\phi_${i + 1}`);
        const setup = labelMode
          ? raw`where $|n\rangle$ denotes the normalized eigenstate of the observable $${op}$ with eigenvalue $n$`
          : raw`where $|\phi_k\rangle$ are normalized eigenstates of the observable $${op}$ with eigenvalues ${ev.map((v, i) => raw`$\lambda_${i + 1} = ${v}$`).join(', ')}`;
        const missing = R.bool(0.12);
        let target, cor;
        if (missing) {
          target = R.pick([-1, 0, 1, 2, 3, 4, 5, 6, 7].filter(v => ev.indexOf(v) < 0 && (labelMode ? v >= 0 : true)));
          cor = ['0', 0];
        } else {
          const j = R.int(0, n - 1);
          target = ev[j];
          cor = [F.frac(cAbs2(c[j]), N), cAbs2(c[j]) / N];
        }
        const W = [];
        const jj = ev.indexOf(target);
        if (jj >= 0) {
          const a2 = cAbs2(c[jj]);
          W.push([ex(Math.sqrt(a2 / N)), Math.sqrt(a2 / N)]);
          const re2 = c.map(z => z[0] * z[0] - z[1] * z[1]);
          const S = re2.reduce((s, v) => s + v, 0);
          if (S > 0 && re2[jj] > 0 && re2[jj] < S) W.push([F.frac(re2[jj], S), re2[jj] / S]);
          if (c.every(z => z[0] === 0 || z[1] === 0)) { const m = c.map(z => Math.abs(z[0] + z[1])); const Sm = m.reduce((s, v) => s + v, 0); W.push([F.frac(m[jj], Sm), m[jj] / Sm]); }
        }
        if (jj >= 0) {
          const a2 = cAbs2(c[jj]);
          if (a2 < N) W.push([F.frac(a2, N - a2), a2 / (N - a2)]);
          if (c.every(z => z[0] === 0 || z[1] === 0)) { const Sm = c.reduce((s, z) => s + Math.abs(z[0] + z[1]), 0); W.push([F.frac(a2, Sm * Sm), a2 / (Sm * Sm)]); }
        }
        c.forEach((z, k) => { if (k !== jj) W.push([F.frac(cAbs2(z), N), cAbs2(z) / N]); });
        W.push([F.frac(1, n), 1 / n], [F.frac(1, N), 1 / N], ['1', 1], [F.frac(1, 2 * N), 1 / (2 * N)]);
        return {
          q: raw`A system is in the state $|\psi\rangle = A\left(${combo(c, labels)}\right)$, ${setup}, and $A$ is a normalization constant. If $${op}$ is measured, what is the probability of obtaining the value $${target}$?`,
          ...mcV(R, cor, W),
          expl: missing
            ? raw`A measurement can only return an eigenvalue whose eigenstate appears in the expansion of $|\psi\rangle$; $${target}$ does not appear, so the probability is $0$.`
            : raw`Normalize first: $|A|^2 = 1/\sum|c_k|^2 = 1/${N}$. The probability is $|c|^2/\sum|c_k|^2 = ${cor[0]}$. Remember $|c|^2 = c^*c$ (e.g. $|1+i|^2 = 2$, $|2i|^2 = 4$), and do not use the amplitude itself.`,
        };
      },
    },
    {
      id: 'qm.wf.measure.expect', sec: '5.1.1', level: 2, weight: 2,
      gen(R) {
        const n = R.pick([2, 3, 3]);
        const c = []; for (let i = 0; i < n; i++) c.push(R.pick(COEF));
        const a2 = c.map(cAbs2);
        const N = a2.reduce((s, v) => s + v, 0);
        const labelMode = R.bool();
        const ev = labelMode ? R.pickN([0, 1, 2, 3, 4, 5, 6], n).sort((a, b) => a - b) : R.pickN([-3, -2, -1, 0, 1, 2, 3, 4], n).sort((a, b) => a - b);
        const op = R.pick([raw`\hat Q`, raw`\hat O`, raw`\hat A`]);
        const labels = labelMode ? ev.map(String) : ev.map((_, i) => raw`\phi_${i + 1}`);
        const setup = labelMode
          ? raw`where $|n\rangle$ is the normalized eigenstate of $${op}$ with eigenvalue $n$`
          : raw`where $|\phi_k\rangle$ are normalized eigenstates of $${op}$ with eigenvalues ${ev.map((v, i) => raw`$\lambda_${i + 1} = ${v}$`).join(', ')}`;
        const S1 = ev.reduce((s, v, i) => s + v * a2[i], 0), S2 = ev.reduce((s, v, i) => s + v * v * a2[i], 0);
        const variance = R.bool(0.25);
        const fr = (a, b) => [F.frac(a, b), a / b];
        const W = [];
        let cor;
        if (!variance) {
          cor = fr(S1, N);
          W.push(fr(S1, 1), fr(ev.reduce((s, v) => s + v, 0), n));
          if (c.every(z => z[0] === 0 || z[1] === 0)) { const m = c.map(z => Math.abs(z[0] + z[1])); W.push(fr(ev.reduce((s, v, i) => s + v * m[i], 0), m.reduce((s, v) => s + v, 0))); }
          if (S1 !== 0) W.push([ex(S1 / Math.sqrt(N)), S1 / Math.sqrt(N)]);
          const re2 = c.map(z => z[0] * z[0] - z[1] * z[1]); const Sr = re2.reduce((s, v) => s + v, 0);
          if (Sr !== 0) W.push(fr(ev.reduce((s, v, i) => s + v * re2[i], 0), Sr));
          const imax = a2.indexOf(Math.max(...a2));
          if (a2.filter(v => v === a2[imax]).length === 1) W.push(fr(ev[imax], 1));
          W.push(fr(S2, N), fr(S1, n), fr(ev[0] + ev[n - 1], 2), fr(-S1, N));
        } else {
          cor = fr(S2 * N - S1 * S1, N * N);
          if (cor[1] === 0) throw new Error('zero variance');
          W.push(fr(S2, N), fr(S1 * S1, N * N), [ex(Math.sqrt(cor[1])), Math.sqrt(cor[1])], fr(S2 * N + S1 * S1, N * N), fr(S1, N), fr(S2 - S1, N), fr(2 * cor[1] * N * N, N * N));
        }
        return {
          q: raw`A system is in the state $|\psi\rangle = A\left(${combo(c, labels)}\right)$, ${setup}, and $A$ is a normalization constant. What is ${variance ? raw`the variance $\langle ${op}^2\rangle - \langle ${op}\rangle^2$ of a measurement of $${op}$` : raw`the expectation value $\langle ${op}\rangle$`}?`,
          ...mcV(R, cor, W),
          level: variance ? 3 : 2,
          expl: raw`The weights are $|c_k|^2/\sum|c_j|^2$ with $\sum|c_j|^2 = ${N}$, so $\langle ${op}\rangle = \sum_k \lambda_k|c_k|^2/${N} = ${F.frac(S1, N)}$` +
            (variance ? raw` and $\langle ${op}^2\rangle = ${F.frac(S2, N)}$, giving a variance of $${cor[0]}$.` : raw`. Cross terms vanish because eigenstates with different eigenvalues are orthogonal; an average need not equal any eigenvalue.`),
        };
      },
    },
    {
      id: 'qm.wf.eigen', sec: '5.1.1', level: 1,
      gen(R) {
        const k = R.int(2, 5);
        if (R.bool(0.55)) {
          const OPS = [
            { op: raw`\dfrac{d}{dx}`, name: raw`$\dfrac{d}{dx}$`, T: [`e^{${k}x}`, `e^{-${k}x}`, `3e^{-${k}x}`, `e^{${k}ix}`],
              F: [raw`\sin(${k}x)`, raw`\cos(${k}x)`, `xe^{${k}x}`, `e^{-${k}x^2}`, `x^{${k}}`, raw`\cosh(${k}x)`],
              why: raw`Only exponentials $e^{\lambda x}$ reproduce themselves under one derivative: $\frac{d}{dx}e^{\lambda x} = \lambda e^{\lambda x}$.` },
            { op: raw`\dfrac{d^2}{dx^2}`, name: raw`$\dfrac{d^2}{dx^2}$`, T: [raw`\sin(${k}x)`, raw`\cos(${k}x)`, raw`\cosh(${k}x)`, `e^{-${k}x}`, raw`\sin(${k}x) - 2\cos(${k}x)`],
              F: [`x^{${k}}`, raw`x\sin(${k}x)`, `e^{-${k}x^2}`, raw`\sin(${k}x) + \sin(${2 * k}x)`, raw`\tan(${k}x)`, `xe^{${k}x}`],
              why: raw`Sines, cosines and exponentials with a single wavenumber satisfy $f'' = \text{const}\times f$; mixing different wavenumbers, or multiplying by $x$, spoils this.` },
            { op: raw`x\dfrac{d}{dx}`, name: raw`$x\dfrac{d}{dx}$`, T: [`x^{${k}}`, raw`\dfrac{1}{x^{${k}}}`, raw`\sqrt{x}`, `${k + 3}x^{${k}}`],
              F: [`e^{${k}x}`, raw`\sin(${k}x)`, `x^2 + x`, raw`\ln x`, `xe^{x}`],
              why: raw`$x\frac{d}{dx}x^n = nx^n$: pure powers are the eigenfunctions (eigenvalue $n$).` },
            { op: raw`\hat\Pi`, name: raw`the parity operator $\hat\Pi$, defined by $\hat\Pi f(x) = f(-x)$`, T: [raw`\cos(${k}x)`, raw`\sin(${k}x)`, `xe^{-x^2}`, `x^2e^{-x^2}`, `x^3 - ${k}x`],
              F: [`e^{${k}x}`, `x + x^2`, `e^{${k}ix}`, `(1 + x)e^{-x^2}`, raw`\sin(${k}x) + \cos(${k}x)`],
              why: raw`Eigenfunctions of parity are functions of definite parity: even ($\lambda = +1$) or odd ($\lambda = -1$). A mixture of even and odd parts is not an eigenfunction.` },
            { op: raw`\hat p`, name: raw`the momentum operator $\hat p = -i\hbar\,d/dx$`, T: [`e^{ikx}`, `e^{-ikx}`, `2e^{ikx}`],
              F: [raw`\sin(kx)`, raw`\cos(kx)`, `e^{-kx^2}`, `xe^{ikx}`, `e^{ikx} + e^{-ikx}`, `e^{ikx} + e^{2ikx}`],
              why: raw`$\hat p\,e^{ikx} = \hbar k\,e^{ikx}$; standing waves like $\sin kx$ are superpositions of $p = \pm\hbar k$ and are not momentum eigenstates.` },
          ];
          const o = R.pick(OPS);
          const t = R.pick(o.T);
          return {
            q: raw`Which of the following functions is an eigenfunction of ${o.name}?` + (o.op === raw`\hat p` ? ' (Here $k$ is a real, nonzero constant.)' : ''),
            ...mcS(R, t, R.pickN(o.F, 4)),
            expl: o.why + raw` Applying the operator to $${t}$ returns a constant times the same function.`,
          };
        }
        const m = R.int(2, 5);
        const CASES = [
          { f: raw`\sin(${k}x)`, op: raw`\dfrac{d^2}{dx^2}`, a: [String(-k * k), -k * k], w: [[String(k * k), k * k], [String(-k), -k], [String(k), k], [String(-2 * k), -2 * k], [String(2 * k), 2 * k], ['-1', -1]], why: raw`$\frac{d^2}{dx^2}\sin(${k}x) = -${k * k}\sin(${k}x)$.` },
          { f: `e^{-${k}x}`, op: raw`\dfrac{d^2}{dx^2}`, a: [String(k * k), k * k], w: [[String(-k * k), -k * k], [String(-k), -k], [String(k), k], [String(2 * k), 2 * k], [String(-2 * k), -2 * k], ['1', 1]], why: raw`Each derivative brings down $-${k}$, so two give $(-${k})^2 = ${k * k}$.` },
          { f: `x^{${k}}`, op: raw`x\dfrac{d}{dx}`, a: [String(k), k], w: [[String(k - 1), k - 1], [String(k + 1), k + 1], [String(-k), -k], [String(k * k), k * k], ['1', 1], ['0', 0]], why: raw`$x\cdot ${k}x^{${k - 1}} = ${k}x^{${k}}$.` },
          { f: raw`\dfrac{1}{x^{${k}}}`, op: raw`x\dfrac{d}{dx}`, a: [String(-k), -k], w: [[String(k), k], [String(-k - 1), -k - 1], [String(1 - k), 1 - k], [String(k * k), k * k], [String(-k * k), -k * k], ['-1', -1]], why: raw`$x\cdot(-${k})x^{-${k + 1}} = -${k}x^{-${k}}$.` },
          { f: `x^{${m}}e^{-x^2}`, op: raw`\hat\Pi`, pre: raw`the parity operator $\hat\Pi$ ($\hat\Pi f(x) = f(-x)$)`, a: [m % 2 ? '-1' : '1', m % 2 ? -1 : 1], w: [[m % 2 ? '1' : '-1', m % 2 ? 1 : -1], ['0', 0], ['i', NaN], ['-i', NaN], [String(m), m]], shuffle: true, why: raw`Under $x \to -x$, $x^{${m}}$ picks up $(-1)^{${m}}$ and the Gaussian is even.` },
          { f: `e^{${m}ix/a}`, op: raw`\hat p = -i\hbar\,d/dx`, a: [fracSym(m, 1, raw`\hbar`, 'a'), m], w: [[fracSym(-m, 1, raw`\hbar`, 'a'), -m], [fracSym(m, 1, raw`i\hbar`, 'a'), NaN], [fracSym(-m, 1, raw`i\hbar`, 'a'), NaN], [fracSym(m * m, 1, raw`\hbar^2`, 'a^2'), NaN], [fracSym(m, 2, raw`\hbar`, 'a'), NaN]], shuffle: true, why: raw`$-i\hbar\cdot\frac{${m}i}{a} = \frac{${m}\hbar}{a}$: real, as an eigenvalue of a Hermitian operator must be.` },
          { f: raw`\cos(kx)`, op: raw`\hat H = -\dfrac{\hbar^2}{2m}\dfrac{d^2}{dx^2}`, a: [raw`\frac{\hbar^2k^2}{2m}`, 1], w: [[raw`-\frac{\hbar^2k^2}{2m}`], [raw`\frac{\hbar^2k^2}{m}`], [raw`\frac{\hbar k^2}{2m}`], [raw`\frac{\hbar^2 k}{2m}`], [raw`\frac{\hbar k}{m}`]], shuffle: true, why: raw`$\frac{d^2}{dx^2}\cos kx = -k^2\cos kx$, and the minus sign in $\hat H$ makes the energy positive: $E = \hbar^2k^2/2m$.` },
        ];
        const C = R.pick(CASES);
        const name = C.pre || raw`$${C.op}$`;
        const choice = C.shuffle ? mcS(R, C.a[0], C.w.map(x => x[0])) : mcV(R, C.a, C.w);
        return {
          q: raw`The function $f(x) = ${C.f}$ is an eigenfunction of ${name}. What is the corresponding eigenvalue?`,
          ...choice,
          level: 1,
          expl: C.why,
        };
      },
    },
    {
      id: 'qm.wf.hermitian', sec: '5.1.1', level: 2,
      gen(R) {
        if (R.bool(0.55)) {
          const mat = M => raw`\begin{pmatrix} ${cTeX(M[0][0])} & ${cTeX(M[0][1])} \\ ${cTeX(M[1][0])} & ${cTeX(M[1][1])} \end{pmatrix}`;
          const re = () => [R.int(-3, 3), 0];
          const nz = () => R.pick(COEF);
          const herm = () => { const b = nz(); return [[re(), b], [cConj(b), re()]]; };
          const non = () => {
            const k = R.int(1, 4);
            if (k === 1) { const b = nz(); return [[[0, R.pick([1, -1, 2])], b], [cConj(b), re()]]; }
            if (k === 2) { const b = [R.int(-2, 2), R.pick([1, -1, 2, -2])]; return [[re(), b], [b, re()]]; }
            if (k === 3) { const p = R.pick([1, 2, 3]); let q = R.pick([-2, -1, 0, 1, 2, 3]); if (q === p) q = -p; return [[re(), [p, 0]], [[q, 0], re()]]; }
            const b = [R.int(-2, 2), R.pick([1, -1, 2])]; return [[re(), b], [cNeg(cConj(b)), re()]];
          };
          const truth = [R.bool(), R.bool(), R.bool()];
          if (!truth.some(Boolean)) truth[R.int(0, 2)] = true;
          const Ms = truth.map(t => (t ? herm() : non()));
          return {
            q: GRE.romanStem('Which of the following matrices could represent an observable (that is, is Hermitian)?', Ms.map(M => $(mat(M)))),
            ...GRE.roman(R, truth),
            expl: raw`A matrix is Hermitian when it equals its conjugate transpose: the diagonal entries must be real and $M_{21} = M_{12}^*$. ` +
              truth.map((t, i) => `${ROMAN[i]} ${t ? 'satisfies this' : 'fails'}.`).join(' '),
          };
        }
        const T = [
          [raw`$\hat x\hat p + \hat p\hat x$`, raw`$(\hat x\hat p)^\dagger = \hat p\hat x$, so the symmetrized sum is Hermitian.`],
          [raw`$i\,\dfrac{d}{dx}$`, raw`$i\,d/dx = -\hat p/\hbar$ is Hermitian.`],
          [raw`$\dfrac{d^2}{dx^2}$`, raw`$d^2/dx^2 = -\hat p^2/\hbar^2$ is Hermitian.`],
          [raw`$\hat p^2 + \hat x^2$`, 'a sum of Hermitian operators is Hermitian.'],
          [raw`$\hat a + \hat a^\dagger$`, raw`$(\hat a + \hat a^\dagger)^\dagger = \hat a^\dagger + \hat a$ (it is proportional to $\hat x$).`],
          [raw`$\hat a^\dagger\hat a$`, raw`$(\hat a^\dagger\hat a)^\dagger = \hat a^\dagger\hat a$ (the number operator).`],
          [raw`$i[\hat x, \hat p]$`, raw`$i[\hat x,\hat p] = i(i\hbar) = -\hbar$, a real constant, which is Hermitian.`],
          [raw`$\hat x^3$`, 'any real function of $\\hat x$ is Hermitian.'],
        ];
        const Fs = [
          [raw`$\dfrac{d}{dx}$`, raw`$(d/dx)^\dagger = -d/dx$ (integrate by parts): it is anti-Hermitian; the factor $-i\hbar$ in $\hat p$ fixes this.`],
          [raw`$\hat x\hat p$`, raw`$(\hat x\hat p)^\dagger = \hat p\hat x \ne \hat x\hat p$ because they do not commute.`],
          [raw`$i\hat x$`, raw`$(i\hat x)^\dagger = -i\hat x$.`],
          [raw`$\hat a$`, raw`$\hat a^\dagger \ne \hat a$; the lowering operator is not Hermitian.`],
          [raw`$[\hat x, \hat p]$`, raw`$[\hat x,\hat p] = i\hbar$ is anti-Hermitian.`],
          [raw`$\hat a - \hat a^\dagger$`, raw`$(\hat a - \hat a^\dagger)^\dagger = -(\hat a - \hat a^\dagger)$.`],
          [raw`$x\dfrac{d}{dx}$`, raw`$(x\,d/dx)^\dagger = -\frac{d}{dx}x = -x\frac{d}{dx} - 1$.`],
        ];
        return romanQ(R, 'Which of the following operators is (are) Hermitian?', T, Fs);
      },
    },
    {
      id: 'qm.wf.sequential', sec: '5.1.1', level: 3,
      gen(R) {
        const [p, q] = R.pick([[3, 4], [4, 3], [1, 2], [2, 1], [1, 3], [3, 1], [5, 12], [12, 5], [2, 3], [3, 2], [1, 1]]);
        const r2 = p * p + q * q, r = Math.sqrt(r2);
        const pre = invSqrt(r2);
        const [a1, a2] = R.pickN([-2, -1, 0, 1, 2, 3], 2);
        const [b1, b2] = R.pickN([-3, -1, 0, 1, 2, 4], 2);
        const def = raw`Observable $A$ has normalized eigenstates $|a_1\rangle$ and $|a_2\rangle$ with eigenvalues $${a1}$ and $${a2}$. Observable $B$ has normalized eigenstates $|b_1\rangle = ${pre}\left(${p === 1 ? '' : p}|a_1\rangle + ${q === 1 ? '' : q}|a_2\rangle\right)$ and $|b_2\rangle = ${pre}\left(${q === 1 ? '' : q}|a_1\rangle - ${p === 1 ? '' : p}|a_2\rangle\right)$, with eigenvalues $${b1}$ and $${b2}$.`;
        const fr = (a, b) => [F.frac(a, b), a / b];
        const sc = R.pick(p === q ? ['S1', 'S3', 'S4'] : ['S1', 'S2', 'S2', 'S3', 'S4']);
        let q2, cor, W, expl, level = 3;
        if (sc === 'S1') {
          q2 = raw`The system is prepared in the state $|a_1\rangle$ and $B$ is measured. What is the probability of obtaining $${b2}$?`;
          cor = fr(q * q, r2); W = [fr(p * p, r2), [ex(q / r), q / r], fr(1, 2), fr(q, p + q), fr(1, 1)];
          expl = raw`$|a_1\rangle = \langle b_1|a_1\rangle|b_1\rangle + \langle b_2|a_1\rangle|b_2\rangle$ with $\langle b_2|a_1\rangle = ${ex(q / r)}$, so $P(${b2}) = ${cor[0]}$.`;
          level = 2;
        } else if (sc === 'S2') {
          const askA1 = R.bool();
          q2 = raw`The system is prepared in the state $|a_1\rangle$. Then $B$ is measured, and immediately afterward $A$ is measured. What is the probability that the measurement of $A$ gives $${askA1 ? a1 : a2}$?`;
          if (askA1) { cor = fr(p ** 4 + q ** 4, r2 * r2); W = [fr(1, 1), fr(p * p, r2), fr(p ** 4, r2 * r2), fr(2 * p * p * q * q, r2 * r2), fr(1, 2)]; }
          else { cor = fr(2 * p * p * q * q, r2 * r2); W = [fr(0, 1), fr(q * q, r2), fr(p ** 4 + q ** 4, r2 * r2), fr(p * p * q * q, r2 * r2), fr(q ** 4, r2 * r2)]; }
          expl = raw`The $B$ measurement collapses the state to $|b_1\rangle$ (probability $${F.frac(p * p, r2)}$) or $|b_2\rangle$ (probability $${F.frac(q * q, r2)}$). Then $P(a_1) = (${F.frac(p * p, r2)})^2 + (${F.frac(q * q, r2)})^2 = ${F.frac(p ** 4 + q ** 4, r2 * r2)}$ and $P(a_2) = 2\cdot${F.frac(p * p, r2)}\cdot${F.frac(q * q, r2)} = ${F.frac(2 * p * p * q * q, r2 * r2)}$. The intermediate measurement of the incompatible observable $B$ destroys the certainty of $a_1$.`;
        } else if (sc === 'S3') {
          q2 = raw`The system is prepared in the state $|a_1\rangle$. What is the expectation value of $B$?`;
          cor = fr(b1 * p * p + b2 * q * q, r2);
          W = [fr(b1 + b2, 2), fr(b1 * q * q + b2 * p * p, r2), fr(b1, 1), fr(a1, 1)];
          if (Number.isInteger(r)) W.push(fr(b1 * p + b2 * q, r));
          W.push(fr(b1 * p * p + b2 * q * q, 1));
          expl = raw`$P(b_1) = ${F.frac(p * p, r2)}$ and $P(b_2) = ${F.frac(q * q, r2)}$, so $\langle B\rangle = ${b1}\cdot${F.frac(p * p, r2)} + (${b2})\cdot${F.frac(q * q, r2)} = ${cor[0]}$.`;
          level = 2;
        } else {
          q2 = raw`A measurement of $A$ on a system in the state $|b_1\rangle$ gives $${a2}$. Immediately afterward, $B$ is measured. What is the probability of obtaining $${b1}$?`;
          cor = fr(q * q, r2); W = [fr(1, 1), fr(0, 1), fr(p * p, r2), [ex(q / r), q / r], fr(1, 2)];
          expl = raw`After the $A$ measurement the state is $|a_2\rangle$ (the original $|b_1\rangle$ is forgotten). $|\langle b_1|a_2\rangle|^2 = ${cor[0]}$.`;
        }
        W.push(fr(0, 1), fr(q * q, (p + q) ** 2), fr(1, 4), fr(1, 1));
        return { q: def + ' ' + q2, ...mcV(R, cor, W), expl, level };
      },
    },
    {
      id: 'qm.wf.expect.x', sec: '5.1.1', level: 2,
      gen(R) {
        const s = R.pick(['a', 'b', 'L']);
        const CASES = [
          { psi: raw`\dfrac{1}{\sqrt{2${s}}}`, dom: raw`for $-${s} \le x \le ${s}$ and $\psi = 0$ elsewhere`, x: 0, x2: 1 / 3 },
          { psi: raw`\dfrac{1}{\sqrt{${s}}}`, dom: raw`for $0 \le x \le ${s}$ and $\psi = 0$ elsewhere`, x: 1 / 2, x2: 1 / 3 },
          { psi: raw`\dfrac{1}{\sqrt{${s}}}\,e^{-|x|/${s}}`, dom: raw`for all $x$`, x: 0, x2: 1 / 2 },
          { psi: raw`\sqrt{\dfrac{3}{2${s}}}\left(1 - \dfrac{|x|}{${s}}\right)`, dom: raw`for $|x| \le ${s}$ and $\psi = 0$ elsewhere`, x: 0, x2: 1 / 10 },
          { psi: raw`\dfrac{2}{${s}^{3/2}}\,xe^{-x/${s}}`, dom: raw`for $x \ge 0$ and $\psi = 0$ for $x < 0$`, x: 3 / 2, x2: 3 },
          { psi: raw`\sqrt{\dfrac{15}{16${s}^5}}\,(${s}^2 - x^2)`, dom: raw`for $|x| \le ${s}$ and $\psi = 0$ elsewhere`, x: 0, x2: 1 / 7 },
          { psi: raw`\sqrt{\dfrac{30}{${s}^5}}\,x(${s} - x)`, dom: raw`for $0 \le x \le ${s}$ and $\psi = 0$ elsewhere`, x: 1 / 2, x2: 2 / 7 },
        ];
        const ci = R.int(0, CASES.length - 1), c = CASES[ci];
        const others = CASES.filter((_, i) => i !== ci);
        const ask = R.pick(c.x ? ['x', 'x2', 'sig', 'sig'] : ['x2', 'sig', 'sig', 'x']);
        const s2 = `${s}^2`;
        const sig = Math.sqrt(c.x2 - c.x * c.x);
        let cor, W, what;
        if (ask === 'x') {
          what = raw`the expectation value $\langle x\rangle$`;
          cor = [mono(c.x, s), c.x];
          W = [[mono(c.x2, s), c.x2], [mono(sig, s), sig], [mono(Math.sqrt(c.x2), s), Math.sqrt(c.x2)]]
            .concat([1 / 2, 1 / 4, 1, 3 / 2, 2, 1 / 3].map(v => [mono(v, s), v]));
        } else if (ask === 'x2') {
          what = raw`the expectation value $\langle x^2\rangle$`;
          cor = [mono(c.x2, s2), c.x2];
          W = [];
          if (c.x) W.push([mono(c.x * c.x, s2), c.x * c.x], [mono(sig * sig, s2), sig * sig]);
          W.push([mono(Math.sqrt(c.x2), s2), Math.sqrt(c.x2)]);
          others.forEach(o => W.push([mono(o.x2, s2), o.x2]));
        } else {
          what = raw`the uncertainty $\Delta x = \sqrt{\langle x^2\rangle - \langle x\rangle^2}$`;
          cor = [mono(sig, s), sig];
          W = [];
          if (c.x) W.push([mono(Math.sqrt(c.x2), s), Math.sqrt(c.x2)]);
          W.push([mono(sig * sig, s), sig * sig]);
          others.forEach(o => { const v = Math.sqrt(o.x2 - o.x * o.x); W.push([mono(v, s), v]); });
        }
        return {
          q: raw`A particle has the normalized wavefunction $\psi(x) = ${c.psi}$ ${c.dom} (with $${s} > 0$). What is ${what}?`,
          ...mcV(R, cor, W, { tol: 0.04 }),
          expl: raw`Compute moments of $|\psi|^2$: $\langle x\rangle = \int x|\psi|^2dx = ${mono(c.x, s)}$${c.x ? '' : ' (by symmetry)'} and $\langle x^2\rangle = \int x^2|\psi|^2dx = ${mono(c.x2, s2)}$, so $\Delta x = ${mono(sig, s)}$.`,
        };
      },
    },

    // ================================================================ 5.1.2 Dirac notation
    {
      id: 'qm.dirac.orthogonal', sec: '5.1.2', level: 2,
      gen(R) {
        let al, be, ga, slotT, P, Qc, cor, W;
        for (let tries = 0; ; tries++) {
          al = R.pick(COEF); be = R.pick(COEF); ga = R.pick(COEF);
          slotT = R.bool();
          [P, Qc] = slotT ? [al, be] : [be, al];
          const dv = (num, den) => cqTeX(cMul(num, cConj(den)), cAbs2(den));   // num / den
          const z = cNeg(cMul(cConj(P), ga));
          cor = dv(z, cConj(Qc));
          W = [
            dv(cNeg(cMul(P, ga)), Qc),                 // forgot to conjugate
            dv(cNeg(cMul(cConj(P), ga)), Qc),          // conjugated only one coefficient
            dv(cNeg(cMul(P, ga)), cConj(Qc)),
            dv(cMul(cConj(P), ga), cConj(Qc)),         // sign slip
            dv(cNeg(cMul(cConj(Qc), ga)), cConj(P)),   // swapped roles
            dv(cNeg(ga), cConj(Qc)),                   // dropped a coefficient
            cTeX(z),
          ];
          const distinct = new Set(W.map(GRE.norm).filter(w => w !== GRE.norm(cor)));
          if (distinct.size >= 5 && W[0] !== cor) break;
          if (tries > 40) throw new Error('orthogonal: no good draw');
        }
        const psi2 = slotT ? combo([ga], ['s']) + raw` + x|t\rangle` : 'x' + combo([[1, 0], ga], ['s', 't']);
        return {
          q: raw`Let $|s\rangle$ and $|t\rangle$ be orthonormal states, and let $|\psi_1\rangle = ${combo([al, be], ['s', 't'])}$ and $|\psi_2\rangle = ${psi2}$. For what value of the complex number $x$ are $|\psi_1\rangle$ and $|\psi_2\rangle$ orthogonal?`,
          ...GRE.mc(R, $(cor), W.map($)),
          expl: raw`Orthogonality means $\langle\psi_1|\psi_2\rangle = 0$, and the bra carries complex-conjugated coefficients: $(${cTeX(cConj(al))})(${slotT ? cTeX(ga) : 'x'}) + (${cTeX(cConj(be))})(${slotT ? 'x' : cTeX(ga)}) = 0$, so $x = ${cor}$. Forgetting the conjugation is the classic trap.`,
        };
      },
    },
    {
      id: 'qm.dirac.normalize', sec: '5.1.2', level: 1,
      gen(R) {
        const n = R.pick([2, 3, 3, 4]);
        const labels = R.pickN(['0', '1', '2', '3', '4', '5'], n).sort();
        const c = []; for (let i = 0; i < n; i++) c.push(R.pick(COEF));
        if (c.every(z => z[1] === 0)) c[R.int(0, n - 1)] = R.pick([[0, 1], [0, 2], [1, 1], [1, -1], [1, 2]]);
        const N = c.reduce((s, z) => s + cAbs2(z), 0);
        const Sre = c.reduce((s, z) => s + z[0] * z[0] - z[1] * z[1], 0);
        const Sl1 = c.reduce((s, z) => s + (Math.abs(z[0]) + Math.abs(z[1])) ** 2, 0);
        const ask = R.bool(0.65) ? 'A' : 'norm';
        const ket = combo(c, labels);
        if (ask === 'A') {
          const W = [[ex(1 / N), 1 / N], [ex(Math.sqrt(N)), Math.sqrt(N)]];
          if (Sre > 0) W.push([ex(1 / Math.sqrt(Sre)), 1 / Math.sqrt(Sre)]);
          W.push([ex(1 / Math.sqrt(Sl1)), 1 / Math.sqrt(Sl1)]);
          if (c.every(z => z[0] === 0 || z[1] === 0)) { const S = c.reduce((s, z) => s + Math.abs(z[0] + z[1]), 0); W.push([ex(1 / S), 1 / S]); }
          W.push([ex(1 / Math.sqrt(2 * N)), 1 / Math.sqrt(2 * N)], [ex(1 / Math.sqrt(N + 1)), 1 / Math.sqrt(N + 1)]);
          return {
            q: raw`The kets $${labels.map(KET).join(', ')}$ are orthonormal. What positive real constant $A$ normalizes the state $|\psi\rangle = A\left(${ket}\right)$?`,
            ...mcV(R, [ex(1 / Math.sqrt(N)), 1 / Math.sqrt(N)], W),
            expl: raw`$\langle\psi|\psi\rangle = |A|^2\sum_k|c_k|^2 = ${N}|A|^2 = 1$, so $A = 1/\sqrt{${N}} = ${ex(1 / Math.sqrt(N))}$. Use $|c|^2 = c^*c$, not $c^2$: e.g. $|2i|^2 = 4$, not $-4$.`,
          };
        }
        const W = [[String(Sre), Sre], [ex(Math.sqrt(N)), Math.sqrt(N)], [String(Sl1), Sl1], [String(n), n], [String(N + 1), N + 1], [String(2 * N), 2 * N]];
        return {
          q: raw`The kets $${labels.map(KET).join(', ')}$ are orthonormal. What is $\langle\psi|\psi\rangle$ for $|\psi\rangle = ${ket}$?`,
          ...mcV(R, [String(N), N], W),
          expl: raw`$\langle\psi|\psi\rangle = \sum_k c_k^*c_k = ${c.map(z => cAbs2(z)).join(' + ')} = ${N}$. The bra conjugates the coefficients, so the result is real and positive; squaring without conjugating would give $${Sre}$.`,
        };
      },
    },
    {
      id: 'qm.dirac.inner', sec: '5.1.2', level: 2,
      gen(R) {
        const n = R.pick([2, 2, 3]);
        const lab = n === 2 ? R.pick([['1', '2'], ['0', '1'], ['u', 'v']]) : ['1', '2', '3'];
        let a, b, swap, v, noConj, wrongSide;
        for (let tries = 0; ; tries++) {
          a = []; b = [];
          for (let i = 0; i < n; i++) { a.push(R.pick(COEF)); b.push(R.pick(COEF)); }
          swap = R.bool();
          const [bra, ket] = swap ? [a, b] : [b, a];   // asked: <bra|ket>
          v = [0, 0]; noConj = [0, 0]; wrongSide = [0, 0];
          for (let i = 0; i < n; i++) {
            v = cAdd(v, cMul(cConj(bra[i]), ket[i]));
            noConj = cAdd(noConj, cMul(bra[i], ket[i]));
            wrongSide = cAdd(wrongSide, cMul(bra[i], cConj(ket[i])));
          }
          if (v[1] !== 0 && v[0] !== 0 && GRE.norm(cTeX(noConj)) !== GRE.norm(cTeX(v))) break;
          if (tries > 50) throw new Error('inner: no good draw');
        }
        const W = [cTeX(noConj), cTeX(wrongSide), cTeX(cNeg(v)), cTeX(cNeg(noConj)), cTeX([v[0], 0]), cTeX([v[1], 0])];
        const nm = swap ? [raw`\psi`, raw`\phi`] : [raw`\phi`, raw`\psi`];
        return {
          q: raw`In an orthonormal basis, $|\psi\rangle = ${combo(a, lab)}$ and $|\phi\rangle = ${combo(b, lab)}$. What is $\langle ${nm[0]}|${nm[1]}\rangle$?`,
          ...mcS(R, cTeX(v), W),
          expl: raw`$\langle ${nm[0]}|${nm[1]}\rangle = \sum_k (c^{(${nm[0]})}_k)^*\,c^{(${nm[1]})}_k = ${cTeX(v)}$: the coefficients of the bra are complex-conjugated. Conjugating the wrong one gives the complex conjugate $${cTeX(wrongSide)} = \langle ${nm[1]}|${nm[0]}\rangle$.`,
        };
      },
    },
    {
      id: 'qm.dirac.matrix', sec: '5.1.2', level: 2,
      gen(R) {
        const mat = (a, b, d) => raw`\begin{pmatrix} ${a} & ${cTeX(b)} \\ ${cTeX(cConj(b))} & ${d} \end{pmatrix}`;
        if (R.bool()) {
          const [u, b] = R.pick([[0, [1, 0]], [0, [0, 1]], [0, [2, 0]], [0, [0, 2]], [0, [3, 4]], [0, [4, -3]], [3, [4, 0]], [3, [0, 4]], [4, [3, 0]], [4, [0, -3]], [2, [1, 2]], [1, [2, 2]], [2, [2, -1]]]);
          const c0 = R.pick([-2, -1, 1, 2, 3]);
          const sg = R.sign();
          const a = c0 + sg * u, d = c0 - sg * u;
          const r = Math.sqrt(u * u + cAbs2(b));
          const pair = (x, y) => (x === y ? `$${x}$ only` : `$${Math.min(x, y)}$ and $${Math.max(x, y)}$`);
          const cor = pair(c0 - r, c0 + r);
          const W = [];
          if (u) W.push(pair(a, d));
          const bb = cAbs2(b);
          if (u) W.push(isSq(bb) ? pair(c0 - Math.sqrt(bb), c0 + Math.sqrt(bb)) : `$${c0} \\pm \\sqrt{${bb}}$`);
          W.push(pair(-r, r), pair(2 * c0 - r, 2 * c0 + r), pair(c0 - r * r, c0 + r * r), pair(c0, c0 + r), pair(c0 - 2 * r, c0 + 2 * r));
          if (b[0] && b[1]) W.push(pair(c0 - Math.abs(b[0]) - Math.abs(b[1]), c0 + Math.abs(b[0]) + Math.abs(b[1])));
          return {
            q: raw`In the orthonormal basis $\{|1\rangle, |2\rangle\}$ an observable is represented by the matrix $${mat(a, b, d)}$. What are the possible results of a measurement of this observable?`,
            ...GRE.mc(R, cor, W),
            expl: raw`Measurements return eigenvalues. $\det(M - \lambda) = 0$ gives $\lambda = \frac{a+d}{2} \pm \sqrt{\left(\frac{a-d}{2}\right)^2 + |b|^2} = ${c0} \pm \sqrt{${u * u} + ${bb}} = ${c0} \pm ${r}$. The diagonal entries are only the eigenvalues when the off-diagonal elements vanish.`,
          };
        }
        let a, d, b, c1, c2, N, cross, crossW, S, val;
        for (let tries = 0; ; tries++) {
          a = R.int(-2, 3); d = R.int(-2, 3);
          b = R.pick(COEF.filter(z => z[1]));
          c1 = R.pick([[1, 0], [2, 0], [1, 0], [0, 1]]); c2 = R.pick([[1, 0], [0, 1], [-1, 0], [0, -1], [2, 0], [1, 1]]);
          N = cAbs2(c1) + cAbs2(c2);
          cross = cMul(cMul(cConj(c1), b), c2)[0];          // Re(c1* b c2)
          crossW = cMul(cMul(c1, b), cConj(c2))[0];         // Re(c1 b c2*)
          S = cAbs2(c1) * a + cAbs2(c2) * d;
          val = 2 * cross + S;
          if (cross && crossW !== cross) break;
          if (tries > 50) throw new Error('no distinguishing cross term');
        }
        const fr = (x, y) => [F.frac(x, y), x / y];
        const W = [fr(S, N), fr(S + 2 * crossW, N), fr(S + cross, N), fr(val, 1), fr(S - 2 * cross, N), fr(a + d, 2)];
        return {
          q: raw`In the orthonormal basis $\{|1\rangle, |2\rangle\}$ an observable is represented by $M = ${mat(a, b, d)}$. What is its expectation value in the state $|\psi\rangle = ${invSqrt(N)}\left(${combo([c1, c2], ['1', '2'])}\right)$?`,
          ...mcV(R, fr(val, N), W),
          expl: raw`$\langle M\rangle = \psi^\dagger M\psi = \frac{1}{${N}}\left(|c_1|^2 M_{11} + |c_2|^2M_{22} + 2\,\mathrm{Re}(c_1^*M_{12}c_2)\right) = \frac{1}{${N}}(${S} + ${2 * cross}) = ${F.frac(val, N)}$. Do not drop the off-diagonal (cross) terms, and conjugate the bra.`,
        };
      },
    },
    {
      id: 'qm.dirac.identities', sec: '5.1.2', level: 2,
      gen(R) {
        const T = [
          [raw`$\langle\phi|\psi\rangle = \langle\psi|\phi\rangle^*$`, 'this is the defining property of the inner product.'],
          [raw`$(\hat A\hat B)^\dagger = \hat B^\dagger\hat A^\dagger$`, 'the adjoint of a product reverses the order.'],
          [raw`$(c\hat A)^\dagger = c^*\hat A^\dagger$ for any complex number $c$`, 'constants are complex-conjugated.'],
          [raw`$\left(|\psi\rangle\langle\phi|\right)^\dagger = |\phi\rangle\langle\psi|$`, 'kets and bras swap under $\\dagger$.'],
          [raw`If $\hat A$ and $\hat B$ are Hermitian, then $\hat A\hat B + \hat B\hat A$ is Hermitian.`, raw`$(\hat A\hat B + \hat B\hat A)^\dagger = \hat B\hat A + \hat A\hat B$.`],
          [raw`If $\hat A$ and $\hat B$ are Hermitian, then $i[\hat A, \hat B]$ is Hermitian.`, raw`$(i[\hat A,\hat B])^\dagger = -i[\hat B,\hat A] = i[\hat A,\hat B]$.`],
          [raw`$\langle\psi|\hat A^\dagger\hat A|\psi\rangle \ge 0$ for any operator $\hat A$`, raw`it is the squared norm of $\hat A|\psi\rangle$.`],
          [raw`If $|n\rangle$ is normalized, $\hat P = |n\rangle\langle n|$ satisfies $\hat P^2 = \hat P$.`, raw`$\hat P^2 = |n\rangle\langle n|n\rangle\langle n| = \hat P$.`],
          [raw`$\sum_n |n\rangle\langle n| = \hat 1$ for a complete orthonormal basis $\{|n\rangle\}$`, 'this is the completeness relation.'],
          [raw`If $\hat A$ is Hermitian, $\langle\psi|\hat A|\psi\rangle$ is real for every state.`, 'expectation values of observables are real.'],
        ];
        const Fs = [
          [raw`$(\hat A\hat B)^\dagger = \hat A^\dagger\hat B^\dagger$ for any two operators`, raw`the correct rule reverses the order, $\hat B^\dagger\hat A^\dagger$.`],
          [raw`$\langle\phi|\psi\rangle = \langle\psi|\phi\rangle$ for any two states`, 'the two are complex conjugates and differ in general.'],
          [raw`$(c\hat A)^\dagger = c\hat A^\dagger$ for any complex number $c$`, raw`the constant must be conjugated, $c^*$.`],
          [raw`If $\hat A$ and $\hat B$ are Hermitian, then $\hat A\hat B$ is Hermitian.`, raw`$(\hat A\hat B)^\dagger = \hat B\hat A$, which equals $\hat A\hat B$ only if they commute.`],
          [raw`If $\hat A$ and $\hat B$ are Hermitian, then $[\hat A, \hat B]$ is Hermitian.`, raw`$[\hat A,\hat B]^\dagger = -[\hat A,\hat B]$: a nonzero commutator of Hermitian operators is anti-Hermitian.`],
          [raw`$\langle\psi|\hat A|\psi\rangle$ is real for every operator $\hat A$`, raw`only Hermitian operators are guaranteed real expectation values (e.g. $\hat A = i\hat 1$ gives $i$).`],
          [raw`Two eigenvectors of a Hermitian operator with the same eigenvalue must be orthogonal.`, 'orthogonality is guaranteed only for different eigenvalues; degenerate eigenvectors can be chosen orthogonal but need not be.'],
          [raw`$\langle\phi|\psi\rangle$ is real for any two states`, 'inner products are complex in general.'],
          [raw`The outer product $|\psi\rangle\langle\phi|$ is a complex number.`, 'it is an operator; the inner product $\\langle\\phi|\\psi\\rangle$ is the number.'],
          [raw`If $\hat A$ is Hermitian, then $i\hat A$ is Hermitian.`, raw`$(i\hat A)^\dagger = -i\hat A$.`],
        ];
        return romanQ(R, 'Which of the following statements is (are) true?', T, Fs);
      },
    },
    // ================================================================ 5.1.3 Schrödinger equation
    {
      id: 'qm.se.energyprob', sec: '5.1.3', level: 1,
      gen(R) {
        const n = R.pick([2, 2, 3]);
        const lv = R.pickN([1, 2, 3, 4, 5], n).sort((a, b) => a - b);
        const c = []; for (let i = 0; i < n; i++) c.push(R.pick(COEF));
        const a2 = c.map(cAbs2), N = a2.reduce((s, v) => s + v, 0);
        const E = k => raw`E_{${k}}`;
        const setup = raw`At $t = 0$ a particle is in the state $\Psi(x, 0) = A\left[${combo(c, lv.map(k => raw`\psi_{${k}}(x)`), true)}\right]$, where the $\psi_n(x)$ are normalized energy eigenfunctions of a time-independent Hamiltonian with energies $E_n$ (all different), and $A$ is a normalization constant.`;
        const j = R.int(0, n - 1), k = (j + R.int(1, n - 1)) % n;
        const [lo, hi] = [Math.min(lv[j], lv[k]), Math.max(lv[j], lv[k])];
        const osc = raw`\left(\frac{(${E(hi)} - ${E(lo)})t}{\hbar}\right)`;
        if (R.bool(0.6)) {
          const p = F.frac(a2[j], N);
          return {
            q: setup + raw` At a later time $t$, what is the probability that a measurement of the energy yields $${E(lv[j])}$?`,
            ...mcS(R, p, [raw`${p}\cos^2${osc}`, raw`${p}\sin^2${osc}`, ex(Math.sqrt(a2[j] / N)), F.frac(a2[k], N), F.frac(1, n), raw`${p}\,e^{-i${E(lv[j])}t/\hbar}`]),
            expl: raw`Each term only acquires a phase: $\Psi(x,t) = A\sum c_n\psi_n(x)e^{-iE_nt/\hbar}$, and $|c_ne^{-iE_nt/\hbar}|^2 = |c_n|^2$. So the probability is the same as at $t = 0$: $|c|^2/\sum|c_n|^2 = ${p}$. Energy probabilities never change for a time-independent Hamiltonian.`,
          };
        }
        const wsum = (w, den) => {
          const terms = lv.map((l, i) => (w[i] === 1 ? '' : w[i]) + E(l)).join(' + ');
          return den === 1 ? terms : raw`\frac{${terms}}{${den}}`;
        };
        const g = a2.reduce((s, v) => gcd(s, v), N);
        const cor = wsum(a2.map(v => v / g), N / g);
        const W = [wsum(a2, 1), wsum(lv.map(() => 1), n), wsum(a2.slice().reverse().map(v => v / g), N / g), raw`\left(${cor}\right)\cos${osc}`];
        if (c.every(z => z[0] === 0 || z[1] === 0)) { const m = c.map(z => Math.abs(z[0] + z[1])); const S = m.reduce((s, v) => s + v, 0); const gm = m.reduce((s, v) => gcd(s, v), S); W.push(wsum(m.map(v => v / gm), S / gm)); }
        W.push(E(lv[a2.indexOf(Math.max(...a2))]), E(lv[n - 1]), E(lv[0]), lv.map(E).join(' + '));
        return {
          q: setup + raw` What is the expectation value of the energy at a later time $t$?`,
          ...mcS(R, cor, W),
          level: 2,
          expl: raw`$\langle H\rangle = \sum_n |c_n|^2E_n/\sum_n|c_n|^2$ with $|c_n|^2 = ${a2.join(', ')}$ (sum $${N}$). The phases $e^{-iE_nt/\hbar}$ cancel in $|c_n|^2$, so $\langle H\rangle$ is constant in time (energy conservation).`,
        };
      },
    },
    {
      id: 'qm.se.period', sec: '5.1.3', level: 2,
      gen(R) {
        const v = R.pick(['isw', 'num', 'num', 'ho']);
        if (v === 'isw') {
          const [n1, n2] = R.pickN([1, 2, 3, 4], 2).sort((a, b) => a - b);
          const K = n2 * n2 - n1 * n1;
          const T = (p, q, pi = raw`\pi`) => fracSym(p, q, 'mL^2', pi + raw`\hbar`);
          const W = [T(2, K, raw`\pi^2`), T(4, n2 - n1), T(4, n2 * n2), T(4, n1 * n1 + n2 * n2), T(8, K), T(2, K)];
          return {
            q: raw`A particle of mass $m$ in an infinite square well of width $L$ (energies $E_n = n^2\pi^2\hbar^2/2mL^2$) is in the state $\Psi(x,0) = \frac{1}{\sqrt{2}}\left[\psi_${n1}(x) + \psi_${n2}(x)\right]$. The probability density $|\Psi(x,t)|^2$ is periodic in time. What is its period?`,
            ...mcS(R, T(4, K), W),
            expl: raw`$|\Psi|^2 = \tfrac{1}{2}\left[\psi_${n1}^2 + \psi_${n2}^2 + 2\psi_${n1}\psi_${n2}\cos\left((E_${n2} - E_${n1})t/\hbar\right)\right]$, so $T = \dfrac{2\pi\hbar}{E_${n2} - E_${n1}} = \dfrac{2\pi\hbar\cdot 2mL^2}{${K}\pi^2\hbar^2} = ${T(4, K)}$. The period depends on the energy difference $(n_2^2 - n_1^2)E_1$, not on $n_2 - n_1$.`,
          };
        }
        if (v === 'num') {
          const dE = R.pick([0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 4.0, 5.0, 10]);
          const freq = R.bool(0.35);
          const sys = R.pick(['an atom', 'an electron in a quantum dot', 'a molecule']);
          if (freq) {
            const f = dE / H_EVS;
            return {
              q: raw`The state of ${sys} is a superposition of two energy eigenstates whose energies differ by $${F.num(dE, 2)}\,\text{eV}$. With what frequency $f$ (in hertz, not angular frequency) does the probability density oscillate?`,
              ...GRE.numeric(R, f, [dE / HBAR_EVS, f / 2, 2 * f], { unit: raw`\text{Hz}` }),
              expl: raw`The interference term varies as $\cos(\Delta E\,t/\hbar)$, so $\omega = \Delta E/\hbar$ and $f = \Delta E/h = ${F.num(dE, 2)}\,\text{eV}/(4.14\times 10^{-15}\,\text{eV·s}) \approx ${F.sci(f, 2)}\,\text{Hz}$. Using $\hbar$ instead of $h$ gives the angular frequency, $2\pi$ times larger.`,
            };
          }
          const T = H_EVS / dE;
          return {
            q: raw`The state of ${sys} is a superposition of two energy eigenstates whose energies differ by $${F.num(dE, 2)}\,\text{eV}$. With what period does the probability density oscillate in time?`,
            ...GRE.numeric(R, T, [HBAR_EVS / dE, T / 2, 2 * T], { unit: raw`\text{s}` }),
            expl: raw`The cross term in $|\Psi|^2$ oscillates as $\cos(\Delta E\,t/\hbar)$, so $T = 2\pi\hbar/\Delta E = h/\Delta E = (4.14\times 10^{-15}\,\text{eV·s})/(${F.num(dE, 2)}\,\text{eV}) \approx ${F.sci(T, 2)}\,\text{s}$. Forgetting the $2\pi$ gives $\hbar/\Delta E$.`,
          };
        }
        const [n1, n2] = R.pickN([0, 1, 2, 3, 4], 2).sort((a, b) => a - b);
        const d = n2 - n1;
        const om = k => (k === 1 ? raw`\omega` : `${k}\\omega`);
        const W = [om(n1 + n2 + 1), raw`\frac{\omega}{2}`, om(2 * d), d > 1 ? om(1) : om(3), d % 2 ? raw`\frac{${d}}{2}\omega` : om(d / 2), raw`0 \text{ (the density is static)}`];
        return {
          q: raw`A harmonic oscillator with angular frequency $\omega$ is in the state $\frac{1}{\sqrt{2}}\left(|${n1}\rangle + |${n2}\rangle\right)$, where $|n\rangle$ are the energy eigenstates. With what angular frequency does the probability density $|\Psi(x,t)|^2$ oscillate?`,
          ...mcS(R, om(d), W.map(w => w.replace(/^1\\omega$/, raw`\omega`))),
          expl: raw`The interference term oscillates at $(E_${n2} - E_${n1})/\hbar = (${n2} - ${n1})\omega$. The zero-point energy $\hbar\omega/2$ cancels in the difference, and a stationary state alone would give a static density.`,
        };
      },
    },
    {
      id: 'qm.se.timeform', sec: '5.1.3', level: 2,
      gen(R) {
        const isw = R.bool();
        const [c1, c2] = R.pick([[1, 1], [1, -1], [1, 2], [2, 1], [1, -2], [3, 4], [4, -3], [1, 3], [3, -1], [2, 3]]);
        const N = c1 * c1 + c2 * c2;
        const [n1, n2] = isw ? R.pickN([1, 2, 3, 4], 2).sort((a, b) => a - b) : R.pickN([0, 1, 2, 3], 2).sort((a, b) => a - b);
        const term = (c, n, ph, first) => {
          const sg = c < 0 ? '-' : first ? '' : '+';
          const m = Math.abs(c);
          return `${first ? sg : ' ' + sg + ' '}${m === 1 ? '' : m}\\psi_{${n}}(x)${ph}`;
        };
        const Eph = (n, sign = '-', lin = false) => {
          if (isw) { const k = lin ? n : n * n; return raw`e^{${sign}i${k === 1 ? '' : k}E_1t/\hbar}`; }
          const k = 2 * n + 1; return raw`e^{${sign}${k === 1 ? '' : k}i\omega t/2}`;
        };
        const pre = invSqrt(N);
        const wrap = s => raw`${pre}\left[${s}\right]`;
        const both = (p1, p2) => wrap(term(c1, n1, p1, true) + term(c2, n2, p2, false));
        const plain = term(c1, n1, '', true) + term(c2, n2, '', false);
        const cor = both(Eph(n1), Eph(n2));
        const W = [
          both(Eph(n1, '+'), Eph(n2, '+')),
          wrap(plain) + Eph(n1),
          both(Eph(n2), Eph(n1)),
          isw ? both(Eph(n1, '-', true), Eph(n2, '-', true)) : both(raw`e^{-${2 * n1 + 1 === 1 ? '' : 2 * n1 + 1}i\omega t}`, raw`e^{-${2 * n2 + 1}i\omega t}`),
          wrap(term(c1, n1, isw ? raw`\cos(${n1 * n1 === 1 ? '' : n1 * n1}E_1t/\hbar)` : raw`\cos(${2 * n1 + 1 === 1 ? '' : 2 * n1 + 1}\omega t/2)`, true) + term(c2, n2, isw ? raw`\cos(${n2 * n2}E_1t/\hbar)` : raw`\cos(${2 * n2 + 1}\omega t/2)`, false)),
        ];
        const ctx = isw
          ? raw`A particle in an infinite square well has normalized stationary states $\psi_n(x)$ with energies $E_n = n^2E_1$ ($n = 1, 2, \ldots$).`
          : raw`A harmonic oscillator of angular frequency $\omega$ has normalized stationary states $\psi_n(x)$ with energies $E_n = (n + \tfrac{1}{2})\hbar\omega$ ($n = 0, 1, \ldots$).`;
        return {
          q: ctx + raw` At $t = 0$ the particle is in the state $\Psi(x,0) = ${wrap(plain)}$. Which of the following is $\Psi(x,t)$?`,
          ...mcS(R, cor, W),
          expl: raw`Each stationary state evolves with its own phase $e^{-iE_nt/\hbar}$ (minus sign, from $i\hbar\,\partial_t\Psi = H\Psi$). ${isw ? raw`Here $E_n/\hbar = n^2E_1/\hbar$.` : raw`Here $E_n/\hbar = (2n+1)\omega/2$.`} A common overall phase would not change any physics, but the relative phase between the two terms is essential: it is what makes $|\Psi|^2$ oscillate.`,
        };
      },
    },
    {
      id: 'qm.se.stationary', sec: '5.1.3', level: 2,
      gen(R) {
        // [statement, true for a stationary state, true for a superposition of two, why (stationary), why (superposition)]
        const S = [
          [raw`The probability density $|\Psi(x,t)|^2$ is independent of time.`, 1, 0, raw`the time dependence is an overall phase $e^{-iEt/\hbar}$ that cancels in $|\Psi|^2$.`, raw`the cross term oscillates as $\cos[(E_2 - E_1)t/\hbar]$.`],
          [raw`The expectation value of the energy is independent of time.`, 1, 1, raw`the energy probabilities $|c_n|^2$ never change for a time-independent $H$.`, raw`the energy probabilities $|c_n|^2$ never change for a time-independent $H$.`],
          [raw`Every measurement of the energy gives the same value.`, 1, 0, raw`the state is an eigenstate of $H$.`, raw`$E_1$ and $E_2$ each occur with probability $1/2$.`],
          [raw`The expectation value of the momentum is zero at all times.`, 1, 0, raw`a bound stationary state can be taken real, so $\langle p\rangle = m\,d\langle x\rangle/dt = 0$.`, raw`$\langle p\rangle = m\,d\langle x\rangle/dt$ generally oscillates.`],
          [raw`$\Psi(x,t)$ is a real function at all times.`, 0, 0, raw`$e^{-iEt/\hbar}$ makes it complex at generic times.`, 'the phase factors make it complex.'],
          [raw`The expectation value of position is zero.`, 0, 0, raw`$\langle x\rangle$ depends on where the potential is centered (e.g. $L/2$ for a well from $0$ to $L$).`, raw`$\langle x\rangle$ depends on the potential and on time.`],
          [raw`The particle has a definite value of momentum.`, 0, 0, 'a bound state is not a momentum eigenstate.', 'a bound state is not a momentum eigenstate.'],
          [raw`The expectation value $\langle x\rangle$ is independent of time.`, 1, 0, 'every expectation value is constant in a stationary state.', raw`$\langle x\rangle$ generally oscillates at angular frequency $(E_2 - E_1)/\hbar$.`],
          [raw`The kinetic energy has a definite value.`, 0, 0, raw`$\psi$ is an eigenstate of $T + V$, not of $T$ alone (unless $V$ is constant).`, 'not even the total energy is definite.'],
          [raw`The expectation value of the energy is greater than the minimum value of $V(x)$.`, 1, 1, raw`$\langle T\rangle > 0$ for any normalizable state, so $\langle H\rangle > V_{\min}$.`, raw`$\langle T\rangle > 0$ for any normalizable state, so $\langle H\rangle > V_{\min}$.`],
        ];
        const sup = R.bool(0.4);
        const col = sup ? 2 : 1;
        const T = S.filter(r => r[col]).map(r => [r[0], r[sup ? 4 : 3]]);
        const Fs = S.filter(r => !r[col]).map(r => [r[0], r[sup ? 4 : 3]]);
        const intro = sup
          ? raw`A particle moves in a time-independent potential $V(x)$. At $t = 0$ it is in the state $\Psi = \frac{1}{\sqrt{2}}(\psi_1 + \psi_2)$, where $\psi_1$ and $\psi_2$ are real, normalized bound stationary states with energies $E_1 \neq E_2$. Which of the following must be true?`
          : raw`A particle moves in a time-independent potential $V(x)$ and is in a bound stationary state $\Psi(x,t) = \psi_n(x)e^{-iE_nt/\hbar}$. Which of the following must be true?`;
        return romanQ(R, intro, T, Fs);
      },
    },
    {
      id: 'qm.se.nodes', sec: '5.1.3', level: 2,
      gen(R) {
        const kind = R.pick(['ho', 'ho', 'isw', 'gen']);
        const sgn = R.sign();
        const nodesTxt = k => (k === 0 ? 'It has no nodes.' : k === 1 ? 'It crosses zero once.' : `It crosses zero ${k} times.`);
        if (kind === 'isw') {
          const n = R.int(1, 6), k = n - 1;
          const E = m => (m === 1 ? 'E_1' : `${m}E_1`);
          const W = [n > 1 ? E((n - 1) ** 2) : null, E((n + 1) ** 2), E((n + 2) ** 2), n > 1 ? E(n) : E((n + 3) ** 2), E(2 * n * n)].filter(x => x && x !== E(n * n));
          return {
            q: raw`The figure shows an energy eigenfunction of a particle in an infinite square well with walls at $x = 0$ and $x = L$. ${nodesTxt(k)} If the ground-state energy is $E_1$, what is the energy of this state?`,
            fig: waveSVG('isw', n, sgn),
            ...mcS(R, E(n * n), W),
            level: 1,
            expl: raw`The $n$th eigenfunction $\sin(n\pi x/L)$ has $n - 1$ nodes inside the well (zeros at the walls do not count). With ${k} interior node${k === 1 ? '' : 's'}, $n = ${n}$ and $E = n^2E_1 = ${E(n * n)}$.`,
          };
        }
        if (kind === 'gen') {
          const k = R.int(1, 5);
          const W = [k - 1, k + 1, k + 2, k + 3, 2 * k, k - 2].filter(x => x >= 0).map(String);
          return {
            q: raw`The figure shows a bound-state energy eigenfunction $\psi(x)$ of a particle in a one-dimensional potential well $V(x)$. ${nodesTxt(k)} How many bound states of this potential have a lower energy?`,
            fig: waveSVG('ho', k, sgn),
            ...mcV(R, [String(k), k], W.map(w => [w, +w])),
            expl: raw`In one dimension the bound states are nondegenerate and the $n$th state (counting from $0$) has exactly $n$ nodes. A state with ${k} node${k === 1 ? '' : 's'} is the ${ORD[k]} state, so ${k} state${k === 1 ? ' lies' : 's lie'} below it.`,
          };
        }
        const n = R.int(0, 5);
        const fig = waveSVG('ho', n, sgn);
        const stem0 = raw`The figure shows an energy eigenfunction of a one-dimensional harmonic oscillator with angular frequency $\omega$. ${nodesTxt(n)}`;
        if (R.bool(0.45)) {
          const E = m => cs(2 * m + 1, 2, raw`\hbar\omega`);
          const W = [E(n + 1), n > 0 ? E(n - 1) : E(2), n > 0 ? cs(n, 1, raw`\hbar\omega`) : raw`0`, cs(n + 1, 1, raw`\hbar\omega`), E(n + 2)];
          return {
            q: stem0 + ' What is the energy of this state?', fig,
            ...mcS(R, E(n), W),
            expl: raw`The oscillator state $|n\rangle$ has exactly $n$ nodes, so this is $n = ${n}$ with $E = (n + \tfrac{1}{2})\hbar\omega = ${E(n)}$.`,
          };
        }
        const hw = R.pick([0.1, 0.2, 0.25, 0.4, 0.5, 1.0, 2.0]);
        const E = m => (m + 0.5) * hw;
        const W = [E(n + 1), E(n - 1), n * hw, (n + 1) * hw, E(n + 2), (2 * n + 1) * hw].filter(x => x > 0).map(x => [F.num(x, 3) + raw`\,\text{eV}`, x]);
        return {
          q: stem0 + raw` If $\hbar\omega = ${F.num(hw, 2)}\,\text{eV}$, what is the energy of this state?`, fig,
          ...mcV(R, [F.num(E(n), 3) + raw`\,\text{eV}`, E(n)], W),
          expl: raw`$n$ nodes means $|n\rangle$ with $n = ${n}$, so $E = (n + \tfrac{1}{2})\hbar\omega = ${F.num(n + 0.5, 3)}\times ${F.num(hw, 2)}\,\text{eV} = ${F.num(E(n), 3)}\,\text{eV}$. Don't forget the zero-point energy $\hbar\omega/2$.`,
        };
      },
    },
    {
      id: 'qm.se.solve', sec: '5.1.3', level: 3,
      gen(R) {
        const b = R.pick(['b', 'a', raw`\ell `]);
        const k = R.pick([raw`\kappa `, raw`\alpha `, 'q ']);
        const CASES = [
          { q: raw`The function $\psi(x) = Ae^{-x^2/2${b}^2}$ is a stationary state, with energy $E = \hbar^2/2m${b}^2$, of a particle of mass $m$ moving in a potential $V(x)$. What is $V(x)$?`,
            a: raw`\frac{\hbar^2x^2}{2m${b}^4}`,
            w: [raw`\frac{\hbar^2x^2}{m${b}^4}`, raw`\frac{\hbar^2x^2}{2m${b}^2}`, raw`-\frac{\hbar^2x^2}{2m${b}^4}`, raw`\frac{\hbar^2x^4}{2m${b}^6}`, raw`\frac{\hbar^2x^2}{2m${b}^4} - \frac{\hbar^2}{2m${b}^2}`],
            why: raw`From $H\psi = E\psi$: $V = E + \frac{\hbar^2}{2m}\frac{\psi''}{\psi}$ with $\frac{\psi''}{\psi} = \frac{x^2}{${b}^4} - \frac{1}{${b}^2}$. The constant cancels against $E$, leaving a harmonic potential $V = \frac{\hbar^2x^2}{2m${b}^4}$.` },
          { q: raw`A particle of mass $m$ moves in the potential $V(x) = \dfrac{\hbar^2x^2}{2m${b}^4}$. The function $\psi(x) = Axe^{-x^2/2${b}^2}$ is an energy eigenfunction. What is its energy?`,
            a: raw`\frac{3\hbar^2}{2m${b}^2}`,
            w: [raw`\frac{\hbar^2}{2m${b}^2}`, raw`\frac{5\hbar^2}{2m${b}^2}`, raw`\frac{3\hbar^2}{m${b}^2}`, raw`\frac{3\hbar^2}{4m${b}^2}`, raw`\frac{3\hbar}{2m${b}^2}`],
            why: raw`$\psi''/\psi = x^2/${b}^4 - 3/${b}^2$, so $E = V - \frac{\hbar^2}{2m}\frac{\psi''}{\psi} = \frac{3\hbar^2}{2m${b}^2}$. (This is the first excited state of an oscillator with $\hbar\omega = \hbar^2/m${b}^2$: $E = \tfrac{3}{2}\hbar\omega$.)` },
          { q: raw`A particle of mass $m$ moves in a potential that vanishes everywhere except at $x = 0$. Its bound-state wavefunction is $\psi(x) = Ae^{-${k}|x|}$ with ${k} > 0. What is its energy?`.replace(`with ${k} > 0`, `with $${k} > 0$`),
            a: raw`-\frac{\hbar^2${k}^2}{2m}`,
            w: [raw`\frac{\hbar^2\,${k}^2}{2m}`, raw`-\frac{\hbar^2\,${k}^2}{m}`, raw`-\frac{\hbar\,${k}^2}{2m}`, raw`-\frac{\hbar^2\,${k}}{2m}`, '0'],
            why: raw`For $x \neq 0$, $V = 0$ and $-\frac{\hbar^2}{2m}\psi'' = E\psi$ with $\psi'' = ${k}^2\psi$, so $E = -\hbar^2${k}^2/2m$: negative, as a bound state in a potential that vanishes at infinity must be.` },
          { q: raw`In a region where the potential has the constant value $V_0$, the energy eigenfunction of a particle of mass $m$ is $\psi(x) = A\sin(kx) + B\cos(kx)$, with $k$ real. What is the energy of the particle?`,
            a: raw`V_0 + \frac{\hbar^2k^2}{2m}`,
            w: [raw`V_0 - \frac{\hbar^2k^2}{2m}`, raw`\frac{\hbar^2k^2}{2m}`, raw`V_0 + \frac{\hbar k^2}{2m}`, raw`V_0 + \frac{\hbar^2k^2}{m}`, raw`V_0 + \frac{\hbar^2k}{2m}`],
            why: raw`$-\frac{\hbar^2}{2m}\psi'' = \frac{\hbar^2k^2}{2m}\psi$, so $E = V_0 + \hbar^2k^2/2m$: oscillation means $E > V_0$ (classically allowed).` },
          { q: raw`In a region $x > 0$ where the potential has the constant value $V_0$, the energy eigenfunction of a particle of mass $m$ is $\psi(x) = Ce^{-${k}x}$, with $${k} > 0$ real. What is the energy of the particle?`,
            a: raw`V_0 - \frac{\hbar^2${k}^2}{2m}`,
            w: [raw`V_0 + \frac{\hbar^2\,${k}^2}{2m}`, raw`-\frac{\hbar^2\,${k}^2}{2m}`, raw`V_0 - \frac{\hbar^2\,${k}^2}{m}`, raw`V_0 - \frac{\hbar\,${k}^2}{2m}`, raw`\frac{\hbar^2\,${k}^2}{2m} - V_0`],
            why: raw`$\psi'' = ${k}^2\psi$ gives $-\frac{\hbar^2}{2m}\psi'' = -\frac{\hbar^2${k}^2}{2m}\psi$, so $E = V_0 - \hbar^2${k}^2/2m < V_0$: exponential decay means a classically forbidden region.` },
          { q: raw`For what value of $${b}$ is $\psi(x) = Ae^{-x^2/2${b}^2}$ an eigenfunction of $H = \dfrac{p^2}{2m} + \dfrac{1}{2}m\omega^2x^2$?`,
            a: raw`\sqrt{\frac{\hbar}{m\omega}}`,
            w: [raw`\sqrt{\frac{2\hbar}{m\omega}}`, raw`\sqrt{\frac{\hbar}{2m\omega}}`, raw`\frac{\hbar}{m\omega}`, raw`\sqrt{\frac{m\omega}{\hbar}}`, raw`\sqrt{\frac{\hbar\omega}{m}}`],
            why: raw`$-\frac{\hbar^2}{2m}\psi'' = -\frac{\hbar^2}{2m}\left(\frac{x^2}{${b}^4} - \frac{1}{${b}^2}\right)\psi$; the $x^2$ terms cancel against $\frac{1}{2}m\omega^2x^2$ only if $\frac{\hbar^2}{m${b}^4} = m\omega^2$, i.e. $${b} = \sqrt{\hbar/m\omega}$ (then $E = \hbar\omega/2$). Dimensional analysis alone leaves only $\sqrt{\hbar/m\omega}$ and its multiples.` },
        ];
        const c = R.pick(CASES);
        return { q: c.q, ...mcS(R, c.a, c.w), expl: c.why };
      },
    },

    // ================================================================ 5.1.4 Commutators and the uncertainty principle
    {
      id: 'qm.comm.xp', sec: '5.1.4', level: 2, weight: 2,
      gen(R) {
        const X = raw`\hat x`, P = raw`\hat p`;
        const pw = (o, k) => (k === 0 ? '' : k === 1 ? o : `${o}^{${k}}`);
        const n = R.int(2, 4);
        const E = [
          () => ({ c: raw`[${pw(X, n)}, ${P}]`, a: raw`${n}i\hbar${pw(X, n - 1)}`, w: [raw`-${n}i\hbar${pw(X, n - 1)}`, raw`i\hbar${pw(X, n - 1)}`, raw`${n}i\hbar${pw(X, n)}`, raw`${n}\hbar${pw(X, n - 1)}`, '0'],
            why: raw`Act on a test function: $[x^${n}, \hat p]f = -i\hbar(x^${n}f' - (x^${n}f)') = ${n}i\hbar ${pw('x', n - 1)}f$. In general $[f(\hat x), \hat p] = i\hbar f'(\hat x)$.` }),
          () => ({ c: raw`[${P}, ${pw(X, n)}]`, a: raw`-${n}i\hbar${pw(X, n - 1)}`, w: [raw`${n}i\hbar${pw(X, n - 1)}`, raw`-i\hbar${pw(X, n - 1)}`, raw`-${n}i\hbar${pw(X, n)}`, raw`-${n}\hbar${pw(X, n - 1)}`, '0'],
            why: raw`$[\hat p, f(\hat x)] = -i\hbar f'(\hat x)$; here $f' = ${n}${pw('x', n - 1)}$. Note the sign: $[\hat p, \hat x] = -i\hbar$.` }),
          () => ({ c: raw`[${X}, ${pw(P, n)}]`, a: raw`${n}i\hbar${pw(P, n - 1)}`, w: [raw`-${n}i\hbar${pw(P, n - 1)}`, raw`i\hbar${pw(P, n - 1)}`, raw`${n}i\hbar${pw(P, n)}`, raw`${n}i\hbar${pw(X, n - 1)}`, '0'],
            why: raw`Use $[A, BC] = [A,B]C + B[A,C]$ repeatedly: each of the ${n} factors of $\hat p$ contributes $i\hbar$, giving $${n}i\hbar${pw(P, n - 1)}$.` }),
          () => ({ c: raw`[${X}${P}, ${X}]`, a: raw`-i\hbar${X}`, w: [raw`i\hbar${X}`, raw`-i\hbar${P}`, '0', raw`i\hbar`, raw`-i\hbar${X}${P}`],
            why: raw`$[\hat x\hat p, \hat x] = \hat x[\hat p, \hat x] + [\hat x, \hat x]\hat p = -i\hbar\hat x$.` }),
          () => ({ c: raw`[${X}${P}, ${P}]`, a: raw`i\hbar${P}`, w: [raw`-i\hbar${P}`, raw`i\hbar${X}`, '0', raw`-i\hbar`, raw`i\hbar${P}^2`],
            why: raw`$[\hat x\hat p, \hat p] = \hat x[\hat p, \hat p] + [\hat x, \hat p]\hat p = i\hbar\hat p$.` }),
          () => ({ c: raw`[${X}, \hat H]`, pre: raw`For $\hat H = \hat p^2/2m + V(\hat x)$, `, a: raw`\frac{i\hbar${P}}{m}`, w: [raw`-\frac{i\hbar${P}}{m}`, raw`\frac{i\hbar${P}}{2m}`, raw`i\hbar`, '0', raw`i\hbar V'(${X})`],
            why: raw`$\hat x$ commutes with $V(\hat x)$, and $[\hat x, \hat p^2] = 2i\hbar\hat p$, so $[\hat x, \hat H] = i\hbar\hat p/m$ — consistent with $d\langle x\rangle/dt = \langle p\rangle/m$.` }),
          () => ({ c: raw`[\hat H, ${X}]`, pre: raw`For a free particle, $\hat H = \hat p^2/2m$; `, a: raw`-\frac{i\hbar${P}}{m}`, w: [raw`\frac{i\hbar${P}}{m}`, raw`-\frac{i\hbar${P}}{2m}`, raw`-i\hbar`, '0', raw`-\frac{2i\hbar${P}}{m}`],
            why: raw`$[\hat p^2, \hat x] = \hat p[\hat p, \hat x] + [\hat p, \hat x]\hat p = -2i\hbar\hat p$; divide by $2m$.` }),
          () => {
            const V = R.pick([
              [raw`\tfrac{1}{2}k\hat x^2`, raw`-i\hbar k${X}`, [raw`i\hbar k${X}`, raw`-2i\hbar k${X}`, raw`-\tfrac{1}{2}i\hbar k${X}^2`, '0', raw`-\frac{i\hbar${P}}{m}`], raw`V' = kx`],
              [raw`\lambda\hat x^4`, raw`-4i\hbar\lambda${X}^3`, [raw`4i\hbar\lambda${X}^3`, raw`-i\hbar\lambda${X}^4`, raw`-4i\hbar\lambda${X}^2`, '0', raw`-i\hbar\lambda${X}^3`], raw`V' = 4\lambda x^3`],
              [raw`V_0e^{-\hat x/a}`, raw`\frac{i\hbar V_0}{a}e^{-${X}/a}`, [raw`-\frac{i\hbar V_0}{a}e^{-${X}/a}`, raw`i\hbar V_0e^{-${X}/a}`, '0', raw`-i\hbar V_0 a\,e^{-${X}/a}`, raw`\frac{\hbar V_0}{a}e^{-${X}/a}`], raw`V' = -(V_0/a)e^{-x/a}`],
            ]);
            return { c: raw`[${P}, \hat H]`, pre: raw`For $\hat H = \hat p^2/2m + ${V[0]}$, `, a: V[1], w: V[2], why: raw`$\hat p$ commutes with $\hat p^2$, and $[\hat p, V(\hat x)] = -i\hbar V'(\hat x)$ with ${V[2] && V[3]}. (Ehrenfest: $d\langle p\rangle/dt = -\langle V'\rangle$.)` };
          },
          () => ({ c: raw`[${P}, e^{ik${X}}]`, pre: raw`For a real constant $k$, `, a: raw`\hbar k\,e^{ik${X}}`, w: [raw`-\hbar k\,e^{ik${X}}`, raw`i\hbar k\,e^{ik${X}}`, raw`-i\hbar k\,e^{ik${X}}`, '0', raw`\hbar k`],
            why: raw`$[\hat p, f(\hat x)] = -i\hbar f'(\hat x) = -i\hbar(ik)e^{ikx} = \hbar k\,e^{ik\hat x}$: this operator raises the momentum by $\hbar k$.` }),
          () => {
            const [i, j] = [R.pick(['x', 'y', 'z']), R.pick(['x', 'y', 'z'])];
            const same = i === j;
            return { c: raw`[\hat ${i}, \hat p_${j}]`, a: same ? raw`i\hbar` : '0', w: same ? [raw`-i\hbar`, '0', raw`\hbar`, 'i', raw`-\hbar`] : [raw`i\hbar`, raw`-i\hbar`, raw`\hbar`, raw`i\hbar\hat p_${j}`],
              why: raw`$[\hat x_i, \hat p_j] = i\hbar\delta_{ij}$: ${same ? 'a coordinate and its own momentum do not commute' : 'different Cartesian components commute'}.` };
          },
          () => ({ c: raw`[${X}, [${X}, ${P}^2]]`, a: raw`-2\hbar^2`, w: [raw`2\hbar^2`, raw`2i\hbar${P}`, '0', raw`-\hbar^2`, raw`2i\hbar`],
            why: raw`$[\hat x, \hat p^2] = 2i\hbar\hat p$, then $[\hat x, 2i\hbar\hat p] = 2i\hbar(i\hbar) = -2\hbar^2$.` }),
          () => ({ c: raw`[${X}${P}, ${P}${X}]`, a: '0', w: [raw`i\hbar`, raw`-i\hbar`, raw`2i\hbar${X}${P}`, raw`\hbar^2`, raw`2i\hbar`],
            why: raw`$\hat x\hat p = \hat p\hat x + i\hbar$, and $\hat p\hat x$ commutes with $\hat p\hat x + i\hbar$ (a number commutes with everything).` }),
          () => ({ c: raw`[${P}^2, ${X}]`, a: raw`-2i\hbar${P}`, w: [raw`2i\hbar${P}`, raw`-i\hbar${P}`, raw`-2i\hbar`, '0', raw`-2\hbar${P}`],
            why: raw`$[\hat p^2, \hat x] = \hat p[\hat p, \hat x] + [\hat p, \hat x]\hat p = -2i\hbar\hat p$.` }),
        ];
        const e = R.pick(E)();
        return {
          q: (e.pre || '') + (e.pre ? 'what' : 'What') + raw` is the commutator $${e.c}$? (Here $[\hat x, \hat p] = i\hbar$.)`,
          ...mcS(R, e.a, e.w),
          expl: e.why,
        };
      },
    },
    {
      id: 'qm.comm.algebra', sec: '5.1.4', level: 2,
      gen(R) {
        const [a, b] = R.pick([['A', 'B'], ['X', 'Y'], ['Q', 'P'], ['F', 'G']]);
        const A = raw`\hat ${a}`, B = raw`\hat ${b}`;
        const [k0, sym] = R.pick([[1, raw`i\hbar`], [-1, raw`i\hbar`], [1, 'i'], [2, 'i'], [1, ''], [1, raw`i\lambda`], [3, raw`i\hbar`]]);
        const f = (kk, op) => {
          if (kk === 0) return '0';
          if (!sym && !op) return String(kk);
          return (kk === 1 ? '' : kk === -1 ? '-' : String(kk)) + sym + op;
        };
        const c = f(k0, '');
        const AB = A + B, BA = B + A;
        const E = [
          { q: raw`[${A}, ${B}^2]`, a: f(2 * k0, B), w: [f(k0, B), f(-2 * k0, B), f(2 * k0, ''), f(k0, B + '^2'), f(2 * k0, A), '0'], why: raw`$[A, B^2] = [A,B]B + B[A,B] = 2cB$.` },
          { q: raw`[${A}^2, ${B}]`, a: f(2 * k0, A), w: [f(k0, A), f(-2 * k0, A), f(2 * k0, ''), f(k0, A + '^2'), f(2 * k0, B), '0'], why: raw`$[A^2, B] = A[A,B] + [A,B]A = 2cA$.` },
          { q: raw`[${A}, ${B}^3]`, a: f(3 * k0, B + '^2'), w: [f(3 * k0, B), f(k0, B + '^2'), f(-3 * k0, B + '^2'), f(3 * k0, B + '^3'), f(2 * k0, B + '^2')], why: raw`Each factor of $B$ contributes $c$: $[A, B^3] = 3cB^2$.` },
          { q: raw`[${AB}, ${B}]`, a: f(k0, B), w: [f(-k0, B), f(k0, A), f(2 * k0, B), '0', f(k0, '') === '1' ? '1' : f(k0, '')], why: raw`$[AB, B] = A[B,B] + [A,B]B = cB$.` },
          { q: raw`[${AB}, ${A}]`, a: f(-k0, A), w: [f(k0, A), f(-k0, B), '0', f(-2 * k0, A), f(-k0, '')], why: raw`$[AB, A] = A[B,A] + [A,A]B = -cA$.` },
          { q: raw`[${A}^2, ${B}^2]`, a: f(2 * k0, raw`(${AB} + ${BA})`), w: [f(4 * k0, AB), '0', f(2 * k0, raw`(${AB} - ${BA})`), f(-2 * k0, raw`(${AB} + ${BA})`), f(k0, raw`(${AB} + ${BA})`)], why: raw`$[A^2, B^2] = A[A,B^2] + [A,B^2]A = 2c(AB + BA)$. (Note $4cAB$ is wrong: $AB \ne BA$.)` },
          { q: raw`[${AB}, ${BA}]`, a: '0', w: [f(k0, ''), f(2 * k0, AB), f(-k0, ''), f(k0, raw`(${AB} + ${BA})`), f(2 * k0, '')], why: raw`$AB = BA + c$, and $BA$ commutes with $BA + c$ because $c$ is a number.` },
          { q: raw`[${B}, ${A}^2]`, a: f(-2 * k0, A), w: [f(2 * k0, A), f(-k0, A), f(-2 * k0, B), f(-2 * k0, ''), '0'], why: raw`$[B, A^2] = -[A^2, B] = -2cA$.` },
          { q: raw`[${A}, ${B}${A}${B}]`, a: f(k0, raw`(${AB} + ${BA})`), w: [f(2 * k0, AB), f(2 * k0, BA), '0', f(-k0, raw`(${AB} + ${BA})`), f(k0, raw`(${AB} - ${BA})`)], why: raw`$[A, BAB] = [A,B]AB + B[A,A]B + BA[A,B] = c(AB + BA)$.` },
        ];
        const e = R.pick(E);
        return {
          q: raw`Two operators satisfy $[${A}, ${B}] = ${c}$${sym.indexOf('lambda') >= 0 ? raw`, where $\lambda$ is a real constant` : ''}. What is $${e.q}$?`,
          ...mcS(R, e.a, e.w),
          level: R.bool(0.3) ? 3 : 2,
          expl: raw`With $c = [${A}, ${B}] = ${c}$ a number, use the product rules $[AB, C] = A[B,C] + [A,C]B$ and $[A, BC] = [A,B]C + B[A,C]$: ` + e.why,
        };
      },
    },
    {
      id: 'qm.comm.estimate', sec: '5.1.4', level: 2,
      gen(R) {
        const sc = R.pick([
          { who: 'an electron', what: 'confined to a region the size of an atom', L: [0.05, 0.1, 0.2, 0.3], u: 'nm', mc2: MEC2 },
          { who: 'an electron', what: 'confined in a semiconductor quantum dot', L: [2, 5, 10, 20], u: 'nm', mc2: MEC2 },
          { who: 'an electron', what: 'bound in a molecule', L: [0.1, 0.15, 0.2], u: 'nm', mc2: MEC2 },
          { who: 'a proton', what: 'confined inside a nucleus', L: [2, 4, 5, 8, 10], u: 'fm', mc2: MPC2 },
          { who: 'a neutron', what: 'confined inside a nucleus', L: [3, 5, 6, 10], u: 'fm', mc2: MPC2 },
          { who: 'an electron', what: 'confined inside a nucleus', L: [2, 5, 10], u: 'fm', mc2: MEC2 },
        ]);
        const L = R.pick(sc.L);
        const pc = HBARC / (sc.u === 'nm' ? L : L * 1e-6);   // eV
        const K = Math.sqrt(pc * pc + sc.mc2 * sc.mc2) - sc.mc2;
        const rel = pc > sc.mc2;
        const e10 = Math.floor(Math.log10(K)), lead = Math.round(K / 10 ** e10);
        const val = lead * 10 ** e10;
        const j = R.int(0, 4);
        const opts = [0, 1, 2, 3, 4].map(i => val * 100 ** (i - j));
        const fmt = x => F.sci(x, 1) + raw`\,\text{eV}`;
        return {
          q: raw`${sc.who[0].toUpperCase() + sc.who.slice(1)} is ${sc.what}, of linear size about $${F.num(L, 2)}\,\text{${sc.u}}$. Use the uncertainty principle to estimate its kinetic energy. The result is closest to`,
          ...mcV(R, [fmt(val), val], opts.filter((_, i) => i !== j).map(x => [fmt(x), x])),
          expl: raw`$\Delta p \approx \hbar/\Delta x$, so $pc \approx \hbar c/L = (197\,\text{eV·nm})/(${F.num(sc.u === 'nm' ? L : L * 1e-6, 2)}\,\text{nm}) \approx ${F.sci(pc, 2)}\,\text{eV}$. ` +
            (rel ? raw`This exceeds $mc^2 = ${F.sci(sc.mc2, 2)}\,\text{eV}$, so the particle is relativistic and $K \approx pc \approx ${F.sci(K, 1)}\,\text{eV}$ (one reason electrons cannot be bound inside nuclei).`
              : raw`Then $K \approx \dfrac{(pc)^2}{2mc^2}$ with $mc^2 = ${F.sci(sc.mc2, 2)}\,\text{eV}$, giving $K \approx ${F.sci(K, 1)}\,\text{eV}$. Factors of 2 do not matter for an order-of-magnitude estimate.`),
        };
      },
    },
    {
      id: 'qm.comm.lifetime', sec: '5.1.4', level: 2,
      gen(R) {
        const sc = R.pick(['atom', 'atom', 'nuc', 'res', 'meta']);
        const fmtE = x => F.sci(x, 1) + raw`\,\text{eV}`, fmtT = x => F.sci(x, 1) + raw`\,\text{s}`;
        const choices = (val, fmt) => {
          const e10 = Math.floor(Math.log10(val)), lead = Math.round(val / 10 ** e10), v = lead * 10 ** e10;
          const j = R.int(0, 4);
          const all = [0, 1, 2, 3, 4].map(i => v * 100 ** (i - j));
          return mcV(R, [fmt(v), v], all.filter((_, i) => i !== j).map(x => [fmt(x), x]));
        };
        if (sc === 'res') {
          const G = R.pick([[100, 'MeV'], [150, 'MeV'], [200, 'MeV'], [50, 'MeV'], [2.5, 'GeV'], [10, 'MeV']]);
          const GeV = G[1] === 'GeV' ? G[0] * 1e9 : G[0] * 1e6;
          const tau = HBAR_EVS / GeV;
          return {
            q: raw`A short-lived particle (a resonance) is observed as a peak in an invariant-mass distribution with an energy width of about $${G[0]}\,\text{${G[1]}}$. Its lifetime is approximately`,
            ...choices(tau, fmtT),
            expl: raw`$\Delta E\,\Delta t \approx \hbar$ gives $\tau \approx \hbar/\Gamma = (6.6\times 10^{-16}\,\text{eV·s})/(${F.sci(GeV, 2)}\,\text{eV}) \approx ${F.sci(tau, 1)}\,\text{s}$ — typical of strong decays.`,
          };
        }
        const T = {
          atom: [[1, -8], [2, -8], [5, -9], [3, -9], [1, -9], [1.6, -9]],
          nuc: [[1, -12], [1, -14], [5, -15], [2, -13]],
          meta: [[1, -3], [1, -1], [5, -4]],
        }[sc];
        const [m, e] = R.pick(T);
        const tau = m * 10 ** e;
        const dE = HBAR_EVS / tau;
        const what = { atom: 'An excited atomic state', nuc: 'An excited nuclear state', meta: 'A metastable atomic state' }[sc];
        return {
          q: raw`${what} has a mean lifetime of $${F.sci(tau, 2)}\,\text{s}$. The uncertainty (natural width) in the energy of the photon it emits is approximately`,
          ...choices(dE, fmtE),
          expl: raw`Energy–time uncertainty: $\Delta E \approx \hbar/\tau = (6.6\times 10^{-16}\,\text{eV·s})/(${F.sci(tau, 2)}\,\text{s}) \approx ${F.sci(dE, 1)}\,\text{eV}$. Longer-lived states have sharper lines.`,
        };
      },
    },
    {
      id: 'qm.comm.compatible', sec: '5.1.4', level: 2,
      gen(R) {
        if (R.bool(0.45)) {
          const T = [
            [raw`$\hat x$ and $\hat p_y$`, raw`$[\hat x, \hat p_y] = 0$ (different components).`],
            [raw`$\hat x$ and $\hat y$`, 'positions always commute.'],
            [raw`$\hat p_x$ and $\hat p_y$`, 'momentum components commute.'],
            [raw`$\hat L^2$ and $\hat L_z$`, raw`$[\hat L^2, \hat L_z] = 0$.`],
            [raw`$\hat p_x$ and $\hat p_x^2$`, 'an operator commutes with any function of itself.'],
            [raw`$\hat y$ and $\hat p_z$`, raw`$[\hat y, \hat p_z] = 0$.`],
          ];
          const Fs = [
            [raw`$\hat x$ and $\hat p_x$`, raw`$[\hat x, \hat p_x] = i\hbar$.`],
            [raw`$\hat L_x$ and $\hat L_y$`, raw`$[\hat L_x, \hat L_y] = i\hbar\hat L_z$.`],
            [raw`$\hat x$ and $\hat p_x^2$`, raw`$[\hat x, \hat p_x^2] = 2i\hbar\hat p_x$.`],
            [raw`$\hat z$ and $\hat p_z$`, raw`$[\hat z, \hat p_z] = i\hbar$.`],
            [raw`$\hat x$ and $\hat L_z$`, raw`$[\hat x, \hat L_z] = -i\hbar\hat y$.`],
          ];
          return romanQ(R, 'For a particle moving in three dimensions, which of the following pairs of observables are compatible, that is, represented by operators that commute?', T, Fs);
        }
        const sys = R.pick([
          { V: '0', name: 'a free particle', t: [1, 1, 0, 1] },
          { V: raw`\tfrac{1}{2}m\omega^2x^2`, name: 'a harmonic oscillator', t: [0, 1, 0, 0] },
          { V: 'mgx', name: 'a particle in a uniform gravitational field', t: [0, 0, 0, 0] },
          { V: raw`\lambda x^4`, name: 'a particle in a quartic well', t: [0, 1, 0, 0] },
          { V: raw`V_0\cos(x/a)`, name: 'a particle in a periodic potential', t: [0, 1, 0, 0] },
        ]);
        const obs = [
          ['the momentum $p$', raw`$[\hat p, V(\hat x)] = -i\hbar V'$`],
          [raw`the parity $\hat\Pi$ ($x \to -x$)`, 'parity commutes with $H$ exactly when $V(x) = V(-x)$'],
          ['the position $x$', raw`$[\hat x, \hat p^2/2m] = i\hbar\hat p/m \ne 0$ always`],
          [raw`the kinetic energy $p^2/2m$`, raw`$[\hat p^2, V(\hat x)] \ne 0$ unless $V$ is constant`],
          ['the total energy $H$', 'every operator commutes with itself'],
        ];
        const truth = sys.t.concat([1]);
        let idx;
        do { idx = R.pickN([0, 1, 2, 3, 4], 3); } while (!idx.some(i => truth[i]) || (idx.indexOf(4) >= 0 && R.bool(0.6)));
        idx = R.shuffle(idx);
        return {
          q: GRE.romanStem(raw`A particle of mass $m$ moves in one dimension with $H = \dfrac{p^2}{2m} + V(x)$, where $V(x) = ${sys.V}$ (${sys.name}). Which of the following quantities is (are) conserved, i.e. commute with $H$?`, idx.map(i => obs[i][0])),
          ...GRE.roman(R, idx.map(i => !!truth[i])),
          expl: 'An observable is conserved when it commutes with the Hamiltonian. ' + idx.map((i, k) => `${ROMAN[k]}: ${truth[i] ? 'conserved' : 'not conserved'} (${obs[i][1]}).`).join(' '),
        };
      },
    },
    {
      id: 'qm.comm.uncertainty', sec: '5.1.4', level: 2,
      gen(R) {
        const v = R.pick(['gauss', 'num', 'num', 'ho', 'gen', 'ratio']);
        if (v === 'gauss') {
          const s = R.pick([raw`\sigma`, 'a', 'd']);
          return {
            q: raw`A particle is described by a Gaussian wave packet, a minimum-uncertainty state, with position uncertainty $\Delta x = ${s}$. What is its momentum uncertainty $\Delta p$?`,
            ...mcS(R, raw`\frac{\hbar}{2\,${s}}`, [raw`\frac{\hbar}{${s}}`, raw`\frac{2\hbar}{${s}}`, raw`\frac{\hbar}{4${s}}`, raw`\frac{h}{2${s}}`, raw`\frac{\hbar\,${s}}{2}`]),
            level: 1,
            expl: raw`A Gaussian saturates $\Delta x\,\Delta p \ge \hbar/2$, so $\Delta p = \hbar/(2\,${s})$ exactly. The folklore estimate $\Delta x\Delta p \approx \hbar$ is only an order-of-magnitude statement.`,
          };
        }
        if (v === 'num') {
          const p = R.pick([
            { who: 'an electron', m: GRE.C.me, dx: [0.1e-9, 0.05e-9, 1e-9, 0.2e-9, 10e-9], u: 'nm', s: 1e-9 },
            { who: 'a proton', m: GRE.C.mp, dx: [1e-15, 5e-15, 1e-12, 1e-10], u: 'pm', s: 1e-12 },
            { who: 'a dust grain of mass $1.0\\,\\mu\\text{g}$', m: 1e-9, dx: [1e-6, 1e-7], u: 'μm', s: 1e-6 },
          ]);
          const dx = R.pick(p.dx);
          const dv = GRE.C.hbar / (2 * p.m * dx);
          const dxTxt = p.u === 'μm' ? raw`${F.num(dx / 1e-6, 2)}\,\mu\text{m}` : p.u === 'pm' ? raw`${F.sci(dx, 1)}\,\text{m}` : raw`${F.num(dx / 1e-9, 2)}\,\text{nm}`;
          return {
            q: raw`The position of ${p.who} is known with uncertainty $\Delta x = ${dxTxt}$. What is the minimum possible uncertainty in its speed allowed by the uncertainty principle $\Delta x\,\Delta p \ge \hbar/2$?`,
            ...GRE.numeric(R, dv, [2 * dv, 2 * Math.PI * dv, dv / 2], { unit: raw`\text{m/s}` }),
            expl: raw`$\Delta v_{\min} = \dfrac{\hbar}{2m\Delta x} = \dfrac{1.05\times 10^{-34}}{2(${F.sci(p.m, 3)})(${F.sci(dx, 2)})} \approx ${F.sci(dv, 2)}\,\text{m/s}$. Using $h$ instead of $\hbar$, or dropping the $\tfrac{1}{2}$, are the usual slips.`,
          };
        }
        if (v === 'ho') {
          const n = R.int(0, 5);
          const H = k => cs(k, 2, raw`\hbar`);
          return {
            q: raw`A harmonic oscillator is in its energy eigenstate $|${n}\rangle$. What is the product $\Delta x\,\Delta p$ of the position and momentum uncertainties?`,
            ...mcS(R, H(2 * n + 1), [H(2 * n + 3), n ? H(1) : cs(1, 4, raw`\hbar`), n ? H(2 * n - 1) : '0', cs(n + 1, 1, raw`\hbar`), n ? cs(n, 1, raw`\hbar`) : raw`2\hbar`, cs(2 * n + 1, 1, raw`\hbar`)]),
            level: 2,
            expl: raw`In $|n\rangle$, $\langle x\rangle = \langle p\rangle = 0$, $\langle x^2\rangle = (2n+1)\frac{\hbar}{2m\omega}$ and $\langle p^2\rangle = (2n+1)\frac{m\hbar\omega}{2}$, so $\Delta x\Delta p = (n + \tfrac{1}{2})\hbar = ${H(2 * n + 1)}$. Only the ground state is a minimum-uncertainty state.`,
          };
        }
        if (v === 'gen') {
          const k = R.int(2, 6);
          const op = R.pick([['A', 'B'], ['Q', 'R'], ['F', 'G']]);
          return {
            q: raw`Two observables satisfy $[\hat ${op[0]}, \hat ${op[1]}] = ${k}i\hbar$. What is the smallest possible value of $\Delta ${op[0]}\,\Delta ${op[1]}$ in any state?`,
            ...mcS(R, cs(k, 2, raw`\hbar`), [cs(k, 1, raw`\hbar`), cs(k, 4, raw`\hbar`), cs(1, 2, raw`\hbar`), cs(2 * k, 1, raw`\hbar`), '0']),
            expl: raw`The general uncertainty relation is $\Delta A\,\Delta B \ge \tfrac{1}{2}|\langle[A,B]\rangle| = \tfrac{1}{2}(${k}\hbar) = ${cs(k, 2, raw`\hbar`)}$.`,
          };
        }
        const f = R.pick([2, 3, 4, 5, 10]);
        const dir = R.bool();
        const ans = dir ? f : 1 / f;
        const W = [1 / ans, ans * ans, Math.sqrt(ans), 1 / (ans * ans), 1].filter(x => Math.abs(x - ans) > 1e-9);
        return {
          q: raw`A particle is prepared in a minimum-uncertainty state. If the state is changed so that its position uncertainty $\Delta x$ is ${dir ? 'reduced' : 'increased'} by a factor of $${f}$ while remaining a minimum-uncertainty state, by what factor does its momentum uncertainty change?`,
          ...mcV(R, [ex(ans), ans], W.map(x => [ex(x), x])),
          level: 1,
          expl: raw`For a minimum-uncertainty state $\Delta x\,\Delta p = \hbar/2$, so $\Delta p \propto 1/\Delta x$ and changes by a factor of $${ex(ans)}$.`,
        };
      },
    },

    // ================================================================ 5.2.1 Harmonic oscillator, one dimension
    {
      id: 'qm.ho.levels', sec: '5.2.1', level: 1,
      gen(R) {
        const v = R.pick(['e0', 'e0', 'beta', 'ratio', 'photon']);
        if (v === 'e0') {
          const n = R.int(1, 6);
          const E = k => (k === 1 ? 'E_0' : `${k}E_0`);
          const W = [n + 1, n, (n + 1) ** 2, 2 * n - 1, 2 * n + 3, 2 * n].filter(k => k > 0 && k !== 2 * n + 1).map(E);
          return {
            q: raw`The ground-state energy of a one-dimensional harmonic oscillator is $E_0$. What is the energy of its ${ORD[n]} state?`,
            ...mcS(R, E(2 * n + 1), W),
            expl: raw`$E_n = (n + \tfrac{1}{2})\hbar\omega$ and $E_0 = \tfrac{1}{2}\hbar\omega$, so $E_n = (2n+1)E_0 = ${E(2 * n + 1)}$ for $n = ${n}$. The levels are equally spaced by $2E_0$.`,
          };
        }
        if (v === 'beta') {
          const n = R.int(0, 4);
          const b = R.pick([raw`\beta `, raw`\kappa `, 'C']);
          const c = F.coef(2 * n + 1, 2);
          return {
            q: raw`A particle of mass $m$ moves in the potential $V(x) = ${b}x^2$, where $${b} > 0$. What is the energy of its ${ORD[n]} state?`,
            ...mcS(R, raw`${c}\hbar\sqrt{\frac{2${b}}{m}}`, [raw`${c}\hbar\sqrt{\frac{${b}}{m}}`, raw`${c}\hbar\sqrt{\frac{${b}}{2m}}`, raw`${F.coef(n || 1, 1)}\hbar\sqrt{\frac{2${b}}{m}}`, raw`${F.coef(2 * n + 3, 2)}\hbar\sqrt{\frac{2${b}}{m}}`, raw`${c}\hbar\frac{2${b}}{m}`]),
            level: 2,
            expl: raw`Match $${b}x^2 = \tfrac{1}{2}m\omega^2x^2$: $\omega = \sqrt{2${b}/m}$. Then $E_n = (n + \tfrac{1}{2})\hbar\omega$ with $n = ${n}$.`,
          };
        }
        if (v === 'ratio') {
          const [m, n] = R.pickN([0, 1, 2, 3, 4, 5], 2);
          const fr = (a, b) => [F.frac(a, b), a / b];
          const W = [fr(n || 1, m || 1), fr(n + 1, m + 1), fr((n + 1) ** 2, (m + 1) ** 2), fr(2 * m + 1, 2 * n + 1), fr(2 * n + 3, 2 * m + 3)];
          return {
            q: raw`For a one-dimensional harmonic oscillator, what is the ratio $E_${n}/E_${m}$ of the energies of the states with $n = ${n}$ and $n = ${m}$?`,
            ...mcV(R, fr(2 * n + 1, 2 * m + 1), W),
            expl: raw`$E_n \propto n + \tfrac{1}{2}$, so $E_${n}/E_${m} = (2\cdot${n} + 1)/(2\cdot${m} + 1) = ${F.frac(2 * n + 1, 2 * m + 1)}$.`,
          };
        }
        const hw = R.pick([0.05, 0.1, 0.2, 0.25, 0.4, 0.5, 1.0]);
        const [lo, hi] = R.pickN([0, 1, 2, 3, 4], 2).sort((a, b) => a - b);
        const dE = (hi - lo) * hw, lam = HC / dE;
        const W = [HC / ((hi + 0.5) * hw), HC / hw, HC / ((hi * hi - lo * lo) * hw), HBARC / dE].filter(x => Math.abs(x / lam - 1) > 0.1);
        return {
          q: raw`A system can be modeled as a harmonic oscillator with $\hbar\omega = ${F.num(hw, 2)}\,\text{eV}$. What is the wavelength of the photon emitted in a transition from the state $n = ${hi}$ to $n = ${lo}$? (Use $hc = 1240\,\text{eV·nm}$.)`,
          ...GRE.numeric(R, lam, W, { unit: raw`\text{nm}` }),
          level: 2,
          expl: raw`$\Delta E = (${hi} - ${lo})\hbar\omega = ${F.num(dE, 3)}\,\text{eV}$ (the zero-point energy cancels), so $\lambda = hc/\Delta E = ${F.num(lam, 2)}\,\text{nm}$.`,
        };
      },
    },
    {
      id: 'qm.ho.ladder.act', sec: '5.2.1', level: 2,
      gen(R) {
        const len = R.pick([2, 2, 3, 3]);
        const ops = []; for (let i = 0; i < len; i++) ops.push(R.pick(['a', 'd']));
        const n = R.int(ops.every(o => o === 'a') ? len - 1 : 0, 5);
        const run = (seq, rule) => { // rule: correct or swapped normalization; apply right to left
          let m = n, c2 = 1;
          for (let i = seq.length - 1; i >= 0; i--) {
            if (seq[i] === 'a') { if (m === 0) return null; c2 *= rule ? m : m + 1; m -= 1; }
            else { c2 *= rule ? m + 1 : m; m += 1; if (!rule && c2 === 0) return null; }
          }
          return [c2, m];
        };
        const fmt = r => (r === null || r[0] === 0 ? '0' : (r[0] === 1 ? '' : F.sqrt(r[0]) + raw`\,`) + KET(r[1]));
        const cor = run(ops, true);
        const opTeX = ops.map(o => (o === 'a' ? raw`\hat a` : raw`\hat a^\dagger`)).join('');
        const W = [fmt(run(ops, false)), fmt(run(ops.slice().reverse(), false))];
        if (cor) {
          W.push(raw`${cor[0] === 1 ? '' : cor[0]}${KET(cor[1])}`.replace(/^(\d+)\|/, '$1\\,|'), fmt([cor[0], cor[1] + 1]), cor[1] > 0 ? fmt([cor[0], cor[1] - 1]) : fmt([cor[0] * 2, cor[1]]), '0', fmt([cor[0] * (cor[1] + 1), cor[1]]));
        } else W.push(KET(n), fmt([n + 1, n + 1]), fmt([n + 1, n]), KET(0), fmt([2, 1]), fmt([len, 1]), KET(1), fmt([3, 0]));
        if (cor) W.push(fmt([cor[0], cor[1] + 2]), fmt([cor[0] + 1, cor[1]]), fmt([(cor[1] + 1) * (cor[1] + 2), cor[1]]));
        const give = R.bool();
        return {
          q: raw`For the harmonic oscillator, let $|n\rangle$ denote the normalized energy eigenstates${give ? raw`, with $\hat a|n\rangle = \sqrt{n}\,|n-1\rangle$ and $\hat a^\dagger|n\rangle = \sqrt{n+1}\,|n+1\rangle$` : ''}. What is $${opTeX}|${n}\rangle$?`,
          ...mcS(R, fmt(cor), W),
          expl: raw`Operators act right to left. ` + (cor ? raw`Each $\hat a^\dagger$ on $|m\rangle$ gives $\sqrt{m+1}$ and each $\hat a$ gives $\sqrt{m}$; multiplying the factors gives $${fmt(cor)}$.` : raw`At some step $\hat a$ acts on $|0\rangle$, which gives zero ($\hat a|0\rangle = 0$), so the result is $0$.`),
        };
      },
    },
    {
      id: 'qm.ho.ladder.expect', sec: '5.2.1', level: 2, weight: 2,
      gen(R) {
        const n = R.int(0, 6);
        const pure = [
          [raw`\hat a^\dagger\hat a`, n], [raw`\hat a\hat a^\dagger`, n + 1], [raw`\hat a^\dagger\hat a + \hat a\hat a^\dagger`, 2 * n + 1],
          [raw`(\hat a + \hat a^\dagger)^2`, 2 * n + 1], [raw`(\hat a - \hat a^\dagger)^2`, -(2 * n + 1)], [raw`\hat a^{\dagger 2}\hat a^2`, n * (n - 1)],
          [raw`\hat a\hat a^\dagger\hat a\hat a^\dagger`, (n + 1) ** 2], [raw`\hat a^\dagger\hat a\hat a^\dagger\hat a`, n * n], [raw`\hat a^2\hat a^{\dagger 2}`, (n + 1) * (n + 2)],
          [raw`\hat a^2 + \hat a^{\dagger 2}`, 0],
        ];
        if (R.bool(0.55)) {
          const [op, val] = R.pick(pure);
          const pool = [n, n + 1, 2 * n + 1, 2 * n, n * n, (n + 1) ** 2, n * (n - 1), (n + 1) * (n + 2), -(2 * n + 1), 0, 1, 2 * n + 3];
          return {
            q: raw`For the harmonic oscillator energy eigenstate $|${n}\rangle$, what is $\langle ${n}|${op}|${n}\rangle$?`,
            ...mcV(R, [String(val), val], R.shuffle(pool).map(x => [String(x), x])),
            expl: raw`Only terms with equal numbers of $\hat a$ and $\hat a^\dagger$ survive (orthogonality). Use $\hat a^\dagger\hat a|n\rangle = n|n\rangle$ and $\hat a\hat a^\dagger = \hat a^\dagger\hat a + 1$; here the result is $${val}$ for $n = ${n}$.`,
          };
        }
        const k = 2 * n + 1;
        const Q = R.pick([
          { op: raw`\hat x^2`, a: fracSym(k, 2, raw`\hbar`, raw`m\omega`), w: [fracSym(k, 1, raw`\hbar`, raw`m\omega`), fracSym(1, 2, raw`\hbar`, raw`m\omega`), fracSym(n || 3, 2, raw`\hbar`, raw`m\omega`), fracSym(k, 2, raw`m\hbar\omega`), fracSym(k + 2, 2, raw`\hbar`, raw`m\omega`)].filter((x, i) => !(n === 0 && i === 1)),
            why: raw`$\hat x = \sqrt{\hbar/2m\omega}(\hat a + \hat a^\dagger)$ and $\langle n|(\hat a + \hat a^\dagger)^2|n\rangle = 2n+1$.` },
          { op: raw`\hat p^2`, a: fracSym(k, 2, raw`m\hbar\omega`), w: [fracSym(k, 1, raw`m\hbar\omega`), fracSym(1, 2, raw`m\hbar\omega`), fracSym(k, 2, raw`\hbar`, raw`m\omega`), fracSym(-k, 2, raw`m\hbar\omega`), fracSym(k + 2, 2, raw`m\hbar\omega`)].filter((x, i) => !(n === 0 && i === 1)),
            why: raw`$\hat p = i\sqrt{m\hbar\omega/2}(\hat a^\dagger - \hat a)$, so $\langle\hat p^2\rangle = \frac{m\hbar\omega}{2}\langle -(\hat a^\dagger - \hat a)^2\rangle = (2n+1)\frac{m\hbar\omega}{2}$ (equivalently, $\langle T\rangle = E_n/2$).` },
          { op: raw`\tfrac{1}{2}m\omega^2\hat x^2`, a: fracSym(k, 4, raw`\hbar\omega`), w: [fracSym(k, 2, raw`\hbar\omega`), fracSym(1, 4, raw`\hbar\omega`), fracSym(n || 3, 2, raw`\hbar\omega`), fracSym(k, 8, raw`\hbar\omega`), fracSym(k + 2, 4, raw`\hbar\omega`)],
            why: raw`By the virial theorem $\langle V\rangle = \langle T\rangle = E_n/2 = (2n+1)\hbar\omega/4$.` },
          { op: raw`\hat x`, a: '0', w: [raw`\sqrt{\frac{\hbar}{2m\omega}}`, raw`\sqrt{\frac{${k}\hbar}{2m\omega}}`, raw`\sqrt{\frac{\hbar}{m\omega}}`, raw`${n || 1}\sqrt{\frac{\hbar}{2m\omega}}`],
            why: raw`$\hat x \propto \hat a + \hat a^\dagger$ changes $n$ by $\pm 1$, so $\langle n|\hat x|n\rangle = 0$ (also by parity).` },
          { op: raw`\hat x\hat p + \hat p\hat x`, a: '0', w: [raw`i\hbar`, raw`${k}\hbar`, raw`-i\hbar`, raw`${k}i\hbar`],
            why: raw`$\hat x\hat p + \hat p\hat x = i\hbar(\hat a^{\dagger 2} - \hat a^2)$ has no diagonal matrix elements.` },
        ]);
        return {
          q: raw`A particle of mass $m$ is in the energy eigenstate $|${n}\rangle$ of a harmonic oscillator with angular frequency $\omega$. What is $\langle ${Q.op}\rangle$?`,
          ...mcS(R, Q.a, Q.w),
          expl: Q.why + (Q.a === '0' ? '' : raw` For $n = ${n}$ this gives $${Q.a}$.`),
        };
      },
    },
    {
      id: 'qm.ho.superpos', sec: '5.2.1', level: 3,
      gen(R) {
        const [c1, c2] = R.pick([[1, 1], [1, -1], [1, 2], [2, 1], [2, -1], [1, 3], [3, 1], [1, -2]]);
        const N2 = c1 * c1 + c2 * c2;
        const n1 = R.int(0, 3);
        const ask = R.pick(['H', 'x2', 'x2', 'p2', 'x', 'xt']);
        const dn = ask === 'x' || ask === 'xt' ? 1 : ask === 'H' ? R.pick([1, 2, 3]) : R.pick([2, 2, 3, 1]);
        const n2 = n1 + dn;
        if (n1 === 1 && n2 === 4 && c1 === c2) throw new Error('avoid book example');
        const st = raw`$\frac{1}{\sqrt{${N2}}}\left(${c1 === 1 ? '' : c1}|${n1}\rangle ${c2 < 0 ? '-' : '+'} ${Math.abs(c2) === 1 ? '' : Math.abs(c2)}|${n2}\rangle\right)$`;
        const intro = raw`A particle of mass $m$ in a harmonic oscillator of angular frequency $\omega$ is, at $t = 0$, in the state ${st}, where $|n\rangle$ are the normalized energy eigenstates.`;
        const D = c1 * c1 * (2 * n1 + 1) + c2 * c2 * (2 * n2 + 1);
        const AB = (A, B, s, den, unitTop, unitBot) => {   // (A + B sqrt s)/den * unit
          if (!B) return fracSym(A, den, unitTop, unitBot);
          const g = gcd(gcd(Math.abs(A), Math.abs(B)), den); A /= g; B /= g; den /= g;
          const surd = (Math.abs(B) === 1 ? '' : Math.abs(B)) + raw`\sqrt{${s}}`;
          const num = raw`(${A} ${B < 0 ? '-' : '+'} ${surd})${unitTop}`;
          return den === 1 && !unitBot ? num : raw`\frac{${num}}{${den === 1 ? '' : den}${unitBot}}`;
        };
        if (ask === 'H') {
          const W = [fracSym(D, 2, raw`\hbar\omega`), fracSym(2 * n1 + 2 * n2 + 2, 4, raw`\hbar\omega`), fracSym(c1 * c1 * n1 + c2 * c2 * n2, N2, raw`\hbar\omega`), fracSym(c2 * c2 * (2 * n1 + 1) + c1 * c1 * (2 * n2 + 1), 2 * N2, raw`\hbar\omega`), fracSym(D, N2, raw`\hbar\omega`), fracSym(D + N2, 2 * N2, raw`\hbar\omega`), fracSym(2 * n2 + 1, 2, raw`\hbar\omega`), fracSym(2 * n1 + 1, 2, raw`\hbar\omega`), fracSym(n1 + n2 + 1, 1, raw`\hbar\omega`)].filter(x => x !== fracSym(D, 2 * N2, raw`\hbar\omega`));
          return { q: intro + raw` What is $\langle H\rangle$?`, ...mcS(R, fracSym(D, 2 * N2, raw`\hbar\omega`), W), level: 2,
            expl: raw`$\langle H\rangle = \frac{1}{${N2}}\left[${c1 * c1}(${n1} + \tfrac{1}{2}) + ${c2 * c2}(${n2} + \tfrac{1}{2})\right]\hbar\omega = ${fracSym(D, 2 * N2, raw`\hbar\omega`)}$; there are no cross terms because $H$ is diagonal.` };
        }
        if (ask === 'x2' || ask === 'p2') {
          const [o, s] = F.surdParts((n1 + 1) * (n1 + 2));
          const B = dn === 2 ? 2 * c1 * c2 * o : 0;
          const sg = ask === 'x2' ? 1 : -1;
          const [ut, ub] = ask === 'x2' ? [raw`\hbar`, raw`m\omega`] : [raw`m\hbar\omega`, ''];
          const cor = AB(D, sg * B, s, 2 * N2, ut, ub);
          const W = [AB(D, 0, s, 2 * N2, ut, ub), AB(D, -sg * (B || 2 * c1 * c2 * o), s, 2 * N2, ut, ub), AB(D, sg * (B || 2 * c1 * c2 * o) / 2, s, 2 * N2, ut, ub), AB(D, sg * B, s, 2, ut, ub), AB(2 * n1 + 2 * n2 + 2, 0, s, 4, ut, ub), AB(c1 * c1 * 2 * n1 + c2 * c2 * 2 * n2, 0, s, 2 * N2, ut, ub)];
          const op = ask === 'x2' ? raw`\hat x^2` : raw`\hat p^2`;
          return { q: intro + raw` What is $\langle ${op}\rangle$ at $t = 0$?`, ...mcS(R, cor, W.filter(x => x !== cor && x !== '0')),
            expl: raw`${ask === 'x2' ? raw`$\hat x^2 = \frac{\hbar}{2m\omega}(\hat a + \hat a^\dagger)^2$` : raw`$\hat p^2 = -\frac{m\hbar\omega}{2}(\hat a^\dagger - \hat a)^2$`}. Diagonal terms give $(2n+1)$ for each state; $\hat a^2$ and $\hat a^{\dagger 2}$ connect states with $\Delta n = 2$, ${dn === 2 ? raw`so here there is a cross term $${sg > 0 ? '+' : '-'}2c_1c_2\sqrt{(${n1}+1)(${n1}+2)}$ (in units of ${ask === 'x2' ? raw`$\hbar/2m\omega$` : raw`$m\hbar\omega/2$`}, divided by $${N2}$)` : raw`which are absent here ($\Delta n = ${dn}$), so there is no cross term`}. Result: $${cor}$.` };
        }
        const coef = 2 * c1 * c2 * Math.sqrt(n2) / N2;
        const U = raw`\sqrt{\frac{\hbar}{2m\omega}}`;
        const t = ask === 'xt';
        const cos = w => (t ? raw`\cos(${w}\,t)` : '');
        const term = (k, w) => (k === 0 ? '0' : ex(k) + U + cos(w));
        const cor = term(coef, raw`\omega`);
        const W = [t ? raw`${ex(coef)}${U}` : '0', term(coef / 2, raw`\omega`), n1 > 0 ? term(2 * c1 * c2 * Math.sqrt(n1) / N2, raw`\omega`) : term(2 * c1 * c2 / N2 * Math.sqrt(3), raw`\omega`), term(-coef, raw`\omega`), t ? term(coef, raw`2\omega`) : term(coef * N2, ''), t ? term(coef, raw`${2 * n1 + 2}\omega`) : '0'];
        return { q: intro + (t ? raw` What is $\langle x\rangle$ at time $t$?` : raw` What is $\langle x\rangle$ at $t = 0$?`), ...mcS(R, cor, W.filter(x => x !== cor)),
          expl: raw`$\hat x = ${U}(\hat a + \hat a^\dagger)$ connects $|${n1}\rangle$ and $|${n2}\rangle$ with matrix element $\sqrt{${n2}}$, giving $\langle x\rangle = ${U}\cdot\frac{2(${c1})(${c2})\sqrt{${n2}}}{${N2}}${t ? raw`\cos\omega t` : ''}$. ${t ? raw`The relative phase $e^{-i(E_${n2} - E_${n1})t/\hbar} = e^{-i\omega t}$ makes it oscillate at $\omega$.` : 'Forgetting the cross term would give zero.'}` };
      },
    },
    {
      id: 'qm.ho.half', sec: '5.2.1', level: 3,
      gen(R) {
        const ctx = R.pick([
          raw`A particle of mass $m$ moves in the potential $V(x) = \tfrac{1}{2}m\omega^2x^2$ for $x > 0$ and $V(x) = \infty$ for $x \le 0$.`,
          raw`A mass on a spring oscillates with angular frequency $\omega$ above an impenetrable wall placed at the spring's equilibrium point $x = 0$, so the potential is $\tfrac{1}{2}m\omega^2x^2$ for $x > 0$ and infinite for $x \le 0$.`,
        ]);
        const E = k => cs(k, 2, raw`\hbar\omega`);
        const v = R.pick(['k', 'k', 'gap', 'which']);
        if (v === 'k') {
          const k = R.int(0, 3);
          const cor = 4 * k + 3;
          const W = [...new Set([2 * k + 1, 4 * k + 1, 4 * k + 5, 2 * k + 3, 4 * k + 2, 4 * k + 7, 2 * k + 2])].filter(x => x !== cor).map(E);
          return { q: ctx + raw` What is the energy of its ${ORD[k]} state?`, ...mcS(R, E(cor), W),
            expl: raw`The wall forces $\psi(0) = 0$, so only the odd oscillator eigenfunctions ($n = 1, 3, 5, \ldots$) survive. The ${ORD[k]} state is $n = ${2 * k + 1}$, with $E = (${2 * k + 1} + \tfrac{1}{2})\hbar\omega = ${E(cor)}$.` };
        }
        if (v === 'gap') {
          return { q: ctx + raw` What is the spacing between adjacent energy levels?`, ...mcS(R, raw`2\hbar\omega`, [raw`\hbar\omega`, raw`\frac{1}{2}\hbar\omega`, raw`\frac{3}{2}\hbar\omega`, raw`4\hbar\omega`]),
            expl: raw`Only odd $n$ are allowed ($E = \tfrac{3}{2}, \tfrac{7}{2}, \tfrac{11}{2}, \ldots\ \hbar\omega$), so adjacent levels differ by $2\hbar\omega$.` };
        }
        const allowed = R.pick([3, 7, 11, 15]);
        return { q: ctx + raw` Which of the following is an allowed energy?`, ...mcS(R, E(allowed), R.pickN([1, 5, 9, 13, 2, 4, 6], 4).map(E)),
          expl: raw`Only the odd eigenfunctions of the full oscillator vanish at $x = 0$, so $E = (2k + 1 + \tfrac{1}{2})\hbar\omega = \tfrac{3}{2}, \tfrac{7}{2}, \tfrac{11}{2}, \tfrac{15}{2},\ldots\ \hbar\omega$.` };
      },
    },
    {
      id: 'qm.ho.scaling', sec: '5.2.1', level: 2,
      gen(R) {
        const QS = [
          { name: 'ground-state energy', e: [0.5, -0.5] }, { name: 'spacing between adjacent energy levels', e: [0.5, -0.5] },
          { name: 'wavelength of the photon emitted in the transition from the first excited state to the ground state', e: [-0.5, 0.5] },
          { name: raw`characteristic width $\sqrt{\langle x^2\rangle}$ of the ground-state wavefunction`, e: [-0.25, -0.25] },
          { name: raw`ground-state value of $\langle p^2\rangle$`, e: [0.5, 0.5] },
        ];
        for (let tries = 0; tries < 50; tries++) {
          const qq = R.pick(QS);
          const fk = R.pick([1, 4, 16, 2, 9, 1 / 4]), fm = R.pick([1, 4, 16, 2, 1 / 4, 1 / 2]);
          if (fk === 1 && fm === 1) continue;
          const val = (a, b) => fk ** a * fm ** b;
          const cor = val(...qq.e);
          const cs0 = ex(cor);
          if (!cs0 || Math.abs(cor - 1) < 1e-9) continue;
          const alts = [[0.5, -0.5], [-0.5, 0.5], [-0.25, -0.25], [0.25, 0.25], [1, -1], [-1, 1], [0.5, 0.5], [-0.5, -0.5], [1, 0], [0, 1], [-1, 0], [0, -1], [0.25, -0.25], [-0.25, 0.25], [2, -2]];
          const W = alts.map(e => val(...e)).map(x => [ex(x), x]).filter(w => w[0]);
          if (W.filter(w => Math.abs(w[1] / cor - 1) > 1e-6).length < 4) continue;
          const ch = [];
          if (fk !== 1) ch.push(`the spring constant is multiplied by $${ex(fk)}$`);
          if (fm !== 1) ch.push(`the mass is multiplied by $${ex(fm)}$`);
          return {
            q: raw`A particle of mass $m$ moves in the potential $V = \tfrac{1}{2}kx^2$. If ${ch.join(' and ')}, by what factor does the ${qq.name} change?`,
            ...mcV(R, [cs0, cor], W),
            expl: raw`With $\omega = \sqrt{k/m}$: energies scale as $\hbar\omega \propto k^{1/2}m^{-1/2}$, photon wavelengths as $1/\omega$, the width $\sqrt{\hbar/m\omega} \propto (mk)^{-1/4}$, and $\langle p^2\rangle \sim m\hbar\omega \propto (mk)^{1/2}$. Here the factor is $${cs0}$.`,
          };
        }
        throw new Error('scaling: no draw');
      },
    },
    {
      id: 'qm.ho.facts', sec: '5.2.1', level: 1,
      gen(R) {
        const T = [
          ['The energy levels are equally spaced.', raw`$E_n = (n + \tfrac{1}{2})\hbar\omega$.`],
          ['The ground-state energy is nonzero.', raw`$E_0 = \hbar\omega/2$, the zero-point energy required by the uncertainty principle.`],
          ['The ground-state wavefunction is a Gaussian.', raw`$\psi_0 \propto e^{-m\omega x^2/2\hbar}$.`],
          ['The ground state is a minimum-uncertainty state.', raw`it has $\Delta x\Delta p = \hbar/2$.`],
          ['No energy level is degenerate.', 'bound states in one dimension are nondegenerate.'],
          ['The eigenfunctions alternate between even and odd parity.', raw`$\psi_n(-x) = (-1)^n\psi_n(x)$.`],
          [raw`The state $|n\rangle$ has exactly $n$ nodes.`, 'the node count grows by one with each level.'],
          [raw`In every energy eigenstate $\langle T\rangle = \langle V\rangle$.`, 'this is the virial theorem for a quadratic potential.'],
          ['There are infinitely many bound states.', 'the potential grows without bound.'],
          [raw`The particle has nonzero probability of being found beyond the classical turning points.`, 'the wavefunction decays but is nonzero in the classically forbidden region.'],
        ];
        const Fs = [
          ['The ground-state energy is zero.', raw`it is $\hbar\omega/2$; zero is the classical minimum.`],
          [raw`The energy levels are proportional to $n^2$.`, 'that is the infinite square well.'],
          ['The first excited state is an even function of $x$.', 'it is odd.'],
          [raw`The lowering operator $\hat a$ is Hermitian.`, raw`$\hat a^\dagger \ne \hat a$.`],
          [raw`The ground state has one node.`, 'the ground state has no nodes.'],
          [raw`In the state $|n\rangle$, $\langle x\rangle \ne 0$ for $n \ge 1$.`, raw`$\langle n|\hat x|n\rangle = 0$ for every $n$.`],
          ['The particle can never be found outside the classical turning points.', 'quantum tunneling into the forbidden region occurs.'],
          ['The level spacing depends on the amplitude of oscillation.', raw`the spacing is always $\hbar\omega$.`],
        ];
        if (R.bool(0.5)) return romanQ(R, 'Which of the following is (are) true of the one-dimensional quantum harmonic oscillator?', T, Fs);
        const odd = R.pick(Fs);
        const o = oddOneQ(R, 'Which of the following is NOT true of the one-dimensional quantum harmonic oscillator?', odd, T);
        o.expl = `The false statement: "${odd[0]}" — ${odd[1]} All the others are standard properties.`;
        return o;
      },
    },

    // ================================================================ 5.2.2 three dimensions
    {
      id: 'qm.ho3d.degeneracy', sec: '5.2.2', level: 2, weight: 2,
      gen(R) {
        const d3 = R.bool(0.7);
        const v = R.pick(['deg', 'deg', 'energy', d3 ? 'count' : 'deg']);
        const Nn = R.int(1, 6);
        const deg = N => (d3 ? (N + 1) * (N + 2) / 2 : N + 1);
        const En = N => (d3 ? cs(2 * N + 3, 2, raw`\hbar\omega`) : cs(N + 1, 1, raw`\hbar\omega`));
        const ctx = d3 ? raw`A spinless particle moves in the three-dimensional isotropic harmonic oscillator potential $V = \tfrac{1}{2}m\omega^2(x^2 + y^2 + z^2)$.` : raw`A spinless particle is confined to a plane with potential $V = \tfrac{1}{2}m\omega^2(x^2 + y^2)$.`;
        if (v === 'deg') {
          const g = deg(Nn);
          const pool = [Nn + 1, (Nn + 1) ** 2, 3 * Nn, 2 * Nn + 1, Nn * (Nn + 1) / 2, (Nn + 2) * (Nn + 3) / 2, (Nn + 1) * (Nn + 2), Nn + 2, Nn, (Nn + 1) * (Nn + 2) / 2];
          return { q: ctx + raw` What is the degeneracy of the energy level $E = ${En(Nn)}$?`, ...mcV(R, [String(g), g], pool.map(x => [String(x), x])),
            expl: raw`$E = (n_x + n_y${d3 ? ' + n_z' : ''} + ${d3 ? raw`\tfrac{3}{2}` : '1'})\hbar\omega$, so this level has $N = ${Nn}$. The number of ways to write $N$ as a sum of ${d3 ? 'three' : 'two'} non-negative integers is ${d3 ? raw`$(N+1)(N+2)/2$` : raw`$N + 1$`} $= ${g}$.` };
        }
        if (v === 'energy') {
          const g = deg(Nn);
          const hw = raw`\hbar\omega`;
          const W = [En(Nn - 1), En(Nn + 1), En(Nn + 2), cs(2 * Nn + 1, 2, hw), cs(g, 1, hw), cs(2 * g + 1, 2, hw), cs(2 * g + 3, 2, hw), cs(2 * Nn + 3, 1, hw)].filter(x => x !== En(Nn));
          return { q: ctx + raw` What is the energy of the lowest level whose degeneracy is $${g}$?`, ...mcS(R, En(Nn), W),
            expl: raw`Degeneracy ${d3 ? raw`$(N+1)(N+2)/2$` : raw`$N+1$`} $= ${g}$ gives $N = ${Nn}$, so $E = (N + ${d3 ? raw`\tfrac{3}{2}` : '1'})\hbar\omega = ${En(Nn)}$.` };
        }
        const N = R.int(1, 4);
        const tot = (N + 1) * (N + 2) * (N + 3) / 6;
        const pool = [deg(N), tot - deg(N), (N + 1) ** 3, (N + 2) * (N + 3) * (N + 4) / 6, 3 * N + 1, (N + 1) * (N + 2), 2 * tot, (N + 1) * (N + 2) * (N + 3) / 2, tot + 1];
        return { q: ctx + raw` How many linearly independent energy eigenstates have energy less than or equal to $${En(N)}$?`, ...mcV(R, [String(tot), tot], pool.map(x => [String(x), x])), level: 3,
          expl: raw`Sum the degeneracies $(k+1)(k+2)/2$ for $k = 0, \ldots, ${N}$: $${[...Array(N + 1).keys()].map(k => (k + 1) * (k + 2) / 2).join(' + ')} = ${tot}$.` };
      },
    },
    {
      id: 'qm.ho3d.aniso', sec: '5.2.2', level: 3,
      gen(R) {
        const w = R.pick([[1, 1, 2], [1, 2, 2], [1, 1, 3], [1, 2, 3], [2, 2, 3], [1, 2], [1, 3], [2, 3], [1, 1, 4]]);
        const lv = {};
        const rec = (i, s) => { if (i === w.length) { lv[s] = (lv[s] || 0) + 1; return; } for (let n = 0; n < 14; n++) rec(i + 1, s + w[i] * (2 * n + 1)); };
        rec(0, 0);
        const Es = Object.keys(lv).map(Number).sort((a, b) => a - b).slice(0, 6); // 2E/hbar w
        const E = x => cs(x, 2, raw`\hbar\omega`);
        const names = ['x', 'y', 'z'];
        const pot = w.map((k, i) => (k === 1 ? '' : k * k) + names[i] + '^2').join(' + ');
        const ctx = raw`A spinless particle of mass $m$ moves in the ${w.length === 3 ? 'three' : 'two'}-dimensional potential $V = \tfrac{1}{2}m\omega^2(${pot})$.`;
        const v = R.pick(['g0', 'e1', 'deg', 'deg']);
        if (v === 'g0') {
          const s = w.reduce((a, b) => a + b, 0);
          return { q: ctx + ' What is its ground-state energy?', ...mcS(R, E(s), [E(w.length), E(2 * s), E(s + 2), E(s - 1), E(3 * s), E(w.length * 3)].filter(x => x !== E(s))),
            expl: raw`The motion separates into oscillators with frequencies ${w.map(k => (k === 1 ? raw`$\omega$` : `$${k}\\omega$`)).join(', ')}; each contributes zero-point energy $\hbar\omega_i/2$, for a total of $${E(s)}$.` };
        }
        if (v === 'e1') {
          return { q: ctx + ' What is the energy of its first excited level?', ...mcS(R, E(Es[1]), [E(Es[0]), E(Es[2]), E(Es[3]), E(Es[1] + 2), E(Es[0] + 1), E(Es[0] + 4), E(Es[0] + 6)].filter(x => x !== E(Es[1]))),
            expl: raw`The lowest excitation adds one quantum of the smallest frequency, $${Math.min(...w) === 1 ? '' : Math.min(...w)}\hbar\omega$, to the ground energy $${E(Es[0])}$, giving $${E(Es[1])}$.` };
        }
        const i = R.int(1, 4), g = lv[Es[i]];
        return { q: ctx + raw` What is the degeneracy of the level with energy $${E(Es[i])}$?`, ...mcV(R, [String(g), g], [1, 2, 3, 4, 5, 6].map(x => [String(x), x])),
          expl: raw`Write $E = \hbar\omega\sum_i k_i(n_i + \tfrac{1}{2})$ with $k = (${w.join(', ')})$ and count the $(n_i)$ giving $${E(Es[i])}$: there ${g === 1 ? 'is 1 way' : `are ${g} ways`}. Anisotropy lifts the degeneracy of the isotropic oscillator.` };
      },
    },

    // ================================================================ 5.3.1 Infinite square well
    {
      id: 'qm.isw.scaling', sec: '5.3.1', level: 1, weight: 2,
      gen(R) {
        const v = R.pick(['factor', 'factor', 'equal', 'trans']);
        if (v === 'factor') {
          for (let t = 0; t < 40; t++) {
            const fL = R.pick([1, 2, 3, 1 / 2, 1 / 3]), fm = R.pick([1, 2, 4, 1 / 2]), n0 = R.pick([1, 1, 2]), n1 = R.pick([1, 2, 3]);
            if (fL === 1 && fm === 1 && n0 === n1) continue;
            const f = (n1 / n0) ** 2 / (fm * fL * fL);
            const W = [(n1 / n0) ** 2 / (fm * fL), (n1 / n0) / (fm * fL * fL), (n1 / n0) ** 2 * fL * fL / fm, (n1 / n0) ** 2 * fm / (fL * fL), (n0 / n1) ** 2 * fm * fL * fL, (n1 / n0) ** 2 / (fm * fL ** 3)];
            const ch = [];
            if (fL !== 1) ch.push(`its width is multiplied by $${ex(fL)}$`);
            if (fm !== 1) ch.push(`its mass is multiplied by $${ex(fm)}$`);
            if (n1 !== n0) ch.push(`it is placed in the ${ORD[n1 - 1]} state instead`);
            const wr = W.filter(x => Math.abs(x / f - 1) > 1e-6).map(x => [ex(x), x]);
            if (new Set(wr.map(x => x[0])).size < 4) continue;
            return {
              q: raw`A particle is in the ${ORD[n0 - 1]} state of an infinite square well. If ${ch.join(', and ')}, by what factor does its energy change?`,
              ...mcV(R, [ex(f), f], wr),
              expl: raw`$E_n = \dfrac{n^2\pi^2\hbar^2}{2mL^2} \propto \dfrac{n^2}{mL^2}$, so the factor is $\dfrac{${n1 === n0 ? '1' : `(${n1}/${n0})^2`}}{(${ex(fm)})(${ex(fL)})^2} = ${ex(f)}$.`,
            };
          }
          throw new Error('isw factor');
        }
        if (v === 'equal') {
          for (let t = 0; t < 40; t++) {
            const k = R.pick([2, 3, 4, 9, 1 / 2, 1 / 4]), nA = R.pick([1, 1, 2, 3]), nB = R.pick([1, 2, 3]);
            if (k === 2 && nA === 1 && nB === 1) continue;
            if (k === 1 && nA === nB) continue;
            const r = (nB / nA) / Math.sqrt(k);
            const W = [(nB / nA) ** 2 / k, (nB / nA) * Math.sqrt(k), (nA / nB) / Math.sqrt(k), 1 / Math.sqrt(k), (nB / nA) / k, Math.sqrt(k) * nA / nB];
            const wr = W.filter(x => Math.abs(x / r - 1) > 1e-6).map(x => [ex(x), x]).filter(x => x[0]);
            if (new Set(wr.map(x => x[0])).size < 4 || !ex(r)) continue;
            return {
              q: raw`Particle A, of mass $m$, is in the ${ORD[nA - 1]} state of an infinite square well of width $L_A$. Particle B, of mass $${ex(k)}m$, is in the ${ORD[nB - 1]} state of an infinite square well of width $L_B$. The two particles have the same energy. What is $L_B/L_A$?`.replace('$1m$', '$m$'),
              ...mcV(R, [ex(r), r], wr),
              expl: raw`$E \propto n^2/(mL^2)$, so $\dfrac{${nA * nA === 1 ? '1' : nA * nA}}{mL_A^2} = \dfrac{${nB * nB}}{${ex(k)}m L_B^2}$, giving $L_B/L_A = \dfrac{${nB}/${nA}}{\sqrt{${ex(k)}}} = ${ex(r)}$.`,
            };
          }
          throw new Error('isw equal');
        }
        const n = R.int(1, 3);
        const a = [n + 2, n + 1], b = [n + 1, n];
        const num = a[0] ** 2 - a[1] ** 2, den = b[0] ** 2 - b[1] ** 2;
        const fr = (x, y) => [F.frac(x, y), x / y];
        return {
          q: raw`For a particle in an infinite square well, what is the ratio of the photon energy emitted in the $n = ${a[0]} \to ${a[1]}$ transition to that emitted in the $n = ${b[0]} \to ${b[1]}$ transition?`,
          ...mcV(R, fr(num, den), [fr(1, 1), fr(a[0] ** 2, b[0] ** 2), fr(a[0], b[0]), fr(den, num), fr(num, b[0] ** 2), fr(a[0] ** 2 + a[1] ** 2, b[0] ** 2 + b[1] ** 2)]),
          expl: raw`$\Delta E \propto n_i^2 - n_f^2$: $(${a[0] ** 2} - ${a[1] ** 2})/(${b[0] ** 2} - ${b[1] ** 2}) = ${F.frac(num, den)}$. Unlike the oscillator, the square-well levels spread apart as $n$ grows.`,
        };
      },
    },
    {
      id: 'qm.isw.numeric', sec: '5.3.1', level: 2,
      gen(R) {
        const p = R.pick([
          { who: 'An electron', mc2: MEC2, L: [0.1, 0.2, 0.3, 0.5, 1, 2, 5], u: 'nm', toNm: 1, Eu: 'eV', Es: 1 },
          { who: 'A proton', mc2: MPC2, L: [2, 5, 10, 20], u: 'fm', toNm: 1e-6, Eu: 'MeV', Es: 1e6 },
          { who: 'A neutron', mc2: MPC2, L: [4, 8, 10], u: 'fm', toNm: 1e-6, Eu: 'MeV', Es: 1e6 },
        ]);
        const L = R.pick(p.L), Lnm = L * p.toNm;
        const E1 = HC * HC / (8 * p.mc2 * Lnm * Lnm);   // eV
        const v = R.pick(['E', 'E', 'lam']);
        if (v === 'E' || p.Es > 1) {
          const n = R.pick([1, 1, 2, 3]);
          const E = n * n * E1 / p.Es;
          return {
            q: raw`${p.who} is confined to a one-dimensional infinite square well of width $${L}\,\text{${p.u}}$. What is the energy of its ${ORD[n - 1]} state? (Use $hc = 1240\,\text{eV·nm} = 1240\,\text{MeV·fm}$.)`,
            ...GRE.numeric(R, E, [E / (4 * Math.PI ** 2), 4 * E, n > 1 ? n * E1 / p.Es : 2 * E, E / 2], { unit: raw`\text{${p.Eu}}` }),
            expl: raw`$E_n = \dfrac{n^2h^2}{8mL^2} = \dfrac{n^2(hc)^2}{8mc^2L^2}$ with $mc^2 = ${F.sci(p.mc2 / p.Es, 3)}\,\text{${p.Eu}}$: $E_${n} \approx ${F.num(E, 2)}\,\text{${p.Eu}}$. Using $\hbar$ in place of $h$ gives an answer $4\pi^2$ too small.`,
          };
        }
        const [nf, ni] = R.pick([[1, 2], [1, 3], [2, 3], [1, 4]]);
        const dE = (ni * ni - nf * nf) * E1, lam = HC / dE;
        return {
          q: raw`An electron in a one-dimensional infinite square well of width $${L}\,\text{nm}$ drops from the $n = ${ni}$ state to the $n = ${nf}$ state, emitting a photon. What is the photon's wavelength? (Use $hc = 1240\,\text{eV·nm}$ and $m_ec^2 = 0.511\,\text{MeV}$.)`,
          ...GRE.numeric(R, lam, [HC / (ni * ni * E1), HC / ((ni - nf) * E1), lam / 4, lam * 4 * Math.PI ** 2], { unit: raw`\text{nm}` }),
          expl: raw`$E_1 = (hc)^2/8mc^2L^2 \approx ${F.num(E1, 2)}\,\text{eV}$, $\Delta E = (${ni * ni} - ${nf * nf})E_1 \approx ${F.num(dE, 2)}\,\text{eV}$, and $\lambda = hc/\Delta E \approx ${F.num(lam, 2)}\,\text{nm}$.`,
        };
      },
    },
    {
      id: 'qm.isw.probregion', sec: '5.3.1', level: 3,
      gen(R) {
        const PTS = [0, 1, 2, 3, 4, 6, 8, 9, 10, 12]; // in units of L/12
        const sin12 = k => { const m = ((k % 12) + 12) % 12; return [[0, 0], [1, 0], [0, 1], [2, 0], [0, 1], [1, 0], [0, 0], [-1, 0], [0, -1], [-2, 0], [0, -1], [-1, 0]][m]; };
        // sin(m*pi/6) = (p + q*sqrt3)/2 with [p, q]; for multiples of pi/6: 0,1/2,√3/2,1,√3/2,1/2,0,...
        for (let t = 0; t < 60; t++) {
          const n = R.pick([1, 1, 2, 3]);
          const [a, b] = R.pickN(PTS, 2).sort((x, y) => x - y);
          if (b - a === 12) continue;
          // angle 2 n pi x / L with x = k L/12 -> n k pi / 6
          const sb = sin12(n * b), sa = sin12(n * a);
          const P2 = sb[0] - sa[0], Q2 = sb[1] - sa[1];   // Delta sin = (P2 + Q2 sqrt3)/2
          if (!P2 && !Q2) continue;
          const cls = Q(b - a, 12);
          // P = cls - (P2 + Q2 sqrt3)/(4 n pi)
          const val = (c, p2, q2, d) => c[0] / c[1] - (p2 + q2 * Math.sqrt(3)) / (d * Math.PI);
          const term = (p2, q2, d) => {
            let g = gcd(gcd(Math.abs(p2), Math.abs(q2)), d); p2 /= g; q2 /= g; d /= g;
            let sgn = '-';
            if ((q2 === 0 && p2 < 0) || (p2 === 0 && q2 < 0) || (p2 <= 0 && q2 <= 0)) { p2 = -p2; q2 = -q2; sgn = '+'; }
            let num;
            if (!q2) num = String(p2);
            else if (!p2) num = (Math.abs(q2) === 1 ? '' : Math.abs(q2)) + raw`\sqrt{3}`;
            else num = `${p2} ${q2 < 0 ? '-' : '+'} ${Math.abs(q2) === 1 ? '' : Math.abs(q2)}\\sqrt{3}`;
            if (q2 < 0 && !p2) { sgn = sgn === '-' ? '+' : '-'; }
            return `${sgn} \\frac{${num}}{${d === 1 ? '' : d}\\pi}`;
          };
          const tex = (c, p2, q2, d) => F.frac(c[0], c[1]) + ' ' + term(p2, q2, d);
          const cor = [tex(cls, P2, Q2, 4 * n), val(cls, P2, Q2, 4 * n)];
          if (!(cor[1] > 0 && cor[1] < 1)) continue;
          const W = [[F.frac(cls[0], cls[1]), cls[0] / cls[1]], [tex(cls, -P2, -Q2, 4 * n), val(cls, -P2, -Q2, 4 * n)], [tex(cls, P2, Q2, 2 * n), val(cls, P2, Q2, 2 * n)]];
          if (n > 1) W.push([tex(cls, P2 * n, Q2 * n, 4 * n), val(cls, P2 * n, Q2 * n, 4 * n)]);
          W.push([tex(cls, P2, Q2, 8 * n), val(cls, P2, Q2, 8 * n)]);
          const ok = W.filter(w => w[1] > 0 && w[1] < 1);
          if (ok.length < 4 || ok.some(w => Math.abs(w[1] - cor[1]) < 0.01)) continue;
          const pos = k => (k === 0 ? '0' : k === 12 ? 'L' : (() => { const [p, q] = Q(k, 12); return (p === 1 ? '' : p) + 'L/' + q; })());
          // check numerically
          let s = 0; const M = 4000; for (let i = 0; i < M; i++) { const x = (a + (b - a) * (i + 0.5) / M) / 12; s += 2 * Math.sin(n * Math.PI * x) ** 2 * (b - a) / 12 / M; }
          if (Math.abs(s - cor[1]) > 1e-4) throw new Error('isw prob mismatch');
          return {
            q: raw`A particle is in the ${n === 1 ? 'ground' : ORD[n - 1]} state $\psi_${n}(x) = \sqrt{2/L}\,\sin(${n === 1 ? '' : n}\pi x/L)$ of an infinite square well with walls at $x = 0$ and $x = L$. What is the probability that the particle is found between $x = ${pos(a)}$ and $x = ${pos(b)}$?`,
            ...mcV(R, cor, ok),
            expl: raw`$P = \frac{2}{L}\int_a^b \sin^2\frac{${n === 1 ? '' : n}\pi x}{L}dx = \left[\frac{x}{L} - \frac{\sin(${2 * n}\pi x/L)}{${2 * n}\pi}\right]_a^b = ${cor[0]} \approx ${F.num(cor[1], 2)}$. The first term is the classical (uniform) answer $${F.frac(cls[0], cls[1])}$; the oscillating correction shrinks as $1/n$.`,
          };
        }
        throw new Error('isw prob: no draw');
      },
    },
    {
      id: 'qm.isw.expect', sec: '5.3.1', level: 2,
      gen(R) {
        const n = R.int(1, 4);
        const sym = R.bool(0.3);
        const nn = n * n;
        const N = n === 1 ? '' : n, NN = n === 1 ? '' : nn;
        const h2 = n % 2 ? raw`\frac{${N}\pi\hbar}{2L}` : raw`\frac{${n === 2 ? '' : n / 2}\pi\hbar}{L}`;
        const Q = R.pick(sym ? ['x', 'p', 'p2'] : ['x', 'p', 'p2', 'x2', 'dp']);
        const C = {
          x: [sym ? '0' : raw`\frac{L}{2}`, [sym ? raw`\frac{L}{2}` : '0', raw`\frac{L}{${2 * n}}`, raw`\frac{L}{4}`, raw`\frac{L}{\sqrt{3}}`, 'L'], raw`$|\psi_n|^2$ is symmetric about the center of the well, so $\langle x\rangle$ is the midpoint for every $n$.`],
          p: ['0', [raw`\frac{${N}\pi\hbar}{L}`, raw`\frac{${N}\hbar}{L}`, h2, raw`-\frac{${N}\pi\hbar}{L}`], raw`$\psi_n$ is real (a standing wave, equal mix of $\pm n\pi\hbar/L$), so $\langle p\rangle = 0$.`],
          p2: [raw`\frac{${NN}\pi^2\hbar^2}{L^2}`, [raw`\frac{${NN}\pi^2\hbar^2}{2L^2}`, raw`\frac{${NN}\pi^2\hbar^2}{2mL^2}`, raw`\frac{${N}\pi\hbar}{L}`, raw`\frac{${NN}\hbar^2}{L^2}`, '0'], raw`$\langle p^2\rangle = 2m\langle H\rangle = 2mE_n = n^2\pi^2\hbar^2/L^2$ since $V = 0$ inside.`],
          x2: [raw`L^2\left(\frac{1}{3} - \frac{1}{${2 * nn}\pi^2}\right)`, [raw`\frac{L^2}{3}`, raw`\frac{L^2}{4}`, raw`L^2\left(\frac{1}{3} + \frac{1}{${2 * nn}\pi^2}\right)`, raw`L^2\left(\frac{1}{4} - \frac{1}{${2 * nn}\pi^2}\right)`], raw`$\frac{2}{L}\int_0^L x^2\sin^2(n\pi x/L)dx = L^2\left(\frac{1}{3} - \frac{1}{2n^2\pi^2}\right)$; it approaches the uniform value $L^2/3$ for large $n$.`],
          dp: [raw`\frac{${N}\pi\hbar}{L}`, [h2, '0', raw`\frac{${NN}\pi^2\hbar^2}{L^2}`, raw`\frac{${N}\hbar}{L}`, raw`\frac{${N}\pi\hbar}{\sqrt{2}L}`], raw`$\langle p\rangle = 0$ and $\langle p^2\rangle = n^2\pi^2\hbar^2/L^2$, so $\Delta p = n\pi\hbar/L$.`],
        }[Q];
        const what = { x: raw`\langle x\rangle`, p: raw`\langle p\rangle`, p2: raw`\langle p^2\rangle`, x2: raw`\langle x^2\rangle`, dp: raw`\Delta p = \sqrt{\langle p^2\rangle - \langle p\rangle^2}` }[Q];
        return {
          q: raw`A particle of mass $m$ is in the ${ORD[n - 1]} state $\psi_${n}$ of an infinite square well with walls at ${sym ? raw`$x = -L/2$ and $x = L/2$` : raw`$x = 0$ and $x = L$`}. What is $${what}$?`,
          ...mcS(R, C[0], C[1].map(s => s.replace(/\\frac\{1\}\{2\\pi\^2\}/g, raw`\frac{1}{2\pi^2}`))),
          level: Q === 'x2' ? 3 : 2,
          expl: C[2],
        };
      },
    },
    {
      id: 'qm.isw.superpos', sec: '5.3.1', level: 2,
      gen(R) {
        const k = R.pick([2, 2, 3]);
        const ns = R.pickN([1, 2, 3, 4], k).sort((a, b) => a - b);
        const c = []; for (let i = 0; i < k; i++) c.push(R.pick(COEF.slice(0, 12)));
        const a2 = c.map(cAbs2), N = a2.reduce((s, v) => s + v, 0);
        const intro = raw`A particle in an infinite square well, with stationary states $\psi_n$ and energies $E_n = n^2E_1$, is in the state $\Psi = A\left[${combo(c, ns.map(n => raw`\psi_${n}`), true)}\right]$ ($A$ a normalization constant).`;
        const fr = (x, y) => [F.frac(x, y) + (y && x ? 'E_1' : ''), x / y];
        const v = R.pick(['E', 'E', 'P', 'vals']);
        if (v === 'E') {
          const S = ns.reduce((s, n, i) => s + n * n * a2[i], 0);
          const W = [fr(ns.reduce((s, n, i) => s + n * a2[i], 0), N), fr(S, 1), fr(ns.reduce((s, n) => s + n * n, 0), k), fr(ns[k - 1] ** 2, 1), fr(S, N * N), fr((ns.reduce((s, n, i) => s + n * a2[i], 0)) ** 2, N * N)].map(w => [w[0].replace(/^1E_1/, 'E_1'), w[1]]);
          return { q: intro + raw` What is the expectation value of the energy?`, ...mcV(R, [fr(S, N)[0].replace(/^1E_1/, 'E_1'), S / N], W),
            expl: raw`$\langle H\rangle = \sum|c_n|^2E_n/\sum|c_n|^2 = (${ns.map((n, i) => `${a2[i]}\\cdot ${n * n}`).join(' + ')})E_1/${N} = ${F.frac(S, N)}E_1$. Remember $E_n \propto n^2$.`.replace(/= 1E_1\$\.$/, '= E_1$.') };
        }
        if (v === 'P') {
          const absent = R.bool(0.25);
          const m = absent ? R.pick([1, 2, 3, 4, 5].filter(x => ns.indexOf(x) < 0)) : R.pick(ns);
          const i = ns.indexOf(m);
          const cor = absent ? ['0', 0] : [F.frac(a2[i], N), a2[i] / N];
          const W = [[F.frac(1, k), 1 / k], [F.frac(1, N), 1 / N], ['1', 1]].concat(a2.map((x, j) => [F.frac(x, N), x / N]));
          if (!absent) W.push([ex(Math.sqrt(a2[i] / N)), Math.sqrt(a2[i] / N)], ['0', 0]);
          return { q: intro + raw` If the energy is measured, what is the probability of obtaining $${m * m === 1 ? '' : m * m}E_1$?`, ...mcV(R, cor, W),
            expl: absent ? raw`$${m * m === 1 ? '' : m * m}E_1 = E_${m}$, but $\psi_${m}$ does not appear in the expansion, so the probability is zero.` : raw`$${m * m === 1 ? '' : m * m}E_1 = E_${m}$, whose probability is $|c_${m}|^2/\sum|c_n|^2 = ${cor[0]}$.` };
        }
        const E = n => (n === 1 ? 'E_1' : `${n * n}E_1`);
        const fmtL = a0 => { const a = [...new Set(a0)].sort((x, y) => x - y).map(n => `$${E(n)}$`); return (a.length === 1 ? a[0] : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1]) + ' only'; };
        const cand = [ns.map(n => n + 1), ns.slice(0, k - 1), [...ns, ns[k - 1] + 1], ns.map(n => n * n), [1, ...ns.map(n => n + 1)]];
        const W = cand.map(fmtL).filter(x => x !== fmtL(ns)).concat([raw`any value between $${E(ns[0])}$ and $${E(ns[k - 1])}$`, raw`only the average energy $\langle H\rangle$`]);
        return { q: intro + ' Which of the following lists all the possible results of a measurement of the energy?', ...GRE.mc(R, fmtL(ns), W), level: 1,
          expl: raw`A measurement returns an eigenvalue whose eigenstate appears in the expansion: $${ns.map(E).join('$, $')}$. Each occurs with probability $|c_n|^2/\sum|c_n|^2$; the average $\langle H\rangle$ itself is generally not a possible outcome.` };
      },
    },
    {
      id: 'qm.isw.expand', sec: '5.3.1', level: 3,
      gen(R) {
        const m = R.pick([1, 1, 2]);
        const v = R.pick(['P', 'P', 'P', 'H']);
        const intro = raw`A particle is in the ${ORD[m - 1]} state of an infinite square well with walls at $x = 0$ and $x = L$. The wall at $x = L$ is suddenly moved to $x = 2L$, so quickly that the wavefunction has no time to change.`;
        if (v === 'H') {
          const unitNew = R.bool();
          const cor = unitNew ? 4 * m * m : m * m;
          const u = unitNew ? raw`E_1'` : 'E_1';
          const W = (unitNew ? [m * m, 2 * m * m, 8 * m * m, 4 * m * m + 1, 16 * m * m] : [m * m / 4, m * m / 2, 4 * m * m, 2 * m * m, 1 / 4]).filter(x => x !== cor).map(x => [ex(x) + u, x]);
          return { q: intro + raw` Let $E_1$ be the ground-state energy of the original well and $E_1'$ that of the expanded well. What is the expectation value of the energy immediately after the expansion, expressed in terms of $${u}$?`,
            ...mcV(R, [cor === 1 ? u : ex(cor) + u, cor], W.map(w => [w[0].replace(/^1E/, 'E'), w[1]])),
            expl: raw`Immediately afterward the wavefunction (and hence $\langle H\rangle = \int\psi^*(-\frac{\hbar^2}{2m}\psi'')dx$ over the region where $V = 0$) is unchanged: $\langle H\rangle = ${m * m === 1 ? '' : m * m}E_1$. Since $E_1' = E_1/4$, this equals $${4 * m * m}E_1'$. The energy is no longer definite, but its average is unchanged.` };
        }
        const n = R.pick([1, 1, 2, 3, 4].concat(m === 2 ? [4, 4, 1, 3] : []));
        let pn, pd, P;
        if (n === 2 * m) { pn = 1; pd = 2; P = 0.5; }
        else if (n % 2 === 0) { pn = 0; pd = 1; P = 0; }
        else {
          const s = k => ((((k - 1) / 2) % 2) + 2) % 2 === 0 ? 1 : -1; // sin(k pi/2), k odd (k may be negative)
          const A = 2 * m - n, B = 2 * m + n;
          const Ipi = Q(s(A) * B - s(B) * A, A * B);  // I*pi
          const p2 = Q(2 * Ipi[0] * Ipi[0], Ipi[1] * Ipi[1]);
          pn = p2[0]; pd = p2[1]; P = pn / pd / (Math.PI ** 2);
          // numeric check
          let I = 0; const M = 4000; for (let i = 0; i < M; i++) { const u = (i + 0.5) / M; I += Math.sin(m * Math.PI * u) * Math.sin(n * Math.PI * u / 2) / M; }
          if (Math.abs(2 * I * I - P) > 1e-5) throw new Error('expand mismatch');
        }
        const isPi = n % 2 === 1;
        const T = (a, b, pi) => (a === 0 ? '0' : pi ? raw`\frac{${a}}{${b}\pi^2}` : F.frac(a, b));
        const cor = [T(pn, pd, isPi), P];
        const W = [['0', 0], [F.frac(1, 2), 0.5], [F.frac(1, 4), 0.25], ['1', 1]];
        if (isPi) {
          const g = Q(pn, 2 * pd); W.push([T(g[0], g[1], true), P / 2]);
          const amp = Math.sqrt(P); const r = F.toRational(Math.sqrt(pn / pd / 2), 500);
          if (r) W.push([raw`\frac{${r[0] === 1 ? '' : r[0]}\sqrt{2}}{${r[1]}\pi}`, amp]);
          W.push([raw`\frac{${pn}}{${pd}\pi}`, pn / pd / Math.PI]);
        } else W.push([raw`\frac{32}{9\pi^2}`, 32 / 9 / Math.PI ** 2], [raw`\frac{8}{3\pi}`, 8 / 3 / Math.PI]);
        const newName = n === 1 ? 'ground state' : `${ORD[n - 1]} state`;
        return {
          q: intro + raw` What is the probability that the particle is then found in the ${newName} of the new, wider well?`,
          ...mcV(R, cor, W.filter(w => w[1] <= 1)),
          expl: raw`Project the old state $\sqrt{2/L}\sin(${m === 1 ? '' : m}\pi x/L)$ (on $0 < x < L$) onto the new eigenfunction $\sqrt{1/L}\sin(${n === 1 ? '' : n}\pi x/2L)$. ` +
            (n === 2 * m ? raw`The new state $n = ${n}$ has exactly the same shape as the old state on $0 < x < L$, so $c = \sqrt{2}\cdot\tfrac{1}{2} = 1/\sqrt{2}$ and $P = 1/2$.`
              : n % 2 === 0 ? raw`The new state $n = ${n}$ is $\sin(${n / 2}\pi x/L)$ on $0 < x < L$, orthogonal to the old state there, so $P = 0$.`
                : raw`The overlap integral gives $|c|^2 = ${cor[0]} \approx ${F.num(P, 2)}$.`),
        };
      },
    },
    {
      id: 'qm.isw.3d', sec: '5.3.1', level: 2,
      gen(R) {
        const d3 = R.bool(0.65);
        const lv = {};
        for (let a = 1; a < 9; a++) for (let b = 1; b < 9; b++) { if (d3) { for (let c = 1; c < 9; c++) { const s = a * a + b * b + c * c; lv[s] = (lv[s] || 0) + 1; } } else { const s = a * a + b * b; lv[s] = (lv[s] || 0) + 1; } }
        const Es = Object.keys(lv).map(Number).sort((x, y) => x - y).slice(0, 7);
        const i = R.int(d3 ? 0 : 0, 5);
        const ctx = d3 ? raw`A particle is confined in a cubical box of side $L$ with impenetrable walls. Let $E_0 = \pi^2\hbar^2/2mL^2$, so the energies are $(n_x^2 + n_y^2 + n_z^2)E_0$.` : raw`A particle is confined in a two-dimensional square box of side $L$ with impenetrable walls. Let $E_0 = \pi^2\hbar^2/2mL^2$, so the energies are $(n_x^2 + n_y^2)E_0$.`;
        const E = s => `${s}E_0`;
        if (R.bool()) {
          const g = lv[Es[i]];
          return { q: ctx + raw` What is the degeneracy of the level with energy $${E(Es[i])}$?`, ...mcV(R, [String(g), g], [1, 2, 3, 4, 6, 8].map(x => [String(x), x])),
            expl: raw`Count the ordered sets of positive integers with $\sum n_i^2 = ${Es[i]}$: ${g} of them. ` + (d3 ? raw`(E.g. $(1,1,2)$ and its permutations give degeneracy 3; three different integers give 6.)` : raw`(E.g. $(1,2)$ and $(2,1)$ give degeneracy 2; equal integers give 1.)`) };
        }
        const j = R.int(1, 4);
        const W = Es.filter((_, k) => k !== j).map(s => [E(s), s]).concat([[E(Es[0] + 3 * j), Es[0] + 3 * j], [E((j + 1) ** 2 * (d3 ? 3 : 2)), (j + 1) ** 2 * (d3 ? 3 : 2)]]);
        return { q: ctx + raw` What is the energy of the ${ORD[j]} level (counting distinct energies)?`, ...mcV(R, [E(Es[j]), Es[j]], W),
          expl: raw`List $\sum n_i^2$ in increasing order with all $n_i \ge 1$: $${Es.slice(0, j + 2).join(', ')}, \ldots$ The ${ORD[j]} level is $${E(Es[j])}$.` };
      },
    },
    {
      id: 'qm.isw.facts', sec: '5.3.1', level: 1,
      gen(R) {
        const T = [
          ['The wavefunction vanishes at the walls.', raw`$\psi$ must be continuous and is zero outside.`],
          [raw`$d\psi/dx$ is discontinuous at the walls.`, raw`$\psi' \ne 0$ just inside but $\psi = 0$ outside; this is allowed because $V$ is infinite there.`],
          [raw`The energies are proportional to $n^2$.`, raw`$E_n = n^2\pi^2\hbar^2/2mL^2$.`],
          ['The ground-state energy is greater than zero.', raw`$n = 0$ would give $\psi \equiv 0$, so $E_1 > 0$.`],
          [raw`The state $\psi_n$ has $n - 1$ nodes inside the well.`, raw`$\sin(n\pi x/L)$ vanishes $n - 1$ times between the walls.`],
          ['The spacing between adjacent levels increases with $n$.', raw`$E_{n+1} - E_n \propto 2n + 1$.`],
          [raw`Every energy eigenstate has $\langle x\rangle$ at the center of the well.`, raw`$|\psi_n|^2$ is symmetric about the center.`],
          [raw`The energies decrease if the well is made wider.`, raw`$E_n \propto 1/L^2$.`],
        ];
        const Fs = [
          ['The wavefunction is discontinuous at the walls.', raw`$\psi$ is always continuous.`],
          [raw`$d\psi/dx$ is continuous at the walls.`, raw`$\psi'$ jumps to zero at an infinite wall.`],
          ['The ground-state energy is zero.', raw`$E_1 = \pi^2\hbar^2/2mL^2 > 0$.`],
          [raw`The energy levels are equally spaced.`, raw`they grow as $n^2$.`],
          [raw`The state $\psi_n$ has $n$ nodes inside the well.`, raw`it has $n - 1$.`],
          ['The energies increase if the well is made wider.', raw`$E \propto 1/L^2$ decreases.`],
          ['In the ground state the particle is most likely to be found near the walls.', 'the density peaks at the center.'],
          [raw`The energies are proportional to $n$.`, 'they go as $n^2$.'],
        ];
        return romanQ(R, 'Which of the following is (are) true for the energy eigenstates of a particle in a one-dimensional infinite square well?', T, Fs);
      },
    },

    // ================================================================ 5.3.2 Free particle
    {
      id: 'qm.free.debroglie', sec: '5.3.2', level: 2,
      gen(R) {
        const p = R.pick([
          { who: 'an electron', mc2: MEC2, K: [1, 4, 10, 25, 50, 100, 150, 400, 1000] },
          { who: 'a neutron', mc2: MPC2, K: [0.01, 0.025, 0.1, 1, 10, 100] },
          { who: 'a proton', mc2: MPC2, K: [1, 10, 100, 1000, 10000] },
        ]);
        const K = R.pick(p.K);
        const lam = HC / Math.sqrt(2 * p.mc2 * K);
        const v = R.pick(['lam', 'lam', 'K', 'ratio']);
        if (v === 'lam') {
          return {
            q: raw`What is the de Broglie wavelength of ${p.who} with kinetic energy $${F.num(K, 2)}\,\text{eV}$? (Use $hc = 1240\,\text{eV·nm}$, $m_ec^2 = 0.511\,\text{MeV}$, $m_pc^2 \approx m_nc^2 = 938\,\text{MeV}$.)`,
            ...GRE.numeric(R, lam, [lam * Math.SQRT2, lam / (2 * Math.PI), HC / K, lam * 2], { unit: raw`\text{nm}` }),
            expl: raw`Nonrelativistic: $p = \sqrt{2mK}$, so $\lambda = \dfrac{hc}{\sqrt{2mc^2K}} = \dfrac{1240}{\sqrt{2(${F.sci(p.mc2, 3)})(${F.num(K, 2)})}}\,\text{nm} \approx ${F.num(lam, 2)}\,\text{nm}$. The photon formula $hc/E$ does not apply to massive particles.`,
          };
        }
        if (v === 'K') {
          const lamR = F.round(lam, 2);
          const KK = HC * HC / (2 * p.mc2 * lamR * lamR);
          return {
            q: raw`What kinetic energy must ${p.who} have for its de Broglie wavelength to be $${F.num(lamR, 2)}\,\text{nm}$? (Use $hc = 1240\,\text{eV·nm}$, $m_ec^2 = 0.511\,\text{MeV}$, $m_nc^2 \approx m_pc^2 = 938\,\text{MeV}$.)`,
            ...GRE.numeric(R, KK, [2 * KK, HC / lamR, KK / 2, KK * 4 * Math.PI ** 2], { unit: raw`\text{eV}` }),
            expl: raw`$K = \dfrac{p^2}{2m} = \dfrac{(hc/\lambda)^2}{2mc^2} \approx ${F.num(KK, 2)}\,\text{eV}$.`,
          };
        }
        const f = R.pick([4, 9, 16, 1 / 4, 2, 100]);
        const r = 1 / Math.sqrt(f);
        return {
          q: raw`The kinetic energy of a nonrelativistic ${p.who.replace(/^an? /, '')} is multiplied by $${ex(f)}$. By what factor does its de Broglie wavelength change?`,
          ...mcV(R, [ex(r), r], [1 / f, f, Math.sqrt(f), r * r * r, 1].filter(x => Math.abs(x - r) > 1e-9).map(x => [ex(x), x])),
          level: 1,
          expl: raw`$\lambda = h/\sqrt{2mK} \propto K^{-1/2}$, so the factor is $1/\sqrt{${ex(f)}} = ${ex(r)}$.`,
        };
      },
    },
    {
      id: 'qm.free.dispersion', sec: '5.3.2', level: 2,
      gen(R) {
        const v = R.pick(['phase', 'group', 'omega', 'num', 'num']);
        if (v === 'num') {
          const k = R.pick([1, 2, 3, 5, 10]); // nm^-1
          const E = (HBARC * k) ** 2 / (2 * MEC2);
          return {
            q: raw`A free electron has the wavefunction $\psi(x,t) = Ae^{i(kx - \omega t)}$ with $k = ${k}\,\text{nm}^{-1}$. What is its kinetic energy? (Use $\hbar c = 197\,\text{eV·nm}$, $m_ec^2 = 0.511\,\text{MeV}$.)`,
            ...GRE.numeric(R, E, [2 * E, E * 4 * Math.PI ** 2, HBARC * k, E / (4 * Math.PI ** 2)], { unit: raw`\text{eV}` }),
            expl: raw`$p = \hbar k$, so $E = \dfrac{(\hbar ck)^2}{2mc^2} = \dfrac{(${F.num(HBARC * k, 3)}\,\text{eV})^2}{2(5.11\times 10^5\,\text{eV})} \approx ${F.num(E, 2)}\,\text{eV}$.`,
          };
        }
        if (v === 'omega') return {
          q: raw`What is the dispersion relation $\omega(k)$ for the free-particle wavefunction $e^{i(kx - \omega t)}$ of a particle of mass $m$?`,
          ...mcS(R, raw`\omega = \frac{\hbar k^2}{2m}`, [raw`\omega = ck`, raw`\omega = \frac{\hbar^2k^2}{2m}`, raw`\omega = \frac{\hbar k}{2m}`, raw`\omega = \frac{k^2}{2m\hbar}`, raw`\omega = \frac{\hbar k^2}{m}`]),
          level: 1,
          expl: raw`$E = \hbar\omega = p^2/2m = \hbar^2k^2/2m$, so $\omega = \hbar k^2/2m$ — quadratic in $k$, unlike light ($\omega = ck$). The wave is dispersive.`,
        };
        const ph = v === 'phase';
        return {
          q: raw`A free nonrelativistic particle of mass $m$ has a wavefunction made of plane waves $e^{i(kx - \omega t)}$ near wavenumber $k$, and classical speed $v = \hbar k/m$. What is the ${ph ? raw`phase velocity $\omega/k$` : raw`group velocity $d\omega/dk$`}?`,
          ...mcS(R, ph ? raw`v/2` : 'v', ph ? ['v', '2v', raw`c^2/v`, raw`\sqrt{2}\,v`, raw`v/4`] : [raw`v/2`, '2v', raw`c^2/v`, raw`\sqrt{2}\,v`, '0']),
          expl: raw`With $\omega = \hbar k^2/2m$: $\omega/k = \hbar k/2m = v/2$ and $d\omega/dk = \hbar k/m = v$. The wave packet (and the particle) moves at the group velocity.`,
        };
      },
    },
    {
      id: 'qm.free.definite', sec: '5.3.2', level: 2,
      gen(R) {
        // [function, definite p, definite E, uniform density, normalizable]
        const FN = [
          ['e^{ikx}', 1, 1, 1, 0], ['e^{-ikx}', 1, 1, 1, 0], [raw`\sin(kx)`, 0, 1, 0, 0], [raw`\cos(kx)`, 0, 1, 0, 0],
          [raw`2\cos(kx) + i\sin(kx)`, 0, 1, 0, 0], [raw`e^{ikx} + e^{2ikx}`, 0, 0, 0, 0], [raw`e^{-x^2/a^2}`, 0, 0, 0, 1], [raw`\cos(kx) + i\sin(kx)`, 1, 1, 1, 0],
        ];
        const ST = [
          ['It has a definite value of momentum.', 1, 'only a single plane wave $e^{\\pm ikx}$ is a momentum eigenstate'],
          ['It has a definite value of energy.', 2, raw`any combination of $e^{ikx}$ and $e^{-ikx}$ with the same $|k|$ has $E = \hbar^2k^2/2m$`],
          [raw`Its probability density $|\psi|^2$ is the same at all $x$.`, 3, 'only a single plane wave has constant modulus'],
          ['It can be normalized.', 4, 'plane waves have constant or periodic modulus and cannot be normalized; a Gaussian can'],
        ];
        for (let t = 0; t < 50; t++) {
          const f = R.pick(FN);
          const st = R.pickN(ST, 3);
          const tr = st.map(s => !!f[s[1]]);
          if (!tr.some(Boolean)) continue;
          return {
            q: GRE.romanStem(raw`A free particle ($V = 0$) has the wavefunction $\psi(x) = ${f[0]}$, where ${f[0].indexOf('a') >= 0 ? '$a$ is a real positive constant' : '$k$ is a real positive constant'}. Which of the following is (are) true?`, st.map(s => s[0])),
            ...GRE.roman(R, tr),
            expl: st.map((s, i) => `${ROMAN[i]} is ${tr[i] ? 'true' : 'false'}: ${s[2]}.`).join(' ') + raw` (For a free particle $H = p^2/2m$, so states with a definite $|p|$ have definite energy.)`,
          };
        }
        throw new Error('free definite');
      },
    },

    // ================================================================ 5.3.3 Delta function
    {
      id: 'qm.delta.bound', sec: '5.3.3', level: 2,
      gen(R) {
        const al = R.pick([raw`\alpha`, 'A', raw`\lambda`]);
        const pot = raw`V(x) = -${al}\,\delta(x)`;
        const ctx = raw`A particle of mass $m$ moves in the attractive delta-function potential $${pot}$, with $${al} > 0$.`;
        const v = R.pick(['E', 'scale', 'prob', 'units', 'len']);
        if (v === 'E') return { q: ctx + ' What is the energy of its bound state?', ...mcS(R, raw`-\frac{m${al}^2}{2\hbar^2}`, [raw`-\frac{m${al}^2}{\hbar^2}`, raw`-\frac{m${al}}{2\hbar^2}`, raw`\frac{m${al}^2}{2\hbar^2}`, raw`-\frac{m${al}^2}{2\hbar}`, raw`-\frac{\hbar^2}{2m${al}^2}`]),
          expl: raw`$${al}$ has units of energy × length, so the only energy is $m${al}^2/\hbar^2$; the exact result is $E = -m${al}^2/2\hbar^2$ with $\psi \propto e^{-m${al}|x|/\hbar^2}$. Bound states have $E < 0$.` };
        if (v === 'units') return { q: raw`For the potential $${pot}$, what are the SI units of $${al}$?`, ...mcS(R, raw`\text{J·m}`, [raw`\text{J}`, raw`\text{J/m}`, raw`\text{J·m}^2`, raw`\text{J·s}`]), level: 1,
          expl: raw`$\delta(x)$ has units of 1/length (it integrates to 1 over $x$), so $${al}$ must be energy × length: J·m.` };
        if (v === 'len') return { q: ctx + raw` The bound-state wavefunction falls off as $e^{-|x|/d}$. What is $d$?`, ...mcS(R, raw`\frac{\hbar^2}{m${al}}`, [raw`\frac{\hbar}{m${al}}`, raw`\frac{\hbar^2}{2m${al}}`, raw`\frac{m${al}}{\hbar^2}`, raw`\frac{\hbar^2}{m${al}^2}`, raw`\frac{2\hbar^2}{m${al}}`]),
          expl: raw`$\kappa = \sqrt{2m|E|}/\hbar = m${al}/\hbar^2$, so $d = 1/\kappa = \hbar^2/m${al}$ — the only length built from $\hbar$, $m$, $${al}$.` };
        if (v === 'scale') {
          const f = R.pick([2, 3, 1 / 2]), g = R.pick([1, 2, 4, 1 / 2]);
          const isE = R.bool();
          const cor = isE ? f * f * g : 1 / (f * g);
          const W = [f * g, f * f / g, f / g, 1 / (f * f * g), Math.sqrt(f * f * g), f * f * g, 1 / (f * g), g / f].filter(x => Math.abs(x / cor - 1) > 1e-9).map(x => [ex(x), x]);
          const ch = [`the strength $${al}$ is multiplied by $${ex(f)}$`].concat(g !== 1 ? [`the mass is multiplied by $${ex(g)}$`] : []);
          return { q: raw`A particle of mass $m$ is bound by the potential $${pot}$. If ${ch.join(' and ')}, by what factor does the ${isE ? 'binding energy' : 'spatial extent of the bound-state wavefunction'} change?`,
            ...mcV(R, [ex(cor), cor], W),
            expl: raw`$|E| = m${al}^2/2\hbar^2 \propto m${al}^2$ and the decay length $\hbar^2/m${al} \propto 1/(m${al})$; the factor is $${ex(cor)}$.` };
        }
        const j = R.int(1, 4);
        const d = j === 2 ? raw`\frac{\hbar^2}{m${al}}` : raw`\frac{${j === 1 ? '' : j}\hbar^2}{2m${al}}`;
        const e = x => (x === 1 ? 'e^{-1}' : Number.isInteger(x) ? `e^{-${x}}` : `e^{-${F.fracI(2 * x, 2)}}`);
        const out = R.bool(0.4);
        const cor = out ? [e(j), Math.exp(-j)] : ['1 - ' + e(j), 1 - Math.exp(-j)];
        const W = [[e(j), Math.exp(-j)], ['1 - ' + e(j), 1 - Math.exp(-j)], ['1 - ' + e(j / 2), 1 - Math.exp(-j / 2)], [e(j / 2), Math.exp(-j / 2)], ['1 - ' + e(2 * j), 1 - Math.exp(-2 * j)], [e(2 * j), Math.exp(-2 * j)]];
        return { q: ctx + raw` Its bound-state wavefunction is $\psi(x) = \sqrt{\kappa}\,e^{-\kappa|x|}$ with $\kappa = m${al}/\hbar^2$. What is the probability of finding the particle ${out ? 'farther than' : 'within'} a distance $${d}$ ${out ? 'from' : 'of'} the origin?`,
          ...mcV(R, cor, W), level: 3,
          expl: raw`$P(|x| < d) = 2\int_0^d\kappa e^{-2\kappa x}dx = 1 - e^{-2\kappa d}$, and here $2\kappa d = ${j}$. So the probability ${out ? 'outside' : 'inside'} is $${cor[0]}$.` };
      },
    },
    {
      id: 'qm.delta.facts', sec: '5.3.3', level: 2,
      gen(R) {
        const T = [
          ['It has exactly one bound state.', 'a single delta well binds one (even) state, whatever its strength.'],
          [raw`The bound-state wavefunction is continuous at $x = 0$.`, raw`$\psi$ is always continuous.`],
          [raw`$d\psi/dx$ is discontinuous at $x = 0$.`, raw`integrating the Schrödinger equation across 0 gives $\Delta\psi' = -(2m\alpha/\hbar^2)\psi(0)$.`],
          ['The bound-state wavefunction is an even function of $x$.', raw`$\psi \propto e^{-\kappa|x|}$.`],
          [raw`The binding energy is proportional to $\alpha^2$.`, raw`$E = -m\alpha^2/2\hbar^2$.`],
          [raw`Its reflection and transmission probabilities for scattering states are the same as for the barrier $+\alpha\delta(x)$.`, raw`they depend only on $\alpha^2$.`],
          ['The bound-state wavefunction has no nodes.', 'it is the ground state.'],
        ];
        const Fs = [
          ['It has exactly two bound states.', 'it has only one.'],
          [raw`$d\psi/dx$ is continuous at $x = 0$.`, raw`the infinite spike produces a kink in $\psi$.`],
          ['The bound-state wavefunction is odd in $x$.', raw`odd functions vanish at $x = 0$ and do not feel the delta function at all.`],
          [raw`The binding energy is proportional to $\alpha$.`, raw`it goes as $\alpha^2$.`],
          [raw`The bound-state wavefunction vanishes at $x = 0$.`, raw`$\psi(0) = \sqrt{\kappa}$ is its maximum.`],
          ['Scattering states are transmitted with probability 1 at every energy.', raw`$T = 1/(1 + m\alpha^2/2\hbar^2E) < 1$.`],
          [raw`The potential $+\alpha\delta(x)$ also has one bound state.`, 'a repulsive delta function has no bound states.'],
        ];
        return romanQ(R, raw`Which of the following is (are) true for a particle in the potential $V(x) = -\alpha\,\delta(x)$, with $\alpha > 0$?`, T, Fs);
      },
    },

    // ================================================================ 5.3.4 Finite square well
    {
      id: 'qm.fsw.facts', sec: '5.3.4', level: 2,
      gen(R) {
        const T = [
          ['It has at least one bound state, however shallow it is.', 'in one dimension any attractive well binds at least one (even) state.'],
          [raw`Every bound state has an energy between $-V_0$ and $0$.`, raw`$E > V_{\min} = -V_0$, and $E < 0$ for a bound state.`],
          ['Outside the well the bound-state wavefunctions decay exponentially.', raw`there $E < V$ and $\psi \propto e^{-\kappa|x|}$.`],
          ['Inside the well the wavefunctions oscillate.', raw`there $E > V$, giving sines and cosines.`],
          ['The ground state is even and has no nodes.', 'the potential is symmetric and the ground state is nodeless.'],
          ['It has a finite number of bound states.', raw`only states with $-V_0 < E < 0$ are bound.`],
          ['There is a nonzero probability of finding a bound particle outside the well.', 'the wavefunction leaks into the classically forbidden region.'],
          ['Both $\\psi$ and $d\\psi/dx$ are continuous at the edges of the well.', 'the potential jump is finite.'],
          ['Each bound level lies lower (measured from the bottom of the well) than the corresponding level of an infinite well of the same width.', 'the wavefunction spreads out beyond the edges, lowering its kinetic energy.'],
        ];
        const Fs = [
          ['It has infinitely many bound states.', 'the number is finite.'],
          ['A sufficiently shallow well has no bound states.', 'in one dimension there is always at least one.'],
          ['The wavefunctions vanish at the edges of the well.', 'that is true only for infinite walls.'],
          [raw`$d\psi/dx$ is discontinuous at the edges of the well.`, 'that requires an infinite potential jump.'],
          ['The ground state is an odd function of $x$.', 'it is even.'],
          ['Bound states have positive energy.', raw`bound states have $-V_0 < E < 0$.`],
          ['A bound particle is never found outside the well.', 'it tunnels into the forbidden region.'],
          ['Its bound levels lie higher than those of an infinite well of the same width.', 'they lie lower.'],
        ];
        if (R.bool(0.6)) return romanQ(R, raw`A particle is bound in a one-dimensional finite square well, $V = -V_0$ for $|x| < a$ and $V = 0$ otherwise. Which of the following is (are) true?`, T, Fs);
        const odd = R.pick(Fs);
        const o = oddOneQ(R, raw`Which of the following is NOT true for a particle in the one-dimensional finite square well $V = -V_0$ for $|x| < a$, $V = 0$ otherwise?`, odd, T);
        o.expl = `The false statement: "${odd[0]}" — ${odd[1]}`;
        return o;
      },
    },
    {
      id: 'qm.fsw.numstates', sec: '5.3.4', level: 3,
      gen(R) {
        const ctx = raw`A finite square well of width $w$ has depth $V_0$. Let $\varepsilon = \pi^2\hbar^2/2mw^2$ be the ground-state energy of an infinite well of the same width.`;
        if (R.bool(0.6)) {
          const r = R.pick([0.5, 2, 3, 5, 6, 7, 8, 10, 12, 15, 18, 20, 24, 30, 35, 40, 50, 60, 70, 80, 90]);
          const N = Math.floor(Math.sqrt(r)) + 1;
          return { q: ctx + raw` If $V_0 = ${r}\varepsilon$, how many bound states does the well have?`, ...mcV(R, [String(N), N], [...new Set([N - 1, N + 1, N - 2, N + 2, N + 3, Math.round(r / 4), 1])].filter(x => x >= 0).map(x => [String(x), x])),
            expl: raw`With $z_0 = \frac{w}{2}\sqrt{2mV_0}/\hbar$, the number of bound states is $\lfloor 2z_0/\pi\rfloor + 1 = \lfloor\sqrt{V_0/\varepsilon}\rfloor + 1 = \lfloor\sqrt{${r}}\rfloor + 1 = ${N}$. Equivalently: count the infinite-well levels $n^2\varepsilon$ below $V_0$ and add one.` };
        }
        const N = R.int(2, 5);
        const E = x => (x === 1 ? raw`\varepsilon` : `${x}\\varepsilon`);
        return { q: ctx + raw` For what depth $V_0$ does a ${ORD[N - 1].replace(' excited', '')}${N === 1 ? '' : ''} bound state ${N === 2 ? '(the first excited state)' : `(the ${ORD[N - 1]} state)`} first appear as the well is deepened?`.replace(/does a [a-z]+ bound state/, 'does a new bound state'),
          ...mcV(R, [E((N - 1) ** 2), (N - 1) ** 2], [N * N, N - 1, (2 * N - 1), (N - 1) ** 2 + 1, (N - 2) ** 2 || 2, 2 * (N - 1) ** 2, (N + 1) ** 2, N * N + 1, 3 * (N - 1) ** 2].map(x => [E(x), x])),
          expl: raw`A new bound state appears each time $\sqrt{V_0/\varepsilon}$ passes an integer; the ${ORD[N - 1]} state (the ${N}th bound state) appears at $\sqrt{V_0/\varepsilon} = ${N - 1}$, i.e. $V_0 = ${E((N - 1) ** 2)}$.` };
      },
    },
    {
      id: 'qm.fsw.penetration', sec: '5.3.4', level: 2,
      gen(R) {
        const v = R.pick(['num', 'num', 'ratio', 'dens']);
        if (v === 'num') {
          const B = R.pick([0.5, 1, 2, 4, 5, 10, 25]);
          const d = HBARC / Math.sqrt(2 * MEC2 * B);
          return { q: raw`An electron is bound in a finite potential well with an energy $${F.num(B, 2)}\,\text{eV}$ below the top of the well. Outside the well its wavefunction decays as $e^{-x/\delta}$. What is $\delta$? (Use $\hbar c = 197\,\text{eV·nm}$ and $m_ec^2 = 0.511\,\text{MeV}$.)`,
            ...GRE.numeric(R, d, [d * 2 * Math.PI, d * Math.SQRT2, d / 2, d * d * 10].slice(0, 3), { unit: raw`\text{nm}` }),
            expl: raw`Outside, $\psi'' = \kappa^2\psi$ with $\kappa = \sqrt{2m(V - E)}/\hbar$, so $\delta = \dfrac{\hbar c}{\sqrt{2mc^2(V-E)}} = \dfrac{197}{\sqrt{2(5.11\times 10^5)(${F.num(B, 2)})}}\,\text{nm} \approx ${F.num(d, 2)}\,\text{nm}$.` };
        }
        if (v === 'ratio') {
          const isM = R.bool(0.4);
          const f = R.pick([4, 9, 16, 1 / 4, 2]);
          const r = 1 / Math.sqrt(f);
          return { q: raw`Outside a finite well, a bound particle's wavefunction decays over a penetration depth $\delta$. If the ${isM ? 'particle\'s mass is' : 'binding energy (the energy below the top of the well) is'} multiplied by $${ex(f)}$, by what factor does $\delta$ change?`,
            ...mcV(R, [ex(r), r], [1 / f, f, Math.sqrt(f), 1].filter(x => Math.abs(x - r) > 1e-9).map(x => [ex(x), x]).concat([[ex(f ** -0.25), f ** -0.25]].filter(x => x[0]))),
            expl: raw`$\delta = 1/\kappa = \hbar/\sqrt{2m(V - E)}$, so $\delta \propto ${isM ? 'm' : '(V-E)'}^{-1/2}$: factor $${ex(r)}$.` };
        }
        const j = R.int(1, 3);
        const e = x => `e^{-${x}}`;
        return { q: raw`Outside a finite well a bound-state wavefunction is $\psi = Ce^{-\kappa x}$ ($x$ measured from the edge). At what ratio is the probability density at $x = ${j === 1 ? '' : j}/\kappa$ compared with its value at the edge?`,
          ...mcV(R, [e(2 * j), Math.exp(-2 * j)], [[e(j), Math.exp(-j)], [e(j / 2 === 1 ? 1 : 4 * j), Math.exp(-(j / 2 === 1 ? 1 : 4 * j))], [`1 - ${e(2 * j)}`, 1 - Math.exp(-2 * j)], [e(j + 1), Math.exp(-j - 1)], ['e^{-1/2}', Math.exp(-0.5)]]),
          expl: raw`$|\psi|^2 \propto e^{-2\kappa x}$, so at $x = ${j === 1 ? '' : j}/\kappa$ it is $${e(2 * j)}$ of its edge value — the density decays twice as fast as the amplitude.` };
      },
    },

    // ================================================================ 5.3.5 Scattering
    {
      id: 'qm.scatter.step', sec: '5.3.5', level: 3,
      gen(R) {
        const below = R.bool(0.12);
        if (below) {
          const f = R.pick([[1, 2], [1, 3], [2, 3], [3, 4]]);
          return { q: raw`A particle of energy $E = ${F.frac(f[0], f[1])}V_0$ is incident from the left on the step $V = 0$ for $x < 0$, $V = V_0$ for $x > 0$. What is the probability that it is reflected?`,
            ...mcS(R, '1', ['0', F.frac(f[0], f[1]), F.frac(f[1] - f[0], f[1]), raw`\frac{1}{2}`, raw`\frac{1}{4}`, F.frac(f[0] * f[0], f[1] * f[1])]), level: 2,
            expl: raw`With $E < V_0$ the wavefunction decays exponentially for $x > 0$ and carries no current, so $R = 1$ — even though $|\psi|^2$ is nonzero inside the step.` };
        }
        const [p, q] = R.pick([[2, 1], [3, 1], [3, 2], [4, 1], [4, 3], [5, 3], [5, 4], [5, 2]]);
        const down = R.bool(0.3);
        const Ef = down ? Q(q * q, p * p - q * q) : Q(p * p, p * p - q * q);
        const Rr = Q((p - q) ** 2, (p + q) ** 2), Tt = Q(4 * p * q, (p + q) ** 2);
        const askR = R.bool();
        const fr = z => [F.frac(z[0], z[1]), z[0] / z[1]];
        const cor = askR ? fr(Rr) : fr(Tt);
        const W = [askR ? fr(Tt) : fr(Rr), fr(Q(p - q, p + q)), fr(Q(4 * p * p, (p + q) ** 2)).map((x, i) => i ? x : x), fr(Q(q, p)), fr(Q(4 * q * q, (p + q) ** 2)), fr(Q(2 * q, p + q)), fr(Q(1, 1)), fr(Q(0, 1))].filter(w => w[1] <= 1);
        const step = down ? raw`$V = 0$ for $x < 0$ and $V = -V_0$ for $x > 0$` : raw`$V = 0$ for $x < 0$ and $V = V_0$ for $x > 0$`;
        const ks = down ? [q, p] : [p, q];
        return {
          q: raw`A particle of energy $E = ${F.frac(Ef[0], Ef[1])}V_0$ is incident from the left on the potential step ${step}. What is the probability that it is ${askR ? 'reflected' : 'transmitted'}?`,
          ...mcV(R, cor, W),
          expl: raw`$k_L \propto \sqrt{E}$ and $k_R \propto \sqrt{E ${down ? '+' : '-'} V_0}$, so $k_L/k_R = ${ks[0]}/${ks[1]}$. Then $R = \left(\frac{k_L - k_R}{k_L + k_R}\right)^2 = ${F.frac(Rr[0], Rr[1])}$ and $T = \frac{4k_Lk_R}{(k_L + k_R)^2} = ${F.frac(Tt[0], Tt[1])}$ (they add to 1). ${down ? 'Quantum particles reflect even from a downward step. ' : ''}Note $T \ne |C/A|^2$: the flux carries an extra factor $k_R/k_L$.`,
        };
      },
    },
    {
      id: 'qm.scatter.tunnel', sec: '5.3.5', level: 2,
      gen(R) {
        const n0 = R.pick([2, 3, 4, 5, 6, 8, 10]);
        const ch = R.pick([
          { t: 'the barrier width is doubled', f: 2 }, { t: 'the barrier width is halved', f: 0.5 }, { t: 'the barrier width is tripled', f: 3 },
          { t: raw`$V_0 - E$ is multiplied by 4`, f: 2 }, { t: raw`$V_0 - E$ is divided by 4`, f: 0.5 }, { t: 'the particle is replaced by one with 4 times the mass (same energy)', f: 2 },
          { t: raw`$V_0 - E$ is multiplied by 9`, f: 3 }, { t: 'the particle is replaced by one with 9 times the mass (same energy)', f: 3 },
        ]);
        const ef = x => (Number.isInteger(x) ? (x === 1 ? 'e^{-1}' : `e^{-${x}}`) : `e^{-${F.fracI(Math.round(2 * x), 2)}}`);
        const cor = n0 * ch.f;
        if (!Number.isInteger(2 * cor)) throw new Error('tunnel');
        const W = [n0 / ch.f, n0 * ch.f * ch.f, n0 * ch.f + 1, n0 * ch.f * 2, n0 + 1].filter(x => Number.isInteger(2 * x) && x !== cor).map(x => [ef(x), Math.exp(-x)]);
        const lin = ch.f > 1 ? [raw`\frac{1}{${ch.f}}${ef(n0)}`, Math.exp(-n0) / ch.f] : [raw`2${ef(n0)}`, 2 * Math.exp(-n0)];
        return {
          q: raw`A particle with energy $E$ tunnels through a wide rectangular barrier of height $V_0 > E$ with transmission probability $T \approx ${ef(n0)}$. If ${ch.t}, the transmission probability becomes approximately`,
          ...mcV(R, [ef(cor), Math.exp(-cor)], W.concat([lin, [ef(n0), Math.exp(-n0)]])),
          expl: raw`For a thick barrier $T \approx e^{-2\kappa d}$ with $\kappa = \sqrt{2m(V_0 - E)}/\hbar$, so the exponent scales as $d\sqrt{m(V_0 - E)}$. Here it is multiplied by $${ex(ch.f)}$, so $T \to ${ef(cor)}$. Tunneling depends exponentially, not linearly, on the barrier parameters.`,
        };
      },
    },
    {
      id: 'qm.scatter.delta', sec: '5.3.5', level: 3,
      gen(R) {
        const r = R.pick([[1, 4], [1, 3], [1, 2], [2, 1], [3, 1], [4, 1], [3, 2], [2, 3]]);
        const sign = R.pick(['', '-']);
        const askT = R.bool();
        const fr = z => [F.frac(z[0], z[1]), z[0] / z[1]];
        const Tt = Q(r[0], r[0] + r[1]), Rr = Q(r[1], r[0] + r[1]);
        const cor = askT ? fr(Tt) : fr(Rr);
        const W = [askT ? fr(Rr) : fr(Tt), fr(Q(r[0], r[1])).map(x => x), fr(Q(r[0] * r[0], r[0] * r[0] + r[1] * r[1])), fr(Q(r[1] * r[1], r[0] * r[0] + r[1] * r[1])), fr(Q(1, 2)), fr(Q(0, 1)), fr(Q(1, 1))].filter(w => w[1] <= 1);
        const Et = r[0] === r[1] ? raw`\frac{m\alpha^2}{2\hbar^2}` : raw`${F.frac(r[0], r[1])}\cdot\frac{m\alpha^2}{2\hbar^2}`;
        return {
          q: raw`A particle of mass $m$ and energy $E = ${Et}$ is incident on the potential $V(x) = ${sign}\alpha\,\delta(x)$ ($\alpha > 0$). The transmission probability is $T = \left(1 + \dfrac{m\alpha^2}{2\hbar^2E}\right)^{-1}$. What is the ${askT ? 'transmission' : 'reflection'} probability?`,
          ...mcV(R, cor, W),
          expl: raw`With $\beta = m\alpha^2/2\hbar^2E = ${F.frac(r[1], r[0])}$, $T = 1/(1 + \beta) = ${F.frac(Tt[0], Tt[1])}$ and $R = 1 - T = ${F.frac(Rr[0], Rr[1])}$. The sign of $\alpha$ does not matter: a delta well and a delta barrier scatter identically.`,
        };
      },
    },
    {
      id: 'qm.scatter.facts', sec: '5.3.5', level: 2,
      gen(R) {
        const T = [
          [raw`$R + T = 1$`, 'probability is conserved.'],
          [raw`A particle with $E > V_0$ incident on a step of height $V_0$ can be reflected.`, raw`$R = [(k_1 - k_2)/(k_1 + k_2)]^2 > 0$.`],
          [raw`For $E < V_0$ on a step, the wavefunction is nonzero inside the step even though $R = 1$.`, 'an evanescent, exponentially decaying wave penetrates the step.'],
          [raw`A particle with $E < V_0$ can pass through a barrier of finite height and width.`, 'this is tunneling.'],
          ['For a thick barrier the tunneling probability falls off exponentially with the width.', raw`$T \sim e^{-2\kappa d}$.`],
          ['A heavier particle with the same energy tunnels less through the same barrier.', raw`$\kappa \propto \sqrt{m}$.`],
          ['A particle can be reflected when the potential drops suddenly (a downward step).', 'reflection depends on the change in $k$, not its sign.'],
          [raw`For a square barrier with $E > V_0$, the transmission probability equals 1 at certain energies.`, 'transmission resonances occur when an integer number of half-wavelengths fits in the barrier.'],
        ];
        const Fs = [
          [raw`$R = 0$ whenever $E > V_0$.`, 'quantum reflection still occurs.'],
          [raw`$T = 0$ whenever $E < V_0$ for a barrier of finite width.`, 'tunneling gives $T > 0$.'],
          [raw`The wavefunction vanishes inside a barrier whenever $E < V_0$.`, 'it decays exponentially but is nonzero.'],
          ['The tunneling probability does not depend on the particle\'s mass.', raw`$\kappa = \sqrt{2m(V_0-E)}/\hbar$.`],
          [raw`$R + T < 1$ because some probability is absorbed by the barrier.`, 'a real potential absorbs nothing; $R + T = 1$.'],
          ['For a thick barrier the tunneling probability decreases linearly with the barrier width.', 'it decreases exponentially.'],
          [raw`The transmission probability is always $|C|^2/|A|^2$, the ratio of squared amplitudes.`, raw`the flux factor $k_R/k_L$ must be included when the speeds differ.`],
        ];
        return romanQ(R, 'A particle moving in one dimension scatters from a localized potential (a step or a barrier). Which of the following is (are) true?', T, Fs);
      },
    },
    {
      id: 'qm.scatter.wavelength', sec: '5.3.5', level: 1,
      gen(R) {
        if (R.bool(0.4)) {
          const neg = R.bool(0.4);
          return {
            q: raw`A particle of mass $m$ and energy $E$ moves from a region where $V = 0$ into a region where $V = ${neg ? '-' : ''}V_0$ ${neg ? '' : raw`(with $0 < V_0 < E$)`}. What is its de Broglie wavelength in the second region?`,
            ...mcS(R, raw`\frac{h}{\sqrt{2m(E ${neg ? '+' : '-'} V_0)}}`, [raw`\frac{h}{\sqrt{2m(E ${neg ? '-' : '+'} V_0)}}`, raw`\frac{h}{\sqrt{2mE}}`, raw`\frac{\hbar}{\sqrt{2m(E ${neg ? '+' : '-'} V_0)}}`, raw`\frac{h}{\sqrt{m(E ${neg ? '+' : '-'} V_0)}}`, raw`h\sqrt{2m(E ${neg ? '+' : '-'} V_0)}`]),
            expl: raw`The kinetic energy in the region is $E ${neg ? '+' : '-'} V_0$, so $p = \sqrt{2m(E ${neg ? '+' : '-'} V_0)}$ and $\lambda = h/p$. ${neg ? 'Falling into a deeper region speeds the particle up and shortens its wavelength.' : 'Climbing the step slows the particle and lengthens its wavelength.'}`,
          };
        }
        const [p, q] = R.pick([[2, 1], [3, 1], [3, 2], [4, 1], [5, 3], [5, 4], [4, 3]]);
        const up = R.bool(0.6);
        const Ef = up ? Q(p * p, p * p - q * q) : Q(q * q, p * p - q * q);
        const r = up ? p / q : q / p;  // lambda2 / lambda1
        return {
          q: raw`A particle of energy $E = ${F.frac(Ef[0], Ef[1])}V_0$ travels from a region with $V = 0$ into a region with $V = ${up ? '' : '-'}V_0$. What is the ratio $\lambda_2/\lambda_1$ of its de Broglie wavelengths in the second and first regions?`,
          ...mcV(R, [ex(r), r], [1 / r, r * r, 1 / (r * r), 1, Math.sqrt(r)].filter(x => Math.abs(x - r) > 1e-9).map(x => [ex(x), x])),
          level: 2,
          expl: raw`$\lambda \propto 1/\sqrt{E - V}$, so $\lambda_2/\lambda_1 = \sqrt{E/(E ${up ? '-' : '+'} V_0)} = ${ex(r)}$.`,
        };
      },
    },

  ]);
})(typeof window !== 'undefined' ? window.GRE : this.GRE);
