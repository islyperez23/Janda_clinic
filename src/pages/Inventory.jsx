import { useState } from "react";
import { Package, Plus, TrendingUp, TrendingDown, AlertTriangle, X } from "lucide-react";
import { C, DRUG_CATEGORIES, today } from "../theme";
import { Badge, Btn, Input, Select, Card, ErrBanner, EmptyState } from "../ui";
import { api } from "../api";

export function InventoryView({ inventory, reload }) {
  const [view, setView] = useState("list"); // list | add | movements
  const [movements, setMovements] = useState([]);
  const [modalDrug, setModalDrug] = useState(null); // { drug, mode:"in"|"out" }
  const [stockQty, setStockQty] = useState("");
  const [stockReason, setStockReason] = useState("");
  const [err, setErr] = useState("");

  const lowStock  = inventory.filter(d=>d.quantityInStock<=d.reorderLevel);
  const outOfStock = inventory.filter(d=>d.quantityInStock===0);
  const expiringSoon = inventory.filter(d=>d.expiryDate && d.expiryDate<new Date(Date.now()+30*24*60*60*1000).toISOString().slice(0,10));

  const handleStockAction = async () => {
    if (!stockQty||parseInt(stockQty)<=0){ setErr("Enter a valid quantity."); return; }
    setErr("");
    try {
      if (modalDrug.mode==="in") await api.stockIn(modalDrug.drug.id, { quantity:parseInt(stockQty), reason:stockReason||"Replenishment" });
      else await api.dispense(modalDrug.drug.id, { quantity:parseInt(stockQty), reason:stockReason||"Manual dispense" });
      setModalDrug(null); setStockQty(""); setStockReason(""); reload();
    } catch(e){ setErr(e.message); }
  };

  const loadMovements = async () => {
    try { const m=await api.getMovements(); setMovements(m); setView("movements"); }
    catch(e){ alert(e.message); }
  };

  const statusColor = (d) => {
    if (d.quantityInStock===0)            return C.red;
    if (d.quantityInStock<=d.reorderLevel) return C.amber;
    return C.green;
  };
  const statusLabel = (d) => {
    if (d.quantityInStock===0)            return "OUT OF STOCK";
    if (d.quantityInStock<=d.reorderLevel) return "LOW STOCK";
    return "OK";
  };

  return (
    <div style={{ padding:24 }}>
      {/* Summary cards */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14, marginBottom:20 }}>
        <div style={{ background:`linear-gradient(135deg,${C.accent},${C.accentDim})`, borderRadius:12, padding:"16px 18px", color:"#fff" }}>
          <div style={{ fontSize:11, opacity:0.8, marginBottom:4 }}>TOTAL DRUGS</div>
          <div style={{ fontSize:28, fontWeight:800 }}>{inventory.length}</div>
        </div>
        <div style={{ background:`linear-gradient(135deg,${C.amber},${C.amber}aa)`, borderRadius:12, padding:"16px 18px", color:"#fff" }}>
          <div style={{ fontSize:11, opacity:0.8, marginBottom:4 }}>LOW STOCK</div>
          <div style={{ fontSize:28, fontWeight:800 }}>{lowStock.length}</div>
          <div style={{ fontSize:10, opacity:0.8 }}>at or below reorder level</div>
        </div>
        <div style={{ background:`linear-gradient(135deg,${C.red},${C.red}aa)`, borderRadius:12, padding:"16px 18px", color:"#fff" }}>
          <div style={{ fontSize:11, opacity:0.8, marginBottom:4 }}>OUT OF STOCK</div>
          <div style={{ fontSize:28, fontWeight:800 }}>{outOfStock.length}</div>
        </div>
        <div style={{ background:`linear-gradient(135deg,${C.purple},${C.purple}aa)`, borderRadius:12, padding:"16px 18px", color:"#fff" }}>
          <div style={{ fontSize:11, opacity:0.8, marginBottom:4 }}>EXPIRING SOON</div>
          <div style={{ fontSize:28, fontWeight:800 }}>{expiringSoon.length}</div>
          <div style={{ fontSize:10, opacity:0.8 }}>within 30 days</div>
        </div>
      </div>

      {/* Alerts */}
      {lowStock.length>0 && (
        <div style={{ background:C.amberLight, border:`1.5px solid ${C.amber}`, borderRadius:10, padding:"12px 16px", marginBottom:16, display:"flex", alignItems:"flex-start", gap:10 }}>
          <AlertTriangle size={16} color={C.amber} style={{ flexShrink:0, marginTop:2 }}/>
          <div>
            <div style={{ fontWeight:700, color:C.amber }}>⚠ Low Stock Alert</div>
            <div style={{ fontSize:12, color:C.textMid, marginTop:2 }}>{lowStock.map(d=>`${d.name} (${d.quantityInStock} ${d.unit})`).join(" · ")}</div>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div style={{ display:"flex", gap:10, marginBottom:16 }}>
        <Btn onClick={()=>setView(view==="add"?"list":"add")} color={view==="add"?C.textMid:C.accent}><Plus size={13}/> {view==="add"?"Cancel":"Add Drug"}</Btn>
        <Btn outline onClick={loadMovements}><TrendingDown size={13}/> Stock History</Btn>
        {view==="movements" && <Btn outline onClick={()=>setView("list")}>← Back to Inventory</Btn>}
      </div>

      {/* Add drug form */}
      {view==="add" && <AddDrugForm onSave={async (d)=>{ try{ await api.addDrug(d); setView("list"); reload(); }catch(e){alert(e.message);} }} onCancel={()=>setView("list")}/>}

      {/* Inventory table */}
      {view==="list" && (
        <Card title={`Drug Inventory (${inventory.length})`}>
          {inventory.length===0 ? <EmptyState icon="💊" message="No drugs in inventory. Add your first drug."/> : (
            <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
                <thead><tr style={{ borderBottom:`2px solid ${C.border}` }}>
                  {["Drug Name","Category","In Stock","Unit","Reorder Lvl","Expiry","Status","Actions"].map(h=>(
                    <th key={h} style={{ textAlign:"left", padding:"8px 10px", fontSize:11, color:C.textLight, fontWeight:700, textTransform:"uppercase", whiteSpace:"nowrap" }}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {inventory.map(d=>(
                    <tr key={d.id} style={{ borderBottom:`1px solid ${C.border}`, background:d.quantityInStock===0?"rgba(239,68,68,0.04)":d.quantityInStock<=d.reorderLevel?"rgba(245,158,11,0.04)":"transparent" }}>
                      <td style={{ padding:"10px 10px" }}>
                        <div style={{ fontWeight:600 }}>{d.name}</div>
                        {d.generic&&d.generic!==d.name && <div style={{ fontSize:11, color:C.textLight }}>{d.generic}</div>}
                        {d.supplier && <div style={{ fontSize:10, color:C.textLight }}>📦 {d.supplier}</div>}
                      </td>
                      <td style={{ padding:"10px 10px" }}><Badge label={d.category} color={C.accent}/></td>
                      <td style={{ padding:"10px 10px", fontWeight:700, fontSize:16, color:statusColor(d) }}>{d.quantityInStock}</td>
                      <td style={{ padding:"10px 10px", color:C.textMid }}>{d.unit}</td>
                      <td style={{ padding:"10px 10px", color:C.textMid }}>{d.reorderLevel}</td>
                      <td style={{ padding:"10px 10px", fontFamily:"'IBM Plex Mono',monospace", fontSize:11, color:d.expiryDate&&d.expiryDate<today()?C.red:C.textMid }}>{d.expiryDate||"—"}</td>
                      <td style={{ padding:"10px 10px" }}><Badge label={statusLabel(d)} color={statusColor(d)}/></td>
                      <td style={{ padding:"10px 10px" }}>
                        <div style={{ display:"flex", gap:5 }}>
                          <Btn small color={C.green} onClick={()=>{ setModalDrug({drug:d,mode:"in"}); setStockQty(""); setStockReason(""); setErr(""); }}><TrendingUp size={11}/> In</Btn>
                          <Btn small outline color={C.amber} disabled={d.quantityInStock===0} onClick={()=>{ setModalDrug({drug:d,mode:"out"}); setStockQty(""); setStockReason(""); setErr(""); }}><TrendingDown size={11}/> Out</Btn>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Stock history */}
      {view==="movements" && (
        <Card title="Stock Movement History">
          {movements.length===0 ? <EmptyState icon="📋" message="No movements recorded"/> : (
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
              <thead><tr style={{ borderBottom:`2px solid ${C.border}` }}>
                {["Date","Drug","Type","Qty","Reason","By"].map(h=><th key={h} style={{ textAlign:"left", padding:"7px 8px", fontSize:11, color:C.textLight, fontWeight:700, textTransform:"uppercase" }}>{h}</th>)}
              </tr></thead>
              <tbody>
                {movements.map(m=>(
                  <tr key={m.id} style={{ borderBottom:`1px solid ${C.border}` }}>
                    <td style={{ padding:"8px", fontFamily:"'IBM Plex Mono',monospace", fontSize:11, color:C.textLight }}>{m.timestamp}</td>
                    <td style={{ padding:"8px", fontWeight:600 }}>{m.drugName}</td>
                    <td style={{ padding:"8px" }}><Badge label={m.type==="in"?"STOCK IN":"DISPENSED"} color={m.type==="in"?C.green:C.amber}/></td>
                    <td style={{ padding:"8px", fontWeight:700, color:m.type==="in"?C.green:C.amber }}>{m.type==="in"?"+":"-"}{m.quantity}</td>
                    <td style={{ padding:"8px", color:C.textMid }}>{m.reason}</td>
                    <td style={{ padding:"8px", color:C.textMid }}>{m.performedBy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}

      {/* Stock in/out modal */}
      {modalDrug && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:999 }}>
          <div style={{ background:C.card, borderRadius:14, padding:28, width:380, border:`2px solid ${modalDrug.mode==="in"?C.green:C.amber}` }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18 }}>
              <h3 style={{ margin:0, color:modalDrug.mode==="in"?C.green:C.amber, fontSize:16 }}>
                {modalDrug.mode==="in"?"📥 Stock In":"📤 Dispense"}: {modalDrug.drug.name}
              </h3>
              <button onClick={()=>setModalDrug(null)} style={{ background:"none", border:"none", cursor:"pointer" }}><X size={18}/></button>
            </div>
            <div style={{ fontSize:13, color:C.textMid, marginBottom:14 }}>
              Current stock: <b style={{color:C.text}}>{modalDrug.drug.quantityInStock} {modalDrug.drug.unit}</b>
              {modalDrug.mode==="out" && ` · Max dispense: ${modalDrug.drug.quantityInStock}`}
            </div>
            <ErrBanner err={err}/>
            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              <Input label={`Quantity (${modalDrug.drug.unit})`} value={stockQty} onChange={setStockQty} type="number" placeholder="Enter quantity"/>
              <Input label="Reason (optional)" value={stockReason} onChange={setStockReason} placeholder={modalDrug.mode==="in"?"e.g. Monthly delivery":"e.g. Dispensed to patient"}/>
              <div style={{ display:"flex", gap:10, marginTop:6 }}>
                <Btn color={modalDrug.mode==="in"?C.green:C.amber} onClick={handleStockAction}>{modalDrug.mode==="in"?"Confirm Stock In":"Confirm Dispense"}</Btn>
                <Btn outline onClick={()=>setModalDrug(null)}>Cancel</Btn>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AddDrugForm({ onSave, onCancel }) {
  const blank = { id:`DRG${Date.now()}`, name:"", generic:"", category:"", unit:"Tablets", quantityInStock:"", reorderLevel:"20", unitCost:"", supplier:"", expiryDate:"" };
  const [form, setForm] = useState(blank);
  const [err, setErr] = useState("");
  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  const handleSave = async () => {
    if (!form.name||!form.unit||form.quantityInStock==="") { setErr("Name, unit and quantity are required."); return; }
    await onSave({ ...form, quantityInStock:parseInt(form.quantityInStock)||0, reorderLevel:parseInt(form.reorderLevel)||20, unitCost:parseInt(form.unitCost)||0 });
  };

  return (
    <Card title="Add New Drug" style={{ marginBottom:16 }}>
      <ErrBanner err={err}/>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
        <Input label="Drug Name" value={form.name} onChange={v=>set("name",v)} required placeholder="Full drug name"/>
        <Input label="Generic Name" value={form.generic} onChange={v=>set("generic",v)} placeholder="Generic/INN name"/>
        <Select label="Category" value={form.category} onChange={v=>set("category",v)} options={DRUG_CATEGORIES}/>
        <Select label="Unit" value={form.unit} onChange={v=>set("unit",v)} options={["Tablets","Capsules","Sachets","Vials","Ampoules","Bottles","Tubes","Boxes","Packs"]}/>
        <Input label="Opening Stock" value={form.quantityInStock} onChange={v=>set("quantityInStock",v)} type="number" required placeholder="Current quantity"/>
        <Input label="Reorder Level" value={form.reorderLevel} onChange={v=>set("reorderLevel",v)} type="number" placeholder="Minimum before reorder alert"/>
        <Input label="Unit Cost (UGX)" value={form.unitCost} onChange={v=>set("unitCost",v)} type="number" placeholder="Cost per unit"/>
        <Input label="Supplier" value={form.supplier} onChange={v=>set("supplier",v)} placeholder="e.g. NMSF"/>
        <Input label="Expiry Date" value={form.expiryDate} onChange={v=>set("expiryDate",v)} type="date"/>
      </div>
      <div style={{ marginTop:16, display:"flex", gap:10 }}>
        <Btn onClick={handleSave} color={C.green}><Package size={13}/> Add to Inventory</Btn>
        <Btn outline onClick={onCancel}>Cancel</Btn>
      </div>
    </Card>
  );
}
