import { state } from './state.js';
import { dist } from './utils.js';

const createColorMatcher = () => {
  let cache = new Map();
  let cachedPalette = null;

  return (color, palette) => {
    if (cachedPalette !== palette) {
      cache.clear();
      cachedPalette = palette;
    }

    const key = color.join(",");

    if (cache.has(key)) {
      return cache.get(key);
    }

    const result = palette.reduce(
      (closest, current) =>
        !closest || dist(color, current) < dist(color, closest)
          ? current
          : closest,
      null
    );

    cache.set(key, result);
    return result;
  };
};

export const getClosestColor = createColorMatcher();

export function dither(ctx, width, height) {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  const ditherIntensity = state.dither / 100;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const oldR = data[idx];
      const oldG = data[idx + 1];
      const oldB = data[idx + 2];

      const palette = state.palette.length ? state.palette : [[0, 0, 0]];
      const newColor = getClosestColor([oldR, oldG, oldB], palette);
      data[idx] = newColor[0];
      data[idx + 1] = newColor[1];
      data[idx + 2] = newColor[2];

      const errR = oldR - newColor[0];
      const errG = oldG - newColor[1];
      const errB = oldB - newColor[2];

      if (x + 1 < width) {
        const rightIdx = idx + 4;
        data[rightIdx] += ((errR * 7) / 16) * ditherIntensity;
        data[rightIdx + 1] += ((errG * 7) / 16) * ditherIntensity;
        data[rightIdx + 2] += ((errB * 7) / 16) * ditherIntensity;
      }

      if (y + 1 < height) {
        const downIdx = idx + width * 4;
        data[downIdx] += ((errR * 5) / 16) * ditherIntensity;
        data[downIdx + 1] += ((errG * 5) / 16) * ditherIntensity;
        data[downIdx + 2] += ((errB * 5) / 16) * ditherIntensity;

        if (x - 1 >= 0) {
          const downLeftIdx = downIdx - 4;
          data[downLeftIdx] += ((errR * 3) / 16) * ditherIntensity;
          data[downLeftIdx + 1] += ((errG * 3) / 16) * ditherIntensity;
          data[downLeftIdx + 2] += ((errB * 3) / 16) * ditherIntensity;
        }

        if (x + 1 < width) {
          const downRightIdx = downIdx + 4;
          data[downRightIdx] += ((errR * 1) / 16) * ditherIntensity;
          data[downRightIdx + 1] += ((errG * 1) / 16) * ditherIntensity;
          data[downRightIdx + 2] += ((errB * 1) / 16) * ditherIntensity;
        }
      }
    }
  }

  return imageData;
}

export function getAdjusted(image, brightness, contrast, saturation) {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  canvas.width = image.width;
  canvas.height = image.height;

  ctx.drawImage(image, 0, 0);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  const contrastFactor = (contrast - 50) * 2;
  const factor =
    (259 * (contrastFactor + 255)) / (255 * (259 - contrastFactor));

  const brightnessOffset = ((brightness - 50) * 255) / 100;

  const saturationFactor = saturation / 50;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    const avg = (r + g + b) / 3;

    const newR = factor * (r - 128) + 128 + brightnessOffset;
    const newG = factor * (g - 128) + 128 + brightnessOffset;
    const newB = factor * (b - 128) + 128 + brightnessOffset;

    data[i] = (newR - avg) * saturationFactor + avg;
    data[i + 1] = (newG - avg) * saturationFactor + avg;
    data[i + 2] = (newB - avg) * saturationFactor + avg;

    data[i] = Math.min(255, Math.max(0, data[i]));
    data[i + 1] = Math.min(255, Math.max(0, data[i + 1]));
    data[i + 2] = Math.min(255, Math.max(0, data[i + 2]));
  }

  ctx.putImageData(imageData, 0, 0);

  return canvas;
}

export function makeOpaque(canvas) {
  const ctx = canvas.getContext("2d");
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  for (let i = 3; i < data.length; i += 4) {
    if (data[i] >= 1) {
      data[i] = 255;
    }
  }

  ctx.putImageData(imageData, 0, 0);
}

export const countOpaquePixels = (imageData) => {
  let count = 0;
  const data = imageData.data;
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] === 255) count++;
  }
  return count;
};