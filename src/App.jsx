import { useState, useEffect, useCallback } from "react";
import { UserPlus, ClipboardList, Search, DollarSign, Calendar, Activity, FileText, TestTube2, Heart, Pill, Package, BarChart2, TrendingUp, Users, Settings, LogOut, Bell, Zap, RefreshCw, Shield, AlertCircle } from "lucide-react";
import { C, ROLES } from "./theme";
import { api, setToken, clearToken } from "./api";

// Page components
import { PatientRegistration, QueueView, PatientSearch, OutpatientBilling, AppointmentsView } from "./pages/Reception";
import { NurseVitals, PatientFile, PatientRecords, DentistView, LabView, PharmacyView } from "./pages/Clinical";
import { InventoryView } from "./pages/Inventory";
import { AccountantView } from "./pages/Finance";
import { DirectorDashboard, InChargeDashboard } from "./pages/Director";
import { AdminAccounts, AuditLog, ChangePassword, SystemSettings } from "./pages/Admin";
import { ServicePriceList, PaymentCollector, DebtorsList } from "./pages/Billing";
import { AdmittedPatients } from "./pages/Admissions";

// ── Login Screen ──────────────────────────────────────────────────────────────
function LoginScreen({ onLogin }) {
  const [user, setUser] = useState(""); const [pass, setPass] = useState(""); const [err, setErr] = useState(""); const [loading, setLoading] = useState(false);
  const handleLogin = async () => {
    if (!user||!pass){ setErr("Enter username and password."); return; }
    setLoading(true); setErr("");
    try { const r=await api.login(user,pass); setToken(r.token); onLogin(r.user); }
    catch(e){ setErr(e.message); } finally{ setLoading(false); }
  };
  const demo = (u,p) => { setUser(u); setPass(p); };
  return (
    <div style={{ minHeight:"100vh", background:`linear-gradient(135deg,${C.navy} 0%,#0f2040 60%,#0a1628 100%)`, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Sora',sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;600;700;800&family=IBM+Plex+Mono:wght@400;600&display=swap');*{box-sizing:border-box}`}</style>
      <div style={{ background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)", backdropFilter:"blur(20px)", borderRadius:20, padding:"44px 48px", width:400, boxShadow:"0 40px 80px rgba(0,0,0,0.5)" }}>
        <div style={{ textAlign:"center", marginBottom:32 }}>
          <div style={{ fontSize:44, marginBottom:8 }}>🏥</div>
          <h1 style={{ color:"#fff", fontSize:22, fontWeight:800, margin:0 }}>HMS Portal</h1>
          <p style={{ color:"rgba(255,255,255,0.4)", fontSize:11, margin:"4px 0 0", letterSpacing:"0.1em" }}>HOSPITAL MANAGEMENT SYSTEM</p>
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          {[["Username",user,setUser,"text","e.g. doctor"],["Password",pass,setPass,"password","••••••"]].map(([l,v,fn,t,ph])=>(
            <div key={l} style={{ display:"flex", flexDirection:"column", gap:4 }}>
              <label style={{ fontSize:11, fontWeight:600, color:"rgba(255,255,255,0.5)", textTransform:"uppercase", letterSpacing:"0.06em" }}>{l}</label>
              <input type={t} value={v} onChange={e=>fn(e.target.value)} placeholder={ph} onKeyDown={e=>e.key==="Enter"&&handleLogin()}
                style={{ border:"1px solid rgba(255,255,255,0.15)", borderRadius:8, padding:"10px 12px", fontSize:13, fontFamily:"'IBM Plex Mono',monospace", color:"#fff", background:"rgba(255,255,255,0.08)", outline:"none" }}/>
            </div>
          ))}
          {err && <p style={{ color:C.red, fontSize:12, margin:0 }}>⚠ {err}</p>}
          <button onClick={handleLogin} disabled={loading} style={{ marginTop:4, background:`linear-gradient(90deg,${C.accent},${C.accentDim})`, color:"#fff", border:"none", borderRadius:9, padding:"12px", fontSize:14, fontWeight:700, fontFamily:"inherit", cursor:loading?"not-allowed":"pointer", opacity:loading?0.7:1, letterSpacing:"0.03em" }}>
            {loading?"Signing in…":"Sign In →"}
          </button>
        </div>
        <div style={{ marginTop:22, padding:14, background:"rgba(255,255,255,0.04)", borderRadius:10, border:"1px solid rgba(255,255,255,0.07)" }}>
          <p style={{ color:"rgba(255,255,255,0.35)", fontSize:10, margin:"0 0 8px", fontWeight:700, letterSpacing:"0.08em" }}>DEMO — click to auto-fill (password: 1234)</p>
          <div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>
            {[["receptionist","1234"],["doctor","1234"],["incharge","1234"],["lab","1234"],["pharmacy","1234"],["accountant","1234"],["director","1234"],["admin","admin"]].map(([u,p])=>(
              <span key={u} onClick={()=>demo(u,p)} style={{ cursor:"pointer", background:"rgba(34,211,238,0.12)", color:C.accent, borderRadius:4, padding:"2px 8px", fontSize:10, fontWeight:600, border:"1px solid rgba(34,211,238,0.2)" }}>{u}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Sidebar ───────────────────────────────────────────────────────────────────
function Sidebar({ user, activeTab, setTab, onLogout, queueCount, lowStockCount, admissions }) {
  const roleMenus = {
    receptionist:[
      { id:"register",     icon:<UserPlus size={15}/>,     label:"Register Patient" },
      { id:"queue",        icon:<ClipboardList size={15}/>, label:"Patient Queue", badge:queueCount },
      { id:"billing",      icon:<DollarSign size={15}/>,   label:"Billing" },
      { id:"search",       icon:<Search size={15}/>,        label:"Patient Search" },
      { id:"appointments", icon:<Calendar size={15}/>,     label:"Appointments" },
      { id:"changepw",     icon:<RefreshCw size={15}/>,    label:"Change Password" },
    ],
    doctor:[
      { id:"myqueue",      icon:<Activity size={15}/>,      label:"My Queue", badge:queueCount },
      { id:"patientfile",  icon:<FileText size={15}/>,      label:"Patient File" },
      { id:"admitted",     icon:<ClipboardList size={15}/>, label:"Admitted Patients", badge:admissions?.filter(a=>a.status==="admitted").length||0 },
      { id:"records",      icon:<Search size={15}/>,        label:"Patient Records" },
      { id:"laborders",    icon:<TestTube2 size={15}/>,     label:"Lab Orders" },
      { id:"changepw",     icon:<RefreshCw size={15}/>,    label:"Change Password" },
    ],
    nurse:[
      { id:"vitals",       icon:<Heart size={15}/>,         label:"Record Vitals" },
      { id:"queue",        icon:<ClipboardList size={15}/>, label:"Queue", badge:queueCount },
      { id:"search",       icon:<Search size={15}/>,        label:"Patient Search" },
      { id:"changepw",     icon:<RefreshCw size={15}/>,    label:"Change Password" },
    ],
    lab:[
      { id:"labpending",   icon:<TestTube2 size={15}/>,     label:"Pending Tests" },
      { id:"labresults",   icon:<Activity size={15}/>,      label:"Completed" },
      { id:"changepw",     icon:<RefreshCw size={15}/>,    label:"Change Password" },
    ],
    pharmacy:[
      { id:"pharmacyqueue",icon:<Pill size={15}/>,          label:"Prescriptions" },
      { id:"billing",      icon:<DollarSign size={15}/>,   label:"Billing & Payments" },
      { id:"inventory",    icon:<Package size={15}/>,       label:"Drug Inventory", badge:lowStockCount||0 },
      { id:"changepw",     icon:<RefreshCw size={15}/>,    label:"Change Password" },
    ],
    dentist:[
      { id:"dentalqueue",  icon:<Activity size={15}/>,      label:"Dental Queue" },
      { id:"admitted",     icon:<ClipboardList size={15}/>, label:"Admitted Patients" },
      { id:"changepw",     icon:<RefreshCw size={15}/>,    label:"Change Password" },
    ],
    accountant:[
      { id:"financials",   icon:<BarChart2 size={15}/>,     label:"Financial Reports" },
      { id:"billing",      icon:<DollarSign size={15}/>,   label:"Bills & Payments" },
      { id:"debtors",      icon:<AlertCircle size={15}/>,  label:"Debtors" },
      { id:"services",     icon:<Package size={15}/>,       label:"Service Price List" },
      { id:"changepw",     icon:<RefreshCw size={15}/>,    label:"Change Password" },
    ],
    director:[
      { id:"dashboard",    icon:<BarChart2 size={15}/>,     label:"Dashboard" },
      { id:"admitted",     icon:<ClipboardList size={15}/>, label:"Admitted Patients", badge:admissions?.filter(a=>a.status==="admitted").length||0 },
      { id:"debtors",      icon:<AlertCircle size={15}/>,  label:"Debtors" },
      { id:"inventory",    icon:<Package size={15}/>,       label:"Stock Alerts", badge:lowStockCount||0 },
      { id:"audit",        icon:<Shield size={15}/>,        label:"Audit Log" },
      { id:"changepw",     icon:<RefreshCw size={15}/>,    label:"Change Password" },
    ],
    incharge:[
      { id:"incharge",     icon:<Activity size={15}/>,      label:"Live Overview" },
      { id:"queue",        icon:<ClipboardList size={15}/>, label:"Patient Queue", badge:queueCount },
      { id:"admitted",     icon:<ClipboardList size={15}/>, label:"Admitted Patients", badge:admissions?.filter(a=>a.status==="admitted").length||0 },
      { id:"search",       icon:<Search size={15}/>,        label:"Patient Search" },
      { id:"inventory",    icon:<Package size={15}/>,       label:"Stock Alerts", badge:lowStockCount||0 },
      { id:"changepw",     icon:<RefreshCw size={15}/>,    label:"Change Password" },
    ],
    admin:[
      { id:"accounts",     icon:<Users size={15}/>,         label:"Accounts" },
      { id:"services",     icon:<Package size={15}/>,       label:"Service Price List" },
      { id:"audit",        icon:<Shield size={15}/>,        label:"Audit Log" },
      { id:"system",       icon:<Settings size={15}/>,      label:"System" },
      { id:"changepw",     icon:<RefreshCw size={15}/>,    label:"Change Password" },
    ],
  };

  const items = roleMenus[user.role]||[];
  const roleInfo = ROLES[user.role]||{};

  return (
    <div style={{ width:210, minHeight:"100vh", background:C.sidebarBg, display:"flex", flexDirection:"column", borderRight:`1px solid ${C.sidebarBorder}`, flexShrink:0 }}>
      <div style={{ padding:"16px 14px 12px", borderBottom:`1px solid ${C.sidebarBorder}` }}>
        <div style={{ fontSize:10, color:C.textLight, fontWeight:700, letterSpacing:"0.12em", marginBottom:8 }}>🏥 HMS PORTAL</div>
        <div style={{ display:"flex", alignItems:"center", gap:9 }}>
          <div style={{ width:36, height:36, borderRadius:"50%", background:(roleInfo.color||C.accent)+"22", border:`2px solid ${roleInfo.color||C.accent}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, flexShrink:0 }}>{roleInfo.icon}</div>
          <div style={{ minWidth:0 }}>
            <div style={{ color:"#e2e8f0", fontWeight:700, fontSize:13, lineHeight:1.2, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{user.name.split(" ")[0]}</div>
            <div style={{ color:roleInfo.color||C.accent, fontSize:9, fontWeight:700, letterSpacing:"0.06em", textTransform:"uppercase" }}>{roleInfo.label}</div>
          </div>
        </div>
      </div>
      <nav style={{ flex:1, padding:"8px 6px", overflowY:"auto" }}>
        {items.map(item=>{
          const active = activeTab===item.id;
          return (
            <button key={item.id} onClick={()=>setTab(item.id)} style={{ display:"flex", alignItems:"center", gap:8, width:"100%", padding:"8px 10px", border:"none", borderRadius:7, cursor:"pointer", marginBottom:2, background:active?`${roleInfo.color||C.accent}22`:"transparent", color:active?roleInfo.color||C.accent:C.textLight, fontFamily:"inherit", fontSize:12, fontWeight:active?700:400, transition:"all 0.12s", textAlign:"left" }}>
              {item.icon}
              <span style={{ flex:1 }}>{item.label}</span>
              {item.badge>0 && <span style={{ background:item.id==="inventory"?C.amber:C.red, color:"#fff", borderRadius:10, padding:"1px 6px", fontSize:10, fontWeight:700 }}>{item.badge}</span>}
            </button>
          );
        })}
      </nav>
      <div style={{ padding:"8px 6px", borderTop:`1px solid ${C.sidebarBorder}` }}>
        <button onClick={onLogout} style={{ display:"flex", alignItems:"center", gap:8, width:"100%", padding:"8px 10px", border:"none", borderRadius:7, cursor:"pointer", background:"transparent", color:C.textLight, fontFamily:"inherit", fontSize:12 }}>
          <LogOut size={14}/> Sign Out
        </button>
      </div>
    </div>
  );
}

// ── Topbar ────────────────────────────────────────────────────────────────────
function Topbar({ title, onEmergency, emergencies, notifications, onReload, loading }) {
  return (
    <div style={{ height:52, background:C.card, borderBottom:`1px solid ${C.border}`, display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 22px", flexShrink:0 }}>
      <h2 style={{ margin:0, fontSize:15, fontWeight:700, color:C.text }}>{title}</h2>
      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
        {notifications>0 && <div style={{ position:"relative" }}><Bell size={17} color={C.textMid}/><span style={{ position:"absolute", top:-4, right:-4, background:C.red, color:"#fff", borderRadius:"50%", width:13, height:13, display:"flex", alignItems:"center", justifyContent:"center", fontSize:8, fontWeight:700 }}>{notifications}</span></div>}
        <button onClick={onReload} title="Refresh data" style={{ background:"none", border:"none", cursor:"pointer", color:C.textLight, display:"flex", alignItems:"center" }}>
          <RefreshCw size={14} style={{ animation:loading?"spin 1s linear infinite":undefined }}/>
        </button>
        {onEmergency && (
          <button onClick={onEmergency} style={{ background:emergencies>0?C.red:C.redLight, color:emergencies>0?"#fff":C.red, border:`2px solid ${C.red}`, borderRadius:7, padding:"5px 12px", fontFamily:"inherit", fontSize:11, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", gap:4 }}>
            <Zap size={12}/> {emergencies>0?`${emergencies} EMERGENCY`:"🚨 EMERGENCY"}
          </button>
        )}
        <span style={{ fontSize:10, color:C.textLight, fontFamily:"'IBM Plex Mono',monospace" }}>{new Date().toLocaleDateString("en-UG")}</span>
      </div>
    </div>
  );
}

// ── Emergency Modal ───────────────────────────────────────────────────────────
function EmergencyModal({ onClose, reload }) {
  const [name, setName] = useState(""); const [complaint, setComplaint] = useState("");
  const tempId = `EMG-${Math.floor(1000+Math.random()*9000)}`;
  const activate = async () => {
    try {
      await api.addToQueue({ patientId:tempId, name:name||"Unknown Patient", stage:"doctor", priority:"emergency", timestamp:new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}), complaint:complaint||"EMERGENCY — details pending", assignedTo:"", isEmergency:true });
      onClose(); reload();
      alert(`Emergency activated. Temp ID: ${tempId}`);
    } catch(e){ alert(e.message); }
  };
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:999 }}>
      <div style={{ background:C.card, border:`2px solid ${C.red}`, borderRadius:16, padding:30, width:400, boxShadow:`0 0 40px ${C.red}44` }}>
        <h3 style={{ margin:"0 0 8px", color:C.red }}>🚨 Emergency — Golden Hour</h3>
        <p style={{ fontSize:13, color:C.textMid, margin:"0 0 16px" }}>Begin treatment immediately. Details reconciled after stabilisation.</p>
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
            <label style={{ fontSize:11, fontWeight:600, color:C.textMid, textTransform:"uppercase" }}>Patient Name (if known)</label>
            <input value={name} onChange={e=>setName(e.target.value)} placeholder="Unknown if not available" style={{ border:`1.5px solid ${C.border}`, borderRadius:7, padding:"8px 11px", fontSize:13, fontFamily:"inherit" }}/>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
            <label style={{ fontSize:11, fontWeight:600, color:C.textMid, textTransform:"uppercase" }}>Emergency Complaint</label>
            <input value={complaint} onChange={e=>setComplaint(e.target.value)} placeholder="e.g. Trauma, Active labour, Poisoning..." style={{ border:`1.5px solid ${C.border}`, borderRadius:7, padding:"8px 11px", fontSize:13, fontFamily:"inherit" }}/>
          </div>
          <div style={{ background:C.redLight, borderRadius:7, padding:10, fontSize:12, color:C.textMid }}>
            Temp ID: <b style={{fontFamily:"'IBM Plex Mono',monospace"}}>{tempId}</b>
          </div>
        </div>
        <div style={{ marginTop:18, display:"flex", gap:10 }}>
          <button onClick={activate} style={{ background:C.red, color:"#fff", border:"none", borderRadius:7, padding:"9px 18px", fontFamily:"inherit", fontSize:13, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", gap:6 }}><Zap size={13}/> ACTIVATE EMERGENCY</button>
          <button onClick={onClose} style={{ background:"transparent", border:`1.5px solid ${C.border}`, borderRadius:7, padding:"9px 18px", fontFamily:"inherit", fontSize:13, cursor:"pointer" }}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [patients, setPatients] = useState([]);
  const [queue, setQueue] = useState([]);
  const [queueArchive, setQueueArchive] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [labOrders, setLabOrders] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [bills, setBills]         = useState([]);
  const [admissions, setAdmissions] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState("");
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [showEmergency, setShowEmergency] = useState(false);
  const [loading, setLoading] = useState(false);

  const loadData = useCallback(async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const canAdmin = ["admin","director"].includes(currentUser.role);
      const canLab   = ["lab","doctor","dentist","director","admin"].includes(currentUser.role);
      const canFin   = ["receptionist","accountant","director","admin"].includes(currentUser.role);
      const canBills = ["receptionist","pharmacy","accountant","director","incharge","admin"].includes(currentUser.role);
      const canAdmit = ["doctor","dentist","incharge","director","admin"].includes(currentUser.role);

      const [p,q,qa,appt,inv,lab,txn,acc,bil,adm] = await Promise.allSettled([
        api.getPatients(),
        api.getQueue(),
        api.getQueueArchive(),
        api.getAppointments(),
        api.getInventory(),
        canLab   ? api.getLabOrders()    : Promise.resolve([]),
        canFin   ? api.getTransactions() : Promise.resolve([]),
        canAdmin ? api.getAccounts()     : Promise.resolve([]),
        canBills ? api.getBills()        : Promise.resolve([]),
        canAdmit ? api.getAdmissions()   : Promise.resolve([]),
      ]);

      const val = (r, fb=[]) => r.status === "fulfilled" ? r.value : fb;
      setPatients(val(p));
      setQueue(val(q));
      setQueueArchive(val(qa));
      setAppointments(val(appt));
      setInventory(val(inv));
      setLabOrders(val(lab));
      setTransactions(val(txn));
      setAccounts(val(acc));
      setBills(val(bil));
      setAdmissions(val(adm));

      [p,q,qa,appt,inv,lab,txn,acc,bil,adm].forEach((r,i) => {
        if (r.status === "rejected") console.warn(`loadData[${i}] failed:`, r.reason);
      });
    } catch(e){ console.error("loadData fatal:", e); } finally{ setLoading(false); }
  }, [currentUser]);

  useEffect(()=>{ loadData(); }, [loadData]);

  // Auto-refresh every 30 seconds
  useEffect(()=>{ const t=setInterval(loadData,30000); return ()=>clearInterval(t); },[loadData]);

  const handleLogin = (user) => {
    setCurrentUser(user);
    const defaults = { receptionist:"register", doctor:"myqueue", nurse:"vitals", lab:"labpending", pharmacy:"pharmacyqueue", accountant:"financials", director:"dashboard", incharge:"incharge", admin:"accounts", dentist:"dentalqueue" };
    setActiveTab(defaults[user.role]||"");
  };

  const handleLogout = () => { clearToken(); setCurrentUser(null); setPatients([]); setQueue([]); };

  const queueCount    = queue.length;
  const emergencies   = queue.filter(e=>e.priority==="emergency").length;
  const lowStockCount = inventory.filter(d=>d.quantityInStock<=d.reorderLevel).length;

  const tabTitle = {
    register:"Register Patient", queue:"Patient Queue",
    billing:"Bills & Payments", debtors:"Debtors List", services:"Service Price List",
    search:"Patient Search", appointments:"Appointments",
    myqueue:"My Queue", patientfile:"Patient File", laborders:"Lab Orders",
    vitals:"Record Vitals", labpending:"Pending Lab Tests", labresults:"Lab Results",
    pharmacyqueue:"Pharmacy Queue", inventory:"Drug Inventory", dentalqueue:"Dental Queue",
    records:"Patient Records", admitted:"Admitted Patients",
    financials:"Financial Reports", dashboard:"Director Dashboard",
    incharge:"In-Charge Live Overview",
    accounts:"Manage Accounts", audit:"Audit Log", system:"System Settings", changepw:"Change Password",
  };

  const renderContent = () => {
    const props = { patients, setPatients, queue, queueArchive, labOrders, transactions, accounts, inventory, appointments, bills, setBills, admissions, selectedPatient, setSelectedPatient, setTab:setActiveTab, user:currentUser, reload:loadData };
    switch(activeTab) {
      case "register":      return <PatientRegistration {...props}/>;
      case "queue":
      case "myqueue":       return <QueueView {...props} userRole={currentUser.role}/>;
      case "search":        return <PatientSearch {...props} userRole={currentUser.role}/>;
      case "appointments":  return <AppointmentsView {...props}/>;
      case "vitals":        return <NurseVitals {...props}/>;
      case "patientfile":
      case "laborders":     return <PatientFile {...props}/>;
      case "records":       return <PatientRecords {...props}/>;
      case "admitted":      return <AdmittedPatients admissions={admissions} patients={patients} user={currentUser} isDoctor={["doctor","dentist"].includes(currentUser.role)} reload={loadData}/>;
      case "dentalqueue":   return <DentistView {...props}/>;
      case "labpending":
      case "labresults":    return <LabView {...props} queue={queue}/>;
      case "pharmacyqueue": return <PharmacyView {...props} user={currentUser}/>;
      case "billing":       return <PaymentCollector bills={bills} setBills={setBills} user={currentUser}/>;
      case "debtors":       return <DebtorsList bills={bills}/>;
      case "services":      return <ServicePriceList/>;
      case "inventory":     return <InventoryView {...props}/>;
      case "financials":    return <AccountantView {...props}/>;
      case "dashboard":     return <DirectorDashboard {...props}/>;
      case "incharge":      return <InChargeDashboard {...props}/>;
      case "accounts":      return <AdminAccounts {...props}/>;
      case "audit":         return <AuditLog/>;
      case "changepw":      return <ChangePassword user={currentUser}/>;
      case "system":        return <SystemSettings/>;
      default:              return <div style={{ padding:40, color:C.textLight, textAlign:"center" }}>Select a module from the sidebar.</div>;
    }
  };

  if (!currentUser) return <LoginScreen onLogin={handleLogin}/>;

  return (
    <div style={{ fontFamily:"'Sora',sans-serif", display:"flex", height:"100vh", overflow:"hidden", background:C.bg }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;600;700;800&family=IBM+Plex+Mono:wght@400;600&display=swap');
        *{box-sizing:border-box}
        ::-webkit-scrollbar{width:5px} ::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:4px}
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
      `}</style>

      <Sidebar user={currentUser} activeTab={activeTab} setTab={setActiveTab} onLogout={handleLogout} queueCount={queueCount} lowStockCount={lowStockCount} admissions={admissions}/>

      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
        {["accountant","director"].includes(currentUser.role) && (
          <div style={{ background:`linear-gradient(90deg,${C.accentDim},#1d4ed8)`, padding:"3px 16px", fontSize:11, color:"rgba(255,255,255,0.8)", fontWeight:600, letterSpacing:"0.06em" }}>
            🌐 WEB PORTAL — Remote Access Mode
          </div>
        )}
        <Topbar
          title={tabTitle[activeTab]||activeTab}
          onEmergency={["receptionist","doctor","nurse"].includes(currentUser.role)?()=>setShowEmergency(true):null}
          emergencies={emergencies}
          notifications={emergencies}
          onReload={loadData}
          loading={loading}
        />
        <div style={{ flex:1, overflowY:"auto" }}>{renderContent()}</div>
      </div>

      {showEmergency && <EmergencyModal onClose={()=>setShowEmergency(false)} reload={loadData}/>}
    </div>
  );
}