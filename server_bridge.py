from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import platform
import os
import usb.core
from context_manager import ContextManager
from emobility_manager import EMobilityManager
from atze_manager import AtzeManager

app = FastAPI(title="Omni-Installer Bridge API")
ctx = ContextManager()
em = EMobilityManager()
atze = AtzeManager()

# CORS erlauben für das Web-Interface
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {
        "status": "online",
        "platform": platform.system(),
        "is_android": "ANDROID_DATA" in os.environ,
        "vault_status": "active"
    }

@app.get("/health")
def health_check():
    return {"status": "ok", "bridge": "Python/FastAPI", "platform": platform.system()}

@app.get("/emobility/read")
def em_read(vtype: str, cid: str):
    return em.read_controller(vtype, cid)

@app.post("/emobility/write")
def em_write(vtype: str, cid: str, data: dict):
    return em.write_controller(vtype, cid, data)

@app.get("/emobility/strategy")
def em_strategy(q: str):
    return em.get_strategy(q)

@app.get("/atze/extract")
def atze_extract(url: str):
    return atze.extract_content(url)

@app.get("/atze/rules")
def atze_rules():
    return {"rules": atze.get_bypass_rules()}

@app.get("/context/query")
def query_context(q: str):
    return {"results": ctx.query_context(q)}

@app.post("/context/save")
def save_to_vault(category: str, title: str, content: str):
    try:
        path = ctx.save_knowledge(category, title, content)
        return {"status": "success", "path": path}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/emobility/manager")
def em_manager(data: dict):
    action = data.get("action")
    if action == "read_controller":
        return em.read_controller("e-scooter", "CONTROLLER_001")
    elif action == "write_config":
        return em.write_controller("e-scooter", "CONTROLLER_001", data.get("config", {}))
    elif action == "clear_errors":
        return em.delete_logs("CONTROLLER_001")
    else:
        raise HTTPException(status_code=400, detail="Invalid action")

@app.get("/hardware/usb")
def list_usb_devices():
    try:
        devices = []
        for dev in usb.core.find(find_all=True):
            devices.append({
                "idVendor": hex(dev.idVendor),
                "idProduct": hex(dev.idProduct),
                "bus": dev.bus,
                "address": dev.address
            })
        return {"devices": devices}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/hardware/wlan")
def list_wlan_networks():
    # Simuliert einen WLAN Scan über die Bridge
    return {
        "networks": [
            {"ssid": "Taktikal_AP_01", "signal": -45, "security": "WPA3"},
            {"ssid": "Guest_Net", "signal": -72, "security": "WPA2"},
            {"ssid": "IoT_Bridge_Alpha", "signal": -58, "security": "WPA2-Enterprise"}
        ]
    }

@app.post("/agent/install")
def trigger_install():
    # In einer echten Umgebung würde dies den Installer-Prozess starten
    return {"message": "Installation-Prozess im Hintergrund gestartet."}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
