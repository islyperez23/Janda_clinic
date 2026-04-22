import { useState, useEffect } from "react";
import { C, CATEGORIES, today } from "../theme";
import { Card, Stat, EmptyState, BarChart, DonutChart, HorizBar, LineChart } from "../ui";
import { api } from "../api";

export function DirectorDashboard({ patients, queue, transactions, labOrders, inventory }) {
  const [summary, setSummary] = useState(null);
  useEffect(()=>{ api.getTxnSummary().then(setSummary).catch(console.warn); },[transactions]);

  const todayTxns  = transactions.filter(t=>t.date===today());
  const todayRevenue = todayTxns.reduce((s,t)=>s+t.amount,0);
  const activeQueue  = queue.filter(e=>e.stage!=="done");
  const lowStock     = (inventory||[]).filter(d=>d.quantityInStock<=d.reorderLevel);

  // Category distribution
  const catData = CATEGORIES.map((c,i)=>({ label:c.split(" ")[0], value:patients.filter(p=>p.category===c).length, color:[C.accent,C.green,C.purple,C.amber][i] }));

  // Top diagnoses
  const diagCount = {};
  patients.forEach(p=>p.visits.forEach(v=>{ if(v.diagnosis) diagCount[v.diagnosis]=(diagCount[v.diagnosis]||0)+1; }));
  const topDiag = Object.entries(diagCount).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([label,value],i)=>({ label, value, color:[C.red,C.amber,C.accent,C.purple,C.green,C.blue][i] }));

  // Revenue 7-day line
  const revLine = summary?.days?.map(d=>({ label:d.label, value:d.total }))||[];

  // Stage queue counts
  const stages = ["reception","nurse","doctor","lab","pharmacy","dentist"];
  const stageData = stages.map((s,i)=>({ label:s.charAt(0).toUpperCase()+s.slice(1), value:queue.filter(e=>e.stage===s).length, color:[C.textMid,C.purple,C.green,C.amber,C.pink,C.blue][i] }));

  // Payment methods overall
  const pmethods = {};
  transactions.forEach(t=>{ pmethods[t.method]=(pmethods[t.method]||0)+t.amount; });
  const methodData = Object.entries(pmethods).map(([label,value],i)=>({ label, value, color:[C.green,C.accent,C.blue,C.purple][i%4] }));

  return (
    <div style={{ padding:24 }}>
      {/* KPI row */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:14, marginBottom:20 }}>
        <Stat label="Total Patients" value={patients.length} color={C.accent} icon="👥"/>
        <Stat label="Active Queue" value={activeQueue.length} color={C.amber} icon="⏳"/>
        <Stat label="Pending Labs" value={labOrders.filter(o=>o.status==="pending").length} color={C.purple} icon="🔬"/>
        <Stat label="Revenue Today" value={`${(todayRevenue/1000).toFixed(0)}K`} sub={`UGX ${todayRevenue.toLocaleString()}`} color={C.green} icon="💰"/>
        <Stat label="Low Stock" value={lowStock.length} color={lowStock.length>0?C.red:C.green} icon={lowStock.length>0?"⚠️":"✅"} sub={lowStock.length>0?"Items need reorder":"All stocked"}/>
      </div>

      {/* Row 2 */}
      <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap:16, marginBottom:16 }}>
        <Card title="Revenue — Last 7 Days">
          {revLine.length>0 ? <LineChart data={revLine} height={120} color={C.green}/> : <EmptyState icon="📈" message="Loading…"/>}
          {summary && (
            <div style={{ display:"flex", gap:20, marginTop:14 }}>
              {summary.days?.slice(-3).reverse().map(d=>(
                <div key={d.date}>
                  <div style={{ fontSize:10, color:C.textLight }}>{d.date}</div>
                  <div style={{ fontWeight:700, color:C.green }}>UGX {d.total.toLocaleString()}</div>
                  <div style={{ fontSize:11, color:C.textMid }}>{d.count} txns</div>
                </div>
              ))}
            </div>
          )}
        </Card>
        <Card title="Patient Categories">
          <DonutChart data={catData} size={120} label={`${patients.length}`}/>
        </Card>
      </div>

      {/* Row 3 */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:16, marginBottom:16 }}>
        <Card title="Queue Right Now">
          <BarChart data={stageData} height={120}/>
          <div style={{ marginTop:10, fontSize:12, color:C.textMid }}>
            Total active: <b style={{color:C.text}}>{activeQueue.length}</b>
            {queue.filter(e=>e.priority==="emergency").length>0 && <span style={{ marginLeft:10, color:C.red, fontWeight:700 }}>🚨 {queue.filter(e=>e.priority==="emergency").length} EMERGENCY</span>}
          </div>
        </Card>

        <Card title="Top Diagnoses">
          {topDiag.length===0 ? <EmptyState icon="📋" message="No visit data yet"/> : <HorizBar data={topDiag}/>}
        </Card>

        <Card title="Payment Methods (All Time)">
          {methodData.length===0 ? <EmptyState icon="💳" message="No transactions"/> : <DonutChart data={methodData} size={110}/>}
        </Card>
      </div>

      {/* Row 4 */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
        <Card title="Recent Patient Activity">
          {patients.slice(-6).reverse().map(p=>(
            <div key={p.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 0", borderBottom:`1px solid ${C.border}` }}>
              <div>
                <div style={{ fontWeight:600, fontSize:13 }}>{p.name}</div>
                <div style={{ fontSize:11, color:C.textMid }}>{p.category} · {p.visits.length} visits</div>
              </div>
              <div style={{ fontSize:11, color:C.textLight, fontFamily:"'IBM Plex Mono',monospace" }}>{p.registeredAt}</div>
            </div>
          ))}
        </Card>

        <Card title="Inventory Alerts">
          {lowStock.length===0
            ? <EmptyState icon="✅" message="All stock levels are healthy"/>
            : lowStock.map(d=>(
              <div key={d.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 0", borderBottom:`1px solid ${C.border}` }}>
                <div>
                  <div style={{ fontWeight:600, fontSize:13 }}>{d.name}</div>
                  <div style={{ fontSize:11, color:C.textMid }}>Reorder at {d.reorderLevel} {d.unit}</div>
                </div>
                <div style={{ textAlign:"right" }}>
                  <div style={{ fontWeight:700, fontSize:16, color:d.quantityInStock===0?C.red:C.amber }}>{d.quantityInStock}</div>
                  <div style={{ fontSize:10, color:d.quantityInStock===0?C.red:C.amber }}>{d.quantityInStock===0?"OUT":"LOW"}</div>
                </div>
              </div>
            ))}
        </Card>
      </div>
    </div>
  );
}

// ── In-Charge Live Overview ───────────────────────────────────────────────────
// On-ground perspective: live queue, patient flow, stock alerts, today's numbers
export function InChargeDashboard({ patients, queue, transactions, labOrders, inventory }) {
  const todayStr = today();
  const todayTxns    = transactions.filter(t => t.date === todayStr);
  const todayRevenue = todayTxns.reduce((s,t) => s+t.amount, 0);
  const activeQueue  = queue.filter(e => e.stage !== "done");
  const lowStock     = (inventory||[]).filter(d => d.quantityInStock <= d.reorderLevel);
  const emergencies  = activeQueue.filter(e => e.priority === "emergency");
  const todayPatients = patients.filter(p => p.registeredAt === todayStr);

  // Stage-by-stage flow
  const stages = [
    { key:"reception", label:"Reception", color:C.textMid,  icon:"🏥" },
    { key:"nurse",     label:"Nurse",     color:C.purple,   icon:"👩‍⚕️" },
    { key:"doctor",    label:"Doctor",    color:C.green,    icon:"👨‍⚕️" },
    { key:"lab",       label:"Lab",       color:C.amber,    icon:"🔬" },
    { key:"pharmacy",  label:"Pharmacy",  color:C.pink,     icon:"💊" },
    { key:"dentist",   label:"Dentist",   color:C.blue,     icon:"🦷" },
  ];

  return (
    <div style={{ padding:24 }}>
      {/* Emergency alert banner */}
      {emergencies.length > 0 && (
        <div style={{ background:C.red, borderRadius:12, padding:"14px 20px", marginBottom:20, display:"flex", alignItems:"center", gap:14, animation:"pulse 1.5s infinite" }}>
          <span style={{ fontSize:28 }}>🚨</span>
          <div>
            <div style={{ color:"#fff", fontWeight:800, fontSize:16 }}>{emergencies.length} EMERGENCY PATIENT{emergencies.length>1?"S":""} IN CLINIC</div>
            <div style={{ color:"rgba(255,255,255,0.85)", fontSize:13 }}>{emergencies.map(e=>e.name).join(", ")}</div>
          </div>
        </div>
      )}

      {/* KPI row */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:12, marginBottom:20 }}>
        {[
          { label:"In Queue Now",      value:activeQueue.length,   color:C.accent, icon:"⏳" },
          { label:"Registered Today",  value:todayPatients.length, color:C.green,  icon:"👤" },
          { label:"Revenue Today",     value:`UGX ${(todayRevenue/1000).toFixed(0)}K`, color:C.green, icon:"💰" },
          { label:"Pending Labs",      value:labOrders.filter(o=>o.status==="pending").length, color:C.amber, icon:"🔬" },
          { label:"Low Stock Items",   value:lowStock.length, color:lowStock.length>0?C.red:C.green, icon:lowStock.length>0?"⚠️":"✅" },
        ].map(s => (
          <div key={s.label} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:10, padding:"14px 16px" }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
              <span style={{ fontSize:10, fontWeight:700, color:C.textLight, textTransform:"uppercase", letterSpacing:"0.06em" }}>{s.label}</span>
              <span style={{ fontSize:18 }}>{s.icon}</span>
            </div>
            <div style={{ fontSize:24, fontWeight:800, color:s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:16 }}>
        {/* Live queue flow */}
        <Card title="Live Patient Flow">
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {stages.map(s => {
              const count = activeQueue.filter(e => e.stage === s.key).length;
              const patientsHere = activeQueue.filter(e => e.stage === s.key);
              return (
                <div key={s.key} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 12px", background: count>0 ? s.color+"11" : "#f8fafc", borderRadius:9, border:`1px solid ${count>0?s.color+"44":C.border}` }}>
                  <span style={{ fontSize:20 }}>{s.icon}</span>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:600, fontSize:13, color:C.text }}>{s.label}</div>
                    {count > 0 && <div style={{ fontSize:11, color:C.textMid }}>{patientsHere.map(e=>e.name).join(", ")}</div>}
                  </div>
                  <div style={{ fontWeight:800, fontSize:22, color:count>0?s.color:C.textLight, minWidth:32, textAlign:"center" }}>{count}</div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Right column */}
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          {/* Today's registrations */}
          <Card title={`Registered Today (${todayPatients.length})`}>
            {todayPatients.length === 0
              ? <EmptyState icon="👤" message="No patients registered today"/>
              : <div style={{ maxHeight:200, overflowY:"auto" }}>
                  {[...todayPatients].reverse().map(p => (
                    <div key={p.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"7px 0", borderBottom:`1px solid ${C.border}` }}>
                      <div>
                        <div style={{ fontWeight:600, fontSize:13 }}>{p.name}</div>
                        <div style={{ fontSize:11, color:C.textMid }}>{p.category}{p.arrivalTime ? ` · ${p.arrivalTime}` : ""}</div>
                      </div>
                      <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:10, color:C.textLight }}>{p.id}</div>
                    </div>
                  ))}
                </div>}
          </Card>

          {/* Stock alerts */}
          <Card title="Stock Alerts">
            {lowStock.length === 0
              ? <EmptyState icon="✅" message="All stock levels healthy"/>
              : lowStock.map(d => (
                <div key={d.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"7px 0", borderBottom:`1px solid ${C.border}` }}>
                  <div>
                    <div style={{ fontWeight:600, fontSize:13 }}>{d.name}</div>
                    <div style={{ fontSize:11, color:C.textMid }}>Reorder at {d.reorderLevel} {d.unit}</div>
                  </div>
                  <div style={{ fontWeight:800, fontSize:18, color:d.quantityInStock===0?C.red:C.amber }}>{d.quantityInStock}</div>
                </div>
              ))}
          </Card>
        </div>
      </div>

      {/* Pending lab orders */}
      {labOrders.filter(o=>o.status==="pending").length > 0 && (
        <Card title="Pending Lab Tests">
          <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
            {labOrders.filter(o=>o.status==="pending").map(o=>(
              <div key={o.id} style={{ background:C.amberLight, border:`1px solid ${C.amber}44`, borderRadius:8, padding:"8px 14px", fontSize:12 }}>
                <div style={{ fontWeight:700 }}>{o.test}</div>
                <div style={{ color:C.textMid }}>{o.patientName} · {o.timestamp}</div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}