# Writing question templates

Each topic has a bank of **5000 unique questions per topic**. They come from *templates*:
small functions that build one GRE-style question from a seeded random generator.
`GRE.buildBank(topic)` cycles through all templates with new seeds and keeps only
unique questions until it has 5000. The key for "unique" is the stem plus the correct answer.

`js/topics/sr.js` is the reference implementation. Read it first.

## File layout

```js
(function (GRE) {
  'use strict';
  const F = GRE.fmt;
  const raw = String.raw;      // raw`...` keeps TeX backslashes; ${x} still interpolates

  GRE.addTemplates('<topicId>', [
    {
      id: '<topicId>.<slug>',  // unique within the topic (split topics: second file uses '<topicId>2.<slug>')
      sec: '1.3.3',            // a leaf section id from js/book.js
      level: 2,                // 1 easy, 2 typical GRE, 3 hard
      weight: 1,               // optional, default 1: how many questions per round (use 2–3 for rich, important templates)
      gen(R) {
        // ... build the question from R ...
        return { q, choices, ans, expl /*, fig, level */ };
      },
    },
  ]);
})(typeof window !== 'undefined' ? window.GRE : this.GRE);
```

`gen` may `throw` when a random draw is unusable (for example, it can't make 4 distinct distractors).
The engine then retries with a new seed. Keep throws rare.

## API

**Random: `R` (a `GRE.Rand`)**
`R.random()`, `R.int(a,b)` (inclusive), `R.real(a,b,dp)`, `R.step(a,b,st)`, `R.pick(arr)`,
`R.pickN(arr,n)` (distinct), `R.shuffle(arr)`, `R.bool(p)`, `R.sign()`, `R.weighted(items, weights)`.

**Formatting: `GRE.fmt` (as `F`).** These return TeX *without* `$` delimiters.
- `F.num(x, sig=2)`: decimal for 1e-3 ≤ |x| < 1e5, otherwise scientific notation.
- `F.sci(x, sig)` → `3 \times 10^{8}`. `F.fix(x, dp)` gives fixed decimals with zeros trimmed. `F.round(x, sig)` returns a number.
- `F.frac(n, d)` → `\frac{3}{4}` (reduced). `F.fracI(n,d)` → `3/4`. `F.coef(n,d)` → `''` for 1, `'-'` for −1.
- `F.sqrt(8)` → `2\sqrt{2}`.
- `F.exact(x)` writes a real number exactly when it can: `p/q`, `a√b/c`, `a/(c√d)`, cube roots. Otherwise it returns `null`.
  Use it for "by what factor…" answers that you compute numerically.

**Constants: `GRE.C`** (SI unless named): `c h hbar e me mp mn kB NA R eps0 mu0 k G sigma amu eV g atm`,
`hc_eVnm` (1240), `mec2_MeV`, `mpc2_MeV`, `a0`, `Ry_eV` (13.6), `wien`, `muB`, `muB_eVT`, `kB_eVK`.

**Answer choices.** Each builder returns `{choices, ans}`, so spread it: `...GRE.numeric(...)`.
- `GRE.numeric(R, correct, wrongs, opts)`: numerical answers.
  - Put the *mistake-based* wrong values first in `wrongs`: a missing factor of 2, a missing square root, the wrong formula, sin/cos swapped, and so on. It fills up with multiples if needed.
  - It keeps every pair ≥ `tol` (default 12%) apart and sorts the choices ascending, as the exam does. It also places the correct answer evenly across (A)–(E).
  - It wraps each choice in `$…$`.
  - `opts`: `unit` (TeX, e.g. `'\\text{m/s}'` or raw`\text{J}`), `sig`, `fmt: x => texString`, `tol`, `fill: [factors]`, `allowSign` (allow the opposite sign), `sort: false`.
- `GRE.mc(R, correct, wrongs, opts)`: string choices. Write the `$…$` inside your strings.
  - Duplicates are removed, and there must be ≥ 4 distinct wrong answers. If more are given, 4 are chosen at random (`opts.keep: k` always keeps the first k).
  - The choices are shuffled. Pass `opts.rank: s => number` or `opts.sort` to order them (for example, ascending fractions); the correct answer is still placed evenly.
- `GRE.roman(R, [bool,bool,bool])` plus `GRE.romanStem(intro, [s1,s2,s3])` give the classic "I only / I and II only / I, II, and III" format. At least one statement must be true.

## What a good template looks like (GRE style)

The real Physics GRE has 5 choices per question and about 1.7 minutes per question, without a calculator. Reproduce that **style**, but **write original questions**. Never copy questions from ETS practice tests or from the book's problems.

- **Vary meaningfully.** Draw the numbers, but also the scenario wording, objects, which quantity is asked for, and the direction of the question (solve for different variables). Several sub-variants per template is ideal. A template with a large parameter space can carry weight 2–3. Small conceptual pools are fine; they just contribute fewer questions.
- **Use the GRE question types:**
  - symbolic answers in the given variables, with distractors that fail a limiting case or dimensional analysis;
  - "closest to" numerical estimates with round numbers (GRE uses g ≈ 10 m/s² when it says so);
  - ratio/scaling questions ("if R doubles, by what factor does … change?");
  - conceptual "which statement is true" questions;
  - Roman-numeral I/II/III questions;
  - "which graph/plot/expression" style questions (use descriptions, or `fig`).
- **Distractors must come from real mistakes** and must be *unambiguously wrong*. No choice may be arguably correct. Watch for parameter draws where a distractor coincidentally equals the answer: the engine rejects exact duplicates, but you must also avoid ambiguous near-ties.
- **Correctness is the priority.**
  - Derive every formula carefully and compute answers in code, never by hand.
  - Double-check signs, factors of 2 and π, units, and the regime of validity (for example, non-relativistic speeds).
  - When in doubt, check against the book chapter.
- **Explanations** (`expl`): 1–3 sentences with the key equation and the fast GRE reasoning (limiting cases, dimensional analysis, conservation laws). Name the trap when there is a classic one.
- **Levels:** about 25% level 1, 55% level 2, 20% level 3.

## Text, TeX, HTML

- Inline math only: `$…$` (no `$$`). Everything must render in KaTeX; the validator checks this.
- Use `raw` template literals for TeX. Never write a literal `${` inside TeX: write `$^{4}\text{He}$`, not `${}^{4}$He`.
- Use `\,` before units and `\text{…}` for units and words: `$3.0\,\text{m/s}^2$`.
- Allowed HTML in stems and explanations: `<br>`, `<b>`, `<i>`, `<sub>`, `<sup>`, and whatever `GRE.romanStem` emits. Keep tags balanced.
- Don't use the words "undefined", "NaN" or "Infinity" anywhere; the validator flags them as bugs.
- **Optional figure:** `fig` is an inline SVG string.
  - Use `viewBox`, width ≤ 360 px, `stroke="currentColor"`, `fill="none"` (or `fill="currentColor"` for text), so it works in dark mode.
  - Use figures only when they help (circuits, ramps, potential curves). The stem must still be complete.

## Validate (required)

From the `gre-physics` folder:

```sh
JSC=/System/Library/Frameworks/JavaScriptCore.framework/Versions/Current/Helpers/jsc
$JSC tools/validate.js -- <topic> 10                 # whole topic, 10 random samples
$JSC tools/validate.js -- <topic> 6 5000 <slug>      # samples from templates whose id contains <slug>
$JSC tools/validate.js -- mech 10 2500 - mech-2      # only the file mech-2.js, smaller target
```

The run must end with `✓ all checks passed`, which means:
- the bank reaches the target;
- every template produces questions;
- every book section of your file has templates;
- all TeX renders;
- the answer letters are balanced.

Also **read the samples from every template** (use the filter argument) and fix any physics, wording or formatting problem you see. Look at the "largest template share" line: no template should be more than about 6% of the bank.
