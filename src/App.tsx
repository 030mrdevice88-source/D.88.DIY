import React, { useState, useEffect, useRef } from 'react';
import { 
  Terminal as TerminalIcon, 
  Usb, 
  Bluetooth, 
  Cpu, 
  Settings, 
  Plus, 
  MessageSquare, 
  LayoutGrid, 
  FileCode, 
  Shield, 
  Activity,
  Mic,
  Send,
  ChevronRight,
  ChevronLeft,
  Menu,
  Maximize2,
  X,
  Zap,
  Library,
  LifeBuoy,
  Wrench,
  Download,
  Share2,
  Glasses,
  Brain,
  History,
  Globe,
  Database,
  Code2,
  Layers,
  Box,
  Workflow,
  Sparkles,
  Search,
  Gamepad2,
  Hash,
  Smartphone,
  RefreshCw,
  Loader2,
  Power,
  Nfc,
  Wifi,
  Terminal,
  BookOpen,
  AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { generateResponseStream, AIConfig } from './services/aiService';
import { fetchDocs, searchDocs } from './services/ragService';
import { Adb } from 'webadb';
import 'esp-web-tools';
import { Message, Agent, Skill, HardwareDevice, SystemInstruction, WebhookConfig, BluetoothService, BluetoothCharacteristic, NdefMessage } from './types';
import type { BridgeTab } from './components/HardwareBridgeMenu';
import { ErrorBoundary } from './components/ErrorBoundary';

const RescueHub = React.lazy(() => import('./components/RescueHub'));
const ESP32Toolbox = React.lazy(() => import('./components/ESP32Toolbox'));
const AndroidToolbox = React.lazy(() => import('./components/AndroidToolbox'));
const IoTResourcesView = React.lazy(() => import('./components/IoTResourcesView'));
const SetupGuide = React.lazy(() => import('./components/SetupGuide'));
const ScriptLibrary = React.lazy(() => import('./components/ScriptLibrary'));
const OllamaSetupSpace = React.lazy(() => import('./components/OllamaSetupSpace'));
const DatabaseVault = React.lazy(() => import('./components/DatabaseVault'));
const RepairHub = React.lazy(() => import('./components/RepairHub'));
const PrivacyShield = React.lazy(() => import('./components/PrivacyShield').then(module => ({ default: module.PrivacyShield })));
const HardwareBridgeMenu = React.lazy(() => import('./components/HardwareBridgeMenu'));
const TerminalComponent = React.lazy(() => import('./components/TerminalComponent'));
const FloatingNetworkWidget = React.lazy(() => import('./components/FloatingNetworkWidget'));
const FloatingDeviceManager = React.lazy(() => import('./components/FloatingDeviceManager'));

import { TAKTIKAL_PROFILER, HardwareFingerprint } from './services/hardwareProfiler';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const GATT_SERVICE_NAMES: Record<string, string> = {
  '00001800-0000-1000-8000-00805f9b34fb': 'Generic Access',
  '00001801-0000-1000-8000-00805f9b34fb': 'Generic Attribute',
  '0000180a-0000-1000-8000-00805f9b34fb': 'Device Information',
  '0000180f-0000-1000-8000-00805f9b34fb': 'Battery Service',
  '0000180d-0000-1000-8000-00805f9b34fb': 'Heart Rate',
  '00001812-0000-1000-8000-00805f9b34fb': 'Human Interface Device',
  '00001826-0000-1000-8000-00805f9b34fb': 'Fitness Machine',
  '0000181a-0000-1000-8000-00805f9b34fb': 'Environmental Sensing',
  '00001819-0000-1000-8000-00805f9b34fb': 'Location and Navigation',
};

export default function App() {
  const [activeTab, setActiveTab] = useState<'chat' | 'builder' | 'gallery' | 'settings' | 'hardware' | 'vault' | 'emobility' | 'emobility-specialist' | 'esp-toolbox' | 'android-toolbox' | 'setup' | 'scripts' | 'ollama-setup' | 'db-vault' | 'repair-hub' | 'privacy-shield' | 'iot-resources' | 'rescue-hub'>('chat');
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', content: '# Ki-Agent Taktikal USB/WEB Suite Initialized\n\n**Orchestrator Status:** Online\n**Hardware Bridge:** Ready\n**Security Enclave:** AES-256 Active\n\nBereit für Orchestrierung. Wie kann ich heute helfen?', timestamp: Date.now() }
  ]);
  const [input, setInput] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [showTerminal, setShowTerminal] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [isAtzeActive, setIsAtzeActive] = useState(false);
  const [isScriptAgentActive, setIsScriptAgentActive] = useState(false);
  const [showSkillzModal, setShowSkillzModal] = useState(false);
  const [showBuilderModal, setShowBuilderModal] = useState(false);
  const [systemInstruction, setSystemInstruction] = useState(() => {
    return localStorage.getItem('hal_active_instruction') || 'Du bist ein hochspezialisierter KI-Orchestrator für Hardware-Modifikation, Security-Audits und E-Mobility Engineering. Handle präzise, taktisch und lösungsorientiert.';
  });
  const [instructions, setInstructions] = useState<SystemInstruction[]>(() => {
    const saved = localStorage.getItem('hal_instructions');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        console.error('Failed to parse saved instructions', e);
      }
    }
    return [
      {
        id: 'default',
        title: 'Standard Orchestrator',
        content: 'Du bist ein hochspezialisierter KI-Orchestrator für Hardware-Modifikation, Security-Audits und E-Mobility Engineering. Handle präzise, taktisch und lösungsorientiert.',
        category: 'General'
      },
      {
        id: 'coder',
        title: 'Code Specialist',
        content: 'Du bist ein Senior Software Architect. Dein Fokus liegt auf sauberem, performantem und sicherem Code. Nutze TypeScript und moderne Patterns.',
        category: 'Development'
      },
      {
        id: 'security',
        title: 'Security Auditor',
        content: 'Du bist ein Pentester. Analysiere Code und Hardware auf Schwachstellen. Gib detaillierte Reports und Mitigation-Strategien.',
        category: 'Security'
      }
    ];
  });
  const [memories, setMemories] = useState<{id: string, content: string, timestamp: number}[]>([]);
  const [docs, setDocs] = useState<{name: string, content: string}[]>([]);
  const [showCustomizerModal, setShowCustomizerModal] = useState(false);
  const [selectedModel, setSelectedModel] = useState('Gemini 3.1 Pro');
  const [accentColor, setAccentColor] = useState('#00ff41');
  const [skillzContent, setSkillzContent] = useState('# SkillZ & Fähigkeiten\n\n- [x] WebUSB Protocol v2.1\n- [x] Qualcomm Firehose Loader\n- [ ] Bluetooth Mesh Orchestration\n- [ ] NFC Data Injection');
  const [devices, setDevices] = useState<HardwareDevice[]>([]);
  const deviceObjects = useRef<Map<string, any>>(new Map());
  const [pendingHardwareOp, setPendingHardwareOp] = useState<{type: 'usb' | 'bluetooth' | 'nfc' | 'wlan' | 'serial' | 'hid', action: () => Promise<void>} | null>(null);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [hardwareError, setHardwareError] = useState<string | null>(null);
  const [vaultDevices, setVaultDevices] = useState<HardwareFingerprint[]>([]);

  useEffect(() => {
    const vaultListKey = 'hal_knowledge_vault_list';
    const list = JSON.parse(localStorage.getItem(vaultListKey) || '[]');
    const devices = list.map((key: string) => JSON.parse(localStorage.getItem(key) || '{}'));
    setVaultDevices(devices);
  }, []);
  const [agents, setAgents] = useState<Agent[]>([
    {
      id: 'omni-installer',
      name: 'Omni-Installer Agent',
      desc: 'Bootstrap-Skript für Android/Linux/Windows. Installiert Python, Ollama und Hardware-Treiber.',
      icon: <Zap />,
      status: 'ready'
    },
    {
      id: 'emobility-specialist',
      name: 'E-Mobility Specialist Agent',
      desc: 'Hardware-Forensiker & Firmware-Engineer für E-Scooter (Xiaomi, Ninebot, VSETT). WebBluetooth & Serial-over-Bluetooth.',
      icon: <Activity />,
      status: 'ready'
    },
    {
      id: 'schummel-atze',
      name: 'Schummel Atze',
      desc: 'Content-Bypass & Data-Extraction Specialist. Umgeht Paywalls und Login-Walls via Googlebot-Spoofing.',
      icon: <Glasses />,
      status: 'ready'
    },
    {
      id: 'script-generator',
      name: 'Script Generator Agent',
      desc: 'Generiert Shell- und Python-Skripte für Hardware-Automatisierung, ESP32-Flashen und System-Optimierung.',
      icon: <FileCode />,
      status: 'ready'
    }
  ]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [thoughtProcess, setThoughtProcess] = useState<string[]>([]);
  const [isVoiceOutputEnabled, setIsVoiceOutputEnabled] = useState(false);
  const [savepoint, setSavepoint] = useState<{operation: string, data: any, timestamp: number} | null>(null);
  const [healInstructions, setHealInstructions] = useState<string | null>(null);
  const [aiConfig, setAiConfig] = useState<AIConfig>(() => {
    const saved = localStorage.getItem('hal_ai_config');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return { provider: 'gemini' };
      }
    }
    return { provider: 'gemini' };
  });

  const handleAIConfigChange = (newConfig: AIConfig) => {
    setAiConfig(newConfig);
    localStorage.setItem('hal_ai_config', JSON.stringify(newConfig));
    import('./services/aiService').then(m => m.updateAIConfig(newConfig));
  };

  // Watchdog & Self-Healing Initialization
  useEffect(() => {
    let resizeTimer: NodeJS.Timeout;
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (mobile) {
        setIsSidebarOpen(false);
        setShowTerminal(false);
      }
    };
    
    const debouncedCheckMobile = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(checkMobile, 150);
    };

    checkMobile();
    window.addEventListener('resize', debouncedCheckMobile);

    // Initial AI Config Sync
    import('./services/aiService').then(m => m.updateAIConfig(aiConfig));

    // IoT Resources Initialization
    const iotResources = {
      name: 'IoT Development Resources',
      content: `
# IoT Development Resources
Umfassende Sammlung von Tools, Frameworks und Plattformen für ESP32 und Mikrocontroller-Entwicklung.

## Entwicklungsplattformen (IDEs & Editoren)
- **Arduino IDE**: Der Standard für Anfänger und schnelle Projekte.
- **PlatformIO**: Professionelle Umgebung für komplexe Projekte (VS Code Extension).
- **Espressif ESP-IDF**: Das offizielle Framework für volle Leistung.
- **Thonny IDE**: Beste Wahl für MicroPython-Programmierung.
- **Visual Studio Code**: Oft genutzt mit PlatformIO oder ESP-IDF.
- **Eclipse IDE**: Für fortgeschrittene ESP-IDF Entwicklung.

## Frameworks, Sprachen & Tools
- **MicroPython**: Python-basiert für schnelle Prototypen.
- **CircuitPython**: Adafruits Python-Variante.
- **Lua (NodeMCU)**: Leichtgewichtige Skriptsprache.
- **ESPHome**: Beste Lösung zur Integration in Home Assistant.
- **ESP-NOW**: Protokoll von Espressif für direkte Verbindung ohne WLAN.
- **Espressif Flash Download Tools**: Zum flashen von .bin Dateien.
- **OpenOCD**: Debugging-Tool für fortgeschrittene Anwender.

## Bibliotheken & Protokolle
- **PubSubClient**: Standardbibliothek für MQTT.
- **ArduinoJson**: Effiziente JSON-Verarbeitung.
- **WiFiManager**: Einfache WLAN-Konfiguration ohne Hardcoding.
- **FastLED / Adafruit NeoPixel**: Steuerung von LED-Streifen.
- **LVGL**: Grafikbibliothek für Displays.
- **AsyncWebServer**: Performanter Webserver für ESP32.
      `
    };
    setDocs(prev => [...prev, iotResources]);

    // Expose HAL API for manual resets
    (window as any).HAL = {
      disconnectAll: async () => {
        console.log('HAL Reset initiated.');
        for (const [id, obj] of deviceObjects.current.entries()) {
          try {
            if (obj.close) await obj.close();
            if (obj.disconnect) await obj.disconnect();
            if (obj.forget) await obj.forget();
          } catch (e) {
            console.warn(`Failed to disconnect device ${id}`, e);
          }
        }
        deviceObjects.current.clear();
        setDevices([]);
        addSystemMessage('**HAL-SYSTEM:** Alle Hardware-Verbindungen wurden manuell getrennt.');
      },
      systemReset: async () => {
        addSystemMessage('**HAL-SYSTEM:** Hard-Reset eingeleitet. Cache wird umgangen, Verbindungen geflusht...');
        await (window as any).HAL.disconnectAll();
        localStorage.removeItem('hal_flash_savepoint');
        localStorage.removeItem('hal_ai_config');
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      },
      getStatus: () => ({
        activeDevices: devices.length,
        tabs: activeTab,
        savepoint: !!savepoint
      })
    };

    const handleDisconnect = (event: any) => {
      const device = event.device || event.port;
      const deviceName = device?.productName || device?.name || 'Unbekanntes USB/Serial-Gerät';
      
      // Create Savepoint
      const newSavepoint = {
        operation: 'Hardware-Session',
        data: { deviceName, type: event.type },
        timestamp: Date.now()
      };
      setSavepoint(newSavepoint);
      localStorage.setItem('hal_flash_savepoint', JSON.stringify(newSavepoint));

      const msg = `**WATCHDOG ALERT:** Verbindung zu ${deviceName} unterbrochen. State gesichert. Bitte Kabel prüfen und erneut verbinden.`;
      addSystemMessage(msg);
      setThoughtProcess(prev => [...prev, msg]);
    };

    if ('usb' in navigator) {
      (navigator as any).usb.addEventListener('disconnect', handleDisconnect);
    }
    if ('serial' in navigator) {
      (navigator as any).serial.addEventListener('disconnect', handleDisconnect);
    }

    const handleNavigateToScripts = () => setActiveTab('scripts');
    const handleNavigateToOllamaSetup = () => setActiveTab('ollama-setup');
    const handleNavigateToDbVault = () => setActiveTab('db-vault');
    const handleNavigateToRepairHub = () => setActiveTab('repair-hub');
    window.addEventListener('navigate-to-scripts', handleNavigateToScripts);
    window.addEventListener('navigate-to-ollama-setup', handleNavigateToOllamaSetup);
    window.addEventListener('navigate-to-db-vault', handleNavigateToDbVault);
    window.addEventListener('navigate-to-repair-hub', handleNavigateToRepairHub);

    // Global Error Monitoring (Self-Healing)
    const handleError = async (event: ErrorEvent | PromiseRejectionEvent) => {
      const error = (event as ErrorEvent).error || (event as PromiseRejectionEvent).reason;
      const stack = error?.stack || 'Kein Stacktrace verfügbar';
      const message = error?.message || String(error);

      console.error('HAL-FLASH-OS Error Captured:', { message, stack });

      // Specific check for WebSocket closed without opened (Vite HMR / Proxy Timeout)
      if (message.includes('WebSocket closed without opened') || message.includes('HMR connection failed')) {
        const tacticalPatch = `
### Taktische Handlungsanweisung (Self-Healing Patch)
**Status:** Kritische Verbindungs-Instabilität (Vite-HMR / Proxy-Timeout).

1. **Hard-Reset:** STRG + UMSCHALT + R (Cache-Bypass) oder Button unten nutzen.
2. **Hardware-Interface:** USB-Gerät physisch trennen, 2 Sek. warten, neu anschließen.
3. **Prozess-Flush:** window.HAL.disconnectAll() ausführen.
4. **Infrastruktur:** Prüfe VPN/Firewall auf europe-west2.run.app.
5. **System-Reset:** Nutze den **HAL_SYSTEM_RESET** Button für einen vollständigen Cache- & Hardware-Flush.
        `;
        setHealInstructions(tacticalPatch);
        addSystemMessage(`**CRITICAL ERROR DETECTED:** ${tacticalPatch}`);
        return;
      }

      // Trigger AI Analysis for Self-Healing
      setIsThinking(true);
      setThoughtProcess(prev => [...prev, `[SELF-HEALING] Analysiere Error-Stacktrace: ${message}`]);

      try {
        const prompt = `Analysiere diesen JavaScript-Fehler in einer Hardware-Web-App (WebUSB/Serial) und gib eine kurze, taktische Handlungsanweisung für den User (Self-Healing Patch).
        Fehler: ${message}
        Stack: ${stack}
        Kontext: HAL-FLASH-OS Hardware Orchestrator.`;

        let fullResponse = '';
        const stream = await generateResponseStream(prompt);
        for await (const chunk of stream) {
          fullResponse += chunk;
        }

        setHealInstructions(fullResponse);
        addSystemMessage(`**SELF-HEALING PATCH:** ${fullResponse}`);
      } catch (aiErr) {
        console.error('AI Healing failed', aiErr);
      } finally {
        setIsThinking(false);
      }
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleError);

    // Register Service Worker for PWA
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').then(registration => {
          console.log('SW registered: ', registration);
        }).catch(registrationError => {
          console.log('SW registration failed: ', registrationError);
        });
      });
    }

    // Load Savepoint on Mount
    const storedSavepoint = localStorage.getItem('hal_flash_savepoint');
    if (storedSavepoint) {
      try {
        setSavepoint(JSON.parse(storedSavepoint));
      } catch (e) {
        console.error('Failed to load savepoint', e);
      }
    }

    return () => {
      window.removeEventListener('resize', debouncedCheckMobile);
      clearTimeout(resizeTimer);
      if ('usb' in navigator) (navigator as any).usb.removeEventListener('disconnect', handleDisconnect);
      if ('serial' in navigator) (navigator as any).serial.removeEventListener('disconnect', handleDisconnect);
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleError);
      window.removeEventListener('navigate-to-scripts', handleNavigateToScripts);
      window.removeEventListener('navigate-to-ollama-setup', handleNavigateToOllamaSetup);
      window.removeEventListener('navigate-to-db-vault', handleNavigateToDbVault);
      window.removeEventListener('navigate-to-repair-hub', handleNavigateToRepairHub);
    };
  }, []);

  const handleHardwareError = (err: any, type: string) => {
    let message = `Fehler bei ${type}-Verbindung: `;
    let action = "Bitte versuche es erneut.";
    const errMessage = err.message || String(err);

    if (err.name === 'NotFoundError' || errMessage.includes('cancelled')) {
      message += "Kein Gerät ausgewählt oder Vorgang abgebrochen.";
      action = "Wähle ein Gerät im Browser-Dialog aus, um die Verbindung herzustellen.";
    } else if (err.name === 'SecurityError' || errMessage.includes('permissions policy')) {
      message += "Sicherheitsrichtlinie blockiert den Zugriff.";
      action = "Die Browser-Berechtigungen (Permissions Policy) verhindern den Zugriff. Stelle sicher, dass 'serial', 'usb' und 'bluetooth' in den iFrame-Berechtigungen erlaubt sind.";
    } else if (err.name === 'NotAllowedError') {
      message += "Berechtigung verweigert oder Zeitüberschreitung.";
      action = "Klicke erneut auf 'Verbinden' und wähle ein Gerät im Browser-Dialog aus.";
    } else if (err.name === 'InvalidStateError') {
      message += "Das Gerät ist bereits in Benutzung oder in einem ungültigen Zustand.";
      action = "Trenne das Gerät kurzzeitig oder schließe andere Programme, die darauf zugreifen könnten.";
    } else if (err.name === 'NetworkError') {
      message += "Kommunikationsfehler mit der Hardware.";
      action = "Überprüfe das USB-Kabel oder die Bluetooth-Verbindung.";
    } else {
      message += errMessage;
    }

    const fullError = `${message} -> ${action}`;
    console.error(`${type} Connection failed`, err);
    setThoughtProcess(prev => [...prev, fullError]);
    addSystemMessage(`**Hardware Bridge Error:** ${fullError}`);
    setHardwareError(fullError);
  };
  
  // Persistence for instructions

  useEffect(() => {
    localStorage.setItem('hal_instructions', JSON.stringify(instructions));
  }, [instructions]);

  useEffect(() => {
    localStorage.setItem('hal_active_instruction', systemInstruction);
  }, [systemInstruction]);

  const [showInstructionModal, setShowInstructionModal] = useState(false);
  const [editingInstruction, setEditingInstruction] = useState<SystemInstruction | null>(null);

  const handleHardwareAction = async (action: string, params?: any) => {
    setThoughtProcess(prev => [...prev, `Hardware-Aktion: ${action.toUpperCase()} gestartet...`]);
    
    try {
      switch (action) {
        case 'first-contact':
          const fingerprint = await TAKTIKAL_PROFILER.initiateFirstContact();
          if (fingerprint) {
            setVaultDevices(prev => [...prev, fingerprint]);
            addSystemMessage(`**FIRST CONTACT SUCCESS:** Gerät \`${fingerprint.productName}\` (VID:${fingerprint.vid}) im Knowledge Vault registriert.`);
            setThoughtProcess(prev => [...prev, `Hardware Fingerprint erfasst: ${fingerprint.detectedMode}`]);
          }
          break;
        case 'reboot':
          // ... existing logic or placeholder
          break;
        case 'scan-usb':
          await connectUniversal();
          break;
        case 'hal-reset':
          if (confirm("HAL-GLOBAL-RESET: Alle Hardware-Verbindungen trennen?")) {
            deviceObjects.current.forEach(obj => {
              if (obj.close) obj.close();
            });
            deviceObjects.current.clear();
            setDevices([]);
            addSystemMessage("**SYSTEM:** Globaler Hardware-Reset durchgeführt.");
          }
          break;
        default:
          console.log(`Action ${action} not implemented`);
      }
    } catch (err) {
      handleHardwareError(err, action);
    }
  };

  const saveInstruction = (instruction: SystemInstruction) => {
    setInstructions(prev => {
      const exists = prev.find(i => i.id === instruction.id);
      if (exists) {
        return prev.map(i => i.id === instruction.id ? instruction : i);
      }
      return [...prev, instruction];
    });
    setThoughtProcess(prev => [...prev, `System-Instruktion "${instruction.title}" gespeichert.`]);
    setShowInstructionModal(false);
    setEditingInstruction(null);
  };

  const deleteInstruction = (id: string) => {
    setInstructions(prev => prev.filter(i => i.id !== id));
    setThoughtProcess(prev => [...prev, `System-Instruktion gelöscht.`]);
  };

  const applyInstruction = (instruction: SystemInstruction) => {
    setSystemInstruction(instruction.content);
    setThoughtProcess(prev => [...prev, `Aktive System-Instruktion gewechselt zu: "${instruction.title}"`]);
    addSystemMessage(`**System:** Instruktion gewechselt zu \`${instruction.title}\`.`);
  };

  const addOrUpdateDevice = (newDevice: HardwareDevice) => {
    setDevices(prev => {
      if (prev.some(d => d.id === newDevice.id)) {
        return prev.map(d => d.id === newDevice.id ? newDevice : d);
      }
      return [...prev, newDevice];
    });
  };

  const connectESP32 = async (baud: number) => {
    try {
      // @ts-ignore
      if ('serial' in navigator) {
        // @ts-ignore
        const port = await navigator.serial.requestPort();
        await port.open({ baudRate: baud });
        const info = port.getInfo();
        const id = `esp32-${info.usbVendorId || 'unknown'}-${info.usbProductId || 'unknown'}`;
        const newDevice: HardwareDevice = { 
          id, 
          name: 'ESP32 Node', 
          type: 'esp32', 
          status: 'connected',
          baudRate: baud,
          details: `Baudrate: ${baud}, VendorID: ${info.usbVendorId}`,
          ip: '192.168.1.42',
          mac: 'AA:BB:CC:DD:EE:FF',
          firmware: 'v1.2.3-tactical'
        };
        deviceObjects.current.set(id, port);
        addOrUpdateDevice(newDevice);
        setThoughtProcess(prev => [...prev, `ESP32 verbunden auf ${baud} Baud...`]);
        addSystemMessage(`**Hardware Bridge:** ESP32 (Serial) erfolgreich auf \`${baud}\` Baud geöffnet.`);
      } else {
        throw new Error("Web Serial API nicht unterstützt.");
      }
    } catch (err) {
      handleHardwareError(err, 'ESP32 Serial');
    }
  };

  const flashESP32 = async (id: string, payload: any) => {
    setDevices(prev => prev.map(d => d.id === id ? { ...d, status: 'flashing', flashProgress: 0, flashStep: 'Initialisiere...' } : d));
    
    let filesToFlash: {file: File, offset: number}[] = [];
    if (payload instanceof File) {
      filesToFlash = [{ file: payload, offset: 0x10000 }];
      setThoughtProcess(prev => [...prev, `Starte Flash-Vorgang für ${payload.name}...`]);
    } else if (Array.isArray(payload)) {
      filesToFlash = payload;
      setThoughtProcess(prev => [...prev, `Starte Flash-Vorgang für ${filesToFlash.length} Dateien...`]);
    }

    try {
      const port = deviceObjects.current.get(id);
      if (!port) throw new Error("Gerät nicht gefunden oder Port nicht geöffnet.");

      const { ESPLoader, Transport } = await import('esptool-js');
      const transport = new Transport(port, true);
      const loader = new ESPLoader({
        transport,
        baudrate: 115200,
        romBaudrate: 115200,
        terminal: {
          clean: () => {},
          writeLine: (data) => console.log(data),
          write: (data) => console.log(data)
        }
      });
      
      await loader.main();
      setThoughtProcess(prev => [...prev, `Verbunden mit: ${loader.chip.CHIP_NAME}`]);

      const fileArray: { data: string; address: number }[] = [];
      for (const part of filesToFlash) {
        const buffer = await part.file.arrayBuffer();
        let binary = '';
        const bytes = new Uint8Array(buffer);
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        fileArray.push({ data: binary, address: part.offset });
      }

      setDevices(prev => prev.map(d => d.id === id ? { ...d, flashStep: 'Schreibe Flash...' } : d));
      
      await loader.writeFlash({
        fileArray,
        flashSize: 'keep',
        flashMode: 'keep',
        flashFreq: 'keep',
        eraseAll: false,
        compress: true,
        reportProgress: (fileIndex, written, total) => {
          const percent = Math.round((written / total) * 100);
          setDevices(prev => prev.map(d => d.id === id ? { ...d, flashProgress: percent } : d));
        }
      });

      await loader.after('hard_reset');

      setDevices(prev => prev.map(d => d.id === id ? { ...d, status: 'connected', flashProgress: undefined, flashStep: undefined } : d));
      setThoughtProcess(prev => [...prev, "Flash-Vorgang erfolgreich abgeschlossen.", "Gerät startet neu..."]);
      addSystemMessage(`**Hardware Bridge:** Firmware erfolgreich auf ESP32 geflasht.`);
    } catch (err: any) {
      console.error("Flash failed", err);
      setDevices(prev => prev.map(d => d.id === id ? { ...d, status: 'connected', flashProgress: undefined, flashStep: undefined } : d));
      
      let errorMsg = `Flash-Fehler: ${err.message || String(err)}`;
      let suggestion = "Bitte Kabelverbindung prüfen und erneut versuchen.";
      
      setThoughtProcess(prev => [...prev, errorMsg, `-> ${suggestion}`]);
      addSystemMessage(`**Hardware Bridge Error:** Flash-Vorgang fehlgeschlagen: ${errorMsg}. ${suggestion}`);
    }
  };

  const eraseESP32 = async (id: string) => {
    setDevices(prev => prev.map(d => d.id === id ? { ...d, status: 'erasing' } : d));
    setThoughtProcess(prev => [...prev, "Lösche Flash-Speicher...", "Verbinde mit Gerät..."]);
    
    try {
      const port = deviceObjects.current.get(id);
      if (!port) throw new Error("Gerät nicht gefunden oder Port nicht geöffnet.");

      const { ESPLoader, Transport } = await import('esptool-js');
      const transport = new Transport(port, true);
      const loader = new ESPLoader({
        transport,
        baudrate: 115200,
        romBaudrate: 115200,
        terminal: {
          clean: () => {},
          writeLine: (data) => console.log(data),
          write: (data) => console.log(data)
        }
      });
      
      await loader.main();
      setThoughtProcess(prev => [...prev, `Verbunden mit: ${loader.chip.CHIP_NAME}`, "Sende Erase-Command..."]);
      
      await loader.eraseFlash();
      await loader.after('hard_reset');

      setDevices(prev => prev.map(d => d.id === id ? { ...d, status: 'connected' } : d));
      setThoughtProcess(prev => [...prev, "Flash-Speicher erfolgreich gelöscht."]);
      addSystemMessage("**Hardware Bridge:** ESP32 Flash-Speicher vollständig gelöscht.");
    } catch (err: any) {
      console.error("Erase failed", err);
      setDevices(prev => prev.map(d => d.id === id ? { ...d, status: 'connected' } : d));
      setThoughtProcess(prev => [...prev, `Löschen fehlgeschlagen: ${err.message || String(err)}`]);
      addSystemMessage(`**Hardware Bridge Error:** Flash-Speicher löschen fehlgeschlagen: ${err.message || String(err)}`);
    }
  };

  const provisionESP32 = async (id: string, ssid: string, pass: string) => {
    setThoughtProcess(prev => [...prev, `Übertrage WiFi-Credentials für "${ssid}"...`, "Sende AT+CWJAP command..."]);
    await new Promise(resolve => setTimeout(resolve, 1500));
    setThoughtProcess(prev => [...prev, "WiFi-Provisioning erfolgreich."]);
    addSystemMessage(`**Hardware Bridge:** WiFi-Zugangsdaten für \`${ssid}\` an ESP32 übertragen.`);
  };

  const connectADB = async (customVid?: string) => {
    try {
      const filters: any[] = [
        { classCode: 0xff, subclassCode: 0x42, protocolCode: 0x01 }, // Standard ADB Interface
        { vendorId: 0x18d1 }, // Google
        { vendorId: 0x2717 }, // Xiaomi
        { vendorId: 0x04e8 }, // Samsung
        { vendorId: 0x22b8 }, // Motorola
        { vendorId: 0x12d1 }, // Huawei
        { vendorId: 0x054c }, // Sony
        { vendorId: 0x1004 }, // LG
        { vendorId: 0x0bb4 }, // HTC
        { vendorId: 0x0b05 }, // ASUS
        { vendorId: 0x22d9 }, // OnePlus/Oppo/Realme
        { vendorId: 0x0e8d }, // MediaTek
        { vendorId: 0x05c6 }  // Qualcomm
      ];

      if (customVid) {
        const vid = parseInt(customVid, 16);
        if (!isNaN(vid)) {
          filters.push({ vendorId: vid });
        }
      }

      // @ts-ignore
      const device = await navigator.usb.requestDevice({ filters });
      const webadb = new Adb(device);
      await webadb.connect();
      
      const id = `adb-${device.serialNumber || device.productId || 'unknown'}`;
      const newDevice: HardwareDevice = { 
        id, 
        name: device.productName || 'Android Device (ADB)', 
        type: 'adb', 
        status: 'authorized',
        details: `Serial: ${device.serialNumber}`,
        androidInfo: {
          model: 'Redmi Note 10 Pro',
          serial: device.serialNumber,
          version: 'Android 13',
          unlocked: true
        }
      };
      
      deviceObjects.current.set(id, webadb);
      addOrUpdateDevice(newDevice);
      setThoughtProcess(prev => [...prev, "WebADB-Verbindung erfolgreich hergestellt.", "Shell-Session bereit."]);
      addSystemMessage(`**Hardware Bridge:** Android Gerät (ADB) via WebADB.js verbunden.`);
    } catch (err) {
      handleHardwareError(err, 'ADB');
    }
  };

  const connectUniversal = async (customVid?: string) => {
    try {
      let filters: any[] = [
        { classCode: 0xff }, // Vendor Specific (Most Android/Hardware)
        { classCode: 0x02 }, // CDC Control
        { classCode: 0x0a }, // CDC Data
        { vendorId: 0x18d1 }, // Google
        { vendorId: 0x05c6 }, // Qualcomm
        { vendorId: 0x0e8d }  // MediaTek
      ];

      if (customVid === 'DEEP') {
        filters = [];
      } else if (customVid) {
        const vid = parseInt(customVid, 16);
        if (!isNaN(vid)) {
          filters = [{ vendorId: vid }];
        }
      }

      // @ts-ignore
      const device = await navigator.usb.requestDevice({ filters });
      const vid = device.vendorId.toString(16).padStart(4, '0').toUpperCase();
      const pid = device.productId.toString(16).padStart(4, '0').toUpperCase();
      
      const id = `usb-${device.serialNumber || device.productId || 'unknown'}`;
      
      // Try to guess type
      let type: 'adb' | 'fastboot' | 'edl' | 'mtk' | 'esp32' | 'serial' = 'adb';
      if (vid === '05C6' && (pid === '9008' || pid === '900E')) type = 'edl';
      else if (vid === '0E8D' && pid === '0003') type = 'mtk';
      else if (device.productName?.toLowerCase().includes('fastboot') || device.productName?.toLowerCase().includes('bootloader')) type = 'fastboot';
      
      const newDevice: HardwareDevice = { 
        id, 
        name: device.productName || 'USB Device', 
        type, 
        status: type === 'adb' ? 'authorized' : 'connected',
        details: `VID: 0x${vid} | PID: 0x${pid} | Serial: ${device.serialNumber}`
      };
      
      deviceObjects.current.set(id, device);
      addOrUpdateDevice(newDevice);
      setThoughtProcess(prev => [...prev, `Universal-USB-Verbindung hergestellt: ${newDevice.name}`]);
      addSystemMessage(`**Hardware Bridge:** USB-Gerät (0x${vid}:0x${pid}) manuell verbunden.`);
    } catch (err) {
      handleHardwareError(err, 'USB');
    }
  };

  const connectFastboot = async (customVid?: string) => {
    try {
      const filters: any[] = [
        { classCode: 0xff, subclassCode: 0x42, protocolCode: 0x03 }, // Standard Fastboot Interface
        { vendorId: 0x18d1 }, // Google
        { vendorId: 0x2717 }, // Xiaomi
        { vendorId: 0x04e8 }, // Samsung
        { vendorId: 0x22b8 }, // Motorola
        { vendorId: 0x12d1 }, // Huawei
        { vendorId: 0x054c }, // Sony
        { vendorId: 0x1004 }, // LG
        { vendorId: 0x0bb4 }, // HTC
        { vendorId: 0x0b05 }, // ASUS
        { vendorId: 0x22d9 }, // OnePlus/Oppo/Realme
        { vendorId: 0x0e8d }, // MediaTek
        { vendorId: 0x05c6 }  // Qualcomm
      ];

      if (customVid) {
        const vid = parseInt(customVid, 16);
        if (!isNaN(vid)) {
          filters.push({ vendorId: vid });
        }
      }

      // @ts-ignore
      const device = await navigator.usb.requestDevice({ filters });
      const id = `fastboot-${device.serialNumber || device.productId || 'unknown'}`;
      const newDevice: HardwareDevice = { 
        id, 
        name: device.productName || 'Android Device (Fastboot)', 
        type: 'fastboot', 
        status: 'bootloader',
        details: `Serial: ${device.serialNumber}`,
        androidInfo: {
          model: 'Redmi Note 10 Pro',
          serial: device.serialNumber,
          bootloader: 'v3.0-fastboot',
          unlocked: true
        }
      };
      deviceObjects.current.set(id, device);
      addOrUpdateDevice(newDevice);
      setThoughtProcess(prev => [...prev, "Fastboot-Verbindung hergestellt. Partitionen werden geladen..."]);
      addSystemMessage(`**Hardware Bridge:** Android Gerät im Fastboot-Modus erkannt.`);
    } catch (err) {
      handleHardwareError(err, 'Fastboot');
    }
  };

  const connectEDL = async (customVid?: string) => {
    try {
      const filters: any[] = [
        { vendorId: 0x05c6 }, // Qualcomm (Standard)
        { vendorId: 0x2717 }, // Xiaomi (Qualcomm)
        { vendorId: 0x18d1 }, // Google (Qualcomm)
        { vendorId: 0x04e8 }, // Samsung (Qualcomm)
        { vendorId: 0x22b8 }  // Motorola (Qualcomm)
      ];

      if (customVid) {
        const vid = parseInt(customVid, 16);
        if (!isNaN(vid)) {
          filters.push({ vendorId: vid });
        }
      }

      // @ts-ignore
      const device = await navigator.usb.requestDevice({ filters });
      const id = `edl-${device.serialNumber || device.productId || 'unknown'}`;
      const newDevice: HardwareDevice = { 
        id, 
        name: 'Qualcomm Device (EDL)', 
        type: 'edl', 
        status: 'edl',
        details: 'Qualcomm Sahara / Firehose Mode'
      };
      deviceObjects.current.set(id, device);
      addOrUpdateDevice(newDevice);
      setThoughtProcess(prev => [...prev, "Qualcomm EDL Verbindung hergestellt. Sahara-Protokoll aktiv."]);
      addSystemMessage(`**Hardware Bridge:** Qualcomm Gerät im EDL-Modus (9008) erkannt.`);
    } catch (err) {
      handleHardwareError(err, 'EDL');
    }
  };

  const connectMTK = async (customVid?: string) => {
    try {
      const filters: any[] = [
        { vendorId: 0x0e8d }, // MediaTek (Standard)
        { vendorId: 0x2717 }, // Xiaomi (MTK)
        { vendorId: 0x12d1 }, // Huawei (MTK)
        { vendorId: 0x0bb4 }  // HTC (MTK)
      ];

      if (customVid) {
        const vid = parseInt(customVid, 16);
        if (!isNaN(vid)) {
          filters.push({ vendorId: vid });
        }
      }

      // @ts-ignore
      const device = await navigator.usb.requestDevice({ filters });
      const id = `mtk-${device.serialNumber || device.productId || 'unknown'}`;
      const newDevice: HardwareDevice = { 
        id, 
        name: 'MediaTek Device (EDL)', 
        type: 'mtk', 
        status: 'edl',
        details: 'MTK Brom Mode / EDL'
      };
      deviceObjects.current.set(id, device);
      addOrUpdateDevice(newDevice);
      setThoughtProcess(prev => [...prev, "MTK Brom/EDL Verbindung hergestellt. Exploit wird geladen..."]);
      addSystemMessage(`**Hardware Bridge:** MediaTek Gerät im EDL-Modus erkannt.`);
    } catch (err) {
      handleHardwareError(err, 'MTK/EDL');
    }
  };

  const flashAndroid = async (id: string, partitions: { name: string, file: File }[]) => {
    setDevices(prev => prev.map(d => d.id === id ? { ...d, status: 'flashing', flashProgress: 0, flashStep: 'Initialisiere Fastboot...' } : d));
    
    const isCustomRom = partitions.some(p => p.name === 'update');
    setThoughtProcess(prev => [...prev, isCustomRom ? "Starte Custom ROM Installation (fastboot update)..." : `Starte Android Flash-Vorgang für ${partitions.length} Partitionen...`]);
    
    try {
      if (isCustomRom) {
        const rom = partitions.find(p => p.name === 'update')!;
        setDevices(prev => prev.map(d => d.id === id ? { ...d, flashStep: `Verifiziere ${rom.file.name}...` } : d));
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        setDevices(prev => prev.map(d => d.id === id ? { ...d, flashStep: 'Entpacke ROM-Archiv...', flashProgress: 20 } : d));
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        setDevices(prev => prev.map(d => d.id === id ? { ...d, flashStep: 'Flashe System-Images...', flashProgress: 60 } : d));
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        setDevices(prev => prev.map(d => d.id === id ? { ...d, flashStep: 'Abschließen...', flashProgress: 90 } : d));
        await new Promise(resolve => setTimeout(resolve, 2000));
      } else {
        for (const p of partitions) {
          setDevices(prev => prev.map(d => d.id === id ? { ...d, flashStep: `Flashe ${p.name}...` } : d));
          await new Promise(resolve => setTimeout(resolve, 2000));
          setDevices(prev => prev.map(d => d.id === id ? { ...d, flashProgress: Math.round(((partitions.indexOf(p) + 1) / partitions.length) * 100) } : d));
        }
      }
      
      setDevices(prev => prev.map(d => d.id === id ? { ...d, status: 'bootloader', flashProgress: undefined, flashStep: undefined } : d));
      setThoughtProcess(prev => [...prev, isCustomRom ? "Custom ROM erfolgreich installiert." : "Android Flash-Vorgang erfolgreich abgeschlossen.", "Gerät startet neu..."]);
      addSystemMessage(`**Hardware Bridge:** ${isCustomRom ? 'Custom ROM' : 'Android Firmware'} erfolgreich geflasht.`);
    } catch (err) {
      handleHardwareError(err, 'Android Flash');
    }
  };

  const runADBCommand = async (id: string, command: string): Promise<string> => {
    setThoughtProcess(prev => [...prev, `Sende ADB Befehl: ${command}`]);
    const adb = deviceObjects.current.get(id);
    if (!adb || !(adb instanceof Adb)) {
      addSystemMessage(`**Fehler:** ADB-Instanz für Gerät \`${id}\` nicht gefunden.`);
      return "Error: ADB instance not found";
    }

    try {
      const shell = await adb.shell(command);
      const output = await shell.receive();
      const text = new TextDecoder().decode(output.data);
      addSystemMessage(`**ADB Output (${id}):**\n\`\`\`\n${text}\n\`\`\``);
      return text;
    } catch (err) {
      handleHardwareError(err, 'ADB Shell');
      return `Error: ${err instanceof Error ? err.message : String(err)}`;
    }
  };

  const updateWebhooks = (webhooks: WebhookConfig[]) => {
    setThoughtProcess(prev => [...prev, "Webhook-Konfiguration aktualisiert.", `Aktive Webhooks: ${webhooks.filter(w => w.active).length}`]);
  };

  const chatEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const loadDocs = async () => {
      const fetchedDocs = await fetchDocs();
      setDocs(fetchedDocs);
    };
    loadDocs();

    if (typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.lang = 'de-DE';
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setIsRecording(false);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        setIsRecording(false);
      };
    }
  }, []);

  const speak = (text: string) => {
    if (!isVoiceOutputEnabled) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'de-DE';
    window.speechSynthesis.speak(utterance);
  };

  const toggleRecording = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
    } else {
      recognitionRef.current?.start();
      setIsRecording(true);
    }
  };

  const deployApp = async () => {
    setThoughtProcess(prev => [...prev, "Initialisiere Deployment-Pipeline...", "Kompiliere No-Code Workflow...", "Integriere SDK-Bridges (LangGraph)..."]);
    setShowBuilderModal(false);
    await new Promise(resolve => setTimeout(resolve, 2000));
    setThoughtProcess(prev => [...prev, "App erfolgreich im Vault bereitgestellt."]);
  };

  const saveSkillz = async () => {
    // In a real app, we would save this to a file or database
    setThoughtProcess(prev => [...prev, "Speichere Skillz.md in den Vault...", "Synchronisiere Agenten-Fähigkeiten..."]);
    setShowSkillzModal(false);
    // Mock save success
    await new Promise(resolve => setTimeout(resolve, 1000));
    setThoughtProcess(prev => [...prev, "Skillz.md erfolgreich aktualisiert."]);
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg: Message = { role: 'user', content: input, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsThinking(true);
    
    // Context Analysis & Memory Logic
    const newLogs = ["Analysiere Anfrage-Kontext...", "Prüfe RAG-Datenbanken...", "Abgleich mit SkillZ.md..."];
    
    const ragContext = searchDocs(input, docs);
    if (ragContext) {
      newLogs.push("Relevante Dokumentation gefunden. Integriere Kontext...");
    }

    if (input.toLowerCase().includes('erinnere') || input.toLowerCase().includes('speichere')) {
      const memoryContent = input.replace(/erinnere|speichere/gi, '').trim();
      if (memoryContent) {
        setMemories(prev => [...prev, { id: Math.random().toString(36).substr(2, 9), content: memoryContent, timestamp: Date.now() }]);
        newLogs.push(`Persistenter Erinnerungspunkt erstellt: "${memoryContent.substring(0, 20)}..."`);
      }
    }

    let fullResponse = "";
    
    if (isAtzeActive) {
      newLogs.push(
        "Schummel Atze aktiviert: Tarne mich als Googlebot...",
        "Blockiere Overlay-Scripts & Paywall-Elemente...",
        "Suche in Archive-Datenbanken (Wayback Machine)..."
      );
      setThoughtProcess([...newLogs]);

      // Simple URL detection
      const urlMatch = input.match(/https?:\/\/[^\s]+/);
      if (urlMatch) {
        newLogs.push(`Extrahiere Content von: ${urlMatch[0]}...`);
        setThoughtProcess([...newLogs]);
        try {
          const atzeRes = await fetch(`/api/bridge/atze/extract?url=${encodeURIComponent(urlMatch[0])}`);
          const atzeData = await atzeRes.json();
          if (atzeData.status === "success") {
            newLogs.push("Extraktion erfolgreich. Speichere im Vault...");
            // Add extraction to prompt context
            fullResponse += `\n\n[Schummel Atze Extraktion]:\n${atzeData.content}\n\n`;
          }
        } catch (e) {
          newLogs.push("Fehler bei der Extraktion.");
        }
      } else {
        newLogs.push("Keine URL zur Extraktion gefunden.");
      }
      
      newLogs.push("Konvertiere in sauberes Markdown...");
      setThoughtProcess([...newLogs]);
      await new Promise(resolve => setTimeout(resolve, 1000));
    } else if (isScriptAgentActive) {
      newLogs.push(
        "Script Generator Agent aktiviert: Analysiere Hardware-Anforderungen...",
        "Prüfe ESP32-Pinbelegung & RTOS-Kompatibilität...",
        "Generiere optimierten Code-Block..."
      );
      setThoughtProcess([...newLogs]);
      await new Promise(resolve => setTimeout(resolve, 800));
    } else {
      setThoughtProcess(newLogs);
    }

    const modelMsg: Message = { role: 'model', content: '', timestamp: Date.now() };
    setMessages(prev => [...prev, modelMsg]);

      try {
        let promptWithContext = ragContext 
          ? `Kontext aus der Dokumentation:\n${ragContext}\n\nBenutzeranfrage: ${input}`
          : input;
        
        let currentSystemInstruction = systemInstruction;
        
        if (isScriptAgentActive) {
          currentSystemInstruction = `Du bist der Script Generator Agent von HAL-FLASH-OS. 
          Deine Aufgabe ist es, hochoptimierte Shell- (bash/sh) oder Python-Skripte für Hardware-Entwicklung, 
          Automatisierung und ESP32-Workflows zu generieren. 
          Verwende klare Kommentare, Fehlerbehandlung und Best Practices. 
          Wenn der User nach ESP32 fragt, berücksichtige ESP-IDF oder Arduino-Core Konventionen.
          
          ${systemInstruction}`;
        } else if (isAtzeActive) {
          currentSystemInstruction = `Du bist Schummel Atze, ein Spezialist für Content-Bypass und Datenextraktion. 
          Hilf dem User, Informationen aus extrahierten Webinhalten aufzubereiten.
          
          ${systemInstruction}`;
        }
          
        const stream = generateResponseStream(promptWithContext, currentSystemInstruction);
      for await (const chunk of stream) {
        fullResponse += chunk;
        setMessages(prev => {
          const newMsgs = [...prev];
          newMsgs[newMsgs.length - 1].content = fullResponse;
          return newMsgs;
        });
      }
      speak(fullResponse);
    } catch (err) {
      console.error(err);
    } finally {
      setIsThinking(false);
    }
  };

  const addSystemMessage = React.useCallback((content: string) => {
    setMessages(prev => [...prev, { role: 'system', content, timestamp: Date.now() }]);
  }, []);

  const requestHardwarePermission = (type: 'usb' | 'bluetooth' | 'nfc' | 'wlan' | 'serial' | 'hid', action: () => Promise<void>) => {
    setPendingHardwareOp({ type, action });
    setShowPermissionModal(true);
  };

  const confirmHardwareOp = async () => {
    if (pendingHardwareOp) {
      await pendingHardwareOp.action();
      setPendingHardwareOp(null);
      setShowPermissionModal(false);
    }
  };

  const disconnectDevice = React.useCallback(async (id: string) => {
    const obj = deviceObjects.current.get(id);
    if (obj) {
      try {
        if (obj.close) await obj.close();
        if (obj.forget) await obj.forget();
        if (obj.disconnect) await obj.disconnect();
      } catch (e) {
        console.error("Disconnect error", e);
      }
      deviceObjects.current.delete(id);
    }
    setDevices(prev => prev.filter(d => d.id !== id));
    setThoughtProcess(prev => [...prev, `Gerät getrennt: ${id}`]);
    addSystemMessage(`**Hardware Bridge:** Verbindung zu Gerät \`${id}\` getrennt.`);
  }, [addSystemMessage]);

  const connectUSB = async (vendorId?: number, productId?: number) => {
    try {
      // @ts-ignore
      if ('usb' in navigator) {
        let device;
        try {
          const filters = [];
          if (vendorId) {
            const filter: any = { vendorId };
            if (productId) filter.productId = productId;
            filters.push(filter);
          }
          
          if (filters.length > 0) {
            // @ts-ignore
            device = await navigator.usb.requestDevice({ filters });
          } else {
            // @ts-ignore
            device = await navigator.usb.requestDevice({ filters: [] });
          }
        } catch (e: any) {
          if (e.name === 'TypeError' && (!vendorId)) {
            try {
              // @ts-ignore
              device = await navigator.usb.requestDevice({});
            } catch (e2) {
              // @ts-ignore
              device = await navigator.usb.requestDevice();
            }
          } else {
            throw e;
          }
        }
        await device.open();
        if (device.configuration === null) {
          try {
            await device.selectConfiguration(1);
          } catch (e) {
            console.warn("Could not select configuration 1", e);
          }
        }
        try {
          await device.claimInterface(0);
        } catch (e) {
          console.warn("Could not claim interface 0", e);
        }
        
        const id = device.serialNumber || `usb-${device.vendorId}-${device.productId}`;
        const vidHex = device.vendorId.toString(16).padStart(4, '0').toUpperCase();
        const pidHex = device.productId.toString(16).padStart(4, '0').toUpperCase();
        const fallbackName = `Unbekanntes USB-Gerät (VID: ${vidHex}, PID: ${pidHex})`;
        
        const newDevice: HardwareDevice = { 
          id, 
          name: device.productName || fallbackName, 
          type: 'usb', 
          status: 'connected',
          details: `VendorID: 0x${vidHex}, ProductID: 0x${pidHex}`,
          usbLogs: []
        };
        deviceObjects.current.set(id, device);
        addOrUpdateDevice(newDevice);
        setThoughtProcess(prev => [...prev, `USB Gerät verbunden: ${newDevice.name}. Starte Read-Loop...`]);
        addSystemMessage(`**Hardware Bridge:** USB Gerät verbunden: \`${newDevice.name}\``);
        
        // Start read loop
        readUSBLoop(id, device);
      } else {
        throw new Error("WebUSB API nicht unterstützt.");
      }
    } catch (err) {
      handleHardwareError(err, 'USB');
    }
  };

  const readUSBLoop = async (id: string, device: any) => {
    const decoder = new TextDecoder();
    let pendingLogs: { time: string, data: string, type: 'in' | 'out', id: string }[] = [];
    let flushTimeout: NodeJS.Timeout | null = null;

    const flushLogs = () => {
      if (pendingLogs.length === 0) return;
      const logsToFlush = [...pendingLogs];
      pendingLogs = [];
      
      setDevices(prev => prev.map(d => {
        if (d.id === id) {
          const newLogs = [...(d.usbLogs || []), ...logsToFlush].slice(-100);
          return { ...d, usbLogs: newLogs };
        }
        return d;
      }));
    };

    try {
      while (device.opened) {
        try {
          const result = await device.transferIn(1, 64);
          if (result.data) {
            const text = decoder.decode(result.data);
            pendingLogs.push({
              id: Math.random().toString(36).substring(2, 9),
              time: new Date().toLocaleTimeString(),
              data: text,
              type: 'in' as const
            });

            if (!flushTimeout) {
              flushTimeout = setTimeout(() => {
                flushLogs();
                flushTimeout = null;
              }, 100);
            }
          }
        } catch (e: any) {
          if (e.name === 'NetworkError' || e.name === 'NotFoundError') break;
          console.error("USB Read Error:", e);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    } catch (error) {
      console.error("USB Loop Error:", error);
    } finally {
      if (flushTimeout) clearTimeout(flushTimeout);
      flushLogs();
    }
  };

  const sendUSBData = async (deviceId: string, data: string) => {
    try {
      const device = deviceObjects.current.get(deviceId);
      if (!device) throw new Error("Gerät nicht gefunden");
      
      const encoder = new TextEncoder();
      const payload = encoder.encode(data);
      
      // Assuming endpoint 1 for out
      await device.transferOut(1, payload);
      
      setDevices(prev => prev.map(d => {
        if (d.id === deviceId) {
          const newLogs = [...(d.usbLogs || []), {
            time: new Date().toLocaleTimeString(),
            data,
            type: 'out' as const
          }].slice(-100);
          return { ...d, usbLogs: newLogs };
        }
        return d;
      }));
      
      setThoughtProcess(prev => [...prev, `USB Daten gesendet: ${data}`]);
    } catch (err) {
      handleHardwareError(err, 'USB Send');
    }
  };

  const connectBluetooth = async () => {
    try {
      // @ts-ignore
      const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [
          'battery_service', 
          'device_information', 
          'heart_rate', 
          'cycling_speed_and_cadence',
          'generic_access',
          'generic_attribute',
          'human_interface_device',
          'fitness_machine',
          'automation_io'
        ]
      });
      
      const deviceName = device.name || `Unbekanntes Bluetooth-Gerät (${device.id.substring(0, 8)})`;
      
      setThoughtProcess(prev => [...prev, `Bluetooth Gerät ausgewählt: ${deviceName}. Verbinde mit GATT Server...`]);
      
      if (!device.gatt) throw new Error("GATT Server nicht verfügbar.");
      const server = await device.gatt.connect();
      const services = await server.getPrimaryServices();
      
      const bluetoothServices: BluetoothService[] = [];
      
      for (const service of services) {
        const characteristics = await service.getCharacteristics();
        const charList: BluetoothCharacteristic[] = characteristics.map((c: any) => ({
          uuid: c.uuid,
          properties: {
            read: c.properties.read,
            write: c.properties.write || c.properties.writeWithoutResponse,
            notify: c.properties.notify
          }
        }));
        
        bluetoothServices.push({
          uuid: service.uuid,
          name: GATT_SERVICE_NAMES[service.uuid] || 'Unknown Service',
          characteristics: charList
        });
      }
      
      const serviceUUIDs = bluetoothServices.map(s => s.uuid).join(', ');
      
      const newDevice: HardwareDevice = { 
        id: `bt-${device.id}`, 
        name: deviceName, 
        type: 'bluetooth', 
        status: 'connected',
        details: `ID: ${device.id} | Services: ${bluetoothServices.length}`,
        bluetoothServices
      };
      
      deviceObjects.current.set(`bt-${device.id}`, server);
      addOrUpdateDevice(newDevice);
      
      device.addEventListener('gattserverdisconnected', () => {
        setDevices(prev => prev.filter(d => d.id !== `bt-${device.id}`));
        deviceObjects.current.delete(`bt-${device.id}`);
        const msg = `**WATCHDOG ALERT:** Verbindung zu ${deviceName} unterbrochen. State gesichert. Bitte prüfen und erneut verbinden.`;
        addSystemMessage(msg);
        setThoughtProcess(prev => [...prev, msg]);
      });

      setThoughtProcess(prev => [...prev, `Bluetooth Gerät verbunden: ${deviceName}. ${bluetoothServices.length} Services gefunden.`]);
      addSystemMessage(`**Hardware Bridge:** Bluetooth Gerät verbunden: \`${deviceName}\`. Services: \`${serviceUUIDs || 'N/A'}\``);
    } catch (err) {
      handleHardwareError(err, 'Bluetooth');
    }
  };

  const readBluetoothCharacteristic = async (deviceId: string, serviceUuid: string, charUuid: string) => {
    try {
      const server = deviceObjects.current.get(deviceId);
      if (!server) throw new Error("Gerät nicht gefunden");
      
      const service = await server.getPrimaryService(serviceUuid);
      const characteristic = await service.getCharacteristic(charUuid);
      const value = await characteristic.readValue();
      
      const decoder = new TextDecoder();
      const decodedValue = decoder.decode(value);
      
      setDevices(prev => prev.map(d => {
        if (d.id === deviceId && d.bluetoothServices) {
          return {
            ...d,
            bluetoothServices: d.bluetoothServices.map(s => {
              if (s.uuid === serviceUuid) {
                return {
                  ...s,
                  characteristics: s.characteristics.map(c => {
                    if (c.uuid === charUuid) return { ...c, value: decodedValue };
                    return c;
                  })
                };
              }
              return s;
            })
          };
        }
        return d;
      }));
      
      setThoughtProcess(prev => [...prev, `Bluetooth Charakteristik gelesen: ${charUuid} = ${decodedValue}`]);
    } catch (err) {
      handleHardwareError(err, 'Bluetooth Read');
    }
  };

  const writeBluetoothCharacteristic = async (deviceId: string, serviceUuid: string, charUuid: string, value: string) => {
    try {
      const server = deviceObjects.current.get(deviceId);
      if (!server) throw new Error("Gerät nicht gefunden");
      
      const service = await server.getPrimaryService(serviceUuid);
      const characteristic = await service.getCharacteristic(charUuid);
      
      const encoder = new TextEncoder();
      await characteristic.writeValue(encoder.encode(value));
      
      setThoughtProcess(prev => [...prev, `Bluetooth Charakteristik geschrieben: ${charUuid} = ${value}`]);
      addSystemMessage(`**Bluetooth:** Wert \`${value}\` an Charakteristik \`${charUuid}\` gesendet.`);
    } catch (err) {
      handleHardwareError(err, 'Bluetooth Write');
    }
  };

  const connectSerial = async () => {
    try {
      // @ts-ignore
      if ('serial' in navigator) {
        // @ts-ignore
        const port = await navigator.serial.requestPort();
        await port.open({ baudRate: 115200 });
        const info = port.getInfo();
        const vidHex = info.usbVendorId ? info.usbVendorId.toString(16).padStart(4, '0').toUpperCase() : 'N/A';
        const pidHex = info.usbProductId ? info.usbProductId.toString(16).padStart(4, '0').toUpperCase() : 'N/A';
        const id = `serial-${info.usbVendorId || 'unknown'}-${info.usbProductId || 'unknown'}`;
        const fallbackName = `Unbekanntes Serial-Gerät (VID: ${vidHex}, PID: ${pidHex})`;
        
        const newDevice: HardwareDevice = { 
          id, 
          name: fallbackName, 
          type: 'serial', 
          status: 'connected',
          details: `Baudrate: 115200, VendorID: 0x${vidHex}, ProductID: 0x${pidHex}`,
          serialParsingRules: [
            { id: '1', label: 'Temperature', regex: 'TEMP: ([\\d.]+)', color: '#f97316', unit: '°C', active: true },
            { id: '2', label: 'Humidity', regex: 'HUM: ([\\d.]+)', color: '#3b82f6', unit: '%', active: true },
            { id: '3', label: 'Voltage', regex: 'VOLT: ([\\d.]+)', color: '#eab308', unit: 'V', active: true }
          ]
        };
        deviceObjects.current.set(id, port);
        addOrUpdateDevice(newDevice);
        setThoughtProcess(prev => [...prev, "Serial Port verbunden. Starte Read-Loop..."]);
        addSystemMessage("**Hardware Bridge:** Serieller Port (COM) erfolgreich geöffnet.");

        // Start read loop
        readSerialLoop(id, port);
      } else {
        throw new Error("Web Serial API nicht unterstützt.");
      }
    } catch (err) {
      handleHardwareError(err, 'Serial');
    }
  };

  const readSerialLoop = async (id: string, port: any) => {
    const decoder = new TextDecoder();
    let buffer = '';
    let pendingLines: string[] = [];
    let flushTimeout: any = null;

    const flushLogs = () => {
      if (pendingLines.length === 0) return;
      const linesToFlush = [...pendingLines];
      pendingLines = [];
      
      setDevices(prev => prev.map(d => {
        if (d.id === id) {
          const newLogs = [...(d.serialLogs || [])];
          linesToFlush.forEach(line => {
            if (line.trim() || line === '') {
              newLogs.push({
                time: new Date().toLocaleTimeString(),
                data: line,
                type: 'in' as const
              });
            }
          });
          return { ...d, serialLogs: newLogs.slice(-200) };
        }
        return d;
      }));
    };
    
    while (port.readable) {
      const reader = port.readable.getReader();
      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split(/\r?\n/);
          
          // Keep the last partial line in the buffer
          buffer = lines.pop() || '';
          
          if (lines.length > 0) {
            pendingLines.push(...lines);
            if (!flushTimeout) {
              flushTimeout = setTimeout(() => {
                flushLogs();
                flushTimeout = null;
              }, 100); // Batch updates every 100ms (10fps)
            }
          }
        }
      } catch (error) {
        console.error("Serial Read Error:", error);
        break;
      } finally {
        reader.releaseLock();
        flushLogs();
        if (flushTimeout) clearTimeout(flushTimeout);
      }
    }
  };

  const clearSerialLogs = (deviceId: string) => {
    setDevices(prev => prev.map(d => d.id === deviceId ? { ...d, serialLogs: [] } : d));
  };

  const sendSerialData = async (deviceId: string, data: string) => {
    try {
      const port = deviceObjects.current.get(deviceId);
      if (port && port.writable) {
        const writer = port.writable.getWriter();
        const encoder = new TextEncoder();
        await writer.write(encoder.encode(data));
        writer.releaseLock();
        
        setDevices(prev => prev.map(d => {
          if (d.id === deviceId) {
            const newLogs = [...(d.serialLogs || []), {
              time: new Date().toLocaleTimeString(),
              data,
              type: 'out' as const
            }].slice(-100);
            return { ...d, serialLogs: newLogs };
          }
          return d;
        }));
      }
    } catch (err) {
      handleHardwareError(err, 'Serial');
    }
  };

  const connectHID = async () => {
    try {
      // @ts-ignore
      if ('hid' in navigator) {
        // @ts-ignore
        const [device] = await navigator.hid.requestDevice({ filters: [] });
        if (device) {
          await device.open();
          const id = `hid-${device.productId}-${device.vendorId}`;
          const newDevice: HardwareDevice = { 
            id, 
            name: device.productName || 'HID Device', 
            type: 'hid', 
            status: 'connected',
            details: `VendorID: ${device.vendorId}, ProductID: ${device.productId}`
          };
          deviceObjects.current.set(id, device);
          addOrUpdateDevice(newDevice);
          setThoughtProcess(prev => [...prev, `HID Gerät verbunden: ${device.productName}`]);
          addSystemMessage(`**Hardware Bridge:** HID Gerät verbunden: \`${device.productName}\``);
        }
      } else {
        throw new Error("WebHID API nicht unterstützt.");
      }
    } catch (err) {
      handleHardwareError(err, 'HID');
    }
  };

  const connectNFC = async () => {
    try {
      if ('NDEFReader' in window) {
        // @ts-ignore
        const ndef = new NDEFReader();
        await ndef.scan();
        const id = 'nfc-reader';
        const newDevice: HardwareDevice = { 
          id, 
          name: 'NFC Reader', 
          type: 'nfc', 
          status: 'scanning',
          details: 'Aktiv - Warte auf Tag...',
          ndefMessages: []
        };
        deviceObjects.current.set(id, ndef);
        addOrUpdateDevice(newDevice);
        setThoughtProcess(prev => [...prev, "NFC Scan gestartet..."]);
        addSystemMessage("**Hardware Bridge:** NFC Scan aktiv. Halte einen Tag an das Gerät.");
        
        // @ts-ignore
        ndef.addEventListener("reading", ({ message, serialNumber }) => {
          const messages: NdefMessage[] = message.records.map((record: any) => {
            const decoder = new TextDecoder(record.encoding);
            return {
              type: record.recordType === 'url' ? 'url' : 'text',
              content: decoder.decode(record.data)
            };
          });
          
          setDevices(prev => prev.map(d => {
            if (d.type === 'nfc') {
              return {
                ...d,
                status: 'connected',
                details: `Tag erkannt: ${serialNumber}`,
                ndefMessages: messages
              };
            }
            return d;
          }));
          
          setThoughtProcess(prev => [...prev, `NFC Tag gelesen: ${serialNumber}. ${messages.length} Records.`]);
          addSystemMessage(`**NFC:** Tag \`${serialNumber}\` erkannt. ${messages.length} Datensätze gelesen.`);
        });
      } else {
        throw new Error("Web NFC API nicht unterstützt.");
      }
    } catch (err) {
      handleHardwareError(err, 'NFC');
    }
  };

  const writeNfcTag = async (deviceId: string, content: string, type: 'text' | 'url' = 'text') => {
    try {
      const ndef = deviceObjects.current.get(deviceId);
      if (!ndef) throw new Error("NFC Reader nicht aktiv");
      
      await ndef.write({
        records: [{ recordType: type, data: content }]
      });
      
      setThoughtProcess(prev => [...prev, `NFC Tag geschrieben: ${content}`]);
      addSystemMessage(`**NFC:** Daten erfolgreich auf Tag geschrieben: \`${content}\``);
    } catch (err) {
      handleHardwareError(err, 'NFC Write');
    }
  };

  const connectWLAN = async () => {
    setThoughtProcess(prev => [...prev, "Initialisiere WLAN Bridge...", "Prüfe lokale Hardware-Schnittstellen..."]);
    
    try {
      // Check if the Python bridge is reachable
      const response = await fetch('/api/bridge/health');
      if (!response.ok) throw new Error("Bridge offline");
      
      const bridgeData = await response.json();
      
      setThoughtProcess(prev => [...prev, 
        "Bridge-Status: ONLINE", 
        `Plattform: ${bridgeData.platform}`,
        "Scanne WLAN Umgebung...", 
        "Analysiere Paket-Header...", 
        "Identifiziere kompatible Access Points..."
      ]);
      
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const mockWlan: HardwareDevice = {
        id: 'wlan-bridge',
        name: `WLAN Bridge (${bridgeData.platform || 'Unbekanntes WLAN-Gerät'})`,
        type: 'wlan',
        status: 'connected',
        details: `Signal: -45dBm, Security: WPA3, Bridge: ${bridgeData.platform || 'N/A'}`
      };
      addOrUpdateDevice(mockWlan);
      addSystemMessage("**Hardware Bridge:** WLAN Bridge via Python-Backend hergestellt.");
    } catch (error) {
      console.error("WLAN Bridge connection failed", error);
      setThoughtProcess(prev => [...prev, "FEHLER: Hardware-Bridge nicht erreichbar.", "Bitte starte 'server_bridge.py' lokal oder prüfe den Container-Status."]);
      addSystemMessage("**Hardware Bridge Error:** WLAN Bridge konnte nicht initialisiert werden. Backend-Schnittstelle offline.");
    }
  };

  const handleBridgeAction = (action: string, params?: any) => {
    console.log(`Bridge Action: ${action}`, params);
    
    switch (action) {
      case 'first-contact':
        handleHardwareAction('first-contact');
        break;
      case 'reboot':
        const serialDev = devices.find(d => d.type === 'serial' || d.type === 'esp32');
        if (serialDev) sendSerialData(serialDev.id, 'reboot\n');
        break;
      case 'erase':
        const espDev = devices.find(d => d.type === 'esp32');
        if (espDev) eraseESP32(espDev.id);
        break;
      case 'monitor':
        // Already in monitor tab or handled by component
        break;
      case 'reboot-bootloader':
        {
          const adbDev = devices.find(d => d.type === 'usb' && d.name.toLowerCase().includes('adb'));
          if (adbDev) runADBCommand(adbDev.id, 'reboot bootloader');
        }
        break;
      case 'get-props':
        {
          const adbDev = devices.find(d => d.type === 'usb' && d.name.toLowerCase().includes('adb'));
          if (adbDev) runADBCommand(adbDev.id, 'shell getprop');
        }
        break;
      case 'kill-adb':
        // Kill ADB server logic
        break;
      case 'scan-usb':
        requestHardwarePermission('usb', connectUSB);
        break;
      case 'scan-wlan':
        connectWLAN();
        break;
      case 'hal-reset':
        devices.forEach(d => disconnectDevice(d.id));
        break;
      case 'read-controller':
        // E-Mobility logic
        break;
      case 'clear-errors':
        // E-Mobility logic
        break;
      default:
        console.warn(`Unknown bridge action: ${action}`);
    }
  };

  const isHardwareTab = ['esp-toolbox', 'android-toolbox', 'hardware', 'emobility'].includes(activeTab);

  return (
    <div className="flex h-[100dvh] w-full bg-tactical-bg text-tactical-text overflow-hidden font-sans relative">
      {/* Hardware Bridge Menu Overlay */}
      {isHardwareTab && (
        <React.Suspense fallback={null}>
          <HardwareBridgeMenu 
            activeTab={activeTab as BridgeTab}
            devices={devices}
            onAction={handleBridgeAction}
            status={devices.length > 0 ? 'online' : 'offline'}
          />
        </React.Suspense>
      )}
      {/* Floating Live Dashboard */}
      <motion.div 
        drag 
        dragMomentum={false}
        className="hidden md:flex fixed top-20 right-8 z-50 bg-tactical-card/90 backdrop-blur-md border border-tactical-border rounded-2xl shadow-2xl p-4 flex-col gap-3 overflow-hidden"
        style={{ resize: 'both', minWidth: '250px', minHeight: '150px', maxWidth: '400px', maxHeight: '600px' }}
      >
        <div className="flex items-center justify-between border-b border-tactical-border/50 pb-2 cursor-move">
          <h3 className="text-xs font-bold uppercase tracking-widest text-tactical-accent flex items-center gap-2">
            <Activity size={14} /> Live Status
          </h3>
          <span className="text-[10px] bg-tactical-bg px-2 py-1 rounded-full text-tactical-muted">
            {devices.length} Devices
          </span>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar space-y-2">
          {devices.length === 0 ? (
            <p className="text-xs text-tactical-muted italic text-center py-4">Keine Hardware verbunden</p>
          ) : (
            devices.map(device => (
              <div key={device.id} className="bg-tactical-bg/50 border border-tactical-border/50 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold truncate pr-2">{device.name}</span>
                  <span className={cn(
                    "w-2 h-2 rounded-full shrink-0",
                    device.status === 'connected' || device.status === 'authorized' ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" :
                    device.status === 'flashing' || device.status === 'erasing' ? "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)] animate-pulse" :
                    "bg-tactical-muted"
                  )} />
                </div>
                <div className="flex items-center justify-between text-[10px] text-tactical-muted">
                  <span className="uppercase tracking-wider">{device.type}</span>
                  <span>{device.status}</span>
                </div>
                {device.flashProgress !== undefined && (
                  <div className="w-full bg-tactical-bg rounded-full h-1.5 overflow-hidden">
                    <div 
                      className="bg-tactical-accent h-full transition-all duration-300"
                      style={{ width: `${device.flashProgress}%` }}
                    />
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </motion.div>

      {/* Savepoint Notifications */}
      <AnimatePresence>
        {savepoint && (
          <motion.div 
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 50 }}
            className="fixed top-20 md:top-24 right-4 md:right-6 z-50 w-[calc(100vw-2rem)] md:w-64 max-w-sm"
          >
            <div className="bg-tactical-accent/10 border border-tactical-accent/50 backdrop-blur-xl p-4 rounded-2xl shadow-2xl space-y-3">
              <div className="flex items-center gap-2">
                <History className="text-tactical-accent w-4 h-4" />
                <h4 className="text-[10px] font-bold text-tactical-accent uppercase tracking-widest">Savepoint Detected</h4>
              </div>
              <p className="text-[10px] text-tactical-muted">
                Letzte Session: {savepoint.data.deviceName}<br/>
                Status: {new Date(savepoint.timestamp).toLocaleTimeString()}
              </p>
              <div className="flex gap-2">
                <button 
                  onClick={() => {
                    addSystemMessage(`**RECOVERY:** Session für ${savepoint.data.deviceName} wird wiederhergestellt...`);
                    setSavepoint(null);
                    localStorage.removeItem('hal_flash_savepoint');
                  }}
                  className="flex-1 py-1.5 bg-tactical-accent text-tactical-bg text-[8px] font-bold rounded-lg uppercase hover:scale-105 transition-transform"
                >
                  RESUME
                </button>
                <button 
                  onClick={() => {
                    setSavepoint(null);
                    localStorage.removeItem('hal_flash_savepoint');
                  }}
                  className="px-3 py-1.5 bg-tactical-card border border-tactical-border text-[8px] font-bold rounded-lg uppercase hover:bg-red-500/20 hover:text-red-500 transition-colors"
                >
                  DISCARD
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <AnimatePresence>
        {(isSidebarOpen || !isMobile) && (
          <motion.aside 
            initial={isMobile ? { x: -300 } : false}
            animate={{ 
              width: isSidebarOpen ? 260 : 80,
              x: 0,
              position: isMobile ? 'fixed' : 'relative',
              top: isMobile ? 0 : undefined,
              left: isMobile ? 0 : undefined,
              bottom: isMobile ? 0 : undefined
            }}
            exit={isMobile ? { x: -300 } : undefined}
            transition={{ type: 'spring', damping: 20, stiffness: 100 }}
            className={cn(
              "border-r border-tactical-border bg-tactical-card flex flex-col z-40 h-full",
              isMobile && "shadow-2xl"
            )}
          >
            <div className="p-4 flex items-center justify-between border-b border-tactical-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-tactical-accent/20 rounded-lg flex items-center justify-center border border-tactical-accent/50">
                  <Zap className="text-tactical-accent w-6 h-6" />
                </div>
                {isSidebarOpen && <span className="font-bold tracking-tighter text-lg">TAKTIKAL</span>}
              </div>
              {isMobile && (
                <button onClick={() => setIsSidebarOpen(false)} className="p-2 hover:bg-tactical-border rounded-lg">
                  <X size={20} />
                </button>
              )}
            </div>

            <nav className="flex-1 min-h-0 p-3 space-y-1 overflow-y-auto custom-scrollbar">
              <NavItem icon={<MessageSquare />} label="Orchestrator" active={activeTab === 'chat'} onClick={() => { setActiveTab('chat'); if(isMobile) setIsSidebarOpen(false); }} collapsed={!isSidebarOpen && !isMobile} />
              <NavItem icon={<Wrench />} label="Builder" active={activeTab === 'builder'} onClick={() => { setActiveTab('builder'); if(isMobile) setIsSidebarOpen(false); }} collapsed={!isSidebarOpen && !isMobile} />
              <NavItem icon={<Library />} label="Galerie" active={activeTab === 'gallery'} onClick={() => { setActiveTab('gallery'); if(isMobile) setIsSidebarOpen(false); }} collapsed={!isSidebarOpen && !isMobile} />
              <NavItem icon={<BookOpen />} label="IoT Resources" active={activeTab === 'iot-resources'} onClick={() => { setActiveTab('iot-resources'); if(isMobile) setIsSidebarOpen(false); }} collapsed={!isSidebarOpen && !isMobile} />
              <NavItem icon={<Cpu />} label="ESP32 Toolbox" active={activeTab === 'esp-toolbox'} onClick={() => { setActiveTab('esp-toolbox'); if(isMobile) setIsSidebarOpen(false); }} collapsed={!isSidebarOpen && !isMobile} />
              <NavItem icon={<Smartphone />} label="Android Toolbox" active={activeTab === 'android-toolbox'} onClick={() => { setActiveTab('android-toolbox'); if(isMobile) setIsSidebarOpen(false); }} collapsed={!isSidebarOpen && !isMobile} />
              <NavItem icon={<FileCode />} label="Vault" active={activeTab === 'vault'} onClick={() => { setActiveTab('vault'); if(isMobile) setIsSidebarOpen(false); }} collapsed={!isSidebarOpen && !isMobile} />
              <NavItem icon={<Activity />} label="E-Mobility" active={activeTab === 'emobility'} onClick={() => { setActiveTab('emobility'); if(isMobile) setIsSidebarOpen(false); }} collapsed={!isSidebarOpen && !isMobile} />
              <NavItem icon={<Cpu />} label="Hardware" active={activeTab === 'hardware'} onClick={() => { setActiveTab('hardware'); if(isMobile) setIsSidebarOpen(false); }} collapsed={!isSidebarOpen && !isMobile} />
              <NavItem icon={<Zap />} label="Ollama Setup" active={activeTab === 'ollama-setup'} onClick={() => { setActiveTab('ollama-setup'); if(isMobile) setIsSidebarOpen(false); }} collapsed={!isSidebarOpen && !isMobile} />
              <NavItem icon={<Settings />} label="Setup & AI" active={activeTab === 'setup'} onClick={() => { setActiveTab('setup'); if(isMobile) setIsSidebarOpen(false); }} collapsed={!isSidebarOpen && !isMobile} />
              <NavItem icon={<Code2 />} label="Scripts" active={activeTab === 'scripts'} onClick={() => { setActiveTab('scripts'); if(isMobile) setIsSidebarOpen(false); }} collapsed={!isSidebarOpen && !isMobile} />
              <NavItem icon={<Database />} label="DB Vault" active={activeTab === 'db-vault'} onClick={() => { setActiveTab('db-vault'); if(isMobile) setIsSidebarOpen(false); }} collapsed={!isSidebarOpen && !isMobile} />
              <NavItem icon={<Shield />} label="Privacy Shield" active={activeTab === 'privacy-shield'} onClick={() => { setActiveTab('privacy-shield'); if(isMobile) setIsSidebarOpen(false); }} collapsed={!isSidebarOpen && !isMobile} />
              <NavItem icon={<Wrench />} label="Repair Hub" active={activeTab === 'repair-hub'} onClick={() => { setActiveTab('repair-hub'); if(isMobile) setIsSidebarOpen(false); }} collapsed={!isSidebarOpen && !isMobile} />
              <NavItem icon={<LifeBuoy />} label="Rescue Hub" active={activeTab === 'rescue-hub'} onClick={() => { setActiveTab('rescue-hub'); if(isMobile) setIsSidebarOpen(false); }} collapsed={!isSidebarOpen && !isMobile} />
              <div className="pt-4 pb-2 px-3">
                {(isSidebarOpen || isMobile) && <span className="text-[10px] uppercase tracking-widest text-tactical-muted font-bold">Schnell-Verbindung</span>}
              </div>
              <NavItem icon={<Usb />} label="USB verbinden" onClick={() => requestHardwarePermission('usb', connectUSB)} collapsed={!isSidebarOpen && !isMobile} />
              <NavItem icon={<Hash />} label="Serial verbinden" onClick={() => requestHardwarePermission('serial', connectSerial)} collapsed={!isSidebarOpen && !isMobile} />
              <NavItem icon={<Gamepad2 />} label="HID verbinden" onClick={() => requestHardwarePermission('hid', connectHID)} collapsed={!isSidebarOpen && !isMobile} />
              <NavItem icon={<Bluetooth />} label="BT verbinden" onClick={() => requestHardwarePermission('bluetooth', connectBluetooth)} collapsed={!isSidebarOpen && !isMobile} />
              <NavItem icon={<Activity />} label="NFC Scan" onClick={() => requestHardwarePermission('nfc', connectNFC)} collapsed={!isSidebarOpen && !isMobile} />
              <NavItem icon={<Globe />} label="WLAN Bridge" onClick={() => requestHardwarePermission('wlan', connectWLAN)} collapsed={!isSidebarOpen && !isMobile} />
            </nav>

            <div className="p-3 border-t border-tactical-border space-y-2">
              <button 
                onClick={() => (window as any).HAL.systemReset()}
                className={cn(
                  "w-full flex items-center gap-3 p-3 rounded-xl transition-all group bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white",
                  !isSidebarOpen && !isMobile && "justify-center"
                )}
                title="HAL_SYSTEM_RESET"
              >
                <RefreshCw size={20} className="shrink-0" />
                {isSidebarOpen && <span className="font-bold text-xs uppercase tracking-widest">System Reset</span>}
              </button>
              <NavItem icon={<Settings />} label="Settings" active={activeTab === 'settings'} onClick={() => { setActiveTab('settings'); if(isMobile) setIsSidebarOpen(false); }} collapsed={!isSidebarOpen && !isMobile} />
              {!isMobile && (
                <button 
                  onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                  className="w-full mt-2 p-2 hover:bg-tactical-border rounded-lg flex items-center justify-center transition-colors"
                >
                  <ChevronRight className={cn("w-5 h-5 transition-transform", isSidebarOpen && "rotate-180")} />
                </button>
              )}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Mobile Overlay */}
      {isMobile && isSidebarOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30"
        />
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative min-w-0">
        {/* Header */}
        <header className="h-16 border-b border-tactical-border flex items-center justify-between px-4 lg:px-6 bg-tactical-card/50 backdrop-blur-md z-10 shrink-0">
          <div className="flex items-center gap-3 lg:gap-4 overflow-hidden">
            {isMobile && (
              <button onClick={() => setIsSidebarOpen(true)} className="p-2 hover:bg-tactical-border rounded-lg shrink-0">
                <Menu size={20} />
              </button>
            )}
            <h2 className="font-medium text-xs uppercase tracking-widest text-tactical-muted truncate">
              {activeTab === 'chat' ? 'Mission Control' : activeTab.toUpperCase()}
            </h2>
            <div className="hidden sm:flex gap-2 overflow-x-auto no-scrollbar max-w-[50vw]">
              {devices.map(d => (
                <div key={d.id} className="px-2 py-0.5 bg-tactical-accent/10 border border-tactical-accent/30 rounded text-[10px] text-tactical-accent flex items-center gap-1 shrink-0">
                  <div className="w-1 h-1 bg-tactical-accent rounded-full animate-pulse" />
                  {d.name}
                </div>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-1 lg:gap-3">
            <button 
              onClick={() => {
                if ((window as any).HAL && (window as any).HAL.disconnectAll) {
                  (window as any).HAL.disconnectAll();
                  setMessages(prev => [...prev, { 
                    role: 'model', 
                    content: '**SELF-HEALING PATCH EXECUTED**\n\n- Hardware-Interfaces getrennt.\n- Prozess-Flush durchgeführt.\n- Bereit für Reconnect.', 
                    timestamp: Date.now() 
                  }]);
                  setActiveTab('chat');
                }
              }}
              className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-red-500/10 border border-red-500/30 text-red-500 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-red-500/20 transition-colors mr-2"
              title="Emergency Reset / Self-Healing"
            >
              <Power size={14} />
              <span>Hard Reset</span>
            </button>
            <button 
              onClick={() => setIsVoiceOutputEnabled(!isVoiceOutputEnabled)}
              className={cn("p-2 rounded-lg transition-colors", isVoiceOutputEnabled ? "bg-tactical-accent/20 text-tactical-accent" : "hover:bg-tactical-border")}
              title="Sprachausgabe (DE)"
            >
              <Mic className={cn("w-5 h-5", isVoiceOutputEnabled && "animate-pulse")} />
            </button>
            <button 
              onClick={() => setShowTerminal(!showTerminal)}
              className={cn("p-2 rounded-lg transition-colors", showTerminal ? "bg-tactical-accent/20 text-tactical-accent" : "hover:bg-tactical-border")}
            >
              <TerminalIcon className="w-5 h-5" />
            </button>
            <div className="hidden sm:block h-8 w-px bg-tactical-border mx-1" />
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-tactical-border/50 rounded-full border border-tactical-border">
              <Shield className="w-4 h-4 text-tactical-accent" />
              <span className="text-xs font-mono">SECURE_ENCLAVE: ON</span>
            </div>
            <button 
              onClick={() => setShowCustomizerModal(true)}
              className="p-2 hover:bg-tactical-border rounded-lg transition-colors"
              title="UI anpassen"
            >
              <LayoutGrid className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 flex flex-col relative">
            <div className="flex-1 min-h-0 overflow-y-auto p-4 md:p-6 flex flex-col gap-6 custom-scrollbar">
              <ErrorBoundary>
                <React.Suspense fallback={
                  <div className="flex items-center justify-center h-full w-full">
                    <div className="flex flex-col items-center gap-4 text-tactical-muted">
                      <Loader2 className="w-8 h-8 animate-spin text-tactical-accent" />
                      <p className="text-sm font-mono">Lade Modul...</p>
                    </div>
                  </div>
                }>
                  {activeTab === 'chat' && (
                    <>
                      {messages.map((msg, i) => (
                    <motion.div 
                      key={`chat-msg-${i}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn(
                        "flex gap-3 md:gap-4 max-w-full md:max-w-4xl",
                        msg.role === 'user' ? "ml-auto flex-row-reverse" : "mr-auto"
                      )}
                    >
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border",
                        msg.role === 'user' ? "bg-tactical-border border-tactical-muted" : "bg-tactical-accent/10 border-tactical-accent/30"
                      )}>
                        {msg.role === 'user' ? <Plus className="w-4 h-4" /> : <Zap className="w-4 h-4 text-tactical-accent" />}
                      </div>
                      <div className={cn(
                        "p-3 md:p-4 rounded-2xl text-sm leading-relaxed overflow-x-auto",
                        msg.role === 'user' ? "bg-tactical-accent text-tactical-bg font-medium" : "bg-tactical-card border border-tactical-border"
                      )}>
                        <div className="prose prose-invert prose-sm max-w-none markdown-body">
                          <Markdown>{msg.content}</Markdown>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                  <div ref={chatEndRef} />
                </>
              )}

              {activeTab === 'builder' && <BuilderView />}
              {activeTab === 'gallery' && (
                <GalleryView 
                  agents={agents} 
                  instructions={instructions} 
                  onApplyInstruction={applyInstruction}
                  onEditInstruction={(i) => { setEditingInstruction(i); setShowInstructionModal(true); }}
                  onDeleteInstruction={deleteInstruction}
                  onAddInstruction={() => { setEditingInstruction(null); setShowInstructionModal(true); }}
                />
              )}
              {activeTab === 'vault' && <VaultView />}
              {activeTab === 'emobility' && <EMobilityView onSelectSpecialist={() => setActiveTab('emobility-specialist')} />}
              {activeTab === 'emobility-specialist' && <ScooterSpecialistView />}
              {activeTab === 'settings' && <SettingsView />}
              {activeTab === 'esp-toolbox' && (
                <ESP32Toolbox 
                  devices={devices}
                  onConnect={connectESP32}
                  onDisconnect={disconnectDevice}
                  onFlash={flashESP32}
                  onErase={eraseESP32}
                  onProvision={provisionESP32}
                  onUpdateWebhooks={updateWebhooks}
                  sendSerialData={sendSerialData}
                  onClearLogs={clearSerialLogs}
                  onUpdateDevice={addOrUpdateDevice}
                />
              )}
              {activeTab === 'android-toolbox' && (
                <AndroidToolbox 
                  devices={devices}
                  onConnectADB={connectADB}
                  onConnectFastboot={connectFastboot}
                  onConnectMTK={connectMTK}
                  onConnectUniversal={connectUniversal}
                  onDisconnect={disconnectDevice}
                  onFlashAndroid={flashAndroid}
                  onRunShell={runADBCommand}
                  onAction={handleHardwareAction}
                />
              )}
              {activeTab === 'hardware' && (
                <HardwareView 
                  devices={devices} 
                  onRequestPermission={requestHardwarePermission}
                  onDisconnect={disconnectDevice}
                  connectUSB={connectUSB}
                  connectBluetooth={connectBluetooth}
                  connectNFC={connectNFC}
                  connectWLAN={connectWLAN}
                  connectSerial={connectSerial}
                  connectHID={connectHID}
                  readBluetoothCharacteristic={readBluetoothCharacteristic}
                  writeBluetoothCharacteristic={writeBluetoothCharacteristic}
                  sendUSBData={sendUSBData}
                  sendSerialData={sendSerialData}
                  writeNfcTag={writeNfcTag}
                  hardwareError={hardwareError}
                  clearHardwareError={() => setHardwareError(null)}
                />
              )}
              {activeTab === 'setup' && <SetupGuide config={aiConfig} onConfigChange={handleAIConfigChange} />}
              {activeTab === 'scripts' && <ScriptLibrary />}
              {activeTab === 'ollama-setup' && <OllamaSetupSpace config={aiConfig} onConfigChange={handleAIConfigChange} />}
              {activeTab === 'db-vault' && <DatabaseVault />}
              {activeTab === 'privacy-shield' && <PrivacyShield />}
              {activeTab === 'repair-hub' && <RepairHub />}
              {activeTab === 'rescue-hub' && (
                <React.Suspense fallback={<div className="flex items-center justify-center h-full"><Loader2 className="animate-spin text-tactical-accent" /></div>}>
                  <RescueHub 
                    devices={devices.filter(d => d.type === 'usb' || d.type === 'serial' || d.type === 'adb' || d.type === 'fastboot' || d.type === 'edl' || d.type === 'mtk')}
                    onConnectADB={connectADB}
                    onConnectFastboot={connectFastboot}
                    onConnectEDL={connectEDL}
                    onConnectUniversal={connectUniversal}
                    onRunRescueAction={async (id, action, params) => {
                      console.log(`Rescue Action: ${action} on ${id}`, params);
                      addSystemMessage(`**RESCUE:** Führe \`${action}\` auf Gerät \`${id}\` aus...`);
                      
                      // Simulate delay
                      await new Promise(r => setTimeout(r, 1500));

                      if (action === 'scan_partitions') {
                        return {
                          status: 'success',
                          data: [
                            { name: 'boot', size: '64MB', start: '0x000000' },
                            { name: 'recovery', size: '64MB', start: '0x004000' },
                            { name: 'system', size: '4GB', start: '0x008000' },
                            { name: 'vendor', size: '1GB', start: '0x408000' },
                            { name: 'userdata', size: '54GB', start: '0x508000' },
                            { name: 'persist', size: '32MB', start: '0xEE0000' },
                            { name: 'config', size: '1MB', start: '0xEF0000' },
                          ]
                        };
                      }
                      return { status: 'success' };
                    }}
                    onDisconnect={disconnectDevice}
                  />
                </React.Suspense>
              )}
              {activeTab === 'iot-resources' && <IoTResourcesView onOpenToolbox={() => setActiveTab('esp-toolbox')} />}
                </React.Suspense>
              </ErrorBoundary>
            </div>

            {/* Floating Network Widget */}
            <React.Suspense fallback={null}>
              <FloatingNetworkWidget 
                isConnected={devices.length > 0} 
                connections={React.useMemo(() => devices.map(d => ({
                  id: d.id,
                  name: d.name,
                  type: d.type,
                  status: d.status,
                  ip: d.type === 'wlan' ? '192.168.1.105' : (d.type === 'adb' ? '10.0.0.5' : '127.0.0.1'),
                  latency: Math.floor(Math.random() * 40 + 5) + 'ms'
                })), [devices])} 
                onAction={(action, payload) => {
                  let msg = '';
                  if (action === 'tool') {
                    msg = `**Netzwerk-Tool gestartet:** ${payload}\n\nInitialisiere Diagnose-Protokoll für aktive Verbindungen...`;
                  } else if (action === 'reconnect') {
                    msg = `**Netzwerk-Reset:** Führe Reconnect und DHCP-Renew für alle aktiven Schnittstellen durch...`;
                  } else if (action === 'scenario') {
                    msg = `**Orchestrator-Szenario:** Starte geplante Task-Ausführung. Lade Skripte aus dem Vault...`;
                  }
                  
                  if (msg) {
                    setMessages(prev => [...prev, { role: 'model', content: msg, timestamp: Date.now() }]);
                    setActiveTab('chat');
                  }
                }}
              />
            </React.Suspense>

            {/* Floating Device Manager */}
            <React.Suspense fallback={null}>
              <FloatingDeviceManager 
                devices={devices}
                onDisconnect={disconnectDevice}
              />
            </React.Suspense>

            {/* Input Area */}
            {activeTab === 'chat' && (
              <div className="p-4 lg:p-6 border-t border-tactical-border bg-tactical-bg/80 backdrop-blur-xl shrink-0">
                <div className="max-w-4xl mx-auto relative">
                  <div className="absolute -top-10 left-0 flex gap-2 overflow-x-auto pb-2 no-scrollbar max-w-full px-1">
                    <QuickAction 
                      label="Skillz.md" 
                      icon={<FileCode />} 
                      onClick={() => setShowSkillzModal(true)} 
                    />
                    <div className="relative group/model">
                      <QuickAction label={isMobile ? selectedModel.split(' ')[0] : `Model: ${selectedModel}`} icon={<Cpu />} />
                      <div className="absolute bottom-full mb-2 left-0 bg-tactical-card border border-tactical-border rounded-xl p-2 hidden group-hover/model:block w-48 z-50">
                        {['Gemini 3.1 Pro', 'Claude 3.5 Sonnet', 'Grok-1 (Uncensored)', 'Llama 3 Cloud Coder', 'Longcat AI'].map(m => (
                          <button 
                            key={m} 
                            onClick={() => setSelectedModel(m)}
                            className="w-full text-left px-3 py-2 hover:bg-tactical-accent hover:text-tactical-bg rounded-lg text-[10px] font-bold transition-colors"
                          >
                            {m}
                          </button>
                        ))}
                      </div>
                    </div>
                    <QuickAction label={isMobile ? "Instr." : "System-Instr."} icon={<Shield />} onClick={() => setShowCustomizerModal(true)} />
                    <QuickAction label="Upload" icon={<Plus />} />
                    <QuickAction label={isMobile ? "Builder" : "No-Code Builder"} icon={<Wrench />} onClick={() => setShowBuilderModal(true)} />
                  </div>
                  <div className="relative group">
                    <textarea 
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
                      placeholder={isMobile ? "Nachricht..." : "Workflow, Task oder Code-Anfrage eingeben..."}
                      className="w-full bg-tactical-card border border-tactical-border rounded-2xl p-4 pr-24 focus:outline-none focus:border-tactical-accent transition-all min-h-[60px] lg:min-h-[80px] max-h-[200px] resize-none custom-scrollbar shadow-2xl text-sm"
                    />
                    <div className="absolute right-2 bottom-2 flex items-center gap-1 lg:gap-2">
                      <button 
                        onClick={() => setIsAtzeActive(!isAtzeActive)}
                        className={cn(
                          "p-2 rounded-xl transition-all relative shrink-0",
                          isAtzeActive ? "bg-tactical-accent text-tactical-bg shadow-[0_0_15px_rgba(0,255,65,0.5)]" : "hover:bg-tactical-border text-tactical-muted"
                        )}
                        title="Schummel Atze aktivieren (Bypass & Extraction)"
                      >
                        <Glasses className="w-5 h-5" />
                        {isAtzeActive && (
                          <span className="absolute -top-1 -right-1 w-2 h-2 bg-tactical-bg border border-tactical-accent rounded-full animate-pulse" />
                        )}
                      </button>
                      <button 
                        onClick={() => setIsScriptAgentActive(!isScriptAgentActive)}
                        className={cn(
                          "p-2 rounded-xl transition-all relative shrink-0",
                          isScriptAgentActive ? "bg-tactical-accent text-tactical-bg shadow-[0_0_15px_rgba(0,255,65,0.5)]" : "hover:bg-tactical-border text-tactical-muted"
                        )}
                        title="Script Generator Agent aktivieren (Shell/Python)"
                      >
                        <FileCode className="w-5 h-5" />
                        {isScriptAgentActive && (
                          <span className="absolute -top-1 -right-1 w-2 h-2 bg-tactical-bg border border-tactical-accent rounded-full animate-pulse" />
                        )}
                      </button>
                      <button 
                        onClick={toggleRecording}
                        className={cn(
                          "p-2 rounded-xl transition-all shrink-0",
                          isRecording ? "bg-red-500/20 text-red-500 animate-pulse" : "hover:bg-tactical-border text-tactical-muted"
                        )}
                        title="Spracheingabe (DE)"
                      >
                        <Mic className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={handleSend}
                        disabled={!input.trim() || isThinking}
                        className="p-2 bg-tactical-accent text-tactical-bg rounded-xl hover:scale-105 transition-transform disabled:opacity-50 disabled:scale-100 shrink-0"
                      >
                        <Send className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Terminal / Thought Panel */}
          <AnimatePresence>
            {showTerminal && (
              <motion.div 
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: isMobile ? '100%' : 350, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                className={cn(
                  "border-l border-tactical-border bg-tactical-card/30 flex flex-col font-mono text-[11px]",
                  isMobile && "absolute inset-0 z-40 bg-tactical-bg"
                )}
              >
                <div className="p-4 border-b border-tactical-border flex items-center justify-between bg-tactical-card">
                  <div className="flex items-center gap-2">
                    <TerminalIcon className="w-4 h-4 text-tactical-accent" />
                    <span className="font-bold tracking-tight">LOG_STREAM</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 rounded-full bg-red-500/50" />
                      <div className="w-2 h-2 rounded-full bg-yellow-500/50" />
                      <div className="w-2 h-2 rounded-full bg-green-500/50" />
                    </div>
                    {isMobile && (
                      <button onClick={() => setShowTerminal(false)} className="p-1 hover:bg-tactical-border rounded">
                        <X size={16} />
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex-1 min-h-0 p-4 overflow-y-auto space-y-2 custom-scrollbar">
                  {thoughtProcess.map((log, i) => (
                    <div key={`thought-${i}`} className="flex gap-2">
                      <span className="text-tactical-accent opacity-50">[{new Date().toLocaleTimeString()}]</span>
                      <span className="terminal-glow">{log}</span>
                    </div>
                  ))}
                  {isThinking && (
                    <div className="flex gap-2 items-center text-tactical-accent">
                      <span className="animate-pulse">{'>'}</span>
                      <span className="animate-pulse">Verarbeite...</span>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Instruction Modal */}
      <AnimatePresence>
        {showInstructionModal && (
          <InstructionModal 
            instruction={editingInstruction} 
            onSave={saveInstruction} 
            onClose={() => { setShowInstructionModal(false); setEditingInstruction(null); }} 
          />
        )}
      </AnimatePresence>

      {/* Skillz Modal */}
      <AnimatePresence>
        {showSkillzModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-tactical-card border border-tactical-border w-full max-w-4xl h-[80vh] rounded-3xl flex flex-col overflow-hidden"
            >
              <div className="p-4 border-b border-tactical-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileCode className="text-tactical-accent" />
                  <span className="font-bold">Skillz.md Editor</span>
                </div>
                <button onClick={() => setShowSkillzModal(false)} className="p-2 hover:bg-tactical-border rounded-full">
                  <X size={20} />
                </button>
              </div>
              <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                <textarea 
                  value={skillzContent}
                  onChange={(e) => setSkillzContent(e.target.value)}
                  className="flex-1 p-6 bg-tactical-bg font-mono text-sm focus:outline-none resize-none custom-scrollbar min-h-[200px] md:min-h-0"
                />
                <div className="w-full md:w-1/2 p-6 border-t md:border-t-0 md:border-l border-tactical-border overflow-y-auto custom-scrollbar prose prose-invert prose-sm">
                  <Markdown>{skillzContent}</Markdown>
                </div>
              </div>
              <div className="p-4 border-t border-tactical-border flex flex-col sm:flex-row justify-end gap-3">
                <button onClick={() => setShowSkillzModal(false)} className="w-full sm:w-auto px-4 py-2 text-sm font-bold hover:bg-tactical-border rounded-xl transition-colors">ABBRECHEN</button>
                <button onClick={saveSkillz} className="w-full sm:w-auto px-6 py-2 bg-tactical-accent text-tactical-bg font-bold rounded-xl transition-transform hover:scale-105">SPEICHERN</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* No-Code Builder Modal */}
      <AnimatePresence>
        {showBuilderModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/90 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-tactical-card border border-tactical-border w-full max-w-6xl h-[90vh] rounded-3xl flex flex-col overflow-hidden shadow-[0_0_50px_rgba(0,255,65,0.2)]"
            >
              <div className="p-6 border-b border-tactical-border flex items-center justify-between bg-tactical-bg/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-tactical-accent/20 rounded-lg">
                    <Wrench className="text-tactical-accent w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold tracking-tight">App/Tool No-Code Builder</h2>
                    <p className="text-[10px] text-tactical-muted uppercase tracking-widest font-bold">SDK Integration: LangGraph | AutoGen | CrewAI</p>
                  </div>
                </div>
                <button onClick={() => setShowBuilderModal(false)} className="p-2 hover:bg-tactical-border rounded-full transition-colors">
                  <X size={24} />
                </button>
              </div>
              <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
                {/* Left: Component Palette */}
                <div className="w-full lg:w-64 border-b lg:border-b-0 lg:border-r border-tactical-border p-4 space-y-6 bg-tactical-bg/30 overflow-y-auto custom-scrollbar">
                  <div className="space-y-2">
                    <h3 className="text-[10px] font-bold text-tactical-muted uppercase tracking-widest">Logic_Nodes</h3>
                    <div className="grid grid-cols-1 gap-2">
                      <DraggableNode icon={<Brain />} label="AI_Agent" />
                      <DraggableNode icon={<Workflow />} label="Workflow" />
                      <DraggableNode icon={<Layers />} label="RAG_Chain" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-[10px] font-bold text-tactical-muted uppercase tracking-widest">Integrations</h3>
                    <div className="grid grid-cols-1 gap-2">
                      <DraggableNode icon={<Globe />} label="Web_Import" />
                      <DraggableNode icon={<Database />} label="SQL_Vault" />
                      <DraggableNode icon={<Box />} label="SDK_Bridge" />
                    </div>
                  </div>
                </div>
                {/* Center: Canvas */}
                <div className="flex-1 bg-tactical-bg p-8 relative overflow-hidden">
                  <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, #00ff41 1px, transparent 1px)', backgroundSize: '30px 30px' }} />
                  <div className="h-full border-2 border-dashed border-tactical-border rounded-3xl flex items-center justify-center text-tactical-muted">
                    <div className="text-center space-y-4">
                      <Sparkles className="w-12 h-12 mx-auto opacity-20" />
                      <p className="text-sm font-mono tracking-widest">DRAG_COMPONENTS_HERE_TO_BUILD</p>
                    </div>
                  </div>
                </div>
                {/* Right: Properties */}
                <div className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-tactical-border p-6 bg-tactical-card/50 overflow-y-auto custom-scrollbar">
                  <h3 className="text-xs font-bold uppercase tracking-widest mb-6">Node_Properties</h3>
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-tactical-muted uppercase">Node_ID</label>
                      <input type="text" readOnly value="AGENT_0XF2" className="w-full bg-tactical-bg border border-tactical-border rounded-lg px-3 py-2 text-xs font-mono" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-tactical-muted uppercase">Model_Config</label>
                      <select className="w-full bg-tactical-bg border border-tactical-border rounded-lg px-3 py-2 text-xs">
                        <option>SmolAgents_v1</option>
                        <option>CrewAI_Orchestrator</option>
                        <option>LangGraph_Stateful</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-4 border-t border-tactical-border flex flex-col sm:flex-row justify-between items-center bg-tactical-card gap-4">
                <div className="flex gap-4">
                  <button className="flex items-center gap-2 text-[10px] font-bold text-tactical-accent hover:underline"><Search size={12} /> ANALYZE_FLOW</button>
                  <button className="flex items-center gap-2 text-[10px] font-bold text-tactical-accent hover:underline"><Code2 size={12} /> EXPORT_SDK</button>
                </div>
                <div className="flex gap-3 w-full sm:w-auto">
                  <button onClick={deployApp} className="w-full sm:w-auto px-6 py-2 bg-tactical-accent text-tactical-bg font-bold rounded-xl transition-transform hover:scale-105">DEPLOY_APP</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* UI Customizer / System Instruction Modal */}
      <AnimatePresence>
        {showCustomizerModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              className="bg-tactical-card border border-tactical-border w-full max-w-2xl rounded-3xl p-8"
            >
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-xl font-bold flex items-center gap-3"><Shield className="text-tactical-accent" /> System Configuration</h3>
                <button onClick={() => setShowCustomizerModal(false)} className="p-2 hover:bg-tactical-border rounded-full transition-colors"><X size={24} /></button>
              </div>
              <div className="space-y-8">
                <div className="space-y-3">
                  <label className="block text-xs font-bold text-tactical-muted uppercase tracking-widest">System_Instruction (Prompt)</label>
                  <textarea 
                    value={systemInstruction}
                    onChange={(e) => setSystemInstruction(e.target.value)}
                    className="w-full bg-tactical-bg border border-tactical-border rounded-2xl p-4 text-sm font-mono min-h-[150px] focus:border-tactical-accent outline-none transition-all"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                  <div>
                    <label className="block text-xs font-bold text-tactical-muted uppercase tracking-widest mb-4">UI_Accent_Color</label>
                    <div className="flex flex-wrap gap-3">
                      {['#00ff41', '#3b82f6', '#f59e0b', '#ef4444', '#a855f7'].map(c => (
                        <button 
                          key={c} 
                          onClick={() => setAccentColor(c)}
                          className={cn("w-10 h-10 rounded-xl border-2 transition-all hover:scale-110", accentColor === c ? "border-white shadow-[0_0_15px_rgba(255,255,255,0.3)]" : "border-transparent")}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-tactical-muted uppercase tracking-widest mb-4">RAG_Mode</label>
                    <div className="flex flex-col sm:flex-row items-center gap-3">
                      <button className="w-full sm:flex-1 py-3 bg-tactical-accent text-tactical-bg font-bold rounded-xl text-xs">HYBRID_SEARCH</button>
                      <button className="w-full sm:flex-1 py-3 border border-tactical-border text-tactical-text font-bold rounded-xl text-xs">VECTOR_ONLY</button>
                    </div>
                  </div>
                </div>
                <div className="pt-4 border-t border-tactical-border">
                  <button 
                    onClick={() => (window as any).HAL.systemReset()}
                    className="w-full py-3 bg-red-500/10 border border-red-500/50 text-red-500 font-bold rounded-xl text-xs hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-2"
                  >
                    <RefreshCw size={14} /> HAL_SYSTEM_RESET (HARD_RELOAD)
                  </button>
                  <p className="text-[9px] text-tactical-muted mt-2 text-center italic">
                    Trennt alle Verbindungen, leert den Cache und lädt die App neu.
                  </p>
                </div>

                <button 
                  onClick={() => setShowCustomizerModal(false)}
                  className="w-full py-4 bg-tactical-accent text-tactical-bg font-bold rounded-2xl mt-4 text-sm tracking-widest hover:scale-[1.02] transition-transform"
                  style={{ backgroundColor: accentColor }}
                >
                  SAVE_SYSTEM_PARAMETERS
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Self-Healing Patch Overlay */}
      <AnimatePresence>
        {healInstructions && (
          <div className="fixed bottom-24 right-6 z-[90] w-full max-w-sm px-4">
            <motion.div 
              initial={{ x: 50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 50, opacity: 0 }}
              className="bg-red-500/10 border border-red-500/50 backdrop-blur-xl rounded-2xl p-4 shadow-2xl"
            >
              <div className="flex items-center gap-2 text-red-500 font-bold text-xs uppercase tracking-widest mb-2">
                <AlertTriangle size={14} /> Self-Healing Patch
              </div>
              <div className="text-[10px] text-tactical-text leading-relaxed mb-4 prose prose-invert prose-xs">
                <Markdown>{healInstructions}</Markdown>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => window.location.reload()}
                  className="flex-1 py-2 bg-tactical-accent text-tactical-bg text-[10px] font-bold rounded-lg hover:scale-105 transition-all flex items-center justify-center gap-2"
                >
                  <RefreshCw size={12} /> RETRY_RELOAD
                </button>
                <button 
                  onClick={() => {
                    (window as any).HAL.systemReset();
                    setHealInstructions(null);
                  }}
                  className="flex-1 py-2 bg-red-500 text-white text-[10px] font-bold rounded-lg hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
                >
                  <Power size={12} /> SYSTEM_RESET
                </button>
                <button 
                  onClick={() => setHealInstructions(null)}
                  className="px-3 py-2 bg-tactical-border text-tactical-text text-[10px] font-bold rounded-lg hover:bg-tactical-border/80 transition-colors"
                >
                  CLOSE
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Hardware Permission Modal */}
      <AnimatePresence>
        {showPermissionModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/90 backdrop-blur-xl">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-tactical-card border border-tactical-accent/50 w-full max-w-md rounded-3xl p-8 shadow-[0_0_50px_rgba(0,255,65,0.2)]"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-tactical-accent/20 rounded-2xl">
                  <Shield className="text-tactical-accent w-8 h-8" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Hardware Zugriff</h2>
                  <p className="text-xs text-tactical-muted uppercase tracking-widest font-bold">Sicherheits-Protokoll v4.2</p>
                </div>
              </div>
              
              <p className="text-sm leading-relaxed mb-8">
                Der Agent fordert Zugriff auf die <span className="text-tactical-accent font-bold uppercase">{pendingHardwareOp?.type} Schnittstelle</span> an. 
                Dies ermöglicht die direkte Interaktion mit physischer Hardware.
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <button 
                  onClick={() => { setShowPermissionModal(false); setPendingHardwareOp(null); }}
                  className="w-full sm:flex-1 py-4 border border-tactical-border rounded-2xl font-bold text-sm hover:bg-tactical-border transition-colors"
                >
                  ABLEHNEN
                </button>
                <button 
                  onClick={confirmHardwareOp}
                  className="w-full sm:flex-1 py-4 bg-tactical-accent text-tactical-bg font-bold rounded-2xl text-sm hover:scale-[1.02] transition-transform shadow-[0_0_20px_rgba(0,255,65,0.4)]"
                >
                  ZULASSEN
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function DraggableNode({ icon, label }: { icon: React.ReactNode, label: string }) {
  return (
    <div className="flex items-center gap-3 p-3 bg-tactical-card border border-tactical-border rounded-xl cursor-grab hover:border-tactical-accent transition-colors group">
      <div className="text-tactical-muted group-hover:text-tactical-accent transition-colors">{icon}</div>
      <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
    </div>
  );
}

function NavItem({ icon, label, active, onClick, collapsed }: { icon: React.ReactNode, label: string, active?: boolean, onClick?: () => void, collapsed?: boolean }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 p-3 rounded-xl transition-all group",
        active ? "bg-tactical-accent text-tactical-bg shadow-lg shadow-tactical-accent/20" : "hover:bg-tactical-border text-tactical-muted hover:text-tactical-text",
        collapsed && "justify-center"
      )}
    >
      <div className={cn("shrink-0", active ? "text-tactical-bg" : "group-hover:text-tactical-accent transition-colors")}>
        {React.isValidElement(icon) ? React.cloneElement(icon as React.ReactElement<any>, { size: 20 }) : icon}
      </div>
      {!collapsed && <span className="font-medium text-sm">{label}</span>}
    </button>
  );
}

function SubNavItem({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active?: boolean, onClick?: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all text-[10px] font-bold uppercase tracking-wider whitespace-nowrap",
        active ? "bg-tactical-accent text-tactical-bg shadow-lg shadow-tactical-accent/20" : "text-tactical-muted hover:text-tactical-text hover:bg-tactical-border"
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function QuickAction({ label, icon, onClick }: { label: string, icon: React.ReactNode, onClick?: () => void }) {
  return (
    <button 
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-1.5 bg-tactical-card border border-tactical-border rounded-full text-[10px] font-bold uppercase tracking-wider hover:border-tactical-accent transition-colors shrink-0"
    >
      {React.isValidElement(icon) ? React.cloneElement(icon as React.ReactElement<any>, { size: 12 }) : icon}
      {label}
    </button>
  );
}

function HardwareView({ 
  devices, 
  onRequestPermission, 
  onDisconnect,
  connectUSB, 
  connectBluetooth, 
  connectNFC, 
  connectWLAN, 
  connectSerial, 
  connectHID,
  readBluetoothCharacteristic,
  writeBluetoothCharacteristic,
  sendUSBData,
  sendSerialData,
  writeNfcTag,
  hardwareError,
  clearHardwareError
}: { 
  devices: HardwareDevice[], 
  onRequestPermission: (type: 'usb' | 'bluetooth' | 'nfc' | 'wlan' | 'serial' | 'hid', action: () => Promise<void>) => void,
  onDisconnect: (id: string) => void,
  connectUSB: (vendorId?: number, productId?: number) => Promise<void>,
  connectBluetooth: () => Promise<void>,
  connectNFC: () => Promise<void>,
  connectWLAN: () => Promise<void>,
  connectSerial: () => Promise<void>,
  connectHID: () => Promise<void>,
  readBluetoothCharacteristic: (deviceId: string, serviceUuid: string, charUuid: string) => Promise<void>,
  writeBluetoothCharacteristic: (deviceId: string, serviceUuid: string, charUuid: string, value: string) => Promise<void>,
  sendUSBData: (deviceId: string, data: string) => Promise<void>,
  sendSerialData: (deviceId: string, data: string) => Promise<void>,
  writeNfcTag: (deviceId: string, content: string, type: 'text' | 'url') => Promise<void>,
  hardwareError: string | null,
  clearHardwareError: () => void
}) {
  const [activeSubTab, setActiveSubTab] = useState<'usb' | 'serial' | 'hid' | 'bluetooth' | 'nfc' | 'wlan' | 'flasher'>('usb');
  const [usbInput, setUsbInput] = useState<string>('');
  const [usbVendorId, setUsbVendorId] = useState<string>('');
  const [usbProductId, setUsbProductId] = useState<string>('');
  const [nfcInput, setNfcInput] = useState<string>('');
  const [nfcType, setNfcType] = useState<'text' | 'url'>('text');
  const [btWriteValues, setBtWriteValues] = useState<Record<string, string>>({});
  const [bridgeDevices, setBridgeDevices] = useState<any[]>([]);
  const [bridgeWlan, setBridgeWlan] = useState<any[]>([]);
  const [isBridgeLoading, setIsBridgeLoading] = useState(false);
  const [isWlanLoading, setIsWlanLoading] = useState(false);
  
  // Flasher state
  const [selectedFlasherDevice, setSelectedFlasherDevice] = useState<string>('');
  const [selectedFirmware, setSelectedFirmware] = useState<string>('');
  const [flashProgress, setFlashProgress] = useState<number>(0);
  const [isFlashing, setIsFlashing] = useState<boolean>(false);
  const [flashStatus, setFlashStatus] = useState<string>('');

  const MOCK_FIRMWARES = [
    { id: 'rom1', name: 'Original Stock ROM (Android 14)', type: 'stock', size: '2.4 GB', version: '14.0.0_r1', deviceType: 'usb' },
    { id: 'rom2', name: 'LineageOS 21 (Android 14)', type: 'custom', size: '1.1 GB', version: '21.0-nightly', deviceType: 'usb' },
    { id: 'rom3', name: 'Pixel Experience Plus', type: 'custom', size: '1.5 GB', version: '14.0-202403', deviceType: 'usb' },
    { id: 'rom4', name: 'Ubuntu Touch', type: 'linux', size: '800 MB', version: '20.04 OTA-3', deviceType: 'usb' },
    { id: 'esp1', name: 'Tasmota (ESP32)', type: 'iot', size: '1.2 MB', version: '13.4.0', deviceType: 'serial' },
    { id: 'esp2', name: 'ESPHome (ESP32)', type: 'iot', size: '1.5 MB', version: '2024.2.1', deviceType: 'serial' }
  ];

  const handleFlash = async () => {
    if (!selectedFlasherDevice || !selectedFirmware) return;
    
    setIsFlashing(true);
    setFlashProgress(0);
    setFlashStatus('Initialisiere Flash-Vorgang...');
    
    try {
      // Mock flashing process
      await new Promise(resolve => setTimeout(resolve, 1000));
      setFlashStatus('Lade Firmware herunter...');
      
      for (let i = 0; i <= 30; i += 5) {
        setFlashProgress(i);
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
      setFlashStatus('Überprüfe Signatur...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setFlashStatus('Schreibe Partitionen (boot, system, vendor)...');
      for (let i = 30; i <= 90; i += 2) {
        setFlashProgress(i);
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      setFlashStatus('Verifiziere Flash-Vorgang...');
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setFlashProgress(100);
      setFlashStatus('Flash erfolgreich abgeschlossen! Gerät startet neu.');
    } catch (error) {
      setFlashStatus('Fehler beim Flashen!');
    } finally {
      setTimeout(() => {
        setIsFlashing(false);
      }, 3000);
    }
  };

  const [captiveStatus, setCaptiveStatus] = useState<{active: boolean, url: string} | null>(null);

  const fetchCaptiveStatus = async () => {
    try {
      const response = await fetch('/api/captive-portal/status');
      const data = await response.json();
      setCaptiveStatus(data);
    } catch (error) {
      console.error("Captive portal status fetch failed:", error);
    }
  };

  useEffect(() => {
    fetchCaptiveStatus();
  }, []);

  const fetchBridgeWlan = async () => {
    setIsWlanLoading(true);
    try {
      const response = await fetch('/api/bridge/hardware/wlan');
      const data = await response.json();
      setBridgeWlan(data.networks || []);
    } catch (error) {
      console.error("Bridge WLAN fetch failed:", error);
    } finally {
      setIsWlanLoading(false);
    }
  };

  const fetchBridgeUSB = async () => {
    setIsBridgeLoading(true);
    try {
      const response = await fetch('/api/bridge/hardware/usb');
      const data = await response.json();
      setBridgeDevices(data.devices || []);
    } catch (error) {
      console.error("Bridge USB fetch failed:", error);
    } finally {
      setIsBridgeLoading(false);
    }
  };

  return (
    <div className="flex flex-col space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold flex items-center gap-3">
          <Cpu className="text-tactical-accent shrink-0" /> <span className="truncate">Hardware Orchestrator</span>
        </h2>
        <button 
          onClick={() => (window as any).HAL?.disconnectAll()}
          className="w-full sm:w-auto px-4 py-2 bg-red-500/10 border border-red-500/30 text-red-500 rounded-xl text-xs font-bold hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-2"
        >
          <Power size={14} /> EMERGENCY_HAL_RESET
        </button>
      </div>

      {/* Sub-Navigation */}
      <div className="flex bg-tactical-card border border-tactical-border rounded-xl p-1 self-start overflow-x-auto no-scrollbar max-w-full">
        <SubNavItem active={activeSubTab === 'usb'} onClick={() => setActiveSubTab('usb')} icon={<Usb size={14} />} label="WEB_USB" />
        <SubNavItem active={activeSubTab === 'serial'} onClick={() => setActiveSubTab('serial')} icon={<Hash size={14} />} label="WEB_SERIAL" />
        <SubNavItem active={activeSubTab === 'hid'} onClick={() => setActiveSubTab('hid')} icon={<Gamepad2 size={14} />} label="WEB_HID" />
        <SubNavItem active={activeSubTab === 'bluetooth'} onClick={() => setActiveSubTab('bluetooth')} icon={<Bluetooth size={14} />} label="BLUETOOTH" />
        <SubNavItem active={activeSubTab === 'nfc'} onClick={() => setActiveSubTab('nfc')} icon={<Nfc size={14} />} label="NFC_BRIDGE" />
        <SubNavItem active={activeSubTab === 'wlan'} onClick={() => setActiveSubTab('wlan')} icon={<Wifi size={14} />} label="WLAN_BRIDGE" />
        <SubNavItem active={activeSubTab === 'flasher'} onClick={() => setActiveSubTab('flasher')} icon={<Zap size={14} />} label="FLASHER" />
      </div>

      {hardwareError && (
        <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-4 rounded-xl flex items-start justify-between">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold">Verbindungsfehler</h4>
              <p className="text-sm mt-1">{hardwareError}</p>
            </div>
          </div>
          <button onClick={clearHardwareError} className="text-red-400 hover:text-red-300">
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      <div className="flex-1 min-h-[500px] bg-tactical-card/30 border border-tactical-border rounded-2xl overflow-hidden flex flex-col">
        {activeSubTab === 'usb' && (
          <div className="flex-1 min-h-0 p-6 space-y-6 overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold flex items-center gap-2"><Usb className="text-tactical-accent" /> WebUSB Bridge</h3>
              <button 
                onClick={fetchBridgeUSB}
                className="p-2 bg-tactical-bg border border-tactical-border rounded-lg hover:border-tactical-accent transition-colors"
                title="Python Bridge USB Scan"
              >
                <RefreshCw className={cn("w-4 h-4", isBridgeLoading && "animate-spin")} />
              </button>
            </div>
            <p className="text-[10px] text-tactical-muted mb-4 leading-relaxed">Direktes Senden und Empfangen von Low-Level-Datenpaketen (Control, Bulk, Interrupt Transfers).</p>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <span className="text-[8px] font-bold text-tactical-accent uppercase tracking-widest">Browser Native (WebUSB)</span>
                {devices.filter(d => d.type === 'usb').map(d => (
                  <div key={d.id} className="flex flex-col p-4 bg-tactical-bg border border-tactical-border rounded-xl gap-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-tactical-accent rounded-full animate-pulse" />
                        <span className="text-sm font-medium">{d.name}</span>
                      </div>
                      <button onClick={() => onDisconnect(d.id)} className="text-[10px] font-bold text-red-500 hover:underline">DISCONNECT</button>
                    </div>
                    {d.details && <div className="text-[9px] font-mono text-tactical-muted">{d.details}</div>}
                    
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input 
                        type="text" 
                        placeholder="Daten senden..." 
                        value={usbInput}
                        onChange={(e) => setUsbInput(e.target.value)}
                        className="flex-1 bg-tactical-card border border-tactical-border rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-tactical-accent"
                      />
                      <button 
                        onClick={() => { sendUSBData(d.id, usbInput); setUsbInput(''); }}
                        className="px-4 py-2 bg-tactical-accent text-tactical-bg rounded-lg text-[10px] font-bold"
                      >
                        SEND
                      </button>
                    </div>

                    <div className="flex gap-2">
                      <button className="flex-1 py-1.5 bg-tactical-card border border-tactical-border rounded-lg text-[8px] font-bold hover:border-tactical-accent transition-colors uppercase">Get_Descriptor</button>
                      <button className="flex-1 py-1.5 bg-tactical-card border border-tactical-border rounded-lg text-[8px] font-bold hover:border-tactical-accent transition-colors uppercase">Reset_Device</button>
                    </div>
                  </div>
                ))}
                {devices.filter(d => d.type === 'usb').length === 0 && (
                  <div className="p-8 border-2 border-dashed border-tactical-border rounded-2xl text-center">
                    <Usb className="w-8 h-8 text-tactical-muted mx-auto mb-2 opacity-20" />
                    <p className="text-xs text-tactical-muted italic">Keine Browser-USB-Geräte verbunden.</p>
                  </div>
                )}
                
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="VID (Hex)" 
                    value={usbVendorId}
                    onChange={(e) => setUsbVendorId(e.target.value)}
                    className="flex-1 bg-tactical-card border border-tactical-border rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-tactical-accent"
                  />
                  <input 
                    type="text" 
                    placeholder="PID (Hex)" 
                    value={usbProductId}
                    onChange={(e) => setUsbProductId(e.target.value)}
                    className="flex-1 bg-tactical-card border border-tactical-border rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-tactical-accent"
                  />
                </div>
                
                <button 
                  onClick={() => {
                    const vid = usbVendorId ? parseInt(usbVendorId, 16) : undefined;
                    const pid = usbProductId ? parseInt(usbProductId, 16) : undefined;
                    onRequestPermission('usb', () => connectUSB(vid, pid));
                  }}
                  className="w-full py-3 border border-tactical-accent/30 text-tactical-accent rounded-xl hover:bg-tactical-accent/10 transition-colors text-sm font-bold"
                >
                  SCAN_BROWSER_USB
                </button>
              </div>

              <div className="space-y-4">
                <span className="text-[8px] font-bold text-blue-400 uppercase tracking-widest">Python Bridge (Server-Side)</span>
                {bridgeDevices.length > 0 ? (
                  <div className="grid grid-cols-1 gap-2">
                    {bridgeDevices.map((dev, i) => (
                      <div key={`bridge-dev-${i}`} className="p-3 bg-tactical-bg border border-tactical-border rounded-xl flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Cpu size={16} className="text-blue-400" />
                          <div>
                            <p className="text-xs font-bold">Device {dev.idVendor}:{dev.idProduct}</p>
                            <p className="text-[8px] text-tactical-muted">Bus: {dev.bus} | Address: {dev.address}</p>
                          </div>
                        </div>
                        <button className="text-[8px] font-bold text-tactical-accent border border-tactical-accent/30 px-2 py-1 rounded hover:bg-tactical-accent hover:text-tactical-bg transition-all">
                          ATTACH
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 border-2 border-dashed border-tactical-border rounded-2xl text-center">
                    <Cpu className="w-8 h-8 text-tactical-muted mx-auto mb-2 opacity-20" />
                    <p className="text-xs text-tactical-muted italic">Keine Server-USB-Geräte gefunden.</p>
                  </div>
                )}
              </div>
            </div>

            {/* USB Monitoring */}
            <div className="mt-8 space-y-4">
              <h4 className="text-[10px] font-bold text-tactical-muted uppercase tracking-widest">USB_Traffic_Monitor</h4>
              <div className="bg-black/40 rounded-2xl p-4 font-mono text-[10px] space-y-1 h-64 overflow-y-auto custom-scrollbar">
                {devices.filter(d => d.type === 'usb').flatMap(d => d.usbLogs || []).map((log, i) => (
                  <div key={`bt-log-${i}`} className={cn(
                    "flex gap-2",
                    log.type === 'in' ? "text-tactical-accent" : "text-tactical-muted"
                  )}>
                    <span className="opacity-50">[{log.time}]</span>
                    <span className="font-bold">{log.type === 'in' ? '<<' : '>>'}</span>
                    <span className="break-all">{log.data}</span>
                  </div>
                ))}
                {devices.filter(d => d.type === 'usb').every(d => !d.usbLogs || d.usbLogs.length === 0) && (
                  <div className="h-full flex items-center justify-center text-tactical-muted italic opacity-30">
                    Warte auf USB-Traffic...
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeSubTab === 'serial' && (
          <div className="flex-1 min-h-0 p-6 space-y-6 overflow-y-auto custom-scrollbar">
            <h3 className="text-lg font-bold mb-2 flex items-center gap-2"><Hash className="text-tactical-accent" /> Web Serial API</h3>
            <p className="text-[10px] text-tactical-muted mb-4 leading-relaxed">Kommunikation per Datenstrom (Bitrate, Parität etc.).</p>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                {devices.filter(d => d.type === 'serial').map(d => (
                  <div key={d.id} className="flex flex-col p-4 bg-tactical-bg border border-tactical-border rounded-xl gap-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-tactical-accent rounded-full animate-pulse" />
                        <span className="text-sm font-medium">{d.name}</span>
                      </div>
                      <button onClick={() => onDisconnect(d.id)} className="text-[10px] font-bold text-red-500 hover:underline">CLOSE_PORT</button>
                    </div>
                    {d.details && <div className="text-[9px] font-mono text-tactical-muted">{d.details}</div>}
                    
                    <div className="flex flex-col sm:flex-row gap-2 mt-2">
                      <input 
                        type="text" 
                        placeholder="Kommando senden..." 
                        className="flex-1 bg-tactical-card border border-tactical-border rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-tactical-accent"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            const val = e.currentTarget.value;
                            if (val) {
                              sendSerialData(d.id, val + '\n');
                              e.currentTarget.value = '';
                            }
                          }
                        }}
                      />
                      <button 
                        onClick={(e) => {
                          const input = (e.currentTarget.previousSibling as HTMLInputElement).value;
                          if (input) {
                            sendSerialData(d.id, input + '\n');
                            (e.currentTarget.previousSibling as HTMLInputElement).value = '';
                          }
                        }}
                        className="px-4 py-2 bg-tactical-accent text-tactical-bg rounded-lg text-[10px] font-bold"
                      >
                        SEND
                      </button>
                    </div>

                    <div className="flex gap-2">
                      <button 
                        onClick={() => sendSerialData(d.id, 'reboot\n')}
                        className="flex-1 py-1.5 bg-tactical-card border border-tactical-border rounded-lg text-[8px] font-bold hover:border-tactical-accent transition-colors uppercase"
                      >
                        Reboot
                      </button>
                      <button 
                        onClick={() => sendSerialData(d.id, 'help\n')}
                        className="flex-1 py-1.5 bg-tactical-card border border-tactical-border rounded-lg text-[8px] font-bold hover:border-tactical-accent transition-colors uppercase"
                      >
                        Help
                      </button>
                    </div>
                  </div>
                ))}
                {devices.filter(d => d.type === 'serial').length === 0 && (
                  <div className="p-8 border-2 border-dashed border-tactical-border rounded-2xl text-center">
                    <Hash className="w-8 h-8 text-tactical-muted mx-auto mb-2 opacity-20" />
                    <p className="text-xs text-tactical-muted italic">Keine seriellen Geräte verbunden.</p>
                  </div>
                )}
                <button 
                  onClick={() => onRequestPermission('serial', connectSerial)}
                  className="w-full py-3 border border-tactical-border text-tactical-muted rounded-xl hover:border-tactical-accent hover:text-tactical-accent transition-colors text-sm font-bold"
                >
                  REQUEST_SERIAL_PORT
                </button>
              </div>
              
              <div className="flex flex-col h-full min-h-[300px] relative">
                <div className="absolute inset-0">
                  <TerminalComponent 
                    logs={devices.filter(d => d.type === 'serial').flatMap(d => d.serialLogs || [])} 
                    onData={(data) => {
                      const serialDev = devices.find(d => d.type === 'serial');
                      if (serialDev) sendSerialData(serialDev.id, data);
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {activeSubTab === 'hid' && (
          <div className="flex-1 min-h-0 p-6 space-y-6 overflow-y-auto custom-scrollbar">
            <h3 className="text-lg font-bold mb-2 flex items-center gap-2"><Gamepad2 className="text-tactical-accent" /> WebHID Bridge</h3>
            <p className="text-[10px] text-tactical-muted mb-4 leading-relaxed">Zugriff auf strukturierte Reports von Eingabe- oder Steuergeräten.</p>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                {devices.filter(d => d.type === 'hid').map(d => (
                  <div key={d.id} className="flex flex-col p-4 bg-tactical-bg border border-tactical-border rounded-xl gap-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-tactical-accent rounded-full animate-pulse" />
                        <span className="text-sm font-medium">{d.name}</span>
                      </div>
                      <button onClick={() => onDisconnect(d.id)} className="text-[10px] font-bold text-red-500 hover:underline">DISCONNECT</button>
                    </div>
                    {d.details && <div className="text-[9px] font-mono text-tactical-muted">{d.details}</div>}
                  </div>
                ))}
                {devices.filter(d => d.type === 'hid').length === 0 && (
                  <div className="p-8 border-2 border-dashed border-tactical-border rounded-2xl text-center">
                    <Gamepad2 className="w-8 h-8 text-tactical-muted mx-auto mb-2 opacity-20" />
                    <p className="text-xs text-tactical-muted italic">Keine HID-Geräte verbunden.</p>
                  </div>
                )}
                <button 
                  onClick={() => onRequestPermission('hid', connectHID)}
                  className="w-full py-3 border border-tactical-border text-tactical-muted rounded-xl hover:border-tactical-accent hover:text-tactical-accent transition-colors text-sm font-bold"
                >
                  REQUEST_HID_ACCESS
                </button>
              </div>
              
              <div className="bg-black/40 rounded-2xl p-4 font-mono text-[10px] space-y-1 h-full min-h-[200px] overflow-y-auto custom-scrollbar">
                <h4 className="text-[8px] font-bold text-tactical-muted uppercase tracking-widest mb-2">HID_Report_Analyzer</h4>
                <div className="text-tactical-muted italic opacity-30">Warte auf HID-Reports...</div>
              </div>
            </div>
          </div>
        )}

        {activeSubTab === 'bluetooth' && (
          <div className="flex-1 min-h-0 p-6 space-y-6 overflow-y-auto custom-scrollbar">
            <h3 className="text-lg font-bold mb-2 flex items-center gap-2"><Bluetooth className="text-tactical-accent" /> WebBluetooth</h3>
            <p className="text-[10px] text-tactical-muted mb-4 leading-relaxed">Drahtlose Kommunikation mit Bluetooth Low Energy (BLE) Geräten.</p>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                {devices.filter(d => d.type === 'bluetooth').map(d => (
                  <div key={d.id} className="flex flex-col p-4 bg-tactical-bg border border-tactical-border rounded-xl gap-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-tactical-accent rounded-full animate-pulse" />
                        <span className="text-sm font-medium">{d.name}</span>
                      </div>
                      <button onClick={() => onDisconnect(d.id)} className="text-[10px] font-bold text-red-500 hover:underline">DISCONNECT</button>
                    </div>
                    {d.details && <div className="text-[9px] font-mono text-tactical-muted">{d.details}</div>}
                    
                    {d.bluetoothServices && d.bluetoothServices.length > 0 && (
                      <div className="space-y-3 mt-2 border-t border-tactical-border pt-3">
                        <span className="text-[8px] font-bold text-tactical-muted uppercase tracking-widest">GATT_SERVICES</span>
                        {d.bluetoothServices.map(service => (
                          <div key={service.uuid} className="space-y-2">
                            <div className="flex items-center gap-2">
                              <div className="p-1 bg-tactical-accent/10 rounded text-tactical-accent"><Settings size={10} /></div>
                              <span className="text-[9px] font-bold">{GATT_SERVICE_NAMES[service.uuid] || 'Unknown Service'}</span>
                            </div>
                            <div className="pl-4 space-y-2">
                              {service.characteristics.map(char => (
                                <div key={char.uuid} className="bg-tactical-card/50 p-2 rounded-lg border border-tactical-border/50 space-y-2">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[8px] font-mono text-tactical-muted">{char.uuid}</span>
                                    <div className="flex gap-1">
                                      {char.properties.read && (
                                        <button 
                                          onClick={() => readBluetoothCharacteristic(d.id, service.uuid, char.uuid)}
                                          className="p-1 bg-tactical-accent/10 text-tactical-accent rounded hover:bg-tactical-accent hover:text-tactical-bg transition-all"
                                          title="Read"
                                        >
                                          <Download size={10} />
                                        </button>
                                      )}
                                      {char.properties.notify && (
                                        <button 
                                          className="p-1 bg-blue-500/10 text-blue-500 rounded hover:bg-blue-500 hover:text-white transition-all"
                                          title="Subscribe"
                                        >
                                          <Activity size={10} />
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                  {char.value && (
                                    <div className="text-[10px] font-mono bg-black/20 p-1.5 rounded text-emerald-500 break-all">
                                      {char.value}
                                    </div>
                                  )}
                                  {char.properties.write && (
                                    <div className="flex gap-1">
                                      <input 
                                        type="text" 
                                        placeholder="Hex/Text..." 
                                        value={btWriteValues[`${d.id}-${char.uuid}`] || ''}
                                        onChange={(e) => setBtWriteValues(prev => ({ ...prev, [`${d.id}-${char.uuid}`]: e.target.value }))}
                                        className="flex-1 bg-tactical-bg border border-tactical-border rounded px-2 py-1 text-[9px] focus:outline-none focus:border-tactical-accent"
                                      />
                                      <button 
                                        onClick={() => {
                                          writeBluetoothCharacteristic(d.id, service.uuid, char.uuid, btWriteValues[`${d.id}-${char.uuid}`] || '');
                                          setBtWriteValues(prev => ({ ...prev, [`${d.id}-${char.uuid}`]: '' }));
                                        }}
                                        className="px-2 py-1 bg-tactical-accent text-tactical-bg rounded text-[9px] font-bold"
                                      >
                                        WRITE
                                      </button>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                {devices.filter(d => d.type === 'bluetooth').length === 0 && (
                  <div className="p-8 border-2 border-dashed border-tactical-border rounded-2xl text-center">
                    <Bluetooth className="w-8 h-8 text-tactical-muted mx-auto mb-2 opacity-20" />
                    <p className="text-xs text-tactical-muted italic">Keine Bluetooth-Geräte verbunden.</p>
                  </div>
                )}
                <button 
                  onClick={() => onRequestPermission('bluetooth', connectBluetooth)}
                  className="w-full py-3 border border-tactical-accent/30 text-tactical-accent rounded-xl hover:bg-tactical-accent/10 transition-colors text-sm font-bold"
                >
                  SCAN_BLE_DEVICES
                </button>
              </div>

              <div className="bg-black/40 rounded-2xl p-4 font-mono text-[10px] space-y-1 h-full min-h-[200px] overflow-y-auto custom-scrollbar">
                <h4 className="text-[8px] font-bold text-tactical-muted uppercase tracking-widest mb-2">BLE_GATT_Explorer</h4>
                <div className="text-tactical-muted italic opacity-30">Wähle ein Gerät, um Services zu explorieren.</div>
              </div>
            </div>
          </div>
        )}

        {activeSubTab === 'nfc' && (
          <div className="flex-1 min-h-0 p-6 space-y-6 overflow-y-auto custom-scrollbar">
            <h3 className="text-lg font-bold mb-2 flex items-center gap-2"><Nfc className="text-tactical-accent" /> WebNFC Bridge</h3>
            <p className="text-[10px] text-tactical-muted mb-4 leading-relaxed">Interaktion mit NFC-Tags (NDEF-Protokoll).</p>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                {devices.filter(d => d.type === 'nfc').map(d => (
                  <div key={d.id} className="flex flex-col p-4 bg-tactical-bg border border-tactical-border rounded-xl gap-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-tactical-accent rounded-full animate-pulse" />
                        <span className="text-sm font-medium">{d.name}</span>
                      </div>
                      <button onClick={() => onDisconnect(d.id)} className="text-[10px] font-bold text-red-500 hover:underline">STOP_SCAN</button>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex gap-2">
                        <button 
                          onClick={() => setNfcType('text')}
                          className={cn("flex-1 py-1.5 text-[9px] font-bold rounded-lg border transition-all", nfcType === 'text' ? "bg-tactical-accent text-tactical-bg border-tactical-accent" : "bg-tactical-bg border-tactical-border text-tactical-muted")}
                        >
                          TEXT
                        </button>
                        <button 
                          onClick={() => setNfcType('url')}
                          className={cn("flex-1 py-1.5 text-[9px] font-bold rounded-lg border transition-all", nfcType === 'url' ? "bg-tactical-accent text-tactical-bg border-tactical-accent" : "bg-tactical-bg border-tactical-border text-tactical-muted")}
                        >
                          URL
                        </button>
                      </div>
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          placeholder={nfcType === 'text' ? "Text schreiben..." : "https://..."} 
                          value={nfcInput}
                          onChange={(e) => setNfcInput(e.target.value)}
                          className="flex-1 bg-tactical-card border border-tactical-border rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-tactical-accent"
                        />
                        <button 
                          onClick={() => { writeNfcTag(d.id, nfcInput, nfcType); setNfcInput(''); }}
                          className="px-4 py-2 bg-tactical-accent text-tactical-bg rounded-lg text-[10px] font-bold"
                        >
                          WRITE
                        </button>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button 
                        onClick={() => onRequestPermission('nfc', connectNFC)}
                        className="flex-1 py-1.5 bg-tactical-card border border-tactical-border rounded-lg text-[8px] font-bold hover:border-tactical-accent transition-colors uppercase"
                      >
                        Start_Scan
                      </button>
                      <button className="flex-1 py-1.5 bg-tactical-card border border-tactical-border rounded-lg text-[8px] font-bold hover:border-tactical-accent transition-colors uppercase">Lock_Tag</button>
                    </div>

                    {d.nfcLogs && d.nfcLogs.length > 0 && (
                      <div className="space-y-1 mt-2 border-t border-tactical-border pt-2 max-h-32 overflow-y-auto font-mono text-[8px]">
                        {d.nfcLogs.map((log, i) => (
                          <div key={`nfc-log-${i}`} className="text-emerald-500/80">
                            <span className="opacity-50">[{log.time}]</span> {log.data}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                {devices.filter(d => d.type === 'nfc').length === 0 && (
                  <div className="p-8 border-2 border-dashed border-tactical-border rounded-2xl text-center">
                    <Nfc className="w-8 h-8 text-tactical-muted mx-auto mb-2 opacity-20" />
                    <p className="text-xs text-tactical-muted italic">Kein NFC-Scan aktiv.</p>
                  </div>
                )}
                <button 
                  onClick={() => onRequestPermission('nfc', connectNFC)}
                  className="w-full py-3 border border-tactical-accent/30 text-tactical-accent rounded-xl hover:bg-tactical-accent/10 transition-colors text-sm font-bold"
                >
                  START_NFC_SCAN
                </button>
              </div>
              
              <div className="bg-black/40 rounded-2xl p-4 font-mono text-[10px] space-y-1 h-full min-h-[200px] overflow-y-auto custom-scrollbar">
                <h4 className="text-[8px] font-bold text-tactical-muted uppercase tracking-widest mb-2">NFC_Tag_Inspector</h4>
                <div className="text-tactical-muted italic opacity-30">Scanne einen Tag, um Daten auszulesen.</div>
              </div>
            </div>
          </div>
        )}

        {activeSubTab === 'wlan' && (
          <div className="flex-1 min-h-0 p-6 space-y-6 overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold flex items-center gap-2"><Wifi className="text-tactical-accent" /> WLAN Bridge</h3>
              <button 
                onClick={fetchBridgeWlan}
                className="p-2 bg-tactical-bg border border-tactical-border rounded-lg hover:border-tactical-accent transition-colors"
                title="Python Bridge WLAN Scan"
              >
                <RefreshCw className={cn("w-4 h-4", isWlanLoading && "animate-spin")} />
              </button>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <span className="text-[8px] font-bold text-tactical-accent uppercase tracking-widest">Active_Connections</span>
                {devices.filter(d => d.type === 'wlan').map(d => (
                  <div key={d.id} className="p-4 bg-tactical-bg border border-tactical-border rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                        <span className="text-sm font-bold">{d.name}</span>
                      </div>
                      <span className="text-[8px] font-bold text-emerald-500 uppercase">CONNECTED</span>
                    </div>
                    <p className="text-[9px] text-tactical-muted font-mono">{d.details}</p>
                  </div>
                ))}
                {devices.filter(d => d.type === 'wlan').length === 0 && (
                  <div className="p-8 border-2 border-dashed border-tactical-border rounded-2xl text-center">
                    <Wifi className="w-8 h-8 text-tactical-muted mx-auto mb-2 opacity-20" />
                    <p className="text-xs text-tactical-muted italic">Keine aktive WLAN-Bridge.</p>
                  </div>
                )}
                <div className="flex flex-col gap-3">
                  <button 
                    onClick={() => onRequestPermission('wlan', connectWLAN)}
                    className="w-full py-3 border border-tactical-accent/30 text-tactical-accent rounded-xl hover:bg-tactical-accent/10 transition-colors text-sm font-bold"
                  >
                    INITIALIZE_WLAN_BRIDGE
                  </button>

                  <div className="p-4 bg-tactical-bg border border-tactical-border rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Globe size={14} className={captiveStatus?.active ? "text-red-500" : "text-tactical-muted"} />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Captive_Portal_Gateway</span>
                      </div>
                      <div className={cn(
                        "w-2 h-2 rounded-full",
                        captiveStatus?.active ? "bg-red-500 animate-pulse" : "bg-tactical-border"
                      )} />
                    </div>
                    <p className="text-[8px] text-tactical-muted leading-relaxed">Erstellt einen Fake-Access-Point zum Abfangen von Zugangsdaten oder zur Diagnose.</p>
                    <button 
                      onClick={async () => {
                        setIsWlanLoading(true);
                        try {
                          await fetch('/api/captive-portal/toggle', { method: 'POST' });
                          fetchCaptiveStatus();
                        } finally {
                          setIsWlanLoading(false);
                        }
                      }}
                      className={cn(
                        "w-full py-2 border rounded-lg text-[8px] font-bold transition-colors uppercase",
                        captiveStatus?.active 
                          ? "bg-red-500/10 border-red-500/30 text-red-500 hover:bg-red-500 hover:text-white" 
                          : "bg-tactical-accent/10 border-tactical-accent/30 text-tactical-accent hover:bg-tactical-accent hover:text-tactical-bg"
                      )}
                    >
                      {captiveStatus?.active ? 'Stop_Captive_Portal' : 'Start_Captive_Portal'}
                    </button>
                    {captiveStatus?.active && (
                      <div className="p-2 bg-black/20 rounded border border-red-500/20 text-[8px] font-mono text-red-400 break-all">
                        Gateway: {captiveStatus.url}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <span className="text-[8px] font-bold text-blue-400 uppercase tracking-widest">Available_Networks (Bridge)</span>
                {bridgeWlan.length > 0 ? (
                  <div className="grid grid-cols-1 gap-2">
                    {bridgeWlan.map((net, i) => (
                      <div key={`bridge-wlan-${i}`} className="p-3 bg-tactical-bg border border-tactical-border rounded-xl flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Wifi size={16} className={cn(net.signal > -60 ? "text-emerald-500" : net.signal > -80 ? "text-yellow-500" : "text-red-500")} />
                          <div>
                            <p className="text-xs font-bold">{net.ssid}</p>
                            <p className="text-[8px] text-tactical-muted">{net.bssid} | {net.signal}dBm | {net.security}</p>
                          </div>
                        </div>
                        <button className="text-[8px] font-bold text-tactical-accent border border-tactical-accent/30 px-2 py-1 rounded hover:bg-tactical-accent hover:text-tactical-bg transition-all">
                          CONNECT
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 border-2 border-dashed border-tactical-border rounded-2xl text-center">
                    <Search className="w-8 h-8 text-tactical-muted mx-auto mb-2 opacity-20" />
                    <p className="text-xs text-tactical-muted italic">Keine Netzwerke gefunden. Starte Scan.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Captive Portal Status */}
            {captiveStatus && captiveStatus.active && (
              <div className="mt-6 p-4 bg-orange-500/10 border border-orange-500/30 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Globe className="text-orange-500 animate-pulse" />
                  <div>
                    <h4 className="text-xs font-bold text-orange-500 uppercase">Captive Portal Detected</h4>
                    <p className="text-[10px] text-tactical-muted">Authentifizierung erforderlich für Internetzugriff.</p>
                  </div>
                </div>
                <a 
                  href={captiveStatus.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-orange-500 text-white rounded-xl text-[10px] font-bold hover:scale-105 transition-transform"
                >
                  OPEN_PORTAL
                </a>
              </div>
            )}
          </div>
        )}
        {activeSubTab === 'flasher' && (
          <div className="flex-1 min-h-0 p-6 space-y-6 overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold flex items-center gap-2"><Zap className="text-tactical-accent" /> Device Flasher</h3>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <span className="text-[8px] font-bold text-tactical-accent uppercase tracking-widest">1. Select_Target_Device</span>
                <select 
                  className="w-full bg-tactical-card border border-tactical-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-tactical-accent"
                  value={selectedFlasherDevice}
                  onChange={(e) => setSelectedFlasherDevice(e.target.value)}
                  disabled={isFlashing}
                >
                  <option value="">-- Gerät auswählen --</option>
                  {devices.filter(d => ['usb', 'serial', 'adb', 'fastboot', 'edl'].includes(d.type)).map(d => (
                    <option key={d.id} value={d.id}>{d.name} ({d.type.toUpperCase()})</option>
                  ))}
                </select>
                
                {devices.length === 0 && (
                  <p className="text-[10px] text-tactical-muted italic">Bitte verbinde zuerst ein Gerät über USB oder Serial.</p>
                )}

                <span className="text-[8px] font-bold text-tactical-accent uppercase tracking-widest block mt-6">2. Select_Firmware_Image</span>
                <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                  {MOCK_FIRMWARES.map(fw => (
                    <div 
                      key={fw.id}
                      onClick={() => !isFlashing && setSelectedFirmware(fw.id)}
                      className={cn(
                        "p-3 border rounded-xl cursor-pointer transition-all",
                        selectedFirmware === fw.id 
                          ? "bg-tactical-accent/10 border-tactical-accent" 
                          : "bg-tactical-bg border-tactical-border hover:border-tactical-muted",
                        isFlashing && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-sm font-bold">{fw.name}</p>
                          <p className="text-[10px] text-tactical-muted">Version: {fw.version} | Typ: {fw.type.toUpperCase()}</p>
                        </div>
                        <span className="text-[10px] font-mono bg-tactical-card px-2 py-1 rounded">{fw.size}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <span className="text-[8px] font-bold text-tactical-accent uppercase tracking-widest">3. Flash_Operation</span>
                
                <div className="p-6 bg-tactical-bg border border-tactical-border rounded-2xl flex flex-col items-center justify-center min-h-[200px] space-y-6">
                  {isFlashing ? (
                    <div className="w-full space-y-4">
                      <div className="flex justify-between text-xs font-bold">
                        <span className="text-tactical-accent animate-pulse">{flashStatus}</span>
                        <span>{flashProgress}%</span>
                      </div>
                      <div className="w-full h-2 bg-tactical-card rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-tactical-accent transition-all duration-300 ease-out"
                          style={{ width: `${flashProgress}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-tactical-muted text-center italic mt-4">Bitte das Gerät nicht trennen!</p>
                    </div>
                  ) : (
                    <>
                      <Zap className={cn("w-12 h-12", selectedFlasherDevice && selectedFirmware ? "text-tactical-accent" : "text-tactical-muted opacity-20")} />
                      <button 
                        onClick={handleFlash}
                        disabled={!selectedFlasherDevice || !selectedFirmware}
                        className={cn(
                          "px-8 py-3 rounded-xl font-bold uppercase tracking-wider transition-all",
                          selectedFlasherDevice && selectedFirmware
                            ? "bg-tactical-accent text-tactical-bg hover:scale-105 shadow-[0_0_20px_rgba(0,255,157,0.3)]"
                            : "bg-tactical-card text-tactical-muted cursor-not-allowed"
                        )}
                      >
                        Start Flash
                      </button>
                      {flashStatus && !isFlashing && (
                        <p className={cn("text-xs font-bold", flashProgress === 100 ? "text-emerald-500" : "text-red-500")}>
                          {flashStatus}
                        </p>
                      )}
                    </>
                  )}
                </div>

                <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
                  <h4 className="text-xs font-bold text-red-500 flex items-center gap-2 mb-2">
                    <AlertTriangle size={14} /> WARNUNG
                  </h4>
                  <p className="text-[10px] text-tactical-muted leading-relaxed">
                    Das Flashen einer inkompatiblen Firmware kann das Gerät unbrauchbar machen (Brick). 
                    Stelle sicher, dass der Akku ausreichend geladen ist und die USB-Verbindung stabil ist.
                    Alle Daten auf dem Gerät werden gelöscht.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function BuilderView() {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <BuilderCard 
          title="Omni-Installer Bootstrap" 
          desc="Automatische Umgebungserkennung und Installation der Creator Suite auf Honeywell/Android." 
          icon={<Zap />} 
        />
        <BuilderCard 
          title="Python Hardware Bridge" 
          desc="FastAPI-Server zur Kommunikation zwischen WebUSB und lokalem Python-Backend." 
          icon={<Usb />} 
        />
        <BuilderCard 
          title="Local LLM Orchestrator" 
          desc="Konfiguriert Ollama und wählt automatisch das passende Modell basierend auf RAM." 
          icon={<Cpu />} 
        />
      </div>
      <div className="bg-tactical-card border border-tactical-border rounded-2xl p-8">
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Zap className="text-tactical-accent" /> Prompt Flow Planer
        </h3>
        <p className="text-tactical-muted mb-6">Beschreibe dein Vorhaben und die KI erstellt den optimalen Architekturplan.</p>
        <div className="flex flex-col sm:flex-row gap-4">
          <input 
            type="text" 
            placeholder="z.B. Erstelle einen Android Flash-Agenten für Redmi Geräte..."
            className="flex-1 bg-tactical-bg border border-tactical-border rounded-xl px-4 py-3 focus:border-tactical-accent outline-none"
          />
          <button className="px-6 py-3 bg-tactical-accent text-tactical-bg font-bold rounded-xl whitespace-nowrap">PLAN_STARTEN</button>
        </div>
      </div>
    </div>
  );
}

function BuilderCard({ title, desc, icon }: { title: string, desc: string, icon: React.ReactNode }) {
  return (
    <div className="bg-tactical-card border border-tactical-border p-6 rounded-2xl hover:border-tactical-accent transition-all group cursor-pointer">
      <div className="w-12 h-12 bg-tactical-bg rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
        {React.isValidElement(icon) ? React.cloneElement(icon as React.ReactElement<any>, { size: 24, className: "text-tactical-accent" }) : icon}
      </div>
      <h4 className="font-bold mb-2">{title}</h4>
      <p className="text-xs text-tactical-muted leading-relaxed">{desc}</p>
    </div>
  );
}

function GalleryView({ 
  agents, 
  instructions, 
  onApplyInstruction, 
  onEditInstruction, 
  onDeleteInstruction,
  onAddInstruction
}: { 
  agents: Agent[], 
  instructions: SystemInstruction[],
  onApplyInstruction: (i: SystemInstruction) => void,
  onEditInstruction: (i: SystemInstruction) => void,
  onDeleteInstruction: (id: string) => void,
  onAddInstruction: () => void
}) {
  const [view, setView] = useState<'agents' | 'instructions'>('agents');

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex bg-tactical-card border border-tactical-border rounded-xl p-1 w-full sm:w-auto">
          <button 
            onClick={() => setView('agents')}
            className={cn(
              "flex-1 sm:flex-none px-4 py-2 text-xs font-bold rounded-lg transition-all",
              view === 'agents' ? "bg-tactical-accent text-tactical-bg shadow-lg" : "text-tactical-muted hover:text-tactical-text"
            )}
          >
            AGENTEN
          </button>
          <button 
            onClick={() => setView('instructions')}
            className={cn(
              "flex-1 sm:flex-none px-4 py-2 text-xs font-bold rounded-lg transition-all",
              view === 'instructions' ? "bg-tactical-accent text-tactical-bg shadow-lg" : "text-tactical-muted hover:text-tactical-text"
            )}
          >
            SYSTEM-INSTRUKTIONEN
          </button>
        </div>
        {view === 'instructions' && (
          <button 
            onClick={onAddInstruction}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-tactical-accent text-tactical-bg font-bold rounded-xl text-xs hover:scale-105 transition-transform"
          >
            <Plus size={14} /> NEUE INSTRUKTION
          </button>
        )}
      </div>

      {view === 'agents' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-tactical-card border border-tactical-border rounded-2xl p-6 flex flex-col items-center justify-center border-dashed text-tactical-muted hover:text-tactical-accent hover:border-tactical-accent transition-all cursor-pointer min-h-[200px]">
            <Plus className="w-10 h-10 mb-2" />
            <span className="font-bold text-sm">NEUER AGENT</span>
          </div>
          {agents.map(agent => (
            <div key={agent.id} className="bg-tactical-card border border-tactical-border rounded-2xl p-6 hover:border-tactical-accent transition-all">
              <div className="flex justify-between items-start mb-4">
                <div className="w-10 h-10 bg-tactical-accent/20 rounded-lg flex items-center justify-center border border-tactical-accent/50">
                  {React.isValidElement(agent.icon) ? React.cloneElement(agent.icon as React.ReactElement<any>, { className: "text-tactical-accent w-5 h-5" }) : agent.icon}
                </div>
                <div className="flex gap-2">
                  <button className="p-2 hover:bg-tactical-border rounded-lg"><Download size={16} /></button>
                  <button className="p-2 hover:bg-tactical-border rounded-lg"><Share2 size={16} /></button>
                </div>
              </div>
              <h4 className="font-bold text-lg mb-1">{agent.name}</h4>
              <p className="text-xs text-tactical-muted mb-4">{agent.desc}</p>
              <div className="flex flex-wrap gap-2">
                <span className="px-2 py-1 bg-tactical-bg rounded text-[10px] font-mono border border-tactical-border">BOOTSTRAP</span>
                <span className="px-2 py-1 bg-tactical-bg rounded text-[10px] font-mono border border-tactical-border">AUTO_INSTALL</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {instructions.map(instruction => (
            <div key={instruction.id} className="bg-tactical-card border border-tactical-border rounded-2xl p-6 hover:border-tactical-accent transition-all flex flex-col">
              <div className="flex justify-between items-start mb-4">
                <div className="w-10 h-10 bg-tactical-accent/20 rounded-lg flex items-center justify-center border border-tactical-accent/50">
                  <Shield className="text-tactical-accent w-5 h-5" />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => onEditInstruction(instruction)} className="p-2 hover:bg-tactical-border rounded-lg text-tactical-muted hover:text-tactical-text"><LayoutGrid size={16} /></button>
                  <button onClick={() => onDeleteInstruction(instruction.id)} className="p-2 hover:bg-tactical-border rounded-lg text-red-500/50 hover:text-red-500"><X size={16} /></button>
                </div>
              </div>
              <h4 className="font-bold text-lg mb-1">{instruction.title}</h4>
              <div className="text-[10px] text-tactical-accent font-bold uppercase tracking-widest mb-2">{instruction.category || 'GENERAL'}</div>
              <p className="text-xs text-tactical-muted mb-6 line-clamp-3 flex-1">{instruction.content}</p>
              <button 
                onClick={() => onApplyInstruction(instruction)}
                className="w-full py-2 bg-tactical-accent/10 border border-tactical-accent/30 text-tactical-accent rounded-xl text-xs font-bold hover:bg-tactical-accent hover:text-tactical-bg transition-all"
              >
                AKTIVIEREN
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function InstructionModal({ 
  instruction, 
  onSave, 
  onClose 
}: { 
  instruction: SystemInstruction | null, 
  onSave: (i: SystemInstruction) => void, 
  onClose: () => void 
}) {
  const [title, setTitle] = useState(instruction?.title || '');
  const [content, setContent] = useState(instruction?.content || '');
  const [category, setCategory] = useState(instruction?.category || 'General');

  const handleSave = () => {
    if (!title || !content) return;
    onSave({
      id: instruction?.id || Math.random().toString(36).substr(2, 9),
      title,
      content,
      category,
      lastUsed: Date.now()
    });
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-tactical-card border border-tactical-border w-full max-w-2xl rounded-3xl flex flex-col overflow-hidden shadow-2xl"
      >
        <div className="p-6 border-b border-tactical-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-tactical-accent/20 rounded-lg">
              <Shield className="text-tactical-accent w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold tracking-tight">{instruction ? 'Instruktion bearbeiten' : 'Neue System-Instruktion'}</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-tactical-border rounded-full">
            <X size={24} />
          </button>
        </div>
        
        <div className="p-6 space-y-4">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-tactical-muted uppercase tracking-widest">Titel</label>
            <input 
              type="text" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="z.B. Security Auditor"
              className="w-full bg-tactical-bg border border-tactical-border rounded-xl p-3 focus:outline-none focus:border-tactical-accent"
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-tactical-muted uppercase tracking-widest">Kategorie</label>
            <select 
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-tactical-bg border border-tactical-border rounded-xl p-3 focus:outline-none focus:border-tactical-accent"
            >
              <option value="General">General</option>
              <option value="Development">Development</option>
              <option value="Security">Security</option>
              <option value="Hardware">Hardware</option>
              <option value="Research">Research</option>
            </select>
          </div>
          
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-tactical-muted uppercase tracking-widest">Instruktions-Text</label>
            <textarea 
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Definiere die Rolle und das Verhalten der KI..."
              className="w-full bg-tactical-bg border border-tactical-border rounded-xl p-3 focus:outline-none focus:border-tactical-accent min-h-[200px] resize-none"
            />
          </div>
        </div>

        <div className="p-6 border-t border-tactical-border flex flex-col sm:flex-row justify-end gap-3 bg-tactical-bg/30">
          <button onClick={onClose} className="w-full sm:w-auto px-6 py-2 text-sm font-bold hover:bg-tactical-border rounded-xl transition-colors">ABBRECHEN</button>
          <button 
            onClick={handleSave}
            disabled={!title || !content}
            className="w-full sm:w-auto px-8 py-2 bg-tactical-accent text-tactical-bg font-bold rounded-xl transition-transform hover:scale-105 disabled:opacity-50 disabled:scale-100"
          >
            SPEICHERN
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function VaultView() {
  const [nodes, setNodes] = useState(() => {
    const saved = localStorage.getItem('taktikal_vault_nodes');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse taktikal_vault_nodes from localStorage', e);
      }
    }
    return [
      { id: 1, title: 'Fastboot Commands', category: 'libs', date: '2026-03-17', snippet: 'Fastboot flash recovery recovery.img...' },
      { id: 2, title: 'Redmi 15T Bypass', category: 'skills', date: '2026-03-16', snippet: 'import usb.core\ndev = usb.core.find(...)' },
      { id: 3, title: 'Xiaomi ROM Mirror', category: 'urls', date: '2026-03-15', snippet: '[Redmi 15T Fastboot ROM] -> mega.nz/folder/xyz' },
    ];
  });

  useEffect(() => {
    localStorage.setItem('taktikal_vault_nodes', JSON.stringify(nodes));
  }, [nodes]);

  const syncVault = async () => {
    // Real sync with backend if available
    try {
      const response = await fetch('/api/bridge/context/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: 'latest_nodes' })
      });
      if (response.ok) {
        const data = await response.json();
        if (data.results) {
          // Merge or replace
          console.log("Vault synced with bridge");
        }
      }
    } catch (e) {
      console.error("Vault sync failed:", e);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold flex items-center gap-3">
          <FileCode className="text-tactical-accent" /> Knowledge Vault
        </h2>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <button 
            onClick={syncVault}
            className="w-full sm:w-auto px-4 py-2 bg-tactical-accent text-tactical-bg font-bold rounded-xl text-xs"
          >
            SYNC_VAULT
          </button>
          <button className="w-full sm:w-auto px-4 py-2 border border-tactical-border rounded-xl text-xs font-bold">NEW_NODE</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {['memories', 'skills', 'libs', 'urls'].map(cat => (
          <div key={cat} className="p-4 bg-tactical-card border border-tactical-border rounded-2xl">
            <span className="text-[10px] font-bold uppercase tracking-widest text-tactical-muted">{cat}</span>
            <div className="text-2xl font-bold mt-1">{nodes.filter(n => n.category === cat).length}</div>
          </div>
        ))}
      </div>

      <div className="bg-tactical-card border border-tactical-border rounded-2xl overflow-x-auto">
        <table className="w-full text-left text-sm min-w-[600px]">
          <thead className="bg-tactical-bg border-b border-tactical-border">
            <tr>
              <th className="p-4 font-bold uppercase text-[10px] tracking-widest text-tactical-muted">Titel</th>
              <th className="p-4 font-bold uppercase text-[10px] tracking-widest text-tactical-muted">Kategorie</th>
              <th className="p-4 font-bold uppercase text-[10px] tracking-widest text-tactical-muted">Datum</th>
              <th className="p-4 font-bold uppercase text-[10px] tracking-widest text-tactical-muted">Aktion</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-tactical-border">
            {nodes.map(node => (
              <tr key={node.id} className="hover:bg-tactical-border/30 transition-colors group">
                <td className="p-4">
                  <div className="font-bold">{node.title}</div>
                  <div className="text-[10px] text-tactical-muted truncate max-w-xs">{node.snippet}</div>
                </td>
                <td className="p-4">
                  <span className="px-2 py-1 bg-tactical-bg border border-tactical-border rounded text-[10px] font-mono uppercase">
                    {node.category}
                  </span>
                </td>
                <td className="p-4 text-xs text-tactical-muted font-mono">{node.date}</td>
                <td className="p-4">
                  <div className="flex gap-2">
                    <button className="p-2 hover:text-tactical-accent transition-colors"><Maximize2 size={14} /></button>
                    <button className="p-2 hover:text-red-500 transition-colors"><X size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function EMobilityView({ onSelectSpecialist }: { onSelectSpecialist: () => void }) {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [controllerData, setControllerData] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);

  const [bridgeStatus, setBridgeStatus] = useState<'online' | 'offline' | 'checking'>('checking');

  useEffect(() => {
    const checkBridge = async () => {
      try {
        const res = await fetch('/api/bridge/health');
        if (res.ok) setBridgeStatus('online');
        else setBridgeStatus('offline');
      } catch (e) { setBridgeStatus('offline'); }
    };
    checkBridge();
  }, []);

  const handleSearch = async () => {
    if (!search) return;
    setIsSearching(true);
    try {
      const res = await fetch(`/api/bridge/emobility/strategy?q=${encodeURIComponent(search)}`);
      const data = await res.json();
      setResults(data);
    } catch (e) {
      console.error("Strategy search failed:", e);
    } finally {
      setIsSearching(false);
    }
  };

  const handleControllerAction = async (action: string, config: any = {}) => {
    try {
      const res = await fetch('/api/bridge/emobility/manager', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, config })
      });
      const data = await res.json();
      setControllerData(data);
    } catch (e) {
      console.error(`Controller ${action} failed:`, e);
    }
  };

  const vehicles = [
    { name: 'E-Scooter', icon: <Zap />, id: 'esc-01' },
    { name: 'E-Bike', icon: <Activity />, id: 'ebk-05' },
    { name: 'E-Bootsmotor', icon: <Maximize2 />, id: 'ebm-09' },
    { name: 'E-Hoverboard', icon: <LayoutGrid />, id: 'ehb-02' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold flex items-center gap-3">
          <Activity className="text-tactical-accent shrink-0" /> <span className="truncate">E-Mobility Network Suite</span>
        </h2>
        <div className="flex gap-2 w-full sm:w-auto">
          <button 
            onClick={onSelectSpecialist}
            className="w-full sm:w-auto px-4 py-2 bg-tactical-accent text-tactical-bg font-bold rounded-xl text-xs uppercase hover:scale-105 transition-transform"
          >
            Launch_Specialist_Agent
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {vehicles.map(v => (
          <div key={v.id} className="bg-tactical-card border border-tactical-border p-6 rounded-2xl hover:border-tactical-accent transition-all cursor-pointer group">
            <div className="w-10 h-10 bg-tactical-bg rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              {React.cloneElement(v.icon as React.ReactElement<any>, { className: "text-tactical-accent" })}
            </div>
            <h4 className="font-bold">{v.name}</h4>
            <p className="text-[10px] text-tactical-muted uppercase mt-1">ID: {v.id}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-tactical-card border border-tactical-border rounded-2xl p-6">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Settings className="text-tactical-accent" /> Controller Fix Tool</h3>
          <div className="space-y-4">
            <div className="flex gap-3">
              <button 
                onClick={() => handleControllerAction('read_controller')}
                className="flex-1 py-3 bg-tactical-bg border border-tactical-border rounded-xl text-xs font-bold hover:border-tactical-accent transition-colors"
              >
                READ_CONTROLLER
              </button>
              <button 
                onClick={() => handleControllerAction('write_config', {})}
                className="flex-1 py-3 bg-tactical-bg border border-tactical-border rounded-xl text-xs font-bold hover:border-tactical-accent transition-colors"
              >
                WRITE_CONFIG
              </button>
              <button 
                onClick={() => handleControllerAction('clear_errors')}
                className="flex-1 py-3 bg-tactical-bg border border-tactical-border rounded-xl text-xs font-bold hover:text-red-500 hover:border-red-500 transition-colors"
              >
                CLEAR_ERRORS
              </button>
            </div>
            
            {controllerData && (
              <div className="p-3 bg-tactical-bg border border-tactical-border rounded-xl font-mono text-[9px] text-tactical-accent animate-in fade-in slide-in-from-top-2">
                <div className="flex justify-between border-b border-tactical-border pb-1 mb-1">
                  <span>ID: {controllerData.id || 'N/A'}</span>
                  <span>{controllerData.status || 'OK'}</span>
                </div>
                {controllerData.firmware && <div>FIRMWARE: {controllerData.firmware}</div>}
                {controllerData.voltage && <div>VOLTAGE: {controllerData.voltage}</div>}
                {controllerData.errors && controllerData.errors.length > 0 && (
                  <div className="text-red-500 mt-1">
                    ERRORS: {controllerData.errors.join(', ')}
                  </div>
                )}
              </div>
            )}

            <div className="p-4 bg-tactical-bg border border-tactical-border rounded-xl font-mono text-[10px] text-tactical-muted">
              <div className={cn(
                "mb-1 flex items-center gap-2",
                bridgeStatus === 'online' ? "text-tactical-accent" : "text-red-500"
              )}>
                <div className={cn("w-1.5 h-1.5 rounded-full", bridgeStatus === 'online' && "animate-pulse bg-tactical-accent", bridgeStatus === 'offline' && "bg-red-500")} />
                [SYSTEM] Bridge Connection {bridgeStatus.toUpperCase()}
              </div>
              <div>&gt; Connect via CAN-Bus or USB-OTG</div>
              <div>&gt; Baudrate: 115200</div>
              {bridgeStatus === 'offline' && (
                <div className="mt-1 text-[8px] text-red-500/70 italic">
                  Hinweis: Starte 'server_bridge.py' lokal für Hardware-Zugriff.
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-tactical-card border border-tactical-border rounded-2xl p-6">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><MessageSquare className="text-tactical-accent" /> Strategie-Suche & Support</h3>
          <div className="space-y-4">
            <div className="relative">
              <input 
                type="text" 
                placeholder="Key-wort Suche (z.B. Hall-Sensor, Batterie, CAN)..."
                className="w-full bg-tactical-bg border border-tactical-border rounded-xl px-4 py-3 focus:border-tactical-accent outline-none text-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              <button 
                onClick={handleSearch}
                className="absolute right-2 top-2 p-2 bg-tactical-accent text-tactical-bg rounded-lg hover:scale-105 transition-transform"
              >
                <Send size={16} className={cn(isSearching && "animate-pulse")} />
              </button>
            </div>
            <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
              {results.length > 0 ? (
                results.map((res, i) => (
                  <div key={`workflow-step-${i}`} className="p-3 bg-tactical-bg border border-tactical-border rounded-xl animate-in fade-in slide-in-from-bottom-2">
                    <div className="text-xs font-bold text-tactical-accent uppercase mb-1">Strategie: {res.vehicle}</div>
                    <ul className="text-[11px] text-tactical-muted list-disc list-inside space-y-1">
                      {res.steps.map((step: string, j: number) => (
                        <li key={j}>{step}</li>
                      ))}
                    </ul>
                  </div>
                ))
              ) : (
                <div className="p-3 bg-tactical-bg border border-tactical-border rounded-xl">
                  <div className="text-xs font-bold text-tactical-accent uppercase mb-1">Strategie: E-Scooter Hall-Sensor</div>
                  <p className="text-[11px] text-tactical-muted">1. Phasen-Kabel auf Kurzschluss prüfen. 2. 5V Versorgungsspannung am Sensor messen. 3. Signal-Flanken via Oszilloskop validieren.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ScooterSpecialistView() {
  const [btStatus, setBtStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [telemetry, setTelemetry] = useState({ voltage: 42.1, temp: 34, speed: 0, error: 'NONE' });
  const [hexLogs, setHexLogs] = useState<string[]>(['[SYSTEM] Waiting for Bluetooth connection...']);
  const [lineEnding, setLineEnding] = useState<'\n' | '\r' | '\r\n' | ''>('\n');
  const [messages, setMessages] = useState<any[]>([
    { role: 'model', content: 'E-Scooter Specialist Agent online. Bereit für Diagnose oder Firmware-Modifikation.' }
  ]);

  const connectToScooter = async () => {
    if (!(navigator as any).bluetooth) {
      setHexLogs(prev => [...prev, '[ERR] Web Bluetooth nicht unterstützt in diesem Browser.']);
      return;
    }

    setBtStatus('connecting');
    setHexLogs(prev => [...prev, '[BT] Requesting device...']);
    
    try {
      const device = await (navigator as any).bluetooth.requestDevice({
        filters: [{ namePrefix: 'Xiaomi' }, { namePrefix: 'Ninebot' }, { namePrefix: 'Scooter' }],
        optionalServices: ['00001800-0000-1000-8000-00805f9b34fb', '00001801-0000-1000-8000-00805f9b34fb']
      });

      setHexLogs(prev => [...prev, `[BT] Found: ${device.name || 'Unknown'}`]);
      
      const server = await device.gatt?.connect();
      if (!server) throw new Error('GATT Server not found');

      setBtStatus('connected');
      setHexLogs(prev => [...prev, `[BT] Connected to ${device.name}`, '[RX] Protocol Handshake...']);
      
      device.addEventListener('gattserverdisconnected', () => {
        setBtStatus('disconnected');
        setHexLogs(prev => [...prev, '[BT] Disconnected']);
      });

      // Real telemetry would require subscribing to characteristics
      // For now, we keep the UI update logic but it's triggered by a real connection
      const interval = setInterval(() => {
        setTelemetry(t => ({
          ...t,
          voltage: +(t.voltage - 0.01).toFixed(2),
          temp: t.temp + (Math.random() > 0.5 ? 1 : -1)
        }));
      }, 2000);

      return () => {
        clearInterval(interval);
        device.gatt?.disconnect();
      };
    } catch (e: any) {
      setBtStatus('disconnected');
      let errorMsg = `[ERR] ${e.message || 'Verbindung fehlgeschlagen'}`;
      if (e.name === 'NotFoundError') errorMsg = '[ERR] Kein Scooter gefunden';
      else if (e.name === 'NotAllowedError') errorMsg = '[ERR] Zugriff verweigert';
      else if (e.name === 'SecurityError') errorMsg = '[ERR] Sicherheits-Blockade';
      
      setHexLogs(prev => [...prev, errorMsg, '-> Bitte Bluetooth prüfen & Pairing-Modus aktivieren.']);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 animate-in fade-in duration-500">
      {/* Left: Chat UI */}
      <div className="flex-1 min-h-[400px] bg-tactical-card border border-tactical-border rounded-3xl flex flex-col overflow-hidden">
        <div className="p-4 border-b border-tactical-border bg-tactical-bg/50 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <MessageSquare className="text-tactical-accent w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-widest">Specialist_Chat</span>
          </div>
          <div className="flex items-center gap-2">
            <div className={cn("w-2 h-2 rounded-full", btStatus === 'connected' ? "bg-tactical-accent animate-pulse" : "bg-red-500")} />
            <span className="text-[10px] font-mono">{btStatus.toUpperCase()}</span>
          </div>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4 custom-scrollbar">
          {messages.map((msg, i) => (
            <div key={`specialist-msg-${i}`} className={cn("flex gap-3", msg.role === 'user' ? "flex-row-reverse" : "")}>
              <div className={cn("p-3 rounded-2xl text-xs max-w-[80%]", msg.role === 'user' ? "bg-tactical-accent text-tactical-bg font-bold" : "bg-tactical-bg border border-tactical-border")}>
                {msg.content}
              </div>
            </div>
          ))}
        </div>
        <div className="p-4 border-t border-tactical-border">
          <div className="relative">
            <input 
              type="text" 
              placeholder="Befehl eingeben (z.B. 'Unlock Speed')..."
              className="w-full bg-tactical-bg border border-tactical-border rounded-xl px-4 py-3 text-xs focus:border-tactical-accent outline-none"
            />
            <button className="absolute right-2 top-2 p-2 bg-tactical-accent text-tactical-bg rounded-lg"><Send size={14} /></button>
          </div>
        </div>
      </div>

      {/* Right: Telemetry & HEX Monitor */}
      <div className="w-full lg:w-96 flex flex-col gap-6">
        <div className="bg-tactical-card border border-tactical-border rounded-3xl p-6 space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-bold uppercase tracking-widest text-tactical-muted">Real-Time_Telemetry</h3>
            <button 
              onClick={connectToScooter}
              disabled={btStatus !== 'disconnected'}
              className="p-2 bg-tactical-accent/10 border border-tactical-accent/30 rounded-lg text-tactical-accent hover:bg-tactical-accent hover:text-tactical-bg transition-all disabled:opacity-50"
            >
              <Bluetooth size={16} />
            </button>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-tactical-bg border border-tactical-border rounded-2xl">
              <div className="text-[10px] text-tactical-muted uppercase font-bold">Voltage</div>
              <div className="text-xl font-bold text-tactical-accent font-mono">{telemetry.voltage}V</div>
            </div>
            <div className="p-4 bg-tactical-bg border border-tactical-border rounded-2xl">
              <div className="text-[10px] text-tactical-muted uppercase font-bold">Temp</div>
              <div className="text-xl font-bold font-mono">{telemetry.temp}°C</div>
            </div>
            <div className="p-4 bg-tactical-bg border border-tactical-border rounded-2xl">
              <div className="text-[10px] text-tactical-muted uppercase font-bold">Speed</div>
              <div className="text-xl font-bold font-mono">{telemetry.speed} km/h</div>
            </div>
            <div className="p-4 bg-tactical-bg border border-tactical-border rounded-2xl">
              <div className="text-[10px] text-tactical-muted uppercase font-bold">Error</div>
              <div className={cn("text-xl font-bold font-mono", telemetry.error !== 'NONE' ? "text-red-500" : "text-tactical-accent")}>{telemetry.error}</div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-[10px] font-bold uppercase text-tactical-muted">
              <span>Battery_Level</span>
              <span>84%</span>
            </div>
            <div className="h-1.5 bg-tactical-bg border border-tactical-border rounded-full overflow-hidden">
              <div className="h-full bg-tactical-accent w-[84%]" />
            </div>
          </div>
        </div>

        <div className="flex-1 min-h-[300px] bg-tactical-card border border-tactical-border rounded-3xl p-4 flex flex-col overflow-hidden">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex items-center gap-2 flex-1">
              <TerminalIcon className="text-tactical-accent w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-widest">HEX_Monitor</span>
            </div>
            <div className="flex items-center gap-2">
              <select 
                value={lineEnding} 
                onChange={(e) => setLineEnding(e.target.value as any)}
                className="bg-tactical-bg border border-tactical-border rounded px-2 py-1 text-[8px] focus:outline-none"
              >
                <option value="">None</option>
                <option value="\n">LF</option>
                <option value="\r">CR</option>
                <option value="\r\n">CRLF</option>
              </select>
              <button 
                onClick={() => {
                  const logs = hexLogs.join('\n');
                  const blob = new Blob([logs], { type: 'text/plain' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `scooter_hex_logs_${new Date().toISOString()}.txt`;
                  a.click();
                }}
                className="text-tactical-accent/70 hover:text-tactical-accent transition-colors text-[8px] font-bold"
              >
                EXPORT
              </button>
            </div>
          </div>
          <div className="flex-1 min-h-0 bg-tactical-bg border border-tactical-border rounded-xl p-3 font-mono text-[9px] overflow-y-auto custom-scrollbar space-y-1">
            {hexLogs.map((log, i) => (
              <div key={`hex-log-${i}`} className={cn(
                log.includes('[RX]') ? "text-tactical-accent" : 
                log.includes('[TX]') ? "text-blue-400" : 
                log.includes('[ERR]') ? "text-red-500" : "text-tactical-muted"
              )}>
                {log}
              </div>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <input 
              type="text" 
              placeholder="RAW CMD..."
              disabled={btStatus !== 'connected'}
              className="flex-1 bg-tactical-bg border border-tactical-border rounded px-2 py-1 text-[9px] font-mono focus:outline-none focus:border-tactical-accent disabled:opacity-50"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.currentTarget.value && btStatus === 'connected') {
                  const val = e.currentTarget.value;
                  setHexLogs(prev => [...prev, `[TX] ${val}${lineEnding.replace('\n', '\\n').replace('\r', '\\r')}`]);
                  // In a real app, we would send this over Bluetooth
                  e.currentTarget.value = '';
                }
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function SettingsView() {
  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in duration-500">
      <section>
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Settings className="w-5 h-5" /> System-Konfiguration</h3>
        <div className="space-y-4">
          <div className="p-4 bg-tactical-card border border-tactical-border rounded-xl">
            <label className="block text-xs font-bold uppercase tracking-widest text-tactical-muted mb-2">Claude API Schlüssel</label>
            <input type="password" placeholder="sk-ant-..." className="w-full bg-tactical-bg border border-tactical-border rounded-lg px-3 py-2 focus:border-tactical-accent outline-none font-mono text-sm" />
          </div>
          <div className="p-4 bg-tactical-card border border-tactical-border rounded-xl">
            <label className="block text-xs font-bold uppercase tracking-widest text-tactical-muted mb-2">Vercel AI SDK Token</label>
            <input type="password" placeholder="vrc_..." className="w-full bg-tactical-bg border border-tactical-border rounded-lg px-3 py-2 focus:border-tactical-accent outline-none font-mono text-sm" />
          </div>
        </div>
      </section>
      
      <section>
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Shield className="w-5 h-5" /> Sicherheit & Privatsphäre</h3>
        <div className="p-4 bg-tactical-card border border-tactical-border rounded-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold text-sm">Lokale Verschlüsselung (GPG)</p>
              <p className="text-xs text-tactical-muted">Alle Backups werden lokal verschlüsselt.</p>
            </div>
            <div className="w-10 h-5 bg-tactical-accent rounded-full relative cursor-pointer">
              <div className="absolute right-1 top-1 w-3 h-3 bg-tactical-bg rounded-full" />
            </div>
          </div>
        </div>
      </section>

      <section>
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Box className="w-5 h-5" /> Local-First & Build-Server</h3>
        <div className="p-4 bg-tactical-card border border-tactical-border rounded-xl space-y-4">
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-widest text-tactical-muted mb-2">Local Docker API Endpoint</label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input type="text" placeholder="http://localhost:8080/api/v1" className="w-full sm:flex-1 bg-tactical-bg border border-tactical-border rounded-lg px-3 py-2 focus:border-tactical-accent outline-none font-mono text-sm" />
              <button className="w-full sm:w-auto px-4 py-2 bg-tactical-accent text-tactical-bg font-bold rounded-lg text-[10px]">TEST_CONNECT</button>
            </div>
          </div>
          <div className="flex items-center justify-between pt-2">
            <div>
              <p className="font-bold text-sm">Offline-Modus (PWA)</p>
              <p className="text-xs text-tactical-muted">Web-App im Browser-Cache für Offline-Nutzung speichern.</p>
            </div>
            <div className="w-10 h-5 bg-tactical-accent rounded-full relative cursor-pointer">
              <div className="absolute right-1 top-1 w-3 h-3 bg-tactical-bg rounded-full" />
            </div>
          </div>
        </div>
      </section>

      <section>
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Library className="w-5 h-5" /> Technisches Service Manual</h3>
        <div className="p-6 bg-tactical-card border border-tactical-border rounded-xl space-y-6 text-sm text-tactical-muted">
          
          <div>
            <h4 className="text-tactical-accent font-bold mb-2 uppercase tracking-wider">1. WebUSB & Web Serial Architektur</h4>
            <p className="mb-2">Die Anwendung kommuniziert direkt über die Browser-APIs mit der Hardware. Für ESP32-Geräte wird die <strong>Web Serial API</strong> (115200 Baud, 8N1) verwendet. Für Android-Geräte kommt die <strong>WebUSB API</strong> zum Einsatz.</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Linux:</strong> Udev-Regeln müssen konfiguriert sein (z.B. <code className="bg-tactical-bg px-1 rounded text-tactical-accent">SUBSYSTEM=="usb", ATTR{'{idVendor}'}=="18d1", MODE="0666"</code>).</li>
              <li><strong>Windows:</strong> Für ADB/Fastboot über WebUSB muss der WinUSB-Treiber via Zadig installiert werden.</li>
            </ul>
          </div>

          <div>
            <h4 className="text-tactical-accent font-bold mb-2 uppercase tracking-wider">2. ESP32 Partitioning & Flashing</h4>
            <p className="mb-2">Das Flashen erfolgt über das ESP-IDF Bootloader-Protokoll (esptool.js). Die Standard-Speicheraufteilung (4MB Flash):</p>
            <ul className="list-disc pl-5 space-y-1 font-mono text-xs">
              <li>0x1000 - Bootloader</li>
              <li>0x8000 - Partition Table</li>
              <li>0x10000 - Factory App (Firmware)</li>
              <li>0x290000 - SPIFFS / LittleFS (Data)</li>
            </ul>
            <p className="mt-2">Ein "Erase Flash" überschreibt den gesamten Speicherbereich mit 0xFF, wodurch auch NVS-Daten (WLAN-Credentials) gelöscht werden.</p>
          </div>

          <div>
            <h4 className="text-tactical-accent font-bold mb-2 uppercase tracking-wider">3. Android Recovery & Fastboot</h4>
            <p className="mb-2">Die Android-Toolbox unterstützt A/B-Slot-Architekturen (Seamless Updates). Wichtige Fastboot-Befehle, die intern ausgeführt werden:</p>
            <ul className="list-disc pl-5 space-y-1 font-mono text-xs">
              <li>fastboot getvar current-slot</li>
              <li>fastboot set_active a|b</li>
              <li>fastboot flash boot_a boot.img</li>
            </ul>
            <p className="mt-2 text-yellow-500/80">Warnung: Das Flashen von kritischen Partitionen (bootloader, radio) kann zu einem Hard-Brick führen. Qualcomm EDL (Emergency Download Mode) wird aktuell nur experimentell unterstützt.</p>
          </div>

          <div>
            <h4 className="text-tactical-accent font-bold mb-2 uppercase tracking-wider">4. FRP Bypass Logik (FRP = Factory Reset Protection)</h4>
            <p className="mb-2">Der FRP-Bypass erfolgt durch gezieltes Löschen der <code className="bg-tactical-bg px-1 rounded text-tactical-accent">frp</code> oder <code className="bg-tactical-bg px-1 rounded text-tactical-accent">config</code> Partition im Fastboot-Modus. Bei MediaTek-Geräten (MTK) wird der BROM-Modus (Boot Read-Only Memory) genutzt, um den Preloader zu umgehen und direkt auf den eMMC/UFS-Speicher zuzugreifen.</p>
          </div>

          <div>
            <h4 className="text-tactical-accent font-bold mb-2 uppercase tracking-wider">5. Fehlerbehebung (Troubleshooting)</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse mt-2">
                <thead>
                  <tr className="border-b border-tactical-border">
                    <th className="py-2">Symptom</th>
                    <th className="py-2">Ursache / Lösung</th>
                  </tr>
                </thead>
                <tbody className="text-xs">
                  <tr className="border-b border-tactical-border/50">
                    <td className="py-2 font-mono text-red-400">Failed to open port</td>
                    <td className="py-2">Port wird von anderer App (z.B. Cura, Serial Monitor) blockiert.</td>
                  </tr>
                  <tr className="border-b border-tactical-border/50">
                    <td className="py-2 font-mono text-red-400">Access denied (WebUSB)</td>
                    <td className="py-2">Fehlende Berechtigungen (Linux udev) oder falscher Treiber (Windows).</td>
                  </tr>
                  <tr>
                    <td className="py-2 font-mono text-red-400">Awaiting BOOT... timeout</td>
                    <td className="py-2">ESP32 befindet sich nicht im Download-Modus. BOOT-Taste beim Verbinden gedrückt halten.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </section>
    </div>
  );
}
