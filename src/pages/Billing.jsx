import { useState, useEffect } from "react";
import { DollarSign, Plus, X, CheckCircle, AlertCircle, Download, Search, Printer } from "lucide-react";
import { C, today, now, genTxn } from "../theme";
import { Badge, Btn, Input, Select, Card, ErrBanner, EmptyState } from "../ui";
import { api } from "../api";

// ─────────────────────────────────────────────────────────────────────────────
// SERVICE PRICE LIST MANAGER  (admin / accountant)
// ─────────────────────────────────────────────────────────────────────────────
export function ServicePriceList() {
  const [services, setServices]   = useState([]);
  const [showAdd, setShowAdd]     = useState(false);
  const [form, setForm]           = useState({ name:"", category:"Consultation", price:"", insurancePrice:"" });
  const [err, setErr]             = useState("");
  const [filter, setFilter]       = useState("all");
  const set = (k,v) => setForm(f => ({...f,[k]:v}));

  const cats = ["Consultation","Laboratory","Dental","Pharmacy","Maternity","Sonography","Admission","Procedure","Other"];

  useEffect(() => { api.getServices().then(setServices).catch(console.warn); }, []);

  const save = async () => {
    if (!form.name || !form.price) { setErr("Name and standard price are required."); return; }
    setErr("");
    try {
      const svc = await api.addService({
        ...form,
        price: parseInt(form.price),
        insurancePrice: form.insurancePrice ? parseInt(form.insurancePrice) : Math.round(parseInt(form.price)*0.7),
      });
      setServices(s => [...s, svc]);
      setForm({ name:"", category:"Consultation", price:"", insurancePrice:"" });
      setShowAdd(false);
    } catch(e) { setErr(e.message); }
  };

  const toggle = async (id, active) => {
    try {
      const u = await api.updateService(id, { active: !active });
      setServices(s => s.map(x => x.id===id ? u : x));
    } catch(e) { alert(e.message); }
  };

  const catColor = { Consultation:C.green, Laboratory:C.amber, Dental:C.blue, Pharmacy:C.pink, Maternity:"#db2777", Sonography:"#7c3aed", Admission:C.purple, Procedure:C.accent, Other:C.textMid };
  const displayed = filter==="all" ? services : services.filter(s => s.category===filter);

  return (
    <div style={{ padding:24 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16, flexWrap:"wrap", gap:10 }}>
        <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
          {["all",...cats].map(c => (
            <Btn key={c} small outline={filter!==c} color={catColor[c]||C.accent} onClick={()=>setFilter(c)} style={{ textTransform:"capitalize" }}>{c==="all"?"All":c}</Btn>
          ))}
        </div>
        <Btn onClick={()=>setShowAdd(v=>!v)}><Plus size={13}/> Add Service</Btn>
      </div>

      {showAdd && (
        <Card style={{ marginBottom:16, border:`1.5px solid ${C.accent}` }}>
          <ErrBanner err={err}/>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 150px 150px auto", gap:12, alignItems:"end" }}>
            <Input label="Service Name" value={form.name} onChange={v=>set("name",v)} placeholder="e.g. Blood Smear Test"/>
            <Select label="Category" value={form.category} onChange={v=>set("category",v)} options={cats}/>
            <Input label="Standard Price (UGX) ★" value={form.price} onChange={v=>set("price",v)} type="number" placeholder="e.g. 15000"/>
            <div>
              <Input label="Insurance Price (UGX)" value={form.insurancePrice} onChange={v=>set("insurancePrice",v)} type="number" placeholder="auto (70%)"/>
              <div style={{ fontSize:9, color:C.textLight, marginTop:2 }}>Leave blank for 70% of standard</div>
            </div>
            <div style={{ display:"flex", gap:8 }}>
              <Btn color={C.green} onClick={save}><CheckCircle size={13}/> Save</Btn>
              <Btn outline onClick={()=>setShowAdd(false)}>Cancel</Btn>
            </div>
          </div>
        </Card>
      )}

      <Card title={`Service Catalogue (${displayed.length}) — Dual Pricing`}>
        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
          <thead><tr style={{ borderBottom:`2px solid ${C.border}` }}>
            {["Service","Category","Standard Price","Insurance Price","Status",""].map(h=>(
              <th key={h} style={{ textAlign:"left",padding:"7px 10px",fontSize:11,color:C.textLight,fontWeight:700,textTransform:"uppercase" }}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {displayed.map(s=>(
              <tr key={s.id} style={{ borderBottom:`1px solid ${C.border}`, opacity:s.active?1:0.45 }}>
                <td style={{ padding:"10px" }}><div style={{ fontWeight:600 }}>{s.name}</div></td>
                <td style={{ padding:"10px" }}><Badge label={s.category} color={catColor[s.category]||C.accent}/></td>
                <td style={{ padding:"10px", fontWeight:700, color:C.green, fontFamily:"'IBM Plex Mono',monospace" }}>
                  UGX {(s.price||0).toLocaleString()}
                </td>
                <td style={{ padding:"10px", fontWeight:700, color:C.blue, fontFamily:"'IBM Plex Mono',monospace" }}>
                  UGX {(s.insurancePrice||Math.round((s.price||0)*0.7)).toLocaleString()}
                </td>
                <td style={{ padding:"10px" }}><Badge label={s.active?"Active":"Inactive"} color={s.active?C.green:C.textLight}/></td>
                <td style={{ padding:"10px" }}><Btn small outline color={s.active?C.red:C.green} onClick={()=>toggle(s.id,s.active)}>{s.active?"Disable":"Enable"}</Btn></td>
              </tr>
            ))}
          </tbody>
        </table>
        {displayed.length===0 && <EmptyState icon="💰" message="No services in this category"/>}
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BILLING FORM  — create a bill for a patient (pharmacy / reception)
// ─────────────────────────────────────────────────────────────────────────────
export function BillingForm({ patients, user, onBillCreated }) {
  const [services, setServices]     = useState([]);
  const [selected, setSelected]     = useState([]); // {service, qty}
  const [patientId, setPatientId]   = useState("");
  const [customItem, setCustomItem] = useState({ name:"", price:"" });
  const [svcFilter, setSvcFilter]   = useState("all");
  const [err, setErr]               = useState("");
  const [saving, setSaving]         = useState(false);

  useEffect(() => { api.getServices().then(s => setServices(s.filter(x=>x.active))).catch(console.warn); }, []);

  const cats = ["all","Consultation","Laboratory","Dental","Pharmacy","Admission","Procedure"];
  const catColor = { Consultation:C.green, Laboratory:C.amber, Dental:C.blue, Pharmacy:C.pink, Admission:C.purple, Procedure:C.accent };
  const displaySvcs = svcFilter==="all" ? services : services.filter(s=>s.category===svcFilter);

  const addService = (svc) => {
    const exists = selected.find(s=>s.service.id===svc.id);
    if (exists) setSelected(s => s.map(x=>x.service.id===svc.id?{...x,qty:x.qty+1}:x));
    else setSelected(s => [...s, { service:svc, qty:1 }]);
  };

  const removeItem = (id) => setSelected(s => s.filter(x=>x.service.id!==id));
  const updateQty  = (id, qty) => setSelected(s => s.map(x=>x.service.id===id?{...x,qty:Math.max(1,qty)}:x));

  const addCustom = () => {
    if (!customItem.name || !customItem.price) return;
    const fake = { id:`CUST${Date.now()}`, name:customItem.name, price:parseInt(customItem.price), category:"Other" };
    setSelected(s => [...s, { service:fake, qty:1 }]);
    setCustomItem({ name:"", price:"" });
  };

  const total = selected.reduce((s,x) => s + x.service.price*x.qty, 0);

  const createBill = async () => {
    const rawId = patientId.split(" — ")[0];
    if (!rawId || selected.length===0) { setErr("Select a patient and at least one service."); return; }
    const p = patients.find(x=>x.id===rawId);
    setSaving(true); setErr("");
    try {
      const bill = await api.createBill({
        patientId: rawId,
        patientName: p?.name||"",
        services: selected.map(x=>({ serviceId:x.service.id, name:x.service.name, price:x.service.price, qty:x.qty, subtotal:x.service.price*x.qty })),
        totalAmount: total,
        createdBy: user?.name||"",
      });
      setSelected([]); setPatientId("");
      if (onBillCreated) onBillCreated(bill);
    } catch(e) { setErr(e.message); } finally { setSaving(false); }
  };

  return (
    <div style={{ display:"grid", gridTemplateColumns:"1fr 340px", gap:16 }}>
      {/* Left: service picker */}
      <div>
        <Card title="Select Services" style={{ marginBottom:14 }}>
          <div style={{ display:"flex", gap:6, marginBottom:12, flexWrap:"wrap" }}>
            {cats.map(c=><Btn key={c} small outline={svcFilter!==c} color={catColor[c]||C.accent} onClick={()=>setSvcFilter(c)} style={{textTransform:"capitalize"}}>{c==="all"?"All":c}</Btn>)}
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}>
            {displaySvcs.map(s=>(
              <div key={s.id} onClick={()=>addService(s)}
                style={{ padding:"10px 12px", borderRadius:9, border:`1.5px solid ${catColor[s.category]||C.accent}33`, cursor:"pointer", background:`${catColor[s.category]||C.accent}08`, transition:"all 0.1s" }}
                onMouseEnter={e=>e.currentTarget.style.background=`${catColor[s.category]||C.accent}18`}
                onMouseLeave={e=>e.currentTarget.style.background=`${catColor[s.category]||C.accent}08`}>
                <div style={{ fontWeight:600, fontSize:12 }}>{s.name}</div>
                <div style={{ color:C.green, fontWeight:700, fontSize:13, marginTop:3 }}>UGX {s.price.toLocaleString()}</div>
              </div>
            ))}
          </div>
          {/* Custom item */}
          <div style={{ display:"flex", gap:8, marginTop:14, alignItems:"flex-end", paddingTop:14, borderTop:`1px solid ${C.border}` }}>
            <Input label="Custom Item" value={customItem.name} onChange={v=>setCustomItem(c=>({...c,name:v}))} placeholder="Item name"/>
            <Input label="Price (UGX)" value={customItem.price} onChange={v=>setCustomItem(c=>({...c,price:v}))} type="number" placeholder="0"/>
            <Btn outline color={C.textMid} onClick={addCustom}><Plus size={13}/> Add</Btn>
          </div>
        </Card>
      </div>

      {/* Right: bill summary */}
      <div>
        <Card title="Bill Summary">
          <ErrBanner err={err}/>
          <Select label="Patient" value={patientId} onChange={setPatientId} options={patients.map(p=>`${p.id} — ${p.name}`)} required/>
          <div style={{ margin:"14px 0", minHeight:80 }}>
            {selected.length===0
              ? <div style={{ color:C.textLight, fontSize:12, textAlign:"center", padding:20 }}>Click services to add them</div>
              : selected.map(x=>(
                <div key={x.service.id} style={{ display:"flex", alignItems:"center", gap:8, padding:"6px 0", borderBottom:`1px solid ${C.border}` }}>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:600, fontSize:12 }}>{x.service.name}</div>
                    <div style={{ fontSize:11, color:C.textMid }}>UGX {x.service.price.toLocaleString()} each</div>
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:4 }}>
                    <button onClick={()=>updateQty(x.service.id,x.qty-1)} style={{ width:22,height:22,borderRadius:"50%",border:`1px solid ${C.border}`,background:"#f8fafc",cursor:"pointer",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center" }}>−</button>
                    <span style={{ fontWeight:700,fontSize:13,minWidth:20,textAlign:"center" }}>{x.qty}</span>
                    <button onClick={()=>updateQty(x.service.id,x.qty+1)} style={{ width:22,height:22,borderRadius:"50%",border:`1px solid ${C.border}`,background:"#f8fafc",cursor:"pointer",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center" }}>+</button>
                  </div>
                  <div style={{ fontWeight:700,color:C.green,fontSize:13,minWidth:80,textAlign:"right" }}>UGX {(x.service.price*x.qty).toLocaleString()}</div>
                  <button onClick={()=>removeItem(x.service.id)} style={{ background:"none",border:"none",cursor:"pointer",color:C.red,fontSize:16 }}>×</button>
                </div>
              ))}
          </div>
          <div style={{ background:C.greenLight,borderRadius:9,padding:"12px 14px",marginBottom:14 }}>
            <div style={{ display:"flex",justifyContent:"space-between",fontWeight:800,fontSize:17,color:C.green }}>
              <span>TOTAL</span><span>UGX {total.toLocaleString()}</span>
            </div>
          </div>
          <Btn color={C.green} onClick={createBill} disabled={saving||selected.length===0||!patientId} style={{ width:"100%" }}>
            <DollarSign size={13}/> {saving?"Creating Bill…":"Create Bill & Collect Payment"}
          </Btn>
        </Card>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PAYMENT COLLECTOR  — handles full + partial payments on any bill
// ─────────────────────────────────────────────────────────────────────────────
export function PaymentCollector({ bills, setBills, user }) {
  const [search, setSearch]         = useState("");
  const [filter, setFilter]         = useState("all"); // all | unpaid | partial | paid
  const [payingBillId, setPayingBillId] = useState(null);
  const [payAmt, setPayAmt]         = useState("");
  const [payMethod, setPayMethod]   = useState("Cash");
  const [saving, setSaving]         = useState(false);

  const billsFiltered = bills
    .filter(b => filter==="all" || b.status===filter)
    .filter(b => !search || b.patientName.toLowerCase().includes(search.toLowerCase()) || b.id.toLowerCase().includes(search.toLowerCase()));

  const statusColor = { unpaid:C.red, partial:C.amber, paid:C.green };
  const statusLabel = { unpaid:"UNPAID", partial:"PARTIAL", paid:"PAID" };

  const makePayment = async (bill) => {
    if (!payAmt || parseInt(payAmt)<=0) { alert("Enter a valid amount."); return; }
    setSaving(true);
    try {
      const updated = await api.payBill(bill.id, { amount:parseInt(payAmt), method:payMethod, cashier:user?.name||"" });
      setBills(prev => prev.map(b => b.id===bill.id ? updated : b));
      setPayingBillId(null); setPayAmt(""); setPayMethod("Cash");
    } catch(e){ alert(e.message); } finally{ setSaving(false); }
  };

  const printBillReceipt = (bill, payment) => {
    const win = window.open("","_blank","width=420,height=700");
    const svcRows = (bill.services||[]).map(s=>`<tr><td>${s.name}</td><td style="text-align:right">x${s.qty}</td><td style="text-align:right">UGX ${(s.price*s.qty).toLocaleString()}</td></tr>`).join("");
    const payRows = (bill.payments||[]).map(p=>`<div style="display:flex;justify-content:space-between;font-size:12px"><span>${p.date} ${p.time} · ${p.method}</span><span>UGX ${p.amount.toLocaleString()}</span></div>`).join("");
    win.document.write(`<!DOCTYPE html><html><head><title>Bill</title>
    <style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Courier New',monospace;padding:20px;font-size:13px}
    .center{text-align:center}.div{border-top:1px dashed #000;margin:10px 0}
    table{width:100%;border-collapse:collapse}td{padding:3px 0}
    .total{font-size:16px;font-weight:bold}button{display:block;margin:16px auto;padding:8px 20px;background:#0e7490;color:#fff;border:none;border-radius:6px;cursor:pointer}
    @media print{button{display:none}}</style></head><body>
    <div class="center"><div style="font-size:24px">🏥</div><div style="font-size:16px;font-weight:bold">HMS CLINIC</div><div style="font-size:11px;color:#666">PATIENT BILL</div></div>
    <div class="div"></div>
    <div style="display:flex;justify-content:space-between"><span>Bill: <b>${bill.id}</b></span><span>${bill.date}</span></div>
    <div>Patient: <b>${bill.patientName}</b></div>
    <div class="div"></div>
    <table>${svcRows}</table>
    <div class="div"></div>
    <div style="display:flex;justify-content:space-between" class="total"><span>TOTAL</span><span>UGX ${bill.totalAmount.toLocaleString()}</span></div>
    <div style="display:flex;justify-content:space-between;color:green"><span>PAID</span><span>UGX ${bill.amountPaid.toLocaleString()}</span></div>
    ${bill.balance>0?`<div style="display:flex;justify-content:space-between;color:red"><span>BALANCE DUE</span><span>UGX ${bill.balance.toLocaleString()}</span></div>`:""}
    <div class="div"></div>
    <div style="font-weight:bold;margin-bottom:4px">Payment History</div>
    ${payRows}
    <div class="div"></div>
    <div style="text-align:center;font-size:11px;color:#666">${bill.balance>0?"Please clear your balance at your next visit":"Thank you for full payment!"}</div>
    <button onclick="window.print()">🖨 Print</button>
    </body></html>`);
    win.document.close();
  };

  return (
    <div style={{ padding:24 }}>
      {/* Filters */}
      <div style={{ display:"flex", gap:10, marginBottom:16, flexWrap:"wrap", alignItems:"center" }}>
        <div style={{ position:"relative", flex:1, minWidth:200 }}>
          <Search size={14} style={{ position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:C.textLight }}/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search patient or bill ID…"
            style={{ width:"100%",padding:"8px 8px 8px 30px",border:`1.5px solid ${C.border}`,borderRadius:7,fontSize:13,fontFamily:"inherit",boxSizing:"border-box" }}/>
        </div>
        {["all","unpaid","partial","paid"].map(f=>(
          <Btn key={f} small outline={filter!==f} color={f==="paid"?C.green:f==="partial"?C.amber:f==="unpaid"?C.red:C.accent} onClick={()=>setFilter(f)} style={{textTransform:"capitalize"}}>
            {f==="all"?"All Bills":f}
          </Btn>
        ))}
      </div>

      {/* Summary */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:20 }}>
        {[
          { label:"Unpaid Bills",    value:bills.filter(b=>b.status==="unpaid").length,  color:C.red },
          { label:"Partial Bills",   value:bills.filter(b=>b.status==="partial").length, color:C.amber },
          { label:"Outstanding",     value:`UGX ${bills.filter(b=>b.status!=="paid").reduce((s,b)=>s+b.balance,0).toLocaleString()}`, color:C.red },
          { label:"Collected Today", value:`UGX ${bills.flatMap(b=>b.payments||[]).filter(p=>p.date===today()).reduce((s,p)=>s+p.amount,0).toLocaleString()}`, color:C.green },
        ].map(s=>(
          <div key={s.label} style={{ background:C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:"14px 16px" }}>
            <div style={{ fontSize:10,fontWeight:700,color:C.textLight,textTransform:"uppercase",marginBottom:4 }}>{s.label}</div>
            <div style={{ fontSize:20,fontWeight:800,color:s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Bill list */}
      {billsFiltered.length===0
        ? <Card><EmptyState icon="💳" message="No bills found"/></Card>
        : billsFiltered.map(bill=>{
          const isPaying = payingBillId===bill.id;
          return (
            <Card key={bill.id} style={{ marginBottom:12, border:isPaying?`2px solid ${C.green}`:bill.status==="unpaid"?`1px solid ${C.red}33`:bill.status==="partial"?`1px solid ${C.amber}33`:undefined }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
                <div>
                  <div style={{ fontWeight:700, fontSize:15 }}>{bill.patientName}</div>
                  <div style={{ fontSize:11, color:C.textMid, fontFamily:"'IBM Plex Mono',monospace" }}>{bill.id} · {bill.date}</div>
                  <div style={{ fontSize:12, color:C.textMid, marginTop:3 }}>
                    {(bill.services||[]).map(s=>`${s.name} x${s.qty}`).join(" · ")}
                  </div>
                </div>
                <div style={{ textAlign:"right" }}>
                  <Badge label={statusLabel[bill.status]||bill.status} color={statusColor[bill.status]||C.textMid}/>
                  <div style={{ marginTop:6 }}>
                    <span style={{ fontWeight:800, fontSize:16, color:C.text }}>UGX {bill.totalAmount.toLocaleString()}</span>
                  </div>
                  <div style={{ fontSize:12, color:C.green }}>Paid: UGX {bill.amountPaid.toLocaleString()}</div>
                  {bill.balance>0 && <div style={{ fontSize:13, fontWeight:700, color:C.red }}>Balance: UGX {bill.balance.toLocaleString()}</div>}
                </div>
              </div>

              {/* Payment history pills */}
              {bill.payments?.length>0 && (
                <div style={{ display:"flex", flexWrap:"wrap", gap:5, marginBottom:10 }}>
                  {bill.payments.map((p,i)=>(
                    <span key={i} style={{ background:C.greenLight,border:`1px solid ${C.green}44`,borderRadius:20,padding:"2px 10px",fontSize:11,color:C.green }}>
                      UGX {p.amount.toLocaleString()} · {p.method} · {p.date}
                    </span>
                  ))}
                </div>
              )}

              <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                {bill.status!=="paid" && !isPaying && (
                  <Btn color={C.green} onClick={()=>{ setPayingBillId(bill.id); setPayAmt(""); setPayMethod("Cash"); }}>
                    <DollarSign size={13}/> {bill.amountPaid>0?"Add Payment":"Collect Payment"}
                  </Btn>
                )}
                <Btn outline color={C.accent} onClick={()=>printBillReceipt(bill,null)}>
                  <Printer size={13}/> Receipt
                </Btn>
              </div>

              {/* Payment form */}
              {isPaying && bill.status!=="paid" && (
                <div style={{ borderTop:`1px solid ${C.border}`,paddingTop:14,marginTop:10 }}>
                  {bill.balance>0 && (
                    <div style={{ fontSize:12,color:C.amber,marginBottom:10,fontWeight:600 }}>
                      ⚠ Outstanding balance: UGX {bill.balance.toLocaleString()}
                      {" "}— patient can pay full or partial amount.
                    </div>
                  )}
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 180px auto auto", gap:10, alignItems:"flex-end" }}>
                    <div>
                      <label style={{ fontSize:11,fontWeight:700,color:C.textMid,textTransform:"uppercase",letterSpacing:"0.05em",display:"block",marginBottom:4 }}>Amount to Pay (UGX)</label>
                      <div style={{ display:"flex", gap:6 }}>
                        <input type="number" value={payAmt} onChange={e=>setPayAmt(e.target.value)} placeholder="Enter amount"
                          style={{ flex:1,border:`1.5px solid ${C.green}`,borderRadius:7,padding:"8px 10px",fontSize:14,fontFamily:"'IBM Plex Mono',monospace",fontWeight:700 }}/>
                        <Btn small outline color={C.green} onClick={()=>setPayAmt(String(bill.balance))}>Full</Btn>
                      </div>
                    </div>
                    <Select label="Method" value={payMethod} onChange={setPayMethod} options={["Cash","Mobile Money","Insurance","Waiver"]}/>
                    <Btn color={C.green} onClick={()=>makePayment(bill)} disabled={saving}>
                      {saving?"…":"Confirm Payment"}
                    </Btn>
                    <Btn outline onClick={()=>setPayingBillId(null)}>Cancel</Btn>
                  </div>
                </div>
              )}
            </Card>
          );
        })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DEBTORS LIST  (accountant / director view)
// ─────────────────────────────────────────────────────────────────────────────
export function DebtorsList({ bills }) {
  const unpaid = bills.filter(b => b.status !== "paid").sort((a,b)=>b.balance-a.balance);
  const totalOwed = unpaid.reduce((s,b)=>s+b.balance,0);

  const exportDebtors = () => {
    const headers = ["Bill ID","Patient","Services","Total (UGX)","Paid (UGX)","Balance (UGX)","Status","Date"];
    const rows = unpaid.map(b=>[b.id,b.patientName,(b.services||[]).map(s=>s.name).join("; "),b.totalAmount,b.amountPaid,b.balance,b.status,b.date]);
    const csv = [headers,...rows].map(r=>r.map(c=>`"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv],{type:"text/csv"}); const url=URL.createObjectURL(blob);
    const a=document.createElement("a"); a.href=url; a.download=`HMS-Debtors-${new Date().toISOString().slice(0,10)}.csv`; a.click();
  };

  return (
    <div style={{ padding:24 }}>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:14, marginBottom:20 }}>
        <div style={{ background:`linear-gradient(135deg,${C.red},${C.red}aa)`,borderRadius:12,padding:"18px 20px",color:"#fff" }}>
          <div style={{ fontSize:11,opacity:0.8,marginBottom:4 }}>TOTAL OUTSTANDING</div>
          <div style={{ fontSize:22,fontWeight:800 }}>UGX {totalOwed.toLocaleString()}</div>
        </div>
        <div style={{ background:`linear-gradient(135deg,${C.amber},${C.amber}aa)`,borderRadius:12,padding:"18px 20px",color:"#fff" }}>
          <div style={{ fontSize:11,opacity:0.8,marginBottom:4 }}>DEBTORS</div>
          <div style={{ fontSize:28,fontWeight:800 }}>{unpaid.length}</div>
          <div style={{ fontSize:11,opacity:0.7 }}>unpaid or partial bills</div>
        </div>
        <div style={{ background:`linear-gradient(135deg,${C.accent},${C.accentDim})`,borderRadius:12,padding:"18px 20px",color:"#fff" }}>
          <div style={{ fontSize:11,opacity:0.8,marginBottom:4 }}>AVG DEBT PER PATIENT</div>
          <div style={{ fontSize:22,fontWeight:800 }}>UGX {unpaid.length?Math.round(totalOwed/unpaid.length).toLocaleString():0}</div>
        </div>
      </div>

      <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:14 }}>
        <Btn outline color={C.accent} onClick={exportDebtors}><Download size={13}/> Export Debtors (.csv)</Btn>
      </div>

      <Card title={`Outstanding Bills (${unpaid.length})`}>
        {unpaid.length===0 ? <EmptyState icon="✅" message="No outstanding balances — all bills settled!"/> : (
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
            <thead><tr style={{ borderBottom:`2px solid ${C.border}` }}>
              {["Patient","Bill ID","Total","Paid","Balance Due","Status","Date"].map(h=>(
                <th key={h} style={{ textAlign:"left",padding:"7px 8px",fontSize:11,color:C.textLight,fontWeight:700,textTransform:"uppercase" }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {unpaid.map(b=>(
                <tr key={b.id} style={{ borderBottom:`1px solid ${C.border}` }}>
                  <td style={{ padding:"9px 8px",fontWeight:700 }}>{b.patientName}</td>
                  <td style={{ padding:"9px 8px",fontFamily:"'IBM Plex Mono',monospace",fontSize:10,color:C.textLight }}>{b.id}</td>
                  <td style={{ padding:"9px 8px" }}>UGX {b.totalAmount.toLocaleString()}</td>
                  <td style={{ padding:"9px 8px",color:C.green }}>UGX {b.amountPaid.toLocaleString()}</td>
                  <td style={{ padding:"9px 8px",fontWeight:700,color:C.red }}>UGX {b.balance.toLocaleString()}</td>
                  <td style={{ padding:"9px 8px" }}><Badge label={b.status==="partial"?"PARTIAL":"UNPAID"} color={b.status==="partial"?C.amber:C.red}/></td>
                  <td style={{ padding:"9px 8px",color:C.textLight,fontFamily:"'IBM Plex Mono',monospace",fontSize:11 }}>{b.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}