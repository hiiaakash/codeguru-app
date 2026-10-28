# Code Guru content pack schema

A pack = one job role in one language. Bundled packs are JS files that call `CG_PACK({...})`.
Imported packs are plain JSON with the same object.

Content is authored as one JSON file per stage: `content/<role>/<lang>/stage-NN.json` (NN = 01..14).
The build script merges them into `www/packs/<role>.<lang>.js`.

## Stage object

```json
{
  "n": 1,
  "id": "aiml-01",
  "title": "Python Basics",
  "goal": "One or two sentences: what you can do after this stage.",
  "lessons": [ { "title": "...", "blocks": [ BLOCK, ... ] } ],
  "teach":   [ { "say": "...", "sketch": SKETCH_or_null, "code": "optional short code or null" } ],
  "practice":[ { "q": "...", "starter": "code shown in editor", "expect": "exact stdout", "hint": "...", "solution": "..." } ],
  "quiz":    [ { "q": "...", "o": ["A","B","C","D"], "a": 0, "why": "..." } ],
  "iq":      [ { "q": "...", "a": "..." } ]
}
```

Required counts per stage: lessons 3-6, teach 6-10 slides, practice exactly 3, quiz exactly 10, iq 8-12.
Passing the quiz needs 80% (8 of 10).

## Blocks (inside lessons)

Each block is an array whose first item is the type:

| Block | Form | Notes |
|---|---|---|
| paragraph | `["p", "text"]` | Inline `**bold**` and `` `code` `` allowed. `\n` = line break. |
| code | `["code", "python", "source", "exact output or empty string"]` | lang: python, js, sql, bash, text. If output is given it MUST be exactly what the code prints. |
| sketch | `["sketch", SKETCH]` | Drawn diagram, see below. Use at least one per lesson where it helps. |
| tip | `["tip", "text"]` | "Dhyan se dekh" style highlight. |
| warn | `["warn", "text"]` | Common mistake. |
| list | `["list", ["item", "item"]]` | Bullet list. |
| analogy | `["analogy", "text"]` | Real-life comparison (chai, dukaan, dibba, train...). |

## Sketches (drawn by the app in a hand-drawn style)

Keep labels short (max ~18 characters per label; the app wraps longer text). Any `title` is optional.

- `{"k":"boxes","title":"...","items":[{"label":"name","value":"\"Akash\""}]}` — labelled boxes (variables, memory).
- `{"k":"flow","title":"...","steps":["Input","Process","Output"],"dir":"h"}` — arrows between steps. dir "h" or "v". 2-6 steps.
- `{"k":"cycle","title":"...","steps":["Check","Run body","Update"]}` — loop/circle, 3-6 steps.
- `{"k":"array","title":"...","items":["10","20","30"],"index":true}` — cells with indexes (lists, strings).
- `{"k":"stack","title":"...","items":["top","...","bottom"]}` — vertical stack (call stack, layers).
- `{"k":"tree","title":"...","root":{"label":"...","children":[{"label":"...","children":[]}]}}` — max depth 3, max 4 children.
- `{"k":"layers","title":"...","layers":[3,4,2],"labels":["Input","Hidden","Output"]}` — neural network.
- `{"k":"table","title":"...","head":["col","col"],"rows":[["a","b"]]}` — max 6 rows x 4 cols.
- `{"k":"compare","title":"...","left":{"title":"List","items":["..."]},"right":{"title":"Tuple","items":["..."]}}` — two columns, max 5 items each.
- `{"k":"chart","title":"...","type":"line|scatter|bar","points":[[1,2],[2,4]],"line":[[0,0],[5,10]],"xl":"x label","yl":"y label"}` — "line" optional (e.g. regression line). For bar: points [[label,value]] with string labels.

## Rules for writers

1. Language style must match the user's Master Books: very simple, short sentences, everyday examples, friendly "tu/tum" tone, "Dhyan se dekh", "Common galti", step-by-step. Explain WHY, not only WHAT.
2. Say "IQ" for job interview (user's own word): "IQ question", "IQ mein poocha jaata hai".
3. Every `code` block with an output must be correct; outputs are verified by running Python. For numpy/pandas/sklearn examples keep outputs deterministic (fixed random_state/seed) and short.
4. `practice` must use ONLY the Python standard library (the app runs offline Python without numpy/pandas). `expect` = exact stdout of `solution` (trailing newline ignored). The `starter` is a partly filled template with `# TODO` comments.
5. Quiz: 4 options, exactly one correct, `a` is the 0-based index of the correct option. Vary which index is correct. `why` explains in 1-2 sentences.
6. IQ answers: 2-5 sentences, the way a good candidate would answer, plus a tiny code line when useful.
7. Teach slides are what a teacher says while drawing on the board: 1-3 short sentences each, conversational, building up the idea step by step. Most slides should have a sketch.
8. No copyrighted text copied from outside sources. The user's own books may be reused and reworded freely.
9. Output must be valid JSON (UTF-8, double quotes, no trailing commas, no comments).
