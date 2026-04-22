import { useState } from "react";
import { Printer, Plus, X, CheckCircle, ClipboardList, Activity } from "lucide-react";
import { C, today, now } from "../theme";
import { Badge, Btn, Input, Select, Textarea, Card, EmptyState } from "../ui";
import { api } from "../api";

// ── Ward options ──────────────────────────────────────────────────────────────
const WARDS = ["General Ward","Children's Ward","Maternity Ward","Isolation Ward","Observation Room"];

// ── Print discharge report ────────────────────────────────────────────────────
function printDischargeReport(patient, adm) {
  const win = window.open("","_blank","width=700,height=950");
  const notes = (adm.dailyNotes||[]).map(n=>`<div style="margin-bottom:8px;padding:8px;background:#f8fafc;border-radius:6px"><div style="font-size:10px;color:#64748b">${n.date} ${n.time} — ${n.author}</div><div>${n.text}</div></div>`).join("");
  win.document.write(`<!DOCTYPE html><html><head><title>Discharge Report</title>
  <style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;font-size:13px;padding:32px;color:#1e293b}
  h1{font-size:20px;font-weight:800}h2{font-size:14px;color:#0e7490;margin:18px 0 8px}
  .grid2{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:8px}
  .label{font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.06em;margin-bottom:2px}
  .value{font-size:14px;font-weight:600}
  .divider{border-top:2px solid #0e7490;margin:16px 0}
  .thin{border-top:1px solid #e2e8f0;margin:12px 0}
  .badge{display:inline-block;background:#f0fdf4;border:1px solid #86efac;border-radius:6px;padding:2px 10px;font-size:12px;font-weight:700;color:#16a34a}
  .footer{margin-top:32px;display:flex;justify-content:space-between;font-size:11px;color:#94a3b8}
  .sig{border-top:1px solid #000;width:200px;padding-top:4px;text-align:center;font-size:11px}
  button{display:block;margin:20px auto;padding:9px 28px;background:#0e7490;color:#fff;border:none;border-radius:7px;cursor:pointer;font-size:13px;font-weight:700}
  @media print{button{display:none}}</style></head><body>
  <div style="display:flex;justify-content:space-between;align-items:flex-start">
    <div><h1>🏥 HMS CLINIC</h1><div style="font-size:11px;color:#64748b;letter-spacing:.08em">PATIENT DISCHARGE REPORT</div></div>
    <div style="text-align:right;font-size:11px;color:#64748b"><div style="font-weight:700;font-size:13px">${adm.dischargedDate}</div><div>Admission: ${adm.admittedDate}</div><div>Ref: ${adm.id}</div></div>
  </div>
  <div class="divider"></div>
  <h2>PATIENT INFORMATION</h2>
  <div class="grid2">
    <div><div class="label">Patient Name</div><div class="value">${patient?.name||adm.patientName}</div></div>
    <div><div class="label">Patient ID</div><div class="value" style="font-family:monospace">${adm.patientId}</div></div>
    <div><div class="label">Date of Birth</div><div class="value">${patient?.dob||"—"}</div></div>
    <div><div class="label">Gender</div><div class="value">${patient?.gender==="M"?"Male":patient?.gender==="F"?"Female":patient?.gender||"—"}</div></div>
    ${patient?.emergencyContact?`<div style="grid-column:span 2"><div class="label">Emergency Contact</div><div class="value">${patient.emergencyContact}</div></div>`:""}
  </div>
  <div class="thin"></div>
  <h2>ADMISSION DETAILS</h2>
  <div class="grid2">
    <div><div class="label">Ward</div><div class="value">${adm.ward}</div></div>
    <div><div class="label">Admitted By</div><div class="value">${adm.admittedBy}</div></div>
    <div><div class="label">Admission Date</div><div class="value">${adm.admittedDate} @ ${adm.admittedTime}</div></div>
    <div><div class="label">Discharge Date</div><div class="value">${adm.dischargedDate} @ ${adm.dischargedTime}</div></div>
    <div><div class="label">Reason for Admission</div><div class="value">${adm.reason}</div></div>
    <div><div class="label">Days Admitted</div><div class="value">${Math.max(1,Math.ceil((new Date(adm.dischargedDate)-new Date(adm.admittedDate))/(1000*60*60*24)))} day(s)</div></div>
  </div>
  <div class="thin"></div>
  <h2>CLINICAL SUMMARY</h2>
  <div style="margin-bottom:10px"><div class="label">Final Diagnosis</div><div class="value" style="color:#0e7490;font-size:16px">${adm.finalDiagnosis||"—"}</div></div>
  <div style="margin-bottom:10px"><div class="label">Discharge Report / Summary</div><div style="padding:12px;background:#f8fafc;border-radius:8px;font-size:13px;white-space:pre-wrap">${adm.dischargeReport||"—"}</div></div>
  <div class="grid2">
    <div><div class="label">Outcome</div><div class="value"><span class="badge">${adm.outcome||"—"}</span></div></div>
    <div><div class="label">Follow-up</div><div class="value">${adm.followUp||"None required"}</div></div>
  </div>
  ${notes?`<div class="thin"></div><h2>DAILY PROGRESS NOTES</h2>${notes}`:""}
  <div class="divider"></div>
  <div style="font-size:11px;color:#64748b">Discharged by: <b>${adm.dischargedBy}</b></div>
  <div class="footer">
    <div class="sig">${adm.dischargedBy}<br>Attending Doctor</div>
    <div style="text-align:right">HMS Clinic &nbsp;·&nbsp; Printed ${new Date().toLocaleString()}</div>
  </div>
  <button onclick="window.print()">🖨 Print Report</button>
  </body></html>`);
  win.document.close();
}

// ─────────────────────────────────────────────────────────────────────────────
// ADMIT FORM  — used inside PatientFile when doctor selects "Admit"
// ─────────────────────────────────────────────────────────────────────────────
export function AdmitForm({ patient, queue, user, reload, onClose }) {
  const [form, setForm] = useState({ ward:"General Ward", reason:"", notes:"", condition:"", expectedStay:"" });
  const [saving, setSaving] = useState(false);
  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  const submit = async () => {
    if (!form.reason.trim()) { alert("Reason for admission is required."); return; }
    setSaving(true);
    try {
      await api.admit({
        patientId:   patient.id,
        patientName: patient.name,
        ward:        form.ward,
        reason:      form.reason,
        condition:   form.condition,
        expectedStay:form.expectedStay,
        notes:       form.notes,
        admittedBy:  user?.name||"",
      });
      // Remove from active queue — admitted patients managed separately
      const inQueue = queue.find(e=>e.patientId===patient.id);
      if (inQueue) await api.updateQueue(patient.id, { stage:"done" }); // archive from queue
      reload();
      onClose();
    } catch(e) { alert(e.message); } finally { setSaving(false); }
  };

  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:999 }}>
      <div style={{ background:C.card,borderRadius:16,padding:30,width:500,border:`2px solid ${C.purple}`,boxShadow:`0 0 40px ${C.purple}33` }}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20 }}>
          <h3 style={{ margin:0,color:C.purple,fontSize:17 }}>🏥 Admit Patient</h3>
          <button onClick={onClose} style={{ background:"none",border:"none",cursor:"pointer",fontSize:20,color:C.textLight }}>×</button>
        </div>
        <div style={{ background:C.purpleLight,borderRadius:8,padding:"10px 14px",marginBottom:16,fontSize:13,color:C.purple }}>
          Admitting: <b>{patient.name}</b> ({patient.id})
        </div>
        <div style={{ display:"flex",flexDirection:"column",gap:12 }}>
          <Select label="Ward ★" value={form.ward} onChange={v=>set("ward",v)} options={WARDS}/>
          <Input label="Reason for Admission ★" value={form.reason} onChange={v=>set("reason",v)} placeholder="e.g. Severe malaria, Post-operative care"/>
          <Input label="Presenting Condition / Diagnosis" value={form.condition} onChange={v=>set("condition",v)} placeholder="Clinical diagnosis at admission"/>
          <Input label="Expected Stay" value={form.expectedStay} onChange={v=>set("expectedStay",v)} placeholder="e.g. 3 days, 1 week"/>
          <Textarea label="Admission Notes" value={form.notes} onChange={v=>set("notes",v)} placeholder="Initial observations, orders, treatment plan…" rows={3}/>
        </div>
        <div style={{ display:"flex",gap:10,marginTop:18 }}>
          <Btn color={C.purple} onClick={submit} disabled={saving}><Plus size={13}/> {saving?"Admitting…":"Confirm Admission"}</Btn>
          <Btn outline onClick={onClose}>Cancel</Btn>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ADMITTED PATIENTS VIEW  — doctor / incharge / director
// ─────────────────────────────────────────────────────────────────────────────
export function AdmittedPatients({ admissions, patients, user, isDoctor, reload }) {
  const [tab, setTab]       = useState("current"); // current | discharged
  const [selected, setSelected] = useState(null); // admission id
  const [noteText, setNoteText] = useState("");
  const [showDischarge, setShowDischarge] = useState(false);
  const [dForm, setDForm]   = useState({ finalDiagnosis:"", dischargeReport:"", outcome:"Recovered", followUp:"" });
  const [saving, setSaving] = useState(false);
  const setD = (k,v) => setDForm(f=>({...f,[k]:v}));

  const current    = admissions.filter(a=>a.status==="admitted");
  const discharged = admissions.filter(a=>a.status==="discharged");
  const adm        = admissions.find(a=>a.id===selected);
  const patient    = patients.find(p=>p.id===adm?.patientId);

  const addNote = async () => {
    if (!noteText.trim()||!selected) return;
    try { await api.addAdmissionNote(selected, noteText); setNoteText(""); reload(); }
    catch(e) { alert(e.message); }
  };

  const doDischarge = async () => {
    if (!dForm.finalDiagnosis||!dForm.dischargeReport) { alert("Final diagnosis and discharge report are required."); return; }
    setSaving(true);
    try {
      const updated = await api.discharge(selected, dForm);
      setShowDischarge(false);
      reload();
      if (window.confirm("Patient discharged. Print discharge report?")) {
        printDischargeReport(patient, { ...adm, ...dForm, dischargedDate:today(), dischargedTime:now(), dischargedBy:user?.name||"" });
      }
    } catch(e) { alert(e.message); } finally { setSaving(false); }
  };

  // Days admitted calculation
  const daysIn = (adm) => {
    if (!adm?.admittedDate) return 0;
    const diff = (new Date()) - new Date(adm.admittedDate);
    return Math.max(0, Math.floor(diff/(1000*60*60*24)));
  };

  return (
    <div style={{ padding:24, display:"grid", gridTemplateColumns:"280px 1fr", gap:18 }}>
      {/* Left: list */}
      <div>
        <div style={{ display:"flex", gap:6, marginBottom:12 }}>
          <Btn small outline={tab!=="current"} color={C.purple} onClick={()=>setTab("current")}>
            Current ({current.length})
          </Btn>
          <Btn small outline={tab!=="discharged"} color={C.green} onClick={()=>setTab("discharged")}>
            Discharged ({discharged.length})
          </Btn>
        </div>

        {/* Ward summary for current */}
        {tab==="current" && current.length>0 && (
          <div style={{ marginBottom:12 }}>
            {WARDS.map(w=>{
              const cnt = current.filter(a=>a.ward===w).length;
              return cnt>0 ? (
                <div key={w} style={{ display:"flex",justifyContent:"space-between",fontSize:11,color:C.textMid,padding:"3px 6px" }}>
                  <span>🛏 {w}</span><span style={{ fontWeight:700,color:C.purple }}>{cnt}</span>
                </div>
              ) : null;
            })}
          </div>
        )}

        <Card>
          {(tab==="current"?current:discharged).length===0
            ? <EmptyState icon={tab==="current"?"🏥":"✅"} message={tab==="current"?"No admitted patients":"No discharged patients"}/>
            : (tab==="current"?current:discharged).map(a=>(
              <div key={a.id} onClick={()=>setSelected(a.id)}
                style={{ padding:"10px",borderRadius:8,border:`1.5px solid ${selected===a.id?C.purple:C.border}`,cursor:"pointer",marginBottom:8,background:selected===a.id?C.purpleLight:"transparent" }}>
                <div style={{ fontWeight:700,fontSize:13 }}>{a.patientName}</div>
                <div style={{ fontSize:11,color:C.textMid,fontFamily:"'IBM Plex Mono',monospace" }}>{a.patientId}</div>
                <div style={{ fontSize:11,color:C.textLight,marginTop:2 }}>
                  {a.ward} · {tab==="current"?`Day ${daysIn(a)+1}`:a.dischargedDate}
                </div>
                {tab==="current" && daysIn(a)>=3 && (
                  <div style={{ fontSize:10,color:C.amber,fontWeight:700,marginTop:2 }}>⚠ {daysIn(a)} days admitted</div>
                )}
              </div>
            ))}
        </Card>
      </div>

      {/* Right: detail */}
      <div>
        {!adm ? (
          <div style={{ textAlign:"center",padding:"80px 20px",color:C.textLight }}>
            <div style={{ fontSize:40,marginBottom:12 }}>🏥</div>
            <div style={{ fontSize:15,fontWeight:600,marginBottom:6 }}>Admitted Patients</div>
            <div style={{ fontSize:13 }}>Select a patient to view their admission record</div>
          </div>
        ) : (
          <>
            {/* Header */}
            <Card style={{ marginBottom:14 }}>
              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start" }}>
                <div>
                  <div style={{ fontWeight:800,fontSize:18 }}>{adm.patientName}</div>
                  <div style={{ fontFamily:"'IBM Plex Mono',monospace",fontSize:12,color:C.textMid }}>{adm.patientId}</div>
                  <div style={{ marginTop:6,display:"flex",gap:8,flexWrap:"wrap" }}>
                    <Badge label={adm.ward} color={C.purple}/>
                    <Badge label={adm.status==="admitted"?`Day ${daysIn(adm)+1} of admission`:"Discharged"} color={adm.status==="admitted"?C.blue:C.green}/>
                    {patient?.dob && <span style={{ fontSize:11,color:C.textMid }}>DOB: {patient.dob}</span>}
                    {patient?.emergencyContact && <span style={{ fontSize:11,color:C.textMid }}>📞 {patient.emergencyContact}</span>}
                  </div>
                </div>
                {adm.status==="admitted" && isDoctor && (
                  <Btn color={C.green} onClick={()=>{ setShowDischarge(true); setDForm({finalDiagnosis:"",dischargeReport:"",outcome:"Recovered",followUp:""}); }}>
                    <CheckCircle size={13}/> Discharge Patient
                  </Btn>
                )}
                {adm.status==="discharged" && (
                  <Btn outline color={C.accent} onClick={()=>printDischargeReport(patient,adm)}>
                    <Printer size={13}/> Print Report
                  </Btn>
                )}
              </div>
            </Card>

            {/* Admission details */}
            <Card title="Admission Details" style={{ marginBottom:14 }}>
              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,fontSize:13 }}>
                {[
                  ["Admitted",`${adm.admittedDate} @ ${adm.admittedTime}`],
                  ["Admitted By",adm.admittedBy],
                  ["Reason",adm.reason],
                  ["Condition",adm.condition||"—"],
                  ["Expected Stay",adm.expectedStay||"—"],
                  ...(adm.status==="discharged"?[["Discharged",`${adm.dischargedDate} @ ${adm.dischargedTime}`],["Discharged By",adm.dischargedBy||"—"]]:[] ),
                ].map(([l,v])=>(
                  <div key={l}>
                    <div style={{ fontSize:10,color:C.textLight,textTransform:"uppercase",fontWeight:700,marginBottom:2 }}>{l}</div>
                    <div style={{ fontWeight:600,color:C.text }}>{v}</div>
                  </div>
                ))}
              </div>
              {adm.notes && (
                <div style={{ marginTop:10,background:"#f8fafc",borderRadius:7,padding:"8px 12px",fontSize:12,color:C.textMid }}><b>Notes:</b> {adm.notes}</div>
              )}
            </Card>

            {/* Discharge summary (if discharged) */}
            {adm.status==="discharged" && (
              <Card title="Discharge Summary" style={{ marginBottom:14, border:`1px solid ${C.green}44` }}>
                <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12 }}>
                  <div>
                    <div style={{ fontSize:10,color:C.textLight,textTransform:"uppercase",fontWeight:700,marginBottom:2 }}>Final Diagnosis</div>
                    <div style={{ fontWeight:700,color:C.green,fontSize:15 }}>{adm.finalDiagnosis||"—"}</div>
                  </div>
                  <div>
                    <div style={{ fontSize:10,color:C.textLight,textTransform:"uppercase",fontWeight:700,marginBottom:2 }}>Outcome</div>
                    <div style={{ fontWeight:700,color:C.green }}>{adm.outcome||"—"}</div>
                  </div>
                  <div style={{ gridColumn:"span 2" }}>
                    <div style={{ fontSize:10,color:C.textLight,textTransform:"uppercase",fontWeight:700,marginBottom:4 }}>Discharge Report</div>
                    <div style={{ background:"#f0fdf4",borderRadius:8,padding:"10px 14px",fontSize:13,color:C.textMid,whiteSpace:"pre-wrap" }}>{adm.dischargeReport}</div>
                  </div>
                  {adm.followUp && (
                    <div style={{ gridColumn:"span 2" }}>
                      <div style={{ fontSize:10,color:C.textLight,textTransform:"uppercase",fontWeight:700,marginBottom:2 }}>Follow-up</div>
                      <div style={{ fontSize:13,color:C.textMid }}>{adm.followUp}</div>
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* Daily progress notes */}
            <Card title="Progress Notes">
              {(adm.dailyNotes||[]).length===0
                ? <EmptyState icon="📝" message="No progress notes yet"/>
                : [...(adm.dailyNotes||[])].reverse().map((n,i)=>(
                  <div key={i} style={{ padding:"10px 0",borderBottom:`1px solid ${C.border}` }}>
                    <div style={{ fontSize:10,color:C.textLight,marginBottom:3,fontFamily:"'IBM Plex Mono',monospace" }}>{n.date} {n.time} — {n.author}</div>
                    <div style={{ fontSize:13,color:C.text }}>{n.text}</div>
                  </div>
                ))}
              {adm.status==="admitted" && isDoctor && (
                <div style={{ display:"flex",gap:8,marginTop:14,alignItems:"flex-end" }}>
                  <div style={{ flex:1 }}>
                    <Textarea label="Add Progress Note" value={noteText} onChange={setNoteText} placeholder="Patient condition update, response to treatment, new orders…" rows={2}/>
                  </div>
                  <Btn color={C.purple} onClick={addNote} disabled={!noteText.trim()}>
                    <Plus size={13}/> Add Note
                  </Btn>
                </div>
              )}
            </Card>
          </>
        )}
      </div>

      {/* Discharge modal */}
      {showDischarge && adm && (
        <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.65)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:999 }}>
          <div style={{ background:C.card,borderRadius:16,padding:30,width:560,border:`2px solid ${C.green}`,maxHeight:"90vh",overflowY:"auto" }}>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18 }}>
              <h3 style={{ margin:0,color:C.green,fontSize:17 }}>✅ Discharge Patient</h3>
              <button onClick={()=>setShowDischarge(false)} style={{ background:"none",border:"none",cursor:"pointer",fontSize:20,color:C.textLight }}>×</button>
            </div>
            <div style={{ background:C.greenLight,borderRadius:8,padding:"8px 14px",marginBottom:16,fontSize:13,color:C.green,fontWeight:600 }}>
              Discharging: <b>{adm.patientName}</b> — {adm.ward} (Day {daysIn(adm)+1})
            </div>
            <div style={{ display:"flex",flexDirection:"column",gap:12 }}>
              <Input label="Final Diagnosis ★" value={dForm.finalDiagnosis} onChange={v=>setD("finalDiagnosis",v)} placeholder="Final clinical diagnosis at discharge"/>
              <Textarea label="Discharge Report / Summary ★" value={dForm.dischargeReport} onChange={v=>setD("dischargeReport",v)}
                placeholder="Summary of hospital stay, treatment given, response, condition at discharge…" rows={5}/>
              <Select label="Outcome" value={dForm.outcome} onChange={v=>setD("outcome",v)}
                options={["Recovered","Improved","Referred","Discharged Against Advice","Deceased"]}/>
              <Input label="Follow-up Instructions" value={dForm.followUp} onChange={v=>setD("followUp",v)}
                placeholder="e.g. Return in 1 week, Review blood results, Physiotherapy"/>
            </div>
            <div style={{ display:"flex",gap:10,marginTop:18 }}>
              <Btn color={C.green} onClick={doDischarge} disabled={saving}><CheckCircle size={13}/> {saving?"Processing…":"Confirm Discharge"}</Btn>
              <Btn outline onClick={()=>setShowDischarge(false)}>Cancel</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}