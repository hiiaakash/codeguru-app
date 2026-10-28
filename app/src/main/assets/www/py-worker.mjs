// Code Guru - offline Python runner (module worker, Pyodide).
// Loads numpy / pandas / scikit-learn / matplotlib on demand from the bundled wheels and
// returns matplotlib figures as PNG images.
import { loadPyodide } from "./vendor/pyodide/pyodide.mjs";

let py = null;
let loading = null;

async function ready() {
  if (py) return py;
  if (!loading) {
    const indexURL = new URL("./vendor/pyodide/", import.meta.url).href;
    loading = loadPyodide({ indexURL }).then((p) => {
      py = p;
      p.runPython("import os\nos.environ['MPLBACKEND']='Agg'\nos.chdir('/home/pyodide')");
      return p;
    });
  }
  return loading;
}

let BUNDLED = null, IMPORT_MAP = null;
async function neededPackages(p, code) {
  if (!BUNDLED) {
    try { const r = await fetch(new URL("./vendor/pyodide/bundled.json", import.meta.url)); BUNDLED = r.ok ? await r.json() : []; } catch (e) { BUNDLED = []; }
    IMPORT_MAP = {};
    try {
      const lock = await (await fetch(new URL("./vendor/pyodide/pyodide-lock.json", import.meta.url))).json();
      for (const [name, info] of Object.entries(lock.packages)) for (const imp of info.imports || []) IMPORT_MAP[imp] = name;
    } catch (e) { /* no lock */ }
  }
  let mods = [];
  try { const r = p.pyodide_py.code.find_imports(code); mods = r.toJs(); r.destroy(); } catch (e) { mods = []; }
  const load = [], missing = [];
  for (const m of mods) {
    const pkg = IMPORT_MAP[m.split(".")[0]];
    if (!pkg) continue; // standard library or unknown module (Python will report it)
    if (BUNDLED.includes(pkg)) load.push(pkg); else missing.push(m.split(".")[0]);
  }
  return { load, missing };
}

const FIGS = `
def __cg_figs():
    import sys
    if 'matplotlib.pyplot' not in sys.modules:
        return []
    import io, base64, warnings
    import matplotlib.pyplot as plt
    out = []
    for n in plt.get_fignums():
        buf = io.BytesIO()
        with warnings.catch_warnings():
            warnings.simplefilter('ignore')
            plt.figure(n).savefig(buf, format='png', dpi=90, bbox_inches='tight')
        out.append(base64.b64encode(buf.getvalue()).decode())
    plt.close('all')
    return out
__cg_figs()
`;

self.onmessage = async (ev) => {
  const { id, code, stdin } = ev.data || {};
  if (ev.data && ev.data.warm) {
    try { await ready(); self.postMessage({ warm: true, ok: true }); } catch (e) { self.postMessage({ warm: true, ok: false, err: String(e) }); }
    return;
  }
  let out = "";
  const inputs = String(stdin || "").split("\n");
  let k = 0;
  let p;
  try { p = await ready(); } catch (e) {
    self.postMessage({ id, ok: false, out, err: "Python could not start: " + String(e), boot: true });
    return;
  }
  p.setStdout({ batched: (s) => { out += s + "\n"; } });
  p.setStderr({ batched: (s) => { if (!/non-interactive|FigureCanvasAgg/.test(s)) out += s + "\n"; } });
  p.setStdin({ stdin: () => (k < inputs.length ? inputs[k++] : null) });
  // libraries used by the code (numpy, pandas, sklearn, matplotlib...) come from wheels bundled in the app
  try {
    const need = await neededPackages(p, code);
    if (need.missing.length) {
      self.postMessage({ id, ok: false, out, err: "LibraryMissing: " + need.missing.join(", ") });
      return;
    }
    if (need.load.length) await p.loadPackage(need.load, { messageCallback: () => {}, errorCallback: () => {}, checkIntegrity: true });
  } catch (e) {
    self.postMessage({ id, ok: false, out, err: "LibraryMissing: " + String(e && e.message ? e.message : e).slice(0, 300) });
    return;
  }
  const g = p.globals.get("dict")();
  g.set("__name__", "__main__");
  let imgs = [];
  try {
    await p.runPythonAsync(code, { globals: g });
    try { const r = p.runPython(FIGS, { globals: g }); imgs = r ? r.toJs() : []; if (r && r.destroy) r.destroy(); } catch (e) { /* no figures */ }
    self.postMessage({ id, ok: true, out, imgs });
  } catch (e) {
    let msg = String(e && e.message ? e.message : e);
    const lines = msg.trim().split("\n");
    const i = lines.findIndex((l) => l.includes('File "<exec>"'));
    msg = (i >= 0 ? ["Traceback (most recent call last):"].concat(lines.slice(i)) : lines.slice(-6)).join("\n");
    self.postMessage({ id, ok: false, out, err: msg, imgs });
  } finally {
    g.destroy();
  }
};
