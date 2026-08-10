const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const KEYS = { records: "careerDesk.records", favorites: "careerDesk.favorites", profile: "careerDesk.profile" };
const state = { jobs: [], meta: {}, view: "jobs", records: JSON.parse(localStorage.getItem(KEYS.records) || "{}"), favorites: JSON.parse(localStorage.getItem(KEYS.favorites) || "[]"), profile: JSON.parse(localStorage.getItem(KEYS.profile) || '{"cities":["广州","深圳"],"roles":["技术研发","数据","金融科技"],"salary":15}') };
const stages = ["未投递", "已投递", "笔试", "一面", "二面", "终面", "录用", "结束"];
const roleCatalog = {
  "huawei-soft":["软件开发工程师","AI 工程师","测试工程师","硬件技术工程师","产品数据运营"],
  "tencent-dev":["后台开发工程师","客户端开发工程师","算法工程师","数据分析师","产品经理"],
  "alibaba-algo":["算法工程师","研发工程师","数据工程师","产品经理","业务运营"],
  "bytedance-data":["数据分析师","后端开发工程师","算法工程师","客户端开发工程师","产品经理"],
  "meituan-product":["产品经理","软件开发工程师","算法工程师","数据分析师","运营管理"],
  "jd-supply":["供应链管理","软件开发工程师","算法工程师","产品经理","物流运营"],
  "baidu-ai":["机器学习工程师","搜索算法工程师","后端研发工程师","数据分析师","产品经理"],
  "xiaomi-hardware":["硬件研发工程师","软件开发工程师","算法工程师","产品经理","供应链专员"],
  "netease-game":["游戏开发工程师","游戏策划","游戏测试工程师","美术设计师","用户研究员"],
  "byd-vehicle":["新能源汽车研发工程师","嵌入式软件工程师","电池研发工程师","智能驾驶算法工程师","生产技术工程师"],
  "nio-software":["智能座舱软件工程师","自动驾驶算法工程师","整车研发工程师","数据开发工程师","产品经理"],
  "pdd-operation":["商业运营管培生","服务端研发工程师","算法工程师","数据分析师","产品经理"]
};

async function loadJobs(force = false) {
  const button = $("#refreshButton"); button.classList.add("loading");
  try {
    const response = await fetch(`data/jobs.json?v=${force ? Date.now() : new Date().toISOString().slice(0,10)}`);
    if (!response.ok) throw new Error("数据读取失败");
    const data = await response.json(); state.jobs = data.jobs; state.meta = data.meta;
    $("#syncTime").textContent = `${new Date(data.meta.updatedAt).toLocaleString("zh-CN", {month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit"})} · 每日自动检查`;
    buildFilters(); buildProfile(); render();
  } catch (error) { $("#syncTime").textContent = error.message; }
  finally { button.classList.remove("loading"); }
}

function unique(key) { return [...new Set(state.jobs.flatMap(job => Array.isArray(job[key]) ? job[key] : [job[key]]))].sort((a,b)=>a.localeCompare(b,"zh-CN")); }
function fillSelect(selector, items) { const el=$(selector), first=el.options[0]; el.replaceChildren(first,...items.map(item=>new Option(item,item))); }
function buildFilters(){ fillSelect("#cityFilter",unique("cities")); fillSelect("#roleFilter",unique("category")); fillSelect("#natureFilter",unique("nature")); fillSelect("#majorFilter",unique("majors")); }
function buildProfile(){
  const make=(items,selected,name)=>items.map(item=>`<label class="check-option"><input type="checkbox" name="${name}" value="${item}" ${selected.includes(item)?"checked":""}>${item}</label>`).join("");
  $("#cityPreferences").innerHTML=make(unique("cities").filter(x=>x!=="各省会城市"),state.profile.cities,"cities");
  $("#rolePreferences").innerHTML=make(unique("category"),state.profile.roles,"roles");
  $("#salaryPreference").value=state.profile.salary; $("#salaryOutput").textContent=`${state.profile.salary}K`;
  $("#profileSummary").textContent=`${state.profile.cities.slice(0,2).join("、")} · ${state.profile.roles[0]||"岗位不限"}`;
}

function filteredJobs(){
  const query=$("#searchInput").value.trim().toLowerCase(), city=$("#cityFilter").value, role=$("#roleFilter").value, nature=$("#natureFilter").value, salary=Number($("#salaryFilter").value), major=$("#majorFilter").value;
  return state.jobs.filter(job=>{
    const haystack=[job.company,job.role,job.nature,...job.cities,...job.majors].join(" ").toLowerCase();
    const viewMatch=state.view==="jobs"||(state.view==="favorites"?state.favorites.includes(job.id):(state.records[job.id]&&state.records[job.id]!=="未投递"));
    return viewMatch&&(!query||haystack.includes(query))&&(!city||job.cities.includes(city))&&(!role||job.category===role)&&(!nature||job.nature===nature)&&job.salaryMax>=salary&&(!major||job.majors.includes(major));
  }).sort((a,b)=>score(b)-score(a)||new Date(a.applyEnd)-new Date(b.applyEnd));
}
function score(job){ return (job.priority?4:0)+(job.cities.some(c=>state.profile.cities.includes(c))?2:0)+(state.profile.roles.includes(job.category)?2:0)+(job.salaryMax>=state.profile.salary?1:0); }
function natureClass(nature){ if(nature.includes("中央国企子公司")) return "nature-subsidiary"; if(nature.includes("中央国企")) return "nature-central"; if(nature.includes("地方国企")) return "nature-local"; if(nature.includes("银行")) return "nature-bank"; return "nature-private"; }
function render(){
  const jobs=filteredJobs(), titles={jobs:"职位机会",pipeline:"投递进度",favorites:"我的收藏"}; $("#viewTitle").textContent=titles[state.view]; $("#resultCount").textContent=`共 ${jobs.length} 个机会 · 优先展示与你偏好匹配的职位`;
  $("#metricMatched").textContent=jobs.length; const vals=Object.values(state.records); $("#metricApplied").textContent=vals.filter(x=>x!=="未投递"&&x!=="结束").length; $("#metricActive").textContent=vals.filter(x=>["笔试","一面","二面","终面"].includes(x)).length;
  const now=new Date(), week=new Date(now.getTime()+7*864e5); $("#metricDeadline").textContent=state.jobs.filter(j=>new Date(j.applyEnd)>=now&&new Date(j.applyEnd)<=week).length;
  $("#jobsBody").innerHTML=jobs.map(job=>row(job)).join(""); $("#emptyState").hidden=jobs.length>0; bindRows();
}
function row(job){
  const stage=state.records[job.id]||"未投递", soon=(new Date(job.applyEnd)-new Date())/864e5<=7&&new Date(job.applyEnd)>=new Date();
  return `<tr><td><div class="company"><span class="logo" style="background:${job.color}">${job.abbr}</span><span><strong>${job.company}</strong><small>${job.role}${job.parent?` · ${job.parent}旗下`:""}</small></span></div></td><td><span class="badge ${natureClass(job.nature)}">${job.nature}</span></td><td>${job.cities.slice(0,3).join(" / ")}<span class="subtext">${job.cities.length>3?`另 ${job.cities.length-3} 个城市`:""}</span></td><td><span class="salary">${job.salaryText}</span><span class="subtext">${job.salaryNote}</span></td><td><span class="deadline ${soon?"soon":""}">${job.applyText}</span><span class="subtext">${job.status}</span></td><td class="process">${job.written?'<span class="yes">含笔试</span>':"无统一笔试"}</td><td><select class="status-select" data-id="${job.id}" aria-label="${job.company}投递状态">${stages.map(s=>`<option ${s===stage?"selected":""}>${s}</option>`).join("")}</select></td><td><button class="star ${state.favorites.includes(job.id)?"on":""}" data-favorite="${job.id}" title="收藏" aria-label="收藏">☆</button><button class="details" data-detail="${job.id}">详情 ›</button></td></tr>`;
}
function bindRows(){
  $$(".status-select").forEach(el=>el.onchange=()=>{state.records[el.dataset.id]=el.value;localStorage.setItem(KEYS.records,JSON.stringify(state.records));render()});
  $$('[data-favorite]').forEach(el=>el.onclick=()=>{const id=el.dataset.favorite;state.favorites=state.favorites.includes(id)?state.favorites.filter(x=>x!==id):[...state.favorites,id];localStorage.setItem(KEYS.favorites,JSON.stringify(state.favorites));render()});
  $$('[data-detail]').forEach(el=>el.onclick=()=>openDetail(el.dataset.detail));
}
function openDetail(id){
  const j=state.jobs.find(x=>x.id===id), roles=j.openRoles||roleCatalog[j.id]||[j.role], requirements=j.requirements||`本科及以上学历优先；招聘专业包括${j.majors.join("、")}；具体学历、技能和应届生范围以单位最新公告为准。`;
  const checked=state.meta.updatedAt?new Date(state.meta.updatedAt).toLocaleDateString("zh-CN"):"尚未记录";
  const coverage=j.status==="网申中"?`岗位收录不完整：当前整理 ${roles.length} 个重点岗位方向，官网可能还有新增、下架或分城市职位。最后核验：${checked}。`:`2027 届完整岗位公告尚未发布。以下 ${roles.length} 个岗位为重点关注方向，不代表当前已经开放申请。最后核验：${checked}。`;
  $("#detailContent").innerHTML=`<div class="dialog-head"><span class="eyebrow">OFFICIAL RECRUITMENT</span><button onclick="this.closest('dialog').close()" aria-label="关闭">×</button></div><div class="detail-body"><div class="detail-hero"><span class="logo" style="background:${j.color}">${j.abbr}</span><div><h2>${j.company}</h2><p>${j.role} · ${j.nature}${j.parent?` · 所属 ${j.parent}`:""}</p></div></div><div class="detail-grid"><div><span>工作地点</span><strong>${j.cities.join("、")}</strong></div><div><span>笔试安排</span><strong>${j.written?"有，具体安排以通知为准":"无统一笔试"}</strong></div><div><span>网申时间</span><strong>${j.applyText}</strong></div><div><span>薪资待遇</span><strong>${j.salaryText}</strong></div></div><h3>${j.status==="网申中"?"正在招聘岗位":"秋招岗位方向"}</h3><div class="coverage-note"><strong>${j.status==="网申中"?"非完整清单":"公告待发布"}</strong><span>${coverage}</span></div><div class="role-list">${roles.map(role=>`<div><strong>${role}</strong><span>${j.status==="网申中"?"重点收录":j.status}</span></div>`).join("")}</div><h3>岗位要求</h3><p class="requirements">${requirements}</p><h3>招聘专业</h3><div class="major-list">${j.majors.map(m=>`<span class="badge">${m}</span>`).join("")}</div><h3>福利待遇</h3><p>${j.benefits}</p><p class="source-note">来源：${j.source}。岗位名称与要求为公开信息整理，不替代单位招聘公告；薪资为参考信息，最终以官网公告与录用通知为准。</p><a class="primary detail-link" href="${j.url}" target="_blank" rel="noopener noreferrer">查看官网全部在招岗位</a></div>`;
  $("#detailDialog").showModal();
}

$$('.filters input,.filters select').forEach(el=>el.addEventListener(el.tagName==="INPUT"?"input":"change",render));
$$('.nav-item').forEach(el=>el.onclick=()=>{$$('.nav-item').forEach(x=>x.classList.remove("active"));el.classList.add("active");state.view=el.dataset.view;render()});
$("#refreshButton").onclick=async()=>{
  const button=$("#refreshButton"), sync=$("#syncTime"); button.disabled=true; button.classList.add("loading"); sync.textContent="正在检查企业招聘数据…";
  try { const response=await fetch("/api/update",{method:"POST"}); if(!response.ok) throw new Error("更新服务不可用"); const result=await response.json(); await loadJobs(true); sync.textContent=`刚刚更新 · ${result.message.split(";")[0]}`; }
  catch { await loadJobs(true); sync.textContent="已重新载入数据 · 自动采集服务未启用"; }
  finally { button.disabled=false; button.classList.remove("loading"); }
}; $("#profileButton").onclick=()=>$("#profileDialog").showModal(); $("#salaryPreference").oninput=e=>$("#salaryOutput").textContent=`${e.target.value}K`;
$("#saveProfile").onclick=()=>{state.profile={cities:$$('[name="cities"]:checked').map(x=>x.value),roles:$$('[name="roles"]:checked').map(x=>x.value),salary:Number($("#salaryPreference").value)};localStorage.setItem(KEYS.profile,JSON.stringify(state.profile));buildProfile();render()};
$("#resetFilters").onclick=()=>{$$(".filters input").forEach(x=>x.value="");$$('.filters select').forEach(x=>x.selectedIndex=0);render()};
$("#exportButton").onclick=()=>{const rows=state.jobs.filter(j=>state.records[j.id]&&state.records[j.id]!=="未投递").map(j=>[j.company,j.role,state.records[j.id],j.cities.join("/"),j.salaryText,j.url]);const csv="\ufeff单位,岗位,进度,地点,薪资,官方链接\n"+rows.map(r=>r.map(v=>`"${String(v).replaceAll('"','""')}"`).join(",")).join("\n");const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));a.download=`秋招投递记录-${new Date().toISOString().slice(0,10)}.csv`;a.click();URL.revokeObjectURL(a.href)};
loadJobs();
