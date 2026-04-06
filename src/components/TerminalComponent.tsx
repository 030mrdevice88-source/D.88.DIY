import React, { useEffect, useRef } from 'react';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';

interface TerminalComponentProps {
  logs: { time: string, data: string, type: 'in' | 'out' }[];
  onData?: (data: string) => void;
  isAutoScroll?: boolean;
}

export default function TerminalComponent({ logs, onData, isAutoScroll = true }: TerminalComponentProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);

  const lastLogRef = useRef<any>(null);

  const onDataRef = useRef(onData);
  useEffect(() => {
    onDataRef.current = onData;
  }, [onData]);

  useEffect(() => {
    if (!terminalRef.current) return;

    const term = new XTerm({
      cursorBlink: true,
      fontSize: 10,
      fontFamily: 'JetBrains Mono, monospace',
      theme: {
        background: '#00000000',
        foreground: '#00FF00',
        cursor: '#00FF00',
      },
      allowTransparency: true,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    
    const safeFit = () => {
      try {
        const term = xtermRef.current;
        const fitAddon = fitAddonRef.current;
        const container = terminalRef.current;

        if (!term || !term.element || !fitAddon || !container) return;
        
        // Ensure container is visible and has dimensions
        if (!container.offsetParent || container.offsetWidth <= 0 || container.offsetHeight <= 0) return;
        
        // Prevent "Cannot read properties of undefined (reading 'dimensions')"
        const core = (term as any)._core;
        if (!core || !core._renderService || !core._renderService.dimensions) return;

        // Standard fit call
        fitAddon.fit();
      } catch (e) {
        // Catch any remaining errors to prevent app crash
        console.warn('HAL-FLASH-OS: Terminal fit suppressed:', e);
      }
    };

    term.open(terminalRef.current);
    
    // PATCH: Prevent xterm.js "Cannot read properties of undefined (reading 'dimensions')"
    // This happens because xterm.js has async callbacks (setTimeout/requestAnimationFrame)
    // that fire after the terminal is disposed, accessing the disposed renderer.
    try {
      const core = (term as any)._core;
      if (core && core._renderService) {
        Object.defineProperty(core._renderService, 'dimensions', {
          get: function() {
            try {
              if (!this._renderer || !this._renderer.value) {
                return {
                  css: { canvas: { width: 0, height: 0 }, cell: { width: 0, height: 0 } },
                  device: { canvas: { width: 0, height: 0 }, cell: { width: 0, height: 0 }, char: { width: 0, height: 0, left: 0, top: 0 } }
                };
              }
              return this._renderer.value.dimensions;
            } catch (e) {
              return {
                css: { canvas: { width: 0, height: 0 }, cell: { width: 0, height: 0 } },
                device: { canvas: { width: 0, height: 0 }, cell: { width: 0, height: 0 }, char: { width: 0, height: 0, left: 0, top: 0 } }
              };
            }
          }
        });
      }
    } catch (e) {
      console.warn('HAL-FLASH-OS: Failed to patch xterm.js renderer:', e);
    }
    
    // Use a small timeout to ensure DOM is ready before initial fit
    const initialFitTimeout = setTimeout(safeFit, 100);

    xtermRef.current = term;
    fitAddonRef.current = fitAddon;

    term.onData(data => {
      onDataRef.current?.(data);
    });

    const resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(safeFit);
    });
    
    if (terminalRef.current) {
      resizeObserver.observe(terminalRef.current);
    }

    const handleResize = () => safeFit();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();
      clearTimeout(initialFitTimeout);
      term.dispose();
      xtermRef.current = null;
      fitAddonRef.current = null;
    };
  }, []);

  useEffect(() => {
    const term = xtermRef.current;
    if (!term || !term.element || !term.textarea) return;
    
    if (logs.length === 0) {
      try {
        term.clear();
      } catch (e) {
        console.warn('HAL-FLASH-OS: Terminal clear deferred:', e);
      }
      lastLogRef.current = null;
      return;
    }

    let startIndex = 0;
    if (lastLogRef.current) {
      const idx = logs.indexOf(lastLogRef.current);
      if (idx !== -1) {
        startIndex = idx + 1;
      } else {
        // If the last log is not found (e.g., array was sliced beyond it),
        // we clear the terminal and print all current logs to stay in sync.
        try {
          term.clear();
        } catch (e) {
          console.warn('HAL-FLASH-OS: Terminal clear deferred:', e);
        }
        startIndex = 0;
      }
    }

    const newLogs = logs.slice(startIndex);
    
    try {
      newLogs.forEach(log => {
        if (log.type === 'out') {
          term.writeln(`\x1b[33m>> ${log.data}\x1b[0m`);
        } else {
          term.write(log.data);
        }
      });
      
      if (logs.length > 0) {
        lastLogRef.current = logs[logs.length - 1];
      }
      
      if (isAutoScroll) {
        term.scrollToBottom();
      }
    } catch (e) {
      console.warn('HAL-FLASH-OS: Terminal write deferred due to renderer state:', e);
    }
  }, [logs, isAutoScroll]);

  return (
    <div ref={terminalRef} className="w-full h-full bg-black/40 rounded-lg p-2 border border-tactical-border/30 overflow-hidden" />
  );
}
