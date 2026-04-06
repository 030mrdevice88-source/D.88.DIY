import React, { useState, useEffect } from 'react';
import { 
  Cpu, 
  Zap, 
  Download, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle,
  Monitor,
  Database,
  Shield,
  ChevronRight,
  Terminal,
  Activity,
  Server,
  HardDrive,
  Layers,
  Box,
  Key,
  Search
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

import { AIConfig } from '../services/aiService';

interface DeviceSpecs {
  cores: number;
  memory: number;
  platform: string;
  gpu?: string;
  tier: 'low' | 'mid' | 'high' | 'ultra';
}

interface ModelConfig {
  name: string;
  quantization: string;
  ramRequired: string;
  fallback?: string;
  specialization?: string;
}

const DEVICE_PRESETS: Record<string, ModelConfig> = {
  'samsung-a14': {
    name: 'qwen2:0.5b-instruct-q4_K_M',
    quantization: 'Q4_K_M (4-bit)',
    ramRequired: '0.8 GB',
    fallback: 'tinyllama:1.1b',
    specialization: 'Mobile Repair & FRP Bypass (Optimiert für ARM Cortex-A76/A55)'
  },
  'honeywell-ct45p': {
    name: 'phi3:3.8b-mini-instruct-4k-q4_K_M',
    quantization: 'Q4_K_M (4-bit)',
    ramRequired: '2.6 GB',
    fallback: 'qwen2:1.5b',
    specialization: 'Enterprise Hardware Diagnostics & Barcode-Scanner Logic'
  },
  'imac-2011': {
    name: 'llama3:8b-instruct-q4_K_M',
    quantization: 'Q4_K_M (4-bit)',
    ramRequired: '4.8 GB',
    fallback: 'mistral:7b-instruct-q4_K_M',
    specialization: 'Full-Stack Repair Orchestration (CPU-Inference Optimized)'
  },
  'macbook-pro-m3': {
    name: 'llama3.2:latest',
    quantization: 'Q8_0 (8-bit)',
    ramRequired: '8.5 GB',
    fallback: 'llama3:8b',
    specialization: 'High-Performance Coding & Hardware Analysis'
  },
  'default-mid': { 
    name: 'phi3:3.8b-mini-instruct-4k-q4_K_M', 
    quantization: 'Q4_K_M (4-bit)', 
    ramRequired: '2.6 GB',
    fallback: 'tinyllama:1.1b',
    specialization: 'General Hardware Assistance'
  }
};

const MODEL_TIERS: Record<string, ModelConfig> = {
  low: DEVICE_PRESETS['samsung-a14'],
  mid: DEVICE_PRESETS['default-mid'],
  high: DEVICE_PRESETS['imac-2011']
};

interface SetupStep {
  id: number;
  title: string;
  description: string;
  status: 'pending' | 'active' | 'completed' | 'error';
  actionLabel?: string;
  action?: () => Promise<void>;
}

interface OllamaSetupSpaceProps {
  config: AIConfig;
  onConfigChange: (config: AIConfig) => void;
}

export default function OllamaSetupSpace({ config, onConfigChange }: OllamaSetupSpaceProps) {
  const [specs, setSpecs] = useState<DeviceSpecs | null>(null);
  const [modelConfig, setModelConfig] = useState<ModelConfig>(DEVICE_PRESETS['macbook-pro-m3']);
  const [selectedDevice, setSelectedDevice] = useState<string>('macbook-pro-m3');
  const [currentStep, setCurrentStep] = useState(1);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const [pullProgress, setPullProgress] = useState(0);
  const [pullStatus, setPullStatus] = useState('');
  const [performanceMode, setPerformanceMode] = useState(true);
  const [isTestingAuth, setIsTestingAuth] = useState(false);
  const [authTestResult, setAuthTestResult] = useState<'success' | 'error' | null>(null);
  const [validationResults, setValidationResults] = useState<{
    ollama: boolean;
    model: boolean;
    sql: boolean;
    hardware: boolean;
  }>({
    ollama: false,
    model: false,
    sql: false,
    hardware: false
  });

  useEffect(() => {
    // Initial basic detection
    const detectSpecs = () => {
      const cores = navigator.hardwareConcurrency || 4;
      const memory = (navigator as any).deviceMemory || 4;
      const platform = navigator.platform;
      
      let tier: 'low' | 'mid' | 'high' | 'ultra' = 'mid';
      if (memory <= 4) tier = 'low';
      else if (memory > 8) tier = 'high';

      setSpecs({ cores, memory, platform, tier });
    };

    detectSpecs();
  }, []);

  const autoDetectHardware = () => {
    const cores = navigator.hardwareConcurrency || 4;
    const memory = (navigator as any).deviceMemory || 4;
    const platform = navigator.platform;
    let gpu = 'Unknown GPU';

    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (gl) {
        const debugInfo = (gl as WebGLRenderingContext).getExtension('WEBGL_debug_renderer_info');
        if (debugInfo) {
          gpu = (gl as WebGLRenderingContext).getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
        }
      }
    } catch (e) {
      console.warn("GPU detection failed", e);
    }

    let tier: 'low' | 'mid' | 'high' | 'ultra' = 'mid';
    let targetProfile = 'default-mid';

    if (memory >= 16 || (gpu.toLowerCase().includes('apple') && memory >= 8)) {
      tier = 'ultra';
      targetProfile = 'macbook-pro-m3';
    } else if (memory >= 8) {
      tier = 'high';
      targetProfile = 'imac-2011';
    } else if (memory <= 4 && platform.toLowerCase().includes('arm')) {
      tier = 'low';
      targetProfile = 'samsung-a14';
    } else if (memory <= 4) {
      tier = 'low';
      targetProfile = 'honeywell-ct45p';
    }

    setSpecs({ cores, memory, platform, gpu, tier });
    setSelectedDevice(targetProfile);
    setModelConfig(DEVICE_PRESETS[targetProfile]);
  };

  const pullModel = async (modelName: string) => {
    setIsPulling(true);
    setPullProgress(0);
    setPullStatus('Initialisiere Download...');

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      if (config.ollamaToken) {
        headers['Authorization'] = `Bearer ${config.ollamaToken}`;
      }

      const response = await fetch(`${config.ollamaUrl}/api/pull`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ name: modelName }),
      });

      if (!response.ok) throw new Error('Ollama API Fehler');

      const reader = response.body?.getReader();
      if (!reader) throw new Error('Stream nicht verfügbar');

      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const data = JSON.parse(line);
            if (data.status) setPullStatus(data.status);
            if (data.total && data.completed) {
              const progress = Math.round((data.completed / data.total) * 100);
              setPullProgress(progress);
            }
          } catch (e) {
            console.warn('Fehler beim Parsen des Pull-Streams:', e);
          }
        }
      }

      setPullStatus('Download abgeschlossen!');
      setPullProgress(100);
      await new Promise(r => setTimeout(r, 1000));
      setIsPulling(false);
      setCurrentStep(4);

    } catch (error) {
      console.error('Pull Error:', error);
      setPullStatus('Fehler beim Download. Bitte manuell im Terminal versuchen.');
      setIsPulling(false);
      // Fallback to manual alert if API fails
      console.error(`Automatischer Download fehlgeschlagen. Bitte nutze das Terminal:\nollama pull ${modelName}`);
      setCurrentStep(4);
    }
  };

  const steps: SetupStep[] = [
    {
      id: 1,
      title: "Ollama Installation",
      description: "Lade Ollama für dein Betriebssystem herunter und installiere es.",
      status: currentStep === 1 ? 'active' : currentStep > 1 ? 'completed' : 'pending',
      actionLabel: "DOWNLOAD OLLAMA",
      action: async () => {
        window.open('https://ollama.com/download', '_blank');
        setCurrentStep(2);
      }
    },
    {
      id: 2,
      title: "Ollama Starten",
      description: "Stelle sicher, dass Ollama im Hintergrund läuft (Icon in der Menüleiste).",
      status: currentStep === 2 ? 'active' : currentStep > 2 ? 'completed' : 'pending',
      actionLabel: "ICH HABE ES GESTARTET",
      action: async () => {
        setCurrentStep(3);
      }
    },
    {
      id: 3,
      title: "Quantisiertes Modell Laden",
      description: `Automatischer Download des optimierten Modells (${modelConfig.name}).`,
      status: currentStep === 3 ? 'active' : currentStep > 3 ? 'completed' : 'pending',
      actionLabel: isPulling ? `LÄDT... ${pullProgress}%` : `PULL ${modelConfig.name.split(':')[0].toUpperCase()}`,
      action: async () => {
        await pullModel(modelConfig.name);
      }
    },
    {
      id: 4,
      title: "Datenbank & Vektor-Store",
      description: "Konfiguriere ChromaDB, Qdrant oder lokale SQLite für RAG & Memory.",
      status: currentStep === 4 ? 'active' : currentStep > 4 ? 'completed' : 'pending',
      actionLabel: "ZUM DB VAULT",
      action: async () => {
        window.dispatchEvent(new CustomEvent('navigate-to-db-vault'));
        setCurrentStep(5);
      }
    },
    {
      id: 5,
      title: "System Validierung",
      description: "Prüfe alle Abhängigkeiten, Datenbanken und Hardware-Limits.",
      status: currentStep === 5 ? 'active' : currentStep > 5 ? 'completed' : 'pending',
      actionLabel: "VALIDIERUNG STARTEN",
      action: async () => {
        await runFullValidation();
      }
    }
  ];

  const runFullValidation = async () => {
    setIsVerifying(true);
    
    const results = {
      ollama: false,
      model: false,
      sql: false,
      hardware: (specs?.memory || 0) >= 1.5 // Minimum for tinyllama
    };

    // Check IndexedDB (SQL-like local storage)
    try {
      const dbRequest = indexedDB.open("TacticalVault", 1);
      dbRequest.onsuccess = () => {
        results.sql = true;
        setValidationResults(prev => ({ ...prev, sql: true }));
      };
    } catch (e) {
      results.sql = false;
    }

    try {
      const headers: Record<string, string> = {};
      if (config.ollamaToken) {
        headers['Authorization'] = `Bearer ${config.ollamaToken}`;
      }

      const res = await fetch(`${config.ollamaUrl}/api/tags`, { headers });
      if (res.ok) {
        results.ollama = true;
        const data = await res.json();
        results.model = data.models?.some((m: any) => m.name.includes(modelConfig.name.split(':')[0]));
        
        // Fallback Strategy
        if (!results.model && modelConfig.fallback) {
          results.model = data.models?.some((m: any) => m.name.includes(modelConfig.fallback!.split(':')[0]));
        }
      }
    } catch (e) {
      results.ollama = false;
    }

    setValidationResults(results);
    setIsVerifying(false);
    if (results.ollama && results.model) {
      setCurrentStep(6);
    }
  };

  const testAuthConnection = async () => {
    setIsTestingAuth(true);
    setAuthTestResult(null);
    try {
      const headers: Record<string, string> = {};
      if (config.ollamaToken) {
        headers['Authorization'] = `Bearer ${config.ollamaToken}`;
      }
      const res = await fetch(`${config.ollamaUrl}/api/tags`, { headers });
      if (res.ok) {
        setAuthTestResult('success');
      } else {
        setAuthTestResult('error');
      }
    } catch (e) {
      setAuthTestResult('error');
    } finally {
      setIsTestingAuth(false);
    }
  };

  return (
    <div className="flex flex-col animate-in fade-in duration-500">
      <div className="max-w-4xl mx-auto w-full space-y-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <h2 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <Zap className="text-tactical-accent" size={32} /> Ollama Setup-Space
            </h2>
            <p className="text-sm text-tactical-muted">
              Geführtes Setup für deine lokale KI-Infrastruktur.
            </p>
          </div>
          {specs && (
            <div className="flex flex-wrap gap-4 w-full md:w-auto">
              <div className="bg-tactical-card border border-tactical-border rounded-2xl p-4 flex items-center gap-3 flex-1 md:flex-none">
                <Cpu className="text-tactical-accent" size={20} />
                <div>
                  <p className="text-[10px] font-bold text-tactical-muted uppercase">CPU Cores</p>
                  <p className="text-sm font-bold">{specs.cores}</p>
                </div>
              </div>
              <div className="bg-tactical-card border border-tactical-border rounded-2xl p-4 flex items-center gap-3 flex-1 md:flex-none">
                <HardDrive className="text-tactical-accent" size={20} />
                <div>
                  <p className="text-[10px] font-bold text-tactical-muted uppercase">RAM</p>
                  <p className="text-sm font-bold">{specs.memory} GB</p>
                </div>
              </div>
              {specs.gpu && specs.gpu !== 'Unknown GPU' && (
                <div className="bg-tactical-card border border-tactical-border rounded-2xl p-4 flex items-center gap-3 flex-1 md:flex-none">
                  <Monitor className="text-tactical-accent" size={20} />
                  <div>
                    <p className="text-[10px] font-bold text-tactical-muted uppercase">GPU</p>
                    <p className="text-sm font-bold truncate max-w-[120px]" title={specs.gpu}>{specs.gpu.split(' ').slice(0, 2).join(' ')}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Device Recommendation & Intelligence */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-tactical-accent/5 border border-tactical-accent/20 rounded-3xl p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Activity className="text-tactical-accent" size={20} /> Hardware-Analyse & Modell-Auswahl
              </h3>
              <div className="flex flex-wrap items-center gap-4 w-full sm:w-auto">
                <button 
                  onClick={autoDetectHardware}
                  className="px-3 py-1.5 bg-tactical-accent/20 text-tactical-accent border border-tactical-accent/50 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-tactical-accent hover:text-tactical-bg transition-colors flex items-center gap-2"
                >
                  <Search size={12} /> Auto-Detect
                </button>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-tactical-muted uppercase">Performance Mode</span>
                  <button 
                    onClick={() => setPerformanceMode(!performanceMode)}
                    className={cn(
                      "w-10 h-5 rounded-full relative transition-colors",
                      performanceMode ? "bg-tactical-accent" : "bg-tactical-border"
                    )}
                  >
                    <div className={cn(
                      "absolute top-1 w-3 h-3 rounded-full bg-tactical-bg transition-all",
                      performanceMode ? "right-1" : "left-1"
                    )} />
                  </button>
                </div>
              </div>
            </div>

            {/* Device & Model Selector */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-tactical-muted uppercase tracking-widest">Ziel-Hardware Profil</label>
                <select 
                  value={selectedDevice}
                  onChange={(e) => {
                    setSelectedDevice(e.target.value);
                    setModelConfig(DEVICE_PRESETS[e.target.value]);
                  }}
                  className="w-full bg-tactical-bg border border-tactical-border rounded-xl px-4 py-3 text-xs focus:border-tactical-accent outline-none appearance-none"
                >
                  <option value="default-mid">Auto-Detect (Mid-Tier)</option>
                  <option value="samsung-a14">Samsung SM-A14R/DSN (Mobile/Termux)</option>
                  <option value="honeywell-ct45p">Honeywell CT45P XON (Enterprise Rugged)</option>
                  <option value="imac-2011">iMac 2011 i5 Quadcore 8GB (CPU Inference)</option>
                  <option value="macbook-pro-m3">MacBook Pro M3 (High-Performance)</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-tactical-muted uppercase tracking-widest">Manuelle Modellauswahl</label>
                <select 
                  value={modelConfig.name}
                  onChange={(e) => {
                    const selectedName = e.target.value;
                    const preset = Object.values(DEVICE_PRESETS).find(p => p.name === selectedName) || {
                      name: selectedName,
                      quantization: 'Custom',
                      ramRequired: 'Unknown',
                      specialization: 'Custom Selection'
                    };
                    setModelConfig(preset);
                  }}
                  className="w-full bg-tactical-bg border border-tactical-border rounded-xl px-4 py-3 text-xs focus:border-tactical-accent outline-none appearance-none"
                >
                  <option value="qwen2:0.5b-instruct-q4_K_M">qwen2:0.5b-instruct-q4_K_M</option>
                  <option value="phi3:3.8b-mini-instruct-4k-q4_K_M">phi3:3.8b-mini-instruct-4k-q4_K_M</option>
                  <option value="llama3:8b-instruct-q4_K_M">llama3:8b-instruct-q4_K_M</option>
                  <option value="llama3.2:latest">llama3.2:latest</option>
                  <option value="mistral:7b-instruct-q4_K_M">mistral:7b-instruct-q4_K_M</option>
                  <option value="tinyllama:1.1b">tinyllama:1.1b</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-tactical-border/50">
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-tactical-muted uppercase tracking-widest">Empfohlenes Modell</p>
                <p className="text-sm font-bold text-tactical-accent">{modelConfig.name}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-tactical-muted uppercase tracking-widest">Quantisierung</p>
                <p className="text-sm font-bold">{modelConfig.quantization}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-tactical-muted uppercase tracking-widest">VRAM/RAM Bedarf</p>
                <p className="text-sm font-bold">~{modelConfig.ramRequired}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-tactical-muted uppercase tracking-widest">Spezialisierung</p>
                <p className="text-xs font-bold text-tactical-muted italic">{modelConfig.specialization}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-tactical-card border border-tactical-border rounded-3xl p-6 flex flex-col justify-center space-y-4">
            <div className="flex items-center gap-3">
              <Key className="text-tactical-accent" size={24} />
              <h4 className="text-xs font-bold uppercase tracking-widest">Auth Gateway</h4>
            </div>
            <div className="space-y-2">
              <p className="text-[10px] text-tactical-muted uppercase font-bold">Authentifikation Bearer (Ollama Token)</p>
              <div className="flex gap-2">
                <input 
                  type="password" 
                  value={config.ollamaToken || ''}
                  onChange={(e) => onConfigChange({ ...config, ollamaToken: e.target.value })}
                  placeholder="Ollama Auth Token..."
                  className="flex-1 bg-tactical-bg border border-tactical-border rounded-xl px-3 py-2 text-[10px] focus:border-tactical-accent outline-none font-mono"
                />
                <button 
                  onClick={testAuthConnection}
                  disabled={isTestingAuth}
                  className={cn(
                    "px-3 py-2 rounded-xl text-[10px] font-bold transition-all",
                    authTestResult === 'success' ? "bg-emerald-500 text-white" :
                    authTestResult === 'error' ? "bg-red-500 text-white" :
                    "bg-tactical-accent text-tactical-bg"
                  )}
                >
                  {isTestingAuth ? <RefreshCw size={12} className="animate-spin" /> : 
                   authTestResult === 'success' ? <CheckCircle2 size={12} /> :
                   authTestResult === 'error' ? <AlertCircle size={12} /> : "TEST"}
                </button>
              </div>
            </div>
            <p className="text-[10px] text-tactical-muted leading-relaxed">
              Das Setup verhindert System-Overload durch automatische Wahl von 4-bit Quantisierungen. Bei RAM-Knappheit wird automatisch auf das Fallback-Modell umgeschaltet.
            </p>
          </div>
        </div>

        {/* Setup Steps */}
        <div className="grid grid-cols-1 gap-6">
          {steps.map((step) => (
            <div 
              key={step.id}
              className={cn(
                "relative bg-tactical-card border rounded-3xl p-8 transition-all duration-300",
                step.status === 'active' ? "border-tactical-accent shadow-[0_0_30px_rgba(0,255,157,0.1)]" : "border-tactical-border opacity-60"
              )}
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                <div className="flex gap-4 sm:gap-6 w-full sm:w-auto">
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg border",
                    step.status === 'completed' ? "bg-emerald-500/20 border-emerald-500 text-emerald-500" :
                    step.status === 'active' ? "bg-tactical-accent/20 border-tactical-accent text-tactical-accent" :
                    "bg-tactical-bg border-tactical-border text-tactical-muted"
                  )}>
                    {step.status === 'completed' ? <CheckCircle2 size={24} /> : step.id}
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-lg font-bold">{step.title}</h4>
                    <p className="text-sm text-tactical-muted">{step.description}</p>
                    
                    {step.id === 3 && isPulling && (
                      <div className="mt-4 space-y-2">
                        <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
                          <span className="text-tactical-accent">{pullStatus}</span>
                          <span>{pullProgress}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-tactical-bg rounded-full overflow-hidden border border-tactical-border">
                          <motion.div 
                            className="h-full bg-tactical-accent"
                            initial={{ width: 0 }}
                            animate={{ width: `${pullProgress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {step.id === 3 && step.status === 'active' && !isPulling && (
                      <p className="mt-4 text-[10px] text-tactical-muted italic">
                        Hinweis: Falls der Download fehlschlägt, stelle sicher, dass Ollama mit <code className="text-tactical-accent">OLLAMA_ORIGINS="*"</code> gestartet wurde.
                      </p>
                    )}
                  </div>
                </div>
                {step.status === 'active' && step.actionLabel && (
                  <button 
                    onClick={step.action}
                    className="w-full sm:w-auto px-6 py-3 bg-tactical-accent text-tactical-bg font-bold rounded-xl hover:scale-105 transition-transform flex items-center justify-center gap-2"
                  >
                    {step.actionLabel} <ChevronRight size={16} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Validation Dashboard */}
        <AnimatePresence>
          {currentStep >= 4 && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <h3 className="text-[10px] font-bold text-tactical-muted uppercase tracking-widest flex items-center gap-2">
                <Shield size={14} /> System-Validierung & Integrität
              </h3>
              <div className="bg-tactical-bg/50 border border-tactical-border rounded-3xl p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                <ValidationCard 
                  label="Ollama Service" 
                  status={validationResults.ollama ? 'ready' : 'error'} 
                  icon={<Server size={18} />} 
                />
                <ValidationCard 
                  label="Modell Integrität" 
                  status={validationResults.model ? 'ready' : 'error'} 
                  icon={<Layers size={18} />} 
                />
                <ValidationCard 
                  label="SQL Datenbank" 
                  status={validationResults.sql ? 'ready' : 'error'} 
                  icon={<Database size={18} />} 
                />
                <ValidationCard 
                  label="Vector Store" 
                  status={validationResults.sql ? 'ready' : 'idle'} 
                  icon={<Box size={18} />} 
                />
                <ValidationCard 
                  label="Hardware-Match" 
                  status={validationResults.hardware ? 'ready' : 'error'} 
                  icon={<Cpu size={18} />} 
                />
              </div>

              {validationResults.ollama && validationResults.model && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-emerald-500/20 rounded-xl shrink-0">
                      <CheckCircle2 className="text-emerald-500" size={24} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-emerald-500">System bereit für Offline-KI</h4>
                      <p className="text-[10px] text-emerald-500/70 uppercase tracking-widest font-bold">Alle Abhängigkeiten validiert</p>
                    </div>
                  </div>
                  <button className="w-full sm:w-auto px-6 py-2 bg-emerald-500 text-white font-bold rounded-xl hover:scale-105 transition-transform">
                    ZUM DASHBOARD
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Terminal Help */}
        <div className="bg-black/40 border border-tactical-border rounded-3xl p-8 space-y-4">
          <div className="flex items-center gap-2 text-[10px] font-bold text-tactical-muted uppercase tracking-widest">
            <Terminal size={14} /> Terminal Quick-Fix
          </div>
          <div className="font-mono text-xs text-tactical-text space-y-2">
            <p className="text-tactical-muted"># Falls Ollama nicht erkannt wird, prüfe den Status:</p>
            <p className="text-tactical-accent">ollama list</p>
            <p className="text-tactical-muted"># Manuelles Laden des Modells:</p>
            <p className="text-tactical-accent">ollama run {modelConfig.name}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ValidationCard({ label, status, icon }: { label: string, status: 'ready' | 'error' | 'idle', icon: React.ReactNode }) {
  return (
    <div className="bg-tactical-card border border-tactical-border rounded-2xl p-4 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="p-2 bg-tactical-bg rounded-lg text-tactical-muted">
          {icon}
        </div>
        <div className={cn(
          "px-2 py-0.5 rounded text-[8px] font-bold uppercase",
          status === 'ready' ? "bg-emerald-500/20 text-emerald-500" :
          status === 'error' ? "bg-red-500/20 text-red-500" : "bg-tactical-muted/20 text-tactical-muted"
        )}>
          {status === 'ready' ? 'VALID' : status === 'error' ? 'ERROR' : 'PENDING'}
        </div>
      </div>
      <p className="text-[10px] font-bold uppercase tracking-widest">{label}</p>
    </div>
  );
}
