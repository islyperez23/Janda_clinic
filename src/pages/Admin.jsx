import { useState, useEffect } from "react";
import { Users, Plus, RefreshCw, Shield, Check, Activity, Server } from "lucide-react";
import { C, ROLES } from "../theme";
import { Badge, Btn, Input, Select, Card, ErrBanner, SuccessBanner, EmptyState, DonutChart } from "../ui";
import { api } from "../api";

// ── Account Management ────────────────────────────────────────────────────────
export function AdminAccounts({ accounts, reload }) {
  const [form, setForm] = useState({ name:"", username:"", password:"", role:"" });
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [success, setSuccess] = useState("");
  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  const create = async () => {
    if (!form.name||!form.username||!form.role||!form.password){ setErr("All fields required."); return; }
    setSaving(true); setErr("");
    try {
      await api.addAccount(form);
      setSuccess(`Account created for ${form.name}`);
      setForm({ name:"", username:"", password:"", role:"" });
      setShowForm(false); reload();
    } catch(e){ setErr(e.message); } finally{ setSaving(false); }
  };

  const toggle = async (id) => { try{ await api.toggleAccount(id); reload(); }catch(e){ alert(e.message); } };

  // Role distribution
  const roleData = Object.entries(ROLES).map(([role,info])=>({ label:info.label, value:accounts.filter(a=>a.role===role).length, color:info.color })).filter(d=>d.value>0);
  const activeCount = accounts.filter(a=>a.active).length;

  return (
    <div style={{ padding:24 }}>
      <SuccessBanner msg={success} onDismiss={()=>setSuccess("")}/>

      {/* Stats */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14, marginBottom:20 }}>
        <div style={{ background:`linear-gradient(135deg,${C.accent},${C.accentDim})`, borderRadius:12, padding:"16px 18px", color:"#fff" }}>
          <div style={{ fontSize:11, opacity:0.8, marginBottom:4 }}>TOTAL ACCOUNTS</div>
          <div style={{ fontSize:28, fontWeight:800 }}>{accounts.length}</div>
        </div>
        <div style={{ background:`linear-gradient(135deg,${C.green},${C.greenDim})`, borderRadius:12, padding:"16px 18px", color:"#fff" }}>
          <div style={{ fontSize:11, opacity:0.8, marginBottom:4 }}>ACTIVE</div>
          <div style={{ fontSize:28, fontWeight:800 }}>{activeCount}</div>
        </div>
        <div style={{ background:`linear-gradient(135deg,${C.red},${C.red}aa)`, borderRadius:12, padding:"16px 18px", color:"#fff" }}>
          <div style={{ fontSize:11, opacity:0.8, marginBottom:4 }}>INACTIVE</div>
          <div style={{ fontSize:28, fontWeight:800 }}>{accounts.length-activeCount}</div>
        </div>
        <div style={{ background:`linear-gradient(135deg,${C.purple},${C.purple}aa)`, borderRadius:12, padding:"16px 18px", color:"#fff" }}>
          <div style={{ fontSize:11, opacity:0.8, marginBottom:4 }}>ROLES IN USE</div>
          <div style={{ fontSize:28, fontWeight:800 }}>{roleData.length}</div>
        </div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 280px", gap:16, marginBottom:16 }}>
        {/* Create form */}
        <div>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:14 }}>
            <h3 style={{ margin:0, fontSize:15, fontWeight:700 }}>User Accounts</h3>
            <Btn onClick={()=>setShowForm(!showForm)}><Plus size={14}/> {showForm?"Cancel":"Create Account"}</Btn>
          </div>

          {showForm && (
            <Card style={{ marginBottom:16, border:`1.5px solid ${C.accent}` }}>
              <ErrBanner err={err}/>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                <Input label="Full Name" value={form.name} onChange={v=>set("name",v)} required placeholder="e.g. Dr. Sarah Kato"/>
                <Input label="Username" value={form.username} onChange={v=>set("username",v)} required placeholder="e.g. doctor2"/>
                <Input label="Password" value={form.password} onChange={v=>set("password",v)} type="password" required placeholder="Min 4 chars"/>
                <Select label="Role" value={form.role} onChange={v=>set("role",v)} options={Object.keys(ROLES).map(r=>({ value:r, label:ROLES[r].label }))} required/>
              </div>
              <div style={{ marginTop:14, display:"flex", gap:10 }}>
                <Btn onClick={create} disabled={saving}><Check size={13}/> {saving?"Creating…":"Create Account"}</Btn>
              </div>
            </Card>
          )}

          <Card>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
              <thead><tr style={{ borderBottom:`2px solid ${C.border}` }}>
                {["Name","Username","Role","Status","Actions"].map(h=>(
                  <th key={h} style={{ textAlign:"left", padding:"8px 10px", fontSize:11, color:C.textLight, fontWeight:700, textTransform:"uppercase" }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {accounts.map(a=>(
                  <tr key={a.id} style={{ borderBottom:`1px solid ${C.border}`, opacity:a.active?1:0.5 }}>
                    <td style={{ padding:"10px" }}>
                      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                        <div style={{ width:30, height:30, borderRadius:"50%", background:(ROLES[a.role]?.color||C.textLight)+"22", display:"flex", alignItems:"center", justifyContent:"center", fontSize:14 }}>{ROLES[a.role]?.icon}</div>
                        <div style={{ fontWeight:600 }}>{a.name}</div>
                      </div>
                    </td>
                    <td style={{ padding:"10px", fontFamily:"'IBM Plex Mono',monospace", fontSize:11, color:C.textMid }}>{a.username}</td>
                    <td style={{ padding:"10px" }}><Badge label={ROLES[a.role]?.label||a.role} color={ROLES[a.role]?.color||C.textLight}/></td>
                    <td style={{ padding:"10px" }}><Badge label={a.active?"Active":"Inactive"} color={a.active?C.green:C.textLight}/></td>
                    <td style={{ padding:"10px" }}>
                      <Btn small outline color={a.active?C.red:C.green} onClick={()=>toggle(a.id)}>{a.active?"Deactivate":"Activate"}</Btn>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>

        {/* Role distribution */}
        <div>
          <Card title="Role Distribution" style={{ marginBottom:16 }}>
            <DonutChart data={roleData} size={120} label={`${accounts.length}`}/>
          </Card>
          <Card title="Security Info">
            <div style={{ fontSize:13, color:C.textMid, lineHeight:1.8 }}>
              <div>🔒 Passwords are bcrypt-hashed</div>
              <div>🎫 JWT tokens expire in 8 hours</div>
              <div>🛡 Role-based access control</div>
              <div>📋 All actions are audit-logged</div>
              <div>⏱ Login limited to 10 attempts / 15 min</div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ── Audit Log ─────────────────────────────────────────────────────────────────
export function AuditLog() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [err, setErr] = useState("");

  useEffect(()=>{ api.getAudit(300).then(setEntries).catch(e=>setErr(e.message)).finally(()=>setLoading(false)); },[]);

  const ACTION_COLOR = {
    LOGIN_SUCCESS:C.green, LOGIN_FAIL:C.red,
    PATIENT_REGISTER:C.accent, PATIENT_UPDATE:C.accentDim,
    QUEUE_ADD:C.purple, QUEUE_UPDATE:C.purple,
    LAB_ORDER:C.amber, LAB_RESULT:C.green,
    TRANSACTION:C.green,
    ACCOUNT_CREATE:C.accent, ACCOUNT_ACTIVATE:C.green, ACCOUNT_DEACTIVATE:C.red,
    PASSWORD_CHANGE:C.amber, STOCK_IN:C.green, STOCK_OUT:C.amber,
    DRUG_ADD:C.purple,
  };

  const actionGroups = { all:"All", LOGIN:"Auth", PATIENT:"Patients", QUEUE:"Queue", LAB:"Lab", TRANSACTION:"Finance", ACCOUNT:"Accounts", STOCK:"Inventory" };
  const filtered = filter==="all" ? entries : entries.filter(e=>e.action.startsWith(filter));

  return (
    <div style={{ padding:24 }}>
      <div style={{ display:"flex", gap:8, marginBottom:16, flexWrap:"wrap" }}>
        {Object.entries(actionGroups).map(([k,l])=>(
          <Btn key={k} small outline={filter!==k} color={C.accent} onClick={()=>setFilter(k)}>{l}</Btn>
        ))}
        <span style={{ marginLeft:"auto", fontSize:12, color:C.textLight, alignSelf:"center" }}>{filtered.length} entries</span>
      </div>

      <Card>
        {loading && <div style={{ textAlign:"center", padding:30, color:C.textLight }}>Loading audit log…</div>}
        {err && <div style={{ color:C.red, padding:14 }}>⚠ {err}</div>}
        {!loading && filtered.length===0 && <EmptyState icon="📋" message="No audit entries found"/>}
        <div style={{ maxHeight:560, overflowY:"auto" }}>
          {filtered.map(e=>(
            <div key={e.id} style={{ display:"flex", gap:12, alignItems:"flex-start", padding:"9px 0", borderBottom:`1px solid ${C.border}`, fontSize:12 }}>
              <span style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:10, color:C.textLight, whiteSpace:"nowrap", paddingTop:2, minWidth:140 }}>
                {new Date(e.timestamp).toLocaleString("en-UG",{dateStyle:"short",timeStyle:"short"})}
              </span>
              <Badge label={e.action} color={ACTION_COLOR[e.action]||C.textMid}/>
              <div style={{ flex:1 }}>
                <span style={{ fontWeight:600, color:C.text }}>{e.user}</span>
                {e.detail&&Object.keys(e.detail).length>0 && (
                  <span style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:10, color:C.textLight, marginLeft:8 }}>
                    {Object.entries(e.detail).map(([k,v])=>`${k}:${v}`).join(" · ")}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ── Change Password ───────────────────────────────────────────────────────────
export function ChangePassword({ user }) {
  const [pw, setPw] = useState({ next:"", confirm:"" });
  const [msg, setMsg] = useState(null);
  const [saving, setSaving] = useState(false);
  const set = (k,v) => setPw(p=>({...p,[k]:v}));

  const handleChange = async () => {
    if (!pw.next||pw.next.length<4){ setMsg({ok:false,text:"Password must be at least 4 characters."}); return; }
    if (pw.next!==pw.confirm){ setMsg({ok:false,text:"Passwords do not match."}); return; }
    setSaving(true); setMsg(null);
    try {
      await api.changePassword(user.id, pw.next);
      setMsg({ ok:true, text:"Password updated. Use it on your next login." });
      setPw({ next:"", confirm:"" });
    } catch(e){ setMsg({ok:false,text:e.message}); } finally{ setSaving(false); }
  };

  return (
    <div style={{ padding:24, maxWidth:420 }}>
      <Card title="Change Password">
        {msg && <div style={{ background:msg.ok?C.greenLight:C.redLight, border:`1.5px solid ${msg.ok?C.green:C.red}`, borderRadius:8, padding:"10px 14px", marginBottom:14, fontSize:13, color:msg.ok?C.green:C.red }}>{msg.ok?"✓":"⚠"} {msg.text}</div>}
        <div style={{ fontSize:13, color:C.textMid, marginBottom:16, padding:"10px 14px", background:"#f8fafc", borderRadius:8 }}>
          Logged in as <b style={{color:C.text}}>{user.name}</b><br/>
          <span style={{ fontSize:11 }}>Role: {ROLES[user.role]?.label} · Username: {user.username}</span>
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          <Input label="New Password" value={pw.next} onChange={v=>set("next",v)} type="password" placeholder="Minimum 4 characters"/>
          <Input label="Confirm New Password" value={pw.confirm} onChange={v=>set("confirm",v)} type="password" placeholder="Repeat new password"/>
          <Btn onClick={handleChange} disabled={saving} style={{ marginTop:4 }}><RefreshCw size={13}/> {saving?"Updating…":"Update Password"}</Btn>
        </div>
      </Card>
    </div>
  );
}

// ── System Settings ───────────────────────────────────────────────────────────
export function SystemSettings() {
  const [health, setHealth] = useState(null);
  useEffect(()=>{ api.health().then(setHealth).catch(console.warn); },[]);

  return (
    <div style={{ padding:24 }}>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
        <Card title="System Health" accent={C.green}>
          {health ? (
            <>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:14 }}>
                <div style={{ width:10, height:10, borderRadius:"50%", background:C.green }}/>
                <span style={{ fontWeight:600, color:C.green }}>All Systems Operational</span>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                {Object.entries(health.counts).map(([k,v])=>(
                  <div key={k} style={{ background:"#f8fafc", borderRadius:8, padding:"10px 12px" }}>
                    <div style={{ fontSize:11, color:C.textLight, textTransform:"capitalize" }}>{k}</div>
                    <div style={{ fontSize:20, fontWeight:700, color:C.text }}>{v}</div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop:14, fontSize:11, color:C.textLight, fontFamily:"'IBM Plex Mono',monospace" }}>Last checked: {new Date(health.timestamp).toLocaleTimeString()}</div>
            </>
          ) : <div style={{ color:C.textLight }}>Loading system health…</div>}
        </Card>

        <Card title="System Information">
          <div style={{ fontSize:13, color:C.textMid, lineHeight:2 }}>
            <div><b style={{color:C.text}}>System:</b> HMS Portal v3.0</div>
            <div><b style={{color:C.text}}>Architecture:</b> React + Express</div>
            <div><b style={{color:C.text}}>Auth:</b> JWT (8hr expiry)</div>
            <div><b style={{color:C.text}}>Storage:</b> JSON file persistence</div>
            <div><b style={{color:C.text}}>Security:</b> bcrypt + helmet + rate-limit</div>
            <div><b style={{color:C.text}}>Roles:</b> 9 role types</div>
          </div>
        </Card>
      </div>
    </div>
  );
}
