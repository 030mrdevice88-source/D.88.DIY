import React from 'react';

export interface SystemInstruction {
  id: string;
  title: string;
  content: string;
  category?: string;
  lastUsed?: number;
}

export interface Agent {
  id: string;
  name: string;
  desc: string;
  icon?: React.ReactNode;
  status?: 'ready' | 'running' | 'error';
  role?: string;
  description?: string;
  skills?: string[];
  systemInstruction?: string;
  capabilities?: string[];
}

export interface Skill {
  id: string;
  name: string;
  content: string;
  type: 'markdown' | 'code' | 'tool';
}

export interface Message {
  role: 'user' | 'model' | 'system' | 'thought';
  content: string;
  timestamp: number;
}

export interface BluetoothCharacteristic {
  uuid: string;
  properties: {
    read: boolean;
    write: boolean;
    notify: boolean;
  };
  value?: string;
}

export interface BluetoothService {
  uuid: string;
  name?: string;
  characteristics: BluetoothCharacteristic[];
}

export interface NdefMessage {
  type: 'text' | 'url';
  content: string;
}

export interface HardwareDevice {
  id: string;
  name: string;
  type: 'usb' | 'bluetooth' | 'nfc' | 'wlan' | 'serial' | 'hid' | 'esp32' | 'adb' | 'fastboot' | 'mtk' | 'edl';
  status: 'connected' | 'disconnected' | 'pairing' | 'scanning' | 'flashing' | 'erasing' | 'authorized' | 'unauthorized' | 'bootloader' | 'edl';
  details?: string;
  baudRate?: number;
  ip?: string;
  mac?: string;
  firmware?: string;
  chipType?: string;
  flashProgress?: number;
  flashStep?: string;
  brickRisk?: 'low' | 'medium' | 'high' | 'critical';
  safetyCheckPassed?: boolean;
  androidInfo?: {
    model?: string;
    serial?: string;
    version?: string;
    bootloader?: string;
    secure?: boolean;
    unlocked?: boolean;
  };
  bluetoothServices?: BluetoothService[];
  ndefMessages?: NdefMessage[];
  serialParsingRules?: ParsingRule[];
  serialLogs?: { id?: string, time: string, data: string, type: 'in' | 'out' }[];
  usbLogs?: { id?: string, time: string, data: string, type: 'in' | 'out' }[];
  nfcLogs?: { id?: string, time: string, data: string, type: 'in' | 'out' }[];
}

export interface TelemetryData {
  timestamp: number;
  temperature: number;
  humidity: number;
  voltage: number;
  rssi: number;
}

export interface WebhookConfig {
  id: string;
  url: string;
  event: 'sensor_threshold' | 'device_online' | 'device_offline' | 'button_press';
  threshold?: number;
  active: boolean;
}

export interface ParsingRule {
  id: string;
  label: string;
  regex: string; // e.g. "TEMP: ([\d.]+)"
  color: string;
  unit?: string;
  active: boolean;
}

export interface ParsedDataPoint {
  timestamp: number;
  [key: string]: number;
}

export interface WaspApp {
  id: string;
  title: string;
  version: string;
  category: 'Security' | 'IoT' | 'Utility' | 'Debug' | 'Custom';
  description: string;
  binaryUrl: string;
  icon: string;
  author: string;
  stars: number;
  brickRisk: 'low' | 'medium' | 'high' | 'critical';
  compatibility: string[]; // e.g. ["ESP32", "ESP32-S3"]
}
