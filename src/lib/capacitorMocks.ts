// MOCK CAPACITOR CAMERA TO PREVENT TOP-LEVEL INITIALIZATION CRASH IN IFRAMES
export const CapCamera: any = {
  checkPermissions: async () => ({ camera: 'denied', photos: 'denied' }),
  requestPermissions: async () => ({ camera: 'denied', photos: 'denied' }),
  getPhoto: async (options: any) => { return { dataUrl: '' }; }
};
export const CameraResultType = { DataUrl: 'dataUrl' };
export const CameraSource = { Camera: 'CAMERA' };

import('@capacitor/camera').then(m => {
  CapCamera.checkPermissions = m.Camera.checkPermissions;
  CapCamera.requestPermissions = m.Camera.requestPermissions;
  CapCamera.getPhoto = m.Camera.getPhoto;
}).catch(e => console.warn('Camera dynamic import failed', e));

// MOCK CAPACITOR PREFERENCES
export const Preferences = {
  get: async (options: { key: string }) => ({ value: null }),
  set: async (options: { key: string, value: string }) => {},
  remove: async (options: { key: string }) => {},
  clear: async () => {}
};
import('@capacitor/preferences').then(m => {
  Preferences.get = m.Preferences.get;
  Preferences.set = m.Preferences.set;
  Preferences.remove = m.Preferences.remove;
  if ('clear' in m.Preferences) {
      Preferences.clear = (m.Preferences as any).clear;
  }
}).catch(e => console.warn('Preferences dynamic import failed', e));
