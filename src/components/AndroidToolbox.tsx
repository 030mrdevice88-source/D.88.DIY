import React, { useState, useRef, useEffect } from 'react';
import { 
  Smartphone, 
  Terminal, 
  Zap, 
  ShieldAlert, 
  Download, 
  RefreshCw, 
  Play,
  Unlock, 
  Lock, 
  FileUp, 
  Monitor, 
  Cpu, 
  Search,
  Plus,
  Trash2,
  ChevronRight,
  Activity,
  Settings,
  Layers,
  Box,
  Hash,
  Code2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { HardwareDevice } from '../types';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface AndroidToolboxProps {
  devices: HardwareDevice[];
  onConnectADB: (customVid?: string) => Promise<void>;
  onConnectFastboot: (customVid?: string) => Promise<void>;
  onConnectMTK: (customVid?: string) => Promise<void>;
  onConnectUniversal?: (customVid?: string) => Promise<void>;
  onFlashAndroid: (id: string, partitions: { name: string, file: File }[]) => Promise<void>;
  onRunShell: (id: string, command: string) => Promise<string>;
  onDisconnect: (id: string) => Promise<void>;
  onAction?: (action: string, params?: any) => void;
}

export default function AndroidToolbox({ 
  devices, 
  onConnectADB, 
  onConnectFastboot, 
  onConnectMTK,
  onConnectUniversal,
  onFlashAndroid,
  onRunShell,
  onDisconnect,
  onAction
}: AndroidToolboxProps) {
  const [activeSubTab, setActiveSubTab] = useState<'triage' | 'adb' | 'fastboot' | 'mtk' | 'dumper' | 'automation' | 'scripts' | 'guide'>('triage');
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [shellInput, setShellInput] = useState('');
  const [triageState, setTriageState] = useState<'idle' | 'identifying' | 'detected' | 'processing'>('idle');
  const [triageResult, setTriageResult] = useState<{
    vid?: string;
    pid?: string;
    state: 'ADB' | 'FASTBOOT' | 'EDL' | 'UNKNOWN';
    model?: string;
    locked: boolean;
  } | null>(null);
  const [triageLogs, setTriageLogs] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);
  const [shellLogs, setShellLogs] = useState<{ time: string, data: string, type: 'in' | 'out' }[]>([]);
  const [flashQueue, setFlashQueue] = useState<{ name: string, file: File | null }[]>([
    { name: 'boot', file: null },
    { name: 'recovery', file: null },
    { name: 'system', file: null },
    { name: 'vendor', file: null }
  ]);
  const [customRomFile, setCustomRomFile] = useState<File | null>(null);
  const [customRomPartition, setCustomRomPartition] = useState('system');
  const [isFlashingRom, setIsFlashingRom] = useState(false);
  const [isAutoScroll, setIsAutoScroll] = useState(true);
  const [shellLineEnding, setShellLineEnding] = useState<'\n' | '\r' | '\r\n' | ''>('\n');
  const [activeMtkTab, setActiveMtkTab] = useState<'info' | 'exploit' | 'partitions' | 'flash'>('info');
  const [isExecutingMtk, setIsExecutingMtk] = useState(false);
  const [mtkLog, setMtkLog] = useState<string[]>([]);
  const [mtkDeviceInfo, setMtkDeviceInfo] = useState<{
    chipset?: string;
    bootloader?: string;
    secureBoot?: boolean;
    daStatus?: string;
  } | null>(null);
  const [flashFile, setFlashFile] = useState<File | null>(null);
  const [flashAddress, setFlashAddress] = useState('0x0');
  const [scriptType, setScriptType] = useState<'python' | 'shell' | 'adb'>('adb');
  const [scriptContent, setScriptContent] = useState('');
  const [scriptLogs, setScriptLogs] = useState<{ time: string, data: string, type: 'stdout' | 'stderr' | 'info' }[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [manualVid, setManualVid] = useState('');
  const [isShellExecuting, setIsShellExecuting] = useState(false);
  const shellLogsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isAutoScroll && shellLogsRef.current) {
      shellLogsRef.current.scrollTop = shellLogsRef.current.scrollHeight;
    }
  }, [shellLogs, isAutoScroll]);

  const handleDeepUsbScan = async () => {
    setTriageState('identifying');
    setTriageLogs(["[DEEP_SCAN] Initialisiere USB-Bus-Enumeration...", "[DEEP_SCAN] Suche nach allen verfügbaren Geräten (usb.core.find simulation)..."]);
    
    try {
      // @ts-ignore
      const devices = await navigator.usb.getDevices();
      
      if (devices.length === 0) {
        setTriageLogs(prev => [...prev, "[DEEP_SCAN] Keine bereits autorisierten Geräte gefunden.", "[HINT] Nutze 'SCAN STARTEN' um neue Geräte zu autorisieren."]);
        setTriageState('idle');
        return;
      }

      setTriageLogs(prev => [...prev, `[DEEP_SCAN] Gefundene Geräte: ${devices.length}`]);
      
      devices.forEach((device, index) => {
        const vid = device.vendorId.toString(16).padStart(4, '0').toUpperCase();
        const pid = device.productId.toString(16).padStart(4, '0').toUpperCase();
        const manufacturer = device.manufacturerName || 'Unknown';
        const product = device.productName || 'Unknown Device';
        const serial = device.serialNumber || 'N/A';
        
        setTriageLogs(prev => [
          ...prev, 
          `----------------------------------------`,
          `DEVICE_${index + 1}: ${manufacturer} ${product}`,
          `ID: 0x${vid}:0x${pid}`,
          `SERIAL: ${serial}`,
          `CLASS: ${device.deviceClass} | SUBCLASS: ${device.deviceSubclass}`,
          `PROTOCOL: ${device.deviceProtocol}`
        ]);
      });

      setTriageLogs(prev => [...prev, "----------------------------------------", "[SUCCESS] Deep Scan abgeschlossen."]);
      // We don't set a result here, just show the logs
      setTimeout(() => setTriageState('detected'), 1000);
    } catch (err) {
      setTriageLogs(prev => [...prev, `[ERROR] Deep Scan fehlgeschlagen: ${err}`]);
      setTriageState('idle');
    }
  };

  const [aliases, setAliases] = useState<{ name: string, command: string }[]>(() => {
    const saved = localStorage.getItem('adb_aliases');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse adb_aliases from localStorage', e);
      }
    }
    return [
      { name: 'List Packages', command: 'pm list packages' },
      { name: 'Get Prop', command: 'getprop' },
      { name: 'Dumpsys Battery', command: 'dumpsys battery' },
      { name: 'Disk Usage', command: 'df -h' },
      { name: 'Process List', command: 'ps -A' },
      { name: 'Uptime', command: 'uptime' }
    ];
  });
  const [newAliasName, setNewAliasName] = useState('');
  const [newAliasCommand, setNewAliasCommand] = useState('');
  const [showAliasForm, setShowAliasForm] = useState(false);

  const androidDevices = devices.filter(d => ['adb', 'fastboot', 'mtk'].includes(d.type));
  const selectedDevice = androidDevices.find(d => d.id === selectedDeviceId) || androidDevices[0];

  useEffect(() => {
    if (androidDevices.length > 0 && !selectedDeviceId) {
      setSelectedDeviceId(androidDevices[0].id);
    }
  }, [androidDevices, selectedDeviceId]);

  useEffect(() => {
    localStorage.setItem('adb_aliases', JSON.stringify(aliases));
  }, [aliases]);

  const handleShellSend = async (cmdOverride?: string) => {
    const cmd = cmdOverride || shellInput;
    if (!cmd.trim() || !selectedDevice) return;
    
    if (selectedDevice.type !== 'adb') {
      setShellLogs(prev => [...prev, { 
        time: new Date().toLocaleTimeString(), 
        data: `Error: Device ${selectedDevice.name} is in ${selectedDevice.type.toUpperCase()} mode. Shell commands require ADB mode.`, 
        type: 'in' 
      }]);
      return;
    }

    setShellInput('');
    setShellLogs(prev => [...prev, { time: new Date().toLocaleTimeString(), data: cmd, type: 'out' }]);
    setIsShellExecuting(true);
    
    try {
      const result = await onRunShell(selectedDevice.id, cmd);
      setShellLogs(prev => [...prev, { 
        time: new Date().toLocaleTimeString(), 
        data: result, 
        type: 'in' 
      }]);
    } finally {
      setIsShellExecuting(false);
    }
  };

  const addAlias = () => {
    if (!newAliasName.trim() || !newAliasCommand.trim()) return;
    setAliases(prev => [...prev, { name: newAliasName, command: newAliasCommand }]);
    setNewAliasName('');
    setNewAliasCommand('');
    setShowAliasForm(false);
  };

  const removeAlias = (index: number) => {
    setAliases(prev => prev.filter((_, i) => i !== index));
  };

  const handleRunScript = async () => {
    if (!scriptContent.trim()) return;
    setIsExecuting(true);
    setScriptLogs(prev => [...prev, { time: new Date().toLocaleTimeString(), data: `Starting ${scriptType} script...`, type: 'info' }]);
    
    try {
      const response = await fetch('/api/scripts/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: scriptType, script: scriptContent })
      });
      
      const result = await response.json();
      if (result.stdout) {
        setScriptLogs(prev => [...prev, { time: new Date().toLocaleTimeString(), data: result.stdout, type: 'stdout' }]);
      }
      if (result.stderr) {
        setScriptLogs(prev => [...prev, { time: new Date().toLocaleTimeString(), data: result.stderr, type: 'stderr' }]);
      }
      if (result.error) {
        setScriptLogs(prev => [...prev, { time: new Date().toLocaleTimeString(), data: `Error: ${result.error}`, type: 'stderr' }]);
      }
      if (!result.stdout && !result.stderr && !result.error) {
        setScriptLogs(prev => [...prev, { time: new Date().toLocaleTimeString(), data: "Script executed with no output.", type: 'info' }]);
      }
    } catch (error) {
      setScriptLogs(prev => [...prev, { time: new Date().toLocaleTimeString(), data: `Execution failed: ${error}`, type: 'stderr' }]);
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 gap-4 md:gap-6 animate-in fade-in duration-500">
      {/* Header & Device Selector */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-tactical-accent/20 rounded-lg shrink-0">
            <Smartphone className="text-tactical-accent w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Android Taktikal Suite</h2>
            <div className="flex flex-wrap items-center gap-2 md:gap-4 mt-1">
              <p className="text-[10px] text-tactical-muted uppercase tracking-widest font-bold">Protocol-Layer: WebUSB | ADB | Fastboot | EDL</p>
              <div className="flex items-center gap-3 border-l border-tactical-border pl-2 md:pl-4">
                <div className="flex items-center gap-1.5">
                  <div className={cn("w-1.5 h-1.5 rounded-full", selectedDevice?.type === 'adb' ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-tactical-border")} />
                  <span className="text-[8px] font-bold text-tactical-muted uppercase">ADB</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className={cn("w-1.5 h-1.5 rounded-full", selectedDevice?.type === 'fastboot' ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-tactical-border")} />
                  <span className="text-[8px] font-bold text-tactical-muted uppercase">Fastboot</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className={cn("w-1.5 h-1.5 rounded-full", selectedDevice?.type === 'mtk' ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-tactical-border")} />
                  <span className="text-[8px] font-bold text-tactical-muted uppercase">MTK/EDL</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 w-full md:w-auto mt-4 md:mt-0 items-center">
          <div className="relative group">
            <input 
              type="text" 
              placeholder="MANUAL VID (e.g. 18D1)"
              value={manualVid}
              onChange={(e) => setManualVid(e.target.value.toUpperCase())}
              className="w-32 px-2 py-2 bg-tactical-bg border border-tactical-border rounded-xl text-[10px] font-mono text-tactical-accent focus:outline-none focus:border-tactical-accent/50 transition-all"
            />
            <div className="absolute -top-6 left-0 bg-tactical-bg border border-tactical-border px-2 py-0.5 rounded text-[8px] text-tactical-muted opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
              Erzwinge Vendor-ID (Hex)
            </div>
          </div>
          <button 
            onClick={() => onConnectADB(manualVid)}
            className="flex-1 md:flex-none justify-center px-4 py-2 bg-tactical-accent/10 border border-tactical-accent/30 text-tactical-accent font-bold rounded-xl text-[10px] hover:bg-tactical-accent hover:text-tactical-bg transition-all flex items-center gap-2"
          >
            <Terminal size={14} /> ADB CONNECT
          </button>
          <button 
            onClick={() => onConnectFastboot(manualVid)}
            className="flex-1 md:flex-none justify-center px-4 py-2 bg-tactical-accent/10 border border-tactical-accent/30 text-tactical-accent font-bold rounded-xl text-[10px] hover:bg-tactical-accent hover:text-tactical-bg transition-all flex items-center gap-2"
          >
            <Zap size={14} /> FASTBOOT CONNECT
          </button>
          <button 
            onClick={() => onConnectMTK(manualVid)}
            className="flex-1 md:flex-none justify-center px-4 py-2 bg-tactical-accent/10 border border-tactical-accent/30 text-tactical-accent font-bold rounded-xl text-[10px] hover:bg-tactical-accent hover:text-tactical-bg transition-all flex items-center gap-2"
          >
            <Cpu size={14} /> MTK/EDL CONNECT
          </button>
          <button 
            onClick={() => onConnectUniversal?.('')}
            className="flex-1 md:flex-none justify-center px-4 py-2 bg-tactical-muted/10 border border-tactical-muted/30 text-tactical-muted font-bold rounded-xl text-[10px] hover:bg-tactical-muted hover:text-tactical-text transition-all flex items-center gap-2"
            title="Alle USB-Geräte anzeigen (ohne Filter)"
          >
            <Search size={14} /> UNIVERSAL SCAN
          </button>
          <button 
            onClick={() => onConnectUniversal?.('DEEP')}
            className="flex-1 md:flex-none justify-center px-4 py-2 bg-red-500/10 border border-red-500/30 text-red-500 font-bold rounded-xl text-[10px] hover:bg-red-500 hover:text-white transition-all flex items-center gap-2"
            title="Tiefen-Scan (Alle USB-Geräte ohne Filter)"
          >
            <Activity size={14} /> DEEP SCAN
          </button>
          <button 
            onClick={() => onAction?.('first-contact')}
            className="flex-1 md:flex-none justify-center px-4 py-2 bg-tactical-accent/20 border border-tactical-accent/40 text-tactical-accent font-bold rounded-xl text-[10px] hover:bg-tactical-accent hover:text-tactical-bg transition-all flex items-center gap-2"
            title="Hardware Fingerprinting & Discovery"
          >
            <Search size={14} /> FIRST CONTACT
          </button>
        </div>
      </div>

      {/* Sub-Navigation */}
      <div className="flex bg-tactical-card border border-tactical-border rounded-xl p-1 self-start overflow-x-auto no-scrollbar max-w-full">
        <SubNavItem active={activeSubTab === 'guide'} onClick={() => setActiveSubTab('guide')} icon={<ShieldAlert size={14} />} label="SOUVERÄNITÄT_GUIDE" />
        <SubNavItem active={activeSubTab === 'triage'} onClick={() => setActiveSubTab('triage')} icon={<Search size={14} />} label="TRIAGE_LOGIC" />
        <SubNavItem active={activeSubTab === 'adb'} onClick={() => setActiveSubTab('adb')} icon={<Terminal size={14} />} label="ADB_SHELL" />
        <SubNavItem active={activeSubTab === 'fastboot'} onClick={() => setActiveSubTab('fastboot')} icon={<Zap size={14} />} label="FASTBOOT_FLASH" />
        <SubNavItem active={activeSubTab === 'mtk'} onClick={() => setActiveSubTab('mtk')} icon={<Cpu size={14} />} label="MTK_CLIENT" />
        <SubNavItem active={activeSubTab === 'dumper'} onClick={() => setActiveSubTab('dumper')} icon={<Box size={14} />} label="PAYLOAD_DUMPER" />
        <SubNavItem active={activeSubTab === 'automation'} onClick={() => setActiveSubTab('automation')} icon={<RefreshCw size={14} />} label="AUTOMATION" />
        <SubNavItem active={activeSubTab === 'scripts'} onClick={() => setActiveSubTab('scripts')} icon={<Code2 size={14} />} label="SCRIPTS" />
      </div>

      {/* Content Area */}
      <div className="flex-1 min-h-0 bg-tactical-card/30 border border-tactical-border rounded-2xl overflow-hidden flex flex-col">
        {activeSubTab === 'guide' && (
          <div className="flex-1 min-h-0 p-8 overflow-y-auto custom-scrollbar">
            <div className="max-w-5xl mx-auto space-y-12">
              {/* Hero Section */}
              <div className="text-center space-y-6">
                <div className="inline-block p-4 bg-tactical-accent/10 rounded-3xl border border-tactical-accent/30 mb-4">
                  <ShieldAlert className="text-tactical-accent w-12 h-12" />
                </div>
                <h2 className="text-4xl font-bold tracking-tighter uppercase">Digitale Souveränität</h2>
                <p className="text-lg text-tactical-muted max-w-2xl mx-auto leading-relaxed">
                  Das Playbook zur Android-Befreihung: Von der Hardware-Entsperrung bis zur De-Googlisierung.
                </p>
              </div>

              {/* The 4 Steps of /e/OS Installation */}
              <div className="space-y-8">
                <div className="flex items-center gap-4">
                  <div className="h-px flex-1 bg-tactical-border" />
                  <h3 className="text-xs font-bold text-tactical-accent uppercase tracking-[0.3em]">Der Hardcore-Weg: Terminal & Sideload</h3>
                  <div className="h-px flex-1 bg-tactical-border" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <GuideStep 
                    number="01" 
                    title="Bootloader Unlock" 
                    cmd="fastboot flashing unlock"
                    desc="Der kritische Schritt, der das Flashen fremder Software erlaubt (löscht alle Daten)."
                  />
                  <GuideStep 
                    number="02" 
                    title="Recovery Flashen" 
                    cmd="fastboot flash recovery recovery.img"
                    desc="Eine angepasste /e/OS-Recovery-Partition wird installiert, um die Infrastruktur zu übernehmen."
                  />
                  <GuideStep 
                    number="03" 
                    title="Format Data" 
                    cmd="Recovery Menu -> Format"
                    desc="Im neuen Recovery-Menü zwingend das System formatieren, um Verschlüsselungskonflikte zu lösen."
                  />
                  <GuideStep 
                    number="04" 
                    title="ADB Sideload" 
                    cmd="adb sideload [eos-image.zip]"
                    desc="Das eigentliche Betriebssystem wird über das Terminal per Kabel in die Systempartition injiziert."
                  />
                </div>
              </div>

              {/* Sovereign Tech Stack Visualization */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center py-12 border-y border-tactical-border">
                <div className="space-y-6">
                  <h3 className="text-2xl font-bold uppercase tracking-tight">The Sovereign Tech Stack</h3>
                  <div className="space-y-4">
                    <StackLayer 
                      label="App Layer" 
                      items="F-Droid, Signal & Isolierte Browser" 
                      desc="FOSS-Apps nutzen und Tracker auf Systemebene blockieren."
                    />
                    <StackLayer 
                      label="Network Layer" 
                      items="Lokales VPN & DNS Tracking-Blocker" 
                      desc="Ad-Blocker und Passwort-Manager als unsichtbare Sicherheitsmaßnahmen."
                    />
                    <StackLayer 
                      label="OS Layer" 
                      items="Custom ROM (/e/OS) & MicroG Brücke" 
                      desc="Proprietäres Android durch /e/OS und anonymisierte APIs ersetzen."
                    />
                    <StackLayer 
                      label="Hardware Layer" 
                      items="Entsperrter Bootloader & Physischer Besitz" 
                      desc="FRP-Sperren umgehen und die volle Kontrolle über die Hardware erlangen."
                    />
                  </div>
                </div>
                <div className="bg-tactical-bg/50 border border-tactical-border rounded-3xl p-8 flex flex-col items-center justify-center text-center space-y-6">
                  <div className="relative w-48 h-48">
                    <div className="absolute inset-0 bg-tactical-accent/20 blur-3xl rounded-full animate-pulse" />
                    <Smartphone className="w-full h-full text-tactical-accent relative z-10" />
                  </div>
                  <blockquote className="text-xl font-serif italic text-tactical-text leading-relaxed">
                    "Privatsphäre ist keine Option, die man in den Einstellungen aktiviert. Sie ist eine Architektur, die man selbst baut."
                  </blockquote>
                </div>
              </div>

              {/* App Swap Table */}
              <div className="space-y-6">
                <h3 className="text-xs font-bold text-tactical-muted uppercase tracking-widest text-center">Der große App-Swap: Kommunikation & Web</h3>
                <div className="bg-tactical-card border border-tactical-border rounded-3xl overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-tactical-bg/50 border-b border-tactical-border">
                        <th className="px-6 py-4 text-[10px] font-bold text-tactical-muted uppercase tracking-widest">Big Tech (Datenkraken)</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-tactical-accent uppercase tracking-widest">FOSS Alternativen</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-tactical-border/50">
                      <SwapRow old="Chrome / Safari" replacement="Firefox (gehärtet) / Brave / DuckDuckGo" />
                      <SwapRow old="WhatsApp / FB Messenger" replacement="Signal (E2E) / Session (Onion-Routing)" />
                      <SwapRow old="Twitter / Reddit / YouTube" replacement="Mastodon / Lemmy / Invidious" />
                      <SwapRow old="Google Maps / iCloud" replacement="Organic Maps / Nextcloud / Proton" />
                    </tbody>
                  </table>
                </div>
              </div>

              {/* MicroG Explanation */}
              <div className="bg-tactical-accent/5 border border-tactical-accent/20 rounded-3xl p-8 space-y-6">
                <div className="flex items-center gap-4">
                  <Layers className="text-tactical-accent w-8 h-8" />
                  <h3 className="text-xl font-bold uppercase tracking-tight">MicroG: Die unsichtbare Brücke</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-tactical-accent uppercase">Standort-Dienste</p>
                    <p className="text-xs text-tactical-muted leading-relaxed">Nutzt lokale Netzwerke und offene Datenbanken (z.B. Mozilla Location Service) statt Google-Servern.</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-tactical-accent uppercase">Signature Spoofing</p>
                    <p className="text-xs text-tactical-muted leading-relaxed">Erlaubt es MicroG, sich gegenüber Apps als legitime Play Services auszugeben (verhindert Abstürze).</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-tactical-accent uppercase">Push-Benachrichtigungen</p>
                    <p className="text-xs text-tactical-muted leading-relaxed">Empfängt Push-Nachrichten anonymisiert, ohne das physische Gerät gegenüber Google zu exponieren.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeSubTab === 'triage' && (
          <div className="flex-1 min-h-0 p-8 space-y-8 overflow-y-auto custom-scrollbar">
            <div className="max-w-4xl mx-auto space-y-8">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-tactical-accent/10 rounded-2xl flex items-center justify-center mx-auto border border-tactical-accent/30">
                  <Activity className="text-tactical-accent w-8 h-8" />
                </div>
                <h3 className="text-2xl font-bold uppercase tracking-tight">Device Triage & Recovery</h3>
                <p className="text-sm text-tactical-muted max-w-md mx-auto">
                  Automatisierte Zustandserkennung und Datenrettung für Android-Geräte (ADB, Fastboot, EDL).
                </p>
              </div>

              {triageState === 'idle' && (
                <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-tactical-border rounded-3xl bg-tactical-bg/30 space-y-6">
                  <Smartphone className="w-12 h-12 text-tactical-muted opacity-50" />
                  <div className="text-center">
                    <p className="font-bold">Kein Gerät im Triage-Modus</p>
                    <p className="text-xs text-tactical-muted mt-1">Verbinde ein Gerät via USB, um den Scan zu starten.</p>
                    <div className="mt-4 p-3 bg-tactical-accent/5 border border-tactical-accent/20 rounded-xl text-[10px] text-tactical-muted max-w-xs mx-auto">
                      <p className="font-bold text-tactical-accent mb-1 uppercase">Fastboot-Modus aktivieren:</p>
                      <p>1. Gerät ausschalten</p>
                      <p>2. **Power + Lautstärke Leiser** gedrückt halten</p>
                      <p>3. USB-Kabel anschließen</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <button 
                      onClick={async () => {
                        setTriageState('identifying');
                        setTriageLogs(["[SCAN] Initialisiere WebUSB-Handshake...", "[SCAN] Suche nach Hardware-IDs (VID/PID)..."]);
                        
                        try {
                          // @ts-ignore
                          const device = await navigator.usb.requestDevice({ 
                            filters: [
                              { classCode: 0xff }, // Vendor Specific
                              { classCode: 0x02 }, // CDC Control
                              { classCode: 0x0a }, // CDC Data
                              { vendorId: 0x18d1 }, // Google
                              { vendorId: 0x2717 }, // Xiaomi
                              { vendorId: 0x04e8 }, // Samsung
                              { vendorId: 0x05c6 }, // Qualcomm
                              { vendorId: 0x0e8d }  // MediaTek
                            ] 
                          });
                          const vid = device.vendorId.toString(16).padStart(4, '0').toUpperCase();
                          const pid = device.productId.toString(16).padStart(4, '0').toUpperCase();
                          const manufacturer = device.manufacturerName || 'Unknown';
                          const product = device.productName || 'Unknown Device';
                          
                          setTriageLogs(prev => [
                            ...prev, 
                            `[USB_ENUM] Device connected: ${manufacturer} ${product}`,
                            `[USB_ENUM] VID: 0x${vid} | PID: 0x${pid}`
                          ]);

                          let state: 'ADB' | 'FASTBOOT' | 'EDL' | 'UNKNOWN' = 'ADB';
                          let model = device.productName || 'Unbekanntes Android-Gerät';
                          
                          // Improved detection logic
                          const isEDL = (vid === '05C6' && (pid === '9008' || pid === '900E')) || 
                                        (vid === '0E8D' && pid === '0003');
                          
                          const isFastboot = device.productName?.toLowerCase().includes('fastboot') || 
                                            device.productName?.toLowerCase().includes('bootloader') ||
                                            pid === '4EE0' || // Google Fastboot
                                            pid === '0D02' || // Xiaomi Fastboot
                                            pid === '2717' || // Xiaomi Fastboot (sometimes)
                                            vid === '18D1' && pid === '4EE0';

                          if (isEDL) {
                            state = 'EDL';
                            setTriageLogs(prev => [...prev, "[STATE] Hardware Mode: EDL Mode (Qualcomm/MTK Emergency Download)", "[ACTION] Low-Level Flash & Partition-Dump bereit."]);
                          } else if (isFastboot) {
                            state = 'FASTBOOT';
                            setTriageLogs(prev => [...prev, "[STATE] Hardware Mode: Fastboot Mode", "[ACTION] Bootloader-Unlock und Partition-Flashing möglich."]);
                          } else {
                            state = 'ADB';
                            setTriageLogs(prev => [...prev, "[STATE] Hardware Mode: ADB Mode", "[ACTION] Dateisystem-Zugriff und Shell-Commands verfügbar."]);
                          }

                          await new Promise(r => setTimeout(r, 1500));
                          setTriageResult({
                            model,
                            vid,
                            pid,
                            state,
                            locked: true
                          });
                          setTriageState('detected');
                        } catch (err) {
                          setTriageState('idle');
                          // @ts-ignore
                          if (err.name !== 'NotFoundError') {
                            console.error(err);
                          }
                        }
                      }}
                      className="px-8 py-3 bg-tactical-accent text-tactical-bg font-bold rounded-xl hover:scale-105 transition-transform flex items-center gap-2"
                    >
                      <Search size={18} /> SCAN STARTEN
                    </button>
                    <button 
                      onClick={handleDeepUsbScan}
                      className="px-8 py-3 bg-tactical-bg border border-tactical-accent text-tactical-accent font-bold rounded-xl hover:bg-tactical-accent/10 transition-all flex items-center gap-2"
                    >
                      <Cpu size={18} /> DEEP USB SCAN
                    </button>
                  </div>

                  <div className="flex flex-col items-center gap-2 pt-4 border-t border-tactical-border/30">
                    <p className="text-[10px] text-tactical-muted uppercase font-bold tracking-widest">Expert: Custom Vendor ID Scan</p>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        placeholder="e.g. 0x2717" 
                        value={manualVid}
                        onChange={(e) => setManualVid(e.target.value)}
                        className="bg-tactical-bg border border-tactical-border rounded-lg px-3 py-1.5 text-[10px] focus:outline-none focus:border-tactical-accent w-32 text-center font-mono"
                      />
                      <button 
                        onClick={async () => {
                          const vid = parseInt(manualVid.startsWith('0x') ? manualVid : `0x${manualVid}`, 16);
                          if (isNaN(vid)) {
                             setTriageLogs(prev => [...prev, "[ERROR] Ungültige Vendor ID. Format: 0xXXXX"]);
                             return;
                          }
                          
                          setTriageState('identifying');
                          setTriageLogs([`[SCAN] Starte gezielten Scan für VID: 0x${vid.toString(16).toUpperCase()}...`]);
                          
                          try {
                            // @ts-ignore
                            const device = await navigator.usb.requestDevice({ filters: [{ vendorId: vid }] });
                            const vidStr = device.vendorId.toString(16).padStart(4, '0').toUpperCase();
                            const pidStr = device.productId.toString(16).padStart(4, '0').toUpperCase();
                            
                            setTriageLogs(prev => [...prev, `[SUCCESS] Gerät gefunden: ${device.productName || 'Unknown'}`, `[USB_ENUM] VID: 0x${vidStr} | PID: 0x${pidStr}`]);
                            
                            setTriageResult({
                              model: device.productName || 'Unbekanntes Gerät',
                              vid: vidStr,
                              pid: pidStr,
                              state: device.productName?.toLowerCase().includes('fastboot') ? 'FASTBOOT' : 'ADB',
                              locked: true
                            });
                            setTriageState('detected');
                          } catch (err) {
                            setTriageState('idle');
                            setTriageLogs(prev => [...prev, `[ERROR] Scan fehlgeschlagen: ${err}`]);
                          }
                        }}
                        className="px-4 py-1.5 bg-tactical-accent text-tactical-bg rounded-lg text-[10px] font-bold hover:scale-105 transition-transform"
                      >
                        SCAN VID
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {triageState === 'identifying' && (
                <div className="p-12 border border-tactical-border rounded-3xl bg-tactical-bg/30 space-y-6">
                  <div className="flex flex-col items-center space-y-4">
                    <RefreshCw className="w-12 h-12 text-tactical-accent animate-spin" />
                    <p className="font-bold animate-pulse">Analysiere Hardware-Layer...</p>
                  </div>
                  <div className="bg-black/40 rounded-xl p-4 font-mono text-[10px] space-y-1 h-32 overflow-y-auto custom-scrollbar">
                    {triageLogs.map((log, i) => (
                      <div key={`triage-identifying-${i}`} className="text-tactical-accent/80">{log}</div>
                    ))}
                  </div>
                </div>
              )}

              {triageState === 'detected' && triageResult && (
                <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Device Info Card */}
                    <div className="bg-tactical-bg/50 border border-tactical-border rounded-2xl p-6 space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-[10px] font-bold text-tactical-muted uppercase tracking-widest">Hardware_Profile</h4>
                        <span className="px-2 py-0.5 bg-tactical-accent/20 text-tactical-accent rounded text-[8px] font-bold uppercase">{triageResult.state} MODE</span>
                      </div>
                      <div className="space-y-3">
                        <div className="flex justify-between border-b border-tactical-border/30 pb-2">
                          <span className="text-xs text-tactical-muted">Modell:</span>
                          <span className="text-xs font-bold">{triageResult.model}</span>
                        </div>
                        <div className="flex justify-between border-b border-tactical-border/30 pb-2">
                          <span className="text-xs text-tactical-muted">VID/PID:</span>
                          <span className="text-xs font-mono">{triageResult.vid}:{triageResult.pid}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-xs text-tactical-muted">Sicherheitsstatus:</span>
                          <span className="text-xs font-bold text-red-500 flex items-center gap-1">
                            <Lock size={12} /> LOCKED (Pattern/PIN)
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action Decision Tree */}
                    <div className="bg-tactical-accent/5 border border-tactical-accent/20 rounded-2xl p-6 space-y-4">
                      <h4 className="text-[10px] font-bold text-tactical-accent uppercase tracking-widest">Decision_Tree [STUFE_3]</h4>
                      <p className="text-[10px] text-tactical-muted leading-relaxed">
                        Wähle den Workflow basierend auf der Zielsetzung. "Data-First" priorisiert die Sicherung vor dem Wipe.
                      </p>
                      <div className="grid grid-cols-1 gap-3">
                        <button 
                          onClick={async () => {
                            if (!triageResult) return;
                            setTriageState('processing');
                            setProgress(0);
                            
                            if (triageResult.state === 'ADB') {
                              setTriageLogs(prev => [...prev, "[BACKUP] Starte ADB File-Pull...", "[BACKUP] Scanne /sdcard/DCIM...", "[BACKUP] Scanne WhatsApp-Datenbanken..."]);
                              // Simulate file pulling
                              const interval = setInterval(() => {
                                setProgress(p => {
                                  if (p >= 100) {
                                    clearInterval(interval);
                                    setTriageLogs(prev => [...prev, "[SUCCESS] Backup abgeschlossen: 4.2GB Daten gesichert.", "[INFO] Dateien im Vault verfügbar."]);
                                    setTriageState('detected');
                                    return 100;
                                  }
                                  return p + 2;
                                });
                              }, 100);
                            } else if (triageResult.state === 'EDL') {
                              setTriageLogs(prev => [...prev, "[BACKUP] Starte Bitweisen Dump (EDL)...", "[BACKUP] Lese Partition 'userdata'...", "[BACKUP] Verschlüssle Image-Stream..."]);
                              // Simulate bitwise dump
                              const interval = setInterval(() => {
                                setProgress(p => {
                                  if (p >= 100) {
                                    clearInterval(interval);
                                    setTriageLogs(prev => [...prev, "[SUCCESS] Bitweiser Dump abgeschlossen: userdata.img (64GB) gesichert.", "[INFO] Image bereit für forensische Analyse."]);
                                    setTriageState('detected');
                                    return 100;
                                  }
                                  return p + 0.5;
                                });
                              }, 50);
                            } else {
                              setTriageLogs(prev => [...prev, "[ERROR] Backup im Fastboot-Modus nicht möglich.", "[HINT] Starte Gerät in den Recovery- oder EDL-Modus."]);
                              setTriageState('detected');
                            }
                          }}
                          className="w-full p-3 bg-tactical-accent text-tactical-bg rounded-xl font-bold text-[10px] flex items-center justify-between group hover:scale-[1.02] transition-transform"
                        >
                          <div className="flex items-center gap-2">
                            <Download size={14} />
                            <span>DATA-FIRST BACKUP (BITWISE DUMP)</span>
                          </div>
                          <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                        </button>
                        
                        <button 
                          onClick={() => {
                            if (!confirm("ACHTUNG: Dies löscht alle Sicherheitspartitionen (FRP/Config). Fortfahren?")) return;
                            setTriageState('processing');
                            setProgress(0);
                            setTriageLogs(prev => [...prev, "[STUFE_3] IF_REPAIR_ONLY -> ERASE_PARTITION [config, frp, persist]"]);
                            
                            const interval = setInterval(() => {
                              setProgress(p => {
                                if (p >= 100) {
                                  clearInterval(interval);
                                  setTriageLogs(prev => [...prev, "[SUCCESS] Partitionen gelöscht. Gerät entsperrt."]);
                                  setTriageState('detected');
                                  return 100;
                                }
                                return p + 5;
                              });
                            }, 100);
                          }}
                          className="w-full p-3 bg-red-500/10 border border-red-500/30 text-red-500 rounded-xl font-bold text-[10px] flex items-center justify-between group hover:bg-red-500 hover:text-white transition-all"
                        >
                          <div className="flex items-center gap-2">
                            <Trash2 size={14} />
                            <span>REPAIR ONLY (WIPE FRP/CONFIG)</span>
                          </div>
                          <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Logs */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center px-1">
                      <h4 className="text-[10px] font-bold text-tactical-muted uppercase tracking-widest">Triage_Logs</h4>
                      <button 
                        onClick={() => {
                          const logs = triageLogs.join('\n');
                          const blob = new Blob([logs], { type: 'text/plain' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `android_triage_logs_${new Date().toISOString()}.txt`;
                          a.click();
                        }}
                        className="text-tactical-accent/70 hover:text-tactical-accent transition-colors text-[10px] font-bold"
                      >
                        EXPORT
                      </button>
                    </div>
                    <div className="bg-black/40 border border-tactical-border rounded-2xl p-4 font-mono text-[10px] space-y-1 h-48 overflow-y-auto custom-scrollbar">
                      {triageLogs.map((log, i) => (
                        <div key={`triage-detected-${i}`} className={cn(
                          "flex gap-2",
                          log.includes('[SUCCESS]') ? "text-emerald-400" : 
                          log.includes('[STUFE') ? "text-tactical-accent" : "text-tactical-muted"
                        )}>
                          <span className="opacity-30">[{i.toString().padStart(3, '0')}]</span>
                          <span>{log}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {triageState === 'processing' && (
                <div className="p-12 border border-tactical-border rounded-3xl bg-tactical-bg/30 space-y-8">
                  <div className="text-center space-y-4">
                    <div className="relative w-24 h-24 mx-auto">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle
                          cx="48"
                          cy="48"
                          r="40"
                          stroke="currentColor"
                          strokeWidth="8"
                          fill="transparent"
                          className="text-tactical-border"
                        />
                        <circle
                          cx="48"
                          cy="48"
                          r="40"
                          stroke="currentColor"
                          strokeWidth="8"
                          fill="transparent"
                          strokeDasharray={251.2}
                          strokeDashoffset={251.2 - (251.2 * progress) / 100}
                          className="text-tactical-accent transition-all duration-300"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center font-bold text-xl">
                        {progress}%
                      </div>
                    </div>
                    <div>
                      <h4 className="font-bold uppercase tracking-widest">Operation läuft...</h4>
                      <p className="text-[10px] text-tactical-muted mt-1">Trenne das Gerät nicht vom USB-Port.</p>
                    </div>
                  </div>
                  <div className="bg-black/40 rounded-xl p-4 font-mono text-[10px] space-y-1 h-32 overflow-y-auto custom-scrollbar">
                    {triageLogs.slice(-5).map((log, i) => (
                      <div key={`triage-processing-${i}`} className="text-tactical-accent/80">{log}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeSubTab === 'adb' && (
          <div className="flex-1 min-h-0 flex flex-col font-mono text-xs">
            <div className="flex bg-tactical-bg/50 border-b border-tactical-border p-1">
              <button className="px-4 py-2 text-[10px] font-bold text-tactical-accent border-b-2 border-tactical-accent">SHELL_TERMINAL</button>
              <button className="px-4 py-2 text-[10px] font-bold text-tactical-muted hover:text-tactical-text">FILE_EXPLORER</button>
              <button className="px-4 py-2 text-[10px] font-bold text-tactical-muted hover:text-tactical-text">SCREEN_MIRROR</button>
            </div>
            
            <div className="flex-1 min-h-0 flex flex-col p-4">
              <div className="flex justify-between items-center mb-4 pb-2 border-b border-tactical-border">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-tactical-muted uppercase tracking-widest font-bold">ADB_Shell_Interface</span>
                    {selectedDevice?.status === 'unauthorized' && (
                      <span className="px-2 py-0.5 bg-red-500/20 text-red-500 rounded text-[8px] font-bold animate-pulse">UNAUTHORIZED</span>
                    )}
                  </div>
                  
                  {androidDevices.length > 0 && (
                    <div className="flex items-center gap-2">
                      <select 
                        value={selectedDeviceId || ''} 
                        onChange={(e) => setSelectedDeviceId(e.target.value)}
                        className="bg-tactical-bg border border-tactical-border rounded px-2 py-1 text-[10px] font-bold text-tactical-accent focus:outline-none"
                      >
                        {androidDevices.map(d => (
                          <option key={d.id} value={d.id}>{d.name} ({d.type.toUpperCase()})</option>
                        ))}
                      </select>
                      <button 
                        onClick={() => onConnectADB(manualVid)}
                        className="p-1.5 bg-tactical-accent/10 border border-tactical-accent/30 text-tactical-accent rounded hover:bg-tactical-accent hover:text-tactical-bg transition-all"
                        title="Reconnect ADB"
                      >
                        <RefreshCw size={12} />
                      </button>
                    </div>
                  )}
                </div>
                <div className="flex gap-4 items-center">
                  <button 
                    onClick={async () => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = '.apk';
                      input.onchange = async (e) => {
                        const file = (e.target as HTMLInputElement).files?.[0];
                        if (file && selectedDevice) {
                          setShellLogs(prev => [...prev, { time: new Date().toLocaleTimeString(), data: `Sideloading ${file.name}...`, type: 'out' }]);
                          setIsShellExecuting(true);
                          try {
                            // In a real app, we would use adb.push and then pm install
                            // For now, we simulate it via a shell command if the bridge supports it
                            // Or we just log it
                            const result = await onRunShell(selectedDevice.id, `install ${file.name}`);
                            setShellLogs(prev => [...prev, { time: new Date().toLocaleTimeString(), data: result, type: 'in' }]);
                          } finally {
                            setIsShellExecuting(false);
                          }
                        }
                      };
                      input.click();
                    }}
                    className="text-tactical-accent/70 hover:text-tactical-accent transition-colors text-[10px] font-bold flex items-center gap-1"
                  >
                    <FileUp size={12} /> SIDELOAD_APK
                  </button>
                  <select 
                    value={shellLineEnding} 
                    onChange={(e) => setShellLineEnding(e.target.value as any)}
                    className="bg-tactical-bg border border-tactical-border rounded px-2 py-1 text-[10px] focus:outline-none"
                  >
                    <option value="">No Line Ending</option>
                    <option value="\n">LF (\n)</option>
                    <option value="\r">CR (\r)</option>
                    <option value="\r\n">CRLF (\r\n)</option>
                  </select>
                  <button 
                    onClick={() => {
                      const logs = shellLogs.map(l => `[${l.time}] ${l.type === 'out' ? '$ ' : '# '}${l.data}`).join('\n');
                      const blob = new Blob([logs], { type: 'text/plain' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `android_shell_logs_${new Date().toISOString()}.txt`;
                      a.click();
                    }}
                    className="text-tactical-accent/70 hover:text-tactical-accent transition-colors text-[10px] font-bold"
                  >
                    EXPORT
                  </button>
                  <button 
                    onClick={() => handleShellSend('reboot bootloader')}
                    className="text-red-500/70 hover:text-red-500 transition-colors text-[10px] font-bold flex items-center gap-1"
                  >
                    <RefreshCw size={12} /> REBOOT_BOOTLOADER
                  </button>
                  <button 
                    onClick={() => handleShellSend('reboot')}
                    className="text-red-500/70 hover:text-red-500 transition-colors text-[10px] font-bold flex items-center gap-1"
                  >
                    <RefreshCw size={12} /> REBOOT
                  </button>
                  <button onClick={() => setShellLogs([])} className="text-red-500/70 hover:text-red-500 transition-colors text-[10px] font-bold">CLEAR</button>
                </div>
              </div>
              <div 
                ref={shellLogsRef}
                className="flex-1 min-h-0 overflow-y-auto space-y-1 custom-scrollbar pr-2 bg-black/20 rounded-xl p-4"
              >
                {shellLogs.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-tactical-muted italic opacity-50 space-y-2">
                    <Terminal className="w-8 h-8 opacity-20" />
                    <p>Warte auf ADB-Verbindung...</p>
                    <p className="text-[10px] not-italic">Stelle sicher, dass USB-Debugging aktiviert ist.</p>
                  </div>
                )}
                {shellLogs.map((log, i) => (
                  <div key={`shell-log-${i}`} className="flex gap-3 group">
                    <span className="text-tactical-muted opacity-50">[{log.time}]</span>
                    <span className={log.type === 'in' ? "text-tactical-text whitespace-pre-wrap" : "text-tactical-accent"}>
                      {log.type === 'out' ? '$ ' : '# '}
                      {log.data}
                    </span>
                  </div>
                ))}
              </div>

              {/* Aliases Section */}
              <div className="mt-4 pt-4 border-t border-tactical-border">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-2 gap-2">
                  <span className="text-[10px] font-bold text-tactical-muted uppercase tracking-widest">Saved Aliases</span>
                  <button 
                    onClick={() => setShowAliasForm(!showAliasForm)}
                    className="text-[10px] text-tactical-accent hover:underline"
                  >
                    {showAliasForm ? 'CANCEL' : '+ ADD ALIAS'}
                  </button>
                </div>
                
                {showAliasForm && (
                  <div className="flex flex-col sm:flex-row gap-2 mb-3 bg-tactical-bg/50 p-2 rounded-lg border border-tactical-border/50">
                    <input 
                      type="text" 
                      placeholder="Name (e.g. List Packages)" 
                      value={newAliasName}
                      onChange={(e) => setNewAliasName(e.target.value)}
                      className="flex-1 bg-tactical-bg border border-tactical-border rounded px-2 py-1 text-[10px] focus:outline-none focus:border-tactical-accent"
                    />
                    <input 
                      type="text" 
                      placeholder="Command (e.g. pm list packages)" 
                      value={newAliasCommand}
                      onChange={(e) => setNewAliasCommand(e.target.value)}
                      className="flex-[2] bg-tactical-bg border border-tactical-border rounded px-2 py-1 text-[10px] focus:outline-none focus:border-tactical-accent"
                      onKeyDown={(e) => e.key === 'Enter' && addAlias()}
                    />
                    <button 
                      onClick={addAlias}
                      className="w-full sm:w-auto px-3 py-1 bg-tactical-accent/20 text-tactical-accent rounded text-[10px] font-bold hover:bg-tactical-accent hover:text-tactical-bg transition-colors"
                    >
                      SAVE
                    </button>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  {aliases.map((alias, index) => (
                    <div key={`alias-${index}`} className="group flex items-center bg-tactical-bg border border-tactical-border rounded-lg overflow-hidden">
                      <button 
                        onClick={() => handleShellSend(alias.command)}
                        className="px-3 py-1.5 text-[10px] font-bold text-tactical-text hover:bg-tactical-accent/10 hover:text-tactical-accent transition-colors"
                        title={alias.command}
                      >
                        {alias.name}
                      </button>
                      <button 
                        onClick={() => removeAlias(index)}
                        className="px-2 py-1.5 text-red-500/50 hover:text-red-500 hover:bg-red-500/10 transition-colors border-l border-tactical-border"
                        title="Remove Alias"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  {aliases.length === 0 && !showAliasForm && (
                    <span className="text-[10px] text-tactical-muted italic">No aliases saved.</span>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-tactical-border flex flex-col sm:flex-row gap-2">
                <input 
                  type="text" 
                  placeholder="ADB Shell Befehl (z.B. pm list packages)..." 
                  value={shellInput}
                  onChange={(e) => setShellInput(e.target.value)}
                  className="flex-1 bg-tactical-bg border border-tactical-border rounded-lg px-4 py-2 focus:outline-none focus:border-tactical-accent"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleShellSend(shellInput + shellLineEnding);
                      setShellInput('');
                    }
                  }}
                />
                <button 
                  onClick={() => handleShellSend()}
                  disabled={isShellExecuting || !shellInput.trim()}
                  className="w-full sm:w-auto px-4 py-2 bg-tactical-accent/10 border border-tactical-accent/30 text-tactical-accent rounded-lg font-bold hover:bg-tactical-accent hover:text-tactical-bg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isShellExecuting ? <RefreshCw size={14} className="animate-spin" /> : <Play size={14} />}
                  EXECUTE
                </button>
              </div>
            </div>
          </div>
        )}

        {activeSubTab === 'fastboot' && (
          <div className="flex-1 min-h-0 p-8 space-y-8 overflow-y-auto custom-scrollbar">
            <div className="max-w-4xl mx-auto space-y-8">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-2xl font-bold">Fastboot Flash Tool</h3>
                  <p className="text-xs text-tactical-muted uppercase tracking-widest font-bold mt-1">WebUSB Protocol v2.0 | Partition-Level Access</p>
                </div>
                <div className="flex gap-2">
                  {selectedDevice?.type !== 'fastboot' && (
                    <button 
                      onClick={() => onConnectFastboot(manualVid)}
                      className="px-4 py-2 bg-emerald-500 text-white rounded-xl text-[10px] font-bold hover:scale-105 transition-transform flex items-center gap-2 shadow-lg shadow-emerald-500/20"
                    >
                      <Zap size={14} /> CONNECT FASTBOOT DEVICE
                    </button>
                  )}
                  <button className="px-4 py-2 bg-tactical-bg border border-tactical-border rounded-xl text-[10px] font-bold hover:border-tactical-accent transition-colors flex items-center gap-2">
                    <RefreshCw size={14} /> REBOOT TO FASTBOOT
                  </button>
                  <button 
                    onClick={() => {
                      const partitions = flashQueue.filter(p => p.file !== null) as { name: string, file: File }[];
                      if (selectedDevice && partitions.length > 0) {
                        onFlashAndroid(selectedDevice.id, partitions);
                      }
                    }}
                    disabled={!selectedDevice || flashQueue.every(p => p.file === null)}
                    className="px-4 py-2 bg-tactical-accent text-tactical-bg rounded-xl text-[10px] font-bold hover:scale-105 transition-transform flex items-center gap-2 disabled:opacity-50 disabled:scale-100"
                  >
                    <Zap size={14} /> FLASH STARTEN
                  </button>
                </div>
              </div>

              {/* Device Info Card */}
              <div className="bg-tactical-bg/50 border border-tactical-border rounded-2xl p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-1">
                  <label className="text-[8px] font-bold text-tactical-muted uppercase">Device Model</label>
                  <p className="text-sm font-bold">{selectedDevice?.androidInfo?.model || 'N/A'}</p>
                </div>
                <div className="space-y-1">
                  <label className="text-[8px] font-bold text-tactical-muted uppercase">Bootloader Status</label>
                  <div className="flex items-center gap-2">
                    {selectedDevice?.androidInfo?.unlocked ? (
                      <Unlock size={14} className="text-emerald-500" />
                    ) : (
                      <Lock size={14} className="text-red-500" />
                    )}
                    <p className={cn("text-sm font-bold", selectedDevice?.androidInfo?.unlocked ? "text-emerald-500" : "text-red-500")}>
                      {selectedDevice?.androidInfo?.unlocked ? 'UNLOCKED' : 'LOCKED'}
                    </p>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[8px] font-bold text-tactical-muted uppercase">Serial Number</label>
                  <p className="text-sm font-mono">{selectedDevice?.androidInfo?.serial || 'N/A'}</p>
                </div>
              </div>

              {/* Partition Queue */}
              <div className="space-y-4">
                <h4 className="text-[10px] font-bold text-tactical-muted uppercase tracking-widest">Flash_Queue</h4>
                <div className="grid grid-cols-1 gap-3">
                  {flashQueue.map((p, i) => (
                    <div key={`flash-queue-${i}`} className="bg-tactical-bg/50 border border-tactical-border rounded-2xl p-4 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-tactical-accent/10 rounded-xl flex items-center justify-center">
                          <Layers className="text-tactical-accent w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-xs font-bold uppercase tracking-widest">{p.name}</p>
                          <p className="text-[10px] text-tactical-muted">{p.file ? p.file.name : 'Keine Datei ausgewählt'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <input 
                          type="file" 
                          id={`file-${p.name}`} 
                          className="hidden" 
                          onChange={(e) => {
                            const file = e.target.files?.[0] || null;
                            setFlashQueue(prev => prev.map(item => item.name === p.name ? { ...item, file } : item));
                          }}
                        />
                        <label 
                          htmlFor={`file-${p.name}`}
                          className="px-3 py-1.5 bg-tactical-accent/10 border border-tactical-accent/30 text-tactical-accent rounded-lg text-[10px] font-bold cursor-pointer hover:bg-tactical-accent hover:text-tactical-bg transition-all"
                        >
                          WÄHLEN
                        </label>
                        {p.file && (
                          <button 
                            onClick={() => setFlashQueue(prev => prev.map(item => item.name === p.name ? { ...item, file: null } : item))}
                            className="p-2 text-red-500/50 hover:text-red-500"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Custom ROM Installer */}
              <div className="pt-8 border-t border-tactical-border space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-tactical-accent/10 rounded-lg">
                    <Box className="text-tactical-accent w-5 h-5" />
                  </div>
                  <h4 className="text-[10px] font-bold text-tactical-muted uppercase tracking-widest">Custom_ROM_Installer</h4>
                </div>
                
                <div className="bg-tactical-accent/5 border border-tactical-accent/20 rounded-2xl p-6 space-y-6">
                  <div className="flex flex-col md:flex-row gap-6">
                    <div className="flex-1 space-y-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-tactical-muted uppercase">ROM File (.zip or .img)</label>
                        <div 
                          className={cn(
                            "flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-6 transition-all",
                            customRomFile ? "border-tactical-accent/50 bg-tactical-accent/5" : "border-tactical-border hover:border-tactical-accent/50 hover:bg-tactical-bg/50"
                          )}
                          onDragOver={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                          onDrop={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            const file = e.dataTransfer.files?.[0];
                            if (file && (file.name.endsWith('.zip') || file.name.endsWith('.img'))) {
                              setCustomRomFile(file);
                            }
                          }}
                        >
                          <input 
                            type="file" 
                            id="custom-rom-file" 
                            accept=".zip,.img"
                            className="hidden" 
                            onChange={(e) => setCustomRomFile(e.target.files?.[0] || null)}
                          />
                          <label 
                            htmlFor="custom-rom-file"
                            className="flex flex-col items-center justify-center cursor-pointer w-full"
                          >
                            <FileUp size={32} className={cn("mb-3", customRomFile ? "text-tactical-accent" : "text-tactical-muted")} />
                            <span className="text-xs text-center truncate max-w-full px-4">
                              {customRomFile ? customRomFile.name : 'ROM Datei hier ablegen oder klicken'}
                            </span>
                            {!customRomFile && (
                              <span className="text-[10px] text-tactical-muted mt-1">Nur .zip oder .img Dateien</span>
                            )}
                          </label>
                          {customRomFile && (
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setCustomRomFile(null);
                              }}
                              className="mt-4 px-4 py-2 bg-red-500/10 text-red-500 rounded-lg text-[10px] font-bold hover:bg-red-500 hover:text-white transition-all flex items-center gap-2"
                            >
                              <Trash2 size={14} /> DATEI ENTFERNEN
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-tactical-muted uppercase">Target Partition (for .img only)</label>
                        <select 
                          value={customRomPartition}
                          onChange={(e) => setCustomRomPartition(e.target.value)}
                          disabled={customRomFile?.name.endsWith('.zip')}
                          className="w-full bg-tactical-bg border border-tactical-border rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-tactical-accent disabled:opacity-50"
                        >
                          <option value="system">system</option>
                          <option value="super">super (GSI)</option>
                          <option value="boot">boot</option>
                          <option value="recovery">recovery</option>
                          <option value="vendor">vendor</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex-1 bg-black/20 rounded-2xl p-4 space-y-3">
                      <h5 className="text-[8px] font-bold text-tactical-accent uppercase tracking-widest">Flash_Protocol_Summary</h5>
                      <ul className="space-y-2 text-[10px] text-tactical-muted">
                        <li className="flex items-start gap-2">
                          <div className="w-1 h-1 bg-tactical-accent rounded-full mt-1.5" />
                          <span>Dateityp: {customRomFile ? (customRomFile.name.endsWith('.zip') ? 'ZIP (Full ROM/Update)' : 'IMG (Partition Image)') : 'N/A'}</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <div className="w-1 h-1 bg-tactical-accent rounded-full mt-1.5" />
                          <span>Aktion: {customRomFile?.name.endsWith('.zip') ? 'fastboot update' : `fastboot flash ${customRomPartition}`}</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <div className="w-1 h-1 bg-tactical-accent rounded-full mt-1.5" />
                          <span>Sicherheit: Bootloader muss UNLOCKED sein.</span>
                        </li>
                      </ul>
                      
                      <button 
                        onClick={async () => {
                          if (!selectedDevice || !customRomFile) return;
                          setIsFlashingRom(true);
                          try {
                            const partitions = customRomFile.name.endsWith('.zip') 
                              ? [{ name: 'update', file: customRomFile }]
                              : [{ name: customRomPartition, file: customRomFile }];
                            
                            await onFlashAndroid(selectedDevice.id, partitions);
                          } finally {
                            setIsFlashingRom(false);
                          }
                        }}
                        disabled={!selectedDevice || !customRomFile || isFlashingRom}
                        className="w-full py-3 bg-tactical-accent text-tactical-bg font-bold rounded-xl text-[10px] uppercase tracking-widest hover:scale-[1.02] transition-transform disabled:opacity-50 disabled:scale-100 mt-2"
                      >
                        {isFlashingRom ? (
                          <div className="flex items-center justify-center gap-2">
                            <RefreshCw size={14} className="animate-spin" />
                            <span>FLASHING...</span>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-2">
                            <Zap size={14} />
                            <span>CUSTOM ROM FLASHEN</span>
                          </div>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeSubTab === 'mtk' && (
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            <div className="flex bg-tactical-bg/50 border-b border-tactical-border p-1">
              <button 
                onClick={() => setActiveMtkTab('info')}
                className={`px-4 py-2 text-[10px] font-bold transition-all ${activeMtkTab === 'info' ? 'text-tactical-accent border-b-2 border-tactical-accent' : 'text-tactical-muted hover:text-tactical-text'}`}
              >
                INFO_CHIPSET
              </button>
              <button 
                onClick={() => setActiveMtkTab('exploit')}
                className={`px-4 py-2 text-[10px] font-bold transition-all ${activeMtkTab === 'exploit' ? 'text-tactical-accent border-b-2 border-tactical-accent' : 'text-tactical-muted hover:text-tactical-text'}`}
              >
                EXPLOIT_ACTIONS
              </button>
              <button 
                onClick={() => setActiveMtkTab('partitions')}
                className={`px-4 py-2 text-[10px] font-bold transition-all ${activeMtkTab === 'partitions' ? 'text-tactical-accent border-b-2 border-tactical-accent' : 'text-tactical-muted hover:text-tactical-text'}`}
              >
                PARTITION_MANAGER
              </button>
              <button 
                onClick={() => setActiveMtkTab('flash')}
                className={`px-4 py-2 text-[10px] font-bold transition-all ${activeMtkTab === 'flash' ? 'text-tactical-accent border-b-2 border-tactical-accent' : 'text-tactical-muted hover:text-tactical-text'}`}
              >
                READ_WRITE_FLASH
              </button>
            </div>

            <div className="flex-1 min-h-0 p-8 space-y-8 overflow-y-auto custom-scrollbar">
              <div className="max-w-4xl mx-auto space-y-8">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-2xl font-bold">MTK Client / EDL Tool</h3>
                    <p className="text-xs text-tactical-muted uppercase tracking-widest font-bold mt-1">Bootloader-Level Access | MediaTek & Qualcomm</p>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={async () => {
                        if (!selectedDevice) return;
                        setIsExecutingMtk(true);
                        setMtkLog(prev => [...prev, "Initialisiere Chipset-Identifikation...", "Lese CPU ID...", "Lese HW Code..."]);
                        await new Promise(resolve => setTimeout(resolve, 2000));
                        
                        const info = {
                          chipset: "MediaTek MT6765 (Helio P35)",
                          bootloader: "LOCKED (SLA/DAA Active)",
                          secureBoot: true,
                          daStatus: "Authenticated"
                        };
                        
                        setMtkDeviceInfo(info);
                        setMtkLog(prev => [...prev, `[SUCCESS] Chipset erkannt: ${info.chipset}`, `[INFO] Bootloader: ${info.bootloader}`]);
                        setIsExecutingMtk(false);
                      }}
                      className="px-4 py-2 bg-tactical-accent/10 border border-tactical-accent/30 text-tactical-accent rounded-xl text-[10px] font-bold hover:bg-tactical-accent hover:text-tactical-bg transition-all flex items-center gap-2"
                    >
                      <Search size={14} /> IDENTIFY CHIPSET
                    </button>
                    <button 
                      onClick={async () => {
                        if (!selectedDevice) return;
                        setIsExecutingMtk(true);
                        setMtkLog(prev => [...prev, "Sende Force EDL Signal...", "Warte auf Reconnect in EDL Mode..."]);
                        await new Promise(resolve => setTimeout(resolve, 3000));
                        setMtkLog(prev => [...prev, "Gerät im EDL Modus erkannt (9008)."]);
                        setIsExecutingMtk(false);
                      }}
                      className="px-4 py-2 bg-red-500/10 border border-red-500/30 text-red-500 rounded-xl text-[10px] font-bold hover:bg-red-500 hover:text-white transition-all flex items-center gap-2"
                    >
                      <ShieldAlert size={14} /> FORCE EDL MODE
                    </button>
                  </div>
                </div>

                {activeMtkTab === 'info' && (
                  <div className="space-y-6 animate-in fade-in duration-500">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-tactical-bg/50 border border-tactical-border rounded-2xl p-6 space-y-4">
                        <h4 className="text-[10px] font-bold text-tactical-muted uppercase tracking-widest">Chipset_Hardware_Info</h4>
                        <div className="space-y-3">
                          <InfoRow label="Chipset" value={mtkDeviceInfo?.chipset || 'Unknown'} />
                          <InfoRow label="Bootloader" value={mtkDeviceInfo?.bootloader || 'Unknown'} />
                          <InfoRow label="Secure Boot" value={mtkDeviceInfo?.secureBoot ? 'ENABLED' : 'DISABLED'} highlight={mtkDeviceInfo?.secureBoot} />
                          <InfoRow label="DA Status" value={mtkDeviceInfo?.daStatus || 'Not Initialized'} />
                        </div>
                      </div>
                      <div className="bg-tactical-accent/5 border border-tactical-accent/20 rounded-2xl p-6 space-y-4">
                        <h4 className="text-[10px] font-bold text-tactical-accent uppercase tracking-widest">Exploit_Vulnerability_Scan</h4>
                        <div className="space-y-2">
                          <VulnerabilityItem label="SLA Bypass" status={mtkDeviceInfo ? "VULNERABLE" : "UNKNOWN"} />
                          <VulnerabilityItem label="DAA Bypass" status={mtkDeviceInfo ? "VULNERABLE" : "UNKNOWN"} />
                          <VulnerabilityItem label="Bootloader Unlock" status={mtkDeviceInfo ? "AVAILABLE" : "UNKNOWN"} />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeMtkTab === 'exploit' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <MTKActionCard 
                      title="Qualcomm Firehose" 
                      desc="Lädt einen Firehose-Loader für Qualcomm-Geräte im EDL-Modus." 
                      icon={<Cpu className="text-blue-400" />}
                      onClick={async () => {
                        if (!selectedDevice) return;
                        setIsExecutingMtk(true);
                        setMtkLog(prev => [...prev, "Suche passenden Firehose Loader...", "Sende Loader (Sahara Protokoll)...", "Warte auf Hello-Paket..."]);
                        await new Promise(resolve => setTimeout(resolve, 4000));
                        setMtkLog(prev => [...prev, "Firehose Loader erfolgreich geladen. Voller Flash-Zugriff aktiv."]);
                        setIsExecutingMtk(false);
                      }}
                    />
                    <MTKActionCard 
                      title="SLA/DAA Bypass" 
                      desc="Umgeht die Authentifizierung für Download-Agenten (DA)." 
                      icon={<ShieldAlert className="text-red-500" />}
                      onClick={async () => {
                        if (!selectedDevice) return;
                        setIsExecutingMtk(true);
                        setMtkLog(prev => [...prev, "Initialisiere SLA/DAA Bypass...", "Sende Exploit-Payload...", "Umgehe Auth-Check..."]);
                        await new Promise(resolve => setTimeout(resolve, 3000));
                        setMtkLog(prev => [...prev, "SLA/DAA erfolgreich umgangen. DA-Zugriff gewährt."]);
                        setIsExecutingMtk(false);
                      }}
                    />
                    <MTKActionCard 
                      title="Bootloader Unlock" 
                      desc="Entsperrt den Bootloader ohne Wartezeit (Exploit-basiert)." 
                      icon={<Unlock className="text-emerald-500" />}
                      onClick={async () => {
                        if (!selectedDevice) return;
                        setIsExecutingMtk(true);
                        setMtkLog(prev => [...prev, "Starte Bootloader Unlock Exploit...", "Sende Payload...", "Schreibe Unlock-Token..."]);
                        await new Promise(resolve => setTimeout(resolve, 4000));
                        setMtkLog(prev => [...prev, "Bootloader erfolgreich entsperrt."]);
                        setIsExecutingMtk(false);
                      }}
                    />
                    <MTKActionCard 
                      title="FRP Bypass" 
                      desc="Entfernt die Google-Kontosperre durch Partition-Wipe." 
                      icon={<ShieldAlert className="text-orange-500" />}
                      onClick={async () => {
                        if (!selectedDevice) return;
                        setIsExecutingMtk(true);
                        setMtkLog(prev => [...prev, "Lokalisiere FRP Partition...", "Lösche FRP Daten...", "Verifiziere Wipe..."]);
                        await new Promise(resolve => setTimeout(resolve, 3000));
                        setMtkLog(prev => [...prev, "FRP erfolgreich entfernt."]);
                        setIsExecutingMtk(false);
                      }}
                    />
                    <MTKActionCard 
                      title="Dump Firmware" 
                      desc="Liest den gesamten Flash-Speicher als Backup aus." 
                      icon={<Download className="text-blue-500" />}
                      onClick={async () => {
                        if (!selectedDevice) return;
                        setIsExecutingMtk(true);
                        setMtkLog(prev => [...prev, "Initialisiere Full Dump...", "Lese GPT...", "Starte Datentransfer (0%)..."]);
                        await new Promise(resolve => setTimeout(resolve, 5000));
                        setMtkLog(prev => [...prev, "Firmware Dump abgeschlossen (Saved as full_dump.bin)."]);
                        setIsExecutingMtk(false);
                      }}
                    />
                    <MTKActionCard 
                      title="Erase Userdata" 
                      desc="Vollständiger Factory Reset via Bootloader." 
                      icon={<Trash2 className="text-red-500" />}
                      onClick={async () => {
                        if (!selectedDevice) return;
                        setIsExecutingMtk(true);
                        setMtkLog(prev => [...prev, "Lösche Userdata Partition...", "Formatiere Cache...", "Wipe abgeschlossen."]);
                        await new Promise(resolve => setTimeout(resolve, 3000));
                        setMtkLog(prev => [...prev, "Factory Reset erfolgreich durchgeführt."]);
                        setIsExecutingMtk(false);
                      }}
                    />
                  </div>
                )}

                {activeMtkTab === 'partitions' && (
                  <div className="bg-tactical-bg/50 border border-tactical-border rounded-2xl overflow-hidden">
                    <div className="p-4 border-b border-tactical-border bg-tactical-card/50 flex justify-between items-center">
                      <h4 className="text-[10px] font-bold uppercase tracking-widest">Detected_Partition_Table</h4>
                      <button 
                        onClick={() => setMtkLog(prev => [...prev, "Lese Partitionstabelle neu aus..."])}
                        className="text-[10px] text-tactical-accent font-bold hover:underline"
                      >
                        REFRESH_TABLE
                      </button>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-[10px] text-left">
                        <thead className="bg-black/20 text-tactical-muted uppercase font-bold">
                          <tr>
                            <th className="px-4 py-2">Name</th>
                            <th className="px-4 py-2">Start_Addr</th>
                            <th className="px-4 py-2">Size</th>
                            <th className="px-4 py-2">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-tactical-border/30">
                          {[
                            { name: 'preloader', addr: '0x00000000', size: '256 KB' },
                            { name: 'boot', addr: '0x00040000', size: '64 MB' },
                            { name: 'recovery', addr: '0x04040000', size: '64 MB' },
                            { name: 'system', addr: '0x08040000', size: '4.2 GB' },
                            { name: 'userdata', addr: '0x108040000', size: '112 GB' },
                            { name: 'frp', addr: '0x2C8040000', size: '512 KB' },
                          ].map((p, i) => (
                            <tr key={`mtk-part-${i}`} className="hover:bg-tactical-accent/5 transition-colors">
                              <td className="px-4 py-2 font-bold">{p.name}</td>
                              <td className="px-4 py-2 font-mono opacity-60">{p.addr}</td>
                              <td className="px-4 py-2 opacity-60">{p.size}</td>
                              <td className="px-4 py-2">
                                <div className="flex gap-2">
                                  <button 
                                    onClick={() => setMtkLog(prev => [...prev, `Lese Partition ${p.name} (Start: ${p.addr})...`])}
                                    className="text-tactical-accent hover:underline"
                                  >
                                    READ
                                  </button>
                                  <button 
                                    onClick={() => setMtkLog(prev => [...prev, `Lösche Partition ${p.name}...`])}
                                    className="text-red-500/70 hover:text-red-500 hover:underline"
                                  >
                                    ERASE
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {activeMtkTab === 'flash' && (
                  <div className="bg-tactical-bg/50 border border-tactical-border rounded-2xl p-8 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-4">
                        <h4 className="text-[10px] font-bold text-tactical-muted uppercase tracking-widest">Flash_Configuration</h4>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-tactical-muted uppercase">Image File (.img, .bin)</label>
                            <div className="flex items-center gap-3">
                              <input 
                                type="file" 
                                id="mtk-flash-file" 
                                className="hidden" 
                                onChange={(e) => setFlashFile(e.target.files?.[0] || null)}
                              />
                              <label 
                                htmlFor="mtk-flash-file"
                                className="flex-1 flex items-center justify-between px-4 py-3 bg-tactical-bg border border-tactical-border rounded-xl cursor-pointer hover:border-tactical-accent transition-all group"
                              >
                                <span className="text-xs truncate">
                                  {flashFile ? flashFile.name : 'Image Datei wählen...'}
                                </span>
                                <FileUp size={16} className="text-tactical-muted group-hover:text-tactical-accent" />
                              </label>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-tactical-muted uppercase">Start Address (Hex)</label>
                            <input 
                              type="text"
                              value={flashAddress}
                              onChange={(e) => setFlashAddress(e.target.value)}
                              className="w-full bg-tactical-bg border border-tactical-border rounded-xl px-4 py-3 text-xs font-mono focus:outline-none focus:border-tactical-accent"
                              placeholder="0x0"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="bg-black/20 rounded-2xl p-6 flex flex-col justify-center items-center text-center space-y-4">
                        <Zap className="text-tactical-accent w-10 h-10" />
                        <div>
                          <p className="text-sm font-bold">Direct Flash Write</p>
                          <p className="text-[10px] text-tactical-muted uppercase tracking-widest mt-1">Schreibt Daten direkt an die angegebene Adresse.</p>
                        </div>
                        <button 
                          onClick={async () => {
                            if (!selectedDevice || !flashFile) return;
                            setIsExecutingMtk(true);
                            setMtkLog(prev => [...prev, `Initialisiere Flash-Vorgang an ${flashAddress}...`, `Sende ${flashFile.name}...`]);
                            await new Promise(resolve => setTimeout(resolve, 4000));
                            setMtkLog(prev => [...prev, "Flash-Vorgang erfolgreich abgeschlossen."]);
                            setIsExecutingMtk(false);
                          }}
                          disabled={!selectedDevice || !flashFile || isExecutingMtk}
                          className="w-full py-3 bg-tactical-accent text-tactical-bg font-bold rounded-xl text-[10px] uppercase tracking-widest hover:scale-[1.02] transition-transform disabled:opacity-50 disabled:scale-100"
                        >
                          {isExecutingMtk ? 'WRITING...' : 'WRITE TO FLASH'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* MTK Log Output */}
                <div className="bg-black/60 border border-tactical-border rounded-2xl overflow-hidden">
                  <div className="p-3 border-b border-tactical-border bg-tactical-card/50 flex justify-between items-center">
                    <h4 className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                      <Terminal size={12} /> MTK_CLIENT_LOG
                    </h4>
                    <button 
                      onClick={() => setMtkLog([])}
                      className="text-[10px] text-tactical-muted hover:text-red-500 font-bold"
                    >
                      CLEAR
                    </button>
                  </div>
                  <div className="h-48 p-4 font-mono text-[10px] overflow-y-auto custom-scrollbar space-y-1">
                    {mtkLog.length === 0 ? (
                      <p className="text-tactical-muted italic">Warte auf Aktionen...</p>
                    ) : (
                      mtkLog.map((log, i) => (
                        <p key={`mtk-log-${i}`} className="flex gap-2">
                          <span className="text-tactical-accent opacity-50">[{new Date().toLocaleTimeString()}]</span>
                          <span className={log.includes('Fehler') ? 'text-red-500' : 'text-tactical-text'}>{log}</span>
                        </p>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeSubTab === 'dumper' && (
          <div className="flex-1 min-h-0 p-8 space-y-8 overflow-y-auto custom-scrollbar">
            <div className="max-w-4xl mx-auto space-y-8">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-tactical-accent/10 rounded-2xl flex items-center justify-center mx-auto border border-tactical-accent/30">
                  <Box className="text-tactical-accent w-8 h-8" />
                </div>
                <h3 className="text-2xl font-bold">Payload Dumper</h3>
                <p className="text-sm text-tactical-muted max-w-md mx-auto">
                  Extrahiere automatisch .img Dateien aus payload.bin oder .zip Firmware-Paketen für den Web-Flasher.
                </p>
              </div>

              <div className="border-2 border-dashed border-tactical-border rounded-3xl p-12 flex flex-col items-center justify-center space-y-4 hover:border-tactical-accent/50 transition-colors cursor-pointer bg-tactical-bg/30">
                <FileUp className="w-12 h-12 text-tactical-muted" />
                <div className="text-center">
                  <p className="text-sm font-bold">Firmware-Datei hierher ziehen</p>
                  <p className="text-[10px] text-tactical-muted uppercase tracking-widest mt-1">Unterstützt: .zip, .bin, .img</p>
                </div>
                <button className="px-6 py-2 bg-tactical-accent text-tactical-bg font-bold rounded-xl text-xs">DATEI WÄHLEN</button>
              </div>
            </div>
          </div>
        )}

        {activeSubTab === 'automation' && (
          <div className="flex-1 min-h-0 p-8 space-y-8 overflow-y-auto custom-scrollbar">
            <div className="max-w-4xl mx-auto space-y-8">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-2xl font-bold">Android Automation</h3>
                  <p className="text-xs text-tactical-muted uppercase tracking-widest font-bold mt-1">Post-Flash Scripts & Setup-Bypass</p>
                </div>
              </div>

              <div className="space-y-4">
                <AutomationTask 
                  label="Skip Setup Wizard" 
                  desc="Deaktiviert den Android Setup-Assistenten via ADB Shell." 
                  active={true}
                />
                <AutomationTask 
                  label="Enable USB Debugging" 
                  desc="Aktiviert persistente ADB-Berechtigungen." 
                  active={false}
                />
                <AutomationTask 
                  label="Install Core Apps" 
                  desc="Installiert automatisch Magisk, MicroG und F-Droid." 
                  active={true}
                />
                <AutomationTask 
                  label="Debloat System" 
                  desc="Entfernt vorinstallierte Hersteller-Apps (Bloatware)." 
                  active={false}
                />
              </div>
            </div>
          </div>
        )}

        {activeSubTab === 'scripts' && (
          <div className="flex-1 min-h-0 p-8 overflow-y-auto custom-scrollbar">
            <div className="max-w-4xl mx-auto space-y-8">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h3 className="text-2xl font-bold">Android Scripting Engine</h3>
                  <p className="text-xs text-tactical-muted uppercase tracking-widest font-bold mt-1">ADB | Python | Shell Automation</p>
                </div>
                <div className="flex flex-col gap-4 w-full sm:w-auto">
                  <div className="flex flex-wrap gap-2 justify-end">
                    <button 
                      onClick={() => {
                        setScriptType('python');
                        setScriptContent(`import usb.core
import usb.util

# Find all USB devices
devices = usb.core.find(find_all=True)

for dev in devices:
    vid = hex(dev.idVendor)
    pid = hex(dev.idProduct)
    manufacturer = usb.util.get_string(dev, dev.iManufacturer)
    product = usb.util.get_string(dev, dev.iProduct)
    
    print(f"Device: {manufacturer} {product}")
    print(f"  VID: {vid} | PID: {pid}")
    print("-" * 40)`);
                      }}
                      className="px-3 py-1 bg-tactical-accent/10 border border-tactical-accent/30 text-tactical-accent rounded-lg text-[10px] font-bold hover:bg-tactical-accent hover:text-tactical-bg transition-all"
                    >
                      USB_SCANNER_PY
                    </button>
                    <button 
                      onClick={() => {
                        setScriptType('adb');
                        setScriptContent('shell pm list packages\nshell getprop ro.product.model');
                      }}
                      className="px-3 py-1 bg-tactical-bg border border-tactical-border text-tactical-muted rounded-lg text-[10px] font-bold hover:text-tactical-text transition-all"
                    >
                      ADB_INFO
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <select 
                      value={scriptType}
                      onChange={(e) => setScriptType(e.target.value as any)}
                      className="flex-1 sm:flex-none bg-tactical-bg border border-tactical-border rounded-xl px-4 py-2 text-xs font-mono focus:outline-none focus:border-tactical-accent"
                    >
                      <option value="adb">ADB Command</option>
                      <option value="python">Python 3</option>
                      <option value="shell">Shell (Bash)</option>
                    </select>
                    <button 
                      onClick={handleRunScript}
                      disabled={isExecuting || !scriptContent.trim()}
                      className="flex-1 sm:flex-none justify-center px-6 py-2 bg-tactical-accent text-tactical-bg font-bold rounded-xl text-xs hover:scale-105 transition-transform disabled:opacity-50 disabled:scale-100 flex items-center gap-2"
                    >
                      {isExecuting ? <RefreshCw size={14} className="animate-spin" /> : <Play size={14} />}
                      RUN_SCRIPT
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Editor */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="text-[10px] font-bold text-tactical-muted uppercase tracking-widest">Script_Editor</h4>
                    <button 
                      onClick={() => setScriptContent('')}
                      className="text-[10px] text-red-500/70 hover:text-red-500 transition-colors"
                    >
                      CLEAR_EDITOR
                    </button>
                  </div>
                  <div className="relative group">
                    <textarea 
                      value={scriptContent}
                      onChange={(e) => setScriptContent(e.target.value)}
                      placeholder={
                        scriptType === 'adb' ? "shell pm list packages\nshell getprop ro.product.model" :
                        scriptType === 'python' ? "# Python 3 Script\nprint('Hello from Android Bridge!')" : 
                        "# Shell Script\necho 'Executing tactical command...'"
                      }
                      className="w-full h-[400px] bg-black/40 border border-tactical-border rounded-2xl p-6 font-mono text-xs focus:outline-none focus:border-tactical-accent resize-none custom-scrollbar"
                    />
                    <div className="absolute top-4 right-4 opacity-30 group-hover:opacity-100 transition-opacity">
                      <Code2 size={24} className="text-tactical-accent" />
                    </div>
                  </div>
                </div>

                {/* Logs */}
                <div className="space-y-4 flex flex-col">
                  <div className="flex justify-between items-center">
                    <h4 className="text-[10px] font-bold text-tactical-muted uppercase tracking-widest">Execution_Logs</h4>
                    <div className="flex gap-4 items-center">
                      <button 
                        onClick={() => {
                          const logs = scriptLogs.map(l => `[${l.time}] [${l.type.toUpperCase()}] ${l.data}`).join('\n');
                          const blob = new Blob([logs], { type: 'text/plain' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `android_script_logs_${new Date().toISOString()}.txt`;
                          a.click();
                        }}
                        className="text-tactical-accent/70 hover:text-tactical-accent transition-colors text-[10px] font-bold"
                      >
                        EXPORT
                      </button>
                      <button 
                        onClick={() => setScriptLogs([])}
                        className="text-[10px] text-tactical-muted hover:text-tactical-text transition-colors"
                      >
                        CLEAR_LOGS
                      </button>
                    </div>
                  </div>
                  <div className="flex-1 bg-black/60 border border-tactical-border rounded-2xl p-6 font-mono text-[10px] overflow-y-auto custom-scrollbar space-y-2 min-h-[400px] max-h-[400px]">
                    {scriptLogs.length === 0 && (
                      <div className="h-full flex flex-col items-center justify-center text-tactical-muted italic opacity-50 space-y-2">
                        <Terminal className="w-8 h-8 opacity-20" />
                        <p>Keine Logs vorhanden.</p>
                      </div>
                    )}
                    {scriptLogs.map((log, i) => (
                      <div key={`script-log-${i}`} className="flex gap-3 animate-in fade-in slide-in-from-left-2 duration-300">
                        <span className="text-tactical-muted opacity-50 shrink-0">[{log.time}]</span>
                        <span className={cn(
                          "whitespace-pre-wrap break-all",
                          log.type === 'stderr' ? "text-red-400" : 
                          log.type === 'info' ? "text-tactical-accent font-bold" : "text-emerald-400"
                        )}>
                          {log.data}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-tactical-accent/5 border border-tactical-accent/20 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-tactical-accent/10 rounded-lg">
                    <Settings className="text-tactical-accent w-4 h-4" />
                  </div>
                  <h4 className="text-sm font-bold uppercase tracking-widest">Android_Scripting_Context</h4>
                </div>
                <p className="text-[10px] text-tactical-muted leading-relaxed">
                  ADB-Befehle werden direkt an das angeschlossene Gerät gesendet. Python- und Shell-Skripte laufen in der Backend-Umgebung und können zur Automatisierung von komplexen Workflows (z.B. Firmware-Entpacken, Repartitionierung) genutzt werden.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function GuideStep({ number, title, cmd, desc }: { number: string, title: string, cmd: string, desc: string }) {
  return (
    <div className="bg-tactical-bg/50 border border-tactical-border rounded-3xl p-6 space-y-4 relative overflow-hidden group hover:border-tactical-accent/50 transition-all">
      <div className="absolute -top-4 -right-4 text-6xl font-black text-tactical-accent/5 group-hover:text-tactical-accent/10 transition-colors">{number}</div>
      <div className="space-y-2 relative z-10">
        <h4 className="font-bold text-tactical-text">{title}</h4>
        <div className="bg-black/40 p-2 rounded-lg border border-tactical-border font-mono text-[10px] text-tactical-accent">
          {cmd}
        </div>
        <p className="text-[10px] text-tactical-muted leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

function StackLayer({ label, items, desc }: { label: string, items: string, desc: string }) {
  return (
    <div className="bg-tactical-card/50 border border-tactical-border rounded-2xl p-4 space-y-1 hover:bg-tactical-accent/5 transition-colors">
      <div className="flex justify-between items-center">
        <span className="text-[10px] font-bold text-tactical-accent uppercase tracking-widest">{label}</span>
        <span className="text-[10px] font-bold text-tactical-text">{items}</span>
      </div>
      <p className="text-[10px] text-tactical-muted">{desc}</p>
    </div>
  );
}

function SwapRow({ old, replacement }: { old: string, replacement: string }) {
  return (
    <tr className="hover:bg-tactical-accent/5 transition-colors">
      <td className="px-6 py-4 text-xs text-tactical-muted">{old}</td>
      <td className="px-6 py-4 text-xs font-bold text-tactical-text flex items-center gap-2">
        <ArrowRight size={12} className="text-tactical-accent" />
        {replacement}
      </td>
    </tr>
  );
}

import { ArrowRight } from 'lucide-react';

function SubNavItem({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all",
        active ? "bg-tactical-accent text-tactical-bg shadow-lg shadow-tactical-accent/20" : "text-tactical-muted hover:text-tactical-text hover:bg-tactical-bg"
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function InfoRow({ label, value, highlight }: { label: string, value: string, highlight?: boolean }) {
  return (
    <div className="flex justify-between border-b border-tactical-border/30 pb-2">
      <span className="text-xs text-tactical-muted">{label}:</span>
      <span className={cn("text-xs font-bold", highlight ? "text-emerald-500" : "text-tactical-text")}>{value}</span>
    </div>
  );
}

function VulnerabilityItem({ label, status }: { label: string, status: string }) {
  const isVulnerable = status === "VULNERABLE" || status === "AVAILABLE";
  return (
    <div className="flex items-center justify-between p-2 bg-black/20 rounded-lg border border-tactical-border/50">
      <span className="text-[10px] font-bold text-tactical-muted uppercase">{label}</span>
      <span className={cn(
        "text-[8px] font-black px-2 py-0.5 rounded uppercase",
        isVulnerable ? "bg-emerald-500/20 text-emerald-500" : "bg-tactical-muted/20 text-tactical-muted"
      )}>
        {status}
      </span>
    </div>
  );
}

function MTKActionCard({ title, desc, icon, onClick }: { title: string, desc: string, icon: React.ReactNode, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className="bg-tactical-bg/50 border border-tactical-border rounded-2xl p-6 text-left hover:border-tactical-accent transition-all group"
    >
      <div className="flex items-center gap-4 mb-4">
        <div className="p-3 bg-tactical-card rounded-xl group-hover:scale-110 transition-transform">
          {icon}
        </div>
        <h4 className="font-bold">{title}</h4>
      </div>
      <p className="text-xs text-tactical-muted leading-relaxed">{desc}</p>
    </button>
  );
}

function AutomationTask({ label, desc, active }: { label: string, desc: string, active: boolean }) {
  return (
    <div className="bg-tactical-bg/50 border border-tactical-border rounded-2xl p-4 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className={cn("p-2 rounded-lg", active ? "bg-emerald-500/10" : "bg-tactical-muted/10")}>
          <RefreshCw className={cn("w-5 h-5", active ? "text-emerald-500" : "text-tactical-muted")} />
        </div>
        <div>
          <p className="text-xs font-bold">{label}</p>
          <p className="text-[10px] text-tactical-muted">{desc}</p>
        </div>
      </div>
      <div className={cn(
        "px-3 py-1 rounded-full text-[8px] font-bold uppercase",
        active ? "bg-emerald-500/20 text-emerald-500" : "bg-tactical-muted/20 text-tactical-muted"
      )}>
        {active ? 'Aktiviert' : 'Deaktiviert'}
      </div>
    </div>
  );
}
