# Brief for translators (Code Guru, AI/ML path)

The Hinglish master files are in /home/claude/codeguru/content/aiml/hinglish/stage-NN.json (schema:
/home/claude/codeguru/tools/SCHEMA.md). Produce two translations of each assigned stage:
- /home/claude/codeguru/content/aiml/hindi/stage-NN.json   — Hindi in Devanagari script.
- /home/claude/codeguru/content/aiml/english/stage-NN.json — simple, friendly English.

## What to translate
title, goal, lesson titles, text of p / tip / warn / analogy / list blocks, teach "say", sketch "title" and
sketch labels/steps/items/table cells that are plain words (keep code-like labels such as `name`, `"Akash"`,
`df.loc`, `[1, 2]`, numbers, function names as they are), practice "q" and "hint", quiz "q", "o" (options that are
code or numbers stay unchanged) and "why", iq "q" and "a".

## What must NOT change
- JSON structure, order and counts: same lessons, same blocks in the same order, same block types, same number of
  list items, same teach slides, same sketch kinds and same number of sketch items, same quiz answer index "a".
- Code: code blocks, teach "code", practice "starter"/"solution"/"expect" must stay byte-identical, EXCEPT that the
  text after a `#` comment may be translated. Never change string literals, variable names, or outputs (a Hinglish
  string inside print() stays Hinglish — it is code).
- Inline code in text (`like this`) stays as is. Keep **bold** markers.

## Style
- Same teaching tone as the master: very simple, short sentences, friendly, real-life examples, step by step.
- Hindi: natural spoken Hindi in Devanagari ("ध्यान से देखो", "आम गलती"), keep technical terms in English/Latin script
  (Python, variable, list, function, model, API, train/test split...). The user calls a job interview "IQ": use
  "IQ" in Hindi too (e.g. "IQ में पूछा जाता है").
- English: plain English for a beginner, keep "IQ" for job interview (e.g. "Common IQ question").
- Do not add or remove content; do not summarise.

## How to work
Load the master with Python, walk the structure, and write translated values into a copy, then json.dump with
ensure_ascii=False, indent=1. (Write the translations yourself; there is no translation library available.)
When done, run BOTH checks and fix until clean:
  python3 /home/claude/codeguru/tools/compare_lang.py hindi <your stage numbers>
  python3 /home/claude/codeguru/tools/compare_lang.py english <your stage numbers>
  cd /tmp/claude-0/-home-claude/e2cd7b73-1134-5d01-a087-dd461fc8abc5/scratchpad/vrun && python3 /home/claude/codeguru/tools/validate.py <your output files>
Report back briefly: files written and the check results.
