/* Electromagnetism, part A — Sections 2.1 (Electrostatics) and 2.2 (Magnetostatics)
 * of Conquering the Physics GRE. Sections 2.3–2.7 live in em-2.js.
 * Templates follow the conventions in tools/AUTHORING.md.
 */
(function (GRE) {
  'use strict';
  const F = GRE.fmt;
  const raw = String.raw;
  const PI = Math.PI;
  const K = 9e9;              // 1/(4 pi eps0), the GRE value
  const EPS = 8.85e-12;
  const MU = 4 * PI * 1e-7;
  const QE = 1.6e-19;
  const MP = 1.67e-27, ME = 9.11e-31;
  const EPS_T = raw`\epsilon_0 = 8.85\times10^{-12}\,\text{C}^2/(\text{N}\cdot\text{m}^2)`;
  const K_T = raw`1/(4\pi\epsilon_0) = 9.0\times10^{9}\,\text{N}\cdot\text{m}^2/\text{C}^2`;
  const MU_T = raw`\mu_0 = 4\pi\times10^{-7}\,\text{T}\cdot\text{m/A}`;
  const hat = a => raw`\hat{\mathbf{${a}}}`;

  // ------------------------------------------------------------------ helpers
  function red(n, d) { if (d < 0) { n = -n; d = -d; } const g = F.gcd(n, d) || 1; return [n / g, d / g]; }
  /** (n/d)·top/bot as one fraction: tf(3, 8, 'q^2', '\\pi\\epsilon_0 a') -> \frac{3q^2}{8\pi\epsilon_0 a} */
  function tf(n, d, top, bot) {
    [n, d] = red(n, d);
    if (n === 0) return '0';
    const sg = n < 0 ? '-' : '';
    n = Math.abs(n);
    const num = (n === 1 && top ? '' : String(n)) + top;
    const den = (d === 1 ? '' : String(d)) + bot;
    return den === '' ? sg + num : sg + raw`\frac{${num}}{${den}}`;
  }
  /** rational number x as [n, d] (throws if not a small rational) */
  function rat(x, maxDen = 600) {
    const r = F.toRational(x, maxDen);
    if (!r) throw new Error('not rational: ' + x);
    return r;
  }
  /** tf() for a rational number x */
  const tfx = (x, top, bot) => { const [n, d] = rat(x); return tf(n, d, top, bot); };
  /** exact TeX coefficient in front of an expression: '' for 1, '-' for -1, '2\sqrt{2}\,' … */
  function cf(x) {
    const e = F.exact(x, 3000);
    if (e == null) throw new Error('cf: not exact ' + x);
    if (e === '1') return '';
    if (e === '-1') return '-';
    return e + '\\,';
  }
  /** exact TeX for a real number (rationals with large denominators, surds) or null */
  const fx = x => F.exact(x, 1000);
  /** "a + b sqrt(n)" with rational a, b, as TeX */
  function surd(a, b, n) {
    const A = Math.abs(a) < 1e-12 ? '' : fx(a);
    if (Math.abs(b) < 1e-12) return A || '0';
    const [p, q] = rat(Math.abs(b));
    const core = (p === 1 ? '' : p) + `\\sqrt{${n}}`;
    const B = q === 1 ? core : `\\frac{${core}}{${q}}`;
    if (!A) return (b < 0 ? '-' : '') + B;
    return A + (b < 0 ? ' - ' : ' + ') + B;
  }
  /** coefficient (a + b sqrt n) multiplying something: wraps sums in parentheses */
  function surdCoef(a, b, n) {
    if (Math.abs(b) < 1e-12) return Math.abs(a) < 1e-12 ? '0' : cf(a);
    if (Math.abs(a) < 1e-12) return cf(b * Math.sqrt(n));
    return raw`\left(${surd(a, b, n)}\right)`;
  }
  /** vector with numeric components as TeX: 3\,x-hat - 2\,y-hat */
  function vec(c, f) {
    f = f || (x => String(x));
    const names = ['x', 'y', 'z'];
    let s = '';
    c.forEach((v, i) => {
      if (Math.abs(v) < 1e-12) return;
      const m = Math.abs(v) === 1 ? '' : f(Math.abs(v)) + '\\,';
      if (!s) s = (v < 0 ? '-' : '') + m + hat(names[i]);
      else s += (v < 0 ? ' - ' : ' + ') + m + hat(names[i]);
    });
    return s || '0';
  }
  /** multiple choice from numbers: fmt(x) -> choice string (or null), choices ordered by value */
  function mcv(R, corr, wrongs, fmt) {
    const val = new Map();
    const f = x => { const t = fmt(x); if (t != null) val.set(t, x); return t; };
    const c = f(corr);
    if (c == null) throw new Error('mcv: cannot format answer ' + corr);
    let ws = wrongs.filter(x => isFinite(x) && Math.abs(x - corr) > 1e-9 * Math.max(1, Math.abs(corr))).map(f).filter(t => t != null);
    const distinct = () => new Set(ws.map(GRE.norm).filter(k => k !== GRE.norm(c))).size;
    // pad with simple multiples of the answer if the mistake list collapsed (e.g. when some factor is 1)
    for (const m of [2, 1 / 2, 4, 1 / 4, 3, 1 / 3]) { if (distinct() >= 5) break; const t = f(corr * m); if (t != null) ws.push(t); }
    return GRE.mc(R, c, ws, { rank: t => val.get(t) });
  }
  const signed = (x, s) => (x > 0 ? '+' : '') + s;          // "+3" style labels
  const pc = (n, unit) => (n > 0 ? '+' : n < 0 ? '-' : '') + Math.abs(n) + (unit ? raw`\,${unit}` : '');
  const pw = (v, p) => (p === 0 ? '' : p === 1 ? v : `${v}^{${p}}`);
  const dir = (axis, s) => `$${s > 0 ? '+' : '-'}${axis}$`;
  const ORD = ['first', 'second', 'third', 'fourth'];

  // vector fields for curl / divergence questions: [TeX (use @x @y @z for unit vectors), f(x,y,z), curl TeX, div TeX]
  const FIELD_DEFS = [
    ['y\\,@x + x\\,@y', (x, y, z) => [y, x, 0], '0', '0'],
    ['x\\,@x - y\\,@y', (x, y, z) => [x, -y, 0], '0', '0'],
    ['2xy\\,@x + x^2\\,@y', (x, y, z) => [2 * x * y, x * x, 0], '0', '2cy'],
    ['yz\\,@x + xz\\,@y + xy\\,@z', (x, y, z) => [y * z, x * z, x * y], '0', '0'],
    ['x\\,@x + y\\,@y + z\\,@z', (x, y, z) => [x, y, z], '0', '3c'],
    ['y^2\\,@x + 2xy\\,@y', (x, y, z) => [y * y, 2 * x * y, 0], '0', '2cx'],
    ['y\\,@x - x\\,@y', (x, y, z) => [y, -x, 0], '-2c\\,@z', '0'],
    ['x\\,@y', (x, y, z) => [0, x, 0], 'c\\,@z', '0'],
    ['y\\,@x', (x, y, z) => [y, 0, 0], '-c\\,@z', '0'],
    ['xy\\,@x + xy\\,@y', (x, y, z) => [x * y, x * y, 0], 'c(y - x)\\,@z', 'c(x + y)'],
    ['x^2\\,@x', (x, y, z) => [x * x, 0, 0], '0', '2cx'],
    ['2xy\\,@x + y^2\\,@y', (x, y, z) => [2 * x * y, y * y, 0], '-2cx\\,@z', '4cy'],
    ['z\\,@x + x\\,@z', (x, y, z) => [z, 0, x], '0', '0'],
    ['y^2\\,@x + x^2\\,@y', (x, y, z) => [y * y, x * x, 0], '2c(x - y)\\,@z', '0'],
    ['yz\\,@x - xz\\,@y', (x, y, z) => [y * z, -x * z, 0], 'c(x\\,@x + y\\,@y - 2z\\,@z)', '0'],
    ['xy^2\\,@x + x^2y\\,@y', (x, y, z) => [x * y * y, x * x * y, 0], '0', 'c(x^2 + y^2)'],
    ['-y\\,@x + x\\,@y', (x, y, z) => [-y, x, 0], '2c\\,@z', '0'],
    ['x\\,@x + y\\,@y - 2z\\,@z', (x, y, z) => [x, y, -2 * z], '0', '0'],
    ['y\\,@x + x\\,@y + 2z\\,@z', (x, y, z) => [y, x, 2 * z], '0', '2c'],
    ['z\\,@x + x\\,@y + y\\,@z', (x, y, z) => [z, x, y], 'c(@x + @y + @z)', '0'],
    ['xy\\,@x', (x, y, z) => [x * y, 0, 0], '-cx\\,@z', 'cy'],
    ['(x^2 + y^2)\\,@z', (x, y, z) => [0, 0, x * x + y * y], '2c(y\\,@x - x\\,@y)', '0'],
    ['z\\,@y + y\\,@z', (x, y, z) => [0, z, y], '0', '0'],
    ['x\\,@z', (x, y, z) => [0, 0, x], '-c\\,@y', '0'],
    ['x\\,@x + y\\,@y', (x, y, z) => [x, y, 0], '0', '2c'],
    ['z\\,@x - x\\,@z', (x, y, z) => [z, 0, -x], '2c\\,@y', '0'],
    ['x^2\\,@x + y^2\\,@y + z^2\\,@z', (x, y, z) => [x * x, y * y, z * z], '0', '2c(x + y + z)'],
    ['y^2\\,@x', (x, y, z) => [y * y, 0, 0], '-2cy\\,@z', '0'],
  ];
  const H = s => s.replace(/@([xyz])/g, (m, a) => hat(a));
  const FIELDS = FIELD_DEFS.map(([t, f, curl, div]) => {
    // classify numerically (robust against slips in the TeX)
    const pts = [[0.7, -1.3, 0.4], [1.1, 0.6, -0.9], [-0.5, 1.7, 1.2]], h = 1e-4;
    let cmax = 0, dmax = 0;
    for (const p of pts) {
      const d = (i, j) => { const a = p.slice(), b = p.slice(); a[j] += h; b[j] -= h; return (f(...a)[i] - f(...b)[i]) / (2 * h); };
      const cu = [d(2, 1) - d(1, 2), d(0, 2) - d(2, 0), d(1, 0) - d(0, 1)];
      cmax = Math.max(cmax, ...cu.map(Math.abs));
      dmax = Math.max(dmax, Math.abs(d(0, 0) + d(1, 1) + d(2, 2)));
    }
    return { t: H(t), curl: cmax > 1e-6, div: dmax > 1e-6, curlT: H(curl), divT: H(div) };
  });

  // light nuclei (mass in units of the proton mass, charge in units of e)
  const NUC = [
    { n: 'proton', q: 1, A: 1 }, { n: 'deuteron', q: 1, A: 2 }, { n: 'triton', q: 1, A: 3 },
    { n: 'alpha particle', q: 2, A: 4 }, { n: 'helium-3 nucleus', q: 2, A: 3 },
    { n: 'singly ionized helium-4 atom', q: 1, A: 4 }, { n: 'lithium-6 nucleus', q: 3, A: 6 },
  ];

  // ===================================================================== 2.1 ELECTROSTATICS (part 1)
  GRE.addTemplates('em', [
    // ------------------------------------------------------------- 2.1.1 Maxwell's equations
    {
      id: 'em.max.divergence', sec: '2.1.1', level: 2, weight: 2,
      gen(R) {
        const kind = R.weighted(['sph', 'cyl', 'cart', 'numS', 'numC'], [3, 3, 2, 1, 1]);
        if (kind === 'numS') {
          const b = R.pick([100, 150, 200, 250, 300, 400, 500, 600, 750, 800, 900, 1200, 1500, 2000]);
          const rho = 3 * EPS * b;
          return {
            q: raw`In a region of space the electrostatic field is $\mathbf{E} = b\,r\,\hat{\mathbf{r}}$, where $r$ is the distance from the origin and $b = ${b}\,\text{V/m}^2$. What is the charge density in this region? (Take $${EPS_T}$.)`,
            ...GRE.numeric(R, rho, [EPS * b, 2 * EPS * b, 6 * EPS * b, 1.5 * EPS * b], { unit: raw`\text{C/m}^3` }),
            expl: raw`Gauss's law in differential form: $\rho = \epsilon_0\nabla\cdot\mathbf{E}$. In spherical coordinates $\nabla\cdot(b\,r\,\hat{\mathbf{r}}) = \frac{1}{r^2}\frac{d}{dr}(b\,r^3) = 3b$, so $\rho = 3\epsilon_0 b = ${F.num(rho)}\,\text{C/m}^3$ (uniform). Taking only $dE_r/dr = b$ misses the factor 3.`,
          };
        }
        if (kind === 'numC') {
          const L = [100, 200, 300, 400, 500, 600, 800, 900, 1000, 1200];
          const b = R.pick(L) * R.sign(), c = R.pick(L) * R.sign();
          if (b + c === 0) throw new Error('zero density');
          const rho = EPS * (b + c);
          return {
            q: raw`In a region of space the electrostatic field is $\mathbf{E} = b\,x\,\hat{\mathbf{x}} + c\,y\,\hat{\mathbf{y}}$, with $b = ${b}\,\text{V/m}^2$ and $c = ${c}\,\text{V/m}^2$. What is the charge density in this region? (Take $${EPS_T}$.)`,
            ...GRE.numeric(R, rho, [EPS * (b - c), EPS * (c - b), EPS * b, EPS * c, -rho, 2 * rho], { unit: raw`\text{C/m}^3`, allowSign: true }),
            expl: raw`$\rho = \epsilon_0\nabla\cdot\mathbf{E} = \epsilon_0\left(\frac{\partial E_x}{\partial x} + \frac{\partial E_y}{\partial y}\right) = \epsilon_0(b + c) = ${F.num(rho)}\,\text{C/m}^3$. (The field is curl-free, so it is a legitimate electrostatic field.)`,
          };
        }
        const n = R.pick([1, 2, 3, 4]);
        const L = R.pick(['A', '\\alpha', '\\beta', 'b', 'k_0']);
        const G = {
          sph: { v: 'r', u: '\\hat{\\mathbf{r}}', fac: n + 2, desc: 'where $r$ is the distance from the origin and $\\hat{\\mathbf{r}}$ is the radial unit vector' },
          cyl: { v: 's', u: '\\hat{\\mathbf{s}}', fac: n + 1, desc: 'where $s$ is the perpendicular distance from the $z$-axis and $\\hat{\\mathbf{s}}$ points radially away from that axis' },
          cart: { v: 'x', u: hat('x'), fac: n, desc: 'in Cartesian coordinates' },
        }[kind];
        const term = (f, p) => { const v = pw(G.v, p); return `$${f === 1 ? '' : f}\\epsilon_0 ${L}${v ? '\\,' + v : ''}$`; };
        const over = (f, p) => { const v = pw(G.v, p); return `$\\dfrac{${f === 1 ? '' : f}${L}${v ? '\\,' + v : ''}}{\\epsilon_0}$`; };
        const correct = term(G.fac, n - 1);
        const facs = [n, n + 1, n + 2, n + 3].filter(f => f !== G.fac && f > 0);
        const wrongs = facs.map(f => term(f, n - 1)).concat([term(G.fac, n), over(G.fac, n - 1), term(G.fac, n + 1)]);
        const deriv = {
          sph: raw`\frac{1}{r^2}\frac{\partial}{\partial r}\left(r^2E_r\right) = \frac{1}{r^2}\frac{d}{dr}\left(${L}\,r^{${n + 2}}\right) = ${G.fac}${L}${pw('r', n - 1) ? '\\,' + pw('r', n - 1) : ''}`,
          cyl: raw`\frac{1}{s}\frac{\partial}{\partial s}\left(sE_s\right) = \frac{1}{s}\frac{d}{ds}\left(${L}\,s^{${n + 1}}\right) = ${G.fac}${L}${pw('s', n - 1) ? '\\,' + pw('s', n - 1) : ''}`,
          cart: raw`\frac{\partial E_x}{\partial x} = ${n === 1 ? '' : n}${L}${pw('x', n - 1) ? '\\,' + pw('x', n - 1) : ''}`,
        }[kind];
        return {
          q: raw`In a certain region the electrostatic field is $\mathbf{E} = ${L}\,${pw(G.v, n)}\,${G.u}$, ${G.desc}, and $${L}$ is a constant. What is the charge density $\rho$ in this region?`,
          ...GRE.mc(R, correct, wrongs),
          expl: raw`Use $\nabla\cdot\mathbf{E} = \rho/\epsilon_0$. Here $\nabla\cdot\mathbf{E} = ${deriv}$, so $\rho = ${correct.slice(1, -1)}$.${kind === 'cart' ? '' : ' The trap is to differentiate $E$ alone and forget the ' + (kind === 'sph' ? '$r^2$' : '$s$') + ' inside the divergence.'}`,
        };
      },
    },
    {
      id: 'em.max.curl', sec: '2.1.1', level: 2,
      gen(R) {
        const mode = R.weighted(['could', 'cannot', 'vacuum'], [4, 3, 2]);
        const curlFree = FIELDS.filter(f => !f.curl), curly = FIELDS.filter(f => f.curl);
        let corr, wrong;
        if (mode === 'could') { corr = R.pick(curlFree); wrong = R.pickN(curly, 4); }
        else if (mode === 'cannot') { corr = R.pick(curly); wrong = R.pickN(curlFree, 4); }
        else { corr = R.pick(curlFree.filter(f => !f.div)); wrong = R.pickN(FIELDS.filter(f => f.curl || f.div), 4); }
        const show = f => `$\\mathbf{E} = c\\,(${f.t})$`;
        const stem = {
          could: 'Which of the following could represent an electrostatic field? ($c$ is a nonzero constant with appropriate units.)',
          cannot: 'Which of the following could NOT represent an electrostatic field? ($c$ is a nonzero constant with appropriate units.)',
          vacuum: 'Which of the following could represent the electrostatic field in a region of space that contains no charge? ($c$ is a nonzero constant with appropriate units.)',
        }[mode];
        const w0 = wrong[0];
        const expl = {
          could: raw`An electrostatic field must be curl-free, $\nabla\times\mathbf{E} = 0$ (so that $\mathbf{E} = -\nabla V$). The correct field has $\nabla\times\mathbf{E} = 0$ and $\nabla\cdot\mathbf{E} = ${corr.divT}$, which only fixes the charge density $\rho = \epsilon_0\nabla\cdot\mathbf{E}$. Each other choice has a curl; e.g. $c\,(${w0.t})$ has curl $${w0.curlT}$.`,
          cannot: raw`An electrostatic field must satisfy $\nabla\times\mathbf{E} = 0$. The field $c\,(${corr.t})$ has $\nabla\times\mathbf{E} = ${corr.curlT} \neq 0$, so it cannot be electrostatic. The other four are curl-free (any divergence just reflects a charge density).`,
          vacuum: raw`With no charge present we need both $\nabla\times\mathbf{E} = 0$ and $\nabla\cdot\mathbf{E} = \rho/\epsilon_0 = 0$. Only $c\,(${corr.t})$ satisfies both. For example, $c\,(${w0.t})$ has curl $${w0.curlT}$ and divergence $${w0.divT}$.`,
        }[mode];
        return { q: stem, ...GRE.mc(R, show(corr), wrong.map(show)), expl, level: mode === 'vacuum' ? 3 : 2 };
      },
    },
    {
      id: 'em.max.roman', sec: '2.1.1', level: 1,
      gen(R) {
        const TRUE = [
          'The line integral $\\oint \\mathbf{E}\\cdot d\\mathbf{l}$ around any closed path is zero.',
          'In a region with no charge, the potential satisfies $\\nabla^2 V = 0$.',
          'The work done by the field on a charge moving between two points is independent of the path.',
          'In a region with no charge, the potential has no local maximum or minimum.',
          'The field can be written as $\\mathbf{E} = -\\nabla V$ for some scalar function $V$.',
          'Field lines begin on positive charges and end on negative charges (or extend to infinity).',
          'At every point, $\\nabla\\cdot\\mathbf{E} = \\rho/\\epsilon_0$.',
        ];
        const FALSE = [
          'Field lines can form closed loops.',
          'A charged particle can rest in stable equilibrium at a point in a charge-free region, held by electrostatic forces alone.',
          'Wherever the potential is zero, the electric field is also zero.',
          'Wherever the electric field is zero, the potential is also zero.',
          'In a region with no charge, the field must be uniform.',
          'The work needed to move a charge slowly between two points depends on the path taken.',
          'The divergence of $\\mathbf{E}$ is nonzero at every point where $\\mathbf{E}$ is nonzero.',
        ];
        const nT = R.int(1, 3);
        const st = R.shuffle(R.pickN(TRUE, nT).map(s => [s, true]).concat(R.pickN(FALSE, 3 - nT).map(s => [s, false])));
        return {
          q: GRE.romanStem('Which of the following statements about static electric fields in vacuum is (are) true?', st.map(s => s[0])),
          ...GRE.roman(R, st.map(s => s[1])),
          expl: raw`Electrostatics is $\nabla\cdot\mathbf{E} = \rho/\epsilon_0$ and $\nabla\times\mathbf{E} = 0$. Zero curl gives path independence, a potential with $\mathbf{E} = -\nabla V$, and no closed field lines; in charge-free regions $\nabla^2V = 0$, so $V$ has no local extrema (Earnshaw: no stable equilibrium). $V$ and $\mathbf{E}$ are independent pointwise ($V$ has an arbitrary zero). ` +
            st.map((s, i) => `${['I', 'II', 'III'][i]}: ${s[1] ? 'true' : 'false'}.`).join(' '),
        };
      },
    },

    // ------------------------------------------------------------- 2.1.2 Electric potential
    {
      id: 'em.pot.gradient', sec: '2.1.2', level: 2,
      gen(R) {
        const BIG = [[2, 0, 0], [0, 2, 0], [0, 0, 2], [2, 1, 0], [1, 2, 0], [0, 2, 1], [3, 0, 0], [0, 0, 3], [2, 0, 1], [0, 1, 2], [1, 0, 2]];
        const SMALL = [[1, 1, 0], [0, 1, 1], [1, 0, 1], [1, 1, 1], [1, 0, 0], [0, 1, 0], [0, 0, 1]];
        const m1 = R.pick(BIG);
        let m2 = R.pick(SMALL.concat(BIG));
        if (m2.join() === m1.join()) throw new Error('same monomial');
        const c1 = R.pick([1, 2, 3, 4, 5]) * R.sign(), c2 = R.pick([1, 2, 3, 4, 5, 6]) * R.sign();
        const P = [R.pick([-2, -1, 1, 2, 3]), R.pick([-2, -1, 1, 2, 3]), R.pick([-2, -1, 1, 2])];
        const mt = e => e.map((p, i) => pw('xyz'[i], p)).join('');
        const term = (c, e, first) => (first ? (c < 0 ? '-' : '') : (c < 0 ? ' - ' : ' + ')) + (Math.abs(c) === 1 ? '' : Math.abs(c)) + mt(e);
        const Vt = term(c1, m1, true) + term(c2, m2, false);
        const val = (e, p) => p[0] ** e[0] * p[1] ** e[1] * p[2] ** e[2];
        const grad = (e, p, drop) => [0, 1, 2].map(i => { if (!e[i]) return 0; const ee = e.slice(); ee[i]--; return (drop ? 1 : e[i]) * val(ee, p); });
        const G = [0, 1, 2].map(i => c1 * grad(m1, P)[i] + c2 * grad(m2, P)[i]);
        const Gd = [0, 1, 2].map(i => c1 * grad(m1, P, true)[i] + c2 * grad(m2, P, true)[i]);
        const E = G.map(v => -v);
        if (E.every(v => v === 0)) throw new Error('zero field');
        const show = v => `$(${vec(v)})\\,\\text{V/m}$`;
        const wrongs = [G, Gd.map(v => -v), Gd, [E[1], E[0], E[2]], [E[0], -E[1], E[2]], [-E[0], E[1], E[2]], [E[0], E[1], -E[2]]].map(show);
        return {
          q: raw`The electric potential in a region of space is $V(x,y,z) = ${Vt}$, where $V$ is in volts and $x$, $y$, $z$ are in meters. What is the electric field at the point $(${P.join(', ')})$?`,
          ...GRE.mc(R, show(E), wrongs),
          expl: raw`$\mathbf{E} = -\nabla V$. Here $\nabla V = (${vec(G)})\,\text{V/m}$ at $(${P.join(', ')})$, so $\mathbf{E} = (${vec(E)})\,\text{V/m}$. Don't forget the minus sign: the field points toward decreasing potential.`,
        };
      },
    },
    {
      id: 'em.pot.points', sec: '2.1.2', level: 1, weight: 2,
      gen(R) {
        const cfg = R.pick(['square', 'triangle', 'pair']);
        const q0 = R.pick([1, 2, 3, 4, 5]);
        const n = cfg === 'square' ? 4 : cfg === 'triangle' ? 3 : 2;
        const s = Array.from({ length: n }, () => R.pick([1, 2, 3, -1, -2]));
        const sum = s.reduce((a, b) => a + b, 0), abs = s.reduce((a, b) => a + Math.abs(b), 0);
        if (sum === 0) throw new Error('zero potential');
        const qs = s.map(v => pc(v * q0, '\\text{nC}'));
        let a, r, wr, desc, geo;
        if (cfg === 'square') {
          a = R.pick([2, 3, 4, 5, 6, 8, 10, 12, 15, 20]);
          r = a / Math.SQRT2;
          desc = raw`Charges $${qs.join('$, $')}$ are fixed at the four corners of a square of side $${a}\,\text{cm}$`;
          geo = 'the center of the square';
          wr = [a, a * Math.SQRT2];
        } else if (cfg === 'triangle') {
          a = R.pick([3, 4, 5, 6, 8, 9, 10, 12, 15, 20]);
          r = a / Math.sqrt(3);
          desc = raw`Charges $${qs.join('$, $')}$ are fixed at the three corners of an equilateral triangle of side $${a}\,\text{cm}$`;
          geo = 'the center of the triangle';
          wr = [a, a / 2, a * Math.sqrt(3) / 2];
        } else {
          const u = R.pick([1, 2, 3]);
          a = 6 * u; r = 5 * u;
          desc = raw`Charges $${qs[0]}$ and $${qs[1]}$ are fixed $${a}\,\text{cm}$ apart`;
          geo = raw`a point on the perpendicular bisector of the line joining them, $${4 * u}\,\text{cm}$ from that line`;
          wr = [4 * u, 3 * u];
        }
        const Vof = d => K * q0 * 1e-9 * sum / (d * 1e-2);
        const V = Vof(r);
        const ask = R.weighted(['V', 'W'], [3, 2]);
        const qt = R.pick([1, 2, 3, 5]) * R.sign();
        const wrongV = wr.map(Vof).concat([K * q0 * 1e-9 * abs / (r * 1e-2), -V]);
        if (ask === 'V') {
          return {
            q: raw`${desc}. Taking $V = 0$ at infinity, what is the electric potential at ${geo}? (Use $${K_T}$.)`,
            ...GRE.numeric(R, V, wrongV, { unit: raw`\text{V}`, allowSign: true }),
            expl: raw`Potentials add as scalars: $V = \sum_i \frac{q_i}{4\pi\epsilon_0 r_i}$. Every charge is $r = ${F.num(r, 3)}\,\text{cm}$ from that point, so $V = \frac{(${sum * q0}\,\text{nC})}{4\pi\epsilon_0 (${F.num(r / 100, 3)}\,\text{m})} = ${F.num(V)}\,\text{V}$. Signs matter; no vector addition is needed.`,
          };
        }
        const W = qt * 1e-6 * V;
        return {
          q: raw`${desc}. How much work must an external agent do to bring a point charge of $${pc(qt, '\\mu\\text{C}')}$ slowly from very far away to ${geo}? (Use $${K_T}$.)`,
          ...GRE.numeric(R, W, wrongV.map(v => qt * 1e-6 * v), { unit: raw`\text{J}`, allowSign: true }),
          expl: raw`$W = q\,[V(P) - V(\infty)] = qV(P)$. Each fixed charge is $${F.num(r, 3)}\,\text{cm}$ from $P$, so $V(P) = \sum_i q_i/(4\pi\epsilon_0 r) = ${F.num(V)}\,\text{V}$ and $W = (${pc(qt, '\\mu\\text{C}')})(${F.num(V)}\,\text{V}) = ${F.num(W)}\,\text{J}$.`,
        };
      },
    },
    {
      id: 'em.pot.accel', sec: '2.1.2', level: 1,
      gen(R) {
        const mode = R.weighted(['speed', 'ratio', 'energy'], [3, 2, 2]);
        if (mode === 'speed') {
          const elec = R.bool(0.4);
          const p = elec ? { n: 'electron', q: 1, m: ME } : (x => ({ n: x.n, q: x.q, m: x.A * MP }))(R.pick(NUC.slice(0, 5)));
          const V = elec ? R.pick([50, 100, 150, 200, 300, 400, 500, 800, 1000, 1500, 2000]) : R.pick([100, 200, 500, 1000, 2000, 5000, 1e4, 2e4, 5e4, 1e5]);
          const v = Math.sqrt(2 * p.q * QE * V / p.m);
          const wr = [Math.sqrt(p.q * QE * V / p.m), Math.sqrt(4 * p.q * QE * V / p.m)];
          if (p.q > 1) wr.unshift(Math.sqrt(2 * QE * V / p.m));
          return {
            q: raw`A${/^[aeiou]/.test(p.n) ? 'n' : ''} ${p.n}, initially at rest, is accelerated through a potential difference of $${F.num(V)}\,\text{V}$. What is its final speed?${elec ? '' : ' (Take the mass to be ' + (p.q === 1 && p.n === 'proton' ? '' : 'its mass number times ') + '$m_p = 1.67\\times10^{-27}\\,\\text{kg}$.)'}${elec ? ' ($m_e = 9.11\\times10^{-31}\\,\\text{kg}$)' : ''}`,
            ...GRE.numeric(R, v, wr, { unit: raw`\text{m/s}` }),
            expl: raw`Energy conservation: $\tfrac12 mv^2 = qV$, so $v = \sqrt{2qV/m}$ with $q = ${p.q === 1 ? 'e' : p.q + 'e'}$, giving $v = ${F.num(v)}\,\text{m/s}$ (well below $c$, so the nonrelativistic formula is fine).`,
          };
        }
        if (mode === 'ratio') {
          const [a, b] = R.pickN(NUC, 2);
          const r2 = (a.q / a.A) / (b.q / b.A);
          if (Math.abs(r2 - 1) < 1e-9) throw new Error('equal ratio');
          const ex = x => { const e = fx(x); return e ? `$${e}$` : null; };
          const wr = [1 / Math.sqrt(r2), r2, 1 / r2, Math.sqrt(b.A / a.A), a.q / b.q, Math.sqrt(a.q / b.q)].map(ex);
          return {
            q: raw`${/^[aeiou]/.test(a.n) ? 'An' : 'A'} ${a.n} and ${/^[aeiou]/.test(b.n) ? 'an' : 'a'} ${b.n}, each starting from rest, are accelerated through the same potential difference. What is the ratio $v_1/v_2$ of the final speed of the ${a.n} to that of the ${b.n}? (Take each mass to be its mass number times the proton mass.)`,
            ...GRE.mc(R, ex(Math.sqrt(r2)), wr),
            expl: raw`Each gains kinetic energy $qV$, so $v = \sqrt{2qV/m}\propto\sqrt{q/m}$. Here $q/m$ is $${F.frac(a.q, a.A)}$ for the ${a.n} and $${F.frac(b.q, b.A)}$ for the ${b.n} (in units of $e/m_p$), so $v_1/v_2 = \sqrt{${F.frac(a.q * b.A, a.A * b.q)}} = ${fx(Math.sqrt(r2))}$.`,
          };
        }
        const ions = [['alpha particle', 2], ['doubly ionized oxygen ion (O$^{2+}$)', 2], ['fully ionized lithium nucleus (Li$^{3+}$)', 3], ['fully ionized carbon nucleus (C$^{6+}$)', 6], ['triply ionized aluminum ion (Al$^{3+}$)', 3], ['singly ionized sodium ion (Na$^{+}$)', 1]];
        const [name, Z] = R.pick(ions);
        const V = R.pick([50, 100, 200, 250, 400, 500, 1000, 1500, 2000, 3000, 5000]);
        const KE = Z * V;
        return {
          q: raw`A${/^[aeiou]/.test(name) ? 'n' : ''} ${name} starts from rest and is accelerated through a potential difference of $${V}\,\text{V}$. What kinetic energy does it gain?`,
          ...GRE.numeric(R, KE, [V, Z * V / 2, Z * Z * V, 2 * Z * V, V / Z], { unit: raw`\text{eV}`, fmt: x => F.num(x, 3) }),
          expl: raw`$\Delta K = q\,\Delta V = (${Z === 1 ? '' : Z}e)(${V}\,\text{V}) = ${KE}\,\text{eV}$. The energy gained depends only on the charge and the potential difference, not on the mass.`,
        };
      },
    },
    {
      id: 'em.pot.uniform', sec: '2.1.2', level: 1,
      gen(R) {
        const E0 = R.pick([100, 200, 250, 300, 400, 500, 800, 1000, 1500, 2000, 5000]);
        const ax = R.pick(['x', 'y']), sg = R.sign();
        const A = [R.int(-10, 10), R.int(-10, 10)], B = [R.int(-10, 10), R.int(-10, 10)];
        const d = [B[0] - A[0], B[1] - A[1]];
        if (d[0] === 0 || d[1] === 0) throw new Error('need oblique displacement');
        const i = ax === 'x' ? 0 : 1, j = 1 - i;
        const Edotd = sg * E0 * d[i] / 100;  // V
        const dV = -Edotd;
        const dist = Math.hypot(d[0], d[1]) / 100;
        const mode = R.weighted(['dV', 'Wf', 'We'], [3, 2, 2]);
        const fieldT = raw`$\mathbf{E} = ${sg > 0 ? '' : '-'}(${E0}\,\text{V/m})\,${hat(ax)}$`;
        const pts = raw`point A at $(x, y) = (${A[0]}, ${A[1]})\,\text{cm}$ and point B at $(${B[0]}, ${B[1]})\,\text{cm}$`;
        if (mode === 'dV') {
          return {
            q: raw`A region contains a uniform electric field ${fieldT}. Consider ${pts}. What is the potential difference $V_B - V_A$?`,
            ...GRE.numeric(R, dV, [-dV, -Math.sign(Edotd) * E0 * dist, -sg * E0 * d[j] / 100, sg * E0 * d[j] / 100, dV * 100], { unit: raw`\text{V}`, allowSign: true, fmt: x => F.num(x, 3) }),
            expl: raw`$V_B - V_A = -\int_A^B \mathbf{E}\cdot d\mathbf{l} = -\mathbf{E}\cdot\Delta\mathbf{r}$. Only the displacement along the field matters: $\Delta ${ax} = ${d[i]}\,\text{cm}$, so $V_B - V_A = -(${sg * E0})(${F.num(d[i] / 100)}) = ${F.num(dV, 3)}\,\text{V}$. Moving along $\mathbf{E}$ lowers the potential.`,
          };
        }
        const q = R.pick([1, 2, 3, 4, 5]) * R.sign();
        const Wf = q * 1e-6 * Edotd;
        const W = mode === 'Wf' ? Wf : -Wf;
        return {
          q: raw`A region contains a uniform electric field ${fieldT}. A particle of charge $${pc(q, '\\mu\\text{C}')}$ is moved along a curved path from point A at $(${A[0]}, ${A[1]})\,\text{cm}$ to point B at $(${B[0]}, ${B[1]})\,\text{cm}$. ${mode === 'Wf' ? 'How much work does the electric field do on the particle?' : 'How much work must an external agent do to move it slowly (with no change in kinetic energy)?'}`,
          ...GRE.numeric(R, W, [-W, Math.sign(W) * Math.abs(q) * 1e-6 * E0 * dist, (mode === 'Wf' ? 1 : -1) * q * 1e-6 * sg * E0 * d[j] / 100, W * 100], { unit: raw`\text{J}`, allowSign: true, fmt: x => F.num(x, 3) }),
          expl: raw`The electrostatic force is conservative, so the path doesn't matter. The field does $W_{\text{field}} = q\,\mathbf{E}\cdot\Delta\mathbf{r} = q(${sg * E0}\,\text{V/m})(${F.num(d[i] / 100)}\,\text{m}) = ${F.num(Wf, 3)}\,\text{J}$${mode === 'We' ? raw`, and the external agent does the negative of this, $W = q(V_B - V_A) = ${F.num(W, 3)}\,\text{J}$` : ''}. Only the displacement component along $\mathbf{E}$ counts.`,
        };
      },
    },

    // ------------------------------------------------------------- 2.1.3 Gauss's law
    {
      id: 'em.gauss.flux', sec: '2.1.3', level: 2, weight: 2,
      gen(R) {
        const mode = R.weighted(['cubeCenter', 'cubeCorner', 'disk', 'multi', 'hemi'], [2, 2, 2, 3, 2]);
        const fq = (x) => `$${x === 0 ? '0' : tfx(x, 'q', '\\epsilon_0')}$`;
        if (mode === 'cubeCenter') {
          const what = R.pick(['one face', 'two adjacent faces taken together', 'three faces taken together', 'five of its faces taken together']);
          const nf = { 'one face': 1, 'two adjacent faces taken together': 2, 'three faces taken together': 3, 'five of its faces taken together': 5 }[what];
          const corr = nf / 6;
          const wr = [1, 1 / 2, 1 / 4, 1 / 8, 1 / 24, nf / 8, nf / 4, 1 / 6, 2 / 3, 0].filter(x => Math.abs(x - corr) > 1e-9);
          return {
            q: raw`A point charge $q$ sits at the center of a closed cubical surface. What is the electric flux through ${what} of the cube?`,
            ...GRE.mc(R, fq(corr), R.shuffle(wr).map(fq)),
            expl: raw`The total flux through the closed cube is $q/\epsilon_0$ (Gauss's law), and by symmetry each of the six faces gets an equal share, $q/(6\epsilon_0)$. So ${what} carr${nf === 1 ? 'ies' : 'y'} $${tfx(corr, 'q', '\\epsilon_0')}$.`,
          };
        }
        if (mode === 'cubeCorner') {
          const which = R.pick(['whole', 'far', 'near']);
          const corr = { whole: 1 / 8, far: 1 / 24, near: 0 }[which];
          const desc = { whole: 'the entire closed surface of the cube', far: 'one of the three faces that do not touch that corner', near: 'one of the three faces that meet at that corner' }[which];
          const wr = [1, 1 / 2, 1 / 6, 1 / 8, 1 / 24, 1 / 4, 1 / 3, 0, 1 / 48].filter(x => Math.abs(x - corr) > 1e-9);
          return {
            q: raw`A point charge $q$ is placed exactly at one corner of an imaginary cube. What is the electric flux through ${desc}?`,
            ...GRE.mc(R, fq(corr), R.shuffle(wr).map(fq)),
            expl: raw`Eight such cubes would surround the charge symmetrically, so the cube catches $\frac{1}{8}\cdot\frac{q}{\epsilon_0}$. The three faces meeting at the charge are parallel to the radial field and get no flux, so each of the other three gets $\frac{1}{3}\cdot\frac{q}{8\epsilon_0} = \frac{q}{24\epsilon_0}$. Answer: $${corr === 0 ? '0' : tfx(corr, 'q', '\\epsilon_0')}$.`,
            level: 3,
          };
        }
        if (mode === 'disk') {
          const [d, Rd, h] = R.pick([[3, 4, 5], [4, 3, 5], [5, 12, 13], [12, 5, 13], [8, 6, 10], [6, 8, 10], [8, 15, 17], [15, 8, 17]]);
          const u = R.pick([1, 2, 3]);
          const corr = (1 - d / h) / 2;
          const wr = [d / (2 * h), (Rd * Rd) / (4 * h * h), 1 - d / h, 1 / 2, (Rd * Rd) / (4 * d * d), Rd / (2 * h)].filter(x => Math.abs(x - corr) > 1e-9);
          return {
            q: raw`A point charge $q$ lies on the axis of an imaginary flat disk of radius $${Rd * u}\,\text{cm}$, a distance $${d * u}\,\text{cm}$ from the disk's center. What is the electric flux through the disk?`,
            ...mcv(R, corr, wr, fq),
            expl: raw`The flux through the disk equals the flux through the spherical cap (centered on the charge) that it subtends: $\Phi = \frac{q}{\epsilon_0}\cdot\frac{\Omega}{4\pi} = \frac{q}{2\epsilon_0}(1-\cos\alpha)$ with $\cos\alpha = ${d}/${h}$. So $\Phi = ${tfx(corr, 'q', '\\epsilon_0')}$. Using the disk area over $4\pi r^2$ is the trap — the field is not uniform across the disk.`,
            level: 3,
          };
        }
        if (mode === 'multi') {
          const nin = R.int(2, 3), nout = R.int(1, 2);
          const qin = Array.from({ length: nin }, () => R.pick([1, 2, 3, 4, 5, 6]) * R.sign());
          const qout = Array.from({ length: nout }, () => R.pick([1, 2, 3, 4, 5, 6]) * R.sign());
          const Sin = qin.reduce((a, b) => a + b, 0), Sall = Sin + qout.reduce((a, b) => a + b, 0), Sabs = qin.reduce((a, b) => a + Math.abs(b), 0);
          if (Sin === 0) throw new Error('zero');
          const phi = Sin * 1e-9 / EPS;
          const surf = R.pick(['a closed spherical surface', 'a closed cubical surface', 'an irregularly shaped closed surface', 'a closed cylindrical surface']);
          return {
            q: raw`Point charges of $${qin.map(x => pc(x, '\\text{nC}')).join(nin === 2 ? '$ and $' : '$, $')}$ lie inside ${surf}, and ${nout === 1 ? 'a charge' : 'charges'} of $${qout.map(x => pc(x, '\\text{nC}')).join('$ and $')}$ ${nout === 1 ? 'lies' : 'lie'} outside it. What is the net electric flux out of the surface? (Take $${EPS_T}$.)`,
            ...GRE.numeric(R, phi, [Sall * 1e-9 / EPS, Sabs * 1e-9 / EPS, -phi, K * Sin * 1e-9, 4 * PI * phi], { unit: raw`\text{N}\cdot\text{m}^2/\text{C}`, allowSign: true }),
            expl: raw`Gauss's law: $\Phi = Q_{\text{enc}}/\epsilon_0$, and only the enclosed charge counts (charges outside contribute equal inward and outward flux). $Q_{\text{enc}} = ${pc(Sin, '\\text{nC}')}$, so $\Phi = ${F.num(phi)}\,\text{N}\cdot\text{m}^2/\text{C}$ regardless of the shape of the surface.`,
            level: 1,
          };
        }
        const E0 = R.pick([100, 200, 300, 500, 800, 1000, 2000, 5000]), Rh = R.pick([5, 10, 15, 20, 30, 50]);
        const A = PI * (Rh / 100) ** 2;
        const phi = E0 * A;
        return {
          q: raw`A uniform electric field of magnitude $${E0}\,\text{N/C}$ points along the $+z$ direction. An imaginary hemispherical surface of radius $${Rh}\,\text{cm}$ (open, without its flat base) sits with its rim in the $xy$-plane and bulges toward $+z$. What is the magnitude of the electric flux through the curved hemispherical surface?`,
          ...GRE.numeric(R, phi, [2 * phi, 4 * phi, phi / 2, 0.5 * phi * 4 / PI], { unit: raw`\text{N}\cdot\text{m}^2/\text{C}` }),
          expl: raw`No charge is enclosed by the hemisphere plus its flat base, so the flux through the curved part equals the flux through the base: $\Phi = E\,\pi R^2 = (${E0})(\pi)(${F.num(Rh / 100)})^2 = ${F.num(phi)}\,\text{N}\cdot\text{m}^2/\text{C}$. Using the curved area $2\pi R^2$ double counts.`,
          level: 2,
        };
      },
    },
    {
      id: 'em.gauss.sphere', sec: '2.1.3', level: 2, weight: 2,
      gen(R) {
        const mode = R.weighted(['num', 'ratio', 'center'], [3, 3, 1]);
        if (mode === 'num') {
          const Q = R.pick([1, 2, 3, 4, 5, 6, 8]) * R.pick([1, 10]);
          const Rs = R.pick([2, 4, 5, 6, 8, 10, 12, 15, 20]);
          const inside = R.bool();
          const r = inside ? Rs * R.pick([0.25, 0.5, 0.75]) : Rs * R.pick([1.5, 2, 2.5, 3, 4]);
          const Qc = Q * 1e-9, rm = r / 100, Rm = Rs / 100;
          const E = inside ? K * Qc * rm / Rm ** 3 : K * Qc / rm ** 2;
          const wr = inside ? [K * Qc / rm ** 2, K * Qc / Rm ** 2, K * Qc * rm ** 2 / Rm ** 4, K * Qc * rm / Rm ** 3 / 2] : [K * Qc / Rm ** 2, K * Qc * rm / Rm ** 3, K * Qc / (rm * Rm), K * Qc / (rm - Rm) ** 2];
          return {
            q: raw`A solid nonconducting sphere of radius $${Rs}\,\text{cm}$ carries a total charge of $${Q}\,\text{nC}$ spread uniformly through its volume. What is the magnitude of the electric field at a distance of $${F.num(r, 3)}\,\text{cm}$ from its center? (Use $${K_T}$.)`,
            ...GRE.numeric(R, E, wr, { unit: raw`\text{N/C}` }),
            expl: inside
              ? raw`Inside, a Gaussian sphere of radius $r$ encloses $Q(r/R)^3$, so $E = \frac{Qr}{4\pi\epsilon_0 R^3} = ${F.num(E)}\,\text{N/C}$. Using the full $Q$ with $1/r^2$ is the trap: the charge outside radius $r$ contributes nothing.`
              : raw`Outside, the sphere acts like a point charge: $E = \frac{Q}{4\pi\epsilon_0 r^2} = ${F.num(E)}\,\text{N/C}$.`,
            level: 1,
          };
        }
        if (mode === 'ratio') {
          const FR = [[1, 4], [1, 3], [1, 2], [2, 3], [3, 4], [1, 1], [3, 2], [2, 1], [3, 1], [4, 1]];
          const [a, b] = R.pickN(FR, 2);
          const x1 = a[0] / a[1], x2 = b[0] / b[1];
          const e = x => (x <= 1 ? x : 1 / (x * x));
          const corr = e(x1) / e(x2);
          const ex = x => { const t = fx(x); return t ? `$${t}$` : null; };
          const wr = [1 / corr, (x2 / x1) ** 2, x1 / x2, (x1 / x2) ** 2, (x1 / x2) ** 3, 1, x2 / x1, 2 * corr, corr / 2];
          const rt = x => (x === 1 ? 'R' : `${F.frac(Math.round(x * 12), 12)}R`);
          return {
            q: raw`A nonconducting sphere of radius $R$ has charge distributed uniformly throughout its volume. What is the ratio $E_1/E_2$ of the electric field magnitude at distance $r_1 = ${rt(x1)}$ from the center to that at $r_2 = ${rt(x2)}$?`,
            ...mcv(R, corr, wr, ex),
            expl: raw`Gauss's law gives $E \propto r$ inside ($E = \frac{Qr}{4\pi\epsilon_0 R^3}$) and $E \propto 1/r^2$ outside. In units of $Q/(4\pi\epsilon_0 R^2)$: $E_1 = ${fx(e(x1))}$ and $E_2 = ${fx(e(x2))}$, so $E_1/E_2 = ${fx(corr)}$.`,
          };
        }
        const charge = R.pick(['Q', 'q', 'Q_0']);
        const c = `\\dfrac{3${charge}}{8\\pi\\epsilon_0 R}`;
        return {
          q: raw`A solid nonconducting sphere of radius $R$ carries total charge $${charge}$ spread uniformly through its volume. Taking $V = 0$ at infinity, what is the electric potential at the center of the sphere?`,
          ...GRE.mc(R, `$${c}$`, [`$0$`, `$\\dfrac{${charge}}{4\\pi\\epsilon_0 R}$`, `$\\dfrac{${charge}}{8\\pi\\epsilon_0 R}$`, `$\\dfrac{3${charge}}{4\\pi\\epsilon_0 R}$`, `$\\dfrac{3${charge}}{16\\pi\\epsilon_0 R}$`, `$\\dfrac{${charge}}{6\\pi\\epsilon_0 R}$`]),
          expl: raw`$V(0) = V(R) - \int_R^0 E\,dr = \frac{${charge}}{4\pi\epsilon_0 R} + \int_0^R \frac{${charge} r}{4\pi\epsilon_0 R^3}dr = \frac{${charge}}{4\pi\epsilon_0 R}\left(1 + \frac12\right) = \frac{3${charge}}{8\pi\epsilon_0 R}$. The field vanishes at the center, but the potential does not.`,
          level: 3,
        };
      },
    },
    {
      id: 'em.gauss.nonuniform', sec: '2.1.3', level: 3,
      gen(R) {
        const mode = R.weighted(['Ein', 'Q', 'Eout', 'ratio', 'linear'], [3, 2, 2, 2, 1]);
        const n = R.pick([1, 2, 3]);
        const L = R.pick(['\\alpha', 'A', 'b', 'k_0']);
        const rho = `$\\rho(r) = ${L}\\,${pw('r', n)}$`;
        const intro = raw`A sphere of radius $R$ has charge density ${rho} for $r \le R$ (with $${L}$ a positive constant) and no charge outside.`;
        if (mode === 'Ein') {
          const t = (k, p) => `$${tf(1, k, `${L}\\,${pw('r', p)}`, '\\epsilon_0')}$`;
          const corr = t(n + 3, n + 1);
          const wr = [t(n + 2, n + 1), t(n + 1, n + 1), t(3, n + 1), t(n + 3, n), t(n + 3, n + 2), `$${tf(4, n + 3, `\\pi ${L}\\,${pw('r', n + 1)}`, '\\epsilon_0')}$`];
          return {
            q: raw`${intro} What is the magnitude of the electric field at a distance $r < R$ from the center?`,
            ...GRE.mc(R, corr, wr),
            expl: raw`Gauss's law with a sphere of radius $r$: $E\cdot4\pi r^2 = \frac{1}{\epsilon_0}\int_0^r ${L}\,r'${n === 1 ? '' : '^{' + n + '}'}\,4\pi r'^2dr' = \frac{4\pi ${L} r^{${n + 3}}}{${n + 3}\epsilon_0}$, so $E = ${corr.slice(1, -1)}$.`,
          };
        }
        if (mode === 'Q' || mode === 'Eout') {
          const out = mode === 'Eout';
          const t = (c, k, p) => `$${tf(c, k, `\\pi ${L}\\,${pw('R', p)}`, '')}$`;
          const te = (k, p) => `$${tf(1, k, `${L}\\,${pw('R', p)}`, '\\epsilon_0 r^2')}$`;
          const corr = out ? te(n + 3, n + 3) : t(4, n + 3, n + 3);
          const wr = out
            ? [te(n + 2, n + 3), te(n + 1, n + 3), te(4 * (n + 3), n + 3), te(n + 3, n + 2), `$${tf(4, n + 3, `\\pi ${L}\\,${pw('R', n + 3)}`, '\\epsilon_0 r^2')}$`]
            : [t(4, n + 2, n + 2), t(4, n + 2, n + 3), t(4, 3, n + 3), t(1, n + 3, n + 3), t(4, n + 1, n + 3), t(4, n + 3, n + 2)];
          return {
            q: raw`${intro} ${out ? 'What is the magnitude of the electric field at a distance $r > R$ from the center?' : 'What is the total charge of the sphere?'}`,
            ...GRE.mc(R, corr, wr),
            expl: raw`$Q = \int_0^R ${L}\,${pw('r', n)}\,4\pi r^2\,dr = \frac{4\pi ${L} R^{${n + 3}}}{${n + 3}}$.${out ? raw` Outside, the sphere acts like a point charge, $E = \frac{Q}{4\pi\epsilon_0 r^2} = ${corr.slice(1, -1)}$.` : ' Remember the $4\\pi r^2$ volume element: the integrand has power $r^{' + (n + 2) + '}$.'}`,
          };
        }
        if (mode === 'ratio') {
          const [a, b] = R.pick([[1, 2], [1, 3], [2, 3], [1, 4], [3, 4]]);
          const corr = Math.pow(a / b, n + 1);
          const ex = x => { const e = fx(x); return e == null ? null : `$${e}$`; };
          const wr = [Math.pow(a / b, n), Math.pow(a / b, n + 2), Math.pow(a / b, n + 3), a / b, Math.pow(b / a, n + 1), Math.pow(a / b, n - 1)];
          return {
            q: raw`${intro} What is the ratio of the field magnitude at $r = ${F.frac(a, b)}R$ to the field magnitude at the surface, $r = R$?`,
            ...mcv(R, corr, wr, ex),
            expl: raw`Inside, $E(r) = \frac{${L}\,r^{${n + 1}}}{${n + 3}\epsilon_0}$ (enclosed charge $\propto r^{${n + 3}}$ divided by $r^2$), so $E(r)/E(R) = (r/R)^{${n + 1}} = (${F.frac(a, b)})^{${n + 1}} = ${fx(corr)}$.`,
          };
        }
        const corr = raw`$\dfrac{\pi\rho_0 R^3}{3}$`;
        return {
          q: raw`A sphere of radius $R$ has charge density $\rho(r) = \rho_0\left(1 - \dfrac{r}{R}\right)$ for $r \le R$ and no charge outside. What is the total charge of the sphere?`,
          ...GRE.mc(R, corr, [raw`$\dfrac{4\pi\rho_0 R^3}{3}$`, raw`$\dfrac{2\pi\rho_0 R^3}{3}$`, raw`$\pi\rho_0 R^3$`, raw`$\dfrac{\pi\rho_0 R^3}{6}$`, raw`$\dfrac{\pi\rho_0 R^3}{12}$`]),
          expl: raw`$Q = \int_0^R \rho_0\left(1 - \frac{r}{R}\right)4\pi r^2dr = 4\pi\rho_0\left(\frac{R^3}{3} - \frac{R^3}{4}\right) = \frac{\pi\rho_0R^3}{3}$. Sanity check: it is less than the uniform-density value $\frac43\pi\rho_0R^3$.`,
        };
      },
    },
    {
      id: 'em.gauss.cylinder', sec: '2.1.3', level: 2, weight: 2,
      gen(R) {
        const mode = R.weighted(['line', 'ratio', 'coax', 'inside'], [3, 2, 2, 1]);
        if (mode === 'line') {
          const lam = R.pick([1, 2, 3, 4, 5, 6, 8, 10, 20, 50]);
          const r = R.pick([1, 2, 3, 4, 5, 10, 20, 25, 50]);
          const E = 2 * K * lam * 1e-9 / (r / 100);
          return {
            q: raw`A very long straight wire carries a uniform linear charge density of $${lam}\,\text{nC/m}$. What is the magnitude of the electric field $${r}\,\text{cm}$ from the wire? (Use $${K_T}$.)`,
            ...GRE.numeric(R, E, [E / 2, K * lam * 1e-9 / (r / 100) ** 2, 2 * K * lam * 1e-9 / (r / 100) ** 2, 4 * PI * E / 2], { unit: raw`\text{N/C}` }),
            expl: raw`A cylindrical Gaussian surface of radius $r$ and length $l$: $E(2\pi rl) = \lambda l/\epsilon_0$, so $E = \frac{\lambda}{2\pi\epsilon_0 r} = \frac{2\lambda}{4\pi\epsilon_0 r} = ${F.num(E)}\,\text{N/C}$. The field falls off as $1/r$, not $1/r^2$.`,
            level: 1,
          };
        }
        if (mode === 'ratio') {
          const FR = [[1, 4], [1, 3], [1, 2], [2, 3], [3, 4], [1, 1], [3, 2], [2, 1], [3, 1], [4, 1]];
          const [a, b] = R.pickN(FR, 2);
          const x1 = a[0] / a[1], x2 = b[0] / b[1];
          const e = x => (x <= 1 ? x : 1 / x);
          const corr = e(x1) / e(x2);
          const ex = x => { const t = fx(x); return t ? `$${t}$` : null; };
          const wr = [1 / corr, x2 / x1, x1 / x2, (x1 / x2) ** 2, (x2 / x1) ** 2, 1, 2 * corr, corr / 2];
          const rt = x => (x === 1 ? 'R' : `${F.frac(Math.round(x * 12), 12)}R`);
          return {
            q: raw`A very long solid nonconducting cylinder of radius $R$ carries a uniform volume charge density. What is the ratio $E_1/E_2$ of the electric field magnitude at distance $s_1 = ${rt(x1)}$ from the axis to that at $s_2 = ${rt(x2)}$?`,
            ...mcv(R, corr, wr, ex),
            expl: raw`A coaxial Gaussian cylinder gives $E = \frac{\rho s}{2\epsilon_0}$ inside ($\propto s$) and $E = \frac{\rho R^2}{2\epsilon_0 s}$ outside ($\propto 1/s$, not $1/s^2$). In units of $\rho R/(2\epsilon_0)$: $E_1 = ${fx(e(x1))}$, $E_2 = ${fx(e(x2))}$, so $E_1/E_2 = ${fx(corr)}$.`,
          };
        }
        if (mode === 'coax') {
          const m = R.pick([-1, -2, -3, 1, 2, -4]);
          const outside = R.bool(0.6);
          const net = outside ? 1 + m : 1;
          const t = c => `$${c === 0 ? '0' : tf(c, 2, '\\lambda', '\\pi\\epsilon_0 s')}$`;
          const wr = [t(outside ? 1 : 1 + m), t(m), t(1 - m), `$${tf(net === 0 ? 1 + m + 2 : net, 4, '\\lambda', '\\pi\\epsilon_0 s')}$`, `$${tf(net === 0 ? 1 : net, 2, '\\lambda', '\\pi\\epsilon_0 s^2')}$`, t(-net)];
          return {
            q: raw`An infinitely long line charge with linear density $\lambda > 0$ lies along the axis of a thin, infinitely long cylindrical shell of radius $b$. The shell carries charge $${m === 1 ? '' : m === -1 ? '-' : m}\lambda$ per unit length. What is the radial component $E_s$ of the electric field at a distance $s ${outside ? '>' : '<'} b$ from the axis?`,
            ...GRE.mc(R, t(net), wr),
            expl: raw`Use a coaxial Gaussian cylinder of radius $s$: $E_s = \frac{\lambda_{\text{enc}}}{2\pi\epsilon_0 s}$. ${outside ? raw`For $s > b$ the enclosed charge per length is $\lambda ${m < 0 ? '-' : '+'} ${Math.abs(m) === 1 ? '' : Math.abs(m)}\lambda = ${net === 0 ? '0' : (net === 1 ? '' : net === -1 ? '-' : net) + '\\lambda'}$${net === 0 ? ', so the field vanishes outside (as in a coaxial cable)' : ''}.` : raw`For $s < b$ only the line charge is enclosed; the shell contributes nothing inside.`} So $E_s = ${t(net).slice(1, -1)}$.`,
          };
        }
        const corr = raw`$\dfrac{\rho s}{2\epsilon_0}$`;
        return {
          q: raw`A very long solid nonconducting cylinder of radius $R$ has uniform charge density $\rho$. What is the magnitude of the electric field a distance $s < R$ from its axis?`,
          ...GRE.mc(R, corr, [raw`$\dfrac{\rho s}{3\epsilon_0}$`, raw`$\dfrac{\rho s}{\epsilon_0}$`, raw`$\dfrac{\rho R^2}{2\epsilon_0 s}$`, raw`$\dfrac{\rho s^2}{2\epsilon_0 R}$`, raw`$\dfrac{\rho R}{2\epsilon_0}$`]),
          expl: raw`Gaussian cylinder of radius $s$ and length $l$: $E(2\pi sl) = \rho\pi s^2l/\epsilon_0$, so $E = \frac{\rho s}{2\epsilon_0}$. (For a sphere the analogous result is $\rho r/3\epsilon_0$.)`,
          level: 1,
        };
      },
    },
    {
      id: 'em.gauss.planes', sec: '2.1.3', level: 2, weight: 2,
      gen(R) {
        if (R.bool(0.3)) {
          // thick slab
          const inside = R.bool(0.6);
          const [a, b] = inside ? R.pick([[1, 4], [1, 3], [1, 2], [2, 3], [3, 4]]) : R.pick([[3, 2], [2, 1], [5, 2], [3, 1]]);
          const corr = inside ? `$${tf(a, b, '\\rho d', '\\epsilon_0')}$` : raw`$\dfrac{\rho d}{\epsilon_0}$`;
          const wr = inside
            ? [`$${tf(a, 2 * b, '\\rho d', '\\epsilon_0')}$`, raw`$\dfrac{\rho d}{\epsilon_0}$`, raw`$\dfrac{\rho d}{2\epsilon_0}$`, `$${tf(2 * a, b, '\\rho d', '\\epsilon_0')}$`, `$${tf(a, 3 * b, '\\rho d', '\\epsilon_0')}$`]
            : [`$${tf(a, b, '\\rho d', '\\epsilon_0')}$`, raw`$\dfrac{\rho d}{2\epsilon_0}$`, `$${tf(b, a, '\\rho d', '\\epsilon_0')}$`, raw`$\dfrac{2\rho d}{\epsilon_0}$`, '$0$'];
          return {
            q: raw`An infinite slab of nonconducting material occupies the region $-d < x < d$ and carries a uniform charge density $\rho$. What is the magnitude of the electric field at $x = ${F.frac(a, b)}d$?`,
            ...GRE.mc(R, corr, wr),
            expl: raw`By symmetry $E = 0$ at the midplane. A pillbox from the midplane out to $x$ gives $EA = \rho A|x|/\epsilon_0$ inside, so $E = \rho|x|/\epsilon_0$; outside, the enclosed charge stops growing and $E = \rho d/\epsilon_0$ (constant, like an infinite sheet with $\sigma = 2\rho d$). Here $E = ${corr.slice(1, -1)}$.`,
          };
        }
        const nS = R.pick([2, 2, 3]);
        const m = Array.from({ length: nS }, () => R.pick([1, 2, 3]) * R.sign());
        const region = R.int(0, nS);
        const field = ms => ms.reduce((s, mi, i) => s + mi * (region > i ? 1 : -1), 0); // in units of sigma/(2 eps0)
        const Ex = field(m);
        const xs = ['0', 'd', '2d'];
        const pt = region === 0 ? '-d' : region === nS ? (nS === 2 ? '2d' : '3d') : `${F.frac(2 * region - 1, 2)}d`;
        const lab = h => (h === 0 ? 'zero' : `$${tf(Math.abs(h), 2, '\\sigma', '\\epsilon_0')}$, in the ${dir('x', h)} direction`);
        const naive = m.reduce((s, mi) => s + Math.abs(mi), 0);
        const wr = [lab(-Ex), lab(2 * Ex), lab(Ex === 0 ? m[0] : 0), lab(m.reduce((s, mi) => s + mi, 0) * (Ex >= 0 ? 1 : -1)), lab(naive * (Ex >= 0 ? 1 : -1)), lab(-2 * Ex), lab(region === 0 ? -m[0] : m[region - 1]), lab(Ex + 1), lab(Ex - 1), lab(Ex === 0 ? 2 : Ex / 2)];
        return {
          q: raw`${nS === 2 ? 'Two' : 'Three'} large, parallel, nonconducting sheets lie in the planes ${m.map((_, i) => `$x = ${xs[i]}$`).join(nS === 2 ? ' and ' : ', ')}, with uniform surface charge densities ${m.map(v => `$${v === 1 ? '' : v === -1 ? '-' : v}\\sigma$`).join(nS === 2 ? ' and ' : ', ')}, respectively ($\sigma > 0$). What is the electric field at $x = ${pt}$?`,
          ...GRE.mc(R, lab(Ex), wr),
          expl: raw`Each sheet produces a field of magnitude $|\sigma_i|/2\epsilon_0$ pointing away from it if positive, toward it if negative, on both sides. Superposing at $x = ${pt}$: $E_x = \frac{\sigma}{2\epsilon_0}(${m.map((mi, i) => (mi * (region > i ? 1 : -1) >= 0 ? '+' : '-') + Math.abs(mi)).join('').replace(/^\+/, '')}) = ${Ex === 0 ? '0' : tf(Ex, 2, '\\sigma', '\\epsilon_0')}$.`,
          level: nS === 3 ? 2 : 1,
        };
      },
    },

    // ------------------------------------------------------------- 2.1.4 Standard configurations
    {
      id: 'em.config.polygon', sec: '2.1.4', level: 2,
      gen(R) {
        const SH = [[3, 'an equilateral triangle'], [4, 'a square'], [5, 'a regular pentagon'], [6, 'a regular hexagon'], [8, 'a regular octagon'], [12, 'a regular 12-sided polygon']];
        const [N, shape] = R.pick(SH);
        const mode = R.weighted(['all', 'remove', 'flip', 'Vremove'], [1, 3, 2, 1]);
        const where = `the vertices of ${shape}`;
        const intro = raw`Identical point charges $q$ ($q > 0$) are placed at ${where}, each a distance $R$ from the center.`;
        const Et = c => (c === 0 ? '0' : tf(c, 4, 'q', '\\pi\\epsilon_0 R^2'));
        const Vt = c => (c === 0 ? '0' : tf(c, 4, 'q', '\\pi\\epsilon_0 R'));
        if (mode === 'all') {
          const ch = (e, v) => `$E = ${e}$, $V = ${v}$`;
          return {
            q: raw`${intro} Taking $V = 0$ at infinity, what are the magnitude of the electric field $E$ and the potential $V$ at the center?`,
            ...GRE.mc(R, ch('0', Vt(N)), [ch('0', '0'), ch(Et(N), Vt(N)), ch(Et(N), '0'), ch('0', Vt(1)), ch('0', tf(N, 4, 'q', '\\pi\\epsilon_0 R^2'))]),
            expl: raw`By symmetry the vector fields of the ${N} charges cancel at the center, so $E = 0$. The potential is a scalar sum with no cancellation: $V = N\frac{q}{4\pi\epsilon_0 R} = ${Vt(N)}$.`,
            level: 1,
          };
        }
        if (mode === 'Vremove') {
          return {
            q: raw`${intro} One of the charges is then removed. Taking $V = 0$ at infinity, what is the potential at the center?`,
            ...GRE.mc(R, `$${Vt(N - 1)}$`, [`$${Vt(N)}$`, '$0$', `$${Vt(1)}$`, `$${Vt(N - 2)}$`, `$${tf(N - 1, 4, 'q', '\\pi\\epsilon_0 R^2')}$`]),
            expl: raw`Potential is a scalar: each remaining charge contributes $q/(4\pi\epsilon_0 R)$, so $V = ${Vt(N - 1)}$.`,
            level: 1,
          };
        }
        const flip = mode === 'flip';
        const c = flip ? 2 : 1;
        const towardT = flip ? 'toward the negative charge' : 'toward the empty vertex';
        const awayT = flip ? 'away from the negative charge' : 'away from the empty vertex';
        const ch = (k, toward) => (k === 0 ? 'zero' : `$${Et(k)}$, directed ${toward ? towardT : awayT}`);
        return {
          q: raw`${intro} ${flip ? 'One of the charges is then replaced by a charge $-q$.' : 'One of the charges is then removed.'} What is the electric field at the center?`,
          ...GRE.mc(R, ch(c, true), [ch(c, false), ch(N - 1, true), ch(0), ch(flip ? 1 : 2, true), ch(N - 1, false), ch(flip ? 4 : 1, false)]),
          expl: flip
            ? raw`Superposition: the new arrangement = the full symmetric set (zero field at the center) plus a charge $-2q$ at one vertex. That $-2q$ gives $\frac{2q}{4\pi\epsilon_0 R^2} = ${Et(2)}$, pointing toward it.`
            : raw`Superposition: the full symmetric set gives zero, so the remaining charges produce minus the field of the removed one. A $+q$ at that vertex would push away from the vertex, so the actual field has magnitude $${Et(1)}$ and points toward the empty vertex.`,
        };
      },
    },
    {
      id: 'em.config.null', sec: '2.1.4', level: 2,
      gen(R) {
        const [a, b] = R.pickN([1, 4, 9, 16, 25], 2);
        const same = R.bool();
        const s0 = R.sign();
        const ra = Math.sqrt(a), rb = Math.sqrt(b);
        let x;
        if (same) x = ra / (ra + rb);
        else x = b > a ? -ra / (rb - ra) : ra / (ra - rb);
        const xt = v => { const [n, d] = rat(v); const t = F.coef(n, d); return `$x = ${t === '-' ? '-' : t}d$`; };
        const vals = new Map();
        const add = v => { if (!isFinite(v) || Math.abs(v) < 1e-9 || Math.abs(v - 1) < 1e-9) return null; const t = xt(v); vals.set(t, v); return t; };
        const cands = [
          same ? (b > a ? -ra / (rb - ra) : ra / (ra - rb)) : ra / (ra + rb),
          a / (a + b), rb / (ra + rb), 1 / 2,
          same ? -ra / (ra + rb) : (b > a ? ra / (rb - ra) : -ra / (ra - rb)),
          same ? 1 + rb / (ra + rb) : (b > a ? 1 + ra / (rb - ra) : -rb / (ra - rb)),
          same ? b / (a + b) : (b > a ? -a / (b - a) : a / (a - b)),
          -1, 2, -1 / 2, 3 / 2, 1 / 4, 3 / 4, 1 / 3, 2 / 3, 3, -2,
        ];
        const qa = s0 * a, qb = s0 * (same ? b : -b);
        const qt = v => `${v < 0 ? '-' : '+'}${Math.abs(v) === 1 ? '' : Math.abs(v)}Q`;
        const ask = R.bool() ? 'At what position on the $x$-axis (other than at infinity) is the electric field zero?' : 'A third point charge is to be placed on the $x$-axis so that the net electrostatic force on it is zero. Where must it be placed?';
        return {
          q: raw`A point charge $${qt(qa)}$ is fixed at $x = 0$ and a point charge $${qt(qb)}$ is fixed at $x = d$. ${ask}`,
          ...GRE.mc(R, add(x), cands.map(add), { rank: s => vals.get(s) }),
          expl: same
            ? raw`For like charges the field can vanish only between them, where the two fields point in opposite directions: $\frac{${a}}{x^2} = \frac{${b}}{(d-x)^2}$ gives $\frac{d-x}{x} = ${fx(rb / ra)}$, so $x = ${fx(x)}d$ — closer to the smaller charge.`
            : raw`For unlike charges the field can vanish only outside the pair, on the side of the smaller-magnitude charge (between them both fields point the same way). Setting $\frac{${a}}{x^2} = \frac{${b}}{(x-d)^2}$ there gives $x = ${fx(x)}d$.`,
        };
      },
    },
    {
      id: 'em.config.square', sec: '2.1.4', level: 2,
      gen(R) {
        const mode = R.weighted(['E', 'V', 'F'], [4, 2, 1]);
        if (mode === 'F') {
          const base = raw`\dfrac{q^2}{4\pi\epsilon_0 a^2}`;
          const opts = [raw`\left(\sqrt{2} + \tfrac{1}{2}\right)`, raw`\tfrac{5}{2}\,`, raw`\sqrt{2}\,`, raw`\left(\sqrt{2} + 1\right)`, raw`3\,`, raw`\left(2 + \tfrac{\sqrt{2}}{2}\right)`].map(c => `$${c}${base}$`);
          return {
            q: raw`Four identical point charges $q$ are fixed at the corners of a square of side $a$. What is the magnitude of the net electrostatic force on any one of them?`,
            ...GRE.mc(R, opts[0], opts.slice(1)),
            expl: raw`With $k = 1/4\pi\epsilon_0$, the two adjacent charges each push with $kq^2/a^2$ along perpendicular sides, giving $\sqrt{2}\,kq^2/a^2$ along the diagonal; the opposite corner adds $kq^2/(\sqrt{2}a)^2 = \tfrac12 kq^2/a^2$ along the same diagonal. Total: $\left(\sqrt2 + \tfrac12\right)\frac{q^2}{4\pi\epsilon_0a^2}$. Adding magnitudes ($\tfrac52$) ignores the vector directions.`,
            level: 3,
          };
        }
        const s = Array.from({ length: 4 }, () => R.pick([1, -1, 2, -2, 3]));
        const U = [[1, 1], [-1, 1], [-1, -1], [1, -1]];
        const qs = s.map(v => `${v < 0 ? '-' : '+'}${Math.abs(v) === 1 ? '' : Math.abs(v)}q`);
        const intro = raw`Point charges $${qs.join('$, $')}$ are fixed, in that order, at the four corners of a square of side $a$ (going around the square).`;
        if (mode === 'V') {
          const sum = s.reduce((x, y) => x + y, 0);
          if (sum === 0) throw new Error('zero');
          const base = raw`\dfrac{q}{4\pi\epsilon_0 a}`;
          const t = c => `$${c === 0 ? '0' : cf(c) + base}$`;
          const wr = [sum, sum / Math.SQRT2, s.reduce((x, y) => x + Math.abs(y), 0) * Math.SQRT2, 0, 2 * sum, -sum * Math.SQRT2].map(t);
          return {
            q: raw`${intro} Taking $V = 0$ at infinity, what is the electric potential at the center of the square?`,
            ...GRE.mc(R, t(sum * Math.SQRT2), wr),
            expl: raw`Each corner is $a/\sqrt2$ from the center, so $V = \frac{\sqrt2}{4\pi\epsilon_0 a}\sum q_i = ${t(sum * Math.SQRT2).slice(1, -1)}$. Potentials add as signed scalars.`,
            level: 1,
          };
        }
        const Sx = s.reduce((acc, v, i) => acc + v * U[i][0], 0), Sy = s.reduce((acc, v, i) => acc + v * U[i][1], 0);
        const c = Math.sqrt(2 * (Sx * Sx + Sy * Sy));
        const base = raw`\dfrac{q}{4\pi\epsilon_0 a^2}`;
        const t = x => `$${x < 1e-9 ? '0' : cf(x) + base}$`;
        const scal = 2 * s.reduce((x, y) => x + Math.abs(y), 0);
        const wr = [c / 2, scal, c * Math.SQRT2, c / Math.SQRT2, 0, scal / 2, 2 * c, scal / Math.SQRT2, Math.SQRT2, 2 * Math.SQRT2, 4].filter(x => Math.abs(x - c) > 1e-9).map(t);
        return {
          q: raw`${intro} What is the magnitude of the electric field at the center of the square?`,
          ...GRE.mc(R, t(c), wr),
          expl: raw`Each corner is $a/\sqrt2$ away, so a charge $nq$ there contributes $\frac{2|n|q}{4\pi\epsilon_0 a^2}$ along its diagonal (away from it if positive). Charges on opposite corners act along the same diagonal; net along the two diagonals: $${Math.abs(s[0] - s[2]) * 2}$ and $${Math.abs(s[1] - s[3]) * 2}$ (units of $q/4\pi\epsilon_0a^2$), which are perpendicular, so $E = \sqrt{${(s[0] - s[2]) ** 2 * 4} + ${(s[1] - s[3]) ** 2 * 4}}\;${base} = ${t(c).slice(1, -1)}$.`,
        };
      },
    },
    {
      id: 'em.config.contact', sec: '2.1.4', level: 2,
      gen(R) {
        const mode = R.weighted(['touch', 'third', 'move'], [3, 2, 2]);
        const a = R.pick([1, 2, 3, 4, 5, 6]) * R.sign(), b = R.pick([1, 2, 3, 4, 5, 6]) * R.sign();
        if (a === b) throw new Error('same charge');
        const qt = v => `${v < 0 ? '-' : '+'}${Math.abs(v) === 1 ? '' : Math.abs(v)}q`;
        const nat0 = a * b < 0 ? 'attractive' : 'repulsive';
        const opp = n => (n === 'attractive' ? 'repulsive' : 'attractive');
        const lab = (x, nat) => (x < 1e-12 ? 'zero' : `$${fx(x) === '1' ? '' : fx(x)}F$, ${nat}`);
        const qc = x => `${x === 1 ? '' : x === -1 ? '-' : fx(x)}q`;
        if (mode === 'third') {
          const qA = a / 2, qB = (b + a / 2) / 2;
          const prod = qA * qB;
          if (Math.abs(prod) < 1e-12) throw new Error('zero');
          const ratio = Math.abs(prod / (a * b));
          const nat = prod > 0 ? 'repulsive' : 'attractive';
          const wr = [lab(ratio, opp(nat)), lab(1 / 4, nat), lab(((a + b) / 2) ** 2 / Math.abs(a * b), 'repulsive'), lab(1 / 2, nat), lab(Math.abs((a / 2) * (b + a) / 2 / (a * b)), nat), lab(1, nat0), lab(2 * ratio, nat), lab(ratio / 2, nat), lab(1 / 4, opp(nat))];
          return {
            q: raw`Two identical small conducting spheres A and B carry charges $${qt(a)}$ and $${qt(b)}$ and exert an electrostatic force of magnitude $F$ on each other. A third identical sphere C, initially uncharged, is touched first to A, then to B, and is then removed. With A and B at their original separation, the force between them is now`,
            ...GRE.mc(R, lab(ratio, nat), wr),
            expl: raw`Identical spheres in contact share charge equally. After touching A: $q_A = ${qc(qA)}$. Then C (carrying $${qc(qA)}$) touches B: $q_B = \tfrac12\left(${qc(b)} ${qA < 0 ? '-' : '+'} ${qc(Math.abs(qA))}\right) = ${qc(qB)}$. The force scales as $|q_Aq_B|$, originally $${Math.abs(a * b)}q^2$ and now $${fx(Math.abs(prod))}q^2$: $F' = ${fx(ratio)}F$, ${nat}.`,
            level: 3,
          };
        }
        const sum = a + b;
        if (sum === 0) throw new Error('neutral');
        const fac = mode === 'move' ? R.pick([[1, 2, 4], [2, 1, 1 / 4], [1, 3, 9], [3, 1, 1 / 9]]) : [1, 1, 1];
        const ratio = (sum / 2) ** 2 / Math.abs(a * b) * fac[2];
        const sepT = mode === 'move' ? (fac[0] === 1 ? `$r/${fac[1]}$` : `$${fac[0]}r$`) : 'their original separation $r$';
        const wr = [lab(ratio, 'attractive'), lab(sum * sum / Math.abs(a * b) * fac[2], 'repulsive'), lab(fac[2], nat0), lab((sum / 2) ** 2 / Math.abs(a * b), 'repulsive'), lab((Math.abs(a) + Math.abs(b)) ** 2 / 4 / Math.abs(a * b) * fac[2], 'repulsive'), lab(ratio / 2, 'repulsive'), lab(2 * ratio, 'repulsive'), lab(fac[2], opp(nat0))];
        return {
          q: raw`Two identical small conducting spheres carry charges $${qt(a)}$ and $${qt(b)}$. When they are a distance $r$ apart, the electrostatic force between them has magnitude $F$. The spheres are touched together and then placed ${mode === 'move' ? 'a distance ' : 'back at '}${sepT}${mode === 'move' ? ' apart' : ''}. What is the force between them now?`,
          ...GRE.mc(R, lab(ratio, 'repulsive'), wr),
          expl: raw`On contact the total charge $${qc(sum)}$ is shared equally: each sphere ends with $${qc(sum / 2)}$, so the force becomes repulsive. Originally $F \propto ${Math.abs(a * b)}q^2/r^2$ (${nat0}); now $F' \propto ${fx((sum / 2) ** 2)}q^2/r'^2$${mode === 'move' ? `, with $r' = ${fac[0] === 1 ? 'r/' + fac[1] : fac[0] + 'r'}$` : ''}. Hence $F' = ${fx(ratio)}F$, repulsive.`,
        };
      },
    },
    {
      id: 'em.config.ring', sec: '2.1.4', level: 2,
      gen(R) {
        const mode = R.weighted(['Esym', 'num', 'max', 'disk'], [2, 3, 1, 1]);
        if (mode === 'Esym') {
          const lam = R.bool(0.35);
          const corr = lam ? raw`$\dfrac{\lambda R z}{2\epsilon_0 (z^2+R^2)^{3/2}}$` : raw`$\dfrac{Qz}{4\pi\epsilon_0 (z^2+R^2)^{3/2}}$`;
          const wr = lam
            ? [raw`$\dfrac{\lambda R}{2\epsilon_0 (z^2+R^2)}$`, raw`$\dfrac{\lambda R^2}{2\epsilon_0 (z^2+R^2)^{3/2}}$`, raw`$\dfrac{\lambda z}{2\epsilon_0 (z^2+R^2)}$`, raw`$\dfrac{\lambda R}{2\epsilon_0\sqrt{z^2+R^2}}$`, raw`$\dfrac{\lambda R z}{4\pi\epsilon_0 (z^2+R^2)^{3/2}}$`]
            : [raw`$\dfrac{Q}{4\pi\epsilon_0 (z^2+R^2)}$`, raw`$\dfrac{QR}{4\pi\epsilon_0 (z^2+R^2)^{3/2}}$`, raw`$\dfrac{Qz}{4\pi\epsilon_0 (z^2+R^2)}$`, raw`$\dfrac{Q}{4\pi\epsilon_0\sqrt{z^2+R^2}}$`, raw`$\dfrac{Q}{4\pi\epsilon_0 z^2}$`];
          return {
            q: raw`A thin ring of radius $R$ carries ${lam ? 'a uniform linear charge density $\\lambda$' : 'total charge $Q$ distributed uniformly'}. What is the magnitude of the electric field at a point on the ring's axis, a distance $z$ from its center?`,
            ...GRE.mc(R, corr, wr),
            expl: raw`Every element is $\sqrt{z^2+R^2}$ away; the components perpendicular to the axis cancel and the axial components add with a factor $\cos\theta = z/\sqrt{z^2+R^2}$: $E = \frac{Qz}{4\pi\epsilon_0(z^2+R^2)^{3/2}}$${lam ? raw` with $Q = 2\pi R\lambda$` : ''}. Checks: $E = 0$ at the center and $E \to Q/4\pi\epsilon_0 z^2$ for $z \gg R$.`,
          };
        }
        if (mode === 'num') {
          const [p, q, h] = R.pick([[3, 4, 5], [4, 3, 5], [5, 12, 13], [12, 5, 13], [6, 8, 10], [8, 6, 10]]);
          const u = R.pick([1, 2]);
          const Rr = p * u / 100, z = q * u / 100, d = h * u / 100;
          const Q = R.pick([1, 2, 3, 4, 5, 6, 8, 10]) * 1e-9;
          const askV = R.bool();
          const V = K * Q / d, E = K * Q * z / d ** 3;
          return {
            q: raw`A thin ring of radius $${p * u}\,\text{cm}$ carries a charge of $${F.num(Q * 1e9)}\,\text{nC}$ spread uniformly around it. What is the ${askV ? 'electric potential (relative to infinity)' : 'magnitude of the electric field'} at a point on the ring's axis $${q * u}\,\text{cm}$ from its center? (Use $${K_T}$.)`,
            ...(askV
              ? GRE.numeric(R, V, [K * Q / z, K * Q / Rr, K * Q / (Rr + z), K * Q * z / d ** 2], { unit: raw`\text{V}` })
              : GRE.numeric(R, E, [K * Q / z ** 2, K * Q / d ** 2, K * Q * Rr / d ** 3, K * Q / Rr ** 2], { unit: raw`\text{N/C}` })),
            expl: askV
              ? raw`All of the charge is the same distance $\sqrt{R^2+z^2} = ${h * u}\,\text{cm}$ from the point, so $V = \frac{Q}{4\pi\epsilon_0\sqrt{R^2+z^2}} = ${F.num(V)}\,\text{V}$.`
              : raw`$E = \frac{Qz}{4\pi\epsilon_0(R^2+z^2)^{3/2}}$ with $\sqrt{R^2+z^2} = ${h * u}\,\text{cm}$: $E = ${F.num(E)}\,\text{N/C}$. Only the axial components survive, hence the factor $z/\sqrt{R^2+z^2}$.`,
          };
        }
        if (mode === 'max') {
          const opts = [raw`$z = \dfrac{R}{\sqrt{2}}$`, raw`$z = 0$`, raw`$z = R$`, raw`$z = \dfrac{R}{2}$`, raw`$z = \sqrt{2}\,R$`, raw`$z = \dfrac{R}{\sqrt{3}}$`, raw`$z = 2R$`];
          return {
            q: raw`A thin ring of radius $R$ carries a uniformly distributed charge. At what distance $z$ from the center, along the axis, is the magnitude of the electric field greatest?`,
            ...GRE.mc(R, opts[0], opts.slice(1)),
            expl: raw`$E(z) \propto z/(z^2+R^2)^{3/2}$, which is zero at the center and falls as $1/z^2$ far away. Setting $dE/dz = 0$: $(z^2+R^2) - 3z^2 = 0$, so $z = R/\sqrt2$.`,
            level: 3,
          };
        }
        const corr = raw`$\dfrac{\sigma}{2\epsilon_0}\left(\sqrt{z^2+R^2} - z\right)$`;
        return {
          q: raw`A thin disk of radius $R$ carries uniform surface charge density $\sigma$. Taking $V = 0$ at infinity, what is the potential at a point on the axis a distance $z > 0$ from the center of the disk?`,
          ...GRE.mc(R, corr, [raw`$\dfrac{\sigma}{2\epsilon_0}\left(\sqrt{z^2+R^2} + z\right)$`, raw`$\dfrac{\sigma}{4\epsilon_0}\left(\sqrt{z^2+R^2} - z\right)$`, raw`$\dfrac{\sigma}{2\epsilon_0}\sqrt{z^2+R^2}$`, raw`$\dfrac{\sigma R^2}{2\epsilon_0\sqrt{z^2+R^2}}$`, raw`$\dfrac{\sigma}{2\epsilon_0}\left(1 - \dfrac{z}{\sqrt{z^2+R^2}}\right)$`]),
          expl: raw`Sum rings: $V = \int_0^R \frac{\sigma\,2\pi s\,ds}{4\pi\epsilon_0\sqrt{s^2+z^2}} = \frac{\sigma}{2\epsilon_0}\left(\sqrt{z^2+R^2} - z\right)$. Check: for $z \gg R$ this becomes $\frac{\sigma R^2}{4\epsilon_0 z} = \frac{Q}{4\pi\epsilon_0 z}$. (The last choice is the field, not the potential.)`,
          level: 3,
        };
      },
    },
    {
      id: 'em.config.shells', sec: '2.1.4', level: 2,
      gen(R) {
        const rr = R.pick([[1, 2, 3], [1, 2, 4], [1, 3, 4], [2, 3, 4], [1, 3, 5]]);
        const m = rr.map(() => R.pick([1, 2, 3]) * R.sign());
        const mt = v => `${v < 0 ? '-' : ''}${Math.abs(v) === 1 ? '' : Math.abs(v)}Q`;
        const rt = v => `${v === 1 ? '' : v}a`;
        const intro = raw`Three thin concentric spherical shells of radii $${rt(rr[0])}$, $${rt(rr[1])}$, and $${rt(rr[2])}$ carry charges $${m.map(mt).join('$, $')}$, respectively, each distributed uniformly.`;
        if (R.bool(0.4)) {
          const reg = R.int(1, 3); // r between shell reg-1 and reg (3 => outside all)
          const enc = m.slice(0, reg).reduce((x, y) => x + y, 0);
          const tot = m.reduce((x, y) => x + y, 0);
          const lo = rt(rr[reg - 1]), hi = reg < 3 ? rt(rr[reg]) : null;
          const t = c => `$${c === 0 ? '0' : tf(c, 4, 'Q', '\\pi\\epsilon_0 r^2')}$`;
          const wr = [t(tot), t(m[reg - 1]), t(reg < 3 ? enc + m[reg] : enc - m[0]), t(-enc), t(enc * 2), t(m.reduce((x, y) => x + Math.abs(y), 0)), t(tot - enc), t(enc + 1), t(enc - 1)];
          return {
            q: raw`${intro} What is the radial component $E_r$ of the electric field at a distance $r$ from the center, where $${hi ? `${lo} < r < ${hi}` : `r > ${lo}`}$?`,
            ...GRE.mc(R, t(enc), wr),
            expl: raw`Gauss's law with a sphere of radius $r$: only the charge inside counts, $Q_{\text{enc}} = ${mt(enc) === 'Q' ? 'Q' : enc === 0 ? '0' : mt(enc)}$. Shells outside $r$ produce no field inside them. So $E_r = ${t(enc).slice(1, -1)}$.`,
            level: 1,
          };
        }
        const at = R.pick(['center', 'middle']);
        // potential: sum m_i / max(r, r_i)
        const r0 = at === 'center' ? 0 : rr[1];
        const Vc = m.reduce((s, mi, i) => s + mi / Math.max(r0, rr[i]), 0);
        if (Math.abs(Vc) < 1e-12) throw new Error('zero V');
        const tt = x => { if (Math.abs(x) < 1e-12) return '$0$'; const [n, d] = rat(x); return `$${tf(n, 4 * d, 'Q', '\\pi\\epsilon_0 a')}$`; };
        const tot = m.reduce((x, y) => x + y, 0);
        const wr = at === 'center'
          ? [0, m[0] / rr[0], tot / rr[2], tot / rr[0], m.reduce((s, mi, i) => s + Math.abs(mi) / rr[i], 0), m[0] / rr[0] + m[1] / rr[1], -Vc]
          : [(m[0] + m[1]) / rr[1], m[1] / rr[1] + m[2] / rr[2], m[0] / rr[0] + m[1] / rr[1] + m[2] / rr[2], tot / rr[1], (m[0] + m[1]) / rr[1] - m[2] / rr[2], 0, -Vc, m[2] / rr[2]];
        return {
          q: raw`${intro} Taking $V = 0$ at infinity, what is the electric potential ${at === 'center' ? 'at the common center' : `on the middle shell (at $r = ${rt(rr[1])}$)`}?`,
          ...GRE.mc(R, tt(Vc), wr.filter(x => Math.abs(x - Vc) > 1e-12).map(tt)),
          expl: raw`A uniform shell of charge $q_i$ and radius $R_i$ gives potential $\frac{q_i}{4\pi\epsilon_0 R_i}$ everywhere inside it and $\frac{q_i}{4\pi\epsilon_0 r}$ outside. So $V = \frac{Q}{4\pi\epsilon_0 a}\left(${m.map((mi, i) => `${mi < 0 ? '-' : '+'}\\frac{${Math.abs(mi)}}{${Math.max(r0, rr[i])}}`).join(' ').replace(/^\+/, '')}\right) = ${tt(Vc).slice(1, -1)}$. ${at === 'center' ? 'Although $E = 0$ at the center, $V$ is not zero.' : ''}`,
        };
      },
    },
  ]);
  // ===================================================================== 2.1 ELECTROSTATICS (part 2)
  GRE.addTemplates('em', [
    // ------------------------------------------------------------- 2.1.5 Boundary conditions
    {
      id: 'em.bc.sigma', sec: '2.1.5', level: 2,
      gen(R) {
        const mode = R.weighted(['sigma', 'below', 'which'], [3, 3, 2]);
        const show = v => `$(${vec(v)})\\,\\text{V/m}$`;
        if (mode === 'sigma') {
          const Ex = R.pick([0, 100, 200, 300, 400, 500, 600, 800]) * R.sign();
          const L = [200, 300, 400, 500, 600, 800, 1000, 1200, 1500, 2000, 2500, 3000, 4000, 5000];
          const E1 = R.pick(L) * R.sign(), E2 = R.pick(L) * R.sign();
          if (E1 === E2) throw new Error('no jump');
          const sig = EPS * (E1 - E2) * 1e9; // nC/m^2
          return {
            q: raw`The $xy$-plane carries a surface charge density $\sigma$ (there are other charges elsewhere). Just above the plane ($z = 0^+$) the electric field is ${show([Ex, 0, E1])}; just below it ($z = 0^-$) the field is ${show([Ex, 0, E2])}. What is $\sigma$? (Take $${EPS_T}$.)`,
            ...GRE.numeric(R, sig, [-sig, EPS * (Math.abs(E1) - Math.abs(E2)) * 1e9, sig / 2, 2 * sig, EPS * (E1 + E2) * 1e9], { unit: raw`\text{nC/m}^2`, allowSign: true, fmt: x => F.num(x, 3) }),
            expl: raw`Gauss's law on a thin pillbox gives $E^{\perp}_{\text{above}} - E^{\perp}_{\text{below}} = \sigma/\epsilon_0$, with signed normal components along $+\hat{\mathbf{z}}$: $\sigma = \epsilon_0(${E1} - (${E2}))\,\text{V/m} = ${F.num(sig, 3)}\,\text{nC/m}^2$. The tangential component is continuous and plays no role. Using magnitudes instead of signed components is the trap.`,
          };
        }
        if (mode === 'below') {
          const [p, qq, h] = R.pick([[3, 4, 5], [4, 3, 5], [5, 12, 13], [12, 5, 13], [8, 6, 10], [6, 8, 10]]);
          const u = R.pick([100, 200, 500]);
          const Ex = p * u * R.sign(), Ez2 = qq * u * R.sign();
          const S = R.pick([1000, 2000, 3000, 4000, 5000]);
          const Ez1 = Ez2 + S;
          if (Ez1 === 0) throw new Error('degenerate');
          const sigma = EPS * S * 1e9;
          const mag = h * u;
          return {
            q: raw`The plane $z = 0$ carries a uniform surface charge density $\sigma = ${F.num(sigma, 3)}\,\text{nC/m}^2$ (other charges are present elsewhere). Just above the plane the electric field is ${show([Ex, 0, Ez1])}. What is the magnitude of the electric field just below the plane? (Take $${EPS_T}$.)`,
            ...GRE.numeric(R, mag, [Math.hypot(Ex, Ez1 + S), Math.abs(Ez1 - S), Math.hypot(Ex, Ez1 - S / 2), Math.hypot(Ex, Ez1), Math.hypot(Ex, Ez1 + S / 2)], { unit: raw`\text{V/m}`, fmt: x => F.num(x, 3), tol: 0.06 }),
            expl: raw`The tangential component is continuous, $E_x = ${Ex}\,\text{V/m}$. The normal component jumps by $\sigma/\epsilon_0 = ${S}\,\text{V/m}$: $E_z^{\text{below}} = E_z^{\text{above}} - \sigma/\epsilon_0 = ${Ez1} - ${S} = ${Ez2}\,\text{V/m}$. So $|\mathbf{E}| = \sqrt{(${Ex})^2 + (${Ez2})^2} = ${mag}\,\text{V/m}$.`,
          };
        }
        const a = R.pick([100, 200, 300, 400, 500]) * R.sign(), b = R.pick([0, 100, 200, 300]) * R.sign(), c = R.pick([200, 400, 600, 800, 1000]) * R.sign();
        const c2 = c + R.pick([-1500, -1000, -800, -500, 500, 700, 1200]);
        const corr = show([a, b, c2]);
        const wr = [[a, b + R.pick([100, 200]), c], [-a, -b, c], [a + R.pick([100, 300]), b, c2], [0, 0, c2], [a, -b === b ? b + 300 : -b, c2], [2 * a, b, c]].map(show);
        return {
          q: raw`Just above a surface carrying some surface charge density (in vacuum), the electrostatic field is ${show([a, b, c])}, where the surface is the plane $z = 0$. Which of the following could be the electric field just below the surface?`,
          ...GRE.mc(R, corr, wr),
          expl: raw`Across any charged surface, $\oint\mathbf{E}\cdot d\mathbf{l} = 0$ forces the tangential components ($E_x$, $E_y$) to be continuous, while the normal component $E_z$ may jump by $\sigma/\epsilon_0$. Only ${corr} keeps $E_x = ${a}$ and $E_y = ${b}$ (here $\sigma = \epsilon_0(${c} - (${c2}))\,\text{V/m}$).`,
        };
      },
    },
    {
      id: 'em.bc.kink', sec: '2.1.5', level: 3,
      gen(R) {
        const d1 = R.pick([1, 2, 4, 5]), d2 = R.pick([1, 2, 3, 4, 5]);
        const VV = [-200, -150, -100, -50, 0, 50, 100, 150, 200, 300, 400];
        const [V0, V1, V2] = [R.pick(VV), R.pick(VV), R.pick(VV)];
        if (V0 === V1 || V1 === V2) throw new Error('flat segment');
        const s1 = (V1 - V0) / (d1 * 1e-3), s2 = (V2 - V1) / (d2 * 1e-3);
        const at = R.pick([0, 1, 2]);
        const sl = [0, s1, s2, 0];                       // slope on each side of the planes x0, x1, x2
        const sig = -EPS * (sl[at + 1] - sl[at]) * 1e6; // muC/m^2, sigma = eps0 (E_right - E_left), E = -dV/dx
        if (Math.abs(sig) < 1e-12) throw new Error('no charge');
        const xs = ['0', `${d1}\\,\\text{mm}`, `${d1 + d2}\\,\\text{mm}`];
        const El = -sl[at], Er = -sl[at + 1];
        const wrong = [-sig, -EPS * (sl[at + 1]) * 1e6, EPS * (sl[at]) * 1e6, sig / 2, 2 * sig, -EPS * (sl[at + 1] + sl[at]) * 1e6];
        return {
          q: raw`In a certain region the electrostatic potential depends only on $x$. It equals $${V0}\,\text{V}$ for $x \le 0$, varies linearly from $${V0}\,\text{V}$ at $x = 0$ to $${V1}\,\text{V}$ at $x = ${d1}\,\text{mm}$, then varies linearly to $${V2}\,\text{V}$ at $x = ${d1 + d2}\,\text{mm}$, and equals $${V2}\,\text{V}$ for $x \ge ${d1 + d2}\,\text{mm}$. What is the surface charge density on the plane $x = ${xs[at]}$? (Take $${EPS_T}$.)`,
          ...GRE.numeric(R, sig, wrong, { unit: raw`\mu\text{C/m}^2`, allowSign: true, fmt: x => F.num(x, 2) }),
          expl: raw`$E_x = -dV/dx$ is piecewise constant: just left of $x = ${xs[at]}$, $E_x = ${F.num(El, 3)}\,\text{V/m}$; just right, $E_x = ${F.num(Er, 3)}\,\text{V/m}$. The kink in $V$ is a sheet of charge with $\sigma = \epsilon_0(E_{\text{right}} - E_{\text{left}}) = ${F.num(sig, 2)}\,\mu\text{C/m}^2$. (Where $V$ is linear, $\nabla^2 V = 0$ and there is no volume charge.)`,
        };
      },
    },
    {
      id: 'em.bc.roman', sec: '2.1.5', level: 2,
      gen(R) {
        const TRUE = [
          'The electric potential $V$ is continuous across the surface.',
          'The components of $\\mathbf{E}$ parallel to the surface are continuous.',
          'The component of $\\mathbf{E}$ normal to the surface changes by $\\sigma/\\epsilon_0$.',
          'The normal derivative $\\partial V/\\partial n$ changes by $\\sigma/\\epsilon_0$ in magnitude.',
          'The line integral of $\\mathbf{E}$ around a thin rectangular loop straddling the surface is zero.',
        ];
        const FALSE = [
          'The component of $\\mathbf{E}$ normal to the surface is continuous.',
          'The components of $\\mathbf{E}$ parallel to the surface change by $\\sigma/\\epsilon_0$.',
          'The electric potential changes abruptly by $\\sigma/\\epsilon_0$ across the surface.',
          'The component of $\\mathbf{E}$ normal to the surface changes by $\\sigma/2\\epsilon_0$.',
          'All components of $\\mathbf{E}$ are continuous, since the surface has zero thickness.',
        ];
        const nT = R.int(1, 3);
        const st = R.shuffle(R.pickN(TRUE, nT).map(s => [s, true]).concat(R.pickN(FALSE, 3 - nT).map(s => [s, false])));
        return {
          q: GRE.romanStem('A surface in vacuum carries a nonzero surface charge density $\\sigma$. Which of the following statements about the electrostatic field and potential on the two sides of the surface (immediately adjacent to it) is (are) true?', st.map(s => s[0])),
          ...GRE.roman(R, st.map(s => s[1])),
          expl: raw`A Gaussian pillbox gives $E^\perp_{\text{above}} - E^\perp_{\text{below}} = \sigma/\epsilon_0$; a thin loop with $\oint\mathbf{E}\cdot d\mathbf{l} = 0$ gives $\mathbf{E}^\parallel_{\text{above}} = \mathbf{E}^\parallel_{\text{below}}$. $V$ is continuous (a finite field over zero distance gives no jump), while its normal derivative $-E^\perp$ jumps by $\sigma/\epsilon_0$. (The $\sigma/2\epsilon_0$ is the field of an isolated sheet on each side, not the jump.) ` +
            st.map((s, i) => `${['I', 'II', 'III'][i]}: ${s[1] ? 'true' : 'false'}.`).join(' '),
        };
      },
    },

    // ------------------------------------------------------------- 2.1.6 Conductors
    {
      id: 'em.cond.shell', sec: '2.1.6', level: 2, weight: 2,
      gen(R) {
        const mode = R.weighted(['charges', 'E', 'V', 'ground'], [3, 2, 2, 1]);
        const q = R.pick([1, 2, 3, 4, 5, 6]) * R.sign();
        const Qs = R.pick([0, 1, 2, 3, 4, 5, 6, 8]) * R.sign();
        const a = R.pick([2, 3, 4, 5, 6]), b = a + R.pick([1, 2, 3, 4]);
        const uC = '\\mu\\text{C}';
        const offc = mode === 'charges' && R.bool(0.4);
        const intro = raw`A point charge of $${pc(q, uC)}$ is placed ${offc ? 'off-center inside the cavity' : 'at the center'} of a thick spherical conducting shell with inner radius $${a}\,\text{cm}$ and outer radius $${b}\,\text{cm}$. The shell ${Qs === 0 ? 'is electrically neutral' : `carries a net charge of $${pc(Qs, uC)}$`}.`;
        const ch = (i, o) => `inner surface: $${i === 0 ? '0' : pc(i, uC)}$; outer surface: $${o === 0 ? '0' : pc(o, uC)}$`;
        if (mode === 'charges') {
          return {
            q: raw`${intro} In electrostatic equilibrium, what are the total charges on the inner and outer surfaces of the shell?`,
            ...GRE.mc(R, ch(-q, q + Qs), [ch(0, Qs), ch(-q, Qs), ch(q, Qs - q), ch(-q, Qs - q), ch(Qs, q), ch(-q, q), ch(0, q + Qs)]),
            expl: raw`$\mathbf{E} = 0$ inside the metal, so a Gaussian surface within the metal encloses zero net charge: the inner surface carries $${pc(-q, uC)}$${offc ? ' (nonuniformly, since the charge is off-center)' : ''}. Charge conservation puts the rest, $${Qs === 0 ? '0' : pc(Qs, uC)} - (${pc(-q, uC)}) = ${q + Qs === 0 ? '0' : pc(q + Qs, uC)}$, on the outer surface${offc ? ', uniformly — the metal shields the outside from the charge’s position' : ''}.`,
          };
        }
        if (mode === 'ground') {
          const ask = R.bool();
          return {
            q: raw`${intro} The shell is then connected to ground. ${ask ? 'What are the charges on its inner and outer surfaces now?' : 'What is the magnitude of the electric field at a point outside the shell, a distance $r > ' + b + '\\,\\text{cm}$ from the center?'}`,
            ...(ask
              ? GRE.mc(R, ch(-q, 0), [ch(0, 0), ch(-q, q + Qs), ch(-q, Qs), ch(0, -q), ch(-q, -q)])
              : GRE.mc(R, '$0$', ['$\\dfrac{' + Math.abs(q) + '\\,\\mu\\text{C}}{4\\pi\\epsilon_0 r^2}$', `$\\dfrac{${Math.abs(q + Qs) || Math.abs(q) + 1}\\,\\mu\\text{C}}{4\\pi\\epsilon_0 r^2}$`, `$\\dfrac{${Math.abs(Qs) || 2 * Math.abs(q)}\\,\\mu\\text{C}}{4\\pi\\epsilon_0 r^2}$`, `$\\dfrac{${Math.abs(q)}\\,\\mu\\text{C}}{4\\pi\\epsilon_0 (${b}\\,\\text{cm})^2}$`, `$\\dfrac{${2 * Math.abs(q)}\\,\\mu\\text{C}}{4\\pi\\epsilon_0 r^2}$`])),
            expl: raw`Grounding fixes the shell at $V = 0$, the same as infinity. The inner surface must still carry $${pc(-q, uC)}$ to cancel the field inside the metal, and the outer surface charge flows away to ground, leaving $0$. The total enclosed charge for $r > ${b}\,\text{cm}$ is then zero, so $E = 0$ outside.`,
          };
        }
        if (mode === 'E') {
          const out = R.bool(0.55);
          if (out && q + Qs === 0) throw new Error('zero field');
          const r = out ? b + R.pick([1, 2, 3, 4, 6]) : R.pick([1, 2, 3, 4, 5].filter(x => x < a));
          const rm = r / 100;
          const E = out ? K * Math.abs(q + Qs) * 1e-6 / rm ** 2 : K * Math.abs(q) * 1e-6 / rm ** 2;
          const wr = out
            ? [K * Math.abs(Qs || 2 * q) * 1e-6 / rm ** 2, K * Math.abs(q) * 1e-6 / rm ** 2, K * Math.abs(q + Qs) * 1e-6 / (b / 100) ** 2, K * Math.abs(q - Qs || 3 * q) * 1e-6 / rm ** 2]
            : [K * Math.abs(q + Qs || 3 * q) * 1e-6 / rm ** 2, K * Math.abs(q) * 1e-6 / (a / 100) ** 2, K * Math.abs(q) * 1e-6 / rm, K * Math.abs(Qs || 2 * q) * 1e-6 / rm ** 2];
          return {
            q: raw`${intro} What is the magnitude of the electric field at a distance of $${r}\,\text{cm}$ from the center? (Use $${K_T}$.)`,
            ...GRE.numeric(R, E, wr, { unit: raw`\text{N/C}` }),
            expl: out
              ? raw`Outside the shell, Gauss's law sees the total enclosed charge $${pc(q, uC)} ${Qs < 0 ? '-' : '+'} ${Math.abs(Qs)}\,\mu\text{C} = ${pc(q + Qs, uC)}$: $E = \frac{|Q_{\text{tot}}|}{4\pi\epsilon_0 r^2} = ${F.num(E)}\,\text{N/C}$.`
              : raw`Inside the cavity only the point charge is enclosed (the induced charge sits on the cavity wall, outside the Gaussian sphere, and the shell's own charge is farther out): $E = \frac{|q|}{4\pi\epsilon_0 r^2} = ${F.num(E)}\,\text{N/C}$.`,
          };
        }
        if (q + Qs === 0) throw new Error('zero V');
        const V = K * (q + Qs) * 1e-6 / (b / 100);
        return {
          q: raw`${intro} Taking $V = 0$ at infinity, what is the electric potential of the shell? (Use $${K_T}$.)`,
          ...GRE.numeric(R, V, [K * (q + Qs) * 1e-6 / (a / 100), K * (Qs || 2 * q) * 1e-6 / (b / 100), K * q * 1e-6 / (b / 100), -V, K * (q + Qs) * 1e-6 / ((b - a) / 100)], { unit: raw`\text{V}`, allowSign: true }),
          expl: raw`Outside, the field is that of the total charge $${pc(q + Qs, uC)}$ at the center, so $V(r) = \frac{Q_{\text{tot}}}{4\pi\epsilon_0 r}$ for $r \ge ${b}\,\text{cm}$. The whole conductor is at the potential of its outer surface: $V = \frac{Q_{\text{tot}}}{4\pi\epsilon_0 (${F.num(b / 100)}\,\text{m})} = ${F.num(V)}\,\text{V}$.`,
        };
      },
    },
    {
      id: 'em.cond.surface', sec: '2.1.6', level: 2, weight: 2,
      gen(R) {
        const mode = R.weighted(['spheres', 'Vsphere', 'breakdown', 'sigmaE'], [4, 2, 1, 2]);
        if (mode === 'spheres') {
          const [a, b] = R.pickN([1, 2, 3, 4, 5, 6, 8, 10, 12], 2);
          const what = R.pick(['Q', 'sigma', 'E', 'V', 'Qfrac']);
          const ex = x => { const e = fx(x); return e == null ? null : `$${e}$`; };
          const pool = [a / b, b / a, (a / b) ** 2, (b / a) ** 2, 1, Math.sqrt(a / b)];
          const corr = { Q: a / b, sigma: b / a, E: b / a, V: 1 }[what];
          const lab = { Q: 'the ratio $Q_1/Q_2$ of their charges', sigma: 'the ratio $\\sigma_1/\\sigma_2$ of their surface charge densities', E: 'the ratio $E_1/E_2$ of the electric field magnitudes just outside their surfaces', V: 'the ratio $V_1/V_2$ of their potentials' }[what];
          const intro = raw`Two conducting spheres, sphere 1 of radius $${a}\,\text{cm}$ and sphere 2 of radius $${b}\,\text{cm}$, are very far apart and connected by a long thin conducting wire. A total charge $Q$ is placed on the system.`;
          if (what === 'Qfrac') {
            const t = x => `$${fx(x) === '1' ? '' : fx(x)}Q$`;
            return {
              q: raw`${intro} In equilibrium, how much charge is on sphere 1?`,
              ...GRE.mc(R, t(a / (a + b)), [t(b / (a + b)), t(1 / 2), t(a * a / (a * a + b * b)), t(b * b / (a * a + b * b)), t(1)]),
              expl: raw`The spheres reach a common potential: $\frac{Q_1}{4\pi\epsilon_0 R_1} = \frac{Q_2}{4\pi\epsilon_0 R_2}$, so $Q_1/Q_2 = R_1/R_2$ and $Q_1 = Q\frac{R_1}{R_1 + R_2} = ${t(a / (a + b)).slice(1, -1)}$.`,
            };
          }
          return {
            q: raw`${intro} In equilibrium, what is ${lab}?`,
            ...mcv(R, corr, pool, ex),
            expl: raw`Connected conductors share one potential: $\frac{Q_1}{R_1} = \frac{Q_2}{R_2}$, so $Q \propto R$. Then $\sigma = Q/4\pi R^2 \propto 1/R$ and the surface field $E = \sigma/\epsilon_0 \propto 1/R$ — the smaller sphere has the larger field (why charge concentrates at sharp points). Here the answer is $${fx(corr)}$.`,
          };
        }
        if (mode === 'Vsphere') {
          const V = R.pick([1, 2, 3, 5, 10, 20, 50, 100]) * 1e3, Rc = R.pick([1, 2, 5, 10, 20, 25, 50]);
          const E = V / (Rc / 100);
          return {
            q: raw`An isolated conducting sphere of radius $${Rc}\,\text{cm}$ is charged to a potential of $${F.num(V / 1e3)}\,\text{kV}$ relative to infinity. What is the magnitude of the electric field just outside its surface?`,
            ...GRE.numeric(R, E, [E / 2, 2 * E, V * Rc / 100, V / (Rc / 100) ** 2], { unit: raw`\text{V/m}` }),
            expl: raw`For a sphere, $V = \frac{Q}{4\pi\epsilon_0 R}$ and $E_{\text{surface}} = \frac{Q}{4\pi\epsilon_0 R^2}$, so $E = V/R = ${F.num(E)}\,\text{V/m}$.`,
            level: 1,
          };
        }
        if (mode === 'breakdown') {
          const Rc = R.pick([1, 2, 5, 10, 15, 20, 30, 50]);
          const askQ = R.bool();
          const Em = 3e6, Rm = Rc / 100;
          const val = askQ ? Em * Rm * Rm / K : Em * Rm;
          return {
            q: raw`Air breaks down when the electric field exceeds about $3\times10^{6}\,\text{V/m}$. What is the maximum ${askQ ? 'charge' : 'potential (relative to infinity)'} that an isolated conducting sphere of radius $${Rc}\,\text{cm}$ can hold in air? (Use $${K_T}$.)`,
            ...GRE.numeric(R, val, askQ ? [Em * Rm / K, Em * Rm * Rm * Rm / K, 2 * val, val / 2] : [Em / Rm, Em * Rm * Rm, Em * Rm / 2, 2 * Em * Rm], { unit: askQ ? raw`\text{C}` : raw`\text{V}` }),
            expl: askQ
              ? raw`The field is largest at the surface: $E = \frac{Q}{4\pi\epsilon_0R^2} \le E_{\max}$, so $Q_{\max} = 4\pi\epsilon_0R^2E_{\max} = ${F.num(val)}\,\text{C}$.`
              : raw`At the surface $E = V/R$ for a sphere, so $V_{\max} = E_{\max}R = (3\times10^6)(${F.num(Rm)}) = ${F.num(val)}\,\text{V}$. Small spheres (sharp points) break down at lower voltage.`,
          };
        }
        const s = R.pick([0.5, 1, 2, 3, 4, 5, 8, 10, 20]);
        const E = s * 1e-6 / EPS;
        return {
          q: raw`At a certain point on the surface of a charged conductor in electrostatic equilibrium, the surface charge density is $${s}\,\mu\text{C/m}^2$. What is the magnitude of the electric field just outside the conductor at that point? (Take $${EPS_T}$.)`,
          ...GRE.numeric(R, E, [E / 2, 2 * E, s * 1e-6 * EPS * 1e12, E / (4 * PI)], { unit: raw`\text{V/m}` }),
          expl: raw`The field inside the conductor is zero, so a pillbox straddling the surface gives $E\,A = \sigma A/\epsilon_0$: $E = \sigma/\epsilon_0 = ${F.num(E)}\,\text{V/m}$, perpendicular to the surface. The value $\sigma/2\epsilon_0$ applies to an isolated sheet with field on both sides — the classic trap.`,
          level: 1,
        };
      },
    },
    {
      id: 'em.cond.roman', sec: '2.1.6', level: 1,
      gen(R) {
        const TRUE = [
          'The electric field is zero everywhere inside the conducting material.',
          'Any net charge on the conductor resides on its surface.',
          'Just outside the surface, the electric field is perpendicular to the surface.',
          'Every point of the conductor is at the same potential.',
          'Just outside the surface, the field magnitude is $\\sigma/\\epsilon_0$, where $\\sigma$ is the local surface charge density.',
          'If the conductor has an empty cavity (with no charge inside it), the field in the cavity is zero.',
        ];
        const FALSE = [
          'The potential is zero everywhere inside the conductor.',
          'The surface charge density is the same at every point on the surface.',
          'Just outside the surface, the field magnitude is $\\sigma/2\\epsilon_0$, where $\\sigma$ is the local surface charge density.',
          'The electric field just outside the surface may have a component tangent to the surface.',
          'The net charge is spread uniformly throughout the volume of the conductor.',
          'The electric field just outside the surface is zero.',
        ];
        const nT = R.int(1, 3);
        const st = R.shuffle(R.pickN(TRUE, nT).map(s => [s, true]).concat(R.pickN(FALSE, 3 - nT).map(s => [s, false])));
        return {
          q: GRE.romanStem('An isolated, irregularly shaped solid conductor carries a net positive charge and is in electrostatic equilibrium. Which of the following must be true?', st.map(s => s[0])),
          ...GRE.roman(R, st.map(s => s[1])),
          expl: raw`In equilibrium free charges stop moving, so $\mathbf{E} = 0$ in the metal and the conductor is an equipotential (not necessarily at $V = 0$). Gauss's law then puts all net charge on the surface, the surface field is normal with magnitude $\sigma/\epsilon_0$, and an empty cavity is field-free. On an irregular shape $\sigma$ is not uniform (it is largest where the surface is most sharply curved). ` +
            st.map((s, i) => `${['I', 'II', 'III'][i]}: ${s[1] ? 'true' : 'false'}.`).join(' '),
        };
      },
    },

    // ------------------------------------------------------------- 2.1.7 Method of images
    {
      id: 'em.img.plane', sec: '2.1.7', level: 2, weight: 2,
      gen(R) {
        const mode = R.weighted(['Fnum', 'W', 'induced', 'sigma', 'V', 'Eplane'], [3, 2, 1, 2, 2, 1]);
        const intro = 'A point charge $q$ is held a distance $d$ above a large, flat, grounded conducting plane.';
        if (mode === 'Fnum') {
          const q = R.pick([1, 2, 3, 4, 5, 6, 8, 10, 20]), d = R.pick([1, 2, 3, 4, 5, 10]);
          const F0 = K * (q * 1e-9) ** 2 / (d / 100) ** 2;
          return {
            q: raw`A point charge of $${q}\,\text{nC}$ is held $${d}\,\text{cm}$ above a large, flat, grounded conducting plane. What is the magnitude of the force the plane exerts on the charge? (Use $${K_T}$.)`,
            ...GRE.numeric(R, F0 / 4, [F0, F0 / 2, F0 / 16, 2 * F0], { unit: raw`\text{N}` }),
            expl: raw`Replace the plane by an image charge $-q$ a distance $d$ below it. The real charge is attracted to the image, a distance $2d$ away: $F = \frac{q^2}{4\pi\epsilon_0(2d)^2} = ${F.num(F0 / 4)}\,\text{N}$. Forgetting that the separation is $2d$ gives a force 4 times too large.`,
          };
        }
        if (mode === 'W') {
          const base = d => `$\\dfrac{q^2}{${d}\\pi\\epsilon_0 d}$`;
          return {
            q: raw`${intro} How much work must an external agent do to move the charge slowly from this position to infinitely far away?`,
            ...GRE.mc(R, base(16), [base(8), base(4), base(32), '$\\dfrac{q^2}{16\\pi\\epsilon_0 d^2}$', base(2), '$0$']),
            expl: raw`The force on the charge at height $z$ is the attraction to its image: $F = \frac{q^2}{4\pi\epsilon_0(2z)^2}$. So $W = \int_d^\infty \frac{q^2}{16\pi\epsilon_0 z^2}dz = \frac{q^2}{16\pi\epsilon_0 d}$. Using the energy of a real pair of charges $2d$ apart, $\frac{q^2}{8\pi\epsilon_0 d}$, double counts: the image moves with the charge and no work is done on it.`,
            level: 3,
          };
        }
        if (mode === 'induced') {
          return {
            q: raw`${intro} What is the total charge induced on the plane?`,
            ...GRE.mc(R, '$-q$', ['$-\\dfrac{q}{2}$', '$0$', '$+q$', '$-2q$', '$-\\dfrac{q}{4\\pi}$']),
            expl: raw`The field above the plane is that of $q$ and an image $-q$. Integrating $\sigma = -\epsilon_0\,\partial V/\partial z$ over the whole plane (or applying Gauss's law to a large hemisphere, where the field falls off like a dipole's) gives a total induced charge of exactly $-q$.`,
          };
        }
        if (mode === 'sigma') {
          const far = R.bool(0.4);
          const t = n => `$-\\dfrac{q}{${n}\\pi d^2}$`;
          return {
            q: raw`${intro} What is the induced surface charge density on the plane ${far ? 'at a point a horizontal distance $\\sqrt{3}\\,d$ from the point directly beneath the charge' : 'at the point directly beneath the charge'}?`,
            ...GRE.mc(R, far ? t(16) : t(2), (far ? [t(2), t(8), t(4), t(32), '$+\\dfrac{q}{16\\pi d^2}$'] : [t(4), t(1), t(8), '$+\\dfrac{q}{2\\pi d^2}$', '$-\\dfrac{q}{2\\pi\\epsilon_0 d^2}$'])),
            expl: raw`With the image $-q$ at depth $d$, the field just above the plane at horizontal distance $s$ is normal, $E_z = -\frac{2qd}{4\pi\epsilon_0(s^2+d^2)^{3/2}}$, and $\sigma = \epsilon_0E_z = -\frac{qd}{2\pi(s^2+d^2)^{3/2}}$. ${far ? 'At $s = \\sqrt{3}d$, $(s^2+d^2)^{3/2} = 8d^3$, giving $-q/(16\\pi d^2)$.' : 'At $s = 0$ this is $-q/(2\\pi d^2)$.'}`,
          };
        }
        if (mode === 'V') {
          const q = R.pick([1, 2, 3, 4, 5, 6, 8, 10]), d = R.pick([2, 3, 4, 5, 6]);
          const h = R.pick([1, 2, 3, 4, 6, 8, 10, 12].filter(x => x !== d));
          const qq = q * 1e-9;
          const V = K * qq * (1 / (Math.abs(h - d) / 100) - 1 / ((h + d) / 100));
          return {
            q: raw`A point charge of $${q}\,\text{nC}$ is held $${d}\,\text{cm}$ above a large, flat, grounded conducting plane. What is the electric potential at a point $${h}\,\text{cm}$ above the plane, directly ${h > d ? 'above' : 'below'} the charge? (Use $${K_T}$.)`,
            ...GRE.numeric(R, V, [K * qq / (Math.abs(h - d) / 100), K * qq * (1 / (Math.abs(h - d) / 100) + 1 / ((h + d) / 100)), K * qq * (1 / (Math.abs(h - d) / 100) - 1 / (h / 100)), K * qq / (h / 100)], { unit: raw`\text{V}` }),
            expl: raw`Image method: the potential above the plane is that of $q$ plus an image $-q$ at depth $${d}\,\text{cm}$, which makes $V = 0$ on the plane. At the point: $V = \frac{q}{4\pi\epsilon_0}\left(\frac{1}{${Math.abs(h - d)}\,\text{cm}} - \frac{1}{${h + d}\,\text{cm}}\right) = ${F.num(V)}\,\text{V}$.`,
          };
        }
        const t = n => `$\\dfrac{q}{${n}\\pi\\epsilon_0 d^2}$`;
        return {
          q: raw`${intro} What is the magnitude of the electric field at the surface of the plane, directly beneath the charge?`,
          ...GRE.mc(R, t(2), [t(4), t(16), t(8), '$0$', t(1)]),
          expl: raw`The charge and its image $-q$ (at depth $d$) each contribute $\frac{q}{4\pi\epsilon_0 d^2}$ there, both pointing toward the plane, so $E = \frac{2q}{4\pi\epsilon_0 d^2} = \frac{q}{2\pi\epsilon_0 d^2}$, normal to the surface. The field is zero inside the conductor, not just outside it.`,
        };
      },
    },
    {
      id: 'em.img.corner', sec: '2.1.7', level: 3,
      gen(R) {
        const mode = R.weighted(['count', 'Fsym', 'Fnum', 'config'], [2, 1, 2, 1]);
        if (mode === 'count') {
          const n = R.pick([2, 3, 4, 5, 6]);
          const ang = 180 / n;
          const corr = 2 * n - 1;
          const ex = x => `$${x}$`;
          return {
            q: raw`A point charge sits between two semi-infinite grounded conducting planes that meet along a line at an angle of $${ang}^\circ$ (the charge is inside the wedge). How many image charges are needed to find the potential inside the wedge by the method of images?`,
            ...GRE.mc(R, ex(corr), [n - 1, n, 2 * n, 2 * n + 1, 360 / ang, 2 * n - 2].filter(x => x !== corr).map(ex), { rank: s => +s.slice(1, -1) }),
            expl: raw`Reflecting the charge repeatedly in both planes generates images at angular spacing set by the wedge; for a wedge angle $\pi/n$ the images close up after $2n$ total charges (alternating signs), i.e. $2n - 1 = ${corr}$ images. For a $90^\circ$ corner this is the familiar 3 images.`,
          };
        }
        if (mode === 'config') {
          const corr = 'charge $-q$ at each of the two mirror points across the planes, and $+q$ at the point diagonally opposite through the corner';
          return {
            q: raw`A point charge $+q$ sits at $(x, y) = (a, b)$, in the region $x > 0$, $y > 0$ bounded by two grounded conducting half-planes $x = 0$ and $y = 0$. Which set of image charges reproduces the potential in that region?`,
            ...GRE.mc(R, corr, [
              'a single charge $-q$ at $(-a, -b)$',
              'charge $-q$ at $(-a, b)$ and charge $-q$ at $(a, -b)$ only',
              'charge $-q$ at each of the two mirror points, and $-q$ at $(-a, -b)$',
              'charge $+q$ at each of the two mirror points, and $-q$ at $(-a, -b)$',
              'charge $-q/2$ at each of the two mirror points',
            ]),
            expl: raw`Images: $-q$ at $(-a, b)$, $-q$ at $(a, -b)$, $+q$ at $(-a, -b)$. Check: on $x = 0$ the pairs $(+q$ at $(a,b)$, $-q$ at $(-a,b))$ and $(-q$ at $(a,-b)$, $+q$ at $(-a,-b))$ each give zero potential; the same pairing works on $y = 0$. All images lie outside the physical region.`,
          };
        }
        if (mode === 'Fsym') {
          const base = n => `$\\dfrac{${n}q^2}{32\\pi\\epsilon_0 d^2}$`;
          return {
            q: raw`A point charge $q$ is placed inside a right-angled corner formed by two large grounded conducting planes, a distance $d$ from each plane. What is the magnitude of the net force on the charge?`,
            ...GRE.mc(R, base('(2\\sqrt{2}-1)'), [base('(2\\sqrt{2}+1)'), '$\\dfrac{\\sqrt{2}\\,q^2}{16\\pi\\epsilon_0 d^2}$', '$\\dfrac{q^2}{16\\pi\\epsilon_0 d^2}$', '$\\dfrac{q^2}{8\\pi\\epsilon_0 d^2}$', '$\\dfrac{(\\sqrt{2}-1)\\,q^2}{16\\pi\\epsilon_0 d^2}$']),
            expl: raw`Images: $-q$ at distance $2d$ across each plane and $+q$ at distance $2\sqrt2d$ through the corner. The two $-q$ images pull with $\frac{q^2}{4\pi\epsilon_0(2d)^2}$ each, perpendicular, giving $\frac{\sqrt2q^2}{16\pi\epsilon_0d^2}$ toward the corner; the $+q$ image pushes $\frac{q^2}{4\pi\epsilon_0(8d^2)}$ away from it. Net: $\frac{q^2}{32\pi\epsilon_0d^2}(2\sqrt2 - 1)$, toward the corner.`,
          };
        }
        const [a, b] = R.pick([[3, 4], [4, 3], [2, 2], [1, 2], [2, 1], [2, 3], [3, 3], [1, 1], [3, 6], [5, 12]]);
        const q = R.pick([1, 2, 4, 5, 10]) * 1e-9;
        const imgs = [[-a, b, -1], [a, -b, -1], [-a, -b, 1]];
        const force = list => { let fxx = 0, fy = 0; for (const [x, y, s] of list) { const dx = (a - x) / 100, dy = (b - y) / 100, r3 = Math.hypot(dx, dy) ** 3; fxx += K * q * q * s * dx / r3; fy += K * q * q * s * dy / r3; } return Math.hypot(fxx, fy); };
        const Fc = force(imgs);
        const wr = [force(imgs.slice(0, 2)), force([imgs[0]]) + force([imgs[1]]), force([[-a, b, -1], [a, -b, -1], [-a, -b, -1]]), force([imgs[a <= b ? 0 : 1]])];
        return {
          q: raw`A point charge of $${F.num(q * 1e9)}\,\text{nC}$ sits inside a right-angled corner formed by two large grounded conducting planes, $${a}\,\text{cm}$ from one plane and $${b}\,\text{cm}$ from the other. What is the magnitude of the net electrostatic force on it? (Use $${K_T}$.)`,
          ...GRE.numeric(R, Fc, wr, { unit: raw`\text{N}`, tol: 0.08, fmt: x => F.num(x, 2) }),
          expl: raw`Three images: $-q$ mirrored across each plane (distances $${2 * a}\,\text{cm}$ and $${2 * b}\,\text{cm}$) and $+q$ through the corner (distance $${F.num(2 * Math.hypot(a, b), 3)}\,\text{cm}$). Adding the three Coulomb forces as vectors gives $F = ${F.num(Fc)}\,\text{N}$. Omitting the $+q$ image overestimates the attraction.`,
        };
      },
    },
    {
      id: 'em.img.sphere', sec: '2.1.7', level: 3,
      gen(R) {
        const [mn, md] = R.pick([[2, 1], [3, 1], [4, 1], [5, 1], [3, 2], [5, 2], [4, 3], [5, 4]]);
        const m = mn / md;
        const mT = md === 1 ? `${mn}R` : `${F.frac(mn, md)}R`;
        const mode = R.weighted(['image', 'induced', 'force', 'neutral'], [3, 1, 2, 1]);
        const intro = raw`A point charge $q$ is a distance $${mT}$ from the center of a grounded conducting sphere of radius $R$.`;
        if (mode === 'image') {
          const ch = (qq, pos) => `charge $${qq}$ at distance $${pos}$ from the center, toward $q$`;
          const fr = (n, d, s) => (n === d ? s : `${F.frac(n, d)}${s}`);
          const corr = ch('-' + fr(md, mn, 'q'), fr(md, mn, 'R'));
          return {
            q: raw`${intro} The field outside the sphere is the same as that of $q$ together with a single image charge. What is the image charge and where is it?`,
            ...GRE.mc(R, corr, [ch('-q', fr(md, mn, 'R')), ch('-' + fr(md, mn, 'q'), fr(md * md, mn * mn, 'R')), ch('-' + fr(md * md, mn * mn, 'q'), fr(md, mn, 'R')), ch('-' + fr(md, mn, 'q'), fr(mn, md, 'R')), ch('+' + fr(md, mn, 'q'), fr(md, mn, 'R'))]),
            expl: raw`For a grounded sphere, an image $q' = -q\frac{R}{D}$ at distance $\frac{R^2}{D}$ from the center (with $D = ${mT}$) makes $V = 0$ on the whole sphere. Here $q' = -${fr(md, mn, 'q')}$ at $${fr(md, mn, 'R')}$ from the center.`,
          };
        }
        if (mode === 'induced') {
          const t = (n, d) => `$-${n === d ? '' : F.frac(n, d)}q$`;
          return {
            q: raw`${intro} What is the total charge induced on the sphere?`,
            ...GRE.mc(R, t(md, mn), [t(1, 1), t(md * md, mn * mn), '$0$', `$+${F.frac(md, mn)}q$`, t(mn - md, mn)]),
            expl: raw`The induced charge equals the image charge (Gauss's law around the sphere sees the same enclosed charge): $q' = -qR/D = ${t(md, mn).slice(1, -1)}$. A grounded sphere does not acquire the full $-q$ — that happens only for an infinite plane.`,
          };
        }
        if (mode === 'neutral') {
          const t = (n, d, s) => `$${s}${n === d ? '' : F.frac(n, d)}q$`;
          return {
            q: raw`A point charge $q$ is a distance $${mT}$ from the center of an isolated, electrically neutral conducting sphere of radius $R$. In addition to the usual image charge $-qR/D$ (placed at $R^2/D$ from the center), what charge must be placed at the center to reproduce the field outside the sphere?`,
            ...GRE.mc(R, t(md, mn, '+'), [t(md, mn, '-'), '$0$', t(1, 1, '+'), t(md * md, mn * mn, '+'), t(mn, md, '+')]),
            expl: raw`The grounded-sphere image $-qR/D$ makes the sphere an equipotential at $V = 0$ but gives it net charge $-qR/D$. Adding $+qR/D = ${t(md, mn, '+').slice(1, -1)}$ at the center keeps the surface an equipotential (now at nonzero $V$) and restores zero net charge.`,
          };
        }
        const c = m / ((m * m - 1) ** 2);
        const t = x => `$${cf(x)}\\dfrac{q^2}{4\\pi\\epsilon_0 R^2}$`;
        const wr = [1 / (m * m * m), m * m / ((m * m - 1) ** 2), 1 / (m * (m - 1) ** 2), 1 / ((m - 1) ** 2), 1 / (4 * m * (m - 1) ** 2)].filter(x => Math.abs(x - c) > 1e-9);
        return {
          q: raw`${intro} What is the magnitude of the force on the charge?`,
          ...GRE.mc(R, t(c), wr.map(t)),
          expl: raw`The image $-qR/D$ sits $R^2/D$ from the center, i.e. $D - R^2/D$ from $q$. With $D = ${mT}$: $F = \frac{q\cdot(qR/D)}{4\pi\epsilon_0(D - R^2/D)^2} = \frac{q^2RD}{4\pi\epsilon_0(D^2-R^2)^2} = ${t(c).slice(1, -1)}$ (attractive).`,
        };
      },
    },

    // ------------------------------------------------------------- 2.1.8 Work and energy
    {
      id: 'em.energy.assemble', sec: '2.1.8', level: 2, weight: 2,
      gen(R) {
        const cfg = R.pick(['tri', 'line', 'square', 'square', 'triC']);
        const pickS = n => Array.from({ length: n }, () => R.pick([1, 1, 2, 3, -1, -1, -2]));
        const base = raw`\dfrac{q^2}{4\pi\epsilon_0 a}`;
        let A = 0, B = 0, n = 2, absA = 0, absB = 0, desc, s, mistakes = [];
        const qt = v => `${v < 0 ? '-' : '+'}${Math.abs(v) === 1 ? '' : Math.abs(v)}q`;
        if (cfg === 'tri') {
          s = pickS(3);
          A = s[0] * s[1] + s[1] * s[2] + s[0] * s[2]; absA = Math.abs(s[0] * s[1]) + Math.abs(s[1] * s[2]) + Math.abs(s[0] * s[2]);
          desc = raw`charges $${s.map(qt).join('$, $')}$ at the corners of an equilateral triangle of side $a$`;
          mistakes = [[2 * A, 0], [absA, 0], [-A, 0], [A / 2, 0], [s[0] * s[1] + s[1] * s[2], 0], [-absA, 0], [absA / 2, 0], [3 * s[0] * s[1], 0]];
        } else if (cfg === 'line') {
          s = pickS(3);
          A = s[0] * s[1] + s[1] * s[2] + s[0] * s[2] / 2; absA = Math.abs(s[0] * s[1]) + Math.abs(s[1] * s[2]) + Math.abs(s[0] * s[2]) / 2;
          desc = raw`charges $${s.map(qt).join('$, $')}$ placed in that order along a straight line, with a spacing $a$ between neighbors`;
          mistakes = [[2 * A, 0], [absA, 0], [-A, 0], [s[0] * s[1] + s[1] * s[2], 0], [s[0] * s[1] + s[1] * s[2] + s[0] * s[2], 0], [s[0] * s[1] + s[1] * s[2] + s[0] * s[2] / 4, 0], [-absA, 0], [A / 2, 0]];
        } else if (cfg === 'square') {
          s = pickS(4);
          const adj = s[0] * s[1] + s[1] * s[2] + s[2] * s[3] + s[3] * s[0], dg = s[0] * s[2] + s[1] * s[3];
          A = adj; B = dg / 2;
          absA = Math.abs(s[0] * s[1]) + Math.abs(s[1] * s[2]) + Math.abs(s[2] * s[3]) + Math.abs(s[3] * s[0]); absB = (Math.abs(s[0] * s[2]) + Math.abs(s[1] * s[3])) / 2;
          desc = raw`charges $${s.map(qt).join('$, $')}$ placed, in order, at the four corners of a square of side $a$`;
          mistakes = [[2 * A, 2 * B], [absA, absB], [-A, -B], [A, 0], [A + dg / 2, 0], [A + dg, 0], [-absA, -absB], [0, B], [A, 2 * B]];
        } else {
          s = pickS(3); const c = R.pick([1, -1, 2, -2]);
          A = s[0] * s[1] + s[1] * s[2] + s[0] * s[2]; B = c * (s[0] + s[1] + s[2]); n = 3;
          desc = raw`charges $${s.map(qt).join('$, $')}$ at the corners of an equilateral triangle of side $a$, and a charge $${qt(c)}$ at the triangle's center`;
          mistakes = [[2 * A, 2 * B], [-A, -B], [A, 0], [A + c * (s[0] + s[1] + s[2]), 0], [A, B / 3], [A + 2 * c * (s[0] + s[1] + s[2]), 0], [0, B], [A, 2 * B]];
        }
        const irr = cfg === 'square' || cfg === 'triC';
        const fmt = (x, y) => {
          if (irr) { const c = surdCoef(x, y, n); return c === '0' ? '$0$' : `$${c}${base}$`; }
          if (Math.abs(x) < 1e-12) return '$0$';
          const [nn, dd] = rat(x);
          return `$${tf(nn, 4 * dd, 'q^2', '\\pi\\epsilon_0 a')}$`;
        };
        const corr = fmt(A, B);
        const ask = R.bool(0.75) || A + B * Math.sqrt(n) <= 0;
        const val = A + B * Math.sqrt(n);
        return {
          q: ask
            ? raw`How much work is required to assemble ${desc}, bringing the charges in from infinite separation?`
            : raw`Consider ${desc}. If the charges were released and flew apart, what total kinetic energy would they have when very far apart?`,
          ...GRE.mc(R, corr, mistakes.map(([x, y]) => fmt(x, y))),
          expl: raw`$W = \sum_{\text{pairs}} \frac{q_iq_j}{4\pi\epsilon_0 r_{ij}}$, counting each pair once and keeping signs. ${cfg === 'square' ? 'Four sides at distance $a$ and two diagonals at $\\sqrt2a$: ' : cfg === 'line' ? 'Two neighbor pairs at $a$ and the end pair at $2a$: ' : cfg === 'triC' ? 'Three vertex pairs at $a$ plus three center–vertex pairs at $a/\\sqrt3$: ' : 'Three pairs, each at distance $a$: '}$W = ${corr.slice(1, -1)}$${val < 0 ? ' (negative: the configuration is bound)' : ''}. Summing $q_iV_i$ without the factor $\tfrac12$ double counts.`,
        };
      },
    },
    {
      id: 'em.energy.release', sec: '2.1.8', level: 2,
      gen(R) {
        const mode = R.weighted(['pair', 'fixed', 'approach'], [2, 2, 2]);
        if (mode === 'approach') {
          const proj = R.pick([['proton', 1], ['alpha particle', 2], ['deuteron', 1]]);
          const tgt = R.pick([['gold', 79], ['lead', 82], ['silver', 47], ['copper', 29], ['uranium', 92], ['tin', 50]]);
          const KE = R.pick([1, 2, 4, 5, 6, 8, 10]);
          const r = 1.44 * proj[1] * tgt[1] / KE;
          return {
            q: raw`A${proj[0] === 'alpha particle' ? 'n' : ''} ${proj[0]} with kinetic energy $${KE}\,\text{MeV}$ is fired directly at a ${tgt[0]} nucleus ($Z = ${tgt[1]}$), which may be treated as fixed. What is the distance of closest approach? (Use $e^2/4\pi\epsilon_0 = 1.44\,\text{MeV}\cdot\text{fm}$.)`,
            ...GRE.numeric(R, r, [2 * r, r / 2, 1.44 * tgt[1] / KE, 1.44 * proj[1] * tgt[1] / (2 * KE) * 4], { unit: raw`\text{fm}`, fmt: x => F.num(x, 2) }),
            expl: raw`At closest approach all kinetic energy has become Coulomb potential energy: $K = \frac{(${proj[1] === 1 ? '' : proj[1]}e)(${tgt[1]}e)}{4\pi\epsilon_0 r}$, so $r = \frac{${proj[1] * tgt[1]}\times1.44\,\text{MeV fm}}{${KE}\,\text{MeV}} = ${F.num(r, 2)}\,\text{fm}$.`,
          };
        }
        const q1 = R.pick([1, 2, 3, 4, 5]), q2 = R.pick([1, 2, 3, 4, 5]);
        const r0 = R.pick([1, 2, 3, 5, 10]);
        const U = K * q1 * q2 * 1e-12 / (r0 / 100);
        if (mode === 'fixed') {
          const m = R.pick([1, 2, 4, 5, 10]);
          const fin = R.pick([0, 2, 3, 4]); // 0 = infinity, else final separation multiple
          const dU = fin ? U * (1 - 1 / fin) : U;
          const v = Math.sqrt(2 * dU / (m / 1000));
          return {
            q: raw`A small sphere carrying $${q1}\,\mu\text{C}$ is held fixed. A second small sphere of mass $${m}\,\text{g}$ carrying $${q2}\,\mu\text{C}$ is released from rest $${r0}\,\text{cm}$ away. Ignoring gravity, what is its speed when it is ${fin ? `$${fin * r0}\\,\\text{cm}$ from the fixed sphere` : 'very far away'}? (Use $${K_T}$.)`,
            ...GRE.numeric(R, v, [Math.sqrt(dU / (m / 1000)), Math.sqrt(2 * U / (m / 1000)), Math.sqrt(4 * dU / (m / 1000)), v / 2], { unit: raw`\text{m/s}` }),
            expl: raw`Energy conservation: $\tfrac12mv^2 = \frac{q_1q_2}{4\pi\epsilon_0}\left(\frac{1}{r_0} - \frac{1}{r}\right) = ${F.num(dU, 3)}\,\text{J}$, so $v = ${F.num(v)}\,\text{m/s}$.`,
          };
        }
        const [m1, m2] = R.pick([[1, 2], [2, 1], [1, 3], [3, 1], [1, 4], [2, 3], [1, 1], [2, 2], [4, 1], [5, 1]]);
        const M1 = m1 / 1000, M2 = m2 / 1000;
        const v1 = Math.sqrt(2 * U * M2 / (M1 * (M1 + M2)));
        return {
          q: raw`Two small spheres, A of mass $${m1}\,\text{g}$ with charge $${q1}\,\mu\text{C}$ and B of mass $${m2}\,\text{g}$ with charge $${q2}\,\mu\text{C}$, are released from rest $${r0}\,\text{cm}$ apart on a frictionless horizontal surface. What is the speed of sphere A when the spheres are very far apart? (Use $${K_T}$.)`,
          ...GRE.numeric(R, v1, [Math.sqrt(2 * U / M1), Math.sqrt(U / M1), Math.sqrt(2 * U / (M1 + M2)), v1 * M1 / M2], { unit: raw`\text{m/s}` }),
          expl: raw`Momentum conservation, $m_Av_A = m_Bv_B$, and energy conservation, $\tfrac12m_Av_A^2 + \tfrac12m_Bv_B^2 = \frac{q_Aq_B}{4\pi\epsilon_0r_0} = ${F.num(U, 3)}\,\text{J}$, give $v_A = \sqrt{\frac{2Um_B}{m_A(m_A+m_B)}} = ${F.num(v1)}\,\text{m/s}$. Giving all the energy to A ignores B's recoil.`,
        };
      },
    },
    {
      id: 'em.energy.self', sec: '2.1.8', level: 2,
      gen(R) {
        const mode = R.weighted(['shell', 'solid', 'ratio', 'outside', 'expand', 'density'], [2, 2, 1, 2, 1, 2]);
        const t = (n, d) => `$${tf(n, d, 'Q^2', '\\pi\\epsilon_0 R')}$`;
        if (mode === 'shell' || mode === 'solid') {
          const shell = mode === 'shell';
          const obj = shell ? R.pick(['a thin spherical shell of radius $R$ carrying charge $Q$ spread uniformly over its surface', 'an isolated conducting sphere of radius $R$ carrying charge $Q$']) : 'a solid nonconducting sphere of radius $R$ carrying charge $Q$ spread uniformly through its volume';
          return {
            q: raw`What is the total electrostatic energy stored in the field of ${obj}?`,
            ...GRE.mc(R, shell ? t(1, 8) : t(3, 20), shell ? [t(3, 20), t(1, 4), t(1, 16), t(3, 8), t(1, 2)] : [t(1, 8), t(3, 10), t(1, 4), t(3, 40), t(1, 20)]),
            expl: shell
              ? raw`The field exists only outside: $U = \frac{\epsilon_0}{2}\int_R^\infty \left(\frac{Q}{4\pi\epsilon_0 r^2}\right)^2 4\pi r^2dr = \frac{Q^2}{8\pi\epsilon_0 R}$. Equivalently $U = \tfrac12QV$ with $V = Q/4\pi\epsilon_0R$.`
              : raw`Outside: $\frac{Q^2}{8\pi\epsilon_0R}$; inside ($E \propto r$): $\frac{Q^2}{40\pi\epsilon_0R}$. Total $U = \frac{3Q^2}{20\pi\epsilon_0R} = \frac35\frac{Q^2}{4\pi\epsilon_0R}$ — larger than for a shell of the same charge and radius.`,
          };
        }
        const ex = x => { const e = fx(x); return e == null ? null : `$${e}$`; };
        if (mode === 'ratio') {
          const inv = R.bool();
          return {
            q: raw`A solid sphere with charge $Q$ spread uniformly through its volume and a thin spherical shell with the same charge $Q$ spread uniformly over its surface have the same radius. What is the ratio of the electrostatic energy of the ${inv ? 'shell to that of the solid sphere' : 'solid sphere to that of the shell'}?`,
            ...mcv(R, inv ? 5 / 6 : 6 / 5, inv ? [6 / 5, 1, 3 / 5, 5 / 3, 1 / 2, 2 / 3] : [5 / 6, 1, 3 / 5, 5 / 3, 2, 3 / 2], ex),
            expl: raw`$U_{\text{solid}} = \frac35\frac{Q^2}{4\pi\epsilon_0R}$ and $U_{\text{shell}} = \frac12\frac{Q^2}{4\pi\epsilon_0R}$. So $U_{\text{solid}}/U_{\text{shell}} = \frac{3/5}{1/2} = \frac65$${inv ? ' and the requested ratio is $\\frac56$' : ''}; the solid sphere also stores field energy inside.`,
          };
        }
        if (mode === 'outside') {
          const solid = R.bool(0.35);
          if (solid) {
            return {
              q: raw`A solid nonconducting sphere carries charge spread uniformly through its volume. What fraction of its total electrostatic field energy is stored inside the sphere itself?`,
              ...mcv(R, 1 / 6, [1 / 5, 1 / 2, 5 / 6, 3 / 5, 1 / 3, 0, 1 / 4], x => (x === 0 ? '$0$' : ex(x))),
              expl: raw`Inside: $\frac{\epsilon_0}{2}\int_0^R\left(\frac{Qr}{4\pi\epsilon_0R^3}\right)^24\pi r^2dr = \frac{Q^2}{40\pi\epsilon_0R}$. Outside: $\frac{Q^2}{8\pi\epsilon_0R} = \frac{5Q^2}{40\pi\epsilon_0R}$. Fraction inside: $\frac{1}{1+5} = \frac16$.`,
            };
          }
          const m = R.pick([2, 3, 4, 5, 10]);
          const inner = R.bool();
          const corr = inner ? 1 - 1 / m : 1 / m;
          return {
            q: raw`A conducting sphere of radius $R$ carries charge $Q$. What fraction of the total energy stored in its electric field lies ${inner ? `between $r = R$ and $r = ${m}R$` : `beyond $r = ${m}R$`}?`,
            ...mcv(R, corr, [1 / (m * m), 1 - 1 / (m * m), 1 - 1 / m, 1 / m, 1 / (m * m * m), 1 - 1 / (m * m * m), 1 / 2], ex),
            expl: raw`The energy beyond radius $r$ is $\frac{\epsilon_0}{2}\int_r^\infty E^2\,4\pi r'^2dr' = \frac{Q^2}{8\pi\epsilon_0 r}$, i.e. a fraction $R/r$ of the total $\frac{Q^2}{8\pi\epsilon_0R}$. So the fraction beyond $${m}R$ is $\frac{1}{${m}}$, and between $R$ and $${m}R$ it is $1 - \frac{1}{${m}}$. Answer: $${fx(corr)}$.`,
          };
        }
        if (mode === 'expand') {
          const m = R.pick([3, 4, 5]);
          const c = (1 - 1 / m) / 8; // in Q^2/(pi eps0 R)
          const [n, d] = rat(c);
          const tq = x => { const [a1, b1] = rat(x); return t(a1, b1); };
          return {
            q: raw`A thin spherical shell of radius $R$ carries charge $Q$ uniformly distributed. The shell is allowed to expand slowly (remaining spherical) until its radius is $${m}R$. By how much does the electrostatic energy decrease?`,
            ...GRE.mc(R, t(n, d), [1 / 8, 1 / (8 * m), 2 * c, (1 - 1 / (m * m)) / 8, (m - 1) / 8].map(tq)),
            expl: raw`$U = \frac{Q^2}{8\pi\epsilon_0 r}$, so $\Delta U = \frac{Q^2}{8\pi\epsilon_0}\left(\frac1R - \frac{1}{${m}R}\right) = ${t(n, d).slice(1, -1)}$ — exactly the field energy that was stored between $R$ and $${m}R$.`,
            level: 3,
          };
        }
        const E = R.pick([1, 2, 3, 5, 10, 20, 50, 100, 300]) * 1e3 * R.pick([1, 10]);
        const u = EPS * E * E / 2;
        return {
          q: raw`What is the energy density in a region of empty space where the electric field has magnitude $${F.sci(E, 2)}\,\text{V/m}$? (Take $${EPS_T}$.)`,
          ...GRE.numeric(R, u, [2 * u, EPS * E / 2, u / (4 * PI), 4 * u], { unit: raw`\text{J/m}^3` }),
          expl: raw`$u_E = \tfrac12\epsilon_0E^2 = \tfrac12(8.85\times10^{-12})(${F.sci(E, 2)})^2 = ${F.num(u)}\,\text{J/m}^3$.`,
          level: 1,
        };
      },
    },

    // ------------------------------------------------------------- 2.1.9 Capacitors
    {
      id: 'em.cap.parallel', sec: '2.1.9', level: 1, weight: 2,
      gen(R) {
        const mode = R.weighted(['num', 'scale', 'force'], [3, 3, 1]);
        if (mode === 'num') {
          const L = R.pick([5, 10, 20, 30, 50]), dmm = R.pick([0.5, 1, 2, 4, 5]), V = R.pick([10, 12, 20, 50, 100, 200, 500]);
          const A = (L / 100) ** 2, d = dmm / 1000;
          const C = EPS * A / d;
          const ask = R.pick(['C', 'Q', 'E', 'U']);
          const intro = raw`An air-filled parallel-plate capacitor has square plates $${L}\,\text{cm}$ on a side separated by $${dmm}\,\text{mm}$${ask === 'C' ? '' : `, and is connected to a $${V}\\,\\text{V}$ battery`}.`;
          const spec = {
            C: ['What is its capacitance?', C, [C * 10, C / 10, EPS * A / (2 * d), C * 4 * PI], raw`\text{F}`, raw`$C = \epsilon_0A/d = (8.85\times10^{-12})(${F.num(A)})/(${F.num(d)}) = ${F.num(C)}\,\text{F}$.`],
            Q: ['What is the magnitude of the charge on each plate?', C * V, [C * V / 2, C * V * 10, C / V, C * V * V / 2], raw`\text{C}`, raw`$C = \epsilon_0A/d = ${F.num(C)}\,\text{F}$, so $Q = CV = ${F.num(C * V)}\,\text{C}$.`],
            E: ['What is the magnitude of the electric field between the plates (away from the edges)?', V / d, [V * d, V / (2 * d), V / (d * 100), 2 * V / d], raw`\text{V/m}`, raw`The field between the plates is uniform: $E = V/d = ${V}/${F.num(d)} = ${F.num(V / d)}\,\text{V/m}$ (equivalently $\sigma/\epsilon_0$).`],
            U: ['How much energy is stored in the capacitor?', C * V * V / 2, [C * V * V, C * V / 2, C * V * V / 4], raw`\text{J}`, raw`$U = \tfrac12CV^2$ with $C = \epsilon_0A/d = ${F.num(C)}\,\text{F}$: $U = ${F.num(C * V * V / 2)}\,\text{J}$.`],
          }[ask];
          return {
            q: raw`${intro} ${spec[0]} (Take $${EPS_T}$.)`,
            ...GRE.numeric(R, spec[1], spec[2], { unit: spec[3] }),
            expl: spec[4],
          };
        }
        if (mode === 'scale') {
          const s = R.pick([1, 2, 3, 1 / 2]), t = R.pick([1, 2, 3, 4, 1 / 2]), kap = R.pick([1, 1, 2, 3, 4]);
          if (s === 1 && t === 1 && kap === 1) throw new Error('no change');
          if (s === t && kap === 1) throw new Error('book problem');
          const cfac = s * s * kap / t;
          const cond = R.pick(['C', 'batt', 'iso']);
          const qty = cond === 'C' ? 'C' : R.pick(['Q', 'V', 'U', 'E']);
          // factor of each quantity
          let fac, why;
          if (cond === 'C') { fac = cfac; why = 'Capacitance'; }
          else if (cond === 'batt') { fac = { Q: cfac, V: 1, U: cfac, E: 1 / t }[qty]; }
          else { fac = { Q: 1, V: 1 / cfac, U: 1 / cfac, E: 1 / (s * s * kap) }[qty]; }
          if (Math.abs(fac - 1) < 1e-9 && R.bool(0.6)) throw new Error('boring');
          const changes = [];
          if (s !== 1) changes.push(`the edge length of each (square) plate is ${s > 1 ? (s === 2 ? 'doubled' : 'tripled') : 'halved'}`);
          if (t !== 1) changes.push(`the plate separation is ${t > 1 ? (t === 2 ? 'doubled' : t === 3 ? 'tripled' : 'quadrupled') : 'halved'}`);
          if (kap !== 1) changes.push(`the gap is completely filled with a dielectric of constant $\\kappa = ${kap}$`);
          const qName = { C: 'the capacitance', Q: 'the charge on the plates', V: 'the potential difference between the plates', U: 'the stored energy', E: 'the electric field between the plates' }[qty];
          const condT = cond === 'batt' ? ' while it remains connected to a battery' : cond === 'iso' ? ' after it has been charged and disconnected from the battery' : '';
          const ex = x => { const e = fx(x); return e == null ? null : `$${e}$`; };
          const cand = [fac, 1 / fac, cfac, 1 / cfac, s * s / t, s / t, fac * fac, 1, kap, 1 / kap, s * s * kap, t / (s * s)];
          const uniq = []; for (const x of cand) if (fx(x) && !uniq.some(u => Math.abs(u - x) < 1e-9)) uniq.push(x);
          const C0 = cfac;
          return {
            q: raw`An air-filled parallel-plate capacitor (plate size much larger than the gap) is modified${condT}: ${changes.join(', and ')}. By what factor does ${qName} change?`,
            ...mcv(R, fac, uniq, ex),
            expl: raw`$C = \kappa\epsilon_0A/d$ changes by $${fx(C0)}$ (${[s !== 1 ? `$A \to ${fx(s * s)}A$` : '', t !== 1 ? `$d \to ${fx(t)}d$` : '', kap !== 1 ? `$\kappa = ${kap}$` : ''].filter(Boolean).join(', ')}). ${cond === 'batt' ? raw`With the battery connected $V$ is fixed, so $Q = CV$ and $U = \tfrac12CV^2$ scale like $C$, while $E = V/d$ ${t === 1 ? 'is unchanged' : `scales as $1/${fx(t)}$`}.` : cond === 'iso' ? raw`Isolated, $Q$ is fixed, so $V = Q/C$ and $U = Q^2/2C$ scale like $1/C$, and $E = \sigma/\kappa\epsilon_0$ depends only on the charge per area and $\kappa$.` : ''} Factor: $${fx(fac)}$.`,
            level: 2,
          };
        }
        const askW = R.bool();
        const corr = askW ? raw`$\dfrac{Q^2 d}{2\epsilon_0 A}$` : raw`$\dfrac{Q^2}{2\epsilon_0 A}$`;
        return {
          q: askW
            ? raw`A parallel-plate capacitor with plate area $A$ and separation $d$ carries charges $\pm Q$ and is isolated. How much work must be done to slowly pull the plates apart until the separation is $2d$?`
            : raw`A parallel-plate capacitor with plate area $A$ carries charges $\pm Q$ on its plates. What is the magnitude of the attractive force between the plates?`,
          ...GRE.mc(R, corr, askW
            ? [raw`$\dfrac{Q^2 d}{\epsilon_0 A}$`, raw`$\dfrac{Q^2 d}{4\epsilon_0 A}$`, raw`$\dfrac{Q^2}{2\epsilon_0 A}$`, '$0$', raw`$\dfrac{3Q^2 d}{2\epsilon_0 A}$`]
            : [raw`$\dfrac{Q^2}{\epsilon_0 A}$`, raw`$\dfrac{Q^2}{4\epsilon_0 A}$`, raw`$\dfrac{Q^2 d}{2\epsilon_0 A}$`, raw`$\dfrac{2Q^2}{\epsilon_0 A}$`, raw`$\dfrac{Q^2}{4\pi\epsilon_0 A}$`]),
          expl: askW
            ? raw`With $Q$ fixed, $U = \frac{Q^2}{2C} = \frac{Q^2x}{2\epsilon_0A}$ grows linearly with separation $x$; the work done equals $\Delta U = \frac{Q^2d}{2\epsilon_0A}$ (the force $Q^2/2\epsilon_0A$ times the distance $d$).`
            : raw`Each plate feels the field of the other plate only, $\sigma/2\epsilon_0$, not the full $\sigma/\epsilon_0$ between them: $F = Q\cdot\frac{Q}{2\epsilon_0A} = \frac{Q^2}{2\epsilon_0A}$. Check: $F = -dU/dx$ with $U = Q^2x/2\epsilon_0A$.`,
          level: 2,
        };
      },
    },
    {
      id: 'em.cap.network', sec: '2.1.9', level: 2, weight: 2,
      gen(R) {
        const topo = R.pick(['sp', 'ps', 'sss', 'pp']);
        const Cs = [1, 2, 3, 4, 6, 8, 12];
        const [C1, C2, C3, C4] = [R.pick(Cs), R.pick(Cs), R.pick(Cs), R.pick(Cs)];
        const V = R.pick([6, 9, 10, 12, 18, 24, 30, 60]);
        const ser = (...c) => 1 / c.reduce((s, x) => s + 1 / x, 0);
        let desc, Ceq, wrongC, asks;
        const lbl = (i, c) => `$C_${i} = ${c}\\,\\mu\\text{F}$`;
        if (topo === 'sp') {
          desc = raw`Capacitor ${lbl(1, C1)} is connected in series with the parallel combination of ${lbl(2, C2)} and ${lbl(3, C3)}`;
          Ceq = ser(C1, C2 + C3); wrongC = [C1 + ser(C2, C3), C1 + C2 + C3, ser(C1, C2, C3), ser(C1, C2) + C3];
          const Q1 = Ceq * V, V2 = V - Q1 / C1;
          asks = { Q: ['the charge on $C_1$', Q1, [C1 * V, (C1 + C2 + C3) * V, C1 * V / 2, Q1 * C2 / (C2 + C3)], raw`\mu\text{C}`, raw`All the charge on $C_1$ flows to the parallel pair, so $Q_1 = C_{\text{eq}}V = ${F.num(Q1, 3)}\,\mu\text{C}$.`], V: ['the potential difference across $C_2$', V2, [V, V - V2, V * C2 / (C1 + C2 + C3), V / 2], raw`\text{V}`, raw`$Q_1 = C_{\text{eq}}V = ${F.num(Q1, 3)}\,\mu\text{C}$ gives $V_1 = Q_1/C_1 = ${F.num(V - V2, 3)}\,\text{V}$, so the parallel pair (and $C_2$) has $V - V_1 = ${F.num(V2, 3)}\,\text{V}$.`] };
        } else if (topo === 'ps') {
          desc = raw`Capacitor ${lbl(1, C1)} is connected in parallel with the series combination of ${lbl(2, C2)} and ${lbl(3, C3)}`;
          Ceq = C1 + ser(C2, C3); wrongC = [ser(C1, C2 + C3), C1 + C2 + C3, ser(C1, C2, C3), C1 + (C2 + C3) / 2];
          const Q2 = ser(C2, C3) * V, V2 = Q2 / C2;
          asks = { Q: ['the charge on $C_2$', Q2, [C2 * V, C1 * V, Ceq * V, C2 * V / 2], raw`\mu\text{C}`, raw`The series pair has $C_{23} = ${F.num(ser(C2, C3), 3)}\,\mu\text{F}$ across the full $${V}\,\text{V}$, so $Q_2 = Q_3 = C_{23}V = ${F.num(Q2, 3)}\,\mu\text{C}$.`], V: ['the potential difference across $C_2$', V2, [V, V - V2, V / 2, V * C2 / (C2 + C3)], raw`\text{V}`, raw`$Q_2 = C_{23}V = ${F.num(Q2, 3)}\,\mu\text{C}$, so $V_2 = Q_2/C_2 = ${F.num(V2, 3)}\,\text{V}$ (the smaller capacitor in a series pair takes the larger voltage).`] };
        } else if (topo === 'sss') {
          desc = raw`Capacitors ${lbl(1, C1)}, ${lbl(2, C2)}, and ${lbl(3, C3)} are connected in series`;
          Ceq = ser(C1, C2, C3); wrongC = [C1 + C2 + C3, (C1 + C2 + C3) / 3, ser(C1, C2) + C3, 3 * Ceq];
          const Q = Ceq * V;
          asks = { Q: ['the charge on $C_2$', Q, [C2 * V, Q * 3, C2 * V / 3, Q / 3], raw`\mu\text{C}`, raw`In series every capacitor carries the same charge $Q = C_{\text{eq}}V = ${F.num(Q, 3)}\,\mu\text{C}$.`], V: ['the potential difference across $C_2$', Q / C2, [V / 3, V, V * C2 / (C1 + C2 + C3), V - Q / C2], raw`\text{V}`, raw`$Q = C_{\text{eq}}V = ${F.num(Q, 3)}\,\mu\text{C}$ on each, so $V_2 = Q/C_2 = ${F.num(Q / C2, 3)}\,\text{V}$.`] };
        } else {
          desc = raw`The parallel combination of ${lbl(1, C1)} and ${lbl(2, C2)} is connected in series with the parallel combination of ${lbl(3, C3)} and $C_4 = ${C4}\,\mu\text{F}$`;
          Ceq = ser(C1 + C2, C3 + C4); wrongC = [ser(C1, C2) + ser(C3, C4), C1 + C2 + C3 + C4, ser(C1, C2, C3, C4), (C1 + C2 + C3 + C4) / 2];
          const Q = Ceq * V, Va = Q / (C1 + C2);
          asks = { Q: ['the charge on $C_1$', C1 * Va, [C1 * V, Q, C1 * (V - Va), Q / 2], raw`\mu\text{C}`, raw`$Q_{\text{tot}} = C_{\text{eq}}V = ${F.num(Q, 3)}\,\mu\text{C}$ passes through the first pair, whose voltage is $Q_{\text{tot}}/(C_1 + C_2) = ${F.num(Va, 3)}\,\text{V}$; so $Q_1 = C_1V_{12} = ${F.num(C1 * Va, 3)}\,\mu\text{C}$.`], V: ['the potential difference across $C_1$', Va, [V, V - Va, V / 2, V * C1 / (C1 + C2)], raw`\text{V}`, raw`$Q_{\text{tot}} = C_{\text{eq}}V = ${F.num(Q, 3)}\,\mu\text{C}$, so the first pair has $V_{12} = Q_{\text{tot}}/(C_1 + C_2) = ${F.num(Va, 3)}\,\text{V}$.`] };
        }
        const ask = R.weighted(['C', 'Q', 'V', 'U'], [3, 2, 2, 1]);
        const intro = raw`${desc}${ask === 'C' ? '.' : `, and the combination is connected across an ideal $${V}\\,\\text{V}$ battery.`}`;
        const fmt3 = x => F.num(x, 3);
        if (ask === 'C') {
          return {
            q: raw`${intro} What is the equivalent capacitance of the combination?`,
            ...GRE.numeric(R, Ceq, wrongC, { unit: raw`\mu\text{F}`, fmt: fmt3, tol: 0.08 }),
            expl: raw`Capacitances add directly in parallel and reciprocally in series (the opposite of resistors): $C_{\text{eq}} = ${fmt3(Ceq)}\,\mu\text{F}$.`,
          };
        }
        if (ask === 'U') {
          const U = Ceq * V * V / 2;
          return {
            q: raw`${intro} What is the total energy stored in the capacitors?`,
            ...GRE.numeric(R, U, [Ceq * V * V, wrongC[0] * V * V / 2, Ceq * V / 2, wrongC[1] * V * V / 2], { unit: raw`\mu\text{J}`, fmt: fmt3, tol: 0.08 }),
            expl: raw`$C_{\text{eq}} = ${fmt3(Ceq)}\,\mu\text{F}$ and $U = \tfrac12C_{\text{eq}}V^2 = ${fmt3(U)}\,\mu\text{J}$.`,
          };
        }
        const a = asks[ask];
        return {
          q: raw`${intro} What is ${a[0]}?`,
          ...GRE.numeric(R, a[1], a[2], { unit: a[3], fmt: fmt3, tol: 0.08 }),
          expl: raw`$C_{\text{eq}} = ${fmt3(Ceq)}\,\mu\text{F}$. ${a[4]}`,
        };
      },
    },
    {
      id: 'em.cap.dielectric', sec: '2.1.9', level: 2, weight: 2,
      gen(R) {
        const mode = R.weighted(['full', 'roman', 'partial'], [3, 1, 3]);
        const kap = R.pick([2, 3, 4, 5, 1.5, 2.5]);
        const kT = fx(kap);
        const ex = x => { const e = fx(x); return e == null ? null : `$${e}$`; };
        if (mode === 'partial') {
          const [fn, fd] = R.pick([[1, 2], [1, 3], [2, 3], [1, 4], [3, 4]]);
          const f = fn / fd;
          const k = R.pick([2, 3, 4, 5, 6]);
          const arr = R.pick(['side', 'stack', 'metal']);
          const side = 1 - f + f * k, stack = 1 / (1 - f + f / k), metal = 1 / (1 - f);
          const corr = { side, stack, metal }[arr];
          const desc = {
            side: raw`A slab of dielectric constant $\kappa = ${k}$ is inserted so that it fills the full gap between the plates over a fraction $${F.frac(fn, fd)}$ of the plate area (the rest of the gap is air).`,
            stack: raw`A slab of dielectric constant $\kappa = ${k}$ with the same area as the plates and thickness $${F.frac(fn, fd)}d$ is inserted parallel to the plates (the rest of the gap is air).`,
            metal: raw`An uncharged metal slab with the same area as the plates and thickness $${F.frac(fn, fd)}d$ is inserted parallel to the plates, not touching them.`,
          }[arr];
          const t = x => { const e = fx(x); return e == null ? null : `$${e === '1' ? '' : e}\\,C_0$`; };
          const cand = [side, stack, metal, k, f * k, 1 + f * k, 1 / (1 - f / k), (1 + k) / 2, 1 - f, k * (1 - f) + f];
          const uniq = []; for (const x of cand) if (fx(x) && Math.abs(x - corr) > 1e-9 && !uniq.some(u => Math.abs(u - x) < 1e-9)) uniq.push(x);
          return {
            q: raw`An air-filled parallel-plate capacitor with plate separation $d$ has capacitance $C_0$. ${desc} What is the new capacitance?`,
            ...mcv(R, corr, uniq, t),
            expl: {
              side: raw`The filled and empty parts sit side by side at the same voltage: two capacitors in parallel, $C = C_0\left[(1 - f) + f\kappa\right] = ${fx(side)}\,C_0$ with $f = ${F.frac(fn, fd)}$.`,
              stack: raw`The dielectric layer and the air layer carry the same charge: two capacitors in series, $\frac{1}{C} = \frac{1}{C_0}\left[(1 - f) + \frac{f}{\kappa}\right]$, so $C = ${fx(stack)}\,C_0$ with $f = ${F.frac(fn, fd)}$.`,
              metal: raw`The field vanishes inside the metal, so the slab simply removes thickness $fd$ from the gap: $C = \frac{\epsilon_0A}{d - fd} = \frac{C_0}{1 - f} = ${fx(metal)}\,C_0$ (independent of where the slab sits).`,
            }[arr],
            level: 3,
          };
        }
        const batt = R.bool();
        const condT = batt ? 'while the capacitor remains connected to the battery' : 'after the capacitor has been charged and then disconnected from the battery';
        const FAC = batt ? { C: kap, Q: kap, V: 1, E: 1, U: kap } : { C: kap, Q: 1, V: 1 / kap, E: 1 / kap, U: 1 / kap };
        const NAME = { C: 'capacitance', Q: 'charge on the plates', V: 'potential difference between the plates', E: 'electric field in the gap', U: 'energy stored in the capacitor' };
        if (mode === 'roman') {
          const qs = R.pickN(['Q', 'V', 'E', 'U', 'C'], 3);
          const truth = qs.map(x => FAC[x] > 1);
          if (!truth.some(Boolean)) throw new Error('no true');
          return {
            q: GRE.romanStem(raw`A slab of dielectric ($\kappa = ${kT}$) is slid in to completely fill the gap of a parallel-plate capacitor ${condT}. Which of the following quantities increase?`, qs.map(x => 'The ' + NAME[x])),
            ...GRE.roman(R, truth),
            expl: raw`${batt ? 'With the battery connected, $V$ is fixed; $C$ rises by $\\kappa$, so $Q = CV$ and $U = \\tfrac12CV^2$ rise by $\\kappa$, while $E = V/d$ is unchanged.' : 'Isolated, $Q$ is fixed; $C$ rises by $\\kappa$, so $V = Q/C$, $E = V/d$, and $U = Q^2/2C$ all fall by $\\kappa$.'}`,
          };
        }
        const qty = R.pick(['C', 'Q', 'V', 'E', 'U']);
        const corr = FAC[qty];
        const cand = [kap, 1 / kap, 1, kap * kap, 1 / (kap * kap), Math.sqrt(kap) === Math.round(Math.sqrt(kap)) ? Math.sqrt(kap) : kap + 1];
        return {
          q: raw`A parallel-plate capacitor is charged by a battery. Then, ${condT}, a slab of dielectric with $\kappa = ${kT}$ is slid in to completely fill the gap. By what factor does the ${NAME[qty]} change?`,
          ...mcv(R, corr, cand, ex),
          expl: raw`$C \to \kappa C$ in either case. ${batt ? 'Battery connected: $V$ fixed, so $Q = CV$ and $U = \\tfrac12CV^2$ grow by $\\kappa$; $E = V/d$ is unchanged (the battery supplies extra charge to cancel the dielectric’s bound charge).' : 'Isolated: $Q$ fixed, so $V = Q/C$, $E = V/d$ and $U = Q^2/2C$ all drop by $\\kappa$ (the dielectric is pulled in, so the field does work).'} Factor: $${fx(corr)}$.`,
        };
      },
    },
    {
      id: 'em.cap.geometry', sec: '2.1.9', level: 2,
      gen(R) {
        const mode = R.weighted(['sph', 'cyl', 'iso', 'sphNum', 'ratio'], [2, 2, 2, 2, 1]);
        if (mode === 'sph') {
          return {
            q: raw`A capacitor consists of two concentric thin conducting spherical shells of radii $a$ and $b$ ($a < b$). What is its capacitance?`,
            ...GRE.mc(R, raw`$\dfrac{4\pi\epsilon_0 ab}{b - a}$`, [raw`$\dfrac{4\pi\epsilon_0(b - a)}{ab}$`, raw`$\dfrac{4\pi\epsilon_0 b^2}{b - a}$`, raw`$\dfrac{2\pi\epsilon_0}{\ln(b/a)}$`, raw`$4\pi\epsilon_0(b - a)$`, raw`$\dfrac{4\pi\epsilon_0 ab}{b + a}$`]),
            expl: raw`Put $\pm Q$ on the shells: between them $E = \frac{Q}{4\pi\epsilon_0r^2}$, so $V = \frac{Q}{4\pi\epsilon_0}\left(\frac1a - \frac1b\right)$ and $C = Q/V = \frac{4\pi\epsilon_0ab}{b-a}$. Checks: $b \to \infty$ gives the isolated sphere $4\pi\epsilon_0a$; $b - a = d \ll a$ gives $\epsilon_0(4\pi a^2)/d$.`,
          };
        }
        if (mode === 'cyl') {
          return {
            q: raw`A coaxial cable of length $L$ consists of a solid inner conductor of radius $a$ and a thin outer conducting sheath of radius $b$, with vacuum between. Neglecting end effects, what is its capacitance?`,
            ...GRE.mc(R, raw`$\dfrac{2\pi\epsilon_0 L}{\ln(b/a)}$`, [raw`$2\pi\epsilon_0 L\ln(b/a)$`, raw`$\dfrac{4\pi\epsilon_0 L}{\ln(b/a)}$`, raw`$\dfrac{\pi\epsilon_0 L}{\ln(b/a)}$`, raw`$\dfrac{2\pi\epsilon_0 L\,a}{b - a}$`, raw`$\dfrac{2\pi\epsilon_0 L}{\ln(a/b)}$`]),
            expl: raw`With $\pm\lambda$ per length, $E = \frac{\lambda}{2\pi\epsilon_0 s}$ between the conductors, so $V = \frac{\lambda}{2\pi\epsilon_0}\ln\frac ba$ and $C = \frac{\lambda L}{V} = \frac{2\pi\epsilon_0L}{\ln(b/a)}$ (positive, since $b > a$).`,
          };
        }
        if (mode === 'iso') {
          const opts = [['$1.0\\,\\text{cm}$', 0.01], ['$10\\,\\text{cm}$', 0.1], ['$1.0\\,\\text{m}$', 1], ['$5.0\\,\\text{cm}$', 0.05], ['$6.4\\times10^{6}\\,\\text{m}$ (about the size of the Earth)', 6.4e6], ['$20\\,\\text{cm}$', 0.2], ['$2.0\\,\\text{m}$', 2]];
          const [txt, Rm] = R.pick(opts);
          const C = Rm / K;
          return {
            q: raw`What is the capacitance of an isolated conducting sphere of radius ${txt} (relative to infinity)? (Use $${K_T}$.)`,
            ...GRE.numeric(R, C, [Rm * Rm / K, C / (4 * PI), 4 * PI * C, 1 / (K * Rm)], { unit: raw`\text{F}` }),
            expl: raw`$V = \frac{Q}{4\pi\epsilon_0R}$, so $C = 4\pi\epsilon_0R = R/(9\times10^9) = ${F.num(C)}\,\text{F}$. Even an Earth-sized sphere is under a millifarad.`,
            level: 1,
          };
        }
        if (mode === 'sphNum') {
          const a = R.pick([1, 2, 3, 4, 5, 6, 8, 10]), b = a + R.pick([1, 2, 3, 4, 5]);
          const C = (a / 100) * (b / 100) / (K * (b - a) / 100);
          return {
            q: raw`A spherical capacitor consists of a conducting sphere of radius $${a}\,\text{cm}$ surrounded by a concentric thin conducting shell of radius $${b}\,\text{cm}$, with vacuum between them. What is its capacitance? (Use $${K_T}$.)`,
            ...GRE.numeric(R, C, [(a / 100) / K, (b / 100) / K, ((b - a) / 100) / K, (b / 100) ** 2 / (K * (b - a) / 100)], { unit: raw`\text{F}` }),
            expl: raw`$C = 4\pi\epsilon_0\frac{ab}{b-a} = \frac{(${F.num(a / 100)})(${F.num(b / 100)})}{(9\times10^9)(${F.num((b - a) / 100)})} = ${F.num(C)}\,\text{F}$.`,
          };
        }
        const a = R.pick([1, 2, 3, 4, 5]), b = a + R.pick([1, 2, 3, 4, 5, 6]);
        const ex = x => { const e = fx(x); return e == null ? null : `$${e}$`; };
        const corr = b / (b - a);
        return {
          q: raw`A conducting sphere of radius $${a}\,\text{cm}$ has capacitance $C_0$ when isolated. A thin, concentric, grounded conducting shell of radius $${b}\,\text{cm}$ is then placed around it. What is the ratio $C/C_0$ of the new capacitance (sphere relative to shell) to the original one?`,
          ...mcv(R, corr, [a / (b - a), (b - a) / b, b / a, a / b, (b / a) ** 2, (b + a) / (b - a)], ex),
          expl: raw`$C_0 = 4\pi\epsilon_0a$ and $C = \frac{4\pi\epsilon_0ab}{b-a}$, so $C/C_0 = \frac{b}{b-a} = ${fx(corr)}$. Surrounding a conductor with a nearby grounded one always increases its capacitance.`,
        };
      },
    },
    {
      id: 'em.cap.share', sec: '2.1.9', level: 2,
      gen(R) {
        const Cs = [1, 2, 3, 4, 5, 6, 8, 10, 12];
        const [C1, C2] = [R.pick(Cs), R.pick(Cs)];
        const V0 = R.pick([6, 10, 12, 20, 24, 30, 50, 60, 100]);
        const opp = R.bool(0.3);
        const mode = R.weighted(['V', 'Q2', 'lost', 'frac'], [3, 2, 2, opp ? 0 : 2]);
        const fmt3 = x => F.num(x, 3);
        if (opp) {
          const V2 = R.pick([5, 10, 12, 15, 20, 25, 40].filter(v => v !== V0));
          const Qn = C1 * V0 - C2 * V2;
          if (Qn === 0) throw new Error('zero');
          const Vf = Math.abs(Qn) / (C1 + C2);
          if (mode === 'V' || mode === 'frac') {
            return {
              q: raw`${C1 === 8 ? 'An' : 'A'} $${C1}\,\mu\text{F}$ capacitor charged to $${V0}\,\text{V}$ and a $${C2}\,\mu\text{F}$ capacitor charged to $${V2}\,\text{V}$ are disconnected from their batteries and then connected to each other, with the positive plate of each joined to the negative plate of the other. What is the final potential difference across them?`,
              ...GRE.numeric(R, Vf, [(C1 * V0 + C2 * V2) / (C1 + C2), Math.abs(V0 - V2), (V0 + V2) / 2, Math.abs(V0 - V2) / 2], { unit: raw`\text{V}`, fmt: fmt3, tol: 0.08 }),
              expl: raw`Joining opposite plates, the charges partly cancel: net charge $|${C1 * V0} - ${C2 * V2}|\,\mu\text{C} = ${Math.abs(Qn)}\,\mu\text{C}$ shared by $C_1 + C_2 = ${C1 + C2}\,\mu\text{F}$ in parallel, so $V = ${fmt3(Vf)}\,\text{V}$.`,
            };
          }
        }
        const Vf = C1 * V0 / (C1 + C2);
        const intro = raw`${C1 === 8 ? 'An' : 'A'} $${C1}\,\mu\text{F}$ capacitor is charged to $${V0}\,\text{V}$ and disconnected from the battery. It is then connected across an uncharged $${C2}\,\mu\text{F}$ capacitor (positive plate to one plate, negative to the other).`;
        if (mode === 'V') {
          return {
            q: raw`${intro} What is the final potential difference across the capacitors?`,
            ...GRE.numeric(R, Vf, [V0 / 2, V0 * C2 / (C1 + C2), V0], { unit: raw`\text{V}`, fmt: fmt3, tol: 0.08 }),
            expl: raw`Charge is conserved: $Q = C_1V_0 = ${C1 * V0}\,\mu\text{C}$ spreads over $C_1 + C_2$ in parallel, so $V = \frac{C_1V_0}{C_1 + C_2} = ${fmt3(Vf)}\,\text{V}$.`,
          };
        }
        if (mode === 'Q2') {
          const Q2 = C2 * Vf;
          return {
            q: raw`${intro} What is the final charge on the $${C2}\,\mu\text{F}$ capacitor?`,
            ...GRE.numeric(R, Q2, [C1 * V0 / 2, C2 * V0, C1 * Vf, C1 * V0], { unit: raw`\mu\text{C}`, fmt: fmt3, tol: 0.08 }),
            expl: raw`Common final voltage $V = \frac{C_1V_0}{C_1 + C_2} = ${fmt3(Vf)}\,\text{V}$, so $Q_2 = C_2V = ${fmt3(Q2)}\,\mu\text{C}$.`,
          };
        }
        const U0 = C1 * V0 * V0 / 2, Uf = (C1 + C2) * Vf * Vf / 2, lost = U0 - Uf;
        if (mode === 'lost') {
          return {
            q: raw`${intro} How much electrostatic energy is lost (dissipated in the wires or radiated) in the process?`,
            ...GRE.numeric(R, lost, [U0, Uf, U0 / 2, lost * 2, C2 * V0 * V0 / 2], { unit: raw`\mu\text{J}`, fmt: fmt3, tol: 0.08 }),
            expl: raw`Initially $U_0 = \tfrac12C_1V_0^2 = ${fmt3(U0)}\,\mu\text{J}$. Finally $U = \frac{Q^2}{2(C_1+C_2)} = ${fmt3(Uf)}\,\mu\text{J}$. The difference, $${fmt3(lost)}\,\mu\text{J} = U_0\frac{C_2}{C_1+C_2}$, is lost — independent of the wire resistance.`,
          };
        }
        const t = x => { const e = fx(x); return e == null ? null : `$${e}$`; };
        const corr = C2 / (C1 + C2);
        return {
          q: raw`${intro} What fraction of the initially stored energy is lost in the process?`,
          ...mcv(R, corr, [C1 / (C1 + C2), 1 / 2, 0, (C2 / (C1 + C2)) ** 2, (C1 / (C1 + C2)) ** 2, 1 / 4, 3 / 4, 1], x => (x === 0 ? '$0$' : t(x))),
          expl: raw`$U_f/U_0 = \frac{Q^2/2(C_1+C_2)}{Q^2/2C_1} = \frac{C_1}{C_1+C_2}$, so the fraction lost is $\frac{C_2}{C_1+C_2} = ${fx(corr)}$ (half when the capacitors are equal).`,
        };
      },
    },
  ]);
  // ===================================================================== 2.2 MAGNETOSTATICS
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const axisName = v => { const i = v.findIndex(x => x !== 0); return i < 0 ? null : (v[i] > 0 ? '+' : '-') + 'xyz'[i]; };
  const axisTex = v => { const i = v.findIndex(x => x !== 0); return (v[i] > 0 ? '+' : '-') + hat('xyz'[i]); };
  const ALL_DIRS = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
  const GEO = { '+x': 'east', '-x': 'west', '+y': 'north', '-y': 'south', '+z': 'vertically upward', '-z': 'vertically downward' };
  const GEO_SHORT = { '+x': 'east', '-x': 'west', '+y': 'north', '-y': 'south', '+z': 'up', '-z': 'down' };
  // B fields with known curl: [B TeX, J coefficient TeX (times 1/mu0), J direction TeX]
  const BJ = [
    ['x\\,@y', 'c', '@z'], ['-y\\,@x + x\\,@y', '2c', '@z'], ['y\\,@x', '-c', '@z'], ['z\\,@x', 'c', '@y'],
    ['x\\,@z', '-c', '@y'], ['z\\,@y', '-c', '@x'], ['y\\,@z', 'c', '@x'], ['y^2\\,@x', '-2cy', '@z'],
    ['(x^2 + y^2)\\,@z', '2c', '(y\\,@x - x\\,@y)'], ['x^2\\,@y', '2cx', '@z'],
  ].map(([b, c, d]) => ({ b: H(b), c, d: H(d) }));
  const PART = [
    { n: 'proton', q: 1 }, { n: 'electron', q: -1 }, { n: 'positron', q: 1 }, { n: 'alpha particle', q: 2 },
    { n: 'antiproton', q: -1 }, { n: 'negative muon', q: -1 }, { n: 'singly ionized sodium atom', q: 1 }, { n: 'chloride ion (Cl$^-$)', q: -1 },
  ];
  const art = s => (/^[aeiou]/i.test(s) ? 'An ' : 'A ');
  const CYC = [
    { n: 'electron', q: 1, m: ME, mt: 'm_e = 9.11\\times10^{-31}\\,\\text{kg}' },
    { n: 'proton', q: 1, m: MP, mt: 'm_p = 1.67\\times10^{-27}\\,\\text{kg}' },
    { n: 'alpha particle', q: 2, m: 4 * MP, mt: 'm_\\alpha \\approx 4m_p = 6.68\\times10^{-27}\\,\\text{kg}' },
    { n: 'deuteron', q: 1, m: 2 * MP, mt: 'm_d \\approx 2m_p = 3.34\\times10^{-27}\\,\\text{kg}' },
  ];

  GRE.addTemplates('em', [
    // ------------------------------------------------------------- 2.2.1 Lorentz force, basic tools
    {
      id: 'em.lor.direction', sec: '2.2.1', level: 1, weight: 2,
      gen(R) {
        const mode = R.weighted(['particle', 'selector', 'wire', 'geo'], [4, 2, 2, 2]);
        const v = R.pick(ALL_DIRS);
        const par = mode === 'particle' && R.bool(0.12);
        const B = par ? (R.bool() ? v : v.map(x => -x)) : R.pick(ALL_DIRS.filter(d => d.every((x, i) => x * v[i] === 0)));
        const vxB = cross(v, B);
        if (mode === 'geo') {
          const p = R.pick(PART.slice(0, 5));
          const Fd = vxB.map(x => x * Math.sign(p.q));
          const lab = d => GEO_SHORT[axisName(d)];
          const corr = lab(Fd);
          const wr = ALL_DIRS.map(lab).filter(s => s !== corr).concat(['zero']);
          return {
            q: raw`${art(p.n)}${p.n} moves ${GEO[axisName(v)]} through a region where the magnetic field points ${GEO[axisName(B)]}. In which direction is the magnetic force on it? (Take east, north, and up as a right-handed set.)`,
            ...GRE.mc(R, corr, [lab(Fd.map(x => -x))].concat(R.shuffle(wr)), { keep: 1 }),
            expl: raw`$\mathbf{F} = q\mathbf{v}\times\mathbf{B}$. With east $= \hat{\mathbf{x}}$, north $= \hat{\mathbf{y}}$, up $= \hat{\mathbf{z}}$: $(${axisTex(v)})\times(${axisTex(B)}) = ${axisTex(vxB)}$ (${lab(vxB)})${p.q < 0 ? ', and the negative charge reverses it' : ''}, so the force points ${corr}.`,
          };
        }
        if (mode === 'wire') {
          const corr = `$${axisTex(vxB)}$`;
          const wr = ALL_DIRS.filter(d => axisName(d) !== axisName(vxB)).map(d => `$${axisTex(d)}$`).concat(['The force is zero.']);
          return {
            q: raw`A straight wire carries a current in the $${axisTex(v)}$ direction through a uniform magnetic field that points in the $${axisTex(B)}$ direction. What is the direction of the magnetic force on the wire?`,
            ...GRE.mc(R, corr, [`$${axisTex(vxB.map(x => -x))}$`].concat(R.shuffle(wr)), { keep: 1 }),
            expl: raw`$d\mathbf{F} = I\,d\mathbf{l}\times\mathbf{B}$: $(${axisTex(v)})\times(${axisTex(B)}) = ${axisTex(vxB)}$. (Current direction is the direction positive charge would move, so no sign flip is needed.)`,
          };
        }
        if (mode === 'selector') {
          const p = R.pick(PART);
          const E = vxB.map(x => -x);
          const corr = `$${axisTex(E)}$`;
          const wr = ALL_DIRS.filter(d => axisName(d) !== axisName(E)).map(d => `$${axisTex(d)}$`);
          return {
            q: raw`${art(p.n)}${p.n} moves with velocity along $${axisTex(v)}$ through a uniform magnetic field along $${axisTex(B)}$. In which direction must a uniform electric field point so that the particle passes through undeflected?`,
            ...GRE.mc(R, corr, [`$${axisTex(vxB)}$`].concat(R.shuffle(wr)), { keep: 1 }),
            expl: raw`Zero net force requires $q\mathbf{E} = -q\mathbf{v}\times\mathbf{B}$, i.e. $\mathbf{E} = -\mathbf{v}\times\mathbf{B}$, independent of the sign of the charge. Here $\mathbf{v}\times\mathbf{B} \propto ${axisTex(vxB)}$, so $\mathbf{E}$ points along $${axisTex(E)}$.`,
          };
        }
        const p = R.pick(PART);
        const Fd = vxB.map(x => x * Math.sign(p.q));
        const zero = Fd.every(x => x === 0);
        const corr = zero ? 'The force is zero.' : `$${axisTex(Fd)}$`;
        const wr = ALL_DIRS.filter(d => zero || axisName(d) !== axisName(Fd)).map(d => `$${axisTex(d)}$`).concat(zero ? [] : ['The force is zero.']);
        const first = zero ? `$${axisTex(cross(v, [v[1], v[2], v[0]]).every(x => x === 0) ? v : cross(v, [v[1], v[2], v[0]]))}$` : `$${axisTex(Fd.map(x => -x))}$`;
        return {
          q: raw`${art(p.n)}${p.n} moves with velocity in the $${axisTex(v)}$ direction through a uniform magnetic field that points in the $${axisTex(B)}$ direction. What is the direction of the magnetic force on it?`,
          ...GRE.mc(R, corr, [first].concat(R.shuffle(wr)), { keep: 1 }),
          expl: zero
            ? raw`$\mathbf{F} = q\mathbf{v}\times\mathbf{B} = 0$ because $\mathbf{v}$ is parallel (or antiparallel) to $\mathbf{B}$.`
            : raw`$\mathbf{F} = q\mathbf{v}\times\mathbf{B}$: $(${axisTex(v)})\times(${axisTex(B)}) = ${axisTex(vxB)}$${p.q < 0 ? ', reversed for a negative charge' : ''}, giving $${axisTex(Fd)}$.`,
        };
      },
    },
    {
      id: 'em.lor.selector', sec: '2.2.1', level: 2,
      gen(R) {
        const mode = R.weighted(['v', 'B', 'concept', 'ions'], [2, 2, 2, 1]);
        if (mode === 'concept') {
          const OUT = ['passes through undeflected', 'is deflected in the direction of the electric force on it', 'is deflected in the direction of the magnetic force on it', 'speeds up but is not deflected', 'slows down but is not deflected', 'moves in a circle of radius $mv/qB$ inside the device'];
          const SC = [
            ['the same charge and mass but twice the speed', 2], ['the same charge and mass but half the speed', 1], ['the same speed but opposite charge', 0],
            ['the same speed and charge but twice the mass', 0], ['the same speed but twice the charge', 0], ['the same charge but a smaller speed', 1], ['the same charge but a larger speed', 2],
          ];
          const [desc, k] = R.pick(SC);
          return {
            q: raw`In a velocity selector, crossed uniform fields $\mathbf{E}$ and $\mathbf{B}$ (both perpendicular to the beam) let positive ions of speed $v_0 = E/B$ pass straight through. A particle entering along the same line with ${desc}`,
            ...GRE.mc(R, OUT[k], OUT.filter((_, i) => i !== k)),
            expl: raw`The electric force $qE$ is independent of speed; the magnetic force $qvB$ grows with speed and is opposite to $qE$ when $v$ is along the beam. They balance only when $v = E/B$, regardless of charge (both forces flip with $q$) or mass. ${k === 2 ? 'Faster particles have $qvB > qE$ and veer toward the magnetic force.' : k === 1 ? 'Slower particles have $qvB < qE$ and veer toward the electric force.' : 'Here $v = E/B$ still holds, so it passes straight through.'}`,
          };
        }
        if (mode === 'ions') {
          const ion = R.pick([['proton', 1, 1], ['deuteron', 1, 2], ['alpha particle', 2, 4], ['singly ionized helium-4 atom', 1, 4]]);
          const V = R.pick([100, 200, 500, 1000, 2000, 5000]);
          const B = R.pick([0.05, 0.1, 0.2, 0.5]);
          const v = Math.sqrt(2 * ion[1] * QE * V / (ion[2] * MP));
          const E = v * B;
          return {
            q: raw`${art(ion[0])}${ion[0]}, starting from rest, is accelerated through $${V}\,\text{V}$ and then enters a velocity selector with a magnetic field of $${B}\,\text{T}$. What electric field strength lets it pass undeflected? (Take the mass to be ${ion[2] === 1 ? '' : ion[2] + ' times '}$m_p = 1.67\times10^{-27}\,\text{kg}$.)`,
            ...GRE.numeric(R, E, [v / B, E / Math.sqrt(2), E * Math.sqrt(2), E * 2], { unit: raw`\text{V/m}` }),
            expl: raw`From $\tfrac12mv^2 = qV$: $v = \sqrt{2qV/m} = ${F.num(v)}\,\text{m/s}$. Undeflected motion needs $qE = qvB$, so $E = vB = ${F.num(E)}\,\text{V/m}$.`,
            level: 3,
          };
        }
        const Vp = R.pick([50, 100, 200, 300, 500, 1000, 2000]), dmm = R.pick([1, 2, 4, 5, 10, 20]);
        const E = Vp / (dmm / 1000);
        const B = R.pick([1, 2, 5, 10, 20, 50, 100]) * 1e-3;
        if (mode === 'v') {
          const v = E / B;
          if (v > 3e7) throw new Error('too fast');
          return {
            q: raw`In a velocity selector, the electric field is produced by parallel plates $${dmm}\,\text{mm}$ apart held at a potential difference of $${Vp}\,\text{V}$, and a perpendicular magnetic field of $${F.num(B * 1e3)}\,\text{mT}$ is applied. What speed do particles need to pass through undeflected?`,
            ...GRE.numeric(R, v, [Vp / B, v / 1000, 2 * v], { unit: raw`\text{m/s}` }),
            expl: raw`$E = V/d = ${F.num(E)}\,\text{V/m}$. Balancing $qE = qvB$ gives $v = E/B = ${F.num(v)}\,\text{m/s}$, for any charge or mass.`,
            level: 1,
          };
        }
        const v = R.pick([1, 2, 4, 5, 8]) * Math.pow(10, R.pick([5, 6]));
        const Bn = E / v;
        if (Bn > 2 || Bn < 1e-4) throw new Error('odd field');
        return {
          q: raw`Ions of speed $${F.sci(v)}\,\text{m/s}$ are to pass undeflected through a velocity selector whose electric field is produced by plates $${dmm}\,\text{mm}$ apart with a potential difference of $${Vp}\,\text{V}$ between them. What magnetic field is required?`,
          ...GRE.numeric(R, Bn, [v / E, Vp / v, Bn * 1000, Bn / 10], { unit: raw`\text{T}` }),
          expl: raw`$E = V/d = ${F.num(E)}\,\text{V/m}$ and $qE = qvB$, so $B = E/v = ${F.num(Bn)}\,\text{T}$.`,
        };
      },
    },
    {
      id: 'em.lor.wire', sec: '2.2.1', level: 1,
      gen(R) {
        const mode = R.weighted(['num', 'loop', 'semi', 'shape'], [3, 1, 2, 2]);
        if (mode === 'num') {
          const I = R.pick([0.5, 1, 2, 3, 4, 5, 10]), L = R.pick([10, 20, 25, 40, 50, 80, 100]), B = R.pick([0.05, 0.1, 0.2, 0.4, 0.5, 0.8, 1.2]);
          const th = R.pick([90, 30, 150, 60]);
          const s = Math.sin(th * PI / 180), c = Math.abs(Math.cos(th * PI / 180));
          const Fm = I * (L / 100) * B * s;
          return {
            q: raw`A straight wire segment $${L}\,\text{cm}$ long carries a current of $${I}\,\text{A}$ in a uniform magnetic field of $${B}\,\text{T}$. The wire makes an angle of $${th}^\circ$ with the field. What is the magnitude of the magnetic force on the segment?`,
            ...GRE.numeric(R, Fm, [I * (L / 100) * B * c, I * (L / 100) * B, I * L * B * s, Fm / 2].filter(x => x > 0), { unit: raw`\text{N}` }),
            expl: raw`$F = ILB\sin\theta = (${I})(${F.num(L / 100)})(${B})\sin${th}^\circ = ${F.num(Fm)}\,\text{N}$. Only the component of the wire perpendicular to $\mathbf{B}$ matters.`,
          };
        }
        if (mode === 'loop') {
          const shape = R.pick(['a circular loop of radius $R$', 'a square loop of side $a$', 'an irregularly shaped closed loop', 'a rectangular loop of sides $a$ and $b$']);
          return {
            q: raw`A wire bent into ${shape} carries a steady current $I$ and lies in a plane perpendicular to a uniform magnetic field $B$. What is the net magnetic force on the loop?`,
            ...GRE.mc(R, 'Zero', ['$IB$ times the perimeter of the loop', '$IB$ times the area of the loop, divided by the perimeter', '$IB$ times the longest dimension of the loop', 'It depends on the direction of the current', '$IB$ times the area of the loop']),
            expl: raw`In a uniform field $\mathbf{F} = I\oint d\mathbf{l}\times\mathbf{B} = I\left(\oint d\mathbf{l}\right)\times\mathbf{B} = 0$, since $\oint d\mathbf{l} = 0$ for any closed loop. (A torque can still act, but here the loop's dipole moment is parallel to $\mathbf{B}$.)`,
          };
        }
        if (mode === 'semi') {
          const t = s => `$${s}$`;
          return {
            q: raw`A wire bent into a semicircle of radius $R$ carries current $I$ and lies in the plane perpendicular to a uniform magnetic field of magnitude $B$. What is the magnitude of the net magnetic force on the semicircle?`,
            ...GRE.mc(R, t('2IRB'), [t('\\pi IRB'), t('IRB'), t('0'), t('\\tfrac{\\pi}{2}IRB'), t('4IRB')]),
            expl: raw`In a uniform field the force on any wire depends only on the vector from its start to its end: $\mathbf{F} = I\,\mathbf{L}_{\text{chord}}\times\mathbf{B}$. The chord of a semicircle is its diameter $2R$, so $F = 2IRB$, not $\pi IRB$ (the arc length).`,
            level: 2,
          };
        }
        const I = R.pick([1, 2, 3, 4, 5]), D = R.pick([10, 20, 30, 40, 50]), S = D + R.pick([10, 20, 30, 50]), B = R.pick([0.1, 0.2, 0.5, 1]);
        const Fm = I * (D / 100) * B;
        return {
          q: raw`A wire of total length $${S}\,\text{cm}$, bent into an irregular shape, lies in a plane perpendicular to a uniform magnetic field of $${B}\,\text{T}$. Its ends are $${D}\,\text{cm}$ apart and it carries $${I}\,\text{A}$. What is the magnitude of the net magnetic force on the wire?`,
          ...GRE.numeric(R, Fm, [I * (S / 100) * B, I * ((S - D) / 100) * B, Fm / 2, I * Math.sqrt(S * D) / 100 * B], { unit: raw`\text{N}` }),
          expl: raw`For a uniform field, $\mathbf{F} = I\left(\int d\mathbf{l}\right)\times\mathbf{B} = I\,\mathbf{L}\times\mathbf{B}$, where $\mathbf{L}$ is the straight-line vector from one end to the other. So $F = I L B = (${I})(${F.num(D / 100)})(${B}) = ${F.num(Fm)}\,\text{N}$; the total length is irrelevant.`,
          level: 2,
        };
      },
    },
    {
      id: 'em.lor.maxwell', sec: '2.2.1', level: 2,
      gen(R) {
        const mode = R.weighted(['could', 'cannot', 'free', 'J'], [3, 2, 1, 3]);
        if (mode === 'J') {
          const e = R.pick(BJ);
          const show = (c, d, mu) => {
            const neg = c[0] === '-', cc = neg ? c.slice(1) : c;
            return mu === 'over' ? `$\\mathbf{J} = ${neg ? '-' : ''}\\dfrac{${cc}}{\\mu_0}\\,${d}$` : `$\\mathbf{J} = ${neg ? '-' : ''}\\mu_0 ${cc}\\,${d}$`;
          };
          const flip = c => (c[0] === '-' ? c.slice(1) : '-' + c);
          const others = R.shuffle(BJ.filter(x => x !== e)).slice(0, 4).map(x => show(x.c, x.d, 'over'));
          return {
            q: raw`In a certain region the static magnetic field is $\mathbf{B} = c\,(${e.b})$, where $c$ is a constant. What is the current density $\mathbf{J}$ in this region?`,
            ...GRE.mc(R, show(e.c, e.d, 'over'), [show(flip(e.c), e.d, 'over'), show(e.c, e.d, 'times')].concat(others), { keep: 2 }),
            expl: raw`Ampère's law in differential form (static case): $\nabla\times\mathbf{B} = \mu_0\mathbf{J}$. Here $\nabla\times\mathbf{B} = ${e.c}\,${e.d}$, so ${show(e.c, e.d, 'over')}. (Check: $\nabla\cdot\mathbf{B} = 0$, as it must be.)`,
          };
        }
        const divFree = FIELDS.filter(f => !f.div), divy = FIELDS.filter(f => f.div);
        let corr, wrong;
        if (mode === 'could') { corr = R.pick(divFree); wrong = R.pickN(divy, 4); }
        else if (mode === 'cannot') { corr = R.pick(divy); wrong = R.pickN(divFree, 4); }
        else { corr = R.pick(divFree.filter(f => !f.curl)); wrong = R.pickN(FIELDS.filter(f => f.curl || f.div), 4); }
        const show = f => `$\\mathbf{B} = c\\,(${f.t})$`;
        const w0 = wrong[0];
        return {
          q: {
            could: 'Which of the following could represent a static magnetic field? ($c$ is a nonzero constant with appropriate units.)',
            cannot: 'Which of the following could NOT represent a magnetic field? ($c$ is a nonzero constant with appropriate units.)',
            free: 'Which of the following could represent a static magnetic field in a region of space where there is no current? ($c$ is a nonzero constant with appropriate units.)',
          }[mode],
          ...GRE.mc(R, show(corr), wrong.map(show)),
          expl: {
            could: raw`Every magnetic field must satisfy $\nabla\cdot\mathbf{B} = 0$ (no magnetic monopoles). The correct field has zero divergence; a nonzero curl is allowed and just means currents are present, $\mathbf{J} = \nabla\times\mathbf{B}/\mu_0$. The others have $\nabla\cdot\mathbf{B} \neq 0$; e.g. $c\,(${w0.t})$ has divergence $${w0.divT}$.`,
            cannot: raw`Magnetic fields must have $\nabla\cdot\mathbf{B} = 0$. The field $c\,(${corr.t})$ has $\nabla\cdot\mathbf{B} = ${corr.divT} \neq 0$, so it would require magnetic charge. The other four are divergence-free (a curl merely indicates a current density).`,
            free: raw`With no current, a static field needs both $\nabla\cdot\mathbf{B} = 0$ and $\nabla\times\mathbf{B} = \mu_0\mathbf{J} = 0$. Only $c\,(${corr.t})$ satisfies both; e.g. $c\,(${w0.t})$ has divergence $${w0.divT}$ and curl $${w0.curlT}$.`,
          }[mode],
          level: mode === 'free' ? 3 : 2,
        };
      },
    },

    // ------------------------------------------------------------- 2.2.2 Ampère's law and Biot–Savart
    {
      id: 'em.amp.thick', sec: '2.2.2', level: 2, weight: 2,
      gen(R) {
        const mode = R.weighted(['uniform', 'power', 'ratio', 'tube', 'num'], [2, 2, 2, 2, 2]);
        if (mode === 'uniform') {
          const o = [raw`\dfrac{\mu_0 I s}{2\pi R^2}`, raw`\dfrac{\mu_0 I}{2\pi s}`, raw`\dfrac{\mu_0 I s^2}{2\pi R^3}`, raw`\dfrac{\mu_0 I s}{\pi R^2}`, raw`\dfrac{\mu_0 I}{2\pi R}`, raw`\dfrac{\mu_0 I s}{4\pi R^2}`].map(x => `$${x}$`);
          return {
            q: raw`A long straight cylindrical wire of radius $R$ carries a total current $I$ distributed uniformly over its cross section. What is the magnitude of the magnetic field at a distance $s < R$ from the axis?`,
            ...GRE.mc(R, o[0], o.slice(1)),
            expl: raw`Ampère's law on a circle of radius $s$: $B(2\pi s) = \mu_0 I_{\text{enc}} = \mu_0 I\frac{s^2}{R^2}$, so $B = \frac{\mu_0 Is}{2\pi R^2}$ — growing linearly inside and matching $\mu_0I/2\pi R$ at the surface.`,
            level: 1,
          };
        }
        if (mode === 'power') {
          const n = R.pick([1, 2, 3]);
          const t = (a, b, k) => `$${k ? k : ''}\\dfrac{\\mu_0 I\\,${pw('s', a) || '1'}}{2\\pi R^{${b}}}$`.replace('I\\,1', 'I');
          const corr = t(n + 1, n + 2);
          return {
            q: raw`A long straight cylindrical conductor of radius $R$ carries a total current $I$ with current density $J(s) = J_0\,(s/R)^{${n}}$ for $s < R$, where $s$ is the distance from the axis. What is the magnitude of the magnetic field at a distance $s < R$ from the axis?`,
            ...GRE.mc(R, corr, [t(n, n + 1), t(n + 2, n + 3), t(1, 2), t(n + 1, n + 2, `\\tfrac{${n + 2}}{2}`), t(n - 1, n)]),
            expl: raw`$I_{\text{enc}}(s) = \int_0^s J_0(s'/R)^{${n}}\,2\pi s'\,ds' \propto s^{${n + 2}}$, so $I_{\text{enc}} = I\,(s/R)^{${n + 2}}$. Ampère's law then gives $B = \frac{\mu_0 I_{\text{enc}}}{2\pi s} = ${corr.slice(1, -1)}$.`,
            level: 3,
          };
        }
        if (mode === 'ratio') {
          const FR = [[1, 4], [1, 3], [1, 2], [2, 3], [3, 4], [1, 1], [3, 2], [2, 1], [3, 1], [4, 1]];
          const [a, b] = R.pickN(FR, 2);
          const x1 = a[0] / a[1], x2 = b[0] / b[1];
          const e = x => (x <= 1 ? x : 1 / x);
          const corr = e(x1) / e(x2);
          const ex = x => { const t = fx(x); return t ? `$${t}$` : null; };
          const rt = x => (x === 1 ? 'R' : `${F.frac(Math.round(x * 12), 12)}R`);
          return {
            q: raw`A long straight wire of radius $R$ carries a steady current uniformly distributed over its cross section. What is the ratio $B_1/B_2$ of the magnetic field magnitude at distance $s_1 = ${rt(x1)}$ from the axis to that at $s_2 = ${rt(x2)}$?`,
            ...mcv(R, corr, [1 / corr, x2 / x1, x1 / x2, (x1 / x2) ** 2, (x2 / x1) ** 2, 1, 2 * corr, corr / 2], ex),
            expl: raw`Inside, $B = \frac{\mu_0Is}{2\pi R^2} \propto s$; outside, $B = \frac{\mu_0I}{2\pi s} \propto 1/s$. In units of $\mu_0I/2\pi R$: $B_1 = ${fx(e(x1))}$, $B_2 = ${fx(e(x2))}$, ratio $${fx(corr)}$.`,
          };
        }
        if (mode === 'tube') {
          const hole = R.bool(0.25);
          if (hole) {
            return {
              q: raw`A long hollow cylindrical conductor has inner radius $a$ and outer radius $b$ and carries current $I$ uniformly distributed over its cross section. What is the magnitude of the magnetic field at a distance $s < a$ from the axis (in the hollow)?`,
              ...GRE.mc(R, '$0$', [raw`$\dfrac{\mu_0 I}{2\pi s}$`, raw`$\dfrac{\mu_0 I}{2\pi a}$`, raw`$\dfrac{\mu_0 I s}{2\pi a^2}$`, raw`$\dfrac{\mu_0 I s}{2\pi (b^2 - a^2)}$`]),
              expl: raw`An Amperian circle of radius $s < a$ encloses no current, and by symmetry $B$ is constant around it, so $B = 0$ in the hollow.`,
            };
          }
          const o = [raw`\dfrac{\mu_0 I (s^2 - a^2)}{2\pi s (b^2 - a^2)}`, raw`\dfrac{\mu_0 I}{2\pi s}`, raw`\dfrac{\mu_0 I (s - a)}{2\pi s (b - a)}`, raw`\dfrac{\mu_0 I (b^2 - s^2)}{2\pi s (b^2 - a^2)}`, raw`\dfrac{\mu_0 I s}{2\pi b^2}`, raw`\dfrac{\mu_0 I (s^2 - a^2)}{2\pi b (b^2 - a^2)}`].map(x => `$${x}$`);
          return {
            q: raw`A long hollow cylindrical conductor has inner radius $a$ and outer radius $b$ and carries current $I$ uniformly distributed over its cross section. What is the magnitude of the magnetic field at a distance $s$ from the axis, where $a < s < b$?`,
            ...GRE.mc(R, o[0], o.slice(1)),
            expl: raw`The enclosed current is the fraction of the cross-sectional area inside $s$: $I_{\text{enc}} = I\frac{s^2 - a^2}{b^2 - a^2}$. Ampère's law: $B = \frac{\mu_0 I_{\text{enc}}}{2\pi s}$. Checks: $B = 0$ at $s = a$ and $B = \mu_0I/2\pi b$ at $s = b$.`,
            level: 3,
          };
        }
        const I = R.pick([2, 5, 10, 20, 50]), Rmm = R.pick([1, 2, 4, 5, 10]);
        const f = R.pick([0.25, 0.5, 2, 3, 4]);
        const s = Rmm * f / 1000, Rm = Rmm / 1000;
        const B = f <= 1 ? MU * I * s / (2 * PI * Rm * Rm) : MU * I / (2 * PI * s);
        return {
          q: raw`A long straight copper wire of radius $${Rmm}\,\text{mm}$ carries a current of $${I}\,\text{A}$ distributed uniformly over its cross section. What is the magnitude of the magnetic field $${F.num(Rmm * f)}\,\text{mm}$ from its axis? (Use $${MU_T}$.)`,
          ...GRE.numeric(R, B, f <= 1 ? [MU * I / (2 * PI * s), MU * I / (2 * PI * Rm), MU * I * s * s / (2 * PI * Rm ** 3)] : [MU * I * s / (2 * PI * Rm * Rm), MU * I / (2 * PI * Rm), MU * I / (2 * s)], { unit: raw`\text{T}` }),
          expl: f <= 1
            ? raw`Inside the wire only the fraction $(s/R)^2$ of the current is enclosed: $B = \frac{\mu_0Is}{2\pi R^2} = ${F.num(B)}\,\text{T}$.`
            : raw`Outside, the wire acts like a line current: $B = \frac{\mu_0I}{2\pi s} = ${F.num(B)}\,\text{T}$.`,
        };
      },
    },
    {
      id: 'em.amp.loopint', sec: '2.2.2', level: 1,
      gen(R) {
        if (R.bool(0.3)) {
          const TRUE = [
            'The value of $\\oint\\mathbf{B}\\cdot d\\mathbf{l}$ depends only on the currents that pass through the loop.',
            'Deforming the loop, without letting it cross any wire, leaves $\\oint\\mathbf{B}\\cdot d\\mathbf{l}$ unchanged.',
            'Reversing the direction in which the loop is traversed changes the sign of $\\oint\\mathbf{B}\\cdot d\\mathbf{l}$.',
            'A current that passes outside the loop can still change the magnetic field at points on the loop.',
          ];
          const FALSE = [
            'The magnetic field at each point of the loop is produced only by the currents that pass through it.',
            'If $\\oint\\mathbf{B}\\cdot d\\mathbf{l} = 0$, then $\\mathbf{B} = 0$ at every point on the loop.',
            'Ampère’s law can be used to find $\\mathbf{B}$ for any current distribution by choosing a convenient loop.',
            'Currents outside the loop contribute to $\\oint\\mathbf{B}\\cdot d\\mathbf{l}$ in proportion to their distance from the loop.',
          ];
          const nT = R.int(1, 3);
          const st = R.shuffle(R.pickN(TRUE, nT).map(x => [x, true]).concat(R.pickN(FALSE, 3 - nT).map(x => [x, false])));
          return {
            q: GRE.romanStem('Several long straight wires carry steady currents, and a closed Amperian loop is drawn among them. Which of the following statements is (are) true?', st.map(x => x[0])),
            ...GRE.roman(R, st.map(x => x[1])),
            expl: raw`$\oint\mathbf{B}\cdot d\mathbf{l} = \mu_0I_{\text{enc}}$: the integral counts only enclosed (linked) current, with sign set by the right-hand rule, and is unchanged by deforming the loop. But $\mathbf{B}$ itself at each point is produced by all currents; Ampère's law gives $B$ only when symmetry lets you pull it out of the integral. ` + st.map((x, i) => `${['I', 'II', 'III'][i]}: ${x[1] ? 'true' : 'false'}.`).join(' '),
            level: 2,
          };
        }
        const n = R.int(3, 5);
        const I = Array.from({ length: n }, () => R.pick([1, 2, 3, 4, 5, 6, 8, 10]));
        const out = I.map(() => R.bool());
        const inside = I.map(() => R.bool(0.6));
        if (!inside.some(Boolean) || inside.every(Boolean)) throw new Error('need inside and outside');
        const net = I.reduce((s, x, i) => s + (inside[i] ? (out[i] ? x : -x) : 0), 0);
        if (net === 0) throw new Error('zero');
        const all = I.reduce((s, x, i) => s + (out[i] ? x : -x), 0);
        const absIn = I.reduce((s, x, i) => s + (inside[i] ? x : 0), 0);
        const val = MU * net;
        const desc = I.map((x, i) => `$${x}\\,\\text{A}$ ${out[i] ? 'out of' : 'into'} the page (${inside[i] ? 'inside' : 'outside'} the loop)`).join(', ');
        return {
          q: raw`Long straight wires perpendicular to the page carry currents of ${desc}. What is $\oint\mathbf{B}\cdot d\mathbf{l}$ around the loop, traversed counterclockwise as seen on the page? (Use $${MU_T}$.)`,
          ...GRE.numeric(R, val, [-val, MU * absIn, MU * all === val ? MU * absIn * 2 : MU * all, val / (2 * PI), 2 * PI * val].filter(x => x !== 0), { unit: raw`\text{T}\cdot\text{m}`, allowSign: true }),
          expl: raw`Ampère's law: $\oint\mathbf{B}\cdot d\mathbf{l} = \mu_0I_{\text{enc}}$. For a counterclockwise loop the right-hand rule counts out-of-page currents as positive. Enclosed: $I_{\text{enc}} = ${net}\,\text{A}$, so the integral is $(4\pi\times10^{-7})(${net}) = ${F.num(val)}\,\text{T}\cdot\text{m}$. Wires outside the loop do not contribute.`,
        };
      },
    },
    {
      id: 'em.bs.loops', sec: '2.2.2', level: 2, weight: 2,
      gen(R) {
        const mode = R.weighted(['pie', 'twoarcs', 'hairpin', 'corner', 'polygon', 'segment'], [3, 2, 2, 2, 2, 2]);
        if (mode === 'pie' || mode === 'twoarcs') {
          const [p, q, deg] = R.pick([[1, 3, 60], [1, 2, 90], [2, 3, 120], [1, 1, 180], [3, 2, 270], [1, 4, 45], [3, 4, 135], [5, 3, 300], [1, 6, 30], [5, 6, 150]]);
          if (mode === 'pie') {
            const t = (n, d, bot) => `$${tf(n, d, '\\mu_0 I', bot || 'R')}$`;
            const corr = t(p, 4 * q);
            const wr = [t(p, 2 * q), t(1, 2), t(p, 4 * q, '\\pi R'), t(p, 8 * q), t(p * 2, q), t(1, 4)];
            return {
              q: raw`A closed loop of wire consists of a circular arc of radius $R$ subtending an angle of $${deg}^\circ$ at its center C, and two straight radial segments joining the ends of the arc to C. The loop carries current $I$. What is the magnitude of the magnetic field at C?`,
              ...GRE.mc(R, corr, wr),
              expl: raw`The radial segments contribute nothing at C ($d\mathbf{l}\parallel\hat{\mathbf{r}}$). For the arc, Biot–Savart gives $B = \frac{\mu_0 I}{4\pi R^2}\cdot R\theta = \frac{\mu_0 I\theta}{4\pi R}$ with $\theta = ${p === 1 && q === 1 ? '' : F.frac(p, q)}\pi$: $B = ${corr.slice(1, -1)}$. (A full circle, $\theta = 2\pi$, gives $\mu_0I/2R$.)`,
            };
          }
          const k = R.pick([2, 3, 4]);
          const t = (n, d) => `$${tf(n, d, '\\mu_0 I', 'a')}$`;
          const corr = t(p * (k - 1), 4 * q * k);
          const wr = [t(p * (k + 1), 4 * q * k), t(p, 4 * q), t(p, 4 * q * k), t(k - 1, 2 * k), `$${tf(p * (k - 1), 4 * q * k, '\\mu_0 I', '\\pi a')}$`, t(p * (k + 1), 2 * q * k)];
          return {
            q: raw`A closed loop of wire consists of two concentric circular arcs, of radii $a$ and $${k}a$, both subtending $${deg}^\circ$ at their common center C, joined at their ends by two straight radial segments. The loop carries current $I$. What is the magnitude of the magnetic field at C?`,
            ...GRE.mc(R, corr, wr),
            expl: raw`Radial segments give no field at C. Going around the loop, the current circulates in opposite senses on the two arcs, so their fields subtract: $B = \frac{\mu_0 I\theta}{4\pi}\left(\frac1a - \frac{1}{${k}a}\right)$ with $\theta = ${p === 1 && q === 1 ? '' : F.frac(p, q)}\pi$, giving $${corr.slice(1, -1)}$.`,
            level: 3,
          };
        }
        if (mode === 'hairpin') {
          const o = [raw`\dfrac{\mu_0 I}{4\pi R}(\pi + 2)`, raw`\dfrac{\mu_0 I}{4R}`, raw`\dfrac{\mu_0 I}{4\pi R}(\pi - 2)`, raw`\dfrac{\mu_0 I}{2\pi R}(\pi + 1)`, raw`\dfrac{\mu_0 I}{4\pi R}(\pi + 1)`, raw`\dfrac{\mu_0 I}{2R}`].map(x => `$${x}$`);
          return {
            q: raw`A long wire is bent into a hairpin shape: two long, straight, parallel sections a distance $2R$ apart, joined at one end by a semicircle of radius $R$. It carries current $I$. What is the magnitude of the magnetic field at the center of the semicircle?`,
            ...GRE.mc(R, o[0], o.slice(1)),
            expl: raw`Three contributions, all in the same direction: the semicircle gives $\frac{\mu_0I}{4R}$, and each semi-infinite straight section, whose end is at perpendicular distance $R$ from the point, gives half the infinite-wire value, $\frac{\mu_0I}{4\pi R}$. Total: $\frac{\mu_0I}{4\pi R}(\pi + 2)$.`,
            level: 3,
          };
        }
        if (mode === 'corner') {
          const o = [raw`\dfrac{\mu_0 I}{4\pi d}`, raw`\dfrac{\mu_0 I}{2\pi d}`, '0', raw`\dfrac{\mu_0 I}{\pi d}`, raw`\dfrac{\mu_0 I}{8\pi d}`, raw`\dfrac{\sqrt{2}\,\mu_0 I}{4\pi d}`].map(x => `$${x}$`);
          return {
            q: raw`A very long wire carrying current $I$ is bent at a right angle at point O, so that it consists of two semi-infinite straight legs. Point P lies on the extension of one leg beyond O, a distance $d$ from O. What is the magnitude of the magnetic field at P?`,
            ...GRE.mc(R, o[0], o.slice(1)),
            expl: raw`The leg that points toward P contributes nothing ($d\mathbf{l}\times\hat{\mathbf{r}} = 0$ along its own line). The other leg is semi-infinite with its end at O, and P lies on the perpendicular through that end at distance $d$, so it gives half the infinite-wire field: $B = \frac{\mu_0I}{4\pi d}$.`,
          };
        }
        if (mode === 'polygon') {
          const SH = [['square', 2 * Math.SQRT2], ['equilateral triangle', 4.5], ['regular hexagon', Math.sqrt(3)]];
          const [name, c] = R.pick(SH);
          const t = x => `$${cf(x)}\\dfrac{\\mu_0 I}{\\pi a}$`;
          const others = SH.filter(s => s[0] !== name).map(s => s[1]);
          return {
            q: raw`A wire loop in the shape of a ${name} with side $a$ carries current $I$. What is the magnitude of the magnetic field at the center of the loop?`,
            ...GRE.mc(R, t(c), [c / 2, 2 * c, c * Math.SQRT2, c / Math.SQRT2].concat(others).map(t)),
            expl: raw`A finite straight segment gives $B = \frac{\mu_0I}{4\pi s}(\sin\theta_1 + \sin\theta_2)$ at perpendicular distance $s$. ${{ square: 'For a square, $s = a/2$ and $\\theta = 45^\\circ$: each side gives $\\frac{\\sqrt2\\mu_0I}{2\\pi a}$; four sides give $\\frac{2\\sqrt2\\mu_0I}{\\pi a}$.', 'equilateral triangle': 'For a triangle, $s = a/(2\\sqrt3)$ and $\\theta = 60^\\circ$: each side gives $\\frac{3\\mu_0I}{2\\pi a}$; three sides give $\\frac{9\\mu_0I}{2\\pi a}$.', 'regular hexagon': 'For a hexagon, $s = \\sqrt3a/2$ and $\\theta = 30^\\circ$: each side gives $\\frac{\\mu_0I}{2\\sqrt3\\pi a}$; six sides give $\\frac{\\sqrt3\\mu_0I}{\\pi a}$.' }[name]}`,
            level: 3,
          };
        }
        const [hs, s0, hyp] = R.pick([[3, 4, 5], [4, 3, 5], [5, 12, 13], [12, 5, 13], [1, 1, 0]]);
        const ratio = hyp ? hs / hyp : 1 / Math.SQRT2;
        const halfT = hyp ? `${F.frac(hs, s0)}s` : 's';
        const t = x => `$${cf(x)}\\dfrac{\\mu_0 I}{2\\pi s}$`;
        const cosr = hyp ? s0 / hyp : 1 / Math.SQRT2;
        return {
          q: raw`A straight wire segment of length $${hyp ? F.frac(2 * hs, s0) + 's' : '2s'}$ carries current $I$. What is the magnitude of the magnetic field at a point a perpendicular distance $s$ from the midpoint of the segment? (The rest of the circuit is far away.)`,
          ...GRE.mc(R, t(ratio), [1, ratio / 2, 2 * ratio, cosr === ratio ? ratio * ratio : cosr, ratio * ratio].map(t)),
          expl: raw`$B = \frac{\mu_0I}{4\pi s}(\sin\theta_1 + \sin\theta_2)$, where each end is seen at angle $\theta$ from the perpendicular with $\sin\theta = \frac{L/2}{\sqrt{s^2 + (L/2)^2}}$. With $L/2 = ${halfT}$: $\sin\theta = ${fx(ratio)}$, so $B = \frac{\mu_0I}{2\pi s}\cdot${fx(ratio)}$ — less than the infinite-wire value.`,
          level: 3,
        };
      },
    },

    // ------------------------------------------------------------- 2.2.3 Standard configurations
    {
      id: 'em.mcfg.wires', sec: '2.2.3', level: 1, weight: 2,
      gen(R) {
        const mode = R.weighted(['single', 'earth', 'mid', 'zero', 'right'], [3, 1, 2, 2, 1]);
        if (mode === 'single' || mode === 'earth') {
          const I = R.pick([1, 2, 5, 10, 15, 20, 25, 50, 100]);
          if (mode === 'earth') {
            const Be = 5e-5, r = 2e-7 * I / Be;
            return {
              q: raw`A long straight power line carries a steady current of $${I}\,\text{A}$. At what distance from the line is its magnetic field equal in magnitude to the Earth's field, about $5\times10^{-5}\,\text{T}$? (Use $${MU_T}$.)`,
              ...GRE.numeric(R, r, [MU * I / (2 * Be), r / (2 * PI), Math.sqrt(r), 2 * r], { unit: raw`\text{m}` }),
              expl: raw`$B = \frac{\mu_0I}{2\pi r} = (2\times10^{-7})\frac{I}{r}$, so $r = \frac{(2\times10^{-7})(${I})}{5\times10^{-5}} = ${F.num(r)}\,\text{m}$.`,
            };
          }
          const r = R.pick([0.5, 1, 2, 4, 5, 10, 20, 50]);
          const B = 2e-7 * I / (r / 100);
          return {
            q: raw`A long straight wire carries a current of $${I}\,\text{A}$. What is the magnitude of the magnetic field $${r}\,\text{cm}$ from the wire? (Use $${MU_T}$.)`,
            ...GRE.numeric(R, B, [MU * I / (2 * r / 100), B / 2, B * 100], { unit: raw`\text{T}` }),
            expl: raw`Ampère's law: $B = \frac{\mu_0I}{2\pi r} = \frac{(4\pi\times10^{-7})(${I})}{2\pi(${F.num(r / 100)})} = ${F.num(B)}\,\text{T}$. ($\mu_0I/2R$ is the field at the center of a loop, not near a wire.)`,
          };
        }
        const I1 = R.int(1, 8), I2 = R.int(1, 8);
        if (I1 === I2) throw new Error('equal');
        const same = R.bool();
        const intro = raw`Two long parallel wires, 1 and 2, are a distance $d$ apart and carry currents $I_1 = ${I1}\,\text{A}$ and $I_2 = ${I2}\,\text{A}$ in ${same ? 'the same direction' : 'opposite directions'}.`;
        if (mode === 'mid') {
          const dc = R.pick([2, 4, 5, 10, 20]);
          const B = 2e-7 * (same ? Math.abs(I1 - I2) : I1 + I2) / (dc / 200);
          return {
            q: intro.replace('a distance $d$ apart', `$${dc}\\,\\text{cm}$ apart`) + raw` What is the magnitude of the magnetic field midway between them? (Use $${MU_T}$.)`,
            ...GRE.numeric(R, B, [2e-7 * (same ? I1 + I2 : Math.abs(I1 - I2)) / (dc / 200), B / 2, 2 * B, 2e-7 * Math.max(I1, I2) / (dc / 200)], { unit: raw`\text{T}` }),
            expl: raw`Each wire contributes $\frac{\mu_0I}{2\pi(d/2)}$ at the midpoint. By the right-hand rule, currents in ${same ? 'the same direction give opposite fields between the wires, so they subtract' : 'opposite directions give fields in the same direction between the wires, so they add'}: $B = \frac{\mu_0}{\pi d}${same ? `|I_1 - I_2|` : `(I_1 + I_2)`} = ${F.num(B)}\,\text{T}$.`,
          };
        }
        if (mode === 'zero') {
          let x;
          if (same) x = I1 / (I1 + I2);
          else x = I1 < I2 ? -I1 / (I2 - I1) : I1 / (I1 - I2);
          const fmt = v => { if (Math.abs(v) < 1e-9 || Math.abs(v - 1) < 1e-9) return null; const [n, d] = rat(v); const c = F.coef(n, d); return `$x = ${c === '-' ? '-' : c}d$`; };
          const wr = [same ? (I1 < I2 ? -I1 / (I2 - I1) : I1 / (I1 - I2)) : I1 / (I1 + I2), I2 / (I1 + I2), 1 / 2, same ? -I1 / (I1 + I2) : (I1 < I2 ? I1 / (I2 - I1) : -I2 / (I1 - I2)), I1 * I1 / (I1 * I1 + I2 * I2), -1, 2, 1 / 4, 3 / 4];
          return {
            q: raw`${intro} Wire 1 is at $x = 0$ and wire 2 is at $x = d$ on the $x$-axis. At what position on the $x$-axis (other than infinitely far away) is the net magnetic field zero?`,
            ...mcv(R, x, wr, fmt),
            expl: same
              ? raw`For parallel currents the fields oppose each other between the wires. Setting $\frac{I_1}{x} = \frac{I_2}{d - x}$ gives $x = \frac{I_1}{I_1 + I_2}d = ${fx(x)}d$ — closer to the weaker current.`
              : raw`For antiparallel currents the fields add between the wires, so the zero lies outside, beside the weaker current. Setting $\frac{I_1}{|x|} = \frac{I_2}{|x - d|}$ there gives $x = ${fx(x)}d$.`,
            level: 2,
          };
        }
        const [a, b] = R.pick([[3, 4], [4, 3], [6, 8], [5, 12], [12, 5], [8, 6]]);
        const B1 = 2e-7 * I1 / (a / 100), B2 = 2e-7 * I2 / (b / 100);
        const B = Math.hypot(B1, B2);
        return {
          q: raw`Two long parallel wires are $${Math.hypot(a, b)}\,\text{cm}$ apart and carry currents of $${I1}\,\text{A}$ and $${I2}\,\text{A}$. Point P is $${a}\,\text{cm}$ from the first wire and $${b}\,\text{cm}$ from the second. What is the magnitude of the magnetic field at P? (Use $${MU_T}$.)`,
          ...GRE.numeric(R, B, [B1 + B2, Math.abs(B1 - B2) || B / 3, 2e-7 * (I1 + I2) / (Math.hypot(a, b) / 200), B * 2], { unit: raw`\text{T}`, tol: 0.1 }),
          expl: raw`Since $${a}^2 + ${b}^2 = ${Math.hypot(a, b)}^2$, the lines from P to the two wires are perpendicular, so the two fields (each perpendicular to its own radius) are perpendicular too — regardless of the current directions. $B_1 = ${F.num(B1)}\,\text{T}$, $B_2 = ${F.num(B2)}\,\text{T}$, and $B = \sqrt{B_1^2 + B_2^2} = ${F.num(B)}\,\text{T}$.`,
          level: 3,
        };
      },
    },
    {
      id: 'em.mcfg.force', sec: '2.2.3', level: 2,
      gen(R) {
        const mode = R.weighted(['num', 'nature', 'scale', 'loop'], [3, 2, 2, 2]);
        if (mode === 'num') {
          const I1 = R.pick([1, 2, 3, 5, 10, 20]), I2 = R.pick([1, 2, 4, 5, 10, 15]), d = R.pick([1, 2, 5, 10, 20]), L = R.pick([1, 2, 3, 5]);
          const Fm = 2e-7 * I1 * I2 * L / (d / 100);
          return {
            q: raw`Two long parallel wires $${d}\,\text{cm}$ apart carry currents of $${I1}\,\text{A}$ and $${I2}\,\text{A}$. What is the magnitude of the magnetic force on a $${L}\,\text{m}$ length of either wire? (Use $${MU_T}$.)`,
            ...GRE.numeric(R, Fm, [Fm / L, MU * I1 * I2 * L / (d / 100), Fm / 2, 2e-7 * I1 * I2 * L / (d / 100) ** 2], { unit: raw`\text{N}` }),
            expl: raw`$F = \frac{\mu_0I_1I_2L}{2\pi d} = (2\times10^{-7})\frac{(${I1})(${I2})(${L})}{${F.num(d / 100)}} = ${F.num(Fm)}\,\text{N}$ — the same on both wires (Newton's third law), attractive for parallel currents.`,
            level: 1,
          };
        }
        if (mode === 'nature') {
          const m = R.pick([2, 3, 4]);
          const same = R.bool();
          const lab = (n, d, nat) => `$${tf(n, d, '\\mu_0 I^2', '\\pi d')}$, ${nat}`;
          const nat = same ? 'attractive' : 'repulsive', opp = same ? 'repulsive' : 'attractive';
          return {
            q: raw`Two long parallel wires a distance $d$ apart carry currents $I$ and $${m}I$ in ${same ? 'the same direction' : 'opposite directions'}. What is the magnetic force per unit length between them?`,
            ...GRE.mc(R, lab(m, 2, nat), [lab(m, 2, opp), lab(m, 1, nat), lab(m, 4, nat), lab(m * m, 2, nat), lab(1, 2, nat), lab(m + 1, 2, nat)]),
            expl: raw`Wire 1's field at wire 2 is $\frac{\mu_0I}{2\pi d}$, so the force per length on wire 2 is $${m}I\cdot\frac{\mu_0I}{2\pi d} = ${tf(m, 2, '\\mu_0 I^2', '\\pi d')}$. Parallel currents attract; antiparallel currents repel (the opposite of the rule for like charges).`,
          };
        }
        if (mode === 'scale') {
          const f1 = R.pick([1, 2, 3, 1 / 2]), f2 = R.pick([1, 2, 3, 1 / 2]), fd = R.pick([1, 2, 3, 4, 1 / 2]);
          const fac = f1 * f2 / fd;
          if (f1 === 1 && f2 === 1 && fd === 1) throw new Error('no change');
          const w = (f, s) => (f === 1 ? null : `${s} is ${f === 2 ? 'doubled' : f === 3 ? 'tripled' : f === 4 ? 'quadrupled' : 'halved'}`);
          const ch = [w(f1, 'the current in one wire'), w(f2, 'the current in the other wire'), w(fd, 'the separation')].filter(Boolean);
          const ex = x => { const e = fx(x); return e == null ? null : `$${e}$`; };
          return {
            q: raw`Two long parallel wires carry steady currents and exert a force per unit length $F$ on each other. If ${ch.join(', and ')}, the new force per unit length is how many times $F$?`,
            ...mcv(R, fac, [f1 * f2 / (fd * fd), f1 * f2 * fd, fd / (f1 * f2), Math.sqrt(f1 * f2) / fd, (f1 + f2) / (2 * fd), fac * 2, fac / 2], ex),
            expl: raw`$F/L = \frac{\mu_0I_1I_2}{2\pi d}$ is proportional to each current and inversely proportional to the separation (not its square): factor $= \frac{(${fx(f1)})(${fx(f2)})}{${fx(fd)}} = ${fx(fac)}$.`,
          };
        }
        const I1 = R.pick([5, 10, 20, 30]), I2 = R.pick([1, 2, 5, 10]);
        const a = R.pick([1, 2, 3, 5]), w = R.pick([1, 2, 3, 5, 10]), L = R.pick([10, 20, 30, 50]);
        const b = a + w;
        const Fn = 2e-7 * I1 * I2 * (L / 100) * (100 / a - 100 / b);
        return {
          q: raw`A rectangular loop carrying $${I2}\,\text{A}$ lies in the same plane as a long straight wire carrying $${I1}\,\text{A}$. The loop's two long sides, each $${L}\,\text{cm}$ long, are parallel to the wire at distances $${a}\,\text{cm}$ and $${b}\,\text{cm}$ from it, and the current in the near side is parallel to the wire's current. What is the magnitude of the net magnetic force on the loop? (Use $${MU_T}$.)`,
          ...GRE.numeric(R, Fn, [2e-7 * I1 * I2 * (L / 100) * (100 / a + 100 / b), 2e-7 * I1 * I2 * (L / 100) * (100 / a), 2e-7 * I1 * I2 * (L / 100) / (w / 100), Fn / 2], { unit: raw`\text{N}` }),
          expl: raw`The forces on the two short sides cancel. The near side (parallel current) is attracted with $\frac{\mu_0I_1I_2L}{2\pi a}$; the far side (antiparallel) is repelled with $\frac{\mu_0I_1I_2L}{2\pi b}$. Net: $(2\times10^{-7})I_1I_2L\left(\frac1a - \frac1b\right) = ${F.num(Fn)}\,\text{N}$, toward the wire.`,
          level: 3,
        };
      },
    },
    {
      id: 'em.mcfg.solenoid', sec: '2.2.3', level: 1,
      gen(R) {
        const mode = R.weighted(['num', 'scale', 'toroid', 'roman'], [3, 2, 2, 1]);
        if (mode === 'num') {
          const N = R.pick([100, 200, 300, 500, 1000, 2000]), L = R.pick([10, 20, 25, 40, 50, 100]), I = R.pick([0.5, 1, 2, 3, 5]);
          const B = MU * N * I / (L / 100);
          return {
            q: raw`A long solenoid $${L}\,\text{cm}$ long has $${N}$ turns and carries a current of $${I}\,\text{A}$. What is the magnitude of the magnetic field near its center? (Use $${MU_T}$.)`,
            ...GRE.numeric(R, B, [MU * N * I, B / 2, MU * N * I / (2 * PI * L / 100), MU * I / (L / 100)], { unit: raw`\text{T}` }),
            expl: raw`$B = \mu_0nI$ with $n = N/L = ${F.num(N / (L / 100))}\,\text{m}^{-1}$: $B = (4\pi\times10^{-7})(${F.num(N / (L / 100))})(${I}) = ${F.num(B)}\,\text{T}$.`,
          };
        }
        if (mode === 'scale') {
          const fN = R.pick([1, 2, 3, 1 / 2]), fL = R.pick([1, 2, 1 / 2]), fI = R.pick([1, 2, 3, 1 / 2]), fr = R.pick([1, 1, 2, 1 / 2, 3]);
          if (fN === 1 && fL === 1 && fI === 1) throw new Error('no change');
          const fac = fN * fI / fL;
          const w = (f, s) => (f === 1 ? null : `${s} is ${f === 2 ? 'doubled' : f === 3 ? 'tripled' : 'halved'}`);
          const ch = [w(fN, 'the number of turns'), w(fL, 'the length'), w(fI, 'the current'), w(fr, 'the radius')].filter(Boolean);
          const ex = x => { const e = fx(x); return e == null ? null : `$${e}$`; };
          return {
            q: raw`A long, tightly wound solenoid is modified: ${ch.join(', ')}${ch.length > 1 ? '' : ''}. By what factor does the magnetic field inside it change? (It remains long compared with its radius.)`,
            ...mcv(R, fac, [fac * fr, fac * fr * fr, fac / fr, fN * fI * fL, fN * fI, fac * 2, fac / 2, fac * fac], ex),
            expl: raw`$B = \mu_0\frac{N}{L}I$ depends on the turns per length and the current, not on the radius: factor $= \frac{(${fx(fN)})(${fx(fI)})}{${fx(fL)}} = ${fx(fac)}$.`,
            level: 2,
          };
        }
        if (mode === 'toroid') {
          const N = R.pick([200, 500, 1000, 1500, 2000]), I = R.pick([0.5, 1, 2, 4, 5]);
          const a = R.pick([4, 5, 8, 10, 15]), b = a + R.pick([1, 2, 4, 5]);
          const ask = R.pick(['num', 'ratio', 'out']);
          const intro = raw`A toroid with $${N}$ turns carries a current of $${I}\,\text{A}$. Its core (air) extends from an inner radius of $${a}\,\text{cm}$ to an outer radius of $${b}\,\text{cm}$.`;
          if (ask === 'num') {
            const r = (a + b) / 2;
            const B = MU * N * I / (2 * PI * r / 100);
            return {
              q: raw`${intro} What is the magnitude of the magnetic field inside the core, $${F.num(r)}\,\text{cm}$ from the toroid's central axis? (Use $${MU_T}$.)`,
              ...GRE.numeric(R, B, [MU * N * I / (r / 100), MU * N * I / (2 * r / 100), MU * I / (2 * PI * r / 100), MU * N * I / ((b - a) / 100)], { unit: raw`\text{T}` }),
              expl: raw`Ampère's law around a circle of radius $r$ inside the core encloses $NI$: $B = \frac{\mu_0NI}{2\pi r} = ${F.num(B)}\,\text{T}$.`,
            };
          }
          if (ask === 'ratio') {
            const ex = x => { const e = fx(x); return e == null ? null : `$${e}$`; };
            return {
              q: raw`${intro} What is the ratio of the magnetic field magnitude at the inner edge of the core to that at the outer edge?`,
              ...mcv(R, b / a, [a / b, 1, (b / a) ** 2, (a / b) ** 2, Math.sqrt(b / a)], ex),
              expl: raw`Inside a toroid $B = \frac{\mu_0NI}{2\pi r} \propto 1/r$, so $B_{\text{in}}/B_{\text{out}} = b/a = ${fx(b / a)}$. Unlike a solenoid, the field is not uniform across the core.`,
              level: 2,
            };
          }
          return {
            q: raw`${intro} What is the magnitude of the magnetic field at a point outside the toroid, in its plane, $${b + 5}\,\text{cm}$ from the central axis?`,
            ...GRE.mc(R, '$0$', [raw`$\dfrac{\mu_0 (${N})(${I}\,\text{A})}{2\pi (${b + 5}\,\text{cm})}$`, raw`$\dfrac{\mu_0 (${I}\,\text{A})}{2\pi (${b + 5}\,\text{cm})}$`, raw`$\dfrac{\mu_0 (${N})(${I}\,\text{A})}{2\pi (${b}\,\text{cm})}$`, raw`$\dfrac{\mu_0 (${N})(${I}\,\text{A})}{(${b + 5}\,\text{cm})}$`]),
            expl: raw`An Amperian circle outside the toroid is threaded by $N$ currents going one way and $N$ coming back: $I_{\text{enc}} = 0$, so $B = 0$ (ideal toroid).`,
          };
        }
        const TRUE = ['Far from the ends, the field inside a long solenoid is nearly uniform across its cross section.', 'The field outside a long solenoid (far from its ends) is nearly zero.', 'The field outside an ideal toroid is zero.', 'Inside a toroid, the field magnitude decreases with distance from the toroid’s central axis.'];
        const FALSE = ['The field inside a long solenoid is strongest on its axis and weakest near the windings.', 'Doubling both the number of turns and the length of a solenoid doubles the field inside.', 'Doubling the radius of a long solenoid (same turns per length and current) halves the field inside.', 'The field inside an ideal toroid is the same at every point of its core.'];
        const nT = R.int(1, 3);
        const st = R.shuffle(R.pickN(TRUE, nT).map(x => [x, true]).concat(R.pickN(FALSE, 3 - nT).map(x => [x, false])));
        return {
          q: GRE.romanStem('Which of the following statements about the magnetic fields of ideal solenoids and toroids carrying steady current is (are) true?', st.map(x => x[0])),
          ...GRE.roman(R, st.map(x => x[1])),
          expl: raw`Ampère's law with a rectangular loop gives $B = \mu_0nI$ inside a long solenoid (uniform, independent of radius) and $B \approx 0$ outside; for a toroid, a circular loop gives $B = \mu_0NI/2\pi r$ inside (falls as $1/r$) and $0$ outside. ` + st.map((x, i) => `${['I', 'II', 'III'][i]}: ${x[1] ? 'true' : 'false'}.`).join(' '),
          level: 2,
        };
      },
    },
    {
      id: 'em.mcfg.loop', sec: '2.2.3', level: 2,
      gen(R) {
        const mode = R.weighted(['center', 'axis', 'helm', 'wire'], [3, 3, 1, 1]);
        if (mode === 'center') {
          const N = R.pick([1, 10, 20, 50, 100, 200]), I = R.pick([0.5, 1, 2, 3, 5, 10]), r = R.pick([2, 5, 10, 15, 20, 25]);
          const B = MU * N * I / (2 * r / 100);
          return {
            q: raw`A flat circular coil of radius $${r}\,\text{cm}$ has ${N === 1 ? 'a single turn' : `$${N}$ turns`} and carries a current of $${I}\,\text{A}$. What is the magnitude of the magnetic field at its center? (Use $${MU_T}$.)`,
            ...GRE.numeric(R, B, [MU * N * I / (2 * PI * r / 100), MU * N * I / (r / 100), N === 1 ? B / 2 : MU * I / (2 * r / 100), B / 2], { unit: raw`\text{T}` }),
            expl: raw`Biot–Savart: every element of the loop is a distance $R$ away and perpendicular to $\hat{\mathbf{r}}$, giving $B = \frac{\mu_0NI}{2R} = ${F.num(B)}\,\text{T}$. ($\mu_0I/2\pi R$ is the long-wire formula.)`,
          };
        }
        if (mode === 'axis') {
          const Z = [['R', 1, Math.SQRT2 / 4], ['\\sqrt{3}\\,R', 3, 1 / 8], ['2R', 4, 1 / (5 * Math.sqrt(5))], ['\\tfrac{3}{4}R', 9 / 16, 64 / 125], ['\\tfrac{4}{3}R', 16 / 9, 27 / 125], ['\\sqrt{8}\\,R', 8, 1 / 27]];
          const [zt, z2, corr] = R.pick(Z);
          const ex = x => { const e = fx(x); return e == null ? null : `$${e}$`; };
          return {
            q: raw`A circular loop of radius $R$ carries a steady current. What is the ratio of the magnetic field magnitude on the axis, a distance $${zt}$ from the center, to the field at the center?`,
            ...mcv(R, corr, [1 / (1 + z2), Math.pow(1 + z2, -0.5), 1 / Math.pow(z2, 1.5), corr * 2, 1 / Math.pow(1 + z2, 2), 1 / (2 * (1 + z2))], ex),
            expl: raw`On the axis, $B(z) = \frac{\mu_0IR^2}{2(R^2+z^2)^{3/2}}$, so $\frac{B(z)}{B(0)} = \left(\frac{R^2}{R^2+z^2}\right)^{3/2} = ${fx(corr)}$ for $z = ${zt}$.`,
          };
        }
        if (mode === 'helm') {
          const same = R.bool(0.75);
          const o = [raw`\dfrac{8\mu_0 I}{5\sqrt{5}\,R}`, raw`\dfrac{\mu_0 I}{R}`, raw`\dfrac{4\mu_0 I}{5\sqrt{5}\,R}`, raw`\dfrac{\mu_0 I}{2R}`, '0', raw`\dfrac{16\mu_0 I}{5\sqrt{5}\,R}`].map(x => `$${x}$`);
          const corr = same ? o[0] : o[4];
          return {
            q: raw`Two identical coaxial circular loops of radius $R$ are a distance $R$ apart, and each carries current $I$ ${same ? 'in the same sense' : 'in opposite senses'}. What is the magnitude of the magnetic field on the axis midway between them?`,
            ...GRE.mc(R, corr, o.filter(x => x !== corr)),
            expl: same
              ? raw`Each loop is $z = R/2$ from the midpoint: $B_1 = \frac{\mu_0IR^2}{2(R^2 + R^2/4)^{3/2}} = \frac{4\mu_0I}{5\sqrt5R}$. The two fields add: $B = \frac{8\mu_0I}{5\sqrt5R}$ (the Helmholtz configuration, whose field is very uniform near the midpoint).`
              : raw`By symmetry the two loops produce equal and opposite fields at the midpoint, so $B = 0$ there (an anti-Helmholtz pair, used to make field gradients).`,
            level: 3,
          };
        }
        const o = ['$\\pi$', '$1$', '$2$', '$1/\\pi$', '$\\pi/2$', '$2\\pi$'];
        return {
          q: raw`The same current $I$ flows in a circular loop of radius $R$ and in a long straight wire. What is the ratio of the magnetic field at the center of the loop to the field at distance $R$ from the straight wire?`,
          ...GRE.mc(R, o[0], o.slice(1)),
          expl: raw`$B_{\text{loop}} = \frac{\mu_0I}{2R}$ and $B_{\text{wire}} = \frac{\mu_0I}{2\pi R}$, so the ratio is $\pi$.`,
          level: 1,
        };
      },
    },
    {
      id: 'em.mcfg.sheet', sec: '2.2.3', level: 2,
      gen(R) {
        if (R.bool(0.3)) {
          const K = R.pick([100, 200, 500, 1000, 2000, 5000]);
          const B = MU * K / 2;
          return {
            q: raw`A very large flat sheet carries a uniform surface current density of $${K}\,\text{A/m}$. What is the magnitude of the magnetic field near the sheet (but not too close to its edges)? (Use $${MU_T}$.)`,
            ...GRE.numeric(R, B, [MU * K, MU * K / (2 * PI), B / 2, MU * K / (4 * PI)], { unit: raw`\text{T}` }),
            expl: raw`A rectangular Amperian loop straddling the sheet gives $2BL = \mu_0KL$, so $B = \mu_0K/2 = ${F.num(B)}\,\text{T}$, independent of distance (like the electric field of a charged plane).`,
            level: 1,
          };
        }
        const m = [R.pick([1, 2, 3]) * R.sign(), R.pick([1, 2, 3]) * R.sign()];
        const region = R.int(0, 2);
        // B_y in units of mu0 K / 2 ; sheet at z_i with K = m_i K x-hat: B_y = -m_i sgn(z - z_i)
        const By = m.reduce((s, mi, i) => s - mi * (region > i ? 1 : -1), 0);
        const pt = ['z < 0', '0 < z < d', 'z > d'][region];
        const lab = h => (h === 0 ? 'zero' : `$${tf(Math.abs(h), 2, '\\mu_0 K', '')}$, in the ${dir('y', h)} direction`);
        const Kt = v => `$${v < 0 ? '-' : ''}${Math.abs(v) === 1 ? '' : Math.abs(v)}K\\,\\hat{\\mathbf{x}}$`;
        return {
          q: raw`Two very large parallel sheets lie in the planes $z = 0$ and $z = d$. They carry uniform surface current densities ${Kt(m[0])} and ${Kt(m[1])}, respectively ($K > 0$). What is the magnetic field in the region $${pt}$?`,
          ...GRE.mc(R, lab(By), [lab(-By), lab(2 * By), lab(By === 0 ? m[0] : 0), lab(By === 0 ? 2 * m[0] : By + (By > 0 ? 1 : -1)), lab(m[0] + m[1]), lab(-(m[0] + m[1])), lab(By === 0 ? -m[0] : By * 3), lab(By + 2), lab(By - 2), lab(By === 0 ? 4 : -2 * By)]),
          expl: raw`A sheet with current $K\hat{\mathbf{x}}$ produces $\mathbf{B} = \frac{\mu_0}{2}\mathbf{K}\times\hat{\mathbf{n}}$, where $\hat{\mathbf{n}}$ points from the sheet toward the field point: $-\frac{\mu_0K}{2}\hat{\mathbf{y}}$ above it and $+\frac{\mu_0K}{2}\hat{\mathbf{y}}$ below. Superposing both sheets in the region $${pt}$ gives $B_y = ${By === 0 ? '0' : tf(By, 2, '\\mu_0 K', '')}$.`,
        };
      },
    },

    // ------------------------------------------------------------- 2.2.4 Boundary conditions
    {
      id: 'em.bcB.jump', sec: '2.2.4', level: 2,
      gen(R) {
        const mode = R.weighted(['K', 'Kdir', 'below', 'which'], [3, 2, 2, 2]);
        const show = v => `$(${vec(v)})\\,\\text{mT}$`;
        const L = [1, 2, 3, 4, 5, 6];
        if (mode === 'K' || mode === 'Kdir') {
          const Bz = R.pick([0, 1, 2, 3, -1, -2]);
          const ax = R.int(0, 1);
          const d = R.pick(L) * R.sign();
          const up = [0, 0, Bz], dn = [0, 0, Bz];
          up[ax] = R.pick([-2, -1, 0, 1, 2, 3]); dn[ax] = up[ax] - d;
          const other = 1 - ax;
          up[other] = dn[other] = R.pick([0, 1, 2, -1]);
          const intro = raw`The plane $z = 0$ carries a surface current (no magnetic materials are present). Just above it the magnetic field is ${show(up)}; just below it the field is ${show(dn)}.`;
          if (mode === 'K') {
            const Kv = Math.abs(d) * 1e-3 / MU;
            return {
              q: raw`${intro} What is the magnitude of the surface current density? (Use $${MU_T}$.)`,
              ...GRE.numeric(R, Kv, [Kv / 2, 2 * Kv, Math.abs(d) * 1e-3 * MU * 1e9, Math.hypot(d, Bz) * 1e-3 / MU], { unit: raw`\text{A/m}` }),
              expl: raw`The tangential component of $\mathbf{B}$ jumps by $\mu_0K$: $|\Delta B_{\parallel}| = ${Math.abs(d)}\,\text{mT}$, so $K = \frac{${Math.abs(d)}\times10^{-3}}{4\pi\times10^{-7}} = ${F.num(Kv)}\,\text{A/m}$. The normal component $B_z$ is continuous, as it must be. ($\mu_0K/2$ is the field of an isolated sheet on each side, not the jump.)`,
            };
          }
          const dB = [0, 0, 0]; dB[ax] = d;
          const Kd = cross([0, 0, 1], dB);
          const corr = `$${axisTex(Kd)}$`;
          const wr = ALL_DIRS.filter(v => axisName(v) !== axisName(Kd)).map(v => `$${axisTex(v)}$`);
          return {
            q: raw`${intro} In which direction does the surface current flow?`,
            ...GRE.mc(R, corr, [`$${axisTex(Kd.map(x => -x))}$`].concat(R.shuffle(wr)), { keep: 1 }),
            expl: raw`The boundary condition $\mathbf{B}_{\text{above}} - \mathbf{B}_{\text{below}} = \mu_0\mathbf{K}\times\hat{\mathbf{n}}$ (with $\hat{\mathbf{n}} = \hat{\mathbf{z}}$ pointing from below to above) inverts to $\mathbf{K} = \frac{1}{\mu_0}\hat{\mathbf{n}}\times\Delta\mathbf{B}$. Here $\Delta\mathbf{B} \propto ${axisTex(dB)}$ and $\hat{\mathbf{z}}\times(${axisTex(dB)}) = ${axisTex(Kd)}$.`,
            level: 3,
          };
        }
        if (mode === 'below') {
          const muK = R.pick([1, 2, 3, 4]);
          const Kv = muK * 1e-3 / MU;
          const kax = R.int(0, 1);
          const Kvec = [0, 0, 0]; Kvec[kax] = R.sign();
          const jump = cross(Kvec, [0, 0, 1]).map(x => x * muK); // mu0 K x n
          const up = [R.pick([-2, -1, 0, 1, 2, 3]), R.pick([-2, -1, 0, 1, 2]), R.pick([1, 2, 3, -1, -2])];
          const dn = up.map((x, i) => x - jump[i]);
          const wr = [up.map((x, i) => x + jump[i]), up, dn.map((x, i) => (i === 2 ? x + R.pick([1, 2]) : x)), up.map((x, i) => x - jump[i] / 2), up.map((x, i) => (i === 2 ? x - muK : x))];
          return {
            q: raw`The plane $z = 0$ carries a uniform surface current $\mathbf{K} = ${Kvec[kax] < 0 ? '-' : ''}(${F.num(Kv, 2)}\,\text{A/m})\,${hat('xy'[kax])}$, and other sources are present elsewhere. Just above the plane the magnetic field is ${show(up)}. What is the field just below the plane? (Use $${MU_T}$.)`,
            ...GRE.mc(R, show(dn), wr.map(show)),
            expl: raw`$\mathbf{B}_{\text{above}} - \mathbf{B}_{\text{below}} = \mu_0\mathbf{K}\times\hat{\mathbf{z}}$, with $\mu_0K \approx ${muK}\,\text{mT}$ and $${axisTex(Kvec)}\times\hat{\mathbf{z}} = ${axisTex(jump)}$. So $\mathbf{B}_{\text{below}} = \mathbf{B}_{\text{above}} - (${vec(jump)})\,\text{mT} = (${vec(dn)})\,\text{mT}$; $B_z$ is unchanged.`,
            level: 3,
          };
        }
        const up = [R.pick([1, 2, 3, -1, -2]), R.pick([0, 1, 2, -1]), R.pick([1, 2, 3, 4, -1, -2, -3])];
        const corr = [up[0] + R.pick([-3, -2, 2, 3]), up[1] + R.pick([-1, 1, 2]), up[2]];
        const wr = [[up[0], up[1], up[2] + R.pick([1, 2])], [up[0], up[1], -up[2]], [corr[0], corr[1], up[2] - R.pick([1, 2])], [-up[0], -up[1], -up[2]], [up[0], up[1], 0]];
        return {
          q: raw`Just above a surface (the plane $z = 0$) that carries some surface current, the magnetic field is ${show(up)}. No magnetic materials are present. Which of the following could be the field just below the surface?`,
          ...GRE.mc(R, show(corr), wr.map(show)),
          expl: raw`$\nabla\cdot\mathbf{B} = 0$ (a Gaussian pillbox) forces the normal component $B_z$ to be continuous, while the tangential components may jump by $\mu_0K$. Only ${show(corr)} keeps $B_z = ${up[2]}\,\text{mT}$.`,
        };
      },
    },
    {
      id: 'em.bcB.roman', sec: '2.2.4', level: 2,
      gen(R) {
        const TRUE = [
          'The component of $\\mathbf{B}$ normal to the surface is continuous.',
          'The tangential component of $\\mathbf{B}$ perpendicular to $\\mathbf{K}$ changes by $\\mu_0 K$ across the surface.',
          'The tangential component of $\\mathbf{B}$ parallel to $\\mathbf{K}$ is continuous.',
          'The normal component of $\\mathbf{B}$ would remain continuous even if the surface also carried a surface charge.',
        ];
        const FALSE = [
          'The component of $\\mathbf{B}$ normal to the surface changes by $\\mu_0 K$.',
          'All components of $\\mathbf{B}$ are continuous across the surface.',
          'The tangential component of $\\mathbf{B}$ perpendicular to $\\mathbf{K}$ changes by $K/\\mu_0$.',
          'The tangential component of $\\mathbf{B}$ parallel to $\\mathbf{K}$ changes by $\\mu_0 K$.',
          'The normal component of $\\mathbf{B}$ changes by $\\mu_0 K/2$.',
        ];
        const nT = R.int(1, 3);
        const st = R.shuffle(R.pickN(TRUE, nT).map(s => [s, true]).concat(R.pickN(FALSE, 3 - nT).map(s => [s, false])));
        return {
          q: GRE.romanStem('A surface in vacuum carries a uniform surface current density $\\mathbf{K}$. Which of the following statements about the static magnetic field immediately on either side of the surface is (are) true?', st.map(s => s[0])),
          ...GRE.roman(R, st.map(s => s[1])),
          expl: raw`A pillbox and $\oint\mathbf{B}\cdot d\mathbf{a} = 0$ give $B^\perp_{\text{above}} = B^\perp_{\text{below}}$ always. A thin loop and Ampère's law give $\mathbf{B}^\parallel_{\text{above}} - \mathbf{B}^\parallel_{\text{below}} = \mu_0\mathbf{K}\times\hat{\mathbf{n}}$: only the tangential component perpendicular to $\mathbf{K}$ jumps, by $\mu_0K$. (Compare electrostatics, where $E^\perp$ jumps by $\sigma/\epsilon_0$ and $\mathbf{E}^\parallel$ is continuous.) ` +
            st.map((s, i) => `${['I', 'II', 'III'][i]}: ${s[1] ? 'true' : 'false'}.`).join(' '),
        };
      },
    },

    // ------------------------------------------------------------- 2.2.5 Work and energy
    {
      id: 'em.menergy.nowork', sec: '2.2.5', level: 1,
      gen(R) {
        const mode = R.weighted(['ke', 'roman', 'mc'], [2, 2, 2]);
        if (mode === 'ke') {
          const p = R.pick([['proton', 'MeV', [1, 2, 3, 5, 8]], ['electron', 'keV', [1, 2, 5, 10, 20]], ['alpha particle', 'MeV', [2, 4, 5, 6]], ['deuteron', 'MeV', [1, 2, 4]]]);
          const K0 = R.pick(p[2]), B = R.pick([0.2, 0.5, 0.8, 1, 1.5, 2]), t = R.pick([1, 2, 5, 10, 50]);
          const KK = x => `$${F.num(x, 3)}\\,\\text{${p[1]}}$`;
          return {
            q: raw`${art(p[0])}${p[0]} with kinetic energy $${K0}\,\text{${p[1]}}$ enters a region containing only a uniform static magnetic field of $${B}\,\text{T}$, directed perpendicular to its velocity. What is its kinetic energy after it has spent $${t}\,\text{ns}$ in the field (still inside the region)?`,
            ...GRE.mc(R, KK(K0), [KK(K0 / 2), KK(2 * K0), KK(K0 / 4), KK(K0 * 1.5), '$0$']),
            expl: raw`The magnetic force $q\mathbf{v}\times\mathbf{B}$ is always perpendicular to $\mathbf{v}$, so it does no work: $dK/dt = \mathbf{F}\cdot\mathbf{v} = 0$. The particle moves in a circle at constant speed, and its kinetic energy stays $${K0}\,\text{${p[1]}}$.`,
          };
        }
        if (mode === 'mc') {
          const corr = 'Its speed stays constant while the direction of its velocity changes.';
          return {
            q: raw`A charged particle moves through a region of space containing a static magnetic field but no electric field. Which of the following must be true?`,
            ...GRE.mc(R, corr, ['Its speed increases if it moves perpendicular to the field.', 'Its kinetic energy changes at a rate $qvB$.', 'It moves in a straight line, slowing down as it goes.', 'The magnetic force on it is parallel to its velocity.', 'Its momentum is constant.', 'It must move in a circle.']),
            expl: raw`$\mathbf{F} = q\mathbf{v}\times\mathbf{B}$ is perpendicular to $\mathbf{v}$, so the force does no work: speed and kinetic energy are constant while the direction (and hence momentum) can change. The path is a circle or a helix in a uniform field — and something more complicated in a nonuniform one.`,
          };
        }
        const TRUE = [
          'A static magnetic field cannot change the kinetic energy of a charged particle.',
          'The magnetic force on a moving charge is perpendicular to the charge’s velocity.',
          'A static magnetic field can change the direction of a charged particle’s velocity.',
          'Energy is stored in a magnetic field, with density $B^2/2\\mu_0$.',
        ];
        const FALSE = [
          'A static magnetic field can be used to speed up charged particles.',
          'The magnetic force on a moving charge is parallel to the magnetic field.',
          'A charge at rest in a uniform magnetic field feels a force proportional to $B$.',
          'The energy density of a magnetic field is $\\mu_0B^2/2$.',
          'A charged particle moving parallel to a uniform magnetic field feels the maximum magnetic force.',
        ];
        const nT = R.int(1, 3);
        const st = R.shuffle(R.pickN(TRUE, nT).map(s => [s, true]).concat(R.pickN(FALSE, 3 - nT).map(s => [s, false])));
        return {
          q: GRE.romanStem('Which of the following statements about magnetic forces and fields is (are) true?', st.map(s => s[0])),
          ...GRE.roman(R, st.map(s => s[1])),
          expl: raw`$\mathbf{F} = q\mathbf{v}\times\mathbf{B}$ vanishes for $\mathbf{v} = 0$ or $\mathbf{v}\parallel\mathbf{B}$ and is always perpendicular to $\mathbf{v}$ (and $\mathbf{B}$), so magnetic fields do no work — they only bend trajectories. Fields still store energy, $u_B = B^2/2\mu_0$. ` + st.map((s, i) => `${['I', 'II', 'III'][i]}: ${s[1] ? 'true' : 'false'}.`).join(' '),
          level: 2,
        };
      },
    },
    {
      id: 'em.menergy.density', sec: '2.2.5', level: 2,
      gen(R) {
        const mode = R.weighted(['u', 'solenoid', 'scale', 'compare'], [2, 2, 2, 1]);
        if (mode === 'u') {
          const B = R.pick([0.01, 0.05, 0.1, 0.2, 0.5, 1, 1.5, 2, 3, 5]);
          const u = B * B / (2 * MU);
          return {
            q: raw`What is the energy density of a magnetic field of $${B}\,\text{T}$ in vacuum? (Use $${MU_T}$.)`,
            ...GRE.numeric(R, u, [B * B / MU, u / 2, B / (2 * MU), u * 4 * PI], { unit: raw`\text{J/m}^3` }),
            expl: raw`$u_B = \frac{B^2}{2\mu_0} = \frac{(${B})^2}{2(4\pi\times10^{-7})} = ${F.num(u)}\,\text{J/m}^3$.`,
            level: 1,
          };
        }
        if (mode === 'solenoid') {
          const n = R.pick([1000, 2000, 5000, 10000]), I = R.pick([1, 2, 3, 5]), rc = R.pick([1, 2, 3, 5]), L = R.pick([20, 30, 50, 100]);
          const B = MU * n * I, V = PI * (rc / 100) ** 2 * (L / 100);
          const U = B * B / (2 * MU) * V;
          return {
            q: raw`A long air-core solenoid has $${n}$ turns per meter, radius $${rc}\,\text{cm}$, and length $${L}\,\text{cm}$, and carries a current of $${I}\,\text{A}$. Approximately how much energy is stored in its magnetic field? (Use $${MU_T}$; neglect end effects.)`,
            ...GRE.numeric(R, U, [2 * U, U / 2, B * B / (2 * MU) * (rc / 100) ** 2 * (L / 100), B * B * V / MU / (4 * PI)], { unit: raw`\text{J}` }),
            expl: raw`$B = \mu_0nI = ${F.num(B)}\,\text{T}$ inside (zero outside). $U = \frac{B^2}{2\mu_0}\times\pi r^2L = ${F.num(U)}\,\text{J}$ (equivalently $\tfrac12LI^2$ with $L = \mu_0n^2\pi r^2\ell$).`,
          };
        }
        if (mode === 'scale') {
          const fI = R.pick([1, 2, 3, 1 / 2]), fn = R.pick([1, 2, 1 / 2]), fL = R.pick([1, 2, 3]);
          if (fI === 1 && fn === 1 && fL === 1) throw new Error('no change');
          const fac = fI * fI * fn * fn * fL;
          const w = (f, s) => (f === 1 ? null : `${s} is ${f === 2 ? 'doubled' : f === 3 ? 'tripled' : 'halved'}`);
          const ch = [w(fI, 'the current'), w(fn, 'the number of turns per unit length'), w(fL, 'the length (at the same turns per unit length)')].filter(Boolean);
          const ex = x => { const e = fx(x); return e == null ? null : `$${e}$`; };
          return {
            q: raw`For a long solenoid, ${ch.join(', and ')}. By what factor does the magnetic energy stored in it change?`,
            ...mcv(R, fac, [fI * fn * fL, fI * fI * fn * fL, fI * fn * fn * fL, fac / fL, fac * fL, fac * 2, fac / 2], ex),
            expl: raw`$U = \frac{B^2}{2\mu_0}V$ with $B = \mu_0nI$ and $V \propto$ length: $U \propto n^2I^2\ell$. Factor: $(${fx(fn)})^2(${fx(fI)})^2(${fx(fL)}) = ${fx(fac)}$.`,
          };
        }
        const E = R.pick([1, 3, 10, 30, 100, 300]) * 1e3, B = R.pick([0.1, 0.5, 1, 2]) * 1e-3;
        const ratio = EPS * E * E / (B * B / MU);
        return {
          q: raw`In a certain region, the electric field has magnitude $${F.sci(E)}\,\text{V/m}$ and the magnetic field has magnitude $${F.num(B * 1e3)}\,\text{mT}$. What is the ratio $u_E/u_B$ of the electric to the magnetic energy density? (Use $c = 3\times10^{8}\,\text{m/s}$.)`,
          ...GRE.numeric(R, ratio, [E / (3e8 * B), 1 / ratio, 4 * ratio, 2 * ratio], {}),
          expl: raw`$\frac{u_E}{u_B} = \frac{\epsilon_0E^2/2}{B^2/2\mu_0} = \epsilon_0\mu_0\frac{E^2}{B^2} = \left(\frac{E}{cB}\right)^2 = \left(\frac{${F.sci(E)}}{${F.sci(3e8 * B)}}\right)^2 = ${F.num(ratio)}$. (For a light wave, $E = cB$ and the two are equal.)`,
          level: 3,
        };
      },
    },

    // ------------------------------------------------------------- 2.2.6 Cyclotron motion
    {
      id: 'em.cyc.radius', sec: '2.2.6', level: 2, weight: 2,
      gen(R) {
        const mode = R.weighted(['num', 'ratio', 'scale', 'spec', 'rel'], [3, 3, 2, 2, 1]);
        if (mode === 'num') {
          const p = R.pick(CYC);
          const elec = p.n === 'electron';
          const useK = R.bool();
          let v, given;
          if (useK) {
            const K = elec ? R.pick([100, 200, 500, 1000, 2000]) : R.pick([0.1, 0.5, 1, 2, 5, 10]) * 1e6;
            v = Math.sqrt(2 * K * QE / p.m);
            given = raw`kinetic energy $${elec ? K + '\\,\\text{eV}' : F.num(K / 1e6) + '\\,\\text{MeV}'}$`;
          } else {
            v = R.pick([1, 2, 3, 5]) * Math.pow(10, elec ? R.pick([6, 7]) : R.pick([5, 6]));
            given = raw`speed $${F.sci(v)}\,\text{m/s}$`;
          }
          const B = elec ? R.pick([1, 2, 5, 10, 20]) * 1e-3 : R.pick([0.1, 0.2, 0.5, 1, 1.5, 2]);
          const r = p.m * v / (p.q * QE * B);
          return {
            q: raw`${art(p.n)}${p.n} with ${given} moves perpendicular to a uniform magnetic field of $${elec ? F.num(B * 1e3) + '\\,\\text{mT}' : B + '\\,\\text{T}'}$. What is the radius of its circular orbit? ($${p.mt}$, $e = 1.6\times10^{-19}\,\text{C}$)`,
            ...GRE.numeric(R, r, [2 * r, r / 2, p.q > 1 ? 2 * r : r * Math.SQRT2, useK ? r / Math.SQRT2 : r * 4], { unit: raw`\text{m}` }),
            expl: raw`Setting $qvB = mv^2/r$ gives $r = \frac{mv}{qB}$${useK ? raw`, with $v = \sqrt{2K/m} = ${F.num(v)}\,\text{m/s}$` : ''}${p.q > 1 ? ' and $q = 2e$' : ''}: $r = ${F.num(r)}\,\text{m}$.`,
          };
        }
        if (mode === 'ratio' || mode === 'spec') {
          if (mode === 'spec') {
            const iso = R.pick([[12, 13, 'carbon'], [235, 238, 'uranium'], [6, 7, 'lithium'], [16, 18, 'oxygen'], [20, 22, 'neon'], [35, 37, 'chlorine'], [3, 4, 'helium']]);
            const V = R.pick([500, 1000, 2000, 5000]), B = R.pick([0.1, 0.2, 0.25, 0.5, 1]);
            const m = iso[0] * 1.66e-27;
            const r = Math.sqrt(2 * m * V / QE) / B;
            return {
              q: raw`In a mass spectrometer, singly charged $^{${iso[0]}}$${iso[2] === 'carbon' ? 'C' : iso[2] === 'uranium' ? 'U' : iso[2] === 'lithium' ? 'Li' : iso[2] === 'oxygen' ? 'O' : iso[2] === 'neon' ? 'Ne' : iso[2] === 'chlorine' ? 'Cl' : 'He'} ions start from rest, are accelerated through $${V}\,\text{V}$, and then enter a uniform magnetic field of $${B}\,\text{T}$ perpendicular to their velocity. What is the radius of their path? (Take $1\,\text{u} = 1.66\times10^{-27}\,\text{kg}$.)`,
              ...GRE.numeric(R, r, [2 * r, r / Math.SQRT2, Math.sqrt(m * V / QE) / B * 2, r * 4], { unit: raw`\text{m}` }),
              expl: raw`$qV = \tfrac12mv^2$ and $r = mv/qB$ combine to $r = \frac{1}{B}\sqrt{\frac{2mV}{q}} = ${F.num(r)}\,\text{m}$. Heavier isotopes land farther out, with $r \propto \sqrt m$.`,
            };
          }
          const P = [{ n: 'proton', q: 1, A: 1 }, { n: 'deuteron', q: 1, A: 2 }, { n: 'triton', q: 1, A: 3 }, { n: 'alpha particle', q: 2, A: 4 }, { n: 'helium-3 nucleus', q: 2, A: 3 }];
          const [a, b] = R.pickN(P, 2);
          const same = R.pick(['speed', 'momentum', 'kinetic energy', 'accelerating potential']);
          const rr = x => ({ speed: x.A / x.q, momentum: 1 / x.q, 'kinetic energy': Math.sqrt(x.A) / x.q, 'accelerating potential': Math.sqrt(x.A / x.q) }[same]);
          const corr = rr(a) / rr(b);
          if (Math.abs(corr - 1) < 1e-9) throw new Error('equal');
          const ex = x => { const e = fx(x); return e == null ? null : `$${e}$`; };
          const alt = ['speed', 'momentum', 'kinetic energy', 'accelerating potential'].filter(s => s !== same).map(s => ({ speed: (a.A / a.q) / (b.A / b.q), momentum: b.q / a.q, 'kinetic energy': (Math.sqrt(a.A) / a.q) / (Math.sqrt(b.A) / b.q), 'accelerating potential': Math.sqrt((a.A / a.q) / (b.A / b.q)) }[s]));
          return {
            q: raw`${art(a.n)}${a.n} and ${art(b.n).toLowerCase()}${b.n} move in circles perpendicular to the same uniform magnetic field. ${same === 'accelerating potential' ? 'Both were accelerated from rest through the same potential difference.' : `They have the same ${same}.`} What is the ratio $r_1/r_2$ of the ${a.n}'s orbit radius to the ${b.n}'s? (Take each mass to be its mass number times the proton mass.)`,
            ...mcv(R, corr, alt.concat([1 / corr, corr * corr, Math.sqrt(corr)]), ex),
            expl: raw`$r = \frac{mv}{qB} = \frac{p}{qB}$. ${{ speed: 'Same speed: $r \\propto m/q$.', momentum: 'Same momentum: $r \\propto 1/q$.', 'kinetic energy': 'Same kinetic energy: $p = \\sqrt{2mK}$, so $r \\propto \\sqrt{m}/q$.', 'accelerating potential': 'Same accelerating potential: $K = qV$, $p = \\sqrt{2mqV}$, so $r \\propto \\sqrt{m/q}$.' }[same]} Ratio: $${fx(corr)}$.`,
          };
        }
        if (mode === 'scale') {
          const what = R.pick(['speed', 'KE', 'B', 'Bv']);
          const f = R.pick([2, 3, 4, 1 / 2]);
          const corr = { speed: f, KE: Math.sqrt(f), B: 1 / f, Bv: 1 }[what];
          const word = f === 2 ? 'doubled' : f === 3 ? 'tripled' : f === 4 ? 'quadrupled' : 'halved';
          const txt = { speed: `its speed is ${word}`, KE: `its kinetic energy is ${word} (nonrelativistic)`, B: `the magnetic field is ${word}`, Bv: `both its speed and the magnetic field are ${word}` }[what];
          const ex = x => { const e = fx(x); return e == null ? null : `$${e}$`; };
          return {
            q: raw`A charged particle moves in a circle in a uniform magnetic field. If ${txt}, by what factor does the radius of its orbit change?`,
            ...mcv(R, corr, [f, 1 / f, f * f, 1 / (f * f), Math.sqrt(f), 1 / Math.sqrt(f), 1], ex),
            expl: raw`$r = \frac{mv}{qB} = \frac{\sqrt{2mK}}{qB}$. ${{ speed: 'Radius is proportional to speed.', KE: 'Radius scales as $\\sqrt{K}$.', B: 'Radius is inversely proportional to $B$.', Bv: 'The two changes cancel.' }[what]} Factor: $${fx(corr)}$.`,
            level: 1,
          };
        }
        const TR = [[3, 4, 5], [4, 3, 5], [5, 12, 13], [12, 5, 13], [8, 15, 17], [15, 8, 17]];
        const [bn, gd, gn] = R.pick(TR);  // beta = bn/gn, gamma = gn/gd
        const t = x => { const e = fx(x); return e == null ? null : `$${e === '1' ? '' : e + '\\,'}\\dfrac{mc}{qB}$`; };
        const corr = bn / gd;
        return {
          q: raw`A particle of mass $m$ and charge $q$ moves at speed $${F.frac(bn, gn)}\,c$ perpendicular to a uniform magnetic field $B$. What is the radius of its orbit?`,
          ...mcv(R, corr, [bn / gn, gn / gd, (bn / gn) * (gd / gn), (bn / gd) * (gn / gd), gd / bn], t),
          expl: raw`The relation $r = p/qB$ holds relativistically with $p = \gamma mv$. Here $\gamma = ${F.frac(gn, gd)}$, so $p = \gamma\beta mc = ${F.frac(bn, gd)}\,mc$ and $r = ${fx(corr)}\,\frac{mc}{qB}$. Using $mv$ gives the nonrelativistic $${F.frac(bn, gn)}\,mc/qB$.`,
          level: 3,
        };
      },
    },
    {
      id: 'em.cyc.freq', sec: '2.2.6', level: 1,
      gen(R) {
        const mode = R.weighted(['num', 'scale', 'half', 'rel'], [3, 2, 2, 1]);
        if (mode === 'num') {
          const p = R.pick(CYC);
          const B = R.pick([0.1, 0.2, 0.5, 1, 1.5, 2, 3]);
          const w = p.q * QE * B / p.m;
          const ask = R.pick(['f', 'w', 'T']);
          const val = { f: w / (2 * PI), w, T: 2 * PI / w }[ask];
          const unit = { f: raw`\text{Hz}`, w: raw`\text{rad/s}`, T: raw`\text{s}` }[ask];
          const wr = { f: [w, 2 * PI * w, val / 2], w: [w / (2 * PI), 2 * PI * w, w / 2], T: [1 / w, 2 * val, PI / w] }[ask];
          return {
            q: raw`${art(p.n)}${p.n} moves in a uniform magnetic field of $${B}\,\text{T}$. What is its ${{ f: 'cyclotron frequency $f$ (in revolutions per second)', w: 'cyclotron angular frequency $\\omega$', T: 'period of revolution' }[ask]}? ($${p.mt}$, $e = 1.6\times10^{-19}\,\text{C}$)`,
            ...GRE.numeric(R, val, wr, { unit }),
            expl: raw`$\omega = \frac{qB}{m} = ${F.num(w)}\,\text{rad/s}$, independent of speed (nonrelativistic). ${ask === 'f' ? raw`Then $f = \omega/2\pi = ${F.num(val)}\,\text{Hz}$.` : ask === 'T' ? raw`Then $T = 2\pi/\omega = ${F.num(val)}\,\text{s}$.` : 'Don’t confuse $\\omega$ with $f = \\omega/2\\pi$.'}`,
          };
        }
        if (mode === 'scale') {
          const what = R.pick(['speed', 'B', 'm', 'q', 'KE']);
          const f = R.pick([2, 3, 4, 1 / 2]);
          const corr = { speed: 1, B: 1 / f, m: f, q: 1 / f, KE: 1 }[what];
          const word = f === 2 ? 'doubled' : f === 3 ? 'tripled' : f === 4 ? 'quadrupled' : 'halved';
          const txt = { speed: `its speed is ${word}`, B: `the magnetic field is ${word}`, m: `its mass is ${word} (same charge)`, q: `its charge is ${word} (same mass)`, KE: `its kinetic energy is ${word}` }[what];
          const ex = x => { const e = fx(x); return e == null ? null : `$${e}$`; };
          return {
            q: raw`A charged particle moves in a circle in a uniform magnetic field at a nonrelativistic speed. If ${txt}, by what factor does the period of its orbit change?`,
            ...mcv(R, corr, [f, 1 / f, f * f, Math.sqrt(f), 1 / Math.sqrt(f), 1], ex),
            expl: raw`$T = \frac{2\pi m}{qB}$ is independent of speed (a faster particle moves on a proportionally larger circle). ${{ speed: 'So the period is unchanged.', KE: 'So the period is unchanged.', B: 'It is inversely proportional to $B$.', m: 'It is proportional to $m$.', q: 'It is inversely proportional to $q$.' }[what]} Factor: $${fx(corr)}$.`,
          };
        }
        if (mode === 'half') {
          const A = R.pick([1, 2, 4, 12, 16, 40]), B = R.pick([0.1, 0.2, 0.5, 1]);
          const t = PI * A * 1.66e-27 / (QE * B);
          return {
            q: raw`In a mass spectrometer, singly charged ions of mass $${A}\,\text{u}$ enter a uniform $${B}\,\text{T}$ magnetic field perpendicular to their velocity and travel a semicircle before striking a detector. How long does this take? (Take $1\,\text{u} = 1.66\times10^{-27}\,\text{kg}$.)`,
            ...GRE.numeric(R, t, [2 * t, t / PI, t / 2, t * 2 / PI], { unit: raw`\text{s}` }),
            expl: raw`Half a period: $t = \frac{T}{2} = \frac{\pi m}{qB} = ${F.num(t)}\,\text{s}$, independent of the ions' speed.`,
            level: 2,
          };
        }
        const [bn, gd, gn] = R.pick([[3, 4, 5], [4, 3, 5], [5, 12, 13], [12, 5, 13], [8, 15, 17]]);
        const ex = x => { const e = fx(x); return e == null ? null : `$${e}$`; };
        const corr = gd / gn;
        return {
          q: raw`A charged particle circles in a uniform magnetic field at speed $${F.frac(bn, gn)}\,c$. What is the ratio of its angular frequency to the nonrelativistic cyclotron frequency $qB/m$?`,
          ...mcv(R, corr, [1, gn / gd, (gd / gn) ** 2, bn / gn, gd / bn], ex),
          expl: raw`Relativistically $\frac{d\mathbf{p}}{dt} = q\mathbf{v}\times\mathbf{B}$ with $\mathbf{p} = \gamma m\mathbf{v}$ and constant $\gamma$, so $\omega = \frac{qB}{\gamma m}$. With $\gamma = ${F.frac(gn, gd)}$ the ratio is $${F.frac(gd, gn)}$ — why cyclotrons fail at relativistic energies.`,
          level: 3,
        };
      },
    },
    {
      id: 'em.cyc.helix', sec: '2.2.6', level: 2,
      gen(R) {
        const mode = R.weighted(['ratio', 'num', 'concept'], [2, 2, 1]);
        if (mode === 'ratio') {
          const [deg, cot] = R.pick([[30, Math.sqrt(3)], [45, 1], [60, 1 / Math.sqrt(3)]]);
          const t = x => { const e = fx(x); return e == null ? null : `$${cf(x)}\\pi$`; };
          const corr = t(2 * cot);
          const wr = [2 / cot, 2 * Math.cos(deg * PI / 180), cot, 2 * Math.sin(deg * PI / 180), 4 * cot, 1 / 2, 3].filter(x => Math.abs(x - 2 * cot) > 1e-9).map(t).filter(Boolean);
          return {
            q: raw`A charged particle enters a uniform magnetic field with its velocity at $${deg}^\circ$ to the field direction and moves on a helix. What is the ratio of the pitch of the helix (the distance advanced along $\mathbf{B}$ per revolution) to its radius?`,
            ...GRE.mc(R, corr, wr),
            expl: raw`$r = \frac{mv\sin\theta}{qB}$ and the pitch is $v\cos\theta\cdot T = \frac{2\pi mv\cos\theta}{qB}$, so pitch$/r = 2\pi\cot\theta = ${corr.slice(1, -1)}$ for $\theta = ${deg}^\circ$.`,
          };
        }
        if (mode === 'num') {
          const p = R.pick(CYC.slice(1));
          const v = R.pick([1, 2, 4, 5]) * 1e6, B = R.pick([0.1, 0.2, 0.5, 1]);
          const [deg, s, c] = R.pick([[30, 0.5, Math.sqrt(3) / 2], [60, Math.sqrt(3) / 2, 0.5], [45, Math.SQRT1_2, Math.SQRT1_2], [37, 0.6, 0.8], [53, 0.8, 0.6]]);
          const T = 2 * PI * p.m / (p.q * QE * B);
          const pitch = v * c * T;
          return {
            q: raw`${art(p.n)}${p.n} moves at $${F.sci(v)}\,\text{m/s}$ in a uniform $${B}\,\text{T}$ magnetic field, with its velocity at $${deg}^\circ$ to the field${deg === 37 || deg === 53 ? ` ($\\sin${deg}^\\circ \\approx ${deg === 37 ? '0.6' : '0.8'}$)` : ''}. What is the pitch of its helical path? ($${p.mt}$, $e = 1.6\times10^{-19}\,\text{C}$)`,
            ...GRE.numeric(R, pitch, [v * s * T, pitch / (2 * PI), v * T, v * s * T / (2 * PI)], { unit: raw`\text{m}` }),
            expl: raw`The period $T = \frac{2\pi m}{qB} = ${F.num(T)}\,\text{s}$ does not depend on the velocity. The pitch is the parallel velocity times $T$: $(v\cos${deg}^\circ)T = ${F.num(pitch)}\,\text{m}$.`,
            level: 3,
          };
        }
        const corr = 'a helix whose axis is parallel to $\\mathbf{B}$, traversed with a period independent of the angle';
        return {
          q: raw`A charged particle enters a region of uniform magnetic field $\mathbf{B}$ with a velocity that is neither parallel nor perpendicular to $\mathbf{B}$. Its subsequent path is`,
          ...GRE.mc(R, corr, ['a circle in the plane perpendicular to $\\mathbf{B}$', 'a parabola, like a projectile in a uniform gravitational field', 'a helix whose axis is perpendicular to $\\mathbf{B}$', 'a straight line along $\\mathbf{B}$, after the perpendicular velocity decays away', 'a helix whose pitch shrinks as it moves, because $\\mathbf{B}$ slows it down']),
          expl: raw`The force $q\mathbf{v}\times\mathbf{B}$ has no component along $\mathbf{B}$, so $v_\parallel$ is constant, while $v_\perp$ rotates at $\omega = qB/m$: circular motion superposed on uniform drift along $\mathbf{B}$, i.e. a helix with constant pitch $2\pi mv_\parallel/qB$.`,
          level: 1,
        };
      },
    },
  ]);
})(typeof window !== 'undefined' ? window.GRE : this.GRE);
