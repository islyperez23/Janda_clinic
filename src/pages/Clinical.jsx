import { useState } from "react";
import { Heart, FileText, TestTube2, Upload, CheckCircle, Printer, ArrowRight, ClipboardList, Activity } from "lucide-react";
import { C, now, today, genLab } from "../theme";
import { Badge, Btn, Input, Select, Textarea, Card, EmptyState, StageBadge } from "../ui";
import { api } from "../api";
import { AdmitForm } from "./Admissions";

// ─────────────────────────────────────────────────────────────────────────────
// PRINT REPORT
// ─────────────────────────────────────────────────────────────────────────────
function printReport(patient, visit) {
  const win = window.open("", "_blank", "width=700,height=900");
  const rx = (visit.prescriptions||[]).map(r=>`<li style="margin:3px 0">${r}</li>`).join("");
  const vitals = visit.vitals||{};
  const vitalStr = [
    vitals.bp&&`BP: ${vitals.bp}`,
    vitals.temp&&`Temp: ${vitals.temp}`,
    vitals.weight&&`Weight: ${vitals.weight}`,
    vitals.pulse&&`Pulse: ${vitals.pulse}`,
    vitals.spo2&&`SpO₂: ${vitals.spo2}`,
  ].filter(Boolean).join(" &nbsp;·&nbsp; ");

  win.document.write(`<!DOCTYPE html><html><head><title>Clinical Report</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:Arial,sans-serif;font-size:13px;padding:32px;color:#1e293b}
    h1{font-size:20px;font-weight:800;margin-bottom:2px}
    .sub{font-size:11px;color:#64748b;letter-spacing:0.06em;margin-bottom:20px}
    .divider{border-top:2px solid #0e7490;margin:16px 0}
    .thin{border-top:1px solid #e2e8f0;margin:12px 0}
    .grid2{display:grid;grid-template-columns:1fr 1fr;gap:12px}
    .label{font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:2px}
    .value{font-size:14px;font-weight:600;color:#1e293b}
    .vitals-box{background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:12px;margin:8px 0;font-size:12px}
    .lab-box{background:#fffbeb;border:1px solid #fcd34d;border-radius:8px;padding:12px;margin:8px 0;font-size:12px}
    .rx-box{background:#f8f9ff;border:1px solid #c7d2fe;border-radius:8px;padding:12px;margin:8px 0}
    .rx-box li{font-size:13px;margin:4px 0}
    .notes{background:#f8fafc;border-radius:8px;padding:12px;font-size:12px;color:#475569;margin-top:8px;white-space:pre-wrap}
    .footer{margin-top:32px;display:flex;justify-content:space-between;font-size:11px;color:#94a3b8}
    .sig{border-top:1px solid #000;width:200px;padding-top:4px;text-align:center;font-size:11px}
    button{display:block;margin:20px auto;padding:9px 28px;font-size:13px;cursor:pointer;background:#0e7490;color:#fff;border:none;border-radius:7px;font-weight:700}
    @media print{button{display:none}}
  </style></head><body>
  <div style="display:flex;justify-content:space-between;align-items:flex-start">
    <div>
      <h1>🏥 HMS CLINIC</h1>
      <div class="sub">CLINICAL REPORT</div>
    </div>
    <div style="text-align:right;font-size:11px;color:#64748b">
      <div style="font-weight:700;font-size:13px">${visit.date}</div>
      <div>Report ID: ${visit.id}</div>
    </div>
  </div>
  <div class="divider"></div>
  <div class="grid2" style="margin-bottom:12px">
    <div><div class="label">Patient</div><div class="value">${patient.name}</div></div>
    <div><div class="label">Patient ID</div><div class="value" style="font-family:monospace">${patient.id}</div></div>
    <div><div class="label">Date of Birth</div><div class="value">${patient.dob||"—"}</div></div>
    <div><div class="label">Gender</div><div class="value">${patient.gender||"—"}</div></div>
    ${patient.class?`<div><div class="label">Class</div><div class="value">${patient.class}${patient.dorm?` / ${patient.dorm}`:""}</div></div>`:""}
    ${patient.emergencyContact?`<div><div class="label">Emergency Contact</div><div class="value">${patient.emergencyContact}</div></div>`:""}
  </div>
  <div class="thin"></div>
  <div class="label" style="margin-bottom:4px">Chief Complaint</div>
  <div style="font-size:14px;margin-bottom:10px">${visit.complaint||"—"}</div>
  ${vitalStr?`<div class="vitals-box"><b>Vitals:</b> ${vitalStr}</div>`:""}
  ${visit.labResults?`<div class="lab-box"><b>Lab Results:</b> ${visit.labResults}</div>`:""}
  <div class="thin"></div>
  <div class="grid2" style="margin:12px 0">
    <div><div class="label">Diagnosis</div><div class="value" style="color:#0e7490;font-size:15px">${visit.diagnosis}</div></div>
    <div><div class="label">Treatment</div><div class="value">${visit.treatment||"—"}</div></div>
  </div>
  ${rx?`<div class="label" style="margin-top:8px">Prescriptions</div><div class="rx-box"><ul style="padding-left:18px">${rx}</ul></div>`:""}
  ${visit.notes?`<div class="label" style="margin-top:8px">Clinical Notes</div><div class="notes">${visit.notes}</div>`:""}
  <div class="thin"></div>
  <div style="font-size:11px;color:#64748b">Attended by: <b>${visit.doctor}</b></div>
  <div class="footer">
    <div class="sig">${visit.doctor}<br>Doctor's Signature</div>
    <div style="text-align:right">HMS Clinic &nbsp;·&nbsp; Printed ${new Date().toLocaleString()}</div>
  </div>
  <button onclick="window.print()">🖨 Print Report</button>
  </body></html>`);
  win.document.close();
}

// ─────────────────────────────────────────────────────────────────────────────
// NURSE VITALS
// Nurse records vitals → saves to patient.pendingVitals → returns patient to doctor
// ─────────────────────────────────────────────────────────────────────────────
export function NurseVitals({ patients, queue, reload }) {
  const nurseQueue = queue.filter(e => e.stage === "nurse");
  const [form, setForm] = useState({ bp:"", temp:"", weight:"", pulse:"", spo2:"", complaint:"" });
  const [pid, setPid] = useState("");
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const patient = patients.find(p => p.id === pid);

  const bpW = (() => {
    if (!form.bp) return null;
    const [s, d] = form.bp.split("/").map(Number);
    if (s >= 180 || d >= 110) return { msg: "⚠ Hypertensive Crisis", color: C.red };
    if (s >= 140 || d >= 90)  return { msg: "↑ High BP", color: C.amber };
    if (s < 90  || d < 60)   return { msg: "↓ Low BP",  color: C.blue };
    return null;
  })();
  const tempW = form.temp && parseFloat(form.temp) >= 38.5
    ? { msg: `⚠ Fever (${form.temp})`, color: C.red }
    : form.temp && parseFloat(form.temp) >= 37.5
    ? { msg: "↑ Elevated", color: C.amber } : null;

  const save = async () => {
    if (!pid) { alert("Select a patient first."); return; }
    if (!form.bp && !form.temp && !form.weight) { alert("Enter at least BP, temperature or weight."); return; }
    setSaving(true);
    try {
      await api.updatePatient(pid, { pendingVitals: { ...form, recordedAt: now() } });
      const inQueue = queue.find(e => e.patientId === pid);
      if (inQueue) await api.updateQueue(pid, { stage: "doctor", nurseResultsReady: true });
      setForm({ bp:"", temp:"", weight:"", pulse:"", spo2:"", complaint:"" });
      setPid("");
      reload();
    } catch(e) { alert(e.message); } finally { setSaving(false); }
  };

  return (
    <div style={{ padding: 24, display: "grid", gridTemplateColumns: "280px 1fr", gap: 20 }}>
      <div>
        <Card title={`Waiting for Vitals (${nurseQueue.length})`} style={{ marginBottom: 12 }}>
          {nurseQueue.length === 0
            ? <EmptyState icon="✅" message="No patients waiting for vitals" />
            : nurseQueue.map(e => (
              <div key={e.patientId} onClick={() => setPid(e.patientId)}
                style={{ padding: 10, borderRadius: 8, border: `1.5px solid ${pid === e.patientId ? C.purple : C.border}`, cursor: "pointer", marginBottom: 8, background: pid === e.patientId ? C.purpleLight : "transparent" }}>
                <div style={{ fontWeight: 700 }}>{e.name}</div>
                <div style={{ fontSize: 11, color: C.textMid, fontFamily: "'IBM Plex Mono',monospace" }}>{e.patientId}</div>
                <div style={{ fontSize: 11, color: C.textLight }}>{e.complaint}</div>
              </div>
            ))}
        </Card>
        {patient && (
          <Card title="Patient Info">
            <div style={{ fontSize: 13, lineHeight: 1.9, color: C.textMid }}>
              <div style={{ fontWeight: 700, color: C.text, fontSize: 14 }}>{patient.name}</div>
              <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, marginBottom: 4 }}>{patient.id}</div>
              <div>DOB: {patient.dob || "—"}</div>
              <div>Gender: {patient.gender || "—"}</div>
              {patient.class && <div>Class: {patient.class}</div>}
              <div style={{ fontSize: 11, marginTop: 6 }}>📞 {patient.emergencyContact || "—"}</div>
            </div>
            {patient.visits?.length > 0 && (
              <div style={{ marginTop: 10, background: C.accentGlow, borderRadius: 8, padding: 10, fontSize: 12 }}>
                <div style={{ fontWeight: 700, color: C.accent, marginBottom: 4 }}>Last Visit Vitals</div>
                {(() => { const v = patient.visits.slice(-1)[0]?.vitals || {}; return (
                  <div style={{ color: C.textMid }}>
                    {[["BP",v.bp],["Temp",v.temp],["Weight",v.weight],["Pulse",v.pulse]].filter(([,x])=>x).map(([k,x])=>`${k}: ${x}`).join(" · ") || "No previous vitals"}
                  </div>
                );})()}
              </div>
            )}
          </Card>
        )}
      </div>
      <Card title="Record Vitals">
        {!pid ? <EmptyState icon="👤" message="Select a patient from the list on the left" /> : (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
              <div>
                <Input label="Blood Pressure (mmHg)" value={form.bp} onChange={v => set("bp", v)} placeholder="e.g. 120/80" />
                {bpW && <div style={{ fontSize: 11, color: bpW.color, marginTop: 3, fontWeight: 700 }}>{bpW.msg}</div>}
              </div>
              <div>
                <Input label="Temperature (°C)" value={form.temp} onChange={v => set("temp", v)} placeholder="e.g. 37.0" />
                {tempW && <div style={{ fontSize: 11, color: tempW.color, marginTop: 3, fontWeight: 700 }}>{tempW.msg}</div>}
              </div>
              <Input label="Weight (kg)" value={form.weight} onChange={v => set("weight", v)} placeholder="e.g. 60" />
              <Input label="Pulse (bpm)" value={form.pulse} onChange={v => set("pulse", v)} placeholder="e.g. 72" />
              <Input label="SpO₂ (%)" value={form.spo2} onChange={v => set("spo2", v)} placeholder="e.g. 98" />
              <Input label="Confirm Complaint" value={form.complaint} onChange={v => set("complaint", v)} placeholder="Patient's complaint" />
            </div>
            <Btn onClick={save} color={C.purple} disabled={saving}>
              <Heart size={13} /> {saving ? "Saving…" : "Save Vitals & Return to Doctor"}
            </Btn>
          </>
        )}
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PATIENT RECORDS SEARCH — doctor can look up any patient's history
// ─────────────────────────────────────────────────────────────────────────────
function PatientRecordsSearch({ patients, pid, selectPatient }) {
  const [q, setQ] = useState("");
  const results = q.trim()
    ? patients.filter(p =>
        p.name.toLowerCase().includes(q.toLowerCase()) ||
        p.id.toLowerCase().includes(q.toLowerCase())
      ).slice(0, 6)
    : [];

  return (
    <Card title="Patient Records">
      <div style={{ position: "relative", marginBottom: results.length ? 8 : 0 }}>
        <span style={{ position:"absolute", left:9, top:"50%", transform:"translateY(-50%)", fontSize:13, color:C.textLight, pointerEvents:"none" }}>🔍</span>
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Search by name or ID…"
          style={{ width:"100%", padding:"7px 9px 7px 28px", border:`1.5px solid ${C.border}`, borderRadius:7, fontSize:12, fontFamily:"inherit", boxSizing:"border-box", background:"#f8fafc" }}
        />
        {q && <button onClick={() => setQ("")} style={{ position:"absolute", right:7, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", color:C.textLight, fontSize:16 }}>×</button>}
      </div>
      {results.length > 0 && (
        <div style={{ maxHeight: 200, overflowY:"auto" }}>
          {results.map(p => (
            <div key={p.id} onClick={() => { selectPatient(p.id); setQ(""); }}
              style={{ padding:"8px 6px", borderRadius:7, cursor:"pointer", borderBottom:`1px solid ${C.border}`, background: pid===p.id ? C.greenLight : "transparent" }}>
              <div style={{ fontWeight:600, fontSize:13, color:C.text }}>{p.name}</div>
              <div style={{ fontSize:10, color:C.textMid, fontFamily:"'IBM Plex Mono',monospace" }}>
                {p.id} · {p.visits?.length||0} visit{p.visits?.length!==1?"s":""} · {p.category}
              </div>
            </div>
          ))}
        </div>
      )}
      {q && results.length === 0 && (
        <div style={{ fontSize:12, color:C.textLight, textAlign:"center", paddingTop:8 }}>No patients found</div>
      )}
      {!q && (
        <div style={{ fontSize:11, color:C.textLight, textAlign:"center", paddingTop:4 }}>
          Type a name or ID to find any patient's records
        </div>
      )}
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DOCTOR PATIENT FILE  — full tabbed consultation workflow
//
// Tabs:
//   📝 Consultation   — write diagnosis, prescriptions, save + print
//   🩺 Nurse Results  — vitals from nurse (confirm → auto-fill form)
//   🔬 Lab Results    — lab results (confirm → auto-fill form)
//   📚 Visit History  — all past visits
// ─────────────────────────────────────────────────────────────────────────────
export function PatientFile({ patients, queue, labOrders, services, user, reload }) {
  const [pid, setPid] = useState("");
  const [tab, setTab] = useState("consultation");
  const [form, setForm] = useState({
    complaint: "", vitalsNote: "", labNote: "",
    diagnosis: "", treatment: "", prescriptions: "", notes: "", sendTo: ""
  });
  const [labTest, setLabTest] = useState("");
  const [labSearch, setLabSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [showAdmitForm, setShowAdmitForm] = useState(false);

  // Lab services filtered from the system service catalogue (passed as prop)
  const activeServices = (services || []).filter(s => s.active);
  const labServices = activeServices.filter(s => s.category === "Laboratory");
  const labFiltered = labSearch.trim()
    ? labServices.filter(s => s.name.toLowerCase().includes(labSearch.toLowerCase()))
    : labServices;
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const myQueue = queue.filter(e => e.stage === "doctor");
  // All patients the doctor is tracking (includes ones at nurse or lab)
  const allMyPatients = queue.filter(e => ["doctor","nurse","lab"].includes(e.stage));
  const patient = patients.find(p => p.id === pid);
  const pendingVitals = patient?.pendingVitals;

  const myLabResults = labOrders.filter(o => o.patientId === pid && o.status === "completed");
  const myLabPending = labOrders.filter(o => o.patientId === pid && o.status === "pending");

  const stillInQueue  = !!queue.find(e => e.patientId === pid && e.stage === "doctor");
  const hasNurseResults = !!pendingVitals;
  const hasLabResults   = myLabResults.length > 0;

  const tabDef = [
    { id:"consultation", label:"📝 Consultation" },
    { id:"nurse",        label:`🩺 Nurse Results${hasNurseResults?" 🔴":""}` },
    { id:"lab",          label:`🔬 Lab Results${hasLabResults?" 🔴":""}` },
    { id:"history",      label:"📚 Visit History" },
  ];

  const selectPatient = (newPid) => {
    setPid(newPid);
    setTab("consultation");
    const qEntry = queue.find(e => e.patientId === newPid);
    setForm({
      complaint: qEntry?.complaint || "",
      vitalsNote: "", labNote: "",
      diagnosis: "", treatment: "", prescriptions: "", notes: "", sendTo: ""
    });
  };

  // ── Confirm nurse vitals → copy into form ───────────────────────────────
  const confirmVitals = () => {
    if (!pendingVitals) return;
    const v = pendingVitals;
    const vStr = [
      v.bp      && `BP: ${v.bp}`,
      v.temp    && `Temp: ${v.temp}`,
      v.weight  && `Weight: ${v.weight}`,
      v.pulse   && `Pulse: ${v.pulse}`,
      v.spo2    && `SpO₂: ${v.spo2}`,
    ].filter(Boolean).join("  |  ");
    set("vitalsNote", vStr);
    if (v.complaint && !form.complaint) set("complaint", v.complaint);
    setTab("consultation");
  };

  // ── Confirm lab results → copy into form ───────────────────────────────
  const confirmLabResults = () => {
    const resultText = myLabResults.map(o => `${o.test}: ${o.result}`).join("\n");
    set("labNote", resultText);
    setTab("consultation");
  };

  // ── Quick route (no report) — send to nurse or lab ──────────────────────
  const quickRoute = async (stage, testName = "", testPrice = 0) => {
    const inQueue = queue.find(e => e.patientId === pid);
    if (!inQueue) { alert("Patient is not in the active queue."); return; }
    try {
      if (stage === "lab" && testName) {
        await api.addLabOrder({
          id: genLab(), patientId: pid, patientName: patient?.name || "",
          test: testName, price: testPrice, requestedBy: user.name,
          status: "pending", timestamp: now(), result: ""
        });

        // Auto-add lab test cost to patient's running bill
        try {
          const bill = await api.getPatientBill(pid);
          if (bill) {
            await api.addBillItem(bill.id, { name: testName, price: testPrice, qty: 1, category: "Laboratory" });
          }
        } catch(e) { console.warn("Could not add lab cost to bill:", e); }
      }
      await api.updateQueue(pid, { stage });
      setLabTest(""); setLabSearch("");
      reload();
    } catch(e) { alert(e.message); }
  };

  // ── Save full clinical report ────────────────────────────────────────────
  const saveVisit = async () => {
    if (!form.diagnosis.trim()) { alert("Diagnosis is required before saving the report."); return; }
    if (!form.sendTo) { alert("Please select where to route the patient (Pharmacy or Done)."); return; }
    setSaving(true);

    // Capture these before clearing form
    const savedPid     = pid;
    const savedPatient = patient;

    try {
      const visit = {
        id:     `V${Date.now()}`,
        date:   today(),
        doctor: user.name,
        complaint:     form.complaint,
        vitalsNote:    form.vitalsNote,
        labNote:       form.labNote,
        labResults:    form.labNote,
        diagnosis:     form.diagnosis,
        treatment:     form.treatment,
        prescriptions: form.prescriptions.split("\n").filter(Boolean),
        notes:         form.notes,
        vitals:        pendingVitals || {},
        labOrders:     myLabResults.map(o => o.id),
        stage:         form.sendTo,
      };

      await api.updatePatient(savedPid, { addVisit: visit, clearPendingVitals: true });
      const inQueue = queue.find(e => e.patientId === savedPid);

      if (form.sendTo === "admit") {
        // Remove from queue — admission system takes over
        if (inQueue) await api.updateQueue(savedPid, { stage: "done" });
      } else if (form.sendTo && inQueue) {
        await api.updateQueue(savedPid, { stage: form.sendTo });
      }

      // Reset form but KEEP the patient selected so history is visible
      const wasAdmit = form.sendTo === "admit";
      setForm({ complaint:"", vitalsNote:"", labNote:"", diagnosis:"", treatment:"", prescriptions:"", notes:"", sendTo:"" });

      // Switch to History tab BEFORE reload
      setTab("history");

      // Reload — pid stays set so the freshly loaded patient is still selected
      await reload();

      if (wasAdmit) {
        // Open the admission form immediately
        setShowAdmitForm(true);
      } else if (window.confirm("Report saved and filed ✓\n\nPrint the patient report now?")) {
        printReport(savedPatient, visit);
      }

    } catch(e) { alert(e.message); } finally { setSaving(false); }
  };

  return (
    <>
      {/* AdmitForm modal — opens after doctor saves with sendTo:"admit" */}
      {showAdmitForm && patient && (
        <AdmitForm patient={patient} queue={queue} user={user} reload={reload} onClose={() => setShowAdmitForm(false)}/>
      )}
      <div style={{ padding: 24, display: "grid", gridTemplateColumns: "260px 1fr", gap: 18 }}>
      <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
        <Card title={`Active Patients (${allMyPatients.length})`}>
          {allMyPatients.length === 0
            ? <EmptyState icon="✅" message="No patients in queue" />
            : allMyPatients.map(e => (
              <div key={e.patientId} onClick={() => selectPatient(e.patientId)}
                style={{ padding: "9px 10px", borderRadius: 8, border: `1.5px solid ${pid === e.patientId ? C.green : C.border}`, cursor: "pointer", marginBottom: 6, background: pid === e.patientId ? "rgba(16,185,129,0.08)" : "transparent", position: "relative" }}>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{e.name}</div>
                <div style={{ fontSize: 10, color: C.textMid, fontFamily: "'IBM Plex Mono',monospace" }}>{e.patientId}</div>
                <div style={{ fontSize: 11, color: C.textLight, marginTop: 2 }}>{e.complaint}</div>
                {e.stage === "lab" && (
                  <div style={{ position: "absolute", top: 6, right: 8, background: C.amber, color: "#fff", borderRadius: 10, padding: "1px 6px", fontSize: 9, fontWeight: 700 }}>AT LAB</div>
                )}
                {e.stage === "nurse" && (
                  <div style={{ position: "absolute", top: 6, right: 8, background: C.purple, color: "#fff", borderRadius: 10, padding: "1px 6px", fontSize: 9, fontWeight: 700 }}>AT NURSE</div>
                )}
                {hasLabResults && e.stage === "doctor" && (
                  <div style={{ position: "absolute", top: 6, right: 8, background: C.green, color: "#fff", borderRadius: 10, padding: "1px 6px", fontSize: 9, fontWeight: 700 }}>RESULTS READY</div>
                )}
              </div>
            ))}
        </Card>

        {/* Patient Records Search — look up any patient by name or ID */}
        <PatientRecordsSearch patients={patients} pid={pid} selectPatient={selectPatient}/>

        {patient && (
          <Card title="Patient Details">
            <div style={{ fontSize: 13, lineHeight: 1.9, color: C.textMid }}>
              <div style={{ fontWeight: 700, color: C.text }}>{patient.name}</div>
              <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11 }}>{patient.id}</div>
              <div>DOB: {patient.dob || "—"}</div>
              <div>Gender: {patient.gender || "—"}</div>
              {patient.class && <div>Class: {patient.class}</div>}
              {patient.employeeId && <div>EmpID: {patient.employeeId}</div>}
              {patient.arrivalTime && <div>Arrived: {patient.arrivalTime}</div>}
              <div style={{ fontSize: 11, marginTop: 4 }}>📞 {patient.emergencyContact || "—"}</div>
            </div>
            {hasNurseResults && (
              <div style={{ marginTop: 8, background: C.purpleLight, border: `1px solid ${C.purple}44`, borderRadius: 7, padding: "6px 10px", fontSize: 11, color: C.purple, fontWeight: 700, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                🩺 Vitals ready
                <Btn small color={C.purple} onClick={() => setTab("nurse")}>View</Btn>
              </div>
            )}
            {hasLabResults && (
              <div style={{ marginTop: 6, background: C.amberLight, border: `1px solid ${C.amber}44`, borderRadius: 7, padding: "6px 10px", fontSize: 11, color: C.amber, fontWeight: 700, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                🔬 Lab results ready
                <Btn small color={C.amber} onClick={() => setTab("lab")}>View</Btn>
              </div>
            )}
            <div style={{ marginTop: 8 }}>
              <Btn small outline color={C.accent} onClick={() => setTab("history")}>
                📚 View Full History ({patient.visits?.length || 0} visits)
              </Btn>
            </div>
          </Card>
        )}
      </div>

      {/* ── Right: tabbed panel ── */}
      <div>
        {!patient
          ? <EmptyState icon="👨‍⚕️" message="Select a patient from your queue on the left" />
          : (
            <>
              {/* Banner: patient is at lab */}
              {pid && !stillInQueue && (
                <div style={{ background: C.amberLight, border: `1.5px solid ${C.amber}`, borderRadius: 9, padding: "10px 16px", marginBottom: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: 700, color: C.amber, fontSize: 13 }}>
                      ⏳ {patient?.name} is currently at the laboratory
                    </div>
                    <div style={{ fontSize: 12, color: C.textMid, marginTop: 2 }}>
                      Your form is preserved. Patient returns here once results are uploaded.
                    </div>
                  </div>
                  <Badge label="AWAITING LAB" color={C.amber}/>
                </div>
              )}

              {/* Tab bar */}
              <div style={{ display: "flex", gap: 4, marginBottom: 16, borderBottom: `2px solid ${C.border}` }}>
                {tabDef.map(t => (
                  <button key={t.id} onClick={() => setTab(t.id)}
                    style={{ padding: "8px 16px", border: "none", borderBottom: `3px solid ${tab === t.id ? C.green : "transparent"}`, background: "transparent", cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: tab === t.id ? 700 : 500, color: tab === t.id ? C.green : C.textMid, marginBottom: -2, whiteSpace: "nowrap" }}>
                    {t.label}
                  </button>
                ))}
              </div>

              {/* ══ TAB: Nurse Results ══ */}
              {tab === "nurse" && (
                <Card title="🩺 Nurse — Vitals">
                  {!hasNurseResults ? (
                    <div style={{ textAlign: "center", padding: "30px 20px" }}>
                      <div style={{ fontSize: 40, marginBottom: 12 }}>🩺</div>
                      <div style={{ fontSize: 14, color: C.textMid, marginBottom: 20 }}>Patient has not been to the nurse yet</div>
                      <Btn color={C.purple} onClick={() => quickRoute("nurse")} style={{ margin: "0 auto", fontSize: 14, padding: "12px 32px" }}>
                        <ArrowRight size={15} /> Send to Nurse for Vitals
                      </Btn>
                    </div>
                  ) : (
                    <>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 16 }}>
                        {[
                          ["❤️ Blood Pressure", pendingVitals?.bp],
                          ["🌡 Temperature",    pendingVitals?.temp],
                          ["⚖️ Weight",         pendingVitals?.weight],
                          ["💓 Pulse",          pendingVitals?.pulse],
                          ["🫁 SpO₂",           pendingVitals?.spo2],
                          ["📋 Complaint",      pendingVitals?.complaint],
                        ].filter(([,v]) => v).map(([label, value]) => (
                          <div key={label} style={{ background: "#f8fafc", borderRadius: 8, padding: "10px 12px" }}>
                            <div style={{ fontSize: 10, color: C.textLight, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 3 }}>{label}</div>
                            <div style={{ fontWeight: 700, fontSize: 15, color: C.text }}>{value}</div>
                          </div>
                        ))}
                      </div>
                      {pendingVitals?.recordedAt && (
                        <div style={{ fontSize: 11, color: C.textLight, marginBottom: 14 }}>Recorded at {pendingVitals.recordedAt}</div>
                      )}
                      <div style={{ background: C.greenLight, border: `1.5px solid ${C.green}`, borderRadius: 9, padding: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ fontSize: 13, color: C.green, fontWeight: 700 }}>✓ Copy vitals into the Consultation form</div>
                        <Btn color={C.green} onClick={confirmVitals}>
                          <CheckCircle size={13} /> Use These Vitals
                        </Btn>
                      </div>
                    </>
                  )}
                </Card>
              )}

              {/* ══ TAB: Lab Results ══ */}
              {tab === "lab" && (
                <Card title="🔬 Lab Results">
                  {/* Order a test — searchable dropdown */}
                  <div style={{ marginBottom: 16, padding: "14px 16px", background: C.amberLight, borderRadius: 10, border: `1px solid ${C.amber}33` }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: C.amber, marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.05em" }}>Order a Lab Test</div>
                    <div style={{ position: "relative" }}>
                      <div style={{ position: "relative" }}>
                        <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: 14, color: C.textLight, pointerEvents: "none" }}>🔍</span>
                        <input
                          value={labSearch}
                          onChange={e => { setLabSearch(e.target.value); setLabTest(""); }}
                          placeholder="Type to search lab tests (e.g. malaria, blood count)…"
                          style={{ width: "100%", padding: "10px 12px 10px 32px", border: `1.5px solid ${C.amber}`, borderRadius: 8, fontSize: 14, fontFamily: "inherit", boxSizing: "border-box", background: "#fff" }}
                          onFocus={() => { if (!labSearch) setLabSearch(" "); setTimeout(() => setLabSearch(""), 0); }}
                        />
                      </div>

                      {/* Dropdown results */}
                      {labSearch.trim() && !labTest && (
                        <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 20, background: "#fff", border: `1.5px solid ${C.border}`, borderRadius: 8, marginTop: 4, maxHeight: 250, overflowY: "auto", boxShadow: "0 8px 24px rgba(0,0,0,0.12)" }}>
                          {labFiltered.length === 0 ? (
                            <div style={{ padding: 16, fontSize: 13, color: C.textLight, textAlign: "center" }}>No lab tests matching "{labSearch}"</div>
                          ) : labFiltered.map(svc => (
                            <div key={svc.id}
                              onClick={() => { setLabTest(svc.name); setLabSearch(svc.name); }}
                              style={{ padding: "11px 16px", cursor: "pointer", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}
                              onMouseEnter={e => e.currentTarget.style.background = C.amberLight}
                              onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                              <div>
                                <div style={{ fontWeight: 600, fontSize: 14, color: C.text }}>🔬 {svc.name}</div>
                              </div>
                              <div style={{ fontWeight: 700, color: C.green, fontSize: 14 }}>UGX {svc.price.toLocaleString()}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Selected test + send button */}
                    {labTest && (
                      <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fff", border: `1.5px solid ${C.amber}`, borderRadius: 9, padding: "12px 16px" }}>
                        <div>
                          <span style={{ fontWeight: 700, color: C.text, fontSize: 14 }}>🔬 {labTest}</span>
                          <span style={{ fontSize: 13, color: C.green, fontWeight: 700, marginLeft: 14 }}>UGX {(labServices.find(s=>s.name===labTest)?.price||0).toLocaleString()}</span>
                        </div>
                        <Btn color={C.amber} onClick={() => {
                          const svc = labServices.find(s => s.name === labTest);
                          quickRoute("lab", labTest, svc?.price || 0);
                        }} style={{ fontSize: 14, padding: "10px 24px" }}>
                          <TestTube2 size={14} /> Send to Lab
                        </Btn>
                      </div>
                    )}
                  </div>

                  {/* Pending orders */}
                  {myLabPending.length > 0 && (
                    <div style={{ marginBottom: 14 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: C.amber, marginBottom: 8 }}>⏳ Pending</div>
                      {myLabPending.map(o => (
                        <div key={o.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: C.amberLight, borderRadius: 7, marginBottom: 6 }}>
                          <div>
                            <div style={{ fontWeight: 600 }}>{o.test}</div>
                            {o.price > 0 && <div style={{ fontSize: 11, color: C.green }}>UGX {o.price.toLocaleString()}</div>}
                          </div>
                          <Badge label="Awaiting Results" color={C.amber} />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Completed results */}
                  {myLabResults.length === 0
                    ? <EmptyState icon="🔬" message="No lab results back yet" />
                    : (
                      <>
                        {myLabResults.map(o => (
                          <div key={o.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "10px 12px", border: `1px solid ${C.green}44`, borderRadius: 8, marginBottom: 8, background: C.greenLight }}>
                            <div>
                              <div style={{ fontWeight: 700 }}>{o.test}</div>
                              <div style={{ fontSize: 13, color: C.green, marginTop: 3 }}>Result: <b>{o.result}</b></div>
                              <div style={{ fontSize: 11, color: C.textLight }}>{o.timestamp}</div>
                            </div>
                            <Badge label="READY" color={C.green} />
                          </div>
                        ))}
                        <div style={{ background: C.greenLight, border: `1.5px solid ${C.green}`, borderRadius: 9, padding: 14, display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
                          <div style={{ fontSize: 13, color: C.green, fontWeight: 700 }}>
                            ✓ Confirm to copy results into the Consultation form
                          </div>
                          <Btn color={C.green} onClick={confirmLabResults}>
                            <CheckCircle size={13} /> Use These Results
                          </Btn>
                        </div>
                      </>
                    )}
                </Card>
              )}

              {/* ══ TAB: Consultation (main form) ══ */}
              {tab === "consultation" && (
                <>
                  {/* Show any copied results as banners */}
                  {form.vitalsNote && (
                    <div style={{ background: C.purpleLight, border: `1px solid ${C.purple}33`, borderRadius: 8, padding: "8px 14px", marginBottom: 10, fontSize: 12, color: C.purple }}>
                      <b>Vitals:</b> {form.vitalsNote}
                    </div>
                  )}
                  {form.labNote && (
                    <div style={{ background: C.amberLight, border: `1px solid ${C.amber}33`, borderRadius: 8, padding: "8px 14px", marginBottom: 10, fontSize: 12, color: "#92400e" }}>
                      <b>Lab Results:</b> {form.labNote}
                    </div>
                  )}

                  {/* Main clinical form */}
                  <Card title="Clinical Report">
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                      <div style={{ gridColumn: "span 2" }}>
                        <Input label="Chief Complaint" value={form.complaint} onChange={v => set("complaint", v)} placeholder="Patient's presenting complaint" />
                      </div>

                      {/* Vitals note — auto-filled or manual */}
                      <div style={{ gridColumn: "span 2" }}>
                        <Input label="Vitals (auto-filled from nurse, or type manually)" value={form.vitalsNote} onChange={v => set("vitalsNote", v)}
                          placeholder="e.g. BP: 130/85 | Temp: 37.2°C | Weight: 68kg | Pulse: 78" />
                      </div>

                      {/* Lab note — auto-filled or manual */}
                      <div style={{ gridColumn: "span 2" }}>
                        <Input label="Lab Results (auto-filled from lab, or type manually)" value={form.labNote} onChange={v => set("labNote", v)}
                          placeholder="e.g. Malaria RDT: Positive | Hb: 11.2 g/dL" />
                      </div>

                      {/* Diagnosis — the key field, filled after seeing results */}
                      <div style={{ gridColumn: "span 2" }}>
                        <Input label="Diagnosis ★" value={form.diagnosis} onChange={v => set("diagnosis", v)}
                          placeholder="Clinical diagnosis (required)" required />
                      </div>

                      <Input label="Treatment Plan" value={form.treatment} onChange={v => set("treatment", v)} placeholder="Immediate treatment given" />

                      <Select label="Route Patient To ★" value={form.sendTo} onChange={v => set("sendTo", v)}
                        options={[
                          { value: "pharmacy", label: "💊 Pharmacy — Collect medication" },
                          { value: "admit",    label: "🏥 Admit — Patient needs admission" },
                          { value: "done",     label: "✅ Discharged — No medication needed" },
                        ]} required />

                      {/* Admit preview note */}
                      {form.sendTo === "admit" && (
                        <div style={{ gridColumn:"span 2", background:C.purpleLight, border:`1.5px solid ${C.purple}`, borderRadius:9, padding:"10px 14px", fontSize:13, color:C.purple, fontWeight:600 }}>
                          🏥 After saving this report you will be taken to the Admission form to complete the admission.
                        </div>
                      )}

                      <div style={{ gridColumn: "span 2" }}>
                        <Textarea label="Prescriptions (one per line)" value={form.prescriptions} onChange={v => set("prescriptions", v)}
                          placeholder={"Paracetamol 500mg TDS × 5 days\nAmoxicillin 500mg BD × 7 days\nORS sachets as needed"} rows={4} />
                      </div>

                      <div style={{ gridColumn: "span 2" }}>
                        <Textarea label="Doctor's Notes (optional)" value={form.notes} onChange={v => set("notes", v)}
                          placeholder="Follow-up instructions, referrals, observations…" rows={2} />
                      </div>
                    </div>

                    <div style={{ marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>
                      <Btn color={form.sendTo==="admit"?C.purple:C.green} onClick={saveVisit} disabled={saving}>
                        <FileText size={13} /> {saving ? "Saving…" : form.sendTo==="admit"?"Save & Proceed to Admit":"Save Report & Route Patient"}
                      </Btn>
                      {form.diagnosis && (
                        <Btn outline color={C.accent} onClick={() => {
                          if (!form.diagnosis) { alert("Fill in the diagnosis first."); return; }
                          const preview = {
                            id: `PREVIEW-${Date.now()}`, date: today(), doctor: user.name,
                            complaint: form.complaint, vitalsNote: form.vitalsNote, labResults: form.labNote,
                            diagnosis: form.diagnosis, treatment: form.treatment,
                            prescriptions: form.prescriptions.split("\n").filter(Boolean), notes: form.notes, vitals: pendingVitals || {}
                          };
                          printReport(patient, preview);
                        }}>
                          <Printer size={13} /> Preview Report
                        </Btn>
                      )}
                    </div>
                  </Card>
                </>
              )}

              {/* ══ TAB: Visit History ══ */}
              {tab === "history" && (
                <Card title={`Visit History — ${patient.name} (${patient.visits?.length || 0} visits)`}>
                  {!patient.visits?.length
                    ? <EmptyState icon="📋" message="No previous visits on record" />
                    : [...patient.visits].reverse().map(v => (
                      <div key={v.id} style={{ border: `1px solid ${C.border}`, borderRadius: 10, marginBottom: 10, overflow: "hidden" }}>
                        {/* Header */}
                        <div style={{ padding: "10px 14px", background: "#f8fafc", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div>
                            <span style={{ fontWeight: 700, color: C.text }}>{v.diagnosis}</span>
                            <span style={{ fontSize: 11, color: C.textMid, marginLeft: 10 }}>Dr. {v.doctor}</span>
                          </div>
                          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                            <span style={{ fontSize: 11, color: C.textLight, fontFamily: "'IBM Plex Mono',monospace" }}>{v.date}</span>
                            <Btn small outline color={C.accent} onClick={() => printReport(patient, v)}>
                              <Printer size={11} /> Print
                            </Btn>
                          </div>
                        </div>
                        {/* Body */}
                        <div style={{ padding: "10px 14px", fontSize: 12, color: C.textMid }}>
                          {v.complaint && <div><b>Complaint:</b> {v.complaint}</div>}
                          {(v.vitalsNote || (v.vitals && Object.values(v.vitals).some(Boolean))) && (
                            <div style={{ marginTop: 4 }}><b>Vitals:</b> {v.vitalsNote || Object.entries(v.vitals||{}).filter(([,x])=>x).map(([k,x])=>`${k}:${x}`).join(" · ")}</div>
                          )}
                          {v.labResults && <div style={{ marginTop: 4 }}><b>Lab:</b> {v.labResults}</div>}
                          {v.treatment && <div style={{ marginTop: 4 }}><b>Treatment:</b> {v.treatment}</div>}
                          {v.prescriptions?.length > 0 && (
                            <div style={{ marginTop: 6 }}>
                              <b>Rx:</b>
                              {v.prescriptions.map((r, i) => (
                                <span key={i} style={{ display: "inline-block", background: "#f0f4ff", border: "1px solid #c7d2fe", borderRadius: 5, padding: "1px 8px", fontSize: 11, margin: "2px 4px" }}>💊 {r}</span>
                              ))}
                            </div>
                          )}
                          {v.notes && <div style={{ marginTop: 6, color: C.textLight, fontStyle: "italic" }}>{v.notes}</div>}
                        </div>
                      </div>
                    ))}
                </Card>
              )}
            </>
          )}
      </div>
    </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DENTIST VIEW  — same structure as doctor, no nurse/lab tabs
// ─────────────────────────────────────────────────────────────────────────────
export function DentistView({ patients, queue, user, reload }) {
  const [pid, setPid] = useState("");
  const [tab, setTab] = useState("consultation");
  const [form, setForm] = useState({ complaint:"", diagnosis:"", treatment:"", prescriptions:"", notes:"", sendTo:"" });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const myQueue = queue.filter(e => e.stage === "dentist");
  const patient = patients.find(p => p.id === pid);

  const selectPatient = (newPid) => {
    setPid(newPid);
    setTab("consultation");
    const qEntry = queue.find(e => e.patientId === newPid);
    setForm({ complaint: qEntry?.complaint || "", diagnosis:"", treatment:"", prescriptions:"", notes:"", sendTo:"" });
  };

  const saveVisit = async () => {
    if (!form.diagnosis.trim()) { alert("Diagnosis is required."); return; }
    if (!form.sendTo) { alert("Please select where to route the patient."); return; }
    setSaving(true);
    try {
      const visit = {
        id: `V${Date.now()}`, date: today(), doctor: user.name,
        complaint: form.complaint, diagnosis: form.diagnosis,
        treatment: form.treatment, notes: form.notes,
        prescriptions: form.prescriptions.split("\n").filter(Boolean),
        vitals: {}, labOrders: [], stage: form.sendTo,
      };
      await api.updatePatient(pid, { addVisit: visit, clearPendingVitals: true });
      const inQueue = queue.find(e => e.patientId === pid);
      if (inQueue) await api.updateQueue(pid, { stage: form.sendTo });
      if (window.confirm("Visit saved! Print the report now?")) printReport(patient, visit);
      setForm({ complaint:"", diagnosis:"", treatment:"", prescriptions:"", notes:"", sendTo:"" });
      setPid(""); reload();
    } catch(e) { alert(e.message); } finally { setSaving(false); }
  };

  return (
    <div style={{ padding: 24, display: "grid", gridTemplateColumns: "260px 1fr", gap: 18 }}>
      <div>
        <Card title={`Dental Queue (${myQueue.length})`} style={{ marginBottom: 12 }}>
          {myQueue.length === 0 ? <EmptyState icon="🦷" message="No patients in dental queue" />
            : myQueue.map(e => (
              <div key={e.patientId} onClick={() => selectPatient(e.patientId)}
                style={{ padding: "9px 10px", borderRadius: 8, border: `1.5px solid ${pid === e.patientId ? C.blue : C.border}`, cursor: "pointer", marginBottom: 6, background: pid === e.patientId ? C.blueLight : "transparent" }}>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{e.name}</div>
                <div style={{ fontSize: 10, color: C.textMid, fontFamily: "'IBM Plex Mono',monospace" }}>{e.patientId}</div>
                <div style={{ fontSize: 11, color: C.textLight }}>{e.complaint}</div>
              </div>
            ))}
        </Card>
        {patient && (
          <Card title="Patient">
            <div style={{ fontSize: 13, lineHeight: 1.9, color: C.textMid }}>
              <div style={{ fontWeight: 700, color: C.text }}>{patient.name}</div>
              <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11 }}>{patient.id}</div>
              <div>DOB: {patient.dob || "—"}</div><div>Gender: {patient.gender || "—"}</div>
              {patient.class && <div>Class: {patient.class}</div>}
              <div style={{ fontSize: 11, marginTop: 4 }}>📞 {patient.emergencyContact || "—"}</div>
            </div>
          </Card>
        )}
      </div>

      <div>
        {!patient ? <EmptyState icon="🦷" message="Select a patient from the dental queue" /> : (
          <>
            <div style={{ display: "flex", gap: 4, marginBottom: 16, borderBottom: `2px solid ${C.border}` }}>
              {[{id:"consultation",label:"📝 Consultation"},{id:"history",label:"📚 Visit History"}].map(t => (
                <button key={t.id} onClick={() => setTab(t.id)}
                  style={{ padding: "8px 16px", border: "none", borderBottom: `3px solid ${tab===t.id?C.blue:"transparent"}`, background: "transparent", cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: tab===t.id?700:500, color: tab===t.id?C.blue:C.textMid, marginBottom: -2 }}>
                  {t.label}
                </button>
              ))}
            </div>

            {tab === "consultation" && (
              <Card title="Dental Clinical Report">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div style={{ gridColumn: "span 2" }}>
                    <Input label="Chief Complaint" value={form.complaint} onChange={v => set("complaint", v)} placeholder="e.g. Toothache, Swollen gum, Extraction request" />
                  </div>
                  <div style={{ gridColumn: "span 2" }}>
                    <Input label="Diagnosis ★" value={form.diagnosis} onChange={v => set("diagnosis", v)} placeholder="Dental diagnosis" required />
                  </div>
                  <Input label="Treatment / Procedure" value={form.treatment} onChange={v => set("treatment", v)} placeholder="e.g. Extraction, Filling, Scale and polish" />
                  <Select label="Route Patient To ★" value={form.sendTo} onChange={v => set("sendTo", v)}
                    options={[
                      { value: "pharmacy", label: "💊 Pharmacy — Medication needed" },
                      { value: "done",     label: "✅ Done — No medication needed" },
                    ]} required />
                  <div style={{ gridColumn: "span 2" }}>
                    <Textarea label="Prescriptions (one per line)" value={form.prescriptions} onChange={v => set("prescriptions", v)}
                      placeholder={"Amoxicillin 500mg TDS × 5 days\nIbuprofen 400mg TDS × 3 days"} rows={3} />
                  </div>
                  <div style={{ gridColumn: "span 2" }}>
                    <Textarea label="Clinical Notes" value={form.notes} onChange={v => set("notes", v)} placeholder="Procedure details, follow-up, referral…" rows={2} />
                  </div>
                </div>
                <div style={{ marginTop: 14, display: "flex", gap: 10 }}>
                  <Btn color={C.blue} onClick={saveVisit} disabled={saving}>
                    <FileText size={13} /> {saving ? "Saving…" : "Save Report & Route Patient"}
                  </Btn>
                  {form.diagnosis && (
                    <Btn outline color={C.accent} onClick={() => printReport(patient, { ...form, id:`PREV-${Date.now()}`, date:today(), doctor:user.name, prescriptions:form.prescriptions.split("\n").filter(Boolean), vitals:{} })}>
                      <Printer size={13} /> Preview Report
                    </Btn>
                  )}
                </div>
              </Card>
            )}

            {tab === "history" && (
              <Card title={`Visit History (${patient.visits?.length || 0})`}>
                {!patient.visits?.length ? <EmptyState icon="📋" message="No visits on record" />
                  : [...patient.visits].reverse().map(v => (
                    <div key={v.id} style={{ border: `1px solid ${C.border}`, borderRadius: 10, marginBottom: 10, overflow: "hidden" }}>
                      <div style={{ padding: "10px 14px", background: "#f8fafc", display: "flex", justifyContent: "space-between" }}>
                        <span style={{ fontWeight: 700 }}>{v.diagnosis}</span>
                        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                          <span style={{ fontSize: 11, color: C.textLight, fontFamily: "'IBM Plex Mono',monospace" }}>{v.date}</span>
                          <Btn small outline color={C.accent} onClick={() => printReport(patient, v)}><Printer size={11}/> Print</Btn>
                        </div>
                      </div>
                      <div style={{ padding: "8px 14px", fontSize: 12, color: C.textMid }}>
                        {v.treatment && <div><b>Treatment:</b> {v.treatment}</div>}
                        {v.prescriptions?.length > 0 && <div><b>Rx:</b> {v.prescriptions.join(", ")}</div>}
                        {v.notes && <div style={{ color: C.textLight, fontStyle: "italic" }}>{v.notes}</div>}
                      </div>
                    </div>
                  ))}
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LAB VIEW  — run tests, submit results → patient returns to doctor
// ─────────────────────────────────────────────────────────────────────────────
export function LabView({ labOrders, queue, reload }) {
  const [results, setResults] = useState({});
  const pending   = labOrders.filter(o => o.status === "pending");
  const completed = labOrders.filter(o => o.status === "completed");

  const upload = async (order) => {
    const result = results[order.id];
    if (!result?.trim()) { alert("Enter the test results first."); return; }
    try {
      // Step 1: Save the lab result
      await api.updateLabOrder(order.id, { status: "completed", result });

      // Step 2: Route patient back to doctor
      const inQueue = queue.find(e => e.patientId === order.patientId && e.stage === "lab");
      if (inQueue) {
        await api.updateQueue(order.patientId, { stage: "doctor" });
      }

      setResults(r => { const n = {...r}; delete n[order.id]; return n; });
      reload();
    } catch(e) {
      // Show error but DO NOT reload — preserves doctor's in-progress state
      alert(`Error: ${e.message}\n\nThe lab result may have been saved but the patient was not routed back to the doctor. Ask your system administrator to check the server.js queue route permissions.`);
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 20 }}>
        {[["Pending Tests", pending.length, C.amber],["Completed", completed.length, C.green],["Total Orders", labOrders.length, C.accent]].map(([label,value,color])=>(
          <div key={label} style={{ background:`linear-gradient(135deg,${color},${color}aa)`, borderRadius:12, padding:"16px 20px", color:"#fff" }}>
            <div style={{ fontSize:11, opacity:0.8, marginBottom:4 }}>{label}</div>
            <div style={{ fontSize:30, fontWeight:800 }}>{value}</div>
          </div>
        ))}
      </div>

      <Card title="Pending Tests" style={{ marginBottom: 16 }}>
        {pending.length === 0 ? <EmptyState icon="🔬" message="No pending tests" /> : pending.map(o => (
          <div key={o.id} style={{ padding: 14, border: `1px solid ${C.amber}44`, borderRadius: 9, marginBottom: 8, background: C.amberLight }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{o.test}</div>
                <div style={{ fontSize: 11, color: C.textMid, fontFamily: "'IBM Plex Mono',monospace" }}>
                  {o.patientName} · {o.patientId} · Ordered by {o.requestedBy} · {o.timestamp}
                </div>
              </div>
              <Badge label="PENDING" color={C.amber} />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <input value={results[o.id] || ""} onChange={e => setResults(r => ({ ...r, [o.id]: e.target.value }))}
                placeholder="Enter test results here…"
                style={{ flex: 1, border: `1.5px solid ${C.border}`, borderRadius: 7, padding: "7px 10px", fontSize: 13, fontFamily: "inherit" }} />
              <Btn color={C.green} onClick={() => upload(o)}>
                <Upload size={11} /> Submit & Return to Doctor
              </Btn>
            </div>
          </div>
        ))}
      </Card>

      <Card title="Completed Tests">
        {completed.length === 0 ? <EmptyState icon="✅" message="No completed tests yet" /> : completed.map(o => (
          <div key={o.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${C.border}` }}>
            <div>
              <div style={{ fontWeight: 600 }}>{o.test} — {o.patientName}</div>
              <div style={{ fontSize: 12, color: C.green, marginTop: 2 }}>Result: <b>{o.result}</b></div>
              <div style={{ fontSize: 11, color: C.textLight, fontFamily: "'IBM Plex Mono',monospace" }}>{o.timestamp}</div>
            </div>
            <Badge label="DONE" color={C.green} />
          </div>
        ))}
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PHARMACY VIEW  — searchable drug dropdown, accumulated bill, payment
// ─────────────────────────────────────────────────────────────────────────────
export function PharmacyView({ patients, queue, services, bills, setBills, user, reload }) {
  const pharmQueue = queue.filter(e => e.stage === "pharmacy");
  const [activePid, setActivePid] = useState(null);
  const [drugSearch, setDrugSearch] = useState("");
  const [addedDrugs, setAddedDrugs] = useState([]); // [{name, price, qty}]
  const [payAmt, setPayAmt]   = useState("");
  const [payMethod, setPayMethod] = useState("Cash");
  const [saving, setSaving]   = useState(false);
  const [customDrug, setCustomDrug] = useState({ name:"", price:"" });

  // Drug catalogue from services
  const allDrugs = (services||[]).filter(s => s.active && s.category === "Pharmacy");
  const drugFiltered = drugSearch.trim()
    ? allDrugs.filter(d => d.name.toLowerCase().includes(drugSearch.toLowerCase()))
    : allDrugs;

  // Get the FRESH bill from server when selecting a patient (not stale local state)
  const [liveBill, setLiveBill] = useState(null);
  const [loadingBill, setLoadingBill] = useState(false);

  const selectPatient = async (pid) => {
    setActivePid(pid);
    setAddedDrugs([]);
    setDrugSearch("");
    setPayAmt("");
    setPayMethod("Cash");
    setLiveBill(null);
    setLoadingBill(true);
    try {
      const bill = await api.getPatientBill(pid);
      setLiveBill(bill);
    } catch(e) { console.warn("Could not fetch bill:", e); }
    finally { setLoadingBill(false); }
  };

  const addDrug = (drug) => {
    const exists = addedDrugs.find(d => d.name === drug.name);
    if (exists) setAddedDrugs(prev => prev.map(d => d.name === drug.name ? { ...d, qty: d.qty + 1 } : d));
    else setAddedDrugs(prev => [...prev, { name: drug.name, price: drug.price, qty: 1 }]);
    setDrugSearch("");
  };

  const addCustomDrug = () => {
    if (!customDrug.name || !customDrug.price) return;
    addDrug({ name: customDrug.name, price: parseInt(customDrug.price) });
    setCustomDrug({ name:"", price:"" });
  };

  const removeDrug = (name) => setAddedDrugs(prev => prev.filter(d => d.name !== name));
  const updateDrugQty = (name, qty) => setAddedDrugs(prev => prev.map(d => d.name === name ? { ...d, qty: Math.max(1, qty) } : d));
  const drugsTotal = addedDrugs.reduce((s, d) => s + d.price * d.qty, 0);

  // ── Print full receipt with ALL charges ──────────────────────────────────
  const printReceipt = (bill, patientName) => {
    const win = window.open("","_blank","width=440,height=750");
    const items = (bill.services||[]).map(s =>
      `<tr><td style="padding:3px 0">${s.name}</td><td style="text-align:right;padding:3px 0">×${s.qty}</td><td style="text-align:right;padding:3px 0;font-weight:bold">UGX ${s.subtotal.toLocaleString()}</td></tr>`
    ).join("");
    const payments = (bill.payments||[]).map(p =>
      `<div style="display:flex;justify-content:space-between;font-size:12px;padding:2px 0"><span>${p.date} · ${p.method}</span><span>UGX ${p.amount.toLocaleString()}</span></div>`
    ).join("");
    win.document.write(`<!DOCTYPE html><html><head><title>Receipt</title>
    <style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Courier New',monospace;padding:20px;font-size:13px;max-width:380px;margin:0 auto}
    .center{text-align:center}.div{border-top:1px dashed #333;margin:10px 0}
    table{width:100%;border-collapse:collapse}
    .total{font-size:18px;font-weight:bold}.green{color:#16a34a}.red{color:#dc2626}
    button{display:block;margin:16px auto;padding:8px 24px;background:#0e7490;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:13px}
    @media print{button{display:none}}</style></head><body>
    <div class="center">
      <div style="font-size:28px">🏥</div>
      <div style="font-size:18px;font-weight:bold">HMS CLINIC</div>
      <div style="font-size:11px;color:#666;letter-spacing:0.1em">PATIENT RECEIPT</div>
    </div>
    <div class="div"></div>
    <div style="display:flex;justify-content:space-between;font-size:12px">
      <span>Receipt: <b>${bill.id}</b></span><span>${bill.date}</span>
    </div>
    <div style="margin:4px 0;font-weight:bold;font-size:14px">${patientName}</div>
    <div class="div"></div>
    <table>
      <thead><tr style="border-bottom:1px solid #333">
        <th style="text-align:left;font-size:11px;padding-bottom:4px">SERVICE</th>
        <th style="text-align:right;font-size:11px;padding-bottom:4px">QTY</th>
        <th style="text-align:right;font-size:11px;padding-bottom:4px">AMOUNT</th>
      </tr></thead>
      <tbody>${items}</tbody>
    </table>
    <div class="div"></div>
    <div style="display:flex;justify-content:space-between" class="total">
      <span>TOTAL</span><span>UGX ${bill.totalAmount.toLocaleString()}</span>
    </div>
    <div style="display:flex;justify-content:space-between;font-size:14px" class="green">
      <span>PAID</span><span>UGX ${bill.amountPaid.toLocaleString()}</span>
    </div>
    ${bill.balance > 0 ? `<div style="display:flex;justify-content:space-between;font-size:14px;font-weight:bold" class="red"><span>BALANCE DUE</span><span>UGX ${bill.balance.toLocaleString()}</span></div>` : ""}
    <div class="div"></div>
    <div style="font-weight:bold;font-size:11px;margin-bottom:4px">PAYMENT HISTORY</div>
    ${payments || '<div style="font-size:11px;color:#666">No payments recorded</div>'}
    <div class="div"></div>
    <div class="center" style="font-size:11px;color:#666">
      ${bill.balance > 0 ? "Please clear your balance at your next visit" : "✓ FULLY PAID — Thank you!"}
    </div>
    <div class="center" style="font-size:10px;color:#999;margin-top:8px">Printed: ${new Date().toLocaleString()}</div>
    <button onclick="window.print()">🖨 Print Receipt</button>
    </body></html>`);
    win.document.close();
  };

  const dispenseAndCollect = async (entry) => {
    setSaving(true);
    try {
      let bill = liveBill;

      // If no bill exists, create one now
      if (!bill) {
        bill = await api.createBill({
          patientId: entry.patientId,
          patientName: patients.find(x=>x.id===entry.patientId)?.name || entry.name,
          services: [],
          totalAmount: 0,
        });
      }

      // Add each drug to the bill
      if (addedDrugs.length > 0) {
        for (const drug of addedDrugs) {
          await api.addBillItem(bill.id, { name: drug.name, price: drug.price, qty: drug.qty, category: "Pharmacy" });
        }
      }

      // Refetch the complete updated bill (now has consultation + lab + drugs)
      const finalBill = await api.getPatientBill(entry.patientId) || bill;
      const grandTotal = finalBill.totalAmount;
      const payAmount = parseInt(payAmt) || grandTotal;

      // Collect payment (full or partial)
      let paidBill = finalBill;
      if (payAmount > 0) {
        paidBill = await api.payBill(finalBill.id, { amount: payAmount, method: payMethod, cashier: user?.name || "" });
        setBills(prev => {
          const exists = prev.find(b => b.id === paidBill.id);
          return exists ? prev.map(b => b.id === paidBill.id ? paidBill : b) : [...prev, paidBill];
        });
      }

      // Also create a transaction record (with ALL services from the bill)
      const patientName = patients.find(x=>x.id===entry.patientId)?.name || entry.name;
      await api.addTransaction({
        id: `TXN-${new Date().toISOString().slice(0,10).replace(/-/g,"")}-${Math.floor(100+Math.random()*900)}`,
        patientId: entry.patientId,
        patientName,
        services: (paidBill.services||[]).map(s => `${s.name} x${s.qty}`),
        amount: payAmount,
        method: payMethod,
        cashier: user?.name || "",
        timestamp: now(),
        date: today(),
      });

      // Close the visit
      await api.updateQueue(entry.patientId, { stage: "done" });

      // Print receipt
      printReceipt(paidBill, patientName);

      setActivePid(null);
      setAddedDrugs([]);
      setLiveBill(null);
      setPayAmt("");
      reload();
    } catch(e) { alert(e.message); } finally { setSaving(false); }
  };

  const getLastVisit = (pid) => {
    const p = patients.find(x => x.id === pid);
    return p?.visits?.slice(-1)[0] || null;
  };

  return (
    <div style={{ padding: 24, display: "grid", gridTemplateColumns: "280px 1fr", gap: 18 }}>

      {/* Left: pharmacy queue */}
      <div>
        <div style={{ background: `linear-gradient(135deg,${C.pink},${C.pink}88)`, borderRadius: 12, padding: "16px 20px", color: "#fff", marginBottom: 14 }}>
          <div style={{ fontSize: 11, opacity: 0.8, marginBottom: 2 }}>AWAITING PHARMACY</div>
          <div style={{ fontSize: 28, fontWeight: 800 }}>{pharmQueue.length}</div>
        </div>
        <Card>
          {pharmQueue.length === 0
            ? <EmptyState icon="💊" message="No prescriptions pending" />
            : pharmQueue.map(entry => {
              const localBill = (bills||[]).find(b => b.patientId === entry.patientId && b.status !== "paid");
              const billTotal = localBill?.totalAmount || 0;
              return (
                <div key={entry.patientId} onClick={() => selectPatient(entry.patientId)}
                  style={{ padding: "10px", borderRadius: 8, border: `1.5px solid ${activePid === entry.patientId ? C.pink : C.border}`, cursor: "pointer", marginBottom: 8, background: activePid === entry.patientId ? "#fdf2ff" : "transparent" }}>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{entry.name}</div>
                  <div style={{ fontSize: 10, color: C.textMid, fontFamily: "'IBM Plex Mono',monospace" }}>{entry.patientId}</div>
                  {billTotal > 0 && (
                    <div style={{ fontSize: 11, color: C.green, fontWeight: 700, marginTop: 3 }}>
                      Running bill: UGX {billTotal.toLocaleString()}
                    </div>
                  )}
                </div>
              );
            })}
        </Card>
      </div>

      {/* Right: drug dispensing + bill */}
      <div>
        {!activePid ? (
          <div style={{ textAlign: "center", padding: "80px 20px", color: C.textLight }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>💊</div>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Select a patient from the pharmacy queue</div>
            <div style={{ fontSize: 13 }}>Dispense medication, add to bill, and collect payment</div>
          </div>
        ) : (() => {
          const entry = pharmQueue.find(e => e.patientId === activePid);
          if (!entry) return <EmptyState icon="💊" message="Patient not found in queue" />;
          if (loadingBill) return <div style={{ padding: 40, textAlign: "center", color: C.textLight }}>Loading patient bill…</div>;
          const bill = liveBill; // fresh from server, not stale local state
          const lastVisit = getLastVisit(activePid);
          const existingItems = bill?.services || [];
          const existingTotal = existingItems.reduce((s, i) => s + (i.subtotal||0), 0);
          const grandTotal = existingTotal + drugsTotal;
          const alreadyPaid = bill?.amountPaid || 0;
          const balanceDue = grandTotal - alreadyPaid;

          return (
            <>
              {/* Patient + prescription header */}
              <Card style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 18 }}>{entry.name}</div>
                    <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, color: C.textMid }}>{entry.patientId}</div>
                    {lastVisit && <div style={{ fontSize: 12, color: C.textMid, marginTop: 4 }}>Diagnosis: <b>{lastVisit.diagnosis}</b> · Dr. {lastVisit.doctor}</div>}
                  </div>
                  <Badge label="AT PHARMACY" color={C.pink} />
                </div>
                {lastVisit?.prescriptions?.length > 0 && (
                  <div style={{ marginTop: 12 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: C.textMid, textTransform: "uppercase", marginBottom: 6 }}>Doctor's Prescriptions</div>
                    {lastVisit.prescriptions.map((r, i) => (
                      <div key={i} style={{ padding: "8px 14px", background: "#fdf2ff", border: "1px solid #f0abfc", borderRadius: 7, marginBottom: 5, fontSize: 13 }}>💊 {r}</div>
                    ))}
                  </div>
                )}
              </Card>

              {/* Running bill — items already accumulated */}
              <Card title="📋 Running Bill (auto-accumulated)" style={{ marginBottom: 14 }}>
                {existingItems.length === 0
                  ? <div style={{ fontSize: 12, color: C.textLight, padding: 8 }}>No charges recorded yet</div>
                  : (
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, marginBottom: 8 }}>
                      <thead><tr style={{ borderBottom: `2px solid ${C.border}` }}>
                        {["Service", "Category", "Qty", "Amount"].map(h => <th key={h} style={{ textAlign: "left", padding: "5px 8px", fontSize: 10, color: C.textLight, fontWeight: 700, textTransform: "uppercase" }}>{h}</th>)}
                      </tr></thead>
                      <tbody>
                        {existingItems.map((item, i) => (
                          <tr key={i} style={{ borderBottom: `1px solid ${C.border}` }}>
                            <td style={{ padding: "7px 8px", fontWeight: 600 }}>{item.name}</td>
                            <td style={{ padding: "7px 8px" }}><Badge label={item.category||"Other"} color={item.category==="Consultation"?C.green:item.category==="Laboratory"?C.amber:C.accent} /></td>
                            <td style={{ padding: "7px 8px" }}>×{item.qty}</td>
                            <td style={{ padding: "7px 8px", fontWeight: 700, color: C.green }}>UGX {item.subtotal.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                <div style={{ textAlign: "right", fontWeight: 700, color: C.textMid, fontSize: 13 }}>
                  Subtotal: UGX {existingTotal.toLocaleString()}
                </div>
              </Card>

              {/* Drug selection — searchable dropdown */}
              <Card title="💊 Add Dispensed Drugs" style={{ marginBottom: 14 }}>
                <div style={{ position: "relative", marginBottom: 12 }}>
                  <div style={{ display: "flex", gap: 8 }}>
                    <div style={{ flex: 1, position: "relative" }}>
                      <span style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: C.textLight, pointerEvents: "none" }}>🔍</span>
                      <input
                        value={drugSearch}
                        onChange={e => setDrugSearch(e.target.value)}
                        placeholder="Search drugs (e.g. Paracetamol, Amoxicillin)…"
                        style={{ width: "100%", padding: "9px 10px 9px 30px", border: `1.5px solid ${C.pink}`, borderRadius: 7, fontSize: 13, fontFamily: "inherit", boxSizing: "border-box" }}
                      />
                    </div>
                  </div>

                  {/* Dropdown */}
                  {drugSearch.trim() && (
                    <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 20, background: "#fff", border: `1.5px solid ${C.border}`, borderRadius: 8, marginTop: 4, maxHeight: 220, overflowY: "auto", boxShadow: "0 8px 24px rgba(0,0,0,0.12)" }}>
                      {drugFiltered.length === 0 ? (
                        <div style={{ padding: 14, fontSize: 12, color: C.textLight, textAlign: "center" }}>No drugs matching "{drugSearch}"</div>
                      ) : drugFiltered.map(d => (
                        <div key={d.id} onClick={() => addDrug(d)}
                          style={{ padding: "10px 14px", cursor: "pointer", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}
                          onMouseEnter={e => e.currentTarget.style.background = "#fdf2ff"}
                          onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>💊 {d.name}</div>
                          <div style={{ fontWeight: 700, color: C.green, fontSize: 13 }}>UGX {d.price.toLocaleString()}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Custom drug entry */}
                <div style={{ display: "flex", gap: 6, alignItems: "flex-end", paddingTop: 10, borderTop: `1px solid ${C.border}` }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 10, fontWeight: 700, color: C.textLight, textTransform: "uppercase", display: "block", marginBottom: 3 }}>Custom Drug</label>
                    <input value={customDrug.name} onChange={e => setCustomDrug(c => ({ ...c, name: e.target.value }))} placeholder="Drug name"
                      style={{ width: "100%", border: `1px solid ${C.border}`, borderRadius: 6, padding: "6px 8px", fontSize: 12, fontFamily: "inherit", boxSizing: "border-box" }} />
                  </div>
                  <div style={{ width: 110 }}>
                    <label style={{ fontSize: 10, fontWeight: 700, color: C.textLight, textTransform: "uppercase", display: "block", marginBottom: 3 }}>Price</label>
                    <input type="number" value={customDrug.price} onChange={e => setCustomDrug(c => ({ ...c, price: e.target.value }))} placeholder="UGX"
                      style={{ width: "100%", border: `1px solid ${C.border}`, borderRadius: 6, padding: "6px 8px", fontSize: 12, fontFamily: "inherit", boxSizing: "border-box" }} />
                  </div>
                  <Btn small outline color={C.pink} onClick={addCustomDrug}>+ Add</Btn>
                </div>

                {/* Added drugs list */}
                {addedDrugs.length > 0 && (
                  <div style={{ marginTop: 14 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: C.textMid, textTransform: "uppercase", marginBottom: 6 }}>Drugs to Dispense</div>
                    {addedDrugs.map(d => (
                      <div key={d.name} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: `1px solid ${C.border}` }}>
                        <div style={{ flex: 1, fontWeight: 600, fontSize: 12 }}>💊 {d.name}</div>
                        <div style={{ fontSize: 11, color: C.textMid }}>UGX {d.price.toLocaleString()} each</div>
                        <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                          <button onClick={() => updateDrugQty(d.name, d.qty - 1)} style={{ width: 20, height: 20, borderRadius: "50%", border: `1px solid ${C.border}`, background: "#f8fafc", cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center" }}>−</button>
                          <span style={{ fontWeight: 700, fontSize: 12, minWidth: 18, textAlign: "center" }}>{d.qty}</span>
                          <button onClick={() => updateDrugQty(d.name, d.qty + 1)} style={{ width: 20, height: 20, borderRadius: "50%", border: `1px solid ${C.border}`, background: "#f8fafc", cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
                        </div>
                        <div style={{ fontWeight: 700, color: C.green, fontSize: 12, minWidth: 80, textAlign: "right" }}>UGX {(d.price * d.qty).toLocaleString()}</div>
                        <button onClick={() => removeDrug(d.name)} style={{ background: "none", border: "none", cursor: "pointer", color: C.red, fontSize: 14 }}>×</button>
                      </div>
                    ))}
                    <div style={{ textAlign: "right", fontWeight: 700, color: C.pink, fontSize: 13, marginTop: 6 }}>
                      Drugs subtotal: UGX {drugsTotal.toLocaleString()}
                    </div>
                  </div>
                )}
              </Card>

              {/* Grand total + payment */}
              <Card title="💳 Payment Summary">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14, fontSize: 13 }}>
                  <div style={{ background: "#f8fafc", borderRadius: 8, padding: "10px 14px" }}>
                    <div style={{ fontSize: 10, color: C.textLight, textTransform: "uppercase", marginBottom: 3 }}>Previous Charges</div>
                    <div style={{ fontWeight: 700, color: C.text }}>UGX {existingTotal.toLocaleString()}</div>
                  </div>
                  <div style={{ background: "#fdf2ff", borderRadius: 8, padding: "10px 14px" }}>
                    <div style={{ fontSize: 10, color: C.textLight, textTransform: "uppercase", marginBottom: 3 }}>Drugs Added</div>
                    <div style={{ fontWeight: 700, color: C.pink }}>UGX {drugsTotal.toLocaleString()}</div>
                  </div>
                </div>

                <div style={{ background: C.greenLight, borderRadius: 9, padding: "14px 18px", marginBottom: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 800, fontSize: 20, color: C.green }}>
                    <span>GRAND TOTAL</span>
                    <span>UGX {grandTotal.toLocaleString()}</span>
                  </div>
                  {alreadyPaid > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: C.textMid, marginTop: 4 }}>
                      <span>Already paid</span><span>−UGX {alreadyPaid.toLocaleString()}</span>
                    </div>
                  )}
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 15, fontWeight: 700, color: balanceDue > 0 ? C.red : C.green, marginTop: 4 }}>
                    <span>Balance Due</span><span>UGX {Math.max(0, balanceDue).toLocaleString()}</span>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 160px", gap: 10, marginBottom: 14 }}>
                  <div>
                    <label style={{ fontSize: 10, fontWeight: 700, color: C.textMid, textTransform: "uppercase", display: "block", marginBottom: 4 }}>Amount to Collect (UGX)</label>
                    <div style={{ display: "flex", gap: 6 }}>
                      <input type="number" value={payAmt} onChange={e => setPayAmt(e.target.value)} placeholder={`${Math.max(0, balanceDue)}`}
                        style={{ flex: 1, border: `1.5px solid ${C.green}`, borderRadius: 7, padding: "8px 10px", fontSize: 14, fontFamily: "'IBM Plex Mono',monospace", fontWeight: 700, boxSizing: "border-box" }} />
                      <Btn small outline color={C.green} onClick={() => setPayAmt(String(Math.max(0, balanceDue)))}>Full</Btn>
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: 10, fontWeight: 700, color: C.textMid, textTransform: "uppercase", display: "block", marginBottom: 4 }}>Method</label>
                    <select value={payMethod} onChange={e => setPayMethod(e.target.value)}
                      style={{ width: "100%", border: `1.5px solid ${C.border}`, borderRadius: 7, padding: "8px", fontSize: 13, fontFamily: "inherit", boxSizing: "border-box" }}>
                      {["Cash", "Mobile Money", "Insurance", "Waiver"].map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                </div>

                <Btn color={C.green} onClick={() => dispenseAndCollect(entry)} disabled={saving} style={{ width: "100%" }}>
                  <CheckCircle size={14} /> {saving ? "Processing…" : "Dispense, Bill & Close Visit"}
                </Btn>
              </Card>
            </>
          );
        })()}
      </div>
    </div>
  );
}
// ─────────────────────────────────────────────────────────────────────────────
// PATIENT RECORDS — doctor browses and prints any patient's complete file
// ─────────────────────────────────────────────────────────────────────────────
export function PatientRecords({ patients }) {
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState(null); // full patient object
  const [expandedVisit, setExpandedVisit] = useState(null);

  const results = q.trim().length >= 1
    ? patients.filter(p =>
        p.name.toLowerCase().includes(q.toLowerCase()) ||
        p.id.toLowerCase().includes(q.toLowerCase()) ||
        (p.class||"").toLowerCase().includes(q.toLowerCase()) ||
        (p.department||"").toLowerCase().includes(q.toLowerCase())
      )
    : patients.slice().reverse(); // show all patients newest first when no search

  return (
    <div style={{ padding: 24, display: "grid", gridTemplateColumns: "300px 1fr", gap: 18, alignItems: "start" }}>

      {/* ── Left: search + patient list ── */}
      <div>
        <Card title={`Patient Records (${patients.length})`}>
          <div style={{ position: "relative", marginBottom: 12 }}>
            <span style={{ position:"absolute", left:9, top:"50%", transform:"translateY(-50%)", fontSize:13, color:C.textLight, pointerEvents:"none" }}>🔍</span>
            <input
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Search name, ID, class…"
              style={{ width:"100%", padding:"8px 9px 8px 28px", border:`1.5px solid ${C.border}`, borderRadius:7, fontSize:13, fontFamily:"inherit", boxSizing:"border-box", background:"#f8fafc" }}
              autoFocus
            />
            {q && <button onClick={() => setQ("")} style={{ position:"absolute", right:8, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", color:C.textLight, fontSize:18 }}>×</button>}
          </div>

          <div style={{ maxHeight: 580, overflowY: "auto" }}>
            {results.length === 0
              ? <EmptyState icon="🔍" message="No patients found"/>
              : results.map(p => (
                <div key={p.id}
                  onClick={() => { setSelected(p); setExpandedVisit(null); }}
                  style={{ padding: "10px 8px", borderRadius: 8, cursor: "pointer", borderBottom: `1px solid ${C.border}`, background: selected?.id === p.id ? C.greenLight : "transparent", borderLeft: selected?.id === p.id ? `3px solid ${C.green}` : "3px solid transparent" }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: C.text }}>{p.name}</div>
                  <div style={{ fontSize: 10, color: C.textMid, fontFamily: "'IBM Plex Mono',monospace" }}>{p.id} · {p.category}</div>
                  <div style={{ fontSize: 11, color: C.textLight, marginTop: 2 }}>
                    {p.visits?.length || 0} visit{p.visits?.length !== 1 ? "s" : ""}
                    {p.arrivalTime ? ` · Arrived ${p.arrivalTime}` : ""}
                    {p.registeredAt ? ` · Reg. ${p.registeredAt}` : ""}
                  </div>
                </div>
              ))}
          </div>
          <div style={{ marginTop: 10, paddingTop: 8, borderTop: `1px solid ${C.border}`, fontSize: 11, color: C.textLight, textAlign: "center" }}>
            {q ? `${results.length} of ${patients.length} patients` : `All ${patients.length} patients`}
          </div>
        </Card>
      </div>

      {/* ── Right: selected patient full record ── */}
      <div>
        {!selected
          ? (
            <div style={{ textAlign: "center", padding: "80px 20px", color: C.textLight }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>📁</div>
              <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Patient Records Archive</div>
              <div style={{ fontSize: 13 }}>Select a patient on the left to view their complete medical file</div>
            </div>
          )
          : (
            <>
              {/* Patient header */}
              <Card style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
                      <div style={{ width: 44, height: 44, borderRadius: "50%", background: C.greenLight, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>
                        {selected.gender === "F" ? "👩" : "👨"}
                      </div>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: 18, color: C.text }}>{selected.name}</div>
                        <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, color: C.textMid }}>{selected.id}</div>
                      </div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "4px 20px", fontSize: 12, color: C.textMid }}>
                      {[
                        ["Category",   selected.category],
                        ["Gender",     selected.gender === "M" ? "Male" : selected.gender === "F" ? "Female" : selected.gender],
                        ["DOB",        selected.dob || "—"],
                        ["Phone",      selected.phone || "—"],
                        ["Registered", selected.registeredAt],
                        ["Emergency",  selected.emergencyContact || "—"],
                        selected.class && ["Class", selected.class],
                        selected.employeeId && ["Emp ID", selected.employeeId],
                        selected.department && ["Dept", selected.department],
                      ].filter(Boolean).map(([label, value]) => (
                        <div key={label}><span style={{ color: C.textLight }}>{label}:</span> <b style={{ color: C.text }}>{value}</b></div>
                      ))}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <div style={{ textAlign: "center", background: C.greenLight, borderRadius: 10, padding: "10px 16px", minWidth: 64 }}>
                      <div style={{ fontSize: 24, fontWeight: 800, color: C.green }}>{selected.visits?.length || 0}</div>
                      <div style={{ fontSize: 10, color: C.textMid }}>Visits</div>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Visit history */}
              <Card title={`Full Visit History (${selected.visits?.length || 0} visits)`}>
                {!selected.visits?.length
                  ? <EmptyState icon="📋" message="No visits on record for this patient"/>
                  : [...selected.visits].reverse().map((v, idx) => (
                    <div key={v.id} style={{ border: `1px solid ${C.border}`, borderRadius: 10, marginBottom: 10, overflow: "hidden" }}>
                      {/* Visit header — always visible */}
                      <div
                        onClick={() => setExpandedVisit(expandedVisit === v.id ? null : v.id)}
                        style={{ padding: "12px 14px", background: expandedVisit === v.id ? C.accentGlow : "#f8fafc", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                          <div style={{ width: 28, height: 28, borderRadius: "50%", background: C.green + "22", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: C.green, flexShrink: 0 }}>
                            {selected.visits.length - idx}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: C.text }}>{v.diagnosis}</div>
                            <div style={{ fontSize: 11, color: C.textMid }}>Dr. {v.doctor} · {v.treatment || "No treatment noted"}</div>
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 10, alignItems: "center", flexShrink: 0 }}>
                          <span style={{ fontSize: 11, color: C.textLight, fontFamily: "'IBM Plex Mono',monospace" }}>{v.date}</span>
                          <Btn small outline color={C.accent} onClick={e => { e.stopPropagation(); printReport(selected, v); }}>
                            <Printer size={11}/> Print
                          </Btn>
                          <span style={{ color: C.textLight, fontSize: 16 }}>{expandedVisit === v.id ? "▲" : "▼"}</span>
                        </div>
                      </div>

                      {/* Visit body — expanded */}
                      {expandedVisit === v.id && (
                        <div style={{ padding: "14px 16px", borderTop: `1px solid ${C.border}` }}>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                            {v.complaint && (
                              <div style={{ gridColumn: "span 2" }}>
                                <div style={{ fontSize: 10, color: C.textLight, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 3 }}>Chief Complaint</div>
                                <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{v.complaint}</div>
                              </div>
                            )}
                            {/* Vitals */}
                            {(v.vitalsNote || (v.vitals && Object.values(v.vitals).some(Boolean))) && (
                              <div style={{ gridColumn: "span 2", background: C.greenLight, borderRadius: 8, padding: "10px 14px" }}>
                                <div style={{ fontSize: 10, color: C.green, textTransform: "uppercase", fontWeight: 700, marginBottom: 6 }}>Vitals</div>
                                <div style={{ fontSize: 13, color: C.textMid }}>
                                  {v.vitalsNote || Object.entries(v.vitals||{}).filter(([,x])=>x).map(([k,x])=>`${k}: ${x}`).join("  ·  ")}
                                </div>
                              </div>
                            )}
                            {/* Lab results */}
                            {v.labResults && (
                              <div style={{ gridColumn: "span 2", background: C.amberLight, borderRadius: 8, padding: "10px 14px" }}>
                                <div style={{ fontSize: 10, color: C.amber, textTransform: "uppercase", fontWeight: 700, marginBottom: 6 }}>Lab Results</div>
                                <div style={{ fontSize: 13, color: C.textMid }}>{v.labResults}</div>
                              </div>
                            )}
                            {/* Treatment */}
                            {v.treatment && (
                              <div>
                                <div style={{ fontSize: 10, color: C.textLight, textTransform: "uppercase", marginBottom: 3 }}>Treatment</div>
                                <div style={{ fontSize: 13, color: C.text }}>{v.treatment}</div>
                              </div>
                            )}
                          </div>
                          {/* Prescriptions */}
                          {v.prescriptions?.length > 0 && (
                            <div style={{ marginBottom: 10 }}>
                              <div style={{ fontSize: 10, color: C.textLight, textTransform: "uppercase", marginBottom: 6 }}>Prescriptions</div>
                              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                                {v.prescriptions.map((r, i) => (
                                  <span key={i} style={{ background: "#f0f4ff", border: "1px solid #c7d2fe", borderRadius: 6, padding: "3px 10px", fontSize: 12 }}>💊 {r}</span>
                                ))}
                              </div>
                            </div>
                          )}
                          {/* Notes */}
                          {v.notes && (
                            <div style={{ background: "#f8fafc", borderRadius: 8, padding: "10px 14px", fontSize: 12, color: C.textMid, fontStyle: "italic" }}>
                              📝 {v.notes}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
              </Card>
            </>
          )}
      </div>
    </div>
  );
}