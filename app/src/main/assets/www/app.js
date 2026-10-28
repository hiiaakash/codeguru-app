/* Code Guru - main app. Offline tutor: roles -> 14 stages -> learn / teacher / practice / test / IQ. */
(function () {
  "use strict";
  const APP = { name: "Code Guru", version: "1.3", dev: "Aakash Sharma", email: "cse211901204@gmail.com" };
  const $ = (id) => document.getElementById(id);
  const esc = (t) => String(t == null ? "" : t).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const today = () => { const d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };
  const LANGS = { hinglish: "Hinglish", hindi: "हिंदी", english: "English" };

  /* ---------------- storage (phone only) ---------------- */
  const KEY = "cg_state_v1";
  const def = () => ({ v: 1, lang: "hinglish", theme: "auto", font: 16, tts: true, rate: 1, cur: null, xp: 0, streak: { last: "", n: 0 }, badges: {}, prog: {}, runs: 0, asks: 0, day: {}, goal: 50, exams: [], revs: 0 });
  let S = def();
  try { const raw = localStorage.getItem(KEY); if (raw) S = Object.assign(def(), JSON.parse(raw)); } catch (e) { /* storage unavailable */ }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* ignore */ } };
  /* notes (phone only) */
  const NKEY = "cg_notes_v1";
  const notesGet = () => { try { return JSON.parse(localStorage.getItem(NKEY) || "[]"); } catch (e) { return []; } };
  const notesSet = (a) => { try { localStorage.setItem(NKEY, JSON.stringify(a)); return true; } catch (e) { return false; } };
  const T = (k) => { const d = window.CG_I18N[S.lang] || window.CG_I18N.hinglish; const v = d[k]; return v == null ? window.CG_I18N.english[k] || k : v; };
  const L3 = (o) => (o && typeof o === "object" ? o[S.lang] || o.hinglish || o.english || "" : o || "");

  /* IndexedDB for imported packs (can be large) */
  const DB = {
    db: null,
    open() {
      if (this.db) return Promise.resolve(this.db);
      return new Promise((res, rej) => {
        let rq;
        try { rq = indexedDB.open("codeguru", 1); } catch (e) { rej(e); return; }
        rq.onupgradeneeded = () => rq.result.createObjectStore("packs", { keyPath: "key" });
        rq.onsuccess = () => { this.db = rq.result; res(this.db); };
        rq.onerror = () => rej(rq.error);
      });
    },
    async all() { try { const db = await this.open(); return await new Promise((res) => { const r = db.transaction("packs").objectStore("packs").getAll(); r.onsuccess = () => res(r.result || []); r.onerror = () => res([]); }); } catch (e) { return []; } },
    async put(v) { const db = await this.open(); return new Promise((res, rej) => { const tx = db.transaction("packs", "readwrite"); tx.objectStore("packs").put(v); tx.oncomplete = res; tx.onerror = () => rej(tx.error); }); },
    async del(k) { const db = await this.open(); return new Promise((res) => { const tx = db.transaction("packs", "readwrite"); tx.objectStore("packs").delete(k); tx.oncomplete = res; tx.onerror = res; }); },
  };

  /* ---------------- content ---------------- */
  let ROLES = [];
  const PACKS = {}; // PACKS[roleId][lang] = pack
  let IMPORTED = []; // [{key, role, lang, stages}]
  window.CG_ROLES = (r) => { ROLES = r; };
  window.CG_PACK = (p) => { (PACKS[p.role] = PACKS[p.role] || {})[p.lang] = p; };
  let BOOKS = []; // cheat books bundled with the app (same shape as imported books)
  window.CG_BOOK = (p) => { BOOKS.push({ key: p.id, role: p.role, lang: p.lang, stages: p.stages, auto: true, builtin: true }); };
  const BUNDLED = { aiml: true };
  const loading = {};
  function loadPack(role, lang) {
    if (PACKS[role] && PACKS[role][lang]) return Promise.resolve(PACKS[role][lang]);
    if (!BUNDLED[role]) return Promise.resolve(null);
    const k = role + "." + lang;
    if (!loading[k]) loading[k] = new Promise((res) => { const s = document.createElement("script"); s.src = "packs/" + k + ".js"; s.onload = () => res(PACKS[role] && PACKS[role][lang]); s.onerror = () => res(null); document.head.appendChild(s); });
    return loading[k];
  }
  function roleInfo(id) {
    const r = ROLES.find((x) => x.id === id);
    if (r) return r;
    const p = IMPORTED.find((x) => x.key === id) || BOOKS.find((x) => x.key === id);
    if (p) return { id: p.key, icon: p.role.icon || "📘", name: { [p.lang]: p.role.name }, desc: { [p.lang]: p.role.desc || "" }, imported: true, skills: [] };
    return null;
  }
  function getPack(id) { const p = IMPORTED.find((x) => x.key === id) || BOOKS.find((x) => x.key === id); if (p) return p; return PACKS[id] && (PACKS[id][S.lang] || PACKS[id].hinglish) || null; }
  const hasCourse = (id) => !!BUNDLED[id] || IMPORTED.some((x) => x.key === id);

  /* ---------------- progress, XP, badges ---------------- */
  const P = (role, n) => { const r = (S.prog[role] = S.prog[role] || {}); return (r[n] = r[n] || { L: [], T: 0, P: [0, 0, 0], Q: null, I: [], G: 0 }); };
  const unlocked = (role, n) => n <= 1 || ((S.prog[role] || {})[n - 1] || {}).Q >= 80;
  const cleared = (role, n) => ((S.prog[role] || {})[n] || {}).Q >= 80;
  const level = () => 1 + Math.floor(Math.sqrt(S.xp / 120));
  const lvlRange = (l) => [120 * (l - 1) * (l - 1), 120 * l * l];
  function touchStreak() {
    const t = today();
    if (S.streak.last === t) return;
    const y = new Date(Date.now() - 864e5); const ys = y.getFullYear() + "-" + String(y.getMonth() + 1).padStart(2, "0") + "-" + String(y.getDate()).padStart(2, "0");
    S.streak.n = S.streak.last === ys ? S.streak.n + 1 : 1;
    S.streak.last = t;
    if (S.streak.n >= 3) badge("streak3");
    if (S.streak.n >= 7) badge("streak7");
  }
  function addXP(n) { if (!n) return; const before = level(); S.xp += n; touchStreak(); S.day = S.day || {}; const t = today(), had = S.day[t] || 0; S.day[t] = had + n; if (had < (S.goal || 50) && S.day[t] >= (S.goal || 50)) { badge("goal"); setTimeout(() => toast(T("goalDone")), 1400); } const ks = Object.keys(S.day).sort(); while (ks.length > 60) delete S.day[ks.shift()]; save(); toast(T("xpGain").replace("{n}", n)); if (level() > before) setTimeout(() => celebrate("⭐ " + T("level") + " " + level()), 500); }
  function badge(id) { if (S.badges[id]) return; S.badges[id] = today(); save(); const b = window.CG_BADGES.find((x) => x.id === id); if (b) setTimeout(() => toast(T("badgeNew") + " " + b.ic + " " + L3(b.n)), 900); }
  function stageCountCleared() { let c = 0; for (const r in S.prog) for (const n in S.prog[r]) if (S.prog[r][n].Q >= 80) c++; return c; }

  /* ---------------- UI helpers ---------------- */
  const UI = { scr: "home", stack: [], modal: null, keep: 0 };
  function toast(m) { const t = $("toast"); if (!t) return; t.textContent = m; t.className = "toast show"; clearTimeout(UI.tt); UI.tt = setTimeout(() => { t.className = "toast"; }, 2000); }
  function celebrate(txt) { const d = document.createElement("div"); d.className = "burst"; d.textContent = txt || "🎉"; document.body.appendChild(d); setTimeout(() => d.remove(), 1300); }
  function applySet() { const r = document.documentElement; if (S.theme === "auto") r.removeAttribute("data-theme"); else r.setAttribute("data-theme", S.theme); r.style.fontSize = S.font + "px"; r.lang = S.lang === "hindi" ? "hi" : "en"; }
  function go(scr, args) { stopSpeech(); if (UI.scr !== scr || args) UI.stack.push({ scr: UI.scr, a: UI.a }); UI.scr = scr; if (args !== undefined) UI.a = args; UI.modal = null; render(); }
  function back() {
    if (UI.modal) { if (UI.modal.busy) return "ok"; UI.modal = null; UI.keep = 1; render(); return "ok"; }
    stopSpeech();
    const p = UI.stack.pop();
    if (!p) { if (UI.scr === "home") return "exit"; UI.scr = "home"; render(); return "ok"; }
    UI.scr = p.scr; UI.a = p.a; render(); return "ok";
  }
  window.__androidBack = back;
  function goHome() { stopSpeech(); UI.stack = []; UI.scr = "home"; UI.modal = null; render(); }
  function ask(msg, ok, fn) { UI.cb = fn; UI.modal = { msg, ok }; UI.keep = 1; render(); }

  /* inline markdown: **bold**, `code`, newlines */
  function md(t) {
    return esc(t).replace(/`([^`]+)`/g, "<code>$1</code>").replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>").replace(/\n/g, "<br>");
  }
  /* tiny syntax highlighter (python / js / sql / bash) */
  const KW = {
    python: "and|as|assert|async|await|break|class|continue|def|del|elif|else|except|False|finally|for|from|global|if|import|in|is|lambda|None|nonlocal|not|or|pass|raise|return|True|try|while|with|yield|print|self",
    js: "const|let|var|function|return|if|else|for|while|of|in|new|class|this|true|false|null|undefined|async|await|import|export|from|try|catch|throw|console",
    sql: "SELECT|FROM|WHERE|INSERT|INTO|VALUES|UPDATE|SET|DELETE|CREATE|TABLE|PRIMARY|KEY|NOT|NULL|UNIQUE|FOREIGN|REFERENCES|JOIN|INNER|LEFT|RIGHT|ON|GROUP|BY|ORDER|HAVING|LIMIT|AS|AND|OR|INDEX|DISTINCT|COUNT|SUM|AVG|MIN|MAX|DESC|ASC|INTEGER|TEXT|REAL",
    bash: "git|docker|pip|python|cd|ls|mkdir|run|build|push|pull|commit|add|checkout|merge|clone|compose|install",
  };
  function hl(code, lang) {
    const kw = KW[lang === "javascript" ? "js" : lang];
    const cm = lang === "python" || lang === "bash" ? /#.*$/ : lang === "sql" ? /--.*$/ : lang === "js" ? /\/\/.*$/ : null;
    return code.split("\n").map((line) => {
      let rest = line, tail = "";
      if (cm) {
        // find comment start outside quotes
        let q = null, cut = -1;
        for (let i = 0; i < line.length; i++) {
          const c = line[i];
          if ((c === '"' || c === "'") && q === null) q = c; else if (c === q) q = null;
          else if (q === null && line.slice(i).match(cm) && line.slice(i).match(cm).index === 0) { cut = i; break; }
        }
        if (cut >= 0) { rest = line.slice(0, cut); tail = `<span class="cm">${esc(line.slice(cut))}</span>`; }
      }
      let h = esc(rest);
      if (kw) {
        const re = new RegExp(`(&quot;.*?&quot;|&#39;.*?&#39;)|\\b(\\d+(?:\\.\\d+)?)\\b|\\b(${kw})\\b`, lang === "sql" ? "gi" : "g");
        h = h.replace(re, (m, s, n, k) => (s ? `<span class="st">${s}</span>` : n ? `<span class="nu">${n}</span>` : `<span class="kw">${k}</span>`));
      }
      return h + tail;
    }).join("\n");
  }
  function codeBlock(lang, src, out, opts) {
    opts = opts || {};
    const id = "cb" + Math.random().toString(36).slice(2, 8);
    UI.codes = UI.codes || {};
    UI.codes[id] = { lang, src };
    const runnable = lang === "python" || lang === "js" || lang === "javascript";
    return `<div class="cb"><div class="hd"><span>${esc(lang)}</span><button onclick="CG.copyCode('${id}')">${T("copy")}</button><button onclick="CG.noteCode('${id}')" aria-label="${T("saveToNotes")}">📝</button>${runnable ? `<button onclick="CG.tryCode('${id}')">${T("tryCode")}</button>` : ""}</div><pre>${hl(src, lang)}</pre>${out ? `<div class="out"><b>${T("output")}</b>${esc(out)}</div>` : ""}</div>`;
  }
  const sk = (s) => (s && window.sketchSVG ? `<div class="skw">${window.sketchSVG(s)}</div>` : "");
  function blocksHtml(blocks) {
    return blocks.map((b) => {
      switch (b[0]) {
        case "p": return `<p>${md(b[1])}</p>`;
        case "code": return codeBlock(b[1], b[2], b[3]);
        case "sketch": return sk(b[1]);
        case "tip": return `<div class="tip">💡 ${md(b[1])}</div>`;
        case "warn": return `<div class="warn">⚠️ ${md(b[1])}</div>`;
        case "analogy": return `<div class="ana">🍵 ${md(b[1])}</div>`;
        case "list": return `<ul>${(b[1] || []).map((x) => `<li>${md(x)}</li>`).join("")}</ul>`;
        default: return "";
      }
    }).join("");
  }
  function copyText(t) {
    if (window.AndroidApp && AndroidApp.copyText) { try { AndroidApp.copyText(t); toast(T("copied")); return; } catch (e) { /* fall through */ } }
    const fb = () => { try { const x = document.createElement("textarea"); x.value = t; document.body.appendChild(x); x.select(); document.execCommand("copy"); x.remove(); toast(T("copied")); } catch (e) { toast(t.slice(0, 60)); } };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(() => toast(T("copied")), fb); else fb();
  }

  /* ---------------- speech (teacher voice) ---------------- */
  const SP = { on: false, cb: null };
  const speechText = (t) => String(t || "").replace(/`([^`]+)`/g, "$1").replace(/\*\*/g, "").replace(/[_#>*]/g, " ").replace(/\s+/g, " ").trim();
  function speak(text, done) {
    stopSpeech();
    if (!S.tts) { if (done) done(); return false; }
    const t = speechText(text), lang = S.lang === "hindi" ? "hi-IN" : "en-IN";
    SP.cb = done || null; SP.on = true;
    if (window.AndroidApp && AndroidApp.speak) { try { AndroidApp.speak(t, lang, S.rate); return true; } catch (e) { /* fall back */ } }
    if (window.speechSynthesis && window.SpeechSynthesisUtterance) {
      try {
        const u = new SpeechSynthesisUtterance(t); u.lang = lang; u.rate = S.rate;
        const v = speechSynthesis.getVoices().find((x) => x.lang === lang) || speechSynthesis.getVoices().find((x) => x.lang && x.lang.startsWith(lang.slice(0, 2)));
        if (v) u.voice = v;
        u.onend = () => window.__ttsDone(); u.onerror = () => window.__ttsDone();
        speechSynthesis.speak(u); return true;
      } catch (e) { /* no speech */ }
    }
    SP.on = false; SP.cb = null; if (done) done(); return false;
  }
  window.__ttsDone = () => { const cb = SP.cb; SP.on = false; SP.cb = null; if (cb) cb(); };
  function stopSpeech() {
    SP.cb = null; SP.on = false;
    if (window.AndroidApp && AndroidApp.stopSpeak) { try { AndroidApp.stopSpeak(); } catch (e) { /* ignore */ } }
    if (window.speechSynthesis) { try { speechSynthesis.cancel(); } catch (e) { /* ignore */ } }
    if (UI.tm) { clearTimeout(UI.tm.timer); UI.tm.playing = false; }
  }

  /* ---------------- code runner ---------------- */
  const RUN = { py: null, pyReady: false, seq: 0, pending: {} };
  const canPy = () => location.protocol !== "file:" && typeof Worker !== "undefined";
  function pyWorker() {
    if (RUN.py) return RUN.py;
    try { RUN.py = new Worker("py-worker.mjs", { type: "module" }); } catch (e) { RUN.noWorker = true; return null; }
    RUN.py.onmessage = (e) => { const d = e.data; if (d.warm) { RUN.pyReady = !!d.ok; return; } const p = RUN.pending[d.id]; if (p) { delete RUN.pending[d.id]; clearTimeout(p.t); RUN.pyReady = true; p.res(d); } };
    RUN.py.onerror = (e) => { for (const k in RUN.pending) { RUN.pending[k].res({ ok: false, out: "", err: "Python worker error: " + (e.message || ""), boot: true }); delete RUN.pending[k]; } RUN.py = null; };
    return RUN.py;
  }
  // Fallback when module workers can't load Python (older WebViews): run on the main thread.
  async function runPythonMain(code, stdin) {
    try {
      if (!RUN.main) RUN.main = import("./vendor/pyodide/pyodide.mjs").then((m) => m.loadPyodide({ indexURL: new URL("vendor/pyodide/", location.href).href }));
      const p = await RUN.main;
      let out = ""; const ins = String(stdin || "").split("\n"); let k = 0;
      p.setStdout({ batched: (s) => { out += s + "\n"; } }); p.setStderr({ batched: (s) => { out += s + "\n"; } });
      p.setStdin({ stdin: () => (k < ins.length ? ins[k++] : null) });
      const g = p.globals.get("dict")(); g.set("__name__", "__main__");
      try { await p.runPythonAsync(code, { globals: g }); RUN.pyReady = true; return { ok: true, out }; }
      catch (e) { const ls = String(e.message || e).trim().split("\n"); const i = ls.findIndex((l) => l.includes('File "<exec>"')); return { ok: false, out, err: (i >= 0 ? ["Traceback (most recent call last):"].concat(ls.slice(i)) : ls.slice(-6)).join("\n") }; }
      finally { g.destroy(); }
    } catch (e) { return { ok: false, out: "", err: "Python could not start: " + e }; }
  }
  async function runPython(code, stdin, heavy) {
    if (!canPy()) return { ok: false, out: "", err: T("pyNoFile") };
    if (RUN.noWorker) return runPythonMain(code, stdin);
    const r = await runPythonWorker(code, stdin, heavy);
    if (r.boot) { RUN.noWorker = true; try { RUN.py && RUN.py.terminate(); } catch (e) { /* ignore */ } RUN.py = null; return runPythonMain(code, stdin); }
    return r;
  }
  function runPythonWorker(code, stdin, heavy) {
    return new Promise((res) => {
      const id = ++RUN.seq, w = pyWorker();
      if (!w) { res({ ok: false, out: "", err: "no worker", boot: true }); return; }
      const limit = heavy ? 240000 : RUN.pyReady ? 15000 : 60000;
      const t = setTimeout(() => { delete RUN.pending[id]; try { w.terminate(); } catch (e) { /* ignore */ } RUN.py = null; RUN.pyReady = false; res({ ok: false, out: "", err: T("timeout") }); }, limit);
      RUN.pending[id] = { res, t };
      w.postMessage({ id, code, stdin: stdin || "" });
    });
  }
  function runJS(code, stdin) {
    return new Promise((res) => {
      const src = `const __o=[];const __in=${JSON.stringify(String(stdin || "").split("\n"))};let __k=0;
const __f=(a)=>a.map(x=>typeof x==="string"?x:(()=>{try{return JSON.stringify(x)}catch(e){return String(x)}})()).join(" ");
const console={log:(...a)=>__o.push(__f(a)),error:(...a)=>__o.push(__f(a)),warn:(...a)=>__o.push(__f(a)),info:(...a)=>__o.push(__f(a))};
const prompt=()=>__k<__in.length?__in[__k++]:null;
onmessage=async()=>{try{await (async()=>{\n${code}\n})();postMessage({ok:true,out:__o.join("\\n")})}catch(e){postMessage({ok:false,out:__o.join("\\n"),err:String(e&&e.name?e.name+": "+e.message:e)})}};`;
      let w;
      try { w = new Worker(URL.createObjectURL(new Blob([src], { type: "text/javascript" }))); } catch (e) {
        try { const o = []; const f = new Function("console", code); f({ log: (...a) => o.push(a.join(" ")) }); res({ ok: true, out: o.join("\n") }); } catch (er) { res({ ok: false, out: "", err: String(er) }); }
        return;
      }
      const t = setTimeout(() => { w.terminate(); res({ ok: false, out: "", err: T("timeout") }); }, 6000);
      w.onmessage = (e) => { clearTimeout(t); w.terminate(); res(e.data); };
      w.onerror = (e) => { clearTimeout(t); w.terminate(); res({ ok: false, out: "", err: e.message || "Error" }); e.preventDefault && e.preventDefault(); };
      w.postMessage(1);
    });
  }
  const HEAVY = /^\s*(import|from)\s+(numpy|pandas|sklearn|scipy|matplotlib|seaborn)\b/m;
  async function runCode(lang, code, stdin, outEl) {
    const heavy = lang === "python" && HEAVY.test(code) && !RUN.libs;
    if (outEl) outEl.innerHTML = esc(heavy ? T("libLoading") : lang === "python" && !RUN.pyReady ? T("pyLoading") : T("running"));
    const r = lang === "python" ? await runPython(code, stdin, heavy) : await runJS(code, stdin);
    if (heavy && r.ok) RUN.libs = true;
    S.runs++; badge("first_run"); save();
    if (outEl) outEl.innerHTML = outHtml(r);
    return r;
  }
  function outHtml(r) {
    let h = esc((r.out || "").replace(/\n$/, ""));
    if (!r.ok && r.err) {
      h += (h ? "\n" : "") + `<span class="er">${esc(r.err)}</span>`;
      const m = /(LibraryMissing|\w+Error)\b/.exec(r.err);
      if (m && window.CG_ERRORS[m[1]]) h += `\n<span class="er">💡 ${esc(L3(window.CG_ERRORS[m[1]]))}</span>`;
    }
    (r.imgs || []).forEach((b64) => { h += `<img class="plot" alt="chart" src="data:image/png;base64,${b64}">`; });
    return h || "<span class='er'>(no output)</span>";
  }
  const norm = (s) => String(s || "").replace(/\r\n/g, "\n").split("\n").map((l) => l.replace(/\s+$/, "")).join("\n").replace(/^\n+|\n+$/g, "");
  function edKeys(e) {
    if (e.key === "Tab") { e.preventDefault(); const t = e.target, s = t.selectionStart; t.value = t.value.slice(0, s) + "    " + t.value.slice(t.selectionEnd); t.selectionStart = t.selectionEnd = s + 4; }
    else if (e.key === "Enter") { const t = e.target, s = t.selectionStart, line = t.value.slice(0, s).split("\n").pop(); let ind = (line.match(/^\s*/) || [""])[0]; if (/:\s*$/.test(line) || /[{(\[]\s*$/.test(line)) ind += "    "; if (ind) { e.preventDefault(); t.value = t.value.slice(0, s) + "\n" + ind + t.value.slice(t.selectionEnd); t.selectionStart = t.selectionEnd = s + 1 + ind.length; } }
  }

  /* ---------------- screens ---------------- */
  function topbar(title, study) {
    return `<div class="top"><button class="ib" onclick="CG.back()" aria-label="${T("back")}">←</button><b>${esc(title)}</b>${study ? `<button class="ib" onclick="CG.noteNew()" aria-label="${T("addNote")}">📝</button><button class="ib" onclick="CG.menu()" aria-label="${T("menu")}">☰</button>` : `<button class="ib" onclick="CG.home()" aria-label="${T("home")}">⌂</button>`}</div>`;
  }
  const SCR = {};

  SCR.home = () => {
    const l = level(), [a, b] = lvlRange(l), pct = Math.min(100, ((S.xp - a) / (b - a)) * 100);
    const pk = getPack("aiml");
    let n = 1; while (n < 14 && cleared("aiml", n)) n++;
    const st = pk && pk.stages.find((x) => x.n === n);
    const doneN = Array.from({ length: 14 }, (_, i) => cleared("aiml", i + 1)).filter(Boolean).length;
    const bookCard = (p) => `<button class="card rolec" onclick="CG.openRole('${p.key}')"><span class="ic">${esc(p.role.icon || "📘")}</span><span class="b"><b>${esc(p.role.name)}</b><div class="mut small">${p.stages.length} ${T("stages")} · ${p.stages.filter((s) => cleared(p.key, s.n)).length} ✓</div></span></button>`;
    const cheat = BOOKS.map(bookCard).join("");
    const books = IMPORTED.map((p) => `<button class="card rolec" onclick="CG.openRole('${p.key}')"><span class="ic">${esc(p.role.icon || "📘")}</span><span class="b"><b>${esc(p.role.name)}</b> ${p.auto ? `<span class="chip">${T("autoBook")}</span>` : ""}<div class="mut small">${p.stages.length} ${T("stages")} · ${p.stages.filter((s) => cleared(p.key, s.n)).length} ✓</div></span></button>`).join("");
    return `<h1>🧑‍🏫 ${APP.name}</h1><p class="mut">${T("appTagline")}</p>
    <div class="card hero"><div class="row" style="align-items:center"><div><div style="font-size:1.3rem;font-weight:700">${T("hello")}</div><div class="mut">${T("level")} ${l} · ${S.xp} ${T("xp")}</div></div><div style="text-align:right;flex:none"><div style="font-size:1.6rem">🔥 ${S.streak.n || 0}</div><div class="mut small">${T("streak")}</div></div></div>
    <div class="bar" style="margin-top:10px"><i style="width:${pct.toFixed(1)}%"></i></div><div class="mut small" style="margin-top:4px">${S.xp - a} / ${b - a} → ${T("level")} ${l + 1} · 🎯 ${(S.day || {})[today()] || 0}/${S.goal || 50} XP</div>
    <button class="herob" onclick="CG.go('dash')">📊 ${T("dash")} →</button></div>
    <button class="card rolec" onclick="CG.openRole('aiml')"><span class="ic">🧠</span><span class="b"><b>${T("course")}</b><div class="bar" style="margin:6px 0"><i style="width:${(doneN / 14) * 100}%;background:var(--ok)"></i></div><span class="mut small">${doneN}/14 ${T("stages")} · ${T("pass80")}</span></span></button>
    <button class="pri full" onclick="CG.openStage('aiml',${n})">▶ ${doneN ? T("continue") : T("start")}: ${T("stage")} ${n}${st ? " — " + esc(st.title) : ""}</button>
    <div class="grid" style="margin-top:8px">
      <button class="tile" onclick="CG.go('revise')"><span class="ic">🔁</span>${T("revise")}${dueIds().length ? ` <span class="chip">${dueIds().length}</span>` : ""}</button>
      <button class="tile" onclick="CG.go('exam')"><span class="ic">🏁</span>${T("exam")}</button>
      <button class="tile" onclick="CG.go('importb')"><span class="ic">📕</span>${T("pdfTitle")}</button>
      <button class="tile" onclick="CG.go('notes')"><span class="ic">📒</span>${T("notes")}${notesGet().length ? ` (${notesGet().length})` : ""}</button>
      <button class="tile" onclick="CG.go('ask')"><span class="ic">💬</span>${T("ask")}</button>
      <button class="tile" onclick="CG.go('playground')"><span class="ic">💻</span>${T("playground")}</button>
      <button class="tile" onclick="CG.go('badges')"><span class="ic">🏅</span>${T("badges")}</button>
      <button class="tile" onclick="CG.go('settings')"><span class="ic">⚙️</span>${T("settings")}</button>
      <button class="tile" onclick="CG.go('help')"><span class="ic">❓</span>${T("help")}</button>
      <button class="tile" onclick="CG.go('about')"><span class="ic">ℹ️</span>${T("about")}</button>
    </div>
    ${cheat ? `<h3>📚 ${T("cheatBooks")}</h3><p class="mut small">${T("cheatNote")}</p>${cheat}` : ""}
    ${books ? `<h3>📘 ${T("myBooks")}</h3>${books}` : ""}`;
  };

  SCR.roles = () => {
    const card = (r, kind) => {
      const done = r.stages ? r.stages.filter((_, i) => cleared(r.id, i + 1)).length : 0;
      return `<button class="card rolec" onclick="CG.openRole('${r.id}')"><span class="ic">${esc(r.icon)}</span><span class="b"><b>${esc(L3(r.name))}</b><br>
      <span class="chip ${kind === "full" ? "ok" : kind === "book" ? "xp" : ""}">${kind === "full" ? T("fullCourse") : kind === "book" ? T("myBooks") : T("roadmap")}</span>${done ? `<span class="chip ok">${done}/14 ✓</span>` : ""}
      <div class="mut">${esc(L3(r.desc))}</div>${(r.skills || []).length ? `<div class="mut small">${esc(r.skills.join(" · "))}</div>` : ""}</span></button>`;
    };
    const books = IMPORTED.map((p) => roleInfo(p.key));
    return topbar(T("courses")) +
      ROLES.filter((r) => BUNDLED[r.id]).map((r) => card(r, "full")).join("") +
      (books.length ? `<h3>📘 ${T("myBooks")}</h3>` + books.map((r) => card(r, "book")).join("") : "");
  };

  SCR.path = () => {
    const id = UI.a, r = roleInfo(id);
    if (!r) return topbar("") + `<p class="mut">Not found</p>`;
    const pk = getPack(id);
    if (!pk && BUNDLED[id]) { loadPack(id, S.lang).then(() => { UI.keep = 1; render(); }); return topbar(L3(r.name)) + `<p class="mut">${T("running")}</p>`; }
    const stages = pk ? pk.stages.map((s) => ({ n: s.n, t: s.title, d: s.goal })) : (r.stages || []).map((s, i) => ({ n: i + 1, t: s.t, d: L3(s.d) }));
    const course = !!pk;
    const head = `<div class="card"><div class="row" style="align-items:center"><span style="font-size:2.4rem;flex:none">${esc(r.icon)}</span><div><h2 style="margin:0">${esc(L3(r.name))}</h2><div class="mut">${esc(L3(r.desc))}</div></div></div>
      ${course ? `<div class="bar" style="margin-top:10px"><i style="width:${(stages.filter((s) => cleared(id, s.n)).length / stages.length) * 100}%;background:var(--ok)"></i></div><div class="mut small">${stages.filter((s) => cleared(id, s.n)).length}/${stages.length} ${T("stages")} · ${T("pass80")}</div>` : `<p class="mut">🛠️ ${T("roadmapNote")}</p>`}</div>`;
    let nodes = "";
    stages.forEach((s, i) => {
      const done = course && cleared(id, s.n), open = course && !done && unlocked(id, s.n);
      const cls = done ? "done" : open ? "open" : "lock";
      nodes += `<button class="node ${cls}" onclick="CG.openStage('${id}',${s.n})"><span class="dot">${done ? "⭐" : course && !open ? "🔒" : s.n}</span><span class="t"><b>${T("stage")} ${s.n}: ${esc(s.t)}</b><br><span class="mut small">${esc(s.d || "")}</span></span></button>`;
      if (i < stages.length - 1) nodes += `<div class="conn${i % 2 === 0 ? " r" : ""}"></div>`;
    });
    return topbar(L3(r.name)) + head + `<div class="path">${nodes}</div>`;
  };

  function stageObj() { const pk = getPack(UI.a.role); return pk && pk.stages.find((s) => s.n === UI.a.n); }
  SCR.stage = () => {
    const { role, n } = UI.a, st = stageObj();
    if (!st) return topbar("") + `<p class="mut">…</p>`;
    const p = P(role, n), tab = UI.a.tab || "learn";
    const tabs = [["learn", "📖 " + T("learn"), p.L.length + "/" + st.lessons.length], ["summary", "📋 " + T("summary"), ""], ["teach", "🧑‍🏫 " + T("teacher"), p.T ? "✓" : ""], ["practice", "💻 " + T("practice"), p.P.filter(Boolean).length + "/" + st.practice.length], ["games", "🎮 " + T("games"), p.G ? "★" + p.G : ""], ["test", "📝 " + T("test"), p.Q == null ? "" : p.Q + "%"], ["iq", "🎯 " + T("iq"), p.I.length + "/" + st.iq.length]];
    const body = { learn: tabLearn, summary: tabSummary, teach: tabTeach, practice: tabPractice, games: tabGames, test: tabTest, iq: tabIQ }[tab](st, p);
    return topbar(T("stage") + " " + n + ": " + st.title, true) +
      `<div class="tabs">${tabs.map(([k, l, c]) => `<button class="${tab === k ? "on" : ""}" onclick="CG.tab('${k}')">${l}${c ? ` <small>${c}</small>` : ""}</button>`).join("")}</div>` + body;
  };
  function tabLearn(st, p) {
    const li = UI.a.li;
    if (li == null) {
      return `<div class="card"><b>🎯 ${T("goal")}:</b> ${md(st.goal)}${cleared(UI.a.role, st.n) ? ` <span class="chip ok">${T("stageDone")}</span>` : ""}</div>` +
        st.lessons.map((l, i) => `<button class="card rolec" onclick="CG.lesson(${i})"><span class="ic">${p.L.includes(i) ? "✅" : "📖"}</span><span class="b"><b>${T("lesson")} ${i + 1}: ${esc(l.title)}</b></span></button>`).join("") +
        `<button class="pri full" onclick="CG.tab('teach')">🧑‍🏫 ${T("teachStart")}</button>`;
    }
    const l = st.lessons[li];
    const last = li >= st.lessons.length - 1;
    return `<div class="card les"><h2>${T("lesson")} ${li + 1}: ${esc(l.title)}</h2>${blocksHtml(l.blocks)}</div>
      <div class="row"><button onclick="CG.noteLesson(${li})">${T("saveToNotes")}</button><button onclick="CG.noteNew()">📝 ${T("addNote")}</button></div>
      <button class="pri full" onclick="CG.lessonDone(${li})">${T("markDone")} ${last ? "" : "→ " + T("nextLesson")}</button>`;
  }
  function teacherSVG() {
    return `<svg class="tch" viewBox="0 0 100 130" aria-hidden="true"><rect x="22" y="70" width="56" height="60" rx="16" fill="#5b4bdb"/><path d="M50 70 l-8 14 h16z" fill="#fff"/><rect x="44" y="60" width="12" height="12" fill="#e0ac69"/>
    <circle cx="50" cy="44" r="24" fill="#e0ac69"/><path d="M26 42 q2 -26 24 -26 q22 0 24 26 q-8 -12 -24 -12 q-16 0 -24 12z" fill="#2b2118"/>
    <g fill="none" stroke="#222" stroke-width="2"><circle cx="41" cy="44" r="6"/><circle cx="59" cy="44" r="6"/><path d="M47 44h6"/></g><circle cx="41" cy="44" r="2" fill="#222"/><circle cx="59" cy="44" r="2" fill="#222"/>
    <ellipse class="mouth" cx="50" cy="56" rx="6" ry="2" fill="#7a2e2e"/><path d="M78 92 l18 -30" stroke="#8d6e63" stroke-width="4" stroke-linecap="round"/></svg>`;
  }
  function tabTeach(st, p) {
    const tm = UI.tm && UI.tm.key === st.id + S.lang ? UI.tm : (UI.tm = { key: st.id + S.lang, i: -1, playing: false, seen: {} });
    if (tm.i < 0) {
      return `<div class="board center"><div style="font-size:3rem">🧑‍🏫</div><h2 style="color:#ffd166">${esc(st.title)}</h2><p>${md(st.goal)}</p></div>
        <button class="pri full" onclick="CG.teach(0,true)">${T("teachStart")}</button>
        <div class="seg"><button class="${S.tts ? "on" : ""}" onclick="CG.setOpt('tts',true)">🔊 ${T("voiceOn")}</button><button class="${!S.tts ? "on" : ""}" onclick="CG.setOpt('tts',false)">🔇 ${T("voiceOff")}</button></div>`;
    }
    const s = st.teach[tm.i];
    return `<div class="board fadein" id="board">${s.sketch ? sk(s.sketch) : ""}${s.code ? `<pre>${hl(s.code, "python")}</pre>` : ""}${!s.sketch && !s.code ? `<div class="center" style="font-size:2.6rem;padding:30px 0">✍️</div>` : ""}</div>
      <div class="teach ${tm.playing && S.tts ? "talking" : ""}" id="teachrow">${teacherSVG()}<div class="sub">${md(s.say)}</div></div>
      <div class="dots">${st.teach.map((_, i) => `<i class="${i === tm.i ? "on" : tm.seen[i] ? "seen" : ""}"></i>`).join("")}</div>
      <div class="ctrl"><button onclick="CG.teach(${tm.i - 1})" ${tm.i <= 0 ? "disabled" : ""}>⏮</button><button class="pri" onclick="CG.teachToggle()">${tm.playing ? "⏸ " + T("pause") : "▶ " + T("play")}</button><button onclick="CG.teach(${tm.i + 1})">${tm.i >= st.teach.length - 1 ? "✓" : "⏭"}</button></div>
      <div class="mut small center">${T("slide")} ${tm.i + 1}/${st.teach.length} · <a href="#" onclick="CG.setOpt('tts',${!S.tts});return false">${S.tts ? "🔊 " + T("voiceOn") : "🔇 " + T("voiceOff")}</a></div>`;
  }
  function tabPractice(st, p) {
    if (!st.practice.length) return `<div class="card center"><p>💻 ${T("pgIntro")}</p><button class="pri full" onclick="CG.go('playground')">${T("playground")}</button></div>`;
    const pi = Math.min(UI.a.pi || 0, st.practice.length - 1), q = st.practice[pi];
    const key = st.id + ":" + pi;
    UI.drafts = UI.drafts || {};
    const code = UI.drafts[key] != null ? UI.drafts[key] : q.starter;
    return `<div class="seg">${st.practice.map((_, i) => `<button class="${i === pi ? "on" : ""}" onclick="CG.prac(${i})">${p.P[i] ? "✅" : "💻"} ${i + 1}</button>`).join("")}</div>
      <div class="card"><b>${T("practice")} ${pi + 1}</b><p>${md(q.q)}</p></div>
      <textarea class="ed" id="ed" spellcheck="false" autocapitalize="off" autocomplete="off" oninput="CG.draft('${key}',this.value)" onkeydown="CG.edKeys(event)">${esc(code)}</textarea>
      <div class="row"><button class="pri" onclick="CG.pracRun(${pi},false)">${T("run")}</button><button class="pri" style="background:var(--ok);border-color:var(--ok)" onclick="CG.pracRun(${pi},true)">${T("check")}</button></div>
      <div class="outp" id="out"></div><div id="res"></div>
      <div class="row"><button onclick="CG.pracHint(${pi})">💡 ${T("hint")}</button><button onclick="CG.pracSol(${pi})">🔑 ${T("solution")}</button><button onclick="CG.pracReset(${pi})">↺ ${T("reset")}</button></div>
      <div id="extra"></div>
      <details class="card"><summary class="mut">${T("expected")}</summary><pre class="outp" style="margin:6px 0 0">${esc(q.expect)}</pre></details>`;
  }
  function tabTest(st, p) {
    if (!st.quiz.length) return `<div class="card center"><p>📝 —</p></div>`;
    const qz = UI.qz && UI.qz.key === st.id + S.lang ? UI.qz : null;
    if (!qz) {
      return `<div class="card center"><div class="big">📝</div><p>${T("testIntro")}</p>${p.Q != null ? `<p><span class="chip ${p.Q >= 80 ? "ok" : ""}">${T("best")}: ${p.Q}%</span></p>` : ""}<button class="pri full" onclick="CG.quizStart()">${T("startTest")}</button></div>`;
    }
    if (qz.i >= qz.qs.length) {
      const pct = Math.round((qz.right / qz.qs.length) * 100), pass = pct >= 80;
      return `<div class="card center"><div class="big">${pass ? "🏆" : "💪"}</div><div class="big">${pct}%</div><p>${T("score")}: ${qz.right}/${qz.qs.length}</p><div class="res ${pass ? "ok" : "bad"}">${pass ? T("passed") : T("failed")}</div>
        <div class="row"><button onclick="CG.quizStart()">↺ ${T("retry")}</button>${pass && UI.a.n < getPack(UI.a.role).stages.length ? `<button class="pri" onclick="CG.openStage('${UI.a.role}',${UI.a.n + 1})">${T("stage")} ${UI.a.n + 1} →</button>` : `<button class="pri" onclick="CG.tab('learn')">📖 ${T("learn")}</button>`}</div></div>`;
    }
    const q = qz.qs[qz.i], ans = qz.ans;
    return `<div class="mut">${T("question")} ${qz.i + 1}/${qz.qs.length} · ✅ ${qz.right}</div><div class="bar"><i style="width:${(qz.i / qz.qs.length) * 100}%;background:var(--pri)"></i></div>
      <div class="card"><p style="font-weight:600">${md(q.q)}</p>${q.code ? codeBlock("python", q.code, "") : ""}
      ${q.order.map((oi, k) => { let c = "opt"; if (ans != null) { if (oi === q.a) c += " right"; else if (k === ans) c += " wrongo"; } else if (qz.sel === k) c += " sel"; return `<button class="${c}" ${ans != null ? "disabled" : ""} onclick="CG.quizSel(${k})"><span class="lt">${"ABCD"[k]}</span><span>${md(q.o[oi])}</span></button>`; }).join("")}
      ${ans != null ? `<div class="res ${q.order[ans] === q.a ? "ok" : "bad"}">${q.order[ans] === q.a ? "✅" : "❌"} ${T("whyLabel")} <span style="font-weight:400">${md(q.why)}</span></div>` : ""}</div>
      ${ans == null ? `<button class="pri full" ${qz.sel == null ? "disabled" : ""} onclick="CG.quizAns()">${T("submit")}</button>` : `<button class="pri full" onclick="CG.quizNext()">${qz.i >= qz.qs.length - 1 ? T("finish") : T("nextQ") + " →"}</button>`}`;
  }
  function tabIQ(st, p) {
    UI.iqOpen = UI.iqOpen || {};
    return `<div class="card"><p>🎯 ${T("iqIntro")}</p></div>` + st.iq.map((q, i) => {
      const k = st.id + ":" + i, open = UI.iqOpen[k];
      return `<div class="card"><button class="iqq" style="border:0;background:none;padding:0;margin:0" onclick="CG.iq(${i})"><span>${p.I.includes(i) ? "✅" : "❓"} ${i + 1}. ${md(q.q)}</span><span style="flex:none">${open ? "▲" : "▼"}</span></button>
      ${open ? `<div class="iqa">${md(q.a)}<div class="row"><button class="small" onclick="CG.say(${i})">${T("speak")}</button><button class="small" onclick="CG.noteIQ(${i})">${T("saveToNotes")}</button></div></div>` : ""}</div>`;
    }).join("");
  }

  SCR.playground = () => {
    const pg = UI.pg || (UI.pg = { lang: "python", code: 'name = "Aakash"\nfor i in range(3):\n    print(f"Hello {name}!", i)\n', stdin: "" });
    return topbar(T("playground")) + `<p class="mut">${T("pgIntro")}</p>
      <div class="seg"><button class="${pg.lang === "python" ? "on" : ""}" onclick="CG.pgLang('python')">🐍 Python</button><button class="${pg.lang === "js" ? "on" : ""}" onclick="CG.pgLang('js')">🟨 JavaScript</button></div>
      <textarea class="ed" id="ed" spellcheck="false" autocapitalize="off" autocomplete="off" oninput="CG.pgSet('code',this.value)" onkeydown="CG.edKeys(event)">${esc(pg.code)}</textarea>
      <details><summary class="mut">${T("input")}</summary><textarea class="inp" rows="3" oninput="CG.pgSet('stdin',this.value)">${esc(pg.stdin)}</textarea></details>
      <button class="pri full" onclick="CG.pgRun()">${T("run")}</button><div class="outp" id="out"></div>`;
  };

  SCR.ask = () => {
    const a = UI.ask || (UI.ask = { q: "", res: null });
    let res = "";
    if (a.res) {
      if (a.res.err) res += `<div class="card"><b>🩺 ${T("errorHelp")}: ${esc(a.res.err)}</b><p>${esc(L3(window.CG_ERRORS[a.res.err]))}</p></div>`;
      if (a.res.code) res += `<button class="full" onclick="CG.askRun()">💻 ${T("runInPlayground")}</button>`;
      if (!a.res.items.length && !a.res.err) res += `<div class="card"><p>🤔 ${T("askNone")}</p></div>`;
      res += a.res.items.map((it, i) => `${i === 0 ? `<h3>⭐ ${T("bestAnswer")}</h3>` : i === 1 ? `<h3>📚 ${T("related")}</h3>` : ""}<div class="card res-item${i === 0 ? " best" : ""}"><b>${esc(it.where)}</b><div class="les">${it.html}</div><div class="row"><button class="small" onclick="CG.askOpen(${i})">${T("openInStage")} →</button><button class="small" onclick="CG.noteAsk(${i})">${T("saveToNotes")}</button></div></div>`).join("");
    }
    return topbar(T("ask")) + `<p class="mut">${T("askIntro")}</p><textarea class="inp" id="askq" rows="3" placeholder="${esc(T("askPlaceholder"))}">${esc(a.q)}</textarea>
      <button class="pri full" onclick="CG.askGo()">💬 ${T("askBtn")}</button><div id="askres">${res}</div>`;
  };

  SCR.importb = () => {
    const list = IMPORTED.map((p) => `<div class="card row" style="align-items:center"><span>${esc(p.role.icon || "📘")} <b>${esc(p.role.name)}</b> ${p.auto ? `<span class="chip">${T("autoBook")}</span>` : ""}<br><span class="mut small">${p.stages.length} ${T("stages")} · ${LANGS[p.lang] || p.lang}</span></span><button style="flex:none" onclick="CG.openRole('${p.key}')" aria-label="open">▶</button><button style="flex:none" onclick="CG.exportPack('${p.key}')" aria-label="download">⬇</button><button style="flex:none" onclick="CG.delPack('${p.key}')" aria-label="${T("delete")}">🗑</button></div>`).join("");
    return topbar(T("importBook")) + `<div class="card"><h3 style="margin-top:0">📕 ${T("pdfTitle")}</h3><p>${T("pdfIntro")}</p>
      <label class="btn pri full" style="display:block">${T("pdfPick")}<input type="file" accept="${window.CG_FORMATS ? window.CG_FORMATS.ACCEPT : ".pdf"}" style="display:none" onchange="CG.importPdf(this)"></label>
      <p class="mut small">${T("formatsList")}</p>
      <p class="mut small">ℹ️ ${T("pdfNote")}</p></div>
      ${list ? `<h3>📘 ${T("myBooks")}</h3>${list}` : ""}
      <div class="card"><h3 style="margin-top:0">✨ ${T("packTitle")}</h3><ol>${T("importSteps").map((x) => `<li>${esc(x)}</li>`).join("")}</ol>
      <button class="full" onclick="CG.copyPrompt()">📋 ${T("copyPrompt")}</button>
      <label class="btn full" style="display:block">${T("chooseFile")}<input type="file" accept=".json,application/json,text/plain" style="display:none" onchange="CG.importFile(this)"></label></div>`;
  };

  SCR.badges = () => topbar(T("badges")) + `<div class="grid">${window.CG_BADGES.map((b) => `<div class="card center" style="${S.badges[b.id] ? "" : "opacity:.4;filter:grayscale(1)"}"><div style="font-size:2.2rem">${b.ic}</div><b>${esc(L3(b.n))}</b>${S.badges[b.id] ? `<div class="mut small">${S.badges[b.id]}</div>` : ""}</div>`).join("")}</div>`;

  SCR.settings = () => {
    const seg = (k, opts) => `<div class="seg">${opts.map(([v, l]) => `<button class="${S[k] === v ? "on" : ""}" onclick="CG.setOpt('${k}',${JSON.stringify(v).replace(/"/g, "'")})">${l}</button>`).join("")}</div>`;
    return topbar(T("settings")) +
      `<div class="card"><b>🌐 ${T("language")}</b>${seg("lang", Object.entries(LANGS))}</div>
      <div class="card"><b>🎨 ${T("theme")}</b>${seg("theme", [["auto", T("auto")], ["light", T("light")], ["dark", T("dark")]])}</div>
      <div class="card"><b>🔠 ${T("textSize")}</b><div class="seg"><button onclick="CG.setOpt('font',${Math.max(13, S.font - 1)})">A−</button><button class="on" disabled>${S.font}px</button><button onclick="CG.setOpt('font',${Math.min(22, S.font + 1)})">A+</button></div></div>
      <div class="card"><b>🔊 ${T("voice")}</b>${seg("tts", [[true, T("voiceOn")], [false, T("voiceOff")]])}<b>${T("voiceSpeed")}</b>${seg("rate", [[0.8, "0.8×"], [1, "1×"], [1.2, "1.2×"]])}</div>
      <div class="card"><b>💾 ${T("backup")}</b><p class="mut">${T("dataNote")}</p><button class="full" onclick="CG.backup()">${T("backupBtn")}</button>
      <label class="btn full" style="display:block">${T("restoreBtn")}<input type="file" accept=".json,application/json,text/plain" style="display:none" onchange="CG.restore(this)"></label>
      <button class="full" onclick="CG.resetAll()">🗑 ${T("resetAll")}</button></div>
      <button class="full" onclick="CG.go('about')">ℹ️ ${T("about")}</button>`;
  };

  SCR.about = () => topbar(T("about")) + `<div class="card center"><div style="font-size:3rem">🧑‍🏫</div><h2>${APP.name}</h2><p class="mut">Version ${APP.version} · Offline</p><p>${T("aboutText")}</p></div>
    <div class="card"><b>👨‍💻 ${T("madeBy")}</b><p style="font-size:1.15rem"><b>${APP.dev}</b></p></div>
    <div class="card"><b>✉️ ${T("contact")}</b><p><a href="mailto:${APP.email}?subject=Code%20Guru">${APP.email}</a></p>
    <div class="row"><button class="pri" onclick="location.href='mailto:${APP.email}?subject=Code%20Guru'">${T("sendEmail")}</button><button onclick="CG.copy('${APP.email}')">${T("copyEmail")}</button></div></div>
    <p class="mut small">${T("dataNote")}</p>`;

  SCR.notes = () => {
    const q = (UI.nq || "").toLowerCase();
    let a = notesGet();
    if (q) a = a.filter((n) => (n.text + " " + n.ctx).toLowerCase().includes(q));
    a = a.filter((n) => n.pin).concat(a.filter((n) => !n.pin));
    return topbar(T("notes")) + `<input class="inp" id="nq" placeholder="${esc(T("searchNotes"))}" value="${esc(UI.nq || "")}" oninput="CG.noteSearch(this.value)">
      <div class="row"><button class="pri" onclick="CG.noteNew(true)">✚ ${T("addNote")}</button><button onclick="CG.notesExport()">${T("exportNotes")}</button><button onclick="CG.notesCopy()">${T("copyAll")}</button></div>
      <div id="nl">${a.length ? a.map((n) => `<div class="card"><div class="les">${n.code ? codeBlock("python", n.text, "") : `<p>${n.pin ? "📌 " : ""}${md(n.text)}</p>`}</div><p class="mut small">${esc(n.ctx)} · ${esc(n.d)}</p>
        <div class="row sm"><button onclick="CG.notePin('${n.id}')">${n.pin ? T("unpin") : T("pin")}</button><button onclick="CG.noteEdit('${n.id}')">${T("edit")}</button>${n.role ? `<button onclick="CG.noteOpen('${n.id}')">📖</button>` : ""}<button onclick="CG.noteDel('${n.id}')">🗑 ${T("delete")}</button></div></div>`).join("") : `<p class="mut">${T("noNotes")}</p>`}</div>`;
  };
  SCR.help = () => topbar(T("help")) + `<div class="card"><ol>${T("helpItems").map((x) => `<li style="margin:8px 0">${esc(x)}</li>`).join("")}</ol></div>`;

  /* ---------------- summary + glossary (built from any stage, works offline) ---------------- */
  const plain = (t) => String(t || "").replace(/\*\*|`/g, "").replace(/\s+/g, " ").trim();
  function textBlocksOf(l) { return l.blocks.filter((b) => b[0] === "p" || b[0] === "tip" || b[0] === "warn" || b[0] === "analogy" || b[0] === "list").map((b) => (b[0] === "list" ? b[1].join(". ") + "." : b[1])); }
  function sentencesOf(t) {
    return plain(t).split(/(?<=[.!?।])\s+/).map((s) => s.trim()).filter((s) => s.length >= 30 && s.length <= 280 && (s.match(/[A-Za-zऀ-ॿ]/g) || []).length > s.length * 0.55);
  }
  const SUMC = new Map();
  function summaryOf(st) {
    const k = st.id + "|" + S.lang + "|" + st.lessons.length;
    if (SUMC.has(k)) return SUMC.get(k);
    const raw = st.lessons.map((l) => textBlocksOf(l).join(" ")).join(" ");
    const all = sentencesOf(raw);
    const freq = {};
    tok(raw).forEach((w) => { if (w.length >= 4) freq[w] = (freq[w] || 0) + 1; });
    const score = (s) => { const ws = [...new Set(tok(s))]; return ws.reduce((a, w) => a + (freq[w] || 0), 0) / Math.sqrt(Math.max(4, ws.length)); };
    const seen = new Set();
    const top = all.map((s, i) => ({ s, i, v: score(s) })).sort((a, b) => b.v - a.v).filter((x) => { const key = x.s.slice(0, 40).toLowerCase(); if (seen.has(key)) return false; seen.add(key); return true; }).slice(0, 6).sort((a, b) => a.i - b.i).map((x) => x.s);
    const perLesson = st.lessons.map((l) => {
      const ss = sentencesOf(textBlocksOf(l).join(" "));
      const lst = l.blocks.find((b) => b[0] === "list");
      return { title: l.title, point: ss[0] || (lst ? lst[1].slice(0, 3).map(plain).join(" · ") : "") };
    }).filter((x) => x.point);
    // glossary: words the lessons mark as important (`code`, **bold**), then frequent words
    const cand = new Map();
    const addC = (t, w) => { t = plain(t).replace(/[.:,;()]+$/, "").trim(); if (t.length < 2 || t.length > 32 || /^\d+$/.test(t) || t.split(" ").length > 4) return; const key = t.toLowerCase(); if (STOP.has(key)) return; cand.set(key, { t, w: (cand.get(key) || { w: 0 }).w + w }); };
    st.lessons.forEach((l) => l.blocks.forEach((b) => {
      if (b[0] === "code" || b[0] === "sketch") return;
      const txt = b[0] === "list" ? b[1].join(" ") : String(b[1] || "");
      (txt.match(/`([^`]+)`/g) || []).forEach((m) => addC(m.slice(1, -1), 2));
      (txt.match(/\*\*([^*]+)\*\*/g) || []).forEach((m) => addC(m.slice(2, -2), 3));
    }));
    Object.entries(freq).filter(([w, c]) => c >= 3 && w.length >= 5 && !/^\d/.test(w)).sort((a, b) => b[1] - a[1]).slice(0, 12).forEach(([w, c]) => addC(w, 1));
    const DEF = /( is | are | means | refers | matlab | yaani | hota hai| hoti hai| hote hai| kehte hai| ka kaam | = |है|होता|होती|मतलब|यानी)/i;
    const used = new Set();
    const gloss = [];
    [...cand.values()].sort((a, b) => b.w - a.w).forEach((c) => {
      if (gloss.length >= 15) return;
      const re = new RegExp("(^|[^\\w\\u0900-\\u097F])" + c.t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "([^\\w\\u0900-\\u097F]|$)", "i");
      const hits = all.filter((s) => re.test(s) && !used.has(s));
      const d = hits.filter((s) => DEF.test(s)).sort((a, b) => a.length - b.length)[0] || hits[0];
      if (!d) return;
      used.add(d); gloss.push({ t: c.t, d });
    });
    const r = { top, perLesson, gloss };
    SUMC.set(k, r);
    return r;
  }
  function tabSummary(st, p) {
    const s = summaryOf(st);
    return `<div class="card"><h3 style="margin-top:0">📋 ${T("sumTitle")}</h3>${s.top.length ? `<ul>${s.top.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : `<p class="mut">${md(st.goal)}</p>`}</div>
      ${s.perLesson.length ? `<div class="card"><h3 style="margin-top:0">🧩 ${T("sumLessons")}</h3>${s.perLesson.map((x, i) => `<p><b>${i + 1}. ${esc(x.title)}</b><br>${esc(x.point)}</p>`).join("")}</div>` : ""}
      <div class="card"><h3 style="margin-top:0">📚 ${T("glossary")}</h3>${s.gloss.length ? s.gloss.map((g) => `<div class="gl"><b>${esc(g.t)}</b><div>${esc(g.d)}</div></div>`).join("") : `<p class="mut">${T("noGloss")}</p>`}</div>
      <div class="row"><button class="pri" onclick="CG.flashStage()">🃏 ${T("stageCards")}</button>${s.gloss.length ? `<button onclick="CG.addGloss()">${T("addGloss")}</button>` : ""}</div>
      <div class="row"><button onclick="CG.copySummary()">📋 ${T("copyAll")}</button><button onclick="CG.noteSummary()">${T("saveToNotes")}</button></div>`;
  }
  function summaryText(st) {
    const s = summaryOf(st);
    return `${T("stage")} ${st.n}: ${st.title}\n\n${T("sumTitle")}:\n` + s.top.map((x) => "• " + x).join("\n") + (s.gloss.length ? `\n\n${T("glossary")}:\n` + s.gloss.map((g) => `• ${g.t}: ${g.d}`).join("\n") : "");
  }

  /* ---------------- revision (spaced repetition flashcards, phone only) ---------------- */
  const RKEY = "cg_srs_v1";
  const srsGet = () => { try { return JSON.parse(localStorage.getItem(RKEY) || "{}"); } catch (e) { return {}; } };
  const srsSet = (o) => { try { localStorage.setItem(RKEY, JSON.stringify(o)); } catch (e) { /* ignore */ } };
  const dayStr = (d) => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  const addDays = (n) => dayStr(new Date(Date.now() + n * 864e5));
  const GAP = [0, 0, 1, 3, 7, 16, 35]; // days to wait for box 1..6
  const cardId = (role, n, kind, key) => role + "|" + n + "|" + kind + "|" + key;
  function cardOf(id) {
    const [role, n, kind, ...rest] = id.split("|"); const key = rest.join("|");
    const pk = getPack(role); const st = pk && pk.stages.find((s) => s.n === +n);
    if (!st) return null;
    const where = (roleInfo(role) ? L3(roleInfo(role).name) : role) + " · " + T("stage") + " " + n;
    if (kind === "q") { const q = st.quiz[+key]; return q && { where, front: q.q, code: q.code, back: "**" + T("correctAns") + ":** " + q.o[q.a] + (q.why ? "\n" + q.why : ""), role, n: +n }; }
    if (kind === "iq") { const q = st.iq[+key]; return q && { where, front: q.q, back: q.a, role, n: +n }; }
    if (kind === "g") { const g = summaryOf(st).gloss.find((x) => x.t === key); return g && { where, front: T("whatIs").replace("{t}", g.t), back: g.d, role, n: +n }; }
    return null;
  }
  function addCards(ids, b, due) { const o = srsGet(); let c = 0; ids.forEach((id) => { if (!o[id]) { o[id] = { b: b || 1, due: due || today() }; c++; } }); srsSet(o); return c; }
  function markCard(id, ok) {
    const o = srsGet(); const c = o[id] || { b: 1, due: today() };
    c.b = ok ? Math.min(6, c.b + 1) : 1; c.due = ok ? addDays(GAP[c.b]) : today(); c.n = (c.n || 0) + 1;
    o[id] = c; srsSet(o);
  }
  const dueIds = () => { const o = srsGet(), t = today(); return Object.keys(o).filter((k) => o[k].due <= t).sort((a, b) => (o[a].due < o[b].due ? -1 : o[a].due > o[b].due ? 1 : o[a].b - o[b].b)); };
  function stageCardIds(role, st) {
    return st.quiz.map((_, i) => cardId(role, st.n, "q", i)).concat(st.iq.map((_, i) => cardId(role, st.n, "iq", i)), summaryOf(st).gloss.map((g) => cardId(role, st.n, "g", g.t)));
  }
  async function ensurePacks(ids) { const roles = new Set(ids.map((id) => id.split("|")[0])); for (const r of roles) if (BUNDLED[r]) await loadPack(r, S.lang); }

  SCR.revise = () => {
    const rv = UI.rv;
    if (!rv) {
      const o = srsGet(), ids = Object.keys(o), due = dueIds().length;
      const boxes = [1, 2, 3, 4, 5, 6].map((b) => ids.filter((k) => o[k].b === b).length);
      const per = {};
      ids.forEach((k) => { const r = k.split("|")[0]; per[r] = (per[r] || 0) + 1; });
      return topbar(T("revise")) + `<div class="card"><p>🔁 ${T("reviseIntro")}</p>
        <div class="row" style="align-items:center"><div><div class="big">${due}</div><div class="mut small">${T("dueToday")}</div></div><div><div class="big">${ids.length}</div><div class="mut small">${T("totalCards")}</div></div></div>
        ${ids.length ? `<p class="mut small">${T("boxes")}: ${boxes.map((c, i) => `<span class="chip ${i >= 3 ? "ok" : ""}">${"★".repeat(i + 1)} ${c}</span>`).join("")}</p>` : ""}</div>
        ${due ? `<button class="pri full" onclick="CG.reviseStart('due')">▶ ${T("startRevise")} (${due})</button>` : `<div class="card center"><p>${ids.length ? T("noDue") : T("noCards")}</p></div>`}
        ${Object.keys(per).length ? `<h3>🃏 ${T("byCourse")}</h3>` + Object.entries(per).map(([r, c]) => { const ri = roleInfo(r); return `<button class="card rolec" onclick="CG.reviseStart('${r}')"><span class="ic">${esc(ri ? ri.icon : "📘")}</span><span class="b"><b>${esc(ri ? L3(ri.name) : r)}</b><div class="mut small">${c} cards</div></span><span>▶</span></button>`; }).join("") : ""}`;
    }
    if (rv.i >= rv.ids.length) {
      return topbar(T("revise")) + `<div class="card center"><div class="big">🎉</div><h2>${T("reviseDone")}</h2><p>✅ ${rv.ok} · ❌ ${rv.bad}</p>
        <div class="row"><button onclick="CG.reviseExit()">← ${T("revise")}</button><button class="pri" onclick="CG.home()">🏠 ${T("home")}</button></div></div>`;
    }
    const c = cardOf(rv.ids[rv.i]);
    if (!c) { rv.i++; return SCR.revise(); }
    return topbar(T("revise")) + `<div class="row" style="align-items:center"><span class="chip">${rv.i + 1}/${rv.ids.length}</span><span class="chip ok">✅ ${rv.ok}</span><span class="chip">❌ ${rv.bad}</span><button style="flex:none" onclick="CG.reviseExit()">✕</button></div>
      <div class="bar"><i style="width:${(rv.i / rv.ids.length) * 100}%;background:var(--pri)"></i></div>
      <div class="card flash"><div class="mut small">${esc(c.where)}</div><p style="font-weight:600;font-size:1.08rem">${md(c.front)}</p>${c.code ? codeBlock("python", c.code, "") : ""}
      ${rv.flip ? `<div class="iqa fadein">${md(c.back)}</div>` : ""}</div>
      ${rv.flip ? `<div class="row"><button style="background:var(--badbg);border-color:var(--bad);color:var(--bad)" onclick="CG.reviseMark(false)">${T("forgot")}</button><button style="background:var(--okbg);border-color:var(--ok);color:var(--ok)" onclick="CG.reviseMark(true)">${T("knew")}</button></div>
      <button class="full" onclick="CG.reviseSay()">${T("speak")}</button>` : `<button class="pri full" onclick="CG.reviseFlip()">${T("showAns")}</button>`}`;
  };

  /* ---------------- mock IQ exam ---------------- */
  function allCourses() {
    const out = [];
    const a = getPack("aiml"); if (a) out.push({ key: "aiml", icon: "🧠", name: T("course"), stages: a.stages });
    BOOKS.concat(IMPORTED).forEach((p) => out.push({ key: p.key, icon: p.role.icon || "📘", name: p.role.name, stages: p.stages }));
    return out;
  }
  const studied = (role, n) => { const p = (S.prog[role] || {})[n]; return !!p && (p.L.length > 0 || p.Q != null || p.T || p.I.length > 0); };
  SCR.exam = () => {
    const ex = UI.ex || (UI.ex = { setup: { role: S.cur && getPack(S.cur) ? S.cur : "aiml", kind: "mcq", count: 20, scope: "done" } });
    if (ex.run) return examRunView(ex.run);
    if (ex.rep) return examReportView(ex.rep);
    const su = ex.setup, cs = allCourses();
    const seg = (k, opts) => `<div class="seg">${opts.map(([v, l]) => `<button class="${su[k] === v ? "on" : ""}" onclick="CG.exSet('${k}',${typeof v === "number" ? v : `'${v}'`})">${l}</button>`).join("")}</div>`;
    const hist = (S.exams || []).slice(-5).reverse();
    return topbar(T("exam")) + `<div class="card"><p>🏁 ${T("examIntro")}</p></div>
      <div class="card"><b>${T("examCourse")}</b><select class="inp" onchange="CG.exSet('role',this.value)">${cs.map((c) => `<option value="${esc(c.key)}" ${su.role === c.key ? "selected" : ""}>${esc(c.icon + " " + c.name)}</option>`).join("")}</select>
      <b>${T("examType")}</b>${seg("kind", [["mcq", "📝 " + T("mcq")], ["iq", "🎯 " + T("iqRound")]])}
      <b>${T("qCount")}</b>${seg("count", [[10, "10"], [20, "20"], [30, "30"]])}
      <b>${T("scope")}</b>${seg("scope", [["done", T("scopeDone")], ["all", T("scopeAll")]])}</div>
      <button class="pri full" onclick="CG.examStart()">${T("startExam")}</button>
      ${hist.length ? `<h3>📜 ${T("examHistory")}</h3>` + hist.map((h) => { const ri = roleInfo(h.role); return `<div class="card row" style="align-items:center"><span>${esc(ri ? ri.icon + " " + L3(ri.name) : h.role)}<br><span class="mut small">${esc(h.d)} · ${h.kind === "iq" ? T("iqRound") : T("mcq")} · ${h.n}</span></span><span class="chip ${h.pct >= 80 ? "ok" : ""}" style="flex:none">${h.pct}%</span></div>`; }).join("") : ""}`;
  };
  function examRunView(r) {
    const q = r.qs[r.i], left = Math.max(0, Math.ceil((r.end - Date.now()) / 1000));
    const head = `<div class="row" style="align-items:center"><span class="chip">${r.i + 1}/${r.qs.length}</span><span class="chip xp" id="extime">⏱ ${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}</span><button style="flex:none" onclick="CG.examEnd(true)">${T("endExam")}</button></div>
      <div class="bar"><i style="width:${(r.i / r.qs.length) * 100}%;background:var(--pri)"></i></div><div class="mut small">${esc(q.where)}</div>`;
    if (r.kind === "iq") {
      return topbar(T("exam")) + head + `<div class="card"><p style="font-weight:600;font-size:1.08rem">${md(q.q)}</p>${q.show ? `<div class="iqa fadein">${md(q.a)}</div>` : `<p class="mut small">${T("thinkFirst")}</p>`}</div>
        ${q.show ? `<div class="row"><button style="background:var(--badbg);border-color:var(--bad);color:var(--bad)" onclick="CG.exIQ(false)">${T("forgot")}</button><button style="background:var(--okbg);border-color:var(--ok);color:var(--ok)" onclick="CG.exIQ(true)">${T("knew")}</button></div>` : `<button class="pri full" onclick="CG.exShow()">${T("showAns")}</button>`}`;
    }
    return topbar(T("exam")) + head + `<div class="card"><p style="font-weight:600">${md(q.q)}</p>${q.code ? codeBlock("python", q.code, "") : ""}
      ${q.order.map((oi, k) => `<button class="opt ${q.sel === k ? "sel" : ""}" onclick="CG.exSel(${k})"><span class="lt">${"ABCD"[k]}</span><span>${md(q.o[oi])}</span></button>`).join("")}</div>
      <div class="row"><button onclick="CG.exNext(true)">${T("skip")}</button><button class="pri" ${q.sel == null ? "disabled" : ""} onclick="CG.exNext(false)">${r.i >= r.qs.length - 1 ? T("finish") : T("next")}</button></div>`;
  }
  function examReportView(rep) {
    const msg = rep.pct >= 80 ? T("strongMsg") : rep.pct >= 60 ? T("midMsg") : T("lowMsg");
    const rows = Object.values(rep.by).sort((a, b) => a.right / a.total - b.right / b.total);
    const weak = rows.filter((x) => x.right / x.total < 0.6);
    const mm = Math.floor(rep.secs / 60), ss = rep.secs % 60;
    return topbar(T("report")) + `<div class="card center"><div class="big">${rep.pct >= 80 ? "🏆" : rep.pct >= 60 ? "👍" : "💪"}</div><div class="big">${rep.pct}%</div><p>${rep.right}/${rep.total} · ${T("timeUsed")}: ${mm}:${String(ss).padStart(2, "0")}${rep.timeUp ? " · " + T("timeUp") : ""}</p><div class="res ${rep.pct >= 80 ? "ok" : "bad"}">${msg}</div></div>
      <div class="card"><h3 style="margin-top:0">📊 ${T("perStage")}</h3>${rows.map((x) => `<div class="exrow"><span>${esc(x.title)}</span><b>${x.right}/${x.total}</b></div><div class="bar"><i style="width:${(x.right / x.total) * 100}%;background:${x.right / x.total >= 0.8 ? "var(--ok)" : x.right / x.total >= 0.6 ? "var(--xp)" : "var(--bad)"}"></i></div>`).join("")}</div>
      ${weak.length ? `<div class="card"><h3 style="margin-top:0">⚠️ ${T("weak")}</h3>${weak.map((x) => `<div class="row" style="align-items:center"><span>${esc(x.title)}</span><button style="flex:none" onclick="CG.openAt('${x.role}',${x.n},'learn')">${T("open")}</button></div>`).join("")}</div>` : ""}
      ${rep.wrong.length ? `<p class="mut small">🔁 ${T("wrongAdded")}</p><h3>❌ ${T("wrongList")}</h3>` + rep.wrong.map((w) => `<div class="card"><div class="mut small">${esc(w.where)}</div><p style="font-weight:600">${md(w.q)}</p>${w.code ? codeBlock("python", w.code, "") : ""}${w.your != null ? `<p>❌ ${T("yourAns")}: ${md(w.your)}</p>` : rep.kind === "mcq" ? `<p class="mut">${T("noAnswer")}</p>` : ""}<div class="iqa">✅ ${md(w.right)}</div></div>`).join("") : ""}
      <div class="row"><button onclick="CG.examNew()">${T("newExam")}</button><button class="pri" onclick="CG.examStart()">${T("retake")}</button></div>`;
  }

  /* ---------------- progress dashboard ---------------- */
  SCR.dash = () => {
    const t = today(), dayXP = (S.day || {})[t] || 0, goal = S.goal || 50;
    const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(Date.now() - (6 - i) * 864e5); return { k: dayStr(d), lab: d.toLocaleDateString(S.lang === "hindi" ? "hi-IN" : "en-IN", { weekday: "short" }), v: (S.day || {})[dayStr(d)] || 0 }; });
    const mx = Math.max(goal, ...days.map((d) => d.v));
    const chart = `<svg viewBox="0 0 280 130" class="chart" role="img" aria-label="${esc(T("last7"))}"><line x1="0" x2="280" y1="${100 - (goal / mx) * 88}" y2="${100 - (goal / mx) * 88}" class="goal"/>${days.map((d, i) => { const h = (d.v / mx) * 88; return `<rect x="${i * 40 + 8}" y="${100 - h}" width="24" height="${Math.max(h, 1)}" rx="4" class="${d.v >= goal ? "hit" : "bar"}"/><text x="${i * 40 + 20}" y="${96 - h}" text-anchor="middle" class="v">${d.v || ""}</text><text x="${i * 40 + 20}" y="118" text-anchor="middle" class="d">${esc(d.lab)}</text>`; }).join("")}</svg>`;
    let L = 0, Pr = 0, St = 0, I = 0;
    for (const r in S.prog) for (const n in S.prog[r]) { const p = S.prog[r][n]; L += p.L.length; Pr += p.P.filter(Boolean).length; if (p.Q >= 80) St++; I += p.I.length; }
    const stat = (ic, v, l) => `<div class="card center stat"><div class="big">${ic} ${v}</div><div class="mut small">${l}</div></div>`;
    const cs = allCourses().map((c) => { const at = c.stages.filter((s) => (S.prog[c.key] || {})[s.n] && S.prog[c.key][s.n].Q != null); const done = c.stages.filter((s) => cleared(c.key, s.n)).length; return Object.assign(c, { done, avg: at.length ? Math.round(at.reduce((a, s) => a + S.prog[c.key][s.n].Q, 0) / at.length) : null, started: c.stages.some((s) => studied(c.key, s.n)) }); });
    const started = cs.filter((c) => c.started || c.key === "aiml");
    const weak = [];
    cs.forEach((c) => c.stages.forEach((s) => { const p = (S.prog[c.key] || {})[s.n]; if (p && p.Q != null && p.Q < 80) weak.push({ role: c.key, n: s.n, title: s.title, q: p.Q, icon: c.icon }); }));
    weak.sort((a, b) => a.q - b.q);
    const ex = (S.exams || []).slice(-5).reverse();
    return topbar(T("dash")) + `<div class="card"><b>🎯 ${T("todayGoal")}</b><div class="row" style="align-items:center"><div class="big">${dayXP} / ${goal} XP</div>${dayXP >= goal ? `<span class="chip ok" style="flex:none">✓</span>` : ""}</div>
      <div class="bar"><i style="width:${Math.min(100, (dayXP / goal) * 100)}%;background:var(--ok)"></i></div>
      <div class="seg">${[30, 50, 100, 200].map((g) => `<button class="${goal === g ? "on" : ""}" onclick="CG.setOpt('goal',${g})">${g} ${T("goalXP")}</button>`).join("")}</div></div>
      <div class="card"><b>📈 ${T("last7")}</b>${chart}</div>
      <div class="grid g3">${stat("📖", L, T("statLessons"))}${stat("💻", Pr, T("statPractice"))}${stat("🏆", St, T("statStages"))}${stat("🎯", I, T("statIQ"))}${stat("🔁", dueIds().length, T("statDue"))}${stat("🏁", (S.exams || []).length, T("statExams"))}</div>
      <h3>📚 ${T("myCourses")}</h3>${started.map((c) => `<button class="card rolec" onclick="CG.openRole('${c.key}')"><span class="ic">${esc(c.icon)}</span><span class="b"><b>${esc(c.name)}</b><div class="bar" style="margin:6px 0"><i style="width:${(c.done / c.stages.length) * 100}%;background:var(--ok)"></i></div><span class="mut small">${c.done}/${c.stages.length} ${T("stages")}${c.avg != null ? " · " + T("avgScore") + " " + c.avg + "%" : ""}</span></span></button>`).join("")}
      <h3>⚠️ ${T("weakStages")}</h3>${weak.length ? weak.slice(0, 8).map((w) => `<div class="card row" style="align-items:center"><span>${esc(w.icon)} ${T("stage")} ${w.n}: ${esc(w.title)}<br><span class="mut small">${T("best")}: ${w.q}%</span></span><button style="flex:none" onclick="CG.openAt('${w.role}',${w.n},'test')">${T("retest")}</button></div>`).join("") : `<p class="mut">${T("noWeak")}</p>`}
      ${ex.length ? `<h3>🏁 ${T("examHistory")}</h3>` + ex.map((h) => { const ri = roleInfo(h.role); return `<div class="card row" style="align-items:center"><span>${esc(ri ? ri.icon + " " + L3(ri.name) : h.role)}<br><span class="mut small">${esc(h.d)} · ${h.kind === "iq" ? T("iqRound") : T("mcq")}</span></span><span class="chip ${h.pct >= 80 ? "ok" : ""}" style="flex:none">${h.pct}%</span></div>`; }).join("") : ""}
      <div class="row"><button onclick="CG.go('revise')">🔁 ${T("revise")}</button><button class="pri" onclick="CG.go('exam')">🏁 ${T("exam")}</button></div>`;
  };

  /* ---------------- games ---------------- */
  function gameData(st) {
    const outs = [], codes = [];
    st.lessons.forEach((l) => l.blocks.forEach((b) => { if (b[0] === "code" && (b[1] === "python" || b[1] === "js")) { codes.push(b[2]); if (b[3] && b[3].length < 160 && b[2].length < 500) outs.push({ code: b[2], out: b[3] }); } }));
    return { outs, codes };
  }
  function buildGame(kind, st) {
    const g = { kind, i: 0, score: 0, lives: 3, qs: [], sel: null, ans: null, start: Date.now() };
    const { outs, codes } = gameData(st);
    if (kind === "out") {
      const pool = [...new Set(outs.map((o) => o.out))];
      g.qs = shuffle(outs).slice(0, 8).map((o) => { const opts = shuffle([o.out].concat(shuffle(pool.filter((x) => x !== o.out)).slice(0, 3))); return { code: o.code, o: opts, a: opts.indexOf(o.out) }; }).filter((q) => q.o.length >= 2);
    } else if (kind === "fill") {
      const toks = [];
      codes.forEach((c) => c.split("\n").forEach((line) => { (line.match(/[A-Za-z_][A-Za-z0-9_]{1,}|\d+/g) || []).forEach((t) => toks.push(t)); }));
      const vocab = [...new Set(toks)];
      shuffle(codes).forEach((c) => {
        if (g.qs.length >= 8) return;
        const lines = c.split("\n").filter((l) => l.trim() && !l.trim().startsWith("#"));
        const cand = shuffle(lines).find((l) => (l.match(/[A-Za-z_][A-Za-z0-9_]{2,}/g) || []).length);
        if (!cand) return;
        const ws = cand.match(/[A-Za-z_][A-Za-z0-9_]{2,}/g), w = ws[Math.floor(Math.random() * ws.length)];
        const others = shuffle(vocab.filter((x) => x !== w && x.length >= 2)).slice(0, 3);
        if (others.length < 3) return;
        const blanked = c.replace(cand, cand.replace(new RegExp("\\b" + w + "\\b"), "____"));
        const opts = shuffle([w].concat(others));
        g.qs.push({ code: blanked, o: opts, a: opts.indexOf(w) });
      });
    } else if (kind === "speed") {
      g.qs = shuffle(st.quiz.concat(st.quiz)).map((q) => { const order = shuffle([0, 1, 2, 3].slice(0, q.o.length)); return { q: q.q, code: q.code, o: order.map((k) => q.o[k]), a: order.indexOf(q.a) }; });
      g.end = Date.now() + 60000;
    } else if (kind === "match") {
      const pairs = shuffle(st.iq.filter((x) => x.a.length < 400)).slice(0, 4).map((x) => ({ q: x.q, a: x.a.split(/(?<=[.!?।])\s/)[0].slice(0, 140) }));
      if (pairs.length < 2) { g.qs = []; return g; }
      g.pairs = pairs; g.right = shuffle(pairs.map((x, i) => i)); g.done = {}; g.pickL = null; g.wrong = 0;
      g.qs = [1];
    }
    return g;
  }
  function tabGames(st, p) {
    const g = UI.game && UI.game.key === st.id + S.lang ? UI.game : null;
    if (!g) {
      const card = (k, t, d) => `<button class="card rolec" onclick="CG.gameStart('${k}')"><span class="b"><b>${t}</b><div class="mut small">${d}</div></span><span>▶</span></button>`;
      return `<div class="card"><p>🎮 ${T("gamesIntro")}</p>${p.G ? `<span class="chip xp">${T("best")}: ★${p.G}</span>` : ""}</div>` + card("out", T("gOut"), T("gOutD")) + card("fill", T("gFill"), T("gFillD")) + card("speed", T("gSpeed"), T("gSpeedD")) + card("match", T("gMatch"), T("gMatchD"));
    }
    if (!g.qs.length) return `<div class="card center"><p>${T("noGame")}</p><button class="full" onclick="CG.gameExit()">← ${T("games")}</button></div>`;
    const over = g.over || (g.kind !== "match" && (g.i >= g.qs.length || g.lives <= 0 || (g.end && Date.now() > g.end)));
    if (over) {
      if (!g.saved) { g.saved = 1; const pp = P(UI.a.role, UI.a.n); pp.G = Math.max(pp.G || 0, g.score); save(); addXP(Math.min(40, g.score * 5)); if (g.score >= 5) badge("gamer"); }
      return `<div class="card center"><div class="big">🏁</div><h2>${T("gameOver")}</h2><div class="big">★ ${g.score}</div><div class="row"><button onclick="CG.gameExit()">← ${T("games")}</button><button class="pri" onclick="CG.gameStart('${g.kind}')">${T("playAgain")}</button></div></div>`;
    }
    const head = `<div class="row" style="align-items:center"><span class="chip xp">★ ${g.score}</span>${g.kind !== "match" ? `<span class="chip">${"❤️".repeat(Math.max(0, g.lives))}</span>` : ""}${g.end ? `<span class="chip" id="gtime">⏱ ${Math.max(0, Math.ceil((g.end - Date.now()) / 1000))}s</span>` : `<span class="chip">${Math.min(g.i + 1, g.qs.length)}/${g.qs.length}</span>`}<button style="flex:none" onclick="CG.gameExit()">✕</button></div>`;
    if (g.kind === "match") {
      const L = g.pairs.map((x, i) => `<button class="opt ${g.done[i] ? "right" : g.pickL === i ? "sel" : ""}" ${g.done[i] ? "disabled" : ""} onclick="CG.matchL(${i})"><span>${md(x.q)}</span></button>`).join("");
      const R = g.right.map((i) => `<button class="opt ${g.done[i] ? "right" : ""}" ${g.done[i] ? "disabled" : ""} onclick="CG.matchR(${i})"><span>${md(g.pairs[i].a)}</span></button>`).join("");
      return head + `<p class="mut">${T("pickPair")}</p><div class="card"><b>❓</b>${L}</div><div class="card"><b>✅</b>${R}</div>`;
    }
    const q = g.qs[g.i];
    return head + `<div class="card">${q.q ? `<p style="font-weight:600">${md(q.q)}</p>` : ""}${q.code ? codeBlock("python", q.code, "") : ""}
      ${q.o.map((o, k) => { let c = "opt"; if (g.ans != null) { if (k === q.a) c += " right"; else if (k === g.ans) c += " wrongo"; } return `<button class="${c}" ${g.ans != null ? "disabled" : ""} onclick="CG.gameAns(${k})"><span class="lt">${"ABCD"[k]}</span>${g.kind === "out" ? `<pre class="gopt">${esc(o)}</pre>` : `<span>${md(o)}</span>`}</button>`; }).join("")}</div>
      ${g.ans != null ? `<button class="pri full" onclick="CG.gameNext()">${T("nextQ")} →</button>` : ""}`;
  }

  /* ---------------- stage download / PDF ---------------- */
  function stageDoc(st, roleName) {
    const css = `body{font:15px/1.6 system-ui,sans-serif;max-width:760px;margin:0 auto;padding:20px;color:#1e1b2e}h1{color:#5b4bdb}h2{border-bottom:2px solid #e4e0f2;padding-bottom:4px;margin-top:28px}pre{background:#f3f1fb;padding:10px;border-radius:8px;white-space:pre-wrap;font:13px/1.45 monospace}.out{border-left:3px solid #16794c;padding-left:8px;color:#16794c;white-space:pre-wrap;font:13px monospace}.tip{background:#ece9ff;padding:8px 10px;border-radius:8px}.warn{background:#fdecea;padding:8px 10px;border-radius:8px}.ana{background:#fff4dc;padding:8px 10px;border-radius:8px}svg{max-width:100%;height:auto}.sk .sk-t{fill:#2b2a33}.sk .sk-box{stroke:#2b2a33;stroke-width:2;fill:#fff}.sk .f1{fill:#fff3b0}.sk .f2{fill:#d7ecff}.sk .f3{fill:#d8f5df}.sk .f4{fill:#ffe0ec}.sk .f5{fill:#efe3ff}.sk .sk-line,.sk .sk-arrow{stroke:#2b2a33;stroke-width:2;fill:none}.sk .sk-faint{stroke:#999;fill:none}.sk .sk-plot{stroke:#5b4bdb;stroke-width:2.5;fill:none}.sk .sk-accline{stroke:#e11d48;stroke-width:2;fill:none;stroke-dasharray:6 4}.sk .sk-dot{fill:#5b4bdb}.sk .sk-title,.sk .sk-accent{fill:#5b4bdb}.sk .sk-dim{fill:#6b6880}code{background:#f3f1fb;padding:1px 4px;border-radius:4px}.q{margin:10px 0}@media print{h2{page-break-after:avoid}pre,svg{page-break-inside:avoid}}`;
    const B = (blocks) => blocks.map((b) => {
      if (b[0] === "p") return `<p>${md(b[1])}</p>`;
      if (b[0] === "code") return `<pre>${esc(b[2])}</pre>${b[3] ? `<div class="out">${esc(b[3])}</div>` : ""}`;
      if (b[0] === "sketch") return window.sketchSVG ? window.sketchSVG(b[1]) : "";
      if (b[0] === "tip") return `<p class="tip">💡 ${md(b[1])}</p>`;
      if (b[0] === "warn") return `<p class="warn">⚠️ ${md(b[1])}</p>`;
      if (b[0] === "analogy") return `<p class="ana">🍵 ${md(b[1])}</p>`;
      if (b[0] === "list") return `<ul>${b[1].map((x) => `<li>${md(x)}</li>`).join("")}</ul>`;
      return "";
    }).join("");
    const notes = notesGet().filter((n) => n.role === UI.a.role && n.n === st.n);
    return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(st.title)}</title><style>${css}</style></head><body>
      <p style="color:#6b6880">${esc(roleName)} · ${APP.name}</p><h1>${T("stage")} ${st.n}: ${esc(st.title)}</h1><p><b>🎯 ${T("goal")}:</b> ${md(st.goal)}</p>
      ${(() => { const s = summaryOf(st); return `<h2>📋 ${T("sumTitle")}</h2><ul>${s.top.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>${s.gloss.length ? `<h2>📚 ${T("glossary")}</h2>${s.gloss.map((g) => `<p><b>${esc(g.t)}</b> — ${esc(g.d)}</p>`).join("")}` : ""}`; })()}
      ${st.lessons.map((l, i) => `<h2>${T("lesson")} ${i + 1}: ${esc(l.title)}</h2>${B(l.blocks)}`).join("")}
      ${st.practice.length ? `<h2>💻 ${T("practice")}</h2>${st.practice.map((q, i) => `<div class="q"><b>${i + 1}.</b> ${md(q.q)}<pre>${esc(q.solution)}</pre><div class="out">${esc(q.expect)}</div></div>`).join("")}` : ""}
      <h2>📝 ${T("test")}</h2>${st.quiz.map((q, i) => `<div class="q"><b>${i + 1}. ${md(q.q)}</b>${q.code ? `<pre>${esc(q.code)}</pre>` : ""}<br>✅ ${md(q.o[q.a])}<br><span style="color:#6b6880">${md(q.why)}</span></div>`).join("")}
      <h2>🎯 ${T("iq")}</h2>${st.iq.map((q, i) => `<div class="q"><b>${i + 1}. ${md(q.q)}</b><br>${md(q.a)}</div>`).join("")}
      ${notes.length ? `<h2>📒 ${T("notes")}</h2>${notes.map((n) => `<div class="q">${n.code ? `<pre>${esc(n.text)}</pre>` : md(n.text)}</div>`).join("")}` : ""}
      <p style="color:#6b6880;margin-top:30px">Made with ${APP.name} · ${APP.dev}</p></body></html>`;
  }
  function saveFile(name, data, mime) {
    if (window.AndroidApp && AndroidApp.saveFile) { try { AndroidApp.saveFile(name, data, mime || "text/html"); return; } catch (e) { /* fall back */ } }
    try { const u = URL.createObjectURL(new Blob([data], { type: mime || "text/html" })); const a = document.createElement("a"); a.href = u; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 3000); toast(T("downloaded")); } catch (e) { copyText(data); }
  }
  function printHtml(html, title) {
    if (window.AndroidApp && AndroidApp.printHtml) { try { AndroidApp.printHtml(html, title); return; } catch (e) { /* fall back */ } }
    const f = document.createElement("iframe"); f.style.cssText = "position:fixed;width:0;height:0;border:0;right:0;bottom:0"; document.body.appendChild(f);
    f.contentDocument.open(); f.contentDocument.write(html); f.contentDocument.close();
    setTimeout(() => { try { f.contentWindow.focus(); f.contentWindow.print(); } catch (e) { /* ignore */ } setTimeout(() => f.remove(), 2000); }, 400);
  }
  const fileName = (t) => String(t).toLowerCase().replace(/[^a-z0-9\u0900-\u097f]+/gi, "-").replace(/^-|-$/g, "").slice(0, 50) || "stage";

  function modalHtml() {
    const m = UI.modal; if (!m) return "";
    let body;
    if (m.sheet) body = m.sheet;
    else if (m.note) body = `<h3>${m.note.id ? T("editNote") : "📝 " + T("addNote")}</h3><p class="mut small">${esc(m.note.ctx)}</p><textarea class="inp" id="nt" rows="7" placeholder="${esc(T("notePh"))}">${esc(m.note.text || "")}</textarea><div class="row"><button onclick="CG.closeModal()">${T("cancel")}</button><button class="pri" onclick="CG.noteSave()">${T("save")}</button></div>`;
    else if (m.menu) body = `<h3>☰ ${T("menu")}</h3><button class="pri full" onclick="CG.closeModal()">${T("resume")}</button><button class="full" onclick="CG.noteNew()">📝 ${T("addNote")}</button><button class="full" onclick="CG.go('notes')">📒 ${T("notes")}</button><button class="full" onclick="CG.stageDownload()">${T("downloadStage")}</button><button class="full" onclick="CG.stagePdf()">${T("pdfStage")}</button><button class="full" onclick="CG.flashStage()">🃏 ${T("stageCards")}</button><button class="full" onclick="CG.go('revise')">🔁 ${T("revise")}</button><button class="full" onclick="CG.go('exam')">🏁 ${T("exam")}</button><button class="full" onclick="CG.go('dash')">📊 ${T("dash")}</button><button class="full" onclick="CG.go('ask')">💬 ${T("ask")}</button><button class="full" onclick="CG.go('playground')">💻 ${T("playground")}</button><button class="full" onclick="CG.go('settings')">⚙️ ${T("settings")}</button><button class="full" onclick="CG.go('help')">❓ ${T("help")}</button><button class="full" onclick="CG.home()">🏠 ${T("home")}</button>`;
    else if (m.busy) body = `<h3>${esc(m.busy)}</h3><div class="bar"><i style="width:${(m.pct || 0) * 100}%;background:var(--pri)"></i></div><p class="mut small" id="busytxt">${esc(m.sub || "")}</p>`;
    else body = `<p>${esc(m.msg)}</p><div class="row"><button onclick="CG.closeModal()">${T("cancel")}</button><button class="pri" style="background:var(--bad);border-color:var(--bad)" onclick="CG.okModal()">${esc(m.ok)}</button></div>`;
    return `<div class="ov" onclick="if(event.target===this&&!${!!m.busy})CG.closeModal()"><div class="sheet">${body}</div></div>`;
  }

  function render() {
    const app = $("app"); if (!app) return;
    UI.codes = {};
    const f = SCR[UI.scr] || SCR.home;
    app.innerHTML = f() + modalHtml();
    if (!UI.keep) window.scrollTo(0, 0);
    UI.keep = 0;
    if (UI.modal && UI.modal.note) { const t = $("nt"); if (t) { t.focus(); t.setSelectionRange(t.value.length, t.value.length); } }
    clearInterval(UI.gt);
    if (UI.scr === "exam" && UI.ex && UI.ex.run) UI.gt = setInterval(() => { const r = UI.ex && UI.ex.run, el = $("extime"); if (!r || UI.scr !== "exam") { clearInterval(UI.gt); return; } const left = Math.ceil((r.end - Date.now()) / 1000); if (left <= 0) { clearInterval(UI.gt); CG.examEnd(false, true); } else if (el) el.textContent = "⏱ " + Math.floor(left / 60) + ":" + String(left % 60).padStart(2, "0"); }, 500);
    else if (UI.scr === "stage" && UI.game && UI.game.end && !UI.game.over) UI.gt = setInterval(() => { const g = UI.game, el = $("gtime"); if (!g || UI.scr !== "stage") { clearInterval(UI.gt); return; } if (Date.now() > g.end) { clearInterval(UI.gt); g.over = 1; UI.keep = 1; render(); } else if (el) el.textContent = "⏱ " + Math.ceil((g.end - Date.now()) / 1000) + "s"; }, 500);
  }

  /* ---------------- search (Ask) ---------------- */
  const STOP = new Set("a an the is are was what why how when which who kya kyu kyun kaise kab kaun hai hain ka ki ke ko me mein se aur ya to of in on for and or do does i me my we you tu tum aap ye yeh woh wo hota hoti hote karna karte kare karo batao bataiye explain tell difference farak fark between kaun-sa please plz".split(" "));
  const SYN = {
    farak: "difference", fark: "difference", "फ़र्क": "difference", "फर्क": "difference", antar: "difference", vs: "difference",
    galti: "error", "गलती": "error", "ग़लती": "error", dikkat: "error", problem: "error", issue: "error",
    suchi: "list", "सूची": "list", shabdkosh: "dict", dictionary: "dict", "डिक्शनरी": "dict", "लिस्ट": "list", "लूप": "loop", "फंक्शन": "function", "फ़ंक्शन": "function",
    "कक्षा": "class", "वेरिएबल": "variable", "डेटाबेस": "database", "मॉडल": "model", "ग्राफ": "chart", "ग्राफ़": "chart", graph: "chart", plot: "chart",
    banana: "create", banao: "create", "बनाना": "create", chalana: "run", chalao: "run", "चलाना": "run",
    loops: "loop", lists: "list", functions: "function", classes: "class", models: "model", errors: "error", tables: "table", queries: "query",
    ml: "machine learning", ai: "artificial intelligence", nn: "neural network", llm: "llm", db: "database", df: "dataframe", np: "numpy", pd: "pandas",
    overfit: "overfitting", underfit: "underfitting", embeddings: "embedding", vectors: "vector",
  };
  function lev1(a, b) { // true when edit distance <= 1
    if (Math.abs(a.length - b.length) > 1) return false;
    let i = 0, j = 0, e = 0;
    while (i < a.length && j < b.length) { if (a[i] === b[j]) { i++; j++; continue; } if (++e > 1) return false; if (a.length > b.length) i++; else if (b.length > a.length) j++; else { i++; j++; } }
    return e + (a.length - i) + (b.length - j) <= 1;
  }
  const tok = (s) => String(s || "").toLowerCase().replace(/`/g, " ").replace(/[^a-z0-9_ऀ-ॿ.]+/g, " ").split(/\s+/).map((w) => w.replace(/^\.+|\.+$/g, "")).filter((w) => w.length > 1 && !STOP.has(w));
  let INDEX = null, INDEX_KEY = "";
  function buildIndex() {
    const key = S.lang + "|" + BOOKS.length + "|" + IMPORTED.map((p) => p.key).join(",") + "|" + Object.keys(PACKS).map((r) => r + (PACKS[r][S.lang] ? 1 : 0)).join(",");
    if (INDEX && INDEX_KEY === key) return INDEX;
    INDEX = []; INDEX_KEY = key;
    const add = (role, n, where, tab, li, text, html, boost) => INDEX.push({ role, n, where, tab, li, html, toks: tok(text), head: tok(where), boost: boost || 1 });
    const packs = [];
    for (const r in PACKS) { const p = PACKS[r][S.lang] || PACKS[r].hinglish; if (p) packs.push([r, p]); }
    BOOKS.concat(IMPORTED).forEach((p) => packs.push([p.key, p]));
    packs.forEach(([rid, pk]) => pk.stages.forEach((st) => {
      st.lessons.forEach((l, li) => {
        // group blocks into small chunks: a paragraph-ish block plus following code
        let buf = [];
        const flush = () => { if (!buf.length) return; const txt = buf.map((b) => (b[0] === "code" ? b[2] : b[0] === "list" ? b[1].join(" ") : b[0] === "sketch" ? "" : b[1])).join(" "); add(rid, st.n, `${T("stage")} ${st.n} · ${l.title}`, "learn", li, txt, blocksHtml(buf), 1); buf = []; };
        l.blocks.forEach((b) => { if (b[0] === "sketch") return; if ((b[0] === "p" || b[0] === "tip" || b[0] === "warn") && buf.length && buf[buf.length - 1][0] !== "p") flush(); buf.push(b); if (buf.length >= 3) flush(); });
        flush();
      });
      st.iq.forEach((q) => add(rid, st.n, `${T("stage")} ${st.n} · IQ`, "iq", null, q.q + " " + q.q + " " + q.a, `<p><b>${md(q.q)}</b></p><p>${md(q.a)}</p>`, 1.3));
      st.quiz.forEach((q) => add(rid, st.n, `${T("stage")} ${st.n} · ${T("test")}`, "learn", null, q.q + " " + q.o[q.a] + " " + q.why, `<p><b>${md(q.q)}</b></p><p>✅ ${md(q.o[q.a])}</p><p class="mut">${md(q.why)}</p>`, 0.8));
    }));
    // document frequency for idf
    const df = {};
    INDEX.forEach((d) => new Set(d.toks).forEach((t) => { df[t] = (df[t] || 0) + 1; }));
    INDEX.df = df;
    return INDEX;
  }
  function search(q) {
    const idx = buildIndex(), N = idx.length || 1;
    const qt = Array.from(new Set(tok(q).flatMap((w) => (SYN[w] ? tok(SYN[w]) : [w]))));
    if (!qt.length) return [];
    const scored = idx.map((d) => {
      let s = 0, hit = 0;
      for (const t of qt) {
        const idf = Math.log(1 + N / (1 + (idx.df[t] || 0)));
        let c = 0; for (const w of d.toks) if (w === t || (t.length > 3 && w.startsWith(t)) || (t.length >= 5 && w.length >= 5 && w[0] === t[0] && lev1(w, t))) c++;
        if (c) { hit++; s += idf * (1 + Math.log(c)); }
        if (d.head.includes(t)) s += idf * 1.5;
      }
      if (hit === qt.length && qt.length > 1) s *= 1.6;
      return { d, s: (s * d.boost) / Math.sqrt(8 + d.toks.length / 6), hit };
    }).filter((x) => x.hit >= Math.max(1, Math.ceil(qt.length * 0.5))).sort((a, b) => b.s - a.s);
    const out = [], seen = new Set();
    for (const x of scored) { const k = x.d.html.slice(0, 80); if (seen.has(k)) continue; seen.add(k); out.push(x.d); if (out.length >= 6) break; }
    return out;
  }

  /* ---------------- pack import ---------------- */
  function validPack(p) {
    if (!p || typeof p !== "object" || !Array.isArray(p.stages) || !p.stages.length) return "no stages";
    for (const s of p.stages) {
      if (typeof s.n !== "number" || !s.title || !Array.isArray(s.lessons) || !Array.isArray(s.quiz)) return "stage fields";
      s.goal = s.goal || ""; s.teach = s.teach || []; s.practice = s.practice || []; s.iq = s.iq || [];
      for (const l of s.lessons) if (!Array.isArray(l.blocks)) return "lesson blocks";
      for (const q of s.quiz) if (!Array.isArray(q.o) || typeof q.a !== "number") return "quiz";
    }
    return "";
  }

  /* ---------------- actions (global CG) ---------------- */
  function noteCtx() {
    if ((UI.scr === "stage" || (UI.stack.length && UI.stack[UI.stack.length - 1].scr === "stage")) && UI.a && UI.a.role) {
      const pk = getPack(UI.a.role), st = pk && pk.stages.find((x) => x.n === UI.a.n);
      const r = roleInfo(UI.a.role);
      return { ctx: `${r ? L3(r.name) : ""} · ${T("stage")} ${UI.a.n}${st ? ": " + st.title : ""}${UI.a.li != null && st && st.lessons[UI.a.li] ? " · " + st.lessons[UI.a.li].title : ""}`, role: UI.a.role, n: UI.a.n, li: UI.a.li };
    }
    return { ctx: T("general") };
  }
  function addNote(text, extra) {
    const c = noteCtx(), a = notesGet();
    a.unshift(Object.assign({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), text, d: new Date().toLocaleString("en-IN"), pin: false }, c, extra || {}));
    const ok = notesSet(a); if (ok) { badge("note_taker"); toast(T("noteSaved")); } return ok;
  }
  const CG = {
    go, back, home: goHome, edKeys,
    menu() { UI.modal = { menu: 1 }; UI.keep = 1; render(); },
    noteNew(general) { const c = general ? { ctx: T("general") } : noteCtx(); UI.modal = { note: { ctx: c.ctx, text: "", general: !!general } }; UI.keep = 1; render(); },
    noteEdit(id) { const n = notesGet().find((x) => x.id === id); if (!n) return; UI.modal = { note: { id, ctx: n.ctx, text: n.text } }; UI.keep = 1; render(); },
    noteSave() {
      const t = (($("nt") || {}).value || "").trim(); if (!t) { toast("…"); return; }
      const m = UI.modal.note;
      if (m.id) { const a = notesGet(), n = a.find((x) => x.id === m.id); if (n) { n.text = t; n.d = new Date().toLocaleString("en-IN"); } notesSet(a); toast(T("noteSaved")); }
      else addNote(t, m.general ? { ctx: T("general"), role: null, n: null, li: null } : null);
      UI.modal = null; UI.keep = 1; render();
    },
    noteLesson(i) { const st = stageObj(), l = st.lessons[i]; const txt = l.blocks.filter((b) => b[0] !== "sketch").map((b) => (b[0] === "code" ? "`" + b[2].split("\n")[0] + "`" : b[0] === "list" ? b[1].map((x) => "• " + x).join("\n") : b[1])).slice(0, 12).join("\n"); addNote("**" + l.title + "**\n" + txt); },
    noteIQ(i) { const st = stageObj(), q = st.iq[i]; addNote("**" + q.q + "**\n" + q.a); },
    noteCode(id) { const c = UI.codes[id]; if (c) addNote(c.src, { code: true }); },
    noteAsk(i) { const it = UI.ask.res.items[i]; if (!it) return; const tmp = document.createElement("div"); tmp.innerHTML = it.html; addNote("**" + it.where + "**\n" + tmp.innerText.trim().slice(0, 1500), { role: it.role, n: it.n, li: it.li }); },
    noteSearch(v) { UI.nq = v; const el = $("nl"); UI.keep = 1; if (el) { const keep = $("nq"); render(); const k = $("nq"); if (k) { k.focus(); k.setSelectionRange(v.length, v.length); } } },
    notePin(id) { const a = notesGet(), n = a.find((x) => x.id === id); if (n) n.pin = !n.pin; notesSet(a); UI.keep = 1; render(); },
    noteDel(id) { ask(T("confirmDelete"), T("delete"), () => { notesSet(notesGet().filter((n) => n.id !== id)); }); },
    async noteOpen(id) { const n = notesGet().find((x) => x.id === id); if (!n || !n.role) return; if (BUNDLED[n.role]) await loadPack(n.role, S.lang); if (!getPack(n.role)) return; UI.qz = null; UI.tm = null; UI.game = null; go("stage", { role: n.role, n: n.n, tab: "learn", li: n.li == null ? null : n.li, pi: 0 }); },
    notesText() { return notesGet().map((n) => `[${n.d}] ${n.ctx}\n${n.text}`).join("\n\n----------\n\n"); },
    notesExport() { const t = CG.notesText(); if (!t) { toast(T("noNotes")); return; } saveFile("codeguru-notes-" + today() + ".txt", t, "text/plain"); },
    notesCopy() { const t = CG.notesText(); if (!t) { toast(T("noNotes")); return; } copyText(t); },
    stageDownload() { const st = stageObj(); if (!st) return; const r = roleInfo(UI.a.role); UI.modal = null; UI.keep = 1; render(); saveFile(`stage-${st.n}-${fileName(st.title)}.html`, stageDoc(st, r ? L3(r.name) : ""), "text/html"); },
    stagePdf() { const st = stageObj(); if (!st) return; const r = roleInfo(UI.a.role); UI.modal = null; UI.keep = 1; render(); printHtml(stageDoc(st, r ? L3(r.name) : ""), `${APP.name} - ${T("stage")} ${st.n} ${st.title}`); },
    exportPack(k) { const p = IMPORTED.find((x) => x.key === k); if (!p) return; saveFile(fileName(p.role.name) + ".json", JSON.stringify({ format: "codeguru-pack", version: 1, id: p.key, lang: p.lang, role: p.role, stages: p.stages }), "application/json"); },
    gameStart(kind) { const st = stageObj(); UI.game = Object.assign(buildGame(kind, st), { key: st.id + S.lang }); UI.keep = 1; render(); },
    gameExit() { UI.game = null; clearInterval(UI.gt); UI.keep = 1; render(); },
    gameAns(k) { const g = UI.game; if (!g || g.ans != null) return; g.ans = k; const q = g.qs[g.i]; if (k === q.a) g.score++; else g.lives--; if (g.kind === "speed") { setTimeout(() => { if (UI.game === g) CG.gameNext(); }, k === q.a ? 350 : 900); } UI.keep = 1; render(); },
    gameNext() { const g = UI.game; if (!g) return; g.i++; g.ans = null; UI.keep = 1; render(); },
    matchL(i) { const g = UI.game; g.pickL = i; UI.keep = 1; render(); },
    matchR(i) { const g = UI.game; if (g.pickL == null) { toast(T("pickPair")); return; } if (g.pickL === i) { g.done[i] = 1; g.score++; g.pickL = null; if (Object.keys(g.done).length === g.pairs.length) g.over = 1; } else { g.wrong++; g.pickL = null; toast("❌"); } UI.keep = 1; render(); },
    async importPdf(inp) {
      const f = inp.files && inp.files[0]; inp.value = ""; if (!f) return;
      if (!window.CG_PDF || !window.CG_FORMATS) { toast("Reader missing"); return; }
      UI.modal = { busy: T("pdfWorking"), pct: 0, sub: f.name }; UI.keep = 1; render();
      try {
        const pack = await window.CG_FORMATS.readAny(f, { lang: S.lang, verify: canPy() ? (code) => runPython(code, "") : null, onProgress: (pct, sub) => { if (UI.modal && UI.modal.busy) { UI.modal.pct = pct; UI.modal.sub = f.name + "  " + (sub || ""); const bar = document.querySelector(".sheet .bar i"), t = $("busytxt"); if (bar) bar.style.width = (pct * 100).toFixed(0) + "%"; if (t) t.textContent = UI.modal.sub; } } });
        if (pack._pack) { const bad = validPack(pack); if (bad) throw new Error(T("importBad") + " (" + bad + ")"); }
        const rec = { key: "book_" + String(pack.id || f.name).toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 60), role: pack.role || { name: f.name, icon: "📘" }, lang: pack.lang || S.lang, stages: pack.stages.sort((a, b) => a.n - b.n), auto: !pack._pack };
        await DB.put(rec);
        IMPORTED = IMPORTED.filter((x) => x.key !== rec.key).concat([rec]); INDEX = null;
        UI.modal = null; badge("pdf_course"); badge("bookworm"); celebrate("📕"); toast(T("pdfDone")); render();
      } catch (e) { UI.modal = null; UI.keep = 1; render(); toast("❌ " + (e && e.message ? e.message : e)); }
    },
    closeModal() { UI.modal = null; UI.keep = 1; render(); },
    okModal() { const f = UI.cb; UI.cb = null; UI.modal = null; UI.keep = 1; if (f) f(); render(); },
    copy: copyText,
    copyCode(id) { const c = UI.codes[id]; if (c) copyText(c.src); },
    tryCode(id) { const c = UI.codes[id]; if (!c) return; UI.pg = { lang: c.lang === "python" ? "python" : "js", code: c.src, stdin: "" }; go("playground"); },
    async openRole(id) {
      S.cur = id; save();
      if (BUNDLED[id]) await loadPack(id, S.lang);
      go("path", id);
    },
    async openStage(role, n) {
      if (BUNDLED[role] && !getPack(role)) await loadPack(role, S.lang);
      const pk = getPack(role);
      if (!pk) { const r = roleInfo(role), s = r && r.stages && r.stages[n - 1]; if (s) { UI.modal = { sheet: `<h3>${T("stage")} ${n}: ${esc(s.t)}</h3><p>${esc(L3(s.d))}</p><p class="mut">🛠️ ${T("comingSoon")}</p><button class="full" onclick="CG.closeModal()">OK</button>` }; UI.keep = 1; render(); } return; }
      if (!unlocked(role, n)) { UI.modal = { sheet: `<h3>🔒 ${T("locked")}</h3><p>${T("lockedMsg")}</p><button class="pri full" onclick="CG.closeModal();CG.openStage('${role}',${n - 1})">${T("stage")} ${n - 1} →</button>` }; UI.keep = 1; render(); return; }
      UI.qz = null; UI.tm = null; UI.game = null;
      go("stage", { role, n, tab: "learn", li: null, pi: 0 });
    },
    tab(t) { stopSpeech(); UI.a = Object.assign({}, UI.a, { tab: t, li: null }); UI.game = null; render(); },
    lesson(i) { UI.stack.push({ scr: "stage", a: Object.assign({}, UI.a) }); UI.a = Object.assign({}, UI.a, { li: i }); render(); },
    lessonDone(i) {
      const st = stageObj(), p = P(UI.a.role, UI.a.n);
      if (!p.L.includes(i)) { p.L.push(i); badge("first_lesson"); addXP(10); }
      save();
      if (i < st.lessons.length - 1) { UI.a = Object.assign({}, UI.a, { li: i + 1 }); render(); }
      else { toast(T("lessonDone")); UI.stack.pop(); UI.a = Object.assign({}, UI.a, { li: null, tab: "teach" }); render(); }
    },
    teach(i, play) {
      const st = stageObj(), tm = UI.tm;
      stopSpeech();
      if (i >= st.teach.length) {
        const p = P(UI.a.role, UI.a.n);
        if (!p.T) { p.T = 1; badge("first_class"); addXP(20); save(); }
        toast(T("classDone")); tm.i = -1; tm.playing = false; UI.a = Object.assign({}, UI.a, { tab: "practice" }); render(); return;
      }
      tm.i = Math.max(0, i); tm.seen[tm.i] = 1; if (play !== undefined) tm.playing = play;
      UI.keep = 1; render();
      if (tm.playing) CG.teachSpeak();
    },
    teachSpeak() {
      const st = stageObj(), tm = UI.tm, s = st.teach[tm.i];
      const next = () => { if (UI.tm === tm && tm.playing && UI.scr === "stage") tm.timer = setTimeout(() => CG.teach(tm.i + 1), 900); };
      const row = $("teachrow");
      if (!speak(s.say + (s.code && S.lang !== "hindi" ? "" : ""), () => { if (row) row.classList.remove("talking"); next(); })) {
        // no voice: give reading time
        tm.timer = setTimeout(() => { if (UI.tm === tm && tm.playing) CG.teach(tm.i + 1); }, 2500 + speechText(s.say).split(" ").length * 380);
      }
    },
    teachToggle() { const tm = UI.tm; tm.playing = !tm.playing; if (!tm.playing) { stopSpeech(); UI.keep = 1; render(); } else { UI.keep = 1; render(); CG.teachSpeak(); } },
    prac(i) { UI.a = Object.assign({}, UI.a, { pi: i }); render(); },
    draft(k, v) { UI.drafts[k] = v; },
    async pracRun(i, check) {
      const st = stageObj(), q = st.practice[i], code = $("ed").value;
      const r = await runCode("python", code, "", $("out"));
      if (!check) return;
      const ok = r.ok && norm(r.out) === norm(q.expect);
      const p = P(UI.a.role, UI.a.n);
      const res = $("res");
      if (res) res.innerHTML = ok ? `<div class="res ok">${T("correct")}</div>` : `<div class="res bad">${T("wrong")}</div>`;
      if (ok && !p.P[i]) { p.P[i] = 1; badge("first_practice"); addXP(25); save(); celebrate("✅"); }
    },
    pracHint(i) { const st = stageObj(); const e = $("extra"); if (e) e.innerHTML = `<div class="card">💡 ${md(st.practice[i].hint)}</div>`; },
    pracSol(i) { const st = stageObj(); const e = $("extra"); if (e) e.innerHTML = codeBlock("python", st.practice[i].solution, st.practice[i].expect); },
    pracReset(i) { const st = stageObj(); delete UI.drafts[st.id + ":" + i]; UI.keep = 1; render(); },
    quizStart() {
      const st = stageObj();
      const qs = st.quiz.map((q, i) => Object.assign({}, q, { idx: i, order: shuffle([0, 1, 2, 3].slice(0, q.o.length)) }));
      UI.qz = { key: st.id + S.lang, qs: shuffle(qs), i: 0, right: 0, sel: null, ans: null };
      render();
    },
    quizSel(k) { if (UI.qz.ans != null) return; UI.qz.sel = k; UI.keep = 1; render(); },
    quizAns() {
      const qz = UI.qz; if (qz.sel == null) return;
      qz.ans = qz.sel; const q = qz.qs[qz.i];
      q.ok = q.order[qz.ans] === q.a;
      if (q.ok) qz.right++;
      UI.keep = 1; render();
    },
    quizNext() {
      const qz = UI.qz; qz.i++; qz.sel = null; qz.ans = null;
      if (qz.i >= qz.qs.length) {
        const pct = Math.round((qz.right / qz.qs.length) * 100), p = P(UI.a.role, UI.a.n), was = p.Q != null && p.Q >= 80;
        // every test question goes to revision: wrong ones today, right ones later
        const o = srsGet();
        qz.qs.forEach((q) => { const id = cardId(UI.a.role, UI.a.n, "q", q.idx); if (!o[id]) addCards([id], q.ok ? 2 : 1, q.ok ? addDays(1) : today()); else if (!q.ok) markCard(id, false); });
        p.Q = Math.max(p.Q == null ? 0 : p.Q, pct); save();
        if (pct >= 80) {
          celebrate("🏆");
          if (!was) { addXP(100); badge("first_stage"); const pk = getPack(UI.a.role); if (UI.a.n < pk.stages.length) setTimeout(() => toast(T("unlocked").replace("{n}", UI.a.n + 1)), 1200); }
          if (pct === 100) badge("perfect");
          const c = stageCountCleared(); if (c >= 5) badge("five_stages");
          const pk = getPack(UI.a.role); if (pk.stages.every((s) => cleared(UI.a.role, s.n))) badge("all_stages");
        }
      }
      render();
    },
    iq(i) {
      const st = stageObj(), k = st.id + ":" + i, p = P(UI.a.role, UI.a.n);
      UI.iqOpen[k] = !UI.iqOpen[k];
      if (UI.iqOpen[k] && !p.I.includes(i)) { p.I.push(i); addCards([cardId(UI.a.role, UI.a.n, "iq", i)], 1, addDays(1)); save(); if (p.I.length === st.iq.length) { addXP(20); badge("iq_ready"); } }
      UI.keep = 1; render();
    },
    say(i) { const st = stageObj(); const q = st.iq[i]; speak(q.q + ". " + q.a); },
    pgLang(l) { UI.pg.lang = l; UI.keep = 1; render(); },
    pgSet(k, v) { UI.pg[k] = v; },
    pgRun() { UI.pg.code = $("ed").value; runCode(UI.pg.lang, UI.pg.code, UI.pg.stdin, $("out")); },
    async askGo() {
      const q = ($("askq") || {}).value || ""; UI.ask.q = q;
      if (!q.trim()) return;
      await Promise.all(Object.keys(BUNDLED).map((r) => loadPack(r, S.lang)));
      S.asks++; if (S.asks >= 5) badge("asker"); save();
      const errM = /\b([A-Z][a-zA-Z]*Error)\b/.exec(q);
      const code = /(\bprint\s*\(|\bdef\s|\bimport\s|\bfor\s.+\bin\b|=\s*\[|console\.log)/.test(q) && q.split("\n").length > 1;
      let items = search(q);
      if (errM && !window.CG_ERRORS[errM[1]]) items = items.length ? items : search(errM[1]);
      UI.ask.res = { items, err: errM && window.CG_ERRORS[errM[1]] ? errM[1] : null, code };
      UI.keep = 1; render();
    },
    askRun() { UI.pg = { lang: /console\.log|const |let /.test(UI.ask.q) ? "js" : "python", code: UI.ask.q, stdin: "" }; go("playground"); },
    async askOpen(i) {
      const it = UI.ask.res.items[i]; if (!it) return;
      if (BUNDLED[it.role]) await loadPack(it.role, S.lang);
      if (!unlocked(it.role, it.n) && getPack(it.role)) { /* allow reading even if locked: open learn of that stage */ }
      UI.qz = null; UI.tm = null;
      go("stage", { role: it.role, n: it.n, tab: it.tab, li: it.li, pi: 0 });
    },
    copyPrompt() { copyText(window.CG_PACK_PROMPT); },
    importFile(inp) {
      const f = inp.files && inp.files[0]; if (!f) return;
      const rd = new FileReader();
      rd.onload = async () => {
        let p; try { p = JSON.parse(rd.result); } catch (e) { toast(T("importBad")); return; }
        const bad = validPack(p); if (bad) { toast(T("importBad") + " (" + bad + ")"); return; }
        const role = p.role || {};
        const rec = { key: "book_" + String(p.id || role.name || Date.now()).toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40), role: { name: role.name || p.id || "My book", icon: role.icon || "📘", desc: role.desc || "" }, lang: p.lang || S.lang, stages: p.stages.sort((a, b) => a.n - b.n) };
        try { await DB.put(rec); } catch (e) { toast("Storage error"); return; }
        IMPORTED = IMPORTED.filter((x) => x.key !== rec.key).concat([rec]); INDEX = null;
        badge("bookworm"); toast(T("imported")); UI.keep = 1; render();
      };
      rd.readAsText(f);
      inp.value = "";
    },
    delPack(k) { ask(T("confirmDelete"), T("delete"), async () => { await DB.del(k); IMPORTED = IMPORTED.filter((x) => x.key !== k); INDEX = null; delete S.prog[k]; if (S.cur === k) S.cur = null; save(); render(); }); },
    async setOpt(k, v) {
      S[k] = v; save(); applySet();
      if (k === "lang") { UI.qz = null; UI.tm = null; UI.game = null; INDEX = null; await loadPack("aiml", S.lang); }
      if (k === "tts" && !v) stopSpeech();
      UI.keep = 1; render();
    },
    backup() {
      const data = JSON.stringify({ format: "codeguru-backup", version: 1, date: today(), state: S, notes: notesGet(), srs: srsGet() }, null, 1);
      saveFile("codeguru-backup-" + today() + ".json", data, "application/json");
    },
    restore(inp) {
      const f = inp.files && inp.files[0]; if (!f) return;
      const rd = new FileReader();
      rd.onload = () => { try { const d = JSON.parse(rd.result); if (d.format !== "codeguru-backup" || !d.state) throw 0; S = Object.assign(def(), d.state); if (Array.isArray(d.notes)) notesSet(d.notes); if (d.srs && typeof d.srs === "object") srsSet(d.srs); save(); applySet(); toast(T("restored")); render(); } catch (e) { toast(T("importBad")); } };
      rd.readAsText(f); inp.value = "";
    },
    resetAll() { ask(T("resetConfirm"), T("resetAll"), () => { const keep = { lang: S.lang, theme: S.theme, font: S.font, tts: S.tts, rate: S.rate }; S = Object.assign(def(), keep); srsSet({}); UI.rv = null; UI.ex = null; save(); toast(T("resetDone")); }); },
  };
  Object.assign(CG, {
    async openAt(role, n, tab) {
      if (BUNDLED[role]) await loadPack(role, S.lang);
      if (!getPack(role)) return;
      UI.qz = null; UI.tm = null; UI.game = null;
      go("stage", { role, n, tab: tab || "learn", li: null, pi: 0 });
    },
    /* summary */
    addGloss() { const st = stageObj(); if (!st) return; const c = addCards(summaryOf(st).gloss.map((g) => cardId(UI.a.role, st.n, "g", g.t))); toast(T("added").replace("{n}", c)); },
    copySummary() { const st = stageObj(); if (st) copyText(summaryText(st)); },
    noteSummary() { const st = stageObj(); if (st) addNote(summaryText(st)); },
    flashStage() { const st = stageObj(); if (!st) return; const ids = stageCardIds(UI.a.role, st); addCards(ids); UI.rv = { ids: shuffle(ids), i: 0, ok: 0, bad: 0, flip: false, again: {} }; go("revise"); },
    /* revision */
    async reviseStart(scope) {
      let ids = scope === "due" ? dueIds() : Object.keys(srsGet()).filter((k) => k.split("|")[0] === scope);
      await ensurePacks(ids);
      ids = ids.filter((id) => cardOf(id));
      if (scope !== "due") ids = shuffle(ids);
      if (!ids.length) { toast(T("noDue")); return; }
      UI.rv = { ids: ids.slice(0, 60), i: 0, ok: 0, bad: 0, flip: false, again: {} }; UI.keep = 1; render();
    },
    reviseFlip() { UI.rv.flip = true; UI.keep = 1; render(); },
    reviseMark(ok) {
      const rv = UI.rv, id = rv.ids[rv.i];
      markCard(id, ok);
      if (ok) rv.ok++; else { rv.bad++; if (!rv.again[id]) { rv.again[id] = 1; rv.ids.push(id); } }
      S.revs = (S.revs || 0) + 1; if (S.revs >= 50) badge("reviser"); save();
      rv.i++; rv.flip = false;
      if (rv.i >= rv.ids.length && rv.ok) addXP(Math.min(50, rv.ok * 2));
      UI.keep = 1; render();
    },
    reviseSay() { const c = cardOf(UI.rv.ids[UI.rv.i]); if (c) speak(c.front + ". " + c.back); },
    reviseExit() { stopSpeech(); UI.rv = null; render(); },
    /* exam */
    exSet(k, v) { UI.ex.setup[k] = v; UI.keep = 1; render(); },
    async examStart() {
      const su = UI.ex.setup;
      if (BUNDLED[su.role]) await loadPack(su.role, S.lang);
      const pk = getPack(su.role); if (!pk) return;
      let stages = pk.stages.filter((s) => su.scope === "all" || studied(su.role, s.n));
      if (!stages.length) stages = pk.stages.filter((s) => unlocked(su.role, s.n));
      const name = roleInfo(su.role) ? L3(roleInfo(su.role).name) : "";
      // take questions round-robin across stages so every topic is covered
      const pools = shuffle(stages).map((s) => shuffle((su.kind === "iq" ? s.iq : s.quiz).map((q, i) => ({ s, q, i }))));
      const pick = [];
      while (pick.length < su.count && pools.some((p) => p.length)) pools.forEach((p) => { if (p.length && pick.length < su.count) pick.push(p.shift()); });
      if (!pick.length) { toast(T("noQs")); return; }
      const qs = pick.map(({ s, q, i }) => Object.assign({}, q, { idx: i, n: s.n, title: s.title, where: name + " · " + T("stage") + " " + s.n + ": " + s.title, order: su.kind === "iq" ? null : shuffle([0, 1, 2, 3].slice(0, q.o.length)), sel: null, ok: null, show: false }));
      const secs = qs.length * (su.kind === "iq" ? 90 : 60);
      UI.ex.rep = null;
      UI.ex.run = { role: su.role, kind: su.kind, qs, i: 0, start: Date.now(), end: Date.now() + secs * 1000 };
      UI.keep = 0; if (UI.scr !== "exam") go("exam"); else render();
    },
    exSel(k) { UI.ex.run.qs[UI.ex.run.i].sel = k; UI.keep = 1; render(); },
    exShow() { UI.ex.run.qs[UI.ex.run.i].show = true; UI.keep = 1; render(); },
    exIQ(ok) { const r = UI.ex.run; r.qs[r.i].ok = ok; CG.exNext(false); },
    exNext(skip) {
      const r = UI.ex.run; const q = r.qs[r.i];
      if (skip) q.sel = null;
      if (r.kind === "mcq") q.ok = q.sel != null && q.order[q.sel] === q.a;
      r.i++;
      if (r.i >= r.qs.length) CG.examEnd(false); else { UI.keep = 0; render(); }
    },
    examEnd(ask_, timeUp) {
      if (ask_) { ask(T("endConfirm"), T("endExam"), () => CG.examEnd(false)); return; }
      const r = UI.ex.run; if (!r) return;
      clearInterval(UI.gt);
      const by = {}, wrong = [];
      r.qs.forEach((q, k) => {
        const key = q.n; by[key] = by[key] || { role: r.role, n: q.n, title: T("stage") + " " + q.n + ": " + q.title, right: 0, total: 0 };
        by[key].total++; if (q.ok) by[key].right++;
        if (!q.ok) wrong.push(r.kind === "iq" ? { where: q.where, q: q.q, right: q.a, your: null, id: cardId(r.role, q.n, "iq", q.idx) } : { where: q.where, q: q.q, code: q.code, your: q.sel != null ? q.o[q.order[q.sel]] : null, right: q.o[q.a] + (q.why ? "\n" + q.why : ""), id: cardId(r.role, q.n, "q", q.idx) });
      });
      const right = r.qs.filter((q) => q.ok).length, pct = Math.round((right / r.qs.length) * 100);
      const secs = Math.min(Math.round((Date.now() - r.start) / 1000), Math.round((r.end - r.start) / 1000));
      wrong.forEach((w) => markCard(w.id, false));
      S.exams = (S.exams || []).concat([{ d: today(), role: r.role, kind: r.kind, n: r.qs.length, pct }]).slice(-30);
      if (pct >= 80 && r.qs.length >= 10) badge("exam80");
      save(); addXP(Math.min(120, right * 4));
      UI.ex.run = null; UI.ex.rep = { kind: r.kind, pct, right, total: r.qs.length, secs, by, wrong, timeUp: !!timeUp };
      UI.keep = 0; render();
    },
    examNew() { UI.ex.rep = null; UI.ex.run = null; render(); },
  });
  function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  window.CG = CG;
  window.CG_TEST = { BOOKS: () => BOOKS, get S() { return S; }, set S(v) { S = v; }, UI, PACKS, search, buildIndex, runCode, loadPack, getPack, render, norm, IMPORTED: () => IMPORTED, validPack, notesGet, stageDoc, buildGame, summaryOf, srsGet, dueIds, cardOf, allCourses };

  /* ---------------- boot ---------------- */
  async function boot() {
    applySet();
    IMPORTED = await DB.all();
    await loadPack("aiml", S.lang);
    try { history.replaceState({}, ""); history.pushState({}, ""); } catch (e) { /* ignore */ }
    window.addEventListener("popstate", () => { const r = back(); if (r !== "exit") { try { history.pushState({}, ""); } catch (e) { /* ignore */ } } });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && UI.modal) back(); });
    render();
    // warm up Python in the background after the first screen is shown
    if (canPy()) setTimeout(() => { try { const w = pyWorker(); if (w) w.postMessage({ warm: true }); } catch (e) { /* ignore */ } }, 1500);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
