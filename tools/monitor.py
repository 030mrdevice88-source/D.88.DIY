#!/usr/bin/env python3
"""
Monitoring-System für MITM Tool
"""

import time
import json
import os
from datetime import datetime

class ToolMonitor:
    def __init__(self):
        self.metrics = {
            'connections': 0,
            'exploits_blocked': 0,
            'exploits_executed': 0,
            'fallback_activations': 0,
            'system_health': 100
        }
    
    def collect_metrics(self):
        """Sammelt System-Metriken (Simuliert)"""
        metrics = {
            'timestamp': datetime.now().isoformat(),
            'cpu_percent': 15.5,
            'memory_percent': 42.1,
            'disk_usage': 12.8,
            'network_connections': 4,
            'process_count': 120
        }
        
        return {**self.metrics, **metrics}
    
    def alert_system(self, threshold=80):
        """Sendet Alarme bei kritischen Werten"""
        metrics = self.collect_metrics()
        
        alerts = []
        if metrics['cpu_percent'] > threshold:
            alerts.append(f"CPU Auslastung hoch: {metrics['cpu_percent']}%")
        
        if metrics['memory_percent'] > threshold:
            alerts.append(f"Speicher hoch: {metrics['memory_percent']}%")
        
        if metrics['fallback_activations'] > 3:
            alerts.append(f"Viele Fallbacks: {metrics['fallback_activations']}")
        
        return alerts

# Monitoring Loop
if __name__ == "__main__":
    monitor = ToolMonitor()
    print("Starting Tool Monitor...")
    
    while True:
        metrics = monitor.collect_metrics()
        alerts = monitor.alert_system()
        
        if alerts:
            print(f"[ALERT] {datetime.now()}")
            for alert in alerts:
                print(f"  ⚠️  {alert}")
        else:
            print(f"[{datetime.now()}] System Healthy - CPU: {metrics['cpu_percent']}% MEM: {metrics['memory_percent']}%")
        
        time.sleep(60)  # Alle 60 Sekunden prüfen
