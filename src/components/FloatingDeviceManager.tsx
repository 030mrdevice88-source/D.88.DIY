import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Usb, Bluetooth, Cpu, ChevronDown, ChevronUp, Activity, Power, Smartphone, Zap } from 'lucide-react';
import { cn } from '../lib/utils';
import { HardwareDevice } from '../types';

interface FloatingDeviceManagerProps {
  devices: HardwareDevice[];
  onDisconnect: (id: string) => void;
}

export const FloatingDeviceManager = React.memo(function FloatingDeviceManager({ devices, onDisconnect }: FloatingDeviceManagerProps) {
  const [isMinimized, setIsMinimized] = useState(false);

  if (devices.length === 0) return null;

  const getIcon = (type: string) => {
    switch (type) {
      case 'usb': return <Usb size={14} className="text-blue-400" />;
      case 'bluetooth': return <Bluetooth size={14} className="text-indigo-400" />;
      case 'serial': return <Cpu size={14} className="text-emerald-400" />;
      case 'adb': return <Smartphone size={14} className="text-emerald-500" />;
      case 'fastboot': return <Zap size={14} className="text-emerald-500" />;
      case 'mtk': return <Cpu size={14} className="text-emerald-500" />;
      case 'edl': return <Cpu size={14} className="text-red-500" />;
      default: return <Activity size={14} className="text-tactical-accent" />;
    }
  };

  return (
    <motion.div
      drag
      dragMomentum={false}
      initial={{ opacity: 0, scale: 0.9, y: 50 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      className={cn(
        "hidden md:flex fixed top-24 right-6 z-50 bg-tactical-card/90 backdrop-blur-md border border-tactical-border rounded-xl shadow-2xl overflow-hidden flex-col",
        isMinimized ? "w-64 h-auto" : "w-80 min-h-[250px] resize"
      )}
      style={{ 
        resize: isMinimized ? 'none' : 'both',
        minWidth: '250px',
        minHeight: isMinimized ? 'auto' : '200px',
        maxWidth: '90vw',
        maxHeight: '90vh'
      }}
    >
      {/* Drag Handle & Header */}
      <div className="flex items-center justify-between p-3 bg-tactical-bg/50 border-b border-tactical-border cursor-grab active:cursor-grabbing">
        <div className="flex items-center gap-2 pointer-events-none">
          <Usb className="w-4 h-4 text-tactical-accent" />
          <span className="text-xs font-bold uppercase tracking-widest text-tactical-muted">Hardware_Manager</span>
        </div>
        <div className="flex items-center gap-1">
          <button 
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 hover:bg-tactical-accent/20 rounded text-tactical-muted hover:text-tactical-accent transition-colors"
          >
            {isMinimized ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      {/* Content */}
      {!isMinimized && (
        <div className="flex-1 flex flex-col p-4 gap-4 overflow-y-auto custom-scrollbar">
          <div className="space-y-2">
            <h4 className="text-[10px] font-bold text-tactical-muted uppercase tracking-widest flex items-center gap-1">
              <Activity size={12} /> Active_Interfaces
            </h4>
            <div className="space-y-2">
              {devices.map(device => (
                <div key={device.id} className="flex flex-col p-2 bg-tactical-bg/50 border border-tactical-border rounded text-xs gap-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getIcon(device.type)}
                      <span className="font-mono truncate font-bold text-tactical-accent max-w-[120px]">{device.name}</span>
                    </div>
                    <span className="text-[10px] text-emerald-500 font-bold uppercase">{device.status}</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-tactical-muted font-mono border-t border-tactical-border/50 pt-2">
                    <span className="truncate max-w-[100px]" title={device.id}>ID: {device.id.substring(0, 8)}...</span>
                    <button
                      onClick={() => onDisconnect(device.id)}
                      className="flex items-center gap-1 px-2 py-1 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded transition-colors uppercase font-bold"
                    >
                      <Power size={10} /> Trennen
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
});

export default FloatingDeviceManager;
