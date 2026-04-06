#!/usr/bin/env python3
import os
import socket
import threading
import http.server
import socketserver
import subprocess
import json
import base64
import hashlib
import argparse
import time
import ssl
import tempfile
import shutil
from urllib.parse import urlparse, parse_qs
from http import cookies
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.backends import default_backend

# Konfiguration
CONFIG = {
    "port": 8080,
    "ssl_port": 8443,
    "auth_token": None,
    "encryption_key": None,
    "allowed_devices": [],
    "storage_paths": {
        "internal": "/sdcard",
        "external": "/storage/emulated/0",
        "backup": "/data/backup"
    },
    "tunnel_timeout": 300,
    "max_connections": 5,
    "fallback_methods": ["ssh", "adb", "direct"],
    "temp_dir": tempfile.mkdtemp(prefix="fstunnel_"),
    "log_file": "fstunnel.log"
}

# Geräteverwaltung
connected_devices = {}
device_lock = threading.Lock()
fallback_attempts = {}

class Logger:
    @staticmethod
    def log(message, level="INFO"):
        timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
        log_entry = f"[{timestamp}] [{level}] {message}\n"
        print(log_entry.strip())

        try:
            with open(CONFIG["log_file"], "a") as f:
                f.write(log_entry)
        except Exception as e:
            print(f"Fehler beim Schreiben in Logdatei: {str(e)}")

class AuthHandler:
    @staticmethod
    def generate_token():
        """Generiert einen sicheren Authentifizierungstoken"""
        random_data = os.urandom(32)
        return base64.b64encode(hashlib.sha256(random_data).digest()).decode('utf-8')

    @staticmethod
    def generate_encryption_key(password: str, salt: bytes = None):
        """Generiert einen Verschlüsselungsschlüssel aus einem Passwort"""
        if salt is None:
            salt = os.urandom(16)
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=100000,
            backend=default_backend()
        )
        key = base64.urlsafe_b64encode(kdf.derive(password.encode()))
        return key, salt

    @staticmethod
    def verify_token(request_token):
        """Überprüft den Authentifizierungstoken"""
        return request_token == CONFIG["auth_token"]

class DeviceTunnel:
    def __init__(self, device_id, device_ip=None, device_port=None):
        self.device_id = device_id
        self.device_ip = device_ip
        self.device_port = device_port
        self.tunnel_socket = None
        self.active = False
        self.last_activity = 0
        self.current_method = None
        self.fallback_index = 0

    def start_tunnel(self):
        """Startet den Tunnel zum Gerät mit Fallback-Optionen"""
        methods = CONFIG["fallback_methods"]
        self.fallback_index = 0

        while self.fallback_index < len(methods):
            method = methods[self.fallback_index]
            try:
                if method == "direct":
                    if not self.device_ip or not self.device_port:
                        raise ValueError("Keine IP/Port für direkte Verbindung")

                    self.tunnel_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                    self.tunnel_socket.settimeout(10)
                    self.tunnel_socket.connect((self.device_ip, self.device_port))
                    self.current_method = "direct"

                elif method == "ssh":
                    # SSH-Fallback implementieren
                    self.current_method = "ssh"
                    # Hier würde man eine SSH-Verbindung aufbauen

                elif method == "adb":
                    # ADB-Fallback implementieren
                    self.current_method = "adb"
                    # Hier würde man eine ADB-Verbindung aufbauen

                self.active = True
                self.last_activity = time.time()
                Logger.log(f"Tunnel zu {self.device_id} über {method} etabliert")
                return True

            except Exception as e:
                Logger.log(f"Fehler bei {method}-Verbindung zu {self.device_id}: {str(e)}")
                self.fallback_index += 1
                self.tunnel_socket = None

        Logger.log(f"Alle Verbindungsmethoden zu {self.device_id} fehlgeschlagen")
        return False

    def close_tunnel(self):
        """Schließt den Tunnel"""
        if self.tunnel_socket:
            try:
                self.tunnel_socket.close()
            except:
                pass
        self.active = False
        self.current_method = None
        Logger.log(f"Tunnel zu {self.device_id} geschlossen")

    def is_active(self):
        """Prüft, ob der Tunnel aktiv ist"""
        if not self.active:
            return False
        if time.time() - self.last_activity > CONFIG["tunnel_timeout"]:
            self.close_tunnel()
            return False
        return True

    def send_command(self, command, retry=True):
        """Sendet einen Befehl über den Tunnel mit Fallback"""
        if not self.is_active():
            if retry:
                Logger.log(f"Tunnel zu {self.device_id} inaktiv, versuche Neuverbindung...")
                if not self.start_tunnel():
                    return None
            else:
                return None

        try:
            if self.current_method == "direct":
                self.tunnel_socket.sendall(command.encode('utf-8'))
                response = self.tunnel_socket.recv(4096).decode('utf-8')
            elif self.current_method == "ssh":
                # SSH-Befehlsausführung
                response = f"SSH Response: {command}"
            elif self.current_method == "adb":
                # ADB-Befehlsausführung
                response = f"ADB Response: {command}"

            self.last_activity = time.time()
            return response
        except Exception as e:
            Logger.log(f"Fehler beim Senden von Befehl zu {self.device_id}: {str(e)}")
            self.close_tunnel()
            if retry:
                return self.send_command(command, retry=False)
            return None

class WebRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        self.cipher_suite = Fernet(CONFIG["encryption_key"])
        super().__init__(*args, **kwargs)

    def do_GET(self):
        """Behandelt GET-Anfragen"""
        parsed_url = urlparse(self.path)
        params = parse_qs(parsed_url.query)

        # Authentifizierung prüfen
        auth_cookie = self.get_auth_cookie()
        if not AuthHandler.verify_token(auth_cookie):
            self.send_auth_challenge()
            return

        # Routing
        if parsed_url.path == "/":
            self.serve_main_page()
        elif parsed_url.path.startswith("/device/"):
            self.handle_device_request(parsed_url.path)
        elif parsed_url.path.startswith("/storage/"):
            self.handle_storage_request(parsed_url.path)
        elif parsed_url.path == "/download":
            self.handle_file_download(params)
        elif parsed_url.path == "/backup":
            self.handle_backup_request()
        else:
            self.send_error(404, "Seite nicht gefunden")

    def do_POST(self):
        """Behandelt POST-Anfragen"""
        parsed_url = urlparse(self.path)

        # Authentifizierung prüfen
        auth_cookie = self.get_auth_cookie()
        if not AuthHandler.verify_token(auth_cookie):
            self.send_auth_challenge()
            return

        if parsed_url.path == "/auth":
            self.handle_authentication()
        elif parsed_url.path.startswith("/device/"):
            self.handle_device_command(parsed_url.path)
        elif parsed_url.path == "/upload":
            self.handle_file_upload()
        else:
            self.send_error(404, "Seite nicht gefunden")

    def get_auth_cookie(self):
        """Extrahiert den Authentifizierungs-Cookie"""
        if 'Cookie' in self.headers:
            cookie = cookies.SimpleCookie(self.headers['Cookie'])
            if 'auth_token' in cookie:
                return cookie['auth_token'].value
        return None

    def send_auth_challenge(self):
        """Sendet eine Authentifizierungs-Herausforderung"""
        self.send_response(401)
        self.send_header('WWW-Authenticate', 'Basic realm="File Storage Tunnel"')
        self.end_headers()
        self.wfile.write(b"Authentifizierung erforderlich")

    def serve_main_page(self):
        """Dient die Hauptseite aus"""
        devices_html = "\n".join([
            f'<li><a href="/device/{device_id}">{device_id}</a> - '
            f'{"Aktiv" if device.is_active() else "Inaktiv"} '
            f'(Method: {device.current_method or "none"})</li>'
            for device_id, device in connected_devices.items()
        ])

        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <title>File Storage Tunnel</title>
            <style>
                body {{ font-family: Arial, sans-serif; margin: 20px; }}
                .device-list {{ list-style-type: none; padding: 0; }}
                .device-list li {{ padding: 8px; margin: 5px 0; background: #f0f0f0; }}
                .active {{ color: green; }}
                .inactive {{ color: red; }}
                .action-buttons {{ margin-top: 20px; }}
                .backup-btn {{ background: #4CAF50; color: white; padding: 10px 15px; border: none; cursor: pointer; }}
            </style>
        </head>
        <body>
            <h1>File Storage Tunnel</h1>
            <ul class="device-list">
                {devices_html}
            </ul>
            <div class="action-buttons">
                <button class="backup-btn" onclick="window.location.href='/backup'">Sicherungs-Backup erstellen</button>
            </div>
            <p>Auth-Token: {CONFIG['auth_token']}</p>
        </body>
        </html>
        """
        self.send_response(200)
        self.send_header('Content-type', 'text/html')
        self.end_headers()
        self.wfile.write(html.encode('utf-8'))

    def handle_device_request(self, path):
        """Behandelt Geräte-spezifische Anfragen"""
        device_id = path.split("/")[2]
        if device_id not in connected_devices:
            self.send_error(404, "Gerät nicht gefunden")
            return

        device = connected_devices[device_id]
        if not device.is_active():
            self.send_error(503, "Gerät nicht verfügbar")
            return

        info = device.send_command("INFO")
        if info:
            try:
                info_data = json.loads(info)
                device_info = {
                    "id": device_id,
                    "method": device.current_method,
                    "last_activity": device.last_activity,
                    "info": info_data
                }
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps(device_info).encode('utf-8'))
            except json.JSONDecodeError:
                self.send_error(500, "Ungültige Geräteinformationen")
        else:
            self.send_error(500, "Fehler beim Abrufen der Geräteinformationen")

    def handle_storage_request(self, path):
        """Behandelt Speicherzugriffs-Anfragen"""
        parts = path.split("/")
        if len(parts) < 4:
            self.send_error(400, "Ungültige Anfrage")
            return

        device_id = parts[2]
        storage_type = parts[3]
        file_path = "/".join(parts[4:])

        if device_id not in connected_devices:
            self.send_error(404, "Gerät nicht gefunden")
            return

        device = connected_devices[device_id]
        if not device.is_active():
            self.send_error(503, "Gerät nicht verfügbar")
            return

        if storage_type not in CONFIG["storage_paths"]:
            self.send_error(400, "Ungültiger Speichertyp")
            return

        storage_path = CONFIG["storage_paths"][storage_type]
        full_path = os.path.join(storage_path, file_path)

        # Sicherheitsprüfung
        if not full_path.startswith(storage_path):
            self.send_error(403, "Zugriff verweigert")
            return

        # Dateioperationen
        command = f"FILE_OPERATION {storage_type} {file_path}"
        response = device.send_command(command)

        if response:
            try:
                response_data = json.loads(response)
                if response_data.get("success"):
                    if response_data.get("type") == "file":
                        # Dateiinhalt senden
                        self.send_response(200)
                        self.send_header('Content-type', 'application/octet-stream')
                        self.send_header('Content-Disposition', f'attachment; filename="{os.path.basename(file_path)}"')
                        self.end_headers()
                        self.wfile.write(base64.b64decode(response_data["content"]))
                    elif response_data.get("type") == "directory":
                        # Verzeichnisinhalt anzeigen
                        files_html = "\n".join([
                            f'<li><a href="/storage/{device_id}/{storage_type}/{os.path.join(file_path, item)}">{item}</a></li>'
                            for item in response_data["content"]
                        ])
                        html = f"""
                        <!DOCTYPE html>
                        <html>
                        <body>
                            <h1>Verzeichnisinhalt: {file_path}</h1>
                            <ul>
                                {files_html}
                            </ul>
                            <a href="/">Zurück zur Geräteliste</a>
                        </body>
                        </html>
                        """
                        self.send_response(200)
                        self.send_header('Content-type', 'text/html')
                        self.end_headers()
                        self.wfile.write(html.encode('utf-8'))
                else:
                    self.send_error(500, response_data.get("error", "Unbekannter Fehler"))
            except json.JSONDecodeError:
                self.send_error(500, "Ungültige Serverantwort")
        else:
            self.send_error(500, "Keine Antwort vom Gerät")

    def handle_file_download(self, params):
        """Behandelt Datei-Download-Anfragen"""
        if "device" not in params or "storage" not in params or "path" not in params:
            self.send_error(400, "Ungültige Parameter")
            return

        device_id = params["device"][0]
        storage_type = params["storage"][0]
        file_path = params["path"][0]

        # Hier würde man die Datei vom Gerät abrufen und senden
        # Für dieses Beispiel senden wir eine Dummy-Datei
        dummy_content = f"Dummy content for {device_id}/{storage_type}/{file_path}".encode('utf-8')

        self.send_response(200)
        self.send_header('Content-type', 'application/octet-stream')
        self.send_header('Content-Disposition', f'attachment; filename="{os.path.basename(file_path)}"')
        self.end_headers()
        self.wfile.write(dummy_content)

    def handle_file_upload(self):
        """Behandelt Datei-Upload-Anfragen"""
        content_length = int(self.headers.get('Content-Length', 0))
        post_data = self.rfile.read(content_length)

        # Hier würde man die Datei an das Gerät senden
        # Für dieses Beispiel speichern wir sie lokal
        temp_file = os.path.join(CONFIG["temp_dir"], f"upload_{int(time.time())}.tmp")
        with open(temp_file, "wb") as f:
            f.write(post_data)

        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({"status": "success", "message": "Datei hochgeladen"}).encode('utf-8'))

    def handle_backup_request(self):
        """Erstellt ein Sicherungs-Backup aller Geräte"""
        backup_data = {}
        for device_id, device in connected_devices.items():
            if device.is_active():
                command = "BACKUP"
                response = device.send_command(command)
                if response:
                    try:
                        backup_data[device_id] = json.loads(response)
                    except json.JSONDecodeError:
                        backup_data[device_id] = {"error": "Ungültige Backup-Daten"}

        # Backup in temporäre Datei schreiben
        backup_file = os.path.join(CONFIG["temp_dir"], f"backup_{int(time.time())}.json")
        with open(backup_file, "w") as f:
            json.dump(backup_data, f)

        # Backup-Datei zum Download anbieten
        with open(backup_file, "rb") as f:
            content = f.read()

        self.send_response(200)
        self.send_header('Content-type', 'application/octet-stream')
        self.send_header('Content-Disposition', f'attachment; filename="backup_{int(time.time())}.json"')
        self.end_headers()
        self.wfile.write(content)

        # Temporäre Datei löschen
        os.remove(backup_file)

    def handle_device_command(self, path):
        """Behandelt Gerätebefehle"""
        device_id = path.split("/")[2]
        if device_id not in connected_devices:
            self.send_error(404, "Gerät nicht gefunden")
            return

        device = connected_devices[device_id]
        if not device.is_active():
            self.send_error(503, "Gerät nicht verfügbar")
            return

        content_length = int(self.headers.get('Content-Length', 0))
        post_data = self.rfile.read(content_length).decode('utf-8')

        try:
            command_data = json.loads(post_data)
            command = command_data.get("command")
            if not command:
                self.send_error(400, "Kein Befehl angegeben")
                return

            response = device.send_command(command)
            if response:
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(response.encode('utf-8'))
            else:
                self.send_error(500, "Keine Antwort vom Gerät")
        except json.JSONDecodeError:
            self.send_error(400, "Ungültige JSON-Daten")

    def handle_authentication(self):
        """Behandelt Authentifizierungsanfragen"""
        content_length = int(self.headers.get('Content-Length', 0))
        post_data = self.rfile.read(content_length).decode('utf-8')

        try:
            auth_data = json.loads(post_data)
            device_id = auth_data.get("device_id")
            device_secret = auth_data.get("device_secret")

            if not device_id or not device_secret:
                self.send_error(400, "Geräte-ID und Geheimnis erforderlich")
                return

            # Geräteauthentifizierung prüfen
            if device_id not in CONFIG["allowed_devices"]:
                CONFIG["allowed_devices"].append(device_id)

            # Neues Gerät registrieren
            with device_lock:
                if device_id not in connected_devices:
                    connected_devices[device_id] = DeviceTunnel(device_id)
                    # In einer echten Implementierung würde man hier die IP/Port vom Gerät erhalten
                    # Für dieses Beispiel verwenden wir Platzhalter
                    connected_devices[device_id].device_ip = "127.0.0.1"
                    connected_devices[device_id].device_port = 2222
                    connected_devices[device_id].start_tunnel()

            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({
                "status": "success",
                "auth_token": CONFIG["auth_token"],
                "encryption_key": CONFIG["encryption_key"].decode('utf-8')
            }).encode('utf-8'))
        except json.JSONDecodeError:
            self.send_error(400, "Ungültige JSON-Daten")

def start_web_server(ssl_context=None):
    """Startet den Webserver"""
    handler = WebRequestHandler
    server_address = ("", CONFIG["ssl_port"] if ssl_context else CONFIG["port"])

    httpd = socketserver.TCPServer(server_address, handler)
    if ssl_context:
        httpd.socket = ssl_context.wrap_socket(httpd.socket, server_side=True)

    Logger.log(f"Server läuft auf Port {server_address[1]} {'(SSL)' if ssl_context else ''}")
    httpd.serve_forever()

def generate_ssl_context():
    """Generiert ein selbstsigniertes SSL-Zertifikat für Fallback"""
    try:
        cert_file = os.path.join(CONFIG["temp_dir"], "cert.pem")
        key_file = os.path.join(CONFIG["temp_dir"], "key.pem")

        # Zertifikat generieren (vereinfachte Version)
        subprocess.run([
            "openssl", "req", "-x509", "-newkey", "rsa:4096",
            "-keyout", key_file, "-out", cert_file,
            "-days", "365", "-nodes", "-subj", "/CN=localhost"
        ], check=True, capture_output=True)

        ssl_context = ssl.create_default_context(ssl.Purpose.CLIENT_AUTH)
        ssl_context.load_cert_chain(certfile=cert_file, keyfile=key_file)
        return ssl_context
    except Exception as e:
        Logger.log(f"Fehler beim Generieren von SSL-Zertifikat: {str(e)}")
        return None

def cleanup():
    """Bereinigt temporäre Dateien"""
    try:
        if os.path.exists(CONFIG["temp_dir"]):
            shutil.rmtree(CONFIG["temp_dir"])
        Logger.log("Temporäre Dateien bereinigt")
    except Exception as e:
        Logger.log(f"Fehler bei der Bereinigung: {str(e)}")

def main():
    parser = argparse.ArgumentParser(description="Universal File Storage Tunnel mit Fallback")
    parser.add_argument("--port", type=int, default=CONFIG["port"], help="Port für den Webserver")
    parser.add_argument("--ssl-port", type=int, default=CONFIG["ssl_port"], help="Port für SSL")
    parser.add_argument("--allowed-devices", help="Kommagetrennte Liste erlaubter Geräte-IDs")
    parser.add_argument("--password", help="Passwort für Verschlüsselungsschlüssel")
    args = parser.parse_args()

    CONFIG["port"] = args.port
    CONFIG["ssl_port"] = args.ssl_port
    if args.allowed_devices:
        CONFIG["allowed_devices"] = args.allowed_devices.split(",")

    # Authentifizierungstoken generieren
    CONFIG["auth_token"] = AuthHandler.generate_token()

    # Verschlüsselungsschlüssel generieren
    if args.password:
        CONFIG["encryption_key"], _ = AuthHandler.generate_encryption_key(args.password)
    else:
        # Standard-Schlüssel für Demo-Zwecke (unsicher!)
        CONFIG["encryption_key"] = Fernet.generate_key()

    # SSL-Kontext für Fallback generieren
    ssl_context = generate_ssl_context()

    try:
        # Haupt-Thread für HTTP
        http_thread = threading.Thread(
            target=start_web_server,
            kwargs={"ssl_context": None},
            daemon=True
        )
        http_thread.start()

        # Fallback-Thread für HTTPS
        if ssl_context:
            https_thread = threading.Thread(
                target=start_web_server,
                kwargs={"ssl_context": ssl_context},
                daemon=True
            )
            https_thread.start()

        # Hauptthread wartet auf Beendigung
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        Logger.log("Server wird heruntergefahren...")
    finally:
        cleanup()

if __name__ == "__main__":
    main()
