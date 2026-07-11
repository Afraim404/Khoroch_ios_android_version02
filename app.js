(() => {
"use strict";

/* ---------------- Default categories & income sources ---------------- */
const CATEGORIES = [
  { key:"Food",          emoji:"🍜", color:"#D4A24E" },
  { key:"Transport",     emoji:"🛺", color:"#3E8E7E" },
  { key:"Bills",         emoji:"🧾", color:"#6C7A8C" },
  { key:"Shopping",      emoji:"🛍", color:"#B87FA3" },
  { key:"Health",        emoji:"💊", color:"#6FA8DC" },
  { key:"Entertainment", emoji:"🎬", color:"#E0A96D" },
  { key:"Education",     emoji:"📚", color:"#7FB37F" },
  { key:"Other",         emoji:"✳️", color:"#9A8C78" },
];
const INCOME_SOURCES = [
  { key:"Salary",       emoji:"💼", color:"#6FA8DC" },
  { key:"Freelance",    emoji:"💻", color:"#7FB37F" },
  { key:"Allowance",    emoji:"🎁", color:"#D4A24E" },
  { key:"Scholarship",  emoji:"🎓", color:"#B87FA3" },
  { key:"Business",     emoji:"🏪", color:"#E0A96D" },
  { key:"Other",        emoji:"➕", color:"#9A8C78" },
];
const EMOJI_CHOICES = ["🏷️","🍕","🎮","📱","✈️","🏠","🐾","👕","💇","🎁","🚗","📖","⚡","💡","🧴","🎵","💼","💻","🎓","🏪","🍎","☕","🎨","🧾"];
const SWATCH_CHOICES = ["#D4A24E","#3E8E7E","#6C7A8C","#B87FA3","#6FA8DC","#E0A96D","#7FB37F","#9A8C78","#C9584A","#8E7CC3","#5FAE72","#4FA3C7"];

/* ---------------- Storage ---------------- */
const LS = {
  entries:"khoroch_entries",
  income:"khoroch_income",
  budgets:"khoroch_budgets",
  catBudgets:"khoroch_catbudgets",
  customCats:"khoroch_customcats",
  customSources:"khoroch_customsources",
};
function load(key, fallback){
  try { const v = JSON.parse(localStorage.getItem(key)); return v == null ? fallback : v; }
  catch { return fallback; }
}
function save(key, val){ localStorage.setItem(key, JSON.stringify(val)); }

let entries = load(LS.entries, []);
let income = load(LS.income, []);
let budgets = load(LS.budgets, {});
let catBudgets = load(LS.catBudgets, {});
let customCats = load(LS.customCats, []);
let customSources = load(LS.customSources, []);

function getCats(){ return CATEGORIES.concat(customCats); }
function getSources(){ return INCOME_SOURCES.concat(customSources); }
function findCat(key){ return getCats().find(c => c.key === key) || { key, emoji:"🏷️", color:"#9A8C78" }; }
function findSource(key){ return getSources().find(c => c.key === key) || { key, emoji:"💰", color:"#9A8C78" }; }
function isCustomCatName(key){ return customCats.some(c => c.key === key); }
function isCustomSourceName(key){ return customSources.some(c => c.key === key); }

/* ---------------- State ---------------- */
const today = new Date();
let viewMonth = today.getMonth();
let viewYear = today.getFullYear();
let selectedCat = "Food";
let selectedSource = "Salary";
let activeTab = "expenses";
let newTagContext = "category"; // 'category' | 'source'
let newTagOrigin = "add";       // 'add' | 'export'
let newTagEmoji = EMOJI_CHOICES[0];
let newTagColor = SWATCH_CHOICES[0];

const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function ym(y,m){ return `${y}-${String(m+1).padStart(2,"0")}`; }
function fmt(n){ return Number(n).toLocaleString("en-US", { maximumFractionDigits: 2 }); }
function uid(){ return Date.now().toString(36) + Math.random().toString(36).slice(2,7); }

/* ---------------- DOM refs ---------------- */
const $ = (sel) => document.querySelector(sel);
const monthLabel = $("#monthLabel");
const entriesList = $("#entriesList");
const incomeList = $("#incomeList");
const toastEl = $("#toast");

/* ---------------- Toast ---------------- */
let toastTimer;
function toast(msg){
  toastEl.textContent = msg;
  toastEl.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove("show"), 2200);
}

/* ---------------- Month navigation ---------------- */
$("#prevMonth").addEventListener("click", () => { viewMonth--; if(viewMonth<0){viewMonth=11; viewYear--;} render(); });
$("#nextMonth").addEventListener("click", () => { viewMonth++; if(viewMonth>11){viewMonth=0; viewYear++;} render(); });

/* ---------------- Tabs ---------------- */
const fab = $("#fabAdd");
document.querySelectorAll(".tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    document.querySelectorAll(".panel").forEach(p => p.classList.remove("active"));
    tab.classList.add("active");
    activeTab = tab.dataset.tab;
    $("#panel-" + activeTab).classList.add("active");
    updateFab();
    if(activeTab === "insights") renderInsights();
    if(activeTab === "export") renderExportPanel();
  });
});

function updateFab(){
  if(activeTab === "expenses"){
    fab.classList.remove("hidden","income-mode");
    fab.setAttribute("aria-label","Add expense");
  } else if(activeTab === "income"){
    fab.classList.remove("hidden");
    fab.classList.add("income-mode");
    fab.setAttribute("aria-label","Add income");
  } else {
    fab.classList.add("hidden");
  }
}

/* ---------------- Category / source grids ---------------- */
function renderCatGrid(){
  const grid = $("#catGrid");
  grid.innerHTML = "";
  getCats().forEach(c => {
    const el = document.createElement("div");
    el.className = "cat-pick" + (c.key === selectedCat ? " sel" : "");
    el.dataset.key = c.key;
    el.innerHTML = `<span class="em">${c.emoji}</span>${c.key}`;
    el.addEventListener("click", () => {
      selectedCat = c.key;
      grid.querySelectorAll(".cat-pick").forEach(p => p.classList.remove("sel"));
      el.classList.add("sel");
    });
    grid.appendChild(el);
  });
  const addTile = document.createElement("div");
  addTile.className = "cat-pick add-new";
  addTile.innerHTML = `<span class="em">＋</span>New`;
  addTile.addEventListener("click", () => openNewTagSheet("category","add"));
  grid.appendChild(addTile);
}

function renderSourceGrid(){
  const grid = $("#sourceGrid");
  grid.innerHTML = "";
  getSources().forEach(c => {
    const el = document.createElement("div");
    el.className = "cat-pick" + (c.key === selectedSource ? " sel" : "");
    el.dataset.key = c.key;
    el.innerHTML = `<span class="em">${c.emoji}</span>${c.key}`;
    el.addEventListener("click", () => {
      selectedSource = c.key;
      grid.querySelectorAll(".cat-pick").forEach(p => p.classList.remove("sel"));
      el.classList.add("sel");
    });
    grid.appendChild(el);
  });
  const addTile = document.createElement("div");
  addTile.className = "cat-pick add-new";
  addTile.innerHTML = `<span class="em">＋</span>New`;
  addTile.addEventListener("click", () => openNewTagSheet("source","add"));
  grid.appendChild(addTile);
}

/* ---------------- Sheets ---------------- */
const sheetBackdrop = $("#sheetBackdrop");
const addSheet = $("#addSheet");
const incomeSheet = $("#incomeSheet");
const budgetSheet = $("#budgetSheet");
const newTagSheet = $("#newTagSheet");

function openSheet(sheet){
  sheetBackdrop.classList.add("open");
  sheet.classList.add("open");
}
function closeSheets(){
  sheetBackdrop.classList.remove("open");
  [addSheet, incomeSheet, budgetSheet, newTagSheet].forEach(s => s.classList.remove("open"));
}
sheetBackdrop.addEventListener("click", closeSheets);

function defaultDateFor(y,m){
  const lastDay = new Date(y, m+1, 0).getDate();
  if(y === today.getFullYear() && m === today.getMonth()) return today.toISOString().slice(0,10);
  return new Date(y, m, Math.min(today.getDate(), lastDay)).toISOString().slice(0,10);
}

fab.addEventListener("click", () => {
  if(activeTab === "income"){
    $("#incAmtInput").value = "";
    $("#incNoteInput").value = "";
    $("#incDateInput").value = defaultDateFor(viewYear, viewMonth);
    openSheet(incomeSheet);
    setTimeout(() => $("#incAmtInput").focus(), 150);
  } else {
    $("#amtInput").value = "";
    $("#noteInput").value = "";
    $("#dateInput").value = defaultDateFor(viewYear, viewMonth);
    openSheet(addSheet);
    setTimeout(() => $("#amtInput").focus(), 150);
  }
});
$("#cancelAdd").addEventListener("click", closeSheets);
$("#cancelIncome").addEventListener("click", closeSheets);

$("#saveAdd").addEventListener("click", () => {
  const amount = parseFloat($("#amtInput").value);
  if(!amount || amount <= 0){ toast("Enter a valid amount"); return; }
  const date = $("#dateInput").value || today.toISOString().slice(0,10);
  const note = $("#noteInput").value.trim();
  entries.push({ id: uid(), amount, category: selectedCat, note, date, createdAt: Date.now() });
  save(LS.entries, entries);
  closeSheets();
  toast("Expense added");
  const d = new Date(date);
  viewYear = d.getFullYear(); viewMonth = d.getMonth();
  render();
});

$("#saveIncome").addEventListener("click", () => {
  const amount = parseFloat($("#incAmtInput").value);
  if(!amount || amount <= 0){ toast("Enter a valid amount"); return; }
  const date = $("#incDateInput").value || today.toISOString().slice(0,10);
  const note = $("#incNoteInput").value.trim();
  income.push({ id: uid(), amount, source: selectedSource, note, date, createdAt: Date.now() });
  save(LS.income, income);
  closeSheets();
  toast("Income added");
  const d = new Date(date);
  viewYear = d.getFullYear(); viewMonth = d.getMonth();
  render();
});

/* ---------------- New category / source sheet ---------------- */
function openNewTagSheet(context, origin){
  newTagContext = context;
  newTagOrigin = origin;
  $("#newTagTitle").textContent = context === "category" ? "New category" : "New income source";
  $("#newTagName").value = "";
  newTagEmoji = EMOJI_CHOICES[0];
  newTagColor = context === "category" ? SWATCH_CHOICES[0] : "#5FAE72";
  renderEmojiGrid();
  renderSwatchGrid();
  openSheet(newTagSheet);
  setTimeout(() => $("#newTagName").focus(), 150);
}
function renderEmojiGrid(){
  const grid = $("#newTagEmojiGrid");
  grid.innerHTML = "";
  EMOJI_CHOICES.forEach(em => {
    const el = document.createElement("div");
    el.className = "emoji-pick" + (em === newTagEmoji ? " sel" : "");
    el.textContent = em;
    el.addEventListener("click", () => {
      newTagEmoji = em;
      grid.querySelectorAll(".emoji-pick").forEach(p => p.classList.remove("sel"));
      el.classList.add("sel");
    });
    grid.appendChild(el);
  });
}
function renderSwatchGrid(){
  const grid = $("#newTagSwatchGrid");
  grid.innerHTML = "";
  SWATCH_CHOICES.forEach(color => {
    const el = document.createElement("div");
    el.className = "swatch" + (color === newTagColor ? " sel" : "");
    el.style.background = color;
    el.style.color = color;
    el.addEventListener("click", () => {
      newTagColor = color;
      grid.querySelectorAll(".swatch").forEach(p => p.classList.remove("sel"));
      el.classList.add("sel");
    });
    grid.appendChild(el);
  });
}
$("#cancelNewTag").addEventListener("click", () => {
  closeSheets();
  if(newTagOrigin === "add"){
    openSheet(newTagContext === "category" ? addSheet : incomeSheet);
  }
});
$("#saveNewTag").addEventListener("click", () => {
  const name = $("#newTagName").value.trim();
  if(!name){ toast("Enter a name"); return; }
  const existing = newTagContext === "category" ? getCats() : getSources();
  if(existing.some(c => c.key.toLowerCase() === name.toLowerCase())){ toast("That name already exists"); return; }

  const tag = { key:name, emoji:newTagEmoji, color:newTagColor };
  if(newTagContext === "category"){
    customCats.push(tag);
    save(LS.customCats, customCats);
    selectedCat = name;
    renderCatGrid();
  } else {
    customSources.push(tag);
    save(LS.customSources, customSources);
    selectedSource = name;
    renderSourceGrid();
  }
  closeSheets();
  toast((newTagContext === "category" ? "Category" : "Income source") + " added");
  if(newTagOrigin === "add"){
    openSheet(newTagContext === "category" ? addSheet : incomeSheet);
  } else {
    renderExportPanel();
  }
});

/* ---------------- Budget sheet ---------------- */
$("#setBudgetBtn").addEventListener("click", () => {
  $("#budgetMonthLabel").textContent = `${MONTH_NAMES[viewMonth]} ${viewYear}`;
  $("#budgetInput").value = budgets[ym(viewYear, viewMonth)] || "";
  openSheet(budgetSheet);
});
$("#cancelBudget").addEventListener("click", closeSheets);
$("#saveBudget").addEventListener("click", () => {
  const val = parseFloat($("#budgetInput").value);
  const key = ym(viewYear, viewMonth);
  if(val && val > 0) budgets[key] = val; else delete budgets[key];
  save(LS.budgets, budgets);
  closeSheets();
  render();
});

/* ---------------- Derived data ---------------- */
function entriesForMonth(y, m){
  const prefix = ym(y, m);
  return entries.filter(e => e.date.startsWith(prefix));
}
function incomeForMonth(y, m){
  const prefix = ym(y, m);
  return income.filter(e => e.date.startsWith(prefix));
}
function monthTotal(y, m){ return entriesForMonth(y, m).reduce((s,e) => s + e.amount, 0); }
function monthIncomeTotal(y, m){ return incomeForMonth(y, m).reduce((s,e) => s + e.amount, 0); }
function categoryTotals(y, m){
  const totals = {};
  getCats().forEach(c => totals[c.key] = 0);
  entriesForMonth(y, m).forEach(e => { totals[e.category] = (totals[e.category]||0) + e.amount; });
  return totals;
}

/* ---------------- Render: balance row ---------------- */
function renderBalanceRow(){
  const inc = monthIncomeTotal(viewYear, viewMonth);
  const exp = monthTotal(viewYear, viewMonth);
  const net = inc - exp;
  $("#statIncome").textContent = "৳" + fmt(inc);
  $("#statExpense").textContent = "৳" + fmt(exp);
  const netEl = $("#statNet");
  netEl.textContent = (net >= 0 ? "+৳" : "-৳") + fmt(Math.abs(net));
  netEl.classList.toggle("pos", net >= 0);
  netEl.classList.toggle("neg", net < 0);
}

/* ---------------- Render: summary + gauge ---------------- */
function renderSummary(){
  monthLabel.textContent = `${MONTH_NAMES[viewMonth].slice(0,3)} ${viewYear}`;
  const total = monthTotal(viewYear, viewMonth);
  $("#monthTotal").textContent = fmt(total);
  const key = ym(viewYear, viewMonth);
  const budget = budgets[key];
  const gaugeFill = $("#gaugeFill");
  const gaugePct = $("#gaugePct");
  const budgetLine = $("#budgetLine");

  if(budget){
    const pct = Math.min(total / budget, 1.3);
    const circumference = 263.9;
    const offset = circumference * (1 - Math.min(pct,1));
    gaugeFill.style.strokeDashoffset = offset;
    gaugeFill.style.stroke = pct > 1 ? "var(--warn)" : "var(--gold)";
    gaugePct.textContent = Math.round(pct*100) + "%";
    const remaining = budget - total;
    if(remaining >= 0){
      budgetLine.innerHTML = `<b>৳${fmt(remaining)}</b> left of ৳${fmt(budget)}`;
    } else {
      budgetLine.innerHTML = `<span class="over">৳${fmt(Math.abs(remaining))} over</span> ৳${fmt(budget)} budget`;
    }
  } else {
    gaugeFill.style.strokeDashoffset = 263.9;
    gaugePct.textContent = "—";
    budgetLine.textContent = "No budget set for this month";
  }
}

/* ---------------- Render: expense entries list ---------------- */
function renderEntries(){
  const list = entriesForMonth(viewYear, viewMonth).slice().sort((a,b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);
  entriesList.innerHTML = "";

  if(list.length === 0){
    entriesList.innerHTML = `
      <div class="empty-state">
        <div class="glyph">🧾</div>
        <p><b>No expenses yet</b></p>
        <p>Tap the + button to log your first expense for ${MONTH_NAMES[viewMonth]}.</p>
      </div>`;
    return;
  }

  const byDay = {};
  list.forEach(e => { (byDay[e.date] = byDay[e.date] || []).push(e); });

  Object.keys(byDay).sort().reverse().forEach(date => {
    const dayEntries = byDay[date];
    const dayTotal = dayEntries.reduce((s,e) => s + e.amount, 0);
    const label = new Date(date + "T00:00:00").toLocaleDateString("en-US", { weekday:"short", day:"numeric", month:"short" });

    const group = document.createElement("div");
    group.className = "day-group";
    group.innerHTML = `
      <div class="day-head"><b>${label}</b><span class="day-total">-৳${fmt(dayTotal)}</span></div>
      <div class="receipt">${dayEntries.map(expenseRow).join("")}</div>
      <div class="receipt-zigzag"></div>
    `;
    entriesList.appendChild(group);
  });

  entriesList.querySelectorAll(".del").forEach(btn => {
    btn.addEventListener("click", (ev) => {
      const id = ev.currentTarget.dataset.id;
      entries = entries.filter(e => e.id !== id);
      save(LS.entries, entries);
      toast("Entry deleted");
      render();
    });
  });
}
function expenseRow(e){
  const cat = findCat(e.category);
  return `
    <div class="entry">
      <span class="cat-dot" style="background:${cat.color}"></span>
      <div class="info">
        <div class="cat-name">${cat.emoji} ${e.category}</div>
        ${e.note ? `<div class="note">${escapeHtml(e.note)}</div>` : ""}
      </div>
      <div class="amt is-expense">-৳${fmt(e.amount)}</div>
      <button class="del" data-id="${e.id}" aria-label="Delete">✕</button>
    </div>`;
}

/* ---------------- Render: income list ---------------- */
function renderIncomeList(){
  const list = incomeForMonth(viewYear, viewMonth).slice().sort((a,b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);
  incomeList.innerHTML = "";

  if(list.length === 0){
    incomeList.innerHTML = `
      <div class="empty-state">
        <div class="glyph">💰</div>
        <p><b>No income logged yet</b></p>
        <p>Tap the + button to add an earning for ${MONTH_NAMES[viewMonth]}.</p>
      </div>`;
    return;
  }

  const byDay = {};
  list.forEach(e => { (byDay[e.date] = byDay[e.date] || []).push(e); });

  Object.keys(byDay).sort().reverse().forEach(date => {
    const dayEntries = byDay[date];
    const dayTotal = dayEntries.reduce((s,e) => s + e.amount, 0);
    const label = new Date(date + "T00:00:00").toLocaleDateString("en-US", { weekday:"short", day:"numeric", month:"short" });

    const group = document.createElement("div");
    group.className = "day-group";
    group.innerHTML = `
      <div class="day-head"><b>${label}</b><span class="day-total" style="color:var(--income)">+৳${fmt(dayTotal)}</span></div>
      <div class="receipt">${dayEntries.map(incomeRow).join("")}</div>
      <div class="receipt-zigzag"></div>
    `;
    incomeList.appendChild(group);
  });

  incomeList.querySelectorAll(".del").forEach(btn => {
    btn.addEventListener("click", (ev) => {
      const id = ev.currentTarget.dataset.id;
      income = income.filter(e => e.id !== id);
      save(LS.income, income);
      toast("Entry deleted");
      render();
    });
  });
}
function incomeRow(e){
  const src = findSource(e.source);
  return `
    <div class="entry">
      <span class="cat-dot" style="background:${src.color}"></span>
      <div class="info">
        <div class="cat-name">${src.emoji} ${e.source}</div>
        ${e.note ? `<div class="note">${escapeHtml(e.note)}</div>` : ""}
      </div>
      <div class="amt is-income">+৳${fmt(e.amount)}</div>
      <button class="del" data-id="${e.id}" aria-label="Delete">✕</button>
    </div>`;
}

function escapeHtml(s){
  return s.replace(/[&<>"']/g, m => ({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;" }[m]));
}

/* ---------------- Insights ---------------- */
function renderInsights(){
  const totals = categoryTotals(viewYear, viewMonth);
  const grand = Object.values(totals).reduce((a,b)=>a+b,0);
  $("#donutSub").textContent = `${MONTH_NAMES[viewMonth]} ${viewYear} · ৳${fmt(grand)} total`;

  drawDonut(totals, grand);
  drawLegend(totals, grand);
  drawCatRows(totals, grand);
  drawTrend();
  drawCompare();
}

function drawDonut(totals, grand){
  const canvas = $("#donutChart");
  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const W = canvas.clientWidth || 280, H = 220;
  canvas.width = W*dpr; canvas.height = H*dpr;
  ctx.setTransform(dpr,0,0,dpr,0,0);
  ctx.clearRect(0,0,W,H);

  const cx = W/2, cy = H/2, rOuter = 78, rInner = 48;

  if(grand <= 0){
    ctx.beginPath();
    ctx.arc(cx, cy, rOuter, 0, Math.PI*2);
    ctx.strokeStyle = "#2E353E";
    ctx.lineWidth = rOuter - rInner;
    ctx.stroke();
    ctx.fillStyle = "#8B93A0";
    ctx.font = "12px -apple-system, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("No spending yet", cx, cy);
    return;
  }

  let start = -Math.PI/2;
  getCats().forEach(c => {
    const val = totals[c.key];
    if(!val || val <= 0) return;
    const angle = (val/grand) * Math.PI*2;
    ctx.beginPath();
    ctx.arc(cx, cy, (rOuter+rInner)/2, start, start+angle);
    ctx.lineWidth = rOuter - rInner;
    ctx.strokeStyle = c.color;
    ctx.stroke();
    start += angle;
  });

  ctx.fillStyle = "#EDEAE3";
  ctx.font = "700 15px ui-monospace, monospace";
  ctx.textAlign = "center";
  ctx.fillText("৳" + fmt(grand), cx, cy+5);
}

function drawLegend(totals, grand){
  const legend = $("#donutLegend");
  legend.innerHTML = "";
  getCats().filter(c => totals[c.key] > 0)
    .sort((a,b) => totals[b.key]-totals[a.key])
    .forEach(c => {
      const pct = grand ? Math.round((totals[c.key]/grand)*100) : 0;
      const li = document.createElement("div");
      li.className = "li";
      li.innerHTML = `<span class="dot" style="background:${c.color}"></span>${c.key} · ${pct}%`;
      legend.appendChild(li);
    });
}

function drawCatRows(totals, grand){
  const wrap = $("#catRows");
  wrap.innerHTML = "";
  const sorted = getCats().slice().sort((a,b) => totals[b.key]-totals[a.key]);
  sorted.forEach(c => {
    const val = totals[c.key];
    if(!val || val <= 0) return;
    const pct = grand ? (val/grand)*100 : 0;
    const row = document.createElement("div");
    row.className = "cat-row";
    row.innerHTML = `
      <span class="cat-dot" style="background:${c.color}"></span>
      <span class="cat-name">${c.emoji} ${c.key}</span>
      <span class="bar-track"><span class="bar-fill" style="width:${pct}%;background:${c.color}"></span></span>
      <span class="cat-amt">৳${fmt(val)}</span>
    `;
    wrap.appendChild(row);
  });
  if(grand <= 0){
    wrap.innerHTML = `<div class="empty-state" style="padding:16px 0;"><p>No spending recorded this month.</p></div>`;
  }
}

function drawTrend(){
  const canvas = $("#trendChart");
  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const W = canvas.clientWidth || 440, H = 180;
  canvas.width = W*dpr; canvas.height = H*dpr;
  ctx.setTransform(dpr,0,0,dpr,0,0);
  ctx.clearRect(0,0,W,H);

  const months = last6Months();
  const maxVal = Math.max(...months.map(x=>monthTotal(x.y,x.m)), 1);
  const padL = 6, padR = 6, padB = 24, padT = 10;
  const barW = (W - padL - padR) / months.length * 0.5;
  const gap = (W - padL - padR) / months.length;

  months.forEach((mo, i) => {
    const val = monthTotal(mo.y, mo.m);
    const x = padL + i*gap + (gap-barW)/2;
    const h = maxVal > 0 ? ((H-padB-padT) * (val/maxVal)) : 0;
    const y = H - padB - h;
    const isCurrent = (mo.y === viewYear && mo.m === viewMonth);
    ctx.fillStyle = isCurrent ? "#D4A24E" : "#3E8E7E";
    ctx.globalAlpha = isCurrent ? 1 : 0.65;
    roundRect(ctx, x, y, barW, h, 4);
    ctx.fill();
    ctx.globalAlpha = 1;

    ctx.fillStyle = "#8B93A0";
    ctx.font = "10px -apple-system, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(MONTH_NAMES[mo.m].slice(0,3), x+barW/2, H-8);
  });
}

function last6Months(){
  const months = [];
  for(let i=5;i>=0;i--){
    let m = viewMonth - i, y = viewYear;
    while(m < 0){ m += 12; y -= 1; }
    months.push({ y, m });
  }
  return months;
}

/* ---------------- Income vs expense comparison ---------------- */
function drawCompare(){
  const canvas = $("#compareChart");
  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const W = canvas.clientWidth || 440, H = 190;
  canvas.width = W*dpr; canvas.height = H*dpr;
  ctx.setTransform(dpr,0,0,dpr,0,0);
  ctx.clearRect(0,0,W,H);

  const months = last6Months();
  const pairs = months.map(mo => ({ ...mo, inc: monthIncomeTotal(mo.y, mo.m), exp: monthTotal(mo.y, mo.m) }));
  const maxVal = Math.max(...pairs.map(p => Math.max(p.inc, p.exp)), 1);
  const padL = 6, padR = 6, padB = 24, padT = 10;
  const groupGap = (W - padL - padR) / months.length;
  const barW = groupGap * 0.32;

  pairs.forEach((p, i) => {
    const groupX = padL + i*groupGap + groupGap*0.15;

    const hInc = maxVal > 0 ? (H-padB-padT) * (p.inc/maxVal) : 0;
    ctx.fillStyle = "#5FAE72";
    roundRect(ctx, groupX, H-padB-hInc, barW, hInc, 3);
    ctx.fill();

    const hExp = maxVal > 0 ? (H-padB-padT) * (p.exp/maxVal) : 0;
    ctx.fillStyle = "#D4A24E";
    roundRect(ctx, groupX + barW + 4, H-padB-hExp, barW, hExp, 3);
    ctx.fill();

    ctx.fillStyle = "#8B93A0";
    ctx.font = "10px -apple-system, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(MONTH_NAMES[p.m].slice(0,3), groupX + barW + 2, H-8);
  });

  const inc = monthIncomeTotal(viewYear, viewMonth);
  const exp = monthTotal(viewYear, viewMonth);
  const net = inc - exp;
  const rate = inc > 0 ? Math.round((net/inc)*100) : null;
  $("#compareSub").textContent = `${MONTH_NAMES[viewMonth]} ${viewYear} · Income ৳${fmt(inc)} vs Expenses ৳${fmt(exp)}`;
  const netSummary = $("#netSummary");
  if(net >= 0){
    netSummary.innerHTML = `Net this month: <b style="color:var(--income)">+৳${fmt(net)}</b>` + (rate !== null ? ` · saving <b style="color:var(--income)">${rate}%</b> of income` : "");
  } else {
    netSummary.innerHTML = `Net this month: <b style="color:var(--warn)">-৳${fmt(Math.abs(net))}</b> · spending exceeded income`;
  }
}

function roundRect(ctx,x,y,w,h,r){
  if(h < 1) h = 1;
  ctx.beginPath();
  ctx.moveTo(x+r, y);
  ctx.arcTo(x+w, y, x+w, y+h, r);
  ctx.lineTo(x+w, y+h);
  ctx.lineTo(x, y+h);
  ctx.arcTo(x, y, x+w, y, r);
  ctx.closePath();
}

/* ---------------- Export panel ---------------- */
function renderExportPanel(){
  renderCatBudgetRows();
  renderManageList("category");
  renderManageList("source");
}

function renderCatBudgetRows(){
  const wrap = $("#catBudgetRows");
  wrap.innerHTML = "";
  const totals = categoryTotals(viewYear, viewMonth);
  getCats().forEach(c => {
    const cap = catBudgets[c.key] || 0;
    const spent = totals[c.key] || 0;
    const pct = cap ? Math.min((spent/cap)*100, 100) : 0;
    const row = document.createElement("div");
    row.className = "cat-row";
    row.innerHTML = `
      <span class="cat-dot" style="background:${c.color}"></span>
      <span class="cat-name">${c.emoji} ${c.key}</span>
      <span class="bar-track"><span class="bar-fill" style="width:${pct}%;background:${spent>cap && cap ? 'var(--warn)' : c.color}"></span></span>
      <input type="number" data-cat="${c.key}" value="${cap||''}" placeholder="no cap" style="width:70px;background:var(--surface-2);border:1px solid var(--border);color:var(--text);border-radius:6px;padding:5px 6px;font-family:var(--mono);font-size:11.5px;text-align:right;">
    `;
    wrap.appendChild(row);
  });
  wrap.querySelectorAll("input[data-cat]").forEach(inp => {
    inp.addEventListener("change", () => {
      const v = parseFloat(inp.value);
      if(v > 0) catBudgets[inp.dataset.cat] = v; else delete catBudgets[inp.dataset.cat];
      save(LS.catBudgets, catBudgets);
      toast("Budget saved");
    });
  });
}

function renderManageList(kind){
  const wrap = kind === "category" ? $("#manageCats") : $("#manageSources");
  const list = kind === "category" ? customCats : customSources;
  wrap.innerHTML = "";
  if(list.length === 0){
    wrap.innerHTML = `<div class="manage-empty">No custom ${kind === "category" ? "categories" : "sources"} yet.</div>`;
    return;
  }
  list.forEach(c => {
    const row = document.createElement("div");
    row.className = "manage-row";
    row.innerHTML = `
      <span class="cat-dot" style="background:${c.color}"></span>
      <span class="name">${c.emoji} ${c.key}</span>
      <button class="rm" data-key="${c.key}" aria-label="Remove">✕</button>
    `;
    wrap.appendChild(row);
  });
  wrap.querySelectorAll(".rm").forEach(btn => {
    btn.addEventListener("click", () => {
      const key = btn.dataset.key;
      const inUse = kind === "category"
        ? entries.some(e => e.category === key)
        : income.some(e => e.source === key);
      if(inUse && !confirm(`"${key}" is used by existing entries. They'll keep showing with a generic icon. Remove it anyway?`)) return;
      if(kind === "category"){
        customCats = customCats.filter(c => c.key !== key);
        save(LS.customCats, customCats);
        if(selectedCat === key) selectedCat = CATEGORIES[0].key;
        renderCatGrid();
      } else {
        customSources = customSources.filter(c => c.key !== key);
        save(LS.customSources, customSources);
        if(selectedSource === key) selectedSource = INCOME_SOURCES[0].key;
        renderSourceGrid();
      }
      renderExportPanel();
      toast("Removed");
    });
  });
}

$("#addCatFromExport").addEventListener("click", () => openNewTagSheet("category","export"));
$("#addSourceFromExport").addEventListener("click", () => openNewTagSheet("source","export"));

/* ---------------- Export / Import ---------------- */
function download(filename, content, mime){
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

$("#exportJson").addEventListener("click", () => {
  const payload = { entries, income, budgets, catBudgets, customCats, customSources, exportedAt: new Date().toISOString() };
  download(`khoroch-backup-${Date.now()}.json`, JSON.stringify(payload, null, 2), "application/json");
  toast("JSON exported");
});

$("#exportCsv").addEventListener("click", () => {
  const dataRows = [];
  entries.forEach(e => dataRows.push([e.date, "Expense", e.category, e.amount, (e.note||"").replace(/"/g,'""')]));
  income.forEach(e => dataRows.push([e.date, "Income", e.source, e.amount, (e.note||"").replace(/"/g,'""')]));
  dataRows.sort((a,b) => a[0].localeCompare(b[0]));
  const rows = [["Date","Type","Category/Source","Amount","Note"], ...dataRows];
  const csv = rows.map(r => r.map(v => `"${v}"`).join(",")).join("\n");
  download(`khoroch-export-${Date.now()}.csv`, csv, "text/csv");
  toast("CSV exported");
});

$("#importFile").addEventListener("change", (ev) => {
  const file = ev.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if(Array.isArray(data.entries)){ entries = data.entries; save(LS.entries, entries); }
      if(Array.isArray(data.income)){ income = data.income; save(LS.income, income); }
      if(data.budgets){ budgets = data.budgets; save(LS.budgets, budgets); }
      if(data.catBudgets){ catBudgets = data.catBudgets; save(LS.catBudgets, catBudgets); }
      if(Array.isArray(data.customCats)){ customCats = data.customCats; save(LS.customCats, customCats); }
      if(Array.isArray(data.customSources)){ customSources = data.customSources; save(LS.customSources, customSources); }
      renderCatGrid(); renderSourceGrid();
      toast("Data restored");
      render();
    } catch {
      toast("Couldn't read that file");
    }
  };
  reader.readAsText(file);
  ev.target.value = "";
});

$("#wipeBtn").addEventListener("click", () => {
  if(confirm("This deletes every expense, income entry, budget, and custom category on this device permanently. Continue?")){
    entries = []; income = []; budgets = {}; catBudgets = {}; customCats = []; customSources = [];
    save(LS.entries, entries); save(LS.income, income); save(LS.budgets, budgets);
    save(LS.catBudgets, catBudgets); save(LS.customCats, customCats); save(LS.customSources, customSources);
    selectedCat = CATEGORIES[0].key; selectedSource = INCOME_SOURCES[0].key;
    renderCatGrid(); renderSourceGrid();
    toast("All data erased");
    render();
  }
});

/* ---------------- Install prompt ---------------- */
let deferredPrompt;

function isStandalone(){
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}
function isIOS(){
  const ua = window.navigator.userAgent;
  const iOSDevice = /iPad|iPhone|iPod/.test(ua);
  // iPadOS 13+ reports as Mac but has touch support
  const iPadOS13 = /Macintosh/.test(ua) && navigator.maxTouchPoints > 1;
  return iOSDevice || iPadOS13;
}

if(isIOS() && !isStandalone()){
  // iOS Safari never fires beforeinstallprompt — show manual "Add to Home Screen" instructions instead
  $("#installBanner").querySelector("span").textContent =
    "Install Khoroch: tap the Share icon, then \"Add to Home Screen\".";
  $("#installBtn").style.display = "none";
  $("#installBanner").classList.add("show");
} else {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if(!isStandalone()){
      $("#installBanner").classList.add("show");
    }
  });
  $("#installBtn").addEventListener("click", async () => {
    if(!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    $("#installBanner").classList.remove("show");
  });
  window.addEventListener("appinstalled", () => {
    $("#installBanner").classList.remove("show");
  });
}

/* ---------------- Service worker ---------------- */
if("serviceWorker" in navigator){
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
}

/* ---------------- Master render ---------------- */
function render(){
  renderBalanceRow();
  renderSummary();
  renderEntries();
  renderIncomeList();
  if(activeTab === "insights") renderInsights();
  if(activeTab === "export") renderExportPanel();
}

window.addEventListener("resize", () => {
  if(activeTab === "insights") renderInsights();
});

/* ---------------- Init ---------------- */
renderCatGrid();
renderSourceGrid();
updateFab();
render();
})();
