import { useState } from "react";
import { UserPlus, Search, DollarSign, ArrowRight, AlertTriangle, Zap, Printer, Calendar, Eye, CheckCircle } from "lucide-react";
import { C, CATEGORIES, STAGE_ORDER, now, today, genId, genTxn, printReceipt } from "../theme";
import { Badge, Btn, Input, Select, Card, ErrBanner, SuccessBanner, EmptyState, PriorityBadge, StageBadge } from "../ui";
import { api } from "../api";

// ── Patient Registration ──────────────────────────────────────────────────────
export function PatientRegistration({ patients, setPatients, reload }) {
  const blank = {
    firstName:"", secondName:"", otherName:"",
    dob:"", gender:"", phone:"", category:"",
    class:"", employeeId:"", department:"",
    emergencyContact:"", specialist:"", arrivalTime:now()
  };
  const [form, setForm] = useState(blank);
  const [done, setDone] = useState(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [search, setSearch] = useState("");
  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  const isSchool    = form.category==="NSVS (Secondary)" || form.category==="Samaritan (Primary)";
  const isSecondary = form.category==="NSVS (Secondary)";

  // Full display name assembled from parts
  const fullName = [form.firstName, form.secondName, form.otherName].filter(Boolean).join(" ");

  const handleSubmit = async () => {
    if (!form.firstName||!form.secondName||!form.category||!form.gender) {
      setErr("First name, second name, gender and category are required."); return;
    }
    if (!form.specialist) { setErr("Please assign a specialist (Doctor or Dentist)."); return; }
    setSaving(true); setErr("");
    try {
      const id = genId("HMS");
      const patient = {
        id,
        name: fullName,
        firstName: form.firstName, secondName: form.secondName, otherName: form.otherName,
        dob: form.dob, gender: form.gender,
        phone: isSchool ? "" : form.phone,
        category: form.category,
        class: form.class,
        employeeId: form.employeeId, department: form.department,
        emergencyContact: form.emergencyContact,
        arrivalTime: form.arrivalTime || now(),
        registeredAt: today(),
        visits: [], pendingVitals: null,
      };
      await api.addPatient(patient);

      // Route directly to chosen specialist
      const stage = form.specialist === "Dentist" ? "dentist" : "doctor";
      await api.addToQueue({
        patientId: id, name: fullName, stage,
        priority: "normal", timestamp: form.arrivalTime || now(),
        complaint: "", assignedTo: "",
        specialist: form.specialist,
      });

      // Auto-create bill with consultation fee
      const consultFee = form.specialist === "Dentist" ? 25000 : 30000;
      const consultName = form.specialist === "Dentist" ? "Dental Consultation" : "Doctor Consultation";
      try {
        await api.createBill({
          patientId: id,
          patientName: fullName,
          services: [{ serviceId:"auto", name:consultName, price:consultFee, qty:1, subtotal:consultFee, category:"Consultation" }],
          totalAmount: consultFee,
        });
      } catch(e) { console.warn("Auto-bill creation failed:", e); }

      setPatients(prev => [...prev, patient]);
      setDone({ id, name: fullName, specialist: form.specialist });
      setForm({ ...blank, arrivalTime: now() });
      reload();
    } catch(e) { setErr(e.message); } finally { setSaving(false); }
  };

  const catColor = { "NSVS (Secondary)":C.green, "Samaritan (Primary)":C.accent, "Staff":C.purple, "Outpatient":C.amber };
  const todayPts  = patients.filter(p=>p.registeredAt===today());
  const displayed = search.trim()
    ? patients.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.id.toLowerCase().includes(search.toLowerCase()) ||
        (p.category||"").toLowerCase().includes(search.toLowerCase()))
    : [...patients].reverse();

  return (
    <div style={{ padding:24, display:"grid", gridTemplateColumns:"1fr 380px", gap:20, alignItems:"start" }}>

      {/* ── Registration form ── */}
      <div>
        <SuccessBanner
          msg={done && `✓ Registered — ${done.id} · ${done.name} → assigned to ${done.specialist}`}
          onDismiss={()=>setDone(null)}
        />
        <Card title="New Patient Registration">
          <ErrBanner err={err}/>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12 }}>
            <Input label="First Name ★" value={form.firstName} onChange={v=>set("firstName",v)} required placeholder="First name"/>
            <Input label="Second Name ★" value={form.secondName} onChange={v=>set("secondName",v)} required placeholder="Second name"/>
            <Input label="Other Name" value={form.otherName} onChange={v=>set("otherName",v)} placeholder="Middle / other name"/>
          </div>

          {fullName && (
            <div style={{ margin:"10px 0 4px", padding:"6px 12px", background:"#f0fdf4", borderRadius:7, fontSize:12, color:C.green, fontWeight:600 }}>
              Full name: {fullName}
            </div>
          )}

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginTop:12 }}>
            <Input label="Date of Birth" value={form.dob} onChange={v=>set("dob",v)} type="date"/>
            <Select label="Gender ★" value={form.gender} onChange={v=>set("gender",v)} options={["M","F","Other"]} required/>
            <Select label="Patient Category ★" value={form.category} onChange={v=>set("category",v)} options={CATEGORIES} required/>

            <div>
              <Input label="Phone Number" value={form.phone} onChange={v=>set("phone",v)}
                placeholder={isSchool?"N/A — school patient":"07XXXXXXXX"} disabled={isSchool}/>
              {isSchool && <div style={{ fontSize:10, color:C.amber, marginTop:3 }}>📵 Not required for school patients</div>}
            </div>

            <Input label="Emergency Contact" value={form.emergencyContact} onChange={v=>set("emergencyContact",v)} placeholder="Name: 07XXXXXXXX"/>
            <Input label="Arrival Time" value={form.arrivalTime} onChange={v=>set("arrivalTime",v)} type="time"/>

            {isSecondary && (
              <Input label="Class / Form" value={form.class} onChange={v=>set("class",v)} placeholder="e.g. S3A"/>
            )}
            {form.category==="Samaritan (Primary)" && (
              <Input label="Class" value={form.class} onChange={v=>set("class",v)} placeholder="e.g. P5"/>
            )}
            {form.category==="Staff" && <>
              <Input label="Employee ID" value={form.employeeId} onChange={v=>set("employeeId",v)} placeholder="EMP-XXXX"/>
              <Input label="Department" value={form.department} onChange={v=>set("department",v)} placeholder="e.g. Mathematics"/>
            </>}

            <div style={{ gridColumn:"span 2" }}>
              <Select label="Assign to Specialist ★" value={form.specialist} onChange={v=>set("specialist",v)} options={["Doctor","Dentist"]} required/>
              {form.specialist && (
                <div style={{ marginTop:6, padding:"7px 12px", background:form.specialist==="Dentist"?C.blueLight:C.greenLight, borderRadius:7, fontSize:12, color:form.specialist==="Dentist"?C.blue:C.green, fontWeight:600 }}>
                  {form.specialist==="Dentist"?"🦷":"👨‍⚕️"} Patient will be placed directly in the {form.specialist}'s queue
                </div>
              )}
            </div>
          </div>

          <div style={{ marginTop:18, display:"flex", gap:10 }}>
            <Btn onClick={handleSubmit} disabled={saving}><UserPlus size={14}/> {saving?"Registering…":"Register Patient"}</Btn>
            <Btn outline onClick={()=>{ setForm({ ...blank, arrivalTime:now() }); setErr(""); }}>Clear</Btn>
          </div>
        </Card>
      </div>

      {/* ── Patient registry panel ── */}
      <div style={{ position:"sticky", top:0 }}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:14 }}>
          <div style={{ background:`linear-gradient(135deg,${C.accent},${C.accentDim})`, borderRadius:10, padding:"12px 14px", color:"#fff" }}>
            <div style={{ fontSize:10, opacity:0.8, marginBottom:2 }}>TOTAL PATIENTS</div>
            <div style={{ fontSize:26, fontWeight:800, lineHeight:1 }}>{patients.length}</div>
          </div>
          <div style={{ background:`linear-gradient(135deg,${C.green},${C.greenDim})`, borderRadius:10, padding:"12px 14px", color:"#fff" }}>
            <div style={{ fontSize:10, opacity:0.8, marginBottom:2 }}>TODAY</div>
            <div style={{ fontSize:26, fontWeight:800, lineHeight:1 }}>{todayPts.length}</div>
          </div>
        </div>

        <Card title="Patient Registry">
          <div style={{ position:"relative", marginBottom:12 }}>
            <Search size={13} style={{ position:"absolute", left:9, top:"50%", transform:"translateY(-50%)", color:C.textLight, pointerEvents:"none" }}/>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search name, ID or category…"
              style={{ width:"100%", padding:"7px 9px 7px 28px", border:`1.5px solid ${C.border}`, borderRadius:7, fontSize:12, fontFamily:"inherit", boxSizing:"border-box", background:"#f8fafc" }}/>
            {search && <button onClick={()=>setSearch("")} style={{ position:"absolute", right:8, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", color:C.textLight, fontSize:16 }}>×</button>}
          </div>
          <div style={{ maxHeight:480, overflowY:"auto" }}>
            {displayed.length===0
              ? <EmptyState icon="🔍" message={search?`No results for "${search}"`:"No patients on file yet"}/>
              : displayed.map(p=>(
                <div key={p.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 0", borderBottom:`1px solid ${C.border}` }}>
                  <div style={{ width:32, height:32, borderRadius:"50%", background:(catColor[p.category]||C.accent)+"22", display:"flex", alignItems:"center", justifyContent:"center", fontSize:15, flexShrink:0 }}>
                    {p.gender==="F"?"👩":p.gender==="M"?"👨":"🧑"}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:600, fontSize:13, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{p.name}</div>
                    <div style={{ fontSize:10, color:C.textMid, fontFamily:"'IBM Plex Mono',monospace" }}>{p.id}</div>
                    <div style={{ fontSize:10, color:C.textLight }}>
                      {p.registeredAt===today()
                        ? <span style={{ color:C.green, fontWeight:600 }}>Today {p.arrivalTime ? `· Arrived ${p.arrivalTime}` : ""}</span>
                        : p.registeredAt}
                      {p.class ? ` · ${p.class}` : ""}
                    </div>
                  </div>
                  <Badge label={p.category.split(" ")[0]} color={catColor[p.category]||C.accent}/>
                </div>
              ))}
          </div>
          <div style={{ marginTop:10, paddingTop:10, borderTop:`1px solid ${C.border}`, fontSize:11, color:C.textLight, textAlign:"center" }}>
            {search ? `${displayed.length} of ${patients.length}` : `All ${patients.length} patients — newest first`}
          </div>
        </Card>
      </div>
    </div>
  );
}

// ── Queue Management ──────────────────────────────────────────────────────────
export function QueueView({ queue, queueArchive=[], userRole, reload }) {
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [showCompleted, setShowCompleted] = useState(false);

  const setPriority = async (pid, priority) => {
    try { await api.updateQueue(pid,{priority}); reload(); } catch(e){ alert(e.message); }
  };
  const bump = async (pid) => {
    try { await api.bumpQueue(pid); reload(); } catch(e){ alert(e.message); }
  };

  const filtered = queue
    .filter(e => (filter==="all"||e.stage===filter) && e.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a,b) => { const p={emergency:0,urgent:1,normal:2}; return (p[a.priority]||2)-(p[b.priority]||2); });

  const stageFilters = ["all","doctor","dentist","nurse","lab","pharmacy","payment"];
  const stageColors  = { all:C.accent, doctor:C.green, dentist:C.blue, nurse:C.purple, lab:C.amber, pharmacy:C.pink, payment:C.green };

  return (
    <div style={{ padding:24 }}>
      <div style={{ display:"flex", gap:8, marginBottom:16, flexWrap:"wrap", alignItems:"center" }}>
        <div style={{ flex:1, minWidth:200, position:"relative" }}>
          <Search size={14} style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)", color:C.textLight }}/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search patient…"
            style={{ width:"100%", padding:"8px 8px 8px 30px", border:`1.5px solid ${C.border}`, borderRadius:7, fontSize:13, fontFamily:"inherit", boxSizing:"border-box" }}/>
        </div>
        {stageFilters.map(s=>(
          <Btn key={s} small outline={filter!==s} color={stageColors[s]||C.accent} onClick={()=>setFilter(s)} style={{ textTransform:"capitalize" }}>{s}</Btn>
        ))}
        <Btn small outline color={C.textMid} onClick={()=>setShowCompleted(v=>!v)}>
          {showCompleted?"Hide":"Show"} Completed ({queueArchive.length})
        </Btn>
      </div>

      <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:16 }}>
        {filtered.length===0 && <EmptyState icon="✅" message={filter==="all"?"No active patients":"No patients at this stage"}/>}
        {filtered.map((entry,i)=>(
          <div key={entry.patientId} style={{ background:"#fff", border:`1.5px solid ${entry.priority==="emergency"?C.red:entry.priority==="urgent"?C.amber:C.border}`, borderRadius:10, padding:"12px 16px", display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:11, color:C.textLight, width:22, textAlign:"center", fontWeight:700 }}>#{i+1}</div>
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:700, fontSize:14 }}>{entry.name}</div>
              <div style={{ fontSize:11, color:C.textMid, marginTop:2, fontFamily:"'IBM Plex Mono',monospace" }}>{entry.patientId} · {entry.complaint}</div>
            </div>
            <PriorityBadge p={entry.priority}/>
            <StageBadge stage={entry.stage}/>
            <div style={{ fontSize:11, color:C.textLight, fontFamily:"'IBM Plex Mono',monospace" }}>{entry.timestamp}</div>
            <div style={{ display:"flex", gap:5 }}>
              <Btn small outline color={C.amber} onClick={()=>setPriority(entry.patientId,entry.priority==="urgent"?"normal":"urgent")}><AlertTriangle size={11}/></Btn>
              <Btn small outline color={C.red}   onClick={()=>setPriority(entry.patientId,"emergency")}><Zap size={11}/></Btn>
              <Btn small outline color={C.textMid} onClick={()=>bump(entry.patientId)}>↑</Btn>
            </div>
          </div>
        ))}
      </div>

      {showCompleted && (
        <Card title={`Completed Today (${queueArchive.length})`} accent={C.green}>
          {queueArchive.length===0 ? <EmptyState icon="✅" message="None completed yet today"/> : queueArchive.map(e=>(
            <div key={e.patientId} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 0", borderBottom:`1px solid ${C.border}` }}>
              <div>
                <div style={{ fontWeight:600, fontSize:13 }}>{e.name}</div>
                <div style={{ fontSize:11, color:C.textMid, fontFamily:"'IBM Plex Mono',monospace" }}>{e.patientId} · {e.complaint}</div>
              </div>
              <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                <span style={{ fontSize:11, color:C.textLight }}>{e.completedAt}</span>
                <Badge label="Completed" color={C.green}/>
              </div>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}

// ── Patient Search ────────────────────────────────────────────────────────────
export function PatientSearch({ patients, userRole, setSelectedPatient, setTab, reload }) {
  const [q, setQ] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const catColor = { "NSVS (Secondary)":C.green, "Samaritan (Primary)":C.accent, "Staff":C.purple, "Outpatient":C.amber };

  const results = patients
    .filter(p => {
      const mQ = !q.trim() || p.name.toLowerCase().includes(q.toLowerCase()) || p.id.toLowerCase().includes(q.toLowerCase()) || (p.dorm||"").toLowerCase().includes(q.toLowerCase()) || (p.department||"").toLowerCase().includes(q.toLowerCase());
      const mC = catFilter==="all" || p.category===catFilter;
      return mQ && mC;
    })
    .slice().reverse();

  const addToQueue = async (p) => {
    const specialist = window.prompt("Assign to specialist:\n1 = Doctor\n2 = Dentist\n\nEnter 1 or 2:");
    if (!specialist) return;
    const stage = specialist==="2" ? "dentist" : "doctor";
    const complaint = window.prompt("Chief complaint?");
    if (!complaint) return;
    try {
      await api.addToQueue({ patientId:p.id, name:p.name, stage, priority:"normal", timestamp:now(), complaint, assignedTo:"" });
      reload();
    } catch(e) { alert(e.message); }
  };

  return (
    <div style={{ padding:24 }}>
      <div style={{ display:"flex", gap:10, marginBottom:18, flexWrap:"wrap", alignItems:"center" }}>
        <div style={{ position:"relative", flex:1, minWidth:220 }}>
          <Search size={15} style={{ position:"absolute", left:11, top:"50%", transform:"translateY(-50%)", color:C.textLight, pointerEvents:"none" }}/>
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search by name, ID, dorm, department…" autoFocus
            style={{ width:"100%", padding:"10px 10px 10px 36px", border:`1.5px solid ${C.border}`, borderRadius:9, fontSize:13, fontFamily:"inherit", boxSizing:"border-box", background:"#fff" }}/>
          {q && <button onClick={()=>setQ("")} style={{ position:"absolute", right:10, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", color:C.textLight, fontSize:18 }}>×</button>}
        </div>
        {["all","NSVS (Secondary)","Samaritan (Primary)","Staff","Outpatient"].map(cat=>(
          <Btn key={cat} small outline={catFilter!==cat} color={catColor[cat]||C.accent} onClick={()=>setCatFilter(cat)}>
            {cat==="all"?"All":cat.split(" ")[0]}
          </Btn>
        ))}
        <span style={{ fontSize:12, color:C.textLight }}>{results.length} of {patients.length}</span>
      </div>

      {results.length===0 ? <EmptyState icon="🔍" message={q?`No patients matching "${q}"`:"No patients on file yet"}/> : (
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {results.map(p=>(
            <div key={p.id} style={{ background:"#fff", border:`1px solid ${C.border}`, borderRadius:10, padding:"13px 16px", display:"flex", alignItems:"center", gap:14 }}>
              <div style={{ width:42, height:42, borderRadius:"50%", background:(catColor[p.category]||C.accent)+"22", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0 }}>
                {p.gender==="F"?"👩":p.gender==="M"?"👨":"🧑"}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontWeight:700, fontSize:14 }}>{p.name}</div>
                <div style={{ fontSize:11, color:C.textMid, fontFamily:"'IBM Plex Mono',monospace", marginTop:1 }}>
                  {p.id}{p.dob?` · DOB: ${p.dob}`:""}{p.class?` · ${p.class}`:""}{p.dorm?` / ${p.dorm}`:""}{p.department?` · ${p.department}`:""}
                </div>
                <div style={{ fontSize:11, color:C.textLight, marginTop:1 }}>
                  {p.visits.length} visit{p.visits.length!==1?"s":""} on record
                  {p.emergencyContact?` · 📞 ${p.emergencyContact}`:""}
                </div>
              </div>
              <Badge label={p.category} color={catColor[p.category]||C.accent}/>
              <div style={{ textAlign:"right", fontSize:11, color:C.textLight, fontFamily:"'IBM Plex Mono',monospace", minWidth:80 }}>
                {p.registeredAt===today() ? <span style={{ color:C.green, fontWeight:700 }}>Today</span> : p.registeredAt}
              </div>
              {["doctor","nurse","dentist"].includes(userRole) && (
                <Btn small onClick={()=>{ setSelectedPatient(p); setTab(userRole==="nurse"?"vitals":"patientfile"); }}><Eye size={12}/> Open File</Btn>
              )}
              {userRole==="receptionist" && (
                <Btn small color={C.green} onClick={()=>addToQueue(p)}>+ Queue</Btn>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Outpatient Billing / Payment Queue ────────────────────────────────────────
export function OutpatientBilling({ patients, transactions, user, reload }) {
  const [form, setForm] = useState({ patientId:"", services:"", amount:"", method:"Cash" });
  const [done, setDone] = useState(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const set = (k,v) => setForm(f=>({...f,[k]:v}));
  const todayTxns  = transactions.filter(t=>t.date===today());
  const todayTotal = todayTxns.reduce((s,t)=>s+t.amount,0);

  const handleCreate = async () => {
    const rawId = form.patientId.split(" — ")[0];
    if (!rawId||!form.amount) { setErr("Patient and amount required."); return; }
    setSaving(true); setErr("");
    try {
      const p = patients.find(x=>x.id===rawId);
      const txn = { id:genTxn(), patientId:rawId, patientName:p?.name||"", services:form.services.split(",").map(s=>s.trim()).filter(Boolean), amount:parseInt(form.amount), method:form.method, cashier:user.name, timestamp:now(), date:today() };
      await api.addTransaction(txn);
      setDone(txn);
      setForm({ patientId:"", services:"", amount:"", method:"Cash" });
      reload();
    } catch(e){ setErr(e.message); } finally{ setSaving(false); }
  };

  return (
    <div style={{ padding:24, maxWidth:800 }}>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:14, marginBottom:20 }}>
        <div style={{ background:`linear-gradient(135deg,${C.green},${C.greenDim})`, borderRadius:12, padding:"18px 20px", color:"#fff" }}>
          <div style={{ fontSize:11, fontWeight:600, opacity:0.8, marginBottom:4 }}>TODAY'S TOTAL</div>
          <div style={{ fontSize:26, fontWeight:800 }}>UGX {todayTotal.toLocaleString()}</div>
          <div style={{ fontSize:11, opacity:0.7 }}>{todayTxns.length} transactions</div>
        </div>
        <div style={{ background:`linear-gradient(135deg,${C.accent},${C.accentDim})`, borderRadius:12, padding:"18px 20px", color:"#fff" }}>
          <div style={{ fontSize:11, fontWeight:600, opacity:0.8, marginBottom:4 }}>CASH</div>
          <div style={{ fontSize:22, fontWeight:800 }}>UGX {todayTxns.filter(t=>t.method==="Cash").reduce((s,t)=>s+t.amount,0).toLocaleString()}</div>
        </div>
        <div style={{ background:`linear-gradient(135deg,${C.purple}cc,${C.purple}88)`, borderRadius:12, padding:"18px 20px", color:"#fff" }}>
          <div style={{ fontSize:11, fontWeight:600, opacity:0.8, marginBottom:4 }}>MOBILE/INSURANCE</div>
          <div style={{ fontSize:22, fontWeight:800 }}>UGX {todayTxns.filter(t=>t.method!=="Cash").reduce((s,t)=>s+t.amount,0).toLocaleString()}</div>
        </div>
      </div>
      {done && <SuccessBanner msg={`Receipt — ${done.id} — UGX ${done.amount.toLocaleString()}`} onDismiss={()=>setDone(null)}/>}
      {done && <div style={{ marginBottom:16 }}><Btn outline color={C.green} onClick={()=>printReceipt(done)}><Printer size={13}/> Print Receipt</Btn></div>}
      <Card title="New Payment Entry" style={{ marginBottom:16 }}>
        <ErrBanner err={err}/>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
          <div style={{ gridColumn:"span 2" }}>
            <Select label="Patient" value={form.patientId} onChange={v=>set("patientId",v)} options={patients.map(p=>`${p.id} — ${p.name}`)} required/>
          </div>
          <Input label="Services (comma-separated)" value={form.services} onChange={v=>set("services",v)} placeholder="Consultation, Lab Test, Drugs"/>
          <Input label="Amount (UGX)" value={form.amount} onChange={v=>set("amount",v)} type="number" placeholder="e.g. 50000"/>
          <Select label="Payment Method" value={form.method} onChange={v=>set("method",v)} options={["Cash","Mobile Money","Insurance","Waiver"]}/>
        </div>
        <Btn style={{ marginTop:16 }} onClick={handleCreate} disabled={saving}><DollarSign size={13}/> {saving?"Saving…":"Record Payment & Generate Receipt"}</Btn>
      </Card>
      <Card title="Today's Transactions">
        {todayTxns.length===0 ? <EmptyState icon="💳" message="No transactions today"/> : (
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
            <thead><tr style={{ borderBottom:`2px solid ${C.border}` }}>
              {["Time","Patient","Services","Amount","Method",""].map(h=><th key={h} style={{ textAlign:"left", padding:"7px 8px", fontSize:11, color:C.textLight, fontWeight:700, textTransform:"uppercase" }}>{h}</th>)}
            </tr></thead>
            <tbody>
              {[...todayTxns].reverse().map(t=>(
                <tr key={t.id} style={{ borderBottom:`1px solid ${C.border}` }}>
                  <td style={{ padding:"9px 8px", fontFamily:"'IBM Plex Mono',monospace", fontSize:11, color:C.textLight }}>{t.timestamp}</td>
                  <td style={{ padding:"9px 8px", fontWeight:600 }}>{t.patientName}</td>
                  <td style={{ padding:"9px 8px", color:C.textMid, fontSize:12 }}>{(t.services||[]).join(", ")}</td>
                  <td style={{ padding:"9px 8px", fontWeight:700, color:C.green }}>UGX {t.amount?.toLocaleString()}</td>
                  <td style={{ padding:"9px 8px" }}><Badge label={t.method} color={t.method==="Cash"?C.green:t.method==="Insurance"?C.blue:C.purple}/></td>
                  <td style={{ padding:"9px 8px" }}><Btn small outline color={C.accent} onClick={()=>printReceipt(t)}><Printer size={11}/></Btn></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {todayTxns.length>0 && <div style={{ marginTop:12, fontWeight:700, color:C.text, fontSize:15, textAlign:"right" }}>Total: UGX {todayTotal.toLocaleString()}</div>}
      </Card>
    </div>
  );
}


// ── Appointments ──────────────────────────────────────────────────────────────
export function AppointmentsView({ patients, appointments, reload }) {
  const [form, setForm] = useState({ patientId:"", date:"", time:"", doctor:"", reason:"" });
  const [saving, setSaving] = useState(false);
  const set = (k,v) => setForm(f=>({...f,[k]:v}));
  const book = async () => {
    if (!form.patientId||!form.date) { alert("Patient and date required."); return; }
    setSaving(true);
    try {
      const rawId = form.patientId.split(" — ")[0];
      const p = patients.find(x=>x.id===rawId);
      await api.addAppointment({ ...form, patientId:rawId, patientName:p?.name||"" });
      setForm({ patientId:"", date:"", time:"", doctor:"", reason:"" });
      reload();
    } catch(e){ alert(e.message); } finally{ setSaving(false); }
  };
  const upcoming = appointments.filter(a=>a.date>=today()).sort((a,b)=>a.date.localeCompare(b.date));
  const past     = appointments.filter(a=>a.date<today()).sort((a,b)=>b.date.localeCompare(a.date));
  return (
    <div style={{ padding:24 }}>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>
        <div>
          <Card title="Book Appointment" style={{ marginBottom:16 }}>
            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              <Select label="Patient" value={form.patientId} onChange={v=>set("patientId",v)} options={patients.map(p=>`${p.id} — ${p.name}`)} required/>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                <Input label="Date" value={form.date} onChange={v=>set("date",v)} type="date" required/>
                <Input label="Time" value={form.time} onChange={v=>set("time",v)} type="time"/>
              </div>
              <Select label="Specialist" value={form.doctor} onChange={v=>set("doctor",v)} options={["Dr. James Okello","Dr. Faith Auma (Dentist)","Other"]}/>
              <Input label="Reason" value={form.reason} onChange={v=>set("reason",v)} placeholder="Reason for appointment"/>
              <Btn onClick={book} disabled={saving}><Calendar size={13}/> {saving?"Booking…":"Book Appointment"}</Btn>
            </div>
          </Card>
        </div>
        <div>
          <Card title={`Upcoming (${upcoming.length})`} style={{ marginBottom:16 }}>
            {upcoming.length===0 ? <EmptyState icon="📅" message="No upcoming appointments"/> : upcoming.map(a=>(
              <div key={a.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 0", borderBottom:`1px solid ${C.border}` }}>
                <div>
                  <div style={{ fontWeight:700 }}>{a.patientName}</div>
                  <div style={{ fontSize:12, color:C.textMid }}>{a.reason} · {a.doctor}</div>
                </div>
                <div style={{ textAlign:"right" }}>
                  <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:12, fontWeight:600 }}>{a.date} {a.time&&`@ ${a.time}`}</div>
                  <Badge label={a.status} color={C.green}/>
                </div>
              </div>
            ))}
          </Card>
          {past.length>0 && <Card title={`Past (${past.length})`}>{past.slice(0,4).map(a=>(
            <div key={a.id} style={{ display:"flex", justifyContent:"space-between", padding:"8px 0", borderBottom:`1px solid ${C.border}`, opacity:0.6 }}>
              <div style={{ fontWeight:600, fontSize:13 }}>{a.patientName}</div>
              <div style={{ fontSize:11, color:C.textLight, fontFamily:"'IBM Plex Mono',monospace" }}>{a.date}</div>
            </div>
          ))}</Card>}
        </div>
      </div>
    </div>
  );
}