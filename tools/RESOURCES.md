# Adding study resources

Every topic and every book section in the app links to free readings and YouTube videos. The links live in `js/resources/<topic>.js`. The section ids come from `js/book.js`.

The app adds the *Conquering the Physics GRE* section and page number automatically, so don't list the book.

```js
GRE.addResources('mech', {
  topic: [   // 2–4 broad resources for the whole topic
    { type: 'video', title: 'MIT 8.01 Classical Mechanics (full lecture series)', by: 'MIT OpenCourseWare',
      url: 'https://www.youtube.com/playlist?list=…', note: 'Complete intro course; watch selectively.' },
    { type: 'read', title: 'University Physics Vol. 1', by: 'OpenStax', url: 'https://openstax.org/…' },
  ],
  '1.3.3': [  // one entry per leaf section id
    { type: 'read', title: 'Rolling motion', by: 'HyperPhysics', url: 'http://hyperphysics.phy-astr.gsu.edu/hbase/…' },
    { type: 'video', title: 'Rolling Without Slipping …', by: 'Flipping Physics', url: 'https://www.youtube.com/watch?v=…',
      note: '12 min; derives v = sqrt(2gh/(1+I/mr²)).' },
  ],
});
```

## What to include

**Every leaf section** needs at least **1 reading** and **1 video**; aim for 2–3 entries. A good mix is:
- a reading page that covers exactly that idea;
- a short, clear concept video;
- for harder topics, a deeper lecture or a worked Physics-GRE-style problem.

**The topic** needs 2–4 broad entries. Examples:
- a full free lecture course or playlist;
- a free textbook (or the matching chapters of one);
- a GRE-focused review if a good one exists.

## Quality rules

- **Relevant:** the resource must teach that subsection's concept at roughly GRE level (upper-undergraduate for QM, stat mech, advanced E&M and Lagrangians).
- **Reputable and free:** no login, paywall or piracy.
  - Readings: HyperPhysics, OpenStax, LibreTexts, MIT OpenCourseWare notes, The Feynman Lectures (feynmanlectures.caltech.edu), university course notes, Wikipedia (only when nothing better covers the idea).
  - Videos: MIT OCW, Khan Academy, Flipping Physics, Professor Dave Explains, Michel van Biezen, Physics with Professor Matt Anderson, Brant Carlson, DrPhysicsA, Eigenchris, Stanford/Susskind, 3Blue1Brown, and similar.
  - Avoid Chegg, Course Hero, scribd and spam channels.
- **English.** Videos should preferably be under about 30 minutes; you can link a long lecture at a timestamp (`&t=754s`).
- **Never invent a URL or a YouTube id.** Every link must come from a search result or a page you actually opened.
  - YouTube links must look like `https://www.youtube.com/watch?v=ID` (optionally `&t=…s`) or `https://www.youtube.com/playlist?list=ID`.
  - No tracking parameters.
- **Fields:**
  - `title`: the resource's real title (the checker prints YouTube's own title; shorten if very long).
  - `by`: the channel or site.
  - `note` (optional, ≤ 12 words): what it covers and why it's useful, or its length.

## Check (required)

From the `gre-physics` folder:

```sh
python3 tools/check-resources.py <topic> --titles
```

The run must end with `✓ all resource checks passed`. Read the printed YouTube titles and channels: each one must really be about the section it is listed under. Replace anything off-topic, low quality or broken.
