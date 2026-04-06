import React, { useState, useRef, useEffect } from 'react';
import { Upload, Play, X, Zap, Terminal, RefreshCw, HardDrive } from 'lucide-react';
import { ESPLoader, Transport } from 'esptool-js';
import { cn } from '../lib/utils';
import TerminalComponent from './TerminalComponent';

import { HardwareDevice } from '../types';

interface FlashPart {
  file: File;
  offset: number;
}

interface WebSerialFlasherProps {
  devices?: HardwareDevice[];
  onFlash?: (id: string, files: {file: File, offset: number}[]) => Promise<void>;
  onUpdateDevice?: (device: HardwareDevice) => void;
  brickProtection?: boolean;
}

export function WebSerialFlasher({ 
  devices = [], 
  onFlash, 
  onUpdateDevice,
  brickProtection = true 
}: WebSerialFlasherProps) {
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('web-serial');
  const [targetModel, setTargetModel] = useState<string>('ESP32');
  const [parts, setParts] = useState<FlashPart[]>([]);
  const [baudRate, setBaudRate] = useState<number>(115200);
  const [isFlashing, setIsFlashing] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<{ time: string; data: string; type: 'in' | 'out' }[]>([]);
  const [chipName, setChipName] = useState<string>('');
  const [showWarning, setShowWarning] = useState(false);
  
  const portRef = useRef<any | null>(null);
  const transportRef = useRef<Transport | null>(null);
  const espLoaderRef = useRef<ESPLoader | null>(null);

  const addLog = (msg: string, type: 'in' | 'out' = 'in') => {
    setLogs(prev => [...prev, { time: new Date().toLocaleTimeString(), data: msg, type }]);
  };

  const handleConnect = async () => {
    try {
      const nav = navigator as any;
      if (!nav.serial) {
        addLog('Web Serial API wird nicht unterstützt.\r\n');
        return;
      }

      const port = await nav.serial.requestPort();
      portRef.current = port;
      
      const transport = new Transport(port, true);
      transportRef.current = transport;
      
      const loader = new ESPLoader({
        transport,
        baudrate: baudRate,
        romBaudrate: 115200,
        terminal: {
          clean: () => {},
          writeLine: (data) => addLog(data + '\r\n'),
          write: (data) => addLog(data)
        }
      });
      
      espLoaderRef.current = loader;
      
      addLog(`Verbinde mit ${baudRate} baud...\r\n`);
      await loader.main();
      
      const detectedChip = loader.chip.CHIP_NAME;
      setChipName(detectedChip);
      setIsConnected(true);
      addLog(`Verbunden mit: ${detectedChip}\r\n`);

      // Update the device in parent state if it's a known device
      if (selectedDeviceId !== 'web-serial' && onUpdateDevice) {
        const device = devices.find(d => d.id === selectedDeviceId);
        if (device) {
          onUpdateDevice({
            ...device,
            chipType: detectedChip,
            details: `${device.details || ''}, Chip: ${detectedChip}`.replace(/^, /, '')
          });
        }
      }
      
    } catch (err: any) {
      addLog(`Verbindungsfehler: ${err.message}\r\n`);
      setIsConnected(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      if (transportRef.current) {
        await transportRef.current.disconnect();
      }
      if (portRef.current) {
        await portRef.current.close();
      }
    } catch (err: any) {
      addLog(`Trennungsfehler: ${err.message}\r\n`);
    } finally {
      setIsConnected(false);
      portRef.current = null;
      transportRef.current = null;
      espLoaderRef.current = null;
      setChipName('');
      addLog('Getrennt.\r\n');
    }
  };

  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const newFiles = Array.from(e.dataTransfer.files).filter(f => f.name.endsWith('.bin'));
      if (newFiles.length === 0) return;
      
      setParts(prev => {
        const nextParts = [...prev];
        newFiles.forEach((file) => {
          let offset = 0x10000;
          const name = file.name.toLowerCase();
          if (name.includes('bootloader')) offset = 0x1000;
          else if (name.includes('partition')) offset = 0x8000;
          else if (name.includes('app') || name.includes('firmware')) offset = 0x10000;
          
          nextParts.push({ file, offset });
        });
        return nextParts;
      });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      setParts(prev => {
        const nextParts = [...prev];
        newFiles.forEach((file) => {
          // Try to guess offset based on filename
          let offset = 0x10000;
          const name = file.name.toLowerCase();
          if (name.includes('bootloader')) offset = 0x1000;
          else if (name.includes('partition')) offset = 0x8000;
          else if (name.includes('app') || name.includes('firmware')) offset = 0x10000;
          
          nextParts.push({ file, offset });
        });
        return nextParts;
      });
      // Reset input value so the same files can be selected again if needed
      e.target.value = '';
    }
  };

  const updateOffset = (index: number, offsetStr: string) => {
    const offset = parseInt(offsetStr, 16) || 0;
    setParts(prev => {
      const newParts = [...prev];
      newParts[index].offset = offset;
      return newParts;
    });
  };

  const removePart = (index: number) => {
    setParts(prev => prev.filter((_, i) => i !== index));
  };

  const handleFlash = async (force: boolean = false) => {
    if (parts.length === 0) return;

    if (!force && brickProtection && chipName && targetModel) {
      const isMatch = chipName.toLowerCase().includes(targetModel.toLowerCase()) || 
                      targetModel.toLowerCase().includes(chipName.toLowerCase());
      
      if (!isMatch) {
        setShowWarning(true);
        return;
      }
    }

    setShowWarning(false);
    
    if (selectedDeviceId !== 'web-serial') {
      if (!onFlash) return;
      setIsFlashing(true);
      setProgress(0);
      addLog(`Starte Flash-Vorgang für Gerät ${selectedDeviceId}...\r\n`);
      
      try {
        await onFlash(selectedDeviceId, parts);
        setProgress(100);
        addLog('\r\nFlash-Vorgang erfolgreich abgeschlossen!\r\n');
      } catch (err: any) {
        addLog(`\r\nFlash-Fehler: ${err.message}\r\n`);
      } finally {
        setIsFlashing(false);
      }
      return;
    }

    if (!espLoaderRef.current) return;
    
    setIsFlashing(true);
    setProgress(0);
    addLog('Starte Flash-Vorgang...\r\n');

    try {
      const fileArray: { data: string; address: number }[] = [];
      
      for (const part of parts) {
        const buffer = await part.file.arrayBuffer();
        // Convert ArrayBuffer to binary string
        let binary = '';
        const bytes = new Uint8Array(buffer);
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        fileArray.push({ data: binary, address: part.offset });
      }

      await espLoaderRef.current.writeFlash({
        fileArray,
        flashSize: 'keep',
        flashMode: 'keep',
        flashFreq: 'keep',
        eraseAll: false,
        compress: true,
        reportProgress: (fileIndex, written, total) => {
          const percent = Math.round((written / total) * 100);
          setProgress(percent);
        }
      });

      addLog('\r\nFlash-Vorgang erfolgreich abgeschlossen!\r\n');
      
      // Hard reset after flashing
      addLog('Führe Hard-Reset durch...\r\n');
      await espLoaderRef.current.after('hard_reset');
      
    } catch (err: any) {
      addLog(`\r\nFlash-Fehler: ${err.message}\r\n`);
    } finally {
      setIsFlashing(false);
    }
  };

  return (
    <div className="bg-tactical-card border border-tactical-border rounded-2xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <Zap className="text-tactical-accent" /> 
          Web Serial Flasher
        </h3>
        <div className="flex items-center gap-2">
          {devices && devices.length > 0 && (
            <select
              value={selectedDeviceId}
              onChange={(e) => setSelectedDeviceId(e.target.value)}
              disabled={isConnected || isFlashing}
              className="bg-tactical-bg border border-tactical-border rounded px-2 py-1 text-xs focus:outline-none"
            >
              <option value="web-serial">Direct Web Serial</option>
              {devices.map(d => (
                <option key={d.id} value={d.id}>{d.name} ({d.id})</option>
              ))}
            </select>
          )}
          <select 
            value={baudRate} 
            onChange={(e) => setBaudRate(Number(e.target.value))}
            disabled={isConnected || selectedDeviceId !== 'web-serial'}
            className="bg-tactical-bg border border-tactical-border rounded px-2 py-1 text-xs focus:outline-none"
          >
            <option value={9600}>9600</option>
            <option value={115200}>115200</option>
            <option value={460800}>460800</option>
            <option value={921600}>921600</option>
          </select>
          <select 
            value={targetModel} 
            onChange={(e) => setTargetModel(e.target.value)}
            disabled={isFlashing}
            className="bg-tactical-bg border border-tactical-border rounded px-2 py-1 text-xs focus:outline-none"
          >
            <option value="ESP32">ESP32</option>
            <option value="ESP32-S2">ESP32-S2</option>
            <option value="ESP32-S3">ESP32-S3</option>
            <option value="ESP32-C3">ESP32-C3</option>
            <option value="ESP32-C6">ESP32-C6</option>
            <option value="ESP32-H2">ESP32-H2</option>
          </select>
          {selectedDeviceId === 'web-serial' && (
            isConnected ? (
              <button 
                onClick={handleDisconnect}
                className="px-3 py-1 bg-red-500/20 text-red-500 border border-red-500/30 rounded text-xs font-bold hover:bg-red-500 hover:text-white transition-colors"
              >
                DISCONNECT
              </button>
            ) : (
              <button 
                onClick={handleConnect}
                className="px-3 py-1 bg-tactical-accent/20 text-tactical-accent border border-tactical-accent/30 rounded text-xs font-bold hover:bg-tactical-accent hover:text-tactical-bg transition-colors"
              >
                CONNECT
              </button>
            )
          )}
        </div>
      </div>

      {isConnected && (
        <div className="p-3 bg-tactical-bg border border-tactical-border rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-sm font-bold">Verbunden: {chipName}</span>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-tactical-muted uppercase tracking-widest">Binaries</span>
          <label className="cursor-pointer px-3 py-1 bg-tactical-bg border border-tactical-border rounded text-xs font-bold hover:border-tactical-accent transition-colors flex items-center gap-2">
            <Upload size={14} />
            HINZUFÜGEN
            <input type="file" accept=".bin" multiple className="hidden" onChange={handleFileChange} />
          </label>
        </div>

        {parts.length === 0 ? (
          <label 
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={cn(
              "block p-8 border-2 border-dashed rounded-2xl text-center cursor-pointer transition-all group",
              isDragging 
                ? "border-tactical-accent bg-tactical-accent/5" 
                : "border-tactical-border hover:border-tactical-accent"
            )}
          >
            <HardDrive className={cn(
              "w-8 h-8 mx-auto mb-2 transition-all",
              isDragging ? "text-tactical-accent opacity-100 scale-110" : "text-tactical-muted opacity-20 group-hover:opacity-50 group-hover:text-tactical-accent"
            )} />
            <p className={cn(
              "text-xs italic transition-colors",
              isDragging ? "text-tactical-accent" : "text-tactical-muted group-hover:text-tactical-accent"
            )}>
              {isDragging ? "Dateien hier ablegen..." : "Klicke hier oder ziehe .bin Dateien hierher, um sie hinzuzufügen."}
            </p>
            <input type="file" accept=".bin" multiple className="hidden" onChange={handleFileChange} />
          </label>
        ) : (
          <div 
            className={cn(
              "space-y-2 p-2 border-2 border-dashed rounded-xl transition-all",
              isDragging 
                ? "border-tactical-accent bg-tactical-accent/5" 
                : "border-transparent"
            )}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {parts.map((part, index) => (
              <div key={index} className="flex items-center gap-3 p-3 bg-tactical-bg border border-tactical-border rounded-xl">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold truncate">{part.file.name}</p>
                  <p className="text-[10px] text-tactical-muted">{(part.file.size / 1024).toFixed(1)} KB</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-tactical-muted font-mono">0x</span>
                  <input 
                    type="text" 
                    value={part.offset.toString(16)}
                    onChange={(e) => updateOffset(index, e.target.value)}
                    className="w-20 bg-tactical-card border border-tactical-border rounded px-2 py-1 text-xs font-mono focus:outline-none focus:border-tactical-accent"
                  />
                  <button onClick={() => removePart(index)} className="p-1 text-red-500 hover:bg-red-500/10 rounded transition-colors">
                    <X size={14} />
                  </button>
                </div>
              </div>
            ))}
            {isDragging && (
              <div className="p-4 border-2 border-dashed border-tactical-accent/50 rounded-xl text-center bg-tactical-accent/10">
                <p className="text-xs text-tactical-accent font-bold">Dateien hier ablegen, um sie hinzuzufügen</p>
              </div>
            )}
          </div>
        )}
      </div>

      {showWarning && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl space-y-3">
          <div className="flex items-center gap-2 text-red-500">
            <Zap size={16} />
            <span className="text-xs font-bold uppercase tracking-widest">Brick-Schutz Warnung</span>
          </div>
          <p className="text-[10px] text-red-500/80 leading-relaxed">
            Der erkannte Chip (**{chipName}**) stimmt nicht mit dem ausgewählten Ziel-Modell (**{targetModel}**) überein. 
            Das Flashen von inkompatibler Firmware kann das Gerät dauerhaft beschädigen.
          </p>
          <div className="flex gap-2">
            <button 
              onClick={() => setShowWarning(false)}
              className="px-3 py-1 bg-tactical-bg border border-tactical-border rounded text-[10px] font-bold hover:bg-tactical-border transition-colors"
            >
              ABBRECHEN
            </button>
            <button 
              onClick={() => handleFlash(true)}
              className="px-3 py-1 bg-red-500 text-white rounded text-[10px] font-bold hover:bg-red-600 transition-colors"
            >
              TROTZDEM FLASHEN
            </button>
          </div>
        </div>
      )}

      <button 
        onClick={() => handleFlash()}
        disabled={(selectedDeviceId === 'web-serial' && !isConnected) || parts.length === 0 || isFlashing}
        className={cn(
          "w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all",
          ((selectedDeviceId !== 'web-serial') || isConnected) && parts.length > 0 && !isFlashing
            ? "bg-tactical-accent text-tactical-bg hover:scale-[1.02]"
            : "bg-tactical-bg border border-tactical-border text-tactical-muted cursor-not-allowed"
        )}
      >
        {isFlashing ? (
          <>
            <RefreshCw className="animate-spin" size={18} />
            FLASHING... {progress}%
          </>
        ) : (
          <>
            <Play size={18} />
            FLASH STARTEN
          </>
        )}
      </button>

      {isFlashing && (
        <div className="h-1 bg-tactical-bg rounded-full overflow-hidden">
          <div 
            className="h-full bg-tactical-accent transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      <div className="h-48 border border-tactical-border rounded-xl overflow-hidden">
        <TerminalComponent 
          logs={logs} 
          onData={() => {}} 
        />
      </div>
    </div>
  );
}
