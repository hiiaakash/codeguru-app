"""Download the official Pyodide wheels for numpy, pandas, scikit-learn and matplotlib
(and everything they depend on) into the app's offline Python folder.

Runs in GitHub Actions before the APK is built (the build machine has internet).
Every file is checked against the sha256 in pyodide-lock.json; any mismatch stops the build.

Usage: python3 tools/fetch_pyodide_packages.py app/src/main/assets/www/vendor/pyodide
"""
import hashlib
import json
import os
import sys
import time
import urllib.request

WANTED = ["numpy", "pandas", "scikit-learn", "matplotlib"]


def closure(lock, names):
    pkgs = lock["packages"]
    seen, todo = [], list(names)
    while todo:
        n = todo.pop(0)
        key = n.lower()
        if key in seen:
            continue
        if key not in pkgs:
            raise SystemExit(f"package {n!r} not in pyodide-lock.json")
        seen.append(key)
        todo += [d.lower() for d in pkgs[key].get("depends", [])]
    return seen


def fetch(url, tries=4):
    for i in range(tries):
        try:
            with urllib.request.urlopen(url, timeout=120) as r:
                return r.read()
        except Exception as e:  # network hiccup: retry with backoff
            if i == tries - 1:
                raise
            print(f"  retry {i + 1} for {url}: {e}")
            time.sleep(3 * (i + 1))


def main():
    dest = sys.argv[1] if len(sys.argv) > 1 else "app/src/main/assets/www/vendor/pyodide"
    lock = json.load(open(os.path.join(dest, "pyodide-lock.json"), encoding="utf-8"))
    version = json.load(open(os.path.join(dest, "package.json"), encoding="utf-8"))["version"]
    base = f"https://cdn.jsdelivr.net/pyodide/v{version}/full/"
    names = closure(lock, WANTED)
    total = 0
    for n in names:
        p = lock["packages"][n]
        fn, want = p["file_name"], p["sha256"]
        out = os.path.join(dest, fn)
        if os.path.exists(out) and hashlib.sha256(open(out, "rb").read()).hexdigest() == want:
            print(f"ok (cached) {fn}")
            total += os.path.getsize(out)
            continue
        data = fetch(base + fn)
        got = hashlib.sha256(data).hexdigest()
        if got != want:
            raise SystemExit(f"sha256 mismatch for {fn}: expected {want}, got {got}")
        open(out, "wb").write(data)
        total += len(data)
        print(f"ok {fn} ({len(data) // 1024} KB)")
    json.dump(names, open(os.path.join(dest, "bundled.json"), "w"))
    print(f"{len(names)} packages, {total / 1e6:.1f} MB added for offline Python")


if __name__ == "__main__":
    main()
