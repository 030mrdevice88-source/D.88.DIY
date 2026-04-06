import React, { useState, useRef, useEffect } from 'react';
import { 
  LifeBuoy, 
  ShieldAlert, 
  Zap, 
  Download, 
  Search, 
  Activity, 
  Database, 
  Smartphone, 
  Usb, 
  Cpu, 
  FileSearch, 
  FileDown, 
  Lock, 
  Unlock, 
  AlertTriangle,
  RefreshCw,
  Terminal,
  Layers,
  Box,
  ChevronRight,
  Play,
  Trash2,
  Save,
  Share2,
  Globe,
  Wifi,
  History
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { HardwareDevice } from '../types';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface RescueHubProps {
  devices: HardwareDevice[];
  onConnectADB: () => Promise<void>;
  onConnectFastboot: () => Promise<void>;
  onConnectEDL: () => Promise<void>;
  onConnectUniversal?: () => Promise<void>;
  onRunRescueAction: (id: string, action: string, params?: any) => Promise<any>;
  onDisconnect: (id: string) => Promise<void>;
}

export default function RescueHub({ 
  devices, 
  onConnectADB, 
  onConnectFastboot, 
  onConnectEDL,
  onConnectUniversal,
  onRunRescueAction,
  onDisconnect
}: RescueHubProps) {
  const [activeSubTab, setActiveSubTab] = useState<'triage' | 'filesystem' | 'partitions' | 'exploits' | 'logs' | 'edl'>('triage');
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [rescueLogs, setRescueLogs] = useState<{ time: string, msg: string, type: 'info' | 'warn' | 'error' | 'success' }[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [partitions, setPartitions] = useState<{ name: string, size: string, start: string }[]>([]);
  const [files, setFiles] = useState<{ name: string, size: string, type: 'file' | 'dir', path: string }[]>([]);
  const [currentPath, setCurrentPath] = useState('/');
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [rescueLogs]);

  const addLog = (msg: string, type: 'info' | 'warn' | 'error' | 'success' = 'info') => {
    setRescueLogs(prev => [...prev, { time: new Date().toLocaleTimeString(), msg, type }]);
  };

  const handleTriage = async () => {
    setIsProcessing(true);
    addLog("Starte Deep-Triage-Protokoll...", "info");
    setProgress(10);
    
    try {
      // Simulate hardware scanning
      await new Promise(r => setTimeout(r, 1000));
      addLog("USB-Bus-Enumeration abgeschlossen.", "success");
      setProgress(30);
      
      await new Promise(r => setTimeout(r, 800));
      addLog("Prüfe auf Qualcomm Sahara/Firehose Interface...", "info");
      setProgress(50);
      
      await new Promise(r => setTimeout(r, 1200));
      addLog("Gerät im EDL-Modus (9008) erkannt!", "success");
      setProgress(80);
      
      await new Promise(r => setTimeout(r, 500));
      addLog("Lade Firehose-Loader für MSM8998...", "info");
      setProgress(100);
      
      addLog("Triage abgeschlossen. Gerät bereit für Partition-Dump.", "success");
    } catch (e: any) {
      addLog(`Triage fehlgeschlagen: ${e.message}`, "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const scanPartitions = async () => {
    if (!selectedDeviceId) {
      addLog("Kein Gerät ausgewählt.", "warn");
      return;
    }
    setIsProcessing(true);
    addLog("Lese GPT-Partitionstabelle...", "info");
    
    try {
      const result = await onRunRescueAction(selectedDeviceId, 'scan_partitions');
      if (result.status === 'success' && result.data) {
        setPartitions(result.data);
        addLog(`${result.data.length} Partitionen gefunden.`, "success");
      } else {
        throw new Error(result.message || "Unbekannter Fehler beim Partition-Scan");
      }
    } catch (e: any) {
      addLog(`Fehler beim Lesen der Partitionen: ${e.message}`, "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const dumpPartition = async (name: string) => {
    if (!selectedDeviceId) return;
    setIsProcessing(true);
    addLog(`Starte Dump von Partition: ${name}...`, "info");
    setProgress(0);
    
    try {
      const result = await onRunRescueAction(selectedDeviceId, 'dump_partition', { partition: name });
      if (result.status === 'success') {
        setProgress(100);
        addLog(`Dump von ${name} erfolgreich abgeschlossen. Gespeichert im Vault.`, "success");
      } else {
        throw new Error(result.message || "Dump fehlgeschlagen");
      }
    } catch (e: any) {
      addLog(`Fehler beim Dump: ${e.message}`, "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const bypassFRP = async () => {
    if (!selectedDeviceId) return;
    setIsProcessing(true);
    addLog("Initialisiere FRP-Bypass Exploit...", "warn");
    
    try {
      const result = await onRunRescueAction(selectedDeviceId, 'bypass_frp');
      if (result.status === 'success') {
        addLog("FRP-Sperre erfolgreich umgangen. Gerät startet neu...", "success");
      } else {
        throw new Error(result.message || "Bypass fehlgeschlagen");
      }
    } catch (e: any) {
      addLog(`Exploit-Fehler: ${e.message}`, "error");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col h-full gap-6 animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-tactical-card border border-tactical-border p-6 rounded-3xl">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-red-500/20 rounded-2xl border border-red-500/50">
            <LifeBuoy className="text-red-500 w-8 h-8 animate-pulse" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Rescue Hub</h2>
            <p className="text-xs text-tactical-muted uppercase tracking-widest font-bold">Datenrettung & Forensik v2.1</p>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <button 
            onClick={handleTriage}
            disabled={isProcessing}
            className="flex items-center gap-2 px-4 py-2 bg-tactical-bg border border-tactical-border rounded-xl text-xs font-bold hover:border-tactical-accent transition-all"
          >
            <Search size={14} className={cn(isProcessing && "animate-spin")} />
            DEEP_TRIAGE
          </button>
          <button 
            onClick={onConnectADB}
            className="flex items-center gap-2 px-4 py-2 bg-tactical-bg border border-tactical-border rounded-xl text-xs font-bold hover:border-tactical-accent transition-all"
          >
            <Smartphone size={14} />
            ADB_RESCUE
          </button>
          <button 
            onClick={onConnectFastboot}
            className="flex items-center gap-2 px-4 py-2 bg-tactical-bg border border-tactical-border rounded-xl text-xs font-bold hover:border-tactical-accent transition-all"
          >
            <Zap size={14} />
            FASTBOOT_RESCUE
          </button>
          <button 
            onClick={onConnectEDL}
            className="flex items-center gap-2 px-4 py-2 bg-red-500/20 border border-red-500/50 text-red-500 rounded-xl text-xs font-bold hover:bg-red-500 hover:text-white transition-all"
          >
            <Zap size={14} />
            EDL_TUNNEL
          </button>
          <button 
            onClick={onConnectUniversal}
            className="flex items-center gap-2 px-4 py-2 bg-tactical-muted/10 border border-tactical-muted/30 text-tactical-muted rounded-xl text-xs font-bold hover:bg-tactical-muted hover:text-tactical-text transition-all"
          >
            <Search size={14} />
            UNIVERSAL_SCAN
          </button>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0">
        
        {/* Left Panel: Navigation & Device Info */}
        <div className="lg:col-span-3 flex flex-col gap-6">
          <div className="bg-tactical-card border border-tactical-border rounded-3xl p-4 flex flex-col gap-2">
            <h3 className="text-[10px] font-bold text-tactical-muted uppercase tracking-widest mb-2 px-2">Rescue_Modules</h3>
            <button 
              onClick={() => setActiveSubTab('triage')}
              className={cn(
                "flex items-center gap-3 p-3 rounded-xl transition-all text-xs font-bold",
                activeSubTab === 'triage' ? "bg-tactical-accent text-tactical-bg" : "hover:bg-tactical-bg text-tactical-muted"
              )}
            >
              <Activity size={16} /> Triage & Diagnose
            </button>
            <button 
              onClick={() => setActiveSubTab('partitions')}
              className={cn(
                "flex items-center gap-3 p-3 rounded-xl transition-all text-xs font-bold",
                activeSubTab === 'partitions' ? "bg-tactical-accent text-tactical-bg" : "hover:bg-tactical-bg text-tactical-muted"
              )}
            >
              <Layers size={16} /> Partition Dumper
            </button>
            <button 
              onClick={() => setActiveSubTab('filesystem')}
              className={cn(
                "flex items-center gap-3 p-3 rounded-xl transition-all text-xs font-bold",
                activeSubTab === 'filesystem' ? "bg-tactical-accent text-tactical-bg" : "hover:bg-tactical-bg text-tactical-muted"
              )}
            >
              <Database size={16} /> Filesystem Tunnel
            </button>
            <button 
              onClick={() => setActiveSubTab('exploits')}
              className={cn(
                "flex items-center gap-3 p-3 rounded-xl transition-all text-xs font-bold",
                activeSubTab === 'exploits' ? "bg-tactical-accent text-tactical-bg" : "hover:bg-tactical-bg text-tactical-muted"
              )}
            >
              <ShieldAlert size={16} /> Bypass & Unlock
            </button>
            <button 
              onClick={() => setActiveSubTab('edl')}
              className={cn(
                "flex items-center gap-3 p-3 rounded-xl transition-all text-xs font-bold",
                activeSubTab === 'edl' ? "bg-red-500 text-white" : "hover:bg-tactical-bg text-red-500/70"
              )}
            >
              <Cpu size={16} /> Qualcomm EDL
            </button>
          </div>

          <div className="bg-tactical-card border border-tactical-border rounded-3xl p-4 flex-1 overflow-hidden flex flex-col">
            <h3 className="text-[10px] font-bold text-tactical-muted uppercase tracking-widest mb-4 px-2">Connected_Devices</h3>
            <div className="space-y-2 overflow-y-auto custom-scrollbar pr-2">
              {devices.length === 0 ? (
                <div className="text-center py-8 text-tactical-muted text-[10px] italic">Keine Geräte im Rescue-Mode</div>
              ) : (
                devices.map(d => (
                  <button 
                    key={d.id}
                    onClick={() => setSelectedDeviceId(d.id)}
                    className={cn(
                      "w-full text-left p-3 rounded-xl border transition-all",
                      selectedDeviceId === d.id ? "bg-tactical-accent/10 border-tactical-accent" : "bg-tactical-bg border-tactical-border hover:border-tactical-muted"
                    )}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold truncate">{d.name}</span>
                      <div className={cn("w-1.5 h-1.5 rounded-full", d.status === 'connected' ? "bg-emerald-500" : "bg-amber-500 animate-pulse")} />
                    </div>
                    <div className="text-[8px] text-tactical-muted uppercase">{d.type} | {d.status}</div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Center Panel: Active Module View */}
        <div className="lg:col-span-6 flex flex-col gap-6 min-h-0">
          <div className="bg-tactical-card border border-tactical-border rounded-3xl flex-1 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-tactical-border bg-tactical-bg/50 flex justify-between items-center">
              <span className="text-[10px] font-bold uppercase tracking-widest text-tactical-accent">
                {activeSubTab.replace('-', '_')}
              </span>
              {isProcessing && (
                <div className="flex items-center gap-2 text-[10px] text-tactical-accent">
                  <RefreshCw size={12} className="animate-spin" />
                  PROZESSIERE... {progress}%
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
              <AnimatePresence mode="wait">
                {activeSubTab === 'triage' && (
                  <motion.div 
                    key="triage"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-6"
                  >
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-tactical-bg border border-tactical-border rounded-2xl">
                        <div className="text-[10px] text-tactical-muted uppercase mb-1">Status</div>
                        <div className="text-lg font-bold text-tactical-accent">BEREIT</div>
                      </div>
                      <div className="p-4 bg-tactical-bg border border-tactical-border rounded-2xl">
                        <div className="text-[10px] text-tactical-muted uppercase mb-1">Schnittstelle</div>
                        <div className="text-lg font-bold">USB-C (3.1)</div>
                      </div>
                    </div>
                    
                    <div className="p-6 bg-tactical-bg border border-tactical-border rounded-2xl space-y-4">
                      <h4 className="text-xs font-bold flex items-center gap-2"><AlertTriangle className="text-amber-500" size={14} /> Diagnose-Checkliste</h4>
                      <ul className="space-y-3">
                        <li className="flex items-center gap-3 text-[11px]">
                          <div className="w-4 h-4 rounded bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center text-emerald-500">✓</div>
                          USB-Verbindung stabil
                        </li>
                        <li className="flex items-center gap-3 text-[11px]">
                          <div className="w-4 h-4 rounded bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center text-emerald-500">✓</div>
                          Gerät im Fastboot/EDL Modus
                        </li>
                        <li className="flex items-center gap-3 text-[11px]">
                          <div className="w-4 h-4 rounded bg-red-500/20 border border-red-500/50 flex items-center justify-center text-red-500">!</div>
                          Bootloader gesperrt (OEM Lock)
                        </li>
                      </ul>
                    </div>

                    <div className="flex gap-4">
                      <button 
                        onClick={handleTriage}
                        className="flex-1 py-4 bg-tactical-accent text-tactical-bg font-bold rounded-2xl text-xs hover:scale-[1.02] transition-transform"
                      >
                        FULL_SYSTEM_SCAN
                      </button>
                    </div>
                  </motion.div>
                )}

                {activeSubTab === 'partitions' && (
                  <motion.div 
                    key="partitions"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-4"
                  >
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="text-xs font-bold uppercase tracking-widest">Partitionstabelle</h4>
                      <button 
                        onClick={scanPartitions}
                        className="p-2 bg-tactical-bg border border-tactical-border rounded-lg hover:border-tactical-accent transition-colors"
                      >
                        <RefreshCw size={14} className={cn(isProcessing && "animate-spin")} />
                      </button>
                    </div>

                    <div className="bg-tactical-bg border border-tactical-border rounded-2xl overflow-hidden">
                      <table className="w-full text-[10px]">
                        <thead className="bg-tactical-card border-b border-tactical-border">
                          <tr>
                            <th className="px-4 py-3 text-left font-bold uppercase tracking-widest">Name</th>
                            <th className="px-4 py-3 text-left font-bold uppercase tracking-widest">Größe</th>
                            <th className="px-4 py-3 text-right font-bold uppercase tracking-widest">Aktion</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-tactical-border">
                          {partitions.length === 0 ? (
                            <tr>
                              <td colSpan={3} className="px-4 py-8 text-center text-tactical-muted italic">Keine Daten. Bitte Scan starten.</td>
                            </tr>
                          ) : (
                            partitions.map(p => (
                              <tr key={p.name} className="hover:bg-tactical-card/50 transition-colors">
                                <td className="px-4 py-3 font-mono text-tactical-accent">{p.name}</td>
                                <td className="px-4 py-3 text-tactical-muted">{p.size}</td>
                                <td className="px-4 py-3 text-right">
                                  <button 
                                    onClick={() => dumpPartition(p.name)}
                                    className="p-1.5 bg-tactical-accent/10 text-tactical-accent rounded-lg hover:bg-tactical-accent hover:text-tactical-bg transition-all"
                                  >
                                    <Download size={12} />
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </motion.div>
                )}

                {activeSubTab === 'filesystem' && (
                  <motion.div 
                    key="filesystem"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-4"
                  >
                    <div className="flex items-center gap-2 p-3 bg-tactical-bg border border-tactical-border rounded-xl font-mono text-[10px]">
                      <span className="text-tactical-muted">PATH:</span>
                      <span className="text-tactical-accent">{currentPath}</span>
                    </div>

                    <div className="grid grid-cols-1 gap-2">
                      {/* Mock File Browser */}
                      <div className="p-3 bg-tactical-bg border border-tactical-border rounded-xl flex items-center justify-between hover:border-tactical-accent cursor-pointer group">
                        <div className="flex items-center gap-3">
                          <Box size={16} className="text-amber-500" />
                          <div className="flex flex-col">
                            <span className="text-[11px] font-bold">DCIM</span>
                            <span className="text-[8px] text-tactical-muted uppercase">Verzeichnis | 124 Objekte</span>
                          </div>
                        </div>
                        <ChevronRight size={14} className="text-tactical-muted group-hover:text-tactical-accent" />
                      </div>
                      <div className="p-3 bg-tactical-bg border border-tactical-border rounded-xl flex items-center justify-between hover:border-tactical-accent cursor-pointer group">
                        <div className="flex items-center gap-3">
                          <Box size={16} className="text-amber-500" />
                          <div className="flex flex-col">
                            <span className="text-[11px] font-bold">WhatsApp</span>
                            <span className="text-[8px] text-tactical-muted uppercase">Verzeichnis | 45 Objekte</span>
                          </div>
                        </div>
                        <ChevronRight size={14} className="text-tactical-muted group-hover:text-tactical-accent" />
                      </div>
                      <div className="p-3 bg-tactical-bg border border-tactical-border rounded-xl flex items-center justify-between hover:border-tactical-accent cursor-pointer group">
                        <div className="flex items-center gap-3">
                          <FileSearch size={16} className="text-tactical-accent" />
                          <div className="flex flex-col">
                            <span className="text-[11px] font-bold">contacts.db</span>
                            <span className="text-[8px] text-tactical-muted uppercase">Datenbank | 2.4 MB</span>
                          </div>
                        </div>
                        <Download size={14} className="text-tactical-muted group-hover:text-tactical-accent" />
                      </div>
                    </div>

                    <div className="flex gap-4 mt-6">
                      <button className="flex-1 py-3 bg-tactical-bg border border-tactical-border rounded-xl text-xs font-bold hover:border-tactical-accent transition-all">
                        PULL_ALL_MEDIA
                      </button>
                      <button className="flex-1 py-3 bg-tactical-bg border border-tactical-border rounded-xl text-xs font-bold hover:border-tactical-accent transition-all">
                        EXTRACT_SQLITE
                      </button>
                    </div>
                  </motion.div>
                )}

                {activeSubTab === 'exploits' && (
                  <motion.div 
                    key="exploits"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-6"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-6 bg-tactical-bg border border-tactical-border rounded-3xl space-y-4">
                        <div className="flex items-center gap-3 mb-2">
                          <Lock className="text-red-500" size={20} />
                          <h4 className="text-sm font-bold uppercase tracking-widest">FRP Bypass</h4>
                        </div>
                        <p className="text-[10px] text-tactical-muted leading-relaxed">
                          Entfernt die Google Factory Reset Protection via EDL oder Fastboot Exploit.
                        </p>
                        <button 
                          onClick={bypassFRP}
                          className="w-full py-3 bg-red-500/20 border border-red-500/50 text-red-500 rounded-xl text-[10px] font-bold hover:bg-red-500 hover:text-white transition-all"
                        >
                          EXECUTE_BYPASS
                        </button>
                      </div>

                      <div className="p-6 bg-tactical-bg border border-tactical-border rounded-3xl space-y-4">
                        <div className="flex items-center gap-3 mb-2">
                          <Unlock className="text-tactical-accent" size={20} />
                          <h4 className="text-sm font-bold uppercase tracking-widest">MIUnlockTool</h4>
                        </div>
                        <p className="text-[10px] text-tactical-muted leading-relaxed">
                          Offizieller Xiaomi Bootloader Unlock (Fastboot). Erfordert verknüpften Mi-Account und Wartezeit.
                        </p>
                        <button className="w-full py-3 bg-tactical-accent/20 border border-tactical-accent/50 text-tactical-accent rounded-xl text-[10px] font-bold hover:bg-tactical-accent hover:text-tactical-bg transition-all">
                          START_MI_UNLOCK
                        </button>
                      </div>
                    </div>

                    <div className="p-6 bg-tactical-bg border border-tactical-border rounded-3xl">
                      <div className="flex items-center gap-3 mb-4">
                        <Zap className="text-amber-500" size={20} />
                        <h4 className="text-sm font-bold uppercase tracking-widest">Qualcomm Sahara Tunnel</h4>
                      </div>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-tactical-muted">Target Platform:</span>
                          <span className="font-mono">MSM8998 / SD835</span>
                        </div>
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-tactical-muted">Exploit Status:</span>
                          <span className="text-emerald-500 font-bold">READY</span>
                        </div>
                        <button className="w-full py-4 bg-amber-500/20 border border-amber-500/50 text-amber-500 rounded-2xl text-xs font-bold hover:bg-amber-500 hover:text-white transition-all">
                          INITIALIZE_TUNNEL
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
                {activeSubTab === 'edl' && (
                  <motion.div 
                    key="edl"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-6"
                  >
                    <div className="p-6 bg-tactical-bg border border-tactical-border rounded-3xl space-y-4">
                      <div className="flex items-center gap-3 mb-4">
                        <Cpu className="text-red-500" size={20} />
                        <h4 className="text-sm font-bold uppercase tracking-widest">Qualcomm EDL / 9008 Rescue</h4>
                      </div>
                      <p className="text-[10px] text-tactical-muted leading-relaxed">
                        Verbinde mit Geräten im Emergency Download Mode (EDL). Erfordert Qualcomm HS-USB QDLoader 9008 Treiber.
                      </p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        <div className="p-4 bg-tactical-card border border-tactical-border rounded-2xl">
                          <div className="text-[10px] text-tactical-muted uppercase mb-1">Sahara Protocol</div>
                          <div className="text-sm font-bold text-emerald-500">READY</div>
                          <button 
                            onClick={onConnectEDL}
                            className="mt-3 w-full py-2 bg-tactical-accent/10 border border-tactical-accent/30 text-tactical-accent rounded-xl text-[10px] font-bold hover:bg-tactical-accent hover:text-tactical-bg transition-all"
                          >
                            DETECT EDL DEVICE
                          </button>
                        </div>
                        <div className="p-4 bg-tactical-card border border-tactical-border rounded-2xl">
                          <div className="text-[10px] text-tactical-muted uppercase mb-1">Firehose Loader</div>
                          <div className="text-sm font-bold text-amber-500">WAITING FOR DEVICE</div>
                          <button 
                            disabled={!selectedDeviceId}
                            className="mt-3 w-full py-2 bg-tactical-muted/10 border border-tactical-muted/30 text-tactical-muted rounded-xl text-[10px] font-bold hover:bg-tactical-muted hover:text-tactical-text transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            INJECT FIREHOSE
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="p-6 bg-tactical-bg border border-tactical-border rounded-3xl">
                      <div className="flex items-center gap-3 mb-4">
                        <Database className="text-tactical-accent" size={20} />
                        <h4 className="text-sm font-bold uppercase tracking-widest">Firmware Repository</h4>
                      </div>
                      <div className="space-y-2">
                        <div className="p-3 bg-tactical-card border border-tactical-border rounded-xl flex items-center justify-between">
                          <div className="flex flex-col">
                            <span className="text-[11px] font-bold">MSM8998 (Snapdragon 835)</span>
                            <span className="text-[8px] text-tactical-muted uppercase">prog_ufs_firehose_8998_ddr.elf</span>
                          </div>
                          <button className="p-2 bg-tactical-accent/10 text-tactical-accent rounded-lg hover:bg-tactical-accent hover:text-tactical-bg transition-all">
                            <Download size={14} />
                          </button>
                        </div>
                        <div className="p-3 bg-tactical-card border border-tactical-border rounded-xl flex items-center justify-between">
                          <div className="flex flex-col">
                            <span className="text-[11px] font-bold">SM8150 (Snapdragon 855)</span>
                            <span className="text-[8px] text-tactical-muted uppercase">prog_firehose_ddr.elf</span>
                          </div>
                          <button className="p-2 bg-tactical-accent/10 text-tactical-accent rounded-lg hover:bg-tactical-accent hover:text-tactical-bg transition-all">
                            <Download size={14} />
                          </button>
                        </div>
                        <div className="p-3 bg-tactical-card border border-tactical-border rounded-xl flex items-center justify-between">
                          <div className="flex flex-col">
                            <span className="text-[11px] font-bold">SM8250 (Snapdragon 865)</span>
                            <span className="text-[8px] text-tactical-muted uppercase">prog_firehose_sm8250.elf</span>
                          </div>
                          <button className="p-2 bg-tactical-accent/10 text-tactical-accent rounded-lg hover:bg-tactical-accent hover:text-tactical-bg transition-all">
                            <Download size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Right Panel: Terminal / Logs */}
        <div className="lg:col-span-3 flex flex-col gap-6 min-h-0">
          <div className="bg-tactical-card border border-tactical-border rounded-3xl flex-1 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-tactical-border bg-tactical-bg/50 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Terminal size={14} className="text-tactical-accent" />
                <span className="text-[10px] font-bold uppercase tracking-widest">Rescue_Logs</span>
              </div>
              <button 
                onClick={() => setRescueLogs([])}
                className="p-1 hover:bg-tactical-border rounded transition-colors"
              >
                <Trash2 size={12} className="text-tactical-muted" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 font-mono text-[9px] space-y-1 custom-scrollbar bg-black/30">
              {rescueLogs.length === 0 ? (
                <div className="text-tactical-muted opacity-30 italic">Warte auf Operationen...</div>
              ) : (
                rescueLogs.map((log, i) => (
                  <div key={i} className="flex gap-2 animate-in fade-in slide-in-from-left-1">
                    <span className="text-tactical-muted shrink-0">[{log.time}]</span>
                    <span className={cn(
                      log.type === 'error' ? "text-red-500" :
                      log.type === 'warn' ? "text-amber-500" :
                      log.type === 'success' ? "text-emerald-500" :
                      "text-tactical-text"
                    )}>
                      {log.type === 'error' ? '✖ ' : log.type === 'warn' ? '⚠ ' : log.type === 'success' ? '✔ ' : '> '}
                      {log.msg}
                    </span>
                  </div>
                ))
              )}
              <div ref={logsEndRef} />
            </div>
          </div>

          <div className="bg-tactical-card border border-tactical-border rounded-3xl p-6 space-y-4">
            <h4 className="text-[10px] font-bold text-tactical-muted uppercase tracking-widest">System_Health</h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-[10px]">
                <span className="text-tactical-muted">USB Bridge</span>
                <span className="text-emerald-500 font-bold">ONLINE</span>
              </div>
              <div className="flex justify-between items-center text-[10px]">
                <span className="text-tactical-muted">EDL Driver</span>
                <span className="text-emerald-500 font-bold">LOADED</span>
              </div>
              <div className="flex justify-between items-center text-[10px]">
                <span className="text-tactical-muted">Vault Space</span>
                <span className="text-tactical-accent font-bold">1.2 TB FREE</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
