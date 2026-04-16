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
app.use(express.json({ limit: "50kb" }));
app.use((req, _res, next) => { console.log(`${new Date().toISOString()} ${req.method} ${req.path}`); next(); });

const loginLimiter = rateLimit({ windowMs: 15*60*1000, max: 10, message: { error: "Too many login attempts. Wait 15 minutes." } });
const apiLimiter   = rateLimit({ windowMs: 60*1000, max: 300, message: { error: "Too many requests." } });

// ── Collections ───────────────────────────────────────────────────────────────
const db = {
  patients:     new Collection("patients",     []),
  queue:        new Collection("queue",        []),
  accounts:     new Collection("accounts",     []),
  labOrders:    new Collection("lab_orders",   []),
  transactions: new Collection("transactions", []),
  appointments: new Collection("appointments", []),
  audit:        new Collection("audit",        []),
};

const nowStr   = () => new Date().toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" });
const todayStr = () => new Date().toISOString().slice(0, 10);
const ok       = (res, data, status=200) => res.status(status).json(data);
const fail     = (res, msg,  status=400) => res.status(status).json({ error: msg });
const stripPw  = ({ password:_, ...a }) => a;

function requireFields(obj, fields) {
  for (const f of fields) if (!obj[f] && obj[f] !== 0) return `"${f}" is required`;
  return null;
}

function audit(user, action, detail={}) {
  db.audit.insert({ id:`AUD${Date.now()}`, timestamp:new Date().toISOString(), user: user ? `${user.username} (${user.role})` : "anonymous", action, detail });
}

// ── Auth middleware ───────────────────────────────────────────────────────────
function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return fail(res, "Unauthorized", 401);
  try { req.user = jwt.verify(header.slice(7), JWT_SECRET); next(); }
  catch { fail(res, "Invalid or expired token.", 401); }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) return fail(res, `Access denied. Required: ${roles.join(" or ")}`, 403);
    next();
  };
}

// ── Auth ──────────────────────────────────────────────────────────────────────
app.post("/api/auth/login", loginLimiter, async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return fail(res, "Username and password are required.");
  const account = db.accounts.findOne(a => a.username === username && a.active);
  if (!account) { audit(null, "LOGIN_FAIL", { username }); return fail(res, "Invalid credentials or account inactive.", 401); }
  const match = await bcrypt.compare(password, account.password);
  if (!match)  { audit(null, "LOGIN_FAIL", { username }); return fail(res, "Invalid credentials or account inactive.", 401); }
  const safeUser = stripPw(account);
  const token = jwt.sign(safeUser, JWT_SECRET, { expiresIn:"8h" });
  audit(safeUser, "LOGIN_SUCCESS");
  ok(res, { token, user: safeUser });
});

app.use("/api", apiLimiter);

// ── Patients ──────────────────────────────────────────────────────────────────
app.get("/api/patients", requireAuth, (_req, res) => ok(res, db.patients.all()));

app.post("/api/patients", requireAuth, requireRole("receptionist","admin"), (req, res) => {
  const e = requireFields(req.body, ["id","name","category","gender"]);
  if (e) return fail(res, e);
  const patient = { pendingVitals:null, visits:[], ...req.body };
  db.patients.insert(patient);
  audit(req.user, "PATIENT_REGISTER", { id:patient.id, name:patient.name });
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
  audit(req.user, "PATIENT_UPDATE", { id:req.params.id });
  ok(res, updated);
});

// ── Queue ─────────────────────────────────────────────────────────────────────
app.get("/api/queue", requireAuth, (_req, res) => ok(res, db.queue.all()));

app.post("/api/queue", requireAuth, requireRole("receptionist","nurse","doctor","admin"), (req, res) => {
  const e = requireFields(req.body, ["patientId","name","stage"]);
  if (e) return fail(res, e);
  const entry = { priority:"normal", timestamp:nowStr(), assignedTo:"", ...req.body };
  db.queue.insert(entry);
  ok(res, entry, 201);
});

app.patch("/api/queue/:patientId", requireAuth, requireRole("receptionist","nurse","doctor","admin"), (req, res) => {
  const updated = db.queue.update(e => e.patientId === req.params.patientId, e => ({ ...e, ...req.body }));
  if (!updated) return fail(res, "Queue entry not found.", 404);
  ok(res, updated);
});

app.post("/api/queue/:patientId/bump", requireAuth, requireRole("receptionist","nurse","doctor","admin"), (req, res) => {
  const all = db.queue.all();
  const idx = all.findIndex(e => e.patientId === req.params.patientId);
  if (idx <= 0) return ok(res, all);
  [all[idx-1], all[idx]] = [all[idx], all[idx-1]];
  all.forEach(entry => db.queue.update(e => e.patientId === entry.patientId, () => entry));
  ok(res, db.queue.all());
});

// ── Lab Orders ────────────────────────────────────────────────────────────────
app.get("/api/lab-orders", requireAuth, requireRole("lab","doctor","dentist","director","admin"), (_req, res) => ok(res, db.labOrders.all()));

app.post("/api/lab-orders", requireAuth, requireRole("doctor","dentist","admin"), (req, res) => {
  const e = requireFields(req.body, ["id","patientId","test"]);
  if (e) return fail(res, e);
  const order = { status:"pending", result:"", timestamp:nowStr(), ...req.body };
  db.labOrders.insert(order);
  audit(req.user, "LAB_ORDER", { id:order.id, test:order.test });
  ok(res, order, 201);
});

app.patch("/api/lab-orders/:id", requireAuth, requireRole("lab","admin"), (req, res) => {
  const updated = db.labOrders.update(o => o.id === req.params.id, o => ({ ...o, ...req.body }));
  if (!updated) return fail(res, "Lab order not found.", 404);
  audit(req.user, "LAB_RESULT", { id:req.params.id, result:req.body.result });
  ok(res, updated);
});

// ── Transactions ──────────────────────────────────────────────────────────────
app.get("/api/transactions", requireAuth, requireRole("receptionist","accountant","director","admin"), (_req, res) => ok(res, db.transactions.all()));

app.post("/api/transactions", requireAuth, requireRole("receptionist","admin"), (req, res) => {
  const e = requireFields(req.body, ["id","patientId","amount"]);
  if (e) return fail(res, e);
  const txn = { date:todayStr(), timestamp:nowStr(), ...req.body };
  db.transactions.insert(txn);
  audit(req.user, "TRANSACTION", { id:txn.id, amount:txn.amount });
  ok(res, txn, 201);
});

// ── Accounts ──────────────────────────────────────────────────────────────────
app.get("/api/accounts", requireAuth, requireRole("admin","director"), (_req, res) => ok(res, db.accounts.all().map(stripPw)));

app.post("/api/accounts", requireAuth, requireRole("admin"), async (req, res) => {
  const e = requireFields(req.body, ["name","username","password","role"]);
  if (e) return fail(res, e);
  if (db.accounts.findOne(a => a.username === req.body.username)) return fail(res, "Username already taken.", 409);
  const hashed  = await bcrypt.hash(req.body.password, 10);
  const account = { id:`USR${Date.now()}`, ...req.body, password:hashed, active:true };
  db.accounts.insert(account);
  audit(req.user, "ACCOUNT_CREATE", { username:account.username, role:account.role });
  ok(res, stripPw(account), 201);
});

app.patch("/api/accounts/:id/toggle", requireAuth, requireRole("admin"), (req, res) => {
  const updated = db.accounts.update(a => a.id === req.params.id, a => ({ ...a, active:!a.active }));
  if (!updated) return fail(res, "Account not found.", 404);
  audit(req.user, updated.active ? "ACCOUNT_ACTIVATE" : "ACCOUNT_DEACTIVATE", { id:req.params.id });
  ok(res, stripPw(updated));
});

app.patch("/api/accounts/:id/password", requireAuth, async (req, res) => {
  const { newPassword } = req.body || {};
  if (!newPassword || newPassword.length < 4) return fail(res, "Password must be at least 4 characters.");
  if (req.user.id !== req.params.id && req.user.role !== "admin") return fail(res, "Forbidden.", 403);
  const hashed  = await bcrypt.hash(newPassword, 10);
  const updated = db.accounts.update(a => a.id === req.params.id, a => ({ ...a, password:hashed }));
  if (!updated) return fail(res, "Account not found.", 404);
  audit(req.user, "PASSWORD_CHANGE", { target:req.params.id });
  ok(res, { message:"Password updated." });
});

// ── Appointments ──────────────────────────────────────────────────────────────
app.get("/api/appointments", requireAuth, (_req, res) => ok(res, db.appointments.all()));

app.post("/api/appointments", requireAuth, requireRole("receptionist","admin"), (req, res) => {
  const e = requireFields(req.body, ["patientId","date"]);
  if (e) return fail(res, e);
  const appt = { id:`APT${Date.now()}`, status:"scheduled", ...req.body };
  db.appointments.insert(appt);
  ok(res, appt, 201);
});

// ── Audit Log ─────────────────────────────────────────────────────────────────
app.get("/api/audit", requireAuth, requireRole("admin","director"), (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 100, 500);
  ok(res, db.audit.all().slice(-limit).reverse());
});

// ── Health Check ──────────────────────────────────────────────────────────────
app.get("/api/health", (_req, res) => ok(res, {
  status:"ok", timestamp:new Date().toISOString(),
  counts:{
    patients:     db.patients.all().length,
    queue:        db.queue.all().length,
    accounts:     db.accounts.all().length,
    labOrders:    db.labOrders.all().length,
    transactions: db.transactions.all().length,
    appointments: db.appointments.all().length,
  }
}));

app.use((req, res)          => fail(res, `Not found: ${req.method} ${req.path}`, 404));
app.use((e, _req, res, _n) => { console.error("[Error]", e); fail(res, "Internal server error.", 500); });

app.listen(PORT, () => {
  console.log(`\n🏥  HMS Backend running on http://localhost:${PORT}`);
  console.log(`    Health check: http://localhost:${PORT}/api/health\n`);
});
