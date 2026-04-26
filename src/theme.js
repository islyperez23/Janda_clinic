export const C = {
  navy:"#0b1120", sidebarBg:"#0f172a", sidebarBorder:"#1e2d45",
  accent:"#22d3ee", accentDim:"#0e7490", accentGlow:"rgba(34,211,238,0.15)",
  green:"#10b981", greenDim:"#065f46", greenLight:"rgba(16,185,129,0.15)",
  amber:"#f59e0b", amberLight:"rgba(245,158,11,0.15)",
  red:"#ef4444", redLight:"rgba(239,68,68,0.15)",
  purple:"#a78bfa", purpleLight:"rgba(167,139,250,0.15)",
  pink:"#f472b6", pinkLight:"rgba(244,114,182,0.15)",
  blue:"#60a5fa", blueLight:"rgba(96,165,250,0.15)",
  bg:"#f0f4f8", card:"#ffffff",
  text:"#1e293b", textMid:"#475569", textLight:"#94a3b8", border:"#e2e8f0",
};

export const ROLES = {
  receptionist:{ label:"Receptionist",  color:C.accent,    icon:"🏥" },
  doctor:      { label:"Doctor",        color:C.green,     icon:"👨‍⚕️" },
  nurse:       { label:"Nurse",         color:C.purple,    icon:"👩‍⚕️" },
  incharge:    { label:"In-Charge",     color:"#06b6d4",   icon:"🩺" },
  store:       { label:"Store",         color:"#ea580c",   icon:"📦" },
  lab:         { label:"Laboratory",    color:C.amber,     icon:"🔬" },
  pharmacy:    { label:"Pharmacy",      color:C.pink,      icon:"💊" },
  dentist:     { label:"Dentist",       color:C.blue,      icon:"🦷" },
  accountant:  { label:"Accountant",    color:C.amber,     icon:"💼" },
  director:    { label:"Director",      color:C.green,     icon:"📊" },
  admin:       { label:"System Admin",  color:C.textLight, icon:"⚙️" },
};

export const CATEGORIES = ["NSVS (Secondary)","Samaritan (Primary)","Staff","Outpatient"];
export const DRUG_CATEGORIES = ["Antimalarial","Antibiotic","Analgesic","Antihypertensive","Rehydration","Anti-inflammatory","Antifungal","Antiviral","Vitamin/Supplement","Consumable","Other"];

export const STAGE_LABELS = { reception:"Reception", nurse:"Nurse (Vitals)", doctor:"Doctor", lab:"Laboratory", pharmacy:"Pharmacy", dentist:"Dentist", payment:"Awaiting Payment", done:"Completed" };
export const STAGE_COLOR  = { reception:C.textMid, nurse:C.purple, doctor:C.green, lab:C.amber, pharmacy:C.pink, dentist:C.blue, payment:C.green, done:C.textLight };
export const STAGE_ORDER  = ["reception","nurse","doctor","lab","pharmacy","dentist","done"];

export const now   = () => new Date().toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" });
export const today = () => new Date().toISOString().slice(0, 10);

export const genId  = (prefix) => `${prefix}${new Date().getFullYear().toString().slice(-2)}-${Math.floor(1000+Math.random()*9000)}`;
export const genTxn = () => `TXN-${today().replace(/-/g,"")}-${Math.floor(100+Math.random()*900)}`;
export const genLab = () => `LAB${Date.now()}`;

export function printReceipt(txn) {
  const win = window.open("","_blank","width=420,height=600");
  win.document.write(`<!DOCTYPE html><html><head><title>Receipt</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}body{font-family:'Courier New',monospace;font-size:13px;padding:20px;color:#000}
    .center{text-align:center}.logo{font-size:28px}.title{font-size:18px;font-weight:bold;margin:4px 0}
    .subtitle{font-size:11px;color:#666;margin-bottom:12px}
    .divider{border-top:1px dashed #000;margin:10px 0}
    .row{display:flex;justify-content:space-between;margin:3px 0}
    .bold{font-weight:bold}.service{margin:2px 0 2px 10px}
    .total{font-size:15px;font-weight:bold;margin:4px 0}
    .footer{text-align:center;font-size:11px;margin-top:12px;color:#555}
    button{display:block;margin:16px auto;padding:8px 24px;font-size:14px;cursor:pointer;background:#0e7490;color:#fff;border:none;border-radius:6px}
    @media print{button{display:none}}
  </style></head><body>
  <div class="center">
    <div class="logo">🏥</div>
    <div class="title">HMS CLINIC</div>
    <div class="subtitle">OFFICIAL RECEIPT</div>
  </div>
  <div class="divider"></div>
  <div class="row"><span>Receipt No:</span><span class="bold">${txn.id}</span></div>
  <div class="row"><span>Date:</span><span>${txn.date} ${txn.timestamp}</span></div>
  <div class="row"><span>Patient:</span><span class="bold">${txn.patientName}</span></div>
  <div class="row"><span>Cashier:</span><span>${txn.cashier}</span></div>
  <div class="divider"></div>
  <div class="bold" style="margin-bottom:4px">Services:</div>
  ${(txn.services||[]).map(s=>`<div class="service">• ${s}</div>`).join("")}
  <div class="divider"></div>
  <div class="row total"><span>TOTAL PAID:</span><span>UGX ${(txn.amount||0).toLocaleString()}</span></div>
  <div class="row"><span>Payment Method:</span><span>${txn.method}</span></div>
  <div class="divider"></div>
  <div class="footer">Thank you for visiting HMS Clinic<br>Get well soon! 💙</div>
  <button onclick="window.print()">🖨 Print Receipt</button>
  </body></html>`);
  win.document.close();
}

export function exportCSV(rows, filename) {
  const headers = ["TXN ID","Patient","Services","Amount (UGX)","Method","Cashier","Date","Time"];
  const data = rows.map(t => [t.id, t.patientName, (t.services||[]).join("; "), t.amount, t.method, t.cashier, t.date, t.timestamp]);
  const csv = [headers,...data].map(r=>r.map(c=>`"${c}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type:"text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href=url; a.download=filename; a.click();
  URL.revokeObjectURL(url);
}