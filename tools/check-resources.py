"""Check the study resources of one or more topics.

Run from the gre-physics folder:
    python3 tools/check-resources.py mech            # one topic
    python3 tools/check-resources.py optics thermo   # several
    python3 tools/check-resources.py all             # every topic
    add --titles to print the real YouTube title/channel of every video

Checks that every book section of the topic has at least one reading and one
video, that each topic has general resources, that every entry is well formed,
that every link loads (HTTP status < 400), and that every YouTube video or
playlist exists (YouTube oEmbed lookup).
"""
import json
import os
import subprocess
import sys
import urllib.error
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor

JSC = '/System/Library/Frameworks/JavaScriptCore.framework/Versions/Current/Helpers/jsc'
UA = ('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 '
      '(KHTML, like Gecko) Chrome/126.0 Safari/537.36')
TOPICS = ['mech', 'em', 'optics', 'thermo', 'qm', 'atomic', 'sr', 'lab', 'spec']

os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
args = [a for a in sys.argv[1:] if not a.startswith('--')]
show_titles = '--titles' in sys.argv
tids = TOPICS if args in ([], ['all']) else args

loads = ''.join(f"try {{ load('js/resources/{t}.js'); }} catch (e) {{ print('LOADERROR {t}: ' + e); }}" for t in tids)
script = ("load('js/core.js'); load('js/book.js'); load('js/resources/index.js');" + loads +
          "print('JSON' + JSON.stringify({res: GRE.RES, topics: GRE.topics.map(t => ({id: t.id, name: t.name,"
          " leaves: t.sections.flatMap(s => s.subs.map(l => ({id: l.id, name: l.name})))}))}));")
out = subprocess.run([JSC, '-e', script], capture_output=True, text=True)
problems = []
for line in (out.stdout + out.stderr).splitlines():
    if line.startswith('LOADERROR') or 'Exception' in line or 'Error' in line and not line.startswith('JSON'):
        problems.append(line)
data = json.loads(next(l[4:] for l in out.stdout.splitlines() if l.startswith('JSON')))

items = []  # (where, item)
for t in data['topics']:
    if t['id'] not in tids:
        continue
    R = data['res'].get(t['id'], {'topic': [], 'leaves': {}})
    if len(R['topic']) < 2:
        problems.append(f"{t['id']}: needs at least 2 general topic resources (has {len(R['topic'])})")
    items += [(f"{t['id']} topic", it) for it in R['topic']]
    for leaf in t['leaves']:
        lst = R['leaves'].get(leaf['id'], [])
        kinds = {it.get('type') for it in lst}
        if 'read' not in kinds:
            problems.append(f"{leaf['id']} {leaf['name']}: no reading")
        if 'video' not in kinds:
            problems.append(f"{leaf['id']} {leaf['name']}: no video")
        urls = [it.get('url') for it in lst]
        if len(urls) != len(set(urls)):
            problems.append(f"{leaf['id']}: duplicate link")
        items += [(leaf['id'], it) for it in lst]

for where, it in items:
    for f in ['type', 'title', 'by', 'url']:
        if not isinstance(it.get(f), str) or not it[f].strip():
            problems.append(f"{where}: entry missing '{f}': {it}")
    if it.get('type') not in ('video', 'read'):
        problems.append(f"{where}: type must be 'video' or 'read': {it.get('title')}")
    if it.get('note') and len(it['note']) > 140:
        problems.append(f"{where}: note too long: {it['title']}")


def is_youtube(u):
    h = urllib.parse.urlparse(u).netloc
    return h.endswith('youtube.com') or h == 'youtu.be'


def fetch(url, timeout=25):
    req = urllib.request.Request(url, headers={'User-Agent': UA, 'Accept-Language': 'en'})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.status, r.read(200000)


def check(url):
    try:
        if is_youtube(url):
            st, body = fetch('https://www.youtube.com/oembed?format=json&url=' + urllib.parse.quote(url, safe=''))
            j = json.loads(body)
            return url, None, f"{j.get('title')} — {j.get('author_name')}"
        st, _ = fetch(url)
        return url, None if st < 400 else f'HTTP {st}', None
    except urllib.error.HTTPError as e:
        if is_youtube(url):
            return url, f'YouTube says this video/playlist does not exist or is private (HTTP {e.code})', None
        if e.code in (403, 429):  # some sites block scripts but work in a browser; retry once
            try:
                st, _ = fetch(url)
                return url, None if st < 400 else f'HTTP {st}', None
            except Exception as e2:
                return url, f'HTTP {e.code} (site may block scripts — open it in a browser to confirm)', None
        return url, f'HTTP {e.code}', None
    except Exception as e:
        return url, f'{type(e).__name__}: {e}', None


urls = sorted({it['url'] for _, it in items if isinstance(it.get('url'), str)})
with ThreadPoolExecutor(16) as ex:
    results = list(ex.map(check, urls))
bad = {u: err for u, err, _ in results if err}
titles = {u: t for u, _, t in results if t}
for where, it in items:
    u = it.get('url')
    if u in bad:
        problems.append(f"{where}: {it.get('title')} → {u}  [{bad[u]}]")

n_read = sum(1 for _, it in items if it.get('type') == 'read')
n_video = sum(1 for _, it in items if it.get('type') == 'video')
print(f"{', '.join(tids)}: {len(items)} entries ({n_read} readings, {n_video} videos), {len(urls)} distinct links checked")
if show_titles:
    for where, it in items:
        if it.get('url') in titles:
            print(f"  {where}: {titles[it['url']]}")
for p in problems:
    print('  ✗ ' + p)
print('✓ all resource checks passed' if not problems else f'✗ {len(problems)} problem(s)')
sys.exit(1 if problems else 0)
