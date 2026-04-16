import { useState, useEffect } from "react";
import { DollarSign, Download, Printer, CheckCircle, AlertCircle, TrendingUp } from "lucide-react";
import { C, today, exportCSV } from "../theme";
import { Card, Btn, EmptyState, BarChart, DonutChart } from "../ui";
import { api } from "../api";

export function AccountantView({ transactions }) {
  const [summary, setSummary] = useState(null);
  const [eodConfirmed, setEodConfirmed] = useState(false);
  const [physicalCash, setPhysicalCash] = useState("");
  const [discrepancy, setDiscrepancy] = useState(null);
  const todayStr = today();
  const todayTxns = transactions.filter(t=>t.date===todayStr);
  const todayTotal = todayTxns.reduce((s,t)=>s+t.amount,0);
  const allTotal   = transactions.reduce((s,t)=>s+t.amount,0);

  useEffect(()=>{ api.getTxnSummary().then(setSummary).catch(console.warn); },[transactions]);

  const methods = {};
  todayTxns.forEach(t=>{ methods[t.method]=(methods[t.method]||0)+t.amount; });
  const donutData = Object.entries(methods).map(([label,value],i)=>({ label, value, color:[C.green,C.accent,C.blue,C.amber][i%4] }));

  const chartData = summary?.days?.map(d=>({ label:d.label, value:d.total, display:`${(d.total/1000).toFixed(0)}K` }))||[];

  const handleEODConfirm = () => {
    const cash = parseInt(physicalCash);
    const systemCash = todayTxns.filter(t=>t.method==="Cash").reduce((s,t)=>s+t.amount,0);
    if (isNaN(cash)) return;
    const diff = cash - systemCash;
    setDiscrepancy({ physical:cash, system:systemCash, diff });
    setEodConfirmed(true);
  };

  const handleExport = () => {
    exportCSV(todayTxns, `HMS-EOD-${todayStr}.csv`);
  };

  const handleExportAll = () => {
    exportCSV(transactions, `HMS-All-Transactions-${todayStr}.csv`);
  };

  return (
    <div style={{ padding:24 }}>
      {/* Top stats */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14, marginBottom:20 }}>
        <div style={{ background:`linear-gradient(135deg,${C.green},${C.greenDim})`, borderRadius:12, padding:"18px 20px", color:"#fff" }}>
          <div style={{ fontSize:11, opacity:0.8, marginBottom:4, letterSpacing:"0.06em" }}>TODAY'S REVENUE</div>
          <div style={{ fontSize:22, fontWeight:800 }}>UGX {todayTotal.toLocaleString()}</div>
          <div style={{ fontSize:11, opacity:0.7 }}>{todayTxns.length} transactions</div>
        </div>
        <div style={{ background:`linear-gradient(135deg,${C.accent},${C.accentDim})`, borderRadius:12, padding:"18px 20px", color:"#fff" }}>
          <div style={{ fontSize:11, opacity:0.8, marginBottom:4 }}>CASH</div>
          <div style={{ fontSize:20, fontWeight:800 }}>UGX {todayTxns.filter(t=>t.method==="Cash").reduce((s,t)=>s+t.amount,0).toLocaleString()}</div>
        </div>
        <div style={{ background:`linear-gradient(135deg,${C.purple}cc,${C.purple}88)`, borderRadius:12, padding:"18px 20px", color:"#fff" }}>
          <div style={{ fontSize:11, opacity:0.8, marginBottom:4 }}>MOBILE/INSURANCE</div>
          <div style={{ fontSize:20, fontWeight:800 }}>UGX {todayTxns.filter(t=>t.method!=="Cash").reduce((s,t)=>s+t.amount,0).toLocaleString()}</div>
        </div>
        <div style={{ background:`linear-gradient(135deg,${C.amber},${C.amber}aa)`, borderRadius:12, padding:"18px 20px", color:"#fff" }}>
          <div style={{ fontSize:11, opacity:0.8, marginBottom:4 }}>ALL-TIME TOTAL</div>
          <div style={{ fontSize:20, fontWeight:800 }}>UGX {allTotal.toLocaleString()}</div>
        </div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:16 }}>
        {/* Weekly chart */}
        <Card title="Revenue — Last 7 Days">
          {chartData.length>0 ? <BarChart data={chartData} color={C.green}/> : <EmptyState icon="📊" message="Loading chart…"/>}
        </Card>

        {/* Payment method breakdown */}
        <Card title="Today's Payment Methods">
          {donutData.length===0 ? <EmptyState icon="💳" message="No transactions today"/> : <DonutChart data={donutData} size={120} label={`${todayTxns.length}`}/>}
        </Card>
      </div>

      {/* EOD Reconciliation */}
      <Card title="End-of-Day Reconciliation" accent={C.amber} style={{ marginBottom:16 }}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
          <div>
            <div style={{ background:C.amberLight, border:`1.5px solid ${C.amber}`, borderRadius:10, padding:16, marginBottom:14 }}>
              <div style={{ fontWeight:700, fontSize:15, color:C.amber, marginBottom:8 }}>⚠ EOD Check — {todayStr}</div>
              <div style={{ fontSize:14, marginBottom:4 }}>System recorded: <b>UGX {todayTotal.toLocaleString()}</b></div>
              <div style={{ fontSize:13, color:C.textMid, marginBottom:4 }}>Cash: UGX {todayTxns.filter(t=>t.method==="Cash").reduce((s,t)=>s+t.amount,0).toLocaleString()}</div>
              <div style={{ fontSize:13, color:C.textMid, marginBottom:12 }}>Mobile Money: UGX {todayTxns.filter(t=>t.method==="Mobile Money").reduce((s,t)=>s+t.amount,0).toLocaleString()}</div>
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                <label style={{ fontSize:11, fontWeight:600, color:C.textMid, textTransform:"uppercase", letterSpacing:"0.05em" }}>Physical Cash Count (UGX)</label>
                <input type="number" value={physicalCash} onChange={e=>setPhysicalCash(e.target.value)} placeholder="Enter cash counted in till" style={{ border:`1.5px solid ${C.amber}`, borderRadius:7, padding:"8px 11px", fontSize:13, fontFamily:"'IBM Plex Mono',monospace", background:"#fff" }}/>
              </div>
            </div>

            {discrepancy && (
              <div style={{ background:discrepancy.diff===0?C.greenLight:C.redLight, border:`1.5px solid ${discrepancy.diff===0?C.green:C.red}`, borderRadius:8, padding:14, marginBottom:14 }}>
                {discrepancy.diff===0
                  ? <div style={{ fontWeight:700, color:C.green }}>✓ Cash matches system total. All good!</div>
                  : <>
                      <div style={{ fontWeight:700, color:C.red }}>⚠ Discrepancy Detected</div>
                      <div style={{ fontSize:13, marginTop:6, color:C.textMid }}>
                        System: UGX {discrepancy.system.toLocaleString()}<br/>
                        Physical: UGX {discrepancy.physical.toLocaleString()}<br/>
                        <b style={{color:C.red}}>Difference: {discrepancy.diff>0?"+":" "}UGX {discrepancy.diff.toLocaleString()}</b>
                      </div>
                    </>}
              </div>
            )}

            <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
              <Btn color={C.green} onClick={handleEODConfirm}><CheckCircle size={13}/> Confirm Count</Btn>
              <Btn danger onClick={()=>setDiscrepancy({ ...discrepancy, diff:-1 })}><AlertCircle size={13}/> Report Discrepancy</Btn>
            </div>
          </div>

          <div>
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              <Btn outline color={C.accent} onClick={handleExport}><Download size={13}/> Export Today's Transactions (.csv)</Btn>
              <Btn outline color={C.textMid} onClick={handleExportAll}><Download size={13}/> Export All Transactions (.csv)</Btn>
              <Btn outline color={C.purple} onClick={()=>window.print()}><Printer size={13}/> Print EOD Report</Btn>
            </div>
            <div style={{ marginTop:16, background:"#f8fafc", borderRadius:8, padding:12 }}>
              <div style={{ fontWeight:600, fontSize:12, color:C.textMid, marginBottom:8 }}>QUICK STATS — TODAY</div>
              {[["Patients served", todayTxns.length],["Avg bill", todayTxns.length?`UGX ${Math.round(todayTotal/todayTxns.length).toLocaleString()}`:"N/A"],["Highest bill",`UGX ${(Math.max(...todayTxns.map(t=>t.amount),0)).toLocaleString()}`]].map(([l,v])=>(
                <div key={l} style={{ display:"flex", justifyContent:"space-between", fontSize:13, padding:"5px 0", borderBottom:`1px solid ${C.border}` }}>
                  <span style={{ color:C.textMid }}>{l}</span><span style={{ fontWeight:600 }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* All transactions table */}
      <Card title={`All Transactions (${transactions.length})`}>
        {transactions.length===0 ? <EmptyState icon="💳" message="No transactions recorded"/> : (
          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
              <thead><tr style={{ borderBottom:`2px solid ${C.border}` }}>
                {["TXN ID","Date","Patient","Services","Amount","Method","Cashier"].map(h=>(
                  <th key={h} style={{ textAlign:"left", padding:"7px 8px", fontSize:11, color:C.textLight, fontWeight:700, textTransform:"uppercase" }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {[...transactions].reverse().map(t=>(
                  <tr key={t.id} style={{ borderBottom:`1px solid ${C.border}` }}>
                    <td style={{ padding:"8px", fontFamily:"'IBM Plex Mono',monospace", fontSize:10, color:C.textLight }}>{t.id}</td>
                    <td style={{ padding:"8px", fontFamily:"'IBM Plex Mono',monospace", fontSize:11 }}>{t.date}</td>
                    <td style={{ padding:"8px", fontWeight:600 }}>{t.patientName}</td>
                    <td style={{ padding:"8px", color:C.textMid, maxWidth:200, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{(t.services||[]).join(", ")}</td>
                    <td style={{ padding:"8px", fontWeight:700, color:C.green }}>UGX {t.amount?.toLocaleString()}</td>
                    <td style={{ padding:"8px" }}>{t.method}</td>
                    <td style={{ padding:"8px", color:C.textMid }}>{t.cashier}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
