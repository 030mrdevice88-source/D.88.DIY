#!/bin/bash
# Setup-Skript für MITM Tool

echo "=== MITM Tool Setup ==="
echo ""

# 1. Abhängigkeiten installieren
echo "[1] Installiere Abhängigkeiten..."
# In dieser Umgebung simulieren wir die Installation
# apt-get update
# apt-get install -y python3 python3-pip nodejs npm
# pip3 install flask requests

# 2. Verzeichnisse erstellen
echo "[2] Erstelle Verzeichnisstruktur..."
mkdir -p ./logs
mkdir -p ./cache
mkdir -p ./backups

# 3. Dateien kopieren (Simuliert)
echo "[3] Kopiere Dateien..."

# 4. DNS-Spoofing einrichten (Simuliert)
echo "[4] Konfiguriere DNS-Spoofing..."

# 5. Systemd Service erstellen (Simuliert)
echo "[5] Erstelle Systemd Service..."

# 6. Firewall konfigurieren (Simuliert)
echo "[6] Konfiguriere Firewall..."

# 7. Hotspot einrichten (Simuliert)
echo "[7] Richte Hotspot ein..."

# 8. Berechtigungen setzen
echo "[8] Setze Berechtigungen..."
chmod +x ./mitm_tool.py

echo ""
echo "=== Setup abgeschlossen (Simuliert) ==="
echo ""
echo "Zugriff auf das Tool:"
echo "  - Web Interface: http://localhost:8080"
echo "  - Logs: ./logs/"
echo ""
echo "Verbinde Smartphone B mit WLAN: Free_Public_WiFi"
echo "Passwort: 12345678"
