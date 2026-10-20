/* Quantum Mechanics, part B — §5.4–5.6 of Conquering the Physics GRE:
 * three dimensions (radial equation, angular momentum, hydrogen), spin
 * (spin-1/2, spin and the wavefunction, adding spins, identical particles)
 * and approximation methods (perturbation theory, variational principle,
 * adiabatic theorem). Templates follow tools/AUTHORING.md.
 */
(function (GRE) {
  'use strict';
  const F = GRE.fmt;
  const raw = String.raw;
  const T = []; // templates, registered at the end of the file

  // ---------------------------------------------------------------- helpers
  const HB = raw`\hbar`;
  /** exact rational as TeX (throws if not a simple rational) */
  const rat = x => {
    if (Math.abs(x) < 1e-12) return '0';
    const r = F.toRational(x, 2000);
    if (!r) throw new Error('rat: not rational ' + x);
    return F.frac(r[0], r[1]);
  };
  /** rational coefficient times a symbol: qx(1.5, '\\hbar') -> \frac{3}{2}\hbar */
  const qx = (x, s) => {
    const c = rat(x);
    if (!s) return c;
    return c === '0' ? '0' : c === '1' ? s : c === '-1' ? '-' + s : c + s;
  };
  /** real number written exactly (surds allowed) times a symbol */
  const ex = (x, s) => {
    if (Math.abs(x) < 1e-12) return '0';
    const c = F.exact(x, 64);
    if (c == null) throw new Error('ex: cannot write ' + x);
    if (!s) return c;
    return c === '1' ? s : c === '-1' ? '-' + s : c + s;
  };
  /** x * num / den as a single fraction: fr(1.5, '\\alpha', 'a') -> \frac{3\alpha}{2a} */
  const fr = (x, num, den) => {
    if (Math.abs(x) < 1e-12) return '0';
    const r = F.toRational(Math.abs(x), 2000);
    if (!r) throw new Error('fr: ' + x);
    const sg = x < 0 ? '-' : '';
    const top = (r[0] === 1 && num ? '' : String(r[0])) + (num || '');
    const bot = (r[1] === 1 ? '' : String(r[1])) + (den || '');
    return sg + (bot ? raw`\frac{${top}}{${bot}}` : top);
  };
  /** half-integer as TeX */
  const hf = x => F.frac(Math.round(2 * x), 2);
  const hfI = x => F.fracI(Math.round(2 * x), 2);
  const ROM = ['I', 'II', 'III'];

  /**
   * Multiple choice from numbers, formatted with fmt (TeX without $), sorted
   * ascending by value. Wrong values equal to the answer are dropped.
   */
  function mcv(R, correct, wrongs, fmt) {
    const val = new Map();
    const tex = x => '$' + fmt(x) + '$';
    const c = tex(correct);
    val.set(c, correct);
    const ws = [];
    for (const w of wrongs) {
      if (w == null || !isFinite(w)) continue;
      if (Math.abs(w - correct) < 1e-9 * Math.max(1, Math.abs(correct))) continue;
      let t;
      try { t = tex(w); } catch (e) { continue; }
      if (val.has(t)) continue;
      val.set(t, w);
      ws.push(t);
    }
    return GRE.mc(R, c, ws, { rank: t => val.get(t) });
  }
  /** common fractions used to pad probability choices */
  const PFILL = [0, 1, 1 / 2, 1 / 3, 2 / 3, 1 / 4, 3 / 4, 1 / 5, 2 / 5, 3 / 5, 4 / 5, 1 / 6, 5 / 6, 1 / 8, 3 / 8];

  /** Roman-numeral question from [statement, reason] pools */
  function romanQ(R, intro, TRUE, FALSE, lead) {
    const nTrue = R.int(1, 3);
    const st = R.shuffle(R.pickN(TRUE, nTrue).map(s => [s, true]).concat(R.pickN(FALSE, 3 - nTrue).map(s => [s, false])));
    return {
      q: GRE.romanStem(intro, st.map(x => x[0][0])),
      ...GRE.roman(R, st.map(x => x[1])),
      expl: (lead ? lead + ' ' : '') + st.map((x, i) => `${ROM[i]} is ${x[1] ? 'true' : 'false'}: ${x[0][1]}`).join(' '),
    };
  }
  /** single-answer "which statement is true/false" question from [statement, reason] pools */
  function pickTrue(R, intro, TRUE, FALSE, lead, wantFalse) {
    const good = wantFalse ? FALSE : TRUE, bad = wantFalse ? TRUE : FALSE;
    const c = R.pick(good);
    const ch = GRE.mc(R, c[0], R.pickN(bad, 4).map(x => x[0]));
    return { q: intro, ...ch, expl: (lead ? lead + ' ' : '') + c[1] };
  }

  // complex numbers as [re, im] with small integer parts
  const cadd = (a, b) => [a[0] + b[0], a[1] + b[1]];
  const csub = (a, b) => [a[0] - b[0], a[1] - b[1]];
  const cmul = (a, b) => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]];
  const cconj = a => [a[0], -a[1]];
  const cabs2 = a => a[0] * a[0] + a[1] * a[1];
  const ctex = ([a, b]) => {
    if (b === 0) return String(a);
    const bi = (b === 1 ? '' : b === -1 ? '-' : String(b)) + 'i';
    if (a === 0) return bi;
    return a + (b > 0 ? '+' : '') + bi;
  };
  /** linear combination sum c_k S_k as TeX */
  function lin(terms) {
    let out = '';
    terms.forEach((t, k) => {
      const [a, b] = t.c;
      let sign, body;
      if (b === 0) { sign = a < 0 ? '-' : '+'; body = Math.abs(a) === 1 ? '' : String(Math.abs(a)); }
      else if (a === 0) { sign = b < 0 ? '-' : '+'; body = (Math.abs(b) === 1 ? '' : String(Math.abs(b))) + 'i'; }
      else { sign = '+'; body = '(' + ctex([a, b]) + ')'; }
      out += (k === 0 ? (sign === '-' ? '-' : '') : ' ' + sign + ' ') + body + t.s;
    });
    return out;
  }
  const COEF = [[1, 0], [-1, 0], [2, 0], [-2, 0], [0, 1], [0, -1], [3, 0], [1, 1], [1, -1], [0, 2], [0, -2], [1, 0], [1, 0]];
  const Y = (l, m) => raw`Y_{${l}}^{${m}}`;
  const LETTER = 'spdfghik';
  /** two-component spinor as TeX */
  const spinor = (a, b, pre) => (pre || '') + raw`\begin{pmatrix} ${a} \\ ${b} \end{pmatrix}`;

  /** distinct total energies (ascending) of N particles in orbitals e[], at most cap per orbital */
  function fillEnergies(e, N, cap) {
    const K = e.length, res = new Set();
    (function rec(i, left, E) {
      if (left === 0) { res.add(Math.round(E * 1e6) / 1e6); return; }
      if (i === K) return;
      for (let k = 0; k <= Math.min(left, cap); k++) rec(i + 1, left - k, E + k * e[i]);
    })(0, N, 0);
    return Array.from(res).sort((a, b) => a - b);
  }
  /** orbital energies (sorted, with repetition) of a d-dimensional cubic box in units of the 1D E1 */
  function boxOrbitals(d, count) {
    const out = [];
    const M = 6;
    if (d === 1) for (let n = 1; n <= count; n++) out.push(n * n);
    if (d === 2) for (let a = 1; a <= M; a++) for (let b = 1; b <= M; b++) out.push(a * a + b * b);
    if (d === 3) for (let a = 1; a <= M; a++) for (let b = 1; b <= M; b++) for (let c = 1; c <= M; c++) out.push(a * a + b * b + c * c);
    return out.sort((x, y) => x - y).slice(0, count);
  }

  // ================================================================ 5.4.1 Radial equation and effective potential
  T.push({
    id: 'qm2.radial.effpot', sec: '5.4.1', level: 2,
    gen(R) {
      const kind = R.pick(['form', 'form', 'ratio', 'numeric', 'coulomb', 'coulomb']);
      if (kind === 'form') {
        const l = R.int(1, 6);
        const term = c => {
          if (c === 0) return '';
          const r = F.toRational(Math.abs(c), 4);
          return (c < 0 ? ' - ' : ' + ') + raw`\frac{${r[0] === 1 ? '' : r[0]}\hbar^2}{${r[1] === 1 ? '' : r[1]}mr^2}`;
        };
        const V = c => '$V(r)' + term(c) + '$';
        const wrong = [V(l * l / 2), V((l + 1) * (l + 1) / 2), V(-l * (l + 1) / 2), V(l * (l + 1)), V(l * (l - 1) / 2),
          raw`$V(r) + \frac{${l * (l + 1)}\hbar^2}{2mr}$`];
        return {
          q: raw`A particle of mass $m$ moves in a central potential $V(r)$. Writing $\psi = R(r)Y_l^m(\theta,\phi)$ and $u(r) = rR(r)$, the radial equation becomes $-\frac{\hbar^2}{2m}u'' + V_{\text{eff}}(r)\,u = Eu$. For a state with $l = ${l}$, what is $V_{\text{eff}}(r)$?`,
          ...GRE.mc(R, V(l * (l + 1) / 2), wrong),
          expl: raw`$V_{\text{eff}} = V(r) + \frac{\hbar^2 l(l+1)}{2mr^2}$; with $l(l+1) = ${l * (l + 1)}$ the centrifugal term is ${term(l * (l + 1) / 2).replace(' + ', '$').trim()}$. It is repulsive and comes from $L^2 = l(l+1)\hbar^2$, not $l^2\hbar^2$.`,
        };
      }
      if (kind === 'ratio') {
        const [l1, l2] = R.pickN([1, 2, 3, 4, 5, 6], 2);
        const f = (a, b) => a / b;
        const c = f(l1 * (l1 + 1), l2 * (l2 + 1));
        return {
          q: raw`For a particle in a central potential, compare the centrifugal term in the effective radial potential for a state with $l = ${l1}$ to that for a state with $l = ${l2}$, at the same radius. What is the ratio (term for $l=${l1}$)/(term for $l=${l2}$)?`,
          ...mcv(R, c, [f(l1 * l1, l2 * l2), f((l1 + 1) * (l1 + 1), (l2 + 1) * (l2 + 1)), f(l1, l2), 1 / c, f(l1 * (l1 - 1) || 1, l2 * (l2 - 1) || 1), f(2 * l1 + 1, 2 * l2 + 1)], rat),
          expl: raw`The centrifugal term is $\hbar^2 l(l+1)/(2mr^2)$, so the ratio is $\frac{${l1}\cdot${l1 + 1}}{${l2}\cdot${l2 + 1}} = ${rat(c)}$. Using $l^2$ instead of $l(l+1)$ is the usual trap.`,
        };
      }
      if (kind === 'numeric') {
        const l = R.int(1, 4);
        const r = R.pick([0.1, 0.2, 0.3, 0.5, 1]);
        const k = GRE.C.hbar * GRE.C.hbar / (2 * GRE.C.me) / GRE.C.eV * 1e18; // eV nm^2
        const v = l * (l + 1) * k / (r * r);
        return {
          q: raw`An electron in a central potential is in a state with $l = ${l}$. What is the magnitude of the centrifugal term in its effective radial potential at $r = ${r}\,\text{nm}$? (Use $\hbar^2/2m_e \approx ${F.num(k, 2)}\,\text{eV}\cdot\text{nm}^2$.)`,
          ...GRE.numeric(R, v, [v * l / (l + 1), 2 * v, v / Math.sqrt(l * (l + 1)), v * 4 * Math.PI * Math.PI], { unit: raw`\text{eV}` }),
          expl: raw`$\frac{\hbar^2 l(l+1)}{2m_e r^2} = ${l * (l + 1)}\times\frac{${F.num(k, 2)}\,\text{eV nm}^2}{(${r}\,\text{nm})^2} \approx ${F.num(v, 2)}\,\text{eV}$. The factor is $l(l+1)$, not $l^2$.`,
        };
      }
      // coulomb: minimum of effective potential
      const Z = R.pick([1, 1, 2, 3]), l = R.int(1, 5);
      const c = l * (l + 1) / Z;
      const atom = Z === 1 ? 'the hydrogen atom' : Z === 2 ? raw`the hydrogen-like ion $\text{He}^{+}$ ($Z = 2$)` : raw`the hydrogen-like ion $\text{Li}^{2+}$ ($Z = 3$)`;
      return {
        q: raw`In ${atom}, at what radius does the effective radial potential $V_{\text{eff}}(r) = -\frac{Ze^2}{4\pi\epsilon_0 r} + \frac{\hbar^2 l(l+1)}{2\mu r^2}$ have its minimum for $l = ${l}$? Here $a = 4\pi\epsilon_0\hbar^2/(\mu e^2)$ is the Bohr radius.`,
        ...mcv(R, c, [l * l / Z, (l + 1) * (l + 1) / Z, c / 2, 2 * c, l * (l + 1) / (Z * Z), l * (l + 1) * Z, l / Z], x => qx(x, 'a')),
        expl: raw`Setting $dV_{\text{eff}}/dr = \frac{Ze^2}{4\pi\epsilon_0 r^2} - \frac{\hbar^2 l(l+1)}{\mu r^3} = 0$ gives $r = \frac{l(l+1)}{Z}\,a = ${qx(c, 'a')}$.`,
      };
    },
  });

  T.push({
    id: 'qm2.radial.wavefn', sec: '5.4.1', level: 3,
    gen(R) {
      const kind = R.pick(['mp', 'mean', 'inv', 'norm', 'pmean', 'ptail']);
      if (kind === 'pmean' || kind === 'ptail') {
        const p2 = R.pick([5, 6, 7, 8, 9]); // 2p
        const p = p2 / 2;
        const stem = raw`A particle in three dimensions has the normalized, spherically symmetric wavefunction $\psi(r) = A\,r^{-${F.fracI(p2, 2)}}$ for $r \ge a$ and $\psi = 0$ for $r < a$, where $A$ is a constant.`;
        if (kind === 'pmean') {
          const c = (2 * p - 3) / (2 * p - 4);
          return {
            q: stem + raw` What is $\langle r\rangle$?`,
            ...mcv(R, c, [(2 * p - 1) / (2 * p - 2), 1 / c, 1, 2 * c, (p - 1) / (p - 2), (2 * p - 3) / (2 * p - 2)], x => qx(x, 'a')),
            expl: raw`With $d^3r = 4\pi r^2dr$: $\langle r\rangle = \frac{\int_a^\infty r\cdot r^{-${p2}} r^2dr}{\int_a^\infty r^{-${p2}}r^2dr} = \frac{a^{${4 - p2}}/${p2 - 4}}{a^{${3 - p2}}/${p2 - 3}} = ${qx(c, 'a')}$. Forgetting the $r^2$ of the volume element gives a wrong answer.`,
          };
        }
        const k = R.pick([2, 3]);
        const P = Math.pow(k, 3 - 2 * p);
        return {
          q: stem + raw` What is the probability of finding the particle at $r > ${k}a$?`,
          ...mcv(R, P, [Math.pow(k, 1 - 2 * p), Math.pow(k, -p), Math.pow(k, -2 * p), 1 - P, P * k, Math.pow(k, 2 - 2 * p)], rat),
          expl: raw`$P(r > ${k}a) = \frac{\int_{${k}a}^\infty r^{${2 - p2}}dr}{\int_a^\infty r^{${2 - p2}}dr} = ${k}^{-${p2 - 3}} = ${rat(P)}$; the $r^2$ from the volume element must be kept.`,
        };
      }
      const b = R.pick(['b', 'r_0', 'a', raw`\lambda`]);
      const k = kind === 'norm' ? R.int(0, 1) : R.int(0, 3);
      const rk = k === 0 ? '' : k === 1 ? 'r\\,' : `r^{${k}}`;
      const stem = raw`A particle has wavefunction $\psi(r,\theta,\phi) = R(r)\,Y_{${k}}^{0}(\theta,\phi)$, where $Y_{${k}}^{0}$ is a normalized spherical harmonic and $R(r) = A\,${rk}e^{-r/${b}}$ with $A$ a normalization constant.`;
      if (kind === 'mp') {
        const c = k + 1;
        return {
          q: stem + ' At what distance $r$ from the origin is the particle most likely to be found?',
          ...mcv(R, c, [k, (2 * k + 3) / 2, (k + 1) / 2, 2 * (k + 1), k + 2, (2 * k + 1) / 2], x => qx(x, b)),
          expl: raw`The radial probability density is $P(r) = |R|^2 r^2 \propto r^{${2 * k + 2}}e^{-2r/${b}}$, maximal where $\frac{${2 * k + 2}}{r} = \frac{2}{${b}}$, i.e. $r = ${qx(c, b)}$. (The maximum of $|R|$ alone, without $r^2$, is a trap.)`,
        };
      }
      if (kind === 'mean') {
        const c = (2 * k + 3) / 2;
        return {
          q: stem + raw` What is $\langle r\rangle$?`,
          ...mcv(R, c, [(2 * k + 1) / 2, k + 1, 2 * k + 3, (2 * k + 3) / 4, (2 * k + 5) / 2, k + 2], x => qx(x, b)),
          expl: raw`$\langle r\rangle = \frac{\int r^{${2 * k + 3}}e^{-2r/${b}}dr}{\int r^{${2 * k + 2}}e^{-2r/${b}}dr} = \frac{${2 * k + 3}!\,(${b}/2)^{${2 * k + 4}}}{${2 * k + 2}!\,(${b}/2)^{${2 * k + 3}}} = ${qx(c, b)}$, using $\int_0^\infty r^n e^{-\alpha r}dr = n!/\alpha^{n+1}$.`,
        };
      }
      if (kind === 'inv') {
        const c = 1 / (k + 1);
        const f = x => fr(x, '', b);
        return {
          q: stem + raw` What is $\langle 1/r\rangle$?`,
          ...mcv(R, c, [2 / (2 * k + 3), 1 / (2 * (k + 1)), 2 / (k + 1), 1 / (2 * k + 1), 2 / (2 * k + 1), k ? 1 / k : 3], f),
          expl: raw`$\langle 1/r\rangle = \frac{\int r^{${2 * k + 1}}e^{-2r/${b}}dr}{\int r^{${2 * k + 2}}e^{-2r/${b}}dr} = \frac{2}{${b}}\cdot\frac{1}{${2 * k + 2}} = ${f(c)}$. Note $\langle 1/r\rangle \ne 1/\langle r\rangle$.`,
        };
      }
      // norm
      const B = s => b + '^{' + s + '}';
      const correct = k === 0 ? raw`$\dfrac{2}{${B('3/2')}}$` : raw`$\dfrac{2}{\sqrt{3}\,${B('5/2')}}$`;
      const wrong = k === 0
        ? [raw`$\dfrac{1}{\sqrt{\pi}\,${B('3/2')}}$`, raw`$\dfrac{1}{${B('3/2')}}$`, raw`$\sqrt{\dfrac{2}{${b}}}$`, raw`$\dfrac{4}{${B('3')}}$`, raw`$\dfrac{\sqrt{2}}{${B('3/2')}}$`]
        : [raw`$\dfrac{2}{${B('3/2')}}$`, raw`$\dfrac{1}{\sqrt{3}\,${B('5/2')}}$`, raw`$\dfrac{4}{3${B('5')}}$`, raw`$\dfrac{2}{\sqrt{3}\,${B('3/2')}}$`, raw`$\sqrt{\dfrac{2}{3}}\,\dfrac{1}{${B('5/2')}}$`];
      return {
        q: stem + ' If $R$ is normalized separately from the angular part, what is $A$?',
        ...GRE.mc(R, correct, wrong),
        expl: raw`The radial normalization is $\int_0^\infty |R|^2 r^2\,dr = 1$: $A^2\int_0^\infty r^{${2 * k + 2}}e^{-2r/${b}}dr = A^2\,${2 * k + 2}!\,(${b}/2)^{${2 * k + 3}} = 1$, so $A = ${correct.slice(1, -1).replace(/\\dfrac/g, '\\frac')}$. The $r^2$ belongs to the radial integral; the angular factor is already normalized.`,
      };
    },
  });

  T.push({
    id: 'qm2.radial.sphere', sec: '5.4.1', level: 2,
    gen(R) {
      const kind = R.pick(['sym', 'ratio', 'nucleon', 'electron', 'wf']);
      const stem = raw`A particle of mass $m$ is confined inside an impenetrable sphere of radius $a$ ($V = 0$ for $r < a$, $V = \infty$ for $r > a$).`;
      if (kind === 'sym') {
        const c = raw`$\dfrac{\pi^2\hbar^2}{2ma^2}$`;
        return {
          q: stem + ' What is its ground-state energy?',
          ...GRE.mc(R, c, [raw`$\dfrac{\pi^2\hbar^2}{8ma^2}$`, raw`$\dfrac{3\pi^2\hbar^2}{2ma^2}$`, raw`$\dfrac{3\pi^2\hbar^2}{8ma^2}$`, raw`$\dfrac{\pi^2\hbar^2}{ma^2}$`, raw`$\dfrac{\hbar^2}{2ma^2}$`]),
          expl: raw`The ground state has $l = 0$, so there is no centrifugal term and $u = rR$ obeys the 1D equation $-\frac{\hbar^2}{2m}u'' = Eu$ with $u(0) = u(a) = 0$: $u = \sin(\pi r/a)$ and $E = \frac{\pi^2\hbar^2}{2ma^2}$, the same as a 1D well of width $a$ (the radius, not the diameter).`,
        };
      }
      if (kind === 'ratio') {
        const n = R.int(2, 5);
        const E = R.pick(['E', raw`E_0`, raw`\varepsilon`]);
        return {
          q: stem + raw` The ${['', '', 'second', 'third', 'fourth', 'fifth'][n]}-lowest state with $l = 0$ has energy $${E}$. What is the energy of the lowest $l = 0$ state?`,
          ...mcv(R, 1 / (n * n), [1 / n, 1 / (2 * n - 1), 1 / (n * n - 1), n * n, 1 / ((n + 1) * (n + 1)), 1 / ((n - 1) * (n - 1)) === 1 ? 2 : 1 / ((n - 1) * (n - 1))], x => qx(x, E)),
          expl: raw`For $l = 0$, $u = \sin(k r)$ with $ka = n\pi$, so $E_n = n^2\pi^2\hbar^2/(2ma^2) \propto n^2$. The ground state is $${E}/${n * n}$.`,
        };
      }
      if (kind === 'nucleon') {
        const Rf = R.pick([2, 3, 4, 5, 6, 7, 8]);
        const k = GRE.C.hbar * GRE.C.hbar / (2 * GRE.C.mn) / (1e6 * GRE.C.eV) * 1e30; // MeV fm^2
        const E = Math.PI * Math.PI * k / (Rf * Rf);
        return {
          q: raw`As a crude model of a nucleus, a neutron is confined in an impenetrable sphere of radius $${Rf}\,\text{fm}$. Its lowest possible kinetic energy is closest to (use $\hbar^2/2m_n \approx ${F.num(k, 2)}\,\text{MeV}\cdot\text{fm}^2$)`,
          ...GRE.numeric(R, E, [E / 4, 3 * E, E / (Math.PI * Math.PI), 2 * E], { unit: raw`\text{MeV}` }),
          expl: raw`The $l = 0$ ground state of a spherical well has $E = \frac{\pi^2\hbar^2}{2ma^2} = \frac{\pi^2(${F.num(k, 2)})}{${Rf}^2}\,\text{MeV} \approx ${F.num(E, 2)}\,\text{MeV}$ — a few MeV, the scale of nuclear binding.`,
        };
      }
      if (kind === 'electron') {
        const a = R.pick([0.2, 0.3, 0.5, 1, 2]);
        const k = GRE.C.hbar * GRE.C.hbar / (2 * GRE.C.me) / GRE.C.eV * 1e18;
        const E = Math.PI * Math.PI * k / (a * a);
        return {
          q: raw`An electron is trapped inside a spherical cavity of radius $${a}\,\text{nm}$ with impenetrable walls. What is its ground-state energy, approximately? (Use $\hbar^2/2m_e \approx ${F.num(k, 2)}\,\text{eV}\cdot\text{nm}^2$.)`,
          ...GRE.numeric(R, E, [E / 4, 3 * E, E / (Math.PI * Math.PI), 2 * E], { unit: raw`\text{eV}` }),
          expl: raw`For $l = 0$ the radial function $u = rR$ obeys the 1D well equation on $0 < r < a$, so $E = \pi^2\hbar^2/(2m_ea^2) = \pi^2(${F.num(k, 2)})/(${a})^2\,\text{eV} \approx ${F.num(E, 2)}\,\text{eV}$. Using the diameter instead of the radius gives a value 4 times too small.`,
        };
      }
      const n = R.int(1, 3);
      const S = (arg, den) => raw`$\dfrac{\sin(${arg})}{${den}}$`;
      const nn = n === 1 ? '' : n;
      const correct = S(`${nn}\\pi r/a`, 'r');
      const wrong = [raw`$\sin(${nn}\pi r/a)$`, raw`$\dfrac{\cos(${n === 1 ? '' : 2 * n - 1}\pi r/2a)}{r}$`, S(`${n + 1}\\pi r/a`, 'r'), S(`${n === 1 ? '' : 2 * n - 1}\\pi r/2a`, 'r'), S(`${nn}\\pi r/a`, 'r^2'), raw`$e^{-${nn}\pi r/a}$`];
      return {
        q: stem + raw` Which of the following is the radial function $R(r)$ (for $r < a$, unnormalized) of the ${['', 'lowest', 'second-lowest', 'third-lowest'][n]} $l = 0$ state?`,
        ...GRE.mc(R, correct, wrong),
        expl: raw`For $l = 0$, $u(r) = rR(r)$ satisfies $u'' = -k^2u$ with $u(0) = 0$ (so $R$ stays finite) and $u(a) = 0$. Hence $u = \sin(n\pi r/a)$ and $R = \sin(n\pi r/a)/r$, with $n = ${n}$ here ($n - 1 = ${n - 1}$ radial nodes inside the sphere).`,
      };
    },
  });

  T.push({
    id: 'qm2.radial.roman', sec: '5.4.1', level: 2,
    gen(R) {
      const TRUE = [
        [raw`The radial equation does not involve the magnetic quantum number $m$.`, raw`only $l(l+1)$ enters, so each level has at least $(2l+1)$-fold degeneracy.`],
        [raw`For $l > 0$ the effective potential contains a repulsive term proportional to $l(l+1)/r^2$.`, raw`the centrifugal term $\hbar^2l(l+1)/(2mr^2)$ is positive.`],
        [raw`The function $u(r) = rR(r)$ must vanish at $r = 0$.`, raw`otherwise $R \sim 1/r$ near the origin, which is not an acceptable solution.`],
        [raw`Near the origin, a regular radial solution behaves as $R(r) \propto r^l$.`, raw`the centrifugal term dominates at small $r$ and forces $u \propto r^{l+1}$.`],
        [raw`The probability of finding the particle between $r$ and $r + dr$ is $|R(r)|^2r^2\,dr$.`, raw`the volume element in spherical coordinates is $r^2\sin\theta\,dr\,d\theta\,d\phi$.`],
        [raw`For a fixed number of radial nodes, the energy increases with $l$ in any attractive central potential.`, raw`a larger $l$ adds a larger positive centrifugal term to the effective potential.`],
        [raw`The ground state of a particle in an attractive central potential has $l = 0$.`, raw`any $l > 0$ adds positive centrifugal energy.`],
      ];
      const FALSE = [
        [raw`States with the same $n$ and $l$ but different $m$ generally have different energies in a central potential.`, raw`the radial equation is independent of $m$, so these states are degenerate.`],
        [raw`For $l > 0$ the effective potential contains an attractive term $-\hbar^2l(l+1)/(2mr^2)$.`, raw`the centrifugal term is repulsive (positive).`],
        [raw`The radial function is normalized as $\int_0^\infty |R(r)|^2\,dr = 1$.`, raw`the correct normalization is $\int_0^\infty |R|^2 r^2\,dr = 1$.`],
        [raw`An $l = 0$ wavefunction must vanish at the origin.`, raw`it is $u = rR$ that vanishes; $R(0)$ is finite and generally nonzero for $l = 0$.`],
        [raw`The centrifugal term is proportional to $l^2/r^2$.`, raw`it is proportional to $l(l+1)/r^2$.`],
        [raw`The radial equation for $u(r)$ is a 1D Schrödinger equation on $-\infty < r < \infty$ with no condition at $r = 0$.`, raw`$r \ge 0$ and $u(0) = 0$ is required.`],
      ];
      return romanQ(R, raw`A particle moves in a spherically symmetric potential $V(r)$, and its wavefunction is written $\psi = R(r)Y_l^m(\theta,\phi)$. Which of the following statements is (are) true?`, TRUE, FALSE);
    },
  });

  // ================================================================ 5.4.2 Angular momentum and spherical harmonics
  T.push({
    id: 'qm2.ang.eigen', sec: '5.4.2', level: 1, weight: 2,
    gen(R) {
      const l = R.int(1, 6), m = R.int(-l, l);
      const kind = R.pick(['L2', 'L2', 'mag', 'perp', 'Lx2', 'cos', 'dLx']);
      const L = l * (l + 1);
      const intro = R.bool()
        ? raw`A particle has angular wavefunction $Y_{${l}}^{${m}}(\theta,\phi)$.`
        : raw`A particle is in a simultaneous eigenstate of $L^2$ and $L_z$ with $l = ${l}$ and $m = ${m}$.`;
      const sq = x => { const n = Math.round(x * x); if (Math.abs(n - x * x) > 1e-9) throw new Error('sq'); return F.sqrt(n); };
      if (kind === 'L2') return {
        q: intro + raw` What is the eigenvalue of $L^2$?`,
        ...mcv(R, L, [l * l, (l + 1) * (l + 1), 2 * l + 1, m * m, L - m * m, l * (l - 1), (l + 1) * (l + 2), 2 * L], x => qx(x, raw`\hbar^2`)),
        expl: raw`$L^2Y_l^m = l(l+1)\hbar^2Y_l^m = ${L}\hbar^2\,Y_{${l}}^{${m}}$, independent of $m$. The answer is not $l^2\hbar^2$.`,
        level: 1,
      };
      if (kind === 'mag') return {
        q: intro + raw` What is the magnitude $\sqrt{\langle L^2\rangle}$ of its orbital angular momentum?`,
        ...mcv(R, Math.sqrt(L), [l, l + 1, L, Math.sqrt(l), Math.sqrt(2 * l + 1), Math.sqrt(L + 1)], x => sq(x) + HB),
        expl: raw`$|\mathbf{L}| = \sqrt{l(l+1)}\,\hbar = ${sq(Math.sqrt(L))}\hbar$, which always exceeds the largest $L_z$ value $l\hbar$.`,
        level: 1,
      };
      if (kind === 'perp') return {
        q: intro + raw` What is $\langle L_x^2 + L_y^2\rangle$?`,
        ...mcv(R, L - m * m, [L, l * l - m * m, L + m * m, (L - m * m) / 2, m * m, 0], x => qx(x, raw`\hbar^2`)),
        expl: raw`$L_x^2 + L_y^2 = L^2 - L_z^2$, so the expectation value is $[l(l+1) - m^2]\hbar^2 = (${L} - ${m * m})\hbar^2 = ${qx(L - m * m, raw`\hbar^2`)}$.`,
      };
      if (kind === 'Lx2') return {
        q: intro + raw` What is $\langle L_x^2\rangle$?`,
        ...mcv(R, (L - m * m) / 2, [L - m * m, L / 2, (l * l - m * m) / 2, L / 3, 0, (L + m * m) / 2], x => qx(x, raw`\hbar^2`)),
        expl: raw`By symmetry about the $z$ axis, $\langle L_x^2\rangle = \langle L_y^2\rangle = \tfrac{1}{2}\langle L^2 - L_z^2\rangle = \tfrac{1}{2}(${L} - ${m * m})\hbar^2 = ${qx((L - m * m) / 2, raw`\hbar^2`)}$.`,
        level: 2,
      };
      if (kind === 'dLx') {
        const v = Math.sqrt((L - m * m) / 2);
        return {
          q: intro + raw` What is the uncertainty $\Delta L_x$?`,
          ...mcv(R, v, [0, Math.sqrt(L - m * m), Math.sqrt(L / 2), Math.sqrt(L), Math.abs(m) || 2 * v, v / Math.SQRT2], x => ex(x, HB)),
          expl: raw`$\langle L_x\rangle = 0$ (since $L_x = (L_+ + L_-)/2$ changes $m$) and $\langle L_x^2\rangle = \tfrac{1}{2}[l(l+1) - m^2]\hbar^2$, so $\Delta L_x = \sqrt{\langle L_x^2\rangle} = ${ex(v, HB)}$.`,
          level: 3,
        };
      }
      // cos
      const mm = m === 0 ? l : m;
      const v = mm / Math.sqrt(L);
      return {
        q: raw`In the vector model of angular momentum, the angle $\theta$ between $\mathbf{L}$ and the $z$ axis satisfies $\cos\theta = L_z/|\mathbf{L}|$. For a state with $l = ${l}$ and $m = ${mm}$, what is $\cos\theta$?`,
        ...mcv(R, v, [mm / l, mm / (l + 1), mm / L, Math.sign(mm) * Math.sqrt(Math.abs(mm) / (l + 1)) === v ? mm / (l + 2) : Math.sign(mm) * Math.sqrt(Math.abs(mm) / (l + 1)), -v, mm / Math.sqrt(l * l + 1)], x => ex(x)),
        expl: raw`$\cos\theta = \frac{m\hbar}{\sqrt{l(l+1)}\,\hbar} = \frac{${mm}}{\sqrt{${L}}} = ${ex(v)}$. Because $\sqrt{l(l+1)} > l$, $\mathbf{L}$ can never point exactly along $z$.`,
        level: 2,
      };
    },
  });

  // superposition of orthonormal eigenfunctions: returns components with weights
  function superpose(R, pool, n) {
    const comps = R.pickN(pool, n).map(p => ({ p, c: R.pick(COEF) }));
    comps.forEach(o => { o.w = cabs2(o.c); });
    const N = comps.reduce((s, o) => s + o.w, 0);
    return { comps, N };
  }

  T.push({
    id: 'qm2.ang.superpos', sec: '5.4.2', level: 2, weight: 2,
    gen(R) {
      const pool = [];
      for (let l = 0; l <= 4; l++) for (let m = -l; m <= l; m++) pool.push([l, m]);
      const n = R.pick([2, 2, 3]);
      const { comps, N } = superpose(R, pool, n);
      const psi = raw`$\psi(\theta,\phi) = A\left[${lin(comps.map(o => ({ c: o.c, s: Y(o.p[0], o.p[1]) })))}\right]$`;
      const stem = raw`A particle's angular wavefunction is ${psi}, where the $Y_l^m$ are normalized spherical harmonics and $A$ is a normalization constant.`;
      const kind = R.pick(['L2', 'Lz', 'PLz', 'PL2']);
      const sumW = f => comps.reduce((s, o) => s + o.w * f(o.p), 0);
      const sumA = f => comps.reduce((s, o) => s + Math.sqrt(o.w) * f(o.p), 0);
      const totA = comps.reduce((s, o) => s + Math.sqrt(o.w), 0);
      const plain = f => comps.reduce((s, o) => s + f(o.p), 0) / n;
      const P = comps.map(o => `${o.w}/${N}`).join(', ');
      if (kind === 'L2' || kind === 'Lz') {
        const f = kind === 'L2' ? p => p[0] * (p[0] + 1) : p => p[1];
        const v = sumW(f) / N;
        const allReal = comps.every(o => o.c[1] === 0);
        const wr = [sumW(f), plain(f), kind === 'L2' ? sumW(p => p[0] * p[0]) / N : sumW(p => Math.abs(p[1])) / N, kind === 'L2' ? sumW(p => p[0]) / N : -v, kind === 'L2' ? sumW(p => (p[0] + 1) * (p[0] + 1)) / N : sumW(p => p[0]) / N];
        if (allReal) wr.push(sumA(f) / totA);
        return {
          q: stem + (kind === 'L2' ? raw` What is $\langle L^2\rangle$?` : raw` What is $\langle L_z\rangle$?`),
          ...mcv(R, v, wr.filter(x => F.toRational(x, 2000)), x => qx(x, kind === 'L2' ? raw`\hbar^2` : HB)),
          expl: raw`$|A|^2 = 1/${N}$, so the probabilities of the components are ${P}. Then $\langle ${kind === 'L2' ? 'L^2' : 'L_z'}\rangle = \sum_k P_k\,${kind === 'L2' ? 'l_k(l_k+1)\\hbar^2' : 'm_k\\hbar'} = ${qx(v, kind === 'L2' ? raw`\hbar^2` : HB)}$. Weight by $|c_k|^2$ and remember to normalize.`,
        };
      }
      const key = kind === 'PLz' ? (p => p[1]) : (p => p[0]);
      const target = key(R.pick(comps).p);
      const v = sumW(p => (key(p) === target ? 1 : 0)) / N;
      const nMatch = comps.filter(o => key(o.p) === target).length;
      const wr = [1 - v, comps.filter(o => key(o.p) === target).map(o => o.w / N)[0], nMatch / n, 1 / n,
        comps.every(o => o.c[1] === 0) ? sumA(p => (key(p) === target ? 1 : 0)) / totA : null].concat(PFILL);
      const what = kind === 'PLz' ? raw`a measurement of $L_z$ gives $${qx(target, HB)}$` : raw`a measurement of $L^2$ gives $${qx(target * (target + 1), raw`\hbar^2`)}$`;
      return {
        q: stem + ` What is the probability that ${what}?`,
        ...mcv(R, v, wr.filter(x => x != null && x <= 1 && F.toRational(x, 2000)), rat),
        expl: raw`The normalization gives $|A|^2 = 1/${N}$; the component probabilities are ${P}. Add the probabilities of every component with ${kind === 'PLz' ? `$m = ${target}$` : `$l = ${target}$`}: $P = ${rat(v)}$.`,
      };
    },
  });

  T.push({
    id: 'qm2.ang.measure', sec: '5.4.2', level: 1,
    gen(R) {
      const kind = R.pick(['Lz', 'count', 'L2', 'imp']);
      if (kind === 'Lz') {
        const l = R.int(1, 5), m = R.int(-l, l);
        const wr = [l + 1, -(l + 1), l + 2, m + 0.5, m - 0.5, Math.sqrt(l * (l + 1)), l * (l + 1)];
        return {
          q: raw`A measurement of $L^2$ on a particle gives $${l * (l + 1)}\hbar^2$. Which of the following is a possible result of a subsequent measurement of $L_z$?`,
          ...mcv(R, m, wr, x => (Number.isInteger(2 * x) ? qx(x, HB) : ex(x, HB))),
          expl: raw`$l(l+1) = ${l * (l + 1)}$ means $l = ${l}$, so $L_z = m\hbar$ with $m$ an integer from $-${l}$ to $${l}$. Orbital $m$ is never half-integer, and $|m| \le l$.`,
        };
      }
      if (kind === 'count') {
        const l = R.int(1, 7);
        return {
          q: raw`A measurement of $L^2$ on a spinless particle gives $${l * (l + 1)}\hbar^2$. How many different results are possible for a subsequent measurement of $L_z$?`,
          ...mcv(R, 2 * l + 1, [l, l + 1, 2 * l, 2 * l + 2, l * (l + 1), 2 * (2 * l + 1)], x => String(x)),
          expl: raw`$l = ${l}$, and $m$ runs over $-l, \dots, l$: $2l + 1 = ${2 * l + 1}$ values.`,
        };
      }
      if (kind === 'L2') {
        const m = R.pick([1, 2, 3, 4, -1, -2, -3]), am = Math.abs(m);
        const l = R.int(am, am + 2);
        const wr = [m * m, (am + 1) * (am + 1), am * (am - 1), 2 * am + 1, (am + 2) * (am + 2), am > 1 ? (am - 2) * (am - 1) : null, am * (am + 1) / 2];
        return {
          q: raw`A measurement of $L_z$ on a particle gives $${qx(m, HB)}$. Which of the following could be the result of a subsequent measurement of $L^2$?`,
          ...mcv(R, l * (l + 1), wr, x => qx(x, raw`\hbar^2`)),
          expl: raw`$L^2 = l(l+1)\hbar^2$ with $l \ge |m| = ${am}$, so the allowed values are $${am * (am + 1)}\hbar^2, ${(am + 1) * (am + 2)}\hbar^2, \dots$ Values such as $m^2\hbar^2$ are not of the form $l(l+1)\hbar^2$.`,
        };
      }
      const ls = R.pickN([0, 1, 2, 3, 4, 5, 6], 4);
      const bad = R.pick([4, 9, 16, 8, 3, 0.75, 3.75, 10, 18, 25]);
      return {
        q: raw`Which of the following CANNOT be an eigenvalue of the orbital angular momentum operator $L^2$?`,
        ...mcv(R, bad, ls.map(l => l * (l + 1)), x => qx(x, raw`\hbar^2`)),
        expl: raw`Orbital eigenvalues are $l(l+1)\hbar^2 = 0, 2, 6, 12, 20, 30, 42, \dots$ (in units of $\hbar^2$) with integer $l$. $${qx(bad, raw`\hbar^2`)}$ is not of this form${bad === 0.75 || bad === 3.75 ? ' (it is a spin value with half-integer $s$, impossible for orbital angular momentum)' : ''}.`,
      };
    },
  });

  // ---- operator algebra for commutators: terms {c:[re,im], h: power of hbar, ops:[tokens]}
  const EPS = (i, j, k) => ((i - j) * (j - k) * (k - i)) / 2;
  const tokTeX = t => t.t === 'L' ? 'L_' + 'xyz'[t.i] : t.t === 'r' ? 'xyz'[t.i] : 'p_' + 'xyz'[t.i];
  function basicComm(A, B) {
    // [A, B] for single tokens
    const out = [];
    if (A.t === 'L' || B.t === 'L') {
      // [L_i, V_j] = i hbar eps_ijk V_k ; [V_i, L_j] = i hbar eps_ijk V_k (V = r, p); [L_i, L_j] = i hbar eps_ijk L_k
      const V = A.t === 'L' ? B.t : A.t;
      for (let k = 0; k < 3; k++) {
        const e = EPS(A.i, B.i, k);
        if (e) out.push({ c: [0, e], h: 1, ops: [{ t: V, i: k }] });
      }
      return out;
    }
    if (A.t === 'r' && B.t === 'p' && A.i === B.i) return [{ c: [0, 1], h: 1, ops: [] }];
    if (A.t === 'p' && B.t === 'r' && A.i === B.i) return [{ c: [0, -1], h: 1, ops: [] }];
    return [];
  }
  const mulL = (ops, terms) => terms.map(t => ({ c: t.c, h: t.h, ops: ops.concat(t.ops) }));
  const mulR = (terms, ops) => terms.map(t => ({ c: t.c, h: t.h, ops: t.ops.concat(ops) }));
  function commMono(A, B) {
    if (!A.length || !B.length) return [];
    if (A.length > 1) return mulL([A[0]], commMono(A.slice(1), B)).concat(mulR(commMono([A[0]], B), A.slice(1)));
    if (B.length > 1) return mulR(commMono(A, [B[0]]), B.slice(1)).concat(mulL([B[0]], commMono(A, B.slice(1))));
    return basicComm(A[0], B[0]);
  }
  function simplify(terms) {
    const m = new Map();
    for (const t of terms) {
      const k = t.h + '|' + t.ops.map(tokTeX).join(' ');
      const o = m.get(k);
      if (o) o.c = cadd(o.c, t.c); else m.set(k, { c: t.c.slice(), h: t.h, ops: t.ops });
    }
    return Array.from(m.values()).filter(t => t.c[0] || t.c[1]);
  }
  function comm(P, Q) {
    let out = [];
    for (const s of P) for (const t of Q) out = out.concat(commMono(s.ops, t.ops).map(u => ({ c: cmul(cmul(s.c, t.c), u.c), h: s.h + t.h + u.h, ops: u.ops })));
    return simplify(out);
  }
  const mono = (...toks) => [{ c: [1, 0], h: 0, ops: toks }];
  function opsTeX(ops) {
    let s = '', i = 0;
    while (i < ops.length) {
      let j = i;
      while (j + 1 < ops.length && tokTeX(ops[j + 1]) === tokTeX(ops[i])) j++;
      const p = j - i + 1;
      s += tokTeX(ops[i]) + (p > 1 ? `^${p}` : '');
      i = j + 1;
    }
    return s;
  }
  function coefTeX(c, h) {
    const hs = h === 0 ? '' : h === 1 ? HB + ' ' : HB + '^' + h + ' ';
    let cs;
    if (c[1] === 0) cs = c[0] === 1 ? '' : c[0] === -1 ? '-' : String(c[0]);
    else if (c[0] === 0) cs = (c[1] === 1 ? '' : c[1] === -1 ? '-' : String(c[1])) + 'i';
    else cs = '(' + ctex(c) + ')';
    if (!hs && (cs === '' || cs === '-')) cs += '1';
    return cs + hs;
  }
  function polyTeX(P) {
    if (!P.length) return '0';
    const c0 = P[0].c, h0 = P[0].h;
    const same = P.every(t => t.h === h0 && ((t.c[0] === c0[0] && t.c[1] === c0[1]) || (t.c[0] === -c0[0] && t.c[1] === -c0[1])));
    if (P.length === 1) return coefTeX(c0, h0) + opsTeX(P[0].ops);
    if (same) {
      const inner = P.map((t, k) => { const sg = t.c[0] === c0[0] && t.c[1] === c0[1] ? '+' : '-'; return (k === 0 ? '' : ` ${sg} `) + (opsTeX(t.ops) || '1'); }).join('');
      return coefTeX(c0, h0) + '(' + inner + ')';
    }
    return P.map((t, k) => { const s = coefTeX(t.c, t.h) + opsTeX(t.ops); return k === 0 || s[0] === '-' ? s : '+' + s; }).join('');
  }
  const scale = (P, c) => P.map(t => ({ c: cmul(t.c, c), h: t.h, ops: t.ops }));
  const cyc = P => P.map(t => ({ c: t.c, h: t.h, ops: t.ops.map(o => ({ t: o.t, i: (o.i + 1) % 3 })) }));

  T.push({
    id: 'qm2.ang.comm', sec: '5.4.2', level: 2,
    gen(R) {
      const L = i => ({ t: 'L', i }), V = (t, i) => ({ t, i });
      const kind = R.pick(['simple', 'simple', 'prod', 'nested', 'nested2']);
      let A, B, label, level = 2, P;
      if (kind === 'simple') {
        const a = R.int(0, 2), t = R.pick(['L', 'r', 'p']);
        let b = R.int(0, 2); if (b === a && R.bool(0.7)) b = (a + R.int(1, 2)) % 3;
        A = mono(L(a)); B = mono(V(t, b));
        P = comm(A, B);
        label = raw`[L_${'xyz'[a]}, ${tokTeX(V(t, b))}]`;
        level = 1;
      } else if (kind === 'prod') {
        const a = R.int(0, 2);
        const t1 = R.pick(['L', 'r', 'p']), t2 = t1 === 'L' ? 'L' : R.pick(['r', 'p']);
        const b = R.int(0, 2); let c = R.int(0, 2); if (t1 === t2 && c === b) c = (b + 1) % 3;
        A = mono(L(a)); B = mono(V(t1, b), V(t2, c));
        P = comm(A, B);
        if (!P.length) throw new Error('zero');
        label = raw`[L_${'xyz'[a]}, ${tokTeX(V(t1, b))}${tokTeX(V(t2, c))}]`;
        level = 3;
      } else if (kind === 'nested') {
        const a = R.int(0, 2), b = (a + R.int(1, 2)) % 3, c = R.int(0, 2);
        P = comm(comm(mono(L(a)), mono(L(b))), mono(L(c)));
        label = raw`[[L_${'xyz'[a]}, L_${'xyz'[b]}], L_${'xyz'[c]}]`;
        if (!P.length && R.bool(0.6)) throw new Error('zero');
        level = 2;
      } else {
        const a = R.int(0, 2), b = (a + R.int(1, 2)) % 3, c = R.int(0, 2), d = (c + R.int(1, 2)) % 3;
        if (a === 0 && b === 1 && c === 1 && d === 2) throw new Error('book example');
        P = comm(comm(mono(L(a)), mono(L(b))), comm(mono(L(c)), mono(L(d))));
        label = raw`[[L_${'xyz'[a]}, L_${'xyz'[b]}], [L_${'xyz'[c]}, L_${'xyz'[d]}]]`;
        if (!P.length && R.bool(0.7)) throw new Error('zero');
        level = 3;
      }
      const correct = '$' + polyTeX(P) + '$';
      let wrongs;
      if (P.length) {
        wrongs = [scale(P, [-1, 0]), scale(P, [0, -1]), scale(P, [0, 1]), cyc(P), cyc(cyc(P)), scale(cyc(P), [-1, 0]),
          P.map(t => ({ c: t.c, h: t.h + 1, ops: t.ops }))].map(x => '$' + polyTeX(x) + '$').concat(['$0$']);
      } else {
        const toks = kind === 'simple' ? [B[0].ops[0]] : [L(R.int(0, 2))];
        const base = [{ c: [0, 1], h: 1, ops: toks }];
        wrongs = [base, scale(base, [-1, 0]), cyc(base), scale(cyc(base), [-1, 0]), scale(base, [0, -1]), cyc(cyc(base))].map(x => '$' + polyTeX(x) + '$');
      }
      return {
        q: raw`Using $[L_x, L_y] = i\hbar L_z$ (and cyclic permutations), $\mathbf{L} = \mathbf{r}\times\mathbf{p}$ and $[x_i, p_j] = i\hbar\delta_{ij}$, evaluate the commutator $${label}$.`,
        ...GRE.mc(R, correct, wrongs),
        expl: raw`For any vector operator $\mathbf{V}$ ($\mathbf{L}$, $\mathbf{r}$ or $\mathbf{p}$), $[L_i, V_j] = i\hbar\epsilon_{ijk}V_k$; products are handled with $[A, BC] = [A,B]C + B[A,C]$. Working from the inside out gives $${label} = ${polyTeX(P)}$.`,
        level,
      };
    },
  });

  T.push({
    id: 'qm2.ang.ladder', sec: '5.4.2', level: 2,
    gen(R) {
      const kind = R.pick(['act', 'act', 'norm', 'exp']);
      const l = R.int(1, 5);
      const L = l * (l + 1);
      if (kind === 'act') {
        const up = R.bool();
        const m = R.int(-l, l);
        const s = up ? 1 : -1;
        const N = L - m * (m + s);
        const op = up ? 'L_+' : 'L_-';
        const term = (n, mm) => n <= 0 || Math.abs(mm) > l ? '$0$' : `$${F.sqrt(n) === '1' ? '' : F.sqrt(n)}\\hbar\\,${Y(l, mm)}$`;
        const correct = term(N, m + s);
        const wr = [term(L - m * (m - s), m + s), term(N, m - s), term(L, m + s), term(L - m * m, m + s), term(N, m), term(N + 2, m + s), term(2 * l, m + s)];
        if (correct === '$0$') wr.push(raw`$\sqrt{${2 * l}}\,\hbar\,${Y(l, m + s)}$`, raw`$${l}\hbar\,${Y(l, m)}$`);
        return {
          q: raw`The angular-momentum raising and lowering operators are $L_\pm = L_x \pm iL_y$. What is $${op}Y_{${l}}^{${m}}$?`,
          ...GRE.mc(R, correct, wr),
          expl: raw`$L_\pm Y_l^m = \hbar\sqrt{l(l+1) - m(m\pm1)}\,Y_l^{m\pm1}$. Here $l(l+1) - m(m${up ? '+' : '-'}1) = ${L} - (${m})(${m + s}) = ${N}$${N === 0 ? raw`, so the state is annihilated ($m$ cannot go beyond $\pm l$)` : ''}.`,
        };
      }
      if (kind === 'norm') {
        const m = R.int(-l, l);
        const plusFirst = R.bool();
        const v = plusFirst ? L - m * (m - 1) : L - m * (m + 1); // <L+L-> or <L-L+>
        return {
          q: raw`For the state $|l, m\rangle = |${l}, ${m}\rangle$, what is $\langle ${l}, ${m}|\,${plusFirst ? 'L_+L_-' : 'L_-L_+'}\,|${l}, ${m}\rangle$?`,
          ...mcv(R, v, [plusFirst ? L - m * (m + 1) : L - m * (m - 1), L - m * m, L, l * l - m * m, L + m * m, v + 2], x => qx(x, raw`\hbar^2`)),
          expl: raw`${plusFirst ? raw`$L_+L_- = L^2 - L_z^2 + \hbar L_z$` : raw`$L_-L_+ = L^2 - L_z^2 - \hbar L_z$`}, so the expectation value is $[${L} - ${m * m} ${plusFirst ? '+' : '-'} (${m})]\hbar^2 = ${qx(v, raw`\hbar^2`)}$ — the squared norm of $${plusFirst ? 'L_-' : 'L_+'}|${l},${m}\rangle$.`,
          level: 3,
        };
      }
      const m = R.int(-l, l - 1);
      const N = L - m * (m + 1);
      const useY = R.bool();
      const v = Math.sqrt(N) / 2;
      const comp = useY ? 'L_y' : 'L_x';
      const sgn = useY ? -1 : 1;
      return {
        q: raw`A particle is in the angular state $\psi = \frac{1}{\sqrt{2}}\left(Y_{${l}}^{${m}} + ${useY ? 'i' : ''}Y_{${l}}^{${m + 1}}\right)$. What is $\langle ${comp}\rangle$?`,
        ...mcv(R, sgn * v, [-sgn * v, 0, sgn * Math.sqrt(N), sgn * Math.sqrt(L) / 2, sgn * (m + 0.5), sgn * v / Math.SQRT2], x => ex(x, HB)),
        expl: raw`Write ${useY ? raw`$L_y = (L_+ - L_-)/2i$` : raw`$L_x = (L_+ + L_-)/2$`}. Only the cross terms survive: $\langle L_+\rangle = \tfrac{1}{2}${useY ? '(-i)' : ''}\hbar\sqrt{l(l+1) - m(m+1)}$ with $l(l+1) - m(m+1) = ${N}$, and $\langle L_-\rangle = \langle L_+\rangle^*$. Hence $\langle ${comp}\rangle = ${ex(sgn * v, HB)}$.`,
        level: 3,
      };
    },
  });

  T.push({
    id: 'qm2.ang.cartesian', sec: '5.4.2', level: 2,
    gen(R) {
      // [f, [[l, m, prob], ...]]
      const POOL = [
        [raw`\sin\theta\,e^{i\phi}`, [[1, 1, 1]]], [raw`\sin\theta\,e^{-i\phi}`, [[1, -1, 1]]], [raw`\cos\theta`, [[1, 0, 1]]],
        [raw`\sin\theta\cos\phi`, [[1, 1, 0.5], [1, -1, 0.5]]], [raw`\sin\theta\sin\phi`, [[1, 1, 0.5], [1, -1, 0.5]]],
        [raw`\sin^2\theta\,e^{2i\phi}`, [[2, 2, 1]]], [raw`\sin\theta\cos\theta\,e^{i\phi}`, [[2, 1, 1]]], [raw`\sin\theta\cos\theta\,e^{-i\phi}`, [[2, -1, 1]]],
        [raw`3\cos^2\theta - 1`, [[2, 0, 1]]], [raw`\sin^2\theta\cos 2\phi`, [[2, 2, 0.5], [2, -2, 0.5]]], [raw`\sin^2\theta\sin 2\phi`, [[2, 2, 0.5], [2, -2, 0.5]]],
        [raw`\sin\theta\cos\theta\cos\phi`, [[2, 1, 0.5], [2, -1, 0.5]]], [raw`\sin^3\theta\,e^{-3i\phi}`, [[3, -3, 1]]], [raw`\sin^2\theta\cos\theta\,e^{2i\phi}`, [[3, 2, 1]]],
        [raw`\sin\theta\,(5\cos^2\theta - 1)\,e^{i\phi}`, [[3, 1, 1]]], [raw`\sin^2\theta`, [[0, 0, 5 / 6], [2, 0, 1 / 6]]], [raw`\cos^2\theta`, [[0, 0, 5 / 9], [2, 0, 4 / 9]]],
        [raw`\sin\theta\,e^{i\phi} + \sqrt{2}\cos\theta`, [[1, 1, 0.5], [1, 0, 0.5]]], [raw`\sin\theta\,(e^{i\phi} + 2e^{-i\phi})`, [[1, 1, 0.2], [1, -1, 0.8]]],
      ];
      const [f, comps] = R.pick(POOL);
      const kind = R.pick(['Lz', 'L2']);
      const stem = raw`The angular part of a particle's wavefunction is proportional to $${f}$.`;
      if (kind === 'L2') {
        const v = comps.reduce((s, c) => s + c[2] * c[0] * (c[0] + 1), 0);
        const lmax = Math.max(...comps.map(c => c[0]));
        const wr = [lmax * lmax, (lmax + 1) * (lmax + 1), lmax * (lmax + 1), comps.reduce((s, c) => s + c[0] * (c[0] + 1), 0) / comps.length, 0, 2 * v, Math.max(...comps.map(c => Math.abs(c[1]))) ** 2, v / 2, v + 2, (lmax + 2) * (lmax + 1)];
        const mixed = comps.some(c => c[0] !== lmax);
        return {
          q: stem + raw` What is $\langle L^2\rangle$ in this state?`,
          ...mcv(R, v, wr, x => qx(x, raw`\hbar^2`)),
          expl: mixed
            ? raw`$${f}$ is not a single spherical harmonic: rewriting it with $\cos^2\theta = \tfrac{1}{3} + \tfrac{2}{3}P_2(\cos\theta)$ gives a mixture of $l = 0$ and $l = 2$ with probabilities ${comps.map(c => `$${rat(c[2])}$`).join(' and ')} (in normalized $Y_l^m$). Hence $\langle L^2\rangle = ${rat(comps.find(c => c[0] === 2)[2])}\times 6\hbar^2 = ${qx(v, raw`\hbar^2`)}$.`
            : raw`Written in $x, y, z$, this is a homogeneous harmonic polynomial of degree $l = ${lmax}$ divided by $r^{${lmax}}$ — every term is a $Y_{${lmax}}^m$. So $L^2 = l(l+1)\hbar^2 = ${qx(v, raw`\hbar^2`)}$ exactly.`,
        };
      }
      const desc = cs => {
        const byM = new Map();
        cs.forEach(c => byM.set(c[1], (byM.get(c[1]) || 0) + c[2]));
        const ms = Array.from(byM.keys()).sort((a, b) => b - a);
        if (ms.length === 1) return raw`$L_z = ${qx(ms[0], HB)}$ with certainty`;
        if (ms.length === 2 && byM.get(ms[0]) === 0.5) return raw`$L_z = ${qx(ms[0], HB)}$ or $${qx(ms[1], HB)}$, each with probability $\frac{1}{2}$`;
        return raw`$L_z = ` + ms.map(m => `${qx(m, HB)}$ with probability $${rat(byM.get(m))}$`).join(' or $') ;
      };
      const correct = desc(comps);
      const wr = [];
      for (let m = -3; m <= 3; m++) wr.push(desc([[0, m, 1]]));
      for (let m = 1; m <= 3; m++) wr.push(desc([[0, m, 0.5], [0, -m, 0.5]]));
      wr.push(desc([[0, 1, 0.5], [0, 0, 0.5]]), desc([[0, 1, 0.8], [0, -1, 0.2]]), desc([[0, 1, 0.2], [0, -1, 0.8]]), desc([[0, 2, 1 / 6], [0, 0, 5 / 6]]));
      const near = wr.filter(w => w !== correct);
      return {
        q: stem + raw` What are the possible results of a measurement of $L_z$?`,
        ...GRE.mc(R, correct, R.shuffle(near)),
        expl: raw`$L_z = -i\hbar\,\partial/\partial\phi$ acts only on the $\phi$ dependence. Write it in terms of $e^{im\phi}$ (using $\cos\phi = (e^{i\phi} + e^{-i\phi})/2$, $\sin\phi = (e^{i\phi} - e^{-i\phi})/2i$, and so on) and read off the weights: ${correct}.`,
      };
    },
  });

  T.push({
    id: 'qm2.ang.rotor', sec: '5.4.2', level: 2,
    gen(R) {
      const kind = R.pick(['E', 'deg', 'gap', 'ratio', 'ring', 'num']);
      const stem = raw`A rigid rotor with moment of inertia $I$ has Hamiltonian $H = L^2/2I$.`;
      const u = raw`\frac{\hbar^2}{I}`;
      if (kind === 'E') {
        const l = R.int(1, 6);
        const v = l * (l + 1) / 2;
        return {
          q: stem + raw` What is the energy of the level with $l = ${l}$?`,
          ...mcv(R, v, [l * l / 2, l * (l + 1), (l + 1) * (l + 1) / 2, l / 2, (2 * l + 1) / 2, v * 2 + 1], x => fr(x, raw`\hbar^2`, 'I')),
          expl: raw`$E_l = \frac{l(l+1)\hbar^2}{2I} = \frac{${l * (l + 1)}}{2}\frac{\hbar^2}{I} = ${fr(v, raw`\hbar^2`, 'I')}$.`,
          level: 1,
        };
      }
      if (kind === 'deg') {
        const l = R.int(1, 7);
        return {
          q: stem + raw` How many linearly independent states have energy $${fr(l * (l + 1) / 2, raw`\hbar^2`, 'I')}$?`,
          ...mcv(R, 2 * l + 1, [l, l + 1, 2 * l, l * (l + 1), (l + 1) * (l + 1), 2 * (2 * l + 1)], x => String(x)),
          expl: raw`$l(l+1)/2 = ${rat(l * (l + 1) / 2)}$ gives $l = ${l}$, and the energy does not depend on $m$, so the degeneracy is $2l + 1 = ${2 * l + 1}$.`,
          level: 1,
        };
      }
      if (kind === 'gap') {
        const l = R.int(0, 6);
        return {
          q: stem + raw` What is the energy of a photon emitted in the transition from $l = ${l + 1}$ to $l = ${l}$?`,
          ...mcv(R, l + 1, [(l + 1) / 2, 2 * (l + 1), l + 0.5, (2 * l + 1), l || 0.25, (l + 2)], x => fr(x, raw`\hbar^2`, 'I')),
          expl: raw`$E_{l+1} - E_l = \frac{\hbar^2}{2I}[(l+1)(l+2) - l(l+1)] = \frac{(l+1)\hbar^2}{I} = ${fr(l + 1, raw`\hbar^2`, 'I')}$. Rotational lines are equally spaced in energy.`,
        };
      }
      if (kind === 'ratio') {
        const [a, b] = R.pickN([1, 2, 3, 4, 5, 6], 2);
        return {
          q: stem + raw` What is the ratio of the photon energy for the $l = ${a} \to ${a - 1}$ transition to that for the $l = ${b} \to ${b - 1}$ transition?`,
          ...mcv(R, a / b, [(a * (a + 1)) / (b * (b + 1)), (a * a) / (b * b), b / a, (2 * a + 1) / (2 * b + 1), (a + 1) / (b + 1)], rat),
          expl: raw`$E_l - E_{l-1} = l\hbar^2/I$, so the ratio is $${a}/${b} = ${rat(a / b)}$.`,
        };
      }
      if (kind === 'ring') {
        const j = R.int(2, 5);
        return {
          q: raw`A particle of mass $M$ is confined to a ring of radius $\rho$ in the $xy$-plane, so $H = L_z^2/(2M\rho^2)$. In units of $\hbar^2/(2M\rho^2)$, what is the energy of the ${['', '', 'second', 'third', 'fourth', 'fifth'][j]} distinct energy level (counting the ground level as the first)?`,
          ...mcv(R, (j - 1) * (j - 1), [j * j, (j - 1) * j, 2 * (j - 1) * (j - 1), Math.floor(j / 2) ** 2 || 2, (j - 2) * (j - 2) || 0.5, j * (j + 1) / 2], x => String(x)),
          expl: raw`The eigenfunctions are $e^{im\phi}$ with integer $m$ and $E = m^2\hbar^2/(2M\rho^2)$. Levels with $\pm m$ coincide, so the distinct levels are $m^2 = 0, 1, 4, 9, \dots$; the level number ${j} has $|m| = ${j - 1}$ and energy $${(j - 1) * (j - 1)}$.`,
        };
      }
      const Iv = R.pick([1, 1.5, 2, 3, 5]) * 1e-46;
      const l = R.int(0, 3);
      const E = (l + 1) * GRE.C.hbar * GRE.C.hbar / Iv / GRE.C.eV * 1e3;
      return {
        q: raw`A diatomic molecule behaves as a rigid rotor with moment of inertia $${F.sci(Iv, 2)}\,\text{kg}\cdot\text{m}^2$. What is the photon energy for the rotational transition $l = ${l + 1} \to ${l}$?`,
        ...GRE.numeric(R, E, [E / 2, 2 * E, E * (2 * Math.PI) ** 2, E * (l + 2) / (l + 1), E / (l + 1)], { unit: raw`\text{meV}` }),
        expl: raw`$\Delta E = \frac{(l+1)\hbar^2}{I} = \frac{${l + 1}(1.05\times10^{-34})^2}{${F.sci(Iv, 2)}}\,\text{J} \approx ${F.num(E, 2)}\,\text{meV}$ — rotational lines lie in the far infrared/microwave.`,
      };
    },
  });

  // ================================================================ 5.4.3 The hydrogen atom
  const ION = Z => (Z === 1 ? 'hydrogen' : Z === 2 ? raw`the hydrogen-like ion $\text{He}^{+}$` : Z === 3 ? raw`the hydrogen-like ion $\text{Li}^{2+}$` : raw`the hydrogen-like ion $\text{Be}^{3+}$`);

  T.push({
    id: 'qm2.h.degen', sec: '5.4.3', level: 1,
    gen(R) {
      const kind = R.pick(['n', 'E', 'nl', 'nm', 'sum']);
      const spin = R.bool(0.35);
      const sp = spin ? 'including the electron spin' : 'ignoring spin';
      const g = spin ? 2 : 1;
      const tail = ' Neglect fine structure and all other small corrections.';
      if (kind === 'n' || kind === 'E') {
        const n = R.int(2, 6);
        const Z = kind === 'E' ? R.pick([1, 1, 2]) : 1;
        let lead;
        if (kind === 'n') lead = raw`In the hydrogen atom, how many distinct states (${sp}) have principal quantum number $n = ${n}$?`;
        else lead = raw`For ${ION(Z)}, how many distinct electron states (${sp}) have energy $${F.num(-13.6 * Z * Z / (n * n), 3)}\,\text{eV}$?`;
        const wr = [n, 2 * n, n * n, 2 * n * n, 2 * n - 1, n * (n + 1) / 2, (n - 1) * (n - 1), (n + 1) * (n + 1)];
        if (Z === 2) { const n2 = n / 2; if (Number.isInteger(n2)) wr.push(g * n2 * n2); else wr.push(g * Math.round(n * n / 4)); }
        return {
          q: lead + tail,
          ...mcv(R, g * n * n, wr, x => String(x)),
          expl: (kind === 'E' ? raw`$E_n = -13.6\,\text{eV}\,Z^2/n^2$ with $Z = ${Z}$ gives $n = ${n}$. ` : '') + raw`For each $n$, $l = 0, \dots, n-1$ and each $l$ has $2l+1$ values of $m$: $\sum_{l=0}^{n-1}(2l+1) = n^2 = ${n * n}$${spin ? raw`, doubled by the two spin states to $2n^2 = ${2 * n * n}$` : ''}.`,
        };
      }
      if (kind === 'nl') {
        const n = R.int(2, 6), l = R.int(1, n - 1);
        return {
          q: raw`In the hydrogen atom, how many states (${sp}) have $n = ${n}$ and $l = ${l}$?` + tail,
          ...mcv(R, g * (2 * l + 1), [2 * l + 1, 2 * (2 * l + 1), l, 2 * l, n * n, n - l, l + 1, 2 * n - 1], x => String(x)),
          expl: raw`For fixed $l$, $m$ takes $2l + 1 = ${2 * l + 1}$ values${spin ? ', and each has two spin states' : ''}, giving $${g * (2 * l + 1)}$. The value of $n$ only restricts $l \le n - 1$.`,
        };
      }
      if (kind === 'nm') {
        const n = R.int(3, 7), m = R.int(-(n - 2), n - 2);
        return {
          q: raw`In the hydrogen atom, how many orbital states $|n, l, m\rangle$ have $n = ${n}$ and $m = ${m}$?`,
          ...mcv(R, n - Math.abs(m), [n, n - 1, n - Math.abs(m) - 1, n - Math.abs(m) + 1, 2 * n - 1, n * n, Math.abs(m) + 1], x => String(x)),
          expl: raw`Need $|m| \le l \le n - 1$: $l = ${Math.abs(m)}, \dots, ${n - 1}$, which is $n - |m| = ${n - Math.abs(m)}$ states.`,
          level: 2,
        };
      }
      const N = R.int(2, 5);
      const s = N * (N + 1) * (2 * N + 1) / 6;
      return {
        q: raw`In the hydrogen atom, how many distinct states (${sp}) have principal quantum number $n \le ${N}$?` + tail,
        ...mcv(R, g * s, [s * (3 - g), N * N, g * N * N, N * (N + 1) / 2, g * N * (N + 1), g * (s - N * N), g * (s + (N + 1) * (N + 1))], x => String(x)),
        expl: raw`Each level has $n^2$ orbital states, so the total is $\sum_{n=1}^{${N}} n^2 = ${s}$${spin ? raw`, times 2 for spin: $${2 * s}$` : ''}.`,
        level: 2,
      };
    },
  });

  T.push({
    id: 'qm2.h.qnums', sec: '5.4.3', level: 1,
    gen(R) {
      const kind = R.pick(['allowed', 'notallowed', 'max']);
      if (kind === 'max') {
        const n = R.int(2, 7);
        const z = R.bool();
        const v = z ? n - 1 : n * (n - 1);
        return {
          q: raw`A hydrogen atom is in a stationary state with principal quantum number $n = ${n}$. What is the largest possible ${z ? 'value of $L_z$' : 'eigenvalue of $L^2$'}?`,
          ...mcv(R, v, z ? [n, n + 1, n - 2, Math.sqrt(n * (n - 1)), 2 * n - 1, n * (n - 1)] : [n * (n + 1), n * n, (n - 1) * (n - 1), (n - 1) * (n - 2), n - 1, (n + 1) * (n + 2)], x => (z ? (Number.isInteger(x) ? qx(x, HB) : ex(x, HB)) : qx(x, raw`\hbar^2`))),
          expl: raw`The orbital quantum number satisfies $l \le n - 1 = ${n - 1}$, so ${z ? raw`$m \le l$ gives $L_z \le ${qx(n - 1, HB)}$` : raw`$L^2 = l(l+1)\hbar^2 \le ${n - 1}\cdot${n}\hbar^2 = ${n * (n - 1)}\hbar^2$`}.`,
        };
      }
      const spin = R.bool(0.4);
      const ms = () => (R.bool() ? raw`+\tfrac{1}{2}` : raw`-\tfrac{1}{2}`);
      const fmt = t => spin ? raw`$(n, l, m_l, m_s) = (${t[0]}, ${t[1]}, ${t[2]}, ${t[3]})$` : raw`$(n, l, m_l) = (${t[0]}, ${t[1]}, ${t[2]})$`;
      const valid = () => { const n = R.int(1, 5), l = R.int(0, n - 1), m = R.int(-l, l); return [n, l, m, ms()]; };
      const invalid = type => {
        const n = R.int(1, 5);
        if (type === 0) { const l = R.int(n, n + 1); return [n, l, R.int(-l, l), ms(), raw`$l$ must be less than $n$`]; }
        if (type === 1) { const l = R.int(0, n - 1); const m = (l + R.int(1, 2)) * R.sign(); return [n, l, m, ms(), raw`$|m_l|$ cannot exceed $l$`]; }
        if (type === 2) return [0, 0, 0, ms(), raw`$n \ge 1$`];
        if (type === 3) { const l = R.int(1, Math.max(1, n - 1)); return [Math.max(n, 2), l, raw`\tfrac{1}{2}`, ms(), raw`orbital $m_l$ must be an integer`]; }
        if (type === 4 && spin) { const v = valid(); v[3] = R.pick(['0', '+1', '-1']); v.push(raw`$m_s = \pm\tfrac{1}{2}$ only`); return v; }
        const l = R.int(1, 3); return [Math.max(n, l + 1), -l, 0, ms(), raw`$l \ge 0$`];
      };
      if (kind === 'allowed') {
        const c = valid();
        const types = R.shuffle([0, 1, 2, 3, 4, 5, 0, 1]);
        const bad = types.map(invalid);
        return {
          q: `Which of the following sets of quantum numbers is allowed for an electron in a hydrogen atom?`,
          ...GRE.mc(R, fmt(c), bad.map(fmt)),
          expl: raw`Rules: $n = 1, 2, \dots$; $l = 0, \dots, n-1$; $m_l = -l, \dots, l$ (integers)${spin ? raw`; $m_s = \pm\tfrac{1}{2}$` : ''}. Only ${fmt(c)} obeys all of them.`,
        };
      }
      const type = R.pick(spin ? [0, 1, 3, 4, 5] : [0, 1, 2, 3, 5]);
      const b = invalid(type);
      const goods = [];
      for (let k = 0; k < 12 && goods.length < 6; k++) goods.push(fmt(valid()));
      return {
        q: `Which of the following sets of quantum numbers is NOT allowed for an electron in a hydrogen atom?`,
        ...GRE.mc(R, fmt(b), goods),
        expl: raw`${fmt(b)} is forbidden: ${b[4]}. The rules are $n \ge 1$, $0 \le l \le n-1$, $|m_l| \le l$ with integer $m_l$${spin ? raw`, $m_s = \pm\tfrac{1}{2}$` : ''}.`,
      };
    },
  });

  T.push({
    id: 'qm2.h.nodes', sec: '5.4.3', level: 2,
    gen(R) {
      const kind = R.pick(['count', 'count', 'energy', 'which']);
      const name = (n, l) => `${n}${LETTER[l]}`;
      if (kind === 'count') {
        const n = R.int(2, 7), l = R.int(0, Math.min(n - 1, 4));
        const v = n - l - 1;
        return {
          q: raw`How many nodes (zeros at $0 < r < \infty$) does the radial wavefunction $R_{nl}(r)$ of the hydrogen ${name(n, l)} state have?`,
          ...mcv(R, v, [n - 1, l, n - l, n, v + 2, n + l - 1, 2 * n - l - 1, v + 1, v + 3].filter(x => x >= 0), x => String(x)),
          expl: raw`$R_{nl} \propto r^l e^{-r/na}\,L(r)$ with a polynomial $L$ of degree $n - l - 1$, so there are $n - l - 1 = ${v}$ radial nodes. Answering $n - 1$ or $l$ is the usual slip.`,
        };
      }
      if (kind === 'energy') {
        const k = R.int(0, 3), l = R.int(0, 3);
        const n = k + l + 1;
        if (n < 2) throw new Error('trivial');
        const E = -13.6 / (n * n);
        const W = m => -13.6 / (m * m);
        return {
          q: raw`A hydrogen energy eigenfunction has orbital quantum number $l = ${l}$, and its radial part has ${k === 0 ? 'no nodes' : k === 1 ? 'exactly one node' : `exactly ${k} nodes`} at $0 < r < \infty$. What is its energy?`,
          ...GRE.numeric(R, E, [W(k + 1), W(k + l) , W(k + l + 2), W(l + 1), W(Math.max(1, k + l - 1))].filter(x => isFinite(x)), { unit: raw`\text{eV}`, sig: 3, tol: 0.05 }),
          expl: raw`The number of radial nodes is $n - l - 1$, so $n = ${k} + ${l} + 1 = ${n}$ and $E = -13.6\,\text{eV}/${n * n} \approx ${F.num(E, 3)}\,\text{eV}$.`,
        };
      }
      const k = R.int(0, 3);
      const cands = [];
      for (let n = 1; n <= 6; n++) for (let l = 0; l < Math.min(n, 4); l++) cands.push([n, l]);
      const good = R.pick(cands.filter(c => c[0] - c[1] - 1 === k));
      const bad = R.shuffle(cands.filter(c => c[0] - c[1] - 1 !== k)).slice(0, 8);
      return {
        q: raw`Which of the following hydrogen states has a radial wavefunction with exactly ${k === 0 ? 'zero nodes' : k === 1 ? 'one node' : `${k} nodes`} at $0 < r < \infty$?`,
        ...GRE.mc(R, name(good[0], good[1]), bad.map(c => name(c[0], c[1]))),
        expl: raw`Radial nodes $= n - l - 1$. For ${name(good[0], good[1])}: $${good[0]} - ${good[1]} - 1 = ${k}$. (s, p, d, f mean $l = 0, 1, 2, 3$.)`,
      };
    },
  });

  T.push({
    id: 'qm2.h.expect', sec: '5.4.3', level: 2, weight: 2,
    gen(R) {
      const kind = R.pick(['r', 'inv', 'r2', 'ratio', 'virial', 'virial']);
      const Z = R.pick([1, 1, 1, 2, 3]);
      const n = R.int(1, 4), l = R.int(0, n - 1);
      const state = raw`the $n = ${n}$, $l = ${l}$ state of ${ION(Z)}`;
      const note = raw` Use $\langle r\rangle = \frac{a}{2Z}[3n^2 - l(l+1)]$ if needed, where $a$ is the Bohr radius.`;
      const rr = (nn, ll) => (3 * nn * nn - ll * (ll + 1)) / (2 * Z);
      if (kind === 'r') {
        const v = rr(n, l);
        return {
          q: raw`What is $\langle r\rangle$ for the electron in ${state}?` + note,
          ...mcv(R, v, [n * n / Z, 1.5 * n * n / Z, (3 * n * n + l * (l + 1)) / (2 * Z), rr(n, l) * Z, n / Z, rr(n, l) / Z, 2 * v, v / 2, 1.5 * v, v + 1], x => qx(x, 'a')),
          expl: raw`$\langle r\rangle = \frac{a}{2Z}[3n^2 - l(l+1)] = \frac{a}{${2 * Z}}(${3 * n * n} - ${l * (l + 1)}) = ${qx(v, 'a')}$. Lengths scale as $a/Z$; note that $\langle r\rangle$ is not the Bohr-orbit radius $n^2a/Z$.`,
          level: 2,
        };
      }
      if (kind === 'inv') {
        const v = Z / (n * n);
        return {
          q: raw`What is $\langle 1/r\rangle$ for the electron in ${state}? Here $a$ is the Bohr radius. (Hint: use the virial theorem.)`,
          ...mcv(R, v, [1 / rr(n, l), Z * Z / (n * n), Z / n, Z / (n * n * n), 2 * Z / (n * n), 1 / (n * n * Z), v / 2, 3 * v, 4 * v], x => fr(x, '', 'a')),
          expl: raw`By the virial theorem $\langle V\rangle = 2E_n$, i.e. $-\frac{Ze^2}{4\pi\epsilon_0}\langle 1/r\rangle = -\frac{Z^2e^2}{4\pi\epsilon_0\,a\,n^2}$, so $\langle 1/r\rangle = \frac{Z}{n^2a} = ${fr(v, '', 'a')}$, independent of $l$. Note $\langle 1/r\rangle \ne 1/\langle r\rangle$.`,
          level: 3,
        };
      }
      if (kind === 'r2') {
        const v = n * n * (5 * n * n + 1 - 3 * l * (l + 1)) / (2 * Z * Z);
        return {
          q: raw`For ${state}, $\langle r^2\rangle = \frac{n^2a^2}{2Z^2}[5n^2 + 1 - 3l(l+1)]$ and $\langle r\rangle = \frac{a}{2Z}[3n^2 - l(l+1)]$, where $a$ is the Bohr radius. What is $(\Delta r)^2$, the square of the uncertainty in $r$?`,
          ...mcv(R, v - rr(n, l) ** 2, [v, rr(n, l) ** 2, v + rr(n, l) ** 2, (v - rr(n, l) ** 2) * Z * Z || 1, v - rr(n, l), (v - rr(n, l) ** 2) * 2, (v - rr(n, l) ** 2) / 2, (v - rr(n, l) ** 2) + 1], x => qx(x, 'a^2')),
          expl: raw`$\langle r^2\rangle = ${rat(v)}\,a^2$ and $\langle r\rangle = ${qx(rr(n, l), 'a')}$, so $(\Delta r)^2 = \langle r^2\rangle - \langle r\rangle^2 = (${rat(v)} - ${rat(rr(n, l) ** 2)})a^2 = ${rat(v - rr(n, l) ** 2)}\,a^2$.`,
          level: 3,
        };
      }
      if (kind === 'ratio') {
        const n2 = R.int(1, 5), l2 = R.int(0, n2 - 1);
        if (n2 === n && l2 === l) throw new Error('same');
        const v = rr(n2, l2) / rr(n, l);
        return {
          q: raw`In hydrogen, what is the ratio $\langle r\rangle_{${n2}${LETTER[l2]}}/\langle r\rangle_{${n}${LETTER[l]}}$ of the mean electron–proton distances in the ${n2}${LETTER[l2]} and ${n}${LETTER[l]} states? Use $\langle r\rangle = \frac{a}{2}[3n^2 - l(l+1)]$.`,
          ...mcv(R, v, [(n2 * n2) / (n * n), n2 / n, 1 / v, (3 * n2 * n2 + l2 * (l2 + 1)) / (3 * n * n + l * (l + 1)), (n2 * n2 * n2) / (n * n * n), 2 * v, v / 2, v + 1], rat),
          expl: raw`$\langle r\rangle_{${n2}${LETTER[l2]}} = ${qx((3 * n2 * n2 - l2 * (l2 + 1)) / 2, 'a')}$ and $\langle r\rangle_{${n}${LETTER[l]}} = ${qx((3 * n * n - l * (l + 1)) / 2, 'a')}$; the ratio is $${rat(v)}$. Simply using $n^2$ ignores the $l$ dependence.`,
          level: 2,
        };
      }
      const E = -13.6 * Z * Z / (n * n);
      const askT = R.bool();
      const v = askT ? -E : 2 * E;
      return {
        q: raw`What is the expectation value of the ${askT ? 'kinetic' : 'potential'} energy of the electron in the $n = ${n}$ level of ${ION(Z)}?`,
        ...GRE.numeric(R, v, [E, -E, 2 * E, -2 * E, E / 2, -E / 2, 4 * E].filter(x => Math.abs(x - v) > 1e-9), { unit: raw`\text{eV}`, sig: 3, allowSign: true }),
        expl: raw`$E_n = -13.6\,Z^2/n^2\,\text{eV} = ${F.num(E, 3)}\,\text{eV}$. For a $1/r$ potential the virial theorem gives $\langle T\rangle = -E_n$ and $\langle V\rangle = 2E_n$, so the answer is $${F.num(v, 3)}\,\text{eV}$.`,
        level: 2,
      };
    },
  });

  T.push({
    id: 'qm2.h.ground', sec: '5.4.3', level: 3,
    gen(R) {
      const kind = R.pick(['dens', 'dens', 'inside', 'stats', 'stats']);
      const psi = raw`$\psi_{100} = \frac{1}{\sqrt{\pi a^3}}e^{-r/a}$`;
      const stem = raw`The ground state of hydrogen is ${psi}, where $a$ is the Bohr radius.`;
      const ef = (c, k) => { // c * e^k
        const cs = rat(c);
        const es = k === 0 ? '' : k === 1 ? 'e' : `e^{${k}}`;
        if (!es) return cs;
        return (cs === '1' ? '' : cs) + es;
      };
      if (kind === 'dens') {
        const opts = [0.5, 1, 1.5, 2, 3];
        const [r1, r2] = R.pickN(opts, 2);
        const radial = R.bool(0.6);
        const k = -2 * (r1 - r2);
        if (!Number.isInteger(k)) throw new Error('k');
        const c = radial ? (r1 / r2) ** 2 : 1;
        const cands = [[c, k], [radial ? 1 : (r1 / r2) ** 2, k], [r1 / r2, k], [c, k / 2], [c, -k], [(r2 / r1) ** 2, k], [1, k / 2], [(r1 / r2) ** 2, -k]];
        const str = new Map();
        const items = [];
        for (const [cc, kk] of cands) {
          if (!Number.isInteger(kk)) continue;
          const s = '$' + ef(cc, kk) + '$';
          if (!str.has(s)) { str.set(s, cc * Math.exp(kk)); items.push(s); }
        }
        const fa = x => (x === 1 ? 'a' : qx(x, 'a'));
        return {
          q: stem + (radial
            ? raw` What is the ratio $P(${fa(r1)})/P(${fa(r2)})$, where $P(r)\,dr$ is the probability of finding the electron between $r$ and $r + dr$?`
            : raw` What is the ratio of the probability densities $|\psi|^2$ at a point a distance $${fa(r1)}$ from the proton and at a point a distance $${fa(r2)}$ from it?`),
          ...GRE.mc(R, items[0], items.slice(1), { rank: s => str.get(s) }),
          expl: radial
            ? raw`$P(r) = 4\pi r^2|\psi|^2 \propto r^2e^{-2r/a}$, so the ratio is $\left(\frac{${rat(r1)}}{${rat(r2)}}\right)^2e^{-2(${rat(r1)} - ${rat(r2)})} = ${ef(c, k)}$. Don't forget either the $r^2$ or the square of $e^{-r/a}$.`
            : raw`$|\psi|^2 \propto e^{-2r/a}$ (no $r^2$ — that belongs to the radial probability $P(r)$), so the ratio is $e^{-2(${rat(r1)} - ${rat(r2)})} = ${ef(1, k)}$.`,
        };
      }
      if (kind === 'inside') {
        const b = R.pick([0.5, 1, 1.5, 2, 3]);
        const poly = 1 + 2 * b + 2 * b * b;
        const k = -2 * b;
        const P = 1 - poly * Math.exp(k);
        const opt = (c, kk, comp) => ({ s: '$' + (comp ? '' : '1 - ') + ef(c, kk) + '$', v: comp ? c * Math.exp(kk) : 1 - c * Math.exp(kk) });
        const list = [opt(poly, k), opt(1, k), opt(poly, k, true), opt(1 + 2 * b, k), opt(1 + b + b * b / 2, -b), opt(2 * b * b, k)];
        const map = new Map(); const ss = [];
        list.forEach(o => { if (!map.has(o.s)) { map.set(o.s, o.v); ss.push(o.s); } });
        const fa = b === 1 ? 'a' : qx(b, 'a');
        return {
          q: stem + raw` What is the probability that the electron is found within a distance $${fa}$ of the proton? (You may use $\int_0^x u^2e^{-u}du = 2 - e^{-x}(x^2 + 2x + 2)$.)`,
          ...GRE.mc(R, ss[0], ss.slice(1), { rank: s => map.get(s) }),
          expl: raw`$P = \frac{4}{a^3}\int_0^{${fa}} r^2e^{-2r/a}dr = \frac{1}{2}\int_0^{${rat(2 * b)}}u^2e^{-u}du = 1 - e^{${k}}(1 + ${rat(2 * b)} + ${rat(2 * b * b)}) = ${ss[0].slice(1, -1)} \approx ${F.num(P, 2)}$.`,
        };
      }
      const Z = R.pick([1, 1, 2]);
      const q = R.pick(['mean', 'mp', 'r2', 'x2', 'dr']);
      const s = 1 / Z;
      const M = {
        mean: [1.5, raw`\langle r\rangle`, [1, 3, 0.5, 2, 3 / 4], 'a', raw`$\langle r\rangle = \frac{4}{a^3}\int_0^\infty r^3e^{-2r/a}dr = \frac{3}{2}a$; the most probable radius is $a$, a common trap.`],
        mp: [1, raw`\text{the most probable distance } r_{\text{mp}}`, [1.5, 0.5, 2, 0, 3], 'a', raw`$P(r) \propto r^2e^{-2r/a}$ peaks where $2/r = 2/a$, i.e. $r = a$ (whereas $|\psi|^2$ itself is largest at $r = 0$, and $\langle r\rangle = 3a/2$).`],
        r2: [3, raw`\langle r^2\rangle`, [9 / 4, 1, 1.5, 6, 2], 'a^2', raw`$\langle r^2\rangle = \frac{4}{a^3}\int_0^\infty r^4e^{-2r/a}dr = \frac{4}{a^3}\cdot\frac{4!\,a^5}{32} = 3a^2$, which is not $\langle r\rangle^2 = \tfrac{9}{4}a^2$.`],
        x2: [1, raw`\langle x^2\rangle`, [3, 1.5, 1 / 3, 9 / 4, 0.5], 'a^2', raw`By spherical symmetry $\langle x^2\rangle = \tfrac{1}{3}\langle r^2\rangle = \tfrac{1}{3}(3a^2) = a^2$.`],
        dr: [Math.sqrt(3) / 2, raw`\Delta r`, [Math.sqrt(3), 0.75, 1.5, 0.5, Math.sqrt(3) / 4], 'a', raw`$\Delta r = \sqrt{\langle r^2\rangle - \langle r\rangle^2} = \sqrt{3 - 9/4}\,a = \frac{\sqrt{3}}{2}a$.`],
      }[q];
      const pw = M[3] === 'a^2' ? 2 : 1;
      const f = x => ex(x, M[3]);
      return {
        q: raw`The ground state of ${Z === 1 ? 'hydrogen' : raw`the hydrogen-like ion $\text{He}^{+}$`} has wavefunction $\psi \propto e^{-Zr/a}$ with $Z = ${Z}$, where $a$ is the Bohr radius. What is $${M[1]}$ in this state?`,
        ...mcv(R, M[0] * Math.pow(s, pw), M[2].map(x => x * Math.pow(s, pw)).concat([M[0] * Math.pow(Z, pw) === M[0] * Math.pow(s, pw) ? null : M[0], M[0] * 4]), f),
        expl: M[4] + (Z === 1 ? '' : raw` With $Z = 2$ every length scales as $a/Z$, giving $${f(M[0] * Math.pow(s, pw))}$.`),
        level: 2,
      };
    },
  });

  T.push({
    id: 'qm2.h.scaling', sec: '5.4.3', level: 2,
    gen(R) {
      const kind = R.pick(['sys', 'sys', 'sys', 'grav']);
      if (kind === 'grav') {
        const two = R.bool();
        const askR = R.bool();
        const sys = two
          ? raw`Two neutral particles, each of mass $m$, form a bound state held together only by gravity ($V = -Gm^2/r$).`
          : raw`A neutral particle of mass $m$ is bound by gravity to a much heavier point mass $M$ ($V = -GMm/r$, $M \gg m$).`;
        let c, w;
        if (askR) {
          c = two ? raw`$\dfrac{2\hbar^2}{Gm^3}$` : raw`$\dfrac{\hbar^2}{GMm^2}$`;
          w = two ? [raw`$\dfrac{\hbar^2}{Gm^3}$`, raw`$\dfrac{4\hbar^2}{Gm^3}$`, raw`$\dfrac{\hbar^2}{2Gm^3}$`, raw`$\dfrac{2\hbar}{Gm^3}$`, raw`$\dfrac{2\hbar^2}{Gm^2}$`]
            : [raw`$\dfrac{\hbar^2}{GM^2m}$`, raw`$\dfrac{\hbar^2}{GMm}$`, raw`$\dfrac{\hbar}{GMm^2}$`, raw`$\dfrac{\hbar^2G}{Mm^2}$`, raw`$\dfrac{\hbar^2}{Gm^3}$`];
        } else {
          c = two ? raw`$-\dfrac{G^2m^5}{4\hbar^2}$` : raw`$-\dfrac{G^2M^2m^3}{2\hbar^2}$`;
          w = two ? [raw`$-\dfrac{G^2m^5}{2\hbar^2}$`, raw`$-\dfrac{G^2m^5}{8\hbar^2}$`, raw`$-\dfrac{Gm^3}{4\hbar^2}$`, raw`$-\dfrac{G^2m^4}{4\hbar^2}$`, raw`$-\dfrac{G^2m^5}{4\hbar}$`]
            : [raw`$-\dfrac{G^2M^3m^2}{2\hbar^2}$`, raw`$-\dfrac{G^2M^2m^3}{\hbar^2}$`, raw`$-\dfrac{GMm^2}{2\hbar^2}$`, raw`$-\dfrac{G^2Mm^3}{2\hbar^2}$`, raw`$-\dfrac{G^2M^2m^2}{2\hbar}$`];
        }
        return {
          q: sys + ` Treating it like a hydrogen atom, what is its ${askR ? '"Bohr radius"' : 'ground-state energy'}?`,
          ...GRE.mc(R, c, w),
          expl: raw`For $V = -\kappa/r$ the hydrogen results are $a = \hbar^2/(\mu\kappa)$ and $E_1 = -\mu\kappa^2/(2\hbar^2)$ (replace $e^2/4\pi\epsilon_0 \to \kappa$). Here $\kappa = ${two ? 'Gm^2' : 'GMm'}$ and $\mu = ${two ? 'm/2' : 'm'}$, giving ${c}.`,
          level: 3,
        };
      }
      // exotic hydrogen-like systems: reduced mass mu (units of m_e), product of charges q*Z
      const S = R.pick([
        { name: 'positronium (an electron bound to a positron)', mu: 0.5, qZ: 1, mu_t: raw`m_e/2` },
        { name: raw`the hydrogen-like ion $\text{He}^{+}$`, mu: 1, qZ: 2, mu_t: raw`m_e` },
        { name: raw`the hydrogen-like ion $\text{Li}^{2+}$`, mu: 1, qZ: 3, mu_t: raw`m_e` },
        { name: raw`muonic hydrogen (a muon bound to a proton, reduced mass $\approx 186\,m_e$)`, mu: 186, qZ: 1, mu_t: raw`186\,m_e` },
        ...[[2, 1, 2], [3, 1, 1], [2, 2, 1], [4, 1, 1], [1, 2, 2], [3, 1, 2], [2, 1, 3]].map(([k, q, Z]) => ({
          name: raw`a hypothetical atom in which a particle of mass $${k === 1 ? '' : k}m_e$ and charge $-${q === 1 ? '' : q}e$ orbits a very heavy nucleus of charge $+${Z === 1 ? '' : Z}e$`, mu: k, qZ: q * Z, mu_t: raw`${k === 1 ? '' : k}m_e`,
        })),
      ]);
      const ask = R.pick(['E', 'a', 'lam']);
      const E = S.mu * S.qZ * S.qZ, A = 1 / (S.mu * S.qZ);
      const v = ask === 'E' ? E : ask === 'a' ? A : 1 / E;
      const wr = ask === 'E' ? [S.mu * S.qZ, S.mu * S.qZ ** 4, S.mu * S.mu * S.qZ * S.qZ, 1 / E, S.qZ * S.qZ, S.mu]
        : ask === 'a' ? [S.mu * S.qZ, 1 / S.mu, 1 / (S.mu * S.qZ * S.qZ), 1 / S.qZ, S.mu * S.qZ * S.qZ, 1 / (S.mu * S.mu * S.qZ)]
          : [E, 1 / (S.mu * S.qZ), 1 / S.mu, 1 / (S.qZ * S.qZ), S.mu * S.qZ, 1 / (S.mu * S.qZ ** 4)];
      const what = ask === 'E' ? 'ground-state binding energy' : ask === 'a' ? 'characteristic size (Bohr radius)' : raw`wavelength of the photon emitted in the $n = 2 \to 1$ transition`;
      return {
        q: raw`Consider ${S.name}. By what factor does the ${what} of this system differ from that of ordinary hydrogen? (Take the reduced mass of hydrogen to be $m_e$.)`,
        ...mcv(R, v, wr.concat([2 * v, v / 2, 4 * v, v / 4]), rat),
        expl: raw`With potential $-qZe^2/(4\pi\epsilon_0 r)$ and reduced mass $\mu$: $a \propto 1/(\mu qZ)$ and $E_n \propto \mu(qZ)^2$. Here $\mu = ${S.mu_t}$ and $qZ = ${S.qZ}$, so the energy scales by $${rat(E)}$, the size by $${rat(A)}$, and photon wavelengths by $${rat(1 / E)}$. Note the charge enters squared, not to the fourth power.`,
      };
    },
  });

  T.push({
    id: 'qm2.h.superpos', sec: '5.4.3', level: 2,
    gen(R) {
      const pool = [];
      for (let n = 1; n <= 3; n++) for (let l = 0; l < n; l++) for (let m = -l; m <= l; m++) pool.push([n, l, m]);
      const k = R.pick([2, 3, 3]);
      const { comps, N } = superpose(R, pool, k);
      const psi = raw`$\Psi = A\left[${lin(comps.map(o => ({ c: o.c, s: raw`\psi_{${o.p[0]}${o.p[1]}${o.p[2] < 0 ? `(${o.p[2]})` : o.p[2]}}` })))}\right]$`;
      const stem = raw`A hydrogen atom is in the state ${psi}, where $\psi_{nlm}$ are normalized energy eigenfunctions and $A$ is a normalization constant. Neglect spin and fine structure.`;
      const kind = R.pick(['E', 'E', 'PE', 'L2', 'Lz']);
      const sumW = f => comps.reduce((s, o) => s + o.w * f(o.p), 0);
      const P = comps.map(o => `${o.w}/${N}`).join(', ');
      if (kind === 'E') {
        const f = p => -13.6 / (p[0] * p[0]);
        const v = sumW(f) / N;
        const wr = [comps.reduce((s, o) => s + f(o.p), 0) / k, sumW(f), -13.6 * sumW(p => 1 / p[0]) / N, f(comps[0].p), comps.reduce((s, o) => s + Math.sqrt(o.w) * f(o.p), 0) / comps.reduce((s, o) => s + Math.sqrt(o.w), 0)];
        return {
          q: stem + raw` What is the expectation value of the energy?`,
          ...GRE.numeric(R, v, wr.filter(x => isFinite(x) && x < 0), { unit: raw`\text{eV}`, sig: 3, tol: 0.06 }),
          expl: raw`Probabilities are $|c_k|^2/\sum|c|^2$: ${P}. Then $\langle E\rangle = \sum P_k(-13.6\,\text{eV}/n_k^2) \approx ${F.num(v, 3)}\,\text{eV}$.`,
        };
      }
      if (kind === 'PE') {
        const nt = R.pick(comps).p[0];
        const v = sumW(p => (p[0] === nt ? 1 : 0)) / N;
        const nm = comps.filter(o => o.p[0] === nt).length;
        return {
          q: stem + raw` What is the probability that a measurement of the energy gives $${F.num(-13.6 / (nt * nt), 3)}\,\text{eV}$?`,
          ...mcv(R, v, [1 - v, comps.find(o => o.p[0] === nt).w / N, nm / k, 1 / k].concat(PFILL), rat),
          expl: raw`$-13.6/n^2 = ${F.num(-13.6 / (nt * nt), 3)}$ means $n = ${nt}$. Add the probabilities ($|c|^2$ over the total ${N}) of all components with $n = ${nt}$, whatever their $l$ and $m$: $P = ${rat(v)}$.`,
        };
      }
      const L2 = kind === 'L2';
      const f = L2 ? p => p[1] * (p[1] + 1) : p => p[2];
      const v = sumW(f) / N;
      const wr = [sumW(f), comps.reduce((s, o) => s + f(o.p), 0) / k, L2 ? sumW(p => p[1] * p[1]) / N : sumW(p => Math.abs(p[2])) / N, L2 ? sumW(p => p[1]) / N : -v, L2 ? sumW(p => p[0] * (p[0] - 1)) / N : sumW(p => p[1]) / N, L2 ? sumW(p => (p[1] + 1) ** 2) / N : v + 1];
      return {
        q: stem + (L2 ? raw` What is $\langle L^2\rangle$?` : raw` What is $\langle L_z\rangle$?`),
        ...mcv(R, v, wr, x => qx(x, L2 ? raw`\hbar^2` : HB)),
        expl: raw`The component probabilities are ${P}. Each $\psi_{nlm}$ is an eigenstate of ${L2 ? '$L^2$ with eigenvalue $l(l+1)\\hbar^2$' : '$L_z$ with eigenvalue $m\\hbar$'}, so the expectation value is the weighted average $${qx(v, L2 ? raw`\hbar^2` : HB)}$ (it does not depend on $n$).`,
      };
    },
  });

  T.push({
    id: 'qm2.h.roman', sec: '5.4.3', level: 2,
    gen(R) {
      const TRUE = [
        [raw`The energy depends only on $n$, not on $l$ or $m$.`, raw`this "accidental" degeneracy is special to the $1/r$ potential (without fine structure).`],
        [raw`For $l > 0$ the wavefunction vanishes at the origin.`, raw`$R_{nl} \propto r^l$ near $r = 0$.`],
        [raw`The ground-state probability density $|\psi|^2$ is largest at the nucleus.`, raw`$|\psi_{100}|^2 \propto e^{-2r/a}$ is maximal at $r = 0$; only $r^2|\psi|^2$ peaks at $a$.`],
        [raw`The radial wavefunction $R_{nl}$ depends on $n$ and $l$ but not on $m$.`, raw`$m$ appears only in $Y_l^m$.`],
        [raw`For a given $n$, the allowed values of $l$ are $0, 1, \dots, n - 1$.`, raw`this follows from the termination of the radial series.`],
        [raw`States with $l = n - 1$ have radial wavefunctions with no nodes.`, raw`the number of radial nodes is $n - l - 1 = 0$.`],
        [raw`Replacing the electron mass by the reduced mass $\mu$ rescales the Bohr radius as $1/\mu$.`, raw`$a = 4\pi\epsilon_0\hbar^2/(\mu e^2)$.`],
        [raw`In the ground state, $\langle r\rangle$ is larger than the most probable radius.`, raw`$\langle r\rangle = 3a/2 > r_{\text{mp}} = a$.`],
      ];
      const FALSE = [
        [raw`States with the same $n$ but different $l$ have different energies.`, raw`for the pure Coulomb potential they are degenerate.`],
        [raw`The ground-state probability density $|\psi|^2$ is largest at $r = a$.`, raw`$|\psi|^2$ is largest at $r = 0$; the radial density $r^2|\psi|^2$ peaks at $a$.`],
        [raw`All hydrogen eigenfunctions are spherically symmetric.`, raw`only $l = 0$ states are; the others carry $Y_l^m(\theta,\phi)$.`],
        [raw`The ground-state radial wavefunction has one node.`, raw`$n - l - 1 = 0$ for the 1s state.`],
        [raw`There are $2n - 1$ orbital states with energy $E_n$.`, raw`there are $n^2$.`],
        [raw`The Bohr radius is independent of the mass of the orbiting particle.`, raw`$a \propto 1/\mu$.`],
        [raw`The wavefunction of every state vanishes at the origin.`, raw`$l = 0$ states are nonzero at $r = 0$.`],
        [raw`In the ground state $\langle r\rangle = a$.`, raw`$\langle r\rangle = 3a/2$; $a$ is the most probable radius.`],
      ];
      return romanQ(R, raw`Consider the nonrelativistic hydrogen atom (Coulomb potential only, spin ignored). Which of the following statements is (are) true?`, TRUE, FALSE);
    },
  });

  // ================================================================ 5.5.1 Spin-1/2
  const GI = [[1, 0], [2, 0], [3, 0], [-1, 0], [-2, 0], [0, 1], [0, -1], [0, 2], [1, 1], [1, -1], [2, 1], [1, 2], [-1, 1], [2, -1]];
  function spinState(R) {
    const a = R.pick(GI), b = R.pick(GI);
    const N = cabs2(a) + cabs2(b);
    const form = R.bool()
      ? raw`$\chi = A${spinor(ctex(a), ctex(b))}$ (in the $S_z$ basis)`
      : raw`$|\chi\rangle = A\left[${lin([{ c: a, s: raw`|{\uparrow}\rangle` }, { c: b, s: raw`|{\downarrow}\rangle` }])}\right]$, where $|{\uparrow}\rangle$, $|{\downarrow}\rangle$ are the $S_z$ eigenstates`;
    return { a, b, N, form };
  }
  const probs = (a, b, N) => ({
    'z+': cabs2(a) / N, 'z-': cabs2(b) / N,
    'x+': cabs2(cadd(a, b)) / (2 * N), 'x-': cabs2(csub(a, b)) / (2 * N),
    'y+': cabs2(csub(a, cmul([0, 1], b))) / (2 * N), 'y-': cabs2(cadd(a, cmul([0, 1], b))) / (2 * N),
  });

  T.push({
    id: 'qm2.spin.prob', sec: '5.5.1', level: 2, weight: 2,
    gen(R) {
      const { a, b, N, form } = spinState(R);
      const ax = R.pick(['x', 'y', 'z', 'x', 'y']), sg = R.pick(['+', '-']);
      const P = probs(a, b, N);
      const v = P[ax + sg];
      const op = sg === '+' ? '-' : '+';
      const others = Object.keys(P).filter(k => k !== ax + sg).map(k => P[k]);
      const naive = ax === 'z' ? null : cabs2(ax === 'x' ? (sg === '+' ? cadd(a, b) : csub(a, b)) : (sg === '+' ? cadd(a, cmul([0, 1], b)) : csub(a, cmul([0, 1], b)))) / (2 * N);
      const wr = [P[ax + op], naive, ...others, ...PFILL];
      const vec = { x: raw`\frac{1}{\sqrt{2}}(1, ${sg === '+' ? '1' : '-1'})`, y: raw`\frac{1}{\sqrt{2}}(1, ${sg === '+' ? 'i' : '-i'})`, z: sg === '+' ? '(1, 0)' : '(0, 1)' }[ax];
      return {
        q: raw`A spin-$\frac{1}{2}$ particle is in the state ${form}, with $A$ a normalization constant. If $S_${ax}$ is measured, what is the probability of obtaining $${sg}\hbar/2$?`,
        ...mcv(R, v, wr, rat),
        expl: raw`$|A|^2 = 1/${N}$. The $S_${ax} = ${sg}\hbar/2$ eigenvector is $${vec}^T$; ${ax === 'z' ? raw`the probability is just $|${ctex(sg === '+' ? a : b)}|^2/${N}$` : raw`project onto it (complex-conjugating its components)`}: $P = ${rat(v)}$.${ax === 'y' ? raw` Remember the bra of $(1, \pm i)$ is $(1, \mp i)$.` : ''}`,
      };
    },
  });

  T.push({
    id: 'qm2.spin.expect', sec: '5.5.1', level: 2,
    gen(R) {
      const { a, b, N, form } = spinState(R);
      const ab = cmul(cconj(a), b);
      const E = { x: ab[0] / N, y: ab[1] / N, z: (cabs2(a) - cabs2(b)) / (2 * N) };
      const kind = R.pick(['x', 'y', 'z', 'x', 'y', 'dz']);
      if (kind === 'dz') {
        const v = Math.sqrt(cabs2(a) * cabs2(b)) / N;
        if (v < 1e-9) throw new Error('eig');
        return {
          q: raw`A spin-$\frac{1}{2}$ particle is in the state ${form}, with $A$ a normalization constant. What is the uncertainty $\Delta S_z$?`,
          ...mcv(R, v, [0.5, Math.abs(E.z), 2 * v, v * v, Math.sqrt(0.25 + E.z * E.z), 0.25 - E.z * E.z], x => ex(x, HB)),
          expl: raw`$\langle S_z^2\rangle = \hbar^2/4$ always, and $\langle S_z\rangle = ${qx(E.z, HB)}$, so $\Delta S_z = \sqrt{\hbar^2/4 - \langle S_z\rangle^2} = ${ex(v, HB)}$.`,
          level: 3,
        };
      }
      const v = E[kind];
      const wr = [-v, 2 * v, v / 2, E.x, E.y, E.z, -E.x, -E.y, kind === 'z' ? (cabs2(a) - cabs2(b)) / 2 : ab[kind === 'x' ? 0 : 1], kind === 'x' ? ab[1] / N : kind === 'y' ? ab[0] / N : null, 0, 0.5, -0.5, 0.25, -0.25, 1, -1];
      return {
        q: raw`A spin-$\frac{1}{2}$ particle is in the state ${form}, with $A$ a normalization constant. What is $\langle S_${kind}\rangle$?`,
        ...mcv(R, v, wr, x => qx(x, HB)),
        expl: raw`$|A|^2 = 1/${N}$. ${kind === 'z' ? raw`$\langle S_z\rangle = \frac{\hbar}{2}\frac{|\alpha|^2 - |\beta|^2}{${N}}$` : kind === 'x' ? raw`$\langle S_x\rangle = \frac{\hbar}{2}\chi^\dagger\sigma_x\chi = \hbar\,\text{Re}(\alpha^*\beta)/${N}$` : raw`$\langle S_y\rangle = \frac{\hbar}{2}\chi^\dagger\sigma_y\chi = \hbar\,\text{Im}(\alpha^*\beta)/${N}$`} with $\alpha = ${ctex(a)}$, $\beta = ${ctex(b)}$${kind !== 'z' ? raw` ($\alpha^*\beta = ${ctex(ab)}$)` : ''}: $\langle S_${kind}\rangle = ${qx(v, HB)}$.`,
      };
    },
  });

  T.push({
    id: 'qm2.spin.sg', sec: '5.5.1', level: 2,
    gen(R) {
      // axes: unit vectors; 'n' = in the xz-plane at angle th from z
      const th = R.pick([60, 120]);
      const s3 = Math.sqrt(3) / 2;
      const AX = { z: [0, 0, 1], x: [1, 0, 0], y: [0, 1, 0], n: [th === 60 ? s3 : s3, 0, th === 60 ? 0.5 : -0.5] };
      const nameAx = k => (k === 'n' ? raw`an axis $\hat{n}$ in the $xz$-plane at $${th}^\circ$ to the $z$ axis` : `the $${k}$ axis`);
      const len = R.int(2, 4) + (R.bool(0.4) ? 0 : 0);
      const seq = [];
      for (let i = 0; i < len; i++) {
        let k, tries = 0;
        do {
          k = R.pick(['z', 'x', 'y', 'n', 'z', 'x']);
          tries++;
        } while (tries < 30 && i > 0 && ((k === 'n' && seq[i - 1][0] === 'x') || (k === 'x' && seq[i - 1][0] === 'n') || (k === seq[i - 1][0] && R.bool(0.8))));
        if (i > 0 && ((k === 'n' && seq[i - 1][0] === 'x') || (k === 'x' && seq[i - 1][0] === 'n'))) throw new Error('irrational');
        seq.push([k, R.sign()]);
      }
      const unpol = R.bool(0.6);
      const dot = (u, v) => u[0] * v[0] + u[1] * v[1] + u[2] * v[2];
      const step = (p, c) => (1 + p[1] * c[1] * dot(AX[p[0]], AX[c[0]])) / 2;
      let v = unpol ? 0.5 : 1;
      const start = unpol ? 0 : 1;
      for (let i = 1; i < len; i++) v *= step(seq[i - 1], seq[i]);
      if (v < 1e-9 && R.bool(0.8)) throw new Error('zero');
      // mistakes: forget the 1/2 at the first magnet; use cos^2(theta) (Malus) instead of cos^2(theta/2); ignore intermediate magnets
      let malus = unpol ? 0.5 : 1;
      for (let i = 1; i < len; i++) { const d = dot(AX[seq[i - 1][0]], AX[seq[i][0]]) * seq[i - 1][1] * seq[i][1]; malus *= d * d; }
      const direct = (unpol ? 0.5 : 1) * step(seq[0], seq[len - 1]);
      const wr = [unpol ? 2 * v : v / 2, malus, direct, v / 2, 2 * v, 1 - v, ...PFILL, 1 / 16, 3 / 16, 3 / 32, 9 / 32, 1 / 32, 9 / 64, 3 / 64];
      const desc = seq.slice(start).map((s, i) => raw`(${i + 1}) along ${nameAx(s[0])}, passing only spin ${s[1] > 0 ? raw`$+\hbar/2$` : raw`$-\hbar/2$`}`);
      return {
        q: (unpol ? raw`An unpolarized beam of spin-$\frac{1}{2}$ atoms` : raw`A beam of spin-$\frac{1}{2}$ atoms, all prepared in the state with spin $${seq[0][1] > 0 ? '+' : '-'}\hbar/2$ along ${nameAx(seq[0][0])},`) +
          raw` passes in turn through Stern–Gerlach filters oriented ` + desc.join('; ') + raw`. What fraction of the atoms ${unpol ? 'entering the first filter' : 'in the incoming beam'} emerges from the last filter?`,
        ...mcv(R, v, wr, rat),
        expl: raw`${unpol ? raw`The first filter passes half of an unpolarized beam. ` : ''}Each later filter passes the fraction $\cos^2(\Theta/2) = \frac{1 + \hat{a}\cdot\hat{b}}{2}$, where $\Theta$ is the angle between the incoming spin direction and the filter's selected direction (axes at $90^\circ$ give $\frac{1}{2}$; the same direction gives 1, opposite gives 0). Each filter erases the memory of earlier ones. The product is $${rat(v)}$.`,
      };
    },
  });

  T.push({
    id: 'qm2.spin.pauli', sec: '5.5.1', level: 2,
    gen(R) {
      const kind = R.pick(['prod', 'prod', 'comm', 'eig', 'sq']);
      const s = i => raw`\sigma_${'xyz'[i]}`;
      if (kind === 'prod' || kind === 'comm') {
        const a = R.int(0, 2);
        const b = R.bool(0.8) ? (a + R.int(1, 2)) % 3 : a;
        const c = 3 - a - b;
        const e = a === b ? 0 : EPS(a, b, c);
        let lab, correct, wr, ex1;
        const isAnti = kind === 'comm' && R.bool(0.4);
        if (kind === 'prod') {
          lab = s(a) + s(b);
          correct = a === b ? 'I' : (e > 0 ? '' : '-') + 'i' + s(c);
          wr = a === b ? ['0', 'i' + s(a), '2I', s((a + 1) % 3), '-I', '-i' + s((a + 2) % 3)] : [(e > 0 ? '-' : '') + 'i' + s(c), s(c), 'I', '0', 'i' + s(a), (e > 0 ? '-' : '') + s(c), '2i' + s(c)];
          ex1 = raw`$\sigma_i\sigma_j = \delta_{ij}I + i\epsilon_{ijk}\sigma_k$`;
        } else if (isAnti) {
          lab = raw`\{${s(a)}, ${s(b)}\}`;
          correct = a === b ? '2I' : '0';
          wr = a === b ? ['0', 'I', '2' + s(a), '2i' + s(a), '-2I'] : ['2i' + s(c), '-2i' + s(c), 'i' + s(c), '2I', 'I'];
          ex1 = raw`Pauli matrices anticommute: $\{\sigma_i, \sigma_j\} = 2\delta_{ij}I$`;
        } else {
          lab = raw`[${s(a)}, ${s(b)}]`;
          correct = a === b ? '0' : (e > 0 ? '' : '-') + '2i' + s(c);
          wr = a === b ? ['2I', 'I', '2i' + s(a), 'i' + s((a + 1) % 3), '-2I'] : [(e > 0 ? '-' : '') + '2i' + s(c), (e > 0 ? '' : '-') + 'i' + s(c), '0', '2I', (e > 0 ? '' : '-') + '2' + s(c)];
          ex1 = raw`$[\sigma_i, \sigma_j] = 2i\epsilon_{ijk}\sigma_k$ (equivalently $[S_i, S_j] = i\hbar\epsilon_{ijk}S_k$)`;
        }
        return {
          q: raw`With the Pauli matrices $\sigma_x = \begin{pmatrix}0&1\\1&0\end{pmatrix}$, $\sigma_y = \begin{pmatrix}0&-i\\i&0\end{pmatrix}$, $\sigma_z = \begin{pmatrix}1&0\\0&-1\end{pmatrix}$ and $I$ the identity, what is $${lab}$?`,
          ...GRE.mc(R, '$' + correct + '$', wr.map(w => '$' + w + '$')),
          expl: ex1 + raw`, so $${lab} = ${correct}$. You can confirm by multiplying the $2\times2$ matrices.`,
          level: kind === 'prod' ? 1 : 2,
        };
      }
      if (kind === 'eig') {
        const [p, q] = R.pick([[3, 4], [4, 3], [5, 12], [12, 5], [1, 1], [1, 2], [2, 1], [1, 3], [6, 8], [2, 3]]);
        const [o1, o2] = R.pick([['x', 'z'], ['z', 'x'], ['x', 'y'], ['y', 'z']]);
        const r2 = p * p + q * q;
        const f = x => raw`\pm ${ex(x / 2, HB)}`;
        const correct = '$' + f(Math.sqrt(r2)) + '$';
        const wr = [f(p + q), f(2 * Math.sqrt(r2)), f(1), f(Math.abs(p - q) || 7), raw`${qx(p / 2, HB)}\text{ and }${qx(-q / 2, HB)}`, f(Math.sqrt(r2) / 2)].map(w => '$' + w + '$');
        return {
          q: raw`What are the eigenvalues of the spin-$\frac{1}{2}$ operator $${p === 1 ? '' : p}S_${o1} + ${q === 1 ? '' : q}S_${o2}$?`,
          ...GRE.mc(R, correct, wr),
          expl: raw`$${p === 1 ? '' : p}S_${o1} + ${q === 1 ? '' : q}S_${o2} = \sqrt{${r2}}\,(\hat{n}\cdot\mathbf{S})$ with $\hat{n}$ a unit vector, and $\hat{n}\cdot\mathbf{S}$ has eigenvalues $\pm\hbar/2$. So the eigenvalues are $${f(Math.sqrt(r2))}$ (also: trace 0, determinant $-\frac{\hbar^2}{4}(${p * p} + ${q * q})$).`,
        };
      }
      const [p, q] = R.pick([[1, 1], [1, 2], [2, 1], [1, 3], [2, 3], [3, 4], [1, -1], [2, -1]]);
      const [o1, o2] = R.pick([['x', 'y'], ['y', 'z'], ['x', 'z']]);
      const o3 = 'xyz'.replace(o1, '').replace(o2, '');
      const c = (p * p + q * q) / 4;
      const sign = ['xy', 'yz', 'zx'].indexOf(o1 + o2) >= 0 ? 1 : -1;
      const opT = raw`${p === 1 ? '' : p}S_${o1} ${q < 0 ? '-' : '+'} ${Math.abs(q) === 1 ? '' : Math.abs(q)}S_${o2}`;
      const cr = c * 4;
      const correct = raw`$${qx(c, raw`\hbar^2`)}\,I$`;
      const wr = [raw`$${qx((p + q) * (p + q) / 4, raw`\hbar^2`)}\,I$`, raw`$${qx(c, raw`\hbar^2`)}\,I + ${qx(Math.abs(p * q) / 2, raw`i\hbar^2`)}\,\sigma_${o3}$`, raw`$${qx(c * 2, raw`\hbar^2`)}\,I$`, raw`$${qx(c, raw`\hbar`)}\,I$`, raw`$0$`, raw`$${qx(c, raw`\hbar^2`)}\,\sigma_${o3}$`];
      void sign; void cr;
      return {
        q: raw`For a spin-$\frac{1}{2}$ particle, what is $(${opT})^2$? ($I$ is the $2\times2$ identity.)`,
        ...GRE.mc(R, correct, wr),
        expl: raw`$S_i^2 = \frac{\hbar^2}{4}I$ and different components anticommute ($S_iS_j + S_jS_i = 0$ for $i \ne j$), so the cross terms cancel: $(${opT})^2 = \frac{\hbar^2}{4}(${p * p} + ${q * q})I = ${correct.slice(1, -1)}$.`,
        level: 3,
      };
    },
  });

  T.push({
    id: 'qm2.spin.eigvec', sec: '5.5.1', level: 2,
    gen(R) {
      const r2 = raw`\frac{1}{\sqrt{2}}`;
      // [label, TeX, numeric vector [[re,im],[re,im]] normalized]
      const s = 1 / Math.SQRT2;
      const V = {
        'z+': [[spinor('1', '0'), [[1, 0], [0, 0]]], [spinor('i', '0'), [[0, 1], [0, 0]]]],
        'z-': [[spinor('0', '1'), [[0, 0], [1, 0]]], [spinor('0', '-1'), [[0, 0], [-1, 0]]]],
        'x+': [[spinor('1', '1', r2), [[s, 0], [s, 0]]], [spinor('-1', '-1', r2), [[-s, 0], [-s, 0]]]],
        'x-': [[spinor('1', '-1', r2), [[s, 0], [-s, 0]]], [spinor('-1', '1', r2), [[-s, 0], [s, 0]]]],
        'y+': [[spinor('1', 'i', r2), [[s, 0], [0, s]]], [spinor('-i', '1', r2), [[0, -s], [s, 0]]]],
        'y-': [[spinor('1', '-i', r2), [[s, 0], [0, -s]]], [spinor('i', '1', r2), [[0, s], [s, 0]]]],
      };
      const ov = (u, v) => { // |<u|v>|
        const re = u[0][0] * v[0][0] + u[0][1] * v[0][1] + u[1][0] * v[1][0] + u[1][1] * v[1][1];
        const im = u[0][0] * v[0][1] - u[0][1] * v[0][0] + u[1][0] * v[1][1] - u[1][1] * v[1][0];
        return Math.hypot(re, im);
      };
      const kind = R.pick(['basic', 'basic', 'tilt']);
      let correct, cv, wrongs, lab, expl;
      if (kind === 'basic') {
        const key = R.pick(Object.keys(V));
        const [k0, sg] = [key[0], key[1]];
        [correct, cv] = R.bool(0.7) ? V[key][0] : V[key][1];
        wrongs = Object.keys(V).filter(k => k !== key).map(k => R.pick(V[k]));
        lab = raw`$S_${k0}$ with eigenvalue $${sg}\hbar/2$`;
        expl = raw`The eigenvectors of $\sigma_${k0}$ are ${k0 === 'z' ? raw`$(1,0)^T$ and $(0,1)^T$` : k0 === 'x' ? raw`$\frac{1}{\sqrt{2}}(1, \pm1)^T$` : raw`$\frac{1}{\sqrt{2}}(1, \pm i)^T$`} for eigenvalues $\pm1$. An overall phase does not change the state, so ${correct.replace(/^/, '$') + '$'} is the $${sg}\hbar/2$ eigenvector (check by multiplying by $\sigma_${k0}$).`;
      } else {
        const th = R.pick([60, 120, 90]);
        const plane = R.pick(['xz', 'yz']);
        const up = R.bool(0.7);
        const c = Math.cos(th * Math.PI / 360), sn = Math.sin(th * Math.PI / 360);
        const T2 = x => ex(x);
        const mk = (a, b, im) => [spinor(T2(a), (im && Math.abs(b) > 1e-9 ? (b < 0 ? '-' : '') + (Math.abs(b) === 1 ? '' : T2(Math.abs(b))) + 'i' : T2(b))), im ? [[a, 0], [0, b]] : [[a, 0], [b, 0]]];
        const im = plane === 'yz';
        const fixT = v => [v[0].replace(/\\frac\{1\}\{\\sqrt\{2\}\}i/, raw`\frac{i}{\sqrt{2}}`).replace(/\\frac\{\\sqrt\{3\}\}\{2\}i/, raw`\frac{\sqrt{3}}{2}i`), v[1]];
        [correct, cv] = fixT(up ? mk(c, sn, im) : mk(-sn, c, im));
        const cands = [mk(Math.cos(th * Math.PI / 180), Math.sin(th * Math.PI / 180), im), mk(sn, c, im), mk(c, -sn, im), up ? mk(-sn, c, im) : mk(c, sn, im), mk(c, sn, !im), mk(s, s, false), mk(1, 0, false), mk(-sn, -c, im)].map(fixT);
        wrongs = cands;
        lab = raw`the spin component along $\hat{n} = (${plane === 'xz' ? raw`\sin\theta, 0, \cos\theta` : raw`0, \sin\theta, \cos\theta`})$ with $\theta = ${th}^\circ$, for eigenvalue $${up ? '+' : '-'}\hbar/2$`;
        expl = raw`$\hat{n}\cdot\boldsymbol{\sigma} = \begin{pmatrix}\cos\theta & ${plane === 'xz' ? raw`\sin\theta` : raw`-i\sin\theta`}\\ ${plane === 'xz' ? raw`\sin\theta` : raw`i\sin\theta`} & -\cos\theta\end{pmatrix}$, whose ${up ? '$+1$' : '$-1$'} eigenvector is ${up ? raw`$(\cos\frac{\theta}{2}, ${im ? 'i' : ''}\sin\frac{\theta}{2})^T$` : raw`$(-\sin\frac{\theta}{2}, ${im ? 'i' : ''}\cos\frac{\theta}{2})^T$`}. The half angle is the key: with $\theta/2 = ${th / 2}^\circ$ this is $${correct}$.`;
      }
      const wr = wrongs.filter(w => ov(w[1], cv) < 0.999).map(w => '$' + w[0] + '$');
      return {
        q: raw`Which of the following is a normalized eigenvector (in the $S_z$ basis) of ${lab}?`,
        ...GRE.mc(R, '$' + correct + '$', wr),
        expl,
        level: kind === 'tilt' ? 3 : 1,
      };
    },
  });

  T.push({
    id: 'qm2.spin.general', sec: '5.5.1', level: 1,
    gen(R) {
      const S = R.pick([[0.5, 'an electron'], [1, raw`a deuteron`], [1.5, raw`an $\Omega^-$ baryon`], [2.5, raw`an $^{17}\text{O}$ nucleus`], [1, 'a particle'], [1.5, 'a particle'], [2, 'a particle'], [2.5, 'a particle'], [3, 'a particle'], [3.5, 'a particle']]);
      const s = S[0], who = S[1] + raw` (spin $${hf(s)}$)`;
      const kind = R.pick(['S2', 'count', 'mag', 'lower', 'lower']);
      const L = s * (s + 1);
      if (kind === 'S2') return {
        q: raw`What is the eigenvalue of $\mathbf{S}^2$ for ${who}?`,
        ...mcv(R, L, [s * s, (s + 1) * (s + 1), 2 * s + 1, s, s * (s + 1) / 2, 2 * L, L + 1, L - 1], x => qx(x, raw`\hbar^2`)),
        expl: raw`$\mathbf{S}^2 = s(s+1)\hbar^2 = ${hf(s)}\cdot${hf(s + 1)}\,\hbar^2 = ${qx(L, raw`\hbar^2`)}$, the same for every state of the particle.`,
      };
      if (kind === 'count') return {
        q: raw`How many linearly independent spin states does ${who} have?`,
        ...mcv(R, 2 * s + 1, [2 * s, s + 1, 2 * s + 2, 4 * s + 2, Math.floor(s) + 1 === s + 1 ? s + 2 : 2 * s + 3, (2 * s + 1) * (2 * s + 1), 2 * s + 3, 2 * s - 1, s + 2, s + 1.5, 4 * s].filter(x => x > 0 && Number.isInteger(x)), x => String(x)),
        expl: raw`$m_s$ runs from $-s$ to $s$ in integer steps: $2s + 1 = ${2 * s + 1}$ states.`,
      };
      if (kind === 'mag') return {
        q: raw`What is the largest possible ratio $S_z/|\mathbf{S}|$ for ${who}, where $|\mathbf{S}| = \sqrt{\langle\mathbf{S}^2\rangle}$?`,
        ...mcv(R, s / Math.sqrt(L), [1, s / (s + 1), s / L, 0.5 / Math.sqrt(L), s / (s + 2), Math.sqrt(s / (s + 2)), 0.5], x => ex(x)),
        expl: raw`$S_{z,\max} = s\hbar$ and $|\mathbf{S}| = \sqrt{s(s+1)}\hbar$, so the ratio is $\sqrt{s/(s+1)} = ${ex(s / Math.sqrt(L))} < 1$.`,
        level: 2,
      };
      const up = R.bool();
      const mlist = [];
      for (let k = 0; k <= Math.round(2 * s); k++) mlist.push(-s + k);
      const mm = R.pick(mlist.filter(x => (up ? x < s : x > -s)));
      const N = L - mm * (mm + (up ? 1 : -1));
      const v = Math.sqrt(N);
      return {
        q: raw`For ${who}, the operator $S_${up ? '+' : '-'} = S_x ${up ? '+' : '-'} iS_y$ acts on $|s, m_s\rangle = |${hf(s)}, ${hf(mm)}\rangle$. What is the coefficient $c$ in $S_${up ? '+' : '-'}|${hf(s)}, ${hf(mm)}\rangle = c\,|${hf(s)}, ${hf(mm + (up ? 1 : -1))}\rangle$?`,
        ...mcv(R, v, [Math.sqrt(L - mm * (mm - (up ? 1 : -1))), Math.sqrt(L), 1, Math.sqrt(L - mm * mm), Math.abs(mm) || 2, Math.sqrt(2 * s), v + 1, 2 * v, v / 2], x => ex(x, HB)),
        expl: raw`$S_\pm|s, m\rangle = \hbar\sqrt{s(s+1) - m(m\pm1)}\,|s, m\pm1\rangle = \hbar\sqrt{${rat(L)} - (${hf(mm)})(${hf(mm + (up ? 1 : -1))})}\,|\dots\rangle = ${ex(v, HB)}$.`,
        level: 2,
      };
    },
  });

  // ================================================================ 5.5.2 Spin and the wavefunction
  T.push({
    id: 'qm2.spinwf.levels', sec: '5.5.2', level: 2,
    gen(R) {
      const box = R.bool();
      const k = R.pick([0.25, 0.5, 1, 1.5, 2, 2.5, 3]);
      const j = R.int(2, 4);
      const unit = box ? 'E_1' : raw`\hbar\omega`;
      const lv = [];
      for (let n = box ? 1 : 0; n < 10; n++) for (const s of [1, -1]) lv.push((box ? n * n : n + 0.5) + s * k);
      const d = Array.from(new Set(lv.map(x => Math.round(x * 1e6) / 1e6))).sort((a, b) => a - b);
      const v = d[j - 1];
      const deg = lv.filter(x => Math.abs(x - v) < 1e-9).length;
      const spat = n => (box ? n * n : n + 0.5);
      const naive = spat(box ? j : j - 1);
      const wr = [d[j - 2], d[j], naive, naive - k, naive + k, spat(box ? Math.ceil(j / 2) : Math.ceil(j / 2) - 1) + k, d[j + 1], d[j + 2], v + k, v - k, v + 2 * k];
      const ord = ['', '', 'second', 'third', 'fourth'][j];
      return {
        q: (box ? raw`An electron is confined to a one-dimensional infinite square well with spatial energies $E_n = n^2E_1$.` : raw`An electron is bound in a one-dimensional harmonic oscillator with spatial energies $(n + \frac{1}{2})\hbar\omega$.`) +
          raw` A uniform magnetic field adds the spin term $H_s = \frac{2\Delta}{\hbar}S_z$ with $\Delta = ${qx(k, unit)}$. What is the ${ord}-lowest distinct energy eigenvalue of the full Hamiltonian?`,
        ...mcv(R, v, wr, x => qx(x, unit)),
        expl: raw`The Hamiltonian is a sum of a spatial and a spin part, so the eigenstates are $\psi_n(x)\chi_\pm$ with energies $E_n \pm \Delta$. Listing ${box ? '$n^2 \\pm ' + rat(k) + '$' : '$n + \\frac{1}{2} \\pm ' + rat(k) + '$'} in order gives distinct levels $${d.slice(0, j + 1).map(x => rat(x)).join(', ')}, \dots$ (in units of $${unit}$), so the answer is $${qx(v, unit)}$${deg > 1 ? ` (this level is ${deg}-fold degenerate)` : ''}.`,
      };
    },
  });

  T.push({
    id: 'qm2.spinwf.prec', sec: '5.5.2', level: 2,
    gen(R) {
      const kind = R.pick(['prob', 'prob', 'expect', 'time', 'num']);
      const stem = raw`A spin-$\frac{1}{2}$ particle at rest in a uniform magnetic field along $z$ has Hamiltonian $H = \omega_0 S_z$. At $t = 0$ it is in the state with $S_x = +\hbar/2$.`;
      if (kind === 'prob' || kind === 'expect') {
        const [p, q] = R.pick([[1, 3], [1, 2], [2, 3], [1, 1], [4, 3], [3, 2], [5, 3], [2, 1]]);
        const ang = Math.PI * p / q; // omega0 t
        const tT = raw`t = ${p === 1 ? '' : p}\pi/${q === 1 ? '' : q}${q === 1 ? '' : ''}\omega_0`.replace('/\\omega_0', '/\\omega_0');
        const tTx = q === 1 ? raw`t = ${p === 1 ? '' : p}\pi/\omega_0` : raw`t = ${p === 1 ? '' : p}\pi/(${q}\omega_0)`;
        void tT;
        if (kind === 'prob') {
          const minus = R.bool();
          const v = minus ? Math.sin(ang / 2) ** 2 : Math.cos(ang / 2) ** 2;
          const r = x => Math.round(x * 1e9) / 1e9;
          const wr = [1 - v, Math.sin(ang) ** 2, Math.cos(ang) ** 2, 0.5, Math.abs(Math.cos(ang)), 0, 1, 1 / 4, 3 / 4, 1 / 8, 3 / 8].map(r);
          return {
            q: stem + raw` What is the probability that a measurement of $S_x$ at time $${tTx}$ gives $${minus ? '-' : '+'}\hbar/2$?`,
            ...mcv(R, r(v), wr, rat),
            expl: raw`The spin precesses about $z$ at angular frequency $\omega_0$: $\chi(t) \propto (e^{-i\omega_0t/2}, e^{i\omega_0t/2})/\sqrt{2}$. Then $P(S_x = ${minus ? '-' : '+'}\hbar/2) = ${minus ? raw`\sin^2` : raw`\cos^2`}(\omega_0t/2) = ${rat(r(v))}$ at $\omega_0t = ${p === 1 ? '' : p}\pi${q === 1 ? '' : '/' + q}$. Note the half angle.`,
          };
        }
        const comp = R.pick(['x', 'y']);
        const v = Math.round((comp === 'x' ? Math.cos(ang) : Math.sin(ang)) / 2 * 1e9) / 1e9;
        const ok = x => Math.abs(x * 4 - Math.round(x * 4)) < 1e-9;
        const f = x => (ok(x) ? qx(x, HB) : ex(x, HB));
        const wr = [-v, (comp === 'x' ? Math.sin(ang) : Math.cos(ang)) / 2, (comp === 'x' ? Math.cos(ang / 2) : Math.sin(ang / 2)) / 2, 0, 0.5, -0.5, v * 2, 0.25, -0.25, Math.sqrt(3) / 4, -Math.sqrt(3) / 4].map(x => Math.round(x * 1e9) / 1e9);
        return {
          q: stem + raw` What is $\langle S_${comp}\rangle$ at time $${tTx}$?`,
          ...mcv(R, v, wr, f),
          expl: raw`$\langle\mathbf{S}\rangle$ precesses about $z$ at $\omega_0$ (Larmor precession): $\langle S_x\rangle = \frac{\hbar}{2}\cos\omega_0t$, $\langle S_y\rangle = \frac{\hbar}{2}\sin\omega_0t$. With $\omega_0t = ${p === 1 ? '' : p}\pi${q === 1 ? '' : '/' + q}$, $\langle S_${comp}\rangle = ${f(v)}$.`,
        };
      }
      if (kind === 'time') {
        const flip = R.bool();
        const c = flip ? raw`$\pi/\omega_0$` : raw`$2\pi/\omega_0$`;
        const wr = [raw`$\pi/(2\omega_0)$`, raw`$4\pi/\omega_0$`, raw`$\pi/\omega_0$`, raw`$2\pi/\omega_0$`, raw`$\hbar/\omega_0$`, raw`$\pi/(4\omega_0)$`];
        return {
          q: stem + (flip ? raw` What is the earliest time at which a measurement of $S_x$ is certain to give $-\hbar/2$?` : raw` After what minimum time does the particle first return to its initial physical state?`),
          ...GRE.mc(R, c, wr),
          expl: raw`The state is $\frac{1}{\sqrt{2}}(e^{-i\omega_0t/2}, e^{i\omega_0t/2})^T$. ${flip ? raw`At $\omega_0t = \pi$ the relative phase is $e^{i\pi} = -1$, giving the $S_x = -\hbar/2$ eigenvector: $t = \pi/\omega_0$.` : raw`It returns to the same ray (up to an overall phase) when $\omega_0t = 2\pi$; the spinor itself changes sign then, which is unobservable. So $t = 2\pi/\omega_0$.`}`,
        };
      }
      const B = R.pick([0.1, 0.2, 0.3, 0.5, 1, 1.5, 2, 3]);
      const f = 2 * GRE.C.muB * B / GRE.C.h / 1e9;
      return {
        q: raw`An electron spin (magnetic moment of magnitude $\mu_B$, $g = 2$) sits in a uniform magnetic field of $${B}\,\text{T}$, so the two spin states differ in energy by $2\mu_B B$. At what frequency $f$ does $\langle\mathbf{S}\rangle$ precess about the field? (Use $\mu_B = 9.27\times10^{-24}\,\text{J/T}$, $h = 6.63\times10^{-34}\,\text{J s}$.)`,
        ...GRE.numeric(R, f, [f / 2, 2 * Math.PI * f, f / (2 * Math.PI), 2 * f], { unit: raw`\text{GHz}` }),
        expl: raw`The precession (Larmor) angular frequency equals the splitting over $\hbar$: $\omega = 2\mu_BB/\hbar$, so $f = 2\mu_BB/h = \frac{2(9.27\times10^{-24})(${B})}{6.63\times10^{-34}}\,\text{Hz} \approx ${F.num(f, 2)}\,\text{GHz}$ (about 28 GHz per tesla).`,
      };
    },
  });

  T.push({
    id: 'qm2.spinwf.act', sec: '5.5.2', level: 2,
    gen(R) {
      const sp = R.pick([
        [raw`\sqrt{\frac{2}{a}}\sin\frac{\pi x}{a}`, raw`\frac{a}{2}`, 'a', 'infinite-well ground state'],
        [raw`\sqrt{\frac{2}{a}}\sin\frac{2\pi x}{a}`, raw`\frac{a}{2}`, 'a', 'infinite-well first excited state'],
        [raw`\phi_0(x)`, '0', null, 'harmonic-oscillator ground state'],
        [raw`\phi(x)`, null, null, 'spatial state'],
      ]);
      const kind = R.pick(['op', 'op', 'xS']);
      const c = R.pick([[[1, 0], [0, 0]], [[0, 0], [1, 0]], [[1, 0], [1, 0]], [[1, 0], [0, 1]], [[1, 0], [-1, 0]], [[0, 1], [1, 0]]]);
      const [a, b] = c;
      const nrm = cabs2(a) + cabs2(b);
      const pre = nrm === 2 ? raw`\frac{1}{\sqrt{2}}` : '';
      const st = raw`${sp[0]}\otimes${spinor(ctex(a), ctex(b), pre)}`;
      if (kind === 'op' || sp[2] !== 'a') {
        const k = R.int(0, 2);
        const I = [0, 1];
        const apply = (kk, [p, q]) => (kk === 0 ? [q, p] : kk === 1 ? [cmul([0, -1], q), cmul(I, p)] : [p, cmul([-1, 0], q)]);
        const res = v => raw`$\frac{\hbar}{2}${pre ? '\\cdot' + pre : ''}\,${sp[0]}\otimes${spinor(ctex(v[0]), ctex(v[1]))}$`;
        const correct = res(apply(k, c));
        const wr = [apply((k + 1) % 3, c), apply((k + 2) % 3, c), apply(k, [b, a]), [cmul([-1, 0], apply(k, c)[0]), cmul([-1, 0], apply(k, c)[1])], k === 1 ? [cmul(I, b), cmul([0, -1], a)] : [a, b]].map(res);
        const resH = v => raw`$\hbar${pre ? '\\cdot' + pre : ''}\,${sp[0]}\otimes${spinor(ctex(v[0]), ctex(v[1]))}$`;
        wr.push(resH(apply(k, c)), resH(apply((k + 1) % 3, c)), res([cmul([0, 1], apply(k, c)[0]), cmul([0, 1], apply(k, c)[1])]));
        return {
          q: raw`A spin-$\frac{1}{2}$ particle is in the state $\Psi = ${st}$ (spatial part $\otimes$ spin part, spin in the $S_z$ basis). What is $S_${'xyz'[k]}\Psi$?`,
          ...GRE.mc(R, correct, wr),
          expl: raw`Spin operators act only on the spinor and leave the spatial factor alone: $S_${'xyz'[k]} = \frac{\hbar}{2}\sigma_${'xyz'[k]}$ maps $(\alpha, \beta)^T \to ${['(\\beta, \\alpha)^T', '(-i\\beta, i\\alpha)^T', '(\\alpha, -\\beta)^T'][k]}$, giving ${correct}.`,
        };
      }
      const Sz = (cabs2(a) - cabs2(b)) / (2 * nrm);
      const half = Sz === 0 ? 0 : Sz;
      const v = half / 2; // <x><Sz> with <x> = a/2  -> coefficient of a*hbar
      const f = x => qx(x, raw`a\hbar`);
      return {
        q: raw`A spin-$\frac{1}{2}$ particle in an infinite square well $0 < x < a$ is in the state $\Psi = ${st}$. What is $\langle x\,S_z\rangle$?`,
        ...mcv(R, v, [half, v * 2 || 0.25, -v || -0.25, 0.25, 0, 0.125, -0.125, 0.5].filter(x => x != null), f),
        expl: raw`For a product state the spatial and spin factors are independent, so $\langle xS_z\rangle = \langle x\rangle\langle S_z\rangle = \frac{a}{2}\cdot${qx(Sz, HB)} = ${f(v)}$.`,
      };
    },
  });

  T.push({
    id: 'qm2.spinwf.roman', sec: '5.5.2', level: 2,
    gen(R) {
      const TRUE = [
        [raw`$[L_i, S_j] = 0$ for all components $i, j$.`, raw`orbital and spin operators act on different factors of the state.`],
        [raw`$[x, S_z] = 0$.`, raw`position acts only on the spatial factor.`],
        [raw`The spatial and spin factors of a product state can be normalized separately.`, raw`constants can be moved freely between the factors of a tensor product.`],
        [raw`A spin-0 particle is completely described by its spatial wavefunction.`, raw`there is no spin factor at all.`],
        [raw`The momentum operator acting on $\psi(x)\otimes\chi$ gives $(-i\hbar\psi'(x))\otimes\chi$.`, raw`$\hat{p}$ does not touch the spinor.`],
        [raw`The Hamiltonian of a charged particle in a magnetic field can contain both spatial and spin operators.`, raw`e.g. $p^2/2m + V(x) - \boldsymbol{\mu}\cdot\mathbf{B}$.`],
        [raw`For a spin-$\frac{1}{2}$ particle in a 1D box with no magnetic field, every energy level is (at least) twofold degenerate.`, raw`$\psi_n\chi_\uparrow$ and $\psi_n\chi_\downarrow$ have the same energy.`],
      ];
      const FALSE = [
        [raw`$[p_x, S_x] = i\hbar$.`, raw`spin and spatial operators commute.`],
        [raw`$S_z$ acting on $\psi(x)\otimes\chi$ changes the spatial wavefunction $\psi(x)$.`, raw`spin operators act only on $\chi$.`],
        [raw`$[L_x, S_y] = i\hbar S_z$.`, raw`$L$ and $S$ commute; only components of the same angular momentum obey $[J_x, J_y] = i\hbar J_z$.`],
        [raw`The spin quantum number $s$ of an electron increases when it is excited to a higher spatial state.`, raw`$s$ is an intrinsic, fixed property of the particle.`],
        [raw`Including spin shifts the energy levels of a particle in a box even when no magnetic field is present.`, raw`with no spin-dependent term in $H$ the levels are unchanged, only doubly degenerate.`],
        [raw`The spin part of the wavefunction of a single spin-$\frac{1}{2}$ particle is a function of position $\chi(x)$.`, raw`it is a two-component vector independent of $x$ (for a product state).`],
      ];
      return romanQ(R, raw`A single particle's state is written as a product $\Psi = \psi(\mathbf{r})\otimes\chi$ of a spatial wavefunction and a spin state. Which of the following statements is (are) true?`, TRUE, FALSE);
    },
  });

  T.push({
    id: 'qm2.spinwf.count', sec: '5.5.2', level: 1,
    gen(R) {
      const s = R.pick([0.5, 0.5, 1, 1.5, 0]);
      const g = 2 * s + 1;
      const who = s === 0 ? 'spin-0 particle' : raw`spin-$${hf(s)}$ particle`;
      const kind = R.pick(['hyd', 'box3', 'box2', 'orb']);
      let nsp, desc, spDesc;
      if (kind === 'hyd') {
        const n = R.int(2, 4);
        nsp = n * n;
        desc = raw`A ${who} is bound in a Coulomb potential $V = -\kappa/r$ (spin-independent). How many linearly independent states have the energy of the $n = ${n}$ level?`;
        spDesc = raw`there are $n^2 = ${nsp}$ spatial states`;
      } else if (kind === 'box3') {
        const E = R.pick([[3, 1, '(1,1,1)'], [6, 3, '(2,1,1)'], [9, 3, '(2,2,1)'], [11, 3, '(3,1,1)'], [12, 1, '(2,2,2)'], [14, 6, '(1,2,3)']]);
        nsp = E[1];
        desc = raw`A ${who} is confined in a cubic box with impenetrable walls, where the spatial energies are $(n_x^2 + n_y^2 + n_z^2)E_0$. How many linearly independent states have energy $${E[0]}E_0$?`;
        spDesc = raw`the spatial states are the permutations of $${E[2]}$, ${nsp} of them`;
      } else if (kind === 'box2') {
        const E = R.pick([[2, 1, '(1,1)'], [5, 2, '(1,2)'], [8, 1, '(2,2)'], [10, 2, '(1,3)'], [13, 2, '(2,3)']]);
        nsp = E[1];
        desc = raw`A ${who} is confined in a square two-dimensional box, with spatial energies $(n_x^2 + n_y^2)E_0$. How many linearly independent states have energy $${E[0]}E_0$?`;
        spDesc = raw`the spatial states are the orderings of $${E[2]}$, ${nsp} of them`;
      } else {
        const l = R.int(1, 4);
        nsp = 2 * l + 1;
        desc = raw`A ${who} is in a state of definite orbital angular momentum $l = ${l}$ (and definite radial state). How many linearly independent states $|m_l, m_s\rangle$ are possible?`;
        spDesc = raw`$m_l$ takes $2l + 1 = ${nsp}$ values`;
      }
      const v = nsp * g;
      return {
        q: desc,
        ...mcv(R, v, [nsp, nsp * 2 * s || nsp + 1, nsp * g * g, nsp + g, nsp * 2, (nsp + 1) * g, v + nsp * g, v - 1, v + 1, v + 2, 2 * v + 1, 3 * v].filter(x => x > 0), x => String(x)),
        expl: raw`The full state is (spatial)$\otimes$(spin); ${spDesc}, and each combines with $2s + 1 = ${g}$ spin states: $${nsp}\times${g} = ${v}$.`,
      };
    },
  });

  // ================================================================ 5.5.3 Adding spins
  /** allowed totals for adding a list of angular momenta: returns map J -> multiplicity */
  function addAll(js) {
    let cur = new Map([[js[0], 1]]);
    for (let i = 1; i < js.length; i++) {
      const nx = new Map();
      for (const [j, mult] of cur) for (let J = Math.abs(j - js[i]); J <= j + js[i] + 1e-9; J++) nx.set(J, (nx.get(J) || 0) + mult);
      cur = nx;
    }
    return cur;
  }
  const jList = js => js.map(j => '$' + hf(j) + '$').join(', ').replace(/, ([^,]*)$/, js.length > 2 ? ', and $1' : ' and $1');

  T.push({
    id: 'qm2.add.allowed', sec: '5.5.3', level: 2, weight: 2,
    gen(R) {
      const sc = R.pick(['two', 'two', 'meson', 'three', 'eorb']);
      let parts, desc;
      if (sc === 'two') {
        const [a, b] = [R.pick([0.5, 1, 1.5, 2, 2.5, 3]), R.pick([0.5, 1, 1.5, 2])];
        parts = [a, b];
        desc = raw`A particle of spin $${hf(a)}$ and a particle of spin $${hf(b)}$ are combined (no orbital angular momentum).`;
      } else if (sc === 'meson') {
        const l = R.pick([0, 1, 3, 4]);
        parts = [0.5, 0.5, l];
        desc = raw`A meson is a bound state of a spin-$\frac{1}{2}$ quark and a spin-$\frac{1}{2}$ antiquark. Consider a meson with relative orbital angular momentum $l = ${l}$.`;
      } else if (sc === 'three') {
        const k = R.pick([[0.5, 0.5, 0.5], [1, 1, 0.5], [0.5, 0.5, 1], [1, 1, 1]]);
        parts = k;
        desc = raw`Three particles with spins ${jList(k)} are combined (no orbital angular momentum).`;
      } else {
        const l = R.int(1, 4), s = R.pick([0.5, 0.5, 1, 1.5]);
        parts = [l, s];
        desc = raw`A spin-$${hf(s)}$ particle is in a state of orbital angular momentum $l = ${l}$, and $\mathbf{J} = \mathbf{L} + \mathbf{S}$.`;
      }
      const M = addAll(parts);
      const Js = Array.from(M.keys()).sort((a, b) => a - b);
      const jmax = Js[Js.length - 1], jmin = Js[0];
      const kind = R.pick(['roman', 'roman', 'count', 'min', 'states']);
      if (kind === 'roman') {
        const half = Math.round(2 * jmax) % 2;
        const pool = [];
        for (let J = 0; J <= jmax + 2; J += 0.5) pool.push(J);
        const allowed = J => M.has(J);
        const cand = R.shuffle(pool.filter(J => allowed(J) || Math.round(2 * J) % 2 !== half || J > jmax || J < jmin));
        const t = cand.filter(allowed), f = cand.filter(J => !allowed(J));
        const nT = Math.min(t.length, R.int(1, 3));
        if (3 - nT > f.length) throw new Error('pool');
        const pick = R.shuffle(t.slice(0, nT).concat(f.slice(0, 3 - nT)));
        const truth = pick.map(allowed);
        return {
          q: GRE.romanStem(desc + raw` Which of the following is a possible value of the total angular momentum quantum number $J$?`, pick.map(J => raw`$J = ${hf(J)}$`)),
          ...GRE.roman(R, truth),
          expl: raw`Add two at a time: $j_1 \otimes j_2 \to |j_1 - j_2|, \dots, j_1 + j_2$ in integer steps. ${sc === 'meson' ? raw`The two spins give $S = 0$ or $1$; adding $l$ to each. ` : ''}The allowed values are $J = ${Js.map(hf).join(', ')}$. So ${pick.map((J, i) => `${ROM[i]} ($${hf(J)}$) is ${truth[i] ? 'allowed' : 'not allowed'}`).join(', ')}.`,
        };
      }
      if (kind === 'count') return {
        q: desc + raw` How many distinct values of the total angular momentum quantum number $J$ are possible?`,
        ...mcv(R, Js.length, [Js.length + 1, Js.length - 1 || 5, Array.from(M.values()).reduce((s, x) => s + x, 0) === Js.length ? Js.length + 2 : Array.from(M.values()).reduce((s, x) => s + x, 0), 2 * jmax + 1, jmax * 2, parts.length + 1].filter(x => x > 0), x => String(x)),
        expl: raw`The possible values are $J = ${Js.map(hf).join(', ')}$: ${Js.length} distinct values.`,
      };
      if (kind === 'min') return {
        q: desc + raw` What is the smallest possible value of the total angular momentum quantum number $J$?`,
        ...mcv(R, jmin, [0, 0.5, 1, 1.5, 2, jmax, Math.abs(parts[0] - parts[1]), jmin + 1].filter(x => x >= 0), hf),
        expl: raw`The allowed values are $J = ${Js.map(hf).join(', ')}$, so the minimum is $${hf(jmin)}$.`,
        level: 1,
      };
      const tot = parts.reduce((s, j) => s * (2 * j + 1), 1);
      return {
        q: desc + raw` How many linearly independent ${sc === 'meson' ? 'angular-momentum ' : ''}states $|J, M_J\rangle$ does this system have in total (counting all allowed $J$)?`,
        ...mcv(R, tot, [Js.reduce((s, J) => s + 2 * J + 1, 0) === tot ? tot - 1 : Js.reduce((s, J) => s + 2 * J + 1, 0), parts.reduce((s, j) => s + 2 * j + 1, 0), 2 * jmax + 1, tot / 2, 2 * tot, tot + Js.length], x => String(x)),
        expl: raw`The dimension does not change when we switch bases: $\prod(2j_i + 1) = ${parts.map(j => 2 * j + 1).join('\\times')} = ${tot}$, which equals $\sum_J (\text{mult.})(2J+1)$ over the allowed $J = ${Js.map(hf).join(', ')}$.`,
      };
    },
  });

  T.push({
    id: 'qm2.add.mval', sec: '5.5.3', level: 2,
    gen(R) {
      const j1 = R.pick([1, 1.5, 2, 1, 0.5]), j2 = R.pick([0.5, 1, 0.5]);
      const ms = j => { const o = []; for (let k = 0; k <= Math.round(2 * j); k++) o.push(-j + k); return o; };
      const m1 = R.pick(ms(j1)), m2 = R.pick(ms(j2));
      const M = m1 + m2;
      const lo = Math.abs(j1 - j2), hi = j1 + j2;
      const Js = []; for (let J = Math.max(lo, Math.abs(M)); J <= hi + 1e-9; J++) Js.push(J);
      const set = js => {
        if (js.length === 1) return raw`$J = ${hf(js[0])}$ only`;
        const t = js.map(j => '$' + hf(j) + '$');
        return '$J$ = ' + (t.length === 2 ? t[0] + ' or ' + t[1] : t.slice(0, -1).join(', ') + ', or ' + t[t.length - 1]);
      };
      const cands = [];
      for (let a = lo - 1; a <= hi + 1 + 1e-9; a++) for (let b = a; b <= hi + 1 + 1e-9; b++) {
        if (a < 0) continue;
        const r = []; for (let J = a; J <= b + 1e-9; J++) r.push(J);
        cands.push(r);
      }
      const correct = set(Js);
      const wr = cands.map(set).filter(s => s !== correct);
      return {
        q: raw`A particle of spin $${hf(j1)}$ with $m_1 = ${hf(m1)}$ is combined with a particle of spin $${hf(j2)}$ with $m_2 = ${hf(m2)}$. If the total angular momentum $J$ of the pair is measured, which values can be obtained?`,
        ...GRE.mc(R, correct, R.shuffle(wr)),
        expl: raw`$M = m_1 + m_2 = ${hf(M)}$ is definite. $J$ must lie in $|j_1 - j_2| \le J \le j_1 + j_2$, i.e. $${hf(lo)}$ to $${hf(hi)}$, and also satisfy $J \ge |M|$. The product state is a combination of exactly those $|J, M\rangle$: ${correct.replace(' only', '')}${Js.length === 1 ? ' (the state is a pure stretched state)' : ''}.`,
      };
    },
  });

  T.push({
    id: 'qm2.add.pair', sec: '5.5.3', level: 2, weight: 2,
    gen(R) {
      const kind = R.pick(['id', 'P', 'P', 'dot', 'dot']);
      const u = raw`{\uparrow}`, d = raw`{\downarrow}`;
      const k2 = (a, b) => raw`|${a}${b}\rangle`;
      if (kind === 'id') {
        const S = [
          [k2(u, u), raw`$S = 1$, $M_S = 1$`, 'symmetric, maximal $M_S$'],
          [k2(d, d), raw`$S = 1$, $M_S = -1$`, 'symmetric, minimal $M_S$'],
          [raw`\frac{1}{\sqrt{2}}(${k2(u, d)} + ${k2(d, u)})`, raw`$S = 1$, $M_S = 0$`, 'the symmetric combination (obtained by lowering $|\\uparrow\\uparrow\\rangle$)'],
          [raw`\frac{1}{\sqrt{2}}(${k2(u, d)} - ${k2(d, u)})`, raw`$S = 0$, $M_S = 0$`, 'the antisymmetric singlet'],
          [k2(u, d), raw`$M_S = 0$, but not an eigenstate of $\mathbf{S}^2$`, 'an equal mixture of the $S = 1$ and $S = 0$ states with $M_S = 0$'],
          [raw`\frac{1}{\sqrt{2}}(${k2(u, u)} + ${k2(d, d)})`, raw`$S = 1$, but not an eigenstate of $S_z$`, 'a superposition of the $M_S = \\pm1$ triplet states'],
        ];
        const pick = R.pick(S);
        const wr = S.filter(x => x !== pick).map(x => x[1]).concat([raw`$S = 0$, $M_S = 1$`, raw`$S = \frac{1}{2}$, $M_S = 0$`, raw`$S = 2$, $M_S = 0$`]);
        return {
          q: raw`Two spin-$\frac{1}{2}$ particles are in the spin state $${pick[0]}$. Which of the following correctly describes the total spin?`,
          ...GRE.mc(R, pick[1], wr),
          expl: raw`$M_S$ is the sum of the individual $m$'s. The triplet ($S = 1$) states are $|\uparrow\uparrow\rangle$, $\frac{1}{\sqrt{2}}(|\uparrow\downarrow\rangle + |\downarrow\uparrow\rangle)$, $|\downarrow\downarrow\rangle$; the singlet is $\frac{1}{\sqrt{2}}(|\uparrow\downarrow\rangle - |\downarrow\uparrow\rangle)$. The given state is ${pick[2]}.`,
          level: 1,
        };
      }
      if (kind === 'P') {
        const a = R.pick([[1, 0], [2, 0], [3, 0], [-1, 0], [0, 1], [1, 1]]), b = R.pick([[1, 0], [2, 0], [-1, 0], [-2, 0], [0, 1], [0, -1], [1, 0]]);
        const N = cabs2(a) + cabs2(b);
        const p1 = cabs2(cadd(a, b)) / (2 * N);
        const ask = R.pick(['P1', 'P0', 'S2']);
        const v = ask === 'P1' ? p1 : ask === 'P0' ? 1 - p1 : 2 * p1;
        const wr = ask === 'S2' ? [p1, 2, 1, 0, 2 * (1 - p1), 0.75, 1.5, 2 * cabs2(a) / N] : [1 - v, cabs2(a) / N, cabs2(b) / N, ...PFILL];
        return {
          q: raw`Two spin-$\frac{1}{2}$ particles are in the spin state $A\left[${lin([{ c: a, s: k2(u, d) }, { c: b, s: k2(d, u) }])}\right]$, with $A$ a normalization constant. ${ask === 'S2' ? raw`What is $\langle\mathbf{S}^2\rangle$ for the total spin?` : raw`What is the probability that a measurement of the total spin gives $S = ${ask === 'P1' ? 1 : 0}$?`}`,
          ...mcv(R, v, wr, ask === 'S2' ? x => qx(x, raw`\hbar^2`) : rat),
          expl: raw`Write $|\uparrow\downarrow\rangle = \frac{1}{\sqrt{2}}(|1,0\rangle + |0,0\rangle)$ and $|\downarrow\uparrow\rangle = \frac{1}{\sqrt{2}}(|1,0\rangle - |0,0\rangle)$. The $S = 1$ amplitude is $(\alpha + \beta)/\sqrt{2}$, so $P(S{=}1) = |\alpha + \beta|^2/(2\cdot${N}) = ${rat(p1)}$ and $P(S{=}0) = ${rat(1 - p1)}$. ${ask === 'S2' ? raw`Then $\langle\mathbf{S}^2\rangle = 2\hbar^2P(S{=}1) = ${qx(v, raw`\hbar^2`)}$.` : ''}`,
        };
      }
      const pair = R.pick([[0.5, 0.5], [0.5, 0.5], [1, 1], [1, 0.5], [1.5, 0.5]]);
      const [s1, s2] = pair;
      const dotv = S => (S * (S + 1) - s1 * (s1 + 1) - s2 * (s2 + 1)) / 2;
      const Ss = []; for (let S = Math.abs(s1 - s2); S <= s1 + s2 + 1e-9; S++) Ss.push(S);
      const ask = R.pick(['val', 'gap']);
      const who = s1 === s2 ? raw`two spin-$${hf(s1)}$ particles` : raw`a spin-$${hf(s1)}$ particle and a spin-$${hf(s2)}$ particle`;
      if (ask === 'val') {
        const S = R.pick(Ss);
        const v = dotv(S);
        return {
          q: raw`For ${who} coupled to total spin $S = ${hf(S)}$, what is the eigenvalue of $\mathbf{S}_1\cdot\mathbf{S}_2$?`,
          ...mcv(R, v, [2 * v, -v, S * (S + 1), (S * S - s1 * s1 - s2 * s2) / 2, s1 * s2, v + 1, dotv(Ss[Ss.length - 1 - Ss.indexOf(S)])], x => qx(x, raw`\hbar^2`)),
          expl: raw`$\mathbf{S}^2 = \mathbf{S}_1^2 + \mathbf{S}_2^2 + 2\mathbf{S}_1\cdot\mathbf{S}_2$, so $\mathbf{S}_1\cdot\mathbf{S}_2 = \frac{\hbar^2}{2}[S(S+1) - s_1(s_1+1) - s_2(s_2+1)] = \frac{\hbar^2}{2}[${rat(S * (S + 1))} - ${rat(s1 * (s1 + 1))} - ${rat(s2 * (s2 + 1))}] = ${qx(v, raw`\hbar^2`)}$.`,
        };
      }
      const Jc = R.pick(['J', 'A', raw`\epsilon`]);
      const lo = dotv(Ss[0]), hi = dotv(Ss[Ss.length - 1]);
      const v = hi - lo;
      return {
        q: raw`The spin Hamiltonian of ${who} is $H = \frac{${Jc}}{\hbar^2}\mathbf{S}_1\cdot\mathbf{S}_2$ with $${Jc} > 0$. What is the energy difference between the highest and lowest levels?`,
        ...mcv(R, v, [2 * v, v / 2, (Ss.length - 1), hi, -lo, v + 1, 0.75].filter(x => x > 0), x => qx(x, Jc)),
        expl: raw`$\mathbf{S}_1\cdot\mathbf{S}_2 = \frac{\hbar^2}{2}[S(S+1) - s_1(s_1+1) - s_2(s_2+1)]$ for $S = ${Ss.map(hf).join(', ')}$: it ranges from $${qx(lo, raw`\hbar^2`)}$ (at $S = ${hf(Ss[0])}$) to $${qx(hi, raw`\hbar^2`)}$ (at $S = ${hf(Ss[Ss.length - 1])}$), so the spread is $${qx(v, Jc)}$.${s1 === 0.5 && s2 === 0.5 ? ' (Triplet at $+J/4$, singlet at $-3J/4$.)'.replace(/J/g, Jc) : ''}`,
      };
    },
  });

  T.push({
    id: 'qm2.add.cg', sec: '5.5.3', level: 3,
    gen(R) {
      const kind = R.pick(['P', 'P', 'J2']);
      const orb = R.bool(0.6);
      const j1 = orb ? R.int(1, 3) : R.pick([1, 1.5, 2, 2.5]);
      const ms = []; for (let k = 0; k <= Math.round(2 * j1); k++) ms.push(-j1 + k);
      const m1 = R.pick(ms), up = R.bool();
      const Pp = (up ? j1 + m1 + 1 : j1 - m1 + 1) / (2 * j1 + 1);
      const jp = j1 + 0.5, jm = j1 - 0.5;
      const sym = orb ? 'l' : 'j_1';
      const desc = orb
        ? raw`An electron has orbital angular momentum $l = ${j1}$ and is in the product state $|m_l = ${m1}\rangle|m_s = ${up ? '+' : '-'}\tfrac{1}{2}\rangle$.`
        : raw`A spin-$${hf(j1)}$ particle in the state $|m_1 = ${hf(m1)}\rangle$ is combined with a spin-$\frac{1}{2}$ particle in the state $|m_2 = ${up ? '+' : '-'}\tfrac{1}{2}\rangle$.`;
      const hint = raw` (Useful: $|j_1 + \tfrac{1}{2}, M\rangle = \sqrt{\frac{j_1 + M + \frac{1}{2}}{2j_1 + 1}}\,|M - \tfrac{1}{2}\rangle|{\uparrow}\rangle + \sqrt{\frac{j_1 - M + \frac{1}{2}}{2j_1 + 1}}\,|M + \tfrac{1}{2}\rangle|{\downarrow}\rangle$.)`;
      const M = m1 + (up ? 0.5 : -0.5);
      if (kind === 'P') {
        const askPlus = R.bool();
        const v = askPlus ? Pp : 1 - Pp;
        const wr = [1 - v, 0.5, 1 / (2 * j1 + 1), (j1 + M) / (2 * j1 + 1), (j1 + Math.abs(m1) + 1) / (2 * j1 + 2), ...PFILL];
        return {
          q: desc + raw` What is the probability that a measurement of the total angular momentum gives $J = ${hf(askPlus ? jp : jm)}$?` + hint,
          ...mcv(R, v, wr.filter(x => x >= 0 && x <= 1), rat),
          expl: raw`The product state has $M = ${hf(M)}$. Its overlap with $|${hf(jp)}, ${hf(M)}\rangle$ is the coefficient of $|${hf(m1)}\rangle|{${up ? '\\uparrow' : '\\downarrow'}}\rangle$: $P(J = ${hf(jp)}) = \frac{${sym} ${up ? '+' : '-'} m + 1}{2${sym} + 1} = ${rat(Pp)}$, and $P(J = ${hf(jm)}) = ${rat(1 - Pp)}$.${Pp === 1 ? ' (A stretched state is a pure $J = j_1 + \\frac{1}{2}$ state.)' : ''}`,
        };
      }
      const v = Pp * jp * (jp + 1) + (1 - Pp) * jm * (jm + 1);
      const L2 = j1 * (j1 + 1);
      return {
        q: desc + raw` What is $\langle\mathbf{J}^2\rangle$, where $\mathbf{J}$ is the total angular momentum?`,
        ...mcv(R, v, [L2 + 0.75, jp * (jp + 1), jm * (jm + 1), L2 + 0.75 + 2 * Math.abs(m1) * 0.5 === v ? L2 + 0.75 - 1 : L2 + 0.75 + Math.abs(m1), M * M + Math.abs(M), (jp * (jp + 1) + jm * (jm + 1)) / 2], x => qx(x, raw`\hbar^2`)),
        expl: raw`$\mathbf{J}^2 = \mathbf{L}^2 + \mathbf{S}^2 + 2L_zS_z + L_+S_- + L_-S_+$. In a product state the ladder terms have zero expectation, so $\langle\mathbf{J}^2\rangle = [${rat(L2)} + \tfrac{3}{4} + 2(${hf(m1)})(${up ? '' : '-'}\tfrac{1}{2})]\hbar^2 = ${qx(v, raw`\hbar^2`)}$ (equivalently, $\sum_J P_J\,J(J+1)\hbar^2$).`,
      };
    },
  });

  T.push({
    id: 'qm2.add.ls', sec: '5.5.3', level: 2,
    gen(R) {
      const s = R.pick([0.5, 0.5, 1, 1.5]);
      const l = R.int(1, 4);
      const Js = []; for (let J = Math.abs(l - s); J <= l + s + 1e-9; J++) Js.push(J);
      const kind = R.pick(['val', 'val', 'spread']);
      const f = J => (J * (J + 1) - l * (l + 1) - s * (s + 1)) / 2;
      const who = s === 0.5 ? 'an electron' : raw`a spin-$${hf(s)}$ particle`;
      if (kind === 'val') {
        const J = R.pick(Js);
        const v = f(J);
        return {
          q: raw`For ${who} with orbital angular momentum $l = ${l}$ in a state of total angular momentum $j = ${hf(J)}$, what is the eigenvalue of $\mathbf{L}\cdot\mathbf{S}$?`,
          ...mcv(R, v, [2 * v, -v, (J * J - l * l - s * s) / 2, l * s, J * (J + 1) / 2, v - 1, f(Js[Js.length - 1 - Js.indexOf(J)]), v + 1, v + 0.5, v - 0.5], x => qx(x, raw`\hbar^2`)),
          expl: raw`From $\mathbf{J}^2 = (\mathbf{L} + \mathbf{S})^2$: $\mathbf{L}\cdot\mathbf{S} = \frac{\hbar^2}{2}[j(j+1) - l(l+1) - s(s+1)] = \frac{\hbar^2}{2}[${rat(J * (J + 1))} - ${l * (l + 1)} - ${rat(s * (s + 1))}] = ${qx(v, raw`\hbar^2`)}$.`,
        };
      }
      const v = f(Js[Js.length - 1]) - f(Js[0]);
      return {
        q: raw`For ${who} with orbital angular momentum $l = ${l}$, what is the difference between the largest and smallest eigenvalues of $\mathbf{L}\cdot\mathbf{S}$ over the allowed values of $j$?`,
        ...mcv(R, v, [v / 2, 2 * v, l, l + 1, 2 * l + 1 === v ? 2 * l : 2 * l + 1, l * s, v + 1, v - 1, v + 0.5, v - 0.5].filter(x => x > 0), x => qx(x, raw`\hbar^2`)),
        expl: raw`$\mathbf{L}\cdot\mathbf{S} = \frac{\hbar^2}{2}[j(j+1) - l(l+1) - s(s+1)]$, with $j$ from $${hf(Js[0])}$ to $${hf(Js[Js.length - 1])}$: the values run from $${qx(f(Js[0]), raw`\hbar^2`)}$ to $${qx(f(Js[Js.length - 1]), raw`\hbar^2`)}$, a spread of $${qx(v, raw`\hbar^2`)}$.`,
      };
    },
  });

  // ================================================================ 5.5.4 Bosons and fermions
  T.push({
    id: 'qm2.ident.ground', sec: '5.5.4', level: 2, weight: 2,
    gen(R) {
      const sys = R.pick(['box1', 'box1', 'ho', 'ho', 'box2', 'box3']);
      const P = R.pick([
        { name: raw`identical spin-$\frac{1}{2}$ fermions`, cap: 2 },
        { name: raw`electrons`, cap: 2 },
        { name: raw`identical spin-$\frac{3}{2}$ fermions`, cap: 4 },
        { name: raw`identical spin-0 bosons`, cap: 99 },
        { name: raw`identical spin-1 bosons`, cap: 99 },
        { name: raw`electrons, all with $S_z = +\hbar/2$ (spin-polarized)`, cap: 1 },
      ]);
      const N = R.int(2, sys === 'box3' ? 5 : 6);
      let orb, unit, sd;
      if (sys === 'box1') { orb = boxOrbitals(1, 12); unit = 'E_1'; sd = raw`a one-dimensional infinite square well (single-particle energies $n^2E_1$)`; }
      else if (sys === 'ho') { orb = []; for (let n = 0; n < 12; n++) orb.push(n + 0.5); unit = raw`\hbar\omega`; sd = raw`a one-dimensional harmonic oscillator (single-particle energies $(n + \frac{1}{2})\hbar\omega$)`; }
      else if (sys === 'box2') { orb = boxOrbitals(2, 14); unit = 'E_0'; sd = raw`a two-dimensional square box (single-particle energies $(n_x^2 + n_y^2)E_0$)`; }
      else { orb = boxOrbitals(3, 14); unit = 'E_0'; sd = raw`a cubical box (single-particle energies $(n_x^2 + n_y^2 + n_z^2)E_0$)`; }
      if (P.cap === 1 && sys === 'ho' && N === 2) throw new Error('book example');
      const ex1 = R.bool(0.3);
      const idx = ex1 ? 1 : 0;
      const E = cap => fillEnergies(orb, N, Math.min(cap, N))[idx];
      const v = E(P.cap);
      const wr = [E(1), E(2), E(4), E(99), fillEnergies(orb, N, Math.min(P.cap, N))[1 - idx], N * orb[0], E(P.cap * 2 > 4 ? 1 : P.cap * 2), orb[N - 1] * N];
      const gap = orb.find(e => e > orb[0]) - orb[0];
      wr.push(v + gap, v + 2 * gap, v - gap, 2 * v);
      return {
        q: raw`${['', '', 'Two', 'Three', 'Four', 'Five', 'Six'][N]} non-interacting ${P.name.replace('all with', N === 2 ? 'both with' : 'all with')} are placed in ${sd}. What is the ${ex1 ? 'energy of the first excited state of the system (the second-lowest total energy)' : 'lowest possible total energy of the system'}?`,
        ...mcv(R, v, wr, x => qx(x, unit)),
        expl: raw`${P.cap === 99 ? 'Bosons can all share a single-particle state' : P.cap === 1 ? 'With all spins aligned, the spin state is the same for every electron, so the Pauli principle allows only one electron per spatial orbital' : `Each spatial orbital holds at most $2s+1 = ${P.cap}$ identical fermions`}. ${ex1 ? 'Fill the orbitals for the ground state, then find the cheapest rearrangement (usually promoting the top particle). ' : 'Fill the lowest orbitals. '}This gives $${qx(v, unit)}$.`,
      };
    },
  });

  T.push({
    id: 'qm2.ident.wf', sec: '5.5.4', level: 2,
    gen(R) {
      const nm = R.pick([['a', 'b', '\\psi'], ['1', '2', '\\psi'], ['0', '1', '\\phi']]);
      const f = (k, x) => raw`${nm[2]}_${nm[k]}(x_${x})`;
      const Ssym = raw`\frac{1}{\sqrt{2}}[${f(0, 1)}${f(1, 2)} + ${f(1, 1)}${f(0, 2)}]`;
      const Sbad = raw`\frac{1}{2}[${f(0, 1)}${f(1, 2)} + ${f(1, 1)}${f(0, 2)}]`;
      const Aant = raw`\frac{1}{\sqrt{2}}[${f(0, 1)}${f(1, 2)} - ${f(1, 1)}${f(0, 2)}]`;
      const Prod = raw`${f(0, 1)}${f(1, 2)}`;
      const AA = raw`${f(0, 1)}${f(0, 2)}`;
      const uu = raw`|{\uparrow\uparrow}\rangle`, dd = raw`|{\downarrow\downarrow}\rangle`, ud = raw`|{\uparrow\downarrow}\rangle`;
      const sing = raw`\frac{1}{\sqrt{2}}(|{\uparrow\downarrow}\rangle - |{\downarrow\uparrow}\rangle)`;
      const trip0 = raw`\frac{1}{\sqrt{2}}(|{\uparrow\downarrow}\rangle + |{\downarrow\uparrow}\rangle)`;
      const W = (sp, sn) => '$' + sp + (sn ? raw`\,${sn}` : '') + '$';
      const sc = R.pick(['bos', 'up', 'down', 'singlet', 'same', 'trip0']);
      const nmS = raw`$${nm[2]}_${nm[0]}$ and $${nm[2]}_${nm[1]}$`;
      let q, c, wr, ex1;
      if (sc === 'bos') {
        q = raw`Two identical spin-0 bosons occupy the orthonormal single-particle states ${nmS}, one particle in each. Which is the correctly normalized two-particle wavefunction?`;
        c = W(Ssym); wr = [W(Aant), W(Prod), W(Sbad), W(AA), W(raw`\frac{1}{\sqrt{2}}[${f(0, 1)}${f(1, 1)} + ${f(0, 2)}${f(1, 2)}]`)];
        ex1 = 'Identical bosons need a wavefunction symmetric under $x_1 \\leftrightarrow x_2$; the symmetric combination of two orthonormal states is normalized with $1/\\sqrt{2}$.';
      } else if (sc === 'up' || sc === 'down') {
        const sp = sc === 'up' ? uu : dd;
        q = raw`Two identical spin-$\frac{1}{2}$ fermions occupy the orthonormal spatial states ${nmS}, one in each, and both have spin ${sc === 'up' ? 'up' : 'down'} along $z$. Which is a valid state?`;
        c = W(Aant, sp); wr = [W(Ssym, sp), W(Prod, sp), W(Aant, sing), W(AA, sp), W(Ssym, ud)];
        ex1 = 'The total wavefunction must be antisymmetric. The spin state $' + sp + '$ is symmetric, so the spatial part must be antisymmetric.';
      } else if (sc === 'singlet') {
        q = raw`Two identical spin-$\frac{1}{2}$ fermions occupy the orthonormal spatial states ${nmS}, one in each, with total spin $S = 0$. Which is a valid state?`;
        c = W(Ssym, sing); wr = [W(Aant, sing), W(Ssym, trip0), W(Aant, trip0), W(Prod, sing), W(Ssym, ud)];
        ex1 = 'The $S = 0$ singlet is antisymmetric, so the spatial part must be symmetric to make the total antisymmetric.';
      } else if (sc === 'trip0') {
        q = raw`Two identical spin-$\frac{1}{2}$ fermions occupy the orthonormal spatial states ${nmS}, one in each, with total spin $S = 1$ and $M_S = 0$. Which is a valid state?`;
        c = W(Aant, trip0); wr = [W(Ssym, trip0), W(Aant, sing), W(Ssym, sing), W(Prod, trip0), W(Aant, ud)];
        ex1 = 'The $S = 1$, $M_S = 0$ triplet state is symmetric, so the spatial part must be antisymmetric.';
      } else {
        q = raw`Two identical spin-$\frac{1}{2}$ fermions both occupy the same spatial state $${nm[2]}_${nm[0]}$. Which is a valid state of the pair?`;
        c = W(AA, sing); wr = [W(AA, uu), W(AA, trip0), W(AA, ud), W(AA, dd), W(Aant, sing)];
        ex1 = 'The spatial part $' + AA + '$ is symmetric, so the spin part must be the antisymmetric singlet (the Pauli principle in action: the two fermions must have "opposite" spins).';
      }
      return { q, ...GRE.mc(R, c, wr), expl: ex1 + ' Hence the answer is ' + c + '.' };
    },
  });

  T.push({
    id: 'qm2.ident.count', sec: '5.5.4', level: 2,
    gen(R) {
      const k = R.int(2, 6);
      const N = R.pick([2, 2, 3]);
      const typ = R.pick(['bos', 'fer', 'ferspin', 'dist']);
      const C = (n, r) => { if (r < 0 || r > n) return 0; let x = 1; for (let i = 0; i < r; i++) x = x * (n - i) / (i + 1); return Math.round(x); };
      const K = typ === 'ferspin' ? 2 * k : k;
      const bos = C(K + N - 1, N), fer = C(K, N), dist = Math.pow(K, N);
      const v = typ === 'bos' ? bos : typ === 'dist' ? dist : fer;
      if (v === 0) throw new Error('none');
      const who = { bos: 'identical spin-0 bosons', fer: 'identical fermions whose spins are all fixed in the same state', ferspin: raw`identical spin-$\frac{1}{2}$ fermions`, dist: 'distinguishable spinless particles' }[typ];
      return {
        q: raw`${N === 2 ? 'Two' : 'Three'} non-interacting ${who} are each restricted to ${k} available orthonormal spatial states. How many linearly independent ${N === 2 ? 'two' : 'three'}-particle states are there?`,
        ...mcv(R, v, [bos, fer, dist, C(k, N), C(k + N - 1, N), Math.pow(k, N), C(2 * k, N), K * N, 2 * v, v + N, v + K].filter(x => x > 0), x => String(x)),
        expl: raw`There are $K = ${K}$ single-particle states${typ === 'ferspin' ? ` (${k} spatial $\\times$ 2 spin)` : ''}. Distinguishable particles: $K^N = ${dist}$; identical bosons (repetition allowed, order irrelevant): $\binom{K+N-1}{N} = ${bos}$; identical fermions (no repetition): $\binom{K}{N} = ${fer}$. Here the answer is $${v}$.`,
      };
    },
  });

  T.push({
    id: 'qm2.ident.concept', sec: '5.5.4', level: 2,
    gen(R) {
      const kind = R.pick(['which', 'which', 'roman']);
      if (kind === 'which') {
        const L = [
          [raw`a neutral $^{4}\text{He}$ atom`, 6], [raw`a neutral $^{3}\text{He}$ atom`, 5], [raw`a neutral $^{6}\text{Li}$ atom`, 9], [raw`a neutral $^{7}\text{Li}$ atom`, 10],
          [raw`a neutral $^{23}\text{Na}$ atom`, 34], [raw`a neutral $^{40}\text{K}$ atom`, 59], [raw`a neutral $^{87}\text{Rb}$ atom`, 124], [raw`a hydrogen atom ($^{1}\text{H}$)`, 2],
          [raw`a deuterium atom ($^{2}\text{H}$)`, 3], ['a deuteron', 2], [raw`a triton ($^{3}\text{H}$ nucleus)`, 3], ['an alpha particle', 4], [raw`a $^{3}\text{He}^{+}$ ion`, 4],
          [raw`a $^{12}\text{C}$ nucleus`, 12], [raw`a $^{13}\text{C}$ nucleus`, 13], ['positronium', 2], ['a proton', 3], ['a neutron', 3], [raw`a $\pi^{+}$ meson`, 2],
          ['a photon', 0], ['a muon', 1], [raw`an $\text{H}_2$ molecule`, 4],
        ];
        const wantF = R.bool();
        const isF = x => x[1] % 2 === 1;
        const c = R.pick(L.filter(x => isF(x) === wantF));
        const wr = R.pickN(L.filter(x => isF(x) !== wantF), 4);
        return {
          q: `Which of the following is a ${wantF ? 'fermion' : 'boson'}?`,
          ...GRE.mc(R, c[0][0].toUpperCase() + c[0].slice(1), wr.map(x => x[0][0].toUpperCase() + x[0].slice(1))),
          expl: raw`A composite particle is a fermion if it contains an odd number of spin-$\frac{1}{2}$ constituents (protons, neutrons, electrons; or quarks) and a boson if even. ${c[0][0].toUpperCase() + c[0].slice(1)} ${c[1] === 0 ? 'is an elementary spin-1 boson' : c[1] === 1 ? 'is an elementary spin-$\\frac{1}{2}$ fermion' : `contains ${c[1]} such fermions${/meson|proton|neutron/.test(c[0]) ? ' (quarks)' : ''}`}, so it is a ${wantF ? 'fermion' : 'boson'}.`,
        };
      }
      const TRUE = [
        [raw`No two identical fermions can occupy the same single-particle quantum state.`, raw`this is the Pauli exclusion principle.`],
        [raw`Two electrons in the same spatial orbital must form a spin singlet.`, raw`the spatial part is symmetric, so the spin part must be antisymmetric.`],
        [raw`Exchanging two identical fermions multiplies the wavefunction by $-1$.`, raw`fermion wavefunctions are antisymmetric.`],
        [raw`Two electrons in a spin-triplet state have zero probability of being found at the same point.`, raw`the spatial part is antisymmetric, so it vanishes at $x_1 = x_2$.`],
        [raw`The ground state of the two electrons in helium has total spin $S = 0$.`, raw`both electrons are in the 1s orbital, so the spin state must be the singlet.`],
        [raw`Any number of identical bosons can occupy the same single-particle state.`, raw`symmetric wavefunctions impose no exclusion.`],
      ];
      const FALSE = [
        [raw`The joint wavefunction of an electron and a proton must be antisymmetric under exchange.`, raw`they are not identical particles, so no exchange symmetry is required.`],
        [raw`Two identical bosons cannot occupy the same single-particle state.`, raw`that restriction applies to fermions only.`],
        [raw`Two electrons in a spin-triplet state must have a symmetric spatial wavefunction.`, raw`the triplet is symmetric, so the spatial part must be antisymmetric.`],
        [raw`A neutral $^{3}\text{He}$ atom is a boson.`, raw`it contains 5 fermions (2p, 1n, 2e), an odd number, so it is a fermion.`],
        [raw`Two identical spin-$\frac{1}{2}$ fermions with parallel spins can share the same spatial state.`, raw`parallel spins form a symmetric spin state, so the spatial part must be antisymmetric, which vanishes for equal orbitals.`],
        [raw`Whether a composite particle is a boson or a fermion does not depend on its constituents.`, raw`an odd number of fermion constituents makes a fermion.`],
      ];
      return romanQ(R, 'Which of the following statements about identical particles is (are) true?', TRUE, FALSE);
    },
  });

  T.push({
    id: 'qm2.ident.exchange', sec: '5.5.4', level: 3,
    gen(R) {
      const n = R.int(0, 3);
      const adj = R.bool(0.75);
      const m = adj ? n + 1 : n + R.int(2, 3);
      const typ = R.pick(['bos', 'trip', 'sing', 'dist', 'fer0']);
      const base = n + m + 1; // <x1^2> + <x2^2> in units hbar/(m omega)
      const exch = adj ? (n + 1) : 0; // 2|<x>_nm|^2 in units hbar/(m omega)
      const sym = base - exch, anti = base + exch;
      const v = { bos: sym, sing: sym, trip: anti, fer0: anti, dist: base }[typ];
      const who = {
        bos: 'identical spin-0 bosons', sing: raw`identical spin-$\frac{1}{2}$ fermions in the spin-singlet state`, trip: raw`identical spin-$\frac{1}{2}$ fermions in a spin-triplet state`,
        fer0: raw`identical spin-$\frac{1}{2}$ fermions with both spins up`, dist: 'distinguishable particles of equal mass',
      }[typ];
      const u = raw`\frac{\hbar}{m\omega}`;
      return {
        q: raw`Two non-interacting ${who} are in a one-dimensional harmonic oscillator (mass $m$, frequency $\omega$), one in the $n = ${n}$ state and the other in the $n = ${m}$ state. What is $\langle(x_1 - x_2)^2\rangle$? (Use $\langle n|x^2|n\rangle = (n + \tfrac{1}{2})\frac{\hbar}{m\omega}$ and $\langle n+1|x|n\rangle = \sqrt{\frac{(n+1)\hbar}{2m\omega}}$.)`,
        ...mcv(R, v, [sym, anti, base, base / 2, 2 * base, base + 2 * exch || base + 1, base - 2 * exch || base - 1, base + 2, 1.5 * base, base + 3].filter(x => x > 0), x => fr(x, raw`\hbar`, raw`m\omega`)),
        expl: raw`$\langle(x_1 - x_2)^2\rangle = \langle x^2\rangle_${n} + \langle x^2\rangle_${m} - 2\langle x\rangle_${n}\langle x\rangle_${m} \mp 2|\langle ${n}|x|${m}\rangle|^2$, with $-$ for a symmetric spatial state and $+$ for an antisymmetric one (no exchange term for distinguishable particles). Here $\langle x^2\rangle$ terms give $${fr(base, raw`\hbar`, raw`m\omega`)}$ and the exchange term is $${fr(exch, raw`\hbar`, raw`m\omega`)}$${adj ? '' : ' because $x$ only connects neighbouring levels'}. ${typ === 'sing' ? 'The singlet spin state is antisymmetric, so the spatial state is symmetric. ' : typ === 'trip' || typ === 'fer0' ? 'The symmetric spin state forces an antisymmetric spatial state. ' : ''}Result: $${fr(v, raw`\hbar`, raw`m\omega`)}$.`,
      };
    },
  });

  // ================================================================ 5.6.1 Time-independent perturbation theory
  T.push({
    id: 'qm2.pt.first', sec: '5.6.1', level: 2, weight: 2,
    gen(R) {
      const kind = R.pick(['step', 'mid', 'delta', 'delta', 'hox2', 'hox4', 'hinv', 'hdelta']);
      const ord = n => ['ground state', 'first excited state', 'second excited state', 'third excited state'][n];
      if (kind === 'step' || kind === 'mid') {
        const n = R.int(1, 4);
        const box = raw`A particle is in the $n = ${n}$ state of an infinite square well on $0 < x < a$ ($\psi_n = \sqrt{2/a}\,\sin(n\pi x/a)$).`;
        const pi = (c, k) => raw`V_0\left(\frac{1}{2} ${k > 0 ? '+' : '-'} \frac{1}{${c === 1 ? '' : c}\pi}\right)`;
        if (kind === 'step') {
          const right = R.bool();
          return {
            q: box + raw` It is perturbed by $H' = V_0$ for $${right ? 'a/2 < x < a' : '0 < x < a/2'}$ (and $H' = 0$ elsewhere). To first order, by how much does its energy shift?`,
            ...GRE.mc(R, raw`$\frac{V_0}{2}$`, [raw`$V_0$`, raw`$\frac{V_0}{4}$`, raw`$0$`, '$' + pi(n, 1) + '$', '$' + pi(n, -1) + '$', raw`$\frac{2V_0}{n\pi}$`.replace('n', n === 1 ? '' : n)]),
            expl: raw`$E^{(1)} = \langle\psi_n|H'|\psi_n\rangle = V_0\int_{\text{half}}|\psi_n|^2dx$. Every $|\psi_n|^2$ is symmetric about $x = a/2$, so half the probability lies in each half: $E^{(1)} = V_0/2$ for every $n$.`,
          };
        }
        const k = n % 2 === 0 ? 0 : (n % 4 === 1 ? 1 : -1); // 1/2 + k/(n pi)
        const c = k === 0 ? raw`$\frac{V_0}{2}$` : '$' + pi(n, k) + '$';
        return {
          q: box + raw` It is perturbed by $H' = V_0$ for $a/4 < x < 3a/4$ (and $H' = 0$ elsewhere). To first order, what is its energy shift?`,
          ...GRE.mc(R, c, [raw`$\frac{V_0}{2}$`, '$' + pi(n, 1) + '$', '$' + pi(n, -1) + '$', raw`$V_0$`, raw`$\frac{V_0}{4}$`, '$' + pi(1, k === 0 ? 1 : -k) + '$', raw`$V_0\left(\frac{1}{2} + \frac{2}{\pi}\right)$`]),
          expl: raw`$E^{(1)} = \frac{2V_0}{a}\int_{a/4}^{3a/4}\sin^2\frac{n\pi x}{a}dx = V_0\left[\frac{1}{2} - \frac{\sin(3n\pi/2) - \sin(n\pi/2)}{2n\pi}\right]$, which for $n = ${n}$ is ${c}.${n === 1 ? ' The ground state is concentrated in the middle, so the shift exceeds $V_0/2$.' : ''}`,
        };
      }
      if (kind === 'delta') {
        const n = R.int(1, 4);
        const [x0, x0t] = R.pick([[0.5, 'a/2'], [0.25, 'a/4'], [1 / 3, 'a/3'], [0.75, '3a/4']]);
        const s2 = Math.round(Math.sin(n * Math.PI * x0) ** 2 * 1e9) / 1e9;
        const v = 2 * s2;
        const f = x => fr(x, raw`\alpha`, 'a');
        return {
          q: raw`A particle in the ${ord(n - 1)} of an infinite square well on $0 < x < a$ is perturbed by $H' = \alpha\,\delta(x - ${x0t})$. What is the first-order energy shift?`,
          ...mcv(R, v, [0, 1, 2, 0.5, 1.5, 4, 3, v / 2].filter(x => Math.abs(x - v) > 1e-9), f),
          expl: raw`$E^{(1)} = \alpha|\psi_n(${x0t})|^2 = \frac{2\alpha}{a}\sin^2\left(\frac{${n === 1 ? '' : n}\pi x_0}{a}\right)$ with $x_0 = ${x0t}$: $\sin^2 = ${rat(s2)}$, so $E^{(1)} = ${f(v)}$.${v === 0 ? ' The delta sits on a node of this state.' : ''}`,
        };
      }
      if (kind === 'hox2') {
        const n = R.int(0, 3);
        const eps = R.pick([raw`\epsilon`, raw`\lambda`]);
        const v = (n + 0.5) / 2;
        const f = x => qx(x, eps + raw`\hbar\omega`);
        return {
          q: raw`A harmonic oscillator $H_0 = \frac{p^2}{2m} + \frac{1}{2}m\omega^2x^2$ is perturbed by $H' = ${eps}\cdot\frac{1}{2}m\omega^2x^2$ with $${eps} \ll 1$. What is the first-order energy shift of the ${ord(n)}?`,
          ...mcv(R, v, [n + 0.5, v / 2, 0.25, n / 2, (n + 1) / 2, 2 * v + 1, 0], f),
          expl: raw`By the virial theorem $\langle\frac{1}{2}m\omega^2x^2\rangle_n = \frac{1}{2}E_n$, so $E^{(1)} = \frac{${eps}}{2}(n + \frac{1}{2})\hbar\omega = ${f(v)}$. Check: the exact frequency $\omega\sqrt{1 + ${eps}} \approx \omega(1 + ${eps}/2)$ gives the same result.`,
        };
      }
      if (kind === 'hox4') {
        const n = R.int(0, 3);
        const c = 3 * (2 * n * n + 2 * n + 1) / 4;
        const f = x => fr(x, raw`\lambda\hbar^2`, raw`m^2\omega^2`);
        return {
          q: raw`A harmonic oscillator (mass $m$, frequency $\omega$) is perturbed by $H' = \lambda x^4$. Using $x = \sqrt{\frac{\hbar}{2m\omega}}(a + a^\dagger)$, what is the first-order energy shift of the ${ord(n)}?`,
          ...mcv(R, c, [3 / 4, (2 * n + 1) * (2 * n + 1) / 4, 4 * c, c / 3, 3 * (n + 0.5) ** 2 / 4 === c ? c + 3 : 3 * (n + 0.5) ** 2 / 4, (2 * n + 1) / 4, 3 * (2 * n * n + 2 * n + 1) / 2].filter(x => Math.abs(x - c) > 1e-9), f),
          expl: raw`$\langle n|(a + a^\dagger)^4|n\rangle = 6n^2 + 6n + 3$, so $E^{(1)} = \lambda\left(\frac{\hbar}{2m\omega}\right)^2(6n^2 + 6n + 3) = ${f(c)}$ for $n = ${n}$.`,
        };
      }
      if (kind === 'hinv') {
        const n = R.int(1, 4);
        const f = x => fr(x, raw`\beta`, 'a');
        return {
          q: raw`A hydrogen atom in an $n = ${n}$, $l = 0$ state is perturbed by $H' = \beta/r$, where $\beta$ is small. What is the first-order energy shift? ($a$ is the Bohr radius; the virial theorem may help.)`,
          ...mcv(R, 1 / (n * n), [1 / n, 2 / (3 * n * n), 1 / (n * n * n), n * n === 1 ? 2 : n * n, 2 / (n * n), 1 / (2 * n * n)], f),
          expl: raw`$E^{(1)} = \beta\langle 1/r\rangle_{n} = \frac{\beta}{n^2a}$ (from $\langle V\rangle = 2E_n$). Using $1/\langle r\rangle = \frac{2}{3n^2a}$ instead is a common error: $\langle 1/r\rangle \ne 1/\langle r\rangle$.`,
          level: 3,
        };
      }
      const n = R.int(1, 3), l = R.bool(0.75) ? 0 : R.int(1, n === 1 ? 1 : n - 1);
      if (n === 1 && l > 0) throw new Error('l');
      const v = l === 0 ? 1 / (n * n * n) : 0;
      const f = x => fr(x, raw`\gamma`, raw`\pi a^3`);
      return {
        q: raw`A hydrogen atom is in a state with $n = ${n}$, $l = ${l}$. It is perturbed by a contact interaction $H' = \gamma\,\delta^3(\mathbf{r})$. What is the first-order energy shift? (For $l = 0$, $|\psi_{n00}(0)|^2 = \frac{1}{\pi n^3a^3}$.)`,
        ...mcv(R, v, [1 / (n * n * n), 1 / (n * n), 1, 1 / n, 4 / (n * n * n), 1 / (8 * n * n * n), 0], f),
        expl: raw`$E^{(1)} = \gamma|\psi(0)|^2$. ${l === 0 ? raw`For an s state this is $\frac{\gamma}{\pi n^3a^3} = ${f(v)}$.` : raw`For $l > 0$ the wavefunction vanishes at the origin ($R \propto r^l$), so the shift is 0.`}`,
        level: 3,
      };
    },
  });

  // matrix helpers for ladder-operator polynomials
  function ladderMat(D) {
    const a = [], ad = [];
    for (let i = 0; i < D; i++) { a.push(new Array(D).fill(0)); ad.push(new Array(D).fill(0)); }
    for (let n = 1; n < D; n++) { a[n - 1][n] = Math.sqrt(n); ad[n][n - 1] = Math.sqrt(n); }
    return { a, ad };
  }
  const mmul = (A, B) => A.map((row, i) => B[0].map((_, j) => row.reduce((s, x, k) => s + x * B[k][j], 0)));
  const madd = (A, B, s) => A.map((row, i) => row.map((x, j) => x + (s == null ? 1 : s) * B[i][j]));
  T.push({
    id: 'qm2.pt.ladder', sec: '5.6.1', level: 2,
    gen(R) {
      const D = 14;
      const { a, ad } = ladderMat(D);
      const I = a.map((r, i) => r.map((_, j) => (i === j ? 1 : 0)));
      const x = madd(a, ad);
      const OPS = [
        [raw`(a + a^\dagger)^2`, mmul(x, x), raw`(a + a^\dagger)^2 = a^2 + a^{\dagger 2} + aa^\dagger + a^\dagger a`],
        [raw`a^\dagger a\,a^\dagger a`, mmul(mmul(ad, a), mmul(ad, a)), raw`a^\dagger a|n\rangle = n|n\rangle`],
        [raw`a a^\dagger`, mmul(a, ad), raw`aa^\dagger = a^\dagger a + 1`],
        [raw`(a + a^\dagger)^4`, mmul(mmul(x, x), mmul(x, x)), raw`only terms with equal numbers of $a$ and $a^\dagger$ contribute`],
        [raw`a^{\dagger 2}a^2`, mmul(mmul(ad, ad), mmul(a, a)), raw`$a^2|n\rangle = \sqrt{n(n-1)}|n-2\rangle$`],
        [raw`(a + a^\dagger)^3`, mmul(mmul(x, x), x), raw`an odd number of ladder operators always changes $n$`],
        [raw`a^2 + a^{\dagger 2}`, madd(mmul(a, a), mmul(ad, ad)), raw`$a^2$ and $a^{\dagger 2}$ change $n$ by $\mp 2$`],
        [raw`a^\dagger a\,a a^\dagger`, mmul(mmul(ad, a), mmul(a, ad)), raw`$aa^\dagger|n\rangle = (n+1)|n\rangle$`],
        [raw`a^2a^{\dagger 2}`, mmul(mmul(a, a), mmul(ad, ad)), raw`$a^{\dagger 2}|n\rangle = \sqrt{(n+1)(n+2)}|n+2\rangle$`],
        [raw`2a^\dagger a + 3I`, madd(mmul(ad, a).map(r => r.map(v => 2 * v)), I, 3), raw`$a^\dagger a$ is the number operator`],
      ];
      const k = R.int(0, OPS.length - 1);
      const [lab, M, hint] = OPS[k];
      const disp = lab.startsWith('(') || !/[+]/.test(lab) ? lab : '(' + lab + ')';
      const n = R.int(0, 4);
      const val = i => Math.round(M[i][i]);
      const v = val(n);
      const K = R.pick(['K', raw`\lambda`, raw`\epsilon`]);
      const swapped = OPS[[0, 1, 7, 3, 8, 5, 6, 2, 4, 9][k]][1];
      const wr = [n > 0 ? val(n - 1) : null, val(n + 1), -v, Math.round(swapped[n][n]), v + 1, v - 1, 2 * v, n, v + 2, v + 3, 2 * n + 1, n * n + 1];
      const E = n + 0.5;
      return {
        q: raw`A harmonic oscillator $H_0 = \hbar\omega(a^\dagger a + \frac{1}{2})$ is perturbed by $H' = ${K}\,${disp}$, where $a|n\rangle = \sqrt{n}|n-1\rangle$ and $a^\dagger|n\rangle = \sqrt{n+1}|n+1\rangle$. To first order, what is the energy shift of the state with unperturbed energy $${qx(E, raw`\hbar\omega`)}$?`,
        ...mcv(R, v, wr.filter(x => x != null), x => qx(x, K)),
        expl: raw`The state is $|n = ${n}\rangle$ and $E^{(1)} = ${K}\langle ${n}|${lab}|${n}\rangle$. Using ${hint.startsWith('$') ? hint : '$' + hint + '$'}, the diagonal element is $${v}$, so the shift is $${qx(v, K)}$.`,
      };
    },
  });

  T.push({
    id: 'qm2.pt.second', sec: '5.6.1', level: 3,
    gen(R) {
      const kind = R.pick(['two', 'two', 'field', 'three', 'sym2']);
      if (kind === 'two') {
        const E1 = R.pick([0, 1, 2, -1]), D = R.pick([0.5, 1, 2, 4, 5]), V = R.pick([0.01, 0.02, 0.05, 0.1]);
        const lower = R.bool();
        const shift = (lower ? -1 : 1) * V * V / D * 1000; // meV
        return {
          q: raw`A two-level system has unperturbed energies $${E1}\,\text{eV}$ and $${F.num(E1 + D, 3)}\,\text{eV}$. A perturbation with zero diagonal elements and off-diagonal matrix element $${V}\,\text{eV}$ is added. To second order in perturbation theory, by how much does the ${lower ? 'lower' : 'upper'} level shift?`,
          ...GRE.numeric(R, shift, [-shift, shift / 2, 2 * shift, (lower ? -1 : 1) * V * 1000, (lower ? -1 : 1) * V * V / (2 * E1 + D || D / 2) * 1000], { unit: raw`\text{meV}`, allowSign: true, tol: 0.15 }),
          expl: raw`First order vanishes (zero diagonal elements). Second order: $E^{(2)} = \frac{|V|^2}{E_n - E_m}$, so the ${lower ? 'lower level moves down' : 'upper level moves up'} by $|V|^2/\Delta = (${V})^2/${D}\,\text{eV} = ${F.num(Math.abs(shift), 2)}\,\text{meV}$. Levels repel.`,
        };
      }
      if (kind === 'field') {
        const askFirst = R.bool(0.3);
        const c = askFirst ? '$0$' : raw`$-\dfrac{q^2\mathcal{E}^2}{2m\omega^2}$`;
        const wr = [raw`$-\dfrac{q^2\mathcal{E}^2}{2m\omega^2}$`, raw`$+\dfrac{q^2\mathcal{E}^2}{2m\omega^2}$`, raw`$-\dfrac{q^2\mathcal{E}^2}{m\omega^2}$`, raw`$-\dfrac{q\mathcal{E}}{2m\omega^2}$`, raw`$-\dfrac{q^2\mathcal{E}^2}{2m\omega^2}\left(n + \frac{1}{2}\right)$`, raw`$q\mathcal{E}\sqrt{\dfrac{\hbar}{2m\omega}}$`, '$0$'];
        return {
          q: raw`A particle of charge $q$ and mass $m$ in a one-dimensional harmonic oscillator (frequency $\omega$) is placed in a weak uniform electric field $\mathcal{E}$, adding $H' = -q\mathcal{E}x$. What is the ${askFirst ? 'first' : 'second'}-order energy shift of the level $n$?`,
          ...GRE.mc(R, c, wr),
          expl: raw`${askFirst ? raw`$\langle n|x|n\rangle = 0$ by parity, so the first-order shift vanishes.` : raw`First order vanishes by parity. Completing the square, $\frac{1}{2}m\omega^2x^2 - q\mathcal{E}x = \frac{1}{2}m\omega^2(x - x_0)^2 - \frac{q^2\mathcal{E}^2}{2m\omega^2}$: every level shifts exactly by $-\frac{q^2\mathcal{E}^2}{2m\omega^2}$, which second-order perturbation theory reproduces (and it is negative for the ground state, as it must be).`}`,
        };
      }
      if (kind === 'three') {
        const d2 = R.pick([1, 2, 3]), d3 = d2 + R.pick([1, 2, 3, 5]);
        const v2 = R.pick([1, 2, 3]), v3 = R.pick([1, 2, 3, 4]);
        const s = -(v2 * v2 / d2 + v3 * v3 / d3);
        const eps = raw`\epsilon`;
        return {
          q: raw`The ground state $|1\rangle$ of $H_0$ has energy $0$; the only other states coupled to it are $|2\rangle$ and $|3\rangle$ with energies $${d2}\Delta$ and $${d3}\Delta$. A perturbation has $\langle 1|H'|1\rangle = 0$, $|\langle 2|H'|1\rangle| = ${qx(v2, eps)}$ and $|\langle 3|H'|1\rangle| = ${qx(v3, eps)}$. What is the second-order shift of the ground-state energy?`,
          ...mcv(R, s, [-s, -(v2 / d2 + v3 / d3), -(v2 * v2 / d2), -(v2 * v2 + v3 * v3) / (d2 + d3), -(v2 * v2 * d2 + v3 * v3 * d3), -(v2 * v2 / d2 - v3 * v3 / d3), 2 * s], x => fr(x, raw`\epsilon^2`, raw`\Delta`)),
          expl: raw`$E_1^{(2)} = \sum_{m}\frac{|H'_{m1}|^2}{E_1 - E_m} = -${fr(v2 * v2 / d2, raw`\epsilon^2`, raw`\Delta`)} - ${fr(v3 * v3 / d3, raw`\epsilon^2`, raw`\Delta`)} = ${fr(s, raw`\epsilon^2`, raw`\Delta`)}$. The ground-state second-order shift is always negative.`,
        };
      }
      const c = raw`$E_0 - \dfrac{V^2}{\Delta}$`;
      return {
        q: raw`A Hamiltonian in a two-state basis is $H = \begin{pmatrix} E_0 & V \\ V & E_0 + \Delta\end{pmatrix}$ with real $V$ and $|V| \ll \Delta$. Which is the best approximation to the lower eigenvalue?`,
        ...GRE.mc(R, c, [raw`$E_0 + \dfrac{V^2}{\Delta}$`, raw`$E_0 - V$`, raw`$E_0$`, raw`$E_0 - \dfrac{V}{\Delta}$`, raw`$E_0 - \dfrac{V^2}{2\Delta}$`, raw`$E_0 - \dfrac{\Delta^2}{V}$`]),
        expl: raw`Exactly, $E_\pm = E_0 + \frac{\Delta}{2} \pm \sqrt{\frac{\Delta^2}{4} + V^2} \approx E_0 + \frac{\Delta}{2} \pm \left(\frac{\Delta}{2} + \frac{V^2}{\Delta}\right)$. The lower root is $E_0 - V^2/\Delta$, the second-order result $|V|^2/(E_0 - (E_0 + \Delta))$: the levels repel.`,
      };
    },
  });

  T.push({
    id: 'qm2.pt.degen', sec: '5.6.1', level: 3,
    gen(R) {
      const kind = R.pick(['two', 'two', 'three', 'complex']);
      const eps = raw`\epsilon`;
      const E = (x, y) => raw`$E^{(0)} ${x < 0 ? '-' : '+'} ${qx(Math.abs(x), eps)}$ and $E^{(0)} ${y < 0 ? '-' : '+'} ${qx(Math.abs(y), eps)}$`.replace(/\+ 0\$/g, '$').replace(/- 0\$/g, '$');
      if (kind === 'two' || kind === 'complex') {
        let p, q, c;
        if (kind === 'two') { [p, q] = R.pick([[3, 4], [4, 3], [0, 2], [0, 3], [6, 8], [5, 12], [0, 1], [8, 6]]); c = R.int(-3, 3); }
        else { p = 0; q = R.int(1, 4); c = R.int(-2, 2); }
        const r = Math.hypot(p, q);
        const hi = c + r, lo = c - r;
        const w11 = c + p, w22 = c - p;
        const off = kind === 'complex' ? [raw`-${q === 1 ? '' : q}i${eps}`, raw`${q === 1 ? '' : q}i${eps}`] : [qx(q, eps), qx(q, eps)];
        const ask = R.pick(['pair', 'split']);
        const mat = raw`\begin{pmatrix} ${qx(w11, eps)} & ${off[0]} \\ ${off[1]} & ${qx(w22, eps)}\end{pmatrix}`;
        const stem = raw`A level of $H_0$ with energy $E^{(0)}$ is doubly degenerate, with orthonormal states $|1\rangle$, $|2\rangle$. In this basis a perturbation has matrix $\langle i|H'|j\rangle = ${mat}$.`;
        if (ask === 'pair') {
          const ccor = E(hi, lo);
          const wr = [E(w11, w22), E(c + q, c - q), E(c + p + q, c - p - q), E(r, -r), E(c + r / 2, c - r / 2), E(c + r * r, c - r * r)];
          return {
            q: stem + ' To first order, what are the perturbed energies?',
            ...GRE.mc(R, ccor, wr),
            expl: raw`Degenerate perturbation theory: diagonalize $H'$ in the degenerate subspace. The eigenvalues are $\frac{w_{11} + w_{22}}{2} \pm \sqrt{\left(\frac{w_{11} - w_{22}}{2}\right)^2 + |w_{12}|^2} = ${qx(c, eps)} \pm \sqrt{${p * p} + ${q * q}}\,${eps}$, giving ${ccor}. Using just the diagonal elements is wrong because the basis is not the "good" one.`,
          };
        }
        return {
          q: stem + ' To first order, how far apart are the two perturbed levels?',
          ...mcv(R, 2 * r, [r, Math.abs(w11 - w22) || 4 * r, 2 * q === 2 * r ? 3 * r : 2 * q, 2 * (p + q), r * r, 0], x => qx(x, eps)),
          expl: raw`The first-order energies are the eigenvalues of $H'$ in the degenerate subspace, $${qx(c, eps)} \pm ${qx(r, eps)}$, so the splitting is $${qx(2 * r, eps)}$.`,
        };
      }
      const a = R.int(-2, 3), b = R.int(1, 3), d = R.int(-3, 4);
      const vals = Array.from(new Set([a + b, a - b, d])).sort((x, y) => x - y);
      const ask = R.pick(['n', 'max']);
      const mat = raw`\begin{pmatrix} ${qx(a, eps)} & ${qx(b, eps)} & 0 \\ ${qx(b, eps)} & ${qx(a, eps)} & 0 \\ 0 & 0 & ${qx(d, eps)}\end{pmatrix}`;
      const stem = raw`A level of $H_0$ is threefold degenerate. In an orthonormal basis of the degenerate states a perturbation has matrix $${mat}$.`;
      if (ask === 'n') return {
        q: stem + ' Into how many distinct levels does the degenerate level split, to first order?',
        ...mcv(R, vals.length, [1, 2, 3, 4, 6].filter(x => x !== vals.length), x => String(x)),
        expl: raw`The upper block $\begin{pmatrix} a & b \\ b & a\end{pmatrix}$ has eigenvalues $a \pm b = ${qx(a + b, eps)}, ${qx(a - b, eps)}$, and the third state is decoupled with ${qx(d, eps) === '0' ? 'shift 0' : `$${qx(d, eps)}$`}. Distinct first-order shifts: $${vals.map(v => qx(v, eps)).join(', ')}$ — ${vals.length} level${vals.length > 1 ? 's' : ''}.`,
      };
      const mx = vals[vals.length - 1];
      return {
        q: stem + ' What is the largest first-order energy shift?',
        ...mcv(R, mx, [a, a + 2 * b, Math.max(a, d), a + b + d, b, d + b, 2 * a + b].filter(x => x !== mx), x => qx(x, eps)),
        expl: raw`Diagonalize: the $2\times2$ block gives $a \pm b = ${qx(a + b, eps)}, ${qx(a - b, eps)}$ and the decoupled state gives $${qx(d, eps)}$. The largest is $${qx(mx, eps)}$.`,
      };
    },
  });

  T.push({
    id: 'qm2.pt.roman', sec: '5.6.1', level: 2,
    gen(R) {
      const TRUE = [
        [raw`The first-order energy correction is the expectation value of $H'$ in the unperturbed state.`, raw`$E_n^{(1)} = \langle n^{(0)}|H'|n^{(0)}\rangle$.`],
        [raw`The second-order correction to the ground-state energy is never positive.`, raw`every denominator $E_0 - E_m$ is negative and every numerator is $\ge 0$.`],
        [raw`Second-order corrections tend to push two coupled levels apart.`, raw`the lower level is pushed down and the upper one up ("no level crossing").`],
        [raw`For a degenerate level, the first-order shifts are the eigenvalues of $H'$ restricted to the degenerate subspace.`, raw`one must diagonalize the perturbation within that subspace.`],
        [raw`If $V(x)$ is even and $H' = \lambda x$, the first-order shifts of all nondegenerate levels vanish.`, raw`$|\psi_n|^2$ is even, so $\langle x\rangle = 0$.`],
        [raw`If the first-order shift vanishes, the leading correction is generally second order in the perturbation strength.`, raw`second order involves the squares of off-diagonal matrix elements.`],
      ];
      const FALSE = [
        [raw`The second-order correction to the ground-state energy is always positive.`, raw`it is always negative (or zero).`],
        [raw`Computing the first-order energy shift requires the exact eigenstates of $H_0 + H'$.`, raw`only the unperturbed states are needed.`],
        [raw`The nondegenerate formulas can be used unchanged for a degenerate level in any basis.`, raw`the second-order denominators vanish; one must first diagonalize $H'$ in the degenerate subspace.`],
        [raw`Second-order perturbation theory pushes two coupled levels toward each other.`, raw`it pushes them apart.`],
        [raw`The first-order energy shift depends on the off-diagonal matrix elements $\langle m|H'|n\rangle$, $m \ne n$.`, raw`first order uses only the diagonal element; off-diagonal ones enter at second order.`],
        [raw`Perturbation theory is reliable whenever $H'$ is small compared with the energies $E_n^{(0)}$ themselves, regardless of level spacings.`, raw`the matrix elements must be small compared with the level spacings.`],
      ];
      return romanQ(R, raw`Consider $H = H_0 + H'$ with $H'$ a small, time-independent perturbation. Which of the following statements is (are) true?`, TRUE, FALSE);
    },
  });

  // ================================================================ 5.6.2 Variational principle
  T.push({
    id: 'qm2.var.bound', sec: '5.6.2', level: 1,
    gen(R) {
      const kind = R.pick(['possible', 'impossible', 'best', 'roman', 'roman']);
      if (kind === 'roman') {
        const TRUE = [
          [raw`$\langle\psi|H|\psi\rangle \ge E_0$ for every normalized trial function $\psi$.`, raw`this is the variational principle.`],
          [raw`Equality $\langle H\rangle = E_0$ holds only if the trial function is the exact ground state.`, raw`any admixture of excited states raises $\langle H\rangle$.`],
          [raw`Adding more adjustable parameters to a trial function cannot raise the minimized $\langle H\rangle$.`, raw`the old family is contained in the new one.`],
          [raw`If the trial function is orthogonal to the exact ground state, $\langle H\rangle \ge E_1$, the first excited energy.`, raw`then only states with $E \ge E_1$ contribute.`],
          [raw`The variational method gives an upper bound on the ground-state energy.`, raw`$\langle H\rangle_{\min} \ge E_0$.`],
        ];
        const FALSE = [
          [raw`The variational method gives a lower bound on the ground-state energy.`, raw`it gives an upper bound.`],
          [raw`A cleverly chosen normalized trial function can give $\langle H\rangle < E_0$.`, raw`$\langle H\rangle \ge E_0$ always.`],
          [raw`Any normalized trial function gives the exact ground-state energy.`, raw`only the exact ground state does.`],
          [raw`Minimizing $\langle H\rangle$ over a one-parameter family always gives the exact ground state.`, raw`only if the family contains the exact ground state.`],
          [raw`A trial function with more parameters can give a higher minimum $\langle H\rangle$ than a subfamily of it.`, raw`the minimum over a larger family can only be lower or equal.`],
        ];
        return romanQ(R, raw`Let $E_0$ be the exact ground-state energy of a Hamiltonian $H$. Which of the following statements about the variational method is (are) true?`, TRUE, FALSE);
      }
      const S = R.pick([
        [raw`the hydrogen atom`, -13.6], [raw`the hydrogen-like ion $\text{He}^{+}$`, -54.4], [raw`a particle in a harmonic well with $\hbar\omega = 0.40\,\text{eV}$`, 0.2],
        [raw`an electron in a certain one-dimensional infinite square well`, 1.5], [raw`a particle in a certain anharmonic potential well`, 0.85], [raw`the hydrogen-like ion $\text{Li}^{2+}$`, -122.4],
      ]);
      const E0 = S[1], A = Math.abs(E0);
      const above = [1.02, 1.05, 1.1, 1.2, 1.3, 1.5].map(f => (E0 < 0 ? E0 / f : E0 * f));
      const below = [1.05, 1.1, 1.25, 1.5, 2, 4].map(f => (E0 < 0 ? E0 * f : E0 / f));
      const fmt = x => F.num(x, 3) + raw`\,\text{eV}`;
      if (kind === 'best') {
        const vals = R.pickN(above, 5);
        const best = Math.min(...vals);
        return {
          q: raw`Five different normalized trial wavefunctions are used to estimate the ground-state energy of ${S[0]}. The resulting values of $\langle H\rangle$ are listed below. Which is the best estimate of the ground-state energy?`,
          ...mcv(R, best, vals.filter(v => v !== best), fmt),
          expl: raw`Every $\langle H\rangle$ is an upper bound on $E_0$, so the lowest value, $${fmt(best)}$, is closest to the true energy${E0 < 0 ? '' : ''}.`,
        };
      }
      if (kind === 'possible') {
        const c = R.pick(above);
        return {
          q: raw`The exact ground-state energy of ${S[0]} is $${fmt(E0)}$. A student computes $\langle H\rangle$ for a normalized trial wavefunction. Which of the following results could be correct?`,
          ...mcv(R, c, R.pickN(below, 5), fmt),
          expl: raw`The variational principle says $\langle H\rangle \ge E_0 = ${fmt(E0)}$ for any trial function, so only $${fmt(c)}$ is possible.`,
        };
      }
      const c = R.pick(below);
      void A;
      return {
        q: raw`The exact ground-state energy of ${S[0]} is $${fmt(E0)}$. Which of the following CANNOT be the value of $\langle H\rangle$ for any normalized trial wavefunction?`,
        ...mcv(R, c, R.pickN(above, 5), fmt),
        expl: raw`$\langle H\rangle \ge E_0$ for every normalized state, so the value below $E_0$, namely $${fmt(c)}$, is impossible.`,
      };
    },
  });

  T.push({
    id: 'qm2.var.calc', sec: '5.6.2', level: 3,
    gen(R) {
      const kind = R.pick(['num', 'num', 'num', 'ho', 'hyd']);
      if (kind === 'num') {
        const form = R.pick(['inv', 'quad', 'sq']);
        const ev = raw`\,\text{eV}`;
        if (form === 'inv' || form === 'sq') {
          const [A, B] = R.pick([[1, 4], [2, 8], [4, 9], [3, 12], [2, 18], [1, 9], [9, 4], [8, 2], [5, 20], [6, 6], [1, 16], [3, 27]]);
          const v = 2 * Math.sqrt(A * B);
          const p = form === 'inv' ? '' : '^2';
          return {
            q: raw`A trial wavefunction with a positive variational parameter $b$ gives $\langle H\rangle(b) = (${A}${ev})\left(\frac{b}{b_0}\right)${p} + (${B}${ev})\left(\frac{b_0}{b}\right)${p}$, where $b_0$ is a fixed length. What is the best upper bound on the ground-state energy obtainable from this family?`,
            ...GRE.numeric(R, v, [A + B, Math.sqrt(A * B), 4 * Math.sqrt(A * B), (A + B) / 2, Math.min(A, B)], { unit: raw`\text{eV}`, tol: 0.08, sig: 3 }),
            expl: raw`Minimize: $\frac{d\langle H\rangle}{db} = 0$ gives $(b/b_0)${p === '' ? '^2' : '^4'} = ${B}/${A}$, and then both terms equal $\sqrt{AB}$, so $\langle H\rangle_{\min} = 2\sqrt{${A}\cdot${B}}\,\text{eV} = ${F.num(v, 3)}\,\text{eV}$. The true ground state lies at or below this value.`,
          };
        }
        const A = R.pick([1, 2, 3, 4, 5]), B = R.pick([2, 4, 6, 8, 10, 12]);
        const v = -B * B / (4 * A);
        return {
          q: raw`A trial wavefunction with a positive variational parameter $\beta$ gives $\langle H\rangle(\beta) = (${A}${ev})\beta^2 - (${B}${ev})\beta$, with $\beta$ dimensionless. What is the best upper bound on the ground-state energy obtainable from this family?`,
          ...GRE.numeric(R, v, [-B * B / (2 * A), -B / (2 * A), A - B, -B * B / A, -B * B / (8 * A)].filter(x => x < 0), { unit: raw`\text{eV}`, tol: 0.08, sig: 3 }),
          expl: raw`$\frac{d\langle H\rangle}{d\beta} = ${2 * A}\beta - ${B} = 0$ at $\beta = ${rat(B / (2 * A))}$, where $\langle H\rangle = -\frac{B^2}{4A} = ${F.num(v, 3)}\,\text{eV}$. This is an upper bound on $E_0$.`,
        };
      }
      if (kind === 'ho') {
        const askB = R.bool();
        const c = askB ? raw`$\dfrac{m\omega}{2\hbar}$` : raw`$\dfrac{1}{2}\hbar\omega$`;
        const wr = askB ? [raw`$\dfrac{m\omega}{\hbar}$`, raw`$\dfrac{2m\omega}{\hbar}$`, raw`$\dfrac{m\omega}{4\hbar}$`, raw`$\sqrt{\dfrac{m\omega}{2\hbar}}$`, raw`$\dfrac{\hbar}{2m\omega}$`]
          : [raw`$\hbar\omega$`, raw`$\dfrac{1}{4}\hbar\omega$`, raw`$\dfrac{3}{2}\hbar\omega$`, raw`$\dfrac{1}{\sqrt{2}}\hbar\omega$`, raw`$\dfrac{\pi}{4}\hbar\omega$`];
        return {
          q: raw`For the oscillator $H = \frac{p^2}{2m} + \frac{1}{2}m\omega^2x^2$, the trial function $\psi = Ae^{-bx^2}$ gives $\langle H\rangle(b) = \frac{\hbar^2b}{2m} + \frac{m\omega^2}{8b}$. What is ${askB ? 'the optimal value of $b$' : 'the minimum of $\\langle H\\rangle(b)$'}?`,
          ...GRE.mc(R, c, wr),
          expl: raw`$\frac{d}{db}\langle H\rangle = \frac{\hbar^2}{2m} - \frac{m\omega^2}{8b^2} = 0$ gives $b = \frac{m\omega}{2\hbar}$ and $\langle H\rangle = \frac{\hbar\omega}{4} + \frac{\hbar\omega}{4} = \frac{1}{2}\hbar\omega$ — exact, because the Gaussian family contains the true ground state.`,
        };
      }
      const askB = R.bool();
      const c = askB ? raw`$\dfrac{\hbar^2}{m\kappa}$` : raw`$-\dfrac{m\kappa^2}{2\hbar^2}$`;
      const wr = askB ? [raw`$\dfrac{2\hbar^2}{m\kappa}$`, raw`$\dfrac{\hbar^2}{2m\kappa}$`, raw`$\dfrac{m\kappa}{\hbar^2}$`, raw`$\dfrac{\hbar}{m\kappa}$`, raw`$\dfrac{\hbar^2\kappa}{m}$`]
        : [raw`$-\dfrac{m\kappa^2}{\hbar^2}$`, raw`$-\dfrac{m\kappa^2}{4\hbar^2}$`, raw`$-\dfrac{m\kappa}{2\hbar^2}$`, raw`$+\dfrac{m\kappa^2}{2\hbar^2}$`, raw`$-\dfrac{2m\kappa^2}{\hbar^2}$`];
      return {
        q: raw`For $H = \frac{p^2}{2m} - \frac{\kappa}{r}$, the trial function $\psi \propto e^{-r/\beta}$ gives $\langle H\rangle(\beta) = \frac{\hbar^2}{2m\beta^2} - \frac{\kappa}{\beta}$. What is ${askB ? 'the optimal value of $\\beta$' : 'the minimum of $\\langle H\\rangle(\\beta)$'}?`,
        ...GRE.mc(R, c, wr),
        expl: raw`$\frac{d}{d\beta}\langle H\rangle = -\frac{\hbar^2}{m\beta^3} + \frac{\kappa}{\beta^2} = 0$ gives $\beta = \frac{\hbar^2}{m\kappa}$ (the Bohr radius) and $\langle H\rangle = \frac{m\kappa^2}{2\hbar^2} - \frac{m\kappa^2}{\hbar^2} = -\frac{m\kappa^2}{2\hbar^2}$, the exact hydrogen ground-state energy.`,
      };
    },
  });

  // ================================================================ 5.6.3 Adiabatic theorem
  T.push({
    id: 'qm2.adia.slow', sec: '5.6.3', level: 2, weight: 2,
    gen(R) {
      const kind = R.pick(['box', 'box', 'spring', 'mass', 'charge', 'spin']);
      const n = R.int(1, 4);
      const ordn = ['', 'ground state', 'first excited state', 'second excited state', 'third excited state'];
      if (kind === 'box') {
        const k = R.pick([2, 3, 4, 0.5, 1.5, 2 / 3, 1 / 3]);
        const E = R.pick([1, 2, 3, 4, 6, 8, 9, 12, 16, 18, 36]);
        const v = E / (k * k);
        const kt = Number.isInteger(k) ? `${k}a` : qx(k, 'a');
        return {
          q: raw`A particle is in the ${ordn[n]} of an infinite square well of width $a$, with energy $${E}\,\text{eV}$. The well is then ${k > 1 ? 'expanded' : 'compressed'} very slowly to width $${kt}$. What is the particle's energy at the end?`,
          ...GRE.numeric(R, v, [E, E / k, E * k * k, E * k, E / (k * k * k)], { unit: raw`\text{eV}`, sig: 3 }),
          expl: raw`By the adiabatic theorem the particle stays in the corresponding eigenstate (same $n$) of the new well. Since $E_n \propto 1/a^2$, the energy becomes $${E}/(${rat(k)})^2 = ${F.num(v, 3)}\,\text{eV}$.`,
        };
      }
      if (kind === 'spring' || kind === 'mass') {
        const f = R.pick([4, 9, 16, 1 / 4, 1 / 9, 1 / 16, 2]);
        const v = kind === 'spring' ? Math.sqrt(f) : 1 / Math.sqrt(f);
        return {
          q: raw`A particle is in the ${ordn[n]} of a harmonic oscillator. The ${kind === 'spring' ? 'spring constant' : 'mass of the particle'} is changed very slowly to $${rat(f)}$ times its initial value. By what factor does the particle's energy change?`,
          ...mcv(R, v, [1, f, 1 / v, v * v === f ? 1 / f : f, Math.sqrt(v), v / 2, 2 * v], x => ex(x)),
          expl: raw`The adiabatic theorem keeps the oscillator in level $n$, so $E = (n + \frac{1}{2})\hbar\omega$ scales with $\omega = \sqrt{k/m}$: the factor is $${kind === 'spring' ? raw`\sqrt{${rat(f)}}` : raw`1/\sqrt{${rat(f)}}`} = ${ex(v)}$.`,
        };
      }
      if (kind === 'charge') {
        const [Z1, Z2] = R.pick([[1, 2], [2, 1], [1, 3], [2, 3], [3, 2], [3, 1]]);
        const v = (Z2 * Z2) / (Z1 * Z1);
        return {
          q: raw`An electron is in the $n = ${n + 1}$, $l = ${R.int(0, n)}$ state of a hydrogen-like ion with nuclear charge $${Z1 === 1 ? '' : Z1}e$. Imagine the nuclear charge is increased${Z2 < Z1 ? ' (here: decreased)' : ''} very slowly to $${Z2}e$. By what factor does the electron's energy change?`.replace('increased (here: decreased)', 'decreased'),
          ...mcv(R, v, [Z2 / Z1, 1, Math.pow(Z2 / Z1, 4), Z1 / Z2, (Z2 * Z2 * (n + 1) * (n + 1)) / (Z1 * Z1), Math.pow(Z2 / Z1, 3)], rat),
          expl: raw`Adiabatic change: the electron stays in the state with the same quantum numbers, and $E_n = -13.6\,\text{eV}\,Z^2/n^2$, so the energy changes by $(${Z2}/${Z1})^2 = ${rat(v)}$.`,
        };
      }
      const th = R.pick([60, 90, 120, 180]);
      const slow = R.bool(0.7);
      const v = slow ? 1 : Math.round(Math.cos(th * Math.PI / 360) ** 2 * 1e9) / 1e9;
      return {
        q: raw`A spin-$\frac{1}{2}$ particle in a strong magnetic field is in its lower-energy spin state (spin along the field axis). The field direction is then rotated by $${th}^\circ$ ${slow ? 'very slowly' : 'suddenly'}, keeping its magnitude fixed. What is the probability that the particle is afterwards found in the lower-energy spin state of the new field?`,
        ...mcv(R, v, [1, 0, 0.5, 0.25, 0.75, Math.round(Math.cos(th * Math.PI / 180) ** 2 * 1e9) / 1e9, Math.round(Math.cos(th * Math.PI / 360) ** 2 * 1e9) / 1e9], rat),
        expl: slow
          ? raw`For a slow rotation the adiabatic theorem applies: the spin stays in the instantaneous lower-energy eigenstate and follows the field direction, so the probability is 1.`
          : raw`For a sudden change the state has no time to evolve; its overlap with the new lower-energy state (rotated by $\theta$) is $\cos^2(\theta/2) = \cos^2(${th / 2}^\circ) = ${rat(v)}$.`,
      };
    },
  });

  T.push({
    id: 'qm2.adia.sudden', sec: '5.6.3', level: 3,
    gen(R) {
      const kind = R.pick(['ho', 'ho', 'box', 'boxE', 'beta']);
      if (kind === 'ho') {
        const f = R.pick([4, 9, 16, 1 / 4, 1 / 9, 25]);
        const useK = R.bool();
        const P = 2 * Math.sqrt(f) / (1 + f);
        const ch = useK ? raw`spring constant is suddenly multiplied by $${rat(f * f)}$` : raw`frequency is suddenly changed from $\omega$ to $${qx(f, raw`\omega`)}$`;
        return {
          q: raw`A particle is in the ground state of a harmonic oscillator when the ${ch}. What is the probability that it is found in the ground state of the new oscillator? (The overlap of normalized Gaussian ground states with frequencies $\omega_1$ and $\omega_2$ is $\left(\frac{2\sqrt{\omega_1\omega_2}}{\omega_1 + \omega_2}\right)^{1/2}$.)`,
          ...mcv(R, P, [1, Math.sqrt(P), 1 / Math.sqrt(f) > 1 ? Math.sqrt(f) / 4 : 1 / Math.sqrt(f), 2 * f / (1 + f * f), 0.5, P * P], x => ex(x)),
          expl: raw`In a sudden change the wavefunction is unchanged, so $P = |\langle 0'|0\rangle|^2 = \frac{2\sqrt{\omega_1\omega_2}}{\omega_1 + \omega_2}$ with $\omega_2/\omega_1 = ${rat(f)}$${useK ? ' ($\\omega \\propto \\sqrt{k}$)' : ''}: $P = ${ex(P)}$. (A slow change would give 1.)`,
        };
      }
      if (kind === 'box') {
        return {
          q: raw`A particle is in the ground state of an infinite square well on $0 < x < a$ when the right wall is suddenly moved to $x = 2a$. What is the probability that the particle is found in the ground state of the new well?`,
          ...GRE.mc(R, raw`$\dfrac{32}{9\pi^2}$`, [raw`$1$`, raw`$\dfrac{1}{2}$`, raw`$\dfrac{4\sqrt{2}}{3\pi}$`, raw`$\dfrac{16}{9\pi^2}$`, raw`$\dfrac{8}{9\pi^2}$`, raw`$\dfrac{1}{4}$`]),
          expl: raw`The wavefunction is unchanged in a sudden change. $\langle\phi_1|\psi_1\rangle = \int_0^a\sqrt{\frac{2}{a}}\sin\frac{\pi x}{a}\sqrt{\frac{1}{a}}\sin\frac{\pi x}{2a}dx = \frac{4\sqrt{2}}{3\pi}$, so $P = \frac{32}{9\pi^2} \approx 0.36$. Don't forget to square the overlap.`,
        };
      }
      if (kind === 'boxE') {
        const slow = R.bool();
        const v = slow ? 1 / 4 : 1;
        return {
          q: raw`A particle is in the ground state of an infinite square well of width $a$, with energy $E_1$. The well is ${slow ? 'slowly' : 'suddenly'} expanded to width $2a$. What is the expectation value of its energy afterwards?`,
          ...mcv(R, v, [1, 1 / 4, 1 / 2, 2, 4, 32 / (9 * Math.PI * Math.PI)], x => (Math.abs(x - 32 / (9 * Math.PI * Math.PI)) < 1e-9 ? raw`\frac{32}{9\pi^2}E_1` : qx(x, 'E_1'))),
          expl: slow
            ? raw`Adiabatic: the particle stays in the ground state of the new well, $E = \pi^2\hbar^2/(2m(2a)^2) = E_1/4$.`
            : raw`Sudden: the wavefunction (and hence $\langle H\rangle$, since $H$ is unchanged where $\psi \ne 0$) is the same immediately after, so $\langle E\rangle = E_1$, even though it is now spread over many eigenstates of the new well.`,
        };
      }
      const Z = R.pick([1, 2]);
      const amp = 8 * Math.pow(Z * (Z + 1), 1.5) / Math.pow(2 * Z + 1, 3);
      const P = amp * amp;
      return {
        q: raw`An electron is in the 1s state of a hydrogen-like ion of nuclear charge $${Z === 1 ? '' : Z}e$ when the nucleus suddenly undergoes beta decay, raising its charge to $${Z + 1}e$. The overlap of normalized 1s states for charges $Z$ and $Z'$ is $\frac{8(ZZ')^{3/2}}{(Z + Z')^3}$. The probability that the electron ends up in the 1s state of the new ion is closest to`,
        ...GRE.numeric(R, P, [amp, 1, 0.5, Math.pow(Z / (Z + 1), 2), 1 - P, P * P], { sig: 2, tol: 0.08, fill: [0.5, 0.8, 0.6, 0.4, 0.3, 0.2] }),
        expl: raw`The beta decay is sudden on atomic time scales, so the electron wavefunction is unchanged. $P = \left[\frac{8(${Z}\cdot${Z + 1})^{3/2}}{${2 * Z + 1}^3}\right]^2 \approx ${F.num(P, 2)}$ — remember to square the amplitude ($\approx ${F.num(amp, 2)}$).`,
      };
    },
  });

  T.push({
    id: 'qm2.adia.concept', sec: '5.6.3', level: 2,
    gen(R) {
      const TRUE = [
        [raw`If the Hamiltonian changes slowly enough, a system starting in the $n$th eigenstate ends in the $n$th eigenstate of the final Hamiltonian.`, raw`this is the adiabatic theorem (assuming no level crossings).`],
        [raw`If the Hamiltonian changes suddenly, the wavefunction immediately afterwards equals the wavefunction just before.`, raw`this is the sudden approximation.`],
        [raw`After a sudden change, the probability of finding the system in a new eigenstate $|n'\rangle$ is $|\langle n'|\psi\rangle|^2$.`, raw`the unchanged state is expanded in the new eigenbasis.`],
        [raw`When an infinite well is slowly widened, the energy of a particle in it decreases.`, raw`it stays in the same level and $E_n \propto 1/a^2$.`],
        [raw`A spin in a magnetic field whose direction rotates slowly stays aligned with the field.`, raw`it stays in the instantaneous eigenstate.`],
      ];
      const FALSE = [
        [raw`If the Hamiltonian changes slowly, the wavefunction itself does not change.`, raw`the state evolves to follow the instantaneous eigenstate.`],
        [raw`After a sudden change of the Hamiltonian, the system is always in an eigenstate of the new Hamiltonian.`, raw`in general it is a superposition of new eigenstates.`],
        [raw`When an infinite well is slowly widened, the particle's energy stays constant.`, raw`the energy drops as $1/a^2$; it is the sudden expansion that keeps $\langle E\rangle$ fixed.`],
        [raw`A slow change of the Hamiltonian makes transitions to other eigenstates more likely than a sudden change.`, raw`slow changes suppress transitions.`],
        [raw`The adiabatic theorem says the quantum number $n$ of the state can change, but the energy is conserved.`, raw`$n$ is preserved; the energy follows $E_n$ of the changing Hamiltonian.`],
      ];
      return romanQ(R, 'Which of the following statements about slow (adiabatic) and sudden changes of a Hamiltonian is (are) true?', TRUE, FALSE);
    },
  });

  GRE.addTemplates('qm', T);
})(typeof window !== 'undefined' ? window.GRE : this.GRE);
