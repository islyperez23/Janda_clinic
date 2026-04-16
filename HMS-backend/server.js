require("dotenv").config();
const express   = require("express");
const cors      = require("cors");
const helmet    = require("helmet");
const rateLimit = require("express-rate-limit");
const jwt       = require("jsonwebtoken");
const bcrypt    = require("bcryptjs");
const { Collection } = require("./db");

const app  = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || "hms-dev-secret-change-in-production";

app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_ORIGIN || "*" }));
app.use(express.json({ limit: "100kb" }));
app.use((req, _res, next) => { process.stdout.write(`${new Date().toISOString()} ${req.method.padEnd(6)} ${req.path}\n`); next(); });

const loginLimiter = rateLimit({ windowMs:15*60*1000, max:10, message:{ error:"Too many login attempts. Wait 15 min." } });
const apiLimiter   = rateLimit({ windowMs:60*1000,    max:300, message:{ error:"Too many requests." } });

const db = {
  patients:       new Collection("patients",       []),
  queue:          new Collection("queue",          []),
  queue_archive:  new Collection("queue_archive",  []),
  accounts:       new Collection("accounts",       []),
  labOrders:      new Collection("lab_orders",     []),
  transactions:   new Collection("transactions",   []),
  appointments:   new Collection("appointments",   []),
  inventory:      new Collection("inventory",      []),
  stockMovements: new Collection("stock_movements",[]),
  audit:          new Collection("audit",          []),
};

const nowStr   = () => new Date().toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" });
const todayStr = () => new Date().toISOString().slice(0, 10);
const ok   = (res, data, status=200) => res.status(status).json(data);
const fail = (res, msg,  status=400) => res.status(status).json({ error: msg });
const stripPw = ({ password:_, ...a }) => a;

function requireFields(obj, fields) {
  for (const f of fields) if (obj[f] === undefined || obj[f] === null || obj[f] === "") return `"${f}" is required`;
  return null;
}

function audit(user, action, detail={}) {
  db.audit.insert({ id:`AUD${Date.now()}${Math.random().toString(36).slice(2,5)}`, timestamp:new Date().toISOString(), user:user?`${user.username} (${user.role})`:"anonymous", action, detail });
}

function requireAuth(req, res, next) {
  const h = req.headers.authorization;
  if (!h?.startsWith("Bearer ")) return fail(res, "Unauthorized", 401);
  try { req.user = jwt.verify(h.slice(7), JWT_SECRET); next(); }
  catch { fail(res, "Token invalid or expired.", 401); }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) return fail(res, `Access denied. Requires: ${roles.join(" or ")}`, 403);
    next();
  };
}

// ── AUTH ──────────────────────────────────────────────────────────────────────
app.post("/api/auth/login", loginLimiter, async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return fail(res, "Username and password required.");
  const account = db.accounts.findOne(a => a.username === username && a.active);
  if (!account) { audit(null,"LOGIN_FAIL",{username}); return fail(res,"Invalid credentials or inactive account.",401); }
  const match = await bcrypt.compare(password, account.password);
  if (!match) { audit(null,"LOGIN_FAIL",{username}); return fail(res,"Invalid credentials or inactive account.",401); }
  const safeUser = stripPw(account);
  const token = jwt.sign(safeUser, JWT_SECRET, { expiresIn:"8h" });
  audit(safeUser,"LOGIN_SUCCESS");
  ok(res, { token, user:safeUser });
});

app.use("/api", apiLimiter);

// ── PATIENTS ──────────────────────────────────────────────────────────────────
app.get("/api/patients", requireAuth, (_req, res) => ok(res, db.patients.all()));

app.post("/api/patients", requireAuth, requireRole("receptionist","admin"), (req, res) => {
  const e = requireFields(req.body, ["id","name","category","gender"]);
  if (e) return fail(res, e);
  const patient = { pendingVitals:null, visits:[], ...req.body };
  db.patients.insert(patient);
  audit(req.user,"PATIENT_REGISTER",{id:patient.id,name:patient.name});
  ok(res, patient, 201);
});

app.patch("/api/patients/:id", requireAuth, requireRole("nurse","doctor","dentist","admin"), (req, res) => {
  const { addVisit, clearPendingVitals, ...fields } = req.body;
  const updated = db.patients.update(p => p.id === req.params.id, p => {
    if (addVisit)            p = { ...p, visits:[...p.visits, addVisit] };
    if (clearPendingVitals)  p = { ...p, pendingVitals:null };
    if (Object.keys(fields).length) p = { ...p, ...fields };
    return p;
  });
  if (!updated) return fail(res, "Patient not found.", 404);
  audit(req.user,"PATIENT_UPDATE",{id:req.params.id});
  ok(res, updated);
});

// ── QUEUE ─────────────────────────────────────────────────────────────────────
// Only return active (non-done) queue entries
app.get("/api/queue", requireAuth, (_req, res) => ok(res, db.queue.all().filter(e => e.stage !== "done")));
app.get("/api/queue/archive", requireAuth, (_req, res) => {
  const today = todayStr();
  ok(res, db.queue_archive.find(e => e.completedDate === today));
});

app.post("/api/queue", requireAuth, requireRole("receptionist","nurse","doctor","lab","pharmacy","dentist","admin"), (req, res) => {
  const e = requireFields(req.body, ["patientId","name","stage"]);
  if (e) return fail(res, e);
  // Remove any existing entry for this patient first
  db.queue.remove(e => e.patientId === req.body.patientId);
  const entry = { priority:"normal", timestamp:nowStr(), assignedTo:"", ...req.body };
  db.queue.insert(entry);
  ok(res, entry, 201);
});

app.patch("/api/queue/:patientId", requireAuth, requireRole("receptionist","nurse","doctor","lab","pharmacy","dentist","admin"), (req, res) => {
  const { stage } = req.body;
  if (stage === "done") {
    // Move to archive instead of keeping in queue
    const entry = db.queue.findOne(e => e.patientId === req.params.patientId);
    if (entry) {
      db.queue.remove(e => e.patientId === req.params.patientId);
      db.queue_archive.insert({ ...entry, stage:"done", completedAt:nowStr(), completedDate:todayStr() });
    }
    ok(res, { archived:true });
  } else {
    const updated = db.queue.update(e => e.patientId === req.params.patientId, e => ({ ...e, ...req.body }));
    if (!updated) return fail(res, "Queue entry not found.", 404);
    ok(res, updated);
  }
});

app.post("/api/queue/:patientId/bump", requireAuth, requireRole("receptionist","nurse","doctor","lab","pharmacy","dentist","admin"), (req, res) => {
  const all = db.queue.all();
  const idx = all.findIndex(e => e.patientId === req.params.patientId);
  if (idx <= 0) return ok(res, all);
  [all[idx-1], all[idx]] = [all[idx], all[idx-1]];
  all.forEach(entry => db.queue.update(e => e.patientId === entry.patientId, () => entry));
  ok(res, db.queue.all());
});

// ── LAB ORDERS ────────────────────────────────────────────────────────────────
app.get("/api/lab-orders", requireAuth, requireRole("lab","doctor","dentist","director","admin"), (_req, res) => ok(res, db.labOrders.all()));

app.post("/api/lab-orders", requireAuth, requireRole("doctor","dentist","admin"), (req, res) => {
  const e = requireFields(req.body, ["id","patientId","test"]);
  if (e) return fail(res, e);
  const order = { status:"pending", result:"", timestamp:nowStr(), ...req.body };
  db.labOrders.insert(order);
  audit(req.user,"LAB_ORDER",{test:order.test,patient:order.patientName});
  ok(res, order, 201);
});

app.patch("/api/lab-orders/:id", requireAuth, requireRole("lab","admin"), (req, res) => {
  const updated = db.labOrders.update(o => o.id === req.params.id, o => ({ ...o, ...req.body }));
  if (!updated) return fail(res, "Lab order not found.", 404);
  audit(req.user,"LAB_RESULT",{id:req.params.id});
  ok(res, updated);
});

// ── TRANSACTIONS ──────────────────────────────────────────────────────────────
app.get("/api/transactions", requireAuth, requireRole("receptionist","accountant","director","admin"), (_req, res) => ok(res, db.transactions.all()));

app.get("/api/transactions/summary", requireAuth, requireRole("receptionist","accountant","director","admin"), (_req, res) => {
  const all = db.transactions.all();
  const today = todayStr();
  // Last 7 days
  const days = [];
  for (let i=6; i>=0; i--) {
    const d = new Date(); d.setDate(d.getDate()-i);
    const dateStr = d.toISOString().slice(0,10);
    const dayTxns = all.filter(t => t.date === dateStr);
    days.push({ date:dateStr, label:d.toLocaleDateString("en-UG",{weekday:"short"}), total:dayTxns.reduce((s,t)=>s+t.amount,0), count:dayTxns.length });
  }
  const todayTxns = all.filter(t => t.date === today);
  const methods = {};
  todayTxns.forEach(t => { methods[t.method] = (methods[t.method]||0) + t.amount; });
  ok(res, { days, todayTotal:todayTxns.reduce((s,t)=>s+t.amount,0), todayCount:todayTxns.length, methodBreakdown:methods });
});

app.post("/api/transactions", requireAuth, requireRole("receptionist","admin"), (req, res) => {
  const e = requireFields(req.body, ["id","patientId","amount"]);
  if (e) return fail(res, e);
  const txn = { date:todayStr(), timestamp:nowStr(), ...req.body };
  db.transactions.insert(txn);
  audit(req.user,"TRANSACTION",{id:txn.id,amount:txn.amount,patient:txn.patientName});
  ok(res, txn, 201);
});

// ── INVENTORY ─────────────────────────────────────────────────────────────────
app.get("/api/inventory", requireAuth, (_req, res) => ok(res, db.inventory.all()));

app.post("/api/inventory", requireAuth, requireRole("pharmacy","admin"), (req, res) => {
  const e = requireFields(req.body, ["id","name","unit","quantityInStock"]);
  if (e) return fail(res, e);
  const drug = { generic:"", category:"General", reorderLevel:20, unitCost:0, supplier:"", expiryDate:"", lastUpdated:todayStr(), ...req.body };
  db.inventory.insert(drug);
  audit(req.user,"DRUG_ADD",{name:drug.name});
  ok(res, drug, 201);
});

app.patch("/api/inventory/:id", requireAuth, requireRole("pharmacy","admin"), (req, res) => {
  const updated = db.inventory.update(d => d.id === req.params.id, d => ({ ...d, ...req.body, lastUpdated:todayStr() }));
  if (!updated) return fail(res, "Drug not found.", 404);
  ok(res, updated);
});

app.post("/api/inventory/:id/stock-in", requireAuth, requireRole("pharmacy","admin"), (req, res) => {
  const { quantity, reason } = req.body;
  if (!quantity || quantity <= 0) return fail(res, "Quantity must be positive.");
  const updated = db.inventory.update(d => d.id === req.params.id, d => ({ ...d, quantityInStock: d.quantityInStock + quantity, lastUpdated:todayStr() }));
  if (!updated) return fail(res, "Drug not found.", 404);
  db.stockMovements.insert({ id:`SM${Date.now()}`, drugId:req.params.id, drugName:updated.name, type:"in", quantity, reason:reason||"Stock replenishment", performedBy:req.user.name, timestamp:todayStr() });
  audit(req.user,"STOCK_IN",{drug:updated.name,quantity});
  ok(res, updated);
});

app.post("/api/inventory/:id/dispense", requireAuth, requireRole("pharmacy","admin"), (req, res) => {
  const { quantity, reason } = req.body;
  if (!quantity || quantity <= 0) return fail(res, "Quantity must be positive.");
  const drug = db.inventory.findOne(d => d.id === req.params.id);
  if (!drug) return fail(res, "Drug not found.", 404);
  if (drug.quantityInStock < quantity) return fail(res, `Insufficient stock. Only ${drug.quantityInStock} ${drug.unit} available.`, 409);
  const updated = db.inventory.update(d => d.id === req.params.id, d => ({ ...d, quantityInStock: d.quantityInStock - quantity, lastUpdated:todayStr() }));
  db.stockMovements.insert({ id:`SM${Date.now()}`, drugId:req.params.id, drugName:updated.name, type:"out", quantity, reason:reason||"Dispensed to patient", performedBy:req.user.name, timestamp:todayStr() });
  audit(req.user,"STOCK_OUT",{drug:updated.name,quantity});
  ok(res, updated);
});

app.get("/api/stock-movements", requireAuth, requireRole("pharmacy","director","admin"), (_req, res) => ok(res, db.stockMovements.all().slice(-100).reverse()));

// ── ACCOUNTS ──────────────────────────────────────────────────────────────────
app.get("/api/accounts", requireAuth, requireRole("admin","director"), (_req, res) => ok(res, db.accounts.all().map(stripPw)));

app.post("/api/accounts", requireAuth, requireRole("admin"), async (req, res) => {
  const e = requireFields(req.body, ["name","username","password","role"]);
  if (e) return fail(res, e);
  if (db.accounts.findOne(a => a.username === req.body.username)) return fail(res, "Username already taken.", 409);
  const hashed = await bcrypt.hash(req.body.password, 10);
  const account = { id:`USR${Date.now()}`, ...req.body, password:hashed, active:true };
  db.accounts.insert(account);
  audit(req.user,"ACCOUNT_CREATE",{username:account.username,role:account.role});
  ok(res, stripPw(account), 201);
});

app.patch("/api/accounts/:id/toggle", requireAuth, requireRole("admin"), (req, res) => {
  const updated = db.accounts.update(a => a.id === req.params.id, a => ({ ...a, active:!a.active }));
  if (!updated) return fail(res, "Account not found.", 404);
  audit(req.user, updated.active?"ACCOUNT_ACTIVATE":"ACCOUNT_DEACTIVATE", {id:req.params.id});
  ok(res, stripPw(updated));
});

app.patch("/api/accounts/:id/password", requireAuth, async (req, res) => {
  const { newPassword } = req.body || {};
  if (!newPassword || newPassword.length < 4) return fail(res, "Password must be at least 4 characters.");
  if (req.user.id !== req.params.id && req.user.role !== "admin") return fail(res, "Forbidden.", 403);
  const hashed = await bcrypt.hash(newPassword, 10);
  const updated = db.accounts.update(a => a.id === req.params.id, a => ({ ...a, password:hashed }));
  if (!updated) return fail(res, "Account not found.", 404);
  audit(req.user,"PASSWORD_CHANGE",{target:req.params.id});
  ok(res, { message:"Password updated." });
});

// ── APPOINTMENTS ──────────────────────────────────────────────────────────────
app.get("/api/appointments", requireAuth, (_req, res) => ok(res, db.appointments.all()));

app.post("/api/appointments", requireAuth, requireRole("receptionist","admin"), (req, res) => {
  const e = requireFields(req.body, ["patientId","date"]);
  if (e) return fail(res, e);
  const appt = { id:`APT${Date.now()}`, status:"scheduled", ...req.body };
  db.appointments.insert(appt);
  ok(res, appt, 201);
});

app.patch("/api/appointments/:id", requireAuth, requireRole("receptionist","admin"), (req, res) => {
  const updated = db.appointments.update(a => a.id === req.params.id, a => ({ ...a, ...req.body }));
  if (!updated) return fail(res, "Appointment not found.", 404);
  ok(res, updated);
});

// ── AUDIT ─────────────────────────────────────────────────────────────────────
app.get("/api/audit", requireAuth, requireRole("admin","director"), (req, res) => {
  const limit = Math.min(parseInt(req.query.limit)||100, 500);
  ok(res, db.audit.all().slice(-limit).reverse());
});

// ── HEALTH ────────────────────────────────────────────────────────────────────
app.get("/api/health", (_req, res) => ok(res, {
  status:"ok", timestamp:new Date().toISOString(),
  counts:{ patients:db.patients.all().length, queue:db.queue.all().filter(e=>e.stage!=="done").length, accounts:db.accounts.all().length, labOrders:db.labOrders.all().length, transactions:db.transactions.all().length, inventory:db.inventory.all().length }
}));

app.use((req, res) => fail(res, `Not found: ${req.method} ${req.path}`, 404));
app.use((e, _req, res, _n) => { console.error("[Error]", e.message); fail(res, "Internal server error.", 500); });

app.listen(PORT, () => {
  console.log(`\n🏥  HMS Backend  →  http://localhost:${PORT}`);
  console.log(`    Health       →  http://localhost:${PORT}/api/health\n`);
});