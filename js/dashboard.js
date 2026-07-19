/* ============ 手机端数据大屏逻辑 ============ */
const DATA = window.YSD_DATA;
const POINTS = DATA.points;
const COLORS = ["#1f9d64","#3fa7d6","#f3b63f","#f47b64","#50c878","#7b88d1"];
function qs(sel,root=document){ return root.querySelector(sel); }
function esc(v){ return String(v??"").replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s])); }
function gradeLabel(v){ if(v==="1")return"一级";if(v==="2")return"二级";if(v==="3")return"三级";return v||"未标注"; }
function pointById(id){ return POINTS.find(p=>p.id===id)||POINTS[0]; }
function paramId(){ return new URLSearchParams(location.search).get("id"); }
function cleanText(v){
  if(v==null)return"";const s=String(v).trim();
  if(!s||s==="未标注"||s==="待补充")return"";return s;
}

let selected = pointById(paramId());

/* ============ KPI ============ */
function renderKpis(){
  const k = DATA.kpis;
  const items = [
    ["古树总数",k.total,"条"],["最高树龄",k.maxAge,"年"],
    ["平均树龄",k.avgAge,"年"],["一级古树",k.gradeOne,"条"],
    ["记录树种",k.speciesCount,"类"],["覆盖乡镇",k.townCount,"个"]
  ];
  qs("#kpis").innerHTML = items.map(([label,value,unit])=>`
    <div class="dash-kpi">
      <div class="kpi-label">${label}</div>
      <div class="kpi-value">${value}<span class="kpi-unit">${unit}</span></div>
    </div>`).join("");
}

/* ============ 条形图 ============ */
function renderBars(id, rows, limit=8){
  const list = qs("#"+id);
  const sliced = rows.slice(0,limit);
  const max = Math.max(...sliced.map(x=>x.value),1);
  list.innerHTML = sliced.map((row,idx)=>`
    <div class="m-bar-row">
      <div class="m-bar-name" title="${esc(row.name)}">${esc(row.name)}</div>
      <div class="m-bar-track"><div class="m-bar-fill" style="width:${Math.max(4,row.value/max*100)}%;background:linear-gradient(90deg,${COLORS[idx%COLORS.length]},#50c878)"></div></div>
      <div class="m-bar-value">${row.value}</div>
    </div>`).join("");
}

/* ============ 环形图 ============ */
function renderDonut(donutId, legendId, rows){
  const total = rows.reduce((s,r)=>s+r.value,0)||1;
  let start = 0;
  const segments = rows.map((row,idx)=>{
    const end = start + row.value/total*100;
    const seg = `${COLORS[idx%COLORS.length]} ${start}% ${end}%`;
    start = end; return seg;
  });
  qs("#"+donutId).style.background = `conic-gradient(${segments.join(", ")})`;
  qs("#"+legendId).innerHTML = rows.map(row=>`
    <div class="m-legend-row">
      <span>${esc(gradeLabel(row.name))}</span>
      <strong>${row.value}</strong>
    </div>`).join("");
}

/* ============ 详情卡 ============ */
function renderDetail(p){
  const morphology = [
    p.height?`树高${p.height}m`:"",
    p.chest?`胸围${p.chest}cm`:"",
    p.avgCrown?`冠幅${p.avgCrown}m`:""
  ].filter(Boolean).join("，")||"暂无记录";
  qs("#detailCard").innerHTML = `
    <h2>当前点位详情</h2>
    <div class="dash-detail-title">
      <strong>${esc(p.species)} · ${esc(p.town)}</strong>
      <span>${esc(p.age||"—")}<small> 年</small></span>
    </div>
    <div class="dash-facts">
      <div class="dash-fact"><b>古树编号</b><span>${esc(p.id)}</span></div>
      <div class="dash-fact"><b>树种</b><span>${esc(p.species)}（${esc(cleanText(p.family)||"—")}）</span></div>
      <div class="dash-fact"><b>坐标</b><span>${esc(p.lng)}, ${esc(p.lat)}</span></div>
      <div class="dash-fact"><b>海拔</b><span>${p.altitude?esc(p.altitude)+"m":"未记录"}</span></div>
      <div class="dash-fact full"><b>位置</b><span>${esc([cleanText(p.town),cleanText(p.village),cleanText(p.place)].filter(Boolean).join(" / "))||"待补充"}</span></div>
      <div class="dash-fact"><b>等级</b><span>${esc(gradeLabel(p.grade))}</span></div>
      <div class="dash-fact"><b>生长状态</b><span>${esc(p.growth)} / 环境${esc(p.environment)}</span></div>
      <div class="dash-fact full"><b>形态指标</b><span>${morphology}</span></div>
      <div class="dash-fact"><b>保护措施</b><span>${esc(cleanText(p.protection)||cleanText(p.measure)||"暂无记录")}</span></div>
      <div class="dash-fact"><b>养护责任人</b><span>${esc(cleanText(p.maintainer)||"未指定")}</span></div>
    </div>
    <div class="dash-story"><b>历史资料：</b>${esc(p.story)}</div>
  `;
}

/* ============ 迷你地图 ============ */
function pointXY(p){
  const pts = POINTS.filter(x=>Number.isFinite(x.lng)&&Number.isFinite(x.lat));
  const lngs=pts.map(x=>x.lng),lats=pts.map(x=>x.lat);
  const minLng=Math.min(...lngs),maxLng=Math.max(...lngs);
  const minLat=Math.min(...lats),maxLat=Math.max(...lats);
  return {
    x:(p.lng-minLng)/Math.max(maxLng-minLng,.0001)*72+14,
    y:(1-(p.lat-minLat)/Math.max(maxLat-minLat,.0001))*68+17
  };
}

function selectMiniPoint(id){
  selected = pointById(id);
  renderDetail(selected);
  document.querySelectorAll("#miniMap .mini-dot").forEach(dot=>{
    dot.classList.toggle("active", dot.dataset.id===selected.id);
  });
  const url = new URL(location.href);
  url.searchParams.set("id", selected.id);
  history.replaceState(null,"",url);
}

function renderMiniMap(pick){
  const map = qs("#miniMap");
  POINTS.forEach(p=>{
    if(!Number.isFinite(p.lng)||!Number.isFinite(p.lat)) return;
    const {x,y} = pointXY(p);
    const dot = document.createElement("span");
    dot.className = `mini-dot ${p.grade==='1'?'g1':p.grade==='3'?'g3':''}`;
    dot.dataset.id = p.id;
    dot.style.left = `${x}%`;
    dot.style.top = `${y}%`;
    dot.title = `${p.id} · ${p.species}`;
    if(p.id===pick.id) dot.classList.add("active");
    dot.addEventListener("click", ()=>selectMiniPoint(p.id));
    map.appendChild(dot);
  });
}

/* ============ 启动 ============ */
renderKpis();
renderBars("townBars", DATA.towns, 9);
renderBars("speciesBars", DATA.species, 8);
renderBars("envBars", DATA.environment, 6);
renderBars("ownershipBars", DATA.ownership, 6);
renderDonut("gradeDonut", "gradeLegend", DATA.grades);
renderDonut("growthDonut", "growthLegend", DATA.growth);
renderDetail(selected);
renderMiniMap(selected);
