import React, { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { Wifi, Shield, RefreshCw, Play, X, ChevronDown, ChevronUp, Activity, Crosshair, Wrench, TerminalSquare } from 'lucide-react';
import { cn } from '../lib/utils';

interface FloatingNetworkWidgetProps {
  isConnected: boolean;
  connections: { id: string; name: string; type: string; status: string; ip?: string; latency?: string }[];
  onAction?: (action: string, payload?: string) => void;
}

export const FloatingNetworkWidget = React.memo(function FloatingNetworkWidget({ isConnected, connections, onAction }: FloatingNetworkWidgetProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [showToolsMenu, setShowToolsMenu] = useState(false);
  const widgetRef = useRef<HTMLDivElement>(null);

  if (!isConnected) return null;

  return (
    <motion.div
      drag
      dragMomentum={false}
      initial={{ opacity: 0, scale: 0.9, y: 50 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      className={cn(
        "hidden md:flex fixed bottom-24 right-6 z-50 bg-tactical-card/90 backdrop-blur-md border border-tactical-border rounded-xl shadow-2xl overflow-hidden flex-col",
        isMinimized ? "w-64 h-auto" : "w-80 min-h-[300px] resize"
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
          <Activity className="w-4 h-4 text-emerald-500" />
          <span className="text-xs font-bold uppercase tracking-widest text-tactical-muted">Netzwerk_Diagnose</span>
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
          {/* Current Connections */}
          <div className="space-y-2">
            <h4 className="text-[10px] font-bold text-tactical-muted uppercase tracking-widest flex items-center gap-1">
              <Activity size={12} /> Active_Connections
            </h4>
            <div className="space-y-1">
              {connections.length > 0 ? (
                connections.map(conn => (
                  <div key={conn.id} className="flex flex-col p-2 bg-tactical-bg/50 border border-tactical-border rounded text-xs gap-1">
                    <div className="flex items-center justify-between">
                      <span className="font-mono truncate font-bold text-tactical-accent">{conn.name}</span>
                      <span className="text-[10px] text-emerald-500 font-bold uppercase">{conn.status}</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-tactical-muted font-mono">
                      <span>IP: {conn.ip || 'N/A'}</span>
                      <span>Ping: {conn.latency || '--'}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-xs text-tactical-muted italic p-2">No active connections.</div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-auto space-y-2 pt-4 border-t border-tactical-border">
            {/* Tools Menu */}
            <div className="relative">
              <button 
                onClick={() => setShowToolsMenu(!showToolsMenu)}
                className="w-full flex items-center justify-center gap-2 p-2 bg-tactical-accent/10 border border-tactical-accent/30 text-tactical-accent rounded hover:bg-tactical-accent/20 transition-colors text-xs font-bold uppercase"
              >
                <Wrench size={14} /> Netzwerk-Tools
              </button>
              
              {showToolsMenu && (
                <div className="absolute bottom-full left-0 w-full mb-2 bg-tactical-bg border border-tactical-border rounded-lg shadow-xl overflow-hidden z-10">
                  {['Ping', 'Traceroute', 'Port-Scan', 'Diagnose-Skripte', 'Eigene Skripte'].map(tool => (
                    <button 
                      key={tool}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-tactical-accent/10 hover:text-tactical-accent border-b border-tactical-border/50 last:border-0 transition-colors"
                      onClick={() => {
                        if (onAction) onAction('tool', tool);
                        setShowToolsMenu(false);
                      }}
                    >
                      {tool}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <button 
                className="w-full flex items-center justify-center gap-2 p-2 bg-tactical-card border border-tactical-border text-tactical-muted rounded hover:text-tactical-accent hover:border-tactical-accent/50 transition-colors text-[10px] font-bold uppercase"
                onClick={() => onAction && onAction('reconnect')}
              >
                <RefreshCw size={12} /> Reconnect / DHCP-Renew
              </button>
              <button 
                className="w-full flex items-center justify-center gap-2 p-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 rounded hover:bg-emerald-500/20 transition-colors text-[10px] font-bold uppercase"
                onClick={() => onAction && onAction('scenario')}
              >
                <TerminalSquare size={12} /> Szenario ausführen
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
});

export default FloatingNetworkWidget;
