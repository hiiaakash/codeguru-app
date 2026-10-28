"""Validate Code Guru stage JSON files.

Usage: python3 validate.py FILE_OR_DIR [...] [--no-run]
Checks structure, counts, sketch specs, and (unless --no-run) runs every python code
block that declares an output plus every practice solution, comparing stdout exactly.
"""
import json
import os
import subprocess
import sys

SKETCH_KINDS = {"boxes", "flow", "cycle", "array", "stack", "tree", "layers", "table", "compare", "chart"}
BLOCK_TYPES = {"p", "code", "sketch", "tip", "warn", "list", "analogy"}
STDLIB_BAN = ("import numpy", "import pandas", "from sklearn", "import sklearn", "import torch",
              "import matplotlib", "from numpy", "from pandas", "import requests", "from transformers")


def run_py(src, timeout=60):
    try:
        r = subprocess.run([sys.executable, "-I", "-c", src], capture_output=True, text=True, timeout=timeout,
                           env={**os.environ, "PYTHONHASHSEED": "0", "MPLBACKEND": "Agg"})
    except subprocess.TimeoutExpired:
        return None, "timeout"
    return r.stdout, r.stderr


def norm(s):
    return "\n".join(line.rstrip() for line in s.replace("\r\n", "\n").strip("\n").split("\n"))


def check_sketch(sk, where, errs):
    if not isinstance(sk, dict) or sk.get("k") not in SKETCH_KINDS:
        errs.append(f"{where}: bad sketch kind {sk!r:.80}")
        return
    k = sk["k"]
    need = {"boxes": ["items"], "flow": ["steps"], "cycle": ["steps"], "array": ["items"], "stack": ["items"],
            "tree": ["root"], "layers": ["layers"], "table": ["head", "rows"], "compare": ["left", "right"],
            "chart": ["points"]}[k]
    for f in need:
        if f not in sk:
            errs.append(f"{where}: sketch {k} missing {f}")
    if k == "boxes" and any(not isinstance(i, dict) or "label" not in i for i in sk.get("items", [])):
        errs.append(f"{where}: boxes items need label/value")
    if k == "table":
        for row in sk.get("rows", []):
            if len(row) != len(sk.get("head", [])):
                errs.append(f"{where}: table row length != head length")
    if k == "compare":
        for side in ("left", "right"):
            s = sk.get(side, {})
            if not isinstance(s, dict) or "items" not in s:
                errs.append(f"{where}: compare.{side} needs title/items")
    if k == "layers" and not all(isinstance(x, int) and 1 <= x <= 8 for x in sk.get("layers", [])):
        errs.append(f"{where}: layers must be ints 1..8")


def validate(path, run=True):
    errs, warns = [], []
    try:
        st = json.load(open(path, encoding="utf-8"))
    except Exception as e:
        return [f"{path}: invalid JSON: {e}"], []
    w = os.path.basename(path)
    for f in ("n", "id", "title", "goal", "lessons", "teach", "practice", "quiz", "iq"):
        if f not in st:
            errs.append(f"{w}: missing {f}")
    if errs:
        return errs, warns
    if not 3 <= len(st["lessons"]) <= 6:
        errs.append(f"{w}: lessons count {len(st['lessons'])} (need 3-6)")
    if not 6 <= len(st["teach"]) <= 10:
        errs.append(f"{w}: teach count {len(st['teach'])} (need 6-10)")
    if len(st["practice"]) != 3:
        errs.append(f"{w}: practice count {len(st['practice'])} (need 3)")
    if len(st["quiz"]) != 10:
        errs.append(f"{w}: quiz count {len(st['quiz'])} (need 10)")
    if not 8 <= len(st["iq"]) <= 12:
        errs.append(f"{w}: iq count {len(st['iq'])} (need 8-12)")
    for li, les in enumerate(st["lessons"]):
        if not les.get("title") or not isinstance(les.get("blocks"), list) or not les["blocks"]:
            errs.append(f"{w}: lesson {li} needs title and blocks")
            continue
        for bi, b in enumerate(les["blocks"]):
            where = f"{w} L{li + 1}B{bi + 1}"
            if not isinstance(b, list) or not b or b[0] not in BLOCK_TYPES:
                errs.append(f"{where}: bad block {str(b)[:60]}")
                continue
            t = b[0]
            if t == "code":
                if len(b) != 4:
                    errs.append(f"{where}: code block must be [code, lang, src, out]")
                    continue
                lang, src, out = b[1], b[2], b[3]
                if run and lang == "python" and out and "input(" not in src:
                    so, se = run_py(src)
                    if so is None:
                        errs.append(f"{where}: timeout")
                    elif norm(so) != norm(out):
                        errs.append(f"{where}: output mismatch\n  expected: {out!r:.200}\n  actual:   {so!r:.200}\n  stderr: {se[-200:]!r}")
            elif t == "sketch":
                check_sketch(b[1] if len(b) > 1 else None, where, errs)
            elif t == "list":
                if len(b) != 2 or not isinstance(b[1], list):
                    errs.append(f"{where}: list block must be [list, [items]]")
            elif len(b) != 2 or not isinstance(b[1], str):
                errs.append(f"{where}: {t} block must be [{t}, text]")
    for ti, sl in enumerate(st["teach"]):
        if not sl.get("say"):
            errs.append(f"{w}: teach {ti} missing say")
        if sl.get("sketch"):
            check_sketch(sl["sketch"], f"{w} teach{ti + 1}", errs)
    for pi, p in enumerate(st["practice"]):
        where = f"{w} practice{pi + 1}"
        for f in ("q", "starter", "expect", "hint", "solution"):
            if f not in p:
                errs.append(f"{where}: missing {f}")
        sol = p.get("solution", "")
        if any(x in sol for x in STDLIB_BAN):
            errs.append(f"{where}: practice must use stdlib only")
        if run and sol and "input(" not in sol:
            so, se = run_py(sol)
            if so is None or norm(so) != norm(p.get("expect", "")):
                errs.append(f"{where}: solution output != expect\n  expect: {p.get('expect')!r:.200}\n  actual: {so!r:.200}\n  stderr: {(se or '')[-200:]!r}")
        if "input(" in sol:
            errs.append(f"{where}: practice must not use input()")
    idx = []
    for qi, q in enumerate(st["quiz"]):
        where = f"{w} quiz{qi + 1}"
        if len(q.get("o", [])) != 4:
            errs.append(f"{where}: needs 4 options")
        if not isinstance(q.get("a"), int) or not 0 <= q["a"] < len(q.get("o", [])):
            errs.append(f"{where}: bad answer index")
        if len(set(q.get("o", []))) != len(q.get("o", [])):
            errs.append(f"{where}: duplicate options")
        if not q.get("why"):
            errs.append(f"{where}: missing why")
        idx.append(q.get("a"))
    if idx and max(idx.count(i) for i in set(idx)) > 6:
        warns.append(f"{w}: quiz answers not varied {idx}")
    for ii, q in enumerate(st["iq"]):
        if not q.get("q") or not q.get("a"):
            errs.append(f"{w}: iq{ii + 1} needs q and a")
    return errs, warns


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    run = "--no-run" not in sys.argv
    files = []
    for a in args:
        if os.path.isdir(a):
            files += sorted(os.path.join(a, f) for f in os.listdir(a) if f.endswith(".json"))
        else:
            files.append(a)
    total = 0
    for f in files:
        e, wn = validate(f, run)
        total += len(e)
        status = "OK" if not e else f"{len(e)} ERROR(S)"
        print(f"{os.path.basename(f)}: {status}")
        for x in e + [f"warning: {x}" for x in wn]:
            print("  - " + x)
    print(f"TOTAL ERRORS: {total}")
    sys.exit(1 if total else 0)


if __name__ == "__main__":
    main()
