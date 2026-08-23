const Capacitor = { isNativePlatform: () => false };
let Haptics: any = { impact: async () => {} };
let ImpactStyle: any = { Heavy: 'HEAVY', Medium: 'MEDIUM', Light: 'LIGHT' };
let Share: any = { share: async () => {} };
let Filesystem: any = { writeFile: async () => ({ uri: '' }) };
let Directory: any = { Cache: 'CACHE', Documents: 'DOCUMENTS' };
let Encoding: any = { UTF8: 'utf8' };

try {
    import('@capacitor/core').then(m => Object.assign(Capacitor, m.Capacitor)).catch(() => {});
    import('@capacitor/haptics').then(m => { Haptics = m.Haptics; ImpactStyle = m.ImpactStyle; }).catch(() => {});
    import('@capacitor/share').then(m => { Share = m.Share; }).catch(() => {});
    import('@capacitor/filesystem').then(m => { Filesystem = m.Filesystem; Directory = m.Directory; Encoding = m.Encoding; }).catch(() => {});
} catch (e) {
    console.warn("Capacitor device APIs restricted");
}

export type HapticType = 'light' | 'medium' | 'heavy';

export const deviceHaptic = async (type: HapticType = 'light') => {
  if (!Capacitor.isNativePlatform()) {
    // Web Fallback
    if (navigator.vibrate) {
      const duration = type === 'heavy' ? 60 : type === 'medium' ? 40 : 20;
      navigator.vibrate(duration);
    }
    return;
  }

  try {
    switch (type) {
      case 'heavy':
        await Haptics.impact({ style: ImpactStyle.Heavy });
        break;
      case 'medium':
        await Haptics.impact({ style: ImpactStyle.Medium });
        break;
      default:
        await Haptics.impact({ style: ImpactStyle.Light });
        break;
    }
  } catch (e) {
    console.error('Haptics failed', e);
  }
};

export const deviceExport = async (content: string, fileName: string, isCSV: boolean) => {
  const mimeType = isCSV ? 'text/csv' : 'text/plain';

  // 1. Try Capacitor Native Share (Best for APK)
  if (Capacitor.isNativePlatform()) {
    try {
      // Save to temporary file first so we can share it
      const result = await Filesystem.writeFile({
        path: fileName,
        data: content,
        directory: Directory.Cache,
        encoding: Encoding.UTF8,
      });

      await Share.share({
        title: 'Pick Report',
        text: 'Sharing your shift summary',
        url: result.uri,
        dialogTitle: 'Share Shift Report',
      });
      return true;
    } catch (e) {
      console.error('Native share failed', e);
    }
  }

  // 2. Web Share API Fallback
  if (navigator.share) {
    try {
      const blob = new Blob([content], { type: mimeType });
      const file = new File([blob], fileName, { type: mimeType });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Shift Report',
          text: 'Shift performance summary attached.',
        });
        return true;
      }
    } catch (e) {
      if ((e as Error).name !== 'AbortError') console.error('Web share failed', e);
    }
  }

  // 3. Traditional Download Fallback
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 100);
  return true;
};

export const saveImageToDevice = async (base64Data: string, fileName: string) => {
  if (Capacitor.isNativePlatform()) {
    try {
        const base64Content = base64Data.split(',')[1];
        await Filesystem.writeFile({
            path: `Work/${fileName}`,
            data: base64Content,
            directory: Directory.Documents,
        });
        return true;
    } catch (e) {
        console.error('Save image to device failed', e);
        return false;
    }
  }
  return false;
};

export const compressImage = (base64OrBlob: string, maxWidth = 800, quality = 0.7): Promise<string> => {
  return new Promise((resolve) => {
    if (!base64OrBlob || typeof base64OrBlob !== 'string') {
      resolve(base64OrBlob || '');
      return;
    }
    if (!base64OrBlob.startsWith('data:image')) {
      resolve(base64OrBlob);
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        let width = img.width;
        let height = img.height;
        if (width > maxWidth || height > maxWidth) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxWidth) / height);
            height = maxWidth;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(base64OrBlob);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const compressed = canvas.toDataURL('image/jpeg', quality);
        resolve(compressed);
      } catch (e) {
        resolve(base64OrBlob);
      }
    };
    img.onerror = () => resolve(base64OrBlob);
    img.src = base64OrBlob;
  });
};

