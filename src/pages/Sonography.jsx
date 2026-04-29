import { useState } from "react";
import { CheckCircle, Printer, Plus } from "lucide-react";
import { C, now, today, genId } from "../theme";
import { Badge, Btn, Input, Select, Textarea, Card, EmptyState } from "../ui";
import { api } from "../api";

export function SonographyView({ patients, queue, services, user, reload }) {
  const sonoQueue = queue.filter(e => e.stage === "sonography");
  const [pid, setPid]       = useState(null);
  const [saving, setSaving] = useState(false);
  const [scanSearch, setScanSearch] = useState("");
  const [selectedScan, setSelectedScan] = useState(null);
  const [findings, setFindings]   = useState("");
  const [impression, setImpression] = useState("");
  const [recommendation, setRecommendation] = useState("");
  const [routeTo, setRouteTo]     = useState("doctor");

  const patient    = patients.find(p => p.id === pid);
  const sonoServices = (services||[]).filter(s => s.active && s.category === "Sonography");
  const filteredScans = scanSearch.trim()
    ? sonoServices.filter(s => s.name.toLowerCase().includes(scanSearch.toLowerCase()))
    : sonoServices;
  const history    = patient?.sonographyReports || [];

  const getPriceForPatient = (svc) => {
    if (!patient) return svc.price;
    return patient.isInsurance ? (svc.insurancePrice || svc.price) : svc.price;
  };

  const save = async () => {
    if (!selectedScan || !findings.trim()) { alert("Select a scan type and enter findings."); return; }
    setSaving(true);
    try {
      const report = {
        id: genId("SONO"), date: today(), time: now(), by: user.name,
        scanType: selectedScan.name,
        price: getPriceForPatient(selectedScan),
        findings, impression, recommendation,
      };
      await api.updatePatient(pid, { addSonographyReport: report });

      // Add cost to bill
      try {
        const bill = await api.getPatientBill(pid);
        if (bill && !patient?.isFree) {
          await api.addBillItem(bill.id, {
            name: selectedScan.name,
            price: getPriceForPatient(selectedScan),
            qty: 1, category: "Sonography",
          });
        }
      } catch(e) { console.warn("Bill add failed:", e); }

      // Route patient
      await api.updateQueue(pid, { stage: routeTo });

      // Reset
      setSelectedScan(null);
      setScanSearch("");
      setFindings("");
      setImpression("");
      setRecommendation("");
      setPid(null);
      reload();
    } catch(e) { alert(e.message); } finally { setSaving(false); }
  };

  const printReport = (r) => {
    if (!patient) return;
    const win = window.open("","_blank","width=600,height=700");
    win.document.write(`<!DOCTYPE html><html><head><title>Sonography Report</title>
    <style>body{font-family:Arial,sans-serif;padding:30px;font-size:13px;max-width:540px;margin:0 auto}
    h2{text-align:center;margin-bottom:4px}.sub{text-align:center;color:#666;font-size:11px;margin-bottom:20px}
    .row{display:flex;justify-content:space-between;margin-bottom:6px}
    .section{margin:14px 0}.section h3{font-size:12px;text-transform:uppercase;color:#666;border-bottom:1px solid #eee;padding-bottom:4px;margin-bottom:8px}
    p{margin:0;line-height:1.6}
    @media print{button{display:none}}</style></head><body>
    <h2>🔊 SONOGRAPHY REPORT</h2>
    <div class="sub">HMS CLINIC</div>
    <div class="row"><span><b>Patient:</b> ${patient.name}</span><span><b>ID:</b> ${patient.id}</span></div>
    <div class="row"><span><b>Scan:</b> ${r.scanType}</span><span><b>Date:</b> ${r.date} · ${r.time}</span></div>
    <div class="row"><span><b>Sonographer:</b> ${r.by}</span><span></span></div>
    <div class="section"><h3>Findings</h3><p>${r.findings||"-"}</p></div>
    <div class="section"><h3>Impression</h3><p>${r.impression||"-"}</p></div>
    <div class="section"><h3>Recommendation</h3><p>${r.recommendation||"-"}</p></div>
    <br/><div style="border-top:1px solid #333;padding-top:10px;font-size:11px;color:#666">
      ${!patient.isFree?`Charge: UGX ${r.price?.toLocaleString()||0}`:"COVERED — no charge"}
    </div>
    <button onclick="window.print()" style="margin-top:16px;padding:8px 20px;background:#7c3aed;color:#fff;border:none;border-radius:6px;cursor:pointer">🖨 Print Report</button>
    </body></html>`);
    win.document.close();
  };

  return (
    <div style={{ padding:24, display:"grid", gridTemplateColumns:"280px 1fr", gap:18 }}>
      <div>
        <div style={{ background:"linear-gradient(135deg,#7c3aed,#6d28d9)", borderRadius:12, padding:"16px 20px", color:"#fff", marginBottom:14 }}>
          <div style={{ fontSize:11, opacity:0.8, marginBottom:2 }}>SONOGRAPHY / IMAGING</div>
          <div style={{ fontSize:28, fontWeight:800 }}>{sonoQueue.length}</div>
        </div>
        <Card>
          {sonoQueue.length===0
            ? <EmptyState icon="🔊" message="No patients awaiting scan"/>
            : sonoQueue.map(entry=>(
              <div key={entry.patientId} onClick={()=>setPid(entry.patientId)}
                style={{ padding:10, borderRadius:8, border:`1.5px solid ${pid===entry.patientId?"#7c3aed":C.border}`,
                  cursor:"pointer", marginBottom:8, background:pid===entry.patientId?"#f5f3ff":"transparent" }}>
                <div style={{ fontWeight:700, fontSize:13 }}>{entry.name}</div>
                <div style={{ fontSize:10, color:C.textMid }}>{entry.patientId}</div>
                {entry.complaint && <div style={{ fontSize:11, color:"#7c3aed", marginTop:3 }}>📋 {entry.complaint}</div>}
              </div>
            ))
          }
        </Card>
      </div>

      <div>
        {!pid ? (
          <div style={{ textAlign:"center", padding:"80px 20px", color:C.textLight }}>
            <div style={{ fontSize:48, marginBottom:16 }}>🔊</div>
            <div style={{ fontSize:16, fontWeight:600, marginBottom:8 }}>Select a patient from the queue</div>
          </div>
        ) : !patient ? (
          <EmptyState icon="❓" message="Patient not found"/>
        ) : (
          <>
            <Card style={{ marginBottom:14 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                <div>
                  <div style={{ fontWeight:800, fontSize:18 }}>{patient.name}</div>
                  <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:12, color:C.textMid }}>{patient.id}</div>
                  <div style={{ fontSize:12, color:C.textMid, marginTop:3 }}>{patient.category}
                    {patient.isInsurance && <span style={{ color:C.blue, fontWeight:700 }}> · INSURED</span>}
                    {patient.isFree && <span style={{ color:C.green, fontWeight:700 }}> · COVERED</span>}
                  </div>
                </div>
                <Badge label="AT SONOGRAPHY" color="#7c3aed"/>
              </div>
            </Card>

            {/* Previous reports */}
            {history.length>0 && (
              <Card title="Previous Reports" style={{ marginBottom:14 }}>
                {history.map((r,i)=>(
                  <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 0", borderBottom:`1px solid ${C.border}` }}>
                    <div>
                      <div style={{ fontWeight:600, fontSize:13 }}>🔊 {r.scanType}</div>
                      <div style={{ fontSize:11, color:C.textMid }}>{r.date} · {r.by}</div>
                    </div>
                    <Btn small outline color="#7c3aed" onClick={()=>printReport(r)}><Printer size={11}/> Print</Btn>
                  </div>
                ))}
              </Card>
            )}

            {/* New scan */}
            <Card title="New Scan Report">
              {/* Scan type searchable */}
              <div style={{ position:"relative", marginBottom:14 }}>
                <div style={{ fontSize:11, fontWeight:700, color:C.textMid, textTransform:"uppercase", marginBottom:6 }}>Scan Type ★</div>
                <input value={scanSearch} onChange={e=>{ setScanSearch(e.target.value); setSelectedScan(null); }}
                  placeholder="Search scan type (e.g. obstetric, abdominal)…"
                  style={{ width:"100%", padding:"9px 12px", border:`1.5px solid #7c3aed`, borderRadius:8, fontSize:13, fontFamily:"inherit", boxSizing:"border-box" }}/>
                {scanSearch.trim() && !selectedScan && (
                  <div style={{ position:"absolute", top:"100%", left:0, right:0, zIndex:20, background:"#fff", border:`1.5px solid ${C.border}`, borderRadius:8, marginTop:4, maxHeight:200, overflowY:"auto", boxShadow:"0 8px 24px rgba(0,0,0,0.12)" }}>
                    {filteredScans.length===0
                      ? <div style={{ padding:14, fontSize:12, color:C.textLight, textAlign:"center" }}>No matching scans</div>
                      : filteredScans.map(s=>(
                        <div key={s.id} onClick={()=>{ setSelectedScan(s); setScanSearch(s.name); }}
                          style={{ padding:"10px 14px", cursor:"pointer", borderBottom:`1px solid ${C.border}`, display:"flex", justifyContent:"space-between" }}
                          onMouseEnter={e=>e.currentTarget.style.background="#f5f3ff"}
                          onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                          <span style={{ fontWeight:600 }}>🔊 {s.name}</span>
                          <span style={{ fontWeight:700, color:C.green }}>
                            UGX {(patient.isInsurance?(s.insurancePrice||s.price):s.price).toLocaleString()}
                            {patient.isInsurance && <span style={{ fontSize:10, color:C.textLight }}> (ins.)</span>}
                          </span>
                        </div>
                      ))
                    }
                  </div>
                )}
                {selectedScan && (
                  <div style={{ marginTop:8, padding:"10px 14px", background:"#f5f3ff", border:`1.5px solid #7c3aed`, borderRadius:8, display:"flex", justifyContent:"space-between" }}>
                    <span style={{ fontWeight:700 }}>🔊 {selectedScan.name}</span>
                    <span style={{ fontWeight:700, color:C.green }}>UGX {getPriceForPatient(selectedScan).toLocaleString()}{patient.isInsurance?" (insurance rate)":""}</span>
                  </div>
                )}
              </div>

              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 }}>
                <Select label="Route Patient After Scan" value={routeTo} onChange={setRouteTo}
                  options={[{value:"doctor",label:"→ Doctor"},{value:"pharmacy",label:"→ Pharmacy"},{value:"done",label:"→ Done (discharge)"}]}/>
              </div>

              <Textarea label="Findings ★" value={findings} onChange={setFindings} rows={4} placeholder="Describe ultrasound findings in detail…"/>
              <div style={{ marginTop:12 }}>
                <Textarea label="Impression / Diagnosis" value={impression} onChange={setImpression} rows={2} placeholder="e.g. Single live intrauterine fetus, cephalic presentation, ~28 weeks"/>
              </div>
              <div style={{ marginTop:12 }}>
                <Textarea label="Recommendation" value={recommendation} onChange={setRecommendation} rows={2} placeholder="e.g. Follow-up scan in 4 weeks, correlate clinically"/>
              </div>
              {patient.isFree && (
                <div style={{ marginTop:10, padding:"8px 14px", background:"#f0fdf4", border:`1px solid ${C.green}`, borderRadius:8, fontSize:12, color:C.green, fontWeight:600 }}>
                  ✅ COVERED — no charge will be recorded for this patient
                </div>
              )}
              <div style={{ marginTop:14, display:"flex", gap:10 }}>
                <Btn color="#7c3aed" onClick={save} disabled={saving}><CheckCircle size={13}/> {saving?"Saving…":"Save Report & Route Patient"}</Btn>
              </div>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}