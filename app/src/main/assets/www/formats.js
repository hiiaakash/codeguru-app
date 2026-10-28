/* Code Guru - read many file formats offline and turn them into a course.
   Supported: PDF, Word (.docx), PowerPoint (.pptx), EPUB, Jupyter notebook (.ipynb), Markdown, HTML,
   plain text, code files (.py .js .ts .sql .java .c .cpp .kt .go .rb .sh ...), OpenDocument text (.odt).
   Every format is converted to "lines" ({text, size, mono, bold, x, hint, pe}) and handed to the
   same course builder that is used for PDFs (pdfbook.js). */
(function () {
  "use strict";
  const BODY = 10;
  const L = (text, o) => Object.assign({ text: String(text || ""), size: BODY, mono: false, bold: false, x: 0, page: 1, y: 0 }, o || {});
  const H = (text, lvl) => L(text, { hint: lvl, bold: true, size: BODY * (lvl === 1 ? 1.8 : lvl === 2 ? 1.4 : 1.2) });
  const P = (text) => L(text, { hint: 0, pe: true });
  const C = (text) => L(text.replace(/^\s+/, ""), { hint: 0, mono: true, x: (text.match(/^\s*/)[0].replace(/\t/g, "    ").length) * 5 });
  const OUT = () => L("Output:", { hint: 0 });
  const B = (text) => L("• " + text, { hint: 0 });

  /* ---------- tiny zip reader (docx/pptx/epub/odt are zip files) ---------- */
  async function unzip(buf) {
    const u8 = new Uint8Array(buf), dv = new DataView(buf);
    let eocd = -1;
    for (let i = u8.length - 22; i >= Math.max(0, u8.length - 70000); i--) if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
    if (eocd < 0) throw new Error("Not a valid zip-based document");
    const count = dv.getUint16(eocd + 10, true);
    let off = dv.getUint32(eocd + 16, true);
    const files = {};
    for (let n = 0; n < count; n++) {
      if (dv.getUint32(off, true) !== 0x02014b50) break;
      const method = dv.getUint16(off + 10, true), csize = dv.getUint32(off + 20, true);
      const nlen = dv.getUint16(off + 28, true), elen = dv.getUint16(off + 30, true), clen = dv.getUint16(off + 32, true);
      const local = dv.getUint32(off + 42, true);
      const name = new TextDecoder().decode(u8.subarray(off + 46, off + 46 + nlen));
      files[name] = { method, csize, local };
      off += 46 + nlen + elen + clen;
    }
    return {
      names: Object.keys(files),
      async text(name) {
        const f = files[name];
        if (!f) return null;
        const ln = dv.getUint16(f.local + 26, true), le = dv.getUint16(f.local + 28, true);
        const data = u8.subarray(f.local + 30 + ln + le, f.local + 30 + ln + le + f.csize);
        let out;
        if (f.method === 0) out = data;
        else if (f.method === 8) out = new Uint8Array(await new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream("deflate-raw"))).arrayBuffer());
        else throw new Error("Unsupported zip compression");
        return new TextDecoder().decode(out);
      },
    };
  }
  const xml = (t) => new DOMParser().parseFromString(t, "application/xml");
  const byTag = (node, ns, tag) => Array.from(node.getElementsByTagNameNS(ns, tag));

  /* ---------- HTML (also used by EPUB) ---------- */
  function htmlLines(html) {
    const doc = new DOMParser().parseFromString(html, "text/html");
    const out = [];
    doc.querySelectorAll("script,style,nav,header,footer,noscript").forEach((e) => e.remove());
    const walk = (el) => {
      for (const n of el.childNodes) {
        if (n.nodeType !== 1) continue;
        const tag = n.tagName.toLowerCase(), txt = (n.textContent || "").replace(/\s+/g, " ").trim();
        if (/^h[1-6]$/.test(tag)) { if (txt) out.push(H(txt, Math.min(3, +tag[1]))); }
        else if (tag === "pre") { n.textContent.replace(/\n$/, "").split("\n").forEach((x) => out.push(C(x))); out.push(P("")); }
        else if (tag === "li") { if (txt) out.push(B(txt)); }
        else if (tag === "p" || tag === "blockquote" || tag === "dd" || tag === "dt" || tag === "figcaption") { if (txt) out.push(P(txt)); }
        else if (tag === "table") { n.querySelectorAll("tr").forEach((tr) => { const t = Array.from(tr.children).map((c) => c.textContent.replace(/\s+/g, " ").trim()).join(" | "); if (t.trim()) out.push(P(t)); }); }
        else if (n.children.length) walk(n);
        else if (txt) out.push(P(txt));
      }
    };
    walk(doc.body || doc.documentElement);
    return out.filter((l) => l.text.trim() || l.mono);
  }

  /* ---------- Markdown ---------- */
  function mdLines(t) {
    const out = [];
    let fence = false, outBlock = false;
    for (const raw of t.replace(/\r/g, "").split("\n")) {
      if (/^\s*(```|~~~)/.test(raw)) { if (fence && outBlock) outBlock = false; fence = !fence; if (!fence) out.push(P("")); continue; }
      if (fence) { out.push(C(raw)); continue; }
      const m = /^(#{1,6})\s+(.*)$/.exec(raw);
      if (m) { out.push(H(m[2].replace(/#+\s*$/, ""), Math.min(3, m[1].length))); continue; }
      if (/^\s*([-*+]|\d+[.)])\s+/.test(raw)) { out.push(B(raw.replace(/^\s*([-*+]|\d+[.)])\s+/, ""))); continue; }
      if (/^ {4,}\S|^\t\S/.test(raw)) { out.push(C(raw.replace(/^( {4}|\t)/, ""))); continue; }
      if (/^\s*[-=*_]{3,}\s*$/.test(raw)) continue;
      if (!raw.trim()) { out.push(P("")); continue; }
      out.push(L(raw.replace(/\*\*([^*]+)\*\*/g, "$1").replace(/^>\s?/, ""), { hint: 0 }));
    }
    return out.filter((l) => l.text.trim() || l.mono);
  }

  /* ---------- plain text ---------- */
  function txtLines(t) {
    const rows = t.replace(/\r/g, "").split("\n"), out = [];
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i], next = rows[i + 1] || "";
      if (/^\s*$/.test(r)) { out.push(P("")); continue; }
      if (/^=+\s*$/.test(next) && r.trim().length < 90) { out.push(H(r.trim(), 1)); i++; continue; }
      if (/^-+\s*$/.test(next) && r.trim().length < 90) { out.push(H(r.trim(), 2)); i++; continue; }
      if (/^ {4,}\S|^\t\S/.test(r)) { out.push(C(r.replace(/^( {4}|\t)/, ""))); continue; }
      if (/^\s*([-*•]|\d+[.)])\s+/.test(r)) { out.push(B(r.replace(/^\s*([-*•]|\d+[.)])\s+/, ""))); continue; }
      if (r.trim().length < 70 && /^[A-Z0-9][A-Z0-9 :&\-—,/()]+$/.test(r.trim()) && /[A-Z]{3}/.test(r)) { out.push(H(r.trim(), 2)); continue; }
      out.push(L(r.trim(), {}));
    }
    return out.filter((l) => l.text.trim() || l.mono);
  }

  /* ---------- code files: comments become explanations ---------- */
  function codeLines(t, ext) {
    const cm = /^(py|sh|rb|r|pl|yaml|yml|toml|dockerfile)$/.test(ext) ? /^\s*#\s?(.*)$/ : ext === "sql" ? /^\s*--\s?(.*)$/ : /^\s*\/\/\s?(.*)$/;
    const out = [];
    for (const r of t.replace(/\r/g, "").split("\n")) {
      const m = cm.exec(r);
      if (m && !/^[#!]/.test(m[1])) {
        const c = m[1].trim();
        if (/^[=\-*#~]{3,}/.test(c)) continue;
        const h = /^[=\-*#~\s]*(chapter|lesson|part|section|step|topic)?\s*[:\-]?\s*(.{3,80}?)[\s=\-*#~]*$/i.exec(c);
        if (c.length < 70 && /^[=\-*#~]|^[A-Z][A-Z0-9 :&\-]{4,}$|^(chapter|lesson|part|section|step|topic)\b/i.test(c)) out.push(H((h && h[2]) || c, 2));
        else if (c) out.push(P(c));
      } else if (r.trim()) out.push(C(r));
      else out.push(P(""));
    }
    return out.filter((l) => l.text.trim() || l.mono);
  }

  /* ---------- Jupyter notebook ---------- */
  function ipynbLines(t) {
    const nb = JSON.parse(t), out = [];
    for (const c of nb.cells || []) {
      const src = Array.isArray(c.source) ? c.source.join("") : String(c.source || "");
      if (c.cell_type === "markdown") out.push(...mdLines(src));
      else if (c.cell_type === "code") {
        src.replace(/\n$/, "").split("\n").forEach((x) => out.push(C(x)));
        const txt = (c.outputs || []).map((o) => (o.text ? [].concat(o.text).join("") : o.data && o.data["text/plain"] ? [].concat(o.data["text/plain"]).join("") : "")).join("").replace(/\n$/, "");
        if (txt.trim() && txt.length < 600) { out.push(OUT()); txt.split("\n").forEach((x) => out.push(C(x))); }
        out.push(P(""));
      }
    }
    return out.filter((l) => l.text.trim() || l.mono);
  }

  /* ---------- Word .docx ---------- */
  const W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
  async function docxLines(buf) {
    const z = await unzip(buf);
    const doc = xml(await z.text("word/document.xml"));
    const out = [];
    for (const p of byTag(doc, W, "p")) {
      const style = (byTag(p, W, "pStyle")[0] || { getAttributeNS: () => "" }).getAttributeNS(W, "val") || "";
      const runs = byTag(p, W, "r");
      const text = runs.map((r) => byTag(r, W, "t").map((t) => t.textContent).join("") + (byTag(r, W, "tab").length ? "    " : "")).join("");
      if (!text.trim()) { out.push(P("")); continue; }
      const fonts = runs.map((r) => { const f = byTag(r, W, "rFonts")[0]; return f ? f.getAttributeNS(W, "ascii") || "" : ""; }).join(" ");
      const m = /heading\s*([1-9])|^title$/i.exec(style);
      if (m) out.push(H(text.trim(), m[1] ? Math.min(3, +m[1]) : 1));
      else if (/mono|courier|consol|code/i.test(fonts + " " + style)) out.push(C(text));
      else if (byTag(p, W, "numPr").length || /list/i.test(style)) out.push(B(text.trim()));
      else out.push(P(text.trim()));
    }
    return out.filter((l) => l.text.trim() || l.mono);
  }

  /* ---------- OpenDocument .odt ---------- */
  async function odtLines(buf) {
    const z = await unzip(buf);
    const doc = xml(await z.text("content.xml"));
    const T = "urn:oasis:names:tc:opendocument:xmlns:text:1.0", out = [];
    const walk = (el) => { for (const n of el.children) { const ln = n.localName; if (ln === "h") out.push(H(n.textContent.trim(), Math.min(3, +(n.getAttributeNS(T, "outline-level") || 1)))); else if (ln === "p") out.push(n.textContent.trim() ? P(n.textContent.trim()) : P("")); else if (ln === "list-item") out.push(B(n.textContent.trim())); else walk(n); } };
    walk(doc.documentElement);
    return out.filter((l) => l.text.trim());
  }

  /* ---------- PowerPoint .pptx ---------- */
  const A = "http://schemas.openxmlformats.org/drawingml/2006/main", PNS = "http://schemas.openxmlformats.org/presentationml/2006/main";
  async function pptxLines(buf) {
    const z = await unzip(buf);
    const slides = z.names.filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n)).sort((a, b) => +a.match(/\d+/)[0] - +b.match(/\d+/)[0]);
    const out = [];
    let i = 0;
    for (const s of slides) {
      i++;
      const d = xml(await z.text(s));
      let title = "";
      const body = [];
      for (const sp of byTag(d, PNS, "sp")) {
        const ph = byTag(sp, PNS, "ph")[0], type = ph ? ph.getAttribute("type") || "" : "";
        const paras = byTag(sp, A, "p").map((p) => byTag(p, A, "t").map((t) => t.textContent).join("")).filter((x) => x.trim());
        if (/title/i.test(type) && !title) title = paras.join(" ");
        else body.push(...paras);
      }
      if (i % 8 === 1) out.push(H(title || "Slides " + i, 1));
      out.push(H(title || "Slide " + i, 2));
      body.forEach((t) => out.push(/^[\s]{2,}|[{};]\s*$|^\s*(def|class|import|print\(|SELECT)\b/.test(t) ? C(t) : B(t)));
    }
    return out;
  }

  /* ---------- EPUB ---------- */
  async function epubLines(buf, onProgress) {
    const z = await unzip(buf);
    const cont = xml(await z.text("META-INF/container.xml"));
    const opfPath = cont.getElementsByTagName("rootfile")[0].getAttribute("full-path");
    const opf = xml(await z.text(opfPath));
    const base = opfPath.includes("/") ? opfPath.slice(0, opfPath.lastIndexOf("/") + 1) : "";
    const items = {};
    Array.from(opf.getElementsByTagName("item")).forEach((it) => { items[it.getAttribute("id")] = it.getAttribute("href"); });
    const spine = Array.from(opf.getElementsByTagName("itemref")).map((r) => items[r.getAttribute("idref")]).filter(Boolean);
    const out = [];
    for (let i = 0; i < spine.length; i++) {
      const path = decodeURIComponent(base + spine[i]).replace(/[^/]+\/\.\.\//g, "");
      const html = await z.text(path);
      if (html) out.push(...htmlLines(html));
      if (onProgress) onProgress((i + 1) / spine.length * 0.5, `${i + 1}/${spine.length}`);
    }
    return out;
  }

  /* ---------- dispatcher ---------- */
  const CODE_EXT = /^(py|js|ts|jsx|tsx|sql|java|c|h|cpp|hpp|cs|kt|go|rb|php|sh|r|swift|rs|scala|dart|yaml|yml|toml|dockerfile)$/;
  const KINDS = { pdf: "PDF", docx: "Word", pptx: "PowerPoint", epub: "EPUB", ipynb: "Notebook", md: "Markdown", markdown: "Markdown", html: "HTML", htm: "HTML", txt: "Text", odt: "OpenDocument" };
  const ICONS = { pdf: "📕", docx: "📘", pptx: "📙", epub: "📗", ipynb: "📓", md: "📝", html: "🌐", htm: "🌐", txt: "📄", odt: "📘" };
  const ACCEPT = ".pdf,.docx,.pptx,.epub,.ipynb,.md,.markdown,.html,.htm,.txt,.odt,.py,.js,.ts,.jsx,.tsx,.sql,.java,.c,.h,.cpp,.cs,.kt,.go,.rb,.php,.sh,.r,.swift,.rs,.dart,.yaml,.yml,.json";
  async function readAny(file, opt) {
    const name = file.name || "file", ext = (name.split(".").pop() || "").toLowerCase();
    const buf = await file.arrayBuffer();
    const textOf = () => new TextDecoder("utf-8").decode(buf);
    const base = { lang: opt.lang, name: name.replace(/\.[^.]+$/, ""), verify: opt.verify, onProgress: opt.onProgress, kind: KINDS[ext] || ext.toUpperCase(), icon: ICONS[ext] || (CODE_EXT.test(ext) ? "💻" : "📄") };
    if (ext === "pdf") return window.CG_PDF.build(buf, base);
    if (ext === "json") {
      const j = JSON.parse(textOf());
      if (j && Array.isArray(j.stages)) return Object.assign(j, { _pack: true });
      if (j && Array.isArray(j.cells)) return window.CG_PDF.build(null, Object.assign(base, { pages: [ipynbLines(textOf())], kind: "Notebook", icon: "📓" }));
      throw new Error("Unknown JSON file");
    }
    let lines;
    if (ext === "docx") lines = await docxLines(buf);
    else if (ext === "pptx") lines = await pptxLines(buf);
    else if (ext === "epub") lines = await epubLines(buf, opt.onProgress);
    else if (ext === "odt") lines = await odtLines(buf);
    else if (ext === "ipynb") lines = ipynbLines(textOf());
    else if (ext === "md" || ext === "markdown") lines = mdLines(textOf());
    else if (ext === "html" || ext === "htm") lines = htmlLines(textOf());
    else if (CODE_EXT.test(ext)) lines = codeLines(textOf(), ext);
    else if (ext === "txt" || !ext) lines = txtLines(textOf());
    else throw new Error("This file type is not supported: ." + ext);
    if (opt.onProgress) opt.onProgress(0.6, "");
    return window.CG_PDF.build(null, Object.assign(base, { pages: [lines] }));
  }
  window.CG_FORMATS = { readAny, ACCEPT, _t: { mdLines, htmlLines, txtLines, codeLines, ipynbLines, docxLines, pptxLines, epubLines, odtLines, unzip } };
})();
