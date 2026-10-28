# GRE Physics Trainer

An offline practice course for the Physics GRE. It has 84 original reasoning questions alongside 45,000 generated calculation and mixed-style variants across the nine content areas of the exam, organized by the chapters and sections of *Conquering the Physics GRE* (Kahn & Anderson).

## Start

**Online:** https://avivo8.github.io/gre-physics/

**On your phone:** open that link once, then add it to your home screen. It then opens like an app and works offline.
- iPhone (Safari): Share → Add to Home Screen.
- Android (Chrome): ⋮ → Add to Home screen / Install app.

**On this computer:** double-click `index.html`.

## Question style

The default GRE-style mix targets about 60% curated reasoning questions and 40% existing drills, when the selected pool permits. This is an editorial study balance, **not a claimed ETS question-type percentage**. Full tests apply this mix within each topic. Practice interleaves three reasoning questions with two drills until a pool is exhausted; quizzes avoid repeated templates where possible. Small section filters, difficulty filters, removed questions, or exhausted pools can change that balance. Reasoning-only and full-bank modes are also available in Practice and Quiz. Number order preserves numerical order rather than interleaving.

The 84 added questions cover conceptual principles, proportional reasoning, graph interpretation, experimental design and uncertainty. Each fixed stem counts once, not once per answer shuffle. Explanations identify a physical principle and a common trap. Original bank question numbers, progress keys, bookmarks and saved tests are preserved; new questions are appended.

Reference: [ETS content outline](https://www.ets.org/gre/test-takers/subject-tests/about/content-structure.html) and [official practice book](https://www.ets.org/content/dam/ets-org/pdfs/gre/practice-book-physics.pdf). The questions are independently written, not official ETS questions. Four new questions include diagrams; other graph questions use textual descriptions. This does not reproduce the full visual range of the real exam.

## How to study

| Mode | What it does |
|---|---|
| **Practice** | One question at a time. Pick a choice and you immediately see whether it is right, plus a short explanation of the fastest solution. Or tap **Show answer** to see the answer and explanation without answering (it doesn't count toward your score). |
| **Quiz** | 10–100 questions from the topics and book sections you choose, optionally timed at GRE pace (about 1.7 min per question). Score and explanations come at the end. |
| **Full practice test** | A complete exam with the real test's topic weights, shuffled together. Formats: current (70 questions in 2 h), classic (100 in 2 h 50 min), or half-length. Includes the constants sheet, mark-for-review and a question overview, like the real test. |

In Practice and Quiz you can choose any combination of topics, book sections and subsections, and difficulty (easy, medium or hard). You can also choose which questions to draw: new ones first, any, only the ones you got wrong, or only bookmarked ones. In Practice you can jump straight to a question number, for example Mechanics Q #1234.

**Study guide (Learn):** free readings and YouTube videos for every topic and for each of the 141 book sections: 641 links, all checked to load. Each section card also shows where that section starts in *Conquering the Physics GRE* and has a button to practice just that section. After every answer, a **Study this** row links the best video and reading for that question's section. Tap the section name above any question to see all its resources.

**Remove a question:** tap **Remove** next to the bookmark star (in Practice, or when reviewing quiz/test answers). The question won't be drawn again in any practice session, quiz or test. Undo right away, or restore it later from the Progress page.

**Progress page:** your accuracy per topic and per book section, the history of your quizzes and tests (each can be re-reviewed), your removed questions, and export or import of your progress. Progress is saved automatically in each browser separately, so your phone and computer keep their own progress. To carry it over, use Export on one device and Import on the other.

**Keyboard shortcuts:** <kbd>A</kbd>–<kbd>E</kbd> (or <kbd>1</kbd>–<kbd>5</kbd>) to answer, <kbd>S</kbd> to show the answer, <kbd>Enter</kbd>/<kbd>→</kbd> to go to the next question, <kbd>←</kbd> to go back in a test, <kbd>M</kbd> to mark a question for review, <kbd>B</kbd> to bookmark it.

## Topics (with weight on the real exam)

| Topic | Book chapter | Exam weight |
|---|---|---|
| Classical Mechanics | 1 | 20% |
| Electromagnetism | 2 | 18% |
| Quantum Mechanics | 5.1–5.6 | 13% |
| Thermodynamics & Statistical Mechanics | 4 | 10% |
| Atomic Physics | 5.7 | 10% |
| Optics & Wave Phenomena | 3 | 8% |
| Specialized Topics | 8 | 9% |
| Special Relativity | 6 | 6% |
| Laboratory Methods | 7 | 6% |

## How the questions are made

The questions are not copied from ETS practice tests or from the book. Each one comes from a hand-written *template* that encodes a GRE question pattern, such as:

- a symbolic answer whose wrong choices fail a limiting case;
- a "closest to" estimate;
- a scaling or ratio question;
- a Roman-numeral I/II/III question;
- a conceptual statement question.

The template draws the scenario, the numbers, and which quantity is asked for. It computes the correct answer from the physics, and builds the wrong choices from typical mistakes (a missing factor of 2, a wrong power, sin instead of cos, the non-relativistic formula, and so on). A seeded generator makes every bank stable: question #1234 of a topic is always the same question.

`tools/validate.js` checks every bank:

- it reaches at least 5,000 unique questions per topic, plus that topic’s curated additions;
- every template works;
- every book section is covered;
- all math renders;
- the correct answer is spread evenly over (A)–(E).

To run it (on macOS, from this folder):

```sh
/System/Library/Frameworks/JavaScriptCore.framework/Versions/Current/Helpers/jsc tools/validate.js -- mech 5
```

To verify reasoning-only selection, balanced sampling, fallback, and original progress compatibility:

```sh
git show main:js/core.js > /tmp/gre-core-before.js
/System/Library/Frameworks/JavaScriptCore.framework/Versions/Current/Helpers/jsc tools/check-reasoning.js -- /tmp/gre-core-before.js
```

The baseline argument is optional; omit it to test current selection only.

Topic ids: `mech em optics thermo qm atomic sr lab spec`. See `tools/AUTHORING.md` to add more question templates.

After changing any app file, run `python3 tools/build-sw.py` so installed copies pick up the new version.

To add or change study links, see `tools/RESOURCES.md`, then check them with `python3 tools/check-resources.py all`.
