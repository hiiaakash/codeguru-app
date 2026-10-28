/* Code Guru - turn any text PDF into a game-style course, fully offline.
   CG_PDF.build(arrayBuffer, {lang, name, onProgress, verify}) -> pack object (same schema as bundled packs).
   Steps: extract text with pdf.js -> find headings/chapters -> lessons with paragraphs, code, lists, tips
   -> teacher slides -> auto quiz (fill-the-blank, code output, chapter topics) -> IQ-style questions
   -> practice from code examples (verified by running them in offline Python when available). */
(function () {
  "use strict";
  let pdfjs = null;
  async function lib() {
    if (pdfjs) return pdfjs;
    pdfjs = await import("./vendor/pdfjs/pdf.min.mjs");
    pdfjs.GlobalWorkerOptions.workerSrc = new URL("vendor/pdfjs/pdf.worker.min.mjs", location.href).href;
    return pdfjs;
  }

  const TXT = {
    hinglish: {
      fill: "Khaali jagah bharo:", out: "Is code ka output kya hoga?", topic: "Inme se kaunsa topic \"{s}\" chapter mein padhaya gaya hai?",
      explain: "Samjhao: {h}", whatis: "{t} kya hai?", none: "Inme se koi nahi", why: "Book ke hisaab se:", prac: "Yeh code khud likho aur chalao. Output aisa aana chahiye:",
      hint: "Lesson ka code dhyan se dekho.", goal: "Is chapter mein: {l}", teachIntro: "Chalo \"{s}\" shuru karte hain. Isme hum seekhenge: {l}.", teachEnd: "Bas! Ab practice, game aur test karo.",
      noText: "Is PDF mein padhne layak text nahi mila (shayad scan/photo wali PDF hai). Text wali PDF chuno.",
    },
    hindi: {
      fill: "ख़ाली जगह भरें:", out: "इस code का output क्या होगा?", topic: "इनमें से कौन-सा topic \"{s}\" chapter में पढ़ाया गया है?",
      explain: "समझाइए: {h}", whatis: "{t} क्या है?", none: "इनमें से कोई नहीं", why: "Book के हिसाब से:", prac: "यह code ख़ुद लिखें और चलाएँ। Output ऐसा आना चाहिए:",
      hint: "Lesson का code ध्यान से देखें।", goal: "इस chapter में: {l}", teachIntro: "चलो \"{s}\" शुरू करते हैं। इसमें हम सीखेंगे: {l}।", teachEnd: "बस! अब practice, game और test करें।",
      noText: "इस PDF में पढ़ने लायक text नहीं मिला (शायद scan/photo वाली PDF है)। Text वाली PDF चुनें।",
    },
    english: {
      fill: "Fill in the blank:", out: "What will this code print?", topic: "Which of these topics is taught in \"{s}\"?",
      explain: "Explain: {h}", whatis: "What is {t}?", none: "None of these", why: "According to the book:", prac: "Write and run this code yourself. The output should be:",
      hint: "Look carefully at the lesson's code.", goal: "In this chapter: {l}", teachIntro: "Let's start \"{s}\". We will learn: {l}.", teachEnd: "Done! Now practise, play the game and take the test.",
      noText: "No readable text found in this PDF (it may be a scanned/photo PDF). Choose a text PDF.",
    },
  };

  const CODE_RE = /^(\s{2,}\S|\s*(def |class |import |from \S+ import|print\(|return\b|for .+ in .+:|while .+:|if .+:|elif .+:|else:|try:|except|with .+:|lambda |@\w|>>> |\$ |#!|SELECT |INSERT |UPDATE |DELETE |CREATE |FROM |WHERE |JOIN |GROUP BY|ORDER BY|const |let |var |function |console\.|pip |git |docker |npm |cd |ls |[A-Za-z_][\w.\[\]'"]*\s*(=|\+=|-=|\*=)\s*\S|[A-Za-z_][\w.]*\(.*\)\s*$|[}\])]\s*$))/;
  const BULLET_RE = /^\s*([•●▪◦‣\-–*✓✔➤►→]|\d+[.)])\s+/;
  const HEAD_RE = /^(.{0,40}?[—–\-:|]\s*)?(chapter|lesson|module|unit|अध्याय|पाठ)\s*[-:#]?\s*\d+\b/i;
  const NUM_HEAD_RE = /^\d+(\.\d+){0,2}\s+[A-Za-zऀ-ॿ]/;
  const TIP_RE = /^(tip|note|dhyan|ध्यान|important|yaad rakho|remember|pro tip)\b/i;
  const WARN_RE = /^(common galti|galti|mistake|warning|caution|आम गलती|गलती|avoid)\b/i;
  const OUT_RE = /^(output|outputs|result|आउटपुट)\s*:?\s*$/i;
  const STOP = new Set("the a an and or of to in on for is are was were be by with as at this that it its from we you your they them can will not but if then so than into also use used using such each one two three hai hain ka ki ke ko me mein se aur ya to bhi par jo yeh woh wo ek kya kaise hota hoti hote karna karte kare karo isme iska iski uske unka apne aisa aise jaise wala wali wale liye sath saath tak tab jab abhi bahut zyada kuch sab sabse pehle phir agar lekin kyunki matlab chahiye karta karti raha rahi rahe diya gaya gayi hoga hogi tera teri tere mera meri mere apna apni tum tujhe mujhe humein yahan wahan kahan dekh dekho samjho likho likh chala chalao baar kabhi koi naya nayi naye dono teen warna chhota side andar upar neeche only without what when where which while there their these those have has had been more most very just also into over under about after before other another same each every some many much first last next then here like make made does done get got give take takes see show shows example examples output answer answers lesson chapter part question questions practice book hindi english study".split(" "));

  function norm(s) { return String(s || "").replace(/\s+/g, " ").trim(); }
  function sentences(t) { return norm(t).split(/(?<=[.!?।])\s+/).filter((s) => s.length > 20); }
  function words(t) { return (norm(t).toLowerCase().match(/[a-z\u0900-\u097F][a-z0-9_\u0900-\u097F+#-]{2,}/g) || []).map((w) => w.replace(/[-#+]+$/, "")); }
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const pick = (a, n) => shuffle(a).slice(0, n);

  /* ---------- 1. extract lines with font info ---------- */
  async function extract(buf, onProgress) {
    const pj = await lib();
    const base = new URL("vendor/pdfjs/", location.href).href;
    const doc = await pj.getDocument({ data: new Uint8Array(buf), cMapUrl: base + "cmaps/", cMapPacked: true, standardFontDataUrl: base + "standard_fonts/", isEvalSupported: false }).promise;
    const pages = [];
    for (let p = 1; p <= doc.numPages; p++) {
      const page = await doc.getPage(p);
      const tc = await page.getTextContent();
      const rows = new Map();
      for (const it of tc.items) {
        if (!it.str || !it.str.trim() && !it.hasEOL) continue;
        const y = Math.round(it.transform[5] / 2) * 2, size = Math.round(Math.hypot(it.transform[2], it.transform[3]) * 10) / 10 || it.height || 10;
        const st = tc.styles[it.fontName] || {};
        const mono = /mono|courier|consol|code/i.test((st.fontFamily || "") + it.fontName);
        const bold = /bold|black|heavy|semibold/i.test(it.fontName);
        if (!rows.has(y)) rows.set(y, []);
        rows.get(y).push({ x: it.transform[4], s: it.str, size, mono, bold });
      }
      const lines = [...rows.entries()].sort((a, b) => b[0] - a[0]).map(([y, its]) => {
        its.sort((a, b) => a.x - b.x);
        let text = "", lastEnd = null;
        for (const t of its) { if (lastEnd !== null && t.x - lastEnd > t.size * 0.25 && !text.endsWith(" ")) text += " "; text += t.s; lastEnd = t.x + t.s.length * t.size * 0.5; }
        const size = Math.max(...its.map((t) => t.size));
        const monoShare = its.filter((t) => t.mono).reduce((a, t) => a + t.s.length, 0) / Math.max(1, its.reduce((a, t) => a + t.s.length, 0));
        return { y, x: its[0].x, text: text.replace(/\s+$/, ""), size, mono: monoShare > 0.6, bold: its.every((t) => t.bold || !t.s.trim()), page: p };
      }).filter((l) => l.text.trim());
      pages.push(lines);
      if (onProgress) onProgress(p / doc.numPages * 0.6, `${p}/${doc.numPages}`);
      page.cleanup();
    }
    return pages;
  }

  /* ---------- 2. clean headers/footers, find headings ---------- */
  function structure(pages, isPdf) {
    const n = pages.length;
    const key = (t) => t.replace(/\d+/g, "#").trim().toLowerCase();
    const edge = new Map();
    pages.forEach((ls) => { const set = new Set(); ls.slice(0, 2).concat(ls.slice(-2)).forEach((l) => set.add(key(l.text))); set.forEach((k) => edge.set(k, (edge.get(k) || 0) + 1)); });
    const repeated = new Set([...edge.entries()].filter(([k, c]) => n >= 4 && c >= Math.max(3, n * 0.35)).map(([k]) => k));
    const all = [];
    pages.forEach((ls) => ls.forEach((l, i) => {
      const t = l.text.trim();
      if (/^(page\s*)?\d{1,4}(\s*(\/|of)\s*\d+)?$/i.test(t)) return;
      if (isPdf && (i < 2 || i >= ls.length - 2) && repeated.has(key(t))) return;
      all.push(l);
    }));
    // body font size = most common size by characters
    const hist = {};
    all.forEach((l) => { if (!l.mono) { const k = Math.round(l.size); hist[k] = (hist[k] || 0) + l.text.length; } });
    if (!Object.keys(hist).length) all.forEach((l) => { const k = Math.round(l.size); hist[k] = (hist[k] || 0) + l.text.length; });
    const body = +Object.entries(hist).sort((a, b) => b[1] - a[1])[0][0] || 10;
    MONO_DOC = all.filter((l) => l.mono).length > all.length * 0.03;
    all.forEach((l) => {
      const t = l.text.trim(), short = t.length <= 90 && !/[.:,;]$/.test(t) || HEAD_RE.test(t);
      if (l.hint !== undefined) { l.lvl = l.hint; return; }
      let lvl = 0;
      if (HEAD_RE.test(t) && t.length < 120) lvl = 1;
      else if (l.size >= body * 1.45 && short && !l.mono) lvl = 1;
      else if (l.size >= body * 1.15 && short && !l.mono) lvl = 2;
      else if (l.bold && short && t.length < 70 && !l.mono && !BULLET_RE.test(t)) lvl = 3;
      else if (NUM_HEAD_RE.test(t) && t.length < 70 && !/[.;]$/.test(t)) lvl = 3;
      l.lvl = lvl;
    });
    // books that mark chapters as "Lesson N" / "Chapter N": use only those as chapters
    const marked = all.filter((l) => l.hint === undefined && HEAD_RE.test(l.text.trim()) && l.size >= body * 1.15 && l.text.length < 120);
    MARKED = marked.length >= 3;
    if (marked.length >= 3) {
      const set = new Set(marked);
      all.forEach((l, i) => {
        if (l.hint !== undefined) return;
        if (set.has(l)) l.lvl = 1;
        else if (l.lvl === 1) {
          // continuation of a two-line chapter title stays part of it
          const prev = all[i - 1];
          l.lvl = prev && set.has(prev) && Math.abs(prev.size - l.size) < 0.5 && l.text.length < 60 ? 1 : 2;
          if (l.lvl === 1) set.add(l);
        }
      });
    }
    return { lines: all, body };
  }

  /* ---------- 3. lines -> blocks ---------- */
  let MONO_DOC = false, MARKED = false;
  function toBlocks(lines, body) {
    const blocks = [];
    let para = [], code = [], list = [];
    const flushPara = () => { if (para.length) { const t = norm(para.join(" ")); if (t) { if (TIP_RE.test(t)) blocks.push(["tip", t]); else if (WARN_RE.test(t)) blocks.push(["warn", t]); else blocks.push(["p", t]); } para = []; } };
    const flushList = () => { if (list.length) { blocks.push(["list", list.map((x) => norm(x)).filter(Boolean)]); list = []; } };
    const flushCode = () => {
      if (!code.length) return;
      const minX = Math.min(...code.map((c) => c.x));
      const src = code.map((c) => " ".repeat(Math.max(0, Math.round((c.x - minX) / Math.max(4, body * 0.5)))) + c.text.trim()).join("\n");
      const lang = /^\s*(SELECT|INSERT|UPDATE|DELETE|CREATE)\b/im.test(src) ? "sql" : /(console\.log|const |let |function )/.test(src) ? "js" : /^\s*(\$ |git |docker |pip |npm |cd )/m.test(src) ? "bash" : "python";
      blocks.push(["code", lang, src, ""]);
      code = [];
    };
    let expectOut = false;
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i], t = l.text.trim();
      if (OUT_RE.test(t)) { flushPara(); flushList(); flushCode(); expectOut = true; continue; }
      const proseLike = (t.match(/[A-Za-z\u0900-\u097F]{2,}/g) || []).length >= 6 && !/[()\[\]{}"'`]/.test(t);
      const looksCode = l.mono || (!MONO_DOC && CODE_RE.test(l.text) && t.length < 120 && !/[.!?।]$/.test(t) && !BULLET_RE.test(t) && !proseLike) || /^\s*>>> /.test(t);
      if (expectOut) {
        if (looksCode || l.mono || t.length < 60) {
          const last = blocks[blocks.length - 1];
          if (last && last[0] === "code") { last[3] = (last[3] ? last[3] + "\n" : "") + t; continue; }
        }
        expectOut = false;
      }
      if (looksCode) { flushPara(); flushList(); code.push(l); continue; }
      flushCode();
      if (BULLET_RE.test(t)) { flushPara(); list.push(t.replace(BULLET_RE, "")); continue; }
      if (list.length && l.x > 0 && t[0] && t[0] === t[0].toLowerCase() && t.length < 120) { list[list.length - 1] += " " + t; continue; }
      flushList();
      para.push(t);
      if (l.pe || (/[.!?।:]$/.test(t) && para.join(" ").length > 350)) flushPara();
    }
    flushPara(); flushList(); flushCode();
    return blocks;
  }

  /* ---------- 4. chapters -> stages ---------- */
  function sections(lines) {
    const tops = lines.filter((l) => l.lvl === 1);
    let level = 1;
    if (tops.length < 3) level = lines.filter((l) => l.lvl && l.lvl <= 2).length >= 3 ? 2 : 3;
    const isTop = (l) => l.lvl && l.lvl <= level;
    let secs = [], cur = null;
    for (const l of lines) {
      if (isTop(l) && (!cur || cur.lines.length > 3)) { cur = { title: norm(l.text), lines: [] }; secs.push(cur); }
      else if (isTop(l) && cur) { cur.title = norm(cur.title + " " + l.text); }
      else { if (!cur) { cur = { title: "", lines: [] }; secs.push(cur); } cur.lines.push(l); }
    }
    // tiny sections are joined to the previous one (nothing from the book is dropped)
    secs = secs.reduce((acc, s) => { if (acc.length && s.lines.map((l) => l.text).join(" ").length <= 200) { const m = acc[acc.length - 1]; m.lines = m.lines.concat(s.title ? [{ text: s.title, lvl: 2, size: 0, x: 0 }] : [], s.lines); } else acc.push(s); return acc; }, []);
    // the book's contents/intro part is not a chapter: it becomes the first lesson of the next chapter (nothing is dropped)
    const intro = [];
    if (MARKED && secs.length > 1 && !HEAD_RE.test(secs[0].title) && /contents|roadmap|s t u d y|table of contents|विषय/i.test(secs[0].title + " " + secs[0].lines.slice(0, 40).map((l) => l.text).join(" "))) intro.push(secs.shift());
    while (secs.length > 1 && /\b(contents|index)\b|विषय सूची/i.test(secs[0].title + " " + secs[0].lines.slice(0, 8).map((l) => l.text).join(" ")) && secs[0].lines.filter((l) => /lesson|chapter|part|\d/i.test(l.text)).length > secs[0].lines.length * 0.4) intro.push(secs.shift());
    if (intro.length && secs.length) secs[0].lines = intro.flatMap((s) => [{ text: s.title || "Contents", lvl: 2, size: 0, x: 0 }].concat(s.lines)).concat([{ text: secs[0].title, lvl: 2, size: 0, x: 0 }], secs[0].lines);
    // if structure is poor, cut by size
    const totalLen = lines.reduce((a, l) => a + l.text.length, 0);
    if (secs.length < 3) {
      const parts = Math.max(3, Math.min(10, Math.round(totalLen / 6000)));
      const per = Math.ceil(lines.length / parts);
      secs = [];
      for (let i = 0; i < lines.length; i += per) secs.push({ title: "", lines: lines.slice(i, i + per) });
    }
    // merge very small, split huge, cap at 20 stages
    const merged = [];
    for (const s of secs) {
      const len = s.lines.reduce((a, l) => a + l.text.length, 0);
      if (merged.length && len < 1500) { const m = merged[merged.length - 1]; m.lines = m.lines.concat([{ text: s.title, lvl: 2, size: 0, x: 0 }], s.lines); }
      else merged.push(s);
    }
    while (merged.length > 20) {
      let bi = 0, best = Infinity;
      for (let i = 0; i < merged.length - 1; i++) { const len = merged[i].lines.length + merged[i + 1].lines.length; if (len < best) { best = len; bi = i; } }
      const a = merged[bi], b = merged[bi + 1];
      a.lines = a.lines.concat([{ text: b.title, lvl: 2, size: 0, x: 0 }], b.lines);
      merged.splice(bi + 1, 1);
    }
    return merged;
  }

  function lessonsOf(sec, body) {
    // split by sub-headings into lessons (max 6)
    const parts = [];
    let cur = { title: "", lines: [] };
    for (const l of sec.lines) {
      if (l.lvl && l.lvl >= 2 && cur.lines.length) { parts.push(cur); cur = { title: norm(l.text), lines: [] }; }
      else if (l.lvl && l.lvl >= 2) cur.title = norm((cur.title + " " + l.text).trim());
      else cur.lines.push(l);
    }
    if (cur.lines.length) parts.push(cur);
    else if (cur.title && parts.length) parts[parts.length - 1].lines.push({ text: cur.title, lvl: 0, size: body, x: 0, bold: true, pe: true });
    else if (cur.title) parts.push({ title: cur.title, lines: [{ text: cur.title, lvl: 0, size: body, x: 0, pe: true }] });
    let ps = parts.filter((p) => p.lines.length);
    while (ps.length > 6) {
      let bi = 0, best = Infinity;
      for (let i = 0; i < ps.length - 1; i++) { const len = ps[i].lines.length + ps[i + 1].lines.length; if (len < best) { best = len; bi = i; } }
      ps[bi].lines = ps[bi].lines.concat([{ text: ps[bi + 1].title, lvl: 0, size: body, x: 0, bold: true }], ps[bi + 1].lines);
      ps.splice(bi + 1, 1);
    }
    return ps.map((p, i) => {
      const blocks = toBlocks(p.lines, body);
      // keep a heading line that got demoted as bold paragraph
      const title = (p.title || (blocks.find((b) => b[0] === "p") || ["", sec.title || "Lesson " + (i + 1)])[1].split(/[.!?।]/)[0]).slice(0, 80);
      // a long heading is cut in the title, so keep its full text as the first line
      if (p.title && p.title.length > 80) blocks.unshift(["p", p.title]);
      return { title: title || "Lesson " + (i + 1), blocks: blocks.length ? blocks : [["p", "…"]] };
    });
  }

  /* ---------- 5. key terms ---------- */
  function goodSentence(s) { const letters = (s.match(/[A-Za-z\u0900-\u097F]/g) || []).length; return letters > s.length * 0.6 && (s.match(/\d/g) || []).length < 6 && s.split(" ").length >= 6 && s.split(" ").length <= 40; }
  function keyTerms(stagesText, boostSets) {
    const df = {}, tfs = stagesText.map((t) => { const tf = {}; words(t).forEach((w) => { if (!STOP.has(w) && !/^\d/.test(w)) tf[w] = (tf[w] || 0) + 1; }); Object.keys(tf).forEach((w) => { df[w] = (df[w] || 0) + 1; }); return tf; });
    const N = stagesText.length;
    return tfs.map((tf, i) => Object.entries(tf).filter(([w, c]) => c >= 2 && w.length >= 4).map(([w, c]) => [w, c * Math.log(1 + N / df[w]) * (boostSets && boostSets[i].has(w) ? 3 : 1)]).sort((a, b) => b[1] - a[1]).slice(0, 25).map(([w]) => w));
  }
  function textOf(st) { return st.lessons.map((l) => l.title + " " + l.blocks.map((b) => (b[0] === "list" ? b[1].join(". ") : b[0] === "code" || b[0] === "sketch" ? "" : b[1])).join(" ")).join(" "); }

  /* ---------- 6. questions ---------- */
  function makeQuiz(st, allStages, terms, allTerms, T) {
    const qs = [];
    const sents = shuffle(sentences(textOf(st)).filter((s) => s.length < 260 && goodSentence(s)));
    const used = new Set();
    // a) fill the blank with key terms
    for (const term of terms) {
      if (qs.length >= 6) break;
      const s = sents.find((x) => !used.has(x) && new RegExp("(^|[^\\w\\u0900-\\u097F])" + term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "([^\\w\\u0900-\\u097F]|$)", "i").test(x));
      if (!s) continue;
      const others = pick(allTerms.filter((w) => w !== term && !s.toLowerCase().includes(w)), 3);
      if (others.length < 3) continue;
      used.add(s);
      const blank = s.replace(new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"), "_____");
      const o = shuffle([term].concat(others));
      qs.push({ q: T.fill + " " + blank, o, a: o.indexOf(term), why: T.why + " " + s });
    }
    // b) code output questions
    const outs = [];
    allStages.forEach((s) => s.lessons.forEach((l) => l.blocks.forEach((b) => { if (b[0] === "code" && b[3] && b[3].length < 120) outs.push(b[3]); })));
    st.lessons.forEach((l) => l.blocks.forEach((b) => {
      if (qs.length >= 8 || b[0] !== "code" || !b[3] || b[2].length > 400) return;
      const others = pick([...new Set(outs.filter((o) => o !== b[3]))], 3);
      if (others.length < 3) return;
      const o = shuffle([b[3]].concat(others));
      qs.push({ q: T.out, code: b[2], o, a: o.indexOf(b[3]), why: T.why + " " + b[3] });
    }));
    // c) topic questions
    const otherTitles = allStages.filter((s) => s !== st).flatMap((s) => s.lessons.map((l) => l.title));
    for (const l of shuffle(st.lessons)) {
      if (qs.length >= 10) break;
      const others = pick(otherTitles.filter((t) => t !== l.title), 3);
      if (others.length < 3) break;
      const o = shuffle([l.title].concat(others));
      qs.push({ q: T.topic.replace("{s}", st.title), o, a: o.indexOf(l.title), why: T.why + " " + l.title });
    }
    // d) top up with more fill-the-blank from remaining sentences
    for (const s of sents) {
      if (qs.length >= 10) break;
      if (used.has(s)) continue;
      const ws = words(s).filter((w) => w.length >= 5 && !STOP.has(w) && allTerms.includes(w));
      if (!ws.length) continue;
      const term = ws[0], others = pick(allTerms.filter((w) => w !== term && !s.toLowerCase().includes(w)), 3);
      if (others.length < 3) continue;
      used.add(s);
      const o = shuffle([term].concat(others));
      qs.push({ q: T.fill + " " + s.replace(new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"), "_____"), o, a: o.indexOf(term), why: T.why + " " + s });
    }
    return qs.slice(0, 10);
  }
  function makeIQ(st, terms, T) {
    const iq = [];
    st.lessons.forEach((l) => {
      const ps = l.blocks.filter((b) => b[0] === "p" || b[0] === "tip").map((b) => b[1]).join(" ");
      const ss = sentences(ps).slice(0, 3);
      if (ss.length) iq.push({ q: T.explain.replace("{h}", l.title), a: ss.join(" ") });
    });
    const all = sentences(textOf(st));
    for (const t of terms) {
      if (iq.length >= 10) break;
      const d = all.find((s) => s.toLowerCase().includes(t) && /( is | are | means | matlab | hota hai | hai | है | refers)/i.test(s) && s.length < 300);
      if (d && !iq.some((x) => x.a === d)) iq.push({ q: T.whatis.replace("{t}", t), a: d });
    }
    return iq.slice(0, 12);
  }
  function makeTeach(st, T) {
    const titles = st.lessons.map((l) => l.title);
    const slides = [{ say: T.teachIntro.replace("{s}", st.title).replace("{l}", titles.slice(0, 4).join(", ")), sketch: titles.length >= 2 ? { k: "flow", steps: titles.slice(0, 5).map((t) => t.slice(0, 28)), dir: titles.length > 3 ? "v" : "h" } : null, code: null }];
    st.lessons.forEach((l) => {
      const p = l.blocks.find((b) => b[0] === "p"), lst = l.blocks.find((b) => b[0] === "list"), cd = l.blocks.find((b) => b[0] === "code");
      const ss = p ? sentences(p[1]).slice(0, 2).join(" ") || p[1].slice(0, 220) : l.title;
      slides.push({ say: (l.title + ". " + ss).slice(0, 320), sketch: lst && lst[1].length >= 2 ? { k: "stack", title: l.title.slice(0, 40), items: lst[1].slice(0, 5).map((x) => x.slice(0, 40)) } : null, code: cd ? cd[2].split("\n").slice(0, 8).join("\n") : null });
    });
    slides.push({ say: T.teachEnd, sketch: null, code: null });
    return slides.slice(0, 10);
  }
  async function makePractice(st, T, verify) {
    const out = [];
    for (const l of st.lessons) for (const b of l.blocks) {
      if (out.length >= 3) break;
      if (b[0] !== "code" || b[1] !== "python" || b[2].length > 600 || /input\(/.test(b[2])) continue;
      let expect = b[3];
      if (verify) {
        const r = await verify(b[2]);
        if (!r || !r.ok || !r.out.trim()) continue;
        expect = r.out.replace(/\n$/, "");
        b[3] = expect; // show the real output in the lesson too
      } else if (!expect) continue;
      const lines = b[2].split("\n");
      const k = lines.findIndex((x, i) => i === lines.length - 1 || /print\(/.test(x));
      const starter = lines.map((x, i) => (i === k ? "# TODO: " + x.trim().replace(/\(.*\)/, "(...)") : x)).join("\n");
      out.push({ q: T.prac + "\n" + expect, starter, expect, hint: T.hint, solution: b[2] });
    }
    return out;
  }

  /* ---------- main ---------- */
  async function build(buf, opt) {
    opt = opt || {};
    const T = TXT[opt.lang] || TXT.hinglish;
    const prog = opt.onProgress || (() => {});
    const pages = opt.pages || await extract(buf, prog);
    const { lines, body } = structure(pages, !opt.pages);
    const totalText = lines.reduce((a, l) => a + l.text.length, 0);
    if (totalText < 500) throw new Error(T.noText);
    // opt.chapters = [{title, from, to}] (page ranges) gives exact chapters, e.g. from a book's contents page
    const secs = opt.chapters ? opt.chapters.map((c) => ({ title: c.title, lines: lines.filter((l) => l.page >= c.from && l.page <= c.to) })).filter((c) => c.lines.length) : sections(lines);
    prog(0.65, "");
    const stages = secs.map((s, i) => {
      const lessons = lessonsOf(s, body);
      const title = opt.chapters ? s.title : (s.title || lessons[0].title || "Chapter " + (i + 1)).replace(/^(.{0,40}?[—–\-|]\s*)?(chapter|lesson|part|module|unit|अध्याय|पाठ)\s*\d+\s*[:.\-–—]?\s*/i, "").slice(0, 70) || "Chapter " + (i + 1);
      // a long chapter heading is cut in the title, so keep its full text at the start of the first lesson
      if (s.title && s.title.length > 70 && lessons[0]) lessons[0].blocks.unshift(["p", s.title]);
      return { n: i + 1, id: "book-" + (i + 1), title, goal: "", lessons, teach: [], practice: [], quiz: [], iq: [] };
    });
    const boost = stages.map((st) => { const b = new Set(); st.lessons.forEach((l) => { words(l.title).forEach((w) => b.add(w)); l.blocks.forEach((bl) => { if (bl[0] === "code") words(bl[2]).forEach((w) => b.add(w)); const m = (bl[1] || "").toString().match(/`([^`]+)`/g); if (m) m.forEach((x) => words(x).forEach((w) => b.add(w))); }); }); return b; });
    const terms = keyTerms(stages.map(textOf), boost);
    const allTerms = [...new Set(terms.flat())];
    for (let i = 0; i < stages.length; i++) {
      const st = stages[i];
      st.goal = T.goal.replace("{l}", st.lessons.map((l) => l.title).slice(0, 4).join(", "));
      st.teach = makeTeach(st, T);
      st.practice = await makePractice(st, T, opt.verify);
      st.quiz = makeQuiz(st, stages, terms[i], allTerms, T);
      st.iq = makeIQ(st, terms[i], T);
      prog(0.65 + 0.35 * (i + 1) / stages.length, `${i + 1}/${stages.length}`);
    }
    const name = opt.name || "My book";
    const kind = opt.kind || "PDF";
    return { format: "codeguru-pack", version: 1, id: "book-" + name.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 30) + "-" + Date.now().toString(36), lang: opt.lang || "hinglish", role: { name, icon: opt.icon || "📕", desc: `${kind} · ${opt.pages ? "" : pages.length + " pages · "}${stages.length} chapters` }, stages, auto: true };
  }
  window.CG_PDF = { build, _test: { structure, toBlocks, sections } };
})();
