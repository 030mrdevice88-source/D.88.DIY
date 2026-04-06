import { type HardwareContext, SafetyStatus } from './safetyGateway';

export interface CustomRom {
  name: string;
  version: string;
  type: 'stable' | 'beta' | 'nightly';
  downloadUrl: string;
}

export interface RescueProfile {
  id: string;
  manufacturer: string;
  modelPattern: string;
  androidVersions: string[];
  userAgentPattern: string;
  compatibleExploits: string[];
  riskLevel: 'low' | 'medium' | 'high';
  validationScore: number;
  customRoms?: CustomRom[];
}

export const RESCUE_PROFILES: RescueProfile[] = [
  {
    id: 'samsung-s21-a13',
    manufacturer: 'Samsung',
    modelPattern: 'SM-G991.*',
    androidVersions: ['13'],
    userAgentPattern: 'Android 13.*Samsung',
    compatibleExploits: ['SETUP_LOCK_SCREEN', 'SECURITY_SETTINGS'],
    riskLevel: 'low',
    validationScore: 95,
    customRoms: [
      { name: 'LineageOS 21', version: 'Android 14', type: 'stable', downloadUrl: '/roms/s21/lineage-21.zip' },
      { name: 'Pixel Experience', version: 'Android 13', type: 'stable', downloadUrl: '/roms/s21/pe-13.zip' }
    ]
  },
  {
    id: 'google-pixel6-a13',
    manufacturer: 'Google',
    modelPattern: 'Pixel 6',
    androidVersions: ['13'],
    userAgentPattern: 'Android 13.*Pixel',
    compatibleExploits: ['SETUP_LOCK_SCREEN'],
    riskLevel: 'low',
    validationScore: 90,
    customRoms: [
      { name: 'GrapheneOS', version: 'Android 14', type: 'stable', downloadUrl: '/roms/pixel6/graphene-latest.zip' },
      { name: 'CalyxOS', version: 'Android 13', type: 'stable', downloadUrl: '/roms/pixel6/calyx-latest.zip' }
    ]
  },
  {
    id: 'xiaomi-redmi-a12',
    manufacturer: 'Xiaomi',
    modelPattern: 'Redmi Note 11',
    androidVersions: ['12'],
    userAgentPattern: 'Android 12.*Mi.*Browser',
    compatibleExploits: ['SETUP_LOCK_SCREEN'],
    riskLevel: 'medium',
    validationScore: 80,
    customRoms: [
      { name: 'Evolution X', version: 'Android 14', type: 'beta', downloadUrl: '/roms/redmi11/evox-14.zip' },
      { name: 'Xiaomi.eu', version: 'MIUI 14', type: 'stable', downloadUrl: '/roms/redmi11/xiaomi-eu-14.zip' }
    ]
  }
];

export interface RescueValidationResult {
  approved: boolean;
  profile?: RescueProfile;
  confidenceScore: number;
  riskLevel: 'low' | 'medium' | 'high';
  rejectionReason?: string;
  intentUrl?: string;
}

export function validateRescueTarget(userAgent: string, exploitType: string = 'SETUP_LOCK_SCREEN'): RescueValidationResult {
  let bestMatch: RescueProfile | null = null;
  let maxScore = 0;

  for (const profile of RESCUE_PROFILES) {
    const uaRegex = new RegExp(profile.userAgentPattern, 'i');
    if (uaRegex.test(userAgent)) {
      if (profile.validationScore > maxScore) {
        maxScore = profile.validationScore;
        bestMatch = profile;
      }
    }
  }

  if (!bestMatch) {
    return {
      approved: false,
      confidenceScore: 0,
      riskLevel: 'high',
      rejectionReason: 'Geräteprofil nicht in der Sicherheitsdatenbank gefunden.'
    };
  }

  // Check exploit compatibility
  if (!bestMatch.compatibleExploits.includes(exploitType)) {
    return {
      approved: false,
      profile: bestMatch,
      confidenceScore: bestMatch.validationScore,
      riskLevel: 'high',
      rejectionReason: `Exploit '${exploitType}' ist für dieses Modell nicht validiert.`
    };
  }

  // Generate Intent URL
  const intents: Record<string, string> = {
    'SETUP_LOCK_SCREEN': 'intent:#Intent;action=com.android.settings.SETUP_LOCK_SCREEN;end',
    'SECURITY_SETTINGS': 'intent:#Intent;action=android.settings.SECURITY_SETTINGS;end'
  };

  return {
    approved: bestMatch.riskLevel !== 'high',
    profile: bestMatch,
    confidenceScore: bestMatch.validationScore,
    riskLevel: bestMatch.riskLevel,
    intentUrl: intents[exploitType] || intents['SETUP_LOCK_SCREEN']
  };
}
