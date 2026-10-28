"""Check a translated stage against its Hinglish master.

Usage: python3 compare_lang.py hindi|english [stage numbers...]
Structure (counts, block types, quiz answer index, sketch kinds) must match, code blocks must
be identical apart from '#' comment text, practice solution/expect must be identical, and the
translation must actually be in the target script.
"""
import json
import os
import re
import sys

BASE = "/home/claude/codeguru/content/aiml"
DEV = re.compile(r"[ऀ-ॿ]")


def strip_comments(code):
    out = []
    for line in code.split("\n"):
        # remove a trailing python/bash comment that is not inside quotes (simple heuristic)
        q = None
        cut = len(line)
        for i, ch in enumerate(line):
            if ch in "\"'" and q is None:
                q = ch
            elif ch == q:
                q = None
            elif ch == "#" and q is None:
                cut = i
                break
        out.append(line[:cut].rstrip())
    return "\n".join(out)


def texts(st):
    t = [st["title"], st["goal"]]
    for les in st["lessons"]:
        t.append(les["title"])
        for b in les["blocks"]:
            if b[0] in ("p", "tip", "warn", "analogy"):
                t.append(b[1])
            elif b[0] == "list":
                t += b[1]
    t += [s["say"] for s in st["teach"]]
    t += [q["q"] for q in st["quiz"]] + [q["why"] for q in st["quiz"]]
    t += [q["q"] for q in st["iq"]] + [q["a"] for q in st["iq"]]
    t += [p["q"] for p in st["practice"]]
    return t


def compare(lang, n):
    errs = []
    m = json.load(open(f"{BASE}/hinglish/stage-{n:02d}.json", encoding="utf-8"))
    p = f"{BASE}/{lang}/stage-{n:02d}.json"
    if not os.path.exists(p):
        return [f"missing {p}"]
    t = json.load(open(p, encoding="utf-8"))
    for f in ("n", "id"):
        if m[f] != t[f]:
            errs.append(f"{f} differs")
    for f in ("lessons", "teach", "practice", "quiz", "iq"):
        if len(m[f]) != len(t[f]):
            errs.append(f"{f} count {len(t[f])} != {len(m[f])}")
    for li, (a, b) in enumerate(zip(m["lessons"], t["lessons"])):
        if [x[0] for x in a["blocks"]] != [x[0] for x in b["blocks"]]:
            errs.append(f"lesson {li + 1} block types differ")
            continue
        for bi, (x, y) in enumerate(zip(a["blocks"], b["blocks"])):
            if x[0] == "code":
                if x[1] != y[1] or x[3] != y[3] or strip_comments(x[2]) != strip_comments(y[2]):
                    errs.append(f"L{li + 1}B{bi + 1} code/output changed")
            if x[0] == "sketch" and x[1].get("k") != y[1].get("k"):
                errs.append(f"L{li + 1}B{bi + 1} sketch kind changed")
            if x[0] == "list" and len(x[1]) != len(y[1]):
                errs.append(f"L{li + 1}B{bi + 1} list length changed")
    for i, (a, b) in enumerate(zip(m["practice"], t["practice"])):
        if a["solution"] != b["solution"] or a["expect"] != b["expect"]:
            errs.append(f"practice {i + 1} solution/expect changed")
        if strip_comments(a["starter"]) != strip_comments(b["starter"]):
            errs.append(f"practice {i + 1} starter code changed")
    for i, (a, b) in enumerate(zip(m["quiz"], t["quiz"])):
        if a["a"] != b["a"] or len(b["o"]) != 4:
            errs.append(f"quiz {i + 1} answer index changed")
    for i, (a, b) in enumerate(zip(m["teach"], t["teach"])):
        if bool(a.get("sketch")) != bool(b.get("sketch")) or (a.get("code") or "") and strip_comments(a.get("code") or "") != strip_comments(b.get("code") or ""):
            errs.append(f"teach {i + 1} sketch/code changed")
    tx = texts(t)
    dev = sum(1 for s in tx if DEV.search(s))
    if lang == "hindi" and dev < 0.85 * len(tx):
        errs.append(f"only {dev}/{len(tx)} text fields contain Devanagari")
    if lang == "english" and dev:
        errs.append(f"{dev} text fields contain Devanagari")
    if lang == "english":
        same = sum(1 for a, b in zip(texts(m), tx) if a == b and len(a) > 25 and " " in a)
        if same > 5:
            errs.append(f"{same} long text fields left untranslated")
    return errs


def main():
    lang = sys.argv[1]
    ns = [int(x) for x in sys.argv[2:]] or list(range(1, 15))
    tot = 0
    for n in ns:
        e = compare(lang, n)
        tot += len(e)
        print(f"{lang} stage-{n:02d}: {'OK' if not e else e}")
    print("TOTAL MISMATCHES:", tot)
    sys.exit(1 if tot else 0)


if __name__ == "__main__":
    main()
