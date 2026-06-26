import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  isHeicFile,
  calculateDimensions,
  compressImage,
  compressImages,
  DEFAULT_OPTIONS,
} from '@scripts/image-compressor';

// Mock heic2any
vi.mock('heic2any', () => ({
  default: vi.fn(),
}));

import heic2any from 'heic2any';

/**
 * Helper to create a mock File object.
 */
function createMockFile(
  name: string,
  size: number,
  type: string
): File {
  const content = new Uint8Array(size);
  return new File([content], name, { type });
}

describe('image-compressor', () => {
  describe('isHeicFile', () => {
    it('detects HEIC by MIME type image/heic', () => {
      const file = createMockFile('photo.jpg', 1000, 'image/heic');
      expect(isHeicFile(file)).toBe(true);
    });

    it('detects HEIF by MIME type image/heif', () => {
      const file = createMockFile('photo.jpg', 1000, 'image/heif');
      expect(isHeicFile(file)).toBe(true);
    });

    it('detects HEIC by .heic extension', () => {
      const file = createMockFile('photo.heic', 1000, '');
      expect(isHeicFile(file)).toBe(true);
    });

    it('detects HEIF by .heif extension', () => {
      const file = createMockFile('photo.heif', 1000, '');
      expect(isHeicFile(file)).toBe(true);
    });

    it('case-insensitive extension check', () => {
      const file = createMockFile('photo.HEIC', 1000, '');
      expect(isHeicFile(file)).toBe(true);
    });

    it('returns false for JPEG', () => {
      const file = createMockFile('photo.jpg', 1000, 'image/jpeg');
      expect(isHeicFile(file)).toBe(false);
    });

    it('returns false for PNG', () => {
      const file = createMockFile('photo.png', 1000, 'image/png');
      expect(isHeicFile(file)).toBe(false);
    });
  });

  describe('calculateDimensions', () => {
    it('returns original dimensions when within maxDimension', () => {
      const result = calculateDimensions(800, 600, 2048);
      expect(result).toEqual({ width: 800, height: 600 });
    });

    it('scales down when width exceeds maxDimension', () => {
      const result = calculateDimensions(4096, 2048, 2048);
      expect(result.width).toBe(2048);
      expect(result.height).toBe(1024);
    });

    it('scales down when height exceeds maxDimension', () => {
      const result = calculateDimensions(1500, 3000, 2048);
      expect(result.height).toBe(2048);
      expect(result.width).toBe(1024);
    });

    it('preserves aspect ratio when scaling', () => {
      const originalRatio = 4000 / 3000;
      const result = calculateDimensions(4000, 3000, 2048);
      const newRatio = result.width / result.height;
      expect(Math.abs(originalRatio - newRatio)).toBeLessThan(0.01);
    });

    it('handles square images', () => {
      const result = calculateDimensions(4000, 4000, 2048);
      expect(result.width).toBe(2048);
      expect(result.height).toBe(2048);
    });

    it('does not scale up small images', () => {
      const result = calculateDimensions(100, 50, 2048);
      expect(result).toEqual({ width: 100, height: 50 });
    });

    it('handles exact maxDimension (no change needed)', () => {
      const result = calculateDimensions(2048, 1024, 2048);
      expect(result).toEqual({ width: 2048, height: 1024 });
    });
  });

  describe('compressImage', () => {
    let mockCreateObjectURL: ReturnType<typeof vi.fn>;
    let mockRevokeObjectURL: ReturnType<typeof vi.fn>;
    let mockCanvasToBlob: ReturnType<typeof vi.fn>;
    let mockDrawImage: ReturnType<typeof vi.fn>;
    let mockGetContext: ReturnType<typeof vi.fn>;
    let mockCreateElement: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      vi.clearAllMocks();

      // Mock URL methods
      mockCreateObjectURL = vi.fn(() => 'blob:mock-url');
      mockRevokeObjectURL = vi.fn();
      global.URL.createObjectURL = mockCreateObjectURL;
      global.URL.revokeObjectURL = mockRevokeObjectURL;

      // Mock canvas
      mockDrawImage = vi.fn();
      mockCanvasToBlob = vi.fn((_type: string, _quality: number, callback: BlobCallback) => {
        // Default: return a small blob (under 2MB)
        const smallBlob = new Blob(['x'.repeat(500_000)], { type: 'image/jpeg' });
        callback(smallBlob);
      });
      mockGetContext = vi.fn(() => ({
        drawImage: mockDrawImage,
      }));

      mockCreateElement = vi.fn((tag: string) => {
        if (tag === 'canvas') {
          return {
            width: 0,
            height: 0,
            getContext: mockGetContext,
            toBlob: (callback: BlobCallback, type: string, quality: number) => {
              mockCanvasToBlob(type, quality, callback);
            },
          };
        }
        return {};
      });

      // Override document.createElement for canvas
      vi.spyOn(document, 'createElement').mockImplementation(
        mockCreateElement as unknown as typeof document.createElement
      );

      // Mock Image constructor
      class MockImage {
        naturalWidth = 1920;
        naturalHeight = 1080;
        src = '';
        onload: (() => void) | null = null;
        onerror: (() => void) | null = null;

        set _src(val: string) {
          this.src = val;
          // Trigger onload asynchronously
          setTimeout(() => this.onload?.(), 0);
        }
      }

      // Intercept Image creation
      vi.stubGlobal('Image', class extends MockImage {
        constructor() {
          super();
          setTimeout(() => this.onload?.(), 0);
        }

        set src(_val: string) {
          setTimeout(() => this.onload?.(), 0);
        }
      });
    });

    it('compresses a JPEG file successfully', async () => {
      const file = createMockFile('photo.jpg', 5_000_000, 'image/jpeg');
      const result = await compressImage(file);

      expect(result.name).toBe('photo.jpg');
      expect(result.originalSize).toBe(5_000_000);
      expect(result.compressedSize).toBeLessThanOrEqual(DEFAULT_OPTIONS.maxFileSize);
      expect(result.blob).toBeInstanceOf(Blob);
    });

    it('converts HEIC file before compression', async () => {
      const jpegBlob = new Blob(['jpeg-data'], { type: 'image/jpeg' });
      vi.mocked(heic2any).mockResolvedValueOnce(jpegBlob);

      const file = createMockFile('photo.heic', 3_000_000, 'image/heic');
      const result = await compressImage(file);

      expect(heic2any).toHaveBeenCalledWith({
        blob: file,
        toType: 'image/jpeg',
        quality: 0.9,
      });
      expect(result.name).toBe('photo.jpg');
    });

    it('handles heic2any returning an array', async () => {
      const jpegBlob = new Blob(['jpeg-data'], { type: 'image/jpeg' });
      vi.mocked(heic2any).mockResolvedValueOnce([jpegBlob] as unknown as Blob);

      const file = createMockFile('img.heic', 2_000_000, 'image/heic');
      const result = await compressImage(file);

      expect(result.name).toBe('img.jpg');
    });

    it('throws specific error on HEIC conversion failure', async () => {
      vi.mocked(heic2any).mockRejectedValueOnce(new Error('conversion failed'));

      const file = createMockFile('photo.heic', 1_000_000, 'image/heic');

      await expect(compressImage(file)).rejects.toThrow(
        'Unable to process HEIC file. Please upload as JPEG or PNG.'
      );
    });

    it('throws error for corrupted/unreadable files', async () => {
      // Make the Image fail to load
      vi.stubGlobal('Image', class {
        onload: (() => void) | null = null;
        onerror: (() => void) | null = null;

        set src(_val: string) {
          setTimeout(() => this.onerror?.(), 0);
        }
      });

      const file = createMockFile('broken.jpg', 1000, 'image/jpeg');

      await expect(compressImage(file)).rejects.toThrow(
        'Unable to read image file: broken.jpg'
      );
    });

    it('reduces quality when output exceeds maxFileSize', async () => {
      const qualitiesUsed: number[] = [];

      mockCanvasToBlob.mockImplementation((type: string, quality: number, callback: BlobCallback) => {
        qualitiesUsed.push(quality);
        // First call: too large; subsequent calls: small enough
        if (qualitiesUsed.length === 1) {
          callback(new Blob(['x'.repeat(3_000_000)], { type: 'image/jpeg' }));
        } else {
          callback(new Blob(['x'.repeat(1_000_000)], { type: 'image/jpeg' }));
        }
      });

      const file = createMockFile('large.jpg', 10_000_000, 'image/jpeg');
      const result = await compressImage(file);

      expect(qualitiesUsed.length).toBeGreaterThan(1);
      expect(qualitiesUsed[0]).toBe(0.8); // initial quality
      expect(qualitiesUsed[1]).toBe(0.6); // first retry
      expect(result.compressedSize).toBeLessThanOrEqual(DEFAULT_OPTIONS.maxFileSize);
    });

    it('throws when image cannot be compressed below maxFileSize', async () => {
      // Always return a blob too large
      mockCanvasToBlob.mockImplementation((_type: string, _quality: number, callback: BlobCallback) => {
        callback(new Blob(['x'.repeat(3_000_000)], { type: 'image/jpeg' }));
      });

      const file = createMockFile('huge.jpg', 20_000_000, 'image/jpeg');

      await expect(compressImage(file)).rejects.toThrow(
        'Image could not be compressed below 2MB: huge.jpg'
      );
    });

    it('uses custom options when provided', async () => {
      const qualitiesUsed: number[] = [];
      mockCanvasToBlob.mockImplementation((_type: string, quality: number, callback: BlobCallback) => {
        qualitiesUsed.push(quality);
        callback(new Blob(['small'], { type: 'image/jpeg' }));
      });

      const file = createMockFile('photo.jpg', 3_000_000, 'image/jpeg');
      await compressImage(file, { quality: 0.9, maxDimension: 1024 });

      expect(qualitiesUsed[0]).toBe(0.9);
    });

    it('renames output file to .jpg extension', async () => {
      const file = createMockFile('image.png', 1_000_000, 'image/png');
      const result = await compressImage(file);

      expect(result.name).toBe('image.jpg');
    });
  });

  describe('compressImages', () => {
    beforeEach(() => {
      vi.clearAllMocks();

      // Mock URL methods
      global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
      global.URL.revokeObjectURL = vi.fn();

      // Mock canvas
      const mockGetContext = vi.fn(() => ({
        drawImage: vi.fn(),
      }));

      vi.spyOn(document, 'createElement').mockImplementation(((tag: string) => {
        if (tag === 'canvas') {
          return {
            width: 0,
            height: 0,
            getContext: mockGetContext,
            toBlob: (callback: BlobCallback, _type: string, _quality: number) => {
              callback(new Blob(['compressed'], { type: 'image/jpeg' }));
            },
          };
        }
        return {};
      }) as unknown as typeof document.createElement);

      // Mock Image
      vi.stubGlobal('Image', class {
        naturalWidth = 800;
        naturalHeight = 600;
        onload: (() => void) | null = null;
        onerror: (() => void) | null = null;

        set src(_val: string) {
          setTimeout(() => this.onload?.(), 0);
        }
      });
    });

    it('processes multiple files', async () => {
      const files = [
        createMockFile('a.jpg', 1_000_000, 'image/jpeg'),
        createMockFile('b.jpg', 2_000_000, 'image/jpeg'),
        createMockFile('c.png', 1_500_000, 'image/png'),
      ];

      const results = await compressImages(files);

      expect(results).toHaveLength(3);
      expect(results[0].name).toBe('a.jpg');
      expect(results[1].name).toBe('b.jpg');
      expect(results[2].name).toBe('c.jpg');
    });

    it('handles empty file list', async () => {
      const results = await compressImages([]);
      expect(results).toHaveLength(0);
    });

    it('propagates errors from individual files', async () => {
      // Make Image fail
      vi.stubGlobal('Image', class {
        onload: (() => void) | null = null;
        onerror: (() => void) | null = null;

        set src(_val: string) {
          setTimeout(() => this.onerror?.(), 0);
        }
      });

      const files = [createMockFile('bad.jpg', 1000, 'image/jpeg')];

      await expect(compressImages(files)).rejects.toThrow(
        'Unable to read image file: bad.jpg'
      );
    });
  });

  describe('DEFAULT_OPTIONS', () => {
    it('has correct default values', () => {
      expect(DEFAULT_OPTIONS.maxDimension).toBe(2048);
      expect(DEFAULT_OPTIONS.maxFileSize).toBe(2 * 1024 * 1024);
      expect(DEFAULT_OPTIONS.quality).toBe(0.8);
      expect(DEFAULT_OPTIONS.outputFormat).toBe('image/jpeg');
    });
  });
});
