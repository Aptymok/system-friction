import 'server-only';

import sharp from 'sharp';
import type { StudioGenericFeature } from './types';
import { StudioMultimodalError } from './types';

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function hex(value: number) {
  return Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, '0');
}

function analyzePixels(data: Buffer, width: number, height: number, channels: number) {
  const luminance: number[] = [];
  const colorBins = new Map<string, { count: number; r: number; g: number; b: number }>();
  let saturationSum = 0;
  let brightnessSum = 0;

  for (let offset = 0; offset < data.length; offset += channels) {
    const r = data[offset] ?? 0;
    const g = data[offset + 1] ?? r;
    const b = data[offset + 2] ?? r;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    luminance.push(luma);
    brightnessSum += luma / 255;
    saturationSum += max === 0 ? 0 : (max - min) / max;

    const key = `${r >> 4}-${g >> 4}-${b >> 4}`;
    const existing = colorBins.get(key) ?? { count: 0, r: 0, g: 0, b: 0 };
    existing.count += 1;
    existing.r += r;
    existing.g += g;
    existing.b += b;
    colorBins.set(key, existing);
  }

  const histogram = new Array<number>(32).fill(0);
  luminance.forEach((value) => {
    const index = Math.min(31, Math.floor(value / 8));
    histogram[index] += 1;
  });
  const total = Math.max(luminance.length, 1);
  const entropy = histogram.reduce((sum, count) => {
    if (!count) return sum;
    const probability = count / total;
    return sum - probability * Math.log2(probability);
  }, 0) / Math.log2(histogram.length);

  let edgeTotal = 0;
  let edgeCount = 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x;
      const current = luminance[index] ?? 0;
      if (x + 1 < width) {
        edgeTotal += Math.abs(current - (luminance[index + 1] ?? current));
        edgeCount += 1;
      }
      if (y + 1 < height) {
        edgeTotal += Math.abs(current - (luminance[index + width] ?? current));
        edgeCount += 1;
      }
    }
  }
  const textureDensity = edgeCount ? clamp01(edgeTotal / edgeCount / 64) : 0;

  const quadrantSums = [0, 0, 0, 0];
  const quadrantCounts = [0, 0, 0, 0];
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const quadrant = (y >= height / 2 ? 2 : 0) + (x >= width / 2 ? 1 : 0);
      quadrantSums[quadrant] += (luminance[y * width + x] ?? 0) / 255;
      quadrantCounts[quadrant] += 1;
    }
  }
  const quadrantMeans = quadrantSums.map((sum, index) => sum / Math.max(quadrantCounts[index], 1));
  const balanceSpread = Math.max(...quadrantMeans) - Math.min(...quadrantMeans);
  const spatialBalance = clamp01(1 - balanceSpread);

  const dominantColors = [...colorBins.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 6)
    .map((item) => {
      const r = item.r / item.count;
      const g = item.g / item.count;
      const b = item.b / item.count;
      return { hex: `#${hex(r)}${hex(g)}${hex(b)}`, share: Number((item.count / total).toFixed(4)) };
    });

  return {
    dominantColors,
    visualEntropy: clamp01(entropy),
    textureDensity,
    spatialBalance,
    brightness: brightnessSum / total,
    saturation: saturationSum / total,
  };
}

export async function analyzeStudioImage(bytes: Buffer) {
  try {
    const source = sharp(bytes, { failOn: 'error', limitInputPixels: 80_000_000 });
    const metadata = await source.metadata();
    const normalized = await source
      .clone()
      .resize({ width: 128, height: 128, fit: 'inside', withoutEnlargement: true })
      .removeAlpha()
      .toColourspace('srgb')
      .raw()
      .toBuffer({ resolveWithObject: true });

    const width = normalized.info.width;
    const height = normalized.info.height;
    const channels = normalized.info.channels;
    const measured = analyzePixels(normalized.data, width, height, channels);
    const sourceName = 'studio_image:sharp_pixel_statistics_v1';
    const features: StudioGenericFeature[] = [
      { key: 'image_width_px', label: 'IMAGE WIDTH', numericValue: metadata.width ?? null, textValue: null, unit: 'px', source: sourceName, confidence: metadata.width ? 1 : null, status: metadata.width ? 'OBSERVED' : 'MISSING', explanation: 'Decoded image width.', warnings: [] },
      { key: 'image_height_px', label: 'IMAGE HEIGHT', numericValue: metadata.height ?? null, textValue: null, unit: 'px', source: sourceName, confidence: metadata.height ? 1 : null, status: metadata.height ? 'OBSERVED' : 'MISSING', explanation: 'Decoded image height.', warnings: [] },
      { key: 'image_format', label: 'IMAGE FORMAT', numericValue: null, textValue: metadata.format ?? null, unit: null, source: sourceName, confidence: metadata.format ? 1 : null, status: metadata.format ? 'OBSERVED' : 'MISSING', explanation: 'Container format reported by the image decoder.', warnings: [] },
      { key: 'visual_entropy', label: 'VISUAL ENTROPY', numericValue: measured.visualEntropy, textValue: null, unit: 'ratio', source: sourceName, confidence: 0.9, status: 'DERIVED', explanation: 'Normalized luminance histogram entropy from a bounded decoded sample.', warnings: ['NOT_SYMBOLIC_ENTROPY'] },
      { key: 'texture_density', label: 'TEXTURE DENSITY', numericValue: measured.textureDensity, textValue: null, unit: 'ratio', source: sourceName, confidence: 0.82, status: 'DERIVED', explanation: 'Average local luminance change from the bounded image sample.', warnings: ['LOW_RESOLUTION_TEXTURE_ESTIMATE'] },
      { key: 'spatial_balance', label: 'SPATIAL BALANCE', numericValue: measured.spatialBalance, textValue: null, unit: 'ratio', source: sourceName, confidence: 0.78, status: 'DERIVED', explanation: 'Balance of mean luminance across four image quadrants.', warnings: ['LUMINANCE_BALANCE_ONLY'] },
      { key: 'mean_brightness', label: 'MEAN BRIGHTNESS', numericValue: measured.brightness, textValue: null, unit: 'ratio', source: sourceName, confidence: 0.95, status: 'DERIVED', explanation: 'Mean normalized luminance.', warnings: [] },
      { key: 'mean_saturation', label: 'MEAN SATURATION', numericValue: measured.saturation, textValue: null, unit: 'ratio', source: sourceName, confidence: 0.9, status: 'DERIVED', explanation: 'Mean RGB saturation estimate.', warnings: [] },
      { key: 'dominant_colors', label: 'DOMINANT COLORS', numericValue: null, textValue: measured.dominantColors.map((item) => `${item.hex}:${item.share}`).join(', '), unit: null, source: sourceName, confidence: 0.82, status: 'DERIVED', explanation: 'Most frequent quantized RGB color groups.', warnings: ['QUANTIZED_COLOR_HISTOGRAM'] },
    ];

    return {
      features,
      row: {
        dominant_colors: measured.dominantColors.map((item) => `${item.hex}:${item.share}`),
        texture_density: measured.textureDensity,
        visual_entropy: measured.visualEntropy,
        spatial_balance: measured.spatialBalance,
        symbolic_tags: [],
        payload: {
          engine: 'sharp_pixel_statistics_v1',
          format: metadata.format ?? null,
          width: metadata.width ?? null,
          height: metadata.height ?? null,
          channels: metadata.channels ?? null,
          orientation: metadata.orientation ?? null,
          sampleWidth: width,
          sampleHeight: height,
          meanBrightness: measured.brightness,
          meanSaturation: measured.saturation,
          symbolicTagsStatus: 'MISSING_NO_VISION_MODEL',
        },
      },
      warnings: ['NO_SYMBOLIC_TAG_ENGINE'],
    };
  } catch (error) {
    if (error instanceof StudioMultimodalError) throw error;
    throw new StudioMultimodalError('IMAGE_ANALYSIS_FAILED', 'Image decoding or analysis failed.', 422, {
      cause: error instanceof Error ? error.message : String(error),
    });
  }
}
