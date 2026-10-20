/* Special Relativity — Chapter 6 of Conquering the Physics GRE.
 * Templates follow the conventions in tools/AUTHORING.md.
 */
(function (GRE) {
  'use strict';
  const F = GRE.fmt;
  const raw = String.raw;
  const C = GRE.C;

  // speeds whose gamma factor is rational: beta = a/c, gamma = c/b for Pythagorean triples (a, b, c)
  const TRIPLES = [[3, 4, 5], [4, 3, 5], [5, 12, 13], [12, 5, 13], [8, 15, 17], [15, 8, 17], [7, 24, 25], [24, 7, 25], [20, 21, 29], [21, 20, 29], [9, 40, 41], [40, 9, 41]];
  const SMALL = TRIPLES.slice(0, 8);
  const mk = ([a, b, c]) => ({ bn: a, bd: c, gn: c, gd: b, beta: a / c, gamma: c / b, gb: a / b });
  const fast = (R, list) => mk(R.pick(list || TRIPLES));
  // n/d of c as TeX: "c", "2c", "\frac{3}{5}\,c"
  const fc = (n, d) => { const f = F.frac(n, d); return f === '1' ? 'c' : /^\d+$/.test(f) ? f + 'c' : f + '\\,c'; };
  // beta as TeX: a terminating decimal (0.6, 0.28) when possible, otherwise a fraction
  const bTeX = s => { const x = s.beta * 100; return Math.abs(x - Math.round(x)) < 1e-9 ? F.fix(s.beta, 2) : F.frac(s.bn, s.bd); };
  const spd = s => bTeX(s) + '\\,c';
  const gTeX = s => F.frac(s.gn, s.gd);
  const pm = rows => '\\begin{pmatrix}' + rows.map(r => r.join(' & ')).join(' \\\\ ') + '\\end{pmatrix}';
  const LIFE = [['muon', 2.2e-6], ['charged pion', 2.6e-8], ['charged kaon', 1.2e-8]];

  /** Choices for exactly representable reals (fractions, surds), ordered by value.
   *  sym is appended (e.g. 'c', 'mc^2'); opts: signed, max, maxDen, pre, extra [[string, rank]], keep */
  function exactMC(R, correct, wrongs, sym, opts) {
    sym = sym || ''; opts = opts || {};
    const val = new Map();
    const md = opts.maxDen || 64;
    const fmt = x => {
      if (x == null || !isFinite(x)) return null;
      if (!opts.signed && x <= 0) return null;
      const e = F.exact(x, md);
      if (!e) return null;
      let t = !sym ? e : e === '1' ? sym : e === '-1' ? '-' + sym : e + '\\,' + sym;
      t = '$' + (opts.pre || '') + t + '$';
      if (!val.has(t)) val.set(t, x);
      return t;
    };
    const ct = fmt(correct);
    if (!ct) throw new Error('exactMC: correct answer has no exact form');
    const ws = [];
    for (const w of wrongs) {
      if (w == null || !isFinite(w) || Math.abs(w - correct) < 1e-9 * Math.max(1, Math.abs(correct))) continue;
      if (opts.max != null && w > opts.max) continue;
      const t = fmt(w);
      if (t && t !== ct) ws.push(t);
    }
    for (const [s, r] of (opts.extra || [])) { val.set(s, r); ws.push(s); }
    return GRE.mc(R, ct, ws, { rank: t => val.get(t), keep: opts.keep });
  }
  /** Choices for a speed given as a fraction [n, d] of c, wrong fractions likewise. */
  function fracMC(R, W, wrongs) {
    const val = new Map();
    const fmt = f => { const t = `$${fc(f[0], f[1])}$`; val.set(t, f[0] / f[1]); return t; };
    const ct = fmt(W);
    return GRE.mc(R, ct, wrongs.filter(f => f[0] > 0 && f[1] > 0).map(fmt), { rank: t => val.get(t) });
  }
  /** Fixed-order string choices: correct plus wrongs, with rank by a given order list. */
  function orderedMC(R, order, correct, wrongs) {
    return GRE.mc(R, correct, wrongs, { rank: t => order.indexOf(t) });
  }

  GRE.addTemplates('sr', [
    {
      id: 'sr.dilation.distance', sec: '6.1.2', level: 2,
      gen(R) {
        const s = fast(R);
        let name, tau;
        if (R.bool(0.35)) [name, tau] = R.pick(LIFE);
        else {
          name = R.pick(['unstable particle', 'short-lived particle', 'hypothetical particle X', 'unstable hadron']);
          tau = R.pick([1, 1.5, 2, 2.5, 3, 4, 5, 6, 8]) * Math.pow(10, R.pick([-6, -7, -8, -9, -10]));
        }
        const bc = s.beta * C.c;
        const stem = raw`A ${name} has a mean lifetime of $${F.sci(tau, 2)}\,\text{s}$ in its rest frame. It moves through the laboratory at speed $${spd(s)}$.`;
        if (R.bool(0.65)) {
          const d = s.gamma * bc * tau;
          return {
            q: stem + ' How far does it travel, on average, in the laboratory before decaying?',
            ...GRE.numeric(R, d, [bc * tau, bc * tau / s.gamma, C.c * tau * s.gamma, s.gamma * s.gamma * bc * tau], { unit: raw`\text{m}` }),
            expl: raw`In the lab the lifetime is dilated: $\tau_{\text{lab}} = \gamma\tau$ with $\gamma = 1/\sqrt{1-\beta^2} = ${gTeX(s)}$. The distance is $d = \gamma\beta c\,\tau = ${F.num(d, 2)}\,\text{m}$. Forgetting $\gamma$ gives $\beta c\tau$, a common trap.`,
          };
        }
        const T = s.gamma * tau;
        return {
          q: stem + ' What mean lifetime is measured in the laboratory?',
          ...GRE.numeric(R, T, [tau / s.gamma, tau, s.gamma * s.gamma * tau, s.gamma * s.beta * tau], { unit: raw`\text{s}` }),
          expl: raw`Moving clocks run slow, so the lab lifetime is longer: $\tau_{\text{lab}} = \gamma\tau = ${gTeX(s)}\times ${F.sci(tau, 2)}\,\text{s} = ${F.num(T, 2)}\,\text{s}$. Dividing by $\gamma$ instead gets the direction of the effect backwards.`,
        };
      },
    },
    {
      id: 'sr.contraction.rod', sec: '6.1.3', level: 1,
      gen(R) {
        const s = fast(R);
        const L0 = R.pick([1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 10, 12, 20, 30, 50, 100]);
        const L = L0 / s.gamma;
        const obj = R.pick(['rod', 'spaceship', 'train car', 'measuring rod', 'cargo container']);
        if (R.bool(0.7)) {
          return {
            q: raw`A ${obj} has length $${F.num(L0, 3)}\,\text{m}$ in its own rest frame. It moves parallel to its length at speed $${spd(s)}$ relative to an observer. What length does the observer measure?`,
            ...GRE.numeric(R, L, [L0 * s.gamma, L0 * (1 - s.beta), L0 * Math.sqrt(1 - s.beta), L0 / (s.gamma * s.gamma)], { unit: raw`\text{m}`, sig: 3, tol: 0.05 }),
            expl: raw`Moving objects are contracted along the direction of motion: $L = L_0/\gamma = L_0\sqrt{1-\beta^2} = ${F.num(L0, 3)}\times ${F.frac(s.gd, s.gn)} = ${F.num(L, 3)}\,\text{m}$. Check the limit: the observed length must be shorter than $L_0$.`,
          };
        }
        return {
          q: raw`A ${obj} moves parallel to its length at speed $${spd(s)}$ relative to an observer, who measures its length to be $${F.num(L, 3)}\,\text{m}$. What is its length in its own rest frame?`,
          ...GRE.numeric(R, L0, [L / s.gamma, L, L * (1 + s.beta), L / (s.gamma * s.gamma)], { unit: raw`\text{m}`, sig: 3, tol: 0.05 }),
          expl: raw`The rest (proper) length is the longest: $L_0 = \gamma L = ${gTeX(s)}\times ${F.num(L, 3)}\,\text{m} = ${F.num(L0, 3)}\,\text{m}$.`,
        };
      },
    },
    {
      id: 'sr.velocity.addition', sec: '6.1.4', level: 2,
      gen(R) {
        const den = R.pick([2, 3, 4, 5, 6, 7, 8, 10]);
        const u = R.int(1, den - 1), v = R.int(1, den - 1);
        const back = u > v && R.bool(0.35); // probe fired backward but still recedes from Earth
        const sg = back ? -1 : 1;
        const W = [(u + sg * v) * den, den * den + sg * u * v];
        const wrong = [
          [u + sg * v, den],                            // Galilean sum
          [(u + sg * v) * den, den * den - sg * u * v], // sign error in the denominator
          [(u - sg * v) * den, den * den - sg * u * v], // launched in the wrong direction
          [u, den], [v, den], [1, 1], [(u + sg * v) * den, den * den + u * u], [Math.abs(u - sg * v), den],
        ];
        const ship = R.pick(['spaceship', 'rocket', 'cargo shuttle']);
        const proj = R.pick(['probe', 'missile', 'small drone', 'capsule']);
        return {
          q: raw`A ${ship} moves away from Earth at speed $${fc(u, den)}$. It launches a ${proj} ${back ? 'backward (toward Earth)' : 'forward (directly away from Earth)'} at speed $${fc(v, den)}$ relative to the ${ship}. What is the speed of the ${proj} relative to Earth?`,
          ...fracMC(R, W, wrong),
          expl: raw`Relativistic velocity addition: $w = \dfrac{u + v'}{1 + uv'/c^2}$ with $u = ${fc(u, den)}$ and $v' = ${back ? '-' : '+'}${fc(v, den)}$, giving $w = ${fc(W[0], W[1])} \approx ${F.fix(W[0] / W[1], 3)}\,c$. The Galilean sum $u + v'$ is wrong and can even exceed $c$.`,
        };
      },
    },
    {
      id: 'sr.decay.speed', sec: '6.3.2', level: 2,
      gen(R) {
        const s = fast(R);
        const M = R.pick(['M', 'M_0', 'm_X']);
        const g = s.gamma, b = s.beta, r = s.gd / s.gn; // r = 1/gamma = 2m/M
        const stem = raw`A particle of mass $${M}$, initially at rest, decays into two identical particles, each of mass $${F.frac(s.gd, 2 * s.gn)}\,${M}$.`;
        const base = raw`Energy conservation in the rest frame: $${M}c^2 = 2\gamma mc^2$, so $\gamma = ${M}/(2m) = ${gTeX(s)}$ and $\beta = \sqrt{1 - 1/\gamma^2} = ${F.frac(s.bn, s.bd)}$ (the ${s.gd}–${s.bn}–${s.gn} Pythagorean triple).`;
        const ask = R.pick(['speed', 'speed', 'mom', 'ke']);
        if (ask === 'speed') return {
          q: stem + ' What is the speed of each decay product?',
          ...exactMC(R, b, [r, Math.sqrt(2 * (g - 1)), b / 2, Math.sqrt(1 - r), 1 - r], 'c', { max: 1.5, maxDen: 400 }),
          expl: base + ' Using the Newtonian $\\tfrac12 mv^2$ for the kinetic energy is the classic trap.',
        };
        if (ask === 'mom') return {
          q: stem + ' What is the magnitude of the momentum of each decay product?',
          ...exactMC(R, b / 2, [b, b * r / 2, 0.5, g * b / 2, Math.sqrt(2 * (g - 1)) * r / 2], `${M}c`, { maxDen: 400 }),
          expl: base + raw` Each product has $E = ${M}c^2/2$, so $p = \gamma m v = \beta E/c = ${F.frac(s.bn, 2 * s.bd)}\,${M}c$. Forgetting $\gamma$ ($p = mv$) underestimates it.`,
        };
        return {
          q: stem + ' What is the kinetic energy of each decay product?',
          ...exactMC(R, (1 - r) / 2, [1 - r, 0.5, r / 2, r * b * b / 4, (1 - r * r) / 2], `${M}c^2`, { maxDen: 400 }),
          expl: raw`Each product carries half the energy, $E = ${M}c^2/2$, and has rest energy $mc^2 = ${F.frac(s.gd, 2 * s.gn)}\,${M}c^2$, so $K = E - mc^2 = ${F.frac(s.gn - s.gd, 2 * s.gn)}\,${M}c^2$ — the mass difference $(${M} - 2m)c^2$ shared equally.`,
        };
      },
    },
    {
      id: 'sr.invariants.roman', sec: '6.3.1', level: 2,
      gen(R) {
        const TRUE = [
          'the rest mass of a particle',
          'the spacetime interval $c^2\\Delta t^2 - \\Delta x^2$ between two events',
          'the proper time between two events on a particle’s worldline',
          'the speed of light in vacuum',
          'the quantity $E^2 - p^2c^2$ for a system of particles',
          'the phase $\\omega t - \\mathbf{k}\\cdot\\mathbf{r}$ of a plane electromagnetic wave',
          'the electric charge of a particle',
        ];
        const FALSE = [
          'the total energy of a particle',
          'the time interval between two events',
          'the spatial distance between two events',
          'the momentum of a particle',
          'the frequency of a light wave',
          'the length of a rod',
          'the kinetic energy of a particle',
          'the order in time of two spacelike-separated events',
        ];
        const nTrue = R.int(1, 3);
        const stmts = R.shuffle(R.pickN(TRUE, nTrue).map(s => [s, true]).concat(R.pickN(FALSE, 3 - nTrue).map(s => [s, false])));
        return {
          q: GRE.romanStem('Which of the following quantities has the same value in every inertial reference frame?', stmts.map(x => x[0])),
          ...GRE.roman(R, stmts.map(x => x[1])),
          expl: 'Lorentz scalars (rest mass, invariant interval, proper time, $c$, $E^2-p^2c^2$, charge, wave phase) are frame-independent. Energy, momentum, frequency, lengths and time intervals are components of 4-vectors or intervals and change between frames. ' +
            stmts.map((x, i) => `${['I', 'II', 'III'][i]}: ${x[1] ? 'invariant' : 'frame-dependent'}.`).join(' '),
        };
      },
    },
    {
      id: 'sr.doppler.factor', sec: '6.4.1', level: 2,
      gen(R) {
        // beta = (k^2 - 1)/(k^2 + 1) makes the Doppler factor sqrt((1+b)/(1-b)) = k exactly
        const [p, q] = R.pick([[2, 1], [3, 1], [3, 2], [4, 3], [5, 3], [5, 4], [4, 1], [5, 2], [7, 4], [7, 5]]);
        const bn = p * p - q * q, bd = p * p + q * q;
        const recede = R.bool();
        const lam0 = R.pick([400, 420, 450, 480, 500, 520, 550, 600, 633, 656]);
        const k = recede ? p / q : q / p;
        const lam = lam0 * k;
        const b = bn / bd;
        const gamma = 1 / Math.sqrt(1 - b * b);
        const choice = GRE.numeric(R, lam, [lam0 / k, lam0 * (recede ? 1 + b : 1 - b), lam0 * (recede ? gamma : 1 / gamma), lam0 * (recede ? 1 / (1 - b) : 1 / (1 + b))], { unit: raw`\text{nm}`, sig: 3, tol: 0.04 });
        return {
          q: raw`A distant source emits light of wavelength $${lam0}\,\text{nm}$ in its rest frame. The source moves directly ${recede ? 'away from' : 'toward'} an observer at speed $${F.frac(bn, bd)}\,c$. What wavelength does the observer measure?`,
          ...choice,
          expl: raw`Relativistic longitudinal Doppler shift: $\lambda_{\text{obs}} = \lambda_0\sqrt{\dfrac{1 ${recede ? '+' : '-'} \beta}{1 ${recede ? '-' : '+'} \beta}}$. With $\beta = ${F.frac(bn, bd)}$ the square root is $${F.frac(recede ? p : q, recede ? q : p)}$, so $\lambda = ${F.num(lam, 3)}\,\text{nm}$ (${recede ? 'redshift: longer' : 'blueshift: shorter'}).`,
        };
      },
    },
    {
      id: 'sr.interval.proper', sec: '6.2.2', level: 2,
      gen(R) {
        const [a, b, c] = R.pick([[3, 4, 5], [5, 12, 13], [8, 15, 17], [7, 24, 25], [20, 21, 29], [9, 40, 41], [6, 8, 10], [12, 16, 20]]);
        const scale = R.pick([1, 2, 3, 5, 10]);
        const unit = R.pick([['s', 'light-seconds'], ['yr', 'light-years'], ['min', 'light-minutes']]);
        const dt = c * scale, dx = a * scale, tau = b * scale;
        const choice = GRE.numeric(R, tau, [dt, Math.sqrt(dt * dt + dx * dx), dt - dx, dx], { unit: raw`\text{${unit[0]}}`, fmt: x => F.num(x, 3), tol: 0.03 });
        return {
          q: raw`In the frame of a space station, event A occurs at $t = 0$, $x = 0$ and event B occurs at $t = ${dt}\,\text{${unit[0]}}$, $x = ${dx}$ ${unit[1]}. A clock travels at constant velocity so that it is present at both events. How much time elapses on that clock between A and B?`,
          ...choice,
          expl: raw`The elapsed time on a clock present at both events is the proper time, fixed by the invariant interval: $c^2\tau^2 = c^2\Delta t^2 - \Delta x^2 = (${dt})^2 - (${dx})^2 = ${tau * tau}$ (in $\text{${unit[0]}}^2$ with $c=1$), so $\tau = ${tau}\,\text{${unit[0]}}$.`,
        };
      },
    },
    {
      id: 'sr.simultaneity.order', sec: '6.1.1', level: 2,
      gen(R) {
        const kind = R.pick(['spacelike', 'timelike', 'lightlike']);
        const dt = R.int(2, 12);
        const dx = kind === 'lightlike' ? dt : kind === 'timelike' ? R.int(1, dt - 1) : R.int(dt + 1, dt + 12);
        // [statement, true for spacelike, timelike, lightlike]
        const S = [
          ['There is an inertial frame in which B occurs before A.', 1, 0, 0],
          ['A occurs before B in every inertial frame.', 0, 1, 1],
          ['There is an inertial frame in which A and B occur at the same place.', 0, 1, 0],
          ['There is an inertial frame in which A and B are simultaneous.', 1, 0, 0],
          ['Event A could have caused event B.', 0, 1, 1],
          ['The spacetime interval between A and B is zero in every frame.', 0, 0, 1],
          ['The two events are simultaneous in every inertial frame.', 0, 0, 0],
          ['A massive particle moving slower than light could be present at both events.', 0, 1, 0],
          ['No signal of any kind can travel from A to B, yet their time order is the same in all frames.', 0, 0, 0],
        ];
        const col = { spacelike: 1, timelike: 2, lightlike: 3 }[kind];
        const trues = S.filter(r => r[col]).map(r => r[0]);
        const falses = S.filter(r => !r[col]).map(r => r[0]);
        const why = {
          spacelike: 'Spacelike-separated events cannot be causally connected, and their time order depends on the frame: a boost with $\\beta = c\\Delta t/\\Delta x$ makes them simultaneous, and a faster boost reverses the order.',
          timelike: 'Timelike-separated events have a frame-independent time order, could be causally connected, and occur at the same place in the rest frame of a clock moving from A to B.',
          lightlike: 'Lightlike-separated events lie on a light ray: the interval is zero in every frame, only a light signal connects them, and the time order is preserved.',
        }[kind];
        return {
          q: raw`In frame S, event A happens at $t = 0,\ x = 0$ and event B happens at $t = ${dt}\,\text{s}$, $x = ${dx}$ light-seconds. Which of the following statements is correct?`,
          ...GRE.mc(R, R.pick(trues), falses),
          expl: raw`Compare $c\Delta t = ${dt}$ light-seconds with $\Delta x = ${dx}$ light-seconds: the interval $c^2\Delta t^2 - \Delta x^2 = ${dt * dt - dx * dx}$ is ${kind === 'spacelike' ? 'negative (spacelike)' : kind === 'timelike' ? 'positive (timelike)' : 'zero (lightlike)'}. ${why}`,
        };
      },
    },
  ]);

  // ------------------------------------------------------------ 6.1 Relativity 101
  GRE.addTemplates('sr', [
    {
      id: 'sr.simul.frame-speed', sec: '6.1.1', level: 2,
      gen(R) {
        const U = R.pick([['yr', 'light-years'], ['s', 'light-seconds'], ['min', 'light-minutes'], ['h', 'light-hours']]);
        let dt, dx;
        do { dt = R.int(1, 12); dx = R.int(1, 15); } while (dt === dx);
        const ask = R.pick(['simul', 'same']);
        const what = ask === 'simul' ? 'simultaneous' : 'at the same location';
        const cand = ask === 'simul' ? dt / dx : dx / dt;       // the speed (units of c) such a frame would need
        const exists = cand < 1;
        const NO = 'No such inertial frame exists';
        const q = raw`In inertial frame S, event A occurs at $t = 0$, $x = 0$, and event B occurs at $t = ${dt}\,\text{${U[0]}}$, $x = ${dx}$ ${U[1]}. What is the speed, relative to S, of an inertial frame (moving along $x$) in which A and B are ${what}?`;
        const formula = ask === 'simul'
          ? raw`$t' = \gamma(t - vx/c^2)$ gives $\Delta t' = 0$ when $v = c^2\Delta t/\Delta x = ${F.frac(dt, dx)}\,c$`
          : raw`$x' = \gamma(x - vt)$ gives $\Delta x' = 0$ when $v = \Delta x/\Delta t = ${F.frac(dx, dt)}\,c$`;
        const kind = dx > dt ? 'spacelike' : 'timelike';
        if (exists) {
          return {
            q, ...exactMC(R, cand, [1 / cand, Math.sqrt(1 - cand * cand), cand * cand, 1 - cand, cand / 2], 'c', { extra: [[NO, 100]] }),
            expl: raw`${formula}. The events are ${kind} ($c\Delta t ${dx > dt ? '<' : '>'} \Delta x$), so this speed is less than $c$ and the frame exists.`,
          };
        }
        const inv = 1 / cand;
        const ws = [cand, inv, Math.sqrt(1 - inv * inv), inv * inv, 1 - inv];
        const val = new Map(); const strs = [];
        for (const w of ws) { const e = F.exact(w); if (!e || w <= 0) continue; const t = `$${e === '1' ? '' : e + '\\,'}c$`; if (!val.has(t)) { val.set(t, w); strs.push(t); } }
        return {
          q, ...GRE.mc(R, NO, strs, { rank: t => (t === NO ? 100 : val.get(t)) }),
          expl: raw`${formula}, which exceeds $c$. The events are ${kind}: ${ask === 'simul' ? 'timelike-separated events have the same time order in every frame and are never simultaneous' : 'spacelike-separated events can never occur at the same place, since no observer can travel between them'}.`,
        };
      },
    },
    {
      id: 'sr.simul.time-offset', sec: '6.1.1', level: 3,
      gen(R) {
        const v = R.pick(['num', 'num', 'which', 'sync']);
        if (v === 'num') {
          const s = fast(R, SMALL);
          const L = R.pick([300, 600, 900, 1200, 1500, 2400, 3000, 4500, 6000, 9000]);
          const us = L / C.c * 1e6;
          const dt = s.gamma * s.beta * us;
          return {
            level: 2,
            q: raw`Two lamps at opposite ends of a straight track of length $${L}\,\text{m}$ (measured in the track frame) flash simultaneously in the track frame. A train moves along the track at speed $${spd(s)}$. According to observers on the train, what is the time interval between the two flashes?`,
            ...GRE.numeric(R, dt, [s.beta * us, s.gamma * us, s.beta * us / s.gamma, us, s.gamma * s.beta * s.beta * us], { unit: raw`\mu\text{s}` }),
            expl: raw`From $t' = \gamma(t - vx/c^2)$, events simultaneous in the track frame and separated by $L$ have $|\Delta t'| = \gamma vL/c^2 = \gamma\beta L/c = ${gTeX(s)}\times ${bTeX(s)}\times ${L}\,\text{m}/(3\times10^8\,\text{m/s}) = ${F.num(dt, 2)}\,\mu\text{s}$. The flash ahead of the train comes first.`,
          };
        }
        if (v === 'which') {
          const east = R.bool();
          const first = east ? 'eastern' : 'western', other = east ? 'western' : 'eastern';
          const ok = raw`The ${first} lamp flashes first, by $\gamma vL/c^2$.`;
          return {
            q: raw`Two lamps a distance $L$ apart on an east–west track flash simultaneously in the track frame. A train moves ${east ? 'east' : 'west'} along the track at speed $v$ ($\gamma = 1/\sqrt{1 - v^2/c^2}$). According to observers on the train, which statement is correct?`,
            ...GRE.mc(R, ok, [
              raw`The ${other} lamp flashes first, by $\gamma vL/c^2$.`,
              raw`The ${first} lamp flashes first, by $vL/(\gamma c^2)$.`,
              raw`The ${other} lamp flashes first, by $vL/c^2$.`,
              'The two lamps flash simultaneously on the train as well.',
              raw`The ${first} lamp flashes first, by $\gamma L/c$.`,
            ]),
            expl: raw`With $t' = \gamma(t - vx/c^2)$ and $\Delta t = 0$, $\Delta t' = -\gamma v\Delta x/c^2$: the event farther along the direction of motion (the ${first} lamp) happens first in the train frame, earlier by $\gamma vL/c^2$.`,
          };
        }
        const L = R.pick(['L_0', 'L', 'D']);
        return {
          q: raw`Clocks at the front and rear of a train of rest length $${L}$ are synchronized in the train's rest frame. The train moves at speed $v$ relative to the ground. At a single instant of ground time, what do ground observers find?`,
          ...GRE.mc(R, raw`The rear clock reads ahead of the front clock by $${L}v/c^2$.`, [
            raw`The front clock reads ahead of the rear clock by $${L}v/c^2$.`,
            raw`The rear clock reads ahead of the front clock by $${L}v/(\gamma c^2)$.`,
            raw`The front clock reads ahead of the rear clock by $\gamma ${L}v/c^2$.`,
            'The two clocks read the same time.',
            raw`The rear clock reads ahead of the front clock by $${L}/c$.`,
          ]),
          expl: raw`Invert $t = \gamma(t' + vx'/c^2)$ at fixed ground time: $t' = t/\gamma - vx'/c^2$, so the clock at $x' = ${L}$ (front) reads $${L}v/c^2$ less than the one at $x' = 0$ (rear). "Leading clocks lag" — and with the rest length, no extra $\gamma$ appears.`,
        };
      },
    },
    {
      id: 'sr.simul.train', sec: '6.1.1', level: 1,
      gen(R) {
        const veh = R.pick(['train car', 'railroad car', 'spaceship', 'rocket', 'cargo shuttle']);
        const sp = R.pick(['at speed $0.6c$', 'at speed $0.8c$', 'at speed $0.5c$', 'at speed $0.9c$', 'at a large fraction of the speed of light']);
        const grd = veh === 'spaceship' || veh === 'rocket' || veh === 'cargo shuttle' ? 'a space station' : 'the ground';
        const sc = R.pick(['A', 'A', 'B', 'C', 'D']);
        const only = R.pick(['$c/2$', '$0.9c$']);
        if (sc === 'A') {
          const view = R.pick(['grd', 'grd', 'veh']);
          const C0 = 'The rear detector registers the light first.', C1 = 'The front detector registers the light first.', C2 = 'Both detectors register the light at the same time.';
          const W = ['Which detector registers first depends on where the observer stands.', `The front detector registers first only if the speed exceeds ${only}.`];
          const corr = view === 'grd' ? C0 : C2;
          return {
            q: raw`A lamp at the exact center of a ${veh} flashes, and the light is detected by detectors on the front and rear walls. The ${veh} moves forward ${sp} relative to ${grd}. According to an observer ${view === 'grd' ? 'at rest relative to ' + grd : 'riding in the ' + veh}, which statement is correct?`,
            ...GRE.mc(R, corr, [C0, C1, C2].filter(x => x !== corr).concat(W)),
            expl: view === 'grd'
              ? `In the ${grd === 'the ground' ? 'ground' : 'station'} frame light still travels at $c$ in both directions, but the rear wall moves toward the light and the front wall moves away from it, so the rear detector is hit first.`
              : 'In the rest frame of the vehicle the lamp is at the center and light travels at $c$ both ways, so both detectors are hit at the same time.',
          };
        }
        if (sc === 'B' || sc === 'C') {
          const inGround = sc === 'B'; // simultaneous in the ground frame; question asks about the vehicle frame
          const corr = inGround ? 'The strike at the front end occurred first.' : 'The strike at the rear end occurred first.';
          const all = ['The strike at the front end occurred first.', 'The strike at the rear end occurred first.', 'The two strikes were simultaneous.', `The order depends on the speed: the front strike is first only if the speed exceeds ${only}.`, 'The order depends on where along the vehicle the observer is located.'];
          return {
            q: raw`Lightning strikes both ends of a ${veh} moving ${sp}. According to ${inGround ? 'observers at rest relative to ' + grd : 'passengers in the ' + veh}, the two strikes are simultaneous. According to ${inGround ? 'passengers in the ' + veh : 'observers at rest relative to ' + grd}, which statement is correct?`,
            ...GRE.mc(R, corr, all.filter(x => x !== corr)),
            expl: inGround
              ? raw`From $t' = \gamma(t - vx/c^2)$ with $\Delta t = 0$, the event with larger $x$ (the front end, in the direction of motion) has the smaller $t'$: the passengers say the front strike came first.`
              : raw`From $t = \gamma(t' + vx'/c^2)$ with $\Delta t' = 0$, the event with larger $x'$ (the front end) has the larger $t$: ground observers say the rear strike came first.`,
          };
        }
        const corr = 'The flashes are simultaneous in that frame as well.';
        return {
          q: raw`Two flashes occur simultaneously in frame S at the points $(x, y) = (0, 0)$ and $(0, d)$, separated only along the $y$-axis. Frame S' moves relative to S along the $x$-axis ${sp}. According to S', which statement is correct?`,
          ...GRE.mc(R, corr, ['The flash at $y = d$ occurs first.', 'The flash at $y = 0$ occurs first.', 'The order depends on the sign of the velocity of S\'.', 'The time between the flashes is $\\gamma v d/c^2$.', 'The time between the flashes is $vd/c^2$.']),
          expl: raw`For a boost along $x$, $t' = \gamma(t - vx/c^2)$ does not involve $y$. Both flashes have the same $t$ and the same $x$, so they have the same $t'$: relativity of simultaneity only affects separations along the boost direction.`,
        };
      },
    },
  ]);

  GRE.addTemplates('sr', [
    {
      id: 'sr.dilation.muon', sec: '6.1.2', level: 2,
      gen(R) {
        const s = fast(R, [[4, 3, 5], [12, 5, 13], [15, 8, 17], [24, 7, 25], [40, 9, 41]]);
        const H = R.pick([3, 4.5, 6, 8, 9, 10, 12, 15, 18, 20]);
        const ask = R.pick(['proper', 'proper', 'atmos', 'nlife']);
        const where = R.pick(['sea level', 'the ground', 'a detector at sea level']);
        const stem = raw`Muons produced by cosmic rays at an altitude of $${H}\,\text{km}$ travel straight down toward ${where} at speed $${spd(s)}$ (Earth frame).`;
        const tE = H * 1e3 / (s.beta * C.c) * 1e6; // Earth-frame travel time in microseconds
        if (ask === 'proper') {
          const t = tE / s.gamma;
          return {
            q: stem + ' According to a clock moving with the muons, how long does the trip take?',
            ...GRE.numeric(R, t, [tE, tE * s.gamma, H * 1e3 / C.c * 1e6, t / s.gamma], { unit: raw`\mu\text{s}` }),
            expl: raw`In the Earth frame the trip takes $H/v = ${F.num(tE, 3)}\,\mu\text{s}$. The muon clock is present at both events, so it records the proper time, shorter by $\gamma = ${gTeX(s)}$: $\tau = ${F.num(t, 2)}\,\mu\text{s}$. (Equivalently, the muons see a contracted atmosphere $H/\gamma$ approaching at $v$.)`,
          };
        }
        if (ask === 'atmos') {
          const h = H / s.gamma;
          return {
            q: stem + ' In the rest frame of the muons, how far away is ' + where + ' at the moment the muons are produced?',
            ...GRE.numeric(R, h, [H * s.gamma, H, H * (1 - s.beta), H / (s.gamma * s.gamma)], { unit: raw`\text{km}`, sig: 2 }),
            expl: raw`The Earth (and its atmosphere) moves relative to the muons, so the distance is length-contracted: $H/\gamma = ${F.num(H, 3)}\,\text{km}\times ${F.frac(s.gd, s.gn)} = ${F.num(h, 2)}\,\text{km}$.`,
          };
        }
        const tau = 2.2;
        const n = tE / s.gamma / tau;
        return {
          q: stem + raw` The muon mean lifetime at rest is $2.2\,\mu\text{s}$. About how many mean lifetimes elapse in the muons' rest frame during the trip?`,
          ...GRE.numeric(R, n, [tE / tau, tE * s.gamma / tau, n / s.gamma, H * 1e3 / C.c * 1e6 / tau]),
          expl: raw`Proper travel time $= H/(\gamma v) = ${F.num(tE / s.gamma, 3)}\,\mu\text{s}$, i.e. about $${F.num(n, 2)}$ lifetimes. Using the Earth-frame time $H/v$ without dilation would give $\gamma$ times more and predict far fewer surviving muons.`,
        };
      },
    },
    {
      id: 'sr.dilation.trip', sec: '6.1.2', level: 2,
      gen(R) {
        const s = fast(R, SMALL);
        const D = R.pick([2, 3, 4, 5, 6, 8, 9, 10, 12, 15, 16, 20, 24, 30, 40]);
        const star = R.pick(['a star', 'a distant star', 'an exoplanet', 'a space beacon']);
        const ask = R.pick(['oneway', 'oneway', 'round', 'diff', 'dist']);
        const g = s.gamma, b = s.beta;
        const yr = raw`\text{yr}`, ly = raw`\text{ly}`;
        const stem = raw`An astronaut travels at constant speed $${spd(s)}$ to ${star} that is $${D}$ light-years from Earth, as measured in the Earth frame.`;
        if (ask === 'oneway') {
          const t = D / (g * b);
          return {
            q: stem + ' How much time elapses on the astronaut’s clock during the trip?',
            ...GRE.numeric(R, t, [D / b, g * D / b, D / g, D / (g * g * b), D], { unit: yr, sig: 3, tol: 0.05 }),
            expl: raw`Earth time: $D/v = ${F.num(D / b, 3)}\,\text{yr}$. The astronaut's clock records the proper time, $\Delta\tau = \dfrac{D}{\gamma v} = ${F.num(t, 3)}\,\text{yr}$ with $\gamma = ${gTeX(s)}$.`,
          };
        }
        if (ask === 'round') {
          const t = 2 * D / (g * b);
          return {
            q: stem + ' The astronaut immediately returns at the same speed. By how much has the astronaut aged during the round trip?',
            ...GRE.numeric(R, t, [2 * D / b, 2 * g * D / b, D / (g * b), 2 * D / g], { unit: yr, sig: 3, tol: 0.05 }),
            expl: raw`Each leg takes $D/v$ in the Earth frame and $D/(\gamma v)$ on the astronaut's clock, so the astronaut ages $2D/(\gamma v) = ${F.num(t, 3)}\,\text{yr}$ while Earth clocks advance $2D/v = ${F.num(2 * D / b, 3)}\,\text{yr}$.`,
          };
        }
        if (ask === 'diff') {
          const t = 2 * D / b * (1 - 1 / g);
          return {
            q: stem + ' The astronaut immediately returns at the same speed to a twin who stayed on Earth. When they meet again, how much younger is the astronaut than the twin?',
            ...GRE.numeric(R, t, [2 * D / b * (g - 1), 2 * D / (g * b), 2 * D / b, D / b * (1 - 1 / g)], { unit: yr, sig: 3, tol: 0.05 }),
            expl: raw`Earth twin ages $2D/v = ${F.num(2 * D / b, 3)}\,\text{yr}$; the traveler ages $2D/(\gamma v) = ${F.num(2 * D / (g * b), 3)}\,\text{yr}$. Difference: $\dfrac{2D}{v}\left(1 - \dfrac{1}{\gamma}\right) = ${F.num(t, 3)}\,\text{yr}$. The traveler, who changes frames, is the younger one.`,
          };
        }
        const L = D / g;
        return {
          q: stem + ' According to the astronaut, what is the distance between Earth and the destination during the trip?',
          ...GRE.numeric(R, L, [g * D, D, D * b, D / (g * g)], { unit: ly, sig: 3, tol: 0.05 }),
          expl: raw`In the astronaut's frame the Earth–${star.replace(/^an? /, '')} distance is moving, so it is contracted: $D/\gamma = ${D}\times ${F.frac(s.gd, s.gn)} = ${F.num(L, 3)}$ light-years.`,
        };
      },
    },
    {
      id: 'sr.dilation.symbolic', sec: '6.1.2', level: 2,
      gen(R) {
        const S = R.pick([
          { q: x => raw`A clock moves at constant speed $v$ relative to the laboratory. During a time interval $${x}$ measured by laboratory clocks, how much time elapses on the moving clock?`, x: ['T', '\\Delta t', 't_{\\text{lab}}'], mul: true,
            e: 'The moving clock is present at both events, so it records the proper time, the shortest: $\\Delta\\tau = \\Delta t/\\gamma$.' },
          { q: x => raw`A beam of unstable nuclei, whose half-life at rest is $${x}$, moves at speed $v$ through the laboratory. What half-life is measured in the laboratory?`, x: ['t_{1/2}', '\\tau_0', 'T_0'], mul: false,
            e: 'Moving clocks (here, the nuclei) run slow, so lab observers measure a longer half-life, $\\gamma$ times the rest value.' },
          { q: x => raw`An astronaut’s heart beats at rate $${x}$ (beats per unit time) as measured by the astronaut, whose ship moves at speed $v$ relative to Earth. After correcting for light-travel time, what heart rate do Earth observers infer?`, x: ['f_0', 'R_0', 'n_0'], mul: true,
            e: 'The interval between beats is dilated by $\\gamma$ in the Earth frame, so the rate is reduced by $\\gamma$ (this is time dilation, not the Doppler effect, which the light-travel correction removes).' },
          { q: x => raw`Two spaceships pass each other with relative speed $v$. A clock aboard ship B ticks once every $${x}$ in B’s frame. What time between ticks does ship A measure?`, x: ['\\tau_0', 'T', '\\Delta t_0'], mul: false,
            e: 'Time dilation is reciprocal: each ship sees the other’s clock run slow, so A measures a tick interval $\\gamma$ times longer.' },
        ]);
        const x = R.pick(S.x);
        const f = {
          mulS: raw`${x}\sqrt{1 - v^2/c^2}`, divS: raw`\dfrac{${x}}{\sqrt{1 - v^2/c^2}}`, mul: raw`${x}\left(1 - v^2/c^2\right)`,
          div: raw`\dfrac{${x}}{1 - v^2/c^2}`, same: x, plus: raw`${x}\sqrt{1 + v^2/c^2}`, lin: raw`${x}\left(1 - v/c\right)`,
        };
        const corr = S.mul ? 'mulS' : 'divS';
        const wr = Object.keys(f).filter(k => k !== corr).map(k => `$${f[k]}$`);
        return {
          q: S.q(x),
          ...GRE.mc(R, `$${f[corr]}$`, wr, { keep: 1 }),
          expl: S.e + raw` With $\gamma = 1/\sqrt{1 - v^2/c^2}$ the answer is $${f[corr]}$; check that it reduces to $${x}$ when $v \to 0$.`,
        };
      },
    },
    {
      id: 'sr.dilation.speed-from-distance', sec: '6.1.2', level: 3,
      gen(R) {
        const s = fast(R, SMALL); // gamma*beta = a/b
        const k = s.gb;
        const tau = R.pick([1, 2, 4, 5, 10]) * 1e-8;
        const ctau = C.c * tau;
        const num = R.bool();
        const dist = num ? raw`$${F.num(k * ctau, 3)}\,\text{m}$` : raw`$${F.frac(s.bn, s.gd)}\,c\tau$`;
        const pre = num
          ? raw`An unstable particle has a proper mean lifetime $\tau = ${F.sci(tau, 1)}\,\text{s}$. In the laboratory it travels, on average, ${dist} before decaying.`
          : raw`An unstable particle has a proper mean lifetime $\tau$. In the laboratory it travels, on average, a distance ${dist} before decaying.`;
        const kTeX = F.frac(s.bn, s.gd);
        const expl0 = raw`The lab distance is $d = v\gamma\tau$, so $\gamma\beta = d/(c\tau) = ${kTeX}$. Then $\beta = \dfrac{\gamma\beta}{\sqrt{1 + (\gamma\beta)^2}}$: with $\gamma\beta = ${kTeX}$, $\gamma = \sqrt{1 + (\gamma\beta)^2} = ${gTeX(s)}$ and $\beta = ${F.frac(s.bn, s.bd)}$.`;
        if (R.bool(0.65)) return {
          q: pre + ' What is its speed?',
          ...exactMC(R, s.beta, [k, s.gd / s.gn, k / (1 + k), k * k / (1 + k * k), 1 / k], 'c', { maxDen: 100 }),
          expl: expl0 + ' Setting $d = v\\tau$ (no time dilation) gives $v = ' + kTeX + '\\,c$, the trap answer.',
        };
        return {
          q: pre + ' What is its Lorentz factor $\\gamma$?',
          ...exactMC(R, s.gamma, [1 + k, k, k < 1 ? 1 / Math.sqrt(1 - k * k) : null, 1 + k * k / 2, 1 / k, (1 + k * k)], '', { maxDen: 100 }),
          expl: expl0,
        };
      },
    },
  ]);

  GRE.addTemplates('sr', [
    {
      id: 'sr.contraction.angle', sec: '6.1.3', level: 3,
      gen(R) {
        const s = fast(R, SMALL);
        const L0 = R.pick([1, 2, 3, 4, 5, 10]);
        // [description, cos, sin, tan]
        const A = R.pick([
          [raw`an angle of $30^\circ$`, Math.sqrt(3) / 2, 0.5, 1 / Math.sqrt(3)],
          [raw`an angle of $45^\circ$`, Math.SQRT1_2, Math.SQRT1_2, 1],
          [raw`an angle of $60^\circ$`, 0.5, Math.sqrt(3) / 2, Math.sqrt(3)],
          [raw`an angle $\theta_0$ (where $\cos\theta_0 = 0.8$)`, 0.8, 0.6, 0.75],
          [raw`an angle $\theta_0$ (where $\cos\theta_0 = 0.6$)`, 0.6, 0.8, 4 / 3],
        ]);
        const [desc, co, si, ta] = A;
        const g = s.gamma;
        const stem = raw`A rod of rest length $${L0}\,\text{m}$ makes ${desc} with the $x$-axis in its own rest frame. The rod moves along the $x$-axis at speed $${spd(s)}$ relative to an observer.`;
        if (R.bool(0.6)) {
          const L = L0 * Math.sqrt(co * co / (g * g) + si * si);
          return {
            q: stem + ' What length does the observer measure for the rod?',
            ...GRE.numeric(R, L, [L0 / g, L0, L0 * Math.sqrt(co * co + si * si / (g * g)), L0 * co / g, L0 * Math.sqrt(co * co * g * g + si * si)], { unit: raw`\text{m}`, sig: 3, tol: 0.04 }),
            expl: raw`Only the component along the motion contracts: $L_x = L_0\cos\theta_0/\gamma$, $L_y = L_0\sin\theta_0$, with $\gamma = ${gTeX(s)}$. So $L = L_0\sqrt{\cos^2\theta_0/\gamma^2 + \sin^2\theta_0} = ${F.num(L, 3)}\,\text{m}$. Dividing the whole length by $\gamma$ is the trap.`,
          };
        }
        const t = ta * g;
        return {
          q: stem + ' If $\\theta$ is the angle between the rod and the $x$-axis measured by the observer, what is $\\tan\\theta$?',
          ...exactMC(R, t, [ta / g, ta * g * g, ta, ta / (g * g), ta * s.beta], '', { maxDen: 100 }),
          expl: raw`$L_y$ is unchanged while $L_x$ shrinks by $\gamma$, so the rod appears to tilt away from the direction of motion: $\tan\theta = \gamma\tan\theta_0 = ${gTeX(s)}\times ${F.exact(ta)} = ${F.exact(t, 100)}$.`,
        };
      },
    },
    {
      id: 'sr.contraction.volume', sec: '6.1.3', level: 2,
      gen(R) {
        const s = fast(R);
        const g = s.gamma;
        const v = R.pick(['cube', 'cube', 'density', 'perp', 'par']);
        const sp = spd(s);
        if (v === 'cube') {
          const a = R.pick([1, 2, 3, 4, 5, 10]);
          const V0 = a * a * a, V = V0 / g;
          const u = R.pick([['m', raw`\text{m}^3`], ['cm', raw`\text{cm}^3`]]);
          return {
            q: raw`A cube has edge length $${a}\,\text{${u[0]}}$ in its rest frame. It moves at speed $${sp}$ parallel to one of its edges. What volume does an observer at rest in the laboratory measure?`,
            ...GRE.numeric(R, V, [V0 / (g * g * g), V0, V0 * g, V0 / (g * g)], { unit: u[1], sig: 3, tol: 0.05 }),
            expl: raw`Only the edge along the motion contracts (by $\gamma = ${gTeX(s)}$); the other two are unchanged. So $V = V_0/\gamma = ${V0}\times ${F.frac(s.gd, s.gn)} = ${F.num(V, 3)}\,${u[1]}$, not $V_0/\gamma^3$.`,
          };
        }
        if (v === 'density') {
          const m = R.pick([1, 2, 3, 4, 5, 6, 8]), e = R.int(5, 20);
          const n0 = m * Math.pow(10, e), n = n0 * g;
          return {
            q: raw`A cloud of dust grains, all at rest relative to each other, contains $${F.sci(n0, 2)}$ grains per cubic meter in its rest frame. The cloud moves past an observer at speed $${sp}$. What number density of grains does the observer measure?`,
            ...GRE.numeric(R, n, [n0 / g, n0, n0 * g * g, n0 * g * g * g], { unit: raw`\text{m}^{-3}`, fmt: x => F.sci(x, 3), tol: 0.05 }),
            expl: raw`The number of grains is the same in every frame, but the volume containing them shrinks by $\gamma$ along the motion, so the density grows: $n = \gamma n_0 = ${gTeX(s)}\times ${F.sci(n0, 2)} = ${F.sci(n, 3)}\,\text{m}^{-3}$.`,
          };
        }
        const a = R.pick([1, 2, 3, 4, 5, 6, 10]);
        const A0 = a * a;
        if (v === 'perp') return {
          q: raw`A square plate of side $${a}\,\text{m}$ (rest frame) moves at speed $${sp}$ in a direction perpendicular to the plane of the plate. What area does a laboratory observer measure for the plate?`,
          ...GRE.numeric(R, A0, [A0 / g, A0 / (g * g), A0 * g, A0 * g * g], { unit: raw`\text{m}^2`, sig: 3, tol: 0.05 }),
          expl: raw`Both sides of the plate are perpendicular to the velocity, and lengths perpendicular to the motion are not contracted. The area is unchanged: $${A0}\,\text{m}^2$.`,
        };
        return {
          q: raw`A square plate of side $${a}\,\text{m}$ (rest frame) moves at speed $${sp}$ parallel to one of its sides, in its own plane. What area does a laboratory observer measure for the plate?`,
          ...GRE.numeric(R, A0 / g, [A0, A0 / (g * g), A0 * g, A0 * g * g], { unit: raw`\text{m}^2`, sig: 3, tol: 0.05 }),
          expl: raw`Only the side along the velocity contracts, so $A = A_0/\gamma = ${A0}\times ${F.frac(s.gd, s.gn)} = ${F.num(A0 / g, 3)}\,\text{m}^2$.`,
        };
      },
    },
    {
      id: 'sr.contraction.speed', sec: '6.1.3', level: 1,
      gen(R) {
        let fN, fD;
        if (R.bool(0.75)) { const s = fast(R); fN = s.gd; fD = s.gn; } else [fN, fD] = R.pick([[1, 2], [1, 3], [1, 4], [2, 3], [1, 5]]);
        const f = fN / fD, beta = Math.sqrt(1 - f * f);
        let q;
        if (R.bool()) {
          q = raw`At what speed must a rod move parallel to its length for an observer to measure its length as $${F.frac(fN, fD)}$ of its rest length?`;
        } else {
          const L0 = fD * R.pick([1, 2, 3, 4, 5, 10, 20]);
          const obj = R.pick(['spaceship', 'space station module', 'rocket', 'train']);
          q = raw`A ${obj} is $${L0}\,\text{m}$ long in its rest frame. Observers who see it pass by measure its length to be $${L0 * f}\,\text{m}$. What is the speed of the ${obj} relative to those observers?`;
        }
        return {
          q,
          ...exactMC(R, beta, [1 - f, f, Math.sqrt(1 - f), 1 - f * f, Math.sqrt(2 * (1 - f)), 1 / f], 'c', { maxDen: 100 }),
          expl: raw`$L = L_0\sqrt{1 - \beta^2}$, so $\sqrt{1 - \beta^2} = ${F.frac(fN, fD)}$ and $\beta = \sqrt{1 - (${F.frac(fN, fD)})^2} = ${F.exact(beta, 100)}$.`,
        };
      },
    },
    {
      id: 'sr.contraction.concept', sec: '6.1.3', level: 2,
      gen(R) {
        const TRUE = [
          'Lengths perpendicular to the direction of relative motion are the same in both frames.',
          'Each of two observers in relative motion measures the other’s meter stick, aligned with the motion, to be shorter than 1 m.',
          'The longest length that any inertial observer measures for a rod is its rest length.',
          'To measure the length of a moving rod, an observer must record the positions of both ends at the same time in the observer’s own frame.',
          'A pole whose rest length exceeds a barn’s rest length can fit entirely inside the barn at one instant, according to the barn frame, if the pole moves fast enough.',
        ];
        const FALSE = [
          'A moving rod is measured to be longer than its rest length.',
          'Length contraction is only an optical illusion caused by the travel time of light.',
          'Only one of two observers in relative motion can see the other’s ruler contracted; the other sees no contraction.',
          'A sphere moving at high speed is measured to be an ellipsoid elongated along its direction of motion.',
          'Length contraction affects only lengths perpendicular to the velocity.',
          'A pole whose rest length exceeds a barn’s rest length can fit entirely inside the barn at one instant, according to the pole’s own rest frame.',
        ];
        const nT = R.int(1, 3);
        const st = R.shuffle(R.pickN(TRUE, nT).map(x => [x, true]).concat(R.pickN(FALSE, 3 - nT).map(x => [x, false])));
        return {
          q: GRE.romanStem('Which of the following statements about length contraction is (are) true?', st.map(x => x[0])),
          ...GRE.roman(R, st.map(x => x[1])),
          expl: 'Only lengths along the relative velocity contract, by $1/\\gamma$; the effect is real (not optical), reciprocal between the two frames, and makes the rest length the longest. A moving sphere is flattened (oblate) along its motion. In the pole-and-barn paradox the pole fits in the barn frame, while in the pole frame the barn is the contracted one. ' +
            st.map((x, i) => `${['I', 'II', 'III'][i]}: ${x[1] ? 'true' : 'false'}.`).join(' '),
        };
      },
    },
    {
      id: 'sr.velocity.relative', sec: '6.1.4', level: 2,
      gen(R) {
        const den = R.pick([2, 3, 4, 5, 6, 8, 10]);
        let u = R.int(1, den - 1), v = R.int(1, den - 1);
        const kind = R.pick(['approach', 'approach', 'same', 'inverse']);
        const d2 = den * den;
        if (kind === 'approach') {
          const A = R.pick(['spacecraft', 'asteroids', 'proton beams', 'starships']);
          return {
            q: raw`Two ${A} approach each other head-on. In the frame of a nearby space station, one moves at $${fc(u, den)}$ and the other at $${fc(v, den)}$. What is the speed of one as measured in the rest frame of the other?`,
            ...fracMC(R, [(u + v) * den, d2 + u * v], [[u + v, den], [(u + v) * den, d2 - u * v], [Math.abs(u - v) * den, d2 - u * v], [Math.abs(u - v), den], [1, 1], [Math.max(u, v), den]]),
            expl: raw`Velocity addition with the station speeds in opposite directions: $w = \dfrac{u + v}{1 + uv/c^2} = ${fc((u + v) * den, d2 + u * v)}$. The Galilean sum ${u + v >= den ? 'reaches or exceeds $c$' : 'is too large'}.`,
          };
        }
        if (u === v) throw new Error('equal speeds');
        if (u < v) [u, v] = [v, u];
        const W = [(u - v) * den, d2 - u * v];
        const wr = [[u - v, den], [(u - v) * den, d2 + u * v], [(u + v) * den, d2 + u * v], [u, den], [1, 1], [(u - v) * den, d2]];
        if (kind === 'same') return {
          q: raw`Two rockets travel in the same direction relative to Earth, one at $${fc(u, den)}$ and the other at $${fc(v, den)}$. What is the speed of the faster rocket as measured by the crew of the slower one?`,
          ...fracMC(R, W, wr),
          expl: raw`Transform to the slower rocket's frame: $w' = \dfrac{u - v}{1 - uv/c^2} = ${fc(W[0], W[1])}$. This exceeds the naive difference $u - v$, because the denominator is less than 1.`,
        };
        return {
          q: raw`Observers on Earth see a spaceship receding at $${fc(v, den)}$ and a probe, launched forward from the ship, receding at $${fc(u, den)}$. What was the launch speed of the probe relative to the ship?`,
          ...fracMC(R, W, wr),
          expl: raw`Invert the addition law: $u' = \dfrac{w - v}{1 - wv/c^2} = ${fc(W[0], W[1])}$. Check: adding $${fc(W[0], W[1])}$ to $${fc(v, den)}$ relativistically returns $${fc(u, den)}$.`,
        };
      },
    },
    {
      id: 'sr.velocity.formula', sec: '6.1.4', level: 2,
      gen(R) {
        const k = R.pick(['fizeau', 'beam', 'which', 'which', 'rapidity', 'separation']);
        if (k === 'fizeau') return {
          level: 3,
          q: raw`Light travels through water (index of refraction $n$) that flows at speed $v$, in the same direction as the light, relative to the laboratory. What is the speed of the light relative to the laboratory?`,
          ...GRE.mc(R, raw`$\dfrac{c/n + v}{1 + v/(nc)}$`, [raw`$c/n + v$`, raw`$c$`, raw`$\dfrac{c/n + v}{1 + nv/c}$`, raw`$\dfrac{c/n - v}{1 - v/(nc)}$`, raw`$c/n$`, raw`$\dfrac{c/n + v}{1 + v/c}$`]),
          expl: raw`In the water frame the light moves at $u' = c/n$; add the water's velocity relativistically: $u = \dfrac{u' + v}{1 + u'v/c^2} = \dfrac{c/n + v}{1 + v/(nc)} \approx \dfrac{c}{n} + v\left(1 - \dfrac{1}{n^2}\right)$ (Fizeau's partial drag). For $n = 1$ it correctly gives $c$.`,
        };
        if (k === 'beam') {
          const ob = R.pick(['a planet', 'an asteroid', 'a space station']);
          return {
            level: 1,
            q: raw`A spaceship moving at speed $v$ toward ${ob} switches on a forward-pointing searchlight. At what speed does an observer on ${ob} measure the light to approach?`,
            ...GRE.mc(R, '$c$', ['$c + v$', '$c - v$', raw`$c\sqrt{1 - v^2/c^2}$`, raw`$\dfrac{c}{\sqrt{1 - v^2/c^2}}$`, raw`$\dfrac{c + v}{2}$`]),
            expl: raw`The speed of light in vacuum is $c$ in every inertial frame (postulate 2). Velocity addition confirms it: $\dfrac{c + v}{1 + v/c} = c$.`,
          };
        }
        if (k === 'which') {
          const u = R.pick(["u'", 'u']);
          return {
            level: 1,
            q: raw`An object moves with velocity $${u}$ along the $x'$-axis of frame S', which moves with velocity $v$ along the $x$-axis of frame S. Which expression gives the velocity of the object in S?`,
            ...GRE.mc(R, raw`$\dfrac{${u} + v}{1 + ${u}v/c^2}$`, [raw`$${u} + v$`, raw`$\dfrac{${u} + v}{1 - ${u}v/c^2}$`, raw`$\dfrac{${u} + v}{1 + ${u}v/c}$`, raw`$(${u} + v)\sqrt{1 - v^2/c^2}$`, raw`$\dfrac{${u} - v}{1 - ${u}v/c^2}$`]),
            expl: raw`Einstein addition: $w = \dfrac{${u} + v}{1 + ${u}v/c^2}$. Checks: it reduces to ${u} + v for small speeds, is dimensionally consistent, and gives $w = c$ when $${u} = c$; the alternatives fail at least one of these.`,
          };
        }
        if (k === 'rapidity') return {
          level: 3,
          q: raw`Define the rapidity $\phi$ of a velocity $v$ by $\tanh\phi = v/c$. Frame S' moves with rapidity $\phi_1$ relative to S, and an object moves with rapidity $\phi_2$ relative to S', in the same direction. What is the rapidity of the object relative to S?`,
          ...GRE.mc(R, raw`$\phi_1 + \phi_2$`, [raw`$\phi_1\phi_2$`, raw`$\sqrt{\phi_1^2 + \phi_2^2}$`, raw`$\dfrac{\phi_1 + \phi_2}{1 + \phi_1\phi_2}$`, raw`$\tanh(\phi_1 + \phi_2)$`, raw`$\tanh\phi_1 + \tanh\phi_2$`]),
          expl: raw`The tanh addition identity $\tanh(\phi_1 + \phi_2) = \dfrac{\tanh\phi_1 + \tanh\phi_2}{1 + \tanh\phi_1\tanh\phi_2}$ is exactly the velocity-addition law, so collinear rapidities simply add. ($\tanh(\phi_1+\phi_2)$ is the velocity over $c$, not the rapidity.)`,
        };
        const den = R.pick([5, 10, 4, 3]);
        const n = R.int(Math.ceil(den / 2), den - 1);
        const u = n / den;
        return {
          level: 3,
          q: raw`In the laboratory, two particles fly apart in opposite directions, each with speed $${fc(n, den)}$. At what rate does the distance between them increase, as measured in the laboratory?`,
          ...exactMC(R, 2 * u, [2 * u / (1 + u * u), 1, u, u * u, 2 * u / (1 + u)], 'c', { maxDen: 200 }),
          expl: raw`In the lab, each particle's position changes at $${fc(n, den)}$, so the separation grows at $2u = ${fc(2 * n, den)}$. This rate may exceed $c$, since no single object or signal moves that fast; the speed of one particle relative to the other is $2u/(1 + u^2/c^2) = ${fc(2 * n * den, den * den + n * n)} < c$, a different question.`,
        };
      },
    },
  ]);

  // ------------------------------------------------------------ 6.2 4-vectors
  // 4x4 boost matrix along axis k (1..3) with sign sg of the off-diagonal entries; variants for distractors
  function boostTeX(k, sg, opt) {
    opt = opt || {};
    const E = [0, 1, 2, 3].map(i => [0, 1, 2, 3].map(j => (i === j ? '1' : '0')));
    E[0][0] = '\\gamma'; E[k][k] = opt.diag1 ? '1' : '\\gamma';
    const gb = opt.beta ? '\\beta' : '\\gamma\\beta';
    E[0][k] = (sg < 0 ? '-' : '') + gb;
    E[k][0] = ((opt.asym ? -sg : sg) < 0 ? '-' : '') + gb;
    return '$' + pm(E) + '$';
  }

  GRE.addTemplates('sr', [
    {
      id: 'sr.lt.matrix', sec: '6.2.1', level: 2,
      gen(R) {
        const k = R.int(1, 3), ax = 'xyz'[k - 1];
        const dir = R.sign();
        const toPrime = R.bool();
        const [A, B] = R.pick([["S", "S'"], ['A', 'B'], ['S_1', 'S_2']]);
        const sg = (toPrime ? -1 : 1) * dir;
        const o1 = R.pick([1, 2, 3].filter(i => i !== k));
        const P = B.replace("'", '');
        const co = (f, pr) => { const i = f.replace('S_', ''); return pr ? `(ct_{${i}}, x_{${i}}, y_{${i}}, z_{${i}})` : ''; };
        const cA = A === 'S' ? '(ct, x, y, z)' : co(A, true), cB = B === "S'" ? "(ct', x', y', z')" : co(B, true);
        const wr = [boostTeX(k, -sg), boostTeX(o1, sg), boostTeX(o1, -sg), boostTeX(k, sg, { asym: true }), boostTeX(k, sg, { beta: true }), boostTeX(k, sg, { diag1: true })];
        return {
          q: raw`Frame $${B}$ moves with velocity $${dir < 0 ? '-' : ''}\beta c\,\hat{${ax}}$ relative to frame $${A}$, and their origins coincide at $t = 0$. Which matrix transforms the coordinates $${toPrime ? cA : cB}$ of an event in $${toPrime ? A : B}$ into its coordinates $${toPrime ? cB : cA}$ in $${toPrime ? B : A}$? (Here $\gamma = 1/\sqrt{1 - \beta^2}$.)`,
          ...GRE.mc(R, boostTeX(k, sg), wr, { keep: 2 }),
          expl: raw`A boost along $${ax}$ mixes only $ct$ and $${ax}$ (row/column ${k + 1}), with $\gamma$ on those diagonal entries and $\pm\gamma\beta$ off the diagonal. Going from the frame at rest to the frame moving in the $${dir > 0 ? '+' : '-'}${ax}$ direction gives $${dir > 0 ? '-' : '+'}\gamma\beta$ (as in $x' = \gamma(x - vt)$); the inverse just flips the sign of $\beta$. Here the off-diagonal entries are $${sg < 0 ? '-' : '+'}\gamma\beta$.`,
        };
      },
    },
    {
      id: 'sr.lt.event', sec: '6.2.1', level: 2,
      gen(R) {
        const s = fast(R, [[3, 4, 5], [4, 3, 5], [12, 5, 13], [15, 8, 17]]);
        const U = R.pick([['yr', 'light-years'], ['s', 'light-seconds']]);
        const t = R.int(1, 12), x = R.int(-8, 12);
        const g = s.gamma, b = s.beta;
        const fwd = R.bool();
        const askT = R.bool();
        const P = fwd ? "'" : '';
        const Q = fwd ? '' : "'";
        const sb = fwd ? -1 : 1;
        const val = askT ? g * (t + sb * b * x) : g * (x + sb * b * t);
        if (Math.abs(val) < 0.4) throw new Error('tiny');
        const wr = askT
          ? [g * (t - sb * b * x), t + sb * b * x, (t + sb * b * x) / g, t, g * t]
          : [g * (x - sb * b * t), x + sb * b * t, (x + sb * b * t) / g, g * x, x];
        const fr = fwd ? "In frame S, an event occurs at" : "In frame S', an event occurs at";
        const unitT = raw`\text{${U[0]}}`;
        return {
          q: raw`Frame S' moves at speed $${spd(s)}$ in the $+x$ direction relative to frame S, with origins coinciding at $t = t' = 0$. ${fr} $t${Q} = ${t}\,${unitT}$, $x${Q} = ${x}$ ${U[1]}. What is ${askT ? `$t${P}$` : `$x${P}$`} for this event?`,
          ...GRE.numeric(R, val, wr, { unit: askT ? unitT : raw`\text{${U[1]}}`, fmt: v => F.num(v, 3), allowSign: true, tol: 0.06 }),
          expl: raw`With $c = 1$ ${U[1]} per ${U[0] === 'yr' ? 'year' : 'second'}, $\gamma = ${gTeX(s)}$, $\beta = ${bTeX(s)}$. ${fwd ? raw`$t' = \gamma(t - \beta x)$, $x' = \gamma(x - \beta t)$` : raw`The inverse transformation flips the sign of $\beta$: $t = \gamma(t' + \beta x')$, $x = \gamma(x' + \beta t')$`}, giving ${askT ? `$t${P}$` : `$x${P}$`} $= ${F.num(val, 3)}$. Using the ${fwd ? 'inverse' : 'forward'} signs or dropping $\gamma$ are the common slips.`,
        };
      },
    },
    {
      id: 'sr.lt.energy', sec: '6.2.1', level: 3,
      gen(R) {
        const s = fast(R, [[3, 4, 5], [4, 3, 5], [12, 5, 13], [15, 8, 17], [8, 15, 17], [5, 12, 13]]);
        const g = s.gamma, b = s.beta;
        if (R.bool(0.6)) {
          const [E0, P0, M0] = R.pick([[5, 4, 3], [5, 3, 4], [13, 12, 5], [13, 5, 12], [17, 15, 8], [17, 8, 15], [25, 24, 7], [25, 7, 24]]);
          const sc = R.pick([10, 20, 50, 100, 200]);
          const E = E0 * sc, P = P0 * sc;
          const same = R.bool();
          const sb = same ? -1 : 1;
          const askE = R.bool(0.65);
          const Ep = g * (E + sb * b * P), Pp = Math.abs(g * (P + sb * b * E));
          if (!askE && Pp < 1) throw new Error('rest frame');
          const val = askE ? Ep : Pp;
          const wr = askE ? [g * (E - sb * b * P), g * E, E / g, E, M0 * sc] : [Math.abs(g * (P - sb * b * E)), g * P, P / g, P, Math.abs(P + sb * b * E)];
          return {
            q: raw`In frame S, a particle has energy $${E}\,\text{MeV}$ and momentum $${P}\,\text{MeV}/c$ in the $+x$ direction. Frame S' moves at speed $${spd(s)}$ in the ${same ? '$+x$' : '$-x$'} direction relative to S. What is the ${askE ? 'energy' : 'magnitude of the momentum'} of the particle in S'?`,
            ...GRE.numeric(R, val, wr, { unit: askE ? raw`\text{MeV}` : raw`\text{MeV}/c`, fmt: v => F.num(v, 3), tol: 0.05 }),
            expl: raw`$(E/c, \mathbf{p})$ transforms like $(ct, \mathbf{x})$: $E' = \gamma(E ${same ? '-' : '+'} \beta pc)$, $p'c = \gamma(pc ${same ? '-' : '+'} \beta E)$ with $\gamma = ${gTeX(s)}$, $\beta = ${bTeX(s)}$. So $E' = ${F.num(Ep, 3)}\,\text{MeV}$ and $|p'|c = ${F.num(Pp, 3)}\,\text{MeV}$. Check: $E'^2 - p'^2c^2 = (${M0 * sc}\,\text{MeV})^2$, unchanged.`,
          };
        }
        const t = fast(R, SMALL);
        const same = R.bool();
        const E = t.gamma * g * (same ? 1 - t.beta * b : 1 + t.beta * b);
        return {
          q: raw`In the laboratory, a particle of mass $m$ moves along $+x$ at speed $${spd(t)}$. An observer moves along ${same ? '$+x$' : '$-x$'} at speed $${spd(s)}$ relative to the laboratory. What energy does the observer measure for the particle?`,
          ...exactMC(R, E, [t.gamma * g * (same ? 1 + t.beta * b : 1 - t.beta * b), t.gamma * g, t.gamma, t.gamma + g - 1, g], 'mc^2', { maxDen: 1000 }),
          expl: raw`Boost the 4-momentum $(\gamma_1 mc, \gamma_1\beta_1 mc)$: $E' = \gamma_2(E ${same ? '-' : '+'} \beta_2 pc) = \gamma_1\gamma_2(1 ${same ? '-' : '+'} \beta_1\beta_2)mc^2 = ${F.exact(E, 1000)}\,mc^2$. Energy is not invariant, so it is not $\gamma_1 mc^2$; equivalently, use the relativistic relative speed.`,
        };
      },
    },
    {
      id: 'sr.lt.compose', sec: '6.2.1', level: 3,
      gen(R) {
        const L = [[3, 4, 5], [4, 3, 5], [5, 12, 13], [12, 5, 13]];
        const a = fast(R, L), b = fast(R, L);
        const G = a.gamma * b.gamma * (1 + a.beta * b.beta);
        const GB = a.gamma * b.gamma * (a.beta + b.beta);
        const stem = raw`Frame S' moves at speed $${spd(a)}$ along $+x$ relative to frame S, and frame S'' moves at speed $${spd(b)}$ along $+x$ relative to S'. The Lorentz transformation from S to S'' is the matrix product $\Lambda(\beta_2)\Lambda(\beta_1)$.`;
        const ex = raw`Multiplying the $2\times2$ blocks gives a single boost with $\gamma = \gamma_1\gamma_2(1 + \beta_1\beta_2)$ and $\gamma\beta = \gamma_1\gamma_2(\beta_1 + \beta_2)$, where $\gamma_1 = ${gTeX(a)}$, $\gamma_2 = ${gTeX(b)}$; the speed is $(\beta_1 + \beta_2)/(1 + \beta_1\beta_2)$, the velocity-addition law.`;
        const w = R.pick(['g', 'g', 'gb', 'beta']);
        if (w === 'g') return {
          q: stem + raw` What is its time–time (upper-left) element, i.e. the coefficient of $ct$ in $ct''$?`,
          ...exactMC(R, G, [a.gamma * b.gamma, a.gamma + b.gamma, a.gamma * b.gamma * (1 - a.beta * b.beta), a.gamma * b.gamma * a.beta * b.beta, GB], '', { maxDen: 1000 }),
          expl: ex + raw` Here $\gamma = ${F.exact(G, 1000)}$.`,
        };
        if (w === 'gb') return {
          q: stem + raw` What is the coefficient of $x$ in the expression for $ct''$?`,
          ...exactMC(R, -GB, [GB, -G, -(a.gamma * a.beta + b.gamma * b.beta), -a.gamma * b.gamma * Math.abs(a.beta - b.beta), -(a.beta + b.beta)], '', { maxDen: 1000, signed: true }),
          expl: ex + raw` The coefficient is $-\gamma\beta = ${F.exact(-GB, 1000)}$.`,
        };
        const B = (a.beta + b.beta) / (1 + a.beta * b.beta);
        return {
          q: stem + ' What is the speed of S\'\' relative to S?',
          ...exactMC(R, B, [a.beta + b.beta, (a.beta + b.beta) / (1 - a.beta * b.beta), a.beta * b.beta, Math.abs(a.beta - b.beta) / (1 - a.beta * b.beta), (a.beta + b.beta) / 2], 'c', { maxDen: 1000 }),
          expl: ex + raw` Here $\beta = ${F.exact(B, 1000)}$.`,
        };
      },
    },
    {
      id: 'sr.lt.equations', sec: '6.2.1', level: 1,
      gen(R) {
        const k = R.pick(['fwd', 'inv', 'roman', 'roman']);
        if (k !== 'roman') {
          const f = k === 'fwd';
          const p = f ? "'" : '', q = f ? '' : "'", s = f ? '-' : '+', o = f ? '+' : '-';
          const E = (tt, xx) => `$t${p} = ${tt},\\ x${p} = ${xx}$`;
          return {
            q: f ? raw`Frame S' moves with velocity $v\hat{x}$ relative to frame S. Which pair of equations gives the coordinates of an event in S' in terms of its coordinates in S?`
              : raw`Frame S' moves with velocity $v\hat{x}$ relative to frame S. Which pair of equations gives the coordinates of an event in S in terms of its coordinates $(t', x')$ in S'?`,
            ...GRE.mc(R, E(raw`\gamma(t${q} ${s} vx${q}/c^2)`, raw`\gamma(x${q} ${s} vt${q})`), [
              E(raw`\gamma(t${q} ${o} vx${q}/c^2)`, raw`\gamma(x${q} ${o} vt${q})`),
              E(`t${q}`, `x${q} ${s} vt${q}`),
              E(raw`\gamma(t${q} ${s} vx${q}/c^2)`, raw`(x${q} ${s} vt${q})/\gamma`),
              E(raw`\gamma(t${q} ${s} vx${q})`, raw`\gamma(x${q} ${s} vt${q})`),
              E(raw`(t${q} ${s} vx${q}/c^2)/\gamma`, raw`\gamma(x${q} ${s} vt${q})`),
            ]),
            expl: raw`Lorentz transformation: $t' = \gamma(t - vx/c^2)$, $x' = \gamma(x - vt)$; the inverse just flips the sign of $v$. The Galilean form is the $v \ll c$ limit, and $vx$ without $/c^2$ does not even have units of time.`,
          };
        }
        const TRUE = ['Its determinant equals 1.', 'Its inverse is obtained by replacing $\\beta$ with $-\\beta$.', 'It leaves the $y$ and $z$ coordinates unchanged.', 'It leaves $(x^0)^2 - (x^1)^2 - (x^2)^2 - (x^3)^2$ unchanged.', 'It is a symmetric matrix.'];
        const FALSE = ['It is an orthogonal matrix: its inverse equals its transpose.', 'It leaves $(x^0)^2 + (x^1)^2$ unchanged.', 'All of its entries have magnitude at most 1.', 'It multiplies the $y$ and $z$ coordinates by $1/\\gamma$.', 'Its trace equals 4 for every $\\beta$.'];
        const nT = R.int(1, 3);
        const st = R.shuffle(R.pickN(TRUE, nT).map(x => [x, true]).concat(R.pickN(FALSE, 3 - nT).map(x => [x, false])));
        return {
          level: 2,
          q: GRE.romanStem('The matrix $\\Lambda$ for a Lorentz boost with speed $\\beta c$ along the $x$-axis acts on $(x^0, x^1, x^2, x^3) = (ct, x, y, z)$. Which of the following is (are) true of $\\Lambda$?', st.map(x => x[0])),
          ...GRE.roman(R, st.map(x => x[1])),
          expl: 'The boost has $\\gamma$ on the $(0,0)$ and $(1,1)$ entries, $-\\gamma\\beta$ off the diagonal and 1 for $y$, $z$. It is symmetric with determinant $\\gamma^2(1 - \\beta^2) = 1$ and trace $2\\gamma + 2$; it preserves the Minkowski norm, not the Euclidean one, so it is not orthogonal (its inverse is $\\Lambda(-\\beta)$, not $\\Lambda^T = \\Lambda$), and $\\gamma > 1$. ' +
            st.map((x, i) => `${['I', 'II', 'III'][i]}: ${x[1] ? 'true' : 'false'}.`).join(' '),
        };
      },
    },
  ]);

  // pairs (T, X) of integers grouped by T^2 - X^2, for "same interval, other frame" questions
  const IV = {};
  for (let T = 0; T <= 30; T++) for (let X = 0; X <= 30; X++) if (T !== X && T * T - X * X !== 0) (IV[T * T - X * X] = IV[T * T - X * X] || []).push([T, X]);
  const IVK = Object.keys(IV).filter(k => IV[k].length >= 2);
  // Pythagorean quadruples (px, py, pz, |p|) and (E, m) completing |p| to a triple
  const QUAD = [[1, 2, 2, 3], [2, 3, 6, 7], [1, 4, 8, 9], [4, 4, 7, 9], [2, 6, 9, 11], [6, 6, 7, 11], [4, 8, 8, 12], [2, 10, 11, 15], [2, 5, 14, 15], [5, 10, 10, 15]];
  const EM = { 3: [[5, 4]], 7: [[25, 24]], 9: [[15, 12], [41, 40]], 11: [[61, 60]], 12: [[13, 5], [15, 9], [20, 16], [37, 35]], 15: [[17, 8], [25, 20], [39, 36]] };
  const KIND = s2 => (s2 > 0 ? 'Timelike' : s2 < 0 ? 'Spacelike' : 'Lightlike');

  GRE.addTemplates('sr', [
    {
      id: 'sr.interval.classify', sec: '6.2.2', level: 1,
      gen(R) {
        const n = R.int(1, 3);
        const ct = R.int(1, 12);
        const sp = [R.int(1, 12), n > 1 ? R.int(1, 9) : 0, n > 2 ? R.int(1, 9) : 0];
        const s2 = ct * ct - sp.reduce((a, x) => a + x * x, 0);
        const lab = v => `${KIND(v)}, $(\\Delta s)^2 = ${v}\\ \\text{ly}^2$`;
        const coords = ['x', 'y', 'z'].slice(0, n).map((c, i) => `$\\Delta ${c} = ${sp[i]}$`).join(', ');
        const wr = [ct * ct + sp.reduce((a, x) => a + x * x, 0), -s2, ct * ct - sp[0] * sp[0], s2 + 2 * sp[0] * sp[0], 0, s2 + 4].filter(v => v !== s2);
        const alt = s2 !== 0 ? `${KIND(-s2)}, $(\\Delta s)^2 = ${s2}\\ \\text{ly}^2$` : null;
        return {
          q: raw`Two events are separated by $\Delta t = ${ct}$ years and ${coords} light-years in an inertial frame. Using $(\Delta s)^2 = c^2\Delta t^2 - \Delta x^2 - \Delta y^2 - \Delta z^2$, how is their separation classified, and what is $(\Delta s)^2$?`,
          ...GRE.mc(R, lab(s2), (alt ? [alt] : []).concat(wr.map(lab)), { keep: alt ? 1 : 0 }),
          expl: raw`$(\Delta s)^2 = ${ct}^2 - (${sp.slice(0, n).map(x => x + '^2').join(' + ')}) = ${s2}\ \text{ly}^2$. With this sign convention, positive is timelike (a frame exists where the events are at the same place), negative is spacelike (a frame exists where they are simultaneous) and zero is lightlike. Every spatial component enters with a minus sign.`,
        };
      },
    },
    {
      id: 'sr.interval.other-frame', sec: '6.2.2', level: 2,
      gen(R) {
        const k = +R.pick(IVK);
        const [[T1, X1], [T2, X2]] = R.pickN(IV[k], 2);
        const timelike = k > 0;
        const stem = raw`In inertial frame S, two events are separated by $\Delta t = ${T1}\,\text{yr}$ and $\Delta x = ${X1}$ light-years (with $\Delta y = \Delta z = 0$). In another inertial frame S', moving along $x$,`;
        if (R.bool(timelike ? 0.75 : 0.25)) {
          // give X2, ask |T2|
          const ws = [Math.sqrt(T1 * T1 + X1 * X1 - X2 * X2), T1, Math.sqrt(T1 * T1 + X2 * X2), T1 + X2 - X1, Math.sqrt(Math.abs(X1 * X1 + X2 * X2 - T1 * T1)), T2 + 1];
          return {
            q: stem + (X2 === 0 ? ' the two events occur at the same place. What is the time between them in S\'?' : ` they are separated by $\\Delta x' = ${X2}$ light-years. What is $|\\Delta t'|$?`),
            ...GRE.numeric(R, T2, ws, { unit: raw`\text{yr}`, fmt: x => F.num(x, 3), tol: 0.04 }),
            expl: raw`The interval is invariant: $c^2\Delta t'^2 - \Delta x'^2 = c^2\Delta t^2 - \Delta x^2 = ${T1}^2 - ${X1}^2 = ${k}$ (years$^2$, $c = 1$). So $\Delta t'^2 = ${k} + ${X2}^2 = ${T2 * T2}$ and $|\Delta t'| = ${T2}\,\text{yr}$.`,
          };
        }
        const ws = [Math.sqrt(X1 * X1 + T1 * T1 - T2 * T2), X1, Math.sqrt(X1 * X1 + T2 * T2), X1 + T2 - T1, Math.sqrt(Math.abs(T1 * T1 + T2 * T2 - X1 * X1)), X2 + 1];
        return {
          q: stem + (T2 === 0 ? ' the two events are simultaneous. What is the distance between them in S\'?' : ` they are separated by $|\\Delta t'| = ${T2}\\,\\text{yr}$. What is $|\\Delta x'|$?`),
          ...GRE.numeric(R, X2, ws, { unit: raw`\text{light-years}`, fmt: x => F.num(x, 3), tol: 0.04 }),
          expl: raw`The interval is invariant: $\Delta x'^2 - c^2\Delta t'^2 = \Delta x^2 - c^2\Delta t^2 = ${X1}^2 - ${T1}^2 = ${-k}$ (ly$^2$). So $\Delta x'^2 = ${-k} + ${T2}^2 = ${X2 * X2}$ and $|\Delta x'| = ${X2}$ light-years.`,
        };
      },
    },
    {
      id: 'sr.dot.compute', sec: '6.2.2', level: 1,
      gen(R) {
        const v = () => [R.int(1, 6) * R.sign(), R.int(-5, 5), R.int(-5, 5), R.int(-5, 5)];
        const a = v(), b = v();
        const d = a[0] * b[0] - a[1] * b[1] - a[2] * b[2] - a[3] * b[3];
        const eu = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
        const ws = [eu, a[0] * b[0] - a[1] * b[1], a[0] * b[0] + a[1] * b[1] - a[2] * b[2] - a[3] * b[3], a[0] * b[0], d + 2, d - 2, d + 4, d - 4].filter(x => x !== d && x !== -d);
        const strs = [...new Set(ws)];
        return {
          q: raw`Using the relativistic dot product $a\cdot b = a^0b^0 - a^1b^1 - a^2b^2 - a^3b^3$, what is $a\cdot b$ for $a^\mu = (${a.join(', ')})$ and $b^\mu = (${b.join(', ')})$?`,
          ...GRE.mc(R, `$${d}$`, strs.map(x => `$${x}$`), { rank: t => +t.replace(/\$/g, '') }),
          expl: raw`$a\cdot b = (${a[0]})(${b[0]}) - (${a[1]})(${b[1]}) - (${a[2]})(${b[2]}) - (${a[3]})(${b[3]}) = ${d}$. Only the time components enter with a plus sign; adding all four products (the Euclidean dot product, $${eu}$) is the trap.`,
        };
      },
    },
    {
      id: 'sr.energy.momentum', sec: '6.2.2', level: 2,
      gen(R) {
        const [a, b, c] = R.pick(TRIPLES.slice(0, 10));
        const sc = R.pick([1, 2, 3, 5, 10, 20, 50, 100]);
        const ask = R.pick(['E', 'm', 'p', 'pk', 'vec']);
        const M = R.pick(['MeV', 'GeV']);
        const u = raw`\text{${M}}`, uc = raw`\text{${M}}/c`, uc2 = raw`\text{${M}}/c^2`;
        // E = c, pc = a, mc^2 = b (times sc)
        const E = c * sc, P = a * sc, m = b * sc;
        const ex = raw`Use $E^2 = p^2c^2 + m^2c^4$ (the invariant $p\cdot p = m^2c^2$).`;
        if (ask === 'E') return {
          level: 1,
          q: raw`A particle of mass $${m}\,${uc2}$ has momentum $${P}\,${uc}$. What is its total energy?`,
          ...GRE.numeric(R, E, [P + m, m + P * P / (2 * m), Math.sqrt(Math.abs(P * P - m * m)), P], { unit: u, fmt: x => F.num(x, 3), tol: 0.06 }),
          expl: ex + raw` $E = \sqrt{${P}^2 + ${m}^2}\,\text{${M}} = ${E}\,\text{${M}}$. Simply adding $pc + mc^2$ is wrong.`,
        };
        if (ask === 'm') return {
          level: 1,
          q: raw`A particle has total energy $${E}\,${u}$ and momentum $${P}\,${uc}$. What is its mass?`,
          ...GRE.numeric(R, m, [E - P, Math.sqrt(E * E + P * P), E, P], { unit: uc2, fmt: x => F.num(x, 3), tol: 0.06 }),
          expl: ex + raw` $mc^2 = \sqrt{${E}^2 - ${P}^2}\,\text{${M}} = ${m}\,\text{${M}}$.`,
        };
        if (ask === 'p') return {
          q: raw`A particle of mass $${m}\,${uc2}$ has total energy $${E}\,${u}$. What is the magnitude of its momentum?`,
          ...GRE.numeric(R, P, [E - m, Math.sqrt(E * E + m * m), Math.sqrt(2 * m * (E - m)), E], { unit: uc, fmt: x => F.num(x, 3), tol: 0.06 }),
          expl: ex + raw` $pc = \sqrt{${E}^2 - ${m}^2}\,\text{${M}} = ${P}\,\text{${M}}$. The kinetic energy $E - mc^2 = ${E - m}\,\text{${M}}$ is not $pc$.`,
        };
        if (ask === 'pk') {
          const K = E - m;
          return {
            q: raw`A particle of mass $${m}\,${uc2}$ has kinetic energy $${K}\,${u}$. What is the magnitude of its momentum?`,
            ...GRE.numeric(R, P, [Math.sqrt(2 * m * K), K, K + m, Math.sqrt(K * K + m * m)], { unit: uc, fmt: x => F.num(x, 3), tol: 0.06 }),
            expl: raw`$E = K + mc^2 = ${E}\,\text{${M}}$, so $pc = \sqrt{E^2 - m^2c^4} = \sqrt{K^2 + 2Kmc^2} = ${P}\,\text{${M}}$. The Newtonian $p = \sqrt{2mK}$ is only the low-energy limit.`,
          };
        }
        const qd = R.pick(QUAD), pAbs = qd[3];
        const [E1, m1] = R.pick(EM[pAbs]);
        const s2 = R.pick([1, 2, 5, 10]);
        const comp = R.shuffle(qd.slice(0, 3)).map(x => x * s2 * R.sign());
        const EE = E1 * s2, mm = m1 * s2, PP = pAbs * s2;
        return {
          q: raw`A particle has 4-momentum $p^\mu = (E/c,\ p_x,\ p_y,\ p_z) = (${EE},\ ${comp.join(',\\ ')})\ \text{${M}}/c$. What is its mass?`,
          ...GRE.numeric(R, mm, [EE - PP, Math.sqrt(EE * EE - comp[0] * comp[0]), Math.sqrt(EE * EE + PP * PP), EE], { unit: uc2, fmt: x => F.num(x, 3), tol: 0.06 }),
          expl: raw`$m^2c^2 = p\cdot p = (E/c)^2 - p_x^2 - p_y^2 - p_z^2 = ${EE}^2 - ${PP * PP} = ${mm}^2$ (in $(\text{${M}}/c)^2$), so $m = ${mm}\,\text{${M}}/c^2$. Note $|\mathbf{p}| = ${PP}\,\text{${M}}/c$.`,
        };
      },
    },
    {
      id: 'sr.dot.concept', sec: '6.2.2', level: 3,
      gen(R) {
        const conv = 'Use the convention $a\\cdot b = a^0b^0 - \\mathbf{a}\\cdot\\mathbf{b}$. ';
        const Q = R.pick([
          ['A massive particle has 4-velocity $u^\\mu = \\gamma(c, \\mathbf{v})$. What is $u\\cdot u$?', '$c^2$', ['$\\gamma^2c^2$', '$\\gamma^2(c^2 + v^2)$', '$0$', '$c^2 - v^2$', '$v^2$'],
            '$u\\cdot u = \\gamma^2(c^2 - v^2) = c^2$ for every massive particle, in every frame (evaluate it in the rest frame, where $u = (c, \\mathbf{0})$).'],
          ['A photon of energy $E$ has 4-momentum $p^\\mu$. What is $p\\cdot p$?', '$0$', ['$E^2/c^2$', '$2E^2/c^2$', '$E/c$', '$E^2/c^4$'],
            '$p\\cdot p = E^2/c^2 - |\\mathbf{p}|^2 = m^2c^2 = 0$, since $E = |\\mathbf{p}|c$ for a massless particle.'],
          ['An observer whose 4-velocity is $u^\\mu$ measures a particle with 4-momentum $p^\\mu$. The invariant $p\\cdot u$ equals', 'the energy of the particle as measured by that observer', ['the rest energy of the particle', 'the kinetic energy of the particle as measured by that observer', 'the magnitude of the particle’s momentum, times $c$, as measured by that observer', 'zero, for every observer'],
            'Evaluate in the observer’s rest frame, where $u = (c, \\mathbf{0})$: $p\\cdot u = (E/c)c = E$, the energy that observer measures. Being a dot product, the result can be computed in any frame.'],
          ['Particles of masses $m_1$ and $m_2$ have 4-momenta $p_1$ and $p_2$. In the rest frame of particle 2, particle 1 has energy $E_1$. What is $p_1\\cdot p_2$?', '$m_2E_1$', ['$m_1m_2c^2$', '$m_1E_1$', '$(m_1 + m_2)E_1$', '$0$', '$E_1^2/c^2$'],
            'In the rest frame of particle 2, $p_2 = (m_2c, \\mathbf{0})$, so $p_1\\cdot p_2 = (E_1/c)(m_2c) = m_2E_1$.'],
          ['Two photons with energies $E_1$ and $E_2$ travel in opposite directions. For the total 4-momentum $P = p_1 + p_2$, what is $P\\cdot P$?', '$4E_1E_2/c^2$', ['$(E_1 + E_2)^2/c^2$', '$0$', '$2E_1E_2/c^2$', '$(E_1 - E_2)^2/c^2$', '$(E_1^2 + E_2^2)/c^2$'],
            '$P\\cdot P = p_1^2 + p_2^2 + 2p_1\\cdot p_2 = 0 + 0 + 2(E_1E_2/c^2)(1 - \\cos 180^\\circ) = 4E_1E_2/c^2$: the squared invariant mass of the pair, times $c^2$.'],
          ['Two photons with energies $E_1$ and $E_2$ travel in the same direction. For the total 4-momentum $P = p_1 + p_2$, what is $P\\cdot P$?', '$0$', ['$4E_1E_2/c^2$', '$(E_1 + E_2)^2/c^2$', '$2E_1E_2/c^2$', '$(E_1 - E_2)^2/c^2$'],
            '$p_1\\cdot p_2 = (E_1E_2/c^2)(1 - \\cos\\theta)$ vanishes for $\\theta = 0$, so $P\\cdot P = 0$: collinear photons have zero invariant mass.'],
          ['A particle’s 4-acceleration is $a^\\mu = du^\\mu/d\\tau$, where $u^\\mu$ is its 4-velocity. What is $u\\cdot a$?', '$0$', ['$c^2$', '$|\\mathbf{a}|c$', '$\\gamma c^2$', '$-c^2$'],
            'Differentiate $u\\cdot u = c^2$ (a constant) with respect to proper time: $2u\\cdot a = 0$. The 4-acceleration is always orthogonal to the 4-velocity.'],
        ]);
        return {
          q: conv + Q[0], ...GRE.mc(R, Q[1], Q[2]), expl: Q[3],
        };
      },
    },
  ]);

  // ------------------------------------------------------------ 6.3 Relativistic kinematics
  GRE.addTemplates('sr', [
    {
      id: 'sr.conserved.classify', sec: '6.3.1', level: 2,
      gen(R) {
        const OPT = ['Conserved and Lorentz invariant', 'Conserved but not Lorentz invariant', 'Lorentz invariant but not conserved', 'Neither conserved nor Lorentz invariant', 'Conserved only in the center-of-momentum frame'];
        const ITEMS = [
          ['the total relativistic energy of an isolated system of particles', 1, 'Energy is the time component of the total 4-momentum: conserved, but it changes under boosts.'],
          ['the total momentum of an isolated system of particles', 1, 'Momentum is conserved, but it is not invariant: it can be boosted to zero in the center-of-momentum frame.'],
          ['the total kinetic energy of the particles in a completely inelastic collision', 3, 'Kinetic energy is converted into rest energy (so it is not conserved), and it depends on the frame.'],
          ['the total kinetic energy of the particles produced when a particle at rest decays', 3, 'In a decay rest energy turns into kinetic energy, so kinetic energy is not conserved; and it is frame dependent.'],
          ['the sum of the rest masses of the particles taking part in a decay', 2, 'Each rest mass is a Lorentz scalar, so the sum is invariant; but in a decay the products are lighter than the parent, so the sum is not conserved.'],
          ['the invariant mass $\\sqrt{E_{\\text{tot}}^2 - p_{\\text{tot}}^2c^2}/c^2$ of an isolated system', 0, 'It is the norm of the total 4-momentum: conserved because $P^\\mu$ is conserved, invariant because it is a dot product.'],
          ['the total electric charge of an isolated system', 0, 'Charge is both conserved and the same in every frame.'],
          ['the quantity $E_{\\text{tot}}^2 - p_{\\text{tot}}^2c^2$ for a system of colliding particles', 0, 'It is $P\\cdot P\\,c^2$ for the total 4-momentum: conserved and invariant.'],
          ['the total kinetic energy of two particles in an elastic collision', 1, 'In an elastic collision the rest masses are unchanged, so conservation of total energy implies conservation of kinetic energy; but kinetic energy depends on the frame.'],
          ['the momentum of one particle in a head-on collision with another', 3, 'A single particle’s momentum changes in a collision and also depends on the frame.'],
        ];
        const it = R.pick(ITEMS);
        return {
          q: raw`In relativistic kinematics, "conserved" means unchanged by a collision or decay, and "Lorentz invariant" means the same in every inertial frame. Which phrase correctly describes ${it[0]}?`,
          ...orderedMC(R, OPT, OPT[it[1]], OPT.filter((x, i) => i !== it[1])),
          expl: it[2] + ' (Conserved = same before and after; invariant = same in every frame.)',
        };
      },
    },
    {
      id: 'sr.conserved.roman', sec: '6.3.1', level: 2,
      gen(R) {
        const SC = R.pick([
          ['Two lumps of clay collide at relativistic speed and stick together.', [1, 1, 0, 0, 1]],
          ['A particle at rest decays into two lighter particles.', [1, 1, 0, 0, 1]],
          ['Two protons undergo an elastic collision.', [1, 1, 1, 1, 1]],
          ['An electron and a positron annihilate into two photons.', [1, 1, 0, 0, 1]],
          ['A fast proton strikes a proton at rest and produces a neutral pion: $p + p \\to p + p + \\pi^0$.', [1, 1, 0, 0, 1]],
        ]);
        const Q = ['the total energy', 'the total momentum', 'the total kinetic energy', 'the sum of the rest masses of the particles', 'the invariant mass of the whole system'];
        let idx;
        do { idx = R.pickN([0, 1, 2, 3, 4], 3); } while (!idx.some(i => SC[1][i]));
        return {
          q: GRE.romanStem(SC[0] + ' Which of the following quantities is (are) the same before and after?', idx.map(i => Q[i].charAt(0).toUpperCase() + Q[i].slice(1))),
          ...GRE.roman(R, idx.map(i => !!SC[1][i])),
          expl: 'Total energy and momentum (the whole 4-momentum, hence also the invariant mass of the system) are always conserved. Kinetic energy and the sum of rest masses are conserved only in elastic processes, where the particles keep their identities; otherwise rest energy and kinetic energy convert into each other. ' +
            idx.map((i, j) => `${['I', 'II', 'III'][j]}: ${SC[1][i] ? 'same' : 'changes'}.`).join(' '),
        };
      },
    },
    {
      id: 'sr.collision.inelastic', sec: '6.3.1', level: 3,
      gen(R) {
        const s = fast(R);
        const g = s.gamma, b = s.beta;
        const m = R.pick(['m', 'm_0', 'm']);
        if (R.bool(0.4)) {
          const K = R.bool(0.3);
          if (K) return {
            q: raw`Two identical particles, each of mass $${m}$, move toward each other with speed $${spd(s)}$ each in the laboratory, collide, and stick together. How much kinetic energy is converted into rest energy?`,
            ...exactMC(R, 2 * (g - 1), [g - 1, b * b, 2 * g, 2 * (g * g - 1), (g - 1) / 2], `${m}c^2`, { maxDen: 100 }),
            expl: raw`The composite is at rest with $Mc^2 = 2\gamma ${m}c^2$, so all the initial kinetic energy $2(\gamma - 1)${m}c^2$ (with $\gamma = ${gTeX(s)}$) becomes rest energy: $${F.exact(2 * (g - 1), 100)}\,${m}c^2$.`,
          };
          return {
            q: raw`Two identical particles, each of mass $${m}$, move toward each other with speed $${spd(s)}$ each in the laboratory, collide, and stick together. What is the mass of the resulting particle?`,
            ...exactMC(R, 2 * g, [2, g, 2 / g, 2 * g * g, 2 + b * b], m, { maxDen: 100 }),
            expl: raw`By symmetry the composite is at rest, so all the energy becomes rest energy: $Mc^2 = 2\gamma ${m}c^2$ with $\gamma = ${gTeX(s)}$, i.e. $M = ${F.exact(2 * g, 100)}\,${m}$. Mass is not conserved — it exceeds $2${m}$.`,
          };
        }
        const M = Math.sqrt(2 * (1 + g));
        const V = g * b / (g + 1);
        const stem = raw`A particle of mass $${m}$ moving at speed $${spd(s)}$ strikes an identical particle at rest, and the two stick together.`;
        const ex = raw`Total energy $(\gamma + 1)${m}c^2$ and momentum $\gamma\beta ${m}c$ with $\gamma = ${gTeX(s)}$. Invariant mass: $M^2c^4 = E^2 - p^2c^2 = 2(1 + \gamma)${m}^2c^4$; speed: $v = pc^2/E = \dfrac{\gamma\beta}{\gamma + 1}c$.`;
        if (R.bool()) return {
          q: stem + ' What is the mass of the composite particle?',
          ...exactMC(R, M, [2, 1 + g, Math.sqrt(2 * g), 2 * g, Math.sqrt(1 + g)], m, { maxDen: 100 }),
          expl: ex + raw` So $M = ${F.exact(M, 100)}\,${m}$. Using $E/c^2 = (1 + \gamma)${m}$ forgets that the composite still moves.`,
        };
        return {
          q: stem + ' What is the speed of the composite particle?',
          ...exactMC(R, V, [b / 2, b, g * b / 2, b / (1 + g), 1 / (g + 1)], 'c', { maxDen: 100 }),
          expl: ex + raw` So $v = ${F.exact(V, 100)}\,c$, not the Newtonian $\beta c/2$.`,
        };
      },
    },
    {
      id: 'sr.decay.twobody', sec: '6.3.2', level: 2,
      gen(R) {
        const v = R.pick(['num', 'num', 'photon', 'real']);
        if (v === 'num') {
          const M = R.pick([500, 600, 800, 1000, 1200, 1500, 2000]);
          let m2, m3;
          do { m2 = R.int(1, 15) * 50; m3 = R.int(0, 14) * 50; } while (m2 + m3 >= M - 50 || m2 === m3);
          const E2 = (M * M + m2 * m2 - m3 * m3) / (2 * M), E3 = M - E2;
          const ask = R.pick(['E', 'K', 'p']);
          const p = Math.sqrt(E2 * E2 - m2 * m2);
          const val = ask === 'E' ? E2 : ask === 'K' ? E2 - m2 : p;
          const ws = ask === 'E' ? [E3, M / 2, (M * M - m3 * m3) / (2 * M), (M + m2 - m3) / 2, M - m3]
            : ask === 'K' ? [E3 - m3, (M - m2 - m3) / 2, M - m2 - m3, E2]
              : [E2, E2 - m2, Math.sqrt(2 * m2 * (E2 - m2)), (M - m2 - m3) / 2];
          const what = { E: 'total energy', K: 'kinetic energy', p: 'momentum' }[ask];
          const m3txt = m3 === 0 ? 'a massless particle' : raw`a particle B of rest energy $${m3}\,\text{MeV}$`;
          return {
            q: raw`A particle of rest energy $${M}\,\text{MeV}$, at rest, decays into a particle A of rest energy $${m2}\,\text{MeV}$ and ${m3txt}. What is the ${what} of particle A?`,
            ...GRE.numeric(R, val, ws, { unit: ask === 'p' ? raw`\text{MeV}/c` : raw`\text{MeV}`, fmt: x => F.num(x, 3), tol: 0.05 }),
            expl: raw`Write $p_A = P - p_B$ and square: $m_B^2 = M^2 + m_A^2 - 2ME_A$ (units $c = 1$), so $E_A = \dfrac{M^2 + m_A^2 - m_B^2}{2M} = ${F.num(E2, 4)}\,\text{MeV}$. Then $K_A = E_A - m_A = ${F.num(E2 - m2, 3)}\,\text{MeV}$ and $p_Ac = \sqrt{E_A^2 - m_A^2} = ${F.num(p, 3)}\,\text{MeV}$.`,
          };
        }
        if (v === 'photon') {
          const [M, m] = R.pick([['M', 'm'], ['M', 'm_0'], ['m_1', 'm_2']]);
          return {
            q: raw`A particle of mass $${M}$, at rest, decays into a particle of mass $${m}$ and a photon. What is the energy of the photon?`,
            ...GRE.mc(R, raw`$\dfrac{(${M}^2 - ${m}^2)c^2}{2${M}}$`, [raw`$(${M} - ${m})c^2$`, raw`$\dfrac{(${M}^2 - ${m}^2)c^2}{2${m}}$`, raw`$\dfrac{(${M}^2 + ${m}^2)c^2}{2${M}}$`, raw`$\dfrac{(${M} - ${m})c^2}{2}$`, raw`$\dfrac{(${M}^2 - ${m}^2)c^2}{${M}}$`]),
            expl: raw`Write $p_${'m'} = P - p_\gamma$ and square: $${m}^2c^2 = ${M}^2c^2 - 2${M}E_\gamma$ (since $p_\gamma^2 = 0$ and $P\cdot p_\gamma = ${M}E_\gamma$). Hence $E_\gamma = (${M}^2 - ${m}^2)c^2/(2${M})$, slightly less than $(${M} - ${m})c^2$ because the massive product recoils.`,
          };
        }
        const D = R.pick([
          ['A charged pion ($m_\\pi c^2 = 139.6\\,\\text{MeV}$) at rest decays into a muon ($m_\\mu c^2 = 105.7\\,\\text{MeV}$) and a neutrino of negligible mass.', 139.6, 105.7, 'muon'],
          ['A charged kaon ($m_K c^2 = 493.7\\,\\text{MeV}$) at rest decays into a muon ($m_\\mu c^2 = 105.7\\,\\text{MeV}$) and a neutrino of negligible mass.', 493.7, 105.7, 'muon'],
          ['A charged kaon ($m_K c^2 = 493.7\\,\\text{MeV}$) at rest decays into a positron ($m_e c^2 = 0.511\\,\\text{MeV}$) and a neutrino of negligible mass.', 493.7, 0.511, 'positron'],
        ]);
        const [txt, M, m, nm] = D;
        const En = (M * M - m * m) / (2 * M);
        const askNu = R.bool();
        const val = askNu ? En : M - En - m;
        return {
          q: txt + (askNu ? ' The energy of the neutrino is closest to' : ` The kinetic energy of the ${nm} is closest to`),
          ...GRE.numeric(R, val, askNu ? [(M - m) / 2, M - m, M / 2, (M * M + m * m) / (2 * M)] : [(M - m) / 2, M - m, En, m * (M - m) / M], { unit: raw`\text{MeV}`, fmt: x => F.num(x, 2), tol: 0.15 }),
          expl: raw`For a massless partner, $E_\nu = \dfrac{(M^2 - m^2)c^2}{2M} = ${F.num(En, 3)}\,\text{MeV}$, and the ${nm} has $K = Mc^2 - E_\nu - mc^2 = ${F.num(M - En - m, 3)}\,\text{MeV}$. The neutrino carries most of the released $${F.num(M - m, 4)}\,\text{MeV}$ because, for equal momenta, the light particle gets the larger energy.`,
        };
      },
    },
    {
      id: 'sr.threshold', sec: '6.3.2', level: 3,
      gen(R) {
        const v = R.pick(['fixed', 'fixed', 'photon', 'collider', 'real']);
        const n = R.int(1, 6);
        const mc2 = 'mc^2';
        const newp = n === 2 && R.bool() ? 'a particle–antiparticle pair, each of mass $m$,' : `a new particle of mass $${n === 1 ? '' : n}m$`;
        if (v === 'fixed') {
          const K = n * (n + 4) / 2;
          return {
            q: raw`A particle of mass $m$ strikes an identical particle at rest. What is the minimum kinetic energy of the projectile for the collision to produce ${newp} in addition to the two original particles?`,
            ...exactMC(R, K, [n, 2 * n, ((n + 2) * (n + 2) - 2) / 2, n * (n + 4), n * n / 2, (n + 2) * (n + 2) / 2], mc2),
            expl: raw`At threshold the products are at rest in the CM frame, so $(p_1 + p_2)^2 = (${n + 2}m)^2c^2$. In the lab, $(p_1 + p_2)^2 = 2m^2c^2 + 2mE_1$, giving $E_1 = \dfrac{(${n + 2})^2 - 2}{2}mc^2$ and $K = E_1 - mc^2 = ${F.frac(n * (n + 4), 2)}\,mc^2$ — much more than the $${n === 1 ? '' : n}mc^2$ of new rest energy, because momentum must be conserved.`,
          };
        }
        if (v === 'photon') {
          const E = n * (n + 2) / 2;
          return {
            q: raw`A photon strikes a particle of mass $m$ at rest. What is the minimum photon energy needed to produce ${newp} in addition to the original particle?`,
            ...exactMC(R, E, [n, n * (n + 2), (n + 1) * (n + 1) / 2, n * (n + 4) / 2, 2 * n], mc2),
            expl: raw`$(p_\gamma + p_m)^2 = m^2c^2 + 2mE_\gamma$ must equal $(${n + 1}m)^2c^2$ at threshold, so $E_\gamma = \dfrac{(${n + 1})^2 - 1}{2}mc^2 = ${F.frac(n * (n + 2), 2)}\,mc^2$.`,
          };
        }
        if (v === 'collider') return {
          q: raw`In a collider, two particles of mass $m$ with equal and opposite momenta collide head-on. What is the minimum kinetic energy of each particle for the collision to produce ${newp} in addition to the two original particles?`,
          ...exactMC(R, n / 2, [n, n * (n + 4) / 2, n * (n + 4) / 4, n * n / 2, (n + 2) / 2], mc2),
          expl: raw`The lab is the CM frame, so at threshold all products are at rest: $2E = ${n + 2}mc^2$, i.e. $K = E - mc^2 = ${F.frac(n, 2)}\,mc^2$ per particle. Compare the much larger fixed-target threshold $${F.frac(n * (n + 4), 2)}\,mc^2$.`,
        };
        const RX = R.pick([
          ['$p + p \\to p + p + \\pi^0$, with a proton beam on a hydrogen target at rest', 938, 938, 938 + 938 + 135, 'kinetic energy of the incident proton', 'K'],
          ['$\\gamma + p \\to p + \\pi^0$, with photons striking protons at rest', 0, 938, 938 + 135, 'photon energy', 'E'],
          ['$p + p \\to p + p + p + \\bar p$, with a proton beam on protons at rest', 938, 938, 4 * 938, 'kinetic energy of the incident proton', 'K'],
        ]);
        const [txt, ma, mb, S, what, kind] = RX;
        const Ea = (S * S - ma * ma - mb * mb) / (2 * mb);
        const val = kind === 'K' ? Ea - ma : Ea;
        return {
          q: raw`Take $m_pc^2 = 938\,\text{MeV}$ and $m_{\pi^0}c^2 = 135\,\text{MeV}$. For the reaction ${txt}, the threshold ${what} is closest to`,
          ...GRE.numeric(R, val, [S - ma - mb, Ea, (S - ma - mb) / 2, 2 * val, S], { unit: raw`\text{MeV}`, fmt: x => F.num(x, 2), tol: 0.15 }),
          expl: raw`Threshold: $(p_a + p_b)^2c^2 = (\sum m_f c^2)^2$, with $(p_a + p_b)^2c^2 = m_a^2c^4 + m_b^2c^4 + 2E_am_bc^2$ for a target at rest. So $E_a = \dfrac{(${S})^2 - ${ma}^2 - ${mb}^2}{2\cdot ${mb}}\,\text{MeV} = ${F.num(Ea, 4)}\,\text{MeV}$${kind === 'K' ? raw`, i.e. $K = ${F.num(val, 3)}\,\text{MeV}$` : ''}. The naive answer, just the new rest energy $${S - ma - mb}\,\text{MeV}$, ignores momentum conservation.`,
        };
      },
    },
  ]);

  GRE.addTemplates('sr', [
    {
      id: 'sr.photon.collision', sec: '6.3.2', level: 3,
      gen(R) {
        if (R.bool(0.45)) {
          const k = R.pick([[1, 2], [1, 1], [3, 2], [4, 1], [12, 1], [5, 2], [3, 1], [3, 4], [7, 2]]);
          const kk = k[0] / k[1];
          const m = R.pick(['m', 'M_0']);
          const obj = R.pick(['a nucleus', 'an atom', 'a particle']);
          const stem = raw`A photon of energy $${F.frac(k[0], k[1])}\,${m}c^2$ is absorbed by ${obj} of mass $${m}$ initially at rest.`;
          const ex = raw`Invariant: $M^2c^4 = (E_\gamma + ${m}c^2)^2 - E_\gamma^2 = ${m}^2c^4 + 2E_\gamma ${m}c^2 = (1 + ${F.frac(2 * k[0], k[1])})${m}^2c^4$.`;
          if (R.bool(0.6)) {
            const M = Math.sqrt(1 + 2 * kk);
            return {
              q: stem + ' What is the mass of the resulting excited object?',
              ...exactMC(R, M, [1 + kk, 1, Math.sqrt(1 + kk), 1 + 2 * kk, Math.sqrt(1 + kk * kk)], m),
              expl: ex + raw` So $M = ${F.exact(M)}\,${m}$. Adding energies, $(1 + ${F.frac(k[0], k[1])})${m}$, ignores the recoil momentum.`,
            };
          }
          const V = kk / (1 + kk);
          return {
            q: stem + ' What is the speed of the object after absorbing the photon?',
            ...exactMC(R, V, [kk, kk / Math.sqrt(1 + 2 * kk), 1 / (1 + kk), kk / (1 + 2 * kk), Math.sqrt(kk / (1 + kk))], 'c', { max: 2 }),
            expl: raw`Total momentum $E_\gamma/c$ and total energy $E_\gamma + ${m}c^2$, so $v = pc^2/E = \dfrac{E_\gamma}{E_\gamma + ${m}c^2}c = ${F.exact(V)}\,c$. Using $v = p/M$ with a non-relativistic mass gives a wrong answer.`,
          };
        }
        const [a, b] = R.pick([[1, 1], [1, 2], [1, 3], [2, 3], [1, 4], [1, 5], [2, 5], [3, 4]]);
        const u = R.pick([0.5, 1, 2, 5, 10, 20, 100]);
        const E1 = a * a * u, E2 = b * b * u;
        const [ang, f, angT] = R.pick([[180, 2, 'head-on (opposite directions)'], [90, Math.SQRT2, 'at right angles'], [60, 1, 'at $60^\\circ$ to each other'], [120, Math.sqrt(3), 'at $120^\\circ$ to each other']]);
        const M = f * a * b * u;
        const decay = R.bool();
        return {
          q: decay
            ? raw`A neutral particle decays into two photons. In the laboratory the photons have energies $${F.num(E1, 3)}\,\text{MeV}$ and $${F.num(E2, 3)}\,\text{MeV}$ and travel ${angT}. What is the rest energy of the particle?`
            : raw`Two photons with energies $${F.num(E1, 3)}\,\text{MeV}$ and $${F.num(E2, 3)}\,\text{MeV}$ collide ${angT.replace('head-on (opposite directions)', 'head-on').replace(/^at /, 'traveling at ')}. What is the largest rest energy a single particle produced in the collision could have?`,
          ...GRE.numeric(R, M, [E1 + E2, Math.abs(E2 - E1), Math.sqrt(E1 * E1 + E2 * E2), (E1 + E2) / 2, M / f, 2 * M / f].filter(x => x > 0), { unit: raw`\text{MeV}`, fmt: x => F.num(x, 3), tol: 0.06 }),
          expl: raw`$M^2c^4 = (p_1 + p_2)^2c^2 = 2E_1E_2(1 - \cos\theta)$ for photons ($p_i^2 = 0$). With $\theta = ${ang}^\circ$: $Mc^2 = \sqrt{2(${F.num(E1, 3)})(${F.num(E2, 3)})(${F.num(1 - Math.cos(ang * Math.PI / 180), 2)})}\,\text{MeV} = ${F.num(M, 3)}\,\text{MeV}$. The sum of the energies, $${F.num(E1 + E2, 3)}\,\text{MeV}$, is the answer only in the CM frame.`,
        };
      },
    },
    {
      id: 'sr.compton', sec: '6.3.2', level: 2,
      gen(R) {
        const [th, cs] = R.pick([[60, 0.5], [90, 0], [120, -0.5], [180, -1]]);
        const v = R.pick(['shift', 'final', 'energy', 'energy']);
        if (v === 'energy') {
          const k = R.pick([[1, 2], [1, 1], [2, 1], [3, 2], [1, 4], [3, 1], [1, 3]]);
          const kk = k[0] / k[1];
          const Ep = kk / (1 + kk * (1 - cs));
          const askK = R.bool(0.35);
          const val = askK ? kk - Ep : Ep;
          const ws = askK ? [kk - kk / (1 + kk * (1 + cs)), kk, kk / (1 + kk * (1 - cs)), kk * kk * (1 - cs), kk / 2, kk * kk * (1 - cs) / 2]
            : [kk / (1 + kk * (1 + cs)), kk, kk / (1 + kk), kk / (1 + 2 * kk * (1 - cs)), kk * (1 - kk * (1 - cs) / 2), kk / 2, kk / (2 + kk * (1 - cs))];
          return {
            level: 3,
            q: raw`A photon of energy $${F.frac(k[0], k[1])}\,m_ec^2$ scatters from a free electron at rest and is deflected by $${th}^\circ$. What is ${askK ? 'the kinetic energy of the recoiling electron' : 'the energy of the scattered photon'}?`,
            ...exactMC(R, val, ws, 'm_ec^2', { maxDen: 100 }),
            expl: raw`Compton formula in energy form: $E' = \dfrac{E}{1 + (E/m_ec^2)(1 - \cos\theta)}$, obtained by squaring $p_e' = p_\gamma + p_e - p_\gamma'$. With $\cos\theta = ${F.exact(cs) || 0}$: $E' = ${F.exact(Ep, 100)}\,m_ec^2$${askK ? raw`, and the electron gets $K = E - E' = ${F.exact(val, 100)}\,m_ec^2$` : ''}.`,
          };
        }
        const proton = v === 'shift' && R.bool(0.25);
        const lc = proton ? 1.32 : 2.43; // fm for the proton, pm for the electron
        const unit = proton ? raw`\text{fm}` : raw`\text{pm}`;
        const dl = lc * (1 - cs);
        const tgt = proton ? 'a free proton at rest' : 'a free electron at rest';
        const lcTxt = proton ? raw`$h/(m_pc) = 1.32\times10^{-15}\,\text{m}$` : raw`$h/(m_ec) = 2.43\,\text{pm}$`;
        if (v === 'shift') return {
          q: raw`${proton ? 'Gamma rays' : 'X-rays'} scatter from ${tgt} and are detected at $${th}^\circ$ from the incident direction. Given ${lcTxt}, by how much is the wavelength of the scattered radiation increased?`,
          ...GRE.numeric(R, dl, [lc * (1 + cs) || 2 * lc, lc, 2 * lc, lc * Math.abs(cs) || lc / 2, lc * (1 - cs) / 2], { unit, fmt: x => F.num(x, 3), tol: 0.1 }),
          expl: raw`$\Delta\lambda = \dfrac{h}{mc}(1 - \cos\theta)$, which follows from squaring the 4-momentum conservation equation. At $${th}^\circ$, $1 - \cos\theta = ${F.num(1 - cs, 2)}$, so $\Delta\lambda = ${F.num(dl, 3)}\,\text{${proton ? 'fm' : 'pm'}}$.${proton ? ' The proton’s Compton wavelength is about 1800 times smaller than the electron’s.' : ''}`,
        };
        const l0 = R.pick([2, 3, 5, 6, 8, 10, 12, 20]);
        const l1 = l0 + dl;
        return {
          q: raw`A photon of wavelength $${l0}\,\text{pm}$ scatters from ${tgt} and emerges at $${th}^\circ$ from its original direction. Given ${lcTxt}, what is the wavelength of the scattered photon?`,
          ...GRE.numeric(R, l1, [l0 - dl, l0 + lc * (1 + cs), l0 + 2 * dl, l0, l0 + lc], { unit, fmt: x => F.num(x, 3), tol: 0.04 }),
          expl: raw`$\lambda' = \lambda + \dfrac{h}{m_ec}(1 - \cos\theta) = ${l0} + 2.43\times${F.num(1 - cs, 2)} = ${F.num(l1, 3)}\,\text{pm}$. The scattered photon always loses energy, so its wavelength is longer.`,
        };
      },
    },
  ]);

  // ------------------------------------------------------------ 6.4 Miscellaneous
  GRE.addTemplates('sr', [
    {
      id: 'sr.doppler.speed', sec: '6.4.1', level: 2,
      gen(R) {
        const [p, q] = R.pick([[2, 1], [3, 1], [3, 2], [4, 3], [5, 3], [5, 4], [4, 1], [5, 2], [7, 4], [5, 1], [7, 5], [9, 7]]);
        const k = p / q, beta = (p * p - q * q) / (p * p + q * q);
        const sc = R.pick(['galaxy', 'beacon', 'radio']);
        let qs;
        if (sc === 'galaxy') {
          const u = R.pick([20, 25, 30, 40, 50, 60, 80, 100, 120, 150, 200, 250, 300]);
          if (q * u < 100 || q * u > 700 || p * u > 2500) throw new Error('range');
          qs = raw`A spectral line with laboratory wavelength $${q * u}\,\text{nm}$ is observed at $${p * u}\,\text{nm}$ in the light of a distant ${R.pick(['galaxy', 'quasar', 'jet'])} moving directly along the line of sight. What is its speed relative to Earth?`;
        } else if (sc === 'beacon') {
          const u = R.pick([10, 20, 25, 50, 100]);
          if (p * u > 2000) throw new Error('range');
          qs = raw`A navigation beacon emits light of wavelength $${p * u}\,\text{nm}$ in its rest frame. The pilot of a ship flying straight toward the beacon measures the wavelength to be $${q * u}\,\text{nm}$. What is the speed of the ship relative to the beacon?`;
        } else {
          const f0 = R.pick([1, 2, 3, 5, 10]) * p * q * R.pick([1, 10]);
          const away = R.bool();
          qs = raw`A space probe transmits radio signals at $${f0}\,\text{MHz}$ in its own frame. Receivers on Earth detect them at $${away ? f0 * q / p : f0 * p / q}\,\text{MHz}$. The probe moves along the line of sight. What is its speed relative to Earth?`;
        }
        return {
          q: qs,
          ...exactMC(R, beta, [k - 1, (k - 1) / k, 1 - 1 / (k * k), (k - 1) / (k + 1), Math.sqrt(1 - 1 / (k * k))], 'c', { maxDen: 200 }),
          expl: raw`The Doppler factor is $\sqrt{\dfrac{1 + \beta}{1 - \beta}} = ${F.frac(p, q)}$, so $\dfrac{1 + \beta}{1 - \beta} = ${F.frac(p * p, q * q)}$ and $\beta = \dfrac{${p * p} - ${q * q}}{${p * p} + ${q * q}} = ${F.frac(p * p - q * q, p * p + q * q)}$. The first-order formula $\Delta\lambda/\lambda = \beta$ is only valid for $\beta \ll 1$.`,
        };
      },
    },
    {
      id: 'sr.doppler.transverse', sec: '6.4.1', level: 3,
      gen(R) {
        const s = fast(R, [[3, 4, 5], [4, 3, 5], [12, 5, 13], [15, 8, 17], [24, 7, 25], [20, 21, 29], [21, 20, 29], [40, 9, 41]]);
        const g = s.gamma, b = s.beta;
        if (R.bool(0.2)) return {
          q: raw`A light source moves at constant speed in a circle around a detector at the center of the circle, so that the light reaching the detector always travels perpendicular to the source's velocity (in the detector's frame). The detector measures a frequency slightly different from the frequency emitted in the source's rest frame. Which effect is responsible?`,
          ...GRE.mc(R, 'Time dilation of the moving source', ['The first-order (longitudinal) Doppler effect', 'Length contraction of the wavelength along the velocity', 'Gravitational redshift', 'A change in the speed of light in the detector’s frame', 'Relativity of simultaneity between source and detector']),
          expl: 'The source has no velocity component along the line of sight, so there is no first-order Doppler shift. Its clock runs slow by $\\gamma$, so the detector receives a lower frequency $f_0/\\gamma$: the transverse Doppler effect.',
        };
        const useF = R.bool();
        const stem = raw`A source moves at constant speed $${spd(s)}$ in a circle centered on a detector, so that the light reaching the detector travels perpendicular to the source's velocity in the detector's frame.`;
        if (useF) {
          const f0 = R.pick([2, 3, 4, 5, 6, 8]) * 1e14;
          return {
            q: stem + raw` The source emits light of frequency $${F.sci(f0, 2)}\,\text{Hz}$ in its rest frame. What frequency does the detector measure?`,
            ...GRE.numeric(R, f0 / g, [f0 * g, f0, f0 * Math.sqrt((1 - b) / (1 + b)), f0 * (1 - b * b), f0 * Math.sqrt((1 + b) / (1 - b))], { unit: raw`\text{Hz}`, fmt: x => F.sci(x, 2) }),
            expl: raw`Transverse Doppler effect: with no line-of-sight velocity, only time dilation acts, so $f = f_0/\gamma = ${F.sci(f0, 2)}\times ${F.frac(s.gd, s.gn)} = ${F.sci(f0 / g, 2)}\,\text{Hz}$ (a redshift).`,
          };
        }
        const l0 = R.pick([400, 450, 500, 520, 550, 600]);
        return {
          q: stem + raw` The source emits light of wavelength $${l0}\,\text{nm}$ in its rest frame. What wavelength does the detector measure?`,
          ...GRE.numeric(R, l0 * g, [l0 / g, l0, l0 * Math.sqrt((1 + b) / (1 - b)), l0 * Math.sqrt((1 - b) / (1 + b)), l0 * g * g], { unit: raw`\text{nm}`, fmt: x => F.num(x, 3), tol: 0.05 }),
          expl: raw`Only time dilation acts (no line-of-sight motion): the period is stretched by $\gamma = ${gTeX(s)}$, so $\lambda = \gamma\lambda_0 = ${F.num(l0 * g, 3)}\,\text{nm}$. A classical (Galilean) treatment predicts no shift at all.`,
        };
      },
    },
    {
      id: 'sr.doppler.symbolic', sec: '6.4.1', level: 2,
      gen(R) {
        const k = R.pick(['small', 'small', 'formula', 'formula', 'radar']);
        if (k === 'small') {
          const [nm, l0] = R.pick([['hydrogen-alpha', 656.3], ['hydrogen-beta', 486.1], ['Lyman-alpha', 121.6], ['calcium K', 393.4]]);
          const v = R.pick([600, 900, 1200, 1500, 1800, 2400, 3000, 4500, 6000, 9000]);
          const dl = l0 * v / 3e5;
          if (R.bool()) return {
            level: 1,
            q: raw`The ${nm} line (rest wavelength $${l0}\,\text{nm}$) in the spectrum of a galaxy is observed at $${F.fix(l0 + dl, 1)}\,\text{nm}$. The galaxy's recession speed is closest to`,
            ...GRE.numeric(R, v, [2 * v, v / 2, 10 * v, v / 10], { unit: raw`\text{km/s}`, fmt: x => F.num(x, 2) }),
            expl: raw`For $v \ll c$ the relativistic formula reduces to $\Delta\lambda/\lambda \approx v/c$: $v \approx (3\times10^5\,\text{km/s})\times ${F.num(dl, 3)}/${l0} \approx ${v}\,\text{km/s}$.`,
          };
          return {
            level: 1,
            q: raw`A galaxy recedes from Earth at $${v}\,\text{km/s}$. By about how much is its ${nm} line (rest wavelength $${l0}\,\text{nm}$) shifted?`,
            ...GRE.numeric(R, dl, [2 * dl, dl / 2, 10 * dl, dl / 10], { unit: raw`\text{nm}`, fmt: x => F.num(x, 2) }),
            expl: raw`$\beta = ${v}/(3\times10^5) = ${F.num(v / 3e5, 2)} \ll 1$, so $\Delta\lambda \approx \beta\lambda_0 = ${F.num(dl, 2)}\,\text{nm}$ toward the red.`,
          };
        }
        if (k === 'formula') {
          const toward = R.bool();
          const lam = R.bool();
          const X = lam ? '\\lambda_0' : 'f_0';
          const up = toward !== lam; // ratio > 1
          const fr = big => big ? raw`\sqrt{\dfrac{1 + \beta}{1 - \beta}}` : raw`\sqrt{\dfrac{1 - \beta}{1 + \beta}}`;
          return {
            q: raw`A light source with rest-frame ${lam ? 'wavelength $\\lambda_0$' : 'frequency $f_0$'} moves directly ${toward ? 'toward' : 'away from'} an observer at speed $\beta c$. According to special relativity, what ${lam ? 'wavelength' : 'frequency'} does the observer measure?`,
            ...GRE.mc(R, `$${X}${fr(up)}$`, [`$${X}${fr(!up)}$`, `$${X}(1 ${up ? '+' : '-'} \\beta)$`, `$${X}\\sqrt{1 - \\beta^2}$`, raw`$\dfrac{${X}}{\sqrt{1 - \beta^2}}$`, `$${X}\\dfrac{1 ${up ? '+' : '-'} \\beta}{1 ${up ? '-' : '+'} \\beta}$`]),
            expl: raw`Approach means blueshift (higher frequency, shorter wavelength); recession means redshift. The relativistic factor is $\sqrt{(1 \pm \beta)/(1 \mp \beta)}$, which reduces to $1 \pm \beta$ to first order; the bare $\gamma$ factors describe the transverse effect only.`,
          };
        }
        const away = R.bool();
        const f = away ? raw`f_0\dfrac{1 - \beta}{1 + \beta}` : raw`f_0\dfrac{1 + \beta}{1 - \beta}`;
        return {
          level: 3,
          q: raw`A radar pulse of frequency $f_0$ is reflected from a target moving directly ${away ? 'away from' : 'toward'} the transmitter at speed $\beta c$. What frequency is received back at the transmitter?`,
          ...GRE.mc(R, `$${f}$`, [raw`$f_0\sqrt{\dfrac{1 ${away ? '-' : '+'} \beta}{1 ${away ? '+' : '-'} \beta}}$`, `$f_0(1 ${away ? '-' : '+'} 2\\beta)$`, away ? raw`$f_0\dfrac{1 + \beta}{1 - \beta}$` : raw`$f_0\dfrac{1 - \beta}{1 + \beta}$`, `$f_0(1 - \\beta^2)$`, '$f_0$']),
          expl: raw`The Doppler factor $D = \sqrt{(1 ${away ? '-' : '+'} \beta)/(1 ${away ? '+' : '-'} \beta)}$ applies twice: once when the target receives the wave and once when it re-emits it. So $f = D^2 f_0$, which to first order is $f_0(1 ${away ? '-' : '+'} 2\beta)$.`,
        };
      },
    },
  ]);

  // gamma values with simple beta: [gamma num, gamma den]
  const GAM = [[5, 4], [5, 3], [13, 12], [13, 5], [17, 15], [17, 8], [25, 24], [25, 7], [2, 1], [3, 1], [4, 1], [3, 2], [41, 40], [41, 9]];
  GRE.addTemplates('sr', [
    {
      id: 'sr.triples.gamma', sec: '6.4.2', level: 1,
      gen(R) {
        const w = R.pick(['a particle', 'a particle', 'an electron', 'a proton', 'a muon', 'a deuteron', 'an alpha particle']); const W = w.charAt(0).toUpperCase() + w.slice(1);
        const s = fast(R);
        const g = s.gamma, b = s.beta;
        const ask = R.pick(['gamma', 'gamma', 'beta', 'inv', 'gb']);
        const bt = bTeX(s);
        const tip = raw`$\beta = ${F.frac(s.bn, s.bd)}$ and $1/\gamma = ${F.frac(s.gd, s.gn)}$ are the legs of the ${s.bn}–${s.gd}–${s.gn} Pythagorean triple (scaled to hypotenuse 1), so $\gamma = ${gTeX(s)}$.`;
        if (ask === 'gamma') return {
          q: raw`${W} moves at speed $${bt}\,c$. What is its Lorentz factor $\gamma$?`,
          ...exactMC(R, g, [1 / (1 - b), 1 / Math.sqrt(1 - b), 1 / (1 - b * b), 1 / b, 1 + b * b / 2, 1 + b], '', { maxDen: 100 }),
          expl: raw`$\gamma = 1/\sqrt{1 - \beta^2}$: ${tip}`,
        };
        if (ask === 'beta') return {
          q: raw`${W} has Lorentz factor $\gamma = ${gTeX(s)}$. What is its speed?`,
          ...exactMC(R, b, [1 / g, 1 - 1 / g, Math.sqrt(1 - 1 / g), 1 - 1 / (g * g), Math.sqrt(g - 1), b * b, b / 2], 'c', { maxDen: 100, max: 1.5 }),
          expl: raw`$\beta = \sqrt{1 - 1/\gamma^2}$: ${tip}`,
        };
        if (ask === 'inv') return {
          q: raw`By what factor is the length of a rod moving parallel to itself at $${bt}\,c$ reduced?`,
          ...exactMC(R, 1 / g, [b, 1 - b, 1 - b * b, Math.sqrt(1 - b), g, 1 / (g * g), b * b], '', { maxDen: 100 }),
          expl: raw`$L/L_0 = 1/\gamma = \sqrt{1 - \beta^2}$: ${tip}`,
        };
        return {
          q: raw`${W} of mass $m$ moves at $${bt}\,c$. Its momentum is $p = k\,mc$. What is $k$?`,
          ...exactMC(R, g * b, [b, g, b / g, g * b * b, 1 / g, g - 1, b * b], '', { maxDen: 100 }),
          expl: raw`$p = \gamma m v$, so $k = \gamma\beta = ${gTeX(s)}\times ${F.frac(s.bn, s.bd)} = ${F.frac(s.bn, s.gd)}$. ${tip}`,
        };
      },
    },
    {
      id: 'sr.triples.ke-rest', sec: '6.4.2', level: 2,
      gen(R) {
        const w = R.pick(['a particle', 'a particle', 'an electron', 'a proton', 'a muon', 'a deuteron', 'an alpha particle']); const W = w.charAt(0).toUpperCase() + w.slice(1);
        const [gn, gd] = R.pick(GAM);
        const g = gn / gd, b = Math.sqrt(1 - 1 / (g * g)), k = g - 1;
        const kT = F.frac(gn - gd, gd);
        const ask = R.pick(['vK', 'vK', 'vE', 'K']);
        const bE = F.exact(b, 100);
        if (ask === 'vK') return {
          q: raw`At what speed is the kinetic energy of ${w} equal to ${k === 1 ? 'its rest energy' : `$${kT}$ times its rest energy`}?`,
          ...exactMC(R, b, [Math.sqrt(2 * k), k > 1 ? Math.sqrt(1 - 1 / (k * k)) : null, Math.sqrt(1 - 1 / g), 1 - 1 / (g * g), 1 / g, k / g], 'c', { maxDen: 100 }),
          expl: raw`$K = (\gamma - 1)mc^2 = ${kT}\,mc^2$ gives $\gamma = ${F.frac(gn, gd)}$, so $\beta = \sqrt{1 - 1/\gamma^2} = ${bE}$. The Newtonian $\tfrac12 mv^2 = K$ would give $\sqrt{${F.fracI(2 * (gn - gd), gd)}}\,c$.`,
        };
        if (ask === 'vE') {
          if (g < 1.5 && R.bool()) throw new Error('prefer large gamma');
          return {
            q: raw`At what speed is the total energy of ${w} equal to $${F.frac(gn, gd)}$ times its rest energy?`,
            ...exactMC(R, b, [k > 0 && k < 1 ? null : (k > 1 ? Math.sqrt(1 - 1 / (k * k)) : null), Math.sqrt(2 * k), Math.sqrt(1 - 1 / g), 1 / g, 1 - 1 / g, Math.sqrt(2 * (g - 1) / g)], 'c', { maxDen: 100, max: 1.5 }),
            expl: raw`$E = \gamma mc^2$, so $\gamma = ${F.frac(gn, gd)}$ and $\beta = \sqrt{1 - 1/\gamma^2} = ${bE}$. Note this is the total energy; the kinetic energy is $${kT}\,mc^2$.`,
          };
        }
        if (!F.toRational(b, 100)) throw new Error('want rational beta');
        return {
          q: raw`${W} moves at speed $${Math.abs(b * 100 - Math.round(b * 100)) < 1e-9 ? F.fix(b, 2) : bE}\,c$. What is the ratio of its kinetic energy to its rest energy?`,
          ...exactMC(R, k, [b * b / 2, g, g * g - 1, 1 / g, 1 - 1 / g], '', { maxDen: 1000 }),
          expl: raw`$K/(mc^2) = \gamma - 1$ with $\gamma = ${F.frac(gn, gd)}$, giving $${kT}$. The Newtonian $\beta^2/2$ underestimates it.`,
        };
      },
    },
    {
      id: 'sr.triples.momentum', sec: '6.4.2', level: 2,
      gen(R) {
        const w = R.pick(['a particle', 'a particle', 'an electron', 'a proton', 'a muon', 'a deuteron', 'an alpha particle']); const W = w.charAt(0).toUpperCase() + w.slice(1);
        const ask = R.pick(['pK', 'pK', 'vp', 'Ep']);
        if (ask === 'pK') {
          const [gn, gd] = R.pick(GAM);
          const g = gn / gd, k = g - 1, P = Math.sqrt(g * g - 1);
          const kT = F.frac(gn - gd, gd);
          return {
            q: raw`What is the momentum of ${w} of mass $m$ whose kinetic energy is ${k === 1 ? 'equal to its rest energy' : `$${kT}$ times its rest energy`}?`,
            ...exactMC(R, P, [Math.sqrt(2 * k), k, g, Math.sqrt(g * g + 1), Math.sqrt(1 - 1 / (g * g)), g * g - 1], 'mc', { maxDen: 100 }),
            expl: raw`$E = K + mc^2 = ${F.frac(gn, gd)}\,mc^2$, so $pc = \sqrt{E^2 - m^2c^4} = mc^2\sqrt{\gamma^2 - 1} = ${F.exact(P, 100)}\,mc^2$, i.e. $p = ${F.exact(P, 100)}\,mc$. The Newtonian $p = \sqrt{2mK}$ gives $${(e => (e === '1' ? '' : e + '\\,'))(F.exact(Math.sqrt(2 * k), 100))}mc$.`,
          };
        }
        const [n, d] = R.pick([[1, 1], [3, 4], [4, 3], [5, 12], [12, 5], [8, 15], [15, 8], [7, 24], [24, 7], [1, 2], [2, 1], [3, 1]]);
        const q = n / d;
        if (ask === 'vp') {
          const V = q / Math.sqrt(1 + q * q);
          return {
            q: raw`${W} of mass $m$ has momentum $p = ${q === 1 ? '' : F.frac(n, d)}\,mc$. What is its speed?`,
            ...exactMC(R, V, [q, q / (1 + q), 1 / Math.sqrt(1 + q * q), q * q / (1 + q * q), Math.sqrt(q / (1 + q))], 'c', { maxDen: 100 }),
            expl: raw`$\beta = pc/E = \dfrac{pc}{\sqrt{p^2c^2 + m^2c^4}} = \dfrac{${F.frac(n, d)}}{\sqrt{1 + (${F.frac(n, d)})^2}} = ${F.exact(V, 100)}$. Setting $v = p/m$ ignores $\gamma$${q >= 1 ? ' and even gives $v \\geq c$' : ''}.`,
          };
        }
        const E = Math.sqrt(1 + q * q);
        return {
          q: raw`${W} of mass $m$ has momentum $p = ${q === 1 ? '' : F.frac(n, d)}\,mc$. What is its total energy?`,
          ...exactMC(R, E, [1 + q * q / 2, 1 + q, q, Math.sqrt(1 + q), 1 + q * q], 'mc^2', { maxDen: 100 }),
          expl: raw`$E = \sqrt{p^2c^2 + m^2c^4} = mc^2\sqrt{1 + (${F.frac(n, d)})^2} = ${F.exact(E, 100)}\,mc^2$. Adding $mc^2$ to the Newtonian $p^2/2m$ only works for $p \ll mc$.`,
        };
      },
    },
    {
      id: 'sr.triples.ratio', sec: '6.4.2', level: 3,
      gen(R) {
        const w = R.pick(['a particle', 'a particle', 'an electron', 'a proton', 'a muon', 'a deuteron', 'an alpha particle']); const W = w.charAt(0).toUpperCase() + w.slice(1);
        const s = fast(R, SMALL);
        const g = s.gamma, b = s.beta;
        const bt = bTeX(s);
        const Q = R.pick([
          ['the ratio of its relativistic kinetic energy to the Newtonian value $\\tfrac12 mv^2$', 2 * (g - 1) / (b * b), [g, g - 1, g * g, 1 / g, 2 * g / (b * b)], '$\\dfrac{(\\gamma - 1)mc^2}{\\tfrac12 mv^2} = \\dfrac{2(\\gamma - 1)}{\\beta^2}$'],
          ['the ratio of its relativistic momentum to the Newtonian value $mv$', g, [g * g, 1 / g, g - 1, g * b], '$\\dfrac{\\gamma mv}{mv} = \\gamma$'],
          ['the ratio of its total energy to its kinetic energy', g / (g - 1), [g, (g - 1) / g, 1 / (g - 1), 2 / (b * b)], '$\\dfrac{\\gamma mc^2}{(\\gamma - 1)mc^2} = \\dfrac{\\gamma}{\\gamma - 1}$'],
          ['the ratio $pc/K$ of its momentum (times $c$) to its kinetic energy', g * b / (g - 1), [b, g * b, 2 / b, b / (g - 1), g / (g - 1)], '$\\dfrac{\\gamma\\beta mc^2}{(\\gamma - 1)mc^2} = \\dfrac{\\gamma\\beta}{\\gamma - 1}$'],
        ]);
        return {
          q: raw`${W} of mass $m$ moves at $${bt}\,c$. What is ${Q[0]}?`,
          ...exactMC(R, Q[1], Q[2], '', { maxDen: 1000 }),
          expl: raw`With $\beta = ${F.frac(s.bn, s.bd)}$, $\gamma = ${gTeX(s)}$ (Pythagorean triple ${s.bn}–${s.gd}–${s.gn}). The ratio is ${Q[3]} $= ${F.exact(Q[1], 1000)}$.`,
        };
      },
    },
  ]);
})(typeof window !== 'undefined' ? window.GRE : this.GRE);
