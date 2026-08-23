/**
 * Utility to compress base64 images to prevent localStorage/database storage overflow.
 * Spindles high-resolution mobile photos down to max-dimension elements
 * and recompresses using JPEG at 0.5/0.6 quality.
 */
export const compressImage = (base64Str: string, maxWidth = 800, maxHeight = 800, quality = 0.7): Promise<string> => {
  return new Promise((resolve) => {
    if (!base64Str) {
      resolve("");
      return;
    }

    // If it's not a data URL or is already small, return it
    if (!base64Str.startsWith("data:image")) {
      resolve(base64Str);
      return;
    }

    const img = document.createElement("img");
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        // Calculate new dimensions keeping the aspect ratio
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(base64Str);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        // Use jpeg with custom quality for high compression rates
        const compressedDataUrl = canvas.toDataURL("image/jpeg", quality);
        resolve(compressedDataUrl);
      } catch (err) {
        console.error("Compression error inside canvas:", err);
        resolve(base64Str);
      }
    };

    img.onerror = () => {
      console.warn("Failed to load image for compression, resolving original");
      resolve(base64Str);
    };

    img.src = base64Str;
  });
};
