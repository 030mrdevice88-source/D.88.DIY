import React from 'react';
import { motion } from 'motion/react';
import { Shield, Cpu, Code2, BookOpen, ExternalLink, Zap, Terminal, Globe, Layers } from 'lucide-react';
import { cn } from '../lib/utils';

const resources = [
  {
    category: "Entwicklungsplattformen (IDEs & Editoren)",
    items: [
      { name: "Arduino IDE", desc: "Der Standard für Anfänger und schnelle Projekte.", icon: <Zap className="text-amber-500" /> },
      { name: "PlatformIO", desc: "Professionelle Umgebung für komplexe Projekte (VS Code Extension).", icon: <Layers className="text-blue-500" /> },
      { name: "Espressif ESP-IDF", desc: "Das offizielle Framework für volle Leistung.", icon: <Cpu className="text-red-500" /> },
      { name: "Thonny IDE", desc: "Beste Wahl für MicroPython-Programmierung.", icon: <Code2 className="text-emerald-500" /> },
      { name: "Visual Studio Code", desc: "Oft genutzt mit PlatformIO oder ESP-IDF.", icon: <Globe className="text-sky-500" /> },
      { name: "Eclipse IDE", desc: "Für fortgeschrittene ESP-IDF Entwicklung.", icon: <Layers className="text-indigo-500" /> }
    ]
  },
  {
    category: "Frameworks, Sprachen & Tools",
    items: [
      { name: "MicroPython", desc: "Python-basiert für schnelle Prototypen.", icon: <Code2 className="text-yellow-500" /> },
      { name: "CircuitPython", desc: "Adafruits Python-Variante.", icon: <Zap className="text-purple-500" /> },
      { name: "Lua (NodeMCU)", desc: "Leichtgewichtige Skriptsprache.", icon: <Terminal className="text-blue-400" /> },
      { name: "ESPHome", desc: "Beste Lösung zur Integration in Home Assistant.", icon: <Globe className="text-emerald-400" /> },
      { name: "ESP-NOW", desc: "Protokoll von Espressif für direkte Verbindung ohne WLAN.", icon: <Zap className="text-orange-500" /> },
      { name: "Espressif Flash Download Tools", desc: "Zum flashen von .bin Dateien.", icon: <Layers className="text-red-400" /> },
      { name: "OpenOCD", desc: "Debugging-Tool für fortgeschrittene Anwender.", icon: <Terminal className="text-slate-400" /> }
    ]
  },
  {
    category: "Bibliotheken & Protokolle",
    items: [
      { name: "PubSubClient", desc: "Standardbibliothek für MQTT.", icon: <Globe className="text-cyan-500" /> },
      { name: "ArduinoJson", desc: "Effiziente JSON-Verarbeitung.", icon: <Code2 className="text-green-500" /> },
      { name: "WiFiManager", desc: "Einfache WLAN-Konfiguration ohne Hardcoding.", icon: <Zap className="text-blue-300" /> },
      { name: "FastLED / Adafruit NeoPixel", desc: "Steuerung von LED-Streifen.", icon: <Layers className="text-pink-500" /> },
      { name: "LVGL", desc: "Grafikbibliothek für Displays.", icon: <Globe className="text-orange-400" /> },
      { name: "AsyncWebServer", desc: "Performanter Webserver für ESP32.", icon: <Terminal className="text-emerald-600" /> }
    ]
  },
  {
    category: "Hardware & Pinouts (Reference)",
    items: [
      { name: "ESP32 Pinout", desc: "38-Pin DevKit V1 Layout & GPIO Mapping.", icon: <Cpu className="text-tactical-accent" /> },
      { name: "ESP32-S3 Pinout", desc: "Dual-Core, AI-Accelerated, USB-Native.", icon: <Cpu className="text-red-500" /> },
      { name: "ESP32-C3 Pinout", desc: "RISC-V Single-Core, Low Power.", icon: <Cpu className="text-blue-500" /> },
      { name: "Partition Tables", desc: "Standard vs. Huge App vs. No OTA Layouts.", icon: <Layers className="text-tactical-muted" /> }
    ]
  },
  {
    category: "Security & Auditing",
    items: [
      { name: "Espressif Security", desc: "Secure Boot & Flash Encryption Docs.", icon: <Shield className="text-emerald-500" /> },
      { name: "WiFi Deauther", desc: "ESP8266/ESP32 Security Testing Tools.", icon: <Zap className="text-red-600" /> },
      { name: "Serial Sniffing", desc: "UART-Analyse & Data-Extraction.", icon: <Terminal className="text-tactical-accent" /> }
    ]
  }
];

const pinouts = [
  {
    name: "ESP32 DevKit V1",
    pins: [
      { pin: "GPIO0", function: "Boot / Flash Mode", type: "Input" },
      { pin: "GPIO1", function: "TX0 (Serial Debug)", type: "Output" },
      { pin: "GPIO2", function: "Built-in LED", type: "Output" },
      { pin: "GPIO3", function: "RX0 (Serial Debug)", type: "Input" },
      { pin: "GPIO21", function: "I2C SDA", type: "I/O" },
      { pin: "GPIO22", function: "I2C SCL", type: "I/O" },
      { pin: "GPIO25", function: "DAC1", type: "Analog" },
      { pin: "GPIO26", function: "DAC2", type: "Analog" },
      { pin: "GPIO34", function: "ADC1_CH6", type: "Analog In" },
      { pin: "GPIO35", function: "ADC1_CH7", type: "Analog In" },
    ]
  },
  {
    name: "ESP32-S3",
    pins: [
      { pin: "GPIO0", function: "Boot Button", type: "Input" },
      { pin: "GPIO1", function: "ADC1_CH0", type: "Analog" },
      { pin: "GPIO2", function: "ADC1_CH1", type: "Analog" },
      { pin: "GPIO17", function: "UART1 TX", type: "Output" },
      { pin: "GPIO18", function: "UART1 RX", type: "Input" },
      { pin: "GPIO19", function: "USB D-", type: "Native USB" },
      { pin: "GPIO20", function: "USB D+", type: "Native USB" },
      { pin: "GPIO43", function: "TX0 (Debug)", type: "Output" },
      { pin: "GPIO44", function: "RX0 (Debug)", type: "Input" },
    ]
  },
  {
    name: "ESP32-C3",
    pins: [
      { pin: "GPIO0", function: "ADC1_CH0", type: "Analog" },
      { pin: "GPIO1", function: "ADC1_CH1", type: "Analog" },
      { pin: "GPIO2", function: "ADC1_CH2 / Boot", type: "Analog/In" },
      { pin: "GPIO3", function: "ADC1_CH3", type: "Analog" },
      { pin: "GPIO8", function: "RGB LED (WS2812)", type: "Output" },
      { pin: "GPIO9", function: "Boot Button", type: "Input" },
      { pin: "GPIO20", function: "RX0", type: "Input" },
      { pin: "GPIO21", function: "TX0", type: "Output" },
    ]
  }
];

const atCommands = [
  { cmd: "AT", desc: "Test connection", resp: "OK" },
  { cmd: "AT+GMR", desc: "View version info", resp: "Version details" },
  { cmd: "AT+CWMODE=1", desc: "Set Station mode", resp: "OK" },
  { cmd: "AT+CWLAP", desc: "List available APs", resp: "List of APs" },
  { cmd: "AT+CIFSR", desc: "Get local IP address", resp: "IP address" },
  { cmd: "AT+RESTORE", desc: "Factory reset", resp: "OK" },
  { cmd: "AT+UART_CUR?", desc: "Check current UART config", resp: "Baudrate, etc." },
  { cmd: "AT+CWJAP=\"SSID\",\"PWD\"", desc: "Connect to WiFi", resp: "OK" },
  { cmd: "AT+CIPSTART=\"TCP\",\"IP\",PORT", desc: "Start TCP connection", resp: "OK" },
];

interface IoTResourcesViewProps {
  onOpenToolbox?: () => void;
}

export default function IoTResourcesView({ onOpenToolbox }: IoTResourcesViewProps) {
  const [selectedPinout, setSelectedPinout] = React.useState(0);

  return (
    <div className="space-y-8 pb-20 overflow-x-hidden">
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-bold tracking-tight text-tactical-accent flex items-center gap-3">
          <BookOpen className="w-8 h-8" /> IoT Development Resources
        </h2>
        <p className="text-tactical-muted text-sm max-w-2xl">
          Umfassende Sammlung von Tools, Frameworks und Plattformen für ESP32 und Mikrocontroller-Entwicklung.
          Optimiert für HAL-FLASH-OS Workflows.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {resources.map((section, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="space-y-4"
              >
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-tactical-muted px-2 border-l-2 border-tactical-accent/30 ml-2">
                  {section.category}
                </h3>
                <div className="space-y-3">
                  {section.items.map((item, i) => (
                    <div 
                      key={`resource-item-${i}`}
                      className="bg-tactical-card border border-tactical-border rounded-2xl p-4 hover:border-tactical-accent/50 transition-all group cursor-pointer"
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 bg-tactical-bg rounded-xl flex items-center justify-center border border-tactical-border group-hover:border-tactical-accent/30 transition-colors shrink-0">
                          {item.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-bold truncate">{item.name}</h4>
                            <ExternalLink size={12} className="text-tactical-muted group-hover:text-tactical-accent transition-colors shrink-0" />
                          </div>
                          <p className="text-[11px] text-tactical-muted mt-1 leading-relaxed">
                            {item.desc}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="space-y-8">
          <div className="bg-tactical-card border border-tactical-border rounded-3xl p-6 space-y-6 sticky top-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-tactical-accent/10 rounded-lg">
                <Cpu className="text-tactical-accent w-5 h-5" />
              </div>
              <h3 className="font-bold uppercase tracking-widest text-sm">Pinout Reference</h3>
            </div>

            <div className="space-y-4">
              <div className="flex gap-2 p-1 bg-tactical-bg rounded-xl border border-tactical-border">
                {pinouts.map((p, i) => (
                  <button
                    key={`pinout-btn-${i}`}
                    onClick={() => setSelectedPinout(i)}
                    className={cn(
                      "flex-1 py-2 text-[10px] font-bold rounded-lg transition-all",
                      selectedPinout === i ? "bg-tactical-accent text-tactical-bg" : "text-tactical-muted hover:text-tactical-text"
                    )}
                  >
                    {p.name}
                  </button>
                ))}
              </div>

              <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                {pinouts[selectedPinout].pins.map((pin, i) => (
                  <div key={`resource-card-${i}`} className="flex items-center justify-between p-3 bg-tactical-bg border border-tactical-border rounded-xl group hover:border-tactical-accent/30 transition-all">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold font-mono">{pin.pin}</span>
                      <span className="text-[9px] text-tactical-muted uppercase font-bold">{pin.type}</span>
                    </div>
                    <span className="text-[10px] font-bold text-tactical-accent group-hover:scale-105 transition-transform">{pin.function}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-6 border-t border-tactical-border space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-tactical-accent/10 rounded-lg">
                  <Terminal className="text-tactical-accent w-5 h-5" />
                </div>
                <h3 className="font-bold uppercase tracking-widest text-sm">Common AT Commands</h3>
              </div>
              <div className="space-y-3">
                {atCommands.map((at, i) => (
                  <div key={`resource-spec-${i}`} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <code className="text-[10px] font-bold text-tactical-accent bg-tactical-bg px-2 py-1 rounded border border-tactical-accent/20">{at.cmd}</code>
                      <span className="text-[9px] text-tactical-muted uppercase font-bold">Res: {at.resp}</span>
                    </div>
                    <p className="text-[10px] text-tactical-muted pl-1">{at.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-tactical-accent/5 border border-tactical-accent/20 rounded-3xl p-6 flex flex-col md:flex-row items-center gap-6">
        <div className="w-16 h-16 bg-tactical-accent/20 rounded-2xl flex items-center justify-center border border-tactical-accent/50 shrink-0">
          <Zap className="text-tactical-accent w-8 h-8" />
        </div>
        <div className="flex-1 text-center md:text-left">
          <h4 className="text-lg font-bold">Bereit für den nächsten Flash?</h4>
          <p className="text-sm text-tactical-muted mt-1">
            Nutze den **ESP32 Toolbox** Tab, um deine Skripte direkt auf die Hardware zu bringen.
            Kombiniere den **Script Generator** mit diesen Ressourcen für maximale Effizienz.
          </p>
        </div>
        <button 
          onClick={onOpenToolbox}
          className="px-6 py-3 bg-tactical-accent text-tactical-bg font-bold rounded-xl uppercase tracking-widest text-xs hover:scale-105 transition-transform"
        >
          Toolbox öffnen
        </button>
      </div>
    </div>
  );
}

