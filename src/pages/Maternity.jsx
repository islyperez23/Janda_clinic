import { useState } from "react";
import { Baby, Heart, FileText, Plus, CheckCircle, Printer, ClipboardList, AlertCircle } from "lucide-react";
import { C, now, today, genId } from "../theme";
import { Badge, Btn, Input, Select, Textarea, Card, EmptyState } from "../ui";
import { api } from "../api";

// ─── Maternity / ANC View ────────────────────────────────────────────────────
export function MaternityView({ patients, queue, user, services, reload }) {
  const matQueue = queue.filter(e => e.stage === "maternity");
  const [pid, setPid]           = useState(null);
  const [section, setSection]   = useState("anc"); // anc | birth | postnatal
  const [tab, setTab]           = useState("visits"); // visits | new
  const [saving, setSaving]     = useState(false);

  // ANC visit form
  const blankANC = { gestation:"", bp:"", weight:"", fundalHeight:"", fetalHR:"", presentation:"", urinalysis:"", hb:"", complaints:"", advice:"", nextVisit:"", returnDate:"" };
  const [ancForm, setAncForm]   = useState(blankANC);
  const setA = (k,v) => setAncForm(f=>({...f,[k]:v}));

  // Birth record form
  const blankBirth = { deliveryDate:today(), deliveryTime:now(), deliveryMode:"Normal (SVD)", sex:"M", birthWeight:"", apgar1:"", apgar5:"", motherCondition:"Stable", complications:"", attendedBy:"", notes:"" };
  const [birthForm, setBirthForm] = useState(blankBirth);
  const setB = (k,v) => setBirthForm(f=>({...f,[k]:v}));

  // Postnatal form
  const blankPN = { daysPP:"", bpMother:"", uterusInvolution:"", lochia:"", woundHealing:"", breastfeeding:"", babyWeight:"", babyCondition:"", advice:"", nextVisit:"" };
  const [pnForm, setPnForm]     = useState(blankPN);
  const setP = (k,v) => setPnForm(f=>({...f,[k]:v}));

  const patient  = patients.find(p=>p.id===pid);
  const matRecord = patient?.maternity || { ancVisits:[], births:[], postnatal:[] };

  const saveANC = async () => {
    if (!ancForm.gestation||!ancForm.bp) { alert("Gestation weeks and BP are required."); return; }
    setSaving(true);
    try {
      const visit = { id:genId("ANC"), date:today(), time:now(), by:user.name, ...ancForm };
      await api.updatePatient(pid, { maternity:{ ...matRecord, ancVisits:[...(matRecord.ancVisits||[]), visit] } });
      setAncForm(blankANC);
      setTab("visits");
      reload();
    } catch(e) { alert(e.message); } finally { setSaving(false); }
  };

  const saveBirth = async () => {
    if (!birthForm.deliveryDate) { alert("Delivery date is required."); return; }
    setSaving(true);
    try {
      const birth = { id:genId("BIRTH"), recordedBy:user.name, recordedAt:now(), ...birthForm };
      await api.updatePatient(pid, { maternity:{ ...matRecord, births:[...(matRecord.births||[]), birth] } });
      // Also add to billing
      try {
        const bill = await api.getPatientBill(pid);
        if (bill) {
          const fee = birthForm.deliveryMode.includes("C-Section") ? 500000 : 150000;
          const insurFee = birthForm.deliveryMode.includes("C-Section") ? 350000 : 100000;
          const price = patient?.isInsurance ? insurFee : fee;
          await api.addBillItem(bill.id, { name:`Delivery (${birthForm.deliveryMode})`, price, qty:1, category:"Maternity" });
        }
      } catch(e) { console.warn("Bill item failed:", e); }
      setBirthForm(blankBirth);
      setTab("visits");
      reload();
    } catch(e) { alert(e.message); } finally { setSaving(false); }
  };

  const savePostnatal = async () => {
    setSaving(true);
    try {
      const visit = { id:genId("PN"), date:today(), time:now(), by:user.name, ...pnForm };
      await api.updatePatient(pid, { maternity:{ ...matRecord, postnatal:[...(matRecord.postnatal||[]), visit] } });
      setPnForm(blankPN);
      setTab("visits");
      reload();
    } catch(e) { alert(e.message); } finally { setSaving(false); }
  };

  const printANCCard = () => {
    if (!patient) return;
    const visits = (matRecord.ancVisits||[]);
    const rows = visits.map(v=>`
      <tr>
        <td>${v.date}</td><td>${v.gestation} wks</td><td>${v.bp}</td>
        <td>${v.weight||"-"} kg</td><td>${v.fetalHR||"-"}</td>
        <td>${v.presentation||"-"}</td><td>${v.hb||"-"}</td>
      </tr>`).join("");
    const win = window.open("","_blank","width=800,height=600");
    win.document.write(`<!DOCTYPE html><html><head><title>ANC Card</title>
    <style>body{font-family:Arial,sans-serif;padding:20px;font-size:12px}
    h2{text-align:center}table{width:100%;border-collapse:collapse;margin-top:12px}
    th,td{border:1px solid #ccc;padding:6px 8px;text-align:left}th{background:#f0f9ff}
    .header{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px}
    .field{margin-bottom:6px}.label{font-weight:bold;font-size:10px;text-transform:uppercase;color:#666}
    @media print{button{display:none}}</style></head><body>
    <h2>🤱 ANTENATAL CARE CARD</h2>
    <div class="header">
      <div>
        <div class="field"><span class="label">Patient Name:</span> ${patient.name}</div>
        <div class="field"><span class="label">ID:</span> ${patient.id}</div>
        <div class="field"><span class="label">DOB:</span> ${patient.dob||"-"}</div>
        <div class="field"><span class="label">Category:</span> ${patient.category}</div>
      </div>
      <div>
        <div class="field"><span class="label">Phone:</span> ${patient.phone||"-"}</div>
        <div class="field"><span class="label">Emergency Contact:</span> ${patient.emergencyContact||"-"}</div>
        <div class="field"><span class="label">ANC Visits:</span> ${visits.length}</div>
        <div class="field"><span class="label">Printed:</span> ${new Date().toLocaleString()}</div>
      </div>
    </div>
    <table>
      <thead><tr><th>Date</th><th>Gestation</th><th>BP</th><th>Weight</th><th>Fetal HR</th><th>Presentation</th><th>Hb</th></tr></thead>
      <tbody>${rows||"<tr><td colspan='7' style='text-align:center'>No visits recorded</td></tr>"}</tbody>
    </table>
    <button onclick="window.print()" style="margin-top:16px;padding:8px 20px;background:#0e7490;color:#fff;border:none;border-radius:6px;cursor:pointer">🖨 Print ANC Card</button>
    </body></html>`);
    win.document.close();
  };

  const sectionTabs = [
    { id:"anc", icon:"🤰", label:"ANC Visits" },
    { id:"birth", icon:"👶", label:"Birth Records" },
    { id:"postnatal", icon:"🤱", label:"Postnatal" },
  ];

  return (
    <div style={{ padding:24, display:"grid", gridTemplateColumns:"280px 1fr", gap:18 }}>

      {/* ── Left: queue + patient selector ── */}
      <div>
        <div style={{ background:"linear-gradient(135deg,#db2777,#be185d)", borderRadius:12, padding:"16px 20px", color:"#fff", marginBottom:14 }}>
          <div style={{ fontSize:11, opacity:0.8, marginBottom:2 }}>MATERNITY / ANC</div>
          <div style={{ fontSize:28, fontWeight:800 }}>{matQueue.length}</div>
          <div style={{ fontSize:11, opacity:0.7, marginTop:4 }}>patients in queue</div>
        </div>

        <Card title="Queue">
          {matQueue.length===0
            ? <EmptyState icon="🤱" message="No maternity patients in queue"/>
            : matQueue.map(entry=>(
              <div key={entry.patientId} onClick={()=>{ setPid(entry.patientId); setTab("visits"); }}
                style={{ padding:"10px", borderRadius:8,
                  border:`1.5px solid ${pid===entry.patientId?"#db2777":C.border}`,
                  cursor:"pointer", marginBottom:8,
                  background:pid===entry.patientId?"#fdf2f8":"transparent" }}>
                <div style={{ fontWeight:700, fontSize:13 }}>{entry.name}</div>
                <div style={{ fontSize:10, color:C.textMid, fontFamily:"'IBM Plex Mono',monospace" }}>{entry.patientId}</div>
                <div style={{ fontSize:10, color:"#db2777", fontWeight:600, marginTop:3 }}>{entry.category||""}</div>
              </div>
            ))
          }
        </Card>

        {/* Also show all ANC patients (for follow-up visits) */}
        <Card title="All ANC / Maternity Patients" style={{ marginTop:14 }}>
          <div style={{ maxHeight:300, overflowY:"auto" }}>
            {patients.filter(p=>p.category==="ANC / Maternity"||p.maternity).length===0
              ? <EmptyState icon="🤰" message="No registered maternity patients"/>
              : patients.filter(p=>p.category==="ANC / Maternity"||p.maternity).map(p=>(
                <div key={p.id} onClick={()=>{ setPid(p.id); setTab("visits"); }}
                  style={{ padding:"8px", borderRadius:7, cursor:"pointer", marginBottom:6,
                    border:`1.5px solid ${pid===p.id?"#db2777":C.border}`,
                    background:pid===p.id?"#fdf2f8":"transparent" }}>
                  <div style={{ fontWeight:600, fontSize:12 }}>{p.name}</div>
                  <div style={{ fontSize:10, color:C.textMid }}>{p.id}</div>
                  <div style={{ fontSize:10, color:"#db2777" }}>
                    {(p.maternity?.ancVisits||[]).length} ANC · {(p.maternity?.births||[]).length} births
                  </div>
                </div>
              ))
            }
          </div>
        </Card>
      </div>

      {/* ── Right: maternity records ── */}
      <div>
        {!pid ? (
          <div style={{ textAlign:"center", padding:"80px 20px", color:C.textLight }}>
            <div style={{ fontSize:48, marginBottom:16 }}>🤱</div>
            <div style={{ fontSize:16, fontWeight:600, marginBottom:8 }}>Select a patient</div>
            <div style={{ fontSize:13 }}>Choose from the queue or the ANC patient list</div>
          </div>
        ) : !patient ? (
          <EmptyState icon="❓" message="Patient not found"/>
        ) : (
          <>
            {/* Patient header */}
            <Card style={{ marginBottom:14 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:10 }}>
                <div>
                  <div style={{ fontWeight:800, fontSize:20 }}>{patient.name}</div>
                  <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:12, color:C.textMid }}>{patient.id}</div>
                  <div style={{ fontSize:12, color:C.textMid, marginTop:3 }}>
                    DOB: {patient.dob||"-"} · {patient.gender==="F"?"Female":"Male"} · {patient.category}
                    {patient.isInsurance && <span style={{ color:C.blue, fontWeight:700 }}> · INSURED ({patient.insuranceProvider})</span>}
                    {patient.isFree && <span style={{ color:C.green, fontWeight:700 }}> · COVERED</span>}
                  </div>
                  <div style={{ fontSize:11, color:C.textLight, marginTop:2 }}>
                    📞 {patient.phone||"-"} · 🆘 {patient.emergencyContact||"-"}
                  </div>
                </div>
                <div style={{ display:"flex", gap:8 }}>
                  <Btn small outline color="#db2777" onClick={printANCCard}><Printer size={12}/> ANC Card</Btn>
                </div>
              </div>
              {/* Summary badges */}
              <div style={{ display:"flex", gap:10, marginTop:12, flexWrap:"wrap" }}>
                <div style={{ background:"#fdf2f8", border:"1px solid #fbcfe8", borderRadius:8, padding:"6px 14px", fontSize:12, fontWeight:700, color:"#db2777" }}>
                  🤰 {(matRecord.ancVisits||[]).length} ANC Visits
                </div>
                <div style={{ background:"#f0fdf4", border:"1px solid #bbf7d0", borderRadius:8, padding:"6px 14px", fontSize:12, fontWeight:700, color:C.green }}>
                  👶 {(matRecord.births||[]).length} Birth{(matRecord.births||[]).length!==1?"s":""}
                </div>
                <div style={{ background:"#eff6ff", border:"1px solid #bfdbfe", borderRadius:8, padding:"6px 14px", fontSize:12, fontWeight:700, color:C.blue }}>
                  🤱 {(matRecord.postnatal||[]).length} Postnatal Visits
                </div>
              </div>
            </Card>

            {/* Section tabs */}
            <div style={{ display:"flex", gap:0, marginBottom:16, background:"#f1f5f9", borderRadius:10, padding:4 }}>
              {sectionTabs.map(s=>(
                <button key={s.id} onClick={()=>{ setSection(s.id); setTab("visits"); }}
                  style={{ flex:1, padding:"10px 6px", borderRadius:8, border:"none", cursor:"pointer", fontSize:13, fontWeight:700,
                    background:section===s.id?"#fff":"transparent",
                    color:section===s.id?"#db2777":C.textMid,
                    boxShadow:section===s.id?"0 1px 4px rgba(0,0,0,0.08)":"none", transition:"all 0.15s" }}>
                  {s.icon} {s.label}
                </button>
              ))}
            </div>

            {/* ═══ ANC SECTION ═══ */}
            {section==="anc" && (
              <>
                <div style={{ display:"flex", gap:10, marginBottom:14 }}>
                  <Btn small color={tab==="visits"?"#db2777":undefined} outline={tab!=="visits"} onClick={()=>setTab("visits")}><ClipboardList size={12}/> Visit History</Btn>
                  <Btn small color={tab==="new"?"#db2777":undefined} outline={tab!=="new"} onClick={()=>setTab("new")}><Plus size={12}/> New ANC Visit</Btn>
                </div>

                {tab==="visits" && (
                  <Card title="ANC Visit History">
                    {(matRecord.ancVisits||[]).length===0
                      ? <EmptyState icon="🤰" message="No ANC visits recorded yet"/>
                      : [...(matRecord.ancVisits||[])].reverse().map((v,i)=>(
                        <div key={v.id||i} style={{ padding:"14px", marginBottom:12, background:"#fdf2f8", borderRadius:10, border:"1px solid #fbcfe8" }}>
                          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
                            <div style={{ fontWeight:700, fontSize:14 }}>Visit {(matRecord.ancVisits||[]).length - i}</div>
                            <div style={{ fontSize:12, color:C.textMid }}>{v.date} · {v.by}</div>
                          </div>
                          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8, fontSize:12 }}>
                            {[["Gestation",v.gestation+" wks"],["BP",v.bp],["Weight",v.weight+" kg"],["Fetal HR",v.fetalHR],["Presentation",v.presentation],["Hb",v.hb],["Urinalysis",v.urinalysis],["Next Visit",v.returnDate]].filter(([,val])=>val&&val!=="undefined").map(([k,val])=>(
                              <div key={k} style={{ background:"#fff", borderRadius:7, padding:"7px 10px" }}>
                                <div style={{ fontSize:9, color:C.textLight, textTransform:"uppercase", fontWeight:700, marginBottom:2 }}>{k}</div>
                                <div style={{ fontWeight:700 }}>{val||"-"}</div>
                              </div>
                            ))}
                          </div>
                          {v.complaints && <div style={{ marginTop:8, fontSize:12 }}><b>Complaints:</b> {v.complaints}</div>}
                          {v.advice && <div style={{ marginTop:4, fontSize:12 }}><b>Advice:</b> {v.advice}</div>}
                        </div>
                      ))
                    }
                  </Card>
                )}

                {tab==="new" && (
                  <Card title="New ANC Visit">
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12 }}>
                      <Input label="Gestation (weeks) ★" value={ancForm.gestation} onChange={v=>setA("gestation",v)} placeholder="e.g. 28"/>
                      <Input label="Blood Pressure ★" value={ancForm.bp} onChange={v=>setA("bp",v)} placeholder="e.g. 120/80"/>
                      <Input label="Weight (kg)" value={ancForm.weight} onChange={v=>setA("weight",v)} placeholder="e.g. 62"/>
                      <Input label="Fundal Height (cm)" value={ancForm.fundalHeight} onChange={v=>setA("fundalHeight",v)} placeholder="e.g. 26"/>
                      <Input label="Fetal Heart Rate" value={ancForm.fetalHR} onChange={v=>setA("fetalHR",v)} placeholder="e.g. 148 bpm"/>
                      <Select label="Presentation" value={ancForm.presentation} onChange={v=>setA("presentation",v)}
                        options={["","Cephalic","Breech","Transverse","Unknown"]}/>
                      <Input label="Urinalysis" value={ancForm.urinalysis} onChange={v=>setA("urinalysis",v)} placeholder="e.g. Normal / Protein +"/>
                      <Input label="Haemoglobin (Hb)" value={ancForm.hb} onChange={v=>setA("hb",v)} placeholder="e.g. 11.2 g/dL"/>
                      <Input label="Next Visit / Return Date" value={ancForm.returnDate} onChange={v=>setA("returnDate",v)} type="date"/>
                    </div>
                    <div style={{ marginTop:12, display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                      <Textarea label="Complaints / Observations" value={ancForm.complaints} onChange={v=>setA("complaints",v)} rows={3} placeholder="Patient's complaints and clinical findings"/>
                      <Textarea label="Advice Given" value={ancForm.advice} onChange={v=>setA("advice",v)} rows={3} placeholder="Dietary, medication, lifestyle advice"/>
                    </div>
                    <div style={{ marginTop:14, display:"flex", gap:10 }}>
                      <Btn color="#db2777" onClick={saveANC} disabled={saving}><CheckCircle size={13}/> {saving?"Saving…":"Save ANC Visit"}</Btn>
                      <Btn outline onClick={()=>{ setAncForm(blankANC); setTab("visits"); }}>Cancel</Btn>
                    </div>
                  </Card>
                )}
              </>
            )}

            {/* ═══ BIRTH RECORDS SECTION ═══ */}
            {section==="birth" && (
              <>
                <div style={{ display:"flex", gap:10, marginBottom:14 }}>
                  <Btn small color={tab==="visits"?"#db2777":undefined} outline={tab!=="visits"} onClick={()=>setTab("visits")}><Baby size={12}/> Birth Records</Btn>
                  <Btn small color={tab==="new"?"#db2777":undefined} outline={tab!=="new"} onClick={()=>setTab("new")}><Plus size={12}/> Record a Birth</Btn>
                </div>

                {tab==="visits" && (
                  <Card title="Birth Records">
                    {(matRecord.births||[]).length===0
                      ? <EmptyState icon="👶" message="No birth records yet"/>
                      : (matRecord.births||[]).map((b,i)=>(
                        <div key={b.id||i} style={{ padding:14, marginBottom:12, background:"#f0fdf4", borderRadius:10, border:`1px solid ${C.green}44` }}>
                          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
                            <div style={{ fontWeight:700, fontSize:15 }}>👶 Birth #{i+1} — {b.deliveryDate} at {b.deliveryTime}</div>
                            <Badge label={b.deliveryMode} color={C.green}/>
                          </div>
                          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8, fontSize:12 }}>
                            {[["Sex",b.sex==="M"?"Male":"Female"],["Birth Weight",b.birthWeight+" kg"],["APGAR 1min",b.apgar1],["APGAR 5min",b.apgar5],["Mother Condition",b.motherCondition],["Attended By",b.attendedBy]].filter(([,val])=>val).map(([k,val])=>(
                              <div key={k} style={{ background:"#fff", borderRadius:7, padding:"7px 10px" }}>
                                <div style={{ fontSize:9, color:C.textLight, textTransform:"uppercase", fontWeight:700, marginBottom:2 }}>{k}</div>
                                <div style={{ fontWeight:700 }}>{val||"-"}</div>
                              </div>
                            ))}
                          </div>
                          {b.complications && <div style={{ marginTop:8, fontSize:12, color:C.red }}><b>Complications:</b> {b.complications}</div>}
                          {b.notes && <div style={{ marginTop:4, fontSize:12 }}><b>Notes:</b> {b.notes}</div>}
                        </div>
                      ))
                    }
                  </Card>
                )}

                {tab==="new" && (
                  <Card title="Record a Birth">
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12 }}>
                      <Input label="Delivery Date ★" value={birthForm.deliveryDate} onChange={v=>setB("deliveryDate",v)} type="date"/>
                      <Input label="Delivery Time" value={birthForm.deliveryTime} onChange={v=>setB("deliveryTime",v)} type="time"/>
                      <Select label="Delivery Mode ★" value={birthForm.deliveryMode} onChange={v=>setB("deliveryMode",v)}
                        options={["Normal (SVD)","Instrumental (Vacuum)","Instrumental (Forceps)","C-Section (Emergency)","C-Section (Elective)"]}/>
                      <Select label="Baby Sex" value={birthForm.sex} onChange={v=>setB("sex",v)} options={["M","F"]}/>
                      <Input label="Birth Weight (kg)" value={birthForm.birthWeight} onChange={v=>setB("birthWeight",v)} placeholder="e.g. 3.2"/>
                      <Input label="APGAR Score (1 min)" value={birthForm.apgar1} onChange={v=>setB("apgar1",v)} placeholder="0–10"/>
                      <Input label="APGAR Score (5 min)" value={birthForm.apgar5} onChange={v=>setB("apgar5",v)} placeholder="0–10"/>
                      <Select label="Mother's Condition" value={birthForm.motherCondition} onChange={v=>setB("motherCondition",v)}
                        options={["Stable","Needs monitoring","Critical","Transferred"]}/>
                      <Input label="Attended By" value={birthForm.attendedBy} onChange={v=>setB("attendedBy",v)} placeholder="Midwife / Doctor name"/>
                    </div>
                    <div style={{ marginTop:12, display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                      <Textarea label="Complications (if any)" value={birthForm.complications} onChange={v=>setB("complications",v)} rows={3} placeholder="e.g. PPH, perineal tear, shoulder dystocia…"/>
                      <Textarea label="Additional Notes" value={birthForm.notes} onChange={v=>setB("notes",v)} rows={3} placeholder="Any other observations…"/>
                    </div>
                    {!patient.isFree && (
                      <div style={{ marginTop:10, padding:"10px 14px", background:"#fffbeb", border:`1px solid ${C.amber}`, borderRadius:8, fontSize:12, color:C.amber, fontWeight:600 }}>
                        💳 Delivery fee will be auto-added to this patient's bill:
                        {patient.isInsurance
                          ? ` UGX ${birthForm.deliveryMode.includes("C-Section")?"350,000":"100,000"} (insurance rate)`
                          : ` UGX ${birthForm.deliveryMode.includes("C-Section")?"500,000":"150,000"}`}
                      </div>
                    )}
                    <div style={{ marginTop:14, display:"flex", gap:10 }}>
                      <Btn color={C.green} onClick={saveBirth} disabled={saving}><Baby size={13}/> {saving?"Saving…":"Record Birth"}</Btn>
                      <Btn outline onClick={()=>{ setBirthForm(blankBirth); setTab("visits"); }}>Cancel</Btn>
                    </div>
                  </Card>
                )}
              </>
            )}

            {/* ═══ POSTNATAL SECTION ═══ */}
            {section==="postnatal" && (
              <>
                <div style={{ display:"flex", gap:10, marginBottom:14 }}>
                  <Btn small color={tab==="visits"?"#db2777":undefined} outline={tab!=="visits"} onClick={()=>setTab("visits")}><Heart size={12}/> Postnatal Visits</Btn>
                  <Btn small color={tab==="new"?"#db2777":undefined} outline={tab!=="new"} onClick={()=>setTab("new")}><Plus size={12}/> New Postnatal Visit</Btn>
                </div>

                {tab==="visits" && (
                  <Card title="Postnatal Visit History">
                    {(matRecord.postnatal||[]).length===0
                      ? <EmptyState icon="🤱" message="No postnatal visits recorded yet"/>
                      : [...(matRecord.postnatal||[])].reverse().map((v,i)=>(
                        <div key={v.id||i} style={{ padding:14, marginBottom:12, background:"#eff6ff", borderRadius:10, border:`1px solid ${C.blue}44` }}>
                          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
                            <div style={{ fontWeight:700, fontSize:14 }}>{v.daysPP ? `Day ${v.daysPP} Postnatal` : "Postnatal Visit"}</div>
                            <div style={{ fontSize:12, color:C.textMid }}>{v.date} · {v.by}</div>
                          </div>
                          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8, fontSize:12 }}>
                            {[["Mother BP",v.bpMother],["Uterus",v.uterusInvolution],["Lochia",v.lochia],["Wound",v.woundHealing],["Breastfeeding",v.breastfeeding],["Baby Weight",v.babyWeight]].filter(([,val])=>val).map(([k,val])=>(
                              <div key={k} style={{ background:"#fff", borderRadius:7, padding:"7px 10px" }}>
                                <div style={{ fontSize:9, color:C.textLight, textTransform:"uppercase", fontWeight:700, marginBottom:2 }}>{k}</div>
                                <div style={{ fontWeight:700 }}>{val}</div>
                              </div>
                            ))}
                          </div>
                          {v.babyCondition && <div style={{ marginTop:8, fontSize:12 }}><b>Baby condition:</b> {v.babyCondition}</div>}
                          {v.advice && <div style={{ marginTop:4, fontSize:12 }}><b>Advice:</b> {v.advice}</div>}
                        </div>
                      ))
                    }
                  </Card>
                )}

                {tab==="new" && (
                  <Card title="New Postnatal Visit">
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12 }}>
                      <Input label="Days Postpartum" value={pnForm.daysPP} onChange={v=>setP("daysPP",v)} placeholder="e.g. 7"/>
                      <Input label="Mother BP" value={pnForm.bpMother} onChange={v=>setP("bpMother",v)} placeholder="e.g. 118/76"/>
                      <Select label="Uterus Involution" value={pnForm.uterusInvolution} onChange={v=>setP("uterusInvolution",v)}
                        options={["","Well involuted","Slightly enlarged","Not involuting — refer"]}/>
                      <Select label="Lochia" value={pnForm.lochia} onChange={v=>setP("lochia",v)}
                        options={["","Normal (rubra)","Serosa","Alba","Abnormal — refer"]}/>
                      <Select label="Wound Healing" value={pnForm.woundHealing} onChange={v=>setP("woundHealing",v)}
                        options={["","Well healed","Healing","Infected — treat","Dehisced — refer"]}/>
                      <Select label="Breastfeeding" value={pnForm.breastfeeding} onChange={v=>setP("breastfeeding",v)}
                        options={["","Exclusive","Mixed","Not breastfeeding"]}/>
                      <Input label="Baby Weight (kg)" value={pnForm.babyWeight} onChange={v=>setP("babyWeight",v)} placeholder="e.g. 3.5"/>
                      <Select label="Baby Condition" value={pnForm.babyCondition} onChange={v=>setP("babyCondition",v)}
                        options={["","Healthy","Needs monitoring","Referred"]}/>
                    </div>
                    <div style={{ marginTop:12 }}>
                      <Textarea label="Advice Given" value={pnForm.advice} onChange={v=>setP("advice",v)} rows={3} placeholder="Family planning, nutrition, danger signs to watch…"/>
                    </div>
                    <div style={{ marginTop:14, display:"flex", gap:10 }}>
                      <Btn color={C.blue} onClick={savePostnatal} disabled={saving}><Heart size={13}/> {saving?"Saving…":"Save Postnatal Visit"}</Btn>
                      <Btn outline onClick={()=>{ setPnForm(blankPN); setTab("visits"); }}>Cancel</Btn>
                    </div>
                  </Card>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}