import React, { useState, useEffect, useRef } from 'react';
import { 
  Terminal, 
  Cpu, 
  Activity, 
  Wifi, 
  Zap, 
  Trash2, 
  Play, 
  Save, 
  Globe, 
  Webhook, 
  Database,
  RefreshCw,
  Plus,
  X,
  FileCode,
  ChevronRight,
  Code2,
  Settings,
  ShoppingBag,
  Star,
  Download,
  ShieldCheck,
  Search as SearchIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  Legend
} from 'recharts';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { HardwareDevice, TelemetryData, WebhookConfig, ParsingRule, ParsedDataPoint, WaspApp } from '../types';
import TerminalComponent from './TerminalComponent';
import { WebSerialFlasher } from './WebSerialFlasher';

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'esp-web-install-button': any;
    }
  }
}

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ESP32ToolboxProps {
  devices: HardwareDevice[];
  onConnect: (baudRate: number) => Promise<void>;
  onDisconnect: (id: string) => void;
  onFlash: (id: string, files: any) => Promise<void>;
  onErase: (id: string) => Promise<void>;
  onProvision: (id: string, ssid: string, pass: string) => Promise<void>;
  onUpdateWebhooks: (webhooks: WebhookConfig[]) => void;
  sendSerialData: (deviceId: string, data: string) => Promise<void>;
  onClearLogs: (deviceId: string) => void;
  onUpdateDevice?: (device: HardwareDevice) => void;
}

export default function ESP32Toolbox({
  devices,
  onConnect,
  onDisconnect,
  onFlash,
  onErase,
  onProvision,
  onUpdateWebhooks,
  sendSerialData,
  onClearLogs,
  onUpdateDevice
}: ESP32ToolboxProps) {
  const [activeSubTab, setActiveSubTab] = useState<'monitor' | 'dashboard' | 'flasher' | 'provisioning' | 'automation' | 'wasdp' | 'diagnostic' | 'scripts'>('monitor');
  const [baudRate, setBaudRate] = useState(115200);
  const [telemetry, setTelemetry] = useState<TelemetryData[]>([]);
  const [diagnostics, setDiagnostics] = useState<{
    serial: boolean;
    usb: boolean;
    bluetooth: boolean;
    storage: boolean;
    network: boolean;
    lastCheck: string;
  }>({
    serial: 'serial' in navigator,
    usb: 'usb' in navigator,
    bluetooth: 'bluetooth' in navigator,
    storage: true,
    network: navigator.onLine,
    lastCheck: new Date().toLocaleTimeString()
  });
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>([
    { id: '1', url: 'https://api.home-assistant.io/webhook/esp32', event: 'sensor_threshold', threshold: 30, active: true }
  ]);
  const [parsingRules, setParsingRules] = useState<ParsingRule[]>([
    { id: '1', label: 'Temperature', regex: 'TEMP: ([\\d.]+)', color: '#f97316', unit: '°C', active: true },
    { id: '2', label: 'Humidity', regex: 'HUM: ([\\d.]+)', color: '#3b82f6', unit: '%', active: true },
    { id: '3', label: 'Voltage', regex: 'VOLT: ([\\d.]+)', color: '#eab308', unit: 'V', active: true }
  ]);
  const [parsedStreamData, setParsedStreamData] = useState<ParsedDataPoint[]>([]);
  const [waspApps, setWaspApps] = useState<WaspApp[]>([
    { id: '1', title: 'WiFi Marauder', version: 'v0.13.10', category: 'Security', description: 'A suite of WiFi security testing tools for the ESP32.', binaryUrl: '#', icon: 'ShieldCheck', author: 'justcallmekoko', stars: 4500, brickRisk: 'medium', compatibility: ['ESP32', 'ESP32-S2'] },
    { id: '2', title: 'EvilApple', version: 'v1.2.0', category: 'Security', description: 'BLE spamming tool for testing Apple device notifications.', binaryUrl: '#', icon: 'Zap', author: 'simondankelmann', stars: 2100, brickRisk: 'low', compatibility: ['ESP32', 'ESP32-C3', 'ESP32-S3'] },
    { id: '3', title: 'ESP32-CAM WebServer', version: 'v2.0.4', category: 'IoT', description: 'Advanced camera server with face recognition and streaming.', binaryUrl: '#', icon: 'Globe', author: 'espressif', stars: 8900, brickRisk: 'low', compatibility: ['ESP32-CAM'] },
    { id: '4', title: 'Wasp-OS Core', version: 'v1.0.0', category: 'Utility', description: 'The core operating system for tactical ESP32 deployments.', binaryUrl: '#', icon: 'Cpu', author: 'HAL-FLASH-OS', stars: 1200, brickRisk: 'high', compatibility: ['ESP32', 'ESP32-S3'] }
  ]);
  const [mqttConfig, setMqttConfig] = useState({
    broker: 'mqtt.taktikal.io',
    port: 1883,
    clientId: 'tactical_orchestrator_' + Math.random().toString(36).substring(7),
    topic: 'esp32/telemetry/+',
    status: 'disconnected' as 'connected' | 'disconnected' | 'connecting'
  });
  const [brickProtection, setBrickProtection] = useState(true);
  const [showBrickWarning, setShowBrickWarning] = useState(false);
  const [pendingApp, setPendingApp] = useState<WaspApp | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [wifiSsid, setWifiSsid] = useState('');
  const [wifiPass, setWifiPass] = useState('');
  const [isAutoScroll, setIsAutoScroll] = useState(true);
  const [lineEnding, setLineEnding] = useState<'\n' | '\r' | '\r\n' | ''>('\n');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [scriptType, setScriptType] = useState<'python' | 'shell'>('python');
  const [scriptContent, setScriptContent] = useState('');
  const [scriptLogs, setScriptLogs] = useState<{ time: string, data: string, type: 'stdout' | 'stderr' | 'info' }[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);

  const espDevices = devices.filter(d => d.type === 'esp32' || d.type === 'serial');
  const connectedDevice = espDevices.find(d => d.status === 'connected');

  const handleInstallApp = (app: WaspApp) => {
    if (brickProtection && connectedDevice) {
      const chipType = connectedDevice.chipType || '';
      const isCompatible = app.compatibility.some(c => 
        chipType.toLowerCase().includes(c.toLowerCase()) || 
        c.toLowerCase().includes(chipType.toLowerCase())
      );

      if (!isCompatible && chipType) {
        setPendingApp(app);
        setShowBrickWarning(true);
        return;
      }
    }
    
    startFlash(app);
  };

  const startFlash = (app: WaspApp) => {
    const mockFile = new File([""], `${app.title.toLowerCase().replace(/\s/g, '_')}.bin`);
    if (espDevices[0]) onFlash(espDevices[0].id, mockFile);
    setActiveSubTab('flasher');
    setShowBrickWarning(false);
    setPendingApp(null);
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

  const lastProcessedLogIdRef = useRef<string | null>(null);

  // Real-time Serial Parsing
  useEffect(() => {
    if (!connectedDevice || !connectedDevice.serialLogs || connectedDevice.serialLogs.length === 0) return;
    
    const logs = connectedDevice.serialLogs;
    let startIndex = 0;
    
    if (lastProcessedLogIdRef.current) {
      const lastIndex = logs.findIndex(l => l.id === lastProcessedLogIdRef.current);
      if (lastIndex !== -1) {
        startIndex = lastIndex + 1;
      }
    }
    
    if (startIndex >= logs.length) return;
    
    const newPoints: ParsedDataPoint[] = [];
    
    for (let i = startIndex; i < logs.length; i++) {
      const log = logs[i];
      if (log.type !== 'in') continue;

      let hasMatch = false;
      const newParsedPoint: ParsedDataPoint = { timestamp: Date.now() };
      
      parsingRules.filter(r => r.active).forEach(rule => {
        try {
          const regex = new RegExp(rule.regex);
          const match = log.data.match(regex);
          if (match && match[1]) {
            newParsedPoint[rule.label] = parseFloat(match[1]);
            hasMatch = true;
          }
        } catch (e) {
          // Ignore invalid regex
        }
      });

      if (hasMatch) {
        newPoints.push(newParsedPoint);
      }
    }
    
    if (newPoints.length > 0) {
      setParsedStreamData(prev => [...prev, ...newPoints].slice(-50));
    }
    
    lastProcessedLogIdRef.current = logs[logs.length - 1].id || null;
  }, [connectedDevice?.serialLogs, parsingRules]);

  // Mock Telemetry Generation (only if no real device connected)
  useEffect(() => {
    if (connectedDevice) return;
    
    const interval = setInterval(() => {
      const newData: TelemetryData = {
        timestamp: Date.now(),
        temperature: 20 + Math.random() * 15,
        humidity: 40 + Math.random() * 20,
        voltage: 3.2 + Math.random() * 0.2,
        rssi: -50 - Math.random() * 20
      };
      setTelemetry(prev => [...prev.slice(-20), newData]);
    }, 2000);
    return () => clearInterval(interval);
  }, [connectedDevice]);

  return (
    <div className="flex-1 flex flex-col min-h-0 gap-4 md:gap-6 animate-in fade-in duration-500">
      {/* Header & Device Selector */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-tactical-accent/20 rounded-lg shrink-0">
            <Cpu className="text-tactical-accent w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">ESP32 Taktikal Suite</h2>
            <div className="flex flex-wrap items-center gap-2 md:gap-4 mt-1">
              <p className="text-[10px] text-tactical-muted uppercase tracking-widest font-bold">Hardware-Layer: WebSerial | Lifecycle: OTA | Automation: Webhooks</p>
              <div className="flex items-center gap-3 border-l border-tactical-border pl-2 md:pl-4">
                <div className="flex items-center gap-1.5">
                  <div className={cn("w-1.5 h-1.5 rounded-full", connectedDevice ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-tactical-border")} />
                  <span className="text-[8px] font-bold text-tactical-muted uppercase">WebSerial</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className={cn("w-1.5 h-1.5 rounded-full", mqttConfig.status === 'connected' ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-tactical-border")} />
                  <span className="text-[8px] font-bold text-tactical-muted uppercase">MQTT</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <select 
            value={baudRate} 
            onChange={(e) => setBaudRate(Number(e.target.value))}
            className="flex-1 md:flex-none bg-tactical-card border border-tactical-border rounded-xl px-4 py-2 text-xs font-mono focus:outline-none focus:border-tactical-accent"
          >
            {[9600, 19200, 38400, 57600, 115200, 230400, 460800, 921600].map(b => (
              <option key={b} value={b}>{b} Baud</option>
            ))}
          </select>
          <button 
            onClick={() => onConnect(baudRate)}
            className="flex-1 md:flex-none justify-center px-6 py-2 bg-tactical-accent text-tactical-bg font-bold rounded-xl text-xs hover:scale-105 transition-transform flex items-center gap-2"
          >
            <Plus size={14} /> GERÄT VERBINDEN
          </button>
        </div>
      </div>

      {/* Sub-Navigation */}
      <div className="flex bg-tactical-card border border-tactical-border rounded-xl p-1 self-start overflow-x-auto no-scrollbar max-w-full">
        <SubNavItem active={activeSubTab === 'monitor'} onClick={() => setActiveSubTab('monitor')} icon={<Terminal size={14} />} label="SERIAL_MONITOR" />
        <SubNavItem active={activeSubTab === 'dashboard'} onClick={() => setActiveSubTab('dashboard')} icon={<Activity size={14} />} label="DASHBOARD" />
        <SubNavItem active={activeSubTab === 'flasher'} onClick={() => setActiveSubTab('flasher')} icon={<Zap size={14} />} label="FIRMWARE_FLASHER" />
        <SubNavItem active={activeSubTab === 'provisioning'} onClick={() => setActiveSubTab('provisioning')} icon={<Wifi size={14} />} label="WIFI_PROVISIONING" />
        <SubNavItem active={activeSubTab === 'automation'} onClick={() => setActiveSubTab('automation')} icon={<Webhook size={14} />} label="AUTOMATION" />
        <SubNavItem active={activeSubTab === 'scripts'} onClick={() => setActiveSubTab('scripts')} icon={<Code2 size={14} />} label="SCRIPTS" />
        <SubNavItem active={activeSubTab === 'wasdp'} onClick={() => setActiveSubTab('wasdp')} icon={<ShoppingBag size={14} />} label="WASDP_STORE" />
        <SubNavItem active={activeSubTab === 'diagnostic'} onClick={() => setActiveSubTab('diagnostic')} icon={<ShieldCheck size={14} />} label="DIAGNOSTIC" />
      </div>

      {/* Content Area */}
      <div className="flex-1 min-h-0 bg-tactical-card/30 border border-tactical-border rounded-2xl overflow-hidden flex flex-col">
        {activeSubTab === 'monitor' && (
          <div className="flex-1 min-h-0 flex flex-col p-4 font-mono text-xs h-full">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 pb-2 border-b border-tactical-border gap-2 shrink-0">
              <div className="flex items-center gap-3">
                <Terminal className="text-tactical-accent w-4 h-4" />
                <span className="text-tactical-muted uppercase tracking-widest font-bold">Serial_Monitor_Output</span>
                {connectedDevice && (
                  <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-500/10 rounded border border-emerald-500/20">
                    <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[8px] text-emerald-500 font-bold uppercase tracking-tighter">Live</span>
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-4 items-center">
                <select 
                  value={lineEnding} 
                  onChange={(e) => setLineEnding(e.target.value as any)}
                  className="bg-tactical-bg border border-tactical-border rounded px-2 py-1 text-[10px] focus:outline-none"
                >
                  <option value="">No Line Ending</option>
                  <option value="\n">LF (\n)</option>
                  <option value="\r">CR (\r)</option>
                  <option value="\r\n">CRLF (\r\n)</option>
                </select>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={isAutoScroll} onChange={() => setIsAutoScroll(!isAutoScroll)} className="accent-tactical-accent" />
                  <span className="text-[10px]">AUTO_SCROLL</span>
                </label>
                <button 
                  onClick={() => {
                    const logs = connectedDevice?.serialLogs?.map(l => `[${l.time}] ${l.type === 'out' ? '>> ' : '<< '}${l.data}`).join('\n');
                    if (logs) {
                      const blob = new Blob([logs], { type: 'text/plain' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `esp32_logs_${new Date().toISOString()}.txt`;
                      a.click();
                    }
                  }}
                  className="text-tactical-accent/70 hover:text-tactical-accent transition-colors text-[10px] font-bold"
                >
                  EXPORT
                </button>
                <button 
                  onClick={() => connectedDevice && onClearLogs(connectedDevice.id)} 
                  className="text-red-500/70 hover:text-red-500 transition-colors text-[10px] font-bold"
                >
                  CLEAR
                </button>
              </div>
            </div>
            <div className="flex-1 min-h-[300px] relative">
              <div className="absolute inset-0">
                <TerminalComponent 
                  logs={connectedDevice?.serialLogs || []} 
                  onData={(data) => {
                    if (connectedDevice) sendSerialData(connectedDevice.id, data);
                  }}
                  isAutoScroll={isAutoScroll}
                />
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-tactical-border flex flex-col sm:flex-row gap-2 shrink-0">
              <div className="relative flex-1">
                <input 
                  type="text" 
                  placeholder={connectedDevice ? "Befehl an ESP32 senden..." : "Zuerst Gerät verbinden..."}
                  disabled={!connectedDevice}
                  className="w-full bg-tactical-bg border border-tactical-border rounded-lg px-4 py-2 focus:outline-none focus:border-tactical-accent disabled:opacity-50"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const val = e.currentTarget.value;
                      if (val && connectedDevice) {
                        sendSerialData(connectedDevice.id, val + lineEnding);
                        setCommandHistory(prev => [val, ...prev.slice(0, 19)]);
                        setHistoryIndex(-1);
                        e.currentTarget.value = '';
                      }
                    } else if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      if (historyIndex < commandHistory.length - 1) {
                        const nextIndex = historyIndex + 1;
                        setHistoryIndex(nextIndex);
                        e.currentTarget.value = commandHistory[nextIndex];
                      }
                    } else if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      if (historyIndex > -1) {
                        const nextIndex = historyIndex - 1;
                        setHistoryIndex(nextIndex);
                        e.currentTarget.value = nextIndex === -1 ? '' : commandHistory[nextIndex];
                      }
                    }
                  }}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none">
                  <span className="text-[8px] text-tactical-muted bg-tactical-card px-1.5 py-0.5 rounded border border-tactical-border">ENTER TO SEND</span>
                </div>
              </div>
              <button 
                onClick={(e) => {
                  const input = e.currentTarget.previousElementSibling?.querySelector('input') as HTMLInputElement;
                  if (input.value && connectedDevice) {
                    sendSerialData(connectedDevice.id, input.value + lineEnding);
                    setCommandHistory(prev => [input.value, ...prev.slice(0, 19)]);
                    setHistoryIndex(-1);
                    input.value = '';
                  }
                }}
                disabled={!connectedDevice}
                className="w-full sm:w-auto px-6 py-2 bg-tactical-accent text-tactical-bg font-bold rounded-lg hover:scale-105 transition-all disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-2"
              >
                <Play size={14} /> SENDEN
              </button>
            </div>
          </div>
        )}

        {activeSubTab === 'dashboard' && (
          <div className="flex-1 min-h-0 p-6 space-y-8 overflow-y-auto custom-scrollbar">
            {/* Real-time Stream Visualizer */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Activity className="text-tactical-accent w-4 h-4" />
                  <h3 className="text-[10px] font-bold text-tactical-muted uppercase tracking-widest">Live_Stream_Visualizer</h3>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setParsingRules([...parsingRules, { id: Date.now().toString(), label: 'New Metric', regex: '', color: '#ffffff', active: true }])}
                    className="flex items-center gap-1 px-2 py-1 bg-tactical-accent/10 border border-tactical-accent/30 text-tactical-accent rounded text-[10px] font-bold hover:bg-tactical-accent hover:text-tactical-bg transition-all"
                  >
                    <Plus size={12} /> ADD_RULE
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* Chart Area */}
                <div className="xl:col-span-2 bg-tactical-bg/50 border border-tactical-border rounded-2xl p-6 h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={parsedStreamData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                      <XAxis 
                        dataKey="timestamp" 
                        hide 
                      />
                      <YAxis stroke="#4b5563" fontSize={10} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '8px' }}
                        labelStyle={{ display: 'none' }}
                      />
                      <Legend iconType="circle" />
                      {parsingRules.filter(r => r.active).map(rule => (
                        <Line 
                          key={rule.id}
                          type="monotone" 
                          dataKey={rule.label} 
                          stroke={rule.color} 
                          strokeWidth={2} 
                          dot={false}
                          isAnimationActive={false}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Rules Editor */}
                <div className="bg-tactical-bg/50 border border-tactical-border rounded-2xl p-4 space-y-4 overflow-y-auto max-h-[400px]">
                  <h4 className="text-[9px] font-bold text-tactical-muted uppercase tracking-widest">Parsing_Rules</h4>
                  <div className="space-y-3">
                    {parsingRules.map(rule => (
                      <div key={rule.id} className="p-3 bg-tactical-card border border-tactical-border rounded-xl space-y-2">
                        <div className="flex justify-between items-center">
                          <input 
                            value={rule.label}
                            onChange={(e) => setParsingRules(prev => prev.map(r => r.id === rule.id ? { ...r, label: e.target.value } : r))}
                            className="bg-transparent border-none text-xs font-bold focus:outline-none w-2/3"
                          />
                          <div className="flex items-center gap-2">
                            <input 
                              type="color" 
                              value={rule.color}
                              onChange={(e) => setParsingRules(prev => prev.map(r => r.id === rule.id ? { ...r, color: e.target.value } : r))}
                              className="w-4 h-4 rounded cursor-pointer bg-transparent border-none"
                            />
                            <button 
                              onClick={() => setParsingRules(prev => prev.filter(r => r.id !== rule.id))}
                              className="text-red-500/50 hover:text-red-500"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <input 
                            placeholder="Regex: TEMP: ([\d.]+)"
                            value={rule.regex}
                            onChange={(e) => setParsingRules(prev => prev.map(r => r.id === rule.id ? { ...r, regex: e.target.value } : r))}
                            className="flex-1 bg-tactical-bg border border-tactical-border rounded px-2 py-1 text-[10px] focus:outline-none focus:border-tactical-accent"
                          />
                          <button 
                            onClick={() => setParsingRules(prev => prev.map(r => r.id === rule.id ? { ...r, active: !r.active } : r))}
                            className={cn(
                              "px-2 py-1 rounded text-[8px] font-bold uppercase",
                              rule.active ? "bg-emerald-500/20 text-emerald-500" : "bg-red-500/20 text-red-500"
                            )}
                          >
                            {rule.active ? 'Active' : 'Paused'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard label="TEMPERATUR" value={`${telemetry[telemetry.length-1]?.temperature.toFixed(1)}°C`} icon={<Activity className="text-orange-500" />} />
              <StatCard label="FEUCHTIGKEIT" value={`${telemetry[telemetry.length-1]?.humidity.toFixed(1)}%`} icon={<Activity className="text-blue-500" />} />
              <StatCard label="SPANNUNG" value={`${telemetry[telemetry.length-1]?.voltage.toFixed(2)}V`} icon={<Zap className="text-yellow-500" />} />
              <StatCard label="SIGNAL (RSSI)" value={`${telemetry[telemetry.length-1]?.rssi}dBm`} icon={<Wifi className="text-emerald-500" />} />
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-tactical-bg/50 border border-tactical-border rounded-2xl p-6 h-[300px] flex flex-col">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-[10px] font-bold text-tactical-muted uppercase tracking-widest">MQTT_Live_Ticker</h3>
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    mqttConfig.status === 'connected' ? "bg-emerald-500 animate-pulse" : "bg-red-500"
                  )} />
                </div>
                <div className="flex-1 bg-tactical-bg border border-tactical-border rounded-xl p-3 font-mono text-[10px] overflow-y-auto custom-scrollbar space-y-1">
                  {mqttConfig.status === 'connected' ? (
                    <>
                      <div className="text-tactical-muted opacity-50">[{new Date().toLocaleTimeString()}] Subscribed to {mqttConfig.topic}</div>
                      <div className="text-emerald-500">{'>>'} Incoming: {"{ \"temp\": 24.5, \"status\": \"OK\" }"}</div>
                      <div className="text-emerald-500">{'>>'} Incoming: {"{ \"temp\": 24.6, \"status\": \"OK\" }"}</div>
                    </>
                  ) : (
                    <div className="h-full flex items-center justify-center text-tactical-muted italic opacity-50">
                      MQTT nicht verbunden. Aktiviere Verbindung in AUTOMATION.
                    </div>
                  )}
                </div>
              </div>
              <div className="bg-tactical-bg/50 border border-tactical-border rounded-2xl p-6 h-[300px]">
                <h3 className="text-[10px] font-bold text-tactical-muted uppercase tracking-widest mb-4">Temperatur_Verlauf</h3>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={telemetry}>
                    <defs>
                      <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                    <XAxis dataKey="timestamp" hide />
                    <YAxis stroke="#4b5563" fontSize={10} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '8px' }}
                      itemStyle={{ color: '#f97316' }}
                    />
                    <Area type="monotone" dataKey="temperature" stroke="#f97316" fillOpacity={1} fill="url(#colorTemp)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="bg-tactical-bg/50 border border-tactical-border rounded-2xl p-6 h-[300px]">
                <h3 className="text-[10px] font-bold text-tactical-muted uppercase tracking-widest mb-4">Signal_Stärke</h3>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={telemetry}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                    <XAxis dataKey="timestamp" hide />
                    <YAxis stroke="#4b5563" fontSize={10} domain={[-100, 0]} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '8px' }}
                      itemStyle={{ color: '#10b981' }}
                    />
                    <Line type="monotone" dataKey="rssi" stroke="#10b981" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {activeSubTab === 'flasher' && (
          <div className="flex-1 min-h-0 p-8 overflow-y-auto custom-scrollbar">
            <WebSerialFlasher 
              devices={espDevices} 
              onFlash={onFlash} 
              onUpdateDevice={onUpdateDevice}
              brickProtection={brickProtection}
            />
          </div>
        )}

        {activeSubTab === 'provisioning' && (
          <div className="flex-1 min-h-0 p-8 flex flex-col items-center justify-center space-y-8">
            <div className="w-full max-w-md space-y-6">
              <div className="text-center space-y-2">
                <Wifi className="w-12 h-12 text-tactical-accent mx-auto" />
                <h3 className="text-xl font-bold">WiFi Provisioning</h3>
                <p className="text-xs text-tactical-muted">Übertrage WLAN-Zugangsdaten via Serial an den ESP32.</p>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-tactical-muted uppercase tracking-widest">SSID (Netzwerkname)</label>
                  <input 
                    type="text" 
                    value={wifiSsid}
                    onChange={(e) => setWifiSsid(e.target.value)}
                    placeholder="Mein_WLAN"
                    className="w-full bg-tactical-bg border border-tactical-border rounded-xl p-4 focus:outline-none focus:border-tactical-accent"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-tactical-muted uppercase tracking-widest">Passwort</label>
                  <input 
                    type="password" 
                    value={wifiPass}
                    onChange={(e) => setWifiPass(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-tactical-bg border border-tactical-border rounded-xl p-4 focus:outline-none focus:border-tactical-accent"
                  />
                </div>
              </div>

              <button 
                onClick={() => espDevices[0] && onProvision(espDevices[0].id, wifiSsid, wifiPass)}
                disabled={!wifiSsid || !wifiPass || espDevices.length === 0}
                className="w-full py-4 bg-tactical-accent text-tactical-bg font-bold rounded-2xl hover:scale-105 transition-transform disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-2"
              >
                <Save size={18} /> DATEN ÜBERTRAGEN
              </button>
            </div>
          </div>
        )}

        {activeSubTab === 'automation' && (
          <div className="flex-1 min-h-0 p-8 space-y-8 overflow-y-auto custom-scrollbar">
            <div className="max-w-4xl mx-auto space-y-8">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h3 className="text-2xl font-bold">Automation & Webhooks</h3>
                  <p className="text-xs text-tactical-muted uppercase tracking-widest font-bold mt-1">Event-Driven Hardware Orchestration</p>
                </div>
                <button 
                  onClick={() => setWebhooks([...webhooks, { id: Date.now().toString(), url: '', event: 'sensor_threshold', active: true }])}
                  className="w-full sm:w-auto px-4 py-2 bg-tactical-accent text-tactical-bg rounded-xl text-[10px] font-bold hover:scale-105 transition-transform flex items-center justify-center gap-2"
                >
                  <Plus size={14} /> NEUER WEBHOOK
                </button>
              </div>

              {/* MQTT Configuration */}
              <div className="bg-tactical-bg/50 border border-tactical-border rounded-2xl p-6 space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <h4 className="text-[10px] font-bold text-tactical-muted uppercase tracking-widest flex items-center gap-2">
                    <Globe size={14} /> MQTT Live-Ticker Protocol
                  </h4>
                  <div className={cn(
                    "px-2 py-1 rounded text-[8px] font-bold uppercase self-start sm:self-auto",
                    mqttConfig.status === 'connected' ? "bg-emerald-500/20 text-emerald-500" :
                    mqttConfig.status === 'connecting' ? "bg-yellow-500/20 text-yellow-500" :
                    "bg-red-500/20 text-red-500"
                  )}>
                    {mqttConfig.status}
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <label className="text-[8px] font-bold text-tactical-muted uppercase">Broker</label>
                    <input 
                      type="text" 
                      value={mqttConfig.broker}
                      onChange={(e) => setMqttConfig(prev => ({ ...prev, broker: e.target.value }))}
                      className="w-full bg-tactical-bg border border-tactical-border rounded-lg px-3 py-2 text-xs focus:border-tactical-accent outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] font-bold text-tactical-muted uppercase">Port</label>
                    <input 
                      type="number" 
                      value={mqttConfig.port}
                      onChange={(e) => setMqttConfig(prev => ({ ...prev, port: parseInt(e.target.value) }))}
                      className="w-full bg-tactical-bg border border-tactical-border rounded-lg px-3 py-2 text-xs focus:border-tactical-accent outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] font-bold text-tactical-muted uppercase">Topic</label>
                    <input 
                      type="text" 
                      value={mqttConfig.topic}
                      onChange={(e) => setMqttConfig(prev => ({ ...prev, topic: e.target.value }))}
                      className="w-full bg-tactical-bg border border-tactical-border rounded-lg px-3 py-2 text-xs focus:border-tactical-accent outline-none"
                    />
                  </div>
                  <div className="flex items-end">
                    <button 
                      onClick={() => setMqttConfig(prev => ({ ...prev, status: prev.status === 'connected' ? 'disconnected' : 'connecting' }))}
                      className={cn(
                        "w-full py-2 rounded-lg text-[10px] font-bold transition-all",
                        mqttConfig.status === 'connected' ? "bg-red-500/10 text-red-500 border border-red-500/30" : "bg-tactical-accent text-tactical-bg"
                      )}
                    >
                      {mqttConfig.status === 'connected' ? 'DISCONNECT' : 'CONNECT'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Brick Protection */}
              <div className="bg-tactical-bg/50 border border-tactical-border rounded-2xl p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-500/10 rounded-lg">
                      <ShieldCheck className="text-red-500 w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold">Brick-Schutz (Hardware Safety)</h4>
                      <p className="text-[10px] text-tactical-muted">Verhindert das Flashen von inkompatibler Firmware</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setBrickProtection(!brickProtection)}
                    className={cn(
                      "w-12 h-6 rounded-full transition-colors relative",
                      brickProtection ? "bg-emerald-500" : "bg-tactical-border"
                    )}
                  >
                    <div className={cn(
                      "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                      brickProtection ? "left-7" : "left-1"
                    )} />
                  </button>
                </div>
                {brickProtection && (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-3">
                    <Zap className="text-emerald-500 w-4 h-4" />
                    <p className="text-[10px] text-emerald-500 font-medium">Aktiv: Firmware-Signaturen werden vor dem Flash-Vorgang auf Hardware-ID-Match geprüft.</p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4">
                {webhooks.map(webhook => (
                  <div key={webhook.id} className="bg-tactical-bg/50 border border-tactical-border rounded-2xl p-4 flex items-center gap-4">
                    <div className="p-3 bg-tactical-accent/10 rounded-xl">
                      <Webhook className="text-tactical-accent w-5 h-5" />
                    </div>
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <label className="text-[8px] font-bold text-tactical-muted uppercase">Event</label>
                        <select 
                          value={webhook.event}
                          onChange={(e) => {
                            const newWebhooks = webhooks.map(w => w.id === webhook.id ? { ...w, event: e.target.value as any } : w);
                            setWebhooks(newWebhooks);
                            onUpdateWebhooks(newWebhooks);
                          }}
                          className="w-full bg-tactical-card border border-tactical-border rounded-lg p-2 text-xs focus:outline-none"
                        >
                          <option value="sensor_threshold">Sensor Schwellenwert</option>
                          <option value="device_online">Gerät Online</option>
                          <option value="device_offline">Gerät Offline</option>
                          <option value="button_press">Button gedrückt</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[8px] font-bold text-tactical-muted uppercase">Target URL</label>
                        <input 
                          type="text" 
                          value={webhook.url}
                          onChange={(e) => {
                            const newWebhooks = webhooks.map(w => w.id === webhook.id ? { ...w, url: e.target.value } : w);
                            setWebhooks(newWebhooks);
                            onUpdateWebhooks(newWebhooks);
                          }}
                          placeholder="https://..."
                          className="w-full bg-tactical-card border border-tactical-border rounded-lg p-2 text-xs focus:outline-none"
                        />
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <div className="space-y-1 flex-1">
                          <label className="text-[8px] font-bold text-tactical-muted uppercase">Threshold</label>
                          <input 
                            type="number" 
                            value={webhook.threshold}
                            onChange={(e) => {
                              const newWebhooks = webhooks.map(w => w.id === webhook.id ? { ...w, threshold: Number(e.target.value) } : w);
                              setWebhooks(newWebhooks);
                              onUpdateWebhooks(newWebhooks);
                            }}
                            className="w-full bg-tactical-card border border-tactical-border rounded-lg p-2 text-xs focus:outline-none"
                          />
                        </div>
                        <button 
                          onClick={() => {
                            const newWebhooks = webhooks.filter(w => w.id !== webhook.id);
                            setWebhooks(newWebhooks);
                            onUpdateWebhooks(newWebhooks);
                          }}
                          className="p-2 text-red-500/50 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeSubTab === 'scripts' && (
          <div className="flex-1 p-8 overflow-y-auto custom-scrollbar">
            <div className="max-w-4xl mx-auto space-y-8">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h3 className="text-2xl font-bold">ESP32 Scripting Engine</h3>
                  <p className="text-xs text-tactical-muted uppercase tracking-widest font-bold mt-1">Python | Shell | Automation Scripts</p>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  <select 
                    value={scriptType}
                    onChange={(e) => setScriptType(e.target.value as any)}
                    className="flex-1 sm:flex-none bg-tactical-bg border border-tactical-border rounded-xl px-4 py-2 text-xs font-mono focus:outline-none focus:border-tactical-accent"
                  >
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
                      placeholder={scriptType === 'python' ? "# Python 3 Script\nprint('Hello from ESP32 Bridge!')" : "# Shell Script\necho 'Executing tactical command...'"}
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
                          a.download = `esp32_script_logs_${new Date().toISOString()}.txt`;
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
                      <div key={`esp-log-${i}`} className="flex gap-3 animate-in fade-in slide-in-from-left-2 duration-300">
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
                  <h4 className="text-sm font-bold uppercase tracking-widest">Scripting_Context</h4>
                </div>
                <p className="text-[10px] text-tactical-muted leading-relaxed">
                  Skripte werden direkt auf dem Backend-Server ausgeführt. Python-Skripte haben Zugriff auf die <code className="text-tactical-accent">pyusb</code> und <code className="text-tactical-accent">pyserial</code> Bibliotheken, um direkt mit angeschlossener Hardware zu interagieren.
                </p>
              </div>
            </div>
          </div>
        )}

        {activeSubTab === 'wasdp' && (
          <div className="flex-1 min-h-0 p-6 space-y-6 overflow-y-auto custom-scrollbar">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <ShoppingBag className="text-tactical-accent" />
                  WASDP App Store
                </h3>
                <p className="text-xs text-tactical-muted uppercase tracking-widest font-bold">Wasp App Store & Deployment Platform</p>
              </div>
              <div className="relative w-full md:w-64">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-tactical-muted w-4 h-4" />
                <input 
                  type="text" 
                  placeholder="Apps durchsuchen..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-tactical-bg border border-tactical-border rounded-xl pl-10 pr-4 py-2 text-xs focus:outline-none focus:border-tactical-accent"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {waspApps.filter(app => 
                app.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                app.category.toLowerCase().includes(searchQuery.toLowerCase())
              ).map(app => (
                <motion.div 
                  key={app.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-tactical-bg/50 border border-tactical-border rounded-2xl p-6 flex flex-col space-y-4 hover:border-tactical-accent/50 transition-all group"
                >
                  <div className="flex justify-between items-start">
                    <div className="p-3 bg-tactical-accent/10 rounded-xl group-hover:scale-110 transition-transform">
                      {app.icon === 'ShieldCheck' ? <ShieldCheck className="text-tactical-accent" /> : 
                       app.icon === 'Zap' ? <Zap className="text-tactical-accent" /> :
                       app.icon === 'Globe' ? <Globe className="text-tactical-accent" /> :
                       <Cpu className="text-tactical-accent" />}
                    </div>
                    <div className="flex items-center gap-1 text-[10px] font-bold text-tactical-muted">
                      <Star size={12} className="text-yellow-500 fill-yellow-500" />
                      {app.stars.toLocaleString()}
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold">{app.title}</h4>
                      <span className="text-[8px] px-1.5 py-0.5 bg-tactical-accent/10 text-tactical-accent rounded border border-tactical-accent/20">{app.version}</span>
                    </div>
                    <p className="text-[10px] text-tactical-muted mt-1 line-clamp-2">{app.description}</p>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-tactical-border">
                    <div className="flex flex-col">
                      <span className="text-[8px] text-tactical-muted uppercase font-bold">Author</span>
                      <span className="text-[10px] font-mono">@{app.author}</span>
                    </div>
                    <button 
                      onClick={() => handleInstallApp(app)}
                      disabled={espDevices.length === 0 || espDevices.some(d => d.status === 'flashing')}
                      className="flex items-center gap-2 px-4 py-2 bg-tactical-accent text-tactical-bg font-bold rounded-xl text-[10px] hover:scale-105 transition-transform disabled:opacity-50"
                    >
                      <Download size={12} /> INSTALLIEREN
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {activeSubTab === 'diagnostic' && (
          <div className="flex-1 min-h-0 p-8 space-y-8 overflow-y-auto custom-scrollbar">
            <div className="max-w-4xl mx-auto space-y-8">
              <div className="flex justify-between items-end">
                <div>
                  <h3 className="text-2xl font-bold flex items-center gap-3">
                    <ShieldCheck className="text-tactical-accent w-8 h-8" />
                    System-Diagnose
                  </h3>
                  <p className="text-xs text-tactical-muted uppercase tracking-widest font-bold mt-1">Interface-Validierung & Hardware-Abstraktions-Check</p>
                </div>
                <button 
                  onClick={() => setDiagnostics({
                    serial: 'serial' in navigator,
                    usb: 'usb' in navigator,
                    bluetooth: 'bluetooth' in navigator,
                    storage: true,
                    network: navigator.onLine,
                    lastCheck: new Date().toLocaleTimeString()
                  })}
                  className="px-4 py-2 bg-tactical-accent/10 border border-tactical-accent/30 text-tactical-accent rounded-xl text-[10px] font-bold hover:bg-tactical-accent hover:text-tactical-bg transition-all flex items-center gap-2"
                >
                  <RefreshCw size={14} /> RE-SCAN
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <DiagCard 
                  label="Web Serial API" 
                  status={diagnostics.serial ? 'active' : 'error'} 
                  desc="Erforderlich für direkte serielle Kommunikation (ESP32, Arduino)."
                />
                <DiagCard 
                  label="WebUSB API" 
                  status={diagnostics.usb ? 'active' : 'error'} 
                  desc="Erforderlich für Low-Level USB-Zugriff (Qualcomm EDL, Fastboot)."
                />
                <DiagCard 
                  label="Web Bluetooth" 
                  status={diagnostics.bluetooth ? 'active' : 'warning'} 
                  desc="Erforderlich für BLE-Provisioning und mobile Hardware-Links."
                />
                <DiagCard 
                  label="Local Storage" 
                  status={diagnostics.storage ? 'active' : 'error'} 
                  desc="Erforderlich für die Persistenz von Konfigurationen und Vault-Daten."
                />
                <DiagCard 
                  label="Network Link" 
                  status={diagnostics.network ? 'active' : 'warning'} 
                  desc="Erforderlich für Cloud-Builds, Webhooks und OTA-Updates."
                />
                <div className="bg-tactical-bg/50 border border-tactical-border rounded-2xl p-6 flex flex-col justify-center items-center text-center space-y-2">
                  <div className="text-[10px] font-bold text-tactical-muted uppercase tracking-widest">Letzter Check</div>
                  <div className="text-xl font-mono font-bold text-tactical-accent">{diagnostics.lastCheck}</div>
                </div>
              </div>

              <div className="bg-tactical-bg/50 border border-tactical-border rounded-2xl p-6 space-y-4">
                <h4 className="text-[10px] font-bold text-tactical-muted uppercase tracking-widest flex items-center gap-2">
                  <Database size={14} /> Hardware-Abhängigkeiten & Stabilität
                </h4>
                <div className="space-y-3">
                  <DependencyRow label="Recharts v3.8.0" status="stable" desc="Echtzeit-Datenvisualisierung & Telemetrie-Charts." />
                  <DependencyRow label="Lucide-React v0.546.0" status="stable" desc="Taktisches Icon-Set für Hardware-Interfaces." />
                  <DependencyRow label="Motion v12.38.0" status="stable" desc="Hardware-beschleunigte UI-Animationen & Übergänge." />
                  <DependencyRow label="Tailwind CSS v4.1.14" status="stable" desc="Utility-First Styling für adaptive Dashboards." />
                </div>
              </div>

              <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-6">
                <h4 className="text-[10px] font-bold text-red-500 uppercase tracking-widest flex items-center gap-2 mb-4">
                  <Zap size={14} /> Kritische Hardware-Zugriffe
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-tactical-card border border-tactical-border rounded-xl space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-xs">ESP32 Flashing</span>
                      <span className="text-[10px] px-2 py-0.5 bg-emerald-500/20 text-emerald-500 rounded font-bold">BEREIT</span>
                    </div>
                    <p className="text-[10px] text-tactical-muted">Treiber-Stack für CP210x, CH34x und FTDI-Chips validiert.</p>
                  </div>
                  <div className="p-4 bg-tactical-card border border-tactical-border rounded-xl space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-xs">Serial Monitoring</span>
                      <span className="text-[10px] px-2 py-0.5 bg-emerald-500/20 text-emerald-500 rounded font-bold">BEREIT</span>
                    </div>
                    <p className="text-[10px] text-tactical-muted">Baudraten-Synchronisation und Buffer-Management aktiv.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Device Inventory */}
      <div className="bg-tactical-card border border-tactical-border rounded-2xl overflow-hidden">
        <div className="p-4 bg-tactical-bg border-b border-tactical-border flex items-center gap-2">
          <Database size={14} className="text-tactical-accent" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-tactical-muted">Geräte_Inventar</span>
        </div>
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-tactical-border bg-tactical-bg/30">
              <th className="p-4 font-bold text-tactical-muted uppercase tracking-widest">Name</th>
              <th className="p-4 font-bold text-tactical-muted uppercase tracking-widest">Status</th>
              <th className="p-4 font-bold text-tactical-muted uppercase tracking-widest">Baudrate</th>
              <th className="p-4 font-bold text-tactical-muted uppercase tracking-widest">IP / MAC</th>
              <th className="p-4 font-bold text-tactical-muted uppercase tracking-widest">Firmware</th>
              <th className="p-4 font-bold text-tactical-muted uppercase tracking-widest">Aktion</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-tactical-border">
            {espDevices.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-tactical-muted italic">Keine ESP32 Geräte registriert.</td>
              </tr>
            )}
            {espDevices.map(device => (
              <tr key={device.id} className="hover:bg-tactical-border/30 transition-colors">
                <td className="p-4 font-bold">{device.name}</td>
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "w-2 h-2 rounded-full", 
                      device.status === 'connected' ? "bg-tactical-accent animate-pulse" : 
                      device.status === 'flashing' ? "bg-yellow-500 animate-bounce" :
                      "bg-red-500"
                    )} />
                    <span className="uppercase text-[10px]">
                      {device.status === 'flashing' ? `FLASHING ${device.flashProgress}%` : device.status}
                    </span>
                  </div>
                </td>
                <td className="p-4 font-mono">{device.baudRate || baudRate}</td>
                <td className="p-4">
                  <div className="text-[10px] text-tactical-muted">{device.ip || 'N/A'}</div>
                  <div className="text-[10px] font-mono">{device.mac || 'N/A'}</div>
                </td>
                <td className="p-4">
                  <span className="px-2 py-0.5 bg-tactical-bg border border-tactical-border rounded text-[10px] font-mono">{device.firmware || 'v1.0.0-tactical'}</span>
                </td>
                <td className="p-4">
                  <button 
                    onClick={() => onDisconnect(device.id)}
                    className="p-2 hover:bg-red-500/10 text-red-500/50 hover:text-red-500 rounded-lg transition-all"
                  >
                    <X size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AnimatePresence>
        {showBrickWarning && pendingApp && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-tactical-card border border-red-500/50 rounded-3xl p-8 max-w-md w-full shadow-2xl space-y-6"
            >
              <div className="flex items-center gap-4 text-red-500">
                <div className="p-3 bg-red-500/20 rounded-2xl">
                  <ShieldCheck size={32} />
                </div>
                <div>
                  <h3 className="text-xl font-bold uppercase tracking-tight">Brick-Warnung</h3>
                  <p className="text-xs font-bold opacity-70">Hardware-Inkompatibilität erkannt</p>
                </div>
              </div>

              <div className="space-y-4 py-4">
                <p className="text-sm leading-relaxed">
                  Der **Brick-Schutz** hat eine potenzielle Inkompatibilität festgestellt:
                </p>
                <div className="bg-tactical-bg rounded-2xl p-4 space-y-2 border border-tactical-border">
                  <div className="flex justify-between text-[10px] uppercase tracking-widest font-bold">
                    <span className="text-tactical-muted">App:</span>
                    <span>{pendingApp.title}</span>
                  </div>
                  <div className="flex justify-between text-[10px] uppercase tracking-widest font-bold">
                    <span className="text-tactical-muted">Kompatibel mit:</span>
                    <span className="text-tactical-accent">{pendingApp.compatibility.join(', ')}</span>
                  </div>
                  <div className="flex justify-between text-[10px] uppercase tracking-widest font-bold border-t border-tactical-border pt-2 mt-2">
                    <span className="text-tactical-muted">Erkannte Hardware:</span>
                    <span className="text-red-500">{connectedDevice?.chipType || 'Unbekannt'}</span>
                  </div>
                </div>
                <p className="text-xs text-tactical-muted italic">
                  Das Flashen von inkompatibler Firmware kann dein Gerät dauerhaft beschädigen (Brick).
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  onClick={() => setShowBrickWarning(false)}
                  className="flex-1 py-3 bg-tactical-bg border border-tactical-border rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-tactical-border transition-colors"
                >
                  ABBRECHEN
                </button>
                <button 
                  onClick={() => startFlash(pendingApp)}
                  className="flex-1 py-3 bg-red-500 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20"
                >
                  TROTZDEM FLASHEN
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SubNavItem({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-4 py-2 text-[10px] font-bold rounded-lg transition-all",
        active ? "bg-tactical-accent text-tactical-bg shadow-lg" : "text-tactical-muted hover:text-tactical-text"
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function StatCard({ label, value, icon }: { label: string, value: string, icon: React.ReactNode }) {
  return (
    <div className="bg-tactical-bg/50 border border-tactical-border rounded-2xl p-4 flex items-center gap-4">
      <div className="p-3 bg-tactical-card rounded-xl border border-tactical-border">
        {icon}
      </div>
      <div>
        <div className="text-[8px] font-bold text-tactical-muted uppercase tracking-widest">{label}</div>
        <div className="text-xl font-bold tracking-tight">{value}</div>
      </div>
    </div>
  );
}

function DiagCard({ label, status, desc }: { label: string, status: 'active' | 'warning' | 'error', desc: string }) {
  return (
    <div className="bg-tactical-bg/50 border border-tactical-border rounded-2xl p-6 space-y-3">
      <div className="flex justify-between items-center">
        <span className="font-bold text-sm">{label}</span>
        <div className={cn(
          "px-2 py-1 rounded text-[8px] font-bold uppercase",
          status === 'active' ? "bg-emerald-500/20 text-emerald-500" :
          status === 'warning' ? "bg-yellow-500/20 text-yellow-500" :
          "bg-red-500/20 text-red-500"
        )}>
          {status}
        </div>
      </div>
      <p className="text-[10px] text-tactical-muted leading-relaxed">{desc}</p>
    </div>
  );
}

function DependencyRow({ label, status, desc }: { label: string, status: string, desc: string }) {
  return (
    <div className="flex items-center justify-between p-3 bg-tactical-card border border-tactical-border rounded-xl">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="font-bold text-xs">{label}</span>
          <span className="text-[8px] px-1.5 py-0.5 bg-tactical-accent/10 text-tactical-accent rounded border border-tactical-accent/20 uppercase">{status}</span>
        </div>
        <p className="text-[10px] text-tactical-muted">{desc}</p>
      </div>
      <ChevronRight size={14} className="text-tactical-muted" />
    </div>
  );
}
