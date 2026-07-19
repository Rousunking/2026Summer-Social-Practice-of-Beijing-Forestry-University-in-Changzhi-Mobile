/* ============ 手机端地图逻辑 ============ */
const DATA = window.YSD_DATA;
const POINTS = DATA.points;
function qs(sel, root=document){ return root.querySelector(sel); }
function qsa(sel, root=document){ return [...root.querySelectorAll(sel)]; }
function esc(v){ return String(v ?? "").replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s])); }
function gradeLabel(v){ if(v==="1") return "一级"; if(v==="2") return "二级"; if(v==="3") return "三级"; return v||"未标注"; }
function pointById(id){ return POINTS.find(p => p.id === id) || POINTS[0]; }
function paramId(){ return new URLSearchParams(location.search).get("id"); }
function cleanText(v){
  if(v==null||v===undefined) return "";
  const s=String(v).trim();
  if(!s||s==="未标注"||s==="待补充") return "";
  return s;
}
function locationText(p){
  return [cleanText(p.town), cleanText(p.village), cleanText(p.location)||cleanText(p.place)].filter(Boolean).join(" / ");
}
function pointTitle(p){ return p.name || `${p.town}·${p.village||""} ${p.species}`; }
function markerClass(p){ return `tree-marker grade-${p.grade||"unknown"}`; }
function markerHtml(p){
  const activeClass = p.id===activeId ? " is-active" : "";
  return `<button class="${markerClass(p)}${activeClass}" title="${esc(pointTitle(p))}"><span>${esc(gradeLabel(p.grade).slice(0,1))}</span></button>`;
}

let map, infoWindow, markers = [];
let activeId = paramId();
const statusEl = qs("#status");
const listView = qs("#listView");
const detailView = qs("#detailView");
const bottomSheet = qs("#bottomSheet");

/* ============ 列表渲染 ============ */
function filteredRows(){
  const keyword = qs("#search").value.trim();
  if(!keyword) return POINTS;
  return POINTS.filter(p => [p.id,p.name,p.species,p.town,p.village,p.place,p.location,p.story].some(v => String(v).includes(keyword)));
}

function renderList(rows=POINTS){
  qs("#countLabel").textContent = `${rows.length} 条`;
  qs("#pointList").innerHTML = rows.map(p => `<div class="sheet-item ${p.id===activeId?'active':''}" data-id="${esc(p.id)}">
    <span class="dot-grade g${p.grade||'0'}"></span>
    <div class="sheet-item-info">
      <strong>${esc(pointTitle(p))}</strong>
      <span>${esc(locationText(p))}</span>
    </div>
    <span class="age-badge">${esc(p.age||'?')}年</span>
  </div>`).join("");
  qsa(".sheet-item").forEach(el => el.addEventListener("click", () => selectPoint(el.dataset.id)));
}

/* ============ 详情渲染 ============ */
function renderDetail(p){
  const morphology = [
    p.height ? `树高 ${esc(p.height)}m` : "",
    p.chest ? `胸围 ${esc(p.chest)}cm` : "",
    p.avgCrown ? `冠幅 ${esc(p.avgCrown)}m` : ""
  ].filter(Boolean).join("，") || "暂无记录";
  const maintainer = cleanText(p.maintainer) || "未指定";
  const protection = cleanText(p.protection) || cleanText(p.measure) || "暂无记录";
  const loc = locationText(p) || "待补充";
  const amapLink = `https://uri.amap.com/marker?position=${encodeURIComponent(`${p.lng},${p.lat}`)}&name=${encodeURIComponent(pointTitle(p))}`;

  detailView.innerHTML = `
    <button class="detail-back" id="backToList">&larr; 返回列表</button>
    <div class="detail-title">${esc(p.species)} · ${esc(p.town)}</div>
    <div class="detail-subtitle">编号 ${esc(p.id)} · ${esc(loc)}</div>
    <div class="detail-tags">
      <span class="tag tag-grade-${p.grade||'0'}">${esc(gradeLabel(p.grade))}古树</span>
      <span class="tag tag-growth">${esc(cleanText(p.growth)||"生长势未标注")}</span>
      <span class="tag tag-env">环境${esc(cleanText(p.environment)||"未标注")}</span>
    </div>
    <div class="detail-grid">
      <div class="detail-cell"><b>树龄</b><span>${esc(p.age||"未知")} 年</span></div>
      <div class="detail-cell"><b>海拔</b><span>${p.altitude ? esc(p.altitude)+"m" : "未记录"}</span></div>
      <div class="detail-cell"><b>树种</b><span>${esc(p.species)}（${esc(cleanText(p.family)||"—")}/${esc(cleanText(p.genus)||"—")}）</span></div>
      <div class="detail-cell"><b>坐标</b><span>${esc(p.lng)}, ${esc(p.lat)}</span></div>
      <div class="detail-cell full"><b>形态指标</b><span>${morphology}</span></div>
      <div class="detail-cell"><b>保护措施</b><span>${esc(protection)}</span></div>
      <div class="detail-cell"><b>养护责任人</b><span>${esc(maintainer)}</span></div>
      <div class="detail-cell full"><b>位置</b><span>${esc(loc)}</span></div>
    </div>
    ${cleanText(p.story) ? `<div class="detail-story"><b>古树故事</b><p>${esc(p.story)}</p></div>` : ""}
    <div class="detail-actions">
      <a class="btn-primary" href="数据大屏.html?id=${encodeURIComponent(p.id)}">查看大屏</a>
      <a class="btn-secondary" href="${amapLink}" target="_blank" rel="noopener">高德导航</a>
    </div>
  `;
  qs("#backToList").addEventListener("click", showList);
}

function showList(){
  listView.style.display = "";
  detailView.style.display = "none";
  bottomSheet.classList.remove("expanded");
}
function showDetail(p){
  listView.style.display = "none";
  detailView.style.display = "";
  renderDetail(p);
  // 展开抽屉显示详情
  bottomSheet.classList.add("expanded");
}

/* ============ 选中点位 ============ */
function selectPoint(id){
  activeId = id;
  const p = pointById(id);

  // 更新列表高亮
  qsa(".sheet-item").forEach(el => el.classList.toggle("active", el.dataset.id===id));

  // 地图联动：只平移，不缩放
  if(map && window.AMap){
    map.panTo([Number(p.lng), Number(p.lat)]);
    updateMarkerActive();
  } else {
    updateFallbackActive();
  }

  // 显示详情（不展开抽屉，保持当前高度）
  listView.style.display = "none";
  detailView.style.display = "";
  renderDetail(p);
}

/* ============ 搜索 ============ */
qs("#search").addEventListener("input", () => {
  const rows = filteredRows();
  renderList(rows);
  if(map && window.AMap){
    const visibleIds = new Set(rows.map(p => p.id));
    markers.forEach(({marker, point}) => {
      marker.setMap(visibleIds.has(point.id) ? map : null);
    });
  }
});

/* ============ 居中按钮 ============ */
qs("#centerBtn").addEventListener("click", () => {
  if(map && window.AMap){
    map.panTo(DATA.meta.center);
    map.setZoom(DATA.meta.zoom);
    showStatus("地图已居中到上党区");
  }
});

function showStatus(msg){
  statusEl.style.display = "";
  statusEl.innerHTML = msg;
  clearTimeout(showStatus._t);
  showStatus._t = setTimeout(() => { statusEl.style.display = "none"; }, 3000);
}

/* ============ Marker 管理 ============ */
function updateMarkerActive(){
  markers.forEach(({marker, point}) => {
    marker.setContent(markerHtml(point));
  });
}

/* ============ Fallback 模式 ============ */
function pointXY(p){
  const pts = POINTS.filter(x => Number.isFinite(x.lng) && Number.isFinite(x.lat));
  const lngs = pts.map(x => x.lng), lats = pts.map(x => x.lat);
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  return {
    x: (p.lng - minLng) / Math.max(maxLng - minLng, .0001) * 72 + 14,
    y: (1 - (p.lat - minLat) / Math.max(maxLat - minLat, .0001)) * 68 + 17
  };
}

function updateFallbackActive(){
  const fm = qs("#fallbackMap");
  fm.querySelectorAll(".fallback-dot").forEach(dot => {
    dot.classList.toggle("active", dot.dataset.id === activeId);
  });
}

function renderFallback(){
  const fm = qs("#fallbackMap");
  fm.classList.add("visible");
  fm.querySelectorAll(".fallback-dot").forEach(dot => dot.remove());
  showStatus(`未检测到可用高德 Key，当前显示 ${POINTS.length} 条古树名木本地点位示意。`);
  POINTS.forEach(p => {
    if(!Number.isFinite(p.lng) || !Number.isFinite(p.lat)) return;
    const {x,y} = pointXY(p);
    const dot = document.createElement("span");
    dot.className = `fallback-dot ${p.grade==='1'?'g1':p.grade==='3'?'g3':''} ${p.id===activeId?'active':''}`;
    dot.dataset.id = p.id;
    dot.style.left = `${x}%`;
    dot.style.top = `${y}%`;
    dot.title = pointTitle(p);
    dot.addEventListener("click", () => selectPoint(p.id));
    fm.appendChild(dot);
  });
}

/* ============ 高德地图初始化 ============ */
function initAmap(){
  if(!window.AMap_KEY || window.AMap_KEY.includes("YOUR_AMAP")){
    renderFallback();
    return;
  }
  if(window.AMap_SECURITY_CODE && !window.AMap_SECURITY_CODE.includes("OPTIONAL")){
    window._AMapSecurityConfig = { securityJsCode: window.AMap_SECURITY_CODE };
  }
  const script = document.createElement("script");
  script.src = `https://webapi.amap.com/maps?v=2.0&key=${encodeURIComponent(window.AMap_KEY)}&plugin=AMap.Scale,AMap.ToolBar&callback=onAmapReady`;
  script.onerror = renderFallback;
  document.head.appendChild(script);

  let amapTimedOut = false;
  window._amapTimeout = setTimeout(() => {
    if(!map){
      amapTimedOut = true;
      renderFallback();
      showStatus("地图服务加载超时，已切换为点位示意图。");
    }
  }, 6000);

  const _origReady = window.onAmapReady;
  window.onAmapReady = function(){
    if(amapTimedOut) return;
    clearTimeout(window._amapTimeout);
    const r = _origReady ? _origReady.apply(this, arguments) : undefined;
    // 瓦片检测
    setTimeout(() => {
      if(amapTimedOut || !map) return;
      const hasTiles = qs("#map canvas") || qs("#map img") || qs("#map .amap-maps");
      if(!hasTiles){
        amapTimedOut = true;
        try { map.destroy(); } catch(e){}
        map = null; markers = [];
        renderFallback();
        showStatus("地图服务在当前访问地址不可用，已切换为点位示意图。");
      }
    }, 4000);
    return r;
  };
}

window.onAmapReady = function(){
  showStatus("高德地图已加载，点击古树点位可查看详情。");
  map = new AMap.Map("map", { zoom: DATA.meta.zoom, center: DATA.meta.center, viewMode: "2D" });
  map.addControl(new AMap.Scale());
  markers = POINTS.filter(p => Number.isFinite(p.lng) && Number.isFinite(p.lat)).map(p => {
    const marker = new AMap.Marker({
      position: [p.lng, p.lat],
      title: pointTitle(p),
      content: markerHtml(p),
      offset: new AMap.Pixel(-13, -28),
      map: map
    });
    marker.on("click", () => selectPoint(p.id));
    return { marker, point: p };
  });
  if(markers.length){
    map.setFitView(markers.map(item => item.marker), false, [50,50,50,50]);
  }
  if(activeId) selectPoint(activeId);
};

/* ============ 底部抽屉手势 ============ */
(function(){
  const sheet = bottomSheet;
  const handle = qs(".sheet-handle");

  // 点击 handle 切换展开/收起
  handle.addEventListener("click", () => {
    sheet.classList.toggle("expanded");
  });

  // 触摸拖拽
  let startY = 0, startH = 0, dragging = false;

  handle.addEventListener("touchstart", e => {
    startY = e.touches[0].clientY;
    startH = sheet.getBoundingClientRect().height;
    dragging = true;
    sheet.style.transition = "none";
  }, {passive: true});

  document.addEventListener("touchmove", e => {
    if(!dragging) return;
    const dy = startY - e.touches[0].clientY; // 上滑为正
    const newH = Math.max(120, Math.min(window.innerHeight * 0.72, startH + dy));
    sheet.style.maxHeight = newH + "px";
  }, {passive: true});

  document.addEventListener("touchend", () => {
    if(!dragging) return;
    dragging = false;
    sheet.style.transition = "";
    sheet.style.maxHeight = ""; // 清除内联样式，回到 CSS class 控制
    const currentH = sheet.getBoundingClientRect().height;
    const halfScreen = window.innerHeight * 0.5;
    if(currentH > halfScreen){
      sheet.classList.add("expanded");
    } else {
      sheet.classList.remove("expanded");
    }
  });
})();

/* ============ 启动 ============ */
renderList();
initAmap();
