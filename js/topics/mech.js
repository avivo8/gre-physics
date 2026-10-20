/* Classical Mechanics, part A — Chapter 1, §1.1–1.4 of "Conquering the Physics GRE":
 * block problems, kinematics and circular motion, energy (types, kinetic/potential,
 * rolling without slipping, work-energy theorem) and momentum (collisions, angular
 * momentum, moment of inertia, center of mass). §1.5–1.8 live in mech-2.js.
 * Conventions: tools/AUTHORING.md. Numerical questions use g = 10 m/s^2 and say so.
 */
(function (GRE) {
  'use strict';
  const F = GRE.fmt;
  const raw = String.raw;

  // ------------------------------------------------------------------ helpers
  const g = 10;
  const USE_G = raw`Use $g = 10\,\text{m/s}^2$.`;
  const MS2 = raw`\text{m/s}^2`;
  const ex = x => F.exact(x, 1000);
  const N2 = (x, s) => F.num(x, s || 2);
  const nice = x => Math.abs(F.round(x, 2) - x) <= 1e-9 * Math.abs(x);
  const ask = x => (nice(x) ? 'What is' : 'Which of the following is closest to');
  const sum = a => a.reduce((s, x) => s + x, 0);
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  const art = s => (/^(8|11|18|[aeiou])/i.test(s) ? 'an ' : 'a ') + s;
  const roman3 = (R, TRUE, FALSE) => {
    const nT = R.pick([1, 2, 2, 3]);
    return R.shuffle(R.pickN(TRUE, nT).map(x => [x, true]).concat(R.pickN(FALSE, 3 - nT).map(x => [x, false])));
  };
  const romanWhy = st => st.map((x, i) => `${['I', 'II', 'III'][i]}: ${x[1] ? 'true' : 'false'}.`).join(' ');
  const num = (R, c, w, unit, o) =>
    GRE.numeric(R, c, w.filter(x => x != null && isFinite(x)), Object.assign(unit ? { unit } : {}, o || {}));

  /** choices built from numbers with a formatter (string or null), ordered by value */
  function mcv(R, c, wrongs, fmt, opts) {
    const val = new Map();
    const f = x => {
      const s = fmt(x);
      if (s != null && !val.has(GRE.norm(s))) val.set(GRE.norm(s), x);
      return s;
    };
    const cs = f(c);
    if (cs == null) throw new Error('mcv: answer cannot be formatted');
    const ws = [];
    for (const x of wrongs) {
      if (x == null || !isFinite(x) || Math.abs(x - c) <= 1e-9 * Math.max(1, Math.abs(c))) continue;
      const s = f(x);
      if (s != null) ws.push(s);
    }
    return GRE.mc(R, cs, ws, Object.assign({ rank: s => val.get(GRE.norm(s)) }, opts || {}));
  }
  /** numeric coefficient times a symbol: (1.5, 'mg') -> "\frac{3}{2}mg" */
  const coefTex = (x, body) => {
    if (x === 0) return '0';
    const e = ex(x);
    if (e == null) return null;
    return e === '1' ? body : e === '-1' ? '-' + body : e + body;
  };
  const cf = body => x => { const t = coefTex(x, body); return t == null ? null : `$${t}$`; };
  const mult = x => (Math.abs(x - 1) < 1e-12 ? 'is unchanged' : `is multiplied by $${ex(x)}$`);
  const fac = x => { const e = ex(x); return e == null ? null : `$${e}$`; };
  /** \sqrt{\frac{n top}{d bot}} with the rational n/d reduced */
  function sqrtTex(n, d, top, bot) {
    const k = F.gcd(n, d); n /= k; d /= k;
    const T = (n === 1 ? '' : n) + top;
    const B = (d === 1 ? '' : d) + (bot || '');
    return B ? raw`\sqrt{\frac{${T}}{${B}}}` : raw`\sqrt{${T}}`;
  }
  /** powers of k for scaling questions */
  const POW = [-2, -1.5, -1, -0.5, 0, 0.5, 1, 1.5, 2, 3];
  const powWrongs = (k, p) => POW.filter(q => q !== p).map(q => Math.pow(k, q));

  // angles with simple trig values; 37°/53° are always stated through their sines
  const ANG = {
    30: { d: 30, s: 0.5, c: Math.sqrt(3) / 2 },
    37: { d: 37, s: 0.6, c: 0.8 },
    45: { d: 45, s: Math.SQRT1_2, c: Math.SQRT1_2 },
    53: { d: 53, s: 0.8, c: 0.6 },
    60: { d: 60, s: Math.sqrt(3) / 2, c: 0.5 },
  };
  const ALL_ANG = [ANG[30], ANG[37], ANG[45], ANG[53], ANG[60]];
  const angs = list => list.map(d => ANG[d]);
  const isTheta = a => a.d === 37 || a.d === 53;
  const atAng = (a, rel) => (isTheta(a)
    ? raw`at an angle $\theta$ ${rel}, where $\sin\theta = ${a.s}$ and $\cos\theta = ${a.c}$`
    : raw`at $${a.d}^\circ$ ${rel}`);
  const sinT = a => (isTheta(a) ? raw`\sin\theta` : raw`\sin ${a.d}^\circ`);
  const cosT = a => (isTheta(a) ? raw`\cos\theta` : raw`\cos ${a.d}^\circ`);
  const tri = x => F.num(x, 3);

  // round objects: I = b M R^2 (b as a fraction)
  const ROLLERS = [
    { name: 'thin hoop', b: [1, 1] },
    { name: 'uniform solid cylinder', b: [1, 2] },
    { name: 'uniform solid sphere', b: [2, 5] },
    { name: 'thin spherical shell', b: [2, 3] },
  ];
  const bval = o => o.b[0] / o.b[1];
  const Itex = o => raw`$I = ${coefTex(bval(o), 'MR^2')}$`;
  const SHORT = { 'thin hoop': 'hoop', 'uniform solid cylinder': 'solid cylinder', 'uniform solid sphere': 'solid sphere', 'thin spherical shell': 'spherical shell' };

  /** "$\sqrt{\frac{p}{q}}$" style choice for a positive number whose square is rational */
  const sqrtRatio = x => {
    const r = F.toRational(x * x, 1000);
    if (!r) return null;
    const [p, q] = r;
    const [a, b] = F.surdParts(p), [c, d] = F.surdParts(q);
    if (b === 1 && d === 1) return `$${F.frac(a, c)}$`;
    return q === 1 ? raw`$\sqrt{${p}}$` : raw`$\sqrt{\frac{${p}}{${q}}}$`;
  };
  /** TeX for c·sym·x^p (c rational, p integer), e.g. (-3,2,'\alpha') -> "-3\alpha x^{2}", (2,-3) -> "\frac{2\alpha}{x^{3}}" */
  function mono(c, p, sym) {
    if (c === 0) return '0';
    const r = F.toRational(Math.abs(c), 64);
    const [nn, dd] = r;
    const sg = c < 0 ? '-' : '';
    const xs = q => (q === 1 ? 'x' : `x^{${q}}`);
    const lead = (nn === 1 ? '' : nn) + sym;
    if (p === 0) return sg + (dd === 1 ? lead : raw`\frac{${lead}}{${dd}}`);
    if (p > 0) return sg + (dd === 1 ? lead + ' ' + xs(p) : raw`\frac{${lead} ${xs(p)}}{${dd}}`);
    return sg + raw`\frac{${lead}}{${dd === 1 ? '' : dd}${xs(-p)}}`;
  }

  // ------------------------------------------------------------------ figures
  const FIG_RAMP_PULLEY = (() => {
    const c30 = Math.cos(Math.PI / 6);
    const B0 = [20, 130], u = [c30, -0.5], n = [-0.5, -c30];
    const topY = 130 - 180 * Math.tan(Math.PI / 6);
    const C = [207, 20], r = 7;
    const T = [C[0] + r * n[0], C[1] + r * n[1]];
    const off = n[0] * (T[0] - B0[0]) + n[1] * (T[1] - B0[1]); // string height above the slope
    const X = B0[0] + 95 * u[0], Y = B0[1] + 95 * u[1];
    const S = [X + 13 * u[0] + off * n[0], Y + 13 * u[1] + off * n[1]];
    const f = v => v.toFixed(1);
    return '<svg viewBox="0 0 260 145" width="260" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="1.5">' +
      `<path d="M${B0[0]} ${B0[1]} H200 V${f(topY)} Z"/>` +
      `<line x1="200" y1="${f(topY)}" x2="${C[0]}" y2="${C[1]}"/>` +
      `<circle cx="${C[0]}" cy="${C[1]}" r="${r}"/>` +
      `<g transform="translate(${f(X)},${f(Y)}) rotate(-30)"><rect x="-13" y="${f(-2 * off)}" width="26" height="${f(2 * off)}"/></g>` +
      `<line x1="${f(S[0])}" y1="${f(S[1])}" x2="${f(T[0])}" y2="${f(T[1])}"/>` +
      `<line x1="${C[0] + r}" y1="${C[1]}" x2="${C[0] + r}" y2="80"/>` +
      `<rect x="${C[0] + r - 11}" y="80" width="22" height="22"/>` +
      `<path d="M52 130 A32 32 0 0 0 ${f(20 + 32 * u[0])} ${f(130 + 32 * u[1])}"/>` +
      '<g fill="currentColor" stroke="none" font-size="13" font-style="italic">' +
      '<text x="58" y="126">θ</text>' +
      `<text x="${f(X - 24)}" y="${f(Y - 24)}">m<tspan font-size="9" dy="3">1</tspan></text>` +
      `<text x="${C[0] + r + 15}" y="96">m<tspan font-size="9" dy="3">2</tspan></text></g></svg>`;
  })();

  /** force-vs-position graph: rises linearly to F0 at x=a, flat to x=b, falls to 0 at x=c */
  function figForce(F0, a, b, c) {
    const sx = 220 / c, X = x => (30 + x * sx).toFixed(1), Y0 = 110, Y1 = 30;
    return '<svg viewBox="0 0 280 135" width="280" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="1.5">' +
      `<path d="M30 ${Y0} H265 M30 ${Y0} V15"/>` +
      `<path d="M${X(0)} ${Y0} L${X(a)} ${Y1} L${X(b)} ${Y1} L${X(c)} ${Y0}" stroke-width="2"/>` +
      `<path d="M${X(a)} ${Y1} V${Y0} M${X(b)} ${Y1} V${Y0} M30 ${Y1} H${X(a)}" stroke-dasharray="3 3" stroke-width="1"/>` +
      '<g fill="currentColor" stroke="none" font-size="11">' +
      `<text x="${X(a)}" y="124" text-anchor="middle">${a}</text>` +
      `<text x="${X(b)}" y="124" text-anchor="middle">${b}</text>` +
      `<text x="${X(c)}" y="124" text-anchor="middle">${c}</text>` +
      `<text x="26" y="${Y1 + 4}" text-anchor="end">${F0}</text>` +
      '<text x="26" y="124" text-anchor="end">0</text>' +
      '<text x="268" y="114">x (m)</text><text x="34" y="12">F (N)</text></g></svg>';
  }

  // "a 8 kg" -> "an 8 kg" (also "a $80\,\text{kg}$"), applied to every generated stem
  const fixArticles = t => t.replace(/\b([Aa]) (\$?)(8|11|18|8\d|8\d\d|8\d\d\d|8\.\d+)(?=[\s\\,.])/g, '$1n $2$3');
  const TEMPLATES = [
    // ================================================================= 1.1 Block problems
    {
      id: 'mech.ramp.slide', sec: '1.1.1', level: 2, weight: 2,
      gen(R) {
        const a = R.pick(ALL_ANG);
        const s = a.s, c = a.c;
        const m = R.pick([1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 25]);
        const obj = R.pick(['block', 'crate', 'box', 'sled', 'package', 'trunk']);
        const ramp = `a ramp inclined ${atAng(a, 'to the horizontal')}`;
        const kind = R.pick(['down', 'down', 'time', 'up', 'up', 'push', 'hold']);
        const MU = [0.1, 0.15, 0.2, 0.25, 0.3, 0.4, 0.5];
        if (kind === 'down' || kind === 'time') {
          const mu = R.pick(MU.filter(x => s - x * c >= 0.15));
          const acc = g * (s - mu * c);
          const how = raw`Along the ramp, $ma = mg${sinT(a)} - \mu_k mg${cosT(a)}$, so $a = g(${sinT(a)} - \mu_k${cosT(a)}) \approx ${N2(acc)}\,\text{m/s}^2$`;
          if (kind === 'down') {
            return {
              q: raw`A ${m} kg ${obj} is released from rest on ${ramp}. The coefficient of kinetic friction between the ${obj} and the ramp is $\mu_k = ${mu}$. ${ask(acc)} the magnitude of the ${obj}’s acceleration? ${USE_G}`,
              ...num(R, acc, [g * (s + mu * c), g * s, g * (c - mu * s), g * (s - mu), mu * g * c], MS2),
              expl: `${how}; the mass cancels. Adding the friction term instead of subtracting it, or swapping sine and cosine, are the usual slips.`,
            };
          }
          const L = R.pick([2, 2.5, 3, 4, 5, 6, 8, 10, 12, 16, 20]);
          const t = Math.sqrt(2 * L / acc);
          return {
            q: raw`A ${obj} is released from rest at the top of ${ramp}; the sloping surface is $${L}\,\text{m}$ long. The coefficient of kinetic friction is $\mu_k = ${mu}$. ${ask(t)} the time the ${obj} takes to reach the bottom? ${USE_G}`,
            ...num(R, t, [Math.sqrt(2 * L / (g * s)), Math.sqrt(L / acc), Math.sqrt(2 * L / (g * (s + mu * c))), Math.sqrt(2 * L / g)], raw`\text{s}`),
            expl: raw`${how}. Starting from rest with constant acceleration, $L = \tfrac12 at^2$, so $t = \sqrt{2L/a} \approx ${N2(t)}\,\text{s}$. A question about time calls for kinematics rather than energy.`,
          };
        }
        if (kind === 'up') {
          const mu = R.pick(MU);
          const v0 = R.pick([2, 3, 4, 5, 6, 8, 10, 12]);
          const dec = g * (s + mu * c), d = v0 * v0 / (2 * dec);
          return {
            q: raw`A ${obj} is launched up ${ramp}, starting with speed $${v0}\,\text{m/s}$ along the incline. The coefficient of kinetic friction is $\mu_k = ${mu}$. ${ask(d)} the distance the ${obj} travels up the ramp before it momentarily stops? ${USE_G}`,
            ...num(R, d, [s - mu * c > 0.05 ? v0 * v0 / (2 * g * (s - mu * c)) : null, v0 * v0 / (2 * g * s), v0 * v0 / dec, v0 * v0 / (2 * g * (c + mu * s))], raw`\text{m}`),
            expl: raw`On the way up, gravity and kinetic friction both point down the slope: $a = g(${sinT(a)} + \mu_k${cosT(a)}) \approx ${N2(dec)}\,\text{m/s}^2$. Then $v_0^2 = 2ad$ gives $d = v_0^2/2a \approx ${N2(d)}\,\text{m}$. Friction opposes the upward motion, so it adds to gravity here.`,
          };
        }
        if (kind === 'push') {
          const mu = R.pick(MU);
          const P = m * g * (s + mu * c);
          return {
            q: raw`A worker pushes a ${m} kg ${obj} up ${ramp}. The push is parallel to the ramp surface, and the ${obj} moves at constant speed. The coefficient of kinetic friction is $\mu_k = ${mu}$. ${ask(P)} the magnitude of the push? ${USE_G}`,
            ...num(R, P, [m * g * (s - mu * c), m * g * s, m * g * (c + mu * s), mu * m * g * c, m * g * (s + mu)], raw`\text{N}`),
            expl: raw`Constant speed means zero net force. The gravity component $mg${sinT(a)}$ and kinetic friction $\mu_k mg${cosT(a)}$ both point down the slope, so $F = mg(${sinT(a)} + \mu_k${cosT(a)}) \approx ${N2(P)}\,\text{N}$.`,
          };
        }
        const mu = R.pick(MU.filter(x => s - x * c >= 0.15));
        const P = m * g * (s - mu * c);
        return {
          q: raw`A ${m} kg ${obj} is placed on ${ramp}. The coefficient of static friction, $\mu_s = ${mu}$, is too small for friction alone to hold it. ${ask(P)} the minimum force, applied parallel to the ramp and directed up the slope, that keeps the ${obj} at rest? ${USE_G}`,
          ...num(R, P, [m * g * (s + mu * c), m * g * s, m * g * (c - mu * s), mu * m * g * c, m * g * (s - mu)], raw`\text{N}`),
          expl: raw`With the smallest push the ${obj} is on the verge of sliding down, so static friction is at its maximum $\mu_s mg${cosT(a)}$ and points up the slope, helping the push: $F = mg(${sinT(a)} - \mu_s${cosT(a)}) \approx ${N2(P)}\,\text{N}$.`,
        };
      },
    },
    {
      id: 'mech.ramp.static', sec: '1.1.1', level: 1,
      gen(R) {
        const kind = R.pick(['fric', 'fric', 'fric', 'normal', 'contact', 'contact', 'crit', 'const']);
        const obj = R.pick(['block', 'crate', 'box', 'book', 'brick', 'suitcase']);
        if (kind === 'crit') {
          const how = R.pick([
            raw`The angle $\theta$ of the board is slowly increased from zero. At what angle does the ${obj} begin to slide?`,
            raw`What is the largest angle $\theta$ of the board for which the ${obj} can remain at rest?`,
            raw`One end of the board is slowly raised. At what angle $\theta$ with the horizontal does the ${obj} start to move?`,
          ]);
          return {
            level: 1,
            q: raw`A ${obj} rests on a flat board whose tilt can be adjusted. The coefficients of static and kinetic friction between the ${obj} and the board are $\mu_s$ and $\mu_k$, with $\mu_k < \mu_s$. ${how}`,
            ...GRE.mc(R, raw`$\tan^{-1}\mu_s$`, [raw`$\tan^{-1}\mu_k$`, raw`$\sin^{-1}\mu_s$`, raw`$\cos^{-1}\mu_s$`, raw`$\tan^{-1}(1/\mu_s)$`, raw`$\sin^{-1}\mu_k$`, raw`$\tan^{-1}(\mu_s - \mu_k)$`]),
            expl: raw`On the verge of slipping, $mg\sin\theta = \mu_s mg\cos\theta$, so $\tan\theta = \mu_s$. Static, not kinetic, friction decides when sliding starts. Check: $\mu_s \to 0$ gives $\theta \to 0$.`,
          };
        }
        if (kind === 'const') {
          const a = R.pick(angs([30, 37, 45]));
          const mk = a.s / a.c;
          return {
            level: 1,
            q: raw`After a small nudge, a ${obj} slides down a ramp inclined ${atAng(a, 'to the horizontal')}, moving at constant speed. ${ask(mk)} the coefficient of kinetic friction between the ${obj} and the ramp?`,
            ...num(R, mk, [a.s, a.c, a.c / a.s, 1 - a.c, a.s * a.c]),
            expl: raw`Constant velocity means zero net force: $\mu_k mg\cos\theta = mg\sin\theta$, so $\mu_k = \tan\theta \approx ${N2(mk)}$.`,
          };
        }
        const a = R.pick(angs([30, 37, 45]));
        const tan = a.s / a.c;
        const mus = R.pick([0.6, 0.7, 0.75, 0.8, 0.9, 1.0, 1.1, 1.2].filter(x => x >= tan + 0.05));
        const m = R.pick([1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20]);
        const setup = raw`A ${m} kg ${obj} rests motionless on a ramp inclined ${atAng(a, 'to the horizontal')}. The coefficient of static friction between the ${obj} and the ramp is $\mu_s = ${mus}$.`;
        if (kind === 'fric') {
          const f = m * g * a.s;
          return {
            q: raw`${setup} ${ask(f)} the magnitude of the static friction force on the ${obj}? ${USE_G}`,
            ...num(R, f, [mus * m * g * a.c, m * g * a.c, mus * m * g, m * g], raw`\text{N}`),
            expl: raw`The ${obj} is in equilibrium, so static friction just balances the component of gravity along the ramp: $f = mg${sinT(a)} \approx ${N2(f)}\,\text{N}$. The value $\mu_s N = ${N2(mus * m * g * a.c)}\,\text{N}$ is only the maximum static friction available — the classic trap.`,
          };
        }
        if (kind === 'normal') {
          const Nn = m * g * a.c;
          return {
            q: raw`${setup} ${ask(Nn)} the magnitude of the normal force exerted by the ramp on the ${obj}? ${USE_G}`,
            ...num(R, Nn, [m * g * a.s, m * g, m * g / a.c, mus * m * g * a.c], raw`\text{N}`),
            expl: raw`Perpendicular to the ramp there is no acceleration, so $N = mg${cosT(a)} \approx ${N2(Nn)}\,\text{N}$. Limiting cases fix the trig function: a flat ramp ($\theta = 0$) gives $N = mg$.`,
          };
        }
        const W = m * g;
        return {
          q: raw`${setup} What is the magnitude of the total force (normal force plus friction) that the ramp exerts on the ${obj}? ${USE_G}`,
          ...num(R, W, [m * g * a.c, m * g * a.s, mus * m * g * a.c, m * g * (a.s + a.c)], raw`\text{N}`),
          expl: raw`The ${obj} is in equilibrium under just two agents, gravity and the ramp, so the ramp’s total force must be equal and opposite to the weight: $mg = ${W}\,\text{N}$, straight up. (Indeed $\sqrt{(mg\cos\theta)^2 + (mg\sin\theta)^2} = mg$.)`,
        };
      },
    },
    {
      id: 'mech.ramp.pulley', sec: '1.1.1', level: 2,
      gen(R) {
        const a = R.pick(angs([30, 37, 53]));
        const s = a.s, c = a.c;
        const kind = R.pick(['acc', 'acc', 'ten', 'eq', 'max']);
        const m1 = R.int(1, 12);
        const intro = raw`In the figure, a block of mass $m_1 = ${m1}\,\text{kg}$ sits on a ramp inclined ${atAng(a, 'to the horizontal')}. A light string runs from the block, parallel to the ramp, over a massless frictionless pulley at the top to a hanging block of mass $m_2$`;
        if (kind === 'eq' || kind === 'max') {
          if (kind === 'eq') {
            const m2 = m1 * s;
            return {
              fig: FIG_RAMP_PULLEY,
              q: raw`${intro}. The ramp is frictionless. For what value of $m_2$ does the system remain at rest?`,
              ...num(R, m2, [m1 * c, m1, m1 * s / c, m1 / s, m1 * s / 2], raw`\text{kg}`),
              expl: raw`Equilibrium requires the string tension $m_2 g$ to balance the component of the first block’s weight along the ramp, $m_1 g${sinT(a)}$. So $m_2 = m_1${sinT(a)} \approx ${N2(m2)}\,\text{kg}$.`,
            };
          }
          const mu = R.pick([0.1, 0.2, 0.25, 0.3, 0.4, 0.5]);
          const m2 = m1 * (s + mu * c);
          return {
            level: 3, fig: FIG_RAMP_PULLEY,
            q: raw`${intro}. The coefficient of static friction between $m_1$ and the ramp is $\mu_s = ${mu}$. ${ask(m2)} the largest $m_2$ for which the system stays at rest?`,
            ...num(R, m2, [m1 * (s - mu * c), m1 * s, m1 * (c + mu * s), m1 * mu * c, m1 * (s + mu)], raw`\text{kg}`),
            expl: raw`For the largest $m_2$, block 1 is about to slide up the ramp, so maximum static friction $\mu_s m_1 g${cosT(a)}$ points down the slope along with $m_1 g${sinT(a)}$: $m_2 = m_1(${sinT(a)} + \mu_s${cosT(a)}) \approx ${N2(m2)}\,\text{kg}$.`,
          };
        }
        let m2 = R.int(1, 12);
        if (Math.abs(m2 - m1 * s) < 0.5) m2 += 2;
        const M = m1 + m2;
        const setup = raw`${intro.replace(/\$m_2\$$/, raw`$m_2 = ${m2}\,\text{kg}$`)}. The ramp is frictionless and the system is released from rest.`;
        if (kind === 'acc') {
          const acc = g * Math.abs(m2 - m1 * s) / M;
          return {
            fig: FIG_RAMP_PULLEY,
            q: raw`${setup} ${ask(acc)} the magnitude of the acceleration of the blocks? ${USE_G}`,
            ...num(R, acc, [g * Math.abs(m2 - m1 * c) / M, g * (m2 + m1 * s) / M, g * Math.abs(m2 - m1 * s) / m2, g * Math.abs(m2 - m1 * s) / m1, g * m2 / M], MS2),
            expl: raw`Treat the two blocks as one system moving along the string. The driving force is $|m_2 g - m_1 g${sinT(a)}| = ${N2(g * Math.abs(m2 - m1 * s), 3)}\,\text{N}$ and the total mass is $m_1 + m_2 = ${M}\,\text{kg}$, so $a \approx ${N2(acc)}\,\text{m/s}^2$ (block ${m2 > m1 * s ? '2 descends' : '1 slides down the ramp'}).`,
          };
        }
        const T = m1 * m2 * g * (1 + s) / M;
        return {
          level: 3, fig: FIG_RAMP_PULLEY,
          q: raw`${setup} ${ask(T)} the tension in the string while the blocks move? ${USE_G}`,
          ...num(R, T, [m2 * g, m1 * g * s, m1 * m2 * g / M, 2 * m1 * m2 * g / M, m1 * m2 * g * (1 + c) / M], raw`\text{N}`),
          expl: raw`From the system, $a = g(m_2 - m_1${sinT(a)})/(m_1 + m_2)$; then for the hanging block $T = m_2(g - a) = \dfrac{m_1 m_2 g(1 + ${sinT(a)})}{m_1 + m_2} \approx ${N2(T)}\,\text{N}$. The tension is not $m_2 g$, because the hanging block accelerates.`,
        };
      },
    },
    {
      id: 'mech.hang.chain', sec: '1.1.2', level: 1,
      gen(R) {
        const ms = [R.int(1, 9), R.int(1, 9), R.int(1, 9)];
        const [mA, mB, mC] = ms;
        const tot = sum(ms);
        const below = k => sum(ms.slice(k - 1)); // string k supports blocks k..3
        const kind = R.pick(['static', 'static', 'accel', 'accel', 'space', 'ratio', 'fall']);
        const desc = raw`Three blocks are connected in a vertical chain by massless strings: string 1 runs from the ceiling to block A ($${mA}\,\text{kg}$), string 2 from A to block B ($${mB}\,\text{kg}$), and string 3 from B to block C ($${mC}\,\text{kg}$).`;
        if (kind === 'static') {
          const k = R.int(1, 3), T = below(k) * g;
          return {
            q: raw`${desc} The blocks hang at rest. What is the tension in string ${k}? ${USE_G}`,
            ...num(R, T, [ms[k - 1] * g, tot * g, (tot - below(k) + ms[k - 1]) * g, mC * g, mA * g], raw`\text{N}`),
            expl: raw`Each string supports the weight of everything hanging below it. String ${k} holds ${k === 1 ? 'A, B, and C' : k === 2 ? 'B and C' : 'only C'}: $T_${k} = ${below(k)}\,\text{kg}\times 10\,\text{m/s}^2 = ${T}\,\text{N}$.`,
          };
        }
        if (kind === 'accel') {
          const up = R.bool(0.6), acc = R.pick([1, 2, 2.5, 3, 4, 5]);
          const k = R.int(1, 3), T = below(k) * (g + (up ? acc : -acc));
          return {
            q: raw`${desc} The ceiling belongs to an elevator whose acceleration is $${acc}\,\text{m/s}^2$ ${up ? 'upward' : 'downward'}, and the blocks accelerate with it. What is the tension in string ${k}? ${USE_G}`,
            ...num(R, T, [below(k) * g, below(k) * (g + (up ? -acc : acc)), tot * (g + (up ? acc : -acc)), below(k) * acc, ms[k - 1] * (g + (up ? acc : -acc))], raw`\text{N}`),
            expl: raw`Apply $F = ma$ to the blocks below string ${k} (total mass $${below(k)}\,\text{kg}$): $T - mg = m a_y$ with $a_y = ${up ? '+' : '-'}${acc}\,\text{m/s}^2$, so $T = m(g ${up ? '+' : '-'} a) = ${N2(T, 3)}\,\text{N}$. Only the acceleration matters, not the direction of the velocity.`,
          };
        }
        if (kind === 'space') {
          const k = R.int(2, 3), Fp = R.pick([12, 18, 20, 24, 30, 36, 40, 45, 48, 60, 72, 90, 120]);
          const T = Fp * below(k) / tot;
          return {
            q: raw`Far from any gravitating body, three blocks A ($${mA}\,\text{kg}$), B ($${mB}\,\text{kg}$), and C ($${mC}\,\text{kg}$) are connected in a line by massless strings: string 2 joins A to B and string 3 joins B to C. A force of $${Fp}\,\text{N}$ pulls on a string attached to A, directed away from B, and the blocks accelerate together. ${ask(T)} the tension in string ${k}?`,
            ...num(R, T, [Fp, Fp * (tot - below(k)) / tot, Fp / 3, Fp * ms[k - 1] / tot, Fp * (k === 2 ? mB : mC) / (mB + mC)], raw`\text{N}`),
            expl: raw`All blocks share $a = F/(m_A + m_B + m_C) = ${N2(Fp / tot, 3)}\,\text{m/s}^2$. String ${k} must accelerate only the mass behind it (${k === 2 ? 'B and C' : 'C'}), so $T_${k} = (${below(k)}\,\text{kg})\,a \approx ${N2(T)}\,\text{N}$.`,
          };
        }
        if (kind === 'ratio') {
          const [i, j] = R.pick([[1, 3], [1, 2], [2, 3]]);
          const r = below(i) / below(j);
          return {
            q: raw`${desc} The blocks hang at rest. What is the ratio $T_${i}/T_${j}$ of the tensions in strings ${i} and ${j}?`,
            ...mcv(R, r, [ms[i - 1] / ms[j - 1], below(j) / below(i), 1, (tot - below(i) + ms[i - 1]) / ms[j - 1], ms[i - 1] / below(j), 2 * r, r / 2, r + 1, j - i + 1], fac),
            expl: raw`String ${i} supports $${below(i)}\,\text{kg}$ and string ${j} supports $${below(j)}\,\text{kg}$, so $T_${i}/T_${j} = ${F.frac(below(i), below(j))}$. A string carries the weight of everything below it, not just the block attached to it.`,
          };
        }
        return {
          q: raw`${desc} String 1 is suddenly cut, and the chain falls freely (air resistance is negligible). While the blocks fall, what are the tensions in strings 2 and 3? ${USE_G}`,
          ...GRE.mc(R, raw`$T_2 = T_3 = 0$`, [
            raw`$T_2 = ${(mB + mC) * g}\,\text{N},\ T_3 = ${mC * g}\,\text{N}$`,
            raw`$T_2 = ${mB * g}\,\text{N},\ T_3 = ${mC * g}\,\text{N}$`,
            raw`$T_2 = ${(mB + mC) * g / 2}\,\text{N},\ T_3 = ${mC * g / 2}\,\text{N}$`,
            raw`$T_2 = 0,\ T_3 = ${mC * g}\,\text{N}$`,
            raw`$T_2 = T_3 = ${tot * g}\,\text{N}$`,
          ]),
          expl: raw`In free fall every block accelerates at $g$ under gravity alone, exactly as the chain would as one rigid object; no string force is needed, so both tensions vanish (check: $T = m(g - a) = 0$ for $a = g$).`,
        };
      },
    },
    {
      id: 'mech.atwood', sec: '1.1.2', level: 2, weight: 2,
      gen(R) {
        const m1 = R.int(1, 10), m2 = R.int(Math.ceil(1.25 * m1 + 1e-9), 2 * m1 + 4);
        const M = m1 + m2;
        const kind = R.pick(['acc', 'acc', 'ten', 'ten', 'support', 'speed', 'sym']);
        const setup = raw`Two blocks, of masses $m_1 = ${m1}\,\text{kg}$ and $m_2 = ${m2}\,\text{kg}$, hang on opposite sides of a massless, frictionless pulley, connected by a light string (an Atwood machine). The system is released from rest.`;
        if (kind === 'acc') {
          const acc = g * (m2 - m1) / M;
          return {
            q: raw`${setup} ${ask(acc)} the magnitude of the acceleration of the blocks? ${USE_G}`,
            ...num(R, acc, [g * (m2 - m1) / m2, g * (m2 - m1) / m1, g * m2 / M, g, g * (m2 - m1) / (2 * M)], MS2),
            expl: raw`The net driving force on the two-block system is $(m_2 - m_1)g$ and the total inertia is $m_1 + m_2$, so $a = \dfrac{m_2 - m_1}{m_1 + m_2}g = \dfrac{${m2 - m1}}{${M}}\times 10 \approx ${N2(acc)}\,\text{m/s}^2$. Limits: equal masses give $a = 0$; $m_1 \to 0$ gives free fall.`,
          };
        }
        if (kind === 'ten') {
          const T = 2 * m1 * m2 * g / M;
          return {
            q: raw`${setup} ${ask(T)} the tension in the string while the blocks move? ${USE_G}`,
            ...num(R, T, [m2 * g, m1 * g, M * g / 2, m1 * m2 * g / M, (m2 - m1) * g], raw`\text{N}`),
            expl: raw`With $a = (m_2 - m_1)g/(m_1 + m_2)$, the lighter block gives $T = m_1(g + a) = \dfrac{2m_1 m_2 g}{m_1 + m_2} \approx ${N2(T)}\,\text{N}$. The tension lies between $m_1 g$ and $m_2 g$, as it must.`,
          };
        }
        if (kind === 'support') {
          if (m2 / m1 < 1.5) throw new Error('need distinct masses');
          const P = 4 * m1 * m2 * g / M;
          return {
            level: 3,
            q: raw`${setup} The pulley hangs from the ceiling by a short rod. ${ask(P)} the force the rod exerts on the pulley while the blocks move? ${USE_G}`,
            ...num(R, P, [M * g, 2 * m1 * m2 * g / M, (m2 - m1) * g, 2 * m2 * g, M * g / 2], raw`\text{N}`),
            expl: raw`The massless pulley is pulled down by the string on both sides, so the rod supplies $2T = \dfrac{4m_1m_2 g}{m_1 + m_2} \approx ${N2(P)}\,\text{N}$. This is less than the total weight $(m_1 + m_2)g = ${M * g}\,\text{N}$ because the system’s center of mass accelerates downward.`,
          };
        }
        if (kind === 'speed') {
          const h = R.pick([0.5, 1, 1.5, 2, 2.5, 3, 4, 5]);
          const v = Math.sqrt(2 * g * h * (m2 - m1) / M);
          return {
            q: raw`${setup} ${ask(v)} the speed of the blocks after the heavier block has descended $${h}\,\text{m}$? ${USE_G}`,
            ...num(R, v, [Math.sqrt(2 * g * h), Math.sqrt(2 * g * h * (m2 - m1) / m2), Math.sqrt(g * h * (m2 - m1) / M), Math.sqrt(2 * g * h * m2 / M)], raw`\text{m/s}`),
            expl: raw`Energy: $(m_2 - m_1)gh = \tfrac12(m_1 + m_2)v^2$, so $v = \sqrt{2gh(m_2 - m_1)/(m_1 + m_2)} \approx ${N2(v)}\,\text{m/s}$. Both blocks move, so both carry kinetic energy.`,
          };
        }
        const k = R.int(2, 9);
        return {
          q: raw`In an Atwood machine (ideal pulley and string), one hanging block has ${k === 2 ? 'twice' : k === 3 ? 'three times' : k + ' times'} the mass of the other. What is the magnitude of the acceleration of the blocks?`,
          ...mcv(R, (k - 1) / (k + 1), [(k - 1) / k, k / (k + 1), 1 / (k + 1), 2 / (k + 1), 1, (k - 1) / (2 * (k + 1)), 1 / k], cf('g')),
          expl: raw`$a = \dfrac{m_2 - m_1}{m_1 + m_2}g = \dfrac{${k} - 1}{${k} + 1}g = ${coefTex((k - 1) / (k + 1), 'g')}$. Check the limits: equal masses give $0$, and an infinitely heavy block gives $g$.`,
        };
      },
    },
    {
      id: 'mech.table.pulley', sec: '1.1.2', level: 2,
      gen(R) {
        const kind = R.pick(['acc', 'acc', 'ten', 'const', 'compare']);
        const M = R.int(2, 12), m = kind === 'const' ? R.int(1, M - 1) : R.int(1, 10);
        const intro = raw`A block of mass $M = ${M}\,\text{kg}$ on a horizontal table is connected by a light string, passing over a massless frictionless pulley at the table’s edge, to a hanging block of mass $m = ${m}\,\text{kg}$.`;
        if (kind === 'const') {
          const mu = m / M;
          return {
            q: raw`${intro} After a brief push, the blocks move at constant speed. ${ask(mu)} the coefficient of kinetic friction between block $M$ and the table?`,
            ...num(R, mu, [M / m, m / (M + m), (M - m) / M, M / (M + m)]),
            expl: raw`Constant speed means zero net force on the system: $mg = \mu_k Mg$, so $\mu_k = m/M = ${F.frac(m, M)} \approx ${N2(mu)}$.`,
          };
        }
        if (kind === 'compare') {
          const r = (M + m) / M;
          return {
            level: 3,
            q: raw`${intro} The table is frictionless. The hanging block is then removed, and the string is instead pulled straight down with a constant force equal to the hanging block’s weight, $${m * g}\,\text{N}$. By what factor does the acceleration of block $M$ change?`,
            ...mcv(R, r, [1, M / (M + m), m / M, (M + m) / m, M / m, (M + 2 * m) / M, r * r, (M + m) / (2 * M)], fac),
            expl: raw`With the hanging block, the force $mg$ accelerates both masses: $a_1 = mg/(M + m)$. With a direct pull it accelerates only $M$: $a_2 = mg/M$. So $a_2/a_1 = (M + m)/M = ${F.frac(M + m, M)}$. The tension equals $mg$ only when the hanging block does not accelerate.`,
          };
        }
        const mu = R.pick([0, 0, 0.1, 0.2, 0.25, 0.3, 0.4, 0.5].filter(x => m - x * M >= 0.5));
        const fr = mu ? raw` The coefficient of kinetic friction between block $M$ and the table is $\mu_k = ${mu}$.` : ' The table is frictionless.';
        const acc = g * (m - mu * M) / (M + m);
        if (kind === 'acc') {
          return {
            q: raw`${intro}${fr} The blocks are released and begin to move. ${ask(acc)} their acceleration? ${USE_G}`,
            ...num(R, acc, [g * (m - mu * M) / m, g * m / (M + m), g * (m + mu * M) / (M + m), g * (m - mu * M) / M, g * (m - mu * m) / (M + m)], MS2),
            expl: raw`For the system, the net force along the string is $mg - \mu_k Mg$ and the total mass is $M + m$: $a = \dfrac{(m - \mu_k M)g}{M + m} \approx ${N2(acc)}\,\text{m/s}^2$.`,
          };
        }
        const T = M * m * g * (1 + mu) / (M + m);
        return {
          q: raw`${intro}${fr} The blocks are released and begin to move. ${ask(T)} the tension in the string? ${USE_G}`,
          ...num(R, T, [m * g, M * m * g / (M + m) * (mu ? 1 : 2), mu * M * g, m * g * (1 + mu) / 2, M * acc], raw`\text{N}`),
          expl: raw`The system accelerates at $a = (m - \mu_k M)g/(M + m) \approx ${N2(acc, 3)}\,\text{m/s}^2$. For the hanging block, $T = m(g - a) = \dfrac{Mmg(1 + \mu_k)}{M + m} \approx ${N2(T)}\,\text{N}$ — less than $mg$, since that block accelerates downward.`,
        };
      },
    },
    {
      id: 'mech.elevator', sec: '1.1.2', level: 1,
      gen(R) {
        const m = R.pick([45, 50, 55, 60, 65, 70, 75, 80, 90]);
        const kind = R.pick(['read', 'read', 'read', 'acc', 'cable', 'free']);
        const MOT = [
          ['moving upward and speeding up', 1], ['moving downward and slowing down', 1],
          ['moving upward and slowing down', -1], ['moving downward and speeding up', -1],
          ['at rest and just beginning to move upward', 1], ['at rest and just beginning to move downward', -1],
        ];
        const who = R.pick(['student', 'passenger', 'physicist', 'child']);
        if (kind === 'read' || kind === 'cable') {
          const [mot, dir] = R.pick(MOT);
          const acc = R.pick([1, 1.5, 2, 2.5, 3, 4, 5]);
          if (kind === 'read') {
            const Nn = m * (g + dir * acc);
            return {
              q: raw`A ${m} kg ${who} stands on a bathroom scale (calibrated in newtons) in an elevator. The elevator is ${mot}, with an acceleration of magnitude $${acc}\,\text{m/s}^2$. What does the scale read? ${USE_G}`,
              ...num(R, Nn, [m * (g - dir * acc), m * g, m * acc, m * (g + 2 * dir * acc)], raw`\text{N}`, { sig: 3, tol: 0.06 }),
              expl: raw`The acceleration points ${dir > 0 ? 'up' : 'down'} (${mot}), so $N - mg = m a_y$ gives $N = m(g ${dir > 0 ? '+' : '-'} a) = ${N2(Nn, 3)}\,\text{N}$. Only the direction of the acceleration matters, not the direction of motion.`,
            };
          }
          const Mc = R.pick([800, 1000, 1200, 1500, 1600, 2000, 2500]);
          const T = Mc * (g + dir * acc);
          return {
            q: raw`An elevator car and its passengers have a total mass of $${Mc}\,\text{kg}$. The car is ${mot}, with an acceleration of magnitude $${acc}\,\text{m/s}^2$. What is the tension in the supporting cable? ${USE_G}`,
            ...num(R, T, [Mc * (g - dir * acc), Mc * g, Mc * acc, Mc * (g + 2 * dir * acc)], raw`\text{N}`, { sig: 3, tol: 0.06 }),
            expl: raw`Newton’s second law for the car: $T - Mg = Ma_y$, with $a_y = ${dir > 0 ? '+' : '-'}${acc}\,\text{m/s}^2$. So $T = M(g ${dir > 0 ? '+' : '-'} a) = ${N2(T, 3)}\,\text{N}$.`,
          };
        }
        if (kind === 'acc') {
          const acc = R.pick([1, 2, 3, 4, 5]), dir = R.sign();
          const Nn = m * (g + dir * acc);
          const st = (x, d) => raw`$${x}\,\text{m/s}^2$, ${d}`;
          return {
            q: raw`A ${m} kg ${who} stands on a scale in an elevator. At a certain moment the scale reads $${Nn}\,\text{N}$. What is the elevator’s acceleration at that moment? ${USE_G}`,
            ...GRE.mc(R, st(acc, dir > 0 ? 'upward' : 'downward'), [
              st(acc, dir > 0 ? 'downward' : 'upward'),
              st(N2(Nn / m, 3), dir > 0 ? 'upward' : 'downward'),
              st(N2(Nn / m, 3), dir > 0 ? 'downward' : 'upward'),
              'zero, since the elevator moves at constant speed',
              st(g, 'downward'),
              'It cannot be found without knowing the direction of motion.',
            ]),
            expl: raw`$N - mg = ma_y$ gives $a_y = N/m - g = ${N2(Nn / m, 3)} - 10 = ${dir * acc}\,\text{m/s}^2$, i.e. $${acc}\,\text{m/s}^2$ ${dir > 0 ? 'upward' : 'downward'}. The elevator could be moving either way; the scale only senses acceleration.`,
          };
        }
        return {
          q: raw`A ${m} kg ${who} stands on a scale in an elevator when the cable snaps. While the elevator falls freely (before any safety brake engages, and with air resistance negligible), what does the scale read? ${USE_G}`,
          ...GRE.mc(R, raw`$0$`, [raw`$${m * g}\,\text{N}$`, raw`$${2 * m * g}\,\text{N}$`, raw`$${m * g / 2}\,\text{N}$`, raw`$${m}\,\text{N}$`, raw`$${m * g + m}\,\text{N}$`], { rank: s => s === '$0$' ? 0 : parseFloat(s.slice(1)) }),
          expl: raw`Person and scale both accelerate at $g$, so $N = m(g - a) = 0$: the ${who} is "weightless" even though gravity still acts.`,
        };
      },
    },
    {
      id: 'mech.contact.push', sec: '1.1.3', level: 1,
      gen(R) {
        const kind = R.pick(['two', 'two', 'three', 'fric', 'swap']);
        const mA = R.int(1, 10), mB = R.int(1, 10);
        if (kind === 'three') {
          const ms = [R.int(1, 8), R.int(1, 8), R.int(1, 8)], tot = sum(ms);
          const Fp = R.pick([12, 15, 18, 20, 24, 30, 36, 40, 45, 48, 60]);
          const j = R.int(1, 2); // contact between block j and j+1
          const ahead = sum(ms.slice(j)), P = Fp * ahead / tot;
          return {
            q: raw`Three blocks with masses $m_1 = ${ms[0]}\,\text{kg}$, $m_2 = ${ms[1]}\,\text{kg}$, and $m_3 = ${ms[2]}\,\text{kg}$ sit in a row, touching, on a frictionless floor. A horizontal force of $${Fp}\,\text{N}$ pushes block 1, which pushes 2, which pushes 3. ${ask(P)} the magnitude of the force that block ${j} exerts on block ${j + 1}?`,
            ...num(R, P, [Fp * ms[j] / tot, Fp, Fp / 3, Fp * ms[j - 1] / tot, Fp * (tot - ahead) / tot], raw`\text{N}`),
            expl: raw`All three share $a = F/(m_1 + m_2 + m_3) = ${N2(Fp / tot, 3)}\,\text{m/s}^2$. The contact force between ${j} and ${j + 1} accelerates everything ahead of it ($${ahead}\,\text{kg}$): $P = (${ahead}\,\text{kg})\,a \approx ${N2(P)}\,\text{N}$.`,
          };
        }
        if (kind === 'swap') {
          if (mA === mB) throw new Error('equal');
          const r = mB / mA;
          return {
            level: 2,
            q: raw`Blocks A ($${mA}\,\text{kg}$) and B ($${mB}\,\text{kg}$) sit side by side, touching, on a frictionless floor. A horizontal force $F$ pushes on A (so that A pushes B), and the contact force between the blocks is $P_1$. The same force $F$ is then applied to B from the other side (so that B pushes A), and the contact force is $P_2$. What is $P_1/P_2$?`,
            ...mcv(R, r, [1 / r, 1, (mA + mB) / mA, (mA + mB) / mB, r * r], fac),
            expl: raw`The contact force must accelerate only the block being pushed: $P_1 = m_B F/(m_A + m_B)$ and $P_2 = m_A F/(m_A + m_B)$. So $P_1/P_2 = m_B/m_A = ${F.frac(mB, mA)}$. Pushing on the heavier block gives the smaller contact force.`,
          };
        }
        const tot = mA + mB;
        if (kind === 'fric') {
          const mu = R.pick([0.1, 0.2, 0.25, 0.3, 0.4, 0.5]);
          const Fp = Math.ceil(mu * tot * g * R.pick([1.5, 2, 2.5, 3]));
          const P = Fp * mB / tot;
          return {
            level: 3,
            q: raw`Blocks A ($${mA}\,\text{kg}$) and B ($${mB}\,\text{kg}$) sit side by side, touching, on a horizontal floor. The coefficient of kinetic friction between each block and the floor is $\mu_k = ${mu}$. A horizontal force of $${Fp}\,\text{N}$ pushes on A, so that A pushes B and both slide. ${ask(P)} the magnitude of the force A exerts on B? ${USE_G}`,
            ...num(R, P, [(Fp - mu * tot * g) * mB / tot, Fp * mB / tot - mu * mB * g, Fp * mB / tot + mu * mB * g, Fp * mA / tot, Fp], raw`\text{N}`),
            expl: raw`$a = F/(m_A + m_B) - \mu_k g$. For B: $P - \mu_k m_B g = m_B a$, so $P = \dfrac{m_B}{m_A + m_B}F \approx ${N2(P)}\,\text{N}$ — the friction terms cancel when both blocks have the same $\mu_k$.`,
          };
        }
        const Fp = R.pick([6, 8, 10, 12, 15, 18, 20, 24, 30, 36, 40, 50, 60]);
        const P = Fp * mB / tot;
        return {
          q: raw`Blocks A ($${mA}\,\text{kg}$) and B ($${mB}\,\text{kg}$) sit side by side, touching, on a frictionless horizontal floor. A horizontal force of $${Fp}\,\text{N}$ pushes on A, so that A pushes B. ${ask(P)} the magnitude of the force that A exerts on B?`,
          ...num(R, P, [Fp * mA / tot, Fp, Fp / 2, Fp * mB / mA, Fp * mA / mB], raw`\text{N}`),
          expl: raw`Both blocks share $a = F/(m_A + m_B) = ${N2(Fp / tot, 3)}\,\text{m/s}^2$. The only horizontal force on B is the contact force, so $P = m_B a = \dfrac{m_B}{m_A + m_B}F \approx ${N2(P)}\,\text{N}$. By Newton’s third law B pushes back on A just as hard.`,
        };
      },
    },
    {
      id: 'mech.contact.stack', sec: '1.1.3', level: 2,
      gen(R) {
        const m = R.int(1, 8), M = R.int(2, 12), mu = R.pick([0.2, 0.25, 0.3, 0.4, 0.5, 0.6, 0.8]);
        const kind = R.pick(['Fbot', 'Ftop', 'Ftop', 'fric', 'slide']);
        const setup = raw`A block of mass $m = ${m}\,\text{kg}$ rests on top of a block of mass $M = ${M}\,\text{kg}$, which sits on a frictionless horizontal floor.`;
        if (kind === 'Fbot') {
          const Fm = mu * (M + m) * g;
          return {
            q: raw`${setup} The coefficient of static friction between the blocks is $\mu_s = ${mu}$. ${ask(Fm)} the largest horizontal force that can be applied to the lower block without the upper block slipping? ${USE_G}`,
            ...num(R, Fm, [mu * m * g, mu * M * g, mu * m * g * (M + m) / M, mu * m * g * M / (M + m)], raw`\text{N}`),
            expl: raw`Friction is the only horizontal force on the top block, so its acceleration is at most $\mu_s g$. Without slipping the blocks move as one mass $M + m$, so $F_{\max} = (M + m)\mu_s g = ${N2(Fm, 3)}\,\text{N}$.`,
          };
        }
        if (kind === 'Ftop') {
          const Fm = mu * m * g * (M + m) / M;
          return {
            q: raw`${setup} The coefficient of static friction between the blocks is $\mu_s = ${mu}$. A horizontal force is applied to the upper block. ${ask(Fm)} the largest such force for which the blocks move together without slipping? ${USE_G}`,
            ...num(R, Fm, [mu * m * g, mu * (M + m) * g, mu * M * g, mu * m * g * M / (M + m)], raw`\text{N}`),
            expl: raw`Now friction must drag the lower block, so the common acceleration is at most $\mu_s mg/M$. For the pair, $F_{\max} = (M + m)\dfrac{\mu_s mg}{M} \approx ${N2(Fm)}\,\text{N}$ — more than $\mu_s mg$, because the lower block moves along with the upper one.`,
          };
        }
        if (kind === 'fric') {
          const Fmax = mu * (M + m) * g;
          const Fp = Math.max(1, Math.round(Fmax * R.pick([0.3, 0.4, 0.5, 0.6, 0.7])));
          const f = m * Fp / (M + m);
          return {
            q: raw`${setup} The coefficient of static friction between the blocks is $\mu_s = ${mu}$. A horizontal force of $${Fp}\,\text{N}$ is applied to the lower block, and the blocks accelerate together. ${ask(f)} the magnitude of the friction force on the upper block? ${USE_G}`,
            ...num(R, f, [mu * m * g, Fp, M * Fp / (M + m), m * Fp / M], raw`\text{N}`),
            expl: raw`The common acceleration is $a = F/(M + m) = ${N2(Fp / (M + m), 3)}\,\text{m/s}^2$, and static friction alone accelerates the top block: $f = ma \approx ${N2(f)}\,\text{N}$. This is less than $\mu_s mg = ${N2(mu * m * g)}\,\text{N}$, so there is no slipping; $\mu_s mg$ is only the ceiling.`,
          };
        }
        const mk = mu;
        const a = mk * m * g / M;
        return {
          q: raw`${setup} A large horizontal force is applied to the upper block, so that it slides across the lower block. The coefficient of kinetic friction between the blocks is $\mu_k = ${mk}$. ${ask(a)} the acceleration of the lower block? ${USE_G}`,
          ...num(R, a, [mk * g, mk * m * g / (M + m), mk * (M + m) * g / M, mk * M * g / m], MS2),
          expl: raw`The only horizontal force on the lower block is kinetic friction from the upper block, $\mu_k mg$, so $a = \mu_k mg/M \approx ${N2(a)}\,\text{m/s}^2$, whatever the size of the applied force.`,
        };
      },
    },
    {
      id: 'mech.contact.wall', sec: '1.1.3', level: 2,
      gen(R) {
        const kind = R.pick(['wall', 'wallf', 'cart', 'acc']);
        const mu = R.pick([0.2, 0.25, 0.4, 0.5, 0.6, 0.8]);
        const m = R.pick([0.5, 1, 1.5, 2, 3, 4, 5]);
        if (kind === 'wall') {
          const Fm = m * g / mu;
          return {
            level: 1,
            q: raw`A $${m}\,\text{kg}$ block is pressed against a vertical wall by a horizontal force. The coefficient of static friction between block and wall is $\mu_s = ${mu}$. ${ask(Fm)} the smallest horizontal force that keeps the block from sliding down? ${USE_G}`,
            ...num(R, Fm, [mu * m * g, m * g, m * g / (2 * mu), m * g * (1 + mu) / mu], raw`\text{N}`),
            expl: raw`The push is the normal force, so the maximum friction is $\mu_s F$. It must hold up the weight: $\mu_s F = mg$, giving $F = mg/\mu_s = ${N2(Fm, 3)}\,\text{N}$.`,
          };
        }
        if (kind === 'wallf') {
          const Fmin = m * g / mu;
          const Fp = Math.ceil(Fmin * R.pick([1.5, 2, 2.5, 3]));
          return {
            level: 2,
            q: raw`A $${m}\,\text{kg}$ block is held at rest against a vertical wall by a horizontal push of $${Fp}\,\text{N}$. The coefficient of static friction between block and wall is $\mu_s = ${mu}$. What is the magnitude of the friction force on the block? ${USE_G}`,
            ...num(R, m * g, [mu * Fp, Fp, mu * m * g, Fp - m * g], raw`\text{N}`),
            expl: raw`The block is in equilibrium, so friction exactly balances the weight: $f = mg = ${N2(m * g)}\,\text{N}$. The quantity $\mu_s F = ${N2(mu * Fp)}\,\text{N}$ is only the maximum available friction.`,
          };
        }
        const M = R.pick([2, 3, 4, 5, 6, 8, 10, 12]);
        if (kind === 'cart') {
          const Fm = (M + m) * g / mu;
          return {
            q: raw`A small block of mass $${m}\,\text{kg}$ is in contact with the vertical front face of a cart of mass $${M}\,\text{kg}$. A horizontal force pushes the back of the cart along a frictionless floor, and the cart’s front face pushes the block ahead of it; nothing else holds the block up. The coefficient of static friction between block and cart is $\mu_s = ${mu}$. ${ask(Fm)} the minimum force for which the block does not slide down? ${USE_G}`,
            ...num(R, Fm, [m * g / mu, M * g / mu, mu * (M + m) * g, (M + m) * g], raw`\text{N}`),
            expl: raw`The normal force on the block is $ma$, so friction can hold it only if $\mu_s ma \ge mg$, i.e. $a \ge g/\mu_s$. The cart and block move together, so $F = (M + m)g/\mu_s = ${N2(Fm, 3)}\,\text{N}$.`,
          };
        }
        const am = g / mu;
        return {
          q: raw`A crate is pressed against the vertical front wall of a truck’s open cargo bed only by the truck’s forward acceleration; its bottom does not touch the floor. The coefficient of static friction between the crate and the wall is $\mu_s = ${mu}$. ${ask(am)} the minimum forward acceleration of the truck for which the crate does not slide down? ${USE_G}`,
          ...num(R, am, [mu * g, g, g / (2 * mu), g * (1 + mu)], MS2),
          expl: raw`The wall supplies the normal force $N = ma$, and friction $\mu_s N$ must balance $mg$: $\mu_s ma \ge mg$, so $a_{\min} = g/\mu_s = ${N2(am)}\,\text{m/s}^2$, independent of the crate’s mass.`,
        };
      },
    },
    // ================================================================= 1.2 Kinematics
    {
      id: 'mech.proj.launch', sec: '1.2', level: 2, weight: 2,
      gen(R) {
        const a = R.pick(ALL_ANG);
        const s = a.s, c = a.c;
        const v0 = R.pick([10, 15, 20, 25, 30, 40, 50]);
        const obj = R.pick(['ball', 'stone', 'golf ball', 'projectile', 'water balloon']);
        const kind = R.pick(['range', 'range', 'height', 'height', 'time', 'top']);
        const stem = raw`A ${obj} is launched from level ground with speed $${v0}\,\text{m/s}$ ${atAng(a, 'above the horizontal')}. Air resistance is negligible.`;
        if (kind === 'range') {
          const Rg = 2 * v0 * v0 * s * c / g;
          return {
            q: raw`${stem} ${ask(Rg)} the horizontal distance it travels before landing? ${USE_G}`,
            ...num(R, Rg, [v0 * v0 * s * c / g, 2 * v0 * v0 * s * s / g, v0 * v0 / g, 2 * v0 * v0 * c * c / g, v0 * v0 * s / g], raw`\text{m}`),
            expl: raw`Time of flight $T = 2v_0\sin\theta/g$; range $R = v_0\cos\theta\,T = \dfrac{2v_0^2\sin\theta\cos\theta}{g} = \dfrac{v_0^2\sin 2\theta}{g} \approx ${N2(Rg)}\,\text{m}$.`,
          };
        }
        if (kind === 'height') {
          const H = v0 * v0 * s * s / (2 * g);
          return {
            q: raw`${stem} ${ask(H)} the maximum height it reaches? ${USE_G}`,
            ...num(R, H, [v0 * v0 * s * s / g, v0 * v0 * c * c / (2 * g), v0 * v0 * s / (2 * g), v0 * v0 / (2 * g)], raw`\text{m}`),
            expl: raw`Only the vertical component matters: $v_y^2 = (v_0\sin\theta)^2 - 2gH = 0$ at the top, so $H = \dfrac{(v_0\sin\theta)^2}{2g} \approx ${N2(H)}\,\text{m}$.`,
          };
        }
        if (kind === 'time') {
          const T = 2 * v0 * s / g;
          return {
            q: raw`${stem} ${ask(T)} the time it spends in the air? ${USE_G}`,
            ...num(R, T, [v0 * s / g, 2 * v0 * c / g, 2 * v0 / g, v0 * c / g], raw`\text{s}`),
            expl: raw`The vertical velocity goes from $+v_0\sin\theta$ to $-v_0\sin\theta$ at rate $g$: $T = 2v_0\sin\theta/g \approx ${N2(T)}\,\text{s}$. (Half of that is the time to the top.)`,
          };
        }
        const vt = v0 * c;
        return {
          level: 1,
          q: raw`${stem} ${ask(vt)} its speed at the highest point of its trajectory?`,
          ...num(R, vt, [v0 * s, v0, v0 * c / 2, v0 * (1 - s)], raw`\text{m/s}`),
          expl: raw`At the top the vertical velocity is zero, but the horizontal component $v_0\cos\theta$ is unchanged throughout the flight: $v = ${N2(vt)}\,\text{m/s}$, not zero.`,
        };
      },
    },
    {
      id: 'mech.proj.cliff', sec: '1.2', level: 1,
      gen(R) {
        const kind = R.pick(['dist', 'dist', 'time', 'speed', 'plane', 'angle']);
        if (kind === 'plane') {
          const t = R.int(4, 10), H = 5 * t * t, u = R.pick([40, 50, 60, 80, 100, 120, 150, 200]);
          const d = u * t;
          return {
            level: 2,
            q: raw`A plane flies horizontally at $${u}\,\text{m/s}$ at an altitude of $${H}\,\text{m}$ above flat ground and releases a supply package. Neglecting air resistance, how far ahead of the target (measured horizontally) must the package be released to land on it? ${USE_G}`,
            ...num(R, d, [u * t / Math.SQRT2, 2 * u * t, u * t / 2, Math.sqrt(u * u + 2 * g * H) * t], raw`\text{m}`),
            expl: raw`The fall time comes from the vertical motion alone: $t = \sqrt{2H/g} = ${t}\,\text{s}$. Meanwhile the package keeps the plane’s horizontal velocity, so it travels $ut = ${d}\,\text{m}$ horizontally.`,
          };
        }
        const t = R.int(1, 6), h = 5 * t * t, v = R.pick([2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 25]);
        const obj = R.pick(['ball rolls off', 'marble rolls off', 'stone is thrown horizontally from']);
        const plat = h <= 20 ? R.pick(['a ledge', 'a balcony', 'a roof']) : R.pick(['a cliff', 'a tower', 'the top of a building']);
        const stem = raw`A ${obj} ${plat} $${h}\,\text{m}$ above level ground with a horizontal speed of $${v}\,\text{m/s}$. Air resistance is negligible.`;
        if (kind === 'dist') {
          return {
            q: raw`${stem} How far from the base does it land? ${USE_G}`,
            ...num(R, v * t, [v * t / Math.SQRT2, 2 * v * t, v * t / 2, Math.sqrt(v * v + 2 * g * h) * t], raw`\text{m}`),
            expl: raw`Fall time from $h = \tfrac12 gt^2$: $t = \sqrt{2h/g} = ${t}\,\text{s}$, independent of the horizontal speed. Horizontal distance $= vt = ${v * t}\,\text{m}$.`,
          };
        }
        if (kind === 'time') {
          return {
            q: raw`${stem} How long is it in the air? ${USE_G}`,
            ...num(R, t, [t / Math.SQRT2, 2 * t, h / v, Math.sqrt(2) * t], raw`\text{s}`),
            expl: raw`Horizontal and vertical motions are independent: $h = \tfrac12 gt^2$ gives $t = \sqrt{2h/g} = ${t}\,\text{s}$, the same as for an object simply dropped.`,
          };
        }
        if (kind === 'speed') {
          const V = Math.sqrt(v * v + 2 * g * h);
          return {
            level: 2,
            q: raw`${stem} ${ask(V)} its speed just before it hits the ground? ${USE_G}`,
            ...num(R, V, [v + Math.sqrt(2 * g * h), Math.sqrt(2 * g * h), v, Math.sqrt(v * v + g * h)], raw`\text{m/s}`),
            expl: raw`Energy conservation (or the components $v_x = ${v}$, $v_y = \sqrt{2gh} = ${g * t}\,\text{m/s}$) gives $v = \sqrt{v_0^2 + 2gh} \approx ${N2(V)}\,\text{m/s}$. Speeds add as vectors, not as numbers.`,
          };
        }
        const tn = g * t / v;
        return {
          level: 2,
          q: raw`${stem} Just before it lands, its velocity makes an angle $\phi$ below the horizontal. ${ask(tn)} $\tan\phi$? ${USE_G}`,
          ...num(R, tn, [v / (g * t), tn / 2, 2 * tn, Math.sqrt(tn)]),
          expl: raw`At impact $v_x = ${v}\,\text{m/s}$ and $v_y = gt = ${g * t}\,\text{m/s}$ (with $t = \sqrt{2h/g} = ${t}\,\text{s}$), so $\tan\phi = v_y/v_x \approx ${N2(tn)}$.`,
        };
      },
    },
    {
      id: 'mech.proj.concepts', sec: '1.2', level: 1,
      gen(R) {
        const kind = R.pick(['scale', 'scale', 'comp', 'roman', 'roman']);
        if (kind === 'roman') {
          const TRUE = [
            'At the highest point, the velocity is horizontal.',
            'At the highest point, the acceleration has magnitude $g$ and points downward.',
            'The horizontal component of velocity is the same at every point of the flight.',
            'The time to rise to the highest point equals the time to fall back to launch height.',
            'It returns to launch height with the same speed it was launched with.',
            'The speed is smallest at the highest point.',
            'The vertical component of velocity changes by the same amount every second.',
            'An observer running horizontally alongside at the launch velocity’s horizontal component sees it move straight up and down.',
          ];
          const FALSE = [
            'At the highest point, the acceleration is zero.',
            'At the highest point, the velocity is zero.',
            'The horizontal component of velocity decreases steadily during the flight.',
            'The acceleration is directed along the velocity at every instant.',
            'A heavier projectile launched with the same velocity lands farther away.',
            'The kinetic energy is zero at the highest point.',
            'The time of flight depends only on the horizontal component of the launch velocity.',
            'The speed is constant throughout the flight.',
          ];
          const nT = R.pick([1, 2, 2, 3]);
          const st = R.shuffle(R.pickN(TRUE, nT).map(x => [x, true]).concat(R.pickN(FALSE, 3 - nT).map(x => [x, false])));
          return {
            q: GRE.romanStem('A ball is launched from level ground at an angle between $0^\\circ$ and $90^\\circ$ above the horizontal; air resistance is negligible. Which of the following statements is (are) true?', st.map(x => x[0])),
            ...GRE.roman(R, st.map(x => x[1])),
            expl: 'Without air resistance the only force is gravity: the acceleration is $g$ downward at every instant, the horizontal velocity never changes, and the vertical motion is symmetric about the top, where the velocity is horizontal (and nonzero). ' +
              st.map((x, i) => `${['I', 'II', 'III'][i]}: ${x[1] ? 'true' : 'false'}.`).join(' '),
          };
        }
        if (kind === 'comp') {
          const a = R.pick(angs([30, 37]));
          const t = a.s / a.c;
          const Q = R.pick([['maximum heights', t * t], ['times of flight', t], ['horizontal ranges', 1]]);
          const angles = isTheta(a)
            ? raw`one at an angle $\theta$ above the horizontal and the other at $90^\circ - \theta$, where $\sin\theta = ${a.s}$`
            : raw`one at $${a.d}^\circ$ above the horizontal and the other at $${90 - a.d}^\circ$`;
          return {
            level: 2,
            q: raw`Two identical balls are launched from level ground with the same speed, ${angles}. Neglecting air resistance, what is the ratio of their ${Q[0]} (first ball to second)?`,
            ...mcv(R, Q[1], [t, t * t, 1, 1 / t, 1 / (t * t), a.s, a.c, 2 * a.s * a.c], fac),
            expl: raw`$H \propto \sin^2\theta$, $T \propto \sin\theta$, and $R \propto \sin 2\theta$. Replacing $\theta$ by $90^\circ - \theta$ swaps sine and cosine, so the ranges are equal, the flight times are in the ratio $\tan\theta$, and the heights in the ratio $\tan^2\theta$. Here the ratio is $${ex(Q[1])}$.`,
          };
        }
        const k = R.pick([2, 3, 4, 9]);
        const kw = { 2: 'doubled', 3: 'tripled', 4: 'quadrupled', 9: 'multiplied by 9' }[k];
        const CASES = [
          [`the launch speed is ${kw} (same launch angle)`, 'horizontal range', 2, raw`$R = v_0^2\sin 2\theta/g \propto v_0^2$`],
          [`the launch speed is ${kw} (same launch angle)`, 'maximum height', 2, raw`$H = v_0^2\sin^2\theta/2g \propto v_0^2$`],
          [`the launch speed is ${kw} (same launch angle)`, 'time of flight', 1, raw`$T = 2v_0\sin\theta/g \propto v_0$`],
          [`the same launch (same speed and angle) is repeated on a planet whose surface gravity is $1/${k}$ of Earth’s`, 'horizontal range', 1, raw`$R \propto 1/g$`],
          [`the same launch (same speed and angle) is repeated on a planet whose surface gravity is $1/${k}$ of Earth’s`, 'time of flight', 1, raw`$T \propto 1/g$`],
          [`the same launch (same speed and angle) is repeated on a planet whose surface gravity is $${k}$ times Earth’s`, 'maximum height', -1, raw`$H \propto 1/g$`],
          [`a ball rolled horizontally off a table at the same speed starts from a table whose height is ${kw}`, 'horizontal distance traveled before landing', 0.5, raw`the fall time $\sqrt{2h/g}$ grows as $\sqrt{h}$, and the distance is $v_0 t$`],
          [`a ball rolled horizontally off a table at the same speed starts from a table whose height is ${kw}`, 'time in the air', 0.5, raw`$t = \sqrt{2h/g} \propto \sqrt{h}$`],
          [`a ball rolled horizontally off the same table has its speed ${kw}`, 'time in the air', 0, raw`the fall time $\sqrt{2h/g}$ does not depend on the horizontal speed`],
          [`a ball rolled horizontally off the same table has its speed ${kw}`, 'horizontal distance traveled before landing', 1, raw`the fall time is fixed and the distance is $v_0 t$`],
        ];
        const [setup, qty, p, why] = R.pick(CASES);
        const ans = Math.pow(k, p);
        const fmt = x => (x === 1 ? 'It is unchanged.' : (ex(x) == null ? null : `It is multiplied by $${ex(x)}$.`));
        return {
          q: raw`A projectile experiment is changed: ${setup}. Neglecting air resistance, how does the ${qty} change?`,
          ...mcv(R, ans, powWrongs(k, p), fmt),
          expl: raw`Scaling: ${why}, so the ${qty} ${mult(ans)}.`,
        };
      },
    },
    {
      id: 'mech.frames', sec: '1.2', level: 2, weight: 2,
      gen(R) {
        const kind = R.pick(['cross', 'cross', 'opp', 'opp', 'rain', 'balloon', 'balloon', 'train']);
        if (kind === 'cross') {
          const d = R.pick([40, 60, 80, 90, 100, 120, 150, 200, 240, 300]);
          const u = R.pick([2, 2.5, 3, 4, 5]), w = R.pick([1, 1.5, 2, 3, 4].filter(x => x !== u));
          const t = d / u, drift = w * d / u;
          const stem = raw`A river $${d}\,\text{m}$ wide flows at $${w}\,\text{m/s}$. A boat that moves at $${u}\,\text{m/s}$ relative to the water is kept pointed straight across the river (perpendicular to the banks).`;
          if (R.bool()) {
            return {
              level: 1,
              q: raw`${stem} ${ask(t)} the time it takes to reach the other bank?`,
              ...num(R, t, [d / Math.hypot(u, w), u > w ? d / Math.sqrt(u * u - w * w) : null, d / (u + w), d / w], raw`\text{s}`),
              expl: raw`In the water’s frame the boat simply crosses at $${u}\,\text{m/s}$; the current only carries it downstream. So $t = d/u = ${N2(t, 3)}\,\text{s}$, whatever the current.`,
            };
          }
          return {
            q: raw`${stem} ${ask(drift)} the distance downstream from the point directly opposite its start at which it lands?`,
            ...num(R, drift, [d * u / w, Math.hypot(d, drift), d * w / Math.hypot(u, w), u > w ? d * w / Math.sqrt(u * u - w * w) : null], raw`\text{m}`),
            expl: raw`The crossing takes $d/u = ${N2(t, 3)}\,\text{s}$, during which the current carries the boat $w\,(d/u) = ${N2(drift, 3)}\,\text{m}$ downstream.`,
          };
        }
        if (kind === 'opp') {
          const [u, w, v] = R.pick([[5, 3, 4], [5, 4, 3], [10, 6, 8], [10, 8, 6], [13, 5, 12], [2.5, 1.5, 2], [2.5, 2, 1.5], [17, 8, 15], [1.3, 0.5, 1.2]]);
          if (R.bool(0.65)) {
            const d = R.pick([60, 72, 90, 120, 150, 180, 240, 300, 360]);
            const t = d / v;
            return {
              q: raw`A boat that moves at $${u}\,\text{m/s}$ relative to the water must cross a river $${d}\,\text{m}$ wide, flowing at $${w}\,\text{m/s}$, and land at the point directly opposite its starting point. ${ask(t)} the crossing time?`,
              ...num(R, t, [d / u, d / Math.hypot(u, w), d / (u - w), d / w], raw`\text{s}`),
              expl: raw`The boat must head partly upstream so that its upstream velocity component cancels the current. Its speed across the river is then $\sqrt{u^2 - w^2} = \sqrt{${u}^2 - ${w}^2} = ${v}\,\text{m/s}$, so $t = ${d}/${v} \approx ${N2(t, 3)}\,\text{s}$.`,
            };
          }
          const fr = F.frac(Math.round(10 * w), Math.round(10 * u)), ifr = F.frac(Math.round(10 * u), Math.round(10 * w));
          return {
            level: 3,
            q: raw`A boat that moves at $${u}\,\text{m/s}$ relative to the water must cross a river flowing at $${w}\,\text{m/s}$ and land directly opposite its starting point. At what angle, measured from the line straight across the river, must the boat be pointed upstream?`,
            ...GRE.mc(R, raw`$\sin^{-1}(${fr})$`, [raw`$\tan^{-1}(${fr})$`, raw`$\cos^{-1}(${fr})$`, raw`$\tan^{-1}(${ifr})$`, raw`$0^\circ$ (straight across)`, raw`$\sin^{-1}(${F.frac(Math.round(10 * w), Math.round(10 * (u + w)))})$`]),
            expl: raw`The boat’s velocity relative to the water has an upstream component $u\sin\phi$ that must cancel the current: $\sin\phi = w/u = ${fr}$.`,
          };
        }
        if (kind === 'rain') {
          const [vr, vc, rel] = R.pick([[8, 6, 10], [6, 8, 10], [12, 5, 13], [4, 3, 5], [3, 4, 5], [9, 12, 15], [15, 8, 17], [12, 9, 15], [24, 7, 25], [5, 12, 13]]);
          const stem = raw`Rain falls vertically at $${vr}\,\text{m/s}$ relative to the ground. A car drives along a level road at $${vc}\,\text{m/s}$.`;
          if (R.bool(0.6)) {
            return {
              level: 1,
              q: raw`${stem} What is the speed of the raindrops relative to the car?`,
              ...num(R, rel, [vr + vc, Math.abs(vr - vc), vr, vc, Math.sqrt(Math.abs(vr * vr - vc * vc))], raw`\text{m/s}`),
              expl: raw`$\vec v_{\text{rain/car}} = \vec v_{\text{rain}} - \vec v_{\text{car}}$ has a vertical part $${vr}\,\text{m/s}$ and a horizontal part $${vc}\,\text{m/s}$ (opposite to the car’s motion), so its magnitude is $\sqrt{${vr}^2 + ${vc}^2} = ${rel}\,\text{m/s}$.`,
            };
          }
          return {
            q: raw`${stem} The streaks the raindrops leave on the car’s side windows make an angle $\phi$ with the vertical. What is $\tan\phi$?`,
            ...mcv(R, vc / vr, [vr / vc, vc / rel, vr / rel, rel / vr, rel / vc], fac),
            expl: raw`In the car’s frame each drop moves backward at $${vc}\,\text{m/s}$ and downward at $${vr}\,\text{m/s}$, so $\tan\phi = ${vc}/${vr} = ${F.frac(vc, vr)}$.`,
          };
        }
        if (kind === 'balloon') {
          const u = R.pick([5, 10, 15, 20]);
          const t = R.int(Math.floor(u / 5) + 1, Math.floor(u / 5) + 6);
          const h = 5 * t * t - u * t;
          const stem = raw`A hot-air balloon is rising vertically at a constant $${u}\,\text{m/s}$. When it is $${h}\,\text{m}$ above the ground, a sandbag is released from it. Air resistance on the sandbag is negligible.`;
          if (R.bool()) {
            return {
              q: raw`${stem} ${ask(t)} the time the sandbag takes to reach the ground? ${USE_G}`,
              ...num(R, t, [Math.sqrt(2 * h / g), (Math.sqrt(u * u + 2 * g * h) - u) / g, u / g + Math.sqrt(2 * h / g), 2 * u / g + Math.sqrt(2 * h / g)], raw`\text{s}`),
              expl: raw`In the ground frame the sandbag starts with the balloon’s velocity, $${u}\,\text{m/s}$ upward. Then $-${h} = ${u}t - 5t^2$, whose positive root is $t = ${t}\,\text{s}$. Ignoring the initial upward velocity gives $\sqrt{2h/g}$, which is too short.`,
            };
          }
          const V = g * t - u;
          return {
            q: raw`${stem} With what speed does the sandbag hit the ground? ${USE_G}`,
            ...num(R, V, [Math.sqrt(2 * g * h), u + Math.sqrt(2 * g * h), Math.sqrt(2 * g * h) - u, g * t], raw`\text{m/s}`),
            expl: raw`The sandbag starts with speed $${u}\,\text{m/s}$ (the balloon’s velocity), so $v^2 = v_0^2 + 2gh = ${u}^2 + 2(10)(${h}) = ${V * V}$ and $v = ${V}\,\text{m/s}$. For the final speed the direction of the initial velocity does not matter.`,
          };
        }
        const v = R.pick([10, 15, 20, 25, 30]);
        const hh = R.pick([0.8, 1.25, 1.8, 2.45]);
        const acc = R.pick([0.5, 1, 1.5, 2, 2.5, 3]);
        const dcm = 100 * acc * hh / g;
        return {
          level: 3,
          q: raw`A train moving along a straight, level track at $${v}\,\text{m/s}$ is speeding up with constant acceleration $${acc}\,\text{m/s}^2$. A passenger releases a coin from rest (relative to the train) $${hh}\,\text{m}$ above the floor. How far from the point on the floor directly below the release point does the coin land? ${USE_G}`,
          ...num(R, dcm, [2 * dcm, dcm / 2, 100 * v * Math.sqrt(2 * hh / g), 4 * dcm], raw`\text{cm}`),
          expl: raw`In the ground frame the coin keeps the velocity it had at release while the floor keeps accelerating. Relative to the train it lands $\tfrac12 a t^2$ toward the rear, with $t = \sqrt{2h/g}$: $\Delta x = ah/g = ${N2(dcm)}\,\text{cm}$. The train’s speed is irrelevant; only its acceleration matters.`,
        };
      },
    },
    {
      id: 'mech.kin1d', sec: '1.2', level: 1,
      gen(R) {
        const kind = R.pick(['brake', 'brakeT', 'scale', 'up', 'upT', 'nth', 'two']);
        if (kind === 'brake' || kind === 'brakeT') {
          const v0 = R.pick([10, 12, 15, 20, 24, 25, 30, 35, 40]), a = R.pick([2, 3, 4, 5, 6, 8, 10]);
          const veh = R.pick(['car', 'truck', 'train', 'motorcycle', 'bus']);
          const stem = raw`A ${veh} traveling at $${v0}\,\text{m/s}$ brakes with a constant deceleration of $${a}\,\text{m/s}^2$.`;
          if (kind === 'brake') {
            const d = v0 * v0 / (2 * a);
            return {
              q: raw`${stem} ${ask(d)} the distance it travels before stopping?`,
              ...num(R, d, [v0 * v0 / a, v0 * v0 / (4 * a), v0 / a * v0 / 3], raw`\text{m}`),
              expl: raw`From $v^2 = v_0^2 - 2ad$ with $v = 0$: $d = v_0^2/2a = ${N2(d, 3)}\,\text{m}$. No time is asked for, so skip the time entirely.`,
            };
          }
          const t = v0 / a;
          return {
            q: raw`${stem} ${ask(t)} the time it takes to stop?`,
            ...num(R, t, [2 * v0 / a, v0 / (2 * a), v0 * v0 / (2 * a) / v0 * 4], raw`\text{s}`),
            expl: raw`The velocity drops by $${a}\,\text{m/s}$ every second: $t = v_0/a = ${N2(t, 3)}\,\text{s}$.`,
          };
        }
        if (kind === 'scale') {
          const k = R.pick([1.5, 2, 3, 4]);
          const kw = { 1.5: 'is 50% higher', 2: 'is doubled', 3: 'is tripled', 4: 'is quadrupled' }[k];
          const qd = R.bool(0.7);
          const ans = qd ? k * k : k;
          return {
            q: raw`A car with initial speed $v$ brakes with constant deceleration and stops in a distance $d$ after a time $t$. If the initial speed ${kw} and the deceleration is unchanged, what is the new ${qd ? 'stopping distance' : 'stopping time'}?`,
            ...mcv(R, ans, [k, k * k, Math.sqrt(k), k * k * k, 2 * k, 1].filter(x => x !== ans), cf(qd ? 'd' : 't')),
            expl: raw`$${qd ? raw`d = v^2/2a \propto v^2` : raw`t = v/a \propto v`}$, so the ${qd ? 'distance' : 'time'} ${mult(ans)}.`,
          };
        }
        if (kind === 'up' || kind === 'upT') {
          const v0 = R.pick([5, 8, 10, 12, 15, 20, 25, 30]);
          const obj = R.pick(['ball', 'stone', 'tennis ball', 'small rock']);
          if (kind === 'up') {
            const H = v0 * v0 / (2 * g);
            return {
              q: raw`A ${obj} is thrown straight up with a speed of $${v0}\,\text{m/s}$. Neglecting air resistance, how high above the launch point does it rise? ${USE_G}`,
              ...num(R, H, [v0 * v0 / g, v0 * v0 / (4 * g), v0 / g * v0 * 2], raw`\text{m}`),
              expl: raw`At the top $v = 0$: $0 = v_0^2 - 2gH$, so $H = v_0^2/2g = ${N2(H, 3)}\,\text{m}$ (or equivalently $\tfrac12 mv_0^2 = mgH$).`,
            };
          }
          const T = 2 * v0 / g;
          return {
            q: raw`A ${obj} is thrown straight up with a speed of $${v0}\,\text{m/s}$ and caught at the same height. Neglecting air resistance, how long is it in the air? ${USE_G}`,
            ...num(R, T, [v0 / g, 4 * v0 / g, v0 / (2 * g)], raw`\text{s}`),
            expl: raw`The velocity goes from $+${v0}$ to $-${v0}\,\text{m/s}$ at $10\,\text{m/s}^2$: $T = 2v_0/g = ${N2(T, 3)}\,\text{s}$. Half of this is the time to the top.`,
          };
        }
        if (kind === 'nth') {
          const a = R.pick([2, 3, 4, 5, 6, 8]), n = R.int(2, 7);
          const ord = { 2: 'second', 3: 'third', 4: 'fourth', 5: 'fifth', 6: 'sixth', 7: 'seventh' }[n];
          const d = a * (2 * n - 1) / 2;
          return {
            level: 2,
            q: raw`A car starts from rest and accelerates uniformly at $${a}\,\text{m/s}^2$. How far does it travel during the ${ord} second of its motion (from $t = ${n - 1}\,\text{s}$ to $t = ${n}\,\text{s}$)?`,
            ...num(R, d, [a * n * n / 2, a * n, a * (n - 1) * (n - 1) / 2, a * (2 * n + 1) / 2, a / 2], raw`\text{m}`),
            expl: raw`$x(t) = \tfrac12 at^2$, so the distance is $\tfrac12 a(${n}^2 - ${n - 1}^2) = \tfrac12 a(2n - 1) = ${N2(d, 3)}\,\text{m}$. Distances in successive seconds go as $1:3:5:7\ldots$`,
          };
        }
        const h = R.pick([10, 15, 20, 25, 30, 40, 45, 60]), v0 = R.pick([5, 8, 10, 12, 15, 20]);
        return {
          level: 2,
          q: raw`From the top of a cliff $${h}\,\text{m}$ high, ball A is thrown straight up and ball B straight down, each with speed $${v0}\,\text{m/s}$. Neglecting air resistance, which of the following is true?`,
          ...GRE.mc(R, 'They hit the ground with the same speed.', [
            'A hits the ground with the greater speed.',
            'B hits the ground with the greater speed.',
            'They hit the ground at the same time.',
            raw`B’s speed at impact exceeds A’s by $${2 * v0}\,\text{m/s}$.`,
            'A spends exactly twice as long in the air as B.',
          ]),
          expl: raw`Energy conservation: each ball starts with the same kinetic energy and falls the same height, so both land with $v = \sqrt{v_0^2 + 2gh} = ${N2(Math.sqrt(v0 * v0 + 2 * g * h))}\,\text{m/s}$. Ball A takes longer (by $2v_0/g = ${N2(2 * v0 / g)}\,\text{s}$), since it first rises and returns to the cliff top with speed $v_0$ downward.`,
        };
      },
    },
    // ================================================================= 1.2.1 Circular motion
    {
      id: 'mech.circ.loop', sec: '1.2.1', level: 2, weight: 2,
      gen(R) {
        const kind = R.pick(['vmin', 'vbot', 'height', 'height', 'normal', 'normal', 'six', 'hill']);
        if (kind === 'vmin' || kind === 'vbot') {
          const r = R.pick([0.4, 0.9, 1.6, 2.5, 3.6, 4.9, 6.4, 8.1, 10]);
          const [sys, keep] = R.pick([
            [raw`A small ball on a light string of length $${r}\,\text{m}$ is whirled in a vertical circle.`, 'the string stays taut'],
            [raw`A small block slides around the inside of a frictionless vertical circular loop of radius $${r}\,\text{m}$.`, 'the block stays in contact with the track'],
            [raw`A bucket of water is swung in a vertical circle of radius $${r}\,\text{m}$.`, 'the water stays in the bucket'],
            [raw`A roller-coaster car, treated as a point, coasts without friction around the inside of a vertical circular loop of radius $${r}\,\text{m}$.`, 'the car stays in contact with the track'],
          ]);
          if (kind === 'vmin') {
            const v = Math.sqrt(g * r);
            return {
              level: 1,
              q: raw`${sys} What is the minimum speed at the top of the circle for which ${keep}? ${USE_G}`,
              ...num(R, v, [Math.sqrt(2 * g * r), Math.sqrt(5 * g * r), Math.sqrt(g * r / 2), 2 * v], raw`\text{m/s}`),
              expl: raw`At the top, gravity plus the (string or contact) force supply the centripetal force: $mg + N = mv^2/r$. The minimum speed has $N = 0$, so $v = \sqrt{gr} = ${N2(v)}\,\text{m/s}$.`,
            };
          }
          const v = Math.sqrt(5 * g * r);
          return {
            q: raw`${sys} What is the minimum speed at the bottom of the circle for which ${keep} all the way around? ${USE_G}`,
            ...num(R, v, [Math.sqrt(4 * g * r), Math.sqrt(g * r), Math.sqrt(2 * g * r), Math.sqrt(3 * g * r), Math.sqrt(6 * g * r)], raw`\text{m/s}`, { tol: 0.08 }),
            expl: raw`The top requires $v_{\text{top}}^2 \ge gr$. Energy from bottom to top: $v_{\text{bot}}^2 = v_{\text{top}}^2 + 4gr \ge 5gr$, so $v_{\min} = \sqrt{5gr} = ${N2(v)}\,\text{m/s}$. ($\sqrt{4gr}$ would only suffice for a rigid rod, which can push.)`,
          };
        }
        if (kind === 'height') {
          const objs = ROLLERS.map(o => Object.assign({ roll: true }, o)).concat([{ name: 'small block', b: [0, 1], roll: false }, { name: 'small block', b: [0, 1], roll: false }]);
          const o = R.pick(objs);
          const hk = b => 2 + (1 + b) / 2;
          const ans = hk(bval(o));
          return {
            level: o.roll ? 3 : 2,
            q: raw`A ${o.name}${o.roll ? ' of radius much smaller than $R$ rolls without slipping' : ' slides without friction'} down a track that leads into a vertical circular loop of radius $R$. It starts from rest. What is the minimum starting height, measured from the bottom of the loop, for which it goes around the loop without losing contact with the track?`,
            ...mcv(R, ans, [2.5, 2.7, 2.75, 17 / 6, 3, 2, 2 + (1 + bval(o)), 1.5].filter(x => Math.abs(x - ans) > 1e-9), cf('R')),
            expl: raw`At the top, $v^2 \ge gR$. ${o.roll ? raw`Rolling, the kinetic energy is $\tfrac12(1 + \beta)mv^2$ with $I = \beta mR_{\text{obj}}^2$, $\beta = ${F.frac(o.b[0], o.b[1])}$. ` : ''}Energy: $mg(h - 2R) = \tfrac12${o.roll ? raw`(1 + \beta)` : ''}m(gR)$, so $h = 2R + ${coefTex((o.b[0] + o.b[1]) / (2 * o.b[1]), 'R')} = ${coefTex(ans, 'R')}$.`,
          };
        }
        if (kind === 'normal') {
          const k = R.pick([2.5, 3, 3.5, 4, 4.5, 5, 6]);
          const top = R.bool();
          const ans = top ? 2 * k - 5 : 1 + 2 * k;
          const wr = top ? [2 * k - 4, 2 * k - 3, 2 * k - 6, 2 * k + 1, k - 2] : [2 * k, 2 * k - 1, 1 + k, 2 * k + 2, 2 * k - 5];
          return {
            q: raw`A small block is released from rest at a height $h = ${F.num(k, 2)}R$ above the bottom of a frictionless track that leads into a vertical circular loop of radius $R$. When the block is at the ${top ? 'top' : 'bottom'} of the loop, what is the magnitude of the normal force exerted on it by the track? (The block has weight $mg$.)`,
            ...mcv(R, ans, wr.filter(x => x >= 0), cf('mg')),
            expl: top
              ? raw`At the top, $v^2 = 2g(h - 2R) = ${F.num(2 * (k - 2), 2)}gR$. Both the normal force and gravity point down: $N + mg = mv^2/R$, so $N = ${coefTex(ans, 'mg')}$.`
              : raw`At the bottom, $v^2 = 2gh = ${F.num(2 * k, 2)}gR$. The normal force points up and gravity down: $N - mg = mv^2/R$, so $N = ${coefTex(ans, 'mg')}$. Forgetting the weight gives $${coefTex(2 * k, 'mg')}$.`,
          };
        }
        if (kind === 'six') {
          const m = R.pick([0.2, 0.25, 0.4, 0.5, 0.8, 1, 1.5, 2]), L = R.pick([0.5, 0.8, 1, 1.2, 1.5]);
          const vb = R.pick([6, 7, 8, 9, 10, 12].filter(x => x * x >= 5 * g * L + 1));
          const D = 6 * m * g;
          return {
            level: 3,
            q: raw`A $${m}\,\text{kg}$ ball on a light string of length $${L}\,\text{m}$ is whirled in a vertical circle; its speed at the lowest point is $${vb}\,\text{m/s}$. What is the tension in the string at the lowest point minus the tension at the highest point? ${USE_G}`,
            ...num(R, D, [2 * m * g, 4 * m * g, 5 * m * g, m * g, 2 * m * vb * vb / L], raw`\text{N}`),
            expl: raw`Bottom: $T_b - mg = mv_b^2/L$. Top: $T_t + mg = mv_t^2/L$. Energy: $v_b^2 - v_t^2 = 4gL$. Subtracting, $T_b - T_t = 2mg + 4mg = 6mg = ${N2(D)}\,\text{N}$ — independent of the speed and the string length.`,
          };
        }
        const r = R.pick([10, 20, 25, 40, 50, 80, 90, 100]), m = R.pick([800, 1000, 1200, 1500]);
        const vmax = Math.sqrt(g * r);
        if (R.bool()) {
          return {
            q: raw`A car drives over the top of a hill whose cross-section is a circular arc of radius $${r}\,\text{m}$. ${ask(vmax)} the maximum speed at which the car can cross the top without losing contact with the road? ${USE_G}`,
            ...num(R, vmax, [Math.sqrt(2 * g * r), Math.sqrt(g * r / 2), g * r / 10, Math.sqrt(5 * g * r)], raw`\text{m/s}`),
            expl: raw`At the crest, $mg - N = mv^2/r$. Contact is lost when $N = 0$: $v_{\max} = \sqrt{gr} = ${N2(vmax)}\,\text{m/s}$.`,
          };
        }
        const v = R.pick([5, 6, 8, 10, 12, 15, 20].filter(x => x * x < 0.85 * g * r));
        const Nn = m * (g - v * v / r);
        return {
          q: raw`A $${m}\,\text{kg}$ car drives over the top of a hill whose cross-section is a circular arc of radius $${r}\,\text{m}$, at a speed of $${v}\,\text{m/s}$. ${ask(Nn)} the normal force exerted by the road on the car at the top? ${USE_G}`,
          ...num(R, Nn, [m * (g + v * v / r), m * g, m * v * v / r, m * (g - v / r)], raw`\text{N}`, { sig: 3, tol: 0.06 }),
          expl: raw`At the crest the net downward force supplies the centripetal force: $mg - N = mv^2/r$, so $N = m(g - v^2/r) = ${N2(Nn, 3)}\,\text{N}$, less than the weight.`,
        };
      },
    },
    {
      id: 'mech.circ.flat', sec: '1.2.1', level: 2, weight: 2,
      gen(R) {
        const kind = R.pick(['flat', 'flat', 'bank', 'bankAng', 'cone', 'coneT', 'rotor', 'turn']);
        if (kind === 'flat') {
          const mu = R.pick([0.4, 0.5, 0.6, 0.8, 0.9, 1.0]), r = R.pick([10, 20, 40, 50, 80, 90, 160, 250]);
          const v = Math.sqrt(mu * g * r);
          return {
            level: 1,
            q: raw`A car rounds an unbanked curve of radius $${r}\,\text{m}$. The coefficient of static friction between the tires and the road is $${mu}$. ${ask(v)} the maximum speed at which the car can take the curve without skidding? ${USE_G}`,
            ...num(R, v, [Math.sqrt(g * r), Math.sqrt(mu * g * r / 2), Math.sqrt(2 * mu * g * r), Math.sqrt(g * r / mu), mu * Math.sqrt(g * r)], raw`\text{m/s}`),
            expl: raw`Static friction supplies the centripetal force: $mv^2/r \le \mu_s mg$, so $v_{\max} = \sqrt{\mu_s g r} = ${N2(v)}\,\text{m/s}$, independent of the car’s mass.`,
          };
        }
        if (kind === 'bank' || kind === 'bankAng') {
          if (kind === 'bank') {
            const a = R.pick(angs([30, 37, 45, 53]));
            const r = R.pick([20, 30, 40, 45, 60, 80, 90, 120, 160, 200]);
            const v = Math.sqrt(g * r * a.s / a.c);
            return {
              q: raw`A curve of radius $${r}\,\text{m}$ is banked ${atAng(a, 'to the horizontal')}. At what speed can a car round the curve with no friction force needed from the road? ${USE_G}`,
              ...num(R, v, [Math.sqrt(g * r * a.s), Math.sqrt(g * r * a.c), Math.sqrt(g * r * a.c / a.s), Math.sqrt(g * r)], raw`\text{m/s}`),
              expl: raw`With no friction, the normal force does two jobs: $N\cos\theta = mg$ and $N\sin\theta = mv^2/r$. Dividing, $\tan\theta = v^2/gr$, so $v = \sqrt{gr\tan\theta} \approx ${N2(v)}\,\text{m/s}$.`,
            };
          }
          const v = R.pick([10, 12, 15, 18, 20, 25, 30]), r = R.pick([40, 50, 60, 80, 100, 120, 150, 200]);
          const t = v * v / (g * r);
          if (t > 3) throw new Error('too steep');
          return {
            q: raw`A highway curve of radius $${r}\,\text{m}$ is to be banked so that cars traveling at $${v}\,\text{m/s}$ need no friction to stay on the road. What must $\tan\theta$ be, where $\theta$ is the banking angle? ${USE_G}`,
            ...num(R, t, [g * r / (v * v), t / 2, 2 * t, Math.sqrt(t)]),
            expl: raw`$N\cos\theta = mg$ and $N\sin\theta = mv^2/r$ give $\tan\theta = \dfrac{v^2}{gr} = \dfrac{${v * v}}{${g * r}} \approx ${N2(t)}$.`,
          };
        }
        if (kind === 'cone' || kind === 'coneT') {
          if (kind === 'coneT') {
            const sym = R.pick(['L', 'l']);
            return {
              q: raw`A small mass on a string of length $${sym}$ moves in a horizontal circle at constant speed, with the string making a constant angle $\theta$ with the vertical (a conical pendulum). What is the period of the motion?`,
              ...GRE.mc(R, raw`$2\pi\sqrt{\dfrac{${sym}\cos\theta}{g}}$`, [raw`$2\pi\sqrt{\dfrac{${sym}}{g}}$`, raw`$2\pi\sqrt{\dfrac{${sym}\sin\theta}{g}}$`, raw`$2\pi\sqrt{\dfrac{${sym}}{g\cos\theta}}$`, raw`$2\pi\sqrt{\dfrac{${sym}\tan\theta}{g}}$`, raw`$\pi\sqrt{\dfrac{${sym}\cos\theta}{g}}$`]),
              expl: raw`$T\cos\theta = mg$ and $T\sin\theta = m\omega^2 r$ with $r = ${sym}\sin\theta$ give $\omega^2 = g/(${sym}\cos\theta)$, so the period is $2\pi\sqrt{${sym}\cos\theta/g}$. Check: as $\theta \to 0$ it approaches the small-oscillation pendulum period $2\pi\sqrt{${sym}/g}$.`,
            };
          }
          const a = R.pick(angs([37, 45, 53, 60]));
          const m = R.pick([0.2, 0.3, 0.4, 0.5, 0.6, 0.8, 1, 1.5, 2]);
          const T = m * g / a.c;
          return {
            q: raw`A $${m}\,\text{kg}$ ball on a string moves in a horizontal circle at constant speed, with the string making a constant angle with the vertical (a conical pendulum). The angle is $${isTheta(a) ? raw`\theta` : a.d + raw`^\circ`}$${isTheta(a) ? raw`, where $\cos\theta = ${a.c}$` : ''}. ${ask(T)} the tension in the string? ${USE_G}`,
            ...num(R, T, [m * g * a.c, m * g, m * g * a.s, m * g * a.s / a.c, m * g / a.s], raw`\text{N}`),
            expl: raw`The ball does not accelerate vertically, so the vertical component of the tension balances gravity: $T\cos\theta = mg$, $T = mg/\cos\theta \approx ${N2(T)}\,\text{N}$. The horizontal component $T\sin\theta$ is the centripetal force.`,
          };
        }
        if (kind === 'rotor') {
          const r = R.pick([2, 2.5, 3, 4, 5]), v = R.pick([8, 9, 10, 12, 14, 15]);
          const mu = g * r / (v * v);
          return {
            q: raw`In an amusement-park "rotor," riders stand against the inside wall of a vertical cylinder of radius $${r}\,\text{m}$. The cylinder spins so that the wall moves at $${v}\,\text{m/s}$, and then the floor drops away. ${ask(mu)} the minimum coefficient of static friction between rider and wall that keeps the riders from sliding down? ${USE_G}`,
            ...num(R, mu, [v * v / (g * r), mu / 2, 2 * mu, Math.sqrt(mu)]),
            expl: raw`The wall’s normal force is the centripetal force, $N = mv^2/r$, and friction must hold the weight: $\mu_s mv^2/r \ge mg$. So $\mu_{\min} = gr/v^2 \approx ${N2(mu)}$, the same for every rider.`,
          };
        }
        const mu = R.pick([0.2, 0.3, 0.4, 0.5, 0.6, 0.8]), rc = R.pick([5, 8, 10, 12, 15, 20, 25]);
        const w = Math.sqrt(mu * g / (rc / 100));
        return {
          q: raw`A coin sits on a horizontal turntable $${rc}\,\text{cm}$ from the axis. The coefficient of static friction between coin and turntable is $${mu}$. The turntable’s rotation rate is slowly increased. ${ask(w)} the angular speed at which the coin begins to slide? ${USE_G}`,
          ...num(R, w, [Math.sqrt(g / (mu * rc / 100)), Math.sqrt(2 * mu * g / (rc / 100)), w / (2 * Math.PI), w * w / 10], raw`\text{rad/s}`),
          expl: raw`Static friction provides the centripetal force: $m\omega^2 r \le \mu_s mg$, so $\omega_{\max} = \sqrt{\mu_s g/r} = \sqrt{${mu}\times 10/${F.num(rc / 100, 2)}} \approx ${N2(w)}\,\text{rad/s}$.`,
        };
      },
    },
    {
      id: 'mech.circ.scaling', sec: '1.2.1', level: 2,
      gen(R) {
        const k = R.pick([2, 3, 4, 9]);
        const kw = { 2: 'doubled', 3: 'tripled', 4: 'quadrupled', 9: 'multiplied by 9' }[k];
        const CASES = [
          [raw`A charged particle moves in a circle in a uniform magnetic field. Its kinetic energy is ${kw}, and the field is changed so that the radius of the orbit stays the same.`, 'magnetic field', 0.5, raw`$qvB = mv^2/r$ gives $B = mv/qr \propto v \propto \sqrt{K}$`],
          [raw`A charged particle moves in a circle in a uniform magnetic field. Its kinetic energy is ${kw}; the field is unchanged.`, 'radius of its orbit', 0.5, raw`$r = mv/qB \propto v \propto \sqrt{K}$`],
          [raw`A charged particle moves in a circle in a uniform magnetic field. Its speed is ${kw} (still nonrelativistic); the field is unchanged.`, 'period of its orbit', 0, raw`$T = 2\pi r/v = 2\pi m/qB$ does not depend on the speed`],
          [raw`A satellite in a circular orbit is moved to another circular orbit whose radius is ${kw}.`, 'orbital speed', -0.5, raw`$GMm/r^2 = mv^2/r$ gives $v = \sqrt{GM/r} \propto r^{-1/2}$`],
          [raw`A satellite in a circular orbit is moved to another circular orbit whose radius is ${kw}.`, 'centripetal acceleration', -2, raw`$a = GM/r^2$`],
          [raw`A satellite in a circular orbit is moved to another circular orbit whose radius is ${kw}.`, 'kinetic energy', -1, raw`$\tfrac12 mv^2 = GMm/2r \propto 1/r$`],
          [raw`A puck tied to a fixed peg by a string moves in a circle on a frictionless table. Its speed is ${kw} while the string length stays the same.`, 'string tension', 2, raw`$T = mv^2/r \propto v^2$`],
          [raw`A puck tied to a fixed peg by a string moves in a circle on a frictionless table. The string length is ${kw} while the puck’s speed stays the same.`, 'string tension', -1, raw`$T = mv^2/r \propto 1/r$ at fixed $v$`],
          [raw`A puck tied to a fixed peg by a string moves in a circle on a frictionless table. The string length is ${kw} while the angular speed stays the same.`, 'string tension', 1, raw`$T = m\omega^2 r \propto r$ at fixed $\omega$`],
          [raw`A car rounds an unbanked curve at the maximum speed that friction allows. The radius of the curve is ${kw} (same road surface).`, 'maximum speed', 0.5, raw`$\mu_s mg = mv^2/r$ gives $v_{\max} = \sqrt{\mu_s g r} \propto \sqrt{r}$`],
          [raw`In a classical model, an electron moves in a circular orbit around a fixed proton under the Coulomb attraction. The orbit radius is ${kw}.`, 'electron’s speed', -0.5, raw`$ke^2/r^2 = mv^2/r$ gives $v \propto r^{-1/2}$`],
          [raw`In a classical model, an electron moves in a circular orbit around a fixed proton under the Coulomb attraction. The orbit radius is ${kw}.`, 'orbital period', 1.5, raw`$v \propto r^{-1/2}$, so $T = 2\pi r/v \propto r^{3/2}$`],
        ];
        const [setup, qty, p, why] = R.pick(CASES);
        const ans = Math.pow(k, p);
        const fmt = x => (x === 1 ? 'It is unchanged.' : (ex(x) == null ? null : `It is multiplied by $${ex(x)}$.`));
        return {
          q: raw`${setup} By what factor does the ${qty} change?`,
          ...mcv(R, ans, powWrongs(k, p), fmt),
          expl: raw`Identify the force that provides the centripetal acceleration and set it equal to $mv^2/r$: ${why}. So the ${qty} ${mult(ans)}.`,
        };
      },
    },
    {
      id: 'mech.circ.accel', sec: '1.2.1', level: 2,
      gen(R) {
        const kind = R.pick(['total', 'total', 'wheel', 'pend', 'roman', 'roman']);
        if (kind === 'total') {
          const [at, ac, tot] = R.pick([[3, 4, 5], [4, 3, 5], [6, 8, 10], [8, 6, 10], [5, 12, 13], [12, 5, 13], [1.5, 2, 2.5], [2, 1.5, 2.5], [0.6, 0.8, 1], [0.8, 0.6, 1]]);
          const vs = [4, 5, 6, 8, 10, 12, 15, 20, 25, 30].filter(v => Math.abs(v * v / ac - Math.round(v * v / ac)) < 1e-9);
          if (!vs.length) throw new Error('no speed');
          const v = R.pick(vs), r = Math.round(v * v / ac);
          const speedUp = R.bool();
          return {
            q: raw`A car moves on a circular track of radius $${r}\,\text{m}$. At the instant its speed is $${v}\,\text{m/s}$, it is ${speedUp ? 'speeding up' : 'slowing down'} at a rate of $${at}\,\text{m/s}^2$. What is the magnitude of its total acceleration at that instant?`,
            ...num(R, tot, [at + ac, ac, at, Math.abs(ac - at)], MS2, { fmt: x => F.num(x, 3) }),
            expl: raw`The centripetal part is $v^2/r = ${v * v}/${r} = ${ac}\,\text{m/s}^2$ and the tangential part is $${at}\,\text{m/s}^2$. They are perpendicular, so $a = \sqrt{${ac}^2 + ${at}^2} = ${tot}\,\text{m/s}^2$ (whether speeding up or slowing down).`,
          };
        }
        if (kind === 'wheel') {
          const rc = R.pick([10, 15, 20, 25, 30, 40, 50]), f = R.pick([2, 3, 4, 5, 10]);
          const a = 4 * Math.PI * Math.PI * f * f * rc / 100;
          return {
            q: raw`A wheel of radius $${rc}\,\text{cm}$ spins at a constant $${f}$ revolutions per second. Which of the following is closest to the magnitude of the acceleration of a point on its rim?`,
            ...num(R, a, [2 * Math.PI * f * f * rc / 100, 4 * Math.PI * Math.PI * f * rc / 100, Math.PI * Math.PI * f * f * rc / 100, 2 * Math.PI * f * rc / 100], MS2),
            expl: raw`$\omega = 2\pi f = ${N2(2 * Math.PI * f, 3)}\,\text{rad/s}$, and the rim point has centripetal acceleration $\omega^2 r = 4\pi^2 f^2 r \approx ${N2(a)}\,\text{m/s}^2$ (use $\pi^2 \approx 10$). There is no tangential acceleration at constant rate.`,
          };
        }
        if (kind === 'pend') {
          const a = R.pick([ANG[37], ANG[53], ANG[60], { d: 90, s: 1, c: 0 }]);
          const ang = a.d === 90 ? raw`the horizontal (string at $90^\circ$ to the vertical)` : isTheta(a) ? raw`an angle $\theta$ from the vertical, where $\cos\theta = ${a.c}$` : raw`$${a.d}^\circ$ from the vertical`;
          const atRelease = R.bool();
          const ans = atRelease ? a.s : 2 * (1 - a.c);
          const wr = atRelease ? [0, a.c, 2 * (1 - a.c), 1, 0.5 * a.s, a.s / a.c, 2 * a.s, 3 - 2 * a.c, 1 - a.c]
            : [0, 1, 2, 1 - a.c, a.c, 2 * a.c, 3 - 2 * a.c, 3 - 2 * a.c + 1, 4 * (1 - a.c), (1 - a.c) / 2];
          return {
            level: 3,
            q: raw`A simple pendulum is released from rest with its string at ${ang}. What is the magnitude of the bob’s acceleration ${atRelease ? 'just after it is released' : 'as it passes through the lowest point'}?`,
            ...mcv(R, ans, wr, cf('g')),
            expl: atRelease
              ? raw`At release $v = 0$, so there is no centripetal acceleration; the string force is perpendicular to the path and the tangential acceleration is $g\sin\theta_0 = ${coefTex(ans, 'g')}$.`
              : raw`At the bottom the tangential acceleration is zero, and the centripetal acceleration is $v^2/L = 2g(1 - \cos\theta_0) = ${coefTex(ans, 'g')}$, directed up toward the pivot.`,
          };
        }
        const TRUE = [
          'Its speed is constant.',
          'Its acceleration is directed toward the center of the circle.',
          'The net force on it does no work.',
          'Its kinetic energy is constant.',
          'Its velocity is perpendicular to its acceleration at every instant.',
          'The magnitude of its acceleration is $v^2/r$.',
          'Its angular momentum about the center of the circle is constant.',
        ];
        const FALSE = [
          'Its velocity is constant.',
          'Its acceleration is zero, since its speed does not change.',
          'Its linear momentum is constant.',
          'The net force on it points away from the center of the circle.',
          'Its acceleration is tangent to the circle.',
          'The net force on it is zero.',
          'The magnitude of its acceleration is $v^2 r$.',
        ];
        const nT = R.pick([1, 2, 2, 3]);
        const st = R.shuffle(R.pickN(TRUE, nT).map(x => [x, true]).concat(R.pickN(FALSE, 3 - nT).map(x => [x, false])));
        return {
          level: 1,
          q: GRE.romanStem('An object moves in a circle of radius $r$ at constant speed $v$. Which of the following statements about the object is (are) true?', st.map(x => x[0])),
          ...GRE.roman(R, st.map(x => x[1])),
          expl: 'In uniform circular motion the speed (and kinetic energy) is constant but the velocity, and hence the linear momentum, keeps changing direction. The acceleration $v^2/r$ points to the center, perpendicular to the velocity, so the net force does no work. ' +
            st.map((x, i) => `${['I', 'II', 'III'][i]}: ${x[1] ? 'true' : 'false'}.`).join(' '),
        };
      },
    },
    // ================================================================= 1.3 Energy
    {
      id: 'mech.energy.types', sec: '1.3.1', level: 1,
      gen(R) {
        const kind = R.pick(['sameP', 'sameK', 'pK', 'spring', 'work', 'work', 'fly']);
        if (kind === 'sameP' || kind === 'sameK') {
          const [A, B, k, note] = R.pick([
            ['proton', 'alpha particle', 4, raw` (Take $m_\alpha = 4m_p$.)`], ['neutron', 'deuteron', 2, raw` (Take $m_d = 2m_n$.)`],
            ['1000 kg car', '3000 kg truck', 3, ''], ['1500 kg car', '6000 kg truck', 4, ''], ['0.5 kg ball', '4.5 kg ball', 9, ''],
            ['2 kg cart', '8 kg cart', 4, ''], ['0.2 kg puck', '0.8 kg puck', 4, ''], ['1 kg block', '2 kg block', 2, ''],
            ['1 kg block', '16 kg block', 16, ''], ['5 kg block', '15 kg block', 3, ''], ['50 kg skater', '100 kg skater', 2, ''],
          ]);
          const lf = R.bool(); // ratio light/heavy?
          const [X, Y] = lf ? [A, B] : [B, A];
          if (kind === 'sameP') {
            const p = lf ? 1 : -1, ans = Math.pow(k, p);
            return {
              q: raw`${cap(art(A))} and ${art(B)} have momenta of the same magnitude.${note} What is the ratio of the kinetic energy of the ${X} to that of the ${Y}?`,
              ...mcv(R, ans, powWrongs(k, p).filter(x => x !== 1).concat([1]), fac),
              expl: raw`$K = p^2/2m$, so at equal momentum $K \propto 1/m$: the lighter object has ${k} times the kinetic energy. The ratio is $${ex(ans)}$.`,
            };
          }
          const p = lf ? -0.5 : 0.5, ans = Math.pow(k, p);
          return {
            level: 2,
            q: raw`${cap(art(A))} and ${art(B)} have the same kinetic energy.${note} What is the ratio of the magnitude of the momentum of the ${X} to that of the ${Y}?`,
            ...mcv(R, ans, powWrongs(k, p), fac),
            expl: raw`$p = \sqrt{2mK}$, so at equal kinetic energy $p \propto \sqrt{m}$. The ratio is $${ex(ans)}$.`,
          };
        }
        if (kind === 'pK') {
          const m = R.pick([0.5, 1, 2, 4, 5, 10]), p = R.pick([2, 3, 4, 6, 10, 12, 20]);
          const K = p * p / (2 * m);
          return {
            q: raw`An object of mass $${m}\,\text{kg}$ has momentum of magnitude $${p}\,\text{kg m/s}$. What is its kinetic energy?`,
            ...num(R, K, [p * p / m, p * p / (4 * m), p / (2 * m) * 10, m * p * p / 2], raw`\text{J}`),
            expl: raw`$K = \tfrac12 mv^2 = \dfrac{p^2}{2m} = \dfrac{${p}^2}{2(${m})} = ${N2(K, 3)}\,\text{J}$.`,
          };
        }
        if (kind === 'spring') {
          const E1 = R.pick([2, 4, 5, 6, 8, 10, 12, 20]), x1 = R.pick([2, 3, 4, 5, 10]);
          const x2 = R.pick([1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20].filter(x => x !== x1));
          const E2 = E1 * (x2 / x1) * (x2 / x1);
          return {
            q: raw`An ideal spring stores $${E1}\,\text{J}$ of potential energy when compressed by $${x1}\,\text{cm}$. ${ask(E2)} the energy it stores when compressed by $${x2}\,\text{cm}$?`,
            ...num(R, E2, [E1 * x2 / x1, E1 * Math.sqrt(x2 / x1), E1 * Math.pow(x2 / x1, 3), E1 * (x2 - x1) / x1 + E1 * 0.5], raw`\text{J}`),
            expl: raw`$U = \tfrac12 kx^2 \propto x^2$, so $U_2 = ${E1}\,\text{J}\times(${x2}/${x1})^2 \approx ${N2(E2)}\,\text{J}$.`,
          };
        }
        if (kind === 'work') {
          const k = R.pick([1.5, 2, 3, 4]);
          const kw = { 1.5: raw`$1.5v$`, 2: raw`$2v$`, 3: raw`$3v$`, 4: raw`$4v$` }[k];
          const ans = k * k - 1;
          const veh = R.pick(['car', 'cart', 'runner', 'sled', 'bicycle']);
          return {
            q: raw`It takes work $W$ to accelerate a ${veh} from rest to speed $v$. How much additional work is needed to accelerate it from $v$ to ${kw}? (Neglect friction and air resistance.)`,
            ...mcv(R, ans, [k - 1, k, k * k, (k - 1) * (k - 1), 2 * (k - 1), k * k + 1, (k * k - 1) / 2, 2 * k], cf('W')),
            expl: raw`By the work-energy theorem, work equals the change in $\tfrac12 mv^2$, which grows as $v^2$: from $v$ to ${kw} it is $(${k}^2 - 1)W = ${coefTex(ans, 'W')}$, not ${coefTex(k - 1, 'W') ? '$' + coefTex(k - 1, 'W') + '$' : ''}.`,
          };
        }
        const M = R.pick([2, 4, 5, 8, 10, 20]), Rr = R.pick([0.1, 0.2, 0.25, 0.3, 0.4, 0.5]), w = R.pick([10, 20, 30, 40, 50, 100]);
        const K = 0.25 * M * Rr * Rr * w * w;
        return {
          q: raw`A uniform solid disk of mass $${M}\,\text{kg}$ and radius $${Rr}\,\text{m}$ spins about its symmetry axis at $${w}\,\text{rad/s}$. ${ask(K)} its rotational kinetic energy?`,
          ...num(R, K, [2 * K, 4 * K, K / 2, 0.5 * M * Rr * w * w], raw`\text{J}`),
          expl: raw`$K = \tfrac12 I\omega^2$ with $I = \tfrac12 MR^2$: $K = \tfrac14 MR^2\omega^2 = ${N2(K, 3)}\,\text{J}$. Using $I = MR^2$ (a hoop) doubles it.`,
        };
      },
    },
    {
      id: 'mech.energy.force', sec: '1.3.1', level: 2,
      gen(R) {
        const kind = R.pick(['sym', 'sym', 'equil', 'num', 'num', 'grav', 'grav']);
        if (kind === 'sym') {
          const n = R.pick([2, 3, 4, 5, -1, -2, -3]);
          const sym = R.pick([raw`\alpha`, 'A', raw`\beta`, 'C', 'b']);
          const f = (c, p) => `$${mono(c, p, sym)}$`;
          const wr = [f(n, n - 1), n !== -1 ? f(-1 / (n + 1), n + 1) : raw`$-${sym}\ln x$`, f(-1, n - 1), f(-n, n), f(-n * (n - 1), n - 2), f(-n, n - 2), f(1, n)].filter(Boolean);
          return {
            q: raw`A particle moving along the $x$-axis has potential energy $U(x) = ${mono(1, n, sym)}$, where $${sym}$ is a positive constant. What is the force $F(x)$ on the particle?`,
            ...GRE.mc(R, f(-n, n - 1), wr),
            expl: raw`$F = -\dfrac{dU}{dx} = ${mono(-n, n - 1, sym)}$. Mind the minus sign: the force points toward lower potential energy.`,
          };
        }
        if (kind === 'equil') {
          const type = R.pick(['dw', 'dw', 'hill', 'cubic']);
          const askStable = R.bool();
          if (type === 'cubic') {
            const pos = raw`$x = +\sqrt{B/3A}$ only`, neg = raw`$x = -\sqrt{B/3A}$ only`;
            return {
              level: 3,
            q: raw`A particle moves along the $x$-axis in the potential $U(x) = Ax^3 - Bx$, where $A$ and $B$ are positive constants. Where is the particle in ${askStable ? 'stable' : 'unstable'} equilibrium?`,
              ...GRE.mc(R, askStable ? pos : neg, [askStable ? neg : pos, raw`$x = \pm\sqrt{B/3A}$`, raw`$x = 0$ only`, raw`$x = \pm\sqrt{B/A}$`, raw`$x = +\sqrt{3B/A}$ only`]),
              expl: raw`Equilibrium requires $U'(x) = 3Ax^2 - B = 0$, so $x = \pm\sqrt{B/3A}$. Since $U''(x) = 6Ax$, the point $x = +\sqrt{B/3A}$ is a minimum (stable) and $x = -\sqrt{B/3A}$ is a maximum (unstable).`,
            };
          }
          const dw = type === 'dw';
          const zero = raw`$x = 0$ only`, pm = raw`$x = \pm\sqrt{A/2B}$ only`;
          const right = dw === askStable ? pm : zero;
          return {
            q: raw`A particle moves along the $x$-axis in the potential $U(x) = ${dw ? raw`-Ax^2 + Bx^4` : raw`Ax^2 - Bx^4`}$, where $A$ and $B$ are positive constants. At which positions is the particle in ${askStable ? 'stable' : 'unstable'} equilibrium?`,
            ...GRE.mc(R, right, [right === pm ? zero : pm, raw`$x = 0$ and $x = \pm\sqrt{A/2B}$`, raw`$x = \pm\sqrt{A/B}$ only`, raw`$x = \pm\sqrt{2A/B}$ only`, 'There is no such position.']),
            expl: raw`$U'(x) = ${dw ? raw`-2Ax + 4Bx^3` : raw`2Ax - 4Bx^3`} = 0$ at $x = 0$ and $x = \pm\sqrt{A/2B}$. ${dw ? raw`Since $U''(0) = -2A < 0$, $x = 0$ is a maximum (unstable) and the outer points are minima (stable): a double well.` : raw`Since $U''(0) = 2A > 0$, $x = 0$ is a minimum (stable) and the outer points are maxima (unstable).`}`,
          };
        }
        if (kind === 'num') {
          const n = R.pick([2, 3]), c = R.int(1, 5), x0 = R.int(1, 3), sg = R.sign();
          const Fx = -sg * n * c * Math.pow(x0, n - 1);
          const opt = v => (v === 0 ? null : raw`$${Math.abs(v)}\,\text{N}$, in the $${v > 0 ? '+' : '-'}x$ direction`);
          const Uv = sg * c * Math.pow(x0, n);
          return {
            q: raw`The potential energy of a particle moving along the $x$-axis is $U(x) = ${sg < 0 ? '-' : ''}${c === 1 ? '' : c}x^{${n}}$, with $U$ in joules and $x$ in meters. What is the force on the particle when it is at $x = ${x0}\,\text{m}$?`,
            ...mcv(R, Fx, [-Fx, -Uv, Uv, Fx / n, -Fx / n, 2 * Fx, -sg * n * c * Math.pow(x0, n)], opt),
            expl: raw`$F = -dU/dx = ${sg < 0 ? '+' : '-'}${n * c === 1 ? '' : n * c}x${n - 1 === 1 ? '' : `^{${n - 1}}`}$, which at $x = ${x0}\,\text{m}$ is $${Fx}\,\text{N}$: magnitude $${Math.abs(Fx)}\,\text{N}$, pointing toward ${Fx < 0 ? '$-x$' : '$+x$'} (downhill in $U$).`,
          };
        }
        const [a, b] = R.pick([[1, 2], [1, 3], [1, 4], [2, 3], [2, 4], [1, 1.5], [3, 4], [2, 5], [1, 5], [3, 6]]);
        const pos = x => (x === 1 ? 'the planet’s surface' : raw`a distance $${F.num(x, 2)}R$ from the planet’s center`);
        const ans = 1 / a - 1 / b;
        return {
          q: raw`A planet has mass $M$ and radius $R$. By how much does the gravitational potential energy of an object of mass $m$ increase when it is moved from ${pos(a)} to ${pos(b)}?`,
          ...mcv(R, ans, [b - a, 1 / (a * a) - 1 / (b * b), 1 / b, ans / 2, 1 / a + 1 / b, 1 / a], cf(raw`\dfrac{GMm}{R}`)),
          expl: raw`With $U = -GMm/r$, $\Delta U = GMm\left(\dfrac{1}{${a === 1 ? '' : F.num(a, 2)}R} - \dfrac{1}{${F.num(b, 2)}R}\right) = ${coefTex(ans, raw`\dfrac{GMm}{R}`)}$. Using $mgh$ with the surface value of $g$ would overestimate it, since gravity weakens with height.`,
        };
      },
    },
    {
      id: 'mech.energy.concepts', sec: '1.3.1', level: 1,
      gen(R) {
        if (R.bool(0.3)) {
          const c = R.pick(['Kinetic friction on a block sliding across a floor', 'Air drag on a falling raindrop', 'The drag force of water on a moving boat', 'Kinetic friction between a car’s locked, skidding tires and the road']);
          return {
            q: 'Which of the following forces is NOT conservative?',
            ...GRE.mc(R, c, ['The gravitational force of the Earth on an orbiting satellite', 'The force exerted by an ideal spring', 'The electrostatic force between two point charges', 'The uniform gravitational force near the Earth’s surface', 'The Coulomb force on an electron due to a fixed nucleus']),
            expl: 'Friction and drag always oppose the motion, so their work around a closed path is negative rather than zero, and no potential energy can be defined for them. Gravity, ideal springs, and electrostatic forces all derive from potentials.',
          };
        }
        const TRUE = [
          'The work done by a conservative force around any closed path is zero.',
          'The work done by gravity on an object depends only on its initial and final heights, not on the path.',
          'A potential energy function can be defined for the force of an ideal spring.',
          'The zero of potential energy can be chosen freely without changing any predicted motion.',
          'A conservative force is related to its potential energy by $F_x = -dU/dx$.',
          'If only conservative forces do work on an object, its total mechanical energy stays constant.',
          'The work done by a conservative force equals the decrease in the associated potential energy.',
        ];
        const FALSE = [
          'The work done by kinetic friction around a closed path is zero.',
          'Kinetic friction is a conservative force because its magnitude is constant.',
          'The potential energy at a point has a unique value, independent of any choice of reference point.',
          'Mechanical energy is conserved whenever the net force on an object is zero.',
          'A conservative force always points in the direction of increasing potential energy.',
          'The work done by a conservative force equals the increase in the associated potential energy.',
          'The work done by gravity on a ball thrown upward is positive while the ball rises.',
        ];
        const st = roman3(R, TRUE, FALSE);
        return {
          q: GRE.romanStem('Which of the following statements about forces and potential energy is (are) true?', st.map(x => x[0])),
          ...GRE.roman(R, st.map(x => x[1])),
          expl: 'A force is conservative when its work is path-independent (zero around any closed loop); then $W = -\\Delta U$ and $F = -dU/dx$, and only differences in $U$ matter. Friction fails this test. ' + romanWhy(st),
        };
      },
    },
    {
      id: 'mech.energy.slide', sec: '1.3.2', level: 1, weight: 2,
      gen(R) {
        const kind = R.pick(['bottom', 'bottom', 'v0', 'v0', 'mid', 'launch', 'launch', 'ratio', 'hemi', 'hemi']);
        const SQ = [[0.2, 2], [0.45, 3], [0.8, 4], [1.25, 5], [1.8, 6], [2.45, 7], [3.2, 8], [4.05, 9], [5, 10], [7.2, 12], [11.25, 15], [20, 20]];
        const obj = R.pick(['block', 'puck', 'ice cube', 'crate', 'small box']);
        if (kind === 'bottom') {
          const [h, v] = R.pick(SQ);
          const m = R.pick([0.2, 0.5, 1, 2, 3, 5, 10]);
          const track = R.pick([
            raw`slides from rest down a frictionless quarter-circle track of radius $${h}\,\text{m}$, starting at the top`,
            raw`slides from rest down a frictionless curved track whose top is $${h}\,\text{m}$ above its bottom`,
            raw`is released from rest at the rim of a frictionless hemispherical bowl of radius $${h}\,\text{m}$ and slides down the inside`,
            raw`slides from rest down a frictionless ramp $${N2(h * R.pick([2, 3, 4]), 3)}\,\text{m}$ long whose top is $${h}\,\text{m}$ above its bottom`,
          ]);
          return {
            q: raw`A $${m}\,\text{kg}$ ${obj} ${track}. What is its speed at the bottom? ${USE_G}`,
            ...num(R, v, [Math.sqrt(g * h), 2 * v, v / 2, v * Math.SQRT2], raw`\text{m/s}`),
            expl: raw`Energy conservation: $mgh = \tfrac12 mv^2$, so $v = \sqrt{2gh} = \sqrt{2(10)(${h})} = ${v}\,\text{m/s}$. The mass and the shape of a frictionless track do not matter.`,
          };
        }
        if (kind === 'v0') {
          const [v0, s, res] = R.pick([[3, 4, 5], [6, 8, 10], [5, 12, 13], [8, 6, 10], [4, 3, 5], [9, 12, 15], [12, 5, 13], [8, 15, 17], [15, 8, 17], [12, 9, 15], [7, 24, 25], [16, 12, 20]]);
          const h = s * s / (2 * g);
          const [who, path] = R.pick([['skier', 'an icy (frictionless) slope'], ['roller-coaster car', 'a frictionless track'], ['sled', 'a frictionless icy hill'], ['skateboarder', 'a smooth ramp (neglect friction)']]);
          return {
            q: raw`A ${who} moving at $${v0}\,\text{m/s}$ starts down ${path} and descends a vertical height of $${N2(h, 3)}\,\text{m}$. What is the speed at the bottom? ${USE_G}`,
            ...num(R, res, [v0 + s, s, Math.sqrt(v0 * v0 + g * h), v0], raw`\text{m/s}`, { fmt: x => F.num(x, 3) }),
            expl: raw`$\tfrac12 mv_0^2 + mgh = \tfrac12 mv^2$ gives $v = \sqrt{v_0^2 + 2gh} = \sqrt{${v0 * v0} + ${s * s}} = ${res}\,\text{m/s}$. Speeds do not add: $${v0} + \sqrt{2gh} = ${v0 + s}$ is wrong.`,
          };
        }
        if (kind === 'mid') {
          const [dh, v] = R.pick(SQ.slice(0, 10));
          const h2 = R.pick([1, 2, 3, 4, 5, 6, 8, 10]), h1 = +(dh + h2).toFixed(2);
          return {
            q: raw`A roller-coaster car starts from rest at a height of $${h1}\,\text{m}$ above the ground on a frictionless track. What is its speed when it passes a point on the track $${h2}\,\text{m}$ above the ground? ${USE_G}`,
            ...num(R, v, [Math.sqrt(2 * g * h1), Math.sqrt(2 * g * h2), Math.sqrt(2 * g * (h1 + h2)), Math.sqrt(g * dh)], raw`\text{m/s}`),
            expl: raw`Only the drop in height matters: $v = \sqrt{2g(h_1 - h_2)} = \sqrt{2(10)(${N2(dh, 3)})} = ${v}\,\text{m/s}$, whatever the shape of the track in between.`,
          };
        }
        if (kind === 'launch') {
          if (R.bool(0.3)) {
            return {
              level: 2,
              q: raw`A ${obj} slides from rest down a frictionless ramp, dropping a height $h$. The bottom of the ramp is horizontal and ends at the edge of a table of height $H$, so the ${obj} leaves the table moving horizontally. How far from the foot of the table does it land?`,
              ...GRE.mc(R, raw`$2\sqrt{hH}$`, [raw`$\sqrt{hH}$`, raw`$\sqrt{2hH}$`, raw`$4\sqrt{hH}$`, raw`$2\sqrt{2hH}$`, raw`$h + H$`, raw`$\sqrt{h^2 + H^2}$`]),
              expl: raw`Energy gives the launch speed $v = \sqrt{2gh}$; the fall time is $t = \sqrt{2H/g}$ (kinematics). The distance is $vt = \sqrt{2gh}\sqrt{2H/g} = 2\sqrt{hH}$, independent of $g$.`,
            };
          }
          const h = R.pick([0.2, 0.45, 0.8, 1.25, 1.8, 3.2]), H = R.pick([0.45, 0.8, 1.25, 1.8, 2.45, 5]);
          const d = 2 * Math.sqrt(h * H);
          return {
            level: 2,
            q: raw`A ${obj} slides from rest down a frictionless ramp, dropping a height of $${h}\,\text{m}$. The bottom of the ramp is horizontal and ends at the edge of a table $${H}\,\text{m}$ high, so the ${obj} leaves the table moving horizontally. ${ask(d)} the horizontal distance from the edge of the table to where it lands? ${USE_G}`,
            ...num(R, d, [Math.sqrt(h * H), Math.sqrt(2 * h * H), 4 * Math.sqrt(h * H), h + H], raw`\text{m}`),
            expl: raw`Launch speed $v = \sqrt{2gh} = ${N2(Math.sqrt(2 * g * h), 3)}\,\text{m/s}$; fall time $t = \sqrt{2H/g} = ${N2(Math.sqrt(2 * H / g), 3)}\,\text{s}$. Distance $vt = 2\sqrt{hH} \approx ${N2(d)}\,\text{m}$.`,
          };
        }
        if (kind === 'ratio') {
          const k = R.pick([2, 3, 4, 9, 16]);
          const mA = R.pick([1, 2, 3]), mB = R.pick([1, 2, 4, 5]);
          return {
            q: raw`Block A (mass $${mA}\,\text{kg}$) is released from rest at height $h$ on a frictionless track, and block B (mass $${mB}\,\text{kg}$) from rest at height $${k}h$ on an identical track. What is the ratio $v_B/v_A$ of their speeds at the bottom?`,
            ...mcv(R, Math.sqrt(k), [k, k * k, 1, Math.sqrt(k * mA / mB), Math.sqrt(k * mB / mA), k * mA / mB, 1 / Math.sqrt(k)], fac),
            expl: raw`$v = \sqrt{2gh}$ is independent of mass, so $v_B/v_A = \sqrt{${k}} = ${ex(Math.sqrt(k))}$.`,
          };
        }
        const r = R.pick([0.6, 0.9, 1.2, 1.5, 1.8, 2.4, 3, 4.5, 6, 9]);
        const askH = R.bool(0.6);
        if (askH) {
          return {
            level: 3,
            q: raw`A small ${obj} is given a tiny nudge from rest at the top of a frictionless hemispherical dome of radius $${r}\,\text{m}$ resting on the ground, and slides down the outside of the dome. At what height above the ground does it lose contact with the dome?`,
            ...num(R, 2 * r / 3, [r / 2, 3 * r / 4, r / 3, r / Math.SQRT2, 5 * r / 6], raw`\text{m}`),
            expl: raw`At angle $\theta$ from the top, $v^2 = 2gr(1 - \cos\theta)$ and the radial equation is $mg\cos\theta - N = mv^2/r$. Contact is lost when $N = 0$: $\cos\theta = 2(1 - \cos\theta)$, so $\cos\theta = 2/3$ and the height is $\tfrac23 r = ${N2(2 * r / 3)}\,\text{m}$.`,
          };
        }
        const v = Math.sqrt(2 * g * r / 3);
        return {
          level: 3,
          q: raw`A small ${obj} is given a tiny nudge from rest at the top of a frictionless hemispherical dome of radius $${r}\,\text{m}$ and slides down the outside of the dome. ${ask(v)} its speed at the moment it loses contact with the dome? ${USE_G}`,
          ...num(R, v, [Math.sqrt(g * r), Math.sqrt(2 * g * r), Math.sqrt(g * r / 2), Math.sqrt(g * r / 3)], raw`\text{m/s}`),
          expl: raw`It leaves the surface where $mg\cos\theta = mv^2/r$ with $v^2 = 2gr(1 - \cos\theta)$, i.e. $\cos\theta = 2/3$. Then $v = \sqrt{gr\cos\theta} = \sqrt{2gr/3} \approx ${N2(v)}\,\text{m/s}$.`,
        };
      },
    },
    {
      id: 'mech.energy.spring', sec: '1.3.2', level: 2,
      gen(R) {
        const kind = R.pick(['launch', 'launch', 'height', 'slide', 'scale', 'drop']);
        if (kind === 'launch') {
          const k = R.pick([100, 200, 400, 500, 800, 1000, 1600]), m = R.pick([0.1, 0.2, 0.25, 0.5, 1, 2]), xc = R.pick([2, 4, 5, 8, 10, 15, 20]);
          const v = (xc / 100) * Math.sqrt(k / m);
          return {
            level: 1,
            q: raw`A $${m}\,\text{kg}$ block on a frictionless horizontal surface is pushed against a spring of force constant $${k}\,\text{N/m}$, compressing it by $${xc}\,\text{cm}$, and released. ${ask(v)} the speed of the block after it leaves the spring?`,
            ...num(R, v, [v / Math.SQRT2, v * Math.SQRT2, v * v, 2 * v, (xc / 100) * k / m], raw`\text{m/s}`),
            expl: raw`$\tfrac12 kx^2 = \tfrac12 mv^2$, so $v = x\sqrt{k/m} = ${F.num(xc / 100, 2)}\sqrt{${k}/${m}} \approx ${N2(v)}\,\text{m/s}$. Convert centimeters to meters first.`,
          };
        }
        if (kind === 'height') {
          const k = R.pick([200, 400, 500, 800, 1000, 2000]), m = R.pick([0.05, 0.1, 0.2, 0.25, 0.5]), xc = R.pick([2, 4, 5, 8, 10]);
          const x = xc / 100, h = k * x * x / (2 * m * g);
          return {
            q: raw`A toy launcher contains a spring of force constant $${k}\,\text{N/m}$. It is compressed by $${xc}\,\text{cm}$ and used to fire a $${m}\,\text{kg}$ ball straight up. Neglecting air resistance and the mass of the spring, how high above its release point does the ball rise? ${USE_G}`,
            ...num(R, h, [2 * h, h / 2, k * x / (2 * m * g), Math.sqrt(h)], raw`\text{m}`),
            expl: raw`All of the spring energy becomes gravitational energy at the top: $\tfrac12 kx^2 = mgh$, so $h = \dfrac{kx^2}{2mg} = ${N2(h, 3)}\,\text{m}$.`,
          };
        }
        if (kind === 'slide') {
          const k = R.pick([100, 200, 400, 500, 800, 1000, 2000]), m = R.pick([0.5, 1, 2, 4, 5]), h = R.pick([0.2, 0.5, 1, 1.25, 2, 2.5, 5]);
          const x = Math.sqrt(2 * m * g * h / k) * 100;
          return {
            q: raw`A $${m}\,\text{kg}$ block slides from rest down a frictionless ramp from a height of $${h}\,\text{m}$ and then along a frictionless horizontal floor into a spring of force constant $${k}\,\text{N/m}$. ${ask(x)} the maximum compression of the spring? ${USE_G}`,
            ...num(R, x, [x / Math.SQRT2, x * Math.SQRT2, 100 * m * g / k, x * x / 100], raw`\text{cm}`),
            expl: raw`$mgh = \tfrac12 kx^2$, so $x = \sqrt{2mgh/k} \approx ${N2(x)}\,\text{cm}$. The intermediate speed never needs to be computed.`,
          };
        }
        if (kind === 'scale') {
          const k = R.pick([2, 3, 4]);
          const kw = { 2: 'doubled', 3: 'tripled', 4: 'quadrupled' }[k];
          const CASES = [
            [`the compression of the spring is ${kw}`, 'launch speed of the block', 1, raw`$v = x\sqrt{k/m} \propto x$`],
            [`the compression of the spring is ${kw}`, 'height the block reaches on a frictionless incline', 2, raw`$mgh = \tfrac12 kx^2 \propto x^2$`],
            [`the spring is replaced by one whose force constant is ${kw} (same compression)`, 'launch speed of the block', 0.5, raw`$v = x\sqrt{k/m} \propto \sqrt{k}$`],
            [`the block is replaced by one whose mass is ${kw} (same spring, same compression)`, 'launch speed of the block', -0.5, raw`$v = x\sqrt{k/m} \propto 1/\sqrt{m}$`],
            [`the block is replaced by one whose mass is ${kw} (same spring, same compression)`, 'kinetic energy of the block after launch', 0, raw`the kinetic energy equals $\tfrac12 kx^2$, whatever the mass`],
            [`the block is replaced by one whose mass is ${kw} (same spring, same compression)`, 'height the block reaches on a frictionless incline', -1, raw`$mgh = \tfrac12 kx^2$ gives $h \propto 1/m$`],
          ];
          const [chg, qty, p, why] = R.pick(CASES);
          const ans = Math.pow(k, p);
          const fmt = x => (x === 1 ? 'It is unchanged.' : (ex(x) == null ? null : `It is multiplied by $${ex(x)}$.`));
          return {
            q: raw`A block on a frictionless surface is launched by a compressed spring. If ${chg}, by what factor does the ${qty} change?`,
            ...mcv(R, ans, powWrongs(k, p), fmt),
            expl: raw`Energy conservation: ${why}, so the ${qty} ${mult(ans)}.`,
          };
        }
        // drop onto a vertical spring: mg(h + x) = kx^2/2
        const m = R.pick([0.5, 1, 2]), k = R.pick([200, 400, 500, 800, 1000]), x = R.pick([0.1, 0.2, 0.25, 0.3, 0.4, 0.5]);
        const h = +(k * x * x / (2 * m * g) - x).toFixed(3);
        if (h <= 0.05 || Math.abs(h * 100 - Math.round(h * 100)) > 1e-6) throw new Error('bad drop height');
        return {
          level: 3,
          q: raw`A $${m}\,\text{kg}$ ball is dropped from rest $${h}\,\text{m}$ above the top of a vertical spring of force constant $${k}\,\text{N/m}$ and lands on it. Neglecting air resistance, what is the maximum compression of the spring? ${USE_G}`,
          ...num(R, x, [Math.sqrt(2 * m * g * h / k), m * g / k, 2 * m * g / k, Math.sqrt(m * g * h / k)], raw`\text{m}`, { fmt: v => F.num(v, 2) }),
          expl: raw`The ball falls a total height $h + x$ before stopping: $mg(h + x) = \tfrac12 kx^2$. With the numbers, $${m * g}(${h} + x) = ${k / 2}x^2$, whose positive root is $x = ${x}\,\text{m}$. Forgetting the extra drop $x$ gives $\sqrt{2mgh/k}$, too small.`,
        };
      },
    },
    {
      id: 'mech.energy.pendulum', sec: '1.3.2', level: 2,
      gen(R) {
        const kind = R.pick(['speed', 'speed', 'ten', 'ten', 'max', 'tAng']);
        const P90 = { d: 90, s: 1, c: 0 };
        const angTxt = a => (a.d === 90 ? 'horizontal' : isTheta(a) ? raw`at an angle $\theta$ to the vertical, where $\cos\theta = ${a.c}$` : raw`at $${a.d}^\circ$ to the vertical`);
        if (kind === 'speed') {
          const a = R.pick([ANG[37], ANG[53], ANG[60], P90]);
          const L = R.pick([0.5, 0.8, 1, 1.25, 1.6, 2, 2.5, 3.2, 5]);
          const v = Math.sqrt(2 * g * L * (1 - a.c));
          return {
            level: 1,
            q: raw`A simple pendulum of length $${L}\,\text{m}$ is released from rest with its string ${angTxt(a)}. ${ask(v)} the speed of the bob at the lowest point? ${USE_G}`,
            ...num(R, v, [Math.sqrt(2 * g * L), a.c ? Math.sqrt(2 * g * L * a.c) : null, Math.sqrt(g * L * (1 - a.c)), Math.sqrt(2 * g * L * a.s), 2 * v], raw`\text{m/s}`),
            expl: raw`The bob drops a height $L(1 - \cos\theta_0) = ${N2(L * (1 - a.c), 3)}\,\text{m}$, so $v = \sqrt{2gL(1 - \cos\theta_0)} \approx ${N2(v)}\,\text{m/s}$.`,
          };
        }
        if (kind === 'ten') {
          const a = R.pick([ANG[37], ANG[53], ANG[60], P90, P90]);
          const ans = 3 - 2 * a.c;
          if (R.bool()) {
            return {
              q: raw`A simple pendulum with a bob of mass $m$ is released from rest with its string ${angTxt(a)}. What is the tension in the string as the bob passes through the lowest point?`,
              ...mcv(R, ans, [1, 2 * (1 - a.c), 2 - a.c, 3, 1 + 2 * a.c, 2 * ans, 1 + (1 - a.c), ans + 1, 0.5 * ans].filter(x => Math.abs(x - ans) > 1e-9), cf('mg')),
              expl: raw`At the bottom $v^2 = 2gL(1 - \cos\theta_0)$ and $T - mg = mv^2/L$, so $T = mg(3 - 2\cos\theta_0) = ${coefTex(ans, 'mg')}$. Forgetting the weight term gives $${coefTex(2 * (1 - a.c), 'mg')}$.`,
            };
          }
          const m = R.pick([0.1, 0.2, 0.5, 1, 2, 4]);
          const T = m * g * ans;
          return {
            q: raw`A $${m}\,\text{kg}$ pendulum bob on a light string is released from rest with the string ${angTxt(a)}. What is the tension in the string as the bob passes through the lowest point? ${USE_G}`,
            ...num(R, T, [m * g, m * g * 2 * (1 - a.c), m * g * 3, m * g * (2 - a.c), m * g * (1 + 2 * a.c)].filter(x => Math.abs(x - T) > 1e-9), raw`\text{N}`),
            expl: raw`$T - mg = mv^2/L$ with $v^2 = 2gL(1 - \cos\theta_0)$ gives $T = mg(3 - 2\cos\theta_0) = ${N2(T, 3)}\,\text{N}$, independent of the string length.`,
          };
        }
        if (kind === 'max') {
          const to90 = R.bool();
          const v = R.pick([2, 3, 4, 5, 6]);
          const L = to90 ? v * v / (2 * g) : v * v / g; // 1 - cos = v^2/2gL
          const deg = to90 ? 90 : 60;
          const opts = [30, 45, 60, 90, 120, 180].filter(d => d !== deg).map(d => raw`$${d}^\circ$`);
          return {
            q: raw`A pendulum bob hangs at rest on a light string of length $${N2(L, 3)}\,\text{m}$. It is given a horizontal speed of $${v}\,\text{m/s}$. Through what maximum angle from the vertical does the string swing? ${USE_G}`,
            ...GRE.mc(R, raw`$${deg}^\circ$`, opts, { rank: s => parseFloat(s.slice(1)) }),
            expl: raw`The bob rises $h = v^2/2g = ${N2(v * v / (2 * g), 3)}\,\text{m}$, and $h = L(1 - \cos\theta_{\max})$, so $\cos\theta_{\max} = ${to90 ? 0 : '1/2'}$ and $\theta_{\max} = ${deg}^\circ$.`,
          };
        }
        const a = R.pick([ANG[30], ANG[37], ANG[45], ANG[53], ANG[60]]);
        const ans = 3 * a.c;
        return {
          level: 3,
          q: raw`A simple pendulum with bob mass $m$ is released from rest with its string horizontal. What is the tension in the string when the string makes ${isTheta(a) ? raw`an angle $\theta$ with the vertical, where $\cos\theta = ${a.c}$` : raw`an angle of $${a.d}^\circ$ with the vertical`}?`,
          ...mcv(R, ans, [a.c, 2 * a.c, 3, 2, 3 - 2 * a.c, 1 + 2 * a.c, 3 * a.s], cf('mg')),
          expl: raw`The bob has dropped $L\cos\theta$, so $v^2 = 2gL\cos\theta$. Radially, $T - mg\cos\theta = mv^2/L = 2mg\cos\theta$, so $T = 3mg\cos\theta = ${coefTex(ans, 'mg')}$.`,
        };
      },
    },
    {
      id: 'mech.energy.pivot', sec: '1.3.2', level: 3,
      gen(R) {
        const kind = R.pick(['sym', 'sym', 'sym', 'num', 'ratio']);
        if (kind === 'sym') {
          const CASES = [
            [raw`a uniform rod of length $L$, pivoted at one end and released from rest in a horizontal position`, 3, 'L', raw`$I = \tfrac13 ML^2$ and the center of mass drops $L/2$`],
            [raw`a uniform rod of length $L$, standing upright on a frictionless hinge at its lower end, which tips over from (nearly) vertical`, 3, 'L', raw`$I = \tfrac13 ML^2$ about the hinge and the center of mass drops $L/2$ by the time the rod is horizontal`],
            [raw`a uniform rod of length $L$, pivoted at a point $L/4$ from one end and released from rest in a horizontal position`, 24 / 7, 'L', raw`$I = \tfrac1{12}ML^2 + M(L/4)^2 = \tfrac{7}{48}ML^2$ and the center of mass drops $L/4$`],
            [raw`a uniform disk of radius $R$, free to rotate in its vertical plane about a horizontal axis through a point on its rim, released from rest with its center level with the axis`, 4 / 3, 'R', raw`$I = \tfrac12 MR^2 + MR^2 = \tfrac32 MR^2$ and the center drops $R$`],
            [raw`a thin hoop of radius $R$, free to rotate in its vertical plane about a horizontal axis through a point on the hoop, released from rest with its center level with the axis`, 1, 'R', raw`$I = MR^2 + MR^2 = 2MR^2$ and the center drops $R$`],
          ];
          const [desc, c, sym, why] = R.pick(CASES);
          const where = /tips over/.test(desc) ? 'when it reaches the horizontal' : 'when its center of mass is directly below the axis';
          const fmt = x => { const r = F.toRational(x, 64); return r ? `$${sqrtTex(r[0], r[1], 'g', sym)}$` : null; };
          return {
            q: raw`Consider ${desc}. What is its angular speed ${where}?`,
            ...mcv(R, c, [3, 24 / 7, 4 / 3, 1, 2, 6, 12, 1.5, 4].filter(x => Math.abs(x - c) > 1e-9), fmt),
            expl: raw`Energy: $Mg\,\Delta h_{\text{cm}} = \tfrac12 I_{\text{pivot}}\omega^2$, where ${why}. This gives $\omega = ${sqrtTex(F.toRational(c, 64)[0], F.toRational(c, 64)[1], 'g', sym)}$. Using the center-of-mass moment of inertia, or treating the body as a point mass, gives a wrong answer.`,
          };
        }
        if (kind === 'num') {
          const L = R.pick([0.6, 1.2, 1.5, 2, 2.4, 3, 4.8, 5.4]);
          const v = Math.sqrt(3 * g * L);
          const obj = R.pick(['uniform rod', 'uniform plank', 'uniform pole']);
          return {
            q: raw`A ${obj} of length $${L}\,\text{m}$ stands vertically on the ground and falls over, its lower end staying in place (it pivots without slipping). ${ask(v)} the speed of its upper end just before it hits the ground? ${USE_G}`,
            ...num(R, v, [Math.sqrt(2 * g * L), Math.sqrt(g * L), Math.sqrt(6 * g * L), Math.sqrt(1.5 * g * L)], raw`\text{m/s}`),
            expl: raw`The center of mass falls $L/2$: $Mg\tfrac{L}{2} = \tfrac12\left(\tfrac13 ML^2\right)\omega^2$, so $\omega = \sqrt{3g/L}$ and the tip moves at $\omega L = \sqrt{3gL} \approx ${N2(v)}\,\text{m/s}$ — faster than a freely falling object ($\sqrt{2gL}$).`,
          };
        }
        return {
          q: raw`Pendulum A is a uniform rod of length $L$ pivoted at one end. Pendulum B is a small heavy ball on the end of a massless rod of length $L$. Both are released from rest in a horizontal position. What is the ratio $v_A/v_B$ of the speeds of the free ends of the two rods as they pass through the lowest point?`,
          ...mcv(R, Math.sqrt(1.5), [1, 1.5, 2 / 3, Math.sqrt(2 / 3), Math.sqrt(3), 0.5, 2], sqrtRatio),
          expl: raw`Rod: $Mg\tfrac L2 = \tfrac12\cdot\tfrac13ML^2\omega^2$ gives $v_A = \sqrt{3gL}$. Point mass: $v_B = \sqrt{2gL}$. So $v_A/v_B = \sqrt{3/2}$ — the uniform rod’s tip moves faster, because its center of mass falls only $L/2$ but its moment of inertia is only $\tfrac13 ML^2$.`,
        };
      },
    },
    {
      id: 'mech.roll.speed', sec: '1.3.3', level: 2, weight: 2,
      gen(R) {
        const o = R.pick(ROLLERS), b = bval(o), [bn, bd] = o.b;
        const kind = R.pick(['sym', 'num', 'num', 'frac', 'acc', 'up', 'ratio']);
        const vsq = 2 / (1 + b); // v^2 = vsq * g h
        const itx = o.name === 'thin spherical shell' ? raw` (moment of inertia ${Itex(o)} about its center)` : '';
        const bf = F.frac(bn, bd);
        const ener = raw`$Mgh = \tfrac12 Mv^2 + \tfrac12 I\omega^2$ with $\omega = v/R$ and $I = ${coefTex(b, 'MR^2')}$ gives $Mgh = \tfrac12\left(1 + ${bf}\right)Mv^2$`;
        const otherV = ROLLERS.filter(x => x !== o).map(x => 2 / (1 + bval(x)));
        if (kind === 'sym') {
          const fmt = x => { const r = F.toRational(x, 64); return r ? `$${sqrtTex(r[0], r[1], 'gh')}$` : null; };
          return {
            q: raw`A ${o.name} of mass $M$ and radius $R$${itx} is released from rest and rolls without slipping down an incline, descending a vertical height $h$. What is the speed of its center at the bottom?`,
            ...mcv(R, vsq, otherV.concat([2, 0.5]), fmt),
            expl: raw`${ener}, so $v = ${sqrtTex(2 * bd, bn + bd, 'gh')}$. $M$ and $R$ cancel. $\sqrt{2gh}$ would apply only to an object sliding without friction.`,
          };
        }
        if (kind === 'num') {
          const h = R.pick([0.35, 0.7, 1, 1.4, 2, 2.1, 2.8, 3.5, 4.2, 5, 7]);
          const v = Math.sqrt(vsq * g * h);
          const m = R.pick([0.5, 1, 2, 3, 5]), rc = R.pick([5, 10, 12, 15, 20]);
          return {
            q: raw`A ${o.name}${itx} of mass $${m}\,\text{kg}$ and radius $${rc}\,\text{cm}$ starts from rest and rolls without slipping down a ramp, descending a vertical height of $${h}\,\text{m}$. ${ask(v)} its speed at the bottom? ${USE_G}`,
            ...num(R, v, [Math.sqrt(2 * g * h), Math.sqrt(g * h)].concat(otherV.map(x => Math.sqrt(x * g * h))), raw`\text{m/s}`, { tol: 0.05 }),
            expl: raw`${ener}, so $v = \sqrt{${F.frac(2 * bd, bn + bd)}\,gh} \approx ${N2(v)}\,\text{m/s}$, independent of the mass and radius.`,
          };
        }
        if (kind === 'frac') {
          const ans = b / (1 + b);
          const asRatio = R.bool(0.3);
          if (asRatio) {
            return {
              level: 1,
              q: raw`A ${o.name}${itx} rolls without slipping along a level floor. What is the ratio of its rotational kinetic energy to its translational kinetic energy?`,
              ...mcv(R, b, [1, 0.5, 0.4, 2 / 3, 2 / 7, 1 / 3, 2 / 5, 0.25, 2].filter(x => Math.abs(x - b) > 1e-9), fac),
              expl: raw`$K_{\text{rot}}/K_{\text{trans}} = \dfrac{\tfrac12 I\omega^2}{\tfrac12 Mv^2} = \dfrac{I}{MR^2} = ${bf}$, using $\omega = v/R$.`,
            };
          }
          return {
            q: raw`A ${o.name}${itx} rolls without slipping along a level floor. What fraction of its total kinetic energy is rotational?`,
            ...mcv(R, ans, [0.5, 1 / 3, 2 / 7, 2 / 5, 2 / 3, 0.25, 1 / (1 + b), b].filter(x => Math.abs(x - ans) > 1e-9), fac),
            expl: raw`$K_{\text{rot}} = \tfrac12 I\omega^2 = ${bf}\cdot\tfrac12 Mv^2$, so $K_{\text{rot}}/K_{\text{tot}} = \dfrac{${bf}}{1 + ${bf}} = ${F.frac(bn, bn + bd)}$.`,
          };
        }
        if (kind === 'acc') {
          const a = R.pick(ALL_ANG);
          const acc = g * a.s / (1 + b);
          return {
            q: raw`A ${o.name}${itx} rolls without slipping down an incline ${atAng(a, 'to the horizontal')}. ${ask(acc)} the acceleration of its center? ${USE_G}`,
            ...num(R, acc, [g * a.s, g * a.s * b / (1 + b), g * a.c / (1 + b)].concat(ROLLERS.filter(x => x !== o).map(x => g * a.s / (1 + bval(x)))), MS2, { tol: 0.05 }),
            expl: raw`Along the incline $Mg\sin\theta - f = Ma$, and the friction torque gives $fR = I a/R$, so $f = ${bf}Ma$. Hence $a = \dfrac{g\sin\theta}{1 + ${bf}} \approx ${N2(acc)}\,\text{m/s}^2$.`,
          };
        }
        if (kind === 'up') {
          const v = R.pick([2, 3, 4, 5, 6, 7, 8, 10]);
          const h = (1 + b) * v * v / (2 * g);
          return {
            q: raw`A ${o.name}${itx} rolls without slipping along a level floor at $${v}\,\text{m/s}$ and then rolls up an incline without slipping. ${ask(h)} the maximum vertical height it reaches? ${USE_G}`,
            ...num(R, h, [v * v / (2 * g), b * v * v / (2 * g), (1 + b) * v * v / g].concat(ROLLERS.filter(x => x !== o).map(x => (1 + bval(x)) * v * v / (2 * g))), raw`\text{m}`, { tol: 0.05 }),
            expl: raw`All the kinetic energy, translational plus rotational, becomes potential energy: $\tfrac12(1 + ${bf})Mv^2 = Mgh$, so $h = \dfrac{(1 + ${bf})v^2}{2g} \approx ${N2(h)}\,\text{m}$ — higher than a frictionless sliding block would go.`,
          };
        }
        const o2 = R.pick(ROLLERS.filter(x => bval(x) !== b)), b2 = bval(o2);
        const r = Math.sqrt((1 + b2) / (1 + b));
        return {
          q: raw`A ${o.name} and a ${o2.name}${o2.name === 'thin spherical shell' ? raw` (with ${Itex(o2)})` : ''} are each released from rest at the top of the same incline and roll without slipping. What is the ratio of the speed of the ${SHORT[o.name]} to the speed of the ${SHORT[o2.name]} at the bottom?`,
          ...mcv(R, r, [1 / r, r * r, 1 / (r * r), 1, b2 / b, Math.sqrt(b2 / b)], sqrtRatio),
          expl: raw`For each, $v^2 = 2gh/(1 + \beta)$ with $I = \beta MR^2$. So $v_1/v_2 = \sqrt{(1 + \beta_2)/(1 + \beta_1)} = \sqrt{(1 + ${F.frac(o2.b[0], o2.b[1])})/(1 + ${bf})}$; masses and radii cancel.`,
        };
      },
    },
    {
      id: 'mech.roll.race', sec: '1.3.3', level: 2,
      gen(R) {
        const kind = R.pick(['rank', 'rank', 'rank', 'fric', 'two', 'roman', 'roman']);
        const desc = o => raw`a $${R.pick([0.5, 1, 2, 3, 4, 5])}\,\text{kg}$ ${o.name} of radius $${R.pick([4, 5, 8, 10, 15, 20, 25])}\,\text{cm}$`;
        if (kind === 'rank' || kind === 'fric') {
          const three = R.pickN(ROLLERS, 3);
          const sorted = three.slice().sort((x, y) => bval(x) - bval(y));
          const perms = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]].map(p => cap(p.map(i => SHORT[sorted[i].name]).join(', then ')));
          const same = 'All three arrive at the same time.';
          const right = kind === 'rank' ? perms[0] : same;
          return {
            q: raw`Three objects — ${three.map(desc).join(', ')} — are released together from rest at the same height on ${kind === 'rank' ? 'an incline, and each rolls without slipping' : 'a perfectly frictionless incline, so that each slides without rotating'}. In what order do they reach the bottom (first to last)?`,
            ...GRE.mc(R, right, perms.concat([same]).filter(x => x !== right)),
            expl: kind === 'rank'
              ? raw`Rolling objects have $a = g\sin\theta/(1 + \beta)$ with $I = \beta MR^2$, independent of mass and radius. Smaller $\beta$ means less energy tied up in rotation: sphere ($\tfrac25$) beats cylinder ($\tfrac12$), which beats spherical shell ($\tfrac23$), which beats hoop ($1$).`
              : raw`With no friction there is no torque about the center, so nothing starts rotating: every object slides with $a = g\sin\theta$ and they arrive together.`,
          };
        }
        if (kind === 'two') {
          const o = R.pick(ROLLERS);
          const [m1, m2] = R.pickN([0.5, 1, 2, 3, 5, 8], 2), [r1, r2] = R.pickN([3, 5, 8, 10, 20, 30], 2);
          return {
            q: raw`Two ${o.name}s are released together from rest at the top of the same incline, and both roll without slipping. One has mass $${m1}\,\text{kg}$ and radius $${r1}\,\text{cm}$; the other has mass $${m2}\,\text{kg}$ and radius $${r2}\,\text{cm}$. Which reaches the bottom first?`,
            ...GRE.mc(R, 'They arrive at the same time.', [
              raw`The $${Math.max(m1, m2)}\,\text{kg}$ one`, raw`The $${Math.min(m1, m2)}\,\text{kg}$ one`,
              raw`The one with radius $${Math.max(r1, r2)}\,\text{cm}$`, raw`The one with radius $${Math.min(r1, r2)}\,\text{cm}$`,
              'It depends on the angle of the incline.',
            ]),
            expl: raw`For any rolling body with $I = \beta MR^2$, $a = g\sin\theta/(1 + \beta)$; mass and radius cancel. Two objects of the same shape have the same $\beta$ and stay side by side.`,
          };
        }
        const TRUE = [
          'The point of the object touching the incline is instantaneously at rest.',
          'The static friction force does no work on the object.',
          'The friction force on the object points up the incline.',
          'Its speed at the bottom does not depend on its mass.',
          'Its speed at the bottom does not depend on its radius.',
          'The topmost point of the object moves at twice the speed of its center.',
          'A solid sphere released alongside a hoop reaches the bottom first.',
        ];
        const FALSE = [
          'Kinetic friction at the contact point dissipates part of the mechanical energy.',
          'On a frictionless incline the object would still roll without slipping.',
          'Its speed at the bottom is $\\sqrt{2gh}$, where $h$ is the height descended.',
          'The friction force on the object points down the incline.',
          'The heavier of two otherwise identical cylinders reaches the bottom first.',
          'Every point of the object moves with the speed of its center.',
          'Its kinetic energy at the bottom is entirely translational.',
        ];
        const st = roman3(R, TRUE, FALSE);
        return {
          level: 1,
          q: GRE.romanStem('A round object starts from rest and rolls without slipping down a fixed incline. Which of the following is (are) true?', st.map(x => x[0])),
          ...GRE.roman(R, st.map(x => x[1])),
          expl: 'In rolling without slipping the contact point is momentarily at rest, so static friction (which points up the slope and supplies the torque) does no work; it only diverts energy into rotation, giving $v = \\sqrt{2gh/(1 + \\beta)}$ independent of $M$ and $R$. ' + romanWhy(st),
        };
      },
    },
    {
      id: 'mech.roll.dynamics', sec: '1.3.3', level: 3,
      gen(R) {
        const kind = R.pick(['fric', 'mu', 'yoyo', 'yoyoT', 'bowl', 'bowl', 'bowlK']);
        if (kind === 'yoyo' || kind === 'yoyoT') {
          const o = R.pick([{ name: 'uniform solid cylinder', b: 0.5 }, { name: 'thin-walled hollow cylinder', b: 1 }]);
          const b = o.b;
          const stem = raw`A light string is wrapped many times around a ${o.name} of mass $M$ and radius $R$. The free end of the string is tied to the ceiling, and the cylinder is released from rest so that it falls as the string unwinds, with the string vertical.`;
          if (kind === 'yoyo') {
            const ans = 1 / (1 + b);
            return {
              q: raw`${stem} What is the acceleration of the cylinder’s center?`,
              ...mcv(R, ans, [1, 0.5, 1 / 3, 2 / 3, 0.75, b / (1 + b), 0.25].filter(x => Math.abs(x - ans) > 1e-9), cf('g')),
              expl: raw`$Mg - T = Ma$ and $TR = I\alpha = ${coefTex(b, 'MR^2')}(a/R)$, so $T = ${coefTex(b, 'Ma')}$ and $a = \dfrac{g}{1 + ${F.frac(b * 2, 2)}} = ${coefTex(ans, 'g')}$.`,
            };
          }
          const ans = b / (1 + b);
          return {
            q: raw`${stem} What is the tension in the string?`,
            ...mcv(R, ans, [1, 0.5, 1 / 3, 2 / 3, 0, 0.25, 1 / (1 + b)].filter(x => Math.abs(x - ans) > 1e-9), cf('Mg')),
            expl: raw`Translation: $Mg - T = Ma$. Rotation: $TR = I a/R$ with $I = ${coefTex(b, 'MR^2')}$, so $T = ${coefTex(b, 'Ma')}$. Solving, $a = g/(1 + \beta)$ and $T = \dfrac{\beta}{1 + \beta}Mg = ${coefTex(ans, 'Mg')}$.`,
          };
        }
        const o = R.pick(ROLLERS), b = bval(o), bf = F.frac(o.b[0], o.b[1]);
        const itx = o.name === 'thin spherical shell' ? raw` (${Itex(o)})` : '';
        const others = ROLLERS.filter(x => x !== o).map(x => bval(x) / (1 + bval(x)));
        if (kind === 'fric' || kind === 'mu') {
          const ans = b / (1 + b);
          const isF = kind === 'fric';
          return {
            q: isF
              ? raw`A ${o.name}${itx} of mass $M$ rolls without slipping down a fixed incline that makes an angle $\theta$ with the horizontal. What is the magnitude of the friction force exerted on it by the incline?`
              : raw`A ${o.name}${itx} is placed on a fixed incline that makes an angle $\theta$ with the horizontal and released. What is the minimum coefficient of static friction for which it rolls without slipping?`,
            ...mcv(R, ans, [b, 1 / (1 + b), 1].concat(others), cf(isF ? raw`Mg\sin\theta` : raw`\tan\theta`)),
            expl: raw`$Mg\sin\theta - f = Ma$ and $fR = I\alpha = \beta MRa$ give $f = \beta Ma$ and $a = g\sin\theta/(1 + \beta)$, so $f = \dfrac{\beta}{1 + \beta}Mg\sin\theta$ with $\beta = ${bf}$.${isF ? '' : raw` Rolling requires $f \le \mu_s Mg\cos\theta$, so $\mu_s \ge \dfrac{\beta}{1 + \beta}\tan\theta$.`}`,
          };
        }
        if (kind === 'bowl') {
          const ans = 1 / (1 + b);
          if (R.bool(0.6)) {
            const v0 = R.pick([2, 3, 4, 5, 6, 7, 8, 9, 10, 12]);
            return {
              q: raw`A ${o.name}${itx} is launched along a level floor at $${v0}\,\text{m/s}$ with no initial rotation. Kinetic friction from the floor slows its sliding and spins it up until it rolls without slipping. ${ask(ans * v0)} its speed once it is rolling without slipping?`,
              ...num(R, ans * v0, [v0, Math.sqrt(ans) * v0, v0 * b / (1 + b)].concat(ROLLERS.filter(x => x !== o).map(x => v0 / (1 + bval(x)))), raw`\text{m/s}`, { tol: 0.05 }),
              expl: raw`Friction acts at the contact point, so angular momentum about a fixed point on the floor is conserved: $Mv_0R = (1 + \beta)MvR$, giving $v = v_0/(1 + \beta) = ${coefTex(ans, 'v_0')} \approx ${N2(ans * v0)}\,\text{m/s}$ ($\beta = ${bf}$). Energy is not conserved here.`,
            };
          }
          const sq = x => { const e = ex(x); if (e != null) return `$${coefTex(x, 'v_0')}$`; const r = F.toRational(x * x, 64); return r ? raw`$\sqrt{${F.frac(r[0], r[1])}}\,v_0$` : null; };
          return {
            q: raw`A ${o.name}${itx} is launched along a level floor with speed $v_0$ and no initial rotation. Kinetic friction from the floor slows its sliding and spins it up until it rolls without slipping. What is its speed once it is rolling without slipping?`,
            ...mcv(R, ans, [1, Math.sqrt(ans), b / (1 + b), 0.5].concat(ROLLERS.filter(x => x !== o).map(x => 1 / (1 + bval(x)))), sq),
            expl: raw`Friction acts at the contact point, so angular momentum about a fixed point on the floor is conserved: $Mv_0R = MvR + I\omega = (1 + \beta)MvR$. Thus $v = v_0/(1 + \beta) = ${coefTex(ans, 'v_0')}$ with $\beta = ${bf}$. Energy is not conserved (kinetic friction dissipates), so $\sqrt{1/(1 + \beta)}\,v_0$ is wrong.`,
          };
        }
        const ans = b / (1 + b);
        return {
          q: raw`A ${o.name}${itx} is launched along a level floor with speed $v_0$ and no initial rotation. Kinetic friction from the floor eventually brings it to rolling without slipping. What fraction of its initial kinetic energy has been dissipated by then?`,
          ...mcv(R, ans, [0, 1 / (1 + b), b, 0.5].concat(others.map(x => x)), fac),
          expl: raw`Angular momentum about a point on the floor gives the final speed $v = v_0/(1 + \beta)$. The final kinetic energy is $\tfrac12(1 + \beta)Mv^2 = \dfrac{\tfrac12 Mv_0^2}{1 + \beta}$, so the fraction lost is $\dfrac{\beta}{1 + \beta} = ${F.frac(o.b[0], o.b[0] + o.b[1])}$.`,
        };
      },
    },
    {
      id: 'mech.roll.kinem', sec: '1.3.3', level: 1,
      gen(R) {
        const kind = R.pick(['top', 'front', 'rev', 'omega', 'ke', 'ke']);
        const v = R.pick([4, 5, 6, 8, 10, 12, 15, 20, 25, 30]);
        if (kind === 'top' || kind === 'front') {
          const veh = R.pick(['bicycle', 'car', 'cart', 'skateboard']);
          const top = kind === 'top';
          const ans = top ? 2 * v : Math.SQRT2 * v;
          return {
            q: raw`A ${veh} moves at $${v}\,\text{m/s}$ on level ground, and its wheels roll without slipping. ${ask(ans)} the speed, relative to the ground, of ${top ? 'the point at the top of a wheel' : 'a point on the rim of a wheel that is level with the axle (at the front of the wheel)'}?`,
            ...num(R, ans, top ? [v, Math.SQRT2 * v, v / 2, 3 * v] : [v, 2 * v, v / Math.SQRT2, 0.5 * v], raw`\text{m/s}`),
            expl: top
              ? raw`Rolling without slipping is instantaneous rotation about the contact point. The top is $2R$ from it, so it moves at $2\omega R = 2v = ${2 * v}\,\text{m/s}$ (the contact point itself is at rest).`
              : raw`Add the center’s velocity $v$ (forward) and the rotational velocity $\omega R = v$ (downward at the front). The two are perpendicular, giving $\sqrt2\,v \approx ${N2(ans)}\,\text{m/s}$.`,
          };
        }
        if (kind === 'rev') {
          const D = R.pick([50, 60, 64, 70, 80]), d = R.pick([100, 200, 300, 500, 1000]);
          const n = d / (Math.PI * D / 100);
          return {
            q: raw`A wheel of diameter $${D}\,\text{cm}$ rolls without slipping a distance of $${d}\,\text{m}$. Which of the following is closest to the number of revolutions it makes?`,
            ...num(R, n, [n / 2, 2 * n, d / (D / 100), n * Math.PI], '', { fmt: x => F.num(x, 2) }),
            expl: raw`Each revolution moves the wheel forward one circumference, $\pi D = ${N2(Math.PI * D / 100, 3)}\,\text{m}$. So $N = ${d}/${N2(Math.PI * D / 100, 3)} \approx ${N2(n)}$.`,
          };
        }
        if (kind === 'omega') {
          const rc = R.pick([10, 20, 25, 30, 40, 50]);
          const w = v / (rc / 100);
          return {
            q: raw`A wheel of radius $${rc}\,\text{cm}$ rolls without slipping with its center moving at $${v}\,\text{m/s}$. What is its angular speed?`,
            ...num(R, w, [w / 2, 2 * w, w / (2 * Math.PI), v * rc / 100], raw`\text{rad/s}`),
            expl: raw`Rolling without slipping: $v = \omega R$, so $\omega = v/R = ${v}/${F.num(rc / 100, 2)} = ${N2(w, 3)}\,\text{rad/s}$.`,
          };
        }
        const o = R.pick(ROLLERS), b = bval(o);
        const m = R.pick([0.5, 1, 2, 4, 5, 10]), vv = R.pick([2, 3, 4, 5, 6]);
        const K = 0.5 * (1 + b) * m * vv * vv;
        return {
          q: raw`A $${m}\,\text{kg}$ ${o.name}${o.name === 'thin spherical shell' ? raw` (${Itex(o)})` : ''} rolls without slipping along a level floor at $${vv}\,\text{m/s}$. ${ask(K)} its total kinetic energy?`,
          ...num(R, K, [0.5 * m * vv * vv, 0.5 * b * m * vv * vv, (1 + b) * m * vv * vv].concat(ROLLERS.filter(x => x !== o).map(x => 0.5 * (1 + bval(x)) * m * vv * vv)), raw`\text{J}`, { tol: 0.05 }),
          expl: raw`$K = \tfrac12 Mv^2 + \tfrac12 I\omega^2 = \tfrac12\left(1 + ${F.frac(o.b[0], o.b[1])}\right)Mv^2 = ${N2(K, 3)}\,\text{J}$, using $\omega = v/R$.`,
        };
      },
    },
    {
      id: 'mech.work.friction', sec: '1.3.4', level: 2, weight: 2,
      gen(R) {
        const kind = R.pick(['ramp', 'ramp', 'floor', 'floorT', 'incline', 'incline', 'diss', 'ratio']);
        const obj = R.pick(['block', 'crate', 'box', 'puck', 'sled']);
        if (kind === 'ramp') {
          const h = R.pick([0.5, 0.8, 1, 1.2, 1.5, 2, 2.5, 3, 4, 5]), mu = R.pick([0.1, 0.2, 0.25, 0.3, 0.4, 0.5, 0.6]);
          const d = h / mu;
          return {
            level: 1,
            q: raw`A ${obj} slides from rest down a frictionless curved ramp, dropping a height of $${h}\,\text{m}$, and then moves onto a rough horizontal floor where the coefficient of kinetic friction is $${mu}$. ${ask(d)} the distance it slides along the floor before stopping?`,
            ...num(R, d, [mu * h, h / (2 * mu), 2 * h / mu, h / (mu * mu)], raw`\text{m}`),
            expl: raw`Work-energy from start to finish: $mgh - \mu_k mg\,d = 0$, so $d = h/\mu_k = ${N2(d, 3)}\,\text{m}$. No need to find the speed at the bottom of the ramp, and the mass cancels.`,
          };
        }
        if (kind === 'floor' || kind === 'floorT') {
          const v = R.pick([2, 3, 4, 5, 6, 8, 10, 12]), mu = R.pick([0.1, 0.2, 0.25, 0.3, 0.4, 0.5]);
          if (kind === 'floor') {
            const d = v * v / (2 * mu * g);
            return {
              level: 1,
              q: raw`A ${obj} slides across a level floor with an initial speed of $${v}\,\text{m/s}$. The coefficient of kinetic friction is $${mu}$. ${ask(d)} the distance it slides before stopping? ${USE_G}`,
              ...num(R, d, [v * v / (mu * g), v * v / (2 * g), mu * v * v / (2 * g), v / (2 * mu * g) * 10], raw`\text{m}`),
              expl: raw`Friction does work $-\mu_k mg\,d$, which removes all the kinetic energy: $\mu_k mgd = \tfrac12 mv^2$, so $d = v^2/2\mu_k g = ${N2(d, 3)}\,\text{m}$.`,
            };
          }
          const t = v / (mu * g);
          return {
            q: raw`A ${obj} slides across a level floor with an initial speed of $${v}\,\text{m/s}$. The coefficient of kinetic friction is $${mu}$. ${ask(t)} the time it takes to stop? ${USE_G}`,
            ...num(R, t, [2 * t, t / 2, v / g, v * v / (2 * mu * g)], raw`\text{s}`),
            expl: raw`Friction gives a constant deceleration $\mu_k g = ${N2(mu * g)}\,\text{m/s}^2$, so $t = v/\mu_k g = ${N2(t, 3)}\,\text{s}$. A question about time calls for kinematics (or impulse), not energy.`,
          };
        }
        if (kind === 'incline') {
          const a = R.pick(ALL_ANG);
          const cot = a.c / a.s;
          const mu = R.pick([0.1, 0.15, 0.2, 0.25, 0.3, 0.4].filter(x => 1 - x * cot >= 0.25));
          const h = R.pick([1, 1.5, 2, 2.5, 3, 4, 5]);
          const v = Math.sqrt(2 * g * h * (1 - mu * cot));
          return {
            q: raw`A ${obj} starts from rest at a height of $${h}\,\text{m}$ above the bottom of a ramp and slides down. The ramp is inclined ${atAng(a, 'to the horizontal')}. The coefficient of kinetic friction is $${mu}$. ${ask(v)} its speed at the bottom? ${USE_G}`,
            ...num(R, v, [Math.sqrt(2 * g * h), 1 - mu * a.s / a.c > 0 ? Math.sqrt(2 * g * h * (1 - mu * a.s / a.c)) : null, Math.sqrt(2 * g * h * (1 - mu)), Math.sqrt(2 * g * h * (1 + mu * cot))], raw`\text{m/s}`, { tol: 0.06 }),
            expl: raw`The ramp is $h/\sin\theta$ long and friction is $\mu_k mg\cos\theta$, so $W_f = -\mu_k mgh\cot\theta$. Then $\tfrac12 mv^2 = mgh(1 - \mu_k\cot\theta)$ and $v \approx ${N2(v)}\,\text{m/s}$.`,
          };
        }
        if (kind === 'diss') {
          const m = R.pick([0.5, 1, 2, 3, 4, 5, 10, 20]), h = R.pick([2, 3, 4, 5, 8, 10, 12, 20]);
          const v = R.pick([2, 3, 4, 5, 6, 8, 10, 12].filter(x => x * x < 0.8 * 2 * g * h));
          const E = m * g * h - 0.5 * m * v * v;
          return {
            q: raw`A $${m}\,\text{kg}$ ${obj} is released from rest at the top of a rough curved slide $${h}\,\text{m}$ high and reaches the bottom with a speed of $${v}\,\text{m/s}$. How much mechanical energy was dissipated by friction? ${USE_G}`,
            ...num(R, E, [m * g * h, 0.5 * m * v * v, m * g * h + 0.5 * m * v * v, 0.5 * m * Math.pow(Math.sqrt(2 * g * h) - v, 2)], raw`\text{J}`, { sig: 3 }),
            expl: raw`Work-energy: $E_i + W_f = E_f$, so $|W_f| = mgh - \tfrac12 mv^2 = ${N2(m * g * h, 3)} - ${N2(0.5 * m * v * v, 3)} = ${N2(E, 3)}\,\text{J}$.`,
          };
        }
        const k = R.pick([2, 3, 4]);
        const kw = { 2: 'doubled', 3: 'tripled', 4: 'quadrupled' }[k];
        const qd = R.bool(0.7);
        return {
          q: raw`A hockey puck slides to rest on rough ice, traveling a distance $d$ in a time $t$. If its initial speed were ${kw}, with the same coefficient of kinetic friction, what would the ${qd ? 'stopping distance' : 'stopping time'} be?`,
          ...mcv(R, qd ? k * k : k, [k, k * k, Math.sqrt(k), k * k * k, 1].filter(x => x !== (qd ? k * k : k)), cf(qd ? 'd' : 't')),
          expl: qd
            ? raw`$\mu_k mgd = \tfrac12 mv^2$, so $d \propto v^2$: the distance becomes $${coefTex(k * k, 'd')}$.`
            : raw`The deceleration $\mu_k g$ is constant, so $t = v/\mu_k g \propto v$: the time becomes $${coefTex(k, 't')}$.`,
        };
      },
    },
    {
      id: 'mech.work.variable', sec: '1.3.4', level: 2,
      gen(R) {
        const kind = R.pick(['pow', 'pow', 'spring', 'spring', 'speed', 'graph', 'graph']);
        if (kind === 'pow' || kind === 'speed') {
          const n = R.pick([1, 2, 3]), c = R.int(1, 6);
          const Ftex = raw`F(x) = ${c === 1 ? '' : c}x${n === 1 ? '' : `^{${n}}`}`;
          if (kind === 'pow') {
            const x1 = R.pick([0, 0, 1]), x2 = R.int(x1 + 1, 4);
            const W = c * (Math.pow(x2, n + 1) - Math.pow(x1, n + 1)) / (n + 1);
            return {
              q: raw`A force $${Ftex}$, with $F$ in newtons and $x$ in meters, acts on a particle in the $+x$ direction. ${ask(W)} the work done by the force as the particle moves from $x = ${x1}$ to $x = ${x2}\,\text{m}$?`,
              ...num(R, W, [c * Math.pow(x2, n) * (x2 - x1), c * (Math.pow(x2, n + 1) - Math.pow(x1, n + 1)), c * (Math.pow(x2, n + 1) - Math.pow(x1, n + 1)) / n, c * (Math.pow(x2, n) - Math.pow(x1, n))], raw`\text{J}`, { fmt: x => F.num(x, 3), tol: 0.08 }),
              expl: raw`For a position-dependent force, $W = \int F\,dx = ${F.frac(c, n + 1)}\left[x^{${n + 1}}\right]_{${x1}}^{${x2}} \approx ${N2(W, 3)}\,\text{J}$. Multiplying the final force by the distance overestimates it.`,
            };
          }
          const L = R.int(1, 3), m = R.pick([0.5, 1, 2, 4]);
          const W = c * Math.pow(L, n + 1) / (n + 1), v = Math.sqrt(2 * W / m);
          return {
            q: raw`A $${m}\,\text{kg}$ particle starts from rest at $x = 0$ on a frictionless horizontal track. A force $${Ftex}$ (in newtons, with $x$ in meters) acts on it in the $+x$ direction. ${ask(v)} its speed when it reaches $x = ${L}\,\text{m}$?`,
            ...num(R, v, [Math.sqrt(2 * c * Math.pow(L, n + 1) / m), Math.sqrt(W / m), Math.sqrt(2 * c * Math.pow(L, n) / m), 2 * W / m], raw`\text{m/s}`),
            expl: raw`$W = \int_0^{${L}} F\,dx = ${N2(W, 3)}\,\text{J}$, and $W = \tfrac12 mv^2$ gives $v = \sqrt{2W/m} \approx ${N2(v)}\,\text{m/s}$.`,
          };
        }
        if (kind === 'spring') {
          const k = R.pick([50, 100, 200, 400, 500, 800]), x1 = R.pick([0, 5, 10]), x2 = R.pick([10, 15, 20, 25, 30].filter(x => x > x1));
          const W = 0.5 * k * (x2 * x2 - x1 * x1) / 1e4;
          return {
            q: raw`How much work is needed to stretch a spring of force constant $${k}\,\text{N/m}$ ${x1 ? raw`from an extension of $${x1}\,\text{cm}$` : 'from its natural length'} to an extension of $${x2}\,\text{cm}$?`,
            ...num(R, W, [0.5 * k * (x2 - x1) * (x2 - x1) / 1e4, 0.5 * k * x2 * x2 / 1e4, k * (x2 * x2 - x1 * x1) / 1e4, k * x2 * (x2 - x1) / 1e4], raw`\text{J}`, { fmt: x => F.num(x, 3), tol: 0.08 }),
            expl: raw`$W = \int kx\,dx = \tfrac12 k(x_2^2 - x_1^2) = \tfrac12(${k})(${F.num(x2 / 100, 2)}^2 - ${F.num(x1 / 100, 2)}^2) = ${N2(W, 3)}\,\text{J}$.${x1 ? raw` Note $\tfrac12 k(x_2 - x_1)^2$ is wrong: the force is already $kx_1$ at the start.` : ''}`,
          };
        }
        const F0 = R.pick([2, 4, 5, 6, 8, 10, 12, 20]), a = R.int(1, 2), b = a + R.int(1, 3), c = b + R.int(1, 3);
        const W = F0 * (b + c - a) / 2;
        return {
          fig: figForce(F0, a, b, c),
          q: raw`A single force acts on an object moving along the $x$-axis. As shown in the graph, it increases linearly from $0$ at $x = 0$ to $${F0}\,\text{N}$ at $x = ${a}\,\text{m}$, stays at $${F0}\,\text{N}$ until $x = ${b}\,\text{m}$, and then decreases linearly to zero at $x = ${c}\,\text{m}$. How much work does the force do from $x = 0$ to $x = ${c}\,\text{m}$?`,
          ...num(R, W, [F0 * c, F0 * (b - a), F0 * c / 2, F0 * b, F0 * (c - a)], raw`\text{J}`, { fmt: x => F.num(x, 3), tol: 0.06 }),
          expl: raw`Work is the area under the $F$–$x$ curve: two triangles and a rectangle, $\tfrac12(${a})(${F0}) + (${b - a})(${F0}) + \tfrac12(${c - b})(${F0}) = ${F.num(W, 3)}\,\text{J}$.`,
        };
      },
    },
    {
      id: 'mech.work.power', sec: '1.3.4', level: 2,
      gen(R) {
        const kind = R.pick(['lift', 'hill', 'time', 'drag', 'stairs']);
        if (kind === 'lift') {
          const m = R.pick([50, 100, 200, 250, 400, 500, 1000]), v = R.pick([0.5, 1, 1.5, 2, 2.5, 4]);
          const P = m * g * v;
          return {
            level: 1,
            q: raw`A motor lifts a $${m}\,\text{kg}$ load straight up at a constant speed of $${v}\,\text{m/s}$. ${ask(P)} the power does the motor deliver to the load? ${USE_G}`,
            ...num(R, P, [m * v, 0.5 * m * v * v, P / 2, 2 * P], raw`\text{W}`),
            expl: raw`At constant speed the lifting force equals the weight, so $P = Fv = mgv = ${m * g}\times ${v} = ${N2(P, 3)}\,\text{W}$.`,
          };
        }
        if (kind === 'hill') {
          const m = R.pick([1000, 1200, 1500, 2000]), v = R.pick([10, 15, 20, 25]), [s, desc] = R.pick([[0.05, '5 m for every 100 m'], [0.1, '1 m for every 10 m'], [0.2, '1 m for every 5 m'], [0.08, '8 m for every 100 m']]);
          const P = m * g * v * s;
          return {
            q: raw`A $${m}\,\text{kg}$ car drives at a constant $${v}\,\text{m/s}$ up a straight road that rises ${desc} traveled along the road. Neglecting friction and air resistance, what power must the engine deliver? ${USE_G}`,
            ...num(R, P / 1000, [m * g * v / 1000, P / 2000, 0.5 * m * v * v / 1000, m * g * s / 1000 * 10], raw`\text{kW}`),
            expl: raw`The engine must supply the rate of gain of potential energy: $P = mg\,v\sin\theta = ${m}(10)(${v})(${s}) = ${N2(P / 1000, 3)}\,\text{kW}$.`,
          };
        }
        if (kind === 'time') {
          const Pk = R.pick([20, 40, 50, 60, 80, 100]), m = R.pick([800, 1000, 1200, 1500, 2000]), v = R.pick([10, 15, 20, 25, 30]);
          const t = m * v * v / (2 * Pk * 1000);
          return {
            q: raw`A $${m}\,\text{kg}$ car starts from rest, and its engine delivers a constant power of $${Pk}\,\text{kW}$ to the car. Neglecting friction and air resistance, ${ask(t).toLowerCase()} the time needed to reach $${v}\,\text{m/s}$?`,
            ...num(R, t, [2 * t, t / 2, m * v / (Pk * 1000), 4 * t], raw`\text{s}`),
            expl: raw`Constant power means $Pt = \Delta K = \tfrac12 mv^2$, so $t = mv^2/2P = ${N2(t, 3)}\,\text{s}$. (The force is not constant, so constant-acceleration kinematics does not apply.)`,
          };
        }
        if (kind === 'drag') {
          const k = R.pick([1.5, 2, 3]);
          const lin = R.bool(0.3);
          const ans = lin ? k * k : k * k * k;
          return {
            q: raw`A vehicle moves at constant speed on level ground, and the only resistive force is air drag ${lin ? 'proportional to its speed' : 'proportional to the square of its speed'}. By what factor must the power delivered by the engine increase for the vehicle to travel at ${k === 1.5 ? '1.5' : k} times the speed?`,
            ...mcv(R, ans, [k, k * k, k * k * k, k * k * k * k, Math.sqrt(k)], fac),
            expl: raw`At constant speed the engine force equals the drag $F \propto v^{${lin ? 1 : 2}}$, and $P = Fv \propto v^{${lin ? 2 : 3}}$, so the power grows by $${ex(ans)}$.`,
          };
        }
        const m = R.pick([50, 60, 70, 80, 90]), h = R.pick([3, 4, 5, 6, 8, 10, 12, 15]), t = R.pick([4, 5, 6, 8, 10, 12, 15, 20]);
        const P = m * g * h / t;
        return {
          level: 1,
          q: raw`A $${m}\,\text{kg}$ person runs up a flight of stairs, rising $${h}\,\text{m}$ vertically in $${t}\,\text{s}$. ${ask(P)} the average power expended against gravity? ${USE_G}`,
          ...num(R, P, [m * h / t, 2 * P, m * g * h * t, P / 2], raw`\text{W}`),
          expl: raw`$P = \Delta U/t = mgh/t = ${m}(10)(${h})/${t} \approx ${N2(P)}\,\text{W}$.`,
        };
      },
    },
    {
      id: 'mech.work.sign', sec: '1.3.4', level: 1,
      gen(R) {
        const ITEMS = [
          ['the normal force on a block sliding down a fixed incline', 'zero'],
          ['gravity on a ball thrown upward, while the ball rises', 'neg'],
          ['the tension in the string on the bob of a swinging simple pendulum', 'zero'],
          ['the static friction force on a ball rolling without slipping across a fixed floor', 'zero'],
          ['kinetic friction on a block sliding across a fixed floor', 'neg'],
          ['the magnetic force on a charged particle moving through a magnetic field', 'zero'],
          ['gravity on a falling apple', 'pos'],
          ['the net force on a car moving at constant speed around a circular track', 'zero'],
          ['the force of a compressed spring on a block as the spring pushes the block back toward equilibrium', 'pos'],
          ['the upward force of an elevator floor on a passenger while the elevator rises', 'pos'],
          ['the Sun’s gravity on a planet in a circular orbit', 'zero'],
          ['air drag on a falling raindrop', 'neg'],
          ['the force of a person’s hands on a heavy box that the person lowers slowly to the floor', 'neg'],
          ['the static friction force from a truck bed on a crate that rides along without slipping while the truck speeds up', 'pos'],
          ['the tension in a rope used to pull a sled forward across the snow', 'pos'],
          ['the force of the road on the tires of a car that is braking to a stop without skidding', 'neg'],
        ];
        const cat = R.pick(['zero', 'zero', 'neg', 'pos']);
        const word = { zero: 'zero', neg: 'negative', pos: 'positive' }[cat];
        const yes = ITEMS.filter(x => x[1] === cat), no = ITEMS.filter(x => x[1] !== cat);
        const nT = R.pick([1, 2, 2, 3]);
        const st = R.shuffle(R.pickN(yes, nT).map(x => [cap(x[0]) + '.', true]).concat(R.pickN(no, 3 - nT).map(x => [cap(x[0]) + '.', false])));
        return {
          q: GRE.romanStem(`In which of the following cases does the stated force do ${word} work on the object (in the ground frame) while the motion described takes place?`, st.map(x => x[0])),
          ...GRE.roman(R, st.map(x => x[1])),
          expl: 'Work is $W = \\int \\mathbf{F}\\cdot d\\mathbf{r}$: positive when the force has a component along the displacement, negative when opposite to it, and zero when the force is perpendicular to the motion or its point of application does not move (as for static friction at a rolling contact). ' +
            st.map((x, i) => `${['I', 'II', 'III'][i]}: ${x[1] ? 'yes' : 'no'}.`).join(' '),
        };
      },
    },
    // ================================================================= 1.4 Momentum
    {
      id: 'mech.coll.inelastic', sec: '1.4.1', level: 1, weight: 2,
      gen(R) {
        const kind = R.pick(['speed', 'speed', 'frac', 'head', 'loss', 'sym']);
        const [o1, o2] = R.pick([['cart', 'cart'], ['railroad car', 'railroad car'], ['ball of clay', 'ball of clay'], ['hockey player', 'hockey player'], ['block', 'block']]);
        const m1 = R.int(1, 10), m2 = R.int(1, 10), M = m1 + m2;
        const unit = o1 === 'railroad car' ? 1000 : o1 === 'hockey player' ? 10 : 1;
        const mt = x => raw`$${x * unit}\,\text{kg}$`;
        if (kind === 'speed' || kind === 'loss') {
          const v1 = R.pick([2, 3, 4, 5, 6, 8, 10, 12]);
          const v = m1 * v1 / M;
          if (kind === 'speed') {
            return {
              q: raw`A ${mt(m1)} ${o1} moving at $${v1}\,\text{m/s}$ collides with a stationary ${mt(m2)} ${o2} on a frictionless surface, and the two stick together. ${ask(v)} their speed just after the collision?`,
              ...num(R, v, [v1, m1 * v1 / m2, v1 / 2, Math.sqrt(m1 / M) * v1, m2 * v1 / M], raw`\text{m/s}`),
              expl: raw`Momentum is conserved (kinetic energy is not): $m_1v_1 = (m_1 + m_2)v$, so $v = \dfrac{${m1 * unit}}{${M * unit}}(${v1}) \approx ${N2(v)}\,\text{m/s}$.`,
            };
          }
          const Kl = 0.5 * m1 * unit * v1 * v1 * m2 / M;
          return {
            level: 2,
            q: raw`A ${mt(m1)} ${o1} moving at $${v1}\,\text{m/s}$ collides with a stationary ${mt(m2)} ${o2} on a frictionless surface, and the two stick together. ${ask(Kl)} the kinetic energy lost in the collision?`,
            ...num(R, Kl, [0.5 * m1 * unit * v1 * v1, 0.5 * m1 * unit * v1 * v1 * m1 / M, 0.5 * M * unit * v * v, 0], raw`\text{J}`),
            expl: raw`Final speed $v = m_1v_1/(m_1 + m_2)$. The lost energy is $\tfrac12 m_1v_1^2 - \tfrac12(m_1 + m_2)v^2 = \tfrac12 m_1v_1^2\cdot\dfrac{m_2}{m_1 + m_2} \approx ${N2(Kl)}\,\text{J}$.`,
          };
        }
        if (kind === 'frac') {
          const ans = m2 / M;
          return {
            level: 2,
            q: raw`A ${mt(m1)} ${o1} moving on a frictionless surface collides with a stationary ${mt(m2)} ${o2}, and they stick together. What fraction of the initial kinetic energy is lost in the collision?`,
            ...mcv(R, ans, [m1 / M, 0, 0.5, m2 / m1, (m1 / M) * (m1 / M), 1 - (m2 / M) * (m2 / M)], fac),
            expl: raw`$K_f/K_i = \dfrac{(m_1v_1)^2/2(m_1 + m_2)}{m_1v_1^2/2} = \dfrac{m_1}{m_1 + m_2}$, so the fraction lost is $\dfrac{m_2}{m_1 + m_2} = ${F.frac(m2, M)}$.`,
          };
        }
        if (kind === 'head') {
          const v1 = R.pick([2, 3, 4, 5, 6, 8]), v2 = R.pick([1, 2, 3, 4, 5, 6]);
          const P = m1 * v1 - m2 * v2;
          if (P === 0) throw new Error('zero');
          const v = Math.abs(P) / M;
          return {
            level: 2,
            q: raw`Two ${o1 === o2 ? o1 + 's' : 'objects'} move toward each other on a frictionless surface: one of mass ${mt(m1)} at $${v1}\,\text{m/s}$ and the other of mass ${mt(m2)} at $${v2}\,\text{m/s}$. They collide head-on and stick together. ${ask(v)} their speed after the collision?`,
            ...num(R, v, [(m1 * v1 + m2 * v2) / M, Math.abs(v1 - v2) / 2, Math.abs(v1 - v2), (v1 + v2) / 2], raw`\text{m/s}`),
            expl: raw`Momenta have opposite signs: $p = ${m1 * unit}(${v1}) - ${m2 * unit}(${v2}) = ${P * unit}\,\text{kg·m/s}$. Then $v = |p|/(m_1 + m_2) \approx ${N2(v)}\,\text{m/s}$, in the direction the ${P > 0 ? 'first' : 'second'} object was moving.`,
          };
        }
        const k = R.pick([2, 3, 4, 5, 9]);
        return {
          level: 2,
          q: raw`A particle of mass $m$ moving with speed $v$ collides with a stationary particle of mass $${k}m$ and sticks to it. What is the ratio of the final kinetic energy to the initial kinetic energy?`,
          ...mcv(R, 1 / (1 + k), [k / (1 + k), 1 / k, 1 / ((1 + k) * (1 + k)), 1, 1 / Math.sqrt(1 + k)], fac),
          expl: raw`$v_f = v/(1 + ${k})$, so $K_f/K_i = \dfrac{(1 + ${k})m v_f^2}{mv^2} = \dfrac{1}{${1 + k}}$.`,
        };
      },
    },
    {
      id: 'mech.coll.elastic', sec: '1.4.1', level: 2, weight: 2,
      gen(R) {
        const kind = R.pick(['v1', 'v1', 'v2', 'v2', 'frac', 'neutron', 'limit']);
        if (kind === 'neutron') {
          const [A, name] = R.pick([[2, 'a deuterium nucleus (mass $2m$)'], [4, 'a helium-4 nucleus (mass $4m$)'], [12, 'a carbon-12 nucleus (mass $12m$)'], [16, 'an oxygen-16 nucleus (mass $16m$)'], [9, 'a beryllium-9 nucleus (mass $9m$)']]);
          const ans = 4 * A / ((1 + A) * (1 + A));
          return {
            level: 3,
            q: raw`A neutron of mass $m$ collides elastically and head-on with ${name} initially at rest. What fraction of the neutron’s kinetic energy is transferred to the nucleus?`,
            ...mcv(R, ans, [1 / (1 + A), A / (1 + A), 2 / (1 + A), Math.pow((A - 1) / (A + 1), 2), 1 / A, 4 / A], fac),
            expl: raw`Head-on elastic collision with a target at rest: $v_2' = \dfrac{2m}{m + M}v$, so the transferred fraction is $\dfrac{4mM}{(m + M)^2} = \dfrac{4(${A})}{(${1 + A})^2} = ${F.frac(4 * A, (1 + A) * (1 + A))}$. Light nuclei (hydrogen) are the best moderators.`,
          };
        }
        if (kind === 'limit') {
          const heavy = R.bool();
          return {
            q: heavy
              ? raw`A bowling ball moving at speed $V$ collides elastically and head-on with a ping-pong ball at rest. Treating the bowling ball as infinitely more massive, what is the speed of the ping-pong ball just after the collision?`
              : raw`A ping-pong ball moving at speed $V$ collides elastically and head-on with a bowling ball at rest. Treating the bowling ball as infinitely more massive, what is the speed of the ping-pong ball just after the collision?`,
            ...GRE.mc(R, heavy ? '$2V$' : '$V$', (heavy ? ['$V$'] : ['$2V$']).concat(['$0$', '$V/2$', raw`$\sqrt{2}\,V$`, '$4V$']), { rank: s => ({ '$0$': 0, '$V/2$': 0.5, '$V$': 1, '$\\sqrt{2}\\,V$': 1.41, '$2V$': 2, '$4V$': 4 })[s] }),
            expl: heavy
              ? raw`In the bowling ball’s frame the ping-pong ball approaches at $V$ and bounces back at $V$; back in the lab it moves at $V + V = 2V$ (also $v_2' = 2m_1V/(m_1 + m_2) \to 2V$).`
              : raw`An infinitely heavy target acts like a wall: the light ball rebounds with its speed unchanged, $V$, and the heavy ball stays at rest.`,
          };
        }
        const m1 = R.int(1, 10), m2 = R.int(1, 10), v = R.pick([2, 3, 4, 5, 6, 8, 10, 12]), M = m1 + m2;
        if (m1 === m2 && kind !== 'frac') {
          return {
            level: 1,
            q: raw`A $${m1}\,\text{kg}$ ball moving at $${v}\,\text{m/s}$ collides elastically and head-on with an identical ball at rest. What are the velocities of the two balls after the collision (incident ball, target ball)?`,
            ...GRE.mc(R, raw`$0$ and $${v}\,\text{m/s}$`, [raw`$${N2(v / 2)}\,\text{m/s}$ and $${N2(v / 2)}\,\text{m/s}$`, raw`$-${v}\,\text{m/s}$ and $${v}\,\text{m/s}$`, raw`$${N2(v / Math.SQRT2)}\,\text{m/s}$ and $${N2(v / Math.SQRT2)}\,\text{m/s}$`, raw`$${v}\,\text{m/s}$ and $0$`, raw`$-${N2(v / 2)}\,\text{m/s}$ and $${N2(3 * v / 2)}\,\text{m/s}$`]),
            expl: raw`Equal masses in a head-on elastic collision simply exchange velocities: the incident ball stops and the target moves off at $${v}\,\text{m/s}$, conserving both momentum and kinetic energy.`,
          };
        }
        const st = raw`A $${m1}\,\text{kg}$ ball moving at $${v}\,\text{m/s}$ collides elastically and head-on with a $${m2}\,\text{kg}$ ball at rest.`;
        if (kind === 'v1') {
          const u = (m1 - m2) * v / M;
          return {
            q: raw`${st} Taking the original direction of motion as positive, ${ask(u).toLowerCase()} the velocity of the $${m1}\,\text{kg}$ ball after the collision?`,
            ...num(R, u, [-u, 2 * m1 * v / M, m1 * v / M, (m1 - m2) * v / m1, -v, v], raw`\text{m/s}`, { allowSign: true }),
            expl: raw`For an elastic collision with a target at rest, $v_1' = \dfrac{m_1 - m_2}{m_1 + m_2}v = ${N2(u)}\,\text{m/s}$ ${u < 0 ? '(it bounces back, since it is lighter)' : '(it keeps going, since it is heavier)'}.`,
          };
        }
        if (kind === 'v2') {
          const u = 2 * m1 * v / M;
          return {
            q: raw`${st} ${ask(u)} the speed of the $${m2}\,\text{kg}$ ball after the collision?`,
            ...num(R, u, [m1 * v / M, Math.abs(m1 - m2) * v / M, m1 * v / m2, v, Math.sqrt(m1 / m2) * v], raw`\text{m/s}`),
            expl: raw`Elastic, target at rest: $v_2' = \dfrac{2m_1}{m_1 + m_2}v = ${N2(u)}\,\text{m/s}$. (Check: equal masses give $v$; a very heavy projectile gives $2v$.)`,
          };
        }
        const ans = 4 * m1 * m2 / (M * M);
        if (ans === 1) throw new Error('equal');
        return {
          q: raw`${st} What fraction of the first ball’s kinetic energy is transferred to the second ball?`,
          ...mcv(R, ans, [m1 / M, m2 / M, 2 * m1 / M, Math.pow((m1 - m2) / M, 2), 1, 0.5, 0.25, 2 * m1 * m2 / (M * M)], fac),
          expl: raw`$v_2' = 2m_1v/(m_1 + m_2)$, so $K_2'/K_1 = \dfrac{4m_1m_2}{(m_1 + m_2)^2} = ${F.frac(4 * m1 * m2, M * M)}$. The transfer is complete only for equal masses.`,
        };
      },
    },
    {
      id: 'mech.coll.ballistic', sec: '1.4.1', level: 2,
      gen(R) {
        const kind = R.pick(['height', 'height', 'speed', 'spring', 'slide', 'heat']);
        if (kind === 'heat') {
          return {
            q: raw`A bullet of mass $m$ is fired horizontally into a block of mass $M$ that is initially at rest on a frictionless surface, and becomes embedded in it. What fraction of the bullet’s initial kinetic energy is converted to other forms (heat, deformation) in the collision?`,
            ...GRE.mc(R, raw`$\dfrac{M}{M + m}$`, [raw`$\dfrac{m}{M + m}$`, raw`$\dfrac{M}{m}$`, raw`$\dfrac{m}{M}$`, raw`$\dfrac12$`, raw`$\left(\dfrac{M}{M + m}\right)^2$`]),
            expl: raw`After the collision $V = mv/(M + m)$ and $K_f = \tfrac12(M + m)V^2 = K_i\,\dfrac{m}{M + m}$. The rest, a fraction $M/(M + m)$, is lost — nearly all of it for a light bullet.`,
          };
        }
        const mg_ = R.pick([10, 20, 25, 50]), Mt = R.pick([1, 2, 4, 5]), m = mg_ / 1000, Mb = Mt - m;
        const v = R.pick([200, 250, 300, 400, 500, 600]);
        const V = m * v / Mt;
        const setup = raw`A $${mg_}\,\text{g}$ bullet traveling horizontally at $${v}\,\text{m/s}$ embeds itself in a $${F.num(Mb, 4)}\,\text{kg}$ wooden block`;
        if (kind === 'height') {
          const h = V * V / (2 * g);
          return {
            q: raw`${setup} that hangs at rest from long, light strings (a ballistic pendulum). ${ask(h)} the maximum height to which the block rises? ${USE_G}`,
            ...num(R, h, [v * v * m / (2 * g * Mt), V / (2 * g), 2 * h, h / 2], raw`\text{m}`),
            expl: raw`Two stages: momentum in the collision, $V = mv/(m + M) = ${N2(V, 3)}\,\text{m/s}$; then energy in the swing, $h = V^2/2g \approx ${N2(h)}\,\text{m}$. Applying energy conservation through the collision itself is the classic mistake.`,
          };
        }
        if (kind === 'speed') {
          const h = V * V / (2 * g);
          return {
            q: raw`A $${mg_}\,\text{g}$ bullet is fired horizontally into a $${F.num(Mb, 4)}\,\text{kg}$ block hanging from long, light strings and becomes embedded in it. The block then swings up to a maximum height of $${N2(h, 3)}\,\text{m}$. ${ask(v)} the bullet’s initial speed? ${USE_G}`,
            ...num(R, v, [Math.sqrt(2 * g * h), Math.sqrt(2 * g * h * Mt / m), Mt / m * Math.sqrt(g * h), 2 * v], raw`\text{m/s}`),
            expl: raw`After the collision, $V = \sqrt{2gh} = ${N2(V, 3)}\,\text{m/s}$. Momentum conservation in the collision: $v = \dfrac{m + M}{m}V = ${N2(v, 3)}\,\text{m/s}$.`,
          };
        }
        if (kind === 'spring') {
          const k = R.pick([100, 200, 400, 500, 800, 1000]);
          const x = V * Math.sqrt(Mt / k) * 100;
          return {
            level: 3,
            q: raw`${setup} that rests on a frictionless horizontal surface, attached to a horizontal spring of force constant $${k}\,\text{N/m}$ whose other end is fixed. ${ask(x)} the maximum compression of the spring?`,
            ...num(R, x, [v * Math.sqrt(m / k) * 100, x * Math.sqrt(Mt / m) / 10, 2 * x, x / Math.SQRT2], raw`\text{cm}`),
            expl: raw`Collision (momentum): $V = mv/(m + M) = ${N2(V, 3)}\,\text{m/s}$. Compression (energy): $\tfrac12(m + M)V^2 = \tfrac12 kx^2$, so $x = V\sqrt{(m + M)/k} \approx ${N2(x)}\,\text{cm}$.`,
          };
        }
        const mu = R.pick([0.2, 0.25, 0.4, 0.5]);
        const d = V * V / (2 * mu * g);
        return {
          q: raw`${setup} resting on a rough horizontal floor. The coefficient of kinetic friction between block and floor is $${mu}$. ${ask(d)} the distance the block slides? ${USE_G}`,
          ...num(R, d, [m * v * v / (2 * mu * g * Mt), V / (2 * mu * g), 2 * d, d / 2], raw`\text{m}`),
          expl: raw`Momentum in the (brief) collision gives $V = mv/(m + M) = ${N2(V, 3)}\,\text{m/s}$; then friction removes the kinetic energy: $d = V^2/2\mu_k g \approx ${N2(d)}\,\text{m}$.`,
        };
      },
    },
    {
      id: 'mech.coll.explosion', sec: '1.4.1', level: 2,
      gen(R) {
        const kind = R.pick(['two', 'two', 'kratio', 'recoil', 'alpha', 'moving']);
        if (kind === 'two' || kind === 'kratio') {
          const m1 = R.int(1, 8), m2 = R.int(1, 8);
          if (m1 === m2) throw new Error('equal');
          const obj = R.pick(['firecracker', 'shell', 'rock', 'toy rocket']);
          if (kind === 'two') {
            const v1 = R.pick([2, 3, 4, 5, 6, 8, 10, 12, 15]);
            const v2 = m1 * v1 / m2;
            return {
              level: 1,
              q: raw`A ${obj} at rest on a frictionless surface breaks into two pieces of masses $${m1}\,\text{kg}$ and $${m2}\,\text{kg}$. The $${m1}\,\text{kg}$ piece moves off at $${v1}\,\text{m/s}$. ${ask(v2)} the speed of the other piece?`,
              ...num(R, v2, [v1, m2 * v1 / m1, Math.sqrt(m1 / m2) * v1, m1 * v1 / (m1 + m2)], raw`\text{m/s}`),
              expl: raw`Total momentum stays zero: $m_1v_1 = m_2v_2$, so $v_2 = ${m1}(${v1})/${m2} \approx ${N2(v2)}\,\text{m/s}$, in the opposite direction.`,
            };
          }
          const ans = m2 / m1;
          return {
            q: raw`A ${obj} at rest breaks into two pieces of masses $${m1}\,\text{kg}$ and $${m2}\,\text{kg}$, and no external forces act. What is the ratio of the kinetic energy of the $${m1}\,\text{kg}$ piece to that of the $${m2}\,\text{kg}$ piece?`,
            ...mcv(R, ans, [m1 / m2, 1, (m2 / m1) * (m2 / m1), (m1 / m2) * (m1 / m2), Math.sqrt(m2 / m1)], fac),
            expl: raw`The pieces have equal and opposite momenta, and $K = p^2/2m$, so $K_1/K_2 = m_2/m_1 = ${F.frac(m2, m1)}$: the lighter piece carries more energy.`,
          };
        }
        if (kind === 'recoil') {
          const M = R.pick([3, 4, 5, 6]), mg_ = R.pick([5, 8, 10, 15, 20]), v = R.pick([300, 400, 500, 600, 800]);
          const V = mg_ / 1000 * v / M;
          return {
            level: 1,
            q: raw`A $${M}\,\text{kg}$ rifle, free to recoil, fires a $${mg_}\,\text{g}$ bullet horizontally at $${v}\,\text{m/s}$. ${ask(V)} the recoil speed of the rifle?`,
            ...num(R, V, [Math.sqrt(mg_ / 1000 / M) * v, M / (mg_ / 1000) * v / 1e4, 2 * V, V / 2], raw`\text{m/s}`),
            expl: raw`Momentum: $MV = mv$, so $V = (${mg_ / 1000})(${v})/${M} \approx ${N2(V)}\,\text{m/s}$.`,
          };
        }
        if (kind === 'alpha') {
          const [A, el] = R.pick([[226, 'radium-226'], [238, 'uranium-238'], [210, 'polonium-210'], [222, 'radon-222'], [232, 'thorium-232'], [241, 'americium-241']]);
          const Q = R.pick([4.2, 4.8, 5.0, 5.5, 5.6, 6.0]);
          const Kd = 4 * Q / A;
          return {
            level: 3,
            q: raw`A ${el} nucleus at rest undergoes alpha decay, releasing a total kinetic energy of $${Q}\,\text{MeV}$ shared between the alpha particle (mass number 4) and the daughter nucleus (mass number ${A - 4}). Which of the following is closest to the kinetic energy of the daughter nucleus?`,
            ...num(R, Kd, [Q / 2, Q / A, 4 * Q / (A - 4) * 4, Q * 16 / (A * A)], raw`\text{MeV}`),
            expl: raw`Equal and opposite momenta and $K = p^2/2m$ mean $K \propto 1/m$. The daughter gets the fraction $4/${A}$: $K_d \approx ${N2(Kd)}\,\text{MeV}$; the alpha carries the rest.`,
          };
        }
        const M = R.pick([2, 4, 6, 8, 10]), V = R.pick([2, 3, 4, 5, 6, 10]);
        const askE = R.bool();
        if (askE) {
          const E = 0.5 * M * V * V;
          return {
            level: 3,
            q: raw`An object of mass $${M}\,\text{kg}$ moving at $${V}\,\text{m/s}$ explodes into two equal halves. One half is left at rest just after the explosion. How much kinetic energy did the explosion release?`,
            ...num(R, E, [2 * E, E / 2, 0, 3 * E], raw`\text{J}`),
            expl: raw`Momentum: the moving half has $\tfrac M2 v = MV$, so $v = 2V$. Final $K = \tfrac12\cdot\tfrac M2(2V)^2 = MV^2$; initial $K = \tfrac12 MV^2$. Released: $\tfrac12 MV^2 = ${N2(E, 3)}\,\text{J}$.`,
          };
        }
        return {
          q: raw`An object of mass $${M}\,\text{kg}$ moving at $${V}\,\text{m/s}$ explodes into two equal halves. One half is left at rest just after the explosion. What is the speed of the other half?`,
          ...num(R, 2 * V, [V, Math.SQRT2 * V, 4 * V, V / 2], raw`\text{m/s}`),
          expl: raw`Momentum is conserved: $MV = \tfrac M2 v$, so $v = 2V = ${2 * V}\,\text{m/s}$. (Kinetic energy increases, supplied by the explosion.)`,
        };
      },
    },
    {
      id: 'mech.coll.2d', sec: '1.4.1', level: 2,
      gen(R) {
        const kind = R.pick(['perp', 'perp', 'dir', 'billiard', 'three']);
        const TRI = [[3, 4, 5], [4, 3, 5], [5, 12, 13], [12, 5, 13], [8, 15, 17], [15, 8, 17], [6, 8, 10], [8, 6, 10]];
        if (kind === 'perp' || kind === 'dir') {
          for (let tries = 0; tries < 20; tries++) {
            const [a, b, c] = R.pick(TRI), P = R.pick([2000, 3000, 4000, 5000, 6000]);
            const p1 = a * P, p2 = b * P;
            const m1s = [1000, 1200, 1500, 2000, 2500, 3000].filter(m => Number.isInteger(p1 / m) && p1 / m >= 5 && p1 / m <= 40);
            const m2s = [1000, 1200, 1500, 2000, 2500, 3000].filter(m => Number.isInteger(p2 / m) && p2 / m >= 5 && p2 / m <= 40);
            if (!m1s.length || !m2s.length) continue;
            const m1 = R.pick(m1s), m2 = R.pick(m2s), v1 = p1 / m1, v2 = p2 / m2;
            const st = raw`A $${m1}\,\text{kg}$ car traveling east at $${v1}\,\text{m/s}$ collides at an intersection with a $${m2}\,\text{kg}$ car traveling north at $${v2}\,\text{m/s}$. The cars lock together.`;
            if (kind === 'perp') {
              const v = c * P / (m1 + m2);
              return {
                q: raw`${st} ${ask(v)} their speed just after the collision?`,
                ...num(R, v, [(p1 + p2) / (m1 + m2), Math.hypot(v1, v2), Math.hypot(v1, v2) / 2, (v1 + v2) / 2], raw`\text{m/s}`, { tol: 0.08 }),
                expl: raw`Conserve each momentum component: $p_x = ${p1}$, $p_y = ${p2}\,\text{kg·m/s}$, so $|p| = ${c * P}\,\text{kg·m/s}$ and $v = |p|/(m_1 + m_2) \approx ${N2(v)}\,\text{m/s}$.`,
              };
            }
            const fr = F.frac(b, a);
            const opts = [raw`$\tan^{-1}(${F.frac(a, b)})$ north of east`, raw`$\tan^{-1}(${F.frac(v2 * 1, v1)})$ north of east`, raw`$\tan^{-1}(${F.frac(m2, m1)})$ north of east`, raw`$45^\circ$ north of east`, raw`$\tan^{-1}(${fr})$ east of north`];
            return {
              level: 3,
              q: raw`${st} In what direction does the wreck move just after the collision?`,
              ...GRE.mc(R, raw`$\tan^{-1}(${fr})$ north of east`, opts.filter(s => !s.includes(`(${fr})$ north`) && !(a === b && s.includes('45')))),
              expl: raw`The direction is set by the momentum components, not the velocities: $\tan\phi = p_y/p_x = ${p2}/${p1} = ${fr}$, measured north of east.`,
            };
          }
          throw new Error('no masses');
        }
        if (kind === 'billiard') {
          const a = R.pick([ANG[30], ANG[37], ANG[45], ANG[53], ANG[60]]);
          const v = R.pick([2, 3, 4, 5, 6, 8, 10]);
          const u2 = v * a.s;
          const th = isTheta(a) ? raw`an angle $\theta$ from its original direction, where $\sin\theta = ${a.s}$` : raw`$${a.d}^\circ$ from its original direction`;
          return {
            q: raw`A billiard ball moving at $${v}\,\text{m/s}$ strikes an identical ball at rest in an elastic, off-center collision. The incident ball moves off at ${th}. ${ask(u2)} the speed of the struck ball?`,
            ...num(R, u2, [v * a.c, v, v / 2, v * a.s / a.c], raw`\text{m/s}`),
            expl: raw`For equal masses and an elastic collision with a target at rest, the two final velocities are perpendicular and form a right triangle with $\vec v$: $v_1' = v\cos\theta$, $v_2' = v\sin\theta \approx ${N2(u2)}\,\text{m/s}$.`,
          };
        }
        const [a, b, c] = R.pick(TRI);
        const m1 = R.int(1, 4), m2 = R.int(1, 4), m3 = R.int(1, 6), k = R.pick([1, 2, 3]);
        const p1 = a * k * 2, p2 = b * k * 2;
        if (p1 % m1 || p2 % m2) throw new Error('non-integer speed');
        const v3 = c * k * 2 / m3;
        return {
          level: 3,
          q: raw`A $${m1 + m2 + m3}\,\text{kg}$ object at rest explodes into three pieces. A $${m1}\,\text{kg}$ piece moves east at $${p1 / m1}\,\text{m/s}$, and a $${m2}\,\text{kg}$ piece moves north at $${p2 / m2}\,\text{m/s}$. ${ask(v3)} the speed of the third piece, of mass $${m3}\,\text{kg}$?`,
          ...num(R, v3, [(p1 + p2) / m3, Math.hypot(p1 / m1, p2 / m2), c * k * 2 / (m1 + m2 + m3), Math.hypot(p1 / m1, p2 / m2) / m3], raw`\text{m/s}`, { tol: 0.08 }),
          expl: raw`Total momentum stays zero, so the third piece carries $|\vec p_3| = \sqrt{${p1}^2 + ${p2}^2} = ${c * k * 2}\,\text{kg·m/s}$ (pointing southwest), giving $v_3 = ${c * k * 2}/${m3} \approx ${N2(v3)}\,\text{m/s}$.`,
        };
      },
    },
    {
      id: 'mech.coll.impulse', sec: '1.4.1', level: 2,
      gen(R) {
        const kind = R.pick(['wall', 'wall', 'bounce', 'cor', 'pulse', 'belt', 'rocket']);
        if (kind === 'wall') {
          const m = R.pick([0.05, 0.1, 0.15, 0.2, 0.4, 0.5]), v = R.pick([5, 10, 15, 20, 25, 30]), dt = R.pick([2, 4, 5, 10, 20]);
          const v2 = R.bool() ? v : R.pick([v / 2, 0.8 * v]);
          const Fa = m * (v + v2) / (dt / 1000);
          return {
            level: 1,
            q: raw`A $${m}\,\text{kg}$ ball moving horizontally at $${v}\,\text{m/s}$ hits a wall head-on and rebounds ${v2 === v ? 'with the same speed' : raw`at $${N2(v2)}\,\text{m/s}$`}. The contact lasts $${dt}\,\text{ms}$. ${ask(Fa)} the magnitude of the average force of the wall on the ball?`,
            ...num(R, Fa, [m * Math.abs(v - v2) / (dt / 1000), m * v / (dt / 1000), 2 * Fa, Fa / 2].filter(x => x > 0), raw`\text{N}`),
            expl: raw`The velocity reverses, so $|\Delta p| = m(v + v') = ${N2(m * (v + v2), 3)}\,\text{kg·m/s}$, and $F_{\text{avg}} = |\Delta p|/\Delta t \approx ${N2(Fa)}\,\text{N}$. Subtracting the speeds ignores the change of direction.`,
          };
        }
        if (kind === 'bounce' || kind === 'cor') {
          const H = [[0.2, 2], [0.45, 3], [0.8, 4], [1.25, 5], [1.8, 6], [3.2, 8], [5, 10]];
          const [i, j] = R.pickN([0, 1, 2, 3, 4, 5, 6], 2).sort((x, y) => y - x);
          const [h1, u1] = H[i], [h2, u2] = H[j];
          if (kind === 'cor') {
            return {
              q: raw`A ball dropped from rest from a height of $${h1}\,\text{m}$ rebounds from the floor to a height of $${h2}\,\text{m}$. What is the coefficient of restitution (ratio of rebound speed to impact speed)?`,
              ...num(R, u2 / u1, [h2 / h1, Math.pow(h2 / h1, 2), 1 - h2 / h1, u1 / u2 / 4]),
              expl: raw`Speeds scale as $\sqrt{h}$: $e = v'/v = \sqrt{h_2/h_1} = ${u2}/${u1} = ${N2(u2 / u1)}$. The energy ratio $h_2/h_1$ is $e^2$.`,
            };
          }
          const m = R.pick([0.1, 0.2, 0.5, 1, 2]);
          const J = m * (u1 + u2);
          return {
            q: raw`A $${m}\,\text{kg}$ ball is dropped from rest from a height of $${h1}\,\text{m}$ onto a hard floor and rebounds to a height of $${h2}\,\text{m}$. What is the magnitude of the impulse the floor exerts on the ball? ${USE_G}`,
            ...num(R, J, [m * (u1 - u2), m * u1, 2 * m * u1, m * Math.sqrt(2 * g * (h1 - h2))], raw`\text{N·s}`),
            expl: raw`Impact speed $\sqrt{2gh_1} = ${u1}\,\text{m/s}$ downward, rebound speed $\sqrt{2gh_2} = ${u2}\,\text{m/s}$ upward. $J = m(v' + v) = ${m}(${u1 + u2}) = ${N2(J, 3)}\,\text{N·s}$, upward.`,
          };
        }
        if (kind === 'pulse') {
          const Fm = R.pick([100, 200, 300, 400, 500, 600, 1000]), dt = R.pick([2, 4, 5, 10, 20]), m = R.pick([0.1, 0.2, 0.25, 0.5, 1]);
          const v = Fm * dt / 1000 / 2 / m;
          return {
            q: raw`A ball of mass $${m}\,\text{kg}$, initially at rest, is struck by a force that rises linearly from zero to a maximum of $${Fm}\,\text{N}$ and then falls linearly back to zero, the whole pulse lasting $${dt}\,\text{ms}$. ${ask(v)} the ball’s speed afterward?`,
            ...num(R, v, [2 * v, v / 2, Math.sqrt(2 * v), 4 * v], raw`\text{m/s}`),
            expl: raw`Impulse is the area under the triangular $F$–$t$ curve: $J = \tfrac12 F_{\max}\Delta t = ${N2(Fm * dt / 2000, 3)}\,\text{N·s}$. Then $v = J/m \approx ${N2(v)}\,\text{m/s}$.`,
          };
        }
        if (kind === 'belt') {
          const rate = R.pick([2, 5, 10, 20, 50]), v = R.pick([1, 1.5, 2, 3, 4]);
          const askP = R.bool();
          const val = askP ? rate * v * v : rate * v;
          return {
            level: 3,
            q: raw`Sand falls vertically onto a horizontal conveyor belt at a steady rate of $${rate}\,\text{kg/s}$. The belt moves at a constant $${v}\,\text{m/s}$, and the sand quickly comes to rest on it. Neglecting friction in the belt mechanism, ${askP ? 'what power must the motor supply to keep the belt moving' : 'what horizontal force must the motor exert on the belt to keep it moving at constant speed'}?`,
            ...num(R, val, askP ? [rate * v * v / 2, rate * v, 2 * rate * v * v] : [rate * v / 2, rate * v * v, rate * g], askP ? raw`\text{W}` : raw`\text{N}`),
            expl: askP
              ? raw`$F = v\,dm/dt$, so $P = Fv = v^2\,dm/dt = ${N2(val, 3)}\,\text{W}$ — twice the rate at which the sand gains kinetic energy ($\tfrac12 v^2\,dm/dt$); the other half is dissipated as the sand slips on the belt.`
              : raw`The belt must supply momentum to the sand at the rate $dp/dt = v\,dm/dt = ${N2(val, 3)}\,\text{N}$.`,
          };
        }
        const u = R.pick([2000, 2500, 3000]), rate = R.pick([10, 20, 40, 50, 100]), M = R.pick([500, 1000, 2000, 2500, 4000]);
        const T = u * rate;
        if (T <= M * g * 1.2) throw new Error('cannot lift off');
        const a = (T - M * g) / M;
        return {
          level: 3,
          q: raw`A rocket of mass $${M}\,\text{kg}$ sits vertically on its launch pad. Its engine ejects exhaust at $${u}\,\text{m/s}$ relative to the rocket at a rate of $${rate}\,\text{kg/s}$. ${ask(a)} the rocket’s initial upward acceleration? ${USE_G}`,
          ...num(R, a, [T / M, (T + M * g) / M, a / 2, (T - M * g) / (M * 2)].filter(x => x > 0), MS2),
          expl: raw`Thrust $= u\,|dm/dt| = ${T}\,\text{N}$. Then $a = (F_{\text{thrust}} - Mg)/M = (${T} - ${M * g})/${M} \approx ${N2(a)}\,\text{m/s}^2$. Don’t forget the weight.`,
        };
      },
    },
    {
      id: 'mech.ang.merry', sec: '1.4.2', level: 2, weight: 2,
      gen(R) {
        const kind = R.pick(['step', 'step', 'walk', 'ring', 'ke', 'clutch']);
        const M = R.pick([100, 120, 150, 160, 200, 240, 300]), m = R.pick([20, 25, 30, 40, 50, 60, 75, 80]);
        const w0 = R.pick([6, 8, 10, 12, 15, 20]);
        const I0 = M / 2;
        if (kind === 'step' || kind === 'ring') {
          const w = w0 * I0 / (I0 + m);
          const step = kind === 'step';
          return {
            q: step
              ? raw`A playground merry-go-round, a uniform disk of mass $${M}\,\text{kg}$ and radius $2\,\text{m}$, turns freely at $${w0}$ revolutions per minute. A $${m}\,\text{kg}$ child standing on the ground steps onto its rim (with no tangential velocity). ${ask(w)} the new rotation rate?`
              : raw`A uniform disk of mass $${M}\,\text{kg}$ spins freely about its vertical axis at $${w0}$ rev/min. A thin, nonrotating ring of mass $${m}\,\text{kg}$ with the same radius as the disk is dropped onto it, concentric with it, and quickly moves with the disk. ${ask(w)} the new rotation rate?`,
            ...num(R, w, [w0 * M / (M + m), w0 * (I0 + m) / I0, w0 * Math.sqrt(I0 / (I0 + m)), w0 * I0 / (I0 + m / 2)], raw`\text{rev/min}`),
            expl: raw`Angular momentum about the axis is conserved (no external torque): $\tfrac12 MR^2\omega_0 = \left(\tfrac12 MR^2 + mR^2\right)\omega$, so $\omega = \dfrac{${I0}}{${I0} + ${m}}\,(${w0}) \approx ${N2(w)}$ rev/min. Kinetic energy is not conserved — this is an inelastic process.`,
          };
        }
        if (kind === 'walk') {
          const toCenter = R.bool();
          const wf = toCenter ? w0 * (I0 + m) / I0 : w0 * (I0 + m) / (I0 + m / 4);
          return {
            level: 3,
            q: raw`A uniform disk-shaped platform of mass $${M}\,\text{kg}$ rotates freely about a vertical axis through its center at $${w0}$ rev/min, with a $${m}\,\text{kg}$ person standing at its rim. The person walks ${toCenter ? 'to the center' : 'halfway to the center'} of the platform. ${ask(wf)} the platform’s new rotation rate? (Treat the person as a point mass.)`,
            ...num(R, wf, [w0, w0 * I0 / (I0 + m), w0 * (M + m) / M, w0 * Math.sqrt((I0 + m) / (toCenter ? I0 : I0 + m / 4))], raw`\text{rev/min}`, { tol: 0.06 }),
            expl: raw`$L = I\omega$ is conserved. In units of $R^2$: $I_i = ${I0} + ${m}$, $I_f = ${I0}${toCenter ? '' : ` + ${m}/4`}$. So $\omega_f = \omega_0 I_i/I_f \approx ${N2(wf)}$ rev/min — it speeds up as mass moves inward.`,
          };
        }
        if (kind === 'ke') {
          const g_ = F.gcd(I0 * 2, m * 2);
          const ans = m / (I0 + m);
          return {
            level: 3,
            q: raw`A uniform disk of mass $${M}\,\text{kg}$ rotates freely about its vertical axis. A $${m}\,\text{kg}$ lump of clay, initially at rest, is dropped onto the disk’s rim and sticks. What fraction of the system’s kinetic energy is lost?`,
            ...mcv(R, ans, [I0 / (I0 + m), m / (M + m), 0, M / (M + m), Math.pow(m / (I0 + m), 2)], fac),
            expl: raw`$L$ conserved gives $\omega_f = \omega_0 I_0/(I_0 + mR^2)$, and $K = L^2/2I$, so $K_f/K_i = I_0/(I_0 + mR^2)$ with $I_0 = \tfrac12 MR^2 = ${I0}R^2$. Fraction lost $= ${F.frac(m * 2, (I0 + m) * 2)}$.`,
          };
        }
        const I1 = R.pick([2, 3, 4, 5, 6]), I2 = R.pick([1, 2, 3, 4, 6]), w1 = R.pick([10, 12, 20, 30, 40]), w2 = R.pick([0, 0, 5, 10, 15]);
        const opp = w2 > 0;
        const wf = Math.abs(I1 * w1 - I2 * w2) / (I1 + I2);
        if (wf === 0) throw new Error('zero');
        return {
          q: raw`Flywheel A (moment of inertia $${I1}\,\text{kg·m}^2$) spins at $${w1}\,\text{rad/s}$ on a frictionless axle. Flywheel B (moment of inertia $${I2}\,\text{kg·m}^2$) on the same axle ${opp ? raw`spins in the opposite direction at $${w2}\,\text{rad/s}$` : 'is at rest'}. The two are pushed together by a clutch until they turn as one. ${ask(wf)} their final angular speed?`,
          ...num(R, wf, [(I1 * w1 + I2 * w2) / (I1 + I2), I1 * w1 / I2, Math.abs(w1 - w2) / 2, w1 * Math.sqrt(I1 / (I1 + I2))], raw`\text{rad/s}`),
          expl: raw`Angular momentum (with signs) is conserved: $(${I1})(${w1})${opp ? ` - (${I2})(${w2})` : ''} = (${I1 + I2})\omega$, so $\omega \approx ${N2(wf)}\,\text{rad/s}$.`,
        };
      },
    },
    {
      id: 'mech.ang.contract', sec: '1.4.2', level: 2,
      gen(R) {
        const k = R.pick([2, 3, 4]);
        const frac = { 2: 'one-half', 3: 'one-third', 4: 'one-fourth' }[k];
        const CASES = [
          [raw`A spinning ice skater pulls in her arms, reducing her moment of inertia to ${frac} of its initial value.`, 'angular speed', 1, raw`$I\omega$ is conserved, so $\omega \propto 1/I$`],
          [raw`A spinning ice skater pulls in her arms, reducing her moment of inertia to ${frac} of its initial value.`, 'rotational kinetic energy', 1, raw`$K = L^2/2I$ with $L$ fixed, so $K \propto 1/I$ (the skater’s muscles do the work)`],
          [raw`A spinning ice skater pulls in her arms, reducing her moment of inertia to ${frac} of its initial value.`, 'angular momentum', 0, raw`there is no external torque about the vertical axis`],
          [raw`A star, modeled as a uniform sphere, collapses without losing mass until its radius is ${frac} of the original.`, 'rotation period', -2, raw`$I \propto R^2$ and $I\omega$ is conserved, so $\omega \propto R^{-2}$ and the period $\propto R^2$`],
          [raw`A star, modeled as a uniform sphere, collapses without losing mass until its radius is ${frac} of the original.`, 'rotational kinetic energy', 2, raw`$K = L^2/2I$ and $I \propto R^2$`],
          [raw`A puck on a frictionless table moves in a circle, held by a string that passes down through a small hole at the center. The string is slowly pulled until the radius is ${frac} of its initial value.`, 'speed of the puck', 1, raw`the string force is central, so $L = mvr$ is conserved and $v \propto 1/r$`],
          [raw`A puck on a frictionless table moves in a circle, held by a string that passes down through a small hole at the center. The string is slowly pulled until the radius is ${frac} of its initial value.`, 'angular speed of the puck', 2, raw`$L = mr^2\omega$ is conserved, so $\omega \propto r^{-2}$`],
          [raw`A puck on a frictionless table moves in a circle, held by a string that passes down through a small hole at the center. The string is slowly pulled until the radius is ${frac} of its initial value.`, 'tension in the string', 3, raw`$v \propto 1/r$ (from $L = mvr$), so $T = mv^2/r \propto r^{-3}$`],
          [raw`A puck on a frictionless table moves in a circle, held by a string that passes down through a small hole at the center. The string is slowly pulled until the radius is ${frac} of its initial value.`, 'kinetic energy of the puck', 2, raw`$v \propto 1/r$, so $K \propto r^{-2}$; the pulling force does positive work`],
          [raw`Two flywheels have the same angular momentum, but the moment of inertia of flywheel A is ${frac} that of flywheel B.`, 'kinetic energy of A relative to that of B (ratio $K_A/K_B$)', 1, raw`$K = L^2/2I$, so at equal $L$, $K \propto 1/I$`],
        ];
        const [setup, qty, p, why] = R.pick(CASES);
        const ans = Math.pow(k, p);
        const ratioQ = /ratio/.test(qty);
        const fmt = x => (x === 1 && !ratioQ ? 'It is unchanged.' : (ex(x) == null ? null : ratioQ ? `$${ex(x)}$` : `It is multiplied by $${ex(x)}$.`));
        return {
          q: raw`${setup} ${ratioQ ? `What is the ${qty}?` : `By what factor does the ${qty} change?`}`,
          ...mcv(R, ans, powWrongs(k, p).filter(x => !(ratioQ && false)), fmt),
          expl: raw`Here ${why}, so the answer is $${ex(ans)}$.`,
        };
      },
    },
    {
      id: 'mech.ang.torque', sec: '1.4.2', level: 2,
      gen(R) {
        const kind = R.pick(['pulley', 'pulley', 'disk', 'rod', 'stop', 'seesaw']);
        if (kind === 'pulley') {
          const M = R.pick([2, 4, 6, 8, 10]), m = R.pick([1, 2, 3, 4, 5]);
          const a = m * g / (m + M / 2), askT = R.bool(0.35);
          const T = m * (g - a);
          return {
            q: raw`A light string is wrapped around a pulley that is a uniform disk of mass $${M}\,\text{kg}$, free to turn on a frictionless horizontal axle. A $${m}\,\text{kg}$ block hangs from the string and is released from rest. ${askT ? `${ask(T)} the tension in the string` : `${ask(a)} the acceleration of the block`}? ${USE_G}`,
            ...(askT
              ? num(R, T, [m * g, m * g * M / (m + M), m * g / 2, M * g / 2], raw`\text{N}`)
              : num(R, a, [g, m * g / (m + M), m * g / (m + 2 * M), m * g / (M / 2)], MS2)),
            expl: raw`Block: $mg - T = ma$. Pulley: $TR = \tfrac12 MR^2(a/R)$, so $T = \tfrac12 Ma$. Hence $a = \dfrac{mg}{m + M/2} \approx ${N2(a, 3)}\,\text{m/s}^2$ and $T = \tfrac12 Ma \approx ${N2(T, 3)}\,\text{N}$. The pulley’s mass counts only half.`,
          };
        }
        if (kind === 'disk') {
          const M = R.pick([2, 4, 5, 8, 10, 20]), r = R.pick([0.1, 0.2, 0.25, 0.4, 0.5]), Fp = R.pick([2, 4, 5, 10, 20]), t = R.pick([2, 3, 4, 5]);
          const w = 2 * Fp * t / (M * r);
          return {
            q: raw`A uniform disk of mass $${M}\,\text{kg}$ and radius $${r}\,\text{m}$, initially at rest, can turn freely about a fixed axle through its center. A constant force of $${Fp}\,\text{N}$ is applied tangentially to its rim. ${ask(w)} its angular speed after $${t}\,\text{s}$?`,
            ...num(R, w, [w / 2, 2 * w, Fp * t / (M * r * r), w * r], raw`\text{rad/s}`),
            expl: raw`$\tau = FR = I\alpha$ with $I = \tfrac12 MR^2$, so $\alpha = 2F/MR = ${N2(2 * Fp / (M * r), 3)}\,\text{rad/s}^2$ and $\omega = \alpha t \approx ${N2(w)}\,\text{rad/s}$.`,
          };
        }
        if (kind === 'rod') {
          const tip = R.bool();
          const ans = tip ? 1.5 : 0.75;
          return {
            level: 3,
            q: raw`A uniform rod of length $L$ is pivoted at one end on a frictionless horizontal axle and is released from rest in a horizontal position. Just after release, what is the magnitude of the linear acceleration of ${tip ? 'the free end of the rod' : 'the rod’s center of mass'}?`,
            ...mcv(R, ans, [1, 0.5, 2, ans === 1.5 ? 0.75 : 1.5, 3, 0.25], cf('g')),
            expl: raw`Torque about the pivot: $Mg\tfrac L2 = \tfrac13 ML^2\alpha$, so $\alpha = \tfrac{3g}{2L}$. The center (at $L/2$) accelerates at $\tfrac34 g$ and the free end (at $L$) at $\tfrac32 g$ — faster than free fall.`,
          };
        }
        if (kind === 'stop') {
          const I = R.pick([2, 4, 5, 8, 10]), w0 = R.pick([20, 30, 40, 50, 60, 100]), tau = R.pick([1, 2, 4, 5, 10]);
          const askRev = R.bool();
          const t = I * w0 / tau, rev = I * w0 * w0 / (4 * Math.PI * tau);
          return {
            q: raw`A flywheel with moment of inertia $${I}\,\text{kg·m}^2$ spins at $${w0}\,\text{rad/s}$ and is slowed by a constant frictional torque of $${tau}\,\text{N·m}$. ${askRev ? 'Which of the following is closest to the number of revolutions it makes before stopping' : `${ask(t)} the time it takes to stop`}?`,
            ...(askRev ? num(R, rev, [2 * rev, rev * 2 * Math.PI, rev / 2, rev * Math.PI], '') : num(R, t, [t / 2, 2 * t, w0 / tau, tau * w0 / I], raw`\text{s}`)),
            expl: raw`$\alpha = \tau/I = ${N2(tau / I, 3)}\,\text{rad/s}^2$. Time: $\omega_0/\alpha = ${N2(t, 3)}\,\text{s}$. Angle: $\omega_0^2/2\alpha = ${N2(I * w0 * w0 / (2 * tau), 3)}\,\text{rad} \approx ${N2(rev)}$ revolutions (equivalently, the work-energy theorem $\tau\theta = \tfrac12 I\omega_0^2$).`,
          };
        }
        const m1 = R.pick([20, 25, 30, 35, 40, 50]), m2 = R.pick([20, 30, 40, 45, 50, 60]), d1 = R.pick([1, 1.2, 1.5, 1.8, 2]);
        const d2 = m1 * d1 / m2;
        if (m1 === m2 || d2 > 3) throw new Error('bad seesaw');
        return {
          level: 1,
          q: raw`A uniform seesaw is pivoted at its center. A $${m1}\,\text{kg}$ child sits $${d1}\,\text{m}$ from the pivot on one side. How far from the pivot on the other side must a $${m2}\,\text{kg}$ child sit for the seesaw to balance?`,
          ...num(R, d2, [m2 * d1 / m1, d1, d1 * Math.sqrt(m1 / m2), d1 * (m1 / m2) * (m1 / m2)], raw`\text{m}`, { tol: 0.06 }),
          expl: raw`Equilibrium requires zero net torque about the pivot (the uniform board’s weight acts at the pivot): $m_1gd_1 = m_2gd_2$, so $d_2 = ${m1}(${d1})/${m2} \approx ${N2(d2, 3)}\,\text{m}$.`,
        };
      },
    },
    {
      id: 'mech.ang.vector', sec: '1.4.2', level: 2,
      gen(R) {
        const kind = R.pick(['cross', 'cross', 'torque', 'line', 'dir', 'dir']);
        if (kind === 'cross' || kind === 'torque') {
          const v = () => R.pick([-4, -3, -2, -1, 1, 2, 3, 4, 5]);
          const x = v(), y = v(), px = v(), py = v();
          const Lz = x * py - y * px;
          if (Lz === 0) throw new Error('zero');
          const isL = kind === 'cross';
          const u = isL ? raw`\,\text{kg·m}^2\text{/s}` : raw`\,\text{N·m}`;
          const opt = val => (val === 0 ? raw`$0$` : raw`$${val}\,\hat{\mathbf{z}}\ ${u.replace(/^\\,/, '')}$`);
          return {
            q: isL
              ? raw`A particle is at position $\vec r = (${x}\,\hat{\mathbf{x}} + ${y}\,\hat{\mathbf{y}})\,\text{m}$ with momentum $\vec p = (${px}\,\hat{\mathbf{x}} + ${py}\,\hat{\mathbf{y}})\,\text{kg·m/s}$. What is its angular momentum about the origin?`.replace(/\+ -/g, '- ')
              : raw`A force $\vec F = (${px}\,\hat{\mathbf{x}} + ${py}\,\hat{\mathbf{y}})\,\text{N}$ acts at the point $\vec r = (${x}\,\hat{\mathbf{x}} + ${y}\,\hat{\mathbf{y}})\,\text{m}$. What is the torque about the origin?`.replace(/\+ -/g, '- '),
            ...mcv(R, Lz, [-Lz, x * px + y * py, x * py + y * px, -(x * px + y * py), -(x * py + y * px), 2 * Lz, x * py, -y * px, Lz + (Lz > 0 ? 2 : -2)].filter(z => z !== 0), opt),
            expl: raw`$\vec r\times\vec ${isL ? 'p' : 'F'} = (x${isL ? 'p_y' : 'F_y'} - y${isL ? 'p_x' : 'F_x'})\,\hat{\mathbf{z}} = (${x})(${py}) - (${y})(${px}) = ${Lz}$, so the answer is $${Lz}\,\hat{\mathbf{z}}$ in SI units. The dot product $${x * px + y * py}$ is a common mix-up.`,
          };
        }
        if (kind === 'line') {
          const m = R.pick([1, 2, 3, 4, 5]), vv = R.pick([2, 3, 4, 5, 6]), b = R.pick([1, 2, 3, 4, 5]), x0 = R.pick([3, 4, 6, 8, 12]);
          const L = m * vv * b;
          return {
            q: raw`A $${m}\,\text{kg}$ particle moves with constant velocity $${vv}\,\text{m/s}$ in the $+x$ direction along the line $y = ${b}\,\text{m}$. What is the magnitude of its angular momentum about the origin when it is at $x = ${x0}\,\text{m}$?`,
            ...num(R, L, [m * vv * Math.hypot(x0, b), m * vv * x0, 0.5 * L, m * vv * (b + x0)], raw`\text{kg·m}^2\text{/s}`),
            expl: raw`$|\vec r\times\vec p| = p\,r_\perp$, where $r_\perp = ${b}\,\text{m}$ is the perpendicular distance from the origin to the line of motion: $L = ${m}(${vv})(${b}) = ${L}\,\text{kg·m}^2\text{/s}$ — the same at every point on the line, as it must be with no torque.`,
          };
        }
        const CASES = [
          ['A wheel spins counterclockwise as seen from above.', 'vertically upward', ['vertically downward', 'horizontally, tangent to the rim', 'radially outward', 'there is no definite direction']],
          ['A record turntable spins clockwise as seen from above.', 'vertically downward', ['vertically upward', 'horizontally, tangent to the rim', 'radially inward', 'there is no definite direction']],
          ['A car drives due north. Consider the angular momentum of one of its wheels about its axle.', 'west', ['east', 'north', 'south', 'vertically upward']],
          ['A car drives due east. Consider the angular momentum of one of its wheels about its axle.', 'north', ['south', 'east', 'west', 'vertically downward']],
          ['The Earth spins on its axis from west to east. Consider the Earth’s spin angular momentum.', 'toward the North Star (out of the North Pole)', ['toward the south celestial pole (out of the South Pole)', 'toward the Sun', 'eastward, along the equator', 'westward, along the equator']],
          ['A wall clock runs normally. Consider the angular momentum of its second hand about the clock’s center.', 'into the clock face, away from the viewer', ['out of the clock face, toward the viewer', 'straight up', 'straight down', 'along the second hand']],
        ];
        const [s, right, wrong] = R.pick(CASES);
        return {
          level: 1,
          q: raw`${s} In what direction does the angular momentum vector point?`,
          ...GRE.mc(R, cap(right), wrong.map(cap)),
          expl: 'Right-hand rule: curl the fingers of your right hand in the sense of rotation; your thumb gives the direction of $\\vec\\omega$ and of $\\vec L = I\\vec\\omega$, which lies along the rotation axis. For a rolling wheel, $\\vec\\omega$ points to the left of the direction of travel.',
        };
      },
    },
    {
      id: 'mech.moi.parallel', sec: '1.4.3', level: 2, weight: 2,
      gen(R) {
        const SH = [
          ['a thin uniform rod of mass $M$ and length $L$', raw`\tfrac{1}{12}ML^2`, 'a perpendicular axis through its center', 1 / 12, 'ML^2', [[0.5, 'a perpendicular axis through one end'], [0.25, 'a perpendicular axis through a point $L/4$ from one end'], [1 / 6, 'a perpendicular axis through a point $L/3$ from one end'], [1, 'a perpendicular axis a distance $L$ from its center (outside the rod)']]],
          ['a uniform solid disk of mass $M$ and radius $R$', raw`\tfrac12 MR^2`, 'the perpendicular axis through its center', 0.5, 'MR^2', [[1, 'a perpendicular axis through a point on its rim'], [0.5, 'a perpendicular axis halfway between the center and the rim'], [2, 'a perpendicular axis a distance $2R$ from its center']]],
          ['a thin hoop of mass $M$ and radius $R$', raw`MR^2`, 'the perpendicular axis through its center', 1, 'MR^2', [[1, 'a perpendicular axis through a point on the hoop'], [0.5, 'a perpendicular axis a distance $R/2$ from its center']]],
          ['a uniform solid sphere of mass $M$ and radius $R$', raw`\tfrac25 MR^2`, 'a diameter', 0.4, 'MR^2', [[1, 'an axis tangent to its surface'], [2, 'an axis a distance $2R$ from its center']]],
          ['a thin spherical shell of mass $M$ and radius $R$', raw`\tfrac23 MR^2`, 'a diameter', 2 / 3, 'MR^2', [[1, 'an axis tangent to its surface']]],
          ['a uniform solid disk of mass $M$ and radius $R$', raw`\tfrac14 MR^2`, 'a diameter', 0.25, 'MR^2', [[1, 'an axis in the plane of the disk, tangent to its rim']]],
          ['a thin hoop of mass $M$ and radius $R$', raw`\tfrac12 MR^2`, 'a diameter', 0.5, 'MR^2', [[1, 'an axis in the plane of the hoop, tangent to it']]],
          ['a uniform square plate of mass $M$ and side $a$', raw`\tfrac16 Ma^2`, 'the perpendicular axis through its center', 1 / 6, 'Ma^2', [[Math.SQRT1_2, 'a perpendicular axis through one corner'], [0.5, 'a perpendicular axis through the midpoint of one edge']]],
        ];
        const [obj, Icm, axis0, c0, body, opts] = R.pick(SH);
        const [d, axis] = R.pick(opts);
        const ans = c0 + d * d;
        if (R.bool(0.6)) {
          const Mv = R.pick([0.5, 1, 2, 3, 4, 5, 6]), sv = R.pick([0.2, 0.3, 0.4, 0.5, 0.6, 0.8, 1, 1.2, 1.5, 2]);
          const sym = body.slice(1, 2), k = Mv * sv * sv;
          const objN = obj.replace('mass $M$', raw`mass $${Mv}\,\text{kg}$`).replace('$' + sym + '$', raw`$${sv}\,\text{m}$`);
          const axisN = axis.replace(/\$(\d?)(L|R|a)(\/\d)?\$/g, (mm, pre, _s, post) => raw`$${N2((pre ? +pre : 1) * sv / (post ? +post.slice(1) : 1), 3)}\,\text{m}$`);
          return {
            q: raw`${cap(objN)} has moment of inertia $${Icm}$ about ${axis0}. ${ask(ans * k)} its moment of inertia about ${axisN}, parallel to that axis?`,
            ...num(R, ans * k, [(c0 + d) * k, d * d * k, c0 * k, (c0 + 2 * d * d) * k, Math.abs(c0 - d * d) * k], raw`\text{kg·m}^2`, { tol: 0.06, fmt: x => F.num(x, 2) }),
            expl: raw`Parallel-axis theorem: $I = I_{\text{cm}} + Md^2 = (${F.num(c0, 3)} + ${F.num(d * d, 3)})(${Mv})(${sv})^2 \approx ${N2(ans * k)}\,\text{kg·m}^2$.`,
          };
        }
        return {
          q: raw`The moment of inertia of ${obj} about ${axis0} is $${Icm}$. What is its moment of inertia about ${axis}, parallel to that axis?`,
          ...mcv(R, ans, [c0 + d, c0 - d * d > 0 ? c0 - d * d : null, d * d, c0, c0 + 2 * d * d, c0 + d * d / 2, 2 * ans].filter(x => x != null && Math.abs(x - ans) > 1e-9), cf(body)),
          expl: raw`Parallel-axis theorem: $I = I_{\text{cm}} + Md^2$ with $d = ${coefTex(d, body.slice(1, 2))}$: $I = ${coefTex(c0, body)} + ${coefTex(d * d, body)} = ${coefTex(ans, body)}$. The center-of-mass axis always gives the smallest moment of inertia.`,
        };
      },
    },
    {
      id: 'mech.moi.density', sec: '1.4.3', level: 3,
      gen(R) {
        const kind = R.pick(['rod0', 'rodL', 'disk', 'sphere']);
        const n = kind === 'sphere' ? R.pick([2, 3, -1, -2, 4]) : kind === 'disk' ? R.pick([1, 2, 3, -1]) : R.pick([1, 2, 3, 4]);
        let ans, q, how, body, wr;
        const pw = (s, k) => (k === 1 ? s : `${s}^{${k}}`);
        if (kind === 'rod0' || kind === 'rodL') {
          body = 'ML^2';
          ans = kind === 'rod0' ? (n + 1) / (n + 3) : 2 / ((n + 2) * (n + 3));
          q = raw`A thin rod of length $L$ and mass $M$ has linear mass density $\lambda(x) = A${pw('x', n)}$, where $x$ is the distance from end O and $A$ is a constant. What is its moment of inertia about a perpendicular axis through ${kind === 'rod0' ? 'end O' : 'the other end (at $x = L$)'}?`;
          how = kind === 'rod0'
            ? raw`$M = \int_0^L A x^{${n}}dx = \dfrac{AL^{${n + 1}}}{${n + 1}}$ and $I = \int_0^L x^2 A x^{${n}}dx = \dfrac{AL^{${n + 3}}}{${n + 3}}$, so $I = \dfrac{${n + 1}}{${n + 3}}ML^2$.`
            : raw`$I = \int_0^L (L - x)^2 Ax^{${n}}dx$, and with $M = AL^{${n + 1}}/${n + 1}$ this gives $I = \dfrac{2}{(${n + 2})(${n + 3})}ML^2 = ${coefTex(ans, 'ML^2')}$ — small, because the mass is concentrated near the axis.`;
          wr = [1 / 3, (n + 1) / (n + 2), 1 / (n + 3), (n + 1) / (n + 3), 2 / ((n + 2) * (n + 3)), 1 / 12, (n + 1) / (n + 4)];
        } else if (kind === 'disk') {
          body = 'MR^2';
          ans = (n + 2) / (n + 4);
          q = raw`A thin disk of radius $R$ and mass $M$ has surface mass density $\sigma(r) = ${n === -1 ? 'A/r' : 'A' + pw('r', n)}$, where $r$ is the distance from its center and $A$ is a constant. What is its moment of inertia about the axis perpendicular to the disk through its center?`;
          how = raw`$M = \int_0^R \sigma\,2\pi r\,dr \propto \dfrac{R^{${n + 2}}}{${n + 2}}$ and $I = \int_0^R r^2\sigma\,2\pi r\,dr \propto \dfrac{R^{${n + 4}}}{${n + 4}}$, so $I = \dfrac{${n + 2}}{${n + 4}}MR^2 = ${coefTex(ans, 'MR^2')}$. (Uniform, $n = 0$, gives $\tfrac12$.)`;
          wr = [0.5, (n + 1) / (n + 3), (n + 2) / (n + 3), 2 / (n + 4), 1, 0.4, (n + 3) / (n + 5)];
        } else {
          body = 'MR^2';
          ans = (2 / 3) * (n + 3) / (n + 5);
          q = raw`A sphere of radius $R$ and mass $M$ has mass density $\rho(r) = ${n < 0 ? `A/${pw('r', -n)}` : 'A' + pw('r', n)}$, where $r$ is the distance from its center and $A$ is a constant. What is its moment of inertia about an axis through its center?`;
          how = raw`For each thin shell, $dI = \tfrac23 r^2\,dm$ with $dm = 4\pi r^2\rho\,dr$. Then $M \propto R^{${n + 3}}/${n + 3}$ and $I \propto \tfrac23 R^{${n + 5}}/${n + 5}$, so $I = \tfrac23\cdot\dfrac{${n + 3}}{${n + 5}}MR^2 = ${coefTex(ans, 'MR^2')}$. (Uniform, $n = 0$, gives $\tfrac25$.)`;
          wr = [0.4, 2 / 3, (n + 3) / (n + 5), (2 / 3) * (n + 2) / (n + 4), (2 / 5) * (n + 3) / (n + 5), (n + 3) / (n + 5) * 0.5, 0.5];
        }
        const wrs = wr.filter(x => x > 0 && Math.abs(x - ans) > 1e-9);
        if (R.bool(0.6)) {
          const Mv = R.pick([0.5, 1, 2, 3, 4, 5, 6, 8]), sv = R.pick([0.2, 0.3, 0.4, 0.5, 0.6, 0.8, 1, 1.5, 2]);
          const qn = q.replace(/(length|radius) \$(L|R)\$ and mass \$M\$/, (mm, w) => raw`${w} $${sv}\,\text{m}$ and mass $${Mv}\,\text{kg}$`);
          const k = Mv * sv * sv;
          return {
            q: qn.replace('What is its moment', ask(ans * k) + ' its moment'),
            ...num(R, ans * k, wrs.map(x => x * k), raw`\text{kg·m}^2`, { tol: 0.06, fmt: x => F.num(x, 2) }),
            expl: how + raw` Numerically, $I \approx ${F.num(ans, 3)}\times ${Mv}\times ${sv}^2 \approx ${N2(ans * k)}\,\text{kg·m}^2$.`,
          };
        }
        return { q, ...mcv(R, ans, wrs, cf(body)), expl: how };
      },
    },
    {
      id: 'mech.moi.composite', sec: '1.4.3', level: 2,
      gen(R) {
        const kind = R.pick(['square', 'square', 'tri', 'dumb', 'rodm', 'rank']);
        if (kind === 'square' || kind === 'tri') {
          const sq = kind === 'square';
          const AX = sq
            ? [[2, 'the axis perpendicular to the square through its center'], [4, 'the axis perpendicular to the square through one of the masses'], [2, 'an axis along one side of the square'], [1, 'an axis along a diagonal of the square'], [1, 'an axis in the plane of the square, through its center and parallel to one side']]
            : [[1, 'the axis perpendicular to the triangle through its center'], [2, 'the axis perpendicular to the triangle through one of the masses'], [0.75, 'an axis along one side of the triangle'], [0.5, 'an axis along one altitude of the triangle']];
          const [ans, ax] = R.pick(AX);
          return {
            level: 3,
            q: raw`${sq ? 'Four' : 'Three'} identical point masses $m$ are fixed at the corners of ${sq ? 'a square' : 'an equilateral triangle'} of side $a$ by light rods. What is the moment of inertia of the system about ${ax}?`,
            ...mcv(R, ans, [0.5, 0.75, 1, 1.5, 2, 3, 4, 6].filter(x => x !== ans), cf('ma^2')),
            expl: sq
              ? raw`Sum $m r_\perp^2$ over the masses: the center is $a/\sqrt2$ from each corner (giving $2ma^2$); from one corner the others are at $a, a, \sqrt2 a$ (giving $4ma^2$); a side holds two masses on the axis with the other two at $a$ ($2ma^2$); a diagonal leaves two masses at $a/\sqrt2$ ($ma^2$); the midline puts all four at $a/2$ ($ma^2$). Here: $${coefTex(ans, 'ma^2')}$.`
              : raw`Sum $m r_\perp^2$: each vertex is $a/\sqrt3$ from the centroid ($3m a^2/3 = ma^2$); from one vertex the others are at $a$ ($2ma^2$); a side leaves one mass at the height $\tfrac{\sqrt3}{2}a$ ($\tfrac34 ma^2$); an altitude leaves two masses at $a/2$ ($\tfrac12 ma^2$). Here: $${coefTex(ans, 'ma^2')}$.`,
          };
        }
        if (kind === 'dumb') {
          const m1 = R.pick([1, 2, 3]), m2 = R.pick([4, 5, 6, 8]), L = R.pick([0.5, 1, 1.5, 2]);
          const I = m1 * m2 * L * L / (m1 + m2);
          return {
            q: raw`Point masses of $${m1}\,\text{kg}$ and $${m2}\,\text{kg}$ are joined by a light rod $${L}\,\text{m}$ long. ${ask(I)} the moment of inertia of the system about a perpendicular axis through its center of mass?`,
            ...num(R, I, [(m1 + m2) * L * L / 4, (m1 + m2) * L * L, m2 * L * L, (m1 + m2) * L * L / 12], raw`\text{kg·m}^2`),
            expl: raw`The center of mass is $\tfrac{${m2}}{${m1 + m2}}L$ from the $${m1}\,\text{kg}$ mass. Summing $mr^2$ gives $I = \dfrac{m_1m_2}{m_1 + m_2}L^2 = \mu L^2 \approx ${N2(I)}\,\text{kg·m}^2$, with $\mu$ the reduced mass.`,
          };
        }
        if (kind === 'rodm') {
          const k = R.pick([0.5, 1, 2, 3]);
          const end = R.bool();
          const ans = end ? 1 / 3 + k : 1 / 12 + k / 2;
          const mt = k === 1 ? 'M' : coefTex(k, 'M');
          return {
            q: end
              ? raw`A small ball of mass $${mt}$ is attached to one end of a uniform rod of mass $M$ and length $L$. What is the moment of inertia of the combination about a perpendicular axis through the other end of the rod?`
              : raw`Small balls, each of mass $${mt}$, are attached to both ends of a uniform rod of mass $M$ and length $L$. What is the moment of inertia of the combination about a perpendicular axis through the center of the rod?`,
            ...mcv(R, ans, end ? [1 / 12 + k, 1 / 3 + k / 4, 1 + k, 1 / 3 + 2 * k, k] : [1 / 12 + k, 1 / 3 + k / 2, 1 / 12 + k / 4, 1 / 12 + 2 * k, k / 2], cf('ML^2')),
            expl: end
              ? raw`Rod about its end: $\tfrac13 ML^2$; ball at distance $L$: $${coefTex(k, 'ML^2')}$. Total $${coefTex(ans, 'ML^2')}$.`
              : raw`Rod about its center: $\tfrac1{12}ML^2$; two balls at $L/2$: $2(${coefTex(k, 'M')})(L/2)^2 = ${coefTex(k / 2, 'ML^2')}$. Total $${coefTex(ans, 'ML^2')}$.`,
          };
        }
        const sets = [['thin hoop', 'uniform solid disk', 'uniform solid sphere'], ['thin hoop', 'thin spherical shell', 'uniform solid sphere'], ['thin spherical shell', 'uniform solid disk', 'uniform solid sphere'], ['thin hoop', 'uniform solid disk', 'thin spherical shell']];
        const set = R.pick(sets);
        const I = { 'thin hoop': 1, 'uniform solid disk': 0.5, 'uniform solid sphere': 0.4, 'thin spherical shell': 2 / 3 };
        const most = R.bool();
        const sorted = set.slice().sort((a, b) => I[b] - I[a]);
        const right = most ? sorted[0] : sorted[2];
        return {
          level: 1,
          q: raw`A ${set[0]}, a ${set[1]}, and a ${set[2]} all have the same mass $M$ and the same radius $R$. Which has the ${most ? 'largest' : 'smallest'} moment of inertia about an axis through its center (perpendicular to the plane, for the flat objects)?`,
          ...GRE.mc(R, cap(`the ${right}`), set.filter(s => s !== right).map(s => cap(`the ${s}`)).concat(['They are all equal.', 'It depends on the mass and radius.'])),
          expl: raw`Moment of inertia grows with how far the mass sits from the axis: hoop $MR^2$ > spherical shell $\tfrac23 MR^2$ > disk $\tfrac12 MR^2$ > solid sphere $\tfrac25 MR^2$.`,
        };
      },
    },
    {
      id: 'mech.cm.points', sec: '1.4.4', level: 1,
      gen(R) {
        const kind = R.pick(['line', 'line', 'tri', 'hole', 'lrod', 'earth']);
        if (kind === 'line') {
          const ms = [R.int(1, 6), R.int(1, 6), R.int(1, 6)], xs = R.pickN([-4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6], 3);
          const M = sum(ms), X = (ms[0] * xs[0] + ms[1] * xs[1] + ms[2] * xs[2]) / M;
          if (Math.abs(X) < 0.05) throw new Error('zero');
          return {
            q: raw`Point masses of $${ms[0]}\,\text{kg}$, $${ms[1]}\,\text{kg}$, and $${ms[2]}\,\text{kg}$ lie on the $x$-axis at $x = ${xs[0]}\,\text{m}$, $x = ${xs[1]}\,\text{m}$, and $x = ${xs[2]}\,\text{m}$, respectively. ${ask(X)} the $x$-coordinate of their center of mass?`,
            ...num(R, X, [(xs[0] + xs[1] + xs[2]) / 3, -X, (ms[0] * xs[0] + ms[1] * xs[1] + ms[2] * xs[2]) / 3, X * 2], raw`\text{m}`, { allowSign: true, tol: 0.1 }),
            expl: raw`$x_{\text{cm}} = \dfrac{\sum m_ix_i}{\sum m_i} = \dfrac{${ms[0] * xs[0] + ms[1] * xs[1] + ms[2] * xs[2]}}{${M}} \approx ${N2(X)}\,\text{m}$.`,
          };
        }
        if (kind === 'tri') {
          const m = [R.int(1, 4), R.int(1, 4), R.int(1, 4)], a = R.int(2, 6), b = R.int(2, 6);
          const M = sum(m);
          const P = (x, y) => raw`$\left(${F.frac(x, M)},\ ${F.frac(y, M)}\right)\,\text{m}$`;
          const Pu = (x, y, d) => raw`$\left(${F.frac(x, d)},\ ${F.frac(y, d)}\right)\,\text{m}$`;
          const right = P(m[1] * a, m[2] * b);
          return {
            q: raw`Point masses are placed as follows: $${m[0]}\,\text{kg}$ at the origin, $${m[1]}\,\text{kg}$ at $(${a}, 0)\,\text{m}$, and $${m[2]}\,\text{kg}$ at $(0, ${b})\,\text{m}$. Where is the center of mass?`,
            ...GRE.mc(R, right, [P(m[2] * a, m[1] * b), Pu(a, b, 3), P(m[1] * b, m[2] * a), Pu(m[1] * a, m[2] * b, 3), Pu(a, b, 2), P(a, b), P((m[0] + m[1]) * a, (m[0] + m[2]) * b), P(m[1] * a, m[2] * b * 2), P(m[1] * a * 2, m[2] * b)].filter(s => s !== right)),
            expl: raw`$x_{\text{cm}} = \dfrac{${m[1]}(${a})}{${M}}$, $y_{\text{cm}} = \dfrac{${m[2]}(${b})}{${M}}$; each coordinate is weighted by the masses, not averaged over the points.`,
          };
        }
        if (kind === 'hole') {
          const [rk, dk] = R.pick([[2, 2], [3, 2], [4, 2], [3, 3], [4, 4], [2, 4], [3, 1.5]]); // hole radius R/rk, centered R/dk from center
          if (1 / rk + 1 / dk > 1 + 1e-9) throw new Error('hole outside');
          const ans = (1 / (rk * rk)) / (1 - 1 / (rk * rk)) / dk;
          const dTex = dk === 1.5 ? raw`2R/3` : raw`R/${dk}`;
          return {
            level: 2,
            q: raw`A circular hole of radius $R/${rk}$ is cut from a uniform flat disk of radius $R$; the center of the hole is a distance $${dTex}$ from the center of the disk. How far from the center of the original disk is the center of mass of the remaining piece?`,
            ...mcv(R, ans, [1 / dk, 1 / (rk * rk) / dk, 1 / rk / dk, ans * 2, ans / 2, (1 / rk) / (1 - 1 / rk) / dk, 0, 1 / (rk * rk)].filter(x => Math.abs(x - ans) > 1e-9), cf('R')),
            expl: raw`Treat the hole as negative mass: areas $\pi R^2$ at the center and $-\pi R^2/${rk * rk}$ at $${dTex}$. Then $x_{\text{cm}} = -\dfrac{(1/${rk * rk})(${dTex})}{1 - 1/${rk * rk}} = -${coefTex(ans, 'R')}$, on the side opposite the hole.`,
          };
        }
        if (kind === 'lrod') {
          const m1 = R.int(1, 5), m2 = R.int(1, 5), M = m1 + m2;
          const right = raw`$\left(${coefTex(m1 / (2 * M), 'L')},\ ${coefTex(m2 / (2 * M), 'L')}\right)$`;
          const pt = (x, y) => raw`$\left(${coefTex(x, 'L')},\ ${coefTex(y, 'L')}\right)$`;
          return {
            level: 2,
            q: raw`Two thin uniform rods, each of length $L$, are joined at the origin to form an L shape: rod A (mass $${m1}\,\text{kg}$) lies along the $x$-axis from $0$ to $L$, and rod B (mass $${m2}\,\text{kg}$) lies along the $y$-axis from $0$ to $L$. Where is the center of mass?`,
            ...GRE.mc(R, right, [pt(m2 / (2 * M), m1 / (2 * M)), pt(0.25, 0.25), pt(0.5, 0.5), pt(m1 / M, m2 / M), pt(m1 / (4 * M) * 2 + 0.25, 0.25)].filter(s => s !== right)),
            expl: raw`Replace each rod by a point mass at its midpoint: $${m1}\,\text{kg}$ at $(L/2, 0)$ and $${m2}\,\text{kg}$ at $(0, L/2)$. So $x_{\text{cm}} = \dfrac{${m1}(L/2)}{${M}}$ and $y_{\text{cm}} = \dfrac{${m2}(L/2)}{${M}}$.`,
          };
        }
        const [A, B, ratio, d, R0] = R.pick([['Earth', 'Moon', 81, 3.84e8, 6.4e6], ['Sun', 'Jupiter', 1050, 7.8e11, 7.0e8]]);
        const x = d / (ratio + 1);
        return {
          level: 2,
          q: raw`The ${A}’s mass is about ${ratio} times the ${B}’s, and their centers are about $${F.sci(d, 3)}\,\text{m}$ apart. Which of the following is closest to the distance of their common center of mass from the center of the ${A}? (The ${A}’s radius is about $${F.sci(R0, 2)}\,\text{m}$.)`,
          ...num(R, x, [d / ratio / 10, d / 2, x * 10, d / Math.sqrt(ratio)], raw`\text{m}`),
          expl: raw`$x_{\text{cm}} = \dfrac{m_{${B[0]}}\,d}{m_{${A[0]}} + m_{${B[0]}}} = \dfrac{d}{${ratio + 1}} \approx ${F.sci(x, 2)}\,\text{m}$ — ${x < R0 ? `inside the ${A}` : `just outside the ${A}’s surface`}.`,
        };
      },
    },
    {
      id: 'mech.cm.density', sec: '1.4.4', level: 2,
      gen(R) {
        if (R.bool(0.6)) {
          const lin = R.bool(0.35);
          if (lin) {
            const b = R.pick([1, 2, 3, 4]);
            const ans = (0.5 + b / 3) / (1 + b / 2);
            return {
              q: raw`A thin rod of length $L$ has linear density $\lambda(x) = \lambda_0\left(1 + ${b === 1 ? '' : b}x/L\right)$, where $x$ is measured from one end. How far from that end is its center of mass?`,
              ...mcv(R, ans, [0.5, 2 / 3, 0.75, (1 + b) / (2 + b), 0.6, 5 / 9, 7 / 12, 3 / 5, 11 / 18].filter(x => Math.abs(x - ans) > 1e-9), cf('L')),
              expl: raw`$x_{\text{cm}} = \dfrac{\int_0^L x(1 + ${b}x/L)dx}{\int_0^L (1 + ${b}x/L)dx} = \dfrac{L/2 + ${coefTex(b / 3, 'L')}}{1 + ${F.frac(b, 2)}} = ${coefTex(ans, 'L')}$, past the midpoint toward the denser end.`.replace(/1 \+ 1x/g, '1 + x'),
            };
          }
          const n = R.pick([1, 3, 4, 5]);
          const ans = (n + 1) / (n + 2);
          if (R.bool(0.6)) {
            const Lv = R.pick([0.6, 0.9, 1, 1.2, 1.5, 1.8, 2, 2.4, 3, 4, 6]);
            return {
              q: raw`A thin rod of length $${Lv}\,\text{m}$ has linear mass density $\lambda(x) = A${n === 1 ? 'x' : `x^{${n}}`}$, where $x$ is measured from one end and $A$ is a constant. ${ask(ans * Lv)} the distance of its center of mass from that end?`,
              ...num(R, ans * Lv, [0.5, n / (n + 1), (n + 1) / (n + 3), 1 / (n + 2), (n + 2) / (n + 3), 2 / 3].map(x => x * Lv), raw`\text{m}`, { tol: 0.05 }),
              expl: raw`$x_{\text{cm}} = \dfrac{\int_0^L x\cdot Ax^{${n}}dx}{\int_0^L Ax^{${n}}dx} = \dfrac{${n + 1}}{${n + 2}}L \approx ${N2(ans * Lv)}\,\text{m}$, beyond the midpoint toward the denser end.`,
            };
          }
          return {
            q: raw`A thin rod of length $L$ has linear mass density $\lambda(x) = A${n === 1 ? 'x' : `x^{${n}}`}$, where $x$ is measured from one end. How far from that end is its center of mass?`,
            ...mcv(R, ans, [0.5, n / (n + 1), (n + 1) / (n + 3), 1 / (n + 2), (n + 2) / (n + 3), 2 / 3, 1, (n + 1) / (n + 4), 3 / 5, 0.8].filter(x => Math.abs(x - ans) > 1e-9), cf('L')),
            expl: raw`$x_{\text{cm}} = \dfrac{\int_0^L x\cdot Ax^{${n}}dx}{\int_0^L Ax^{${n}}dx} = \dfrac{L^{${n + 2}}/${n + 2}}{L^{${n + 1}}/${n + 1}} = ${coefTex(ans, 'L')}$.`,
          };
        }
        const SH = [
          ['a uniform solid hemisphere of radius $R$', 'from its flat face', 3 / 8, 'R'],
          ['a thin uniform hemispherical shell of radius $R$', 'from the plane of its rim', 1 / 2, 'R'],
          ['a thin uniform wire bent into a semicircle of radius $R$', 'from the center of the circle', 2 / Math.PI, 'R'],
          ['a uniform flat semicircular plate of radius $R$', 'from the center of its straight edge', 4 / (3 * Math.PI), 'R'],
          ['a uniform solid right circular cone of height $h$', 'from its base', 1 / 4, 'h'],
          ['a uniform flat triangular plate of height $h$ (measured from one side)', 'from that side', 1 / 3, 'h'],
        ];
        const [obj, from, c, s] = R.pick(SH);
        const fm = x => {
          if (Math.abs(x - 2 / Math.PI) < 1e-9) return raw`$\dfrac{2${s}}{\pi}$`;
          if (Math.abs(x - 4 / (3 * Math.PI)) < 1e-9) return raw`$\dfrac{4${s}}{3\pi}$`;
          if (Math.abs(x - 1 / Math.PI) < 1e-9) return raw`$\dfrac{${s}}{\pi}$`;
          return cf(s)(x);
        };
        const pool = s === 'h' ? [1 / 4, 1 / 3, 1 / 2, 2 / 3, 3 / 4, 3 / 8] : [3 / 8, 1 / 2, 2 / Math.PI, 4 / (3 * Math.PI), 1 / Math.PI, 1 / 3, 2 / 3];
        return {
          q: raw`How far is the center of mass of ${obj} ${from}?`,
          ...mcv(R, c, pool.filter(x => Math.abs(x - c) > 1e-9), fm),
          expl: raw`Integrate $\int z\,dm/M$ using slices parallel to the reference plane (or arc elements for the wire). The standard results: solid hemisphere $3R/8$, hemispherical shell $R/2$, semicircular wire $2R/\pi$, semicircular plate $4R/3\pi$, solid cone $h/4$ from the base, triangle $h/3$ from the side. Here: ${fm(c)}.`,
        };
      },
    },
    {
      id: 'mech.cm.motion', sec: '1.4.4', level: 2,
      gen(R) {
        const kind = R.pick(['boat', 'boat', 'skaters', 'explode', 'vcm']);
        if (kind === 'boat') {
          const m = R.pick([50, 60, 70, 80, 90]), M = R.pick([100, 120, 150, 200, 240, 300]), L = R.pick([2, 3, 4, 5, 6]);
          const d = m * L / (m + M);
          return {
            q: raw`A $${m}\,\text{kg}$ person stands at one end of a $${M}\,\text{kg}$ boat, $${L}\,\text{m}$ long, floating at rest on calm water. The person walks to the other end. Neglecting water resistance, how far does the boat move?`,
            ...num(R, d, [m * L / M, L, M * L / (m + M), L / 2], raw`\text{m}`, { tol: 0.08 }),
            expl: raw`No external horizontal force, so the center of mass stays put: $m(L - d) = Md$, giving $d = \dfrac{mL}{m + M} \approx ${N2(d)}\,\text{m}$ (opposite to the person’s walk).`,
          };
        }
        if (kind === 'skaters') {
          const m1 = R.pick([40, 50, 60, 70]), m2 = R.pick([60, 75, 80, 90, 100]), D = R.pick([6, 8, 10, 12, 15]);
          if (m1 === m2) throw new Error('eq');
          const x = m2 * D / (m1 + m2);
          return {
            q: raw`Two skaters, of masses $${m1}\,\text{kg}$ and $${m2}\,\text{kg}$, stand at rest on frictionless ice $${D}\,\text{m}$ apart, holding opposite ends of a rope. They pull themselves together. How far does the $${m1}\,\text{kg}$ skater move before they meet?`,
            ...num(R, x, [m1 * D / (m1 + m2), D / 2, m2 * D / m1 / 2, D], raw`\text{m}`, { tol: 0.06 }),
            expl: raw`They meet at their (fixed) center of mass, which is $\dfrac{m_2D}{m_1 + m_2} = ${N2(x, 3)}\,\text{m}$ from the lighter skater — the lighter one moves farther.`,
          };
        }
        if (kind === 'explode') {
          const Rg = R.pick([40, 60, 80, 100, 120, 200, 240, 300]);
          const [m1, m2] = R.pick([[1, 1], [1, 2], [2, 1], [1, 3], [3, 1]]);
          const x2 = ((m1 + m2) * Rg - m1 * Rg / 2) / m2;
          return {
            level: 3,
            q: raw`A projectile would land $${Rg}\,\text{m}$ from its launch point on level ground. At the top of its trajectory it explodes into two pieces${m1 === m2 ? ' of equal mass' : raw` of masses in the ratio $${m1}:${m2}$`}. ${m1 === m2 ? 'One piece' : 'The first piece'} drops straight down from rest and lands directly below the explosion point. Neglecting air resistance, how far from the launch point does the other piece land?`,
            ...num(R, x2, [Rg, 2 * Rg, 1.5 * Rg * (m1 === m2 ? 4 / 3 : 1), Rg * (1 + m1 / m2), Rg / 2 + Rg * m1 / m2 / 2].filter(x => Math.abs(x - x2) > 1e-6), raw`\text{m}`, { tol: 0.06 }),
            expl: raw`The explosion forces are internal, so the center of mass still lands at $${Rg}\,\text{m}$ (both pieces hit the ground together, since both start the fall with zero vertical velocity). With ${m1 === m2 ? 'one piece' : 'the first piece'} at $${Rg / 2}\,\text{m}$: $${m1}(${Rg / 2}) + ${m2 === 1 ? '' : m2}x = ${m1 + m2}(${Rg})$, so $x = ${N2(x2, 3)}\,\text{m}$.`,
          };
        }
        const m1 = R.int(1, 6), m2 = R.int(1, 6), v1 = R.pick([2, 3, 4, 5, 6]), v2 = R.pick([1, 2, 3, 4]);
        const opp = R.bool();
        const V = (m1 * v1 + (opp ? -1 : 1) * m2 * v2) / (m1 + m2);
        if (Math.abs(V) < 0.05) throw new Error('zero');
        return {
          level: 1,
          q: raw`A $${m1}\,\text{kg}$ cart moves at $${v1}\,\text{m/s}$ to the right and a $${m2}\,\text{kg}$ cart moves at $${v2}\,\text{m/s}$ to the ${opp ? 'left' : 'right'} on the same frictionless track. ${ask(Math.abs(V))} the speed of the center of mass of the two-cart system?`,
          ...num(R, Math.abs(V), [(v1 + (opp ? -v2 : v2)) / 2, (m1 * v1 + m2 * v2) / (m1 + m2), Math.abs(m1 * v1 - m2 * v2), (v1 + v2) / 2].map(Math.abs).filter(x => x > 0), raw`\text{m/s}`),
          expl: raw`$V_{\text{cm}} = \dfrac{\sum m_iv_i}{\sum m_i} = \dfrac{${m1}(${v1}) ${opp ? '-' : '+'} ${m2}(${v2})}{${m1 + m2}} \approx ${N2(V)}\,\text{m/s}$ — and it stays at that value through any collision between the carts.`,
        };
      },
    },
  ];
  TEMPLATES.forEach(t => {
    const gen = t.gen;
    t.gen = R => { const o = gen(R); o.q = fixArticles(o.q).replace(/x\^\{1\}/g, 'x'); o.expl = o.expl.replace(/x\^\{1\}/g, 'x'); return o; };
  });
  GRE.addTemplates('mech', TEMPLATES);
})(typeof window !== 'undefined' ? window.GRE : this.GRE);
