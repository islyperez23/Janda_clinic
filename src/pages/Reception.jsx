import { useState } from "react";
import { UserPlus, Search } from "lucide-react";
import { C, CATEGORIES, FREE_CATEGORIES, now, today, genId } from "../theme";
import { Badge, Btn, Input, Select, Card, ErrBanner, EmptyState } from "../ui";
import { api } from "../api";

const DESTINATIONS = [
  { value:"doctor",     label:"👨‍⚕️ Doctor",             stage:"doctor"     },
  { value:"dentist",    label:"🦷 Dentist",              stage:"dentist"    },
  { value:"maternity",  label:"🤱 Maternity / ANC",      stage:"maternity"  },
  { value:"lab",        label:"🔬 Laboratory (only)",    stage:"lab"        },
  { value:"sonography", label:"🔊 Sonography / Imaging", stage:"sonography" },
];

const isFree      = (cat) => (FREE_CATEGORIES||[]).includes(cat);
const isInsurance = (cat) => cat === "Insurance";

export function PatientRegistration({ patients, setPatients, reload }) {
  const blank = {
    firstName:"", secondName:"", otherName:"",
    dob:"", gender:"", phone:"", category:"",
    class:"", employeeId:"", department:"",
    emergencyContact:"", destination:"", arrivalTime:now(),
    insuranceProvider:"", insuranceNumber:"",
    labReason:"", scanReason:"",
  };
  const [form, setForm]     = useState(blank);
  const [done, setDone]     = useState(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr]       = useState("");
  const [search, setSearch] = useState("");
  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  const isSchool = form.category==="NSVS (Secondary)" || form.category==="Samaritan (Primary)";
  const isStaff  = form.category==="Staff";
  const insur    = isInsurance(form.category);
  const free     = isFree(form.category);
  const fullName = [form.firstName, form.secondName, form.otherName].filter(Boolean).join(" ");
  const destObj  = DESTINATIONS.find(d=>d.value===form.destination);

  const handleSubmit = async () => {
    if (!form.firstName||!form.secondName||!form.category||!form.gender) {
      setErr("First name, second name, gender and category are required."); return;
    }
    if (!form.destination) { setErr("Please select where to route this patient."); return; }
    setSaving(true); setErr("");
    try {
      const id = genId("HMS");
      const patient = {
        id, name: fullName,
        firstName:form.firstName, secondName:form.secondName, otherName:form.otherName,
        dob:form.dob, gender:form.gender,
        phone: isSchool ? "" : form.phone,
        category:form.category, class:form.class,
        employeeId:form.employeeId, department:form.department,
        emergencyContact:form.emergencyContact,
        insuranceProvider: insur?form.insuranceProvider:"",
        insuranceNumber:   insur?form.insuranceNumber:"",
        arrivalTime:form.arrivalTime||now(),
        registeredAt:today(),
        visits:[], pendingVitals:null,
        isFree:free, isInsurance:insur,
      };
      await api.addPatient(patient);

      const stage = destObj.stage;
      await api.addToQueue({
        patientId:id, name:fullName, stage,
        priority:"normal", timestamp:form.arrivalTime||now(),
        complaint:form.labReason||form.scanReason||"",
        assignedTo:"", destination:form.destination,
        category:form.category, isFree:free, isInsurance:insur,
      });

      // Auto-create bill only for billable patients
      if (!free) {
        const ins = isInsurance(form.category);
        const feeMap = {
          doctor:     { name:"Doctor Consultation",  price:ins?20000:30000 },
          dentist:    { name:"Dental Consultation",   price:ins?18000:25000 },
          maternity:  { name:"ANC Visit",             price:ins?15000:20000 },
          lab:        { name:"Lab Investigation",     price:0 },
          sonography: { name:"Sonography",            price:0 },
        };
        const fee = feeMap[stage];
        const services = fee.price>0
          ? [{ serviceId:"auto", name:fee.name, price:fee.price, qty:1, subtotal:fee.price, category:"Consultation" }]
          : [];
        await api.createBill({
          patientId:id, patientName:fullName,
          services, totalAmount:fee.price,
          paymentCategory: ins?"insurance":"standard",
        });
      }

      setPatients(prev=>[...prev, patient]);
      setDone({ id, name:fullName, destination:destObj.label, free });
      setForm({ ...blank, arrivalTime:now() });
      reload();
    } catch(e) { setErr(e.message); } finally { setSaving(false); }
  };

  const catColor = {
    "NSVS (Secondary)":C.green, "Samaritan (Primary)":C.accent,
    "Staff":C.purple, "Outpatient":C.amber,
    "Insurance":C.blue, "ANC / Maternity":"#db2777",
  };
  const todayPts  = patients.filter(p=>p.registeredAt===today());
  const displayed = search.trim()
    ? patients.filter(p=>
        p.name.toLowerCase().includes(search.toLowerCase())||
        p.id.toLowerCase().includes(search.toLowerCase())||
        (p.category||"").toLowerCase().includes(search.toLowerCase()))
    : [...patients].reverse();

  return (
    <div style={{ padding:24, display:"grid", gridTemplateColumns:"1fr 380px", gap:20, alignItems:"start" }}>

      {/* ── Registration form ── */}
      <div>
        {done && (
          <div style={{ marginBottom:14, padding:"12px 16px", background:done.free?"#f0fdf4":"#eff6ff",
            border:`1.5px solid ${done.free?C.green:C.blue}`, borderRadius:9, fontSize:13 }}>
            ✓ <b>{done.id}</b> · {done.name} → <b>{done.destination}</b>
            {done.free && <span style={{ color:C.green, fontWeight:700 }}> · COVERED — no charge</span>}
            <button onClick={()=>setDone(null)} style={{ float:"right", background:"none", border:"none", cursor:"pointer", fontSize:16, color:C.textLight }}>×</button>
          </div>
        )}

        <Card title="New Patient Registration">
          <ErrBanner err={err}/>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12 }}>
            <Input label="First Name ★" value={form.firstName} onChange={v=>set("firstName",v)} required placeholder="First name"/>
            <Input label="Second Name ★" value={form.secondName} onChange={v=>set("secondName",v)} required placeholder="Second name"/>
            <Input label="Other Name" value={form.otherName} onChange={v=>set("otherName",v)} placeholder="Middle / other name"/>
          </div>

          {fullName && (
            <div style={{ margin:"8px 0 4px", padding:"5px 12px", background:"#f0fdf4", borderRadius:6, fontSize:12, color:C.green, fontWeight:600 }}>
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
              {isSchool && <div style={{ fontSize:10, color:C.amber, marginTop:2 }}>📵 Not required for school patients</div>}
            </div>

            <Input label="Emergency Contact" value={form.emergencyContact} onChange={v=>set("emergencyContact",v)} placeholder="Name: 07XXXXXXXX"/>
            <Input label="Arrival Time" value={form.arrivalTime} onChange={v=>set("arrivalTime",v)} type="time"/>

            {isSchool && (
              <Input label="Class / Form" value={form.class} onChange={v=>set("class",v)}
                placeholder={form.category==="NSVS (Secondary)"?"e.g. S3A":"e.g. P5"}/>
            )}
            {isStaff && <>
              <Input label="Employee ID" value={form.employeeId} onChange={v=>set("employeeId",v)} placeholder="EMP-XXXX"/>
              <Input label="Department" value={form.department} onChange={v=>set("department",v)} placeholder="e.g. Mathematics"/>
            </>}
            {insur && <>
              <Input label="Insurance Provider ★" value={form.insuranceProvider} onChange={v=>set("insuranceProvider",v)} placeholder="e.g. Jubilee, UAP"/>
              <Input label="Member / Policy No." value={form.insuranceNumber} onChange={v=>set("insuranceNumber",v)} placeholder="e.g. MBR-00123"/>
            </>}
          </div>

          {/* Billing notice */}
          {form.category && (
            <div style={{ margin:"12px 0 8px", padding:"10px 14px", borderRadius:8,
              background:free?"#f0fdf4":insur?"#eff6ff":"#fffbeb",
              border:`1.5px solid ${free?C.green:insur?C.blue:C.amber}`,
              fontSize:13, fontWeight:600, color:free?C.green:insur?C.blue:C.amber }}>
              {free
                ? `✅ ${form.category} — FULLY COVERED. No bill will be generated.`
                : insur
                ? `🏥 Insurance patient — insurance rates will apply automatically`
                : `💳 Standard billing — outpatient rates apply`}
            </div>
          )}

          {/* Destination picker */}
          <div style={{ marginTop:8 }}>
            <div style={{ fontSize:11, fontWeight:700, color:C.textMid, textTransform:"uppercase", marginBottom:8, letterSpacing:"0.05em" }}>
              Route Patient To ★
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:8 }}>
              {DESTINATIONS.map(d=>(
                <button key={d.value} onClick={()=>set("destination",d.value)}
                  style={{ padding:"12px 6px", borderRadius:9,
                    border:`2px solid ${form.destination===d.value?C.accent:C.border}`,
                    background:form.destination===d.value?"#f0f9ff":"#f8fafc",
                    cursor:"pointer", fontSize:11, fontWeight:700, textAlign:"center",
                    color:form.destination===d.value?C.accent:C.textMid, transition:"all 0.15s",
                    lineHeight:1.4 }}>
                  <div style={{ fontSize:22, marginBottom:4 }}>{d.label.split(" ")[0]}</div>
                  <div>{d.label.replace(/^\S+\s/,"")}</div>
                </button>
              ))}
            </div>
          </div>

          {form.destination==="lab" && (
            <div style={{ marginTop:10 }}>
              <Input label="Tests Requested (optional)" value={form.labReason}
                onChange={v=>set("labReason",v)} placeholder="e.g. Malaria RDT, Full Blood Count"/>
            </div>
          )}
          {form.destination==="sonography" && (
            <div style={{ marginTop:10 }}>
              <Input label="Scan Requested (optional)" value={form.scanReason}
                onChange={v=>set("scanReason",v)} placeholder="e.g. Obstetric scan — 28 weeks"/>
            </div>
          )}

          <div style={{ marginTop:18, display:"flex", gap:10 }}>
            <Btn onClick={handleSubmit} disabled={saving}><UserPlus size={14}/> {saving?"Registering…":"Register Patient"}</Btn>
            <Btn outline onClick={()=>{ setForm({ ...blank, arrivalTime:now() }); setErr(""); }}>Clear</Btn>
          </div>
        </Card>
      </div>

      {/* ── Patient registry ── */}
      <div style={{ position:"sticky", top:0 }}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:14 }}>
          <div style={{ background:`linear-gradient(135deg,${C.accent},${C.accentDim||"#7c3aed"})`, borderRadius:10, padding:"12px 14px", color:"#fff" }}>
            <div style={{ fontSize:10, opacity:0.8, marginBottom:2 }}>TOTAL PATIENTS</div>
            <div style={{ fontSize:26, fontWeight:800, lineHeight:1 }}>{patients.length}</div>
          </div>
          <div style={{ background:`linear-gradient(135deg,${C.green},"#15803d")`, borderRadius:10, padding:"12px 14px", color:"#fff" }}>
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
          <div style={{ maxHeight:520, overflowY:"auto" }}>
            {displayed.length===0
              ? <EmptyState icon="🔍" message={search?`No results for "${search}"`:"No patients yet"}/>
              : displayed.map(p=>(
                <div key={p.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 0", borderBottom:`1px solid ${C.border}` }}>
                  <div style={{ width:32, height:32, borderRadius:"50%", background:(catColor[p.category]||C.accent)+"22",
                    display:"flex", alignItems:"center", justifyContent:"center", fontSize:15, flexShrink:0 }}>
                    {p.gender==="F"?"👩":p.gender==="M"?"👨":"🧑"}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:600, fontSize:13, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{p.name}</div>
                    <div style={{ fontSize:10, color:C.textMid, fontFamily:"'IBM Plex Mono',monospace" }}>{p.id}</div>
                    <div style={{ fontSize:10, color:C.textLight }}>
                      {p.registeredAt===today()
                        ? <span style={{ color:C.green, fontWeight:600 }}>Today {p.arrivalTime?`· ${p.arrivalTime}`:""}</span>
                        : p.registeredAt}
                      {p.class?` · ${p.class}`:""}
                    </div>
                  </div>
                  <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:3 }}>
                    <Badge label={p.category?.split(" ")[0]||"?"} color={catColor[p.category]||C.accent}/>
                    {p.isFree && <span style={{ fontSize:9, color:C.green, fontWeight:700 }}>COVERED</span>}
                    {p.isInsurance && <span style={{ fontSize:9, color:C.blue, fontWeight:700 }}>INSURED</span>}
                  </div>
                </div>
              ))}
          </div>
          <div style={{ marginTop:10, paddingTop:10, borderTop:`1px solid ${C.border}`, fontSize:11, color:C.textLight, textAlign:"center" }}>
            {search?`${displayed.length} of ${patients.length}`:  `All ${patients.length} patients — newest first`}
          </div>
        </Card>
      </div>
    </div>
  );
}