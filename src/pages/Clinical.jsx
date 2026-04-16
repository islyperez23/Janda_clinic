import { useState } from "react";
import { Heart, FileText, TestTube2, Upload, CheckCircle, Printer, ArrowRight, ClipboardList, Activity } from "lucide-react";
import { C, now, today, genLab } from "../theme";
import { Badge, Btn, Input, Select, Textarea, Card, EmptyState, StageBadge } from "../ui";
import { api } from "../api";

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
    ? { msg: "↑ Elevated temperature", color: C.amber } : null;

  const save = async () => {
    if (!pid) { alert("Select a patient first."); return; }
    if (!form.bp && !form.temp && !form.weight) { alert("Enter at least BP, temperature or weight."); return; }
    setSaving(true);
    try {
      // Store vitals on the patient record
      await api.updatePatient(pid, { pendingVitals: { ...form, recordedAt: now() } });
      // Return patient to doctor queue
      const inQueue = queue.find(e => e.patientId === pid);
      if (inQueue) await api.updateQueue(pid, { stage: "doctor", nurseResultsReady: true });
      setForm({ bp:"", temp:"", weight:"", pulse:"", spo2:"", complaint:"" });
      setPid("");
      reload();
    } catch(e) { alert(e.message); } finally { setSaving(false); }
  };

  return (
    <div style={{ padding: 24, display: "grid", gridTemplateColumns: "280px 1fr", gap: 20 }}>
      {/* Left: queue */}
      <div>
        <Card title={`Patients for Vitals (${nurseQueue.length})`} style={{ marginBottom: 12 }}>
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
              {patient.class && <div>Class: {patient.class}{patient.dorm && ` · ${patient.dorm}`}</div>}
              <div style={{ fontSize: 11, marginTop: 6 }}>📞 {patient.emergencyContact || "—"}</div>
            </div>
            {patient.visits?.length > 0 && (
              <div style={{ marginTop: 10, background: C.accentGlow, borderRadius: 8, padding: 10, fontSize: 12 }}>
                <div style={{ fontWeight: 700, color: C.accent, marginBottom: 4 }}>Last Visit Vitals</div>
                {(() => { const v = patient.visits.slice(-1)[0]?.vitals || {}; return (
                  <div style={{ color: C.textMid }}>
                    {[["BP",v.bp],["Temp",v.temp],["Weight",v.weight],["Pulse",v.pulse]].filter(([,x])=>x).map(([k,x])=>`${k}: ${x}`).join("  ·  ") || "No previous vitals"}
                  </div>
                );})()}
              </div>
            )}
          </Card>
        )}
      </div>

      {/* Right: vitals form */}
      <Card title="Record Vitals">
        {!pid
          ? <EmptyState icon="👤" message="Select a patient from the list on the left" />
          : (
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
                <Input label="Confirm Chief Complaint" value={form.complaint} onChange={v => set("complaint", v)} placeholder="Patient's complaint" />
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
// DOCTOR PATIENT FILE  — full tabbed consultation workflow
//
// Tabs:
//   📋 Queue          — current patients assigned to doctor
//   🩺 Nurse Results  — vitals returned from nurse (confirm → auto-fill form)
//   🔬 Lab Results    — lab results returned from lab (confirm → auto-fill form)
//   📝 Consultation   — write diagnosis, prescriptions, save + print report
//   📚 Visit History  — all past visits
// ─────────────────────────────────────────────────────────────────────────────
export function PatientFile({ patients, queue, labOrders, user, reload }) {
  const [pid, setPid] = useState("");
  const [tab, setTab] = useState("consultation"); // consultation | nurse | lab | history
  const [form, setForm] = useState({
    complaint: "", vitalsNote: "", labNote: "",
    diagnosis: "", treatment: "", prescriptions: "", notes: "", sendTo: ""
  });
  const [labTest, setLabTest] = useState("");
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const myQueue = queue.filter(e => e.stage === "doctor");
  const patient = patients.find(p => p.id === pid);
  const pendingVitals = patient?.pendingVitals;

  // Lab results for this patient (completed orders)
  const myLabResults = labOrders.filter(o => o.patientId === pid && o.status === "completed");
  // Pending lab orders for this patient
  const myLabPending = labOrders.filter(o => o.patientId === pid && o.status === "pending");

  // Nurse results badge: patient has vitals AND is back in doctor queue
  const hasNurseResults = !!pendingVitals;
  const hasLabResults   = myLabResults.length > 0;
  const newResultsCount = (hasNurseResults ? 1 : 0) + (hasLabResults ? 1 : 0);

  // When a different patient is selected, reset form and go to consultation tab
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
  const quickRoute = async (stage, testName = "") => {
    const inQueue = queue.find(e => e.patientId === pid);
    if (!inQueue) { alert("Patient is not in the active queue."); return; }
    try {
      if (stage === "lab" && testName) {
        await api.addLabOrder({
          id: genLab(), patientId: pid, patientName: patient?.name || "",
          test: testName, requestedBy: user.name, status: "pending", timestamp: now(), result: ""
        });
      }
      await api.updateQueue(pid, { stage });
      setLabTest("");
      reload();
    } catch(e) { alert(e.message); }
  };

  // ── Save full clinical report ────────────────────────────────────────────
  const saveVisit = async () => {
    if (!form.diagnosis.trim()) { alert("Diagnosis is required before saving the report."); return; }
    if (!form.sendTo) { alert("Please select where to route the patient (Pharmacy or Done)."); return; }
    setSaving(true);
    try {
      const visit = {
        id:     `V${Date.now()}`,
        date:   today(),
        doctor: user.name,
        complaint:     form.complaint,
        vitalsNote:    form.vitalsNote,
        labNote:       form.labNote,
        labResults:    form.labNote, // duplicate for print/display
        diagnosis:     form.diagnosis,
        treatment:     form.treatment,
        prescriptions: form.prescriptions.split("\n").filter(Boolean),
        notes:         form.notes,
        vitals:        pendingVitals || {},
        labOrders:     myLabResults.map(o => o.id),
        stage:         form.sendTo,
      };
      await api.updatePatient(pid, { addVisit: visit, clearPendingVitals: true });
      const inQueue = queue.find(e => e.patientId === pid);
      if (inQueue) await api.updateQueue(pid, { stage: form.sendTo });

      // Offer to print immediately
      if (window.confirm("Visit saved! Print the report now?")) {
        printReport(patient, visit);
      }

      setForm({ complaint:"", vitalsNote:"", labNote:"", diagnosis:"", treatment:"", prescriptions:"", notes:"", sendTo:"" });
      setPid("");
      reload();
    } catch(e) { alert(e.message); } finally { setSaving(false); }
  };

  // ── Tab bar ──────────────────────────────────────────────────────────────
  const tabDef = [
    { id:"consultation", label:"📝 Consultation" },
    { id:"nurse",        label:`🩺 Nurse Results${hasNurseResults?" 🔴":""}` },
    { id:"lab",          label:`🔬 Lab Results${hasLabResults?" 🔴":""}` },
    { id:"history",      label:"📚 Visit History" },
  ];

  return (
    <div style={{ padding: 24, display: "grid", gridTemplateColumns: "260px 1fr", gap: 18 }}>

      {/* ── Left: queue + patient card ── */}
      <div>
        <Card title={`My Queue (${myQueue.length})`} style={{ marginBottom: 12 }}>
          {myQueue.length === 0
            ? <EmptyState icon="✅" message="No patients in your queue" />
            : myQueue.map(e => (
              <div key={e.patientId} onClick={() => selectPatient(e.patientId)}
                style={{ padding: "9px 10px", borderRadius: 8, border: `1.5px solid ${pid === e.patientId ? C.green : C.border}`, cursor: "pointer", marginBottom: 6, background: pid === e.patientId ? "rgba(16,185,129,0.08)" : "transparent", position: "relative" }}>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{e.name}</div>
                <div style={{ fontSize: 10, color: C.textMid, fontFamily: "'IBM Plex Mono',monospace" }}>{e.patientId}</div>
                <div style={{ fontSize: 11, color: C.textLight, marginTop: 2 }}>{e.complaint}</div>
                {e.nurseResultsReady && (
                  <div style={{ position: "absolute", top: 6, right: 8, background: C.purple, color: "#fff", borderRadius: 10, padding: "1px 6px", fontSize: 9, fontWeight: 700 }}>VITALS READY</div>
                )}
              </div>
            ))}
        </Card>

        {patient && (
          <Card title="Patient">
            <div style={{ fontSize: 13, lineHeight: 1.9, color: C.textMid }}>
              <div style={{ fontWeight: 700, color: C.text }}>{patient.name}</div>
              <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11 }}>{patient.id}</div>
              <div>DOB: {patient.dob || "—"}</div>
              <div>Gender: {patient.gender || "—"}</div>
              {patient.class && <div>Class: {patient.class}{patient.dorm && ` / ${patient.dorm}`}</div>}
              {patient.employeeId && <div>EmpID: {patient.employeeId}</div>}
              <div style={{ fontSize: 11, marginTop: 4 }}>📞 {patient.emergencyContact || "—"}</div>
            </div>
            {/* Results ready indicators */}
            {newResultsCount > 0 && (
              <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 5 }}>
                {hasNurseResults && (
                  <div style={{ background: C.purpleLight, border: `1px solid ${C.purple}44`, borderRadius: 7, padding: "6px 10px", fontSize: 11, color: C.purple, fontWeight: 700, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    🩺 Vitals from nurse ready
                    <Btn small color={C.purple} onClick={() => { setTab("nurse"); }}>View</Btn>
                  </div>
                )}
                {hasLabResults && (
                  <div style={{ background: C.amberLight, border: `1px solid ${C.amber}44`, borderRadius: 7, padding: "6px 10px", fontSize: 11, color: C.amber, fontWeight: 700, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    🔬 Lab results ready
                    <Btn small color={C.amber} onClick={() => { setTab("lab"); }}>View</Btn>
                  </div>
                )}
              </div>
            )}
          </Card>
        )}
      </div>

      {/* ── Right: tabbed panel ── */}
      <div>
        {!patient
          ? <EmptyState icon="👨‍⚕️" message="Select a patient from your queue on the left" />
          : (
            <>
              {/* Tab bar */}
              <div style={{ display: "flex", gap: 4, marginBottom: 16, borderBottom: `2px solid ${C.border}`, paddingBottom: 0 }}>
                {tabDef.map(t => (
                  <button key={t.id} onClick={() => setTab(t.id)}
                    style={{ padding: "8px 16px", border: "none", borderBottom: `3px solid ${tab === t.id ? C.green : "transparent"}`, background: "transparent", cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: tab === t.id ? 700 : 500, color: tab === t.id ? C.green : C.textMid, marginBottom: -2, whiteSpace: "nowrap" }}>
                    {t.label}
                  </button>
                ))}
              </div>

              {/* ══ TAB: Nurse Results ══ */}
              {tab === "nurse" && (
                <Card title="Vitals from Nurse">
                  {!hasNurseResults
                    ? (
                      <>
                        <EmptyState icon="🩺" message="No vitals recorded yet for this patient" />
                        <div style={{ marginTop: 16, display: "flex", gap: 10, alignItems: "center" }}>
                          <span style={{ fontSize: 13, color: C.textMid }}>Send patient to nurse now:</span>
                          <Btn color={C.purple} onClick={() => quickRoute("nurse")}>
                            <ArrowRight size={13} /> Send to Nurse
                          </Btn>
                        </div>
                      </>
                    )
                    : (
                      <>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 16 }}>
                          {[
                            ["Blood Pressure", pendingVitals.bp],
                            ["Temperature",    pendingVitals.temp],
                            ["Weight",         pendingVitals.weight],
                            ["Pulse",          pendingVitals.pulse],
                            ["SpO₂",           pendingVitals.spo2],
                            ["Complaint",      pendingVitals.complaint],
                          ].map(([label, value]) => value ? (
                            <div key={label} style={{ background: "#f8fafc", borderRadius: 8, padding: "10px 12px" }}>
                              <div style={{ fontSize: 10, color: C.textLight, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 3 }}>{label}</div>
                              <div style={{ fontWeight: 700, fontSize: 15, color: C.text }}>{value}</div>
                            </div>
                          ) : null)}
                        </div>
                        {pendingVitals.recordedAt && (
                          <div style={{ fontSize: 11, color: C.textLight, marginBottom: 14 }}>Recorded at {pendingVitals.recordedAt}</div>
                        )}
                        <div style={{ background: C.greenLight, border: `1.5px solid ${C.green}`, borderRadius: 9, padding: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div style={{ fontSize: 13, color: C.green, fontWeight: 700 }}>
                            ✓ Confirm to copy vitals into the Consultation form
                          </div>
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
                <Card title="Lab Results">
                  {/* Order a test */}
                  <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 16, padding: "12px 14px", background: "#f8fafc", borderRadius: 8 }}>
                    <input value={labTest} onChange={e => setLabTest(e.target.value)}
                      placeholder="Test name (e.g. Malaria RDT, Full Blood Count)…"
                      style={{ flex: 1, border: `1.5px solid ${C.border}`, borderRadius: 7, padding: "7px 10px", fontSize: 13, fontFamily: "inherit" }} />
                    <Btn color={C.amber} onClick={() => labTest && quickRoute("lab", labTest)}>
                      <TestTube2 size={13} /> Order Test
                    </Btn>
                  </div>

                  {/* Pending orders */}
                  {myLabPending.length > 0 && (
                    <div style={{ marginBottom: 14 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: C.amber, marginBottom: 8 }}>⏳ Pending</div>
                      {myLabPending.map(o => (
                        <div key={o.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: C.amberLight, borderRadius: 7, marginBottom: 6 }}>
                          <div style={{ fontWeight: 600 }}>{o.test}</div>
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

                  {/* Quick route without writing report */}
                  <Card title="Quick Route (without report)" style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 12, color: C.textMid, marginBottom: 10 }}>
                      Send patient to get vitals or lab tests first — no diagnosis needed yet.
                    </div>
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                      <Btn outline color={C.purple} onClick={() => quickRoute("nurse")}>
                        🩺 Send to Nurse for Vitals
                      </Btn>
                      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        <input value={labTest} onChange={e => setLabTest(e.target.value)} placeholder="Lab test name…"
                          style={{ border: `1.5px solid ${C.border}`, borderRadius: 7, padding: "7px 10px", fontSize: 12, fontFamily: "inherit", width: 180 }} />
                        <Btn outline color={C.amber} onClick={() => labTest && quickRoute("lab", labTest)}>
                          🔬 Send to Lab
                        </Btn>
                      </div>
                    </div>
                  </Card>

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
                          { value: "done",     label: "✅ Discharged — No medication needed" },
                        ]} required />

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
                      <Btn color={C.green} onClick={saveVisit} disabled={saving}>
                        <FileText size={13} /> {saving ? "Saving…" : "Save Report & Route Patient"}
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
// PHARMACY VIEW  — dispense meds + collect payment → creates transaction → done
// ─────────────────────────────────────────────────────────────────────────────
export function PharmacyView({ patients, queue, user, reload }) {
  const pharmQueue = queue.filter(e => e.stage === "pharmacy");
  const [active, setActive] = useState(null); // { patientId, amount, method, note }
  const [saving, setSaving] = useState(false);
  const genTxn = () => `TXN-${today().replace(/-/g,"")}-${Math.floor(100+Math.random()*900)}`;
  const today = () => new Date().toISOString().slice(0,10);

  const getLastVisit = (pid) => {
    const p = patients.find(x => x.id === pid);
    return p?.visits?.slice(-1)[0] || null;
  };

  const dispenseAndCollect = async (entry) => {
    if (!active?.amount || parseInt(active.amount) <= 0) { alert("Enter the payment amount."); return; }
    setSaving(true);
    try {
      const p = patients.find(x => x.id === entry.patientId);
      // Record the transaction
      const txn = {
        id: genTxn(),
        patientId:   entry.patientId,
        patientName: p?.name || entry.name,
        services:    active.note ? active.note.split(",").map(s=>s.trim()) : ["Pharmacy — Drugs dispensed"],
        amount:      parseInt(active.amount),
        method:      active.method || "Cash",
        cashier:     user.name,
        timestamp:   new Date().toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"}),
        date:        today(),
      };
      await api.addTransaction(txn);
      // Close the visit
      await api.updateQueue(entry.patientId, { stage: "done" });
      setActive(null);
      reload();
      alert(`✓ Payment recorded — UGX ${parseInt(active.amount).toLocaleString()}\nReceipt ID: ${txn.id}`);
    } catch(e) { alert(e.message); } finally { setSaving(false); }
  };

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ background: `linear-gradient(135deg,${C.pink},${C.pink}88)`, borderRadius: 12, padding: "18px 24px", color: "#fff", display: "inline-flex", alignItems: "center", gap: 16 }}>
          <div style={{ fontSize: 32 }}>💊</div>
          <div>
            <div style={{ fontSize: 11, opacity: 0.8 }}>AWAITING PHARMACY</div>
            <div style={{ fontSize: 30, fontWeight: 800 }}>{pharmQueue.length}</div>
            <div style={{ fontSize: 11, opacity: 0.7 }}>Dispense meds + collect payment → visit closes automatically</div>
          </div>
        </div>
      </div>

      {pharmQueue.length === 0
        ? <Card><EmptyState icon="💊" message="No prescriptions pending" /></Card>
        : pharmQueue.map(entry => {
          const lastVisit = getLastVisit(entry.patientId);
          const rx = lastVisit?.prescriptions || [];
          const isActive = active?.patientId === entry.patientId;

          return (
            <Card key={entry.patientId} style={{ marginBottom: 12, border: isActive ? `2px solid ${C.pink}` : undefined }}>
              {/* Patient header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{entry.name}</div>
                  <div style={{ fontSize: 11, color: C.textMid, fontFamily: "'IBM Plex Mono',monospace" }}>{entry.patientId} · {entry.timestamp}</div>
                  {lastVisit && <div style={{ fontSize: 12, color: C.textMid, marginTop: 3 }}>Diagnosis: <b>{lastVisit.diagnosis}</b> · Dr. {lastVisit.doctor}</div>}
                </div>
                {!isActive && (
                  <Btn color={C.pink} onClick={() => setActive({ patientId:entry.patientId, amount:"", method:"Cash", note:"" })}>
                    <CheckCircle size={13} /> Dispense & Collect Payment
                  </Btn>
                )}
              </div>

              {/* Prescriptions */}
              {rx.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.textMid, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>Prescriptions</div>
                  {rx.map((r, i) => (
                    <div key={i} style={{ padding: "8px 14px", background: "#fdf2ff", border: "1px solid #f0abfc", borderRadius: 7, marginBottom: 5, fontSize: 13 }}>
                      💊 {r}
                    </div>
                  ))}
                </div>
              )}

              {/* Payment collection form */}
              {isActive && (
                <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 14 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: C.textMid, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>
                    💳 Collect Payment
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                    <Input label="Amount (UGX) ★" value={active.amount}
                      onChange={v => setActive(a => ({ ...a, amount: v }))} type="number" placeholder="e.g. 45000" />
                    <Select label="Payment Method" value={active.method}
                      onChange={v => setActive(a => ({ ...a, method: v }))}
                      options={["Cash","Mobile Money","Insurance","Waiver"]} />
                    <div style={{ gridColumn: "span 2" }}>
                      <Input label="Services / Items (comma-separated)" value={active.note}
                        onChange={v => setActive(a => ({ ...a, note: v }))}
                        placeholder="e.g. Consultation, Amoxicillin 500mg, Paracetamol" />
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 10 }}>
                    <Btn color={C.green} onClick={() => dispenseAndCollect(entry)} disabled={saving}>
                      <CheckCircle size={13} /> {saving ? "Processing…" : "Confirm — Close Visit & Record Payment"}
                    </Btn>
                    <Btn outline onClick={() => setActive(null)}>Cancel</Btn>
                  </div>
                </div>
              )}
            </Card>
          );
        })}
    </div>
  );
}