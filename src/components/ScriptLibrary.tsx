import React, { useState, useEffect } from 'react';
import { 
  FileCode, 
  Plus, 
  Play, 
  Trash2, 
  Save, 
  Search, 
  Terminal, 
  Cpu, 
  Smartphone, 
  Code2,
  ChevronRight,
  Download,
  Copy,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface Script {
  id: string;
  name: string;
  description: string;
  type: 'python' | 'shell' | 'javascript' | 'adb' | 'esptool';
  content: string;
  category: 'ESP32' | 'Android' | 'General' | 'Security';
  lastRun?: number;
}

export default function ScriptLibrary() {
  const [scripts, setScripts] = useState<Script[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedScript, setSelectedScript] = useState<Script | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [executionLog, setExecutionLog] = useState<{time: string, msg: string, type: 'info' | 'error' | 'success'}[]>([]);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('hal_scripts');
    if (saved) {
      try {
        setScripts(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load scripts", e);
      }
    } else {
      // Default scripts
      const defaults: Script[] = [
        {
          id: '1',
          name: 'ESP32 Chip Info',
          description: 'Liest Chip-ID und Flash-Größe aus.',
          type: 'esptool',
          content: 'esptool.py --chip esp32 chip_id\nesptool.py --chip esp32 flash_id',
          category: 'ESP32'
        },
        {
          id: '2',
          name: 'Android FRP Check',
          description: 'Prüft FRP-Status via ADB.',
          type: 'adb',
          content: 'adb shell getprop ro.frp.pst\nadb shell content query --uri content://settings/secure --where "name=\'device_provisioned\'"',
          category: 'Android'
        },
        {
          id: '3',
          name: 'Marauder Flash Script',
          description: 'Automatisiertes Flashen von Marauder Firmware.',
          type: 'shell',
          content: '#!/bin/bash\nesptool.py --chip esp32 --port /dev/ttyUSB0 erase_flash\nesptool.py --chip esp32 --port /dev/ttyUSB0 write_flash -z 0x10000 marauder.bin',
          category: 'Security'
        }
      ];
      setScripts(defaults);
      localStorage.setItem('hal_scripts', JSON.stringify(defaults));
    }
  }, []);

  const saveScripts = (newScripts: Script[]) => {
    setScripts(newScripts);
    localStorage.setItem('hal_scripts', JSON.stringify(newScripts));
  };

  const handleCreate = () => {
    const newScript: Script = {
      id: Date.now().toString(),
      name: 'Neues Script',
      description: 'Beschreibung hier...',
      type: 'javascript',
      content: '// Dein Code hier',
      category: 'General'
    };
    saveScripts([...scripts, newScript]);
    setSelectedScript(newScript);
    setIsEditing(true);
  };

  const handleDelete = (id: string) => {
    const filtered = scripts.filter(s => s.id !== id);
    saveScripts(filtered);
    if (selectedScript?.id === id) setSelectedScript(null);
    setShowDeleteConfirm(null);
  };

  const handleRun = async (script: Script) => {
    const time = new Date().toLocaleTimeString();
    setExecutionLog(prev => [{ time, msg: `Starte Execution: ${script.name}`, type: 'info' }, ...prev]);
    
    try {
      const response = await fetch('/api/scripts/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: script.type === 'esptool' ? 'shell' : script.type,
          script: script.content
        })
      });

      const result = await response.json();
      
      if (response.ok) {
        if (result.stdout) {
          setExecutionLog(prev => [{ 
            time: new Date().toLocaleTimeString(), 
            msg: result.stdout, 
            type: 'info' 
          }, ...prev]);
        }
        if (result.stderr) {
          setExecutionLog(prev => [{ 
            time: new Date().toLocaleTimeString(), 
            msg: `Stderr: ${result.stderr}`, 
            type: 'info' 
          }, ...prev]);
        }
        setExecutionLog(prev => [{ 
          time: new Date().toLocaleTimeString(), 
          msg: `Execution beendet (Code: ${result.code}).`, 
          type: result.code === 0 ? 'success' : 'error' 
        }, ...prev]);
        
        const updated = scripts.map(s => s.id === script.id ? { ...s, lastRun: Date.now() } : s);
        saveScripts(updated);
      } else {
        setExecutionLog(prev => [{ 
          time: new Date().toLocaleTimeString(), 
          msg: `Fehler: ${result.error || result.stderr || 'Unbekannter Fehler'}`, 
          type: 'error' 
        }, ...prev]);
      }

    } catch (e) {
      setExecutionLog(prev => [{ time, msg: `Netzwerkfehler: ${String(e)}`, type: 'error' }, ...prev]);
    }
  };

  const filteredScripts = scripts.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    s.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col md:flex-row animate-in fade-in duration-500 h-[800px] md:h-[600px] border border-tactical-border rounded-2xl overflow-hidden">
      {/* Sidebar: Script List */}
      <div className={cn(
        "border-b md:border-b-0 md:border-r border-tactical-border flex flex-col bg-tactical-card/30 transition-all",
        selectedScript ? "hidden md:flex md:w-80" : "w-full md:w-80 h-full md:h-auto"
      )}>
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-[10px] font-bold text-tactical-muted uppercase tracking-widest flex items-center gap-2">
              <FileCode size={14} /> Script_Library
            </h3>
            <button 
              onClick={handleCreate}
              className="p-1.5 bg-tactical-accent/10 border border-tactical-accent/30 text-tactical-accent rounded-lg hover:bg-tactical-accent hover:text-tactical-bg transition-all"
            >
              <Plus size={16} />
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-tactical-muted" size={14} />
            <input 
              type="text" 
              placeholder="Suchen..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-tactical-bg border border-tactical-border rounded-xl pl-9 pr-4 py-2 text-xs focus:border-tactical-accent outline-none"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
          {filteredScripts.map((script) => (
            <button
              key={script.id}
              onClick={() => { setSelectedScript(script); setIsEditing(false); }}
              className={cn(
                "w-full p-3 rounded-xl text-left transition-all group border",
                selectedScript?.id === script.id 
                  ? "bg-tactical-accent/10 border-tactical-accent/30" 
                  : "border-transparent hover:bg-tactical-border/50"
              )}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={cn(
                  "text-[8px] font-bold px-1.5 py-0.5 rounded uppercase",
                  script.type === 'python' ? "bg-blue-500/20 text-blue-400" :
                  script.type === 'adb' ? "bg-emerald-500/20 text-emerald-400" :
                  script.type === 'esptool' ? "bg-orange-500/20 text-orange-400" :
                  "bg-tactical-muted/20 text-tactical-muted"
                )}>
                  {script.type}
                </span>
                {script.lastRun && (
                  <span className="text-[8px] text-tactical-muted">
                    RUN: {new Date(script.lastRun).toLocaleDateString()}
                  </span>
                )}
              </div>
              <p className="text-xs font-bold truncate">{script.name}</p>
              <p className="text-[10px] text-tactical-muted truncate">{script.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Main: Editor / Details */}
      <div className={cn(
        "flex-1 flex flex-col bg-tactical-bg/50",
        !selectedScript && "hidden md:flex"
      )}>
        {selectedScript ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Toolbar */}
            <div className="p-4 border-b border-tactical-border flex items-center justify-between bg-tactical-card/50">
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setSelectedScript(null)}
                  className="md:hidden p-2 hover:bg-tactical-border rounded-lg"
                >
                  <ChevronRight className="w-5 h-5 rotate-180" />
                </button>
                <div className="p-2 bg-tactical-accent/10 rounded-lg">
                  {selectedScript.category === 'ESP32' ? <Cpu className="text-tactical-accent" size={20} /> : 
                   selectedScript.category === 'Android' ? <Smartphone className="text-tactical-accent" size={20} /> :
                   <Code2 className="text-tactical-accent" size={20} />}
                </div>
                <div>
                  <h2 className="text-sm font-bold">{selectedScript.name}</h2>
                  <p className="text-[10px] text-tactical-muted uppercase tracking-widest">{selectedScript.category} | {selectedScript.type}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => handleRun(selectedScript)}
                  className="px-4 py-2 bg-tactical-accent text-tactical-bg font-bold rounded-xl text-[10px] flex items-center gap-2 hover:scale-105 transition-transform"
                >
                  <Play size={14} /> RUN_SCRIPT
                </button>
                <button 
                  onClick={() => setIsEditing(!isEditing)}
                  className="p-2 hover:bg-tactical-border rounded-xl transition-colors"
                  title="Bearbeiten"
                >
                  <Terminal size={18} className={isEditing ? "text-tactical-accent" : "text-tactical-muted"} />
                </button>
                <button 
                  onClick={() => setShowDeleteConfirm(selectedScript.id)}
                  className="p-2 hover:bg-red-500/10 text-red-500/50 hover:text-red-500 rounded-xl transition-colors"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>

            {/* Editor Area */}
            <div className="flex-1 flex overflow-hidden">
              <div className="flex-1 flex flex-col p-6 space-y-6 overflow-y-auto custom-scrollbar">
                {isEditing ? (
                  <div className="space-y-4 animate-in fade-in duration-300">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-tactical-muted uppercase">Name</label>
                        <input 
                          value={selectedScript.name}
                          onChange={(e) => setSelectedScript({ ...selectedScript, name: e.target.value })}
                          className="w-full bg-tactical-card border border-tactical-border rounded-xl px-4 py-2 text-xs focus:border-tactical-accent outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-tactical-muted uppercase">Typ</label>
                        <select 
                          value={selectedScript.type}
                          onChange={(e) => setSelectedScript({ ...selectedScript, type: e.target.value as any })}
                          className="w-full bg-tactical-card border border-tactical-border rounded-xl px-4 py-2 text-xs focus:border-tactical-accent outline-none"
                        >
                          <option value="python">Python</option>
                          <option value="shell">Shell / Bash</option>
                          <option value="javascript">JavaScript</option>
                          <option value="adb">ADB Command</option>
                          <option value="esptool">esptool.py</option>
                        </select>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-tactical-muted uppercase">Beschreibung</label>
                      <input 
                        value={selectedScript.description}
                        onChange={(e) => setSelectedScript({ ...selectedScript, description: e.target.value })}
                        className="w-full bg-tactical-card border border-tactical-border rounded-xl px-4 py-2 text-xs focus:border-tactical-accent outline-none"
                      />
                    </div>
                    <div className="space-y-1 flex-1 flex flex-col min-h-[300px]">
                      <label className="text-[10px] font-bold text-tactical-muted uppercase">Code</label>
                      <textarea 
                        value={selectedScript.content}
                        onChange={(e) => setSelectedScript({ ...selectedScript, content: e.target.value })}
                        className="flex-1 bg-tactical-bg border border-tactical-border rounded-xl p-4 font-mono text-xs focus:border-tactical-accent outline-none resize-none custom-scrollbar"
                      />
                    </div>
                    <button 
                      onClick={() => {
                        const updated = scripts.map(s => s.id === selectedScript.id ? selectedScript : s);
                        saveScripts(updated);
                        setIsEditing(false);
                      }}
                      className="w-full py-3 bg-tactical-accent text-tactical-bg font-bold rounded-xl flex items-center justify-center gap-2"
                    >
                      <Save size={16} /> ÄNDERUNGEN SPEICHERN
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6 animate-in fade-in duration-300">
                    <div className="bg-tactical-card/50 border border-tactical-border rounded-2xl p-6 space-y-4">
                      <div className="flex justify-between items-center">
                        <h3 className="text-[10px] font-bold text-tactical-muted uppercase tracking-widest">Script_Content</h3>
                        <button 
                          onClick={() => {
                            navigator.clipboard.writeText(selectedScript.content);
                            setExecutionLog(prev => [{ time: new Date().toLocaleTimeString(), msg: "Code in Zwischenablage kopiert.", type: 'success' }, ...prev]);
                          }}
                          className="text-tactical-accent hover:underline text-[10px] font-bold flex items-center gap-1"
                        >
                          <Copy size={12} /> COPY_CODE
                        </button>
                      </div>
                      <pre className="bg-black/40 p-4 rounded-xl font-mono text-xs text-tactical-text overflow-x-auto custom-scrollbar">
                        {selectedScript.content}
                      </pre>
                    </div>

                    <div className="bg-tactical-bg/50 border border-tactical-border rounded-2xl p-6 space-y-4">
                      <h3 className="text-[10px] font-bold text-tactical-muted uppercase tracking-widest flex items-center gap-2">
                        <Terminal size={14} /> Execution_Log
                      </h3>
                      <div className="space-y-2 max-h-[200px] overflow-y-auto custom-scrollbar font-mono text-[10px]">
                        {executionLog.length === 0 && (
                          <p className="text-tactical-muted italic opacity-50">Keine Logs vorhanden.</p>
                        )}
                        {executionLog.map((log, i) => (
                          <div key={`exec-log-${i}`} className="flex gap-2">
                            <span className="text-tactical-muted opacity-50">[{log.time}]</span>
                            <span className={cn(
                              log.type === 'error' ? "text-red-500" :
                              log.type === 'success' ? "text-emerald-500" :
                              "text-tactical-text"
                            )}>
                              {log.msg}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-tactical-muted">
            <div className="text-center space-y-4 opacity-50">
              <FileCode size={48} className="mx-auto" />
              <p className="text-sm font-mono tracking-widest uppercase">Wähle ein Script aus oder erstelle ein neues</p>
            </div>
          </div>
        )}
      </div>
      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-tactical-card border border-tactical-border rounded-3xl p-8 max-w-md w-full space-y-6 shadow-2xl"
            >
              <div className="flex items-center gap-4 text-red-500">
                <div className="p-3 bg-red-500/10 rounded-2xl">
                  <Trash2 size={32} />
                </div>
                <h3 className="text-xl font-bold">Script löschen?</h3>
              </div>
              <p className="text-tactical-muted text-sm leading-relaxed">
                Sind Sie sicher, dass Sie dieses Script unwiderruflich aus Ihrer Bibliothek löschen möchten?
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowDeleteConfirm(null)}
                  className="flex-1 py-3 bg-tactical-bg border border-tactical-border rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-tactical-border transition-colors"
                >
                  Abbrechen
                </button>
                <button 
                  onClick={() => handleDelete(showDeleteConfirm)}
                  className="flex-1 py-3 bg-red-500 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-red-600 transition-colors"
                >
                  Löschen
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
