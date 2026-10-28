"""Translate the Hinglish stage-01 master into Hindi and English.

Loads content/aiml/hinglish/stage-01.json, walks the structure, and writes translated copies to
content/aiml/hindi/stage-01.json and content/aiml/english/stage-01.json using the hand-written
translations in stage01_translations.txt (prose keyed by a source prefix, short labels keyed exactly).
Code stays byte-identical except the text after a '#' comment.
"""
import copy
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
BASE = "/home/claude/codeguru/content/aiml"


def load_table(path):
    tab, key = {}, None
    for line in open(path, encoding="utf-8"):
        line = line.rstrip("\n")
        if not line.strip() or line.startswith("#"):
            continue
        tag, _, val = line.partition(" ")
        if tag == "@":
            key = val.replace('\\"', '"')
            if key in tab:
                sys.exit(f"duplicate key: {key!r}")
            tab[key] = {}
        elif tag in ("H", "E"):
            tab[key][tag] = val.replace("⏎", "\n")
        else:
            sys.exit(f"bad line: {line!r}")
    for k, v in tab.items():
        if set(v) != {"H", "E"}:
            sys.exit(f"key needs H and E: {k!r}")
    return tab


class Tr:
    def __init__(self, tab, lang):
        self.tab, self.lang, self.used, self.missing = tab, lang, set(), []

    def prose(self, s):
        """Translate a prose field: longest key that the source starts with. Must exist."""
        best = max((k for k in self.tab if s.startswith(k)), key=len, default=None)
        if best is None:
            self.missing.append(s)
            return s
        self.used.add(best)
        return self.tab[best][self.lang]

    def label(self, s):
        """Short label/option: translate only on exact match, else keep (code-like)."""
        if isinstance(s, str) and s in self.tab:
            self.used.add(s)
            return self.tab[s][self.lang]
        return s

    def code(self, src):
        out = []
        for line in src.split("\n"):
            q, cut = None, None
            for i, ch in enumerate(line):
                if ch in "\"'" and q is None:
                    q = ch
                elif ch == q:
                    q = None
                elif ch == "#" and q is None:
                    cut = i
                    break
            if cut is not None:
                text = line[cut + 1:].strip()
                if text in self.tab:
                    self.used.add(text)
                    line = line[:cut + 1] + " " + self.tab[text][self.lang]
            out.append(line)
        return "\n".join(out)

    def sketch(self, sk):
        if not sk:
            return sk
        sk = copy.deepcopy(sk)
        if "title" in sk:
            sk["title"] = self.label(sk["title"])
        for f in ("steps", "items"):
            if f in sk:
                sk[f] = [({**i, "label": self.label(i["label"]), "value": self.label(i.get("value"))}
                          if isinstance(i, dict) else self.label(i)) for i in sk[f]]
        if "head" in sk:
            sk["head"] = [self.label(h) for h in sk["head"]]
        if "rows" in sk:
            sk["rows"] = [[self.label(c) for c in r] for r in sk["rows"]]
        for side in ("left", "right"):
            if side in sk:
                sk[side] = {"title": self.label(sk[side]["title"]), "items": [self.label(i) for i in sk[side]["items"]]}
        return sk


def translate(m, tr):
    t = copy.deepcopy(m)
    t["title"] = tr.prose(m["title"])
    t["goal"] = tr.prose(m["goal"])
    for les in t["lessons"]:
        les["title"] = tr.prose(les["title"])
        nb = []
        for b in les["blocks"]:
            k = b[0]
            if k in ("p", "tip", "warn", "analogy"):
                b = [k, tr.prose(b[1])]
            elif k == "list":
                b = [k, [tr.prose(x) for x in b[1]]]
            elif k == "sketch":
                b = [k, tr.sketch(b[1])]
            elif k == "code":
                b = [k, b[1], tr.code(b[2]), b[3]]
            nb.append(b)
        les["blocks"] = nb
    for sl in t["teach"]:
        sl["say"] = tr.prose(sl["say"])
        sl["sketch"] = tr.sketch(sl["sketch"])
        if sl.get("code"):
            sl["code"] = tr.code(sl["code"])
    for p in t["practice"]:
        p["q"] = tr.prose(p["q"])
        p["hint"] = tr.prose(p["hint"])
        p["starter"] = tr.code(p["starter"])
    for q in t["quiz"]:
        q["q"] = tr.prose(q["q"])
        q["why"] = tr.prose(q["why"])
        q["o"] = [tr.label(o) for o in q["o"]]
    for q in t["iq"]:
        q["q"] = tr.prose(q["q"])
        q["a"] = tr.prose(q["a"])
    return t


def main():
    tab = load_table(os.path.join(HERE, "stage01_translations.txt"))
    m = json.load(open(f"{BASE}/hinglish/stage-01.json", encoding="utf-8"))
    bad = 0
    for lang, folder in (("H", "hindi"), ("E", "english")):
        tr = Tr(tab, lang)
        t = translate(m, tr)
        for s in tr.missing:
            print(f"[{folder}] MISSING translation for: {s[:70]!r}")
        unused = [k for k in tab if k not in tr.used]
        for k in unused:
            print(f"[{folder}] unused key: {k[:70]!r}")
        bad += len(tr.missing) + len(unused)
        os.makedirs(f"{BASE}/{folder}", exist_ok=True)
        json.dump(t, open(f"{BASE}/{folder}/stage-01.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
        print(f"wrote {BASE}/{folder}/stage-01.json")
    sys.exit(1 if bad else 0)


if __name__ == "__main__":
    main()
