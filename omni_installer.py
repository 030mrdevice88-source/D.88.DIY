import os
import sys
import platform
import subprocess
import shutil

class OmniAgentInstaller:
    def __init__(self):
        self.os_type = platform.system()
        self.is_android = "ANDROID_DATA" in os.environ
        self.dependencies = ["python", "pip", "git", "curl", "android-tools-adb"]
        self.python_libs = ["pyusb", "python-dotenv", "mega.py", "fastapi", "uvicorn", "esptool", "requests", "beautifulsoup4"]

    def check_hardware(self):
        print(f"[*] Prüfe Hardware-Umgebung auf {self.os_type}...")
        if self.is_android:
            print("[!] Android erkannt (Honeywell/Smartphone). Prüfe Termux-USB...")
            # Versuche termux-usb zu finden (für WebUSB/Hardware-Bridge)
            if not shutil.which("termux-usb"):
                print("[?] Tipp: Installiere 'termux-api' für USB-Zugriff!")
        
        # Prüfe USB-Controller Zugriff
        try:
            import usb.core
            devices = list(usb.core.find(find_all=True))
            print(f"[+] {len(devices)} USB-Geräte erkannt.")
        except Exception as e:
            print(f"[-] USB-Zugriff eingeschränkt: {e}")

    def auto_install(self):
        print("[*] Starte automatische Installation der Creator Suite...")
        
        # System-Pakete
        if self.is_android:
            subprocess.run("pkg update && pkg install -y python git libusb clang android-tools", shell=True)
        elif self.os_type == "Linux":
            subprocess.run("sudo apt update && sudo apt install -y python3-pip libusb-1.0-0-dev android-tools-adb", shell=True)

        # Python-Bibliotheken
        for lib in self.python_libs:
            subprocess.run([sys.executable, "-m", "pip", "install", lib])

    def setup_local_llm(self):
        print("[*] Konfiguriere lokales Modell (Ollama)...")
        if shutil.which("ollama"):
            print("[+] Ollama bereits installiert.")
        else:
            if self.is_android:
                print("[!] Auf Android: Bitte 'ollama' via pkg installieren.")
            else:
                subprocess.run("curl -fsSL https://ollama.com | sh", shell=True)

    def run_agent(self):
        self.check_hardware()
        self.auto_install()
        self.setup_local_llm()
        print("\n[✔] Installation abgeschlossen! Creator Suite ist einsatzbereit.")

if __name__ == "__main__":
    installer = OmniAgentInstaller()
    installer.run_agent()
