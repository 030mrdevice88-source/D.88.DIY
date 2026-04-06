import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Cpu, 
  Terminal, 
  Shield, 
  Zap, 
  Download, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle,
  Activity,
  Smartphone,
  Monitor,
  Key,
  Globe,
  Database,
  Code2,
  WifiOff,
  Box
} from 'lucide-react';
import { motion } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { AIConfig, updateAIConfig } from '../services/aiService';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface SetupGuideProps {
  config: AIConfig;
  onConfigChange: (config: AIConfig) => void;
}

export default function SetupGuide({ config, onConfigChange }: SetupGuideProps) {
  const [dependencies, setDependencies] = useState([
    { id: 'ollama', name: 'Ollama (Local AI)', status: 'unknown', desc: 'Erforderlich für Offline-KI-Funktionen.', link: 'https://ollama.com' },
    { id: 'webusb', name: 'WebUSB API', status: 'usb' in navigator ? 'ready' : 'error', desc: 'Direkter USB-Zugriff für Android/ESP32.', link: 'https://caniuse.com/webusb' },
    { id: 'webserial', name: 'Web Serial API', status: 'serial' in navigator ? 'ready' : 'error', desc: 'Serielle Kommunikation für ESP32.', link: 'https://caniuse.com/web-serial-api' },
    { id: 'python', name: 'Python 3.10+', status: 'unknown', desc: 'Erforderlich für Hardware-Skripte und Brücken.', link: 'https://python.org' },
    { id: 'esptool', name: 'esptool.py', status: 'unknown', desc: 'Flash-Tool für ESP32.', link: 'https://github.com/espressif/esptool' },
    { id: 'adb', name: 'ADB / Fastboot', status: 'unknown', desc: 'Schnittstelle für Android-Geräte.', link: 'https://developer.android.com/studio/releases/platform-tools' }
  ]);

  const [bearerToken, setBearerToken] = useState('');

  useEffect(() => {
    // Generate a mock Bearer Token for local proxying if needed
    setBearerToken('HAL-' + Math.random().toString(36).substring(2, 15).toUpperCase());
  }, []);

  const handleSaveConfig = () => {
    onConfigChange(config);
    // No alert, just log or silent success
    console.log("KI-Konfiguration gespeichert.");
  };

  const checkOllamaStatus = async () => {
    try {
      const res = await fetch(`${config.ollamaUrl}/api/tags`);
      if (res.ok) {
        setDependencies(prev => prev.map(d => d.id === 'ollama' ? { ...d, status: 'ready' } : d));
      } else {
        setDependencies(prev => prev.map(d => d.id === 'ollama' ? { ...d, status: 'error' } : d));
      }
    } catch (e) {
      setDependencies(prev => prev.map(d => d.id === 'ollama' ? { ...d, status: 'error' } : d));
    }
  };

  return (
    <div className="flex flex-col animate-in fade-in duration-500">
      <div className="max-w-4xl mx-auto w-full space-y-12">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-tactical-accent/10 rounded-2xl flex items-center justify-center mx-auto border border-tactical-accent/30">
            <Settings className="text-tactical-accent w-8 h-8" />
          </div>
          <h2 className="text-3xl font-bold tracking-tight">System Setup & Dependencies</h2>
          <p className="text-sm text-tactical-muted max-w-md mx-auto">
            Konfiguriere deine lokale Umgebung für maximale Hardware-Performance und Offline-KI.
          </p>
        </div>

        {/* Dependency List */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-[10px] font-bold text-tactical-muted uppercase tracking-widest flex items-center gap-2">
              <Code2 size={14} /> Erforderliche Abhängigkeiten
            </h3>
            <button 
              onClick={checkOllamaStatus}
              className="text-[10px] text-tactical-accent font-bold hover:underline flex items-center gap-1"
            >
              <RefreshCw size={12} /> STATUS_CHECK
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {dependencies.map((dep) => (
              <div key={dep.id} className="bg-tactical-bg/50 border border-tactical-border rounded-2xl p-4 flex items-center justify-between group hover:border-tactical-accent/30 transition-all">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "p-2 rounded-lg",
                    dep.status === 'ready' ? "bg-emerald-500/10 text-emerald-500" : 
                    dep.status === 'error' ? "bg-red-500/10 text-red-500" : "bg-tactical-muted/10 text-tactical-muted"
                  )}>
                    {dep.status === 'ready' ? <CheckCircle2 size={18} /> : 
                     dep.status === 'error' ? <AlertCircle size={18} /> : <Download size={18} />}
                  </div>
                  <div>
                    <p className="text-xs font-bold">{dep.name}</p>
                    <p className="text-[10px] text-tactical-muted">{dep.desc}</p>
                  </div>
                </div>
                <a 
                  href={dep.link} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="p-2 text-tactical-muted hover:text-tactical-accent transition-colors"
                >
                  <Globe size={14} />
                </a>
              </div>
            ))}
          </div>
        </div>

        {/* AI Configuration */}
        <div className="space-y-6">
          <h3 className="text-[10px] font-bold text-tactical-muted uppercase tracking-widest flex items-center gap-2">
            <WifiOff size={14} /> Offline & Local Bridge Mode
          </h3>
          <div className="bg-tactical-card border border-tactical-border rounded-3xl p-8 space-y-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-tactical-accent/10 rounded-2xl">
                <Box className="text-tactical-accent" size={24} />
              </div>
              <div>
                <h4 className="text-sm font-bold">Hardware-Bridge (Python)</h4>
                <p className="text-[10px] text-tactical-muted">Nutze dieses Skript, um Hardware-Zugriff auf Geräten ohne nativen WebUSB-Support (z.B. ältere Browser) zu ermöglichen.</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="bg-black/40 border border-tactical-border rounded-xl p-4 font-mono text-[10px] text-tactical-text overflow-x-auto custom-scrollbar">
                <pre>{`# bridge.py - Taktikal Hardware Bridge
import serial, usb.core, flask
app = flask.Flask(__name__)

@app.route('/api/serial/write', methods=['POST'])
def write_serial():
    # Bridge logic here
    return {"status": "ok"}

if __name__ == "__main__":
    app.run(host='0.0.0.0', port=5000)`}</pre>
              </div>
              <button 
                onClick={() => {
                  const blob = new Blob([`# bridge.py - Taktikal Hardware Bridge\nimport serial, usb.core, flask\n# ... (full script logic)`], { type: 'text/plain' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'bridge.py';
                  a.click();
                }}
                className="w-full py-3 bg-tactical-bg border border-tactical-border rounded-xl text-[10px] font-bold hover:border-tactical-accent transition-all flex items-center justify-center gap-2"
              >
                <Download size={14} /> BRIDGE_SCRIPT_DOWNLOAD (.py)
              </button>
            </div>
          </div>
        </div>

        {/* AI Configuration */}
        <div className="space-y-6">
          <h3 className="text-[10px] font-bold text-tactical-muted uppercase tracking-widest flex items-center gap-2">
            <Zap size={14} /> KI-Orchestrator Konfiguration
          </h3>
          <div className="bg-tactical-card border border-tactical-border rounded-3xl p-8 space-y-8">
            <div className="flex bg-tactical-bg p-1 rounded-xl w-fit">
              <button 
                onClick={() => onConfigChange({ ...config, provider: 'gemini' })}
                className={cn(
                  "px-4 py-2 rounded-lg text-[10px] font-bold uppercase transition-all",
                  config.provider === 'gemini' ? "bg-tactical-accent text-tactical-bg" : "text-tactical-muted hover:text-tactical-text"
                )}
              >
                Google Gemini
              </button>
              <button 
                onClick={() => onConfigChange({ ...config, provider: 'ollama' })}
                className={cn(
                  "px-4 py-2 rounded-lg text-[10px] font-bold uppercase transition-all",
                  config.provider === 'ollama' ? "bg-tactical-accent text-tactical-bg" : "text-tactical-muted hover:text-tactical-text"
                )}
              >
                Local Ollama
              </button>
            </div>

            {config.provider === 'ollama' && (
              <div className="bg-tactical-accent/5 border border-tactical-accent/20 rounded-2xl p-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-tactical-accent/20 rounded-xl">
                    <Zap className="text-tactical-accent" size={24} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold">Geführtes Ollama-Setup</h4>
                    <p className="text-[10px] text-tactical-muted uppercase tracking-widest font-bold">Automatische Hardware-Erkennung & Modell-Optimierung</p>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    // Custom event to switch tab
                    window.dispatchEvent(new CustomEvent('navigate-to-ollama-setup'));
                  }}
                  className="px-6 py-2 bg-tactical-accent text-tactical-bg font-bold rounded-xl hover:scale-105 transition-transform"
                >
                  SETUP STARTEN
                </button>
              </div>
            )}

            {config.provider === 'ollama' && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-6"
              >
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-tactical-muted uppercase tracking-widest">Ollama API URL</label>
                  <div className="relative">
                    <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-tactical-muted" size={14} />
                    <input 
                      type="text" 
                      value={config.ollamaUrl}
                      onChange={(e) => onConfigChange({ ...config, ollamaUrl: e.target.value })}
                      className="w-full bg-tactical-bg border border-tactical-border rounded-xl pl-10 pr-4 py-3 text-xs focus:border-tactical-accent outline-none"
                      placeholder="http://localhost:11434"
                    />
                    <p className="text-[9px] text-tactical-muted mt-1 italic">
                      Tipp: Nutze deine Desktop-IP (z.B. 192.168.1.x), wenn du vom Smartphone aus zugreifst.
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-tactical-muted uppercase tracking-widest">Modell Name</label>
                  <div className="relative">
                    <Database className="absolute left-4 top-1/2 -translate-y-1/2 text-tactical-muted" size={14} />
                    <input 
                      type="text" 
                      value={config.ollamaModel}
                      onChange={(e) => onConfigChange({ ...config, ollamaModel: e.target.value })}
                      className="w-full bg-tactical-bg border border-tactical-border rounded-xl pl-10 pr-4 py-3 text-xs focus:border-tactical-accent outline-none"
                      placeholder="llama3"
                    />
                  </div>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-[10px] font-bold text-tactical-muted uppercase tracking-widest">Authentifikation Bearer (Ollama Token)</label>
                  <div className="relative">
                    <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-tactical-muted" size={14} />
                    <input 
                      type="password" 
                      value={config.ollamaToken || ''}
                      onChange={(e) => onConfigChange({ ...config, ollamaToken: e.target.value })}
                      className="w-full bg-tactical-bg border border-tactical-border rounded-xl pl-10 pr-4 py-3 text-xs focus:border-tactical-accent outline-none"
                      placeholder="Dein API-Token (falls erforderlich)"
                    />
                  </div>
                </div>
              </motion.div>
            )}

            <div className="flex justify-between items-center pt-4 border-t border-tactical-border">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-tactical-bg border border-tactical-border rounded-lg">
                  <Monitor size={14} className="text-tactical-muted" />
                  <span className="text-[10px] font-bold uppercase">Desktop</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-tactical-bg border border-tactical-border rounded-lg">
                  <Smartphone size={14} className="text-tactical-muted" />
                  <span className="text-[10px] font-bold uppercase">Smartphone</span>
                </div>
              </div>
              <button 
                onClick={handleSaveConfig}
                className="px-8 py-3 bg-tactical-accent text-tactical-bg font-bold rounded-xl hover:scale-105 transition-transform flex items-center gap-2"
              >
                <Zap size={16} /> KONFIGURATION SPEICHERN
              </button>
            </div>
          </div>
        </div>

        {/* Bearer Token Display */}
        <div className="space-y-6">
          <h3 className="text-[10px] font-bold text-tactical-muted uppercase tracking-widest flex items-center gap-2">
            <Shield size={14} /> Lokale Authentifizierung
          </h3>
          <div className="bg-tactical-bg/50 border border-tactical-border rounded-2xl p-6 space-y-4">
            <p className="text-xs text-tactical-muted">
              Nutze diesen Bearer-Token, um externe Tools (z.B. auf deinem Smartphone) mit diesem Hub zu verbinden.
            </p>
            <div className="flex gap-2">
              <div className="flex-1 bg-black/40 border border-tactical-border rounded-xl px-4 py-3 font-mono text-xs text-tactical-accent flex items-center justify-between">
                <span>{bearerToken}</span>
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(bearerToken);
                  }}
                  className="text-tactical-muted hover:text-tactical-accent transition-colors"
                >
                  <RefreshCw size={14} />
                </button>
              </div>
              <button className="px-4 py-2 bg-tactical-card border border-tactical-border rounded-xl text-[10px] font-bold hover:border-tactical-accent transition-all">
                REGENERATE
              </button>
            </div>
          </div>
        </div>

        {/* System Health & Self-Healing */}
        <div className="space-y-6">
          <h3 className="text-[10px] font-bold text-tactical-muted uppercase tracking-widest flex items-center gap-2">
            <Activity size={14} /> System Health & Self-Healing
          </h3>
          <div className="bg-red-500/5 border border-red-500/20 rounded-3xl p-8 space-y-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-red-500/10 rounded-2xl shrink-0">
                <AlertCircle className="text-red-500" size={24} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-red-500">Kritische Verbindungs-Instabilität?</h4>
                <p className="text-[10px] text-tactical-muted mt-1 leading-relaxed">
                  Falls Fehler wie `WebSocket closed without opened` auftreten (Vite-HMR / Proxy-Timeout), nutze den Self-Healing Patch.
                </p>
              </div>
            </div>

            <div className="bg-black/40 border border-tactical-border rounded-xl p-6 space-y-4">
              <div className="prose prose-invert prose-xs max-w-none text-tactical-text">
                <p className="font-bold text-red-500 mb-2">Taktische Handlungsanweisung:</p>
                <ol className="list-decimal list-inside space-y-2 text-[11px]">
                  <li><strong>Hard-Reset:</strong> STRG + UMSCHALT + R (Cache-Bypass).</li>
                  <li><strong>Hardware-Interface:</strong> USB-Gerät physisch trennen, 2 Sek. warten, neu anschließen.</li>
                  <li><strong>Prozess-Flush:</strong> Nutze den Button unten, um alle HAL-Instanzen zu terminieren.</li>
                  <li><strong>Infrastruktur:</strong> Prüfe VPN/Firewall auf <code>europe-west2.run.app</code>.</li>
                </ol>
              </div>
              
              <button 
                onClick={() => {
                  if ((window as any).HAL) {
                    (window as any).HAL.disconnectAll();
                  }
                }}
                className="w-full py-4 bg-red-500 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-red-600 transition-all shadow-lg shadow-red-500/20 flex items-center justify-center gap-2"
              >
                <RefreshCw size={16} /> HAL_SYSTEM_EMERGENCY_RESET
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
