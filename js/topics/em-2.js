/* Electromagnetism, part B — Chapter 2, §2.3–2.7 of Conquering the Physics GRE:
 * electrodynamics (Maxwell, Faraday, inductors), dipoles and multipoles,
 * dielectrics, electromagnetic waves and radiation, circuits.
 * Templates follow tools/AUTHORING.md. Template ids are prefixed 'em2.'.
 */
(function (GRE) {
  'use strict';
  const F = GRE.fmt;
  const raw = String.raw;
  const C = GRE.C;
  const PI = Math.PI;
  const near = (a, b, t = 1e-9) => Math.abs(a - b) <= t * Math.max(1, Math.abs(a), Math.abs(b));

  // ------------------------------------------------------------------ helpers
  const U = {
    V: raw`\text{V}`, mV: raw`\text{mV}`, A: raw`\text{A}`, mA: raw`\text{mA}`, W: raw`\text{W}`, mW: raw`\text{mW}`,
    J: raw`\text{J}`, mJ: raw`\text{mJ}`, uJ: raw`\mu\text{J}`, T: raw`\text{T}`, s: raw`\text{s}`, ms: raw`\text{ms}`,
    us: raw`\mu\text{s}`, ohm: raw`\Omega`, kohm: raw`\text{k}\Omega`, H: raw`\text{H}`, mH: raw`\text{mH}`,
    uF: raw`\mu\text{F}`, nF: raw`\text{nF}`, C: raw`\text{C}`, uC: raw`\mu\text{C}`, mC: raw`\text{mC}`,
    N: raw`\text{N}`, Nm: raw`\text{N}\cdot\text{m}`, Vm: raw`\text{V/m}`, Wm2: raw`\text{W/m}^2`, Pa: raw`\text{Pa}`,
    Hz: raw`\text{Hz}`, kHz: raw`\text{kHz}`, Am2: raw`\text{A}\cdot\text{m}^2`, As: raw`\text{A/s}`, m: raw`\text{m}`,
  };
  /** value with unit, TeX without $ */
  const vu = (x, u, sig = 2) => `${F.num(x, sig)}\\,${u}`;
  /** exact factor when possible ("3/4", "2\sqrt{2}"), else 2 s.f. */
  const fac = x => {
    if (!isFinite(x)) throw new Error('fac: non-finite');
    let e = x !== 0 && Math.abs(x) < 1e4 && Math.abs(x) > 1e-4 ? F.exact(x, 64) : null;
    if (e != null && /sqrt\[3\]/.test(e)) e = null;
    return e != null ? e : F.num(x, 2);
  };
  /**
   * Numerical multiple choice that also allows 0 (or negatives with allowNeg).
   * Choices sorted ascending; near-ties (relative tol) and identical strings dropped.
   */
  function numMC(R, correct, wrongs, o = {}) {
    const fmt = o.fmt || (x => F.num(x, o.sig || 2));
    const unit = o.unit ? '\\,' + o.unit : '';
    const tol = o.tol == null ? 0.1 : o.tol;
    const val = new Map();
    const S = x => { const t = '$' + fmt(x) + unit + '$'; val.set(t, x); return t; };
    const kept = [correct], strs = [S(correct)], ws = [];
    const fill = correct !== 0 ? [2, 0.5, 4, 0.25, 3, 1 / 3, 8, 0.125, 10, 0.1].map(f => correct * f) : [];
    for (const w of wrongs.concat(fill)) {
      if (w == null || !isFinite(w)) continue;
      if (!o.allowNeg && w < 0) continue;
      if (kept.some(u => Math.abs(u - w) <= tol * Math.max(Math.abs(u), Math.abs(w)))) continue;
      const s = S(w);
      if (strs.indexOf(s) >= 0) continue;
      kept.push(w); strs.push(s); ws.push(s);
      if (ws.length >= (o.max || 6)) break;
    }
    return GRE.mc(R, strs[0], ws, { rank: t => val.get(t) });
  }
  /** factor / ratio answers written exactly when possible */
  const facMC = (R, correct, wrongs, o = {}) => numMC(R, correct, wrongs, Object.assign({ fmt: fac, tol: 0.04 }, o));
  /** symbolic answers: TeX strings without $ */
  const symMC = (R, correct, wrongs, o) => GRE.mc(R, `$${correct}$`, wrongs.map(w => `$${w}$`), o);
  /** pick a statement set for a Roman-numeral question */
  function romanQ(R, intro, TRUE, FALSE) {
    // statements are paired by index (TRUE[i] and FALSE[i] concern the same fact): never show both of a pair
    const n = Math.max(TRUE.length, FALSE.length);
    const idx = R.pickN([...Array(n).keys()], 3);
    let truth = idx.map(() => R.bool());
    truth = truth.map((t, j) => (t ? idx[j] < TRUE.length : !(idx[j] < FALSE.length)));
    if (!truth.some(Boolean)) truth[R.int(0, 2)] = true;
    truth = truth.map((t, j) => (t && idx[j] >= TRUE.length ? false : t));
    if (!truth.some(Boolean)) throw new Error('roman: no true statement');
    const st = idx.map((i, j) => [truth[j] ? TRUE[i] : FALSE[i], truth[j]]);
    return { st, q: GRE.romanStem(intro, st.map(x => x[0])), ...GRE.roman(R, st.map(x => x[1])) };
  }
  const RN = ['I', 'II', 'III'];
  /** 'a', 'a and b', 'a, b, and c' */
  const andJoin = xs => (xs.length < 2 ? xs.join('') : xs.length === 2 ? xs.join(' and ') : xs.slice(0, -1).join(', ') + ', and ' + xs[xs.length - 1]);

  // ---------------------------------------------------------------- SVG figures
  const svg = (w, h, body) => `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" font-family="serif" font-size="14">${body}</svg>`;
  const ln = (x1, y1, x2, y2) => `<path d="M${x1} ${y1} L${x2} ${y2}"/>`;
  const tx = (x, y, s, anchor = 'middle') => `<text x="${x}" y="${y}" fill="currentColor" stroke="none" text-anchor="${anchor}">${s}</text>`;
  const dot = (x, y) => `<circle cx="${x}" cy="${y}" r="2.5" fill="currentColor"/>`;
  const arrow = (x1, y1, x2, y2) => {
    const a = Math.atan2(y2 - y1, x2 - x1), h = 7;
    const p = t => `${(x2 - h * Math.cos(a + t)).toFixed(1)} ${(y2 - h * Math.sin(a + t)).toFixed(1)}`;
    return `<path d="M${x1} ${y1} L${x2} ${y2} M${p(0.45)} L${x2} ${y2} L${p(-0.45)}"/>`;
  };
  /** circuit element between two points: R, C, L, B (battery: + terminal at the first point), S (open switch), W (wire) */
  function el(type, x1, y1, x2, y2, label, side) {
    const len = Math.hypot(x2 - x1, y2 - y1), ang = Math.atan2(y2 - y1, x2 - x1) * 180 / PI;
    const m = len / 2, a = m - 15, b = m + 15;
    let d;
    if (type === 'R') d = `<path d="M0 0 H${a} l2.5 -6 l5 12 l5 -12 l5 12 l5 -12 l5 12 l2.5 -6 H${len}"/>`;
    else if (type === 'C') d = `<path d="M0 0 H${m - 4} M${m - 4} -11 V11 M${m + 4} -11 V11 M${m + 4} 0 H${len}"/>`;
    else if (type === 'L') d = `<path d="M0 0 H${a} a3.75 3.75 0 0 1 7.5 0 a3.75 3.75 0 0 1 7.5 0 a3.75 3.75 0 0 1 7.5 0 a3.75 3.75 0 0 1 7.5 0 H${len}"/>`;
    else if (type === 'B') d = `<path d="M0 0 H${m - 3} M${m - 3} -12 V12 M${m + 3} 0 H${len}"/><path d="M${m + 3} -6 V6" stroke-width="3.5"/>`;
    else if (type === 'S') d = `<path d="M0 0 H${a} M${a + 2} -1 L${b - 3} -12 M${b} 0 H${len}"/><circle cx="${a}" cy="0" r="2"/><circle cx="${b}" cy="0" r="2"/>`;
    else d = `<path d="M0 0 H${len}"/>`;
    let s = `<g transform="translate(${x1} ${y1}) rotate(${ang.toFixed(1)})">${d}</g>`;
    if (label) {
      const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
      if (y1 === y2) s += tx(mx, my + (side === 'b' ? 28 : -17), label);
      else s += side === 'l' ? tx(mx - 17, my + 5, label, 'end') : tx(mx + 17, my + 5, label, 'start');
    }
    return s;
  }
  /** rails + resistor + sliding rod, field into (×) or out of (•) the page */
  function railFig(out, sym) {
    let b = ln(40, 20, 330, 20) + ln(40, 110, 330, 110) + el('R', 40, 20, 40, 110, 'R', 'l');
    b += `<path d="M215 12 V118" stroke-width="5"/>` + arrow(224, 65, 268, 65) + tx(246, 57, 'v');
    b += tx(200, 70, sym || 'L', 'end');
    for (const x of [80, 130, 175, 290, 320]) for (const y of [42, 92]) b += out ? dot(x, y) : tx(x, y + 5, '×');
    b += tx(300, 70, 'B');
    return svg(350, 130, b);
  }

  GRE.addTemplates('em', [
    // =============================================================== 2.3.1 Maxwell's equations
    {
      id: 'em2.maxwell.identify', sec: '2.3.1', level: 1,
      gen(R) {
        const DIFF = [
          raw`\nabla\cdot\mathbf{E} = \rho/\epsilon_0`,
          raw`\nabla\cdot\mathbf{B} = 0`,
          raw`\nabla\times\mathbf{E} = -\partial\mathbf{B}/\partial t`,
          raw`\nabla\times\mathbf{B} = \mu_0\mathbf{J} + \mu_0\epsilon_0\,\partial\mathbf{E}/\partial t`,
        ];
        const DFAKE = [raw`\nabla\cdot\mathbf{B} = \mu_0\rho`, raw`\nabla\times\mathbf{E} = \mu_0\mathbf{J}`];
        const INT = [
          raw`\oint\mathbf{E}\cdot d\mathbf{A} = Q_{\text{enc}}/\epsilon_0`,
          raw`\oint\mathbf{B}\cdot d\mathbf{A} = 0`,
          raw`\oint\mathbf{E}\cdot d\mathbf{l} = -d\Phi_B/dt`,
          raw`\oint\mathbf{B}\cdot d\mathbf{l} = \mu_0 I_{\text{enc}} + \mu_0\epsilon_0\,d\Phi_E/dt`,
        ];
        const IFAKE = [raw`\oint\mathbf{B}\cdot d\mathbf{A} = \mu_0 I_{\text{enc}}`, raw`\oint\mathbf{E}\cdot d\mathbf{l} = Q_{\text{enc}}/\epsilon_0`];
        const FACTS = [
          ['The electric flux through any closed surface is proportional to the net charge enclosed by that surface.', 0],
          ['Electric field lines begin on positive charges and end on negative charges.', 0],
          ['The electric field just outside the surface of a charged conductor has magnitude $\\sigma/\\epsilon_0$.', 0],
          ['No isolated magnetic poles (magnetic monopoles) have ever been observed.', 1],
          ['The net magnetic flux through any closed surface is zero.', 1],
          ['Magnetic field lines never start or stop; they close on themselves.', 1],
          ['Breaking a bar magnet in half yields two smaller magnets rather than an isolated north pole and south pole.', 1],
          ['Moving a bar magnet toward a closed wire loop drives a current around the loop.', 2],
          ['A transformer can step an AC voltage up or down.', 2],
          ['A time-varying magnetic field is accompanied by an electric field whose field lines can close on themselves.', 2],
          ['In a betatron, magnetic flux that increases with time accelerates electrons around a circular orbit.', 2],
          ['A magnetic field circulates around the gap between the plates of a charging capacitor, even though no charge crosses the gap.', 3],
          ['A time-varying electric field is accompanied by a circulating magnetic field, even in empty space.', 3],
          ['A steady current in a long straight wire produces a magnetic field that circles the wire.', 3],
        ];
        const NAMES = ['Gauss’s law', 'Gauss’s law for magnetism (no magnetic monopoles)', 'Faraday’s law of induction', 'the Ampère–Maxwell law'];
        const [fact, k] = R.pick(FACTS);
        const integral = R.bool();
        const EQ = integral ? INT : DIFF, FAKE = integral ? IFAKE : DFAKE;
        return {
          q: `Which of Maxwell’s equations, written in ${integral ? 'integral' : 'differential'} form, most directly expresses the following fact?<br><i>${fact}</i>`,
          ...symMC(R, EQ[k], EQ.filter((_, i) => i !== k).concat(FAKE)),
          expl: `This is ${NAMES[k]}: $${DIFF[k]}$, or $${INT[k]}$. ` + [
            'Charges are the sources and sinks of $\\mathbf{E}$.',
            'Since $\\mathbf{B}$ has no sources, its lines have no beginning or end and the flux through a closed surface vanishes.',
            'A changing magnetic flux induces a circulating electric field (an emf), with the minus sign expressing Lenz’s law.',
            'Currents and changing electric flux (the displacement current) are the sources of circulating $\\mathbf{B}$.',
          ][k],
        };
      },
    },
    {
      id: 'em2.maxwell.displacement', sec: '2.3.1', level: 2,
      gen(R) {
        const v = R.pick(['inside', 'outside', 'dEdt', 'Id', 'IdC', 'ratio']);
        const setup = 'A parallel-plate capacitor has circular plates of radius $a$ and is being charged by a constant current $I$ in the leads. Neglect fringing.';
        if (v === 'inside') {
          return {
            q: `${setup} What is the magnitude of the magnetic field between the plates at a distance $r < a$ from the central axis?`,
            ...symMC(R, raw`\dfrac{\mu_0 I r}{2\pi a^2}`, ['0', raw`\dfrac{\mu_0 I}{2\pi r}`, raw`\dfrac{\mu_0 I r}{\pi a^2}`, raw`\dfrac{\mu_0 I a^2}{2\pi r^3}`, raw`\dfrac{\mu_0 I r^2}{2\pi a^3}`]),
            level: 3,
            expl: raw`No charge crosses the gap, but the changing electric flux acts as a displacement current $\epsilon_0\,d\Phi_E/dt$. A loop of radius $r$ encloses the fraction $r^2/a^2$ of it, so $B\cdot 2\pi r = \mu_0 I r^2/a^2$ and $B = \mu_0 I r/(2\pi a^2)$. Answering 0 ignores Maxwell’s correction.`,
          };
        }
        if (v === 'outside') {
          return {
            q: `${setup} What is the magnitude of the magnetic field in the plane midway between the plates, at a distance $r > a$ from the central axis?`,
            ...symMC(R, raw`\dfrac{\mu_0 I}{2\pi r}`, ['0', raw`\dfrac{\mu_0 I r}{2\pi a^2}`, raw`\dfrac{\mu_0 I a^2}{2\pi r^3}`, raw`\dfrac{\mu_0 I a}{2\pi r^2}`, raw`\dfrac{\mu_0 I}{4\pi r}`]),
            expl: raw`An Ampère loop of radius $r > a$ encloses the full displacement current $\epsilon_0\,d\Phi_E/dt = I$, so the field is the same as around the wire itself: $B = \mu_0 I/(2\pi r)$.`,
          };
        }
        if (v === 'dEdt') {
          return {
            q: raw`The uniform electric field between the circular plates of a parallel-plate capacitor (radius $a$) is increasing at the rate $dE/dt$. Neglecting fringing, what is the magnitude of the magnetic field between the plates at a distance $r < a$ from the axis?`,
            ...symMC(R, raw`\tfrac{1}{2}\mu_0\epsilon_0\, r\,\dfrac{dE}{dt}`, [raw`\mu_0\epsilon_0\, r\,\dfrac{dE}{dt}`, raw`\dfrac{\mu_0\epsilon_0 a^2}{2r}\,\dfrac{dE}{dt}`, '0', raw`\mu_0\epsilon_0\,\pi r^2\,\dfrac{dE}{dt}`, raw`\tfrac{1}{2}\mu_0\epsilon_0\, a\,\dfrac{dE}{dt}`]),
            level: 3,
            expl: raw`Ampère–Maxwell with no conduction current: $B\cdot 2\pi r = \mu_0\epsilon_0\,\dfrac{d}{dt}(\pi r^2 E)$, so $B = \tfrac{1}{2}\mu_0\epsilon_0 r\,dE/dt$, growing linearly from the axis. ($\pi r^2\,dE/dt$ alone has the wrong units for a field.)`,
          };
        }
        if (v === 'Id') {
          const a = R.pick([2, 3, 4, 5, 8, 10]), rate = R.pick([1, 2, 3, 5, 8]) * 1e12;
          const A = PI * (a / 100) ** 2, Id = C.eps0 * A * rate;
          return {
            q: raw`The electric field between the circular plates (radius $${a}\,\text{cm}$) of a parallel-plate capacitor is uniform and increasing at $${F.sci(rate)}\,\text{V/(m}\cdot\text{s)}$. What is the displacement current between the plates? (Take $\epsilon_0 \approx ${F.sci(C.eps0, 3)}\,\text{F/m}$.)`,
            ...GRE.numeric(R, Id, [C.eps0 * (a / 100) ** 2 * rate, C.eps0 * PI * (2 * a / 100) ** 2 * rate, C.eps0 * 2 * PI * (a / 100) * rate], { unit: U.A }),
            expl: raw`$I_d = \epsilon_0\,d\Phi_E/dt = \epsilon_0\,\pi a^2\,dE/dt = (${F.sci(C.eps0, 3)})(\pi)(${a / 100})^2(${F.sci(rate)}) \approx ${vu(Id, U.A)}$. Inside the gap it plays the role of the conduction current in Ampère’s law.`,
          };
        }
        if (v === 'IdC') {
          const Cu = R.pick([0.5, 1, 2, 4, 5, 10, 20]), rate = R.pick([1, 2, 3, 5]) * 10 ** R.pick([3, 4, 5]);
          const Id = Cu * 1e-6 * rate;
          return {
            q: raw`The voltage across a $${Cu}\,\mu\text{F}$ capacitor is increasing at a constant rate of $${F.num(rate)}\,\text{V/s}$. What is the displacement current between its plates?`,
            ...GRE.numeric(R, Id, [Cu * 1e-6 / rate, Id * C.eps0 * 1e11, Id / (2 * PI)], { unit: U.A }),
            level: 1,
            expl: raw`Between the plates $I_d = \epsilon_0\,d\Phi_E/dt = d(CV)/dt = C\,dV/dt = ${vu(Id, U.A)}$, exactly equal to the conduction current charging the plates, so the total current is continuous across the gap.`,
          };
        }
        // ratio of fields inside and outside
        const f1 = R.pick([[1, 4], [1, 3], [1, 2], [2, 3], [3, 4]]), f2 = R.pick([[3, 2], [2, 1], [3, 1], [4, 1], [5, 2]]);
        const x1 = f1[0] / f1[1], x2 = f2[0] / f2[1];
        const ans = x1 * x2;
        const fr = f => (f[1] === 1 ? String(f[0]) : F.frac(f[0], f[1]));
        return {
          q: raw`${setup} Let $B_1$ be the magnetic field magnitude between the plates at distance $r_1 = ${fr(f1)}\,a$ from the axis, and $B_2$ the magnitude in the midplane at $r_2 = ${fr(f2)}\,a$. What is $B_1/B_2$?`,
          ...facMC(R, ans, [x1 / x2, x2 / x1, 1 / ans, x1 * x1 * x2, x1]),
          level: 3,
          expl: raw`Inside, only the fraction $r_1^2/a^2$ of the displacement current is enclosed: $B_1 = \mu_0 I r_1/(2\pi a^2)$. Outside, all of it: $B_2 = \mu_0 I/(2\pi r_2)$. So $B_1/B_2 = r_1 r_2/a^2 = ${fac(ans)}$.`,
        };
      },
    },
    {
      id: 'em2.maxwell.roman', sec: '2.3.1', level: 2,
      gen(R) {
        const TRUE = [
          'A time-varying magnetic field produces an electric field whose field lines can form closed loops.',
          'The net magnetic flux through any closed surface is zero.',
          'A time-varying electric field produces a magnetic field even where there is no current.',
          'In vacuum, Maxwell’s equations imply that $\\mathbf{E}$ and $\\mathbf{B}$ obey wave equations with speed $1/\\sqrt{\\mu_0\\epsilon_0}$.',
          'Taking the divergence of the Ampère–Maxwell law and using Gauss’s law yields the continuity equation $\\nabla\\cdot\\mathbf{J} = -\\partial\\rho/\\partial t$.',
          'If magnetic monopoles existed, the equation $\\nabla\\cdot\\mathbf{B} = 0$ would have to be modified.',
          'The electric flux through a closed surface depends only on the charge enclosed by that surface.',
        ];
        const FALSE = [
          'The electric field always satisfies $\\nabla\\times\\mathbf{E} = 0$, even when magnetic fields change in time.',
          'The circulation of $\\mathbf{B}$ around a closed loop is always determined by the conduction current through the loop alone.',
          'Magnetic field lines begin on positive magnetic charges and end on negative magnetic charges.',
          'The electric flux through a closed surface depends on the charges outside the surface.',
          'Maxwell’s displacement-current term is a correction to Faraday’s law.',
          'In vacuum, electromagnetic waves of higher frequency travel faster.',
          'A changing magnetic flux induces an electric field only where a conducting wire is present.',
        ];
        const r = romanQ(R, 'Which of the following statements about Maxwell’s equations is (are) correct?', TRUE, FALSE);
        return {
          q: r.q, choices: r.choices, ans: r.ans,
          expl: r.st.map((x, i) => `${RN[i]} is ${x[1] ? 'true' : 'false'}.`).join(' ') + ' Key facts: $\\nabla\\cdot\\mathbf{B}=0$ (no monopoles), $\\nabla\\times\\mathbf{E} = -\\partial\\mathbf{B}/\\partial t$ (induced $\\mathbf{E}$ exists in empty space), and the displacement current $\\mu_0\\epsilon_0\\,\\partial\\mathbf{E}/\\partial t$ completes Ampère’s law, guaranteeing charge conservation and giving waves at $c = 1/\\sqrt{\\mu_0\\epsilon_0}$ for all frequencies.',
        };
      },
    },

    // =============================================================== 2.3.2 Faraday's law
    {
      id: 'em2.faraday.coil', sec: '2.3.2', level: 2, weight: 2,
      gen(R) {
        const N = R.pick([1, 10, 20, 25, 50, 100, 200]);
        const shape = R.pick(['circle', 'square', 'rect']);
        let A, desc;
        if (shape === 'circle') { const r = R.pick([2, 4, 5, 10, 15, 20]); A = PI * (r / 100) ** 2; desc = `circular coil of radius $${r}\\,\\text{cm}$`; }
        else if (shape === 'square') { const s = R.pick([5, 10, 20, 30, 40, 50]); A = (s / 100) ** 2; desc = `square coil of side $${s}\\,\\text{cm}$`; }
        else { const [a, b] = R.pick([[10, 20], [10, 30], [20, 40], [5, 20], [20, 50], [25, 40]]); A = a * b / 1e4; desc = `rectangular coil measuring $${a}\\,\\text{cm} \\times ${b}\\,\\text{cm}$`; }
        const th = R.pick([0, 0, 0, 30, 60]);
        const usePlane = th !== 0 && R.bool();
        const cs = Math.cos(th * PI / 180), sn = Math.sin(th * PI / 180);
        const angleText = th === 0 ? 'perpendicular to the plane of the coil'
          : usePlane ? `at $${90 - th}^\\circ$ to the plane of the coil` : `at $${th}^\\circ$ to the axis (normal) of the coil`;
        const scen = R.pick(['change', 'change', 'off', 'flip']);
        const B1 = R.pick([0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.8, 1.0, 1.2, 1.5]);
        let B2 = R.pick([0, 0.1, 0.2, 0.3, 0.5, 0.7, 0.9, 1.1, 1.4, 1.6, 2.0]);
        if (scen === 'change' && (B2 === B1 || B2 === 0)) B2 = B1 * 2;
        const dt = R.pick([0.01, 0.02, 0.05, 0.1, 0.2, 0.25, 0.5]);
        let dB, what;
        if (scen === 'change') { dB = Math.abs(B2 - B1); what = `The field changes uniformly from $${B1}\\,\\text{T}$ to $${F.num(B2, 2)}\\,\\text{T}$ in $${dt}\\,\\text{s}$.`; }
        else if (scen === 'off') { dB = B1; what = `The field, initially $${B1}\\,\\text{T}$, is reduced uniformly to zero in $${dt}\\,\\text{s}$.`; }
        else { dB = 2 * B1; what = `The field is $${B1}\\,\\text{T}$, and the coil is flipped over (rotated by $180^\\circ$ about a diameter) in $${dt}\\,\\text{s}$.`; }
        const dPhi = N * A * dB * cs;
        const emf = dPhi / dt;
        const ask = R.pick(['emf', 'emf', 'current', 'charge']);
        const Rr = R.pick([0.5, 1, 2, 4, 5, 10, 20]);
        const avg = scen === 'flip' ? 'average ' : '';
        const wrongTrig = th !== 0 ? sn / cs : null;
        const finalB = scen === 'change' ? B2 : scen === 'off' ? B1 : B1;
        let base, unit, ques;
        if (ask === 'emf') { base = emf; unit = U.V; ques = `What is the magnitude of the ${avg}emf induced in the coil during this time?`; }
        else if (ask === 'current') { base = emf / Rr; unit = U.A; ques = `The coil has total resistance $${Rr}\\,\\Omega$. What is the magnitude of the ${avg}induced current?`; }
        else { base = dPhi / Rr; unit = U.C; ques = `The coil has total resistance $${Rr}\\,\\Omega$. How much charge flows through the coil during this time?`; }
        const wrongs = [];
        if (N > 1) wrongs.push(base / N);
        if (wrongTrig) wrongs.push(base * wrongTrig);
        if (scen === 'flip') wrongs.push(base / 2);
        if (scen === 'change') wrongs.push(base * finalB / dB);
        if (shape === 'circle') wrongs.push(base * 4);
        if (ask === 'charge') wrongs.push(base / dt); else wrongs.push(base * dt * 100);
        return {
          q: `A ${desc} has $${N}$ turn${N > 1 ? 's' : ''}. A uniform magnetic field is directed ${angleText}. ${what} ${ques}`,
          ...GRE.numeric(R, base, wrongs, { unit }),
          level: scen === 'flip' || usePlane ? 3 : 2,
          expl: raw`Flux linkage $N\Phi = NBA\cos\theta$ with $\theta = ${th}^\circ$ the angle between $\mathbf{B}$ and the coil’s normal${usePlane ? ' (the complement of the angle with the plane — a classic trap)' : ''}. ${scen === 'flip' ? 'Flipping reverses the flux, so $\\Delta\\Phi = 2BA\\cos\\theta$ per turn. ' : ''}$|\Delta(N\Phi)| = ${F.num(dPhi, 3)}\,\text{Wb}$, so ${ask === 'emf' ? raw`$\mathcal{E} = |\Delta(N\Phi)|/\Delta t = ${vu(emf, U.V)}$.` : ask === 'current' ? raw`$I = \mathcal{E}/R = |\Delta(N\Phi)|/(R\,\Delta t) = ${vu(base, U.A)}$.` : raw`$Q = \int I\,dt = |\Delta(N\Phi)|/R = ${vu(base, U.C)}$, independent of how fast the change happens.`}`,
        };
      },
    },
    {
      id: 'em2.faraday.rod', sec: '2.3.2', level: 2, weight: 2,
      gen(R) {
        const B = R.pick([0.2, 0.25, 0.4, 0.5, 0.8, 1, 1.5, 2]);
        const L = R.pick([0.1, 0.2, 0.25, 0.4, 0.5, 0.8, 1]);
        const v = R.pick([2, 3, 4, 5, 6, 8, 10]);
        const Rr = R.pick([0.5, 1, 2, 4, 5, 10]);
        const out = R.bool();
        const emf = B * L * v, I = emf / Rr, Fm = B * I * L, P = emf * I;
        const ask = R.pick(['emf', 'current', 'force', 'force', 'power']);
        const head = `A conducting rod slides at constant speed $v = ${v}\\,\\text{m/s}$ along two parallel frictionless rails separated by $L = ${L}\\,\\text{m}$. The rails are connected at one end by a resistor $R = ${Rr}\\,\\Omega$, and a uniform magnetic field $B = ${B}\\,\\text{T}$ points ${out ? 'out of' : 'into'} the page, perpendicular to the plane of the rails (see figure). The rod and rails have negligible resistance.`;
        let q, ch, ex;
        if (ask === 'emf') {
          q = 'What is the emf induced in the circuit?';
          ch = GRE.numeric(R, emf, [B * v, B * L, B * L * v / 2, B * L * v * v], { unit: U.V });
          ex = raw`Motional emf: $\mathcal{E} = d\Phi/dt = BL\,dx/dt = BLv = ${vu(emf, U.V)}$.`;
        } else if (ask === 'current') {
          q = 'What current flows through the resistor?';
          ch = GRE.numeric(R, I, [emf, B * v / Rr, emf * Rr, emf / (2 * Rr)], { unit: U.A });
          ex = raw`$\mathcal{E} = BLv = ${vu(emf, U.V)}$, so $I = BLv/R = ${vu(I, U.A)}$.`;
        } else if (ask === 'force') {
          q = 'What external force must be applied to the rod to keep it moving at constant speed?';
          ch = GRE.numeric(R, Fm, [I, B * B * L * v / Rr, P, B * L * v * v / Rr], { unit: U.N });
          ex = raw`$I = BLv/R = ${vu(I, U.A)}$; the magnetic force on the rod, $ILB = B^2L^2v/R = ${vu(Fm, U.N)}$, opposes the motion (Lenz), so the applied force must equal it.`;
        } else {
          q = 'At what rate must work be done on the rod to keep it moving at constant speed?';
          ch = GRE.numeric(R, P, [Fm, emf * emf / (2 * Rr), B * L * v * v / Rr, emf * emf * Rr], { unit: U.W });
          ex = raw`Power in = power dissipated: $P = Fv = \mathcal{E}^2/R = B^2L^2v^2/R = ${vu(P, U.W)}$.`;
        }
        return { q: `${head} ${q}`, ...ch, fig: railFig(out), expl: ex };
      },
    },
    {
      id: 'em2.faraday.rodsym', sec: '2.3.2', level: 3,
      gen(R) {
        const s = R.pick(['L', 'd', raw`\ell `]);
        const sw = s === raw`\ell` ? 'ℓ' : s;
        const v = R.pick(['terminal', 'distance', 'heat', 'charge', 'speed']);
        const horiz = `A rod of mass $m$ rests on two horizontal, frictionless conducting rails a distance $${s}$ apart, which are connected at one end by a resistor $R$. A uniform vertical magnetic field $B$ fills the region. The rod is given an initial speed $v_0$ along the rails and then released. Neglect all other resistance and the self-inductance of the circuit.`;
        if (v === 'terminal') {
          return {
            q: `A conducting rod of mass $m$ slides without friction down two long vertical conducting rails a distance $${s}$ apart, which are connected at the top by a resistor $R$. A uniform horizontal magnetic field $B$ is perpendicular to the plane of the rails. Neglect all other resistance. What is the rod’s terminal speed?`,
            ...symMC(R, raw`\dfrac{mgR}{B^2${s}^2}`, [raw`\dfrac{mgR}{B${s}}`, raw`\dfrac{mgR}{2B^2${s}^2}`, raw`\dfrac{mg}{RB^2${s}^2}`, raw`\dfrac{2mgR}{B^2${s}^2}`, raw`\dfrac{B^2${s}^2}{mgR}`]),
            expl: raw`At terminal speed the magnetic force balances gravity: $I${s}B = mg$ with $I = B${s}v/R$, so $B^2${s}^2 v/R = mg$ and $v_t = mgR/(B^2${s}^2)$. Check: larger $R$ means smaller braking current, hence faster.`,
          };
        }
        if (v === 'distance') {
          return {
            q: `${horiz} How far does the rod travel before coming to rest?`,
            ...symMC(R, raw`\dfrac{mv_0R}{B^2${s}^2}`, [raw`\dfrac{mv_0R}{2B^2${s}^2}`, raw`\dfrac{2mv_0R}{B^2${s}^2}`, raw`\dfrac{mv_0^2R}{B^2${s}^2}`, raw`\dfrac{mR}{B^2${s}^2}`, raw`\dfrac{mv_0}{RB^2${s}^2}`, raw`\infty`]),
            expl: raw`$m\,dv/dt = -B^2${s}^2v/R$. Writing $dv/dt = v\,dv/dx$ gives $dv/dx = -B^2${s}^2/(mR)$: the speed falls linearly with distance and reaches zero at $x = mv_0R/(B^2${s}^2)$, even though the time is infinite (exponential decay).`,
          };
        }
        if (v === 'heat') {
          return {
            q: `${horiz} What is the total energy dissipated in the resistor after the rod is released?`,
            ...symMC(R, raw`\tfrac{1}{2}mv_0^2`, [raw`mv_0^2`, raw`\tfrac{1}{4}mv_0^2`, raw`\dfrac{B^2${s}^2v_0^2}{R}`, '0', raw`\dfrac{B^2${s}^2v_0}{R}`]),
            level: 2,
            expl: raw`The rod slows exponentially to rest and the only energy sink is Joule heating, so all of its initial kinetic energy $\tfrac{1}{2}mv_0^2$ ends up in the resistor — independent of $B$, $${s}$ and $R$.`,
          };
        }
        if (v === 'charge') {
          return {
            q: `${horiz} What total charge passes through the resistor after the rod is released?`,
            ...symMC(R, raw`\dfrac{mv_0}{B${s}}`, [raw`\dfrac{mv_0}{2B${s}}`, raw`\dfrac{mv_0R}{B${s}}`, raw`\dfrac{mv_0B${s}}{R}`, raw`\dfrac{mv_0^2}{B${s}}`, raw`\dfrac{2mv_0}{B${s}}`]),
            expl: raw`The impulse of the magnetic force stops the rod: $\int I${s}B\,dt = B${s}\,Q = mv_0$, so $Q = mv_0/(B${s})$. (Equivalently $Q = \Delta\Phi/R = B${s}x/R$ with stopping distance $x = mv_0R/(B^2${s}^2)$.)`,
          };
        }
        return {
          q: `${horiz} What is the speed of the rod a time $t$ after it is released?`,
          ...symMC(R, raw`v_0\,e^{-B^2${s}^2t/(mR)}`, [raw`v_0\,e^{-B${s}t/(mR)}`, raw`v_0\,e^{-B^2${s}^2t/(2mR)}`, raw`v_0\,e^{-mRt/(B^2${s}^2)}`, raw`v_0\left(1 - \dfrac{B^2${s}^2t}{mR}\right)`, raw`v_0`]),
          expl: raw`$\mathcal{E} = B${s}v$, $I = B${s}v/R$, and the braking force is $I${s}B$: $m\,dv/dt = -B^2${s}^2v/R$, so $v = v_0e^{-t/\tau}$ with $\tau = mR/(B^2${s}^2)$. Only this exponent is dimensionless and decreases with $B$.`,
        };
      },
    },
    {
      id: 'em2.faraday.lenz', sec: '2.3.2', level: 1, weight: 2,
      gen(R) {
        // each scenario: text, flux direction d (+1 up, -1 down) and whether |flux| increases; or a fixed answer
        const pole = R.pick(['north', 'south']);
        const SC = [];
        const dAbove = pole === 'north' ? -1 : 1; // field at loop from a pole pointing down at it from above
        SC.push({ t: `A bar magnet is held vertically above the loop with its ${pole} pole pointing down, and it is lowered toward the loop.`, d: dAbove, inc: true });
        SC.push({ t: `A bar magnet is held vertically just above the loop with its ${pole} pole pointing down, and it is raised away from the loop.`, d: dAbove, inc: false });
        SC.push({ t: `A bar magnet is held vertically below the loop with its ${pole} pole pointing up, and it is raised toward the loop.`, d: -dAbove, inc: true });
        SC.push({ t: `A bar magnet is held vertically just below the loop with its ${pole} pole pointing up, and it is lowered away from the loop.`, d: -dAbove, inc: false });
        SC.push({ t: `A bar magnet, held vertically with its ${pole} pole pointing down, is dropped from above the loop and falls through it.`, d: dAbove, through: true });
        const fd = R.pick([1, -1]), fdir = fd > 0 ? 'upward' : 'downward';
        const grow = R.bool();
        SC.push({ t: `The loop lies in a uniform ${fdir} magnetic field whose magnitude is ${grow ? 'increasing' : 'decreasing'} steadily.`, d: fd, inc: grow });
        SC.push({ t: `The loop is moved horizontally ${grow ? 'into' : 'out of'} a region of uniform ${fdir} magnetic field.`, d: fd, inc: grow });
        SC.push({ t: `The loop is a flexible ring lying in a uniform ${fdir} magnetic field, and its radius is ${grow ? 'increasing' : 'shrinking'}.`, d: fd, inc: grow });
        const side = R.pick(['east', 'west']), cur = R.pick(['north', 'south']);
        // wire along y (north), loop east (+x): field direction z = (cur north ? -1 : +1) * (east ? 1 : -1)
        const dw = (cur === 'north' ? -1 : 1) * (side === 'east' ? 1 : -1);
        SC.push({ t: `A long straight wire lies in the same horizontal plane as the loop, running north–south just ${side === 'east' ? 'west' : 'east'} of it, so the loop is ${side} of the wire. The wire carries a current toward the ${cur} that is ${grow ? 'increasing' : 'decreasing'}.`, d: dw, inc: grow, lvl: 2 });
        SC.push({ t: `The loop moves horizontally at constant velocity while remaining entirely inside a region of uniform, constant ${fdir} magnetic field.`, none: true });
        SC.push({ t: `The loop spins about its own vertical symmetry axis in a uniform, constant ${fdir} magnetic field.`, none: true });
        const s = R.pick(SC);
        const fromAbove = R.bool(0.7);
        const view = fromAbove ? 'above' : 'below';
        const dirOf = up => ((up ? 1 : -1) * (fromAbove ? 1 : -1) > 0 ? 'Counterclockwise' : 'Clockwise');
        const CH = ['Clockwise', 'Counterclockwise', 'No current is induced', 'Clockwise at first, then counterclockwise', 'Counterclockwise at first, then clockwise'];
        let ans, why;
        if (s.none) { ans = CH[2]; why = 'The magnetic flux through the loop does not change, so no emf is induced.'; }
        else if (s.through) {
          const a1 = dirOf(-s.d > 0), a2 = dirOf(s.d > 0);
          ans = a1 === 'Clockwise' ? CH[3] : CH[4];
          why = `The magnet’s field through the loop points ${s.d > 0 ? 'up' : 'down'}. As the magnet approaches, this flux grows and the induced current opposes it (${a1.toLowerCase()} seen from ${view}); after the magnet passes through, the flux shrinks and the current reverses (${a2.toLowerCase()}).`;
        } else {
          const up = s.inc ? s.d < 0 : s.d > 0;
          ans = dirOf(up);
          why = `The flux through the loop points ${s.d > 0 ? 'up' : 'down'} and is ${s.inc ? 'increasing' : 'decreasing'}. By Lenz’s law the induced current makes its own field point ${up ? 'up' : 'down'} inside the loop (to ${s.inc ? 'oppose the increase' : 'make up for the decrease'}), which by the right-hand rule is ${ans.toLowerCase()} as seen from ${view}.`;
        }
        if (s.d != null && !s.none && /bar magnet/.test(s.t)) why = 'Field lines leave a north pole and enter a south pole. ' + why;
        if (s.lvl === 2) why = 'The wire’s field circles it (right-hand rule), so it is vertical at the loop. ' + why;
        return {
          q: `A circular wire loop lies flat in a horizontal plane. ${s.t} As seen from ${view}, what is the direction of the current induced in the loop?`,
          ...GRE.mc(R, ans, CH.filter(c => c !== ans)),
          level: s.lvl || (s.through ? 2 : 1),
          expl: why,
        };
      },
    },
    {
      id: 'em2.faraday.generator', sec: '2.3.2', level: 2,
      gen(R) {
        const v = R.pick(['peak', 'peak', 'power', 'scale']);
        if (v === 'peak') {
          const N = R.pick([10, 20, 50, 100, 200, 500]), Acm = R.pick([20, 50, 100, 200, 400]), B = R.pick([0.05, 0.1, 0.2, 0.25, 0.5]);
          const f = R.pick([10, 20, 50, 60, 100]);
          const w = 2 * PI * f, A = Acm / 1e4;
          const emf = N * B * A * w;
          const rms = R.bool(0.3);
          const ans = rms ? emf / Math.SQRT2 : emf;
          return {
            q: raw`A generator coil has $${N}$ turns, each of area $${Acm}\,\text{cm}^2$, and rotates at $${f}$ revolutions per second about an axis perpendicular to a uniform magnetic field of $${B}\,\text{T}$. What is the ${rms ? 'rms' : 'maximum'} emf induced in the coil?`,
            ...GRE.numeric(R, ans, rms ? [emf, N * B * A * f / Math.SQRT2, B * A * w / Math.SQRT2, emf / 2] : [N * B * A * f, B * A * w, emf / Math.SQRT2, 2 * emf], { unit: U.V }),
            expl: raw`$\Phi = NBA\cos\omega t$, so $\mathcal{E} = NBA\omega\sin\omega t$ with $\omega = 2\pi f = ${F.num(w, 3)}\,\text{rad/s}$. Peak: $NBA\omega = ${vu(emf, U.V)}$${rms ? raw`; rms $= \mathcal{E}_0/\sqrt{2} = ${vu(ans, U.V)}$` : ''}. Forgetting the $2\pi$ (using $f$ for $\omega$) is the usual trap.`,
          };
        }
        if (v === 'power') {
          return {
            q: raw`A flat coil of $N$ turns and area $A$ rotates with constant angular velocity $\omega$ about an axis perpendicular to a uniform magnetic field $B$. The coil’s ends are connected to a resistor, and the total resistance of the circuit is $R$. Neglecting self-inductance, what is the time-averaged power dissipated?`,
            ...symMC(R, raw`\dfrac{N^2B^2A^2\omega^2}{2R}`, [raw`\dfrac{N^2B^2A^2\omega^2}{R}`, raw`\dfrac{NB^2A^2\omega^2}{2R}`, raw`\dfrac{N^2B^2A^2\omega}{2R}`, '0', raw`\dfrac{NBA\omega}{2R}`]),
            expl: raw`$\mathcal{E} = NBA\omega\sin\omega t$, so $P = \mathcal{E}^2/R = (NBA\omega)^2\sin^2\omega t/R$, and $\langle\sin^2\rangle = 1/2$. (The emf averages to zero, but the power does not.)`,
          };
        }
        const a = R.pick([[1, 2], [2, 1], [3, 1], [1, 1], [1, 3]]), b = R.pick([[2, 1], [3, 1], [1, 2], [4, 1]]), c = R.pick([[1, 1], [2, 1], [1, 2]]);
        const fN = a[0] / a[1], fw = b[0] / b[1], fB = c[0] / c[1];
        const askP = R.bool();
        const e = fN * fw * fB;
        if (near(e, 1) && !askP) throw new Error('trivial');
        const ans = askP ? e * e : e;
        const desc = (f, name) => (f[0] === f[1] ? null : f[0] > f[1] ? `${f[1] === 1 ? (f[0] === 2 ? 'doubled' : f[0] === 3 ? 'tripled' : 'multiplied by ' + f[0]) : 'multiplied by ' + F.fracI(f[0], f[1])}` : f[0] === 1 && f[1] === 2 ? 'halved' : `reduced to ${F.fracI(f[0], f[1])} of its value`);
        const parts = [[a, 'the number of turns'], [b, 'the rotation frequency'], [c, 'the magnetic field']].filter(p => desc(p[0])).map(p => `${p[1]} is ${desc(p[0])}`);
        if (!parts.length) throw new Error('no change');
        return {
          q: `A coil rotates in a uniform magnetic field and drives a current through a fixed load resistor (neglect the coil’s resistance and inductance). If ${parts.length > 1 ? parts.slice(0, -1).join(', ') + ' and ' + parts[parts.length - 1] : parts[0]}, by what factor does the ${askP ? 'average power delivered to the load' : 'peak emf'} change?`,
          ...facMC(R, ans, askP ? [e, e * e * e, e * fw * fw, Math.sqrt(e)] : [e * e, fN * fB, fw * fB, e * fw]),
          expl: raw`$\mathcal{E}_0 = NBA\omega$ changes by $${fac(fN)}\times${fac(fw)}\times${fac(fB)} = ${fac(e)}$${askP ? raw`, and $\langle P\rangle = \mathcal{E}_0^2/(2R)$ changes by its square, $${fac(ans)}$` : ''}.`,
        };
      },
    },
    {
      id: 'em2.faraday.entering', sec: '2.3.2', level: 2,
      gen(R) {
        const w = R.pick([0.1, 0.2, 0.25]), h = R.pick([0.1, 0.2, 0.3, 0.4, 0.5]), D = R.pick([0.5, 0.6, 0.8, 1.0]);
        const v = R.pick([0.5, 1, 2, 2.5, 5]), B = R.pick([0.2, 0.4, 0.5, 0.8, 1, 2]), Rr = R.pick([0.1, 0.2, 0.5, 1, 2]);
        const I0 = B * h * v / Rr;
        const head = raw`A rectangular wire loop with resistance $${Rr}\,\Omega$ has sides $${w * 100}\,\text{cm}$ (parallel to its velocity) and $${h * 100}\,\text{cm}$ (perpendicular to it). It moves at constant speed $${v}\,\text{m/s}$ into, through, and out of a region of width $${D * 100}\,\text{cm}$ containing a uniform magnetic field of $${B}\,\text{T}$ perpendicular to the plane of the loop. The leading edge of the loop enters the field region at $t = 0$.`;
        if (R.bool(0.75)) {
          const phase = R.pick(['in', 'inside', 'out', 'in', 'out']);
          let t, ans;
          if (phase === 'in') { t = w / v / 2; ans = I0; }
          else if (phase === 'inside') { t = (w + D) / v / 2; ans = 0; }
          else { t = (D + w / 2) / v; ans = I0; }
          return {
            q: raw`${head} What is the magnitude of the induced current at $t = ${F.num(t, 3)}\,\text{s}$?`,
            ...numMC(R, ans, [ans ? 0 : I0, B * w * v / Rr, 2 * I0, I0 / 2, B * h * w * v / Rr], { unit: U.A }),
            expl: phase === 'inside'
              ? raw`At this time the loop (length $${w * 100}\,\text{cm}$) is entirely inside the field region: the flux is constant, so no current flows, even though the loop is moving.`
              : raw`At this time the loop is ${phase === 'in' ? 'entering' : 'leaving'} the field: only one side of length $h = ${h * 100}\,\text{cm}$ cuts field lines, so $|\mathcal{E}| = Bhv = ${F.num(B * h * v, 3)}\,\text{V}$ and $I = Bhv/R = ${vu(I0, U.A)}$${phase === 'out' ? ' (in the opposite sense to the entering current)' : ''}.`,
          };
        }
        const E = 2 * (B * h * v) ** 2 / Rr * (w / v);
        return {
          q: raw`${head} How much energy is dissipated in the loop during its entire passage through the field region?`,
          ...GRE.numeric(R, E, [E / 2, 2 * (B * h * v) ** 2 / Rr * (D / v), (B * h * v) ** 2 / Rr * ((D + w) / v), 2 * (B * w * v) ** 2 / Rr * (h / v)], { unit: U.J }),
          level: 3,
          expl: raw`Current flows only while the loop enters and while it leaves, each for $w/v$: $P = (Bhv)^2/R$, so $E = 2(Bhv)^2/R\cdot w/v = 2B^2h^2wv/R = ${vu(E, U.J)}$. While fully inside, the flux is constant and nothing is dissipated.`,
        };
      },
    },
    {
      id: 'em2.faraday.inducedE', sec: '2.3.2', level: 3,
      gen(R) {
        const a = R.pick([2, 3, 4, 5, 6, 10]); // cm
        const rate = R.pick([0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 5]);
        const inside = R.bool();
        const r = inside ? R.pick([0.25, 0.5, 0.75].map(f => f * a)) : R.pick([1.5, 2, 3, 4].map(f => f * a));
        const am = a / 100, rm = r / 100;
        const E = inside ? rm / 2 * rate : am * am / (2 * rm) * rate;
        const force = R.bool(0.25);
        const ans = force ? C.e * E : E;
        const wr = [inside ? am * am / (2 * rm) * rate : rm / 2 * rate, rm * rate, am / 2 * rate, PI * Math.min(rm, am) ** 2 * rate, inside ? null : 0].map(x => (x == null ? null : force ? x * C.e : x));
        return {
          q: raw`A long solenoid of radius $${a}\,\text{cm}$ has a uniform magnetic field inside it (and negligible field outside) that is increasing at $${rate}\,\text{T/s}$. What is the magnitude of the induced ${force ? 'electric force on an electron' : 'electric field'} at a distance of $${F.num(r, 3)}\,\text{cm}$ from the solenoid’s axis${inside ? '' : ', outside the solenoid'}?`,
          ...numMC(R, ans, wr, { unit: force ? U.N : U.Vm }),
          expl: raw`By symmetry the induced $\mathbf{E}$ circles the axis: $E\cdot 2\pi r = d\Phi_B/dt$. ${inside ? raw`Inside, $\Phi_B = \pi r^2 B$, so $E = \tfrac{r}{2}\,\dfrac{dB}{dt}$` : raw`Outside, the enclosed flux is $\pi a^2B$, so $E = \dfrac{a^2}{2r}\,\dfrac{dB}{dt}$`} $= ${vu(E, U.Vm)}$${force ? raw`, and $F = eE = ${vu(ans, U.N)}$` : ''}.${inside ? '' : ' The induced field outside is not zero even though $B = 0$ there.'}`,
        };
      },
    },
    // =============================================================== 2.3.3 Inductors
    {
      id: 'em2.inductor.solenoid', sec: '2.3.3', level: 1,
      gen(R) {
        if (R.bool(0.4)) {
          const N = R.pick([100, 200, 250, 400, 500, 1000]), l = R.pick([0.1, 0.2, 0.25, 0.4, 0.5]), r = R.pick([0.5, 1, 1.5, 2, 3]);
          const A = PI * (r / 100) ** 2, L = C.mu0 * N * N * A / l;
          return {
            q: raw`A long air-core solenoid has $${N}$ turns wound uniformly over a length of $${l * 100}\,\text{cm}$ and a radius of $${r}\,\text{cm}$. What is its self-inductance? (Take $\mu_0 = 4\pi\times 10^{-7}\,\text{T}\cdot\text{m/A}$.)`,
            ...GRE.numeric(R, L, [C.mu0 * N * A / l, L * 4, C.mu0 * N * N * A * l, L / (2 * PI)], { unit: U.H }),
            expl: raw`$B = \mu_0 NI/l$ inside, and each of the $N$ turns links flux $BA$: $L = N\Phi/I = \mu_0N^2A/l = ${vu(L, U.H)}$. Forgetting that the flux links all $N$ turns gives $\mu_0NA/l$.`,
          };
        }
        const opts = [[2, 1], [3, 1], [1, 2], [1, 1]];
        const fN = R.pick([[2, 1], [3, 1], [1, 2], [1, 1], [4, 1]]), fr = R.pick(opts), fl = R.pick([[2, 1], [1, 2], [1, 1], [3, 1]]);
        const n = fN[0] / fN[1], rr = fr[0] / fr[1], ll = fl[0] / fl[1];
        if (n === 1 && rr === 1 && ll === 1) throw new Error('no change');
        const ans = n * n * rr * rr / ll;
        const d = (f, w) => (f[0] === f[1] ? null : `the ${w} is ${f[0] === 2 && f[1] === 1 ? 'doubled' : f[0] === 3 ? 'tripled' : f[0] === 4 ? 'quadrupled' : 'halved'}`);
        const parts = [d(fN, 'number of turns'), d(fr, 'radius'), d(fl, 'length')].filter(Boolean);
        return {
          q: `A long solenoid has self-inductance $L_0$. A second solenoid is made in which ${parts.length > 1 ? parts.slice(0, -1).join(', ') + ' and ' + parts[parts.length - 1] : parts[0]}${parts.length > 1 ? ' (all other properties unchanged)' : ', with everything else unchanged'}. What is the inductance of the second solenoid?`,
          ...facMC(R, ans, [n * rr * rr / ll, n * n * rr / ll, n * n * rr * rr * ll, n * rr / ll, n * n / ll], { fmt: x => (near(x, 1) ? 'L_0' : fac(x) + 'L_0') }),
          expl: raw`$L = \mu_0N^2A/l = \mu_0N^2\pi r^2/l$, so the factor is $(${fac(n)})^2(${fac(rr)})^2/(${fac(ll)}) = ${fac(ans)}$. Remember $N^2$: more turns both strengthen the field and link it more times.`,
        };
      },
    },
    {
      id: 'em2.inductor.geometry', sec: '2.3.3', level: 3,
      gen(R) {
        const v = R.pick(['toroid', 'coax', 'mutualSol', 'mutualLoop']);
        if (v === 'toroid') return {
          q: raw`A toroid with $N$ closely wound turns has a rectangular cross-section: inner radius $a$, outer radius $b$, and height $h$. What is its self-inductance?`,
          ...symMC(R, raw`\dfrac{\mu_0N^2h}{2\pi}\ln\dfrac{b}{a}`, [raw`\dfrac{\mu_0Nh}{2\pi}\ln\dfrac{b}{a}`, raw`\dfrac{\mu_0N^2h}{2\pi\ln(b/a)}`, raw`\dfrac{\mu_0N^2h(b-a)}{2\pi b}`, raw`\mu_0N^2h\ln\dfrac{b}{a}`, raw`\dfrac{\mu_0N^2h}{2\pi}\ln\dfrac{a}{b}`]),
          expl: raw`Ampère: $B = \mu_0NI/(2\pi s)$ inside. Flux through one turn: $\int_a^b B\,h\,ds = \dfrac{\mu_0NIh}{2\pi}\ln(b/a)$. Multiply by $N$ turns and divide by $I$. (A negative answer, $\ln(a/b)$, is impossible.)`,
        };
        if (v === 'coax') return {
          q: raw`A long coaxial cable consists of a thin inner cylindrical conducting shell of radius $a$ and a thin outer cylindrical shell of radius $b$, carrying equal and opposite currents. What is the self-inductance per unit length?`,
          ...symMC(R, raw`\dfrac{\mu_0}{2\pi}\ln\dfrac{b}{a}`, [raw`\dfrac{\mu_0}{\pi}\ln\dfrac{b}{a}`, raw`\dfrac{\mu_0}{2\pi\ln(b/a)}`, raw`\dfrac{\mu_0(b-a)}{2\pi a}`, raw`\dfrac{2\pi\epsilon_0}{\ln(b/a)}`, raw`\dfrac{\mu_0}{4\pi}\ln\dfrac{b}{a}`]),
          expl: raw`Field only between the shells: $B = \mu_0I/(2\pi s)$. Flux per unit length $= \int_a^b B\,ds = \dfrac{\mu_0I}{2\pi}\ln(b/a)$, so $L/\ell = \dfrac{\mu_0}{2\pi}\ln(b/a)$. ($2\pi\epsilon_0/\ln(b/a)$ is the capacitance per length, the electric analogue.)`,
        };
        if (v === 'mutualSol') return {
          q: raw`A short coil of $N_1$ turns and radius $r_1$ sits coaxially inside a long solenoid of radius $r_2 > r_1$, length $\ell$, and $N_2$ turns. What is the mutual inductance of the pair?`,
          ...symMC(R, raw`\dfrac{\mu_0N_1N_2\pi r_1^2}{\ell}`, [raw`\dfrac{\mu_0N_1N_2\pi r_2^2}{\ell}`, raw`\dfrac{\mu_0N_2\pi r_1^2}{\ell}`, raw`\dfrac{\mu_0N_1N_2\pi (r_2^2-r_1^2)}{\ell}`, raw`\dfrac{\mu_0N_1^2N_2\pi r_1^2}{\ell}`, raw`\dfrac{\mu_0N_1N_2\pi r_1^2}{2\ell}`]),
          expl: raw`Easiest direction: current $I$ in the long solenoid gives $B = \mu_0N_2I/\ell$, which threads only the inner coil’s area $\pi r_1^2$, $N_1$ times: $M = \mu_0N_1N_2\pi r_1^2/\ell$ (and $M_{12} = M_{21}$).`,
        };
        return {
          q: raw`A small circular loop of radius $b$ lies at the center of, and in the same plane as, a large circular loop of radius $a \gg b$. What is, approximately, their mutual inductance?`,
          ...symMC(R, raw`\dfrac{\mu_0\pi b^2}{2a}`, [raw`\dfrac{\mu_0\pi a^2}{2b}`, raw`\dfrac{\mu_0 b^2}{2a}`, raw`\dfrac{\mu_0\pi b^2}{2\pi a}`, raw`\dfrac{\mu_0\pi b^2}{a}`, raw`\dfrac{\mu_0\pi b^3}{2a^2}`]),
          expl: raw`Use $M_{12} = M_{21}$ and drive the big loop: its central field $\mu_0I/(2a)$ is nearly uniform over the small loop, so $\Phi = \mu_0I\pi b^2/(2a)$ and $M = \mu_0\pi b^2/(2a)$.`,
        };
      },
    },
    {
      id: 'em2.inductor.emf', sec: '2.3.3', level: 1,
      gen(R) {
        const L = R.pick([2, 5, 10, 20, 40, 50, 100, 200]); // mH
        const v = R.pick(['ramp', 'ramp', 'sine', 'findL']);
        if (v === 'ramp') {
          const I1 = R.pick([0, 0.5, 1, 2]), I2 = I1 + R.pick([0.5, 1, 2, 3, 4]), dt = R.pick([1, 2, 5, 10, 20]); // ms
          const emf = L * 1e-3 * (I2 - I1) / (dt * 1e-3);
          return {
            q: raw`The current through a $${L}\,\text{mH}$ inductor increases uniformly from $${I1}\,\text{A}$ to $${I2}\,\text{A}$ in $${dt}\,\text{ms}$. What is the magnitude of the emf induced across the inductor?`,
            ...GRE.numeric(R, emf, [L * 1e-3 * I2 / (dt * 1e-3), L * (I2 - I1) / dt * 1e-3, L * 1e-3 * (I2 - I1) * dt * 1e-3, 0.5 * L * 1e-3 * (I2 * I2 - I1 * I1)], { unit: U.V }),
            expl: raw`$|\mathcal{E}| = L\,|dI/dt| = (${L}\times10^{-3}\,\text{H})(${I2 - I1}\,\text{A})/(${dt}\times10^{-3}\,\text{s}) = ${vu(emf, U.V)}$. Only the change in current matters, not its value.`,
          };
        }
        if (v === 'sine') {
          const I0 = R.pick([0.1, 0.2, 0.5, 1, 2]), f = R.pick([50, 60, 100, 500, 1000]);
          const emf = L * 1e-3 * I0 * 2 * PI * f;
          return {
            q: raw`The current in a $${L}\,\text{mH}$ inductor is $I(t) = (${I0}\,\text{A})\sin(2\pi f t)$ with $f = ${f}\,\text{Hz}$. What is the maximum magnitude of the voltage across the inductor?`,
            ...GRE.numeric(R, emf, [L * 1e-3 * I0 * f, L * 1e-3 * I0 * 2 * PI * f / Math.SQRT2, L * 1e-3 * I0 / (2 * PI * f), 0.5 * L * 1e-3 * I0 * I0], { unit: U.V }),
            level: 2,
            expl: raw`$V = L\,dI/dt = L I_0\omega\cos\omega t$, so $V_{\max} = LI_0\omega = LI_0(2\pi f) = ${vu(emf, U.V)}$. It peaks when the current passes through zero (voltage leads current by $90^\circ$).`,
          };
        }
        const rate = R.pick([10, 20, 50, 100, 200, 500]), emf = L * 1e-3 * rate;
        return {
          q: raw`When the current through a coil changes at a steady rate of $${rate}\,\text{A/s}$, an emf of $${F.num(emf, 3)}\,\text{V}$ is induced across it. What is the coil’s self-inductance?`,
          ...GRE.numeric(R, L * 1e-3, [emf * rate, rate / emf, L * 1e-3 / 2], { unit: U.H }),
          expl: raw`$L = |\mathcal{E}|/|dI/dt| = ${F.num(emf, 3)}/${rate} = ${vu(L * 1e-3, U.H)}$ $= ${L}\,\text{mH}$.`,
        };
      },
    },

    // =============================================================== 2.4.1 Electric dipoles
    {
      id: 'em2.dipole.moment', sec: '2.4.1', level: 2,
      gen(R) {
        const PTS = [];
        for (let x = -1; x <= 1; x++) for (let y = -1; y <= 1; y++) PTS.push([x, y]);
        const n = R.pick([2, 3, 3, 4]);
        const pts = R.pickN(PTS, n);
        const qs = [];
        let sum = 0;
        for (let i = 0; i < n - 1; i++) { const q = R.pick([-2, -1, 1, 2, 3]); qs.push(q); sum += q; }
        const last = -sum;
        if (last === 0 || Math.abs(last) > 3) throw new Error('bad charges');
        qs.push(last);
        let px = 0, py = 0, ax = 0, ay = 0;
        pts.forEach((p, i) => { px += qs[i] * p[0]; py += qs[i] * p[1]; ax += Math.abs(qs[i]) * p[0]; ay += Math.abs(qs[i]) * p[1]; });
        const n2 = px * px + py * py;
        if (!n2) throw new Error('zero dipole');
        const co = c => (c === 0 ? '0' : c === 1 ? 'a' : c === -1 ? '-a' : c + 'a');
        const qt = q => (q > 0 ? '+' : '-') + (Math.abs(q) === 1 ? '' : Math.abs(q)) + 'q';
        const list = pts.map((p, i) => `$${qt(qs[i])}$ at $(${co(p[0])}, ${co(p[1])})$`);
        const fmt = x => { const k = Math.round(x * x); const s = Math.abs(Math.sqrt(k) - x) < 1e-9 ? F.sqrt(k) : fac(x); return s === '1' ? 'qa' : s + '\\,qa'; };
        const ans = Math.sqrt(n2);
        return {
          q: `Point charges lie in the $xy$-plane: ${list.slice(0, -1).join(', ')}${n > 2 ? ',' : ''} and ${list[n - 1]}. What is the magnitude of the electric dipole moment of this configuration?`,
          ...numMC(R, ans, [Math.abs(px) + Math.abs(py), Math.hypot(ax, ay), 2 * ans, ans / 2, Math.sqrt(n2 + 1), Math.sqrt(Math.max(n2 - 1, 0))], { fmt, tol: 0.04 }),
          expl: raw`$\mathbf{p} = \sum_i q_i\mathbf{r}_i = (${px}\,\hat{x} ${py < 0 ? '-' : '+'} ${Math.abs(py)}\,\hat{y})\,qa$, so $|\mathbf{p}| = \sqrt{${px * px} + ${py * py}}\,qa = ${fmt(ans)}$. The net charge is zero, so the result does not depend on the choice of origin. Add the components as vectors, not their magnitudes.`,
        };
      },
    },
    {
      id: 'em2.dipole.torque', sec: '2.4.1', level: 2,
      gen(R) {
        const q = R.pick([1, 2, 3, 4, 5]), d = R.pick([1, 2, 4, 5, 10]); // uC, mm
        const E = R.pick([1, 2, 3, 5, 8]) * 10 ** R.pick([3, 4, 5]);
        const p = q * 1e-6 * d * 1e-3, pE = p * E;
        const v = R.pick(['torque', 'torque', 'energy', 'work', 'flip']);
        const th = R.pick([30, 60, 90, 120, 150]);
        const s = +Math.sin(th * PI / 180).toFixed(12), c = +Math.cos(th * PI / 180).toFixed(12);
        const head = raw`An electric dipole consists of charges $\pm${q}\,\mu\text{C}$ separated by $${d}\,\text{mm}$ and is placed in a uniform electric field of magnitude $${F.num(E)}\,\text{N/C}$.`;
        if (v === 'torque') return {
          q: raw`${head} The dipole moment makes an angle of $${th}^\circ$ with the field. What is the magnitude of the torque on the dipole?`,
          ...numMC(R, pE * s, [pE * Math.abs(c), pE, q * 1e-6 * E, 0, pE * s / 2], { unit: U.Nm }),
          expl: raw`$\tau = |\mathbf{p}\times\mathbf{E}| = pE\sin\theta$ with $p = qd = ${F.sci(p)}\,\text{C}\cdot\text{m}$: $\tau = ${vu(pE * s, U.Nm)}$. The net force is zero in a uniform field, but the torque is not.`,
        };
        if (v === 'energy') {
          if (th === 90) throw new Error('zero');
          const Uv = -pE * c;
          return {
            q: raw`${head} The dipole moment makes an angle of $${th}^\circ$ with the field. What is the potential energy of the dipole (zero when $\mathbf{p}\perp\mathbf{E}$)?`,
            ...numMC(R, Uv, [-Uv, -pE * s, pE * s, -pE, pE], { unit: U.J, allowNeg: true }),
            expl: raw`$U = -\mathbf{p}\cdot\mathbf{E} = -pE\cos\theta = ${vu(Uv, U.J)}$. It is lowest (most negative) when $\mathbf{p}$ is aligned with $\mathbf{E}$; watch the sign.`,
          };
        }
        if (v === 'work') {
          const W = pE * (1 - c);
          return {
            q: raw`${head} Initially the dipole is aligned with the field. How much work must an external agent do to rotate it slowly until its moment makes an angle of $${th}^\circ$ with the field?`,
            ...numMC(R, W, [pE * Math.abs(c), pE * s, pE * (1 + c), 2 * pE, pE], { unit: U.J }),
            expl: raw`$W = \Delta U = (-pE\cos${th}^\circ) - (-pE) = pE(1 - \cos${th}^\circ) = ${vu(W, U.J)}$.`,
          };
        }
        return {
          q: raw`${head} How much work must an external agent do to rotate the dipole slowly from the orientation in which it is aligned with the field to the one in which it is antiparallel to the field?`,
          ...numMC(R, 2 * pE, [pE, 0, 4 * pE, pE / 2, q * 1e-6 * E], { unit: U.J }),
          level: 1,
          expl: raw`$W = U_f - U_i = (+pE) - (-pE) = 2pE = ${vu(2 * pE, U.J)}$, with $p = qd = ${F.sci(p)}\,\text{C}\cdot\text{m}$.`,
        };
      },
    },
    {
      id: 'em2.dipole.scaling', sec: '2.4.1', level: 2, weight: 2,
      gen(R) {
        const mag = R.bool(0.35);
        const m = R.pick([1, 2, 3, 4, 1 / 2]), k = R.pick([2, 3, 4, 1 / 2]);
        const pot = !mag && R.bool(0.3);
        const where = pot ? R.pick(['axis', 'angle']) : R.pick(['axis', 'axis', 'eq', 'axis2eq']);
        if (!pot && where === 'axis' && m === 2 && k === 2) throw new Error('book example');
        const nm = mag ? 'magnetic dipole (a small current loop) of moment $m$' : 'n electric dipole of moment $p$';
        const M = mag ? 'm' : 'p', Q = mag ? 'magnetic field' : pot ? 'electric potential' : 'electric field';
        const kd = fac(k), md = fac(m);
        let ans, base, target, ex;
        const n = pot ? 2 : 3;
        if (where === 'axis') { ans = m / k ** n; base = `on its axis at distance $r$`; target = `on the axis at distance $${kd}\\,r$`; }
        else if (where === 'eq') { ans = m / k ** n; base = `in its equatorial plane (perpendicular bisector) at distance $r$`; target = `in the equatorial plane at distance $${kd}\\,r$`; }
        else if (where === 'axis2eq') { ans = m / k ** n / 2; base = `on its axis at distance $r$`; target = `in its equatorial plane at distance $${kd}\\,r$`; }
        else { ans = m / k ** n / 2; base = `on its axis at distance $r$`; target = `at distance $${kd}\\,r$ along a line making $60^\\circ$ with the axis`; }
        const sym = pot ? 'V_0' : mag ? 'B_0' : 'E_0';
        const fmt = x => (near(x, 1) ? sym : fac(x) + sym);
        const wr = [m / k ** (n - 1), m / k ** (n + 1), m / k ** n * (where === 'axis' || where === 'eq' ? 2 : 1), m / k ** n / 4, m * m / k ** n, 1 / k ** n];
        return {
          q: `A${mag ? ' ' : ''}${nm} produces ${pot ? 'a potential' : 'a field of magnitude'} $${sym}$ at a point ${base}, with $r$ much larger than the size of the dipole. If the dipole is replaced by ${md === '1' ? 'another dipole of the same moment' : `one of moment $${md}\\,${M}$`}, what is the ${Q}${pot ? '' : ' magnitude'} ${target}?`,
          ...facMC(R, ans, wr, { fmt }),
          level: where === 'axis' ? 2 : 3,
          expl: (pot ? raw`Dipole potential: $V = \dfrac{p\cos\theta}{4\pi\epsilon_0 r^2}$, so $V \propto p/r^2$` : raw`A dipole field falls off as $${M}/r^3$ (one power faster than a point charge), and at equal distance the on-axis field is twice the equatorial field`) +
            raw`. Factor: $${md}\times(${fac(1 / k)})^{${n}}${where === 'axis' || where === 'eq' ? '' : where === 'angle' ? raw`\times\cos60^\circ` : raw`\times\tfrac{1}{2}`} = ${fac(ans)}$.`,
        };
      },
    },
    {
      id: 'em2.dipole.oscillation', sec: '2.4.1', level: 3,
      gen(R) {
        const v = R.pick(['dumbbell', 'square', 'ring', 'ratio']);
        if (v === 'dumbbell') return {
          q: raw`Two small spheres, each of mass $m$, carry charges $+q$ and $-q$ and are joined by a light rigid rod of length $d$ that can rotate freely about its midpoint. The system is placed in a uniform electric field $E$ and displaced slightly from equilibrium. What is the angular frequency of small oscillations?`,
          ...symMC(R, raw`\sqrt{\dfrac{2qE}{md}}`, [raw`\sqrt{\dfrac{qE}{md}}`, raw`\sqrt{\dfrac{qE}{2md}}`, raw`\sqrt{\dfrac{4qE}{md}}`, raw`\sqrt{\dfrac{2qEd}{m}}`, raw`\sqrt{\dfrac{md}{2qE}}`]),
          expl: raw`Torque $-pE\sin\theta \approx -qdE\,\theta$; moment of inertia $I = 2m(d/2)^2 = md^2/2$. So $\omega = \sqrt{pE/I} = \sqrt{2qE/(md)}$.`,
        };
        if (v === 'square') return {
          q: raw`A square loop of wire of side $s$ and total mass $M$ (uniformly distributed) carries current $i$ and can rotate freely about a horizontal axis through its center, parallel to two of its sides. A uniform magnetic field $B$ is applied, and the loop is displaced slightly from its stable equilibrium. Neglecting gravity, what is the angular frequency of small oscillations?`,
          ...symMC(R, raw`\sqrt{\dfrac{6iB}{M}}`, [raw`\sqrt{\dfrac{12iB}{M}}`, raw`\sqrt{\dfrac{8iB}{M}}`, raw`\sqrt{\dfrac{3iB}{M}}`, raw`\sqrt{\dfrac{iB}{M}}`, raw`\sqrt{\dfrac{6iBs}{M}}`]),
          expl: raw`$\mu = is^2$ and $I = 2\cdot\tfrac{M}{4}(s/2)^2 + 2\cdot\tfrac{M}{4}\tfrac{s^2}{12} = Ms^2/6$ (sides parallel to the axis are at $s/2$; the other two rotate about their centers). $\omega = \sqrt{\mu B/I} = \sqrt{6iB/M}$; $s$ cancels.`,
        };
        if (v === 'ring') return {
          q: raw`A thin circular ring of wire of radius $a$ and mass $M$ carries current $i$ and is free to rotate about a diameter. It sits in a uniform magnetic field $B$ perpendicular to that diameter and is displaced slightly from stable equilibrium. Neglecting gravity, what is the angular frequency of small oscillations?`,
          ...symMC(R, raw`\sqrt{\dfrac{2\pi iB}{M}}`, [raw`\sqrt{\dfrac{\pi iB}{M}}`, raw`\sqrt{\dfrac{\pi iB}{2M}}`, raw`\sqrt{\dfrac{2iB}{M}}`, raw`\sqrt{\dfrac{2\pi iBa}{M}}`, raw`\sqrt{\dfrac{4\pi iB}{M}}`]),
          expl: raw`$\mu = i\pi a^2$; a ring about a diameter has $I = Ma^2/2$. $\omega = \sqrt{\mu B/I} = \sqrt{2\pi iB/M}$. Using $I = Ma^2$ (axis through the center, perpendicular to the plane) gives $\sqrt{\pi iB/M}$.`,
        };
        const fB = R.pick([4, 9, 1 / 4, 2, 16]), fI = R.pick([1, 4, 1 / 4, 2]);
        const ans = Math.sqrt(fI / fB);
        if (near(ans, 1)) throw new Error('trivial');
        return {
          q: `A compass needle (a magnetic dipole) oscillates with small amplitude about the direction of a uniform magnetic field with period $T_0$. If the field strength is multiplied by $${fac(fB)}$ and the needle is replaced by one with the same magnetic moment ${fI === 1 ? 'and the same moment of inertia' : `but $${fac(fI)}$ times the moment of inertia`}, what is the new period?`,
          ...facMC(R, ans, [fI / fB, Math.sqrt(fB / fI), fB / fI, Math.sqrt(fI * fB), 1], { fmt: x => (near(x, 1) ? 'T_0' : fac(x) + 'T_0') }),
          level: 2,
          expl: raw`Restoring torque $\mu B\theta$ gives $T = 2\pi\sqrt{I/(\mu B)}$, so $T/T_0 = \sqrt{${fac(fI)}/${fac(fB)}} = ${fac(ans)}$.`,
        };
      },
    },

    // =============================================================== 2.4.2 Magnetic dipoles
    {
      id: 'em2.magdip.torque', sec: '2.4.2', level: 2,
      gen(R) {
        const N = R.pick([1, 10, 20, 50, 100]), I = R.pick([0.5, 1, 2, 3, 4, 5]), B = R.pick([0.1, 0.2, 0.4, 0.5, 0.8, 1.2]);
        const shape = R.pick(['circle', 'square', 'rect']);
        let A, desc;
        if (shape === 'circle') { const r = R.pick([2, 5, 10]); A = PI * (r / 100) ** 2; desc = `circular coil of radius $${r}\\,\\text{cm}$`; }
        else if (shape === 'square') { const s = R.pick([4, 5, 10, 20]); A = (s / 100) ** 2; desc = `square coil of side $${s}\\,\\text{cm}$`; }
        else { const [a, b] = R.pick([[5, 10], [10, 20], [4, 10]]); A = a * b / 1e4; desc = `rectangular coil of sides $${a}\\,\\text{cm}$ and $${b}\\,\\text{cm}$`; }
        const mu = N * I * A;
        const v = R.pick(['moment', 'torque', 'torque', 'energy', 'flip']);
        const head = raw`A ${desc} has $${N}$ turn${N > 1 ? 's' : ''} and carries a current of $${I}\,\text{A}$.`;
        if (v === 'moment') return {
          q: `${head} What is the magnitude of its magnetic dipole moment?`,
          ...GRE.numeric(R, mu, [I * A, mu * 4, N * I * Math.sqrt(A), mu / 2], { unit: U.Am2 }),
          level: 1,
          expl: raw`$\mu = NIA = ${N}\times${I}\times${F.num(A, 3)}\,\text{m}^2 = ${vu(mu, U.Am2)}$, directed along the normal by the right-hand rule.`,
        };
        const th = R.pick([30, 60, 90]);
        const plane = R.bool();
        const ang = plane ? 90 - th : th; // stated angle
        const s = +Math.sin(th * PI / 180).toFixed(12), c = +Math.cos(th * PI / 180).toFixed(12);
        const angText = plane ? `the plane of the coil makes an angle of $${ang}^\\circ$ with a uniform magnetic field of $${B}\\,\\text{T}$` : `the normal to the coil makes an angle of $${ang}^\\circ$ with a uniform magnetic field of $${B}\\,\\text{T}$`;
        if (v === 'torque') return {
          q: `${head} It is placed so that ${angText}. What is the magnitude of the torque on the coil?`,
          ...numMC(R, mu * B * s, [mu * B * c, mu * B, I * A * B * s, 0], { unit: U.Nm }),
          level: plane ? 3 : 2,
          expl: raw`$\tau = \mu B\sin\theta$ where $\theta$ is the angle between the moment (the normal) and $\mathbf{B}$: here $\theta = ${th}^\circ$${plane ? ' — the complement of the angle with the plane' : ''}. $\tau = ${vu(mu * B * s, U.Nm)}$.`,
        };
        if (v === 'energy') {
          if (th === 90) throw new Error('zero');
          const Uv = -mu * B * c;
          return {
            q: `${head} It is placed so that ${angText}, with its moment pointing partly along the field. What is its magnetic potential energy $U = -\\boldsymbol{\\mu}\\cdot\\mathbf{B}$?`,
            ...numMC(R, Uv, [-Uv, -mu * B * s, mu * B * s, -mu * B], { unit: U.J, allowNeg: true }),
            level: plane ? 3 : 2,
            expl: raw`$U = -\mu B\cos\theta$ with $\theta = ${th}^\circ$ between $\boldsymbol{\mu}$ (the normal) and $\mathbf{B}$: $U = ${vu(Uv, U.J)}$.`,
          };
        }
        return {
          q: raw`${head} It is in a uniform magnetic field of $${B}\,\text{T}$, initially in its stable equilibrium orientation. How much work must be done to turn it slowly to its unstable equilibrium orientation?`,
          ...numMC(R, 2 * mu * B, [mu * B, 0, 4 * mu * B, mu * B / 2, 2 * I * A * B], { unit: U.J }),
          expl: raw`Stable: $\boldsymbol{\mu}\parallel\mathbf{B}$, $U = -\mu B$. Unstable: antiparallel, $U = +\mu B$. $W = 2\mu B = 2NIAB = ${vu(2 * mu * B, U.J)}$.`,
        };
      },
    },
    {
      id: 'em2.magdip.orbit', sec: '2.4.2', level: 2,
      gen(R) {
        const v = R.pick(['body', 'body', 'point', 'bohr']);
        if (v === 'body') {
          const B = R.pick([['thin ring', 2], ['thin flat disk', 4], ['thin spherical shell', 3], ['solid sphere (uniform volume charge)', 5]]);
          const Q = R.pick(['Q', 'q']), a = R.pick(['a', 'R']);
          const alt = [1, 2, 3, 4, 5, 6, 8].filter(n => n !== B[1]);
          const term = n => raw`\dfrac{${Q}\omega ${a}^2}{${n}}`;
          return {
            q: raw`A ${B[0]} of radius $${a}$ carries total charge $${Q}$ distributed uniformly ${B[1] === 5 ? 'throughout its volume' : 'over it'}. It spins about ${B[1] === 2 || B[1] === 4 ? 'its symmetry axis (perpendicular to its plane)' : 'a diameter'} with angular velocity $\omega$. What is the magnitude of its magnetic dipole moment?`,
            ...symMC(R, term(B[1]), alt.map(n => (n === 1 ? raw`${Q}\omega ${a}^2` : term(n))).concat([raw`\dfrac{${Q}\omega ${a}}{${B[1]}}`])),
            level: B[1] === 2 ? 2 : 3,
            expl: raw`A ring element of radius $s$ carrying charge $dq$ is a current $dq\,\omega/2\pi$ around area $\pi s^2$: $d\mu = \tfrac12\omega s^2\,dq$. For the ${B[0]}, $\langle s^2\rangle = ${B[1] === 2 ? a + '^2' : raw`${a}^2\cdot ${F.frac(2, B[1])}`}$, giving $\mu = ${Q}\omega ${a}^2/${B[1]}$. Equivalently $\mu = (${Q}/2M)L$ when mass and charge are distributed alike.`,
          };
        }
        if (v === 'point') return {
          q: raw`A particle of charge $q$ and mass $m$ moves at speed $v$ in a circular orbit of radius $r$. In terms of its orbital angular momentum $L$, what is the magnitude of its magnetic dipole moment?`,
          ...symMC(R, raw`\dfrac{qL}{2m}`, [raw`\dfrac{qL}{m}`, raw`\dfrac{2qL}{m}`, raw`\dfrac{qL}{4\pi m}`, raw`\dfrac{qL}{2\pi m}`, raw`\dfrac{mL}{2q}`]),
          expl: raw`Current $I = qv/(2\pi r)$, area $\pi r^2$: $\mu = qvr/2 = \dfrac{q}{2m}(mvr) = \dfrac{qL}{2m}$ — the classical gyromagnetic ratio.`,
        };
        const vv = 2.2e6, r = 0.53e-10, mu = C.e * vv * r / 2;
        return {
          q: raw`In the Bohr model of hydrogen, the electron moves at about $2.2\times10^{6}\,\text{m/s}$ in a circle of radius $0.53\times10^{-10}\,\text{m}$. What is the approximate magnitude of the magnetic moment of this orbit?`,
          ...GRE.numeric(R, mu, [C.e * vv * r, C.e * vv / (2 * PI * r), C.e * vv * r / (2 * PI), C.e * vv * vv * r / 2], { unit: U.Am2 }),
          level: 2,
          expl: raw`$\mu = IA = \dfrac{ev}{2\pi r}\pi r^2 = \tfrac12 evr \approx ${vu(mu, U.Am2)}$ — one Bohr magneton, $e\hbar/2m_e$.`,
        };
      },
    },
    {
      id: 'em2.magdip.roman', sec: '2.4.2', level: 2,
      gen(R) {
        const TRUE = [
          'A magnetic dipole in a uniform magnetic field experiences no net force.',
          'The potential energy of a magnetic dipole in a field is lowest when its moment is parallel to the field.',
          'Far from a small current loop, its magnetic field falls off as $1/r^3$.',
          'Cutting a bar magnet in half produces two smaller magnetic dipoles.',
          'The torque on a current loop in a uniform field vanishes when its moment is parallel or antiparallel to the field.',
          'The magnetic moment of a flat current loop is perpendicular to the plane of the loop.',
          'A magnetic dipole in a nonuniform magnetic field can experience a net force.',
        ];
        const FALSE = [
          'A magnetic dipole in a uniform magnetic field is pulled along the field direction.',
          'The potential energy of a magnetic dipole in a field is lowest when its moment is antiparallel to the field.',
          'Far from a small current loop, its magnetic field falls off as $1/r^2$.',
          'Cutting a bar magnet in half isolates a north pole and a south pole.',
          'The torque on a current loop in a uniform field is largest when its moment is parallel to the field.',
          'The magnetic moment of a flat current loop lies in the plane of the loop.',
          'The magnetic moment of a current loop is independent of the area it encloses.',
        ];
        const r = romanQ(R, 'Which of the following statements about magnetic dipoles is (are) true?', TRUE, FALSE);
        return {
          q: r.q, choices: r.choices, ans: r.ans,
          expl: r.st.map((x, i) => `${RN[i]} is ${x[1] ? 'true' : 'false'}.`).join(' ') + raw` Recall $\boldsymbol{\mu} = I\mathbf{A}$ (normal to the loop), $\boldsymbol{\tau} = \boldsymbol{\mu}\times\mathbf{B}$, $U = -\boldsymbol{\mu}\cdot\mathbf{B}$, $\mathbf{F} = \nabla(\boldsymbol{\mu}\cdot\mathbf{B})$ (zero in a uniform field), and a dipole field $\propto 1/r^3$.`,
        };
      },
    },
    // =============================================================== 2.4.3 Multipole expansion
    {
      id: 'em2.multipole.leading', sec: '2.4.3', level: 2, weight: 2,
      gen(R) {
        // charges on a line built from finite-difference stencils: order n kills all moments below n
        const STEN = [[1], [1, -1], [1, -2, 1], [1, -3, 3, -1]];
        const fixed2D = [
          { t: '$+q$ at $(a, 0)$, $+q$ at $(-a, 0)$, $-q$ at $(0, a)$, and $-q$ at $(0, -a)$', n: 2 },
          { t: 'alternating charges $+q, -q, +q, -q$ at the four corners of a square of side $a$, going around the square', n: 2 },
          { t: 'alternating charges $\\pm q$ at the eight corners of a cube of side $a$, with every edge joining opposite charges', n: 3 },
          { t: '$+q$ at each of the four corners of a square of side $a$ and $-4q$ at its center', n: 2 },
          { t: '$+q$ at $(a, 0)$, $-q$ at $(-a, 0)$, $+q$ at $(0, a)$, and $-q$ at $(0, -a)$', n: 1 },
          { t: '$+2q$ at $(0, 0)$, $-q$ at $(a, 0)$, and $-q$ at $(0, a)$', n: 1 },
        ];
        let desc, n;
        if (R.bool(0.3)) { const f = R.pick(fixed2D); desc = f.t; n = f.n; }
        else {
          n = R.pick([0, 1, 1, 2, 2, 3]);
          let ker = R.pick([[1], [2], [1, 1], [2, 1], [1, 0, 1], [1, 2], [3]]);
          if (n === 0) ker = R.pick([[1, 1], [2, -1], [1, 0, 1], [3, -1], [1, -2, 2], [-1, 2]]);
          if (n === 3 && ker.length > 1) ker = [1];
          let qs = new Array(ker.length + STEN[n].length - 1).fill(0);
          ker.forEach((k, i) => STEN[n].forEach((s, j) => { qs[i + j] += k * s; }));
          if (R.bool()) qs = qs.map(x => -x);
          if (n === 0 && qs.reduce((a, b) => a + b, 0) === 0) throw new Error('neutral');
          if (qs.length > 5) throw new Error('too long');
          const x0 = R.int(-Math.floor((qs.length - 1) / 2) - 1, 0);
          const parts = [];
          qs.forEach((qv, i) => {
            if (!qv) return;
            const x = x0 + i;
            const qt = (qv > 0 ? '+' : '-') + (Math.abs(qv) === 1 ? '' : Math.abs(qv)) + 'q';
            parts.push(`$${qt}$ at $x = ${x === 0 ? '0' : x === 1 ? 'a' : x === -1 ? '-a' : x + 'a'}$`);
          });
          desc = 'point charges on the $x$-axis: ' + parts.slice(0, -1).join(', ') + (parts.length > 2 ? ',' : '') + ' and ' + parts[parts.length - 1];
        }
        const NAMES = ['monopole', 'dipole', 'quadrupole', 'octupole', 'hexadecapole'];
        const ask = R.pick(['V', 'E', 'name']);
        const pw = k => (k === 1 ? '1/r' : `1/r^{${k}}`);
        let ans, wr;
        if (ask === 'name') { ans = NAMES[n]; wr = NAMES.filter(x => x !== ans); }
        else { const k = n + (ask === 'V' ? 1 : 2); ans = `$${pw(k)}$`; wr = [1, 2, 3, 4, 5, 6].filter(j => j !== k).map(j => `$${pw(j)}$`); }
        const choice = ask === 'name' ? GRE.mc(R, ans, wr, { rank: s => NAMES.indexOf(s) }) : GRE.mc(R, ans, wr, { rank: s => +((s.match(/\d+(?=\}?\$)/) || ['1'])[0]) });
        return {
          q: `A charge distribution consists of ${desc}. ${ask === 'name' ? 'What is the lowest-order nonvanishing term in its multipole expansion?' : `At a generic point a distance $r \\gg a$ away, the ${ask === 'V' ? 'electric potential' : 'magnitude of the electric field'} falls off as`}`,
          ...choice,
          level: n >= 2 ? 3 : 2,
          expl: `Check the moments in order: total charge ${n === 0 ? 'is nonzero, so the monopole term dominates' : 'is zero'}${n >= 1 ? `; the dipole moment $\\sum q_i\\mathbf{r}_i$ ${n === 1 ? 'is nonzero, so the dipole term dominates' : 'also vanishes'}` : ''}${n >= 2 ? `; the quadrupole moment ${n === 2 ? 'is nonzero' : 'also vanishes, leaving the octupole'}` : ''}. The $\\ell$-th term gives $V \\propto 1/r^{\\ell+1}$ and $E \\propto 1/r^{\\ell+2}$, so here $V \\propto ${pw(n + 1)}$ and $E \\propto ${pw(n + 2)}$ (${NAMES[n]}).`,
        };
      },
    },
    {
      id: 'em2.multipole.terms', sec: '2.4.3', level: 3,
      gen(R) {
        // charges on the z-axis; potential far along +z or along the x-axis
        const k = R.int(2, 3);
        const zs = R.pickN([-2, -1, 0, 1, 2], k).sort((a, b) => a - b);
        const qs = zs.map(() => R.pick([-2, -1, 1, 2, 3]));
        const Q = qs.reduce((a, b) => a + b, 0), p = qs.reduce((a, q, i) => a + q * zs[i], 0);
        if (Q === 0 || p === 0) throw new Error('need both');
        const qt = q => (q > 0 ? '+' : '-') + (Math.abs(q) === 1 ? '' : Math.abs(q)) + 'q';
        const co = z => (z === 0 ? '0' : z === 1 ? 'a' : z === -1 ? '-a' : z + 'a');
        const desc = zs.map((z, i) => `$${qt(qs[i])}$ at $z = ${co(z)}$`).join(', ');
        const onZ = R.bool(0.7);
        const X = onZ ? 'z' : 'x';
        const cq = c => (c === 1 ? '' : c === -1 ? '-' : String(c));
        const expr = (A, Bc, pw) => {
          let s = raw`\dfrac{${cq(A)}q}{${X}}`;
          if (Bc) s += (Bc > 0 ? ' + ' : ' - ') + raw`\dfrac{${Math.abs(Bc) === 1 ? '' : Math.abs(Bc)}qa}{${X}^{${pw}}}`;
          return raw`\dfrac{1}{4\pi\epsilon_0}\left(${s}\right)`;
        };
        const absQ = qs.reduce((a, b) => a + Math.abs(b), 0);
        const correct = onZ ? expr(Q, p, 2) : expr(Q, 0, 2);
        const wr = [expr(Q, -p, 2), expr(Q, 2 * p, 2), expr(Q, p, 3), onZ ? expr(Q, 0, 2) : expr(Q, p, 2), absQ !== Math.abs(Q) ? expr(absQ, p, 2) : expr(Q, p + (p > 0 ? 1 : -1), 2)];
        return {
          q: raw`Point charges are placed on the $z$-axis: ${desc}. Keeping only the monopole and dipole terms, what is the electric potential at a point on the ${onZ ? '+z' : '+x'}-axis a large distance $${X} \gg a$ from the origin?`,
          ...symMC(R, correct, wr),
          expl: raw`$Q = ${cq(Q)}q$ (net charge) and $p_z = \sum q_iz_i = ${p}\,qa$. $V \approx \dfrac{1}{4\pi\epsilon_0}\left(\dfrac{Q}{r} + \dfrac{\mathbf{p}\cdot\hat{r}}{r^2}\right)$. ${onZ ? raw`On the $+z$-axis, $\mathbf{p}\cdot\hat{r} = p_z$.` : raw`On the $x$-axis $\hat{r}\perp\mathbf{p}$, so the dipole term vanishes and the next correction is of order $1/x^3$.`}`
        };
      },
    },
    {
      id: 'em2.multipole.roman', sec: '2.4.3', level: 2,
      gen(R) {
        const TRUE = [
          'The monopole moment (total charge) of a distribution does not depend on the choice of origin.',
          'If the total charge is zero, the dipole moment does not depend on the choice of origin.',
          'The multipole expansion of the vector potential of a localized current distribution has no monopole term.',
          'Far from a neutral distribution with a nonzero dipole moment, the potential falls off as $1/r^2$.',
          'The quadrupole term of the potential falls off as $1/r^3$.',
          'Each successive term of the multipole expansion of the potential falls off with one additional power of $1/r$.',
        ];
        const FALSE = [
          'The dipole moment of a distribution with nonzero total charge is independent of the choice of origin.',
          'The quadrupole term of the potential falls off as $1/r^4$.',
          'A distribution with zero net charge produces no potential at any distance.',
          'The leading term in the far magnetic field of a localized steady current is a monopole term falling off as $1/r^2$.',
          'The dipole term of the potential is the same in every direction at a given distance $r$.',
          'The electric field of a pure dipole falls off as $1/r^2$.',
        ];
        const r = romanQ(R, 'Which of the following statements about the multipole expansion is (are) true?', TRUE, FALSE);
        return {
          q: r.q, choices: r.choices, ans: r.ans,
          expl: r.st.map((x, i) => `${RN[i]} is ${x[1] ? 'true' : 'false'}.`).join(' ') + raw` $V = \frac{1}{4\pi\epsilon_0}\sum_\ell \frac{1}{r^{\ell+1}}\int r'^\ell P_\ell(\cos\theta')\rho\,d^3r'$; the lowest nonvanishing moment is origin-independent, and the magnetic monopole term vanishes because $\nabla\cdot\mathbf{B} = 0$.`,
        };
      },
    },

    // =============================================================== 2.5.1 Dielectrics
    {
      id: 'em2.diel.insert', sec: '2.5.1', level: 2, weight: 2,
      gen(R) {
        const k = R.pick([2, 3, 4, 5, 3 / 2, 5 / 2]);
        const batt = R.bool();
        const QS = { C: ['capacitance', k, k], Q: ['charge on the plates', k, 1], V: ['potential difference between the plates', 1, 1 / k], E: ['electric field between the plates', 1, 1 / k], U: ['energy stored in the capacitor', k, 1 / k] };
        const key = R.pick(Object.keys(QS));
        const [nm, fb, fi] = QS[key];
        const ans = batt ? fb : fi;
        if (R.bool(0.25)) {
          const C0 = R.pick([2, 5, 10, 20]), V0 = R.pick([10, 12, 20, 50, 100]);
          const Ui = 0.5 * C0 * V0 * V0 / 1000; // mJ
          const dU = batt ? (k - 1) * Ui : Ui * (1 / k - 1);
          return {
            q: raw`A $${C0}\,\mu\text{F}$ air-filled parallel-plate capacitor is charged to $${V0}\,\text{V}$. ${batt ? 'While it remains connected to the battery' : 'After it is disconnected from the battery'}, a slab of dielectric constant $\kappa = ${fac(k)}$ is inserted, completely filling the gap. By how much does the stored energy change? (Negative means a decrease.)`,
            ...numMC(R, dU, [-dU, batt ? Ui * (1 / k - 1) : (k - 1) * Ui, (k * k - 1) * Ui, Ui * (k - 1) / 2, 0].filter(x => x !== undefined), { unit: U.mJ, allowNeg: true, sig: 3 }),
            level: 3,
            expl: raw`$U_0 = \tfrac12 C_0V_0^2 = ${F.num(Ui, 3)}\,\text{mJ}$. ${batt ? raw`At fixed $V$, $U = \tfrac12\kappa C_0V^2$ grows by the factor $\kappa$` : raw`At fixed $Q$, $U = Q^2/(2\kappa C_0)$ falls by the factor $\kappa$ (the slab is pulled in)`}: $\Delta U = ${F.num(dU, 3)}\,\text{mJ}$.`,
          };
        }
        return {
          q: `An air-filled parallel-plate capacitor is charged by a battery. ${batt ? 'While the capacitor remains connected to the battery, a slab' : 'The capacitor is then disconnected from the battery, and a slab'} of dielectric constant $\\kappa = ${fac(k)}$ is inserted, completely filling the space between the plates. By what factor does the ${nm} change?`,
          ...facMC(R, ans, [k, 1 / k, 1, k * k, 1 / (k * k)]),
          expl: (batt ? raw`Connected: $V$ is fixed. $C \to \kappa C$, so $Q = CV \to \kappa Q$, $E = V/d$ is unchanged, and $U = \tfrac12CV^2 \to \kappa U$.` : raw`Isolated: $Q$ is fixed. $C \to \kappa C$, so $V = Q/C \to V/\kappa$, $E = V/d \to E/\kappa$, and $U = Q^2/2C \to U/\kappa$.`) + raw` Here the factor is $${fac(ans)}$.`,
        };
      },
    },
    {
      id: 'em2.diel.partial', sec: '2.5.1', level: 3,
      gen(R) {
        const k = R.pick([2, 3, 4, 5, 6]);
        const v = R.pick(['side', 'layer', 'slab', 'metal']);
        const t = R.pick([[1, 4], [1, 3], [1, 2], [2, 3], [3, 4]]), f = t[0] / t[1];
        const side = (1 + k) / 2, layer = 2 * k / (1 + k);
        let ans, q, wr, ex;
        const head = 'An air-filled parallel-plate capacitor with plate area $A$ and separation $d$ has capacitance $C_0$.';
        if (v === 'side') { ans = side; q = `Half of the plate area is filled (across the full gap $d$) with a dielectric of constant $\\kappa = ${k}$, the other half left empty.`; wr = [layer, k, (k + 1), 1 / side, k / 2]; ex = raw`Two capacitors in parallel, each $C_0/2$: $C = \tfrac{C_0}{2}(1 + \kappa) = ${fac(ans)}\,C_0$.`; }
        else if (v === 'layer') { ans = layer; q = `A dielectric slab of constant $\\kappa = ${k}$ and thickness $d/2$ covers the full plate area, leaving an air layer of thickness $d/2$.`; wr = [side, k, 1 / layer, k / 2, 2 * k]; ex = raw`Two capacitors in series, $2C_0$ (air) and $2\kappa C_0$: $C = \dfrac{2\kappa}{1 + \kappa}C_0 = ${fac(ans)}\,C_0$.`; }
        else if (v === 'slab') { ans = 1 / (1 - f + f / k); q = `A dielectric slab of constant $\\kappa = ${k}$ and thickness $${F.frac(t[0], t[1])}\\,d$ covers the full plate area.`; wr = [1 + f * (k - 1), k * f, 1 / (1 - f), 1 - f + f / k, k]; ex = raw`Series combination: $C = \dfrac{\epsilon_0A}{(d - t) + t/\kappa} = \dfrac{C_0}{1 - ${F.frac(t[0], t[1])}(1 - 1/\kappa)} = ${fac(ans)}\,C_0$.`; }
        else { ans = 1 / (1 - f); q = `An uncharged metal slab of thickness $${F.frac(t[0], t[1])}\\,d$ is inserted parallel to the plates, covering the full plate area.`; wr = [1 - f, 1 + f, 1 / (1 + f), 2 / (1 - f), 1]; ex = raw`The field vanishes inside the metal, so the effective gap is $d - t$: $C = \epsilon_0A/(d - t) = ${fac(ans)}\,C_0$ (the $\kappa \to \infty$ limit of a dielectric slab), independent of where the slab sits.`; }
        return {
          q: `${head} ${q} What is the new capacitance?`,
          ...facMC(R, ans, wr, { fmt: x => (near(x, 1) ? 'C_0' : fac(x) + '\\,C_0') }),
          expl: ex,
        };
      },
    },
    {
      id: 'em2.diel.field', sec: '2.5.1', level: 2,
      gen(R) {
        const k = R.pick([2, 3, 4, 5, 6, 8, 10, 80]);
        const v = R.pick(['force', 'bound', 'sphereOut', 'sphereIn']);
        if (v === 'force') {
          const F0 = R.pick([2, 4, 8, 16, 40, 80]);
          return {
            q: raw`Two small charged spheres a fixed distance apart repel each other with a force of $${F0}\,\text{mN}$ in vacuum. Both are then immersed, at the same separation, in a large bath of a liquid dielectric with $\kappa = ${k}$. What is the new force between them?`,
            ...GRE.numeric(R, F0 / k, [F0 * k, F0 / (k * k), F0 / Math.sqrt(k), F0], { unit: raw`\text{mN}`, sig: 3 }),
            level: 1,
            expl: raw`In a linear dielectric $\epsilon_0 \to \kappa\epsilon_0$ in Coulomb’s law, so the force drops by $\kappa$: $${F0}/${k} = ${F.num(F0 / k, 3)}\,\text{mN}$.`,
          };
        }
        if (v === 'bound') return {
          q: raw`A dielectric slab with $\kappa = ${k}$ fills the gap of a parallel-plate capacitor whose plates carry free surface charge densities $\pm\sigma$. What is the magnitude of the bound surface charge density on each face of the slab?`,
          ...facMC(R, (k - 1) / k, [1 / k, k - 1, 1, (k - 1) / (k + 1), 1 / (k - 1)], { fmt: x => (near(x, 1) ? '\\sigma' : fac(x) + '\\,\\sigma') }),
          level: 3,
          expl: raw`The field inside is reduced to $E = \sigma/(\kappa\epsilon_0)$, so the net charge seen is $\sigma/\kappa$: $\sigma_b = \sigma - \sigma/\kappa = \sigma(1 - 1/\kappa) = ${fac((k - 1) / k)}\,\sigma$.`,
        };
        const out = v === 'sphereOut';
        return {
          q: raw`A point charge $q$ is embedded at the center of a sphere of radius $a$ made of a linear dielectric with dielectric constant $\kappa$, surrounded by vacuum. What is the magnitude of the electric field at a distance $r ${out ? '> a' : '< a'}$ from the center?`,
          ...symMC(R, out ? raw`\dfrac{q}{4\pi\epsilon_0r^2}` : raw`\dfrac{q}{4\pi\epsilon_0 \kappa r^2}`, out ? [raw`\dfrac{q}{4\pi\epsilon_0 \kappa r^2}`, raw`\dfrac{\kappa q}{4\pi\epsilon_0r^2}`, raw`\dfrac{q}{4\pi\epsilon_0 \kappa^2 r^2}`, '0', raw`\dfrac{q}{4\pi\epsilon_0 \kappa a^2}`] : [raw`\dfrac{q}{4\pi\epsilon_0r^2}`, raw`\dfrac{\kappa q}{4\pi\epsilon_0r^2}`, raw`\dfrac{q}{4\pi\epsilon_0 \kappa^2 r^2}`, '0', raw`\dfrac{qr}{4\pi\epsilon_0 \kappa a^3}`]),
          level: 3,
          expl: raw`Gauss’s law for $\mathbf{D}$: $D = q/(4\pi r^2)$ everywhere. Inside, $E = D/(\kappa\epsilon_0)$; outside (vacuum) $E = D/\epsilon_0$. ${out ? 'The bound charges (negative around $q$, positive on the surface) sum to zero, so the outside field is unchanged.' : 'The bound charge clustered around $q$ screens it by the factor $\\kappa$.'}`,
        };
      },
    },

    // =============================================================== 2.6.1 Waves and Poynting vector
    {
      id: 'em2.wave.intensity', sec: '2.6.1', level: 2, weight: 2,
      gen(R) {
        const v = R.pick(['I', 'E0', 'B0', 'point', 'pointE', 'ratio']);
        const k = C.c * C.eps0; // c eps0
        if (v === 'I') {
          const E0 = R.pick([10, 20, 30, 50, 100, 200, 300, 500, 1000]);
          const I = 0.5 * k * E0 * E0;
          return {
            q: raw`A plane electromagnetic wave in vacuum has an electric field amplitude of $${E0}\,\text{V/m}$. What is its intensity (time-averaged power per unit area)? (Use $c\epsilon_0 \approx 2.7\times10^{-3}\,\text{A/V}$.)`,
            ...GRE.numeric(R, I, [2 * I, I / C.c, 0.5 * k * E0, I * 4], { unit: U.Wm2 }),
            expl: raw`$I = \langle S\rangle = \tfrac12 c\epsilon_0E_0^2 = ${vu(I, U.Wm2)}$. The $\tfrac12$ is the time average of $\cos^2$; $\tfrac12\epsilon_0E_0^2$ alone is the average energy density, which must be multiplied by $c$.`,
          };
        }
        if (v === 'E0' || v === 'B0') {
          const P = R.pick([1, 2, 5, 10, 20]), Amm = R.pick([1, 2, 4, 5, 10]);
          const I = P * 1e-3 / (Amm * 1e-6), E0 = Math.sqrt(2 * I / k), B0 = E0 / C.c;
          const ans = v === 'E0' ? E0 : B0;
          const wr = v === 'E0' ? [Math.sqrt(I / k), 2 * I / k, Math.sqrt(2 * I / C.eps0), E0 * 2] : [E0, Math.sqrt(I / k) / C.c, E0 / (C.c * C.c), B0 * 2];
          return {
            q: raw`A laser beam of power $${P}\,\text{mW}$ has a uniform cross-section of area $${Amm}\,\text{mm}^2$. What is the amplitude of the ${v === 'E0' ? 'electric' : 'magnetic'} field in the beam? (Use $c\epsilon_0 \approx 2.7\times10^{-3}\,\text{A/V}$.)`,
            ...GRE.numeric(R, ans, wr, { unit: v === 'E0' ? U.Vm : U.T }),
            level: v === 'B0' ? 3 : 2,
            expl: raw`$I = P/A = ${F.num(I, 2)}\,\text{W/m}^2 = \tfrac12c\epsilon_0E_0^2$, so $E_0 = \sqrt{2I/(c\epsilon_0)} = ${vu(E0, U.Vm)}$${v === 'B0' ? raw` and $B_0 = E_0/c = ${vu(B0, U.T)}$` : ''}. Leaving out the 2 gives the rms field.`,
          };
        }
        if (v === 'point' || v === 'pointE') {
          const P = R.pick([10, 40, 60, 100, 200, 500, 1000]), r = R.pick([1, 2, 3, 5, 10]);
          const I = P / (4 * PI * r * r), E0 = Math.sqrt(2 * I / k);
          if (v === 'point') return {
            q: raw`A small source radiates $${P}\,\text{W}$ of electromagnetic power uniformly in all directions. What is the intensity at a distance of $${r}\,\text{m}$?`,
            ...GRE.numeric(R, I, [P / (4 * PI * r), P / (PI * r * r), P / (2 * PI * r * r), P / (r * r)], { unit: U.Wm2 }),
            level: 1,
            expl: raw`The power spreads over a sphere: $I = P/(4\pi r^2) = ${vu(I, U.Wm2)}$.`,
          };
          return {
            q: raw`A small source radiates $${P}\,\text{W}$ uniformly in all directions. What is the amplitude of the electric field at a distance of $${r}\,\text{m}$? (Use $c\epsilon_0 \approx 2.7\times10^{-3}\,\text{A/V}$.)`,
            ...GRE.numeric(R, E0, [Math.sqrt(I / k), 2 * I / k, Math.sqrt(2 * P / (4 * PI * r) / k), Math.sqrt(2 * P / (PI * r * r) / k)], { unit: U.Vm }),
            level: 3,
            expl: raw`$I = P/(4\pi r^2) = ${F.num(I, 3)}\,\text{W/m}^2$, and $E_0 = \sqrt{2I/(c\epsilon_0)} = ${vu(E0, U.Vm)}$.`,
          };
        }
        const r1 = R.pick([1, 2, 3, 4]), r2 = R.pick([2, 3, 4, 5, 6, 8].filter(x => x !== r1));
        const field = R.bool();
        const ans = field ? r1 / r2 : (r1 / r2) ** 2;
        return {
          q: `At a distance $r_1$ from a point source of electromagnetic radiation, the ${field ? 'amplitude of the electric field' : 'intensity'} is $X_0$. What is it at distance $r_2 = ${fac(r2 / r1)}\\,r_1$?`,
          ...facMC(R, ans, field ? [(r1 / r2) ** 2, r2 / r1, Math.sqrt(r1 / r2), (r1 / r2) ** 3] : [r1 / r2, r2 / r1, (r2 / r1) ** 2, (r1 / r2) ** 4], { fmt: x => (near(x, 1) ? 'X_0' : fac(x) + 'X_0') }),
          level: 1,
          expl: field ? raw`Intensity $\propto 1/r^2$ and $I \propto E_0^2$, so the radiation field falls off as $1/r$: factor $r_1/r_2 = ${fac(ans)}$.` : raw`Energy conservation over a sphere: $I \propto 1/r^2$, factor $(r_1/r_2)^2 = ${fac(ans)}$.`,
        };
      },
    },
    {
      id: 'em2.wave.pressure', sec: '2.6.1', level: 2,
      gen(R) {
        const v = R.pick(['sail', 'laser', 'pressure', 'tilt']);
        const refl = R.bool();
        const f = refl ? 2 : 1;
        if (v === 'laser') {
          const P = R.pick([1, 3, 6, 10, 30, 60, 100, 300]), d = R.pick([1, 2, 5]);
          const Fr = f * P / C.c;
          return {
            q: raw`A laser beam of power $${P}\,\text{W}$ and diameter $${d}\,\text{mm}$ strikes a surface at normal incidence and is completely ${refl ? 'reflected' : 'absorbed'}. What force does the beam exert on the surface?`,
            ...GRE.numeric(R, Fr, [(3 - f) * P / C.c, f * P / C.c / (PI * (d * 5e-4) ** 2), f * P * C.c * 1e-17, f * P / C.c / 4], { unit: U.N }),
            expl: raw`Momentum flux $= P/c$; ${refl ? 'reflection reverses the momentum, doubling it' : 'absorption transfers it once'}: $F = ${f === 2 ? '2' : ''}P/c = ${vu(Fr, U.N)}$, independent of the beam area.`,
          };
        }
        const I = R.pick([1000, 1400, 2000, 5000]);
        if (v === 'pressure') {
          const p = f * I / C.c;
          return {
            q: raw`Sunlight of intensity $${I}\,\text{W/m}^2$ falls at normal incidence on a perfectly ${refl ? 'reflecting' : 'absorbing'} surface. What radiation pressure does it exert?`,
            ...GRE.numeric(R, p, [(3 - f) * I / C.c, f * I / (C.c * C.c) * 1e8, f * I / C.c / 2], { unit: U.Pa }),
            level: 1,
            expl: raw`$P_{\text{rad}} = ${f === 2 ? '2' : ''}I/c = ${vu(p, U.Pa)}$. ${refl ? 'A perfect reflector gets twice the absorber’s pressure.' : 'A perfect reflector would get twice as much.'}`,
          };
        }
        if (v === 'sail') {
          const A = R.pick([10, 100, 400, 1000, 10000]), m = R.pick([1, 5, 10, 50, 100]);
          const a = f * I * A / C.c / m;
          return {
            q: raw`A spacecraft of mass $${m}\,\text{kg}$ deploys a perfectly ${refl ? 'reflecting' : 'absorbing'} sail of area $${A}\,\text{m}^2$, oriented perpendicular to sunlight of intensity $${I}\,\text{W/m}^2$. What acceleration does the radiation give it?`,
            ...GRE.numeric(R, a, [(3 - f) * I * A / C.c / m, f * I * A / C.c, f * I * A / (C.c * m) * 1e-3], { unit: raw`\text{m/s}^2` }),
            expl: raw`$F = ${f === 2 ? '2' : ''}IA/c = ${F.num(f * I * A / C.c, 2)}\,\text{N}$, so $a = F/m = ${vu(a, raw`\text{m/s}^2`)}$.`,
          };
        }
        const th = R.pick([30, 45, 60]);
        const c2 = Math.cos(th * PI / 180) ** 2;
        return {
          q: raw`A plane wave of intensity $I$ strikes a perfectly reflecting flat surface, with the direction of propagation making an angle $${th}^\circ$ with the surface normal. What pressure (normal force per unit area of the surface) does it exert?`,
          ...facMC(R, 2 * c2, [2 * Math.cos(th * PI / 180), c2, 2, Math.cos(th * PI / 180), 2 * Math.sin(th * PI / 180) ** 2], { fmt: x => (near(x, 1) ? 'I/c' : fac(x) + '\\,I/c') }),
          level: 3,
          expl: raw`One factor of $\cos\theta$: the beam’s power per unit surface area is $I\cos\theta$. Another: only the normal momentum component reverses, with change $2\cos\theta$ per unit momentum. So $P = 2I\cos^2\theta/c = ${fac(2 * c2)}\,I/c$.`,
        };
      },
    },
    {
      id: 'em2.wave.directions', sec: '2.6.1', level: 2,
      gen(R) {
        const AX = ['x', 'y', 'z'];
        const cross = (a, b) => { // a, b: [axisIndex, sign]
          const i = a[0], j = b[0];
          if (i === j) return null;
          const k = 3 - i - j;
          const cyc = (j - i + 3) % 3 === 1 ? 1 : -1;
          return [k, a[1] * b[1] * cyc];
        };
        const lab = v => `${v[1] < 0 ? '-' : '+'}\\hat{${AX[v[0]]}}`;
        const ki = R.int(0, 2), ks = R.sign();
        const others = [0, 1, 2].filter(i => i !== ki);
        const Ev = [R.pick(others), R.sign()];
        const kv = [ki, ks];
        const Bv = cross(kv, Ev);
        const w = R.pick(['E', 'B']);
        const fv = w === 'E' ? Ev : Bv;
        // phase written so that the wave travels along ks
        const ph = ks > 0 ? R.pick([`k${AX[ki]} - \\omega t`, `\\omega t - k${AX[ki]}`]) : `k${AX[ki]} + \\omega t`;
        const amp = w === 'E' ? 'E_0' : 'B_0';
        const field = raw`\mathbf{${w}} = ${fv[1] < 0 ? '-' : ''}${amp}\cos(${ph})\,\hat{${AX[fv[0]]}}`;
        const ask = R.pick(['prop', 'other', 'other']);
        let ans, q, ex;
        if (ask === 'prop') {
          ans = kv; q = `In which direction does the wave propagate?`;
          ex = raw`The phase is constant where $${AX[ki]} ${ks > 0 ? '-' : '+'} (\omega/k)t$ is constant, so the wave moves toward ${ks > 0 ? 'increasing' : 'decreasing'} $${AX[ki]}$: $${lab(kv)}$.`;
        } else {
          ans = w === 'E' ? Bv : Ev;
          q = `At a point and time where $\\mathbf{${w}}$ points along $${lab(fv)}$, in which direction does $\\mathbf{${w === 'E' ? 'B' : 'E'}}$ point?`;
          ex = raw`The wave travels along $${lab(kv)}$ (from the phase), and $\mathbf{E}\times\mathbf{B}$ must point along the propagation direction, i.e. $\mathbf{B} = \tfrac1c\hat{k}\times\mathbf{E}$. With $\mathbf{E}\parallel ${lab(Ev)}$ this gives $\mathbf{B}\parallel ${lab(Bv)}$.`;
        }
        const all = [];
        for (let i = 0; i < 3; i++) for (const s of [1, -1]) all.push([i, s]);
        const S = v => `$${lab(v)}$`;
        return {
          q: raw`The ${w === 'E' ? 'electric' : 'magnetic'} field of a plane electromagnetic wave in vacuum is $${field}$. ${q}`,
          ...GRE.mc(R, S(ans), all.filter(v => !(v[0] === ans[0] && v[1] === ans[1])).map(S)),
          level: ask === 'prop' ? 1 : 2,
          expl: ex + raw` (The Poynting vector $\mathbf{S} = \mathbf{E}\times\mathbf{B}/\mu_0$ points along $${lab(kv)}$.)`,
        };
      },
    },
    {
      id: 'em2.wave.medium', sec: '2.6.1', level: 1,
      gen(R) {
        const v = R.pick(['speed', 'speed', 'lambda']);
        if (v === 'speed') {
          const mu = R.pick([1, 1, 2, 3, 4]), ep = R.pick([2, 3, 4, 5, 8, 9]);
          if (mu === 2 && ep === 3) throw new Error('book example');
          const ans = 1 / Math.sqrt(mu * ep);
          return {
            q: raw`A nonconducting medium has permeability ${mu === 1 ? '$\\mu_0$' : `$${mu}\\mu_0$`} and permittivity $${ep}\epsilon_0$. What is the speed of electromagnetic waves in it?`,
            ...facMC(R, ans, [1 / (mu * ep), Math.sqrt(mu * ep), 1 / Math.sqrt(ep), 1 / Math.sqrt(mu + ep), Math.sqrt(mu / ep), 1 / ep], { fmt: x => (near(x, 1) ? 'c' : fac(x) + '\\,c') }),
            expl: raw`$v = 1/\sqrt{\mu\epsilon} = c/\sqrt{\mu_r\epsilon_r} = c/\sqrt{${mu * ep}}$, i.e. index $n = \sqrt{${mu * ep}}$.`,
          };
        }
        const ep = R.pick([[4, 2], [9, 3], [16, 4], [2.25, 1.5], [1.69, 1.3]]), lam = R.pick([300, 450, 600, 900]);
        const askF = R.bool(0.3);
        const lamM = lam / ep[1];
        if (askF) {
          const f = C.c / (lam * 1e-9);
          return {
            q: raw`Light of vacuum wavelength $${lam}\,\text{nm}$ enters a nonmagnetic medium with relative permittivity $\epsilon_r = ${ep[0]}$ at this frequency. What is its frequency inside the medium?`,
            ...GRE.numeric(R, f, [f / ep[1], f * ep[1], f / ep[0]], { unit: U.Hz }),
            expl: raw`The frequency is fixed by the source and continuity at the boundary: $f = c/\lambda_0 = ${vu(f, U.Hz)}$ in both media. Only the speed and wavelength change (by $n = \sqrt{\epsilon_r} = ${ep[1]}$).`,
          };
        }
        return {
          q: raw`Light of vacuum wavelength $${lam}\,\text{nm}$ enters a nonmagnetic medium with relative permittivity $\epsilon_r = ${ep[0]}$ at this frequency. What is its wavelength in the medium?`,
          ...GRE.numeric(R, lamM, [lam / ep[0], lam * ep[1], lam], { unit: raw`\text{nm}`, sig: 3 }),
          expl: raw`$n = \sqrt{\epsilon_r\mu_r} = ${ep[1]}$; the frequency is unchanged, so $\lambda = \lambda_0/n = ${F.num(lamM, 3)}\,\text{nm}$.`,
        };
      },
    },

    // =============================================================== 2.6.2 Radiation
    {
      id: 'em2.rad.larmor', sec: '2.6.2', level: 2, weight: 2,
      gen(R) {
        const P = [['proton', 1, 1], ['deuteron', 1, 2], ['triton', 1, 3], ['helium-3 nucleus', 2, 3], ['alpha particle', 2, 4], ['fully ionized carbon-12 nucleus', 6, 12]];
        const v = R.pick(['efield', 'efield', 'shm', 'circ', 'num']);
        if (v === 'efield') {
          const [a, b] = R.pickN(P, 2);
          const ans = (a[1] ** 4 / a[2] ** 2) / (b[1] ** 4 / b[2] ** 2);
          return {
            q: `A ${a[0]} and a ${b[0]} are each accelerated from rest by the same uniform electric field. What is the ratio $P_1/P_2$ of the power radiated by the ${a[0]} to that radiated by the ${b[0]}? (Nonrelativistic; take the nuclear mass to be proportional to the mass number.)`,
            ...facMC(R, ans, [(a[1] / a[2]) / (b[1] / b[2]), (a[1] ** 2 / a[2] ** 2) / (b[1] ** 2 / b[2] ** 2), (a[1] ** 2 / a[2]) / (b[1] ** 2 / b[2]), (a[1] ** 4 / a[2]) / (b[1] ** 4 / b[2]), (a[1] / b[1]) ** 2]),
            level: 3,
            expl: raw`Larmor: $P = \dfrac{q^2a^2}{6\pi\epsilon_0c^3}$ with $a = qE/m$, so $P \propto q^4/m^2$. Ratio: $\dfrac{${a[1]}^4/${a[2]}^2}{${b[1]}^4/${b[2]}^2} = ${fac(ans)}$.`,
          };
        }
        if (v === 'shm') {
          const fA = R.pick([1, 2, 3, 1 / 2]), fw = R.pick([2, 3, 1 / 2, 1]);
          if (fA === 1 && fw === 1) throw new Error('no change');
          const ans = fA * fA * fw ** 4;
          return {
            q: `A charged particle oscillates in simple harmonic motion along a line (nonrelativistically). If its amplitude is multiplied by $${fac(fA)}$ and its angular frequency by $${fac(fw)}$, by what factor does its time-averaged radiated power change?`,
            ...facMC(R, ans, [fA * fw * fw, fA * fA * fw * fw, fA * fw ** 4, (fA * fw) ** 2 * fw, fA ** 4 * fw ** 4]),
            expl: raw`$a = -\omega^2x$, so $\langle a^2\rangle \propto A^2\omega^4$ and $P \propto q^2\langle a^2\rangle$: factor $(${fac(fA)})^2(${fac(fw)})^4 = ${fac(ans)}$.`,
          };
        }
        if (v === 'circ') {
          const fv = R.pick([2, 3, 1 / 2]), fB = R.pick([1, 2, 3, 1 / 2]);
          const ans = (fv * fB) ** 2;
          return {
            q: `A charged particle moves nonrelativistically in a circle in a uniform magnetic field. If its speed is multiplied by $${fac(fv)}$ and the field by $${fac(fB)}$, by what factor does the power it radiates change?`,
            ...facMC(R, ans, [fv * fB, fv * fv * fB, fv * fB * fB, fv ** 4 * fB * fB, (fv * fB) ** 4]),
            expl: raw`$a = v^2/r = qvB/m$, so $P \propto a^2 \propto v^2B^2$: factor $(${fac(fv)}\cdot${fac(fB)})^2 = ${fac(ans)}$.`,
          };
        }
        const a = R.pick([1, 2, 5]) * 10 ** R.pick([18, 19, 20, 21]);
        const Pw = C.e ** 2 * a * a / (6 * PI * C.eps0 * C.c ** 3);
        return {
          q: raw`An electron undergoes an acceleration of $${F.sci(a)}\,\text{m/s}^2$ (nonrelativistic). What power does it radiate?`,
          ...GRE.numeric(R, Pw, [Pw * 6 * PI, C.e * C.e * a / (6 * PI * C.eps0 * C.c ** 2), Pw * C.c / 1e8 * 3, Pw * 1e-2], { unit: U.W }),
          expl: raw`$P = \dfrac{e^2a^2}{6\pi\epsilon_0c^3} = \dfrac{(1.6\times10^{-19})^2(${F.sci(a)})^2}{6\pi(8.85\times10^{-12})(3\times10^8)^3} \approx ${vu(Pw, U.W)}$.`,
        };
      },
    },
    {
      id: 'em2.rad.dipole', sec: '2.6.2', level: 2, weight: 2,
      gen(R) {
        const v = R.pick(['elec', 'antenna', 'loop', 'rayleigh', 'compare']);
        const f = () => R.pick([1, 2, 3, 1 / 2]);
        if (v === 'elec') {
          const fq = f(), fd = f(), fw = R.pick([2, 3, 1 / 2]);
          const ans = (fq * fd) ** 2 * fw ** 4;
          return {
            q: `An oscillating electric dipole consists of charges $\\pm q_0\\cos\\omega t$ a fixed distance $d$ apart. If ${[fq === 1 ? null : `$q_0$ is multiplied by $${fac(fq)}$`, fd === 1 ? null : `$d$ by $${fac(fd)}$`].filter(Boolean).concat([`$\\omega$ by $${fac(fw)}$`]).join(', ').replace(/, ([^,]*)$/, ', and $1').replace(/^\$d\$ by/, '$d$ is multiplied by').replace(/^\$\\omega\$ by/, '$\\omega$ is multiplied by')}, by what factor does the total radiated power change?`,
            ...facMC(R, ans, [(fq * fd) ** 2 * fw ** 2, fq * fd * fw ** 4, (fq * fd) ** 2 * fw ** 3, (fq * fd) ** 2 * fw ** 6, fq * fd * fw]),
            expl: raw`$\langle P\rangle = \dfrac{\mu_0p_0^2\omega^4}{12\pi c}$ with $p_0 = q_0d$: factor $(${fac(fq * fd)})^2(${fac(fw)})^4 = ${fac(ans)}$.`,
          };
        }
        if (v === 'antenna') {
          const fI = f(), fw = R.pick([2, 3, 1 / 2]);
          const ans = fI * fI * fw * fw;
          return {
            q: `A short, center-fed dipole antenna of fixed length is driven by a current of amplitude $I_0$ at angular frequency $\\omega$. If ${fI === 1 ? 'the current amplitude is kept fixed and the frequency is multiplied by $' + fac(fw) + '$' : `the current amplitude is multiplied by $${fac(fI)}$ and the frequency by $${fac(fw)}$`}, by what factor does the radiated power change?`,
            ...facMC(R, ans, [fI * fI * fw ** 4, fI * fI * fw ** 6, fI * fI, fI * fw * fw, fI ** 4 * fw ** 2]),
            level: 3,
            expl: raw`The charge oscillating on each arm has amplitude $q_0 = I_0/\omega$, so $p_0 = I_0d/\omega$ and $P \propto p_0^2\omega^4 \propto I_0^2d^2\omega^2$ — only $\omega^2$ at fixed current. Factor: $(${fac(fI)})^2(${fac(fw)})^2 = ${fac(ans)}$.`,
          };
        }
        if (v === 'loop') {
          const fI = f(), fr = R.pick([2, 1 / 2, 1]), fw = R.pick([2, 3, 1 / 2]);
          const ans = fI * fI * fr ** 4 * fw ** 4;
          return {
            q: `A small circular loop antenna carries an alternating current $I_0\\cos\\omega t$. If ${[fI === 1 ? null : `$I_0$ is multiplied by $${fac(fI)}$`, fr === 1 ? null : `the loop radius by $${fac(fr)}$`].filter(Boolean).concat([`$\\omega$ by $${fac(fw)}$`]).join(', ').replace(/, ([^,]*)$/, ', and $1').replace(/^the loop radius by/, 'the loop radius is multiplied by').replace(/^\$\\omega\$ by/, '$\\omega$ is multiplied by')}, by what factor does the radiated power change?`,
            ...facMC(R, ans, [fI * fI * fr * fr * fw ** 4, fI * fI * fr ** 4 * fw * fw, fI * fr * fr * fw ** 4, fI * fI * fr ** 4 * fw ** 6, fI * fI * fr ** 2 * fw ** 2]),
            level: 3,
            expl: raw`Magnetic dipole radiation: $\langle P\rangle = \dfrac{\mu_0m_0^2\omega^4}{12\pi c^3}$ with $m_0 = I_0\pi b^2$, so $P \propto I_0^2b^4\omega^4$: factor $${fac(ans)}$.`,
          };
        }
        if (v === 'rayleigh') {
          const [l1, l2] = R.pick([[400, 800], [450, 900], [400, 600], [450, 675], [500, 750], [350, 700]]);
          const ans = (l2 / l1) ** 4;
          return {
            q: raw`Molecules much smaller than the wavelength scatter light as induced oscillating dipoles whose amplitude is independent of frequency. By what factor is light of wavelength $${l1}\,\text{nm}$ scattered more strongly than light of wavelength $${l2}\,\text{nm}$?`,
            ...facMC(R, ans, [(l2 / l1) ** 2, l2 / l1, (l2 / l1) ** 3, (l2 / l1) ** 6]),
            expl: raw`Dipole radiation $\propto \omega^4 \propto \lambda^{-4}$: $(${l2}/${l1})^4 = ${fac(ans)}$. This is why the sky is blue.`,
          };
        }
        return {
          q: raw`A current loop of radius $b$ carrying current $I_0\cos\omega t$ and an electric dipole of amplitude $p_0$ oscillating at the same $\omega$ radiate power $P_m$ and $P_e$. Which expression gives $P_m/P_e$?`,
          ...symMC(R, raw`\dfrac{\pi^2I_0^2b^4}{p_0^2c^2}`, [raw`\dfrac{\pi^2I_0^2b^4}{p_0^2}`, raw`\dfrac{\pi^2I_0^2b^4c^2}{p_0^2}`, raw`\dfrac{\pi I_0b^2}{p_0c}`, raw`\dfrac{\pi^2I_0^2b^4\omega^4}{p_0^2c^2}`, raw`\dfrac{p_0^2c^2}{\pi^2I_0^2b^4}`]),
          level: 3,
          expl: raw`$P_e = \mu_0p_0^2\omega^4/(12\pi c)$ and $P_m = \mu_0m_0^2\omega^4/(12\pi c^3)$ with $m_0 = \pi b^2I_0$. The ratio is $m_0^2/(p_0c)^2$: the extra $1/c^2$ is why magnetic dipole radiation is usually negligible. Dimensional check: $m_0/c$ has the units of $p_0$.`,
        };
      },
    },
    {
      id: 'em2.rad.pattern', sec: '2.6.2', level: 2,
      gen(R) {
        const v = R.pick(['angle', 'angleR', 'concept', 'concept']);
        const S2 = { 30: 1 / 4, 45: 1 / 2, 60: 3 / 4, 90: 1 };
        if (v === 'angle' || v === 'angleR') {
          const [t1, t2] = R.pickN([30, 45, 60, 90], 2);
          const fr = v === 'angleR' ? R.pick([2, 3, 1 / 2]) : 1;
          const ans = S2[t2] / S2[t1] / (fr * fr);
          const c2 = t => 1 - S2[t];
          return {
            q: `An oscillating electric dipole points along the $z$-axis. Far away, at distance $r$ and polar angle $\\theta = ${t1}^\\circ$ from the $z$-axis, the time-averaged radiation intensity is $I_0$. What is the intensity at polar angle $${t2}^\\circ$ and distance ${fr === 1 ? '$r$' : `$${fac(fr)}\\,r$`}?`,
            ...facMC(R, ans, [c2(t2) / c2(t1) / (fr * fr), Math.sqrt(S2[t2] / S2[t1]) / (fr * fr), S2[t2] / S2[t1] / fr, S2[t2] / S2[t1] / fr ** 4, S2[t1] / S2[t2] / (fr * fr)].filter(isFinite), { fmt: x => (near(x, 1) ? 'I_0' : fac(x) + 'I_0') }),
            expl: raw`$\langle S\rangle \propto \sin^2\theta/r^2$: factor $\dfrac{\sin^2${t2}^\circ}{\sin^2${t1}^\circ}${fr === 1 ? '' : raw`\cdot\dfrac{1}{(${fac(fr)})^2}`} = ${fac(ans)}$. The radiation is strongest perpendicular to the dipole and zero along its axis.`,
          };
        }
        const CQ = [
          ['Along which direction does an oscillating electric dipole $\\mathbf{p}(t) = p_0\\cos\\omega t\\,\\hat{z}$ radiate no power?', 'Along the $z$-axis', ['In the $xy$-plane', 'At $45^\\circ$ to the $z$-axis', 'It radiates equally in all directions', 'Along the $x$-axis only']],
          ['In which direction is the radiated intensity of an oscillating electric dipole $\\mathbf{p}(t) = p_0\\cos\\omega t\\,\\hat{z}$ greatest, at a fixed distance?', 'In the $xy$-plane', ['Along the $z$-axis', 'At $45^\\circ$ to the $z$-axis', 'It radiates equally in all directions', 'Along the $+z$ direction only']],
          ['An oscillating electric dipole $\\mathbf{p}(t) = p_0\\cos\\omega t\\,\\hat{z}$ sits at the origin. Far away on the $x$-axis, how is its radiation polarized?', 'Linearly, with $\\mathbf{E}$ along $z$', ['Linearly, with $\\mathbf{E}$ along $y$', 'Linearly, with $\\mathbf{E}$ along $x$', 'Circularly', 'Unpolarized']],
          ['Far from an oscillating electric dipole $\\mathbf{p}(t) = p_0\\cos\\omega t\\,\\hat{z}$, how do the amplitudes of the radiated $\\mathbf{E}$ and $\\mathbf{B}$ depend on distance $r$ and polar angle $\\theta$?', 'Both are proportional to $\\sin\\theta/r$', ['Both are proportional to $\\sin^2\\theta/r^2$', 'Both are proportional to $\\cos\\theta/r^3$', '$E \\propto \\sin\\theta/r$ but $B \\propto \\sin\\theta/r^2$', 'Both are proportional to $\\sin\\theta/r^3$']],
        ];
        const [q, a, w] = R.pick(CQ);
        return {
          q, ...GRE.mc(R, a, w),
          expl: raw`Radiation fields: $\mathbf{E} \propto \dfrac{p_0\omega^2\sin\theta}{r}\cos[\omega(t - r/c)]\,\hat{\theta}$, $B = E/c$ along $\hat{\phi}$; intensity $\propto \sin^2\theta/r^2$. Nothing is emitted along the axis, the maximum is in the equatorial plane, and $\mathbf{E}$ lies in the plane containing the dipole axis (along $\mp\hat{z}$ on the $x$-axis).`,
        };
      },
    },
    {
      id: 'em2.rad.roman', sec: '2.6.2', level: 2,
      gen(R) {
        const TRUE = [
          'A charge moving with constant velocity does not radiate.',
          'A spherically symmetric charge distribution whose radius oscillates does not radiate.',
          'For comparable sizes, currents and frequencies, magnetic dipole radiation is much weaker than electric dipole radiation.',
          'The radiation fields of a localized oscillating source fall off as $1/r$ at large distances.',
          'An oscillating electric dipole radiates no power along its own axis.',
          'The power radiated by a slowly moving accelerated charge is proportional to the square of its acceleration.',
          'At fixed dipole-moment amplitude, the power radiated by an oscillating electric dipole grows as the fourth power of the frequency.',
        ];
        const FALSE = [
          'A charge moving with constant velocity radiates a power proportional to $v^2$.',
          'A spherically symmetric charge distribution whose radius oscillates radiates like an electric dipole.',
          'The radiation fields of a localized oscillating source fall off as $1/r^2$ at large distances.',
          'An oscillating electric dipole radiates most strongly along its own axis.',
          'The power radiated by an accelerated charge is proportional to the first power of its charge.',
          'At fixed dipole-moment amplitude, doubling the oscillation frequency of a dipole doubles the radiated power.',
          'A positron and an electron with the same acceleration radiate different powers because their charges have opposite signs.',
        ];
        const r = romanQ(R, 'Which of the following statements about electromagnetic radiation is (are) true?', TRUE, FALSE);
        return {
          q: r.q, choices: r.choices, ans: r.ans,
          expl: r.st.map((x, i) => `${RN[i]} is ${x[1] ? 'true' : 'false'}.`).join(' ') + raw` Larmor: $P = q^2a^2/(6\pi\epsilon_0c^3)$ (needs acceleration, depends on $q^2$); dipole: $P \propto p_0^2\omega^4$ with a $\sin^2\theta$ pattern; radiation fields $\propto 1/r$ so intensity $\propto 1/r^2$; monopoles do not radiate (Gauss’s law fixes the outside field).`,
        };
      },
    },
    // =============================================================== 2.7.1 Basic elements
    {
      id: 'em2.circ.resistivity', sec: '2.7.1', level: 1,
      gen(R) {
        const v = R.pick(['stretch', 'scale', 'scale', 'num']);
        if (v === 'stretch') {
          const n = R.pick([2, 3, 4, 3 / 2, 1 / 2]);
          return {
            q: `A uniform wire of resistance $R_0$ is drawn out (or compressed) so that its length becomes $${fac(n)}$ times its original length, while its volume and resistivity stay the same. What is its new resistance?`,
            ...facMC(R, n * n, [n, 1 / n, n * n * n, 1, 1 / (n * n)], { fmt: x => (near(x, 1) ? 'R_0' : fac(x) + 'R_0') }),
            level: 2,
            expl: raw`$R = \rho\ell/A$ and $A = V/\ell$, so $R = \rho\ell^2/V \propto \ell^2$: factor $(${fac(n)})^2 = ${fac(n * n)}$. Forgetting that the area shrinks gives only $${fac(n)}$.`,
          };
        }
        if (v === 'scale') {
          const fl = R.pick([1, 2, 3, 4, 1 / 2]), fd = R.pick([2, 3, 1 / 2, 1]), frho = R.pick([1, 1, 2, 1 / 2]);
          const ans = frho * fl / (fd * fd);
          if (fl === 1 && fd === 1 && frho === 1) throw new Error('same');
          const bits = [];
          if (frho !== 1) bits.push(`resistivity ${fac(frho) === '2' ? 'twice' : 'half'} that of wire 1`);
          if (fl !== 1) bits.push(`$${fac(fl)}$ times the length`);
          if (fd !== 1) bits.push(`$${fac(fd)}$ times the diameter`);
          return {
            q: `Wire 1 has resistance $R_0$. Wire 2 has ${bits.join(', ')}${bits.length > 1 ? '' : ''}${fl === 1 ? ', and the same length' : ''}${fd === 1 ? ', and the same diameter' : ''}. What is the resistance of wire 2?`.replace(/\$1\$ times /g, ''),
            ...facMC(R, ans, [frho * fl / fd, frho * fl * fd * fd, frho / (fl * fd * fd), frho * fl / fd ** 4, fl / (fd * fd)], { fmt: x => (near(x, 1) ? 'R_0' : fac(x) + 'R_0') }),
            expl: raw`$R = \rho\ell/A$ with $A = \pi d^2/4$: factor $${fac(frho)}\times${fac(fl)}/(${fac(fd)})^2 = ${fac(ans)}$.`,
          };
        }
        const rho = R.pick([[1.7e-8, 'copper'], [2.8e-8, 'aluminum'], [1.0e-6, 'nichrome']]);
        const l = R.pick([1, 2, 5, 10, 20, 50]), d = R.pick([0.5, 1, 2]);
        const A = PI * (d * 5e-4) ** 2, Rv = rho[0] * l / A;
        return {
          q: raw`A ${rho[1]} wire (resistivity $${F.sci(rho[0])}\,\Omega\cdot\text{m}$) is $${l}\,\text{m}$ long and has a diameter of $${d}\,\text{mm}$. What is its resistance?`,
          ...GRE.numeric(R, Rv, [Rv / 4, rho[0] * l / (d * 1e-3) ** 2, rho[0] * A / l * 1e12, Rv * PI / 4], { unit: U.ohm }),
          expl: raw`$A = \pi(d/2)^2 = ${F.sci(A, 2)}\,\text{m}^2$, so $R = \rho\ell/A = ${vu(Rv, U.ohm)}$. Using the diameter as the radius gives a value 4 times too small.`,
        };
      },
    },
    {
      id: 'em2.circ.equiv', sec: '2.7.1', level: 2, weight: 2,
      gen(R) {
        if (R.bool(0.12)) {
          const k = R.pick([['two adjacent corners (the ends of one edge)', 7, 12], ['two corners diagonally opposite on one face', 3, 4], ['two corners at opposite ends of a body diagonal', 5, 6]]);
          const all = [[7, 12], [3, 4], [5, 6], [1, 2], [1, 1], [2, 3], [1, 3]];
          const S = f => `$${F.frac(f[0], f[1]) === '1' ? '' : F.frac(f[0], f[1])}R$`;
          return {
            q: `Twelve identical resistors, each of resistance $R$, form the edges of a cube. What is the equivalent resistance between ${k[0]}?`,
            ...GRE.mc(R, S([k[1], k[2]]), all.filter(f => f[0] * k[2] !== f[1] * k[1]).map(S), { rank: s => { const m = s.match(/frac\{(\d+)\}\{(\d+)\}/); return m ? m[1] / m[2] : 1; } }),
            level: 3,
            expl: raw`Use symmetry: points at equal potential can be joined without changing anything. Body diagonal: $R/3 + R/6 + R/3 = 5R/6$. Face diagonal: $3R/4$. Single edge: $7R/12$ (it is in parallel with the rest of the network).`,
          };
        }
        const fam = R.pick(['A', 'B', 'C', 'D', 'E']);
        const vals = [1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 30];
        const sc = R.pick([1, 1, 1, 10, 100]);
        const par = (...xs) => 1 / xs.reduce((s, x) => s + 1 / x, 0);
        const ANS = { A: (a, b, c) => a + par(b, c), B: (a, b, c) => par(a + b, c), C: (a, b, c, d) => par(a, b) + par(c, d), D: (a, b, c) => par(a, b, c), E: (a, b, c, d) => a + par(b, c + d) };
        let r, tries = 0;
        do { r = R.pickN(vals, 4).map(x => x * sc); if (++tries > 200) throw new Error('not nice'); }
        while (Math.abs(ANS[fam](...r) * 10 - Math.round(ANS[fam](...r) * 10)) > 1e-9);
        const [a, b, c, d] = r;
        let ans, wr, desc, body;
        const lab = i => `R${'₁₂₃₄'[i]}`;
        const T = (x1, x2) => ln(x1, 60, x2, 60);
        if (fam === 'A') {
          ans = a + par(b, c); wr = [a + b + c, par(a, b, c), par(a + b, c), par(a, b) + c, b + par(a, c)];
          desc = `$R_1$ in series with the parallel combination of $R_2$ and $R_3$`;
          body = T(20, 40) + el('R', 40, 60, 120, 60, lab(0)) + ln(120, 25, 120, 95) + ln(260, 25, 260, 95) + el('R', 120, 25, 260, 25, lab(1)) + el('R', 120, 95, 260, 95, lab(2), 'b') + T(260, 340);
        } else if (fam === 'B') {
          ans = par(a + b, c); wr = [a + b + c, par(a, b, c), a + par(b, c), par(a, b) + c, par(a, c) + b];
          desc = `$R_1$ and $R_2$ in series, with that combination in parallel with $R_3$`;
          body = T(20, 60) + ln(60, 25, 60, 95) + ln(300, 25, 300, 95) + el('R', 60, 25, 180, 25, lab(0)) + el('R', 180, 25, 300, 25, lab(1)) + el('R', 60, 95, 300, 95, lab(2), 'b') + T(300, 340);
        } else if (fam === 'C') {
          ans = par(a, b) + par(c, d); wr = [par(a + b, c + d), a + b + c + d, par(a, b, c, d), par(a, c) + par(b, d), par(a + c, b + d)];
          desc = `the parallel combination of $R_1$ and $R_2$ in series with the parallel combination of $R_3$ and $R_4$`;
          body = T(20, 40) + ln(40, 25, 40, 95) + ln(160, 25, 160, 95) + el('R', 40, 25, 160, 25, lab(0)) + el('R', 40, 95, 160, 95, lab(1), 'b') + T(160, 200) + ln(200, 25, 200, 95) + ln(320, 25, 320, 95) + el('R', 200, 25, 320, 25, lab(2)) + el('R', 200, 95, 320, 95, lab(3), 'b') + T(320, 340);
        } else if (fam === 'D') {
          ans = par(a, b, c); wr = [a + b + c, par(a, b) + c, par(a + b, c), (a + b + c) / 3, 3 * par(a, b, c)];
          desc = `$R_1$, $R_2$ and $R_3$ all in parallel`;
          body = T(20, 80) + T(280, 340) + ln(80, 20, 80, 100) + ln(280, 20, 280, 100) + el('R', 80, 20, 280, 20, lab(0)) + el('R', 80, 60, 280, 60) + tx(180, 50, lab(1)) + el('R', 80, 100, 280, 100, lab(2), 'b');
        } else {
          ans = a + par(b, c + d); wr = [a + par(b, c) + d, a + b + c + d, par(a, b, c, d), a + par(b + c, d), par(a + b, c + d)];
          desc = `$R_1$ in series with a parallel combination whose one branch is $R_2$ and whose other branch is $R_3$ and $R_4$ in series`;
          body = T(10, 20) + el('R', 20, 60, 100, 60, lab(0)) + ln(100, 25, 100, 95) + ln(330, 25, 330, 95) + el('R', 100, 25, 330, 25, lab(1)) + el('R', 100, 95, 215, 95, lab(2), 'b') + el('R', 215, 95, 330, 95, lab(3), 'b') + T(330, 345);
        }
        const fig = svg(350, 150, '<g transform="translate(0 12)">' + body + dot(20, 60) + dot(fam === 'E' ? 345 : 340, 60) + tx(12, 50, 'a') + tx(fam === 'E' ? 345 : 340, 50, 'b') + '</g>');
        const vtxt = r.slice(0, fam === 'C' || fam === 'E' ? 4 : 3).map((x, i) => `$R_${i + 1} = ${x}\\,\\Omega$`).join(', ');
        return {
          q: `The network shown connects terminals a and b: ${desc}, with ${vtxt}. What is the equivalent resistance between a and b?`,
          ...GRE.numeric(R, ans, wr, { unit: U.ohm, sig: 3, tol: 0.06 }),
          fig,
          expl: raw`Series resistances add; parallel ones combine as $1/R = \sum 1/R_i$ (for two: $R_aR_b/(R_a + R_b)$). Working from the innermost combination outward gives $R_{\text{eq}} = ${F.num(ans, 3)}\,\Omega$. Sanity check: a parallel combination is smaller than its smallest branch.`,
        };
      },
    },
    {
      id: 'em2.circ.combine', sec: '2.7.1', level: 1,
      gen(R) {
        const cap = R.bool();
        const vals = cap ? [1, 2, 3, 4, 6, 8, 12] : [2, 4, 5, 6, 10, 12, 20];
        const [a, b, c] = R.pickN(vals, 3);
        const ser = (...xs) => (cap ? 1 / xs.reduce((s, x) => s + 1 / x, 0) : xs.reduce((s, x) => s + x, 0));
        const par = (...xs) => (cap ? xs.reduce((s, x) => s + x, 0) : 1 / xs.reduce((s, x) => s + 1 / x, 0));
        const swap = (...xs) => xs.reduce((s, x) => s + x, 0) + 1 / xs.reduce((s, x) => s + 1 / x, 0) - par(...xs) - 0; // placeholder (unused)
        void swap;
        const fam = R.pick(['s2', 'p2', 'sp', 'ps']);
        const nm = cap ? 'capacitors' : 'inductors (with no mutual inductance)';
        const u = cap ? U.uF : U.mH, us = cap ? raw`\mu\text{F}` : raw`\text{mH}`;
        const sumv = (...xs) => xs.reduce((s, x) => s + x, 0), recip = (...xs) => 1 / xs.reduce((s, x) => s + 1 / x, 0);
        let ans, wr, desc;
        if (fam === 's2') { ans = ser(a, b); wr = [par(a, b), (a + b) / 2, Math.sqrt(a * b)]; desc = `$${a}\\,${us}$ and $${b}\\,${us}$ connected in series`; }
        else if (fam === 'p2') { ans = par(a, b); wr = [ser(a, b), (a + b) / 2, a * b]; desc = `$${a}\\,${us}$ and $${b}\\,${us}$ connected in parallel`; }
        else if (fam === 'sp') { ans = ser(a, par(b, c)); wr = [par(a, ser(b, c)), sumv(a, b, c), recip(a, b, c), ser(a, b) + c]; desc = `a $${a}\\,${us}$ element in series with the parallel combination of $${b}\\,${us}$ and $${c}\\,${us}$`; }
        else { ans = par(a, ser(b, c)); wr = [ser(a, par(b, c)), sumv(a, b, c), recip(a, b, c), par(a, b) + c]; desc = `a $${a}\\,${us}$ element in parallel with the series combination of $${b}\\,${us}$ and $${c}\\,${us}$`; }
        return {
          q: `What is the equivalent ${cap ? 'capacitance' : 'inductance'} of the following combination of ${nm}: ${desc}?`,
          ...GRE.numeric(R, ans, wr, { unit: u, sig: 3, tol: 0.06 }),
          expl: cap ? raw`Capacitors combine opposite to resistors: in parallel they add, in series $1/C = \sum 1/C_i$. Result: $${F.num(ans, 3)}\,\mu\text{F}$.` : raw`Inductors combine like resistors: in series they add, in parallel $1/L = \sum 1/L_i$. Result: $${F.num(ans, 3)}\,\text{mH}$.`,
        };
      },
    },
    {
      id: 'em2.circ.units', sec: '2.7.1', level: 1,
      gen(R) {
        if (R.bool(0.65)) {
          // dimensions as exponents of [ohm, second]: R = [1,0], C = [-1,1], L = [1,1]
          const EX = [
            ['RC', [0, 1]], ['L/R', [0, 1]], [raw`\sqrt{LC}`, [0, 1]], ['R/L', [0, -1]], [raw`1/(RC)`, [0, -1]], [raw`1/\sqrt{LC}`, [0, -1]],
            [raw`\sqrt{L/C}`, [1, 0]], [raw`L/(RC)`, [1, 0]], ['RL', [2, 1]], ['LC', [0, 2]], ['R/C', [2, -1]], ['C/R', [-2, 1]],
            ['L/C', [2, 0]], [raw`R^2C/L`, [0, 0]], [raw`RC/L`, [-1, 0]], [raw`\sqrt{C/L}`, [-1, 0]], ['LR^2', [3, 1]], [raw`RC^2`, [-1, 2]],
          ];
          const TG = [['time', [0, 1]], ['frequency (inverse time)', [0, -1]], ['resistance', [1, 0]], ['a pure number (dimensionless)', [0, 0]]];
          const [tn, td] = R.pick(TG);
          const same = (u, v) => u[0] === v[0] && u[1] === v[1];
          const good = EX.filter(e => same(e[1], td)), bad = EX.filter(e => !same(e[1], td));
          const g = R.pick(good);
          return {
            q: `If $R$ is a resistance, $C$ a capacitance, and $L$ an inductance, which of the following has the dimensions of ${tn}?`,
            ...GRE.mc(R, `$${g[0]}$`, R.pickN(bad, 6).map(e => `$${e[0]}$`)),
            expl: raw`In SI units $[C] = \text{s}/\Omega$ (from $\tau = RC$) and $[L] = \Omega\cdot\text{s}$ (from $\tau = L/R$). So $${g[0]}$ has units of ${tn}. Remember $RC$, $L/R$ and $\sqrt{LC}$ are times, and $\sqrt{L/C}$ is a resistance.`,
          };
        }
        const UN = [
          ['henry (H)', [raw`\Omega\cdot\text{s}`, raw`\text{Wb/A}`, raw`\text{V}\cdot\text{s/A}`], [raw`\Omega/\text{s}`, raw`\text{V/(A}\cdot\text{s)}`, raw`\text{s}/\Omega`, raw`\text{Wb}\cdot\text{A}`, raw`\text{C/V}`]],
          ['farad (F)', [raw`\text{s}/\Omega`, raw`\text{C/V}`, raw`\text{A}\cdot\text{s/V}`], [raw`\Omega\cdot\text{s}`, raw`\text{V/C}`, raw`\text{C}\cdot\text{V}`, raw`\text{Wb/A}`, raw`\text{A/(V}\cdot\text{s)}`]],
          ['tesla (T)', [raw`\text{Wb/m}^2`, raw`\text{V}\cdot\text{s/m}^2`, raw`\text{N/(A}\cdot\text{m)}`], [raw`\text{Wb}\cdot\text{m}^2`, raw`\text{N}\cdot\text{A/m}`, raw`\text{V/(m}\cdot\text{s)}`, raw`\text{A/m}`, raw`\text{V}\cdot\text{m}`]],
          ['weber (Wb)', [raw`\text{V}\cdot\text{s}`, raw`\text{T}\cdot\text{m}^2`, raw`\text{H}\cdot\text{A}`], [raw`\text{V/s}`, raw`\text{T/m}^2`, raw`\text{H/A}`, raw`\text{A}\cdot\text{s}`, raw`\text{V}\cdot\text{A}`]],
        ];
        const [n, good, bad] = R.pick(UN);
        const g = R.pick(good);
        return {
          q: `Which of the following is equivalent to one ${n}?`,
          ...GRE.mc(R, `$${g}$`, bad.map(b => `$${b}$`)),
          expl: raw`Use defining relations: $V = L\,dI/dt$ (H $= \text{V}\cdot\text{s/A} = \Omega\cdot\text{s}$), $Q = CV$ (F $= \text{C/V} = \text{s}/\Omega$), $\mathcal{E} = -d\Phi/dt$ (Wb $= \text{V}\cdot\text{s}$), $F = ILB$ (T $= \text{N/(A}\cdot\text{m)} = \text{Wb/m}^2$). So $${g}$ is one ${n}.`,
        };
      },
    },

    // =============================================================== 2.7.2 Kirchhoff's rules
    {
      id: 'em2.kirch.twoloop', sec: '2.7.2', level: 2, weight: 2,
      gen(R) {
        let e1, e2, r1, r2, r3, s2, V, tries = 0;
        do {
          if (++tries > 80) throw new Error('no nice draw');
          e1 = R.pick([2, 3, 4, 6, 8, 9, 10, 12]); e2 = R.pick([2, 3, 4, 6, 8, 9, 10, 12]);
          r1 = R.pick([1, 2, 3, 4, 6]); r2 = R.pick([1, 2, 3, 4, 6]); r3 = R.pick([1, 2, 3, 4, 6, 12]);
          s2 = R.pick([1, 1, -1]);
          V = (e1 / r1 + s2 * e2 / r2) / (1 / r1 + 1 / r2 + 1 / r3);
        } while (Math.abs(V * 4 - Math.round(V * 4)) > 1e-9 || Math.abs(V) < 1e-9 || Math.abs(V / r3 * 4 - Math.round(V / r3 * 4)) > 1e-9);
        const ask = R.pick(['I3', 'I3', 'I1', 'V3']);
        const I1 = (e1 - V) / r1, I3 = V / r3;
        const alt = s => (e1 / r1 + s * e2 / r2) / (1 / r1 + 1 / r2 + 1 / r3);
        const Vno = (e1 / r1) / (1 / r1 + 1 / r2 + 1 / r3), Vflip = alt(-s2);
        let ans, wr, unit, qq;
        if (ask === 'I3') { ans = Math.abs(I3); wr = [Math.abs(Vno / r3), Math.abs(Vflip / r3), (e1 + e2) / (r1 + r2 + r3), e1 / (r1 + r3), Math.abs(V) / (r1 + r3)]; unit = U.A; qq = 'What is the magnitude of the current through $R_3$?'; }
        else if (ask === 'V3') { ans = Math.abs(V); wr = [Math.abs(Vno), Math.abs(Vflip), (e1 + e2) / 2, e1 - e2 * s2, Math.abs(e1 - V)]; unit = U.V; qq = 'What is the magnitude of the potential difference across $R_3$?'; }
        else { ans = Math.abs(I1); wr = [Math.abs((e1 - Vno) / r1), Math.abs((e1 - Vflip) / r1), e1 / r1, Math.abs(I3), e1 / (r1 + r3)]; unit = U.A; qq = 'What is the magnitude of the current through $R_1$?'; }
        if (ans < 1e-9) throw new Error('zero');
        const bat = (x, up, label) => (up ? el('B', x, 95, x, 125, label, 'l') : el('B', x, 125, x, 95, label, 'l'));
        const body = ln(40, 20, 320, 20) + ln(40, 140, 320, 140) +
          el('R', 40, 20, 40, 80, 'R₁', 'l') + ln(40, 80, 40, 95) + bat(40, true, 'ε₁') + ln(40, 125, 40, 140) +
          el('R', 180, 20, 180, 140, 'R₃') +
          el('R', 320, 20, 320, 80, 'R₂') + ln(320, 80, 320, 95) + (s2 > 0 ? el('B', 320, 95, 320, 125) : el('B', 320, 125, 320, 95)) + tx(337, 115, 'ε₂', 'start') + ln(320, 125, 320, 140) +
          tx(52, 100, '+', 'start') + tx(308, s2 > 0 ? 100 : 132, '+', 'end') + dot(180, 20) + dot(180, 140);
        return {
          q: raw`In the circuit shown, three branches connect the top node to the bottom node. The left branch has a battery $\mathcal{E}_1 = ${e1}\,\text{V}$ (positive terminal toward the top node) in series with $R_1 = ${r1}\,\Omega$; the middle branch is $R_3 = ${r3}\,\Omega$; the right branch has a battery $\mathcal{E}_2 = ${e2}\,\text{V}$ (positive terminal toward the ${s2 > 0 ? 'top' : 'bottom'} node) in series with $R_2 = ${r2}\,\Omega$. The batteries are ideal. ${qq}`,
          ...GRE.numeric(R, ans, wr, { unit, sig: 3, tol: 0.06 }),
          fig: svg(360, 160, body),
          level: 3 - (s2 > 0 ? 1 : 0),
          expl: raw`Let $V$ be the top node’s potential relative to the bottom. Junction rule: $\dfrac{${e1} - V}{${r1}} + \dfrac{${s2 > 0 ? '' : '-'}${e2} - V}{${r2}} = \dfrac{V}{${r3}}$, giving $V = ${F.num(V, 3)}\,\text{V}$. Then $I_3 = V/R_3 = ${F.num(I3, 3)}\,\text{A}$ and $I_1 = (\mathcal{E}_1 - V)/R_1 = ${F.num(I1, 3)}\,\text{A}$ (a negative value means it flows opposite to the assumed direction).`,
        };
      },
    },
    {
      id: 'em2.kirch.divider', sec: '2.7.2', level: 2,
      gen(R) {
        const v = R.pick(['terminal', 'findr', 'maxP', 'voltmeter', 'bridge', 'bridgeV']);
        const e = R.pick([1.5, 3, 6, 9, 12, 24]);
        if (v === 'terminal') {
          const r = R.pick([0.5, 1, 2]), Rl = R.pick([1, 2, 3, 4, 5, 10]);
          const Vt = e * Rl / (Rl + r);
          return {
            q: raw`A battery with emf $${e}\,\text{V}$ and internal resistance $${r}\,\Omega$ is connected to a $${Rl}\,\Omega$ resistor. What is the potential difference across the battery’s terminals?`,
            ...GRE.numeric(R, Vt, [e, e * r / (Rl + r), e / Rl * Rl, e * (Rl - r) / Rl, e * Rl / (Rl + 2 * r)].filter(x => x > 0), { unit: U.V, sig: 3, tol: 0.04 }),
            level: 1,
            expl: raw`$I = \mathcal{E}/(R + r) = ${F.num(e / (Rl + r), 3)}\,\text{A}$; terminal voltage $V = \mathcal{E} - Ir = IR = ${F.num(Vt, 3)}\,\text{V}$.`,
          };
        }
        if (v === 'findr') {
          const r = R.pick([0.5, 1, 1.5, 2]), Rl = R.pick([2, 4, 5, 6, 10]);
          const Vt = e * Rl / (Rl + r);
          return {
            q: raw`An ideal voltmeter reads $${F.num(e, 3)}\,\text{V}$ across a battery’s terminals when nothing else is connected, and $${F.num(Vt, 3)}\,\text{V}$ when a $${Rl}\,\Omega$ resistor is connected across them. What is the battery’s internal resistance?`,
            ...GRE.numeric(R, r, [Rl * (e - Vt) / e, Rl * Vt / e, (e - Vt) / Rl, Rl * e / Vt - Rl * 0.5], { unit: U.ohm, sig: 3, tol: 0.06 }),
            expl: raw`Open-circuit reading $= \mathcal{E}$. Loaded: $I = V/R = ${F.num(Vt / Rl, 3)}\,\text{A}$, and $\mathcal{E} - V = Ir$ gives $r = R(\mathcal{E} - V)/V = ${F.num(r, 3)}\,\Omega$.`,
          };
        }
        if (v === 'maxP') {
          const r = R.pick([0.5, 1, 2, 3, 4]);
          const askR = R.bool();
          const P = e * e / (4 * r);
          return {
            q: raw`A battery of emf $${e}\,\text{V}$ and internal resistance $${r}\,\Omega$ powers a variable load resistor. ${askR ? 'For what load resistance is the power delivered to the load a maximum?' : 'What is the maximum power that can be delivered to the load?'}`,
            ...(askR ? GRE.numeric(R, r, [0.5 * r, 2 * r, 4 * r, r * r + 1], { unit: U.ohm, sig: 3 }) : GRE.numeric(R, P, [e * e / r, e * e / (2 * r), 2 * P / 4 * 3, e * e / (8 * r)], { unit: U.W, sig: 3 })),
            expl: raw`$P = \mathcal{E}^2R/(R + r)^2$ is maximized at $R = r = ${r}\,\Omega$ (impedance matching), giving $P_{\max} = \mathcal{E}^2/(4r) = ${F.num(P, 3)}\,\text{W}$.`,
          };
        }
        if (v === 'voltmeter') {
          const Rr = R.pick([10, 20, 50, 100]), k = R.pick([1, 2, 4]);
          const Rv = Rr * k, p = Rr * Rv / (Rr + Rv), V = e * p / (Rr + p);
          return {
            q: raw`Two $${Rr}\,\text{k}\Omega$ resistors are connected in series across an ideal $${e}\,\text{V}$ battery. A voltmeter with internal resistance $${Rv}\,\text{k}\Omega$ is connected across one of them. What does it read?`,
            ...GRE.numeric(R, V, [e / 2, e * Rv / (Rr + Rv), e / 3 * (k === 1 ? 0.75 : 1), e * Rr / (2 * Rr + Rv)], { unit: U.V, sig: 3, tol: 0.05 }),
            level: 3,
            expl: raw`The meter is in parallel with the resistor: $${Rr}\parallel${Rv} = ${F.num(p, 3)}\,\text{k}\Omega$. Divider: $V = ${e}\times\dfrac{${F.num(p, 3)}}{${Rr} + ${F.num(p, 3)}} = ${F.num(V, 3)}\,\text{V}$, less than the unloaded $${e / 2}\,\text{V}$ — a real voltmeter loads the circuit.`,
          };
        }
        const r1 = R.pick([10, 20, 30, 40, 60]), r2 = R.pick([10, 20, 30, 40, 60]), r3 = R.pick([5, 10, 15, 20, 30]);
        const desc = raw`Resistors $R_1$ and $R_2$ are connected in series (in that order) from the positive to the negative terminal of an ideal $${e}\,\text{V}$ battery; resistors $R_3$ and $R_4$ form a second series branch across the same terminals, also in that order. A galvanometer connects the junction between $R_1$ and $R_2$ to the junction between $R_3$ and $R_4$.`;
        if (v === 'bridge') {
          const r4 = r2 * r3 / r1;
          return {
            q: raw`${desc} With $R_1 = ${r1}\,\Omega$, $R_2 = ${r2}\,\Omega$, and $R_3 = ${r3}\,\Omega$, for what value of $R_4$ does the galvanometer read zero?`,
            ...GRE.numeric(R, r4, [r1 * r3 / r2, r1 * r2 / r3, r1 + r2 - r3, r3 * r3 / r1].filter(x => x > 0), { unit: U.ohm, sig: 3, tol: 0.06 }),
            expl: raw`Balanced Wheatstone bridge: the two junctions are at the same potential when $R_1/R_2 = R_3/R_4$, so $R_4 = R_2R_3/R_1 = ${F.num(r4, 3)}\,\Omega$, independent of the battery voltage.`,
          };
        }
        const r4 = R.pick([10, 20, 30, 40, 60]);
        const Va = e * r2 / (r1 + r2), Vb = e * r4 / (r3 + r4), dV = Math.abs(Va - Vb);
        if (dV < 1e-9) throw new Error('balanced');
        return {
          q: raw`${desc.replace(/ A galvanometer connects.*$/, '')} With $R_1 = ${r1}\,\Omega$, $R_2 = ${r2}\,\Omega$, $R_3 = ${r3}\,\Omega$, and $R_4 = ${r4}\,\Omega$, what does an ideal voltmeter read when connected between the junction of $R_1$ and $R_2$ and the junction of $R_3$ and $R_4$?`,
          ...numMC(R, dV, [Va + Vb, Math.abs(e * r1 / (r1 + r2) - e * r4 / (r3 + r4)), Va, Vb, 0], { unit: U.V, sig: 3, tol: 0.04 }),
          level: 3,
          expl: raw`With an ideal (infinite-resistance) voltmeter each branch is a simple divider. Relative to the negative terminal: $V_{12} = \mathcal{E}R_2/(R_1 + R_2) = ${F.num(Va, 3)}\,\text{V}$ and $V_{34} = \mathcal{E}R_4/(R_3 + R_4) = ${F.num(Vb, 3)}\,\text{V}$. Difference: $${F.num(dV, 3)}\,\text{V}$.`,
        };
      },
    },
    {
      id: 'em2.kirch.junction', sec: '2.7.2', level: 1,
      gen(R) {
        const v = R.pick(['node', 'loop']);
        if (v === 'node') {
          const ins = R.pickN([1, 2, 3, 4, 5, 6, 7, 8], R.int(2, 3)), outs = R.pickN([1, 2, 3, 4, 5], R.int(1, 2));
          const net = ins.reduce((a, b) => a + b, 0) - outs.reduce((a, b) => a + b, 0);
          if (net === 0) throw new Error('zero');
          const cl = xs => xs.map(x => `$${x}\\,\\text{A}$`);
          const txt = `${ins.length > 1 ? 'Currents of ' + andJoin(cl(ins)) + ' flow' : 'A current of ' + cl(ins)[0] + ' flows'} into a junction, and ${outs.length > 1 ? 'currents of ' + andJoin(cl(outs)) + ' flow' : 'a current of ' + cl(outs)[0] + ' flows'} out of it through other wires. One more wire is attached to the junction. What current does it carry, and in which direction?`;
          const S = (x, d) => `$${Math.abs(x)}\\,\\text{A}$, ${d}`;
          const ans = S(net, net > 0 ? 'out of the junction' : 'into the junction');
          const tot = ins.reduce((a, b) => a + b, 0) + outs.reduce((a, b) => a + b, 0);
          const wr = [S(net, net > 0 ? 'into the junction' : 'out of the junction'), S(tot, 'out of the junction'), S(tot, 'into the junction'), '$0$', S(Math.abs(net) + 1, net > 0 ? 'out of the junction' : 'into the junction')];
          return {
            q: txt,
            ...GRE.mc(R, ans, wr),
            expl: raw`Kirchhoff’s junction rule (charge conservation): total in = total out. In: $${ins.reduce((a, b) => a + b, 0)}\,\text{A}$; out: $${outs.reduce((a, b) => a + b, 0)}\,\text{A}$; so the last wire carries $${Math.abs(net)}\,\text{A}$ ${net > 0 ? 'out of' : 'into'} the junction.`,
          };
        }
        const e1 = R.pick([6, 9, 12, 18, 24]), e2 = R.pick([1.5, 3, 4.5, 6]), r1 = R.pick([1, 2, 3, 4]), r2 = R.pick([1, 2, 5, 6]);
        const aid = R.bool();
        const I = (aid ? e1 + e2 : e1 - e2) / (r1 + r2);
        if (I <= 0) throw new Error('neg');
        return {
          q: raw`A single loop contains a $${e1}\,\text{V}$ battery, a $${e2}\,\text{V}$ battery, and resistors of $${r1}\,\Omega$ and $${r2}\,\Omega$, all in series. The batteries are ideal and are connected so that they ${aid ? 'both drive current in the same direction around the loop' : 'oppose each other (positive terminals facing each other around the loop)'}. What current flows?`,
          ...GRE.numeric(R, I, [(aid ? e1 - e2 : e1 + e2) / (r1 + r2), e1 / (r1 + r2), (aid ? e1 + e2 : e1 - e2) * (r1 + r2) / (r1 * r2), e1 / r1], { unit: U.A, sig: 3, tol: 0.05 }),
          expl: raw`Loop rule: the net emf around the loop equals $I\sum R$. Net emf $= ${e1} ${aid ? '+' : '-'} ${e2} = ${aid ? e1 + e2 : e1 - e2}\,\text{V}$, so $I = ${F.num(I, 3)}\,\text{A}$.`,
        };
      },
    },
    // =============================================================== 2.7.3 Energy in circuits
    {
      id: 'em2.energy.power', sec: '2.7.3', level: 2, weight: 2,
      gen(R) {
        const v = R.pick(['serpar', 'bulbs', 'bulbs', 'network', 'heater']);
        if (v === 'serpar') {
          const n = R.pick([2, 3, 4, 5]);
          const parFirst = R.bool();
          const ans = parFirst ? 1 / (n * n) : n * n;
          return {
            q: `${n === 2 ? 'Two' : n === 3 ? 'Three' : n === 4 ? 'Four' : 'Five'} identical resistors are connected to an ideal battery, first all in ${parFirst ? 'parallel' : 'series'} and then all in ${parFirst ? 'series' : 'parallel'}. What is the ratio of the total power dissipated in the second arrangement to that in the first?`,
            ...facMC(R, ans, [n, 1 / n, 1 / ans, n * n * n, 1]),
            level: 1,
            expl: raw`At fixed $V$, $P = V^2/R_{\text{eq}}$. Series: $R_{\text{eq}} = ${n}R$; parallel: $R/${n}$. The ratio of equivalent resistances is $${n * n}$, so $P_2/P_1 = ${fac(ans)}$.`,
          };
        }
        if (v === 'bulbs') {
          const V0 = 120;
          const [P1, P2] = R.pickN([25, 40, 60, 75, 100, 150], 2);
          const R1 = V0 * V0 / P1, R2 = V0 * V0 / P2, I = V0 / (R1 + R2);
          const which = R.bool();
          const ans = I * I * (which ? R1 : R2);
          const other = I * I * (which ? R2 : R1);
          return {
            q: raw`Two light bulbs are rated $${P1}\,\text{W}$ and $${P2}\,\text{W}$ when each is operated alone at $120\,\text{V}$. They are connected in series across a $120\,\text{V}$ supply. Treating their resistances as constant, what power does the ${which ? P1 : P2}-watt bulb dissipate?`,
            ...GRE.numeric(R, ans, [other, which ? P1 : P2, (which ? P1 : P2) / 2, P1 * P2 / (P1 + P2), (which ? P1 : P2) / 4], { unit: U.W, sig: 3, tol: 0.06 }),
            level: 3,
            expl: raw`$R = V_0^2/P$: $R_{${P1}} = ${F.num(R1, 3)}\,\Omega$, $R_{${P2}} = ${F.num(R2, 3)}\,\Omega$. $I = 120/${F.num(R1 + R2, 3)} = ${F.num(I, 3)}\,\text{A}$, and $P = I^2R = ${F.num(ans, 3)}\,\text{W}$. In series the lower-wattage (higher-resistance) bulb is the brighter one.`,
          };
        }
        if (v === 'network') {
          const V = R.pick([6, 12, 18, 24, 36]), r1 = R.pick([2, 3, 4, 6]), r2 = R.pick([3, 4, 6, 12]), r3 = R.pick([3, 4, 6, 12]);
          const p = r2 * r3 / (r2 + r3), I = V / (r1 + p), Vp = I * p;
          const tgt = R.pick([1, 2]);
          const ans = tgt === 1 ? I * I * r1 : Vp * Vp / r2;
          const wr = tgt === 1 ? [V * V / r1, I * I * p, Vp * Vp / r2, V * I] : [V * V / r2, I * I * r2, Vp * Vp / r3, (I / 2) ** 2 * r2];
          return {
            q: raw`A resistor $R_1 = ${r1}\,\Omega$ is connected in series with the parallel combination of $R_2 = ${r2}\,\Omega$ and $R_3 = ${r3}\,\Omega$, across an ideal $${V}\,\text{V}$ battery. What power is dissipated in $R_${tgt}$?`,
            ...GRE.numeric(R, ans, wr, { unit: U.W, sig: 3, tol: 0.05 }),
            expl: raw`$R_{\text{eq}} = ${r1} + ${F.num(p, 3)} = ${F.num(r1 + p, 3)}\,\Omega$, $I = ${F.num(I, 3)}\,\text{A}$. ${tgt === 1 ? raw`$P_1 = I^2R_1 = ${F.num(ans, 3)}\,\text{W}$.` : raw`The parallel pair has $V_p = IR_{23} = ${F.num(Vp, 3)}\,\text{V}$, so $P_2 = V_p^2/R_2 = ${F.num(ans, 3)}\,\text{W}$.`}`,
          };
        }
        const P0 = R.pick([500, 1000, 1200, 1500, 2000]);
        const w = R.pick(['halfV', 'doubleV', 'cut', 'two']);
        const ansF = { halfV: 1 / 4, doubleV: 4, cut: 2, two: 1 / 4 }[w];
        const txt = {
          halfV: 'is operated at half its rated voltage',
          doubleV: 'is (briefly) operated at twice its rated voltage',
          cut: 'has its heating wire cut to half its original length and is then operated at the rated voltage',
          two: 'is connected in series with an identical heater, and the pair is operated at the rated voltage',
        }[w];
        return {
          q: raw`A heater dissipates $${P0}\,\text{W}$ at its rated voltage. Assuming its resistance does not change with temperature, what power does it dissipate if it ${txt}?`,
          ...GRE.numeric(R, P0 * ansF, [w === 'two' ? P0 / 2 : P0 * Math.sqrt(ansF), P0 / ansF, P0 * ansF * ansF, P0 / 4, P0 / 2].filter(x => Math.abs(x - P0 * ansF) > 1), { unit: U.W, sig: 3 }),
          level: 1,
          expl: raw`$P = V^2/R$. ${w === 'cut' ? 'Halving the length halves $R$, so $P$ doubles.' : w === 'two' ? 'In series each heater gets half the voltage, so each dissipates a quarter of its rated power (the pair together dissipates half — not what was asked).' : `$P \\propto V^2$, so the factor is $${fac(ansF)}$.`} Result: $${F.num(P0 * ansF, 3)}\,\text{W}$${w === 'two' ? ' for each heater' : ''}.`.replace('$${F.num', '$${F.num'),
        };
      },
    },
    {
      id: 'em2.energy.stored', sec: '2.7.3', level: 2,
      gen(R) {
        const isC = R.bool();
        const e = R.pick([6, 9, 12, 18, 24]), r1 = R.pick([1, 2, 3, 4, 6]), r2 = R.pick([2, 3, 4, 6, 12]);
        const X = isC ? R.pick([2, 5, 10, 20, 50]) : R.pick([10, 20, 50, 100, 200]);
        let ans, wr, ex;
        if (isC) {
          const Vc = e * r2 / (r1 + r2);
          ans = 0.5 * X * Vc * Vc;
          wr = [0.5 * X * e * e, X * Vc * Vc, 0.5 * X * (e * r1 / (r1 + r2)) ** 2, 0];
          ex = raw`In steady state no current flows into the capacitor, so $I = \mathcal{E}/(R_1 + R_2)$ and the capacitor has the voltage of $R_2$: $V_C = \mathcal{E}R_2/(R_1 + R_2) = ${F.num(Vc, 3)}\,\text{V}$. $U = \tfrac12CV_C^2 = ${F.num(ans, 3)}\,\mu\text{J}$.`;
        } else {
          const IL = e / r1;
          ans = 0.5 * X * 1e-3 * IL * IL;
          wr = [0.5 * X * 1e-3 * (e / (r1 + r2)) ** 2, X * 1e-3 * IL * IL, 0.5 * X * 1e-3 * (e / r2) ** 2, 0];
          ex = raw`In steady state the inductor has no voltage across it: it shorts out $R_2$, so all the current $\mathcal{E}/R_1 = ${F.num(IL, 3)}\,\text{A}$ flows through it. $U = \tfrac12LI^2 = ${F.num(ans, 3)}\,\text{J}$.`;
        }
        const body = el('B', 30, 55, 30, 95, 'ε', 'l') + ln(30, 20, 30, 55) + ln(30, 95, 30, 130) + ln(30, 20, 60, 20) + el('R', 60, 20, 150, 20, 'R₁') + ln(150, 20, 280, 20) + ln(30, 130, 280, 130) +
          el('R', 180, 20, 180, 130, 'R₂') + el(isC ? 'C' : 'L', 280, 20, 280, 130, isC ? 'C' : 'L') + dot(180, 20) + dot(180, 130) + tx(40, 50, '+', 'start');
        return {
          q: raw`In the circuit shown, an ideal battery $\mathcal{E} = ${e}\,\text{V}$ is in series with $R_1 = ${r1}\,\Omega$, which feeds the parallel combination of $R_2 = ${r2}\,\Omega$ and ${isC ? `a $${X}\\,\\mu\\text{F}$ capacitor` : `a $${X}\\,\\text{mH}$ inductor (with negligible resistance)`}. After the circuit has been connected for a long time, how much energy is stored in the ${isC ? 'capacitor' : 'inductor'}?`,
          ...numMC(R, ans, wr, { unit: isC ? U.uJ : U.J, sig: 3, tol: 0.05 }),
          fig: svg(340, 165, '<g transform="translate(0 12)">' + body + '</g>'),
          expl: ex,
        };
      },
    },
    {
      id: 'em2.energy.charging', sec: '2.7.3', level: 2,
      gen(R) {
        const v = R.pick(['heat', 'share', 'share', 'fraction']);
        if (v === 'heat') {
          const Cu = R.pick([2, 5, 10, 20, 50]), e = R.pick([6, 10, 12, 20, 50]), Rr = R.pick([10, 100, 1000]);
          const H = 0.5 * Cu * e * e;
          return {
            q: raw`An initially uncharged $${Cu}\,\mu\text{F}$ capacitor is charged through a $${Rr}\,\Omega$ resistor by an ideal $${e}\,\text{V}$ battery until the current stops. How much energy is dissipated in the resistor?`,
            ...numMC(R, H, [2 * H, H / 2, 0, H * Rr / 1000 + (Rr === 1000 ? H * 3 : 0)], { unit: U.uJ, sig: 3 }),
            expl: raw`The battery delivers $Q\mathcal{E} = C\mathcal{E}^2$; the capacitor stores $\tfrac12C\mathcal{E}^2$; the rest, $\tfrac12C\mathcal{E}^2 = ${F.num(H, 3)}\,\mu\text{J}$, is dissipated — independent of $R$.`,
          };
        }
        if (v === 'fraction') {
          return {
            q: 'A capacitor is charged from zero through a resistor $R$ by an ideal battery. As $R$ is made smaller and smaller, what happens to the fraction of the battery’s work that ends up stored in the capacitor?',
            ...GRE.mc(R, 'It stays equal to $1/2$.', ['It approaches 1.', 'It approaches 0.', 'It stays equal to $1/4$.', 'It approaches $1/e$.', 'It stays equal to $1 - 1/e$.']),
            level: 3,
            expl: raw`$W_{\text{batt}} = C\mathcal{E}^2$ and $U = \tfrac12C\mathcal{E}^2$ always; integrating $I^2R$ with $I = (\mathcal{E}/R)e^{-t/RC}$ gives exactly $\tfrac12C\mathcal{E}^2$ dissipated for any $R$. Smaller $R$ just means a larger, shorter current pulse.`,
          };
        }
        const C1 = R.pick([1, 2, 3, 4, 6]), C2 = R.pick([1, 2, 3, 4, 6]), V0 = R.pick([6, 10, 12, 20, 30]);
        const Vf = C1 * V0 / (C1 + C2), Ui = 0.5 * C1 * V0 * V0, Uf = 0.5 * (C1 + C2) * Vf * Vf;
        const ask = R.pick(['Vf', 'loss', 'Uf']);
        let ans, wr, u;
        if (ask === 'Vf') { ans = Vf; wr = [V0, V0 / 2, V0 * C2 / (C1 + C2), V0 * Math.sqrt(C1 / (C1 + C2))]; u = U.V; }
        else if (ask === 'loss') { ans = Ui - Uf; wr = [0, Ui, Uf, Ui / 2 === Ui - Uf ? Ui / 4 : Ui / 2]; u = U.uJ; }
        else { ans = Uf; wr = [Ui, Ui - Uf, 0.5 * (C1 + C2) * V0 * V0, 0.5 * C2 * Vf * Vf]; u = U.uJ; }
        return {
          q: raw`A $${C1}\,\mu\text{F}$ capacitor charged to $${V0}\,\text{V}$ is disconnected from its battery and then connected across an uncharged $${C2}\,\mu\text{F}$ capacitor. After equilibrium is reached, ${ask === 'Vf' ? 'what is the common voltage?' : ask === 'loss' ? 'how much electrostatic energy has been lost (to heat and radiation)?' : 'what is the total energy stored in the two capacitors?'}`,
          ...numMC(R, ans, wr, { unit: u, sig: 3, tol: 0.05 }),
          level: ask === 'Vf' ? 1 : 2,
          expl: raw`Charge is conserved: $Q = C_1V_0 = ${C1 * V0}\,\mu\text{C}$ shared by $C_1 + C_2 = ${C1 + C2}\,\mu\text{F}$, so $V_f = ${F.num(Vf, 3)}\,\text{V}$. Energy: $U_i = ${F.num(Ui, 3)}\,\mu\text{J}$, $U_f = Q^2/2(C_1 + C_2) = ${F.num(Uf, 3)}\,\mu\text{J}$; the loss $U_i\,C_2/(C_1 + C_2) = ${F.num(Ui - Uf, 3)}\,\mu\text{J}$ does not depend on the wire resistance.`,
        };
      },
    },

    // =============================================================== 2.7.4 RC, RL, LC, RLC
    {
      id: 'em2.rc.decay', sec: '2.7.4', level: 2, weight: 2,
      gen(R) {
        const v = R.pick(['tau', 'charge', 'sym', 'sym', 'symE']);
        if (v === 'tau' || v === 'charge') {
          const Rk = R.pick([1, 2, 4, 5, 10, 20, 50]), Cu = R.pick([1, 2, 5, 10, 20, 50]);
          const tau = Rk * 1e3 * Cu * 1e-6;
          if (v === 'tau') return {
            q: raw`A $${Cu}\,\mu\text{F}$ capacitor discharges through a $${Rk}\,\text{k}\Omega$ resistor. What is the time constant of the circuit?`,
            ...GRE.numeric(R, tau, [Rk * 1e3 / (Cu * 1e-6) * 1e-12, tau * 1e3, 1 / tau * 1e-3, tau * Math.LN2], { unit: U.s, sig: 2 }),
            level: 1,
            expl: raw`$\tau = RC = (${Rk}\times10^3\,\Omega)(${Cu}\times10^{-6}\,\text{F}) = ${vu(tau, U.s)}$. (Ohms times farads is seconds.)`,
          };
          const e = R.pick([5, 10, 12, 20, 50, 100]), n = R.pick([1, 2, 3]);
          const charging = R.bool();
          const Vc = charging ? e * (1 - Math.exp(-n)) : e * Math.exp(-n);
          const t = n * tau;
          return {
            q: raw`A $${Cu}\,\mu\text{F}$ capacitor is ${charging ? `initially uncharged and is connected through a $${Rk}\\,\\text{k}\\Omega$ resistor to an ideal $${e}\\,\\text{V}$ battery` : `charged to $${e}\\,\\text{V}$ and then connected across a $${Rk}\\,\\text{k}\\Omega$ resistor`} at $t = 0$. What is the voltage across the capacitor at $t = ${F.num(t, 3)}\,\text{s}$? (Use $e \approx 2.72$.)`,
            ...GRE.numeric(R, Vc, [charging ? e * Math.exp(-n) : e * (1 - Math.exp(-n)), e * Math.pow(0.5, n), e * Math.exp(-n) * (charging ? 2 : 3), e * (1 - Math.exp(-n)) * (charging ? 0.6 : 0.5), charging ? e * (1 - Math.pow(0.5, n)) : e / (n + 1), e * (1 - 1 / (n + 1))], { unit: U.V, sig: 2, tol: 0.1 }),
            expl: raw`$\tau = RC = ${F.num(tau, 3)}\,\text{s}$, so $t = ${n}\tau$. ${charging ? raw`Charging: $V = \mathcal{E}(1 - e^{-t/\tau}) = ${e}(1 - e^{-${n}})` : raw`Discharging: $V = V_0e^{-t/\tau} = ${e}e^{-${n}}`} \approx ${F.num(Vc, 2)}\,\text{V}$.`,
          };
        }
        if (v === 'sym') {
          const j = R.pick([1, 2, 3]);
          const what = R.pick(['charge on the capacitor', 'current in the resistor', 'voltage across the capacitor']);
          const charging = what !== 'current in the resistor' && R.bool(0.4);
          const frac = charging ? `$${F.frac(2 ** j - 1, 2 ** j)}$ of its final value` : `$${F.frac(1, 2 ** j)}$ of its initial value`;
          const S = c => (c === 0 ? null : `$${F.coef(c * 2, 2)}RC\\ln 2$`.replace('$\\frac{1}{2}RC', '$\\tfrac{1}{2}RC'));
          const Sl = c => `$${c === 1 ? '' : c}RC/\\ln 2$`;
          const wr = [S(j / 2), S(2 * j), S(j + 1), S(j - 1), Sl(j), `$${F.frac(2 ** j - 1, 2 ** j)}RC$`.replace('$1RC', '$RC')];
          return {
            q: `A capacitor $C$ ${charging ? 'is charged from zero through a resistor $R$ by an ideal battery' : 'with initial charge $Q_0$ discharges through a resistor $R$'}, starting at $t = 0$. At what time has the ${what} ${charging ? 'reached' : 'fallen to'} ${frac}?`,
            ...GRE.mc(R, S(j), wr.filter(Boolean)),
            expl: charging
              ? raw`Charging: $Q = Q_f(1 - e^{-t/RC})$. Setting $1 - e^{-t/RC} = 1 - 2^{-${j}}$ gives $t = ${j === 1 ? '' : j}RC\ln 2$.`
              : raw`Discharge: charge, capacitor voltage and current all decay as $e^{-t/RC}$. Setting $e^{-t/RC} = 2^{-${j}}$ gives $t = ${j === 1 ? '' : j}RC\ln 2$.`,
          };
        }
        const j = R.pick([2, 3, 4]); // energy falls to 1/2^j  (1/2 deliberately excluded)
        const S = c => (Number.isInteger(c) ? `$${c === 1 ? '' : c}RC\\ln 2$` : `$\\tfrac{${c * 2}}{2}RC\\ln 2$`);
        const ans = S(j / 2);
        const wr = [S(j), S(j * 2), S(j / 4 === Math.floor(j / 4) ? j / 4 : j / 4 + 0.25 * 0), `$RC$`, `$${j}RC$`, S(j / 2 + 1)];
        return {
          q: `A capacitor $C$, initially charged, discharges through a resistor $R$ starting at $t = 0$. At what time has the energy stored in the capacitor fallen to $${F.frac(1, 2 ** j)}$ of its initial value?`,
          ...GRE.mc(R, ans, wr.filter(s => !/frac\{\d+\.\d/.test(s) && !/\{0\}/.test(s))),
          level: 3,
          expl: raw`$U = Q^2/2C \propto e^{-2t/RC}$ — the energy decays twice as fast as the charge. $e^{-2t/RC} = 2^{-${j}}$ gives $t = \tfrac{${j}}{2}RC\ln 2$${j % 2 === 0 ? raw` $= ${j / 2 === 1 ? '' : j / 2}RC\ln 2$` : ''}.`,
        };
      },
    },
    {
      id: 'em2.rl.growth', sec: '2.7.4', level: 2,
      gen(R) {
        const e = R.pick([6, 9, 12, 20, 24]), Rr = R.pick([2, 3, 4, 5, 10, 20]), L = R.pick([10, 20, 50, 100, 200, 500]); // mH
        const v = R.pick(['tau', 'rate', 'final', 'atTau', 'sym']);
        const head = raw`An ideal $${e}\,\text{V}$ battery is switched at $t = 0$ into a series circuit with a $${Rr}\,\Omega$ resistor and a $${L}\,\text{mH}$ inductor of negligible resistance.`;
        if (v === 'tau') return {
          q: `${head} What is the time constant of the circuit?`,
          ...GRE.numeric(R, L * 1e-3 / Rr, [L * 1e-3 * Rr, Rr / (L * 1e-3) * 1e-6, L * 1e-3 / Rr * Math.LN2, Math.sqrt(L * 1e-3 / Rr)], { unit: U.s }),
          level: 1,
          expl: raw`$\tau = L/R = ${F.num(L * 1e-3, 3)}/${Rr} = ${vu(L * 1e-3 / Rr, U.s)}$.`,
        };
        if (v === 'rate') return {
          q: `${head} What is the rate of increase of the current immediately after the switch is closed?`,
          ...numMC(R, e / (L * 1e-3), [e / Rr, e * Rr / (L * 1e-3), 0, e / (L * 1e-3 * Rr)], { unit: U.As }),
          level: 2,
          expl: raw`At $t = 0$ the current is zero, so there is no drop across $R$ and the inductor takes the full emf: $L\,dI/dt = \mathcal{E}$, $dI/dt = ${F.num(e / (L * 1e-3), 3)}\,\text{A/s}$.`,
        };
        if (v === 'final') {
          const askV = R.bool();
          return {
            q: `${head} ${askV ? 'What is the magnitude of the voltage across the inductor immediately after the switch is closed?' : 'What current flows a long time after the switch is closed?'}`,
            ...numMC(R, askV ? e : e / Rr, askV ? [0, e / 2, e / Rr, e * (1 - 1 / Math.E)] : [0, e / (L * 1e-3), e * Math.exp(-1) / Rr, e * L * 1e-3 / Rr], { unit: askV ? U.V : U.A, sig: 3 }),
            level: 1,
            expl: askV ? raw`An inductor prevents sudden changes in current: at $t = 0^+$ the current is still zero, so $V_R = 0$ and the full $${e}\,\text{V}$ appears across the inductor.` : raw`Once the current is steady, $L\,dI/dt = 0$: the inductor acts as a plain wire and $I = \mathcal{E}/R = ${F.num(e / Rr, 3)}\,\text{A}$.`,
          };
        }
        if (v === 'atTau') {
          const I = e / Rr * (1 - Math.exp(-1));
          return {
            q: raw`${head} What is the current one time constant after the switch is closed? (Use $e^{-1} \approx 0.37$.)`,
            ...GRE.numeric(R, I, [e / Rr * Math.exp(-1), e / Rr, e / Rr / 2], { unit: U.A, sig: 2 }),
            expl: raw`$I(t) = \dfrac{\mathcal{E}}{R}(1 - e^{-t/\tau})$; at $t = \tau$, $I \approx 0.63\,\mathcal{E}/R = ${F.num(I, 2)}\,\text{A}$.`,
          };
        }
        const askHalf = R.bool();
        return {
          q: askHalf ? 'An ideal battery is switched into a series circuit containing a resistor $R$ and an inductor $L$ at $t = 0$. At what time does the current reach half its final value?' : 'A current $I_0$ flows through an inductor $L$ connected in a loop with a resistor $R$ (the battery having just been removed from the loop at $t = 0$). At what time has the current dropped to $I_0/4$?',
          ...symMC(R, askHalf ? raw`\dfrac{L}{R}\ln 2` : raw`\dfrac{2L}{R}\ln 2`, askHalf ? [raw`\dfrac{R}{L}\ln 2`, raw`RL\ln 2`, raw`\dfrac{L}{2R}`, raw`\dfrac{2L}{R}\ln 2`, raw`\sqrt{LC}\ln 2`.replace('C', 'R')] : [raw`\dfrac{L}{R}\ln 2`, raw`\dfrac{4L}{R}`, raw`\dfrac{R}{L}\ln 4`, raw`\dfrac{L}{4R}`, raw`\dfrac{L}{R}\ln\dfrac{4}{3}`]),
          level: 2,
          expl: askHalf ? raw`$I = \dfrac{\mathcal{E}}{R}(1 - e^{-Rt/L}) = \dfrac{\mathcal{E}}{2R}$ when $e^{-Rt/L} = 1/2$: $t = (L/R)\ln 2$. Only $L/R$ has units of time.` : raw`$I = I_0e^{-Rt/L} = I_0/4$ when $t = (L/R)\ln 4 = (2L/R)\ln 2$.`,
        };
      },
    },
    {
      id: 'em2.lc.osc', sec: '2.7.4', level: 2, weight: 2,
      gen(R) {
        const v = R.pick(['freq', 'freq', 'scale', 'Imax', 'Imaxnum', 'time']);
        if (v === 'freq') {
          const L = R.pick([1, 2, 4, 5, 10, 25, 50, 100]), Cn = R.pick([1, 4, 10, 25, 40, 100, 250, 1000]); // mH, nF
          const w = 1 / Math.sqrt(L * 1e-3 * Cn * 1e-9), f = w / (2 * PI);
          const askW = R.bool(0.3);
          return {
            q: raw`An ideal LC circuit has $L = ${L}\,\text{mH}$ and $C = ${Cn}\,\text{nF}$. What is its ${askW ? 'angular frequency of oscillation' : 'oscillation frequency $f$'}?`,
            ...GRE.numeric(R, askW ? w : f, askW ? [f, 1 / (L * 1e-3 * Cn * 1e-9), w * w * 1e-6, Math.sqrt(L * 1e-3 / (Cn * 1e-9))] : [w, 1 / (2 * PI * L * 1e-3 * Cn * 1e-9), 2 * PI * Math.sqrt(L * 1e-3 * Cn * 1e-9) * 1e9, f * f * 1e-4], { unit: askW ? raw`\text{rad/s}` : U.Hz }),
            expl: raw`$\omega = 1/\sqrt{LC} = 1/\sqrt{(${L}\times10^{-3})(${Cn}\times10^{-9})} = ${F.num(w, 2)}\,\text{rad/s}$${askW ? '' : raw`, and $f = \omega/2\pi = ${vu(f, U.Hz)}$`}. ${askW ? 'Do not divide by $2\\pi$ here.' : 'Forgetting the $2\\pi$ gives $\\omega$ instead of $f$.'}`,
          };
        }
        if (v === 'scale') {
          const fL = R.pick([1, 2, 4, 9, 1 / 4, 1 / 2]), fC = R.pick([1, 2, 4, 9, 1 / 4, 1 / 9]);
          if (fL * fC === 1) throw new Error('same');
          const ans = 1 / Math.sqrt(fL * fC);
          return {
            q: `An LC circuit oscillates at frequency $f_0$. If the inductance is multiplied by $${fac(fL)}$ and the capacitance by $${fac(fC)}$, what is the new frequency?`.replace(/multiplied by \$1\$ and the/, 'left unchanged and the').replace(/and the capacitance by \$1\$/, 'and the capacitance is left unchanged'),
            ...facMC(R, ans, [1 / (fL * fC), Math.sqrt(fL * fC), Math.sqrt(fL / fC), Math.sqrt(fC / fL), fL * fC], { fmt: x => (near(x, 1) ? 'f_0' : fac(x) + 'f_0') }),
            level: 1,
            expl: raw`$f = 1/(2\pi\sqrt{LC})$, so $f \propto (LC)^{-1/2}$: factor $1/\sqrt{${fac(fL * fC)}} = ${fac(ans)}$.`,
          };
        }
        if (v === 'Imax') return {
          q: raw`A capacitor $C$ charged to voltage $V_0$ is connected at $t = 0$ across an inductor $L$ (no resistance). What is the maximum current in the circuit?`,
          ...symMC(R, raw`V_0\sqrt{C/L}`, [raw`V_0\sqrt{L/C}`, raw`V_0/\sqrt{LC}`, raw`V_0C/L`, raw`V_0\sqrt{C/(2L)}`, raw`V_0\sqrt{2C/L}`]),
          expl: raw`Energy sloshes between $C$ and $L$: $\tfrac12CV_0^2 = \tfrac12LI_{\max}^2$, so $I_{\max} = V_0\sqrt{C/L}$. Check units: $\sqrt{L/C}$ is a resistance, so $V_0/\sqrt{L/C}$ is a current.`,
        };
        if (v === 'Imaxnum') {
          const Cu = R.pick([1, 2, 4, 5, 10, 20]), L = R.pick([1, 2, 5, 10, 20, 50]), V0 = R.pick([5, 10, 12, 20, 50]);
          const I = V0 * Math.sqrt(Cu * 1e-6 / (L * 1e-3));
          return {
            q: raw`A $${Cu}\,\mu\text{F}$ capacitor charged to $${V0}\,\text{V}$ is connected to a $${L}\,\text{mH}$ inductor of negligible resistance. What is the maximum current in the resulting oscillations?`,
            ...GRE.numeric(R, I, [V0 * Math.sqrt(L * 1e-3 / (Cu * 1e-6)), V0 * Cu * 1e-6 / (L * 1e-3), I / Math.SQRT2, I * Math.SQRT2], { unit: U.A }),
            expl: raw`$\tfrac12CV_0^2 = \tfrac12LI_{\max}^2 \Rightarrow I_{\max} = V_0\sqrt{C/L} = ${vu(I, U.A)}$.`,
          };
        }
        const t = R.pick([['the current first reach its maximum magnitude', raw`\tfrac{\pi}{2}\sqrt{LC}`], ['the charge on the capacitor first reach $-Q_0$ (the opposite polarity)', raw`\pi\sqrt{LC}`], ['the charge on the capacitor first return to $+Q_0$', raw`2\pi\sqrt{LC}`], ['the energy stored in the inductor first equal the energy stored in the capacitor', raw`\tfrac{\pi}{4}\sqrt{LC}`]]);
        const all = [raw`\tfrac{\pi}{4}\sqrt{LC}`, raw`\tfrac{\pi}{2}\sqrt{LC}`, raw`\pi\sqrt{LC}`, raw`2\pi\sqrt{LC}`, raw`\sqrt{LC}`, raw`4\pi\sqrt{LC}`];
        return {
          q: `In an ideal LC circuit, the capacitor has charge $Q_0$ and the current is zero at $t = 0$. At what time does ${t[0]}?`,
          ...GRE.mc(R, `$${t[1]}$`, all.filter(x => x !== t[1]).map(x => `$${x}$`)),
          level: 3,
          expl: raw`$Q = Q_0\cos\omega t$ and $I = -Q_0\omega\sin\omega t$ with $\omega = 1/\sqrt{LC}$, period $T = 2\pi\sqrt{LC}$. The current peaks at $T/4$, the charge reverses at $T/2$, returns at $T$, and the energies are equal when $\cos^2\omega t = \tfrac12$, first at $T/8$. Answer: $${t[1]}$.`,
        };
      },
    },
    {
      id: 'em2.rlc.damping', sec: '2.7.4', level: 3,
      gen(R) {
        const v = R.pick(['classify', 'classify', 'Rc', 'envelope', 'resonance', 'analogy']);
        if (v === 'classify' || v === 'Rc') {
          const [L, Cu] = R.pick([[1, 10], [4, 10], [9, 10], [16, 10], [25, 10], [10, 1], [1, 40], [10, 4], [10, 25], [5, 2]]); // mH, uF: 2*sqrt(L/C) is a whole number of ohms
          const Rc = 2 * Math.sqrt(L * 1e-3 / (Cu * 1e-6));
          if (v === 'Rc') return {
            q: raw`A series RLC circuit has $L = ${L}\,\text{mH}$ and $C = ${Cu}\,\mu\text{F}$. For what resistance is the circuit critically damped?`,
            ...GRE.numeric(R, Rc, [Rc / 2, Math.sqrt(Cu * 1e-6 / (L * 1e-3)) * 2, Rc * Rc / 4, 1 / Math.sqrt(L * 1e-3 * Cu * 1e-6)], { unit: U.ohm, sig: 3 }),
            expl: raw`$L\ddot{q} + R\dot{q} + q/C = 0$ has characteristic roots $-\tfrac{R}{2L} \pm \sqrt{\tfrac{R^2}{4L^2} - \tfrac{1}{LC}}$. Critical damping: $R = 2\sqrt{L/C} = ${F.num(Rc, 3)}\,\Omega$.`,
          };
          const kind = R.pick(['under', 'over', 'crit', 'under']);
          const Rr = kind === 'crit' ? Rc : kind === 'under' ? Rc * R.pick([0.1, 0.2, 0.25, 0.5]) : Rc * R.pick([2, 4, 5, 10]);
          const CH = ['Underdamped: it oscillates with decaying amplitude', 'Critically damped: it returns to zero as fast as possible without oscillating', 'Overdamped: it decays without oscillating, more slowly than the critical case', 'Undamped: it oscillates with constant amplitude', 'Unstable: the oscillation amplitude grows'];
          const ans = CH[kind === 'under' ? 0 : kind === 'crit' ? 1 : 2];
          return {
            q: raw`A series circuit contains $R = ${F.num(Rr, 3)}\,\Omega$, $L = ${L}\,\text{mH}$, and $C = ${Cu}\,\mu\text{F}$. The capacitor is charged and the circuit is then closed. How does the charge on the capacitor behave?`,
            ...GRE.mc(R, ans, CH.filter(c => c !== ans)),
            expl: raw`Compare $R$ with $2\sqrt{L/C} = ${F.num(Rc, 3)}\,\Omega$ (the analogue of $b = 2\sqrt{km}$ for a damped spring). Here $R ${kind === 'under' ? '<' : kind === 'over' ? '>' : '='} 2\sqrt{L/C}$, so the circuit is ${kind === 'under' ? 'underdamped' : kind === 'over' ? 'overdamped' : 'critically damped'}.`,
          };
        }
        if (v === 'envelope') {
          const askE = R.bool();
          return {
            q: `A series RLC circuit is lightly underdamped. On what time scale does the ${askE ? 'energy stored in the circuit' : 'amplitude of the charge oscillations'} decay by a factor of $e$?`,
            ...symMC(R, askE ? raw`L/R` : raw`2L/R`, askE ? [raw`2L/R`, raw`L/(2R)`, 'RC', raw`\sqrt{LC}`, raw`R/L`] : [raw`L/R`, raw`L/(2R)`, 'RC', raw`\sqrt{LC}`, raw`2R/L`]),
            expl: raw`$q(t) = q_0e^{-Rt/2L}\cos(\omega_dt + \phi)$, so the amplitude decays with time constant $2L/R$ and the energy ($\propto q^2$) with $L/R$.`,
          };
        }
        if (v === 'resonance') {
          const ask = R.pick(['freq', 'Z', 'I']);
          const L = R.pick([10, 20, 50, 100]), Cu = R.pick([1, 2, 5, 10]), Rr = R.pick([5, 10, 20, 50]), V0 = R.pick([5, 10, 20]);
          const w0 = 1 / Math.sqrt(L * 1e-3 * Cu * 1e-6);
          if (ask === 'freq') return {
            q: raw`A series RLC circuit with $R = ${Rr}\,\Omega$, $L = ${L}\,\text{mH}$, and $C = ${Cu}\,\mu\text{F}$ is driven by a sinusoidal source of fixed amplitude. At what angular frequency is the current amplitude largest?`,
            ...GRE.numeric(R, w0, [w0 / (2 * PI), Math.sqrt(Math.max(w0 * w0 - (Rr / (2 * L * 1e-3)) ** 2, 1)) === w0 ? w0 * 1.5 : Rr / (L * 1e-3), 1 / (Rr * Cu * 1e-6), w0 * w0 * 1e-4], { unit: raw`\text{rad/s}`, sig: 3 }),
            expl: raw`The current amplitude is $V_0/\sqrt{R^2 + (\omega L - 1/\omega C)^2}$, largest when the reactances cancel: $\omega_0 = 1/\sqrt{LC} = ${F.num(w0, 3)}\,\text{rad/s}$, independent of $R$.`,
          };
          return {
            q: raw`A series RLC circuit with $R = ${Rr}\,\Omega$, $L = ${L}\,\text{mH}$, and $C = ${Cu}\,\mu\text{F}$ is driven at its resonant frequency by a source of amplitude $${V0}\,\text{V}$. What is the ${ask === 'Z' ? 'magnitude of the impedance' : 'current amplitude'}?`,
            ...numMC(R, ask === 'Z' ? Rr : V0 / Rr, ask === 'Z' ? [0, Rr + w0 * L * 1e-3, 2 * w0 * L * 1e-3, Math.hypot(Rr, w0 * L * 1e-3)] : [0, V0 / (Rr + w0 * L * 1e-3), V0 / Math.hypot(Rr, w0 * L * 1e-3), V0 / Rr / Math.SQRT2], { unit: ask === 'Z' ? U.ohm : U.A, sig: 3 }),
            level: 2,
            expl: raw`At resonance $\omega L = 1/(\omega C)$, so the reactances cancel and $Z = R = ${Rr}\,\Omega$${ask === 'I' ? raw`; $I_0 = V_0/R = ${F.num(V0 / Rr, 3)}\,\text{A}$` : ''}.`,
          };
        }
        const map = [['inductance $L$', 'mass $m$'], ['resistance $R$', 'damping coefficient $b$'], ['inverse capacitance $1/C$', 'spring constant $k$'], ['charge $q$', 'displacement $x$'], ['current $I$', 'velocity $v$'], ['emf of a driving source', 'driving force']];
        const [e, m] = R.pick(map);
        const wrongs = map.map(x => x[1]).filter(x => x !== m).concat(['capacitance $C$'.replace('capacitance $C$', 'inverse mass $1/m$')]);
        return {
          q: `The equation of a series RLC circuit, $L\\ddot{q} + R\\dot{q} + q/C = \\mathcal{E}(t)$, has the same form as that of a damped, driven mass on a spring, $m\\ddot{x} + b\\dot{x} + kx = F(t)$. In this analogy, the ${e} corresponds to the`,
          ...GRE.mc(R, m, wrongs),
          level: 1,
          expl: raw`Match terms: $L \leftrightarrow m$, $R \leftrightarrow b$, $1/C \leftrightarrow k$, $q \leftrightarrow x$, $I = \dot{q} \leftrightarrow v$, $\mathcal{E} \leftrightarrow F$. So the ${e} ↔ ${m}. (Hence $\omega_0 = 1/\sqrt{LC} \leftrightarrow \sqrt{k/m}$.)`,
        };
      },
    },
    {
      id: 'em2.circuit.transient', sec: '2.7.4', level: 2, weight: 2,
      gen(R) {
        const isC = R.bool();
        const withR3 = R.bool(0.4);
        const e = R.pick([6, 9, 12, 18, 24, 30]), r1 = R.pick([2, 3, 4, 5, 6, 10]), r2 = R.pick([2, 3, 4, 6, 10, 12]), r3 = R.pick([2, 3, 4, 6, 12]);
        const late = R.bool();
        const ask = R.pick(['batt', 'batt', 'r2']);
        const par = (a, b) => a * b / (a + b);
        // effective branch: C acts as short at 0+, open at infinity; L the opposite
        const shorted = isC ? !late : late;
        let Ib, I2;
        if (shorted) {
          if (withR3) { Ib = e / (r1 + par(r2, r3)); I2 = Ib * r3 / (r2 + r3); }
          else { Ib = e / r1; I2 = 0; }
        } else { Ib = e / (r1 + r2); I2 = Ib; }
        const ans = ask === 'batt' ? Ib : I2;
        const cand = [e / r1, e / (r1 + r2), withR3 ? e / (r1 + par(r2, r3)) : 0, 0, e / r2, e / (r1 + r2 + (withR3 ? r3 : 0)), e / (2 * r1), e / (r1 + 2 * r2), e / (r1 + par(r1, r2))];
        const elem = isC ? 'an initially uncharged capacitor $C$' : 'an inductor $L$ (negligible resistance)';
        const body = el('B', 30, 60, 30, 100, 'ε', 'l') + ln(30, 20, 30, 60) + ln(30, 100, 30, 140) + el('S', 30, 20, 80, 20) + el('R', 80, 20, 160, 20, 'R₁') + ln(160, 20, 290, 20) + ln(30, 140, 290, 140) +
          el('R', 190, 20, 190, 140, 'R₂') + (withR3 ? el(isC ? 'C' : 'L', 290, 20, 290, 80, isC ? 'C' : 'L') + el('R', 290, 80, 290, 140, 'R₃') : el(isC ? 'C' : 'L', 290, 20, 290, 140, isC ? 'C' : 'L')) + dot(190, 20) + dot(190, 140) + tx(40, 55, '+', 'start') + tx(55, 10, 'S');
        return {
          q: raw`In the circuit shown, an ideal battery $\mathcal{E} = ${e}\,\text{V}$, a switch S, and $R_1 = ${r1}\,\Omega$ are in series with a parallel combination of two branches: one is $R_2 = ${r2}\,\Omega$, the other is ${elem}${withR3 ? ` in series with $R_3 = ${r3}\\,\\Omega$` : ''}. The switch is closed at $t = 0$. What is the current through ${ask === 'batt' ? 'the battery' : '$R_2$'} ${late ? 'a long time after' : 'immediately after'} the switch is closed?`,
          ...numMC(R, ans, cand, { unit: U.A, sig: 3, tol: 0.05 }),
          fig: svg(340, 175, '<g transform="translate(0 12)">' + body + '</g>'),
          expl: raw`${isC ? 'An uncharged capacitor has no voltage across it at first (it acts like a wire) and passes no current once charged (an open circuit).' : 'An inductor keeps its current at first (zero, so it acts like an open circuit) and has no voltage across it in steady state (a wire).'} ${late ? 'Long after' : 'Just after'} closing, the ${isC ? 'capacitor' : 'inductor'} branch is ${shorted ? (withR3 ? 'just $R_3$, in parallel with $R_2$' : 'a short across $R_2$') : 'open'}, so $I_{\text{batt}} = ${F.num(Ib, 3)}\,\text{A}$ and $I_{R_2} = ${F.num(I2, 3)}\,\text{A}$.`,
        };
      },
    },
  ]);
})(typeof window !== 'undefined' ? window.GRE : this.GRE);
