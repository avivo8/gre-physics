/* Validate a topic's question bank with macOS's built-in JavaScriptCore.
 *
 * Run from the gre-physics folder:
 *   JSC=/System/Library/Frameworks/JavaScriptCore.framework/Versions/Current/Helpers/jsc
 *   $JSC tools/validate.js -- <topic> [samples=6] [target=5000] [templateFilter] [files]
 *
 * By default loads js/topics/<topic>.js and, if present, js/topics/<topic>-2.js.
 * `files` (comma-separated, e.g. "mech-2") restricts loading to those files, so
 * one half of a split topic can be checked on its own (use a smaller target).
 *
 * Checks: bank reaches the target size, every template produces questions
 * without errors, every book section has templates, all TeX renders in KaTeX,
 * answer letters are spread out, no template dominates the bank.
 * Then prints sample questions (correct choice marked with *).
 */
var args = typeof arguments !== 'undefined' ? arguments : [];
var tid = args[0];
var nSample = args[1] != null ? +args[1] : 6;
var target = args[2] != null ? +args[2] : 5000;
var tplFilter = args[3] && args[3] !== '-' ? args[3] : '';
var files = args[4] ? args[4].split(',') : null;
if (!tid) { print('usage: jsc tools/validate.js -- <topic> [samples] [target] [templateFilter]'); quit(1); }

load('js/core.js');
load('js/book.js');
if (files) files.forEach(function (f) { load('js/topics/' + f + '.js'); });
else {
  load('js/topics/' + tid + '.js');
  try { load('js/topics/' + tid + '-2.js'); } catch (e) { if (!/Could not open|No such file|can't find/i.test(String(e))) throw e; }
}
var hasKatex = false;
try { load('vendor/katex/katex.min.js'); hasKatex = typeof katex !== 'undefined'; } catch (e) { print('(KaTeX not available: ' + e + ')'); }

var T = GRE.T[tid];
var problems = 0;
function bad(msg) { problems++; print('  ✗ ' + msg); }

var t0 = Date.now();
var bank = GRE.buildBank(tid, target);
var ms = Date.now() - t0;
print('\n=== ' + T.name + ' — ' + T.templates.length + ' templates, bank ' + bank.length + '/' + target + ' built in ' + ms + ' ms');
if (bank.length < target) bad('bank is short by ' + (target - bank.length) + ' questions (templates exhausted — add templates or widen parameter ranges)');

// ---- per-template report
var rep = GRE.debug[tid];
var maxShare = 0, maxId = '';
print('\n-- templates (n = questions in bank, err = failed generations, dup = duplicate draws)');
rep.forEach(function (r) {
  var flag = '';
  if (r.n === 0) { flag = '  <-- BROKEN'; }
  else if (r.errors > r.n) { flag = '  <-- many errors'; }
  if (r.dead && r.n < target / rep.length * 0.5) flag += '  (small pool: ' + r.n + ')';
  print('  ' + r.id + ' [' + r.sec + '] n=' + r.n + ' err=' + r.errors + ' dup=' + r.dups + flag + (r.errors ? '   last error: ' + r.lastErr : ''));
  if (r.n === 0) bad('template ' + r.id + ' produced nothing: ' + r.lastErr);
  var share = r.n / bank.length;
  if (share > maxShare) { maxShare = share; maxId = r.id; }
});
print('  largest template share: ' + (100 * maxShare).toFixed(1) + '% (' + maxId + ')');

// ---- section coverage
print('\n-- section coverage (questions per book section)');
var perLeaf = {};
bank.forEach(function (q) { perLeaf[q.sec] = (perLeaf[q.sec] || 0) + 1; });
T.sections.forEach(function (s) {
  s.subs.forEach(function (l) {
    var nT = T.templates.filter(function (t) { return t.sec === l.id; }).length;
    print('  ' + l.id + ' ' + l.name + ': ' + nT + ' templates, ' + (perLeaf[l.id] || 0) + ' questions');
    if (!nT) bad('no templates for section ' + l.id + ' ' + l.name);
  });
});

// ---- answer letters / levels
var letters = [0, 0, 0, 0, 0], levels = {};
bank.forEach(function (q) { letters[q.ans]++; levels[q.level] = (levels[q.level] || 0) + 1; });
print('\n-- answer letters A–E: ' + letters.join(' / ') + '    levels: ' + JSON.stringify(levels));
letters.forEach(function (n, i) { if (n < bank.length * 0.1) bad('answer letter ' + 'ABCDE'[i] + ' is rare (' + n + ')'); });

// ---- TeX
if (hasKatex) {
  var cache = {}, texFail = 0, shown = 0, failTpl = {};
  var t1 = Date.now();
  bank.forEach(function (q) {
    var texts = [q.q, q.expl].concat(q.choices);
    texts.forEach(function (s) {
      var re = /\$([^$]+)\$/g, m;
      var clean = s.replace(/\\\$/g, '');
      while ((m = re.exec(clean))) {
        var tex = m[1];
        if (cache[tex] === undefined) {
          try { katex.renderToString(tex, { throwOnError: true, strict: 'ignore' }); cache[tex] = ''; }
          catch (e) { cache[tex] = String(e.message || e); }
        }
        if (cache[tex]) {
          texFail++; failTpl[q.tid] = (failTpl[q.tid] || 0) + 1;
          if (shown++ < 12) print('  TeX error in ' + q.tid + ': $' + tex + '$ → ' + cache[tex]);
        }
      }
    });
  });
  print('\n-- KaTeX: ' + Object.keys(cache).length + ' distinct formulas checked in ' + (Date.now() - t1) + ' ms, ' + texFail + ' failures');
  if (texFail) bad('TeX failures by template: ' + JSON.stringify(failTpl));
}

// ---- HTML sanity: tags opened/closed
bank.slice(0, 2000).forEach(function (q) {
  [q.q, q.expl].concat(q.choices).forEach(function (s) {
    var opens = (s.match(/<(div|b|i|sub|sup|span|em|strong|table|tr|td)\b/g) || []).length;
    var closes = (s.match(/<\/(div|b|i|sub|sup|span|em|strong|table|tr|td)>/g) || []).length;
    if (opens !== closes && problems < 50) bad('unbalanced HTML in ' + q.tid + ': ' + s.slice(0, 100));
  });
});

// ---- samples
var pool = tplFilter ? bank.filter(function (q) { return q.tid.indexOf(tplFilter) >= 0; }) : bank;
var R = new GRE.Rand('samples|' + tid + '|' + tplFilter);
var samples = R.pickN(pool, Math.min(nSample, pool.length));
if (samples.length) print('\n-- ' + samples.length + ' sample questions' + (tplFilter ? ' matching "' + tplFilter + '"' : ''));
samples.forEach(function (q) {
  print('\n#' + q.num + '  ' + q.tid + '  [' + q.sec + ' ' + GRE.leafName(q.sec) + ']  level ' + q.level);
  print(q.q.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' '));
  q.choices.forEach(function (c, i) { print('   ' + (i === q.ans ? '*' : ' ') + '(' + 'ABCDE'[i] + ') ' + c); });
  print('   → ' + q.expl.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' '));
  if (q.fig) print('   [figure: ' + q.fig.length + ' chars of SVG]');
});

print('\n' + (problems ? '✗ ' + problems + ' problem(s) found' : '✓ all checks passed') + '\n');
