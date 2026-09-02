import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '../lib/firebase';
import { saveLocalItem, STORES } from './indexedDbService';

export interface CloudUploadResult {
  url: string;
  storagePath: string;
  success: boolean;
  offlineQueued?: boolean;
}

/**
 * Converts a base64 data URI to a Blob
 */
export function dataURItoBlob(dataURI: string): Blob {
  try {
    const byteString = atob(dataURI.split(',')[1]);
    const mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ab], { type: mimeString });
  } catch (err) {
    console.error('Failed to convert dataURI to Blob:', err);
    return new Blob([], { type: 'image/png' });
  }
}

/**
 * Uploads a pallet label image or screenshot to Firebase Cloud Storage (Free Tier)
 * Falls back safely to IndexedDB if offline.
 */
export async function uploadLabelImageToCloud(
  imageBase64OrBlob: string | Blob,
  operator: string = 'unknown',
  orderNumber: string = 'label'
): Promise<CloudUploadResult> {
  const safeOperator = operator.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
  const safeOrder = orderNumber.replace(/[^a-zA-Z0-9_-]/g, '_');
  const timestamp = Date.now();
  const storagePath = `labels/${safeOperator}/${timestamp}_${safeOrder}.png`;

  try {
    if (!navigator.onLine) {
      throw new Error('Device is offline');
    }

    const blob = typeof imageBase64OrBlob === 'string' 
      ? dataURItoBlob(imageBase64OrBlob) 
      : imageBase64OrBlob;

    if (!blob || blob.size === 0) {
      throw new Error('Invalid image data');
    }

    const storageRef = ref(storage, storagePath);
    const uploadTask = await uploadBytesResumable(storageRef, blob, {
      contentType: 'image/png',
      customMetadata: {
        operator: safeOperator,
        orderNumber: safeOrder,
        uploadedAt: new Date().toISOString()
      }
    });

    const downloadUrl = await getDownloadURL(uploadTask.ref);

    return {
      url: downloadUrl,
      storagePath,
      success: true
    };
  } catch (err: any) {
    console.warn('[CloudStorage] Direct cloud upload failed or offline. Storing locally in IndexedDB.', err?.message || err);

    // Persist locally in IndexedDB for resilience
    try {
      if (typeof imageBase64OrBlob === 'string') {
        await saveLocalItem(STORES.LABEL_PHOTOS, {
          id: `offline_${timestamp}`,
          orderNumber: safeOrder,
          operator: safeOperator,
          dataUrl: imageBase64OrBlob,
          storagePath,
          timestamp,
          synced: false
        });
      }
    } catch (idbErr) {
      console.warn('[CloudStorage] Local IndexedDB cache fallback also failed:', idbErr);
    }

    return {
      url: typeof imageBase64OrBlob === 'string' ? imageBase64OrBlob : '',
      storagePath,
      success: false,
      offlineQueued: true
    };
  }
}


/**
 * Uploads a Shift Summary Receipt / Screenshot to Firebase Cloud Storage
 */
export async function uploadShiftReceiptToCloud(
  receiptDataUrl: string,
  operator: string = 'unknown',
  shiftCode: string = 'shift'
): Promise<CloudUploadResult> {
  const safeOperator = operator.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
  const safeShift = shiftCode.replace(/[^a-zA-Z0-9_-]/g, '_');
  const timestamp = Date.now();
  const storagePath = `receipts/${safeOperator}/${timestamp}_${safeShift}.png`;

  try {
    if (!navigator.onLine) {
      throw new Error('Device is offline');
    }

    const blob = dataURItoBlob(receiptDataUrl);
    if (!blob || blob.size === 0) {
      throw new Error('Invalid receipt image');
    }

    const storageRef = ref(storage, storagePath);
    const uploadTask = await uploadBytesResumable(storageRef, blob, {
      contentType: 'image/png',
      customMetadata: {
        operator: safeOperator,
        shiftCode: safeShift,
        uploadedAt: new Date().toISOString()
      }
    });

    const downloadUrl = await getDownloadURL(uploadTask.ref);

    return {
      url: downloadUrl,
      storagePath,
      success: true
    };
  } catch (err: any) {
    console.warn('[CloudStorage] Receipt upload failed:', err?.message || err);
    return {
      url: receiptDataUrl,
      storagePath,
      success: false,
      offlineQueued: true
    };
  }
}

/**
 * Deletes a file from Firebase Cloud Storage by path
 */
export async function deleteFileFromCloud(storagePath: string): Promise<boolean> {
  try {
    const fileRef = ref(storage, storagePath);
    await deleteObject(fileRef);
    return true;
  } catch (err) {
    console.warn('[CloudStorage] Failed to delete file from storage:', err);
    return false;
  }
}
