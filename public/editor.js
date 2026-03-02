import { VM } from "./panspark.js";

// ════════════════════════════════════════════════════════
// DOCS
// ════════════════════════════════════════════════════════
const DOCS = {
  overview: `<div class="sec">
<h3>WHAT IS PANSPARK</h3>
<p>An assembly-like VM language. Programs run line-by-line; each line is one instruction. Storage is split across two register banks:</p>
<ul style="font-size:12px;color:var(--amber-dim);line-height:1.8;margin:6px 0 8px 16px">
<li><strong style="color:var(--amber)">r-registers</strong> (<code>r0</code>–<code>rN</code>) — general purpose scratch space. Hold integers, strings, or arrays.</li>
<li><strong style="color:#ff6a00">x-registers</strong> (<code>x0</code>–<code>xN</code>) — machine-mapped slots. Used to interface with hardware peripherals. Same types as r-registers.</li>
</ul>
<div class="note">Both banks share one heap budget (default 1280 B). Integer = 2B · String = len+1B · Array = 2B × elements.</div>
</div>
<div class="sec">
<h3>NAMED VARIABLES</h3>
<p>Declare register aliases before first use. Resolved at compile time — zero runtime cost.</p>
<pre>$counter = r0      // bind to r0 explicitly
$index   = auto    // next free r-register
$slot    = x3      // bind to machine register x3</pre>
<p><code>auto</code> only assigns from the r-bank. Machine registers must be declared explicitly (<code>x0</code>, <code>x1</code>, …). Longest names substitute first to avoid partial-match bugs.</p>
</div>
<div class="sec">
<h3>SYNTAX RULES</h3>
<p><strong>Result arrow:</strong> ops that write use <code>&gt;&gt;</code> — e.g. <code>ADD r0 r1 &gt;&gt; r2</code></p>
<p><strong>Comments:</strong> own line only, starting with <code>//</code> — no inline comments.</p>
<p><strong>Opcodes</strong> are UPPERCASE. <strong>Strings:</strong> <code>"hello"</code> · <strong>Arrays:</strong> <code>[1,2,3]</code></p>
<p>r-registers and x-registers are interchangeable as source or destination in any instruction.</p>
</div>
<div class="sec">
<h3>PERIPHERALS</h3>
<p>Any unknown opcode dispatches to a registered handler. Register on the host before compiling:</p>
<pre>vm.registerPeripheral("MACH_GET", (vm, args) => {
const handle = vm.fetchMemory(args[0]);
const prop   = vm.fetchValue(args[1]);
vm.setMemory(result, args[2]);
});</pre>
<div class="note">Peripheral <em>names</em> survive saveState/loadState. Handler <em>functions</em> do not — re-register after restoring.</div>
</div>`,

  memory: `<div class="sec">
<h3>TWO REGISTER BANKS</h3>
<p>PanSpark has two distinct register banks. Both hold the same types; the difference is intent and lifetime.</p>
<table class="tbl">
<tr><th>Bank</th><th>Syntax</th><th>Purpose</th></tr>
<tr><td>r-registers</td><td><code>r0</code>, <code>r1</code>, …</td><td>General-purpose scratch registers. Local variables, counters, temporaries, function arguments.</td></tr>
<tr><td>x-registers</td><td><code>x0</code>, <code>x1</code>, …</td><td>Machine-mapped registers. Represent specific hardware or peripheral slots. Peripheral handlers typically read/write x-registers.</td></tr>
</table>
<div class="note">Both banks are part of the same heap budget. Writing a string to <code>x2</code> costs heap bytes just like writing to <code>r2</code>.</div>
</div>
<div class="sec">
<h3>HEAP BUDGET</h3>
<p>Every register slot starts as a 2-byte integer. The heap tracks total consumption across <strong>both</strong> banks.</p>
<table class="tbl">
<tr><th>Type</th><th>Byte cost</th></tr>
<tr><td>Integer</td><td>2 bytes</td></tr>
<tr><td>String</td><td>string.length + 1 bytes</td></tr>
<tr><td>Array</td><td>2 × element_count bytes</td></tr>
</table>
<p>Writing frees the old value's cost and charges the new one. Exceeding the limit throws a heap overflow — the register is unchanged.</p>
</div>
<div class="sec">
<h3>USING MACHINE REGISTERS</h3>
<p>x-registers work identically to r-registers in all instructions:</p>
<pre>SET 42 >> x0           // store integer
SET "iron_ore" >> x1   // store string
ADD r0 x0 >> x1        // mix banks freely
IF x0 == r1 >> label   // compare across banks
ARR_PUSH x0 r1         // array ops on x-bank</pre>
<p>Named variable declarations for the x-bank:</p>
<pre>$slot    = x0   // explicit machine register
$handle  = x3   // specific slot for a peripheral handle</pre>
<p>The VM constructor takes a machine memory limit as its second argument:</p>
<pre>// new VM(r-regs, x-regs, call-stack, heap)
const vm = new VM(16, 16, 128, 1280);</pre>
</div>`,

  ops: `<div class="sec">
<h3>BASIC</h3>
<table class="tbl"><tr><th>Opcode</th><th>Syntax</th><th>Notes</th></tr>
<tr><td>SET</td><td><code>SET &lt;val&gt; &gt;&gt; dest</code></td><td>val = literal, register (r or x), string, or array</td></tr>
<tr><td>PRINT</td><td><code>PRINT &lt;val&gt;</code></td><td>Pushes to output buffer</td></tr>
<tr><td>NOP</td><td><code>NOP</code></td><td>No operation</td></tr>
<tr><td>HALT</td><td><code>HALT</code></td><td>Stop execution</td></tr>
</table></div>
<div class="sec">
<h3>ARITHMETIC</h3>
<p>Integer-only. Passing a string register throws at runtime. Works on r- and x-registers equally.</p>
<table class="tbl"><tr><th>Opcode</th><th>Syntax</th><th>Result</th></tr>
<tr><td>ADD</td><td><code>ADD a b &gt;&gt; d</code></td><td>a + b</td></tr>
<tr><td>SUB</td><td><code>SUB a b &gt;&gt; d</code></td><td>a − b</td></tr>
<tr><td>MUL</td><td><code>MUL a b &gt;&gt; d</code></td><td>a × b</td></tr>
<tr><td>DIV</td><td><code>DIV a b &gt;&gt; d</code></td><td>trunc(a÷b) — throws on 0</td></tr>
<tr><td>MOD</td><td><code>MOD a b &gt;&gt; d</code></td><td>a % b — throws on 0</td></tr>
<tr><td>POW</td><td><code>POW b e &gt;&gt; d</code></td><td>b^e</td></tr>
<tr><td>SQRT</td><td><code>SQRT a &gt;&gt; d</code></td><td>floor(√a)</td></tr>
<tr><td>ABS</td><td><code>ABS a &gt;&gt; d</code></td><td>|a|</td></tr>
<tr><td>MIN</td><td><code>MIN a b &gt;&gt; d</code></td><td>smaller of a, b</td></tr>
<tr><td>MAX</td><td><code>MAX a b &gt;&gt; d</code></td><td>larger of a, b</td></tr>
<tr><td>RNG</td><td><code>RNG min max &gt;&gt; d</code></td><td>random in [min, max]</td></tr>
<tr><td>INC</td><td><code>INC reg</code></td><td>reg += 1 in-place</td></tr>
<tr><td>DEC</td><td><code>DEC reg</code></td><td>reg -= 1 in-place</td></tr>
</table></div>`,

  arrays: `<div class="sec">
<h3>ARRAY OPERATIONS</h3>
<p>Arrays hold numbers only. Empty literals <code>[]</code> not allowed — use <code>ARR_NEW 0</code>. Heap: <strong>2 bytes per element</strong>. Arrays can be stored in r- or x-registers.</p>
<table class="tbl"><tr><th>Opcode</th><th>Syntax</th><th>Notes</th></tr>
<tr><td>SET</td><td><code>SET [1,2,3] &gt;&gt; d</code></td><td>Literal array — r or x dest</td></tr>
<tr><td>ARR_NEW</td><td><code>ARR_NEW size &gt;&gt; d</code></td><td>Zero-filled array</td></tr>
<tr><td>ARR_PUSH</td><td><code>ARR_PUSH arr val</code></td><td>Append val (arr can be x-reg)</td></tr>
<tr><td>ARR_POP</td><td><code>ARR_POP arr &gt;&gt; d</code></td><td>Remove last → d (0 if empty)</td></tr>
<tr><td>ARR_GET</td><td><code>ARR_GET arr idx &gt;&gt; d</code></td><td>Read at index</td></tr>
<tr><td>ARR_SET</td><td><code>ARR_SET arr idx val</code></td><td>Write at index</td></tr>
<tr><td>ARR_LEN</td><td><code>ARR_LEN arr &gt;&gt; d</code></td><td>Length → d</td></tr>
<tr><td>ARR_SORT</td><td><code>ARR_SORT arr</code></td><td>Sort ascending in-place</td></tr>
</table>
<div class="note">IF/UNTIL comparisons on arrays compare the <strong>sum of all elements</strong>.</div>
</div>
<div class="sec"><h3>EXAMPLE</h3>
<pre>SET [10,20,30] >> x0     // array in machine register
ARR_PUSH x0 40           // [10,20,30,40]
ARR_GET  x0 1 >> r0      // r0 = 20
ARR_SET  x0 0 99         // [99,20,30,40]
ARR_LEN  x0 >> r1        // r1 = 4
ARR_SORT x0              // [20,30,40,99]
PRINT x0
HALT</pre></div>`,

  flow: `<div class="sec">
<h3>LABELS &amp; JUMPS</h3>
<pre>POINT my_label   // declare a target
JUMP  my_label   // unconditional jump</pre>
</div>
<div class="sec">
<h3>CONDITIONALS</h3>
<pre>IF v1 op v2 >> label_true
IF v1 op v2 >> label_true ELSE label_false</pre>
<p>Operators: <code>==</code> <code>!=</code> <code>&lt;</code> <code>&gt;</code> <code>&lt;=</code> <code>&gt;=</code></p>
<p><code>==</code> / <code>!=</code> work on integers, strings, and arrays (by sum). Ordering works on integers and arrays (sum) — strings throw. False with no ELSE falls through.</p>
<p>Both r- and x-registers can appear on either side of the comparison.</p>
</div>
<div class="sec">
<h3>BLOCKING WAIT</h3>
<pre>UNTIL v1 op v2</pre>
<p>Stays on this instruction each cycle until condition is true. Useful for waiting on a peripheral to update an x-register.</p>
<pre>// Wait for a machine to finish (peripheral writes x0 each tick)
UNTIL x0 == 100
PRINT "done"
HALT</pre>
</div>
<div class="sec">
<h3>FUNCTIONS</h3>
<pre>CALL my_func  // push return addr, jump
RET           // pop return addr, jump back</pre>
<p>Full recursion up to configured stack depth (default 256).</p>
</div>`,

  examples: `<div class="sec"><h3>FIBONACCI</h3>
<pre>$a = r0  $b = r1  $tmp = r2  $n = r3  $i = r4

POINT main
SET 0 >> $a   SET 1 >> $b
SET 0 >> $tmp  SET 10 >> $n  SET 0 >> $i

POINT loop
IF $i >= $n >> done
PRINT $a
ADD $a $b >> $tmp
SET $b >> $a   SET $tmp >> $b
INC $i
JUMP loop
POINT done
HALT</pre></div>
<div class="sec"><h3>MACHINE MONITOR (x-registers)</h3>
<pre>// Peripheral writes machine state into x-registers each tick
// x0 = enabled flag, x1 = progress (0–100)
$enabled  = x0
$progress = x1

POINT poll
IF $enabled == 0 >> start
IF $progress == 100 >> done
JUMP poll

POINT start
MACH_SET "enabled" 1
JUMP poll

POINT done
MACH_SET "enabled" 0
HALT</pre></div>
<div class="sec"><h3>ARRAY SORT &amp; COMPARE</h3>
<pre>SET [5,1,9,3,7] >> r0
ARR_SORT r0
PRINT r0            // [1,3,5,7,9]
IF r0 > 20 >> big
PRINT "sum &lt;= 20"
HALT
POINT big
PRINT "sum > 20"
HALT</pre></div>
<div class="sec"><h3>CUSTOM PERIPHERAL</h3>
<pre>// Host JS:
vm.registerPeripheral("MATH_FAC", (vm, args) => {
const n = vm.fetchMemory(args[0]);
let r = 1;
for (let i = 2; i &lt;= n; i++) r *= i;
vm.setMemory(r, args[1]);
});

// PanSpark:
SET 7 >> r0
MATH_FAC r0 >> r1
PRINT r1   // 5040
HALT</pre></div>`,
};

// ════════════════════════════════════════════════════════
// ELEMENT REFS
// ════════════════════════════════════════════════════════
const codeEl = document.getElementById("code");
const gutterEl = document.getElementById("gutter");
const hllEl = document.getElementById("hll");
const ipbarEl = document.getElementById("ipbar");
const acEl = document.getElementById("ac");
const regsEl = document.getElementById("regs");
const regTabsEl = document.getElementById("reg-tabs");
const regBankLbl = document.getElementById("reg-bank-label");
const stkEl = document.getElementById("stk");
const outEl = document.getElementById("out");
const rpaneEl = document.getElementById("rpane");
const rtogEl = document.getElementById("rtog");
const spillEl = document.getElementById("spill");
const heapEl = document.getElementById("heap-info");
const ipvEl = document.getElementById("ipv");
const icntEl = document.getElementById("icnt");
const lcntEl = document.getElementById("lcnt");
const ocntEl = document.getElementById("ocnt");
const bcmp = document.getElementById("bcompile");
const brun = document.getElementById("brun");
const bstep = document.getElementById("bstep");
const bpause = document.getElementById("bpause");
const breset = document.getElementById("breset");
const speedEl = document.getElementById("speed");
const bdocs = document.getElementById("bdocs");
const dovEl = document.getElementById("dov");
const dbodyEl = document.getElementById("dbody");
const dcloseEl = document.getElementById("dclose");

// ════════════════════════════════════════════════════════
// RESPONSIVE METRICS
// ════════════════════════════════════════════════════════
function getMetrics() {
  const cs = getComputedStyle(document.documentElement);
  return {
    LH: parseInt(cs.getPropertyValue("--lh")) || 20,
    GW: parseInt(cs.getPropertyValue("--gw")) || 44,
    PAD: 10,
  };
}
let M = getMetrics();
window.addEventListener("resize", () => {
  M = getMetrics();
  updateIpBar();
});

// ════════════════════════════════════════════════════════
// SYNTAX HIGHLIGHTER
// ════════════════════════════════════════════════════════
const HL_OPS = new Set([
  "SET",
  "ADD",
  "SUB",
  "PRINT",
  "JUMP",
  "POINT",
  "CALL",
  "IF",
  "UNTIL",
  "HALT",
  "NOP",
  "RET",
  "MUL",
  "DIV",
  "MOD",
  "SQRT",
  "POW",
  "ABS",
  "MIN",
  "MAX",
  "INC",
  "DEC",
  "RNG",
  "ARR_NEW",
  "ARR_PUSH",
  "ARR_POP",
  "ARR_GET",
  "ARR_SET",
  "ARR_LEN",
  "ARR_SORT",
  "ELSE",
]);
const JMP_OPS = new Set(["JUMP", "CALL", "POINT"]);
function esc(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function hlLine(line) {
  const t = line.trimStart();
  const ind = esc(line.slice(0, line.length - t.length));
  if (!t) return "";
  if (t.startsWith("//")) return ind + `<span class="cmt">${esc(t)}</span>`;
  const dm = t.match(/^(\$\w+)(\s*=\s*)(\S+)(.*)$/);
  if (dm)
    return (
      ind +
      `<span class="sv">${esc(dm[1])}</span><span class="op">${esc(dm[2])}</span><span class="${dm[3].startsWith("x") ? "mreg" : "reg"}">${esc(dm[3])}</span>${dm[4] ? `<span class="cmt">${esc(dm[4])}</span>` : ""}`
    );
  let out = ind,
    rest = t,
    first = true,
    ajmp = false,
    aarr = false;
  while (rest.length) {
    const sm = rest.match(/^(\s+)/);
    if (sm) {
      out += esc(sm[1]);
      rest = rest.slice(sm[1].length);
      continue;
    }
    if (rest[0] === '"') {
      const e = rest.indexOf('"', 1);
      const s = e >= 0 ? rest.slice(0, e + 1) : rest;
      out += `<span class="str">${esc(s)}</span>`;
      rest = rest.slice(s.length);
      ajmp = aarr = false;
      first = false;
      continue;
    }
    if (rest[0] === "[") {
      const e = rest.indexOf("]");
      const s = e >= 0 ? rest.slice(0, e + 1) : rest;
      out += `<span class="arr">${esc(s)}</span>`;
      rest = rest.slice(s.length);
      ajmp = aarr = false;
      first = false;
      continue;
    }
    if (rest.startsWith(">>")) {
      out += `<span class="op">&gt;&gt;</span>`;
      rest = rest.slice(2);
      aarr = true;
      ajmp = false;
      first = false;
      continue;
    }
    if (
      rest.startsWith("==") ||
      rest.startsWith("!=") ||
      rest.startsWith("<=") ||
      rest.startsWith(">=")
    ) {
      out += `<span class="op">${esc(rest.slice(0, 2))}</span>`;
      rest = rest.slice(2);
      ajmp = aarr = false;
      first = false;
      continue;
    }
    if (rest[0] === "<" || rest[0] === ">") {
      out += `<span class="op">${esc(rest[0])}</span>`;
      rest = rest.slice(1);
      ajmp = aarr = false;
      first = false;
      continue;
    }
    const wm = rest.match(/^(\S+)/);
    if (!wm) break;
    const w = wm[1];
    rest = rest.slice(w.length);
    if (first) {
      out += HL_OPS.has(w)
        ? `<span class="kw">${esc(w)}</span>`
        : `<span class="dflt">${esc(w)}</span>`;
      ajmp = HL_OPS.has(w) && JMP_OPS.has(w);
      first = false;
      aarr = false;
      continue;
    }
    if (w === "ELSE") {
      out += `<span class="kw">${esc(w)}</span>`;
      ajmp = true;
      aarr = false;
      continue;
    }
    if (/^r\d+$/.test(w)) {
      out += `<span class="reg">${esc(w)}</span>`;
      ajmp = aarr = false;
      continue;
    }
    if (/^x\d+$/.test(w)) {
      out += `<span class="mreg">${esc(w)}</span>`;
      ajmp = aarr = false;
      continue;
    }
    if (w.startsWith("$")) {
      out += `<span class="sv">${esc(w)}</span>`;
      ajmp = aarr = false;
      continue;
    }
    if (/^-?\d+$/.test(w)) {
      out += `<span class="num">${esc(w)}</span>`;
      ajmp = aarr = false;
      continue;
    }
    if (ajmp || aarr) {
      out += `<span class="lbl">${esc(w)}</span>`;
      ajmp = aarr = false;
      continue;
    }
    out += `<span class="dflt">${esc(w)}</span>`;
    ajmp = aarr = false;
  }
  return out;
}
function renderHL() {
  const lines = codeEl.value.split("\n");
  hllEl.innerHTML = lines
    .map((l) => `<div class="hl">${hlLine(l)}</div>`)
    .join("");
}

// ════════════════════════════════════════════════════════
// GUTTER
// ════════════════════════════════════════════════════════
let gCount = 0,
  gActiveEl = null;
function renderGutter() {
  const n = codeEl.value.split("\n").length;
  if (n === gCount) return;
  const html = [];
  for (let i = 0; i < n; i++) html.push(`<span class="ln">${i + 1}</span>`);
  gutterEl.innerHTML = html.join("");
  gCount = n;
  gActiveEl = null;
}
function setGutterActive(idx) {
  if (gActiveEl) gActiveEl.classList.remove("aln");
  gActiveEl = gutterEl.children[idx] || null;
  if (gActiveEl) gActiveEl.classList.add("aln");
}

// ════════════════════════════════════════════════════════
// IP BAR
// ════════════════════════════════════════════════════════
function updateIpBar() {
  if (
    !compiled ||
    !vm.instrToSourceLine ||
    !vm.instrToSourceLine.length ||
    vm.activeInstructionPos >= vm.instrToSourceLine.length
  ) {
    ipbarEl.style.display = "none";
    if (gActiveEl) {
      gActiveEl.classList.remove("aln");
      gActiveEl = null;
    }
    return;
  }
  const src = vm.instrToSourceLine[vm.activeInstructionPos];
  ipbarEl.style.top = M.PAD + src * M.LH - codeEl.scrollTop + "px";
  ipbarEl.style.height = M.LH + "px";
  ipbarEl.style.display = "block";
  setGutterActive(src);
}

// ════════════════════════════════════════════════════════
// SCROLL SYNC
// ════════════════════════════════════════════════════════
function syncScroll() {
  hllEl.scrollTop = codeEl.scrollTop;
  hllEl.scrollLeft = codeEl.scrollLeft;
  gutterEl.scrollTop = codeEl.scrollTop;
  updateIpBar();
}
codeEl.addEventListener("scroll", syncScroll);

// ════════════════════════════════════════════════════════
// AUTOCOMPLETE  (desktop only)
// ════════════════════════════════════════════════════════
const ALL_OPS = [
  "SET",
  "ADD",
  "SUB",
  "PRINT",
  "JUMP",
  "POINT",
  "CALL",
  "IF",
  "UNTIL",
  "HALT",
  "NOP",
  "RET",
  "MUL",
  "DIV",
  "MOD",
  "SQRT",
  "POW",
  "ABS",
  "MIN",
  "MAX",
  "INC",
  "DEC",
  "RNG",
  "ARR_NEW",
  "ARR_PUSH",
  "ARR_POP",
  "ARR_GET",
  "ARR_SET",
  "ARR_LEN",
  "ARR_SORT",
];
const OP_HINT = {
  SET: "<val> >> dest",
  ADD: "a b >> dest",
  SUB: "a b >> dest",
  MUL: "a b >> dest",
  DIV: "a b >> dest",
  MOD: "a b >> dest",
  POW: "b e >> dest",
  SQRT: "a >> dest",
  ABS: "a >> dest",
  MIN: "a b >> dest",
  MAX: "a b >> dest",
  RNG: "min max >> dest",
  INC: "reg",
  DEC: "reg",
  PRINT: "<val>",
  NOP: "",
  HALT: "",
  JUMP: "label",
  POINT: "label",
  CALL: "label",
  RET: "",
  IF: "v op v >> lbl [ELSE lbl]",
  UNTIL: "v op v",
  ARR_NEW: "size >> dest",
  ARR_PUSH: "arr val",
  ARR_POP: "arr >> dest",
  ARR_GET: "arr idx >> dest",
  ARR_SET: "arr idx val",
  ARR_LEN: "arr >> dest",
  ARR_SORT: "arr",
};

let CHAR_W = 7.8;
document.fonts.ready.then(() => {
  const sp = document.createElement("span");
  Object.assign(sp.style, {
    position: "absolute",
    visibility: "hidden",
    font: '13px/1 "Share Tech Mono",monospace',
    whiteSpace: "pre",
  });
  sp.textContent = "x".repeat(100);
  document.body.appendChild(sp);
  CHAR_W = sp.offsetWidth / 100;
  document.body.removeChild(sp);
});

let acList = [],
  acSel = -1;
function isMobile() {
  return window.innerWidth <= 767;
}

function acGetPrefix() {
  if (isMobile()) return null;
  const pos = codeEl.selectionStart;
  const before = codeEl.value.slice(0, pos);
  const ls = before.lastIndexOf("\n") + 1;
  const ltext = before.slice(ls);
  const m = ltext.match(/^(\s*)([A-Z_]{1,12})$/);
  return m ? { pre: m[2], ind: m[1] } : null;
}
function acUpdate() {
  const info = acGetPrefix();
  if (!info) {
    acHide();
    return;
  }
  acList = ALL_OPS.filter((op) => op.startsWith(info.pre) && op !== info.pre);
  if (!acList.length) {
    acHide();
    return;
  }
  if (acSel >= acList.length) acSel = 0;
  if (acSel < 0) acSel = 0;
  acRender();
  const pos = codeEl.selectionStart;
  const lines = codeEl.value.slice(0, pos).split("\n");
  const row = lines.length - 1,
    col = lines[row].length;
  const left = M.GW + col * CHAR_W;
  const top = M.PAD + (row + 1) * M.LH - codeEl.scrollTop;
  acEl.style.left = Math.min(left, codeEl.clientWidth - 240) + "px";
  acEl.style.top = Math.min(Math.max(top, 0), codeEl.clientHeight - 30) + "px";
  acEl.classList.add("show");
}
function acHide() {
  acEl.classList.remove("show");
  acList = [];
  acSel = -1;
}
function acRender() {
  acEl.innerHTML = acList
    .map(
      (op, i) =>
        `<div class="aci${i === acSel ? " s" : ""}" data-i="${i}"><span class="aci-n">${op}</span><span class="aci-h">${OP_HINT[op] || ""}</span></div>`,
    )
    .join("");
}
function acAccept() {
  if (acSel < 0 || !acList.length) return;
  const info = acGetPrefix();
  if (!info) return;
  const op = acList[acSel];
  const pos = codeEl.selectionStart;
  const start = codeEl.value.lastIndexOf("\n", pos - 1) + 1 + info.ind.length;
  codeEl.value =
    codeEl.value.slice(0, start) + op + " " + codeEl.value.slice(pos);
  codeEl.selectionStart = codeEl.selectionEnd = start + op.length + 1;
  acHide();
  onInput();
}
acEl.addEventListener("mousedown", (e) => {
  e.preventDefault();
  const item = e.target.closest(".aci");
  if (item) {
    acSel = +item.dataset.i;
    acAccept();
  }
});

// ════════════════════════════════════════════════════════
// REGISTER BANK TAB  (desktop only)
// ════════════════════════════════════════════════════════
let activeBank = "r";

regTabsEl.querySelectorAll(".reg-tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    activeBank = tab.dataset.bank;
    regTabsEl
      .querySelectorAll(".reg-tab")
      .forEach((t) => t.classList.toggle("act", t.dataset.bank === activeBank));
    // Toggle between normal reg grid and MCU view
    const isMcu = activeBank === "mcu";
    document.getElementById("regs").style.display = isMcu ? "none" : "";
    document.getElementById("mcu-view").style.display = isMcu ? "" : "none";
    if (isMcu) {
      mcuMode = true;
      mcuApplyInputs();
      mcuUpdateOutputs();
      mcuRenderMini();
      regBankLbl.textContent = "";
    } else {
      mcuMode = false;
      renderRegs();
      regBankLbl.textContent =
        activeBank === "r"
          ? "r0–r" + (vm.registerMemoryLimit - 1)
          : "x0–x" + (vm.machineMemoryLimit - 1);
    }
  });
});

// ════════════════════════════════════════════════════════
// MOBILE DRAWER
// ════════════════════════════════════════════════════════

// mcuMode flag hoisted here so setMobTab can reference it
let mcuMode = false;

let mobOpen = true,
  mobActiveTab = "rs";

function setMobTab(name) {
  mobActiveTab = name;
  ["rs", "sk", "op"].forEach((id) =>
    document.getElementById(id).classList.toggle("mob-vis", id === name),
  );
  document
    .querySelectorAll(".rtab")
    .forEach((t) => t.classList.toggle("act", t.dataset.sect === name));
  if (!mobOpen) openDrawer();
  if (name === "op") outEl.scrollTop = outEl.scrollHeight;
}
function openDrawer() {
  mobOpen = true;
  rpaneEl.classList.remove("mob-collapsed");
  rtogEl.textContent = "▾";
}
function collapseDrawer() {
  mobOpen = false;
  rpaneEl.classList.add("mob-collapsed");
  rtogEl.textContent = "▴";
}
rtogEl.addEventListener("click", () =>
  mobOpen ? collapseDrawer() : openDrawer(),
);
document
  .querySelectorAll(".rtab")
  .forEach((t) => t.addEventListener("click", () => setMobTab(t.dataset.sect)));

function applyMobTabs() {
  if (isMobile()) setMobTab(mobActiveTab);
  else
    ["rs", "sk", "op"].forEach((id) =>
      document.getElementById(id).classList.remove("mob-vis"),
    );
}
window.addEventListener("resize", applyMobTabs);
applyMobTabs();

// ════════════════════════════════════════════════════════
// VM INSTANCE
// ════════════════════════════════════════════════════════
const vm = new VM(16, 16, 128, 1280);
let compiled = false,
  running = false,
  runTimer = null,
  prevRegs = [],
  prevMach = [],
  outLines = 0,
  runIterator = null;

// step() shim: advances the run generator one tick.
// Returns "halt" when execution is finished, "yield" otherwise.
function vmStep() {
  if (!runIterator) throw new Error("Not compiled");
  // In MCU mode, push current slider values into input registers before each step
  if (mcuMode) mcuApplyInputs();
  const result = runIterator.next();
  if (result.done) return "halt";
  return "yield";
}

// ════════════════════════════════════════════════════════
// UI HELPERS
// ════════════════════════════════════════════════════════
function onInput() {
  compiled = false;
  ipbarEl.style.display = "none";
  if (gActiveEl) {
    gActiveEl.classList.remove("aln");
    gActiveEl = null;
  }
  renderGutter();
  renderHL();
  syncScroll();
  lcntEl.textContent = codeEl.value.split("\n").length + " lines";
}

function renderRegs() {
  const mem = activeBank === "r" ? vm.registerMemory : vm.machineMemory;
  const prev = activeBank === "r" ? prevRegs : prevMach;
  const pfx = activeBank === "r" ? "r" : "x";
  regsEl.innerHTML = mem
    .map((rv, i) => {
      const ch = prev[i] && JSON.stringify(prev[i]) !== JSON.stringify(rv);
      const vs =
        rv.tag === "array" ? "[" + rv.data.join(",") + "]" : String(rv.data);
      const nc = activeBank === "x" ? " mn" : "";
      return `<div class="rr${ch ? " chg" : ""}"><span class="rn${nc}">${pfx}${i}</span><span class="rv" title="${vs}">${vs}</span><span class="rt">${rv.tag === "int" ? "INT" : rv.tag === "string" ? "STR" : "ARR"}</span></div>`;
    })
    .join("");
  // snapshot current state
  if (activeBank === "r")
    prevRegs = vm.registerMemory.map((r) => ({
      ...r,
      data: Array.isArray(r.data) ? [...r.data] : r.data,
    }));
  else
    prevMach = vm.machineMemory.map((r) => ({
      ...r,
      data: Array.isArray(r.data) ? [...r.data] : r.data,
    }));
}

function renderStack() {
  if (!vm.stackPointer) {
    stkEl.innerHTML =
      '<div class="ski sys" style="padding:4px 13px">— empty —</div>';
    return;
  }
  const h = [];
  for (let i = vm.stackPointer - 1; i >= 0; i--)
    h.push(
      `<div class="ski${i === vm.stackPointer - 1 ? " top" : ""}">→ addr:${vm.callStack[i]}</div>`,
    );
  stkEl.innerHTML = h.join("");
}

function addOutput(arr) {
  arr.forEach((v) => {
    const d = document.createElement("div");
    d.className = "ol";
    d.textContent = Array.isArray(v) ? "[" + v.join(",") + "]" : String(v);
    outEl.appendChild(d);
    outLines++;
  });
  // Drain buffer so it isn't re-rendered on the next call
  vm.outputBuffer = [];
  ocntEl.textContent = outLines + " lines";
  outEl.scrollTop = outEl.scrollHeight;
  if (isMobile() && mobActiveTab !== "op" && arr.length) {
    const tab = document.querySelector('[data-sect="op"]');
    if (tab) {
      tab.style.color = "var(--amber-bright)";
      setTimeout(() => (tab.style.color = ""), 800);
    }
  }
}

function addMsg(msg, err) {
  const d = document.createElement("div");
  d.className = "ol " + (err ? "err" : "sys");
  d.textContent = msg;
  outEl.appendChild(d);
  outLines++;
  ocntEl.textContent = outLines + " lines";
  outEl.scrollTop = outEl.scrollHeight;
}

function setStatus(s) {
  spillEl.className = "sp " + s;
  spillEl.textContent = s.toUpperCase();
}

function updateHUD() {
  heapEl.textContent = "HEAP: " + vm.heapUsed() + "/" + vm.heapLimit;
  ipvEl.textContent = compiled ? vm.activeInstructionPos : "—";
  icntEl.textContent = compiled ? vm.instructions.length : "—";
  updateIpBar();
  if (mcuMode) {
    mcuUpdateOutputs();
    mcuRenderMini();
  } else {
    renderRegs();
  }
  renderStack();
}

// ════════════════════════════════════════════════════════
// KEY EVENTS
// ════════════════════════════════════════════════════════
codeEl.addEventListener("keydown", (e) => {
  if (acEl.classList.contains("show")) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      acSel = (acSel + 1) % acList.length;
      acRender();
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      acSel = (acSel - 1 + acList.length) % acList.length;
      acRender();
      return;
    }
    if ((e.key === "Tab" || e.key === "Enter") && acList.length) {
      e.preventDefault();
      acAccept();
      return;
    }
    if (e.key === "Escape") {
      acHide();
      return;
    }
  }
  if (e.key === "Tab") {
    e.preventDefault();
    const s = codeEl.selectionStart;
    codeEl.value =
      codeEl.value.slice(0, s) + "  " + codeEl.value.slice(codeEl.selectionEnd);
    codeEl.selectionStart = codeEl.selectionEnd = s + 2;
    onInput();
  }
});
codeEl.addEventListener("input", () => {
  onInput();
  acUpdate();
});
document.addEventListener("click", (e) => {
  if (!acEl.contains(e.target) && e.target !== codeEl) acHide();
});
codeEl.addEventListener("blur", () => setTimeout(acHide, 120));

// ════════════════════════════════════════════════════════
// COMPILE / RUN / STEP
// ════════════════════════════════════════════════════════
bcmp.addEventListener("click", () => {
  stopRun();
  outEl.innerHTML = "";
  outLines = 0;
  ocntEl.textContent = "0 lines";
  prevRegs = [];
  prevMach = [];
  if (isMobile()) setMobTab("op");
  try {
    vm.instructions = [];
    vm.activeInstructionPos = 0;
    [...vm.compile(codeEl.value)];
    // Build a map from sanitized-line-index → original source line index.
    // Must mirror resolveVariables (drops $var decls) then compile sanitize
    // (drops blank lines and // comments) exactly as panspark.js does.
    const sourceLines = codeEl.value.split("\n");
    const sanitizedToSource = [];
    const postVarLines = []; // lines after variable resolution, with original index
    for (let i = 0; i < sourceLines.length; i++) {
      const trimmed = sourceLines[i].trimStart();
      if (/^\$\w+\s*=\s*\S+$/.test(trimmed)) continue; // var decl — dropped
      postVarLines.push({ src: i, text: trimmed });
    }
    for (const { src, text } of postVarLines) {
      if (!text || text.startsWith("//")) continue; // blank/comment — dropped
      sanitizedToSource.push(src);
    }
    vm.instrToSourceLine = vm.instructions.map(
      (instr) => sanitizedToSource[instr.line] ?? instr.line,
    );
    runIterator = vm.run();
    compiled = true;
    addMsg("✓ compiled " + vm.instructions.length + " instructions");
    setStatus("paused");
    brun.disabled = false;
    bstep.disabled = false;
    bpause.disabled = true;
    if (isMobile()) openDrawer();
    updateHUD();
  } catch (e) {
    compiled = false;
    addMsg("✗ " + e.message, true);
    setStatus("error");
    brun.disabled = true;
    bstep.disabled = true;
    bpause.disabled = true;
    updateHUD();
  }
});

bstep.addEventListener("click", () => {
  if (!compiled) return;
  if (isMobile() && mobActiveTab === "op") setMobTab("rs");
  try {
    const r = vmStep();
    addOutput(vm.outputBuffer);
    updateHUD();
    if (r === "halt") {
      addMsg("■ HALT");
      setStatus("done");
      brun.disabled = true;
      bstep.disabled = true;
      bpause.disabled = true;
    }
  } catch (e) {
    addMsg("✗ " + e.message, true);
    setStatus("error");
    stopRun();
    brun.disabled = true;
    bstep.disabled = true;
    bpause.disabled = true;
  }
});

function runLoop() {
  const raw = speedEl.value;

  // ── REALTIME: 1 op per tick, 20 ticks/sec = one step every 50 ms ──
  if (raw === "realtime") {
    try {
      const r = vmStep();
      addOutput(vm.outputBuffer);
      updateHUD();
      if (r === "halt") {
        addMsg("■ HALT");
        setStatus("done");
        running = false;
        brun.disabled = true;
        bstep.disabled = true;
        bpause.disabled = true;
      } else if (running) runTimer = setTimeout(runLoop, 50);
    } catch (e) {
      addMsg("✗ " + e.message, true);
      setStatus("error");
      running = false;
      brun.disabled = true;
      bstep.disabled = true;
      bpause.disabled = true;
    }
    return;
  }

  const delay = parseInt(raw);

  // ── MAX: tight loop, up to 100k steps per animation frame ────────
  if (delay === 0) {
    let s = 0;
    try {
      while (s++ < 100000) {
        const r = vmStep();
        addOutput(vm.outputBuffer);
        if (r === "halt") {
          addMsg("■ HALT");
          setStatus("done");
          running = false;
          brun.disabled = true;
          bstep.disabled = true;
          bpause.disabled = true;
          updateHUD();
          return;
        }
        if (r === "yield") break;
      }
      if (s >= 100000) addMsg("⚠ 100k step limit", true);
      updateHUD();
      if (running) runTimer = setTimeout(runLoop, 0);
    } catch (e) {
      addMsg("✗ " + e.message, true);
      setStatus("error");
      running = false;
      brun.disabled = true;
      bstep.disabled = true;
      bpause.disabled = true;
      updateHUD();
    }
  } else {
    // ── NORMAL / SLOW / CRAWL: one step per timer tick ───────────
    try {
      const r = vmStep();
      addOutput(vm.outputBuffer);
      updateHUD();
      if (r === "halt") {
        addMsg("■ HALT");
        setStatus("done");
        running = false;
        brun.disabled = true;
        bstep.disabled = true;
        bpause.disabled = true;
      } else if (running) runTimer = setTimeout(runLoop, delay);
    } catch (e) {
      addMsg("✗ " + e.message, true);
      setStatus("error");
      running = false;
      brun.disabled = true;
      bstep.disabled = true;
      bpause.disabled = true;
    }
  }
}
function stopRun() {
  if (runTimer) {
    clearTimeout(runTimer);
    runTimer = null;
  }
  running = false;
}

brun.addEventListener("click", () => {
  if (!compiled) return;
  running = true;
  setStatus("running");
  brun.disabled = true;
  bstep.disabled = true;
  bpause.disabled = false;
  if (isMobile()) setMobTab("op");
  runLoop();
});
bpause.addEventListener("click", () => {
  stopRun();
  setStatus("paused");
  brun.disabled = false;
  bstep.disabled = false;
  bpause.disabled = true;
});
breset.addEventListener("click", () => {
  stopRun();
  compiled = false;
  outEl.innerHTML = "";
  outLines = 0;
  ocntEl.textContent = "0 lines";
  prevRegs = [];
  prevMach = [];
  runIterator = null;
  vm.instructions = [];
  vm.instrToSourceLine = [];
  vm.activeInstructionPos = 0;
  vm.stackPointer = 0;
  vm.outputBuffer = [];
  vm.registerMemory = Array.from({ length: vm.registerMemoryLimit }, () => ({
    tag: "int",
    data: 0,
  }));
  vm.machineMemory = Array.from({ length: vm.machineMemoryLimit }, () => ({
    tag: "int",
    data: 0,
  }));
  // In MCU mode: re-apply number inputs to x4-x7, refresh display
  if (mcuMode) {
    mcuApplyInputs();
    mcuUpdateOutputs();
    mcuRenderMini();
  }
  setStatus("idle");
  brun.disabled = true;
  bstep.disabled = true;
  bpause.disabled = true;
  ipbarEl.style.display = "none";
  if (gActiveEl) {
    gActiveEl.classList.remove("aln");
    gActiveEl = null;
  }
  updateHUD();
});

// ════════════════════════════════════════════════════════
// DOCS
// ════════════════════════════════════════════════════════
let activeTab = "overview";
function openDoc(tab) {
  activeTab = tab || activeTab;
  dbodyEl.innerHTML = DOCS[activeTab] || "";
  document
    .querySelectorAll(".dtab")
    .forEach((t) => t.classList.toggle("act", t.dataset.tab === activeTab));
  dovEl.classList.add("open");
  bdocs.classList.add("bon");
}
function closeDoc() {
  dovEl.classList.remove("open");
  bdocs.classList.remove("bon");
}
bdocs.addEventListener("click", () =>
  dovEl.classList.contains("open") ? closeDoc() : openDoc(),
);
dcloseEl.addEventListener("click", closeDoc);
dovEl.addEventListener("click", (e) => {
  if (e.target === dovEl) closeDoc();
});
document
  .querySelectorAll(".dtab")
  .forEach((t) => t.addEventListener("click", () => openDoc(t.dataset.tab)));
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeDoc();
});

// ════════════════════════════════════════════════════════
// MCU SIMULATION MODE
// ════════════════════════════════════════════════════════
// Register mapping:
//   x0 = output FRONT  (digital: 0=off, ≥1=on)
//   x1 = output BACK
//   x2 = output LEFT
//   x3 = output RIGHT
//   x4 = input  FRONT  (analog 0–15, from top)
//   x5 = input  BACK   (analog 0–15, from bottom)
//   x6 = input  LEFT
//   x7 = input  RIGHT

// Number inputs for analog inputs
const mcuInputs = {
  front: document.getElementById("mcu-in-front"), // x4
  back: document.getElementById("mcu-in-back"), // x5
  left: document.getElementById("mcu-in-left"), // x6
  right: document.getElementById("mcu-in-right"), // x7
};

// Output wire zone elements — value-based glow driven by inline fill
const mcuWires = {
  front: document.getElementById("mcu-wire-front"), // x0 out
  back: document.getElementById("mcu-wire-back"), // x1 out
  left: document.getElementById("mcu-wire-left"), // x2 out
  right: document.getElementById("mcu-wire-right"), // x3 out
};

// FRONT=x4, BACK=x5, LEFT=x6, RIGHT=x7
const MCU_IN_DIRS = ["front", "back", "left", "right"];
const MCU_IN_REGS = [4, 5, 6, 7];
// FRONT=x0, BACK=x1, LEFT=x2, RIGHT=x3
const MCU_OUT_DIRS = ["front", "back", "left", "right"];
const MCU_OUT_REGS = [0, 1, 2, 3];

/** Clamp input value to 0–15 */
function mcuClamp(v) {
  const n = parseInt(v, 10);
  if (isNaN(n)) return 0;
  return Math.max(0, Math.min(15, n));
}

/**
 * Map a 0–15 analog level to fill color + drop-shadow for input wire display.
 * 0 = dark-but-visible red, 15 = max bright red glow.
 */
function mcuWireColor(val) {
  const v = Math.max(0, Math.min(15, val));
  // OFF: dark visible red base
  if (v === 0) return { fill: "#6b0a00", shadow: "none" };
  // Interpolate: #8a1200 at 1 → #ff2200 at 15
  const t = v / 15;
  const r = Math.round(138 + (255 - 138) * t);
  const g = Math.round(18 + (34 - 18) * t);
  const fill = `rgb(${r},${g},0)`;
  const glowA = (0.4 + 0.45 * t).toFixed(2);
  const blur1 = Math.round(3 + 5 * t);
  const blur2 = Math.round(7 + 10 * t);
  const shadow = `drop-shadow(0 0 ${blur1}px rgba(255,40,0,0.85)) drop-shadow(0 0 ${blur2}px rgba(255,20,0,${glowA}))`;
  return { fill, shadow };
}

/** OFF color for output wires (digital, no signal) */
const MCU_WIRE_OFF = { fill: "#6b0a00", shadow: "none" };
/** ON color for output wires — always max redstone (level 15) */
const MCU_WIRE_ON = mcuWireColor(15);

/** Apply color to a wire zone's SVG rect */
function mcuSetWireColor(zoneEl, val) {
  const rect = zoneEl.querySelector(".rs-wire");
  if (!rect) return;
  const { fill, shadow } = mcuWireColor(val);
  rect.style.fill = fill;
  rect.style.filter = shadow === "none" ? "" : shadow;
}

/** Apply ON/OFF (digital) color to an output wire zone */
function mcuSetWireDigital(zoneEl, on) {
  const rect = zoneEl.querySelector(".rs-wire");
  if (!rect) return;
  const c = on ? MCU_WIRE_ON : MCU_WIRE_OFF;
  rect.style.fill = c.fill;
  rect.style.filter = c.shadow === "none" ? "" : c.shadow;
}

/** Push current number-input values into VM x4–x7 */
function mcuApplyInputs() {
  MCU_IN_DIRS.forEach((dir, i) => {
    const val = mcuClamp(mcuInputs[dir].value);
    vm.machineMemory[MCU_IN_REGS[i]] = { tag: "int", data: val };
  });
}

/** Read VM x0–x3 → update output wire digital ON/OFF (full glow or dark) */
function mcuUpdateOutputs() {
  MCU_OUT_DIRS.forEach((dir, i) => {
    const outReg = vm.machineMemory[MCU_OUT_REGS[i]];
    const on = outReg && typeof outReg.data === "number" && outReg.data > 0;
    if (on) {
      // Output is active — show full digital glow (overrides input)
      mcuSetWireDigital(mcuWires[dir], true);
    } else {
      // Output is OFF — show input analog glow instead
      const inIdx = MCU_IN_DIRS.indexOf(dir);
      const inReg = inIdx >= 0 ? vm.machineMemory[MCU_IN_REGS[inIdx]] : null;
      const inVal = inReg && typeof inReg.data === "number" ? inReg.data : 0;
      mcuSetWireColor(mcuWires[dir], inVal);
    }
  });
}

/** Update all side register value spans and row highlight classes */
function mcuRenderMini() {
  // x0–x3 = outputs, x4–x7 = inputs
  for (let i = 0; i < 8; i++) {
    const reg = vm.machineMemory[i] || { tag: "int", data: 0 };
    const vs = reg.tag === "array" ? "[…]" : String(reg.data);
    const valEl = document.getElementById(`mcu-rmv-x${i}`);
    const rowEl = document.getElementById(`mcu-rm-x${i}`);
    if (valEl) valEl.textContent = vs;
    if (rowEl && i < 4) {
      const on = typeof reg.data === "number" && reg.data > 0;
      rowEl.classList.toggle("active", on);
    }
  }
}

// Wire number inputs → VM registers + refresh display unconditionally
Object.entries(mcuInputs).forEach(([dir, el]) => {
  const idx = MCU_IN_DIRS.indexOf(dir);
  const handler = () => {
    const clamped = mcuClamp(el.value);
    if (idx >= 0) {
      vm.machineMemory[MCU_IN_REGS[idx]] = { tag: "int", data: clamped };
      // Update the wire glow for this input side (analog 0–15)
      if (mcuWires[dir]) mcuSetWireColor(mcuWires[dir], clamped);
    }
    mcuRenderMini();
    mcuUpdateOutputs();
  };
  el.addEventListener("input", handler);
  el.addEventListener("change", handler);
});

// ════════════════════════════════════════════════════════
// INIT
// ════════════════════════════════════════════════════════
regBankLbl.textContent = "r0–r" + (vm.registerMemoryLimit - 1);
renderGutter();
renderHL();
renderRegs();
renderStack();
lcntEl.textContent = codeEl.value.split("\n").length + " lines";
