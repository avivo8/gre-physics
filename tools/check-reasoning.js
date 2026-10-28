/* Run with macOS jsc from the repository root.
 * Optional first argument: path to the pre-change core.js, for compatibility.
 * Example: git show main:js/core.js > /tmp/gre-core-before.js
 * jsc tools/check-reasoning.js -- /tmp/gre-core-before.js
 */
const baselinePath = typeof arguments !== 'undefined' && arguments[0];
load('js/core.js');
load('js/book.js');
const ids = GRE.topics.map(t => t.id);
for (const tid of ids) {
  load('js/topics/' + tid + '.js');
  if (['mech','em','qm'].includes(tid)) load('js/topics/' + tid + '-2.js');
}
load('js/topics/reasoning.js');
load('vendor/katex/katex.min.js');
let checks = 0;
function assert(ok, msg) { checks++; if (!ok) throw new Error(msg); }
const all = [];
for (const tid of ids) {
  const bank = GRE.buildBank(tid), reasoning = bank.filter(q => q.profile === 'reasoning');
  assert(bank.length === 5000 + reasoning.length, tid + ' appended count');
  assert(reasoning.length >= 8, tid + ' reasoning coverage');
  assert(new Set(bank.map(q => q.key)).size === bank.length, tid + ' unique keys');
  for (const q of reasoning) {
    assert(!GRE.check(q), q.tid + ' structure');
    for (const s of [q.q, q.expl].concat(q.choices)) {
      for (const match of s.matchAll(/\$([^$]+)\$/g)) katex.renderToString(match[1], {throwOnError:true,strict:'ignore'});
    }
  }
  for (let seed = 0; seed < 100; seed++) {
    const list = new GRE.Rand(tid + seed).shuffle(bank);
    const n = tid === 'mech' ? 14 : tid === 'em' ? 13 : 7;
    const picked = GRE.selectQuestions(list, n);
    assert(picked.length === n, tid + ' requested count');
    assert(new Set(picked.map(q => q.key)).size === n, tid + ' no repeats');
    assert(picked.filter(q => q.profile === 'reasoning').length === Math.round(n * .6), tid + ' balance');
    assert(new Set(picked.map(q => q.tid)).size === n, tid + ' template diversity');
  }
  const order = GRE.practiceOrder(bank);
  assert(order.length === bank.length, tid + ' practice length');
  assert(order.slice(0,5).filter(q => q.profile === 'reasoning').length === 3, tid + ' opening mix');
  assert(GRE.selectQuestions(bank, 20, 'reasoning').every(q => q.profile === 'reasoning'), tid + ' reasoning-only');
  assert(GRE.selectQuestions(bank.filter(q => q.profile !== 'reasoning'), 10).length === 10, tid + ' no reasoning fallback');
  assert(GRE.selectQuestions(reasoning, 100).length === reasoning.length, tid + ' exhausted drills fallback');
  all.push(...bank);
}
assert(all.filter(q => q.profile === 'reasoning').length === 84, '84 distinct curated questions');
assert(GRE.selectQuestions([], 10).length === 0, 'empty pool');
assert(GRE.selectQuestions(all, 0).length === 0, 'zero request');
assert(GRE.topics.reduce((s,t) => s+t.weight,0) === 100, 'topic percentages total 100');
assert(GRE.T.qm.weight === 13 && GRE.T.optics.weight === 8, 'current ETS weights');
// Re-run baseline engine against the same original templates and compare all
// original keys and numbered stems. New curated items must not disturb progress.
if (baselinePath) {
const current = Object.fromEntries(ids.map(tid => [tid, GRE.buildBank(tid).slice(0,5000).map(q => [q.key,q.q,q.num])]));
load(baselinePath);
load('js/book.js');
for (const tid of ids) {
  load('js/topics/' + tid + '.js');
  if (['mech','em','qm'].includes(tid)) load('js/topics/' + tid + '-2.js');
  const baseline = GRE.buildBank(tid).map(q => [q.key,q.q,q.num]);
  assert(JSON.stringify(current[tid]) === JSON.stringify(baseline), tid + ' all 5000 old keys/numbers unchanged');
}
print('All 45000 existing keys and numbers preserved.');
}
print('PASS: ' + checks + ' reasoning and selection checks.');
