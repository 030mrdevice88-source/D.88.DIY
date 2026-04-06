/**
 * REPAIR SAFETY GATEWAY (RSG)
 * Strenge Validierung von KI-generierten Shell-Kommandos
 * Fungiert als "Air-Gap" zwischen Ollama und der Hardware.
 */

export enum SafetyStatus {
  SAFE = 'SAFE',
  WARNING = 'WARNING',
  BLOCKED = 'BLOCKED',
  CRITICAL_ERROR = 'CRITICAL_ERROR',
  EMERGENCY_STOP = 'EMERGENCY_STOP',
  QUARANTINE = 'QUARANTINE'
}

export interface ValidationResult {
  status: SafetyStatus;
  msg: string;
  command?: string;
  riskLevel: 'low' | 'medium' | 'high';
  reason?: string;
}

export interface HardwareContext {
  detectedModel: string;
  targetModel: string;
  currentBuild: string;
  targetBuild: string;
  cid?: string;
  imei?: string;
  gptHash?: string;
}

const RSG_CONFIG = {
  ALLOWED_PACKAGES: new Set([
    "com.android.settings", 
    "com.android.chrome", 
    "com.google.android.youtube",
    "com.android.vending",
    "com.sec.android.app.modemui",
    "com.android.browser"
  ]),
  CRITICAL_PARTITIONS: ["boot", "system", "vendor", "recovery", "tz", "rpm", "aboot", "sbl1", "param", "efs"],
  SAFE_COMMANDS: [
    "adb shell getprop",
    "adb shell settings get",
    "fastboot getvar",
    "fastboot devices",
    "adb devices",
    "adb shell ls",
    "adb shell cat /proc/version"
  ],
  MAX_COMMAND_LENGTH: 256
};

/**
 * REPAIR SAFETY GATEWAY (RSG) - Core Logic
 */
export async function validateRepairCommand(
  rawCommand: string, 
  context: HardwareContext
): Promise<ValidationResult> {
  const commandClean = rawCommand.trim().toLowerCase();

  try {
    // A. Modell-Integritätsprüfung (Brick-Schutz #1)
    if (context.targetModel !== context.detectedModel) {
      return { 
        status: SafetyStatus.CRITICAL_ERROR, 
        msg: "Modell-Fehlanpassung! Brick-Gefahr! Angeschlossenes Gerät entspricht nicht dem Zielmodell.",
        riskLevel: 'high',
        reason: "MISMATCH_MODEL"
      };
    }

    // B. Version-Check (Firmware-Integrität)
    if (context.currentBuild !== context.targetBuild) {
      return {
        status: SafetyStatus.WARNING,
        msg: "Firmware-Version differiert. Exploit könnte instabil sein oder das Gerät sperren.",
        riskLevel: 'medium',
        reason: "MISMATCH_VERSION"
      };
    }

    // C. No-Injection-Policy & Syntax-Check
    const isAlwaysSafe = RSG_CONFIG.SAFE_COMMANDS.some(safe => commandClean.startsWith(safe));
    if (isAlwaysSafe) {
      return {
        status: SafetyStatus.SAFE,
        msg: "Befehl validiert: Nur lesender Zugriff (Discovery).",
        riskLevel: 'low',
        command: commandClean
      };
    }

    // D. Schutz vor Partition-Corruption (Flash/Erase/DD)
    if (commandClean.includes("flash") || commandClean.includes("erase") || commandClean.includes("dd")) {
      const isPartitionSafe = RSG_CONFIG.CRITICAL_PARTITIONS.every(p => !commandClean.includes(p));
      
      if (!isPartitionSafe) {
        return { 
          status: SafetyStatus.BLOCKED, 
          msg: "Kritischer Schreibzugriff auf geschützte Partition blockiert!",
          riskLevel: 'high',
          reason: "PROTECTED_PARTITION_ACCESS"
        };
      }

      // Hardware-Fence: GPT-Hash Abgleich erforderlich für Schreibvorgänge
      if (!context.gptHash) {
        return {
          status: SafetyStatus.BLOCKED,
          msg: "Schreibzugriff verweigert: Kein GPT-Hash (Partitionstabelle) zur Validierung vorhanden.",
          riskLevel: 'high',
          reason: "MISSING_HARDWARE_FENCE"
        };
      }
      
      return {
        status: SafetyStatus.WARNING,
        msg: "Schreibzugriff auf unkritische Partition erkannt. Manuelle Freigabe erforderlich.",
        riskLevel: 'high',
        command: commandClean,
        reason: "MANUAL_APPROVAL_REQUIRED"
      };
    }

    // E. Kontextuelle Prüfung der App-Injection (am start)
    if (commandClean.includes("am start")) {
      const targetPackage = extractPackageName(commandClean);
      if (!RSG_CONFIG.ALLOWED_PACKAGES.has(targetPackage)) {
        return { 
          status: SafetyStatus.QUARANTINE, 
          msg: "Unbekannte App-ID erkannt. Befehl in Quarantäne verschoben.",
          riskLevel: 'medium',
          reason: "UNTRUSTED_APP_TARGET"
        };
      }
    }

    // F. Längenbeschränkung (Buffer Overflow Schutz)
    if (commandClean.length > RSG_CONFIG.MAX_COMMAND_LENGTH) {
      return {
        status: SafetyStatus.BLOCKED,
        msg: "Befehl überschreitet maximale Länge.",
        riskLevel: 'high',
        reason: "BUFFER_OVERFLOW_RISK"
      };
    }

    return { 
      status: SafetyStatus.SAFE, 
      msg: "Befehl durch Heuristik validiert.",
      riskLevel: 'medium',
      command: commandClean
    };

  } catch (error: any) {
    return { 
      status: SafetyStatus.EMERGENCY_STOP, 
      msg: `Interner Validierungsfehler: ${error.message}`,
      riskLevel: 'high'
    };
  }
}

/**
 * Hilfsfunktion zum Extrahieren des Package-Namens aus einem 'am start' Befehl.
 */
function extractPackageName(command: string): string {
  const match = command.match(/am start -n ([^/]+)/);
  if (match && match[1]) return match[1];
  
  // Fallback für einfachere Syntax
  const parts = command.split(' ');
  const amIndex = parts.indexOf('am');
  if (amIndex !== -1 && parts[amIndex + 1] === 'start') {
    // Suche nach dem Teil, der einen Punkt enthält (Package-Indikator)
    for (let i = amIndex + 2; i < parts.length; i++) {
      if (parts[i].includes('.')) return parts[i].split('/')[0];
    }
  }
  return "unknown";
}

/**
 * Simuliert den Hardware-Fingerprint-Snapshot.
 */
export function generateHardwareFingerprint(model: string): HardwareContext {
  return {
    detectedModel: model,
    targetModel: model,
    currentBuild: "G991BXXU5EWA1",
    targetBuild: "G991BXXU5EWA1",
    cid: "0x000001",
    imei: "358291XXXXXXXXX",
    gptHash: "sha256:7f83b1..." // Beispiel Hash
  };
}
