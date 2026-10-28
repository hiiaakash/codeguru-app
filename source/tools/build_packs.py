"""Merge stage JSON files into app pack scripts (www/packs/*.js)."""
import json, os, glob
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
out = os.path.join(ROOT, "www", "packs")
os.makedirs(out, exist_ok=True)
roles = json.load(open(os.path.join(ROOT, "content", "roles", "roles.json"), encoding="utf-8"))
open(os.path.join(out, "roles.js"), "w", encoding="utf-8").write("CG_ROLES(" + json.dumps(roles, ensure_ascii=False, separators=(",", ":")) + ");\n")
for role_dir in sorted(glob.glob(os.path.join(ROOT, "content", "*"))):
    role = os.path.basename(role_dir)
    if role == "roles":
        continue
    for lang_dir in sorted(glob.glob(os.path.join(role_dir, "*"))):
        lang = os.path.basename(lang_dir)
        stages = [json.load(open(f, encoding="utf-8")) for f in sorted(glob.glob(os.path.join(lang_dir, "stage-*.json")))]
        if not stages:
            continue
        pack = {"role": role, "lang": lang, "version": 1, "stages": stages}
        p = os.path.join(out, f"{role}.{lang}.js")
        open(p, "w", encoding="utf-8").write("CG_PACK(" + json.dumps(pack, ensure_ascii=False, separators=(",", ":")) + ");\n")
        print(p, len(stages), "stages", os.path.getsize(p) // 1024, "KB")
