const BASE = import.meta.env.VITE_API_URL || "http://localhost:3001/api";
let _token = localStorage.getItem("hms_token") || null;

export function setToken(t) { _token=t; t ? localStorage.setItem("hms_token",t) : localStorage.removeItem("hms_token"); }
export const clearToken = () => setToken(null);

function headers() {
  return { "Content-Type":"application/json", ...(_token ? { Authorization:`Bearer ${_token}` } : {}) };
}

async function req(method, path, body) {
  const res = await fetch(`${BASE}${path}`, { method, headers:headers(), ...(body!==undefined?{body:JSON.stringify(body)}:{}) });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

const get   = p     => req("GET",   p);
const post  = (p,b) => req("POST",  p, b);
const patch = (p,b) => req("PATCH", p, b);

export const api = {
  login:           (u,p)    => post("/auth/login",{username:u,password:p}),
  // patients
  getPatients:     ()       => get("/patients"),
  addPatient:      (d)      => post("/patients",d),
  updatePatient:   (id,d)   => patch(`/patients/${id}`,d),
  // queue
  getQueue:        ()       => get("/queue"),
  getQueueArchive: ()       => get("/queue/archive"),
  addToQueue:      (d)      => post("/queue",d),
  updateQueue:     (pid,d)  => patch(`/queue/${pid}`,d),
  bumpQueue:       (pid)    => post(`/queue/${pid}/bump`,{}),
  // lab
  getLabOrders:    ()       => get("/lab-orders"),
  addLabOrder:     (d)      => post("/lab-orders",d),
  updateLabOrder:  (id,d)   => patch(`/lab-orders/${id}`,d),
  // transactions
  getTransactions: ()       => get("/transactions"),
  getTxnSummary:   ()       => get("/transactions/summary"),
  addTransaction:  (d)      => post("/transactions",d),
  // inventory
  getInventory:    ()       => get("/inventory"),
  addDrug:         (d)      => post("/inventory",d),
  updateDrug:      (id,d)   => patch(`/inventory/${id}`,d),
  stockIn:         (id,d)   => post(`/inventory/${id}/stock-in`,d),
  dispense:        (id,d)   => post(`/inventory/${id}/dispense`,d),
  getMovements:    ()       => get("/stock-movements"),
  // accounts
  getAccounts:     ()       => get("/accounts"),
  addAccount:      (d)      => post("/accounts",d),
  toggleAccount:   (id)     => patch(`/accounts/${id}/toggle`,{}),
  changePassword:  (id,pw)  => patch(`/accounts/${id}/password`,{newPassword:pw}),
  // appointments
  getAppointments: ()       => get("/appointments"),
  addAppointment:  (d)      => post("/appointments",d),
  updateAppointment:(id,d)  => patch(`/appointments/${id}`,d),
  // audit
  getAudit:        (n=100)  => get(`/audit?limit=${n}`),
  // health
  health:          ()       => get("/health"),
  // services / pricing
  getServices:     ()       => get("/services"),
  addService:      (d)      => post("/services", d),
  updateService:   (id,d)   => patch(`/services/${id}`, d),
  // bills
  getBills:        ()       => get("/bills"),
  getDebtors:      ()       => get("/bills/debtors"),
  createBill:      (d)      => post("/bills", d),
  payBill:         (id,d)   => post(`/bills/${id}/pay`, d),
  addBillItem:     (id,d)   => post(`/bills/${id}/add-item`, d),
  getPatientBill:  (pid)    => get(`/bills/patient/${pid}`),
  // admissions
  getAdmissions:   ()       => get("/admissions"),
  admit:           (d)      => post("/admissions", d),
  updateAdmission: (id,d)   => patch(`/admissions/${id}`, d),
  addAdmissionNote:(id,n)   => post(`/admissions/${id}/notes`, { note:n }),
  discharge:       (id,d)   => post(`/admissions/${id}/discharge`, d),
};