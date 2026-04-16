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
