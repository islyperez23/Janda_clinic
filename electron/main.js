const { app, BrowserWindow, dialog, shell, Menu } = require("electron");
const { spawn, execSync, spawnSync } = require("child_process");
const path = require("path");
const http = require("http");
const fs   = require("fs");

app.commandLine.appendSwitch("disable-gpu");
app.commandLine.appendSwitch("no-sandbox");

// ── Find node executable ───────────────────────────────────────────────────────
function findNode() {
  const candidates = [
    "/home/josh/.nvm/versions/node/v24.14.1/bin/node",
    "/usr/bin/node",
    "/usr/local/bin/node",
    "/usr/bin/nodejs",
    "/usr/local/bin/nodejs",
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  try {
    const r = spawnSync("which", ["node"], { encoding:"utf8" });
    if (r.stdout?.trim()) return r.stdout.trim();
  } catch(_) {}
  return null;
}

// ── Find HMS-backend in multiple possible locations ────────────────────────────
function findBackend() {
  const candidates = [
    // 1. Packaged: copied into resources/
    path.join(process.resourcesPath || "", "HMS-backend"),
    // 2. Dev: sibling of the HMS src folder  ~/Desktop/HMS/HMS-backend
    path.join(__dirname, "..", "HMS-backend"),
    // 3. Running from dist/linux-unpacked — go up to project root
    path.join(__dirname, "..", "..", "..", "HMS-backend"),
    // 4. Absolute fallback
    path.join(require("os").homedir(), "Desktop", "HMS", "HMS-backend"),
  ];
  for (const c of candidates) {
    if (fs.existsSync(path.join(c, "server.js"))) {
      console.log("[Electron] Found backend at:", c);
      return c;
    }
  }
  // Log all tried paths for debugging
  console.error("[Electron] Tried these backend paths:");
  candidates.forEach(c => console.error("  -", c));
  return null;
}

const isDev       = !app.isPackaged;
const BACKEND_PATH = findBackend();
const FRONTEND_URL = isDev
  ? "http://localhost:5173"
  : `file://${path.join(__dirname, "..", "dist", "index.html")}`;
const BACKEND_PORT = 3001;

let mainWindow  = null;
let backendProc = null;

// ── Kill anything on port 3001 ────────────────────────────────────────────────
function freePort() {
  try { execSync(`fuser -k ${BACKEND_PORT}/tcp 2>/dev/null || true`); } catch(_) {}
  return new Promise(r => setTimeout(r, 800));
}

// ── Start the Express backend ──────────────────────────────────────────────────
function startBackend() {
  return new Promise((resolve, reject) => {
    if (!BACKEND_PATH) {
      return reject(new Error(
        "Cannot find HMS-backend folder.\n\n" +
        "Expected it at:\n  ~/Desktop/HMS/HMS-backend\n\n" +
        "Make sure the HMS-backend folder exists and contains server.js"
      ));
    }

    const dataDir = path.join(BACKEND_PATH, "data");
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

    const nodeExe = findNode();
    if (!nodeExe) {
      return reject(new Error(
        "Node.js not found.\n\nInstall it with:\n  sudo apt install nodejs"
      ));
    }

    console.log("[Electron] node:", nodeExe);
    console.log("[Electron] backend:", BACKEND_PATH);

    backendProc = spawn(nodeExe, ["server.js"], {
      cwd: BACKEND_PATH,
      env: { ...process.env, PORT: String(BACKEND_PORT) },
      stdio: ["ignore", "pipe", "pipe"],
    });

    backendProc.stdout.on("data", d => console.log("[Backend]", d.toString().trim()));
    backendProc.stderr.on("data", d => console.error("[Backend ERR]", d.toString().trim()));
    backendProc.on("error", err => reject(new Error(`Node spawn failed: ${err.message}`)));

    let attempts = 0;
    const poll = setInterval(() => {
      attempts++;
      const req = http.get(`http://localhost:${BACKEND_PORT}/api/health`, res => {
        if (res.statusCode === 200) { clearInterval(poll); console.log("[Electron] Backend ready ✓"); resolve(); }
      });
      req.on("error", () => {});
      req.setTimeout(400, () => req.destroy());
      if (attempts >= 60) { clearInterval(poll); reject(new Error("Backend did not respond after 30 seconds.")); }
    }, 500);
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400, height: 900, minWidth: 900, minHeight: 600,
    title: "HMS — Hospital Management System",
    webPreferences: { nodeIntegration:false, contextIsolation:true, webSecurity:false },
    show: false, backgroundColor: "#0f172a",
  });
  mainWindow.loadURL(FRONTEND_URL);
  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
    if (isDev) mainWindow.webContents.openDevTools({ mode:"detach" });
  });
  mainWindow.on("closed", () => { mainWindow = null; });
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http")) shell.openExternal(url);
    return { action:"deny" };
  });
}

function buildMenu() {
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    { label:"HMS", submenu:[
      { label:"Reload",          accelerator:"CmdOrCtrl+R", click:()=>mainWindow?.reload() },
      { label:"DevTools",        accelerator:"F12",          click:()=>mainWindow?.webContents.toggleDevTools() },
      { type:"separator" },
      { label:"Open Data Folder",click:()=>BACKEND_PATH && shell.openPath(path.join(BACKEND_PATH,"data")) },
      { type:"separator" },
      { label:"Quit",            accelerator:"CmdOrCtrl+Q", click:()=>app.quit() },
    ]},
    { label:"View", submenu:[
      { label:"Zoom In",    accelerator:"CmdOrCtrl+=", click:()=>mainWindow?.webContents.setZoomLevel(mainWindow.webContents.getZoomLevel()+0.5) },
      { label:"Zoom Out",   accelerator:"CmdOrCtrl+-", click:()=>mainWindow?.webContents.setZoomLevel(mainWindow.webContents.getZoomLevel()-0.5) },
      { label:"Reset Zoom", accelerator:"CmdOrCtrl+0", click:()=>mainWindow?.webContents.setZoomLevel(0) },
      { type:"separator" },
      { label:"Fullscreen", accelerator:"F11", click:()=>mainWindow?.setFullScreen(!mainWindow.isFullScreen()) },
    ]},
  ]));
}

function createSplash() {
  const splash = new BrowserWindow({ width:400, height:260, frame:false, resizable:false, alwaysOnTop:true, backgroundColor:"#0f172a" });
  splash.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(`
    <!DOCTYPE html><html><head><style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{background:#0f172a;color:#fff;font-family:system-ui,sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh}
    .icon{font-size:56px;margin-bottom:12px}h1{font-size:20px;font-weight:800}p{font-size:12px;color:#94a3b8;margin-top:6px}
    .dots{margin-top:20px;display:flex;gap:6px}.dot{width:8px;height:8px;border-radius:50%;background:#3b82f6;animation:pulse 1s infinite}
    .dot:nth-child(2){animation-delay:.2s}.dot:nth-child(3){animation-delay:.4s}
    @keyframes pulse{0%,100%{opacity:.3}50%{opacity:1}}
    </style></head><body>
    <div class="icon">🏥</div><h1>HMS Portal</h1><p>Starting hospital management system…</p>
    <div class="dots"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div>
    </body></html>`)}`);
  return splash;
}

app.whenReady().then(async () => {
  buildMenu();
  const splash = createSplash();
  try {
    await freePort();
    await startBackend();
    await new Promise(r => setTimeout(r, 300));
    createWindow();
    splash.close();
  } catch (err) {
    splash.close();
    dialog.showErrorBox("HMS — Startup Error", err.message);
    app.quit();
  }
});

app.on("before-quit", () => { if (backendProc && !backendProc.killed) backendProc.kill(); });
app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });