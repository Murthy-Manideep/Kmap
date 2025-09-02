const grayOrder = n => {
  const res = [];
  for (let i = 0; i < (1 << n); i++) res.push(i ^ (i >> 1));
  return res;
};

const toBits = (x, n) => x.toString(2).padStart(n, '0');
const bitCount = x => x.toString(2).split('').filter(c => c === '1').length;
const varsForN = n => ['A', 'B', 'C', 'D', 'E'].slice(0, n);

let N = 3;
let truth = [];
const ttDiv = document.getElementById('tt');
const kmapDiv = document.getElementById('kmap');
const sopSpan = document.getElementById('sop');
const verilogPre = document.getElementById('verilog');
const testbenchPre = document.getElementById('testbench');

function initTruth() {
  truth = Array(1 << N).fill(0);
}
function cycle(val) { return val === 0 ? 1 : (val === 1 ? 'X' : 0); }

/*Truth Table*/
function renderTruthTable() {
  const headers = varsForN(N).concat(['F']);
  let html = '<table><thead><tr>';
  headers.forEach(h => html += `<th>${h}</th>`);
  html += '</tr></thead><tbody>';
  for (let i = 0; i < (1 << N); i++) {
    const bits = toBits(i, N).split('');
    html += '<tr>';
    bits.forEach(b => html += `<td>${b}</td>`);
    html += `<td class="cell" data-idx="${i}">${truth[i]}</td>`;
    html += '</tr>';
  }
  html += '</tbody></table>';
  ttDiv.innerHTML = html;
  ttDiv.querySelectorAll('.cell').forEach(td => {
    td.onclick = () => {
      const idx = +td.dataset.idx;
      truth[idx] = cycle(truth[idx]);
      td.textContent = truth[idx];
      drawKmap();
    };
  });
}

/*K-Map (2–5 vars)*/
function renderKmap() {
  if (N <= 4) {
    renderStandardKmap(N, kmapDiv, null);
    return;
  }
  kmapDiv.innerHTML = '';
  const plane0 = document.createElement('div');
  const plane1 = document.createElement('div');
  plane0.innerHTML = `<div style="font-weight:600;margin-bottom:6px;">E = 0</div>`; 
  plane1.innerHTML = `<div style="font-weight:600;margin-bottom:6px;">E = 1</div>`;
  plane0.className = 'plane';
  plane1.className = 'plane';
  renderStandardKmap(4, plane0, 0);
  renderStandardKmap(4, plane1, 1);
  kmapDiv.appendChild(plane0);
  kmapDiv.appendChild(plane1);
}

function renderStandardKmap(displayN, container, planeE) {
  const n = displayN;
  let rowBits, colBits;
  if (n === 2) { rowBits = 1; colBits = 1; }
  else if (n === 3) { rowBits = 2; colBits = 1; }
  else { rowBits = 2; colBits = 2; }

  const rowOrder = grayOrder(rowBits);
  const colOrder = grayOrder(colBits);
  const rowLabels = rowOrder.map(i => toBits(i, rowBits));
  const colLabels = colOrder.map(i => toBits(i, colBits));

  // variable groupings for labeling
  let rowVars = [], colVars = [];
  if (n === 2) { rowVars = ['A']; colVars = ['B']; }
  else if (n === 3) { rowVars = ['A','B']; colVars = ['C']; }
  else if (n === 4) { rowVars = ['A','B']; colVars = ['C','D']; }
  else if (N === 5 && displayN === 4) { rowVars = ['A','B']; colVars = ['C','D']; }

  function cellIndexForDisplay(r, c) {
    const rowVal = rowOrder[r];
    const colVal = colOrder[c];
    if (N === 2) {
      const A = rowVal & 1, B = colVal & 1;
      return (A << 1) | B;
    } else if (N === 3) {
      const AB = rowVal & 3, C = colVal & 1;
      return (AB << 1) | C;
    } else if (N === 4 && displayN === 4) {
      const AB = rowVal & 3, CD = colVal & 3;
      return (AB << 2) | CD;
    } else if (N === 5 && displayN === 4) {
      const AB = rowVal & 3, CD = colVal & 3;
      return (AB << 3) | (CD << 1) | (planeE ? 1 : 0);
    } else {
      const bits = (rowVal << colBits) | colVal;
      return bits;
    }
  }

  let html = `<table>
    <thead>
      <tr>
        <th>${rowVars.join('')}</th>`;
  colLabels.forEach(l => html += `<th>${l}</th>`);
  html += `</tr>
      <tr>
        <th></th><th colspan="${colLabels.length}">${colVars.join('')}</th>
      </tr>
    </thead>
    <tbody>`;
  for (let r = 0; r < rowOrder.length; r++) {
    html += `<tr><th>${rowLabels[r]}</th>`;
    for (let c = 0; c < colOrder.length; c++) {
      const idx = cellIndexForDisplay(r, c);
      html += `<td class="cell" data-idx="${idx}">${truth[idx]}</td>`;
    }
    html += '</tr>';
  }
  html += '</tbody></table>';

  if (container === kmapDiv) container.innerHTML = html;
  else container.innerHTML += html;

  container.querySelectorAll('.cell').forEach(td => {
    td.onclick = () => {
      const idx = +td.dataset.idx;
      if (idx < 0 || idx >= truth.length) return;
      truth[idx] = cycle(truth[idx]);
      renderTruthTable();
      renderKmap();
    };
  });
}

function drawKmap() { renderKmap(); }

/*Quine–McCluskey simplifier (works for up to 5 vars)*/
function qmSimplifySOP(n, truthArr) {
  const ones = [], dcs = [];
  for (let i = 0; i < truthArr.length; i++) {
    if (truthArr[i] === 1) ones.push(i);
    else if (truthArr[i] === 'X') dcs.push(i);
  }
  if (ones.length === 0) return '0';
  if (ones.length + dcs.length === (1 << n)) return '1';

  function combine(a, b) {
    let diff = 0, out = '';
    for (let i = 0; i < a.length; i++) {
      if (a[i] === b[i]) out += a[i];
      else if (a[i] !== '-' && b[i] !== '-') { diff++; out += '-'; }
      else return null;
      if (diff > 1) return null;
    }
    return diff === 1 ? out : null;
  }

  const allIndices = ones.concat(dcs);
  let groups = {};
  const allTerms = allIndices.map(i => ({ bits: toBits(i, n), from: new Set([i]) }));
  for (const t of allTerms) {
    const k = bitCount(parseInt(t.bits.replace(/-/g, '0'), 2));
    (groups[k] ||= []).push(t);
  }

  const prime = [];
  let current = groups;
  while (true) {
    const next = {};
    const used = new Set();
    const keys = Object.keys(current).map(Number).sort((a, b) => a - b);
    for (let gi = 0; gi < keys.length - 1; gi++) {
      const a = current[keys[gi]] || [], b = current[keys[gi + 1]] || [];
      for (const ta of a) {
        for (const tb of b) {
          const comb = combine(ta.bits, tb.bits);
          if (comb) {
            const from = new Set([...ta.from, ...tb.from]);
            const key = comb.split('').filter(x => x === '1').length;
            const rec = { bits: comb, from };
            const arr = next[key] ||= [];
            if (!arr.some(x => x.bits === rec.bits && setEq(x.from, rec.from))) arr.push(rec);
            used.add(ta); used.add(tb);
          }
        }
      }
    }
    for (const k of keys) {
      for (const t of current[k]) {
        if (!used.has(t)) prime.push(t);
      }
    }
    if (Object.keys(next).length === 0) break;
    current = next;
  }

  const coverMap = new Map();
  const primes = uniqueBy(prime, p => p.bits + '|' + [...p.from].sort().join(','));
  primes.forEach((p, pi) => {
    for (const m of p.from) {
      if (ones.includes(m)) {
        const arr = coverMap.get(m) || [];
        arr.push(pi);
        coverMap.set(m, arr);
      }
    }
  });

  const selected = new Set();
  const covered = new Set();
  for (const [m, arr] of coverMap.entries()) {
    if (arr.length === 1) selected.add(arr[0]);
  }
  function markCovered(pi) {
    for (const m of primes[pi].from) if (ones.includes(m)) covered.add(m);
  }
  selected.forEach(pi => markCovered(pi));

  while (covered.size < ones.length) {
    let best = -1, bestCovers = -1;
    for (let pi = 0; pi < primes.length; pi++) {
      if (selected.has(pi)) continue;
      let cnt = 0;
      for (const m of primes[pi].from) if (ones.includes(m) && !covered.has(m)) cnt++;
      if (cnt > bestCovers) { bestCovers = cnt; best = pi; }
    }
    if (best === -1) break;
    selected.add(best);
    markCovered(best);
  }

  const v = varsForN(n);
  const terms = [...selected].map(pi => {
    const bits = primes[pi].bits;
    let t = '';
    for (let i = 0; i < bits.length; i++) {
      if (bits[i] === '-') continue;
      t += (bits[i] === '1') ? v[i] : (v[i] + "'");
    }
    return t || '1';
  });

  return [...new Set(terms)].join(' + ');

  function setEq(a, b) { if (a.size !== b.size) return false; for (const x of a) if (!b.has(x)) return false; return true; }
  function uniqueBy(arr, keyFn) { const seen = new Set(); const out = []; for (const x of arr) { const k = keyFn(x); if (!seen.has(k)) { seen.add(k); out.push(x); } } return out; }
}

/*Verilog Generation*/
function sopToVerilog(expr) {
  expr = String(expr).trim();
  if (expr === '0') return "1'b0";
  if (expr === '1') return "1'b1";

  const terms = expr.split(/\s*\+\s*/).map(t => t.trim()).filter(t => t.length);
  const verilogTerms = terms.map(term => {
    const tokens = term.match(/[A-E]('?)/g) || [];
    const lits = tokens.map(tok => {
      if (tok.endsWith("'")) return `~${tok[0]}`;
      return `${tok}`;
    });
    if (lits.length === 0) return "1'b1";
    return '(' + lits.join(' & ') + ')';
  });
  return verilogTerms.join(' | ');
}

function generateVerilogModule(expr) {
  const vars = varsForN(N);
  const inputList = vars.join(', ');
  const verExpr = sopToVerilog(expr);
  return `
module kmap(${inputList}, F);
  input ${inputList};
  output F;

  assign F = ${verExpr};
endmodule`;
}

/*Verilog Testbench*/
function generateTestbench() {
  const vars = varsForN(N);
  const regDecl = `reg ${vars.join(', ')};`;
  const wireDecl = `wire F;`;
  const instList = vars.join(', ') + ', F';
  const combos = 1 << N;

  const fmtParts = vars.map(v => '%b').join(' ') + ' | %b';
  const args = vars.concat(['F']).join(', ');
  const assigns = [];
  for (let i = 0; i < combos; i++) {
    const b = toBits(i, N);
    assigns.push(`    #10 {${vars.join(',')}} = ${N}'b${b}; // ${b}`);
  }

  return `
module tb_kmap;
  ${regDecl}
  ${wireDecl}

  kmap uut (${instList});

  initial begin
    $display("${vars.join(' ')} | F");
    $monitor("${fmtParts}", ${args});

${assigns.join('\n')}
    #10 $finish;
  end
endmodule`;
}

function syncAll() {
  renderTruthTable();
  renderKmap();
  sopSpan.textContent = '';
  verilogPre.textContent = '';
  testbenchPre.textContent = '';
}
function solve() {
  const expr = qmSimplifySOP(N, truth);
  sopSpan.textContent = expr;
  verilogPre.textContent = generateVerilogModule(expr);
  testbenchPre.textContent = generateTestbench();
}

document.getElementById('vars').onchange = e => { N = +e.target.value; initTruth(); syncAll(); };
document.getElementById('all0').onclick = () => { truth.fill(0); syncAll(); };
document.getElementById('all1').onclick = () => { truth.fill(1); syncAll(); };
document.getElementById('rand').onclick = () => {
  for (let i = 0; i < truth.length; i++) {
    const r = Math.random();
    truth[i] = r < 0.45 ? 0 : (r < 0.9 ? 1 : 'X');
  }
  syncAll();
};
document.getElementById('solve').onclick = solve;

initTruth();
syncAll();
