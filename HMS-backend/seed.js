const bcrypt = require("bcryptjs");
const fs     = require("fs");
const path   = require("path");

const DATA_DIR = path.join(__dirname, "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);

const today = () => new Date().toISOString().slice(0, 10);

async function seed() {
  console.log("Seeding HMS database...\n");

  // ACCOUNTS — passwords are hashed before saving
  const accountsFile = path.join(DATA_DIR, "accounts.json");
  if (!fs.existsSync(accountsFile)) {
    const raw = [
      { id:"USR001", username:"receptionist", password:"1234",  role:"receptionist", name:"Grace Nalwoga",        active:true  },
      { id:"USR002", username:"doctor",        password:"1234",  role:"doctor",        name:"Dr. James Okello",     active:true  },
      { id:"USR003", username:"nurse",         password:"1234",  role:"nurse",         name:"Amina Nabukeera",      active:true  },
      { id:"USR004", username:"lab",           password:"1234",  role:"lab",           name:"Peter Ssemwogerere",  active:true  },
      { id:"USR005", username:"pharmacy",      password:"1234",  role:"pharmacy",      name:"Lydia Nassuna",        active:true  },
      { id:"USR006", username:"dentist",       password:"1234",  role:"dentist",       name:"Dr. Faith Auma",       active:false },
      { id:"USR007", username:"accountant",    password:"1234",  role:"accountant",    name:"Ruth Akello",          active:true  },
      { id:"USR008", username:"director",      password:"1234",  role:"director",      name:"Prof. Simon Muwanga",  active:true  },
      { id:"USR009", username:"admin",         password:"admin", role:"admin",         name:"System Administrator", active:true  },
    ];
    const hashed = await Promise.all(raw.map(async a => ({ ...a, password: await bcrypt.hash(a.password, 10) })));
    fs.writeFileSync(accountsFile, JSON.stringify(hashed, null, 2));
    console.log("✓ accounts.json — 9 users (passwords hashed)");
  } else { console.log("  accounts.json already exists, skipping"); }

  // PATIENTS
  const patientsFile = path.join(DATA_DIR, "patients.json");
  if (!fs.existsSync(patientsFile)) {
    const patients = [
      { id:"HMS26-1001", name:"Alice Namukasa", dob:"2010-03-15", category:"NSVS (Secondary)", gender:"F", phone:"", class:"S3", dorm:"Nile House", employeeId:"", department:"", emergencyContact:"Namukasa Grace: 0701234567", registeredAt:"2025-09-01", pendingVitals:null,
        visits:[
          { id:"V1", date:"2026-03-10", doctor:"Dr. Okello", complaint:"Headache & fever", diagnosis:"Malaria", treatment:"Coartem 6 tabs", notes:"Responded well.", vitals:{bp:"110/70",temp:"38.5°C",weight:"45kg",pulse:"88"}, labOrders:[], labResults:"Malaria RDT: Positive", prescriptions:["Coartem 6 tabs BD x 3 days"], stage:"done" },
          { id:"V2", date:"2026-02-05", doctor:"Dr. Okello", complaint:"Sore throat, cough", diagnosis:"Upper Respiratory Infection", treatment:"Amoxicillin 500mg", notes:"Advised rest and fluids.", vitals:{bp:"108/68",temp:"37.8°C",weight:"44.5kg",pulse:"82"}, labOrders:[], labResults:"", prescriptions:["Amoxicillin 500mg TDS x 5 days"], stage:"done" },
        ]},
      { id:"HMS26-1002", name:"John Kato", dob:"1985-07-22", category:"Staff", gender:"M", phone:"0782345678", class:"", dorm:"", employeeId:"EMP-0042", department:"Mathematics", emergencyContact:"Kato Mary: 0712345678", registeredAt:"2024-01-15", pendingVitals:null,
        visits:[
          { id:"V3", date:"2026-04-01", doctor:"Dr. Okello", complaint:"Routine BP check", diagnosis:"Hypertension - controlled", treatment:"Continue Amlodipine", notes:"BP improving.", vitals:{bp:"145/95",temp:"36.8°C",weight:"82kg",pulse:"78"}, labOrders:[], labResults:"", prescriptions:["Amlodipine 5mg OD - continue"], stage:"done" },
        ]},
      { id:"HMS26-1003", name:"Sarah Opio", dob:"1995-11-30", category:"Outpatient", gender:"F", phone:"0756789012", class:"", dorm:"", employeeId:"", department:"", emergencyContact:"Opio David: 0726789012", registeredAt:"2026-04-14", pendingVitals:null, visits:[] },
    ];
    fs.writeFileSync(patientsFile, JSON.stringify(patients, null, 2));
    console.log("✓ patients.json — 3 patients");
  } else { console.log("  patients.json already exists, skipping"); }

  // QUEUE
  const queueFile = path.join(DATA_DIR, "queue.json");
  if (!fs.existsSync(queueFile)) {
    const queue = [
      { patientId:"HMS26-1001", name:"Alice Namukasa", stage:"doctor",    priority:"normal", timestamp:"09:15", complaint:"Headache and fever", assignedTo:"" },
      { patientId:"HMS26-1002", name:"John Kato",      stage:"nurse",     priority:"normal", timestamp:"09:42", complaint:"Routine BP check",   assignedTo:"" },
      { patientId:"HMS26-1003", name:"Sarah Opio",     stage:"reception", priority:"normal", timestamp:"10:05", complaint:"Abdominal pain",     assignedTo:"" },
    ];
    fs.writeFileSync(queueFile, JSON.stringify(queue, null, 2));
    console.log("✓ queue.json — 3 entries");
  } else { console.log("  queue.json already exists, skipping"); }

  // LAB ORDERS
  const labFile = path.join(DATA_DIR, "lab_orders.json");
  if (!fs.existsSync(labFile)) {
    fs.writeFileSync(labFile, JSON.stringify([
      { id:"LAB001", patientId:"HMS26-1001", patientName:"Alice Namukasa", test:"Malaria RDT", requestedBy:"Dr. Okello", status:"pending", timestamp:"09:30", result:"" },
    ], null, 2));
    console.log("✓ lab_orders.json — 1 entry");
  } else { console.log("  lab_orders.json already exists, skipping"); }

  // TRANSACTIONS
  const txnFile = path.join(DATA_DIR, "transactions.json");
  if (!fs.existsSync(txnFile)) {
    fs.writeFileSync(txnFile, JSON.stringify([
      { id:"TXN-20260414-001", patientId:"HMS26-1003", patientName:"Sarah Opio", services:["Consultation - 30,000"], amount:30000, method:"Cash", cashier:"Grace Nalwoga", timestamp:"10:10", date: today() },
    ], null, 2));
    console.log("✓ transactions.json — 1 entry");
  } else { console.log("  transactions.json already exists, skipping"); }

  // APPOINTMENTS
  const apptFile = path.join(DATA_DIR, "appointments.json");
  if (!fs.existsSync(apptFile)) {
    fs.writeFileSync(apptFile, JSON.stringify([
      { id:"APT001", patientId:"HMS26-1002", patientName:"John Kato", date:"2026-04-28", time:"09:00", doctor:"Dr. Okello", reason:"BP Review", status:"scheduled" },
    ], null, 2));
    console.log("✓ appointments.json — 1 entry");
  } else { console.log("  appointments.json already exists, skipping"); }

  // AUDIT LOG (empty to start)
  const auditFile = path.join(DATA_DIR, "audit.json");
  if (!fs.existsSync(auditFile)) {
    fs.writeFileSync(auditFile, JSON.stringify([], null, 2));
    console.log("✓ audit.json — empty log");
  } else { console.log("  audit.json already exists, skipping"); }

  console.log("\n✅ Seeding complete! Now run:  node server.js\n");
}

seed().catch(console.error);
