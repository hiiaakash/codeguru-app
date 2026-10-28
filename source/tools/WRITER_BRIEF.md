# Brief for content writers (AI/ML Engineer path, Hinglish)

You are writing stages for "Code Guru", an offline Android tutor app that makes the user (Aakash, 25, a beginner
software developer at a cable company, basic Python) a job-ready AI/ML engineer. It works like a game:
14 stages, each unlocked only after scoring 80% in the previous stage's quiz.

Read first:
- Schema and rules: /home/claude/codeguru/tools/SCHEMA.md (follow exactly)
- Gold example (match its style, depth and tone): /home/claude/codeguru/content/aiml/hinglish/stage-01.json
- The user's own books (reuse ideas, examples and wording freely; they show the style he loves):
  /tmp/claude-0/-home-claude/e2cd7b73-1134-5d01-a087-dd461fc8abc5/scratchpad/src/*.txt
  (AIML_Python_Master_Book.txt is the main one; line numbers for each chapter are given in your task.)
  Read the relevant parts with offset/limit; do not read whole files.

Language: Hinglish in Roman script, exactly like the books ("Dibba", "Dhyan se dekh", "Common galti", "Tera practice").
Very simple words, short sentences, real-life analogies (chai, dukaan, factory, cricket, train), explain WHY.
Technical terms stay in English. Use "IQ" for job interview.

## The 14-stage AI/ML path (for context; write only your assigned stages)
1 Python Basics | 2 Conditions & Loops | 3 Functions & Modules | 4 Lists, Tuples, Sets, Dicts |
5 Files, Errors & OOP | 6 SQL & Databases | 7 APIs, HTTP & FastAPI | 8 NumPy & Pandas |
9 Data Visualization & Math for ML | 10 Machine Learning with scikit-learn | 11 Deep Learning & Neural Networks |
12 LLMs, Prompting, LangChain & RAG | 13 AI Agents, Fine-tuning & AI System Design | 14 Deploy, DSA, Portfolio & IQ Prep

Stages build on each other: do not re-teach earlier stages in depth, but you may recap in one line.

## Technical rules
- Write each stage to /home/claude/codeguru/content/aiml/hinglish/stage-NN.json (NN two digits).
- Build the JSON with a small Python script (json.dump with ensure_ascii=False, indent=1) to avoid escaping mistakes.
- Code blocks with an output are executed with local Python 3 (numpy 2.5, pandas 3.0, scikit-learn 1.9, matplotlib
  may NOT be installed — never give an output for plotting code). Outputs must match exactly. Keep printed outputs short.
  Use fixed seeds / random_state. For pandas, prefer printing small values (len, .shape, a single number, .tolist())
  rather than whole DataFrames, because table formatting is fragile.
- Code that needs internet, API keys, a server, a GPU, or libraries that are not installed (torch, tensorflow,
  transformers, langchain, openai, anthropic, fastapi server run, docker, git, sql databases) → give output "" (empty)
  and describe the result in a following ["p", ...] block instead. SQL/bash code blocks: output "" or a short
  hand-written result is fine (they are not executed), but keep them correct.
- Practice tasks: Python standard library only (the phone runs offline Python with no numpy/pandas). Make them
  meaningful for the stage topic, e.g. compute mean/std by hand, a tiny linear regression with lists, a cosine
  similarity, a word tokenizer, a mini RAG retriever with keyword overlap, a confusion-matrix count, a sqlite3 query
  (sqlite3 IS stdlib and works), a JSON API response parser. Deterministic output only. No input().
- Each stage: 4-6 lessons (substantial, like a book chapter: 8-20 blocks each), 8-10 teach slides, exactly 3
  practice, exactly 10 quiz (vary the correct index across 0-3), 10-12 IQ questions focused on what is really asked
  in AI/ML IQs at that level.
- Use sketches generously (at least one per lesson, most teach slides).
- When done, run: python3 /home/claude/codeguru/tools/validate.py <your files>
  Fix every error until TOTAL ERRORS: 0. Report back: file paths, counts per stage, and validator result. Keep the
  report short.
