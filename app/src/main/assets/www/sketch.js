/* Code Guru - hand-drawn sketch renderer.
   sketchSVG(spec) -> SVG markup string for the sketch kinds listed in tools/SCHEMA.md.
   Colours come from CSS classes so the same drawing works on paper (lessons) and on the
   chalkboard (teacher mode). */
(function () {
  "use strict";
  const W = 440;
  const FS = 15.5; // base font size
  const esc = (t) => String(t == null ? "" : t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const FILLS = ["f1", "f2", "f3", "f4", "f5"];

  // deterministic pseudo random for the hand-drawn wobble
  let seed = 1;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const j = (a) => (rnd() - 0.5) * a;
  function hashStr(s) { let h = 7; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) % 2147483647; return h || 1; }

  // width estimate for wrapping (Devanagari glyphs are a bit wider)
  function tw(t, fs) {
    let w = 0;
    for (const c of String(t)) w += /[ऀ-ॿ]/.test(c) ? 0.62 : /[A-Z@#%&mwMW]/.test(c) ? 0.66 : 0.54;
    return w * fs;
  }
  function wrap(t, maxW, fs) {
    const words = String(t == null ? "" : t).split(/\s+/).filter(Boolean);
    const lines = [];
    let cur = "";
    for (const w of words) {
      const nx = cur ? cur + " " + w : w;
      if (tw(nx, fs) <= maxW || !cur) cur = nx;
      else { lines.push(cur); cur = w; }
    }
    if (cur) lines.push(cur);
    // hard-break very long single words
    const out = [];
    for (const l of lines) {
      if (tw(l, fs) <= maxW * 1.05) { out.push(l); continue; }
      let s = "";
      for (const c of l) { if (tw(s + c, fs) > maxW) { out.push(s); s = c; } else s += c; }
      if (s) out.push(s);
    }
    return out.length ? out : [""];
  }
  function text(x, y, t, opt) {
    opt = opt || {};
    const fs = opt.fs || FS;
    const lines = opt.maxW ? wrap(t, opt.maxW, fs) : [String(t == null ? "" : t)];
    const lh = fs * 1.25;
    const y0 = opt.mid ? y - ((lines.length - 1) * lh) / 2 : y;
    const anchor = opt.anchor || "middle";
    const cls = opt.cls || "sk-t";
    return `<text class="${cls}" x="${x}" y="${y0}" font-size="${fs}" text-anchor="${anchor}" dominant-baseline="middle"${opt.bold ? ' font-weight="700"' : ""}>` +
      lines.map((l, i) => `<tspan x="${x}" dy="${i ? lh : 0}">${esc(l)}</tspan>`).join("") + "</text>";
  }
  const linesOf = (t, maxW, fs) => wrap(t, maxW, fs || FS).length;

  function rough(x, y, w, h, cls, r) {
    r = r == null ? 10 : r;
    const p = (a, b) => `${(a + j(2.2)).toFixed(1)},${(b + j(2.2)).toFixed(1)}`;
    const d = `M${p(x + r, y)} L${p(x + w - r, y)} Q${p(x + w, y)} ${p(x + w, y + r)} L${p(x + w, y + h - r)} Q${p(x + w, y + h)} ${p(x + w - r, y + h)} L${p(x + r, y + h)} Q${p(x, y + h)} ${p(x, y + h - r)} L${p(x, y + r)} Q${p(x, y)} ${p(x + r, y)} Z`;
    return `<path class="${cls || "sk-box"}" d="${d}"/>`;
  }
  function line(x1, y1, x2, y2, cls) {
    const mx = (x1 + x2) / 2 + j(4), my = (y1 + y2) / 2 + j(4);
    return `<path class="${cls || "sk-line"}" d="M${x1.toFixed(1)},${y1.toFixed(1)} Q${mx.toFixed(1)},${my.toFixed(1)} ${x2.toFixed(1)},${y2.toFixed(1)}"/>`;
  }
  function arrow(x1, y1, x2, y2) {
    const a = Math.atan2(y2 - y1, x2 - x1), L = 10;
    const h1 = [x2 - L * Math.cos(a - 0.45), y2 - L * Math.sin(a - 0.45)];
    const h2 = [x2 - L * Math.cos(a + 0.45), y2 - L * Math.sin(a + 0.45)];
    return line(x1, y1, x2, y2, "sk-arrow") + `<path class="sk-arrow" d="M${h1[0].toFixed(1)},${h1[1].toFixed(1)} L${x2.toFixed(1)},${y2.toFixed(1)} L${h2[0].toFixed(1)},${h2[1].toFixed(1)}"/>`;
  }
  function circle(cx, cy, r, cls) {
    let d = "";
    const n = 18;
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * Math.PI * 2, rr = r + j(1.6);
      d += (i ? "L" : "M") + (cx + rr * Math.cos(a)).toFixed(1) + "," + (cy + rr * Math.sin(a)).toFixed(1);
    }
    return `<path class="${cls || "sk-box"}" d="${d}Z"/>`;
  }

  // ---------- kinds ----------
  function boxes(s) {
    const items = (s.items || []).slice(0, 8);
    const n = Math.max(1, items.length), cols = Math.min(n, n > 4 ? Math.ceil(n / 2) : n), rows = Math.ceil(n / cols);
    const gap = 14, bw = Math.min(180, (W - 40 - gap * (cols - 1)) / cols), bh = 74;
    const x0 = (W - (cols * bw + gap * (cols - 1))) / 2;
    let out = "", y = 20;
    items.forEach((it, i) => {
      const c = i % cols, r = Math.floor(i / cols), x = x0 + c * (bw + gap), yy = y + r * (bh + 46);
      out += text(x + bw / 2, yy + 12, it.label, { fs: 15, bold: true, cls: "sk-t sk-label", maxW: bw });
      out += rough(x, yy + 26, bw, bh, "sk-box " + FILLS[i % 5]);
      out += `<path class="sk-line" d="M${x + 10},${yy + 40} L${x + bw - 10},${yy + 40}"/>`;
      out += text(x + bw / 2, yy + 26 + bh / 2 + 6, it.value == null ? "" : it.value, { fs: 16, cls: "sk-t sk-mono", maxW: bw - 16, mid: true });
    });
    return [out, y + rows * (bh + 46) + 4];
  }
  function flow(s) {
    const st = (s.steps || []).slice(0, 7), n = Math.max(1, st.length);
    if (s.dir === "v") {
      const bw = 300, x = (W - bw) / 2;
      let y = 14, out = "";
      st.forEach((t, i) => {
        const L = linesOf(t, bw - 24), h = 28 + L * 19;
        out += rough(x, y, bw, h, "sk-box " + FILLS[i % 5]);
        out += text(W / 2, y + h / 2, t, { maxW: bw - 24, mid: true });
        y += h;
        if (i < n - 1) { out += arrow(W / 2, y + 4, W / 2, y + 30); y += 34; }
      });
      return [out, y + 10];
    }
    const gap = n > 4 ? 22 : 30, bw = (W - 16 - gap * (n - 1)) / n;
    const fs = bw < 70 ? 12.5 : bw < 95 ? 13.5 : FS;
    const maxL = Math.max(...st.map((t) => linesOf(t, bw - 14, fs)));
    const h = 26 + maxL * fs * 1.25, y = 24;
    let out = "";
    st.forEach((t, i) => {
      const x = 8 + i * (bw + gap);
      out += rough(x, y, bw, h, "sk-box " + FILLS[i % 5]);
      out += text(x + bw / 2, y + h / 2, t, { fs, maxW: bw - 14, mid: true });
      if (i < n - 1) out += arrow(x + bw + 4, y + h / 2, x + bw + gap - 4, y + h / 2);
    });
    return [out, y + h + 20];
  }
  function cycle(s) {
    const st = (s.steps || []).slice(0, 6), n = Math.max(2, st.length);
    const cx = W / 2, cy = 165, R = 112, bw = 132;
    let out = circle(cx, cy, R - 30, "sk-faint");
    const pos = st.map((_, i) => { const a = -Math.PI / 2 + (i / n) * Math.PI * 2; return [cx + R * 1.12 * Math.cos(a), cy + R * Math.sin(a)]; });
    st.forEach((t, i) => {
      const [x, y] = pos[i], nx = pos[(i + 1) % st.length];
      const L = linesOf(t, bw - 16), h = 22 + L * 19;
      out += rough(x - bw / 2, y - h / 2, bw, h, "sk-box " + FILLS[i % 5]);
      out += text(x, y, t, { maxW: bw - 16, mid: true });
      if (st.length > 1) {
        const a1 = Math.atan2(nx[1] - y, nx[0] - x);
        out += arrow(x + Math.cos(a1) * 52, y + Math.sin(a1) * 34, nx[0] - Math.cos(a1) * 52, nx[1] - Math.sin(a1) * 34);
      }
    });
    out += text(cx, cy, "↻", { fs: 34, cls: "sk-t sk-accent" });
    return [out, cy + R + 44];
  }
  function array(s) {
    const items = (s.items || []).slice(0, 12), n = Math.max(1, items.length);
    const cw = Math.min(72, (W - 30) / n), x0 = (W - cw * n) / 2, y = 26, h = 54;
    const fs = cw < 50 ? 12 : 15;
    let out = "";
    items.forEach((t, i) => {
      out += rough(x0 + i * cw, y, cw, h, "sk-box " + FILLS[i % 5], 4);
      out += text(x0 + i * cw + cw / 2, y + h / 2, t, { fs, cls: "sk-t sk-mono", maxW: cw - 6, mid: true });
      if (s.index !== false) {
        out += text(x0 + i * cw + cw / 2, y + h + 18, String(i), { fs: 13, cls: "sk-t sk-accent" });
        out += text(x0 + i * cw + cw / 2, y - 12, String(i - n), { fs: 11, cls: "sk-t sk-dim" });
      }
    });
    return [out, y + h + 34];
  }
  function stack(s) {
    const items = (s.items || []).slice(0, 8), bw = 300, x = (W - bw) / 2;
    let y = 16, out = "";
    items.forEach((t, i) => {
      const L = linesOf(t, bw - 24), h = 20 + L * 19;
      out += rough(x, y, bw, h, "sk-box " + FILLS[i % 5], 6);
      out += text(W / 2, y + h / 2, t, { maxW: bw - 24, mid: true });
      y += h + 6;
    });
    out += arrow(x - 22, y - 10, x - 22, 22);
    return [out, y + 10];
  }
  function tree(s) {
    // layout leaves left to right
    const root = s.root || { label: "?" };
    const levels = [];
    let leaf = 0;
    function lay(nd, d) {
      if (d > 3) return null;
      const node = { label: nd.label, d, kids: [] };
      (levels[d] = levels[d] || []).push(node);
      const ch = (nd.children || []).slice(0, 4);
      if (!ch.length || d === 3) { node.x = leaf++; }
      else {
        ch.forEach((c) => { const k = lay(c, d + 1); if (k) node.kids.push(k); });
        node.x = node.kids.length ? (node.kids[0].x + node.kids[node.kids.length - 1].x) / 2 : leaf++;
      }
      return node;
    }
    const r = lay(root, 0);
    const nl = Math.max(1, leaf), depth = levels.length;
    const cw = (W - 12) / nl, bw = Math.min(160, cw - 8), fs = bw < 80 ? 11.5 : bw < 110 ? 12.5 : 14, lh = 92;
    let out = "";
    const pos = (n) => [6 + n.x * cw + cw / 2, 30 + n.d * lh];
    (function draw(n) {
      const [x, y] = pos(n);
      n.kids.forEach((k) => { const [kx, ky] = pos(k); out += line(x, y + 22, kx, ky - 22); draw(k); });
    })(r);
    (function box(n, i) {
      const [x, y] = pos(n), L = linesOf(n.label, bw - 12, fs), h = 16 + L * fs * 1.25;
      out += rough(x - bw / 2, y - h / 2, bw, h, "sk-box " + FILLS[n.d % 5], 8);
      out += text(x, y, n.label, { fs, maxW: bw - 12, mid: true });
      n.kids.forEach((k, ki) => box(k, ki));
    })(r, 0);
    return [out, 30 + (depth - 1) * lh + 50];
  }
  function layers(s) {
    const L = (s.layers || [3, 4, 2]).slice(0, 6).map((v) => Math.max(1, Math.min(8, v | 0)));
    const lab = s.labels || [];
    const n = L.length, gx = (W - 90) / Math.max(1, n - 1), maxN = Math.max(...L), H = Math.max(200, maxN * 44 + 40);
    const pos = L.map((c, i) => Array.from({ length: c }, (_, k) => [45 + i * gx, 30 + (H - 60) / 2 - ((c - 1) * 44) / 2 + k * 44]));
    let out = "";
    for (let i = 0; i < n - 1; i++) for (const a of pos[i]) for (const b of pos[i + 1]) out += `<path class="sk-faint" d="M${a[0]},${a[1]} L${b[0]},${b[1]}"/>`;
    pos.forEach((col, i) => col.forEach(([x, y]) => { out += circle(x, y, 15, "sk-box " + FILLS[i % 5]); }));
    lab.slice(0, n).forEach((t, i) => { out += text(45 + i * gx, H + 4, t, { fs: 13, maxW: Math.min(150, gx), mid: false }); });
    return [out, H + 30];
  }
  function table(s) {
    const head = (s.head || []).slice(0, 5), rows = (s.rows || []).slice(0, 8), nc = Math.max(1, head.length);
    const cw = (W - 20) / nc, fs = nc > 3 ? 13 : nc > 2 ? 14 : 15;
    let y = 10, out = "";
    const rowH = (r) => 14 + Math.max(...r.map((c) => linesOf(c, cw - 12, fs))) * fs * 1.25;
    const hh = rowH(head);
    out += rough(10, y, W - 20, hh, "sk-box f2", 6);
    head.forEach((h, i) => { out += text(10 + i * cw + cw / 2, y + hh / 2, h, { fs, bold: true, maxW: cw - 12, mid: true }); });
    y += hh;
    rows.forEach((r) => {
      const cells = head.map((_, i) => (r[i] == null ? "" : String(r[i])));
      const h = rowH(cells);
      out += rough(10, y, W - 20, h, "sk-box f0", 4);
      cells.forEach((c, i) => { out += text(10 + i * cw + cw / 2, y + h / 2, c, { fs, maxW: cw - 12, mid: true, cls: /[(){}\[\]=_.]/.test(c) ? "sk-t sk-mono" : "sk-t" }); });
      y += h;
    });
    for (let i = 1; i < nc; i++) out += `<path class="sk-faint" d="M${10 + i * cw},14 L${10 + i * cw},${y - 4}"/>`;
    return [out, y + 12];
  }
  function compare(s) {
    const sides = [s.left || {}, s.right || {}], cw = (W - 34) / 2;
    let out = "", maxY = 0;
    sides.forEach((sd, i) => {
      const x = 10 + i * (cw + 14);
      let y = 12;
      out += rough(x, y, cw, 36, "sk-box " + (i ? "f4" : "f3"), 8);
      out += text(x + cw / 2, y + 18, sd.title || "", { bold: true, maxW: cw - 16, mid: true });
      y += 48;
      (sd.items || []).slice(0, 6).forEach((t) => {
        const L = linesOf(t, cw - 36, 14), h = 10 + L * 17.5;
        out += text(x + 14, y + h / 2, "•", { fs: 18, cls: "sk-t sk-accent" });
        out += text(x + 26, y + h / 2, t, { fs: 14, maxW: cw - 36, anchor: "start", mid: true });
        y += h + 4;
      });
      maxY = Math.max(maxY, y);
    });
    out += `<path class="sk-faint" d="M${W / 2},14 L${W / 2},${maxY}"/>`;
    return [out, maxY + 10];
  }
  function chart(s) {
    const pts = (s.points || []).slice(0, 40), H = 230, x0 = 54, y0 = 20, pw = W - 70, ph = H - 60;
    let out = `<path class="sk-line" d="M${x0},${y0} L${x0},${y0 + ph} L${x0 + pw},${y0 + ph}"/>`;
    if (s.type === "bar") {
      const vals = pts.map((p) => +p[1] || 0), mx = Math.max(1e-9, ...vals.map(Math.abs)), n = Math.max(1, pts.length), bw = pw / n;
      pts.forEach((p, i) => {
        const v = +p[1] || 0, h = (Math.abs(v) / mx) * (ph - 20);
        out += rough(x0 + i * bw + bw * 0.15, y0 + ph - h, bw * 0.7, Math.max(2, h), "sk-box " + FILLS[i % 5], 3);
        out += text(x0 + i * bw + bw / 2, y0 + ph - h - 10, String(v), { fs: 12 });
        out += text(x0 + i * bw + bw / 2, y0 + ph + 14, String(p[0]), { fs: 12, maxW: bw - 4 });
      });
    } else {
      const all = pts.concat(s.line || []).filter((p) => isFinite(+p[0]) && isFinite(+p[1]));
      if (!all.length) return [out, H];
      let xs = all.map((p) => +p[0]), ys = all.map((p) => +p[1]);
      let xmn = Math.min(...xs), xmx = Math.max(...xs), ymn = Math.min(...ys), ymx = Math.max(...ys);
      if (xmx === xmn) { xmx += 1; xmn -= 1; }
      if (ymx === ymn) { ymx += 1; ymn -= 1; }
      const X = (v) => x0 + 10 + ((v - xmn) / (xmx - xmn)) * (pw - 20), Y = (v) => y0 + ph - 10 - ((v - ymn) / (ymx - ymn)) * (ph - 20);
      const fmt = (v) => (Math.abs(v) >= 1000 ? (v / 1000).toFixed(1) + "k" : +(+v).toFixed(2));
      out += text(x0 - 8, Y(ymx), fmt(ymx), { fs: 11, anchor: "end", cls: "sk-t sk-dim" }) + text(x0 - 8, Y(ymn), fmt(ymn), { fs: 11, anchor: "end", cls: "sk-t sk-dim" });
      out += text(X(xmn), y0 + ph + 14, fmt(xmn), { fs: 11, cls: "sk-t sk-dim" }) + text(X(xmx), y0 + ph + 14, fmt(xmx), { fs: 11, cls: "sk-t sk-dim" });
      if (s.line && s.line.length > 1) out += `<path class="sk-accline" d="${s.line.map((p, i) => (i ? "L" : "M") + X(+p[0]).toFixed(1) + "," + Y(+p[1]).toFixed(1)).join(" ")}"/>`;
      if (s.type === "line") out += `<path class="sk-plot" d="${pts.map((p, i) => (i ? "L" : "M") + X(+p[0]).toFixed(1) + "," + Y(+p[1]).toFixed(1)).join(" ")}"/>`;
      pts.forEach((p) => { out += circle(X(+p[0]), Y(+p[1]), s.type === "line" ? 3.5 : 6, "sk-dot"); });
    }
    if (s.xl) out += text(x0 + pw / 2, H - 8, s.xl, { fs: 13, cls: "sk-t sk-dim" });
    if (s.yl) out += `<g transform="translate(18 ${y0 + ph / 2}) rotate(-90)">${text(0, 0, s.yl, { fs: 13, cls: "sk-t sk-dim" })}</g>`;
    return [out, H + 6];
  }

  const KINDS = { boxes, flow, cycle, array, stack, tree, layers, table, compare, chart };
  function sketchSVG(spec) {
    if (!spec || !KINDS[spec.k]) return "";
    seed = hashStr(JSON.stringify(spec).slice(0, 400));
    let body, h;
    try { [body, h] = KINDS[spec.k](spec); } catch (e) { return ""; }
    let top = 0, head = "";
    if (spec.title) { const L = linesOf(spec.title, W - 40, 17); top = 14 + L * 21; head = text(W / 2, 18, spec.title, { fs: 17, bold: true, maxW: W - 40, cls: "sk-t sk-title" }); }
    const H = Math.ceil(h + top);
    // phones: never draw text smaller than ~11px on a 360px-wide screen
    return `<svg class="sk" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${esc(spec.title || spec.k)}">${head}<g transform="translate(0 ${top})">${body}</g></svg>`;
  }
  window.sketchSVG = sketchSVG;
})();
