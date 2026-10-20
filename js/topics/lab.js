/* Laboratory Methods — Chapter 7 of Conquering the Physics GRE.
 * Templates follow the conventions in tools/AUTHORING.md.
 */
(function (GRE) {
  'use strict';
  const F = GRE.fmt;
  const raw = String.raw;
  const PI = Math.PI;

  // ================================================================ helpers
  const ROMAN_N = ['I', 'II', 'III'];
  const lcm = (a, b) => a / F.gcd(a, b) * b;
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

  // value with an SI prefix; u is the TeX base unit, e.g. '\\Omega' or '\\text{F}'
  const PRE = [[1e12, 'T'], [1e9, 'G'], [1e6, 'M'], [1e3, 'k'], [1, ''], [1e-3, 'm'], [1e-6, 'u'], [1e-9, 'n'], [1e-12, 'p'], [1e-15, 'f']];
  function si(x, u, sig = 3) {
    const ax = Math.abs(x);
    const p = PRE.find(([f]) => ax >= f * 0.99999) || PRE[PRE.length - 1];
    const pre = p[1] === '' ? '' : p[1] === 'u' ? '\\mu ' : `\\text{${p[1]}}`;
    return `${F.num(x / p[0], sig)}\\,${pre}${u}`;
  }

  // Ordered numerical choices built only from explicit candidates (zero and negative values allowed).
  // fmt(x) must return the full choice string including $…$.
  function mcVals(R, correct, wrongs, fmt, tol = 0.08) {
    const vals = [correct], strs = [fmt(correct)];
    const close = (a, b) => Math.abs(a - b) <= tol * Math.max(Math.abs(a), Math.abs(b));
    for (const w of wrongs) {
      if (w == null || !isFinite(w)) continue;
      if (vals.some(v => close(v, w))) continue;
      const s = fmt(w);
      if (strs.indexOf(s) >= 0) continue;
      vals.push(w); strs.push(s);
    }
    if (vals.length < 5) throw new Error('mcVals: need 4 distinct distractors');
    const val = new Map(strs.map((s, i) => [s, vals[i]]));
    return GRE.mc(R, strs[0], strs.slice(1), { rank: s => val.get(s) });
  }

  // fraction n/d as an inline-math choice: "$\frac{3}{2}$", "$-2$"
  const fr = (n, d = 1) => `$${F.frac(n, d)}$`;
  const frVal = s => { const m = s.match(/(-?)\\frac\{(\d+)\}\{(\d+)\}/); if (m) return (m[1] ? -1 : 1) * m[2] / m[3]; return parseFloat(s.replace(/\$/g, '')); };

  // Roman-numeral question from pools of true/false statements
  function romanFrom(R, intro, TRUE, FALSE) {
    const nT = R.int(1, 3);
    const st = R.shuffle(R.pickN(TRUE, nT).map(s => [s, true]).concat(R.pickN(FALSE, 3 - nT).map(s => [s, false])));
    return {
      q: GRE.romanStem(intro, st.map(x => x[0])),
      ...GRE.roman(R, st.map(x => x[1])),
      tags: st.map((x, i) => `${ROMAN_N[i]} is ${x[1] ? 'true' : 'false'}.`).join(' '),
    };
  }

  // --------------------------------------------------------------- small SVG plot of a straight line
  // o: {xr, yr: plotted ranges; xt, yt: [[pos, label]]; seg: [[x1,y1],[x2,y2]] plotted coords; pts; xl, yl axis labels}
  function plotFig(o) {
    const x0 = 56, y0 = 10, w = 240, h = 150;
    const X = v => +(x0 + (v - o.xr[0]) / (o.xr[1] - o.xr[0]) * w).toFixed(1);
    const Y = v => +(y0 + h - (v - o.yr[0]) / (o.yr[1] - o.yr[0]) * h).toFixed(1);
    let s = `<svg viewBox="0 0 320 200" width="320" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" font-family="sans-serif" font-size="10">`;
    s += `<rect x="${x0}" y="${y0}" width="${w}" height="${h}" stroke-width="1.2"/>`;
    for (const [v, lab] of o.xt) {
      s += `<line x1="${X(v)}" y1="${y0}" x2="${X(v)}" y2="${y0 + h}" stroke-width="0.4" stroke-dasharray="2 3"/>`;
      s += `<text x="${X(v)}" y="${y0 + h + 13}" text-anchor="middle" fill="currentColor" stroke="none">${lab}</text>`;
    }
    for (const [v, lab] of o.yt) {
      s += `<line x1="${x0}" y1="${Y(v)}" x2="${x0 + w}" y2="${Y(v)}" stroke-width="0.4" stroke-dasharray="2 3"/>`;
      s += `<text x="${x0 - 4}" y="${Y(v) + 3}" text-anchor="end" fill="currentColor" stroke="none">${lab}</text>`;
    }
    s += `<line x1="${X(o.seg[0][0])}" y1="${Y(o.seg[0][1])}" x2="${X(o.seg[1][0])}" y2="${Y(o.seg[1][1])}" stroke-width="1.8"/>`;
    for (const [px, py] of o.pts) s += `<circle cx="${X(px)}" cy="${Y(py)}" r="3" fill="currentColor"/>`;
    s += `<text x="${x0 + w / 2}" y="${y0 + h + 30}" text-anchor="middle" fill="currentColor" stroke="none">${o.xl}</text>`;
    s += `<text x="12" y="${y0 + h / 2}" text-anchor="middle" fill="currentColor" stroke="none" transform="rotate(-90 12 ${y0 + h / 2})">${o.yl}</text>`;
    return s + '</svg>';
  }
  const pow10 = k => `10<tspan dy="-4" font-size="7">${k}</tspan>`;
  // clip the infinite line through p1, p2 to the box [xr]×[yr]
  function clipSeg(p1, p2, xr, yr) {
    const m = (p2[1] - p1[1]) / (p2[0] - p1[0]);
    const yAt = x => p1[1] + m * (x - p1[0]), xAt = y => p1[0] + (y - p1[1]) / m;
    const pts = [];
    for (const x of xr) { const y = yAt(x); if (y >= yr[0] - 1e-9 && y <= yr[1] + 1e-9) pts.push([x, y]); }
    if (m !== 0) for (const y of yr) { const x = xAt(y); if (x > xr[0] && x < xr[1]) pts.push([x, y]); }
    pts.sort((a, b) => a[0] - b[0]);
    return [pts[0], pts[pts.length - 1]];
  }

  // ================================================================ 7.1.1 dimensional analysis data
  // straight-line plots: slope s (inverse inv when axes are swapped); o: distractors with dimensions different from both
  const SLOPES = [
    { y: raw`the stopping potential $V_s$ (in volts) of photoelectrons`, x: raw`the frequency $f$ (in hertz) of the incident light`, ys: 'V_s', xs: 'f', s: raw`\dfrac{h}{e}`, inv: raw`\dfrac{e}{h}`, o: [raw`\dfrac{hc}{e}`, 'he', raw`\dfrac{h}{ec}`, raw`\dfrac{h}{e^2}`, raw`\dfrac{e^2}{h}`], def: raw`$h$ is Planck’s constant, $e$ the elementary charge, $c$ the speed of light`, rel: raw`$eV_s = hf - \phi$` },
    { y: raw`the photon energy $E$ (in joules) of spectral lines`, x: raw`the reciprocal wavelength $1/\lambda$ (in $\text{m}^{-1}$)`, ys: 'E', xs: raw`1/\lambda`, s: 'hc', inv: raw`\dfrac{1}{hc}`, o: [raw`\dfrac{h}{c}`, 'hc^2', 'h', raw`\dfrac{c}{h}`], def: raw`$h$ is Planck’s constant and $c$ the speed of light`, rel: raw`$E = hc/\lambda$` },
    { y: raw`the de Broglie wavelength $\lambda$ (in meters) of electrons`, x: raw`the reciprocal of their momentum, $1/p$ (in $\text{s}/(\text{kg}\cdot\text{m})$)`, ys: raw`\lambda`, xs: '1/p', s: 'h', inv: raw`\dfrac{1}{h}`, o: [raw`\dfrac{h}{c}`, 'hc', raw`\dfrac{h}{m_e}`, raw`\dfrac{m_e c}{h}`], def: raw`$h$ is Planck’s constant, $c$ the speed of light, $m_e$ the electron mass`, rel: raw`$\lambda = h/p$` },
    { y: raw`the square of the period, $T^2$ (in $\text{s}^2$), of a simple pendulum`, x: raw`the pendulum length $L$ (in meters)`, ys: 'T^2', xs: 'L', s: raw`\dfrac{4\pi^2}{g}`, inv: raw`\dfrac{g}{4\pi^2}`, o: [raw`\dfrac{2\pi}{\sqrt{g}}`, raw`\dfrac{4\pi^2}{g^2}`, raw`2\pi\sqrt{g}`, raw`4\pi^2 g^2`], def: raw`$g$ is the free-fall acceleration`, rel: raw`$T = 2\pi\sqrt{L/g}$, i.e. $T^2 = (4\pi^2/g)L$` },
    { y: raw`the square of the orbital period, $T^2$ (in $\text{s}^2$), of satellites in circular orbits about a planet of mass $M$`, x: raw`the cube of the orbital radius, $r^3$ (in $\text{m}^3$)`, ys: 'T^2', xs: 'r^3', s: raw`\dfrac{4\pi^2}{GM}`, inv: raw`\dfrac{GM}{4\pi^2}`, o: [raw`\dfrac{4\pi^2}{G}`, raw`\dfrac{4\pi^2}{GM^2}`, raw`\dfrac{2\pi}{\sqrt{GM}}`, raw`\dfrac{4\pi^2 M}{G}`], def: raw`$G$ is the gravitational constant`, rel: raw`Kepler’s third law, $T^2 = (4\pi^2/GM)\,r^3$` },
    { y: raw`the pressure $P$ (in pascals) of a dilute gas of $N$ molecules held in a fixed volume $V$`, x: raw`the absolute temperature $T$ (in kelvins)`, ys: 'P', xs: 'T', s: raw`\dfrac{Nk_B}{V}`, inv: raw`\dfrac{V}{Nk_B}`, o: ['Nk_BV', 'Nk_B', raw`\dfrac{Nk_B}{V^2}`, raw`\dfrac{N}{k_BV}`], def: raw`$k_B$ is Boltzmann’s constant`, rel: raw`$PV = Nk_BT$` },
    { y: raw`the capacitance $C$ (in farads) of a set of air-filled parallel-plate capacitors`, x: raw`the ratio $A/d$ (in meters) of plate area to plate separation`, ys: 'C', xs: 'A/d', s: raw`\varepsilon_0`, inv: raw`\dfrac{1}{\varepsilon_0}`, o: [raw`\mu_0`, raw`\varepsilon_0 c`, raw`\dfrac{1}{\mu_0}`, raw`\dfrac{\varepsilon_0}{c}`], def: raw`$\varepsilon_0$ and $\mu_0$ are the permittivity and permeability of free space and $c$ is the speed of light`, rel: raw`$C = \varepsilon_0 A/d$` },
    { y: raw`the magnetic field $B$ (in teslas) inside a long solenoid with $n$ turns per unit length`, x: raw`the current $I$ (in amperes) in the windings`, ys: 'B', xs: 'I', s: raw`\mu_0 n`, inv: raw`\dfrac{1}{\mu_0 n}`, o: [raw`\dfrac{\mu_0}{n}`, raw`\mu_0 n^2`, raw`\varepsilon_0 n`, raw`\dfrac{n}{\mu_0}`], def: raw`$\mu_0$ and $\varepsilon_0$ are the permeability and permittivity of free space`, rel: raw`$B = \mu_0 nI$` },
    { y: raw`the resistance $R$ (in ohms) of wires of resistivity $\rho$ and cross-sectional area $A$`, x: raw`the wire length $L$ (in meters)`, ys: 'R', xs: 'L', s: raw`\dfrac{\rho}{A}`, inv: raw`\dfrac{A}{\rho}`, o: [raw`\rho A`, raw`\rho`, raw`\dfrac{\rho}{A^2}`, raw`\dfrac{A^2}{\rho}`], def: 'all wires are made of the same material and have the same cross section', rel: raw`$R = \rho L/A$` },
    { y: raw`the energy density $u$ (in $\text{J/m}^3$) of the radiation inside a blackbody cavity`, x: raw`the fourth power of the cavity temperature, $T^4$ (in $\text{K}^4$)`, ys: 'u', xs: 'T^4', s: raw`\dfrac{4\sigma}{c}`, inv: raw`\dfrac{c}{4\sigma}`, o: [raw`\sigma`, raw`4\sigma c`, raw`\dfrac{\sigma}{c^2}`, raw`\dfrac{c^2}{\sigma}`], def: raw`$\sigma$ is the Stefan–Boltzmann constant and $c$ the speed of light`, rel: raw`$u = (4\sigma/c)T^4$ (the emitted flux is $\sigma T^4 = uc/4$)` },
    { y: raw`the angular frequency $\omega$ (in rad/s) of ions of charge $q$ and mass $m$ circulating in a uniform magnetic field`, x: raw`the magnetic field strength $B$ (in teslas)`, ys: raw`\omega`, xs: 'B', s: raw`\dfrac{q}{m}`, inv: raw`\dfrac{m}{q}`, o: ['qm', raw`\dfrac{q}{m^2}`, raw`\dfrac{q}{mc}`, raw`\dfrac{qc}{m}`], def: raw`$c$ is the speed of light`, rel: raw`the cyclotron relation $\omega = qB/m$` },
    { y: raw`the electrostatic force $F$ (in newtons) between two small charged spheres`, x: raw`the quantity $q_1q_2/r^2$ (in $\text{C}^2/\text{m}^2$)`, ys: 'F', xs: 'q_1q_2/r^2', s: raw`\dfrac{1}{4\pi\varepsilon_0}`, inv: raw`4\pi\varepsilon_0`, o: [raw`\dfrac{\mu_0}{4\pi}`, raw`\dfrac{1}{4\pi\varepsilon_0 c}`, raw`\dfrac{e^2}{4\pi\varepsilon_0}`, raw`4\pi\varepsilon_0 c^2`], def: raw`$\varepsilon_0$ and $\mu_0$ are the permittivity and permeability of free space, $c$ the speed of light, $e$ the elementary charge`, rel: raw`Coulomb’s law, $F = q_1q_2/(4\pi\varepsilon_0 r^2)$` },
    { y: raw`the magnetic force per unit length, $F/\ell$ (in N/m), between two long parallel wires`, x: raw`the quantity $I_1I_2/d$ (in $\text{A}^2/\text{m}$)`, ys: raw`F/\ell`, xs: 'I_1I_2/d', s: raw`\dfrac{\mu_0}{2\pi}`, inv: raw`\dfrac{2\pi}{\mu_0}`, o: [raw`\dfrac{\varepsilon_0}{2\pi}`, raw`\dfrac{1}{2\pi\varepsilon_0}`, raw`\dfrac{\mu_0 c}{2\pi}`, raw`\dfrac{\mu_0}{2\pi c^2}`], def: raw`$\mu_0$ and $\varepsilon_0$ are the permeability and permittivity of free space and $c$ is the speed of light`, rel: raw`$F/\ell = \mu_0 I_1I_2/(2\pi d)$` },
    { y: raw`the square of the wave speed, $v^2$ (in $\text{m}^2/\text{s}^2$), on a string of linear mass density $\mu$`, x: raw`the string tension $F_T$ (in newtons)`, ys: 'v^2', xs: 'F_T', s: raw`\dfrac{1}{\mu}`, inv: raw`\mu`, o: [raw`\mu^2`, raw`\dfrac{1}{\mu^2}`, raw`\sqrt{\mu}`, raw`\dfrac{1}{\sqrt{\mu}}`], def: 'the same string is used throughout', rel: raw`$v = \sqrt{F_T/\mu}$` },
    { y: raw`the quantity $\ln(V/V_0)$ for a capacitor $C$ discharging through a resistor $R$ from initial voltage $V_0$`, x: raw`the time $t$ (in seconds)`, ys: raw`\ln(V/V_0)`, xs: 't', s: raw`-\dfrac{1}{RC}`, inv: '-RC', o: [raw`-\dfrac{R}{C}`, raw`-\dfrac{C}{R}`, '-RC^2', raw`-\dfrac{1}{R^2C}`], def: 'the circuit is a simple series loop', rel: raw`$V = V_0e^{-t/RC}$` },
    { y: raw`the square of the total energy, $E^2$, of particles of mass $m$`, x: raw`the square of their momentum, $p^2$`, ys: 'E^2', xs: 'p^2', s: 'c^2', inv: raw`\dfrac{1}{c^2}`, o: ['c', raw`\dfrac{1}{c}`, 'mc^2', 'm^2c^4'], def: raw`$c$ is the speed of light; SI units are used for both axes`, rel: raw`$E^2 = p^2c^2 + m^2c^4$` },
    { y: raw`$1/\omega^2$, where $\omega$ is the resonant angular frequency of an LC circuit with a fixed inductor $L$`, x: raw`the capacitance $C$ (in farads)`, ys: raw`1/\omega^2`, xs: 'C', s: 'L', inv: raw`\dfrac{1}{L}`, o: [raw`\sqrt{L}`, 'L^2', raw`\dfrac{1}{\sqrt{L}}`, raw`\dfrac{1}{L^2}`], def: 'the capacitor is varied', rel: raw`$\omega^2 = 1/(LC)$` },
  ];

  // dimension categories and combinations of constants / quantities
  const CAT = {
    len: 'length', time: 'time', mass: 'mass', en: 'energy', spd: 'speed', dl: 'none (the combination is dimensionless)', res: 'electrical resistance',
    mom: 'momentum', freq: 'inverse time (frequency)', temp: 'temperature', chg: 'electric charge', angm: 'angular momentum', flux: 'magnetic flux',
    volt: 'electric potential', mmom: 'magnetic dipole moment', ef: 'electric field', bf: 'magnetic field', pres: 'pressure (energy per unit volume)',
    pow: 'power', inten: 'power per unit area', acc: 'acceleration', cur: 'electric current',
  };
  const SYM = {
    hbar: raw`$\hbar$ is the reduced Planck constant`, h: raw`$h$ is Planck’s constant`, c: raw`$c$ is the speed of light`, G: raw`$G$ is the gravitational constant`,
    e: raw`$e$ is the elementary charge`, eps: raw`$\varepsilon_0$ is the permittivity of free space`, mu0: raw`$\mu_0$ is the permeability of free space`,
    kB: raw`$k_B$ is Boltzmann’s constant`, me: raw`$m_e$ is the electron mass`, sig: raw`$\sigma$ is the Stefan–Boltzmann constant`,
    R: '$R$ is a resistance', C: '$C$ is a capacitance', L: '$L$ is an inductance', I: '$I$ is a current', V: '$V$ is a potential difference',
    q: '$q$ is a charge', B: '$B$ is a magnetic field magnitude', E: '$E$ is an electric field magnitude', m: '$m$ is a mass', T: '$T$ is a temperature',
    w: raw`$\omega$ is an angular frequency`, Phi: raw`$\Phi_B$ is a magnetic flux`, r: '$r$ is a distance', p: '$p$ is a momentum', M: '$M$ is a mass',
    v: '$v$ is a speed', Ft: raw`$F_T$ is a tension force`, lmu: raw`$\mu$ is a mass per unit length`, n: '$n$ is a number density (particles per unit volume)',
    U: '$U$ is an energy', P: '$P$ is a power', t: '$t$ is a time', md: '$m$ is a magnetic dipole moment',
  };
  // [TeX, category, symbols used, fundamental-constants-only?]
  const COMBOS = [
    [raw`\dfrac{\hbar}{m_e c}`, 'len', ['hbar', 'me', 'c'], 1],
    [raw`\sqrt{\dfrac{\hbar G}{c^3}}`, 'len', ['hbar', 'G', 'c'], 1],
    [raw`\dfrac{e^2}{4\pi\varepsilon_0 m_e c^2}`, 'len', ['e', 'eps', 'me', 'c'], 1],
    [raw`\dfrac{4\pi\varepsilon_0\hbar^2}{m_e e^2}`, 'len', ['eps', 'hbar', 'me', 'e'], 1],
    [raw`\sqrt{\dfrac{\hbar G}{c^5}}`, 'time', ['hbar', 'G', 'c'], 1],
    [raw`\dfrac{\hbar}{m_e c^2}`, 'time', ['hbar', 'me', 'c'], 1],
    [raw`\sqrt{\dfrac{\hbar c}{G}}`, 'mass', ['hbar', 'c', 'G'], 1],
    [raw`m_e c^2`, 'en', ['me', 'c'], 1],
    [raw`\sqrt{\dfrac{\hbar c^5}{G}}`, 'en', ['hbar', 'c', 'G'], 1],
    [raw`\dfrac{m_e e^4}{(4\pi\varepsilon_0)^2\hbar^2}`, 'en', ['me', 'e', 'eps', 'hbar'], 1],
    [raw`\dfrac{1}{\sqrt{\mu_0\varepsilon_0}}`, 'spd', ['mu0', 'eps'], 1],
    [raw`\dfrac{e^2}{4\pi\varepsilon_0\hbar}`, 'spd', ['e', 'eps', 'hbar'], 1],
    [raw`\dfrac{e^2}{4\pi\varepsilon_0\hbar c}`, 'dl', ['e', 'eps', 'hbar', 'c'], 1],
    [raw`\mu_0\varepsilon_0 c^2`, 'dl', ['mu0', 'eps', 'c'], 1],
    [raw`\dfrac{\mu_0 c\,e^2}{h}`, 'dl', ['mu0', 'c', 'e', 'h'], 1],
    [raw`\sqrt{\dfrac{\mu_0}{\varepsilon_0}}`, 'res', ['mu0', 'eps'], 1],
    [raw`\dfrac{h}{e^2}`, 'res', ['h', 'e'], 1],
    [raw`\mu_0 c`, 'res', ['mu0', 'c'], 1],
    [raw`\dfrac{1}{\varepsilon_0 c}`, 'res', ['eps', 'c'], 1],
    [raw`m_e c`, 'mom', ['me', 'c'], 1],
    [raw`\dfrac{m_e c^2}{\hbar}`, 'freq', ['me', 'c', 'hbar'], 1],
    [raw`\sqrt{\dfrac{c^5}{\hbar G}}`, 'freq', ['c', 'hbar', 'G'], 1],
    [raw`\dfrac{m_e c^2}{k_B}`, 'temp', ['me', 'c', 'kB'], 1],
    [raw`\sqrt{4\pi\varepsilon_0\hbar c}`, 'chg', ['eps', 'hbar', 'c'], 1],
    [raw`\dfrac{e^2}{4\pi\varepsilon_0 c}`, 'angm', ['e', 'eps', 'c'], 1],
    [raw`\dfrac{h}{e}`, 'flux', ['h', 'e'], 1],
    [raw`\dfrac{m_e c^2}{e}`, 'volt', ['me', 'c', 'e'], 1],
    [raw`\dfrac{e\hbar}{2m_e}`, 'mmom', ['e', 'hbar', 'me'], 1],
    [raw`\dfrac{m_e^2c^3}{e\hbar}`, 'ef', ['me', 'c', 'e', 'hbar'], 1],
    [raw`\dfrac{m_e^2c^2}{e\hbar}`, 'bf', ['me', 'c', 'e', 'hbar'], 1],
    ['RC', 'time', ['R', 'C']],
    ['L/R', 'time', ['L', 'R']],
    [raw`\sqrt{LC}`, 'time', ['L', 'C']],
    [raw`\sqrt{L/C}`, 'res', ['L', 'C']],
    [raw`\dfrac{1}{\sqrt{LC}}`, 'freq', ['L', 'C']],
    [raw`\dfrac{qB}{m}`, 'freq', ['q', 'B', 'm']],
    ['E/B', 'spd', ['E', 'B']],
    [raw`\varepsilon_0 E^2`, 'pres', ['eps', 'E']],
    [raw`\dfrac{B^2}{\mu_0}`, 'pres', ['B', 'mu0']],
    ['LI^2', 'en', ['L', 'I']],
    ['CV^2', 'en', ['C', 'V']],
    [raw`\Phi_B I`, 'en', ['Phi', 'I']],
    [raw`\dfrac{V^2}{R}`, 'pow', ['V', 'R']],
    [raw`\sqrt{\dfrac{k_BT}{m}}`, 'spd', ['kB', 'T', 'm']],
    [raw`\dfrac{k_BT}{h}`, 'freq', ['kB', 'T', 'h']],
    [raw`\dfrac{hc}{k_BT}`, 'len', ['h', 'c', 'kB', 'T']],
    [raw`\sigma T^4`, 'inten', ['sig', 'T']],
    [raw`\dfrac{\mu_0 I}{r}`, 'bf', ['mu0', 'I', 'r']],
    ['cB', 'ef', ['c', 'B']],
    [raw`\omega L`, 'res', ['w', 'L']],
    [raw`\dfrac{1}{\omega C}`, 'res', ['w', 'C']],
    [raw`\omega RC`, 'dl', ['w', 'R', 'C']],
    ['qBr', 'mom', ['q', 'B', 'r']],
    [raw`\dfrac{\hbar}{p}`, 'len', ['hbar', 'p']],
    [raw`\dfrac{GM}{r^2}`, 'acc', ['G', 'M', 'r']],
    [raw`\dfrac{v^2}{r}`, 'acc', ['v', 'r']],
    [raw`\dfrac{p^2}{m}`, 'en', ['p', 'm']],
    [raw`\sqrt{F_T/\mu}`, 'spd', ['Ft', 'lmu']],
    [raw`\dfrac{q}{4\pi\varepsilon_0 r}`, 'volt', ['q', 'eps', 'r']],
    [raw`\dfrac{q}{4\pi\varepsilon_0 r^2}`, 'ef', ['q', 'eps', 'r']],
    [raw`\sqrt{\dfrac{ne^2}{\varepsilon_0 m_e}}`, 'freq', ['n', 'e', 'eps', 'me']],
    [raw`\dfrac{\Phi_B}{L}`, 'cur', ['Phi', 'L']],
    [raw`\dfrac{CV}{t}`, 'cur', ['C', 'V', 't']],
    [raw`\dfrac{P}{I}`, 'volt', ['P', 'I']],
    [raw`\dfrac{U}{c^2}`, 'mass', ['U', 'c']],
    [raw`\dfrac{\mu_0 m}{r^3}`, 'bf', ['mu0', 'md', 'r']],
    [raw`\dfrac{U}{B}`, 'mmom', ['U', 'B']],
    [raw`\dfrac{qr}{t}`, 'mmom', ['q', 'r', 't']],
  ];
  const listJoin = a => a.length === 1 ? a[0] : a.length === 2 ? a[0] + ' and ' + a[1] : a.slice(0, -1).join(', ') + ', and ' + a[a.length - 1];

  // dimensional-analysis "what must X be proportional to" problems; dims [M, L, T]
  const DV = {
    g: [0, 1, -2], rho: [1, -3, 0], len: [0, 1, 0], sig: [1, 0, -2], Bm: [1, -1, -2], m: [1, 0, 0], k: [1, 0, -2], G: [-1, 3, -2],
    hbar: [1, 2, -1], c: [0, 1, -1], v: [0, 1, -1], eta: [1, -1, -1], E: [1, 2, -2], t: [0, 0, 1], F: [1, 1, -2], mu: [1, -1, 0], kw: [0, -1, 0], kap: [1, 3, -2],
  };
  const TGT = { spd: ['speed', [0, 1, -1]], time: ['time', [0, 0, 1]], freq: ['frequency', [0, 0, -1]], len: ['length', [0, 1, 0]], force: ['force', [1, 1, -2]], mass: ['mass', [1, 0, 0]], en: ['energy', [1, 2, -2]] };
  // [quantity, symbol, target, [[TeX symbol, dims key, description, composite?] ×3], level]
  const FORMULAS = [
    ['the oscillation frequency of a small liquid drop', 'f', 'freq', [[raw`\sigma`, 'sig', raw`the surface tension $\sigma$`], [raw`\rho`, 'rho', raw`the density $\rho$ of the liquid`], ['R', 'len', 'the drop radius $R$']], 2],
    ['the speed of waves on deep water', 'v', 'spd', [['g', 'g', 'the free-fall acceleration $g$'], [raw`\lambda`, 'len', raw`the wavelength $\lambda$`], [raw`\rho`, 'rho', raw`the water density $\rho$`]], 2],
    ['the speed of sound in a fluid', 'v', 'spd', [['B', 'Bm', 'the bulk modulus $B$ (a pressure)'], [raw`\rho`, 'rho', raw`the density $\rho$`], [raw`\lambda`, 'len', raw`the wavelength $\lambda$`]], 2],
    ['the period of a mass oscillating on a spring', 'T', 'time', [['m', 'm', 'the mass $m$'], ['k', 'k', 'the spring constant $k$'], ['A', 'len', 'the amplitude $A$']], 1],
    ['the escape speed from the surface of a planet', 'v', 'spd', [['G', 'G', 'the gravitational constant $G$'], ['M', 'm', 'the planet’s mass $M$'], ['R', 'len', 'its radius $R$']], 1],
    ['the period of a circular orbit', 'T', 'time', [['G', 'G', 'the gravitational constant $G$'], ['M', 'm', 'the central mass $M$'], ['r', 'len', 'the orbital radius $r$']], 2],
    ['the drag force on a sphere moving rapidly through air', 'F', 'force', [[raw`\rho`, 'rho', raw`the air density $\rho$`], ['v', 'v', 'the speed $v$'], ['r', 'len', 'the sphere radius $r$']], 2],
    ['the viscous drag force on a small sphere moving slowly through a liquid', 'F', 'force', [[raw`\eta`, 'eta', raw`the viscosity $\eta$ (SI units $\text{kg}/(\text{m}\cdot\text{s})$)`], ['v', 'v', 'the speed $v$'], ['r', 'len', 'the sphere radius $r$']], 2],
    ['the Planck length', raw`\ell_P`, 'len', [[raw`\hbar`, 'hbar', raw`$\hbar$`], ['G', 'G', '$G$'], ['c', 'c', '$c$']], 2],
    ['the Planck time', 't_P', 'time', [[raw`\hbar`, 'hbar', raw`$\hbar$`], ['G', 'G', '$G$'], ['c', 'c', '$c$']], 2],
    ['the Planck mass', 'm_P', 'mass', [[raw`\hbar`, 'hbar', raw`$\hbar$`], ['G', 'G', '$G$'], ['c', 'c', '$c$']], 2],
    ['the speed of a transverse wave on a string', 'v', 'spd', [['F_T', 'F', 'the tension $F_T$', 1], [raw`\mu`, 'mu', raw`the mass per unit length $\mu$`], ['L', 'len', 'the string length $L$']], 1],
    ['the angular frequency of capillary (surface-tension) waves', raw`\omega`, 'freq', [[raw`\sigma`, 'sig', raw`the surface tension $\sigma$`], [raw`\rho`, 'rho', raw`the liquid density $\rho$`], ['k', 'kw', 'the wavenumber $k$']], 3],
    ['the radius of the fireball of a strong explosion at time $t$ after detonation', 'R', 'len', [['E', 'E', 'the energy released $E$'], ['t', 't', 'the time $t$'], [raw`\rho`, 'rho', raw`the density $\rho$ of the surrounding air`]], 3],
    ['the frequency of small oscillations of a simple pendulum', 'f', 'freq', [['g', 'g', 'the free-fall acceleration $g$'], [raw`\ell`, 'len', raw`the length $\ell$`], ['m', 'm', 'the bob mass $m$']], 1],
    ['the time for an object dropped from rest to fall a height $h$', 't', 'time', [['g', 'g', 'the free-fall acceleration $g$'], ['h', 'len', 'the height $h$'], ['m', 'm', 'the object’s mass $m$']], 1],
    ['the frequency of the fundamental pulsation of a self-gravitating star', 'f', 'freq', [['G', 'G', 'the gravitational constant $G$'], [raw`\rho`, 'rho', raw`the mean density $\rho$`], ['R', 'len', 'the stellar radius $R$']], 3],
    ['the typical speed of gas molecules', 'v', 'spd', [['k_BT', 'E', 'the thermal energy $k_BT$', 1], ['m', 'm', 'the molecular mass $m$'], ['L', 'len', 'the size $L$ of the container']], 2],
    ['the radius of the hydrogen atom', 'a', 'len', [[raw`\hbar`, 'hbar', raw`$\hbar$`], ['m', 'm', 'the electron mass $m$'], [raw`\kappa`, 'kap', raw`$\kappa \equiv e^2/4\pi\varepsilon_0$ (which has units of energy times length)`]], 3],
    ['the binding energy of the hydrogen atom', 'E', 'en', [[raw`\hbar`, 'hbar', raw`$\hbar$`], ['m', 'm', 'the electron mass $m$'], [raw`\kappa`, 'kap', raw`$\kappa \equiv e^2/4\pi\varepsilon_0$ (which has units of energy times length)`]], 3],
    ['the speed of long-wavelength waves in shallow water', 'v', 'spd', [['g', 'g', 'the free-fall acceleration $g$'], ['h', 'len', 'the water depth $h$'], [raw`\rho`, 'rho', raw`the water density $\rho$`]], 1],
    ['the maximum height reached by a ball thrown straight up', 'H', 'len', [['v_0', 'v', 'the launch speed $v_0$', 1], ['g', 'g', 'the free-fall acceleration $g$'], ['m', 'm', 'the ball’s mass $m$']], 1],
  ];
  function solve3(cols, b) {
    const det = m => m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
    const M = [0, 1, 2].map(r => cols.map(c => c[r]));
    const D = det(M);
    if (Math.abs(D) < 1e-9) throw new Error('singular dimensions');
    return [0, 1, 2].map(j => det(M.map((row, r) => row.map((x, i) => (i === j ? b[r] : x)))) / D);
  }
  // monomial ∏ s_i^{e_i} as TeX; syms: [{s, comp}]
  function mono(syms, ex) {
    const fs = ex.map(x => F.toRational(x, 12));
    if (fs.some(f => !f)) return null;
    const D = fs.reduce((d, f) => lcm(d, f[1]), 1);
    const ints = fs.map(f => f[0] * D / f[1]);
    const pw = (s, k) => (k === 1 ? s.s : (s.comp ? `(${s.s})` : s.s) + `^{${k}}`);
    const top = [], bot = [];
    syms.forEach((s, i) => { if (ints[i] > 0) top.push(pw(s, ints[i])); else if (ints[i] < 0) bot.push(pw(s, -ints[i])); });
    if (!top.length && !bot.length) return null;
    const t = top.join(' ') || '1';
    const base = bot.length ? `\\dfrac{${t}}{${bot.join(' ')}}` : t;
    if (D === 1) return base;
    if (D === 2) return `\\sqrt{${base}}`;
    return `\\left(${base}\\right)^{1/${D}}`;
  }
  const dimOf = (keys, ex) => [0, 1, 2].map(r => keys.reduce((s, k, i) => s + DV[k][r] * ex[i], 0));
  const sameDim = (a, b) => a.every((x, i) => Math.abs(x - b[i]) < 1e-9);

  // ================================================================ 7.1.2 log-plot data
  // [y, x, exponent num, den, reason]
  const LAWS = [
    ['the period $T$ of a planet’s circular orbit', 'the orbital radius $r$', 3, 2, raw`Kepler’s third law, $T^2 \propto r^3$`],
    ['the intensity $I$ of light from a point source', 'the distance $r$ from the source', -2, 1, raw`$I = P/4\pi r^2$`],
    ['the total power $P$ radiated by a blackbody of fixed surface area', 'its temperature $T$', 4, 1, raw`the Stefan–Boltzmann law, $P = \sigma AT^4$`],
    [raw`the wavelength $\lambda_{\max}$ at which a blackbody spectrum peaks`, 'the temperature $T$', -1, 1, raw`Wien’s law, $\lambda_{\max}T = \text{const}$`],
    ['the period $T$ of a simple pendulum (small amplitude)', 'its length $L$', 1, 2, raw`$T = 2\pi\sqrt{L/g}$`],
    ['the intensity of Rayleigh-scattered light', raw`the wavelength $\lambda$`, -4, 1, raw`Rayleigh scattering, $I \propto \lambda^{-4}$`],
    ['the electric field strength of a dipole, far away along a fixed direction', 'the distance $r$', -3, 1, raw`the dipole field $E \propto p/r^3$`],
    ['the magnitude $|E_n|$ of the hydrogen energy levels', 'the principal quantum number $n$', -2, 1, raw`$E_n = -13.6\,\text{eV}/n^2$`],
    ['the radius $r_n$ of the Bohr orbits', 'the principal quantum number $n$', 2, 1, raw`$r_n = n^2a_0$`],
    ['the magnetic field $B$ of a long straight wire', 'the distance $r$ from the wire', -1, 1, raw`$B = \mu_0I/2\pi r$`],
    ['the resistance $R$ of a wire of fixed length', 'the wire diameter $d$', -2, 1, raw`$R = \rho L/A$ with $A \propto d^2$`],
    [raw`the de Broglie wavelength $\lambda$ of a nonrelativistic electron`, 'its kinetic energy $K$', -1, 2, raw`$\lambda = h/\sqrt{2mK}$`],
    [raw`the resonant frequency $\omega_0$ of an LC circuit with fixed $L$`, 'the capacitance $C$', -1, 2, raw`$\omega_0 = 1/\sqrt{LC}$`],
    ['the speed $v$ of a transverse wave on a string', 'the tension $F_T$', 1, 2, raw`$v = \sqrt{F_T/\mu}$`],
    ['the power $P$ radiated by an accelerated point charge', 'the magnitude $a$ of its acceleration', 2, 1, raw`the Larmor formula, $P \propto q^2a^2$`],
    ['the heat capacity $C$ of an insulating crystal at very low temperature', 'the temperature $T$', 3, 1, raw`the Debye $T^3$ law`],
    ['the Fermi energy $E_F$ of a free-electron gas', 'the electron number density $n$', 2, 3, raw`$E_F \propto n^{2/3}$`],
    [raw`the escape speed $v_{\text{esc}}$ from planets that all have the same uniform density`, 'the planet radius $R$', 1, 1, raw`$v_{\text{esc}} = \sqrt{2GM/R}$ with $M \propto R^3$`],
    [raw`the rms speed $v_{\text{rms}}$ of the molecules of a gas`, 'the absolute temperature $T$', 1, 2, raw`$v_{\text{rms}} = \sqrt{3k_BT/m}$`],
    [raw`the rms speed $v_{\text{rms}}$ of molecules of different gases at the same temperature`, 'the molecular mass $m$', -1, 2, raw`$v_{\text{rms}} = \sqrt{3k_BT/m}$`],
    ['the moment of inertia $I$ of uniform solid spheres of equal density', 'the sphere radius $R$', 5, 1, raw`$I = \tfrac{2}{5}MR^2$ with $M \propto R^3$`],
    ['the energy $E_n$ of the levels of a one-dimensional infinite square well', 'the quantum number $n$', 2, 1, raw`$E_n \propto n^2$`],
    ['the ground-state energy $E_1$ of a particle in a one-dimensional infinite square well', 'the well width $a$', -2, 1, raw`$E_1 = \pi^2\hbar^2/2ma^2$`],
    ['the radius $R$ of stars that all have the same luminosity', 'the surface temperature $T$', -2, 1, raw`$L = 4\pi R^2\sigma T^4$ held fixed`],
    ['the self-inductance $L$ of a long solenoid of fixed length and cross section', 'the number of turns $N$', 2, 1, raw`$L = \mu_0N^2A/\ell$`],
    ['the cyclotron radius $r$ of a charged particle in a fixed magnetic field', 'its momentum $p$', 1, 1, raw`$r = p/qB$`],
    [raw`the mean free path $\ell$ of molecules in a gas`, 'the number density $n$', -1, 1, raw`$\ell = 1/(n\sigma)$`],
    ['the speed $v$ of an object that has fallen from rest (no air resistance)', 'the distance $h$ fallen', 1, 2, raw`$v = \sqrt{2gh}$`],
  ];
  // linearizing plots
  const PLOT = {
    'y-x': (y, x) => `$${y}$ versus $${x}$`,
    'lny-x': (y, x) => `$\\ln ${y}$ versus $${x}$`,
    'y-lnx': (y, x) => `$${y}$ versus $\\ln ${x}$`,
    'lny-lnx': (y, x) => `$\\ln ${y}$ versus $\\ln ${x}$`,
    'y-invx': (y, x) => `$${y}$ versus $1/${x}$`,
    'invy-x': (y, x) => `$1/${y}$ versus $${x}$`,
    'invy-invx': (y, x) => `$1/${y}$ versus $1/${x}$`,
    'y2-x': (y, x) => `$${y}^2$ versus $${x}$`,
    'y-x2': (y, x) => `$${y}$ versus $${x}^2$`,
    'lny-invx': (y, x) => `$\\ln ${y}$ versus $1/${x}$`,
    'y-invx2': (y, x) => `$${y}$ versus $1/${x}^2$`,
    'y-sqrtx': (y, x) => `$${y}$ versus $\\sqrt{${x}}$`,
  };
  const LIN_VALID = {
    exp: ['lny-x'], pow: ['lny-lnx'], arr: ['lny-invx'], sqrt: ['y2-x', 'y-sqrtx', 'lny-lnx'], sq: ['y-x2', 'lny-lnx'],
    inv: ['y-invx', 'invy-x', 'lny-lnx'], lens: ['invy-invx'], log: ['y-lnx'], invsq: ['y-invx2'], sqoff: ['y-x2'],
  };
  const LIN_WHY = {
    exp: y => raw`Taking logs, $\ln ${y}$ is linear in the independent variable, with slope equal to minus the decay constant.`,
    pow: () => raw`For $y = Ax^n$, $\ln y = \ln A + n\ln x$: a log–log plot is a straight line whose slope is the unknown exponent $n$.`,
    arr: () => raw`For $y = Ae^{-b/x}$, $\ln y = \ln A - b\,(1/x)$, which is linear in $1/x$ (an Arrhenius plot).`,
    sqrt: () => raw`For $y \propto \sqrt{x}$, both $y^2$ versus $x$ and $y$ versus $\sqrt{x}$ are straight lines, and a log–log plot is a line of slope $1/2$.`,
    sq: () => raw`For $y \propto x^2$, $y$ versus $x^2$ is a straight line through the origin (and a log–log plot has slope 2).`,
    inv: () => raw`For $y \propto 1/x$, $y$ versus $1/x$ (or $1/y$ versus $x$) is a straight line, and a log–log plot has slope $-1$.`,
    lens: () => raw`The thin-lens equation $1/d_o + 1/d_i = 1/f$ is linear in the reciprocals: $1/d_i = 1/f - 1/d_o$.`,
    log: () => raw`The relation is of the form $y = a + b\ln x$, so $y$ versus $\ln x$ is a straight line.`,
    invsq: () => raw`The relation $y = A + B/x^2$ is linear in $1/x^2$, with slope $B$ and intercept $A$.`,
    sqoff: () => raw`The relation $y = y_0 + ax^2$ is linear in $x^2$; the constant offset spoils a log–log straight line.`,
  };
  // [description, y symbol, x symbol, type]
  const LIN_CASES = [
    ['The count rate $R$ of a radioactive sample is expected to decrease exponentially with the time $t$.', 'R', 't', 'exp'],
    ['The voltage $V$ across a capacitor discharging through a resistor is measured as a function of time $t$.', 'V', 't', 'exp'],
    ['The intensity $I$ of a gamma-ray beam transmitted through an absorber is measured as a function of the absorber thickness $x$.', 'I', 'x', 'exp'],
    ['The amplitude $A$ of a lightly damped oscillator is recorded as a function of time $t$.', 'A', 't', 'exp'],
    ['The luminosity $L$ of main-sequence stars is believed to follow a power law, with unknown exponent, in the stellar mass $M$.', 'L', 'M', 'pow'],
    ['The drag force $F$ on a model car in a wind tunnel is believed to follow a power law, with unknown exponent, in the wind speed $v$.', 'F', 'v', 'pow'],
    ['The thermal conductivity $K$ of a sample at low temperature is expected to vary as an unknown power of the temperature $T$.', 'K', 'T', 'pow'],
    [raw`The conductivity $\sigma$ of an intrinsic semiconductor is expected to vary with absolute temperature $T$ as $\sigma \propto e^{-E_g/2k_BT}$, with unknown gap $E_g$.`, raw`\sigma`, 'T', 'arr'],
    ['The vapor pressure $P$ of a liquid is expected to vary with absolute temperature $T$ as $P = P_0e^{-L/RT}$, with unknown $P_0$ and $L$.', 'P', 'T', 'arr'],
    ['The ratio $r$ of the populations of two atomic levels in thermal equilibrium is measured as a function of the absolute temperature $T$.', 'r', 'T', 'arr'],
    ['The period $T$ of a simple pendulum is measured as a function of its length $L$.', 'T', 'L', 'sqrt'],
    ['The speed $v$ of waves on a stretched string is measured as a function of the string tension $F$.', 'v', 'F', 'sqrt'],
    ['The distance $d$ fallen from rest by a dropped ball is measured as a function of the elapsed time $t$.', 'd', 't', 'sq'],
    ['The power $P$ dissipated in a fixed resistor is measured as a function of the current $I$.', 'P', 'I', 'sq'],
    ['The pressure $P$ of a gas held at constant temperature is measured as a function of its volume $V$.', 'P', 'V', 'inv'],
    [raw`The de Broglie wavelength $\lambda$ of electrons is measured as a function of their momentum $p$.`, raw`\lambda`, 'p', 'inv'],
    ['For a thin lens of unknown focal length, the image distance $d_i$ is measured as a function of the object distance $d_o$.', 'd_i', 'd_o', 'lens'],
    [raw`The sound intensity level $\beta$ (in decibels) is measured as a function of the sound intensity $I$.`, raw`\beta`, 'I', 'log'],
    ['The entropy $S$ of an ideal gas held at fixed temperature is measured as a function of its volume $V$.', 'S', 'V', 'log'],
    [raw`The refractive index $n$ of a glass is expected to follow Cauchy’s formula $n = A + B/\lambda^2$ as a function of wavelength $\lambda$.`, 'n', raw`\lambda`, 'invsq'],
    ['The steady temperature $T$ of a resistor heated by a current $I$ is expected to obey $T = T_0 + aI^2$, with $T_0$ the room temperature.', 'T', 'I', 'sqoff'],
  ];

  // ================================================================ 7.2 statistics data
  const PROP = [
    { f: 'the volume of a cube', v: [['edge length', 3]], lvl: 1 },
    { f: 'the volume of a sphere', v: [['radius', 3]], lvl: 1 },
    { f: 'the area of a circular disk', v: [['radius', 2]], lvl: 1 },
    { f: raw`the power radiated by a blackbody, $P = \sigma AT^4$ (with $A$ known exactly)`, v: [['temperature $T$', 4]], lvl: 1 },
    { f: raw`the kinetic energy $K = \frac{1}{2}mv^2$ of a cart`, v: [['mass $m$', 1], ['speed $v$', 2]] },
    { f: 'the momentum $p = mv$ of a cart', v: [['mass $m$', 1], ['speed $v$', 1]] },
    { f: 'the resistance $R = V/I$ of a resistor', v: [['voltage $V$', 1], ['current $I$', -1]] },
    { f: 'the power $P = I^2R$ dissipated in a resistor', v: [['current $I$', 2], ['resistance $R$', 1]] },
    { f: 'the centripetal acceleration $a = v^2/r$ of a puck on a circular track', v: [['speed $v$', 2], ['radius $r$', -1]] },
    { f: raw`the free-fall acceleration $g = 4\pi^2L/T^2$ obtained with a pendulum`, v: [['length $L$', 1], ['period $T$', -2]] },
    { f: raw`the spring constant $k = 4\pi^2m/T^2$ of a mass–spring oscillator`, v: [['mass $m$', 1], ['period $T$', -2]] },
    { f: raw`the density $\rho = m/V$ of a sample`, v: [['mass $m$', 1], ['volume $V$', -1]] },
    { f: 'the free-fall acceleration $g = 2h/t^2$ obtained by timing a dropped ball', v: [['drop height $h$', 1], ['fall time $t$', -2]] },
    { f: raw`the energy $U = \frac{1}{2}CV^2$ stored in a capacitor`, v: [['capacitance $C$', 1], ['voltage $V$', 2]] },
    { f: raw`the density $\rho = m/(\pi r^2h)$ of a solid cylinder`, v: [['mass $m$', 1], ['radius $r$', -2], ['height $h$', -1]], lvl: 3 },
    { f: raw`the Young’s modulus $Y = FL/(A\,\Delta L)$ of a wire (with $F$ and $A$ known exactly)`, v: [['length $L$', 1], ['extension $\\Delta L$', -1]] },
  ];
  const ERR_SYS = [
    'a meter stick whose first 2 mm have worn away, used to measure lengths from its end',
    'a digital balance that reads 0.4 g with nothing on the pan',
    'a stopwatch whose internal clock runs 1% fast',
    'a thermometer calibrated against an incorrect reference temperature',
    'always reading an analog meter from the same off-axis viewing angle (parallax)',
    'using a value of $g$ in the analysis that is 2% too large',
    'a voltmeter that reads 0.05 V when its leads are shorted together',
  ];
  const ERR_RAND = [
    'electrical noise that makes the last digit of a digital voltmeter fluctuate',
    'trial-to-trial scatter in the number of radioactive decays counted per minute',
    'small, unpredictable air currents that disturb a sensitive balance',
    'trial-to-trial variation in judging when a pendulum passes its lowest point',
    'fluctuations in the number of photons reaching a detector in successive exposures',
    'estimating where a needle lies between two adjacent scale divisions',
    'thermal (Johnson) noise in the input resistor of an amplifier',
  ];
  const ERR_T = [
    raw`Averaging $N$ independent measurements reduces the random uncertainty of the mean by a factor of $\sqrt{N}$.`,
    'Averaging more measurements does not reduce a systematic error.',
    'A set of measurements can be very precise and yet inaccurate.',
    'Independent random uncertainties combine in quadrature.',
    'Precision describes the spread of repeated measurements, while accuracy describes their closeness to the true value.',
    'The standard deviation of the individual measurements does not shrink as more measurements are taken.',
  ];
  const ERR_F = [
    'Systematic errors can be made negligible simply by taking enough measurements.',
    'The uncertainty of the mean of $N$ independent measurements falls off as $1/N$.',
    'Independent random uncertainties should be added linearly rather than in quadrature.',
    'A precise measurement is necessarily an accurate one.',
    'Random errors always shift the result in the same direction.',
    raw`The standard deviation of the individual measurements decreases as $1/\sqrt{N}$.`,
    'Quoting more significant figures reduces the uncertainty of a measurement.',
  ];
  // Gaussian intervals: [description using mu/sigma placeholders, probability]
  const GAUSS = [
    [(a, s) => `between ${a(-1)} and ${a(1)}`, 0.6827, raw`$\mu \pm \sigma$ contains about 68%`],
    [(a, s) => `between ${a(0)} and ${a(1)}`, 0.3413, raw`half of the 68% within $\pm\sigma$, about 34%`],
    [(a, s) => `between ${a(1)} and ${a(2)}`, 0.1359, raw`$(95.4\% - 68.3\%)/2 \approx 13.6\%$`],
    [(a, s) => `between ${a(-1)} and ${a(2)}`, 0.8186, raw`$34.1\% + 47.7\% \approx 82\%$`],
    [(a, s) => `above ${a(1)}`, 0.1587, raw`$(100\% - 68.3\%)/2 \approx 16\%$`],
    [(a, s) => `below ${a(-2)}`, 0.02275, raw`$(100\% - 95.4\%)/2 \approx 2.3\%$`],
    [(a, s) => `that differ from the mean by more than ${s(1)}`, 0.3173, raw`$100\% - 68.3\% \approx 32\%$`],
    [(a, s) => `that differ from the mean by more than ${s(2)}`, 0.0455, raw`$100\% - 95.4\% \approx 4.6\%$`],
    [(a, s) => `that differ from the mean by more than ${s(3)}`, 0.0027, raw`only about 0.3% lie outside $\pm 3\sigma$`],
    [(a, s) => `between ${a(-2)} and ${a(0)}`, 0.4772, raw`half of the 95.4% within $\pm 2\sigma$, about 48%`],
  ];
  const POIS_T = [
    'The variance of the number of counts equals the mean number of counts.',
    raw`The probability of recording no counts in an interval is $e^{-\lambda}$, where $\lambda$ is the mean number of counts expected in that interval.`,
    'The waiting times between successive counts follow an exponential distribution.',
    'For a large mean number of counts, the distribution is approximately Gaussian.',
    raw`The fractional uncertainty of a count of $N$ events is about $1/\sqrt{N}$.`,
    'The numbers of counts recorded in non-overlapping time intervals are statistically independent.',
  ];
  const POIS_F = [
    'The standard deviation of the number of counts equals the mean number of counts.',
    'The distribution is symmetric about its mean, whatever the value of the mean.',
    'After a long gap with no counts, a count becomes more likely in the next instant.',
    'Doubling the counting time halves the fractional uncertainty of the measured rate.',
    'The most probable number of counts is always larger than the mean.',
  ];
  const fact = n => (n <= 1 ? 1 : n * fact(n - 1));
  // c e^{-L} as TeX with c = num/den
  const eTerm = (num, den, L) => { const c = F.frac(num, den); return `${c === '1' ? '' : c}e^{-${L}}`; };

  // ================================================================ 7.3 electronics data
  // horizontal two-terminal element between x0 and x1 at height y (body 40 px wide, centered)
  function elemH(type, x0, x1, y) {
    const xm = (x0 + x1) / 2;
    if (type === 'R') return `<path d="M${x0} ${y} H${xm - 20} l3.3 -7 l6.7 14 l6.7 -14 l6.7 14 l6.7 -14 l6.7 14 l3.3 -7 H${x1}"/>`;
    if (type === 'C') return `<path d="M${x0} ${y} H${xm - 4} M${xm - 4} ${y - 12} V${y + 12} M${xm + 4} ${y - 12} V${y + 12} M${xm + 4} ${y} H${x1}"/>`;
    return `<path d="M${x0} ${y} H${xm - 20} a5 5 0 0 1 10 0 a5 5 0 0 1 10 0 a5 5 0 0 1 10 0 a5 5 0 0 1 10 0 H${x1}"/>`;
  }
  // voltage divider: series element on top, shunt element to the common (ground) line, output across the shunt element
  function dividerFig(ser, sh) {
    const t = (x, y, s, extra = '') => `<text x="${x}" y="${y}" fill="currentColor" stroke="none" font-size="13" ${extra}>${s}</text>`;
    let s = `<svg viewBox="0 0 330 150" width="330" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="1.6" font-family="serif">`;
    s += `<circle cx="40" cy="40" r="3"/><circle cx="40" cy="120" r="3"/><circle cx="280" cy="40" r="3"/><circle cx="280" cy="120" r="3"/>`;
    s += `<path d="M43 40 H70"/>` + elemH(ser, 70, 150, 40) + `<path d="M150 40 H277 M43 120 H277"/>`;
    s += `<g transform="rotate(90 210 80)">${elemH(sh, 170, 250, 80)}</g>`;
    s += `<circle cx="210" cy="40" r="2" fill="currentColor"/><circle cx="210" cy="120" r="2" fill="currentColor"/>`;
    s += t(104, 22, ser, 'font-style="italic" text-anchor="middle"') + t(228, 85, sh, 'font-style="italic"');
    s += t(4, 85, `V<tspan font-size="9" dy="3">in</tspan>`, 'font-style="italic"') + t(288, 85, `V<tspan font-size="9" dy="3">out</tspan>`, 'font-style="italic"');
    s += t(20, 46, '+', 'font-size="11"') + t(22, 126, '−', 'font-size="11"') + t(292, 46, '+', 'font-size="11"') + t(292, 126, '−', 'font-size="11"');
    return s + '</svg>';
  }
  const ELNAME = { R: 'resistor $R$', C: 'capacitor $C$', L: 'inductor $L$' };
  // series, shunt, filter type, phase of Vout relative to Vin at the corner (+ = leads)
  const FILTERS = { RC: ['R', 'C', 'low', -45], CR: ['C', 'R', 'high', 45], RL: ['R', 'L', 'high', 45], LR: ['L', 'R', 'low', -45] };
  const ADV_T = [
    'An ideal op-amp draws no current into either input terminal.',
    'With negative feedback, an ideal op-amp drives its output so that the voltages at its two inputs are equal.',
    'An op-amp’s output cannot exceed its supply voltages; signals that would require more are clipped.',
    'A silicon diode conducts appreciably in the forward direction only once the forward voltage reaches roughly 0.6–0.7 V.',
    'A half-wave rectifier passes only one polarity of an AC input signal.',
    'In a bipolar junction transistor, a small base current controls a much larger collector current.',
    'A Zener diode operated in reverse breakdown keeps a nearly constant voltage across itself.',
    'A light-emitting diode emits light when forward-biased, as electrons and holes recombine across the band gap.',
  ];
  const ADV_F = [
    'An ideal op-amp has zero input impedance.',
    'An ideal op-amp has a very large output impedance.',
    'The voltage across a conducting silicon diode is proportional to the current through it, as for a resistor.',
    'An ideal diode conducts equally well in both directions.',
    'An op-amp without feedback produces an output proportional to the sum of its two input voltages.',
    'In a bipolar junction transistor, the collector current is much smaller than the base current.',
    'A transistor amplifier delivers output power without drawing any power from its supply.',
    'A reverse-biased silicon diode conducts a large current at a bias of only a few volts.',
  ];

  // ---------------------------------------------------------------- logic
  const GATES = { AND: (a, b) => a & b, OR: (a, b) => a | b, NAND: (a, b) => 1 - (a & b), NOR: (a, b) => 1 - (a | b), XOR: (a, b) => a ^ b, XNOR: (a, b) => 1 - (a ^ b) };
  const GEXPR = { AND: raw`A\cdot B`, OR: 'A + B', NAND: raw`\overline{A\cdot B}`, NOR: raw`\overline{A + B}`, XOR: raw`A\oplus B`, XNOR: raw`\overline{A\oplus B}` };
  const art = g => (g === 'NAND' || g === 'NOR' ? 'a' : 'an');
  const ROWS3 = [0, 1, 2, 3, 4, 5, 6, 7].map(i => [(i >> 2) & 1, (i >> 1) & 1, i & 1]);
  const ttex = (head, rows) => `$\\begin{array}{${'c'.repeat(head.length - 1)}|c} ${head.join(' & ')} \\\\ \\hline ${rows.map(r => r.join(' & ')).join(' \\\\ ')} \\end{array}$`;
  // Boolean expression trees
  const Lv = n => ({ t: 'v', n });
  const Ln = a => (a.t === 'not' ? a.a : { t: 'not', a });
  const Lop = (t, a, b) => ({ t, a, b });
  function lev(e, env) {
    switch (e.t) {
      case 'v': return env[e.n];
      case 'not': return 1 - lev(e.a, env);
      case 'and': return lev(e.a, env) & lev(e.b, env);
      case 'or': return lev(e.a, env) | lev(e.b, env);
      default: return lev(e.a, env) ^ lev(e.b, env);
    }
  }
  const OPT = { and: raw`\cdot `, or: ' + ', xor: raw` \oplus ` };
  function ltex(e, parent) {
    if (e.t === 'v') return e.n;
    if (e.t === 'not') return `\\overline{${ltex(e.a, 'not')}}`;
    const s = ltex(e.a, e.t) + OPT[e.t] + ltex(e.b, e.t);
    const paren = parent && parent !== 'not' && parent !== e.t && !(parent === 'or' && e.t === 'and');
    return paren ? `(${s})` : s;
  }
  const ltab = e => ROWS3.map(([a, b, c]) => lev(e, { A: a, B: b, C: c })).join('');
  // single mutations of an expression (for distractors)
  function lmut(e) {
    const out = [];
    if (e.t === 'v') { for (const n of ['A', 'B', 'C']) if (n !== e.n) out.push(Lv(n)); out.push(Ln(e)); return out; }
    if (e.t === 'not') { out.push(e.a); for (const m of lmut(e.a)) out.push(Ln(m)); return out; }
    for (const t of ['and', 'or', 'xor']) if (t !== e.t) out.push(Lop(t, e.a, e.b));
    out.push(Ln(e));
    for (const m of lmut(e.a)) out.push(Lop(e.t, m, e.b));
    for (const m of lmut(e.b)) out.push(Lop(e.t, e.a, m));
    return out;
  }
  const IDS = [
    [(X, Y) => [Ln(Lop('and', X, Y)), Lop('or', Ln(X), Ln(Y))], 'De Morgan’s law: $\\overline{X\\cdot Y} = \\overline{X} + \\overline{Y}$'],
    [(X, Y) => [Ln(Lop('or', X, Y)), Lop('and', Ln(X), Ln(Y))], 'De Morgan’s law: $\\overline{X + Y} = \\overline{X}\\cdot\\overline{Y}$'],
    [(X, Y) => [Ln(Lop('and', Ln(X), Ln(Y))), Lop('or', X, Y)], 'De Morgan’s law: $\\overline{\\overline{X}\\cdot\\overline{Y}} = X + Y$'],
    [(X, Y) => [Ln(Lop('or', Ln(X), Ln(Y))), Lop('and', X, Y)], 'De Morgan’s law: $\\overline{\\overline{X} + \\overline{Y}} = X\\cdot Y$'],
    [(X, Y) => [Lop('or', X, Lop('and', X, Y)), X], 'absorption: $X + X\\cdot Y = X$'],
    [(X, Y) => [Lop('and', X, Lop('or', X, Y)), X], 'absorption: $X\\cdot(X + Y) = X$'],
    [(X, Y) => [Lop('or', X, Lop('and', Ln(X), Y)), Lop('or', X, Y)], '$X + \\overline{X}\\cdot Y = X + Y$ (if $X = 0$ the output is $Y$; if $X = 1$ it is 1)'],
    [(X, Y) => [Lop('and', X, Lop('or', Ln(X), Y)), Lop('and', X, Y)], '$X\\cdot(\\overline{X} + Y) = X\\cdot Y$ (distribute and use $X\\cdot\\overline{X} = 0$)'],
    [(X, Y, Z) => [Lop('or', Lop('and', X, Y), Lop('and', X, Z)), Lop('and', X, Lop('or', Y, Z))], 'the distributive law: $X\\cdot Y + X\\cdot Z = X\\cdot(Y + Z)$'],
    [(X, Y, Z) => [Lop('and', Lop('or', X, Y), Lop('or', X, Z)), Lop('or', X, Lop('and', Y, Z))], 'the distributive law for OR over AND: $(X + Y)\\cdot(X + Z) = X + Y\\cdot Z$'],
    [(X, Y) => [Lop('or', Lop('and', X, Ln(Y)), Lop('and', Ln(X), Y)), Lop('xor', X, Y)], 'the definition of XOR: exactly one input is 1'],
    [(X, Y) => [Lop('or', Lop('and', X, Y), Lop('and', Ln(X), Ln(Y))), Ln(Lop('xor', X, Y))], 'XNOR: the output is 1 when the inputs are equal'],
    [(X, Y) => [Ln(Lop('xor', X, Y)), Lop('xor', Ln(X), Y)], 'inverting one input of an XOR inverts its output'],
    [(X, Y) => [Lop('or', Lop('and', X, Y), Lop('and', X, Ln(Y))), X], '$X\\cdot Y + X\\cdot\\overline{Y} = X\\cdot(Y + \\overline{Y}) = X$'],
    [(X, Y) => [Lop('and', Lop('or', X, Y), Lop('or', X, Ln(Y))), X], '$(X + Y)\\cdot(X + \\overline{Y}) = X + Y\\cdot\\overline{Y} = X$'],
    [(X, Y, Z) => [Ln(Lop('and', Ln(Lop('and', X, Y)), Z)), Lop('or', Lop('and', X, Y), Ln(Z))], 'De Morgan’s law applied to the outer NAND: $\\overline{\\overline{XY}\\cdot Z} = XY + \\overline{Z}$'],
    [(X, Y, Z) => [Ln(Lop('or', Lop('and', X, Y), Z)), Lop('and', Lop('or', Ln(X), Ln(Y)), Ln(Z))], 'De Morgan’s law applied twice'],
  ];
  // circuits equivalent to a single element
  const GOUT = { AND: 'an AND gate', OR: 'an OR gate', NAND: 'a NAND gate', NOR: 'a NOR gate', XOR: 'an XOR gate', XNOR: 'an XNOR gate', NOT: 'a NOT gate (inverter)', BUF: 'a plain wire (output equals the input signal)', ONE: 'a constant output of 1', ZERO: 'a constant output of 0' };
  const SINGLE = (function () {
    const out = [];
    for (const g of ['AND', 'OR', 'NAND', 'NOR', 'XOR']) for (const ii of [0, 1]) for (const io of [0, 1]) {
      if (!ii && !io) continue;
      const tab = [[0, 0], [0, 1], [1, 0], [1, 1]].map(([a, b]) => io ^ GATES[g](ii ? 1 - a : a, ii ? 1 - b : b)).join('');
      const name = Object.keys(GATES).find(k => [[0, 0], [0, 1], [1, 0], [1, 1]].map(([a, b]) => GATES[k](a, b)).join('') === tab);
      const d = `${art(g)} ${g} gate ${ii ? 'whose two inputs each first pass through a NOT gate' : ''}${ii && io ? ' and ' : ''}${io ? 'whose output passes through a NOT gate' : ''}`;
      out.push([d, name, `inverting ${ii && io ? 'both the inputs and the output' : ii ? 'both inputs' : 'the output'} of ${art(g)} ${g} gate gives ${GOUT[name]}${ii && g !== 'XOR' ? ' (De Morgan’s laws)' : ''}`]);
    }
    return out.concat([
      ['a NAND gate with both of its inputs tied to the same signal', 'NOT', '$\\overline{A\\cdot A} = \\overline{A}$'],
      ['a NOR gate with both of its inputs tied to the same signal', 'NOT', '$\\overline{A + A} = \\overline{A}$'],
      ['an XOR gate with one input held at logic 1', 'NOT', '$A \\oplus 1 = \\overline{A}$'],
      ['an XOR gate with one input held at logic 0', 'BUF', '$A \\oplus 0 = A$'],
      ['an AND gate with one input held at logic 1', 'BUF', '$A\\cdot 1 = A$'],
      ['an AND gate with one input held at logic 0', 'ZERO', '$A\\cdot 0 = 0$'],
      ['an OR gate with one input held at logic 1', 'ONE', '$A + 1 = 1$'],
      ['an OR gate with one input held at logic 0', 'BUF', '$A + 0 = A$'],
      ['a NAND gate with one input held at logic 1', 'NOT', '$\\overline{A\\cdot 1} = \\overline{A}$'],
      ['a NOR gate with one input held at logic 0', 'NOT', '$\\overline{A + 0} = \\overline{A}$'],
      ['a NAND gate whose output drives both inputs of a second NAND gate', 'AND', 'the second NAND acts as an inverter, undoing the inversion of the first'],
      ['a NOR gate whose output drives both inputs of a second NOR gate', 'OR', 'the second NOR acts as an inverter, undoing the inversion of the first'],
      ['two NAND gates with tied inputs (one fed by $A$, one by $B$) whose outputs feed a third NAND gate', 'OR', '$\\overline{\\overline{A}\\cdot\\overline{B}} = A + B$ by De Morgan'],
      ['two NOR gates with tied inputs (one fed by $A$, one by $B$) whose outputs feed a third NOR gate', 'AND', '$\\overline{\\overline{A} + \\overline{B}} = A\\cdot B$ by De Morgan'],
      ['the circuit producing the sum bit of a half adder (which adds one-bit numbers $A$ and $B$)', 'XOR', 'the sum bit is 1 when exactly one input is 1 ($1 + 1 = 10_2$ has sum bit 0)'],
      ['the circuit producing the carry bit of a half adder (which adds one-bit numbers $A$ and $B$)', 'AND', 'a carry occurs only for $1 + 1$'],
    ]);
  })();

  // ================================================================ 7.4 radiation detection data
  const ELEM = ',H,He,Li,Be,B,C,N,O,F,Ne,Na,Mg,Al,Si,P,S,Cl,Ar,K,Ca,Sc,Ti,V,Cr,Mn,Fe,Co,Ni,Cu,Zn,Ga,Ge,As,Se,Br,Kr,Rb,Sr,Y,Zr,Nb,Mo,Tc,Ru,Rh,Pd,Ag,Cd,In,Sn,Sb,Te,I,Xe,Cs,Ba,La,Ce,Pr,Nd,Pm,Sm,Eu,Gd,Tb,Dy,Ho,Er,Tm,Yb,Lu,Hf,Ta,W,Re,Os,Ir,Pt,Au,Hg,Tl,Pb,Bi,Po,At,Rn,Fr,Ra,Ac,Th,Pa,U,Np,Pu,Am,Cm,Bk,Cf,Es,Fm'.split(',');
  if (ELEM[26] !== 'Fe' || ELEM[92] !== 'U' || ELEM[82] !== 'Pb') throw new Error('element table');
  const nuc = (Z, A) => `$^{${A}}_{${Z}}\\text{${ELEM[Z]}}$`;
  const CH_T = [
    'A proton or alpha particle deposits energy at the highest rate near the end of its path (the Bragg peak).',
    'Heavy charged particles such as protons travel in nearly straight lines through matter.',
    'A heavy charged particle loses energy mainly through many small collisions with atomic electrons (ionization and excitation).',
    'Energy loss by bremsstrahlung is far more important for electrons than for protons of the same energy.',
    'At the same speed, an alpha particle loses energy about four times as fast as a proton.',
    'Fast electrons are scattered through large angles and follow irregular paths in matter.',
    'Alpha particles of a few MeV are stopped by a sheet of paper or a few centimeters of air.',
    'A muon with a kinetic energy of a few hundred MeV loses energy in matter at close to the minimum possible rate.',
  ];
  const CH_F = [
    'A proton loses energy at a constant rate all along its path until it stops.',
    'Heavy charged particles lose most of their energy in head-on collisions with atomic nuclei.',
    'The rate of energy loss of a slow (nonrelativistic) proton decreases as it slows down.',
    'Alpha particles of a few MeV can penetrate several centimeters of lead.',
    'An electron and an alpha particle of the same kinetic energy have about the same range in aluminum.',
    'Bremsstrahlung is the main energy-loss mechanism for 5-MeV alpha particles in air.',
    'A 1-MeV proton is a minimum-ionizing particle.',
    'At the same speed, a proton loses energy faster than an alpha particle.',
  ];
  // [name, charge number z, mass number]
  const IONS = [['proton', 1, 1], ['deuteron', 1, 2], ['triton', 1, 3], ['helium-3 nucleus', 2, 3], ['alpha particle', 2, 4]];
  const CHER = [[4, 3, 5], [3, 4, 5], [12, 5, 13], [5, 12, 13], [15, 8, 17], [8, 15, 17], [24, 7, 25], [20, 21, 29], [21, 20, 29], [35, 12, 37]];
  const PARTS = [['electron', 0.511], ['muon', 106], ['charged pion', 140], ['charged kaon', 494], ['proton', 938]];
  const PH_CASES = {
    photo: [['a 10-keV X-ray', 'water'], ['a 20-keV X-ray', 'aluminum'], ['a 30-keV X-ray', 'lead'], ['a 60-keV gamma ray', 'lead'], ['a 15-keV X-ray', 'soft tissue'], ['a 40-keV X-ray', 'a sodium iodide crystal'], ['a 100-keV gamma ray', 'lead'], ['a 5-keV X-ray', 'silicon']],
    compton: [['a 1-MeV gamma ray', 'water'], ['a 662-keV gamma ray', 'aluminum'], ['a 2-MeV gamma ray', 'graphite'], ['a 1.33-MeV gamma ray', 'a plastic scintillator'], ['a 500-keV gamma ray', 'soft tissue'], ['a 3-MeV gamma ray', 'aluminum'], ['a 1.5-MeV gamma ray', 'iron']],
    pair: [['a 50-MeV gamma ray', 'lead'], ['a 100-MeV gamma ray', 'iron'], ['a 1-GeV gamma ray', 'water'], ['a 20-MeV gamma ray', 'lead'], ['a 500-MeV gamma ray', 'aluminum'], ['a 10-GeV photon', 'a lead-glass calorimeter']],
  };
  const PROC = { photo: 'photoelectric absorption', compton: 'Compton scattering', pair: 'pair production', ray: 'Rayleigh (coherent) scattering', nuc: 'photonuclear absorption' };
  const PROC_Q = [
    ['Which photon interaction has a cross section per atom that increases most rapidly with the atomic number $Z$ of the absorber (roughly as $Z^4$ to $Z^5$)?', 'photo', 'Photoelectric absorption scales roughly as $Z^4$–$Z^5$ (and falls steeply with energy, roughly as $E^{-3}$), which is why high-$Z$ materials such as lead and iodine are used to absorb low-energy photons.'],
    ['Which photon interaction has a cross section per atom roughly proportional to $Z$, the number of electrons per atom?', 'compton', 'Compton scattering occurs off individual (nearly free) electrons, so its cross section per atom is proportional to the number of electrons, $Z$.'],
    ['Which photon interaction has a cross section per atom that grows roughly as $Z^2$ and increases with photon energy above its threshold?', 'pair', 'Pair production takes place in the Coulomb field of the nucleus, with cross section $\\propto Z^2$; it turns on at $2m_ec^2 = 1.022\\,\\text{MeV}$ and grows with energy.'],
    ['Which photon interaction cannot occur at all for photons with energies below about 1 MeV?', 'pair', 'Pair production must create the rest energy of an electron and a positron, so it requires $E_\\gamma \\ge 2m_ec^2 = 1.022\\,\\text{MeV}$.'],
    ['In which photon interaction does the photon survive, leaving with reduced energy and a new direction?', 'compton', 'In Compton scattering the photon scatters off an electron and loses energy, $\\Delta\\lambda = (h/m_ec)(1 - \\cos\\theta)$; in photoelectric absorption and pair production the photon disappears.'],
    ['In which photon interaction is the photon completely absorbed and its energy, minus a binding energy, given to a single atomic electron?', 'photo', 'Photoelectric absorption: the whole photon energy goes to a bound electron, which is ejected with kinetic energy $E_\\gamma - E_b$.'],
    ['Which photon interaction is eventually followed by the emission of two 511-keV photons traveling in opposite directions?', 'pair', 'Pair production creates a positron, which slows down and annihilates with an electron, giving two back-to-back 511-keV photons.'],
  ];
  const DET = [
    ['measuring gamma-ray energies with the best possible energy resolution', 'a high-purity germanium (HPGe) detector cooled to liquid-nitrogen temperature', 'Germanium needs only about 3 eV per electron–hole pair, so many charge carriers are produced and statistical fluctuations are small; it must be cooled to suppress thermal leakage current.'],
    ['detecting gamma rays with high efficiency at room temperature, with moderate energy resolution', 'a thallium-doped sodium iodide (NaI(Tl)) scintillator viewed by a photomultiplier tube', 'NaI(Tl) is dense and has high-$Z$ iodine for efficient photon absorption; its scintillation light is converted to a current by a photomultiplier, with resolution of several percent.'],
    ['simply counting ionizing events, where the output pulse is the same size whatever energy was deposited', 'a Geiger–Müller counter', 'A Geiger–Müller tube operates in the avalanche (discharge) region, so every event gives the same large pulse and no energy information.'],
    ['separating particles of the same momentum by whether their speed exceeds a threshold', 'a threshold Cherenkov counter', 'Cherenkov light is emitted only if $v > c/n$, so particles of the same momentum but different mass can be separated.'],
    ['measuring the positions of charged-particle tracks to within tens of micrometers near a collision point', 'a silicon strip (or pixel) detector', 'Finely segmented silicon sensors give position resolution of order 10 μm and are used as vertex and tracking detectors.'],
    ['detecting very faint flashes of visible light, down to single photons, with large gain', 'a photomultiplier tube', 'A photomultiplier converts photons to electrons at a photocathode (photoelectric effect) and multiplies them by secondary emission along a chain of dynodes, with gains of about $10^6$.'],
    ['detecting slow (thermal) neutrons', 'a proportional counter filled with boron trifluoride ($\\text{BF}_3$) or helium-3 gas', 'Neutrons are uncharged; they are detected through nuclear reactions such as $^{10}\\text{B}(n,\\alpha)$ or $^{3}\\text{He}(n,p)$ that produce ionizing charged particles.'],
    ['measuring the total energy of a high-energy electron or photon by absorbing its entire shower', 'an electromagnetic calorimeter', 'A calorimeter absorbs the full electromagnetic shower in dense material and measures a signal proportional to the deposited energy.'],
  ];
  const DET_T = [
    'In a scintillator, the amount of light produced is roughly proportional to the energy deposited by the charged particle.',
    'A photomultiplier tube relies on the photoelectric effect at its photocathode followed by secondary-electron multiplication at its dynodes.',
    'Creating an electron–hole pair in a semiconductor takes only a few eV, compared with about 30 eV per ion pair in a gas.',
    'The fractional energy resolution of a detector limited by counting statistics improves as $1/\\sqrt{E}$.',
    'A germanium detector must be cooled during operation to reduce thermally generated leakage current.',
    'A Geiger–Müller counter gives no information about the energy of the radiation it detects.',
  ];
  const DET_F = [
    'A Geiger–Müller counter gives output pulses whose heights are proportional to the energy deposited.',
    'A sodium iodide scintillator has better energy resolution than a germanium detector.',
    'Germanium detectors give their best resolution when operated well above room temperature.',
    'A photomultiplier tube detects photons through pair production at its photocathode.',
    'Neutrons are detected mainly through the ionization they produce directly along their paths.',
    'The fractional energy resolution of a detector becomes worse as the deposited energy increases.',
  ];
  const GAMMAS = [[662, 'cesium-137'], [1173, 'cobalt-60'], [1332, 'cobalt-60'], [1461, 'potassium-40'], [2614, 'thallium-208'], [1275, 'sodium-22'], [835, 'manganese-54'], [1836, 'yttrium-88'], [2754, 'sodium-24'], [4440, 'an excited carbon-12 nucleus'], [6129, 'an excited oxygen-16 nucleus'], [898, 'yttrium-88']];
  const SPEC = {
    pp: ['the full-energy (photo)peak', E => E],
    ce: ['the Compton edge', E => E * (2 * E / 511) / (1 + 2 * E / 511)],
    bs: ['the backscatter peak', E => E / (1 + 2 * E / 511)],
    se: ['the single-escape peak', E => E - 511],
    de: ['the double-escape peak', E => E - 1022],
  };
  const DEC_T = [
    'Alpha particles are helium-4 nuclei and are stopped by a sheet of paper.',
    'In beta-minus decay an electron and an antineutrino are emitted, so the electron energies form a continuous spectrum.',
    'Gamma decay changes neither the atomic number nor the mass number of the nucleus.',
    'In beta-plus decay a proton in the nucleus is converted into a neutron.',
    'Alpha particles emitted in a given decay have sharply defined (discrete) energies.',
    'Electron capture decreases the atomic number by one without changing the mass number.',
    'Of alpha, beta, and gamma radiation, gamma rays are the most penetrating.',
    'In the same magnetic field, alpha particles and beta-minus particles are deflected in opposite directions.',
  ];
  const DEC_F = [
    'Beta-minus decay increases the mass number by one.',
    'Gamma decay decreases the atomic number by one.',
    'Electrons emitted in beta decay all have the same kinetic energy.',
    'Alpha decay decreases the mass number by two.',
    'Gamma rays are deflected by a magnetic field.',
    'Alpha particles are the most penetrating of the three common types of radiation.',
    'In beta-plus decay a neutron in the nucleus is converted into a proton.',
  ];
  // [Z, A] parent, daughter, #alpha, #beta-
  const CHAINS = [[[92, 238], [82, 206]], [[92, 235], [82, 207]], [[90, 232], [82, 208]], [[93, 237], [83, 209]], [[88, 226], [82, 206]], [[86, 222], [82, 210]], [[92, 238], [92, 234]], [[88, 228], [90, 228]], [[86, 220], [82, 208]], [[89, 227], [82, 207]], [[90, 230], [82, 206]], [[91, 231], [82, 207]], [[83, 210], [82, 206]], [[94, 239], [82, 207]], [[95, 241], [83, 209]]];
  const PARENTS = [[92, 238], [92, 235], [90, 232], [94, 239], [93, 237], [88, 226], [95, 241], [86, 222], [91, 231], [90, 230], [89, 227], [94, 242], [96, 244]];
  // single decays: [Z, A, mode]
  const SINGLES = [[11, 22, 'bp'], [6, 11, 'bp'], [9, 18, 'bp'], [19, 40, 'ec'], [27, 60, 'bm'], [55, 137, 'bm'], [38, 90, 'bm'], [53, 131, 'bm'], [4, 7, 'ec'], [7, 13, 'bp'], [8, 15, 'bp'], [15, 32, 'bm'], [95, 241, 'a'], [84, 210, 'a'], [88, 226, 'a'], [6, 14, 'bm'], [1, 3, 'bm'], [43, 99, 'g'], [56, 137, 'g'], [92, 238, 'a'], [26, 55, 'ec'], [24, 51, 'ec']];
  const MODE = { bp: 'beta-plus ($\\beta^+$) decay', bm: 'beta-minus ($\\beta^-$) decay', ec: 'electron capture', a: 'alpha decay', g: 'a gamma-ray transition (from an excited state)' };
  const MODE_D = { bp: [-1, 0], bm: [1, 0], ec: [-1, 0], a: [-2, -4], g: [0, 0] };

  // ================================================================ 7.5 lasers and interferometers data
  const LAS_T = [
    'A photon produced by stimulated emission has the same frequency, phase, polarization, and direction as the photon that stimulated it.',
    'Optical pumping of a two-level system cannot produce a steady-state population inversion.',
    'The upper laser level is usually metastable, with a lifetime much longer than that of the pump level.',
    'In a four-level laser the lower laser level empties quickly, so inversion is easier to achieve than in a three-level laser.',
    'In thermal equilibrium the upper level of an optical transition is always less populated than the lower level.',
    'The mirrors of the optical cavity provide feedback, so that light is amplified on many passes through the gain medium.',
    'In a three-level laser such as ruby, more than half of the atoms must be removed from the ground state to achieve inversion.',
  ];
  const LAS_F = [
    'Laser light is produced mainly by spontaneous emission.',
    'Sufficiently intense optical pumping can produce a steady-state population inversion in a two-level system.',
    'A photon produced by stimulated emission has a random phase relative to the stimulating photon.',
    'Population inversion means that the lower laser level holds more atoms than the upper laser level.',
    'In a four-level laser the lower laser level is the ground state.',
    'The upper laser level should decay as quickly as possible to give the largest gain.',
    'Heating the gain medium to a high enough temperature produces population inversion on an optical transition.',
  ];
  // [name, wavelength label, medium, transitions]
  const LASERS = [
    ['helium–neon', '632.8 nm (red)', 'a low-pressure mixture of helium and neon excited by an electrical discharge', 'electronic levels of neon atoms, populated by collisions with metastable helium atoms'],
    ['carbon dioxide', '10.6 μm (infrared)', 'a CO₂–N₂–He gas mixture excited by an electrical discharge', 'vibrational–rotational levels of a molecule'],
    ['Nd:YAG', '1064 nm (near infrared)', 'an yttrium aluminum garnet crystal doped with neodymium ions', 'electronic levels of rare-earth ions in a crystal host, forming a four-level system'],
    ['ruby', '694.3 nm (deep red)', 'an aluminum oxide (sapphire) crystal doped with chromium ions', 'electronic levels of chromium ions, forming a three-level system'],
    ['argon-ion', '488 nm and 514.5 nm (blue-green)', 'singly ionized argon gas in a high-current discharge', 'electronic levels of singly ionized atoms of a noble gas'],
    ['ArF excimer', '193 nm (ultraviolet)', 'an argon–fluorine gas mixture', 'a bound excited state of a diatomic molecule whose ground state is unbound'],
    ['semiconductor diode', 'about 800–900 nm for GaAs', 'a forward-biased p–n junction', 'recombination of conduction-band electrons with valence-band holes'],
    ['dye', 'broadly tunable across the visible', 'a solution of organic dye molecules in a solvent', 'broad vibronic bands of large organic molecules in a liquid'],
    ['free-electron', 'continuously tunable, from microwaves to X-rays', 'a relativistic electron beam passing through a periodic array of magnets (an undulator)', 'no bound energy levels: radiation from unbound electrons oscillating in a magnetic field'],
  ];
  const LAS_LAM = [['632.8 nm', 0], ['10.6 μm', 1], ['1064 nm', 2], ['694.3 nm', 3], ['514.5 nm', 4], ['193 nm', 5]];
  const LAS_SPECIAL = [
    ['Which laser was the first to be demonstrated (in 1960)?', 3, 'Maiman’s 1960 laser used a flash-lamp-pumped ruby crystal (a three-level system).'],
    ['Which type of laser has no discrete bound energy levels in its gain medium?', 8, 'A free-electron laser amplifies radiation emitted by unbound relativistic electrons wiggling in an undulator; its wavelength is tuned by the electron energy.'],
    ['Which laser uses a liquid gain medium and is widely tunable across the visible?', 7, 'Dye lasers use organic dyes in solution, whose broad emission bands allow wide tuning.'],
    ['Which laser is pumped directly by an electric current passing through a p–n junction?', 6, 'Diode lasers are pumped by injecting electrons and holes across a junction, where they recombine.'],
    ['Which laser is most commonly used for industrial cutting and welding with continuous output powers of kilowatts in the mid-infrared?', 1, 'The CO₂ laser (10.6 μm) is efficient and scalable to high power.'],
    ['Frequency doubling of which laser gives the familiar 532-nm green output of many green laser pointers and pump lasers?', 2, 'The second harmonic of the 1064-nm Nd:YAG (or Nd:YVO₄) line is 532 nm.'],
  ];

  GRE.addTemplates('lab', [
    // ============================================================ 7.1.1 Dimensional analysis
    {
      id: 'lab.dim.slope', sec: '7.1.1', level: 2, weight: 2,
      gen(R) {
        const s = R.pick(SLOPES);
        const swap = R.bool();
        const [Y, X, ys, xs] = swap ? [s.x, s.y, s.xs, s.ys] : [s.y, s.x, s.ys, s.xs];
        const ans = swap ? s.inv : s.s;
        const wr = [swap ? s.s : s.inv].concat(s.o);
        const lead = R.pick(['A student plots', 'In a laboratory experiment, a group plots', 'An experimenter graphs']);
        return {
          q: `${lead} ${Y} on the vertical axis against ${X} on the horizontal axis, and the data fall on a straight line. Which of the following is the slope of the line? (Here ${s.def}.)`,
          ...GRE.mc(R, `$${ans}$`, wr.map(w => `$${w}$`), { keep: 1 }),
          expl: raw`The governing relation is ${s.rel}, so the slope of $${ys}$ versus $${xs}$ is $${ans}$${swap ? ' (the axes are the reverse of the usual form of the law, so the slope is the reciprocal of the familiar coefficient)' : ''}. Dimensional check: the slope must have the units of the vertical axis divided by those of the horizontal axis, and every other choice fails this test.`,
        };
      },
    },
    {
      id: 'lab.dim.units', sec: '7.1.1', level: 2, weight: 2,
      gen(R) {
        const fund = COMBOS.filter(c => c[3]);
        if (R.bool(0.4)) {
          // which combination has dimensions of X?
          const c = R.pick(fund);
          const others = R.shuffle(fund.filter(d => d[1] !== c[1]));
          const used = new Set([c[1]]), wr = [];
          for (const d of others) if (!used.has(d[1])) { used.add(d[1]); wr.push(`$${d[0]}$`); }
          const what = c[1] === 'dl' ? 'is dimensionless' : `has the dimensions of ${CAT[c[1]]}`;
          return {
            q: raw`Which of the following combinations of fundamental constants ${what}? ($\hbar$ is the reduced Planck constant, $h$ Planck’s constant, $G$ the gravitational constant, $m_e$ the electron mass, $k_B$ Boltzmann’s constant, and $e$, $c$, $\varepsilon_0$, $\mu_0$ have their usual meanings.)`,
            ...GRE.mc(R, `$${c[0]}$`, wr),
            level: 2,
            expl: raw`Build the units step by step: $\hbar$ is J·s, $\hbar c$ is J·m, $e^2/4\pi\varepsilon_0$ is J·m, $G$ is $\text{m}^3/(\text{kg}\cdot\text{s}^2)$, $\mu_0\varepsilon_0 = 1/c^2$, and $\sqrt{\mu_0/\varepsilon_0}$ is a resistance. Then $${c[0]}$ ${c[1] === 'dl' ? 'is a pure number' : 'has the dimensions of ' + CAT[c[1]]}; each of the other choices has different dimensions.`,
          };
        }
        const c = R.pick(COMBOS);
        const cats = Object.keys(CAT).filter(k => k !== c[1]);
        const defs = listJoin(c[2].map(k => SYM[k]));
        return {
          q: raw`The quantity $${c[0]}$, where ${defs}, has the dimensions of`,
          ...GRE.mc(R, CAT[c[1]], R.pickN(cats, 6).map(k => CAT[k])),
          level: c[3] ? 2 : 1,
          expl: raw`Reduce to base units using known relations (for example $RC$ and $L/R$ are times, $\omega L$ and $1/\omega C$ are impedances, $\varepsilon_0E^2$ and $B^2/\mu_0$ are energy densities, $e^2/4\pi\varepsilon_0$ is energy×length, $\hbar$ is energy×time). Doing so, $${c[0]}$ has the dimensions of ${CAT[c[1]].replace(/ \(.*\)/, '')}${c[1] === 'dl' ? ' — that is, it is a pure number' : ''}.`,
        };
      },
    },
    {
      id: 'lab.dim.formula', sec: '7.1.1', level: 2,
      gen(R) {
        const [what, sym, tk, vars, lvl] = R.pick(FORMULAS);
        const keys = vars.map(v => v[1]);
        const target = TGT[tk][1];
        const ex = solve3(keys.map(k => DV[k]), target).map(x => { const r = F.toRational(x, 12); return r ? r[0] / r[1] : x; });
        const syms = vars.map(v => ({ s: v[0], comp: !!v[3] }));
        const corr = mono(syms, ex);
        const cands = [ex.map(x => -x), ex.map(x => 2 * x), ex.map(x => x / 2)];
        for (let i = 0; i < 3; i++) {
          if (ex[i] !== 0) { const f = ex.slice(); f[i] = -f[i]; cands.push(f); }
          else for (const z of [1, -1, 0.5]) { const f = ex.slice(); f[i] = z; cands.push(f); }
          for (let j = i + 1; j < 3; j++) { const f = ex.slice(); f[i] = ex[j]; f[j] = ex[i]; cands.push(f); }
        }
        const wr = cands.filter(f => !sameDim(dimOf(keys, f), target)).map(f => mono(syms, f)).filter(Boolean).map(s => `$${s}$`);
        const intro = R.pick(['Suppose that', 'Assume that', 'A physicist argues that']);
        return {
          q: `${intro} ${what}, $${sym}$, depends only on ${listJoin(vars.map(v => v[2]))}. Dimensional analysis requires $${sym}$ to be proportional to`,
          ...GRE.mc(R, `$${corr}$`, wr),
          level: lvl,
          expl: raw`Write $${sym} \propto ${vars.map((v, i) => `${v[3] ? '(' + v[0] + ')' : v[0]}^{${'abc'[i]}}`).join(' ')}$ and match powers of mass, length, and time to those of a ${TGT[tk][0]}. The unique solution is $${vars.map((v, i) => `${'abc'[i]} = ${F.frac(...(F.toRational(ex[i], 12)))}`).join(',\\ ')}$, giving $${sym} \propto ${corr}$.${ex.some(x => x === 0) ? ' A variable with exponent zero simply drops out.' : ''}`,
        };
      },
    },
    {
      id: 'lab.dim.graph', sec: '7.1.1', level: 2,
      gen(R) {
        const kind = R.pick(['pend', 'spring', 'fall', 'photo']);
        if (kind === 'photo') {
          const slope = R.step(3.8, 4.4, 0.1) * 1e-15;
          const f0 = R.step(4.0, 11.0, 0.5) * 1e14;
          const phi = slope * f0;
          const h = slope * 1.6e-19;
          if (R.bool()) {
            return {
              q: raw`In a photoelectric-effect experiment, the stopping potential is plotted against the frequency of the incident light. The best-fit line has slope $${F.num(slope / 1e-15, 2)}\times 10^{-15}\,\text{V}\cdot\text{s}$ and crosses the frequency axis at $${F.num(f0 / 1e14, 2)}\times 10^{14}\,\text{Hz}$. The work function of the metal is closest to`,
              ...GRE.numeric(R, phi, [phi / (2 * PI), slope * 1e15, f0 / 1e14, phi * 2], { unit: raw`\text{eV}` }),
              expl: raw`From $eV_s = hf - \phi$, the slope is $h/e$ and the line hits $V_s = 0$ at the threshold $f_0 = \phi/h$. So $\phi/e = (h/e)f_0 = (${F.num(slope / 1e-15, 2)}\times10^{-15})(${F.num(f0 / 1e14, 2)}\times10^{14}) \approx ${F.num(phi, 2)}\,\text{V}$, i.e. $\phi \approx ${F.num(phi, 2)}\,\text{eV}$.`,
            };
          }
          return {
            q: raw`In a photoelectric-effect experiment, the stopping potential $V_s$ (in volts) is plotted against the frequency $f$ (in hertz) of the incident light, and the best-fit line has slope $${F.num(slope / 1e-15, 2)}\times 10^{-15}\,\text{V}\cdot\text{s}$. Taking $e = 1.6\times10^{-19}\,\text{C}$, the value of Planck’s constant implied by these data is closest to`,
            ...GRE.numeric(R, h, [slope, h / (2 * PI), slope / 1.6e-19 * 1e-38, h * 2 * PI], { unit: raw`\text{J}\cdot\text{s}`, fmt: x => F.sci(x, 2) }),
            level: 1,
            expl: raw`Since $eV_s = hf - \phi$, the slope of $V_s$ versus $f$ is $h/e$. Hence $h = e \times \text{slope} = (1.6\times10^{-19})(${F.num(slope / 1e-15, 2)}\times10^{-15}) \approx ${F.sci(h, 2)}\,\text{J}\cdot\text{s}$.`,
          };
        }
        const L1 = R.pick([0.2, 0.25, 0.3, 0.4, 0.5]);
        const L2 = L1 + R.pick([0.4, 0.5, 0.6, 0.8, 1.0]);
        if (kind === 'pend') {
          const [where, g0] = R.pick([['on the Moon', 1.62], ['on Mars', 3.71], ['in a laboratory on Earth', 9.8], ['on the surface of a large exoplanet', R.step(12, 26, 1)], ['on a small moon', R.step(0.5, 3, 0.1)]]);
          const y1 = F.round(4 * PI * PI * L1 / g0, 3), y2 = F.round(4 * PI * PI * L2 / g0, 3);
          const sl = (y2 - y1) / (L2 - L1), g = 4 * PI * PI / sl;
          return {
            q: raw`A student ${where} measures the period $T$ of a simple pendulum for several lengths $L$ and plots $T^2$ versus $L$. The best-fit line passes through $(L, T^2) = (${L1}\,\text{m},\ ${F.num(y1, 3)}\,\text{s}^2)$ and $(${F.num(L2, 3)}\,\text{m},\ ${F.num(y2, 3)}\,\text{s}^2)$. The free-fall acceleration there is closest to`,
            ...GRE.numeric(R, g, [1 / sl, 2 * PI / sl, sl, g / 2, 2 * g], { unit: raw`\text{m/s}^2` }),
            expl: raw`$T^2 = (4\pi^2/g)L$, so the slope is $4\pi^2/g$. Here the slope is $\Delta(T^2)/\Delta L \approx ${F.num(sl, 3)}\,\text{s}^2/\text{m}$, so $g = 4\pi^2/\text{slope} \approx ${F.num(g, 2)}\,\text{m/s}^2$. Forgetting the $4\pi^2$ is the usual trap.`,
          };
        }
        if (kind === 'spring') {
          const k = R.pick([5, 8, 10, 12, 15, 20, 25, 30, 40, 50, 80]);
          const m1 = R.pick([0.1, 0.2, 0.25]), m2 = m1 + R.pick([0.2, 0.3, 0.4, 0.5]);
          const y1 = F.round(4 * PI * PI * m1 / k, 3), y2 = F.round(4 * PI * PI * m2 / k, 3);
          const sl = (y2 - y1) / (m2 - m1), kk = 4 * PI * PI / sl;
          return {
            q: raw`The period $T$ of a mass $m$ hanging from a spring is measured for several masses, and $T^2$ is plotted against $m$. The line passes through $(m, T^2) = (${m1}\,\text{kg},\ ${F.num(y1, 3)}\,\text{s}^2)$ and $(${F.num(m2, 3)}\,\text{kg},\ ${F.num(y2, 3)}\,\text{s}^2)$. The spring constant is closest to`,
            ...GRE.numeric(R, kk, [1 / sl, 2 * PI / sl, sl, kk / 2, 2 * PI * kk], { unit: raw`\text{N/m}` }),
            expl: raw`$T = 2\pi\sqrt{m/k}$ gives $T^2 = (4\pi^2/k)\,m$. The slope is $\approx ${F.num(sl, 3)}\,\text{s}^2/\text{kg}$, so $k = 4\pi^2/\text{slope} \approx ${F.num(kk, 2)}\,\text{N/m}$.`,
          };
        }
        const [where, g0] = R.pick([['on the Moon', 1.62], ['on Mars', 3.71], ['on Earth', 9.8], ['on a distant planet', R.step(4, 25, 1)]]);
        const h1 = R.pick([0.5, 1, 1.5, 2]), h2 = h1 + R.pick([1, 1.5, 2, 3]);
        const y1 = F.round(2 * g0 * h1, 3), y2 = F.round(2 * g0 * h2, 3);
        const sl = (y2 - y1) / (h2 - h1), g = sl / 2;
        return {
          q: raw`Balls are dropped from rest ${where} from several heights $h$, and the square of the impact speed, $v^2$, is plotted against $h$. The line passes through $(${h1}\,\text{m},\ ${F.num(y1, 3)}\,\text{m}^2/\text{s}^2)$ and $(${h2}\,\text{m},\ ${F.num(y2, 3)}\,\text{m}^2/\text{s}^2)$. Neglecting air resistance, the free-fall acceleration is closest to`,
          ...GRE.numeric(R, g, [sl, sl / 4, Math.sqrt(sl), 4 * g], { unit: raw`\text{m/s}^2` }),
          level: 1,
          expl: raw`Energy conservation gives $v^2 = 2gh$, so the slope is $2g$. The slope here is $\approx ${F.num(sl, 3)}\,\text{m/s}^2$, so $g \approx ${F.num(g, 2)}\,\text{m/s}^2$. Reading the slope itself as $g$ is the trap.`,
        };
      },
    },

    // ============================================================ 7.1.2 Log plots
    {
      id: 'lab.log.powerlaw', sec: '7.1.2', level: 2, weight: 2,
      gen(R) {
        const [nn, nd] = R.pick([[-3, 1], [-2, 1], [-3, 2], [-1, 1], [-1, 2], [1, 2], [1, 1], [3, 2], [2, 1], [3, 1], [4, 1], [1, 3], [2, 3], [-2, 3], [-1, 3], [5, 2], [-5, 2]]);
        const n = nn / nd;
        const k = nd * R.pick(Math.abs(nn) * 2 <= 6 ? [1, 2] : [1]);
        if (Math.abs(n * k) > 6) throw new Error('too steep');
        const a = R.int(-2, 2), cY = R.pick([1, 2, 3, 5]), b = R.int(-3, 3);
        const x1 = Math.pow(10, a), x2 = Math.pow(10, a + k);
        const y1 = cY * Math.pow(10, b), y2 = y1 * Math.pow(10, n * k);
        const xv = R.pick(['x', 'f', 'T', 'r', 'E']), yv = R.pick(['y', 'P', 'I', 'N', 'S'].filter(s => s !== xv));
        const fmt = v => F.num(v, 2);
        // figure (log10 coordinates)
        const P1 = [a, Math.log10(y1)], P2 = [a + k, Math.log10(y2)];
        const xr = [a - 1, a + k + 1];
        const ylo = Math.floor(Math.min(P1[1], P2[1])) - 1, yhi = Math.ceil(Math.max(P1[1], P2[1])) + 1;
        const yr = [ylo, yhi];
        const step = (yhi - ylo) > 8 ? 2 : 1;
        const fig = plotFig({
          xr, yr, xt: Array.from({ length: xr[1] - xr[0] + 1 }, (_, i) => [xr[0] + i, pow10(xr[0] + i)]),
          yt: Array.from({ length: Math.floor((yhi - ylo) / step) + 1 }, (_, i) => [ylo + i * step, pow10(ylo + i * step)]),
          seg: clipSeg(P1, P2, xr, yr), pts: [P1, P2], xl: xv, yl: yv,
        });
        const intro = raw`On a log–log plot, measurements of $${yv}$ versus $${xv}$ fall on a straight line passing through $(${xv}, ${yv}) = (${fmt(x1)},\ ${fmt(y1)})$ and $(${fmt(x2)},\ ${fmt(y2)})$, as shown.`;
        if (R.bool(0.55)) {
          const wr = [[-nn, nd], [nd, nn], [-nd, nn], [2 * nn, nd], [nn, 2 * nd], [nn + nd, nd], [nn - nd, nd], [nn * k, nd]].filter(f => f[1] !== 0).map(f => fr(f[0], f[1]));
          return {
            q: raw`${intro} If $${yv} \propto ${xv}^{\,n}$, what is $n$?`,
            ...GRE.mc(R, fr(nn, nd), wr, { rank: frVal }),
            fig,
            expl: raw`A straight line on a log–log plot is a power law whose exponent is the slope in decades: $n = \dfrac{\log_{10}(${yv}_2/${yv}_1)}{\log_{10}(${xv}_2/${xv}_1)} = \dfrac{${F.num(n * k, 3)}}{${k}} = ${F.frac(nn, nd)}$.`,
          };
        }
        const j = nd * R.pick([1, 2, -1].filter(m => Math.abs(n * nd * m) <= 6 && m * nd !== k));
        const x3 = Math.pow(10, a + j), y3 = y1 * Math.pow(10, n * j);
        return {
          q: raw`${intro} What value of $${yv}$ does the line predict at $${xv} = ${fmt(x3)}$?`,
          ...GRE.numeric(R, y3, [y1 * Math.pow(10, -n * j), y1 * Math.pow(10, j), y1 * Math.pow(10, n * j / 2), y1 * Math.pow(10, n * j + 1), y1 * Math.pow(10, n * j - 1)], { fmt: v => F.num(v, 2) }),
          fig,
          expl: raw`The slope is $n = ${F.frac(nn, nd)}$ (${F.num(n * k, 3)} decades in $${yv}$ over ${k} decade${k > 1 ? 's' : ''} in $${xv}$). Moving ${Math.abs(j)} decade${Math.abs(j) > 1 ? 's' : ''} in $${xv}$ from the first point changes $${yv}$ by $10^{${F.num(n * j, 3)}}$, so $${yv} = ${fmt(y3)}$.`,
        };
      },
    },
    {
      id: 'lab.log.semilog', sec: '7.1.2', level: 2, weight: 2,
      gen(R) {
        const kind = R.pick(['half', 'half', 'decade', 'grow', 'rc']);
        if (kind === 'half') {
          const k = R.int(2, 6), th = R.pick([1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20]);
          const unit = R.pick(['min', 'h', 's', 'days']);
          const R1 = R.pick([1, 2, 3, 5]) * Math.pow(2, k) * R.pick([10, 100, 1000]), R2 = R1 / Math.pow(2, k);
          const t1 = R.pick([0, th, 2 * th]), t2 = t1 + k * th, dt = t2 - t1;
          const tau = th / Math.LN2;
          const askTau = R.bool(0.3);
          const ans = askTau ? tau : th;
          return {
            q: raw`The count rate from a radioactive sample is plotted on a logarithmic vertical axis against time on a linear horizontal axis, giving a straight line. The rate is $${R1}$ counts/s at $t = ${t1}\,\text{${unit}}$ and $${R2}$ counts/s at $t = ${t2}\,\text{${unit}}$. The ${askTau ? 'mean lifetime' : 'half-life'} of the isotope is closest to`,
            ...GRE.numeric(R, ans, [askTau ? th : tau, dt / (R1 / R2), dt, dt * Math.LN2 / k, 2 * dt / k, dt / (k * Math.LN10)], { unit: raw`\text{${unit}}` }),
            expl: raw`A straight line on a semilog plot means exponential decay. The rate falls by a factor $${R1 / R2} = 2^{${k}}$ in $${dt}\,\text{${unit}}$, i.e. ${k} half-lives, so $t_{1/2} = ${th}\,\text{${unit}}$${askTau ? raw` and $\tau = t_{1/2}/\ln 2 \approx 1.44\,t_{1/2} \approx ${F.num(tau, 2)}\,\text{${unit}}$` : ''}.`,
          };
        }
        if (kind === 'decade') {
          const m = R.int(1, 3), dt = R.pick([10, 20, 30, 40, 50, 60, 100]);
          const askTau = R.bool();
          const ans = askTau ? dt / (m * Math.LN10) : dt * Math.log10(2) / m;
          return {
            q: raw`On a semilog plot (logarithmic vertical axis) of the activity of a sample versus time, the data form a straight line that drops by ${m === 1 ? 'one decade (a factor of 10)' : `${m} decades (a factor of $10^{${m}}$)`} over $${dt}\,\text{min}$. The ${askTau ? 'mean lifetime' : 'half-life'} is closest to`,
            ...GRE.numeric(R, ans, [askTau ? dt * Math.log10(2) / m : dt / (m * Math.LN10), dt / (10 * m), dt / (2 * m), dt * Math.LN10 / m, dt / m], { unit: raw`\text{min}` }),
            level: 3,
            expl: raw`$A = A_0e^{-t/\tau}$, so each factor of 10 takes $\tau\ln 10 \approx 2.30\,\tau$. Here ${m} decade${m > 1 ? 's take' : ' takes'} $${dt}\,\text{min}$, so $\tau = ${dt}/(${m}\times 2.30) \approx ${F.num(dt / (m * Math.LN10), 2)}\,\text{min}$${askTau ? '' : raw`, and $t_{1/2} = \tau\ln 2 \approx ${F.num(dt * Math.log10(2) / m, 2)}\,\text{min}$ (equivalently $t_{1/2} = 0.301\,\Delta t/m$)`}.`,
          };
        }
        if (kind === 'grow') {
          const bv = R.pick([0.1, 0.2, 0.25, 0.5, 1, 2]);
          const Cv = R.pick([1, 2, 3, 5]);
          const x2 = R.pick([2, 4, 6, 8, 10, 12, 20].filter(x => Number.isInteger(x * bv) && x * bv <= 6 && x * bv >= 1));
          const y2 = Cv * Math.pow(10, bv * x2);
          return {
            q: raw`Data plotted with a logarithmic $y$ axis and a linear $x$ axis lie on a straight line that passes through $(x, y) = (0,\ ${Cv})$ and $(${x2},\ ${F.num(y2, 2)})$. If the data are described by $y = C\cdot 10^{bx}$, what is $b$?`,
            ...GRE.numeric(R, bv, [bv * Math.LN10, 1 / bv, (y2 - Cv) / x2, bv / Math.LN10, 2 * bv], { fmt: x => F.num(x, 2) }),
            level: 1,
            expl: raw`On a log-linear plot, $\log_{10}y = \log_{10}C + bx$ is a line. The vertical rise is $\log_{10}(${F.num(y2, 2)}/${Cv}) = ${F.num(bv * x2, 2)}$ decades over $\Delta x = ${x2}$, so $b = ${F.num(bv, 2)}$ and $C = ${Cv}$ (the intercept).`,
          };
        }
        const Rv = R.pick([1, 2, 5, 10, 20, 50, 100]) * 1e3;
        const tau = R.pick([0.5, 1, 2, 4, 5, 10, 20]) * 1e-3;
        const Cap = tau / Rv;
        return {
          q: raw`A capacitor discharges through a $${si(Rv, '\\Omega')}$ resistor. A plot of $\ln(V/V_0)$ versus time $t$ is a straight line with slope $${F.num(-1 / tau, 3)}\,\text{s}^{-1}$. The capacitance is closest to`,
          ...GRE.numeric(R, Cap, [1 / (tau * Rv) * 1e-6, tau * Rv * 1e-9, Cap * Math.LN2, Cap / Math.LN2, Cap * Math.LN10], { fmt: x => si(x, '\\text{F}', 2) }),
          expl: raw`$V = V_0e^{-t/RC}$, so $\ln(V/V_0) = -t/RC$ and the slope is $-1/RC$. Thus $RC = ${F.num(tau * 1e3, 2)}\,\text{ms}$ and $C = ${F.num(tau, 2)}/${F.num(Rv, 2)} = ${si(Cap, '\\text{F}', 2)}$.`,
        };
      },
    },
    {
      id: 'lab.log.law', sec: '7.1.2', level: 1, weight: 2,
      gen(R) {
        const [y, x, nn, nd, why] = R.pick(LAWS);
        const swap = R.bool(0.35);
        const [a, b] = swap ? [nd, nn] : [nn, nd];
        const wr = [[-a, b], [b, a], [-b, a], [2 * a, b], [a, 2 * b], [a + b, b], [a - b, b], [3 * a, b]].filter(f => f[1] !== 0).map(f => fr(f[0], f[1]));
        return {
          q: `A log–log plot is made of ${swap ? x : y} (vertical axis) versus ${swap ? y : x} (horizontal axis), with all other quantities held fixed. The plot is a straight line. What is its slope?`,
          ...GRE.mc(R, fr(a, b), wr, { rank: frVal }),
          level: swap ? 2 : 1,
          expl: raw`From ${why}, the vertical-axis quantity is proportional to the horizontal-axis quantity raised to the power $${F.frac(a, b)}$, and on a log–log plot the slope equals that exponent.${swap ? ' Note the axes are inverted relative to the usual form of the law, so the exponent is inverted.' : ''}`,
        };
      },
    },
    {
      id: 'lab.log.linearize', sec: '7.1.2', level: 2,
      gen(R) {
        const [desc, y, x, type] = R.pick(LIN_CASES);
        const valid = LIN_VALID[type];
        const key = R.pick(valid);
        const wr = Object.keys(PLOT).filter(k => valid.indexOf(k) < 0).map(k => PLOT[k](y, x));
        return {
          q: `${desc} Which of the following plots should give a straight line?`,
          ...GRE.mc(R, PLOT[key](y, x), wr),
          expl: LIN_WHY[type](y) + ' None of the other choices is linear for this relation.',
        };
      },
    },

    // ============================================================ 7.2.1 Error analysis
    {
      id: 'lab.err.product', sec: '7.2.1', level: 2, weight: 2,
      gen(R) {
        const P = R.pick(PROP);
        const ps = P.v.map(v => Math.abs(v[1]));
        let a;
        if (P.v.length === 1) a = [R.pick([0.5, 1, 1.5, 2, 3, 4, 5])];
        else if (P.v.length === 2) {
          const t = R.pick([[3, 4], [6, 8], [5, 12], [1.5, 2], [0.6, 0.8], [1, 1], [2, 2], [1, 2], [2, 3], [9, 12], [4, 3], [8, 6], [12, 5], [2, 1.5]]);
          a = [t[0] / ps[0], t[1] / ps[1]];
        } else {
          const t = R.shuffle(R.pick([[2, 3, 6], [1, 4, 8], [2, 6, 9], [4, 4, 7], [2, 2, 1]]));
          a = t.map((c, i) => c / ps[i]);
        }
        if (a.some(v => Math.abs(v * 2 - Math.round(v * 2)) > 1e-9 || v <= 0)) throw new Error('ugly percentage');
        const c = a.map((v, i) => v * ps[i]);
        const ans = Math.sqrt(c.reduce((s, v) => s + v * v, 0));
        const lin = c.reduce((s, v) => s + v, 0);
        const noPow = Math.sqrt(a.reduce((s, v) => s + v * v, 0));
        const wr = P.v.length === 1 ? [a[0], Math.sqrt(ps[0]) * a[0], ps[0] * ps[0] * a[0], a[0] / ps[0], a[0] * (ps[0] + 1)] : [lin, noPow, a.reduce((s, v) => s + v, 0), Math.max(...c), Math.sqrt(c.reduce((s, v) => s + v, 0))];
        const meas = P.v.map((v, i) => `the ${v[0]} with an uncertainty of ${F.num(a[i], 2)}%`);
        return {
          q: `A student determines ${P.f} by measuring ${listJoin(meas)}${P.v.length > 1 ? ' (the uncertainties are independent)' : ''}. The percent uncertainty in the result is closest to`,
          ...GRE.numeric(R, ans, wr, { unit: raw`\%`, tol: 0.1 }),
          level: P.lvl || 2,
          expl: P.v.length === 1
            ? raw`For $f \propto x^{${ps[0]}}$, fractional errors scale with the power: $\sigma_f/f = ${ps[0]}\,\sigma_x/x = ${ps[0]}\times${F.num(a[0], 2)}\% = ${F.num(ans, 2)}\%$. (Quadrature applies to independent errors; one variable raised to a power is fully correlated with itself.)`
            : raw`For a product of powers, fractional uncertainties are multiplied by the powers and added in quadrature: $\sigma_f/f = \sqrt{${c.map(v => `(${F.num(v, 2)}\\%)^2`).join(' + ')}} \approx ${F.num(ans, 2)}\%$. Adding them linearly (${F.num(lin, 2)}%) overestimates; forgetting the powers underestimates.`,
        };
      },
    },
    {
      id: 'lab.err.sum', sec: '7.2.1', level: 1, weight: 2,
      gen(R) {
        const v = R.pick(['diff', 'diff', 'frac', 'chain']);
        if (v === 'chain') {
          const N = R.pick([4, 9, 16, 25, 36, 100]);
          const s = R.pick([0.5, 1, 2, 3]);
          const L = R.pick([1, 2, 0.5]);
          return {
            q: raw`A long hallway is measured by laying a $${L}\,\text{m}$ rod end to end $${N}$ times. Each placement has an independent random uncertainty of $${s}\,\text{mm}$. The uncertainty in the total length is closest to`,
            ...GRE.numeric(R, s * Math.sqrt(N), [s * N, s, s / Math.sqrt(N), s * N / 2], { unit: raw`\text{mm}` }),
            level: 2,
            expl: raw`Independent uncertainties add in quadrature: $\sigma = \sqrt{N}\,\sigma_1 = \sqrt{${N}}\times ${s}\,\text{mm} = ${F.num(s * Math.sqrt(N), 2)}\,\text{mm}$, not $N\sigma_1$ (which assumes the errors are perfectly correlated).`,
          };
        }
        const [s1, s2, s3] = R.pick([[3, 4, 5], [6, 8, 10], [5, 12, 13], [0.3, 0.4, 0.5], [0.6, 0.8, 1.0], [0.5, 1.2, 1.3], [1.5, 2, 2.5], [0.03, 0.04, 0.05], [0.8, 1.5, 1.7], [0.12, 0.16, 0.2]]);
        const [a, b] = R.bool() ? [s1, s2] : [s2, s1];
        const sc = R.pick([
          ['A beaker is weighed empty and then again after a liquid is poured in. The readings are', 'g', 'the mass of the liquid', 'mass', [100, 400]],
          ['The positions of the two ends of a rod are read on a scale as', 'mm', 'the length of the rod', 'length', [200, 900]],
          ['The temperature of a water bath is measured before and after heating as', 'K', 'the temperature rise', 'temperature', [290, 370]],
          ['A photogate records the times at which a cart passes two marks as', 'ms', 'the time interval between the marks', 'time', [100, 900]],
        ]);
        const dec = x => (String(x).split('.')[1] || '').length;
        const dp = Math.max(dec(a), dec(b), dec(s3));
        const x1 = R.int(sc[4][0], (sc[4][0] + sc[4][1]) / 2), dx = R.int(Math.ceil(3 * s3), Math.ceil(40 * s3));
        const x2 = x1 + dx;
        const fx = x => x.toFixed(Math.min(dp, 3));
        if (v === 'frac') {
          const frac = s3 / dx * 100;
          return {
            q: raw`${sc[0]} $${fx(x1)} \pm ${a}\,\text{${sc[1]}}$ and $${fx(x2)} \pm ${b}\,\text{${sc[1]}}$ (independent uncertainties). The percent uncertainty in ${sc[2]} is closest to`,
            ...GRE.numeric(R, frac, [(a + b) / dx * 100, Math.abs(a - b) / dx * 100, s3 / x2 * 100, (a / x1 + b / x2) * 100, Math.sqrt((a / x1) ** 2 + (b / x2) ** 2) * 100], { unit: raw`\%`, tol: 0.15 }),
            level: 2,
            expl: raw`For a difference, absolute uncertainties add in quadrature: $\sigma = \sqrt{${a}^2 + ${b}^2} = ${s3}\,\text{${sc[1]}}$. The difference is only $${fx(dx)}\,\text{${sc[1]}}$, so the fractional uncertainty is $${s3}/${fx(dx)} \approx ${F.num(frac, 2)}\%$ — subtracting nearly equal numbers inflates the relative error.`,
          };
        }
        return {
          q: raw`${sc[0]} $${fx(x1)} \pm ${a}\,\text{${sc[1]}}$ and $${fx(x2)} \pm ${b}\,\text{${sc[1]}}$, with independent uncertainties. The uncertainty in ${sc[2]} is closest to`,
          ...GRE.numeric(R, s3, [a + b, Math.abs(a - b), (a + b) / 2, Math.sqrt(a * b), (a * a + b * b)], { unit: raw`\text{${sc[1]}}`, tol: 0.1 }),
          expl: raw`For a sum or difference, independent uncertainties add in quadrature: $\sigma = \sqrt{(${a})^2 + (${b})^2} = ${s3}\,\text{${sc[1]}}$. Errors do not cancel when values are subtracted.`,
        };
      },
    },
    {
      id: 'lab.err.sem', sec: '7.2.1', level: 2, weight: 2,
      gen(R) {
        const v = R.pick(['sem', 'more', 'more', 'factor']);
        const qty = R.pick([['the period of a pendulum', 's', [0.02, 0.05, 0.1, 0.2]], ['the length of a rod', 'mm', [0.2, 0.5, 1, 2, 3]], ['the resistance of a resistor', '\\Omega', [0.5, 1, 2, 4, 5]], ['the speed of sound', '\\text{m/s}', [2, 3, 4, 5, 6]], ['the mass of a coin', '\\text{mg}', [3, 5, 8, 10, 12]]]);
        const u = qty[1] === 's' || qty[1] === 'mm' ? `\\text{${qty[1]}}` : qty[1];
        if (v === 'sem') {
          const N = R.pick([4, 9, 16, 25, 36, 49, 64, 100, 400]);
          const s = R.pick(qty[2]);
          return {
            q: raw`A student measures ${qty[0]} $${N}$ times. The individual measurements scatter with a standard deviation of $${s}\,${u}$. The uncertainty (standard error) of the mean is closest to`,
            ...GRE.numeric(R, s / Math.sqrt(N), [s / N, s, s * Math.sqrt(N), s / (N - 1), s / Math.sqrt(N - 1) * 2], { unit: u, fmt: x => F.num(x, 2), tol: 0.1 }),
            level: 1,
            expl: raw`The standard error of the mean is $\sigma/\sqrt{N} = ${s}/\sqrt{${N}} = ${F.num(s / Math.sqrt(N), 2)}\,${u}$. The scatter of individual readings stays $${s}\,${u}$ no matter how many are taken.`,
          };
        }
        if (v === 'more') {
          const N = R.pick([5, 8, 10, 12, 20, 25, 50]);
          const k = R.pick([2, 3, 4, 5, 10]);
          const total = R.bool();
          const ans = total ? N * k * k : N * (k * k - 1);
          return {
            q: `A student averages ${N} independent measurements of ${qty[0]}. To reduce the uncertainty of the mean by a factor of ${k}, how many ${total ? 'measurements in total' : 'additional measurements'} are needed?`,
            ...GRE.numeric(R, ans, [total ? N * (k * k - 1) : N * k * k, N * k, N * (k - 1), N * k * k * k, N * Math.sqrt(k), N * 2 * k], { fmt: x => String(Math.round(x)), tol: 0.05 }),
            expl: raw`The uncertainty of the mean scales as $1/\sqrt{N}$, so reducing it by ${k} requires $${k}^2 = ${k * k}$ times as many measurements: $${N * k * k}$ in total${total ? '' : `, i.e. $${N * (k * k - 1)}$ more than the ${N} already taken`}.`,
          };
        }
        const N1 = R.pick([10, 20, 25, 50, 100]), m = R.pick([4, 9, 16, 25, 100, 2]);
        const N2 = N1 * m;
        const fac = Math.sqrt(m);
        const ex = x => { const e = F.exact(x); return e ? `$${e}$` : null; };
        const wr = [1 / m, 1, m, fac, 1 / (2 * fac), 2 / fac, 1 / (fac + 1)].map(ex).filter(Boolean);
        return {
          q: `The number of independent measurements of ${qty[0]} is increased from ${N1} to ${N2}. By what factor does the uncertainty of the mean change?`,
          ...GRE.mc(R, ex(1 / fac), wr, { rank: s => { const t = s.replace(/\$/g, ''); return t === '1' ? 1 : frVal(s) || (t.indexOf('sqrt') >= 0 ? (t.startsWith('\\frac{1}') ? 1 / Math.sqrt(m) : Math.sqrt(m)) : 0); } }),
          level: 1,
          expl: raw`The standard error of the mean scales as $1/\sqrt{N}$; increasing $N$ by a factor of ${m} changes it by $1/\sqrt{${m}} = ${F.exact(1 / fac)}$. The spread of the individual readings (factor 1) does not change.`,
        };
      },
    },
    {
      id: 'lab.err.weighted', sec: '7.2.1', level: 3,
      gen(R) {
        const [sa, sb] = R.pick([[1, 2], [2, 1], [1, 3], [3, 1], [2, 3], [3, 2], [1, 1], [2, 4], [0.1, 0.2], [0.2, 0.1], [0.3, 0.4], [0.5, 1]]);
        const scale = sa < 1 ? 0.1 : 1;
        const x = R.int(80, 200) * scale, y = x + R.sign() * R.int(3, 8) * Math.max(sa, sb);
        const wa = 1 / (sa * sa), wb = 1 / (sb * sb);
        const X = (wa * x + wb * y) / (wa + wb);
        const sX = 1 / Math.sqrt(wa + wb);
        const dp = Math.max(...[sa, sb].map(z => (String(z).split('.')[1] || '').length));
        const fx = v => v.toFixed(dp);
        if (R.bool(0.55) && sa !== sb) {
          const wrong = [(x + y) / 2, (x / sa + y / sb) / (1 / sa + 1 / sb), (sa * sa * x + sb * sb * y) / (sa * sa + sb * sb), (sa * x + sb * y) / (sa + sb), sa < sb ? x : y];
          return {
            q: raw`Two independent experiments measure the same quantity and obtain $${fx(x)} \pm ${sa}$ and $${fx(y)} \pm ${sb}$ (same units). The best combined estimate of the quantity is closest to`,
            ...mcVals(R, X, wrong, v => `$${v.toFixed(dp + 1)}$`, 0.002 / scale * 0.5),
            expl: raw`Weight each result by $1/\sigma^2$: weights $${F.num(wa, 3)}$ and $${F.num(wb, 3)}$, so $\bar{x} = \dfrac{${F.num(wa, 3)}(${fx(x)}) + ${F.num(wb, 3)}(${fx(y)})}{${F.num(wa + wb, 3)}} \approx ${X.toFixed(dp + 1)}$. The plain average ignores that one result is more precise; weighting by $1/\sigma$ or by $\sigma^2$ are common slips.`,
          };
        }
        const wr = [Math.sqrt(sa * sa + sb * sb), (sa + sb) / 2, Math.min(sa, sb), sa * sb / (sa + sb), Math.sqrt(sa * sa + sb * sb) / 2, (sa + sb) / 4];
        return {
          q: raw`Two independent measurements of the same quantity give $${fx(x)} \pm ${sa}$ and $${fx(y)} \pm ${sb}$. The uncertainty of their weighted average is closest to`,
          ...GRE.numeric(R, sX, wr, { fmt: v => F.num(v, 2), tol: 0.06 }),
          expl: raw`For a weighted average, $1/\sigma^2 = 1/\sigma_1^2 + 1/\sigma_2^2 = ${F.num(wa, 3)} + ${F.num(wb, 3)}$, so $\sigma = ${F.num(sX, 2)}$. It is smaller than either individual uncertainty — combining data always helps — unlike the quadrature sum, which is the uncertainty of a sum or difference.`,
        };
      },
    },
    {
      id: 'lab.err.concept', sec: '7.2.1', level: 1, weight: 2,
      gen(R) {
        const v = R.pick(['sys', 'rand', 'roman', 'roman', 'fault']);
        if (v === 'sys' || v === 'rand') {
          const sys = v === 'sys';
          return {
            q: `Which of the following is an example of a ${sys ? 'systematic' : 'random'} error?`,
            ...GRE.mc(R, cap(R.pick(sys ? ERR_SYS : ERR_RAND)), (sys ? ERR_RAND : ERR_SYS).map(cap)),
            expl: 'A systematic error biases every measurement in the same way (a miscalibration, offset, or flawed method) and is not reduced by averaging. A random error scatters results unpredictably from trial to trial and averages down as $1/\\sqrt{N}$.',
          };
        }
        if (v === 'fault') {
          const f = R.pick([['a stopwatch that runs 2% slow', 'timing'], ['a meter stick with 3 mm worn off its end', 'length'], ['a balance that reads 0.3 g too high', 'mass'], ['a thermometer that reads 1.5 K too high', 'temperature'], ['a voltmeter with a +20 mV zero offset', 'voltage']]);
          return {
            q: `A student makes repeated ${f[1]} measurements using ${f[0]}. Compared with a single measurement, the average of many such measurements will`,
            ...GRE.mc(R, 'have a smaller random uncertainty but the same systematic error', ['have both a smaller random uncertainty and a smaller systematic error', 'have a systematic error that decreases as $1/\\sqrt{N}$', 'have a systematic error that decreases as $1/N$', 'have a larger random uncertainty but no systematic error', 'have no error at all once enough measurements are taken']),
            expl: `The faulty instrument introduces a systematic error: every reading is shifted the same way, so averaging cannot remove it (it must be fixed by recalibration). Averaging only reduces the random scatter, by $1/\\sqrt{N}$.`,
          };
        }
        const r = romanFrom(R, 'Which of the following statements about experimental uncertainties is (are) true?', ERR_T, ERR_F);
        return { q: r.q, choices: r.choices, ans: r.ans, level: 2, expl: 'Random uncertainty of a mean falls as $1/\\sqrt{N}$, systematic errors do not average away, independent errors add in quadrature, and precision (small spread) is distinct from accuracy (closeness to the true value). ' + r.tags };
      },
    },
    {
      id: 'lab.err.gauss', sec: '7.2.1', level: 1,
      gen(R) {
        const [mu, sg, unit, dp, what] = R.pick([[50.0, 0.4, 'cm', 1, 'the length of a rod'], [9.80, 0.05, 'm/s^2', 2, 'the free-fall acceleration'], [2.00, 0.02, 's', 2, 'the period of a pendulum'], [120, 3, 'g', 0, 'the mass of a sample'], [340, 4, 'm/s', 0, 'the speed of sound'], [1.50, 0.03, 'V', 2, 'a battery voltage'], [75.0, 1.5, '\\Omega', 1, 'a resistance']]);
        const u = unit === '\\Omega' ? '\\Omega' : `\\text{${unit.replace('^2', '}^2\\text{')}}`.replace('\\text{}', '');
        const aT = k => `$${(mu + k * sg).toFixed(dp)}\\,${u}$`;
        const sT = k => `$${F.num(k * sg, 3)}\\,${u}$`;
        const idx = R.int(0, GAUSS.length - 1);
        const g = GAUSS[idx];
        const N = R.pick([200, 400, 500, 1000, 2000]);
        const asCount = R.bool(0.6);
        const others = R.shuffle(GAUSS.filter((_, i) => i !== idx).map(x => x[1]));
        const chosen = [];
        for (const p of others) if ([g[1]].concat(chosen).every(q => Math.abs(p - q) > 0.15 * Math.max(p, q))) chosen.push(p);
        const fmt = p => asCount ? `$${Math.round(p * N)}$` : `$${F.num(p * 100, 2)}\\%$`;
        return {
          q: `Repeated measurements of ${what} follow a Gaussian distribution with mean $${mu.toFixed(dp)}\\,${u}$ and standard deviation $${F.num(sg, 3)}\\,${u}$. ${asCount ? `Of ${N} measurements, about how many give values` : 'What fraction of the measurements give values'} ${g[0](aT, sT)}?`,
          ...GRE.mc(R, fmt(g[1]), chosen.map(fmt), { rank: s => parseFloat(s.replace(/[^0-9.]/g, '')) }),
          expl: `Express the limits in units of $\\sigma$ and use the Gaussian rules of thumb (68% within $\\pm1\\sigma$, 95% within $\\pm2\\sigma$, 99.7% within $\\pm3\\sigma$): ${g[2]}${asCount ? `, i.e. about ${Math.round(g[1] * N)} of ${N}` : ''}.`,
        };
      },
    },

    // ============================================================ 7.2.2 Poisson processes
    {
      id: 'lab.poisson.prob', sec: '7.2.2', level: 2, weight: 2,
      gen(R) {
        const src = R.pick([['A Geiger counter near a weak source clicks', 'clicks'], ['Cosmic-ray muons pass through a small detector', 'muons'], ['Photons from a faint star arrive at a photomultiplier', 'photons'], ['A long-lived radioactive sample produces decays', 'decays'], ['Neutrinos are recorded in a large detector', 'events']]);
        const tu = R.pick([['second', 's'], ['minute', 'min'], ['hour', 'h']]);
        const r = R.pick([0.5, 1, 1.5, 2, 2.5, 3, 4, 0.25]);
        const t = R.pick([1, 2, 3, 4, 6, 8].filter(tt => Number.isInteger(r * tt) && r * tt <= 8 && r * tt >= 1));
        const L = r * t;
        const mode = R.pick(['exact', 'exact', 'exact', 'atleast', 'atmost', 'observed']);
        if (mode === 'atleast' || mode === 'atmost') {
          const most = mode === 'atmost';
          const corr = most ? `$(1 + ${L})e^{-${L}}$` : `$1 - e^{-${L}}$`;
          const wr = most ? [`$${L}e^{-${L}}$`, `$e^{-${L}}$`, `$1 - ${L}e^{-${L}}$`, `$1 - e^{-${L}}$`, `$(1 + ${L} + ${F.frac(L * L, 2)})e^{-${L}}$`] : [`$e^{-${L}}$`, `$${L}e^{-${L}}$`, `$1 - ${L}e^{-${L}}$`, `$${L}e^{-1}$`, `$1 - e^{-${r}}$`];
          return {
            q: raw`${src[0]} at an average rate of $${r}$ per ${tu[0]}, independently and at random. What is the probability of recording ${most ? 'at most one' : 'at least one'} in a $${t}$-${tu[0]} interval?`,
            ...GRE.mc(R, corr, wr),
            expl: raw`The mean in the interval is $\lambda = ${r}\times${t} = ${L}$ and $P(n) = \lambda^ne^{-\lambda}/n!$. ${most ? raw`$P(0) + P(1) = e^{-${L}} + ${L}e^{-${L}} = (1 + ${L})e^{-${L}}$.` : raw`$P(n \ge 1) = 1 - P(0) = 1 - e^{-${L}}$.`}`,
          };
        }
        let lam = L, intro;
        if (mode === 'observed') {
          const T0 = R.pick([5, 10, 20, 30]), N0 = R.pick([1, 2, 3, 4, 5, 6]);
          const T1s = [T0, T0 * 2, T0 / 5 * 2, T0 / 2].filter(x => Number.isInteger(x) && Number.isInteger(N0 * x / T0) && N0 * x / T0 >= 1 && N0 * x / T0 <= 8);
          if (!T1s.length) throw new Error('no window');
          const T1 = R.pick(T1s);
          lam = N0 * T1 / T0;
          intro = raw`A student near a radioactive source records $${N0}$ counts in a $${T0}$-second interval. Using this as the best estimate of the mean rate, what is the probability of recording exactly`;
          const k = R.int(0, Math.min(4, lam + 2));
          const kq = `$${k}$ count${k === 1 ? '' : 's'} in a subsequent $${T1}$-second interval?`;
          return this.finish(R, `${intro} ${kq}`, lam, k, N0 / T0, null);
        }
        const k = R.int(0, Math.min(4, L + 2));
        intro = raw`${src[0]} at an average rate of $${r}$ per ${tu[0]}. Assuming Poisson statistics, what is the probability of recording exactly $${k}$ ${k === 1 ? src[1].replace(/s$/, '').replace(/che$/, 'ch') : src[1]} in a $${t}$-${tu[0]} interval?`;
        return this.finish(R, intro, lam, k, r, t);
      },
      finish(R, q, L, k, r, t) {
        const P = j => `$${eTerm(Math.pow(L, j), fact(j), L)}$`;
        const corr = P(k);
        const wr = [];
        if (k >= 2) wr.push(`$${eTerm(Math.pow(L, k), 1, L)}$`);
        if (k >= 1 && k !== L) wr.push(`$${eTerm(Math.pow(L, k), fact(k), k)}$`);
        if (Number.isInteger(r) && r !== L && r >= 1) wr.push(`$${eTerm(Math.pow(r, k), fact(k), r)}$`);
        if (k >= 1) wr.push(P(k - 1));
        wr.push(P(k + 1), P(k + 2), `$1 - e^{-${L}}$`);
        if (k === 0) wr.push(`$e^{-1/${L}}$`);
        if (k >= 2 && L >= 2) wr.push(`$${eTerm(Math.pow(k, L), fact(L), k)}$`);
        return {
          q, ...GRE.mc(R, corr, wr),
          expl: raw`The expected number in the interval is $\lambda = ${L}$${t ? ` (rate × time)` : ''}. Poisson: $P(${k}) = \dfrac{\lambda^{${k}}e^{-\lambda}}{${k}!} = ${eTerm(Math.pow(L, k), fact(k), L)}$. Using the rate per unit time instead of the mean for the whole interval, or dropping the $k!$, are the usual slips.`,
        };
      },
    },
    {
      id: 'lab.poisson.time', sec: '7.2.2', level: 2, weight: 2,
      gen(R) {
        const f = R.pick([[10, 100], [5, 400], [2, 2500], [1, 10000], [20, 25], [4, 625], [0.5, 40000]]);
        const N = f[1];
        if (R.bool()) {
          const rate = R.pick([2, 4, 5, 10, 20, 25, 50, 100, 200, 400]);
          const t = N / rate;
          return {
            q: raw`A radioactive source produces about $${rate}$ counts per second in a detector (background negligible). For how long must the student count to measure the count rate with a statistical uncertainty of $${f[0]}\%$?`,
            ...GRE.numeric(R, t, [Math.sqrt(N) / rate, 100 / f[0] / rate, 2 * t, t / 2, t * f[0] / 100 * 10], { unit: raw`\text{s}` }),
            expl: raw`For $N$ counts the fractional uncertainty is $1/\sqrt{N}$. Requiring $1/\sqrt{N} = ${f[0] / 100}$ gives $N = ${N}$ counts, which takes $${N}/${rate} = ${F.num(t, 3)}\,\text{s}$.`,
          };
        }
        const N1 = R.pick([25, 100, 400, 2500].filter(n => n < N).concat(N === 25 ? [4, 9] : []));
        const t1 = R.pick([10, 20, 30, 60, 100]);
        const tTot = t1 * N / N1;
        const extra = R.bool();
        const ans = extra ? tTot - t1 : tTot;
        return {
          q: raw`A student counts a long-lived source for $${t1}\,\text{s}$ and records $${N1}$ counts. To measure the count rate to $${f[0]}\%$ precision, ${extra ? 'how much longer must the student continue counting' : 'what total counting time is required'}?`,
          ...GRE.numeric(R, ans, [extra ? tTot : tTot - t1, t1 * Math.sqrt(N / N1), t1 * Math.sqrt(N / N1) - t1, t1 * N / N1 * 2, t1 * (100 / f[0]) / Math.sqrt(N1)], { unit: raw`\text{s}`, tol: 0.1, sig: 3 }),
          expl: raw`${f[0]}% precision needs $N = 1/(${f[0] / 100})^2 = ${N}$ counts. The rate is $${N1}/${t1} = ${F.num(N1 / t1, 3)}$ counts/s, so the total time is $${N}/${F.num(N1 / t1, 3)} = ${F.num(tTot, 3)}\,\text{s}$${extra ? raw`, i.e. $${F.num(tTot - t1, 3)}\,\text{s}$ more than already spent` : ''}.`,
        };
      },
    },
    {
      id: 'lab.poisson.background', sec: '7.2.2', level: 3,
      gen(R) {
        if (R.bool()) {
          const [Nt, Nb] = R.pick([[900, 400], [1600, 900], [2500, 900], [400, 100], [3600, 1600], [10000, 3600], [625, 225], [1600, 400], [6400, 3600], [4900, 1600]]);
          const T = R.pick([60, 100, 200, 300, 600]);
          const sig = Math.sqrt(Nt + Nb);
          return {
            q: raw`With a sample in place, a detector records $${Nt}$ counts in $${T}\,\text{s}$. With the sample removed, it records $${Nb}$ background counts in the same time. The statistical uncertainty in the net number of counts due to the sample is closest to`,
            ...GRE.numeric(R, sig, [Math.sqrt(Nt - Nb), Math.sqrt(Nt), Math.sqrt(Nt) + Math.sqrt(Nb), Math.sqrt(Nt) - Math.sqrt(Nb), Nt - Nb], { tol: 0.1 }),
            expl: raw`The net count is $${Nt} - ${Nb} = ${Nt - Nb}$. Each count has Poisson uncertainty $\sqrt{N}$, and for a difference these add in quadrature: $\sigma = \sqrt{${Nt} + ${Nb}} \approx ${F.num(sig, 2)}$, not $\sqrt{${Nt - Nb}}$.`,
          };
        }
        const t1 = R.pick([100, 200, 400]), t2 = R.pick([100, 200, 400, 1000]);
        const r1 = R.pick([4, 9, 16, 25]), r2 = R.pick([1, 2, 3]);
        const N1 = r1 * t1, N2 = r2 * t2;
        const sig = Math.sqrt(N1 / (t1 * t1) + N2 / (t2 * t2));
        return {
          q: raw`A detector records $${N1}$ counts in $${t1}\,\text{s}$ with a source present, and $${N2}$ background counts in $${t2}\,\text{s}$ with the source removed. The net count rate due to the source is $${r1 - r2}\,\text{s}^{-1}$ with a statistical uncertainty closest to`,
          ...GRE.numeric(R, sig, [Math.sqrt(N1 - N2) / t1, Math.sqrt(r1 - r2), Math.sqrt(N1) / t1 + Math.sqrt(N2) / t2, Math.sqrt(N1 + N2) / (t1 + t2), Math.sqrt(r1 + r2)], { unit: raw`\text{s}^{-1}`, tol: 0.1 }),
          expl: raw`Each rate has uncertainty $\sqrt{N}/t$: $\sqrt{${N1}}/${t1} = ${F.num(Math.sqrt(N1) / t1, 2)}$ and $\sqrt{${N2}}/${t2} = ${F.num(Math.sqrt(N2) / t2, 2)}\,\text{s}^{-1}$. For the difference they add in quadrature: $\sigma \approx ${F.num(sig, 2)}\,\text{s}^{-1}$.`,
        };
      },
    },
    {
      id: 'lab.poisson.rate', sec: '7.2.2', level: 1, weight: 2,
      gen(R) {
        const v = R.pick(['rate', 'rate', 'frac', 'scale']);
        if (v === 'scale') {
          const k = R.pick([4, 9, 16, 25, 100, 2, 3]);
          const what = R.pick(['counting time', 'detector area (at the same distance, so the count rate is proportional to area)']);
          const ex = x => `$${F.exact(x)}$`;
          const wr = [1 / k, k, Math.sqrt(k), 1 / (2 * Math.sqrt(k)), 2 / Math.sqrt(k), 1].map(ex);
          return {
            q: `In a counting experiment the ${what} is increased by a factor of ${k}. By what factor does the fractional statistical uncertainty in the measured count rate change?`,
            ...GRE.mc(R, ex(1 / Math.sqrt(k)), wr),
            level: 2,
            expl: raw`The number of counts grows by ${k}, and the fractional uncertainty is $1/\sqrt{N}$, so it changes by $1/\sqrt{${k}} = ${F.exact(1 / Math.sqrt(k))}$.`,
          };
        }
        const N = R.pick([100, 400, 900, 1600, 2500, 3600, 10000, 225, 625, 8100]);
        const t = R.pick([10, 20, 50, 100, 200, 300]);
        if (v === 'frac') {
          return {
            q: raw`A counter records $${N}$ counts from a radioactive source in $${t}\,\text{s}$. The fractional statistical uncertainty in the count rate is closest to`,
            ...GRE.numeric(R, 100 / Math.sqrt(N), [100 / N, 100 * Math.sqrt(t) / N, 100 / Math.sqrt(N / t), 100 / (2 * Math.sqrt(N))], { unit: raw`\%`, tol: 0.15 }),
            expl: raw`Poisson: $\sigma_N = \sqrt{N} = ${Math.sqrt(N)}$, so $\sigma_N/N = 1/\sqrt{${N}} = ${F.num(100 / Math.sqrt(N), 2)}\%$. Dividing by the (exactly known) time does not change the fractional uncertainty.`,
          };
        }
        const rate = N / t, s = Math.sqrt(N) / t;
        const fmt = (a, b) => `$${F.num(a, 3)} \\pm ${F.num(b, 2)}\\,\\text{s}^{-1}$`;
        const wr = [fmt(rate, Math.sqrt(rate)), fmt(rate, Math.sqrt(N)), fmt(rate, 1 / Math.sqrt(N)), fmt(rate, Math.sqrt(N) / t / Math.sqrt(t)), fmt(rate, N / t / 10), fmt(N, Math.sqrt(N))];
        return {
          q: raw`A detector records $${N}$ counts in $${t}\,\text{s}$. Which of the following is the best statement of the count rate and its statistical uncertainty?`,
          ...GRE.mc(R, fmt(rate, s), wr),
          expl: raw`The count is $${N} \pm \sqrt{${N}} = ${N} \pm ${Math.sqrt(N)}$; dividing both by $t = ${t}\,\text{s}$ gives $${F.num(rate, 3)} \pm ${F.num(s, 2)}\,\text{s}^{-1}$. Taking $\sqrt{\text{rate}}$ is the classic mistake — the square root must be taken of the number of counts.`,
        };
      },
    },
    {
      id: 'lab.poisson.zero', sec: '7.2.2', level: 2,
      gen(R) {
        const v = R.pick(['zero', 'wait', 'roman', 'roman']);
        if (v === 'roman') {
          const r = romanFrom(R, 'Counts from a detector exposed to a steady radioactive source obey Poisson statistics. Which of the following is (are) true?', POIS_T, POIS_F);
          return { q: r.q, choices: r.choices, ans: r.ans, expl: 'For a Poisson process, the variance equals the mean (so $\\sigma = \\sqrt{\\lambda}$), $P(0) = e^{-\\lambda}$, waiting times are exponential and memoryless, counts in disjoint intervals are independent, and for large $\\lambda$ the distribution approaches a Gaussian. ' + r.tags };
        }
        const r = R.pick([0.5, 1, 2, 3, 4, 5, 0.2, 0.25]);
        if (v === 'wait') {
          const tu = R.pick(['s', 'min']);
          return {
            q: raw`Particles arrive at a detector randomly at an average rate of $${r}$ per ${tu === 's' ? 'second' : 'minute'}. The mean time between successive arrivals is`,
            ...GRE.numeric(R, 1 / r, [r, Math.LN2 / r, 2 / r, 1 / (2 * r), Math.E / r], { unit: raw`\text{${tu}}` }),
            level: 1,
            expl: raw`Waiting times in a Poisson process are exponentially distributed, $p(t) = re^{-rt}$, with mean $1/r = ${F.num(1 / r, 3)}\,\text{${tu}}$.`,
          };
        }
        const t = R.pick([1, 2, 3, 4, 5, 10, 20].filter(tt => Number.isInteger(r * tt) && r * tt >= 1 && r * tt <= 6));
        const L = r * t;
        const none = R.bool();
        const corr = none ? `$e^{-${L}}$` : `$1 - e^{-${L}}$`;
        const wr = [none ? `$1 - e^{-${L}}$` : `$e^{-${L}}$`, `$${L}e^{-${L}}$`, `$e^{-${r}}$`, `$1 - ${L}e^{-${L}}$`, `$e^{-1/${L}}$`, `$${F.frac(1, L + 1)}$`];
        return {
          q: raw`A detector records background events at random with an average rate of $${r}\,\text{s}^{-1}$. What is the probability that ${none ? 'no events are recorded' : 'at least one event is recorded'} during a $${t}\,\text{s}$ interval?`,
          ...GRE.mc(R, corr, wr),
          expl: raw`The mean number in the interval is $\lambda = rt = ${L}$, and the Poisson probability of zero events is $P(0) = e^{-\lambda} = e^{-${L}}$${none ? '' : raw`; so at least one event has probability $1 - e^{-${L}}$`}.`,
        };
      },
    },

    // ============================================================ 7.3.1 AC behavior of basic circuit elements
    {
      id: 'lab.ac.filter', sec: '7.3.1', level: 1,
      gen(R) {
        const key = R.pick(Object.keys(FILTERS));
        const [ser, sh, type, ph] = FILTERS[key];
        const corner = ser === 'L' || sh === 'L' ? 'R/L' : '1/RC';
        const intro = raw`In the circuit shown, a sinusoidal input voltage $V_{in}$ of angular frequency $\omega$ is applied across ${ser === 'L' ? 'an' : 'a'} ${ELNAME[ser]} in series with ${sh === 'L' ? 'an' : 'a'} ${ELNAME[sh]}, and the output $V_{out}$ is taken across the ${ELNAME[sh].replace(/ \$.*\$/, '')}.`;
        const fig = dividerFig(ser, sh);
        const why = sh === 'C' ? 'the capacitor’s impedance $1/\\omega C$ is huge at low frequency and tiny at high frequency'
          : sh === 'L' ? 'the inductor’s impedance $\\omega L$ is tiny at low frequency and huge at high frequency'
            : ser === 'C' ? 'the series capacitor blocks low frequencies ($1/\\omega C$ large) and passes high ones'
              : 'the series inductor passes low frequencies ($\\omega L$ small) and blocks high ones';
        const v = R.pick(['type', 'type', 'low', 'high', 'corner', 'phase', 'phaseLim']);
        const LIM = ['$0$', '$1$', '$\\frac{1}{2}$', '$\\frac{1}{\\sqrt{2}}$', '$2$'];
        if (v === 'type') {
          return {
            q: `${intro} This circuit acts as a`, fig,
            ...GRE.mc(R, `${type}-pass filter`, [`${type === 'low' ? 'high' : 'low'}-pass filter`, 'band-pass filter', 'band-stop (notch) filter', 'circuit that attenuates all frequencies equally']),
            expl: `The output is the voltage across the ${ELNAME[sh]}; ${why}. Hence low frequencies ${type === 'low' ? 'reach' : 'are blocked from'} the output and high frequencies ${type === 'low' ? 'are blocked' : 'pass'}: a ${type}-pass filter.`,
          };
        }
        if (v === 'low' || v === 'high') {
          const passes = (v === 'low') === (type === 'low');
          return {
            q: raw`${intro} In the limit of ${v === 'low' ? 'very low' : 'very high'} frequency, the ratio $|V_{out}/V_{in}|$ approaches`, fig,
            ...GRE.mc(R, passes ? '$1$' : '$0$', LIM),
            expl: `This is a ${type}-pass filter: ${why}. So at ${v} frequency the ratio tends to ${passes ? '1' : '0'}.`,
          };
        }
        if (v === 'corner') {
          return {
            q: raw`${intro} At the angular frequency $\omega = ${corner}$, the ratio $|V_{out}/V_{in}|$ is`, fig, level: 2,
            ...GRE.mc(R, '$\\frac{1}{\\sqrt{2}}$', ['$0$', '$1$', '$\\frac{1}{2}$', '$\\sqrt{2}$', '$\\frac{1}{4}$']),
            expl: raw`At $\omega = ${corner}$ the reactance equals $R$, so the divider ratio is $\dfrac{1}{|1 \pm i|} = \dfrac{1}{\sqrt{2}}$ (the −3 dB point; half the power). This holds for both low- and high-pass versions.`,
          };
        }
        const PH = { 45: 'leads $V_{in}$ by $45^\\circ$', '-45': 'lags $V_{in}$ by $45^\\circ$', 0: 'is in phase with $V_{in}$', 90: 'leads $V_{in}$ by $90^\\circ$', '-90': 'lags $V_{in}$ by $90^\\circ$' };
        const PHW = Object.keys(PH).map(k => PH[k]);
        if (v === 'phase') {
          return {
            q: raw`${intro} At the angular frequency $\omega = ${corner}$, the output voltage`, fig, level: 2,
            ...GRE.mc(R, PH[ph], PHW),
            expl: raw`The transfer function is $${ph < 0 ? (sh === 'C' ? '1/(1 + i\\omega RC)' : 'R/(R + i\\omega L)') : (sh === 'R' ? 'i\\omega RC/(1 + i\\omega RC)' : 'i\\omega L/(R + i\\omega L)')}$. At $\omega = ${corner}$ this is $${ph < 0 ? '1/(1 + i)' : 'i/(1 + i)'}$, whose phase is $${ph}^\circ$: the output ${PH[ph].replace(/\$V_\{in\}\$ /, '')}.`,
          };
        }
        const hi = R.bool();
        const lim = type === 'low' ? (hi ? -90 : 0) : (hi ? 0 : 90);
        return {
          q: raw`${intro} In the limit of ${hi ? 'very high' : 'very low'} frequency (where the output is still nonzero), the phase of $V_{out}$ relative to $V_{in}$ is such that $V_{out}$`, fig, level: 3,
          ...GRE.mc(R, PH[lim], PHW),
          expl: `With $\\tau$ the circuit’s time constant, a ${type}-pass filter’s transfer function behaves as ${lim === 0 ? '1 deep in its passband, so the output is in phase with the input' : lim > 0 ? '$i\\omega\\tau$ far below the corner, a phase of $+90^\\circ$ (the output leads)' : '$1/(i\\omega\\tau)$ far above the corner, a phase of $-90^\\circ$ (the output lags)'}.`,
        };
      },
    },
    {
      id: 'lab.ac.cutoff', sec: '7.3.1', level: 2, weight: 2,
      gen(R) {
        const rc = R.bool(0.65);
        const Rv = R.pick(rc ? [100, 200, 500, 1e3, 2e3, 5e3, 1e4, 2e4, 5e4, 1e5] : [10, 20, 50, 100, 200, 500, 1e3]);
        const X = rc ? R.pick([1e-9, 2e-9, 5e-9, 1e-8, 2e-8, 1e-7, 2e-7, 5e-7, 1e-6, 2e-6, 1e-5]) : R.pick([1e-3, 2e-3, 5e-3, 1e-2, 2e-2, 5e-2, 0.1, 0.2, 0.5]);
        const wc = rc ? 1 / (Rv * X) : Rv / X;
        const fc = wc / (2 * PI);
        if (wc < 10 || wc > 1e8) throw new Error('range');
        const el = rc ? raw`$C = ${si(X, '\\text{F}')}$` : raw`$L = ${si(X, '\\text{H}')}$`;
        const v = R.pick(['f', 'f', 'w', 'ratio']);
        const kind = R.pick(['low-pass', 'high-pass']);
        if (v === 'ratio') {
          const [a, b] = R.pick([[2, 1], [1, 2], [3, 1], [1, 3], [4, 1], [1, 4], [2, 2], [2, 0.5], [4, 0.5]]);
          const ratio = rc ? 1 / (a * b) : a / b;
          const ex = x => { const e = F.exact(x); return e ? `$${e}$` : null; };
          const wr = [1 / ratio, ratio * 2, ratio / 2, rc ? a * b : b / a, Math.sqrt(ratio), 1].map(ex).filter(Boolean);
          const ch = (n, k) => k === 1 ? `${n} is unchanged` : `${n} is ${k > 1 ? 'increased' : 'reduced'} by a factor of ${k > 1 ? k : 1 / k}`;
          if (a === 1 && b === 1) throw new Error('trivial');
          return {
            q: `In an ${rc ? 'RC' : 'RL'} ${kind} filter, the resistance ${ch('', a).replace(/^ is /, 'is ')} and the ${rc ? 'capacitance' : 'inductance'} ${ch('', b).replace(/^ is /, 'is ')}. By what factor does the cutoff frequency change?`,
            ...GRE.mc(R, ex(ratio), wr),
            expl: raw`The cutoff is $\omega_c = ${rc ? '1/RC' : 'R/L'}$, so it changes by a factor ${rc ? raw`$1/(${a}\times${b})$` : raw`$${a}/${b}$`} $= ${F.exact(ratio)}$.`,
          };
        }
        const askF = v === 'f';
        const ans = askF ? fc : wc;
        const wr = askF ? [wc, 2 * PI * wc, fc / (2 * PI), 1 / (PI * (rc ? Rv * X : X / Rv)), Math.sqrt(wc) ] : [fc, 2 * PI * wc, wc / 2, wc * Math.SQRT2];
        return {
          q: raw`An ${rc ? 'RC' : 'RL'} ${kind} filter is built from $R = ${si(Rv, '\\Omega')}$ and ${el}. The ${askF ? 'cutoff (−3 dB) frequency $f_c$' : 'cutoff angular frequency $\\omega_c$'} is closest to`,
          ...GRE.numeric(R, ans, wr, { fmt: x => si(x, askF ? '\\text{Hz}' : '\\text{rad/s}', 2) }),
          expl: raw`The corner is where the reactance equals $R$: $\omega_c = ${rc ? '1/RC' : 'R/L'} = ${si(wc, '\\text{rad/s}', 3)}$${askF ? raw`, so $f_c = \omega_c/2\pi \approx ${si(fc, '\\text{Hz}', 2)}$. Forgetting the $2\pi$ is the usual slip` : ''}. The same formula holds for the low- and high-pass arrangements.`,
        };
      },
    },
    {
      id: 'lab.ac.impedance', sec: '7.3.1', level: 2, weight: 2,
      gen(R) {
        const [a, b, c] = R.pick([[3, 4, 5], [4, 3, 5], [6, 8, 10], [8, 6, 10], [5, 12, 13], [12, 5, 13], [8, 15, 17], [15, 8, 17], [7, 24, 25], [24, 7, 25], [20, 21, 29], [21, 20, 29]]);
        const s = R.pick([1, 10, 100]);
        const Rv = a * s, X = b * s, Z = c * s;
        const type = R.pick(['RL', 'RC', 'RLC', 'RLC']);
        const w = R.pick([100, 200, 500, 1000, 2000, 5000, 1e4, 1e5, 1e6]);
        let XL = 0, XC = 0, sign;
        if (type === 'RL') { XL = X; sign = 1; }
        else if (type === 'RC') { XC = X; sign = -1; }
        else {
          sign = R.sign();
          const base = R.pick([1, 2, 3, 4, 5]) * s * R.pick([1, 2, 5, 10]);
          if (sign > 0) { XC = base; XL = base + X; } else { XL = base; XC = base + X; }
        }
        const nice = x => Math.abs(+x.toPrecision(3) - x) < 1e-9 * x;
        const Lh = XL / w, Cf = XC ? 1 / (w * XC) : 0;
        if ((XL && !nice(Lh)) || (XC && !nice(Cf))) throw new Error('ugly');
        const parts = [`a $${si(Rv, '\\Omega')}$ resistor`];
        if (XL) parts.push(`a $${si(Lh, '\\text{H}')}$ inductor`);
        if (XC) parts.push(`a $${si(Cf, '\\text{F}')}$ capacitor`);
        const src = raw`A sinusoidal source of angular frequency $\omega = ${si(w, '\\text{rad/s}')}$ drives ${listJoin(parts)} connected in series.`;
        const work = raw`$X_L = \omega L = ${XL}\,\Omega$, $X_C = 1/\omega C = ${XC}\,\Omega$`.replace(XL ? '' : raw`$X_L = \omega L = 0\,\Omega$, `, '').replace(XC ? '' : raw`, $X_C = 1/\omega C = 0\,\Omega$`, '');
        const v = R.pick(['Z', 'I', 'phase']);
        if (v === 'phase') {
          const deg = Math.round(Math.atan(b / a) * 180 / PI);
          const other = 90 - deg;
          const P = (d, lag) => `The current ${lag ? 'lags' : 'leads'} the source voltage by about $${d}^\\circ$.`;
          return {
            q: `${src} Which of the following describes the phase of the current?`,
            ...GRE.mc(R, P(deg, sign > 0), [P(deg, sign < 0), P(other, sign > 0), P(other, sign < 0), 'The current is in phase with the source voltage.', P(90, sign > 0)]),
            level: 3,
            expl: raw`${work}, so the net reactance is $X_L - X_C = ${XL - XC}\,\Omega$ and $\tan\phi = |X_L - X_C|/R = ${b}/${a}$, giving $\phi \approx ${deg}^\circ$. The circuit is ${sign > 0 ? 'inductive, so the current lags' : 'capacitive, so the current leads'} the voltage.`,
          };
        }
        const wrZ = [Rv + X, Rv + XL + XC, Math.sqrt(Rv * Rv + XL * XL + XC * XC), X, Rv, Math.sqrt(Rv * Rv + (XL + XC) ** 2)];
        if (v === 'Z') {
          return {
            q: `${src} The magnitude of the circuit’s impedance is`,
            ...GRE.numeric(R, Z, wrZ, { unit: raw`\Omega`, fmt: x => F.num(x, 3), tol: 0.06 }),
            expl: raw`${work}. Then $|Z| = \sqrt{R^2 + (X_L - X_C)^2} = \sqrt{${Rv}^2 + ${Math.abs(XL - XC)}^2} = ${Z}\,\Omega$. Reactances subtract (they are $90^\circ$ out of phase with each other) and combine with $R$ in quadrature.`,
          };
        }
        const V0 = R.pick([5, 10, 12, 20, 50, 100, 120, 130, 170, 200, 260]);
        const I0 = V0 / Z;
        return {
          q: `${src} If the source voltage amplitude is $${V0}\\,\\text{V}$, the amplitude of the current is`,
          ...GRE.numeric(R, I0, wrZ.map(z => V0 / z), { fmt: x => si(x, '\\text{A}', 2), tol: 0.06 }),
          expl: raw`${work}, so $|Z| = \sqrt{${Rv}^2 + ${Math.abs(XL - XC)}^2} = ${Z}\,\Omega$ and $I_0 = V_0/|Z| = ${V0}/${Z} \approx ${si(I0, '\\text{A}', 2)}$.`,
        };
      },
    },
    {
      id: 'lab.ac.resonance', sec: '7.3.1', level: 2, weight: 2,
      gen(R) {
        const v = R.pick(['f', 'w', 'C', 'ratio', 'concept']);
        if (v === 'concept') {
          const T = ['The impedance equals $R$, its minimum value.', 'The current is in phase with the source voltage.', 'The voltages across $L$ and $C$ are equal in magnitude and opposite in phase.', 'The current amplitude is a maximum.'];
          const Fs = ['The impedance is a maximum.', 'The current lags the source voltage by $90^\\circ$.', 'The voltage across the capacitor is zero.', 'The current is zero.', 'The average power delivered by the source is zero.', 'The current leads the source voltage by $90^\\circ$.'];
          return {
            q: 'A series RLC circuit is driven by a sinusoidal source at its resonant frequency $\\omega_0 = 1/\\sqrt{LC}$. Which of the following is true?',
            ...GRE.mc(R, R.pick(T), Fs), level: 1,
            expl: 'At resonance $X_L = X_C$, so the reactances cancel: $Z = R$ (minimum), the current is maximal and in phase with the source, and $V_L = -V_C$ (equal and opposite). All the average power goes into $R$.',
          };
        }
        if (v === 'ratio') {
          const [kL, kC] = R.pick([[1, 4], [4, 1], [1, 9], [2, 2], [1, 2], [2, 1], [4, 4], [9, 1], [1, 16], [2, 8]]);
          const ratio = 1 / Math.sqrt(kL * kC);
          const ex = x => { const e = F.exact(x); return e ? `$${e}$` : null; };
          const wr = [1 / ratio, 1 / (kL * kC), kL * kC, Math.sqrt(kC / kL), Math.sqrt(kL / kC), 1].map(ex).filter(Boolean);
          const say = (n, k) => (k === 1 ? `the ${n} is unchanged` : `the ${n} is multiplied by ${k}`);
          return {
            q: `In an LC circuit, ${say('inductance', kL)} and ${say('capacitance', kC)}. By what factor does the resonant frequency change?`,
            ...GRE.mc(R, ex(ratio), wr), level: 1,
            expl: raw`$\omega_0 = 1/\sqrt{LC}$, so it changes by $1/\sqrt{${kL}\times${kC}} = ${F.exact(ratio)}$.`,
          };
        }
        const w0 = R.pick([1e3, 2e3, 5e3, 1e4, 2e4, 1e5, 1e6, 1e7]);
        const L = R.pick([1e-6, 1e-5, 1e-4, 1e-3, 1e-2, 1e-1, 2e-3, 5e-3, 4e-4, 2.5e-5]);
        const C = 1 / (w0 * w0 * L);
        const nice = x => Math.abs(+x.toPrecision(2) - x) < 1e-9 * x;
        if (!nice(C) || C < 1e-12 || C > 1e-2) throw new Error('ugly C');
        if (v === 'C') {
          const f0 = w0 / (2 * PI);
          const ans = 1 / ((2 * PI * f0) ** 2 * L);
          return {
            q: raw`A series LC circuit is to resonate at the frequency $f_0 = ${si(f0, '\\text{Hz}', 2)}$ using an inductor of $${si(L, '\\text{H}')}$. The required capacitance is closest to`,
            ...GRE.numeric(R, ans, [1 / (f0 * f0 * L), 1 / (2 * PI * f0 * L), 1 / (4 * PI * PI * f0 * L), ans * 2 * PI, ans / (2 * PI)], { fmt: x => si(x, '\\text{F}', 2) }),
            expl: raw`From $2\pi f_0 = 1/\sqrt{LC}$, $C = \dfrac{1}{(2\pi f_0)^2L} = \dfrac{1}{(${si(w0, '\\text{rad/s}')})^2(${si(L, '\\text{H}')})} \approx ${si(ans, '\\text{F}', 2)}$.`,
          };
        }
        const askF = v === 'f';
        const ans = askF ? w0 / (2 * PI) : w0;
        return {
          q: raw`An LC circuit consists of a $${si(L, '\\text{H}')}$ inductor and a $${si(C, '\\text{F}')}$ capacitor. Its resonant ${askF ? 'frequency $f_0$' : 'angular frequency $\\omega_0$'} is closest to`,
          ...GRE.numeric(R, ans, askF ? [w0, w0 * w0 / (2 * PI), 2 * PI * w0, w0 / PI] : [w0 / (2 * PI), w0 * w0, 2 * PI * w0, Math.sqrt(w0)], { fmt: x => si(x, askF ? '\\text{Hz}' : '\\text{rad/s}', 2) }),
          expl: raw`$\omega_0 = 1/\sqrt{LC} = 1/\sqrt{(${si(L, '\\text{H}')})(${si(C, '\\text{F}')})} = ${si(w0, '\\text{rad/s}')}$${askF ? raw`, so $f_0 = \omega_0/2\pi \approx ${si(ans, '\\text{Hz}', 2)}$` : ''}.`,
        };
      },
    },
    {
      id: 'lab.ac.transient', sec: '7.3.1', level: 1, weight: 2,
      gen(R) {
        const cap = R.bool();
        const V = R.pick([6, 9, 10, 12, 20, 24, 30]);
        const Rv = cap ? R.pick([1e3, 2e3, 5e3, 1e4, 2e4, 5e4, 1e5]) : R.pick([5, 10, 20, 50, 100, 200]);
        const X = cap ? R.pick([1e-6, 2e-6, 5e-6, 1e-5, 2e-5, 1e-4]) : R.pick([1e-3, 2e-3, 5e-3, 1e-2, 5e-2, 0.1, 0.2, 0.5]);
        const tau = cap ? Rv * X : X / Rv;
        const qty = R.pick(['el', 'R', 'I']);
        const when = R.pick(['0', '0', 'inf', 'inf', 'tau']);
        const I0 = V / Rv;
        // fraction of V (or V/R) at the requested time
        const frac = (() => {
          const growC = { 0: 0, inf: 1, tau: 1 - 1 / Math.E }, decay = { 0: 1, inf: 0, tau: 1 / Math.E };
          if (cap) return qty === 'el' ? growC[when] : decay[when];
          return qty === 'el' ? decay[when] : growC[when];
        })();
        const isI = qty === 'I';
        const unitF = x => `$${x === 0 ? '0' : si(x, isI ? '\\text{A}' : '\\text{V}', 2)}$`;
        const scale = isI ? I0 : V;
        const elName = cap ? 'capacitor' : 'inductor';
        const what = qty === 'el' ? `the voltage across the ${elName}` : qty === 'R' ? 'the voltage across the resistor' : 'the current in the circuit';
        const tw = when === '0' ? 'immediately after the switch is closed' : when === 'inf' ? 'a long time after the switch is closed' : `at time $t = ${cap ? 'RC' : 'L/R'}$ after the switch is closed`;
        return {
          q: raw`A battery of emf $${V}\,\text{V}$ is connected through a switch to a $${si(Rv, '\\Omega')}$ resistor in series with ${cap ? `an initially uncharged $${si(X, '\\text{F}')}$ capacitor` : `a $${si(X, '\\text{H}')}$ inductor`}. The switch is closed at $t = 0$. What is ${what} ${tw}?`,
          ...mcVals(R, frac * scale, [0, scale, (1 - 1 / Math.E) * scale, scale / Math.E, scale / 2, 2 * scale], unitF, 0.05),
          level: when === 'tau' ? 2 : 1,
          expl: `${cap ? 'An uncharged capacitor initially acts like a short circuit (no voltage across it, full current $V/R$) and after a long time like an open circuit (full voltage, no current)' : 'An inductor initially acts like an open circuit (it opposes the sudden change in current, so the full emf appears across it) and after a long time like a plain wire (current $V/R$)'}. ${when === 'tau' ? `After one time constant $\\tau = ${cap ? 'RC' : 'L/R'} = ${si(tau, '\\text{s}', 2)}$, growing quantities reach $1 - 1/e \\approx 63\\%$ of their final value and decaying ones fall to $1/e \\approx 37\\%$. ` : ''}Here ${what} is ${unitF(frac * scale)}.`,
        };
      },
    },

    // ============================================================ 7.3.2 More advanced circuit elements
    {
      id: 'lab.opamp', sec: '7.3.2', level: 2, weight: 2,
      gen(R) {
        const Vs = R.pick([12, 15]);
        const cfg = R.pick(['inv', 'inv', 'non', 'non', 'sum', 'fol']);
        const k = n => si(n * 1e3, '\\Omega');
        const fmt = x => `$${F.num(x, 3)}\\,\\text{V}$`;
        const clip = x => Math.max(-Vs, Math.min(Vs, x));
        const supply = `An ideal op-amp is powered from $\\pm${Vs}\\,\\text{V}$ supplies, so its output saturates at $\\pm${Vs}\\,\\text{V}$.`;
        if (cfg === 'fol') {
          const Vin = R.sign() * R.pick([0.5, 1, 2, 3, 4.5, 5]);
          return {
            q: raw`${supply} Its output is connected directly to its inverting ($-$) input, and an input voltage $V_{in} = ${Vin}\,\text{V}$ is applied to its noninverting ($+$) input. The output voltage is`,
            ...mcVals(R, Vin, [-Vin, 0, 2 * Vin, Vs * Math.sign(Vin), Vin / 2, -Vs * Math.sign(Vin)], fmt), level: 1,
            expl: raw`This is a voltage follower (buffer). With negative feedback the op-amp makes $V_- = V_+$; since $V_- = V_{out}$, the output equals the input, $${Vin}\,\text{V}$, with unity gain (but very high input impedance).`,
          };
        }
        if (cfg === 'sum') {
          const R1 = R.pick([1, 2, 5, 10]), R2 = R.pick([1, 2, 5, 10]), Rf = R.pick([5, 10, 20]);
          const V1 = R.sign() * R.pick([0.1, 0.2, 0.5, 1]), V2 = R.sign() * R.pick([0.1, 0.2, 0.5, 1]);
          const ideal = -Rf * (V1 / R1 + V2 / R2);
          if (Math.abs(ideal) < 0.05) throw new Error('tiny');
          const out = clip(ideal);
          return {
            q: raw`${supply} Voltages $V_1 = ${V1}\,\text{V}$ and $V_2 = ${V2}\,\text{V}$ are applied through resistors $R_1 = ${k(R1)}$ and $R_2 = ${k(R2)}$ to its inverting input, a feedback resistor $R_f = ${k(Rf)}$ connects the output to the inverting input, and the noninverting input is grounded. The output voltage is`,
            ...mcVals(R, out, [-out, ideal === out ? null : ideal, clip(-Rf * (V1 + V2) / (R1 + R2) * 2), clip(-Rf * V1 / R1), clip(-Rf * V2 / R2), clip(-(V1 + V2)), clip((1 + Rf / R1) * V1 + (1 + Rf / R2) * V2)], fmt),
            level: 3,
            expl: raw`The inverting input is a virtual ground, so the input currents $V_1/R_1 + V_2/R_2$ all flow through $R_f$: $V_{out} = -R_f\left(\dfrac{V_1}{R_1} + \dfrac{V_2}{R_2}\right) = ${F.num(ideal, 3)}\,\text{V}$${out !== ideal ? raw`, which exceeds the supply, so the output saturates at $${out}\,\text{V}$` : ''}.`,
          };
        }
        const Rin = R.pick([1, 2, 5, 10]), Rf = R.pick([2, 5, 10, 20, 50, 100].filter(x => x !== Rin));
        const Vin = R.sign() * R.pick([0.1, 0.2, 0.25, 0.3, 0.5, 1, 1.5, 2]);
        const g = Rf / Rin;
        const inv = cfg === 'inv';
        const ideal = inv ? -g * Vin : (1 + g) * Vin;
        const out = clip(ideal);
        const desc = inv
          ? raw`The input voltage $V_{in} = ${Vin}\,\text{V}$ is applied through a resistor $R_1 = ${k(Rin)}$ to the inverting ($-$) input, a feedback resistor $R_f = ${k(Rf)}$ connects the output to the inverting input, and the noninverting ($+$) input is grounded.`
          : raw`The input voltage $V_{in} = ${Vin}\,\text{V}$ is applied to the noninverting ($+$) input, a resistor $R_1 = ${k(Rin)}$ connects the inverting ($-$) input to ground, and a feedback resistor $R_f = ${k(Rf)}$ connects the output to the inverting input.`;
        const wr = inv ? [-out, clip(-(1 + g) * Vin), clip(-Vin / g), ideal, -Vs * Math.sign(ideal) * -1, 0, Vin] : [clip(g * Vin), -out, clip(-g * Vin), ideal, clip((1 + 1 / g) * Vin), Vin, 0];
        return {
          q: `${supply} ${desc} The output voltage is`,
          ...mcVals(R, out, wr.map(x => (x === out ? null : x)), fmt),
          level: out !== ideal ? 3 : 2,
          expl: (inv ? raw`Inverting amplifier: the $-$ input is a virtual ground, so $V_{out} = -(R_f/R_1)V_{in} = -${F.num(g, 3)}\times(${Vin}) = ${F.num(ideal, 3)}\,\text{V}$`
            : raw`Noninverting amplifier: $V_- = V_+ = V_{in}$ and the divider $R_f$–$R_1$ gives $V_{out} = (1 + R_f/R_1)V_{in} = ${F.num(1 + g, 3)}\times(${Vin}) = ${F.num(ideal, 3)}\,\text{V}$`) + (out !== ideal ? raw`. But the output cannot exceed the supply, so it saturates (clips) at $${out}\,\text{V}$.` : '.'),
        };
      },
    },
    {
      id: 'lab.diode', sec: '7.3.2', level: 2, weight: 2,
      gen(R) {
        const v = R.pick(['series', 'series', 'half', 'bridge', 'led', 'zener']);
        const fmtV = x => `$${x === 0 ? '0' : F.num(x, 3)}\\,\\text{V}$`;
        const fmtI = x => `$${x === 0 ? '0' : si(x, '\\text{A}', 3)}$`;
        if (v === 'series') {
          const V = R.pick([2, 3, 5, 6, 9, 12]), Rv = R.pick([100, 200, 500, 1000, 2000]);
          const n = R.pick([1, 1, 2]);
          const fwd = R.bool(0.75);
          const I = fwd ? (V - 0.7 * n) / Rv : 0;
          const askI = R.bool();
          const val = askI ? I : I * Rv;
          const alt = askI ? [V / Rv, (V - 0.7) / Rv, (V - 1.4) / Rv, (V + 0.7) / Rv, 0.7 / Rv, 0] : [V, V - 0.7, V - 1.4, 0.7, 0, V + 0.7];
          return {
            q: raw`A $${V}\,\text{V}$ battery, a $${si(Rv, '\\Omega')}$ resistor, and ${n === 1 ? 'a silicon diode' : 'two identical silicon diodes in series'} form a single loop. The diode${n > 1 ? 's are' : ' is'} oriented so that ${n > 1 ? 'they are' : 'it is'} ${fwd ? 'forward' : 'reverse'}-biased by the battery. Taking a forward drop of $0.7\,\text{V}$ per diode, what is the ${askI ? 'current in the loop' : 'voltage across the resistor'}?`,
            ...mcVals(R, val, alt, askI ? fmtI : fmtV, 0.05),
            level: fwd ? 2 : 1,
            expl: fwd ? raw`A conducting silicon diode drops about $0.7\,\text{V}$ regardless of current, so the resistor sees $${V} - ${F.num(0.7 * n, 2)} = ${F.num(V - 0.7 * n, 2)}\,\text{V}$ and $I = ${F.num(V - 0.7 * n, 2)}/${Rv} = ${si(I, '\\text{A}', 3)}$.`
              : 'A reverse-biased diode is essentially an open circuit (far below breakdown), so no current flows and there is no voltage across the resistor; the whole battery voltage appears across the diode.',
          };
        }
        if (v === 'half' || v === 'bridge') {
          const V0 = R.pick([5, 6, 10, 12, 15, 20, 24]);
          const br = v === 'bridge';
          const pk = br ? V0 - 1.4 : V0 - 0.7;
          return {
            q: raw`A sinusoidal voltage of amplitude $${V0}\,\text{V}$ drives a resistive load through ${br ? 'a full-wave bridge rectifier made of four silicon diodes' : 'a single silicon diode in series with the load (a half-wave rectifier)'}. With no filter capacitor, the peak voltage across the load is closest to`,
            ...mcVals(R, pk, [V0, br ? V0 - 0.7 : V0 - 1.4, V0 / Math.SQRT2, (V0 - 0.7) / 2, 2 * V0 - 1.4, 0.7, V0 - 2.8], fmtV, 0.03),
            expl: br ? raw`In a bridge rectifier the current passes through two diodes in each half-cycle, so the peak output is $${V0} - 2(0.7) = ${F.num(pk, 3)}\,\text{V}$, and both half-cycles appear with the same polarity.`
              : raw`The diode conducts only during one polarity of the input, dropping about $0.7\,\text{V}$, so the peak load voltage is $${V0} - 0.7 = ${F.num(pk, 3)}\,\text{V}$; the other half-cycle is blocked.`,
          };
        }
        if (v === 'led') {
          const V = R.pick([5, 9, 12]), Vf = R.pick([1.8, 2.0, 2.2, 3.0, 3.2]), I = R.pick([0.01, 0.015, 0.02, 0.025]);
          const Rv = (V - Vf) / I;
          return {
            q: raw`A light-emitting diode with forward voltage $${Vf}\,\text{V}$ is to be run at $${si(I, '\\text{A}')}$ from a $${V}\,\text{V}$ supply. The required series resistance is closest to`,
            ...GRE.numeric(R, Rv, [V / I, Vf / I, (V + Vf) / I, (V - 0.7) / I], { fmt: x => si(x, '\\Omega', 2), tol: 0.06 }),
            level: 1,
            expl: raw`The LED drops $${Vf}\,\text{V}$, leaving $${F.num(V - Vf, 2)}\,\text{V}$ across the resistor: $R = ${F.num(V - Vf, 2)}/${I} = ${si(Rv, '\\Omega', 3)}$.`,
          };
        }
        const Vin = R.pick([12, 15, 18, 20, 24]), Vz = R.pick([5.1, 5.6, 6.2, 9.1]), Rv = R.pick([100, 200, 220, 470, 1000]);
        const I = (Vin - Vz) / Rv;
        return {
          q: raw`A Zener diode with breakdown voltage $${Vz}\,\text{V}$ is connected in reverse bias in series with a $${si(Rv, '\\Omega')}$ resistor across a $${Vin}\,\text{V}$ supply (no load attached). The current through the resistor is closest to`,
          ...mcVals(R, I, [Vin / Rv, Vz / Rv, (Vin - 0.7) / Rv, (Vin + Vz) / Rv, 0], fmtI, 0.06),
          level: 2,
          expl: raw`In breakdown the Zener holds $${Vz}\,\text{V}$ across itself, so the resistor carries $(${Vin} - ${Vz})/${Rv} \approx ${si(I, '\\text{A}', 3)}$. This is the basis of a simple voltage regulator.`,
        };
      },
    },
    {
      id: 'lab.bjt', sec: '7.3.2', level: 1,
      gen(R) {
        const v = R.pick(['IC', 'IE', 'beta', 'term']);
        if (v === 'term') {
          const T = R.pick([
            ['the small input current that controls the transistor flows into the', 'base'],
            ['the largest of the three terminal currents flows through the', 'emitter'],
            ['if it is an npn device, the terminal held at the highest potential is the', 'collector'],
          ]);
          return {
            q: `For a bipolar junction transistor operated in its active (amplifying) region, ${T[0]}`,
            ...GRE.mc(R, `${T[1]}`, ['base', 'collector', 'emitter', 'gate', 'drain', 'source', 'anode'].filter(x => x !== T[1])),
            expl: 'A BJT has a base, collector, and emitter. A small base current $I_B$ controls a collector current $I_C = \\beta I_B$ (with $\\beta \\sim 100$), and the emitter carries $I_E = I_B + I_C$, the largest current. For an npn device in the active region, $V_C > V_B > V_E$. (Gate, drain, and source are FET terminals.)',
          };
        }
        const beta = R.pick([50, 80, 100, 120, 150, 200, 250]);
        const IB = R.pick([5, 10, 20, 25, 40, 50]) * 1e-6;
        const IC = beta * IB, IE = (beta + 1) * IB;
        const fmt = x => `$${si(x, '\\text{A}', 4)}$`;
        if (v === 'beta') {
          return {
            q: raw`In a bipolar transistor operating in its active region, a base current of $${si(IB, '\\text{A}')}$ produces a collector current of $${si(IC, '\\text{A}', 3)}$. The current gain $\beta$ is`,
            ...GRE.numeric(R, beta, [beta + 1, 1 / beta * 1e4, beta / 2, beta * 10, beta - 1, Math.sqrt(beta)], { fmt: x => String(Math.round(x)), tol: 0.005 }),
            expl: raw`$\beta = I_C/I_B = ${si(IC, '\\text{A}', 3)}/${si(IB, '\\text{A}')} = ${beta}$.`,
          };
        }
        const askE = v === 'IE';
        return {
          q: raw`A bipolar transistor with current gain $\beta = ${beta}$ operates in its active region with a base current of $${si(IB, '\\text{A}')}$. The ${askE ? 'emitter' : 'collector'} current is`,
          ...mcVals(R, askE ? IE : IC, [askE ? IC : IE, IB / beta, beta * beta * IB, IB, 10 * IC, IC / 10], fmt, 0.002),
          expl: raw`$I_C = \beta I_B = ${beta}\times${si(IB, '\\text{A}')} = ${si(IC, '\\text{A}', 3)}$${askE ? raw`, and the emitter carries both: $I_E = I_B + I_C = (\beta + 1)I_B = ${si(IE, '\\text{A}', 4)}$` : ''}.`,
        };
      },
    },
    {
      id: 'lab.adv.concept', sec: '7.3.2', level: 1,
      gen(R) {
        const v = R.pick(['true', 'false', 'roman']);
        if (v === 'roman') {
          const r = romanFrom(R, 'Which of the following statements about diodes, transistors, and operational amplifiers is (are) true?', ADV_T, ADV_F);
          return { q: r.q, choices: r.choices, ans: r.ans, level: 2, expl: 'Ideal op-amp rules: infinite input impedance (no input current), zero output impedance, and, with negative feedback, $V_+ = V_-$; the output is limited by the supplies. A silicon diode conducts forward above about 0.7 V with a nearly constant drop and blocks reverse current until breakdown. In a BJT a small base current controls a much larger collector current, with power drawn from the supply. ' + r.tags };
        }
        const t = v === 'true';
        return {
          q: `Which of the following statements is ${t ? 'true' : 'FALSE'}?`,
          ...GRE.mc(R, R.pick(t ? ADV_T : ADV_F), t ? ADV_F : ADV_T),
          expl: 'An ideal op-amp has infinite input impedance and zero output impedance, amplifies the difference $V_+ - V_-$ with huge gain, and with negative feedback forces $V_+ = V_-$ (outputs are clipped at the supply rails). A silicon diode conducts in one direction above about 0.7 V with a nearly current-independent drop. A BJT’s small base current controls a much larger collector current; the extra power comes from the supply.',
        };
      },
    },

    // ============================================================ 7.3.3 Logic gates
    {
      id: 'lab.logic.identify', sec: '7.3.3', level: 1,
      gen(R) {
        const three = R.bool(0.3);
        const names = three ? ['AND', 'OR', 'NAND', 'NOR', 'XOR'] : ['AND', 'OR', 'NAND', 'NOR', 'XOR', 'XNOR'];
        const g = R.pick(names);
        const f3 = { AND: (a, b, c) => a & b & c, OR: (a, b, c) => a | b | c, NAND: (a, b, c) => 1 - (a & b & c), NOR: (a, b, c) => 1 - (a | b | c), XOR: (a, b, c) => a ^ b ^ c };
        let rows = three ? ROWS3.map(([a, b, c]) => [a, b, c, f3[g](a, b, c)]) : [[0, 0], [0, 1], [1, 0], [1, 1]].map(([a, b]) => [a, b, GATES[g](a, b)]);
        const shuffled = R.bool(0.4);
        if (shuffled) rows = R.shuffle(rows);
        const head = three ? ['A', 'B', 'C', 'Y'] : ['A', 'B', 'Y'];
        const asExpr = R.bool(0.4);
        const E3 = { AND: 'ABC', OR: 'A + B + C', NAND: raw`\overline{ABC}`, NOR: raw`\overline{A + B + C}`, XOR: raw`A\oplus B\oplus C` };
        const ex = n => `$${three ? E3[n] : GEXPR[n]}$`;
        const extraExpr = three ? [raw`$\overline{A}BC$`, raw`$AB + C$`] : [raw`$\overline{A}\cdot B$`, raw`$A + \overline{B}$`];
        const desc = { AND: 'the output is 1 only when all inputs are 1', OR: 'the output is 0 only when all inputs are 0', NAND: 'the output is 0 only when all inputs are 1 (an inverted AND)', NOR: 'the output is 1 only when all inputs are 0 (an inverted OR)', XOR: three ? 'the output is 1 when an odd number of inputs are 1' : 'the output is 1 when exactly one input is 1', XNOR: 'the output is 1 when the inputs are equal' };
        return {
          q: `The truth table below${shuffled ? ' (rows listed in no particular order)' : ''} describes a logic gate with output $Y$. ${ttex(head, rows)}<br>Which ${asExpr ? 'Boolean expression gives $Y$' : 'gate is it'}?`,
          ...(asExpr ? GRE.mc(R, ex(g), names.filter(n => n !== g).map(ex).concat(extraExpr)) : GRE.mc(R, `${three ? 'Three-input ' : ''}${g}`, names.filter(n => n !== g).map(n => `${three ? 'Three-input ' : ''}${n}`).concat(three ? [] : ['NOT']))),
          expl: `Reading the table, ${desc[g]}: this is ${art(g)} ${g} gate${asExpr ? `, $Y = ${three ? E3[g] : GEXPR[g]}$` : ''}.`,
        };
      },
    },
    {
      id: 'lab.logic.circuit', sec: '7.3.3', level: 2, weight: 3,
      gen(R) {
        const GS = ['AND', 'OR', 'NAND', 'NOR', 'XOR'];
        const topo = R.pick([1, 1, 2, 3]);
        const gs = [R.pick(GS), R.pick(GS), R.pick(GS)];
        const build = g => {
          if (topo === 1) return ([a, b, c]) => GATES[g[1]](GATES[g[0]](a, b), c);
          if (topo === 2) return ([a, b, c]) => GATES[g[2]](GATES[g[0]](a, b), GATES[g[1]](b, c));
          return ([a, b, c]) => GATES[g[1]](1 - a, GATES[g[0]](b, c));
        };
        const tab = g => ROWS3.map(build(g));
        const Y = tab(gs);
        const desc = topo === 1 ? `Inputs $A$ and $B$ feed ${art(gs[0])} ${gs[0]} gate. The output of that gate and input $C$ feed ${art(gs[1])} ${gs[1]} gate, whose output is $Y$.`
          : topo === 2 ? `Inputs $A$ and $B$ feed ${art(gs[0])} ${gs[0]} gate, and inputs $B$ and $C$ feed ${art(gs[1])} ${gs[1]} gate. The outputs of these two gates feed ${art(gs[2])} ${gs[2]} gate, whose output is $Y$.`
            : `Input $A$ passes through a NOT gate (inverter), and inputs $B$ and $C$ feed ${art(gs[0])} ${gs[0]} gate. The inverter output and the ${gs[0]} output feed ${art(gs[1])} ${gs[1]} gate, whose output is $Y$.`;
        const ng = topo === 2 ? 3 : 2;
        const muts = [];
        for (let i = 0; i < ng; i++) for (const h of GS) if (h !== gs[i]) { const m = gs.slice(); m[i] = h; muts.push(tab(m)); }
        const ones = Y.reduce((s, x) => s + x, 0);
        const fmtTab = t => `$${t.join('\\;')}$`;
        let v = R.pick(['count', 'which', 'which', 'table', 'table']);
        if (v === 'which' && (ones === 0 || ones === 8 || (ones > 4 && ones < 4) )) v = 'table';
        if (v === 'count') {
          const wr = [];
          for (const t of muts) { const n = t.reduce((s, x) => s + x, 0); if (n !== ones && wr.indexOf(n) < 0) wr.push(n); }
          for (let n = 0; n <= 8; n++) if (n !== ones && wr.indexOf(n) < 0) wr.push(n);
          return {
            q: `${desc} For how many of the eight possible combinations of the inputs $(A, B, C)$ is $Y = 1$?`,
            ...GRE.mc(R, `$${ones}$`, wr.map(n => `$${n}$`), { rank: s => +s.replace(/\$/g, '') }),
            expl: `Working through the truth table (inputs $ABC$ = 000 … 111) gives $Y$ = ${Y.join(' ')}, which contains ${ones} ones.`,
          };
        }
        if (v === 'which') {
          const want = R.bool() ? 1 : 0;
          const good = ROWS3.filter((_, i) => Y[i] === want), bad = ROWS3.filter((_, i) => Y[i] !== want);
          if (!good.length || bad.length < 4) return this.gen(R);
          const f = r => `$A = ${r[0]},\\ B = ${r[1]},\\ C = ${r[2]}$`;
          const val = s => { const m = s.match(/\d/g); return 4 * m[0] + 2 * m[1] + +m[2]; };
          return {
            q: `${desc} For which of the following input combinations is $Y = ${want}$?`,
            ...GRE.mc(R, f(R.pick(good)), bad.map(f), { rank: val }),
            expl: `The full output column for $ABC$ = 000 … 111 is $Y$ = ${Y.join(' ')}. Only the chosen combination among the options gives $Y = ${want}$.`,
          };
        }
        const seen = new Set([Y.join('')]);
        const wr = [];
        const add = t => { const k = t.join(''); if (!seen.has(k)) { seen.add(k); wr.push(fmtTab(t)); } };
        for (const t of R.shuffle(muts)) add(t);
        add(Y.map(x => 1 - x));
        for (let i = 0; i < 8; i++) { const t = Y.slice(); t[i] = 1 - t[i]; add(t); }
        return {
          q: `${desc} Listing the inputs in the order $ABC = 000, 001, 010, 011, 100, 101, 110, 111$, the output column $Y$ of the truth table is`,
          ...GRE.mc(R, fmtTab(Y), wr.slice(0, 8)),
          level: 2,
          expl: `Evaluate gate by gate for each row. ${topo === 3 ? 'The inverter gives $\\overline{A}$. ' : ''}The result is $Y$ = ${Y.join(' ')}. Distractors correspond to using the wrong gate somewhere in the circuit or inverting the output.`,
        };
      },
    },
    {
      id: 'lab.logic.equiv', sec: '7.3.3', level: 2, weight: 2,
      gen(R) {
        const [fn, why] = R.pick(IDS);
        const vars = R.shuffle(['A', 'B', 'C']);
        const lits = vars.map(n => (R.bool(0.25) ? Ln(Lv(n)) : Lv(n)));
        const [lhs, rhs] = fn(lits[0], lits[1], lits[2]);
        if (ltab(lhs) !== ltab(rhs)) throw new Error('identity check failed');
        const fwd = R.bool(0.6);
        const [given, ans] = fwd ? [lhs, rhs] : [rhs, lhs];
        const target = ltab(ans);
        const gT = ltex(given), aT = ltex(ans);
        if (gT === aT) throw new Error('same form');
        const seen = new Set([aT, gT]);
        const wr = [];
        const vs = e => (e.t === 'v' ? [e.n] : e.t === 'not' ? vs(e.a) : vs(e.a).concat(vs(e.b)));
        const allowed = new Set(vs(given));
        const degen = e => (e.t === 'v' ? false : e.t === 'not' ? degen(e.a) : ((e.a.t === 'v' || e.a.t === 'not' && e.a.a.t === 'v') && (e.b.t === 'v' || e.b.t === 'not' && e.b.a.t === 'v') && vs(e.a)[0] === vs(e.b)[0]) || degen(e.a) || degen(e.b));
        for (const m of R.shuffle(lmut(ans)).concat(R.shuffle(lmut(given)), ['and', 'or', 'xor'].map(t => Lop(t, Lv(vars[0]), Lv(vars[1]))), [Ln(Lop('and', Lv(vars[0]), Lv(vars[1]))), Ln(Lop('or', Lv(vars[0]), Lv(vars[1])))])) {
          const t = ltex(m);
          if (seen.has(t) || ltab(m) === target || degen(m) || vs(m).some(n => !allowed.has(n))) continue;
          seen.add(t); wr.push(`$${t}$`);
        }
        return {
          q: raw`In Boolean notation ($\overline{X}$ = NOT $X$, $X\cdot Y$ = $X$ AND $Y$, $X + Y$ = $X$ OR $Y$, $X\oplus Y$ = $X$ XOR $Y$), which of the following is equivalent to $${gT}$?`,
          ...GRE.mc(R, `$${aT}$`, wr),
          expl: `By ${why}, $${gT} = ${aT}$ (with the variables substituted). A truth table confirms it, and each other choice differs from it for at least one input combination.`,
        };
      },
    },
    {
      id: 'lab.logic.single', sec: '7.3.3', level: 2,
      gen(R) {
        const [d, out, why] = R.pick(SINGLE);
        const keys = Object.keys(GOUT).filter(k => k !== out);
        const pool = ['AND', 'OR', 'NAND', 'NOR', 'XOR', 'XNOR'].indexOf(out) >= 0 ? keys.filter(k => ['ONE', 'ZERO', 'BUF'].indexOf(k) < 0) : keys;
        return {
          q: `A circuit consists of ${d}. It is logically equivalent to`,
          ...GRE.mc(R, GOUT[out], pool.map(k => GOUT[k])),
          expl: `Check the truth table: ${why}.`,
        };
      },
    },

    // ============================================================ 7.4.1 Charged particles in matter
    {
      id: 'lab.charged.concept', sec: '7.4.1', level: 2,
      gen(R) {
        const v = R.pick(['true', 'false', 'roman', 'roman', 'mip', 'range']);
        const base = 'Heavy charged particles lose energy almost continuously through many small ionizing collisions with atomic electrons, so they travel in straight lines and have a well-defined range, with $dE/dx \\propto z^2/v^2$ rising to the Bragg peak as they slow. Electrons scatter through large angles, can lose much of their energy in one collision, and radiate bremsstrahlung (which scales as $1/m^2$). ';
        if (v === 'mip') {
          const good = ['a muon with kinetic energy 300 MeV', 'a charged pion with kinetic energy 400 MeV', 'a proton with kinetic energy 2.5 GeV', 'a muon with momentum 400 MeV/$c$'];
          const bad = ['a proton with kinetic energy 5 MeV', 'an alpha particle with kinetic energy 5 MeV', 'a neutron with kinetic energy 1 MeV', 'a 10-keV photon', 'an electron with kinetic energy 10 keV', 'a muon with kinetic energy 1 MeV', 'a proton with kinetic energy 50 MeV'];
          return {
            q: 'Which of the following is closest to being a minimum-ionizing particle?',
            ...GRE.mc(R, cap(R.pick(good)), bad.map(cap)),
            expl: 'The energy-loss rate of a charged particle reaches its broad minimum at $\\beta\\gamma \\approx 3$–4, i.e. kinetic energy of a few times its rest energy (muon 106 MeV, pion 140 MeV, proton 938 MeV). Slow heavy particles ionize far more strongly, and neutral particles (photons, neutrons) do not ionize continuously at all.',
          };
        }
        if (v === 'range') {
          const E = R.pick([2, 5, 10]);
          return {
            q: `Each of the following particles enters a block of aluminum with a kinetic energy of ${E} MeV. Which travels the farthest before stopping?`,
            ...GRE.mc(R, 'An electron', ['A proton', 'A deuteron', 'An alpha particle', 'A carbon-12 nucleus']),
            level: 1,
            expl: `At the same kinetic energy the electron is by far the fastest and has charge $z = 1$, so its stopping power is smallest; its range is millimeters, while ${E}-MeV protons and ions stop within tens to hundreds of micrometers. For the ions, $dE/dx \\propto z^2 m/K$, so heavier, more highly charged ions stop soonest.`,
          };
        }
        if (v === 'roman') {
          const r = romanFrom(R, 'Which of the following statements about the passage of charged particles through matter is (are) true?', CH_T, CH_F);
          return { q: r.q, choices: r.choices, ans: r.ans, expl: base + r.tags };
        }
        const t = v === 'true';
        return {
          q: `Which of the following statements about charged particles passing through matter is ${t ? 'true' : 'FALSE'}?`,
          ...GRE.mc(R, R.pick(t ? CH_T : CH_F), t ? CH_F : CH_T),
          level: 1, expl: base,
        };
      },
    },
    {
      id: 'lab.charged.scaling', sec: '7.4.1', level: 3,
      gen(R) {
        const [A, B] = R.pickN(IONS, 2);
        const v = R.pick(['speed', 'energy', 'range', 'slow']);
        const ex = x => `$${F.exact(x)}$`;
        if (v === 'slow') {
          const k = R.pick([2, 3, 4]);
          return {
            q: `A nonrelativistic ${A[0]} moving through a material slows to $1/${k}$ of its initial speed. Neglecting the slowly varying logarithmic factor in the Bethe formula, by what factor has its stopping power $-dE/dx$ changed?`,
            ...GRE.mc(R, ex(k * k), [k, 1 / k, 1 / (k * k), Math.sqrt(k), k * k * k, 1].map(ex)),
            expl: raw`For heavy particles $-dE/dx \propto z^2/v^2$ (times a logarithm), so reducing $v$ by ${k} increases the stopping power by $${k * k}$. This is why energy deposition peaks near the end of the track (the Bragg peak).`,
          };
        }
        let ratio, how, why;
        if (v === 'speed') { ratio = (A[1] * A[1]) / (B[1] * B[1]); how = 'the same speed'; why = raw`At equal speed $-dE/dx \propto z^2$, giving $(${A[1]}/${B[1]})^2$.`; }
        else if (v === 'energy') { ratio = (A[1] * A[1] * A[2]) / (B[1] * B[1] * B[2]); how = 'the same kinetic energy'; why = raw`With $v^2 = 2K/m$, $-dE/dx \propto z^2/v^2 \propto z^2m/K$, so the ratio is $\dfrac{${A[1]}^2\times${A[2]}}{${B[1]}^2\times${B[2]}}$.`; }
        else { ratio = (A[2] / (A[1] * A[1])) / (B[2] / (B[1] * B[1])); how = 'the same initial speed'; why = raw`Since $-dE/dx$ depends only on $z^2$ and $v$, while the energy to lose at a given speed is $\propto m$, the range at a given speed scales as $m/z^2$: ratio $= \dfrac{${A[2]}/${A[1]}^2}{${B[2]}/${B[1]}^2}$.`; }
        const asked = v === 'range' ? 'ranges' : 'stopping powers $-dE/dx$';
        const wr = [1 / ratio, A[1] / B[1], A[2] / B[2], B[2] / A[2], (A[1] / B[1]) * (A[2] / B[2]), 2 * ratio, ratio / 2, 1, 4, 1 / 4].map(ex);
        return {
          q: `A ${A[0]} and a ${B[0]}, both nonrelativistic, enter the same material with ${how}. Neglecting the logarithmic factor in the Bethe formula, what is the ratio of their initial ${asked}, (${A[0]})/(${B[0]})?`.replace(/initial ranges/, 'ranges'),
          ...GRE.mc(R, ex(ratio), wr),
          expl: `${why.replace(/\.$/, '')}, which equals $${F.exact(ratio)}$. (Here $z$ is the charge number and $m$ the mass; the Bethe stopping power is $\\propto z^2/v^2$ up to a logarithm.)`,
        };
      },
    },
    {
      id: 'lab.charged.cherenkov', sec: '7.4.1', level: 2, weight: 2,
      gen(R) {
        const [a, b, c] = R.pick(CHER);
        const n = c / a;
        const [pn, m] = R.pick(PARTS);
        const v = R.pick(['speed', 'ke', 'ke', 'p', 'angle']);
        const nT = `n = ${F.frac(c, a)}`;
        const med = R.pick(['a transparent medium', 'a radiator', 'a transparent liquid', 'a block of transparent material']);
        if (v === 'speed') {
          return {
            q: raw`What is the minimum speed a charged particle must have to emit Cherenkov radiation in ${med} with index of refraction $${nT}$?`,
            ...GRE.mc(R, `$${F.frac(a, c)}\\,c$`, [`$${F.frac(b, c)}\\,c$`, `$${F.frac(a * a, c * c)}\\,c$`, `$${F.frac(b, a)}\\,c$`, `$${F.frac(c - a, c)}\\,c$`, `$${F.exact(Math.sqrt(a / c))}\\,c$`, '$c$']),
            level: 1,
            expl: raw`Cherenkov light is emitted when the particle outruns light in the medium: $v > c/n = ${F.frac(a, c)}\,c$. The threshold depends only on $n$, not on the particle’s mass or charge.`,
          };
        }
        const g = c / b, bg = a / b;
        if (v === 'angle') {
          const th = Math.acos(a / c) * 180 / PI;
          return {
            q: raw`A highly relativistic charged particle ($v \approx c$) passes through ${med} with index of refraction $${nT}$. The angle between its direction of motion and the emitted Cherenkov light is closest to`,
            ...GRE.numeric(R, th, [90 - th, Math.acos(a * a / (c * c)) * 180 / PI, Math.atan(a / c) * 180 / PI, 2 * th], { fmt: x => `${F.num(x, 2)}^\\circ`, tol: 0.1 }),
            expl: raw`The Cherenkov angle satisfies $\cos\theta = 1/(n\beta)$; for $\beta \to 1$, $\cos\theta = 1/n = ${F.frac(a, c)}$, so $\theta \approx ${F.num(th, 2)}^\circ$.`,
          };
        }
        if (v === 'p') {
          const p = bg * m;
          return {
            q: raw`What is the minimum momentum ${pn === 'electron' ? 'an' : 'a'} ${pn} (rest energy $${m}\,\text{MeV}$) must have to produce Cherenkov radiation in ${med} with $${nT}$?`,
            ...GRE.numeric(R, p, [a / c * m, g * m, m / (n - 1), (g - 1) * m, bg * bg * m], { unit: raw`\text{MeV}/c`, fmt: x => F.num(x, 2) }),
            expl: raw`At threshold $\beta = 1/n = ${F.frac(a, c)}$, so $\gamma = ${F.frac(c, b)}$ and $p = \gamma\beta mc = ${F.frac(a, b)}\times${m}\,\text{MeV}/c \approx ${F.num(p, 2)}\,\text{MeV}/c$.`,
          };
        }
        const K = (g - 1) * m;
        return {
          q: raw`What is the minimum kinetic energy ${pn === 'electron' ? 'an' : 'a'} ${pn} (rest energy $${m}\,\text{MeV}$) must have to produce Cherenkov radiation in ${med} with $${nT}$?`,
          ...GRE.numeric(R, K, [g * m, 0.5 * m * (a / c) ** 2, bg * m, (n - 1) * m, (g * g - 1) * m], { unit: raw`\text{MeV}`, fmt: x => F.num(x, 2) }),
          expl: raw`Threshold: $\beta = 1/n = ${F.frac(a, c)}$, so $\gamma = 1/\sqrt{1 - \beta^2} = ${F.frac(c, b)}$ and $K = (\gamma - 1)mc^2 = ${F.frac(c - b, b)}\times${m}\,\text{MeV} \approx ${F.num(K, 2)}\,\text{MeV}$. Using $\gamma mc^2$ (total energy) or $\tfrac12 mv^2$ are the traps.`,
        };
      },
    },

    // ============================================================ 7.4.2 Photon interactions
    {
      id: 'lab.photon.regime', sec: '7.4.2', level: 1,
      gen(R) {
        const others = k => Object.keys(PROC).filter(x => x !== k).map(x => cap(PROC[x]));
        if (R.bool(0.55)) {
          const k = R.pick(['photo', 'compton', 'pair']);
          const [ph, mat] = R.pick(PH_CASES[k]);
          return {
            q: `What is the dominant interaction of ${ph} in ${mat}?`,
            ...GRE.mc(R, cap(PROC[k]), others(k)),
            expl: 'Roughly: photoelectric absorption dominates at low energies (up to tens of keV in light materials, a few hundred keV in lead), Compton scattering dominates from there up to several MeV, and pair production dominates at tens of MeV and above (above about 5 MeV in lead). ' + `Here the answer is ${PROC[k]}.`,
          };
        }
        const [q, k, why] = R.pick(PROC_Q);
        return { q, ...GRE.mc(R, cap(PROC[k]), others(k)), level: 2, expl: why };
      },
    },
    {
      id: 'lab.photon.compton', sec: '7.4.2', level: 2, weight: 2,
      gen(R) {
        const lc = 2.43;
        const th = R.pick([60, 90, 120, 180]);
        const f = 1 - Math.cos(th * PI / 180);
        const v = R.pick(['shift', 'lam', 'energy', 'energy', 'edge']);
        if (v === 'shift' || v === 'lam') {
          const shift = lc * f;
          if (v === 'shift') {
            return {
              q: raw`X-rays are Compton-scattered from (nearly free) electrons in a target. The increase in wavelength of the X-rays scattered through $${th}^\circ$ is closest to`,
              ...GRE.numeric(R, shift, [lc * (1 + Math.cos(th * PI / 180)) || lc * 3, lc * Math.sin(th * PI / 180) || lc / 4, lc * f / 2, lc * f * 2 * PI, lc * f * 1836], { unit: raw`\text{pm}`, fmt: x => F.num(x, 2) }),
              level: 1,
              expl: raw`$\Delta\lambda = \dfrac{h}{m_ec}(1 - \cos\theta)$ with $h/m_ec = 2.43\,\text{pm}$; at $${th}^\circ$, $1 - \cos\theta = ${F.num(f, 2)}$, so $\Delta\lambda \approx ${F.num(shift, 2)}\,\text{pm}$, independent of the incident wavelength.`,
            };
          }
          const lam = R.pick([5, 10, 20, 50, 71, 100]);
          return {
            q: raw`X-rays of wavelength $${lam}\,\text{pm}$ are Compton-scattered from a carbon target. The wavelength of the X-rays scattered through $${th}^\circ$ is closest to`,
            ...GRE.numeric(R, lam + shift, [lam - shift, lam + 2 * shift, lam + shift / 2, lam, lam * (1 + f)].filter(x => x > 0), { unit: raw`\text{pm}`, fmt: x => F.num(x, 3), tol: lam > 40 ? 0.015 : 0.05 }),
            expl: raw`$\lambda' = \lambda + \dfrac{h}{m_ec}(1 - \cos\theta) = ${lam} + 2.43\times${F.num(f, 2)} \approx ${F.num(lam + shift, 3)}\,\text{pm}$. The scattered photon always has the longer wavelength (it gave energy to the electron).`,
          };
        }
        if (v === 'edge') {
          const [E, src] = R.pick([[511, 'positron annihilation'], [1022, 'a source of 1.022-MeV photons'], [255.5, 'a source of 255.5-keV photons'], [662, 'cesium-137'], [1332, 'cobalt-60']]);
          const k = E / 511;
          const T = E * 2 * k / (1 + 2 * k);
          return {
            q: raw`Gamma rays of energy $${E}\,\text{keV}$ (from ${src}) are Compton-scattered in a detector. The maximum kinetic energy that can be given to a recoil electron (the Compton edge) is closest to`,
            ...GRE.numeric(R, T, [E, E / (1 + 2 * k), E * k / (1 + k), E / 2, E - 511 > 0 ? E - 511 : E / 4], { unit: raw`\text{keV}`, fmt: x => F.num(x, 3) }),
            expl: raw`Maximum transfer occurs for backscattering ($\theta = 180^\circ$): $E' = \dfrac{E}{1 + 2E/m_ec^2} = ${F.num(E / (1 + 2 * k), 3)}\,\text{keV}$, so $T_{\max} = E - E' \approx ${F.num(T, 3)}\,\text{keV}$. The electron can never take the full photon energy in one Compton scattering.`,
          };
        }
        const k = R.pick([0.5, 1, 2]);
        const E = 511 * k;
        const Ep = E / (1 + k * f);
        return {
          q: raw`A photon of energy $${F.num(E, 4)}\,\text{keV}$ ${k === 1 ? '(equal to the electron rest energy) ' : ''}Compton-scatters from a free electron at rest and emerges at $${th}^\circ$ from its original direction. The energy of the scattered photon is closest to`,
          ...GRE.numeric(R, Ep, [E / (1 + f), E * (1 - k * f) > 0 ? E * (1 - k * f) : E / 5, E * Math.abs(Math.cos(th * PI / 180)) || E / 6, E - Ep, E / (1 + 2 * k)], { unit: raw`\text{keV}`, fmt: x => F.num(x, 3), tol: 0.08 }),
          expl: raw`$\dfrac{1}{E'} = \dfrac{1}{E} + \dfrac{1 - \cos\theta}{m_ec^2}$, i.e. $E' = \dfrac{E}{1 + (E/m_ec^2)(1 - \cos\theta)} = \dfrac{${F.num(E, 4)}}{1 + ${F.num(k, 2)}\times${F.num(f, 2)}} \approx ${F.num(Ep, 3)}\,\text{keV}$.`,
        };
      },
    },
    {
      id: 'lab.photon.atten', sec: '7.4.2', level: 2, weight: 2,
      gen(R) {
        const ctx = R.pick([['662-keV gamma rays', 'lead'], ['1.25-MeV gamma rays', 'iron'], ['100-keV X-rays', 'aluminum'], ['1-MeV gamma rays', 'concrete'], ['60-keV X-rays', 'copper'], ['511-keV photons', 'tungsten']]);
        const v = R.pick(['thick', 'frac', 'mu', 'tenth']);
        const h = R.pick([0.2, 0.3, 0.4, 0.5, 0.6, 0.8, 1, 1.2, 1.5, 2, 2.5, 3, 4, 5]);
        if (v === 'thick') {
          const n = R.int(2, 7);
          return {
            q: raw`The half-value layer of ${ctx[1]} for ${ctx[0]} is $${h}\,\text{cm}$. What thickness of ${ctx[1]} reduces the intensity of a narrow beam to $1/${Math.pow(2, n)}$ of its initial value?`,
            ...GRE.numeric(R, n * h, [Math.pow(2, n) * h, Math.pow(2, n) * h / 2, h * n / 2, h / n, h * Math.log(Math.pow(2, n))], { unit: raw`\text{cm}` }),
            level: 1,
            expl: raw`Each half-value layer halves the intensity, and $${Math.pow(2, n)} = 2^{${n}}$, so ${n} half-value layers are needed: $${n}\times${h} = ${F.num(n * h, 3)}\,\text{cm}$. Attenuation is exponential, not linear in thickness.`,
          };
        }
        if (v === 'frac') {
          const n = R.pick([1, 2, 3, 4, 5, 0.5, 1.5]);
          const ans = Math.pow(2, -n);
          return {
            q: raw`A narrow beam of ${ctx[0]} passes through $${F.num(n * h, 3)}\,\text{cm}$ of ${ctx[1]}, whose half-value layer for these photons is $${h}\,\text{cm}$. The fraction of the photons transmitted without interacting is closest to`,
            ...GRE.numeric(R, ans, [1 - n / 4 > 0 ? 1 - n / 4 : ans / 4, Math.exp(-n), 1 / (2 * n), Math.pow(2, -2 * n), 1 - ans].filter(x => x > 0 && x < 1), { fmt: x => F.num(x, 2) }),
            expl: raw`$I/I_0 = (1/2)^{x/x_{1/2}} = (1/2)^{${n}} \approx ${F.num(ans, 2)}$.`,
          };
        }
        if (v === 'mu') {
          const mu = R.pick([0.1, 0.2, 0.25, 0.5, 0.7, 1, 1.2, 2, 5]);
          const askMfp = R.bool();
          const ans = askMfp ? 1 / mu : Math.LN2 / mu;
          return {
            q: raw`The linear attenuation coefficient of ${ctx[1]} for ${ctx[0]} is $\mu = ${mu}\,\text{cm}^{-1}$. The ${askMfp ? 'mean free path of the photons' : 'half-value layer (thickness that halves the beam intensity)'} is closest to`,
            ...GRE.numeric(R, ans, [askMfp ? Math.LN2 / mu : 1 / mu, mu, Math.LN2 * mu, 1 / (2 * mu), Math.LN10 / mu], { unit: raw`\text{cm}` }),
            expl: raw`$I = I_0e^{-\mu x}$. The mean free path is $1/\mu = ${F.num(1 / mu, 2)}\,\text{cm}$ and the half-value layer is $\ln 2/\mu \approx 0.693/\mu = ${F.num(Math.LN2 / mu, 2)}\,\text{cm}$.`,
          };
        }
        const k = R.int(1, 3);
        const ans = k * h * Math.log2(10);
        return {
          q: raw`The half-value layer of ${ctx[1]} for ${ctx[0]} is $${h}\,\text{cm}$. What thickness is needed to reduce the beam intensity by a factor of $${Math.pow(10, k)}$?`,
          ...GRE.numeric(R, ans, [Math.pow(10, k) * h / 2, 10 * k * h, k * h * Math.LN10, k * h, 5 * k * h], { unit: raw`\text{cm}` }),
          level: 3,
          expl: raw`A factor of 10 requires $\log_2 10 \approx 3.32$ half-value layers, so a factor $10^{${k}}$ needs $${k}\times3.32\times${h} \approx ${F.num(ans, 2)}\,\text{cm}$.`,
        };
      },
    },
    {
      id: 'lab.photon.pair', sec: '7.4.2', level: 2,
      gen(R) {
        const v = R.pick(['thr', 'ke', 'ke', 'annih', 'muon', 'vac']);
        if (v === 'vac') {
          return {
            q: 'Why can a single photon not convert into an electron–positron pair in empty space, far from any other matter?',
            ...GRE.mc(R, 'Energy and momentum cannot both be conserved without a nearby nucleus or electron to absorb recoil momentum.', ['Charge would not be conserved.', 'Lepton number would not be conserved.', 'Photons do not couple to electrons in vacuum.', 'The photon energy is always below $2m_ec^2$ in vacuum.', 'Angular momentum would not be conserved for any photon energy.']),
            expl: 'In the pair’s center-of-momentum frame the total momentum is zero, but a single photon has no rest frame ($E = pc \\ne 0$ in every frame). A third body (usually a nucleus) must take up momentum, which is why pair production occurs near nuclei.',
          };
        }
        if (v === 'thr') {
          const askLam = R.bool();
          return askLam ? {
            q: 'The longest photon wavelength that can produce an electron–positron pair near a heavy nucleus is closest to',
            ...GRE.numeric(R, 1.21, [2.43, 0.61, 4.86, 1.21 * 1836], { unit: raw`\text{pm}` }),
            expl: raw`Threshold $E = 2m_ec^2 = 1.022\,\text{MeV}$, so $\lambda = hc/E = 1240\,\text{eV·nm}/1.022\times10^6\,\text{eV} \approx 1.21\times10^{-3}\,\text{nm} = 1.21\,\text{pm}$ (half the electron Compton wavelength).`,
          } : {
            q: 'The minimum photon energy for electron–positron pair production in the field of a heavy nucleus is closest to',
            ...GRE.numeric(R, 1.022, [0.511, 2.044, 0.256, 938], { unit: raw`\text{MeV}`, fmt: x => F.num(x, 4) }),
            level: 1,
            expl: raw`The photon must supply the rest energy of both particles, $2m_ec^2 = 1.022\,\text{MeV}$; the heavy nucleus absorbs momentum but negligible energy. (Near a free electron the threshold rises to $4m_ec^2$.)`,
          };
        }
        if (v === 'muon') {
          return {
            q: 'The minimum photon energy needed to produce a $\\mu^+\\mu^-$ pair (muon rest energy 106 MeV) in the field of a heavy nucleus is closest to',
            ...GRE.numeric(R, 212, [106, 53, 424, 1.022], { unit: raw`\text{MeV}` }),
            expl: raw`Exactly as for electrons, the threshold is twice the rest energy: $2\times106\,\text{MeV} \approx 212\,\text{MeV}$.`,
          };
        }
        if (v === 'annih') {
          const ask = R.pick(['E', 'lam']);
          return ask === 'E' ? {
            q: 'A positron comes to rest in matter and annihilates with an electron, producing two photons. The energy of each photon is',
            ...GRE.numeric(R, 511, [1022, 255.5, 938, 2044], { unit: raw`\text{keV}`, fmt: x => F.num(x, 4) }), level: 1,
            expl: raw`The total energy $2m_ec^2 = 1.022\,\text{MeV}$ is shared equally by two back-to-back photons (momentum conservation), so each has $m_ec^2 = 511\,\text{keV}$.`,
          } : {
            q: 'An electron and a positron at rest annihilate into two photons. The wavelength of each photon is closest to',
            ...GRE.numeric(R, 2.43, [1.21, 4.86, 0.243, 24.3], { unit: raw`\text{pm}` }),
            expl: raw`Each photon has $E = m_ec^2$, so $\lambda = hc/m_ec^2 = h/m_ec$, the electron Compton wavelength, $2.43\,\text{pm}$.`,
          };
        }
        const E = R.pick([2, 3, 4, 5, 6, 8, 10, 12, 20]);
        const each = R.bool();
        const tot = E - 1.022;
        return {
          q: raw`${E === 8 ? 'An' : 'A'} $${E}\,\text{MeV}$ photon produces an electron–positron pair near a heavy nucleus. ${each ? 'If the electron and positron share the available kinetic energy equally, what is the kinetic energy of each?' : 'What is the total kinetic energy of the electron and positron?'}`,
          ...GRE.numeric(R, each ? tot / 2 : tot, each ? [E / 2, (E - 0.511) / 2, tot, E / 2 - 1.022] : [E, E - 0.511, tot / 2, E - 2.044], { unit: raw`\text{MeV}`, fmt: x => F.num(x, 4), tol: 0.02 }),
          expl: raw`The photon must first supply $2m_ec^2 = 1.022\,\text{MeV}$ of rest energy (the heavy nucleus takes negligible energy), leaving $${E} - 1.022 = ${F.num(tot, 3)}\,\text{MeV}$ of kinetic energy${each ? raw`, or $${F.num(tot / 2, 3)}\,\text{MeV}$ each` : ''}.`,
        };
      },
    },

    // ============================================================ 7.4.3 Detectors
    {
      id: 'lab.det.concept', sec: '7.4.3', level: 1,
      gen(R) {
        const v = R.pick(['best', 'best', 'roman']);
        if (v === 'best') {
          const d = R.pick(DET);
          return {
            q: `Which detector is best suited for ${d[0]}?`,
            ...GRE.mc(R, cap(d[1]), DET.filter(x => x !== d).map(x => cap(x[1]))),
            expl: d[2],
          };
        }
        const r = romanFrom(R, 'Which of the following statements about radiation detectors is (are) true?', DET_T, DET_F);
        return { q: r.q, choices: r.choices, ans: r.ans, level: 2, expl: 'Scintillators give light proportional to deposited energy, read out by photomultipliers (photocathode + dynode multiplication). Semiconductors need only ~3 eV per carrier pair (vs ~30 eV per ion pair in gas), so they have the best statistics-limited resolution, $\\sigma/E \\propto 1/\\sqrt{E}$; germanium must be cooled. Geiger counters give identical pulses. ' + r.tags };
      },
    },
    {
      id: 'lab.det.resolution', sec: '7.4.3', level: 2,
      gen(R) {
        const v = R.pick(['frac', 'scale', 'compare', 'fwhm']);
        const DT = [['silicon detector', 3.6], ['germanium detector', 3.0], ['gas ionization chamber', 30]];
        if (v === 'fwhm') {
          const s = R.pick([0.5, 0.8, 1, 1.2, 1.5, 2, 3, 5]);
          return {
            q: raw`A Gaussian peak in a gamma-ray spectrum has standard deviation $\sigma = ${s}\,\text{keV}$. Its full width at half maximum is closest to`,
            ...GRE.numeric(R, 2.355 * s, [2 * s, s, s / 2.355, Math.SQRT2 * s, 4 * s], { unit: raw`\text{keV}`, tol: 0.1 }),
            level: 1,
            expl: raw`For a Gaussian, $\text{FWHM} = 2\sqrt{2\ln 2}\,\sigma \approx 2.35\sigma = ${F.num(2.355 * s, 2)}\,\text{keV}$.`,
          };
        }
        if (v === 'scale') {
          const k = R.pick([4, 9, 16, 2, 100]);
          const abs = R.bool();
          const ans = abs ? Math.sqrt(k) : 1 / Math.sqrt(k);
          const ex = x => `$${F.exact(x)}$`;
          return {
            q: `For a detector whose energy resolution is limited by the statistics of the number of charge carriers produced, the deposited energy is increased by a factor of ${k}. By what factor does the ${abs ? 'absolute width $\\sigma_E$ of the peak (in keV)' : 'fractional resolution $\\sigma_E/E$'} change?`,
            ...GRE.mc(R, ex(ans), [1 / ans, k, 1 / k, 1, ans * ans * (abs ? 1 : 1)].map(ex).concat([ex(abs ? 1 / k : k)])),
            expl: raw`The number of carriers is $N = E/w$ with Poisson fluctuation $\sqrt{N}$, so $\sigma_E \propto \sqrt{E}$ and $\sigma_E/E \propto 1/\sqrt{E}$. Increasing $E$ by ${k} changes the ${abs ? 'absolute width' : 'fractional resolution'} by $${F.exact(ans)}$.`,
          };
        }
        if (v === 'compare') {
          const [A, B] = R.bool() ? [DT[2], DT[R.int(0, 1)]] : [DT[R.int(0, 1)], DT[2]];
          const ans = Math.sqrt(A[1] / B[1]);
          return {
            q: raw`The average energy needed to create one charge-carrier pair is about $${A[1]}\,\text{eV}$ in a ${A[0]} and $${B[1]}\,\text{eV}$ in a ${B[0]}. If both are limited only by carrier statistics, the ratio of their fractional energy resolutions, (${A[0]})/(${B[0]}), at the same deposited energy is closest to`,
            ...GRE.numeric(R, ans, [A[1] / B[1], B[1] / A[1], 1 / ans, ans * ans * ans], { fmt: x => F.num(x, 2) }),
            level: 3,
            expl: raw`$\sigma_E/E = 1/\sqrt{N} = \sqrt{w/E}$, so the ratio is $\sqrt{${A[1]}/${B[1]}} \approx ${F.num(ans, 2)}$. Semiconductors win because each pair costs about ten times less energy than in a gas.`,
          };
        }
        const [nm, w] = R.pick(DT.slice(0, 2));
        const E = R.pick([60, 122, 360, 662, 1000, 1332]) * 1e3;
        const N = E / w;
        const ans = 100 / Math.sqrt(N);
        return {
          q: raw`A ${nm} needs about $${w}\,\text{eV}$ to create one electron–hole pair. If a $${F.num(E / 1e3, 4)}\,\text{keV}$ photon deposits all its energy and the resolution is set purely by Poisson statistics of the number of pairs, the fractional resolution $\sigma_E/E$ is closest to`,
          ...GRE.numeric(R, ans, [100 / N, 100 * Math.sqrt(w / 1e3 / E * 1e3) * 10, ans * 2.355, ans / 10, ans * 10], { unit: raw`\%`, fmt: x => F.num(x, 2) }),
          expl: raw`$N = E/w = ${F.num(E, 4)}/${w} \approx ${F.sci(N, 2)}$ pairs, so $\sigma_E/E = 1/\sqrt{N} \approx ${F.num(ans, 2)}\%$ (the Fano factor makes real detectors even better).`,
        };
      },
    },
    {
      id: 'lab.det.deadtime', sec: '7.4.3', level: 2,
      gen(R) {
        const m = R.pick([1e3, 2e3, 4e3, 5e3, 1e4, 2e4, 5e4]);
        const x = R.pick([0.05, 0.1, 0.2, 0.25, 0.4, 0.5]);
        const tau = x / m;
        const v = R.pick(['true', 'true', 'frac', 'max']);
        const tS = `$${si(tau, '\\text{s}')}$`;
        if (v === 'max') {
          return {
            q: raw`A counter has a nonparalyzable dead time of ${tS}. As the true event rate becomes very large, its recorded count rate approaches`,
            ...GRE.numeric(R, 1 / tau, [1 / (2 * tau), 1 / (Math.E * tau), 2 / tau, 10 / tau], { fmt: v2 => si(v2, '\\text{s}^{-1}', 2) }),
            level: 3,
            expl: raw`After each recorded event the counter is dead for $\tau$, so it can record at most one event per $\tau$: $m = n/(1 + n\tau) \to 1/\tau = ${si(1 / tau, '\\text{s}^{-1}', 2)}$. (A paralyzable counter instead peaks at $1/e\tau$ and then falls.)`,
          };
        }
        if (v === 'frac') {
          return {
            q: raw`A detector with a dead time of ${tS} per event records $${F.num(m, 2)}$ counts per second. Approximately what fraction of the time is the detector dead?`,
            ...GRE.numeric(R, x, [x / 2, 2 * x, 1 - x, x / 5, x / 10, 1.5 * x].filter(y => y < 0.96), { fmt: v2 => F.num(v2 * 100, 2) + '\\%', fill: [0.5, 0.25, 0.1, 1.5] }),
            level: 1,
            expl: raw`Each recorded count makes the detector dead for $\tau$, so the dead fraction is $m\tau = ${F.num(m, 2)}\times${F.sci(tau, 2)} = ${F.num(x, 2)}$.`,
          };
        }
        const n = m / (1 - x);
        return {
          q: raw`A counter with a nonparalyzable dead time of ${tS} records $${F.num(m, 2)}$ counts per second. The true event rate is closest to`,
          ...GRE.numeric(R, n, [m * (1 - x), m, m / (1 - x) ** 2, m / (1 + x), m * (1 + 2 * x), 1 / tau], { fmt: v2 => F.num(v2, 3) + '\\,\\text{s}^{-1}', tol: 0.04 }),
          expl: raw`The detector is live for a fraction $1 - m\tau = ${F.num(1 - x, 2)}$ of the time, so $n = \dfrac{m}{1 - m\tau} = \dfrac{${F.num(m, 2)}}{${F.num(1 - x, 2)}} \approx ${F.num(n, 3)}\,\text{s}^{-1}$.`,
        };
      },
    },
    {
      id: 'lab.det.geometry', sec: '7.4.3', level: 2,
      gen(R) {
        if (R.bool(0.4)) {
          const r1 = R.pick([20, 30, 40, 50]), k = R.pick([2, 3, 4, 0.5]);
          const d1 = R.pick([10, 20, 25, 50]), d2 = d1 * k;
          const ans = r1 / (k * k);
          return {
            q: raw`A small detector records $${r1 * 100}$ counts per minute (background negligible) at a distance of $${d1}\,\text{cm}$ from a point gamma-ray source. If it is moved to $${d2}\,\text{cm}$ from the source, the expected count rate is about`,
            ...GRE.numeric(R, ans * 100, [r1 * 100 / k, r1 * 100 / (k * k * k), r1 * 100 * k, r1 * 100 / Math.sqrt(k)], { fmt: v => String(Math.round(v)) + '\\,\\text{min}^{-1}' }),
            level: 1,
            expl: raw`The fraction of isotropically emitted photons hitting a small detector is $A_{\text{det}}/4\pi d^2$, so the rate scales as $1/d^2$: factor $1/${F.num(k * k, 2)}$, giving $${Math.round(ans * 100)}$ counts per minute.`,
          };
        }
        const A = R.pick([1e4, 2e4, 3.7e4, 5e4, 1e5, 3.7e5, 1e6]);
        const S = R.pick([5, 10, 12.6, 20, 31.4, 50]), d = R.pick([10, 20, 25, 50, 100]), eff = R.pick([0.1, 0.2, 0.25, 0.5, 1]);
        const rate = A * eff * S / (4 * PI * d * d);
        return {
          q: raw`A point source of activity $${F.sci(A, 2)}\,\text{Bq}$ emits one gamma ray per decay isotropically. A detector with a face area of $${S}\,\text{cm}^2$ is placed $${d}\,\text{cm}$ away (the face is small compared with $d^2$) and detects ${eff === 1 ? 'every' : `a fraction ${eff} of the`} gamma ray${eff === 1 ? '' : 's'} striking it. The count rate is closest to`,
          ...GRE.numeric(R, rate, [A * eff * S / (d * d), A * eff * S / (2 * PI * d * d), A * eff * S / (4 * PI * d), A * S / (4 * PI * d * d) * (eff === 1 ? 2 : 1), A * eff * S / (PI * d * d)], { fmt: v => F.num(v, 2) + '\\,\\text{s}^{-1}' }),
          expl: raw`The detector subtends a fraction $S/4\pi d^2 = ${S}/(4\pi\times${d}^2) \approx ${F.sci(S / (4 * PI * d * d), 2)}$ of the full sphere, so the rate is $A\varepsilon S/4\pi d^2 \approx ${F.num(rate, 2)}\,\text{s}^{-1}$.`,
        };
      },
    },
    {
      id: 'lab.det.spectrum', sec: '7.4.3', level: 3, weight: 2,
      gen(R) {
        const [E, src] = R.pick(GAMMAS);
        const keys = E > 1100 ? ['pp', 'ce', 'bs', 'se', 'de'] : ['pp', 'ce', 'bs'];
        const k = R.pick(keys.filter(x => x !== 'pp'));
        const val = SPEC[k][1](E);
        const why = raw`For $E_\gamma = ${E}\,\text{keV}$: the Compton edge is at $E\,\dfrac{2E/m_ec^2}{1 + 2E/m_ec^2} \approx ${F.num(SPEC.ce[1](E), 3)}\,\text{keV}$, the backscatter peak at $E/(1 + 2E/m_ec^2) \approx ${F.num(SPEC.bs[1](E), 3)}\,\text{keV}$${E > 1100 ? raw`, and the single- and double-escape peaks (one or both 511-keV annihilation photons escaping after pair production) at $${E - 511}$ and $${E - 1022}\,\text{keV}$` : ''}.`;
        if (R.bool(0.5)) {
          const wr = keys.filter(x => x !== k).map(x => SPEC[x][1](E)).concat([E / 2, E - 511 > 0 ? E - 511 : E * 0.9]);
          return {
            q: raw`A detector is exposed to $${E}\,\text{keV}$ gamma rays from ${src}. In the recorded spectrum, ${SPEC[k][0]} is expected at an energy closest to`,
            ...GRE.numeric(R, val, wr, { unit: raw`\text{keV}`, fmt: x => F.num(x, 3), tol: 0.06 }),
            expl: why,
          };
        }
        return {
          q: raw`A detector is exposed to $${E}\,\text{keV}$ gamma rays from ${src}. A feature is observed in the spectrum at about $${F.num(val, 3)}\,\text{keV}$. It is most likely`,
          ...GRE.mc(R, SPEC[k][0], Object.keys(SPEC).filter(x => x !== k).map(x => SPEC[x][0]).concat(['an X-ray fluorescence line of the detector material'])),
          expl: why,
        };
      },
    },

    // ============================================================ 7.4.4 Radioactive decays
    {
      id: 'lab.decay.halflife', sec: '7.4.4', level: 1, weight: 2,
      gen(R) {
        const th = R.pick([2, 3, 5, 6, 8, 10, 12, 15, 20, 30]);
        const u = R.pick(['s', 'min', 'h', 'days', 'years']);
        const v = R.pick(['rem', 'dec', 'time', 'tau', 'lam', 'date']);
        if (v === 'date') {
          const n = R.int(1, 5);
          return {
            q: raw`A wood sample contains $1/${Math.pow(2, n)}$ as much carbon-14 per gram of carbon as living wood. Taking the half-life of carbon-14 as $5730$ years, the age of the sample is closest to`,
            ...GRE.numeric(R, n * 5730, [5730 * Math.pow(2, n) / 2, 5730 / n, 5730 * n / Math.LN2, 5730 * (n + 1)], { unit: raw`\text{yr}`, fmt: x => F.num(x, 2) }),
            level: 2,
            expl: raw`$1/${Math.pow(2, n)} = (1/2)^{${n}}$, so ${n} half-lives have passed: $${n}\times5730 \approx ${F.num(n * 5730, 2)}$ years.`,
          };
        }
        if (v === 'rem' || v === 'dec') {
          const n = R.int(1, 6);
          const rem = Math.pow(2, -n);
          const ans = v === 'rem' ? rem : 1 - rem;
          const f = x => `$${F.exact(x)}$`;
          return {
            q: raw`A radioactive isotope has a half-life of $${th}\,\text{${u}}$. What fraction of the original nuclei ${v === 'rem' ? 'remains undecayed' : 'has decayed'} after $${n * th}\,\text{${u}}$?`,
            ...GRE.mc(R, f(ans), [1 - ans, 1 / (2 * n), Math.pow(2, -n - 1), Math.pow(2, -n + 1) < 1 ? Math.pow(2, -n + 1) : 0.75, 1 / n === ans ? 1 / (n + 2) : 1 / n, Math.pow(2, -2 * n)].filter(x => x > 0 && x < 1).map(f), { rank: frVal }),
            expl: raw`$${n * th}\,\text{${u}}$ is ${n} half-lives, so the surviving fraction is $(1/2)^{${n}} = ${F.frac(1, Math.pow(2, n))}$${v === 'dec' ? raw` and the decayed fraction is $1 - ${F.frac(1, Math.pow(2, n))} = ${F.exact(ans)}$` : ''}.`,
          };
        }
        if (v === 'time') {
          const n = R.int(2, 7);
          return {
            q: raw`The activity of a sample falls by a factor of $${Math.pow(2, n)}$ in $${n * th}\,\text{${u}}$. What is its half-life?`,
            ...GRE.numeric(R, th, [n * th / Math.pow(2, n), n * th / 2, n * th * Math.LN2 / n / 2, th / Math.LN2, n * th], { unit: raw`\text{${u}}` }),
            expl: raw`A factor $${Math.pow(2, n)} = 2^{${n}}$ means ${n} half-lives, so $t_{1/2} = ${n * th}/${n} = ${th}\,\text{${u}}$.`,
          };
        }
        if (v === 'tau') {
          return {
            q: raw`A radioactive isotope has a half-life of $${th}\,\text{${u}}$. Its mean lifetime is closest to`,
            ...GRE.numeric(R, th / Math.LN2, [th * Math.LN2, th, th / 2, 2 * th, th * Math.E], { unit: raw`\text{${u}}`, tol: 0.1 }),
            expl: raw`$N = N_0e^{-t/\tau}$ halves at $t_{1/2} = \tau\ln 2$, so $\tau = t_{1/2}/\ln 2 \approx 1.44\,t_{1/2} = ${F.num(th / Math.LN2, 2)}\,\text{${u}}$. After one mean life, $1/e \approx 37\%$ remains.`,
          };
        }
        return {
          q: raw`The number of undecayed nuclei in a sample obeys $N(t) = N_0e^{-\lambda t}$, and the half-life is $${th}\,\text{${u}}$. The decay constant $\lambda$ is closest to`,
          ...GRE.numeric(R, Math.LN2 / th, [1 / th, th / Math.LN2, Math.LN2 * th, 1 / (2 * th), Math.LN10 / th], { fmt: x => `${F.num(x, 2)}\\,\\text{${u}}^{-1}`, tol: 0.1 }),
          level: 1,
          expl: raw`Setting $e^{-\lambda t_{1/2}} = 1/2$ gives $\lambda = \ln 2/t_{1/2} = 0.693/${th} \approx ${F.num(Math.LN2 / th, 2)}\,\text{${u}}^{-1}$.`,
        };
      },
    },
    {
      id: 'lab.decay.branching', sec: '7.4.4', level: 2, weight: 2,
      gen(R) {
        const [t1, t2] = R.pick([[2, 2], [3, 6], [4, 12], [2, 3], [10, 15], [12, 4], [20, 5], [30, 20], [6, 12], [8, 24], [15, 10], [5, 20], [6, 3], [24, 8]]);
        const sc = R.pick([1, 10, 100]);
        const u = R.pick(['ns', 'μs', 's', 'min', 'h']);
        const uT = u === 'μs' ? '\\mu\\text{s}' : `\\text{${u}}`;
        const a = t1 * sc, b = t2 * sc;
        const tot = a * b / (a + b);
        const v = R.pick(['tot', 'tot', 'half', 'frac', 'partial']);
        if (v === 'frac') {
          const N = R.pick([1000, 3000, 6000, 12000, 60000]);
          const ans = N * b / (a + b);
          return {
            q: raw`An unstable nucleus can decay through channel 1, with partial lifetime $${a}\,${uT}$, or channel 2, with partial lifetime $${b}\,${uT}$. Of $${N}$ such nuclei, how many are expected to decay through channel 1?`,
            ...GRE.numeric(R, ans, [N * a / (a + b), N / 2, N * tot / (a + b), N * b / a > N ? N / 4 : N * b / a], { fmt: x => String(Math.round(x)), tol: 0.05 }),
            expl: raw`Decay rates add: $\lambda_i = 1/\tau_i$. The branching fraction to channel 1 is $\lambda_1/(\lambda_1 + \lambda_2) = \tau_2/(\tau_1 + \tau_2) = ${F.frac(b, a + b)}$, giving $${Math.round(ans)}$ decays. The shorter partial lifetime wins more often.`,
          };
        }
        if (v === 'partial') {
          const B = R.pick([[1, 2], [1, 3], [1, 4], [1, 5], [2, 5], [1, 10], [3, 4]]);
          const tt = R.pick([1, 2, 3, 5, 6]) * sc;
          const ans = tt * B[1] / B[0];
          return {
            q: raw`A particle has a mean lifetime of $${tt}\,${uT}$ and decays into a particular final state with branching fraction $${F.frac(B[0], B[1])}$. The partial lifetime for that decay mode is`,
            ...GRE.numeric(R, ans, [tt * B[0] / B[1], tt, tt * (1 - B[0] / B[1]), tt / (1 - B[0] / B[1])].filter(x => x > 0), { unit: uT }),
            expl: raw`The partial decay rate is $\lambda_i = B_i\lambda = B_i/\tau$, so $\tau_i = \tau/B_i = ${tt}\div${F.frac(B[0], B[1])} = ${F.num(ans, 3)}\,${uT}$, longer than the total lifetime.`,
          };
        }
        const half = v === 'half';
        const what = half ? 'partial half-lives' : 'partial mean lifetimes';
        return {
          q: raw`A radioactive nucleus can decay by two independent modes with ${what} of $${a}\,${uT}$ and $${b}\,${uT}$. Its ${half ? 'half-life' : 'mean lifetime'} is`,
          ...GRE.numeric(R, tot, [a + b, (a + b) / 2, Math.sqrt(a * b), Math.abs(a - b) || a / 4, Math.min(a, b)], { unit: uT, fmt: x => F.num(x, 3), tol: 0.06 }),
          expl: raw`Independent decay rates add: $\dfrac{1}{${half ? 't_{1/2}' : '\\tau'}} = \dfrac{1}{${a}} + \dfrac{1}{${b}}$, so $${half ? 't_{1/2}' : '\\tau'} = ${F.num(tot, 3)}\,${uT}$ — shorter than either partial value.${half ? ' (Half-lives combine like lifetimes, since each is $\\ln 2$ times the corresponding lifetime.)' : ''}`,
        };
      },
    },
    {
      id: 'lab.decay.activity', sec: '7.4.4', level: 2,
      gen(R) {
        const v = R.pick(['A', 'A', 'N', 'ratio', 'later']);
        const T = R.pick([['1 hour', 3600], ['1 day', 8.64e4], ['8 days', 6.9e5], ['30 years', 9.5e8], ['5.3 years', 1.67e8], ['10 minutes', 600], ['1 year', 3.15e7]]);
        if (v === 'ratio') {
          const k = R.pick([2, 3, 4, 5, 10]);
          const same = R.bool();
          return {
            q: same ? `Two samples contain equal numbers of radioactive nuclei. Sample X has a half-life ${k} times that of sample Y. The ratio of their activities, $A_X/A_Y$, is`
              : `Two radioactive samples have equal activities. Sample X has a half-life ${k} times that of sample Y. The ratio of the numbers of radioactive nuclei, $N_X/N_Y$, is`,
            ...GRE.mc(R, `$${F.frac(...(same ? [1, k] : [k, 1]))}$`, [`$${F.frac(...(same ? [k, 1] : [1, k]))}$`, '$1$', `$${F.frac(1, k * k)}$`, `$${k * k}$`, `$${F.exact(Math.sqrt(k))}$`]),
            level: 1,
            expl: raw`$A = \lambda N = N\ln 2/t_{1/2}$. ${same ? `Equal $N$ means $A \\propto 1/t_{1/2}$, so $A_X/A_Y = 1/${k}$.` : `Equal $A$ means $N \\propto t_{1/2}$, so $N_X/N_Y = ${k}$.`}`,
          };
        }
        if (v === 'later') {
          const A0 = R.pick([800, 1600, 3200, 6400, 12800]), n = R.int(1, 5);
          const th = R.pick([2, 3, 5, 8, 10]);
          return {
            q: raw`A source has an activity of $${A0}\,\text{Bq}$ and a half-life of $${th}\,\text{h}$. Its activity $${n * th}\,\text{h}$ later is`,
            ...GRE.numeric(R, A0 / Math.pow(2, n), [A0 / (2 * n), A0 * Math.exp(-n), A0 / Math.pow(2, n + 1), A0 * (1 - n / 8) > 0 ? A0 * (1 - n / 8) : A0 / 64], { unit: raw`\text{Bq}`, fmt: x => F.num(x, 3) }),
            level: 1,
            expl: raw`Activity is proportional to the number of nuclei, so it halves every half-life: $${A0}/2^{${n}} = ${F.num(A0 / Math.pow(2, n), 3)}\,\text{Bq}$.`,
          };
        }
        if (v === 'N') {
          const A = R.pick([1e3, 1e4, 3.7e4, 1e5, 1e6]);
          const N = A * T[1] / Math.LN2;
          return {
            q: raw`A sample has an activity of $${F.sci(A, 2)}\,\text{Bq}$, and the isotope's half-life is ${T[0]} ($\approx ${F.sci(T[1], 2)}\,\text{s}$). The number of radioactive nuclei in the sample is closest to`,
            ...GRE.numeric(R, N, [A * T[1], A * T[1] * Math.LN2, A / T[1], A * T[1] / 2], { fmt: x => F.sci(x, 2) }),
            expl: raw`$N = A/\lambda = A\,t_{1/2}/\ln 2 = ${F.sci(A, 2)}\times${F.sci(T[1], 2)}/0.693 \approx ${F.sci(N, 2)}$.`,
          };
        }
        const N = R.pick([1, 2, 5]) * Math.pow(10, R.int(12, 20));
        const A = N * Math.LN2 / T[1];
        return {
          q: raw`A sample contains $${F.sci(N, 2)}$ nuclei of an isotope whose half-life is ${T[0]} ($\approx ${F.sci(T[1], 2)}\,\text{s}$). Its activity is closest to`,
          ...GRE.numeric(R, A, [N / T[1], N * T[1], N / (T[1] * Math.LN2), A / 3.7e10 * 1e4], { unit: raw`\text{Bq}`, fmt: x => F.sci(x, 2) }),
          expl: raw`$A = \lambda N = N\ln 2/t_{1/2} = 0.693\times${F.sci(N, 2)}/${F.sci(T[1], 2)}\,\text{s} \approx ${F.sci(A, 2)}\,\text{Bq}$ (decays per second).`,
        };
      },
    },
    {
      id: 'lab.decay.chain', sec: '7.4.4', level: 2, weight: 2,
      gen(R) {
        const v = R.pick(['fwd', 'fwd', 'count', 'single']);
        if (v === 'single') {
          const [Z, A, md] = R.pick(SINGLES);
          const [dZ, dA] = MODE_D[md];
          const cand = [[Z + 1, A], [Z - 1, A], [Z - 2, A - 4], [Z, A - 1], [Z + 1, A - 1], [Z, A], [Z - 1, A - 1], [Z + 2, A + 4]].filter(([z, a]) => z >= 1 && !(z === Z + dZ && a === A + dA));
          return {
            q: `The nucleus ${nuc(Z, A)} undergoes ${MODE[md]}. The resulting nucleus is`,
            ...GRE.mc(R, nuc(Z + dZ, A + dA), cand.map(([z, a]) => nuc(z, a))),
            level: 1,
            expl: 'Alpha decay removes $^4_2\\text{He}$ ($Z \\to Z-2$, $A \\to A-4$); $\\beta^-$ decay turns a neutron into a proton ($Z \\to Z+1$); $\\beta^+$ decay and electron capture turn a proton into a neutron ($Z \\to Z-1$); gamma emission changes neither. ' + `Here: ${nuc(Z, A)} → ${nuc(Z + dZ, A + dA)}.`,
          };
        }
        if (v === 'count') {
          let P, D;
          if (R.bool(0.6)) [P, D] = R.pick(CHAINS);
          else { P = R.pick(PARENTS); const a = R.int(1, 6), b = R.int(0, 4); D = [P[0] - 2 * a + b, P[1] - 4 * a]; if (D[0] < 79) throw new Error('low Z'); }
          const a = (P[1] - D[1]) / 4, b = D[0] - (P[0] - 2 * a);
          if (!Number.isInteger(a) || b < 0) throw new Error('bad chain');
          const s = (x, y) => `${x} alpha decay${x === 1 ? '' : 's'} and ${y} beta-minus decay${y === 1 ? '' : 's'}`;
          const wr = [];
          for (const da of [-1, 0, 1]) for (const db of [-2, -1, 0, 1, 2]) { const x = a + da, y = b + db; if ((da || db) && x >= 0 && y >= 0 && x + y > 0) wr.push(s(x, y)); }
          return {
            q: `A decay chain starts at ${nuc(...P)} and ends at ${nuc(...D)}, proceeding only through alpha and beta-minus decays. How many of each occur?`,
            ...GRE.mc(R, s(a, b), R.shuffle(wr).slice(0, 8)),
            expl: raw`Only alpha decays change $A$ (by 4): $(${P[1]} - ${D[1]})/4 = ${a}$ alphas. These lower $Z$ by $${2 * a}$, to $${P[0] - 2 * a}$; each $\beta^-$ raises $Z$ by 1, so $${D[0]} - ${P[0] - 2 * a} = ${b}$ beta decays are needed.`,
          };
        }
        const P = R.pick(PARENTS);
        const a = R.int(1, 4), b = R.int(0, 3);
        const D = [P[0] - 2 * a + b, P[1] - 4 * a];
        if (D[0] < 80) throw new Error('low Z');
        const cand = [[P[0] - 2 * a - b, P[1] - 4 * a], [P[0] - 2 * a + b, P[1] - 2 * a], [P[0] - a + b, P[1] - 4 * a], [P[0] - 2 * a + b, P[1] - 4 * a - b], [P[0] - 2 * a, P[1] - 4 * a], [P[0] - 4 * a + b, P[1] - 4 * a], [P[0] - 2 * a + 2 * b, P[1] - 4 * a], [P[0] - 2 * a + b + 1, P[1] - 4 * a]];
        return {
          q: `The nucleus ${nuc(...P)} undergoes ${a} alpha decay${a > 1 ? 's' : ''}${b ? ` and ${b} beta-minus decay${b > 1 ? 's' : ''}` : ''}. The resulting nucleus is`,
          ...GRE.mc(R, nuc(...D), cand.filter(([z, A]) => !(z === D[0] && A === D[1]) && z > 0).map(([z, A]) => nuc(z, A))),
          expl: raw`Each alpha decay lowers $Z$ by 2 and $A$ by 4; each $\beta^-$ decay raises $Z$ by 1 and leaves $A$ unchanged. So $Z = ${P[0]} - ${2 * a} + ${b} = ${D[0]}$ (${ELEM[D[0]]}) and $A = ${P[1]} - ${4 * a} = ${D[1]}$.`,
        };
      },
    },
    {
      id: 'lab.decay.types', sec: '7.4.4', level: 1,
      gen(R) {
        const v = R.pick(['true', 'false', 'roman', 'roman']);
        const base = 'Alpha: a helium-4 nucleus with discrete energy, stopped by paper ($Z-2$, $A-4$). Beta: $\\beta^-$ emits $e^-\\bar\\nu$ (continuous spectrum, $n\\to p$, $Z+1$), $\\beta^+$ and electron capture convert $p\\to n$ ($Z-1$). Gamma: a photon from a nuclear transition, uncharged, most penetrating, no change in $Z$ or $A$. ';
        if (v === 'roman') {
          const r = romanFrom(R, 'Which of the following statements about radioactive decay is (are) true?', DEC_T, DEC_F);
          return { q: r.q, choices: r.choices, ans: r.ans, level: 2, expl: base + r.tags };
        }
        const t = v === 'true';
        return {
          q: `Which of the following statements about radioactive decay is ${t ? 'true' : 'FALSE'}?`,
          ...GRE.mc(R, R.pick(t ? DEC_T : DEC_F), t ? DEC_F : DEC_T),
          expl: base,
        };
      },
    },

    // ============================================================ 7.5.1 Generic laser operation
    {
      id: 'lab.laser.concept', sec: '7.5.1', level: 1, weight: 2,
      gen(R) {
        const v = R.pick(['true', 'false', 'roman', 'roman', 'inv', 'two']);
        const base = 'Laser action needs stimulated emission (which copies the frequency, phase, polarization, and direction of the incident photon) to outrun absorption, which requires population inversion between the laser levels. Inversion cannot be reached thermally or by pumping a two-level system (absorption and stimulated emission balance at equal populations), so practical lasers use three- or four-level schemes with a metastable upper level; four-level lasers are easier because the lower level empties quickly. ';
        if (v === 'inv') {
          return {
            q: 'In a laser, “population inversion” means that',
            ...GRE.mc(R, 'the upper laser level holds more atoms than the lower laser level', ['the ground state holds more atoms than any excited state', 'the two laser levels hold equal numbers of atoms', 'the populations follow a Boltzmann distribution at a very high temperature', 'all of the atoms are in the ground state', 'the lower laser level is metastable']),
            expl: 'Only when $N_{\\text{upper}} > N_{\\text{lower}}$ does stimulated emission exceed absorption, giving net gain. Formally this corresponds to a negative temperature for the two levels; it never occurs in thermal equilibrium.',
          };
        }
        if (v === 'two') {
          return {
            q: 'Why can a steady-state population inversion not be produced by optically pumping a simple two-level system?',
            ...GRE.mc(R, 'As the populations approach equality, stimulated emission by the pump light balances absorption, so the upper level can never exceed the lower.', ['Spontaneous emission is forbidden in a two-level system.', 'The pump photons have too little energy to excite the upper level.', 'Stimulated emission is impossible unless a third level is present.', 'Energy conservation forbids absorption between only two levels.', 'The upper level of a two-level system is always metastable.']),
            level: 2,
            expl: 'The Einstein $B$ coefficients for absorption and stimulated emission are equal (for equal degeneracies), so pumping at the transition frequency can at best equalize the populations (saturation). A third (and fourth) level lets the pump and the laser transition be different transitions.',
          };
        }
        if (v === 'roman') {
          const r = romanFrom(R, 'Which of the following statements about lasers is (are) true?', LAS_T, LAS_F);
          return { q: r.q, choices: r.choices, ans: r.ans, level: 2, expl: base + r.tags };
        }
        const t = v === 'true';
        return {
          q: `Which of the following statements about laser operation is ${t ? 'true' : 'FALSE'}?`,
          ...GRE.mc(R, R.pick(t ? LAS_T : LAS_F), t ? LAS_F : LAS_T),
          expl: base,
        };
      },
    },
    {
      id: 'lab.laser.levels', sec: '7.5.1', level: 2, weight: 2,
      gen(R) {
        const [lam, e] = R.pick([[400, 3.1], [496, 2.5], [620, 2.0], [775, 1.6], [827, 1.5], [1000, 1.24], [1240, 1.0], [2000, 0.62], [500, 2.48], [689, 1.8]]);
        const E1 = R.pick([0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.8]);
        const E2 = +(E1 + e).toFixed(2), E3 = +(E2 + R.pick([0.2, 0.3, 0.4, 0.5, 0.6, 0.8, 1.0])).toFixed(2);
        const lifes = ['$10\\,\\text{ns}$', '$1\\,\\text{ms}$', '$20\\,\\text{ns}$'];
        const stem = raw`A four-level laser medium has excited levels at $E_1 = ${E1}\,\text{eV}$, $E_2 = ${E2}\,\text{eV}$, and $E_3 = ${E3}\,\text{eV}$ above the ground state $E_0 = 0$. Atoms are pumped from $E_0$ to $E_3$; the lifetimes of $E_1$, $E_2$, and $E_3$ are ${lifes[2]}, ${lifes[1]}, and ${lifes[0]}, respectively.`;
        const nm = x => 1240 / x;
        const v = R.pick(['laser', 'laser', 'pump', 'eff']);
        if (v === 'eff') {
          const q = e / E3;
          return {
            q: `${stem} Neglecting all other losses, the largest possible fraction of each pump photon's energy that can appear in the laser photon is closest to`,
            ...GRE.numeric(R, q, [E2 / E3, E1 / E3, (E3 - E2) / E3, e / E2, (E3 - E1) / E3], { fmt: x => F.num(x * 100, 2) + '\\%', tol: 0.08 }),
            level: 3,
            expl: raw`Each cycle absorbs a pump photon of $E_3 = ${E3}\,\text{eV}$ and emits one laser photon of $E_2 - E_1 = ${F.num(e, 3)}\,\text{eV}$; the rest is lost in the fast nonradiative decays. The quantum efficiency is at most $${F.num(e, 3)}/${E3} \approx ${F.num(q * 100, 2)}\%$.`,
          };
        }
        if (v === 'pump') {
          return {
            q: `${stem} The wavelength of the pump light is closest to`,
            ...GRE.numeric(R, nm(E3), [nm(e), nm(E2), nm(E3 - E1), nm(E3 - E2)], { unit: raw`\text{nm}`, fmt: x => F.num(x, 3), tol: 0.05 }),
            level: 1,
            expl: raw`The pump drives $E_0 \to E_3$: $\lambda = hc/E_3 = 1240\,\text{eV·nm}/${E3}\,\text{eV} \approx ${F.num(nm(E3), 3)}\,\text{nm}$.`,
          };
        }
        return {
          q: `${stem} The laser output wavelength is closest to`,
          ...GRE.numeric(R, lam, [nm(E2), nm(E3), nm(E3 - E1), nm(E3 - E2) < 1e5 ? nm(E3 - E2) : null, nm(E1)].filter(Boolean), { unit: raw`\text{nm}`, fmt: x => F.num(x, 3), tol: 0.05 }),
          expl: raw`Atoms pile up in the long-lived (metastable) level $E_2$, and the short-lived level $E_1$ empties quickly, so inversion is between $E_2$ and $E_1$. The laser photon has $E_2 - E_1 = ${F.num(e, 3)}\,\text{eV}$, so $\lambda = 1240/${F.num(e, 3)} \approx ${lam}\,\text{nm}$.`,
        };
      },
    },

    // ============================================================ 7.5.2 Types of lasers
    {
      id: 'lab.laser.types', sec: '7.5.2', level: 1, weight: 2,
      gen(R) {
        const v = R.pick(['byLam', 'lam', 'medium', 'trans', 'special']);
        const nm = i => `${/^[A-Z]/.test(LASERS[i][0]) ? 'an' : /^[aeiou]/.test(LASERS[i][0]) ? 'an' : 'a'} ${LASERS[i][0]} laser`;
        const name = i => cap(`${LASERS[i][0]} laser`);
        if (v === 'byLam') {
          const [w, i] = R.pick(LAS_LAM);
          return {
            q: `Which of the following lasers emits at a wavelength of ${w}?`,
            ...GRE.mc(R, name(i), LASERS.map((_, j) => j).filter(j => j !== i && j !== 7 && j !== 8).map(name)),
            expl: `Standard lines: He–Ne 632.8 nm, ruby 694.3 nm, argon-ion 488/514.5 nm, Nd:YAG 1064 nm, CO₂ 10.6 μm, ArF excimer 193 nm. So ${w} is ${nm(i)}.`,
          };
        }
        if (v === 'lam') {
          const [, i] = R.pick(LAS_LAM);
          return {
            q: `The principal output wavelength of ${nm(i)} is`,
            ...GRE.mc(R, LAS_LAM.find(x => x[1] === i)[0], LAS_LAM.filter(x => x[1] !== i).map(x => x[0]).concat(['1.55 μm'])),
            expl: `${cap(nm(i))} emits at ${LASERS[i][1]}.`,
          };
        }
        if (v === 'medium' || v === 'trans') {
          const k = v === 'medium' ? 2 : 3;
          const i = R.int(0, LASERS.length - 1);
          return {
            q: v === 'medium' ? `The gain medium of ${nm(i)} is` : `In ${nm(i)}, the laser transitions occur between`,
            ...GRE.mc(R, LASERS[i][k], LASERS.filter((_, j) => j !== i).map(x => x[k])),
            level: 2,
            expl: `${cap(nm(i))}: gain medium ${LASERS[i][2]}; transitions: ${LASERS[i][3]}; output ${LASERS[i][1]}.`,
          };
        }
        const [q, i, why] = R.pick(LAS_SPECIAL);
        return { q, ...GRE.mc(R, name(i), LASERS.map((_, j) => j).filter(j => j !== i).map(name)), expl: why };
      },
    },
    {
      id: 'lab.laser.photons', sec: '7.5.2', level: 2, weight: 2,
      gen(R) {
        const L = R.pick([['helium–neon', 632.8, [1e-3, 2e-3, 5e-3]], ['red diode', 650, [1e-3, 5e-3]], ['frequency-doubled Nd:YAG (green)', 532, [5e-3, 1, 2]], ['Nd:YAG', 1064, [1, 5, 10, 20]], ['carbon dioxide', 10600, [10, 50, 100, 1000]], ['argon-ion', 488, [0.1, 1, 5]], ['ArF excimer', 193, [1, 10]]]);
        const P = R.pick(L[2]);
        const Eph = 1240 / L[1];
        const v = R.pick(['rate', 'rate', 'energy', 'ratio']);
        if (v === 'energy') {
          return {
            q: raw`The photon energy of ${/^[aeiouAN]/.test(L[0]) ? 'an' : 'a'} ${L[0]} laser (wavelength $${L[1] >= 1e4 ? F.num(L[1] / 1000, 3) + '\\,\\mu\\text{m}' : L[1] + '\\,\\text{nm}'}$) is closest to`,
            ...GRE.numeric(R, Eph, [L[1] / 1240, Eph * 2 * PI, Eph / 2 / PI, Eph * 10, 2 * Eph], { unit: raw`\text{eV}`, fmt: x => F.num(x, 2) }),
            level: 1,
            expl: raw`$E = hc/\lambda = 1240\,\text{eV·nm}/${L[1]}\,\text{nm} \approx ${F.num(Eph, 2)}\,\text{eV}$.`,
          };
        }
        if (v === 'ratio') {
          const M = R.pick([['ArF excimer', 193], ['argon-ion', 488], ['helium–neon', 632.8], ['Nd:YAG', 1064], ['carbon dioxide', 10600]].filter(x => x[1] !== L[1]));
          const r = L[1] / M[1];
          return {
            q: `${/^[aeiouAN]/.test(L[0]) ? 'An' : 'A'} ${L[0]} laser ($\\lambda = ${L[1]}\\,\\text{nm}$) and ${/^[aeiouAN]/.test(M[0]) ? 'an' : 'a'} ${M[0]} laser ($\\lambda = ${M[1]}\\,\\text{nm}$) have the same output power. The ratio of the number of photons emitted per second, (${L[0]})/(${M[0]}), is closest to`,
            ...GRE.numeric(R, r, [1 / r, 1, r * r, Math.sqrt(r)], { fmt: x => F.num(x, 2) }),
            level: 2,
            expl: raw`Photon rate $= P/(hc/\lambda) \propto \lambda$ at fixed power, so the ratio is $${L[1]}/${M[1]} \approx ${F.num(r, 2)}$: longer-wavelength lasers emit more (lower-energy) photons per joule.`,
          };
        }
        const rate = P / (Eph * 1.6e-19);
        return {
          q: raw`${/^[aeiouAN]/.test(L[0]) ? 'An' : 'A'} ${L[0]} laser with wavelength $${L[1]}\,\text{nm}$ emits a continuous output power of $${si(P, '\\text{W}')}$. The number of photons it emits per second is closest to`,
          ...GRE.numeric(R, rate, [P / Eph, P * L[1] * 1e-9 / 6.63e-34, rate / (2 * PI), rate * 1e3], { fmt: x => F.sci(x, 2) + '\\,\\text{s}^{-1}' }),
          expl: raw`Each photon carries $hc/\lambda = ${F.num(Eph, 3)}\,\text{eV} = ${F.sci(Eph * 1.6e-19, 2)}\,\text{J}$, so the rate is $${si(P, '\\text{W}')}/${F.sci(Eph * 1.6e-19, 2)}\,\text{J} \approx ${F.sci(rate, 2)}\,\text{s}^{-1}$. Forgetting to convert eV to joules is the classic error.`,
        };
      },
    },
    {
      id: 'lab.laser.diode', sec: '7.5.2', level: 2,
      gen(R) {
        const v = R.pick(['lam', 'lam', 'gap', 'harm']);
        if (v === 'harm') {
          const n = R.pick([2, 3, 4]);
          const base = R.pick([[1064, 'Nd:YAG'], [800, 'Ti:sapphire'], [1030, 'Yb:YAG']]);
          const ans = base[0] / n;
          return {
            q: raw`The output of a ${base[1]} laser at $${base[0]}\,\text{nm}$ is passed through a nonlinear crystal that generates its ${['', '', 'second', 'third', 'fourth'][n]} harmonic. The wavelength of the harmonic light is`,
            ...GRE.numeric(R, ans, [base[0] * n, base[0] / Math.sqrt(n), base[0] / (n + 1), base[0] / (n - 1) === base[0] ? base[0] * 1.5 : base[0] / (n - 1)], { unit: raw`\text{nm}`, fmt: x => F.num(x, 3) }),
            level: 1,
            expl: raw`The $n$th harmonic has $n$ times the frequency, so $\lambda/n = ${base[0]}/${n} \approx ${F.num(ans, 3)}\,\text{nm}$ (e.g. the 532-nm green line of doubled Nd:YAG).`,
          };
        }
        const M = R.pick([['GaAs', 1.42], ['GaN', 3.4], ['InP', 1.34], ['InGaN', 3.06], ['AlGaAs', 1.6], ['InGaAsP', 0.8], ['GaP', 2.26], ['a hypothetical semiconductor', R.step(0.8, 3.2, 0.1)]]);
        const lam = 1240 / M[1];
        if (v === 'gap') {
          return {
            q: raw`A semiconductor diode laser emits at $${F.num(lam, 3)}\,\text{nm}$. The band gap of the active material is closest to`,
            ...GRE.numeric(R, M[1], [lam / 1240, M[1] / 2, 2 * M[1], M[1] * 2 * PI], { unit: raw`\text{eV}`, fmt: x => F.num(x, 2) }),
            expl: raw`Laser photons come from electron–hole recombination across the gap, so $E_g \approx hc/\lambda = 1240/${F.num(lam, 3)} \approx ${F.num(M[1], 2)}\,\text{eV}$.`,
          };
        }
        return {
          q: raw`The active region of a diode laser is made of ${M[0]}, with a band gap of $${M[1]}\,\text{eV}$. The emission wavelength is closest to`,
          ...GRE.numeric(R, lam, [lam / 2, 2 * lam, 1240 * M[1], lam / (2 * PI)], { unit: raw`\text{nm}`, fmt: x => F.num(x, 3) }),
          expl: raw`Photons are emitted when conduction-band electrons recombine with valence-band holes, with energy $\approx E_g$: $\lambda = 1240\,\text{eV·nm}/${M[1]}\,\text{eV} \approx ${F.num(lam, 3)}\,\text{nm}$.`,
        };
      },
    },

    // ============================================================ 7.5.3 Interferometers
    {
      id: 'lab.interf.mirror', sec: '7.5.3', level: 2, weight: 2,
      gen(R) {
        const [lam, src] = R.pick([[632.8, 'helium–neon laser'], [589, 'sodium lamp'], [546.1, 'mercury lamp (green line)'], [500, 'laser'], [450, 'blue laser'], [405, 'violet diode laser'], [1064, 'Nd:YAG laser']]);
        const v = R.pick(['N', 'd', 'lam', 'speed', 'doublet']);
        const N = R.pick([20, 50, 100, 150, 200, 250, 400, 500, 1000]);
        const d = N * lam / 2; // nm
        const um = x => F.num(x / 1000, 3);
        if (v === 'doublet') {
          const D = R.pick([[589.3, 0.6, 'the sodium D lines'], [577, 2.1, 'the yellow mercury doublet']]);
          const ans = D[0] * D[0] / (2 * D[1]) * 1e-6; // mm
          return {
            q: raw`A Michelson interferometer is illuminated by ${D[2]}, two wavelengths near $${D[0]}\,\text{nm}$ separated by $${D[1]}\,\text{nm}$. As one mirror is moved, the fringes periodically fade and reappear. The mirror displacement between successive fringe-visibility minima is closest to`,
            ...GRE.numeric(R, ans, [2 * ans, ans / 2, D[0] / (2 * D[1]) * 1e-6, D[0] * D[0] / D[1] * 1e-6 * 4], { unit: raw`\text{mm}`, fmt: x => F.num(x, 2) }),
            level: 3,
            expl: raw`The two fringe patterns get out of step by one fringe when $2d/\lambda_1 - 2d/\lambda_2 = 1$, i.e. $d = \lambda^2/(2\Delta\lambda) = (${D[0]})^2/(2\times${D[1]})\,\text{nm} \approx ${F.num(ans, 2)}\,\text{mm}$.`,
          };
        }
        if (v === 'speed') {
          const vv = R.pick([1, 2, 5, 10, 20, 50]) * 1e-6;
          const f = 2 * vv / (lam * 1e-9);
          return {
            q: raw`One mirror of a Michelson interferometer illuminated by a $${lam}\,\text{nm}$ ${src} moves at a steady $${si(vv, '\\text{m/s}')}$. Fringes pass a detector at a rate of about`,
            ...GRE.numeric(R, f, [f / 2, 2 * f, f / (2 * PI), vv / (lam * 1e-9) / 4], { fmt: x => si(x, '\\text{Hz}', 2) }),
            expl: raw`Moving the mirror by $\lambda/2$ changes the path difference by $\lambda$ (one fringe), so the fringe rate is $2v/\lambda = 2(${F.sci(vv, 2)})/(${F.sci(lam * 1e-9, 4)}) \approx ${si(f, '\\text{Hz}', 2)}$.`,
          };
        }
        if (v === 'N') {
          return {
            q: raw`In a Michelson interferometer illuminated by a $${lam}\,\text{nm}$ ${src}, one mirror is moved by $${um(d)}\,\mu\text{m}$. How many bright fringes pass a fixed point in the field of view?`,
            ...GRE.numeric(R, N, [N / 2, 2 * N, N / 4, 4 * N], { fmt: x => String(Math.round(x)) }),
            level: 1,
            expl: raw`The light travels to the mirror and back, so moving it by $d$ changes the path difference by $2d$. Fringes counted: $N = 2d/\lambda = 2(${F.num(d, 4)}\,\text{nm})/${lam}\,\text{nm} = ${N}$.`,
          };
        }
        if (v === 'd') {
          return {
            q: raw`While one mirror of a Michelson interferometer illuminated by a $${lam}\,\text{nm}$ ${src} is translated, $${N}$ bright fringes are counted passing a reference mark. The mirror moved a distance closest to`,
            ...GRE.numeric(R, d, [2 * d, d / 2, 4 * d, d * PI], { fmt: x => um(x) + '\\,\\mu\\text{m}' }),
            expl: raw`Each fringe corresponds to a change $\lambda$ in the round-trip path, i.e. a mirror displacement of $\lambda/2$: $d = N\lambda/2 = ${N}\times${lam}/2\,\text{nm} \approx ${um(d)}\,\mu\text{m}$.`,
          };
        }
        return {
          q: raw`When one mirror of a Michelson interferometer is moved by $${um(d)}\,\mu\text{m}$, exactly $${N}$ fringes pass the detector. The wavelength of the light is closest to`,
          ...GRE.numeric(R, lam, [lam / 2, 2 * lam, 4 * lam, lam / 4], { unit: raw`\text{nm}`, fmt: x => F.num(x, 3) }),
          expl: raw`$N = 2d/\lambda$, so $\lambda = 2d/N = 2(${F.num(d, 4)}\,\text{nm})/${N} = ${F.num(lam, 4)}\,\text{nm}$.`,
        };
      },
    },
    {
      id: 'lab.interf.gas', sec: '7.5.3', level: 2, weight: 2,
      gen(R) {
        const lam = R.pick([500, 589, 632.8, 546.1]);
        if (R.bool(0.35)) {
          const n = R.pick([1.4, 1.5, 1.6]);
          const N = R.pick([10, 20, 30, 40, 50, 60, 80, 100]);
          const t = N * lam / (2 * (n - 1)); // nm
          return {
            q: raw`A thin transparent sheet with index of refraction $${n}$ is inserted perpendicular to the beam in one arm of a Michelson interferometer illuminated with $${lam}\,\text{nm}$ light, and $${N}$ fringes shift past the reference point. The thickness of the sheet is closest to`,
            ...GRE.numeric(R, t, [2 * t, t * (n - 1) / n, N * lam / (2 * n), N * lam / (n - 1)].filter(x => x > 0), { fmt: x => F.num(x / 1000, 2) + '\\,\\mu\\text{m}', tol: 0.08 }),
            expl: raw`The sheet replaces a thickness $t$ of air, adding optical path $(n - 1)t$ on each pass, and the light passes twice: $2(n - 1)t = N\lambda$, so $t = ${N}\times${lam}\,\text{nm}/(2\times${F.num(n - 1, 2)}) \approx ${F.num(t / 1000, 2)}\,\mu\text{m}$.`,
          };
        }
        const L = R.pick([2, 3, 4, 5, 10, 20]); // cm
        const gas = R.pick([['air', 2.9e-4], ['carbon dioxide', 4.5e-4], ['helium', 3.5e-5], ['argon', 2.8e-4], ['nitrogen', 3.0e-4]]);
        const Nf = 2 * L * 1e-2 * gas[1] / (lam * 1e-9);
        if (R.bool()) {
          return {
            q: raw`A cell of length $${L}\,\text{cm}$ in one arm of a Michelson interferometer is initially evacuated and then slowly filled with ${gas[0]} to atmospheric pressure, while $${lam}\,\text{nm}$ light illuminates the interferometer. Taking the index of refraction of ${gas[0]} to be $1 + ${F.sci(gas[1], 2)}$, the number of fringes that pass a reference point is closest to`,
            ...GRE.numeric(R, Nf, [Nf / 2, 2 * Nf, Nf * (1 + gas[1]) / gas[1] / 1e4, Nf / (2 * PI)], { fmt: x => F.num(x, 2), tol: 0.15 }),
            level: 2,
            expl: raw`The optical path through the cell changes by $(n - 1)L$ each way, so $N = 2L(n - 1)/\lambda = 2(${L / 100}\,\text{m})(${F.sci(gas[1], 2)})/(${F.sci(lam * 1e-9, 4)}\,\text{m}) \approx ${F.num(Nf, 2)}$.`,
          };
        }
        const Nr = Math.max(1, Math.round(Nf));
        const nm1 = Nr * lam * 1e-9 / (2 * L * 1e-2);
        return {
          q: raw`A $${L}\,\text{cm}$ gas cell sits in one arm of a Michelson interferometer illuminated with $${lam}\,\text{nm}$ light. As the cell is filled from vacuum to atmospheric pressure, $${Nr}$ fringes pass the reference point. The index of refraction $n$ of the gas satisfies $n - 1 \approx$`,
          ...GRE.numeric(R, nm1, [2 * nm1, nm1 / 2, nm1 * 4, nm1 * PI], { fmt: x => F.sci(x, 2) }),
          level: 3,
          expl: raw`$2L(n - 1) = N\lambda$ (factor 2 for the double pass), so $n - 1 = \dfrac{${Nr}\times${F.sci(lam * 1e-9, 4)}\,\text{m}}{2\times${L / 100}\,\text{m}} \approx ${F.sci(nm1, 2)}$.`,
        };
      },
    },
    {
      id: 'lab.interf.fp', sec: '7.5.3', level: 2, weight: 2,
      gen(R) {
        const v = R.pick(['fsr', 'fsr', 'modes', 'dlam', 'finesse', 'concept']);
        if (v === 'concept') {
          return {
            q: 'The reflectivity of both mirrors of a Fabry–Pérot interferometer is increased while their spacing is kept fixed. Which of the following describes the effect on the transmission peaks?',
            ...GRE.mc(R, 'They become narrower, while their spacing in frequency is unchanged.', ['They become broader, while their spacing in frequency is unchanged.', 'They become narrower and more closely spaced.', 'They become broader and more widely spaced.', 'They shift to longer wavelengths without changing width.', 'They disappear, since a more reflective cavity transmits no light at any frequency.']),
            level: 1,
            expl: 'The peak spacing (free spectral range) $c/2nd$ depends only on the spacing; higher reflectivity means more round trips before light leaks out, so the finesse rises and the peaks sharpen. At exact resonance an ideal lossless cavity still transmits fully.',
          };
        }
        const d = R.pick([0.5, 1, 1.5, 2, 3, 5, 10, 15, 25, 30, 50, 75, 100]) * 1e-2; // m
        const n = R.bool(0.25) && d <= 0.02 ? 1.5 : 1;
        const fsr = 3e8 / (2 * n * d);
        const dS = si(d, '\\text{m}');
        const what = d >= 0.1 ? `a laser cavity of length $${dS}$` : `a Fabry–Pérot etalon with ${n === 1 ? 'an air gap' : 'a glass plate (index 1.5)'} of thickness $${dS}$`;
        if (v === 'fsr') {
          return {
            q: raw`The frequency spacing between adjacent transmission maxima (the free spectral range) of ${what} at normal incidence is closest to`,
            ...GRE.numeric(R, fsr, [2 * fsr, fsr / 2, 3e8 / (n * d) / 4, fsr * n * (n === 1 ? 4 : 1)], { fmt: x => si(x, '\\text{Hz}', 2) }),
            expl: raw`Resonance requires $2nd = m\lambda$, i.e. $\nu_m = mc/2nd$, so adjacent modes are $\Delta\nu = c/2nd = 3\times10^8/(2\times${n === 1 ? '' : '1.5\\times'}${F.num(d, 2)}) \approx ${si(fsr, '\\text{Hz}', 2)}$.`,
          };
        }
        if (v === 'modes') {
          const Lc = R.pick([0.15, 0.3, 0.5, 0.75, 1.0, 1.5]);
          const f = 3e8 / (2 * Lc);
          const k = R.pick([3, 4, 5, 6, 8, 10, 20]);
          const bw = k * f;
          return {
            q: raw`A gas laser has a mirror separation of $${si(Lc, '\\text{m}')}$, and its gain medium amplifies over a bandwidth of about $${si(bw, '\\text{Hz}', 2)}$. Approximately how many longitudinal modes can oscillate?`,
            ...GRE.numeric(R, k, [k / 2, 2 * k, k * k, Math.sqrt(k)], { fmt: x => F.num(x, 2), tol: 0.2 }),
            level: 3,
            expl: raw`The longitudinal modes are spaced by $c/2L = ${si(f, '\\text{Hz}', 2)}$, so the gain bandwidth holds about $${si(bw, '\\text{Hz}', 2)}/${si(f, '\\text{Hz}', 2)} = ${k}$ modes.`,
          };
        }
        if (v === 'dlam') {
          const lam = R.pick([500, 589, 632.8, 1064]);
          const dl = lam * lam * 1e-18 / (2 * n * d);
          return {
            q: raw`For light near $${lam}\,\text{nm}$, the wavelength spacing between adjacent transmission peaks of ${what} at normal incidence is closest to`,
            ...GRE.numeric(R, dl, [2 * dl, dl / 2, lam * 1e-9 / (2 * n * d) * 1e-9, dl * 1e3], { fmt: x => si(x, '\\text{m}', 2) }),
            level: 3,
            expl: raw`$\Delta\lambda = \lambda^2/2nd = (${F.sci(lam * 1e-9, 4)})^2/(2\times${n === 1 ? '' : '1.5\\times'}${F.num(d, 2)}) \approx ${si(dl, '\\text{m}', 2)}$ (equivalent to $\Delta\nu = c/2nd$).`,
          };
        }
        const Fin = R.pick([10, 20, 30, 50, 100, 200]);
        const lw = fsr / Fin;
        return {
          q: raw`${cap(what)} has a finesse of $${Fin}$. The full width of each transmission peak, in frequency, is closest to`,
          ...GRE.numeric(R, lw, [fsr, fsr * Fin, lw * 2, lw / 2], { fmt: x => si(x, '\\text{Hz}', 2) }),
          expl: raw`The free spectral range is $c/2nd \approx ${si(fsr, '\\text{Hz}', 2)}$, and the finesse is the ratio of peak spacing to peak width: $\delta\nu = ${si(fsr, '\\text{Hz}', 2)}/${Fin} \approx ${si(lw, '\\text{Hz}', 2)}$.`,
        };
      },
    },
  ]);
})(typeof window !== 'undefined' ? window.GRE : this.GRE);
