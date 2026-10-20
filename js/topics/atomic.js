/* Atomic Physics — §5.7 of Conquering the Physics GRE (Kahn & Anderson).
 * Bohr model, perturbations to hydrogen, shell model and term symbols,
 * Stark/Zeeman effects, selection rules, black-body radiation and photons.
 * Templates follow the conventions in tools/AUTHORING.md.
 */
(function (GRE) {
  'use strict';
  const F = GRE.fmt;
  const C = GRE.C;
  const raw = String.raw;

  // ------------------------------------------------------------------ constants
  const RY = C.Ry_eV;               // 13.6 eV
  const HC = C.hc_eVnm;             // 1240 eV nm
  const A0NM = C.a0 * 1e9;          // Bohr radius in nm (0.0529)
  const ALPHA = 1 / 137;
  const VC1 = C.c * ALPHA;          // electron speed in the hydrogen ground state (~2.2e6 m/s)
  const H_EVS = C.h / C.e;          // h in eV s
  const ME_EV = C.mec2_MeV * 1e6;   // electron rest energy in eV
  const MUB = C.muB_eVT;            // Bohr magneton in eV/T

  // ------------------------------------------------------------------ helpers
  const LS = 'spdfghik';            // orbital letters, l = 0, 1, 2, ...
  const LT = 'SPDFGHIKLMN';         // term letters, L = 0, 1, 2, ...
  const range = (a, b) => { const o = []; for (let i = a; i <= b; i++) o.push(i); return o; };
  const half = x2 => (x2 % 2 === 0 ? String(x2 / 2) : `${x2}/2`);       // 2J -> "3/2"
  const halfT = x2 => F.frac(x2, 2);                                     // 2J -> "\frac{3}{2}"
  const term = (S2, L, J2) => `{}^{${S2 + 1}}${LT[L]}_{${half(J2)}}`;    // TeX, no $
  const termL = (S2, L) => `{}^{${S2 + 1}}${LT[L]}`;
  const nlj = (n, l, j2) => `${n}${LS[l]}_{${half(j2)}}`;
  const Jvals = (S2, L) => { const o = []; for (let j = Math.abs(2 * L - S2); j <= 2 * L + S2; j += 2) o.push(j); return o; };
  const rat = (n, d) => { if (d < 0) { n = -n; d = -d; } const g = F.gcd(n, d) || 1; return [n / g, d / g]; };
  const ratPow = (n, d, p) => (p >= 0 ? [Math.pow(n, p), Math.pow(d, p)] : [Math.pow(d, -p), Math.pow(n, -p)]);
  const withUnit = (s, u) => (!u ? s : s === '0' ? '0' : s === '1' ? u : s === '-1' ? '-' + u : s + raw`\,` + u);
  // Landé g factor as a rational [num, den] from 2S, L, 2J
  const landeG = (S2, L, J2) => { const jj = J2 * (J2 + 2), ss = S2 * (S2 + 2), ll = 4 * L * (L + 1); return rat(3 * jj + ss - ll, 2 * jj); };

  /** ranked choices from rationals [n, d] */
  function ratChoices(R, correct, wrongs, o = {}) {
    const val = new Map();
    const fmt = q => {
      const [n, d] = rat(q[0], q[1]);
      const t = `$${withUnit(F.frac(n, d), o.unit)}$`;
      val.set(t, n / d);
      return t;
    };
    const c = fmt(correct);
    const ws = [];
    for (const w of wrongs) {
      if (!w || !w[1] || !isFinite(w[0]) || !isFinite(w[1])) continue;
      if (!o.allowNeg && w[0] / w[1] <= 0) continue;
      ws.push(fmt(w));
    }
    return GRE.mc(R, c, ws, { rank: t => val.get(t) });
  }

  /** ranked choices from real numbers written exactly (fractions, surds) */
  function exactChoices(R, correct, wrongs, o = {}) {
    const val = new Map();
    const fmt = x => {
      if (!isFinite(x) || (x <= 0 && !o.allowNeg)) return null;
      const e = F.exact(x, o.maxDen || 64);
      if (e == null) return null;
      const t = `$${withUnit(e, o.unit)}$`;
      if (!val.has(t)) val.set(t, x);
      return t;
    };
    const c = fmt(correct);
    if (!c) throw new Error('exactChoices: no exact form');
    const ws = wrongs.map(fmt).filter(t => t && Math.abs(val.get(t) - correct) > 1e-9 * Math.max(1, Math.abs(correct)));
    return GRE.mc(R, c, ws, { rank: t => val.get(t) });
  }

  /** ranked integer choices; pads with neighbouring integers */
  function intChoices(R, correct, wrongs, o = {}) {
    const min = o.min == null ? 0 : o.min;
    const fmt = o.fmt || (x => `$${x}$`);
    const pool = [];
    for (const w of wrongs) if (Number.isInteger(w) && w >= min && w !== correct && pool.indexOf(w) < 0) pool.push(w);
    for (let k = 1; pool.length < 6 && k < 60; k++) {
      for (const c of [correct + k, correct - k]) if (c >= min && c !== correct && pool.indexOf(c) < 0 && pool.length < 6) pool.push(c);
    }
    const val = new Map();
    const tc = fmt(correct); val.set(tc, correct);
    const ws = pool.map(w => { const t = fmt(w); val.set(t, w); return t; });
    return GRE.mc(R, tc, ws, { rank: t => val.get(t) });
  }

  /** three Roman-numeral statements from [text, reason] pools */
  function romanSet(R, trues, falses) {
    let nT = R.weighted([1, 2, 3], [4, 4, 2]);
    nT = Math.min(nT, trues.length);
    if (3 - nT > falses.length) nT = 3 - falses.length;
    return R.shuffle(R.pickN(trues, nT).map(s => [s, true]).concat(R.pickN(falses, 3 - nT).map(s => [s, false])));
  }
  const textOf = s => (Array.isArray(s) ? s[0] : s);
  const whyOf = s => (Array.isArray(s) ? s[1] : '');
  function romanQ(R, intro, st) {
    return { q: GRE.romanStem(intro, st.map(x => textOf(x[0]))), ...GRE.roman(R, st.map(x => x[1])) };
  }
  const romanExpl = st => st.map((x, i) => `${['I', 'II', 'III'][i]} is ${x[1] ? 'true' : 'false'}${whyOf(x[0]) ? ': ' + whyOf(x[0]) : ''}.`).join(' ');

  // ------------------------------------------------------------------ hydrogen-like ions
  const IONS = [
    { Z: 1, tex: raw`\text{H}`, name: 'hydrogen atom' },
    { Z: 2, tex: raw`\text{He}^{+}`, name: 'singly ionized helium ion' },
    { Z: 3, tex: raw`\text{Li}^{2+}`, name: 'doubly ionized lithium ion' },
    { Z: 4, tex: raw`\text{Be}^{3+}`, name: 'triply ionized beryllium ion' },
    { Z: 5, tex: raw`\text{B}^{4+}`, name: 'hydrogen-like boron ion' },
    { Z: 6, tex: raw`\text{C}^{5+}`, name: 'hydrogen-like carbon ion' },
  ];
  const pickIon = (R, w) => R.weighted(IONS, w || [5, 3, 2, 1, 1, 1]);
  const ionPh = ion => (ion.Z === 1 ? 'a hydrogen atom' : `a ${ion.name} ($${ion.tex}$, $Z = ${ion.Z}$)`);
  const IonPh = ion => (ion.Z === 1 ? 'A hydrogen atom' : `A ${ion.name} ($${ion.tex}$, $Z = ${ion.Z}$)`);
  const ORD = ['', 'first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh'];
  const stateName = (R, n) => (n === 1 ? R.pick(['ground state', '$n = 1$ state']) : R.bool(0.5) ? `${ORD[n - 1]} excited state` : `$n = ${n}$ state`);
  // wavelength in nm -> display factor and unit
  const lamU = nm => (nm >= 2000 ? { f: 1e-3, u: raw`\mu\text{m}` } : nm < 1 ? { f: 1e3, u: raw`\text{pm}` } : { f: 1, u: raw`\text{nm}` });
  const SERIES = ['', 'Lyman', 'Balmer', 'Paschen', 'Brackett', 'Pfund'];
  const GREEK = ['', raw`\alpha`, raw`\beta`, raw`\gamma`, raw`\delta`];
  const Dn = (u, l) => 1 / (l * l) - 1 / (u * u);

  // ------------------------------------------------------------------ elements
  const ELEM = [null,
    ['H', 'hydrogen'], ['He', 'helium'], ['Li', 'lithium'], ['Be', 'beryllium'], ['B', 'boron'], ['C', 'carbon'], ['N', 'nitrogen'], ['O', 'oxygen'], ['F', 'fluorine'], ['Ne', 'neon'],
    ['Na', 'sodium'], ['Mg', 'magnesium'], ['Al', 'aluminum'], ['Si', 'silicon'], ['P', 'phosphorus'], ['S', 'sulfur'], ['Cl', 'chlorine'], ['Ar', 'argon'], ['K', 'potassium'], ['Ca', 'calcium'],
    ['Sc', 'scandium'], ['Ti', 'titanium'], ['V', 'vanadium'], ['Cr', 'chromium'], ['Mn', 'manganese'], ['Fe', 'iron'], ['Co', 'cobalt'], ['Ni', 'nickel'], ['Cu', 'copper'], ['Zn', 'zinc'],
    ['Ga', 'gallium'], ['Ge', 'germanium'], ['As', 'arsenic'], ['Se', 'selenium'], ['Br', 'bromine'], ['Kr', 'krypton'], ['Rb', 'rubidium'], ['Sr', 'strontium'], ['Y', 'yttrium'], ['Zr', 'zirconium'],
    ['Nb', 'niobium'], ['Mo', 'molybdenum'], ['Tc', 'technetium'], ['Ru', 'ruthenium'], ['Rh', 'rhodium'], ['Pd', 'palladium'], ['Ag', 'silver'], ['Cd', 'cadmium'], ['In', 'indium'], ['Sn', 'tin'],
  ];
  const elName = Z => ELEM[Z][1];
  const elFull = Z => `${ELEM[Z][1]} ($Z = ${Z}$)`;
  // Madelung filling order (enough for Z <= 54)
  const ORDER = [[1, 0], [2, 0], [2, 1], [3, 0], [3, 1], [4, 0], [3, 2], [4, 1], [5, 0], [4, 2], [5, 1]];
  const cap = l => 4 * l + 2;
  function groundCfg(Z) {
    const cfg = [];
    let left = Z;
    for (const [n, l] of ORDER) { if (left <= 0) break; const k = Math.min(left, cap(l)); cfg.push([n, l, k]); left -= k; }
    if (Z === 24 || Z === 29) { // Cr and Cu: one 4s electron moves into 3d
      const s = cfg.find(x => x[0] === 4 && x[1] === 0), d = cfg.find(x => x[0] === 3 && x[1] === 2);
      s[2] -= 1; d[2] += 1;
    }
    return cfg;
  }
  const cloneCfg = c => c.map(x => x.slice());
  const cfgKey = c => c.filter(x => x[2] > 0).map(x => x.join('.')).sort().join('|');
  /** TeX of a configuration; core = Z of a noble-gas core to abbreviate (if intact) */
  function cfgTeX(cfg, core) {
    let parts = cfg.filter(x => x[2] > 0).slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    let pre = '';
    if (core) {
      const cc = groundCfg(core);
      const intact = cc.every(([n, l, k]) => parts.some(x => x[0] === n && x[1] === l && x[2] === k));
      if (intact) { parts = parts.filter(x => !cc.some(c => c[0] === x[0] && c[1] === x[1])); pre = raw`[\text{${ELEM[core][0]}}]\,`; }
    }
    return pre + parts.map(([n, l, k]) => `${n}${LS[l]}^{${k}}`).join(raw`\,`);
  }
  const coreFor = Z => (Z > 36 ? 36 : Z > 18 ? 18 : Z > 10 ? 10 : 0);
  /** Hund's-rules ground term of a single open subshell l^k: {S2, L, J2} */
  function hund(l, k) {
    const nOrb = 2 * l + 1;
    const up = Math.min(k, nOrb), dn = k - up;
    let ML = 0;
    for (let i = 0; i < up; i++) ML += l - i;
    for (let i = 0; i < dn; i++) ML += l - i;
    const S2 = up - dn, L = Math.abs(ML);
    const J2 = k < nOrb ? Math.abs(2 * L - S2) : k > nOrb ? 2 * L + S2 : S2;
    return { S2, L, J2 };
  }
  /** ground term of a neutral atom Z <= 36 */
  function groundTerm(Z) {
    if (Z === 24) return { S2: 6, L: 0, J2: 6 };
    const open = groundCfg(Z).filter(x => x[2] < cap(x[1]));
    if (!open.length) return { S2: 0, L: 0, J2: 0 };
    const [, l, k] = open[open.length - 1];
    return hund(l, k);
  }
  const unpaired = cfg => cfg.reduce((s, [, l, k]) => s + Math.min(k, cap(l) - k), 0);

  // =================================================================== 5.7.1 Bohr model
  GRE.addTemplates('atomic', [
    {
      id: 'atomic.bohr.energy', sec: '5.7.1', level: 1, weight: 2,
      gen(R) {
        const v = R.weighted(['level', 'ionize', 'identify', 'multi'], [4, 4, 2, 1]);
        if (v === 'level' || v === 'ionize') {
          const ion = pickIon(R), Z = ion.Z;
          const n = R.weighted([1, 2, 3, 4, 5, 6], [2, 3, 3, 2, 1, 1]);
          const st = stateName(R, n);
          const E = RY * Z * Z / (n * n);
          const wr = [RY * Z / (n * n), RY * Z * Z / n, RY / (n * n), n > 1 ? RY * Z * Z / ((n - 1) * (n - 1)) : 4 * RY * Z * Z, RY * Z * Z / ((n + 1) * (n + 1)), RY * Z * Z * n];
          const note = /excited/.test(st) ? ` (the ${st} has $n = ${n}$)` : '';
          if (v === 'level') {
            return {
              q: `According to the Bohr model, what is the energy of ${ionPh(ion)} when its electron is in the ${st}? Take the energy to be zero when the electron is at rest far from the nucleus.`,
              ...GRE.numeric(R, -E, wr.map(x => -x), { unit: raw`\text{eV}`, sig: 3, tol: 0.08 }),
              expl: raw`$E_n = -(13.6\,\text{eV})\,Z^2/n^2$ with $Z = ${Z}$, $n = ${n}$${note}: $E = -13.6\times ${Z * Z}/${n * n}\,\text{eV} = ${F.num(-E, 3)}\,\text{eV}$. The energy goes as $Z^2$, not $Z$: the nuclear charge enters once in the Coulomb force and again through the smaller orbit.`,
            };
          }
          return {
            q: `What is the minimum energy needed to ionize ${ionPh(ion)} whose electron is in the ${st}, according to the Bohr model?`,
            ...GRE.numeric(R, E, wr, { unit: raw`\text{eV}`, sig: 3, tol: 0.08 }),
            expl: raw`The ionization energy from level $n$ is $|E_n| = (13.6\,\text{eV})\,Z^2/n^2$${note} $= 13.6\times ${Z * Z}/${n * n}\,\text{eV} = ${F.num(E, 3)}\,\text{eV}$. Remember the $Z^2$ scaling and that only $1/n^2$ (not $1/n$) appears.`,
          };
        }
        if (v === 'identify') {
          const Z = R.int(2, 8), n = R.weighted([1, 2, 3], [3, 2, 1]);
          const Eb = RY * Z * Z / (n * n);
          const wr = [Z * Z, Z * Z / (n * n), Z / n, Z + 1, Z - 1, n * Z, 2 * Z];
          return {
            q: `A nucleus with a single bound electron (a hydrogen-like ion) has a binding energy of $${F.num(Eb, 4)}\,\text{eV}$ when the electron is in the ${n === 1 ? 'ground state' : `$n = ${n}$ level`}. According to the Bohr model, what is the atomic number $Z$ of the nucleus?`,
            ...intChoices(R, Z, wr, { min: 1 }),
            level: 2,
            expl: raw`$|E_n| = (13.6\,\text{eV})Z^2/n^2$, so $Z = n\sqrt{|E_n|/13.6\,\text{eV}} = ${n === 1 ? '' : n}\sqrt{${F.num(Eb / RY, 4)}} = ${Z}$. Forgetting the square root gives $Z^2$${n > 1 ? '; forgetting $n$ gives $Z/n$' : ''}.`,
          };
        }
        const c = R.pick(['He', 'Li', 'last', 'last']);
        if (c === 'He') {
          return {
            q: raw`The first ionization energy of neutral helium is $24.6\,\text{eV}$. What is the minimum energy needed to remove both electrons from a helium atom in its ground state?`,
            ...GRE.numeric(R, 24.6 + 4 * RY, [2 * 24.6, 4 * RY, 8 * RY, 24.6 + RY, 2 * RY], { unit: raw`\text{eV}`, sig: 3, tol: 0.05 }),
            level: 2,
            expl: raw`After the first electron is removed ($24.6\,\text{eV}$), what is left is hydrogen-like $\text{He}^{+}$ with $Z = 2$, whose ionization energy is $13.6\times 4 = 54.4\,\text{eV}$. Total: $24.6 + 54.4 = 79.0\,\text{eV}$.`,
          };
        }
        if (c === 'Li') {
          return {
            q: raw`The first two ionization energies of lithium are $5.4\,\text{eV}$ and $75.6\,\text{eV}$. What is the minimum total energy needed to strip all three electrons from a ground-state lithium atom?`,
            ...GRE.numeric(R, 5.4 + 75.6 + 9 * RY, [5.4 + 75.6, 9 * RY, 5.4 + 75.6 + 3 * RY, 5.4 + 75.6 + RY, 5.4 + 75.6 + 4 * RY], { unit: raw`\text{eV}`, sig: 4, tol: 0.05 }),
            level: 2,
            expl: raw`The last electron is bound to a bare $Z = 3$ nucleus, i.e. hydrogen-like $\text{Li}^{2+}$, with ionization energy $13.6\times 9 = 122.4\,\text{eV}$. Total: $5.4 + 75.6 + 122.4 = 203.4\,\text{eV}$.`,
          };
        }
        const Z = R.int(3, 8);
        const sym = ELEM[Z][0];
        const E = RY * Z * Z;
        return {
          q: raw`What is the minimum energy required to remove the last remaining electron from a $\text{${sym}}^{${Z - 1}+}$ ion (${elName(Z)}, $Z = ${Z}$) in its ground state?`,
          ...GRE.numeric(R, E, [RY * Z, RY * (Z - 1) * (Z - 1), RY * Z * Z * Z, RY * Z * Z / 2, RY], { unit: raw`\text{eV}`, sig: 3, tol: 0.08 }),
          expl: raw`With one electron left the ion is hydrogen-like: $E_1 = -(13.6\,\text{eV})Z^2 = -13.6\times ${Z * Z}\,\text{eV}$, so $${F.num(E, 4)}\,\text{eV}$ is needed. There is no screening when only one electron remains, so $Z$ (not $Z-1$) is correct.`,
        };
      },
    },
    {
      id: 'atomic.bohr.transition', sec: '5.7.1', level: 2, weight: 3,
      gen(R) {
        const ion = pickIon(R, [6, 3, 2, 1, 1, 1]), Z = ion.Z;
        const nf = R.weighted([1, 2, 3, 4], [4, 4, 2, 1]);
        const ni = nf + R.weighted([1, 2, 3, 4], [4, 3, 2, 1]);
        const D = Dn(ni, nf);
        const E = RY * Z * Z * D;
        const Ew = [RY * Z * D, RY * Z * Z * (1 / (nf * nf) + 1 / (ni * ni)), RY * Z * Z / (nf * nf), RY * Z * Z * (1 / nf - 1 / ni), RY * D, RY * Z * Z / (ni * ni)];
        const absorb = R.bool(0.3);
        const tr = absorb ? `absorbs a photon, and its electron jumps from $n = ${nf}$ to $n = ${ni}$` : `emits a photon as its electron drops from $n = ${ni}$ to $n = ${nf}$`;
        const ask = R.weighted(['lam', 'E', 'f'], [3, 2, 1]);
        const eTeX = raw`$E = (13.6\,\text{eV})\,Z^2\left(\frac{1}{${nf}^2} - \frac{1}{${ni}^2}\right) = 13.6\times ${Z * Z}\times ${F.num(D, 3)}\,\text{eV} = ${F.num(E, 3)}\,\text{eV}$`;
        const trap = Z > 1 ? raw` Forgetting the factor $Z^2 = ${Z * Z}$ is the classic trap.` : raw` Using $1/n$ instead of $1/n^2$, or adding instead of subtracting the two terms, gives the distractors.`;
        if (ask === 'lam') {
          const lam = HC / E, U = lamU(lam);
          return {
            q: `${IonPh(ion)} ${tr}. According to the Bohr model, what is the wavelength of this photon?`,
            ...GRE.numeric(R, lam * U.f, Ew.map(e => HC / e * U.f), { unit: U.u, sig: 3, tol: 0.1 }),
            expl: eTeX + raw`, so $\lambda = hc/E = (1240\,\text{eV}\cdot\text{nm})/E = ${F.num(lam * U.f, 3)}\,${U.u}$.` + trap,
          };
        }
        if (ask === 'E') {
          return {
            q: `${IonPh(ion)} ${tr}. According to the Bohr model, what is the energy of the photon?`,
            ...GRE.numeric(R, E, Ew, { unit: raw`\text{eV}`, sig: 3, tol: 0.1 }),
            expl: eTeX + '.' + trap,
          };
        }
        const f = E / H_EVS;
        return {
          q: `${IonPh(ion)} ${tr}. According to the Bohr model, what is the frequency of the photon? (Use $h = 4.14\\times 10^{-15}\\,\\text{eV}\\cdot\\text{s}$.)`,
          ...GRE.numeric(R, f, Ew.map(e => e / H_EVS), { unit: raw`\text{Hz}`, sig: 2, tol: 0.12 }),
          expl: eTeX + raw`, so $f = E/h = ${F.num(f, 2)}\,\text{Hz}$.` + trap,
        };
      },
    },
    {
      id: 'atomic.bohr.radius', sec: '5.7.1', level: 2, weight: 2,
      gen(R) {
        const v = R.weighted(['num', 'ratio', 'match'], [3, 3, 1]);
        if (v === 'num') {
          const ion = pickIon(R), Z = ion.Z, n = R.int(1, 6);
          const r = n * n * A0NM / Z;
          const pm = r < 0.1, f = pm ? 1000 : 1, u = pm ? raw`\text{pm}` : raw`\text{nm}`;
          const wr = [n * A0NM / Z, n * n * A0NM * Z, n * n * A0NM / (Z * Z), n * n * A0NM, n * A0NM, 2 * n * n * A0NM / Z].map(x => x * f);
          return {
            q: `In the Bohr model, what is the radius of the electron’s orbit in ${ionPh(ion)} when the electron is in the ${stateName(R, n)}? (The Bohr radius is $a_0 = 0.0529\\,\\text{nm}$.)`,
            ...GRE.numeric(R, r * f, wr, { unit: u, sig: 3, tol: 0.1 }),
            level: 1,
            expl: raw`$r_n = n^2 a_0/Z = (${n * n}/${Z})(0.0529\,\text{nm}) = ${F.num(r * f, 3)}\,${u}$. Radii grow as $n^2$ and shrink as $1/Z$ because the stronger nuclear charge pulls the electron in.`,
          };
        }
        if (v === 'ratio') {
          const A = pickIon(R, [3, 3, 2, 1, 0, 0]);
          const B = R.bool(0.6) ? IONS[0] : pickIon(R, [3, 3, 2, 1, 0, 0]);
          const n1 = R.int(1, 5), Z1 = A.Z, Z2 = B.Z;
          let n2 = R.int(1, 5);
          if (Z1 === Z2 && n1 === n2) n2 = n1 === 5 ? 4 : n1 + 1;
          const desc = (ion, n) => (ion.Z === 1 ? `hydrogen in the $n = ${n}$ state` : `$${ion.tex}$ in the $n = ${n}$ state`);
          return {
            q: `In the Bohr model, let $r_A$ be the orbit radius for ${desc(A, n1)} and $r_B$ the orbit radius for ${desc(B, n2)}. What is $r_A/r_B$?`,
            ...ratChoices(R, [n1 * n1 * Z2, n2 * n2 * Z1], [[n1 * Z2, n2 * Z1], [n1 * n1 * Z1, n2 * n2 * Z2], [n1 * n1 * Z2 * Z2, n2 * n2 * Z1 * Z1], [n1 * n1, n2 * n2], [n2 * n2 * Z1, n1 * n1 * Z2], [n1, n2], [n2 * Z1, n1 * Z2], [Math.pow(n1, 4) * Z2 * Z2, Math.pow(n2, 4) * Z1 * Z1], [Math.pow(n1, 3) * Z2, Math.pow(n2, 3) * Z1], [2 * n1 * n1 * Z2, n2 * n2 * Z1], [n1 * n1 * Z2, 2 * n2 * n2 * Z1]]),
            expl: raw`$r_n = n^2a_0/Z$, so $r_A/r_B = \dfrac{${n1}^2/${Z1}}{${n2}^2/${Z2}} = ${F.frac(n1 * n1 * Z2, n2 * n2 * Z1)}$. The radius is proportional to $n^2$ and inversely proportional to $Z$.`,
          };
        }
        const m = R.int(1, 3);
        if (R.bool()) {
          const Z = R.pick([4, 9]), k = Math.sqrt(Z), ans = m * k;
          const tex = Z === 4 ? raw`\text{Be}^{3+}` : raw`\text{F}^{8+}`;
          return {
            q: `For which value of $n$ is the Bohr-model orbit radius of the hydrogen-like ion $${tex}$ ($Z = ${Z}$) equal to the radius of the $n = ${m}$ orbit of hydrogen?`,
            ...intChoices(R, ans, [m * Z, m, m * Z * Z, m + Z, ans + 1, 2 * m], { min: 1 }),
            expl: raw`$r = n^2a_0/Z$. Setting $n^2/${Z} = ${m}^2$ gives $n = ${m}\sqrt{${Z}} = ${ans}$.`,
          };
        }
        const Z = R.int(2, 4), ion = IONS[Z - 1], ans = m * Z;
        return {
          q: `For which value of $n$ does the Bohr-model energy of ${ionPh(ion)} equal the energy of the $n = ${m}$ level of hydrogen?`,
          ...intChoices(R, ans, [m * Z * Z, m, m + Z, ans + 1, Z, Z === 4 ? 2 * m : m * Z + 2], { min: 1 }),
          expl: raw`$E_n = -(13.6\,\text{eV})Z^2/n^2$. Setting $${Z * Z}/n^2 = 1/${m * m}$ gives $n = ${Z}\times ${m} = ${ans}$: every level of hydrogen reappears in the ion at $n$ multiplied by $Z$.`,
        };
      },
    },
    {
      id: 'atomic.bohr.speed', sec: '5.7.1', level: 2,
      gen(R) {
        const v = R.weighted(['v', 'frac', 'period', 'rel'], [3, 2, 2, 1]);
        const ion = pickIon(R, [5, 3, 2, 1, 1, 1]), Z = ion.Z, n = R.int(1, 6);
        if (v === 'v') {
          const sp = Z * VC1 / n;
          return {
            q: `In the Bohr model, what is the speed of the electron in ${ionPh(ion)} when the electron is in the $n = ${n}$ orbit? (The fine-structure constant is $\\alpha \\approx 1/137$.)`,
            ...GRE.numeric(R, sp, [VC1 / n, Z * Z * VC1 / n, Z * VC1 / (n * n), Z * VC1 * n, Z * VC1 / Math.sqrt(n)], { unit: raw`\text{m/s}`, sig: 2 }),
            expl: raw`$v_n = Z\alpha c/n = ${Z}\times(3\times10^{8}\,\text{m/s})/(137\times ${n}) = ${F.num(sp, 2)}\,\text{m/s}$. The speed grows with $Z$ and falls as $1/n$.`,
          };
        }
        if (v === 'frac') {
          return {
            q: `In the Bohr model, the electron of ${ionPh(ion)} is in the $n = ${n}$ orbit. What is its speed as a fraction of the speed of light? (Take $\\alpha = 1/137$.)`,
            ...ratChoices(R, [Z, 137 * n], [[Z * Z, 137 * n], [Z, 137 * n * n], [1, 137 * n], [Z * n, 137], [n, 137 * Z], [2 * Z, 137 * n], [Z, 274 * n], [Z, 1836 * n]]),
            expl: raw`$v/c = Z\alpha/n = ${F.frac(Z, 137 * n)}$. In hydrogen's ground state $v = \alpha c$, which is why relativistic (fine-structure) corrections are of relative size $\alpha^2$.`,
          };
        }
        if (v === 'period') {
          const T0 = 2 * Math.PI * C.a0 / VC1;
          const T = T0 * n * n * n / (Z * Z);
          return {
            q: `In the Bohr model, how long does the electron of ${ionPh(ion)} in the $n = ${n}$ orbit take to complete one revolution? ($a_0 = 5.29\\times10^{-11}\\,\\text{m}$, $\\alpha \\approx 1/137$.)`,
            ...GRE.numeric(R, T, [T0 * n * n / (Z * Z), T0 * n * n * n / Z, T / (2 * Math.PI), T0 * n * n * n * Z * Z, T0 * n / Z], { unit: raw`\text{s}`, sig: 2 }),
            level: 3,
            expl: raw`$T = 2\pi r_n/v_n$ with $r_n = n^2a_0/Z$ and $v_n = Z\alpha c/n$, so $T = 2\pi n^3 a_0/(Z^2\alpha c) = ${F.num(T, 2)}\,\text{s}$ (about $1.5\times10^{-16}\,\text{s}$ for the hydrogen ground state).`,
          };
        }
        const fr = R.pick([[1, 2], [1, 3], [1, 4], [1, 5], [1, 10], [2, 3]]);
        const Zr = 137 * fr[0] / fr[1];
        return {
          q: `For a hydrogen-like ion, the Bohr model predicts a ground-state electron speed that grows with the nuclear charge $Z$. For roughly what value of $Z$ would the ground-state speed equal $${F.frac(fr[0], fr[1])}\\,c$?`,
          ...GRE.numeric(R, Zr, [137 * Math.pow(fr[0] / fr[1], 2), 137 * Math.sqrt(fr[0] / fr[1]), 137 * fr[1] / fr[0], 137, Zr / 2], { fmt: x => String(Math.round(x)), tol: 0.15 }),
          expl: raw`$v_1 = Z\alpha c$, so $Z = (v/c)/\alpha = ${F.frac(fr[0], fr[1])}\times 137 \approx ${Math.round(Zr)}$. For such heavy ions the non-relativistic Bohr model is no longer accurate.`,
        };
      },
    },
    {
      id: 'atomic.bohr.scaling', sec: '5.7.1', level: 2, weight: 2,
      gen(R) {
        // [name, power of n, power of Z, why]
        const Q = [
          ['the radius of the orbit', 2, -1, raw`r = n^2a_0/Z`],
          ['the speed of the electron', -1, 1, raw`v = Z\alpha c/n`],
          ['the binding energy of the electron', -2, 2, raw`|E| = (13.6\,\text{eV})Z^2/n^2`],
          ['the kinetic energy of the electron', -2, 2, raw`K = |E| \propto Z^2/n^2`],
          ['the magnitude of the electrostatic potential energy', -2, 2, raw`|U| = 2K \propto Z^2/n^2`],
          ['the orbital angular momentum of the electron', 1, 0, raw`L = n\hbar`],
          ['the orbital period', 3, -2, raw`T = 2\pi r/v \propto (n^2/Z)/(Z/n)`],
          ['the number of revolutions per second', -3, 2, raw`f = v/(2\pi r) \propto (Z/n)/(n^2/Z)`],
          ['the centripetal acceleration of the electron', -4, 3, raw`a = v^2/r \propto (Z^2/n^2)/(n^2/Z)`],
          ['the magnitude of the electron’s linear momentum', -1, 1, raw`p = mv \propto Z/n`],
          ['the orbital magnetic dipole moment', 1, 0, raw`\mu = (e/2m)L = n\,e\hbar/2m`],
          ['the average current of the orbiting electron', -3, 2, raw`I = ev/(2\pi r) \propto Z^2/n^3`],
          ['the magnetic field produced at the nucleus by the orbiting electron', -5, 3, raw`B = \mu_0 I/(2r) \propto (Z^2/n^3)/(n^2/Z)`],
          ['the de Broglie wavelength of the electron', 1, -1, raw`\lambda = h/p \propto n/Z`],
          ['the magnitude of the electric force on the electron', -4, 3, raw`F \propto Z/r^2 \propto Z^3/n^4`],
        ];
        const [name, pn, pZ, why] = R.pick(Q);
        const v = R.weighted(['npow', 'nratio', 'zratio'], [2, 3, 2]);
        const pw = (k, s) => (k === 0 ? `independent of $${s}$` : k === 1 ? `$\\propto ${s}$` : k > 1 ? `$\\propto ${s}^{${k}}$` : k === -1 ? `$\\propto 1/${s}$` : `$\\propto 1/${s}^{${-k}}$`);
        if (v === 'npow') {
          const ks = [pn + 1, pn - 1, -pn, 2 * pn, pn + 2, pn - 2, 0].filter(k => k !== pn && k >= -6 && k <= 4);
          const val = new Map(); const mk = k => { const t = pw(k, 'n'); val.set(t, k); return t; };
          return {
            q: `In the Bohr model of hydrogen, how does ${name} depend on the principal quantum number $n$?`,
            ...GRE.mc(R, mk(pn), ks.map(mk), { rank: t => val.get(t) }),
            level: Math.abs(pn) >= 3 ? 3 : 2,
            expl: raw`Use $r \propto n^2$, $v \propto 1/n$: $${why}$, so it is proportional to $n^{${pn}}$.`,
          };
        }
        if (v === 'nratio') {
          if (Math.abs(pn) > 4) throw new Error('too steep');
          const a = R.int(1, 4);
          let b = R.int(1, 5); if (b === a) b = a + 1;
          const exps = [pn + 1, pn - 1, -pn, 2 * pn, pn + 2, pn - 2].filter(k => k !== pn && Math.abs(k) <= 5);
          return {
            q: `In the Bohr model of hydrogen, the electron moves from the $n = ${a}$ orbit to the $n = ${b}$ orbit. By what factor is ${name} multiplied?`,
            ...ratChoices(R, ratPow(b, a, pn), exps.map(k => ratPow(b, a, k))),
            expl: raw`$${why}$, so it scales as $n^{${pn}}$ and changes by $(${b}/${a})^{${pn}} = ${F.frac(...ratPow(b, a, pn))}$.`,
          };
        }
        const ion = pickIon(R, [0, 4, 3, 2, 0, 0]), Z = ion.Z;
        const n = R.int(1, 4);
        const exps = [pZ + 1, pZ - 1, -pZ, 2 * pZ, pZ + 2, pZ - 2].filter(k => k !== pZ && Math.abs(k) <= 6);
        return {
          q: `In the Bohr model, compare ${name} for $${ion.tex}$ ($Z = ${Z}$) in the $n = ${n}$ state with the same quantity for hydrogen in the $n = ${n}$ state. What is the ratio (ion : hydrogen)?`,
          ...ratChoices(R, ratPow(Z, 1, pZ), exps.map(k => ratPow(Z, 1, k))),
          expl: raw`$${why}$, so at fixed $n$ it scales as $Z^{${pZ}}$: the ratio is $${Z}^{${pZ}} = ${F.frac(...ratPow(Z, 1, pZ))}$.`,
        };
      },
    },
    {
      id: 'atomic.bohr.reduced', sec: '5.7.1', level: 2, weight: 2,
      gen(R) {
        const v = R.weighted(['exotic', 'isotope', 'ps'], [4, 2, 1]);
        if (v === 'ps') {
          const Qs = [
            ['the Bohr radius of positronium to that of hydrogen', [2, 1], raw`a \propto 1/\mu`],
            ['the ground-state binding energy of positronium to that of hydrogen', [1, 2], raw`E \propto \mu`],
            [raw`the wavelength of positronium's $n = 2 \to 1$ line to that of hydrogen's Lyman-$\alpha$ line`, [2, 1], raw`\lambda \propto 1/E \propto 1/\mu`],
          ];
          const [what, c, why] = R.pick(Qs);
          return {
            q: `Positronium is a bound state of an electron and a positron. Treating it as a hydrogen-like system, what is the ratio of ${what}?`,
            ...ratChoices(R, c, [[1, 1], [4, 1], [1, 4], [c[1], c[0]], [8, 1], [1, 8]].filter(x => x[0] * c[1] !== x[1] * c[0])),
            level: 1,
            expl: raw`Replace $m_e$ by the reduced mass $\mu = m_e m_e/(m_e + m_e) = m_e/2$ (for hydrogen $\mu \approx m_e$). Since $${why}$, the ratio is $${F.frac(c[0], c[1])}$.`,
          };
        }
        if (v === 'isotope') {
          const lines = [[raw`H$\alpha$ (Balmer-$\alpha$)`, 656.3], [raw`H$\beta$ (Balmer-$\beta$)`, 486.1], [raw`Lyman-$\alpha$`, 121.6]];
          const [nm, lam] = R.pick(lines);
          const muH = 1836 / 1837, muD = 3670 / 3671;
          const d = lam * (1 - muH / muD);
          const fm = x => (x >= 0.1 ? F.num(x, 2) : F.num(x, 1));
          const mk = (x, dir) => `$${fm(x)}\\,\\text{nm}$ ${dir}`;
          const c = mk(d, 'shorter');
          const wr = [mk(d, 'longer'), mk(2 * d, 'shorter'), mk(2 * d, 'longer'), mk(d / 2, 'shorter'), mk(10 * d, 'shorter')];
          return {
            q: `The ${nm} line of hydrogen has wavelength $${F.num(lam, 4)}\\,\\text{nm}$. Taking $m_p \\approx 1836\\,m_e$ and $m_d \\approx 2m_p$ for the deuteron, how does the corresponding line of deuterium compare?`,
            ...GRE.mc(R, c, wr),
            level: 3,
            expl: raw`Wavelengths scale as $1/\mu$ with $\mu = m_eM/(m_e + M) \approx m_e(1 - m_e/M)$. The deuteron is heavier, so $\mu$ is larger and the line is shorter by $\Delta\lambda/\lambda \approx m_e/m_p - m_e/m_d = m_e/(2m_p) \approx 2.7\times10^{-4}$, i.e. $\Delta\lambda \approx ${fm(d)}\,\text{nm}$.`,
          };
        }
        const SYS = [
          { name: raw`muonic hydrogen (a negative muon bound to a proton; take $m_\mu \approx 207\,m_e$ and $m_p \approx 1836\,m_e$)`, mu: 207 * 1836 / (207 + 1836), bare: 207, tol: 0.07, why: raw`\mu = \frac{207\times1836}{207+1836}\,m_e \approx 186\,m_e` },
          { name: raw`protonium (a proton bound to an antiproton; take $m_p \approx 1836\,m_e$)`, mu: 918, bare: 1836, tol: 0.1, why: raw`\mu = m_p/2 \approx 918\,m_e` },
          { name: 'positronium (an electron bound to a positron)', mu: 0.5, bare: 1, tol: 0.1, why: raw`\mu = m_e/2` },
        ];
        const k = R.pick([2, 3, 4, 5, 10, 20, 50, 100]);
        SYS.push({ name: `a hypothetical atom in which a particle with the electron’s charge but ${k} times its mass is bound to a very heavy nucleus of charge $+e$`, mu: k, bare: k, tol: 0.1, why: raw`\mu \approx ${k}\,m_e` });
        const s = R.weighted(SYS, [3, 1, 2, 2]);
        const ask = R.pick(['E', 'a', 'lam']);
        const mus = [s.mu, s.bare, 1 / s.mu, s.mu * s.mu, 2 * s.mu, Math.sqrt(s.mu), 1];
        if (ask === 'E') {
          const n = R.weighted([1, 2, 3], [3, 1, 1]);
          const E = RY * s.mu / (n * n);
          const kev = E >= 1000, f = kev ? 1e-3 : 1, u = kev ? raw`\text{keV}` : raw`\text{eV}`;
          return {
            q: `Consider ${s.name}. Treating it as a hydrogen-like system, what is the minimum energy needed to dissociate it ${n === 1 ? 'from its ground state' : `when it is in its $n = ${n}$ level`}?`,
            ...GRE.numeric(R, E * f, mus.slice(1).map(m => RY * m * f / (n * n)), { unit: u, sig: 2, tol: s.tol }),
            expl: raw`Energies scale with the reduced mass: $|E_n| = (13.6\,\text{eV})(\mu/m_e)/n^2$ with $${s.why}$, giving $${F.num(E * f, 2)}\,${u}$. Using the bare mass instead of the reduced mass is the trap.`,
          };
        }
        if (ask === 'a') {
          const n = R.weighted([1, 2, 3], [3, 1, 1]);
          const a = C.a0 * n * n / s.mu;
          return {
            q: `Consider ${s.name}. Treating it as a hydrogen-like system, what is the separation of the two particles in the Bohr orbit with ${n === 1 ? 'the lowest energy' : `$n = ${n}$`}? ($a_0 = 5.29\\times10^{-11}\\,\\text{m}$.)`,
            ...GRE.numeric(R, a, mus.slice(1).map(m => C.a0 * n * n / m), { unit: raw`\text{m}`, sig: 2, tol: s.tol }),
            expl: raw`The Bohr radius is $a = 4\pi\epsilon_0\hbar^2/(\mu e^2) = a_0\,m_e/\mu$ with $${s.why}$, and orbits scale as $n^2$: $r = ${n * n}\,a_0 m_e/\mu = ${F.num(a, 2)}\,\text{m}$.`,
          };
        }
        const [ni, nf] = R.pick([[2, 1], [2, 1], [3, 1], [3, 2], [4, 2]]);
        const lam = HC / (Dn(ni, nf) * RY * s.mu);
        const lamH = HC / (Dn(ni, nf) * RY);
        const U = lamU(lam);
        return {
          q: `Consider ${s.name}. Treating it as a hydrogen-like system, what is the wavelength of the photon emitted in its $n = ${ni} \\to n = ${nf}$ transition? (For hydrogen this line is at $${F.num(lamH, 3)}\\,\\text{nm}$.)`,
          ...GRE.numeric(R, lam * U.f, mus.slice(1).map(m => HC / (Dn(ni, nf) * RY * m) * U.f), { unit: U.u, sig: 2, tol: s.tol }),
          expl: raw`Transition energies scale as $\mu$, so wavelengths scale as $1/\mu$: $\lambda = (${F.num(lamH, 3)}\,\text{nm})\,m_e/\mu$ with $${s.why}$, giving $${F.num(lam * U.f, 2)}\,${U.u}$.`,
        };
      },
    },
    {
      id: 'atomic.bohr.series', sec: '5.7.1', level: 1, weight: 2,
      gen(R) {
        const v = R.weighted(['name', 'region', 'limit', 'ratio'], [2, 1, 3, 3]);
        if (v === 'name') {
          const nf = R.int(1, 5), ni = nf + R.int(1, 4);
          const absorb = R.bool(0.3);
          const val = new Map(); const mk = i => { const t = `the ${SERIES[i]} series`; val.set(t, i); return t; };
          return {
            q: absorb ? `A hydrogen atom absorbs a photon and its electron goes from $n = ${nf}$ to $n = ${ni}$. The absorbed wavelength belongs to which spectral series?`
              : `A hydrogen atom emits a photon as its electron drops from $n = ${ni}$ to $n = ${nf}$. To which spectral series does this line belong?`,
            ...GRE.mc(R, mk(nf), [1, 2, 3, 4, 5].filter(i => i !== nf).map(mk), { rank: t => val.get(t) }),
            expl: `The series is labeled by the lower level: Lyman ($n = 1$), Balmer ($n = 2$), Paschen ($n = 3$), Brackett ($n = 4$), Pfund ($n = 5$). Here the lower level is $n = ${nf}$.`,
          };
        }
        if (v === 'region') {
          const opts = [[1, 2], [1, 3], [1, 4], [1, 5], [2, 3], [2, 4], [2, 5], [2, 6], [3, 4], [3, 5], [3, 6], [4, 5], [4, 6]];
          const [nf, ni] = R.pick(opts);
          const lam = HC / (RY * Dn(ni, nf));
          const reg = lam < 350 ? 'ultraviolet' : lam <= 700 ? 'visible' : 'infrared';
          return {
            q: `In which region of the electromagnetic spectrum is the photon emitted when a hydrogen atom’s electron drops from $n = ${ni}$ to $n = ${nf}$?`,
            ...GRE.mc(R, reg, ['ultraviolet', 'visible', 'infrared', 'X-ray', 'microwave'].filter(x => x !== reg)),
            expl: raw`$E = 13.6\,\text{eV}\,(1/${nf}^2 - 1/${ni}^2) = ${F.num(RY * Dn(ni, nf), 3)}\,\text{eV}$, so $\lambda = 1240/E \approx ${F.num(lam, 3)}\,\text{nm}$ (${reg}). Lyman lines are ultraviolet, the first Balmer lines visible, and Paschen and higher series infrared.`,
          };
        }
        if (v === 'limit') {
          const ion = pickIon(R, [6, 2, 1, 0, 0, 0]), Z = ion.Z;
          const nf = R.int(1, 4);
          const shortest = R.bool(0.55);
          const lim = HC * nf * nf / (RY * Z * Z), first = HC / (RY * Z * Z * Dn(nf + 1, nf));
          const ans = shortest ? lim : first;
          const U = lamU(ans);
          const wr = [shortest ? first : lim, HC * nf / (RY * Z * Z), shortest ? lim * Z * Z : first * Z * Z, shortest ? lim * Z : first * Z, HC / (RY * Z * Z * (1 / nf - 1 / (nf + 1)))];
          const who = Z === 1 ? 'hydrogen' : `$${ion.tex}$ ($Z = ${Z}$)`;
          return {
            q: `What is the ${shortest ? 'shortest' : 'longest'} wavelength in the series of ${who} lines that end on the $n = ${nf}$ level${Z === 1 ? ` (the ${SERIES[nf]} series)` : ''}?`,
            ...GRE.numeric(R, ans * U.f, wr.map(x => x * U.f), { unit: U.u, sig: 3, tol: 0.1 }),
            expl: shortest
              ? raw`The shortest wavelength (series limit) comes from $n = \infty \to ${nf}$: $E = 13.6\times ${Z * Z}/${nf * nf}\,\text{eV}$, so $\lambda = 1240/E = ${F.num(ans * U.f, 3)}\,${U.u}$.`
              : raw`The longest wavelength is the first line, $n = ${nf + 1} \to ${nf}$: $E = 13.6\times ${Z * Z}\,(1/${nf * nf} - 1/${(nf + 1) * (nf + 1)})\,\text{eV}$, so $\lambda = ${F.num(ans * U.f, 3)}\,${U.u}$.`,
          };
        }
        // ratio of two named lines
        const line = () => { const nf = R.weighted([1, 2, 3], [3, 3, 1]), k = R.int(1, 3); return [nf, nf + k, k]; };
        const L1 = line(); let L2 = line();
        while (L1[0] === L2[0] && L1[1] === L2[1]) L2 = line();
        const Dr = (u, l) => [u * u - l * l, u * u * l * l];
        const Dl = (u, l) => [u - l, u * l];
        const [a1, b1] = Dr(L1[1], L1[0]), [a2, b2] = Dr(L2[1], L2[0]);
        const corr = rat(a2 * b1, b2 * a1);
        if (corr[0] > 300 || corr[1] > 300) throw new Error('ugly ratio');
        const [c1, d1] = Dl(L1[1], L1[0]), [c2, d2] = Dl(L2[1], L2[0]);
        const Ds = (u, l) => [u * u + l * l, u * u * l * l];
        const [e1, f1] = Ds(L1[1], L1[0]), [e2, f2] = Ds(L2[1], L2[0]);
        const nm = L => `${SERIES[L[0]]}-$${GREEK[L[2]]}$ ($n = ${L[1]} \\to ${L[0]}$)`;
        return {
          q: `For hydrogen, what is the ratio $\\lambda_1/\\lambda_2$ of the wavelength of the ${nm(L1)} line to that of the ${nm(L2)} line?`,
          ...ratChoices(R, corr, [[a1 * b2, b1 * a2], [c2 * d1, d2 * c1], [L1[0] * L1[0], L2[0] * L2[0]], [L1[1] * L1[1], L2[1] * L2[1]], [corr[0] * corr[0], corr[1] * corr[1]], [e2 * f1, f2 * e1], [c1 * d2, d1 * c2], [corr[1] * corr[1], corr[0] * corr[0]]]),
          level: 2,
          expl: raw`$1/\lambda \propto 1/n_f^2 - 1/n_i^2$, so $\lambda_1/\lambda_2 = \dfrac{1/${L2[0]}^2 - 1/${L2[1]}^2}{1/${L1[0]}^2 - 1/${L1[1]}^2} = \dfrac{${F.frac(a2, b2)}}{${F.frac(a1, b1)}} = ${F.frac(corr[0], corr[1])}$. Inverting the ratio is the usual slip: larger energy means shorter wavelength.`,
        };
      },
    },
    {
      id: 'atomic.bohr.coincide', sec: '5.7.1', level: 2,
      gen(R) {
        const Z = R.weighted([2, 3, 4], [5, 2, 1]), ion = IONS[Z - 1];
        const b = R.int(1, Math.min(4, Math.floor(20 / Z) - 1)), a = R.int(b + 1, Math.min(b + 4, Math.floor(20 / Z)));
        const eH = (u, l) => Dn(u, l);
        const eI = (u, l) => Z * Z * Dn(u, l);
        const fmt = ([u, l]) => `$n = ${u} \\to n = ${l}$`;
        const ok = ([u, l]) => l >= 1 && u > l;
        if (R.bool(0.6)) {
          const target = eH(a, b);
          const cands = [[a, b], [Z * a, b], [a + Z, b + Z], [Z * Z * a, Z * Z * b], [Z * a + 1, Z * b], [Z * a, Z * b + 1], [2 * Z * a, 2 * Z * b], [Z * a, Z * b - 1], [a + 1, b], [Z * a - 1, Z * b], [a, Z * b]]
            .filter(x => ok(x) && Math.abs(eI(x[0], x[1]) - target) > 1e-9);
          return {
            q: `In hydrogen, the transition from $n = ${a}$ to $n = ${b}$ emits light of wavelength $\\lambda$. According to the Bohr model, which transition in ${ionPh(ion)} emits light of the same wavelength?`,
            ...GRE.mc(R, fmt([Z * a, Z * b]), cands.map(fmt)),
            expl: raw`Hydrogen-like levels are $E_n = -(13.6\,\text{eV})Z^2/n^2$, so the ion's level $n = Zm$ has exactly the energy of hydrogen's level $m$. Hence $${Z * a} \to ${Z * b}$ in the ion matches $${a} \to ${b}$ in hydrogen: $${Z * Z}(1/${Z * b}^2 - 1/${Z * a}^2) = 1/${b}^2 - 1/${a}^2$.`,
          };
        }
        const u = Z * a, l = Z * b;
        const target = eI(u, l);
        const cands = [[u, l], [a + 1, b], [a, b + 1], [Z * a, b], [a + Z, b], [2 * a, 2 * b], [a * a, b * b], [a + 2, b], [a - 1, b], [a, b - 1], [u, b]]
          .filter(x => ok(x) && Math.abs(eH(x[0], x[1]) - target) > 1e-9);
        return {
          q: `According to the Bohr model, the $n = ${u} \\to n = ${l}$ line of ${ionPh(ion)} has the same wavelength as which transition in hydrogen?`,
          ...GRE.mc(R, fmt([a, b]), cands.map(fmt)),
          expl: raw`With $E_n \propto Z^2/n^2$, the ion's levels $n = ${u}$ and $n = ${l}$ have $Z^2/n^2 = 1/${a}^2$ and $1/${b}^2$, the same as hydrogen's $n = ${a}$ and $n = ${b}$. So the matching hydrogen line is $${a} \to ${b}$.`,
        };
      },
    },
    {
      id: 'atomic.bohr.excite', sec: '5.7.1', level: 2,
      gen(R) {
        const Z = R.weighted([1, 2], [3, 1]), s = RY * Z * Z;
        const lines = [2, 3, 4, 5].map(n => s * (1 - 1 / (n * n)));
        const types = R.pickN(['res', 'off', 'ion', 'eHi', 'eLo'], 3);
        const st = types.map(t => {
          if (t === 'res') { const n = R.int(2, 5); const E = F.fix(lines[n - 2], 2); return [[`Absorption of a single photon of energy $${E}\\,\\text{eV}$`, `this matches the $1 \\to ${n}$ transition`], true]; }
          if (t === 'off') { const x = R.bool(0.6) ? R.real(0.3, 0.72, 2) : R.real(0.78, 0.86, 2); const E = F.fix(x * s, 1); return [[`Absorption of a single photon of energy $${E}\\,\\text{eV}$`, `a photon must supply exactly the energy of a transition (or at least ${F.fix(s, 1)} eV to ionize), and ${E} eV matches neither`], false]; }
          if (t === 'ion') { const E = F.fix(s * R.pick([1.1, 1.2, 1.3, 1.5, 2]), 1); return [[`Absorption of a single photon of energy $${E}\\,\\text{eV}$`, `any photon above the ${F.fix(s, 1)} eV ionization energy can be absorbed, ionizing the atom`], true]; }
          if (t === 'eHi') { const E = F.fix(s * R.real(0.77, 0.95, 2), 1); return [[`Excitation by an inelastic collision with an electron of kinetic energy $${E}\\,\\text{eV}$`, `a colliding electron can give up just part of its energy, so anything above ${F.fix(lines[0], 1)} eV can excite the $n = 2$ level`], true]; }
          const E = F.fix(s * R.real(0.3, 0.7, 2), 1);
          return [[`Excitation by an inelastic collision with an electron of kinetic energy $${E}\\,\\text{eV}$`, `the electron has less than the ${F.fix(lines[0], 1)} eV needed to reach $n = 2$`], false];
        });
        const who = Z === 1 ? 'A hydrogen atom' : raw`A $\text{He}^{+}$ ion`;
        return {
          ...romanQ(R, `${who} is in its ground state. Which of the following processes can raise it out of the ground state (to an excited level or by ionizing it)?`, st),
          expl: `The levels are $E_n = -${F.fix(s, 1)}/n^2$ eV, so excitation energies from $n = 1$ are ${lines.map(x => F.fix(x, 2)).join(', ')}, … eV. ` + romanExpl(st),
        };
      },
    },
    {
      id: 'atomic.bohr.lines', sec: '5.7.1', level: 2,
      gen(R) {
        const v = R.weighted(['all', 'series', 'electron', 'photon'], [3, 2, 3, 2]);
        const E1 = n => RY * (1 - 1 / (n * n));
        if (v === 'all') {
          const N = R.int(3, 8), ans = N * (N - 1) / 2;
          const how = R.pick([`excited to the $n = ${N}$ level`, `prepared in the $n = ${N}$ level by a laser`, `raised to the $n = ${N}$ state in an electric discharge`]);
          return {
            q: `A large number of hydrogen atoms are ${how}. As they return to the ground state by all possible routes, how many different wavelengths can appear in the emission spectrum?`,
            ...intChoices(R, ans, [N - 1, N, N * (N - 1), N * N, (N - 1) * (N - 1), N * (N + 1) / 2], { min: 1 }),
            level: 1,
            expl: raw`Any pair of the levels $1, 2, \dots, ${N}$ can be connected by a downward jump, giving $\binom{${N}}{2} = ${N}\cdot${N - 1}/2 = ${ans}$ distinct lines. ($N - 1 = ${N - 1}$ counts only the lines that end on the ground state.)`,
          };
        }
        if (v === 'series') {
          const N = R.int(4, 8), nf = R.weighted([1, 2, 3], [2, 3, 2]), ans = N - nf;
          return {
            q: `Hydrogen atoms are excited to the $n = ${N}$ level and then decay by all possible routes. How many of the emitted lines belong to the ${SERIES[nf]} series?`,
            ...intChoices(R, ans, [ans + 1, ans - 1, N * (N - 1) / 2, N - 1, N], { min: 1 }),
            expl: raw`${SERIES[nf]} lines end on $n = ${nf}$; they can start from any of $n = ${nf + 1}, \dots, ${N}$, giving $${N} - ${nf} = ${ans}$ lines.`,
          };
        }
        if (v === 'electron') {
          const N = R.int(2, 5);
          const lo = E1(N), hi = E1(N + 1);
          const grid = [];
          for (let x = Math.ceil((lo + 0.04) * 10) / 10; x < hi - 0.04; x += 0.1) grid.push(+x.toFixed(1));
          if (!grid.length) throw new Error('no grid');
          const K = R.pick(grid), ans = N * (N - 1) / 2;
          return {
            q: `A gas of ground-state hydrogen atoms is bombarded with electrons of kinetic energy $${F.fix(K, 1)}\\,\\text{eV}$. How many different wavelengths of light can the gas subsequently emit?`,
            ...intChoices(R, ans, [N - 1, N, (N + 1) * N / 2, 1, 0, N * (N - 1)], { min: 0 }),
            level: 3,
            expl: raw`A colliding electron can transfer any part of its energy, so the atom can reach every level with $13.6(1 - 1/n^2) \le ${F.fix(K, 1)}\,\text{eV}$, i.e. up to $n = ${N}$ ($${F.fix(lo, 2)}\,\text{eV}$; $n = ${N + 1}$ needs $${F.fix(hi, 2)}\,\text{eV}$). The cascades from $n \le ${N}$ give $${N}(${N} - 1)/2 = ${ans}$ lines.`,
          };
        }
        const N = R.int(3, 6), ans = N * (N - 1) / 2;
        return {
          q: `Ground-state hydrogen atoms are illuminated with monochromatic ultraviolet light of photon energy $${F.fix(E1(N), 2)}\\,\\text{eV}$. How many different wavelengths can the atoms then emit?`,
          ...intChoices(R, ans, [N - 1, 1, N, N * (N - 1), N * N], { min: 1 }),
          expl: raw`$${F.fix(E1(N), 2)}\,\text{eV} = 13.6(1 - 1/${N}^2)\,\text{eV}$ is exactly the $1 \to ${N}$ excitation, so atoms reach $n = ${N}$ and can cascade through every lower level: $${N}(${N} - 1)/2 = ${ans}$ lines (including re-emission at the absorbed wavelength).`,
        };
      },
    },
    {
      id: 'atomic.bohr.model', sec: '5.7.1', level: 1,
      gen(R) {
        const T = [
          ['The electron’s orbital angular momentum is restricted to integer multiples of $\\hbar$.', 'this is Bohr’s quantization postulate $L = n\\hbar$'],
          ['An electron in an allowed orbit does not radiate, even though it is accelerating.', 'Bohr simply postulated stationary orbits to explain the stability of the atom'],
          ['Light is emitted only when the electron jumps between allowed orbits, with photon energy equal to the difference of the orbit energies.', 'this is Bohr’s frequency condition $h f = E_i - E_f$'],
          ['The model reproduces the Rydberg formula for the wavelengths of the hydrogen lines.', 'the levels $-13.6\\,\\text{eV}/n^2$ give exactly the Rydberg formula'],
          ['The radii of the allowed orbits grow as $n^2$.', '$r_n = n^2 a_0$'],
          ['The circumference of an allowed orbit equals an integer number of electron de Broglie wavelengths.', '$2\\pi r = n\\lambda$ is equivalent to $L = n\\hbar$'],
          ['The predicted ionization energy of ground-state hydrogen is $13.6\\,\\text{eV}$.', 'this agrees with experiment'],
        ];
        const Fs = [
          ['The electron radiates continuously and slowly spirals into the nucleus.', 'that is the classical prediction the model was designed to avoid'],
          ['The allowed energies are proportional to $n^2$.', 'they are proportional to $-1/n^2$'],
          ['The radii of the allowed orbits grow linearly with $n$.', 'they grow as $n^2$'],
          ['It correctly predicts the fine-structure splitting of the hydrogen lines.', 'fine structure needs relativity and spin'],
          ['It accurately predicts the energy levels of neutral helium.', 'it only works for one-electron systems'],
          ['The orbital angular momentum in the ground state is zero.', 'the Bohr ground state has $L = \\hbar$'],
          ['The speed of the electron increases with $n$.', '$v \\propto 1/n$'],
          ['It explains why some spectral lines are much more intense than others.', 'transition rates require full quantum mechanics'],
          ['The electron’s angular momentum is quantized in half-integer multiples of $\\hbar$.', 'Bohr used integer multiples'],
        ];
        const v = R.weighted(['true', 'not', 'roman'], [2, 2, 3]);
        if (v === 'roman') {
          const st = romanSet(R, T, Fs);
          return { ...romanQ(R, 'Which of the following statements about the Bohr model of the hydrogen atom is (are) correct?', st), level: 2, expl: romanExpl(st) };
        }
        if (v === 'true') {
          const c = R.pick(T);
          return { q: 'Which of the following is a feature of the Bohr model of the hydrogen atom?', ...GRE.mc(R, c[0], Fs.map(x => x[0])), expl: `Correct: ${c[1]}. The other statements are false (for example, the energies go as $-1/n^2$, radii as $n^2$, and the model fails for multi-electron atoms and fine structure).` };
        }
        const c = R.pick(Fs);
        return { q: 'Which of the following statements about the Bohr model of the hydrogen atom is NOT correct?', ...GRE.mc(R, c[0], T.map(x => x[0])), expl: `The false statement: ${c[1]}. The others are genuine features of the Bohr model.` };
      },
    },
    {
      id: 'atomic.bohr.angmom', sec: '5.7.1', level: 2,
      gen(R) {
        const v = R.weighted(['L', 'lam', 'count', 'energy'], [3, 3, 1, 2]);
        const ion = pickIon(R, [5, 3, 2, 1, 0, 0]), Z = ion.Z;
        const n = R.int(1, 7);
        const hb = x => { const e = F.exact(x); return e === '1' ? raw`\hbar` : e + raw`\,\hbar`; };
        if (v === 'L') {
          const val = new Map(); const mk = (x, s) => { const t = `$${s || hb(x)}$`; if (!val.has(t)) val.set(t, x); return t; };
          const wr = [n * n, n * n / Z, Z * n, Math.sqrt(n * (n + 1)), n + 1, n - 1, Math.sqrt(n * (n - 1)), n / 2].filter(x => x > 0 && F.exact(x) != null).map(x => mk(x));
          wr.push(mk(2 * Math.PI * n, n === 1 ? 'h' : `${n}h`));
          return {
            q: `According to the Bohr model, the electron of ${ionPh(ion)} moves on a circular orbit of radius $${F.frac(n * n, Z)}\\,a_0$, where $a_0$ is the Bohr radius. What is the magnitude of its orbital angular momentum?`,
            ...GRE.mc(R, mk(n), wr.filter(t => Math.abs(val.get(t) - n) > 1e-9), { rank: t => val.get(t) }),
            expl: raw`Bohr orbits have $r_n = n^2a_0/Z$; with $Z = ${Z}$ the given radius is $n = ${n}$, and Bohr's postulate gives $L = n\hbar = ${hb(n)}$. (The quantum-mechanical $\sqrt{l(l+1)}\,\hbar$ refers to a different quantum number.)`,
          };
        }
        if (v === 'lam') {
          const lam = 2 * Math.PI * n * A0NM / Z;
          const pm = lam < 0.1, f = pm ? 1000 : 1, u = pm ? raw`\text{pm}` : raw`\text{nm}`;
          return {
            q: `In the Bohr model, what is the de Broglie wavelength of the electron in ${ionPh(ion)} when the electron is in the $n = ${n}$ orbit? ($a_0 = 0.0529\\,\\text{nm}$.)`,
            ...GRE.numeric(R, lam * f, [2 * Math.PI * n * n * A0NM / Z * f, n * A0NM / Z * f, 2 * Math.PI * n * A0NM / (Z * Z) * f, 2 * Math.PI * A0NM / (n * Z) * f, Math.PI * n * A0NM / Z * f], { unit: u, sig: 2 }),
            expl: raw`$n$ wavelengths fit around the orbit: $n\lambda = 2\pi r_n = 2\pi n^2a_0/Z$, so $\lambda = 2\pi n a_0/Z = ${F.num(lam * f, 2)}\,${u}$. Taking the whole circumference is the trap.`,
          };
        }
        if (v === 'count') {
          const m = R.int(2, 6);
          return {
            q: `In the Bohr model of hydrogen, the electron moves on an orbit of radius $${m * m}\\,a_0$. How many de Broglie wavelengths of the electron fit around the circumference of this orbit?`,
            ...intChoices(R, m, [m * m, 2 * m, m - 1, m + 1, 2 * m * m], { min: 1 }),
            level: 1,
            expl: raw`$r_n = n^2a_0$ gives $n = ${m}$, and Bohr's condition $L = n\hbar$ is equivalent to $2\pi r = n\lambda$: exactly $${m}$ wavelengths.`,
          };
        }
        const E = -RY * Z * Z / (n * n);
        return {
          q: `In the Bohr model, the electron of ${ionPh(ion)} has orbital angular momentum $${hb(n)}$. What is the energy of the atom (zero when the electron is at rest far away)?`,
          ...GRE.numeric(R, E, [-RY * Z * Z / n, -RY * Z / (n * n), -RY / (n * n), -RY * Z * Z / ((n + 1) * (n + 1)), -RY * Z * Z * n * n], { unit: raw`\text{eV}`, sig: 3, tol: 0.08 }),
          expl: raw`$L = n\hbar$ gives $n = ${n}$, so $E = -(13.6\,\text{eV})Z^2/n^2 = ${F.num(E, 3)}\,\text{eV}$.`,
        };
      },
    },
    {
      id: 'atomic.bohr.franck', sec: '5.7.1', level: 2,
      gen(R) {
        const v = R.weighted(['lam', 'dV', 'concept'], [3, 2, 1]);
        if (v === 'lam') {
          const hg = R.bool(0.25);
          const dV = hg ? 4.9 : R.step(1.6, 10.5, 0.1);
          const lam = HC / dV;
          return {
            q: `In a Franck–Hertz experiment with ${hg ? 'mercury vapor' : 'a monatomic gas'}, the collector current drops sharply each time the accelerating voltage increases by $${F.fix(dV, 1)}\\,\\text{V}$. What is the wavelength of the light emitted by the excited gas atoms?`,
            ...GRE.numeric(R, lam, [lam / 2, 2 * lam, lam / (2 * Math.PI), lam * 2 * Math.PI, lam / 4], { unit: raw`\text{nm}`, sig: 3 }),
            expl: raw`The dips occur each time the electrons gain the first excitation energy $E = e\Delta V = ${F.fix(dV, 1)}\,\text{eV}$, which the atoms re-emit: $\lambda = hc/E = 1240/${F.fix(dV, 1)}\,\text{nm} = ${F.num(lam, 3)}\,\text{nm}$.`,
          };
        }
        if (v === 'dV') {
          const lam = R.step(120, 700, 5);
          const dV = HC / lam;
          return {
            q: `The first excited level of the atoms in a gas lies above the ground state by the energy of a photon of wavelength $${lam}\\,\\text{nm}$. In a Franck–Hertz experiment with this gas, what is the spacing between successive drops in the collector current, in accelerating voltage?`,
            ...GRE.numeric(R, dV, [dV / 2, 2 * dV, dV * 2 * Math.PI, dV / (2 * Math.PI), dV * 4], { unit: raw`\text{V}`, sig: 2 }),
            expl: raw`Each drop corresponds to electrons acquiring one more excitation energy $E = hc/\lambda = 1240/${lam}\,\text{eV} = ${F.num(dV, 2)}\,\text{eV}$, so the spacing is $${F.num(dV, 2)}\,\text{V}$.`,
          };
        }
        if (R.bool()) {
          return {
            q: 'The Franck–Hertz experiment provided direct evidence for which of the following?',
            ...GRE.mc(R, 'Discrete (quantized) energy levels in atoms', ['The wave nature of the electron', 'The quantization of electric charge', 'The existence of electron spin', 'The momentum carried by photons', 'The small size of the atomic nucleus']),
            level: 1,
            expl: 'Electrons lose energy to the atoms only in fixed amounts (e.g. 4.9 eV in mercury), showing that atomic energies are quantized. Electron waves: Davisson–Germer; charge: Millikan; spin: Stern–Gerlach; photon momentum: Compton; nucleus: Rutherford.',
          };
        }
        return {
          q: 'In a Franck–Hertz experiment, why does the collector current drop sharply at certain accelerating voltages?',
          ...GRE.mc(R, 'Electrons that reach the atomic excitation energy collide inelastically and lose that energy, so they can no longer overcome the small retarding potential', ['The electrons are diffracted by the regularly spaced gas atoms', 'The gas atoms are ionized and capture the electrons', 'The electrons emit photons whenever their kinetic energy reaches the excitation energy', 'Elastic collisions reverse the direction of the electrons', 'The electron spin flips in the field of the atoms']),
          expl: 'Below the excitation energy collisions are elastic and electrons keep their energy; once they can excite the atoms they lose it in inelastic collisions and fail to reach the collector, producing a dip.',
        };
      },
    },
  ]);

  // =================================================================== 5.7.2 Perturbations to hydrogenic atoms
  const FS_FORM = raw`$E_{nj} = -\dfrac{(13.6\,\text{eV})Z^2}{n^2}\left[1 + \dfrac{(Z\alpha)^2}{n^2}\left(\dfrac{n}{j + \frac{1}{2}} - \dfrac{3}{4}\right)\right]$`;
  GRE.addTemplates('atomic', [
    {
      id: 'atomic.pert.scales', sec: '5.7.2', level: 2,
      gen(R) {
        if (R.bool(0.55)) {
          const Q = [
            ['Relative to the gross (Bohr) energies of hydrogen, the fine-structure corrections are smaller by a factor of order', raw`\alpha^2`, [raw`\alpha`, raw`\alpha^3`, raw`\alpha^4`, raw`m_e/m_p`, raw`\alpha\,m_e/m_p`, raw`1/\alpha`],
              raw`The electron moves at $v \approx \alpha c$, so relativistic corrections are of relative size $(v/c)^2 \approx \alpha^2$; the spin–orbit energy is of the same order.`],
            ['The Lamb shift in hydrogen is smaller than the fine-structure splitting by roughly a factor of order', raw`\alpha`, [raw`\alpha^2`, raw`m_e/m_p`, raw`\alpha^2 m_e/m_p`, raw`1/\alpha`, raw`(m_e/m_p)^2`],
              raw`The Lamb shift is a quantum-electrodynamic radiative correction, one more power of $\alpha$ than fine structure (up to logarithms).`],
            ['Hyperfine splittings in hydrogen are smaller than fine-structure splittings by roughly a factor of order', raw`m_e/m_p`, [raw`\alpha`, raw`\alpha^2`, raw`(m_e/m_p)^2`, raw`m_p/m_e`, raw`\alpha\,m_e/m_p`],
              raw`Hyperfine structure involves the proton's magnetic moment, which is smaller than the electron's by roughly $m_e/m_p$ (magnetic moments scale as $e\hbar/2m$).`],
            [raw`In terms of the electron rest energy $m_ec^2$ and the fine-structure constant $\alpha$, the ionization energy of ground-state hydrogen is`, raw`\tfrac{1}{2}\alpha^2 m_ec^2`, [raw`\tfrac{1}{2}\alpha m_ec^2`, raw`\alpha^4 m_ec^2`, raw`\tfrac{1}{2}\alpha^3 m_ec^2`, raw`m_ec^2/\alpha^2`, raw`\tfrac{1}{4}\alpha^2 m_ec^2`],
              raw`$\tfrac12\alpha^2 m_ec^2 = \tfrac12(1/137)^2(511\,\text{keV}) = 13.6\,\text{eV}$; equivalently $\tfrac12 m_e v^2$ with $v = \alpha c$.`],
            [raw`In terms of the electron rest energy $m_ec^2$, fine-structure energy shifts in hydrogen are of order`, raw`\alpha^4 m_ec^2`, [raw`\alpha^2 m_ec^2`, raw`\alpha^3 m_ec^2`, raw`\alpha\,m_ec^2`, raw`\alpha^6 m_ec^2`, raw`\alpha^4 (m_e/m_p)\,m_ec^2`],
              raw`Gross energies are $\sim\alpha^2 m_ec^2$ and fine structure is a further $\alpha^2$ smaller: $\sim\alpha^4 m_ec^2 \approx 10^{-4}\,\text{eV}$.`],
            [raw`In terms of the electron rest energy $m_ec^2$, the hyperfine splitting of the hydrogen ground state is of order`, raw`\alpha^4 (m_e/m_p)\,m_ec^2`, [raw`\alpha^4 m_ec^2`, raw`\alpha^2 (m_e/m_p)\,m_ec^2`, raw`\alpha^4 (m_p/m_e)\,m_ec^2`, raw`\alpha^2 m_ec^2`, raw`\alpha^4 (m_e/m_p)^2 m_ec^2`],
              raw`Hyperfine structure is fine-structure sized ($\alpha^4 m_ec^2$) times $m_e/m_p$ from the small nuclear magnetic moment (about $6\times10^{-6}\,\text{eV}$ for the 21-cm line).`],
            ['In the Bohr model, the speed of the electron in the ground state of hydrogen is', raw`\alpha c`, [raw`\alpha^2 c`, raw`c/\alpha`, raw`\sqrt{\alpha}\,c`, raw`\tfrac{1}{2}\alpha c`, raw`2\alpha c`],
              raw`$v_1 = e^2/(4\pi\epsilon_0\hbar) = \alpha c \approx c/137$.`],
            [raw`For a hydrogen-like ion of nuclear charge $Z$, the fine-structure splittings relative to the gross level spacings are of order`, raw`(Z\alpha)^2`, [raw`Z\alpha^2`, raw`Z^2\alpha`, raw`\alpha^2/Z^2`, raw`(Z\alpha)^4`, raw`\alpha^2/Z`],
              raw`The electron speed is $v \approx Z\alpha c$, so relativistic corrections are of relative size $(Z\alpha)^2$; fine structure grows like $Z^4$ while gross energies grow like $Z^2$.`],
          ];
          const [stem, c, ws, why] = R.pick(Q);
          return { q: stem + '', ...GRE.mc(R, `$${c}$`, ws.map(w => `$${w}$`)), expl: why };
        }
        const SO = 'Spin–orbit coupling (fine structure)', LAMB = 'The Lamb shift (a quantum-electrodynamic effect)', HFS = 'The hyperfine interaction between the electron and nuclear magnetic moments',
          MU = 'The different reduced masses of the two atoms', ZEE = 'The Zeeman effect', STA = 'The Stark effect';
        const ORIGIN = [
          [raw`the splitting of the hydrogen $2p$ level into $2p_{1/2}$ and $2p_{3/2}$`, SO, 'The electron spin magnetic moment interacts with the magnetic field it sees in its rest frame because of its orbital motion.'],
          [raw`the small energy difference between the $2s_{1/2}$ and $2p_{1/2}$ levels of hydrogen`, LAMB, 'These levels have the same $n$ and $j$, so they are exactly degenerate in the Dirac (fine-structure) theory; QED radiative corrections split them.'],
          ['the 21-cm radio line of atomic hydrogen', HFS, 'It is the transition between the $F = 1$ and $F = 0$ hyperfine levels of the $1s$ ground state (electron spin flip relative to the proton spin).'],
          [raw`the doublet structure of the sodium D line ($589.0\,\text{nm}$ and $589.6\,\text{nm}$)`, SO, raw`The upper $3p$ level is split into $3p_{1/2}$ and $3p_{3/2}$ by spin–orbit coupling.`],
          ['the slight difference between the wavelengths of corresponding spectral lines of hydrogen and deuterium', MU, raw`Energies scale with the reduced mass $\mu = m_eM/(m_e + M)$, which is slightly larger for deuterium (isotope shift).`],
          ['the splitting of a spectral line into several components when the atoms are placed in a uniform magnetic field', ZEE, 'An external magnetic field lifts the degeneracy in the magnetic quantum number.'],
          ['the splitting and shifting of the hydrogen $n = 2$ level when the atoms are placed in a uniform electric field', STA, raw`An external electric field mixes the degenerate $2s$ and $2p$ states, giving a shift linear in the field.`],
        ];
        const [what, c, why] = R.pick(ORIGIN);
        return { q: `Which effect is primarily responsible for ${what}?`, ...GRE.mc(R, c, [SO, LAMB, HFS, MU, ZEE, STA].filter(x => x !== c)), level: 1, expl: why };
      },
    },
    {
      id: 'atomic.pert.finescale', sec: '5.7.2', level: 3,
      gen(R) {
        const v = R.weighted(['Z', 'n', 'abs'], [3, 3, 2]);
        const pickNL = () => { const n = R.int(2, 4); return [n, R.int(1, n - 1)]; };
        const pair = (n, l) => raw`$${nlj(n, l, 2 * l - 1)}$ and $${nlj(n, l, 2 * l + 1)}$`;
        const split = raw`for fixed $n$ and $l$ the levels $j = l \pm \tfrac12$ differ by $\Delta E = \dfrac{(13.6\,\text{eV})Z^4\alpha^2}{n^3}\left(\dfrac{1}{l} - \dfrac{1}{l+1}\right) = \dfrac{(13.6\,\text{eV})Z^4\alpha^2}{n^3\,l(l+1)}$`;
        if (v === 'Z') {
          const [n, l] = pickNL();
          const ion = pickIon(R, [0, 4, 3, 2, 1, 1]), Z = ion.Z;
          const give = R.bool();
          return {
            q: `In hydrogen, the fine-structure splitting between the ${pair(n, l)} levels is $\\Delta E$. What is the splitting between the corresponding levels of ${ionPh(ion)}?` + (give ? ` (The fine-structure energies of a hydrogen-like ion are ${FS_FORM}.)` : ''),
            ...ratChoices(R, [Math.pow(Z, 4), 1], [[Z * Z, 1], [Z * Z * Z, 1], [Z, 1], [1, 1], [Math.pow(Z, 6), 1], [1, Z * Z]], { unit: raw`\Delta E` }),
            level: give ? 2 : 3,
            expl: raw`Fine-structure shifts are $(Z\alpha)^2$ times the gross energies, which already scale as $Z^2$, so the splitting scales as $Z^4$: the factor is $${Z}^4 = ${Math.pow(Z, 4)}$.`,
          };
        }
        if (v === 'n') {
          const [n1, l1] = pickNL();
          let [n2, l2] = pickNL();
          while (n1 === n2 && l1 === l2) [n2, l2] = pickNL();
          const k1 = Math.pow(n1, 3) * l1 * (l1 + 1), k2 = Math.pow(n2, 3) * l2 * (l2 + 1);
          return {
            q: `Including fine structure, the hydrogen energy levels are ${FS_FORM} with $Z = 1$. Let $\\Delta E_1$ be the splitting between the ${pair(n1, l1)} levels and $\\Delta E_2$ the splitting between the ${pair(n2, l2)} levels. What is $\\Delta E_2/\\Delta E_1$?`,
            ...ratChoices(R, [k1, k2], [[k2, k1], [n1 * n1 * l1 * (l1 + 1), n2 * n2 * l2 * (l2 + 1)], [Math.pow(n1, 3), Math.pow(n2, 3)], [Math.pow(n1, 4) * l1 * (l1 + 1), Math.pow(n2, 4) * l2 * (l2 + 1)], [Math.pow(n1, 3) * l1, Math.pow(n2, 3) * l2], [l1 * (l1 + 1), l2 * (l2 + 1)]]),
            expl: raw`From the formula, ${split}. So $\Delta E_2/\Delta E_1 = \dfrac{${n1}^3\cdot ${l1 * (l1 + 1)}}{${n2}^3\cdot ${l2 * (l2 + 1)}} = ${F.frac(k1, k2)}$.`,
          };
        }
        const ion = pickIon(R, [4, 3, 2, 0, 0, 0]), Z = ion.Z;
        const [n, l] = pickNL();
        const dE = RY * Math.pow(Z, 4) * ALPHA * ALPHA / (Math.pow(n, 3) * l * (l + 1));
        return {
          q: `The fine-structure energies of a hydrogen-like ion are ${FS_FORM}. With $\\alpha \\approx 1/137$, what is the splitting between the ${pair(n, l)} levels of ${ionPh(ion)}?`,
          ...GRE.numeric(R, dE, [dE / (Z * Z), dE * n, dE * l * (l + 1), dE / ALPHA, dE * n * n, 2 * dE], { unit: raw`\text{eV}`, sig: 2 }),
          expl: raw`From the formula, ${split}. Here $\Delta E = \dfrac{13.6\times ${Math.pow(Z, 4)}}{137^2\times ${Math.pow(n, 3)}\times ${l * (l + 1)}}\,\text{eV} = ${F.num(dE, 2)}\,\text{eV}$.`,
        };
      },
    },
    {
      id: 'atomic.pert.hyperfine', sec: '5.7.2', level: 2,
      gen(R) {
        const v = R.weighted(['num', 'h21', 'roman'], [3, 1, 3]);
        if (v === 'num') {
          const L = R.pick([
            { what: 'the ground-state hyperfine transition of hydrogen (the 21-cm line)', f: 1.420e9 },
            { what: 'the ground-state hyperfine transition of deuterium', f: 3.27e8 },
            { what: 'the cesium-133 ground-state hyperfine transition that defines the second', f: 9.19e9 },
            { what: 'the ground-state hyperfine transition of rubidium-87', f: 6.83e9 },
            { what: raw`the ground-state hyperfine transition of the $^{3}\text{He}^{+}$ ion`, f: 8.67e9 },
          ]);
          const fs = L.f >= 1e9 ? `$${F.num(L.f / 1e9, 3)}\\,\\text{GHz}$` : `$${F.num(L.f / 1e6, 3)}\\,\\text{MHz}$`;
          const ask = R.pick(['E', 'lam', 'T']);
          if (ask === 'E') {
            const E = H_EVS * L.f;
            return {
              q: `The frequency of ${L.what} is ${fs}. What is the energy difference between the two hyperfine levels? ($h = 4.14\\times10^{-15}\\,\\text{eV}\\cdot\\text{s}$.)`,
              ...GRE.numeric(R, E, [E / (2 * Math.PI), E * 2 * Math.PI, E * 1000, E / 1000, E * 100], { unit: raw`\text{eV}`, sig: 2 }),
              expl: raw`$\Delta E = hf = (4.14\times10^{-15}\,\text{eV}\cdot\text{s})(${F.num(L.f, 3)}\,\text{Hz}) = ${F.num(E, 2)}\,\text{eV}$ — micro-electronvolts, far below fine-structure energies.`,
            };
          }
          if (ask === 'lam') {
            const lam = C.c / L.f * 100;
            return {
              q: `The frequency of ${L.what} is ${fs}. What is the wavelength of the emitted radiation?`,
              ...GRE.numeric(R, lam, [lam / (2 * Math.PI), lam * 2 * Math.PI, lam * 10, lam / 10, lam / 100], { unit: raw`\text{cm}`, sig: 2 }),
              expl: raw`$\lambda = c/f = (3\times10^{8}\,\text{m/s})/(${F.num(L.f, 3)}\,\text{Hz}) = ${F.num(lam, 2)}\,\text{cm}$, in the microwave/radio band.`,
            };
          }
          const T = C.h * L.f / C.kB;
          return {
            q: `The frequency of ${L.what} is ${fs}. At roughly what temperature is the thermal energy $k_BT$ equal to the hyperfine splitting?`,
            ...GRE.numeric(R, T, [T / (2 * Math.PI), T * 2 * Math.PI, T * 1000, T / 1000, T * 100], { unit: raw`\text{K}`, sig: 2 }),
            level: 3,
            expl: raw`$T = hf/k_B = (6.63\times10^{-34})(${F.num(L.f, 3)})/(1.38\times10^{-23})\,\text{K} = ${F.num(T, 2)}\,\text{K}$. Even very cold gas populates both hyperfine levels.`,
          };
        }
        if (v === 'h21') {
          if (R.bool()) {
            const E = HC / 2.1e8;
            return {
              q: 'Neutral hydrogen in interstellar space emits radio waves of wavelength 21 cm. What is the energy of one of these photons?',
              ...GRE.numeric(R, E, [E * 100, E / 100, E * 1e4, E * 1e6, E / (2 * Math.PI)], { unit: raw`\text{eV}`, sig: 2 }),
              level: 1,
              expl: raw`$E = hc/\lambda = (1240\,\text{eV}\cdot\text{nm})/(2.1\times10^{8}\,\text{nm}) = ${F.num(E, 2)}\,\text{eV}$. Careful with the conversion: $21\,\text{cm} = 2.1\times10^{8}\,\text{nm}$.`,
            };
          }
          const f = C.c / 0.21;
          return {
            q: 'Neutral hydrogen in interstellar space emits radio waves of wavelength 21 cm. What is the frequency of this radiation?',
            ...GRE.numeric(R, f, [f * 100, f / 100, f / (2 * Math.PI), f * 2 * Math.PI, f * 1000], { unit: raw`\text{Hz}`, sig: 2 }),
            level: 1,
            expl: raw`$f = c/\lambda = (3\times10^{8}\,\text{m/s})/(0.21\,\text{m}) = ${F.num(f, 2)}\,\text{Hz} \approx 1.4\,\text{GHz}$.`,
          };
        }
        const T = [
          [raw`It arises from a transition between the two hyperfine levels of the $1s$ ground state.`, 'the two levels have total spin $F = 1$ and $F = 0$'],
          [raw`In the upper level the electron and proton spins are parallel (total spin $F = 1$).`, 'the triplet lies higher'],
          [raw`Its photon energy is about $6\times10^{-6}\,\text{eV}$.`, '$hc/\\lambda$ with $\\lambda = 21\\,\\text{cm}$'],
          ['The transition is strongly forbidden, so the upper level lives for millions of years.', 'it is a magnetic-dipole spin-flip transition'],
          ['It is used by radio astronomers to map neutral hydrogen in galaxies.', 'it is the classic tracer of interstellar atomic hydrogen'],
          ['The splitting comes from the magnetic interaction between the electron and proton spins.', 'that is hyperfine structure'],
        ];
        const Fs = [
          [raw`It arises from a transition between the $n = 2$ and $n = 1$ levels.`, 'that is Lyman-$\\alpha$ at 122 nm'],
          [raw`In the upper level the electron and proton spins are antiparallel (total spin $F = 0$).`, 'the singlet is the lower level'],
          [raw`It is an electric-dipole transition with $\Delta l = \pm 1$.`, 'both levels have $l = 0$; it is a magnetic-dipole spin flip'],
          [raw`Its photon energy is about $0.06\,\text{eV}$.`, 'it is about $6\\times10^{-6}\\,\\text{eV}$'],
          ['It is caused by spin–orbit coupling of the electron.', 'an $l = 0$ state has no spin–orbit coupling'],
          [raw`The splitting is larger than the fine-structure splitting of the $n = 2$ level.`, 'it is about ten times smaller'],
        ];
        const st = romanSet(R, T, Fs);
        return { ...romanQ(R, 'Which of the following statements about the 21-cm line of atomic hydrogen is (are) correct?', st), expl: romanExpl(st) };
      },
    },
    {
      id: 'atomic.pert.spinorbit', sec: '5.7.2', level: 3,
      gen(R) {
        const v = R.weighted(['one', 'term', 'interval'], [3, 2, 2]);
        if (v === 'interval') {
          const opts = [];
          for (let S2 = 1; S2 <= 4; S2++) for (let L = 1; L <= 3; L++) { const J = Jvals(S2, L); for (let i = 1; i < J.length - 1; i++) opts.push([S2, L, J[i]]); }
          const [S2, L, J2] = R.pick(opts);
          const up = R.bool();
          const hi = `E_{J=${half(J2 + 2)}} - E_{J=${half(J2)}}`, lo = `E_{J=${half(J2)}} - E_{J=${half(J2 - 2)}}`;
          const corr = up ? [J2 + 2, J2] : [J2, J2 + 2];
          return {
            q: `In LS coupling, the spin–orbit energy of each level of a multiplet is proportional to the eigenvalue of $\\mathbf{L}\\cdot\\mathbf{S}$. For the $${termL(S2, L)}$ multiplet, what is the ratio of the energy interval $${up ? hi : lo}$ to the interval $${up ? lo : hi}$?`,
            ...ratChoices(R, corr, [[corr[1], corr[0]], [1, 1], [(J2 + 2) * (J2 + 4), J2 * (J2 + 2)], [J2 * (J2 + 2), (J2 + 2) * (J2 + 4)], [2, 1], [1, 2], [(J2 + 2) * (J2 + 2), J2 * J2]]),
            expl: raw`$\mathbf{L}\cdot\mathbf{S} = \tfrac{1}{2}[J(J+1) - L(L+1) - S(S+1)]\hbar^2$, so $E_J - E_{J-1} \propto \tfrac12[J(J+1) - (J-1)J] = J$ (Landé interval rule). The intervals are in the ratio $${halfT(J2 + 2)} : ${halfT(J2)}$, so the answer is $${F.frac(corr[0], corr[1])}$.`,
          };
        }
        let S2, L, J2, label;
        if (v === 'one') {
          L = R.int(1, 3); S2 = 1; J2 = 2 * L + R.pick([-1, 1]);
          const n = R.int(L + 1, L + 3);
          label = `an electron in the $${nlj(n, L, J2)}$ state of hydrogen`;
        } else {
          S2 = R.int(1, 4); L = R.int(1, 3); J2 = R.pick(Jvals(S2, L));
          label = `an atom in the $${term(S2, L, J2)}$ level (LS coupling)`;
        }
        const jj = J2 * (J2 + 2), ll = 4 * L * (L + 1), ss = S2 * (S2 + 2);
        const c = [jj - ll - ss, 8];
        const others = Jvals(S2, L).filter(j => j !== J2).map(j => [j * (j + 2) - ll - ss, 8]);
        const wr = [[jj - ll - ss, 4], [-(jj - ll - ss), 8], [J2 * J2 - 4 * L * L - S2 * S2, 8], [jj + ll + ss, 8], ...others];
        if (c[0] === 0) throw new Error('zero');
        return {
          q: `What is the eigenvalue of the spin–orbit operator $\\mathbf{L}\\cdot\\mathbf{S}$ for ${label}?`,
          ...ratChoices(R, c, wr, { unit: raw`\hbar^2`, allowNeg: true }),
          level: v === 'one' ? 2 : 3,
          expl: raw`Use $\mathbf{J}^2 = (\mathbf{L} + \mathbf{S})^2$: $\mathbf{L}\cdot\mathbf{S} = \tfrac12(J^2 - L^2 - S^2) = \tfrac12[J(J+1) - L(L+1) - S(S+1)]\hbar^2$ with $J = ${halfT(J2)}$, $L = ${L}$, $S = ${halfT(S2)}$: $\tfrac12\left[${F.frac(jj, 4)} - ${L * (L + 1)} - ${F.frac(ss, 4)}\right]\hbar^2 = ${withUnit(F.frac(c[0], c[1]), raw`\hbar^2`)}$.`,
        };
      },
    },
    {
      id: 'atomic.pert.levels', sec: '5.7.2', level: 2,
      gen(R) {
        const v = R.weighted(['count', 'deg', 'pair', 'labels'], [2, 3, 3, 1]);
        if (v === 'count') {
          const N = R.int(2, 6);
          return {
            q: `Including fine structure but neglecting the Lamb shift and hyperfine structure, into how many distinct energy levels is the $n = ${N}$ level of hydrogen split?`,
            ...intChoices(R, N, [N * N, 2 * N - 1, N - 1, 2 * N, N * (N + 1) / 2, 2 * N * N], { min: 1 }),
            expl: raw`Fine-structure energies depend only on $n$ and $j$. For $n = ${N}$, $j$ runs over $\tfrac12, \tfrac32, \dots, ${halfT(2 * N - 1)}$: that is $${N}$ distinct values. (States with equal $j$ but different $l$, such as $${N}s_{1/2}$ and $${N}p_{1/2}$, stay degenerate.)`,
          };
        }
        if (v === 'deg') {
          const N = R.int(2, 5), J2 = 2 * R.int(0, N - 1) + 1;
          const top = J2 === 2 * N - 1;
          const ans = top ? J2 + 1 : 2 * (J2 + 1);
          const ls = top ? [(J2 - 1) / 2] : [(J2 - 1) / 2, (J2 + 1) / 2];
          return {
            q: `In hydrogen with fine structure included (but no Lamb shift or hyperfine structure), how many states (counting all $m_j$ values) have the energy of the $n = ${N}$, $j = ${halfT(J2)}$ level?`,
            ...intChoices(R, ans, [J2 + 1, 2 * (J2 + 1), J2, 2 * N * N, N * N, (J2 + 1) / 2, 3 * (J2 + 1)].filter(x => x !== ans), { min: 1 }),
            level: 3,
            expl: raw`The level contains ${ls.map(l => `$${nlj(N, l, J2)}$`).join(' and ')}, each with $2j + 1 = ${J2 + 1}$ states, for a total of $${ans}$. ${top ? `Only $l = ${ls[0]}$ is possible because $l \\le n - 1$.` : 'Both $l = j \\pm \\tfrac12$ are allowed and they are degenerate in the Dirac energy formula.'}`,
          };
        }
        if (v === 'pair') {
          const N = R.int(2, 5), l = R.int(0, N - 2);
          const c = raw`$${nlj(N, l, 2 * l + 1)}$ and $${nlj(N, l + 1, 2 * l + 1)}$`;
          const W = [];
          if (l > 0) W.push(raw`$${nlj(N, l, 2 * l - 1)}$ and $${nlj(N, l, 2 * l + 1)}$`);
          W.push(raw`$${nlj(N, l + 1, 2 * l + 1)}$ and $${nlj(N, l + 1, 2 * l + 3)}$`);
          W.push(raw`$${nlj(N, l, 2 * l + 1)}$ and $${nlj(N + 1, l, 2 * l + 1)}$`);
          W.push(raw`$${nlj(N, l, 2 * l + 1)}$ and $${nlj(N, l + 1, 2 * l + 3)}$`);
          if (N > 2 && l + 1 <= N - 2) W.push(raw`$${nlj(N - 1, l, 2 * l + 1)}$ and $${nlj(N, l + 1, 2 * l + 1)}$`);
          if (l + 2 <= N - 1) W.push(raw`$${nlj(N, l, 2 * l + 1)}$ and $${nlj(N, l + 2, 2 * l + 3)}$`);
          W.push(raw`$${nlj(N, l, 2 * l + 1)}$ and $${nlj(N + 1, l + 1, 2 * l + 1)}$`);
          W.push(raw`$${nlj(N, l + 1, 2 * l + 3)}$ and $${nlj(N + 1, l + 1, 2 * l + 3)}$`);
          return {
            q: 'Which pair of hydrogen levels is exactly degenerate according to the fine-structure (Dirac) energy formula, but split by the Lamb shift?',
            ...GRE.mc(R, c, W),
            level: 3,
            expl: raw`Fine-structure energies depend only on $n$ and $j$, so levels with the same $n$ and $j$ but different $l$ are degenerate; the Lamb shift (QED) lifts this. The famous case is $2s_{1/2}$–$2p_{1/2}$; here the pair is ${c}.`,
          };
        }
        return {
          q: 'When fine structure is included (but not the Lamb shift or hyperfine structure), the energy levels of hydrogen depend on which quantum numbers?',
          ...GRE.mc(R, '$n$ and $j$ only', ['$n$ only', '$n$ and $l$ only', '$n$, $l$, and $j$', '$n$, $l$, and $m_l$', '$n$, $j$, and $m_j$']),
          expl: raw`The fine-structure formula $E_{nj} = -\frac{13.6\,\text{eV}}{n^2}\left[1 + \frac{\alpha^2}{n^2}\left(\frac{n}{j+1/2} - \frac34\right)\right]$ involves only $n$ and $j$; the levels stay degenerate in $l$ (for fixed $j$) and in $m_j$.`,
        };
      },
    },
    {
      id: 'atomic.pert.roman', sec: '5.7.2', level: 2,
      gen(R) {
        const T = [
          [raw`Fine-structure corrections are smaller than the Bohr energies by a factor of order $\alpha^2$.`, 'they are relativistic corrections of order $(v/c)^2$'],
          ['Spin–orbit coupling arises from the interaction of the electron’s spin magnetic moment with the magnetic field produced by its orbital motion relative to the nucleus.', 'in the electron frame the nucleus circulates and produces a magnetic field'],
          [raw`With fine structure included, the energies of hydrogen depend only on $n$ and $j$.`, 'the Dirac formula has no separate $l$ dependence'],
          [raw`The Lamb shift splits the $2s_{1/2}$ and $2p_{1/2}$ levels of hydrogen.`, 'they are degenerate in the Dirac theory'],
          ['The Lamb shift is a quantum-electrodynamic effect.', 'it comes from the interaction of the electron with the quantized radiation field'],
          ['Hyperfine structure arises from the interaction between the electron and the magnetic moment of the nucleus.', 'it requires nuclear spin'],
          [raw`Hyperfine splittings are smaller than fine-structure splittings by roughly $m_e/m_p$.`, 'the nuclear magneton is smaller than the Bohr magneton by this factor'],
          [raw`In the hydrogen ground state, the hyperfine level with total spin $F = 1$ lies above the level with $F = 0$.`, 'the 21-cm photon is emitted in the $F = 1 \\to 0$ transition'],
          ['The relativistic correction to the electron’s kinetic energy contributes to the fine structure.', 'fine structure = relativistic kinetic energy + spin–orbit (+ Darwin term)'],
        ];
        const Fs = [
          ['Fine structure arises from the coupling of the electron spin to the nuclear spin.', 'that is hyperfine structure'],
          [raw`According to the Dirac fine-structure formula, $2s_{1/2}$ and $2p_{1/2}$ have different energies.`, 'they have the same $n$ and $j$ and are degenerate until the Lamb shift'],
          [raw`The Lamb shift is larger than the fine-structure splitting of the $n = 2$ level.`, 'it is roughly ten times smaller'],
          [raw`The 21-cm line comes from a transition between the $n = 2$ and $n = 1$ levels.`, 'it is a hyperfine transition within $n = 1$'],
          [raw`In the hydrogen ground state, the $F = 0$ (singlet) hyperfine level lies above the $F = 1$ level.`, 'the singlet is lower'],
          ['Fine-structure splittings grow with the principal quantum number $n$.', 'they fall off roughly as $1/n^3$'],
          ['Hyperfine splittings are larger than fine-structure splittings because the proton is much heavier than the electron.', 'the heavy proton has a small magnetic moment, so they are smaller'],
          [raw`Spin–orbit coupling shifts the energies of $s$ states ($l = 0$).`, 'with $l = 0$ there is no orbital angular momentum to couple to'],
        ];
        const st = romanSet(R, T, Fs);
        return { ...romanQ(R, 'Which of the following statements about corrections to the energy levels of hydrogen is (are) true?', st), expl: romanExpl(st) };
      },
    },
  ]);

  // =================================================================== 5.7.3 Shell model and electronic notation
  const period = Z => (Z <= 2 ? 1 : Z <= 10 ? 2 : Z <= 18 ? 3 : Z <= 36 ? 4 : 5);
  const IE1 = { 1: 13.6, 2: 24.6, 3: 5.4, 4: 9.3, 5: 8.3, 6: 11.3, 7: 14.5, 8: 13.6, 9: 17.4, 10: 21.6, 11: 5.1, 12: 7.6, 13: 6.0, 14: 8.2, 15: 10.5, 16: 10.4, 17: 13.0, 18: 15.8, 19: 4.3, 20: 6.1, 31: 6.0, 32: 7.9, 33: 9.8, 34: 9.8, 35: 11.8, 36: 14.0, 37: 4.2, 38: 5.7 };
  const FAMILY = [
    ['an alkali metal', [3, 11, 19, 37]], ['an alkaline-earth metal', [4, 12, 20, 38]], ['a halogen', [9, 17, 35]], ['a noble gas', [10, 18, 36]],
    ['a chalcogen', [8, 16, 34]], ['a pnictogen', [7, 15, 33]], ['a carbon-group element', [6, 14, 32]], ['a boron-group element', [5, 13, 31]],
  ];
  const famOf = Z => FAMILY.find(f => f[1].indexOf(Z) >= 0);
  // excite one electron of a ground configuration (promote from the last or from an inner full subshell)
  function exciteCfg(R, Z) {
    const c = cloneCfg(groundCfg(Z));
    const opts = [];
    const last = c[c.length - 1];
    const i = ORDER.findIndex(o => o[0] === last[0] && o[1] === last[1]);
    opts.push(() => { const nx = ORDER[i + 1]; last[2] -= 1; c.push([nx[0], nx[1], 1]); });
    for (const s of c) {
      if (s[1] !== 0 || s[2] !== 2) continue;
      const p = c.find(x => x[0] === s[0] && x[1] === 1);
      if (s[0] >= 2 && p && p[2] < 6 && p !== last) opts.push(() => { s[2] -= 1; p[2] += 1; });
      if (s[0] >= 2 && s === last && !p) opts.push(() => { s[2] -= 1; c.push([s[0], 1, 1]); });
    }
    R.pick(opts)();
    return c.filter(x => x[2] > 0);
  }
  // violate the Pauli principle: overfill a full subshell (taking an electron from the last one); null if impossible
  function overfillCfg(R, Z, coreZ) {
    const c = cloneCfg(groundCfg(Z));
    const coreSubs = coreZ ? groundCfg(coreZ).map(x => x[0] + '.' + x[1]) : [];
    const last = c[c.length - 1];
    const full = c.filter(x => x !== last && x[2] === cap(x[1]) && coreSubs.indexOf(x[0] + '.' + x[1]) < 0);
    if (!full.length) return null;
    const t = R.pick(full);
    t[2] += 1; last[2] -= 1;
    return { cfg: c.filter(x => x[2] > 0), sub: `${t[0]}${LS[t[1]]}`, k: t[2], max: cap(t[1]) };
  }
  const D_IONS = [['Ti', 3, 1], ['V', 3, 2], ['Cr', 3, 3], ['Cr', 2, 4], ['Mn', 2, 5], ['Fe', 3, 5], ['Fe', 2, 6], ['Co', 2, 7], ['Ni', 2, 8], ['Cu', 2, 9]];
  const F_IONS = [['Ce', 1], ['Pr', 2], ['Nd', 3], ['Pm', 4], ['Sm', 5], ['Eu', 6], ['Gd', 7], ['Tb', 8], ['Dy', 9], ['Ho', 10], ['Er', 11], ['Tm', 12], ['Yb', 13]];
  const TERM_Z = [3, 5, 6, 7, 8, 9, 11, 12, 13, 14, 15, 16, 17, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35];
  function termSystem(R) {
    const kind = R.weighted(['el', 'd', 'f'], [5, 2, 2]);
    if (kind === 'el') {
      const Z = R.pick(TERM_Z);
      return { label: `a ground-state ${elName(Z)} atom ($Z = ${Z}$, configuration $${cfgTeX(groundCfg(Z), coreFor(Z))}$)`, ...groundTerm(Z), k: null, Z };
    }
    if (kind === 'd') {
      const [s, q, k] = R.pick(D_IONS);
      return { label: raw`the free $\text{${s}}^{${q}+}$ ion (configuration $[\text{Ar}]\,3d^{${k}}$)`, ...hund(2, k), l: 2, k };
    }
    const [s, k] = R.pick(F_IONS);
    return { label: raw`the free $\text{${s}}^{3+}$ ion (configuration $[\text{Xe}]\,4f^{${k}}$)`, ...hund(3, k), l: 3, k };
  }

  GRE.addTemplates('atomic', [
    {
      id: 'atomic.shell.config', sec: '5.7.3', level: 1, weight: 2,
      gen(R) {
        const v = R.weighted(['which', 'element', 'count', 'unpaired'], [3, 2, 2, 2]);
        const Z = R.int(3, 36);
        const g = groundCfg(Z);
        const core = Z > 18 ? 18 : Z > 10 && R.bool() ? 10 : 0;
        const T = c => `$${cfgTeX(c, core)}$`;
        if (v === 'which') {
          const W = [];
          if (Z < 36) W.push(groundCfg(Z + 1));
          if (Z - 1 > core) W.push(groundCfg(Z - 1));
          if (Z < 35) W.push(groundCfg(Z + 2));
          if (Z - 2 > core) W.push(groundCfg(Z - 2));
          W.push(exciteCfg(R, Z));
          const ov = overfillCfg(R, Z, core);
          if (ov) W.push(ov.cfg);
          // wrong filling order: the outermost s electrons placed in a higher-l subshell instead
          const c = cloneCfg(g);
          const s = c.filter(x => x[1] === 0 && x[0] >= 2 && x[2] > 0).pop();
          if (s) {
            const tn = s[0] >= 4 ? s[0] - 1 : s[0], tl = s[0] >= 4 ? 2 : 1;
            let t = c.find(x => x[0] === tn && x[1] === tl);
            if (!t) { t = [tn, tl, 0]; c.push(t); }
            const mv = Math.min(s[2], cap(tl) - t[2]);
            if (mv > 0) { s[2] -= mv; t[2] += mv; W.push(c); }
          }
          if (Z === 24 || Z === 29) { const m = cloneCfg(g); m.find(x => x[0] === 4 && x[1] === 0)[2] += 1; m.find(x => x[0] === 3 && x[1] === 2)[2] -= 1; W.unshift(m); }
          const ck = cfgKey(g);
          return {
            q: `Which of the following is the ground-state electron configuration of ${elFull(Z)}?`,
            ...GRE.mc(R, T(g), W.filter(w => cfgKey(w) !== ck).map(T), { keep: Z === 24 || Z === 29 ? 1 : 0 }),
            level: Z === 24 || Z === 29 ? 3 : Z > 20 ? 2 : 1,
            expl: `Fill subshells in the order 1s, 2s, 2p, 3s, 3p, 4s, 3d, 4p (each $nl$ holds $2(2l+1)$ electrons) until all ${Z} electrons are placed${Z === 24 || Z === 29 ? '; chromium and copper are the famous exceptions, moving one 4s electron into 3d to make a half-filled or filled d subshell' : ''}: $${cfgTeX(g, core)}$.`,
          };
        }
        if (v === 'element') {
          const cands = [Z - 2, Z - 1, Z + 1, Z + 2, Z + 3, Z - 3].filter(z => z >= 1 && z <= 50 && z !== Z);
          return {
            q: `An atom in its ground state has the electron configuration $${cfgTeX(g, core)}$. Which element is it?`,
            ...GRE.mc(R, elFull(Z), cands.map(elFull), { rank: t => +t.match(/Z = (\d+)/)[1] }),
            expl: `Count the electrons: ${core ? `the $[\\text{${ELEM[core][0]}}]$ core has ${core} electrons, plus ` : ''}${g.filter(x => !core || !groundCfg(core).some(c => c[0] === x[0] && c[1] === x[1])).map(x => x[2]).join(' + ')} ${core ? 'outside it' : ''} gives $Z = ${Z}$ (${elName(Z)}).`,
          };
        }
        if (v === 'count') {
          if (R.bool()) {
            const ls = [...new Set(g.map(x => x[1]))];
            const l = R.pick(ls);
            const ans = g.filter(x => x[1] === l).reduce((a, x) => a + x[2], 0);
            const lastL = g.filter(x => x[1] === l).pop()[2];
            return {
              q: `How many electrons in a ground-state ${elName(Z)} atom ($Z = ${Z}$) have orbital angular momentum quantum number $l = ${l}$?`,
              ...intChoices(R, ans, [lastL, cap(l), ans + cap(l), ans - 2, ans + 2, Z - ans], { min: 1 }),
              level: 2,
              expl: raw`The configuration is $${cfgTeX(g, 0)}$. The $l = ${l}$ (${LS[l]}) electrons are ${g.filter(x => x[1] === l).map(x => `$${x[0]}${LS[l]}^{${x[2]}}$`).join(' + ')}, a total of $${ans}$.`,
            };
          }
          const ns = [...new Set(g.map(x => x[0]))];
          const n = R.pick(ns);
          const ans = g.filter(x => x[0] === n).reduce((a, x) => a + x[2], 0);
          return {
            q: `How many electrons in a ground-state ${elName(Z)} atom ($Z = ${Z}$) have principal quantum number $n = ${n}$?`,
            ...intChoices(R, ans, [2 * n * n, n * n, ans + 2, ans - 2, g.filter(x => x[0] === n).pop()[2]], { min: 1 }),
            expl: raw`The configuration is $${cfgTeX(g, 0)}$. The $n = ${n}$ electrons are ${g.filter(x => x[0] === n).map(x => `$${n}${LS[x[1]]}^{${x[2]}}$`).join(' + ')}, a total of $${ans}$ (the full shell would hold $2n^2 = ${2 * n * n}$).`,
          };
        }
        const ans = unpaired(g);
        const open = g.filter(x => x[2] < cap(x[1]));
        const kOpen = open.reduce((a, x) => a + x[2], 0);
        return {
          q: `How many unpaired electrons does a ground-state ${elName(Z)} atom ($Z = ${Z}$, configuration $${cfgTeX(g, core)}$) have?`,
          ...intChoices(R, ans, [kOpen, 0, 1, 2, ans + 1, ans - 1, open.length ? cap(open[open.length - 1][1]) - kOpen : 2], { min: 0 }),
          level: 2,
          expl: open.length
            ? `By Hund’s first rule the electrons in a partly filled subshell occupy different $m_l$ orbitals with parallel spins before any pairing. ${open.map(x => `$${x[0]}${LS[x[1]]}^{${x[2]}}$ has ${Math.min(x[2], cap(x[1]) - x[2])} unpaired`).join('; ')}, for a total of ${ans}.`
            : 'All occupied subshells are completely filled, so every electron is paired: 0 unpaired electrons.',
        };
      },
    },
    {
      id: 'atomic.shell.capacity', sec: '5.7.3', level: 1,
      gen(R) {
        const v = R.pick(['shell', 'sub', 'nm', 'nms', 'nlms', 'nm0']);
        if (v === 'shell') {
          const N = R.int(1, 6), ans = 2 * N * N;
          return {
            q: `What is the maximum number of electrons that can occupy the shell with principal quantum number $n = ${N}$?`,
            ...intChoices(R, ans, [N * N, 2 * N, 2 * (2 * N + 1), N * (N + 1), 4 * N, 2 * N * (N - 1)], { min: 1 }),
            expl: raw`For each $l = 0, \dots, n-1$ there are $2l + 1$ values of $m_l$, giving $n^2$ orbitals, and two spin states each: $2n^2 = ${ans}$.`,
          };
        }
        if (v === 'sub') {
          const n = R.int(2, 6), l = R.int(0, Math.min(n - 1, 4)), ans = 2 * (2 * l + 1);
          return {
            q: `What is the maximum number of electrons in a $${n}${LS[l]}$ subshell?`,
            ...intChoices(R, ans, [2 * l + 1, 2 * l, 4 * l, l * (l + 1), 2 * n * n, 2 * n].filter(x => x > 0), { min: 1 }),
            expl: raw`A subshell with $l = ${l}$ has $2l + 1 = ${2 * l + 1}$ values of $m_l$ and two spin states each: $2(2l + 1) = ${ans}$ (the value of $n$ is irrelevant).`,
          };
        }
        if (v === 'nm' || v === 'nm0') {
          const N = R.int(2, 6), M = v === 'nm0' ? 0 : R.sign() * R.int(1, N - 1), ans = 2 * (N - Math.abs(M));
          return {
            q: `In an atom, how many electrons can have the quantum numbers $n = ${N}$ and $m_l = ${M}$?`,
            ...intChoices(R, ans, [N - Math.abs(M), 2 * N, 2 * N * N, 2 * (2 * Math.abs(M) + 1), 2, 2 * (N - Math.abs(M) - 1)].filter(x => x > 0), { min: 1 }),
            level: 2,
            expl: raw`$m_l = ${M}$ requires $l \ge ${Math.abs(M)}$, and $l \le n - 1 = ${N - 1}$: that gives $${N - Math.abs(M)}$ values of $l$, each with two spin states, so $${ans}$ electrons.`,
          };
        }
        if (v === 'nms') {
          const N = R.int(1, 6), ans = N * N;
          const s = R.pick([raw`+\tfrac{1}{2}`, raw`-\tfrac{1}{2}`]);
          return {
            q: `In an atom, how many electrons can have the quantum numbers $n = ${N}$ and $m_s = ${s}$?`,
            ...intChoices(R, ans, [2 * N * N, N, 2 * N, N * (N + 1) / 2, N * N + 1], { min: 1 }),
            level: 2,
            expl: raw`The shell has $n^2 = ${ans}$ orbitals (combinations of $l$ and $m_l$), and each can hold exactly one electron with the given $m_s$.`,
          };
        }
        const n = R.int(2, 6), l = R.int(1, Math.min(n - 1, 3)), ans = 2 * l + 1;
        const s = R.pick([raw`+\tfrac{1}{2}`, raw`-\tfrac{1}{2}`]);
        return {
          q: `In an atom, how many electrons can have the quantum numbers $n = ${n}$, $l = ${l}$, and $m_s = ${s}$?`,
          ...intChoices(R, ans, [2 * (2 * l + 1), l, 2 * l, n, n * n, l + 1], { min: 1 }),
          expl: raw`With $n$, $l$ and $m_s$ fixed, only $m_l$ is free: $m_l = -${l}, \dots, ${l}$ gives $2l + 1 = ${ans}$ electrons.`,
        };
      },
    },
    {
      id: 'atomic.shell.hund', sec: '5.7.3', level: 3, weight: 2,
      gen(R) {
        const sys = termSystem(R);
        const { S2, L, J2 } = sys;
        const v = R.weighted(['term', 'J', 'S'], [4, 1, 1]);
        const less = sys.k != null ? sys.k < 2 * sys.l + 1 : null;
        const why = raw`Hund's rules: (1) maximize $S$; (2) then maximize $L$; (3) $J = |L - S|$ for a subshell less than half full, $J = L + S$ for more than half full. Here $S = ${halfT(S2)}$, $L = ${L}$, $J = ${halfT(J2)}$, i.e. $${term(S2, L, J2)}$.`;
        if (v === 'term') {
          const W = [];
          for (const j of Jvals(S2, L)) if (j !== J2) W.push([S2, L, j]);
          const S2m = S2 % 2;
          if (S2m !== S2) { const js = Jvals(S2m, L); W.push([S2m, L, js[0]]); }
          if (W.length < 2) W.push([S2 + 2, L, J2 + 2]);
          if (S2 > 0) W.push([S2 - 1, L, J2]);
          for (const L2 of [L + 1, L - 1, L + 2]) {
            if (L2 < 0 || L2 > 7) continue;
            const js = Jvals(S2, L2);
            W.push([S2, L2, js[0]]); W.push([S2, L2, js[js.length - 1]]);
          }
          W.push([S2 + 2, L, J2]);
          const mk = t => `$${term(t[0], t[1], t[2])}$`;
          return {
            q: `What is the ground-state term symbol of ${sys.label}?`,
            ...GRE.mc(R, mk([S2, L, J2]), W.map(mk), { keep: 1 }),
            expl: why,
          };
        }
        if (v === 'J') {
          const js = new Set(Jvals(S2, L).concat([2 * L, S2, J2 + 2, Math.abs(J2 - 2), 2 * L + S2 + 2, J2 + 4, J2 + 6]));
          js.delete(J2);
          const val = new Map(); const mk = j => { const t = `$J = ${halfT(j)}$`; val.set(t, j); return t; };
          return {
            q: `What is the total angular momentum quantum number $J$ of ${sys.label.replace(/^the free/, 'the free')} in its ground state?`.replace('a ground-state ', 'a ').replace(' atom (', ' atom ('),
            ...GRE.mc(R, mk(J2), [...js].map(mk), { rank: t => val.get(t) }),
            expl: why,
          };
        }
        const val = new Map(); const mk = s => { const t = `$S = ${halfT(s)}$`; val.set(t, s); return t; };
        const cands = [S2 % 2, S2 % 2 + 2, S2 + 2, S2 - 2, S2 + 1, S2 - 1, S2 + 4, S2 * 2, S2 + 3, S2 + 6].filter(s => s >= 0 && s !== S2);
        return {
          q: `What is the total spin quantum number $S$ of ${sys.label.replace('a ground-state ', 'a ')} in its ground state?`,
          ...GRE.mc(R, mk(S2), [...new Set(cands)].map(mk), { rank: t => val.get(t) }),
          level: 2,
          expl: `Hund’s first rule: put electrons into different $m_l$ orbitals with parallel spins as far as possible. ` + why,
        };
      },
    },
    {
      id: 'atomic.shell.termsym', sec: '5.7.3', level: 2,
      gen(R) {
        const v = R.weighted(['SLJ', 'deg', 'mag', 'bad', 'Jlist'], [2, 2, 2, 3, 2]);
        const S2 = R.int(0, 4), L = R.int(0, 4), J2 = R.pick(Jvals(S2, L));
        const T = `$${term(S2, L, J2)}$`;
        if (v === 'SLJ') {
          const mk = (s, l, j) => `$S = ${halfT(s)},\\ L = ${l},\\ J = ${halfT(j)}$`;
          const W = [mk(2 * (S2 + 1), L, J2), mk(S2 + 1, L, J2), mk(S2, L + 1, J2), mk(S2, L + 2, J2)];
          if (J2 % 2 === 0 && J2 / 2 !== L) W.push(mk(S2, J2 / 2, 2 * L));
          if (L > 0) W.push(mk(S2, L - 1, J2));
          for (const j of Jvals(S2, L)) if (j !== J2) W.push(mk(S2, L, j));
          return {
            q: `An atomic level is labeled by the term symbol ${T}. What are its quantum numbers $S$, $L$, and $J$?`,
            ...GRE.mc(R, mk(S2, L, J2), W),
            level: 1,
            expl: raw`In ${'$' + raw`^{2S+1}L_J` + '$'} the superscript is the multiplicity $2S + 1 = ${S2 + 1}$, so $S = ${halfT(S2)}$; the letter ${LT[L]} means $L = ${L}$ (S, P, D, F, G = 0, 1, 2, 3, 4); the subscript is $J = ${halfT(J2)}$.`,
          };
        }
        if (v === 'deg') {
          const ans = J2 + 1;
          return {
            q: `How many distinct quantum states (different values of $M_J$) belong to the atomic level ${T}?`,
            ...intChoices(R, ans, [(S2 + 1) * (2 * L + 1), S2 + 1, 2 * L + 1, J2, 2 * (J2 + 1), J2 + 3].filter(x => x !== ans && x > 0), { min: 1 }),
            expl: raw`A level with total angular momentum $J = ${halfT(J2)}$ has $2J + 1 = ${ans}$ states, $M_J = -J, \dots, J$. ($(2S+1)(2L+1) = ${(S2 + 1) * (2 * L + 1)}$ counts the whole ${'$' + termL(S2, L) + '$'} term, all $J$ together.)`,
          };
        }
        if (v === 'mag') {
          if (J2 === 0) throw new Error('J = 0');
          const val = x => Math.sqrt(x);
          const J = J2 / 2, S = S2 / 2;
          const wr = [J, J + 1, Math.sqrt(L * (L + 1)), S > 0 ? Math.sqrt(S * (S + 1)) : null, J * (J + 1), Math.sqrt(J * J + 1), L + S].filter(x => x != null && x > 0);
          return {
            q: `An atom is in the level ${T}. What is the magnitude of its total angular momentum?`,
            ...exactChoices(R, val(J * (J + 1)), wr, { unit: raw`\hbar` }),
            expl: raw`$|\mathbf{J}| = \sqrt{J(J+1)}\,\hbar$ with $J = ${halfT(J2)}$: $\sqrt{${F.frac(J2 * (J2 + 2), 4)}}\,\hbar$. The maximum projection $J_z$ is only $J\hbar$.`,
          };
        }
        if (v === 'bad') {
          const seen = new Set(), good = [];
          while (good.length < 6) {
            const s2 = R.int(0, 4), l = R.int(0, 4), j2 = R.pick(Jvals(s2, l));
            const t = `$${term(s2, l, j2)}$`;
            if (!seen.has(t)) { seen.add(t); good.push(t); }
          }
          let bad, reason;
          for (let tries = 0; tries < 20 && !bad; tries++) {
            const s2 = R.int(0, 4), l = R.int(0, 4);
            const js = Jvals(s2, l);
            const type = R.pick(['big', 'small', 'parity']);
            let j2 = null;
            if (type === 'big') j2 = js[js.length - 1] + 2;
            else if (type === 'small' && js[0] >= 2) j2 = js[0] - 2;
            else if (type === 'parity') j2 = js[0] + 1;
            if (j2 == null || j2 < 0) continue;
            bad = `$${term(s2, l, j2)}$`;
            reason = type === 'parity'
              ? raw`with $2S + 1 = ${s2 + 1}$, $S = ${halfT(s2)}$ is ${s2 % 2 ? 'half-integer' : 'an integer'}, so $J$ must be ${s2 % 2 ? 'half-integer' : 'an integer'}, but $J = ${halfT(j2)}$`
              : raw`with $L = ${l}$ and $S = ${halfT(s2)}$, $J$ can only run from $${halfT(js[0])}$ to $${halfT(js[js.length - 1])}$, but $J = ${halfT(j2)}$`;
          }
          if (!bad) throw new Error('no bad term');
          return {
            q: 'Which of the following term symbols CANNOT describe a level of an atom in LS coupling?',
            ...GRE.mc(R, bad, good),
            level: 3,
            expl: raw`For $^{2S+1}L_J$, $J$ takes the values $|L - S|, |L - S| + 1, \dots, L + S$. For ${bad}, ${reason}.`,
          };
        }
        if (S2 === 0 || L === 0) throw new Error('single J');
        const js = Jvals(S2, L);
        const list = a => (a.length ? '$J = ' + a.map(halfT).join(',\\ ') + '$' : null);
        const lo = js[0], hi = js[js.length - 1];
        const rng = (a, b) => { const o = []; for (let j = a; j <= b; j += 2) o.push(j); return o; };
        const W = [list(rng(2 * L, hi)), list([lo, hi]), list(rng(J2 % 2, hi)), list([hi]), list(rng(lo, hi + 2)), list(rng(lo + 2, hi)), list(rng(lo, hi - 2))].filter(Boolean);
        return {
          q: `An atomic term has $L = ${L}$ and $S = ${halfT(S2)}$. Which values can the total angular momentum quantum number $J$ take?`,
          ...GRE.mc(R, list(js), W),
          expl: raw`Adding angular momenta $L$ and $S$ gives $J = |L - S|, \dots, L + S$ in integer steps: here $${halfT(lo)}$ to $${halfT(hi)}$, i.e. ${list(js)}.`,
        };
      },
    },
    {
      id: 'atomic.shell.twoelectron', sec: '5.7.3', level: 3,
      gen(R) {
        const all = (Ls) => [0, 2].flatMap(s => Ls.map(L => [s, L]));
        const CF = [
          { tex: '1s\\,2s', eq: false, l1: 0, l2: 0, terms: all([0]) }, { tex: '2s\\,3s', eq: false, l1: 0, l2: 0, terms: all([0]) },
          { tex: '1s\\,2p', eq: false, l1: 0, l2: 1, terms: all([1]) }, { tex: '2s\\,2p', eq: false, l1: 0, l2: 1, terms: all([1]) }, { tex: '3s\\,4p', eq: false, l1: 0, l2: 1, terms: all([1]) },
          { tex: '2p^{2}', eq: true, l1: 1, l2: 1, terms: [[0, 0], [2, 1], [0, 2]] }, { tex: '3p^{2}', eq: true, l1: 1, l2: 1, terms: [[0, 0], [2, 1], [0, 2]] }, { tex: '4p^{2}', eq: true, l1: 1, l2: 1, terms: [[0, 0], [2, 1], [0, 2]] },
          { tex: '2p\\,3p', eq: false, l1: 1, l2: 1, terms: all([0, 1, 2]) }, { tex: '3p\\,4p', eq: false, l1: 1, l2: 1, terms: all([0, 1, 2]) },
          { tex: '1s\\,3d', eq: false, l1: 0, l2: 2, terms: all([2]) }, { tex: '3d\\,4s', eq: false, l1: 2, l2: 0, terms: all([2]) },
          { tex: '3p\\,3d', eq: false, l1: 1, l2: 2, terms: all([1, 2, 3]) }, { tex: '2p\\,3d', eq: false, l1: 1, l2: 2, terms: all([1, 2, 3]) },
          { tex: '3d^{2}', eq: true, l1: 2, l2: 2, terms: [[0, 0], [0, 2], [0, 4], [2, 1], [2, 3]] }, { tex: '4d^{2}', eq: true, l1: 2, l2: 2, terms: [[0, 0], [0, 2], [0, 4], [2, 1], [2, 3]] },
        ];
        const c = R.pick(CF);
        const key = t => t[0] + ':' + t[1];
        const ok = new Set(c.terms.map(key));
        const bad = [];
        for (const s of [0, 2]) for (let L = 0; L <= 4; L++) if (!ok.has(s + ':' + L)) bad.push([s, L]);
        bad.push([4, Math.abs(c.l1 - c.l2)], [4, c.l1 + c.l2]);
        const mk = t => `$${termL(t[0], t[1])}$`;
        const rule = c.eq
          ? raw`For two equivalent electrons ($${c.tex}$) the Pauli principle allows only terms with $L + S$ even: ${c.terms.map(mk).join(', ')}.`
          : raw`For two inequivalent electrons, $L$ runs from $|l_1 - l_2| = ${Math.abs(c.l1 - c.l2)}$ to $l_1 + l_2 = ${c.l1 + c.l2}$ and $S = 0$ or $1$, all combinations allowed: ${c.terms.map(mk).join(', ')}.`;
        const v = R.weighted(['which', 'not', 'levels', 'states'], [3, c.terms.length >= 4 ? 3 : 0, 2, 2]);
        if (v === 'which') {
          return {
            q: `Which of the following terms can arise from the two-electron configuration $${c.tex}$ (outside closed shells)?`,
            ...GRE.mc(R, mk(R.pick(c.terms)), bad.map(mk)),
            expl: rule + ' Two electrons can never give $S > 1$, so quintets are impossible.',
          };
        }
        if (v === 'not') {
          return {
            q: `Which of the following terms can NOT arise from the two-electron configuration $${c.tex}$ (outside closed shells)?`,
            ...GRE.mc(R, mk(R.pick(bad)), c.terms.map(mk)),
            expl: rule,
          };
        }
        if (v === 'levels') {
          const lv = c.terms.reduce((a, t) => a + Jvals(t[0], t[1]).length, 0);
          const nterm = c.terms.length;
          return {
            q: `In LS coupling, how many distinct levels $^{2S+1}L_J$ (counting each allowed $J$ separately) arise from the configuration $${c.tex}$?`,
            ...intChoices(R, lv, [nterm, lv + 1, lv - 1, 2 * nterm, lv + 2], { min: 1 }),
            expl: rule + ` Counting $J$ values: ${c.terms.map(t => `$${termL(t[0], t[1])}$ gives ${Jvals(t[0], t[1]).length}`).join(', ')}, for a total of ${lv}.`,
          };
        }
        const n1 = 2 * (2 * c.l1 + 1), n2 = 2 * (2 * c.l2 + 1);
        const ans = c.eq ? n1 * (n1 - 1) / 2 : n1 * n2;
        return {
          q: `How many distinct antisymmetric two-electron states (microstates) belong to the configuration $${c.tex}$?`,
          ...intChoices(R, ans, [n1 * n2, n1 * (n1 - 1) / 2, n1 + n2, n1 * n1 / 2, ans * 2, (2 * c.l1 + 1) * (2 * c.l2 + 1)].filter(x => x !== ans), { min: 1 }),
          expl: c.eq
            ? raw`The $${c.tex}$ electrons are equivalent: choose 2 of the $${n1}$ spin-orbitals, $\binom{${n1}}{2} = ${ans}$. Check: $\sum (2S+1)(2L+1)$ over ${c.terms.map(mk).join(', ')} also gives ${ans}.`
            : raw`The electrons are in different subshells, so every combination is allowed: $${n1}\times${n2} = ${ans}$, matching $\sum(2S+1)(2L+1)$ over the terms.`,
        };
      },
    },
    {
      id: 'atomic.shell.quantum', sec: '5.7.3', level: 1,
      gen(R) {
        const half2 = s => (s > 0 ? raw`+\tfrac{1}{2}` : raw`-\tfrac{1}{2}`);
        const fmt = (n, l, m, s) => `$(${n},\\ ${l},\\ ${m},\\ ${s})$`;
        const valid = () => { const n = R.int(1, 5), l = R.int(0, n - 1), m = R.int(-l, l); return fmt(n, l, m, half2(R.sign())); };
        const invalid = () => {
          const t = R.pick(['l', 'm', 's', 'n', 'm']);
          if (t === 'l') { const n = R.int(1, 4), l = n + R.int(0, 1), m = R.int(-l, l); return [fmt(n, l, m, half2(R.sign())), `$l = ${l}$ is not allowed for $n = ${n}$ (need $l \\le n - 1$)`]; }
          if (t === 'm') { const n = R.int(1, 5), l = R.int(0, n - 1), m = R.sign() * (l + R.int(1, 2)); return [fmt(n, l, m, half2(R.sign())), `$|m_l| = ${Math.abs(m)}$ exceeds $l = ${l}$`]; }
          if (t === 's') { const n = R.int(1, 5), l = R.int(0, n - 1), m = R.int(-l, l), s = R.pick(['0', '+1', '-1']); return [fmt(n, l, m, s), `$m_s$ must be $\\pm\\tfrac12$ for an electron, not $${s}$`]; }
          return [fmt(0, 0, 0, half2(R.sign())), '$n$ must be a positive integer'];
        };
        const vs = new Set(); while (vs.size < 6) vs.add(valid());
        if (R.bool(0.6)) {
          const [bad, why] = invalid();
          return {
            q: 'Which of the following sets of quantum numbers $(n, l, m_l, m_s)$ is NOT possible for an electron in an atom?',
            ...GRE.mc(R, bad, [...vs]),
            expl: raw`Rules: $n \ge 1$, $0 \le l \le n - 1$, $-l \le m_l \le l$, $m_s = \pm\tfrac12$. Here ${why}.`,
          };
        }
        const bads = new Map(); for (let i = 0; i < 12 && bads.size < 6; i++) { const [b, w] = invalid(); bads.set(b, w); }
        const good = R.pick([...vs]);
        return {
          q: 'Which of the following sets of quantum numbers $(n, l, m_l, m_s)$ is possible for an electron in an atom?',
          ...GRE.mc(R, good, [...bads.keys()]),
          expl: raw`Rules: $n \ge 1$, $0 \le l \le n - 1$, $-l \le m_l \le l$, $m_s = \pm\tfrac12$. Only ${good} satisfies all of them.`,
        };
      },
    },
    {
      id: 'atomic.shell.pauli', sec: '5.7.3', level: 1,
      gen(R) {
        const Zs = R.pickN(range(3, 20), 5);
        const T = c => `$${cfgTeX(c, 0)}$`;
        if (R.bool(0.55)) {
          const ov = overfillCfg(R, Zs[0], 0);
          if (!ov) throw new Error('cannot overfill');
          const W = Zs.slice(1).map(Z => (R.bool() ? groundCfg(Z) : exciteCfg(R, Z)));
          return {
            q: 'Which of the following electron configurations is impossible for an atom (in any state)?',
            ...GRE.mc(R, T(ov.cfg), W.map(T)),
            expl: raw`An $nl$ subshell holds at most $2(2l + 1)$ electrons (Pauli exclusion principle). The configuration with $${ov.sub}^{${ov.k}}$ exceeds the maximum of ${ov.max}. The others are ground or excited configurations.`,
          };
        }
        const ex = exciteCfg(R, Zs[0]);
        return {
          q: 'Which of the following electron configurations describes a neutral atom in an excited state rather than its ground state?',
          ...GRE.mc(R, T(ex), Zs.slice(1).map(Z => T(groundCfg(Z)))),
          expl: raw`The ground state fills subshells in order of increasing energy (1s, 2s, 2p, 3s, 3p, 4s, ...). In $${cfgTeX(ex, 0)}$ an electron sits in a higher subshell while a lower one (${elName(Zs[0])}, $Z = ${Zs[0]}$) is not full, so it is excited.`,
        };
      },
    },
    {
      id: 'atomic.shell.periodic', sec: '5.7.3', level: 1,
      gen(R) {
        const v = R.weighted(['max', 'min', 'similar', 'family', 'ion'], [1, 1, 3, 3, 2]);
        if (v === 'max' || v === 'min') {
          const X = v === 'max' ? R.pick([2, 10, 18, 36]) : R.pick([3, 11, 19, 37]);
          const cands = Object.keys(IE1).map(Number).filter(z => z !== X && (v === 'max' ? period(z) >= period(X) && IE1[z] < IE1[X] - 1.5 : period(z) <= period(X) && IE1[z] > IE1[X] + 1.0));
          const pick = R.pickN(cands, 4);
          return {
            q: `Which of the following elements has the ${v === 'max' ? 'largest' : 'smallest'} first ionization energy?`,
            ...GRE.mc(R, elName(X), pick.map(elName)),
            expl: v === 'max'
              ? `${elName(X)[0].toUpperCase() + elName(X).slice(1)} is a noble gas with a closed shell, so its outermost electron is tightly bound; ionization energies rise across a period and fall down a group.`
              : `${elName(X)[0].toUpperCase() + elName(X).slice(1)} is an alkali metal: a single s electron outside a closed shell, well screened from the nucleus, is easy to remove. Ionization energies fall down a group and rise across a period.`,
          };
        }
        if (v === 'similar') {
          const fam = R.pick(FAMILY.slice(0, 7));
          const [X, Y] = R.pickN(fam[1], 2);
          const near = [X - 1, X + 1, X - 2, X + 2, Y - 1, Y + 1].filter(z => z >= 1 && z <= 38 && fam[1].indexOf(z) < 0);
          return {
            q: `Which of the following elements has chemical properties most similar to those of ${elName(X)}?`,
            ...GRE.mc(R, elName(Y), [...new Set(near)].map(elName)),
            expl: `${elName(X)[0].toUpperCase() + elName(X).slice(1)} and ${elName(Y)} are both ${fam[0].replace(/^an? /, '').replace(/gas$/, 'gase').replace(/element$/, 'element')}s: same number and arrangement of valence electrons (same column of the periodic table), hence similar chemistry.`,
          };
        }
        if (v === 'family') {
          const pool = FAMILY.slice(0, 4).flatMap(f => f[1]).concat([21, 22, 23, 25, 26, 27, 28]);
          const Z = R.pick(pool);
          const f = famOf(Z);
          const name = f ? f[0] : 'a transition metal';
          const cfg = groundCfg(Z);
          return {
            q: `An element has the ground-state configuration $${cfgTeX(cfg, coreFor(Z))}$. To which family does it belong?`,
            ...GRE.mc(R, name, ['an alkali metal', 'an alkaline-earth metal', 'a halogen', 'a noble gas', 'a transition metal'].filter(x => x !== name)),
            expl: `This is ${elName(Z)}. Alkali metals have one s electron beyond a noble-gas core, alkaline-earth metals two; halogens are one electron short of a closed p shell; noble gases have closed shells; transition metals are filling a d subshell.`,
          };
        }
        const choices = [[3, 11, 19, 37], [4, 12, 20, 38], [9, 17, 35], [8, 16, 34]];
        const qs = [1, 2, -1, -2];
        const gi = R.int(0, 3), Z = R.pick(choices[gi]), q = qs[gi];
        const sym = ELEM[Z][0];
        const ion = k => raw`$\text{${sym}}^{${Math.abs(k) === 1 ? '' : Math.abs(k)}${k > 0 ? '+' : '-'}}$`;
        return {
          q: `Which ion does ${elName(Z)} ($Z = ${Z}$) most readily form in ionic compounds?`,
          ...GRE.mc(R, ion(q), [1, 2, 3, -1, -2, -3].filter(k => k !== q).map(ion)),
          expl: `${elName(Z)[0].toUpperCase() + elName(Z).slice(1)} ($${cfgTeX(groundCfg(Z), coreFor(Z))}$) ${q > 0 ? `gives up its ${q} outer s electron${q > 1 ? 's' : ''}` : `gains ${-q} electron${q < -1 ? 's' : ''} to complete its p subshell`}, reaching a noble-gas configuration.`,
        };
      },
    },
    {
      id: 'atomic.shell.moseley', sec: '5.7.3', level: 2, weight: 2,
      gen(R) {
        const v = R.weighted(['E', 'lam', 'Z', 'ratio'], [3, 2, 2, 2]);
        const MOS = raw`Moseley's law treats the $n = 2 \to 1$ (K$\alpha$) transition as hydrogen-like with the nuclear charge screened by the remaining $1s$ electron: $E_{K\alpha} = (13.6\,\text{eV})(Z - 1)^2\left(1 - \tfrac14\right) = (10.2\,\text{eV})(Z - 1)^2$.`;
        const Ek = z => 0.75 * RY * (z - 1) * (z - 1);
        if (v === 'E' || v === 'lam') {
          const Z = R.int(12, 50);
          const E = Ek(Z);
          const W = [0.75 * RY * Z * Z, RY * (Z - 1) * (Z - 1), RY * Z * Z, 0.75 * RY * (Z - 2) * (Z - 2), 0.75 * RY * (Z - 1)];
          if (v === 'E') {
            return {
              q: `Using Moseley's law, estimate the energy of the K$\\alpha$ X-ray line of ${elFull(Z)}.`,
              ...GRE.numeric(R, E / 1000, W.map(x => x / 1000), { unit: raw`\text{keV}`, sig: 3, tol: 0.05 }),
              expl: MOS + raw` With $Z - 1 = ${Z - 1}$: $E \approx 10.2\times ${(Z - 1) * (Z - 1)}\,\text{eV} = ${F.num(E / 1000, 3)}\,\text{keV}$.`,
            };
          }
          const lam = HC / E * 1000;
          return {
            q: `Using Moseley's law, estimate the wavelength of the K$\\alpha$ X-ray line of ${elFull(Z)}.`,
            ...GRE.numeric(R, lam, W.map(x => HC / x * 1000), { unit: raw`\text{pm}`, sig: 3, tol: 0.05 }),
            expl: MOS + raw` $E \approx ${F.num(E / 1000, 3)}\,\text{keV}$, so $\lambda = hc/E = (1240\,\text{eV}\cdot\text{nm})/E = ${F.num(lam, 3)}\,\text{pm}$.`,
          };
        }
        if (v === 'Z') {
          const Z = R.int(13, 50);
          const E = Ek(Z);
          const noScr = Math.round(Math.sqrt(E / (0.75 * RY)));       // forgot the screening: gives Z - 1
          const no34 = Math.round(1 + Math.sqrt(E / RY));               // forgot the 3/4
          const cands = [noScr, no34, Z + 1, Z + 2, Z - 2].filter(z => z !== Z && z >= 1 && z <= 50);
          return {
            q: `The K$\\alpha$ X-ray line of an element is measured to have energy $${F.num(E / 1000, 3)}\\,\\text{keV}$. According to Moseley's law, which element is it?`,
            ...GRE.mc(R, elFull(Z), [...new Set(cands)].map(elFull), { rank: t => +t.match(/Z = (\d+)/)[1] }),
            expl: MOS + raw` So $Z - 1 = \sqrt{${F.num(E, 4)}/10.2} = ${Z - 1}$ and $Z = ${Z}$. Forgetting the screening gives $Z = ${Z - 1}$.`,
          };
        }
        const nice = [[1, 2], [2, 3], [3, 4], [1, 3], [3, 5], [2, 5], [4, 5], [1, 4]];
        const [p, q] = R.pick(nice);
        const m = R.int(Math.ceil(10 / p), Math.floor(48 / q));
        const a = p * m, b = q * m;
        const Z1 = a + 1, Z2 = b + 1;
        const freq = R.bool();
        const corr = freq ? [a * a, b * b] : [b * b, a * a];
        return {
          q: `According to Moseley's law, what is the ratio of the K$\\alpha$ ${freq ? 'frequency' : 'wavelength'} of ${elFull(Z1)} to that of ${elFull(Z2)}?`,
          ...ratChoices(R, corr, [[corr[1], corr[0]], [freq ? a : b, freq ? b : a], [freq ? Z1 * Z1 : Z2 * Z2, freq ? Z2 * Z2 : Z1 * Z1], [freq ? b : a, freq ? a : b], [freq ? Math.pow(a, 4) : Math.pow(b, 4), freq ? Math.pow(b, 4) : Math.pow(a, 4)]]),
          expl: raw`K$\alpha$ frequencies scale as $(Z - 1)^2$: $f_1/f_2 = (${a}/${b})^2 = ${F.frac(a * a, b * b)}$${freq ? '' : raw`, and wavelengths go inversely, $\lambda_1/\lambda_2 = ${F.frac(b * b, a * a)}$`}. Using $Z$ instead of $Z - 1$ is the trap.`,
        };
      },
    },
    {
      id: 'atomic.shell.xray', sec: '5.7.3', level: 2,
      gen(R) {
        const v = R.weighted(['lmin', 'V', 'change'], [3, 2, 2]);
        if (v === 'lmin') {
          const V = R.pick([10, 12, 15, 20, 25, 30, 35, 40, 45, 50, 60, 70, 80, 90, 100, 120, 150]);
          const lam = HC / V; // pm (1240 eV nm / kV)
          return {
            q: `An X-ray tube is operated at an accelerating voltage of $${V}\\,\\text{kV}$. What is the shortest wavelength in the continuous (bremsstrahlung) X-ray spectrum?`,
            ...GRE.numeric(R, lam, [2 * lam, lam / 2, lam / (2 * Math.PI), 2 * Math.PI * lam, lam * 4], { unit: raw`\text{pm}`, sig: 2 }),
            expl: raw`The most energetic photon takes all of an electron's kinetic energy $eV$ (Duane–Hunt limit): $\lambda_{\min} = hc/(eV) = (1240\,\text{eV}\cdot\text{nm})/(${V}\times10^{3}\,\text{eV}) = ${F.num(lam, 2)}\,\text{pm}$.`,
          };
        }
        if (v === 'V') {
          const lam = R.pick([10, 12, 15, 20, 25, 31, 40, 50, 62, 80, 100, 124]);
          const V = HC / lam;
          return {
            q: `The continuous X-ray spectrum of a tube cuts off sharply at a minimum wavelength of $${lam}\\,\\text{pm}$. What is the accelerating voltage of the tube?`,
            ...GRE.numeric(R, V, [2 * V, V / 2, V * 2 * Math.PI, V / (2 * Math.PI), V * 1000], { unit: raw`\text{kV}`, sig: 2 }),
            expl: raw`$eV = hc/\lambda_{\min}$, so $V = (1240\,\text{eV}\cdot\text{nm})/(${lam}\times10^{-3}\,\text{nm})/e = ${F.num(V, 2)}\,\text{kV}$.`,
          };
        }
        const k = R.pick([2, 3, 4]);
        const kw = { 2: 'doubled', 3: 'tripled', 4: 'quadrupled' }[k];
        if (R.bool()) {
          const c = `The cutoff wavelength decreases by a factor of ${k}; the characteristic lines do not shift.`;
          return {
            q: `The accelerating voltage of an X-ray tube, already well above the threshold for K-shell emission, is ${kw}. What happens to the short-wavelength cutoff of the continuous spectrum and to the wavelengths of the characteristic lines?`,
            ...GRE.mc(R, c, [
              `The cutoff wavelength decreases by a factor of ${k}; the characteristic lines also shift to shorter wavelength by a factor of ${k}.`,
              `The cutoff wavelength increases by a factor of ${k}; the characteristic lines do not shift.`,
              'Neither the cutoff wavelength nor the characteristic lines change; only the intensity grows.',
              `The cutoff wavelength decreases by a factor of ${k * k}; the characteristic lines do not shift.`,
              `The cutoff wavelength is unchanged; the characteristic lines shift to shorter wavelength.`,
            ]),
            expl: raw`$\lambda_{\min} = hc/eV$ scales as $1/V$, so it drops by ${k}. Characteristic lines are set by the target atom's inner-shell energies, which do not depend on the tube voltage.`,
          };
        }
        const [a, b] = R.pickN([['copper', 29], ['molybdenum', 42], ['tungsten', 74], ['silver', 47], ['iron', 26], ['chromium', 24]], 2);
        return {
          q: `In an X-ray tube operated at a fixed voltage of $${R.pick([40, 50, 60, 80, 100])}\\,\\text{kV}$, the ${a[0]} target ($Z = ${a[1]}$) is replaced by a ${b[0]} target ($Z = ${b[1]}$). Which of the following is true?`,
          ...GRE.mc(R, `The cutoff wavelength of the continuous spectrum is unchanged, but the characteristic lines shift to ${b[1] > a[1] ? 'shorter' : 'longer'} wavelengths.`, [
            `The cutoff wavelength shifts to ${b[1] > a[1] ? 'shorter' : 'longer'} wavelength, and the characteristic lines are unchanged.`,
            'Both the cutoff wavelength and the characteristic lines are unchanged.',
            `The characteristic lines shift to ${b[1] > a[1] ? 'longer' : 'shorter'} wavelengths, and the cutoff is unchanged.`,
            `Both the cutoff wavelength and the characteristic lines shift to ${b[1] > a[1] ? 'shorter' : 'longer'} wavelengths.`,
          ]),
          expl: raw`The cutoff $\lambda_{\min} = hc/eV$ depends only on the voltage. Characteristic lines scale as $(Z - 1)^2$ in energy (Moseley), so a ${b[1] > a[1] ? 'heavier' : 'lighter'} target gives ${b[1] > a[1] ? 'higher-energy, shorter' : 'lower-energy, longer'}-wavelength lines.`,
        };
      },
    },
    {
      id: 'atomic.shell.helium', sec: '5.7.3', level: 2,
      gen(R) {
        const T = [
          [raw`The ground state $1s^2$ is a spin singlet ($S = 0$).`, 'the symmetric spatial state $1s^2$ needs an antisymmetric spin state'],
          [raw`For the excited configuration $1s2s$, the triplet ($S = 1$) level lies below the singlet ($S = 0$) level.`, 'the antisymmetric spatial wavefunction reduces the electron–electron repulsion'],
          [raw`In the $1s2s$ triplet states, the spatial wavefunction is antisymmetric under exchange of the two electrons.`, 'the symmetric spin triplet requires it'],
          ['Electric-dipole transitions between singlet (para) and triplet (ortho) states are forbidden in LS coupling.', '$\\Delta S = 0$'],
          [raw`There is no triplet state with configuration $1s^2$.`, 'both electrons would have the same spatial state and the same spin, violating the Pauli principle'],
          [raw`Removing the remaining electron from $\text{He}^{+}$ requires $54.4\,\text{eV}$.`, '$13.6\\,Z^2$ with $Z = 2$'],
          [raw`The $1s2s\ {}^{3}S_{1}$ state is metastable.`, 'it cannot decay to $1s^2\\ {}^{1}S_{0}$ by an allowed electric-dipole transition'],
        ];
        const Fs = [
          [raw`The ground state $1s^2$ is a spin triplet ($S = 1$).`, 'it is a singlet'],
          [raw`For the $1s2s$ configuration, the singlet level lies below the triplet level.`, 'the triplet is lower'],
          [raw`In the $1s2s$ triplet states, the spatial wavefunction is symmetric under exchange of the two electrons.`, 'the total wavefunction must be antisymmetric, and the triplet spin state is symmetric'],
          [raw`The ground-state energy of neutral helium is $-54.4\,\text{eV}$.`, 'it is about $-79.0\\,\\text{eV}$ ($-24.6 - 54.4$)'],
          [raw`The $1s2s\ {}^{3}S_{1}$ state decays rapidly to the ground state by electric-dipole emission.`, 'that would need $\\Delta S = 1$ and $\\Delta l = 0$'],
          [raw`The first ionization energy of neutral helium equals that of $\text{He}^{+}$.`, '24.6 eV vs 54.4 eV: the other electron screens the nucleus'],
        ];
        if (R.bool(0.25)) {
          return {
            q: raw`In helium, the $1s2s\ {}^{3}S_{1}$ level lies below the $1s2s\ {}^{1}S_{0}$ level. Which of the following best explains this?`,
            ...GRE.mc(R, 'The antisymmetric spatial wavefunction of the triplet keeps the two electrons farther apart, reducing their Coulomb repulsion.', [
              'Spin–orbit coupling lowers states with larger total spin.',
              'The magnetic dipole–dipole interaction between the parallel electron spins lowers the energy.',
              'The triplet has three states, so its energy is spread lower by the Zeeman effect of the nucleus.',
              'The symmetric spatial wavefunction of the triplet lets both electrons sit closer to the nucleus.',
              'The Pauli principle forbids the singlet from occupying the lowest spatial state.',
            ]),
            expl: 'Exchange symmetry: the triplet (symmetric spin) has an antisymmetric spatial part that vanishes when the electrons coincide, so the electron–electron repulsion is smaller. This is an electrostatic effect (the root of Hund’s first rule), not a magnetic one.',
          };
        }
        const st = romanSet(R, T, Fs);
        return { ...romanQ(R, 'Which of the following statements about the helium atom is (are) true?', st), expl: romanExpl(st) };
      },
    },
  ]);

  // =================================================================== 5.7.4 Stark and Zeeman effects
  function zeemanLines(u, l) {
    const gu = u[2] ? landeG(...u) : [0, 1], gl = l[2] ? landeG(...l) : [0, 1];
    const E = new Set(); let pairs = 0;
    for (let mu = -u[2]; mu <= u[2]; mu += 2) for (let ml = -l[2]; ml <= l[2]; ml += 2) {
      if (Math.abs(mu - ml) > 2) continue;
      if (u[2] === l[2] && mu === 0 && ml === 0) continue;
      pairs++; E.add(Math.round((gu[0] / gu[1] * mu - gl[0] / gl[1] * ml) * 1e6));
    }
    return { lines: E.size, pairs };
  }
  GRE.addTemplates('atomic', [
    {
      id: 'atomic.zeeman.normal', sec: '5.7.4', level: 2, weight: 2,
      gen(R) {
        const v = R.weighted(['dE', 'df', 'dlam', 'B', 'spread'], [2, 2, 2, 1, 1]);
        const B = R.pick([0.2, 0.3, 0.4, 0.5, 0.6, 0.8, 1, 1.2, 1.5, 2, 2.5, 3, 4, 5]);
        const dE = MUB * B;
        const intro = `A spectral line from a transition between two singlet ($S = 0$) levels is observed with the atoms in a uniform magnetic field of $${B}\\,\\text{T}$ (normal Zeeman effect).`;
        const mub = raw` ($\mu_B = 5.79\times10^{-5}\,\text{eV/T}$.)`;
        if (v === 'dE') return {
          q: intro + ' What is the energy separation between adjacent Zeeman components of the line?' + mub,
          ...GRE.numeric(R, dE, [2 * dE, dE / 2, 3 * dE, dE / (2 * Math.PI)], { unit: raw`\text{eV}`, sig: 2 }),
          expl: raw`For $S = 0$ the magnetic energy is $\mu_B B m_l$; with $\Delta m_l = 0, \pm1$ the line splits into three components separated by $\mu_B B = (5.79\times10^{-5})(${B})\,\text{eV} = ${F.num(dE, 2)}\,\text{eV}$. The factor 2 ($g_s$) belongs to spin, which is absent here.`,
        };
        if (v === 'df') {
          const f = dE / H_EVS / 1e9;
          return {
            q: intro + ' What is the frequency separation between adjacent Zeeman components? ($\\mu_B = 9.27\\times10^{-24}\\,\\text{J/T}$, $h = 6.63\\times10^{-34}\\,\\text{J}\\cdot\\text{s}$.)',
            ...GRE.numeric(R, f, [2 * f, f / 2, f * 2 * Math.PI, f / (2 * Math.PI)], { unit: raw`\text{GHz}`, sig: 2 }),
            expl: raw`$\Delta f = \mu_B B/h = (9.27\times10^{-24})(${B})/(6.63\times10^{-34})\,\text{Hz} = ${F.num(f, 2)}\,\text{GHz}$ (about $14\,\text{GHz}$ per tesla).`,
          };
        }
        if (v === 'dlam') {
          const lam = R.pick([400, 450, 480, 500, 550, 600, 644, 650]);
          const dl = lam * lam * dE / HC * 1000; // pm
          return {
            q: intro + ` The zero-field wavelength of the line is $${lam}\\,\\text{nm}$. What is the wavelength separation between adjacent components?` + mub,
            ...GRE.numeric(R, dl, [2 * dl, dl / 2, dl * 2 * Math.PI, dl * 10, dl / 10], { unit: raw`\text{pm}`, sig: 2 }),
            level: 3,
            expl: raw`$|\Delta\lambda| = \lambda^2\Delta E/(hc) = (${lam}\,\text{nm})^2(${F.num(dE, 3)}\,\text{eV})/(1240\,\text{eV}\cdot\text{nm}) = ${F.num(dl, 2)}\,\text{pm}$ — tiny compared with $\lambda$, since $\Delta\lambda/\lambda = \Delta E/E$.`,
          };
        }
        if (v === 'B') {
          const E = F.round(dE, 2);
          const Bt = E / MUB;
          return {
            q: `In the normal Zeeman effect, adjacent components of a spectral line are separated in energy by $${F.sci(E, 2)}\\,\\text{eV}$. What is the magnetic field?` + mub,
            ...GRE.numeric(R, Bt, [Bt / 2, 2 * Bt, Bt * 2 * Math.PI, Bt / 10], { unit: raw`\text{T}`, sig: 2 }),
            level: 1,
            expl: raw`$B = \Delta E/\mu_B = ${F.sci(E, 2)}/(5.79\times10^{-5})\,\text{T} = ${F.num(Bt, 2)}\,\text{T}$.`,
          };
        }
        return {
          q: intro + ' What is the energy difference between the highest- and lowest-energy components of the split line?' + mub,
          ...GRE.numeric(R, 2 * dE, [dE, 4 * dE, 3 * dE, dE / 2], { unit: raw`\text{eV}`, sig: 2 }),
          expl: raw`The three components ($\Delta m_l = +1, 0, -1$) are spaced by $\mu_B B$, so the outer two differ by $2\mu_B B = ${F.num(2 * dE, 2)}\,\text{eV}$.`,
        };
      },
    },
    {
      id: 'atomic.zeeman.count', sec: '5.7.4', level: 2, weight: 2,
      gen(R) {
        const v = R.weighted(['l', 'J', 'normal', 'anom', 'SG'], [1, 2, 2, 3, 2]);
        if (v === 'l') {
          const L = R.int(1, 4), ans = 2 * L + 1;
          return {
            q: `An atomic level with $S = 0$ and $L = ${L}$ (a $${termL(0, L)}$ level) is placed in a weak magnetic field. Into how many sublevels does it split?`,
            ...intChoices(R, ans, [2 * L, 2 * L + 2, L + 1, 2 * ans, L], { min: 1 }), level: 1,
            expl: raw`The field lifts the degeneracy in $m_l = -L, \dots, L$: $2L + 1 = ${ans}$ equally spaced sublevels.`,
          };
        }
        if (v === 'J') {
          const S2 = R.int(1, 4), L = R.int(0, 3), J2 = R.pick(Jvals(S2, L));
          if (J2 === 0) throw new Error('J0');
          const ans = J2 + 1;
          return {
            q: `Into how many sublevels does the atomic level $${term(S2, L, J2)}$ split in a weak magnetic field?`,
            ...intChoices(R, ans, [(S2 + 1) * (2 * L + 1), 2 * L + 1, S2 + 1, J2, 2 * ans].filter(x => x !== ans), { min: 1 }),
            expl: raw`In a weak field the good quantum numbers are $J, M_J$; the level splits into $2J + 1 = ${ans}$ sublevels with $\Delta E = g_J\mu_B B M_J$.`,
          };
        }
        if (v === 'normal') {
          const Lu = R.int(1, 4), Ll = Lu - R.pick([1, -1]);
          if (Ll < 0) throw new Error('neg');
          const pairs = zeemanLines([0, Lu, 2 * Lu], [0, Ll, 2 * Ll]).pairs;
          return {
            q: raw`A spectral line arises from the transition $${termL(0, Lu)}_{${Lu}} \to {}^{1}${LT[Ll]}_{${Ll}}$ between two singlet levels. Into how many components does it split in a magnetic field (normal Zeeman effect)?`,
            ...intChoices(R, 3, [pairs, (2 * Lu + 1) + (2 * Ll + 1), 2 * Lu + 1, (2 * Lu + 1) * (2 * Ll + 1), 2], { min: 1 }),
            expl: raw`With $S = 0$ both levels have $g = 1$, so a photon's energy shifts by $\mu_B B\,\Delta m$ with $\Delta m = 0, \pm 1$. The ${pairs} allowed $m \to m'$ transitions fall into just 3 distinct lines.`,
          };
        }
        if (v === 'anom') {
          const TR = [[[1, 1, 1], [1, 0, 1]], [[1, 1, 3], [1, 0, 1]], [[1, 0, 1], [1, 1, 1]], [[1, 0, 1], [1, 1, 3]], [[1, 2, 3], [1, 1, 1]], [[1, 2, 3], [1, 1, 3]], [[1, 2, 5], [1, 1, 3]], [[2, 0, 2], [2, 1, 0]], [[2, 0, 2], [2, 1, 2]], [[2, 0, 2], [2, 1, 4]], [[2, 2, 2], [2, 1, 0]], [[2, 2, 4], [2, 1, 2]]];
          const [u, l] = R.pick(TR);
          const z = zeemanLines(u, l);
          return {
            q: `In a weak magnetic field, into how many components does the $${term(...u)} \\to ${term(...l)}$ line split (anomalous Zeeman effect)?`,
            ...intChoices(R, z.lines, [3, z.pairs, (u[2] + 1) + (l[2] + 1), (u[2] + 1) * (l[2] + 1), u[2] + 1], { min: 1 }),
            level: 3,
            expl: raw`The photon energy shifts by $\mu_B B(g_u M_u - g_l M_l)$ with $\Delta M = 0, \pm1$ (and $M = 0 \to 0$ excluded when $\Delta J = 0$). With $g_u = ${u[2] ? F.frac(...landeG(...u)) : '0\\ (J = 0)'}$ and $g_l = ${l[2] ? F.frac(...landeG(...l)) : '0\\ (J = 0)'}$ the ${z.pairs} allowed transitions give ${z.lines} distinct lines. Because $g_u \ne g_l$ the pattern is not the normal triplet.`,
          };
        }
        const Z = R.pick(TERM_Z.concat([47, 47]));
        const t = Z === 47 ? { S2: 1, L: 0, J2: 1 } : groundTerm(Z);
        const show = R.bool(0.6) || Z === 47;
        const ans = t.J2 + 1;
        return {
          q: `A beam of ground-state ${elName(Z)} atoms${show ? ` (term $${term(t.S2, t.L, t.J2)}$)` : ` ($Z = ${Z}$)`} passes through a Stern–Gerlach apparatus. Ignoring nuclear spin, into how many beams does it split?`,
          ...intChoices(R, ans, [(t.S2 + 1) * (2 * t.L + 1), t.S2 + 1, 2 * t.L + 1, ans + 1, 2].filter(x => x !== ans), { min: 1 }),
          level: show ? 2 : 3,
          expl: raw`The beam splits into one component per $M_J$ value: $2J + 1 = ${ans}$ with $J = ${halfT(t.J2)}$ (ground term $${term(t.S2, t.L, t.J2)}$).${t.J2 === 0 ? ' A $J = 0$ atom has no magnetic moment and is not deflected.' : ''}`,
        };
      },
    },
    {
      id: 'atomic.zeeman.lande', sec: '5.7.4', level: 3,
      gen(R) {
        const v = R.weighted(['calc', 'split', 'qual'], [3, 2, 2]);
        const FORM = raw`$g_J = 1 + \dfrac{J(J+1) + S(S+1) - L(L+1)}{2J(J+1)}$`;
        if (v === 'qual') {
          const opts = [[0, 1, 2], [0, 2, 4], [0, 3, 6], [1, 0, 1], [2, 0, 2], [3, 0, 3], [4, 0, 4], [5, 0, 5], [6, 0, 6]];
          const [S2, L, J2] = R.pick(opts);
          const g = landeG(S2, L, J2);
          return {
            q: `What is the Landé $g$-factor of an atomic level $${term(S2, L, J2)}$?`,
            ...ratChoices(R, g, [[1, 1], [2, 1], [2, 3], [4, 3], [1, 2], [3, 2], [0, 1]].filter(x => x[0] * g[1] !== x[1] * g[0]), { allowNeg: true }),
            level: 2,
            expl: S2 === 0 ? raw`With $S = 0$ the moment is purely orbital ($g_L = 1$), so $g_J = 1$ (normal Zeeman effect).` : raw`With $L = 0$ the moment is purely spin ($g_s \approx 2$), so $g_J = 2$.`,
          };
        }
        let S2, L, J2;
        do { S2 = R.int(1, 4); L = R.int(1, 3); J2 = R.pick(Jvals(S2, L)); } while (J2 === 0);
        const jj = J2 * (J2 + 2), ss = S2 * (S2 + 2), ll = 4 * L * (L + 1);
        const g = landeG(S2, L, J2);
        if (v === 'calc') {
          return {
            q: `The Landé factor is ${FORM}. What is $g_J$ for the level $${term(S2, L, J2)}$?`,
            ...ratChoices(R, g, [[3 * jj + ll - ss, 2 * jj], [jj - ss + ll, 2 * jj], [jj + ss - ll, 2 * jj], [1, 1], [2, 1], [3 * jj + ss - ll, jj]], { allowNeg: true }),
            expl: raw`$J(J+1) = ${F.frac(jj, 4)}$, $S(S+1) = ${F.frac(ss, 4)}$, $L(L+1) = ${ll / 4}$: $g_J = 1 + \dfrac{${F.frac(jj + ss - ll, 4)}}{${F.frac(jj, 2)}} = ${F.frac(...g)}$.`,
          };
        }
        const B = R.pick([0.5, 1, 1.5, 2, 3]);
        const dE = g[0] / g[1] * MUB * B;
        if (dE <= 0) throw new Error('g<=0');
        return {
          q: `The Landé factor is ${FORM}. In a weak magnetic field of $${B}\\,\\text{T}$, what is the energy spacing between adjacent $M_J$ sublevels of the $${term(S2, L, J2)}$ level? ($\\mu_B = 5.79\\times10^{-5}\\,\\text{eV/T}$.)`,
          ...GRE.numeric(R, dE, [MUB * B, 2 * MUB * B, dE / 2, 2 * dE], { unit: raw`\text{eV}`, sig: 2, tol: 0.1 }),
          expl: raw`$\Delta E = g_J\mu_B B\,\Delta M_J$ with $g_J = ${F.frac(...g)}$: $${F.frac(...g)}\times(5.79\times10^{-5})(${B})\,\text{eV} = ${F.num(dE, 2)}\,\text{eV}$.`,
        };
      },
    },
    {
      id: 'atomic.zeeman.esr', sec: '5.7.4', level: 2,
      gen(R) {
        const v = R.weighted(['f', 'B', 'dE', 'lam'], [3, 2, 2, 1]);
        const B = R.pick([0.1, 0.2, 0.25, 0.3, 0.35, 0.5, 0.8, 1, 1.5, 2, 3]);
        const fper = 2 * C.muB / C.h; // Hz per tesla
        const note = raw` (Take $g_s = 2$, $\mu_B = 9.27\times10^{-24}\,\text{J/T}$, $h = 6.63\times10^{-34}\,\text{J}\cdot\text{s}$.)`;
        if (v === 'f') {
          const f = fper * B / 1e9;
          return {
            q: `A free electron sits in a uniform magnetic field of $${B}\\,\\text{T}$. What frequency of radiation induces transitions between its spin-up and spin-down states (electron spin resonance)?` + note,
            ...GRE.numeric(R, f, [f / 2, 2 * f, f / (2 * Math.PI), f * 2 * Math.PI], { unit: raw`\text{GHz}`, sig: 2 }),
            expl: raw`$\Delta E = g_s\mu_B B = 2\mu_B B$ (from $m_s = -\tfrac12$ to $+\tfrac12$), so $f = 2\mu_B B/h = ${F.num(f, 2)}\,\text{GHz}$ — about $28\,\text{GHz}$ per tesla. Forgetting $g_s = 2$ gives half.`,
          };
        }
        if (v === 'B') {
          const f = R.pick([9.5, 24, 35, 94, 14, 2.8]);
          const Bt = f * 1e9 / fper;
          return {
            q: `In an electron spin resonance experiment, free electrons absorb microwaves of frequency $${f}\\,\\text{GHz}$. What magnetic field is applied?` + note,
            ...GRE.numeric(R, Bt, [Bt / 2, 2 * Bt, Bt * 2 * Math.PI, Bt / (2 * Math.PI)], { unit: raw`\text{T}`, sig: 2 }),
            expl: raw`$hf = 2\mu_B B$, so $B = hf/(2\mu_B) = ${F.num(Bt, 2)}\,\text{T}$.`,
          };
        }
        if (v === 'dE') {
          const dE = 2 * MUB * B;
          return {
            q: `What is the energy difference between the two spin states of a free electron in a magnetic field of $${B}\\,\\text{T}$? (Take $g_s = 2$ and $\\mu_B = 5.79\\times10^{-5}\\,\\text{eV/T}$.)`,
            ...GRE.numeric(R, dE, [dE / 2, 2 * dE, dE / 4, dE * 2 * Math.PI], { unit: raw`\text{eV}`, sig: 2 }),
            level: 1,
            expl: raw`$U = -\boldsymbol{\mu}\cdot\mathbf{B} = g_s\mu_B B m_s$, so the two states differ by $g_s\mu_B B = 2\mu_B B = ${F.num(dE, 2)}\,\text{eV}$.`,
          };
        }
        const lam = C.c / (fper * B) * 100;
        return {
          q: `What is the wavelength of the radiation that flips the spin of a free electron in a magnetic field of $${B}\\,\\text{T}$?` + note,
          ...GRE.numeric(R, lam, [2 * lam, lam / 2, lam * 2 * Math.PI, lam / 10], { unit: raw`\text{cm}`, sig: 2 }),
          expl: raw`$f = 2\mu_B B/h = ${F.num(fper * B, 2)}\,\text{Hz}$, so $\lambda = c/f = ${F.num(lam, 2)}\,\text{cm}$ (microwaves).`,
        };
      },
    },
    {
      id: 'atomic.zeeman.regimes', sec: '5.7.4', level: 3,
      gen(R) {
        const Q = [
          ['In a weak magnetic field (Zeeman energy much smaller than the fine-structure splitting), which quantum numbers label the energy eigenstates of hydrogen?', '$n, l, j, m_j$', ['$n, l, m_l, m_s$', '$n, m_l$ only', '$n, j$ only', '$n, l, m_l, m_j$', '$n, s, m_s$ only'], 'Fine structure dominates, so $\\mathbf{J}$ is (nearly) conserved; the weak field only splits each $j$ level according to $m_j$.'],
          ['In a strong magnetic field (Paschen–Back regime, Zeeman energy much larger than the fine-structure splitting), which quantum numbers label the energy eigenstates of hydrogen?', '$n, l, m_l, m_s$', ['$n, l, j, m_j$', '$n, j, m_j$ only', '$n, l, j$ only', '$n$ and $j$ only', '$n, j, m_l$'], 'The field couples to $L_z + 2S_z$, which commutes with $L_z$ and $S_z$ separately; spin–orbit coupling is a small correction, so $j$ is no longer a good quantum number.'],
          ['In the strong-field (Paschen–Back) limit, the Zeeman energy shift of a hydrogen state is', '$\\mu_B B\\,(m_l + 2m_s)$', ['$g_J\\mu_B B\\,m_j$', '$\\mu_B B\\,(m_l + m_s)$', '$2\\mu_B B\\,m_l$', '$\\mu_B B\\,m_j$', '$\\mu_B B\\,(2m_l + m_s)$'], 'The Zeeman Hamiltonian is $(e/2m)(\\mathbf{L} + 2\\mathbf{S})\\cdot\\mathbf{B}$, diagonal in $m_l, m_s$: $\\mu_B B(m_l + 2m_s)$ (spin $g$-factor 2).'],
          ['In the weak-field limit, the Zeeman energy shift of a fine-structure level is', '$g_J\\mu_B B\\,m_j$', ['$\\mu_B B\\,(m_l + 2m_s)$', '$\\mu_B B\\,m_j$', '$2\\mu_B B\\,m_j$', '$g_J\\mu_B B\\,j$', '$\\mu_B B\\,(m_l + m_s)$'], 'Within a level of fixed $j$, $\\langle\\mathbf{L} + 2\\mathbf{S}\\rangle$ is proportional to $\\mathbf{J}$ with the Landé factor $g_J$, giving $g_J\\mu_B B m_j$.'],
          ['In a strong magnetic field, which of the following is no longer a good quantum number for hydrogen?', '$j$', ['$n$', '$l$', '$m_l$', '$m_s$', '$s$'], 'A strong external field decouples $\\mathbf{L}$ and $\\mathbf{S}$, so $\\mathbf{J}^2$ no longer commutes with the dominant Hamiltonian; $n, l, s, m_l, m_s$ remain good.'],
          ['The Zeeman effect in an atom with $S \\ne 0$ is called “anomalous” because', 'the electron spin has $g \\approx 2$, so levels split by amounts that are not simple multiples of $\\mu_B B$', ['the splitting is quadratic in the magnetic field', 'the lines split into exactly three components', 'the splitting is independent of the magnetic field', 'it occurs only in electric fields', 'the nuclear spin dominates the splitting'], 'Classical (orbital) theory gives the normal triplet with spacing $\\mu_B B$; spin, with $g_s \\approx 2$, gives level-dependent $g_J$ and more complex patterns.'],
          ['In a weak magnetic field along $z$, which sublevel of a level with $g_J > 0$ has the lowest energy?', 'the sublevel with the most negative $m_j$', ['the sublevel with the most positive $m_j$', 'the sublevel with $m_j = 0$', 'all sublevels have the same energy', 'the sublevel with the largest $|m_j|$, regardless of sign', 'it depends on the sign of the electron charge only for $j = 1/2$'], 'The shift is $g_J\\mu_B B m_j$, lowest for the most negative $m_j$ (magnetic moment aligned with the field).'],
        ];
        const [q, c, w, why] = R.pick(Q);
        return { q, ...GRE.mc(R, c, w), expl: why };
      },
    },
    {
      id: 'atomic.stark.concepts', sec: '5.7.4', level: 2,
      gen(R) {
        const T = [
          ['The ground state of hydrogen has no energy shift linear in the applied field.', 'the nondegenerate $1s$ state has definite parity, so $\\langle z\\rangle = 0$'],
          ['The ground-state energy shift of hydrogen is proportional to the square of the field.', 'it arises in second order (induced dipole, polarizability)'],
          [raw`The $n = 2$ level of hydrogen shows a shift linear in the field because $2s$ and $2p$ are degenerate.`, 'degenerate states of opposite parity are mixed'],
          [raw`For a field along $z$, the $2p$ states with $m = \pm 1$ are not shifted to first order.`, '$eEz$ only couples states with equal $m$'],
          [raw`The linear Stark splitting of the hydrogen $n = 2$ level is of order $eEa_0$.`, 'the only length scale is $a_0$ (the exact shifts are $0, \\pm 3eEa_0$)'],
          ['The perturbing Hamiltonian for a field $E$ along $z$ is $eEz$.', 'potential energy of the electron charge $-e$'],
        ];
        const Fs = [
          ['The ground state of hydrogen has an energy shift linear in the applied field.', 'its first-order shift vanishes by parity'],
          [raw`For a field along $z$, the field mixes $2s$ with the $2p$ states having $m = \pm 1$.`, 'only $m = 0$ is coupled to $2s$'],
          [raw`All four $n = 2$ orbital states are shifted to first order.`, 'only two combinations of $2s$ and $2p_0$ shift'],
          [raw`The linear Stark effect splits the $n = 2$ level into four distinct energies.`, 'there are three: $+3eEa_0$, $0$ (twofold), $-3eEa_0$'],
          ['The Stark effect arises from the interaction of the electron’s magnetic moment with the applied field.', 'it is the electric dipole interaction'],
          ['An atom in a nondegenerate state generally has a shift linear in a weak applied electric field.', 'nondegenerate states have no permanent dipole moment'],
        ];
        if (R.bool(0.2)) {
          return {
            q: raw`To first order in a uniform electric field, into how many distinct energies does the hydrogen $n = 2$ level (ignoring spin and fine structure) split?`,
            ...intChoices(R, 3, [4, 2, 1, 5, 8], { min: 1 }),
            expl: raw`Degenerate perturbation theory with $eEz$ mixes $2s$ and $2p_0$ into states shifted by $\pm3eEa_0$, while $2p_{\pm1}$ stay unshifted: three distinct energies.`,
          };
        }
        const st = romanSet(R, T, Fs);
        return { ...romanQ(R, 'A hydrogen atom is placed in a uniform electric field (Stark effect). Which of the following statements is (are) true?', st), expl: romanExpl(st) };
      },
    },
    {
      id: 'atomic.stark.scaling', sec: '5.7.4', level: 2,
      gen(R) {
        if (R.bool(0.5)) {
          const k = R.pick([[2, 1], [3, 1], [4, 1], [1, 2], [1, 3], [3, 2], [5, 1], [10, 1]]);
          const gs = R.bool();
          const c = gs ? [k[0] * k[0], k[1] * k[1]] : k;
          const W = [k, [k[0] * k[0], k[1] * k[1]], [Math.pow(k[0], 3), Math.pow(k[1], 3)], [1, 1], [k[1], k[0]], [Math.pow(k[0], 4), Math.pow(k[1], 4)]].filter(x => x[0] * c[1] !== x[1] * c[0]);
          const fac = F.frac(k[0], k[1]);
          return {
            q: gs ? `A weak uniform electric field shifts the ground-state energy of hydrogen by $\\Delta E$. If the field strength is multiplied by $${fac}$, by what factor does the shift change?`
              : `A weak uniform electric field splits the $n = 2$ level of hydrogen (linear Stark effect). If the field strength is multiplied by $${fac}$, by what factor does the splitting change?`,
            ...ratChoices(R, c, W),
            expl: gs ? raw`The ground state has no permanent dipole, so the shift is second order: $\Delta E = -\tfrac12\alpha_{\text{pol}}E^2 \propto E^2$, giving $(${fac})^2 = ${F.frac(c[0], c[1])}$.`
              : raw`The degenerate $2s$/$2p_0$ states give a first-order shift $\pm3eEa_0$, linear in $E$, so the splitting changes by $${fac}$.`,
          };
        }
        const E = R.pick([1, 2, 3, 5]) * Math.pow(10, R.int(5, 7));
        const dE = 6 * A0NM * 1e-9 * E;
        return {
          q: raw`In a uniform electric field $E$, the first-order energy shifts of the hydrogen $n = 2$ level are $0$ and $\pm 3eEa_0$. For $E = ${F.sci(E, 1)}\,\text{V/m}$, what is the energy difference between the highest and lowest Stark components? ($a_0 = 5.3\times10^{-11}\,\text{m}$.)`,
          ...GRE.numeric(R, dE, [dE / 2, dE / 6, 2 * dE, dE * 1e-9 / 1e-9 / 3], { unit: raw`\text{eV}`, sig: 2 }),
          expl: raw`Highest minus lowest is $6eEa_0$; in eV this is $6Ea_0$ with $E$ in V/m and $a_0$ in m: $6(${F.sci(E, 1)})(5.29\times10^{-11}) = ${F.num(dE, 2)}\,\text{eV}$. Taking only $3eEa_0$ is the trap.`,
        };
      },
    },
  ]);

  // =================================================================== 5.7.5 Selection rules
  const st_ = (n, l) => `${n}${LS[l]}`;
  // random hydrogen state below n = nmax
  const randState = (R, nmin, nmax) => { const n = R.int(nmin, nmax); return [n, R.int(0, n - 1)]; };
  GRE.addTemplates('atomic', [
    {
      id: 'atomic.sel.allowed', sec: '5.7.5', level: 1, weight: 2,
      gen(R) {
        const absorb = R.bool(0.3), askForb = R.bool(0.35);
        const mk = allowed => {
          for (let t = 0; t < 50; t++) {
            const nl = R.int(1, 4), nu = R.int(nl + 1, 6);
            const ll = R.int(0, nl - 1), lu = R.int(0, nu - 1);
            if ((Math.abs(lu - ll) === 1) === allowed) return absorb ? `$${st_(nl, ll)} \\to ${st_(nu, lu)}$` : `$${st_(nu, lu)} \\to ${st_(nl, ll)}$`;
          }
          return null;
        };
        const c = mk(!askForb);
        const W = new Set(); for (let i = 0; i < 30 && W.size < 6; i++) { const w = mk(askForb); if (w && w !== c) W.add(w); }
        return {
          q: `Which of the following ${absorb ? 'absorption' : 'emission'} transitions in hydrogen is ${askForb ? 'FORBIDDEN' : 'allowed'} in the electric-dipole approximation?`,
          ...GRE.mc(R, c, [...W]),
          expl: raw`Electric-dipole selection rules: $\Delta l = \pm 1$ (and $\Delta m = 0, \pm1$), with no restriction on $\Delta n$. In ${c}, $\Delta l = ${(() => { const m = c.match(/[0-9]([a-z]) \\to [0-9]([a-z])/); return LS.indexOf(m[2]) - LS.indexOf(m[1]); })()}$, so it is ${askForb ? 'forbidden' : 'allowed'}; every other choice ${askForb ? 'has $|\\Delta l| = 1$' : 'has $\\Delta l = 0$ or $|\\Delta l| \\ge 2$'}.`,
        };
      },
    },
    {
      id: 'atomic.sel.cascade', sec: '5.7.5', level: 2,
      gen(R) {
        let n0, l0;
        do { [n0, l0] = randState(R, 4, 6); } while (n0 === 6 && l0 < 2);
        // random path from (n0, l0) down to 1s through valid states; allowedOnly forces Delta l = +-1
        const chain = allowedOnly => {
          const c = [[n0, l0]];
          let [n, l] = [n0, l0];
          while (n > 1) {
            const opts = [];
            for (let m = 1; m < n; m++) for (let k = 0; k < m; k++) {
              if (allowedOnly && (Math.abs(k - l) !== 1 || (m === 2 && k === 0))) continue;
              if (n - m > 3) continue;
              opts.push([m, k]);
            }
            if (!opts.length) return null;
            [n, l] = R.pick(opts);
            c.push([n, l]);
          }
          return c;
        };
        const ok = c => c.every((s, i) => i === 0 || Math.abs(s[1] - c[i - 1][1]) === 1);
        const fmt = c => '$' + c.map(s => st_(s[0], s[1])).join(' \\to ') + '$';
        let good = null;
        for (let t = 0; t < 30 && !good; t++) { const c = chain(true); if (c && ok(c)) good = c; }
        if (!good) throw new Error('no allowed chain');
        const W = new Set();
        // mutate the good chain: change one intermediate l, or insert/skip a step
        for (let t = 0; t < 60 && W.size < 6; t++) {
          const c = good.map(x => x.slice());
          const r = R.int(0, 2);
          if (r === 0 && c.length > 2) { const i = R.int(1, c.length - 2); c[i][1] = R.int(0, c[i][0] - 1); }
          else if (r === 1 && c.length > 2) c.splice(R.int(1, c.length - 2), 1);
          else { const x = chain(false); if (x) c.splice(0, c.length, ...x); }
          if (!ok(c)) W.add(fmt(c));
        }
        return {
          q: `A hydrogen atom is in the $${st_(n0, l0)}$ state. Which of the following decay sequences to the ground state consists entirely of electric-dipole-allowed single-photon transitions?`,
          ...GRE.mc(R, fmt(good), [...W]),
          expl: raw`Each step must have $\Delta l = \pm 1$ (any $\Delta n$). In ${fmt(good)} every step changes $l$ by one; each other sequence contains a step with $\Delta l = 0$ or $|\Delta l| \ge 2$. (Note $2s$ cannot decay to $1s$ by a single E1 photon.)`,
        };
      },
    },
    {
      id: 'atomic.sel.lower', sec: '5.7.5', level: 2,
      gen(R) {
        const [n, l] = randState(R, 3, 6);
        const targets = [];
        for (const lp of [l - 1, l + 1]) if (lp >= 0) for (let m = lp + 1; m < n; m++) targets.push([m, lp]);
        if (R.bool(0.5)) {
          const ans = targets.length;
          if (!ans) throw new Error('none');
          return {
            q: `Neglecting fine structure, to how many different states $n'l'$ with $n' < ${n}$ can a hydrogen atom in the $${st_(n, l)}$ state decay directly by emitting a single electric-dipole photon?`,
            ...intChoices(R, ans, [n - 1, n * (n - 1) / 2, ans + 1, ans - 1, 2 * ans], { min: 0 }),
            level: 3,
            expl: raw`Need $l' = l \pm 1 = ${[l - 1, l + 1].filter(x => x >= 0).join(raw`\text{ or }`)}$ and $l' < n' < ${n}$: ${targets.length ? targets.map(t => `$${st_(...t)}$`).join(', ') : 'none'} — ${ans} state${ans === 1 ? '' : 's'}.`,
          };
        }
        const cands = [];
        for (let m = 1; m < n; m++) for (let k = 0; k < m; k++) cands.push([m, k]);
        const pick = R.pickN(cands, 3);
        if (!pick.some(p => Math.abs(p[1] - l) === 1)) pick[0] = R.pick(targets.length ? targets : [[1, 0]]);
        if (!pick.some(p => Math.abs(p[1] - l) === 1)) throw new Error('no true');
        const keys = new Set(pick.map(p => p.join())); if (keys.size < 3) throw new Error('dup');
        const st = pick.map(p => [[`$${st_(...p)}$`, `$\\Delta l = ${p[1] - l}$`], Math.abs(p[1] - l) === 1]);
        return { ...romanQ(R, `A hydrogen atom in the $${st_(n, l)}$ state can decay directly, by a single electric-dipole photon, to which of the following states?`, st), expl: 'Only $\\Delta l = \\pm1$ is allowed (no rule on $\\Delta n$). ' + romanExpl(st) };
      },
    },
    {
      id: 'atomic.sel.terms', sec: '5.7.5', level: 3,
      gen(R) {
        let S;
        const he = R.bool(0.55);
        if (he) {
          S = [['1s^{2}', 0, 0, 0, 0]];
          for (const [n, l] of [[2, 0], [2, 1], [3, 0], [3, 1], [3, 2]]) for (const s2 of [0, 2]) for (const j of Jvals(s2, l)) S.push([`1s${n}${LS[l]}`, s2, l, j, l]);
        } else {
          S = [];
          for (const [n, l] of [[3, 0], [3, 1], [3, 2], [4, 0], [4, 1], [4, 2], [4, 3]]) for (const j of Jvals(1, l)) S.push([`${n}${LS[l]}`, 1, l, j, l]);
        }
        const fmt = s => `${s[0]}\\ ${term(s[1], s[2], s[3])}`;
        const why = (a, b) => {
          if (a[1] !== b[1]) return '$\\Delta S \\ne 0$';
          if (Math.abs(a[4] - b[4]) !== 1) return 'no parity change ($\\Delta l \\ne \\pm1$)';
          if (Math.abs(a[3] - b[3]) > 2) return '$|\\Delta J| > 1$';
          if (a[3] === 0 && b[3] === 0) return '$J = 0 \\to 0$';
          return '';
        };
        const pair = () => { const [a, b] = R.pickN(S, 2); return [a, b]; };
        const askForb = R.bool(0.4);
        const want = !askForb;
        let c = null; const W = new Map();
        for (let t = 0; t < 400 && (!c || W.size < 6); t++) {
          const [a, b] = pair();
          if (a[0] === b[0] && a[1] === b[1] && a[2] === b[2]) continue;
          const allowed = why(a, b) === '';
          const s = `$${fmt(a)} \\leftrightarrow ${fmt(b)}$`;
          if (allowed === want && !c) c = [s, why(a, b)];
          else if (allowed !== want && !W.has(s)) W.set(s, why(a, b));
        }
        if (!c) throw new Error('none');
        return {
          q: `${he ? 'In helium' : 'In sodium (one valence electron outside closed shells)'}, which of the following transitions is ${askForb ? 'FORBIDDEN' : 'allowed'} for electric-dipole radiation in LS coupling?`,
          ...GRE.mc(R, c[0], [...W.keys()]),
          expl: raw`E1 rules in LS coupling: $\Delta S = 0$; parity must change (here $\Delta l = \pm1$ for the active electron); $\Delta L = 0, \pm1$; $\Delta J = 0, \pm1$ but not $J = 0 \to 0$. ${askForb ? `${c[0]} violates: ${c[1]}.` : `${c[0]} satisfies all of them; each other choice violates at least one.`}`,
        };
      },
    },
    {
      id: 'atomic.sel.mrules', sec: '5.7.5', level: 2,
      gen(R) {
        const v = R.weighted(['which', 'pol', 'count'], [4, 2, 1]);
        if (v === 'which') {
          const ket = (n, l, m) => `|${n}, ${l}, ${m}\\rangle`;
          const mk = good => {
            for (let t = 0; t < 60; t++) {
              const nl = R.int(1, 4), nu = R.int(nl + 1, 5), ll = R.int(0, nl - 1), lu = R.int(0, nu - 1);
              const ml = R.int(-ll, ll), mu = R.int(-lu, lu);
              const ok = Math.abs(lu - ll) === 1 && Math.abs(mu - ml) <= 1;
              if (ok === good && (good || Math.abs(lu - ll) === 1 || R.bool(0.4))) return `$${ket(nu, lu, mu)} \\to ${ket(nl, ll, ml)}$`;
            }
            return null;
          };
          const c = mk(true); const W = new Set(); for (let i = 0; i < 40 && W.size < 6; i++) { const w = mk(false); if (w) W.add(w); }
          return {
            q: 'Hydrogen states are labeled $|n, l, m\\rangle$. Which of the following transitions is allowed in the electric-dipole approximation?',
            ...GRE.mc(R, c, [...W]),
            expl: raw`Need $\Delta l = \pm1$ and $\Delta m = 0, \pm1$ (the photon carries one unit of angular momentum). Only ${c} satisfies both; the others have $\Delta l \ne \pm1$ or $|\Delta m| \ge 2$.`,
          };
        }
        if (v === 'pol') {
          const Q = [
            ['Atoms are illuminated by light linearly polarized along the quantization ($z$) axis. Which electric-dipole transitions can it drive?', '$\\Delta m = 0$ only', 'The perturbation $eEz$ is invariant under rotations about $z$, so it cannot change $m$.'],
            ['Atoms are illuminated by circularly polarized light traveling along $+z$ with positive helicity ($\\sigma^+$). Which transitions can it drive in absorption?', '$\\Delta m = +1$ only', 'Each $\\sigma^+$ photon carries $+\\hbar$ of angular momentum along $z$, so absorption raises $m$ by one.'],
            ['In the normal Zeeman effect viewed along the magnetic field direction, which components of a line are observed?', 'only the $\\Delta m = \\pm1$ components, circularly polarized', 'The $\\Delta m = 0$ ($\\pi$) component radiates like a dipole along $\\mathbf{B}$, which emits nothing along its axis; the $\\sigma$ components appear circularly polarized.'],
            ['In the normal Zeeman effect viewed perpendicular to the magnetic field, how is the central ($\\Delta m = 0$) component polarized?', 'linearly, parallel to $\\mathbf{B}$', 'The $\\pi$ component comes from a dipole oscillating along $\\mathbf{B}$, so seen sideways it is linearly polarized along $\\mathbf{B}$.'],
          ];
          const ALL = ['$\\Delta m = 0$ only', '$\\Delta m = +1$ only', '$\\Delta m = \\pm1$ only', '$\\Delta m = 0, \\pm1$', '$\\Delta m = \\pm2$ only', 'only the $\\Delta m = \\pm1$ components, circularly polarized', 'only the $\\Delta m = 0$ component, linearly polarized', 'all three components, unpolarized', 'linearly, parallel to $\\mathbf{B}$', 'linearly, perpendicular to $\\mathbf{B}$', 'circularly', 'it is unpolarized'];
          const i = R.int(0, 3); const [q, c, why] = Q[i];
          const pool = i < 2 ? ALL.slice(0, 5) : i === 2 ? ALL.slice(5, 8).concat(['only the $\\Delta m = 0$ component, circularly polarized', 'all three components, linearly polarized']) : ALL.slice(8);
          if (i === 3) pool.push('elliptically');
          return { q, ...GRE.mc(R, c, pool.filter(x => x !== c)), expl: why };
        }
        const l = R.int(1, 4), ans = 3 * (2 * l - 1);
        return {
          q: `Ignoring spin, how many distinct electric-dipole-allowed transitions $(l = ${l}, m) \\to (l = ${l - 1}, m')$ are there between the $${2 * l + 1}$ magnetic sublevels of an upper level with $l = ${l}$ and those of a lower level with $l = ${l - 1}$?`,
          ...intChoices(R, ans, [(2 * l + 1) * (2 * l - 1), 3, 2 * l + 1, 2 * l - 1, ans + 2], { min: 1 }),
          level: 3,
          expl: raw`For each of the $2(l-1) + 1 = ${2 * l - 1}$ lower values $m'$, the upper $m = m', m' \pm 1$ all exist (since $|m'| \le l - 1$): $3\times${2 * l - 1} = ${ans}$.`,
        };
      },
    },
    {
      id: 'atomic.sel.metastable', sec: '5.7.5', level: 2,
      gen(R) {
        const v = R.int(0, 3);
        if (v === 0) {
          return {
            q: 'Which of the following hydrogen states cannot decay to any lower state by emitting a single electric-dipole photon?',
            ...GRE.mc(R, '$2s$', ['$2p$', '$3s$', '$3p$', '$3d$', '$4f$', '$4s$']),
            expl: raw`The only lower state of $2s$ is $1s$, with $\Delta l = 0$: E1-forbidden. $2s$ is metastable (lifetime about $0.1\,\text{s}$) and decays mainly by two-photon emission. $3s \to 2p$, $3d \to 2p$, $4f \to 3d$, etc. are all allowed.`,
          };
        }
        if (v === 1) {
          return {
            q: 'The $2s$ state of hydrogen is long-lived (metastable) primarily because',
            ...GRE.mc(R, 'the only lower state, $1s$, has the same $l$, so single-photon electric-dipole decay is forbidden', ['a state with zero angular momentum cannot radiate', 'the $2s \\to 1s$ energy difference is too small to emit a photon', 'the Lamb shift places $2s$ below $1s$', 'spin conservation forbids the decay', 'the $2s$ electron has zero probability of being near the nucleus']),
            expl: raw`$\Delta l = 0$ violates the E1 rule $\Delta l = \pm1$. The state decays slowly by two-photon emission (or is quenched by collisions or electric fields that mix it with $2p$).`,
          };
        }
        if (v === 2) {
          return {
            q: 'Which of the following excited states of helium is metastable?',
            ...GRE.mc(R, R.pick(['$1s2s\\ {}^{3}S_{1}$', '$1s2s\\ {}^{1}S_{0}$']), ['$1s2p\\ {}^{1}P_{1}$', '$1s3p\\ {}^{1}P_{1}$', '$1s3d\\ {}^{1}D_{2}$', '$1s3s\\ {}^{3}S_{1}$', '$1s2p\\ {}^{3}P_{2}$']),
            expl: raw`The $1s2s$ states are the lowest of their spin type ($1s2p$ lies above them), and decay to $1s^2\ {}^1S_0$ would need $\Delta l = 0$ (and for the triplet also $\Delta S \ne 0$). The other states decay by allowed E1 transitions to lower $1s2s$, $1s2p$ or ground states.`,
          };
        }
        return {
          q: 'Which of the following best characterizes a metastable atomic state?',
          ...GRE.mc(R, 'An excited state from which every decay to lower levels is forbidden by the electric-dipole selection rules', ['The ground state of an atom', 'An excited state with an unusually large decay rate', 'A state that cannot decay by any process at all', 'A state that is stable only in an external magnetic field', 'An excited state whose energy lies above the ionization limit']),
          expl: 'Metastable states decay only through slow, “forbidden” channels (magnetic dipole, electric quadrupole, two-photon, collisions), so they live far longer than the typical $10^{-8}\\,\\text{s}$ — the basis of many lasers.',
        };
      },
    },
    {
      id: 'atomic.sel.origin', sec: '5.7.5', level: 2,
      gen(R) {
        const T = [
          ['The photon carries one unit of angular momentum.', 'so $l$ and $m$ can change by at most one unit'],
          ['The electric dipole operator is odd under parity, so the initial and final states must have opposite parity.', 'states with the same $l$ have the same parity $(-1)^l$'],
          [raw`There is no selection rule on $\Delta n$ for hydrogen.`, 'any $\\Delta n$ is allowed if $\\Delta l = \\pm1$'],
          ['The rules hold in the electric-dipole approximation, which assumes the wavelength is much larger than the atom.', 'then the field is uniform over the atom'],
          ['Forbidden transitions can still occur through magnetic-dipole, electric-quadrupole or two-photon processes, at much lower rates.', 'forbidden means forbidden only in the E1 approximation'],
          [raw`With light linearly polarized along $z$, only $\Delta m = 0$ transitions are driven.`, 'the perturbation $\\propto z$ conserves $m$'],
        ];
        const Fs = [
          [raw`Electric-dipole transitions in hydrogen require $\Delta n = \pm 1$.`, 'there is no $\\Delta n$ rule'],
          [raw`Electric-dipole transitions with $\Delta l = \pm2$ are allowed because a photon can carry $2\hbar$.`, 'a single photon carries one unit; $\\Delta l = \\pm2$ needs quadrupole or two photons'],
          ['Transitions that are forbidden by the selection rules never occur under any circumstances.', 'they occur by higher-order processes'],
          ['The electric-dipole approximation assumes the wavelength is small compared with the size of the atom.', 'it is the opposite'],
          [raw`In LS coupling, electric-dipole transitions readily change the total spin $S$.`, '$\\Delta S = 0$'],
          [raw`A $J = 0 \to J = 0$ transition is allowed if the parity changes.`, '$J = 0 \\to 0$ is strictly forbidden for one photon'],
        ];
        const st = romanSet(R, T, Fs);
        return { ...romanQ(R, 'Which of the following statements about atomic selection rules is (are) correct?', st), expl: romanExpl(st) };
      },
    },
    {
      id: 'atomic.sel.absorb', sec: '5.7.5', level: 2,
      gen(R) {
        const INIT = [['hydrogen atoms in the $1s$ ground state', 1, 0], ['hydrogen atoms prepared in the metastable $2s$ state', 2, 0], ['hydrogen atoms in the $2p$ state', 2, 1], ['sodium atoms in the $3s$ ground state (one valence electron)', 3, 0], ['hydrogen atoms in the $3d$ state', 3, 2], ['sodium atoms in the excited $3p$ state', 3, 1]];
        const [desc, n0, l0] = R.pick(INIT);
        const cands = [];
        for (let n = n0 + 1; n <= n0 + 3; n++) for (let l = 0; l < Math.min(n, 4); l++) cands.push([n, l]);
        const pick = R.pickN(cands, 3);
        if (!pick.some(p => Math.abs(p[1] - l0) === 1)) { const t = cands.filter(p => Math.abs(p[1] - l0) === 1 && !pick.some(q => q.join() === p.join())); pick[R.int(0, 2)] = R.pick(t); }
        pick.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
        const st = pick.map(p => [[`$${st_(...p)}$`, `$\\Delta l = ${p[1] - l0}$`], Math.abs(p[1] - l0) === 1]);
        return { ...romanQ(R, `Light is shone on ${desc}. Which of the following states can be reached directly by absorbing a single photon in the electric-dipole approximation?`, st), expl: `Absorption obeys the same rule as emission, $\\Delta l = \\pm1$, starting from $l = ${l0}$. ` + romanExpl(st) };
      },
    },
  ]);

  // =================================================================== 5.7.6 Black-body radiation and photons
  GRE.addTemplates('atomic', [
    {
      id: 'atomic.bb.wien', sec: '5.7.6', level: 1, weight: 2,
      gen(R) {
        const OBJ = [['the surface of a star', [3000, 3500, 4000, 4500, 5000, 5800, 6000, 7000, 8000, 10000, 12000, 15000, 20000, 25000, 30000]], ['the tungsten filament of an incandescent lamp', [2500, 2700, 2900, 3000, 3200]],
          ['human skin', [305, 307, 310]], ['the cosmic microwave background', [2.7]], ['a glowing stove element', [800, 900, 1000, 1100]], ['molten lava', [1300, 1400, 1500]], ['a hot plasma in a fusion experiment', [1e6, 2e6, 5e6, 1e7]], ['a sample of liquid nitrogen', [77]], ['the Earth’s surface', [288, 290, 300]]];
        const b = C.wien;
        const fmtL = m => (m >= 1e-3 ? { f: 1e3, u: raw`\text{mm}` } : m >= 1e-6 ? { f: 1e6, u: raw`\mu\text{m}` } : { f: 1e9, u: raw`\text{nm}` });
        const give = R.bool(0.5) ? raw` (Wien's constant is $2.9\times10^{-3}\,\text{m}\cdot\text{K}$.)` : '';
        if (R.bool(0.6)) {
          const [o, Ts] = R.pick(OBJ); const T = R.pick(Ts);
          const lam = b / T, U = fmtL(lam);
          const hckT = C.h * C.c / (C.kB * T);
          return {
            q: `Treating ${o} as a black body at $${F.num(T, 2)}\\,\\text{K}$, at approximately what wavelength does its emission spectrum peak?` + give,
            ...GRE.numeric(R, lam * U.f, [lam * 10, lam / 10, hckT, lam / 2, 2 * lam].map(x => x === hckT ? x * U.f : x * U.f), { unit: U.u, sig: 2 }),
            expl: raw`Wien's law: $\lambda_{\max} = (2.9\times10^{-3}\,\text{m}\cdot\text{K})/T = ${F.num(lam * U.f, 2)}\,${U.u}$. (Using $\lambda = hc/k_BT$ instead overestimates by about a factor of 5.)`,
          };
        }
        const lamTab = [[100, 'nm'], [290, 'nm'], [400, 'nm'], [500, 'nm'], [600, 'nm'], [700, 'nm'], [1, '\\mu m'], [2, '\\mu m'], [5, '\\mu m'], [10, '\\mu m'], [20, '\\mu m'], [1, 'mm'], [2, 'mm']];
        const [x, u] = R.pick(lamTab);
        const lam = x * (u === 'nm' ? 1e-9 : u === 'mm' ? 1e-3 : 1e-6);
        const T = b / lam;
        const uT = u === '\\mu m' ? raw`\mu\text{m}` : raw`\text{${u}}`;
        return {
          q: `The thermal emission spectrum of a black body peaks at a wavelength of $${x}\\,${uT}$. What is its temperature?` + give,
          ...GRE.numeric(R, T, [T * 10, T / 10, C.h * C.c / (C.kB * lam), T - 273 > 0 ? T + 273 : T * 3, T / 2], { unit: raw`\text{K}`, sig: 2 }),
          expl: raw`$T = (2.9\times10^{-3}\,\text{m}\cdot\text{K})/\lambda_{\max} = ${F.num(T, 2)}\,\text{K}$.`,
        };
      },
    },
    {
      id: 'atomic.bb.scaling', sec: '5.7.6', level: 2, weight: 2,
      gen(R) {
        const v = R.weighted(['T', 'C', 'star', 'peak', 'planet', 'sphere'], [2, 2, 3, 2, 2, 1]);
        if (v === 'T') {
          const k = R.pick([[2, 1], [3, 1], [1, 2], [3, 2], [4, 3], [1, 3], [5, 4], [4, 1]]);
          const c = [Math.pow(k[0], 4), Math.pow(k[1], 4)];
          return {
            q: `The absolute temperature of a black-body radiator is multiplied by $${F.frac(...k)}$. By what factor does the total power it radiates change?`,
            ...ratChoices(R, c, [k, [k[0] * k[0], k[1] * k[1]], [Math.pow(k[0], 3), Math.pow(k[1], 3)], [k[1] * k[1] * k[1] * k[1], k[0] * k[0] * k[0] * k[0]], [2 * k[0], k[1]]]),
            level: 1,
            expl: raw`Stefan–Boltzmann: $P = \sigma A T^4$, so $P$ changes by $(${F.frac(...k)})^4 = ${F.frac(...c)}$.`,
          };
        }
        if (v === 'C') {
          const [t1, t2] = R.pick([[27, 327], [-73, 127], [127, 327], [27, 627], [227, 727], [-123, 27], [77, 427], [327, 927]]);
          const T1 = t1 + 273, T2 = t2 + 273;
          const c = rat(Math.pow(T2 / 25, 4), Math.pow(T1 / 25, 4));
          const k = rat(T2, T1);
          return {
            q: `A black body is heated from $${t1}^\\circ\\text{C}$ to $${t2}^\\circ\\text{C}$. By what factor does its radiated power increase?`,
            ...ratChoices(R, c, [k, [k[0] * k[0], k[1] * k[1]], [Math.pow(k[0], 3), Math.pow(k[1], 3)], [Math.pow(k[0], 8), Math.pow(k[1], 8)], [2 * c[0], c[1]]]),
            expl: raw`Convert to kelvin: $${T1}\,\text{K} \to ${T2}\,\text{K}$, a factor $${F.frac(...k)}$. Power $\propto T^4$: $(${F.frac(...k)})^4 = ${F.frac(...c)}$. Using Celsius temperatures is the trap.`,
          };
        }
        if (v === 'star') {
          const a = R.pick([[1, 2], [2, 1], [3, 1], [1, 3], [4, 1], [1, 4], [10, 1]]);
          let b = R.pick([[1, 2], [2, 1], [3, 2], [2, 3], [1, 1], [4, 3]]);

          const askL = R.bool();
          if (!askL && b[0] === b[1]) b = [3, 2];
          const L = [a[0] * a[0] * Math.pow(b[0], 4), a[1] * a[1] * Math.pow(b[1], 4)];
          if (askL) {
            return {
              q: `Star A has ${F.frac(...a) === '1' ? 'the same radius as' : `$${F.frac(...a)}$ times the radius of`} star B and ${b[0] === b[1] ? 'the same' : `$${F.frac(...b)}$ times the`} surface temperature${b[0] === b[1] ? ' as B' : ''}. Treating both as black bodies, what is the ratio of their luminosities $L_A/L_B$?`,
              ...ratChoices(R, L, [[a[0] * Math.pow(b[0], 4), a[1] * Math.pow(b[1], 4)], [a[0] * a[0] * b[0] * b[0], a[1] * a[1] * b[1] * b[1]], [Math.pow(a[0], 3) * Math.pow(b[0], 4), Math.pow(a[1], 3) * Math.pow(b[1], 4)], [a[0] * a[0], a[1] * a[1]], [Math.pow(b[0], 4), Math.pow(b[1], 4)], [L[1], L[0]]]),
              expl: raw`$L = 4\pi R^2\sigma T^4$, so $L_A/L_B = (${F.frac(...a)})^2(${F.frac(...b)})^4 = ${F.frac(...L)}$.`,
            };
          }
          if (b[0] === b[1]) b = [3, 2];
          return {
            q: `Star A is $${F.frac(...L)}$ times as luminous as star B and has $${F.frac(...b)}$ times its surface temperature. Treating both as black bodies, what is the ratio of their radii $R_A/R_B$?`,
            ...ratChoices(R, a, [[a[0] * a[0], a[1] * a[1]], [a[1], a[0]], [L[0] * b[1] * b[1] * b[1] * b[1], L[1] * b[0] * b[0] * b[0] * b[0]].map((x, i, arr) => x), [a[0] * b[0], a[1] * b[1]], [a[0] * b[1] * b[1], a[1] * b[0] * b[0]]]),
            expl: raw`$L \propto R^2T^4$, so $R_A/R_B = \sqrt{(L_A/L_B)/(T_A/T_B)^4} = \sqrt{${F.frac(...L)}/${F.frac(Math.pow(b[0], 4), Math.pow(b[1], 4))}} = ${F.frac(...a)}$.`,
          };
        }
        if (v === 'peak') {
          const k = R.pick([[1, 2], [2, 1], [1, 3], [3, 1], [2, 3], [3, 2]]);
          const c = [Math.pow(k[1], 4), Math.pow(k[0], 4)];
          return {
            q: `The wavelength at which a black body's emission peaks is multiplied by $${F.frac(...k)}$. By what factor does the power radiated per unit area change?`,
            ...ratChoices(R, c, [[c[1], c[0]], [k[1], k[0]], [k[0], k[1]], [k[1] * k[1], k[0] * k[0]], [Math.pow(k[1], 3), Math.pow(k[0], 3)]]),
            expl: raw`Wien: $T \propto 1/\lambda_{\max}$, so $T$ changes by $${F.frac(k[1], k[0])}$, and $P/A \propto T^4$ changes by $${F.frac(...c)}$.`,
          };
        }
        if (v === 'planet') {
          if (R.bool()) {
            const d = R.pick([[4, 1], [1, 4], [2, 1], [1, 2], [9, 1], [16, 1]]);
            return {
              q: `A planet behaves as a black body heated only by its star. If it were moved to $${F.frac(...d)}$ times its present distance from the star, by what factor would its equilibrium temperature change?`,
              ...exactChoices(R, Math.sqrt(d[1] / d[0]), [d[1] / d[0], Math.pow(d[1] / d[0], 0.25), d[0] / d[1], Math.sqrt(d[0] / d[1]), Math.pow(d[1] / d[0], 2)]),
              level: 3,
              expl: raw`Absorbed power $\propto 1/d^2$ and emitted power $\propto T^4$, so $T \propto d^{-1/2}$: factor $(${F.frac(...d)})^{-1/2}$.`,
            };
          }
          const Lk = R.pick([16, 81, 4, 1 / 16, 1 / 4]);
          return {
            q: `A planet behaves as a black body heated only by its star. If the star's luminosity were multiplied by $${F.frac(...rat(Lk >= 1 ? Lk : 1, Lk >= 1 ? 1 : 1 / Lk))}$ (distance unchanged), by what factor would the planet's equilibrium temperature change?`,
            ...exactChoices(R, Math.pow(Lk, 0.25), [Lk, Math.sqrt(Lk), 1 / Math.pow(Lk, 0.25), Lk * Lk, Math.pow(Lk, 0.125)]),
            level: 3,
            expl: raw`Absorbed power $\propto L$ must equal emitted power $\propto T^4$, so $T \propto L^{1/4}$.`,
          };
        }
        const k = R.pick([2, 3, 4]);
        return {
          q: `A black-body sphere is kept at a steady temperature by an internal heater of fixed power (surroundings at absolute zero). If the sphere's radius is multiplied by $${k}$ while the heater power is unchanged, by what factor does its temperature change?`,
          ...exactChoices(R, 1 / Math.sqrt(k), [1 / k, 1 / (k * k), Math.pow(k, -0.25), Math.sqrt(k), 1 / Math.pow(k, 4)]),
          level: 3,
          expl: raw`$P = 4\pi R^2\sigma T^4$ fixed, so $T \propto R^{-1/2}$: factor $1/\sqrt{${k}}$.`,
        };
      },
    },
    {
      id: 'atomic.bb.power', sec: '5.7.6', level: 2,
      gen(R) {
        const v = R.weighted(['P', 'flux', 'T', 'net'], [3, 2, 2, 2]);
        const sg = raw` (Take $\sigma = 5.67\times10^{-8}\,\text{W}/(\text{m}^2\cdot\text{K}^4)$.)`;
        const sig = C.sigma;
        if (v === 'P') {
          const r = R.pick([0.5, 1, 2, 3, 5, 10]), T = R.pick([400, 500, 600, 800, 1000, 1200, 1500, 2000, 3000]);
          const A = 4 * Math.PI * Math.pow(r / 100, 2), P = sig * A * Math.pow(T, 4);
          return {
            q: `A black-body sphere of radius $${r}\\,\\text{cm}$ is held at $${T}\\,\\text{K}$. What total power does it radiate?` + sg,
            ...GRE.numeric(R, P, [P / 4, 4 * P, P / T, P * Math.pow((T - 273) / T, 4)], { unit: raw`\text{W}`, sig: 2 }),
            expl: raw`$P = \sigma(4\pi r^2)T^4 = (5.67\times10^{-8})(4\pi)(${F.num(r / 100, 2)})^2(${T})^4\,\text{W} = ${F.num(P, 2)}\,\text{W}$. Using $\pi r^2$ instead of the full surface $4\pi r^2$ gives a quarter of this.`,
          };
        }
        if (v === 'flux') {
          const T = R.pick([300, 400, 500, 600, 1000, 1500, 2000, 3000, 5800, 6000]);
          const Fx = sig * Math.pow(T, 4);
          return {
            q: `What is the power radiated per unit area by a black body at $${T}\\,\\text{K}$?` + sg,
            ...GRE.numeric(R, Fx, [sig * Math.pow(T, 3), Fx * 4, Fx / 4, sig * Math.pow(T - 273, 4) > 0 ? sig * Math.pow(T - 273, 4) : Fx * 10], { unit: raw`\text{W/m}^2`, sig: 2 }),
            level: 1,
            expl: raw`$P/A = \sigma T^4 = (5.67\times10^{-8})(${T})^4 = ${F.num(Fx, 2)}\,\text{W/m}^2$.`,
          };
        }
        if (v === 'T') {
          const T = R.pick([200, 300, 400, 500, 600, 800, 1000, 2000]);
          const Fx = F.round(sig * Math.pow(T, 4), 2);
          const Tt = Math.pow(Fx / sig, 0.25);
          return {
            q: `A black-body surface radiates $${F.num(Fx, 2)}\\,\\text{W/m}^2$. What is its temperature?` + sg,
            ...GRE.numeric(R, Tt, [Math.sqrt(Fx / sig), Math.pow(Fx / sig, 1 / 3), Tt * 2, Tt / 2, Tt * 4], { unit: raw`\text{K}`, sig: 2 }),
            expl: raw`$T = (P/A\sigma)^{1/4} = (${F.num(Fx / sig, 2)}\,\text{K}^4)^{1/4} \approx ${F.num(Tt, 2)}\,\text{K}$.`,
          };
        }
        const A = R.pick([1.5, 1.8, 2.0]), T1 = R.pick([306, 308, 310]), T2 = R.pick([283, 288, 293, 295]);
        const P = sig * A * (Math.pow(T1, 4) - Math.pow(T2, 4));
        return {
          q: `A person with skin area $${A}\\,\\text{m}^2$ at $${T1}\\,\\text{K}$ stands in a room whose walls are at $${T2}\\,\\text{K}$. Treating the skin as a black body, what is the net power lost by radiation?` + sg,
          ...GRE.numeric(R, P, [sig * A * Math.pow(T1, 4), sig * A * Math.pow(T1 - T2, 4), sig * A * Math.pow(T2, 4) + sig * A * Math.pow(T1, 4), P / 4], { unit: raw`\text{W}`, sig: 2 }),
          expl: raw`Net power $= \sigma A(T_1^4 - T_2^4) = (5.67\times10^{-8})(${A})(${T1}^4 - ${T2}^4)\,\text{W} \approx ${F.num(P, 2)}\,\text{W}$. Forgetting the absorbed radiation from the walls gives $\sigma AT_1^4$; $(T_1 - T_2)^4$ is a common algebra slip.`,
        };
      },
    },
    {
      id: 'atomic.bb.planck', sec: '5.7.6', level: 2,
      gen(R) {
        const Q = [
          ['In the low-frequency limit $h\\nu \\ll k_BT$, the Planck spectral energy density $u(\\nu)$ of black-body radiation becomes proportional to', '$\\nu^2 T$', ['$\\nu^3 e^{-h\\nu/k_BT}$', '$\\nu^3$', '$T^4$', '$\\nu^2 e^{-h\\nu/k_BT}$', '$\\nu T^2$'], 'Expanding $1/(e^{h\\nu/kT} - 1) \\approx kT/h\\nu$ in $u \\propto \\nu^3/(e^{h\\nu/kT} - 1)$ gives the classical Rayleigh–Jeans law $u \\propto \\nu^2 kT$.'],
          ['In the high-frequency limit $h\\nu \\gg k_BT$, the Planck spectral energy density $u(\\nu)$ becomes proportional to', '$\\nu^3 e^{-h\\nu/k_BT}$', ['$\\nu^2 T$', '$\\nu^3$', '$\\nu^{-2}$', '$T^4$', '$\\nu^2 e^{+h\\nu/k_BT}$'], 'For $h\\nu \\gg kT$, $1/(e^{x} - 1) \\approx e^{-x}$: the spectrum is exponentially suppressed (Wien approximation).'],
          ['The “ultraviolet catastrophe” refers to which prediction of classical physics?', 'The Rayleigh–Jeans spectrum grows as $\\nu^2$ without limit, so the total radiated energy diverges', ['Atoms collapse because orbiting electrons radiate', 'Ultraviolet light cannot eject photoelectrons', 'The Sun should emit mainly ultraviolet light', 'Black bodies emit no radiation at high frequencies', 'The total power radiated is independent of temperature'], 'Equipartition gives each mode $kT$, and the number of modes grows as $\\nu^2$, so $\\int u\\,d\\nu$ diverges. Planck fixed this by quantizing the mode energies in units of $h\\nu$.'],
          ['Planck avoided the ultraviolet catastrophe by assuming that', 'the energy of each electromagnetic mode of frequency $\\nu$ is restricted to integer multiples of $h\\nu$', ['photons have zero chemical potential', 'the speed of light depends on frequency', 'high-frequency modes do not exist inside a cavity', 'the walls of the cavity reflect all ultraviolet light', 'each mode carries energy $\\tfrac12 k_BT$'], 'Quantized energies make high-frequency modes (with $h\\nu \\gg kT$) exponentially unlikely to be excited, cutting off the spectrum.'],
          ['The total energy density of black-body radiation in a cavity at temperature $T$ is proportional to', '$T^4$', ['$T$', '$T^2$', '$T^3$', '$T^{1/4}$', '$e^{-1/T}$'], 'Integrating Planck’s law gives $u = (4\\sigma/c)T^4$ (Stefan–Boltzmann).'],
          ['The number of photons per unit volume in black-body radiation at temperature $T$ is proportional to', '$T^3$', ['$T$', '$T^2$', '$T^4$', '$T^{3/2}$', '$T^{-1}$'], 'Energy density $\\propto T^4$ and mean photon energy $\\propto kT$, so the number density $\\propto T^3$.'],
          ['What is the chemical potential of black-body radiation (a photon gas) in thermal equilibrium?', 'Zero, because photon number is not conserved', ['$k_BT$', '$h\\nu$', '$-k_BT$', 'Positive and equal to the mean photon energy', 'It depends on the volume of the cavity'], 'Photons are freely created and absorbed by the walls, so the free energy is minimized with respect to $N$: $\\mu = 0$.'],
          ['Black-body radiation is described by which statistical distribution?', 'Bose–Einstein with zero chemical potential', ['Fermi–Dirac', 'Maxwell–Boltzmann', 'Bose–Einstein with positive chemical potential', 'Fermi–Dirac with zero chemical potential', 'A uniform distribution over frequencies'], 'Photons are spin-1 bosons; the occupation of each mode is $1/(e^{h\\nu/kT} - 1)$.'],
          ['As the temperature of a black body increases, which of the following happens to its emission spectrum?', 'It increases at every wavelength and its peak shifts to shorter wavelength', ['Its peak shifts to longer wavelength', 'It increases only at the peak wavelength', 'Its peak height stays fixed but shifts to shorter wavelength', 'It decreases at long wavelengths and increases at short ones', 'Its shape and peak are unchanged; only the total power grows'], 'Planck curves for higher $T$ lie above those for lower $T$ at every wavelength (they never cross), and Wien’s law gives $\\lambda_{\\max} \\propto 1/T$.'],
        ];
        const [q, c, w, why] = R.pick(Q);
        return { q, ...GRE.mc(R, c, w), expl: why };
      },
    },
    {
      id: 'atomic.photo.effect', sec: '5.7.6', level: 1, weight: 3,
      gen(R) {
        const v = R.weighted(['K', 'V', 'thr', 'phi', 'v', 'h'], [3, 2, 2, 2, 2, 1]);
        const phi = R.step(1.8, 5.5, 0.1);
        const lams = range(10, 60).map(x => x * 10).filter(l => HC / l > phi + 0.3);
        const lam = R.pick(lams);
        const Eg = HC / lam, K = Eg - phi;
        const intro = `Light of wavelength $${lam}\\,\\text{nm}$ falls on a metal surface whose work function is $${F.fix(phi, 1)}\\,\\text{eV}$.`;
        if (v === 'K') return {
          q: intro + ' What is the maximum kinetic energy of the ejected electrons?',
          ...GRE.numeric(R, K, [Eg, Eg + phi, phi, Eg / 2 - phi > 0 ? Eg / 2 - phi : Eg * 2], { unit: raw`\text{eV}`, sig: 2, tol: 0.1 }),
          expl: raw`Einstein: $K_{\max} = hc/\lambda - \phi = 1240/${lam} - ${F.fix(phi, 1)} = ${F.fix(Eg, 2)} - ${F.fix(phi, 1)} = ${F.num(K, 2)}\,\text{eV}$.`,
        };
        if (v === 'V') return {
          q: intro + ' What is the stopping potential?',
          ...GRE.numeric(R, K, [Eg, Eg + phi, phi, K * 2], { unit: raw`\text{V}`, sig: 2, tol: 0.1 }),
          expl: raw`$eV_s = K_{\max} = hc/\lambda - \phi = ${F.fix(Eg, 2)} - ${F.fix(phi, 1)}\,\text{eV}$, so $V_s = ${F.num(K, 2)}\,\text{V}$.`,
        };
        if (v === 'thr') {
          const l0 = HC / phi;
          return {
            q: `A metal has a work function of $${F.fix(phi, 1)}\\,\\text{eV}$. What is the longest wavelength of light that can eject photoelectrons from it?`,
            ...GRE.numeric(R, l0, [l0 / 2, 2 * l0, l0 / (2 * Math.PI), l0 * 2 * Math.PI], { unit: raw`\text{nm}`, sig: 2 }),
            expl: raw`Threshold: $hc/\lambda_0 = \phi$, so $\lambda_0 = 1240/${F.fix(phi, 1)}\,\text{nm} = ${F.num(l0, 2)}\,\text{nm}$. Longer wavelengths eject nothing, however intense.`,
          };
        }
        if (v === 'phi') {
          const Ks = +K.toFixed(1);
          if (Ks <= 0.1) throw new Error('small');
          const ph = Eg - Ks;
          return {
            q: `Light of wavelength $${lam}\\,\\text{nm}$ ejects photoelectrons from a metal, and the stopping potential is $${F.fix(Ks, 1)}\\,\\text{V}$. What is the work function of the metal?`,
            ...GRE.numeric(R, ph, [Eg + Ks, Eg, Ks, Eg / 2], { unit: raw`\text{eV}`, sig: 2, tol: 0.1 }),
            expl: raw`$\phi = hc/\lambda - eV_s = ${F.fix(Eg, 2)} - ${F.fix(Ks, 1)} = ${F.num(ph, 2)}\,\text{eV}$.`,
          };
        }
        if (v === 'v') {
          const sp = C.c * Math.sqrt(2 * K / ME_EV);
          return {
            q: intro + ' What is the maximum speed of the ejected electrons? ($m_ec^2 = 511\\,\\text{keV}$.)',
            ...GRE.numeric(R, sp, [sp / Math.SQRT2, sp * Math.SQRT2, C.c * Math.sqrt(2 * Eg / ME_EV), C.c * 2 * K / ME_EV * 100], { unit: raw`\text{m/s}`, sig: 2, tol: 0.1 }),
            level: 2,
            expl: raw`$K = ${F.num(K, 2)}\,\text{eV}$ and $v = c\sqrt{2K/m_ec^2} = (3\times10^{8})\sqrt{2(${F.num(K, 2)})/511000}\,\text{m/s} = ${F.num(sp, 2)}\,\text{m/s}$.`,
          };
        }
        const f1 = R.int(6, 9), f2 = f1 + R.int(2, 5);
        const V1 = +(H_EVS * f1 * 1e14 - phi).toFixed(2), V2 = +(H_EVS * f2 * 1e14 - phi).toFixed(2);
        if (V1 <= 0.05) throw new Error('below threshold');
        const hh = (V2 - V1) / ((f2 - f1) * 1e14);
        return {
          q: `In a photoelectric experiment, light of frequency $${f1}\\times10^{14}\\,\\text{Hz}$ gives a stopping potential of $${V1.toFixed(2)}\\,\\text{V}$, and light of frequency $${f2}\\times10^{14}\\,\\text{Hz}$ gives $${V2.toFixed(2)}\\,\\text{V}$. What value of Planck's constant do these data imply?`,
          ...GRE.numeric(R, hh, [hh * 2, hh / 2, V2 / (f2 * 1e14), hh * 2 * Math.PI], { unit: raw`\text{eV}\cdot\text{s}`, sig: 2, tol: 0.1 }),
          level: 2,
          expl: raw`$eV_s = hf - \phi$, so the slope of $V_s$ versus $f$ is $h/e$: $h = (${V2.toFixed(2)} - ${V1.toFixed(2)})\,\text{eV}/(${f2 - f1}\times10^{14}\,\text{Hz}) = ${F.num(hh, 2)}\,\text{eV}\cdot\text{s}$. Dividing a single $V_s$ by $f$ ignores the work function.`,
        };
      },
    },
    {
      id: 'atomic.photo.concepts', sec: '5.7.6', level: 1,
      gen(R) {
        const T = [
          ['Increasing the light intensity at fixed frequency (above threshold) increases the number of photoelectrons per second.', 'more photons, more electrons'],
          ['There is a threshold frequency below which no electrons are emitted, regardless of intensity.', 'one photon must supply at least $\\phi$'],
          ['The maximum kinetic energy of the photoelectrons increases linearly with the frequency of the light.', '$K_{\\max} = hf - \\phi$'],
          ['Electrons are emitted with no measurable time delay, even at very low intensity.', 'each electron absorbs a single photon'],
          ['A graph of stopping potential versus frequency has slope $h/e$ for every metal.', 'the slope is universal'],
          ['The frequency at which the stopping potential extrapolates to zero depends on the metal.', 'it is $\\phi/h$'],
        ];
        const Fs = [
          ['Increasing the light intensity at fixed frequency increases the maximum kinetic energy of the photoelectrons.', 'intensity changes the number of photons, not their energy'],
          ['At very low intensity, there is a delay while each electron accumulates enough energy to escape.', 'no delay is observed'],
          ['Light below the threshold frequency ejects electrons if it is intense enough.', 'one photon must exceed the work function'],
          ['The maximum kinetic energy of the photoelectrons is proportional to the wavelength of the light.', 'it decreases with wavelength'],
          ['The slope of a graph of stopping potential versus frequency depends on the metal.', 'only the intercept depends on the metal'],
          ['The stopping potential increases with the intensity of the light.', 'it depends only on frequency and work function'],
        ];
        const st = romanSet(R, T, Fs);
        return { ...romanQ(R, 'Which of the following statements about the photoelectric effect is (are) true?', st), expl: romanExpl(st) };
      },
    },
    {
      id: 'atomic.photo.photon', sec: '5.7.6', level: 2, weight: 2,
      gen(R) {
        const v = R.weighted(['E', 'p', 'N', 'F', 'recoil'], [2, 2, 3, 2, 2]);
        if (v === 'E') {
          const lam = R.pick([0.1, 1, 10, 100, 122, 250, 400, 500, 550, 620, 700, 1000, 1550, 10600]);
          const E = HC / lam;
          return {
            q: `What is the energy of a photon of wavelength $${lam}\\,\\text{nm}$?`,
            ...GRE.numeric(R, E, [E * 2 * Math.PI, E / (2 * Math.PI), E * 10, E / 10], { unit: raw`\text{eV}`, sig: 2 }),
            level: 1,
            expl: raw`$E = hc/\lambda = (1240\,\text{eV}\cdot\text{nm})/(${lam}\,\text{nm}) = ${F.num(E, 2)}\,\text{eV}$.`,
          };
        }
        if (v === 'p') {
          const lam = R.pick([100, 200, 300, 400, 500, 600, 700, 1000]);
          const p = C.h / (lam * 1e-9);
          return {
            q: `What is the magnitude of the momentum of a photon of wavelength $${lam}\\,\\text{nm}$? ($h = 6.63\\times10^{-34}\\,\\text{J}\\cdot\\text{s}$.)`,
            ...GRE.numeric(R, p, [p / (2 * Math.PI), p * C.c, p / C.c * 1e8, p * 2 * Math.PI], { unit: raw`\text{kg}\cdot\text{m/s}`, sig: 2 }),
            expl: raw`$p = h/\lambda = E/c = (6.63\times10^{-34})/(${lam}\times10^{-9})\,\text{kg}\cdot\text{m/s} = ${F.num(p, 2)}\,\text{kg}\cdot\text{m/s}$.`,
          };
        }
        if (v === 'N') {
          const P = R.pick([0.5, 1, 2, 5, 10, 100]) * 1e-3, lam = R.pick([405, 450, 488, 532, 633, 650, 780, 1064]);
          const N = P * lam * 1e-9 / (C.h * C.c);
          return {
            q: `A laser emits $${F.num(P * 1e3, 2)}\\,\\text{mW}$ of light at $${lam}\\,\\text{nm}$. About how many photons does it emit per second?`,
            ...GRE.numeric(R, N, [N * 2 * Math.PI, N / (2 * Math.PI), N * 1000, N / 1000], { sig: 2, fmt: x => F.sci(x, 2) }),
            expl: raw`Each photon carries $hc/\lambda = 1240/${lam}\,\text{eV} = ${F.num(HC / lam * C.e, 2)}\,\text{J}$, so $N = P\lambda/(hc) = ${F.sci(N, 2)}$ photons per second.`,
          };
        }
        if (v === 'F') {
          const P = R.pick([1, 2, 5, 10, 30, 100, 300, 1000]);
          const refl = R.bool();
          const Fo = (refl ? 2 : 1) * P / C.c;
          return {
            q: `A ${P}-W light beam strikes a surface at normal incidence and is completely ${refl ? 'reflected' : 'absorbed'}. What force does the light exert on the surface?`,
            ...GRE.numeric(R, Fo, [refl ? Fo / 2 : 2 * Fo, Fo * 1000, Fo / 1000, Fo * 4], { unit: raw`\text{N}`, sig: 2 }),
            expl: raw`The beam carries momentum $P/c$ per second; ${refl ? 'reflection reverses it, so $F = 2P/c$' : 'absorption stops it, so $F = P/c$'} $= ${F.num(Fo, 2)}\,\text{N}$.`,
          };
        }
        const At = R.pick([['a hydrogen atom', 1, 'Lyman-$\\alpha$ photon', 122], ['a sodium atom', 23, 'photon of wavelength 589 nm', 589], ['a rubidium atom', 87, 'photon of wavelength 780 nm', 780], ['a helium atom', 4, 'photon of wavelength 58.4 nm', 58.4], ['a mercury atom', 200, 'photon of wavelength 254 nm', 254]]);
        const vr = C.h / (At[1] * C.amu * At[3] * 1e-9);
        return {
          q: `${At[0][0].toUpperCase() + At[0].slice(1)} (mass about $${At[1]}\\,\\text{u}$), initially at rest, emits a ${At[2]}. What is its recoil speed? ($h = 6.63\\times10^{-34}\\,\\text{J}\\cdot\\text{s}$, $1\\,\\text{u} = 1.66\\times10^{-27}\\,\\text{kg}$.)`,
          ...GRE.numeric(R, vr, [vr / (2 * Math.PI), vr * At[1] * C.amu / C.me, vr * 2 * Math.PI, vr / 1000], { unit: raw`\text{m/s}`, sig: 2 }),
          level: 3,
          expl: raw`Momentum conservation: $Mv = h/\lambda$, so $v = h/(M\lambda) = ${F.num(vr, 2)}\,\text{m/s}$ (tiny, which is why recoil can be neglected in atomic spectra).`,
        };
      },
    },
  ]);
})(typeof window !== 'undefined' ? window.GRE : this.GRE);
