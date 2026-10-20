/* Classical Mechanics, part B — §1.5–1.8 of Conquering the Physics GRE:
 * Lagrangians and Hamiltonians, orbits, springs/oscillations, fluids.
 * Templates follow the conventions in tools/AUTHORING.md (ids prefixed 'mech2.').
 */
(function (GRE) {
  'use strict';
  const F = GRE.fmt;
  const raw = String.raw;

  // ---------------------------------------------------------------- helpers
  const mth = s => '$' + s + '$';
  const dt = s => raw`\dot{${s}}`;
  const ddt = s => raw`\ddot{${s}}`;
  // TeX macros used as symbols carry a trailing space so they can be followed by letters
  const ELL = raw`\ell `, TH = raw`\theta `, PH = raw`\phi `;
  const ROM = ['I', 'II', 'III'];
  const paren = f => (/[+-]/.test(f) ? raw`\left(${f}\right)` : f);
  /** exact TeX for a number (throws if none) */
  function ex(x) {
    const e = F.exact(x);
    if (e == null) throw new Error('no exact form for ' + x);
    return e;
  }
  /** TeX for sqrt(c * top / bot), c a positive rational; bot may be '' */
  function sqrtR(c, top, bot) {
    const r = F.toRational(c, 2000);
    if (!r || c <= 0) throw new Error('sqrtR: bad coefficient ' + c);
    const [p, q] = r;
    const num = (p === 1 ? '' : p) + top;
    const den = (q === 1 ? '' : q) + bot;
    return den ? raw`\sqrt{\frac{${num}}{${den}}}` : raw`\sqrt{${num}}`;
  }
  /** signed sum of [coefficient, body] pairs, e.g. [[-3,'kx'],[0.5,'ky']] -> "-3kx + \frac{1}{2}ky" */
  function sumTeX(terms, lead) {
    let out = '';
    terms.filter(t => t[0] !== 0).forEach(([c, b], i) => {
      const r = F.toRational(Math.abs(c), 200);
      if (!r) throw new Error('sumTeX: irrational ' + c);
      const body = F.coef(r[0], r[1]) + b;
      out += i === 0 && !lead ? (c < 0 ? '-' : '') + body : (c < 0 ? ' - ' : ' + ') + body;
    });
    return out || '0';
  }
  /** a/b * top / bot as one fraction, e.g. fracSym(2/3, 'GMm', 'R') -> \frac{2GMm}{3R} */
  function fracSym(c, top, bot) {
    const r = F.toRational(c, 2000);
    if (!r) throw new Error('fracSym: irrational ' + c);
    const num = (r[0] === 1 ? '' : r[0]) + top, den = (r[1] === 1 ? '' : r[1]) + bot;
    return den ? raw`\frac{${num}}{${den}}` : num;
  }
  const nR = (n, s = 'R') => (n === 1 ? s : n + s);
  /** multiple choice from numbers: fmt(value) -> choice string; choices ordered by value */
  function mcNum(R, cv, wvs, fmt, opts = {}) {
    const val = new Map();
    const f = v => { const s = fmt(v); if (s != null && !val.has(s)) val.set(s, v); return s; };
    const c = f(cv);
    const ws = [];
    for (const v of wvs) {
      if (v == null || !isFinite(v)) continue;
      if (!opts.allowSign && cv > 0 && v <= 0) continue;
      if (Math.abs(v - cv) < 1e-9 * Math.max(1, Math.abs(cv))) continue;
      const s = f(v);
      if (s != null && s !== c) ws.push(s);
    }
    return GRE.mc(R, c, ws, { rank: s => val.get(s) });
  }
  const exM = v => { if (!(Math.abs(v) > 1e-3 && Math.abs(v) < 1e4)) return null; const e = F.exact(v); return e == null ? null : mth(e); };

  /** choose 3 statements [text, truth, note?] with at least one true */
  function pick3(R, pool) {
    for (let t = 0; t < 80; t++) {
      const s = R.pickN(pool, 3);
      if (s.some(x => x[1])) return s;
    }
    throw new Error('pick3: no true statement');
  }
  function romanQ(R, intro, pool, why) {
    const s = pick3(R, pool);
    return {
      q: GRE.romanStem(intro, s.map(x => x[0])),
      ...GRE.roman(R, s.map(x => !!x[1])),
      expl: (why ? why + ' ' : '') + s.map((x, i) => `${ROM[i]} is ${x[1] ? 'true' : 'false'}${x[2] ? ': ' + x[2] : ''}.`).join(' '),
    };
  }

  // ================================================================ §1.5 mechanical systems
  // Each system returns {desc, lv:{field: level}, and any of
  //   T/Tw/Twhy, L/Lw/Lwhy, eoms:[{c, eq, w, why}], H/Hw/Hwhy, cons/consw/consWhy}
  const SYS = [];
  const sys = (id, has, make) => SYS.push({ id, has: has.split(' '), make });
  const pickSys = (R, field) => R.pick(SYS.filter(s => s.has.indexOf(field) >= 0)).make(R);

  // central potentials: U, -U and +U as signed terms, U'(r)
  const UPOT = [
    { U: raw`-\frac{k}{r}`, mU: raw`+ \frac{k}{r}`, pU: raw`- \frac{k}{r}`, dU: raw`\frac{k}{r^2}`, txt: raw`$U(r) = -k/r$ (with $k > 0$)` },
    { U: raw`U(r)`, mU: raw`- U(r)`, pU: raw`+ U(r)`, dU: raw`U'(r)`, txt: raw`$U(r)$` },
    { U: raw`\frac{1}{2}kr^2`, mU: raw`- \frac{1}{2}kr^2`, pU: raw`+ \frac{1}{2}kr^2`, dU: raw`kr`, txt: raw`$U(r) = \frac{1}{2}kr^2$` },
    { U: raw`\alpha r^4`, mU: raw`- \alpha r^4`, pU: raw`+ \alpha r^4`, dU: raw`4\alpha r^3`, txt: raw`$U(r) = \alpha r^4$` },
    { U: raw`-\frac{\alpha}{r^2}`, mU: raw`+ \frac{\alpha}{r^2}`, pU: raw`- \frac{\alpha}{r^2}`, dU: raw`\frac{2\alpha}{r^3}`, txt: raw`$U(r) = -\alpha/r^2$ (with $\alpha > 0$)` },
  ];

  // --- simple pendulum
  sys('pend', 'L eom H', R => {
    const m = R.pick(['m', 'M']), l = R.pick([ELL, 'b', 'R']), q = R.pick([TH, PH]);
    const qd = dt(q), qdd = ddt(q), p = raw`p_{${q}}`;
    const T = raw`\frac{1}{2}${m}${l}^2${qd}^2`;
    return {
      lv: { L: 1, eom: 1, H: 2 },
      desc: R.pick([
        raw`A simple pendulum consists of a point mass $${m}$ on a massless rigid rod of length $${l}$ swinging in a vertical plane about a fixed frictionless pivot. Let $${q}$ be the angle of the rod from the downward vertical.`,
        raw`A small bob of mass $${m}$ hangs from a fixed pivot by a light rigid rod of length $${l}$ and swings in a vertical plane in a uniform gravitational field $g$. Let $${q}$ be the angle between the rod and the downward vertical.`]),
      L: raw`${T} + ${m}g${l}\cos${q}`,
      Lw: [raw`${T} - ${m}g${l}\cos${q}`, raw`${T} + ${m}g${l}\sin${q}`, raw`\frac{1}{2}${m}${l}${qd}^2 + ${m}g${l}\cos${q}`, raw`${T} - ${m}g${l}\sin${q}`, raw`\frac{1}{2}${m}${qd}^2 + ${m}g${l}\cos${q}`],
      Lwhy: raw`The bob moves on a circle of radius $${l}$, so $T = ${T}$; its height relative to the pivot is $-${l}\cos${q}$, so $U = -${m}g${l}\cos${q}$ and $L = T - U = ${T} + ${m}g${l}\cos${q}$. Using $T + U$ (a common slip) flips the sign of the potential term.`,
      eoms: [{
        c: q, eq: raw`${qdd} = -\frac{g}{${l}}\sin${q}`,
        w: [raw`${qdd} = \frac{g}{${l}}\sin${q}`, raw`${qdd} = -\frac{g}{${l}}\cos${q}`, raw`${qdd} = -g${l}\sin${q}`, raw`${qdd} = -\frac{${l}}{g}\sin${q}`, raw`${qdd} = -\frac{g}{${l}}${qd}\sin${q}`],
        why: raw`From $L = ${T} + ${m}g${l}\cos${q}$: $\frac{d}{dt}\frac{\partial L}{\partial ${qd}} = ${m}${l}^2${qdd}$ and $\frac{\partial L}{\partial ${q}} = -${m}g${l}\sin${q}$, so $${qdd} = -(g/${l})\sin${q}$. For small angles this is SHM with $\omega = \sqrt{g/${l}}$.`,
      }],
      H: raw`\frac{${p}^2}{2${m}${l}^2} - ${m}g${l}\cos${q}`,
      Hw: [raw`\frac{${p}^2}{2${m}${l}^2} + ${m}g${l}\cos${q}`, raw`\frac{${p}^2}{2${m}} - ${m}g${l}\cos${q}`, raw`\frac{${m}${l}^2${p}^2}{2} - ${m}g${l}\cos${q}`, raw`\frac{${p}^2}{2${m}${l}^2} - ${m}g${l}\sin${q}`, raw`\frac{${p}^2}{2${m}${l}} - ${m}g${l}\cos${q}`],
      Hwhy: raw`$${p} = \partial L/\partial ${qd} = ${m}${l}^2${qd}$. The potential is velocity- and time-independent, so $H = T + U = \frac{${p}^2}{2${m}${l}^2} - ${m}g${l}\cos${q}$: the moment of inertia $${m}${l}^2$ sits in the denominator and the potential enters with the opposite sign from $L$.`,
    };
  });

  // --- bead on a rotating hoop
  sys('hoop', 'L T eom H cons', R => {
    const m = R.pick(['m', 'M']), a = R.pick(['R', 'a', 'r']), q = R.pick([TH, PH]);
    const qd = dt(q), qdd = ddt(q), p = raw`p_{${q}}`;
    const T = raw`\frac{1}{2}${m}${a}^2\left(${qd}^2 + \omega^2\sin^2${q}\right)`;
    const V = raw`${m}g${a}\cos${q}`;
    return {
      lv: { L: 2, T: 2, eom: 2, H: 3, cons: 3 },
      desc: R.pick([
        raw`A bead of mass $${m}$ slides without friction on a circular wire hoop of radius $${a}$. A motor keeps the hoop rotating at constant angular velocity $\omega$ about its vertical diameter. Let $${q}$ be the angular position of the bead measured from the bottom of the hoop (at the hoop's center).`,
        raw`A circular hoop of radius $${a}$ is spun at constant angular speed $\omega$ about a vertical axis along one of its diameters. A bead of mass $${m}$ slides freely on the hoop; $${q}$ is the angle between the downward vertical and the line from the hoop's center to the bead.`]),
      T,
      Tw: [raw`\frac{1}{2}${m}${a}^2${qd}^2`, raw`\frac{1}{2}${m}${a}^2\left(${qd}^2 + \omega^2\right)`, raw`\frac{1}{2}${m}${a}^2\left(${qd}^2 + \omega^2\cos^2${q}\right)`, raw`\frac{1}{2}${m}${a}^2\left(${qd} + \omega\sin${q}\right)^2`, raw`\frac{1}{2}${m}${a}^2\left(${qd}^2 + \omega^2\sin${q}\right)`],
      Twhy: raw`With the origin at the hoop's center the bead is at $(${a}\sin${q}\cos\omega t,\ ${a}\sin${q}\sin\omega t,\ -${a}\cos${q})$. Differentiating, $v^2 = ${a}^2${qd}^2 + ${a}^2\omega^2\sin^2${q}$: motion along the hoop plus circular motion of radius $${a}\sin${q}$ about the axis. The two velocity components are perpendicular, so there is no cross term.`,
      L: raw`${T} + ${V}`,
      Lw: [raw`${T} - ${V}`, raw`\frac{1}{2}${m}${a}^2${qd}^2 + ${V}`, raw`\frac{1}{2}${m}${a}^2\left(${qd}^2 + \omega^2\cos^2${q}\right) + ${V}`, raw`\frac{1}{2}${m}${a}^2\left(${qd}^2 + \omega^2\right) + ${V}`, raw`\frac{1}{2}${m}${a}^2\left(${qd}^2 - \omega^2\sin^2${q}\right) + ${V}`],
      Lwhy: raw`The bead's speed has a part $${a}${qd}$ along the hoop and a perpendicular part $\omega ${a}\sin${q}$ from the rotation, so $T = ${T}$. With $U = -${V}$ (height $-${a}\cos${q}$), $L = T - U = ${T} + ${V}$.`,
      eoms: [{
        c: q, eq: raw`${qdd} = \left(\omega^2\cos${q} - \frac{g}{${a}}\right)\sin${q}`,
        w: [raw`${qdd} = -\left(\omega^2\cos${q} + \frac{g}{${a}}\right)\sin${q}`, raw`${qdd} = \left(\omega^2 - \frac{g}{${a}}\right)\sin${q}`, raw`${qdd} = \left(\frac{g}{${a}} - \omega^2\cos${q}\right)\sin${q}`, raw`${qdd} = -\frac{g}{${a}}\sin${q}`, raw`${qdd} = \left(\omega^2\sin${q} - \frac{g}{${a}}\right)\cos${q}`],
        why: raw`$\partial L/\partial ${q} = ${m}${a}^2\omega^2\sin${q}\cos${q} - ${m}g${a}\sin${q}$ and $\frac{d}{dt}(\partial L/\partial ${qd}) = ${m}${a}^2${qdd}$, so $${qdd} = (\omega^2\cos${q} - g/${a})\sin${q}$. Check: for $\omega = 0$ it reduces to the pendulum equation, and for $\omega^2 > g/${a}$ the bottom becomes unstable.`,
      }],
      H: raw`\frac{${p}^2}{2${m}${a}^2} - \frac{1}{2}${m}${a}^2\omega^2\sin^2${q} - ${V}`,
      Hw: [raw`\frac{${p}^2}{2${m}${a}^2} + \frac{1}{2}${m}${a}^2\omega^2\sin^2${q} - ${V}`, raw`\frac{${p}^2}{2${m}${a}^2} - \frac{1}{2}${m}${a}^2\omega^2\sin^2${q} + ${V}`, raw`\frac{${p}^2}{2${m}} - \frac{1}{2}${m}${a}^2\omega^2\sin^2${q} - ${V}`, raw`\frac{${p}^2}{2${m}${a}^2} - ${V}`, raw`\frac{${p}^2}{2${m}${a}^2\sin^2${q}} - ${V}`],
      Hwhy: raw`$${p} = ${m}${a}^2${qd}$ and $H = ${p}${qd} - L = \frac{${p}^2}{2${m}${a}^2} - \frac{1}{2}${m}${a}^2\omega^2\sin^2${q} - ${V}$. Here $H \ne T + U$: the constraint (the spinning hoop) depends on time, so the shortcut $H = T + U$ fails and the $\omega^2$ term enters with a minus sign.`,
      cons: raw`\frac{1}{2}${m}${a}^2${qd}^2 - \frac{1}{2}${m}${a}^2\omega^2\sin^2${q} - ${V}`,
      consw: [raw`\frac{1}{2}${m}${a}^2\left(${qd}^2 + \omega^2\sin^2${q}\right) - ${V}`, raw`${m}${a}^2${qd}`, raw`${m}${a}^2\omega\sin^2${q}`, raw`${m}${a}^2${qd}\sin^2${q}`, raw`\frac{1}{2}${m}${a}^2${qd}^2 - ${V}`],
      consWhy: raw`$L$ has no explicit time dependence, so $h = ${qd}\,\partial L/\partial ${qd} - L$ (the Hamiltonian) is conserved: $h = \frac{1}{2}${m}${a}^2${qd}^2 - \frac{1}{2}${m}${a}^2\omega^2\sin^2${q} - ${V}$. The energy $T + U$ is not conserved, because the motor does work to keep $\omega$ fixed, and $${q}$ is not cyclic.`,
    };
  });

  // --- particle in a plane, central potential, polar coordinates
  sys('polar', 'L T eom H cons', R => {
    const m = R.pick(['m', 'M']), q = R.pick([TH, PH]), u = R.pick(UPOT);
    const qd = dt(q), qdd = ddt(q), p = raw`p_{${q}}`;
    const T = raw`\frac{1}{2}${m}\left(\dot{r}^2 + r^2${qd}^2\right)`;
    const Tw = [raw`\frac{1}{2}${m}\left(\dot{r}^2 + r${qd}^2\right)`, raw`\frac{1}{2}${m}\left(\dot{r}^2 + ${qd}^2\right)`, raw`\frac{1}{2}${m}\left(\dot{r} + r${qd}\right)^2`, raw`\frac{1}{2}${m}r^2\left(\dot{r}^2 + ${qd}^2\right)`];
    return {
      lv: { L: 1, T: 1, eom: 2, H: 2, cons: 1 },
      desc: R.pick([
        raw`A particle of mass $${m}$ moves in a plane under a central force with potential energy ${u.txt}. Use polar coordinates $(r, ${q})$ centered on the force center.`,
        raw`In polar coordinates $(r, ${q})$, a particle of mass $${m}$ moves in a plane in the central potential ${u.txt}.`]),
      T, Tw: Tw.concat([raw`\frac{1}{2}${m}\dot{r}^2`]),
      Twhy: raw`In polar coordinates the velocity has radial component $\dot{r}$ and perpendicular component $r${qd}$, so $T = ${T}$. Note the $r^2$ multiplying $${qd}^2$, required by dimensions.`,
      L: raw`${T} ${u.mU}`,
      Lw: Tw.map(t => raw`${t} ${u.mU}`).concat([raw`${T} ${u.pU}`]),
      Lwhy: raw`$T = ${T}$ (radial and tangential velocities $\dot{r}$ and $r${qd}$), so $L = T - U = ${T} ${u.mU}$.`,
      eoms: [{
        c: 'r', eq: raw`${m}\ddot{r} = ${m}r${qd}^2 - ${u.dU}`,
        w: [raw`${m}\ddot{r} = -${m}r${qd}^2 - ${u.dU}`, raw`${m}\ddot{r} = ${m}r${qd}^2 + ${u.dU}`, raw`${m}\ddot{r} = -${u.dU}`, raw`${m}\ddot{r} = ${m}r^2${qd}^2 - ${u.dU}`, raw`${m}\ddot{r} = ${m}\dot{r}${qd} - ${u.dU}`],
        why: raw`$\frac{d}{dt}\frac{\partial L}{\partial \dot{r}} = ${m}\ddot{r}$ and $\frac{\partial L}{\partial r} = ${m}r${qd}^2 - \frac{dU}{dr}$ with $\frac{dU}{dr} = ${u.dU}$. The $${m}r${qd}^2$ term is the outward centrifugal term.`,
      }, {
        c: q, eq: raw`r${qdd} + 2\dot{r}${qd} = 0`,
        w: [raw`r${qdd} = 0`, raw`r${qdd} - 2\dot{r}${qd} = 0`, raw`r${qdd} + \dot{r}${qd} = 0`, raw`${m}r^2${qdd} = -${u.dU}`, raw`r${qdd} + 2r${qd}^2 = 0`],
        why: raw`$${q}$ is cyclic, so $\frac{d}{dt}(${m}r^2${qd}) = ${m}(r^2${qdd} + 2r\dot{r}${qd}) = 0$; dividing by $${m}r$ gives $r${qdd} + 2\dot{r}${qd} = 0$ (conservation of angular momentum).`,
      }],
      H: raw`\frac{p_r^2}{2${m}} + \frac{${p}^2}{2${m}r^2} ${u.pU}`,
      Hw: [raw`\frac{p_r^2}{2${m}} + \frac{${p}^2}{2${m}} ${u.pU}`, raw`\frac{p_r^2}{2${m}} + \frac{${p}^2}{2${m}r^2} ${u.mU}`, raw`\frac{p_r^2}{2${m}} + \frac{${p}^2}{2${m}r} ${u.pU}`, raw`\frac{p_r^2 + ${p}^2}{2${m}r^2} ${u.pU}`, raw`\frac{p_r^2}{2${m}} + \frac{r^2${p}^2}{2${m}} ${u.pU}`],
      Hwhy: raw`$p_r = ${m}\dot{r}$ and $${p} = ${m}r^2${qd}$, and $H = T + U$ for this ordinary potential: $H = \frac{p_r^2}{2${m}} + \frac{${p}^2}{2${m}r^2} ${u.pU}$. The angular term has the moment of inertia $${m}r^2$ in its denominator.`,
      cons: raw`${m}r^2${qd}`,
      consw: [raw`${m}r${qd}`, raw`${m}\dot{r}`, raw`\frac{1}{2}${m}r^2${qd}^2`, raw`${m}r^2\dot{r}`, raw`${m}r\dot{r}${qd}`],
      consWhy: raw`$L$ does not depend on $${q}$ (it is cyclic), so its conjugate momentum $\partial L/\partial ${qd} = ${m}r^2${qd}$, the angular momentum, is conserved. The tangential linear momentum $${m}r${qd}$ is not.`,
    };
  });

  // --- spherical coordinates
  sys('sph', 'L T H cons', R => {
    const m = R.pick(['m', 'M']), u = R.pick(UPOT);
    const T = raw`\frac{1}{2}${m}\left(\dot{r}^2 + r^2\dot{\theta}^2 + r^2\sin^2\theta\,\dot{\phi}^2\right)`;
    const Tw = [raw`\frac{1}{2}${m}\left(\dot{r}^2 + r^2\dot{\theta}^2 + r^2\dot{\phi}^2\right)`, raw`\frac{1}{2}${m}\left(\dot{r}^2 + r^2\dot{\theta}^2 + r^2\cos^2\theta\,\dot{\phi}^2\right)`, raw`\frac{1}{2}${m}\left(\dot{r}^2 + r^2\dot{\theta}^2 + r^2\sin\theta\,\dot{\phi}^2\right)`, raw`\frac{1}{2}${m}\left(\dot{r}^2 + r\dot{\theta}^2 + r\sin\theta\,\dot{\phi}^2\right)`];
    return {
      lv: { L: 2, T: 2, H: 2, cons: 2 },
      desc: raw`A particle of mass $${m}$ moves in three dimensions in the central potential ${u.txt}. Use spherical coordinates $(r, \theta, \phi)$, with $\theta$ the polar angle measured from the $z$-axis.`,
      T, Tw: Tw.concat([raw`\frac{1}{2}${m}\left(\dot{r}^2 + \dot{\theta}^2 + \sin^2\theta\,\dot{\phi}^2\right)`]),
      Twhy: raw`The velocity components along $\hat{r}, \hat{\theta}, \hat{\phi}$ are $\dot{r}$, $r\dot{\theta}$ and $r\sin\theta\,\dot{\phi}$ (the distance from the $z$-axis is $r\sin\theta$), so $T = ${T}$.`,
      L: raw`${T} ${u.mU}`,
      Lw: Tw.map(t => raw`${t} ${u.mU}`).concat([raw`${T} ${u.pU}`]),
      Lwhy: raw`The velocity components are $\dot{r}$, $r\dot{\theta}$ and $r\sin\theta\,\dot{\phi}$, so $L = T - U = ${T} ${u.mU}$.`,
      H: raw`\frac{p_r^2}{2${m}} + \frac{p_{\theta}^2}{2${m}r^2} + \frac{p_{\phi}^2}{2${m}r^2\sin^2\theta} ${u.pU}`,
      Hw: [raw`\frac{p_r^2}{2${m}} + \frac{p_{\theta}^2}{2${m}r^2} + \frac{p_{\phi}^2}{2${m}r^2} ${u.pU}`, raw`\frac{p_r^2}{2${m}} + \frac{p_{\theta}^2}{2${m}r^2} + \frac{p_{\phi}^2}{2${m}r^2\cos^2\theta} ${u.pU}`, raw`\frac{p_r^2}{2${m}} + \frac{p_{\theta}^2}{2${m}r^2} + \frac{p_{\phi}^2\sin^2\theta}{2${m}r^2} ${u.pU}`, raw`\frac{p_r^2}{2${m}} + \frac{p_{\theta}^2}{2${m}r^2} + \frac{p_{\phi}^2}{2${m}r^2\sin^2\theta} ${u.mU}`, raw`\frac{p_r^2 + p_{\theta}^2 + p_{\phi}^2}{2${m}} ${u.pU}`],
      Hwhy: raw`The conjugate momenta are $p_r = ${m}\dot{r}$, $p_{\theta} = ${m}r^2\dot{\theta}$, $p_{\phi} = ${m}r^2\sin^2\theta\,\dot{\phi}$; each kinetic term is $p^2/(2\times\text{its coefficient})$, and $H = T + U$.`,
      cons: raw`${m}r^2\sin^2\theta\,\dot{\phi}`,
      consw: [raw`${m}r^2\dot{\phi}`, raw`${m}r^2\dot{\theta}`, raw`${m}r\sin\theta\,\dot{\phi}`, raw`${m}r^2\cos^2\theta\,\dot{\phi}`, raw`${m}r^2\sin\theta\,\dot{\phi}`],
      consWhy: raw`$\phi$ is cyclic, so $p_{\phi} = \partial L/\partial \dot{\phi} = ${m}r^2\sin^2\theta\,\dot{\phi}$ (the $z$-component of angular momentum) is conserved; $\theta$ appears in $L$ through $\sin^2\theta$, so $p_{\theta}$ is not.`,
    };
  });

  // --- pendulum hanging from a sliding cart
  sys('cart', 'L T eom cons', R => {
    const l = R.pick([ELL, 'b']), q = R.pick([TH, PH]), veh = R.pick(['cart', 'block', 'trolley']);
    const qd = dt(q), qdd = ddt(q);
    const kin = cross => raw`\frac{1}{2}(M+m)\dot{x}^2 + ${cross}\frac{1}{2}m${l}^2${qd}^2`;
    const T = kin(raw`m${l}\dot{x}${qd}\cos${q} + `);
    const Tw = [kin(''), kin(raw`m${l}\dot{x}${qd}\sin${q} + `), raw`\frac{1}{2}M\dot{x}^2 + \frac{1}{2}m${l}^2${qd}^2`, kin(raw`2m${l}\dot{x}${qd}\cos${q} + `), kin(raw`m${l}\dot{x}${qd} + `)];
    const V = raw`mg${l}\cos${q}`;
    return {
      lv: { L: 3, T: 3, eom: 3, cons: 2 },
      desc: raw`A ${veh} of mass $M$ slides without friction along a horizontal track; $x$ is its position. A bob of mass $m$ hangs from the ${veh} on a massless rod of length $${l}$ and swings in the vertical plane containing the track, so that the bob is at horizontal position $x + ${l}\sin${q}$ and a distance $${l}\cos${q}$ below the pivot.`,
      T, Tw,
      Twhy: raw`The bob's velocity is $(\dot{x} + ${l}${qd}\cos${q},\ ${l}${qd}\sin${q})$, so $T = \frac{1}{2}M\dot{x}^2 + \frac{1}{2}m(\dot{x}^2 + 2${l}\dot{x}${qd}\cos${q} + ${l}^2${qd}^2)$. The cross term $m${l}\dot{x}${qd}\cos${q}$ is exactly what is lost by simply adding the cart's and the pendulum's kinetic energies.`,
      L: raw`${T} + ${V}`,
      Lw: [raw`${T} - ${V}`].concat(Tw.slice(0, 4).map(t => raw`${t} + ${V}`)),
      Lwhy: raw`Write the bob's position $(x + ${l}\sin${q}, -${l}\cos${q})$ and differentiate: $T = \frac{1}{2}(M+m)\dot{x}^2 + m${l}\dot{x}${qd}\cos${q} + \frac{1}{2}m${l}^2${qd}^2$, $U = -${V}$. The cross term is the classic trap.`,
      eoms: [{
        c: q, eq: raw`${l}${qdd} + \ddot{x}\cos${q} + g\sin${q} = 0`,
        w: [raw`${l}${qdd} + g\sin${q} = 0`, raw`${l}${qdd} - \ddot{x}\cos${q} + g\sin${q} = 0`, raw`${l}${qdd} + \ddot{x}\cos${q} - g\sin${q} = 0`, raw`${l}${qdd} + \ddot{x}\cos${q} - \dot{x}${qd}\sin${q} + g\sin${q} = 0`, raw`${l}${qdd} + \ddot{x}\sin${q} + g\sin${q} = 0`],
        why: raw`$\frac{\partial L}{\partial ${qd}} = m${l}^2${qd} + m${l}\dot{x}\cos${q}$, whose time derivative is $m${l}^2${qdd} + m${l}\ddot{x}\cos${q} - m${l}\dot{x}${qd}\sin${q}$; $\frac{\partial L}{\partial ${q}} = -m${l}\dot{x}${qd}\sin${q} - mg${l}\sin${q}$. The $\dot{x}${qd}$ terms cancel, leaving $${l}${qdd} + \ddot{x}\cos${q} + g\sin${q} = 0$.`,
      }, {
        c: 'x', eq: raw`(M+m)\ddot{x} + m${l}${qdd}\cos${q} - m${l}${qd}^2\sin${q} = 0`,
        w: [raw`(M+m)\ddot{x} + m${l}${qdd}\cos${q} = 0`, raw`(M+m)\ddot{x} + m${l}${qdd}\cos${q} + m${l}${qd}^2\sin${q} = 0`, raw`(M+m)\ddot{x} = 0`, raw`M\ddot{x} + m${l}${qdd}\cos${q} - m${l}${qd}^2\sin${q} = 0`, raw`(M+m)\ddot{x} - m${l}${qdd}\sin${q} - m${l}${qd}^2\cos${q} = 0`],
        why: raw`$x$ is cyclic, so $\frac{d}{dt}\left[(M+m)\dot{x} + m${l}${qd}\cos${q}\right] = 0$. Differentiating the product $${qd}\cos${q}$ gives $${qdd}\cos${q} - ${qd}^2\sin${q}$.`,
      }],
      cons: raw`(M+m)\dot{x} + m${l}${qd}\cos${q}`,
      consw: [raw`(M+m)\dot{x}`, raw`M\dot{x}`, raw`(M+m)\dot{x} + m${l}${qd}\sin${q}`, raw`m${l}^2${qd} + m${l}\dot{x}\cos${q}`, raw`M\dot{x} + m${l}${qd}\cos${q}`],
      consWhy: raw`$x$ does not appear in $L$, so $p_x = \partial L/\partial \dot{x} = (M+m)\dot{x} + m${l}${qd}\cos${q}$ is conserved: the total horizontal momentum of cart plus bob (no horizontal external force). $p_{${q}}$ is not conserved because of the gravitational torque.`,
    };
  });

  // --- Atwood machine with a massive pulley
  sys('atwood', 'L T eom H', R => {
    const a = R.pick(['R', 'r']);
    const Mx = raw`m_1 + m_2 + I/${a}^2`;
    const T = raw`\frac{1}{2}\left(m_1 + m_2 + \frac{I}{${a}^2}\right)\dot{x}^2`;
    const V = raw`(m_1 - m_2)gx`;
    return {
      lv: { L: 2, T: 2, eom: 2, H: 2 },
      desc: R.pick([
        raw`In an Atwood machine, masses $m_1$ and $m_2$ hang on either side of a pulley of radius $${a}$ and moment of inertia $I$, connected by a massless string that does not slip on the pulley. Let $x$ be the downward displacement of $m_1$ (so $m_2$ rises by $x$).`,
        raw`Two blocks of masses $m_1$ and $m_2$ are connected by a light inextensible string over a pulley (radius $${a}$, moment of inertia $I$) whose frictionless axle is fixed; the string does not slip. The coordinate $x$ is the distance $m_1$ has descended.`]),
      T, Tw: [raw`\frac{1}{2}(m_1 + m_2)\dot{x}^2`, raw`\frac{1}{2}\left(m_1 + m_2 + I${a}^2\right)\dot{x}^2`, raw`\frac{1}{2}\left(m_1 - m_2 + \frac{I}{${a}^2}\right)\dot{x}^2`, raw`\frac{1}{2}\left(m_1 + m_2 + \frac{I}{${a}}\right)\dot{x}^2`],
      Twhy: raw`Both blocks move with speed $\dot{x}$ and the pulley turns with $\omega = \dot{x}/${a}$, so $T = \frac{1}{2}(m_1 + m_2)\dot{x}^2 + \frac{1}{2}I(\dot{x}/${a})^2$.`,
      L: raw`${T} + ${V}`,
      Lw: [raw`\frac{1}{2}(m_1 + m_2)\dot{x}^2 + ${V}`, raw`\frac{1}{2}\left(m_1 + m_2 + I${a}^2\right)\dot{x}^2 + ${V}`, raw`${T} - ${V}`, raw`${T} + (m_1 + m_2)gx`],
      Lwhy: raw`$T = \frac{1}{2}(m_1+m_2)\dot{x}^2 + \frac{1}{2}I(\dot{x}/${a})^2$ and $U = -m_1gx + m_2gx$, so $L = ${T} + ${V}$.`,
      eoms: [{
        c: 'x', eq: raw`\ddot{x} = \frac{(m_1 - m_2)g}{${Mx}}`,
        w: [raw`\ddot{x} = \frac{(m_1 - m_2)g}{m_1 + m_2}`, raw`\ddot{x} = \frac{(m_1 - m_2)g}{m_1 + m_2 + I${a}^2}`, raw`\ddot{x} = \frac{(m_1 + m_2)g}{${Mx}}`, raw`\ddot{x} = \frac{(m_1 - m_2)g}{m_1 + m_2 - I/${a}^2}`, raw`\ddot{x} = \frac{(m_2 - m_1)g}{${Mx}}`],
        why: raw`The Euler–Lagrange equation gives $(${Mx})\ddot{x} = (m_1 - m_2)g$: the pulley adds an effective inertia $I/${a}^2$ but no driving force. Limits check: $I \to 0$ gives the familiar Atwood result.`,
      }],
      H: raw`\frac{p_x^2}{2(${Mx})} - ${V}`,
      Hw: [raw`\frac{p_x^2}{2(${Mx})} + ${V}`, raw`\frac{p_x^2}{2(m_1 + m_2)} - ${V}`, raw`\frac{p_x^2}{2(m_1 + m_2 + I${a}^2)} - ${V}`, raw`\frac{(${Mx})\,p_x^2}{2} - ${V}`, raw`\frac{p_x^2}{2(${Mx})} - (m_1 + m_2)gx`],
      Hwhy: raw`$p_x = (${Mx})\dot{x}$, and $H = T + U = \frac{p_x^2}{2(${Mx})} - ${V}$.`,
    };
  });

  // --- block on a sliding wedge
  sys('wedge', 'L T eom cons', R => {
    const kin = cross => raw`\frac{1}{2}(M+m)\dot{X}^2 + ${cross}\frac{1}{2}m\dot{s}^2`;
    const T = kin(raw`m\dot{X}\dot{s}\cos\alpha + `);
    const Tw = [kin(''), kin(raw`m\dot{X}\dot{s}\sin\alpha + `), raw`\frac{1}{2}M\dot{X}^2 + \frac{1}{2}m\dot{s}^2`, kin(raw`2m\dot{X}\dot{s}\cos\alpha + `)];
    return {
      lv: { L: 3, T: 3, eom: 3, cons: 3 },
      desc: raw`A wedge of mass $M$ with incline angle $\alpha$ rests on a frictionless horizontal floor; $X$ is its horizontal position. A block of mass $m$ slides without friction on the incline; $s$ is the block's distance down the incline, which descends toward $+x$, so relative to the wedge the block's velocity is $(\dot{s}\cos\alpha, -\dot{s}\sin\alpha)$.`,
      T, Tw: Tw.concat([kin(raw`m\dot{X}\dot{s} + `)]),
      Twhy: raw`The block's velocity is $(\dot{X} + \dot{s}\cos\alpha,\ -\dot{s}\sin\alpha)$, so $\frac{1}{2}m v^2 = \frac{1}{2}m(\dot{X}^2 + 2\dot{X}\dot{s}\cos\alpha + \dot{s}^2)$. Adding $\frac{1}{2}M\dot{X}^2$ gives the result; the cross term is the usual trap.`,
      L: raw`${T} + mgs\sin\alpha`,
      Lw: [raw`${T} - mgs\sin\alpha`, raw`${T} + mgs\cos\alpha`].concat(Tw.map(t => raw`${t} + mgs\sin\alpha`)),
      Lwhy: raw`The block's velocity is $(\dot{X} + \dot{s}\cos\alpha, -\dot{s}\sin\alpha)$ and its height drops by $s\sin\alpha$, so $L = \frac{1}{2}M\dot{X}^2 + \frac{1}{2}m(\dot{X}^2 + 2\dot{X}\dot{s}\cos\alpha + \dot{s}^2) + mgs\sin\alpha$.`,
      eoms: [{
        c: 's', eq: raw`\ddot{s} + \ddot{X}\cos\alpha = g\sin\alpha`,
        w: [raw`\ddot{s} = g\sin\alpha`, raw`\ddot{s} - \ddot{X}\cos\alpha = g\sin\alpha`, raw`\ddot{s} + \ddot{X}\cos\alpha = g\cos\alpha`, raw`\ddot{s} + \ddot{X}\sin\alpha = g\sin\alpha`, raw`\ddot{s} + \ddot{X}\cos\alpha = -g\sin\alpha`],
        why: raw`$\partial L/\partial \dot{s} = m\dot{s} + m\dot{X}\cos\alpha$ and $\partial L/\partial s = mg\sin\alpha$, so $\ddot{s} + \ddot{X}\cos\alpha = g\sin\alpha$. For a fixed wedge ($\ddot{X} = 0$) this is the familiar $g\sin\alpha$.`,
      }, {
        c: 'X', eq: raw`(M+m)\ddot{X} + m\ddot{s}\cos\alpha = 0`,
        w: [raw`(M+m)\ddot{X} = 0`, raw`M\ddot{X} + m\ddot{s}\cos\alpha = 0`, raw`(M+m)\ddot{X} - m\ddot{s}\cos\alpha = 0`, raw`(M+m)\ddot{X} + m\ddot{s}\sin\alpha = 0`, raw`(M+m)\ddot{X} + m\ddot{s}\cos\alpha = mg\sin\alpha`],
        why: raw`$X$ is cyclic, so $\frac{d}{dt}\left[(M+m)\dot{X} + m\dot{s}\cos\alpha\right] = 0$: no horizontal external force acts on the wedge–block system.`,
      }],
      cons: raw`(M+m)\dot{X} + m\dot{s}\cos\alpha`,
      consw: [raw`(M+m)\dot{X}`, raw`M\dot{X}`, raw`(M+m)\dot{X} + m\dot{s}\sin\alpha`, raw`m\dot{s} + m\dot{X}\cos\alpha`, raw`M\dot{X} + m\dot{s}\cos\alpha`],
      consWhy: raw`$X$ is cyclic, so $p_X = \partial L/\partial \dot{X} = (M+m)\dot{X} + m\dot{s}\cos\alpha$ is conserved — the total horizontal momentum. $p_s$ is not, since gravity pulls the block down the incline.`,
    };
  });

  // --- bead on a rotating rod (horizontal plane)
  sys('rod', 'L eom H cons', R => {
    const m = R.pick(['m', 'M']), w = R.pick([raw`\omega `, raw`\Omega `]);
    return {
      lv: { L: 2, eom: 2, H: 3, cons: 3 },
      desc: R.pick([
        raw`A bead of mass $${m}$ slides without friction along a straight rod that a motor keeps rotating at constant angular velocity $${w}$ in a horizontal plane about a vertical axis through one end. Let $r$ be the bead's distance from the axis.`,
        raw`A straight frictionless wire lies in a horizontal plane and is driven to rotate at constant angular speed $${w}$ about a vertical axis through one of its ends. A bead of mass $${m}$ is free to slide along the wire; $r$ is its distance from the axis.`]),
      L: raw`\frac{1}{2}${m}\left(\dot{r}^2 + ${w}^2r^2\right)`,
      Lw: [raw`\frac{1}{2}${m}\dot{r}^2`, raw`\frac{1}{2}${m}\left(\dot{r}^2 - ${w}^2r^2\right)`, raw`\frac{1}{2}${m}\left(\dot{r} + ${w}r\right)^2`, raw`\frac{1}{2}${m}\left(\dot{r}^2 + ${w}^2\right)r^2`, raw`\frac{1}{2}${m}\left(\dot{r}^2 + ${w}r^2\right)`],
      Lwhy: raw`The bead has radial velocity $\dot{r}$ and tangential velocity $${w}r$; the plane is horizontal so $U$ is constant. Hence $L = T = \frac{1}{2}${m}(\dot{r}^2 + ${w}^2r^2)$.`,
      eoms: [{
        c: 'r', eq: raw`\ddot{r} = ${w}^2r`,
        w: [raw`\ddot{r} = -${w}^2r`, raw`\ddot{r} = 0`, raw`\ddot{r} = 2${w}^2r`, raw`\ddot{r} = ${w}^2r - 2${w}\dot{r}`, raw`\ddot{r} = ${w}r`],
        why: raw`$\frac{d}{dt}(${m}\dot{r}) = ${m}${w}^2r$, so $\ddot{r} = ${w}^2r$: the bead is flung outward exponentially (the "centrifugal" term). A minus sign would give oscillation, which is unphysical here.`,
      }],
      H: raw`\frac{p_r^2}{2${m}} - \frac{1}{2}${m}${w}^2r^2`,
      Hw: [raw`\frac{p_r^2}{2${m}} + \frac{1}{2}${m}${w}^2r^2`, raw`\frac{p_r^2}{2${m}}`, raw`\frac{p_r^2}{2${m}} - ${m}${w}^2r^2`, raw`\frac{p_r^2}{2${m}r^2} - \frac{1}{2}${m}${w}^2r^2`, raw`\frac{(p_r - ${m}${w}r)^2}{2${m}}`],
      Hwhy: raw`$p_r = ${m}\dot{r}$ and $H = p_r\dot{r} - L = \frac{p_r^2}{2${m}} - \frac{1}{2}${m}${w}^2r^2$. It is not $T + U$, because the constraint (the rotating rod) depends on time.`,
      cons: raw`\frac{1}{2}${m}\dot{r}^2 - \frac{1}{2}${m}${w}^2r^2`,
      consw: [raw`\frac{1}{2}${m}\left(\dot{r}^2 + ${w}^2r^2\right)`, raw`${m}r^2${w}`, raw`${m}\dot{r}`, raw`${m}${w}r`, raw`\frac{1}{2}${m}\dot{r}^2`],
      consWhy: raw`$L$ has no explicit time dependence, so $h = \dot{r}\,\partial L/\partial\dot{r} - L = \frac{1}{2}${m}\dot{r}^2 - \frac{1}{2}${m}${w}^2r^2$ is conserved. The kinetic energy and the angular momentum $${m}r^2${w}$ both grow as the bead moves out — the motor supplies energy and torque.`,
    };
  });

  // --- spring pendulum
  sys('springpend', 'L eom H', R => {
    const q = R.pick([TH, PH]), l0 = R.pick([raw`\ell_0`, 'a']);
    const qd = dt(q), qdd = ddt(q), p = raw`p_{${q}}`;
    const T = raw`\frac{1}{2}m\left(\dot{r}^2 + r^2${qd}^2\right)`;
    const S = raw`\frac{1}{2}k(r - ${l0})^2`;
    return {
      lv: { L: 2, eom: 2, H: 2 },
      desc: raw`A mass $m$ hangs from a fixed point by a massless spring of spring constant $k$ and natural length $${l0}$, and moves in a vertical plane. Let $r$ be the length of the spring and $${q}$ its angle from the downward vertical.`,
      L: raw`${T} + mgr\cos${q} - ${S}`,
      Lw: [raw`${T} - mgr\cos${q} - ${S}`, raw`${T} + mgr\cos${q} + ${S}`, raw`\frac{1}{2}m\left(\dot{r}^2 + ${l0}^2${qd}^2\right) + mgr\cos${q} - ${S}`, raw`\frac{1}{2}m\left(\dot{r}^2 + r${qd}^2\right) + mgr\cos${q} - ${S}`, raw`${T} + mg${l0}\cos${q} - ${S}`],
      Lwhy: raw`Polar coordinates give $T = ${T}$; gravity contributes $U_g = -mgr\cos${q}$ and the spring $${S}$. So $L = ${T} + mgr\cos${q} - ${S}$.`,
      eoms: [{
        c: 'r', eq: raw`m\ddot{r} = mr${qd}^2 + mg\cos${q} - k(r - ${l0})`,
        w: [raw`m\ddot{r} = -mr${qd}^2 + mg\cos${q} - k(r - ${l0})`, raw`m\ddot{r} = mr${qd}^2 - mg\cos${q} - k(r - ${l0})`, raw`m\ddot{r} = mg\cos${q} - k(r - ${l0})`, raw`m\ddot{r} = mr${qd}^2 + mg\cos${q} + k(r - ${l0})`, raw`m\ddot{r} = mr${qd}^2 + mg\sin${q} - k(r - ${l0})`],
        why: raw`$\partial L/\partial r = mr${qd}^2 + mg\cos${q} - k(r - ${l0})$ and $\frac{d}{dt}(m\dot{r}) = m\ddot{r}$: centrifugal term, the radial component of gravity, and the spring force.`,
      }, {
        c: q, eq: raw`r${qdd} + 2\dot{r}${qd} + g\sin${q} = 0`,
        w: [raw`r${qdd} + g\sin${q} = 0`, raw`r${qdd} + \dot{r}${qd} + g\sin${q} = 0`, raw`r${qdd} - 2\dot{r}${qd} + g\sin${q} = 0`, raw`r${qdd} + 2\dot{r}${qd} - g\sin${q} = 0`, raw`r${qdd} + 2\dot{r}${qd} + g\cos${q} = 0`],
        why: raw`$\frac{d}{dt}(mr^2${qd}) = mr^2${qdd} + 2mr\dot{r}${qd}$ and $\partial L/\partial ${q} = -mgr\sin${q}$; divide by $mr$. The $2\dot{r}${qd}$ (Coriolis-like) term comes from differentiating $r^2$.`,
      }],
      H: raw`\frac{p_r^2}{2m} + \frac{${p}^2}{2mr^2} - mgr\cos${q} + ${S}`,
      Hw: [raw`\frac{p_r^2}{2m} + \frac{${p}^2}{2m} - mgr\cos${q} + ${S}`, raw`\frac{p_r^2}{2m} + \frac{${p}^2}{2mr^2} + mgr\cos${q} + ${S}`, raw`\frac{p_r^2}{2m} + \frac{${p}^2}{2mr^2} - mgr\cos${q} - ${S}`, raw`\frac{p_r^2}{2m} + \frac{${p}^2}{2m${l0}^2} - mgr\cos${q} + ${S}`, raw`\frac{p_r^2 + ${p}^2}{2mr^2} - mgr\cos${q} + ${S}`],
      Hwhy: raw`$p_r = m\dot{r}$, $${p} = mr^2${qd}$, and since the potentials depend only on coordinates, $H = T + U = \frac{p_r^2}{2m} + \frac{${p}^2}{2mr^2} - mgr\cos${q} + ${S}$.`,
    };
  });

  // --- two masses joined by a spring on a line
  sys('twomass', 'L eom H cons', R => {
    const l0 = R.pick([raw`\ell_0`, 'a', 'd']);
    const S = raw`\frac{1}{2}k(x_2 - x_1 - ${l0})^2`;
    const T = raw`\frac{1}{2}m_1\dot{x}_1^2 + \frac{1}{2}m_2\dot{x}_2^2`;
    return {
      lv: { L: 1, eom: 2, H: 1, cons: 1 },
      desc: R.pick([
        raw`Two blocks of masses $m_1$ and $m_2$ slide on a frictionless horizontal track, joined by a spring of constant $k$ and natural length $${l0}$. Their positions are $x_1$ and $x_2$, with $x_2 > x_1$.`,
        raw`A diatomic molecule is modeled as masses $m_1$ and $m_2$ on a line at positions $x_1 \lt x_2$, joined by a spring of constant $k$ and equilibrium length $${l0}$.`]),
      L: raw`${T} - ${S}`,
      Lw: [raw`${T} + ${S}`, raw`${T} - \frac{1}{2}k(x_2 - x_1)^2`, raw`${T} - \frac{1}{2}k(x_2 + x_1 - ${l0})^2`, raw`\frac{1}{2}(m_1 + m_2)(\dot{x}_1 + \dot{x}_2)^2 - ${S}`, raw`${T} - \frac{1}{2}k(x_1^2 + x_2^2)`],
      Lwhy: raw`The spring's stretch is $x_2 - x_1 - ${l0}$, so $U = ${S}$ and $L = ${T} - ${S}$.`,
      eoms: [{
        c: 'x_1', eq: raw`m_1\ddot{x}_1 = k(x_2 - x_1 - ${l0})`,
        w: [raw`m_1\ddot{x}_1 = -k(x_2 - x_1 - ${l0})`, raw`m_1\ddot{x}_1 = -kx_1`, raw`m_1\ddot{x}_1 = k(x_2 - x_1)`, raw`m_1\ddot{x}_1 = -k(x_1 + x_2 - ${l0})`, raw`(m_1 + m_2)\ddot{x}_1 = k(x_2 - x_1 - ${l0})`],
        why: raw`$\partial L/\partial x_1 = +k(x_2 - x_1 - ${l0})$: when the spring is stretched it pulls $m_1$ toward $+x$, i.e. toward $m_2$.`,
      }, {
        c: 'x_2', eq: raw`m_2\ddot{x}_2 = -k(x_2 - x_1 - ${l0})`,
        w: [raw`m_2\ddot{x}_2 = k(x_2 - x_1 - ${l0})`, raw`m_2\ddot{x}_2 = -kx_2`, raw`m_2\ddot{x}_2 = -k(x_2 - x_1)`, raw`m_2\ddot{x}_2 = -k(x_1 + x_2 - ${l0})`, raw`(m_1 + m_2)\ddot{x}_2 = -k(x_2 - x_1 - ${l0})`],
        why: raw`$\partial L/\partial x_2 = -k(x_2 - x_1 - ${l0})$: a stretched spring pulls $m_2$ back toward $m_1$ (in the $-x$ direction).`,
      }],
      H: raw`\frac{p_1^2}{2m_1} + \frac{p_2^2}{2m_2} + ${S}`,
      Hw: [raw`\frac{p_1^2}{2m_1} + \frac{p_2^2}{2m_2} - ${S}`, raw`\frac{(p_1 + p_2)^2}{2(m_1 + m_2)} + ${S}`, raw`\frac{p_1^2}{2m_1} + \frac{p_2^2}{2m_2} + \frac{1}{2}k(x_2 - x_1)^2`, raw`\frac{m_1p_1^2}{2} + \frac{m_2p_2^2}{2} + ${S}`, raw`\frac{p_1^2 + p_2^2}{2(m_1 + m_2)} + ${S}`],
      Hwhy: raw`$p_i = m_i\dot{x}_i$ and $H = T + U = \frac{p_1^2}{2m_1} + \frac{p_2^2}{2m_2} + ${S}$.`,
      cons: raw`m_1\dot{x}_1 + m_2\dot{x}_2`,
      consw: [raw`m_1\dot{x}_1 - m_2\dot{x}_2`, raw`m_1\dot{x}_1`, raw`m_1\dot{x}_2 + m_2\dot{x}_1`, raw`m_1x_1 + m_2x_2`, raw`(m_1 + m_2)(\dot{x}_1 + \dot{x}_2)`],
      consWhy: raw`$L$ is unchanged by the shift $x_1 \to x_1 + \epsilon$, $x_2 \to x_2 + \epsilon$ (translation invariance), so the total momentum $m_1\dot{x}_1 + m_2\dot{x}_2$ is conserved. Equivalently, in coordinates $X_{\text{cm}}$ and $x_2 - x_1$, the center-of-mass coordinate is cyclic.`,
    };
  });

  // --- object rolling without slipping down an incline
  const ROLLERS = [
    { n: 'thin hoop', b: [1, 1] }, { n: 'uniform solid cylinder', b: [1, 2] },
    { n: 'uniform solid sphere', b: [2, 5] }, { n: 'thin spherical shell', b: [2, 3] },
  ];
  sys('roll', 'L T eom H', R => {
    const o = R.pick(ROLLERS), others = ROLLERS.filter(x => x !== o);
    const x = R.pick(['x', 's']), xd = dt(x), a = R.pick([raw`\alpha `, raw`\theta `]);
    const b = o.b[0] / o.b[1];
    const tc = x0 => { const r = F.toRational((1 + x0) / 2, 100); return F.coef(r[0], r[1]); };   // T = tc M xdot^2
    const Tof = bb => raw`${tc(bb)}M${xd}^2`;
    const acc = bb => { const r = F.toRational(1 / (1 + bb), 100); return F.coef(r[0], r[1]); };
    const hco = bb => { const r = F.toRational(1 / (2 * (1 + bb)), 100); return [r[0], r[1]]; };
    const Hof = (bb, sg) => { const [n, d] = hco(bb); return raw`\frac{${n === 1 ? '' : n}p_{${x}}^2}{${d}M} ${sg} Mg${x}\sin${a}`; };
    const V = raw`Mg${x}\sin${a}`;
    const ob = others.map(z => z.b[0] / z.b[1]);
    return {
      lv: { L: 2, T: 2, eom: 2, H: 2 },
      desc: raw`A ${o.n} of mass $M$ and radius $R$ rolls without slipping down a fixed incline of angle $${a}$. Let $${x}$ be the distance its center has moved down the incline.`,
      T: Tof(b), Tw: [raw`\frac{1}{2}M${xd}^2`].concat(ob.map(Tof)),
      Twhy: raw`Rolling without slipping means $\omega = ${xd}/R$, so $T = \frac{1}{2}M${xd}^2 + \frac{1}{2}I\omega^2 = \frac{1}{2}(1 + \beta_I)M${xd}^2$ with $I = \beta_I MR^2$; here $\beta_I = ${F.frac(o.b[0], o.b[1])}$, giving $${Tof(b)}$.`,
      L: raw`${Tof(b)} + ${V}`,
      Lw: [raw`\frac{1}{2}M${xd}^2 + ${V}`, raw`${Tof(b)} - ${V}`, raw`${Tof(b)} + Mg${x}\cos${a}`].concat(ob.map(bb => raw`${Tof(bb)} + ${V}`)),
      Lwhy: raw`With $I = ${F.frac(o.b[0], o.b[1])}MR^2$ and $\omega = ${xd}/R$, $T = ${Tof(b)}$; the height drops by $${x}\sin${a}$, so $L = ${Tof(b)} + ${V}$.`,
      eoms: [{
        c: x, eq: raw`\ddot{${x}} = ${acc(b)}g\sin${a}`,
        w: [raw`\ddot{${x}} = g\sin${a}`, raw`\ddot{${x}} = ${acc(b)}g\cos${a}`].concat(ob.map(bb => raw`\ddot{${x}} = ${acc(bb)}g\sin${a}`)),
        why: raw`From $L = ${Tof(b)} + ${V}$: $(1 + \beta_I)M\ddot{${x}} = Mg\sin${a}$ with $\beta_I = I/MR^2 = ${F.frac(o.b[0], o.b[1])}$, so $\ddot{${x}} = \frac{g\sin${a}}{1 + I/MR^2} = ${acc(b)}g\sin${a}$. Rolling objects always accelerate more slowly than a frictionless sliding block.`,
      }],
      H: Hof(b, '-'), Hw: [Hof(b, '+'), raw`\frac{p_{${x}}^2}{2M} - ${V}`].concat(ob.map(bb => Hof(bb, '-'))),
      Hwhy: raw`$p_{${x}} = (1 + \beta_I)M${xd}$ with $\beta_I = ${F.frac(o.b[0], o.b[1])}$, so $T = p_{${x}}^2/[2(1 + \beta_I)M]$ and $H = T + U = ${Hof(b, '-')}$.`,
    };
  });

  // --- particle sliding on the inside of a cone
  sys('cone', 'L T eom H cons', R => {
    const m = R.pick(['m', 'M']);
    const T = raw`\frac{1}{2}${m}\left(\dot{s}^2 + s^2\sin^2\alpha\,\dot{\phi}^2\right)`;
    const Tw = [raw`\frac{1}{2}${m}\left(\dot{s}^2 + s^2\dot{\phi}^2\right)`, raw`\frac{1}{2}${m}\left(\dot{s}^2 + s^2\cos^2\alpha\,\dot{\phi}^2\right)`, raw`\frac{1}{2}${m}\left(\dot{s}^2 + s^2\sin\alpha\,\dot{\phi}^2\right)`, raw`\frac{1}{2}${m}\left(\dot{s}^2\sin^2\alpha + s^2\dot{\phi}^2\right)`];
    const V = raw`${m}gs\cos\alpha`;
    return {
      lv: { L: 2, T: 2, eom: 3, H: 3, cons: 2 },
      desc: raw`A particle of mass $${m}$ slides without friction on the inner surface of a cone whose axis is vertical, with its vertex pointing down and half-angle $\alpha$ (the angle between the surface and the axis). Let $s$ be the particle's distance from the vertex measured along the surface, and $\phi$ its azimuthal angle about the axis.`,
      T, Tw,
      Twhy: raw`The particle is at radius $\rho = s\sin\alpha$ from the axis and height $z = s\cos\alpha$. Along the surface it moves with speed $\dot{s}$, and around the axis with speed $\rho\dot{\phi} = s\sin\alpha\,\dot{\phi}$, so $T = ${T}$.`,
      L: raw`${T} - ${V}`,
      Lw: Tw.slice(0, 2).map(t => raw`${t} - ${V}`).concat([raw`${T} + ${V}`, raw`${T} - ${m}gs\sin\alpha`]),
      Lwhy: raw`At distance $s$ along the surface the particle is a distance $s\sin\alpha$ from the axis and a height $s\cos\alpha$ above the vertex, so $L = ${T} - ${V}$.`,
      eoms: [{
        c: 's', eq: raw`\ddot{s} = s\sin^2\alpha\,\dot{\phi}^2 - g\cos\alpha`,
        w: [raw`\ddot{s} = s\sin^2\alpha\,\dot{\phi}^2 + g\cos\alpha`, raw`\ddot{s} = s\dot{\phi}^2 - g\cos\alpha`, raw`\ddot{s} = -g\cos\alpha`, raw`\ddot{s} = s\sin^2\alpha\,\dot{\phi}^2 - g\sin\alpha`, raw`\ddot{s} = s\cos^2\alpha\,\dot{\phi}^2 - g\cos\alpha`],
        why: raw`$\partial L/\partial s = ${m}s\sin^2\alpha\,\dot{\phi}^2 - ${m}g\cos\alpha$ and $\frac{d}{dt}(${m}\dot{s}) = ${m}\ddot{s}$: a centrifugal term pushing up the cone and gravity's component along the surface pulling down.`,
      }],
      H: raw`\frac{p_s^2}{2${m}} + \frac{p_{\phi}^2}{2${m}s^2\sin^2\alpha} + ${V}`,
      Hw: [raw`\frac{p_s^2}{2${m}} + \frac{p_{\phi}^2}{2${m}s^2} + ${V}`, raw`\frac{p_s^2}{2${m}} + \frac{p_{\phi}^2}{2${m}s^2\cos^2\alpha} + ${V}`, raw`\frac{p_s^2}{2${m}} + \frac{p_{\phi}^2}{2${m}s^2\sin^2\alpha} - ${V}`, raw`\frac{p_s^2}{2${m}} + \frac{p_{\phi}^2s^2\sin^2\alpha}{2${m}} + ${V}`, raw`\frac{p_s^2 + p_{\phi}^2}{2${m}s^2\sin^2\alpha} + ${V}`],
      Hwhy: raw`$p_s = ${m}\dot{s}$ and $p_{\phi} = ${m}s^2\sin^2\alpha\,\dot{\phi}$, so $T = \frac{p_s^2}{2${m}} + \frac{p_{\phi}^2}{2${m}s^2\sin^2\alpha}$ and $H = T + U$ with $U = ${V}$.`,
      cons: raw`${m}s^2\sin^2\alpha\,\dot{\phi}`,
      consw: [raw`${m}s^2\dot{\phi}`, raw`${m}s^2\cos^2\alpha\,\dot{\phi}`, raw`${m}s\sin\alpha\,\dot{\phi}`, raw`${m}\dot{s}`, raw`${m}s^2\sin\alpha\,\dot{\phi}`],
      consWhy: raw`$\phi$ is cyclic, so $p_{\phi} = \partial L/\partial\dot{\phi} = ${m}s^2\sin^2\alpha\,\dot{\phi}$ — the angular momentum about the vertical axis, $${m}\rho^2\dot{\phi}$ with $\rho = s\sin\alpha$ — is conserved.`,
    };
  });

  // --- double pendulum
  sys('dpend', 'L T', R => {
    const kin = (c1, cross) => raw`\frac{1}{2}${c1}\ell_1^2\dot{\theta}_1^2 + \frac{1}{2}m_2\ell_2^2\dot{\theta}_2^2${cross}`;
    const X = raw` + m_2\ell_1\ell_2\dot{\theta}_1\dot{\theta}_2\cos(\theta_1 - \theta_2)`;
    const T = kin('(m_1 + m_2)', X);
    const Tw = [kin('(m_1 + m_2)', ''), kin('(m_1 + m_2)', raw` + m_2\ell_1\ell_2\dot{\theta}_1\dot{\theta}_2\cos(\theta_1 + \theta_2)`), kin('m_1', X), kin('(m_1 + m_2)', raw` + m_2\ell_1\ell_2\dot{\theta}_1\dot{\theta}_2\sin(\theta_1 - \theta_2)`), kin('(m_1 + m_2)', raw` + 2m_2\ell_1\ell_2\dot{\theta}_1\dot{\theta}_2\cos(\theta_1 - \theta_2)`)];
    const V = raw`(m_1 + m_2)g\ell_1\cos\theta_1 + m_2g\ell_2\cos\theta_2`;
    return {
      lv: { L: 3, T: 3 },
      desc: R.pick([
        raw`A double pendulum: a point mass $m_1$ hangs from a fixed pivot on a massless rod of length $\ell_1$, and a second point mass $m_2$ hangs from $m_1$ on a massless rod of length $\ell_2$. Both swing in one vertical plane; $\theta_1$ and $\theta_2$ are the angles of the rods from the downward vertical.`,
        raw`Two point masses form a double pendulum in a vertical plane: $m_1$ is attached to a fixed pivot by a light rod of length $\ell_1$, and $m_2$ is attached to $m_1$ by a light rod of length $\ell_2$. The rods make angles $\theta_1$ and $\theta_2$ with the downward vertical.`]),
      T, Tw,
      Twhy: raw`$m_2$ is at $(\ell_1\sin\theta_1 + \ell_2\sin\theta_2,\ -\ell_1\cos\theta_1 - \ell_2\cos\theta_2)$. Squaring its velocity gives $\ell_1^2\dot{\theta}_1^2 + \ell_2^2\dot{\theta}_2^2 + 2\ell_1\ell_2\dot{\theta}_1\dot{\theta}_2(\cos\theta_1\cos\theta_2 + \sin\theta_1\sin\theta_2)$, and the bracket is $\cos(\theta_1 - \theta_2)$.`,
      L: raw`${T} + ${V}`,
      Lw: [raw`${T} - ${V}`, raw`${T} + m_1g\ell_1\cos\theta_1 + m_2g\ell_2\cos\theta_2`, raw`${Tw[0]} + ${V}`, raw`${Tw[1]} + ${V}`, raw`${Tw[2]} + ${V}`],
      Lwhy: raw`$T = ${T}$ (the cross term comes from $m_2$'s velocity), and both masses lie below the pivot: $U = -(m_1 + m_2)g\ell_1\cos\theta_1 - m_2g\ell_2\cos\theta_2$, since $m_2$ is $\ell_1\cos\theta_1 + \ell_2\cos\theta_2$ below the pivot.`,
    };
  });

  // --- pendulum with a prescribed pivot motion
  sys('pivot', 'eom', R => {
    const l = R.pick([ELL, 'b']), q = R.pick([TH, PH]), qdd = ddt(q);
    const v = R.int(0, 3);
    const base = raw`A simple pendulum (bob mass $m$, massless rod of length $${l}$, angle $${q}$ from the downward vertical)`;
    const gen = raw`For a pivot at $(x_p(t), y_p(t))$ the Lagrangian gives $${l}${qdd} = -(g + \ddot{y}_p)\sin${q} - \ddot{x}_p\cos${q}$ — equivalently, in the pivot's frame gravity is replaced by $\vec{g} - \vec{a}_{\text{pivot}}$.`;
    const D = [
      { d: raw`${base} hangs from the ceiling of an elevator that accelerates upward with constant acceleration $a$.`,
        eq: raw`${l}${qdd} = -(g + a)\sin${q}`,
        w: [raw`${l}${qdd} = -(g - a)\sin${q}`, raw`${l}${qdd} = -g\sin${q}`, raw`${l}${qdd} = -(g + a)\cos${q}`, raw`${l}${qdd} = (g + a)\sin${q}`, raw`${l}${qdd} = -g\sin${q} - a\cos${q}`],
        why: raw`Here $\ddot{y}_p = a$, $\ddot{x}_p = 0$, so the effective gravity is $g + a$.` },
      { d: raw`${base} hangs from a cart that accelerates horizontally with constant acceleration $a$ in the $+x$ direction; $${q}$ is positive when the bob is displaced toward $+x$ from the point below the pivot.`,
        eq: raw`${l}${qdd} = -g\sin${q} - a\cos${q}`,
        w: [raw`${l}${qdd} = -g\sin${q} + a\cos${q}`, raw`${l}${qdd} = -(g + a)\sin${q}`, raw`${l}${qdd} = -g\sin${q}`, raw`${l}${qdd} = -g\cos${q} - a\sin${q}`, raw`${l}${qdd} = -\sqrt{g^2 + a^2}\,\cos${q}`],
        why: raw`Here $\ddot{x}_p = a$, $\ddot{y}_p = 0$. The new equilibrium has $\tan${q} = -a/g$: the bob hangs back, opposite to the acceleration.` },
      { d: raw`The pivot of ${base.charAt(0).toLowerCase() + base.slice(1)} is driven up and down so that its height is $y_p = A\cos\omega t$.`,
        eq: raw`${l}${qdd} = -\left(g - A\omega^2\cos\omega t\right)\sin${q}`,
        w: [raw`${l}${qdd} = -\left(g + A\omega^2\cos\omega t\right)\sin${q}`, raw`${l}${qdd} = -g\sin${q}`, raw`${l}${qdd} = -\left(g - A\omega\cos\omega t\right)\sin${q}`, raw`${l}${qdd} = -\left(g - A\omega^2\cos\omega t\right)\cos${q}`, raw`${l}${qdd} = -g\sin${q} + A\omega^2\cos\omega t\cos${q}`],
        why: raw`Here $\ddot{y}_p = -A\omega^2\cos\omega t$, so the effective gravity is $g - A\omega^2\cos\omega t$ (the setup of the Kapitza pendulum).` },
      { d: raw`The pivot of ${base.charAt(0).toLowerCase() + base.slice(1)} is driven horizontally so that its position is $x_p = A\cos\omega t$; $${q}$ is positive when the bob is displaced toward $+x$.`,
        eq: raw`${l}${qdd} = -g\sin${q} + A\omega^2\cos\omega t\,\cos${q}`,
        w: [raw`${l}${qdd} = -g\sin${q} - A\omega^2\cos\omega t\,\cos${q}`, raw`${l}${qdd} = -g\sin${q}`, raw`${l}${qdd} = -g\sin${q} + A\omega^2\cos\omega t\,\sin${q}`, raw`${l}${qdd} = -g\sin${q} + A\omega\cos\omega t\,\cos${q}`, raw`${l}${qdd} = -\left(g - A\omega^2\cos\omega t\right)\sin${q}`],
        why: raw`Here $\ddot{x}_p = -A\omega^2\cos\omega t$, which acts like a horizontal driving force on the pendulum.` },
    ][v];
    return { lv: { eom: 3 }, desc: D.d, eoms: [{ c: q, eq: D.eq, w: D.w, why: gen + ' ' + D.why }] };
  });

  // --- bead on a wire y = f(x) in a vertical plane (y up)
  const WIRES = [
    c => ({ y: raw`${c}x^2`, fac: raw`1 + 4${c}^2x^2`, wf: [raw`1 + 2${c}x`, raw`1 + ${c}^2x^2`, raw`1 + 4${c}x^2`], U: raw`mg${c}x^2`, d: raw`2${c}x` }),
    c => ({ y: raw`${c}x^3`, fac: raw`1 + 9${c}^2x^4`, wf: [raw`1 + 3${c}x^2`, raw`1 + 9${c}^2x^6`, raw`1 + 3${c}^2x^4`], U: raw`mg${c}x^3`, d: raw`3${c}x^2` }),
    c => ({ y: raw`${c}x^4`, fac: raw`1 + 16${c}^2x^6`, wf: [raw`1 + 4${c}x^3`, raw`1 + 16${c}^2x^8`, raw`1 + 4${c}^2x^6`], U: raw`mg${c}x^4`, d: raw`4${c}x^3` }),
    c => ({ y: raw`${c}\cosh(x/${c})`, fac: raw`\cosh^2(x/${c})`, wf: [raw`\sinh^2(x/${c})`, raw`1 + \cosh^2(x/${c})`, raw`\cosh(x/${c})`], U: raw`mg${c}\cosh(x/${c})`, d: raw`\sinh(x/${c})` }),
    () => ({ y: raw`A\sin kx`, fac: raw`1 + A^2k^2\cos^2 kx`, wf: [raw`1 + A^2k^2\sin^2 kx`, raw`1 + Ak\cos kx`, raw`1 + A^2\cos^2 kx`], U: raw`mgA\sin kx`, d: raw`Ak\cos kx` }),
    () => ({ y: raw`x\tan\alpha`, fac: raw`\sec^2\alpha`, wf: [raw`\cos^2\alpha`, raw`\tan^2\alpha`, raw`1 + \tan\alpha`], U: raw`mgx\tan\alpha`, d: raw`\tan\alpha` }),
    c => ({ y: raw`${c}e^{x/${c}}`, fac: raw`1 + e^{2x/${c}}`, wf: [raw`1 + e^{x/${c}}`, raw`e^{2x/${c}}`, raw`1 + e^{x^2/${c}^2}`], U: raw`mg${c}e^{x/${c}}`, d: raw`e^{x/${c}}` }),
  ];
  const wire = R => {
    const w = R.pick(WIRES)(R.pick(['a', 'b', 'c']));
    const P = paren(w.fac);
    const T = raw`\frac{1}{2}m${P}\,\dot{x}^2`;
    return {
      w, P, T,
      desc: R.pick([
        raw`A bead of mass $m$ slides without friction on a rigid wire bent into the curve $y = ${w.y}$ in a vertical plane, with $y$ measured upward and gravity $g$ acting in the $-y$ direction. Use $x$ as the generalized coordinate.`,
        raw`A small ring of mass $m$ moves without friction along a fixed wire shaped as $y = ${w.y}$ ($y$ vertical, pointing up) in a uniform gravitational field $g$. Take $x$ as the generalized coordinate.`]),
      kin: raw`Since $\dot{y} = (${w.d})\dot{x}$, $\dot{x}^2 + \dot{y}^2 = \left[1 + (${w.d})^2\right]\dot{x}^2$, so $T = ${T}$`,
    };
  };

  // ---------------------------------------------------------------- §1.7 helpers
  // symmetric 2x2 stiffness matrices [[a,-b],[-b,c]] with integer eigenvalues l1 < l2
  const NM_MATS = [];
  for (let a = 1; a <= 8; a++) for (let c = a; c <= 8; c++) for (let b = 1; b <= 4; b++) {
    if (a * c <= b * b) continue;
    const tr = a + c, disc = (a - c) * (a - c) + 4 * b * b, s = Math.round(Math.sqrt(disc));
    if (s * s !== disc || (tr + s) % 2) continue;
    NM_MATS.push([a, b, c, (tr - s) / 2, (tr + s) / 2]);
  }
  // physical pendula: I_cm and pivot distance d in units of M s^2 and s
  const PHYS = [
    { d0: s => raw`a uniform thin rod of length $${s}$ pivoted about a horizontal axis through one end`, sym: [raw`\ell `, 'L'], Ic: 1 / 12, d: 1 / 2, lv: 1 },
    { d0: s => raw`a uniform thin rod of length $${s}$ pivoted about a horizontal axis a distance $${s}/4$ from one end`, sym: [raw`\ell `, 'L'], Ic: 1 / 12, d: 1 / 4 },
    { d0: s => raw`a uniform thin rod of length $${s}$ pivoted about a horizontal axis a distance $${s}/3$ from one end`, sym: [raw`\ell `, 'L'], Ic: 1 / 12, d: 1 / 6 },
    { d0: s => raw`a uniform thin rod of length $${s}$ pivoted about a horizontal axis a distance $${s}/6$ from one end`, sym: [raw`\ell `, 'L'], Ic: 1 / 12, d: 1 / 3 },
    { d0: s => raw`a thin uniform hoop of radius $${s}$ hanging on a horizontal nail through its rim and swinging in its own plane`, sym: ['R', 'r'], Ic: 1, d: 1 },
    { d0: s => raw`a uniform disk of radius $${s}$ pivoted about a horizontal axis through a point on its rim, perpendicular to the disk`, sym: ['R', 'r'], Ic: 1 / 2, d: 1 },
    { d0: s => raw`a uniform disk of radius $${s}$ pivoted about a horizontal axis perpendicular to the disk at a distance $${s}/2$ from its center`, sym: ['R', 'r'], Ic: 1 / 2, d: 1 / 2, lv: 3 },
    { d0: s => raw`a uniform square plate of side $${s}$ pivoted about a horizontal axis through one corner, perpendicular to the plate`, sym: ['a', 's'], Ic: 1 / 6, d: Math.SQRT1_2, lv: 3 },
    { d0: s => raw`a uniform solid sphere of radius $${s}$ pivoted about a horizontal axis tangent to its surface`, sym: ['R', 'r'], Ic: 2 / 5, d: 1 },
    { d0: s => raw`a light rigid rod of length $${s}$, pivoted at its upper end, carrying equal point masses at its midpoint and at its lower end`, sym: [raw`\ell `, 'L'], Ic: 1 / 16, d: 3 / 4, extra: 1, lv: 3 },
  ];
  // c * s written as [numerator, denominator] TeX
  function cLen(c, s) {
    const r = F.toRational(c, 500);
    if (r) return [(r[0] === 1 ? '' : r[0]) + s, r[1] === 1 ? '' : String(r[1])];
    const e = ex(c), mm = /^\\frac\{(.+)\}\{(.+)\}$/.exec(e);
    if (mm) return [mm[1] + raw`\,` + s, mm[2]];
    return [e + raw`\,` + s, ''];
  }
  const Tform = (c, s) => { const [n, d] = cLen(c, s); return raw`T = 2\pi\sqrt{\frac{${n}}{${d}g}}`; };
  const Wform = (c, s) => { const [n, d] = cLen(c, s); return raw`\omega = \sqrt{\frac{${d}g}{${n}}}`; };
  const Lform = (c, s) => { const [n, d] = cLen(c, s); return d ? raw`\frac{${n}}{${d}}` : n; };

  // ================================================================ templates
  GRE.addTemplates('mech', [
    // ------------------------------------------------------------ 1.5.1 Lagrangians
    {
      id: 'mech2.lag.which', sec: '1.5.1', level: 2, weight: 2,
      gen(R) {
        const S = pickSys(R, 'L');
        const ask = R.pick(['Which of the following is a Lagrangian for this system?', 'Which of the following could be the Lagrangian of the system?', 'Which expression is a correct Lagrangian for the system?']);
        return { q: S.desc + ' ' + ask, ...GRE.mc(R, mth(S.L), S.Lw.map(mth)), expl: S.Lwhy, level: S.lv.L };
      },
    },
    {
      id: 'mech2.lag.kinetic', sec: '1.5.1', level: 2,
      gen(R) {
        const S = pickSys(R, 'T');
        const ask = R.pick(['What is the total kinetic energy of the system in terms of these coordinates?', 'Which of the following is the kinetic energy $T$ of the system?', 'Which expression gives the kinetic energy, as needed for the Lagrangian?']);
        return { q: S.desc + ' ' + ask, ...GRE.mc(R, mth(S.T), S.Tw.map(mth)), expl: S.Twhy, level: S.lv.T };
      },
    },
    {
      id: 'mech2.lag.wire', sec: '1.5.1', level: 2,
      gen(R) {
        const W = wire(R), w = W.w, P = W.P, T = W.T;
        const kind = R.pick(['L', 'L', 'T', 'p']);
        if (kind === 'T') {
          return {
            q: W.desc + ' What is its kinetic energy?',
            ...GRE.mc(R, mth(T), [raw`\frac{1}{2}m\dot{x}^2`, raw`\frac{1}{2}m${paren(w.wf[0])}\,\dot{x}^2`, raw`\frac{1}{2}m${paren(w.wf[1])}\,\dot{x}^2`, raw`\frac{m\dot{x}^2}{2${P}}`].map(mth)),
            expl: W.kin + '. Ignoring the $\\dot{y}$ contribution (answer $\\frac{1}{2}m\\dot{x}^2$) is the trap.',
          };
        }
        if (kind === 'p') {
          return {
            q: W.desc + ' What is the momentum $p_x$ conjugate to $x$?', level: 2,
            ...GRE.mc(R, mth(raw`m${P}\,\dot{x}`), [raw`m\dot{x}`, raw`\frac{1}{2}m${P}\,\dot{x}`, raw`m${paren(w.wf[0])}\,\dot{x}`, raw`\frac{m\dot{x}}{${P}}`, raw`m${P}\,\dot{x}^2`].map(mth)),
            expl: W.kin + raw`, and $p_x = \partial L/\partial\dot{x} = m${P}\,\dot{x}$. The conjugate momentum is not simply $m\dot{x}$ when the kinetic energy has a coordinate-dependent coefficient.`,
          };
        }
        return {
          q: W.desc + ' ' + R.pick(['Which of the following is the Lagrangian?', 'Which is a correct Lagrangian $L(x, \\dot{x})$?']),
          ...GRE.mc(R, mth(raw`${T} - ${w.U}`), [raw`${T} + ${w.U}`, raw`\frac{1}{2}m\dot{x}^2 - ${w.U}`, raw`\frac{1}{2}m${paren(w.wf[0])}\,\dot{x}^2 - ${w.U}`, raw`\frac{m\dot{x}^2}{2${P}} - ${w.U}`, raw`\frac{1}{2}m${paren(w.wf[2])}\,\dot{x}^2 - ${w.U}`].map(mth)),
          expl: W.kin + raw`, and $U = mgy = ${w.U}$; hence $L = T - U$.`,
        };
      },
    },
    // ------------------------------------------------------------ 1.5.2 Euler–Lagrange equations
    {
      id: 'mech2.el.eom', sec: '1.5.2', level: 2, weight: 2,
      gen(R) {
        const S = pickSys(R, 'eom');
        const E = R.pick(S.eoms);
        const ask = R.pick([`Which of the following is the Euler–Lagrange equation for the coordinate $${E.c}$?`, `Which of the following is the equation of motion for $${E.c}$?`]);
        return { q: S.desc + ' ' + ask, ...GRE.mc(R, mth(E.eq), E.w.map(mth)), expl: E.why, level: S.lv.eom };
      },
    },
    {
      id: 'mech2.el.generic', sec: '1.5.2', level: 2, weight: 2,
      gen(R) {
        const v = R.weighted(['poly', 'total', 'exp', 'drive', 'rel'], [6, 2, 2, 1, 1]);
        const m = R.pick(['m', 'M']);
        const KE = raw`\frac{1}{2}${m}\dot{x}^2`;
        const mxdd = raw`${m}\ddot{x}`;
        const xp = p => (p === 0 ? '' : p === 1 ? 'x' : `x^{${p}}`);
        if (v === 'poly') {
          const nT = R.int(1, 2);
          const pows = R.pickN([2, 3, 4, 5, 6], nT).sort((a, b) => a - b);
          const syms = R.pickN(['k', raw`\alpha `, raw`\beta `, raw`\lambda `, raw`\kappa `], nT);
          const neg = nT === 2 && R.bool(0.4) ? R.int(0, 1) : -1;   // one negative term makes a double well
          const T = pows.map((p, i) => ({ c: R.pick([1, 2, 3, 1 / 2, 1 / 3, 1 / 4]) * (i === neg ? -1 : 1), s: syms[i], p }));
          const L = KE + sumTeX(T.map(t => [-t.c, t.s + xp(t.p)]), true);
          const eq = f => raw`${mxdd} = ${sumTeX(T.map(f))}`;
          const C = eq(t => [-t.c * t.p, t.s + xp(t.p - 1)]);
          const W = [eq(t => [t.c * t.p, t.s + xp(t.p - 1)]), eq(t => [-t.c, t.s + xp(t.p - 1)]), eq(t => [-t.c * t.p, t.s + xp(t.p + 1)]), eq(t => [-t.c, t.s + xp(t.p)]), eq(t => [-t.c * t.p / 2, t.s + xp(t.p - 1)])];
          if (nT === 2) W.push(eq((t, i) => [(i ? 1 : -1) * t.c * t.p, t.s + xp(t.p - 1)]));
          return {
            q: raw`A particle of mass $${m}$ moving along the $x$-axis has the Lagrangian $L = ${L}$, where ${syms.map(s => '$' + s.trim() + '$').join(' and ')} ${nT === 2 ? 'are positive constants' : 'is a positive constant'}. Which of the following is the particle's equation of motion?`,
            ...GRE.mc(R, mth(C), W.map(mth)), level: pows.some(p => p > 4) || nT === 2 ? 2 : 1,
            expl: raw`Here $L = T - U$ with $U = ${sumTeX(T.map(t => [t.c, t.s + xp(t.p)]))}$. The Euler–Lagrange equation gives $${mxdd} = \partial L/\partial x = -dU/dx = ${sumTeX(T.map(t => [-t.c * t.p, t.s + xp(t.p - 1)]))}$. Watch the sign: the force is $-dU/dx$, and differentiating $x^n$ brings down a factor $n$.`,
          };
        }
        if (v === 'total') {
          const g = R.pick([raw`\gamma `, 'b', raw`\lambda `]);
          const sq = R.bool();
          const L = raw`${KE} - \frac{1}{2}kx^2 + ${g}${sq ? 'x^2' : 'x'}\dot{x}`;
          const C = raw`${mxdd} = -kx`;
          const W = sq
            ? [raw`${mxdd} = -kx - 2${g}x\dot{x}`, raw`${mxdd} = -kx + 2${g}x\dot{x}`, raw`${mxdd} = -kx - ${g}x^2`, raw`${mxdd} = -kx + ${g}x\dot{x}`, raw`${mxdd} = -kx - 4${g}x\dot{x}`]
            : [raw`${mxdd} = -kx - ${g}\dot{x}`, raw`${mxdd} = -kx + ${g}\dot{x}`, raw`${mxdd} = -kx - 2${g}\dot{x}`, raw`${mxdd} = -(k + ${g})x`, raw`${mxdd} = -kx - ${g}x`];
          return {
            q: raw`A particle of mass $${m}$ moving in one dimension has the Lagrangian $L = ${L}$, where $k$ and $${g.trim()}$ are constants. What is its equation of motion?`,
            ...GRE.mc(R, mth(C), W.map(mth)), level: 3,
            expl: raw`The extra term is a total time derivative: $${g}${sq ? 'x^2' : 'x'}\dot{x} = \frac{d}{dt}\left(${sq ? raw`\frac{${g}x^3}{3}` : raw`\frac{${g}x^2}{2}`}\right)$, which never changes the equations of motion. Explicitly, it adds $${sq ? `2${g}x\\dot{x}` : `${g}\\dot{x}`}$ to both $\frac{d}{dt}\frac{\partial L}{\partial\dot{x}}$ and $\frac{\partial L}{\partial x}$, leaving $${C}$.`,
          };
        }
        if (v === 'exp') {
          const bForm = R.bool();
          const ex1 = bForm ? 'bt/' + m : raw`\gamma t`;
          const d = bForm ? 'b' : raw`\gamma ${m}`;
          const d2 = bForm ? '2b' : raw`2\gamma ${m}`;
          const C = raw`${mxdd} + ${d}\dot{x} + kx = 0`;
          const W = [raw`${mxdd} - ${d}\dot{x} + kx = 0`, raw`${mxdd} + kx = 0`, raw`${mxdd} + ${d2}\dot{x} + kx = 0`, raw`${mxdd} + ${d}\dot{x} - kx = 0`, raw`${mxdd} + ${d}\dot{x} + ${bForm ? 'b' : raw`\gamma `}x = 0`];
          return {
            q: raw`A particle of mass $${m}$ moving along a line is described by the Lagrangian $L = e^{${ex1}}\left(${KE} - \frac{1}{2}kx^2\right)$, where $k$ and $${bForm ? 'b' : '\\gamma'}$ are positive constants. Which equation of motion follows from $L$?`,
            ...GRE.mc(R, mth(C), W.map(mth)), level: 3,
            expl: raw`$\frac{\partial L}{\partial\dot{x}} = e^{${ex1}}${m}\dot{x}$, whose time derivative is $e^{${ex1}}(${mxdd} + ${d}\dot{x})$; $\frac{\partial L}{\partial x} = -e^{${ex1}}kx$. Cancelling the exponential gives $${C}$: a damped harmonic oscillator.`,
          };
        }
        if (v === 'drive') {
          const C = raw`${mxdd} + kx = F_0\cos\omega t`;
          const W = [raw`${mxdd} + kx = -F_0\cos\omega t`, raw`${mxdd} + kx = F_0\omega\sin\omega t`, raw`${mxdd} - kx = F_0\cos\omega t`, raw`${mxdd} + kx = 0`, raw`${mxdd} + kx = F_0x\cos\omega t`];
          return {
            q: raw`A particle of mass $${m}$ has Lagrangian $L = ${KE} - \frac{1}{2}kx^2 + F_0x\cos\omega t$, where $k$, $F_0$, $\omega$ are constants. Which of the following is the equation of motion?`,
            ...GRE.mc(R, mth(C), W.map(mth)), level: 1,
            expl: raw`$\partial L/\partial x = -kx + F_0\cos\omega t$ and $\frac{d}{dt}(\partial L/\partial\dot{x}) = ${mxdd}$: a harmonic oscillator driven by the force $F_0\cos\omega t$ (the potential $-F_0x\cos\omega t$ corresponds to that force).`,
          };
        }
        const V = R.pick(['V(x)', raw`\frac{1}{2}kx^2`, raw`mgx`]);
        const g = raw`\sqrt{1 - \dot{x}^2/c^2}`;
        const C = raw`\frac{${m}\dot{x}}{${g}}`;
        return {
          q: raw`A relativistic particle of rest mass $${m}$ moving in one dimension has Lagrangian $L = -${m}c^2${g} - ${V}$. What is the momentum $p$ conjugate to $x$?`.replace(/mgx/g, m + 'gx'),
          ...GRE.mc(R, mth(C), [raw`${m}\dot{x}`, raw`${m}\dot{x}${g}`, raw`-\frac{${m}\dot{x}}{${g}}`, raw`\frac{${m}\dot{x}}{1 - \dot{x}^2/c^2}`, raw`\frac{${m}c\dot{x}}{${g}}`].map(mth)), level: 2,
          expl: raw`$p = \partial L/\partial\dot{x} = -${m}c^2\cdot\frac{1}{2}(1 - \dot{x}^2/c^2)^{-1/2}\cdot(-2\dot{x}/c^2) = \gamma ${m}\dot{x}$, the relativistic momentum. It reduces to $${m}\dot{x}$ for $\dot{x} \ll c$.`,
        };
      },
    },
    {
      id: 'mech2.el.coupled', sec: '1.5.2', level: 2,
      gen(R) {
        const m = R.pick(['m', 'M']);
        const which = R.pick(['x', 'y']), o = which === 'x' ? 'y' : 'x';
        const KE = raw`\frac{1}{2}${m}(\dot{x}^2 + \dot{y}^2)`;
        if (R.bool(0.25)) {
          const mu = R.pick([raw`\mu `, raw`\epsilon `]);
          const L = raw`${KE} + ${mu}\dot{x}\dot{y} - \frac{1}{2}k(x^2 + y^2)`;
          const a = raw`${m}\ddot{${which}}`;
          const C = raw`${a} + ${mu}\ddot{${o}} = -k${which}`;
          return {
            q: raw`Two coordinates $x$ and $y$ describe a system with Lagrangian $L = ${L}$, where $k$ and $${mu.trim()}$ are constants. Which is the Euler–Lagrange equation for $${which}$?`,
            ...GRE.mc(R, mth(C), [raw`${a} = -k${which}`, raw`${a} + ${mu}\dot{${o}} = -k${which}`, raw`${a} - ${mu}\ddot{${o}} = -k${which}`, raw`${a} + 2${mu}\ddot{${o}} = -k${which}`, raw`${a} + ${mu}\ddot{${o}} = -k${o}`].map(mth)), level: 3,
            expl: raw`$\partial L/\partial\dot{${which}} = ${m}\dot{${which}} + ${mu}\dot{${o}}$ (a kinetic coupling), whose time derivative is $${a} + ${mu}\ddot{${o}}$; $\partial L/\partial ${which} = -k${which}$.`,
          };
        }
        const A = R.pick([1 / 2, 1, 3 / 2, 2, 3]), B = R.pick([1 / 2, 1, 3 / 2, 2, 3]), Cc = R.pick([1, 2, 3, 1 / 2]) * R.sign();
        const L = KE + sumTeX([[-A, 'kx^2'], [-B, 'ky^2'], [-Cc, 'kxy']], true);
        const own = which === 'x' ? A : B, oth = which === 'x' ? B : A;
        const eq = (a, c) => raw`${m}\ddot{${which}} = ${sumTeX([[a, 'k' + which], [c, 'k' + o]])}`;
        const C = eq(-2 * own, -Cc);
        const W = [eq(-own, -Cc), eq(-2 * own, Cc), eq(-2 * own, -2 * Cc), eq(2 * own, Cc), eq(-2 * oth, -Cc), eq(-own, -Cc / 2)];
        return {
          q: raw`A particle of mass $${m}$ moves in the $xy$-plane with Lagrangian $L = ${L}$, where $k > 0$. Which of the following is the equation of motion for $${which}$?`,
          ...GRE.mc(R, mth(C), W.map(mth)),
          expl: raw`$${m}\ddot{${which}} = \partial L/\partial ${which} = -\partial U/\partial ${which}$ with $U = ${sumTeX([[A, 'kx^2'], [B, 'ky^2'], [Cc, 'kxy']])}$. Differentiating $${which}^2$ gives a factor 2, while the cross term contributes $${sumTeX([[-Cc, 'k' + o]])}$ — that term couples the two equations.`,
        };
      },
    },
    {
      id: 'mech2.el.conserved', sec: '1.5.2', level: 2,
      gen(R) {
        if (R.bool(0.3)) {
          const m = R.pick(['m', 'M']);
          const G = [
            () => {
              const pz = R.bool();
              return {
                L: raw`\frac{1}{2}${m}\left(\dot{\rho}^2 + \rho^2\dot{\phi}^2 + \dot{z}^2\right) - U(\rho)`, pre: 'In cylindrical coordinates $(\\rho, \\phi, z)$, a particle',
                c: pz ? raw`${m}\dot{z}` : raw`${m}\rho^2\dot{\phi}`,
                w: [raw`${m}\dot{\rho}`, raw`${m}\rho\dot{\phi}`, raw`${m}\rho^2\dot{z}`, raw`\frac{1}{2}${m}\rho^2\dot{\phi}^2`, raw`${m}\rho\dot{\rho}`],
                why: raw`$\phi$ and $z$ are both cyclic, so $p_{\phi} = ${m}\rho^2\dot{\phi}$ and $p_z = ${m}\dot{z}$ are conserved; $\rho$ is not cyclic.`,
              };
            },
            () => ({
              L: raw`\frac{1}{2}${m}\left(\dot{x}^2 + \dot{y}^2\right) - V(x - y)`, pre: 'A particle',
              c: raw`${m}(\dot{x} + \dot{y})`,
              w: [raw`${m}\dot{x}`, raw`${m}\dot{y}`, raw`${m}(\dot{x} - \dot{y})`, raw`${m}(x\dot{y} - y\dot{x})`, raw`${m}(x + y)`],
              why: raw`$L$ is unchanged by the shift $x \to x + \epsilon$, $y \to y + \epsilon$. In coordinates $u = x - y$, $w = x + y$ the coordinate $w$ is cyclic, so $p_x + p_y = ${m}(\dot{x} + \dot{y})$ is conserved.`,
            }),
            () => ({
              L: raw`\frac{1}{2}A\dot{q}_1^2 + \frac{1}{2}Bq_1^2\dot{q}_2^2 - V(q_1)`, pre: 'A system with generalized coordinates $q_1, q_2$', noMass: true,
              c: raw`Bq_1^2\dot{q}_2`,
              w: [raw`A\dot{q}_1`, raw`B\dot{q}_2`, raw`Bq_1^2\dot{q}_2^2`, raw`Bq_1\dot{q}_2`, raw`A\dot{q}_1 + Bq_1^2\dot{q}_2`],
              why: raw`$q_2$ does not appear in $L$, so $p_2 = \partial L/\partial\dot{q}_2 = Bq_1^2\dot{q}_2$ is conserved. $q_1$ is not cyclic, so $p_1 = A\dot{q}_1$ changes.`,
            }),
            () => ({
              L: raw`\frac{1}{2}${m}\left(\dot{x}^2 + \dot{y}^2 + \dot{z}^2\right) - ${m}gz`, pre: 'A projectile',
              c: R.pick([raw`${m}\dot{x}`, raw`${m}\dot{y}`]),
              w: [raw`${m}\dot{z}`, raw`${m}(\dot{x} + \dot{z})`, raw`\frac{1}{2}${m}\dot{z}^2`, raw`${m}gz`, raw`\frac{1}{2}${m}\dot{z}^2 - ${m}gz`],
              why: raw`$x$ and $y$ are cyclic, so $p_x = ${m}\dot{x}$ and $p_y = ${m}\dot{y}$ are conserved (and so is the energy $\frac{1}{2}${m}v^2 + ${m}gz$); $p_z$ changes because $\partial L/\partial z = -${m}g$.`,
            }),
          ];
          const g = R.pick(G)();
          return {
            q: raw`${g.pre}${g.noMass ? '' : raw` of mass $${m}$`} has Lagrangian $L = ${g.L}$${g.noMass ? ', with $A$, $B$ constants' : ''}. Which of the following is a constant of the motion?`,
            ...GRE.mc(R, mth(g.c), g.w.map(mth)), level: 2, expl: g.why,
          };
        }
        const S = pickSys(R, 'cons');
        const ask = R.pick(['Which of the following quantities is conserved?', 'Which of the following is a constant of the motion?']);
        return { q: S.desc + ' ' + ask, ...GRE.mc(R, mth(S.cons), S.consw.map(mth)), expl: S.consWhy, level: S.lv.cons };
      },
    },
    {
      id: 'mech2.el.symmetry', sec: '1.5.2', level: 2,
      gen(R) {
        const P = [
          { U: raw`U = mgz`, t: { px: 1, py: 1, pz: 0, Lx: 0, Lz: 1, E: 1 }, why: 'U is unchanged by translations in $x$ and $y$ and by rotations about the $z$-axis.' },
          { U: raw`U = \alpha z^2`, t: { px: 1, py: 1, pz: 0, Lx: 0, Lz: 1, E: 1 }, why: 'U is unchanged by translations in $x$ and $y$ and by rotations about the $z$-axis.' },
          { U: raw`U = \frac{1}{2}k(x^2 + y^2)`, t: { px: 0, py: 0, pz: 1, Lx: 0, Lz: 1, E: 1 }, why: 'U is unchanged by translations along $z$ and rotations about the $z$-axis.' },
          { U: raw`U = -\frac{k}{\sqrt{x^2 + y^2 + z^2}}`, t: { px: 0, py: 0, pz: 0, Lx: 1, Lz: 1, E: 1 }, why: 'U is spherically symmetric: every component of $\\vec{L}$ is conserved, but no component of $\\vec{p}$.' },
          { U: raw`U = \alpha x^4`, t: { px: 0, py: 1, pz: 1, Lx: 1, Lz: 0, E: 1 }, why: 'U is unchanged by translations in $y$ and $z$ and by rotations about the $x$-axis (which leave $x$ fixed).' },
          { U: raw`U = \frac{1}{2}k(t)\,(x^2 + y^2 + z^2)`, note: ' where the spring constant $k(t)$ is a prescribed function of time', t: { px: 0, py: 0, pz: 0, Lx: 1, Lz: 1, E: 0 }, why: 'U is spherically symmetric (so $\\vec{L}$ is conserved) but depends explicitly on time (so energy is not).' },
          { U: raw`U = \lambda xy`, t: { px: 0, py: 0, pz: 1, Lx: 0, Lz: 0, E: 1 }, why: 'U is unchanged only by translations along $z$ (and by time translation).' },
          { U: raw`U = \beta(x^2 + y^2) + mgz`, t: { px: 0, py: 0, pz: 0, Lx: 0, Lz: 1, E: 1 }, why: 'U is unchanged by rotations about the $z$-axis but by no translation.' },
          { U: raw`U = F_0x\cos\omega t`, t: { px: 0, py: 1, pz: 1, Lx: 1, Lz: 0, E: 0 }, why: 'U is unchanged by translations in $y$ and $z$ and by rotations about the $x$-axis, but depends explicitly on time.' },
        ];
        const Q = { px: '$p_x$', py: '$p_y$', pz: '$p_z$', Lx: '$L_x$, the $x$-component of angular momentum about the origin', Lz: '$L_z$, the $z$-component of angular momentum about the origin', E: 'the total energy $T + U$' };
        const p = R.pick(P);
        const keys = Object.keys(Q);
        let ks;
        for (let t = 0; t < 50; t++) { ks = R.pickN(keys, 3); if (ks.some(k => p.t[k])) break; }
        const pool = ks.map(k => [Q[k], !!p.t[k]]);
        const r = romanQ(R, raw`A particle of mass $m$ moves in three dimensions with potential energy $${p.U}$${p.note || ''} ($x, y, z$ Cartesian coordinates; all other symbols constant). Which of the following quantities must be conserved?`, pool,
          'Noether: invariance under translation along an axis conserves that momentum component; invariance under rotation about an axis conserves that angular-momentum component; no explicit time dependence conserves energy. ' + p.why);
        return { ...r, level: p.t.E ? 2 : 3 };
      },
    },
    // ------------------------------------------------------------ 1.5.3 Hamiltonians
    {
      id: 'mech2.ham.which', sec: '1.5.3', level: 2, weight: 2,
      gen(R) {
        const S = pickSys(R, 'H');
        const ask = R.pick(['Which of the following is the Hamiltonian of the system?', 'Which expression is the Hamiltonian $H$ for this system?']);
        return { q: S.desc + ' ' + ask + ' (Each $p$ denotes the momentum conjugate to the coordinate in its subscript.)', ...GRE.mc(R, mth(S.H), S.Hw.map(mth)), expl: S.Hwhy, level: S.lv.H };
      },
    },
    {
      id: 'mech2.ham.legendre', sec: '1.5.3', level: 2,
      gen(R) {
        const v = R.weighted(['lin', 'xdx', 'wire', 'Bfield', 'rel', 'Bp'], [2, 2, 3, 1, 1, 1]);
        const m = R.pick(['m', 'M']);
        if (v === 'lin') {
          const b = R.pick([raw`\lambda `, 'b', 'c']);
          const V = R.pick(['V(q)', raw`\frac{1}{2}kq^2`, raw`${m}gq`]);
          const C = raw`\frac{(p - ${b})^2}{2${m}} + ${V}`;
          return {
            q: raw`A system has Lagrangian $L = \frac{1}{2}${m}\dot{q}^2 + ${b}\dot{q} - ${V}$, where $${b.trim()}$ is a constant. What is its Hamiltonian $H(q, p)$?`,
            ...GRE.mc(R, mth(C), [raw`\frac{p^2}{2${m}} + ${V}`, raw`\frac{(p + ${b})^2}{2${m}} + ${V}`, raw`\frac{(p - ${b})^2}{2${m}} - ${V}`, raw`\frac{(p - ${b})^2}{${m}} + ${V}`, raw`\frac{p^2}{2${m}} + ${b}p + ${V}`].map(mth)), level: 3,
            expl: raw`$p = \partial L/\partial\dot{q} = ${m}\dot{q} + ${b}$, so $\dot{q} = (p - ${b})/${m}$. Then $H = p\dot{q} - L = \frac{(p - ${b})^2}{2${m}} + ${V}$. The constant shifts the canonical momentum even though the $${b}\dot{q}$ term does not affect the motion.`,
          };
        }
        if (v === 'xdx') {
          const g = R.pick([raw`\gamma `, 'b']);
          const C = raw`\frac{(p - ${g}x)^2}{2${m}} + \frac{1}{2}kx^2`;
          return {
            q: raw`A particle of mass $${m}$ has Lagrangian $L = \frac{1}{2}${m}\dot{x}^2 + ${g}x\dot{x} - \frac{1}{2}kx^2$. Which of the following is its Hamiltonian, written in terms of $x$ and the canonical momentum $p$?`,
            ...GRE.mc(R, mth(C), [raw`\frac{p^2}{2${m}} + \frac{1}{2}kx^2`, raw`\frac{(p + ${g}x)^2}{2${m}} + \frac{1}{2}kx^2`, raw`\frac{(p - ${g}x)^2}{2${m}} - \frac{1}{2}kx^2`, raw`\frac{p^2}{2${m}} - ${g}xp + \frac{1}{2}kx^2`, raw`\frac{(p - ${g}x)^2}{${m}} + \frac{1}{2}kx^2`].map(mth)), level: 3,
            expl: raw`$p = ${m}\dot{x} + ${g}x$, so $\dot{x} = (p - ${g}x)/${m}$ and $H = p\dot{x} - L = \frac{(p - ${g}x)^2}{2${m}} + \frac{1}{2}kx^2$. Numerically $H$ is still $T + U$, but it must be expressed through the canonical momentum, which is not $${m}\dot{x}$.`,
          };
        }
        if (v === 'wire') {
          const W = wire(R), w = W.w, P = W.P;
          const C = raw`\frac{p^2}{2m${P}} + ${w.U}`;
          return {
            q: W.desc + ' Which of the following is the Hamiltonian, with $p$ the momentum conjugate to $x$?',
            ...GRE.mc(R, mth(C), [raw`\frac{p^2}{2m} + ${w.U}`, raw`\frac{${P}\,p^2}{2m} + ${w.U}`, raw`\frac{p^2}{2m${P}} - ${w.U}`, raw`\frac{p^2}{2m${paren(w.wf[0])}} + ${w.U}`].map(mth)), level: 2,
            expl: W.kin + raw`; so $p = m${P}\,\dot{x}$ and $H = T + U = \frac{p^2}{2m${P}} + ${w.U}$. The coordinate-dependent "mass" goes in the denominator.`,
          };
        }
        if (v === 'Bfield' || v === 'Bp') {
          const L = raw`\frac{1}{2}${m}(\dot{x}^2 + \dot{y}^2) + \frac{1}{2}QB(x\dot{y} - y\dot{x})`;
          const pre = raw`A particle of mass $${m}$ and charge $Q$ moving in the $xy$-plane in a uniform magnetic field $B\hat{z}$ has the Lagrangian $L = ${L}$.`;
          if (v === 'Bp') {
            const px = R.bool();
            const C = px ? raw`p_x = ${m}\dot{x} - \frac{1}{2}QBy` : raw`p_y = ${m}\dot{y} + \frac{1}{2}QBx`;
            const W = px ? [raw`p_x = ${m}\dot{x}`, raw`p_x = ${m}\dot{x} + \frac{1}{2}QBy`, raw`p_x = ${m}\dot{x} - QBy`, raw`p_x = ${m}\dot{x} + \frac{1}{2}QBx`, raw`p_x = \frac{1}{2}QBy`]
              : [raw`p_y = ${m}\dot{y}`, raw`p_y = ${m}\dot{y} - \frac{1}{2}QBx`, raw`p_y = ${m}\dot{y} + QBx`, raw`p_y = ${m}\dot{y} - \frac{1}{2}QBy`, raw`p_y = \frac{1}{2}QBx`];
            return {
              q: pre + ` What is the canonical momentum conjugate to $${px ? 'x' : 'y'}$?`, level: 2,
              ...GRE.mc(R, mth(C), W.map(mth)),
              expl: raw`Differentiate $L$ with respect to $\dot{${px ? 'x' : 'y'}}$: $${C}$. The canonical momentum includes the vector-potential term ($\vec{p} = m\vec{v} + Q\vec{A}$ with $\vec{A} = \frac{1}{2}B(-y, x, 0)$), so it differs from $m\vec{v}$.`,
            };
          }
          const C = raw`\frac{\left(p_x + \frac{1}{2}QBy\right)^2 + \left(p_y - \frac{1}{2}QBx\right)^2}{2${m}}`;
          return {
            q: pre + ' Which of the following is the Hamiltonian?', level: 3,
            ...GRE.mc(R, mth(C), [raw`\frac{\left(p_x - \frac{1}{2}QBy\right)^2 + \left(p_y + \frac{1}{2}QBx\right)^2}{2${m}}`, raw`\frac{p_x^2 + p_y^2}{2${m}}`, raw`\frac{p_x^2 + p_y^2}{2${m}} + \frac{QB}{2${m}}(xp_y - yp_x)`, raw`\frac{(p_x + QBy)^2 + (p_y - QBx)^2}{2${m}}`, raw`\frac{p_x^2 + p_y^2}{2${m}} - \frac{1}{2}QB(x\dot{y} - y\dot{x})`].map(mth)),
            expl: raw`$p_x = ${m}\dot{x} - \frac{1}{2}QBy$ and $p_y = ${m}\dot{y} + \frac{1}{2}QBx$. The magnetic term is linear in velocities, so it drops out of $H = \sum p\dot{q} - L = \frac{1}{2}${m}v^2$; expressing $${m}\dot{x} = p_x + \frac{1}{2}QBy$ and $${m}\dot{y} = p_y - \frac{1}{2}QBx$ gives the answer, i.e. $(\vec{p} - Q\vec{A})^2/2${m}$.`,
          };
        }
        const V = R.pick(['V(x)', raw`\frac{1}{2}kx^2`]);
        const g = raw`\sqrt{1 - \dot{x}^2/c^2}`;
        return {
          q: raw`A relativistic particle of rest mass $${m}$ moves in one dimension with Lagrangian $L = -${m}c^2${g} - ${V}$. What is its Hamiltonian in terms of $x$ and the canonical momentum $p$?`, level: 3,
          ...GRE.mc(R, mth(raw`\sqrt{p^2c^2 + ${m}^2c^4} + ${V}`), [raw`\frac{p^2}{2${m}} + ${V}`, raw`\sqrt{p^2c^2 + ${m}^2c^4} - ${V}`, raw`\sqrt{p^2c^2 - ${m}^2c^4} + ${V}`, raw`pc + ${m}c^2 + ${V}`, raw`\frac{p^2}{2${m}} + ${m}c^2 - ${V}`].map(mth)),
          expl: raw`$p = \gamma ${m}\dot{x}$ and $H = p\dot{x} - L = \gamma ${m}c^2 + ${V}$. Since $\gamma^2${m}^2c^4 = p^2c^2 + ${m}^2c^4$, $H = \sqrt{p^2c^2 + ${m}^2c^4} + ${V}$: the total relativistic energy plus potential energy.`,
        };
      },
    },
    {
      id: 'mech2.ham.eqs', sec: '1.5.3', level: 2,
      gen(R) {
        const m = R.pick(['m', 'M']);
        const qp = n => (n === 1 ? 'q' : `q^{${n}}`);
        const HV = [
          () => { const n = R.int(2, 5), c = R.pick(['k', raw`\alpha `, raw`\lambda `]); const co = n === 2 ? '' : ''; return { H: raw`\frac{p^2}{2${m}} + ${c}${qp(n)}${co}`, dp: raw`\frac{p}{${m}}`, ndp: raw`-\frac{p}{${m}}`, dq: raw`${n}${c}${qp(n - 1)}`, ndq: raw`-${n}${c}${qp(n - 1)}`, lv: 1 }; },
          () => ({ H: raw`\frac{p^2}{2${m}q^2} + kq`, dp: raw`\frac{p}{${m}q^2}`, ndp: raw`-\frac{p}{${m}q^2}`, dq: raw`k - \frac{p^2}{${m}q^3}`, ndq: raw`\frac{p^2}{${m}q^3} - k`, lv: 3 }),
          () => { const a = R.pick(['a', 'b']); return { H: raw`\frac{(p - ${a}q)^2}{2${m}}`, dp: raw`\frac{p - ${a}q}{${m}}`, ndp: raw`-\frac{p - ${a}q}{${m}}`, dq: raw`-\frac{${a}(p - ${a}q)}{${m}}`, ndq: raw`\frac{${a}(p - ${a}q)}{${m}}`, lv: 3 }; },
          () => { const a = R.pick([raw`\alpha `, raw`\lambda `, 'c']); return { H: raw`${a}qp`, dp: raw`${a}q`, ndp: raw`-${a}q`, dq: raw`${a}p`, ndq: raw`-${a}p`, lv: 2 }; },
          () => { const a = R.pick(['a', 'b']); return { H: raw`\frac{p^2}{2${m}}e^{-q/${a}}`, dp: raw`\frac{p}{${m}}e^{-q/${a}}`, ndp: raw`-\frac{p}{${m}}e^{-q/${a}}`, dq: raw`-\frac{p^2}{2${m}${a}}e^{-q/${a}}`, ndq: raw`\frac{p^2}{2${m}${a}}e^{-q/${a}}`, lv: 3 }; },
          () => ({ H: raw`\sqrt{p^2c^2 + ${m}^2c^4}`, dp: raw`\frac{pc^2}{\sqrt{p^2c^2 + ${m}^2c^4}}`, ndp: raw`-\frac{pc^2}{\sqrt{p^2c^2 + ${m}^2c^4}}`, dq: '0', ndq: '0', extra: [raw`\dot{q} = \frac{p}{${m}},\quad \dot{p} = 0`, raw`\dot{q} = c,\quad \dot{p} = 0`], lv: 2 }),
          () => ({ H: raw`\frac{p^2}{2${m}} + \frac{1}{2}${m}\omega^2q^2`, dp: raw`\frac{p}{${m}}`, ndp: raw`-\frac{p}{${m}}`, dq: raw`${m}\omega^2q`, ndq: raw`-${m}\omega^2q`, lv: 1 }),
          () => ({ H: raw`\frac{p^2}{2${m}} + ${m}gq`, dp: raw`\frac{p}{${m}}`, ndp: raw`-\frac{p}{${m}}`, dq: raw`${m}g`, ndq: raw`-${m}g`, extra: [raw`\dot{q} = \frac{p}{${m}},\quad \dot{p} = -g`], lv: 1 }),
        ];
        const h = R.pick(HV)();
        const pr = (a, b) => raw`\dot{q} = ${a},\quad \dot{p} = ${b}`;
        const C = pr(h.dp, h.ndq);
        const W = [pr(h.ndp, h.dq), pr(h.dp, h.dq), pr(h.dq, h.ndp), pr(h.ndq, h.dp), pr(h.ndp, h.ndq)].concat(h.extra || []);
        return {
          q: raw`A system with one degree of freedom has Hamiltonian $H(q, p) = ${h.H}$, where all symbols other than $q$ and $p$ are constants. Which of the following are Hamilton's equations of motion?`,
          ...GRE.mc(R, mth(C), W.map(mth)), level: h.lv,
          expl: raw`Hamilton's equations are $\dot{q} = \partial H/\partial p$ and $\dot{p} = -\partial H/\partial q$. Here $\partial H/\partial p = ${h.dp}$ and $\partial H/\partial q = ${h.dq}$, so $${C}$. Check the signs with $H = p^2/2m + U$: $\dot{p} = -U'$ is Newton's second law.`,
        };
      },
    },
    {
      id: 'mech2.ham.concept', sec: '1.5.3', level: 3,
      gen(R) {
        const SYSC = [
          { d: raw`a bead sliding without friction along a straight rod that a motor turns at constant angular velocity $\omega$ in a horizontal plane (coordinate: distance $r$ from the axis)`, c: 'r', t: [1, 0, 0, 0], why: '$L = \\frac{1}{2}m(\\dot{r}^2 + \\omega^2r^2)$ has no explicit $t$, so $H = \\frac{p_r^2}{2m} - \\frac{1}{2}m\\omega^2r^2$ is conserved, but it is not $T + U$ (time-dependent constraint) and the motor changes the energy.' },
          { d: raw`a bead on a frictionless circular hoop that is spun at constant angular velocity $\omega$ about its vertical diameter (coordinate: angle $\theta$ from the bottom)`, c: raw`\theta`, t: [1, 0, 0, 0], why: 'The constraint moves, so $H \\ne T + U$; $L$ has no explicit $t$, so $H$ is conserved, while $T + U$ is not (the motor does work), and $\\theta$ is not cyclic.' },
          { d: raw`a simple pendulum with a fixed pivot (coordinate: angle $\theta$)`, c: raw`\theta`, t: [1, 1, 1, 0], why: 'Fixed constraints and a velocity-independent potential make $H = T + U$, and with no explicit $t$ it is conserved; gravity exerts a torque, so $p_\\theta$ changes.' },
          { d: raw`a planet moving in the gravitational field of a fixed star (polar coordinates $r$, $\phi$)`, c: raw`\phi`, t: [1, 1, 1, 1], why: '$H = T + U$ with no explicit time dependence, and $\\phi$ is cyclic, so $p_\\phi$ (the angular momentum) is conserved.' },
          { d: raw`a planet moving in the gravitational field of a fixed star (polar coordinates $r$, $\phi$)`, c: 'r', t: [1, 1, 1, 0], why: '$H = T + U$ is conserved, but $p_r = m\\dot{r}$ changes as the planet moves between perihelion and aphelion.' },
          { d: raw`a mass on a spring whose spring constant is changed in time as $k(t)$ by an external agent (coordinate $x$)`, c: 'x', t: [0, 1, 0, 0], why: '$H = \\frac{p^2}{2m} + \\frac{1}{2}k(t)x^2$ equals $T + U$ at each instant, but it depends explicitly on $t$, so neither $H$ nor the energy is conserved.' },
          { d: raw`a pendulum hanging from a cart that slides freely on a frictionless horizontal track (coordinates: cart position $x$ and pendulum angle $\theta$)`, c: 'x', t: [1, 1, 1, 1], why: '$H = T + U$ is conserved, and $x$ is cyclic, so $p_x$ (the total horizontal momentum) is conserved.' },
          { d: raw`a particle sliding on the inside of a fixed frictionless cone with vertical axis (coordinates: distance $s$ from the vertex along the surface and azimuth $\phi$)`, c: raw`\phi`, t: [1, 1, 1, 1], why: 'Fixed constraints make $H = T + U$, conserved; $\\phi$ is cyclic, so the angular momentum about the axis is conserved.' },
        ];
        const S = R.pick(SYSC);
        const st = [raw`The Hamiltonian $H$ is a constant of the motion.`, raw`The Hamiltonian $H$ equals the total mechanical energy $T + U$.`, raw`The total mechanical energy $T + U$ is conserved.`, raw`The momentum conjugate to $${S.c}$ is conserved.`];
        const idx = R.pickN([0, 1, 2, 3], 3).sort((a, b) => a - b);
        if (!idx.some(i => S.t[i])) throw new Error('retry');
        const pool = idx.map(i => [st[i], !!S.t[i]]);
        const q = GRE.romanStem(`Consider ${S.d}. Which of the following statements is (are) true?`, pool.map(x => x[0]));
        return { q, ...GRE.roman(R, pool.map(x => x[1])), expl: 'Rules: $H$ is conserved iff $L$ has no explicit time dependence; $H = T + U$ when the constraints are time-independent and $U$ does not depend on velocities; $p_q$ is conserved iff $q$ is cyclic. ' + S.why };
      },
    },
    // ------------------------------------------------------------ 1.6.1 Effective potential
    {
      id: 'mech2.orb.veff', sec: '1.6.1', level: 1,
      gen(R) {
        const v = R.weighted([0, 1, 2], [3, 2, 2]);
        if (v === 0) {
          const J = R.pick(['L', raw`\ell `, 'J']);
          const U = R.pick([raw`-\frac{GMm}{r}`, raw`-\frac{k}{r}`, raw`\frac{1}{2}\kappa r^2`, raw`-\frac{\alpha}{r^3}`, raw`\beta r^4`, raw`-\frac{k}{r}e^{-r/a}`, raw`F_0r`]);
          const pU = U[0] === '-' ? ' ' + U : ' + ' + U, mU = U[0] === '-' ? ' + ' + U.slice(1) : ' - ' + U;
          const C = raw`\frac{${J}^2}{2mr^2}${pU}`;
          return {
            q: raw`A particle of mass $m$ moves under a central force with potential energy $U(r) = ${U}$ (all constants positive). If the magnitude of its angular momentum about the force center is $${J.trim()}$, which of the following is the effective potential that governs its radial motion?`,
            ...GRE.mc(R, mth(C), [raw`\frac{${J}^2}{mr^2}${pU}`, raw`\frac{${J}^2}{2mr}${pU}`, raw`-\frac{${J}^2}{2mr^2}${pU}`, raw`\frac{${J}}{2mr^2}${pU}`, raw`\frac{${J}^2}{2mr^2}${mU}`, raw`\frac{m${J}^2}{2r^2}${pU}`].map(mth)),
            expl: raw`With $\dot{\phi} = ${J}/(mr^2)$, the angular kinetic energy $\frac{1}{2}mr^2\dot{\phi}^2$ becomes $\frac{${J}^2}{2mr^2}$, which acts like a repulsive "centrifugal barrier" added to $U$: $V_{\text{eff}} = ${C}$. Dimensions rule out $${J}^2/2mr$ and $m${J}^2/2r^2$.`,
          };
        }
        if (v === 1) {
          const U = R.pick(['U(r)', raw`-\frac{k}{r}`, raw`-\frac{Gm_1m_2}{r}`]);
          const pU = U[0] === '-' ? ' ' + U : ' + ' + U;
          const C = raw`\frac{(m_1 + m_2)L^2}{2m_1m_2r^2}${pU}`;
          return {
            q: raw`Two bodies of masses $m_1$ and $m_2$ interact through the central potential energy $${U === 'U(r)' ? 'U(r)' : 'U(r) = ' + U}$, where $r$ is their separation. In the center-of-mass frame their relative angular momentum is $L$. Which of the following is the effective potential for the relative coordinate $r$?`,
            ...GRE.mc(R, mth(C), [raw`\frac{L^2}{2(m_1 + m_2)r^2}${pU}`, raw`\frac{m_1m_2L^2}{2(m_1 + m_2)r^2}${pU}`, raw`\frac{L^2}{2m_1r^2}${pU}`, raw`\frac{(m_1 + m_2)L^2}{m_1m_2r^2}${pU}`, raw`\frac{L^2}{2m_1m_2r^2}${pU}`].map(mth)), level: 2,
            expl: raw`The two-body problem reduces to one body of reduced mass $\mu = \frac{m_1m_2}{m_1 + m_2}$, so $V_{\text{eff}} = \frac{L^2}{2\mu r^2} + U(r)$. Check the limit $m_2 \to \infty$: $\mu \to m_1$, as it should.`,
          };
        }
        const PAIRS = [[1, 2], [1, 3], [2, 3], [1, 4], [3, 4], [2, 5], [3, 5], [1, 5], [4, 5], [1, 6], [5, 6], [3, 7], [1, 9], [2, 7], [4, 7]];
        const [a, b] = R.shuffle(R.pick(PAIRS));
        const M = R.pick(['M', 'm']);
        const mu = a * b / (a + b);
        const fm = x => { const r = F.toRational(x, 200); return r ? mth(F.coef(r[0], r[1]) + M) : null; };
        const ctx = R.pick([
          raw`Two stars of masses $${F.coef(a) + M}$ and $${F.coef(b) + M}$ orbit their common center of mass. In the equivalent one-body problem for their separation, what mass appears in the kinetic energy and the centrifugal term?`,
          raw`Two particles of masses $${F.coef(a) + M}$ and $${F.coef(b) + M}$ interact through a central force. What is the reduced mass of the pair?`,
          raw`A binary system consists of bodies of masses $${F.coef(a) + M}$ and $${F.coef(b) + M}$. Kepler's third law for this pair involves the total mass, but the radial equation of motion for the separation involves which mass?`]);
        return {
          q: ctx, level: 1,
          ...mcNum(R, mu, [a + b, (a + b) / 2, Math.min(a, b), Math.max(a, b), 2 * mu, mu / 2], fm),
          expl: raw`$\mu = \frac{m_1m_2}{m_1 + m_2} = \frac{${a}\cdot ${b}}{${a} + ${b}}\,${M} = ${F.coef(a * b, a + b) + M}$. It is smaller than either mass and approaches the lighter mass when the other is very heavy.`,
        };
      },
    },
    {
      id: 'mech2.orb.circ', sec: '1.6.1', level: 2,
      gen(R) {
        const c = R.pick(['A', 'k', raw`\alpha `, raw`\beta `]);
        const P = R.pick([
          { n: 1, U: raw`${c}r` }, { n: 2, U: raw`${c}r^2` }, { n: 3, U: raw`${c}r^3` }, { n: 4, U: raw`${c}r^4` },
          { n: -1, U: raw`-\frac{${c.trim()}}{r}` }, { n: 0, U: raw`${c}\ln(r/a)` }, { n: -1, U: raw`-\frac{GMm}{r}`, grav: true },
        ]);
        const J = R.pick(['L', raw`\ell `]);
        const f = Math.abs(P.n) || 1, e = P.n + 2;               // r^e = J^2 / (f m c)
        const mc = P.grav ? 'GMm^2' : `${f === 1 ? '' : f}m${c}`;
        const mcn = (ff) => (P.grav ? 'GMm^2' : `${ff === 1 ? '' : ff}m${c}`);
        const powr = (inner, ee) => (ee === 1 ? inner : ee === 2 ? raw`\sqrt{${inner}}` : raw`\left(${inner}\right)^{1/${ee}}`);
        const kind = P.grav ? R.pick(['r', 'r', 'E']) : P.n === -1 ? R.pick(['r', 'J', 'E']) : R.pick(['r', 'r', 'J']);
        const stem = raw`A particle of mass $m$ moves in the central potential $U(r) = ${P.U}$${P.grav ? ' due to a fixed mass $M$' : ` (with $${c.trim()} > 0$)`}.`;
        const veff = raw`V_{\text{eff}} = \frac{${J}^2}{2mr^2} + U(r)`;
        if (kind === 'r') {
          const C = powr(raw`\frac{${J}^2}{${mc}}`, e);
          const W = [powr(raw`\frac{${J}^2}{${mc}}`, e + 1), powr(raw`\frac{${J}}{${mc}}`, e), powr(raw`\frac{${mc}}{${J}^2}`, e), e > 1 ? powr(raw`\frac{${J}^2}{${mc}}`, e - 1) : powr(raw`\frac{${J}^2}{${mc}}`, e + 2), powr(raw`\frac{${J}^2}{${mcn(f === 1 ? 2 : 1)}}`, e), P.grav ? raw`\frac{${J}^2}{GMm}` : powr(raw`\frac{${J}^2 ${c}}{${f === 1 ? '' : f}m}`, e)];
          return {
            q: stem + raw` If its angular momentum is $${J.trim()}$, at what radius can it move in a circular orbit?`,
            ...GRE.mc(R, mth(raw`r = ${C}`), W.map(w => mth('r = ' + w))),
            expl: raw`A circular orbit sits at the minimum of $${veff}$: $V'_{\text{eff}} = -\frac{${J}^2}{mr^3} + U'(r) = 0$ with $U'(r) = ${P.grav ? raw`\frac{GMm}{r^2}` : P.n === -1 ? raw`\frac{${c}}{r^2}` : P.n === 0 ? raw`\frac{${c}}{r}` : raw`${f === 1 ? '' : f}${c}${P.n - 1 === 0 ? '' : P.n - 1 === 1 ? 'r' : `r^{${P.n - 1}}`}`}$, so $r${e === 1 ? '' : `^{${e}}`} = \frac{${J}^2}{${mc}}$. Dimensional analysis alone eliminates most choices.`,
          };
        }
        if (kind === 'J') {
          const rr = 'R';
          const rp = ee => (ee === 1 ? rr : `${rr}^{${ee}}`);
          const C = raw`\sqrt{${mc}${rp(e)}}`;
          const W = [raw`\sqrt{m${c}${rp(e)}}`, raw`\sqrt{${mc}${rp(e + 1)}}`, raw`\sqrt{${mc}${rp(e - 1 || 2)}}`, raw`${mc}${rp(e)}`, raw`\sqrt{\frac{${f === 1 ? '' : f}${c}${rp(e)}}{m}}`, raw`\sqrt{2${mc}${rp(e)}}`];
          return {
            q: stem + raw` What angular momentum must it have to move in a circular orbit of radius $R$?`,
            ...GRE.mc(R, mth(raw`${J} = ${C}`), W.map(w => mth(raw`${J} = ${w}`))),
            expl: raw`Setting $V'_{\text{eff}}(R) = 0$ for $${veff}$ gives $${J}^2/(mR^3) = U'(R)$, i.e. $${J}^2 = ${mc}${rp(e)}$ — the same as requiring the force to supply the centripetal acceleration, $mv^2/R = U'(R)$ with $${J} = mvR$.`,
          };
        }
        const kk = P.grav ? 'GMm' : c;
        const C = raw`-\frac{m${P.grav ? '(GMm)' : kk}^2}{2${J}^2}`;
        return {
          q: stem + raw` For a given angular momentum $${J.trim()}$, what is the total energy of the circular orbit (the minimum of the effective potential)?`, level: 3,
          ...GRE.mc(R, mth('E = ' + C), [raw`-\frac{m${P.grav ? '(GMm)' : kk}^2}{${J}^2}`, raw`\frac{m${P.grav ? '(GMm)' : kk}^2}{2${J}^2}`, raw`-\frac{${P.grav ? '(GMm)' : kk}^2}{2m${J}^2}`, raw`-\frac{m${kk}}{2${J}^2}`, raw`-\frac{m${P.grav ? '(GMm)' : kk}^2}{4${J}^2}`].map(w => mth('E = ' + w))),
          expl: raw`$V_{\text{eff}} = \frac{${J}^2}{2mr^2} - \frac{${kk}}{r}$ is minimal at $r_0 = \frac{${J}^2}{m${kk}}$, where $V_{\text{eff}}(r_0) = \frac{${kk}}{2r_0} - \frac{${kk}}{r_0} = -\frac{${kk}}{2r_0} = ${C}$. (Virial theorem: $E = -T = U/2$ for a circular $1/r$ orbit.)`,
        };
      },
    },
    {
      id: 'mech2.orb.stability', sec: '1.6.1', level: 2,
      gen(R) {
        if (R.bool(0.7)) {
          const POOL = [
            [raw`$U(r) = -\dfrac{k}{r}$`, 1], [raw`$U(r) = kr^2$`, 1], [raw`$U(r) = kr$`, 1], [raw`$U(r) = kr^4$`, 1], [raw`$U(r) = k\ln(r/a)$`, 1], [raw`$U(r) = -\dfrac{k}{\sqrt{r}}$`, 1], [raw`$U(r) = -\dfrac{k}{r^{3/2}}$`, 1],
            [raw`$U(r) = -\dfrac{k}{r^3}$`, 0], [raw`$U(r) = -\dfrac{k}{r^4}$`, 0], [raw`$U(r) = -\dfrac{k}{r^2}$`, 0], [raw`$U(r) = +\dfrac{k}{r}$`, 0], [raw`$U(r) = -\dfrac{k}{r^{5/2}}$`, 0], [raw`$U(r) = -kr^2$`, 0],
          ];
          return {
            ...romanQ(R, 'A particle of mass $m$ with nonzero angular momentum moves in a central potential. For which of the following potentials (with $k, a > 0$) does a <i>stable</i> circular orbit exist?', POOL,
              'A stable circular orbit needs a minimum of $V_{\\text{eff}} = \\frac{L^2}{2mr^2} + U(r)$. For an attractive power law $U \\propto r^n$, $V_{\\text{eff}}^{\\prime\\prime} > 0$ at the circular radius requires $n > -2$ (the logarithm acts like $n \\to 0$). For $n \\le -2$ the potential beats the centrifugal barrier at small $r$, and repulsive potentials have no circular orbits at all.'),
            level: 2,
          };
        }
        if (R.bool()) {
          const C = 'only for $n \\lt 2$';
          return {
            q: raw`A particle moves in an attractive central potential $U(r) = -k/r^n$ with $k > 0$ and $n > 0$. For which values of $n$ are circular orbits stable against small radial perturbations?`, level: 2,
            ...GRE.mc(R, C, ['only for $n > 2$', 'only for $n \\lt 1$', 'only for $n = 1$', 'for all $n > 0$', 'only for $n \\lt 3$']),
            expl: raw`$V_{\text{eff}} = \frac{L^2}{2mr^2} - \frac{k}{r^n}$. At the circular radius, $V''_{\text{eff}} \propto (2 - n)$, so the orbit is stable iff $n \lt 2$: the attractive term must fall off more slowly than the $1/r^2$ centrifugal barrier. Gravity ($n = 1$) is safely stable.`,
          };
        }
        return {
          q: raw`A particle moves in the central potential $U(r) = kr^n$ with $k > 0$ and $n > 0$ (a confining potential). For which values of $n$ do stable circular orbits exist?`, level: 2,
          ...GRE.mc(R, 'for every $n > 0$', ['only for $n \\lt 2$', 'only for $n > 2$', 'only for $n = 2$', 'only for $n \\ge 1$', 'for no value of $n$']),
          expl: raw`$V_{\text{eff}} = \frac{L^2}{2mr^2} + kr^n$ rises to infinity at both small and large $r$, so it always has a single minimum: stable circular orbits exist for every $n > 0$ (more generally, for attractive power laws with $n > -2$).`,
        };
      },
    },
    // ------------------------------------------------------------ 1.6.2 Classification of orbits
    {
      id: 'mech2.orb.classify', sec: '1.6.2', level: 2,
      gen(R) {
        const SH = { c: 'a circle', e: 'an ellipse that is not a circle', p: 'a parabola', h: 'a hyperbola', s: 'a spiral that ends at the central body' };
        const body = R.pick([['comet', 'star', 'M'], ['asteroid', 'sun', 'M_{\\odot}'], ['spacecraft', 'planet', 'M']]);
        const v = R.int(0, 3);
        let q, a, why;
        if (v === 0) {
          const [bn, bd] = R.pick([[1, 4], [1, 2], [1, 1], [1, 1], [3, 2], [2, 1], [2, 1], [5, 2], [3, 1], [4, 1], [3, 4], [5, 4]]);
          const b = bn / bd, perp = R.bool(0.6);
          const ang = perp ? 'perpendicular to the line joining it to the ' + body[1] : `at $${R.pick([30, 45, 60])}^\\circ$ to the line joining it to the ${body[1]}`;
          a = b < 2 ? (b === 1 && perp ? 'c' : 'e') : b === 2 ? 'p' : 'h';
          q = raw`${/^[aeiou]/.test(body[0]) ? 'An' : 'A'} ${body[0]} of mass $m$ is at distance $r$ from a ${body[1]} of mass $${body[2]} \gg m$ and moves with speed $v$ given by $v^2 = ${F.coef(bn, bd)}\,G${body[2]}/r$, directed ${ang}. What is the shape of its orbit?`;
          why = raw`$E = \frac{1}{2}mv^2 - \frac{G${body[2]}m}{r} = (${F.frac(bn, 2 * bd)} - 1)\frac{G${body[2]}m}{r}$, which is ${b < 2 ? 'negative: a bound ellipse' : b === 2 ? 'zero: a parabola' : 'positive: a hyperbola'}. ${a === 'c' ? 'With $v^2 = GM/r$ exactly and the velocity perpendicular to the radius, the ellipse is a circle.' : b === 1 ? 'Although $v^2 = GM/r$, the velocity is not perpendicular to the radius, so the orbit is not a circle.' : ''}`;
        } else if (v === 1) {
          const X = R.pick([['\\frac{1}{2}', 0.5], ['\\frac{1}{\\sqrt{2}}', Math.SQRT1_2], ['\\frac{3}{4}', 0.75], ['1', 1], ['\\frac{5}{4}', 1.25], ['\\frac{3}{2}', 1.5], ['2', 2], ['\\frac{1}{\\sqrt{2}}', Math.SQRT1_2]]);
          const perp = X[1] === Math.SQRT1_2 ? R.bool(0.75) : R.bool(0.5);
          a = X[1] < 1 ? (Math.abs(X[1] - Math.SQRT1_2) < 1e-9 && perp ? 'c' : 'e') : X[1] === 1 ? 'p' : 'h';
          q = raw`${/^[aeiou]/.test(body[0]) ? 'An' : 'A'} ${body[0]} at distance $r$ from a ${body[1]} (mass $${body[2]}$, much heavier) has speed equal to $${X[0]}$ times the escape speed at that distance, with its velocity ${perp ? 'perpendicular to' : 'at $45^\\circ$ to'} the line joining it to the ${body[1]}. Its orbit is`;
          why = raw`The escape speed $\sqrt{2G${body[2]}/r}$ corresponds to $E = 0$. Below it $E \lt 0$ (ellipse), at it $E = 0$ (parabola), above it $E > 0$ (hyperbola). A circular orbit needs speed $v_{\text{esc}}/\sqrt{2}$ <i>and</i> velocity perpendicular to the radius.`;
        } else if (v === 2) {
          const E = R.pick([['E = V_0', 'c'], ['E = \\frac{1}{2}V_0', 'e'], ['E = \\frac{3}{4}V_0', 'e'], ['E = \\frac{1}{4}V_0', 'e'], ['E = 0', 'p'], ['E = -V_0', 'h'], ['E = -\\frac{1}{2}V_0', 'h']]);
          a = E[1];
          q = raw`A body moves in the gravitational field of a fixed mass. For its angular momentum, the effective potential $V_{\text{eff}}(r) = \frac{L^2}{2mr^2} - \frac{GMm}{r}$ has minimum value $V_0 \lt 0$. If the body's total energy is $${E[0]}$, its orbit is`;
          why = raw`For a $1/r$ potential: $E = V_{\min}$ gives a circle, $V_{\min} \lt E \lt 0$ an ellipse, $E = 0$ a parabola and $E > 0$ a hyperbola. Since $V_0 \lt 0$, $${E[0]}$ is ${a === 'c' ? 'exactly the minimum' : a === 'e' ? 'between $V_0$ and 0' : a === 'p' ? 'zero' : 'positive'}.`;
        } else {
          const ecc = R.pick([['0', 'c'], ['0.3', 'e'], ['0.5', 'e'], ['0.97', 'e'], ['1', 'p'], ['1.2', 'h'], ['2', 'h']]);
          a = ecc[1];
          q = raw`${/^[aeiou]/.test(body[0]) ? 'An' : 'A'} ${body[0]} moves under the inverse-square gravitational attraction of a ${body[1]} on a conic-section orbit of eccentricity $e = ${ecc[0]}$. Its orbit is`;
          why = 'Conic sections: $e = 0$ circle, $0 \\lt e \\lt 1$ ellipse, $e = 1$ parabola, $e > 1$ hyperbola, corresponding to $E = V_{\\min}$, $V_{\\min} \\lt E \\lt 0$, $E = 0$ and $E > 0$.';
        }
        const corr = SH[a];
        return { q, ...GRE.mc(R, corr, Object.keys(SH).filter(k => k !== a).map(k => SH[k])), expl: why, level: v === 3 ? 1 : 2 };
      },
    },
    {
      id: 'mech2.orb.ellipse', sec: '1.6.2', level: 2,
      gen(R) {
        const p = R.int(1, 4), q = R.int(p + 1, 10);
        const s = R.pick([['satellite', 'planet'], ['moon', 'planet'], ['planet', 'star'], ['probe', 'planet']]);
        const kind = R.pick(['E', 'E', 'e', 'v']);
        const stem = raw`A ${s[0]} of mass $m$ moves on an elliptical orbit about a ${s[1]} of mass $M \gg m$. Its closest distance to the ${s[1]}'s center is $${nR(p)}$ and its farthest is $${nR(q)}$.`;
        if (kind === 'E') {
          const fm = x => mth('E = -' + fracSym(-x, 'GMm', 'R'));
          return {
            q: stem + ' What is its total mechanical energy?',
            ...mcNum(R, -1 / (p + q), [-1 / (2 * p), -1 / (2 * q), -1 / (2 * (p + q)), -2 / (p + q), -1 / p, -1 / q], fm, { allowSign: true }),
            expl: raw`For a Kepler ellipse $E = -\frac{GMm}{2a}$ with semimajor axis $a = \frac{r_{\min} + r_{\max}}{2} = ${F.frac(p + q, 2)}R$, so $E = -\frac{GMm}{${p + q}R}$. Using $r_{\min}$ or $r_{\max}$ in the circular-orbit formula, or forgetting the factor $\frac{1}{2}$ in $a$, are the traps.`,
          };
        }
        if (kind === 'e') {
          return {
            q: stem + ' What is the eccentricity of the orbit?', level: 1,
            ...mcNum(R, (q - p) / (q + p), [p / q, (q - p) / q, 1 - (p / q) * (p / q), (q - p) / (2 * (q + p)), (q - p) / (2 * q), q / (p + q)], exM),
            expl: raw`$r_{\min} = a(1 - e)$ and $r_{\max} = a(1 + e)$, so $e = \frac{r_{\max} - r_{\min}}{r_{\max} + r_{\min}} = \frac{${q - p}}{${q + p}}${(q - p) / (q + p) === F.toRational((q - p) / (q + p), 200)[0] / F.toRational((q - p) / (q + p), 200)[1] ? '' : ''} = ${F.frac(q - p, q + p)}$.`,
          };
        }
        const vp = Math.sqrt(2 * q / (p * (p + q)));
        const fm = x => { const e = F.exact(x); if (e == null) return null; return mth('v = ' + (e === '1' ? '' : e) + raw`\sqrt{\frac{GM}{R}}`); };
        return {
          q: stem + ` What is its speed at the point of closest approach?`, level: 3,
          ...mcNum(R, vp, [Math.sqrt(1 / p), Math.sqrt(2 / p), Math.sqrt(2 * p / (q * (p + q))), Math.sqrt(2 / (p + q)), Math.sqrt(1 / q), Math.sqrt(q / p) * Math.sqrt(1 / (p + q))], fm),
          expl: raw`Combine energy conservation, $\frac{1}{2}v_p^2 - \frac{GM}{r_p} = -\frac{GM}{r_p + r_a}$, with $v_pr_p = v_ar_a$: $v_p^2 = \frac{2GM\,r_a}{r_p(r_p + r_a)} = ${F.frac(2 * q, p * (p + q))}\,\frac{GM}{R}$. It must exceed the circular speed $\sqrt{GM/r_p}$ but stay below the escape speed $\sqrt{2GM/r_p}$.`,
        };
      },
    },
    {
      id: 'mech2.orb.circen', sec: '1.6.2', level: 2,
      gen(R) {
        const v = R.weighted(['factor', 'work', 'roman'], [3, 1, 2]);
        const sat = R.pick(['satellite', 'space station', 'moon', 'small probe']);
        if (v === 'factor') {
          const n = R.pick([4, 9, 16, 2, 3, 1 / 4, 1 / 9, 1 / 2, 1 / 16]);
          const Q = R.pick([
            ['its orbital speed', -0.5], ['its kinetic energy', -1], ['the magnitude of its total energy', -1], ['the magnitude of its gravitational potential energy', -1],
            ['its orbital period', 1.5], ['its angular momentum', 0.5], ['its angular velocity', -1.5], ['its centripetal acceleration', -2],
          ]);
          const nT = n >= 1 ? String(n) : F.frac(1, Math.round(1 / n));
          const ans = Math.pow(n, Q[1]);
          return {
            q: raw`A ${sat} is moved from a circular orbit of radius $r$ around a planet to a circular orbit of radius $${nT === '1' ? '' : nT}${n < 1 ? '\\,' : ''}r$. By what factor does ${Q[0]} change?`,
            ...mcNum(R, ans, [-2, -1.5, -1, -0.5, 0.5, 1, 1.5, 2, 3].filter(e => e !== Q[1]).map(e => Math.pow(n, e)), exM),
            expl: raw`For a circular orbit $v = \sqrt{GM/r}$, so $K = \frac{GMm}{2r}$, $U = -\frac{GMm}{r}$, $E = -\frac{GMm}{2r}$, $T \propto r^{3/2}$, $L = mvr \propto r^{1/2}$, $\omega \propto r^{-3/2}$, $a = GM/r^2$. Here the quantity scales as $r^{${F.fracI(Q[1] * 2, 2)}}$, giving a factor $${ex(ans)}$.`,
          };
        }
        if (v === 'work') {
          const n = R.pick([2, 3, 4, 5, 3 / 2, 4 / 3]);
          const nT = ex(n);
          const W = (1 - 1 / n) / 2;
          const fm = x => { const r = F.toRational(x, 500); return r ? mth(fracSym(x, 'GMm', 'r')) : null; };
          return {
            q: raw`How much work must be done (by its engines) to move a ${sat} of mass $m$ from a circular orbit of radius $r$ about a planet of mass $M$ to a circular orbit of radius $${nT}r$?`, level: 2,
            ...mcNum(R, W, [1 - 1 / n, (1 - 1 / (n * n)) / 2, 1 / (2 * n), (n - 1) / 2, (1 - 1 / n) / 4, 1 / n], fm),
            expl: raw`The work equals the change in total energy, $E = -\frac{GMm}{2r}$: $W = \frac{GMm}{2r}\left(1 - \frac{1}{${nT}}\right) = ${fracSym(W, 'GMm', 'r')}$. Using only the change in potential energy, $GMm(1/r - 1/r')$, overcounts by a factor of 2 because the kinetic energy decreases.`,
          };
        }
        const up = R.bool();
        const POOL = [
          ['Its kinetic energy', up ? 'decreases' : 'increases', 1], ['Its kinetic energy', up ? 'increases' : 'decreases', 0],
          ['Its gravitational potential energy', up ? 'increases' : 'decreases', 1], ['Its total mechanical energy', up ? 'increases' : 'decreases', 1],
          ['Its total mechanical energy', up ? 'decreases' : 'increases', 0], ['Its orbital speed', up ? 'increases' : 'decreases', 0],
          ['Its orbital period', up ? 'increases' : 'decreases', 1], ['Its angular momentum', up ? 'decreases' : 'increases', 0],
          ['Its angular momentum', up ? 'increases' : 'decreases', 1], ['Its angular velocity', up ? 'increases' : 'decreases', 0],
        ].map(x => [`${x[0]} ${x[1]}.`, x[2]]);
        return {
          ...romanQ(R, `A ${sat} is moved from one circular orbit around a planet to another circular orbit of ${up ? 'larger' : 'smaller'} radius. Which of the following is (are) true?`, POOL,
            'For circular orbits $K = GMm/2r$, $U = -GMm/r$, $E = -GMm/2r$, $v \\propto r^{-1/2}$, $T \\propto r^{3/2}$, $L \\propto r^{1/2}$. A higher orbit has less kinetic energy but more (less negative) potential and total energy.'),
          level: 2,
        };
      },
    },
    {
      id: 'mech2.orb.escape', sec: '1.6.2', level: 2,
      gen(R) {
        const v = R.weighted(['scale', 'height', 'boost'], [3, 3, 1]);
        if (v === 'scale') {
          const byDensity = R.bool();
          let fac, txt, why;
          if (byDensity) {
            const a = R.pick([2, 3, 4, 1 / 2, 1 / 3]), b = R.pick([1, 4, 1 / 4, 9, 1 / 9]);
            fac = a * Math.sqrt(b);
            txt = raw`has ${a === 1 ? 'the same radius as' : `$${ex(a)}$ times the radius of`} Earth and ${b === 1 ? 'the same average density' : `$${ex(b)}$ times its average density`}`;
            why = raw`$v_{\text{esc}} = \sqrt{2GM/R}$ with $M = \frac{4}{3}\pi R^3\rho$, so $v_{\text{esc}} \propto R\sqrt{\rho}$: factor $${ex(a)}\times\sqrt{${ex(b)}} = ${ex(fac)}$.`;
            if (Math.abs(fac - 1) < 1e-9) throw new Error('trivial');
            const ve = 11.2 * fac;
            return {
              q: raw`The escape speed from Earth's surface is about $11.2\,\text{km/s}$. A planet ${txt}. The escape speed from its surface is closest to`,
              ...GRE.numeric(R, ve, [11.2 * a * b, 11.2 * Math.sqrt(a * b), 11.2 * a * a * Math.sqrt(b), 11.2 * Math.sqrt(b) / a, 11.2 * a * Math.sqrt(b) / Math.SQRT2], { unit: raw`\text{km/s}`, sig: 2 }),
              expl: why,
            };
          }
          const mF = R.pick([2, 4, 8, 9, 1 / 2, 1 / 4, 16, 1 / 9]), rF = R.pick([2, 4, 1 / 2, 1 / 4, 1, 9]);
          if (Math.abs(mF / rF - 1) < 1e-9) throw new Error('trivial');
          fac = Math.sqrt(mF / rF);
          return {
            q: raw`The escape speed from Earth's surface is about $11.2\,\text{km/s}$. A planet has $${ex(mF)}$ times Earth's mass and ${rF === 1 ? "the same radius as Earth" : `$${ex(rF)}$ times Earth's radius`}. The escape speed from its surface is closest to`,
            ...GRE.numeric(R, 11.2 * fac, [11.2 * mF / rF, 11.2 * Math.sqrt(mF) / rF, 11.2 * Math.sqrt(rF / mF), 11.2 * Math.sqrt(mF / (rF * rF))], { unit: raw`\text{km/s}`, sig: 2 }),
            expl: raw`$v_{\text{esc}} = \sqrt{2GM/R} \propto \sqrt{M/R}$, so the factor is $\sqrt{${ex(mF)}/${ex(rF)}} = ${ex(fac)}$, giving about $${F.num(11.2 * fac, 2)}\,\text{km/s}$.`,
          };
        }
        if (v === 'height') {
          const al = R.pick([[1, 2], [1, 3], [2, 3], [3, 4], [3, 5], [4, 5], [1, 4], [2, 5]]);
          const a2 = (al[0] * al[0]) / (al[1] * al[1]);
          const h = a2 / (1 - a2);
          const fm = x => { const r = F.toRational(x, 500); return r ? mth(fracSym(x, 'R', '')) : null; };
          return {
            q: raw`A projectile is launched straight up from the surface of an airless planet of radius $R$ with a speed equal to $${F.frac(al[0], al[1])}$ of the escape speed. Ignoring the planet's rotation, how high above the surface does it rise?`, level: 3,
            ...mcNum(R, h, [a2, al[0] / al[1], 1 / (1 - a2), a2 / (1 + a2), 2 * a2, a2 / (1 - a2) / 2], fm),
            expl: raw`Energy conservation with $v^2 = ${F.frac(al[0] * al[0], al[1] * al[1])}\cdot\frac{2GM}{R}$: $\frac{1}{2}mv^2 - \frac{GMm}{R} = -\frac{GMm}{R + h}$ gives $R + h = \frac{R}{1 - ${F.frac(al[0] * al[0], al[1] * al[1])}}$, so $h = ${fracSym(h, 'R', '')}$. The uniform-$g$ estimate $h = v^2/2g = ${fracSym(a2, 'R', '')}$ underestimates it because gravity weakens with height.`,
          };
        }
        return {
          q: raw`A satellite is in a circular orbit close to a planet. By approximately what percentage must its speed be increased (by a short tangential burn) so that it just escapes the planet's gravity?`, level: 2,
          ...GRE.mc(R, '$41\\%$', ['$100\\%$', '$50\\%$', '$29\\%$', '$73\\%$', '$15\\%$']),
          expl: raw`At any radius $v_{\text{esc}} = \sqrt{2GM/r} = \sqrt{2}\,v_{\text{circ}}$, so the speed must increase by a factor $\sqrt{2} \approx 1.41$, i.e. by about $41\%$.`,
        };
      },
    },
    // ------------------------------------------------------------ 1.6.3 Kepler's laws
    {
      id: 'mech2.kep.third', sec: '1.6.3', level: 2, weight: 2,
      gen(R) {
        const v = R.weighted(['T', 'a', 'comet', 'mass'], [3, 2, 2, 2]);
        const pl = R.pick(['planet', 'asteroid', 'dwarf planet']);
        const unitT = x => mth(x + raw`\ \text{years}`);
        if (v === 'T') {
          const n = R.pick([4, 9, 16, 25, 100, 2, 3, 1 / 4, 1 / 9, 1 / 16, 1 / 100]);
          const ans = Math.pow(n, 1.5);
          return {
            q: raw`${/^[aeiou]/.test(pl) ? 'An' : 'A'} ${pl} orbits the Sun with a semimajor axis $${ex(n)}$ times that of Earth's orbit. What is its orbital period?`, level: 1,
            ...mcNum(R, ans, [n, n * n, Math.pow(n, 2 / 3), Math.sqrt(n), n * n * n, Math.pow(n, 0.75)], x => { const e = F.exact(x); return e == null ? null : unitT(e); }),
            expl: raw`Kepler's third law: $T^2 \propto a^3$, so $T = (${ex(n)})^{3/2}\ \text{yr} = ${ex(ans)}\ \text{yr}$ (the planet's mass is irrelevant).`,
          };
        }
        if (v === 'a') {
          const k = R.pick([8, 27, 64, 125, 1000, 1 / 8, 1 / 27, 2, 4]);
          const ans = Math.pow(k, 2 / 3);
          const moon = R.bool();
          return {
            q: moon ? raw`Two moons orbit the same planet on nearly circular orbits. The outer moon's orbital period is $${ex(k)}$ times that of the inner moon. What is the ratio of the outer moon's orbital radius to the inner moon's?`.replace('outer moon\'s orbital period is $' + ex(k) + '$ times', k > 1 ? 'outer moon\'s orbital period is $' + ex(k) + '$ times' : 'outer moon\'s orbital period is $' + ex(k) + '$ times')
              : raw`${/^[aeiou]/.test(pl) ? 'An' : 'A'} ${pl} has an orbital period of $${ex(k)}$ years. What is the semimajor axis of its orbit, in astronomical units (Earth's orbital radius = 1 AU)?`,
            ...mcNum(R, ans, [Math.pow(k, 1.5), k, Math.pow(k, 1 / 3), Math.sqrt(k), k * k], exM),
            expl: raw`$a \propto T^{2/3}$, so the ratio is $(${ex(k)})^{2/3} = ${ex(ans)}$.`,
            level: 1,
          };
        }
        if (v === 'comet') {
          const a = R.pick([4, 9, 16, 25, 36]);
          const rp = R.pick([0.5, 1, 1.5, 2]);
          const ra = 2 * a - rp;
          const T = Math.pow(a, 1.5);
          return {
            q: raw`A comet's closest approach to the Sun is $${F.num(rp, 2)}\,\text{AU}$ and its greatest distance from the Sun is $${F.num(ra, 3)}\,\text{AU}$. Its orbital period is closest to`,
            ...GRE.numeric(R, T, [Math.pow(ra, 1.5), Math.pow(2 * a, 1.5), a * a, a, Math.pow(a, 2 / 3)], { unit: raw`\text{yr}`, sig: 3, tol: 0.15 }),
            expl: raw`The period depends only on the semimajor axis $a = \frac{1}{2}(r_{\min} + r_{\max}) = ${a}\,\text{AU}$. With Earth as reference, $T = a^{3/2}\,\text{yr} = ${F.num(T, 3)}\,\text{yr}$. Using $r_{\max}$ (or $r_{\min} + r_{\max}$) instead of $a$ is the trap.`,
          };
        }
        const mu = R.pick([4, 9, 16, 1 / 4, 1 / 9, 2]);
        const sameA = R.bool();
        const ans = sameA ? 1 / Math.sqrt(mu) : Math.pow(mu, 1 / 3);
        return {
          q: sameA ? raw`A planet orbits a star of mass $${ex(mu)}\,M_{\odot}$ on a circular orbit of radius $1\,\text{AU}$. What is its orbital period? (Earth orbits the Sun, mass $M_{\odot}$, at $1\,\text{AU}$ in 1 year.)`
            : raw`A planet orbits a star of mass $${ex(mu)}\,M_{\odot}$ with an orbital period of exactly 1 year. What is its orbital radius in AU? (Earth orbits the Sun, mass $M_{\odot}$, at $1\,\text{AU}$ in 1 year.)`,
          ...mcNum(R, ans, sameA ? [Math.sqrt(mu), 1 / mu, mu, Math.pow(mu, -1.5), 1] : [Math.sqrt(mu), mu, 1 / Math.pow(mu, 1 / 3), Math.pow(mu, 2 / 3), 1], x => { const e = F.exact(x); return e == null ? null : mth(e + (sameA ? raw`\ \text{yr}` : raw`\ \text{AU}`)); }),
          expl: raw`Kepler's third law with the central mass: $T^2 = \frac{4\pi^2a^3}{GM}$. ${sameA ? raw`At fixed $a$, $T \propto M^{-1/2}$, giving $${ex(ans)}\ \text{yr}$: a heavier star means a shorter year.` : raw`At fixed $T$, $a \propto M^{1/3}$, giving $${ex(ans)}\ \text{AU}$.`}`,
        };
      },
    },
    {
      id: 'mech2.kep.second', sec: '1.6.3', level: 2,
      gen(R) {
        const v = R.weighted(['speed', 'omega', 'ecc', 'area', 'angle'], [3, 2, 2, 1, 1]);
        const s = R.pick([['comet', 'Sun'], ['satellite', 'Earth'], ['minor planet', 'Sun'], ['planet', 'star']]);
        if (v === 'speed') {
          const rp = R.pick([1, 2, 3, 4]) * R.pick([1, 10]), k = R.pick([2, 3, 4, 5, 6, 8, 10]);
          const ra = rp * k, vp = R.pick([12, 15, 20, 24, 30, 40, 50, 60]);
          const unit = s[1] === 'Earth' ? '10^3\\,\\text{km}' : '10^{6}\\,\\text{km}';
          return {
            q: raw`A ${s[0]} orbits the ${s[1]} on an elliptical path. At its closest approach it is $${rp}\times ${unit}$ from the ${s[1]}'s center and moves at $${vp}\,\text{km/s}$; at its farthest point it is $${ra}\times ${unit}$ away. What is its speed at the farthest point?`,
            ...GRE.numeric(R, vp / k, [vp / (k * k), vp / Math.sqrt(k), vp, vp * k], { unit: raw`\text{km/s}`, sig: 2 }),
            expl: raw`Angular momentum is conserved and at the apsides $\vec{v} \perp \vec{r}$, so $v_ar_a = v_pr_p$ and $v_a = ${vp}\times\frac{${rp}}{${ra}} = ${F.num(vp / k, 2)}\,\text{km/s}$ (Kepler's second law).`,
          };
        }
        if (v === 'omega') {
          const k = R.pick([2, 3, 4, 5, 3 / 2, 5 / 2]);
          return {
            q: raw`A ${s[0]}'s greatest distance from the ${s[1]} is $${ex(k)}$ times its least distance. What is the ratio of its angular speed about the ${s[1]} at closest approach to that at its farthest point?`,
            ...mcNum(R, k * k, [k, Math.sqrt(k), k * k * k, Math.pow(k, 1.5), 1 / k], exM),
            expl: raw`Equal areas in equal times: $\frac{1}{2}r^2\dot{\phi}$ is constant, so $\dot{\phi} \propto 1/r^2$ and the ratio is $(${ex(k)})^2 = ${ex(k * k)}$. The linear speed ratio would be only $${ex(k)}$.`,
          };
        }
        if (v === 'ecc') {
          const e = R.pick([[1, 3], [1, 2], [1, 5], [3, 5], [1, 4], [2, 3], [1, 9], [3, 7]]);
          const ee = e[0] / e[1], ans = (1 + ee) / (1 - ee);
          return {
            q: raw`A ${s[0]} moves on an elliptical orbit of eccentricity $${F.frac(e[0], e[1])}$ about the ${s[1]}. What is the ratio of its maximum orbital speed to its minimum orbital speed?`, level: 2,
            ...mcNum(R, ans, [ans * ans, Math.sqrt(ans), 1 + ee, 1 / (1 - ee), (1 + ee) / (1 - ee) / 2, 1 / ee], exM),
            expl: raw`$r_{\min} = a(1 - e)$, $r_{\max} = a(1 + e)$, and $v_{\max}r_{\min} = v_{\min}r_{\max}$, so $\frac{v_{\max}}{v_{\min}} = \frac{1 + e}{1 - e} = ${ex(ans)}$.`,
          };
        }
        if (v === 'area') {
          const f = R.pick([[1, 6], [1, 8], [1, 3], [1, 5], [3, 10], [1, 12], [2, 9]]);
          const T = s[1] === 'Earth' ? R.pick([[24, 'hours'], [12, 'hours'], [90, 'minutes'], [30, 'days']]) : R.pick([[12, 'years'], [76, 'years'], [6, 'years'], [30, 'years'], [84, 'years']]);
          const t = T[0] * f[0] / f[1];
          return {
            q: raw`A ${s[0]} has an orbital period of ${T[0]} ${T[1]}. While it travels from point P to point Q of its orbit, the line from the ${s[1]} to the ${s[0]} sweeps out $${F.frac(f[0], f[1])}$ of the total area of the ellipse. How long does that part of the trip take?`, level: 1,
            ...GRE.numeric(R, t, [t * 2, t / 2, T[0] * Math.sqrt(f[0] / f[1]), T[0] * Math.pow(f[0] / f[1], 1.5)], { unit: raw`\text{${T[1]}}`, sig: 2, fmt: x => F.num(x, 3) }),
            expl: raw`Kepler's second law: the areal velocity is constant, so the time is the same fraction of the period as the area: $${F.frac(f[0], f[1])}\times ${T[0]} = ${F.num(t, 3)}$ ${T[1]}, regardless of where on the orbit P and Q are.`,
          };
        }
        const ang = R.pick([[30, 1 / 2], [150, 1 / 2], [60, Math.sqrt(3) / 2], [45, Math.SQRT1_2]]);
        const r1 = R.pick([2, 3, 4, 6]), v1 = R.pick([10, 20, 30, 40]), rp = 1;
        const vp = r1 * v1 * ang[1] / rp;
        return {
          q: raw`At one instant a ${s[0]} is at distance $${r1}d$ from the ${s[1]} and moves at $${v1}\,\text{km/s}$, its velocity making an angle of $${ang[0]}^\circ$ with the line from the ${s[1]} to the ${s[0]}. At its closest approach it is at distance $d$. What is its speed there?`, level: 3,
          ...GRE.numeric(R, vp, [r1 * v1, v1 / r1, r1 * v1 * Math.sqrt(1 - ang[1] * ang[1]), r1 * r1 * v1 * ang[1]], { unit: raw`\text{km/s}`, sig: 2 }),
          expl: raw`Conserve $L = mrv\sin\psi$ ($\psi$ the angle between $\vec{r}$ and $\vec{v}$); at closest approach $\psi = 90^\circ$: $v_p = \frac{${r1}d\times ${v1}\,\text{km/s}\times\sin ${ang[0]}^\circ}{d} \approx ${F.num(vp, 2)}\,\text{km/s}$. Forgetting the $\sin\psi$ is the trap.`,
        };
      },
    },
    {
      id: 'mech2.kep.mass', sec: '1.6.3', level: 2,
      gen(R) {
        const G = GRE.C.G;
        const v = R.weighted(['mass', 'skim', 'ratio'], [3, 2, 1]);
        if (v === 'mass') {
          const r = R.pick([1, 1.5, 2, 3, 4, 5, 6, 8]) * Math.pow(10, R.int(7, 11));
          const T = R.pick([1, 2, 3, 4, 5, 6, 8]) * Math.pow(10, R.int(4, 7));
          const M = 4 * Math.PI * Math.PI * r * r * r / (G * T * T);
          if (M < 1e21 || M > 5e31) throw new Error('unphysical');
          const what = R.pick(['moon', 'satellite', 'small body']);
          return {
            q: raw`A ${what} moves on a circular orbit of radius $${F.sci(r, 2)}\,\text{m}$ about a much more massive body with a period of $${F.sci(T, 1)}\,\text{s}$. The mass of the central body is closest to ($G = 6.7\times 10^{-11}\,\text{N m}^2/\text{kg}^2$)`,
            ...GRE.numeric(R, M, [M / (4 * Math.PI * Math.PI), M / (2 * Math.PI), M * T / r, M / r * 1, M * 2], { unit: raw`\text{kg}`, sig: 1, fmt: x => F.sci(x, 1), tol: 0.4 }),
            expl: raw`Gravity provides the centripetal force: $\frac{GMm}{r^2} = m\left(\frac{2\pi}{T}\right)^2r$, so $M = \frac{4\pi^2r^3}{GT^2} \approx ${F.sci(M, 2)}\,\text{kg}$ (use $4\pi^2 \approx 40$). The orbiting body's mass cancels.`,
          };
        }
        if (v === 'skim') {
          const rho = R.pick([1000, 1500, 2000, 3000, 3900, 5500, 8000]);
          const T = Math.sqrt(3 * Math.PI / (G * rho)) / 60;
          return {
            q: raw`A satellite orbits just above the surface of a spherical, airless planet of uniform density $${F.num(rho, 2)}\,\text{kg/m}^3$. Its orbital period is closest to`,
            ...GRE.numeric(R, T, [T / Math.sqrt(3), T * Math.sqrt(3), T / Math.sqrt(Math.PI), T * 2 * Math.PI / Math.sqrt(3 * Math.PI), T / 2], { unit: raw`\text{min}`, sig: 2, tol: 0.15 }),
            expl: raw`With $M = \frac{4}{3}\pi R^3\rho$, Kepler's law $T^2 = \frac{4\pi^2R^3}{GM}$ gives $T = \sqrt{\frac{3\pi}{G\rho}} \approx ${F.num(T * 60, 2)}\,\text{s} \approx ${F.num(T, 2)}\,\text{min}$, independent of the planet's radius. (For Earth's density this is the familiar $\approx 85$-minute low orbit.)`,
          };
        }
        const k = R.pick([2, 3, 4, 1 / 2]), dens = R.pick([1, 4, 9, 1 / 4]);
        const ans = 1 / Math.sqrt(dens);
        return {
          q: raw`Planet B has ${k === 1 ? 'the same radius as' : `$${ex(k)}$ times the radius of`} planet A and ${dens === 1 ? 'the same average density' : `$${ex(dens)}$ times its average density`}. What is the ratio $T_B/T_A$ of the periods of satellites in circular orbits just above the two planets' surfaces?`, level: 3,
          ...mcNum(R, ans, [k, Math.pow(k, 1.5), k / Math.sqrt(dens), Math.sqrt(dens), 1 / dens, Math.pow(k, 1.5) / Math.sqrt(dens)].filter(x => Math.abs(x - ans) > 1e-9), exM),
          expl: raw`For a surface-skimming orbit $T = \sqrt{3\pi/(G\rho)}$ — the radius cancels — so $T_B/T_A = \sqrt{\rho_A/\rho_B} = ${ex(ans)}$.`,
        };
      },
    },
    {
      id: 'mech2.kep.roman', sec: '1.6.3', level: 2,
      gen(R) {
        const TRUE = [
          ['A planet moves fastest at perihelion.', 'angular momentum conservation, $v \\propto 1/r$ at the apsides'],
          ['The law of equal areas in equal times holds for any central force, not only for gravity.', 'it is angular-momentum conservation'],
          ['For planets of negligible mass orbiting the same star, $T^2/a^3$ has the same value.', 'Kepler III with $T^2 = 4\\pi^2a^3/GM$'],
          ['Two orbits about the same star with equal semimajor axes have equal periods, whatever their eccentricities.', 'the period depends only on $a$'],
          ['The total energy of a Kepler orbit depends only on its semimajor axis.', '$E = -GMm/2a$'],
          ['Kepler\'s second law follows from conservation of angular momentum.', '$dA/dt = L/2m$'],
          ['For a planet whose mass is not negligible, the constant in $T^2 = ka^3$ depends on the planet\'s mass.', '$k = 4\\pi^2/G(M + m)$'],
        ];
        const FALSE = [
          ['A planet moves fastest at aphelion.', 'it moves slowest there'],
          ['The law of equal areas holds only for an inverse-square force.', 'any central force conserves $L$'],
          ['$T^2/a^3$ is the same for planets orbiting different stars.', 'the constant depends on the star\'s mass'],
          ['At fixed semimajor axis, a more eccentric orbit has a longer period.', 'the period depends only on $a$'],
          ['A planet\'s orbital speed is constant along its elliptical orbit.', 'it varies as required by equal areas'],
          ['The planet\'s angular velocity about the star is constant along the orbit.', '$\\dot{\\phi} \\propto 1/r^2$'],
          ['Doubling a planet\'s mass (keeping it much lighter than the star) halves its period at fixed $a$.', 'the period is essentially independent of the planet\'s mass'],
        ];
        const nT = R.int(1, 3);
        const pool = R.pickN(TRUE, nT).map(x => [x[0], 1, x[1]]).concat(R.pickN(FALSE, 3 - nT).map(x => [x[0], 0, x[1]]));
        return romanQ(R, 'Which of the following statements about planetary orbits is (are) correct?', R.shuffle(pool), 'Kepler I–III: elliptical orbits, equal areas in equal times (angular-momentum conservation), $T^2 \\propto a^3$.');
      },
    },
    // ------------------------------------------------------------ 1.7.1 Normal modes
    {
      id: 'mech2.nm.coupled', sec: '1.7.1', level: 2, weight: 2,
      gen(R) {
        const v = R.weighted(['walls', 'pend', 'pendnum', 'chain'], [4, 2, 2, 2]);
        const m = R.pick(['m', 'M']);
        const W = c => mth(raw`\omega = ${sqrtR(c, 'k', m)}`);
        if (v === 'walls') {
          const c = R.pick([1 / 4, 1 / 2, 1, 1, 3 / 2, 2, 3, 4]);
          const kind = R.pick(['hi', 'hi', 'lo', 'ratio']);
          const cT = raw`${F.coef(...F.toRational(c, 10))}k`;
          const stem = raw`Two blocks, each of mass $${m}$, slide on a frictionless horizontal surface between two fixed walls. Each block is attached to its nearest wall by a spring of constant $k$, and the blocks are connected to each other by a spring of constant $${cT}$; the motion is along the line of the springs.`;
          const why = raw`In the symmetric mode the blocks move together, the middle spring is never stretched, and $\omega_1 = \sqrt{k/${m}}$. In the antisymmetric mode the middle spring's midpoint stays fixed, so each block feels $k + 2(${cT})$: $\omega_2 = ${sqrtR(1 + 2 * c, 'k', m)}$.`;
          if (kind === 'hi') return { q: stem + ' What is the angular frequency of the normal mode in which the blocks move in opposite directions?', ...mcNum(R, 1 + 2 * c, [1 + c, 2 * c, 2 + c, (1 + 2 * c) / 2, 1, 3, 1 + 4 * c], W), expl: why };
          if (kind === 'lo') return { q: stem + ' What is the angular frequency of the normal mode in which the blocks move in the same direction with equal amplitudes?', level: 1, ...mcNum(R, 1, [2, 1 / 2, 1 + c, 1 + 2 * c, c, 2 + 2 * c], W), expl: why };
          return { q: stem + ' What is the ratio of the higher normal-mode frequency to the lower one?', ...mcNum(R, Math.sqrt(1 + 2 * c), [Math.sqrt(1 + c), 1 + 2 * c, Math.sqrt(2 * c), 1 + c, Math.sqrt(2 + c), Math.sqrt(1 + 4 * c)], exM), expl: why + raw` The ratio is $\sqrt{1 + 2(${F.fracI(...F.toRational(c, 10))})} = ${ex(Math.sqrt(1 + 2 * c))}$.` };
        }
        if (v === 'pend') {
          const l = R.pick([ELL, 'L']), sp = R.pick([raw`\kappa `, "k'"]);
          const stem = raw`Two identical simple pendulums (length $${l}$, bob mass $${m}$) hang side by side, and their bobs are connected by a light horizontal spring of constant $${sp}$ that is relaxed when both hang vertically. For small oscillations in the plane of the pendulums,`;
          const hi = R.bool(0.65);
          const C = hi ? raw`\sqrt{\frac{g}{${l}} + \frac{2${sp}}{${m}}}` : raw`\sqrt{\frac{g}{${l}}}`;
          const Wl = [raw`\sqrt{\frac{g}{${l}} + \frac{${sp}}{${m}}}`, raw`\sqrt{\frac{g}{${l}} + \frac{2${sp}}{${m}}}`, raw`\sqrt{\frac{g}{${l}}}`, raw`\sqrt{\frac{2${sp}}{${m}}}`, raw`\sqrt{\frac{g}{${l}} - \frac{2${sp}}{${m}}}`, raw`\sqrt{\frac{g}{${l}} + \frac{${sp}}{2${m}}}`, raw`\sqrt{\frac{2g}{${l}}}`];
          return {
            q: stem + (hi ? ' what is the angular frequency of the normal mode in which the bobs swing in opposite directions?' : ' what is the angular frequency of the normal mode in which the bobs swing together in the same direction?'),
            ...GRE.mc(R, mth(C), Wl.map(mth)), level: hi ? 2 : 1,
            expl: raw`In-phase mode: the spring keeps its length, so $\omega_1 = \sqrt{g/${l}}$. Opposite-phase mode: each bob is displaced $x$ and the spring stretches by $2x$, adding a restoring force $2${sp}x$, so $\omega_2 = \sqrt{g/${l} + 2${sp}/${m}}$. The symmetric mode has the lower frequency.`,
          };
        }
        if (v === 'pendnum') {
          const A = R.pick([4, 16, 25, 100]);
          const BB = { 4: [5, 12, 21, 32], 16: [9, 20, 33], 25: [11, 24, 39], 100: [21, 44] }[A];
          const B = R.pick(BB), mass = R.pick([0.2, 0.5, 1, 2]);
          const len = 10 / A, kap = B * mass / 2, w = Math.sqrt(A + B);
          return {
            q: raw`Two identical pendulums of length $${F.num(len, 3)}\,\text{m}$ with bobs of mass $${F.num(mass, 2)}\,\text{kg}$ are coupled by a light spring of constant $${F.num(kap, 3)}\,\text{N/m}$ attached between the bobs. Take $g = 10\,\text{m/s}^2$. The angular frequency of the normal mode in which the bobs move in opposite directions is closest to`,
            ...GRE.numeric(R, w, [Math.sqrt(A + B / 2), Math.sqrt(A), Math.sqrt(B), Math.sqrt(A + 2 * B), Math.sqrt(B / 2)], { unit: raw`\text{rad/s}`, sig: 2, tol: 0.08 }),
            expl: raw`$\omega_2^2 = \frac{g}{L} + \frac{2\kappa}{m} = ${A} + ${B} = ${A + B}\ \text{s}^{-2}$, so $\omega_2 = ${F.num(w, 2)}\,\text{rad/s}$. (The in-phase mode has $\omega_1 = \sqrt{g/L} = ${F.num(Math.sqrt(A), 2)}\,\text{rad/s}$.)`,
          };
        }
        const [a, b] = R.pick([[1, 1], [1, 1], [2, 1], [1, 2], [3, 1], [4, 1], [2, 3], [3, 2]]);
        const pm = (S, D, half) => {
          const [o, i] = F.surdParts(D);
          if (i === 1) {
            const l1 = (S - o) / (half ? 2 : 1), l2 = (S + o) / (half ? 2 : 1);
            if (l1 <= 0) return null;
            const fc = x => { const r = F.toRational(x, 10); return F.coef(r[0], r[1]); };
            return raw`\omega^2 = ${fc(l1)}\frac{k}{${m}}\ \text{and}\ ${fc(l2)}\frac{k}{${m}}`;
          }
          const sq = (o === 1 ? '' : o) + raw`\sqrt{${i}}`;
          if (!half) return raw`\omega^2 = \left(${S} \pm ${sq}\right)\frac{k}{${m}}`;
          if (S % 2 === 0 && o % 2 === 0) return raw`\omega^2 = \left(${S / 2} \pm ${o / 2 === 1 ? '' : o / 2}\sqrt{${i}}\right)\frac{k}{${m}}`;
          return raw`\omega^2 = \frac{${S} \pm ${sq}}{2}\,\frac{k}{${m}}`;
        };
        const S = a + 2 * b, D = a * a + 4 * b * b;
        const C = pm(S, D, true);
        const Wl = [pm(a + 2 * b, 4 * b * b, true), pm(S, D, false), pm(S, S * S + 4 * a * b, true), pm(a + b, a * a, true), pm(a + b, (a - b) * (a - b) + 4 * b * b, true), pm(S, D + 4, true)].filter(Boolean);
        const kT = x => (x === 1 ? 'k' : x + 'k');
        return {
          q: raw`A block of mass $${m}$ is attached to a wall by a spring of constant $${kT(a)}$, and a second block of mass $${m}$ is attached to the first by a spring of constant $${kT(b)}$; the second block's other side is free. The blocks slide without friction along the line of the springs. What are the squared angular frequencies of the normal modes?`, level: 3,
          ...GRE.mc(R, mth(C), Wl.map(mth)),
          expl: raw`Equations of motion: $${m}\ddot{x}_1 = -${kT(a + b)}x_1 + ${kT(b)}x_2$, $${m}\ddot{x}_2 = ${kT(b)}x_1 - ${kT(b)}x_2$. The secular equation $(${a + b} - \lambda)(${b} - \lambda) - ${b * b} = 0$ with $\lambda = ${m}\omega^2/k$ gives $\lambda^2 - ${S}\lambda + ${a * b} = 0$, so $\lambda = \frac{${S} \pm \sqrt{${D}}}{2}$.`,
        };
      },
    },
    {
      id: 'mech2.nm.diatomic', sec: '1.7.1', level: 2,
      gen(R) {
        const v = R.weighted(['sym', 'pair', 'iso'], [2, 1, 3]);
        const m = R.pick(['m', 'M']);
        if (v === 'sym' || v === 'pair') {
          const n = R.pick([1, 2, 3, 4, 5, 9]);
          const c = (1 + n) / n;
          const mt = raw`${n === 1 ? '' : n}${m}`;
          const stem = raw`Two blocks of masses $${m}$ and $${mt}$ rest on a frictionless horizontal surface, connected by a spring of constant $k$; nothing else is attached to them. Considering motion along the spring,`;
          const why = raw`With no walls the center of mass moves freely ($\omega = 0$ mode). The relative coordinate oscillates with the reduced mass $\mu = \frac{${m}\cdot ${mt}}{${m} + ${mt}} = ${fracSym(n / (1 + n), m, '')}$, so $\omega = \sqrt{k/\mu} = ${sqrtR(c, 'k', m)}$.`;
          if (v === 'sym') {
            return { q: stem + ' what is the angular frequency of the oscillating normal mode?', ...mcNum(R, c, [1, 1 / (1 + n), n / (1 + n), 1 + n, 1 / n, 2 * c, 2].filter(x => Math.abs(x - c) > 1e-9), x => mth(raw`\omega = ${sqrtR(x, 'k', m)}`)), expl: why };
          }
          const P = x => mth(raw`\omega = 0\ \text{and}\ ${sqrtR(x, 'k', m)}`);
          const Wl = [P(1 / (1 + n)), P(1), mth(raw`\omega = ${sqrtR(1, 'k', m)}\ \text{and}\ ${sqrtR(c, 'k', m)}`), P(n / (1 + n)), P(1 + n), mth(raw`\omega = ${sqrtR(1, 'k', m)}\ \text{and}\ ${sqrtR(1 / n, 'k', m)}`)];
          return { q: stem + ' what are the normal-mode angular frequencies?', ...GRE.mc(R, P(c), Wl), expl: why, level: 2 };
        }
        const MOL = [
          [raw`^{1}\text{H}^{35}\text{Cl}`, 1, 35, raw`^{2}\text{H}^{35}\text{Cl}`, 2, 35, 2990],
          [raw`\text{H}_2`, 1, 1, raw`\text{D}_2`, 2, 2, 4400],
          [raw`\text{H}_2`, 1, 1, raw`\text{HD}`, 1, 2, 4400],
          [raw`^{1}\text{H}^{79}\text{Br}`, 1, 79, raw`^{2}\text{H}^{79}\text{Br}`, 2, 79, 2650],
          [raw`^{1}\text{H}^{19}\text{F}`, 1, 19, raw`^{2}\text{H}^{19}\text{F}`, 2, 19, 4140],
          [raw`^{16}\text{O}^{1}\text{H}`, 16, 1, raw`^{16}\text{O}^{2}\text{H}`, 16, 2, 3740],
          [raw`^{1}\text{H}^{127}\text{I}`, 1, 127, raw`^{2}\text{H}^{127}\text{I}`, 2, 127, 2310],
        ];
        const M = R.pick(MOL);
        const rev = R.bool(0.35);
        const A = rev ? [M[3], M[4], M[5]] : [M[0], M[1], M[2]], B = rev ? [M[0], M[1], M[2]] : [M[3], M[4], M[5]];
        const mu = (x, y) => x * y / (x + y);
        const ratio = Math.sqrt(mu(A[1], A[2]) / mu(B[1], B[2]));
        const w0 = rev ? Math.round(M[6] / Math.sqrt(mu(1, 1) / 1) * 0 + M[6] * Math.sqrt(mu(M[1], M[2]) / mu(M[4], M[5]))) : M[6];
        const base = rev ? Math.round(w0 / 10) * 10 : w0;
        const ans = base * ratio;
        const naive = Math.sqrt((A[1] + A[2] - Math.min(A[1], A[2])) / (B[1] + B[2] - Math.min(B[1], B[2])));
        return {
          q: raw`The vibrational frequency of the $${A[0]}$ molecule corresponds to a wavenumber of about $${base}\,\text{cm}^{-1}$. Treating the molecule as two point masses joined by a spring whose constant is unchanged by isotopic substitution, the corresponding wavenumber of $${B[0]}$ is closest to`, level: 2,
          ...GRE.numeric(R, ans, [base * ratio * ratio, base / ratio, base * naive, base * Math.sqrt(A[1] * A[2] / (B[1] * B[2])), base], { unit: raw`\text{cm}^{-1}`, sig: 3, tol: 0.05 }),
          expl: raw`$\omega = \sqrt{k/\mu}$ with $\mu = \frac{m_1m_2}{m_1 + m_2}$: $\mu = ${F.num(mu(A[1], A[2]), 3)}\,\text{u}$ before and $${F.num(mu(B[1], B[2]), 3)}\,\text{u}$ after, so the frequency scales by $\sqrt{${F.num(mu(A[1], A[2]), 3)}/${F.num(mu(B[1], B[2]), 3)}} \approx ${F.num(ratio, 3)}$, giving $\approx ${F.num(ans, 3)}\,\text{cm}^{-1}$. The spring constant (set by the electrons) is the same for both isotopes.`,
        };
      },
    },
    {
      id: 'mech2.nm.triatomic', sec: '1.7.1', level: 2,
      gen(R) {
        const v = R.weighted(['sym', 'asym', 'ratio', 'desc'], [2, 2, 2, 2]);
        const stem = raw`A linear triatomic molecule is modeled as a central mass $M$ joined to two outer masses $m$ by identical springs of constant $k$, with motion only along the molecular axis.`;
        const modes = raw`The modes are: uniform translation ($\omega = 0$); the symmetric stretch with $M$ at rest and the outer masses moving oppositely ($\omega = \sqrt{k/m}$); and the asymmetric stretch with the outer masses moving together and $M$ moving the other way ($\omega = \sqrt{k/m + 2k/M}$).`;
        if (v === 'sym') {
          return { q: stem + ' What is the angular frequency of the mode in which the central mass stays at rest?', level: 2, ...GRE.mc(R, mth(raw`\sqrt{\frac{k}{m}}`), [raw`\sqrt{\frac{k}{M}}`, raw`\sqrt{\frac{2k}{m}}`, raw`\sqrt{\frac{k}{m} + \frac{2k}{M}}`, raw`\sqrt{\frac{k(m + M)}{mM}}`, raw`\sqrt{\frac{k}{2m}}`].map(mth)), expl: modes + ' With $M$ fixed, each outer mass is simply a mass on one spring.' };
        }
        if (v === 'asym') {
          return { q: stem + ' What is the highest normal-mode angular frequency?', level: 3, ...GRE.mc(R, mth(raw`\sqrt{\frac{k}{m} + \frac{2k}{M}}`), [raw`\sqrt{\frac{k}{m} + \frac{k}{M}}`, raw`\sqrt{\frac{2k}{m} + \frac{k}{M}}`, raw`\sqrt{\frac{k}{m}}`, raw`\sqrt{\frac{2k}{M}}`, raw`\sqrt{\frac{3k}{m}}`].map(mth)), expl: modes + ' Momentum conservation fixes $M x_M = -2m x_m$ in the asymmetric mode, and each spring stretches by $x_m - x_M$.' };
        }
        if (v === 'ratio') {
          const P = R.pick([[16, 12, raw`\text{CO}_2`], [1, 1, ''], [1, 2, ''], [2, 1, ''], [3, 4, ''], [1, 4, ''], [32, 12, raw`\text{CS}_2`]]);
          const r = P[0] / P[1];       // m / M
          const ans = Math.sqrt(1 + 2 * r);
          const desc = P[2] ? raw`For $${P[2]}$ take the outer (O or S) atoms as $m = ${P[0]}$ u and the central carbon as $M = ${P[1]}$ u.` : raw`Take $M = ${fracSym(1 / r, 'm', '')}$.`;
          return {
            q: stem + ' ' + desc + ' What is the ratio of the asymmetric-stretch frequency to the symmetric-stretch frequency?', level: 3,
            ...mcNum(R, ans, [Math.sqrt(1 + r), Math.sqrt(2 + r), 1 + 2 * r, Math.sqrt(1 + 1 / r), Math.sqrt(2 * r), Math.sqrt(1 + 2 / r)], exM),
            expl: modes + raw` The ratio is $\sqrt{1 + 2m/M} = \sqrt{1 + 2(${F.fracI(...F.toRational(r, 10))})} = ${ex(ans)}${P[2] ? raw` \approx ${F.num(ans, 3)}` : ''}$.`,
          };
        }
        const D = {
          zero: 'all three masses move together with equal displacements',
          sym: 'the central mass stays at rest while the outer masses move in opposite directions',
          asym: 'the outer masses move in the same direction while the central mass moves opposite to them',
          x1: 'the outer masses stay at rest while the central mass oscillates',
          x2: 'one outer mass stays at rest while the other two masses move in opposite directions',
        };
        const pick = R.pick([['zero', raw`zero frequency`], ['sym', raw`angular frequency $\sqrt{k/m}$`], ['asym', 'the highest frequency']]);
        return {
          q: stem + ` Which of the following describes the normal mode with ${pick[1]}?`, level: 2,
          ...GRE.mc(R, D[pick[0]], Object.keys(D).filter(k => k !== pick[0]).map(k => D[k])),
          expl: modes + ' Configurations with an outer mass (or the outer pair) held fixed are not normal modes, since momentum would not be conserved.',
        };
      },
    },
    {
      id: 'mech2.nm.matrix', sec: '1.7.1', level: 3,
      gen(R) {
        const asym = NM_MATS.filter(x => x[0] !== x[2]);
        const [a, b, c, l1, l2] = R.pick(R.bool(0.6) && asym.length ? asym : NM_MATS);
        const m = R.pick(['m', 'M']);
        const swap = R.bool();
        const A = swap ? c : a, C2 = swap ? a : c;
        const co = x => F.coef(x, 1);
        const stem = raw`Two coupled oscillators with coordinates $x_1$ and $x_2$ obey $${m}\ddot{x}_1 = -${co(A)}kx_1 + ${co(b)}kx_2$ and $${m}\ddot{x}_2 = ${co(b)}kx_1 - ${co(C2)}kx_2$.`;
        const why = raw`Try $x_j = a_je^{i\omega t}$: $\det\begin{pmatrix} ${A} - \lambda & -${b} \\ -${b} & ${C2} - \lambda \end{pmatrix} = 0$ with $\lambda = ${m}\omega^2/k$, i.e. $\lambda^2 - ${A + C2}\lambda + ${A * C2 - b * b} = 0$, so $\lambda = ${l1}$ or $${l2}$.`;
        const kind = R.pick(['hi', 'lo', 'ratio']);
        if (kind !== 'ratio') {
          const L = kind === 'hi' ? l2 : l1, O = kind === 'hi' ? l1 : l2;
          const fm = x => mth(raw`\omega = ${sqrtR(x, 'k', m)}`);
          return {
            q: stem + ` What is the ${kind === 'hi' ? 'higher' : 'lower'} normal-mode angular frequency?`,
            ...mcNum(R, L, [O, A, C2, A + b, Math.abs(A - b), A + C2, b, (l1 + l2) / 2].filter(x => x > 0), fm),
            expl: why + raw` The ${kind === 'hi' ? 'higher' : 'lower'} frequency is $\sqrt{${L}k/${m}}$.`,
          };
        }
        const lo = R.bool();
        const L = lo ? l1 : l2, O = lo ? l2 : l1;
        const r = (A - L) / b, ro = (A - O) / b;
        const fm = x => { const e = F.exact(x); return e == null ? null : mth('x_2/x_1 = ' + e); };
        return {
          q: stem + ` In the normal mode with the ${lo ? 'lower' : 'higher'} frequency, what is the amplitude ratio $x_2/x_1$?`,
          ...mcNum(R, r, [-r, 1 / r, ro, 2 * r, r / 2, b / A, -b / A, 0].filter(x => isFinite(x)), fm, { allowSign: true }),
          expl: why + raw` The first equation gives $(${A} - \lambda)x_1 = ${co(b)}x_2$, so with $\lambda = ${L}$: $x_2/x_1 = ${F.exact(r)}$. ${r > 0 ? 'The masses move in phase in the slower mode.' : 'The masses move out of phase in the faster mode.'}`,
        };
      },
    },
    // ------------------------------------------------------------ 1.7.2 Damping, driving, resonance
    {
      id: 'mech2.damp.regime', sec: '1.7.2', level: 1,
      gen(R) {
        const v = R.weighted(['class', 'bcrit', 'kcrit', 'sym'], [4, 2, 2, 1]);
        const m = R.pick([0.5, 1, 2, 4]), w0 = R.pick([2, 3, 4, 5, 6, 10]);
        const k = m * w0 * w0, bc = 2 * m * w0;
        const obj = R.pick(['A block', 'A cart', 'A mass']);
        if (v === 'class') {
          const r = R.pick([1 / 4, 1 / 2, 3 / 4, 1, 1, 3 / 2, 2, 3]);
          const b = bc * r;
          const SH = {
            u: 'underdamped: it oscillates with an exponentially decaying amplitude',
            c: 'critically damped: it returns to equilibrium without oscillating, as quickly as possible',
            o: 'overdamped: it returns to equilibrium without oscillating, but more slowly than with critical damping',
            s: 'undamped: it oscillates forever with constant amplitude',
            g: 'unstable: its oscillation amplitude grows exponentially',
          };
          const a = r < 1 ? 'u' : r === 1 ? 'c' : 'o';
          return {
            q: raw`${obj} of mass $${F.num(m, 2)}\,\text{kg}$ on a spring of constant $${F.num(k, 3)}\,\text{N/m}$ moves through a viscous fluid that exerts a drag force $-b\dot{x}$ with $b = ${F.num(b, 3)}\,\text{kg/s}$. When displaced and released, its motion is`,
            ...GRE.mc(R, SH[a], Object.keys(SH).filter(x => x !== a).map(x => SH[x])),
            expl: raw`Compare $\beta = b/2m = ${F.num(b / (2 * m), 3)}\,\text{s}^{-1}$ with $\omega_0 = \sqrt{k/m} = ${w0}\,\text{s}^{-1}$ (equivalently $b$ with $2\sqrt{mk} = ${F.num(bc, 3)}\,\text{kg/s}$): ${a === 'u' ? '$\\beta \\lt \\omega_0$, underdamped.' : a === 'c' ? '$\\beta = \\omega_0$, critically damped.' : '$\\beta > \\omega_0$, overdamped.'}`,
          };
        }
        if (v === 'bcrit') {
          return {
            q: raw`${obj} of mass $${F.num(m, 2)}\,\text{kg}$ hangs from a spring of constant $${F.num(k, 3)}\,\text{N/m}$ and is subject to a damping force $-bv$. For what value of $b$ is the motion critically damped?`,
            ...GRE.numeric(R, bc, [bc / 2, 2 * bc, 2 * w0, w0, m * w0 / 2], { unit: raw`\text{kg/s}`, sig: 3 }),
            expl: raw`Critical damping: $\beta = b/2m = \omega_0$, i.e. $b = 2\sqrt{mk} = 2\sqrt{${F.num(m, 2)}\times ${F.num(k, 3)}} = ${F.num(bc, 3)}\,\text{kg/s}$.`,
          };
        }
        if (v === 'kcrit') {
          const b = bc;
          return {
            q: raw`A shock absorber exerts a damping force $-bv$ with $b = ${F.num(b, 3)}\,\text{kg/s}$ on a mass of $${F.num(m, 2)}\,\text{kg}$. What spring constant makes the mass–spring system critically damped?`,
            ...GRE.numeric(R, k, [2 * k, 4 * k, k / 2, b / (2 * m), b * b / m / 8], { unit: raw`\text{N/m}`, sig: 3 }),
            expl: raw`Critical damping requires $b^2 = 4mk$, so $k = \frac{b^2}{4m} = \frac{(${F.num(b, 3)})^2}{4\times ${F.num(m, 2)}} = ${F.num(k, 3)}\,\text{N/m}$.`,
          };
        }
        const form = R.pick([['b', raw`m\ddot{x} + b\dot{x} + kx = 0`, raw`b = 2\sqrt{mk}`, [raw`b = \sqrt{mk}`, raw`b = 4\sqrt{mk}`, raw`b = 2\sqrt{k/m}`, raw`b = 2mk`, raw`b = \frac{1}{2}\sqrt{mk}`]],
          ['beta', raw`\ddot{x} + 2\beta\dot{x} + \omega_0^2x = 0`, raw`\beta = \omega_0`, [raw`\beta = 2\omega_0`, raw`\beta = \omega_0/2`, raw`\beta = \omega_0^2`, raw`\beta = \sqrt{2}\,\omega_0`, raw`\beta = 0`]],
          ['RLC', raw`L\ddot{q} + R\dot{q} + q/C = 0`, raw`R = 2\sqrt{L/C}`, [raw`R = \sqrt{L/C}`, raw`R = 2\sqrt{LC}`, raw`R = \frac{1}{2}\sqrt{L/C}`, raw`R = 2\sqrt{C/L}`, raw`R = \frac{1}{\sqrt{LC}}`]]]);
        return {
          q: raw`The equation $${form[1]}$ (all constants positive) describes a damped oscillator. Which condition makes it critically damped?`, level: 1,
          ...GRE.mc(R, mth(form[2]), form[3].map(mth)),
          expl: raw`The characteristic equation $r^2 + 2\beta r + \omega_0^2 = 0$ has a double root when $\beta = \omega_0$; with $\beta = b/2m$ and $\omega_0^2 = k/m$ that is $b = 2\sqrt{mk}$ (for the circuit, $\beta = R/2L$ and $\omega_0^2 = 1/LC$ give $R = 2\sqrt{L/C}$).`,
        };
      },
    },
    {
      id: 'mech2.damp.decay', sec: '1.7.2', level: 2,
      gen(R) {
        const v = R.weighted(['w1', 'tauA', 'tauE', 'half', 'Q'], [3, 2, 1, 1, 2]);
        if (v === 'Q') {
          const w0 = R.pick([10, 20, 40, 50, 100, 200]), m = R.pick([0.1, 0.2, 0.5, 1, 2]), Q = R.pick([10, 20, 25, 50, 100]);
          const b = m * w0 / Q;
          return {
            q: raw`A lightly damped oscillator consists of a $${F.num(m, 2)}\,\text{kg}$ mass on a spring of constant $${F.num(m * w0 * w0, 3)}\,\text{N/m}$ with damping force $-b\dot{x}$, $b = ${F.num(b, 3)}\,\text{kg/s}$. Its quality factor $Q$ is closest to`,
            ...GRE.numeric(R, Q, [2 * Q, Q / 2, 2 * Math.PI * Q, Q / (2 * Math.PI), Q * Q / 10], { sig: 2 }),
            expl: raw`$Q = \frac{\omega_0}{2\beta} = \frac{m\omega_0}{b}$ with $\omega_0 = \sqrt{k/m} = ${w0}\,\text{s}^{-1}$: $Q = \frac{${F.num(m, 2)}\times ${w0}}{${F.num(b, 3)}} = ${Q}$. Roughly, the energy falls by $e^{-2\pi/Q}$ each cycle.`,
          };
        }
        const [w0, be, w1] = R.pick([[5, 3, 4], [5, 4, 3], [13, 5, 12], [13, 12, 5], [10, 6, 8], [10, 8, 6], [17, 8, 15], [17, 15, 8], [25, 7, 24], [25, 24, 7], [15, 9, 12], [15, 12, 9]]);
        const m = R.pick([0.5, 1, 2, 4]);
        const k = m * w0 * w0, b = 2 * m * be;
        const stem = raw`A mass of $${F.num(m, 2)}\,\text{kg}$ on a spring of constant $${F.num(k, 3)}\,\text{N/m}$ experiences a damping force $-b\dot{x}$ with $b = ${F.num(b, 3)}\,\text{kg/s}$.`;
        const setup = raw`Here $\omega_0 = \sqrt{k/m} = ${w0}\,\text{s}^{-1}$ and $\beta = b/2m = ${be}\,\text{s}^{-1}$, so $x(t) = Ae^{-\beta t}\cos(\omega_1t - \delta)$ with $\omega_1 = \sqrt{\omega_0^2 - \beta^2}$.`;
        if (v === 'w1') {
          return {
            q: stem + ' With what angular frequency does it oscillate?',
            ...GRE.numeric(R, w1, [w0, Math.sqrt(w0 * w0 + be * be), be, w0 - be, Math.sqrt(Math.max(w0 * w0 - 4 * be * be, 0)) || 2 * w0], { unit: raw`\text{rad/s}`, sig: 2, tol: 0.08 }),
            expl: setup + raw` So $\omega_1 = \sqrt{${w0 * w0} - ${be * be}} = ${w1}\,\text{rad/s}$, lower than the natural frequency.`,
          };
        }
        if (v === 'tauA' || v === 'half') {
          const half = v === 'half';
          const t = half ? Math.LN2 / be : 1 / be;
          return {
            q: stem + (half ? ' How long does it take for the amplitude of its oscillations to fall to half its initial value?' : ' How long does it take for the amplitude of its oscillations to fall to $1/e$ of its initial value?'),
            ...GRE.numeric(R, t, half ? [1 / be, Math.LN2 / (2 * be), 2 * Math.LN2 / be, Math.LN2 / w1] : [1 / (2 * be), 2 / be, 1 / w1, 2 * Math.PI / w1], { unit: raw`\text{s}`, sig: 2 }),
            expl: setup + raw` The envelope is $Ae^{-\beta t}$, so ${half ? raw`$t = \ln 2/\beta = ${F.num(t, 2)}\,\text{s}$` : raw`$t = 1/\beta = 2m/b = ${F.num(t, 2)}\,\text{s}$`}. (The energy, $\propto$ amplitude$^2$, decays twice as fast.)`,
          };
        }
        return {
          q: stem + ' In how much time does the mechanical energy of the oscillator decrease by a factor of $e$?',
          ...GRE.numeric(R, 1 / (2 * be), [1 / be, 2 / be, 1 / (4 * be), 1 / w1], { unit: raw`\text{s}`, sig: 2 }),
          expl: setup + raw` Energy $\propto$ amplitude$^2 \propto e^{-2\beta t}$, so it falls by $e$ in $1/(2\beta) = m/b = ${F.num(1 / (2 * be), 2)}\,\text{s}$ — half the amplitude decay time.`,
        };
      },
    },
    {
      id: 'mech2.drive.amp', sec: '1.7.2', level: 2,
      gen(R) {
        const v = R.weighted(['ratio', 'num', 'phase'], [3, 2, 2]);
        if (v === 'ratio') {
          const L = [[1, 2], [1, 3], [2, 3], [3, 2], [2, 1], [3, 1], [4, 1], [5, 2], [3, 4], [1, 4], [5, 4]];
          let p, q;
          do { [p, q] = R.pickN(L, 2); } while ((p[0] === 2 && p[1] === 1 && q[0] === 3 && q[1] === 1));
          const P = p[0] / p[1], Q = q[0] / q[1];
          const ans = Math.abs(1 - P * P) / Math.abs(1 - Q * Q);
          const fT = x => F.frac(x[0], x[1]);
          return {
            q: raw`An undamped mass–spring system with natural angular frequency $\omega_0$ is driven by a sinusoidal force of fixed amplitude. In the steady state, by what factor does the oscillation amplitude change when the driving frequency is changed from $${fT(p)}\,\omega_0$ to $${fT(q)}\,\omega_0$?`,
            ...mcNum(R, ans, [Math.abs(1 - P) / Math.abs(1 - Q), 1 / ans, (P * P) / (Q * Q), (Q * Q) / (P * P), P / Q, Math.sqrt(ans)], exM),
            expl: raw`For an undamped driven oscillator $D = \frac{F_0/m}{|\omega_0^2 - \omega^2|}$, so the ratio is $\frac{|1 - (${fT(p)})^2|}{|1 - (${fT(q)})^2|} = ${ex(ans)}$.`,
          };
        }
        if (v === 'num') {
          const m = R.pick([0.5, 1, 2]), w0 = R.pick([4, 5, 6, 8, 10]), w = R.pick([1, 2, 3, 12, 15, 20].filter(x => Math.abs(x - w0) > 1));
          const F0 = R.pick([1, 2, 3, 4, 5, 6, 8]);
          const k = m * w0 * w0;
          const D = F0 / (m * Math.abs(w0 * w0 - w * w));
          return {
            q: raw`A $${F.num(m, 2)}\,\text{kg}$ mass on a spring of constant $${F.num(k, 3)}\,\text{N/m}$ (negligible damping) is driven by a force $F_0\cos\omega t$ with $F_0 = ${F0}\,\text{N}$ and $\omega = ${w}\,\text{rad/s}$. What is the amplitude of the steady-state motion?`,
            ...GRE.numeric(R, D, [F0 / k, F0 / (m * (w0 * w0 + w * w)), F0 / (m * w * w), F0 / (m * (w0 - w) * (w0 - w)), F0 / (m * Math.abs(w0 - w) * w0)], { unit: raw`\text{m}`, sig: 2 }),
            expl: raw`$x = D\cos\omega t$ in $m\ddot{x} + kx = F_0\cos\omega t$ gives $D = \frac{F_0}{m|\omega_0^2 - \omega^2|}$ with $\omega_0^2 = k/m = ${w0 * w0}\,\text{s}^{-2}$: $D = \frac{${F0}}{${F.num(m, 2)}\times ${Math.abs(w0 * w0 - w * w)}} \approx ${F.num(D, 2)}\,\text{m}$. ${w > w0 ? 'Above resonance the motion is $180^\\circ$ out of phase with the force.' : 'Below resonance the motion is in phase with the force.'}`,
          };
        }
        const P = R.pick([['much lower than', 'in phase with the force', 'At low frequency the spring dominates and $x \\approx F/k$ follows the force.'],
          ['equal to', 'lagging the force by $90^\\circ$', 'At $\\omega = \\omega_0$ the phase lag is exactly $90^\\circ$: the velocity is in phase with the force, maximizing power transfer.'],
          ['much higher than', '$180^\\circ$ out of phase with the force', 'At high frequency inertia dominates, $m\\ddot{x} \\approx F$, so $x \\approx -F/m\\omega^2$ is opposite to the force.']]);
        const ALL = ['in phase with the force', 'lagging the force by $90^\\circ$', '$180^\\circ$ out of phase with the force', 'leading the force by $90^\\circ$', 'lagging the force by $45^\\circ$'];
        return {
          q: raw`A lightly damped harmonic oscillator with natural frequency $\omega_0$ is driven by a sinusoidal force at a frequency ${P[0]} $\omega_0$. In the steady state, the displacement is approximately`, level: 2,
          ...GRE.mc(R, P[1], ALL.filter(x => x !== P[1])),
          expl: 'The steady-state phase lag $\\delta$ obeys $\\tan\\delta = \\frac{2\\beta\\omega}{\\omega_0^2 - \\omega^2}$: it goes from $0$ below resonance through $90^\\circ$ at $\\omega_0$ to $180^\\circ$ far above. ' + P[2],
        };
      },
    },
    {
      id: 'mech2.drive.resonance', sec: '1.7.2', level: 2,
      gen(R) {
        if (R.bool(0.5)) {
          const [be, s] = R.pick([[1, 1], [1, 2], [1, 3], [2, 1], [2, 3], [2, 4], [3, 1], [3, 2], [3, 4], [4, 2], [1, 4], [2, 5]]);
          const w02 = s * s + 2 * be * be, m = R.pick([0.5, 1, 2]);
          const k = m * w02, b = 2 * m * be;
          return {
            q: raw`A $${F.num(m, 2)}\,\text{kg}$ mass on a spring of constant $${F.num(k, 3)}\,\text{N/m}$ experiences a damping force $-b\dot{x}$ with $b = ${F.num(b, 3)}\,\text{kg/s}$ and is driven by a sinusoidal force of fixed amplitude. At what driving angular frequency is the steady-state displacement amplitude largest?`, level: 3,
            ...GRE.numeric(R, s, [Math.sqrt(w02), Math.sqrt(w02 - be * be), Math.sqrt(w02 + 2 * be * be), Math.sqrt(Math.max(w02 - 4 * be * be, 0)) || w02, be], { unit: raw`\text{rad/s}`, sig: 2, tol: 0.08 }),
            expl: raw`$\omega_0^2 = k/m = ${w02}\,\text{s}^{-2}$ and $\beta = b/2m = ${be}\,\text{s}^{-1}$. The amplitude peaks at $\omega_R = \sqrt{\omega_0^2 - 2\beta^2} = \sqrt{${w02} - ${2 * be * be}} = ${s}\,\text{rad/s}$ — below both $\omega_0 \approx ${F.num(Math.sqrt(w02), 2)}$ and the free damped frequency $\omega_1 = \sqrt{\omega_0^2 - \beta^2} \approx ${F.num(Math.sqrt(w02 - be * be), 2)}\,\text{rad/s}$.`,
          };
        }
        const POOL = [
          ['In the steady state the oscillator moves at the driving frequency.', 1, 'the transient at the natural frequency dies out'],
          ['The steady-state amplitude does not depend on the initial position and velocity.', 1, 'initial conditions only affect the transient'],
          ['The displacement amplitude peaks at a driving frequency slightly below $\\omega_0$.', 1, '$\\omega_R = \\sqrt{\\omega_0^2 - 2\\beta^2}$'],
          ['Increasing the damping lowers and broadens the resonance peak.', 1, 'the width is about $2\\beta$'],
          ['The average power absorbed from the driving force is greatest when the driving frequency equals $\\omega_0$.', 1, 'the velocity amplitude peaks exactly at $\\omega_0$'],
          ['At $\\omega = \\omega_0$ the displacement lags the driving force by $90^\\circ$.', 1, '$\\tan\\delta \\to \\infty$'],
          ['In the steady state the oscillator moves at its natural frequency $\\omega_0$.', 0, 'it moves at the driving frequency'],
          ['The displacement amplitude peaks at a driving frequency above $\\omega_0$.', 0, '$\\omega_R \\lt \\omega_0$'],
          ['The steady-state amplitude depends on the initial displacement.', 0, 'only the transient does'],
          ['Increasing the damping makes the resonance peak taller and narrower.', 0, 'it does the opposite'],
          ['Far above resonance the displacement is in phase with the driving force.', 0, 'it is nearly $180^\\circ$ out of phase'],
          ['The resonance frequency for the displacement amplitude is independent of the damping.', 0, '$\\omega_R$ decreases as $\\beta$ grows'],
        ];
        return romanQ(R, 'A damped harmonic oscillator with natural frequency $\\omega_0$ and damping parameter $\\beta = b/2m$ (with $\\beta \\ll \\omega_0$) is driven by a sinusoidal force of fixed amplitude. Which of the following statements is (are) true?', POOL,
          'For $\\ddot{x} + 2\\beta\\dot{x} + \\omega_0^2x = (F_0/m)\\cos\\omega t$ the steady state is $x = D\\cos(\\omega t - \\delta)$ with $D = \\frac{F_0/m}{\\sqrt{(\\omega_0^2 - \\omega^2)^2 + 4\\beta^2\\omega^2}}$.');
      },
    },
    // ------------------------------------------------------------ 1.7.3 Further examples
    {
      id: 'mech2.osc.physpend', sec: '1.7.3', level: 2, weight: 2,
      gen(R) {
        const O = R.pick(PHYS);
        const s = R.pick(O.sym);
        const Leq = (O.Ic + O.d * O.d) / O.d;
        const wrongs = [O.d, O.Ic > 0 ? O.Ic / O.d : null, 1, O.Ic + O.d * O.d, 2 * O.d, O.extra || null, Leq * 2, Leq / 2].filter(x => x != null && x > 0);
        const kind = R.weighted(['T', 'w', 'L', 'num'], [3, 2, 2, 3]);
        const why = raw`For a physical pendulum $\omega = \sqrt{\frac{Mgd}{I}}$ with $d$ the pivot-to-center-of-mass distance and $I$ the moment of inertia about the pivot. Here $d = ${ex(O.d)}${s}$ and, by the parallel-axis theorem, $I = ${O.Ic > 0 ? raw`I_{\text{cm}} + Md^2 = ` : ''}${ex(O.Ic + O.d * O.d)}M${s}^2$ ($M$ the total mass), so $I/(Md) = ${ex(Leq)}${s}$ — the length of the equivalent simple pendulum.`;
        const desc = O.d0(s);
        if (kind === 'num') {
          const len = R.pick([0.2, 0.3, 0.4, 0.5, 0.6, 0.8, 1, 1.2, 1.5, 2]);
          const T = c => 2 * Math.PI * Math.sqrt(c * len / 10);
          return {
            q: raw`A physical pendulum is made of ${desc.replace('$' + s + '$', raw`$${s} = ${F.num(len, 2)}\,\text{m}$`)}. It swings with small amplitude about the pivot. Taking $g = 10\,\text{m/s}^2$, its period is closest to`,
            ...GRE.numeric(R, T(Leq), wrongs.map(T), { unit: raw`\text{s}`, sig: 2 }),
            expl: why + raw` Then $T = 2\pi\sqrt{${ex(Leq)}\times ${F.num(len, 2)}/10} \approx ${F.num(T(Leq), 2)}\,\text{s}$.`,
          };
        }
        const fmt = { T: c => mth(Tform(c, s)), w: c => mth(Wform(c, s)), L: c => mth(raw`\ell_{\text{eq}} = ${Lform(c, s)}`) }[kind];
        const ask = { T: 'What is its period for small oscillations?', w: 'What is its angular frequency for small oscillations?', L: 'What is the length of the simple pendulum that has the same small-oscillation period?' }[kind];
        return { q: raw`A physical pendulum consists of ${desc}, swinging in a vertical plane under gravity $g$. ${ask}`, ...mcNum(R, Leq, wrongs, fmt), expl: why, level: O.lv || 2 };
      },
    },
    {
      id: 'mech2.osc.springs', sec: '1.7.3', level: 2, weight: 2,
      gen(R) {
        const v = R.weighted(['serpar', 'ratio', 'walls', 'cut', 'hang'], [4, 2, 2, 2, 2]);
        const m = R.pick(['m', 'M']);
        const kT = x => (x === 1 ? 'k' : x + 'k');
        const Wf = c => mth(raw`\omega = ${sqrtR(c, 'k', m)}`), Tf = c => mth(raw`T = 2\pi${sqrtR(1 / c, m, 'k')}`);
        if (v === 'serpar' || v === 'walls') {
          const [a, b] = R.pickN([1, 2, 3, 4, 6], 2);
          const par = v === 'walls' ? true : R.bool();
          const keq = par ? a + b : a * b / (a + b), kother = par ? a * b / (a + b) : a + b;
          const per = R.bool(0.35);
          const desc = v === 'walls'
            ? raw`A block of mass $${m}$ on a frictionless horizontal surface sits between two walls. It is attached to the left wall by a spring of constant $${kT(a)}$ and to the right wall by a spring of constant $${kT(b)}$; both springs are unstretched when the block is at rest.`
            : par ? raw`A block of mass $${m}$ on a frictionless horizontal surface is attached to a wall by two springs, of constants $${kT(a)}$ and $${kT(b)}$, placed side by side (in parallel).`
              : raw`A block of mass $${m}$ on a frictionless horizontal surface is attached to a wall by two springs, of constants $${kT(a)}$ and $${kT(b)}$, joined end to end (in series).`;
          return {
            q: desc + ` What is the ${per ? 'period' : 'angular frequency'} of its oscillations?`, level: v === 'walls' ? 2 : 1,
            ...mcNum(R, keq, [kother, (a + b) / 2, a, b, a * b, 1 / (a + b)].filter(x => Math.abs(x - keq) > 1e-9), per ? Tf : Wf),
            expl: (v === 'walls' ? 'When the block moves, one spring is stretched and the other compressed by the same amount, and both push it back toward equilibrium: the springs act in parallel even though they are on opposite sides. ' : '') +
              raw`${par ? `Parallel springs add: $k_{\\text{eq}} = ${kT(a)} + ${kT(b)} = ${kT(a + b)}$.` : `Series springs add reciprocally: $1/k_{\\text{eq}} = 1/(${kT(a)}) + 1/(${kT(b)})$, so $k_{\\text{eq}} = ${fracSym(keq, 'k', '')}$.`} Then $\omega = \sqrt{k_{\text{eq}}/${m}}$ and $T = 2\pi/\omega$.`,
          };
        }
        if (v === 'ratio') {
          const [a, b] = R.pick([[1, 1], [1, 2], [1, 3], [2, 3], [1, 4], [3, 4], [2, 2], [1, 8]]);
          const ans = (a + b) / Math.sqrt(a * b);
          return {
            q: raw`Two springs of constants $${kT(a)}$ and $${kT(b)}$ are used to suspend the same mass, first connected in parallel and then connected in series. What is the ratio of the oscillation frequency in the parallel arrangement to that in the series arrangement?`,
            ...mcNum(R, ans, [ans * ans, Math.sqrt(ans), 1 / ans, (a + b) / 2, Math.sqrt(a + b), 2].filter(x => Math.abs(x - ans) > 1e-9), exM),
            expl: raw`$k_{\parallel} = ${kT(a + b)}$ and $k_{\text{series}} = ${fracSym(a * b / (a + b), 'k', '')}$, so $\frac{\omega_{\parallel}}{\omega_{\text{s}}} = \sqrt{\frac{k_{\parallel}}{k_{\text{s}}}} = \frac{${a + b}}{\sqrt{${a * b}}} = ${ex(ans)}$.`,
          };
        }
        if (v === 'cut') {
          const n = R.pick([2, 3, 4]);
          const c = R.pick(['one', 'all', 'two']);
          if (c === 'two' && n === 2) throw new Error('trivial');
          const fac = c === 'one' ? Math.sqrt(n) : c === 'all' ? n : Math.sqrt(n / 2);
          const what = { one: `One of the pieces is then used alone to support the mass`, all: `All ${n} pieces are then attached side by side (in parallel) to support the mass`, two: 'Two of the pieces are then joined end to end and used to support the mass' }[c];
          return {
            q: raw`A mass $${m}$ hanging from a uniform spring of constant $k$ oscillates with angular frequency $\omega_0$. The spring is cut into ${['', '', 'two', 'three', 'four'][n]} equal pieces. ${what}. What is the new angular frequency?`, level: 2,
            ...mcNum(R, fac, [1 / Math.sqrt(n), n, n * n, 1 / n, Math.sqrt(2 * n), 1].filter(x => Math.abs(x - fac) > 1e-9), x => { const e = F.exact(x); return e == null ? null : mth((e === '1' ? '' : e + raw`\,`) + raw`\omega_0`); }),
            expl: raw`A spring's constant is inversely proportional to its length, so each piece has constant $${n}k$. ${c === 'one' ? raw`Then $\omega = \sqrt{${n}k/${m}} = \sqrt{${n}}\,\omega_0$.` : c === 'all' ? raw`In parallel they give $${n * n}k$, so $\omega = ${n}\omega_0$.` : raw`Two in series give $${fracSym(n / 2, 'k', '')}$, so $\omega = ${ex(fac)}\,\omega_0$.`}`,
          };
        }
        const k1 = R.pick([100, 200, 300, 400, 600]), k2 = R.pick([100, 200, 300, 400, 600]), mass = R.pick([0.5, 1, 2, 3]);
        const ext = mass * 10 * (1 / k1 + 1 / k2) * 100;
        return {
          q: raw`Two light springs with constants $${k1}\,\text{N/m}$ and $${k2}\,\text{N/m}$ are hooked end to end and hung vertically, and a $${F.num(mass, 2)}\,\text{kg}$ mass is attached to the bottom. Taking $g = 10\,\text{m/s}^2$, by how much does the combined spring stretch when the mass hangs at rest?`, level: 1,
          ...GRE.numeric(R, ext, [mass * 10 / (k1 + k2) * 100, mass * 10 / k1 * 100, mass * 10 / k2 * 100, 2 * mass * 10 / (k1 + k2) * 100], { unit: raw`\text{cm}`, sig: 2 }),
          expl: raw`Both springs carry the full weight $mg = ${F.num(mass * 10, 2)}\,\text{N}$, so the stretches add: $mg\left(\frac{1}{k_1} + \frac{1}{k_2}\right) = ${F.num(ext, 2)}\,\text{cm}$ — the series rule $1/k_{\text{eq}} = 1/k_1 + 1/k_2$.`,
        };
      },
    },
    {
      id: 'mech2.osc.pendscale', sec: '1.7.3', level: 2,
      gen(R) {
        const v = R.weighted(['len', 'planet', 'elev', 'car', 'moon'], [2, 2, 2, 2, 2]);
        const fF = x => { const e = F.exact(x); return e == null ? null : mth(e); };
        const dist = x => [1 / x, x * x, Math.sqrt(x), 1 / (x * x), 1];
        if (v === 'len') {
          const n = R.pick([4, 9, 16, 2, 1 / 4, 1 / 9, 3]);
          const ans = Math.sqrt(n);
          const freq = R.bool(0.3);
          return {
            q: raw`The length of a simple pendulum is ${n > 1 ? 'increased' : 'decreased'} by a factor of $${ex(n > 1 ? n : 1 / n)}$${R.bool() ? ' and its bob is replaced by one twice as heavy' : ''}. By what factor does its ${freq ? 'frequency' : 'period'} of small oscillations change?`, level: 1,
            ...mcNum(R, freq ? 1 / ans : ans, dist(freq ? 1 / ans : ans).concat([n, 1 / n]), fF),
            expl: raw`$T = 2\pi\sqrt{L/g}$ is independent of the bob's mass, so the period scales as $\sqrt{L}$: factor $${ex(ans)}$${freq ? raw`, and the frequency by $${ex(1 / ans)}$` : ''}.`,
          };
        }
        if (v === 'planet') {
          const [mu, rho] = R.pick([[4, 1], [1, 2], [4, 2], [9, 1], [2, 1], [8, 2], [1 / 4, 1], [16, 2], [1, 3], [9, 3], [1 / 2, 1 / 2], [1 / 8, 1 / 2]]);
          const ans = rho / Math.sqrt(mu);
          if (Math.abs(ans - 1) < 1e-9) throw new Error('trivial');
          return {
            q: raw`A pendulum clock is taken to a planet with ${mu === 1 ? "Earth's mass" : `$${ex(mu)}$ times Earth's mass`} and ${rho === 1 ? "Earth's radius" : `$${ex(rho)}$ times Earth's radius`}. By what factor does the period of its pendulum change?`,
            ...mcNum(R, ans, dist(ans).concat([rho * rho / mu, rho / mu]), fF),
            expl: raw`$g \propto M/R^2$ changes by $${ex(mu / (rho * rho))}$, and $T \propto 1/\sqrt{g}$, so $T$ changes by $${ex(ans)}$.`,
          };
        }
        if (v === 'elev') {
          const f = R.pick([[1, 2], [1, 4], [3, 4], [1, 3], [2, 1], [5, 4], [1, 8]]);
          const fv = f[0] / f[1];
          const up = fv >= 1 ? true : R.bool();
          const ans = 1 / Math.sqrt(up ? 1 + fv : 1 - fv);
          return {
            q: raw`A simple pendulum hangs in an elevator. By what factor does its period change when the elevator accelerates ${up ? 'upward' : 'downward'} at $${F.frac(f[0], f[1])}\,g$, compared with when the elevator is at rest?`,
            ...mcNum(R, ans, dist(ans).concat([1 / Math.sqrt(up ? 1 - fv : 1 + fv)].filter(isFinite)), fF),
            expl: raw`In the elevator frame the effective gravity is $g_{\text{eff}} = g ${up ? '+' : '-'} a = ${F.frac(up ? f[1] + f[0] : f[1] - f[0], f[1])}\,g$, and $T \propto 1/\sqrt{g_{\text{eff}}}$, giving the factor $${ex(ans)}$.`,
          };
        }
        if (v === 'car') {
          const [a, gg] = R.pick([[3, 4], [4, 3], [5, 12], [12, 5], [8, 15]]);
          const ge = Math.sqrt(a * a + gg * gg) / gg;
          const ans = 1 / Math.sqrt(ge);
          return {
            q: raw`A simple pendulum hangs from the roof of a van that accelerates horizontally at a constant $${F.frac(a, gg)}\,g$. Compared with its period when the van moves at constant velocity, its period of small oscillations about the new (tilted) equilibrium is multiplied by`, level: 3,
            ...mcNum(R, ans, [1 / ge, Math.sqrt(ge), 1 / Math.sqrt(1 + a / gg), 1, ge].filter(x => Math.abs(x - ans) > 1e-9), fF),
            expl: raw`In the van's frame the effective gravity is the vector sum of $g$ (down) and $${F.frac(a, gg)}\,g$ (backward): $g_{\text{eff}} = \sqrt{1 + (${F.frac(a, gg)})^2}\,g = ${F.frac(Math.round(ge * gg), gg)}\,g$. The pendulum oscillates about the direction of $\vec{g}_{\text{eff}}$ with $T \propto g_{\text{eff}}^{-1/2}$, a factor $${ex(ans)}$.`,
          };
        }
        const POOL = [
          ['a simple pendulum', 1], ['a uniform rod swinging about one end', 1], ['a block on a horizontal frictionless surface attached to a spring', 0],
          ['a mass hanging from a vertical spring', 0], ['a torsion pendulum (a disk on a twisting wire)', 0], ['water sloshing in a U-shaped tube', 1],
          ['a wooden block bobbing vertically while floating in water', 1], ['an LC circuit', 0],
        ];
        const s = pick3(R, POOL);
        return {
          q: GRE.romanStem('Each of the following oscillators is moved from the Earth to the surface of the Moon, where $g$ is about one-sixth as large. For which of them does the period of small oscillations change?', s.map(x => x[0])), level: 2,
          ...GRE.roman(R, s.map(x => !!x[1])),
          expl: 'Periods set by gravity change ($\\omega^2 \\propto g$ for pendulums, the U-tube, $\\omega^2 = g/d$ for a floating block with equilibrium depth $d$); those set by a spring or torsion constant and a mass (or by $L$ and $C$) do not — a vertical spring only shifts the equilibrium. ' + s.map((x, i) => `${ROM[i]}: ${x[1] ? 'changes' : 'unchanged'}.`).join(' '),
        };
      },
    },
    {
      id: 'mech2.osc.smallosc', sec: '1.7.3', level: 3,
      gen(R) {
        if (R.bool(0.4)) {
          // numeric version of U = A/x^2 - B/x
          const [A, B, m] = R.pick([[1, 2, 2], [2, 4, 1], [1, 4, 2], [2, 2, 1], [1, 1, 0.5], [4, 4, 2], [1, 2, 0.5], [3, 6, 1], [2, 6, 1], [1, 3, 2]]);
          const x0 = 2 * A / B, w = Math.sqrt(Math.pow(B, 4) / (8 * m * A * A * A));
          const askX = R.bool(0.3);
          if (askX) {
            return {
              q: raw`A particle of mass $${F.num(m, 2)}\,\text{kg}$ moves along the positive $x$-axis in the potential $U(x) = \frac{${A}}{x^2} - \frac{${B}}{x}$ (SI units, $x$ in meters). Where is its stable equilibrium?`, level: 2,
              ...GRE.numeric(R, x0, [A / B, B / (2 * A), Math.sqrt(A / B), 4 * A / B, B / A], { unit: raw`\text{m}`, sig: 2 }),
              expl: raw`$U'(x) = -\frac{${2 * A}}{x^3} + \frac{${B}}{x^2} = 0$ gives $x_0 = \frac{${2 * A}}{${B}} = ${F.num(x0, 2)}\,\text{m}$; $U'' > 0$ there, so it is a minimum.`,
            };
          }
          return {
            q: raw`A particle of mass $${F.num(m, 2)}\,\text{kg}$ moves along the positive $x$-axis in the potential $U(x) = \frac{${A}}{x^2} - \frac{${B}}{x}$ (SI units, $x$ in meters). What is the angular frequency of small oscillations about its stable equilibrium?`,
            ...GRE.numeric(R, w, [w * Math.SQRT2, w / Math.SQRT2, w * Math.sqrt(3), w * w, Math.sqrt(Math.pow(B, 4) / (8 * A * A * A))].filter(x => Math.abs(x / w - 1) > 0.05), { unit: raw`\text{rad/s}`, sig: 2, tol: 0.1 }),
            expl: raw`With $A = ${A}$ and $B = ${B}$: equilibrium where $U' = -2A/x^3 + B/x^2 = 0 \Rightarrow x_0 = 2A/B = ${F.num(x0, 2)}\,\text{m}$. Then $U''(x_0) = \frac{6A}{x_0^4} - \frac{2B}{x_0^3} = \frac{B^4}{8A^3} = ${F.num(Math.pow(B, 4) / (8 * A * A * A), 3)}\,\text{J/m}^2$, and $\omega = \sqrt{U''(x_0)/m} \approx ${F.num(w, 2)}\,\text{rad/s}$.`,
          };
        }
        const m = R.pick(['m', 'M']);
        const P = R.pick([
          () => { const [A, B] = R.pick([['A', 'B'], ['a', 'b'], [raw`\alpha `, raw`\beta `]]); return { U: raw`U(x) = \frac{${A}}{x^2} - \frac{${B}}{x}\quad (x > 0)`, C: raw`\sqrt{\frac{${B}^4}{8${m}${A}^3}}`, W: [raw`\sqrt{\frac{${B}^4}{4${m}${A}^3}}`, raw`\sqrt{\frac{3${B}^4}{8${m}${A}^3}}`, raw`\sqrt{\frac{${B}^2}{2${m}${A}}}`, raw`\sqrt{\frac{${B}^4}{16${m}${A}^3}}`, raw`\frac{${B}^4}{8${m}${A}^3}`], why: raw`$U' = 0$ at $x_0 = 2${A}/${B}$, where $U'' = 6${A}/x_0^4 - 2${B}/x_0^3 = ${B}^4/(8${A}^3)$.` }; },
          () => { const U0 = R.pick(['U_0', 'V_0', raw`\epsilon `]), a = R.pick(['a', 'b']); return { U: raw`U(x) = ${U0}\left(\frac{x}{${a}} + \frac{${a}}{x}\right)\quad (x > 0)`, C: raw`\sqrt{\frac{2${U0}}{${m}${a}^2}}`, W: [raw`\sqrt{\frac{${U0}}{${m}${a}^2}}`, raw`\sqrt{\frac{4${U0}}{${m}${a}^2}}`, raw`\sqrt{\frac{${U0}}{2${m}${a}^2}}`, raw`\sqrt{\frac{2${U0}${a}}{${m}}}`, raw`\frac{2${U0}}{${m}${a}^2}`], why: raw`$U' = ${U0}(1/${a} - ${a}/x^2) = 0$ at $x_0 = ${a}$, where $U'' = 2${U0}${a}/x_0^3 = 2${U0}/${a}^2$.` }; },
          () => { const [al, bt] = R.pick([[raw`\alpha `, raw`\beta `], ['a', 'b']]); return { U: raw`U(x) = -${al}x^2 + ${bt}x^4\quad (${al.trim()}, ${bt.trim()} > 0)`, C: raw`2\sqrt{\frac{${al}}{${m}}}`, W: [raw`\sqrt{\frac{2${al}}{${m}}}`, raw`\sqrt{\frac{${al}}{${m}}}`, raw`2\sqrt{\frac{2${al}}{${m}}}`, raw`\sqrt{\frac{${al}^2}{${m}${bt}}}`, raw`4\sqrt{\frac{${al}}{${m}}}`], why: raw`The minima are at $x_0^2 = ${al}/(2${bt})$, where $U'' = -2${al} + 12${bt}x_0^2 = 4${al}$ (not the $2${al}$ curvature at the central maximum).` }; },
          () => ({ U: raw`U(x) = \frac{1}{2}kx^2 + \lambda x^4\quad (k, \lambda > 0)`, C: raw`\sqrt{\frac{k}{${m}}}`, W: [raw`\sqrt{\frac{2k}{${m}}}`, raw`\sqrt{\frac{k}{2${m}}}`, raw`\sqrt{\frac{k + 4\lambda}{${m}}}`, raw`2\sqrt{\frac{k}{${m}}}`, raw`\sqrt{\frac{12\lambda}{${m}}}`], why: raw`The minimum is at $x = 0$, where $U''(0) = k$: the quartic term only matters at large amplitude.`, lv: 2 }),
          () => { const U0 = R.pick(['U_0', 'D']), a = R.pick(['a', 'b']); return { U: raw`U(x) = ${U0}\left(1 - e^{-x/${a}}\right)^2`, C: raw`\sqrt{\frac{2${U0}}{${m}${a}^2}}`, W: [raw`\sqrt{\frac{${U0}}{${m}${a}^2}}`, raw`\sqrt{\frac{4${U0}}{${m}${a}^2}}`, raw`\sqrt{\frac{${U0}}{2${m}${a}^2}}`, raw`\sqrt{\frac{2${U0}}{${m}${a}}}`, raw`\frac{2${U0}}{${m}${a}^2}`], why: raw`This Morse potential has its minimum at $x = 0$; expanding $1 - e^{-x/${a}} \approx x/${a}$ gives $U \approx ${U0}x^2/${a}^2$, so $U''(0) = 2${U0}/${a}^2$.` }; },
          () => ({ U: raw`U(x) = \epsilon\left[\left(\frac{\sigma}{x}\right)^{12} - 2\left(\frac{\sigma}{x}\right)^{6}\right]\quad (x > 0)`, C: raw`\sqrt{\frac{72\epsilon}{${m}\sigma^2}}`, W: [raw`\sqrt{\frac{12\epsilon}{${m}\sigma^2}}`, raw`\sqrt{\frac{36\epsilon}{${m}\sigma^2}}`, raw`\sqrt{\frac{156\epsilon}{${m}\sigma^2}}`, raw`\sqrt{\frac{2\epsilon}{${m}\sigma^2}}`, raw`\sqrt{\frac{144\epsilon}{${m}\sigma^2}}`], why: raw`The minimum is at $x = \sigma$ (depth $-\epsilon$); $U'' = \epsilon(156\sigma^{12}/x^{14} - 84\sigma^6/x^8) = 72\epsilon/\sigma^2$ there.` }),
          () => { const U0 = R.pick(['U_0', 'V_0']), a = R.pick(['a', 'b']); return { U: raw`U(x) = ${U0}\left[\left(\frac{x}{${a}}\right)^2 - 1\right]^2`, C: raw`\sqrt{\frac{8${U0}}{${m}${a}^2}}`, W: [raw`\sqrt{\frac{4${U0}}{${m}${a}^2}}`, raw`\sqrt{\frac{2${U0}}{${m}${a}^2}}`, raw`\sqrt{\frac{12${U0}}{${m}${a}^2}}`, raw`\sqrt{\frac{16${U0}}{${m}${a}^2}}`, raw`\sqrt{\frac{${U0}}{${m}${a}^2}}`], why: raw`The minima are at $x = \pm ${a}$; $U'' = ${U0}(12x^2/${a}^4 - 4/${a}^2) = 8${U0}/${a}^2$ there.` }; },
          () => { const U0 = R.pick(['U_0', 'V_0']), a = R.pick(['a', 'b']); return { U: raw`U(x) = -${U0}\cos(x/${a})`, C: raw`\sqrt{\frac{${U0}}{${m}${a}^2}}`, W: [raw`\sqrt{\frac{${U0}}{${m}${a}}}`, raw`\sqrt{\frac{2${U0}}{${m}${a}^2}}`, raw`\sqrt{\frac{${U0}}{2${m}${a}^2}}`, raw`\sqrt{\frac{${U0}${a}^2}{${m}}}`, raw`\frac{${U0}}{${m}${a}^2}`], why: raw`Near $x = 0$, $-${U0}\cos(x/${a}) \approx -${U0} + \frac{${U0}}{2${a}^2}x^2$, so $U''(0) = ${U0}/${a}^2$.`, lv: 2 }; },
        ])();
        return {
          q: raw`A particle of mass $${m}$ moves in one dimension in the potential $${P.U}$. What is the angular frequency of small oscillations about a stable equilibrium point?`,
          ...GRE.mc(R, mth(raw`\omega = ${P.C}`), P.W.map(w => mth(raw`\omega = ${w}`))), level: P.lv || 3,
          expl: raw`Expand about the minimum $x_0$: $U \approx U(x_0) + \frac{1}{2}U''(x_0)(x - x_0)^2$, so $\omega = \sqrt{U''(x_0)/${m}}$. ${P.why} Hence $\omega = ${P.C}$.`,
        };
      },
    },
    {
      id: 'mech2.osc.shm', sec: '1.7.3', level: 1,
      gen(R) {
        const v = R.weighted(['ke', 'speed', 'equal', 'max', 'vert', 'amp'], [2, 2, 1, 2, 2, 1]);
        if (v === 'ke' || v === 'speed') {
          const f = R.pick([[1, 2], [1, 3], [2, 3], [1, 4], [3, 4], [3, 5], [4, 5], [1, 5]]);
          const fv = f[0] / f[1];
          const ans = v === 'ke' ? 1 - fv * fv : Math.sqrt(1 - fv * fv);
          return {
            q: raw`A mass on a spring oscillates with amplitude $A$. When its displacement from equilibrium is $${F.frac(f[0], f[1])}\,A$, ${v === 'ke' ? 'what fraction of the total mechanical energy is kinetic energy' : 'what is its speed as a fraction of its maximum speed'}?`,
            ...mcNum(R, ans, v === 'ke' ? [1 - fv, fv * fv, fv, Math.sqrt(1 - fv * fv), 1 - fv * fv / 2] : [1 - fv, 1 - fv * fv, fv, Math.sqrt(fv), Math.sqrt(1 - fv)], exM),
            expl: raw`$E = \frac{1}{2}kA^2$ and $U = \frac{1}{2}kx^2$, so $K/E = 1 - (x/A)^2 = ${ex(1 - fv * fv)}$${v === 'speed' ? raw` and $v/v_{\max} = \sqrt{1 - (x/A)^2} = ${ex(ans)}$` : ''}.`,
          };
        }
        if (v === 'equal') {
          const n = R.pick([1, 2, 3, 8, 1 / 3]);
          const ans = 1 / Math.sqrt(n + 1);
          const fm = x => { const e = F.exact(x); return e == null ? null : mth('x = ' + (e === '1' ? '' : e) + 'A'); };
          return {
            q: n === 1 ? raw`A harmonic oscillator has amplitude $A$. At what displacement from equilibrium are its kinetic and potential energies equal?`
              : raw`A harmonic oscillator has amplitude $A$. At what displacement from equilibrium is its kinetic energy $${ex(n)}$ times its potential energy?`,
            ...mcNum(R, ans, [1 / (n + 1), Math.sqrt(n / (n + 1)), 1 / Math.sqrt(n), 1 / 2, n / (n + 1)].filter(x => x > 0 && x < 1.01), fm),
            expl: raw`$K = ${ex(n)}U$ means $E = ${ex(n + 1)}U$, i.e. $\frac{1}{2}kA^2 = ${ex(n + 1)}\cdot\frac{1}{2}kx^2$, so $x = A/\sqrt{${ex(n + 1)}} = ${ex(ans)}A$.`,
          };
        }
        if (v === 'max') {
          const m = R.pick([0.1, 0.2, 0.5, 1, 2]), w = R.pick([2, 4, 5, 10, 20]), A = R.pick([0.02, 0.05, 0.1, 0.2, 0.3]);
          const k = m * w * w, acc = R.bool();
          const ans = acc ? A * w * w : A * w;
          return {
            q: raw`A $${F.num(m, 2)}\,\text{kg}$ block attached to a spring of constant $${F.num(k, 3)}\,\text{N/m}$ oscillates on a frictionless surface with amplitude $${F.num(A * 100, 2)}\,\text{cm}$. What is its maximum ${acc ? 'acceleration' : 'speed'}?`,
            ...GRE.numeric(R, ans, acc ? [A * w, A * w * w / (2 * Math.PI), A * w * w * 2 * Math.PI, A * k] : [A * w * w, A * w / (2 * Math.PI), A * w * 2 * Math.PI, A * Math.sqrt(k)], { unit: acc ? raw`\text{m/s}^2` : raw`\text{m/s}`, sig: 2 }),
            expl: raw`$\omega = \sqrt{k/m} = ${w}\,\text{rad/s}$, so ${acc ? raw`$a_{\max} = \omega^2A = ${F.num(ans, 2)}\,\text{m/s}^2$` : raw`$v_{\max} = \omega A = ${F.num(ans, 2)}\,\text{m/s}$`}. Using the frequency $f = \omega/2\pi$ instead of $\omega$ is a common slip.`,
          };
        }
        if (v === 'vert') {
          const d = R.pick([0.4, 1, 2.5, 4, 10, 1.6, 6.4, 22.5, 40]);
          const T = 2 * Math.PI * Math.sqrt(d / 100 / 10);
          return {
            q: raw`When a mass is hung from a light vertical spring, the spring stretches by $${F.num(d, 3)}\,\text{cm}$ before the mass comes to rest. If the mass is then pulled down slightly and released, the period of oscillation is closest to (take $g = 10\,\text{m/s}^2$)`, level: 2,
            ...GRE.numeric(R, T, [T / (2 * Math.PI), T / 2, 2 * Math.PI * Math.sqrt(10 * d / 100), T * Math.SQRT2], { unit: raw`\text{s}`, sig: 2 }),
            expl: raw`At equilibrium $k\Delta = mg$, so $\omega^2 = k/m = g/\Delta$ and $T = 2\pi\sqrt{\Delta/g} = 2\pi\sqrt{${F.num(d / 100, 3)}/10} \approx ${F.num(T, 2)}\,\text{s}$ — the mass and $k$ never need to be known separately.`,
          };
        }
        const n = R.pick([2, 3, 1 / 2]);
        const Q = R.pick([['its total energy', 2], ['its maximum speed', 1], ['its period', 0], ['its maximum acceleration', 1], ['its maximum kinetic energy', 2]]);
        const ans = Math.pow(n, Q[1]);
        return {
          q: raw`The amplitude of a mass–spring oscillator is ${n > 1 ? 'increased' : 'decreased'} by a factor of $${ex(n > 1 ? n : 1 / n)}$. By what factor does ${Q[0]} change?`,
          ...mcNum(R, ans, [1, n, n * n, Math.sqrt(n), 1 / n, n * n * n].filter(x => Math.abs(x - ans) > 1e-9), exM),
          expl: raw`For SHM the period is independent of amplitude, $v_{\max} = \omega A$ and $a_{\max} = \omega^2A$ scale as $A$, and the energy $\frac{1}{2}kA^2$ scales as $A^2$. Here the factor is $${ex(ans)}$.`,
        };
      },
    },
    {
      id: 'mech2.osc.circuit', sec: '1.7.3', level: 1,
      gen(R) {
        const v = R.weighted(['map', 'res', 'Q'], [3, 1, 1]);
        if (v === 'map') {
          const MAP = [['the mass $m$', 'the inductance $L$'], ['the damping constant $b$', 'the resistance $R$'], ['the spring constant $k$', 'the inverse capacitance $1/C$'], ['the displacement $x$', 'the charge $q$ on the capacitor'], ['the velocity $\\dot{x}$', 'the current $I$'], ['the driving-force amplitude $F_0$', 'the driving-voltage amplitude $V_0$'], ['the potential energy $\\frac{1}{2}kx^2$', 'the energy $\\frac{q^2}{2C}$ stored in the capacitor'], ['the kinetic energy $\\frac{1}{2}m\\dot{x}^2$', 'the energy $\\frac{1}{2}LI^2$ stored in the inductor']];
          const i = R.int(0, MAP.length - 1), dir = R.bool();
          const C = MAP[i][dir ? 1 : 0];
          const Wl = MAP.filter((_, j) => j !== i).map(x => x[dir ? 1 : 0]).concat(dir ? ['the capacitance $C$'] : []);
          return {
            q: raw`The equation of a driven, damped mass–spring oscillator, $m\ddot{x} + b\dot{x} + kx = F_0\cos\omega t$, has the same form as that of a driven series RLC circuit, $L\ddot{q} + R\dot{q} + q/C = V_0\cos\omega t$. In this analogy, ${MAP[i][dir ? 0 : 1]} corresponds to`,
            ...GRE.mc(R, C, Wl, { keep: dir && i === 2 ? 1 : 0 }),
            expl: 'Matching term by term: $m \\leftrightarrow L$, $b \\leftrightarrow R$, $k \\leftrightarrow 1/C$, $x \\leftrightarrow q$, $\\dot{x} \\leftrightarrow I$, $F_0 \\leftrightarrow V_0$; so kinetic energy maps to inductor energy and spring energy to capacitor energy. Note the spring constant corresponds to $1/C$, not $C$.',
          };
        }
        if (v === 'res') {
          return {
            q: raw`A series RLC circuit with inductance $L$, resistance $R$ and capacitance $C$ is the electrical analog of a damped mass–spring oscillator. Its natural angular frequency $\omega_0$ and damping parameter $\beta$ (the analog of $b/2m$) are`,
            ...GRE.mc(R, mth(raw`\omega_0 = \frac{1}{\sqrt{LC}},\ \beta = \frac{R}{2L}`), [raw`\omega_0 = \sqrt{LC},\ \beta = \frac{R}{2L}`, raw`\omega_0 = \frac{1}{\sqrt{LC}},\ \beta = \frac{2L}{R}`, raw`\omega_0 = \sqrt{\frac{L}{C}},\ \beta = \frac{R}{2L}`, raw`\omega_0 = \frac{1}{\sqrt{LC}},\ \beta = \frac{R}{2C}`, raw`\omega_0 = \frac{1}{\sqrt{LC}},\ \beta = RC`].map(mth)),
            expl: raw`With $m \to L$, $k \to 1/C$, $b \to R$: $\omega_0 = \sqrt{k/m} \to 1/\sqrt{LC}$ and $\beta = b/2m \to R/2L$.`,
          };
        }
        return {
          q: raw`A lightly damped mass–spring oscillator has quality factor $Q = m\omega_0/b = \sqrt{mk}/b$. Using the mechanical–electrical analogy, the quality factor of a series RLC circuit is`, level: 2,
          ...GRE.mc(R, mth(raw`Q = \frac{1}{R}\sqrt{\frac{L}{C}}`), [raw`Q = R\sqrt{\frac{C}{L}}`, raw`Q = \frac{1}{R}\sqrt{LC}`, raw`Q = \frac{1}{R}\sqrt{\frac{C}{L}}`, raw`Q = R\sqrt{LC}`, raw`Q = \frac{L}{RC}`].map(mth)),
          expl: raw`Replace $m \to L$, $k \to 1/C$, $b \to R$: $Q = \sqrt{mk}/b \to \sqrt{L/C}/R$. Check units: $\sqrt{L/C}$ is an impedance, so $Q$ is dimensionless.`,
        };
      },
    },
    // ------------------------------------------------------------ 1.8.1 Bernoulli
    {
      id: 'mech2.fl.pipe', sec: '1.8.1', level: 2, weight: 2,
      gen(R) {
        const v = R.weighted(['v2', 'dp', 'hill', 'flow'], [2, 3, 3, 1]);
        const rho = 1000;
        if (v === 'v2' || v === 'dp') {
          const [dn, dd] = R.pick([[2, 1], [3, 2], [3, 1], [4, 3], [5, 4], [5, 2]]);
          const r = dn / dd, cc = R.pick([1, 2, 3, 4]), d1 = cc * dn, d2 = cc * dd;
          const v1 = R.pick([0.5, 1, 1.5, 2, 3]);
          const v2 = v1 * r * r;
          const stem = raw`Water (density $1000\,\text{kg/m}^3$) flows steadily through a horizontal pipe whose inner diameter narrows from $${F.num(d1, 3)}\,\text{cm}$ to $${F.num(d2, 3)}\,\text{cm}$. In the wide section the water moves at $${F.num(v1, 2)}\,\text{m/s}$.`;
          if (v === 'v2') {
            return {
              q: stem + ' What is its speed in the narrow section?', level: 1,
              ...GRE.numeric(R, v2, [v1 * r, v1 * r * r * r, v1 * r * r * r * r, v1 / (r * r)], { unit: raw`\text{m/s}`, sig: 2 }),
              expl: raw`Continuity: $v_1A_1 = v_2A_2$ with $A \propto d^2$, so $v_2 = v_1(d_1/d_2)^2 = ${F.num(v1, 2)}\times(${ex(r)})^2 = ${F.num(v2, 3)}\,\text{m/s}$. Using the diameter ratio without squaring is the trap.`,
            };
          }
          const dp = 0.5 * rho * (v2 * v2 - v1 * v1) / 1000;
          return {
            q: stem + ' By how much does the pressure in the narrow section fall below that in the wide section?',
            ...GRE.numeric(R, dp, [0.5 * rho * v2 * v2 / 1000, rho * (v2 * v2 - v1 * v1) / 1000, 0.5 * rho * (v2 - v1) * (v2 - v1) / 1000, 0.5 * rho * (v1 * v1 * r * r - v1 * v1) / 1000], { unit: raw`\text{kPa}`, sig: 2 }),
            expl: raw`Continuity gives $v_2 = v_1(d_1/d_2)^2 = ${F.num(v2, 3)}\,\text{m/s}$. Bernoulli at equal height: $p_1 - p_2 = \frac{1}{2}\rho(v_2^2 - v_1^2) = \frac{1}{2}(1000)(${F.num(v2 * v2, 4)} - ${F.num(v1 * v1, 3)}) \approx ${F.num(dp, 2)}\,\text{kPa}$. Faster flow means lower pressure.`,
          };
        }
        if (v === 'hill') {
          const h = R.pick([2, 3, 4, 5, 6, 8, 12, 15, 20]);
          const v1 = R.pick([1, 2, 3, 4]), k = R.pick([1, 2, 3]);
          const v2 = v1 * k;
          const dp = (0.5 * rho * (v2 * v2 - v1 * v1) + rho * 10 * h) / 1000;
          const narrow = k > 1;
          return {
            q: raw`Water (density $1000\,\text{kg/m}^3$) is pumped steadily through a pipe that rises $${h}\,\text{m}$ from point 1 to point 2. ${narrow ? `The pipe's cross-sectional area at point 2 is $1/${k}$ of that at point 1, where the water moves at $${v1}\\,\\text{m/s}$.` : `The pipe has a uniform cross section and the water moves at $${v1}\\,\\text{m/s}$.`} Taking $g = 10\,\text{m/s}^2$, how much greater is the pressure at point 1 than at point 2?`,
            ...GRE.numeric(R, dp, [rho * 10 * h / 1000 - (narrow ? 0.5 * rho * (v2 * v2 - v1 * v1) / 1000 : -0.5 * rho * v1 * v1 / 1000), 0.5 * rho * (v2 * v2 - v1 * v1) / 1000 || 2 * dp, rho * 10 * h / 1000 + 0.5 * rho * v2 * v2 / 1000 + (narrow ? 0 : 0.5 * rho * v1 * v1 / 1000), dp / 2, 2 * dp].filter(x => x > 0), { unit: raw`\text{kPa}`, sig: 2, tol: 0.08 }),
            expl: raw`Bernoulli: $p_1 - p_2 = \rho g(z_2 - z_1) + \frac{1}{2}\rho(v_2^2 - v_1^2)$ with $v_2 = ${v2}\,\text{m/s}$ (continuity). That is $${F.num(rho * 10 * h / 1000, 3)}\,\text{kPa} + ${F.num(0.5 * rho * (v2 * v2 - v1 * v1) / 1000, 3)}\,\text{kPa} = ${F.num(dp, 3)}\,\text{kPa}$.`,
          };
        }
        const d = R.pick([2, 4, 5, 10]), Q = R.pick([0.5, 1, 2, 3, 5, 10]);
        const A = Math.PI * Math.pow(d / 200, 2), vv = Q / 1000 / A;
        return {
          q: raw`Water flows through a hose of inner diameter $${d}\,\text{cm}$ at a volume flow rate of $${F.num(Q, 2)}\,\text{L/s}$. The speed of the water in the hose is closest to`, level: 1,
          ...GRE.numeric(R, vv, [vv / 4, vv * 4, Q / 1000 / (Math.PI * Math.pow(d / 100, 2)) * 4 / 4 / 4, vv / Math.PI], { unit: raw`\text{m/s}`, sig: 2 }),
          expl: raw`$Q = Av$ with $A = \pi(d/2)^2 = ${F.sci(A, 2)}\,\text{m}^2$ and $Q = ${F.sci(Q / 1000, 2)}\,\text{m}^3/\text{s}$, so $v \approx ${F.num(vv, 2)}\,\text{m/s}$. Using the diameter instead of the radius in $\pi r^2$ gives a value 4 times too small.`,
        };
      },
    },
    {
      id: 'mech2.fl.torricelli', sec: '1.8.1', level: 2,
      gen(R) {
        const v = R.weighted(['speed', 'range', 'rate', 'ratio', 'press'], [2, 2, 2, 1, 1]);
        const tank = R.pick(['an open water tank', 'a large open barrel of water', 'a wide open reservoir']);
        if (v === 'speed') {
          const h = R.pick([0.2, 0.45, 0.8, 1.25, 1.8, 3.2, 5, 7.2]);
          const s = Math.sqrt(20 * h);
          return {
            q: raw`A small hole is opened in the side of ${tank}, $${F.num(h, 3)}\,\text{m}$ below the water surface. Taking $g = 10\,\text{m/s}^2$, the speed of the water emerging from the hole is closest to`, level: 1,
            ...GRE.numeric(R, s, [Math.sqrt(10 * h), 20 * h, s / 2, 2 * s], { unit: raw`\text{m/s}`, sig: 2 }),
            expl: raw`Bernoulli between the surface (pressure $p_0$, nearly at rest) and the jet (pressure $p_0$): $v = \sqrt{2gh} = \sqrt{2(10)(${F.num(h, 3)})} = ${F.num(s, 2)}\,\text{m/s}$ (Torricelli's law) — the speed of a body falling from the surface.`,
          };
        }
        if (v === 'range') {
          const [hh, y] = R.pick([[0.2, 0.8], [0.45, 0.8], [0.5, 2], [0.8, 0.2], [1, 1], [1.8, 0.2], [0.2, 1.8], [2, 0.5], [0.9, 0.4], [1.6, 0.9]]);
          const x = 2 * Math.sqrt(hh * y);
          return {
            q: raw`Water stands $${F.num(hh + y, 3)}\,\text{m}$ deep in ${tank} resting on level ground. A small hole is punched in the side wall $${F.num(y, 3)}\,\text{m}$ above the ground. How far from the base of the tank does the jet hit the ground?`,
            ...GRE.numeric(R, x, [Math.sqrt(hh * y), 4 * Math.sqrt(hh * y), 2 * Math.sqrt((hh + y) * y), 2 * Math.sqrt(hh * (hh + y))], { unit: raw`\text{m}`, sig: 2, tol: 0.08 }),
            expl: raw`The jet leaves horizontally at $v = \sqrt{2gh}$ with $h = ${F.num(hh, 3)}\,\text{m}$ of water above the hole, and falls $y = ${F.num(y, 3)}\,\text{m}$ in $t = \sqrt{2y/g}$. Range $x = vt = 2\sqrt{hy} = ${F.num(x, 2)}\,\text{m}$ (independent of $g$).`,
          };
        }
        if (v === 'rate') {
          const h = R.pick([0.2, 0.45, 0.8, 1.25, 1.8, 5]), Acm = R.pick([1, 2, 4, 5, 10]);
          const s = Math.sqrt(20 * h), Q = Acm * 1e-4 * s * 1000;
          return {
            q: raw`Water drains through a small hole of area $${Acm}\,\text{cm}^2$ near the bottom of ${tank}, where the water surface is $${F.num(h, 3)}\,\text{m}$ above the hole. Taking $g = 10\,\text{m/s}^2$ and ignoring any contraction of the jet, the volume flow rate is closest to`,
            ...GRE.numeric(R, Q, [Q / Math.SQRT2, Q * 10, Q / 10, Q * s], { unit: raw`\text{L/s}`, sig: 2 }),
            expl: raw`$v = \sqrt{2gh} = ${F.num(s, 2)}\,\text{m/s}$ and $Q = Av = (${Acm}\times 10^{-4}\,\text{m}^2)(${F.num(s, 2)}\,\text{m/s}) = ${F.sci(Q / 1000, 2)}\,\text{m}^3/\text{s} = ${F.num(Q, 2)}\,\text{L/s}$.`,
          };
        }
        if (v === 'ratio') {
          const n = R.pick([4, 9, 2, 16, 1 / 4]);
          return {
            q: raw`Water flows out of a small hole in the side of ${tank}. If the depth of water above the hole were ${n > 1 ? 'increased' : 'decreased'} by a factor of $${ex(n > 1 ? n : 1 / n)}$, by what factor would the outflow speed change?`, level: 1,
            ...mcNum(R, Math.sqrt(n), [n, n * n, 1 / Math.sqrt(n), 1 / n, 1], exM),
            expl: raw`Torricelli: $v = \sqrt{2gh} \propto \sqrt{h}$, so the factor is $\sqrt{${ex(n)}} = ${ex(Math.sqrt(n))}$.`,
          };
        }
        const h = R.pick([0.8, 1.25, 1.8, 3.2, 5]), dp = R.pick([10, 20, 30, 50, 100]);
        const s = Math.sqrt(20 * h + 2 * dp * 1000 / 1000);
        return {
          q: raw`A closed tank of water has air above the water at a gauge pressure of $${dp}\,\text{kPa}$. Water squirts from a small hole $${F.num(h, 3)}\,\text{m}$ below the water surface into the open air. Taking $g = 10\,\text{m/s}^2$ and $\rho = 1000\,\text{kg/m}^3$, the speed of the jet is closest to`, level: 3,
          ...GRE.numeric(R, s, [Math.sqrt(20 * h), Math.sqrt(2 * dp), Math.sqrt(20 * h) + Math.sqrt(2 * dp), Math.sqrt(10 * h + dp)], { unit: raw`\text{m/s}`, sig: 2, tol: 0.06 }),
          expl: raw`Bernoulli from the surface to the jet: $p_0 + \Delta p + \rho gh = p_0 + \frac{1}{2}\rho v^2$, so $v = \sqrt{2gh + 2\Delta p/\rho} = \sqrt{${F.num(20 * h, 3)} + ${2 * dp}} \approx ${F.num(s, 2)}\,\text{m/s}$. Speeds do not add; the squares do.`,
        };
      },
    },
    {
      id: 'mech2.fl.hydro', sec: '1.8.1', level: 1,
      gen(R) {
        const v = R.weighted(['gauge', 'window', 'depth', 'utube', 'straw'], [2, 2, 1, 2, 1]);
        const LQ = R.pick([['water', 1000], ['seawater', 1030], ['oil', 800], ['mercury', 13600], ['glycerin', 1260]]);
        if (v === 'gauge') {
          const h = R.pick([0.5, 1, 2, 3, 5, 10, 20, 50]);
          const abs = R.bool(0.4);
          const p = LQ[1] * 10 * h / 1000 + (abs ? 100 : 0);
          return {
            q: raw`What is the ${abs ? 'absolute' : 'gauge'} pressure at a depth of $${h}\,\text{m}$ in an open container of ${LQ[0]} (density $${LQ[1]}\,\text{kg/m}^3$)? Take $g = 10\,\text{m/s}^2$${abs ? ' and atmospheric pressure $100\\,\\text{kPa}$' : ''}.`,
            ...GRE.numeric(R, p, abs ? [p - 100, 100 + LQ[1] * h / 1000, 100 * (1 + h)] : [p * 10, p / 10, p + 100, LQ[1] * h / 1000], { unit: raw`\text{kPa}`, sig: 3, tol: 0.08 }),
            expl: raw`Hydrostatics (Bernoulli with $v = 0$): $\Delta p = \rho gh = ${LQ[1]}\times 10\times ${h}\,\text{Pa} = ${F.num(LQ[1] * 10 * h / 1000, 3)}\,\text{kPa}$${abs ? ', plus the atmospheric $100\\,\\text{kPa}$ on the surface' : ''}.`,
          };
        }
        if (v === 'window') {
          const h = R.pick([5, 10, 20, 50, 100]), A = R.pick([0.01, 0.04, 0.05, 0.1, 0.2]);

          return {
            q: raw`A submarine window of area $${F.num(A, 2)}\,\text{m}^2$ is $${h}\,\text{m}$ below the surface of the sea (density $\approx 1000\,\text{kg/m}^3$). The air inside is at atmospheric pressure. The net force the water exerts on the window is closest to (take $g = 10\,\text{m/s}^2$)`,
            ...GRE.numeric(R, 1000 * 10 * h * A, [(1000 * 10 * h + 1e5) * A, 1000 * h * A, 1000 * 10 * h / A, 100 * 10 * h * A], { unit: raw`\text{N}`, sig: 2, fmt: x => F.num(x, 2) }),
            expl: raw`Atmospheric pressure acts on both sides, so only the gauge pressure $\rho gh = ${F.num(1000 * 10 * h, 2)}\,\text{Pa}$ matters: $F = \rho ghA \approx ${F.num(1000 * 10 * h * A, 2)}\,\text{N}$.`,

          };
        }
        if (v === 'depth') {
          const n = R.pick([2, 3, 4, 5, 11]);
          return {
            q: raw`A diver descends in fresh water (density $1000\,\text{kg/m}^3$). At about what depth is the absolute pressure ${n === 2 ? 'twice' : n + ' times'} the atmospheric pressure at the surface ($1.0\times 10^5\,\text{Pa}$, $g = 10\,\text{m/s}^2$)?`,
            ...GRE.numeric(R, 10 * (n - 1), [10 * n, 10 * (n - 1) / 10, 100 * (n - 1), 5 * (n - 1)], { unit: raw`\text{m}`, sig: 2 }),
            expl: raw`$p_0 + \rho gh = ${n}p_0$ gives $h = \frac{${n - 1}p_0}{\rho g} = ${n - 1}\times 10\,\text{m} = ${10 * (n - 1)}\,\text{m}$: each $10\,\text{m}$ of water adds about one atmosphere. Forgetting the atmosphere already present at the surface gives $${10 * n}\,\text{m}$.`,
          };
        }
        if (v === 'utube') {
          const ro = R.pick([600, 700, 750, 800, 900]), h = R.pick([4, 5, 8, 10, 12, 20]);
          const hw = h * ro / 1000, diff = h - hw;
          return {
            q: raw`A U-tube open at both ends contains water (density $1000\,\text{kg/m}^3$). Oil of density $${ro}\,\text{kg/m}^3$, which does not mix with water, is poured into one arm until it forms a column $${h}\,\text{cm}$ tall. How far above the water surface in the other arm is the top of the oil column?`, level: 2,
            ...GRE.numeric(R, diff, [hw, h, h * (1000 / ro - 1), h * ro / 1000 / 2], { unit: raw`\text{cm}`, sig: 2 }),
            expl: raw`At the level of the oil–water interface the pressures in both arms are equal: $\rho_{\text{oil}}gh = \rho_wgh_w$, so the water stands $h_w = ${F.num(hw, 3)}\,\text{cm}$ above that level. The oil surface is higher by $${h} - ${F.num(hw, 3)} = ${F.num(diff, 2)}\,\text{cm}$.`,
          };
        }
        const L2 = R.pick([['water', 1000], ['mercury', 13600], ['oil', 800], ['ethanol', 790]]);
        const H = 1e5 / (L2[1] * 10);
        return {
          q: raw`Using a long straw and a perfect vacuum pump at the top, what is the greatest height to which atmospheric pressure ($1.0\times 10^5\,\text{Pa}$) can lift ${L2[0]} (density $${L2[1]}\,\text{kg/m}^3$)? Take $g = 10\,\text{m/s}^2$.`, level: 2,
          ...GRE.numeric(R, H, [H / 10, H * 10, H / 2, 2 * H], { unit: raw`\text{m}`, sig: 2 }),
          expl: raw`The column is pushed up only by atmospheric pressure, so $\rho gH = p_0$ and $H = \frac{10^5}{${L2[1]}\times 10} \approx ${F.num(H, 2)}\,\text{m}$ (about $10\,\text{m}$ for water, $0.76\,\text{m}$ for mercury — a barometer).`,
        };
      },
    },
    // ------------------------------------------------------------ 1.8.2 Buoyant forces
    {
      id: 'mech2.fl.float', sec: '1.8.2', level: 1, weight: 2,
      gen(R) {
        const v = R.weighted(['frac', 'dens', 'interface', 'raft', 'swap'], [3, 2, 2, 2, 2]);
        if (v === 'frac') {
          const O = R.pick([['ice', 920, 'seawater', 1030], ['ice', 900, 'fresh water', 1000], ['a block of pine', 500, 'water', 1000], ['a block of oak', 750, 'water', 1000], ['a cork', 250, 'water', 1000], ['a steel ball', 7800, 'mercury', 13600], ['a wooden block', 600, 'oil of density 800 kg/m³', 800], ['a plastic cube', 900, 'glycerin', 1260], ['a brass weight', 8400, 'mercury', 13600]]);
          const f = O[1] / O[3], above = R.bool(0.4);
          const ans = above ? 1 - f : f;
          return {
            q: raw`${O[0][0].toUpperCase() + O[0].slice(1)} (density $${O[1]}\,\text{kg/m}^3$) floats in ${O[2].replace(' of density 800 kg/m³', '')} (density $${O[3]}\,\text{kg/m}^3$). What fraction of its volume is ${above ? 'above' : 'below'} the surface?`,
            ...GRE.numeric(R, ans, [1 - ans, O[3] / O[1] - (above ? 1 : 0), ans * ans, Math.sqrt(ans), ans / 2].filter(x => x > 0 && x < 1.5), { sig: 2, tol: 0.15 }),
            expl: raw`Floating: weight = buoyant force, $\rho_{\text{obj}}Vg = \rho_{\text{fl}}V_{\text{sub}}g$, so $V_{\text{sub}}/V = ${O[1]}/${O[3]} \approx ${F.num(f, 2)}$${above ? raw` and the fraction above is $\approx ${F.num(1 - f, 2)}$` : ''}.`,
          };
        }
        if (v === 'dens') {
          const p = R.pick([10, 20, 25, 30, 40, 60, 75, 80]);
          return {
            q: raw`A uniform block floats in water (density $1000\,\text{kg/m}^3$) with $${p}\%$ of its volume above the surface. What is the density of the block?`,
            ...GRE.numeric(R, 1000 * (1 - p / 100), [1000 * p / 100, 1000 / (1 - p / 100), 1000 * (1 + p / 100), 500], { unit: raw`\text{kg/m}^3`, sig: 2 }),
            expl: raw`The submerged fraction equals $\rho_{\text{block}}/\rho_w$, so $\rho = (1 - ${p / 100})\times 1000 = ${1000 - 10 * p}\,\text{kg/m}^3$.`,
          };
        }
        if (v === 'interface') {
          const ro = R.pick([600, 700, 800]), rb = R.pick([750, 800, 850, 900, 950].filter(x => x > ro));
          const x = (rb - ro) / (1000 - ro);
          return {
            q: raw`A layer of oil (density $${ro}\,\text{kg/m}^3$) floats on water ($1000\,\text{kg/m}^3$). A block of density $${rb}\,\text{kg/m}^3$ floats at the interface, completely submerged, with part of it in the water and the rest in the oil. What fraction of its volume is in the water?`, level: 2,
            ...GRE.numeric(R, x, [rb / 1000, 1 - x, (rb - ro) / 1000, ro / 1000].filter(z => z > 0 && z < 1), { sig: 2, tol: 0.08 }),
            expl: raw`Buoyancy from both fluids balances the weight: $\rho_bV = \rho_wfV + \rho_o(1 - f)V$, so $f = \frac{\rho_b - \rho_o}{\rho_w - \rho_o} = \frac{${rb - ro}}{${1000 - ro}} \approx ${F.num(x, 2)}$.`,
          };
        }
        if (v === 'raft') {
          const V = R.pick([0.2, 0.5, 1, 1.5, 2, 3]), rr = R.pick([300, 400, 500, 600, 700]);
          const Mx = (1000 - rr) * V;
          return {
            q: raw`A raft is made of wood of density $${rr}\,\text{kg/m}^3$ and has a total volume of $${F.num(V, 2)}\,\text{m}^3$. What is the largest load mass it can carry in fresh water without the load getting wet (the raft just fully submerged)?`,
            ...GRE.numeric(R, Mx, [1000 * V, rr * V, (1000 + rr) * V, Mx / 2], { unit: raw`\text{kg}`, sig: 2 }),
            expl: raw`Fully submerged, the buoyant force is $\rho_wVg$; it must support raft plus load: $M = (\rho_w - \rho_{\text{raft}})V = (1000 - ${rr})(${F.num(V, 2)}) = ${F.num(Mx, 3)}\,\text{kg}$.`,
          };
        }
        const f1 = R.pick([0.4, 0.5, 0.6, 0.8, 0.9]), L2 = R.pick([['seawater', 1030], ['oil', 800], ['glycerin', 1260], ['brine', 1200]]);
        const f2 = f1 * 1000 / L2[1];
        if (f2 >= 1) throw new Error('sinks');
        return {
          q: raw`A block floats in fresh water with $${Math.round(f1 * 100)}\%$ of its volume submerged. If it is placed in ${L2[0]} of density $${L2[1]}\,\text{kg/m}^3$, what fraction of its volume will be submerged?`, level: 2,
          ...GRE.numeric(R, f2, [f1 * L2[1] / 1000, f1, 1 - f2, f1 * f1 * 1000 / L2[1]].filter(z => z < 1), { sig: 2, tol: 0.04 }),
          expl: raw`The submerged volume times the fluid density equals the block's mass, which is fixed: $f_2 = f_1\rho_w/\rho_2 = ${f1}\times 1000/${L2[1]} \approx ${F.num(f2, 2)}$. A denser fluid floats the block higher.`,
        };
      },
    },
    {
      id: 'mech2.fl.weigh', sec: '1.8.2', level: 2,
      gen(R) {
        const v = R.weighted(['app', 'dens', 'tension', 'scale', 'balloon'], [2, 2, 2, 2, 1]);
        if (v === 'app') {
          const O = R.pick([['aluminum', 2700], ['iron', 7900], ['lead', 11300], ['granite', 2700], ['copper', 8900], ['a glass marble', 2500]]);
          const W = R.pick([10, 20, 27, 50, 79, 100, 113]);
          const Wa = W * (1 - 1000 / O[1]);
          return {
            q: raw`An object made of ${O[0]} (density $${O[1]}\,\text{kg/m}^3$) weighs $${W}\,\text{N}$ in air. What does a spring scale read when the object hangs from it fully submerged in water?`,
            ...GRE.numeric(R, Wa, [W * 1000 / O[1], W, W * (1 + 1000 / O[1]), W * (1 - 1000 / O[1]) / 2], { unit: raw`\text{N}`, sig: 2, tol: 0.06 }),
            expl: raw`The buoyant force is the weight of displaced water, $W\rho_w/\rho = ${F.num(W * 1000 / O[1], 2)}\,\text{N}$, so the scale reads $W(1 - \rho_w/\rho) \approx ${F.num(Wa, 2)}\,\text{N}$.`,
          };
        }
        if (v === 'dens') {
          const W = R.pick([10, 12, 15, 20, 30, 40]), fr = R.pick([1 / 2, 1 / 3, 1 / 4, 1 / 5, 1 / 8, 1 / 10]);
          const Ww = W * (1 - fr), rho = 1000 / fr;
          return {
            q: raw`A crown weighs $${W}\,\text{N}$ in air and $${F.num(Ww, 3)}\,\text{N}$ when fully submerged in water (density $1000\,\text{kg/m}^3$). What is its average density?`,
            ...GRE.numeric(R, rho, [1000 * Ww / (W - Ww), 1000 * W / Ww, 1000 * (W - Ww) / W, 1000 * Ww / W], { unit: raw`\text{kg/m}^3`, sig: 2 }),
            expl: raw`The weight loss $W - W' = ${F.num(W - Ww, 3)}\,\text{N}$ equals $\rho_wVg$, while $W = \rho Vg$; dividing, $\rho = \rho_w\frac{W}{W - W'} = ${F.num(rho, 3)}\,\text{kg/m}^3$ (Archimedes' method).`,
          };
        }
        if (v === 'tension') {
          const V = R.pick([1, 2, 4, 5, 10]), rb = R.pick([100, 200, 250, 300, 500, 600]);
          const T = (1000 - rb) * V / 1000 * 10;
          return {
            q: raw`A ball of volume $${V}\,\text{L}$ and density $${rb}\,\text{kg/m}^3$ is held completely under water by a string tied to the bottom of a tank. Taking $g = 10\,\text{m/s}^2$, what is the tension in the string?`,
            ...GRE.numeric(R, T, [1000 * V / 1000 * 10, rb * V / 1000 * 10, (1000 + rb) * V / 1000 * 10, T / 10], { unit: raw`\text{N}`, sig: 2 }),
            expl: raw`Forces on the ball: buoyancy $\rho_wVg$ up, weight $\rho_bVg$ and tension $T$ down. So $T = (\rho_w - \rho_b)Vg = (${1000 - rb})(${V}\times 10^{-3})(10) = ${F.num(T, 2)}\,\text{N}$.`,
          };
        }
        if (v === 'scale') {
          const W0 = R.pick([20, 30, 40, 50]), V = R.pick([100, 200, 300, 500]), rho = R.pick([2700, 7900, 3000, 8900]);
          const B = 1000 * V * 1e-6 * 10, Wobj = rho * V * 1e-6 * 10;
          return {
            q: raw`A beaker of water sits on a scale that reads $${W0}\,\text{N}$. A metal block of volume $${V}\,\text{cm}^3$ and density $${rho}\,\text{kg/m}^3$, hanging from a string, is lowered until it is completely submerged without touching the beaker. Taking $g = 10\,\text{m/s}^2$, what does the scale now read?`, level: 3,
            ...GRE.numeric(R, W0 + B, [W0, W0 + Wobj, W0 + Wobj - B, W0 - B], { unit: raw`\text{N}`, sig: 3, tol: 0.03 }),
            expl: raw`By Newton's third law the block pushes down on the water with a force equal to the buoyant force $\rho_wVg = ${F.num(B, 2)}\,\text{N}$; the rest of its weight is carried by the string. The scale reads $${W0} + ${F.num(B, 2)} = ${F.num(W0 + B, 3)}\,\text{N}$.`,
          };
        }
        const V = R.pick([2, 5, 10, 20, 50]), mb = R.pick([0.5, 1, 2]);
        const L = (1.2 - 0.18) * V - mb;
        if (L <= 0) throw new Error('no lift');
        return {
          q: raw`A helium balloon has volume $${V}\,\text{m}^3$; the balloon fabric has mass $${F.num(mb, 2)}\,\text{kg}$. Air has density $1.2\,\text{kg/m}^3$ and helium $0.18\,\text{kg/m}^3$. What is the largest additional mass the balloon can lift?`, level: 2,
          ...GRE.numeric(R, L, [1.2 * V - mb, (1.2 - 0.18) * V, 1.2 * V, 0.18 * V], { unit: raw`\text{kg}`, sig: 2, tol: 0.06 }),
          expl: raw`The buoyant force equals the weight of displaced air, $1.2V$ kg$\cdot g$; subtract the helium ($0.18V$ kg) and the fabric: $M = (1.2 - 0.18)(${V}) - ${F.num(mb, 2)} \approx ${F.num(L, 2)}\,\text{kg}$.`,
        };
      },
    },
    {
      id: 'mech2.fl.concept', sec: '1.8.2', level: 2,
      gen(R) {
        if (R.bool(0.5)) {
          const S = R.pick([
            ['An ice cube floats in a glass of fresh water. When it has completely melted, the water level in the glass', 's', 'The floating ice displaces its own weight of water, which is exactly the volume its meltwater occupies.'],
            ['An ice cube with a small pebble frozen inside floats in a glass of water. When the ice has melted, the water level', 'f', 'While floating, the pebble displaces its weight of water (more than its volume); after melting it rests on the bottom displacing only its own volume.'],
            ['An ice cube with a cork bead frozen inside floats in a glass of water. When the ice has melted (the cork still floats), the water level', 's', 'Both ice and cork still displace exactly their own weight of water before and after melting.'],
            ['A boat carrying a heavy iron anchor floats in a swimming pool. The anchor is thrown overboard and sinks to the bottom. The water level of the pool', 'f', 'In the boat the anchor displaces its weight of water; on the bottom it displaces only its volume, which is much less since iron is denser than water.'],
            ['A boat carrying a wooden log floats in a pool. The log is thrown overboard and floats. The water level of the pool', 's', 'Floating either way, the log displaces its own weight of water.'],
            ['An ice cube made of fresh water floats in a glass of salt water. When it has melted, the water level', 'r', 'The ice displaces its weight of salt water; its meltwater, being less dense, takes up more volume than that.'],
            ['A boat floats in a closed lock. A bucket of water is scooped from the lock into the boat. The water level in the lock', 's', 'The boat sinks deeper by exactly the volume of water removed, since that water still floats (in the boat).'],
            ['A child sits in a small boat in a pool holding a bag of coins, then drops the coins into the water, where they sink. The water level of the pool', 'f', 'Coins in the boat displace their weight of water; on the bottom they displace only their volume.'],
          ]);
          const C = { s: 'remains the same', f: 'falls', r: 'rises', o: 'rises, then returns to its original level', d: 'rises or falls depending on the initial depth of the water' };
          return { q: S[0] + ':', ...GRE.mc(R, C[S[1]], Object.keys(C).filter(k => k !== S[1]).map(k => C[k])), expl: 'Archimedes: a floating object displaces its own weight of liquid; a sunken one displaces only its own volume. ' + S[2] };
        }
        const POOL = [
          ['The buoyant force on a fully submerged object equals the weight of the fluid it displaces.', 1],
          ['A floating object displaces a weight of fluid equal to its own weight.', 1],
          ['Fully submerged blocks of lead and of aluminum with equal volumes experience equal buoyant forces.', 1, 'they displace the same volume'],
          ['A block floating in water on the Moon floats with the same fraction submerged as on Earth.', 1, '$g$ cancels from $\\rho_bV = \\rho_wV_{\\text{sub}}$'],
          ['Inside a freely falling container, a submerged object experiences no buoyant force.', 1, 'with $g_{\\text{eff}} = 0$ there is no pressure gradient'],
          ['The buoyant force on a fully submerged brick increases as it sinks deeper into a lake of incompressible water.', 0, 'it depends only on displaced volume'],
          ['A floating object displaces a volume of fluid equal to its own volume.', 0, 'only its weight'],
          ['The buoyant force on a submerged object depends on the object\'s density.', 0, 'only on its volume and the fluid density'],
          ['A block floating in water on the Moon floats higher than on Earth because it weighs less there.', 0, 'buoyancy decreases by the same factor'],
          ['A ship floats higher in fresh water than in seawater.', 0, 'it floats lower in the less dense fresh water'],
        ];
        return romanQ(R, 'Which of the following statements about buoyancy is (are) true?', POOL, 'The buoyant force is $\\rho_{\\text{fluid}}V_{\\text{sub}}g$ — the weight of displaced fluid.');
      },
    },
    {
      id: 'mech2.fl.bob', sec: '1.8.2', level: 2,
      gen(R) {
        const v = R.weighted(['num', 'sym', 'ratio'], [3, 2, 2]);
        if (v === 'num') {
          const H = R.pick([10, 20, 40, 50, 80]), rb = R.pick([250, 400, 500, 600, 750, 800, 900]);
          const d = H * rb / 1000 / 100, T = 2 * Math.PI * Math.sqrt(d / 10);
          return {
            q: raw`A uniform wooden cube of side $${H}\,\text{cm}$ and density $${rb}\,\text{kg/m}^3$ floats upright in water. It is pushed down slightly and released. Taking $g = 10\,\text{m/s}^2$ and ignoring the motion of the water, the period of its vertical oscillations is closest to`,
            ...GRE.numeric(R, T, [2 * Math.PI * Math.sqrt(H / 100 / 10), 2 * Math.PI * Math.sqrt((H / 100 - d) / 10), T / (2 * Math.PI), 2 * T], { unit: raw`\text{s}`, sig: 2, tol: 0.08 }),
            expl: raw`Pushing the cube down by $y$ adds buoyant force $\rho_wAgy$, so $\omega^2 = \rho_wAg/m = g/d$, where $d = H\rho_b/\rho_w = ${F.num(d * 100, 3)}\,\text{cm}$ is the submerged depth. $T = 2\pi\sqrt{d/g} \approx ${F.num(T, 2)}\,\text{s}$.`,
          };
        }
        if (v === 'sym') {
          return {
            q: raw`A cylinder of mass $m$ and cross-sectional area $A$ floats upright in a liquid of density $\rho$. If it is pushed down slightly and released, what is the angular frequency of its vertical oscillations (neglect the liquid's motion and viscosity)?`,
            ...GRE.mc(R, mth(raw`\sqrt{\frac{\rho gA}{m}}`), [raw`\sqrt{\frac{m}{\rho gA}}`, raw`\sqrt{\frac{\rho g}{mA}}`, raw`\sqrt{\frac{\rho gA}{2m}}`, raw`\sqrt{\frac{\rho A}{m}}`, raw`\sqrt{\frac{\rho gA^2}{m}}`].map(mth)),
            expl: raw`An extra depth $y$ increases the buoyant force by $\rho gAy$: a restoring force with "spring constant" $k = \rho gA$, so $\omega = \sqrt{\rho gA/m}$. Dimensions eliminate the others.`,
          };
        }
        const n = R.pick([2, 4, 1 / 2, 1.25, 0.8]);
        const ans = Math.sqrt(n);
        return {
          q: raw`A floating block bobs vertically with angular frequency $\omega_0$ in water. It is moved to a liquid ${n > 1 ? 'more' : 'less'} dense than water by a factor of $${ex(n > 1 ? n : 1 / n)}$ (it still floats). What is its new angular frequency?`, level: 3,
          ...mcNum(R, ans, [n, 1, 1 / ans, 1 / n, n * n], x => { const e = F.exact(x); return e == null ? null : mth((e === '1' ? '' : e + raw`\,`) + raw`\omega_0`); }),
          expl: raw`$\omega^2 = \rho gA/m$ grows in proportion to the liquid density (equivalently $\omega^2 = g/d$ with the submerged depth $d \propto 1/\rho$), so $\omega = \sqrt{${ex(n)}}\,\omega_0 = ${ex(ans)}\,\omega_0$.`,
        };
      },
    },
  ]);
})(typeof window !== 'undefined' ? window.GRE : this.GRE);
