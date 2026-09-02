import { getRemoteConfig, fetchAndActivate, getValue, getString, getNumber, getBoolean } from 'firebase/remote-config';
import { app } from '../lib/firebase';

export interface WarehouseRemoteConfig {
  ambientTargetRate: number;
  chillerTargetRate: number;
  freezerTargetRate: number;
  produceTargetRate: number;
  broadcastBanner: string;
  enableVoiceAssistant: boolean;
  maintenanceMode: boolean;
  minSupportedVersion: string;
}

const DEFAULT_CONFIG: WarehouseRemoteConfig = {
  ambientTargetRate: 180,
  chillerTargetRate: 160,
  freezerTargetRate: 150,
  produceTargetRate: 175,
  broadcastBanner: '',
  enableVoiceAssistant: true,
  maintenanceMode: false,
  minSupportedVersion: '1.7.0'
};

let remoteConfigInstance: any = null;

export const initRemoteConfig = async (): Promise<WarehouseRemoteConfig> => {
  try {
    if (typeof window === 'undefined') return DEFAULT_CONFIG;
    
    if (!remoteConfigInstance) {
      remoteConfigInstance = getRemoteConfig(app);
      remoteConfigInstance.settings = {
        minimumFetchIntervalMillis: 300000, // 5 minutes cache
        fetchTimeoutMillis: 10000,
      };
      remoteConfigInstance.defaultConfig = {
        ambient_target_rate: DEFAULT_CONFIG.ambientTargetRate,
        chiller_target_rate: DEFAULT_CONFIG.chillerTargetRate,
        freezer_target_rate: DEFAULT_CONFIG.freezerTargetRate,
        produce_target_rate: DEFAULT_CONFIG.produceTargetRate,
        broadcast_banner: DEFAULT_CONFIG.broadcastBanner,
        enable_voice_assistant: DEFAULT_CONFIG.enableVoiceAssistant,
        maintenance_mode: DEFAULT_CONFIG.maintenanceMode,
        min_supported_version: DEFAULT_CONFIG.minSupportedVersion
      };
    }

    await fetchAndActivate(remoteConfigInstance);

    return {
      ambientTargetRate: getNumber(remoteConfigInstance, 'ambient_target_rate') || DEFAULT_CONFIG.ambientTargetRate,
      chillerTargetRate: getNumber(remoteConfigInstance, 'chiller_target_rate') || DEFAULT_CONFIG.chillerTargetRate,
      freezerTargetRate: getNumber(remoteConfigInstance, 'freezer_target_rate') || DEFAULT_CONFIG.freezerTargetRate,
      produceTargetRate: getNumber(remoteConfigInstance, 'produce_target_rate') || DEFAULT_CONFIG.produceTargetRate,
      broadcastBanner: getString(remoteConfigInstance, 'broadcast_banner') || DEFAULT_CONFIG.broadcastBanner,
      enableVoiceAssistant: getBoolean(remoteConfigInstance, 'enable_voice_assistant'),
      maintenanceMode: getBoolean(remoteConfigInstance, 'maintenance_mode'),
      minSupportedVersion: getString(remoteConfigInstance, 'min_supported_version') || DEFAULT_CONFIG.minSupportedVersion
    };
  } catch (err) {
    console.warn('[RemoteConfig] Using local defaults:', err);
    return DEFAULT_CONFIG;
  }
};
