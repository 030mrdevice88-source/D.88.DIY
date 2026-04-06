import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { validateRescueTarget } from "./src/services/rescueGateway";
import { spawn } from "child_process";
import { createProxyMiddleware } from "http-proxy-middleware";
import * as openpgp from "openpgp";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // --- START PYTHON BRIDGE ---
  const startPythonBridge = () => {
    const pythonProcess = spawn("python3", ["server_bridge.py"], {
      stdio: "inherit",
    });

    pythonProcess.on("error", (err) => {
      console.error("Failed to start Python bridge:", err);
    });

    // Cleanup on exit
    const cleanup = () => {
      pythonProcess.kill();
    };
    process.on("exit", cleanup);
    process.on("SIGINT", () => { cleanup(); process.exit(); });
    process.on("SIGTERM", () => { cleanup(); process.exit(); });
  };

  // Check and install dependencies
  console.log("[*] Checking Python dependencies...");
  const installProcess = spawn("python3", ["-m", "pip", "install", "fastapi", "uvicorn", "pyusb", "python-dotenv", "requests", "beautifulsoup4"], {
    stdio: "inherit",
  });

  installProcess.on("close", (code) => {
    if (code === 0) {
      console.log("[+] Python dependencies installed successfully.");
      startPythonBridge();
    } else {
      console.error("[-] Failed to install Python dependencies. Bridge might not start correctly.");
      startPythonBridge(); // Try anyway
    }
  });

  // Proxy to Python bridge (FastAPI on port 8000)
  app.use("/api/bridge", createProxyMiddleware({
    target: "http://localhost:8000",
    changeOrigin: true,
    pathRewrite: {
      "^/api/bridge": "", // remove /api/bridge from the request path
    },
  }));

  // --- PRIVACY SHIELD API (GPG) ---
  app.post("/api/privacy/encrypt", async (req, res) => {
    const { data, publicKey } = req.body;
    try {
      const message = await openpgp.createMessage({ text: data });
      const encryptionKey = await openpgp.readKey({ armoredKey: publicKey });
      const encrypted = await openpgp.encrypt({
        message,
        encryptionKeys: encryptionKey,
      });
      res.json({ encrypted });
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  app.post("/api/privacy/decrypt", async (req, res) => {
    const { encryptedData, privateKey, passphrase } = req.body;
    try {
      const message = await openpgp.readMessage({ armoredMessage: encryptedData });
      let decryptionKey = await openpgp.readKey({ armoredKey: privateKey });
      if (passphrase) {
        decryptionKey = await openpgp.decryptKey({
          privateKey: decryptionKey as openpgp.PrivateKey,
          passphrase,
        });
      }
      const { data: decrypted } = await openpgp.decrypt({
        message,
        decryptionKeys: decryptionKey as openpgp.PrivateKey,
      });
      res.json({ decrypted });
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  app.post("/api/privacy/generate-key", async (req, res) => {
    const { name, email, passphrase } = req.body;
    try {
      const { privateKey, publicKey, revocationCertificate } = await openpgp.generateKey({
        type: 'rsa',
        rsaBits: 4096,
        userIDs: [{ name, email }],
        passphrase
      });
      res.json({ privateKey, publicKey, revocationCertificate });
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", message: "Taktikal Suite Backend Active" });
  });

  app.get("/api/docs", async (req, res) => {
    try {
      const fs = await import("fs/promises");
      const docsDir = path.join(process.cwd(), "docs");
      if (!(await fs.stat(docsDir).catch(() => null))) {
        await fs.mkdir(docsDir);
      }
      const files = await fs.readdir(docsDir);
      const docs = await Promise.all(
        files.filter(f => f.endsWith(".md")).map(async (f) => {
          const content = await fs.readFile(path.join(docsDir, f), "utf-8");
          return { name: f, content };
        })
      );
      res.json(docs);
    } catch (error) {
      res.status(500).json({ error: "Failed to load docs" });
    }
  });

  app.get("/atze/extract", async (req, res) => {
    const { url } = req.query;
    if (!url || typeof url !== "string") {
      return res.status(400).json({ status: "error", detail: "URL required" });
    }

    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com)",
          "Referer": "https://www.google.com"
        }
      });
      const html = await response.text();
      
      // Simple extraction: remove scripts/styles and get text
      const cleanText = html
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();

      res.json({
        status: "success",
        content: cleanText.substring(0, 2000) + (cleanText.length > 2000 ? "..." : ""),
        url
      });
    } catch (error) {
      res.status(500).json({ status: "error", detail: String(error) });
    }
  });

  app.get("/vault/query", (req, res) => {
    // Mock vault query for now
    res.json({ results: [] });
  });

  // --- MOBILE REPAIR GUARDIAN API ---
  const MOCK_DB = {
    "Samsung Galaxy S21": {
      safeParameters: {
        partitions: ["frp", "config", "userdata"],
        pitHash: "sha256:7f83b1...",
        builds: ["G991BXXU5EWA1", "G991BXXU5EWA2"]
      }
    },
    "Samsung SM-A14R/DSN": {
      safeParameters: {
        partitions: ["frp", "userdata", "cache"],
        pitHash: "sha256:8a2b3c...",
        builds: ["A146BXXU2BWC1"]
      }
    },
    "Honeywell CT45P XON": {
      safeParameters: {
        partitions: ["userdata", "cache", "scanner"],
        pitHash: "sha256:9d8e7f...",
        builds: ["HON_CT45P_V1"]
      }
    },
    "iMac 2011 i5 Quadcore": {
      safeParameters: {
        partitions: ["efi", "recovery", "data"],
        pitHash: "sha256:1a2b3c...",
        builds: ["MACOS_HIGH_SIERRA"]
      }
    }
  };

  app.post("/api/repair/validate", (req, res) => {
    const { command, deviceInfo } = req.body;
    
    // 1. Brick-Schutz: Modell-Check
    const modelData = MOCK_DB[deviceInfo.detectedModel as keyof typeof MOCK_DB];
    if (!modelData) {
      return res.json({ 
        status: "BLOCKED", 
        msg: "Modell nicht in der Offline-Datenbank gefunden. Dienst verweigert.",
        riskLevel: "high"
      });
    }

    // 2. Sicherheits-Check: Whitelist & Partitionen
    const criticalPartitions = ["boot", "system", "recovery", "tz"];
    const isDangerous = criticalPartitions.some(p => command.toLowerCase().includes(p));
    
    if (isDangerous && command.toLowerCase().includes("flash")) {
      return res.json({ 
        status: "BLOCKED", 
        msg: "Kritischer Schreibzugriff auf System-Partition blockiert!",
        riskLevel: "high"
      });
    }

    // 3. FRP-Reset Check
    if (command.toLowerCase().includes("erase frp") || command.toLowerCase().includes("erase persistent")) {
      return res.json({ 
        status: "WARNING", 
        msg: "FRP-Reset erkannt. Erfordert GPT-Hash Validierung.",
        riskLevel: "high"
      });
    }

    res.json({ status: "SAFE", msg: "Befehl durch Backend-Guardian validiert.", riskLevel: "low" });
  });

  app.post("/api/repair/backup", async (req, res) => {
    // Simuliere Backup-Logik
    await new Promise(r => setTimeout(r, 1000));
    res.json({ status: "success", file: `backup_${Date.now()}.tar.gz` });
  });

  app.post("/api/repair/reset-frp", async (req, res) => {
    const { method } = req.body;
    // Simuliere FRP-Reset (z.B. Nullen der Partition)
    await new Promise(r => setTimeout(r, 1500));
    res.json({ status: "success", detail: "Partition 'frp' zeroed successfully via /dev/zero" });
  });

  app.get("/api/captive-portal/status", (req, res) => {
    res.json({ 
      active: true, 
      url: `${req.protocol}://${req.get('host')}/captive-portal.html`,
      redirects: ["connectivitycheck.gstatic.com", "clients3.google.com"]
    });
  });

  // Captive Portal Validation
  app.post("/api/validate", express.json(), (req, res) => {
    const { user_agent, exploit } = req.body;
    
    const validation = validateRescueTarget(user_agent, exploit);

    if (validation.approved) {
      res.json({
        status: 'approved',
        exploit: exploit || 'SETUP_LOCK_SCREEN',
        intent_url: validation.intentUrl,
        safety_level: validation.riskLevel,
        confidence: validation.confidenceScore,
        profile: validation.profile
      });
    } else {
      res.json({
        status: 'blocked',
        reason: validation.rejectionReason,
        safety_level: validation.riskLevel
      });
    }
  });

  // --- SCRIPT EXECUTION API ---
  app.post("/api/scripts/execute", async (req, res) => {
    const { type, script } = req.body;
    
    let command = "";
    let args: string[] = [];
    
    if (type === "python") {
      command = "python3";
      args = ["-c", script];
    } else if (type === "shell") {
      command = "bash";
      args = ["-c", script];
    } else if (type === "adb") {
      command = "bash";
      // Ensure each line starts with 'adb ' if it doesn't already
      const lines = script.split("\n").filter(l => l.trim()).map(l => {
        const trimmed = l.trim();
        // If it's already an adb command, leave it. Otherwise prefix it.
        // Also handle cases where user might use 'adb' as a standalone command in a script
        return (trimmed.startsWith("adb ") || trimmed === "adb") ? trimmed : `adb ${trimmed}`;
      });
      args = ["-c", lines.join(" && ")];
    } else {
      return res.status(400).json({ error: "Invalid script type" });
    }

    try {
      // Check if command exists (simple check by trying to run it with --version or similar)
      // For now, we'll just try to spawn and handle the error
      const child = spawn(command, args);
      let stdout = "";
      let stderr = "";

      // Set a timeout to prevent hanging processes (e.g. 30 seconds)
      const timeout = setTimeout(() => {
        child.kill();
        if (!res.headersSent) {
          res.status(504).json({ error: "Script execution timed out", stdout, stderr });
        }
      }, 30000);

      child.stdout.on("data", (data) => {
        stdout += data.toString();
      });

      child.stderr.on("data", (data) => {
        stderr += data.toString();
      });

      child.on("close", (code) => {
        clearTimeout(timeout);
        if (!res.headersSent) {
          res.json({ stdout, stderr, code });
        }
      });

      child.on("error", (err: any) => {
        clearTimeout(timeout);
        if (!res.headersSent) {
          let errorMsg = String(err);
          if (err.code === 'ENOENT') {
            errorMsg = `Command '${command}' not found. Please ensure it is installed in the environment.`;
          }
          res.status(500).json({ error: errorMsg, stdout, stderr });
        }
      });
    } catch (error) {
      if (!res.headersSent) {
        res.status(500).json({ error: String(error) });
      }
    }
  });

  // --- VITE MIDDLEWARE ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
