/**
 * Client-side image compression utility using Canvas API.
 * Handles HEIC/HEIF conversion (iOS photos) via heic2any.
 *
 * Validates: Requirements 13.8
 */
import heic2any from 'heic2any';

export interface CompressionOptions {
  maxDimension: number;   // 2048px longest edge default
  maxFileSize: number;    // 2MB (2 * 1024 * 1024 bytes) default
  quality: number;        // 0.8 default
  outputFormat: 'image/jpeg';
}

export interface CompressedFile {
  name: string;
  blob: Blob;
  originalSize: number;
  compressedSize: number;
}

export const DEFAULT_OPTIONS: CompressionOptions = {
  maxDimension: 2048,
  maxFileSize: 2 * 1024 * 1024,
  quality: 0.8,
  outputFormat: 'image/jpeg',
};

const QUALITY_STEPS = [0.6, 0.4, 0.3];

/**
 * Detect whether a file is HEIC/HEIF format by MIME type or extension.
 */
export function isHeicFile(file: File): boolean {
  const type = file.type.toLowerCase();
  if (type === 'image/heic' || type === 'image/heif') {
    return true;
  }
  const ext = file.name.toLowerCase().split('.').pop() || '';
  return ext === 'heic' || ext === 'heif';
}

/**
 * Calculate scaled dimensions to fit within maxDimension on the longest edge,
 * preserving aspect ratio.
 */
export function calculateDimensions(
  width: number,
  height: number,
  maxDimension: number
): { width: number; height: number } {
  const longestEdge = Math.max(width, height);

  if (longestEdge <= maxDimension) {
    return { width, height };
  }

  const scale = maxDimension / longestEdge;
  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  };
}

/**
 * Convert a HEIC/HEIF file to a JPEG Blob using heic2any.
 */
async function convertHeicToJpeg(file: File): Promise<Blob> {
  try {
    const result = await heic2any({
      blob: file,
      toType: 'image/jpeg',
      quality: 0.9,
    });
    // heic2any can return a single Blob or an array
    if (Array.isArray(result)) {
      return result[0];
    }
    return result;
  } catch {
    throw new Error(
      'Unable to process HEIC file. Please upload as JPEG or PNG.'
    );
  }
}

/**
 * Load an image from a Blob and return an HTMLImageElement with dimensions.
 */
function loadImage(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
}

/**
 * Draw the image to a canvas at the specified dimensions and export as a Blob.
 */
function canvasToBlob(
  img: HTMLImageElement,
  width: number,
  height: number,
  format: string,
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      reject(new Error('Unable to get canvas context'));
      return;
    }

    ctx.drawImage(img, 0, 0, width, height);

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Canvas toBlob returned null'));
          return;
        }
        resolve(blob);
      },
      format,
      quality
    );
  });
}

/**
 * Compress a single image file.
 *
 * 1. If HEIC/HEIF, convert to JPEG first
 * 2. Load as Image element
 * 3. Scale down if longest edge > maxDimension
 * 4. Export via Canvas with specified quality
 * 5. If still too large, reduce quality iteratively
 * 6. If still too large at quality 0.3, reject
 */
export async function compressImage(
  file: File,
  options?: Partial<CompressionOptions>
): Promise<CompressedFile> {
  const opts: CompressionOptions = { ...DEFAULT_OPTIONS, ...options };
  const originalSize = file.size;

  let sourceBlob: Blob = file;

  // Step 1: HEIC conversion
  if (isHeicFile(file)) {
    sourceBlob = await convertHeicToJpeg(file);
  }

  // Step 2: Load image
  let img: HTMLImageElement;
  try {
    img = await loadImage(sourceBlob);
  } catch {
    throw new Error(`Unable to read image file: ${file.name}`);
  }

  // Step 3: Calculate dimensions
  const { width, height } = calculateDimensions(
    img.naturalWidth,
    img.naturalHeight,
    opts.maxDimension
  );

  // Step 4: Initial compression at specified quality
  let blob: Blob;
  try {
    blob = await canvasToBlob(img, width, height, opts.outputFormat, opts.quality);
  } catch {
    throw new Error(`Unable to read image file: ${file.name}`);
  }

  // Step 5: If still too large, reduce quality iteratively
  if (blob.size > opts.maxFileSize) {
    for (const q of QUALITY_STEPS) {
      blob = await canvasToBlob(img, width, height, opts.outputFormat, q);
      if (blob.size <= opts.maxFileSize) {
        break;
      }
    }
  }

  // Step 6: Final size check
  if (blob.size > opts.maxFileSize) {
    const maxSizeMB = (opts.maxFileSize / (1024 * 1024)).toFixed(0);
    throw new Error(
      `Image could not be compressed below ${maxSizeMB}MB: ${file.name}`
    );
  }

  // Generate output filename with .jpg extension
  const baseName = file.name.replace(/\.[^.]+$/, '');
  const outputName = `${baseName}.jpg`;

  return {
    name: outputName,
    blob,
    originalSize,
    compressedSize: blob.size,
  };
}

/**
 * Compress multiple image files in parallel.
 */
export async function compressImages(
  files: FileList | File[],
  options?: Partial<CompressionOptions>
): Promise<CompressedFile[]> {
  const fileArray = Array.from(files);
  return Promise.all(fileArray.map((file) => compressImage(file, options)));
}
