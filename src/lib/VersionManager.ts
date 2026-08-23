let Browser: any = { open: async () => {} };
const Capacitor = { isNativePlatform: () => false };

try {
  import('@capacitor/core').then(m => Object.assign(Capacitor, m.Capacitor)).catch(() => {});
  import('@capacitor/browser').then(m => { Browser = m.Browser; }).catch(() => {});
} catch (e) {
  console.warn("Capacitor browser API restricted");
}
import { APP_VERSION } from '../constants/version';

export interface AppVersionInfo {
  version: string;
  releaseDate: string;
  notes: string[];
  downloadUrl: string;
}

// This should point to the user's hosted manifest or github raw file
// Fallback to a relative path for the deployed web version
const MANIFEST_URL = "/app_status.json"; 

export const checkUpdate = async (): Promise<AppVersionInfo | null> => {
  try {
    const response = await fetch(`${MANIFEST_URL}?t=${Date.now()}`);
    if (!response.ok) {
        console.warn(`Update check failed with status: ${response.status}`);
        return null;
    }
    
    const data: AppVersionInfo = await response.json();
    
    // Compare versions
    if (isNewer(data.version, APP_VERSION)) {
      return data;
    }
    return null;
  } catch (e) {
    // Network failures in restricted environments are expected
    return null;
  }
};

export const isNewer = (remote: string, local: string) => {
  const rParts = remote.split('.').map(Number);
  const lParts = local.split('.').map(Number);
  
  for (let i = 0; i < 3; i++) {
    if (rParts[i] > (lParts[i] || 0)) return true;
    if (rParts[i] < (lParts[i] || 0)) return false;
  }
  return false;
};

export const openDownloadLink = async (url: string) => {
  if (Capacitor.isNativePlatform()) {
    await Browser.open({ url });
  } else {
    window.open(url, '_blank');
  }
};
