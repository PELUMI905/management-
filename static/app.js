const $ = (s) => document.querySelector(s);
const state = { auth: "", view: "dashboard", studentPage: 1, studentNext: null, studentPrevious: null, students: [], classes: [], results: [], editing: null, kind: null };
const endpoints = { students: "/api/students/", classes: "/api/classes/", results: "/api/results/", dashboard: "/api/dashboard/" };
function esc(value) { return String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
function initials(name) { return (name || "?").split(/\s+/).slice(0,2).map(x=>x[0]||"").join("").toUpperCase(); }
function notify(message, error=false) { const box=$("#notice"); box.textContent=message; box.classList.remove("hidden","error"); if(error) box.classList.add("error"); setTimeout(()=>box.classList.add("hidden"),4500); }
function getCookie(name) {
  const cookies = document.cookie ? document.cookie.split(";") : [];
  for (const cookie of cookies) {
    const item = cookie.trim();
    if (item.startsWith(name + "=")) return decodeURIComponent(item.substring(name.length + 1));
  }
  return null;
}
async function api(url, options={}) {
  const headers = {...(options.headers||{})};
  const method = (options.method || "GET").toUpperCase();
  if (options.body && !(options.body instanceof FormData)) headers["Content-Type"]="application/json";
  if (state.auth) headers.Authorization = "Basic " + state.auth;
  if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
    const token = getCookie("csrftoken");
    if (token) headers["X-CSRFToken"] = token;
  }
  const response = await fetch(url, {...options, method, headers, credentials:"same-origin"});
  if (response.status === 204) return null;
  let data = {}; try { data = await response.json(); } catch {}
  if (!response.ok) {
    let message = data.detail || Object.entries(data).map(([k,v])=>`${k}: ${Array.isArray(v)?v.join(", "):typeof v==="object"?JSON.stringify(v):v}`).join(" | ") || `Request failed (${response.status})`;
    throw new Error(message);
  }
  return data;
}

function go(view) {
  if (state.view !== view && state.kind) closeForm();
  state.view=view;
  document.querySelectorAll(".view").forEach(el=>el.classList.add("hidden"));
  $(`#${view}-view`).classList.remove("hidden");
  document.querySelectorAll(".nav-link[data-view]").forEach(el=>el.classList.toggle("active",el.dataset.view===view));
  $("#page-title").textContent = ({dashboard:"Dashboard",students:"Students",classes:"Classes",results:"Academic results"})[view];
  if(view==="dashboard") loadDashboard(); if(view==="students") loadStudents(); if(view==="classes") loadClasses(); if(view==="results") loadResults();
}
document.querySelectorAll("[data-view]").forEach(el=>el.addEventListener("click",()=>go(el.dataset.view)));
document.querySelectorAll("[data-goto]").forEach(el=>el.addEventListener("click",()=>go(el.dataset.goto)));
$("#login-form").onsubmit=async e=>{
  e.preventDefault();
  const username = $("#username").value.trim();
  const password = $("#password").value;
  state.auth = btoa(unescape(encodeURIComponent(username+":"+password)));
  const status = $("#login-status");
  status.textContent = "Signing in…";
  status.style.color = "";
  try {
    await api("/api/auth-check/");
    $("#login-screen").classList.add("hidden");
    $("#app-shell").classList.remove("hidden");
    status.textContent = "";
    $("#password").value = "";
    refreshView();
  } catch(err) {
    state.auth = "";
    status.textContent = "Login failed. Check your staff username and password, and confirm the account has staff access.";
    status.style.color = "#b52f36";
  }
};
$("#logout").onclick=()=>{
  state.auth="";
  $("#username").value="";
  $("#password").value="";
  $("#app-shell").classList.add("hidden");
  $("#login-screen").classList.remove("hidden");
  $("#login-status").textContent="You have signed out.";
  closeForm();
};

function refreshView(){document.querySelectorAll(".staff-only").forEach(el=>el.classList.toggle("hidden",!state.auth));go(state.view);}
$("#quick-add").onclick=()=>{go("students");openForm("student");};
async function loadDashboard(){try{const d=await api(endpoints.dashboard);$("#total-students").textContent=d.total_students;$("#total-classes").textContent=d.total_classes;$("#total-results").textContent=d.total_results;$("#average-score").textContent=Number(d.average_score).toFixed(1);$("#class-stats").innerHTML=d.students_per_class.length?d.students_per_class.map(c=>`<div><div class="class-stat-head"><span>${esc(c.class_name)}</span><span>${c.student_count} students</span></div><div class="bar"><span style="width:${Math.min(100,d.total_students?c.student_count/d.total_students*100:0)}%"></span></div></div>`).join(""):'<p class="muted">No classes have been added yet.</p>';$("#recent-students").innerHTML=d.recent_students.length?d.recent_students.map(s=>`<div class="recent-item"><div class="student-avatar">${esc(initials(s.first_name+" "+s.last_name))}</div><div class="recent-info"><b>${esc(s.first_name+" "+s.last_name)}</b><small>${esc(s.admission_number)} · ${esc(s.classroom_name)}</small></div><span class="pill">${esc(s.gender==="M"?"Male":s.gender==="F"?"Female":"Other")}</span></div>`).join(""):'<p class="muted">No students registered yet.</p>';}catch(e){notify(e.message,true);}}
async function getAll(url){let items=[];while(url){const d=await api(url);if(Array.isArray(d)){items=items.concat(d);url=null;}else{items=items.concat(d.results||[]);url=d.next;}}return items;}
async function loadClasses(){try{state.classes=await getAll(endpoints.classes);$("#classes-list").innerHTML=state.classes.length?state.classes.map(c=>`<article class="class-card"><div class="stat-icon purple">▤</div><h3>${esc(c.name)}</h3><p>${esc(c.level)} · Class teacher: ${esc(c.teacher_name)}</p><div class="class-count">${c.student_count??0}</div><p>Students enrolled</p><div class="row-actions"><button class="small-btn" onclick="viewClassStudents(${c.id})">Students</button><button class="small-btn staff-only" onclick="editRecord('class',${c.id})">Edit</button><button class="small-btn delete staff-only" onclick="deleteRecord('class',${c.id})">Delete</button></div></article>`).join(""):'<p class="muted">No classes yet. Add a class to get started.</p>';syncStaff();const sel=$("#student-class");const old=sel.value;sel.innerHTML='<option value="">All classes</option>'+state.classes.map(c=>`<option value="${c.id}">${esc(c.name)}</option>`).join("");sel.value=old;}catch(e){notify(e.message,true);}}
async function viewClassStudents(id){go("students");$("#student-class").value=id;await loadStudents();}
async function loadStudents(url=null){try{if(!url){const p=new URLSearchParams();const search=$("#student-search").value.trim(),gender=$("#student-gender").value,room=$("#student-class").value;if(search)p.set("search",search);if(gender)p.set("gender",gender);if(room)p.set("classroom",room);url=endpoints.students+"?"+p.toString();}const d=await api(url);state.students=d.results||d;state.studentNext=d.next||null;state.studentPrevious=d.previous||null;$("#students-table").innerHTML=state.students.length?state.students.map(s=>`<tr><td><div class="table-person"><div class="student-avatar">${esc(initials(s.first_name+" "+s.last_name))}</div><div><b>${esc(s.first_name+" "+s.last_name)}</b><br><small>${esc(s.email)}</small></div></div></td><td>${esc(s.admission_number)}</td><td>${esc(s.classroom_name)}</td><td>${esc(s.gender==="M"?"Male":s.gender==="F"?"Female":"Prefer not to say")}</td><td>${esc((s.date_registered||"").slice(0,10))}</td><td><div class="row-actions"><button class="small-btn" onclick="viewStudentResults(${s.id})">Results</button><button class="small-btn staff-only" onclick="editRecord('student',${s.id})">Edit</button><button class="small-btn delete staff-only" onclick="deleteRecord('student',${s.id})">Delete</button></div></td></tr>`).join(""):'<tr><td colspan="6" class="muted">No matching students found.</td></tr>';$("#student-page").textContent="Page "+(new URL(url,location.origin).searchParams.get("page")||1);$("#student-prev").disabled=!state.studentPrevious;$("#student-next").disabled=!state.studentNext;syncStaff();}catch(e){notify(e.message,true);}}
$("#student-filter").onclick=()=>loadStudents();$("#student-search").addEventListener("keydown",e=>{if(e.key==="Enter")loadStudents();});$("#student-prev").onclick=()=>state.studentPrevious&&loadStudents(state.studentPrevious);$("#student-next").onclick=()=>state.studentNext&&loadStudents(state.studentNext);
async function loadResults(){try{const p=new URLSearchParams();if($("#result-search").value)p.set("search",$("#result-search").value);if($("#result-term").value)p.set("term",$("#result-term").value);if($("#result-session").value)p.set("session",$("#result-session").value);state.results=await getAll(endpoints.results+"?"+p.toString());$("#results-table").innerHTML=state.results.length?state.results.map(r=>`<tr><td><b>${esc(r.student_name)}</b></td><td>${esc(r.class_name)}</td><td>${esc(r.subject)}</td><td>${esc(r.term)}<br><small>${esc(r.session)}</small></td><td>${r.ca_score}/40</td><td>${r.exam_score}/60</td><td><b>${r.total_score}</b></td><td><span class="pill">${esc(r.grade)}</span></td><td><div class="row-actions"><button class="small-btn staff-only" onclick="editRecord('result',${r.id})">Edit</button><button class="small-btn delete staff-only" onclick="deleteRecord('result',${r.id})">Delete</button></div></td></tr>`).join(""):'<tr><td colspan="9" class="muted">No results found.</td></tr>';syncStaff();}catch(e){notify(e.message,true);}}
$("#result-filter").onclick=loadResults;
async function viewStudentResults(id){go("results");try{state.results=await getAll(`/api/students/${id}/results/`);$("#results-table").innerHTML=state.results.length?state.results.map(r=>`<tr><td><b>${esc(r.student_name)}</b></td><td>${esc(r.class_name)}</td><td>${esc(r.subject)}</td><td>${esc(r.term)}<br><small>${esc(r.session)}</small></td><td>${r.ca_score}/40</td><td>${r.exam_score}/60</td><td><b>${r.total_score}</b></td><td><span class="pill">${esc(r.grade)}</span></td><td></td></tr>`).join(""):'<tr><td colspan="9" class="muted">This student has no results.</td></tr>';}catch(e){notify(e.message,true);}}
function syncStaff(){document.querySelectorAll(".staff-only").forEach(el=>el.classList.toggle("hidden",!state.auth));}
$("#add-student").onclick=()=>openForm("student");$("#add-class").onclick=()=>openForm("class");$("#add-result").onclick=async()=>{await loadClasses();await loadStudents();openForm("result");};
const fields={
 student:[["first_name","First name","text",true],["last_name","Last name","text",true],["email","Email address","email",true],["phone_number","Phone number","text",false],["gender","Gender","select",true,[["M","Male"],["F","Female"],["P","Prefer not to say"]]],["date_of_birth","Date of birth","date",true],["admission_number","Admission number","text",true],["classroom","Classroom","select",true,"classes"]],
 class:[["name","Class name","text",true],["level","Level","text",true],["teacher_name","Teacher name","text",true],["description","Description","textarea",false]],
 result:[["student","Student","select",true,"students"],["subject","Subject","text",true],["term","Term","select",true,[["First","First term"],["Second","Second term"],["Third","Third term"]]],["session","Academic session","text",true],["ca_score","CA score (0–40)","number",true],["exam_score","Exam score (0–60)","number",true]]
};
function fieldHtml(f,val){const [name,label,type,required,options]=f;let input="";if(type==="select"){let opts=options==="classes"?state.classes.map(x=>[x.id,x.name]):options==="students"?state.students.map(x=>[x.id,`${x.first_name} ${x.last_name} (${x.admission_number})`]):options;input=`<select id="f-${name}" name="${name}" ${required?"required":""}><option value="">Choose ${label.toLowerCase()}</option>${(opts||[]).map(o=>`<option value="${esc(o[0])}" ${String(val??"")===String(o[0])?"selected":""}>${esc(o[1])}</option>`).join("")}</select>`;}else if(type==="textarea"){input=`<textarea id="f-${name}" name="${name}">${esc(val||"")}</textarea>`;}else{input=`<input id="f-${name}" name="${name}" type="${type}" ${required?"required":""} ${type==="number"?(name==="ca_score"?'min="0" max="40"':'min="0" max="60"'):""} value="${esc(val??"")}">`;}return `<label class="${name==="description"?"full":""}">${label}${input}</label>`;}
async function openForm(kind, record=null){if(!state.auth){notify("Please sign in with a Django staff account before editing records.",true);$("#login-screen").classList.remove("hidden");$("#app-shell").classList.add("hidden");return;}state.kind=kind;state.editing=record;try{if(kind==="student"||kind==="result"){if(!state.classes.length)await loadClasses();if(!state.students.length)await loadStudents();}}catch{}const labels={student:"student",class:"class",result:"result"};$("#dialog-title").textContent=(record?"Edit ":"Add ")+labels[kind];$("#dialog-description").textContent=record?"Update the record details.":"Complete the details below.";$("#form-error").textContent="";$("#form-fields").innerHTML=fields[kind].map(f=>fieldHtml(f,record?record[f[0]]:"")).join("");$("#record-panel").classList.remove("hidden");$("#record-panel").scrollIntoView({behavior:"smooth",block:"start"});}
window.editRecord=async(kind,id)=>{try{const url=endpoints[kind==="class"?"classes":kind==="student"?"students":"results"]+id+"/";const record=await api(url);if(kind==="student")record.classroom=record.classroom;if(kind==="result")record.student=record.student;await openForm(kind,record);}catch(e){notify(e.message,true);}};
window.deleteRecord=async(kind,id)=>{if(!state.auth){notify("Staff login is required.",true);return;}if(!confirm("Delete this record? This action cannot be undone."))return;try{await api(endpoints[kind==="class"?"classes":kind==="student"?"students":"results"]+id+"/",{method:"DELETE"});notify("Record deleted.");refreshView();}catch(e){notify(e.message,true);}};
$("#record-form").onsubmit=async e=>{
  e.preventDefault();
  if (!state.kind) return;
  const savedKind = state.kind;
  const data = {};
  for (const f of fields[savedKind]) {
    const el = $(`#f-${f[0]}`);
    if (!el) continue;
    let v = el.value;
    if (f[2] === "number" && v !== "") v = Number(v);
    if (v !== "" || f[3]) data[f[0]] = v;
  }
  const base = endpoints[savedKind === "class" ? "classes" : savedKind === "student" ? "students" : "results"];
  const url = state.editing ? base + state.editing.id + "/" : base;
  try {
    await api(url, {method: state.editing ? "PATCH" : "POST", body: JSON.stringify(data)});
    closeForm();
    notify("Record saved successfully.");
    if (savedKind === "class") await loadClasses();
    refreshView();
  } catch (err) {
    $("#form-error").textContent = err.message;
  }
};
function closeForm(){ $("#record-panel").classList.add("hidden"); $("#record-form").reset(); state.editing=null; state.kind=null; }
$("#dialog-close").onclick=closeForm;
$("#cancel-record").onclick=closeForm;
// The application is intentionally not loaded until a staff member signs in.

