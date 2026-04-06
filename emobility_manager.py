{
  "device_recognition": {
    "protocols": [
      "USB-CDC",
      "CAN-Bus",
      "Bluetooth 5.0",
      "Modbus"
    ],
    "signature_patterns": {
      "e-scooter": {
        "vendor_id": "0x2341",
        "product_id": "0x0043",
        "serial_prefix": "SCOOTER_",
        "firmware_signature": "ESP32_EMOBILITY"
      },
      "e-bike": {
        "vendor_id": "0x1234",
        "product_id": "0x5678",
        "serial_prefix": "BIKE_",
        "firmware_signature": "BMS_2.0"
      },
      "e-boatsmotor": {
        "vendor_id": "0x8765",
        "product_id": "0x4321",
        "serial_prefix": "BOAT_",
        "firmware_signature": "MARINE_CONTROLLER"
      }
    }
  },
  "engineering_mode": {
    "activation_sequences": {
      "e-scooter": {
        "preconditions": [
          "Batteriespannung > 36V",
          "Firmware > v2.3.0"
        ],
        "commands": [
          "SEND 0x55 0xAA 0x12 0x34",
          "SET_DEBUG_MODE ON",
          "REBOOT_CONTROLLER"
        ],
        "validation": {
          "expected_response": "DEBUG MODE ACTIVATED",
          "timeout": 5000
        }
      },
      "e-bike": {
        "preconditions": [
          "Drehmomentsensor kalibriert",
          "CAN-Bus aktiv"
        ],
        "commands": [
          "WRITE 0x0001 0x00FF",
          "ACTIVATE_ENGINEERING",
          "READ_CALIBRATION"
        ],
        "validation": {
          "expected_response": "ENGINEERING MODE ENABLED",
          "timeout": 3000
        }
      },
      "e-boatsmotor": {
        "preconditions": [
          "Isolationsprüfung bestanden",
          "Kühlkreislauf aktiv"
        ],
        "commands": [
          "SET_DIAGNOSTIC 1",
          "ACTIVATE_SERVICE_MODE",
          "READ_SENSOR_VALUES"
        ],
        "validation": {
          "expected_response": "SERVICE MODE ACTIVE",
          "timeout": 7000
        }
      }
    }
  },
  "firmware_upgrades": {
    "supported_versions": {
      "e-scooter": {
        "current": "v2.4.1",
        "latest": "v2.5.0",
        "upgrade_path": [
          "https://firmware.emobility.com/escooter/v2.4.1_to_v2.5.0.bin",
          "https://firmware.emobility.com/escooter/v2.5.0_checksum.sha256"
        ]
      },
      "e-bike": {
        "current": "v1.8.2",
        "latest": "v1.9.1",
        "upgrade_path": [
          "https://firmware.emobility.com/ebike/v1.8.2_to_v1.9.1.bin",
          "https://firmware.emobility.com/ebike/v1.9.1_checksum.sha256"
        ]
      }
    }
  }
}

