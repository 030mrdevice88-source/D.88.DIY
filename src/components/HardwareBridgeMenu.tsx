import React, { useState } from 'react';
import { 
  Activity, 
  Terminal, 
  Zap, 
  RefreshCw, 
  ShieldCheck, 
  Power, 
  Settings, 
  Play, 
  Trash2, 
  ChevronRight,
  Database,
  Search,
  Cpu,
  Smartphone,
  Wifi,
  Globe
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type BridgeTab = 'esp-toolbox' | 'android-toolbox' | 'hardware' | 'emobility';

interface HardwareBridgeMenuProps {
  activeTab: BridgeTab;
  devices: any[];
  onAction: (action: string, params?: any) => void;
  status: 'online' | 'offline' | 'checking';
}

export default function HardwareBridgeMenu({ 
  activeTab, 
  devices, 
  onAction,
  status 
}: HardwareBridgeMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  const getTabIcon = () => {
    switch (activeTab) {
      case 'esp-toolbox': return <Cpu className="w-4 h-4" />;
      case 'android-toolbox': return <Smartphone className="w-4 h-4" />;
      case 'hardware': return <Zap className="w-4 h-4" />;
      case 'emobility': return <Activity className="w-4 h-4" />;
      default: return <Settings className="w-4 h-4" />;
    }
  };

  const getTabLabel = () => {
    switch (activeTab) {
      case 'esp-toolbox': return 'ESP32_CONTROL';
      case 'android-toolbox': return 'ANDROID_RECOVERY';
      case 'hardware': return 'ORCHESTRATOR_CORE';
      case 'emobility': return 'E-MOBILITY_SUITE';
      default: return 'HARDWARE_BRIDGE';
    }
  };

  return (
    <div className="fixed bottom-24 md:bottom-6 right-4 md:right-6 z-50 flex flex-col items-end gap-4">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="w-[calc(100vw-2rem)] sm:w-80 bg-tactical-card border border-tactical-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[500px]"
          >
            {/* Header */}
            <div className="p-4 border-b border-tactical-border bg-tactical-bg/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-tactical-accent/20 rounded-lg text-tactical-accent">
                  {getTabIcon()}
                </div>
                <div>
                  <h3 className="text-[10px] font-bold uppercase tracking-widest">{getTabLabel()}</h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <div className={cn(
                      "w-1.5 h-1.5 rounded-full",
                      status === 'online' ? "bg-emerald-500 animate-pulse" : 
                      status === 'checking' ? "bg-yellow-500" : "bg-red-500"
                    )} />
                    <span className="text-[8px] text-tactical-muted font-bold uppercase tracking-tighter">Bridge: {status}</span>
                  </div>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="p-1.5 hover:bg-tactical-border rounded-lg transition-colors">
                <ChevronRight className="w-4 h-4 rotate-90" />
              </button>
            </div>

            {/* Monitoring Section */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
              <div className="space-y-2">
                <h4 className="text-[8px] font-bold text-tactical-muted uppercase tracking-widest">Live_Monitoring</h4>
                <div className="grid grid-cols-2 gap-2">
                  <MonitorStat label="DEVICES" value={devices.length.toString()} icon={<Database size={10} />} />
                  <MonitorStat label="UPTIME" value="02:45:12" icon={<RefreshCw size={10} />} />
                  {activeTab === 'esp-toolbox' && (
                    <>
                      <MonitorStat label="BAUD" value="115200" icon={<Zap size={10} />} />
                      <MonitorStat label="TEMP" value="42°C" icon={<Activity size={10} />} />
                    </>
                  )}
                  {activeTab === 'android-toolbox' && (
                    <>
                      <MonitorStat label="MODE" value="ADB" icon={<Smartphone size={10} />} />
                      <MonitorStat label="FRP" value="LOCKED" icon={<ShieldCheck size={10} />} />
                    </>
                  )}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="space-y-2">
                <h4 className="text-[8px] font-bold text-tactical-muted uppercase tracking-widest">Quick_Execution</h4>
                <div className="space-y-1">
                  {activeTab === 'esp-toolbox' && (
                    <>
                      <ActionButton label="REBOOT_DEVICE" icon={<RefreshCw size={12} />} onClick={() => onAction('reboot')} />
                      <ActionButton label="ERASE_FLASH" icon={<Trash2 size={12} />} variant="danger" onClick={() => onAction('erase')} />
                      <ActionButton label="START_MONITOR" icon={<Terminal size={12} />} onClick={() => onAction('monitor')} />
                    </>
                  )}
                  {activeTab === 'android-toolbox' && (
                    <>
                      <ActionButton label="REBOOT_BOOTLOADER" icon={<RefreshCw size={12} />} onClick={() => onAction('reboot-bootloader')} />
                      <ActionButton label="GET_PROPS" icon={<Search size={12} />} onClick={() => onAction('get-props')} />
                      <ActionButton label="ADB_KILL_SERVER" icon={<Power size={12} />} variant="danger" onClick={() => onAction('kill-adb')} />
                    </>
                  )}
                  {activeTab === 'hardware' && (
                    <>
                      <ActionButton label="FIRST_CONTACT_DISCOVERY" icon={<Search size={12} />} onClick={() => onAction('first-contact')} />
                      <ActionButton label="SCAN_USB_BRIDGE" icon={<Search size={12} />} onClick={() => onAction('scan-usb')} />
                      <ActionButton label="SCAN_WLAN_NETS" icon={<Wifi size={12} />} onClick={() => onAction('scan-wlan')} />
                      <ActionButton label="HAL_GLOBAL_RESET" icon={<Power size={12} />} variant="danger" onClick={() => onAction('hal-reset')} />
                    </>
                  )}
                  {activeTab === 'emobility' && (
                    <>
                      <ActionButton label="READ_CONTROLLER" icon={<Activity size={12} />} onClick={() => onAction('read-controller')} />
                      <ActionButton label="CLEAR_DTC_ERRORS" icon={<Trash2 size={12} />} onClick={() => onAction('clear-errors')} />
                      <ActionButton label="STRATEGY_SEARCH" icon={<Search size={12} />} onClick={() => onAction('search')} />
                    </>
                  )}
                </div>
              </div>

              {/* Logs Preview */}
              <div className="space-y-2">
                <h4 className="text-[8px] font-bold text-tactical-muted uppercase tracking-widest">Bridge_Logs</h4>
                <div className="bg-black/40 rounded-xl p-3 font-mono text-[8px] space-y-1 h-24 overflow-y-auto custom-scrollbar">
                  <div className="text-tactical-accent/60">[INFO] Bridge connection stable.</div>
                  <div className="text-tactical-muted">[DEBUG] Polling hardware layer...</div>
                  <div className="text-emerald-500/60">[SUCCESS] Handshake complete.</div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-tactical-border bg-tactical-bg/30 flex justify-between items-center">
              <span className="text-[8px] font-bold text-tactical-muted uppercase tracking-widest">HAL-FLASH-OS v2.0</span>
              <button 
                onClick={() => onAction('hal-reset')}
                className="p-1.5 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all"
                title="Emergency Reset"
              >
                <Power size={12} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-14 h-14 rounded-2xl shadow-2xl flex items-center justify-center transition-all duration-300 group relative overflow-hidden",
          isOpen ? "bg-tactical-card border border-tactical-border rotate-90" : "bg-tactical-accent text-tactical-bg hover:scale-110"
        )}
      >
        <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
        {isOpen ? <ChevronRight className="w-6 h-6" /> : getTabIcon()}
        {!isOpen && (
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-tactical-bg flex items-center justify-center">
            <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
          </div>
        )}
      </button>
    </div>
  );
}

function MonitorStat({ label, value, icon }: { label: string, value: string, icon: React.ReactNode }) {
  return (
    <div className="bg-tactical-bg/50 border border-tactical-border rounded-xl p-2 flex flex-col gap-1">
      <div className="flex items-center gap-1.5 text-tactical-muted">
        {icon}
        <span className="text-[7px] font-bold uppercase tracking-widest">{label}</span>
      </div>
      <span className="text-[10px] font-mono font-bold text-tactical-text">{value}</span>
    </div>
  );
}

function ActionButton({ label, icon, onClick, variant = 'default' }: { label: string, icon: React.ReactNode, onClick: () => void, variant?: 'default' | 'danger' }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center justify-between p-2 rounded-xl text-[9px] font-bold transition-all group",
        variant === 'danger' 
          ? "bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white" 
          : "bg-tactical-bg border border-tactical-border hover:border-tactical-accent hover:text-tactical-accent"
      )}
    >
      <div className="flex items-center gap-2">
        {icon}
        <span>{label}</span>
      </div>
      <ChevronRight size={10} className="opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-1" />
    </button>
  );
}
