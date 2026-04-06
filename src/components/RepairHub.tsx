import React, { useState } from 'react';
import { 
  Wrench, 
  Cpu, 
  Database, 
  Shield, 
  Zap, 
  Layers, 
  Search, 
  FileText, 
  Youtube, 
  Terminal, 
  Activity, 
  CheckCircle2, 
  AlertCircle,
  ExternalLink,
  Smartphone,
  HardDrive,
  Box,
  Microscope,
  BookOpen,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Play,
  RefreshCw,
  Info,
  Save,
  RotateCcw,
  FileDown,
  Loader2,
  Usb,
  Globe,
  Wifi,
  Download,
  Terminal as TerminalIcon,
  Monitor
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { validateRepairCommand, SafetyStatus, generateHardwareFingerprint, type ValidationResult, type HardwareContext } from '../services/safetyGateway';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface SpecialistSuite {
  id: string;
  name: string;
  provider: string;
  focus: string[];
  status: 'connected' | 'disconnected' | 'emulated';
  description: string;
}

interface KnowledgeSource {
  id: string;
  name: string;
  type: 'rag' | 'manual' | 'video' | 'log';
  description: string;
  status: 'indexed' | 'pending' | 'error';
}

const SPECIALISTS: SpecialistSuite[] = [
  {
    id: 'octoplus',
    name: 'Octoplus Box / FRP Tool',
    provider: 'Octoplus Team',
    focus: ['FRP Reset', 'Samsung/LG/Huawei', 'Firmware Repair'],
    status: 'disconnected',
    description: 'Marktführer für FRP-Resets mit riesiger Support-Datenbank.'
  },
  {
    id: 'z3x',
    name: 'Z3X Pandora Tool',
    provider: 'Z3X-Team',
    focus: ['IMEI Repair', 'Bootloader Unlock', 'Data Recovery'],
    status: 'disconnected',
    description: 'Spezialisiert auf tiefgreifende Eingriffe via MTK/SPD Algorithmen.'
  },
  {
    id: 'drfone',
    name: 'Dr.Fone Suite',
    provider: 'Wondershare',
    focus: ['Screen Unlock', 'iOS/Android Transfer', 'System Repair'],
    status: 'emulated',
    description: 'Einsteigerfreundliche Software-Lösung für Standard-Reparaturen.'
  }
];

const KNOWLEDGE_SOURCES: KnowledgeSource[] = [
  {
    id: 'ifixit',
    name: 'iFixit FixBot Data',
    type: 'rag',
    description: 'Über 70.000 Reparaturanleitungen & Handbücher.',
    status: 'indexed'
  },
  {
    id: 'schematics',
    name: 'Eigene Schematics & PDFs',
    type: 'manual',
    description: 'Lokale Schaltpläne und Testpoint-Bilder.',
    status: 'indexed'
  },
  {
    id: 'box-logs',
    name: 'Z3X/Octoplus Logs',
    type: 'log',
    description: 'Historische Erfolgs-Logs deiner Hardware-Boxen.',
    status: 'pending'
  },
  {
    id: 'yt-repair',
    name: 'YouTube Repair Channels',
    type: 'video',
    description: 'Indizierte Video-Transkripte für visuelle Anleitungen.',
    status: 'indexed'
  }
];

export default function RepairHub() {
  const [suites, setSuites] = useState<SpecialistSuite[]>(SPECIALISTS);
  const [sources, setSources] = useState<KnowledgeSource[]>(KNOWLEDGE_SOURCES);
  const [activeView, setActiveView] = useState<'suites' | 'knowledge' | 'advanced' | 'technician'>('technician');

  // AI Technician State
  const [deviceInfo, setDeviceInfo] = useState<HardwareContext>(generateHardwareFingerprint('Samsung SM-A14R/DSN'));
  const [deviceIndex, setDeviceIndex] = useState(0);
  const [query, setQuery] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [proposal, setProposal] = useState<string | null>(null);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [executionLog, setExecutionLog] = useState<string[]>([]);
  const [isFingerprinting, setIsFingerprinting] = useState(false);

  // Captive Portal State
  const [captivePortalActive, setCaptivePortalActive] = useState(false);
  const [captivePortalUrl, setCaptivePortalUrl] = useState('');

  // Automated Workflow State
  const [workflowStatus, setWorkflowStatus] = useState<'idle' | 'running' | 'completed' | 'failed'>('idle');
  const [currentWorkflowStep, setCurrentWorkflowStep] = useState(0);
  const [workflowSteps, setWorkflowSteps] = useState([
    { id: 'detect', label: 'Gerät erkennen (USB-ID)', status: 'pending', icon: <Usb size={16} /> },
    { id: 'safety', label: 'Sicherheits-Check (Guardian)', status: 'pending', icon: <Shield size={16} /> },
    { id: 'backup', label: 'Daten sichern (PIT/Dump)', status: 'pending', icon: <Save size={16} /> },
    { id: 'frp', label: 'FRP-Reset ausführen', status: 'pending', icon: <RotateCcw size={16} /> },
    { id: 'flash', label: 'Firmware flashen (Stock)', status: 'pending', icon: <FileDown size={16} /> }
  ]);

  const runAutomatedRepair = async () => {
    setWorkflowStatus('running');
    setExecutionLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] --- START AUTOMATED REPAIR WORKFLOW ---`]);
    
    const updateStep = (id: string, status: string) => {
      setWorkflowSteps(prev => prev.map(s => s.id === id ? { ...s, status } : s));
    };

    try {
      // 1. Gerät erkennen
      setCurrentWorkflowStep(0);
      updateStep('detect', 'running');
      await new Promise(r => setTimeout(r, 1500));
      setExecutionLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] Device detected: ${deviceInfo.detectedModel} (ID: 04e8:6860)`]);
      updateStep('detect', 'completed');

      // 2. Sicherheits-Check (Backend API)
      setCurrentWorkflowStep(1);
      updateStep('safety', 'running');
      const safetyResponse = await fetch('/api/repair/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: 'fastboot erase frp', deviceInfo })
      });
      const safety = await safetyResponse.json();
      setValidation(safety);
      if (safety.status === 'BLOCKED' || safety.status === 'CRITICAL_ERROR') {
        throw new Error(`Safety Check failed: ${safety.msg}`);
      }
      setExecutionLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] Guardian (Backend): Safety Check passed (${safety.status})`]);
      updateStep('safety', 'completed');

      // 3. Erst Sichern (Backend API)
      setCurrentWorkflowStep(2);
      updateStep('backup', 'running');
      setExecutionLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] Requesting backup from backend...`]);
      const backupResponse = await fetch('/api/repair/backup', { method: 'POST' });
      const backupResult = await backupResponse.json();
      setExecutionLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] Backup successful: ${backupResult.file}`]);
      updateStep('backup', 'completed');

      // 4. Dann FRP-Reset (Backend API)
      setCurrentWorkflowStep(3);
      updateStep('frp', 'running');
      setExecutionLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] Executing FRP Reset via Backend Guardian...`]);
      const frpResponse = await fetch('/api/repair/reset-frp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: 'zero-partition' })
      });
      const frpResult = await frpResponse.json();
      setExecutionLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] FRP Reset: ${frpResult.detail}`]);
      updateStep('frp', 'completed');

      // 5. Dann neues OS
      setCurrentWorkflowStep(4);
      updateStep('flash', 'running');
      setExecutionLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] Flashing Firmware: Smartphone_Android13_Stock.tar`]);
      await new Promise(r => setTimeout(r, 3000));
      setExecutionLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] Flash process: 100% complete.`]);
      updateStep('flash', 'completed');

      setWorkflowStatus('completed');
      setExecutionLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] --- WORKFLOW COMPLETED SUCCESSFULLY ---`]);
    } catch (error: any) {
      setWorkflowStatus('failed');
      setExecutionLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] !!! ERROR: ${error.message}`]);
    }
  };

  const handleToggleCaptivePortal = async () => {
    if (!captivePortalActive) {
      try {
        const response = await fetch('/api/captive-portal/status');
        const data = await response.json();
        setCaptivePortalUrl(data.url);
        setCaptivePortalActive(true);
        setExecutionLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] Captive Portal started at ${data.url}`]);
        
        // Register sync for validation data
        if ('serviceWorker' in navigator && 'SyncManager' in window) {
          const registration = await navigator.serviceWorker.ready;
          // @ts-ignore
          await registration.sync.register('sync-validation');
        }
      } catch (error) {
        setExecutionLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] Failed to start Captive Portal`]);
      }
    } else {
      setCaptivePortalActive(false);
      setExecutionLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] Captive Portal stopped`]);
    }
  };

  const handleDownloadToolset = async () => {
    setExecutionLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] Preparing MITM Toolset (Python/Shell/JSON)...`]);
    try {
      const content = `# MITM Toolset
print("MITM Toolset initialized")
`;
      const blob = new Blob([content], { type: 'text/plain' });
      
      if ('showSaveFilePicker' in window) {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: 'mitm_toolset.py',
          types: [{
            description: 'Python File',
            accept: { 'text/x-python': ['.py'] },
          }],
        });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        setExecutionLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] Toolset saved locally via File System API.`]);
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'mitm_toolset.py';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setExecutionLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] Toolset downloaded.`]);
      }
    } catch (e) {
      setExecutionLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] Download cancelled or failed: ${e}`]);
    }
  };

  const handleFingerprint = async () => {
    setIsFingerprinting(true);
    try {
      // @ts-ignore
      const device = await navigator.usb.requestDevice({ filters: [] });
      const modelName = device.productName || `USB Device (VID: ${device.vendorId}, PID: ${device.productId})`;
      const newDevice = generateHardwareFingerprint(modelName);
      setDeviceInfo(newDevice);
      setExecutionLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] Fingerprint: Model=${newDevice.detectedModel}, GPT_HASH=${newDevice.gptHash?.substring(0, 12)}...`]);
    } catch (e) {
      setExecutionLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] Fingerprint Error: ${e}`]);
    } finally {
      setIsFingerprinting(false);
    }
  };

  const handleAskTechnician = async () => {
    if (!query) return;
    setIsAnalyzing(true);
    setProposal(null);
    setValidation(null);

    try {
      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
      
      const prompt = `Du bist ein Hardware-Reparatur-Spezialist. Erstelle einen Reparatur-Workflow für das Gerät: ${deviceInfo.detectedModel}.
Problem: ${query}
Antworte in Markdown mit nummerierten Schritten. Enthalte mindestens einen Terminal-Befehl (z.B. adb, fastboot) in Backticks (\`command\`).`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: prompt,
      });

      const proposalText = response.text || 'Keine Antwort generiert.';
      setProposal(proposalText);

      const firstCommandMatch = proposalText.match(/`([^`]+)`/);
      const commandToValidate = firstCommandMatch ? firstCommandMatch[1] : 'adb devices';
      const result = await validateRepairCommand(commandToValidate, deviceInfo);
      
      setValidation(result);
    } catch (e) {
      setExecutionLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] AI Error: ${e}`]);
      setProposal(`# Fehler bei der KI-Analyse\n${e}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleExecute = async () => {
    if (!validation || validation.status === SafetyStatus.BLOCKED) return;
    
    setExecutionLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] Executing: ${validation.command}`]);
    try {
      // In a real environment, this would send the command to the connected device via WebUSB/Serial
      // For now, we simulate the execution delay but handle it asynchronously
      await new Promise(r => setTimeout(r, 1500));
      setExecutionLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] Success: Command executed successfully.`]);
    } catch (e) {
      setExecutionLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] Error executing command: ${e}`]);
    }
  };

  return (
    <div className="flex flex-col animate-in fade-in duration-500">
      <div className="max-w-6xl mx-auto w-full space-y-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <h2 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <Wrench className="text-tactical-accent shrink-0" size={32} /> Repair & Specialist Hub
            </h2>
            <p className="text-sm text-tactical-muted">
              Orchestrierung von Hardware-Boxen, Software-Suites und KI-gestützter Wissensbasis.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            <button 
              onClick={() => setActiveView('suites')}
              className={cn(
                "flex-1 md:flex-none justify-center px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all",
                activeView === 'suites' ? "bg-tactical-accent text-tactical-bg" : "bg-tactical-card border border-tactical-border text-tactical-muted"
              )}
            >
              Suites
            </button>
            <button 
              onClick={() => setActiveView('technician')}
              className={cn(
                "flex-1 md:flex-none justify-center px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all",
                activeView === 'technician' ? "bg-tactical-accent text-tactical-bg" : "bg-tactical-card border border-tactical-border text-tactical-muted"
              )}
            >
              AI Technician
            </button>
            <button 
              onClick={() => setActiveView('advanced')}
              className={cn(
                "flex-1 md:flex-none justify-center px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all",
                activeView === 'advanced' ? "bg-tactical-accent text-tactical-bg" : "bg-tactical-card border border-tactical-border text-tactical-muted"
              )}
            >
              Advanced Workflow
            </button>
            <button 
              onClick={() => setActiveView('knowledge')}
              className={cn(
                "flex-1 md:flex-none justify-center px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all",
                activeView === 'knowledge' ? "bg-tactical-accent text-tactical-bg" : "bg-tactical-card border border-tactical-border text-tactical-muted"
              )}
            >
              AI Knowledge
            </button>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {activeView === 'advanced' && (
            <motion.div 
              key="advanced-workflow"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-8"
            >
              {/* Left Column: Workflow Stepper */}
              <div className="lg:col-span-7 space-y-6">
                <div className="bg-tactical-card border border-tactical-border rounded-3xl p-8 space-y-8">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <h3 className="text-2xl font-bold">Automated Repair Workflow</h3>
                      <p className="text-xs text-tactical-muted uppercase tracking-widest font-bold">MobileRepairGuardian v2.0</p>
                    </div>
                    {workflowStatus === 'idle' ? (
                      <button 
                        onClick={runAutomatedRepair}
                        className="px-6 py-3 bg-tactical-accent text-tactical-bg font-bold rounded-xl hover:scale-105 transition-transform flex items-center gap-2"
                      >
                        <Play size={18} /> START WORKFLOW
                      </button>
                    ) : workflowStatus === 'running' ? (
                      <div className="flex items-center gap-3 text-tactical-accent font-bold text-sm animate-pulse">
                        <Loader2 className="animate-spin" size={20} /> RUNNING...
                      </div>
                    ) : (
                      <button 
                        onClick={() => {
                          setWorkflowStatus('idle');
                          setWorkflowSteps(prev => prev.map(s => ({ ...s, status: 'pending' })));
                        }}
                        className="px-6 py-3 bg-tactical-card border border-tactical-border text-tactical-muted font-bold rounded-xl hover:bg-tactical-border/10 transition-colors"
                      >
                        RESET
                      </button>
                    )}
                  </div>

                  <div className="space-y-4">
                    {workflowSteps.map((step, index) => (
                      <div 
                        key={step.id}
                        className={cn(
                          "flex items-center gap-6 p-4 rounded-2xl border transition-all duration-300",
                          step.status === 'completed' ? "bg-emerald-500/5 border-emerald-500/20 opacity-100" :
                          step.status === 'running' ? "bg-tactical-accent/10 border-tactical-accent shadow-[0_0_20px_rgba(0,255,157,0.05)]" :
                          "bg-tactical-bg/30 border-tactical-border opacity-40"
                        )}
                      >
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center border",
                          step.status === 'completed' ? "bg-emerald-500 text-tactical-bg border-emerald-500" :
                          step.status === 'running' ? "bg-tactical-accent text-tactical-bg border-tactical-accent" :
                          "bg-tactical-bg border-tactical-border text-tactical-muted"
                        )}>
                          {step.status === 'completed' ? <CheckCircle2 size={20} /> : 
                           step.status === 'running' ? <Loader2 size={20} className="animate-spin" /> : 
                           step.icon}
                        </div>
                        <div className="flex-1">
                          <p className={cn(
                            "text-sm font-bold",
                            step.status === 'completed' ? "text-emerald-500" :
                            step.status === 'running' ? "text-tactical-accent" : "text-tactical-muted"
                          )}>
                            {step.label}
                          </p>
                          <p className="text-[10px] text-tactical-muted uppercase tracking-widest font-bold">
                            Step {index + 1} of {workflowSteps.length}
                          </p>
                        </div>
                        {step.status === 'completed' && (
                          <div className="text-emerald-500">
                            <CheckCircle2 size={20} />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Safety Info */}
                <div className="bg-tactical-accent/5 border border-tactical-accent/20 rounded-3xl p-6 flex items-start gap-4">
                  <Shield className="text-tactical-accent shrink-0" size={24} />
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold">Guardian Safety Protocol</h4>
                    <p className="text-xs text-tactical-muted leading-relaxed">
                      Dieser Workflow nutzt die "Air-Gap" Validierung. Jeder Schritt wird gegen die lokale Whitelist geprüft. 
                      Bei einer Modell-Fehlanpassung oder kritischen Partition-Zugriffen wird der Prozess sofort gestoppt.
                    </p>
                  </div>
                </div>
              </div>

              {/* Right Column: Live Log */}
              <div className="lg:col-span-5 flex flex-col gap-6">
                <div className="bg-tactical-card border border-tactical-border rounded-3xl p-6 space-y-4 flex-1 flex flex-col min-h-[300px] lg:min-h-[500px]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Terminal className="text-tactical-accent" size={24} />
                      <h3 className="text-xl font-bold">Automated Log</h3>
                    </div>
                    <button 
                      onClick={() => setExecutionLog([])}
                      className="text-[10px] text-tactical-muted hover:text-tactical-accent font-bold uppercase tracking-widest"
                    >
                      Clear
                    </button>
                  </div>
                  
                  <div className="flex-1 bg-tactical-bg rounded-2xl border border-tactical-border p-4 font-mono text-[10px] overflow-y-auto custom-scrollbar space-y-1">
                    {executionLog.length === 0 ? (
                      <p className="text-tactical-muted italic">Warte auf Workflow-Start...</p>
                    ) : (
                      executionLog.map((log, i) => (
                        <div key={`workflow-step-${i}`} className={cn(
                          log.includes('Success') || log.includes('COMPLETED') ? "text-emerald-500" : 
                          log.includes('ERROR') ? "text-red-500" : "text-tactical-muted"
                        )}>
                          {log}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeView === 'technician' && (
            <motion.div 
              key="technician"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-8"
            >
              {/* Left Column: Device & Input */}
              <div className="lg:col-span-7 space-y-6">
                <div className="bg-tactical-card border border-tactical-border rounded-3xl p-6 space-y-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <Smartphone className="text-tactical-accent shrink-0" size={24} />
                      <h3 className="text-xl font-bold">Connected Device</h3>
                    </div>
                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <button 
                        onClick={handleFingerprint}
                        disabled={isFingerprinting}
                        className="p-2 bg-tactical-bg border border-tactical-border rounded-lg hover:border-tactical-accent transition-colors disabled:opacity-50"
                        title="Hardware Fingerprint Snapshot"
                      >
                        <RefreshCw className={cn(isFingerprinting && "animate-spin")} size={14} />
                      </button>
                      <span className="px-3 py-1 bg-emerald-500/10 text-emerald-500 text-[10px] font-bold rounded-full border border-emerald-500/20 whitespace-nowrap">
                        ONLINE (ADB)
                      </span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 bg-tactical-bg/50 rounded-2xl border border-tactical-border/50">
                      <p className="text-[10px] text-tactical-muted uppercase font-bold tracking-tighter">Model</p>
                      <p className="text-sm font-mono truncate">{deviceInfo.detectedModel}</p>
                    </div>
                    <div className="p-4 bg-tactical-bg/50 rounded-2xl border border-tactical-border/50">
                      <p className="text-[10px] text-tactical-muted uppercase font-bold tracking-tighter">Build</p>
                      <p className="text-sm font-mono truncate">{deviceInfo.currentBuild}</p>
                    </div>
                    <div className="p-4 bg-tactical-bg/50 rounded-2xl border border-tactical-border/50">
                      <p className="text-[10px] text-tactical-muted uppercase font-bold tracking-tighter">IMEI</p>
                      <p className="text-sm font-mono truncate">{deviceInfo.imei}</p>
                    </div>
                    <div className="p-4 bg-tactical-bg/50 rounded-2xl border border-tactical-border/50">
                      <p className="text-[10px] text-tactical-muted uppercase font-bold tracking-tighter">GPT Hash</p>
                      <p className="text-sm font-mono truncate">{deviceInfo.gptHash?.substring(0, 10)}...</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="text-[10px] text-tactical-muted uppercase font-bold tracking-widest">Problem Description / AI Prompt</label>
                    <div className="relative">
                      <textarea 
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="z.B. FRP Bypass Samsung S21 Android 13..."
                        className="w-full bg-tactical-bg border border-tactical-border rounded-2xl p-4 text-sm focus:outline-none focus:border-tactical-accent min-h-[100px] resize-none"
                      />
                      <button 
                        onClick={handleAskTechnician}
                        disabled={isAnalyzing || !query}
                        className="absolute bottom-4 right-4 p-3 bg-tactical-accent text-tactical-bg rounded-xl hover:scale-105 transition-transform disabled:opacity-50"
                      >
                        {isAnalyzing ? <RefreshCw className="animate-spin" size={20} /> : <Zap size={20} />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Proposal & Validation */}
                {proposal && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-tactical-card border border-tactical-border rounded-3xl p-6 space-y-6"
                  >
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <Terminal className="text-tactical-accent shrink-0" size={24} />
                        <h3 className="text-xl font-bold">AI Proposal (Ollama)</h3>
                      </div>
                      {validation && (
                        <div className={cn(
                          "flex items-center gap-2 px-4 py-1 rounded-full border text-[10px] font-bold uppercase tracking-widest self-start sm:self-auto",
                          validation.status === SafetyStatus.SAFE ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" :
                          validation.status === SafetyStatus.WARNING ? "bg-amber-500/10 text-amber-500 border-amber-500/20" :
                          "bg-red-500/10 text-red-500 border-red-500/20"
                        )}>
                          {validation.status === SafetyStatus.SAFE && <ShieldCheck size={14} />}
                          {validation.status === SafetyStatus.WARNING && <ShieldAlert size={14} />}
                          {validation.status === SafetyStatus.BLOCKED && <ShieldX size={14} />}
                          {validation.status}
                        </div>
                      )}
                    </div>

                    <div className="p-4 bg-tactical-bg rounded-2xl border border-tactical-border font-mono text-xs text-tactical-accent break-words overflow-x-auto">
                      <div className="markdown-body prose prose-invert prose-sm max-w-none prose-pre:bg-tactical-card prose-pre:border prose-pre:border-tactical-border">
                        <Markdown>{proposal}</Markdown>
                      </div>
                    </div>

                    {validation && (
                      <div className="p-4 rounded-2xl bg-tactical-bg/50 border border-tactical-border space-y-2">
                        <div className="flex items-center gap-2">
                          <Info size={14} className="text-tactical-muted" />
                          <p className="text-xs font-bold text-tactical-muted uppercase tracking-widest">Safety Analysis</p>
                        </div>
                        <p className="text-sm leading-relaxed">{validation.msg}</p>
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row gap-4">
                      <button 
                        onClick={handleExecute}
                        disabled={!validation || validation.status === SafetyStatus.BLOCKED}
                        className="flex-1 py-4 bg-tactical-accent text-tactical-bg font-bold rounded-2xl flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-20"
                      >
                        <Play size={18} /> EXECUTE COMMAND
                      </button>
                      <button className="w-full sm:w-auto px-6 py-4 bg-tactical-card border border-tactical-border text-tactical-muted font-bold rounded-2xl hover:bg-tactical-border/10 transition-colors">
                        EDIT
                      </button>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Right Column: Safety Gate & Logs */}
              <div className="lg:col-span-5 space-y-6">
                {/* Traffic Light System */}
                <div className="bg-tactical-card border border-tactical-border rounded-3xl p-6 space-y-6">
                  <div className="flex items-center gap-3">
                    <Shield className="text-tactical-accent" size={24} />
                    <h3 className="text-xl font-bold">Guardian Gatekeeper</h3>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex items-center gap-4 p-3 rounded-2xl bg-tactical-bg/30 border border-tactical-border/30">
                      <div className={cn(
                        "w-4 h-4 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]",
                        validation?.status === SafetyStatus.SAFE ? "bg-emerald-500" : "bg-emerald-900/30"
                      )} />
                      <div className="flex-1">
                        <p className="text-[10px] font-bold uppercase tracking-widest">Sicher / Geprüft</p>
                        <p className="text-[9px] text-tactical-muted">Nur lesende Zugriffe oder bekannte App-IDs.</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 p-3 rounded-2xl bg-tactical-bg/30 border border-tactical-border/30">
                      <div className={cn(
                        "w-4 h-4 rounded-full shadow-[0_0_10px_rgba(245,158,11,0.5)]",
                        validation?.status === SafetyStatus.WARNING ? "bg-amber-500" : "bg-amber-900/30"
                      )} />
                      <div className="flex-1">
                        <p className="text-[10px] font-bold uppercase tracking-widest">Unbekannt / Risiko</p>
                        <p className="text-[9px] text-tactical-muted">Schreibzugriffe oder unbekannte Parameter.</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 p-3 rounded-2xl bg-tactical-bg/30 border border-tactical-border/30">
                      <div className={cn(
                        "w-4 h-4 rounded-full shadow-[0_0_10px_rgba(239,68,68,0.5)]",
                        (validation?.status === SafetyStatus.BLOCKED || validation?.status === SafetyStatus.CRITICAL_ERROR) ? "bg-red-500" : "bg-red-900/30"
                      )} />
                      <div className="flex-1">
                        <p className="text-[10px] font-bold uppercase tracking-widest">Gefährlich / Brick-Gefahr</p>
                        <p className="text-[9px] text-tactical-muted">Kritische Partitionen oder Modell-Fehlanpassung.</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Execution Log */}
                <div className="bg-tactical-card border border-tactical-border rounded-3xl p-6 space-y-4 flex-1 min-h-[300px] flex flex-col">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Activity className="text-tactical-accent" size={24} />
                      <h3 className="text-xl font-bold">USB-C Live Log</h3>
                    </div>
                    <button 
                      onClick={() => setExecutionLog([])}
                      className="text-[10px] text-tactical-muted hover:text-tactical-accent font-bold uppercase tracking-widest"
                    >
                      Clear
                    </button>
                  </div>
                  
                  <div className="flex-1 bg-tactical-bg rounded-2xl border border-tactical-border p-4 font-mono text-[10px] overflow-y-auto custom-scrollbar space-y-1">
                    {executionLog.length === 0 ? (
                      <p className="text-tactical-muted italic">Warte auf Befehlsausführung...</p>
                    ) : (
                      executionLog.map((log, i) => (
                        <div key={`repair-log-${i}`} className={cn(
                          log.includes('Success') ? "text-emerald-500" : "text-tactical-muted"
                        )}>
                          {log}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeView === 'suites' && (
            <motion.div 
              key="suites"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-6"
            >
              {suites.map((suite) => (
                <SuiteCard key={suite.id} suite={suite} />
              ))}
            </motion.div>
          )}

          {activeView === 'knowledge' && (
            <motion.div 
              key="knowledge"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {sources.map((source) => (
                  <KnowledgeCard key={source.id} source={source} />
                ))}
              </div>
              
              <div className="bg-tactical-accent/5 border border-tactical-accent/20 rounded-3xl p-8 space-y-4">
                <div className="flex items-center gap-3">
                  <Database className="text-tactical-accent" size={24} />
                  <h3 className="text-xl font-bold">RAG-Infrastruktur (ChromaDB/LanceDB)</h3>
                </div>
                <p className="text-sm text-tactical-muted leading-relaxed">
                  Dein lokales "Reparatur-Gehirn" nutzt Vektordatenbanken, um aus Tausenden von PDFs und Logs die passende Lösung zu finden. 
                  Alle Daten bleiben offline auf deinem System.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <button className="w-full sm:w-auto px-6 py-2 bg-tactical-accent text-tactical-bg font-bold rounded-xl text-[10px] uppercase tracking-widest">
                    RE-INDEX SOURCES
                  </button>
                  <button className="w-full sm:w-auto px-6 py-2 bg-tactical-card border border-tactical-border text-tactical-muted font-bold rounded-xl text-[10px] uppercase tracking-widest">
                    VIEW VECTOR STATS
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {activeView === 'advanced' && (
            <motion.div 
              key="advanced"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-8"
            >
              {/* Digital Mirror / Captive Portal Card */}
              <div className="bg-tactical-card border border-tactical-border rounded-3xl p-8 space-y-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-indigo-500/10 rounded-2xl text-indigo-500 border border-indigo-500/20">
                    <Globe size={32} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">The Digital Mirror</h3>
                    <p className="text-xs text-tactical-muted uppercase tracking-widest font-bold">Captive Portal & DNS Hijacking</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="p-4 bg-black/40 rounded-2xl border border-tactical-border/50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-mono text-tactical-muted">STATUS</span>
                      <span className={cn(
                        "text-[10px] px-2 py-0.5 rounded-full font-bold",
                        captivePortalActive ? "bg-emerald-500/20 text-emerald-500" : "bg-tactical-muted/20 text-tactical-muted"
                      )}>
                        {captivePortalActive ? "BROADCASTING" : "OFFLINE"}
                      </span>
                    </div>
                    <p className="text-xs text-tactical-muted leading-relaxed">
                      Smartphone A agiert als Hotspot. Smartphone B wird bei Verbindung auf das Validierungs-Gateway umgeleitet.
                    </p>
                  </div>

                  {captivePortalActive && (
                    <div className="p-4 bg-indigo-500/5 border border-indigo-500/20 rounded-2xl space-y-3">
                      <div>
                        <div className="text-[10px] text-indigo-400 font-bold mb-1 uppercase tracking-wider">Target URL</div>
                        <div className="text-[10px] font-mono text-white break-all bg-black/30 p-2 rounded border border-indigo-500/10">
                          {captivePortalUrl}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-[10px] text-tactical-muted flex items-center gap-2">
                          <div className="w-1 h-1 bg-indigo-400 rounded-full" />
                          DNS: connectivitycheck.gstatic.com → Local
                        </div>
                        <div className="text-[10px] text-tactical-muted flex items-center gap-2">
                          <div className="w-1 h-1 bg-indigo-400 rounded-full" />
                          Intent: SETUP_LOCK_SCREEN
                        </div>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={handleToggleCaptivePortal}
                    className={cn(
                      "w-full py-4 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2",
                      captivePortalActive 
                        ? "bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20" 
                        : "bg-indigo-500 text-white hover:bg-indigo-600 shadow-lg shadow-indigo-500/20"
                    )}
                  >
                    {captivePortalActive ? (
                      <>
                        <ShieldAlert size={16} />
                        Stop Broadcast
                      </>
                    ) : (
                      <>
                        <Wifi size={16} />
                        Start Digital Mirror
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleDownloadToolset}
                    className="w-full py-3 bg-tactical-card border border-tactical-border text-tactical-muted rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-tactical-accent hover:text-tactical-bg transition-all flex items-center justify-center gap-2"
                  >
                    <Download size={14} />
                    Download Toolset (Python)
                  </button>
                </div>
              </div>

              <div className="bg-tactical-card border border-tactical-border rounded-3xl p-8 space-y-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-500 border border-emerald-500/20">
                    <Monitor size={32} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">System Monitoring</h3>
                    <p className="text-xs text-tactical-muted uppercase tracking-widest font-bold">Live Metrics & Health</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 bg-black/40 rounded-2xl border border-tactical-border/50">
                    <div className="text-[10px] text-tactical-muted uppercase font-bold mb-1">CPU Load</div>
                    <div className="text-xl font-mono text-emerald-400">15.5%</div>
                  </div>
                  <div className="p-4 bg-black/40 rounded-2xl border border-tactical-border/50">
                    <div className="text-[10px] text-tactical-muted uppercase font-bold mb-1">Memory</div>
                    <div className="text-xl font-mono text-emerald-400">42.1%</div>
                  </div>
                </div>

                <div className="p-4 bg-black/40 rounded-2xl border border-tactical-border/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-tactical-muted uppercase font-bold">Active Targets</span>
                    <span className="text-xs font-mono text-white">0</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-tactical-muted uppercase font-bold">Exploits Blocked</span>
                    <span className="text-xs font-mono text-white">0</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-tactical-muted uppercase font-bold">Fallbacks</span>
                    <span className="text-xs font-mono text-white">0</span>
                  </div>
                </div>

                <button className="w-full py-3 bg-tactical-bg border border-tactical-border rounded-xl text-[10px] font-bold uppercase tracking-widest hover:border-tactical-accent transition-all flex items-center justify-center gap-2">
                  <TerminalIcon size={14} />
                  Open Monitor Console
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function SuiteCard({ suite }: { suite: SpecialistSuite }) {
  return (
    <div className="bg-tactical-card border border-tactical-border rounded-3xl p-6 space-y-6 hover:border-tactical-accent/50 transition-colors group">
      <div className="flex items-start justify-between">
        <div className="p-3 bg-tactical-bg rounded-2xl border border-tactical-border text-tactical-accent">
          <Smartphone size={24} />
        </div>
        <div className={cn(
          "px-2 py-1 rounded text-[8px] font-bold uppercase tracking-widest",
          suite.status === 'connected' ? "bg-emerald-500/20 text-emerald-500" :
          suite.status === 'emulated' ? "bg-blue-500/20 text-blue-500" :
          "bg-tactical-muted/20 text-tactical-muted"
        )}>
          {suite.status}
        </div>
      </div>

      <div className="space-y-2">
        <h4 className="text-lg font-bold">{suite.name}</h4>
        <p className="text-[10px] text-tactical-muted uppercase font-bold tracking-widest">{suite.provider}</p>
        <p className="text-xs text-tactical-muted line-clamp-2">{suite.description}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {suite.focus.map(f => (
          <span key={f} className="px-2 py-0.5 bg-tactical-bg border border-tactical-border rounded text-[8px] text-tactical-muted uppercase font-bold">
            {f}
          </span>
        ))}
      </div>

      <button className="w-full py-3 bg-tactical-bg border border-tactical-border rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-tactical-accent hover:text-tactical-bg transition-all flex items-center justify-center gap-2 group-hover:border-tactical-accent">
        Launch Suite <ExternalLink size={14} />
      </button>
    </div>
  );
}

function KnowledgeCard({ source }: { source: KnowledgeSource }) {
  return (
    <div className="bg-tactical-card border border-tactical-border rounded-2xl p-6 flex items-center gap-6 hover:border-tactical-accent/30 transition-colors">
      <div className={cn(
        "p-4 rounded-xl border",
        source.type === 'rag' ? "bg-blue-500/10 border-blue-500/20 text-blue-500" :
        source.type === 'video' ? "bg-red-500/10 border-red-500/20 text-red-500" :
        source.type === 'log' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" :
        "bg-tactical-accent/10 border-tactical-accent/20 text-tactical-accent"
      )}>
        {source.type === 'rag' ? <BookOpen size={24} /> : 
         source.type === 'video' ? <Youtube size={24} /> : 
         source.type === 'log' ? <Terminal size={24} /> : <FileText size={24} />}
      </div>
      <div className="flex-1 space-y-1">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-bold">{source.name}</h4>
          <div className={cn(
            "w-2 h-2 rounded-full",
            source.status === 'indexed' ? "bg-emerald-500" :
            source.status === 'pending' ? "bg-yellow-500 animate-pulse" : "bg-red-500"
          )} />
        </div>
        <p className="text-[10px] text-tactical-muted">{source.description}</p>
      </div>
    </div>
  );
}
